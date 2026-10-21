import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { validarPlan, validarProyecto } from './director';
import { abrirMemoria, corteDeRevision, crearProyecto, directorTrabajando, elegirActivo, enDisco, guardarActivo, guardarRutaRepositorio, idDeNombre, leerLocal, leerRutaRepositorio, marcarLanzada, marcarRevision, marcarUrgencia, memoriaDe, olvidarProyecto, pedirRevision, pedirUrgencia, proyectosLocales, rutasDe, SUBE_SOLO, ubicar, urgenciaActiva } from './proyectos';

const raiz = mkdtempSync(join(tmpdir(), 'estudio-proyectos-'));
cpSync(join(__dirname, '..', '..', 'plantilla'), join(raiz, 'plantilla'), { recursive: true });
afterAll(() => rmSync(raiz, { recursive: true, force: true }));

const titular = { nombre: 'Laura', correo: 'laura@ejemplo.co' };
const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 'Prueba', GIT_AUTHOR_EMAIL: 'p@e.co', GIT_COMMITTER_NAME: 'Prueba', GIT_COMMITTER_EMAIL: 'p@e.co' } }).trim();

describe('el director trabajando (el Studio no se recarga a pedazos mientras tanto)', () => {
  it('una revisión en curso o lanzada, o una aclaración o urgencia lanzadas, sin cerrar ni fallar', () => {
    const base = { activo: 'x', repositorios: {} };
    const r = { proyecto: 'x', quien: 'titular', pedida: '2026-10-20T10:00:00Z' };
    expect(directorTrabajando(base)).toBe(false);
    expect(directorTrabajando({ ...base, revision: r })).toBe(false);
    expect(directorTrabajando({ ...base, revision: { ...r, lanzada: 'a' } })).toBe(true);
    expect(directorTrabajando({ ...base, revision: { ...r, enCurso: 'a' } })).toBe(true);
    expect(directorTrabajando({ ...base, revision: { ...r, enCurso: 'a', hecha: 'b' } })).toBe(false);
    expect(directorTrabajando({ ...base, revision: { ...r, lanzada: 'a', error: 'no' } })).toBe(false);
    expect(directorTrabajando({ ...base, aclaracion: { ...r, mision: 'm', paso: 0, nota: 'n', lanzada: 'a' } })).toBe(true);
    expect(directorTrabajando({ ...base, aclaracion: { ...r, mision: 'm', paso: 0, nota: 'n' } })).toBe(false);
    expect(directorTrabajando({ ...base, urgencia: { ...r, notas: ['n'], lanzada: 'a' } })).toBe(true);
    expect(directorTrabajando({ ...base, urgencia: { ...r, notas: ['n'], lanzada: 'a', hecha: 'b' } })).toBe(false);
  });
});

describe('el corte de la revisión (lo que llega después espera la siguiente)', () => {
  it('desde que el Studio lanzó al director o, si no, desde que empezó; solo para ese proyecto y mientras no termine', () => {
    const base = { activo: 'x', repositorios: {} };
    const r = { proyecto: 'x', quien: 'titular', pedida: '2026-10-20T10:00:00Z' };
    expect(corteDeRevision(base, 'x')).toBe(null);
    expect(corteDeRevision({ ...base, revision: r }, 'x')).toBe(null);
    expect(corteDeRevision({ ...base, revision: { ...r, lanzada: '2026-10-20T10:00:05Z', enCurso: '2026-10-20T10:00:40Z' } }, 'x')).toBe('2026-10-20T10:00:05Z');
    expect(corteDeRevision({ ...base, revision: { ...r, enCurso: '2026-10-20T10:01:00Z' } }, 'x')).toBe('2026-10-20T10:01:00Z');
    expect(corteDeRevision({ ...base, revision: { ...r, lanzada: 'a' } }, 'otro')).toBe(null);
    expect(corteDeRevision({ ...base, revision: { ...r, lanzada: 'a', hecha: 'b' } }, 'x')).toBe(null);
    expect(corteDeRevision({ ...base, revision: { ...r, lanzada: 'a', error: 'no' } }, 'x')).toBe(null);
  });
});

/** Un repositorio de proyecto con un commit de código, como los de verdad. */
function repo(nombre: string): string {
  const dir = join(raiz, 'repos', nombre);
  mkdirSync(dir, { recursive: true });
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'commit', '-q', '--allow-empty', '-m', 'código');
  return dir;
}

/** Entrega un proyecto como lo hace el Studio: su repositorio en este computador, su memoria abierta y su plantilla. */
async function entregar(id: string, datos: Omit<Parameters<typeof crearProyecto>[1], 'id' | 'titular' | 'url'>) {
  const dir = repo(id);
  await abrirMemoria(dir);
  await guardarRutaRepositorio(raiz, id, dir);
  return { dir, archivos: await crearProyecto(raiz, { id, url: '', titular, ...datos }) };
}

