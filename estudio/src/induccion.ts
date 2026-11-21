// La inducción a la niebla y la voz (pedido pd_induccion_niebla, con todas sus decisiones del 10 al 18 de noviembre de
// 2026). Dos partes, una vez para todos:
// - La ventana de bienvenida: tres páginas cortas, cada una con un ratón dibujado y su rueda encendida en el amarillo del
//   Studio (nmwdieo4ytit), que presentan el botón central como el «siguiente» del Studio (nmwb11s36tit, nmwmevyx8tit). Se
//   pasa con el botón central o con «→» (nmwb4butvtit, nmwgu7montit) y cada página trae un «Saltar» pequeño
//   (nmwmgrzh6tit), que cierra solo la ventana (nmwmnsrsftit). Es silenciosa (nmwmrrq4atit). Espera a que la persona esté en
//   «Hoy», con su misión a la vista, nunca encima de otra sección (nmwb4b79htit, nmwmnt1pbtit). Cuenta como vista al
//   terminar su tercera página o con «Saltar»; dejada a medias (recargar, cerrar), vuelve a abrirse desde el principio
//   (nmwmrrzlytit).
// - Las tres burbujas, cada una junto a su control (nmwao7mvrtit): la nube de «Niebla de lectura», ▶ y «Leer en voz alta»,
//   con sus palabras (nmwmevmeitit), «Siguiente» y «Saltar todo» (nmwdie2jetit), que cierra en silencio (nmwkbmdgxtit); la
//   de la voz trae «Escuchar», que lee una frase fija en el idioma de la interfaz (nmwdifgfltit) con la voz elegida
//   (nmwjogzx1tit), o dice qué voz falta y cómo instalarla (nmwao80kutit, nmwjl9enytit). Salen la primera vez que la niebla
//   está puesta con sus controles a la vista, ya vista la ventana, también a mitad de un documento (nmwl4y3lqtit), junto a
//   su control y nunca sobre el texto que se lee. Y solo con «Modo ayuda» encendido (regla del titular nmwmwkh9otit, 19 de
//   noviembre: ningún globo de ayuda sin el modo ayuda; reemplaza que salieran solas la primera vez).
// Lo visto vale en cualquier idioma (nmwjm5b8rtit). Se repite desde «Modo ayuda»: «Ver otra vez la introducción» va arriba
// de la sección, junto a «Ver otra vez el recorrido de esta sección», nunca en un globo (nmwmx69c7tit: un enlace en un globo
// que se va al mover el ratón no se alcanza), y muestra la ventana y después las burbujas (nmwmgs8ngtit).
import { altoDeVentana, anchoDeVentana, rectaEnPagina, type Recta } from './escala';
import { lugarDelGlobo, type Lado, type LugarDelGlobo } from './lugarDelGlobo';
import { t, type ClaveDeTexto } from './textos';
import { esc } from './util';

/** Dónde recuerda este computador que ya se vio cada parte. */
export const CLAVE_VENTANA = 'estudio.induccion.ventana';
export const CLAVE_BURBUJAS = 'estudio.induccion.burbujas';

/** Las tres páginas de la ventana, en su orden. */
export const PAGINAS: readonly ClaveDeTexto[] = ['induccion.pagina1', 'induccion.pagina2', 'induccion.pagina3'];

/** Las tres burbujas, en su orden, con el control junto al que va cada una. */
export const BURBUJAS = [
  { id: 'niebla', selector: '[data-niebla]', texto: 'induccion.burbujaNiebla' },
  { id: 'avance', selector: '[data-niebla-auto]', texto: 'induccion.burbujaAvance' },
  { id: 'voz', selector: '[data-niebla-voz]', texto: 'induccion.burbujaVoz' },
] as const satisfies readonly { id: string; selector: string; texto: ClaveDeTexto }[];
export type IdBurbuja = (typeof BURBUJAS)[number]['id'];

// ── Lo que se decide, puro ──────────────────────────────────────────────────────────────────────────────────────────

