import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lugarDelGlobo } from './lugarDelGlobo';

const leer = (...r: string[]) => readFileSync(join(__dirname, ...r), 'utf-8');
const recta = (left: number, top: number, width: number, height: number) => ({ left, top, width, height, right: left + width, bottom: top + height });
const ventana = { ancho: 1600, alto: 900 };
const globo = { ancho: 300, alto: 80 };
const dentro = (l: { top: number; left: number }) =>
  l.top >= 8 && l.left >= 8 && l.top + globo.alto <= ventana.alto - 8 && l.left + globo.ancho <= ventana.ancho - 8;

describe('cada globo de ayuda queda dentro de la ventana (nmw5m1kzwtit)', () => {
  it('por defecto va abajo de su parte, alineado a su inicio', () => {
    const l = lugarDelGlobo(recta(200, 300, 120, 40), globo, ventana);
    expect(l).toMatchObject({ lado: 'abajo', top: 350, left: 200 });
  });

  it('una parte pegada abajo lo lleva arriba', () => {
    const l = lugarDelGlobo(recta(200, 840, 120, 40), globo, ventana);
    expect(l.lado).toBe('arriba');
    expect(l.top).toBe(840 - 10 - 80);
    expect(dentro(l)).toBe(true);
  });

  it('el «?» junto a «Pedir revisión», arriba a la derecha: el globo nunca sale por arriba ni por la derecha', () => {
    const l = lugarDelGlobo(recta(1570, 4, 18, 18), globo, ventana, { orden: ['arriba', 'abajo'], centrado: true });
    expect(l.lado).toBe('abajo');
    expect(dentro(l)).toBe(true);
    // La flecha sigue apuntando al «?»
    expect(l.left + l.flecha).toBeGreaterThan(1500);
  });

  it('una parte muy alta, sin lugar arriba ni abajo, lo lleva a un lado', () => {
    const l = lugarDelGlobo(recta(100, 20, 300, 860), globo, ventana);
    expect(l.lado).toBe('derecha');
    expect(l.left).toBe(410);
    expect(dentro(l)).toBe(true);
  });

  it('si no cabe en ningún lado, toma el de más espacio y aun así queda encerrado en la ventana', () => {
    const l = lugarDelGlobo(recta(0, 0, 1600, 900), globo, ventana);
    expect(dentro(l)).toBe(true);
  });

  it('respeta una barra fija arriba', () => {
    const l = lugarDelGlobo(recta(200, 60, 100, 30), globo, ventana, { orden: ['arriba', 'abajo'], arriba: 50 });
    expect(l.lado).toBe('abajo');
    expect(l.top).toBeGreaterThanOrEqual(50);
  });

  it('la usan los cuatro globos del Studio, en píxeles de la página', () => {
    expect(leer('ayudaGuiada.ts').match(/lugarDelGlobo\(/g)?.length).toBeGreaterThanOrEqual(2);
    expect(leer('ayudaGuiada.ts')).toContain('rectaEnPagina(');
    expect(leer('guiaLectura.ts')).toContain('lugarDelGlobo(');
    expect(leer('palabras.ts')).toContain('lugarDelGlobo(');
  });
});
