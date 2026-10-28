/**
 * El botón central del ratón como el «Enter» de todo el Studio (notas de voz del titular nmvofmvg7tit y nmvofnunstit, 25
 * de octubre de 2026): oprimirlo hace lo mismo que el botón resaltado como la acción que sigue en la ventana donde se
 * está. «Ir a mi misión →» al completar una misión, «Continuar en modo enfoque» en la tarjeta de la misión de ahora,
 * «Ir a lo que sigue →» al terminar de leer «¿Dónde quedamos?» y el «Entendido →» de la idea de ahora.
 *
 * Solo cuentan los botones que lo dicen (`data-siguiente`), uno por ventana, para que se pueda revisar dónde está, y
 * nunca los que piden una revisión (solo una persona la pide, con el botón que lo dice), los que borran o cuestan, ni
 * los de cruzar una puerta (siguiente.test.ts lo comprueba en el código). Un botón con `data-siguiente-tras` espera a
 * que en su ventana ya no quede nada de ese selector (en «¿Dónde quedamos?», las líneas por marcar). La niebla de
 * lectura mira antes (guiaLectura.ts › conBotonCentral): mientras quede algo por destapar, el botón central es suyo.
 */

/** Lo que el botón central oprime en la ventana de ahora: lo marcado como lo que sigue y el «Entendido» de la idea de ahora. */
export const SIGUIENTE = '[data-siguiente], .trozo.actual .entendido:not(.hecho)';
/** Lo que nunca oprime, aunque lo marquen: pedir una revisión, lo que borra o cuesta, cruzar una puerta y lo apagado. */
export const NUNCA = '[data-revision], [data-pedir], [data-sin-ultracode], [data-cruzar], .peligro, :disabled, [aria-disabled="true"], [hidden]';

export type Ventana = 'dialogo' | 'documento' | 'mision' | 'pagina';

/**
 * Dónde se oprimió: dentro de un diálogo abierto, ese diálogo; con un diálogo modal abierto y fuera de él, ninguna (no
 * se oprime nada que el diálogo tapa); si no, lo enfocado (el documento o la tarjeta de la misión) o la página.
 */
export function ventanaDelCentral(s: { enDialogo: boolean; modalAbierto: boolean; enfoque: '' | 'documento' | 'mision' }): Ventana | null {
  if (s.enDialogo) return 'dialogo';
  if (s.modalAbierto) return null;
  return s.enfoque || 'pagina';
}

/**
 * Cuál de los candidatos, en el orden de la página, oprime: el primero que se ve, que no es de los que nunca oprime y
 * que no espera nada. En la página, además, solo si está a la vista: no se oprime lo que no se ve. -1 si ninguno.
 */
export function elegirSiguiente(c: readonly { visible: boolean; aLaVista: boolean; nunca: boolean; espera: boolean }[], ventana: Ventana): number {
  return c.findIndex((x) => x.visible && !x.nunca && !x.espera && (ventana !== 'pagina' || x.aLaVista));
}

const RAIZ: Record<Exclude<Ventana, 'dialogo'>, string> = {
  documento: 'html.enfoque .docs > .lector',
  mision: 'html.enfoque-mision .mision-c.sigue.mia',
  pagina: '#vista',
};

/** El botón de lo que sigue donde se oprimió el botón central, o null. */
function botonSiguiente(t: HTMLElement): HTMLElement | null {
  const dlg = t.closest<HTMLElement>('dialog[open]');
  const html = document.documentElement;
  let modalAbierto = false;
  try {
    modalAbierto = !!document.querySelector('dialog:modal');
  } catch {
    modalAbierto = !!document.querySelector('dialog[open]');
  }
  const enfoque = html.classList.contains('enfoque-mision') ? 'mision' : html.classList.contains('enfoque') ? 'documento' : '';
  const ventana = ventanaDelCentral({ enDialogo: !!dlg, modalAbierto, enfoque });
  if (!ventana) return null;
  const raiz = ventana === 'dialogo' ? dlg : document.querySelector<HTMLElement>(RAIZ[ventana]);
  if (!raiz) return null;
  const botones = [...raiz.querySelectorAll<HTMLElement>(SIGUIENTE)].filter((b) => b.closest('dialog[open]') === dlg);
  const i = elegirSiguiente(
    botones.map((b) => {
      const r = b.getBoundingClientRect();
      const tras = b.dataset.siguienteTras;
      return { visible: b.getClientRects().length > 0, aLaVista: r.bottom > 0 && r.top < innerHeight, nunca: b.matches(NUNCA), espera: !!tras && !!raiz.querySelector(tras) };
    }),
    ventana,
  );
  return i < 0 ? null : botones[i];
}

/** El botón que oprimió el último botón central: su auxclick tampoco hace lo del navegador. */
let oprimido = false;

function conBotonCentral(e: MouseEvent) {
  if (e.button !== 1) return;
  if (e.type === 'auxclick') {
    if (oprimido) e.preventDefault();
    oprimido = false;
    return;
  }
  oprimido = false;
  // La niebla de lectura ya lo usó (guiaLectura.ts mira antes, en el documento)
  if (e.defaultPrevented) return;
  const t = e.target as HTMLElement;
  if (t.closest('a[href], textarea, select, input, [contenteditable]')) return;
  const b = botonSiguiente(t);
  if (!b) return;
  // Sin el desplazamiento automático del navegador, que se abre con ese botón
  e.preventDefault();
  oprimido = true;
  b.click();
}

// En la ventana, no en el documento: así mira después de la niebla de lectura, que escucha en el documento
if (typeof window !== 'undefined') {
  addEventListener('mousedown', conBotonCentral);
  addEventListener('auxclick', conBotonCentral);
}
