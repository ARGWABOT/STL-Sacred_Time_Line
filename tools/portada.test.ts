// La portada de la página pública (la animación de la línea del proyecto) es un solo archivo HTML con su código dentro:
// que su código se pueda leer (un error de sintaxis la dejaría quieta y en blanco para quien la abra).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const html = readFileSync(join(import.meta.dirname, '..', 'docs/difusion/linea-del-proyecto.html'), 'utf8');

describe('la portada de «Qué es STL»', () => {
  it('su código se puede leer, y no arranca sola', () => {
    const codigos = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(codigos.length).toBeGreaterThan(0);
    for (const c of codigos) expect(() => new Function(c)).not.toThrow();
    expect(html).toContain('stl.portada.vista');
  });
});
