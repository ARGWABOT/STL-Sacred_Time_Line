import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { aplicarRitmo, ritmoDeVoz } from './guiaLectura';
import { lineaCritica, lineaDelPaso, preguntaHtml, type CorridaVista } from './ordenOculta';
import { textoDelPaso } from './stepText';

const leer = (archivo: string) => readFileSync(new URL(archivo, import.meta.url), 'utf8');

describe('la velocidad, también en la voz que ya suena (nota de voz del titular nmvwpjfditit)', () => {
  it('cambiarla con la voz sonando cambia su ritmo, sin esperar al bloque siguiente', () => {
    const sonando = { playbackRate: ritmoDeVoz(3) };
    expect(sonando.playbackRate).toBe(1.2);
    aplicarRitmo([sonando, null, undefined], 5);
    expect(sonando.playbackRate).toBe(1.7);
    aplicarRitmo([sonando], 1);
    expect(sonando.playbackRate).toBe(0.8);
  });

  it('lo hace el selector de la velocidad, con la voz de ahora y con la muestra de «Sonidos»', () => {
    const guia = leer('guiaLectura.ts');
    const manejador = guia.slice(guia.indexOf("closest<HTMLSelectElement>('select[data-niebla-vel]')"), guia.indexOf('pedir();\n}\n\nif (typeof document'));
    expect(manejador).toContain('aplicarRitmo([voz?.audio, muestra], Number(s.value));');
  });
});

describe('la voz preparada de un paso con orden de terminal o con «Hazlo tú» es la que suena', () => {
  const fuera = () => leer('guiaLectura.ts').match(/const FUERA = \[[\s\S]*?\]\.join/)?.[0] ?? '';
  const paso = { texto: 'Corre la prueba y mira que pase.', ir: '', detalle: ['Si falla, copia el error.'], desmarcar: '', comentar: '' };

  it('el texto del paso y su detalle llevan la voz aunque traiga orden: la orden y los botones van aparte', () => {
    const html = textoDelPaso(paso);
    expect(html.startsWith('<span>Corre la prueba')).toBe(true);
    expect(html).toContain('<span class="detalle-paso">Si falla, copia el error.</span>');
    // El bloque de la orden y los botones de «Hazlo tú» no son texto de voz, y el texto del paso sí lo es
    const guia = leer('guiaLectura.ts');
    expect(guia).toContain("const SELECTOR = 'p, li, td, th, dd, ol.pasos > li > span:first-of-type, ol.pasos > li > span.detalle-paso,");
    expect(fuera()).toContain('.orden-paso');
    expect(fuera()).toContain('button');
    expect(fuera()).not.toMatch(/ol\.pasos|\.detalle-paso|span:first-of-type/);
  });

  it('lo que dice la corrida de la orden (Corriendo, Listo, la pregunta, la línea crítica) no se narra: antes cambiaba el texto de la tarjeta', () => {
    const app = leer('app.ts');
    expect(app).toContain('<div class="corrida-paso" data-corrida-de="${esc(clave)}">${htmlDelPaso(m.id, i)}</div>');
    expect(fuera()).toContain('.corrida-paso');
    // Todo lo que pinta la corrida son párrafos (lo que se lee), así que sin esa regla entraban en la tarjeta
    const corrida: CorridaVista = { id: 'c1', proyecto: 'p', mision: 'm1', paso: 0, orden: 'npm test', fase: 'corriendo', salida: '' } as CorridaVista;
    expect(lineaDelPaso(corrida, 'm1|0')).toContain('<p class="corrida-estado corriendo"');
    expect(preguntaHtml('m1|0', { orden: 'npm test', carpeta: 'C:/x', critica: false, seRecuerda: true } as never, 'p')).toContain('<p>');
    expect(lineaCritica('git push', 'C:/x', 'p')).toContain('<p class="linea-critica">');
  });

  it('cada paso por venir se prepara con el mismo dibujo del paso que la tarjeta (listaDePasos), con orden o con «Hazlo tú» incluidos', () => {
    const app = leer('app.ts');
    const venir = app.match(/function pasosPorVenir\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(venir).toContain('${listaDePasos(m, true, [i])}');
    expect(venir).not.toMatch(/terminal|hazlo/);
    expect(app).toContain('${sigue >= 0 ? listaDePasos(m, true, [sigue], deAhora ? sigue : -1)');
    // Y las órdenes y el «Hazlo tú» se dibujan dentro de ese mismo renglón, no en otro lado
    const lista = app.match(/function listaDePasos\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(lista).toContain('ordenPaso(m, i, p, conCasillas && !hechos.has(i))');
    expect(lista).toContain('quienLoHace(m, i, p, hechos.has(i))');
  });
});

describe('el botón central, al pasar de una misión a la siguiente (nota de voz del titular nmvwm8nrotit)', () => {
  // Se reprodujo en un navegador de verdad, con las dos misiones de la nota: entregada la primera con su opción, el puntero
  // queda donde cae la opción apagada de la siguiente («Primero oprime…»). Sobre un control apagado el navegador da
  // pointerdown y auxclick, pero no mousedown, que es lo que escucha el botón central (guiaLectura.ts y siguiente.ts): no
  // pasaba nada hasta mover el ratón. Con el texto de la tarjeta debajo del puntero siempre sonó.
  it('las opciones ya no se apagan esperando la visita del enlace (nmwmttqt0tit), y el botón central escucha mousedown', () => {
    expect(leer('app.ts')).not.toContain('<button type="button" class="boton-opcion" disabled>');
    expect(leer('guiaLectura.ts')).toContain("document.addEventListener('mousedown', conBotonCentral);");
    expect(leer('siguiente.ts')).toContain("addEventListener('mousedown', conBotonCentral);");
  });

  it('donde se lee, un control apagado deja pasar el clic a lo que tiene debajo', () => {
    const css = leer('guiaLectura.css');
    expect(css).toMatch(/:is\(\.mision-c, \.lector, dialog\.donde-quedamos\) :is\(button, input, select, textarea\):disabled \{\s*pointer-events: none;\s*\}/);
  });
});
