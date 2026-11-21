// El globo de los títulos (nota nmw5nr10atit: «desactiva el globo que trae el navegador por defecto; todas las
// informaciones contextuales del Studio aparecen en nuestro globito personalizado»). Al pasar el ratón o llevar el foco a
// un elemento con `title`, el texto pasa a `data-titulo` y se quita `title`, así el navegador no pinta el suyo; el Studio
// muestra su propio globo (el mismo aspecto del modo ayuda) con el lugar de lugarDelGlobo, siempre dentro de la ventana.
// Si el código vuelve a poner `title`, se convierte de nuevo en la siguiente visita. Se inicia desde ayudaGuiada.ts.
import { altoDeVentana, anchoDeVentana, rectaEnPagina } from './escala';
import { lugarDelGlobo } from './lugarDelGlobo';
import { esc } from './util';

/** El texto del globo, listo para pintar. Pura. */
export function globoDeTituloHtml(texto: string): string {
  return esc(texto);
}

/**
 * Pasa el `title` del elemento a `data-titulo` y lo quita, para que el navegador no pinte su globo. Devuelve el texto
 * (el del `title` si lo hay, si no el guardado) o null si no hay ninguno. Si el código puso un `title` nuevo, gana.
 */
export function titleAData(el: Element): string | null {
  // Un <title> dentro de un SVG también pinta el globo del navegador: su texto pasa igual a data-titulo y el hijo se quita
  for (const hijo of Array.from(el.children ?? [])) {
    if (hijo.localName !== 'title') continue;
    const dicho = hijo.textContent ?? '';
    hijo.remove();
    if (dicho.trim()) el.setAttribute('data-titulo', dicho);
  }
  const nuevo = el.getAttribute('title');
  if (nuevo !== null) {
    el.removeAttribute('title');
    if (nuevo.trim()) el.setAttribute('data-titulo', nuevo); else el.removeAttribute('data-titulo');
  }
  const texto = el.getAttribute('data-titulo');
  return texto && texto.trim() ? texto : null;
}

/** Lo que lleva un título: el atributo `title`, el `data-titulo` ya convertido, o un <title> hijo (SVG). */
const CON_TITULO = '[title],[data-titulo],:has(> title)';

/** ¿Tiene un <title> de SVG como hijo directo? */
export const tieneTituloSvg = (el: Element): boolean => Array.from(el.children ?? []).some((h) => h.localName === 'title');

/**
 * Cuánto tiene que quedarse quieto el ratón sobre un elemento para que salga su globo (nota de voz del titular
 * nmw6s6bpctit: «solo si me quedo al menos dos segundos sobre el elemento; mientras muevo el ratón, nada»).
 */
export const ESPERA_DEL_TITULO = 2000;

/**
 * La espera del globo: cada movimiento sobre un elemento vuelve a contar desde cero, y solo cuando el ratón lleva
 * ESPERA_DEL_TITULO quieto sobre el mismo elemento se llama a mostrar. Salir de él, o cancelar, no muestra nada.
 */
export function crearEsperaDelTitulo(mostrar: (el: Element) => void, ms = ESPERA_DEL_TITULO) {
  let reloj: ReturnType<typeof setTimeout> | null = null;
  let sobre: Element | null = null;
  const cancelar = () => { if (reloj) clearTimeout(reloj); reloj = null; sobre = null; };
  return {
    /** El ratón está (o se movió) sobre el elemento: la cuenta empieza otra vez. */
    mover(el: Element) {
      if (reloj) clearTimeout(reloj);
      sobre = el;
      reloj = setTimeout(() => { reloj = null; const e = sobre; sobre = null; if (e) mostrar(e); }, ms);
    },
    cancelar,
    /** Si hay una cuenta en marcha (para las pruebas). */
    contando: () => reloj !== null,
  };
}

let instalado = false;
let actual: Element | null = null;

/**
 * El globo va en la capa de arriba (popover), por encima también de las ventanas abiertas como la línea en grande, que
 * son de la capa de arriba del navegador y tapaban un globo del cuerpo de la página (nmw6s6bpctit). Se vuelve a abrir
 * cada vez, así queda sobre la última ventana abierta.
 */
function alFrente(g: HTMLElement): void {
  if (typeof g.showPopover !== 'function') return;
  try {
    if (g.matches(':popover-open')) g.hidePopover();
    g.showPopover();
  } catch { /* sin capa de arriba: se queda en la página */ }
}

function globoDeTitulo(): HTMLElement {
  let g = document.querySelector<HTMLElement>('[data-globo-titulo]');
  if (!g) {
    g = document.createElement('div');
    g.className = 'globo-modo';
    g.setAttribute('data-globo-titulo', '');
    g.setAttribute('role', 'tooltip');
    g.setAttribute('popover', 'manual');
    g.hidden = true;
    document.body.append(g);
  }
  return g;
}

function ocultar(): void {
  actual = null;
  const g = document.querySelector<HTMLElement>('[data-globo-titulo]');
  if (!g) return;
  g.hidden = true;
  try { if (typeof g.hidePopover === 'function' && g.matches(':popover-open')) g.hidePopover(); } catch { /* ya cerrado */ }
}

function mostrar(el: Element): void {
  if (!el.isConnected) return;
  const texto = titleAData(el);
  if (!texto) return ocultar();
  // El modo ayuda ya explica esta parte con su propio globo: uno solo
  const modo = document.querySelector<HTMLElement>('[data-globo-modo]');
  if (modo && !modo.hidden) return ocultar();
  actual = el;
  const g = globoDeTitulo();
  g.innerHTML = globoDeTituloHtml(texto);
  g.hidden = false;
  alFrente(g);
  const l = lugarDelGlobo(
    rectaEnPagina(el.getBoundingClientRect()),
    { ancho: g.offsetWidth, alto: g.offsetHeight },
    { ancho: anchoDeVentana(), alto: altoDeVentana() },
    { separacion: 6 },
  );
  g.style.top = `${l.top}px`;
  g.style.left = `${l.left}px`;
}

const espera = crearEsperaDelTitulo(mostrar);

/**
 * El ratón entra o se mueve: el `title` pasa a `data-titulo` en el acto (el navegador nunca pinta el suyo) y el globo
 * espera a que el ratón se quede quieto ESPERA_DEL_TITULO sobre el elemento; moverse lo esconde y vuelve a contar.
 */
function alMover(e: Event): void {
  const t = e.target;
  if (!(t instanceof Element)) return;
  const el = t.closest(CON_TITULO);
  if (!el) { espera.cancelar(); if (actual) ocultar(); return; }
  titleAData(el);
  if (el === actual) return; // ya se ve el suyo: moverse dentro del mismo no lo esconde
  if (actual) ocultar();
  espera.mover(el);
}

/** Los oyentes de los títulos, una vez, delegados en document (sirven también a lo que se pinta después). */
export function instalarGloboDeTitulos(): void {
  if (instalado) return;
  instalado = true;
  document.addEventListener('mouseover', alMover, true);
  document.addEventListener('mousemove', alMover, true);
  document.addEventListener('focusin', alMover, true);
  document.addEventListener('mouseout', (e) => {
    const sale = (e.target as Element | null)?.closest?.('[data-titulo]');
    if (sale && !sale.contains(e.relatedTarget as Node | null)) { espera.cancelar(); if (sale === actual) ocultar(); }
  }, true);
  const todo = () => { espera.cancelar(); ocultar(); };
  document.addEventListener('focusout', todo, true);
  document.addEventListener('scroll', todo, true);
  document.addEventListener('mousedown', todo, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') todo(); });
}