describe('la memoria de cada proyecto, en su repositorio', () => {
  it('abre la memoria en .stl, en una rama aparte sin historia común, y la excluye solo en este computador', async () => {
    const dir = repo('memoria');
    expect(await abrirMemoria(dir)).toEqual({ yaTenia: false });
    expect(git(join(dir, '.stl'), 'symbolic-ref', '--short', 'HEAD')).toBe('stl');
    expect(git(dir, 'rev-parse', '--abbrev-ref', 'HEAD')).toBe('main');
    expect(readFileSync(join(dir, '.git', 'info', 'exclude'), 'utf-8')).toContain('/.stl/');
    expect(git(dir, 'status', '--porcelain')).toBe('');
    // Abrirla otra vez no hace nada nuevo
    expect(await abrirMemoria(dir)).toEqual({ yaTenia: false });
  });

  it('un proyecto existente nace de la plantilla en su memoria, con quien lo entrega como titular', async () => {
    const { dir, archivos } = await entregar('api-pedidos', { nombre: 'API de pedidos', contexto: 'Una API', metaInicial: 'Cobrar en línea' });
    expect(archivos).toEqual(['proyectos/api-pedidos/proyecto.json', 'proyectos/api-pedidos/director/plan.json', 'proyectos/api-pedidos/README.md']);
    const p = JSON.parse(readFileSync(join(dir, '.stl', 'proyecto.json'), 'utf-8'));
    expect(p).toMatchObject({ nombre: 'API de pedidos', metaInicial: 'Cobrar en línea', objetivo: null, equipo: [{ id: 'titular', correo: 'laura@ejemplo.co' }] });
    expect(validarProyecto(p)).toEqual([]);
    expect(validarPlan(JSON.parse(readFileSync(join(dir, '.stl', 'director', 'plan.json'), 'utf-8')), ['titular'])).toEqual([]);
    // Nada queda en el Estudio
    expect(existsSync(join(raiz, 'proyectos'))).toBe(false);
    await expect(crearProyecto(raiz, { id: 'api-pedidos', nombre: 'Otro', contexto: '', metaInicial: '', url: '', titular })).rejects.toThrow(/ya tiene su memoria/);
  });

  it('un proyecto nuevo nace de su propia plantilla, con lo que contó el titular', async () => {
    const { dir } = await entregar('app-citas', { nombre: 'App de citas', tipo: 'nuevo', contexto: 'Citas para talleres', metaInicial: 'Cobrar', terminado: '20 talleres pagando' });
    const p = JSON.parse(readFileSync(join(dir, '.stl', 'proyecto.json'), 'utf-8'));
    const plan = JSON.parse(readFileSync(join(dir, '.stl', 'director', 'plan.json'), 'utf-8'));
    expect(p).toMatchObject({ tipo: 'nuevo', terminado: '20 talleres pagando' });
    expect(plan.fases[0].nombre).toBe('Planteamiento y meta');
    expect(plan.misiones.map((m: { id: string }) => m.id)).toEqual(['t_contar']);
    expect(validarPlan(plan, ['titular'])).toEqual([]);
  });

  it('las rutas del Estudio llevan a la memoria de cada proyecto', async () => {
    const mem = memoriaDe(raiz, 'api-pedidos')!;
    expect(mem).toBe(join(raiz, 'repos', 'api-pedidos', '.stl'));
    expect(ubicar(raiz, rutasDe('api-pedidos').plan)).toEqual({ cwd: mem, ruta: 'director/plan.json', memoria: true });
    expect(enDisco(raiz, rutasDe('api-pedidos').persona('titular'))).toBe(join(mem, 'director', 'equipo', 'titular.json'));
    // Lo del Estudio sigue en el Estudio, y un proyecto que no está aquí no lleva a ninguna memoria
    expect(ubicar(raiz, 'docs/metodo/metodologia.md')).toEqual({ cwd: raiz, ruta: 'docs/metodo/metodologia.md', memoria: false });
    expect(ubicar(raiz, 'proyectos/otro/proyecto.json').memoria).toBe(false);
  });

  it('retoma la memoria que el proyecto ya tenía (otro computador, o al volver a entregarlo)', async () => {
    const dir = memoriaDe(raiz, 'api-pedidos')!.replace(/[\\/]\.stl$/, '');
    git(join(dir, '.stl'), 'add', '-A');
    git(join(dir, '.stl'), 'commit', '-q', '-m', 'memoria');
    git(dir, 'worktree', 'remove', '.stl');
    expect(existsSync(join(dir, '.stl'))).toBe(false);
    expect(await abrirMemoria(dir)).toEqual({ yaTenia: true });
    expect(JSON.parse(readFileSync(join(dir, '.stl', 'proyecto.json'), 'utf-8')).nombre).toBe('API de pedidos');
  });

  it('lista los proyectos de este Estudio y elige el activo', async () => {
    await entregar('tesis', { nombre: 'Tesis', contexto: '', metaInicial: '' });
    const ids = await proyectosLocales(raiz);
    expect(ids).toEqual(['api-pedidos', 'app-citas', 'tesis']);
    expect(elegirActivo(await leerLocal(raiz), ids)).toBe('api-pedidos');
    await guardarActivo(raiz, 'tesis');
    expect(elegirActivo(await leerLocal(raiz), ids)).toBe('tesis');
    expect(await leerRutaRepositorio(raiz, 'tesis')).toBe(join(raiz, 'repos', 'tesis'));
    // Un activo que ya no existe cae al primero
    expect(elegirActivo({ activo: 'borrado', repositorios: {} }, ids)).toBe('api-pedidos');
    // Sacarlo del Estudio no toca su memoria
    await olvidarProyecto(raiz, 'tesis');
    expect(await proyectosLocales(raiz)).toEqual(['api-pedidos', 'app-citas']);
    expect(existsSync(join(raiz, 'repos', 'tesis', '.stl', 'proyecto.json'))).toBe(true);
  });

  it('da ids legibles y únicos', () => {
    expect(idDeNombre('Tienda de Bicicletas', [])).toBe('tienda-de-bicicletas');
    expect(idDeNombre('Tesis', ['tesis'])).toBe('tesis-2');
    expect(idDeNombre('Ñandú Básico', [])).toBe('nandu-basico');
    expect(idDeNombre('***', [])).toBe('proyecto');
  });

  it('solo sube solo lo que escribe el Estudio en cada memoria', () => {
    expect(SUBE_SOLO.test('director/equipo/titular.json')).toBe(true);
    expect(SUBE_SOLO.test('director/notas/n1.webm')).toBe(true);
    expect(SUBE_SOLO.test('proyecto.json')).toBe(true);
    expect(SUBE_SOLO.test('director/plan.json')).toBe(false);
    expect(SUBE_SOLO.test('docs/director/ruta.md')).toBe(false);
  });
});

