// Lo que guarda el servidor del Studio en git (sincronizar.ts), probado con repositorios de verdad en carpetas
// temporales: quién decide y el commit local de cada decisión (solo con lo suyo, o en espera si git está ocupado).
import { execFile, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, describe, expect, it } from 'vitest';
import { ponerIdioma } from '../src/textos';
import { esCommitDelStudio, guardarIdentidad, identidadValida, leerIdentidad, leerProyecto, mensajeDelStudio, olvidarIdentidad, PIE, Sincronizador } from './sincronizar';

describe('los commits del Studio, en inglés desde el 20 de noviembre de 2026 (nmwp711kitit)', () => {
  it('nacen «Studio (<id>): …» y se reconocen también los de antes, «Estudio (<id>): …»', () => {
    expect(mensajeDelStudio('golf', 'Ana leaves a note for the director')).toBe('Studio (golf): Ana leaves a note for the director');
    expect(PIE).toBe('Origin: Studio');
    for (const s of ['Estudio (golf): Ana deja una nota', 'Studio (golf): Ana leaves a note', 'Studio: goes back to the version that worked', 'Estudio: entrega del proyecto']) expect(esCommitDelStudio(s)).toBe(true);
    for (const s of ['STL: the log in English', 'Director (golf): review', 'STL Studio: this copy, just installed', 'Studios everywhere']) expect(esCommitDelStudio(s)).toBe(false);
  });

  it('el servidor ya no escribe un mensaje de commit en castellano: cada decisión se dice en inglés', () => {
    const api = readFileSync(new URL('./api.ts', import.meta.url), 'utf8');
    expect(api).not.toMatch(/`Estudio[ :(]/);
    expect(api).toContain("p.que.push(enIdioma('en', que));");
    expect(api).not.toMatch(/programarCommit\([^)]*, (que[,)]|`\$\{que\})/);
    for (const archivo of ['./volver.ts', '../../src/director/semilla.ts', '../../tools/cambiar-correo.ts']) {
      const fuente = readFileSync(new URL(archivo, import.meta.url), 'utf8');
      expect(fuente, archivo).not.toMatch(/['`]Estudio[ :(]/);
    }
  });
});

// Git sin la configuración de esta persona ni la del sistema (cada repositorio de prueba trae la suya, con git config
// local) y sin buscar un repositorio por encima de la carpeta de las pruebas. Nada de esto toca la configuración global:
// solo cambia el entorno de este archivo de pruebas, y se restaura al final.
const base = mkdtempSync(join(tmpdir(), 'estudio-sincronizar-'));
const configVacia = join(base, 'gitconfig-vacia');
writeFileSync(configVacia, '');
const AISLAR: Record<string, string> = { GIT_CONFIG_GLOBAL: configVacia, GIT_CONFIG_NOSYSTEM: '1', GIT_CEILING_DIRECTORIES: base };
// Y sin lo que git deja a quien corre dentro de un hook suyo o de otra orden suya (npm test desde un pre-commit): con
// GIT_DIR o GIT_INDEX_FILE heredados, cada init, add, commit y config de estas pruebas iría al repositorio de afuera
// (el del Studio), y una identidad heredada firmaría los commits con otro nombre
const QUITAR = ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_NAMESPACE', 'GIT_PREFIX', 'GIT_CONFIG_PARAMETERS', 'GIT_CONFIG_COUNT', 'GIT_AUTHOR_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_AUTHOR_DATE',
  'GIT_COMMITTER_NAME', 'GIT_COMMITTER_EMAIL', 'GIT_COMMITTER_DATE'];
