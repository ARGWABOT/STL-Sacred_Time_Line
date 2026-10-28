// tools/historia-limpia.ts de verdad, como proceso aparte, sobre un Studio temporal con su git y un repositorio de prueba
// en el lugar de GitHub (STL_HISTORIA_URL, sin gh): nunca toca el Studio real ni sube a ninguna parte. Lo que se comprueba
// es lo que importa a quien la corre: sin --rehacer no cambia nada; con él, lo publicado queda en un solo commit con el
// código de hoy, firmado y con la fecha del último, sin rastro de lo que había en la historia, y la historia de antes queda
// en su rama de respaldo; y se niega sin tocar nada cuando no debe.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { ARGUMENTOS_DE_COMMITS, FIRMA, RESPALDO_DE_HISTORIA } from './firma.ts';

// Git sin la configuración de esta persona ni la del sistema, y sin lo que git deja a quien corre dentro de un hook suyo
// (como en cambiar-correo.test.ts): solo cambia el entorno de este archivo de pruebas, y se restaura al final
const base = mkdtempSync(join(tmpdir(), 'estudio-historia-'));
const configVacia = join(base, 'gitconfig-vacia');
writeFileSync(configVacia, '');
const AISLAR: Record<string, string> = { GIT_CONFIG_GLOBAL: configVacia, GIT_CONFIG_NOSYSTEM: '1', GIT_CEILING_DIRECTORIES: base };
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

const HERRAMIENTA = join(import.meta.dirname, 'historia-limpia.ts');
const IDENTIDAD = { GIT_AUTHOR_NAME: 'Ana', GIT_AUTHOR_EMAIL: 'ana@trabajo.co', GIT_COMMITTER_NAME: 'Ana', GIT_COMMITTER_EMAIL: 'ana@trabajo.co' };
const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, ...IDENTIDAD }, windowsHide: true }).trim();

/** Un Studio con tres commits publicados en su «GitHub» de prueba; el segundo traía un dato que el tercero quitó. */
function armar() {
  const dir = mkdtempSync(join(base, 'h-'));
  const remoto = join(dir, 'remoto.git');
  const estudio = join(dir, 'estudio');
  git(dir, 'init', '-q', '--bare', '-b', 'main', remoto);
  git(dir, 'init', '-q', '-b', 'main', estudio);
  writeFileSync(join(estudio, 'a.txt'), 'uno\n');
  git(estudio, 'add', 'a.txt');
  git(estudio, 'commit', '-q', '-m', 'primero');
  writeFileSync(join(estudio, 'prueba.txt'), 'correo: ana@trabajo.co\n');
  git(estudio, 'add', 'prueba.txt');
  git(estudio, 'commit', '-q', '-m', 'segundo, con el dato');
  writeFileSync(join(estudio, 'prueba.txt'), 'correo: alguien@ejemplo.org\n');
  git(estudio, 'add', 'prueba.txt');
  git(estudio, 'commit', '-q', '-m', 'tercero, sin el dato');
  git(estudio, 'push', '-q', remoto, 'main:main');
  return { estudio, remoto };
}

function correr(e: { estudio: string; remoto: string }, ...args: string[]) {
  const r = spawnSync(process.execPath, [HERRAMIENTA, ...args], { cwd: e.estudio, env: { ...process.env, STL_RAIZ: e.estudio, STL_HISTORIA_URL: e.remoto }, encoding: 'utf8', timeout: 60_000, windowsHide: true });
  expect(r.error, 'la herramienta no pudo correr').toBeUndefined();
  return { codigo: r.status, todo: `${r.stdout}\n${r.stderr}` };
}

