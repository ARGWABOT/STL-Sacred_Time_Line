// Ninguna regla del titular sin dueño (propuesta aceptada pr_cierre_vigilado, punto 6): cada cita suya en CLAUDE.md tiene
// su regla en el inventario, y lo que la vigila existe.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CITA_DEL_TITULAR, REGLAS_DEL_TITULAR } from './reglasDelTitular';

const raiz = join(import.meta.dirname, '..', '..');
const leer = (ruta: string) => readFileSync(join(raiz, ruta), 'utf8');
const claude = leer('CLAUDE.md');
/** Lo más lejos que puede estar una cita de la frase de su regla: la misma parte de CLAUDE.md. */
const LEJOS = 1500;

describe('el inventario de las reglas del titular', () => {
  it('cada regla dice dónde está en CLAUDE.md, con sus citas cerca', () => {
    const ids = new Set<string>();
    for (const r of REGLAS_DEL_TITULAR) {
      expect(ids.has(r.id), `${r.id} está dos veces`).toBe(false);
      ids.add(r.id);
      const f = claude.indexOf(r.frase);
      expect(f, `«${r.frase}» (${r.id}) no está en CLAUDE.md`).toBeGreaterThanOrEqual(0);
      let desde = f;
      for (const c of r.citas) {
        const i = claude.indexOf(c, desde);
        expect(i >= 0 && i - f < LEJOS, `la cita «${c}» de ${r.id} no está después de su frase`).toBe(true);
        desde = i + c.length;
      }
    }
  });

  it('ninguna cita del titular en CLAUDE.md queda sin su regla en el inventario', () => {
    const duenas = new Set<number>();
    for (const r of REGLAS_DEL_TITULAR) {
      let desde = claude.indexOf(r.frase);
      for (const c of r.citas) {
        const i = claude.indexOf(c, desde);
        duenas.add(i);
        desde = i + c.length;
      }
    }
    const sinDueno = [...claude.matchAll(CITA_DEL_TITULAR)].filter((m) => !duenas.has(m.index!)).map((m) => `${m[0].slice(0, 90)}…`);
    expect(sinDueno, 'una regla del titular sin su dueño: súmala a REGLAS_DEL_TITULAR, con lo que la vigila').toEqual([]);
  });

  it('lo que vigila cada regla existe: su archivo con lo que la vigila, su prueba o su caso fijo; y la que no tiene, dice por qué', () => {
    const casos = leer('src/director/casosFijos.ts');
    for (const r of REGLAS_DEL_TITULAR) {
      expect(r.vigila.length > 0 || !!r.sinGuardia?.trim(), `${r.id} no dice qué la vigila ni por qué nada`).toBe(true);
      for (const g of r.vigila) {
        const caso = /^caso (c_[a-z_]+)$/.exec(g);
        if (caso) {
          expect(casos, `${r.id}: el caso ${caso[1]} no existe`).toContain(`id: '${caso[1]}'`);
          continue;
        }
        const [archivo, que] = g.split(' › ');
        expect(existsSync(join(raiz, archivo)), `${r.id}: ${archivo} no existe`).toBe(true);
        if (que) expect(leer(archivo).includes(que), `${r.id}: ${archivo} ya no tiene «${que}»`).toBe(true);
      }
    }
  });
});
