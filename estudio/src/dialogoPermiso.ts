// El diálogo que te pregunta un permiso en plena revisión (propuesta aceptada pr_permisos_al_momento, su pieza 4; pedido
// pd_permiso_espera; decisiones del titular del 26 de octubre de 2026). Cuando al director lanzado le falta un permiso, su
// gancho lo pregunta al servidor (estudio/servidor/permisosEnEspera.ts) y este diálogo lo muestra encima de lo que estés
// haciendo, con «Solo esta vez», «Permitir siempre» (solo para el proyecto que se revisa), «Permitir todo en esta
// revisión» (deja pasar lo que pida hasta que termine esa revisión, sin guardar ninguna regla; nota de voz del titular, 26
// de octubre de 2026) y «No lo autorizo», y la cuenta de los dos minutos. Suena al abrirse y cada 30 segundos, como mucho cuatro veces, y se calla apenas lo tocas; mientras
// grabas no suena (sonar ya lo calla) y la grabación sigue, y si al terminar de grabar no has respondido, vuelve a sonar en
// su siguiente aviso. Si la página no está a la vista, avisa también con una notificación del sistema que, al tocarla, trae
// la página. Mira el servidor cada pocos segundos: leer una lista en memoria no gasta nada. Todavía no pregunta ninguna
// revisión: el lanzador sigue en dontAsk hasta su pieza siguiente.
import { sonar } from './sonidos';

/** Los mismos de estudio/servidor/permisoAlMomento.ts (su prueba lo comprueba): ese archivo es del servidor. */
export const ESPERA_PERMISO_MS = 120_000;
export const REPETIR_SONIDO_MS = 30_000;
export const MAX_AVISOS = 4;
/** Cada cuánto mira el servidor si hay una pregunta esperando. */
const MIRAR_MS = 3_000;
const RUTA = '/__estudio/director/permiso-al-momento';

/** Lo que manda el servidor de cada pregunta que espera (PedidoEnEspera), con lo que el diálogo usa. */
export interface Pregunta {
  clave: string;
  id: string;
  proyecto: string;
  solicitud: { herramienta: string; entrada: Record<string, unknown> };
  propuesta: { regla: string | null; que: string; riesgo: string; motivo?: string };
  puedeSiempre: boolean;
  /** Por qué no se ofrece «Permitir siempre», en una línea; null si se ofrece. */
  porQueNoSiempre?: string | null;
  /** De una cadena de órdenes, las que no tiene permitidas: el diálogo pregunta solo por ellas. */
  faltan?: string[];
  pedidoEn: number;
  venceEn: number;
}

/**
 * De una cadena de órdenes, lo que le falta y lo que ya tiene (la guardia que lee la orden entera, decisión del titular
 * del 26 de octubre de 2026). Vacío si no es una cadena. Pura.
 */
export function soloLoQueFalta(p: Pick<Pregunta, 'faltan'>): string {
  if (!p.faltan?.length) return '';
  const una = p.faltan.length === 1;
  return `Son varias órdenes juntas y ya tiene permitidas las demás: te pregunta solo por ${una ? 'esta' : `estas ${p.faltan.length}`}.`;
}

/** Las cuatro salidas del diálogo, las mismas de estudio/servidor/permisoAlMomento.ts › Respuesta (su prueba lo comprueba). */
export type Respuesta = 'una_vez' | 'siempre' | 'todo' | 'no';

/** Lo que el director quiere hacer, en una línea: la orden, el archivo o la página; si no, solo la herramienta. Pura. */
export function queIntenta(p: Pick<Pregunta, 'solicitud'>): string {
  const { herramienta, entrada } = p.solicitud;
  const de = (k: string) => (typeof entrada[k] === 'string' ? (entrada[k] as string).trim() : '');
  const detalle = de('command') || de('file_path') || de('notebook_path') || de('path') || de('url') || de('pattern') || de('query');
  return detalle ? `${herramienta}: ${detalle.length > 300 ? `${detalle.slice(0, 300)}…` : detalle}` : herramienta;
}

