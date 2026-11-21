// La pestaña de QA de cada proyecto, primer tramo (pedido pd_pestana_qa; decisión nmwp68i87tit, «Una pestaña»): la pestaña
// reusada de los atajos de un proyecto pasa a ser una página del Studio con la aplicación dentro de un marco que llena la
// ventana, abierta por los mismos atajos y por la misma puerta. Oprimir otro atajo del mismo proyecto recarga esa pestaña
// con el marco en la página nueva; cerrarla sigue cerrando la sesión de la aplicación (app.ts › vigilarVentanaDelAtajo).
// Una aplicación que no se deja mostrar en un marco (sus cabeceras lo dicen) se abre como antes, con un aviso
// (pestana-qa.md › 7, «Una aplicación que rehúsa el marco»). El ayudante flotante y las capturas son los tramos siguientes.

//
// Segundo tramo (pd_pestana_qa; nmwp9hz51tit, nmwp9inuqtit, nmwpkjjzqtit, nmwpkjw9ltit, nmwpc43ottit, nmwpkja4dtit): sobre
// la aplicación, el director flotante pequeño, con «Nota», «Tomar captura» (apagado hasta el tercer tramo) y «Volver a mi
// misión». Se arrastra y se pliega; abierto la primera vez y después como se dejó, por proyecto (en este navegador).
// «Volver a mi misión» trae al frente la pestaña del Studio, en esa misión, y deja abierta la de QA. Su nota va al Buzón
// de ese proyecto, ligada al paso que abrió la pestaña y a la página. Y la página pública de STL abre también en la
// pestaña de QA, en la estación que nombra el paso (la publicada, nmwpkja4dtit).
//
// Tercer tramo, de una vez (nmwplyqprtit): «Nota» abre el mismo diálogo de notas del Studio (dialogoNota.ts: grabar por
// partes, otro audio, pegar imágenes, el tipo de un toque, con su estilo); «Tomar captura» congela la vista, la marca con
// las herramientas rojas en una barra arriba (nmwpmf0i5tit) y abre ese diálogo con la imagen y el micrófono grabando
// (qaPagina.ts, capturaQa.ts). La nota se cierra al enviarla (nmwpmgesctit) y aparece sola en el Buzón abierto.
//
// La vista de dispositivo (pd_qa_vista_dispositivo; nmwppvslltit, nmwppw2qjtit, nmwppwj1stit, nmwppx56ftit, nmwppyi02tit,
// nmwppz2zvtit, nmwppzjq0tit, nmwpq11frtit): tres iconos bajo «Volver a mi misión» (escritorio, tableta, teléfono), que se
// pliegan con él. La tableta y el teléfono son la aplicación en una pantalla de 820 × 1180 o 390 × 844, derecha, dentro de
// un contorno dibujado, achicada solo si no cabe y nunca con barra vertical. Este navegador recuerda el dispositivo por
// proyecto; la primera vez que se pasa a tableta o teléfono, una línea dice su único límite. La fotonota toma la ventana
// entera y dice en qué dispositivo se tomó. Un paso puede abrir ya en una vista (`dispositivo`, en su atajo o en su botón a
// la página pública). Al cambiar de dispositivo, el marco se recarga en la dirección que mostraba (nmwpsf2getit): la página
// arranca ya con ese tamaño, como en ese aparato (su menú de teléfono, sus estaciones encuadradas), y no la de escritorio
// encogida; y si la pantalla simulada cabe entera con su contorno, va a su tamaño real, escala 1.
//
// La última elección gana y nada sale de la caché (pd_qa_recarga_dispositivo; nmwpu178utit, nmwpu4fgxtit): el
// `dispositivo` de un paso vale solo la primera vez que su botón abre la pestaña (este navegador recuerda qué pasos ya la
// abrieron), así que recargar deja el dispositivo que la persona eligió por última vez. Y cada carga de la pestaña, al
// abrirla y en cada cambio de dispositivo, lleva un parámetro nuevo (PARAM_SIN_CACHE) antes del #: la página se pide otra
// vez entera, también la publicada de otro origen, que con solo el # igual saltaba a su ancla sin recargar.
import { PAGINA_PUBLICA } from '../../src/director/director.ts';
import { esDispositivoQa, type DispositivoQa } from '../../src/director/atajo.ts';

