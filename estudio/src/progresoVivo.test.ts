import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { desplazamientoTrasPintar } from './progresoVivo';

const leer = (archivo: string) => readFileSync(join(__dirname, archivo), 'utf-8');

describe('lo que va haciendo el director, con lo más nuevo arriba (nota de voz del titular, 26 de octubre de 2026)', () => {
  it('sigue la punta de arriba: la primera vez, o con la lectura arriba, se queda en 0 para ver lo nuevo', () => {
    expect(desplazamientoTrasPintar(null, 800)).toBe(0);
    expect(desplazamientoTrasPintar({ desplazamiento: 0, alto: 500 }, 800)).toBe(0);
    expect(desplazamientoTrasPintar({ desplazamiento: 39, alto: 500 }, 800)).toBe(0);
  });

  it('si bajó a leer algo más viejo, se queda en lo mismo que leía aunque entren pasos nuevos por arriba', () => {
    // La lista creció 120 px por arriba: lo que leía bajó 120 px
    expect(desplazamientoTrasPintar({ desplazamiento: 300, alto: 700 }, 820)).toBe(420);
    // Sin pasos nuevos, no se mueve
    expect(desplazamientoTrasPintar({ desplazamiento: 300, alto: 700 }, 700)).toBe(300);
    // Nunca queda por debajo de 0
    expect(desplazamientoTrasPintar({ desplazamiento: 60, alto: 700 }, 100)).toBe(0);
  });

  it('el panel los pinta del más nuevo al más viejo, con la marca de «ahora» en el de arriba, y aplica ese desplazamiento', () => {
    const director = leer('director.ts');
    const pintar = director.match(/function pintarProgreso\(trabajando: boolean\) \{[\s\S]*?\n\}\n/)?.[0] ?? '';
    expect(pintar).toContain('[...pasos].reverse()');
    expect(pintar).toContain("i === 0 ? ' ultimo' : ''");
    expect(pintar).toContain('desplazamientoTrasPintar(');
    expect(director).toContain("import { desplazamientoTrasPintar } from './progresoVivo';");
  });
});
