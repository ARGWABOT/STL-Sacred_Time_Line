// La memoria de un proyecto, leída en un solo lugar (memoria.ts), probada sobre carpetas temporales: un Estudio y un
// repositorio con su memoria (.stl, rama stl) abierta como la abre el Studio, y con un «GitHub» (un repositorio desnudo)
// cuando lo que se prueba es lo que difiere entre la carpeta y la nube. Es lo que leen las herramientas del director
// (tools/director/comun.ts, que corre de punta a punta en tools/director/bandeja-listo.test.ts) y el servidor del Studio
// (estudio/servidor/director.ts): si cambia una lectura, cambia aquí y se prueba aquí.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { leerEstadoDelEquipo, leerEstadoDePersona, leerJsonFresco, leerPlanUnido, leerProyectoDe, personasConArchivo } from './memoria';
import { abrirMemoria, guardarRutaRepositorio } from './proyectos';

const ID = 'prueba-memoria';
const ENTORNO_GIT = { ...process.env, GIT_AUTHOR_NAME: 'Prueba', GIT_AUTHOR_EMAIL: 'p@e.co', GIT_COMMITTER_NAME: 'Prueba', GIT_COMMITTER_EMAIL: 'p@e.co' };
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'core.autocrlf=false', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8', env: ENTORNO_GIT, windowsHide: true }).trim();

const base = mkdtempSync(join(tmpdir(), 'estudio-memoria-'));
afterAll(() => rmSync(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));

const escribir = (raiz: string, ruta: string, texto: string) => {
  mkdirSync(join(raiz, ...ruta.split('/').slice(0, -1)), { recursive: true });
  writeFileSync(join(raiz, ...ruta.split('/')), texto);
};
const json = (datos: unknown) => JSON.stringify(datos, null, 2) + '\n';
const nota = (id: string, quien: string, texto: string) => ({ id, cuando: '2026-10-01T10:00:00.000Z', quien, sobre: { tipo: 'general' }, texto });

let n = 0;
/** Un Estudio temporal con un repositorio cuya memoria (<repo>/.stl, rama stl) está abierta, y el proyecto entregado. */
async function armar() {
  const dir = mkdtempSync(join(base, `m${++n}-`));
  const estudio = join(dir, 'estudio');
  const repo = join(dir, 'repo');
  mkdirSync(estudio);
  mkdirSync(repo);
  git(repo, 'init', '-q', '-b', 'main');
  git(repo, 'commit', '-q', '--allow-empty', '-m', 'código');
  await abrirMemoria(repo);
  await guardarRutaRepositorio(estudio, ID, repo);
  const memoria = join(repo, '.stl');
  return {
    dir,
    estudio,
    memoria,
    /** Un archivo de la memoria, por su ruta dentro de ella (director/plan.json, proyecto.json…). */
    enMemoria: (ruta: string, datos: unknown) => escribir(memoria, ruta, typeof datos === 'string' ? datos : json(datos)),
    /** Lo mismo que hace el Studio con la memoria: un commit local con lo que hay. */
    guardar: (mensaje: string) => {
      git(memoria, 'add', '-A');
      git(memoria, 'commit', '-q', '-m', mensaje);
    },
  };
}

describe('el plan, con lo archivado', () => {
  it('une plan.json con archivo.json y lo del plan manda', async () => {
    const e = await armar();
    e.enMemoria('director/plan.json', { misiones: [], respuestas: { nueva: { cuando: '2026-10-02', texto: 'del plan' }, comun: { cuando: '2026-10-02', texto: 'la del plan' } } });
    e.enMemoria('director/archivo.json', { respuestas: { vieja: { cuando: '2026-09-01', texto: 'archivada' }, comun: { cuando: '2026-09-01', texto: 'la archivada' } }, revisiones: { m1: { cuando: '2026-09-01', veredicto: 'aprobada' } } });
    const plan = await leerPlanUnido(e.estudio, ID);
    expect(Object.keys(plan.respuestas).sort()).toEqual(['comun', 'nueva', 'vieja']);
    expect(plan.respuestas.comun.texto).toBe('la del plan');
    expect(plan.respuestas.vieja.texto).toBe('archivada');
    expect(plan.revisiones.m1.veredicto).toBe('aprobada');
    expect(plan.misiones).toEqual([]);
  });

  it('une también los meses del archivo (director/archivo/AAAA-MM.json), que mandan sobre el de una sola pieza, en su orden', async () => {
    const e = await armar();
    e.enMemoria('director/plan.json', { misiones: [], respuestas: { nueva: { cuando: '2026-11-02', texto: 'del plan' } } });
    e.enMemoria('director/archivo.json', { respuestas: { vieja: { cuando: '2026-09-01', texto: 'de antes' }, cambio: { cuando: '2026-09-01', texto: 'de antes' } }, revisiones: {} });
    e.enMemoria('director/archivo/2026-10.json', { respuestas: { cambio: { cuando: '2026-10-01', texto: 'de octubre' }, otra: { cuando: '2026-10-01', texto: 'de octubre' } }, revisiones: {} });
    e.enMemoria('director/archivo/2026-11.json', { respuestas: { otra: { cuando: '2026-11-01', texto: 'de noviembre' } }, revisiones: { m1: { cuando: '2026-11-01', veredicto: 'aprobada' } } });
    const plan = await leerPlanUnido(e.estudio, ID);
    expect(Object.keys(plan.respuestas).sort()).toEqual(['cambio', 'nueva', 'otra', 'vieja']);
    expect(plan.respuestas.vieja.texto).toBe('de antes');
    expect(plan.respuestas.cambio.texto).toBe('de octubre');
    expect(plan.respuestas.otra.texto).toBe('de noviembre');
    expect(plan.revisiones.m1.veredicto).toBe('aprobada');
  });

  it('sin archivo.json, el plan tal cual; sin plan.json, uno vacío', async () => {
    const e = await armar();
    expect(await leerPlanUnido(e.estudio, ID)).toEqual({});
    e.enMemoria('director/plan.json', { misiones: [], revisado: '2026-10-02T00:00:00Z' });
    expect(await leerPlanUnido(e.estudio, ID)).toEqual({ misiones: [], revisado: '2026-10-02T00:00:00Z' });
  });

  it('un plan que no se entiende falla (no se lee a medias)', async () => {
    const e = await armar();
    e.enMemoria('director/plan.json', '{ esto no es json');
    await expect(leerPlanUnido(e.estudio, ID)).rejects.toThrow();
  });
});

