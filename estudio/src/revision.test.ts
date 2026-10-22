import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const director = readFileSync(join(__dirname, 'director.ts'), 'utf-8');
const tramo = (desde: string, hasta: string) => director.slice(director.indexOf(desde), director.indexOf(hasta, director.indexOf(desde)));

describe('«Pedir revisión» nunca mientras un director vive (nota de voz del titular, 22 de octubre de 2026)', () => {
  it('la cabecera pone, en lugar del botón, qué corre y por qué, sin clic', () => {
    const boton = tramo('function botonRevision', 'async function mostrarFalla');
    const ocupado = boton.indexOf('if (ocupado) return');
    expect(ocupado).toBeGreaterThan(0);
    // El estado va antes del botón, y no lleva nada que pida
    expect(ocupado).toBeLessThan(boton.indexOf('data-revision="pedir" title='));
    expect(boton.slice(ocupado, boton.indexOf('\n', ocupado))).not.toContain('data-revision');
    // «Pedirla de nuevo» de una revisión fallida, tampoco
    expect(boton).toContain("r?.error && !ocupado ? '<button type=\"button\" class=\"enlace\" data-revision=\"pedir\">Pedirla de nuevo");
  });

  it('dice si es el de este proyecto, que termina lo último, o uno de otro proyecto, con su porqué', () => {
    const f = tramo('function directorOcupado', 'function minutosSinActividad');
    expect(f).toContain('El director termina lo último');
    expect(f).toContain('Un director trabaja en otro proyecto');
    expect(f).toContain('a la vez');
  });

  it('ni el diálogo de la entrega, ni el de la revisión fallida, ni ningún otro camino la piden con un director vivo', () => {
    const entrega = tramo('async function completarSiToca', 'async function nuevoProyecto');
    expect(entrega).toMatch(/const enMarcha = revisando\(\) \|\| !!ocupado/);
    const falla = tramo('async function mostrarFalla', 'async function pedirAclaracion');
    expect(falla).toContain("${ocupado ? '' : `<button type=\"button\" data-nota");
    const pedir = tramo('async function pedirLaRevision', 'function pintarNavegacion');
    expect(pedir.indexOf('directorOcupado()')).toBeLessThan(pedir.indexOf('fetch('));
  });
});
