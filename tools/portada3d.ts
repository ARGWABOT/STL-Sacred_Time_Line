// El recorrido en 3D como portada pública (decisión del titular t_decide_portada, nmw2c1m7ktit, 4 de noviembre de 2026):
// en el Studio, Vite resuelve los imports de three.js de docs/difusion/mundo-3d.js; en la página pública, que es un sitio
// estático, los resuelve un importmap hacia una copia local de la librería, junto a la página. Puro: lo usa
// tools/publicar-stl.ts y lo prueba tools/portada.test.ts.

/** Dónde va la copia de three.js en el sitio, relativa a su raíz. */
export const CARPETA_THREE = 'vendor/three';

/** Los archivos de three.js que usa el recorrido: de node_modules/three a CARPETA_THREE, con la misma ruta y su licencia. */
export const ARCHIVOS_THREE = [
  'build/three.module.js',
  'build/three.core.js',
  'examples/jsm/geometries/RoundedBoxGeometry.js',
  'LICENSE',
] as const;

/** El importmap: «three» y lo que cuelga de «three/examples/jsm/», hacia la copia local. */
export const IMPORTS_THREE: Record<string, string> = {
  three: `./${CARPETA_THREE}/build/three.module.js`,
  'three/examples/jsm/': `./${CARPETA_THREE}/examples/jsm/`,
};

const MODULO = '<script type="module" src="./mundo-3d.js"></script>';

/** Los nombres sin ruta que importa un módulo (los que no empiezan con «.» ni «/»), en su orden. Pura. */
export function importsSinRuta(js: string): string[] {
  return [...js.matchAll(/^\s*import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/gm)].map((m) => m[1]).filter((m) => !m.startsWith('.') && !m.startsWith('/'));
}

/** Adónde lleva el importmap un nombre: la entrada exacta o la carpeta más larga que lo contiene; null si no lo lleva. Pura. */
export function resolverConImportmap(nombre: string, imports: Record<string, string> = IMPORTS_THREE): string | null {
  if (imports[nombre]) return imports[nombre];
  const carpeta = Object.keys(imports).filter((k) => k.endsWith('/') && nombre.startsWith(k)).sort((a, b) => b.length - a.length)[0];
  return carpeta ? imports[carpeta] + nombre.slice(carpeta.length) : null;
}

/**
 * La página del recorrido para el sitio: sin su primer comentario (la historia del boceto), con el título y las metas
 * que se le den y el importmap justo antes de su módulo, que debe ir después de él. Pura.
 */
export function paginaDelRecorrido(html: string, cabecera: string): string {
  if (!html.includes(MODULO)) throw new Error(`mundo-3d.html ya no carga su módulo con ${MODULO}: no sé dónde poner el importmap.`);
  const mapa = `<script type="importmap">${JSON.stringify({ imports: IMPORTS_THREE })}</script>\n`;
  return html
    .replace(/<!--[\s\S]*?-->\s*/, '')
    .replace(/<title>[^<]*<\/title>(\s*<meta name="description"[^>]*>)?/, cabecera)
    .replace(MODULO, `${mapa}${MODULO}`);
}