/** Lo que le queda a una pregunta, en «m:ss», nunca menos de cero. Pura. */
export function cuentaAtras(venceEn: number, ahora: number): string {
  const s = Math.max(0, Math.ceil((venceEn - ahora) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Los instantes en que suena el diálogo, desde que se abre (`desde`): al abrirse y cada 30 segundos, como mucho 4 veces y
 * nunca pasados los 2 minutos; en cuanto lo tocas (`tocado`), no suena más. La misma regla del servidor. Pura.
 */
export function avisosDelSonido(desde: number, tocado?: number | null): number[] {
  const instantes: number[] = [];
  for (let i = 0; i < MAX_AVISOS; i++) {
    const t = desde + i * REPETIR_SONIDO_MS;
    if (t >= desde + ESPERA_PERMISO_MS || (tocado != null && t >= tocado)) break;
    instantes.push(t);
  }
  return instantes;
}

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** El diálogo y la pregunta que muestra: desde cuándo, si ya lo tocaste, cuántas veces sonó y si es el simulacro. */
let dlg: HTMLDialogElement | null = null;
let actual: { p: Pregunta; desde: number; tocado: number | null; sonados: number; simulacro?: (texto: string) => void } | null = null;

/**
 * El simulacro (decisión del titular del 26 de octubre de 2026, misión t_simulacro_permiso): «Probar el diálogo», en
 * «Modelo y consumo», te llama con un permiso de prueba, como lo haría el director, para ver y probar cada botón cuando
 * quieras, sin pedir una revisión ni gastar nada de tu plan. No va al servidor: lo que elijas no se guarda, y una
 * pregunta de verdad del director lo reemplaza.
 */
export function preguntaDePrueba(ahora: number): Pregunta {
  return {
    clave: 'simulacro',
    id: 'prueba',
    proyecto: 'Prueba del diálogo',
    solicitud: { herramienta: 'Bash', entrada: { command: 'node --version' } },
    propuesta: { regla: 'Bash(node:*)', que: 'Deja que el director corra cualquier orden de node.', riesgo: 'Con node se corre cualquier programa de JavaScript.' },
    puedeSiempre: true,
    porQueNoSiempre: null,
    pedidoEn: ahora,
    venceEn: ahora + ESPERA_PERMISO_MS,
  };
}

/** Lo que habría pasado con cada salida del simulacro, o si se acaba el tiempo (`vence`). Pura. */
export function resultadoDePrueba(r: Respuesta | 'vence'): string {
  const textos: Record<Respuesta | 'vence', string> = {
    una_vez: 'Con «Solo esta vez», el director habría hecho solo eso, y la próxima vez te volvería a preguntar.',
    siempre: 'Con «Permitir siempre», el director habría quedado con permiso para todo ese tipo de acción, solo en ese proyecto, y lo verías marcado en «Permisos», con su casilla para quitarlo.',
    todo: 'Con «Permitir todo en esta revisión», el director no te habría vuelto a preguntar hasta terminar esa revisión, salvo lo que nunca hace, que se le sigue negando.',
    no: 'Con «No lo autorizo», el director habría seguido sin ese permiso, y quedaría pendiente aquí, en «Lo que se le negó al director», para autorizarlo después.',
    vence: 'Sin respuesta en dos minutos, el director habría seguido sin ese permiso, y quedaría pendiente aquí, en «Lo que se le negó al director».',
  };
  return `${textos[r]} Era una prueba: no se guardó nada.`;
}

/** Abre el simulacro, salvo que el director esté preguntando algo de verdad; `alResponder` dice lo que habría pasado. */
export function probarDialogo(alResponder: (texto: string) => void): void {
  if (actual && !actual.simulacro) return alResponder('El director te está preguntando un permiso de verdad: respóndelo primero.');
  const p = preguntaDePrueba(Date.now());
  const d = dialogo();
  d.innerHTML = contenido(p, 0, true);
  actual = { p, desde: Date.now(), tocado: null, sonados: 0, simulacro: alResponder };
  if (!d.open) d.showModal();
  if (tictac === undefined) tictac = window.setInterval(latir, 1000);
  latir();
}
let tictac: number | undefined;
let respondiendo = false;

/** Lo que dice el diálogo de «Permitir todo en esta revisión»: qué deja pasar, hasta cuándo, y lo que no. */
export const EXPLICA_TODO = 'Deja pasar esta y todo lo que pida el director hasta que termine esta revisión, sin volver a preguntarte. No guarda ninguna regla: al terminar, se olvida. Lo que el Studio nunca permite (reescribir la historia, también la ya subida, leer tus claves, tocar sus propios permisos) se le sigue negando.';

/** Por qué no se ofrece «Permitir siempre», en una línea: lo que dice el servidor, o el motivo de la regla. Pura. */
export function porQueNoSiempre(p: Pick<Pregunta, 'porQueNoSiempre' | 'propuesta'>): string {
  const motivo = (p.porQueNoSiempre ?? p.propuesta.motivo ?? '').trim();
  return `«Permitir siempre» no se ofrece para esto${motivo ? `: ${motivo}` : '.'}`;
}

/** El HTML de una pregunta: qué quiere hacer, para qué proyecto, lo que daría «Permitir siempre» y «Permitir todo en esta revisión», y sus cuatro salidas. */
function contenido(p: Pregunta, mas: number, simulacro = false): string {
  const siempre = p.puedeSiempre
    ? `<h3>Con «Permitir siempre»</h3><p>${esc(p.propuesta.que)}${p.propuesta.riesgo ? ` ${esc(p.propuesta.riesgo)}` : ''} Vale solo para este proyecto, en cada revisión, y se quita en «Modelo y consumo» › «Permisos».</p>`
    : `<p class="permiso-sin-siempre">${esc(porQueNoSiempre(p))}</p>`;
  const cuenta = `<strong data-cuenta>${cuentaAtras(p.venceEn, Date.now())}</strong>`;
  return `<form method="dialog">
    <div class="cabeza-dialogo">
      <h2>${simulacro ? 'Prueba: el director te pide un permiso' : 'El director te pide un permiso'}</h2>
      ${simulacro ? `<p>Así te llama el director cuando le falta un permiso en una revisión. Es una prueba: ningún director lo pidió, y lo que elijas no se guarda. Si no respondes en ${cuenta}, se cierra como lo haría de verdad.</p>` : `<p>Lo necesita para seguir con la revisión de «${esc(p.proyecto)}». Si no respondes en ${cuenta}, sigue sin él, y el permiso queda pendiente en «Modelo y consumo» › «Permisos».</p>`}
    </div>
    <h3>Lo que quiere hacer</h3>
    <p class="permiso-que"><code>${esc(queIntenta(p))}</code></p>
    ${p.faltan?.length ? `<p>${esc(soloLoQueFalta(p))}</p>${p.faltan.map((o) => `<p class="permiso-que"><code>${esc(o)}</code></p>`).join('')}` : ''}
    ${siempre}
    <h3>Con «Permitir todo en esta revisión»</h3>
    <p>${esc(EXPLICA_TODO)}</p>
    ${mas > 0 ? `<p>Después de esta, ${mas === 1 ? 'espera otra pregunta' : `esperan ${mas} preguntas más`}.</p>` : ''}
    <p class="error-explorador" data-error></p>
    <div class="botones">
      <button type="button" data-permiso="no">No lo autorizo</button>
      ${p.puedeSiempre ? '<button type="button" data-permiso="siempre">Permitir siempre</button>' : ''}
      <button type="button" data-permiso="todo">Permitir todo en esta revisión</button>
      <button type="button" class="primario" data-permiso="una_vez">Solo esta vez</button>
    </div>
  </form>`;
}

/** El diálogo, creado una vez: Esc no lo cierra (se responde o vence), y tocarlo lo calla. */
function dialogo(): HTMLDialogElement {
  if (dlg) return dlg;
  dlg = document.createElement('dialog');
  dlg.className = 'dialogo-director dialogo-permiso';
  dlg.setAttribute('aria-live', 'assertive');
  dlg.addEventListener('cancel', (e) => e.preventDefault());
  const tocar = () => {
    if (actual && actual.tocado == null) actual.tocado = Date.now();
  };
  dlg.addEventListener('pointerdown', tocar);
  dlg.addEventListener('keydown', tocar);
  dlg.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-permiso]');
    if (b && actual) void responder(actual.p, b.dataset.permiso as Respuesta);
  });
  document.body.append(dlg);
  return dlg;
}