/** Si se abre la ventana ahora: en «Hoy» con la misión a la vista, sin haberla visto, sin nada encima y sin que ya esté abierta. Pura. */
export const debeAbrirVentana = (o: { vista: string; conMision: boolean; vista_: boolean; abierta: boolean; otraCapa: boolean }): boolean =>
  o.vista === 'misiones' && o.conMision && !o.vista_ && !o.abierta && !o.otraCapa;

/** La página que sigue a `i`, o null si era la última (la ventana se cierra y cuenta como vista). Pura. */
export const paginaSiguiente = (i: number): number | null => (i + 1 < PAGINAS.length ? i + 1 : null);

/**
 * Si salen las burbujas ahora: con «Modo ayuda» encendido (nmwmwkh9otit), ya vista la ventana, sin haberlas visto (o pedidas otra vez desde «Modo ayuda»), con la
 * niebla puesta, con algún control a la vista y sin la ventana ni otras burbujas abiertas. Pura.
 */
export const debenSalirBurbujas = (o: { ayuda: boolean; ventanaVista: boolean; burbujasVistas: boolean; repetir: boolean; niebla: boolean; aLaVista: number; abiertas: boolean }): boolean =>
  o.ayuda && o.ventanaVista && (!o.burbujasVistas || o.repetir) && o.niebla && o.aLaVista > 0 && !o.abiertas;

/**
 * Al encender la niebla con su nube, con «Modo ayuda» encendido, sus tres burbujas salen siempre, aunque ya se hayan visto
 * (notas del titular nmwn1a7tltit y nmwn1e0gdtit, 19 de noviembre de 2026: con «Modo ayuda» puesto, en el modo enfoque,
 * apagó y encendió la nube y nunca salieron). Encender la niebla en el modo ayuda es pedir que se explique, como pasar el
 * ratón por cualquier parte. Antes salían solo «la primera vez», y esa primera vez se gastaba sin que se vieran: si sus
 * controles no estaban a la vista al pintarlas, se cerraban y quedaban marcadas como vistas. Pura.
 */
export const burbujasAlEncenderLaNube = (o: { ayuda: boolean; nieblaAhora: boolean; ventanaVista: boolean; burbujasVistas: boolean; aLaVista: number; abiertas: boolean }): boolean =>
  debenSalirBurbujas({ ...o, repetir: o.ayuda && o.nieblaAhora, niebla: o.nieblaAhora });

const seCruzan = (a: Recta, b: Recta) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/**
 * Dónde va una burbuja junto a su control sin tapar el texto que se lee: el primer lado (derecha, izquierda, abajo,
 * arriba) donde cabe entera y no cruza ninguna de las rectas de `textos`; si ninguno, el que lugarDelGlobo elige. Pura.
 */
export function lugarDeBurbuja(control: Recta, burbuja: { ancho: number; alto: number }, ventana: { ancho: number; alto: number }, textos: readonly Recta[]): LugarDelGlobo {
  const orden: readonly Lado[] = ['derecha', 'izquierda', 'abajo', 'arriba'];
  for (const lado of orden) {
    const l = lugarDelGlobo(control, burbuja, ventana, { separacion: 12, orden: [lado] });
    if (l.lado !== lado) continue;
    const r = { left: l.left, top: l.top, right: l.left + burbuja.ancho, bottom: l.top + burbuja.alto, width: burbuja.ancho, height: burbuja.alto };
    if (seCruzan(r, control)) continue;
    if (!textos.some((x) => seCruzan(r, x))) return l;
  }
  return lugarDelGlobo(control, burbuja, ventana, { separacion: 12, orden });
}

/** El ratón dibujado, con su rueda encendida en el amarillo del Studio (nmwdieo4ytit). Pura. */
export const RATON = '<svg class="ind-raton" viewBox="0 0 48 72" aria-hidden="true" focusable="false"><rect x="4" y="4" width="40" height="64" rx="20" class="ind-cuerpo"/><path d="M24 4v24M4 28h40" class="ind-linea"/><rect x="20" y="11" width="8" height="13" rx="4" class="ind-rueda"/></svg>';

