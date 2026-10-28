// Un Estudio de prueba, temporal: la plantilla, un repositorio con su memoria (.stl, rama stl) abierta y el proyecto creado
// como lo crea el Studio, con lo que dejó el equipo y una revisión pedida y en curso (lo que deja la bandeja al empezar). Lo
// usan la prueba de punta a punta del cierre (bandeja-listo.test.ts) y la medición del núcleo con casos fijos (propuesta
// aceptada pr_nucleo_medido): las herramientas lo encuentran con STL_RAIZ (tools/director/comun.ts), nunca el Estudio real.
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { EstadoPersona, Nota, Plan } from '../../src/director/director.ts';
import { abrirMemoria, crearProyecto, guardarRutaRepositorio, leerLocal, marcarRevision, pedirRevision } from '../../src/director/proyectos.ts';

// El Studio donde está este archivo, calculado al usarlo: el servidor del Studio, que lo importa para la corrida de la
// medición, le dice cuál es el suyo (`raiz`)
const raizReal = () => join(import.meta.dirname, '..', '..');
const ENTORNO_GIT = { ...process.env, GIT_AUTHOR_NAME: 'Prueba', GIT_AUTHOR_EMAIL: 'p@e.co', GIT_COMMITTER_NAME: 'Prueba', GIT_COMMITTER_EMAIL: 'p@e.co' };
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'core.autocrlf=false', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8', env: ENTORNO_GIT }).trim();

export interface OpcionesDePrueba {
  /** Un id que no exista en ningún Estudio real: si una herramienta no usara el temporal, se negaría («No hay un proyecto»). */
  id: string;
  /** Lo que dejó el equipo antes de la revisión, en orden. */
  notas: Nota[];
  /** Lo demás que guarda el Studio del titular (las propuestas que respondió, sus entregas…). */
  delTitular?: Partial<EstadoPersona>;
  /** Cómo quedó el plan antes de la revisión (lo que escribieron las anteriores). */
  plan?: (p: Plan) => void;
  /** Los commits del repositorio desde la revisión anterior, por su asunto. */
  commits?: string[];
  titular?: { nombre: string; correo: string };
  /**
   * Con el código del Studio dentro (copiarElStudio): para la corrida de la medición, donde el director de verdad trabaja
   * dentro del Estudio de prueba, con sus reglas y sus herramientas, sin poder tocar el Studio real.
   */
  conCodigo?: boolean;
  /** El Studio de donde sale lo que lleva el de prueba (su plantilla y, con `conCodigo`, su código): por defecto, este. */
  raiz?: string;
}

/** Los archivos del Studio, como están ahora: los que git guarda y los nuevos sin guardar, sin lo ignorado (datos, registros). */
function archivosDelStudio(raiz: string): string[] {
  return execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: raiz, encoding: 'utf8' }).split('\0').filter((f) => f && existsSync(join(raiz, f)));
}

/**
 * Copia el Studio de este computador dentro de `destino`: su código, sus reglas y sus herramientas como están ahora (con lo
 * que aún no tiene commit, que es lo que se mide antes de cambiar el núcleo), sin datos de ningún proyecto ni de este
 * computador, y sus dependencias enlazadas, no copiadas. Así las herramientas que corre el director toman `destino` como
 * su Estudio (tools/director/comun.ts › raiz) sin STL_RAIZ, y nada de lo que haga alcanza al Studio real.
 */
function copiarElStudio(destino: string, raiz: string) {
  for (const f of archivosDelStudio(raiz)) {
    mkdirSync(dirname(join(destino, f)), { recursive: true });
    copyFileSync(join(raiz, f), join(destino, f));
  }
  if (existsSync(join(raiz, 'node_modules')) && !existsSync(join(destino, 'node_modules'))) symlinkSync(join(raiz, 'node_modules'), join(destino, 'node_modules'), 'junction');
}

