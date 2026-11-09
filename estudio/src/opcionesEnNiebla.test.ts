// Las opciones de un paso, bajo la niebla (nota de voz del titular nmvy5wfeitit, 1 de noviembre de 2026): se veían activas.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ambitoDeBotones, BOTON_QUE_LLEVA, conBotonesTapados, desdeDelBoton, DESTAPADO, HUECO_ENTRE_NUBES_PX, NUBE_SOBRA_PX, PASO_DEL_BLOQUE, ponerOpciones, RECORTE_MAX_PX,
  tapadoPorLaNiebla, verticalDeNube,
} from './guiaLectura';
import { centralSinNiebla, elegirSiguiente, IR_SIN_DESTAPAR, NARRAR_NIEBLA, NUNCA, TAPADO } from './siguiente';

const leer = (archivo: string) => readFileSync(join(__dirname, archivo), 'utf-8').replace(/\r\n/g, '\n');

/** Un grupo de opciones de mentira: sus clases y dos botones con sus atributos. */
function grupoDeOpciones() {
  const clases = new Set<string>();
  const boton = () => {
    const atributos = new Map<string, string>();
    return { atributos, setAttribute: (k: string, v: string) => void atributos.set(k, v), removeAttribute: (k: string) => void atributos.delete(k) };
  };
  const botones = [boton(), boton()];
  const grupo = {
    classList: { toggle: (c: string, si: boolean) => (si ? clases.add(c) : clases.delete(c), si) },
    querySelectorAll: (s: string) => (s === '.boton-opcion' ? botones : []),
  } as unknown as HTMLElement;
  return { grupo, clases, botones };
}

describe('el texto de un paso lleva niebla, sea como sea el paso (nmvzlofgrtit)', () => {
  // Los hijos de un paso, como los pinta listaDePasos: el rótulo, su texto, su detalle, su ✉ y la orden de terminal
  const hijos = [
    { etiqueta: 'small', clase: 'rotulo-paso' },
    { etiqueta: 'span', clase: '' },
    { etiqueta: 'span', clase: 'detalle-paso' },
    { etiqueta: 'button', clase: 'comentar-paso' },
    { etiqueta: 'div', clase: 'orden-paso' },
  ];
  /** Lo que el selector de la guía elige de los hijos directos de un paso: solo `span`, con su clase o su posición. */
  function elegidos(lista: typeof hijos) {
    const selector = leer('guiaLectura.ts').match(/const SELECTOR = '([^']*)'/)?.[1] ?? '';
    const delPaso = selector.split(',').map((s) => s.trim()).filter((s) => s.startsWith('ol.pasos > li > span')).map((s) => s.slice('ol.pasos > li > span'.length));
    return lista.filter((h, i) => h.etiqueta === 'span' && delPaso.some((p) => {
      if (p === ':first-child') return i === 0;
      if (p === ':first-of-type') return lista.findIndex((x) => x.etiqueta === 'span') === i;
      return p === `.${h.clase}`;
    }));
  }

  it('con rótulo, orden de terminal y detalle: su texto y su detalle sí, y la orden y el rótulo quedan claros', () => {
    const pintado = leer('app.ts');
    // El rótulo va antes del texto: por eso «el primer hijo» no era el texto
    expect(pintado).toContain('${rotulo(i)}${textoDelPaso({');
    expect(elegidos(hijos)).toEqual([hijos[1], hijos[2]]);
    // La orden no es texto que se destape: está en la lista de lo que no lleva niebla
    expect(leer('guiaLectura.ts').match(/const FUERA = \[[\s\S]*?\]\.join/)?.[0]).toContain('.orden-paso');
  });

  it('igual sin rótulo (una misión de un solo paso) y sin detalle', () => {
    expect(elegidos(hijos.slice(1))).toEqual([hijos[1], hijos[2]]);
    expect(elegidos([hijos[0], hijos[1], hijos[3]])).toEqual([hijos[1]]);
  });
});

