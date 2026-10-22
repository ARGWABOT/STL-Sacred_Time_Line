import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { avisoDeEspera, ESPERA_MAX, ESPERA_MIN, segundosParaLeer } from './lectura';

const director = readFileSync(join(__dirname, 'director.ts'), 'utf-8');
const palabras = (n: number) => Array.from({ length: n }, (_, i) => `palabra${i}`).join(' ');

describe('el seguro de «Entendido» (nota de voz del titular, 22 de octubre de 2026)', () => {
  it('espera lo que tarda en leerse a 230 palabras por minuto, entre 5 y 15 segundos', () => {
    expect(segundosParaLeer('Una idea corta.')).toBe(ESPERA_MIN);
    expect(segundosParaLeer(palabras(23))).toBe(6);
    expect(segundosParaLeer(palabras(46))).toBe(12);
    expect(segundosParaLeer(palabras(400))).toBe(ESPERA_MAX);
    // Cuenta palabras, no símbolos de Markdown
    expect(segundosParaLeer('## - **·** > | |')).toBe(ESPERA_MIN);
    expect(segundosParaLeer(`- **${palabras(46)}**`)).toBe(12);
  });

  it('si se oprime antes, lo dice con humor y con lo que falta', () => {
    expect(avisoDeEspera(3.2)).toMatch(/^¡Ey, espera! ¿Seguro que ya la leíste\? .*4 segundos más/);
    expect(avisoDeEspera(0.4)).toContain('un segundo más');
  });

  it('solo la primera vez: lo ya marcado, o lo ya leído, va sin espera', () => {
    const espera = director.match(/function esperaDeIdea\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(espera).toContain('yaLeido(');
    expect(espera).toContain('segundosParaLeer(');
    const clic = director.slice(director.indexOf('} else if (ds.entendido !== undefined) {'), director.indexOf('} else if (ds.plegarLista'));
    expect(clic).toContain('avisoDeEspera(');
  });
});
