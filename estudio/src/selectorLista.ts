/**
 * El selector propio del Studio (pd_sonidos_flechas; decisiones del titular, 26 de octubre de 2026): un botón que abre una
 * lista, en lugar del desplegable nativo, que no dice en qué opción vas mientras está abierto. Es el patrón «combobox» de
 * solo elegir de ARIA: el foco se queda en el botón y la lista (role listbox) se recorre con aria-activedescendant.
 *  - Teclado: las flechas, Inicio, Fin y las letras mueven la opción activa y cada paso se oye al pasar, sin elegirla;
 *    Enter y Espacio eligen; Esc cierra solo la lista, sin cambiar nada y sin que el diálogo ni el enfoque se enteren.
 *  - Ratón: una opción se oye solo si el puntero se detiene en ella (navegarLista.ts › ESPERA_PARADA_MS); un clic elige.
 * Quien lo usa pone lo que suena (`alPasar`) y lo que se guarda (`alElegir`); aquí solo se mueve y se dibuja. Las reglas
 * de movimiento son puras y están en navegarLista.ts. El aspecto, igual que el de un desplegable, en selectorLista.css.
 */
import './selectorLista.css';
import { accionDeTecla, crearEsperaDeParada, escribirLetras, indicePorLetras, siguienteIndice, type Letras } from './navegarLista';
import { altoDeVentana, anchoDeVentana, rectaEnPagina } from './escala';
import { esc } from './util';

export interface OpcionLista {
  valor: string;
  texto: string;
}
export interface SelectorLista {
  /** El id del botón en la página: la etiqueta que lo nombra apunta a él con for. */
  id: string;
  /** Lo que necesita quien lo usa para saber cuál es (por ejemplo, el momento). */
  clave: string;
  /** Cómo se llama, para el lector de pantalla. */
  nombre: string;
  opciones: readonly OpcionLista[];
  /** La opción elegida ahora; se actualiza sola al elegir otra. */
  valor: string;
}
export interface EscuchaLista {
  /** Se pasó por una opción sin elegirla: con las flechas, o con el puntero detenido en ella. */
  alPasar(valor: string, selector: SelectorLista): void;
  /** Se eligió una opción distinta de la que había. */
  alElegir(valor: string, selector: SelectorLista): void;
}

const textoDe = (s: SelectorLista) => s.opciones.find((o) => o.valor === s.valor)?.texto ?? s.valor;
/** El alto más grande de la lista abierta. */
const ALTO_MAXIMO = 320;

/** El botón del selector, con la opción de ahora; `activarSelectoresLista` lo pone a andar. */
export function htmlSelectorLista(s: SelectorLista): string {
  const t = esc(textoDe(s));
  return `<button type="button" role="combobox" class="sel-lista" id="${esc(s.id)}" data-sel-lista="${esc(s.id)}" aria-haspopup="listbox" aria-expanded="false" title="${t}"><span class="sel-lista-texto">${t}</span></button>`;
}

interface Abierta {
  s: SelectorLista;
  boton: HTMLElement;
  lista: HTMLElement;
  activo: number;
}

/**
 * Pone a andar los selectores que están dentro de `raiz` (un diálogo): todo por delegación, así que sirve aunque `raiz`
 * se dibuje antes. Una sola lista abierta a la vez; se cierra al elegir, con Esc, con un clic fuera, al salir el foco del
 * botón, al desplazarse el diálogo o cambiar la ventana de tamaño y al cerrarse `raiz`.
 */
