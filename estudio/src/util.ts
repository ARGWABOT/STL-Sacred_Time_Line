// Piezas comunes de la interfaz del Estudio.

/** Escapa un texto para ponerlo en HTML. */
export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Los pasos que cada uno va marcando dentro de una misión (solo en su navegador: es su lista de chequeo), por proyecto. */
export const clavePasos = (proyecto: string, mision: string) => `estudio.director.pasos.${proyecto}.${mision}`;
export const pasosHechos = (proyecto: string, mision: string): number[] => {
  try { return JSON.parse(localStorage.getItem(clavePasos(proyecto, mision)) ?? '[]'); } catch { return []; }
};