describe('las opciones de un paso se ven apagadas hasta que se destape su tarjeta', () => {
  it('con texto por destapar quedan apagadas, y al terminar la niebla se sueltan, sin usar `disabled`', () => {
    const { grupo, clases, botones } = grupoDeOpciones();
    ponerOpciones(grupo, true);
    expect(clases.has('destapadas')).toBe(false);
    for (const b of botones) {
      expect(b.atributos.get('aria-disabled')).toBe('true');
      // Un control apagado se traga el botón central (nmvwm8nrotit) y el clic que explica por qué todavía no
      expect(b.atributos.has('disabled')).toBe(false);
    }
    ponerOpciones(grupo, false);
    expect(clases.has('destapadas')).toBe(true);
    for (const b of botones) expect(b.atributos.has('aria-disabled')).toBe(false);
    // Volver a nublar las apaga otra vez
    ponerOpciones(grupo, true);
    expect(clases.has('destapadas')).toBe(false);
  });

  it('nacen apagadas con la niebla puesta, sin un instante en que se vean activas, y sin niebla no cambia nada', () => {
    const css = leer('guiaLectura.css');
    expect(css).toContain('html.niebla-lectura .mision-c .opciones-paso:not(.destapadas) .boton-opcion {\n  opacity: 0.5;\n  cursor: not-allowed;');
    // Pasar el ratón tampoco las enciende
    expect(css).toContain('html.niebla-lectura .mision-c .opciones-paso:not(.destapadas) .boton-opcion:is(:hover, :focus-visible) {');
    // Y siguen recibiendo eventos: la regla que deja pasar el clic es solo para `:disabled`
    expect(css).not.toMatch(/\.opciones-paso:not\(\.destapadas\)[^{]*\{[^}]*pointer-events/);
  });

  it('se miran al cambiar lo destapado de un bloque y al pintar la tarjeta, con la verdad de `nubladoEn`', () => {
    const guia = leer('guiaLectura.ts');
    expect(guia).toContain('if (b.punto === antes) return;\n  pedirOpciones();');
    expect(guia.match(/function marcarOpciones\(\) \{[\s\S]*?\n\}/)?.[0]).toContain('ponerOpciones(grupo, !!caja && !!nubladoEn(caja));');
    expect(guia).toContain('requestAnimationFrame(() => requestAnimationFrame(marcarOpciones));');
  });

  it('elegir ya estaba frenado: el clic no elige, y el director dice por qué', () => {
    const app = leer('app.ts');
    const freno = app.slice(app.indexOf('const LIBRE_DE_NIEBLA'), app.indexOf("$('vista').addEventListener('click'"));
    expect(freno.match(/const LIBRE_DE_NIEBLA = '([^']*)'/)?.[1]).not.toMatch(/boton-opcion|data-elegir|data-marcar-opcion|data-ya-lo-dije/);
    expect(freno).toContain('llamarNiebla(nublado, NO_AVANZA);');
    expect(freno).toContain('}, true);');
    expect(leer('app.ts')).toContain('class="boton-opcion" data-elegir=');
  });
});

describe('el botón que va entre el texto de un paso no se ve bajo la niebla (nmw5mbkbxtit)', () => {
  // Cinco palabras: tres antes del botón (el texto del paso) y dos después (su detalle, que empieza en el carácter 20)
  const palabras: [number, number][] = [[0, 3], [4, 9], [10, 18], [20, 25], [26, 30]];

  it('queda tapado mientras falte por leer una palabra de antes de él, y aparece en cuanto la niebla las destapa', () => {
    expect(tapadoPorLaNiebla(palabras, 20, -1)).toBe(true);
    expect(tapadoPorLaNiebla(palabras, 20, 1)).toBe(true);
    expect(tapadoPorLaNiebla(palabras, 20, 2)).toBe(false);
    expect(tapadoPorLaNiebla(palabras, 20, 4)).toBe(false);
  });

  it('sin silueta: invisible y sin recibir el clic; y el texto y la niebla con su interlineado normal (nmw5nx1tdtit)', () => {
    const css = leer('guiaLectura.css');
    expect(css).toMatch(/html\.niebla-lectura \.gl-tapado \{\s*visibility: hidden;\s*opacity: 0;\s*pointer-events: none;\s*\}/);
    // Volvió el espaciado de antes: ningún alto de renglón ni margen propio de la niebla en los pasos
    expect(css).not.toMatch(/\.pasos li > span \{[^}]*line-height/);
    expect(css).not.toMatch(/\.pasos li > \.ir-paso \{[^}]*margin-block/);
    const guia = leer('guiaLectura.ts');
    expect(guia).toContain('cubrir(b, b.punto + (deCamino ? 2 : 1));\n  const huecos = taparBotones(b);');
    expect(guia).toContain("const tapado = tapadoPorLaNiebla(b.palabras, desde, b.punto);\n    boton.classList.toggle('gl-tapado', tapado);");
  });
});

describe('el «ir» de un paso sin detalle también queda tapado, y las nubes no se pisan (nmw5wdlsutit)', () => {
  // La captura: el paso 4 de t_ver_recorrido_cielo, sin detalle. Su texto se lee solo (su `span`), y su «Abrir el
  // recorrido ↗» es hermano de ese `span`, no hijo, y no tiene texto después: quedaba fuera de taparBotones, visible.
  const palabras: [number, number][] = [[0, 9], [10, 15], [16, 18], [19, 24]];
  /** Lo justo de un elemento para ambitoDeBotones. */
  const el = (soy: string, paso: object | null) => ({ matches: (s: string) => s === soy, closest: (s: string) => (s === PASO_DEL_BLOQUE ? paso : null) });

  it('el ámbito de los botones de un bloque que es solo el texto de un paso es el paso entero', () => {
    const paso = { matches: () => false, closest: () => null };
    const texto = el(`${PASO_DEL_BLOQUE} > span`, paso);
    expect(ambitoDeBotones(texto)).toBe(paso);
    // Una tarjeta o un párrafo se buscan en sí mismos, como antes
    const tarjeta = el('.mision-c', null);
    expect(ambitoDeBotones(tarjeta)).toBe(tarjeta);
    expect(leer('guiaLectura.ts')).toContain("for (const boton of ambitoDeBotones(b.el).querySelectorAll<HTMLElement>('button:not(.gl-guia, .gl-control)')) {");
  });

  it('un «ir» sin texto después se tapa hasta la última palabra; el ✉ al final, no', () => {
    const desde = desdeDelBoton(['ir-paso', 'principal'], null);
    expect(desde).toBe(Infinity);
    expect(tapadoPorLaNiebla(palabras, desde ?? 0, -1)).toBe(true);
    expect(tapadoPorLaNiebla(palabras, desde ?? 0, 2)).toBe(true);
    expect(tapadoPorLaNiebla(palabras, desde ?? 0, 3)).toBe(false);
    expect(desdeDelBoton(['comentar-paso'], null)).toBeNull();
    // Con texto después, como antes: desde donde empieza ese texto
    expect(desdeDelBoton(['ir-paso'], 16)).toBe(16);
    // Y el «ir» de un paso lleva esa clase
    expect(leer('app.ts')).toContain("function botonIr(dest: Destino, clase = 'ir-paso', extra = '') {");
    expect(BOTON_QUE_LLEVA).toBe('ir-paso');
  });

  it('las nubes de renglones seguidos dejan su hueco, sin destapar la letra', () => {
    // Tres renglones con el interlineado normal: palabras de 20 px de alto cada 22 px
    const cajas = [0, 22, 44].map((y) => ({ x: 0, y, ancho: 100, alto: 20 }));
    const renglones = [0, 1, 2];
    const v = renglones.map((r) => verticalDeNube(cajas, renglones, r));
    for (let r = 0; r < 2; r++) expect(v[r + 1].y - (v[r].y + v[r].alto)).toBeGreaterThanOrEqual(HUECO_ENTRE_NUBES_PX - 1e-9);
    // Cada nube cubre su renglón, salvo lo poco que recorta para el hueco
    v.forEach((n, r) => {
      expect(n.y).toBeLessThanOrEqual(cajas[r].y + RECORTE_MAX_PX);
      expect(n.y + n.alto).toBeGreaterThanOrEqual(cajas[r].y + cajas[r].alto - RECORTE_MAX_PX);
    });
    // Con renglones separados, sobresale como siempre
    const lejos = [0, 40].map((y) => ({ x: 0, y, ancho: 100, alto: 20 }));
    expect(verticalDeNube(lejos, [0, 1], 0)).toEqual({ y: -NUBE_SOBRA_PX, alto: 20 + 2 * NUBE_SOBRA_PX });
    expect(leer('guiaLectura.ts')).toContain('const v = verticalDeNube(cajas, b.renglones, n.renglon);');
  });
});

describe('con la niebla puesta, el botón central nunca oprime el «ir» de un paso tapado: narra (nmw5nuk5xtit)', () => {
  // El paso 3 de t_ver_ayuda_secciones: su «ir», «Abrir el Buzón», es lo que sigue para el botón central (data-siguiente,
  // app.ts › irDelPasoSigue) y la niebla todavía lo tapa (gl-tapado). Con visibility: hidden su caja sigue en la pantalla,
  // así que getClientRects dice que «se ve»: por eso siguiente.ts lo oprimía y llevaba al Buzón sin destapar nada.
  const ir = { clases: ['ir-paso', 'principal', 'gl-tapado'], atributos: ['data-siguiente'] };
  /** Lo justo de matches() para los selectores simples de NUNCA: una clase sola o un atributo solo. */
  const cumple = (sel: string) =>
    /^\.[\w-]+$/.test(sel) ? ir.clases.includes(sel.slice(1)) : /^\[[\w-]+\]$/.test(sel) ? ir.atributos.includes(sel.slice(1, -1)) : false;

  it('el «ir» tapado es de lo que nunca oprime: no navega', () => {
    const nunca = NUNCA.split(', ').some(cumple);
    expect(nunca).toBe(true);
    expect(TAPADO).toBe('.gl-tapado, .gl-tapado *');
    expect(elegirSiguiente([{ visible: true, aLaVista: true, nunca, espera: false }], 'mision')).toBe(-1);
    // Ya destapado, sí lleva a donde pide el paso
    ir.clases.pop();
    expect(elegirSiguiente([{ visible: true, aLaVista: true, nunca: NUNCA.split(', ').some(cumple), espera: false }], 'mision')).toBe(0);
    ir.clases.push('gl-tapado');
  });

  it('lo que hace es encender la narración, mientras la niebla tape algo en la ventana o lo oprimido', () => {
    expect(centralSinNiebla({ nieblaPuesta: true, tapadosEnVentana: 1, sobreTapado: false, hayBoton: true })).toBe('narrar');
    expect(centralSinNiebla({ nieblaPuesta: true, tapadosEnVentana: 0, sobreTapado: true, hayBoton: true })).toBe('narrar');
    expect(centralSinNiebla({ nieblaPuesta: true, tapadosEnVentana: 0, sobreTapado: false, hayBoton: true })).toBe('oprimir');
    expect(centralSinNiebla({ nieblaPuesta: false, tapadosEnVentana: 0, sobreTapado: false, hayBoton: true })).toBe('oprimir');
    expect(centralSinNiebla({ nieblaPuesta: false, tapadosEnVentana: 0, sobreTapado: false, hayBoton: false })).toBe('nada');
  });

  it('en el código: siguiente.ts narra antes de mirar un enlace o un botón, y la niebla lo escucha y cuenta el botón tapado', () => {
    const siguiente = leer('siguiente.ts');
    const central = siguiente.slice(siguiente.indexOf('function conBotonCentral(e: MouseEvent)'));
    expect(central.indexOf('document.dispatchEvent(new CustomEvent(NARRAR_NIEBLA));')).toBeGreaterThan(0);
    expect(central.indexOf('document.dispatchEvent(new CustomEvent(NARRAR_NIEBLA));')).toBeLessThan(central.indexOf("if (t.closest('a[href]')) return;"));
    expect(central.indexOf("if (t.closest('a[href]')) return;")).toBeLessThan(central.indexOf('const b = botonSiguiente(t);'));
    const guia = leer('guiaLectura.ts');
    expect(NARRAR_NIEBLA).toBe('stl-narrar-niebla');
    expect(guia).toContain(`document.addEventListener('${NARRAR_NIEBLA}', () => {\n    if (activa() && !reproduciendo) reproducir(true);`);
    expect(guia).toContain("const quedaNiebla = lista.some(sinTerminar) || !!caja.querySelector('.gl-tapado') || faltaPorMedir(caja);");
  });
});

describe('con la niebla puesta, el «ir» de un paso solo se oprime cuando la niebla lo destapó de forma expresa (nmw6l9avrtit)', () => {
  // La quinta nota: al pasar a la misión siguiente, el botón central abrió el recorrido (el «ir» del paso 1) sin destapar
  // nada. La niebla marca el botón como tapado uno o dos cuadros después de pintar la tarjeta (adjuntar › fijar ›
  // taparBotones), o nunca si no la pudo medir: en ese hueco el botón no estaba tapado ni destapado, y siguiente.ts lo oprimía.
  it('el «ir» sin la marca de destapado es de lo que nunca oprime, en cada ventana de lectura y solo con la niebla puesta', () => {
    expect(DESTAPADO).toBe('gl-destapado');
    expect(NUNCA).toContain(IR_SIN_DESTAPAR);
    for (const v of ['html.niebla-lectura.enfoque-mision .mision-c.sigue.mia', 'html.niebla-lectura.enfoque .docs > .lector', 'html.niebla-lectura dialog.donde-quedamos[open]']) {
      expect(IR_SIN_DESTAPAR).toContain(`${v} .ir-paso:not(.${DESTAPADO})`);
      expect(IR_SIN_DESTAPAR).toContain(`${v} .ir-paso:not(.${DESTAPADO}) *`);
    }
    // Sin la niebla, el «ir» responde como siempre: cada parte del selector la exige
    for (const parte of IR_SIN_DESTAPAR.split(', ')) expect(parte.startsWith('html.niebla-lectura')).toBe(true);
  });

  it('en el código: la niebla pone y quita la marca, y mientras la ventana no se termina de medir el botón central es suyo', () => {
    const guia = leer('guiaLectura.ts');
    expect(guia).toContain('boton.classList.toggle(DESTAPADO, !tapado);');
    // Al soltar un bloque, sus botones pierden la marca hasta que el bloque nuevo lo decida
    const soltar = guia.slice(guia.indexOf('function soltarBloque(b: Bloque)'), guia.indexOf('const enPie ='));
    expect(soltar).toContain('botonesEntreTexto.get(b)?.forEach(({ boton }) => boton.classList.remove(DESTAPADO));');
    // Lo que aún no tiene bloque, o el bloque que se ve sin medir ni fijar, cuenta como niebla
    expect(guia).toContain('unidadesDe(caja).some((u) => !u.el.dataset.guia && seMuestra(u.el)) ||');
    expect(guia).toContain('return seMuestra(el) && (!b || !medir(b) || b.punto < 0);');
    // Y siguiente.ts narra con el puntero sobre un «ir» sin destapar, aunque aún no lleve gl-tapado
    expect(leer('siguiente.ts')).toContain('const sobreTapado = !!t.closest(TAPADO) || !!t.closest(IR_SIN_DESTAPAR);');
  });
});

describe('la niebla no deja hueco donde va un botón tapado (nmw6uyc48tit)', () => {
  const nube = (x: number, y: number, ancho: number, renglon: number) => ({ x, y, ancho, alto: 18, renglon });

  it('la nube de su renglón se alarga hasta cubrir el lugar del botón, antes o después de sus palabras', () => {
    // El tercer renglón empezaba en 360 porque el botón tapado ocupa de 0 a 340 sin ser palabra (la captura del titular)
    const nubes = [nube(20, 0, 900, 0), nube(0, 24, 920, 1), nube(360, 48, 560, 2)];
    const boton = { x: 0, y: 52, ancho: 340, alto: 0 };
    const cubiertas = conBotonesTapados(nubes, [boton]);
    expect(cubiertas[2]).toEqual({ ...nubes[2], x: 0, ancho: 920 });
    // Los otros renglones no cambian
    expect(cubiertas[0]).toBe(nubes[0]);
    expect(cubiertas[1]).toBe(nubes[1]);
    // Al final del renglón, igual
    expect(conBotonesTapados([nube(0, 0, 300, 0)], [{ x: 320, y: 4, ancho: 120, alto: 0 }])[0]).toMatchObject({ x: 0, ancho: 440 });
  });

  it('sin botones tapados, o con uno sin ancho o en otro renglón, nada cambia', () => {
    const nubes = [nube(360, 48, 560, 2)];
    expect(conBotonesTapados(nubes, [])).toEqual(nubes);
    expect(conBotonesTapados(nubes, [{ x: 0, y: 52, ancho: 0, alto: 0 }])[0]).toBe(nubes[0]);
    expect(conBotonesTapados(nubes, [{ x: 0, y: 120, ancho: 340, alto: 0 }])[0]).toBe(nubes[0]);
  });

  it('la página pasa a las nubes dónde quedan los botones que siguen tapados', () => {
    const guia = leer('guiaLectura.ts');
    expect(guia).toContain('const huecos = taparBotones(b);');
    expect(guia).toContain('for (const n of conBotonesTapados(nubesDe(cajas, b.renglones, b.punto), huecos)) {');
  });
});
