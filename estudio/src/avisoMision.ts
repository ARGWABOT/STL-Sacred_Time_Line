// El aviso de misión completada (pedido pd_toast_mision; nota de voz del titular nmvvbmk29tit, 30 de octubre de 2026: «que
// aparezca por un ladito o en forma de toast, pero que no bloquee al usuario de empezar inmediatamente a leer la siguiente
// misión»): en lugar de la ventana que pedía «Ir a mi misión →», un aviso pequeño a un lado, que se va solo. No es un
// diálogo: no tapa la misión siguiente ni toma el foco. El sonido de la entrega ya suena al entregarla
// (app.ts › completarSiToca).
import { icono } from './iconos';
import { t } from './textos';
import { esc } from './util';

/** Lo que dura a la vista: unos 3 segundos; con «Ir a mi misión» (estabas en otra sección), un poco más para usarlo. */
export const DURA_MS = 3500;
export const DURA_CON_BOTON_MS = 8000;

/**
 * Los demás avisos del Studio (app.ts › avisar) van en este mismo estilo, arriba a la derecha, angostos y altos, y
 * lo bueno dura poco, como este (nota de voz del titular nmvvdc2f4tit, 30 de octubre de 2026); con un atajo, un poco más
 * para usarlo. Un error se queda hasta leerlo.
 */
export const AVISO_MS = 4000;
export const AVISO_CON_ATAJO_MS = 6000;

/**
 * El aviso de una nota de voz ya transcrita: solo eso, con su «Ver en el Buzón» opcional, y como mucho 3 segundos (notas de
 * voz del titular nmvvi7svwtit y nmvvi8xi2tit, 30 de octubre de 2026: «no necesito que me avises lo que vas a hacer,
 * avísame cuando esté hecho»). Al guardar la nota no se dice nada del audio. Su texto está en los textos de la interfaz
 * (textos/es.ts › aviso.audioTraducido, con su inglés).
 */
export const AVISO_AUDIO_MS = 3000;

/**
 * Las entregas que este navegador ya da por hechas mientras el servidor las guarda (app.ts › completarSiToca): la
 * misión siguiente toma el lugar de la entregada en cuanto se marca el último paso, sin una pantalla de por medio con la
 * misión completa esperando al servidor (nota de voz del titular nmvvi7svwtit). Un estado que llega del servidor antes
 * de que la guarde no la deshace. Pura.
 */
export function conEntregasEnVuelo<E, S extends { entregas: Record<string, E> }>(estado: S, enVuelo: ReadonlyMap<string, E>): S {
  const faltan = [...enVuelo].filter(([id]) => !estado.entregas[id]);
  return faltan.length ? { ...estado, entregas: { ...estado.entregas, ...Object.fromEntries(faltan) } } : estado;
}

export interface AvisoMision {
  titulo: string;
  xp: number;
  /** En qué quedó la entrega, en una línea (la revisión siguiente, la ya pedida o cuando la pidas). */
  estado: string;
  /** La recomendación del director de pedir la revisión, ya pintada con su botón: el aviso queda hasta cerrarlo. */
  recomienda?: string;
  /** Si estabas en otra sección: el aviso trae «Ir a mi misión →»; en «Hoy», la misión siguiente ya está a la vista. */
  irAMision?: boolean;
}

/** El aviso: la misión, su XP y en qué quedó. Sin botón que haya que oprimir para seguir. Puro. */
export function htmlAvisoMision(a: AvisoMision): string {
  return `<div class="aviso-mision-cabeza">${icono('estrella')}<span class="etiqueta">${t('mision.completada')}</span><b class="xp">+${a.xp} XP</b><button type="button" class="cerrar-aviso-mision" data-cerrar-aviso-mision aria-label="${esc(t('mision.cerrarAviso'))}">✕</button></div>
    <p class="aviso-mision-titulo">${esc(a.titulo)}</p>
    <p class="como">${esc(a.estado)}</p>${a.recomienda ?? ''}${a.irAMision ? `<button type="button" class="ir-aviso-mision" data-ir-mision-aviso>${t('mision.irAMiMision')}</button>` : ''}`;
}

/** Cuánto dura, en milisegundos: null si lleva la recomendación de pedir la revisión (se queda hasta cerrarlo). Pura. */
export function duracionAviso(a: AvisoMision): number | null {
  if (a.recomienda) return null;
  return a.irAMision ? DURA_CON_BOTON_MS : DURA_MS;
}

/**
 * Un aviso por suceso (nota de voz del titular nmvvk9zwktit, 30 de octubre de 2026: salían dos a la vez): si lo que se
 * hace en un paso (elegir una opción, «Ya te lo dije en mi comentario») completa la misión, el aviso es solo el de misión
 * completada, que ya dice en qué quedó; el del paso no sale. Pura.
 */
export function completaLaMision(pasos: number, hechos: readonly number[], paso: number): boolean {
  return pasos > 0 && Array.from({ length: pasos }, (_, k) => k).every((k) => k === paso || hechos.includes(k));
}

/**
 * Las misiones abiertas con todos sus pasos ya marcados y sin entregar, que se entregan solas (nota de voz del titular
 * nmw2rpl8atit, 4 de noviembre de 2026: eligió la opción del último paso y la misión quedó en «Hiciste todos los pasos:
 * entrégala al director», con su botón). La entrega sola iba solo justo después de marcar: si la página se recargaba a
 * media entrega (al cerrarse la revisión) o la vigilancia de los pasos ya estaba ocupada, nada la volvía a intentar. Solo
 * las pendientes o en curso: una para rehacer espera lo que se le pide. Pura.
 */