describe('el proyecto', () => {
  it('trae lo de proyecto.json sobre un proyecto vacío, para que ningún campo falte', async () => {
    const e = await armar();
    e.enMemoria('proyecto.json', { nombre: 'Casa', equipo: [{ id: 'titular', nombre: 'Laura', correo: 'laura@ejemplo.co', cargo: '', papel: '' }] });
    const p = await leerProyectoDe(e.estudio, ID);
    expect(p.nombre).toBe('Casa');
    expect(p.equipo.map((i) => i.id)).toEqual(['titular']);
    expect(p.tipo).toBe('existente');
    expect(p.objetivo).toBeNull();
    expect(p.sincronizar).toBe(false);
  });

  it('sin proyecto.json, el proyecto vacío', async () => {
    const e = await armar();
    const p = await leerProyectoDe(e.estudio, ID);
    expect(p.nombre).toBe('');
    expect(p.equipo).toEqual([]);
  });
});

describe('un JSON de la memoria, para quien no puede dejarse engañar', () => {
  it('{} si no existe todavía, null si existe y no se entiende, y el JSON si se entiende', async () => {
    const e = await armar();
    expect(await leerJsonFresco(e.estudio, `proyectos/${ID}/director/plan.json`)).toEqual({});
    e.enMemoria('director/plan.json', '{ roto');
    expect(await leerJsonFresco(e.estudio, `proyectos/${ID}/director/plan.json`)).toBeNull();
    e.enMemoria('director/plan.json', { fases: [] });
    expect(await leerJsonFresco(e.estudio, `proyectos/${ID}/director/plan.json`)).toEqual({ fases: [] });
  });
});

describe('las personas con archivo de estado', () => {
  it('el titular, las del equipo y las que tengan su archivo en la carpeta (solo .json)', async () => {
    const e = await armar();
    const proyecto = { ...(await leerProyectoDe(e.estudio, ID)), equipo: [{ id: 'ana', nombre: 'Ana', correo: 'ana@e.co', cargo: '', papel: '' }] };
    // Sin carpeta de equipo todavía: el titular y el equipo
    expect(await personasConArchivo(e.estudio, ID, proyecto)).toEqual(['titular', 'ana']);
    e.enMemoria('director/equipo/luis.json', json({}));
    e.enMemoria('director/equipo/ana.json', json({}));
    e.enMemoria('director/equipo/leeme.txt', 'no es de una persona');
    expect((await personasConArchivo(e.estudio, ID, proyecto)).sort()).toEqual(['ana', 'luis', 'titular']);
  });

  it('también las que solo están en GitHub', async () => {
    const e = await armar();
    const remoto = join(e.dir, 'remoto.git');
    git(e.dir, 'init', '-q', '--bare', '-b', 'stl', remoto);
    e.enMemoria('proyecto.json', { nombre: 'Casa' });
    e.enMemoria('director/equipo/pedro.json', json({}));
    e.guardar('Estudio: pedro');
    git(e.memoria, 'remote', 'add', 'origin', remoto);
    git(e.memoria, 'push', '-q', 'origin', 'stl');
    // Pedro está en GitHub; aquí su archivo no está (otro computador)
    rmSync(join(e.memoria, 'director', 'equipo', 'pedro.json'));
    const ids = await personasConArchivo(e.estudio, ID, await leerProyectoDe(e.estudio, ID));
    expect(ids.sort()).toEqual(['pedro', 'titular']);
    // y su estado se lee de GitHub
    const pedro = await leerEstadoDePersona(e.estudio, ID, 'pedro', false);
    expect(pedro.notas).toEqual([]);
  }, 30_000);
});

