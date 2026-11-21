// Los textos de la interfaz, en el idioma de ahora (pedido pd_idiomas; t_decide_textos_archivo). `t` da una frase por su
// clave, con lo que va entre llaves, y sus dos formas si cambia con un número (`n`); las fechas y los números salen con
// `lenguaje` (formato.ts). El idioma lo pone la página al cargar (app.ts › fijarIdioma): el que se guardó en este computador
// o, la primera vez, el del navegador, y lo cambia el selector ES y EN, al pie de la barra. Esto no toca el `lang` de la
// página: el idioma de la voz sale de cada documento (src/director/voz.ts; pd_voz_del_texto).
import type { Idioma } from '../../src/director/idioma.ts';
import { en, type Texto } from './textos/en.ts';
import { es } from './textos/es.ts';

export type ClaveDeTexto = keyof typeof es;

const TEXTOS: Record<Idioma, Record<ClaveDeTexto, Texto>> = { es, en };

let actual: Idioma = 'es';

export const idiomaActual = () => actual;
export function ponerIdioma(idioma: Idioma) {
  actual = idioma;
}

/** Lo que arma `f` dicho en `idioma`, sin cambiar el de ahora (los mensajes de commit, en inglés: nmwp711kitit). */
export function enIdioma<T>(idioma: Idioma, f: () => T): T {
  const antes = actual;
  actual = idioma;
  try {
    return f();
  } finally {
    actual = antes;
  }
}

/** El idioma de las fechas y los números: en inglés, a la manera de Estados Unidos («Oct 30, 11:17 PM»). */
export const lenguaje = () => (actual === 'en' ? 'en-US' : 'es');

/**
 * Una frase en todos los idiomas, sin rellenar: para reconocer lo que el Studio guardó en el idioma que tenía al
 * escribirlo y mostrarlo en el de ahora (autoFrases.ts › notaDelStudioEnIdioma). Las que cambian con un número dan sus dos formas.
 */
export const formasDe = (clave: ClaveDeTexto): string[] =>
  [...new Set(Object.values(TEXTOS).flatMap((tabla) => { const x = tabla[clave]; return typeof x === 'string' ? [x] : [x.uno, x.otros]; }))];

/** Una frase del idioma de ahora. Con `n`, la forma que le toca a ese número; lo que no se le da queda entre llaves, a la vista. */
export function t(clave: ClaveDeTexto, valores: Record<string, string | number> = {}): string {
  const texto = TEXTOS[actual][clave];
  const forma = typeof texto === 'string' ? texto : valores.n === 1 ? texto.uno : texto.otros;
  return forma.replace(/\{(\w+)\}/g, (todo, nombre: string) => (valores[nombre] === undefined ? todo : String(valores[nombre])));
}
