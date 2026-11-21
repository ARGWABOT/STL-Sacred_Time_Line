import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { anotarVersionBuena, gitDe, infoDeVuelta, leerVersionBuena, ramaDeRespaldo, tocaLaMemoria, volverALaVersion } from './volver.ts';

const carpetas: string[] = [];
afterEach(() => { for (const c of carpetas.splice(0)) rmSync(c, { recursive: true, force: true }); });

/** Un Studio de juguete: un repositorio con su .gitignore (la memoria y .estudio/ fuera de git), como el de verdad. */
function studio() {
  const ruta = mkdtempSync(join(tmpdir(), 'stl-volver-'));
  carpetas.push(ruta);
  const git = (...args: string[]) => execFileSync('git', args, { cwd: ruta, encoding: 'utf8' }).trim();
  git('init', '-q');
  git('config', 'user.name', 'Prueba');
  git('config', 'user.email', 'prueba@example.com');
  git('config', 'commit.gpgsign', 'false');
  const escribir = (n: string, t: string) => { mkdirSync(join(ruta, n, '..'), { recursive: true }); writeFileSync(join(ruta, n), t); };
  escribir('.gitignore', '.stl/\nproyectos/\n.estudio/\n');
  escribir('app.ts', 'funciona');
  git('add', '-A');
  git('commit', '-q', '-m', 'STL: la que funciona');
  return { ruta, git, escribir, estudio: join(ruta, '.estudio'), leer: (n: string) => readFileSync(join(ruta, n), 'utf8') };
}

describe('volver a la versión que funcionaba (pd_salud_a)', () => {
  it('anota la versión que cargó, solo si no hay cambios sin commit en lo que git guarda', async () => {
    const s = studio();
    s.escribir('app.ts', 'a medias');
    expect(await anotarVersionBuena(s.estudio, gitDe(s.ruta))).toBeNull();
    expect(leerVersionBuena(s.estudio)).toBeNull();
    s.git('checkout', '--', 'app.ts');
    const v = await anotarVersionBuena(s.estudio, gitDe(s.ruta), '2026-11-09T20:00:00.000Z');
    expect(v).toEqual({ commit: s.git('rev-parse', 'HEAD'), cuando: '2026-11-09T20:00:00.000Z' });
    expect(leerVersionBuena(s.estudio)).toEqual(v);
  });

  it('sin una versión anotada, o ya en ella, no hay a dónde volver', async () => {
    const s = studio();
    expect(await infoDeVuelta(s.estudio, gitDe(s.ruta))).toEqual({ estado: 'sin_version' });
    await anotarVersionBuena(s.estudio, gitDe(s.ruta));
    expect(await infoDeVuelta(s.estudio, gitDe(s.ruta))).toEqual({ estado: 'ya_esta' });
  });

  it('muestra la versión primero (nmw9oexiptit), y vuelve con un commit nuevo sin reescribir la historia ni tocar la memoria', async () => {
    const s = studio();
    await anotarVersionBuena(s.estudio, gitDe(s.ruta));
    const bueno = s.git('rev-parse', 'HEAD');
    s.escribir('app.ts', 'rota');
    s.escribir('nuevo.ts', 'llegó después');
    s.git('add', '-A');
    s.git('commit', '-q', '-m', 'STL: la que rompió');
    const roto = s.git('rev-parse', 'HEAD');
    // La memoria de un proyecto, fuera de git: no se toca
    s.escribir('.stl/director/plan.json', '{"de":"la persona"}');
    const info = await infoDeVuelta(s.estudio, gitDe(s.ruta));
    expect(info).toMatchObject({ estado: 'lista', commit: bueno, corto: bueno.slice(0, 7), despues: 1, sinGuardar: 0 });
    const r = await volverALaVersion(s.estudio, gitDe(s.ruta), bueno);
    expect(r).toMatchObject({ estado: 'hecha', respaldo: null });
    expect(s.leer('app.ts')).toBe('funciona');
    expect(existsSync(join(s.ruta, 'nuevo.ts'))).toBe(false);
    // Un commit nuevo, hijo del roto: la historia sigue entera
    expect(s.git('rev-parse', 'HEAD^')).toBe(roto);
    expect(s.git('log', '-1', '--format=%s')).toContain('Studio: goes back to the version that worked');
    expect(s.git('rev-parse', 'HEAD^{tree}')).toBe(s.git('rev-parse', `${bueno}^{tree}`));
    expect(s.leer('.stl/director/plan.json')).toBe('{"de":"la persona"}');
  });

  it('guarda los cambios sin commit en una rama de respaldo antes de volver (nmw9oenmatit)', async () => {
    const s = studio();
    await anotarVersionBuena(s.estudio, gitDe(s.ruta));
    s.escribir('app.ts', 'rota');
    s.git('commit', '-q', '-am', 'STL: la que rompió');
    s.escribir('app.ts', 'arreglo a medias');
    s.escribir('suelto.ts', 'sin commit');
    s.escribir('.stl/nota.txt', 'memoria');
    const info = await infoDeVuelta(s.estudio, gitDe(s.ruta));
    expect(info).toMatchObject({ estado: 'lista', sinGuardar: 2 });
    const r = await volverALaVersion(s.estudio, gitDe(s.ruta), undefined, '2026-11-09T20:15:30.123Z');
    expect(r).toMatchObject({ estado: 'hecha', respaldo: 'respaldo/antes-de-volver-20261109-201530' });
    expect(s.leer('app.ts')).toBe('funciona');
    // Lo que no tenía commit quedó en la rama, entero, y la memoria ni entró en ella ni se tocó
    expect(s.git('show', 'respaldo/antes-de-volver-20261109-201530:app.ts')).toBe('arreglo a medias');
    expect(s.git('show', 'respaldo/antes-de-volver-20261109-201530:suelto.ts')).toBe('sin commit');
    expect(s.git('ls-tree', '-r', '--name-only', 'respaldo/antes-de-volver-20261109-201530')).not.toContain('.stl');
    expect(s.leer('.stl/nota.txt')).toBe('memoria');
  });

  it('no vuelve si la versión cambió desde que se mostró, ni si tocaría la memoria', async () => {
    const s = studio();
    await anotarVersionBuena(s.estudio, gitDe(s.ruta));
    s.escribir('app.ts', 'rota');
    s.git('commit', '-q', '-am', 'STL: la que rompió');
    expect(await volverALaVersion(s.estudio, gitDe(s.ruta), 'f'.repeat(40))).toMatchObject({ estado: 'no_sirve' });
    expect(s.leer('app.ts')).toBe('rota');
    expect(tocaLaMemoria(['app.ts', '.stl/director/plan.json', 'proyectos/x/plan.json', '.stlx'])).toEqual(['.stl/director/plan.json', 'proyectos/x/plan.json']);
  });

  it('nombra la rama de respaldo con la hora', () => {
    expect(ramaDeRespaldo('2026-11-09T07:05:09.000Z')).toBe('respaldo/antes-de-volver-20261109-070509');
  });
});
