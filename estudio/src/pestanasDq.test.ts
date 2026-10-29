import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Nota, Respuesta } from '../../src/director/director';
import { lineaDeRespuesta, lineasDeRespuestas, pestanaActiva, pestanaDeSeccion, pestanasConAlgo } from './pestanasDq';

// «¿Dónde quedamos?» por pestañas, según el tipo de lo que se respondió (pedido pd_pestanas_donde_quedamos, parte 3 de
// la propuesta aceptada pr_tipo_nota; nota de voz del titular nmvkb2pnetit)
const nota = (id: string, tipo?: Nota['tipo'], sobre: Nota['sobre'] = { tipo: 'general' }): Nota => ({ id, cuando: '2026-10-28T10:00:00.000Z', quien: 'leonc', sobre, texto: 'Algo.', ...(tipo ? { tipo } : {}) });
const resp = (cuando: string, texto: string, extra: Partial<Respuesta> = {}): Respuesta => ({ cuando, texto, tratamiento: 'integrada', ...extra });

describe('«¿Dónde quedamos?» por pestañas', () => {
  it('cada respuesta desde tu última visita va en la pestaña de su tipo, la más nueva primero; lo de antes no', () => {
    const notas = [nota('n1', 'ajuste'), nota('n2', 'falla'), nota('n3'), nota('n4', 'idea'), nota('n5', undefined, { tipo: 'pregunta' })];
    const respuestas = {
      n1: resp('2026-10-29T02:00:00.000Z', 'Hecho: el botón ya es verde.'),
      n2: resp('2026-10-29T02:05:00.000Z', 'Arreglado.'),
      n3: resp('2026-10-29T02:01:00.000Z', 'Anotado.'),
      n4: resp('2026-10-27T00:00:00.000Z', 'Para después.'),
      n5: resp('2026-10-29T02:02:00.000Z', '**Sí.** Así funciona.'),
    };
    expect(lineasDeRespuestas(notas, respuestas, '2026-10-28T12:00:00.000Z')).toEqual([
      { seccion: 'r-falla', texto: 'Arreglado.' },
      { seccion: 'r-pregunta', texto: '**Sí.** Así funciona.' },
      { seccion: 'r-otras', texto: 'Anotado.' },
      { seccion: 'r-ajuste', texto: 'Hecho: el botón ya es verde.' },
    ]);
  });

  it('una nota respondida por partes deja una línea por parte, en la pestaña de cada una', () => {
    const r = resp('2026-10-29T02:00:00.000Z', 'Las dos cosas.', { partes: [{ tipo: 'ajuste', texto: 'Cambiado.', tratamiento: 'integrada' }, { tipo: 'idea', texto: 'Guardada.', tratamiento: 'aplazada' }] });
    expect(lineasDeRespuestas([nota('n1', 'ajuste')], { n1: r }, '')).toEqual([{ seccion: 'r-ajuste', texto: 'Cambiado.' }, { seccion: 'r-idea', texto: 'Guardada.' }]);
  });

  it('cada respuesta, en una línea: su primer párrafo, sin enlaces, recortada en una palabra y con su negrilla cerrada', () => {
    expect(lineaDeRespuesta('**Hecho.** Ver [el commit](https://x).\n\nOtro párrafo.')).toBe('**Hecho.** Ver el commit.');
    const larga = lineaDeRespuesta(`**${'palabra '.repeat(60)}**`);
    expect(larga.length).toBeLessThan(290);
    expect(larga.endsWith('**…')).toBe(true);
  });

  it('solo se ven las pestañas que traen algo, en tu orden, y se abre primero la que trae algo nuevo', () => {
    expect(pestanaDeSeccion('r-falla')).toBe('falla');
    expect(pestanaDeSeccion('avanzamos')).toBe('ruta');
    expect(pestanaDeSeccion('director')).toBe('ruta');
    expect(pestanasConAlgo(['ruta', 'idea', 'pregunta'])).toEqual(['pregunta', 'idea', 'ruta']);
    expect(pestanaActiva(['ruta', 'falla'])).toBe('falla');
    // La que abriste se queda mientras traiga algo; si se vació, la siguiente
    expect(pestanaActiva(['ruta', 'falla'], 'ruta')).toBe('ruta');
    expect(pestanaActiva(['ruta'], 'falla')).toBe('ruta');
    expect(pestanaActiva([])).toBeNull();
  });

  it('el diálogo las pinta: una pestaña por tipo y «La ruta», sus botones solo donde hay algo', () => {
    const pagina = readFileSync(join(__dirname, 'director.ts'), 'utf-8');
    expect(pagina).toContain('const respondidas = lineasDeRespuestas(');
    expect(pagina).toContain('data-dq-pestana="${p}"');
    expect(pagina).toContain('if (b.dataset.dqPestana) return mostrarPestanaDq(dlg, b.dataset.dqPestana as PestanaDq);');
    expect(pagina).toContain('mostrarPestanaDq(dlg, pestanaActiva(conAlgo, abierta) ?? abierta ?? null);');
  });
});
