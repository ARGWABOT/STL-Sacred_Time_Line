// El historial de navegación del Studio (nota de voz del titular nmwavgy3btit, 10 de noviembre de 2026: «que un usuario
// pueda darle ir atrás para visitar la interfaz desde la cual llegó a esta … utilicemos el mismo historial del navegador,
// que sería lo ideal»). Cada cambio de sección, o de pestaña en «Proyecto», deja una entrada en el historial del navegador
// (pushState); su botón «Atrás» la devuelve (popstate). La primera pintada de cada carga reemplaza la entrada en la que está,
// en vez de sumar otra, así que recargar no duplica nada. Aquí, lo puro; la página lo aplica (app.ts › anotarLugar).

/** Dónde está la persona: la sección y, en «Proyecto», su pestaña. */
export interface Lugar { vista: string; pestana?: string }

/** La marca de un lugar, para compararlo con el anotado. Pura. */
export const claveDeLugar = (l: Lugar): string => (l.pestana ? `${l.vista}:${l.pestana}` : l.vista);

/** Lo que se guarda en el historial del navegador: con su marca propia, para no confundirlo con otro estado. Pura. */
export const estadoDeLugar = (l: Lugar): { stl: Lugar } => ({ stl: l.pestana ? { vista: l.vista, pestana: l.pestana } : { vista: l.vista } });

/**
 * El lugar de una entrada del historial, si es del Studio y su sección existe; la pestaña, solo si existe. Null si no: esa
 * entrada no se sigue. Pura.
 */
export function lugarDeEstado(estado: unknown, vistas: readonly string[], pestanas: readonly string[]): Lugar | null {
  const l = (estado as { stl?: unknown } | null)?.stl as Partial<Lugar> | undefined;
  if (!l || typeof l !== 'object' || typeof l.vista !== 'string' || !vistas.includes(l.vista)) return null;
  return typeof l.pestana === 'string' && pestanas.includes(l.pestana) ? { vista: l.vista, pestana: l.pestana } : { vista: l.vista };
}

/** Qué hacer con el historial al pintar: nada (el mismo lugar), reemplazar la entrada (la primera vez) o sumar una. */
export type PasoDeHistorial = 'nada' | 'reemplazar' | 'empujar';

/**
 * `anotado`: la marca del último lugar anotado en esta carga (null, la primera vez). `estado`: el de la entrada en que está
 * el navegador. La primera pintada, o una entrada sin lugar del Studio, se reemplaza; un lugar distinto del anotado suma
 * una entrada; el mismo, nada (un repintado con datos nuevos no es navegar). Pura.
 */
export function pasoDeHistorial(anotado: string | null, ahora: Lugar, estado: unknown): PasoDeHistorial {
  if (anotado === null || !(estado as { stl?: unknown } | null)?.stl) return 'reemplazar';
  return anotado === claveDeLugar(ahora) ? 'nada' : 'empujar';
}