describe('la revisión pedida desde el Studio', () => {
  it('el Studio la lanza; si no termina, vuelve a quedar pedida con el porqué, y pedirla de nuevo lo limpia', async () => {
    await pedirRevision(raiz, 'rev', 'Laura');
    await marcarLanzada(raiz, 'rev');
    expect((await leerLocal(raiz)).revision).toMatchObject({ proyecto: 'rev', quien: 'Laura', lanzada: expect.any(String) });
    await marcarRevision(raiz, 'rev', 'en_curso');
    expect((await leerLocal(raiz)).revision?.enCurso).toBeTruthy();
    await marcarLanzada(raiz, 'rev', 'Se cortó.');
    const r = (await leerLocal(raiz)).revision!;
    expect(r).toMatchObject({ proyecto: 'rev', quien: 'Laura', error: 'Se cortó.' });
    expect(r.lanzada ?? r.enCurso).toBeUndefined();
    await pedirRevision(raiz, 'rev', 'Laura');
    expect((await leerLocal(raiz)).revision?.error).toBeUndefined();
  });

  it('una revisión ya hecha no se vuelve a lanzar ni a marcar', async () => {
    await pedirRevision(raiz, 'rev', 'Laura');
    await marcarRevision(raiz, 'rev', 'hecha');
    await marcarLanzada(raiz, 'rev');
    expect((await leerLocal(raiz)).revision?.lanzada).toBeUndefined();
  });
});

describe('lo urgente, solo y al instante', () => {
  it('se suma a la pedida; con el director ya atendiendo, espera y se lanza al terminar', async () => {
    const u1 = (await pedirUrgencia(raiz, { proyecto: 'urg', notas: ['n1'], quien: 'Laura' }))!;
    await pedirUrgencia(raiz, { proyecto: 'urg', notas: ['n1', 'n2'], quien: 'Laura' });
    expect((await leerLocal(raiz)).urgencia?.notas).toEqual(['n1', 'n2']);
    await marcarUrgencia(raiz, u1.pedida, 'lanzada');
    await pedirUrgencia(raiz, { proyecto: 'urg', notas: ['n1', 'n2', 'n3'], quien: 'Laura' });
    expect((await leerLocal(raiz)).urgencia).toMatchObject({ notas: ['n1', 'n2'], luego: ['n3'], lanzada: expect.any(String) });
    // Otro proyecto no se mete en la que está en curso
    expect(await pedirUrgencia(raiz, { proyecto: 'otro', notas: ['x'], quien: 'Laura' })).toBeNull();
    await marcarUrgencia(raiz, u1.pedida, 'hecha');
    const u2 = (await leerLocal(raiz)).urgencia!;
    expect(u2).toMatchObject({ proyecto: 'urg', notas: ['n3'] });
    expect(u2.lanzada ?? u2.hecha ?? u2.luego).toBeUndefined();
    expect(urgenciaActiva(u2)).toBe(true);
    // Lo que ya no es la de ahora no la cambia
    await marcarUrgencia(raiz, u1.pedida, { error: 'vieja' });
    expect((await leerLocal(raiz)).urgencia?.error).toBeUndefined();
    await marcarUrgencia(raiz, u2.pedida, { error: 'Se cortó.' });
    expect(urgenciaActiva((await leerLocal(raiz)).urgencia)).toBe(false);
  });
});
