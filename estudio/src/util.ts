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
