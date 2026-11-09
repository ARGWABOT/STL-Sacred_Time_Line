import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { aplicarRitmo, ritmoDeVoz } from './guiaLectura';

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

describe('el botón central, al pasar de una misión a la siguiente (nota de voz del titular nmvwm8nrotit)', () => {
  // Se reprodujo en un navegador de verdad, con las dos misiones de la nota: entregada la primera con su opción, el puntero
  // queda donde cae la opción apagada de la siguiente («Primero oprime…»). Sobre un control apagado el navegador da
  // pointerdown y auxclick, pero no mousedown, que es lo que escucha el botón central (guiaLectura.ts y siguiente.ts): no
  // pasaba nada hasta mover el ratón. Con el texto de la tarjeta debajo del puntero siempre sonó.
  it('la opción apagada existe en la misión siguiente, y el botón central escucha mousedown', () => {
    expect(leer('app.ts')).toContain('<button type="button" class="boton-opcion" disabled>');
    expect(leer('guiaLectura.ts')).toContain("document.addEventListener('mousedown', conBotonCentral);");
    expect(leer('siguiente.ts')).toContain("addEventListener('mousedown', conBotonCentral);");
  });

  it('donde se lee, un control apagado deja pasar el clic a lo que tiene debajo', () => {
    const css = leer('guiaLectura.css');
    expect(css).toMatch(/:is\(\.mision-c, \.lector, dialog\.donde-quedamos\) :is\(button, input, select, textarea\):disabled \{\s*pointer-events: none;\s*\}/);
  });
});
