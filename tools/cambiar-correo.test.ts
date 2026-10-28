// tools/cambiar-correo.ts de verdad, como proceso aparte, sobre un Studio temporal: su carpeta con su git, su
// estudio.local.json con los proyectos y la memoria de cada uno (.stl, rama stl) con su proyecto.json y su equipo, como los
// deja el Studio. La herramienta busca su Studio con STL_RAIZ (como las de tools/director/): aquí apunta a la carpeta
// temporal, nunca al Studio real, cuyo correo de git y equipos no se tocan. Lo que se comprueba es lo que ve quien depende de
// ella: que el equipo y git cambian juntos (y el Studio reconoce a la persona con el correo nuevo), que se niega sin tocar
// nada cuando no debe, y que si se corta a la mitad dice qué orden falta y volver a correrla termina.
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { leerIdentidad, olvidarIdentidad } from '../estudio/servidor/sincronizar.ts';
import { validarProyecto, type Integrante, type Proyecto } from '../src/director/director.ts';
import { abrirMemoria, guardarRutaRepositorio } from '../src/director/proyectos.ts';

// Git sin la configuración de esta persona ni la del sistema (cada repositorio de prueba trae la suya) y sin buscar un
// repositorio por encima de la carpeta de las pruebas: nada de esto toca la configuración general, solo cambia el entorno de
// este archivo de pruebas, y se restaura al final. La herramienta que se corre aquí lo hereda.
const base = mkdtempSync(join(tmpdir(), 'estudio-correo-'));
const configVacia = join(base, 'gitconfig-vacia');
writeFileSync(configVacia, '');
const AISLAR: Record<string, string> = { GIT_CONFIG_GLOBAL: configVacia, GIT_CONFIG_NOSYSTEM: '1', GIT_CEILING_DIRECTORIES: base };
// Y sin lo que git deja a quien corre dentro de un hook suyo (npm test desde un pre-commit): con GIT_DIR o GIT_INDEX_FILE
// heredados, cada orden de estas pruebas iría al repositorio de afuera (el del Studio), y una identidad heredada firmaría
// los commits con otro nombre
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
const HERRAMIENTA = join(import.meta.dirname, 'cambiar-correo.ts');

// Solo para armar los repositorios de prueba: la herramienta se corre sin esta identidad, así que lo que firma sus commits es
// lo que ella pone
const IDENTIDAD = { GIT_AUTHOR_NAME: 'Prueba', GIT_AUTHOR_EMAIL: 'prueba@ejemplo.co', GIT_COMMITTER_NAME: 'Prueba', GIT_COMMITTER_EMAIL: 'prueba@ejemplo.co' };
const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, ...IDENTIDAD }, windowsHide: true }).trim();

const VIEJO = 'ana@viejo.co';
const NUEVO = 'ana@nuevo.co';
const ana = (cambios: Partial<Integrante> = {}): Integrante => ({ id: 'titular', nombre: 'Ana', correo: VIEJO, cargo: 'Director de proyecto', papel: 'Dirige el proyecto', ...cambios });
const beto: Integrante = { id: 'beto', nombre: 'Beto', correo: 'beto@ejemplo.co' };
const carla: Integrante = { id: 'carla', nombre: 'Carla', correo: 'carla@ejemplo.co' };

/**
 * Un Studio temporal: su carpeta (con su git, con el nombre y el correo de Ana, salvo que no se pida) y un proyecto por cada
 * equipo, con su repositorio, su memoria abierta como la abre el Studio y su proyecto.json con ese equipo.
 */
async function armar(proyectos: Record<string, Integrante[]>, { conGit = true }: { conGit?: boolean } = {}) {
  const dir = mkdtempSync(join(base, 'e-'));
  const estudio = join(dir, 'estudio');
  mkdirSync(estudio);
  if (conGit) {
    git(estudio, 'init', '-q', '-b', 'main');
    git(estudio, 'config', 'user.name', 'Ana Pérez');
    git(estudio, 'config', 'user.email', VIEJO);
  }
  const repos: Record<string, string> = {};
  const memorias: Record<string, string> = {};
  for (const [id, equipo] of Object.entries(proyectos)) {
    const repo = join(dir, id);
    mkdirSync(repo);
    git(repo, 'init', '-q', '-b', 'main');
    git(repo, 'commit', '-q', '--allow-empty', '-m', 'código');
    await abrirMemoria(repo);
    await guardarRutaRepositorio(estudio, id, repo);
    const memoria = join(repo, '.stl');
    const proyecto = { nombre: `Proyecto ${id}`, tipo: 'existente', contexto: 'Uno de prueba', objetivo: null, equipo, sincronizar: false };
    writeFileSync(join(memoria, 'proyecto.json'), JSON.stringify(proyecto, null, 2) + '\n');
    git(memoria, 'add', '--', 'proyecto.json');
    git(memoria, 'commit', '-q', '-m', `Estudio (${id}): nace la memoria`);
    repos[id] = repo;
    memorias[id] = memoria;
  }
  return { dir, estudio, repos, memorias };
}
type Estudio = Awaited<ReturnType<typeof armar>>;

