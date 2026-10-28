import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { icono } from './iconos';

const leer = (archivo: string) => readFileSync(join(__dirname, archivo), 'utf-8');

describe('el ícono de la narración por voz no se confunde con el del sonido (nota de voz del titular nmvpi5ydttit, 26 de octubre de 2026)', () => {
  it('la narración tiene su propio ícono, con el mismo estilo que los demás, y no es el altavoz', () => {
    const narrador = icono('narrador');
    const altavoz = icono('altavoz');
    expect(narrador).not.toBe(altavoz);
    // Las mismas medidas y el mismo trazo que el resto
    for (const svg of [narrador, altavoz]) {
      expect(svg).toContain('viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"');
    }
    // Una persona (cabeza y hombros) que habla; sin la bocina del altavoz
    expect(narrador).toContain('<circle');
    expect(narrador).not.toContain('M4 9.5h3.5L12 5.5v13');
  });

  it('el botón de la voz usa el ícono de la narración y el de sonido sigue siendo el altavoz', () => {
    const guia = leer('guiaLectura.ts');
    expect(guia).toContain("const NARRADOR = icono('narrador');");
    expect(guia).toContain('tituloVoz()}">${NARRADOR}</button>`;');
    expect(guia).not.toContain("icono('altavoz')");
    expect(leer('panelSonidos.ts')).toContain("${icono(apagados ? 'silencio' : 'altavoz')}");
  });
});
