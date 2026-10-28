// Nada exportado sin uso (punto 4 de la propuesta aceptada «Limpieza antes de publicar»): lo que un archivo del Studio
// exporta lo nombra otro archivo (el código, sus pruebas o la página). Una exportación que nadie más nombra es código
// muerto o algo que debió quedarse dentro de su archivo, y quien clone el Studio no tiene por qué leerla. Esta prueba lee
// el código: si alguien exporta algo que ningún otro archivo nombra, falla aquí y dice qué y dónde.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ = process.cwd();
/** Donde vive el código del Studio, y los archivos sueltos que también importan de él. */
const CARPETAS = ['src', 'estudio', 'tools'];
const SUELTOS = ['vite.config.ts', 'index.html'];
const SIN_LEER = new Set(['node_modules', 'sonidos']);

function codigo(dir: string): string[] {
  return readdirSync(join(RAIZ, dir), { withFileTypes: true }).flatMap((e) => {
    const r = `${dir}/${e.name}`;
    if (e.isDirectory()) return SIN_LEER.has(e.name) ? [] : codigo(r);
    return /\.(ts|mts|html)$/.test(e.name) ? [r] : [];
  });
}

/**
 * Lo que exporta un archivo y corre: funciones, constantes, clases y enumeraciones, declaradas con export o en una lista
 * sin from (export { a, b as c }). Los tipos y las interfaces no cuentan: no son código que corra, y uno exportado
 * describe la forma de lo que devuelve una función exportada. Pura.
 */
function exportados(texto: string): string[] {
  const nombres = [...texto.matchAll(/^export\s+(?:declare\s+)?(?:async\s+)?(?:function\*?|const|let|var|class|enum)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  for (const m of texto.matchAll(/^export\s+\{([^}]*)\}(?!\s*from)/gm)) {
    for (const parte of m[1].split(',')) {
      const nombre = parte.trim().split(/\s+as\s+/).pop()?.trim();
      if (nombre && !nombre.startsWith('type ')) nombres.push(nombre);
    }
  }
  return nombres;
}

describe('nada exportado sin uso (limpieza antes de publicar, punto 4)', () => {
  it('lee las formas de exportar lo que corre, sin los tipos', () => {
    expect(exportados('export function a() {}\nexport const b = 1;\nexport type C = 1;\nexport interface D {}\nexport { d, e as f };\nexport type { G };\nexport { h } from "./x";\nconst i = 1;')).toEqual(['a', 'b', 'd', 'f']);
  });

  it('cada cosa que exporta un archivo del Studio la nombra otro archivo', () => {
    const archivos = [...CARPETAS.flatMap(codigo), ...SUELTOS];
    const textos = new Map(archivos.map((a) => [a, readFileSync(join(RAIZ, a), 'utf8')]));
    // En qué archivos aparece cada palabra
    const donde = new Map<string, Set<string>>();
    for (const [a, t] of textos) {
      for (const p of new Set(t.match(/[A-Za-z_$][\w$]*/g) ?? [])) {
        if (!donde.has(p)) donde.set(p, new Set());
        donde.get(p)!.add(a);
      }
    }
    const sinUso = [...textos]
      .filter(([a]) => a.endsWith('.ts'))
      .flatMap(([a, t]) => exportados(t).filter((n) => ![...(donde.get(n) ?? [])].some((otro) => otro !== a)).map((n) => `${a} › ${n}`));
    expect(sinUso).toEqual([]);
  });
});
