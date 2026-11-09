// Las palabras de STL, explicadas donde aparecen (propuesta aceptada pr_palabras). Cada palabra tiene una sola frase,
// escrita una vez, que dicen igual el «?» del Studio y el glosario de «La documentación» (decisión del titular nmw2lyklftit):
// sus textos viven en textos/es.ts y textos/en.ts (palabra.<id>.nombre y palabra.<id>.frase). Las doce del glosario,
// como las aprobó el titular en «Las palabras de STL, en una frase», en el orden del ciclo (nmw3s4h3dtit); y las cuatro
// que solo lleva el «?», frente, reserva, criterio y sello (nmw571v2qtit). Aquí, lo puro: qué palabras hay, cuáles van en
// el glosario y cuáles llevan su «?» en el Studio (las que eligió el titular el 3 de noviembre de 2026, nmw1017l3tit).
import { altoDeVentana, anchoDeVentana, rectaEnPagina } from './escala';
import { lugarDelGlobo } from './lugarDelGlobo';
import { t } from './textos';
import { esc } from './util';

/** Las doce del glosario, en el orden en que aparecen en el ciclo. */
export const GLOSARIO = ['mision', 'revision', 'buzon', 'director', 'memoria', 'dispersion', 'ruta', 'fase', 'puerta', 'propuesta', 'pedido', 'linea'] as const;
/** Las cuatro que solo lleva el «?», sin entrada en el glosario. */
export const SOLO_AYUDA = ['frente', 'reserva', 'criterio', 'sello'] as const;
/** Las que llevan su «?» dentro del Studio: misión y reserva; fase, puerta y criterio; frente; sello; propuesta y pedido; revisión y Buzón. */
export const CON_AYUDA = ['mision', 'reserva', 'fase', 'puerta', 'criterio', 'frente', 'sello', 'propuesta', 'pedido', 'revision', 'buzon'] as const;

export type Palabra = (typeof GLOSARIO)[number] | (typeof SOLO_AYUDA)[number];

/** El nombre de la palabra y su frase, en el idioma de la interfaz. */
export function ayudaDePalabra(id: Palabra): { nombre: string; frase: string } {
  return { nombre: t(`palabra.${id}.nombre`), frase: t(`palabra.${id}.frase`) };
}

/** La línea de su «?» o de su entrada en el glosario: «Nombre: frase». */
export const lineaDePalabra = (id: Palabra): string => {
  const { nombre, frase } = ayudaDePalabra(id);
  return `${nombre}: ${frase}`;
};

/**
 * El «?» de una palabra, siempre puesto (no solo la primera vez: la ayuda es permanente porque adaptarse al Studio toma
 * tiempo; propuesta aceptada pr_palabras, nota del titular nmw5f1q72tit). Un botón con un signo de interrogación dibujado
 * y su globo: la línea «Nombre: frase» en el idioma de la interfaz. El globo aparece al pasar el ratón o con el foco, y
 * queda fijo con un clic (clase `fija`). Va solo en los rótulos del Studio, nunca dentro de lo que escribió el director.
 */
export function conAyuda(id: (typeof CON_AYUDA)[number]): string {
  if (!(CON_AYUDA as readonly string[]).includes(id)) return '';
  const linea = esc(lineaDePalabra(id));
  return `<button type="button" class="ayuda-palabra" data-palabra="${esc(id)}" aria-label="${linea}" aria-expanded="false">`
    + '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10.25" fill="none" stroke="currentColor" stroke-width="1.5"/>'
    + '<path d="M8.9 9.3a3.2 3.2 0 0 1 6.2 1c0 2.1-3.1 2.5-3.1 4.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<circle cx="12" cy="18.2" r="1.15" fill="currentColor"/></svg>'
    + `<span class="globo-palabra" role="tooltip">${linea}</span></button>`;
}

// Un solo oyente para todos los «?»: un clic fija o suelta el globo; un clic en otra parte o Esc lo cierra.
const cerrarAyudas = (salvo?: Element | null) => {
  for (const b of document.querySelectorAll('.ayuda-palabra.fija')) {
    if (b === salvo) continue;
    b.classList.remove('fija');
    b.setAttribute('aria-expanded', 'false');
  }
};
/**
 * El globo de un «?», dentro de la ventana (lugarDelGlobo.ts, nota de voz del titular nmw5m1kzwtit: el del «?» junto a
 * «Pedir revisión» salía encima de la cabecera y no se leía). Va dentro de su botón, en position absolute: su lugar se
 * calcula en píxeles de la página y se escribe medido desde el botón.
 */
function ubicarGloboPalabra(b: Element | null) {
  const g = b?.querySelector<HTMLElement>('.globo-palabra');
  if (!b || !g) return;
  const r = rectaEnPagina(b.getBoundingClientRect());
  const l = lugarDelGlobo(r, { ancho: g.offsetWidth, alto: g.offsetHeight }, { ancho: anchoDeVentana(), alto: altoDeVentana() }, { centrado: true, separacion: 8 });
  g.style.left = `${l.left - r.left}px`;
  g.style.top = `${l.top - r.top}px`;
}
if (typeof document !== 'undefined') {
  for (const evento of ['mouseover', 'focusin'] as const) {
    document.addEventListener(evento, (e) => ubicarGloboPalabra((e.target as Element | null)?.closest?.('.ayuda-palabra') ?? null));
  }
  document.addEventListener('click', (e) => {
    const b = (e.target as Element | null)?.closest?.('.ayuda-palabra') ?? null;
    cerrarAyudas(b);
    if (!b) return;
    ubicarGloboPalabra(b);
    e.preventDefault();   // dentro de un <summary> o un rótulo, el clic no despliega ni activa nada
    const fija = b.classList.toggle('fija');
    b.setAttribute('aria-expanded', String(fija));
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarAyudas(); });
}
