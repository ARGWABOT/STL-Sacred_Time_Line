import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { textoDelPaso } from './stepText';

const leer = (ruta: string) => readFileSync(join(__dirname, ruta), 'utf-8').replace(/\r\n/g, '\n');

describe('el texto de un paso, de corrido (nota de voz del titular nmvvvazd4tit)', () => {
  const ir = '<button type="button" class="ir-paso">Abrir AGENTS.md →</button>';
  const comentar = '<button type="button" class="comentar-paso">✉</button>';

  it('el detalle sigue después del botón, en el mismo renglón y sin lista aparte, y el ✉ va al final', () => {
    const html = textoDelPaso({ texto: 'Oprime «Abrir AGENTS.md».', ir, detalle: ['Lo destapado vuelve a la niebla.', 'Si no cambia, recarga con Ctrl + F5'], desmarcar: '', comentar });
    expect(html).toBe(`<span>Oprime «Abrir AGENTS.md».</span>${ir}<span class="detalle-paso">Lo destapado vuelve a la niebla. Si no cambia, recarga con Ctrl + F5.</span>${comentar}`);
    expect(html).not.toContain('<ol');
    expect(html.endsWith(comentar)).toBe(true);
  });

  it('sin detalle ni botón, solo el texto y el ✉; «Desmarcar» va antes del ✉', () => {
    expect(textoDelPaso({ texto: 'Mira <esto>', ir: '', desmarcar: '', comentar })).toBe(`<span>Mira &lt;esto&gt;</span>${comentar}`);
    const desmarcar = '<button type="button" class="enlace desmarcar-paso">Desmarcar</button>';
    expect(textoDelPaso({ texto: 'Hecho.', ir, detalle: [], desmarcar, comentar })).toBe(`<span>Hecho.</span>${ir}${desmarcar}${comentar}`);
  });

  it('cada paso de la misión lo usa, y la niebla y la voz leen el detalle con su texto', () => {
    const director = leer('app.ts');
    const lista = director.match(/function listaDePasos\([^)]*\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(lista).toContain('${textoDelPaso({');
    expect(lista).not.toContain('class="detalle-paso"');
    expect(leer('guiaLectura.ts')).toContain('ol.pasos > li > span.detalle-paso');
    expect(leer('director.css')).toContain('.mision-c .pasos li > .ir-paso + .detalle-paso { margin-left: 6px; }');
  });
});
