// El aviso al director que trabaja (propuestas aceptadas «Cada proceso, a la vista», pr_procesos_vista, puntos 3 y 4, y
// «Una revisión que no termina se retoma con un botón», pr_retoma_automatica, punto 4): «Detener ahora» le pide cerrar con
// lo hecho y, si en tres minutos no cerró, lo corta (decisión del titular del 26 de octubre de 2026), y antes de su límite
// el Studio le avisa que cierre y, si avanzaba, le da unos minutos más, una sola vez. Las dos cosas le dicen algo mientras
// trabaja sin pantalla: la prueba real del 28 de octubre de 2026 (tools/director/probar-aviso.ts, Claude Code 2.1.310)
// midió que llegan a tiempo por un gancho PostToolUse y por la entrada en stream-json. Va por la entrada: el gancho
// necesita encender los ganchos, y con tus ajustes de usuario cargados correrían también los tuyos, que el arranque limpio
// apaga (ajustesClaude.ts › arranqueLimpio). El encargo va como el primer mensaje, la entrada sigue abierta para el aviso, y
// se cierra cuando el director termina su turno sin nada en segundo plano: entonces Claude Code termina, como antes. Lo
// que lee el modelo nace en inglés (decisión del titular del 23 de octubre de 2026). Aquí, lo puro.

/** Cuánto tiene el director para cerrar después de «Detener ahora»: pasado eso, el Studio lo corta. */
export const DETENER_TRAS_MIN = 3;

/** Cuántos minutos antes de su límite se le avisa al director que cierre (y cuántos más se le dan si avanzaba). */
const AVISO_ANTES_MIN = 10;

/**
 * Los minutos del aviso para un límite: diez, o un tercio del límite si es corto (una aclaración de 15 minutos se avisa a
 * los 10, no a los 5), y nunca menos de uno. Son también los que se le dan de más, una sola vez, si avanzaba. Pura.
 */
export const minutosDelAviso = (limite: number): number => Math.max(1, Math.min(AVISO_ANTES_MIN, Math.floor(limite / 3)));

/** Lo que oyó el director: un mensaje más por la entrada en stream-json, en una línea de JSON. */
export const mensajeDeEntrada = (texto: string): string => `${JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'text', text: texto }] } })}\n`;

/** Cómo cierra el director con lo hecho: lo mismo en los tres avisos. */
const CIERRA =
  'Start nothing new. Finish only the change you are in the middle of if it takes a minute or two, or leave it out; commit ' +
  'what already passes its tests; write in the plan what you reached and what is left (your answers, the summary, and in ' +
  'the message what you could not do); then close as your assignment says (bandeja.ts with --listo, or with --urgente ' +
  '--listo or --aclarar --listo, and the commit in the memory) and end your turn. Wait for nothing you launched in the ' +
  'background: what it did not finish stays for the next review.';

/** «Detener ahora»: la persona le pide cerrar con lo hecho. */
export const avisoDetener = (quien: string): string =>
  `Notice from the Studio: ${quien} pressed «Detener ahora» and asks you to close now with what is done. ${CIERRA} If you ` +
  `have not closed in ${DETENER_TRAS_MIN} minutes, the Studio stops you.`;

/** Antes del límite: le quedan `minutos`. */
export const avisoLimite = (minutos: number): string =>
  `Notice from the Studio: your time limit is in ${minutos} minutes. ${CIERRA} If you are still working when the limit ` +
  `arrives, the Studio gives you ${minutos} more minutes only once, and only if you keep advancing.`;

/** Llegó el límite y avanzaba: le da `minutos` más, una sola vez. */
export const avisoProrroga = (minutos: number): string =>
  `Notice from the Studio: your time limit has arrived. You were still advancing, so you have ${minutos} more minutes, ` +
  `once, to close. ${CIERRA}`;

/** Lo que el encargo le dice del aviso, en el idioma del encargo (revisor.ts › esperar). */
export const SOBRE_EL_AVISO =
  ` Mientras trabajas, el Studio te puede escribir un aviso («Notice from the Studio: …»), si la persona oprime «Detener ` +
  `ahora» o si se acerca tu límite: hazle caso antes que a lo demás.`;

/** Lo que se leyó del registro hasta ahora: si el director terminó su turno y si algo sigue en segundo plano. */
export interface Turno {
  /** Si lo último del registro es el final de un turno (un `result` sin nada del modelo después). */
  termino: boolean;
  /** Lo que espera en segundo plano según el último aviso de Claude Code (`background_tasks_changed`). */
  fondo: number;
}

/**
 * Lee un pedazo nuevo del registro (líneas enteras) sobre lo que ya se sabía. Lo que no es JSON (un aviso en texto, una
 * línea a medio escribir) no cambia nada. Pura.
 */
export function leerTurno(pedazo: string, antes: Turno = { termino: false, fondo: 0 }): Turno {
  let { termino, fondo } = antes;
  for (const linea of pedazo.split('\n')) {
    const t = linea.trim();
    if (!t.startsWith('{')) continue;
    let e: { type?: string; subtype?: string; tasks?: unknown };
    try { e = JSON.parse(t); } catch { continue; }
    if (e.type === 'result') termino = true;
    else if (e.type === 'assistant' || e.type === 'user') termino = false;
    if (e.type === 'system' && e.subtype === 'background_tasks_changed') fondo = Array.isArray(e.tasks) ? e.tasks.length : 0;
  }
  return { termino, fondo };
}

/**
 * Si se cierra la entrada: el director terminó su turno y nada sigue en segundo plano. Con algo en segundo plano, su
 * aviso lo despierta y la entrada sigue abierta para el aviso del Studio. Pura.
 */
export const cerrarLaEntrada = (t: Turno): boolean => t.termino && t.fondo === 0;

/**
 * Si avanzaba al llegar su límite, para darle los minutos de más: su registro creció hace poco (menos de `sinActividadMin`)
 * o tiene algo corriendo (una orden larga, un ayudante: revisor.ts › herramientaEnCurso). Pura.
 */
export const avanzaba = (ultimaActividad: number | null, corre: string | null, ahora: number, sinActividadMin: number): boolean =>
  !!corre || (ultimaActividad !== null && ahora - ultimaActividad < sinActividadMin * 60_000);
