// El candado de cada proyecto: un director a la vez, también entre copias del Studio y con la sesión del director
// (pedido pd_un_director). Las funciones puras y las de su archivo, en una carpeta temporal.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { ARCHIVO_CANDADO, anotarDirector, archivoDelCandado, candadoLibre, esDeQuien, leerCandado, quienLoTiene, renovarCandado, soltarCandado, tomarCandado, type Candado } from './candado';

const base = mkdtempSync(join(tmpdir(), 'stl-candado-'));
afterAll(() => rmSync(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));

const AHORA = Date.parse('2026-10-28T08:00:00.000Z');
const en = (min: number) => new Date(AHORA + min * 60_000).toISOString();
const ESTE = 'C:/Studio';
const OTRO = 'D:/otra-copia/Studio';
const sesion = (extra: Partial<Candado> = {}): Candado => ({ quien: 'sesion', estudio: ESTE, proyecto: 'p', tipo: 'revision', desde: en(0), hasta: en(120), ...extra });
const lanzado = (extra: Partial<Candado> = {}): Candado => ({ quien: 'studio', estudio: ESTE, proyecto: 'p', tipo: 'revision', desde: en(0), hasta: en(70), pid: 100, hijo: 200, registro: `${ESTE}/.revisiones/p-1.log`, ...extra });
const vivos = (...pids: number[]) => (pid: number) => pids.includes(pid);
let n = 0;
const archivo = () => join(base, `candado-${++n}.json`);

