import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { leerFrescosTexto, leerFrescoTexto } from './fresco';

const base = mkdtempSync(join(tmpdir(), 'estudio-fresco-'));
afterAll(() => rmSync(base, { recursive: true, force: true }));
const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', ['-c', 'core.autocrlf=false', ...args], { cwd, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 'P', GIT_AUTHOR_EMAIL: 'p@e.co', GIT_COMMITTER_NAME: 'P', GIT_COMMITTER_EMAIL: 'p@e.co' } }).trim();
const escribir = (raiz: string, ruta: string, texto: string) => {
  mkdirSync(join(raiz, ...ruta.split('/').slice(0, -1)), { recursive: true });
  writeFileSync(join(raiz, ...ruta.split('/')), texto);
};
const RUTAS = ['notas/a.txt', 'notas/b.txt', 'notas/c.txt', 'notas/d.txt', 'notas/falta.txt'];
/** Lo que leería el Studio uno por uno: la lectura en lote tiene que dar exactamente lo mismo. */
const unoPorUno = async (raiz: string) => new Map(await Promise.all(RUTAS.map(async (r) => [r, await leerFrescoTexto(raiz, r)] as const)));

describe('leer muchos textos de una vez (las transcripciones)', () => {
  it('sin GitHub, todo sale de la carpeta, igual que uno por uno', async () => {
    const raiz = join(base, 'solo');
    mkdirSync(raiz);
    git(raiz, 'init', '-q', '-b', 'main');
    for (const r of RUTAS.slice(0, 4)) escribir(raiz, r, `texto de ${r}`);
    git(raiz, 'add', '-A');
    git(raiz, 'commit', '-q', '-m', 'notas');
    escribir(raiz, 'notas/b.txt', 'corregida aquí, sin commit');
    const lote = await leerFrescosTexto(raiz, RUTAS);
    expect(lote).toEqual(await unoPorUno(raiz));
    expect(lote.get('notas/b.txt')).toBe('corregida aquí, sin commit');
    expect(lote.get('notas/falta.txt')).toBeNull();
  });

  it('con GitHub, lo que cambió allá se trae y lo propio sin subir se respeta, igual que uno por uno', async () => {
    const remoto = join(base, 'remoto.git');
    git(base, 'init', '-q', '--bare', '-b', 'main', remoto);
    const aqui = join(base, 'aqui');
    const otro = join(base, 'otro');
    mkdirSync(aqui);
    git(aqui, 'init', '-q', '-b', 'main');
    for (const r of RUTAS.slice(0, 4)) escribir(aqui, r, `texto de ${r}`);
    git(aqui, 'add', '-A');
    git(aqui, 'commit', '-q', '-m', 'notas');
    git(aqui, 'remote', 'add', 'origin', remoto);
    git(aqui, 'push', '-q', 'origin', 'main');
    // Otra persona corrige una transcripción y agrega una nota nueva
    git(base, 'clone', '-q', remoto, otro);
    escribir(otro, 'notas/a.txt', 'corregida en el otro computador');
    escribir(otro, 'notas/falta.txt', 'la nota de la otra persona');
    git(otro, 'add', '-A');
    git(otro, 'commit', '-q', '-m', 'del otro');
    git(otro, 'push', '-q', 'origin', 'main');
    git(aqui, 'fetch', '-q', 'origin');
    // Y aquí, una corrección propia sin commit
    escribir(aqui, 'notas/c.txt', 'corregida aquí');
    const lote = await leerFrescosTexto(aqui, RUTAS);
    expect(lote).toEqual(await unoPorUno(aqui));
    expect(lote.get('notas/a.txt')).toBe('corregida en el otro computador');
    expect(lote.get('notas/falta.txt')).toBe('la nota de la otra persona');
    expect(lote.get('notas/c.txt')).toBe('corregida aquí');
    expect(lote.get('notas/d.txt')).toBe('texto de notas/d.txt');
  });
});