/** Tu respuesta al servidor; si ya no está (venció o terminó la revisión), lo dice y se cierra en la próxima mirada. */
async function responder(p: Pregunta, respuesta: Respuesta) {
  if (respondiendo) return;
  // El simulacro no va al servidor: dice lo que habría pasado y se cierra
  const prueba = actual?.simulacro;
  if (prueba) {
    cerrar();
    return prueba(resultadoDePrueba(respuesta));
  }
  respondiendo = true;
  // La primera vez, el navegador pregunta si deja avisar con notificaciones: se pide con tu clic, que es cuando lo deja
  if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission().catch(() => undefined);
  const r = await fetch(RUTA, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clave: p.clave, id: p.id, respuesta }), signal: AbortSignal.timeout(15_000) }).catch(() => null);
  respondiendo = false;
  if (!r?.ok) {
    const error = dlg?.querySelector<HTMLElement>('[data-error]');
    const porque = r ? ((await r.json().catch(() => null)) as { error?: string } | null)?.error : null;
    if (error) error.textContent = porque ?? 'No llegó al Studio: vuelve a intentarlo.';
    return;
  }
  cerrar();
  void mirar();
}

function cerrar() {
  actual = null;
  if (tictac !== undefined) clearInterval(tictac);
  tictac = undefined;
  if (dlg?.open) dlg.close();
}