export function completasSinEntregar(misiones: readonly { id: string; pasos: readonly unknown[] }[], hechos: (id: string) => readonly number[]): string[] {
  return misiones.filter((m) => m.pasos.length > 0 && m.pasos.every((_, k) => hechos(m.id).includes(k))).map((m) => m.id);
}

/**
 * Que se note que un paso avanzó (nota de voz del titular nmvy2yvsitit, 1 de noviembre de 2026: eligió una opción, grabó
 * su comentario y creyó que el paso no avanzó). Sí avanzó: la bitácora lo marcó un segundo después, y su siguiente nota es
 * del paso 2, que solo existe en pantalla si el 1 quedó marcado. Pero un paso nuevo con las mismas opciones, en el mismo
 * lugar y sin su número a la vista se ve igual, y con audio no sale el aviso de lo elegido. Por eso el paso lleva su
 * rótulo y, al avanzar, un aviso y un realce. Qué paso queda en pantalla, contados desde 1, o null si no queda ninguno. Pura.
 */
export function avanceDelPaso(pasos: number, hechos: readonly number[], paso: number): { hecho: number; sigue: number } | null {
  const sigue = Array.from({ length: pasos }, (_, k) => k).find((k) => k !== paso && !hechos.includes(k));
  return sigue === undefined ? null : { hecho: paso + 1, sigue: sigue + 1 };
}

/**
 * Qué se puede oprimir en un paso con opciones cuyo botón manda a ver algo (`ir`). Las opciones del director esperan a que
 * se visite el enlace. «Ya te lo dije en mi comentario» no: ya hay un comentario de la persona en ese paso, que es justo lo
 * que ese botón da por respuesta, así que se puede usar desde el primer momento (nmw40q410tit); sin comentario no sale.
 * «Ya lo comenté antes» tampoco espera: la instrucción ya está en una nota anterior, y la persona decide si es algo que ya
 * comentó sin tener que ir y volver del enlace (nota de voz del titular nmw5gful2tit). Pura.
 */
export function opcionesHabilitadas(a: { requiereVisita: boolean; visitado: boolean; comento: boolean }): { opciones: boolean; yaLoDijeSale: boolean; yaLoDijeHabilitado: boolean; yaLoComenteHabilitado: boolean } {
  return { opciones: !a.requiereVisita || a.visitado, yaLoDijeSale: a.comento, yaLoDijeHabilitado: a.comento, yaLoComenteHabilitado: true };
}

/** El rótulo de un paso en su tarjeta: «Paso 2». Una misión de un solo paso no lo necesita. No dice cuántos faltan. Pura. */
export const rotuloDelPaso = (i: number, pasos: number): string => (pasos > 1 ? t('paso.numero', { n: i + 1 }) : '');

/** Cuánto dura el realce del paso al que se acaba de llegar (estilos en director.css › .paso-recien). */
export const RECIEN_MS = 3000;

/**
 * Los avisos, apilados uno debajo del otro, nunca uno encima del otro (nota de voz del titular nmvvk7nw2tit, 30 de
 * octubre de 2026): el de misión completada arriba y el de lo demás (app.ts › avisar) bajo él, con aire entre los
 * dos. Cuánto baja el de abajo: el alto del de arriba más ese aire; 0 sin él. Pura.
 */
export const AIRE_AVISOS = 8;
export const bajoAvisoMision = (alto: number | null) => (alto ? alto + AIRE_AVISOS : 0);

/** Pone al día cuánto baja el aviso de abajo (estilos.css › .aviso-flotante, `--bajo-aviso-mision`). */
function apilar(el: HTMLElement | null) {
  document.documentElement.style.setProperty('--bajo-aviso-mision', `${bajoAvisoMision(el ? el.offsetHeight : null)}px`);
}

let hasta: ReturnType<typeof setTimeout> | null = null;

/** Quita el aviso de misión completada, si está, y el de abajo sube a su lugar. */
export function quitarAvisoMision() {
  document.querySelector('.aviso-mision')?.remove();
  apilar(null);
}

/** Pone el aviso a un lado (uno a la vez: el nuevo reemplaza al anterior) y lo quita solo al cumplir su tiempo. */
export function mostrarAvisoMision(a: AvisoMision, alIr?: () => void) {
  quitarAvisoMision();
  if (hasta) clearTimeout(hasta);
  hasta = null;
  const el = document.createElement('aside');
  el.className = 'aviso-mision';
  el.setAttribute('role', 'status');
  el.innerHTML = htmlAvisoMision(a);
  const quitar = () => {
    el.classList.add('saliendo');
    apilar(null);
    setTimeout(() => el.remove(), 300);
  };
  el.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!b) return;
    // «Pedir la revisión» de la recomendación la pide el oyente de toda la página ([data-revision]); aquí solo se quita
    if (b.dataset.irMisionAviso !== undefined) alIr?.();
    if (b.dataset.irMisionAviso !== undefined || b.dataset.cerrarAvisoMision !== undefined || b.dataset.revision === 'pedir') quitar();
  });
  document.body.append(el);
  apilar(el);
  const dura = duracionAviso(a);
  if (dura) hasta = setTimeout(quitar, dura);
}
