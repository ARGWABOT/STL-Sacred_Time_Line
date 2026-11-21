// «← Volver a tu misión» aparece siempre que un paso lleva a otro lugar del Studio (nota de voz del titular nmvt2cfkktit,
// 29 de octubre de 2026): cada clase de destino de un paso, recorrida, con el caso que falló.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { desdeElPaso, flotaVolver, type DestinoDePaso } from './volverMision';

const director = readFileSync(join(__dirname, 'app.ts'), 'utf-8');

/** Cada destino de un paso que cambia de lugar, con la sección a la que llega y el documento que se ve ahí. */
const CAMBIAN: [string, DestinoDePaso, string, string | null][] = [
  ['un documento del director', { doc: 'docs/director/x.md' }, 'documentos', 'docs/director/x.md'],
  ['una parte de un documento', { doc: 'docs/director/x.md' }, 'documentos', 'docs/director/x.md'],
  ['un documento del repositorio', { doc: 'repo:README.md' }, 'documentos', 'repo:README.md'],
  // El que falló: «Documentos» sin nombrar uno, y la persona abre el que quiere
  ['«Documentos», sin nombrar uno, al abrir cualquiera', { vista: 'documentos' }, 'documentos', 'docs/director/otro.md'],
  ['«Documentos», sin nombrar uno, antes de abrir ninguno', { vista: 'documentos' }, 'documentos', null],
  ['«Otros documentos»', { vista: 'documentos', ancla: 'd-otros' }, 'documentos', null],
  ['una fase en «La ruta»', { vista: 'ruta', ancla: 'r-plan' }, 'ruta', null],
  ['Proyecto, con su ancla', { vista: 'proyecto', ancla: 'p-objetivo' }, 'proyecto', null],
  ['«Modelo y consumo»', { vista: 'modelo', ancla: 'm-permisos' }, 'modelo', null],
  ['el Buzón', { vista: 'buzon' }, 'buzon', null],
  ['las preguntas', { vista: 'preguntas' }, 'preguntas', null],
];

describe('«← Volver a tu misión», en cada lugar al que lleva un paso', () => {
  it.each(CAMBIAN)('%s: flota mientras sigas ahí', (_, dest, seccion, abierto) => {
    const desde = desdeElPaso('t_x', dest, seccion);
    expect(desde?.id).toBe('t_x');
    expect(flotaVolver(desde, seccion, abierto)).toBe(true);
  });

  it('desde un documento nombrado, abrir otro lo deja atrás; en otra sección, no flota', () => {
    const desde = desdeElPaso('t_x', { doc: 'docs/director/x.md' }, 'documentos');
    expect(flotaVolver(desde, 'documentos', 'docs/director/otro.md')).toBe(false);
    expect(flotaVolver(desde, 'buzon', null)).toBe(false);
  });

  it('lo que no cambia de lugar no deja a dónde volver, y en las misiones nunca flota', () => {
    expect(desdeElPaso('t_x', { url: 'https://example.com' }, undefined)).toBeNull();
    expect(desdeElPaso('t_x', { vista: 'buzon', ancla: 'escribir' }, 'buzon')).toBeNull();
    expect(desdeElPaso('t_x', { vista: 'misiones', ancla: 'mision-t_y' }, 'misiones')).toBeNull();
    expect(flotaVolver({ id: 't_x', vista: 'ruta' }, 'misiones', null)).toBe(false);
    expect(flotaVolver(null, 'ruta', null)).toBe(false);
  });

  it('el Studio lo usa en los tres lugares: el botón del paso, cada sección y el lector, también sin documento abierto', () => {
    expect(director).toContain('desdeMision = desdeElPaso(deMision, dest, vistaDeDestino(dest)) ?? desdeMision;');
    expect(director).toContain("flotaVolver(desdeMision, vista, null) ? botonVolverMision(desdeMision?.id) : ''");
    expect(director).toContain("flotaVolver(desdeMision, 'documentos', ruta)");
    // El lector, con o sin documento abierto, se pinta en su módulo (pr_partir_modulos) y la página le da el botón
    expect(readFileSync(join(__dirname, 'vistaDocumentos.ts'), 'utf-8')).toMatch(/<\/div>\$\{volverAMisionDe\(null\)\}<\/div>`;/);
    expect(director).toContain('enParte, tarjetaNota, volverAMisionDe, ajustesLector, claseLector,');
  });
});
