// Una sección se abre de una vez (pedido pd_aligerar_consulta; elecciones del titular t_decide_aligerar_carga y
// t_decide_aligerar_volver, 1 y 2 de noviembre de 2026).
import { esc } from './util';

/**
 * Lo que se ve al abrir una sección, antes de pintarla con lo de ahora: lo último que trajo, si ya se abrió, para que no haya
 * que esperar nada; y la primera vez, su título y una línea de que carga. Pura.
 */
export function aperturaDeSeccion(ultimo: string | undefined, titulo: string, cargando: string): string {
  return ultimo ?? `<section class="seccion-cargando" aria-busy="true"><h2>${esc(titulo)}</h2><p class="como">${esc(cargando)}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></p></section>`;
}
