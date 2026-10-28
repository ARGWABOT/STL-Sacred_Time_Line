/**
 * Las pestañas de cada fase en «La ruta» (pedido pd_ruta_pestanas, decidido por el titular el 26 de octubre de 2026): las
 * tarjetas de una fase iban una al lado de otra y la columna larga de las misiones dejaba media pantalla vacía. Ahora cada
 * fase se parte en pestañas de ancho completo, las mismas para todas (la en curso, las pasadas y las futuras), cada una
 * con lo que tenga: «La fase», «Misiones», «Lo pedido» y «Propuestas». Aquí vive lo puro: qué pestañas hay, cuáles se ven
 * según lo que trae la fase, a cuál lleva un ancla y a cuál mueve una tecla. La interfaz (director.ts › vistaRuta) solo
 * pinta la pestaña elegida.
 *
 * Un botón que lleva a una parte de la fase (`{ vista: 'ruta', fase, ancla: 'pedido-<id>' }`) abre antes la pestaña que
 * la tiene, y después se la resalta como siempre.
 */

export type PestanaRuta = 'fase' | 'misiones' | 'pedidos' | 'propuestas';

/**
 * Cada pestaña con las partes que tiene: sus anclas fijas y los prefijos de las anclas de sus filas (`pedido-<id>`…). La
 * primera, «La fase», siempre está; las demás aparecen solo si la fase trae algo para ellas.
 */
const PESTANAS: readonly { id: PestanaRuta; titulo: string; anclas: readonly string[]; prefijos: readonly string[] }[] = [
  { id: 'fase', titulo: 'La fase', anclas: ['r-plan', 'puerta'], prefijos: [] },
  { id: 'misiones', titulo: 'Misiones', anclas: ['r-misiones'], prefijos: ['pasada-', 'mision-'] },
  { id: 'pedidos', titulo: 'Lo pedido', anclas: ['r-pedidos', 'r-despues'], prefijos: ['pedido-'] },
  { id: 'propuestas', titulo: 'Propuestas', anclas: ['r-aprobadas'], prefijos: ['propuesta-'] },
];

/** Cuántas cosas trae la fase para cada pestaña que cuenta algo («La fase» no cuenta: siempre está). */
export type CuentasRuta = Record<Exclude<PestanaRuta, 'fase'>, number>;

/** La pestaña con que abre cada fase (decisión del titular): lo que la fase es y su puerta, antes que lo que trae. */
export const PESTANA_RUTA_INICIAL: PestanaRuta = 'fase';

/** Si `id` es una pestaña de la ruta. */
export function pestanaRutaValida(id: unknown): id is PestanaRuta {
  return PESTANAS.some((p) => p.id === id);
}

/** El título de una pestaña. */
export function tituloPestanaRuta(id: PestanaRuta): string {
  return PESTANAS.find((p) => p.id === id)!.titulo;
}

/**
 * Las pestañas que se ven, en su orden: «La fase» siempre, y cada una de las demás solo si la fase trae algo para ella
 * (una pestaña vacía no aparece).
 */
export function pestanasRutaVisibles(cuentas: CuentasRuta): PestanaRuta[] {
  return PESTANAS.filter((p) => p.id === 'fase' || cuentas[p.id as keyof CuentasRuta] > 0).map((p) => p.id);
}

/**
 * La pestaña que tiene la parte con ese ancla (`pedido-<id>`, `propuesta-<id>`, `pasada-<id>`, `r-plan`, `puerta`…), o
 * `null` si el ancla no es de la ruta.
 */
export function pestanaDeAnclaRuta(ancla: string | null | undefined): PestanaRuta | null {
  if (!ancla) return null;
  return PESTANAS.find((p) => p.anclas.includes(ancla) || p.prefijos.some((x) => ancla.startsWith(x)))?.id ?? null;
}

/**
 * La pestaña que se ve: la de lo que un botón señala, si la fase la tiene; si no, la que se había elegido para esa fase
 * mientras viva la página; y si tampoco, «La fase».
 */
export function pestanaRutaElegida(guardada: PestanaRuta | undefined, ancla: string | null | undefined, visibles: readonly PestanaRuta[]): PestanaRuta {
  const deAncla = pestanaDeAnclaRuta(ancla);
  if (deAncla && visibles.includes(deAncla)) return deAncla;
  return guardada && visibles.includes(guardada) ? guardada : PESTANA_RUTA_INICIAL;
}

/**
 * La pestaña a la que mueve una tecla desde `actual`, entre las que se ven, como en cualquier lista de pestañas
 * accesible: flechas a los lados (dando la vuelta en los extremos), Inicio y Fin. Con otra tecla, `null`.
 */
export function pestanaRutaConTecla(actual: PestanaRuta, tecla: string, visibles: readonly PestanaRuta[]): PestanaRuta | null {
  const n = visibles.length;
  if (!n) return null;
  const i = Math.max(0, visibles.indexOf(actual));
  if (tecla === 'ArrowRight') return visibles[(i + 1) % n];
  if (tecla === 'ArrowLeft') return visibles[(i + n - 1) % n];
  if (tecla === 'Home') return visibles[0];
  if (tecla === 'End') return visibles[n - 1];
  return null;
}
