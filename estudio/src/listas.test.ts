import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { abiertaEnLista, desplazamientoParaVer } from './listas';

const director = readFileSync(join(__dirname, 'director.ts'), 'utf-8');

describe('las listas no se pliegan solas al abrir algo (nota del titular, 22 de octubre de 2026)', () => {
  it('una parte abierta sigue abierta: ni abrir un elemento de otra parte ni un repintado la pliegan', () => {
    for (const porDefecto of [true, false]) expect(abiertaEnLista(true, porDefecto, false)).toBe(true);
  });

  it('la parte que recibe lo abierto se abre, aunque estuviera plegada', () => {
    expect(abiertaEnLista(false, false, true)).toBe(true);
    expect(abiertaEnLista(undefined, false, true)).toBe(true);
  });

  it('lo que quien mira plegó queda plegado mientras no le llegue lo abierto; la primera vez, como nace', () => {
    expect(abiertaEnLista(false, true, false)).toBe(false);
    expect(abiertaEnLista(undefined, true, false)).toBe(true);
    expect(abiertaEnLista(undefined, false, false)).toBe(false);
  });

  it('la columna se mueve solo lo justo para ver lo marcado, y nada si ya se ve', () => {
    const lista = { top: 100, bottom: 500 };
    expect(desplazamientoParaVer(lista, { top: 200, bottom: 240 })).toBe(0);
    // Debajo o encima de lo que se ve: queda en el medio de la columna
    const abajo = desplazamientoParaVer(lista, { top: 700, bottom: 740 });
    expect(700 - abajo + 20).toBe(300);
    const arriba = desplazamientoParaVer(lista, { top: 20, bottom: 60 });
    expect(20 - arriba + 20).toBe(300);
    // Más alto que la columna: queda arriba
    expect(desplazamientoParaVer(lista, { top: 600, bottom: 1200 })).toBe(500);
  });

  it('cada parte plegable de la columna de los documentos nace con su memoria, y la columna no vuelve arriba al repintarse', () => {
    const columna = director.slice(director.indexOf('function vistaDocumentos'), director.indexOf('if (!doc) return `<div class="docs">'));
    const plegables = columna.match(/<details/g) ?? [];
    expect(plegables.length).toBeGreaterThanOrEqual(2);
    expect(columna.match(/<details class="[\w-]+"\$\{plegableEnColumna\(/g)?.length).toBe(plegables.length);
    expect(director).toMatch(/columna\.scrollTop = scrollColumna;/);
  });

  it('al cambiar de proyecto, la columna vuelve arriba: no hereda hasta dónde bajaste en el otro', () => {
    const cambio = director.slice(director.indexOf('// Otro proyecto: lo abierto del anterior no sirve'), director.indexOf('// Si no llegó nada nuevo'));
    expect(cambio).toMatch(/scrollColumna = 0;/);
    // El repintado toma el scroll de la columna que está en pantalla, la del anterior: también esa vuelve arriba
    expect(cambio).toMatch(/querySelector<HTMLElement>\('\.lista-docs'\)\?\.scrollTo\(0, 0\)/);
  });
});