/** La ventana de bienvenida en su página `i`: el ratón, la frase, la cuenta, «Saltar» y «Siguiente» («Listo» en la última). Pura. */
export function ventanaHtml(i: number): string {
  const ultima = paginaSiguiente(i) === null;
  return `<div class="ind-ventana" role="dialog" aria-modal="true" aria-label="${esc(t('induccion.ventanaAria'))}" data-induccion-ventana>`
    + `${RATON}<p class="ind-texto">${esc(t(PAGINAS[i]))}</p>`
    + `<div class="ind-pie"><button type="button" class="enlace ind-saltar" data-induccion-saltar>${esc(t('induccion.saltar'))}</button>`
    + `<small class="ind-cuenta">${esc(t('induccion.cuenta', { n: i + 1, total: PAGINAS.length }))}</small>`
    + `<button type="button" class="primario" data-induccion-siguiente>${esc(t(ultima ? 'induccion.listo' : 'induccion.siguiente'))}</button></div></div>`;
}

/**
 * Una burbuja: su texto, «Saltar todo», la cuenta y «Siguiente» («Listo» en la última). La de la voz ya no lleva «Escuchar»
 * (nota nmwnnsrpwtit): invita a probar la niebla, que es donde la voz se oye. Pura.
 */
export function burbujaHtml(id: IdBurbuja, i: number, total: number): string {
  const b = BURBUJAS.find((x) => x.id === id)!;
  const ultima = i === total - 1;
  return `<div class="ind-burbuja" role="dialog" aria-label="${esc(t(b.texto))}" data-induccion-burbuja="${id}">`
    + `<p>${esc(t(b.texto))}</p>`
    + `<div class="ind-pie"><button type="button" class="enlace" data-induccion-saltar-todo>${esc(t('induccion.saltarTodo'))}</button>`
    + `<small class="ind-cuenta">${esc(t('induccion.cuenta', { n: i + 1, total }))}</small>`
    + `<button type="button" class="primario" data-induccion-siguiente-burbuja>${esc(t(ultima ? 'induccion.listo' : 'induccion.siguiente'))}</button></div></div>`;
}

// ── En la página ────────────────────────────────────────────────────────────────────────────────────────────────────

const visto = (clave: string): boolean => {
  try {
    return localStorage.getItem(clave) === '1';
  } catch {
    return false;
  }
};
const marcar = (clave: string, si: boolean) => {
  try {
    if (si) localStorage.setItem(clave, '1');
    else localStorage.removeItem(clave);
  } catch {
    // sin almacenamiento, vale para esta visita
  }
};

/** La página abierta de la ventana, o null; las burbujas abiertas, o null; y si se pidió repetirla desde «Modo ayuda». */
let pagina: number | null = null;
let burbujas: { i: number; ids: IdBurbuja[]; vistas: number } | null = null;
let repetir = false;

/** Lo que la página le pasa al instalarla: si la niebla está puesta y si «Modo ayuda» está encendido. */
let deps: { niebla: () => boolean; ayuda: () => boolean } | null = null;

const aLaVista = (selector: string): HTMLElement | null =>
  [...document.querySelectorAll<HTMLElement>(selector)].find((e) => e.getClientRects().length > 0 && !e.closest('[data-induccion-capa]')) ?? null;
const ventanaDelNavegador = () => ({ ancho: anchoDeVentana(), alto: altoDeVentana() });

function capa(): HTMLElement {
  let c = document.querySelector<HTMLElement>('[data-induccion-capa]');
  if (!c) {
    c = document.createElement('div');
    c.dataset.induccionCapa = '';
    document.body.append(c);
  }
  return c;
}
const quitarCapa = () => document.querySelector('[data-induccion-capa]')?.remove();

function pintarVentana() {
  if (pagina === null) return quitarCapa();
  const c = capa();
  c.className = 'ind-capa';
  c.innerHTML = ventanaHtml(pagina);
  c.querySelector<HTMLButtonElement>('[data-induccion-siguiente]')?.focus({ preventScroll: true });
}

