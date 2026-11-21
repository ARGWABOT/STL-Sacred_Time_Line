import { execFileSync, spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, unlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { proyectoVacio, validarPlan, validarProyecto, type Integrante } from './director';
import { abrirMemoria, esRegistroDe, lineasDeSTL, localSinElProyecto, puedeSubir, queSeBorra, quitarProyecto, sinExclusionDeSTL, sinLineasDeSTL, guardarCuentaGit, guardarAyudaVista, guardarTodoConElModelo,prorrogarRevision, retomarAparte, pedirAclaracion, marcarAclaracion, huellaDelPlan, guardarHuella, planCambiadoTrasCierre, cambiarCorreoDelEquipo, guardarPlanDeClaude, CANDADO_LOCAL, CANDADO_VIEJO_MS, correoValido, corteDeRevision, crearProyecto, directorTrabajando, revisionDe, revisionesNormales, revisionesDeOtros, revisionCorriendo, proyectosRevisando, elegirActivo, enDisco, guardarActivo, guardarPermiso, cambiarSkillsAutorizadas, guardarRutaRepositorio, idDeNombre, leerLocal, leerRutaRepositorio, marcarLanzada, marcarRevision, marcarUrgencia, memoriaDe, MISION_PEDIR_DIAGNOSTICO, MISION_PEDIR_PLANTEAMIENTO, mismoCorreo, pedirRevision, pedirUrgencia, proyectosLocales, reintentoDe, rutasDe, SUBE_SOLO, ubicar, urgenciaActiva } from './proyectos';

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
    expect(directorTrabajando({ ...base, revisiones: { x: r } })).toBe(false);
    expect(directorTrabajando({ ...base, revisiones: { x: { ...r, lanzada: 'a' } } })).toBe(true);
    expect(directorTrabajando({ ...base, revisiones: { x: { ...r, enCurso: 'a' } } })).toBe(true);
    expect(directorTrabajando({ ...base, revisiones: { x: { ...r, enCurso: 'a', hecha: 'b' } } })).toBe(false);
    expect(directorTrabajando({ ...base, revisiones: { x: { ...r, lanzada: 'a', error: 'no' } } })).toBe(false);
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
    expect(corteDeRevision({ ...base, revisiones: { x: r } }, 'x')).toBe(null);
    expect(corteDeRevision({ ...base, revisiones: { x: { ...r, lanzada: '2026-10-20T10:00:05Z', enCurso: '2026-10-20T10:00:40Z' } } }, 'x')).toBe('2026-10-20T10:00:05Z');
    expect(corteDeRevision({ ...base, revisiones: { x: { ...r, enCurso: '2026-10-20T10:01:00Z' } } }, 'x')).toBe('2026-10-20T10:01:00Z');
    expect(corteDeRevision({ ...base, revisiones: { x: { ...r, lanzada: 'a' } } }, 'otro')).toBe(null);
    expect(corteDeRevision({ ...base, revisiones: { x: { ...r, lanzada: 'a', hecha: 'b' } } }, 'x')).toBe(null);
    expect(corteDeRevision({ ...base, revisiones: { x: { ...r, lanzada: 'a', error: 'no' } } }, 'x')).toBe(null);
  });

  it('cuándo la pidió una persona con su botón, para saber si fue antes de entregar sus misiones (regla dura nmwk2x3kftit)', async () => {
    const { pedidaPorPersona } = await import('./proyectos');
    const base = { activo: 'x', repositorios: {} };
    const r = { proyecto: 'x', quien: 'titular', pedida: '2026-10-20T10:00:00Z', lanzada: '2026-10-20T10:00:05Z' };
    expect(pedidaPorPersona(base, 'x')).toBe(null);
    // Sin su botón (una revisión empezada a mano), no cuenta; con él, la hora en que la pidió
    expect(pedidaPorPersona({ ...base, revisiones: { x: r } }, 'x')).toBe(null);
    expect(pedidaPorPersona({ ...base, revisiones: { x: { ...r, origen: 'mision' as never } } }, 'x')).toBe('2026-10-20T10:00:00Z');
    expect(pedidaPorPersona({ ...base, revisiones: { x: { ...r, origen: 'mision' as never, hecha: 'b' } } }, 'x')).toBe(null);
    expect(pedidaPorPersona({ ...base, revisiones: { x: { ...r, origen: 'mision' as never } } }, 'otro')).toBe(null);
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

});

