// tools/subir-studio.ts de verdad, como proceso aparte, sobre un Studio temporal con su git y un repositorio de prueba en
// el lugar de GitHub (STL_SUBIR_URL, sin gh): nunca toca el Studio real ni sube a ninguna parte. Lo que se comprueba es
// lo que importa a quien sube (propuesta aceptada «Lo que se sube, limpio y firmado desde el commit», punto 1): lo que va
// firmado se sube tal cual, sin reescribir nada; lo que no va firmado no se sube, y firmarlo es un paso aparte, con su
// respaldo y solo de lo que aún no está en la nube.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { FIRMA } from './firma.ts';

// Git sin la configuración de esta persona ni la del sistema, y sin lo que git deja a quien corre dentro de un hook suyo
// (como en cambiar-correo.test.ts): solo cambia el entorno de este archivo de pruebas, y se restaura al final
const base = mkdtempSync(join(tmpdir(), 'estudio-subir-'));
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

const HERRAMIENTA = join(import.meta.dirname, 'subir-studio.ts');
const FIRMADO = { GIT_AUTHOR_NAME: FIRMA.nombre, GIT_AUTHOR_EMAIL: FIRMA.correo, GIT_COMMITTER_NAME: FIRMA.nombre, GIT_COMMITTER_EMAIL: FIRMA.correo };
const SIN_FIRMAR = { GIT_AUTHOR_NAME: 'Ana', GIT_AUTHOR_EMAIL: 'ana@trabajo.co', GIT_COMMITTER_NAME: 'Ana', GIT_COMMITTER_EMAIL: 'ana@trabajo.co' };
const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, ...FIRMADO }, windowsHide: true }).trim();

/** Un commit nuevo en el Studio de prueba, firmado o no. */
function commit(estudio: string, archivo: string, texto: string, firmado = true) {
  writeFileSync(join(estudio, archivo), texto);
  git(estudio, 'add', archivo);
  execFileSync('git', ['commit', '-q', '-m', `cambia ${archivo}`], { cwd: estudio, env: { ...process.env, ...(firmado ? FIRMADO : SIN_FIRMAR) }, windowsHide: true });
}

/** Un Studio con un commit firmado ya publicado en su «GitHub» de prueba. */
function armar() {
  const dir = mkdtempSync(join(base, 's-'));
  const remoto = join(dir, 'remoto.git');
  const estudio = join(dir, 'estudio');
  git(dir, 'init', '-q', '--bare', '-b', 'main', remoto);
  git(dir, 'init', '-q', '-b', 'main', estudio);
  commit(estudio, 'a.txt', 'uno\n');
  git(estudio, 'push', '-q', remoto, 'main:main');
  return { estudio, remoto };
}

function correr(e: { estudio: string; remoto: string }, ...args: string[]) {
  const r = spawnSync(process.execPath, [HERRAMIENTA, ...args], { cwd: e.estudio, env: { ...process.env, STL_RAIZ: e.estudio, STL_SUBIR_URL: e.remoto }, encoding: 'utf8', timeout: 60_000, windowsHide: true });
  expect(r.error, 'la herramienta no pudo correr').toBeUndefined();
  return { codigo: r.status, todo: `${r.stdout}\n${r.stderr}` };
}

describe('subir el Studio: solo comprueba y sube (pr_subida_limpia, punto 1)', () => {
  it('lo que va firmado se sube tal cual, sin cambiarle el código a nadie', { timeout: 120_000 }, () => {
    const e = armar();
    commit(e.estudio, 'b.txt', 'dos\n');
    const local = git(e.estudio, 'rev-parse', 'main');
    const vista = correr(e);
    expect(vista.codigo, vista.todo).toBe(0);
    expect(vista.todo).toContain(`Todos van firmados como ${FIRMA.nombre}`);
    expect(git(e.remoto, 'rev-parse', 'main')).not.toBe(local);
    const sube = correr(e, '--subir');
    expect(sube.codigo, sube.todo).toBe(0);
    // Lo publicado es exactamente lo de aquí: el mismo código, sin reescribir
    expect(git(e.estudio, 'rev-parse', 'main')).toBe(local);
    expect(git(e.remoto, 'rev-parse', 'main')).toBe(local);
    expect(correr(e, '--subir').todo).toContain('ya está al día');
  });

  it('lo que no va firmado no se sube; firmarlo es aparte, con su respaldo y solo de lo que aún no subió', { timeout: 120_000 }, () => {
    const e = armar();
    const publicado = git(e.estudio, 'rev-parse', 'main');
    commit(e.estudio, 'b.txt', 'sin firmar\n', false);
    const antes = git(e.estudio, 'rev-parse', 'main');
    // Sin --subir lo dice; con --subir no sube, y nada cambia
    expect(correr(e).todo).toContain('--firmar');
    const sube = correr(e, '--subir');
    expect(sube.codigo).toBe(1);
    expect(sube.todo).toContain('NO SUBÍ');
    expect(git(e.remoto, 'rev-parse', 'main')).toBe(publicado);
    expect(git(e.estudio, 'rev-parse', 'main')).toBe(antes);
    // --firmar: lo firma, con la historia de antes en su rama de respaldo, y no sube
    const firma = correr(e, '--firmar');
    expect(firma.codigo, firma.todo).toBe(0);
    expect(git(e.estudio, 'log', '-1', '--format=%an <%ae> | %cn <%ce>', 'main')).toBe(`${FIRMA.nombre} <${FIRMA.correo}> | ${FIRMA.nombre} <${FIRMA.correo}>`);
    expect(git(e.estudio, 'rev-parse', 'main~1')).toBe(publicado);
    const respaldo = git(e.estudio, 'branch', '--list', '--format=%(refname:short)', 'respaldo/antes-de-firmar-*');
    expect(git(e.estudio, 'rev-parse', respaldo)).toBe(antes);
    expect(git(e.remoto, 'rev-parse', 'main')).toBe(publicado);
    // Ya firmado, sube
    expect(correr(e, '--subir').codigo).toBe(0);
    expect(git(e.remoto, 'rev-parse', 'main')).toBe(git(e.estudio, 'rev-parse', 'main'));
  });
});
