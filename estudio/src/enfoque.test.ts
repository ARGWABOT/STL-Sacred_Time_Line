import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { icono } from './iconos';

const leer = (ruta: string) => readFileSync(join(__dirname, ruta), 'utf-8');
const css = leer('director.css');
const zen = leer('zen.ts');
const director = leer('director.ts');
const atajos = leer('../../index.html').match(/<div class="atajos-director"[\s\S]*?<\/div>/)?.[0] ?? '';

describe('el modo enfoque (notas del titular, 22 de octubre de 2026)', () => {
  it('junto a la cara del director ya no se pide la revisión: ese atajo pone y quita el enfoque, con el icono del botón de arriba', () => {
    expect(atajos).not.toContain('data-revision');
    const atajo = atajos.match(/<button[^>]*data-enfoque[^>]*>[\s\S]*?<\/button>/)?.[0] ?? '';
    expect(atajo).toContain('aria-pressed="false"');
    // Solo donde el enfoque aplica: director.ts lo muestra
    expect(atajo).toMatch(/ hidden>/);
    const trazos = icono('enfoque').match(/aria-hidden="true">([\s\S]*)<\/svg>/)?.[1] ?? '?';
    expect(atajo).toContain(trazos);
  });

  it('nada sigue al puntero ni se mueve solo: queda el desenfoque, que entra y sale suave en 0,5 a 0,7 s', () => {
    expect(zen).not.toMatch(/pointermove|requestAnimationFrame|addEventListener/);
    expect(css).not.toMatch(/zen-luz|zen-niebla|@keyframes zen-/);
    const velo = css.match(/\.velo-zen, \.cabeza-proyecto::after \{[^}]*\}/)?.[0] ?? '';
    expect(velo).toContain('backdrop-filter');
    const segundos = Number(velo.match(/transition: opacity ([\d.]+)s/)?.[1]);
    expect(segundos).toBeGreaterThanOrEqual(0.5);
    expect(segundos).toBeLessThanOrEqual(0.7);
    // Lo enfocado sigue encima del velo justo lo que este tarda en irse
    expect(Number(director.match(/const MS_VELO = (\d+);/)?.[1])).toBe(Math.round(segundos * 1000));
    // Con «menos movimiento» en el sistema, sin transición
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[^@]*\.velo-zen, \.cabeza-proyecto::after \{ transition: none; \}/);
  });
});
