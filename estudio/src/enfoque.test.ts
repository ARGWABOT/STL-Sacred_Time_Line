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
    const velo = css.match(/\.velo-zen \{[^}]*\}/)?.[0] ?? '';
    expect(velo).toContain('backdrop-filter');
    const segundos = Number(velo.match(/transition: opacity ([\d.]+)s/)?.[1]);
    expect(segundos).toBeGreaterThanOrEqual(0.5);
    expect(segundos).toBeLessThanOrEqual(0.7);
    // Lo enfocado sigue encima del velo justo lo que este tarda en irse
    expect(Number(director.match(/const MS_VELO = (\d+);/)?.[1])).toBe(Math.round(segundos * 1000));
    // Con «menos movimiento» en el sistema, sin transición
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[^@]*\.velo-zen \{ transition: none; \}/);
  });

  it('sin franja arriba: el velo cubre toda la pantalla, también la cabecera, que ya no sube por encima de él', () => {
    const velo = css.match(/\.velo-zen \{[^}]*\}/)?.[0] ?? '';
    expect(velo).toContain('position: fixed; inset: 0; z-index: 35;');
    expect(css).not.toContain('.cabeza-proyecto::after');
    // Solo al salir, mientras el velo se va, la cabecera queda encima de lo que vuelve a su lugar
    expect(css).not.toMatch(/html:is\(\.enfoque, \.enfoque-mision[^)]*\) \.cabeza-proyecto \{[^}]*z-index/);
    expect(css).toMatch(/html\.enfoque-saliendo \.cabeza-proyecto \{ z-index: 41; \}/);
  });

  it('lo enfocado, documento o misión, es una ventana al centro, ancha, que se desplaza por dentro y no empieza bajo la cabecera', () => {
    const ventana = css.match(/html\.enfoque \.docs > \.lector, html\.enfoque-mision \.mision-c\.sigue\.mia \{[^}]*\}/)?.[0] ?? '';
    expect(ventana).toContain('position: fixed');
    expect(ventana).toContain('margin: auto');
    expect(ventana).toContain('width: min(1200px, 92vw)');
    expect(ventana).toContain('height: fit-content');
    expect(ventana).toContain('overflow-y: auto');
    expect(ventana).toContain('var(--enfoque-arriba, 24px)');
    expect(ventana).not.toContain('--alto-cabeza');
    // La página no se desplaza detrás, tampoco en la misión
    expect(css).toContain('html:is(.enfoque, .enfoque-mision), html:is(.enfoque, .enfoque-mision) body { overflow: hidden; }');
    // En el teléfono, a la izquierda, con el margen de los atajos (por ahí se sale)
    expect(css).toMatch(/@media \(max-width: 759px\) \{\s*html\.enfoque \.docs > \.lector, html\.enfoque-mision \.mision-c\.sigue\.mia \{ inset: 8px; width: calc\(100vw - 84px\)/);
  });

  it('la salida flota encima del velo y de lo enfocado, en el lugar del botón de la cabecera, solo con el enfoque puesto', () => {
    expect(zen).toContain("className = 'boton-suave boton-enfoque salida-enfoque'");
    expect(zen).toContain('dataset.enfoque');
    expect(zen).toContain('hidden = true');
    const salida = css.match(/\.salida-enfoque \{[^}]*\}/)?.[0] ?? '';
    expect(salida).toContain('position: fixed');
    expect(Number(salida.match(/z-index: (\d+)/)?.[1])).toBeGreaterThan(40);
    expect(css).toContain('html:is(.enfoque, .enfoque-mision) .cabeza-proyecto .boton-enfoque { visibility: hidden; }');
    expect(director).toContain("b.hidden = b.classList.contains('salida-enfoque') ? !si : !aqui;");
    // ubicarEnfoque la lleva al botón de la cabecera y baja lo enfocado solo si quedaría debajo de ella
    const ubicar = director.match(/function ubicarEnfoque\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(ubicar).toContain("$('mando').querySelector<HTMLElement>('.boton-enfoque')");
    expect(ubicar).toContain('--enfoque-arriba');
  });
});