function cerrarVentana(vista: boolean) {
  pagina = null;
  quitarCapa();
  if (vista) marcar(CLAVE_VENTANA, true);
  requestAnimationFrame(() => quizaBurbujas());
}

/** Pasa a la página siguiente; desde la última, cierra la ventana y cuenta como vista. */
function avanzarVentana() {
  if (pagina === null) return;
  const sigue = paginaSiguiente(pagina);
  if (sigue === null) return cerrarVentana(true);
  pagina = sigue;
  pintarVentana();
}

function pintarBurbuja() {
  if (!burbujas) return quitarCapa();
  const id = burbujas.ids[burbujas.i];
  const control = aLaVista(BURBUJAS.find((b) => b.id === id)!.selector);
  if (!control) return siguienteBurbuja();
  burbujas.vistas++;
  const c = capa();
  c.className = 'ind-capa-burbuja';
  c.innerHTML = burbujaHtml(id, burbujas.i, burbujas.ids.length);
  const globo = c.querySelector<HTMLElement>('.ind-burbuja')!;
  // Nunca sobre el texto que se lee: lo que la niebla destapa en la ventana de lectura, los pasos de la misión, la idea de ahora
  const textos = [...document.querySelectorAll<HTMLElement>('.trozo, ol.pasos > li, .dq-panel:not([hidden]) p')]
    .filter((x) => x.getClientRects().length > 0)
    .map((x) => rectaEnPagina(x.getBoundingClientRect()));
  const l = lugarDeBurbuja(rectaEnPagina(control.getBoundingClientRect()), { ancho: globo.offsetWidth, alto: globo.offsetHeight }, ventanaDelNavegador(), textos);
  Object.assign(globo.style, { top: `${l.top}px`, left: `${l.left}px` });
  globo.dataset.lado = l.lado;
  control.classList.add('ind-senalado');
}

/** Cierra las burbujas; cuentan como vistas solo si salió alguna (`vistas`): sin ninguna a la vista, la primera vez no se gasta. */
function cerrarBurbujas(vistas = true) {
  burbujas = null;
  document.querySelectorAll('.ind-senalado').forEach((x) => x.classList.remove('ind-senalado'));
  if (vistas) {
    repetir = false;
    marcar(CLAVE_BURBUJAS, true);
  }
  quitarCapa();
}

function siguienteBurbuja() {
  if (!burbujas) return;
  document.querySelectorAll('.ind-senalado').forEach((x) => x.classList.remove('ind-senalado'));
  if (burbujas.i + 1 >= burbujas.ids.length) return cerrarBurbujas(burbujas.vistas > 0);
  burbujas.i++;
  pintarBurbuja();
}

/** Si toca, abre las burbujas junto a los controles que están a la vista. */
export function quizaBurbujas(): void {
  if (!deps || typeof document === 'undefined') return;
  // Con un diálogo abierto («¿Dónde quedamos?») o la ayuda guiada, esperan: una capa debajo de él no se vería ni se oprimiría
  if (document.querySelector('dialog[open], [data-guia-capa]')) return;
  const ids = BURBUJAS.filter((b) => aLaVista(b.selector)).map((b) => b.id);
  if (!debenSalirBurbujas({ ayuda: deps.ayuda(), ventanaVista: visto(CLAVE_VENTANA), burbujasVistas: visto(CLAVE_BURBUJAS), repetir, niebla: deps.niebla(), aLaVista: ids.length, abiertas: burbujas !== null || pagina !== null })) return;
  burbujas = { i: 0, ids, vistas: 0 };
  pintarBurbuja();
}

/** La nube recién tocada: con «Modo ayuda» y la niebla ya puesta, las burbujas salen otra vez (burbujasAlEncenderLaNube). */
function alTocarLaNube(): void {
  if (!deps) return;
  if (burbujasAlEncenderLaNube({ ayuda: deps.ayuda(), nieblaAhora: deps.niebla(), ventanaVista: visto(CLAVE_VENTANA), burbujasVistas: visto(CLAVE_BURBUJAS), aLaVista: 1, abiertas: false })) {
    if (burbujas) cerrarBurbujas(false);
    repetir = true;
  }
  quizaBurbujas();
}

