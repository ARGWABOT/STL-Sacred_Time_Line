/**
 * El botón central del ratón como el «Enter» de todo el Studio (notas de voz del titular nmvofmvg7tit y nmvofnunstit, 25
 * de octubre de 2026): oprimirlo hace lo mismo que el botón resaltado como la acción que sigue en la ventana donde se
 * está. «Ir a mi misión →» al terminar de leer un documento, «Continuar en modo enfoque» en la tarjeta de la misión de ahora,
 * cada línea leída de «¿Dónde quedamos?» y, al terminar de marcarlas, «Ir a lo que sigue →», y el «Entendido →» de la
 * idea de ahora.
 *
 * Solo cuentan los botones que lo dicen (`data-siguiente`), uno por ventana, para que se pueda revisar dónde está, y
 * nunca los que piden una revisión (solo una persona la pide, con el botón que lo dice), los que borran o cuestan, ni
 * los de cruzar una puerta (siguiente.test.ts lo comprueba en el código). Un botón con `data-siguiente-tras` espera a
 * que en su ventana ya no quede nada de ese selector (en «¿Dónde quedamos?», las líneas por marcar). La niebla de
 * lectura mira antes (guiaLectura.ts › conBotonCentral): mientras quede algo por destapar, el botón central es suyo.
 * Y si no queda nada que oprimir donde se está, hace lo de la carita del director: lleva a tu misión de ahora (nota de voz
 * del titular nmvzo1jxhtit, 2 de noviembre de 2026).
 */

/**
 * En «¿Dónde quedamos?», la primera línea sin marcar de la pestaña abierta (pedido pd_central_pestana; notas de voz del
 * titular nmvvaqeuytit y nmvvbjywjtit, 30 de octubre de 2026): cuando la niebla ya no tiene nada que destapar, el botón
 * central marca lo leído, en orden, como si se tocara cada línea. Al quedar completa la pestaña, el diálogo pasa solo a la
 * siguiente con algo por leer (app.ts › pintarProgresoDq), donde la niebla vuelve a leer primero; y sin nada por
 * marcar en ninguna, «Ir a lo que sigue →», que esperaba a eso (SIGUE_AL_DIA). Las líneas van antes que ese botón en el
 * diálogo: por eso se marcan primero.
 */
export const LINEA_POR_MARCAR = '.dq-panel:not([hidden]) .dq-seccion .dq-item:not(.leida, .tachando)';
/** Lo que el botón central oprime en la ventana de ahora: lo marcado como lo que sigue, el «Entendido» de la idea de ahora y la línea por marcar. */
export const SIGUIENTE = `[data-siguiente], .trozo.actual .entendido:not(.hecho), ${LINEA_POR_MARCAR}`;
/**
 * Un botón que la niebla aún tapa (guiaLectura.ts › taparBotones, la clase gl-tapado): invisible, pero con su caja en la
 * pantalla, así que «se ve» para getClientRects. Nunca lo oprime el botón central (nota de voz del titular nmw5nuk5xtit,
 * 7 de noviembre de 2026: con la niebla puesta, el botón central abrió el Buzón del «ir» de un paso sin destapar).
 */
export const TAPADO = '.gl-tapado, .gl-tapado *';
/**
 * El «ir» de un paso en una ventana de lectura con la niebla puesta, mientras la niebla no lo haya destapado de forma
 * expresa (guiaLectura.ts › taparBotones le pone `gl-destapado` al leer la palabra que lo suelta). Al revés que TAPADO: no
 * espera a que la niebla lo marque como tapado, que llega uno o dos cuadros después de pintar la tarjeta, o nunca si no se
 * pudo medir; en ese hueco el botón central abría el enlace del paso de la misión que acababa de llegar (quinta nota del
 * titular, nmw6l9avrtit, 7 de noviembre de 2026, tras nmw5ekmcmtit, nmw5nuk5xtit y nmw5wdlsutit).
 */
export const IR_SIN_DESTAPAR = [
  'html.niebla-lectura.enfoque-mision .mision-c.sigue.mia',
  'html.niebla-lectura.enfoque .docs > .lector',
  'html.niebla-lectura dialog.donde-quedamos[open]',
]
  .map((v) => `${v} .ir-paso:not(.gl-destapado), ${v} .ir-paso:not(.gl-destapado) *`)
  .join(', ');