const entornoAntes = Object.fromEntries([...Object.keys(AISLAR), ...QUITAR].map((k) => [k, process.env[k]]));
Object.assign(process.env, AISLAR);
for (const k of QUITAR) delete process.env[k];
afterAll(() => {
  for (const [k, v] of Object.entries(entornoAntes)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  rmSync(base, { recursive: true, force: true, maxRetries: 3 });
});

const hayGit = spawnSync('git', ['--version']).status === 0;
/** Git hace caso a GIT_CONFIG_GLOBAL (2.32 o más): sin eso no se puede probar un clon sin identidad. */
const aislado = hayGit && !spawnSync('git', ['config', 'user.name'], { cwd: base, encoding: 'utf8' }).stdout.trim();
// Cada prueba trabaja en sus propias carpetas: las de git van a la vez, para que el archivo entero tarde poco
const juntas = hayGit ? describe.concurrent : describe.skip;

const ejecutar = promisify(execFile);
const git = async (cwd: string, ...args: string[]) => (await ejecutar('git', args, { cwd, encoding: 'utf8', windowsHide: true })).stdout.trimEnd();
/** Si la orden de git sale bien (sin lanzar error si no). */
const sale = (cwd: string, ...args: string[]) => new Promise<boolean>((listo) => execFile('git', args, { cwd, windowsHide: true }, (e) => listo(!e)));
/** Un archivo de la carpeta de git (todos los repositorios de prueba son normales: `.git` en su raíz). */
const rutaGit = (repo: string, nombre: string) => join(repo, '.git', nombre);
const escribir = (raiz: string, ruta: string, texto: string) => {
  mkdirSync(join(raiz, ...ruta.split('/').slice(0, -1)), { recursive: true });
  writeFileSync(join(raiz, ...ruta.split('/')), texto);
};
const identidad = async (repo: string, nombre: string, correo: string) => {
  await git(repo, 'config', 'user.name', nombre);
  await git(repo, 'config', 'user.email', correo);
};
const archivosDe = (repo: string, rev: string) => git(repo, 'show', '--name-only', '--format=', rev);

const PROYECTO = '{"nombre":"Prueba","contexto":"el de antes"}\n';
const PLAN = '{"fases":[]}\n';
const TITULAR = '{"notas":[]}\n';

let n = 0;
const carpeta = (nombre: string) => {
  const d = join(base, `${++n}-${nombre}`);
  mkdirSync(d);
  return d;
};

// La situación de partida se arma una vez y cada prueba se lleva su copia
let plantillas: Promise<{ memoria: string }> | null = null;
const lasPlantillas = () => (plantillas ??= (async () => {
  // Una memoria de proyecto (rama stl) con su primer commit, de Ana
  const memoria = join(base, 'plantilla-memoria');
  const aqui = join(memoria, 'aqui');
  mkdirSync(aqui, { recursive: true });
  await git(aqui, 'init', '-q', '-b', 'stl');
  await identidad(aqui, 'Ana Pérez', 'ana@ejemplo.co');
  escribir(aqui, 'proyecto.json', PROYECTO);
  escribir(aqui, 'director/plan.json', PLAN);
  escribir(aqui, 'director/equipo/titular.json', TITULAR);
  await git(aqui, 'add', '-A');
  await git(aqui, 'commit', '-q', '-m', 'Estudio (prueba): nace la memoria');
  return { memoria };
})());
const copia = async (cual: 'memoria', nombre: string) => {
  const dir = join(base, `${++n}-${nombre}`);
  cpSync((await lasPlantillas())[cual], dir, { recursive: true });
  return { dir, aqui: join(dir, 'aqui') };
};

// La identidad se recuerda en el módulo: estas van una tras otra
describe.skipIf(!hayGit)('quién decide: la identidad de git de la carpeta del Studio, de una sola persona (pd_sin_modo_equipo)', () => {
  /** Un Estudio (su carpeta, con su git) con un proyecto. */
  async function estudioCon(equipo: { id: string; nombre: string; correo: string }[]) {
    const dir = carpeta('identidad');
    const estudio = join(dir, 'estudio');
    mkdirSync(estudio);
    await git(estudio, 'init', '-q', '-b', 'main');
    const repo = join(dir, 'repo');
    escribir(repo, '.stl/proyecto.json', JSON.stringify({ nombre: 'Prueba', equipo }));
    writeFileSync(join(estudio, 'estudio.local.json'), JSON.stringify({ activo: 'prueba', repositorios: { prueba: repo } }));
    return { estudio, repo };
  }

  it('quien tiene la identidad es el titular, con cualquier correo: ya no se busca en un equipo; y se relee al olvidarla', async () => {
    olvidarIdentidad();
    const { estudio } = await estudioCon([{ id: 'titular', nombre: 'Ana', correo: 'ana@ejemplo.co' }]);
    await identidad(estudio, 'Ana Pérez', 'ana@ejemplo.co');
    expect(await leerIdentidad(estudio, 'prueba')).toEqual({ nombre: 'Ana Pérez', correo: 'ana@ejemplo.co', rol: 'titular' });
    // Otro correo (cambió el suyo): sigue siendo el titular, sin «no está en el equipo»
    await git(estudio, 'config', 'user.email', 'otro@ejemplo.co');
    olvidarIdentidad();
    const otro = await leerIdentidad(estudio, 'prueba');
    expect(otro).toEqual({ nombre: 'Ana Pérez', correo: 'otro@ejemplo.co', rol: 'titular' });
    expect(otro.problema).toBeUndefined();
    olvidarIdentidad();
  }, 15_000);

  it('un proyecto sin titular anotado lo marca como nuevo; sin proyecto, nadie tiene rol', async () => {
    olvidarIdentidad();
    const { estudio } = await estudioCon([]);
    await identidad(estudio, 'Carla Díaz', 'carla@ejemplo.co');
    expect(await leerIdentidad(estudio, 'prueba')).toEqual({ nombre: 'Carla Díaz', correo: 'carla@ejemplo.co', rol: 'titular', nuevo: true });
    olvidarIdentidad();
    ponerIdioma('en');
    const sinProyecto = await leerIdentidad(estudio, null);
    ponerIdioma('es');
    expect(sinProyecto.rol).toBeNull();
    expect(sinProyecto.problema).toMatch(/No projects yet/);
    expect(await leerProyecto(estudio, 'no-esta')).toBeNull();
    olvidarIdentidad();
  }, 15_000);

  it('el nombre y el correo de la ventana: en una línea, y un correo completo', () => {
    expect(identidadValida(' Ana Pérez ', ' ana@ejemplo.co ')).toEqual({ nombre: 'Ana Pérez', correo: 'ana@ejemplo.co' });
    expect(identidadValida('', 'ana@ejemplo.co')).toEqual({ error: 'nombre' });
    expect(identidadValida('Ana\nPérez', 'ana@ejemplo.co')).toEqual({ error: 'nombre' });
    expect(identidadValida('Ana', 'ana@')).toEqual({ error: 'correo' });
    expect(identidadValida('Ana', 7)).toEqual({ error: 'correo' });
  });

  it.skipIf(!aislado)('sin identidad no se firma nada; la ventana la guarda con git config en esa carpeta, una vez, y nunca pisa la que ya está', async () => {
    olvidarIdentidad();
    const { estudio } = await estudioCon([{ id: 'titular', nombre: 'Ana', correo: 'ana@ejemplo.co' }]);
    ponerIdioma('en');
    const sin = await leerIdentidad(estudio, 'prueba');
    ponerIdioma('es');
    expect(sin.rol).toBeNull();
    expect(sin.problema).toMatch(/does not have your git name and email/);
    expect(await guardarIdentidad(estudio, 'Ana Pérez', 'ana@ejemplo.co')).toBe('ok');
    expect(await git(estudio, 'config', '--local', 'user.name')).toBe('Ana Pérez');
    expect(await git(estudio, 'config', '--local', 'user.email')).toBe('ana@ejemplo.co');
    // Se relee al instante (guardarIdentidad olvida la que tenía)
    expect((await leerIdentidad(estudio, 'prueba')).rol).toBe('titular');
    // Con las dos ya puestas no se cambia nada
    expect(await guardarIdentidad(estudio, 'Otra', 'otra@ejemplo.co')).toBe('ya');
    expect(await git(estudio, 'config', '--local', 'user.email')).toBe('ana@ejemplo.co');
    olvidarIdentidad();
  }, 15_000);
});

juntas('cada decisión, un commit local solo con lo suyo', () => {
  it('el commit lleva solo las rutas de la decisión, el pie «Origen: Estudio» y la identidad del clon', async () => {
    const { aqui } = await copia('memoria', 'commit');
    const antes = await git(aqui, 'rev-parse', 'HEAD');
    // Lo demás que hay a medias en la carpeta no es de esta decisión: un cambio del director ya preparado y un archivo nuevo
    escribir(aqui, 'director/plan.json', '{"fases":["a medias"]}\n');
    await git(aqui, 'add', 'director/plan.json');
    escribir(aqui, 'docs/borrador.md', '# A medias\n');
    escribir(aqui, 'director/equipo/titular.json', '{"notas":["una nota"]}\n');

    const s = new Sincronizador(aqui);
    const e = await s.registrar(['director/equipo/titular.json'], 'Estudio (prueba): Ana Pérez deja una nota para el director');
    expect(e).toMatchObject({ fase: 'local', porSubir: 0 });
    expect(e.mensaje).toMatch(/commit local/);
    expect(await archivosDe(aqui, 'HEAD')).toBe('director/equipo/titular.json');
    const [padre, quien, ...cuerpo] = (await git(aqui, 'log', '-1', '--format=%P%n%an <%ae> | %cn <%ce>%n%B')).split('\n');
    expect(padre).toBe(antes);
    expect(quien).toBe('Ana Pérez <ana@ejemplo.co> | Ana Pérez <ana@ejemplo.co>');
    expect(cuerpo.slice(0, 3)).toEqual(['Estudio (prueba): Ana Pérez deja una nota para el director', '', PIE]);
    expect(cuerpo[3]).toMatch(/^Decision: \S+$/);
    // Lo ajeno sigue como estaba: el plan preparado y el borrador sin commit
    expect((await git(aqui, 'status', '--porcelain', '-uall')).split('\n')).toEqual(['M  director/plan.json', '?? docs/borrador.md']);

    // Una ruta absoluta (como las da el servidor) se guarda relativa a la memoria
    escribir(aqui, 'director/notas/n1.txt', 'lo que dijo Ana\n');
    await s.registrar([join(aqui, 'director', 'notas', 'n1.txt')], 'Estudio (prueba): Ana Pérez transcribe una nota de voz');
    expect(await archivosDe(aqui, 'HEAD')).toBe('director/notas/n1.txt');
    expect(await git(aqui, 'rev-list', '--count', 'HEAD')).toBe('3');
  }, 60_000);

  it('una decisión sin cambios o con un archivo que ya no está no hace commit ni falla', async () => {
    const { aqui } = await copia('memoria', 'sin-cambios');
    const antes = await git(aqui, 'rev-parse', 'HEAD');
    const s = new Sincronizador(aqui);
    const e = await s.registrar(['director/equipo/titular.json', 'director/notas/no-existe.txt'], 'Estudio (prueba): nada que guardar');
    expect(e).toMatchObject({ fase: 'local', porSubir: 0 });
    expect(await git(aqui, 'rev-parse', 'HEAD')).toBe(antes);
    expect(existsSync(rutaGit(aqui, 'estudio-pendientes.json'))).toBe(false);
    // Hoy un archivo borrado tampoco entra en el commit (commitear solo toma las rutas que existen): su borrado queda
    // sin guardar. Ninguna decisión del Studio borra hoy un archivo de la memoria, así que no se prueba como esperado.
    unlinkSync(join(aqui, 'director', 'equipo', 'titular.json'));
    expect((await s.registrar(['director/equipo/titular.json'], 'Estudio (prueba): borra')).fase).toBe('local');
    expect(await git(aqui, 'rev-parse', 'HEAD')).toBe(antes);
    expect(await git(aqui, 'status', '--porcelain')).toBe(' D director/equipo/titular.json');
  }, 60_000);

  it('si git está ocupado (una mezcla a medias o HEAD suelto), la decisión espera fuera de git y se guarda sola después, aunque el servidor se reinicie', async () => {
    const { aqui } = await copia('memoria', 'ocupado');
    const antes = await git(aqui, 'rev-parse', 'HEAD');
    const mezcla = rutaGit(aqui, 'MERGE_HEAD');
    writeFileSync(mezcla, `${antes}\n`);
    escribir(aqui, 'director/equipo/titular.json', '{"notas":["en plena mezcla"]}\n');
    const s = new Sincronizador(aqui);
    const e = await s.registrar(['director/equipo/titular.json'], 'Estudio (prueba): Ana Pérez deja una nota');
    expect(e).toMatchObject({ fase: 'en_espera', porSubir: 1 });
    expect(e.mensaje).toMatch(/mezcla/);
    expect(await git(aqui, 'rev-parse', 'HEAD')).toBe(antes);
    const pendientes = rutaGit(aqui, 'estudio-pendientes.json');
    expect(JSON.parse(readFileSync(pendientes, 'utf8'))).toEqual([{ rutas: ['director/equipo/titular.json'], mensaje: 'Estudio (prueba): Ana Pérez deja una nota' }]);

    unlinkSync(mezcla);
    await git(aqui, 'checkout', '-q', '--detach');
    escribir(aqui, 'director/notas/n1.txt', 'lo que dijo Ana\n');
    const e2 = await s.registrar(['director/notas/n1.txt'], 'Estudio (prueba): Ana Pérez graba una nota de voz');
    expect(e2).toMatchObject({ fase: 'en_espera', porSubir: 2 });
    expect(e2.mensaje).toMatch(/HEAD suelto/);
    expect(await git(aqui, 'rev-parse', 'HEAD')).toBe(antes);

    // Se desocupa y el servidor se reinicia: otro Sincronizador encuentra las dos en espera y las guarda, en orden
    await git(aqui, 'checkout', '-q', 'stl');
    const despues = new Sincronizador(aqui);
    await despues.registrar([], 'Estudio (prueba): se reanuda');
    expect(despues.estado()).toMatchObject({ fase: 'local', porSubir: 0 });
    expect((await git(aqui, 'log', '-3', '--format=%H %s')).split('\n')).toEqual([
      expect.stringMatching(/ Estudio \(prueba\): Ana Pérez graba una nota de voz$/),
      expect.stringMatching(/ Estudio \(prueba\): Ana Pérez deja una nota$/),
      `${antes} Estudio (prueba): nace la memoria`,
    ]);
    expect(await archivosDe(aqui, 'HEAD~1')).toBe('director/equipo/titular.json');
    expect(existsSync(pendientes)).toBe(false);
  }, 60_000);

  it('en una carpeta sin git no revienta: lo dice en el estado', async () => {
    const suelta = carpeta('sin-git');
    // Antes de nada, que de verdad no haya un repositorio aquí ni por encima (así no se toca ningún otro)
    expect(await sale(suelta, 'rev-parse', '--git-dir')).toBe(false);
    escribir(suelta, 'director/equipo/titular.json', TITULAR);
    const e = await new Sincronizador(suelta).registrar(['director/equipo/titular.json'], 'Estudio (prueba): Ana Pérez deja una nota');
    expect(e.fase).toBe('en_espera');
    expect(e.mensaje).toMatch(/no se pudo hacer su commit/);
  }, 15_000);
});


describe('las órdenes de git del Studio', () => {
  it('si git ya terminó cuando le llega la entrada, el EPIPE no queda suelto (tumbaba la integración continua el 28 de octubre de 2026)', () => {
    const fuente = readFileSync(new URL('./sincronizar.ts', import.meta.url), 'utf8');
    const escucha = fuente.indexOf("hijo.stdin.on('error', () => undefined);");
    expect(escucha).toBeGreaterThan(0);
    expect(escucha).toBeLessThan(fuente.indexOf("hijo.stdin.end(op.entrada ?? '');"));
  });
});

// Aparte, no en paralelo: el idioma es uno solo para todo el archivo
(hayGit ? describe : describe.skip)('el mensaje del pie en el idioma de la interfaz', () => {
  it('el estado de la decisión sale en el idioma de la interfaz', async () => {
    const { aqui } = await copia('memoria', 'idioma');
    const s = new Sincronizador(aqui);
    ponerIdioma('en');
    try {
      escribir(aqui, 'director/equipo/titular.json', '{"notas":["in english"]}\n');
      expect((await s.registrar(['director/equipo/titular.json'], 'Estudio (prueba): in english')).mensaje).toBe('Saved in a local commit.');
    } finally {
      ponerIdioma('es');
    }
  }, 60_000);
});
