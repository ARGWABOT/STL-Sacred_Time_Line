// El seguro de «Entendido»: la primera vez que se lee una idea en el modo enfoque, su botón se activa a los 5 segundos,
// sea cual sea el largo del texto (nota de voz del titular nmvwpl26stit, 31 de octubre de 2026), y sin enfoque, de una vez,
// para poder pasar rápido por lo que ya se sabe (nota de voz nmvwprqjctit). Puro, para probarlo sin pantalla.
import { t } from './textos';

/** Lo que espera «Entendido» en el modo enfoque, en segundos. */
export const SEGUNDOS_DEL_SEGURO = 5;

/** Los segundos que espera «Entendido» de una idea por leer: con el enfoque puesto, siempre los mismos; sin él, ninguno. */
export const segundosDelSeguro = (conEnfoque: boolean) => (conEnfoque ? SEGUNDOS_DEL_SEGURO : 0);

/** Lo que dice el seguro si se oprime «Entendido» antes de tiempo, con lo que falta (en segundos, al menos 1). */
export function avisoDeEspera(faltan: number): string {
  const n = Math.max(1, Math.ceil(faltan));
  return t('lectura.espera', { falta: t('lectura.segundosMas', { n }) });
}

/**
 * El rótulo de lo comentado sobre una idea, plegado debajo de ella (nota de voz del titular nmvn0vsbmtit, 24 de octubre
 * de 2026): cuántos comentarios hay y si el director ya los respondió, para saber sin abrirlo si hay algo que leer.
 */
export function resumenComentarios(total: number, respondidos: number): string {
  const cuantos = t('lectura.comentarios', { n: total });
  if (!respondidos) return t('lectura.sinRespuesta', { cuantos });
  if (respondidos >= total) return t('lectura.conRespuesta', { n: total, cuantos });
  return t('lectura.algunasRespondidas', { cuantos, respondidos });
}