/** Lo que nunca oprime, aunque lo marquen: pedir una revisión, lo que borra o cuesta, cruzar una puerta, lo apagado y lo que la niebla tapa o aún no destapó. */
export const NUNCA = `[data-revision], [data-pedir], [data-sin-ultracode], [data-cruzar], .peligro, :disabled, [aria-disabled="true"], [hidden], ${TAPADO}, ${IR_SIN_DESTAPAR}`;

/** Las ventanas de lectura, donde la niebla destapa lo que se lee (guiaLectura.ts › VENTANAS). */
const VENTANAS_DE_LECTURA = 'dialog.donde-quedamos[open], html.enfoque .docs > .lector, html.enfoque-mision .mision-c.sigue.mia';
/** El aviso a la niebla de lectura: que encienda la narración (guiaLectura.ts lo escucha). */
export const NARRAR_NIEBLA = 'stl-narrar-niebla';

/**
 * Qué hace el botón central, si la niebla de lectura no lo tomó antes: mientras la niebla tape algo en la ventana donde
 * se oprime (o lo oprimido esté tapado), es de la narración: la enciende y nunca oprime un botón ni lleva a otra parte
 * (regla del titular nmw5nuk5xtit, guardada en src/director/reglasDelTitular.ts). Si no, oprime lo que sigue, o nada. Pura.
 */
export function centralSinNiebla(s: { nieblaPuesta: boolean; tapadosEnVentana: number; sobreTapado: boolean; hayBoton: boolean }): 'narrar' | 'oprimir' | 'nada' {
  if (s.nieblaPuesta && (s.tapadosEnVentana > 0 || s.sobreTapado)) return 'narrar';
  return s.hayBoton ? 'oprimir' : 'nada';
}

/**
 * En «Hoy», fuera del modo enfoque, el botón central abre tu misión de ahora en modo enfoque, esté donde esté el cursor
 * (pedido pd_central_hoy; notas de voz del titular nmvveszr9tit y nmvvk48q0tit, y su elección «Siempre la misión
 * primero», 30 de octubre de 2026): oprime el botón «Modo enfoque» que lo dice (app.ts › aplicarEnfoque lo marca
 * solo donde hay una misión tuya que enfocar). Va antes que lo marcado en la página: primero la misión, después lo que pide.
 */
export const ENFOCAR_EN_HOY = '[data-central-enfoque]:not([hidden])';

/**
 * Pero antes, mientras «¿Dónde quedamos?» tenga líneas por leer, el botón central en «Hoy» lo abre a él (nota de voz del
 * titular nmvvlhs55tit, 30 de octubre de 2026): primero se lee lo que dejó el director, y después se enfoca la misión.
 * Oprime su botón de arriba, que el Studio marca solo en «Hoy» y solo con algo por leer (app.ts › pintarMando).
 */
export const DQ_EN_HOY = '[data-central-dq]:not([hidden])';

/** Lo que abre el botón central en la página de «Hoy», en su orden: «¿Dónde quedamos?» con algo por leer, y si no, tu misión en modo enfoque. */
export const PRIMERO_EN_HOY = [DQ_EN_HOY, ENFOCAR_EN_HOY] as const;

/**
 * Si el botón «ir» del paso de ahora es también lo que sigue para el botón central (notas de voz del titular
 * nmvvk48q0tit y nmvvkdkfytit, 30 de octubre de 2026): en tu misión de ahora, una vez destapada la niebla de la
 * tarjeta, el botón central lleva a donde pide el paso (una propuesta, una vista, una página). Nunca elige una opción
 * ni hace nada por ti: solo va. Un documento ya lo lleva «Continuar en modo enfoque», y un paso que ya se fue a mirar
 * espera que cuentes cómo fue, no volver a ir (salvo uno que se marca solo al hacerlo, que se vuelve a abrir).
 */
export function irDelPasoSigue(p: { deAhora: boolean; doc: boolean; hecho: boolean; abierto: boolean }): boolean {
  return p.deAhora && !p.doc && (p.hecho || !p.abierto);
}

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

/** La carita del director flotante (equipo.ts): oprimirla lleva a tu misión de ahora, desde donde estés. */
export const CARA_DEL_DIRECTOR = '#director-flotante .df-cara';