describe('el candado de un proyecto', () => {
  it('está libre si no hay, si pasó su hora o si el Studio que lo tomó ya no tiene vivos ni su servidor ni su director', () => {
    expect(candadoLibre(null, AHORA, vivos())).toBe(true);
    expect(candadoLibre(sesion({ hasta: en(-1) }), AHORA, vivos())).toBe(true);
    expect(candadoLibre(sesion(), AHORA, vivos())).toBe(false);
    expect(candadoLibre(lanzado(), AHORA, vivos(200))).toBe(false);
    expect(candadoLibre(lanzado(), AHORA, vivos(100))).toBe(false);
    expect(candadoLibre(lanzado(), AHORA, vivos())).toBe(true);
    // Uno sin hora que se entienda no detiene a nadie
    expect(candadoLibre(sesion({ hasta: 'nunca' }), AHORA, vivos())).toBe(true);
  });

  it('es del director lanzado por su registro, y de la sesión del mismo Studio; el de otro, no', () => {
    expect(esDeQuien(lanzado(), { estudio: ESTE, registro: `${ESTE}\\.revisiones\\p-1.log` })).toBe(true);
    expect(esDeQuien(lanzado(), { estudio: ESTE, registro: `${ESTE}/.revisiones/p-2.log` })).toBe(false);
    expect(esDeQuien(lanzado(), { estudio: ESTE })).toBe(false);
    expect(esDeQuien(sesion(), { estudio: 'c:\\studio\\' })).toBe(true);
    expect(esDeQuien(sesion(), { estudio: OTRO })).toBe(false);
    // El director que lanzó el Studio no es la sesión: la sesión de su mismo Studio lo detiene
    expect(esDeQuien(sesion(), { estudio: ESTE, registro: `${ESTE}/.revisiones/p-1.log` })).toBe(false);
  });

  it('dice quién lo tiene, en una frase', () => {
    expect(quienLoTiene(sesion(), { estudio: ESTE })).toMatch(/^La sesión del director está revisando este proyecto desde las /);
    expect(quienLoTiene(lanzado({ estudio: OTRO }), { estudio: ESTE })).toContain(`Un director que lanzó otra copia del Studio (${OTRO})`);
    expect(quienLoTiene(lanzado({ tipo: 'urgencia' }), { estudio: ESTE })).toContain('lo urgente de este proyecto');
  });

  it('se toma si está libre, se renueva si es suyo y no se toca si es de otro que sigue vivo', () => {
    const a = archivo();
    expect(tomarCandado(a, sesion(), AHORA, vivos())).toEqual({ tomado: true });
    // La misma sesión lo renueva: sigue desde cuando lo tomó, con su hora nueva
    expect(tomarCandado(a, sesion({ desde: en(30), hasta: en(150) }), AHORA + 30 * 60_000, vivos())).toEqual({ tomado: true });
    expect(leerCandado(a)).toMatchObject({ desde: en(0), hasta: en(150) });
    // El Studio no lanza otro director mientras la sesión revisa
    const r = tomarCandado(a, lanzado(), AHORA + 40 * 60_000, vivos(100, 200));
    expect(r).toMatchObject({ tomado: false, de: { quien: 'sesion' } });
    // Pasada su hora, la sesión que no cerró ya no detiene a nadie
    expect(tomarCandado(a, lanzado({ hasta: en(300) }), AHORA + 151 * 60_000, vivos(100, 200))).toEqual({ tomado: true });
    expect(leerCandado(a)?.quien).toBe('studio');
  });

  it('el de otra copia del Studio detiene a este, y el del director lanzado detiene a la sesión', () => {
    const a = archivo();
    expect(tomarCandado(a, lanzado({ estudio: OTRO, registro: `${OTRO}/.revisiones/p-9.log` }), AHORA, vivos(100))).toEqual({ tomado: true });
    expect(tomarCandado(a, lanzado(), AHORA, vivos(100))).toMatchObject({ tomado: false });
    expect(tomarCandado(a, sesion(), AHORA, vivos(100))).toMatchObject({ tomado: false });
    // Muertos su servidor y su director, se toma aunque no haya pasado su hora
    expect(tomarCandado(a, sesion(), AHORA, vivos())).toEqual({ tomado: true });
  });

  it('anota al director lanzado y se suelta solo por quien lo tiene', () => {
    const a = archivo();
    tomarCandado(a, lanzado({ hijo: undefined }), AHORA, vivos(100));
    anotarDirector(a, `${ESTE}/.revisiones/otro.log`, 300);
    expect(leerCandado(a)?.hijo).toBeUndefined();
    anotarDirector(a, `${ESTE}/.revisiones/p-1.log`, 300);
    expect(leerCandado(a)?.hijo).toBe(300);
    soltarCandado(a, { estudio: ESTE });
    expect(existsSync(a)).toBe(true);
    soltarCandado(a, { estudio: ESTE, registro: `${ESTE}/.revisiones/p-1.log` });
    expect(existsSync(a)).toBe(false);
  });

  it('el parche lo renueva si es suyo, se detiene si es de otro vivo y, si no hay, no lo crea', () => {
    const a = archivo();
    expect(renovarCandado(a, { estudio: ESTE }, en(200), AHORA, vivos())).toEqual({ tomado: true });
    expect(existsSync(a)).toBe(false);
    tomarCandado(a, lanzado({ tipo: 'urgencia' }), AHORA, vivos(100));
    expect(renovarCandado(a, { estudio: ESTE }, en(200), AHORA, vivos(100))).toMatchObject({ tomado: false, de: { quien: 'studio' } });
    expect(renovarCandado(a, { estudio: ESTE, registro: `${ESTE}/.revisiones/p-1.log` }, en(200), AHORA, vivos(100))).toEqual({ tomado: true });
    // Renovarlo no cambia qué es ni quién lo tiene: solo su hora, la más tarde
    expect(leerCandado(a)).toMatchObject({ tipo: 'urgencia', quien: 'studio', pid: 100, hasta: en(200) });
    expect(renovarCandado(a, { estudio: ESTE, registro: `${ESTE}/.revisiones/p-1.log` }, en(10), AHORA, vivos(100))).toEqual({ tomado: true });
    expect(leerCandado(a)?.hasta).toBe(en(200));
  });

  it('uno que no se entiende, o sin carpeta de git, no detiene a nadie', () => {
    const a = archivo();
    writeFileSync(a, 'no es json');
    expect(tomarCandado(a, sesion(), AHORA, vivos())).toEqual({ tomado: true });
    expect(leerCandado(a)?.quien).toBe('sesion');
    expect(tomarCandado(null, sesion(), AHORA, vivos())).toEqual({ tomado: true });
  });

  it('lo toman el lanzador antes de marcar y lanzar, y la bandeja al empezar cada encargo; lo sueltan al terminar, de la forma que sea', () => {
    const leer = (ruta: string) => readFileSync(join(import.meta.dirname, '..', '..', ruta), 'utf8');
    const revisor = leer('estudio/servidor/revisor.ts');
    const lanzar = revisor.slice(revisor.indexOf('private async lanzar('));
    const toma = lanzar.indexOf('tomarCandado(candado');
    expect(toma).toBeGreaterThan(0);
    expect(toma).toBeLessThan(lanzar.indexOf('marcarLanzada(this.raiz, proyecto'));
    expect(toma).toBeLessThan(lanzar.indexOf('lanzarClaude('));
    // Si no lo tomó, no deja nada marcado ni el turno tomado: espera, y el reloj lo vuelve a intentar
    expect(lanzar.slice(toma, lanzar.indexOf('this.hijo = proyecto'))).toContain('soltarTurno(turno)');
    expect(lanzar.slice(lanzar.indexOf('const fin = async'))).toContain('soltarCandado(candado, { estudio: this.raiz, registro: archivo })');
    const bandeja = leer('tools/director/bandeja.ts');
    for (const tipo of ["alEmpezar, 'revision'", "elegido, 'urgencia'", "elegido, 'aclaracion'"]) expect(bandeja).toContain(`await tomarElCandado(${tipo});`);
    expect(bandeja.match(/await soltarElCandado\(elegido\);/g)?.length, 'la revisión, la urgencia y la aclaración lo sueltan al cerrar').toBe(3);
  });

  it('vive en la carpeta de git común del repositorio, también si el proyecto es un worktree', () => {
    const repo = join(base, 'repo');
    execFileSync('git', ['init', '-q', repo]);
    execFileSync('git', ['-c', 'user.name=Prueba', '-c', 'user.email=prueba@example.com', 'commit', '-q', '--allow-empty', '-m', 'inicio'], { cwd: repo });
    expect(archivoDelCandado(repo)?.replace(/\\/g, '/')).toBe(join(repo, '.git', ARCHIVO_CANDADO).replace(/\\/g, '/'));
    const arbol = join(base, 'arbol');
    execFileSync('git', ['worktree', 'add', '-q', '-b', 'otra', arbol], { cwd: repo });
    expect(archivoDelCandado(arbol)?.replace(/\\/g, '/').toLowerCase()).toBe(join(repo, '.git', ARCHIVO_CANDADO).replace(/\\/g, '/').toLowerCase());
    expect(archivoDelCandado(join(base))).toBeNull();
  });
});
