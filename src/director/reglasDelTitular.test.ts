// Ninguna regla del titular sin dueño (propuesta aceptada pr_cierre_vigilado, punto 6): cada regla del inventario está en
// CLAUDE.md, con su historia aquí y no en CLAUDE.md ni en los procedimientos del director (pedido pd_purga_reglas), y lo
// que la vigila existe.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PROCEDIMIENTOS } from './procedimientos';
import { REGLAS_DEL_TITULAR } from './reglasDelTitular';

const raiz = join(import.meta.dirname, '..', '..');
const leer = (ruta: string) => readFileSync(join(raiz, ruta), 'utf8');
const claude = leer('CLAUDE.md');

describe('el inventario de las reglas del titular', () => {
  it('cada regla dice dónde está en CLAUDE.md, y de dónde salió', () => {
    const ids = new Set<string>();
    for (const r of REGLAS_DEL_TITULAR) {
      expect(ids.has(r.id), `${r.id} está dos veces`).toBe(false);
      ids.add(r.id);
      expect(claude.indexOf(r.frase), `«${r.frase}» (${r.id}) no está en CLAUDE.md`).toBeGreaterThanOrEqual(0);
      expect(r.historia.length > 0 && r.historia.every((h) => h.trim().length > 0), `${r.id} no dice de dónde salió`).toBe(true);
    }
  });

  it('CLAUDE.md sin historia: ni fechas, ni notas, ni citas de quién lo pidió (la historia vive en el inventario)', () => {
    const historia = [
      /\b20\d\d\b/g, // un año
      /\bnm[a-z0-9]{8,10}tit\b/g, // el id de una nota
      /\bp[rd]_[a-z_]+/g, // el id de una propuesta o un pedido
      /\b(?:del titular|por el titular|owner's (?:voice )?note|owner's (?:rule|decision))\b/g,
    ];
    const halladas = historia.flatMap((re) => [...claude.matchAll(re)].map((m) => claude.slice(Math.max(0, m.index! - 40), m.index! + 40).replace(/\n/g, ' ')));
    expect(halladas, 'CLAUDE.md volvió a traer historia: va en REGLAS_DEL_TITULAR › historia').toEqual([]);
  });

  it('los procedimientos del director, en inglés, sin historia: ni notas, ni pedidos, ni citas de quién lo pidió', () => {
    // Sin buscar años: deciding.md cita libros con su año. «accepted proposal» solo con su id o su título: una propuesta
    // aceptada también es una cosa del plan, y los procedimientos la nombran. El formato de un pedido, `"pd_…"`, no trae letras.
    const historia = [
      /\bnm[a-z0-9]{8,10}tit\b/g, // el id de una nota
      /\bp[rd]_[a-z_]+/g, // el id de una propuesta o un pedido
      /the owner's (?:voice note|note|decision|rule)/gi,
      /accepted proposal\s+(?:pr_|[«"])/gi,
      /request pd_/gi,
    ];
    const halladas = Object.values(PROCEDIMIENTOS).flatMap(({ archivo }) => {
      const texto = leer(archivo);
      return historia.flatMap((re) => [...texto.matchAll(re)].map((m) => `${archivo}: ${texto.slice(Math.max(0, m.index! - 40), m.index! + 40).replace(/\n/g, ' ')}`));
    });
    expect(halladas, 'un procedimiento volvió a traer historia: va en REGLAS_DEL_TITULAR › historia').toEqual([]);
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