/**
 * Lo que app.ts llama tras pintar una sección: en «Hoy», con la misión a la vista y sin otra capa encima, abre la ventana
 * si no se ha visto; si no, quizá las burbujas.
 */
export function quizaInduccion(vista: string): void {
  if (!deps) return;
  const otraCapa = !!document.querySelector('dialog[open], [data-guia-capa]');
  if (debeAbrirVentana({ vista, conMision: !!aLaVista('.mision-c.sigue'), vista_: visto(CLAVE_VENTANA), abierta: pagina !== null, otraCapa })) {
    pagina = 0;
    return pintarVentana();
  }
  if (pagina === null) quizaBurbujas();
}

/** «Ver otra vez la introducción», desde «Modo ayuda»: la ventana desde su primera página y, al cerrarla, las burbujas. */
export function repetirInduccion(): void {
  if (burbujas) cerrarBurbujas();
  marcar(CLAVE_VENTANA, false);
  marcar(CLAVE_BURBUJAS, false);
  repetir = true;
  pagina = 0;
  pintarVentana();
}

/** «Ver otra vez la introducción», arriba de la sección con «Modo ayuda» encendido (ayudaGuiada.ts › repetirHtml). Pura. */
export const repetirInduccionHtml = (): string =>
  `<button type="button" class="enlace" data-induccion-repetir>${esc(t('induccion.repetir'))}</button>`;

/** Los oyentes, una vez. */
export function instalarInduccion(d: { niebla: () => boolean; ayuda: () => boolean }): void {
  if (deps) return;
  deps = d;
  document.addEventListener('click', (e) => {
    const b = e.target as Element;
    if (b.closest('[data-induccion-repetir]')) return repetirInduccion();
    if (b.closest('[data-induccion-siguiente]')) return avanzarVentana();
    // «Saltar» cierra solo la ventana: las burbujas siguen esperando su primera vez (nmwmnsrsftit)
    if (b.closest('[data-induccion-saltar]')) return cerrarVentana(true);
    if (b.closest('[data-induccion-siguiente-burbuja]')) return siguienteBurbuja();
    // «Saltar todo», en silencio: ninguna línea después (nmwkbmdgxtit)
    if (b.closest('[data-induccion-saltar-todo]')) return cerrarBurbujas();
    // La niebla recién puesta: sus controles aparecen en el cuadro siguiente; con «Modo ayuda», salen otra vez (nmwn1e0gdtit)
    if (b.closest('[data-niebla]')) requestAnimationFrame(() => requestAnimationFrame(alTocarLaNube));
  });
  // Con la ventana o las burbujas abiertas, el botón central es su «siguiente» (y «→», el de la ventana; Esc, «Saltar»).
  // Antes que todo lo demás (en la captura de la ventana del navegador): ni la ventana de lectura de la niebla ni
  // siguiente.ts lo ven (nota nmwnnelg2tit: con las tres burbujas de la niebla abiertas, el central movía la niebla de
  // detrás). Cerradas, vuelve a ser de la narración
  const central = (e: MouseEvent) => {
    if ((pagina === null && burbujas === null) || e.button !== 1) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.type !== 'mousedown') return;
    if (pagina !== null) avanzarVentana();
    else siguienteBurbuja();
  };
  addEventListener('mousedown', central, true);
  addEventListener('auxclick', central, true);
  addEventListener('keydown', (e) => {
    if (pagina === null) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopImmediatePropagation();
      avanzarVentana();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      cerrarVentana(true);
    }
  }, true);
  // Entrar al enfoque o abrir una lectura cambia las clases de la página: los controles de la niebla quizá ya se ven
  new MutationObserver(() => requestAnimationFrame(quizaBurbujas)).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  addEventListener('resize', () => burbujas && pintarBurbuja());
}
