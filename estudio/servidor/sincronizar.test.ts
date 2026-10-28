// Lo que guarda el servidor del Studio en git (sincronizar.ts), probado con repositorios de verdad en carpetas
// temporales: quién decide, el commit local de cada decisión, la subida sin forzar, el choque con lo de otra persona y
// que solo sube lo que guardó el Studio. El «GitHub» de cada prueba es un repositorio desnudo en la misma carpeta.
import { execFile, spawnSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, describe, expect, it } from 'vitest';
import { leerIdentidad, leerProyecto, olvidarIdentidad, PIE, Sincronizador } from './sincronizar';

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
const leer = (raiz: string, ruta: string) => readFileSync(join(raiz, ...ruta.split('/')), 'utf8');
const identidad = async (repo: string, nombre: string, correo: string) => {
  await git(repo, 'config', 'user.name', nombre);
  await git(repo, 'config', 'user.email', correo);
};
/** Lo que hay en `rev` de cada archivo (todos los de las pruebas son de una línea), en una sola orden. */
const enGitHub = async (origen: string, rev: string, ...rutas: string[]) => (await git(origen, 'show', ...rutas.map((r) => `${rev}:${r}`))).split('\n');
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

// Las dos situaciones de partida se arman una vez y cada prueba se lleva su copia (el remoto va con ruta relativa,
// «../origen.git», así que cada copia apunta a su propio GitHub)
let plantillas: Promise<{ memoria: string; compartida: string }> | null = null;
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
  // La misma memoria ya en su «GitHub», que no acepta reescribir historia, y Beto con su propio clon
  const compartida = join(base, 'plantilla-compartida');
  cpSync(memoria, compartida, { recursive: true });
  await git(compartida, 'init', '-q', '--bare', '-b', 'stl', 'origen.git');
  await git(join(compartida, 'origen.git'), 'config', 'receive.denyNonFastForwards', 'true');
  await git(join(compartida, 'aqui'), 'remote', 'add', 'origin', '../origen.git');
  await git(join(compartida, 'aqui'), 'push', '-q', 'origin', 'stl');
  await git(compartida, 'clone', '-q', '-b', 'stl', 'origen.git', 'otro');
  await git(join(compartida, 'otro'), 'remote', 'set-url', 'origin', '../origen.git');
  await identidad(join(compartida, 'otro'), 'Beto Ruiz', 'beto@ejemplo.co');
  return { memoria, compartida };
})());
const copia = async (cual: 'memoria' | 'compartida', nombre: string) => {
  const dir = join(base, `${++n}-${nombre}`);
  cpSync((await lasPlantillas())[cual], dir, { recursive: true });
  return { dir, aqui: join(dir, 'aqui'), origen: join(dir, 'origen.git'), otro: join(dir, 'otro') };
};

/** Beto cambia algo en su computador y lo sube. Devuelve su commit. */
async function subeBeto(otro: string, cambios: Record<string, string>, mensaje: string): Promise<string> {
  for (const [ruta, texto] of Object.entries(cambios)) escribir(otro, ruta, texto);
  await git(otro, 'add', '-A');
  await git(otro, 'commit', '-q', '-m', mensaje);
  await git(otro, 'push', '-q', 'origin', 'stl');
  return git(otro, 'rev-parse', 'HEAD');
}

