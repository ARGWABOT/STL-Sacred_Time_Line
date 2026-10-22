// Las listas del Studio con partes plegables (la columna de los documentos): ninguna se pliega sola.

/**
 * Si una parte plegable de una lista va abierta (nota del titular, 22 de octubre de 2026: «las listas no se deben
 * autocolapsar al abrir elementos»). Queda como estaba (`antes`: como la dejó quien mira, o como se vio la última vez)
 * y, la primera vez, como nace (`porDefecto`): ni abrir un elemento ni un repintado la pliegan. Lo único que la mueve
 * sin tocarla es que le llegue lo abierto (`recibe`: lo acabas de abrir y está en ella, o pasó a ella, como lo leído a
 * «Ya leídos»): se abre, para que lo abierto se vea marcado en ella.
 */
export const abiertaEnLista = (antes: boolean | undefined, porDefecto: boolean, recibe: boolean): boolean =>
  recibe || (antes ?? porDefecto);

/**
 * Cuánto mover el scroll propio de una lista para que se vea el elemento marcado en ella (con sus cajas en pantalla, las
 * de getBoundingClientRect): nada si ya se ve entero; si no, lo justo para dejarlo en el medio de la lista (o arriba, si
 * no cabe entero).
 */
export function desplazamientoParaVer(lista: { top: number; bottom: number }, el: { top: number; bottom: number }): number {
  if (el.top >= lista.top && el.bottom <= lista.bottom) return 0;
  return el.top - lista.top - Math.max(0, (lista.bottom - lista.top - (el.bottom - el.top)) / 2);
}
