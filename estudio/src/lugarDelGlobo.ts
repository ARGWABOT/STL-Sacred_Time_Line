// Dónde va un globo de ayuda (nota de voz del titular nmw5m1kzwtit, 6 de noviembre de 2026: «debes garantizar que la
// ubicación de los globitos de ayuda siempre queden dentro del viewport»; el del «?» junto a «Pedir revisión» salía
// encima de la cabecera y no se alcanzaba a leer). Una sola función, pura, para todos los globos del Studio: el del modo
// ayuda, el del recorrido guiado, el del «?» de las palabras y el globito de la guía de lectura. Prueba abajo, luego
// arriba, luego a los lados, y lo deja siempre dentro de la ventana. Todo en píxeles de la página (escala.ts): la recta de
// la parte llevada con rectaEnPagina, el ancho y el alto del globo con offsetWidth y offsetHeight, y la ventana con
// anchoDeVentana y altoDeVentana; así la escala de la página (zoom) no lo descuadra.
import type { Recta } from './escala';

export type Lado = 'abajo' | 'arriba' | 'derecha' | 'izquierda';
/** El orden en que se prueba cada lado, si no se dice otro. */
const ORDEN_DE_LADOS: readonly Lado[] = ['abajo', 'arriba', 'derecha', 'izquierda'];

export interface LugarDelGlobo {
  top: number;
  left: number;
  /** El lado de la parte donde quedó. */
  lado: Lado;
  /** Dónde apunta la flecha, medido desde el borde del globo: en x si va abajo o arriba, en y si va a un lado. */
  flecha: number;
}

const entre = (v: number, min: number, max: number) => (max < min ? min : Math.min(max, Math.max(min, v)));

/**
 * El lugar del globo junto a su parte: el primer lado de `orden` donde cabe entero; si en ninguno cabe, el que más espacio
 * deja. Abajo y arriba va alineado al inicio de la parte (o centrado, con `centrado`); a los lados, centrado en su alto. Al
 * final se encierra en la ventana, con `margen` hasta cada borde (y `arriba`, si una barra fija tapa el borde de arriba).
 * Pura: todo en píxeles de la página.
 */
export function lugarDelGlobo(
  parte: Recta,
  globo: { ancho: number; alto: number },
  ventana: { ancho: number; alto: number },
  o: { separacion?: number; margen?: number; orden?: readonly Lado[]; centrado?: boolean; arriba?: number } = {},
): LugarDelGlobo {
  const sep = o.separacion ?? 10, m = o.margen ?? 8, techo = Math.max(m, o.arriba ?? m);
  const orden = o.orden?.length ? o.orden : ORDEN_DE_LADOS;
  const espacio: Record<Lado, number> = {
    abajo: ventana.alto - m - parte.bottom - sep - globo.alto,
    arriba: parte.top - sep - techo - globo.alto,
    derecha: ventana.ancho - m - parte.right - sep - globo.ancho,
    izquierda: parte.left - sep - m - globo.ancho,
  };
  const lado = orden.find((l) => espacio[l] >= 0) ?? [...orden].sort((a, b) => espacio[b] - espacio[a])[0];
  const centroX = parte.left + parte.width / 2, centroY = parte.top + parte.height / 2;
  let top: number, left: number;
  if (lado === 'abajo' || lado === 'arriba') {
    top = lado === 'abajo' ? parte.bottom + sep : parte.top - sep - globo.alto;
    left = o.centrado ? centroX - globo.ancho / 2 : parte.left;
  } else {
    left = lado === 'derecha' ? parte.right + sep : parte.left - sep - globo.ancho;
    top = centroY - globo.alto / 2;
  }
  top = entre(top, techo, ventana.alto - m - globo.alto);
  left = entre(left, m, ventana.ancho - m - globo.ancho);
  const vertical = lado === 'abajo' || lado === 'arriba';
  const flecha = vertical ? entre(centroX - left, 12, globo.ancho - 12) : entre(centroY - top, 12, globo.alto - 12);
  return { top, left, lado, flecha };
}