/** La ruta del Studio que abre la pestaña de QA de un paso con atajo. */
export const RUTA_QA = '/__estudio/director/qa';
/** Donde el director flotante deja su nota. */
export const RUTA_NOTA_QA = `${RUTA_QA}/nota`;

/** La dirección de la pestaña de QA del atajo de un paso. Pura. */
export const direccionQa = (mision: string, paso: string | number) => `${RUTA_QA}?mision=${encodeURIComponent(mision)}&paso=${encodeURIComponent(String(paso))}`;

/** Si una dirección es de la página pública de STL (el recorrido), que abre en la pestaña de QA en su estación. Pura. */
export const esPaginaDelStudio = (url: string) => url.startsWith(PAGINA_PUBLICA);

/**
 * El parámetro que hace única cada carga de la pestaña de QA (nmwpu4fgxtit): con él, el navegador no sirve la página de
 * su caché. Las dos funciones de abajo lo escriben literal, porque van tal cual dentro del guion de la página.
 */
export const PARAM_SIN_CACHE = 'stl-qa';

/** Las cabeceras de la página de QA y de su redirección: nunca se guardan (nmwpu4fgxtit). */
export const CABECERAS_QA = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache', Expires: '0' } as const;

/**
 * Una dirección con la marca de esta carga (`stl-qa=<marca>`), puesta antes del # y en lugar de la anterior: así cada
 * carga es otra dirección y se pide entera, también la de otro origen con solo un # (nmwpu4fgxtit). Pura; va tal cual
 * dentro del guion de la página (directorFlotante), por eso sin nada de afuera.
 */
export function marcaSinCache(url: string, marca: string): string {
  var i = url.indexOf('#'), hash = i < 0 ? '' : url.slice(i), base = i < 0 ? url : url.slice(0, i);
  var q = base.indexOf('?'), ruta = q < 0 ? base : base.slice(0, q);
  var partes = (q < 0 ? '' : base.slice(q + 1)).split('&').filter(function (x) { return !!x && x.split('=')[0] !== 'stl-qa'; });
  partes.push('stl-qa=' + encodeURIComponent(marca));
  return ruta + '?' + partes.join('&') + hash;
}

/**
 * La dirección con la estación del recorrido que la página contó (nmwpv6866tit, pd_qa_estacion): el recorrido publicado es
 * de otro origen y la pestaña no puede leer dónde va, así que él le dice su estación (`{ tipo: 'stl-estacion', hash }`) y
 * al cambiar de dispositivo se recarga ahí, no en la del paso. `hash` vacío es la portada; null, sin cambio. Pura; va tal
 * cual dentro del guion.
 */
