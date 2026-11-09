/**
 * El repintado de lo que llega de fondo (una transcripción terminada, lo que el servidor devuelve) mientras algo se está
 * narrando. Pintar la vista entera quita los bloques de la niebla y calla la voz: se veía desaparecer el texto y volver, y
 * el audio se cortaba unos 100 ms (notas de voz del titular nmvzo5gmhtit y nmvzo6jjktit, 2 de noviembre de 2026: «cualquier
 * proceso que se esté ejecutando en segundo plano no tiene por qué interrumpir la narración»). Así que espera, sin perder
 * nada: los datos ya están guardados y lo pendiente se pinta en cuanto quede libre.
 */

/** Cada cuánto se mira si ya quedó libre. */
export const MS_MIRAR_LIBRE = 400;
/** Libre dos veces seguidas: entre un bloque y el siguiente, la narración también parece libre un instante. */
export const LIBRE_SEGUIDAS = 2;

export function repintoEnEspera(o: { ocupado: () => boolean; pintar: () => void }) {
  let reloj: ReturnType<typeof setInterval> | null = null;
  let libres = 0;
  const cancelar = () => {
    if (reloj) clearInterval(reloj);
    reloj = null;
    libres = 0;
  };
  return {
    /** Pinta ya si nada se narra; si no, lo deja pendiente. Verdadero si pintó. */
    pedir(): boolean {
      if (!reloj && !o.ocupado()) {
        o.pintar();
        return true;
      }
      reloj ??= setInterval(() => {
        libres = o.ocupado() ? 0 : libres + 1;
        if (libres < LIBRE_SEGUIDAS) return;
        cancelar();
        o.pintar();
      }, MS_MIRAR_LIBRE);
      return false;
    },
    /** Otro repintado ya trajo lo nuevo (lo que la persona hizo pinta de una vez): no queda nada pendiente. */
    cancelar,
  };
}