/** Cada segundo, con el diálogo abierto: la cuenta y el sonido que toca. */
function latir() {
  if (!actual || !dlg) return;
  const ahora = Date.now();
  // Al simulacro nadie lo vence en el servidor: se cierra solo al acabarse su tiempo, como lo haría de verdad
  const prueba = actual.simulacro;
  if (prueba && ahora >= actual.p.venceEn) {
    cerrar();
    return prueba(resultadoDePrueba('vence'));
  }
  const cuenta = dlg.querySelector<HTMLElement>('[data-cuenta]');
  if (cuenta) cuenta.textContent = cuentaAtras(actual.p.venceEn, ahora);
  const tocan = avisosDelSonido(actual.desde, actual.tocado).filter((t) => t <= ahora).length;
  if (tocan > actual.sonados) {
    actual.sonados = tocan;
    sonar('permiso');
  }
}

/** Si no estás mirando la página, una notificación del sistema que la trae al tocarla. */
function notificar(p: Pregunta) {
  if (document.visibilityState === 'visible' || !('Notification' in window) || Notification.permission !== 'granted') return;
  const n = new Notification('El director te pide un permiso', { body: queIntenta(p), tag: `stl-permiso-${p.clave}-${p.id}` });
  n.onclick = () => {
    window.focus();
    n.close();
  };
}

/** Muestra la primera pregunta que espera, o cierra el diálogo si ya no queda ninguna. */
function mostrar(pendientes: Pregunta[]) {
  const p = pendientes[0];
  if (!p) {
    // El simulacro sigue abierto aunque el director no pregunte nada; una pregunta de verdad lo reemplaza
    if (actual && !actual.simulacro) cerrar();
    return;
  }
  if (actual && actual.p.clave === p.clave && actual.p.id === p.id) return;
  const d = dialogo();
  d.innerHTML = contenido(p, pendientes.length - 1);
  actual = { p, desde: Date.now(), tocado: null, sonados: 0 };
  if (!d.open) d.showModal();
  if (tictac === undefined) tictac = window.setInterval(latir, 1000);
  latir();
  notificar(p);
}

async function mirar() {
  const r = await fetch(RUTA, { signal: AbortSignal.timeout(10_000) }).catch(() => null);
  if (!r?.ok) return;
  const cuerpo = (await r.json().catch(() => null)) as { pendientes?: Pregunta[] } | null;
  if (Array.isArray(cuerpo?.pendientes)) mostrar(cuerpo.pendientes);
}

/** Empieza a mirar si el director pregunta algo: una vez, al cargar la página. */
export function vigilarPermisos(): void {
  window.setInterval(() => void mirar(), MIRAR_MS);
  void mirar();
}