export function conEstacion(url: string, hash: string | null): string {
  if (hash === null || (hash !== '' && !/^#[\w-]+$/.test(hash))) return url;
  var i = url.indexOf('#');
  return (i < 0 ? url : url.slice(0, i)) + hash;
}

/** Dónde recuerda este navegador la última estación que contó el recorrido de un proyecto (sobrevive a «Volver a mi misión»). */
export const claveEstacionQa = (proyecto: string) => `stl-qa-estacion:${proyecto}`;

/**
 * La dirección con que abre la pestaña: si no nombra nada en concreto (ni # ni `ver`/`abrir`), la última estación
 * recordada; si el botón nombra una estación, sección o ancla, esa gana siempre. La puerta de un proyecto no se toca.
 * Pura; va tal cual dentro del guion.
 */
export function conEstacionRecordada(url: string, recordada: string | null): string {
  if (!recordada || !/^#[\w-]+$/.test(recordada) || url.indexOf('/__stl/puerta') >= 0) return url;
  var i = url.indexOf('#');
  if (i >= 0 && url.length > i + 1) return url;
  var base = i < 0 ? url : url.slice(0, i);
  if (/[?&](ver|abrir)=/.test(base)) return url;
  return base + recordada;
}

/**
 * La dirección con que el marco se recarga: la marca nueva en la dirección y, si es la puerta de un proyecto
 * (`/__stl/puerta`), también en la página a la que lleva (`ir`), que es la que se muestra. Pura; va tal cual dentro del guion.
 */
export function recargaSinCache(src: string, marca: string): string {
  var m = src.indexOf('/__stl/puerta') < 0 ? null : /([?&]ir=)([^&#]*)/.exec(src);
  if (m) src = src.slice(0, m.index) + m[1] + encodeURIComponent(marcaSinCache(decodeURIComponent(m[2]), marca)) + src.slice(m.index + m[0].length);
  return marcaSinCache(src, marca);
}

/** Dónde recuerda este navegador cómo quedó el director flotante de un proyecto: plegado o no, y su lugar. */
export const claveDirectorQa = (proyecto: string) => `stl-qa-director:${proyecto}`;

/**
 * El tipo con que llega al Buzón una fotonota (nmwpow115tit, «Keep "Bug"»): es solo voz y no trae tipo que elegir, así
 * que llega como «Falla»; si es otra cosa, el director corrige su tipo al responderla.
 */
export const TIPO_FOTONOTA = 'falla';

/** Lo que la página manda al Studio para volver a la misión (la pestaña del Studio la escucha: app.ts). */
export const MENSAJE_VOLVER = 'stl-volver-mision';

/** El tamaño de la pantalla simulada de cada dispositivo, derecha; el escritorio llena la ventana (nmwppvslltit). */
export const TAMANOS_QA: Record<DispositivoQa, { ancho: number; alto: number } | null> = { escritorio: null, tableta: { ancho: 820, alto: 1180 }, telefono: { ancho: 390, alto: 844 } };
/** El grosor del contorno dibujado alrededor de la pantalla simulada, y el aire que le queda hasta el borde de la ventana. */
export const BORDE_QA = 14;
export const MARGEN_QA = 16;

/**
 * La escala de la pantalla simulada en una ventana: solo se achica si no cabe, con su contorno y su aire, y nunca crece
 * más allá de su tamaño real (nmwppw2qjtit). Así nunca hay barra vertical. Pura (el guion de la página hace la misma cuenta).
 */
export function escalaQa(t: { ancho: number; alto: number }, ventana: { ancho: number; alto: number }): number {
  // Si cabe entera con su contorno, a su tamaño real, aunque le falte el aire (nmwpsf2getit: se veía más chica de lo que es)
  if (ventana.ancho >= t.ancho + 2 * BORDE_QA && ventana.alto >= t.alto + 2 * BORDE_QA) return 1;
  return Math.max(0.1, Math.min(1, (ventana.ancho - 2 * MARGEN_QA) / (t.ancho + 2 * BORDE_QA), (ventana.alto - 2 * MARGEN_QA) / (t.alto + 2 * BORDE_QA)));
}

/**
 * La nota del director flotante, como la guarda el Studio: un comentario sobre el paso que abrió la pestaña (como el ✉
 * del paso), con la página donde se escribió en su primera línea, y el dispositivo, si no era el escritorio
 * (nmwppyi02tit). Null si falta algo. Pura.
 */
export function notaDeQa(c: Record<string, unknown>, desde: (pagina: string, dispositivo?: DispositivoQa) => string): { tipo: 'comentar'; sobre: { tipo: 'mision'; id: string; seccion: string }; texto: string; tipoNota?: string; audio?: string; adjuntos?: { nombre: string; datos: string }[] } | null {
  const dispositivo = esDispositivoQa(c.dispositivo) && c.dispositivo !== 'escritorio' ? c.dispositivo : undefined;
  const mision = typeof c.mision === 'string' ? c.mision : '';
  const paso = Number(c.paso);
  const texto = typeof c.texto === 'string' ? c.texto.trim() : '';
  const pagina = typeof c.pagina === 'string' ? c.pagina.trim().slice(0, 500) : '';
  // Lo grabado y lo adjunto (la captura marcada, lo pegado), como en el ✉ del Studio (nmwplyqprtit)
  const audio = typeof c.audio === 'string' && c.audio.startsWith('data:audio/') ? c.audio : '';
  const adjuntos = Array.isArray(c.adjuntos) ? c.adjuntos.filter((a): a is { nombre: string; datos: string } => !!a && typeof a.nombre === 'string' && typeof a.datos === 'string') : [];
  if (!mision || !Number.isInteger(paso) || paso < 0 || (!texto && !audio && !adjuntos.length)) return null;
  return {
    tipo: 'comentar',
    sobre: { tipo: 'mision', id: mision, seccion: `Paso ${paso + 1}` },
    texto: pagina ? `${desde(pagina, dispositivo)}${texto ? `\n\n${texto}` : ''}` : texto,
    ...(typeof c.tipoNota === 'string' && c.tipoNota ? { tipoNota: c.tipoNota } : {}),
    ...(audio ? { audio } : {}),
    ...(adjuntos.length ? { adjuntos } : {}),
  };
}

/**
 * Si la aplicación rehúsa mostrarse en un marco de la página del Studio (`origenStudio`), según sus cabeceras:
 * `X-Frame-Options` (DENY, o SAMEORIGIN con otro origen) o el `frame-ancestors` de su Content-Security-Policy que no
 * deja al Studio. Sin esas cabeceras, se deja. Pura.
 */
export function rehusaElMarco(cabeceras: { get(nombre: string): string | null }, origenApp: string, origenStudio: string): boolean {
  const xfo = (cabeceras.get('x-frame-options') ?? '').trim().toLowerCase();
  if (xfo === 'deny') return true;
  if (xfo === 'sameorigin' && origenApp !== origenStudio) return true;
  const csp = cabeceras.get('content-security-policy') ?? '';
  const ancestros = /(?:^|;)\s*frame-ancestors\s+([^;]*)/i.exec(csp)?.[1]?.trim().split(/\s+/);
  if (!ancestros) return false;
  return !ancestros.some((a) => {
    const x = a.toLowerCase().replace(/\/+$/, '');
    if (x === '*') return true;
    if (x === "'self'") return origenApp === origenStudio;
    if (x === "'none'") return false;
    return x === origenStudio.toLowerCase() || (x.endsWith(':*') && origenStudio.toLowerCase().startsWith(x.slice(0, -1)));
  });
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Lo que dice la página de QA, ya en el idioma de la interfaz. */
export interface TextosQa { titulo: string; rehusa: string; abrirAqui: string }

/** Lo que dice el director flotante, ya en el idioma de la interfaz. */
export interface TextosDirectorQa {
  /** Qué paso abrió la pestaña («Step 2 of “…”»). */
  paso: string;
  nota: string; captura: string; volver: string;
  plegar: string; desplegar: string; mover: string;
  /** La vista de dispositivo: el nombre del grupo, el de cada icono y la línea de su único límite (nmwpq11frtit). */
  dispositivos: string; escritorio: string; tableta: string; telefono: string; avisoDispositivo: string;
}

/**
 * El director flotante de la pestaña de QA: con quién, qué paso y a dónde va su nota. `dispositivo`: la vista en que
 * abre por su paso (nmwppzjq0tit), solo la primera vez que ese paso la abre (nmwpu178utit); sin él, o después, la que la
 * persona eligió por última vez en ese proyecto, en este navegador.
 */
export interface DirectorQa { proyecto: string; mision: string; paso: number; textos: TextosDirectorQa; dispositivo?: DispositivoQa }

/** Los iconos de la vista de dispositivo, en trazo: una pantalla con su pie, una tableta y un teléfono. */
const ICONOS_QA: Record<DispositivoQa, string> = {
  escritorio: '<rect x="2" y="3" width="20" height="13" rx="2"/><path d="M8 21h8M12 16v5"/>',
  tableta: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M11 18h2"/>',
  telefono: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
};

/** El nombre de la ventana del Studio: la pestaña de QA la trae al frente abriéndola por su nombre (nmwplzilitit). */
export const VENTANA_STUDIO = 'stl-studio';
/** El aviso del servidor al Studio abierto cuando una nota de la pestaña de QA quedó en el Buzón (nmwpmgesctit). */
export const EVENTO_NOTA_QA = 'estudio:nota-qa';
/** El módulo de la página que abre el diálogo de notas del Studio y la captura (qaPagina.ts). */
export const MODULO_QA = '/estudio/src/qaPagina.ts';

const enGuion = (x: unknown) => JSON.stringify(x).replace(/</g, '\\u003c');

/**
 * El director flotante pequeño (nmwp9hz51tit): su cara con el paso que abrió la pestaña y tres botones, «Nota», «Tomar
 * captura» y «Volver a mi misión». Empieza abajo a la izquierda (nmwpmhs37tit); se arrastra por su cabeza y se pliega a su
 * cara, y este navegador recuerda, por proyecto, si quedó plegado y dónde (nmwpkjjzqtit: abierto la primera vez). «Nota» y
 * «Tomar captura» abren el mismo diálogo de notas del Studio (qaPagina.ts, con dialogoNota.ts; nmwplyqprtit). «Volver a mi
 * misión» abre la ventana del Studio por su nombre, lo que la trae al frente, y le dice qué misión mostrar. Puro.
 */
export function directorFlotante(o: DirectorQa): string {
  const x = o.textos;
  const datos = { proyecto: o.proyecto, mision: o.mision, paso: o.paso, clave: claveDirectorQa(o.proyecto), claveEstacion: claveEstacionQa(o.proyecto), volver: MENSAJE_VOLVER, ventana: VENTANA_STUDIO, plegar: x.plegar, desplegar: x.desplegar, tamanos: TAMANOS_QA, borde: BORDE_QA, margen: MARGEN_QA, disp: o.dispositivo ?? null };
  const iconos = (Object.keys(ICONOS_QA) as DispositivoQa[]).map((d) => `<button type="button" data-qa-disp="${d}" aria-pressed="${d === 'escritorio'}" title="${esc(x[d])}" aria-label="${esc(x[d])}"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS_QA[d]}</svg></button>`).join('');
  return `<style>iframe.qa-disp{left:50%;top:50%;right:auto;bottom:auto;box-sizing:content-box;border:${BORDE_QA}px solid #2b3550;border-radius:${BORDE_QA + 24}px;box-shadow:0 0 0 1px #5ad1b8,0 12px 40px rgba(0,0,0,.5);transform-origin:center}.qa-disps{display:flex;gap:6px}.qa-dir .qa-disps button{flex:1;display:grid;place-items:center;padding:5px 0}.qa-dir .qa-disps button[aria-pressed="true"]{background:#5ad1b8;color:#0e1424}.qa-aviso-disp{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:2147483646;max-width:calc(100vw - 24px);margin:0;padding:7px 16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:#0e1424;color:#e8ecf4;border:1px solid #5ad1b8;border-radius:999px;font:14px system-ui,sans-serif;cursor:pointer}.qa-aviso-disp[hidden]{display:none}.qa-dir{position:fixed;left:20px;bottom:20px;z-index:2147483646;width:280px;background:#0e1424;color:#e8ecf4;border:1px solid #5ad1b8;border-radius:16px;box-shadow:0 8px 28px rgba(0,0,0,.45);font:14px system-ui,sans-serif}.qa-dir *{box-sizing:border-box;font:inherit}.qa-cabeza{display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:grab;user-select:none;touch-action:none}.qa-cara{flex:none;width:28px;height:28px;border-radius:50%;background:#5ad1b8;color:#0e1424;display:grid;place-items:center;font-weight:700}.qa-paso{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.85}.qa-dir button{cursor:pointer;border-radius:999px;border:1px solid #5ad1b8;background:transparent;color:#e8ecf4;padding:6px 12px}.qa-dir [data-qa-plegar]{padding:2px 9px}.qa-cuerpo{display:flex;flex-direction:column;gap:8px;padding:0 12px 12px}.qa-cuerpo>button{text-align:left}.qa-dir [data-qa-captura]{background:#5ad1b8;color:#0e1424;font-weight:600}.qa-estado{margin:0;min-height:1em;opacity:.85}.qa-dir.plegado .qa-cuerpo,.qa-dir.plegado .qa-paso{display:none}.qa-dir.plegado{width:auto}.qa-dir[hidden]{display:none}</style>
<div class="qa-dir" data-qa-director role="complementary" aria-label="${esc(x.paso)}">
<div class="qa-cabeza" data-qa-arrastrar title="${esc(x.mover)}"><span class="qa-cara" aria-hidden="true">D</span><span class="qa-paso">${esc(x.paso)}</span><button type="button" data-qa-plegar aria-expanded="true" title="${esc(x.plegar)}" aria-label="${esc(x.plegar)}">–</button></div>
<div class="qa-cuerpo">
<button type="button" data-qa-captura>${esc(x.captura)}</button>
<button type="button" data-qa-volver>${esc(x.volver)}</button>
<div class="qa-disps" role="group" aria-label="${esc(x.dispositivos)}">${iconos}</div>
<p class="qa-estado" data-qa-estado role="status"></p>
</div></div>
<p class="qa-aviso-disp" data-qa-aviso role="status" hidden>${esc(x.avisoDispositivo)}</p>
<script type="application/json" id="qa-datos">${enGuion({ proyecto: o.proyecto, mision: o.mision, paso: o.paso, pasoTexto: x.paso })}</script>
<script>(function(){var D=${enGuion(datos)};var caja=document.querySelector('[data-qa-director]'),cabeza=caja.querySelector('[data-qa-arrastrar]'),plegar=caja.querySelector('[data-qa-plegar]'),marco=document.querySelector('[data-qa-marco]');
var g={};try{g=JSON.parse(localStorage.getItem(D.clave)||'{}')||{}}catch(e){}
function guardar(){try{localStorage.setItem(D.clave,JSON.stringify(g))}catch(e){}}
function ponerPlegado(p){caja.classList.toggle('plegado',!!p);plegar.setAttribute('aria-expanded',p?'false':'true');plegar.textContent=p?'+':'–';plegar.title=plegar.ariaLabel=p?D.desplegar:D.plegar}
function dentro(x,y){var r=caja.getBoundingClientRect();return{x:Math.max(0,Math.min(innerWidth-r.width,x)),y:Math.max(0,Math.min(innerHeight-r.height,y))}}
function ponerLugar(l){if(!l)return;var p=dentro(l.x,l.y);caja.style.left=p.x+'px';caja.style.top=p.y+'px';caja.style.right='auto';caja.style.bottom='auto'}
ponerPlegado(g.plegado===true);ponerLugar(g.lugar);
plegar.addEventListener('click',function(){g.plegado=!caja.classList.contains('plegado');ponerPlegado(g.plegado);guardar()});
var arr=null;cabeza.addEventListener('pointerdown',function(e){if(e.target.closest('button'))return;var r=caja.getBoundingClientRect();arr={dx:e.clientX-r.left,dy:e.clientY-r.top};cabeza.setPointerCapture(e.pointerId);if(marco)marco.style.pointerEvents='none'});
cabeza.addEventListener('pointermove',function(e){if(arr)ponerLugar({x:e.clientX-arr.dx,y:e.clientY-arr.dy})});
function soltar(){if(!arr)return;arr=null;if(marco)marco.style.pointerEvents='';var r=caja.getBoundingClientRect();g.lugar={x:r.left,y:r.top};guardar()}
cabeza.addEventListener('pointerup',soltar);cabeza.addEventListener('pointercancel',soltar);
caja.querySelector('[data-qa-volver]').addEventListener('click',function(){var o=window.opener,abierto=!!o&&!o.closed;if(abierto){try{o.postMessage({tipo:D.volver,proyecto:D.proyecto,mision:D.mision},location.origin)}catch(e){}}var w=window.open(abierto?'':'/',D.ventana);if(w){try{w.focus()}catch(e){}}});
var disps=caja.querySelectorAll('[data-qa-disp]'),aviso=document.querySelector('[data-qa-aviso]'),raiz=document.documentElement,hayDisp=function(d){return typeof d==='string'&&Object.prototype.hasOwnProperty.call(D.tamanos,d)},quitarAviso=null;
function escalar(){var t=D.tamanos[raiz.getAttribute('data-qa-dispositivo')];if(!marco||!t)return;var k=innerWidth>=t.ancho+2*D.borde&&innerHeight>=t.alto+2*D.borde?1:Math.max(0.1,Math.min(1,(innerWidth-2*D.margen)/(t.ancho+2*D.borde),(innerHeight-2*D.margen)/(t.alto+2*D.borde)));marco.style.transform='translate(-50%,-50%) scale('+k+')'}
function ponerDisp(d){var t=D.tamanos[d];raiz.setAttribute('data-qa-dispositivo',d);if(marco){marco.classList.toggle('qa-disp',!!t);marco.style.width=t?t.ancho+'px':'';marco.style.height=t?t.alto+'px':'';marco.style.transform='';escalar()}for(var i=0;i<disps.length;i++)disps[i].setAttribute('aria-pressed',String(disps[i].getAttribute('data-qa-disp')===d));if(d!=='escritorio'&&!g.avisado&&aviso){g.avisado=true;guardar();aviso.hidden=false;clearTimeout(quitarAviso);quitarAviso=setTimeout(function(){aviso.hidden=true},12000)}}
if(aviso)aviso.addEventListener('click',function(){aviso.hidden=true});
addEventListener('resize',escalar);
var vistos=g.pasos&&typeof g.pasos==='object'?g.pasos:{},esteP=D.mision+'#'+D.paso,primera=hayDisp(D.disp)&&!vistos[esteP];
if(primera){vistos[esteP]=1;var ks=Object.keys(vistos);if(ks.length>200)delete vistos[ks[0]];g.pasos=vistos;guardar()}
ponerDisp(primera?D.disp:hayDisp(g.dispositivo)?g.dispositivo:'escritorio');
${marcaSinCache.toString()}
${recargaSinCache.toString()}
${conEstacion.toString()}
${conEstacionRecordada.toString()}
var estacion=null;addEventListener('message',function(e){if(!marco||e.source!==marco.contentWindow)return;var d=e.data;if(d&&d.tipo==='stl-estacion'&&typeof d.hash==='string'){estacion=d.hash;try{localStorage.setItem(D.claveEstacion,d.hash)}catch(x){}}});
if(marco){var rec=null;try{rec=localStorage.getItem(D.claveEstacion)}catch(e){}var ini=marco.getAttribute('src')||'',con=conEstacionRecordada(ini,rec);if(con!==ini){estacion=rec;marco.src=marcaSinCache(con,Date.now().toString(36))}}
function recargar(){if(!marco)return;var m=Date.now().toString(36);try{var w=marco.contentWindow,h=w.location.href;if(h&&h!=='about:blank'){w.location.replace(recargaSinCache(h,m));return}}catch(e){}marco.src=recargaSinCache(conEstacion(marco.getAttribute('src')||'',estacion),m)}
for(var i=0;i<disps.length;i++)disps[i].addEventListener('click',function(){var d=this.getAttribute('data-qa-disp');if(d===raiz.getAttribute('data-qa-dispositivo'))return;g.dispositivo=d;guardar();ponerDisp(d);recargar()});
})();</script>`;
}

/**
 * La página de la pestaña de QA: la aplicación, por su puerta, en un marco que llena la ventana, con el director flotante
 * encima (`director`). Si la aplicación rehúsa el marco, un aviso y la aplicación como antes, en esta misma pestaña, a
 * los pocos segundos (o con su botón). Pura.
 */
export function paginaQa(o: { puerta: string; idioma: string; textos: TextosQa; rehusa: boolean; esperaMs?: number; director?: DirectorQa }): string {
  const puerta = esc(o.puerta);
  const cabeza = `<!doctype html><html lang="${esc(o.idioma)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(o.textos.titulo)}</title>
<style>html,body{margin:0;height:100%;background:#0e1424;color:#e8ecf4;font:16px system-ui,sans-serif}iframe{position:fixed;inset:0;width:100%;height:100%;border:0;background:#fff}.aviso{max-width:640px;margin:15vh auto 0;padding:24px 28px;border:1px solid #5ad1b8;border-radius:14px;line-height:1.5}.aviso a{display:inline-block;margin-top:14px;padding:8px 16px;border-radius:999px;background:#5ad1b8;color:#0e1424;text-decoration:none;font-weight:600}</style></head><body>`;
  // Con el director, la página trae los estilos del Studio y su diálogo de notas (el mismo código: dialogoNota.ts), con el
  // tema que este navegador ya eligió para el Studio (nmwplyqprtit)
  const delStudio = o.director
    ? `<link rel="stylesheet" href="/estudio/src/estilos.css"><link rel="stylesheet" href="/estudio/src/director.css"><script>try{if((localStorage.getItem('estudio.tema')||localStorage.getItem('estudio.lector.tema'))==='oscuro')document.documentElement.classList.add('oscuro')}catch(e){}</script><style>html,body{margin:0;height:100%;overflow:hidden}</style>`
    : '';
  if (!o.rehusa) return `${cabeza.replace('<style>', `${delStudio}<style>`)}<iframe src="${puerta}" title="${esc(o.textos.titulo)}" data-qa-marco allow="clipboard-read; clipboard-write; fullscreen; display-capture"></iframe>${o.director ? `${directorFlotante(o.director)}<dialog id="dialogo" class="dialogo-director"></dialog><script type="module" src="${MODULO_QA}"></script>` : ''}</body></html>`;
  const espera = Math.max(0, o.esperaMs ?? 4_000);
  return `${cabeza}<div class="aviso" role="status" data-qa-rehusa><p>${esc(o.textos.rehusa)}</p><a href="${puerta}">${esc(o.textos.abrirAqui)}</a></div><script>setTimeout(function(){location.replace(${JSON.stringify(o.puerta).replace(/</g, '\\u003c')})},${espera})</script></body></html>`;
}