/** Un Estudio temporal dentro de `base`, con un proyecto recién entregado y una revisión en curso. */
export async function armarEstudioDePrueba(base: string, { id, notas, delTitular = {}, plan: antes, commits = [], titular = { nombre: 'Laura', correo: 'laura@ejemplo.co' }, conCodigo = false, raiz = raizReal() }: OpcionesDePrueba) {
  const dir = mkdtempSync(join(base, 'e-'));
  const estudio = join(dir, 'estudio');
  const repo = join(dir, 'repo');
  mkdirSync(estudio);
  mkdirSync(repo);
  if (conCodigo) copiarElStudio(estudio, raiz);
  else cpSync(join(raiz, 'plantilla'), join(estudio, 'plantilla'), { recursive: true });
  git(repo, 'init', '-q', '-b', 'main');
  git(repo, 'commit', '-q', '--allow-empty', '-m', 'código');
  await abrirMemoria(repo);
  await guardarRutaRepositorio(estudio, id, repo);
  await crearProyecto(estudio, { id, nombre: 'Proyecto de prueba', contexto: 'Un proyecto para probar al director.', metaInicial: 'Cerrar una revisión', url: '', titular });
  const memoria = join(repo, '.stl');
  const rutaPlan = join(memoria, 'director', 'plan.json');
  const textoDelPlan = () => readFileSync(rutaPlan, 'utf8');
  const plan = () => JSON.parse(textoDelPlan()) as Plan;
  const guardar = (p: Plan) => writeFileSync(rutaPlan, JSON.stringify(p, null, 2) + '\n');
  if (antes) {
    const p = plan();
    antes(p);
    guardar(p);
  }
  // Lo que dejó el equipo, como lo guarda el Studio, y la memoria con su primer commit
  mkdirSync(join(memoria, 'director', 'equipo'), { recursive: true });
  writeFileSync(join(memoria, 'director', 'equipo', 'titular.json'), JSON.stringify({ actualizado: notas.at(-1)?.cuando ?? new Date().toISOString(), ...delTitular, notas }, null, 2) + '\n');
  git(memoria, 'add', '-A');
  git(memoria, 'commit', '-q', '-m', 'Estudio: entrega del proyecto');
  for (const asunto of commits) git(repo, 'commit', '-q', '--allow-empty', '-m', asunto);
  // Una persona pidió la revisión y la bandeja la marcó en curso: eso pone el corte de lo que debe atenderse
  await pedirRevision(estudio, id, 'titular', 'cabecera');
  await marcarRevision(estudio, id, 'en_curso');

  return {
    estudio,
    repo,
    memoria,
    plan,
    textoDelPlan,
    /** Lo que hace el director con el plan: lo cambia y lo guarda. */
    cambiarPlan(cambio: (p: Plan) => void) {
      const p = plan();
      cambio(p);
      guardar(p);
    },
    /** El código del último commit del repositorio (para nombrarlo, como lo hace el director). */
    ultimoCommit: () => git(repo, 'rev-parse', '--short', 'HEAD'),
    /**
     * Corre la bandeja de verdad, como proceso aparte, contra este Estudio temporal (`--proyecto` va solo). Con el código
     * dentro, la suya, que lo encuentra sola, como la correría el director.
     */
    bandeja(...args: string[]) {
      const entorno: NodeJS.ProcessEnv = conCodigo ? { ...process.env } : { ...process.env, STL_RAIZ: estudio };
      if (conCodigo) delete entorno.STL_RAIZ;
      delete entorno.STL_REGISTRO; // que un director que corre las pruebas no le pase su registro
      const programa = join(conCodigo ? estudio : raiz, 'tools', 'director', 'bandeja.ts');
      const r = spawnSync(process.execPath, [programa, ...args, '--proyecto', id], { cwd: estudio, env: entorno, encoding: 'utf8', timeout: 60_000, windowsHide: true });
      return { error: r.error, codigo: r.status, salida: r.stdout, errores: r.stderr };
    },
    revision: async () => (await leerLocal(estudio)).revision,
  };
}

export type EstudioDePrueba = Awaited<ReturnType<typeof armarEstudioDePrueba>>;
