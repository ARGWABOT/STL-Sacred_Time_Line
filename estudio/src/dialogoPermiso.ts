// El aviso que te pregunta un permiso en plena revisión, en el único modo de permisos del Studio (documento «One
// permission mode», decisiones nmwp8uot6tit y nmwp8wpaatit; antes pr_permisos_al_momento y pd_permiso_espera). Cuando al
// director lanzado le falta un permiso que no está en la lista corta y segura, su gancho lo pregunta al servidor
// (estudio/servidor/permisosEnEspera.ts) y este aviso lo muestra encima de lo que estés haciendo, con cuatro botones en una
// fila: «Solo esta vez», «Siempre, en este proyecto», «Siempre, en todos los proyectos» y «No lo autorizo». Un clic
// responde y lo recuerda. La revisión queda en pausa hasta que respondas, sin límite de tiempo y sin que cuente para su
// límite (nmwp6ch5utit, nmwp6dy6ntit). Suena al abrirse y cada 30 segundos, como mucho cuatro veces, y se calla apenas lo
// tocas; mientras grabas no suena (sonar ya lo calla) y la grabación sigue. Si la página no está a la vista, avisa también
// con una notificación del sistema que, al tocarla, trae la página. Mira el servidor cada pocos segundos: leer una lista
// en memoria no gasta nada.
import { sonar } from './sonidos';
import { t } from './textos';

/** Los mismos de estudio/servidor/permisoAlMomento.ts (su prueba lo comprueba): ese archivo es del servidor. */
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
  /** Por qué no se ofrecen los dos «Siempre», en una línea; null si se ofrece. */
  porQueNoSiempre?: string | null;
  /** Si «Siempre» vale solo para este proyecto (subir, traer, publicar: nmwpbxbmetit): no se ofrece el de todos. */
  soloEsteProyecto?: boolean;
  /** De una cadena de órdenes, las que no tiene permitidas: el diálogo pregunta solo por ellas. */
  faltan?: string[];
  pedidoEn: number;
}

/**
 * De una cadena de órdenes, lo que le falta y lo que ya tiene (la guardia que lee la orden entera, decisión del titular
 * del 26 de octubre de 2026). Vacío si no es una cadena. Pura.
 */
export function soloLoQueFalta(p: Pick<Pregunta, 'faltan'>): string {
  if (!p.faltan?.length) return '';
  return t('permiso.soloFalta', { n: p.faltan.length });
}

/** Las cuatro salidas del aviso, las mismas de estudio/servidor/permisoAlMomento.ts › Respuesta (su prueba lo comprueba), en su orden. */
export type Respuesta = 'una_vez' | 'siempre' | 'siempre_todos' | 'no';
export const RESPUESTAS: readonly Respuesta[] = ['una_vez', 'siempre', 'siempre_todos', 'no'];

/** Lo que el director quiere hacer, en una línea: la orden, el archivo o la página; si no, solo la herramienta. Pura. */
export function queIntenta(p: Pick<Pregunta, 'solicitud'>): string {
  const { herramienta, entrada } = p.solicitud;
  const de = (k: string) => (typeof entrada[k] === 'string' ? (entrada[k] as string).trim() : '');
  const detalle = de('command') || de('file_path') || de('notebook_path') || de('path') || de('url') || de('pattern') || de('query');
  return detalle ? `${herramienta}: ${detalle.length > 300 ? `${detalle.slice(0, 300)}…` : detalle}` : herramienta;
}

/**
 * Los instantes en que suena el aviso, desde que se abre (`desde`): al abrirse y cada 30 segundos, como mucho 4 veces; en
 * cuanto lo tocas (`tocado`), no suena más. La misma regla del servidor. Pura.
 */
export function avisosDelSonido(desde: number, tocado?: number | null): number[] {
  const instantes: number[] = [];
  for (let i = 0; i < MAX_AVISOS; i++) {
    const t = desde + i * REPETIR_SONIDO_MS;
    if (tocado != null && t >= tocado) break;
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
    proyecto: t('permiso.pruebaProyecto'),
    solicitud: { herramienta: 'Bash', entrada: { command: 'node --version' } },
    propuesta: { regla: 'Bash(node:*)', que: t('permiso.pruebaQue'), riesgo: t('permiso.pruebaRiesgo') },
    puedeSiempre: true,
    porQueNoSiempre: null,
    pedidoEn: ahora,
  };
}