describe('«Quitarlo de este Studio» (pd_quitar_en_pantalla): toda su memoria se borra, sin archivo', () => {
  const sesionBien = () => ({ ok: true as const, login: 'laura-gh', token: 't' });

  /** Un Studio aparte, con un proyecto entregado, su memoria con un commit, su línea en CLAUDE.md y sus registros. */
  async function estudioConProyecto(nombre: string, conRemoto = false) {
    const estudio = mkdtempSync(join(tmpdir(), `estudio-quitar-${nombre}-`));
    cpSync(join(__dirname, '..', '..', 'plantilla'), join(estudio, 'plantilla'), { recursive: true });
    const dir = join(estudio, 'repos', nombre);
    mkdirSync(dir, { recursive: true });
    git(dir, 'init', '-q', '-b', 'main');
    // La identidad de git de su carpeta, como la de un repositorio de verdad: con ella se firma el commit local
    git(dir, 'config', 'user.name', 'Laura');
    git(dir, 'config', 'user.email', 'laura@ejemplo.co');
    writeFileSync(join(dir, 'app.txt'), 'el código\n');
    writeFileSync(join(dir, 'CLAUDE.md'), '# Reglas\n\nUsa pruebas.\nAntes de cada tarea: node C:/STL/tools/director/estado.ts --proyecto x (su memoria en `.stl/`).\nNo subas sin permiso.\n');
    git(dir, 'add', '.');
    git(dir, 'commit', '-q', '-m', 'código');
    git(dir, 'branch', 'otra');
    let bare = '';
    if (conRemoto) {
      bare = join(estudio, 'remoto.git');
      git(estudio, 'init', '-q', '--bare', bare);
      // Su remoto dice GitHub, como uno de verdad, y git lo lleva al de prueba
      git(dir, 'remote', 'add', 'origin', 'https://github.com/laura-gh/app.git');
      git(dir, 'config', `url.${bare.replace(/\\/g, '/')}.insteadOf`, 'https://github.com/laura-gh/app.git');
    }
    await abrirMemoria(dir);
    await guardarRutaRepositorio(estudio, nombre, dir);
    await crearProyecto(estudio, { id: nombre, url: '', titular, nombre, contexto: 'c', metaInicial: 'm' });
    git(join(dir, '.stl'), 'add', '.');
    git(join(dir, '.stl'), 'commit', '-q', '-m', 'memoria');
    if (conRemoto) git(join(dir, '.stl'), 'push', '-q', 'origin', 'stl');
    // Otro proyecto que sigue, y sus registros, que no se tocan
    await guardarRutaRepositorio(estudio, 'otro', join(estudio, 'repos', 'otro'));
    mkdirSync(join(estudio, '.revisiones'), { recursive: true });
    for (const n of [`${nombre}-2026-11-10T10-00-00-000Z.log`, `${nombre}-urgencia-2026-11-10T11-00-00-000Z.log`, `${nombre}-2026-11-10T10-00-00-000Z.encargos.json`, `${nombre}-club-2026-11-10T10-00-00-000Z.log`, 'otro-2026-11-10T10-00-00-000Z.log'])
      writeFileSync(join(estudio, '.revisiones', n), '{}\n');
    mkdirSync(join(estudio, '.estudio', 'lectura', nombre), { recursive: true });
    writeFileSync(join(estudio, '.estudio', 'lectura', nombre, 'titular.json'), '{}');
    writeFileSync(join(estudio, '.estudio', 'bitacora.jsonl'), `${JSON.stringify({ cuando: 'a', quien: 'Laura', que: 'x', desde: 'y', proyecto: nombre })}\n${JSON.stringify({ cuando: 'b', quien: 'Laura', que: 'z', desde: 'y', proyecto: 'otro' })}\n`);
    await guardarCuentaGit(estudio, nombre, 'laura-gh');
    await guardarHuella(estudio, nombre);
    await guardarActivo(estudio, nombre);
    return { estudio, dir, bare };
  }

  it('las líneas de STL en los archivos del proyecto: solo las que señalan su memoria o la herramienta del director', () => {
    const texto = '# R\r\nUsa `.stl/` para la memoria.\r\nnode tools/director/estado.ts --proyecto x\r\nUn archivo.stl no cuenta.\r\nNada.\r\n';
    expect(lineasDeSTL(texto)).toEqual(['Usa `.stl/` para la memoria.', 'node tools/director/estado.ts --proyecto x']);
    expect(sinLineasDeSTL(texto)).toBe('# R\r\nUn archivo.stl no cuenta.\r\nNada.\r\n');
    expect(sinExclusionDeSTL('*.log\n# La memoria de STL Studio (rama stl): ver .stl/README.md\n/.stl/\nbuild/\n')).toBe('*.log\nbuild/\n');
    // Los registros de un proyecto, nunca los de otro cuyo id empieza igual
    expect(esRegistroDe('golf-2026-10-25T10-00-00-000Z.log', 'golf')).toBe(true);
    expect(esRegistroDe('golf-aclaracion-2026-10-25T10-00-00-000Z.bandeja.txt', 'golf')).toBe(true);
    expect(esRegistroDe('golf-club-2026-10-25T10-00-00-000Z.log', 'golf')).toBe(false);
    // El permiso de subir, de ese proyecto o de todos
    const firma = { cuando: 'x', quien: 'Laura' };
    expect(puedeSubir({ activo: null, repositorios: {}, permisos: { autorizados: [{ regla: 'Bash(git push:*)', alcance: 'proyecto', proyecto: 'a', ...firma }] } }, 'a')).toBe(true);
    expect(puedeSubir({ activo: null, repositorios: {}, permisos: { autorizados: [{ regla: 'Bash(git push:*)', alcance: 'proyecto', proyecto: 'b', ...firma }] } }, 'a')).toBe(false);
    expect(puedeSubir({ activo: null, repositorios: {}, permisos: { autorizados: [{ regla: 'Bash(git push --force:*)', alcance: 'todos', ...firma }] } }, 'a')).toBe(false);
  });

  it('estudio.local.json queda sin nada del proyecto; si era el activo, la lista elige otro o, sin otro, STL Studio', () => {
    const firma = { cuando: 'x', quien: 'Laura' };
    const l = {
      activo: 'a', repositorios: { a: '/a', b: '/b', stl: '/s' }, cuentasGit: { a: 'x' }, huellas: { a: { sha: '1', cuando: 'x' }, b: { sha: '2', cuando: 'x' } },
      revisiones: { a: { proyecto: 'a', quien: 't', pedida: 'x' } },
      permisos: { ultracode: true as const, autorizados: [{ regla: 'R', alcance: 'proyecto' as const, proyecto: 'a', ...firma }, { regla: 'S', alcance: 'todos' as const, ...firma }], skills: [{ proyecto: 'a', nombre: 'n', ruta: 'r', huella: 'h', ...firma }] },
    };
    const sin = localSinElProyecto(l as never, 'a', 'stl');
    expect(sin).toEqual({ activo: null, repositorios: { b: '/b', stl: '/s' }, huellas: { b: { sha: '2', cuando: 'x' } }, permisos: { ultracode: true, autorizados: [{ regla: 'S', alcance: 'todos', ...firma }] } });
    expect(JSON.stringify(sin)).not.toContain('"a"');
    expect(localSinElProyecto({ activo: 'b', repositorios: { b: '/b', stl: '/s' } }, 'b', 'stl').activo).toBe('stl');
    expect(localSinElProyecto({ activo: 'stl', repositorios: { b: '/b', stl: '/s' } }, 'b', 'stl').activo).toBe('stl');
  });

  it('borra la memoria entera (carpeta, rama, exclusión), quita sus líneas en un commit local y todo lo suyo en este Studio, sin tocar lo demás', async () => {
    const { estudio, dir } = await estudioConProyecto('tienda');
    const antes = { main: git(dir, 'rev-parse', 'main'), otra: git(dir, 'rev-parse', 'otra') };
    const lista = await queSeBorra(estudio, 'tienda');
    expect(lista).toMatchObject({ repo: dir, memoria: true, rama: true, exclusion: true, remota: null, lineasDelStudio: 1 });
    expect(lista.lineas).toEqual([{ archivo: 'CLAUDE.md', lineas: ['Antes de cada tarea: node C:/STL/tools/director/estado.ts --proyecto x (su memoria en `.stl/`).'] }]);
    expect(lista.local).toEqual(['repositorio', 'cuentaGit', 'huella']);
    expect(lista.registros.sort()).toEqual(['.estudio/lectura/tienda/', '.revisiones/tienda-2026-11-10T10-00-00-000Z.encargos.json', '.revisiones/tienda-2026-11-10T10-00-00-000Z.log', '.revisiones/tienda-urgencia-2026-11-10T11-00-00-000Z.log']);
    const r = await quitarProyecto(estudio, 'tienda', { idioma: 'en', comprobarCuenta: () => { throw new Error('sin copia en GitHub no se pregunta'); } });
    expect(r.quedo).toEqual([]);
    expect(r.despues).toBe('lista');
    // Nada archivado: ni la carpeta, ni la rama stl, ni una stl-archivo
    expect(existsSync(join(dir, '.stl'))).toBe(false);
    expect(git(dir, 'branch', '--list', '*stl*')).toBe('');
    expect(git(dir, 'worktree', 'list')).not.toContain('.stl');
    expect(readFileSync(join(dir, '.git', 'info', 'exclude'), 'utf-8')).not.toContain('.stl');
    // Sus archivos: solo esa línea, en un commit local de su rama, y su código y su otra rama como estaban
    expect(readFileSync(join(dir, 'CLAUDE.md'), 'utf-8')).toBe('# Reglas\n\nUsa pruebas.\nNo subas sin permiso.\n');
    expect(git(dir, 'log', '-1', '--format=%s')).toBe('STL Studio: removes its lines, the project left the Studio');
    expect(git(dir, 'rev-parse', 'HEAD~1')).toBe(antes.main);
    expect(git(dir, 'diff', '--name-only', 'HEAD~1', 'HEAD')).toBe('CLAUDE.md');
    expect(git(dir, 'rev-parse', 'otra')).toBe(antes.otra);
    expect(readFileSync(join(dir, 'app.txt'), 'utf-8')).toBe('el código\n');
    expect(git(dir, 'status', '--porcelain')).toBe('');
    // En este Studio, nada suyo; lo del otro proyecto, igual
    const l = await leerLocal(estudio);
    expect(JSON.stringify(l)).not.toContain('"tienda"');
    expect(l).toEqual({ activo: null, repositorios: { otro: join(estudio, 'repos', 'otro') } });
    expect(readdirSync(join(estudio, '.revisiones')).sort()).toEqual(['otro-2026-11-10T10-00-00-000Z.log', 'tienda-club-2026-11-10T10-00-00-000Z.log']);
    expect(existsSync(join(estudio, '.estudio', 'lectura', 'tienda'))).toBe(false);
    expect(readFileSync(join(estudio, '.estudio', 'bitacora.jsonl'), 'utf-8')).not.toContain('"tienda"');
    expect(readFileSync(join(estudio, '.estudio', 'bitacora.jsonl'), 'utf-8')).toContain('"otro"');
    // Ya no está: otra vez no se puede, y entregarlo de nuevo empieza desde cero
    await expect(queSeBorra(estudio, 'tienda')).rejects.toThrow('no está en este Studio');
    expect(await abrirMemoria(dir)).toEqual({ yaTenia: false });
    rmSync(estudio, { recursive: true, force: true });
  });

  it('la copia en GitHub se borra solo con el permiso de subir y después de comprobar la cuenta aprobada', async () => {
    const { estudio, dir, bare } = await estudioConProyecto('blog', true);
    const enElRemoto = () => git(bare, 'branch', '--list', 'stl');
    expect(enElRemoto()).toContain('stl');
    // Sin el permiso de subir: queda, y se dice con su orden; la cuenta ni se pregunta
    const sinPermiso = await queSeBorra(estudio, 'blog');
    expect(sinPermiso.remota).toEqual({ remoto: 'https://github.com/laura-gh/app.git', seBorra: false, orden: 'git push origin --delete stl' });
    await guardarPermisoDeSubir(estudio);
    expect((await queSeBorra(estudio, 'blog')).remota?.seBorra).toBe(true);
    // Con el permiso, pero con otra cuenta en GitHub: no se borra, y lo de este computador sí
    const otra = await quitarProyecto(estudio, 'blog', { comprobarCuenta: (aprobada) => ({ ok: false, resultado: { ok: false, motivo: 'no_coincide', aprobada: aprobada ?? null, login: 'otra' } }) });
    expect(otra.remotaBorrada).toBe(false);
    expect(otra.quedo.join(' ')).toContain('git push origin --delete stl');
    expect(enElRemoto()).toContain('stl');
    expect(existsSync(join(dir, '.stl'))).toBe(false);
    rmSync(estudio, { recursive: true, force: true });

    // Con el permiso y la cuenta aprobada: la cuenta se comprueba primero, con la aprobada, y luego se borra
    const segundo = await estudioConProyecto('blog', true);
    await guardarPermisoDeSubir(segundo.estudio);
    const vistas: { aprobada: string | null | undefined; habia: boolean }[] = [];
    const bien = await quitarProyecto(segundo.estudio, 'blog', { comprobarCuenta: (aprobada) => (vistas.push({ aprobada, habia: git(segundo.bare, 'branch', '--list', 'stl').includes('stl') }), sesionBien()) });
    expect(vistas).toEqual([{ aprobada: 'laura-gh', habia: true }]);
    expect(bien.remotaBorrada).toBe(true);
    expect(bien.quedo).toEqual([]);
    expect(git(segundo.bare, 'branch', '--list', 'stl')).toBe('');
    expect(git(segundo.dir, 'branch', '-a', '--list', '*stl*')).toBe('');
    expect(bien.despues).toBe('lista');
    rmSync(segundo.estudio, { recursive: true, force: true });
  });

  /** El permiso de subir de ese proyecto, como lo da su casilla en «Modelo y consumo» › permisos. */
  async function guardarPermisoDeSubir(estudio: string) {
    const archivo = join(estudio, 'estudio.local.json');
    const l = JSON.parse(readFileSync(archivo, 'utf-8'));
    l.permisos = { autorizados: [{ regla: 'Bash(git push:*)', alcance: 'proyecto', proyecto: 'blog', cuando: 'x', quien: 'Laura' }] };
    writeFileSync(archivo, JSON.stringify(l));
  }
});

