import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Las pruebas, sin el aviso de Vite (decisión del titular nmvspt3igtit, 28 de octubre de 2026, «Revisiones más cortas»,
// parte 5): Vite carga vite.config.ts y todo lo que importa, y por cada importación relativa sin la extensión del archivo
// imprimía un aviso de 8 KB en cada corrida de npm test, que el director releía en cada llamada. Con la extensión, nada.
const raiz = join(import.meta.dirname, '..', '..');
const deCarpeta = (carpeta: string) =>
  readdirSync(join(raiz, carpeta))
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    .map((f) => `${carpeta}/${f}`);
const SIN_EXTENSION = /(?:\bfrom\s+|^import\s+)['"](\.{1,2}\/[^'"]+)['"]/gm;

describe('las importaciones de lo que carga vite.config.ts', () => {
  it('llevan la extensión del archivo, así Vite no avisa en cada corrida de las pruebas', () => {
    const archivos = ['vite.config.ts', ...deCarpeta('estudio/servidor'), ...deCarpeta('src/director')];
    const sinExtension = archivos.flatMap((f) =>
      [...readFileSync(join(raiz, f), 'utf8').matchAll(SIN_EXTENSION)].map((m) => m[1]).filter((p) => !/\.[a-z]+$/i.test(p)).map((p) => `${f}: ${p}`),
    );
    expect(sinExtension).toEqual([]);
  });
});