describe('el estado del equipo', () => {
  it('une lo de cada persona (las notas de todas) y no trae «propio» sin quien lo lea', async () => {
    const e = await armar();
    e.enMemoria('director/equipo/titular.json', { notas: [nota('n1', 'titular', 'del titular')] });
    e.enMemoria('director/equipo/ana.json', { notas: [nota('n2', 'ana', 'de Ana')] });
    const r = await leerEstadoDelEquipo(e.estudio, ID, await leerProyectoDe(e.estudio, ID));
    expect(r.propio).toBeNull();
    expect(Object.keys(r.porPersona).sort()).toEqual(['ana', 'titular']);
    expect(r.estado.notas.map((x) => x.id).sort()).toEqual(['n1', 'n2']);
  });

  it('quien usa el Studio siempre tiene su estado, aunque aún no haya escrito su archivo', async () => {
    const e = await armar();
    const r = await leerEstadoDelEquipo(e.estudio, ID, await leerProyectoDe(e.estudio, ID), 'luis');
    expect(r.propio).not.toBeNull();
    expect(r.propio!.notas).toEqual([]);
    expect(r.propio!.retirados).toEqual({});
    expect(r.porPersona.luis).toBe(r.propio);
  });

  it('el archivo propio se lee de la carpeta, y el de otra persona, de donde esté más nuevo', async () => {
    const e = await armar();
    const remoto = join(e.dir, 'remoto.git');
    git(e.dir, 'init', '-q', '--bare', '-b', 'stl', remoto);
    e.enMemoria('director/equipo/ana.json', { notas: [nota('a1', 'ana', 'versión de aquí')] });
    e.enMemoria('director/equipo/luis.json', { notas: [nota('l1', 'luis', 'versión de aquí')] });
    e.guardar('Estudio: equipo');
    git(e.memoria, 'remote', 'add', 'origin', remoto);
    git(e.memoria, 'push', '-q', 'origin', 'stl');
    // Otro computador cambia a las dos y sube
    const otro = join(e.dir, 'otro');
    git(e.dir, 'clone', '-q', '-b', 'stl', remoto, otro);
    escribir(otro, 'director/equipo/ana.json', json({ notas: [nota('a2', 'ana', 'versión de GitHub')] }));
    escribir(otro, 'director/equipo/luis.json', json({ notas: [nota('l2', 'luis', 'versión de GitHub')] }));
    git(otro, 'add', '-A');
    git(otro, 'commit', '-q', '-m', 'del otro computador');
    git(otro, 'push', '-q', 'origin', 'stl');
    git(e.memoria, 'fetch', '-q', 'origin', 'stl');
    // Luis usa este Studio: su archivo es el de la carpeta; el de Ana, el más nuevo (el de GitHub)
    const r = await leerEstadoDelEquipo(e.estudio, ID, await leerProyectoDe(e.estudio, ID), 'luis');
    expect(r.porPersona.luis.notas.map((x) => x.id)).toEqual(['l1']);
    expect(r.porPersona.ana.notas.map((x) => x.id)).toEqual(['a2']);
    expect(r.propio!.notas.map((x) => x.id)).toEqual(['l1']);
    // Sin nadie que use el Studio (las herramientas del director), de las dos manda el más nuevo
    const herramienta = await leerEstadoDelEquipo(e.estudio, ID, await leerProyectoDe(e.estudio, ID));
    expect(herramienta.porPersona.luis.notas.map((x) => x.id)).toEqual(['l2']);
    expect(herramienta.porPersona.ana.notas.map((x) => x.id)).toEqual(['a2']);
  }, 60_000);

  it('un archivo de persona vacío: estado vacío en el Studio, error en las herramientas del director (así eran los dos lectores)', async () => {
    const e = await armar();
    e.enMemoria('director/equipo/titular.json', '');
    const proyecto = await leerProyectoDe(e.estudio, ID);
    const delStudio = await leerEstadoDelEquipo(e.estudio, ID, proyecto, 'titular');
    expect(delStudio.propio!.notas).toEqual([]);
    await expect(leerEstadoDelEquipo(e.estudio, ID, proyecto, null, { vacioEsError: true })).rejects.toThrow(SyntaxError);
    // Un archivo que no existe, en cambio, no es un error en ninguno de los dos
    rmSync(join(e.memoria, 'director', 'equipo', 'titular.json'));
    expect((await leerEstadoDelEquipo(e.estudio, ID, proyecto, null, { vacioEsError: true })).estado.notas).toEqual([]);
  });
});
