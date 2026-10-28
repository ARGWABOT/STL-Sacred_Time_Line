// El seguro de «Entendido» (nota de voz del titular, 22 de octubre de 2026): la primera vez que se lee una idea, su
// botón se activa solo después de lo que tarda en leerse a buen ritmo. Puro, para probarlo sin pantalla.

/** El buen ritmo de lectura: palabras por minuto. */
const PALABRAS_POR_MINUTO = 230;
/** Lo menos y lo más que se espera, en segundos. */
export const ESPERA_MIN = 5;
export const ESPERA_MAX = 15;

/**
 * Los segundos que tarda en leerse una idea (su Markdown: sin los símbolos, solo sus palabras) a 230 palabras por
 * minuto, con mínimo 5 y máximo 15.
 */
export function segundosParaLeer(md: string): number {
  const palabras = md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|~-]+/g, ' ')
    .split(/\s+/)
    .filter((p) => /[\p{L}\p{N}]/u.test(p)).length;
  return Math.min(ESPERA_MAX, Math.max(ESPERA_MIN, Math.ceil((palabras / PALABRAS_POR_MINUTO) * 60)));
}

/** Lo que dice el seguro si se oprime «Entendido» antes de tiempo, con lo que falta (en segundos, al menos 1). */
export function avisoDeEspera(faltan: number): string {
  const s = Math.max(1, Math.ceil(faltan));
  return `¡Ey, espera! ¿Seguro que ya la leíste? Dale ${s === 1 ? 'un segundo más' : `${s} segundos más`} y el botón queda listo.`;
}

/**
 * El rótulo de lo comentado sobre una idea, plegado debajo de ella (nota de voz del titular nmvn0vsbmtit, 24 de octubre
 * de 2026): cuántos comentarios hay y si el director ya los respondió, para saber sin abrirlo si hay algo que leer.
 */
export function resumenComentarios(total: number, respondidos: number): string {
  const cuantos = total === 1 ? '1 comentario sobre esta idea' : `${total} comentarios sobre esta idea`;
  if (!respondidos) return `${cuantos}, sin respuesta aún`;
  if (respondidos >= total) return `${cuantos}, ${total === 1 ? 'con su respuesta' : 'con sus respuestas'}`;
  return `${cuantos}, ${respondidos} con respuesta`;
}