export function activarSelectoresLista(raiz: HTMLElement, selectores: readonly SelectorLista[], escucha: EscuchaLista): void {
  let abierta: Abierta | null = null;
  let letras: Letras | null = null;
  // Dónde estuvo el puntero la última vez: el navegador repite el movimiento al desplazarse la lista o al abrirse bajo él,
  // y eso no es mover el puntero (sería oír una opción que nadie tocó)
  let ultimo: { x: number; y: number } | null = null;
  // Mientras un Esc cierra la lista, el diálogo no debe cerrarse con ese mismo Esc
  let cierraLaLista = false;
  const fin = new AbortController();
  const espera = crearEsperaDeParada((i) => {
    if (abierta) escucha.alPasar(abierta.s.opciones[i].valor, abierta.s);
  });

  const selectorDe = (boton: Element | null) => selectores.find((s) => s.id === boton?.getAttribute('data-sel-lista'));

  function colocar({ boton, lista }: Abierta) {
    // En píxeles de la página (escala.ts): lo que se escribe en el style de la lista lo es
    const r = rectaEnPagina(boton.getBoundingClientRect());
    lista.style.minWidth = `${Math.round(r.width)}px`;
    lista.style.maxHeight = '';
    const debajo = altoDeVentana() - r.bottom - 12;
    const encima = r.top - 12;
    const alto = lista.scrollHeight + 2;
    const haciaAbajo = alto <= Math.min(debajo, ALTO_MAXIMO) || debajo >= encima;
    lista.style.maxHeight = `${Math.max(120, Math.min(ALTO_MAXIMO, haciaAbajo ? debajo : encima))}px`;
    lista.style.top = haciaAbajo ? `${Math.round(r.bottom + 4)}px` : '';
    lista.style.bottom = haciaAbajo ? '' : `${Math.round(altoDeVentana() - r.top + 4)}px`;
    // Alineada con el botón por la izquierda, y corrida hacia adentro si por ser más ancha se saldría de la ventana
    lista.style.left = `${Math.max(8, Math.min(Math.round(r.left), anchoDeVentana() - lista.offsetWidth - 8))}px`;
  }

  /** Marca la opción activa; con `ver`, la trae a la vista (al abrir, en el centro). */
  function activar(i: number, ver: 'cerca' | 'centro' | false) {
    const a = abierta;
    const op = a?.lista.children[i] as HTMLElement | undefined;
    if (!a || !op) return;
    a.lista.querySelector('.activo')?.classList.remove('activo');
    op.classList.add('activo');
    a.activo = i;
    a.boton.setAttribute('aria-activedescendant', op.id);
    if (!ver) return;
    const { lista } = a;
    if (ver === 'centro') lista.scrollTop = op.offsetTop - (lista.clientHeight - op.offsetHeight) / 2;
    else if (op.offsetTop < lista.scrollTop) lista.scrollTop = op.offsetTop;
    else if (op.offsetTop + op.offsetHeight > lista.scrollTop + lista.clientHeight) lista.scrollTop = op.offsetTop + op.offsetHeight - lista.clientHeight;
  }

  function cerrar() {
    if (!abierta) return;
    const { boton, lista } = abierta;
    abierta = null;
    espera.soltar();
    lista.remove();
    boton.setAttribute('aria-expanded', 'false');
    boton.removeAttribute('aria-controls');
    boton.removeAttribute('aria-activedescendant');
  }

  function abrir(s: SelectorLista, boton: HTMLElement) {
    cerrar();
    // Sin desplazar el diálogo: un desplazamiento tardío cerraría la lista recién abierta
    boton.focus({ preventScroll: true });
    const lista = document.createElement('div');
    lista.className = 'sel-lista-lista';
    lista.id = `${s.id}-lista`;
    lista.setAttribute('role', 'listbox');
    lista.setAttribute('aria-label', s.nombre);
    lista.innerHTML = s.opciones
      .map((o, i) => `<div role="option" class="sel-lista-op" id="${esc(s.id)}-op-${i}" aria-selected="${o.valor === s.valor}">${esc(o.texto)}</div>`)
      .join('');
    // Dentro del diálogo, que está en la capa de arriba: fuera de él no se vería ni se podría tocar
    raiz.append(lista);
    abierta = { s, boton, lista, activo: 0 };
    colocar(abierta);
    boton.setAttribute('aria-expanded', 'true');
    boton.setAttribute('aria-controls', lista.id);
    letras = null;
    activar(Math.max(0, s.opciones.findIndex((o) => o.valor === s.valor)), 'centro');
  }

  function elegir(i: number) {
    const a = abierta;
    if (!a) return;
    const o = a.s.opciones[i];
    cerrar();
    if (!o || o.valor === a.s.valor) return;
    a.s.valor = o.valor;
    a.boton.title = o.texto;
    const t = a.boton.querySelector('.sel-lista-texto');
    if (t) t.textContent = o.texto;
    escucha.alElegir(o.valor, a.s);
  }

  /** Va a otra opción con el teclado y la oye; una tecla sostenida no suena a cada paso, sino donde se detiene. */
  function pasarA(i: number, sostenida: boolean) {
    if (!abierta || i === abierta.activo) return;
    activar(i, 'cerca');
    if (sostenida) espera.mover(i);
    else {
      espera.soltar();
      escucha.alPasar(abierta.s.opciones[i].valor, abierta.s);
    }
  }

  raiz.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const op = t.closest<HTMLElement>('[role="option"]');
    if (abierta && op && abierta.lista.contains(op)) return elegir([...abierta.lista.children].indexOf(op));
    // Tocar el nombre del momento lleva al selector (como en un desplegable), sin abrirlo
    const etiqueta = t.closest('label');
    const delEtiqueta = etiqueta && selectores.find((s) => s.id === etiqueta.htmlFor);
    if (delEtiqueta) {
      e.preventDefault();
      cerrar();
      raiz.querySelector<HTMLElement>(`[data-sel-lista="${CSS.escape(delEtiqueta.id)}"]`)?.focus();
      return;
    }
    const boton = t.closest<HTMLElement>('[data-sel-lista]');
    const s = selectorDe(boton);
    if (!boton || !s) return cerrar();
    if (abierta?.boton === boton) cerrar();
    else abrir(s, boton);
  });

  // Tocar la lista no le quita el foco al botón: desde ahí siguen sirviendo el teclado y el Esc
  raiz.addEventListener('mousedown', (e) => {
    if (abierta?.lista.contains(e.target as Node)) e.preventDefault();
  });

  raiz.addEventListener('keydown', (e) => {
    const boton = (e.target as HTMLElement).closest<HTMLElement>('[data-sel-lista]');
    const s = selectorDe(boton);
    if (!boton || !s || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    const accion = accionDeTecla(abierta?.boton === boton, e.key);
    if (!accion) return;
    // Tab sigue su camino (la lista se suelta sin cambiar nada); todo lo demás es de la lista y de nadie más
    if (accion !== 'soltar') {
      e.preventDefault();
      e.stopPropagation();
    }
    if (accion === 'abrir') return abrir(s, boton);
    if (accion === 'cerrar') {
      cierraLaLista = true;
      setTimeout(() => (cierraLaLista = false), 0);
      return cerrar();
    }
    if (accion === 'soltar') return cerrar();
    if (accion === 'elegir') return abierta && elegir(abierta.activo);
    if (!abierta) abrir(s, boton);
    if (!abierta) return;
    if (accion === 'ir') {
      const i = siguienteIndice(abierta.activo, s.opciones.length, e.key);
      if (i !== null) pasarA(i, e.repeat);
    } else {
      letras = escribirLetras(letras, e.key, e.timeStamp);
      const i = indicePorLetras(s.opciones.map((o) => o.valor), abierta.activo, letras.texto);
      if (i >= 0) pasarA(i, e.repeat);
    }
  });
  // Si el navegador igual lo pidiera (otro camino de cerrar el diálogo con Esc), la primera vez solo cierra la lista
  raiz.addEventListener('cancel', (e) => {
    if (cierraLaLista) e.preventDefault();
  });
  // El Espacio de un botón lo activa al soltarse en algunos navegadores: aquí ya lo atendió la tecla al bajar
  raiz.addEventListener('keyup', (e) => {
    if (e.key === ' ' && (e.target as HTMLElement).closest('[data-sel-lista]')) e.preventDefault();
  });

  // El puntero: la opción bajo él se resalta al moverlo, y suena solo si se detiene
  raiz.addEventListener('pointermove', (e) => {
    const quieto = !!ultimo && ultimo.x === e.clientX && ultimo.y === e.clientY;
    ultimo = { x: e.clientX, y: e.clientY };
    const op = (e.target as HTMLElement).closest<HTMLElement>('[role="option"]');
    if (quieto || e.pointerType === 'touch' || !abierta || !op || !abierta.lista.contains(op)) return;
    const i = [...abierta.lista.children].indexOf(op);
    activar(i, false);
    espera.mover(i);
  });
  raiz.addEventListener('pointerout', (e) => {
    if (abierta?.lista.contains(e.target as Node) && !abierta.lista.contains(e.relatedTarget as Node | null)) espera.soltar();
  });

  // Si el foco sale del botón (otro campo, otra ventana), la lista no se queda abierta sola
  raiz.addEventListener('focusout', (e) => {
    if (abierta && e.target === abierta.boton) cerrar();
  });
  // Y si se mueve lo que la rodea, sin tocar el desplazamiento de la propia lista
  raiz.addEventListener('scroll', (e) => {
    if (abierta && e.target !== abierta.lista) cerrar();
  }, true);
  window.addEventListener('resize', () => cerrar(), { signal: fin.signal });
  raiz.addEventListener('close', () => {
    cerrar();
    fin.abort();
  });
}
