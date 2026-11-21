// Los tipos fijos de la bitácora de este computador (nota nmwp99p6otit del titular: «define tipos fijos de información de
// log, con texto ya escrito y espacios en blanco para los datos variables, para que siempre salgan en el idioma correcto»).
// Una línea de la bitácora no guarda texto terminado: guarda la CLAVE de su frase (`bitacora.…`) y sus datos, y la frase se
// dice recién al leerla, en el idioma de este computador de ese momento (api.ts › GET /bitacora). Sin módulos de Node.
import { t, type ClaveDeTexto } from '../../estudio/src/textos.ts';

/** Lo que va en un espacio en blanco de la frase: un nombre, una ruta, un número, un id, o otra frase del mismo tipo. */
export type DatoBitacora = string | number | TextoBitacora;

/** Un tipo fijo de línea: la clave de su frase y los datos de sus espacios en blanco. */
export interface TextoBitacora {
  clave: ClaveDeTexto;
  datos?: Record<string, DatoBitacora>;
}

/** Arma un tipo fijo: la clave tiene que existir en los textos (si no, no compila). Un dato `undefined` no se pone. */
export function tb(clave: ClaveDeTexto, datos?: Record<string, DatoBitacora | undefined>): TextoBitacora {
  const puestos = Object.entries(datos ?? {}).filter((par): par is [string, DatoBitacora] => par[1] !== undefined);
  return puestos.length ? { clave, datos: Object.fromEntries(puestos) } : { clave };
}

export const esTextoBitacora = (x: unknown): x is TextoBitacora =>
  !!x && typeof x === 'object' && typeof (x as { clave?: unknown }).clave === 'string';

/** Los datos de un espacio en blanco, ya dichos en el idioma de ahora (los números quedan números: el plural los mira). */
function datosDichos(datos: unknown): Record<string, string | number> {
  const salida: Record<string, string | number> = {};
  if (!datos || typeof datos !== 'object') return salida;
  for (const [k, v] of Object.entries(datos)) {
    if (typeof v === 'number' || typeof v === 'string') salida[k] = v;
    else if (esTextoBitacora(v)) salida[k] = textoDeBitacora(v);
  }
  return salida;
}

/** La frase, en el idioma de ahora (`t`), con lo anidado también. Una clave que ya no existe da la clave misma, a la vista. */
export function textoDeBitacora(x: DatoBitacora): string {
  if (typeof x === 'string') return x;
  if (typeof x === 'number') return String(x);
  try {
    return t(x.clave, datosDichos(x.datos)).trim();
  } catch {
    return String(x.clave);
  }
}

/** Lo que guarda la línea de un tipo fijo, con lo largo acotado a `max`. */
export function acotar(x: DatoBitacora, enUnaLinea: (x: unknown, max?: number) => string, max: number): DatoBitacora {
  if (typeof x === 'number') return x;
  if (typeof x === 'string') return enUnaLinea(x, max);
  return { clave: x.clave, ...(x.datos ? { datos: Object.fromEntries(Object.entries(x.datos).map(([k, v]) => [k, acotar(v, enUnaLinea, max)])) } : {}) };
}

/** Los campos de una línea que dicen su frase por clave: `que` y `desde`. */
export interface FrasesDeLinea {
  que: string;
  desde: string;
  clave?: string;
  datos?: Record<string, DatoBitacora>;
  desdeClave?: string;
  desdeDatos?: Record<string, DatoBitacora>;
}

/** La línea con `que` y `desde` dichos en el idioma de ahora, desde su clave; las de texto simple (historia), tal cual. */
export function conFrasesEnSuIdioma<E extends FrasesDeLinea>(e: E): E {
  const dicha = (clave: string | undefined, datos: Record<string, DatoBitacora> | undefined, guardada: string) => {
    if (typeof clave !== 'string') return guardada;
    const frase = textoDeBitacora({ clave: clave as ClaveDeTexto, datos });
    return frase === clave ? guardada : frase;
  };
  return { ...e, que: dicha(e.clave, e.datos, e.que), desde: dicha(e.desdeClave, e.desdeDatos, e.desde) };
}
