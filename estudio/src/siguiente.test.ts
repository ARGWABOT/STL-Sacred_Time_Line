import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { elegirSiguiente, NUNCA, SIGUIENTE, ventanaDelCentral } from './siguiente';

const leer = (ruta: string) => readFileSync(join(__dirname, ruta), 'utf-8').replace(/\r\n/g, '\n');
const c = (x: Partial<{ visible: boolean; aLaVista: boolean; nunca: boolean; espera: boolean }> = {}) => ({ visible: true, aLaVista: true, nunca: false, espera: false, ...x });

describe('el botón central del ratón, como el «Enter» del Studio (notas de voz del titular nmvofmvg7tit y nmvofnunstit)', () => {
  it('mira la ventana donde se oprimió: el diálogo, lo enfocado o la página; nunca lo que tapa un diálogo', () => {
    expect(ventanaDelCentral({ enDialogo: true, modalAbierto: true, enfoque: 'mision' })).toBe('dialogo');
    // Fuera del diálogo que está encima, nada: lo de abajo no se toca
    expect(ventanaDelCentral({ enDialogo: false, modalAbierto: true, enfoque: '' })).toBeNull();
    expect(ventanaDelCentral({ enDialogo: false, modalAbierto: false, enfoque: 'mision' })).toBe('mision');
    expect(ventanaDelCentral({ enDialogo: false, modalAbierto: false, enfoque: 'documento' })).toBe('documento');
    expect(ventanaDelCentral({ enDialogo: false, modalAbierto: false, enfoque: '' })).toBe('pagina');
  });

  it('oprime el primero que se ve, que no es de los prohibidos y que no espera nada; en la página, solo si está a la vista', () => {
    expect(elegirSiguiente([c({ visible: false }), c({ nunca: true }), c({ espera: true }), c()], 'dialogo')).toBe(3);
    expect(elegirSiguiente([c({ aLaVista: false })], 'pagina')).toBe(-1);
    // En una ventana (un diálogo o lo enfocado) cuenta aunque haya que desplazarla para verlo
    expect(elegirSiguiente([c({ aLaVista: false })], 'mision')).toBe(0);
    expect(elegirSiguiente([], 'dialogo')).toBe(-1);
  });

  it('nunca pide una revisión, ni borra, ni cruza una puerta: solo lo marcado, y lo marcado nunca es eso', () => {
    for (const x of ['[data-revision]', '[data-pedir]', '[data-sin-ultracode]', '[data-cruzar]', '.peligro', ':disabled']) expect(NUNCA).toContain(x);
    expect(SIGUIENTE).toBe('[data-siguiente], .trozo.actual .entendido:not(.hecho)');
    const director = leer('director.ts');
    const marcados = director.split('\n').filter((l) => /data-siguiente(?!-tras)/.test(l) || l.includes('${siguiente}') || l.includes('${SIGUE_AL_DIA}'));
    expect(marcados.length).toBeGreaterThanOrEqual(6);
    for (const l of marcados) expect(l, l).not.toMatch(/data-revision|data-pedir|data-sin-ultracode|data-cruzar|peligro|Autorizo|confirmar\(/);
  });

  it('lleva a lo que sigue en las ventanas que el titular nombró', () => {
    const director = leer('director.ts');
    // Al completar una misión, «Ir a mi misión →» (o «Entendido» si no hay otra)
    expect(director).toContain('<button type="button" class="primario" data-seguir data-siguiente>Ir a mi misión →</button>');
    expect(director).toContain('<button type="button" class="primario" data-cerrar data-siguiente autofocus>Entendido</button>');
    // En la tarjeta de la misión de ahora, «Continuar en modo enfoque» o «Entregar al director»
    expect(director).toContain("const siguiente = numero === 1 && mia ? ' data-siguiente' : '';");
    expect(director).toContain('data-continuar="${esc(m.id)}|${sigue}|enfoque"${siguiente}');
    expect(director).toContain('data-entregar="${esc(m.id)}"${siguiente}');
    // En «¿Dónde quedamos?», solo cuando ya marcaste todas sus líneas
    expect(director).toContain(`const SIGUE_AL_DIA = ' data-siguiente data-siguiente-tras=".dq-seccion .dq-item:not(.leida)"';`);
    expect(director).toContain('data-a-mision${SIGUE_AL_DIA}');
    expect(director).toContain("import './siguiente';");
  });

  it('la niebla de lectura va primero, y deja el botón central cuando no tiene nada que hacer', () => {
    const guia = leer('guiaLectura.ts');
    const central = guia.match(/function conBotonCentral\(e: MouseEvent\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    // Sin nada que hacer en la lectura, no lo toma (ni le quita al navegador lo suyo): queda para lo que sigue
    expect(central.indexOf("if (hace === 'nada') return;")).toBeGreaterThan(-1);
    expect(central.indexOf("if (hace === 'nada') return;")).toBeLessThan(central.indexOf('e.preventDefault();\n'));
    // La niebla escucha en el documento y lo que sigue en la ventana, que oye después; y no oprime lo que la niebla ya usó
    expect(guia).toContain("document.addEventListener('mousedown', conBotonCentral);");
    const siguiente = leer('siguiente.ts');
    expect(siguiente).toContain("addEventListener('mousedown', conBotonCentral);");
    expect(siguiente).not.toContain("document.addEventListener('mousedown'");
    expect(siguiente).toContain('if (e.defaultPrevented) return;');
  });
});

describe('la franja de arriba de la misión en su modo enfoque (nota de voz del titular nmvofr7x3tit)', () => {
  it('lleva el tema y la niebla, con su ▶ y su velocidad, como la del documento', () => {
    const director = leer('director.ts');
    // En cuatro grupos, los mismos de la franja del documento (enfoque.test.ts): sin la letra, que es del documento
    expect(director).toContain("<span class=\"opciones-mision\" role=\"group\" aria-label=\"Cómo leer\">${controlesEnfoque({ tema: botonTema(), niebla: controlAuto('niebla'), narracion: controlAuto('voz'), sonido: botonSonido() })}</span>");
    expect(director).toContain('<div class="franja-mision"><span class="sigue-esta">→ Tu misión ahora</span>${mia ? opcionesMision() : \'\'}</div>');
    const css = leer('director.css');
    expect(css).toContain('html.enfoque-mision .mision-c.sigue.mia .opciones-mision { display: flex; }');
    expect(css).toContain('html.enfoque-mision .mision-c.sigue.mia .franja-mision { position: sticky; top: 0; z-index: 3;');
    // La nube se ve ahí, como en el documento y en «¿Dónde quedamos?»
    expect(leer('guiaLectura.css')).toContain('html.enfoque-mision .mision-c.sigue.mia .gl-niebla,');
  });
});
