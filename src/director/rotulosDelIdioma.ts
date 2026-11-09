// Lo que el director escribe a una persona va en el idioma de su interfaz, también los nombres de lo que se ve en
// pantalla (notas del titular nmw6wpwl4tit y nmw6wwsy2tit, 7 de noviembre de 2026: con el Studio en inglés, un paso
// empezaba con «Siguiente paso.», que la tarjeta ya dice como «Next step», y otro mandaba a buscar «Modo enfoque», que en
// inglés se llama «Focus mode»). Los rótulos salen de los diccionarios de la interfaz (estudio/src/textos/es.ts y en.ts),
// así que un rótulo nuevo queda vigilado sin tocar esto. Puro.
import { en } from '../../estudio/src/textos/en.ts';
import { es } from '../../estudio/src/textos/es.ts';
import type { Idioma } from './idioma.ts';

/** Un rótulo entre «», comparable: sin los símbolos del principio (✉, ←, ▶…), sin los puntos suspensivos ni los dos puntos del final, en minúsculas. */
const normalRotulo = (x: string) =>
  x.normalize('NFC').replace(/^[^\p{L}\p{N}«]+/u, '').replace(/(\s*(…|\.\.\.|:|\.))+$/u, '').replace(/\s+/g, ' ').trim().toLowerCase();

/** Hasta cuánto mide un rótulo: lo más largo es una frase, no un nombre de botón o de sección. */
const MAX_ROTULO = 48;

let cache: { espanol: Map<string, string[]>; ingles: Set<string> } | undefined;

/** Cada rótulo de la interfaz en español que en inglés dice otra cosa, con su versión en inglés. */
function rotulosEspanoles() {
  if (cache) return cache;
  const espanol = new Map<string, string[]>();
  const ingles = new Set<string>();
  for (const [clave, valor] of Object.entries(es)) {
    const otro = (en as Record<string, unknown>)[clave];
    if (typeof otro === 'string') ingles.add(normalRotulo(otro));
    if (typeof valor !== 'string' || typeof otro !== 'string' || /[{}]/.test(valor)) continue;
    const n = normalRotulo(valor);
    if (!n || n.length > MAX_ROTULO || !/\p{L}/u.test(n) || n === normalRotulo(otro)) continue;
    const limpio = otro.replace(/^[^\p{L}\p{N}«]+/u, '').trim();
    const ya = espanol.get(n) ?? [];
    if (!ya.includes(limpio)) espanol.set(n, [...ya, limpio]);
  }
  cache = { espanol, ingles };
  return cache;
}

/**
 * Lo que en un texto para alguien con la interfaz en inglés está en español de la interfaz: que empiece con «Siguiente
 * paso» (la tarjeta ya lo dice, y en su idioma) o que nombre entre «» un rótulo en español que en inglés es otro. Cada
 * problema, en una frase que dice qué usar. Con la interfaz en español, nada. Puro.
 */
export function rotulosEnOtroIdioma(texto: string, idioma: Idioma | undefined): string[] {
  if (idioma !== 'en' || !texto) return [];
  const problemas: string[] = [];
  if (/^\s*siguiente paso\b/i.test(texto)) problemas.push('empieza con «Siguiente paso», que la tarjeta ya muestra en inglés («Next step»): quítalo');
  const { espanol, ingles } = rotulosEspanoles();
  for (const [, citado] of texto.matchAll(/«([^«»]{1,80})»/g)) {
    const n = normalRotulo(citado);
    const usar = espanol.get(n);
    if (!usar || ingles.has(n)) continue;
    problemas.push(`nombra «${citado.trim()}», el rótulo en español: con la interfaz en inglés se llama ${usar.map((x) => `«${x}»`).join(' o ')}`);
  }
  return problemas;
}
