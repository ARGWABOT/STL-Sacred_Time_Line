/**
 * Lo que va haciendo el director, en vivo (nota de voz del titular, 26 de octubre de 2026): los pasos van con lo más nuevo
 * arriba, y el panel sigue esa punta. Aquí vive lo puro: dónde queda el desplazamiento de la lista de pasos cuando se
 * vuelve a pintar con pasos nuevos arriba. La interfaz (director.ts › pintarProgreso) solo lo aplica.
 */

/** Cuánto puede estar la lectura separada de la punta de arriba y aun así seguirla (píxeles). */
const MARGEN_ARRIBA = 40;

/** Cómo estaba la lista antes de pintarla de nuevo: su desplazamiento y lo alta que era por dentro. */
export interface ListaAntes {
  desplazamiento: number;
  alto: number;
}

/**
 * Dónde queda el desplazamiento tras pintar la lista otra vez. En la primera vez, o con la lectura en la punta de arriba,
 * se queda arriba y se ven los pasos nuevos. Si la persona bajó a leer algo más viejo, se queda en lo mismo que leía: los
 * pasos nuevos entran por arriba y empujan el contenido, así que se suma lo que creció.
 */
export function desplazamientoTrasPintar(antes: ListaAntes | null, altoAhora: number): number {
  if (!antes || antes.desplazamiento < MARGEN_ARRIBA) return 0;
  return Math.max(0, antes.desplazamiento + (altoAhora - antes.alto));
}
