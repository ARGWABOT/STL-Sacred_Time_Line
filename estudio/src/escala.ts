// La escala de la página del Studio (nota de voz del titular, 26 de octubre de 2026: «básate en la resolución 1920×1080
// y escala bajando 5 % gradualmente para las resoluciones menores, tratando de que el viewport se vea lo más similar
// posible a como se ve en 1920×1080; no lo reduzcas demasiado: hasta un 80 %»).
//
// Cómo: `zoom` en la raíz (estilos.css › :root › --escala). El CSS del Studio está en píxeles, así que ninguna otra
// cosa lo encoge parejo. Lo que `zoom` cambia para el código de la página (medido con Edge 156, y es el comportamiento
// estándar del `zoom`):
//   · en píxeles de PANTALLA (los de la ventana): getBoundingClientRect y getClientRects, las coordenadas del ratón,
//     innerWidth e innerHeight, el desplazamiento de la ventana (scrollY, scrollTo) y el ancho y alto del <html>;
//   · en píxeles de la PÁGINA (los del CSS, antes de escalar): offsetWidth, clientHeight y scrollTop de cualquier
//     elemento, lo que se escribe en un style, y las variables como --alto-cabeza.
// Todo lo que mezcla las dos (ubicar un menú junto a un botón, mover el desplazamiento de una lista hasta un elemento)
// pasa por estas funciones; lo que solo compara pantalla con pantalla no las necesita.

/**
 * La ventana en la que está pensado el Studio: la del navegador maximizado en una pantalla de 1920×1080. Su alto no es
 * 1080: la barra de tareas y la del navegador se llevan entre 120 y 180 píxeles, así que con 1080 la ventana del titular
 * salía al 85 % en su propia pantalla. Con este tamaño o mayor no se escala nada.
 */
export const ANCHO_BASE = 1920;
export const ALTO_BASE = 900;
/** De cuánto en cuánto baja la escala, y hasta dónde (nunca menos). */
const PASO_ESCALA = 0.05;
export const ESCALA_MINIMA = 0.8;
/**
 * Por debajo de este ancho el Studio ya usa su diseño de teléfono (estilos.css › @media (max-width: 759px)): es compacto
 * a propósito, y encogerlo otro 20 % dejaría sus textos ilegibles. Ahí la escala es 1.
 */
export const ANCHO_TELEFONO = 760;

/**
 * La escala para una ventana: el mayor de 1, 0,95, 0,90, 0,85 y 0,80 que no pasa de lo que cabe en ancho ni en alto
 * respecto de la ventana base (el menor de los dos cocientes). Nunca más de 1 ni menos de 0,80.
 */
export function escalaParaVentana(ancho: number, alto: number): number {
  if (!Number.isFinite(ancho) || !Number.isFinite(alto) || ancho <= 0 || alto <= 0) return 1;
  if (ancho < ANCHO_TELEFONO) return 1;
  const cabe = Math.min(ancho / ANCHO_BASE, alto / ALTO_BASE);
  // En pasos enteros de 5 %, para no arrastrar decimales (1824/1920 es 0,95 justo; el 1e-6 cubre lo que la división redondea)
  const pasos = Math.floor(cabe / PASO_ESCALA + 1e-6);
  return Math.min(1, Math.max(ESCALA_MINIMA, Math.round(pasos * PASO_ESCALA * 100) / 100));
}

let actual = 1;

/** La escala puesta ahora. */
export const escalaActual = () => actual;

/** Pone una escala: la recuerda y la escribe en la raíz, donde el CSS la lee. */
export function ponerEscala(escala: number): void {
  actual = escala;
  if (typeof document !== 'undefined') document.documentElement.style.setProperty('--escala', String(escala));
}

/** Escala la página a la ventana de ahora y la vuelve a escalar cada vez que cambia de tamaño. */
export function aplicarEscala(): void {
  const alinear = () => ponerEscala(escalaParaVentana(window.innerWidth, window.innerHeight));
  alinear();
  window.addEventListener('resize', alinear, { passive: true });
}

/** De píxeles de pantalla (rectángulos, ratón, desplazamiento de la ventana) a píxeles de la página (lo que va en un style). */
export const aPagina = (pantalla: number): number => pantalla / actual;
/** De píxeles de la página (un style, un offset, --alto-cabeza) a píxeles de pantalla. */
export const aPantalla = (pagina: number): number => pagina * actual;

/** Lo que tienen en común un DOMRect y las cajas que el Studio calcula. */
export type Recta = { left: number; top: number; right: number; bottom: number; width: number; height: number };

/** Una recta de getBoundingClientRect (o de un rango), llevada a píxeles de la página. */
export const rectaEnPagina = (r: Recta): Recta => ({
  left: aPagina(r.left),
  top: aPagina(r.top),
  right: aPagina(r.right),
  bottom: aPagina(r.bottom),
  width: aPagina(r.width),
  height: aPagina(r.height),
});

/** El ancho de la ventana (sin su barra de desplazamiento) y su alto, en píxeles de la página. */
export const anchoDeVentana = (): number => aPagina(document.documentElement.clientWidth);
export const altoDeVentana = (): number => aPagina(window.innerHeight);

/** Dónde está el ratón en un evento, en píxeles de la página. */
export const puntoEnPagina = (e: { clientX: number; clientY: number }): { x: number; y: number } => ({ x: aPagina(e.clientX), y: aPagina(e.clientY) });