describe('la historia limpia: lo publicado, en un solo commit', () => {
  it('sin --rehacer dice lo que se pierde y no cambia nada; con él, deja un solo commit y la historia de antes en su respaldo', { timeout: 120_000 }, () => {
    const e = armar();
    const antes = git(e.estudio, 'rev-parse', 'main');
    const arbol = git(e.estudio, 'rev-parse', 'main^{tree}');
    const fecha = git(e.estudio, 'log', '-1', '--format=%cI', 'main');
    // Los restos de antes: un respaldo de una subida y la copia de filter-branch, que no guardan nada que no esté en main,
    // y uno de una firma con un commit propio, que no está en main
    git(e.estudio, 'branch', 'respaldo/antes-de-subir-20261020-101010', 'main~1');
    git(e.estudio, 'update-ref', 'refs/original/refs/heads/main', 'main');
    git(e.estudio, 'checkout', '-q', '-b', 'respaldo/firma-otra', 'main~2');
    writeFileSync(join(e.estudio, 'propio.txt'), 'solo aquí\n');
    git(e.estudio, 'add', 'propio.txt');
    git(e.estudio, 'commit', '-q', '-m', 'algo propio');
    git(e.estudio, 'checkout', '-q', 'main');

    const vista = correr(e);
    expect(vista.codigo, vista.todo).toBe(0);
    expect(vista.todo).toContain('los 3 commits publicados de main');
    expect(vista.todo).toContain('Se borran, porque todo lo que guardan ya está en esa historia: respaldo/antes-de-subir-20261020-101010, la copia de filter-branch de main');
    expect(vista.todo).toContain('Se quedan, porque guardan algo que no está en ella: respaldo/firma-otra');
    expect(vista.todo).toContain('No cambié nada');
    expect(git(e.estudio, 'rev-parse', 'main')).toBe(antes);
    expect(git(e.remoto, 'rev-parse', 'main')).toBe(antes);
    expect(git(e.estudio, 'branch', '--list', `${RESPALDO_DE_HISTORIA}*`)).toBe('');
    expect(git(e.estudio, 'for-each-ref', '--format=%(refname)', 'refs/heads/respaldo/', 'refs/original/').split('\n')).toHaveLength(3);

    const hecho = correr(e, '--rehacer');
    expect(hecho.codigo, hecho.todo).toBe(0);
    const ahora = git(e.estudio, 'rev-parse', 'main');
    // Lo publicado es lo de aquí: un solo commit, con el mismo código, firmado y con la fecha del último
    expect(git(e.remoto, 'rev-parse', 'main')).toBe(ahora);
    expect(git(e.remoto, 'rev-list', '--count', 'main')).toBe('1');
    expect(git(e.estudio, 'rev-parse', 'main^{tree}')).toBe(arbol);
    expect(git(e.estudio, 'log', '-1', '--format=%an <%ae> | %cn <%ce>', 'main')).toBe(`${FIRMA.nombre} <${FIRMA.correo}> | ${FIRMA.nombre} <${FIRMA.correo}>`);
    expect(git(e.estudio, 'log', '-1', '--format=%cI', 'main')).toBe(fecha);
    expect(git(e.estudio, 'log', '-1', '--format=%s', 'main')).toContain('en un solo commit');
    // Sin rastro del dato ni de quien firmaba antes en lo publicado
    expect(git(e.remoto, 'log', '-G', 'ana@trabajo', '--format=%h', 'main')).toBe('');
    expect(git(e.remoto, 'log', '--format=%ae %ce', 'main')).not.toContain('ana@trabajo.co');
    // La historia de antes, entera, en su rama de respaldo; la carpeta, sin cambios
    const respaldo = git(e.estudio, 'branch', '--list', '--format=%(refname:short)', `${RESPALDO_DE_HISTORIA}*`);
    expect(respaldo).toMatch(new RegExp(`^${RESPALDO_DE_HISTORIA}\\d{8}-\\d{6}$`));
    expect(git(e.estudio, 'rev-parse', respaldo)).toBe(antes);
    expect(git(e.estudio, 'status', '--porcelain')).toBe('');
    // Lo que sobraba salió; lo que guardaba algo propio, no
    expect(git(e.estudio, 'for-each-ref', '--format=%(refname:short)', 'refs/heads/respaldo/', 'refs/original/').split('\n').sort()).toEqual([respaldo, 'respaldo/firma-otra'].sort());
    expect(hecho.todo).toContain('borré los 2 respaldos viejos');
    // La búsqueda del director (tools/director/buscar.ts) sigue leyendo lo hecho: el commit único y los de antes
    const leidos = git(e.estudio, ...ARGUMENTOS_DE_COMMITS);
    for (const asunto of ['en un solo commit', 'primero', 'segundo, con el dato', 'tercero, sin el dato']) expect(leidos).toContain(asunto);
    // Y sin historia de antes, lee solo la rama de ahora (no se queda sin nada)
    expect(git(e.remoto, ...ARGUMENTOS_DE_COMMITS).split('\n')).toHaveLength(1);
    // Y el texto para que GitHub borre lo que guarda en caché
    expect(hecho.todo).toContain('support.github.com');
    expect(hecho.todo).toContain('Old history: 3 commits');

    // Otra vez: ya es un solo commit, no hay nada que rehacer
    const otra = correr(e, '--rehacer');
    expect(otra.codigo, otra.todo).toBe(0);
    expect(otra.todo).toContain('ya es un solo commit');
    expect(git(e.estudio, 'rev-parse', 'main')).toBe(ahora);
  });

  it('se niega sin tocar nada con cambios sin guardar, o si lo publicado trae commits que aquí no están', { timeout: 120_000 }, () => {
    const e = armar();
    const antes = git(e.estudio, 'rev-parse', 'main');
    writeFileSync(join(e.estudio, 'a.txt'), 'cambiado sin commit\n');
    const sucio = correr(e, '--rehacer');
    expect(sucio.codigo).toBe(1);
    expect(sucio.todo).toContain('cambios sin guardar');
    expect(sucio.todo).toContain('No cambié nada');
    git(e.estudio, 'checkout', '-q', '--', 'a.txt');

    // Alguien subió otra cosa desde otro clon
    const otro = join(e.estudio, '..', 'otro');
    git(join(e.estudio, '..'), 'clone', '-q', e.remoto, otro);
    writeFileSync(join(otro, 'b.txt'), 'de otro lado\n');
    git(otro, 'add', 'b.txt');
    git(otro, 'commit', '-q', '-m', 'de otro lado');
    git(otro, 'push', '-q', 'origin', 'main');
    const ajeno = git(otro, 'rev-parse', 'main');
    const encima = correr(e, '--rehacer');
    expect(encima.codigo).toBe(1);
    expect(encima.todo).toContain('tiene commits que aquí no están');
    expect(git(e.estudio, 'rev-parse', 'main')).toBe(antes);
    expect(git(e.remoto, 'rev-parse', 'main')).toBe(ajeno);
    expect(git(e.estudio, 'branch', '--list', `${RESPALDO_DE_HISTORIA}*`)).toBe('');
  });
});
