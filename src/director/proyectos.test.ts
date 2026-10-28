import { execFileSync, spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, unlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { proyectoVacio, validarPlan, validarProyecto, type Integrante } from './director';
import { abrirMemoria, cambiarCorreoDelEquipo, guardarPlanDeClaude, CANDADO_LOCAL, CANDADO_VIEJO_MS, correoValido, corteDeRevision, crearProyecto, directorTrabajando, elegirActivo, empezarSeguidas, encadenarRevision, enDisco, guardarActivo, guardarPermiso, guardarRutaRepositorio, idDeNombre, leerLocal, leerRutaRepositorio, marcarLanzada, marcarRevision, marcarUrgencia, memoriaDe, mismoCorreo, olvidarProyecto, pararSeguidas, pedirRevision, pedirUrgencia, proyectosLocales, reintentoDe, rutasDe, seguidasActivas, SUBE_SOLO, ubicar, urgenciaActiva } from './proyectos';

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
    // El permiso del director para seguir a ultracode: se da y se quita sin tocar lo demás
    await guardarPermiso(raiz, 'ultracode', true);
    expect((await leerLocal(raiz)).permisos).toEqual({ ultracode: true });
    expect((await leerLocal(raiz)).activo).toBe('tesis');
    await guardarPermiso(raiz, 'ultracode', false);
    expect((await leerLocal(raiz)).permisos).toBeUndefined();
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
  it('solo la pide una persona con un botón que la nombra, y queda dicho cuál (regla dura del 23 de octubre)', async () => {
    await expect(pedirRevision(raiz, 'rev', 'Laura')).rejects.toThrow(/solo una persona/);
    await expect(pedirRevision(raiz, 'rev', 'Laura', 'al_entregar' as never)).rejects.toThrow(/solo una persona/);
    await pedirRevision(raiz, 'rev', 'Laura', 'recomendada');
    expect((await leerLocal(raiz)).revision).toMatchObject({ quien: 'Laura', origen: 'recomendada' });
    // cancelarla no necesita botón de origen
    await pedirRevision(raiz, 'rev', null);
    expect((await leerLocal(raiz)).revision).toBeUndefined();
  });

  it('el Studio la lanza; si no termina, vuelve a quedar pedida con el porqué, y pedirla de nuevo lo limpia', async () => {
    await pedirRevision(raiz, 'rev', 'Laura', 'cabecera');
    await marcarLanzada(raiz, 'rev');
    expect((await leerLocal(raiz)).revision).toMatchObject({ proyecto: 'rev', quien: 'Laura', lanzada: expect.any(String) });
    await marcarRevision(raiz, 'rev', 'en_curso');
    expect((await leerLocal(raiz)).revision?.enCurso).toBeTruthy();
    await marcarLanzada(raiz, 'rev', 'Se cortó.');
    const r = (await leerLocal(raiz)).revision!;
    expect(r).toMatchObject({ proyecto: 'rev', quien: 'Laura', error: 'Se cortó.' });
    expect(r.lanzada ?? r.enCurso).toBeUndefined();
    await pedirRevision(raiz, 'rev', 'Laura', 'cabecera');
    expect((await leerLocal(raiz)).revision?.error).toBeUndefined();
  });

  it('guarda el reporte de qué pasó junto al error, y pedirla de nuevo lo limpia', async () => {
    const falla = { que: 'No arrancó', porque: 'Claude Code se cerró antes de empezar.', duracion: 0.1, gasto: null, ultimos: [], usoFlujos: null, negados: [], sugerencia: 'Pídela de nuevo.', accion: 'pedir' as const, cuando: '2026-10-21T20:00:00.000Z' };
    await pedirRevision(raiz, 'rev', 'Laura', 'cabecera');
    await marcarLanzada(raiz, 'rev');
    await marcarLanzada(raiz, 'rev', 'Se cortó.', falla);
    expect((await leerLocal(raiz)).revision).toMatchObject({ error: 'Se cortó.', falla });
    await pedirRevision(raiz, 'rev', 'Laura', 'cabecera');
    expect((await leerLocal(raiz)).revision?.falla).toBeUndefined();
  });

  it('pedida de nuevo después de una que no se cerró, retoma lo que esa dejó (reintento)', async () => {
    const falla = { que: 'Claude Code terminó sin cerrar la revisión', porque: '…', duracion: 9, gasto: null, ultimos: [], usoFlujos: null, negados: [], sugerencia: 'Pídela de nuevo.', accion: 'pedir' as const, cuando: '2026-10-21T21:21:07.000Z', registro: '.revisiones/rev-x.log' };
    // Desde una que cerró: la de la prueba anterior quedó pedida para retomar su falla, y una pedida de nuevo la retomaría
    await marcarRevision(raiz, 'rev', 'hecha');
    await pedirRevision(raiz, 'rev', 'Laura', 'cabecera');
    await marcarLanzada(raiz, 'rev');
    const lanzada = (await leerLocal(raiz)).revision!.lanzada!;
    await marcarLanzada(raiz, 'rev', 'No se cerró.', falla);
    // la fallida guarda cuándo se lanzó, sin `lanzada` (así la puede tomar la sesión del director)
    expect((await leerLocal(raiz)).revision).toMatchObject({ error: 'No se cerró.', fallida: lanzada });
    expect((await leerLocal(raiz)).revision?.lanzada).toBeUndefined();
    await pedirRevision(raiz, 'rev', 'Laura', 'cabecera');
    const r = (await leerLocal(raiz)).revision!;
    expect(r.error).toBeUndefined();
    expect(r.reintento).toEqual({ lanzada, que: 'Claude Code terminó sin cerrar la revisión', registro: '.revisiones/rev-x.log' });
    // si esta también falla, la siguiente retoma desde la primera
    await marcarLanzada(raiz, 'rev');
    await marcarLanzada(raiz, 'rev', 'Otra vez.');
    await pedirRevision(raiz, 'rev', 'Laura', 'cabecera');
    expect((await leerLocal(raiz)).revision?.reintento).toMatchObject({ lanzada, que: 'Otra vez.' });
    // una que cerró bien no deja reintento
    await marcarRevision(raiz, 'rev', 'hecha');
    await pedirRevision(raiz, 'rev', 'Laura', 'cabecera');
    expect((await leerLocal(raiz)).revision?.reintento).toBeUndefined();
    expect(reintentoDe({ proyecto: 'otro', quien: 'x', pedida: lanzada, error: 'no' }, 'rev')).toBeNull();
  });

  it('tu plan de Claude se guarda en este computador y se lee igual; uno que no existe, no (pd_costo_plan)', async () => {
    await guardarPlanDeClaude(raiz, 'max20');
    expect((await leerLocal(raiz)).planDeClaude).toBe('max20');
    await guardarPlanDeClaude(raiz, null);
    expect((await leerLocal(raiz)).planDeClaude).toBeUndefined();
    const archivo = join(raiz, 'estudio.local.json');
    writeFileSync(archivo, JSON.stringify({ ...JSON.parse(readFileSync(archivo, 'utf8')), planDeClaude: 'gratis' }));
    expect((await leerLocal(raiz)).planDeClaude).toBeUndefined();
  });

  it('la pista de la retoma sobrevive a «Cancelar»: la próxima que se pida la lleva, y una que cierra la borra (pr_retoma_automatica, punto 3)', async () => {
    await pedirRevision(raiz, 'ret', 'Laura', 'cabecera');
    await marcarLanzada(raiz, 'ret');
    const lanzada = (await leerLocal(raiz)).revision!.lanzada!;
    await marcarLanzada(raiz, 'ret', 'Se cortó.', { que: 'La revisión se cortó a los 60 minutos', porque: '…', duracion: 60, gasto: null, ultimos: [], usoFlujos: null, negados: [], sugerencia: 'Pídela de nuevo.', accion: 'pedir', cuando: lanzada, registro: '.revisiones/ret-x.log' });
    // Cancelada la que no se cerró, su pista queda aparte
    await pedirRevision(raiz, 'ret', null);
    expect((await leerLocal(raiz)).revision).toBeUndefined();
    expect((await leerLocal(raiz)).retoma).toEqual({ proyecto: 'ret', lanzada, que: 'La revisión se cortó a los 60 minutos', registro: '.revisiones/ret-x.log' });
    // La de otro proyecto no la toma
    await pedirRevision(raiz, 'otro', 'Laura', 'cabecera');
    expect((await leerLocal(raiz)).revision?.reintento).toBeUndefined();
    expect((await leerLocal(raiz)).retoma?.proyecto).toBe('ret');
    await pedirRevision(raiz, 'otro', null);
    // La próxima de ese proyecto la lleva, y la pista se usa una vez
    await pedirRevision(raiz, 'ret', 'Laura', 'cabecera');
    expect((await leerLocal(raiz)).revision?.reintento).toEqual({ lanzada, que: 'La revisión se cortó a los 60 minutos', registro: '.revisiones/ret-x.log' });
    expect((await leerLocal(raiz)).retoma).toBeUndefined();
    // Cancelada otra vez, vuelve a quedar; cerrada una revisión del proyecto, ya no hay nada que retomar
    await pedirRevision(raiz, 'ret', null);
    expect((await leerLocal(raiz)).retoma?.lanzada).toBe(lanzada);
    await pedirRevision(raiz, 'ret', 'Laura', 'cabecera');
    await marcarRevision(raiz, 'ret', 'hecha');
    await pedirRevision(raiz, 'ret', null);
    expect((await leerLocal(raiz)).retoma).toBeUndefined();
  });

  it('estudio.local.json se escribe de una vez y no se lee vacío por un instante', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'estudio-local-'));
    try {
      await guardarRutaRepositorio(dir, 'golf', '/repos/golf');
      // sin archivos temporales sueltos
      expect(readdirSync(dir)).toEqual(['estudio.local.json']);
      // a medio escribir (otro proceso lo está escribiendo): se relee en vez de darlo por vacío
      const bien = readFileSync(join(dir, 'estudio.local.json'), 'utf-8');
      writeFileSync(join(dir, 'estudio.local.json'), bien.slice(0, 20));
      setTimeout(() => writeFileSync(join(dir, 'estudio.local.json'), bien), 20);
      expect((await leerLocal(dir)).repositorios).toEqual({ golf: '/repos/golf' });
      // un reintento mal formado sale al leerlo
      writeFileSync(join(dir, 'estudio.local.json'), JSON.stringify({ activo: null, repositorios: {}, revision: { proyecto: 'golf', quien: 'x', pedida: 'p', reintento: { que: 1 } } }));
      expect((await leerLocal(dir)).revision).toEqual({ proyecto: 'golf', quien: 'x', pedida: 'p' });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('los cambios que se cruzan no se pierden: cada uno parte de lo que dejó el anterior (el candado)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'estudio-local-'));
    try {
      await pedirRevision(dir, 'golf', 'Laura', 'cabecera');
      // treinta cambios a la vez en este proceso, y el cierre de la revisión en medio: antes, cada uno leía antes de que
      // el otro guardara, y el último borraba lo de los demás (también la «hecha»)
      await Promise.all([
        ...Array.from({ length: 30 }, (_, i) => guardarRutaRepositorio(dir, `p${i}`, `/repos/p${i}`)),
        marcarRevision(dir, 'golf', 'hecha'),
        guardarActivo(dir, 'p3'),
      ]);
      const l = await leerLocal(dir);
      expect(Object.keys(l.repositorios)).toHaveLength(30);
      expect(l.revision?.hecha).toBeTruthy();
      expect(l.activo).toBe('p3');
      // y desde otros dos procesos a la vez, como el servidor del Studio y la bandeja
      const modulo = pathToFileURL(join(__dirname, 'proyectos.ts')).href;
      const otro = (n: string) => new Promise<number | null>((listo) => {
        const codigo = `const m = await import(${JSON.stringify(modulo)}); await Promise.all(Array.from({ length: 15 }, (_, i) => m.guardarRutaRepositorio(${JSON.stringify(dir)}, '${n}' + i, '/repos/${n}' + i)));`;
        spawn(process.execPath, ['--input-type=module', '--no-warnings', '-e', codigo], { stdio: 'ignore' }).on('exit', listo);
      });
      const [a, b] = await Promise.all([otro('a'), otro('b'), ...Array.from({ length: 15 }, (_, i) => guardarRutaRepositorio(dir, `c${i}`, `/repos/c${i}`))]);
      expect([a, b]).toEqual([0, 0]);
      const todos = (await leerLocal(dir)).repositorios;
      expect(Object.keys(todos)).toHaveLength(75);
      expect(todos).toMatchObject({ a14: '/repos/a14', b0: '/repos/b0', c7: '/repos/c7', p29: '/repos/p29' });
      // el candado se suelta: no queda nada suelto
      expect(readdirSync(dir)).toEqual(['estudio.local.json']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it('mientras otro tiene el candado se espera; uno abandonado se quita; y nunca se guarda encima de lo que no se entiende', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'estudio-local-'));
    const candado = join(dir, CANDADO_LOCAL);
    try {
      await guardarActivo(dir, 'antes');
      // otro proceso lo tiene: el cambio espera a que lo suelte
      writeFileSync(candado, 'otro');
      let mientras: string | null = 'sin mirar';
      setTimeout(() => {
        mientras = JSON.parse(readFileSync(join(dir, 'estudio.local.json'), 'utf-8')).activo;
        unlinkSync(candado);
      }, 150);
      await guardarActivo(dir, 'despues');
      expect(mientras).toBe('antes');
      expect((await leerLocal(dir)).activo).toBe('despues');
      // uno abandonado (su proceso murió a mitad de un cambio) se quita
      writeFileSync(candado, 'muerto');
      const viejo = new Date(Date.now() - CANDADO_VIEJO_MS - 5000);
      utimesSync(candado, viejo, viejo);
      await guardarActivo(dir, 'otra');
      expect((await leerLocal(dir)).activo).toBe('otra');
      expect(existsSync(candado)).toBe(false);
      // un archivo que no se entiende no se pisa: partir de vacío borraría la lista de proyectos
      writeFileSync(join(dir, 'estudio.local.json'), '{"activo": "golf", "repositorios": {"golf": "/r');
      await expect(guardarRutaRepositorio(dir, 'x', '/repos/x')).rejects.toThrow(/no se entiende/);
      expect(readFileSync(join(dir, 'estudio.local.json'), 'utf-8')).toBe('{"activo": "golf", "repositorios": {"golf": "/r');
      expect(existsSync(candado)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('una revisión ya hecha no se vuelve a lanzar ni a marcar', async () => {
    await pedirRevision(raiz, 'rev', 'Laura', 'cabecera');
    await marcarRevision(raiz, 'rev', 'hecha');
    await marcarLanzada(raiz, 'rev');
    expect((await leerLocal(raiz)).revision?.lanzada).toBeUndefined();
  });

  it('la cadena de «Pedir revisiones seguidas» sigue guardada mientras su revisión se lanza, empieza y cierra', async () => {
    // Así se perdía el 27 de octubre: el Studio la guardaba y, al marcar lanzada la primera revisión, la borraba
    await pedirRevision(raiz, 'rev', 'Laura', 'seguidas');
    await empezarSeguidas(raiz, 'rev', 'Laura');
    await marcarLanzada(raiz, 'rev');
    await marcarRevision(raiz, 'rev', 'en_curso');
    await marcarRevision(raiz, 'rev', 'hecha');
    expect(seguidasActivas((await leerLocal(raiz)).seguidas, 'rev')).toBe(true);
    expect(await encadenarRevision(raiz, 'rev', 120)).toMatchObject({ proyecto: 'rev', quien: 'Laura', origen: 'seguidas', limite: 120 });
    expect((await leerLocal(raiz)).seguidas).toMatchObject({ proyecto: 'rev', quien: 'Laura', hechas: 1 });
    await pararSeguidas(raiz, 'rev', 'la detuvo Laura');
    expect((await leerLocal(raiz)).seguidas?.paro?.porque).toBe('la detuvo Laura');
    await pedirRevision(raiz, 'rev', null);
    // una cadena mal formada sale al leerla; un paro mal formado, solo él
    const dir = mkdtempSync(join(tmpdir(), 'estudio-local-'));
    try {
      const cadena = { proyecto: 'golf', quien: 'x', desde: '2026-10-27T17:00:00.000Z', hechas: 0 };
      writeFileSync(join(dir, 'estudio.local.json'), JSON.stringify({ activo: null, repositorios: {}, seguidas: { proyecto: 'golf' } }));
      expect((await leerLocal(dir)).seguidas).toBeUndefined();
      writeFileSync(join(dir, 'estudio.local.json'), JSON.stringify({ activo: null, repositorios: {}, seguidas: { ...cadena, paro: { cuando: 1 } } }));
      expect((await leerLocal(dir)).seguidas).toEqual(cadena);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
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

// El Estudio reconoce a cada persona por su correo de git (sincronizar.ts › leerIdentidad): al cambiarlo, el equipo de cada
// proyecto tiene que cambiar con él (tools/cambiar-correo.ts). Esto es lo puro; la herramienta se prueba en su archivo.
describe('el correo de git de quien usa el Estudio', () => {
  const equipo: Integrante[] = [
    { id: 'titular', nombre: 'Ana', correo: ' Ana@Viejo.co ', cargo: 'Directora de proyecto', papel: 'Dirige el proyecto' },
    { id: 'beto', nombre: 'Beto', correo: 'beto@ejemplo.co' },
    { id: 'carla', nombre: 'Carla', correo: 'carla@ejemplo.co', cargo: 'Diseño' },
  ];

  it('cambia el correo de quien tenía el viejo (sin distinguir mayúsculas ni espacios) y deja todo lo demás igual', () => {
    const r = cambiarCorreoDelEquipo(equipo, 'ana@viejo.co', 'ana@nuevo.co');
    expect(r.cambiados).toBe(1);
    expect(r.equipo).toEqual([{ ...equipo[0], correo: 'ana@nuevo.co' }, equipo[1], equipo[2]]);
    // Su id, su cargo y su papel siguen siendo los de ella, y el equipo que queda es válido para el Estudio
    expect(r.equipo[0]).toMatchObject({ id: 'titular', nombre: 'Ana', cargo: 'Directora de proyecto', papel: 'Dirige el proyecto' });
    expect(validarProyecto({ ...proyectoVacio(), equipo: r.equipo })).toEqual([]);
    // Con otras mayúsculas y espacios del viejo, igual
    expect(cambiarCorreoDelEquipo(equipo, '  ANA@VIEJO.CO', 'ana@nuevo.co').cambiados).toBe(1);
  });

  it('no toca el equipo que recibe: devuelve uno nuevo', () => {
    const copia = structuredClone(equipo);
    const r = cambiarCorreoDelEquipo(equipo, 'ana@viejo.co', 'ana@nuevo.co');
    expect(equipo).toEqual(copia);
    expect(r.equipo).not.toBe(equipo);
    expect(r.equipo[1]).toBe(equipo[1]);
  });

  it('cambia a todos los que lo tengan (un correo repetido a mano) y dice cuántos fueron', () => {
    const repetido: Integrante[] = [...equipo, { id: 'ana-2', nombre: 'Ana otra vez', correo: 'ANA@viejo.co' }];
    const r = cambiarCorreoDelEquipo(repetido, 'ana@viejo.co', ' ana@nuevo.co ');
    expect(r.cambiados).toBe(2);
    expect(r.equipo.map((i) => i.correo)).toEqual(['ana@nuevo.co', 'beto@ejemplo.co', 'carla@ejemplo.co', 'ana@nuevo.co']);
  });

  it('si nadie tiene el viejo, o no hay nada que cambiar, no cambia a nadie', () => {
    expect(cambiarCorreoDelEquipo(equipo, 'otra@ejemplo.co', 'ana@nuevo.co')).toEqual({ equipo, cambiados: 0 });
    expect(cambiarCorreoDelEquipo([], 'ana@viejo.co', 'ana@nuevo.co')).toEqual({ equipo: [], cambiados: 0 });
    // Un viejo vacío no es el correo de nadie, aunque alguien lo tenga vacío; un nuevo vacío no borra el de nadie
    const sinCorreo: Integrante[] = [{ id: 'titular', nombre: 'Ana', correo: '' }];
    expect(cambiarCorreoDelEquipo(sinCorreo, '', 'ana@nuevo.co')).toEqual({ equipo: sinCorreo, cambiados: 0 });
    expect(cambiarCorreoDelEquipo(equipo, 'ana@viejo.co', '  ')).toEqual({ equipo, cambiados: 0 });
    // El mismo correo con otras mayúsculas no es un cambio
    expect(cambiarCorreoDelEquipo(equipo, 'ana@viejo.co', 'Ana@Viejo.co')).toEqual({ equipo, cambiados: 0 });
  });

  it('un correo es válido si es algo@algo.algo, sin espacios', () => {
    for (const bueno of ['ana@ejemplo.co', 'a@b.c', 'ana.perez+stl@mail.ejemplo.co', "o'brien@ejemplo.org", 'ANA@Ejemplo.CO']) expect(correoValido(bueno), bueno).toBe(true);
    for (const malo of ['', 'ana', 'ana@ejemplo', 'ana@', '@ejemplo.co', 'ana@.co', 'ana@ejemplo.', 'ana@ejemplo..co', 'ana@@ejemplo.co', 'ana@b@ejemplo.co',
      'ana perez@ejemplo.co', 'ana@ejemplo .co', ' ana@ejemplo.co', 'ana@ejemplo.co ', 'ana@ejemplo.co\n', 'ana@ejemplo.co"; rm', 'a$b@ejemplo.co', '<ana@ejemplo.co>']) {
      expect(correoValido(malo), JSON.stringify(malo)).toBe(false);
    }
  });

  it('dos correos son el mismo sin distinguir mayúsculas ni espacios; uno vacío no es de nadie', () => {
    expect(mismoCorreo(' Ana@Viejo.co ', 'ana@viejo.co')).toBe(true);
    expect(mismoCorreo('ana@viejo.co', 'ana@nuevo.co')).toBe(false);
    expect(mismoCorreo('', '')).toBe(false);
    expect(mismoCorreo(undefined, undefined)).toBe(false);
    expect(mismoCorreo('ana@viejo.co', null)).toBe(false);
  });
});