// La identidad se recuerda en el módulo: estas van una tras otra
describe.skipIf(!hayGit)('quién decide: la identidad de git del clon y su lugar en el equipo', () => {
  /** Un Estudio (su carpeta, con su git) con un proyecto cuya memoria dice quién es quién. */
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

  it('el correo de git del clon dice quién es en el equipo (sin importar mayúsculas ni espacios), y se relee al olvidarla', async () => {
    olvidarIdentidad();
    const { estudio } = await estudioCon([
      { id: 'titular', nombre: 'Ana', correo: ' Ana@Ejemplo.co ' },
      { id: 'beto', nombre: 'Beto', correo: 'beto@ejemplo.co' },
    ]);
    await identidad(estudio, 'Ana Pérez', 'ana@ejemplo.co');
    expect(await leerIdentidad(estudio, 'prueba')).toEqual({ nombre: 'Ana Pérez', correo: 'ana@ejemplo.co', rol: 'titular' });
    // Se recuerda unos segundos (se relee cada 15 s); olvidarIdentidad la relee al instante
    await git(estudio, 'config', 'user.email', 'beto@ejemplo.co');
    expect((await leerIdentidad(estudio, 'prueba')).rol).toBe('titular');
    olvidarIdentidad();
    expect(await leerIdentidad(estudio, 'prueba')).toEqual({ nombre: 'Ana Pérez', correo: 'beto@ejemplo.co', rol: 'beto' });
    olvidarIdentidad();
  }, 15_000);

  it('un correo que no está en el equipo no decide; un equipo sin titular hace titular a quien abre el Estudio; sin proyecto, nadie tiene rol', async () => {
    olvidarIdentidad();
    const { estudio, repo } = await estudioCon([{ id: 'titular', nombre: 'Ana', correo: 'ana@ejemplo.co' }]);
    await identidad(estudio, 'Carla Díaz', 'carla@ejemplo.co');
    const fuera = await leerIdentidad(estudio, 'prueba');
    expect(fuera.rol).toBeNull();
    expect(fuera.problema).toContain('carla@ejemplo.co');
    expect(fuera.problema).toContain('no está en el equipo');

    escribir(repo, '.stl/proyecto.json', JSON.stringify({ nombre: 'Prueba', equipo: [] }));
    olvidarIdentidad();
    expect(await leerIdentidad(estudio, 'prueba')).toEqual({ nombre: 'Carla Díaz', correo: 'carla@ejemplo.co', rol: 'titular', nuevo: true });

    olvidarIdentidad();
    const sinProyecto = await leerIdentidad(estudio, null);
    expect(sinProyecto.rol).toBeNull();
    expect(sinProyecto.problema).toMatch(/Aún no hay proyectos/);
    expect(await leerProyecto(estudio, 'no-esta')).toBeNull();
    olvidarIdentidad();
  }, 15_000);

  it.skipIf(!aislado)('sin identidad de git no se firma nada (nunca con la de otro)', async () => {
    olvidarIdentidad();
    const { estudio } = await estudioCon([{ id: 'titular', nombre: 'Ana', correo: 'ana@ejemplo.co' }]);
    const id = await leerIdentidad(estudio, 'prueba');
    expect(id.rol).toBeNull();
    expect(id.problema).toMatch(/no tiene identidad de git/);
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
  }, 30_000);

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
  }, 30_000);

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
    await despues.revisar();
    expect(despues.estado()).toMatchObject({ fase: 'local', porSubir: 0 });
    expect((await git(aqui, 'log', '-3', '--format=%H %s')).split('\n')).toEqual([
      expect.stringMatching(/ Estudio \(prueba\): Ana Pérez graba una nota de voz$/),
      expect.stringMatching(/ Estudio \(prueba\): Ana Pérez deja una nota$/),
      `${antes} Estudio (prueba): nace la memoria`,
    ]);
    expect(await archivosDe(aqui, 'HEAD~1')).toBe('director/equipo/titular.json');
    expect(existsSync(pendientes)).toBe(false);
  }, 30_000);

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

