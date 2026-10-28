// Un director a la vez en cada proyecto, de punta a punta (pedido pd_un_director): la bandeja corrida de verdad, como
// proceso aparte, sobre un Estudio y un proyecto temporales. Con el candado del proyecto en manos de otro director que
// sigue trabajando (la sesión del director de otra copia del Studio, o un director lanzado), la revisión no empieza y el
// parche no se aplica; con uno abandonado, la sesión lo toma a su nombre, y su parche lo renueva.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { ARCHIVO_CANDADO, type Candado } from '../../src/director/candado.ts';
import { armarEstudioDePrueba } from './estudioDePrueba.ts';

const ID = 'prueba-candado';
const base = mkdtempSync(join(tmpdir(), 'estudio-candado-'));
afterAll(() => rmSync(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));

const en = (min: number) => new Date(Date.now() + min * 60_000).toISOString();
/** Un proceso que no existe: el número más alto que admite Windows, que nunca se reparte. */
const MUERTO = 2 ** 31 - 2;

describe('el candado del proyecto en la bandeja', () => {
  it('con otro director trabajando en el proyecto, la revisión no empieza ni el parche se aplica; abandonado, la sesión lo toma', async () => {
    const e = await armarEstudioDePrueba(base, { id: ID, notas: [] });
    const archivo = join(e.repo, '.git', ARCHIVO_CANDADO);
    const poner = (c: Candado) => writeFileSync(archivo, JSON.stringify(c));
    const leer = () => JSON.parse(readFileSync(archivo, 'utf8')) as Candado;

    // La sesión del director de otra copia del Studio está revisando este proyecto
    poner({ quien: 'sesion', estudio: join(base, 'otra-copia'), proyecto: ID, tipo: 'revision', desde: en(-5), hasta: en(60) });
    const antes = e.textoDelPlan();
    const r = e.bandeja('--sin-transcribir');
    expect(r.codigo, r.salida).toBe(1);
    expect(r.errores).toContain('No empiezo: La sesión del director de otra copia del Studio');
    expect(r.errores).toContain('trabaja un director a la vez en cada proyecto');
    writeFileSync(join(e.memoria, 'director', 'cambios.json'), JSON.stringify({ mensaje: { fecha: '2026-10-28', texto: '- **Sobre la prueba:** no debía aplicarse.' } }));
    const a = e.bandeja('--aplicar');
    expect(a.codigo).toBe(1);
    expect(a.errores).toContain('No se aplicó: La sesión del director de otra copia del Studio');
    expect(e.textoDelPlan(), 'con otro director trabajando, nadie escribe el plan a su lado').toBe(antes);

    // Un director lanzado por el Studio cuyo servidor y cuyo proceso ya no existen: abandonado, aunque no haya pasado su hora
    poner({ quien: 'studio', estudio: join(base, 'otra-copia'), proyecto: ID, tipo: 'revision', desde: en(-30), hasta: en(150), pid: MUERTO, hijo: MUERTO, registro: join(base, 'otra-copia', '.revisiones', 'x.log') });
    const b = e.bandeja('--sin-transcribir');
    expect(b.codigo, b.errores).toBe(0);
    expect(leer()).toMatchObject({ quien: 'sesion', estudio: e.estudio, proyecto: ID, tipo: 'revision' });

    // El parche de la misma sesión lo renueva, y se aplica
    const hasta = leer().hasta;
    await new Promise((ok) => setTimeout(ok, 20));
    const c = e.bandeja('--aplicar');
    expect(c.codigo, c.errores).toBe(0);
    expect(Date.parse(leer().hasta)).toBeGreaterThan(Date.parse(hasta));
    expect(existsSync(archivo)).toBe(true);
  }, 120_000);
});