/** Lo que habría pasado con cada salida del simulacro. Pura. */
export function resultadoDePrueba(r: Respuesta): string {
  const textos = { una_vez: 'permiso.resultadoUnaVez', siempre: 'permiso.resultadoSiempre', siempre_todos: 'permiso.resultadoSiempreTodos', no: 'permiso.resultadoNo' } as const;
  return `${t(textos[r])} ${t('permiso.eraPrueba')}`;
}

/** Abre el simulacro, salvo que el director esté preguntando algo de verdad; `alResponder` dice lo que habría pasado. */
export function probarDialogo(alResponder: (texto: string) => void): void {
  if (actual && !actual.simulacro) return alResponder(t('permiso.deVerdad'));
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

/** Por qué no se ofrece «Permitir siempre», en una línea: lo que dice el servidor, o el motivo de la regla. Pura. */
export function porQueNoSiempre(p: Pick<Pregunta, 'porQueNoSiempre' | 'propuesta'>): string {
  const motivo = (p.porQueNoSiempre ?? p.propuesta.motivo ?? '').trim();
  return `${t('permiso.noSiempre')}${motivo ? `: ${motivo}` : '.'}`;
}

/** El HTML de una pregunta: qué quiere hacer, para qué proyecto, lo que darían los dos «Siempre», y sus cuatro botones en una fila. */
export function contenido(p: Pregunta, mas: number, simulacro = false): string {
  const soloAqui = p.puedeSiempre && p.soloEsteProyecto && p.porQueNoSiempre ? `<p class="permiso-sin-siempre">${esc(p.porQueNoSiempre.replace(/^./, (c) => c.toUpperCase()))}</p>` : '';
  const siempre = p.puedeSiempre
    ? `<h3>${t('permiso.conSiempre')}</h3><p>${esc(p.propuesta.que)}${p.propuesta.riesgo ? ` ${esc(p.propuesta.riesgo)}` : ''} ${t('permiso.siempreVale')}</p>${soloAqui}`
    : `<p class="permiso-sin-siempre">${esc(porQueNoSiempre(p))}</p>`;
  return `<form method="dialog">
    <div class="cabeza-dialogo">
      <h2>${t(simulacro ? 'permiso.tituloPrueba' : 'permiso.titulo')}</h2>
      <p>${simulacro ? t('permiso.introPrueba') : t('permiso.intro', { proyecto: esc(p.proyecto) })}</p>
    </div>
    <h3>${t('permiso.loQueQuiere')}</h3>
    <p class="permiso-que"><code>${esc(queIntenta(p))}</code></p>
    ${p.faltan?.length ? `<p>${esc(soloLoQueFalta(p))}</p>${p.faltan.map((o) => `<p class="permiso-que"><code>${esc(o)}</code></p>`).join('')}` : ''}
    ${siempre}
    ${mas > 0 ? `<p>${t('permiso.masPreguntas', { n: mas })}</p>` : ''}
    <p class="error-explorador" data-error></p>
    <div class="botones">
      <button type="button" class="primario" data-permiso="una_vez">${t('permiso.botonUnaVez')}</button>
      ${p.puedeSiempre ? `<button type="button" data-permiso="siempre">${t('permiso.botonSiempre')}</button>` : ''}
      ${p.puedeSiempre && !p.soloEsteProyecto ? `<button type="button" data-permiso="siempre_todos">${t('permiso.botonSiempreTodos')}</button>` : ''}
      <button type="button" data-permiso="no">${t('permiso.botonNo')}</button>
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
    if (error) error.textContent = porque ?? t('permiso.noLlego');
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

/** Cada segundo, con el aviso abierto: el sonido que toca. Sin cuenta atrás: la espera no tiene límite. */
function latir() {
  if (!actual || !dlg) return;
  const ahora = Date.now();
  const tocan = avisosDelSonido(actual.desde, actual.tocado).filter((t) => t <= ahora).length;
  if (tocan > actual.sonados) {
    actual.sonados = tocan;
    sonar('permiso');
  }
}

/** Si no estás mirando la página, una notificación del sistema que la trae al tocarla. */
function notificar(p: Pregunta) {
  if (document.visibilityState === 'visible' || !('Notification' in window) || Notification.permission !== 'granted') return;
  const n = new Notification(t('permiso.titulo'), { body: queIntenta(p), tag: `stl-permiso-${p.clave}-${p.id}` });
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
