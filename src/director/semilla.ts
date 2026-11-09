// STL Studio llega como su propio proyecto (pedido pd_stl_semilla; nota de voz del titular del 26 de octubre de 2026: STL se
// creó con STL, y así se muestra desde la instalación). Nace de una semilla limpia, en plantilla/semilla, en los dos idiomas:
// su contexto, un diagnóstico de solo números, una ruta de una sola fase y su misión permanente, nunca la memoria de quien
// desarrolla el Studio. La instalación sin proyectos le abre su rama stl en la copia de cada persona (si la copia llegó sin
// git, primero inicia su repositorio con un primer commit) y desde ahí cada uno lleva su propia historia. Cuenta como un
// proyecto en mantenimiento: libre de la reserva, porque le basta su misión. Y, antes de cada revisión de ese proyecto en
// la copia de quien instala, queda una rama de respaldo local, por si un ajuste le rompe el Studio (t_decide_semilla_respaldo).
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Plan, Proyecto } from './director.ts';
import type { Idioma } from './idioma.ts';
import { abrirMemoria, enDisco, esElStudio, guardarActivo, guardarRutaRepositorio, LEEME_MEMORIA, leerLocal, marcarRespaldo, MEMORIA, rutasDe } from './proyectos.ts';

/** El proyecto que es el mismo Studio. */
export const ID_SEMILLA = 'stl-studio';

/** La rama de respaldo: una sola, que cada revisión deja donde estaba el Studio antes de empezar. El README da la orden para volver a ella. */
export const RAMA_RESPALDO = 'respaldo/studio';

/** Cómo firma el primer commit una copia cuya persona todavía no tiene identidad en git: el asistente se la pide después. */
const FIRMA_DE_LA_COPIA = ['-c', 'user.name=STL Studio', '-c', 'user.email=stl-studio@localhost'];

