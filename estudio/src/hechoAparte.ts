/**
 * Lo hecho aparte de lo por hacer en «La ruta» (notas de voz del titular, 26 de octubre de 2026: «las pendientes pueden ir
 * en orden cronológico de ejecución, pero el historial de las aprobadas debe ir en orden inverso, lo más reciente arriba,
 * con la fecha y hora en que se aprobaron»). Lo por hacer se queda hacia adelante, en el orden del plan; lo hecho va
 * aparte, lo más nuevo arriba. Pura: la usan las misiones, las propuestas y lo pedido.
 */

/** Los milisegundos de una fecha ISO (con hora o solo el día); NaN si no hay fecha o no se entiende. */
const instante = (iso: string | undefined) => (iso ? Date.parse(iso) : NaN);

/**
 * Parte `items` en lo por hacer (en el orden en que vienen) y lo hecho (de lo más reciente a lo más antiguo según
 * `cuando`). Lo hecho sin fecha va al final, en su orden de siempre, y a igual fecha también se conserva el orden.
 */
export function separarHechas<T>(items: readonly T[], estaHecha: (x: T) => boolean, cuando: (x: T) => string | undefined): { porHacer: T[]; hechas: T[] } {
  const hechas = items.filter(estaHecha).map((x, orden) => ({ x, orden, t: instante(cuando(x)) }));
  hechas.sort((a, b) => {
    const sinA = Number.isNaN(a.t);
    const sinB = Number.isNaN(b.t);
    if (sinA || sinB) return sinA === sinB ? a.orden - b.orden : sinA ? 1 : -1;
    return b.t - a.t || a.orden - b.orden;
  });
  return { porHacer: items.filter((x) => !estaHecha(x)), hechas: hechas.map((h) => h.x) };
}
