// Los límites de uso de tu plan de Claude, antes de lanzar al director (propuesta aceptada «Cada proceso, a la vista»,
// pr_procesos_vista, punto 4): si la ventana de uso está agotada, el Studio no lo lanza a fallar, y lo pedido espera a que
// se renueve; y si al pedir la revisión el límite de cada cinco horas va en el 90 % o más, se dice cuánto queda y cuándo
// se renueva, con «Pedirla de todos modos» y «Esperar» (tu elección del 26 de octubre de 2026). Y, mientras trabaja, el
// tiempo que lleva y el que le queda de su límite (punto 3). Puro: lo usan el servidor y la página.
import { MAX_MIN_REVISION } from './director.ts';

/** Desde cuánto del límite de cada cinco horas se avisa al pedir la revisión. */
export const UMBRAL_LIMITE = 90;

/**
 * Cuánto lleva el director en la revisión que lanzó el Studio y cuánto le queda de su límite, en minutos (pr_procesos_vista,
 * punto 3: a la vista mientras trabaja; la página lo relee cada 30 segundos). Su límite es el que estimó el director para
 * ella (`limite`) o el de siempre. null si no se ha lanzado.
 */
export function tiempoDeRevision(r: { lanzada?: string; limite?: number } | null | undefined, ahora = Date.now()): { lleva: number; limite: number; queda: number } | null {
  const desde = Date.parse(r?.lanzada ?? '');
  if (Number.isNaN(desde)) return null;
  const limite = r?.limite ?? MAX_MIN_REVISION;
  const lleva = Math.max(0, Math.floor((ahora - desde) / 60_000));
  return { lleva, limite, queda: Math.max(0, limite - lleva) };
}

/** Una ventana de uso como la informa Claude Code: cuánto va usado (de 0 a 100) y cuándo se renueva. */
export interface VentanaDeUso {
  uso: number;
  renueva: string | null;
}

/**
 * El límite de cada cinco horas, si lo último que se supo de él va en el umbral o más y no se ha renovado. Dentro de una
 * ventana, lo usado solo sube hasta que se renueva: si iba en el 90 % y no se renovó, va en el 90 % o más.
 */
export function limiteCasiLleno(v: VentanaDeUso | null | undefined, ahora = Date.now(), umbral = UMBRAL_LIMITE): VentanaDeUso | null {
  if (!v || !(v.uso >= umbral)) return null;
  if (!v.renueva || Date.parse(v.renueva) <= ahora) return null;
  return v;
}

/**
 * Si la ventana de uso de la cuenta está agotada según un registro del director: su último aviso de límites la rechazó y
 * todavía no se renueva. Sin la hora en que se renueva, no detiene nada (no se sabría cuándo seguir).
 */
export function ventanaAgotada(registro: string, ahora = Date.now()): { renueva: string } | null {
  let ultimo: { status?: string; resetsAt?: number } | null = null;
  for (const linea of registro.split('\n')) {
    if (!linea.startsWith('{') || !linea.includes('"rate_limit_event"')) continue;
    try {
      const ev = JSON.parse(linea);
      if (ev.type === 'rate_limit_event' && ev.rate_limit_info) ultimo = ev.rate_limit_info;
    } catch { /* una línea a medio escribir */ }
  }
  if (ultimo?.status !== 'rejected' || typeof ultimo.resetsAt !== 'number' || !Number.isFinite(ultimo.resetsAt)) return null;
  const renueva = ultimo.resetsAt * 1000;
  return renueva > ahora ? { renueva: new Date(renueva).toISOString() } : null;
}