describe('la memoria de cada proyecto, al entregarlo', () => {

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

  it('con su diagnóstico pedido al entregarlo, nace sin la misión que solo pedía pedirlo; uno nuevo no cambia (pd_entregar_y_diagnosticar)', async () => {
    // En un Estudio aparte, para no sumar proyectos a la lista que miran las otras pruebas
    const otro = mkdtempSync(join(tmpdir(), 'estudio-proyectos-diag-'));
    cpSync(join(raiz, 'plantilla'), join(otro, 'plantilla'), { recursive: true });
    const entregar = async (id: string, datos: Omit<Parameters<typeof crearProyecto>[1], 'id' | 'titular' | 'url'>) => {
      const dir = join(otro, 'repos', id);
      mkdirSync(dir, { recursive: true });
      git(dir, 'init', '-q', '-b', 'main');
      git(dir, 'commit', '-q', '--allow-empty', '-m', 'código');
      await abrirMemoria(dir);
      await guardarRutaRepositorio(otro, id, dir);
      await crearProyecto(otro, { id, url: '', titular, ...datos });
      return { dir };
    };
    const { dir } = await entregar('tienda-diag', { nombre: 'Tienda', contexto: '', metaInicial: '', diagnosticoPedido: true });
    const plan = JSON.parse(readFileSync(join(dir, '.stl', 'director', 'plan.json'), 'utf-8'));
    expect(plan.misiones.map((m: { id: string }) => m.id)).not.toContain(MISION_PEDIR_DIAGNOSTICO);
    expect(validarPlan(plan, ['titular'])).toEqual([]);
    const solo = (await entregar('tienda-solo', { nombre: 'Tienda 2', contexto: '', metaInicial: '' })).dir;
    expect(JSON.parse(readFileSync(join(solo, '.stl', 'director', 'plan.json'), 'utf-8')).misiones.map((m: { id: string }) => m.id)).toEqual([MISION_PEDIR_DIAGNOSTICO]);
    // Uno nuevo entregado pidiendo su revisión nace sin la que solo pedía pedirla (pd_entrega_al_instante); sin pedirla, la conserva
    const nuevo = (await entregar('citas-diag', { nombre: 'Citas', tipo: 'nuevo', contexto: 'c', metaInicial: 'm', diagnosticoPedido: true })).dir;
    const planNuevo = JSON.parse(readFileSync(join(nuevo, '.stl', 'director', 'plan.json'), 'utf-8'));
    expect(planNuevo.misiones.map((m: { id: string }) => m.id)).not.toContain(MISION_PEDIR_PLANTEAMIENTO);
    expect(validarPlan(planNuevo, ['titular'])).toEqual([]);
    const nuevoSolo = (await entregar('citas-solo', { nombre: 'Citas 2', tipo: 'nuevo', contexto: 'c', metaInicial: 'm' })).dir;
    expect(JSON.parse(readFileSync(join(nuevoSolo, '.stl', 'director', 'plan.json'), 'utf-8')).misiones.map((m: { id: string }) => m.id)).toEqual([MISION_PEDIR_PLANTEAMIENTO]);
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

  it('con la interfaz en inglés, el arranque nace en inglés y su primera misión no pide comprobar la conexión (nmw9wgco4tit)', async () => {
    const otro = mkdtempSync(join(tmpdir(), 'estudio-proyectos-en-'));
    cpSync(join(raiz, 'plantilla'), join(otro, 'plantilla'), { recursive: true });
    const entregar = async (id: string, datos: Omit<Parameters<typeof crearProyecto>[1], 'id' | 'titular' | 'url'>) => {
      const dir = join(otro, 'repos', id);
      mkdirSync(dir, { recursive: true });
      git(dir, 'init', '-q', '-b', 'main');
      git(dir, 'commit', '-q', '--allow-empty', '-m', 'código');
      await abrirMemoria(dir);
      await guardarRutaRepositorio(otro, id, dir);
      await crearProyecto(otro, { id, url: '', titular, ...datos });
      return { dir };
    };
    const { dir } = await entregar('crm-en', { nombre: 'CRM', contexto: 'A CRM', metaInicial: 'Sell', idioma: 'en' });
    const p = JSON.parse(readFileSync(join(dir, '.stl', 'proyecto.json'), 'utf-8'));
    const plan = JSON.parse(readFileSync(join(dir, '.stl', 'director', 'plan.json'), 'utf-8'));
    expect(p.equipo[0].cargo).toBe('Project director');
    expect(plan.mensaje.texto).toMatch(/^Welcome to the Studio/);
    expect(plan.fases[0].nombre).toBe('Diagnosis and goal');
    expect(plan.misiones.map((m: { id: string }) => m.id)).toEqual(['t_conectar']);
    const pasos = JSON.stringify(plan.misiones[0].pasos);
    expect(pasos).not.toMatch(/p-repositorio/);
    expect(pasos).toMatch(/Request review/);
    expect(validarPlan(plan, ['titular'])).toEqual([]);
    const nuevo = (await entregar('citas-en', { nombre: 'Bookings', tipo: 'nuevo', contexto: '', metaInicial: '', idioma: 'en' })).dir;
    const planNuevo = JSON.parse(readFileSync(join(nuevo, '.stl', 'director', 'plan.json'), 'utf-8'));
    expect(planNuevo.fases[0].nombre).toBe('Approach and goal');
    expect(validarPlan(planNuevo, ['titular'])).toEqual([]);
  });

  it('las dos plantillas de cada tipo dicen lo mismo: los mismos ids, pasos y botones, en su idioma', () => {
    for (const base of ['plan', 'plan-nuevo']) {
      const es = JSON.parse(readFileSync(join(raiz, 'plantilla', `${base}.json`), 'utf-8'));
      const en = JSON.parse(readFileSync(join(raiz, 'plantilla', `${base}.en.json`), 'utf-8'));
      const forma = (x: { fases: { id: string; criterios: { id: string }[]; misiones: string[] }[]; misiones: { id: string; criterios: string[]; pasos: { ir?: unknown }[] }[]; ritmo: string[]; lecciones: unknown[] }) => ({
        fases: x.fases.map((f) => ({ id: f.id, criterios: f.criterios.map((c) => c.id), misiones: f.misiones.length })),
        misiones: x.misiones.map((m) => ({ id: m.id, criterios: m.criterios, pasos: m.pasos.map((p) => JSON.stringify((p.ir as { vista?: string; ancla?: string }) ? { ...(p.ir as object), etiqueta: undefined } : null)) })),
        ritmo: x.ritmo.length, lecciones: x.lecciones.length,
      });
      expect(forma(en), base).toEqual(forma(es));
      // Ninguna primera misión pide comprobar que el repositorio quedó conectado: el Studio ya lo comprobó al entregarlo
      expect(JSON.stringify(es.misiones[0].pasos), base).not.toMatch(/comprueba que la carpeta/);
    }
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
    // Una skill autorizada se guarda y se vuelve a leer, y otro cambio de permisos no la borra (nmwmgm8g6tit: leerLocal la
    // perdía, el panel decía «Guardado» con la casilla vacía y el director seguía apagándola)
    const skill = { proyecto: 'tesis', nombre: 'add-field', ruta: '.claude/commands/add-field.md', huella: 'abc123', cuando: '2026-11-18T19:00:00.000Z', quien: 'Laura' };
    await cambiarSkillsAutorizadas(raiz, (antes) => [...antes, skill]);
    expect((await leerLocal(raiz)).permisos?.skills).toEqual([skill]);
    await guardarPermiso(raiz, 'ultracode', true);
    expect((await leerLocal(raiz)).permisos).toEqual({ ultracode: true, skills: [skill] });
    await guardarPermiso(raiz, 'ultracode', false);
    await cambiarSkillsAutorizadas(raiz, () => []);
    expect((await leerLocal(raiz)).permisos).toBeUndefined();
    // Sacarlo del Estudio borra su memoria, y no deja su cuenta aprobada ni su huella (nmwahytf2tit, pd_quitar_en_pantalla)
    await guardarCuentaGit(raiz, 'tesis', 'laura-gh');
    await guardarCuentaGit(raiz, 'api-pedidos', 'otra-gh');
    await guardarHuella(raiz, 'tesis');
    expect((await leerLocal(raiz)).huellas?.tesis).toBeDefined();
    await quitarProyecto(raiz, 'tesis');
    expect(await proyectosLocales(raiz)).toEqual(['api-pedidos', 'app-citas']);
    expect(existsSync(join(raiz, 'repos', 'tesis', '.stl'))).toBe(false);
    const tras = await leerLocal(raiz);
    expect(tras.cuentasGit).toEqual({ 'api-pedidos': 'otra-gh' });
    expect(tras.huellas?.tesis).toBeUndefined();
    expect(tras.activo).toBe(null);
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
    expect((await leerLocal(raiz)).revisiones?.rev).toMatchObject({ quien: 'Laura', origen: 'recomendada' });
    // cancelarla no necesita botón de origen
    await pedirRevision(raiz, 'rev', null);
    expect((await leerLocal(raiz)).revisiones?.rev).toBeUndefined();
  });

  it('el Studio la lanza; si no termina, vuelve a quedar pedida con el porqué, y pedirla de nuevo lo limpia', async () => {
    await pedirRevision(raiz, 'rev', 'Laura', 'cabecera');
    await marcarLanzada(raiz, 'rev');
    expect((await leerLocal(raiz)).revisiones?.rev).toMatchObject({ proyecto: 'rev', quien: 'Laura', lanzada: expect.any(String) });
    await marcarRevision(raiz, 'rev', 'en_curso');
    expect((await leerLocal(raiz)).revisiones?.rev?.enCurso).toBeTruthy();
    await marcarLanzada(raiz, 'rev', 'Se cortó.');
    const r = (await leerLocal(raiz)).revisiones?.rev!;
    expect(r).toMatchObject({ proyecto: 'rev', quien: 'Laura', error: 'Se cortó.' });
    expect(r.lanzada ?? r.enCurso).toBeUndefined();
    await pedirRevision(raiz, 'rev', 'Laura', 'cabecera');
    expect((await leerLocal(raiz)).revisiones?.rev?.error).toBeUndefined();
  });

  it('«Todo con el modelo que elegí» se guarda en este computador, apagada de entrada, y sobrevive a la lectura (pr_modelos_por_tarea, punto 4)', async () => {
    expect((await leerLocal(raiz)).todoConElModelo).toBeUndefined();
    await guardarTodoConElModelo(raiz, true);
    expect((await leerLocal(raiz)).todoConElModelo).toBe(true);
    await guardarTodoConElModelo(raiz, false);
    expect((await leerLocal(raiz))).not.toHaveProperty('todoConElModelo');
  });

  it('la ayuda guiada vista se recuerda en el Studio, una vez para todos los proyectos, sin repetirse (pd_ayuda_guiada)', async () => {
    expect(await guardarAyudaVista(raiz, 'hoy')).toEqual(['hoy']);
    expect(await guardarAyudaVista(raiz, 'hoy')).toEqual(['hoy']);
    expect((await leerLocal(raiz)).ayudasVistas).toEqual(['hoy']);
    await expect(guardarAyudaVista(raiz, 'otra')).rejects.toThrow();
  });

  it('el cierre guarda la huella del plan, y lo que cambie después sin un director se avisa (pr_cierre_vigilado, punto 4)', async () => {
    const plan = '{\n  "a": 1\n}\n';
    expect(huellaDelPlan(plan)).toBe(huellaDelPlan(plan.replace(/\n/g, '\r\n')));
    expect(huellaDelPlan(plan)).not.toBe(huellaDelPlan(plan.replace('1', '2')));
    const huella = { sha: huellaDelPlan(plan), cuando: '2026-10-28T19:00:00.000Z' };
    expect(planCambiadoTrasCierre(huella, plan, false)).toBeNull();
    expect(planCambiadoTrasCierre(huella, plan.replace('1', '2'), false)).toContain('El plan cambió después del último cierre');
    // Con un director trabajando, cambiarlo es suyo; sin huella o sin plan, nada que comparar
    expect(planCambiadoTrasCierre(huella, plan.replace('1', '2'), true)).toBeNull();
    expect(planCambiadoTrasCierre(undefined, plan, false)).toBeNull();
    expect(planCambiadoTrasCierre(huella, null, false)).toBeNull();
    // Se guarda por proyecto en este computador, y sobrevive a la lectura; sin plan, nada
    await guardarHuella(raiz, 'no-existe');
    expect((await leerLocal(raiz)).huellas?.['no-existe']).toBeUndefined();
    mkdirSync(join(raiz, 'proyectos', 'huella', 'director'), { recursive: true });
    writeFileSync(join(raiz, 'proyectos', 'huella', 'director', 'plan.json'), plan);
    await guardarHuella(raiz, 'huella');
    expect((await leerLocal(raiz)).huellas?.huella).toMatchObject({ sha: huellaDelPlan(plan), cuando: expect.any(String) });
    // La guardan los tres cierres (la revisión, la aclaración y lo urgente), y el servidor la compara en lo que muestra
    const bandeja = readFileSync(join(import.meta.dirname, '..', '..', 'tools', 'director', 'bandeja.ts'), 'utf8');
    expect(bandeja.match(/await guardarHuella\(raiz, elegido\);/g)).toHaveLength(3);
    expect(readFileSync(join(import.meta.dirname, '..', '..', 'estudio', 'servidor', 'api.ts'), 'utf8')).toContain('planCambiadoTrasCierre(l.huellas?.[id], texto, trabaja)');
  });

  it('una aclaración o una urgencia que no se cerró se retoma con su reporte y lo que dejó (pr_retoma_automatica, punto 5)', async () => {
    const falla = { que: 'Se detuvo a mitad de camino', porque: 'x', duracion: 3, tokens: null, ultimos: [], usoFlujos: null, negados: [], sugerencia: 's', accion: 'pedir' as const, cuando: '2026-10-28T10:00:00.000Z', registro: '.revisiones/rev-aclaracion-x.log' };
    // Sin una fallida, nada que retomar
    expect(await retomarAparte(raiz, 'rev', 'aclaracion', 'Laura')).toBeNull();
    const a = await pedirAclaracion(raiz, { proyecto: 'rev', mision: 't_a', paso: 1, nota: 'n1', quien: 'Ana' });
    await marcarAclaracion(raiz, a.nota, 'lanzada');
    const lanzada = (await leerLocal(raiz)).aclaracion!.lanzada!;
    await marcarAclaracion(raiz, a.nota, { error: 'La aclaración no terminó.', falla });
    expect((await leerLocal(raiz)).aclaracion).toMatchObject({ error: 'La aclaración no terminó.', falla });
    // De otro proyecto, no
    expect(await retomarAparte(raiz, 'otro', 'aclaracion', 'Laura')).toBeNull();
    const otra = await retomarAparte(raiz, 'rev', 'aclaracion', 'Laura');
    expect(otra).toMatchObject({ proyecto: 'rev', mision: 't_a', paso: 1, nota: 'n1', quien: 'Laura', reintento: { lanzada, registro: falla.registro } });
    expect((await leerLocal(raiz)).aclaracion).not.toHaveProperty('error');
    // Lo urgente, con las que esperaban en `luego`
    const u = (await pedirUrgencia(raiz, { proyecto: 'rev', notas: ['u1'], quien: 'Ana' }))!;
    await marcarUrgencia(raiz, u.pedida, 'lanzada');
    await pedirUrgencia(raiz, { proyecto: 'rev', notas: ['u2'], quien: 'Ana' });
    await marcarUrgencia(raiz, u.pedida, { error: 'La urgencia no terminó.' });
    const retomada = await retomarAparte(raiz, 'rev', 'urgencia', 'Laura');
    expect(retomada).toMatchObject({ notas: ['u1', 'u2'], quien: 'Laura', reintento: { lanzada: expect.any(String) } });
    expect(urgenciaActiva((await leerLocal(raiz)).urgencia)).toBe(true);
    // Atendida, para que no quede pedida en las pruebas que siguen
    await marcarUrgencia(raiz, retomada!.pedida, 'hecha');
  });

  it('los minutos de más que recibe al llegar a su límite avanzando quedan en su límite, solo mientras está en marcha (pr_procesos_vista, punto 4)', async () => {
    await pedirRevision(raiz, 'rev', 'Laura', 'cabecera');
    await prorrogarRevision(raiz, 'rev', 70);
    expect((await leerLocal(raiz)).revisiones?.rev?.limite).toBeUndefined();
    await marcarLanzada(raiz, 'rev', undefined, undefined, 60);
    await marcarRevision(raiz, 'rev', 'en_curso');
    await prorrogarRevision(raiz, 'rev', 70);
    expect((await leerLocal(raiz)).revisiones?.rev).toMatchObject({ limite: 70, lanzada: expect.any(String), enCurso: expect.any(String) });
    // De otro proyecto, o ya cerrada, nada
    await prorrogarRevision(raiz, 'otro', 90);
    expect((await leerLocal(raiz)).revisiones?.rev?.limite).toBe(70);
    await marcarRevision(raiz, 'rev', 'hecha');
    await prorrogarRevision(raiz, 'rev', 90);
    expect((await leerLocal(raiz)).revisiones?.rev?.limite).toBe(70);
  });

  it('guarda el reporte de qué pasó junto al error, y pedirla de nuevo lo limpia', async () => {
    const falla = { que: 'No arrancó', porque: 'Claude Code se cerró antes de empezar.', duracion: 0.1, tokens: null, ultimos: [], usoFlujos: null, negados: [], sugerencia: 'Pídela de nuevo.', accion: 'pedir' as const, cuando: '2026-10-21T20:00:00.000Z' };
    await pedirRevision(raiz, 'rev', 'Laura', 'cabecera');
    await marcarLanzada(raiz, 'rev');
    await marcarLanzada(raiz, 'rev', 'Se cortó.', falla);
    expect((await leerLocal(raiz)).revisiones?.rev).toMatchObject({ error: 'Se cortó.', falla });
    await pedirRevision(raiz, 'rev', 'Laura', 'cabecera');
    expect((await leerLocal(raiz)).revisiones?.rev?.falla).toBeUndefined();
  });

  it('pedida de nuevo después de una que no se cerró, retoma lo que esa dejó (reintento)', async () => {
    const falla = { que: 'Claude Code terminó sin cerrar la revisión', porque: '…', duracion: 9, tokens: null, ultimos: [], usoFlujos: null, negados: [], sugerencia: 'Pídela de nuevo.', accion: 'pedir' as const, cuando: '2026-10-21T21:21:07.000Z', registro: '.revisiones/rev-x.log' };
    // Desde una que cerró: la de la prueba anterior quedó pedida para retomar su falla, y una pedida de nuevo la retomaría
    await marcarRevision(raiz, 'rev', 'hecha');
    await pedirRevision(raiz, 'rev', 'Laura', 'cabecera');
    await marcarLanzada(raiz, 'rev');
    const lanzada = (await leerLocal(raiz)).revisiones?.rev!.lanzada!;
    await marcarLanzada(raiz, 'rev', 'No se cerró.', falla);
    // la fallida guarda cuándo se lanzó, sin `lanzada` (así la puede tomar la sesión del director)
    expect((await leerLocal(raiz)).revisiones?.rev).toMatchObject({ error: 'No se cerró.', fallida: lanzada });
    expect((await leerLocal(raiz)).revisiones?.rev?.lanzada).toBeUndefined();
    await pedirRevision(raiz, 'rev', 'Laura', 'cabecera');
    const r = (await leerLocal(raiz)).revisiones?.rev!;
    expect(r.error).toBeUndefined();
    expect(r.reintento).toEqual({ lanzada, que: 'Claude Code terminó sin cerrar la revisión', registro: '.revisiones/rev-x.log' });
    // si esta también falla, la siguiente retoma desde la primera
    await marcarLanzada(raiz, 'rev');
    await marcarLanzada(raiz, 'rev', 'Otra vez.');
    await pedirRevision(raiz, 'rev', 'Laura', 'cabecera');
    expect((await leerLocal(raiz)).revisiones?.rev?.reintento).toMatchObject({ lanzada, que: 'Otra vez.' });
    // una que cerró bien no deja reintento
    await marcarRevision(raiz, 'rev', 'hecha');
    await pedirRevision(raiz, 'rev', 'Laura', 'cabecera');
    expect((await leerLocal(raiz)).revisiones?.rev?.reintento).toBeUndefined();
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

  it('un cambio no borra las claves que el código que lo hace no conoce: así se perdió la dirección del respaldo del Studio (pd_respaldo_direccion)', async () => {
    const archivo = join(raiz, 'estudio.local.json');
    // Lo que escribió una versión más nueva del código, o a mano, y que esta no conoce
    writeFileSync(archivo, JSON.stringify({ ...JSON.parse(readFileSync(archivo, 'utf8')), respaldoDelStudio: 'https://github.com/ana/memoria', claveDeOtraVersion: { a: 1 } }));
    // Cualquier otro cambio guarda lo que leyó: antes, solo las claves que conocía, y lo demás se iba
    await guardarPlanDeClaude(raiz, 'max20');
    const guardado = JSON.parse(readFileSync(archivo, 'utf8'));
    expect(guardado.respaldoDelStudio).toBe('https://github.com/ana/memoria');
    expect(guardado.claveDeOtraVersion).toEqual({ a: 1 });
    // Las retiradas sí se van, y una conocida que no pasa su validación también
    writeFileSync(archivo, JSON.stringify({ ...guardado, seguidas: 3, planDeClaude: 'gratis' }));
    await guardarPlanDeClaude(raiz, null);
    const despues = JSON.parse(readFileSync(archivo, 'utf8'));
    expect(despues.seguidas).toBeUndefined();
    expect(despues.planDeClaude).toBeUndefined();
    expect(despues.claveDeOtraVersion).toEqual({ a: 1 });
  });

  it('la pista de la retoma sobrevive a «Cancelar»: la próxima que se pida la lleva, y una que cierra la borra (pr_retoma_automatica, punto 3)', async () => {
    await pedirRevision(raiz, 'ret', 'Laura', 'cabecera');
    await marcarLanzada(raiz, 'ret');
    const lanzada = (await leerLocal(raiz)).revisiones?.ret!.lanzada!;
    await marcarLanzada(raiz, 'ret', 'Se cortó.', { que: 'La revisión se cortó a los 60 minutos', porque: '…', duracion: 60, tokens: null, ultimos: [], usoFlujos: null, negados: [], sugerencia: 'Pídela de nuevo.', accion: 'pedir', cuando: lanzada, registro: '.revisiones/ret-x.log' });
    // Cancelada la que no se cerró, su pista queda aparte
    await pedirRevision(raiz, 'ret', null);
    expect((await leerLocal(raiz)).revisiones?.ret).toBeUndefined();
    expect((await leerLocal(raiz)).retoma).toEqual({ proyecto: 'ret', lanzada, que: 'La revisión se cortó a los 60 minutos', registro: '.revisiones/ret-x.log' });
    // La de otro proyecto no la toma
    await pedirRevision(raiz, 'otro', 'Laura', 'cabecera');
    expect((await leerLocal(raiz)).revisiones?.otro?.reintento).toBeUndefined();
    expect((await leerLocal(raiz)).retoma?.proyecto).toBe('ret');
    await pedirRevision(raiz, 'otro', null);
    // La próxima de ese proyecto la lleva, y la pista se usa una vez
    await pedirRevision(raiz, 'ret', 'Laura', 'cabecera');
    expect((await leerLocal(raiz)).revisiones?.ret?.reintento).toEqual({ lanzada, que: 'La revisión se cortó a los 60 minutos', registro: '.revisiones/ret-x.log' });
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
      expect((await leerLocal(dir)).revisiones?.golf).toEqual({ proyecto: 'golf', quien: 'x', pedida: 'p' });
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
      expect(l.revisiones?.golf?.hecha).toBeTruthy();
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

  it('cada proyecto tiene su revisión, y dos corren a la vez sin pisarse (pd_revisiones_simultaneas)', async () => {
    await pedirRevision(raiz, 'sa', 'Laura', 'cabecera');
    await pedirRevision(raiz, 'sb', 'Laura', 'cabecera');
    await marcarLanzada(raiz, 'sa');
    await marcarLanzada(raiz, 'sb');
    await marcarRevision(raiz, 'sb', 'en_curso');
    let l = await leerLocal(raiz);
    expect(revisionDe(l, 'sa')?.lanzada).toBeTruthy();
    expect(revisionDe(l, 'sb')?.enCurso).toBeTruthy();
    expect(proyectosRevisando(l)).toEqual(expect.arrayContaining(['sa', 'sb']));
    expect(directorTrabajando(l, 'sa')).toBe(true);
    // Cerrar una no toca la otra, y cancelar una tampoco
    await marcarRevision(raiz, 'sa', 'hecha');
    l = await leerLocal(raiz);
    expect(revisionDe(l, 'sa')?.hecha).toBeTruthy();
    expect(revisionCorriendo(revisionDe(l, 'sb'))).toBe(true);
    expect(directorTrabajando(l, 'sa')).toBe(false);
    expect(directorTrabajando(l)).toBe(true);
    await pedirRevision(raiz, 'sa', null);
    expect(revisionDe(await leerLocal(raiz), 'sb')?.enCurso).toBeTruthy();
    await marcarRevision(raiz, 'sb', 'hecha');
  });

  it('las revisiones de los otros proyectos, vistas desde el activo: pedida, en marcha o recién cerrada (pd_revisiones_simultaneas)', () => {
    const ahora = Date.parse('2026-11-12T12:00:00Z');
    const l = {
      revisiones: {
        a: { proyecto: 'a', quien: 'x', pedida: '2026-11-12T11:00:00Z', lanzada: '2026-11-12T11:00:05Z' },
        b: { proyecto: 'b', quien: 'x', pedida: '2026-11-12T11:10:00Z', lanzada: '2026-11-12T11:10:05Z' },
        c: { proyecto: 'c', quien: 'x', pedida: '2026-11-12T11:20:00Z' },
        d: { proyecto: 'd', quien: 'x', pedida: '2026-11-12T10:00:00Z', hecha: '2026-11-12T11:50:00Z' },
        e: { proyecto: 'e', quien: 'x', pedida: '2026-11-12T09:00:00Z', hecha: '2026-11-12T10:00:00Z' },
        f: { proyecto: 'f', quien: 'x', pedida: '2026-11-12T09:30:00Z', error: 'no' },
      },
    };
    expect(revisionesDeOtros(l, 'a', { b: 'App' }, ahora)).toEqual([
      { proyecto: 'd', nombre: 'd', estado: 'hecha', desde: '2026-11-12T10:00:00Z', hecha: '2026-11-12T11:50:00Z' },
      { proyecto: 'b', nombre: 'App', estado: 'en_marcha', desde: '2026-11-12T11:10:05Z' },
      { proyecto: 'c', nombre: 'c', estado: 'pedida', desde: '2026-11-12T11:20:00Z' },
    ]);
  });

  it('la revisión única de antes pasa a su proyecto al leerla, sin pisar una propia (pd_revisiones_simultaneas)', () => {
    const vieja = { proyecto: 'golf', quien: 'x', pedida: '2026-11-01T10:00:00Z', lanzada: '2026-11-01T10:00:05Z' };
    expect(revisionesNormales({ revision: vieja })).toEqual({ golf: vieja });
    const propia = { proyecto: 'golf', quien: 'y', pedida: '2026-11-02T10:00:00Z' };
    expect(revisionesNormales({ revision: vieja, revisiones: { golf: propia } })).toEqual({ golf: propia });
    // Una mal formada, o guardada bajo otro id, sale
    expect(revisionesNormales({ revisiones: { golf: { quien: 'x' }, otro: propia } })).toEqual({});
  });

  it('una revisión ya hecha no se vuelve a lanzar ni a marcar', async () => {
    await pedirRevision(raiz, 'rev', 'Laura', 'cabecera');
    await marcarRevision(raiz, 'rev', 'hecha');
    await marcarLanzada(raiz, 'rev');
    expect((await leerLocal(raiz)).revisiones?.rev?.lanzada).toBeUndefined();
  });

  it('una cadena de revisiones encadenadas que quedó de antes sale al leerla: una revisión a la vez (nota nmwdqtq1ntit)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'estudio-local-'));
    try {
      const cadena = { proyecto: 'golf', quien: 'x', desde: '2026-10-27T17:00:00.000Z', hechas: 0 };
      writeFileSync(join(dir, 'estudio.local.json'), JSON.stringify({ activo: null, repositorios: {}, seguidas: cadena }));
      expect((await leerLocal(dir)) as unknown as Record<string, unknown>).not.toHaveProperty('seguidas');
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