const textoDe = (e: Estudio, id: string) => readFileSync(join(e.memorias[id], 'proyecto.json'), 'utf8');
const equipoDe = (e: Estudio, id: string) => (JSON.parse(textoDe(e, id)) as Proyecto).equipo;
const commitsDe = (e: Estudio, id: string) => Number(git(e.memorias[id], 'rev-list', '--count', 'HEAD'));
const correoDeGit = (e: Estudio) => git(e.estudio, 'config', 'user.email');

/** Corre la herramienta de verdad, como proceso aparte, contra el Studio temporal (nunca el real: STL_RAIZ). */
function correr(e: Estudio, args: string[], entorno: Record<string, string> = {}) {
  const r = spawnSync(process.execPath, [HERRAMIENTA, ...args], { cwd: e.estudio, env: { ...process.env, STL_RAIZ: e.estudio, ...entorno }, encoding: 'utf8', timeout: 60_000, windowsHide: true });
  expect(r.error, 'la herramienta no pudo correr').toBeUndefined();
  return { codigo: r.status, salida: r.stdout, errores: r.stderr, todo: `${r.stdout}\n${r.stderr}` };
}

describe.skipIf(!hayGit)('cambiar el correo de git sin perder el lugar en el equipo', () => {
  it('cambia el equipo de cada proyecto donde está la persona y, al final, el correo de git de la carpeta: el Studio la sigue reconociendo', async () => {
    const e = await armar({ 'api-pedidos': [ana({ correo: ' Ana@Viejo.co ' }), beto], tesis: [{ id: 'titular', nombre: 'Carla', correo: 'carla@ejemplo.co' }] });
    // Un proyecto de la lista cuya memoria no está en este computador no estorba
    await guardarRutaRepositorio(e.estudio, 'fantasma', join(e.dir, 'no-existe'));
    const tesisAntes = textoDe(e, 'tesis');
    olvidarIdentidad();
    expect(await leerIdentidad(e.estudio, 'api-pedidos')).toEqual({ nombre: 'Ana Pérez', correo: VIEJO, rol: 'titular' });

    const r = correr(e, [NUEVO]);
    expect(r.codigo, r.todo).toBe(0);
    // Dice qué hizo, proyecto por proyecto, en qué carpeta y cuándo la reconoce el Studio
    expect(r.salida).toContain('api-pedidos: Ana cambia su correo en el equipo');
    expect(r.salida).toContain('fantasma: su memoria no está en este computador');
    expect(r.salida).toContain('tesis: no estás en su equipo');
    expect(r.salida).toContain(`El correo de git de esta carpeta (${e.estudio}): ${NUEVO}`);
    expect(r.salida).toContain('15 segundos');

    // El equipo de api-pedidos: solo cambió el correo de Ana; lo demás, igual
    const proyecto = JSON.parse(textoDe(e, 'api-pedidos')) as Proyecto;
    expect(proyecto.equipo).toEqual([ana({ correo: NUEVO }), beto]);
    expect(proyecto).toMatchObject({ nombre: 'Proyecto api-pedidos', tipo: 'existente', contexto: 'Uno de prueba', objetivo: null, sincronizar: false });
    expect(validarProyecto(proyecto)).toEqual([]);
    // Un commit en su memoria, solo de ese archivo, con el correo nuevo de autor y confirmador
    const memoria = e.memorias['api-pedidos'];
    expect(commitsDe(e, 'api-pedidos')).toBe(2);
    expect(git(memoria, 'log', '-1', '--format=%an|%ae|%cn|%ce|%s')).toBe(`Ana Pérez|${NUEVO}|Ana Pérez|${NUEVO}|Estudio (api-pedidos): Ana cambia su correo de git`);
    expect(git(memoria, 'show', '--name-only', '--format=', 'HEAD')).toBe('proyecto.json');
    expect(git(memoria, 'status', '--porcelain')).toBe('');
    // El proyecto donde ella no está, intacto y sin commits nuevos
    expect(textoDe(e, 'tesis')).toBe(tesisAntes);
    expect(commitsDe(e, 'tesis')).toBe(1);
    // El correo de git, solo en este clon: el nombre sigue y la configuración general no se tocó
    expect(correoDeGit(e)).toBe(NUEVO);
    expect(git(e.estudio, 'config', '--local', 'user.email')).toBe(NUEVO);
    expect(git(e.estudio, 'config', 'user.name')).toBe('Ana Pérez');
    expect(readFileSync(configVacia, 'utf8')).toBe('');
    // Y el Studio la reconoce con el correo nuevo, con el mismo lugar en el equipo
    olvidarIdentidad();
    expect(await leerIdentidad(e.estudio, 'api-pedidos')).toEqual({ nombre: 'Ana Pérez', correo: NUEVO, rol: 'titular' });
    olvidarIdentidad();
  }, 60_000);

  it('se niega, sin cambiar nada, con un correo no válido, igual al de ahora o que ya es de otra persona', async () => {
    const e = await armar({ a: [ana()], b: [{ id: 'titular', nombre: 'Beto', correo: 'beto@ejemplo.co' }], c: [ana(), carla] });
    const foto = () => JSON.stringify(['a', 'b', 'c'].map((id) => [textoDe(e, id), commitsDe(e, id)]).concat([[correoDeGit(e), 0]]));
    const antes = foto();
    const casos: [string[], RegExp][] = [
      [[], /Falta el correo nuevo/],
      [[NUEVO, 'otro@ejemplo.co'], /Sobran argumentos/],
      [['ana@nuevo'], /no es un correo válido/],
      [['ana nuevo@ejemplo.co'], /no es un correo válido/],
      [['--ayuda'], /no es un correo válido/],
      [[' ANA@viejo.co '], /Tu correo de git ya es ana@viejo\.co/],
      // El de otra persona de otro equipo, y el de otra persona del mismo equipo en que ella está
      [['Beto@Ejemplo.co'], /ya es el correo de Beto en el equipo de «b»/],
      [['carla@ejemplo.co'], /ya es el correo de Carla en el equipo de «c»/],
    ];
    for (const [args, motivo] of casos) {
      const r = correr(e, args);
      expect(r.codigo, `${args.join(' ')}: debía negarse; dijo ${r.todo}`).toBe(1);
      expect(r.errores).toMatch(motivo);
      expect(r.errores).toContain('No cambié nada');
      expect(foto(), `${args.join(' ')}: no debe cambiar nada`).toBe(antes);
    }
  }, 60_000);

  it('se niega si el proyecto.json de una memoria no se puede leer o tiene cambios sin guardar: nada se cambia a medias', async () => {
    const e = await armar({ a: [ana()], b: [ana()] });
    const archivo = join(e.memorias.b, 'proyecto.json');
    const original = textoDe(e, 'b');
    writeFileSync(archivo, '{ esto no es json');
    let r = correr(e, [NUEVO]);
    expect(r.codigo, r.todo).toBe(1);
    expect(r.errores).toMatch(/No pude leer el proyecto\.json de «b»/);
    git(e.memorias.b, 'checkout', '--', 'proyecto.json');
    writeFileSync(archivo, original.replace('Uno de prueba', 'Editado a mano, sin guardar'));
    r = correr(e, [NUEVO]);
    expect(r.codigo, r.todo).toBe(1);
    expect(r.errores).toMatch(/memoria de «b».*cambios sin guardar/);
    expect(textoDe(e, 'b')).toContain('Editado a mano, sin guardar');
    // «a», que sí se podía cambiar, no se tocó, y git sigue con el correo de antes
    expect(equipoDe(e, 'a')[0].correo).toBe(VIEJO);
    expect(commitsDe(e, 'a')).toBe(1);
    expect(correoDeGit(e)).toBe(VIEJO);
  }, 60_000);

  it('se niega si estudio.local.json no se entiende: sin la lista de proyectos cambiaría git sin tocar ningún equipo', async () => {
    const e = await armar({ a: [ana()] });
    const local = join(e.estudio, 'estudio.local.json');
    writeFileSync(local, '{ "activo": ');
    const r = correr(e, [NUEVO]);
    expect(r.codigo, r.todo).toBe(1);
    expect(r.errores).toMatch(/estudio\.local\.json no se entiende/);
    expect(r.errores).toContain('No cambié nada');
    expect(readFileSync(local, 'utf8')).toBe('{ "activo": ');
    expect(equipoDe(e, 'a')[0].correo).toBe(VIEJO);
    expect(commitsDe(e, 'a')).toBe(1);
    expect(correoDeGit(e)).toBe(VIEJO);
  }, 60_000);

  it('si se corta a la mitad, deja el proyecto como estaba y dice qué orden falta; al volver a correrla termina sin repetir lo hecho', async () => {
    const e = await armar({ a: [ana()], b: [ana()] });
    const antesDeB = textoDe(e, 'b');
    // El commit de «b» no se puede: un hook de su repositorio lo rechaza
    const hook = join(e.repos.b, '.git', 'hooks', 'pre-commit');
    writeFileSync(hook, '#!/bin/sh\necho "no se puede guardar ahora" >&2\nexit 1\n');
    chmodSync(hook, 0o755);

    const r = correr(e, [NUEVO]);
    expect(r.codigo, r.todo).toBe(1);
    // «a» ya cambió; «b» quedó como estaba, sin nada a medias; git sigue con el correo de antes
    expect(equipoDe(e, 'a')[0].correo).toBe(NUEVO);
    expect(commitsDe(e, 'a')).toBe(2);
    expect(textoDe(e, 'b')).toBe(antesDeB);
    expect(git(e.memorias.b, 'status', '--porcelain')).toBe('');
    expect(commitsDe(e, 'b')).toBe(1);
    expect(correoDeGit(e)).toBe(VIEJO);
    // Dice cuál falló y por qué, y la orden que falta
    expect(r.salida).toContain('b: no se pudo guardar el cambio en su memoria');
    expect(r.salida).toContain('su proyecto.json quedó como estaba');
    expect(r.errores).toContain(`node tools/cambiar-correo.ts ${NUEVO}`);

    // Se arregla lo que falló y se vuelve a correr la misma orden: «a» no se repite
    rmSync(hook);
    const otra = correr(e, [NUEVO]);
    expect(otra.codigo, otra.todo).toBe(0);
    expect(otra.salida).toContain(`a: tu correo ya es ${NUEVO} en su equipo`);
    expect(commitsDe(e, 'a')).toBe(2);
    expect(equipoDe(e, 'b')[0].correo).toBe(NUEVO);
    expect(commitsDe(e, 'b')).toBe(2);
    expect(correoDeGit(e)).toBe(NUEVO);
  }, 60_000);

  it('si falla el último paso, los equipos ya tienen el correo nuevo y dice la orden exacta que falta', async () => {
    const e = await armar({ a: [ana()] });
    // Git no puede escribir su configuración: ya hay un config.lock
    mkdirSync(join(e.estudio, '.git', 'config.lock'));
    const r = correr(e, [NUEVO]);
    expect(r.codigo, r.todo).toBe(1);
    expect(equipoDe(e, 'a')[0].correo).toBe(NUEVO);
    expect(correoDeGit(e)).toBe(VIEJO);
    expect(r.errores).toContain(`cd "${e.estudio}"`);
    expect(r.errores).toContain(`git config user.email "${NUEVO}"`);
    // Quitado el obstáculo, volver a correrla solo termina lo que faltaba
    rmSync(join(e.estudio, '.git', 'config.lock'), { recursive: true });
    const otra = correr(e, [NUEVO]);
    expect(otra.codigo, otra.todo).toBe(0);
    expect(commitsDe(e, 'a')).toBe(2);
    expect(correoDeGit(e)).toBe(NUEVO);
  }, 60_000);

  it('si la carpeta del Studio no es un repositorio, se niega: su correo sale de la configuración general y esa nunca la toca', async () => {
    const general = join(base, 'gitconfig-ana');
    const texto = '[user]\n\tname = Ana Pérez\n\temail = ana@viejo.co\n';
    writeFileSync(general, texto);
    const e = await armar({ a: [ana()] }, { conGit: false });
    const antes = textoDe(e, 'a');
    const r = correr(e, [NUEVO], { GIT_CONFIG_GLOBAL: general });
    expect(r.codigo, r.todo).toBe(1);
    expect(r.errores).toContain('no es un repositorio de git');
    expect(r.errores).toContain('No cambié nada');
    expect(textoDe(e, 'a')).toBe(antes);
    expect(commitsDe(e, 'a')).toBe(1);
    expect(readFileSync(general, 'utf8')).toBe(texto);
    expect(readFileSync(configVacia, 'utf8')).toBe('');
  }, 60_000);
});