function git(cwd: string, args: string[]): Promise<{ ok: boolean; out: string; err: string }> {
  return new Promise((listo) => {
    execFile('git', ['-c', 'core.quotepath=false', ...args], { cwd, encoding: 'utf8', timeout: 120_000, windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', LANG: 'C', LC_ALL: 'C' } },
      (e, out, err) => listo({ ok: !e, out: String(out ?? ''), err: String(err ?? '') }));
  });
}

/** La semilla en un idioma: lo que se escribe en la memoria. */
export async function leerSemilla(raiz: string, idioma: Idioma): Promise<{ proyecto: Proyecto; plan: Plan }> {
  return JSON.parse(await readFile(join(raiz, 'plantilla', 'semilla', `${idioma}.json`), 'utf-8'));
}

/** El idioma en que nace: el que ya se eligió en este computador o, si no, el del sistema (en español, español; si no, inglés). */
export function idiomaInicial(guardado: Idioma | undefined, sistema = Intl.DateTimeFormat().resolvedOptions().locale): Idioma {
  return guardado ?? (/^es\b/i.test(sistema) ? 'es' : 'en');
}

const escribir = async (archivo: string, texto: string) => {
  await mkdir(dirname(archivo), { recursive: true });
  await writeFile(archivo, texto, 'utf-8');
};
const enJson = (x: unknown) => `${JSON.stringify(x, null, 2)}\n`;

/** La firma con que se hace un commit aquí: la de la persona o, sin ella, la de la copia. */
async function firmaDeCommit(raiz: string): Promise<string[]> {
  return (await git(raiz, ['config', 'user.email'])).out.trim() ? [] : FIRMA_DE_LA_COPIA;
}

/**
 * Una instalación sin proyectos: STL Studio, de su semilla. No hace nada si ya hay proyectos en este computador. Si la copia
 * llegó sin git (el zip), inicia su repositorio con un primer commit; abre la memoria en la rama stl y, si ya tenía la suya,
 * la conecta tal cual, sin escribir nada encima.
 */
export async function instalarSemilla(raiz: string): Promise<'instalada' | 'ya_tenia_memoria' | 'ya_hay_proyectos'> {
  const local = await leerLocal(raiz);
  if (Object.keys(local.repositorios).length) return 'ya_hay_proyectos';
  const firma = await firmaDeCommit(raiz);
  const fallo = (que: string, r: { err: string }) => new Error(`${que} (${r.err.trim().split('\n').pop() || 'git falló'}).`);
  if (!existsSync(join(raiz, '.git'))) {
    const inicia = await git(raiz, ['init', '-b', 'main']);
    if (!inicia.ok) throw fallo('No se pudo iniciar el repositorio de esta copia', inicia);
    const agrega = await git(raiz, ['add', '-A']);
    if (!agrega.ok) throw fallo('No se pudo preparar el primer commit', agrega);
    const primero = await git(raiz, [...firma, 'commit', '-m', 'STL Studio: esta copia, recién instalada']);
    if (!primero.ok) throw fallo('No se pudo hacer el primer commit', primero);
  }
  const { yaTenia } = await abrirMemoria(raiz);
  await guardarRutaRepositorio(raiz, ID_SEMILLA, raiz);
  await guardarActivo(raiz, ID_SEMILLA);
  if (yaTenia) return 'ya_tenia_memoria';
  const { proyecto, plan } = await leerSemilla(raiz, idiomaInicial(local.idioma));
  const nombre = (await git(raiz, ['config', 'user.name'])).out.trim();
  const correo = (await git(raiz, ['config', 'user.email'])).out.trim();
  // Quien instala es su titular; sin identidad todavía, el equipo queda vacío y el Studio lo trata como titular
  const equipo = correo ? [{ id: 'titular', nombre: nombre || correo, correo, cargo: 'Director de proyecto', papel: 'Dirige el proyecto: fija la meta, responde las propuestas y cruza las puertas.' }] : [];
  const r = rutasDe(ID_SEMILLA);
  await escribir(enDisco(raiz, r.proyecto), enJson({ ...proyecto, equipo }));
  await escribir(enDisco(raiz, r.plan), enJson(plan));
  await escribir(enDisco(raiz, `${r.base}/README.md`), LEEME_MEMORIA);
  const memoria = join(raiz, MEMORIA);
  const agrega = await git(memoria, ['add', '-A']);
  if (!agrega.ok) throw fallo('No se pudo guardar la semilla en la memoria', agrega);
  const commit = await git(memoria, [...firma, 'commit', '-m', 'Estudio: STL Studio, de su semilla']);
  if (!commit.ok) throw fallo('No se pudo guardar la semilla en la memoria', commit);
  return 'instalada';
}

/**
 * Al cambiar de idioma, la semilla que nadie ha tocado se muestra en el nuevo (t_decide_semilla_contexto): solo mientras
 * ningún director la haya revisado; lo que ya se escribió queda como está. Devuelve si la cambió.
 */
export async function alinearSemilla(raiz: string, idioma: Idioma): Promise<boolean> {
  const local = await leerLocal(raiz);
  const repo = local.repositorios[ID_SEMILLA];
  if (!repo || !esElStudio(raiz, repo)) return false;
  const r = rutasDe(ID_SEMILLA);
  const proyectoEn = enDisco(raiz, r.proyecto);
  const planEn = enDisco(raiz, r.plan);
  if (!existsSync(proyectoEn) || !existsSync(planEn)) return false;
  const actual = JSON.parse(await readFile(proyectoEn, 'utf-8')) as Proyecto & { semilla?: boolean };
  const planActual = JSON.parse(await readFile(planEn, 'utf-8')) as Plan;
  if (!actual.semilla || planActual.revisado) return false;
  const nueva = await leerSemilla(raiz, idioma);
  if (nueva.plan.diagnostico.resumen[0] === planActual.diagnostico.resumen[0]) return false;
  await escribir(proyectoEn, enJson({ ...actual, contexto: nueva.proyecto.contexto, objetivo: nueva.proyecto.objetivo }));
  await escribir(planEn, enJson(nueva.plan));
  const memoria = join(repo, MEMORIA);
  await git(memoria, ['add', 'proyecto.json', 'director/plan.json']);
  await git(memoria, [...(await firmaDeCommit(raiz)), 'commit', '-m', `Estudio: la semilla de STL Studio, en ${idioma === 'es' ? 'español' : 'inglés'}`, '--', 'proyecto.json', 'director/plan.json']);
  return true;
}

/**
 * Si toca dejar la rama de respaldo al empezar esta revisión: solo en el proyecto que es el mismo Studio, en la copia de
 * quien instala (quien lo desarrolla ya tiene sus ramas), y una vez por cada cierre: mirar la bandeja otra vez en la misma
 * revisión, o volver a empezar una que no cerró, no la mueve, para que siempre quede lo de antes de empezar. Pura.
 */
export function tocaRespaldo(x: { esElStudio: boolean; copiaDeDesarrollo: boolean; revisado: string; ultimo?: string }): boolean {
  return x.esElStudio && !x.copiaDeDesarrollo && x.ultimo !== x.revisado;
}

/** Deja la rama de respaldo donde está el Studio, si toca. Devuelve si la dejó; si git falla, lo dice sin detener la revisión. */
export async function dejarRespaldo(raiz: string, repo: string, revisado: string): Promise<{ dejada: boolean; error?: string }> {
  const local = await leerLocal(raiz);
  if (!tocaRespaldo({ esElStudio: esElStudio(raiz, repo), copiaDeDesarrollo: !!local.copiaDeDesarrollo, revisado, ultimo: local.respaldoDe })) return { dejada: false };
  const r = await git(repo, ['branch', '-f', RAMA_RESPALDO, 'HEAD']);
  if (!r.ok) return { dejada: false, error: r.err.trim().split('\n').pop() || 'git falló' };
  await marcarRespaldo(raiz, revisado);
  return { dejada: true };
}