/**
 * Sin nada marcado que oprimir: ¿le toca a la carita del director? Solo fuera de un diálogo: dentro de uno, o con uno modal
 * encima, el botón central no te saca de él. Pura.
 */
export const leTocaALaCara = (ventana: Ventana | null, c: { visible: boolean; nunca: boolean }): boolean =>
  !!ventana && ventana !== 'dialogo' && c.visible && !c.nunca;

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
  if (ventana === 'pagina') {
    for (const que of PRIMERO_EN_HOY) {
      const primero = [...document.querySelectorAll<HTMLElement>(que)].find((b) => b.getClientRects().length > 0);
      if (primero) return primero;
    }
  }
  const raiz = ventana === 'dialogo' ? dlg : document.querySelector<HTMLElement>(RAIZ[ventana]);
  const botones = raiz ? [...raiz.querySelectorAll<HTMLElement>(SIGUIENTE)].filter((b) => b.closest('dialog[open]') === dlg) : [];
  const i = elegirSiguiente(
    botones.map((b) => {
      const r = b.getBoundingClientRect();
      const tras = b.dataset.siguienteTras;
      return { visible: b.getClientRects().length > 0, aLaVista: r.bottom > 0 && r.top < innerHeight, nunca: b.matches(NUNCA), espera: !!tras && !!raiz!.querySelector(tras) };
    }),
    ventana,
  );
  if (i >= 0) return botones[i];
  // Nada que oprimir aquí: lleva a tu misión de ahora, como la carita del director
  const cara = document.querySelector<HTMLElement>(CARA_DEL_DIRECTOR);
  return cara && leTocaALaCara(ventana, { visible: cara.getClientRects().length > 0, nunca: cara.matches(NUNCA) }) ? cara : null;
}

/** El botón que oprimió el último botón central: su auxclick tampoco hace lo del navegador. */
let oprimido = false;

let enClicCentral = false;
/**
 * Si el clic que se atiende ahora lo dio el botón central: dura lo que dura ese clic. Así, «Ir a lo que sigue →» de
 * «¿Dónde quedamos?» oprimido con el botón central abre tu misión ya en modo enfoque, como desde «Hoy» (nota de voz del
 * titular nmw0ysgrytit, 3 de noviembre de 2026: «cuando se trata de autoavance… se debe activar automáticamente el modo
 * enfoque en la misión siguiente»; antes llegaba a la tarjeta sin el enfoque y el botón central seguía dentro de ella).
 */
export const clicDelCentral = () => enClicCentral;

/** Oprime un botón como lo hace el botón central: mientras su clic se atiende, clicDelCentral() lo dice. */
export function oprimirComoCentral(b: { click(): void }): void {
  enClicCentral = true;
  try {
    b.click();
  } finally {
    enClicCentral = false;
  }
}

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
  if (t.closest('textarea, select, input, [contenteditable]')) return;
  // Con algo tapado por la niebla donde se oprime, el botón central es de la narración (también sobre un enlace tapado)
  const lectura = t.closest<HTMLElement>(VENTANAS_DE_LECTURA) ?? document.querySelector<HTMLElement>(VENTANAS_DE_LECTURA);
  const nieblaPuesta = document.documentElement.classList.contains('niebla-lectura');
  const sobreTapado = !!t.closest(TAPADO) || !!t.closest(IR_SIN_DESTAPAR);
  const tapados = lectura ? lectura.querySelectorAll(TAPADO).length : 0;
  if (centralSinNiebla({ nieblaPuesta, tapadosEnVentana: tapados, sobreTapado, hayBoton: false }) === 'narrar') {
    e.preventDefault();
    oprimido = true;
    document.dispatchEvent(new CustomEvent(NARRAR_NIEBLA));
    return;
  }
  if (t.closest('a[href]')) return;
  const b = botonSiguiente(t);
  if (!b) return;
  // Sin el desplazamiento automático del navegador, que se abre con ese botón
  e.preventDefault();
  oprimido = true;
  oprimirComoCentral(b);
}

// En la ventana, no en el documento: así mira después de la niebla de lectura, que escucha en el documento
if (typeof window !== 'undefined') {
  addEventListener('mousedown', conBotonCentral);
  addEventListener('auxclick', conBotonCentral);
}
