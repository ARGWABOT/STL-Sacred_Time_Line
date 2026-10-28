// La cara del director: la del director flotante (equipo.ts) y su miniatura en la niebla de lectura (guiaLectura.ts).
import type { Emocion } from '../../src/director/animo';

/** Los trazos de cada emoción, como en una pantalla: ojos y boca de luz celeste, rubor rosado. */
export function caraSVG(e: Emocion | 'parpadeo'): string {
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
  return `<svg viewBox="0 0 100 104" aria-hidden="true">
    <ellipse class="carcasa" cx="50" cy="54" rx="47" ry="49"/>
    <ellipse class="visor" cx="50" cy="55" rx="40" ry="43"/>
    <circle class="brillo" cx="41" cy="20" r="3"/>
    <g class="luz">${trazos[e]}</g>
  </svg>`;
}
