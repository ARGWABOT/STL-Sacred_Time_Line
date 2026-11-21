// «Listo» de un paso, después de comentarlo con su ✉ (nota de voz del titular nmw9klbthtit y nmw9kr49ftit, 9 de noviembre de
// 2026): en una misión de un solo paso, comentó el paso y «Listo» no hizo nada; «Hecho, compruébalo» sí avanzó. La
// bitácora del proyecto lo confirma: ningún clic en «Listo» llegó al servidor como paso marcado. «Listo» era un rótulo que
// envolvía la casilla escondida y dependía del clic que el navegador reenvía a ella; los demás botones del paso tienen su
// propio manejador. Ahora «Listo» es un botón más, que sigue el mismo camino que «Ya lo hice».
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { huellasDePasos, pasosVigentes, seccionPaso, type Mision } from '../../src/director/director';
import { completasSinEntregar } from './avisoMision';

const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf-8');
const tramo = (desde: string, hasta: string) => {
  const i = app.indexOf(desde);
  return app.slice(i, app.indexOf(hasta, i + desde.length));
};

describe('«Listo» marca el paso también después de comentarlo', () => {
  it('es un botón con su propio manejador, no un rótulo que depende del clic reenviado a la casilla', () => {
    const marca = tramo('function marcaPaso(', 'function opcionesPaso(');
    expect(marca).not.toMatch(/<label class="listo-paso"/);
    expect(marca).toContain('<button type="button" class="listo-paso" data-listo-paso="');
    // La casilla sigue, escondida: la usan «Listo», «Ya lo hice» y «Desmarcar»
    expect(marca).toContain('<input type="checkbox" hidden data-paso="');
  });

  it('el clic en «Listo» marca la casilla y dispara su cambio, como «Ya lo hice»', () => {
    const clic = tramo('} else if (ds.yaHice || ds.listoPaso) {', '} else if (ds.noSalio) {');
    expect(clic).toContain('(ds.yaHice || ds.listoPaso)');
    expect(clic).toContain('casilla.checked = true;');
    expect(clic).toContain("casilla.dispatchEvent(new Event('change', { bubbles: true }));");
  });

  it('el cambio de la casilla marca lo que ella dice, sin invertir lo que la página creía', () => {
    const cambio = tramo("const casilla = (e.target as HTMLElement).closest<HTMLInputElement>('[data-paso]');", "const s = (e.target as HTMLElement).closest<HTMLSelectElement>('[data-consulta]');");
    expect(cambio).toContain('marcarPaso(id, Number(i), casilla.checked)');
    expect(cambio).not.toMatch(/marcarPaso\(id, Number\(i\)\);/);
  });

  it('una misión de un solo paso, comentado con su ✉ y marcado con «Listo», queda completa y se entrega', () => {
    const m: Mision = {
      id: 't_un_paso', para: 'titular', fase: 'f', frente: 'x', titulo: 'Un paso', porQue: '', xp: 10, entrega: 'Lo dicho.',
      pasos: [{ texto: 'Cuéntame con el ✉ de este paso lo que pase. Luego oprime «Listo».', soloTu: 'Solo tú lo sabes.' }],
    };
    // El comentario del ✉ no marca el paso ni lo cambia: la huella del paso sigue igual
    const comentario = { sobre: { tipo: 'mision', id: m.id, seccion: seccionPaso(0) } };
    expect(comentario.sobre.seccion).toBe('Paso 1');
    const marca = { hechos: [0], huellas: huellasDePasos(m, [0]) };
    const hechos = (id: string) => (id === m.id ? pasosVigentes(m, marca) : []);
    expect(hechos(m.id)).toEqual([0]);
    expect(completasSinEntregar([m], hechos)).toEqual([m.id]);
  });
});
