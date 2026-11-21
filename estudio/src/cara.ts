// La cara del director: la del director flotante (equipo.ts), su miniatura en la niebla de lectura (guiaLectura.ts) y
// el director de la línea viva (lineaViva.ts), que es el mismo personaje (nota del titular nmvvx6o79tit).
import type { Emocion } from '../../src/director/animo';

/** La cara en su caja de 100 × 104: lo que va dentro del SVG, para ponerla también dentro de otro dibujo. */
export function caraDentro(e: Emocion | 'parpadeo'): string {
  return `<ellipse class="carcasa" cx="50" cy="54" rx="47" ry="49"/>
    <ellipse class="visor" cx="50" cy="55" rx="40" ry="43"/>
    <circle class="brillo" cx="41" cy="20" r="3"/>
    <g class="luz">${trazosCara(e)}</g>`;
}

/** La cara del director como un SVG. */
export function caraSVG(e: Emocion | 'parpadeo'): string {
  return `<svg viewBox="0 0 100 104" aria-hidden="true">
    ${caraDentro(e)}
  </svg>`;
}

/**
 * La cara del modelo (nota de voz del titular nmvxxg5wvtit), la misma con cualquier modelo: de la misma familia que la del
 * director, más cuadrada y con ojos de punto, para que en la conversación se distingan de un vistazo. Sin nada encima: lo
 * único que se mueve en ella es que esté trabajando (nota de voz nmvy3nroytit; director.css › cara-trabaja).
 * `apachurrable`: la misma cara, con su gesto de apretar los ojos debajo, para la avalancha (progresoVivo.ts), que alterna
 * los dos (nota de voz del titular nmw46zhl5tit: en la animación, las mismas caras del chat).
 */
export function caraDelModeloSVG(apachurrable = false): string {
  const luz = '<path d="M33 60v2"/><path d="M67 60v2"/><path d="M42 73 A9 8 0 0 0 58 73"/>';
  return `<svg viewBox="0 20 100 88" aria-hidden="true">
    <rect class="carcasa" x="6" y="27" width="88" height="74" rx="30"/>
    <rect class="visor" x="15" y="36" width="70" height="56" rx="23"/>
    ${apachurrable ? `<g class="luz cara-feliz">${luz}</g><g class="luz cara-apretada"><path d="M27 55l8 5-8 5M73 55l-8 5 8 5"/><path d="M42 77q4-4 8 0t8 0"/></g>` : `<g class="luz">${luz}</g>`}
    <g class="rubor"><ellipse cx="25" cy="73" rx="6" ry="3.4"/><ellipse cx="75" cy="73" rx="6" ry="3.4"/></g>
  </svg>`;
}

/** Los trazos de cada emoción, como en una pantalla: ojos y boca de luz celeste, rubor rosado. */
function trazosCara(e: Emocion | 'parpadeo'): string {
  const ojoFeliz = (x: number) => `<path d="M${x - 9} 50 A9 9 0 0 1 ${x + 9} 50"/>`;
  const ojoCerrado = (x: number) => `<path d="M${x - 9} 46 A9 9 0 0 0 ${x + 9} 46"/>`;
  const ojoLinea = (x: number) => `<path d="M${x - 8} 48 L${x + 8} 48"/>`;
  const ojoRedondo = (x: number) => `<circle cx="${x}" cy="48" r="7"/>`;
  const ojoGuino = (x: number, dir: 1 | -1) => `<path d="M${x - 6 * dir} 41 L${x + 6 * dir} 48 L${x - 6 * dir} 55"/>`;
  const corazon = (x: number) => `<path d="M${x} 56 L${x - 9} 46 A5 5 0 0 1 ${x} 40 A5 5 0 0 1 ${x + 9} 46 Z"/>`;
  const sonrisa = '<path d="M39 67 A11 11 0 0 0 61 67"/>';
  const rubor = '<g class="rubor"><ellipse cx="23" cy="62" rx="6" ry="3.4"/><ellipse cx="77" cy="62" rx="6" ry="3.4"/></g>';
  const trazos: Record<Emocion | 'parpadeo', string> = {
    feliz: ojoFeliz(33) + ojoFeliz(67) + sonrisa + rubor,
    riendo: ojoGuino(33, 1) + ojoGuino(67, -1) + '<path d="M39 65 L61 65 A11 11 0 0 1 39 65 Z"/>' + rubor,
    sorprendido: ojoRedondo(33) + ojoRedondo(67) + '<circle cx="50" cy="71" r="4.5"/>',
    pensativo: ojoLinea(33) + '<path d="M59 47 A8 8 0 0 1 75 47"/>' + '<path d="M45 73 L58 70"/>',
    picaro: ojoGuino(33, 1) + ojoRedondo(67) + sonrisa + '<ellipse class="lengua" cx="56" cy="77" rx="3.6" ry="3"/>' + rubor,
    enamorado: corazon(33) + corazon(67) + sonrisa + rubor,
    tranquilo: ojoCerrado(33) + ojoCerrado(67) + '<path d="M43 69 A8 8 0 0 0 57 69"/>',
    parpadeo: ojoLinea(33) + ojoLinea(67) + sonrisa + rubor,
  };
  return trazos[e];
}
