// «Hoy» y «La ruta», una sola interfaz (pedido pd_hoy_en_ruta; nota de voz del titular del 1 de noviembre de 2026 y sus
// elecciones del 3 de noviembre, nmw0zzda1tit y nmw0zzx7itit). Sin pestañas de por medio para lo de cada día: arriba, la
// barra delgada de la ruta, que dice siempre en qué fase vas y cuánto lleva; debajo, tu misión de ahora, la cola plegada y
// tu ficha. Lo que no hace falta ver siempre (la puerta de la fase y sus criterios, las fases pasadas y las que vienen, el
// plan de la fase y sus misiones aprobadas) va en la pestaña auxiliar, «Datos del proceso», que es lo que antes era «La
// ruta»: sus anclas (`pedido-<id>`, `propuesta-<id>`, `r-plan`…) siguen llevando ahí. Un clic en una fase de la barra
// abre esa pestaña en esa fase. Pura: recibe lo que pinta.
import { esc } from './util';
import { t } from './textos';

/** Las dos pestañas: tu misión (la vista «misiones», «Hoy») y los datos del proceso (la vista «ruta»). */
export type PestanaHoy = 'mision' | 'proceso';

/** Una fase en la barra delgada: su nombre, cómo va y si es la que se mira en «Datos del proceso». */
export interface FaseEnBarra {
  id: string;
  nombre: string;
  situacion: 'superada' | 'actual' | 'futura';
  /** De 0 a 1: cuánto lleva (sus criterios cumplidos). */
  avance: number;
  /** Si es la que se mira ahora en la pestaña auxiliar. */
  vista: boolean;
}

/**
 * La barra delgada de la ruta: una franja por fase, la de ahora con su nombre y cuánto lleva, siempre a la vista (lo que
 * lo haría fallar, según el pedido, es que la fase se vuelva invisible). Cada fase es un botón que abre la pestaña auxiliar
 * en ella (`data-fase`).
 */
export function barraRutaDelgada(fases: readonly FaseEnBarra[]): string {
  if (!fases.length) return '';
  const i = Math.max(0, fases.findIndex((f) => f.situacion === 'actual'));
  const actual = fases[i];
  const pct = Math.round((actual.situacion === 'superada' ? 1 : actual.avance) * 100);
  const tramos = fases.map((f, n) => {
    const lleno = f.situacion === 'superada' ? 1 : f.situacion === 'actual' ? f.avance : 0;
    const titulo = t('hoyRuta.fase', { n, nombre: f.nombre });
    return `<li class="${f.situacion}${f.vista ? ' vista' : ''}"><button type="button" data-fase="${esc(f.id)}" title="${esc(titulo)}" aria-label="${esc(titulo)}"${f.vista ? ' aria-current="true"' : ''}><span class="tramo" style="--av:${lleno.toFixed(3)}"></span></button></li>`;
  }).join('');
  return `<nav class="ruta-delgada" aria-label="${esc(t('hoyRuta.barra'))}"><p class="ruta-delgada-dice"><b>${esc(t('hoyRuta.fase', { n: i, nombre: actual.nombre }))}</b> <span class="como">${esc(t('hoyRuta.lleva', { pct }))}</span></p><ol style="--fases:${fases.length}">${tramos}</ol></nav>`;
}

/** Las dos pestañas: «Tu misión» y «Datos del proceso». Cada una lleva a su vista (`data-ir`). */
export function pestanasHoy(elegida: PestanaHoy): string {
  const boton = (id: PestanaHoy, vista: string, titulo: string) => {
    const sel = id === elegida;
    return `<button type="button" role="tab" class="pestana-stl${sel ? ' sel' : ''}" data-ir="${vista}" aria-selected="${sel}" tabindex="${sel ? 0 : -1}">${esc(titulo)}</button>`;
  };
  return `<div class="pestanas-stl pestanas-hoy" role="tablist" aria-label="${esc(t('hoyRuta.pestanas'))}">${boton('mision', 'misiones', t('hoyRuta.tuMision'))}${boton('proceso', 'ruta', t('hoyRuta.proceso'))}</div>`;
}

/** La vista entera: la barra delgada arriba, las dos pestañas y lo de la elegida. */
export function vistaHoyEnRuta(x: { fases: readonly FaseEnBarra[]; pestana: PestanaHoy; cuerpo: string }): string {
  return `<div class="hoy-en-ruta">${barraRutaDelgada(x.fases)}${pestanasHoy(x.pestana)}<div class="hoy-cuerpo p-${x.pestana}">${x.cuerpo}</div></div>`;
}
