import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { accionDeTecla, crearEsperaDeParada, ESPERA_PARADA_MS, escribirLetras, indicePorLetras, siguienteIndice } from './navegarLista';

const leer = (archivo: string) => readFileSync(join(__dirname, archivo), 'utf-8').replace(/\r\n/g, '\n');

describe('recorrer la lista de un selector con el teclado (pd_sonidos_flechas)', () => {
  it('las flechas avanzan y retroceden de a una, sin dar la vuelta', () => {
    expect(siguienteIndice(3, 10, 'ArrowDown')).toBe(4);
    expect(siguienteIndice(3, 10, 'ArrowUp')).toBe(2);
    // En los extremos se queda donde está: no vuelve a sonar lo que ya sonó
    expect(siguienteIndice(9, 10, 'ArrowDown')).toBe(9);
    expect(siguienteIndice(0, 10, 'ArrowUp')).toBe(0);
  });

  it('Inicio y Fin van a los extremos, y Re Pág y Av Pág saltan un trecho sin pasarse', () => {
    expect(siguienteIndice(4, 60, 'Home')).toBe(0);
    expect(siguienteIndice(4, 60, 'End')).toBe(59);
    expect(siguienteIndice(4, 60, 'PageDown')).toBe(12);
    expect(siguienteIndice(4, 60, 'PageUp')).toBe(0);
    expect(siguienteIndice(57, 60, 'PageDown')).toBe(59);
    expect(siguienteIndice(30, 60, 'PageUp')).toBe(22);
  });

  it('una tecla que no mueve, o una lista sin opciones, no da lugar', () => {
    expect(siguienteIndice(2, 10, 'a')).toBeNull();
    expect(siguienteIndice(2, 10, 'Enter')).toBeNull();
    expect(siguienteIndice(0, 0, 'ArrowDown')).toBeNull();
    // Una activa fuera de la lista se lleva adentro
    expect(siguienteIndice(-1, 5, 'ArrowDown')).toBe(1);
    expect(siguienteIndice(40, 5, 'ArrowUp')).toBe(3);
  });

  it('cerrado, Enter, Espacio y las flechas abren; Esc y Tab no hacen nada y siguen su camino', () => {
    for (const t of ['Enter', ' ', 'ArrowDown', 'ArrowUp']) expect(accionDeTecla(false, t)).toBe('abrir');
    for (const t of ['Escape', 'Tab']) expect(accionDeTecla(false, t)).toBeNull();
    // Inicio, Fin y las letras abren y se mueven
    expect(accionDeTecla(false, 'Home')).toBe('ir');
    expect(accionDeTecla(false, 'v')).toBe('escribir');
  });

  it('abierto, las flechas se mueven; Enter y Espacio eligen; Esc cierra sin cambiar; Tab la suelta', () => {
    for (const t of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp']) expect(accionDeTecla(true, t)).toBe('ir');
    expect(accionDeTecla(true, 'Enter')).toBe('elegir');
    expect(accionDeTecla(true, ' ')).toBe('elegir');
    expect(accionDeTecla(true, 'Escape')).toBe('cerrar');
    expect(accionDeTecla(true, 'Tab')).toBe('soltar');
    expect(accionDeTecla(true, 'ñ')).toBe('escribir');
    expect(accionDeTecla(true, '-')).toBe('escribir');
    // Las teclas que no son de la lista no se tocan
    for (const t of ['Shift', 'F5', 'ArrowLeft', 'Backspace']) expect(accionDeTecla(true, t)).toBeNull();
  });

  it('escribir una letra salta a la siguiente opción que empieza con ella, y varias seguidas buscan la palabra', () => {
    const nombres = ['acierto', 'acuerdo', 'empate', 'firmar', 'grabar-inicio', 'grabar-parar', 'victoria'];
    // Una letra recorre las que empiezan con ella, una por pulsación, y da la vuelta
    expect(indicePorLetras(nombres, 0, 'a')).toBe(1);
    expect(indicePorLetras(nombres, 1, 'a')).toBe(0);
    expect(indicePorLetras(nombres, 3, 'g')).toBe(4);
    expect(indicePorLetras(nombres, 4, 'g')).toBe(5);
    expect(indicePorLetras(nombres, 5, 'gg')).toBe(4);
    // Varias distintas buscan esa palabra desde la activa, que cuenta
    expect(indicePorLetras(nombres, 0, 'ac')).toBe(0);
    expect(indicePorLetras(nombres, 0, 'acu')).toBe(1);
    expect(indicePorLetras(nombres, 2, 'grabar-p')).toBe(5);
    // Sin mayúsculas, y sin nada que coincida o sin nada escrito, -1
    expect(indicePorLetras(nombres, 0, 'V')).toBe(6);
    expect(indicePorLetras(nombres, 0, 'z')).toBe(-1);
    expect(indicePorLetras(nombres, 0, '')).toBe(-1);
    expect(indicePorLetras([], 0, 'a')).toBe(-1);
    // La única que empieza con la letra, y ya es la activa, se queda
    expect(indicePorLetras(nombres, 6, 'v')).toBe(6);
  });

  it('las letras escritas con poco tiempo entre una y otra forman una palabra; si pasa más, empieza de nuevo', () => {
    const a = escribirLetras(null, 'g', 1000);
    const b = escribirLetras(a, 'r', 1300);
    expect(b.texto).toBe('gr');
    expect(escribirLetras(b, 'a', 1900).texto).toBe('gra');
    // Más de 700 ms después de la última
    expect(escribirLetras(b, 'v', 2100).texto).toBe('v');
  });
});

describe('la espera del puntero sobre una opción (decisión del titular, 26 de octubre de 2026: un tercio de segundo)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const caja = () => {
    const sonadas: number[] = [];
    return { sonadas, espera: crearEsperaDeParada((i) => sonadas.push(i)) };
  };

  it('espera un tercio de segundo, no más ni menos', () => {
    expect(ESPERA_PARADA_MS).toBe(330);
    const { sonadas, espera } = caja();
    espera.mover(4);
    vi.advanceTimersByTime(329);
    expect(sonadas).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(sonadas).toEqual([4]);
  });

  it('cruzar la lista sin detenerse no suena nada, ni una ráfaga: solo suena donde se detiene', () => {
    const { sonadas, espera } = caja();
    for (let i = 0; i < 12; i++) {
      espera.mover(i);
      vi.advanceTimersByTime(120);
    }
    expect(sonadas).toEqual([]);
    vi.advanceTimersByTime(ESPERA_PARADA_MS);
    expect(sonadas).toEqual([11]);
  });

  it('moverse dentro de la misma opción lo cuenta como no haberse detenido', () => {
    const { sonadas, espera } = caja();
    espera.mover(2);
    vi.advanceTimersByTime(300);
    espera.mover(2);
    vi.advanceTimersByTime(300);
    expect(sonadas).toEqual([]);
    vi.advanceTimersByTime(30);
    expect(sonadas).toEqual([2]);
  });

  it('suena una sola vez por cada vez que el puntero está en la opción, aunque siga moviéndose en ella', () => {
    const { sonadas, espera } = caja();
    espera.mover(5);
    vi.advanceTimersByTime(400);
    espera.mover(5);
    vi.advanceTimersByTime(1000);
    expect(sonadas).toEqual([5]);
    // Otra opción, otro sonido; y volver a la anterior sin haber salido de la lista, también
    espera.mover(6);
    vi.advanceTimersByTime(400);
    espera.mover(5);
    vi.advanceTimersByTime(400);
    expect(sonadas).toEqual([5, 6, 5]);
  });

  it('al salir de la lista (o al tomar el teclado el mando) se cancela lo pendiente y se olvida todo', () => {
    const { sonadas, espera } = caja();
    espera.mover(3);
    vi.advanceTimersByTime(200);
    espera.soltar();
    vi.advanceTimersByTime(1000);
    expect(sonadas).toEqual([]);
    // Al volver a la misma opción, cuenta como una vez nueva
    espera.mover(3);
    vi.advanceTimersByTime(400);
    espera.soltar();
    espera.mover(3);
    vi.advanceTimersByTime(400);
    expect(sonadas).toEqual([3, 3]);
  });
});

