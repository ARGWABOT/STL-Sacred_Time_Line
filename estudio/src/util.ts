// Piezas comunes de la interfaz del Estudio.

/** Escapa un texto para ponerlo en HTML. */
export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Los pasos que cada uno va marcando dentro de una misión (solo en su navegador: es su lista de chequeo), por proyecto. */
export const clavePasos = (proyecto: string, mision: string) => `estudio.director.pasos.${proyecto}.${mision}`;
export const pasosHechos = (proyecto: string, mision: string): number[] => {
  try { return JSON.parse(localStorage.getItem(clavePasos(proyecto, mision)) ?? '[]'); } catch { return []; }
};

/** Los pasos cuyo botón ya se abrió en este navegador (ya se fue a mirar lo que piden), por proyecto. */
export const claveAbierto = (proyecto: string, mision: string, i: number) => `estudio.abierto.${proyecto}.${mision}|${i}`;
export const pasosAbiertos = (proyecto: string, mision: string, cuantos: number): number[] =>
  Array.from({ length: cuantos }, (_, i) => i).filter((i) => localStorage.getItem(claveAbierto(proyecto, mision, i)) === '1');

/**
 * ¿El botón de un paso deja a la persona en la misma vista? Una página de afuera se abre en otra pestaña, y «Escribirle
 * al director» abre su diálogo encima: al volver (también con «Cancelar»), el paso se repinta ya con sus opciones, que
 * sin eso seguían apagadas (nota del titular nmvu02yqetit, 29 de octubre de 2026).
 */
export const seQuedaEnLaVista = (dest: { url?: string; vista?: string; ancla?: string }) =>
  !!dest.url || (dest.vista === 'buzon' && dest.ancla === 'escribir');
