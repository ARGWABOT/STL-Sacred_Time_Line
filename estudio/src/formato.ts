// Los formatos de la interfaz que no dependen del proyecto abierto: las fechas, los porcentajes y el chip de cada nivel
// de un frente. Salieron de app.ts, la primera pieza de partir los módulos grandes (propuesta aceptada
// pr_partir_modulos): lo puro va aparte, para que cada vista que se parta después lo importe sin depender de la página.
// Las fechas y los números, a la manera del idioma de ahora (textos.ts; pd_idiomas).
import type { Nivel } from '../../src/director/director';
import { idiomaActual, lenguaje, t } from './textos';

export const NOMBRE_NIVEL: Record<Nivel, string> = {
  get foco() { return t('nivel.foco'); },
  get apoyo() { return t('nivel.apoyo'); },
  get espera() { return t('nivel.espera'); },
};

/** Un día corto («16 oct»). Con hora (ISO), el día de aquí: a las 9 p. m. del 16 en Colombia ya es 17 en UTC. */
export const fecha = (f: string) => {
  if (f.length > 10) return new Date(f).toLocaleDateString(lenguaje(), { day: 'numeric', month: 'short' });
  const [a, m, dd] = f.slice(0, 10).split('-').map(Number);
  return new Date(a, m - 1, dd).toLocaleDateString(lenguaje(), { day: 'numeric', month: 'short' });
};
/**
 * Un momento, con su día y su hora: el mes en palabras, a la manera de cada idioma («30 de octubre, 11:17 p. m.», «Oct 30,
 * 11:17 PM»), como eligió el titular el 31 de octubre de 2026 (pd_idiomas). Las listas llevan solo el día, corto (`fecha`;
 * t_decide_fecha_corta).
 */
export const momento = (iso: string) => `${new Date(iso).toLocaleDateString(lenguaje(), { day: 'numeric', month: idiomaActual() === 'en' ? 'short' : 'long' })}, ${hora(iso)}`;
/** La hora de un momento («2:10 p. m.»), en los dos idiomas de 12 horas. */
export const hora = (iso: string) => new Date(iso).toLocaleTimeString(lenguaje(), { hour: 'numeric', minute: '2-digit', hour12: true });
export const pct = (x: number) => t('formato.pct', { n: Math.round(x) });
/** Una cantidad grande, corta («12 mil», «1,4 M»): los tokens. */
export const miles = (n: number) => (n >= 1e6 ? t('formato.millon', { n: (n / 1e6).toLocaleString(lenguaje(), { maximumFractionDigits: 1 }) }) : n >= 1e3 ? t('formato.mil', { n: Math.round(n / 1e3).toLocaleString(lenguaje()) }) : String(n));
export const chipNivel = (n: Nivel) => `<span class="chip ${n}">${NOMBRE_NIVEL[n]}</span>`;