describe('el selector propio de «Los sonidos de cada momento» (pd_sonidos_flechas)', () => {
  const panel = leer('panelSonidos.ts');
  const selector = leer('selectorLista.ts');
  const css = leer('selectorLista.css');

  it('cada momento tiene su selector propio en vez del desplegable, en la misma línea que su ▶, y elegir sigue igual', () => {
    expect(panel).not.toContain('<select id="snd-');
    expect(panel).not.toContain('data-momento');
    expect(panel).toContain('<span class="ps-elegir">${htmlSelectorLista(selectores[i])}');
    expect(panel).toContain('data-oir="${m.id}"');
    // La marca del de siempre queda en su opción, y los nombres de los momentos y sus explicaciones no cambian
    expect(panel).toContain("${n === deSiempre ? ' (el de siempre)' : ''}");
    expect(panel).toContain('Elige el efecto de cada momento y óyelo con ▶. Se guarda en este navegador.');
    // Elegir guarda lo mismo que antes (nada si es el de siempre) y lo oye; pasar por una opción solo la oye
    expect(panel).toContain('alPasar: (efecto) => probar(efecto),');
    const elegir = panel.match(/alElegir: \(efecto, s\) => \{[\s\S]*?\n    \},/)?.[0] ?? '';
    expect(elegir).toContain('if (efecto === efectoDeSiempre(m, l.efectos)) delete elegidos[m];');
    expect(elegir).toContain('cambiarAjustes({ elegidos });');
    expect(elegir).toContain('probar(efecto);');
  });

  it('es un combobox de ARIA: el foco queda en el botón, la lista es un listbox y la opción activa se dice con aria-activedescendant', () => {
    expect(selector).toContain('role="combobox"');
    expect(selector).toContain('aria-haspopup="listbox"');
    expect(selector).toContain("lista.setAttribute('role', 'listbox');");
    expect(selector).toContain('role="option"');
    expect(selector).toContain("a.boton.setAttribute('aria-activedescendant', op.id);");
    expect(selector).toContain('aria-selected="${o.valor === s.valor}"');
  });

  it('Esc cierra solo la lista: lo toma antes que el diálogo y el enfoque, y si el navegador lo pidiera igual, el diálogo no se cierra', () => {
    expect(selector).toMatch(/if \(accion !== 'soltar'\) \{\s*e\.preventDefault\(\);\s*e\.stopPropagation\(\);\s*\}/);
    expect(selector).toContain("raiz.addEventListener('cancel', (e) => {\n    if (cierraLaLista) e.preventDefault();");
    // El enfoque solo se sale con Esc si no hay un diálogo abierto, y este lo está (director.ts)
    expect(leer('director.ts')).toContain("if (e.key === 'Escape' && enfoque && !document.querySelector('dialog[open]')) quererEnfoque(false);");
  });

  it('con el teclado suena al pasar (una tecla sostenida, donde se detiene) y con el ratón solo donde el puntero se detiene', () => {
    expect(selector).toContain('if (sostenida) espera.mover(i);');
    expect(selector).toContain('escucha.alPasar(abierta.s.opciones[i].valor, abierta.s);');
    expect(selector).toContain("raiz.addEventListener('pointermove', (e) => {");
    expect(selector).toContain('espera.mover(i);');
    // El movimiento que repite el navegador al desplazarse la lista no es mover el puntero
    expect(selector).toContain('ultimo.x === e.clientX && ultimo.y === e.clientY');
    // Un clic elige y la lista no le quita el foco al botón
    expect(selector).toContain('return elegir([...abierta.lista.children].indexOf(op));');
    expect(selector).toContain("if (abierta?.lista.contains(e.target as Node)) e.preventDefault();");
  });

  it('se ve igual que un desplegable en los dos temas, con su foco visible y del ancho de siempre', () => {
    expect(selector).toContain("import './selectorLista.css';");
    // Todo con las variables de los dos temas; solo la flecha cambia de color en el oscuro
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).toContain('html.oscuro .sel-lista { --sel-flecha:');
    expect(css).toMatch(/\.sel-lista:focus-visible \{ outline: 2px solid var\(--acento\);/);
    expect(css).toContain('border: 1px solid var(--borde-control)');
    expect(css).toContain('.sel-lista-op.activo { background: var(--acento-fondo); color: var(--acento-texto); }');
    // El ancho del desplegable de antes, que la regla de ▶ (todo botón de la fila) no le quita
    expect(css).toContain('.dialogo-sonidos .ps-elegir .sel-lista { width: 250px;');
    // Encima del diálogo
    expect(css).toMatch(/\.sel-lista-lista \{\s*position: fixed; z-index: 70;/);
  });
});
