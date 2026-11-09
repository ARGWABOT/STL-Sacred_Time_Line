// El director flotante, siempre encima (nota de voz del titular, 24 de octubre de 2026): su cara, sus atajos (la niebla de
// lectura, el enfoque, Preguntas, Comentario), lo que dice y lo que va haciendo quedaban debajo de un diálogo abierto,
// como «¿Dónde quedamos?», y había que cerrarlo para encender la niebla de lectura desde su atajo. Como la pastilla de la
// grabadora (grabadora.ts), van dentro del diálogo modal de arriba mientras haya uno abierto: un diálogo modal deja todo
// lo de fuera debajo y sin clics, aunque tenga más z-index. Al cerrarse el último, vuelven a su lugar.
//
// Salvo lo que va haciendo el director frente al diálogo de comentar (nota de voz del titular nmvy4it8etit, 1 de noviembre de
// 2026): dentro de él quedaba encima de lo que se escribe, y había que cerrarlo justo cuando se quiere comentar lo que se está
// viendo. Se queda abierto debajo, a la vista, y el diálogo arriba; se le aligera el velo (estilos.css › #dialogo::backdrop). La
// pastilla de la grabación ya queda encima: tiene más z-index donde estén los dos (director.css › dialog.a-un-lado).
import { modalDeArriba, ordenDeApertura } from './grabadora';

/** Lo que va siempre encima: lo del director flotante (index.html y equipo.ts › montarFlotante). */
export const SIEMPRE_ENCIMA = ['segundo-plano', 'progreso-director', 'atajos-director', 'director-flotante'] as const;
/** Lo que queda debajo del diálogo de comentar y de la línea en grande. */
const BAJO_EL_COMENTARIO = 'progreso-director';
/** El diálogo de comentar, uno solo, en el que también se escribe y se graba (index.html; app.ts › pedir). */
const COMENTARIO = 'dialogo';
/**
 * La línea del proyecto en grande (lineaGrande.ts) es un modal de revisión: se abre para quedar encima de todo, también
 * del marco de lo que va haciendo el director, abierto o plegado, que se queda debajo (nota de voz del titular
 * nmw5dpbbstit, 6 de noviembre de 2026). Antes se metía dentro de ella, como en cualquier diálogo, y la tapaba.
 */
export const LINEA_GRANDE = 'ventana-linea';
const dejaDebajo = (d: HTMLDialogElement) => !!d.classList?.contains(LINEA_GRANDE);

/**
 * El diálogo modal donde va lo que va haciendo el director: sin el de comentar ni la línea en grande abiertos como modal,
 * el de arriba, como lo demás; con uno de ellos, el de arriba de los que se abrieron antes del primero de los dos, o
 * ninguno. Lo que se abra después no se lo lleva encima de ese diálogo. `abiertos`, en el orden en que se abrieron. Pura.
 */
export function modalDelProgreso(comentario: HTMLDialogElement | null, dialogos: ArrayLike<HTMLDialogElement>, abiertos: readonly HTMLDialogElement[] = []): HTMLDialogElement | null {
  const todos = Array.from(dialogos);
  const tapan = [...new Set([comentario, ...todos.filter(dejaDebajo)])].filter((d): d is HTMLDialogElement => !!d && d.matches(':modal'));
  if (!tapan.length) return modalDeArriba(null, dialogos, abiertos);
  const vistos = tapan.map((d) => abiertos.indexOf(d)).filter((i) => i >= 0);
  const i = vistos.length ? Math.min(...vistos) : -1;
  const fuera = new Set([...tapan, ...(i >= 0 ? abiertos.slice(i) : [])]);
  return modalDeArriba(null, todos.filter((d) => !fuera.has(d) && !tapan.some((t) => t.contains(d))), i >= 0 ? abiertos.slice(0, i) : []);
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
  const delProgreso = modalDelProgreso(document.getElementById(COMENTARIO) as HTMLDialogElement | null, dialogos, abiertos);
  for (const el of conocidos.values()) {
    const arriba = el.id === BAJO_EL_COMENTARIO ? delProgreso : deTodos;
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