// Las más largas van primero en cada grupo, para que el archivo termine antes
juntas('subir a GitHub, sin forzar nunca', () => {
  it('con un cambio más nuevo de otra persona en GitHub, sube solo la decisión encima del suyo, sin tocar la rama ni la carpeta, y nada se pierde', async () => {
    const { aqui, origen, otro } = await copia('compartida', 'otra-persona');
    const deBeto = await subeBeto(otro, {
      'director/equipo/beto.json': '{"notas":["de Beto"]}\n',
      'director/plan.json': '{"fases":["del otro computador"]}\n',
    }, 'Estudio (prueba): Beto Ruiz deja una nota');

    let sube = false;
    const s = new Sincronizador(aqui, async () => sube);
    escribir(aqui, 'director/equipo/titular.json', '{"notas":["de Ana"]}\n');
    await s.registrar(['director/equipo/titular.json'], 'Estudio (prueba): Ana Pérez deja una nota');
    const decision = await git(aqui, 'rev-parse', 'HEAD');
    sube = true;
    await s.revisar();
    expect(s.estado()).toMatchObject({ fase: 'al_dia', porSubir: 0, mensaje: 'Decisión subida a GitHub.' });
    expect(s.estado().subido).not.toBeNull();

    // En GitHub: un commit nuevo, encima del de Beto (que sigue ahí), con solo el archivo de la decisión
    const arriba = await git(origen, 'rev-parse', 'stl');
    const formato = '--format=%P%n%an <%ae>%n%B';
    const [padre, ...resto] = (await git(origen, 'log', '-1', formato, arriba)).split('\n');
    expect(padre).toBe(deBeto);
    expect(await archivosDe(origen, arriba)).toBe('director/equipo/titular.json');
    expect(await enGitHub(origen, arriba, 'director/equipo/titular.json', 'director/equipo/beto.json', 'director/plan.json'))
      .toEqual(['{"notas":["de Ana"]}', '{"notas":["de Beto"]}', '{"fases":["del otro computador"]}']);
    // Con la misma autora y el mismo mensaje (su pie y su id) que el commit local
    expect(resto).toEqual((await git(aqui, 'log', '-1', formato, decision)).split('\n').slice(1));

    // Aquí, ni la rama ni la carpeta cambiaron
    expect(await git(aqui, 'rev-parse', 'HEAD')).toBe(decision);
    expect(existsSync(join(aqui, 'director', 'equipo', 'beto.json'))).toBe(false);
    expect(await git(aqui, 'status', '--porcelain')).toBe('');

    // El próximo git pull --rebase descarta el commit local, porque GitHub ya tiene el mismo cambio
    await git(aqui, 'pull', '--rebase', '-q', 'origin', 'stl');
    expect(await git(aqui, 'rev-parse', 'HEAD')).toBe(arriba);
    expect(leer(aqui, 'director/equipo/beto.json')).toBe('{"notas":["de Beto"]}\n');
  }, 30_000);

  it('si alguien sube justo entre la lectura y la subida, se trae lo suyo y se vuelve a armar encima (sin forzar)', async () => {
    const { dir, aqui, origen, otro } = await copia('compartida', 'justo-antes');
    const primero = await subeBeto(otro, { 'director/equipo/beto.json': '{"notas":["primera de Beto"]}\n' }, 'Estudio (prueba): Beto Ruiz deja una nota');
    // Cuando esta memoria trae GitHub (su referencia origin/stl cambia), Beto sube otra cosa, una sola vez: así la
    // subida que sigue choca con algo que aquí aún no se ha visto, como en la vida real
    const marca = join(dir, 'beto-ya-subio').replace(/\\/g, '/');
    escribir(aqui, '.git/hooks/reference-transaction', [
      '#!/bin/sh',
      '[ "$1" = committed ] || exit 0',
      'grep -q refs/remotes/origin/stl || exit 0',
      `[ -f '${marca}' ] && exit 0`,
      `: > '${marca}'`,
      'unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_PREFIX GIT_OBJECT_DIRECTORY',
      `cd '${otro.replace(/\\/g, '/')}' || exit 0`,
      `printf '%s\\n' '{"notas":["segunda de Beto"]}' > director/equipo/beto.json`,
      'git add -A || exit 0',
      'git commit -q -m "Estudio (prueba): Beto Ruiz sube justo antes" || exit 0',
      'git push -q origin stl',
      'exit 0',
    ].join('\n') + '\n');
    // En Linux y macOS git ignora un hook que no es ejecutable (en Windows basta el «#!»)
    chmodSync(join(aqui, '.git', 'hooks', 'reference-transaction'), 0o755);

    let sube = false;
    const s = new Sincronizador(aqui, async () => sube);
    escribir(aqui, 'director/equipo/titular.json', '{"notas":["de Ana"]}\n');
    await s.registrar(['director/equipo/titular.json'], 'Estudio (prueba): Ana Pérez deja una nota');
    sube = true;
    await s.revisar();
    expect(existsSync(marca)).toBe(true); // Beto sí subió en medio
    const segundo = await git(otro, 'rev-parse', 'HEAD');
    expect(segundo).not.toBe(primero);
    expect(s.estado()).toMatchObject({ fase: 'al_dia', porSubir: 0, mensaje: 'Decisión subida a GitHub.' });
    const arriba = await git(origen, 'rev-parse', 'stl');
    expect(await git(origen, 'rev-parse', `${arriba}^`)).toBe(segundo);
    expect(await sale(origen, 'merge-base', '--is-ancestor', primero, arriba)).toBe(true);
    expect(await enGitHub(origen, arriba, 'director/equipo/titular.json', 'director/equipo/beto.json')).toEqual(['{"notas":["de Ana"]}', '{"notas":["segunda de Beto"]}']);
  }, 30_000);

  it('la primera vez, la rama de la memoria se sube entera', async () => {
    const { dir, aqui } = await copia('memoria', 'primera');
    await git(dir, 'init', '-q', '--bare', '-b', 'stl', 'origen.git');
    await git(aqui, 'remote', 'add', 'origin', '../origen.git');
    const origen = join(dir, 'origen.git');
    let sube = false;
    const s = new Sincronizador(aqui, async () => sube);
    escribir(aqui, 'director/equipo/titular.json', '{"notas":["la primera"]}\n');
    const e = await s.registrar(['director/equipo/titular.json'], 'Estudio (prueba): Ana Pérez deja una nota');
    expect(e.fase).toBe('local');
    expect(e.mensaje).toMatch(/apagada en Proyecto/);
    expect(await sale(origen, 'rev-parse', '--verify', '--quiet', 'refs/heads/stl')).toBe(false);

    sube = true;
    await s.revisar();
    expect(s.estado()).toMatchObject({ fase: 'al_dia', porSubir: 0, mensaje: 'La memoria del proyecto quedó en GitHub, en su rama.' });
    expect(s.estado().subido).not.toBeNull();
    expect(await git(origen, 'rev-parse', 'stl')).toBe(await git(aqui, 'rev-parse', 'HEAD'));
  }, 30_000);

  it('sin remoto «origin», o sin conexión, la decisión queda en su commit local', async () => {
    const { aqui } = await copia('memoria', 'sin-red');
    const s = new Sincronizador(aqui, async () => true);
    escribir(aqui, 'director/equipo/titular.json', '{"notas":["sin remoto"]}\n');
    expect((await s.registrar(['director/equipo/titular.json'], 'Estudio (prueba): sin remoto')).fase).toBe('subiendo');
    await s.revisar();
    expect(s.estado().fase).toBe('local');
    expect(s.estado().mensaje).toMatch(/no tiene remoto «origin»/);

    const antes = await git(aqui, 'rev-parse', 'HEAD');
    await git(aqui, 'remote', 'add', 'origin', '../no-existe.git');
    escribir(aqui, 'director/equipo/titular.json', '{"notas":["sin red"]}\n');
    await s.registrar(['director/equipo/titular.json'], 'Estudio (prueba): sin red');
    await s.revisar();
    expect(s.estado().fase).toBe('sin_red');
    expect(s.estado().mensaje).toMatch(/^Sin conexión con GitHub/);
    expect(s.estado().subido).toBeNull();
    const [padre, ...cuerpo] = (await git(aqui, 'log', '-1', '--format=%P%n%B')).split('\n');
    expect(padre).toBe(antes);
    expect(cuerpo).toContain(PIE);
  }, 30_000);

  it('ninguna subida se fuerza: el código no tiene --force ni refspecs con «+»', () => {
    const codigo = readFileSync(join(__dirname, 'sincronizar.ts'), 'utf8');
    const subidas = [...codigo.matchAll(/\['push',[^\]]*\]/g)].map((m) => m[0]);
    expect(subidas).toHaveLength(2);
    for (const s of subidas) expect(s).not.toMatch(/'-f'|[`']\+/);
    expect(codigo).not.toMatch(/--force|force-with-lease/);
  });
});

juntas('el choque con lo de otra persona', () => {
  // Una sola prueba, en dos tiempos (el choque y su arreglo), para no armar dos veces la misma situación
  it('si los dos cambiaron el mismo archivo, avisa del choque sin subir esa decisión ni perder el commit local; al resolverlo como dice el aviso, lo decidido mientras tanto espera y después todo sube', async () => {
    // Beto y Ana cambian el contexto del proyecto, cada uno a su manera; Ana además deja una nota
    const { aqui, origen, otro } = await copia('compartida', 'choque');
    const deBeto = await subeBeto(otro, { 'proyecto.json': '{"nombre":"Prueba","contexto":"el de Beto"}\n' }, 'Estudio (prueba): Beto Ruiz cambia el contexto');
    let sube = false;
    const s = new Sincronizador(aqui, async () => sube);
    escribir(aqui, 'proyecto.json', '{"nombre":"Prueba","contexto":"el de Ana"}\n');
    await s.registrar(['proyecto.json'], 'Estudio (prueba): Ana Pérez cambia el contexto');
    escribir(aqui, 'director/equipo/titular.json', '{"notas":["de Ana"]}\n');
    await s.registrar(['director/equipo/titular.json'], 'Estudio (prueba): Ana Pérez deja una nota');
    const local = await git(aqui, 'rev-parse', 'HEAD');
    sube = true;
    await s.revisar();

    const e = s.estado();
    expect(e).toMatchObject({ fase: 'choque', porSubir: 1 });
    expect(e.mensaje).toContain('proyecto.json');
    expect(e.mensaje).toContain('git pull --rebase');
    expect(e.mensaje).toContain('no se forzó nada');
    // En GitHub: lo de Beto intacto y, encima, solo la nota de Ana (la que no choca)
    const conNota = await git(origen, 'rev-parse', 'stl');
    expect(await git(origen, 'rev-parse', `${conNota}^`)).toBe(deBeto);
    expect(await enGitHub(origen, conNota, 'proyecto.json', 'director/equipo/titular.json')).toEqual(['{"nombre":"Prueba","contexto":"el de Beto"}', '{"notas":["de Ana"]}']);
    // Aquí: los dos commits de Ana siguen, y su versión del archivo también
    expect((await git(aqui, 'log', '-2', '--format=%H %s')).split('\n')).toEqual([
      `${local} Estudio (prueba): Ana Pérez deja una nota`,
      expect.stringMatching(/ Estudio \(prueba\): Ana Pérez cambia el contexto$/),
    ]);
    expect(leer(aqui, 'proyecto.json')).toBe('{"nombre":"Prueba","contexto":"el de Ana"}\n');
    expect(await git(aqui, 'status', '--porcelain')).toBe('');

    // Se sigue el aviso: git pull --rebase se detiene en proyecto.json
    expect(await sale(aqui, 'pull', '--rebase', '-q', 'origin', 'stl')).toBe(false);
    expect(existsSync(rutaGit(aqui, 'rebase-merge'))).toBe(true);
    // Mientras se resuelve, una decisión nueva no se mete en el rebase: espera fuera de git
    escribir(aqui, 'director/notas/n1.txt', 'dicho durante el rebase\n');
    const durante = await s.registrar(['director/notas/n1.txt'], 'Estudio (prueba): Ana Pérez graba una nota de voz');
    expect(durante.fase).toBe('en_espera');
    expect(durante.mensaje).toMatch(/rebase/);
    escribir(aqui, 'proyecto.json', '{"nombre":"Prueba","contexto":"el de Ana y el de Beto"}\n');
    await git(aqui, 'add', 'proyecto.json');
    await ejecutar('git', ['rebase', '--continue'], { cwd: aqui, windowsHide: true, env: { ...process.env, GIT_EDITOR: 'true' } });

    await s.revisar();
    expect(s.estado()).toMatchObject({ fase: 'al_dia', porSubir: 0, mensaje: 'Decisión subida a GitHub.' });
    const arriba = await git(origen, 'rev-parse', 'stl');
    expect(await enGitHub(origen, arriba, 'proyecto.json', 'director/notas/n1.txt', 'director/equipo/titular.json'))
      .toEqual(['{"nombre":"Prueba","contexto":"el de Ana y el de Beto"}', 'dicho durante el rebase', '{"notas":["de Ana"]}']);
    // Sin reescribir nada: encima de lo que ya estaba, el contexto resuelto y la nota grabada durante el rebase
    expect((await git(origen, 'rev-list', '--reverse', `${conNota}..${arriba}`)).split('\n')).toHaveLength(2);
    expect(await sale(origen, 'merge-base', '--is-ancestor', conNota, arriba)).toBe(true);
    expect(await git(aqui, 'status', '--porcelain')).toBe('');
  }, 30_000);
});

juntas('protección de origen: a GitHub solo sube lo que guardó el Studio', () => {
  it('un commit sin el pie «Origen: Estudio», o una decisión con archivos que no son del equipo, del proyecto ni de las notas, no se sube; y nada sube dos veces', async () => {
    const { aqui, origen, otro } = await copia('compartida', 'origen');
    const antes = await git(origen, 'rev-parse', 'stl');
    // Un commit hecho a mano, sin el pie (como el del director): el Studio no lo sube
    escribir(aqui, 'director/notas/a-mano.txt', 'escrito a mano\n');
    await git(aqui, 'add', 'director/notas/a-mano.txt');
    await git(aqui, 'commit', '-q', '-m', 'Director (prueba): transcribe una nota');

    let sube = false;
    const s = new Sincronizador(aqui, async () => sube);
    // Una decisión que lleva un archivo que no sube solo (el plan): no se sube, ni siquiera su parte del equipo
    escribir(aqui, 'director/plan.json', '{"fases":["cambiado aquí"]}\n');
    escribir(aqui, 'director/equipo/titular.json', '{"notas":["junto con el plan"]}\n');
    await s.registrar(['director/plan.json', 'director/equipo/titular.json'], 'Estudio (prueba): con el plan');
    expect((await archivosDe(aqui, 'HEAD')).split('\n')).toEqual(['director/equipo/titular.json', 'director/plan.json']);
    // La decisión de siempre (una nota de voz), sí
    escribir(aqui, 'director/notas/n1.txt', 'lo que dijo Ana\n');
    await s.registrar(['director/notas/n1.txt'], 'Estudio (prueba): Ana Pérez graba una nota de voz');

    sube = true;
    await s.revisar();
    expect(s.estado()).toMatchObject({ fase: 'al_dia', porSubir: 0, mensaje: 'Decisión subida a GitHub.' });
    const arriba = await git(origen, 'rev-parse', 'stl');
    expect(await git(origen, 'rev-parse', `${arriba}^`)).toBe(antes);
    expect(await archivosDe(origen, arriba)).toBe('director/notas/n1.txt');
    expect((await git(origen, 'ls-tree', '-r', '--name-only', arriba)).split('\n')).not.toContain('director/notas/a-mano.txt');
    expect(await enGitHub(origen, arriba, 'director/plan.json', 'director/equipo/titular.json')).toEqual([PLAN.trimEnd(), TITULAR.trimEnd()]);

    // Revisar otra vez no la sube de nuevo
    await s.revisar();
    expect(s.estado()).toMatchObject({ fase: 'al_dia', mensaje: 'Al día con GitHub.' });
    expect(await git(origen, 'rev-parse', 'stl')).toBe(arriba);
    // Ni aunque después Beto cambie ese archivo en GitHub: la reconoce por su id (sin él, la vería como un choque)
    await git(otro, 'pull', '-q', '--ff-only', 'origin', 'stl');
    const deBeto = await subeBeto(otro, { 'director/notas/n1.txt': 'lo que corrigió Beto\n' }, 'Estudio (prueba): Beto Ruiz corrige la nota');
    await s.revisar();
    expect(s.estado()).toMatchObject({ fase: 'al_dia', porSubir: 0, mensaje: 'Al día con GitHub.' });
    expect(await git(origen, 'rev-parse', 'stl')).toBe(deBeto);
  }, 30_000);

  // POSIBLE FALLA (caso límite), sin corregir aquí: un commit local sin el pie que cambió un archivo que sí sube solo
  // (por ejemplo, la transcripción director/notas/<id>.txt que deja la bandeja en el commit del director) hace que una
  // decisión posterior del Studio sobre ese mismo archivo se detenga como «choque» con el aviso «En GitHub cambió
  // director/notas/n1.txt mientras se decidía aquí … git pull --rebase», aunque en GitHub nadie lo cambió: armar()
  // compara lo de GitHub con el padre local de la decisión, y ese padre trae lo del commit sin pie, que nunca se sube.
  // git pull --rebase no lo resuelve (no hay nada que traer), así que el aviso sigue en cada revisión hasta que alguien
  // sube la rama a mano. La prueba de abajo comprueba lo que sí está bien (no se sube nada por la puerta de atrás y no
  // se pierde nada) y deja escrito lo que hoy dice el estado.
  it('una decisión encima de un commit sin el pie, en el mismo archivo, no sube lo de ese commit por la puerta de atrás', async () => {
    const { aqui, origen } = await copia('compartida', 'sin-pie');
    const antes = await git(origen, 'rev-parse', 'stl');
    escribir(aqui, 'director/notas/n1.txt', 'lo que entendió la bandeja\n');
    await git(aqui, 'add', 'director/notas/n1.txt');
    await git(aqui, 'commit', '-q', '-m', 'Director (prueba): transcribe una nota');
    let sube = false;
    const s = new Sincronizador(aqui, async () => sube);
    escribir(aqui, 'director/notas/n1.txt', 'lo que Ana corrigió\n');
    await s.registrar(['director/notas/n1.txt'], 'Estudio (prueba): Ana Pérez corrige lo que se entendió de su nota de voz');
    const local = await git(aqui, 'rev-parse', 'HEAD');
    sube = true;
    await s.revisar();
    expect(await git(origen, 'rev-parse', 'stl')).toBe(antes);
    expect(await git(aqui, 'rev-parse', 'HEAD')).toBe(local);
    // Lo que hoy dice el estado (ver el comentario de arriba): un choque que no viene de GitHub
    expect(s.estado()).toMatchObject({ fase: 'choque', porSubir: 1 });
    expect(s.estado().mensaje).toContain('En GitHub cambió director/notas/n1.txt');
    // Y seguir el aviso no lo resuelve
    await git(aqui, 'pull', '--rebase', '-q', 'origin', 'stl');
    await s.revisar();
    expect(s.estado().fase).toBe('choque');
  }, 30_000);

  it.todo('un commit local sin el pie que cambió el mismo archivo no se presenta como un cambio de GitHub, y el aviso dice cómo salir (subir la rama o rehacer la decisión)');
});
