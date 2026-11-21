// El director flotante, siempre encima (nota de voz del titular, 24 de octubre de 2026): su cara, sus atajos (la niebla de
// lectura, el enfoque, Preguntas, Comentario), lo que dice y lo que va haciendo quedaban debajo de un diálogo abierto,
// como «¿Dónde quedamos?», y había que cerrarlo para encender la niebla de lectura desde su atajo. Como la pastilla de la
// grabadora (grabadora.ts), van dentro del diálogo modal de arriba mientras haya uno abierto: un diálogo modal deja todo
// lo de fuera debajo y sin clics, aunque tenga más z-index. Al cerrarse el último, vuelven a su lugar.
//
// Salvo lo que va haciendo el director: no sube nunca a un diálogo modal (notas de voz del titular nmvy4it8etit, 1 de noviembre
// de 2026, y nmwcxbw8wtit). Antes se metía en el de arriba y tapaba lo que se escribe en el de comentar, la línea en grande
// y «¿Dónde quedamos?». Se queda en su lugar, debajo de todo diálogo, a la vista; se le aligera el velo al de comentar
// (estilos.css › #dialogo::backdrop). La pastilla de la grabación queda encima: tiene más z-index (director.css › dialog.a-un-lado).
import { modalDeArriba, ordenDeApertura } from './grabadora';

/** Lo que va siempre encima: lo del director flotante (index.html y equipo.ts › montarFlotante). */
export const SIEMPRE_ENCIMA = ['segundo-plano', 'progreso-director', 'atajos-director', 'director-flotante'] as const;
/** Lo que nunca sube a un diálogo modal: queda debajo de todos. */
const NUNCA_EN_UN_DIALOGO = 'progreso-director';

/** El diálogo donde va el elemento `id`: el de arriba, salvo lo que va haciendo el director, que no va en ninguno. Pura. */
export function dialogoDe(id: string, deArriba: HTMLDialogElement | null): HTMLDialogElement | null {
  return id === NUNCA_EN_UN_DIALOGO ? null : deArriba;
}

/** Cada uno, una vez encontrado (dentro de un diálogo que se quita ya no se encuentra por su id), y su lugar de siempre. */
const conocidos = new Map<string, HTMLElement>();
const lugares = new Map<HTMLElement, { padre: Node; siguiente: Node | null }>();
let abiertos: HTMLDialogElement[] = [];

function ubicar() {
  for (const id of SIEMPRE_ENCIMA) {
    const el = document.getElementById(id);
    if (el) conocidos.set(id, el);
  }
  const dialogos = document.querySelectorAll('dialog');
  const deTodos = modalDeArriba(null, dialogos, abiertos);
  for (const el of conocidos.values()) {
    const arriba = dialogoDe(el.id, deTodos);
    if (arriba) {
      if (!lugares.has(el) && el.parentNode && !el.closest('dialog')) lugares.set(el, { padre: el.parentNode, siguiente: el.nextSibling });
      if (el.parentNode !== arriba) arriba.append(el);
      continue;
    }
    const l = lugares.get(el);
    if (!l) continue;
    lugares.delete(el);
    if (el.parentNode !== l.padre) l.padre.insertBefore(el, l.siguiente?.parentNode === l.padre ? l.siguiente : null);
  }
}

/**
 * Mira cuándo se abre o se cierra cada diálogo (su atributo open, para saber cuál quedó arriba) y lo que entra o sale de
 * la página (un diálogo que se quita sin cerrarse se llevaría al director consigo). Fuera del navegador, nada.
 */
if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
  new MutationObserver((cambios) => {
    abiertos = ordenDeApertura(abiertos, cambios);
    ubicar();
  }).observe(document.documentElement, { subtree: true, attributeFilter: ['open'], attributeOldValue: true });
  new MutationObserver(() => ubicar()).observe(document.body, { childList: true });
}
