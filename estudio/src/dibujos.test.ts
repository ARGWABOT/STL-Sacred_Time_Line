import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { conIdsPropios, DIBUJO } from './dibujos';

const leer = (ruta: string) => readFileSync(join(__dirname, ruta), 'utf-8').replace(/\r\n/g, '\n');

describe('los dibujos del director, en grande con un clic (pedido del titular pd_graficos_svg)', () => {
  it('la copia en grande lleva sus propios id, y sus flechas y enlaces internos apuntan a ellos', () => {
    const svg = '<svg role="img" aria-label="Un flujo"><defs><marker id="flecha-hoy"><path d="M0,0"/></marker></defs><line marker-end="url(#flecha-hoy)"/><use href="#flecha-hoy"/><text>flecha-hoy</text></svg>';
    const copia = conIdsPropios(svg, 'grande');
    expect(copia).toContain('id="flecha-hoy-grande"');
    expect(copia).toContain('marker-end="url(#flecha-hoy-grande)"');
    expect(copia).toContain('href="#flecha-hoy-grande"');
    // El texto del dibujo no cambia, aunque diga lo mismo que un id
    expect(copia).toContain('<text>flecha-hoy</text>');
    expect(copia).not.toMatch(/id="flecha-hoy"/);
    // Sin id, igual
    expect(conIdsPropios('<svg role="img"><rect/></svg>', 'grande')).toBe('<svg role="img"><rect/></svg>');
  });

  it('se abren los dibujos de los documentos y de las respuestas del director (los que se dibujan como imagen), no los íconos, y en una pantalla angosta no se achican', () => {
    expect(DIBUJO).toBe('.lector svg[role="img"], .respuesta-dir svg[role="img"], .respuesta-qa svg[role="img"]');
    expect(leer('director.ts')).toContain('activarDibujos();');
    const css = leer('director.css');
    expect(css).toContain('.lector svg[role="img"], .respuesta-dir svg[role="img"], .respuesta-qa svg[role="img"] { cursor: zoom-in; }');
    expect(css).toMatch(/dialog\.dibujo-grande \.lienzo-grande > svg \{[^}]*min-width: 760px;[^}]*max-width: none !important;/);
    // La guía del estilo pide role="img" en cada dibujo: es lo que lo hace abrirse en grande
    expect(readFileSync(join(__dirname, '../../docs/metodo/dibujos.md'), 'utf-8')).toContain('`role="img"`');
  });

  it('lo que responde el director a una nota se lee con formato y con sus dibujos, como lo que responde a una pregunta, limpio de lo que corre', () => {
    const director = leer('director.ts');
    const tarjeta = director.match(/function tarjetaNota\([^)]*\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(tarjeta).toContain('<div class="texto-resp">${limpio(marked.parse(r.texto, { async: false }) as string)}</div>');
    expect(tarjeta).not.toContain('esc(r.texto)');
    // Sobre el recuadro oscuro: cada párrafo aparte, y el dibujo sobre su papel claro
    const css = leer('director.css');
    expect(css).toContain('.respuesta-dir .texto-resp > * + * { margin-top: 8px; }');
    expect(css).toMatch(/\.respuesta-dir \.texto-resp svg\[role="img"\] \{[^}]*background: var\(--panel\);/);
  });
});
