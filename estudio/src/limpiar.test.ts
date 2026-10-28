import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { atributoPeligroso, elementoPeligroso } from './limpiar';

const leer = (ruta: string) => readFileSync(join(__dirname, ruta), 'utf-8').replace(/\r\n/g, '\n');

describe('lo que se muestra de un Markdown, sin lo que ejecuta algo (pedido del titular pd_graficos_svg)', () => {
  it('quita lo que ejecuta, carga otra página, envía o restila el Studio, también dentro de un dibujo; deja el contenido', () => {
    for (const e of ['script', 'SCRIPT', 'iframe', 'object', 'embed', 'base', 'meta', 'link', 'style', 'form', 'template', 'foreignObject', 'animate', 'set', 'animateTransform'])
      expect(elementoPeligroso(e), e).toBe(true);
    for (const e of ['p', 'a', 'img', 'table', 'svg', 'rect', 'text', 'line', 'polygon', 'marker', 'defs', 'path', 'g', 'input'])
      expect(elementoPeligroso(e), e).toBe(false);
  });

  it('quita los manejadores y las direcciones que ejecutan, aunque vengan disfrazadas; deja los enlaces, las imágenes y los estilos de los dibujos', () => {
    expect(atributoPeligroso('img', 'onerror', 'fetch("/__estudio")')).toBe(true);
    expect(atributoPeligroso('svg', 'onload', 'x')).toBe(true);
    expect(atributoPeligroso('div', 'srcdoc', '<script>')).toBe(true);
    expect(atributoPeligroso('a', 'ping', 'https://x')).toBe(true);
    expect(atributoPeligroso('a', 'href', 'javascript:alert(1)')).toBe(true);
    expect(atributoPeligroso('a', 'href', ' JaVa\nScRipt:alert(1)')).toBe(true);
    expect(atributoPeligroso('a', 'href', 'vbscript:x')).toBe(true);
    expect(atributoPeligroso('a', 'href', 'data:text/html,<script>x</script>')).toBe(true);
    expect(atributoPeligroso('use', 'xlink:href', 'data:image/svg+xml,<svg onload=x>')).toBe(true);
    // Lo de siempre se queda
    expect(atributoPeligroso('a', 'href', 'https://anthropic.com')).toBe(false);
    expect(atributoPeligroso('a', 'href', '#parte-2')).toBe(false);
    expect(atributoPeligroso('a', 'href', 'docs/ruta.md')).toBe(false);
    expect(atributoPeligroso('img', 'src', 'data:image/png;base64,iVBOR')).toBe(false);
    expect(atributoPeligroso('rect', 'style', 'fill:var(--sobre,#fffdf5)')).toBe(false);
    expect(atributoPeligroso('line', 'marker-end', 'url(#flecha-hoy)')).toBe(false);
    expect(atributoPeligroso('svg', 'role', 'img')).toBe(false);
    // Un dibujo se mira, no lleva a otra parte: sus enlaces pierden la dirección
    expect(atributoPeligroso('a', 'href', 'https://anthropic.com', true)).toBe(true);
    expect(atributoPeligroso('a', 'xlink:href', '#x', true)).toBe(true);
    expect(atributoPeligroso('use', 'href', '#flecha', true)).toBe(false);
  });

  it('todo Markdown que el Studio muestra pasa por ahí: los documentos, los del repositorio, los del Studio, «¿Dónde quedamos?» y las respuestas', () => {
    const director = leer('director.ts');
    expect(director).toContain("import { limpio } from './limpiar';");
    const todos = director.match(/marked\.parse(Inline)?\(/g)?.length ?? 0;
    expect(todos).toBeGreaterThanOrEqual(5);
    expect(director.match(/limpio\(marked\.parse(Inline)?\(/g)?.length).toBe(todos);
    // Se lee en una plantilla, que no carga imágenes ni corre nada mientras se limpia
    expect(leer('limpiar.ts')).toContain("const t = document.createElement('template');");
  });
});
