import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ALTO_BASE, ANCHO_BASE, ANCHO_TELEFONO, aPagina, aPantalla, ESCALA_MINIMA, escalaActual, escalaParaVentana, ponerEscala, puntoEnPagina, rectaEnPagina } from './escala';

const leer = (archivo: string) => readFileSync(join(__dirname, archivo), 'utf-8').replace(/\r\n/g, '\n');

describe('la escala de la página según la ventana (nota de voz del titular, 26 de octubre de 2026)', () => {
  it('en 1920×1080 y en lo más grande no cambia nada', () => {
    expect(escalaParaVentana(1920, 1080)).toBe(1);
    expect(escalaParaVentana(2560, 1440)).toBe(1);
    expect(escalaParaVentana(3840, 2160)).toBe(1);
    // Una ventana ancha pero no alta, o alta pero no ancha, se escala por la medida que no llega
    expect(escalaParaVentana(3840, 1080)).toBe(1);
    expect(escalaParaVentana(1920, 1400)).toBe(1);
  });

  it('baja de 5 en 5 %, al paso de abajo: el mayor que no pasa de lo que cabe', () => {
    expect(escalaParaVentana(1824, 1026)).toBe(0.95); // justo 95 %
    expect(escalaParaVentana(1823, 1026)).toBe(0.9); // un píxel menos: el paso de abajo
    expect(escalaParaVentana(1728, 972)).toBe(0.9);
    expect(escalaParaVentana(1632, 918)).toBe(0.85);
    expect(escalaParaVentana(1536, 864)).toBe(0.8); // 1920×1080 al 125 % de Windows
    expect(escalaParaVentana(1919, 1080)).toBe(0.95);
    // El navegador maximizado en una pantalla de 1080 deja unos 900 a 960 de alto: ahí no se escala (con 1080 de base
    // salía al 85 % en la pantalla del titular)
    expect(escalaParaVentana(1920, 950)).toBe(1);
    expect(escalaParaVentana(1920, 900)).toBe(1);
    // Una ventana más baja sí: manda el alto
    expect(escalaParaVentana(1920, 855)).toBe(0.95);
    expect(escalaParaVentana(1920, 765)).toBe(0.85);
    expect(escalaParaVentana(1920, 700)).toBe(0.8);
  });

  it('nunca baja de 80 %', () => {
    expect(escalaParaVentana(1600, 900)).toBe(0.8); // 83 %: el paso de 80
    expect(escalaParaVentana(1440, 900)).toBe(0.8); // 75 %: no hay paso, se queda en 80
    expect(escalaParaVentana(1366, 768)).toBe(0.8);
    expect(escalaParaVentana(1280, 720)).toBe(0.8);
    expect(escalaParaVentana(1000, 2000)).toBe(0.8);
    expect(ESCALA_MINIMA).toBe(0.8);
  });

  it('el teléfono, con su diseño propio, no se escala; desde 760 de ancho sí', () => {
    expect(escalaParaVentana(390, 844)).toBe(1);
    expect(escalaParaVentana(ANCHO_TELEFONO - 1, 900)).toBe(1);
    expect(escalaParaVentana(ANCHO_TELEFONO, 900)).toBe(0.8);
    expect(escalaParaVentana(820, 1180)).toBe(0.8);
  });

  it('una medida que no es de verdad (ventana oculta, 0, NaN) deja la escala en 1', () => {
    for (const [a, h] of [[0, 0], [0, 900], [1440, 0], [NaN, 900], [1440, NaN], [Infinity, 900], [-1440, 900]]) expect(escalaParaVentana(a, h)).toBe(1);
  });

  it('en todo tamaño: entre 0,80 y 1, múltiplo de 0,05 y sin bajar al crecer la ventana', () => {
    let anterior = 0;
    for (let ancho = ANCHO_TELEFONO; ancho <= 2600; ancho += 7) {
      const e = escalaParaVentana(ancho, ALTO_BASE);
      expect(e).toBeGreaterThanOrEqual(0.8);
      expect(e).toBeLessThanOrEqual(1);
      expect(Math.abs(e * 20 - Math.round(e * 20))).toBeLessThan(1e-9);
      expect(e).toBeGreaterThanOrEqual(anterior);
      anterior = e;
    }
    anterior = 0;
    for (let alto = 400; alto <= 1500; alto += 3) {
      const e = escalaParaVentana(1920, alto);
      expect(e).toBeGreaterThanOrEqual(anterior);
      anterior = e;
    }
    expect(escalaParaVentana(ANCHO_BASE, ALTO_BASE)).toBe(1);
  });
});

describe('la medida de la pantalla y la de la página, con la página escalada', () => {
  afterEach(() => ponerEscala(1));

  it('sin escala son la misma; con 0,8, la página mide un cuarto más que la pantalla', () => {
    expect(aPagina(80)).toBe(80);
    ponerEscala(0.8);
    expect(escalaActual()).toBe(0.8);
    expect(aPagina(80)).toBeCloseTo(100);
    expect(aPantalla(100)).toBeCloseTo(80);
    expect(aPantalla(aPagina(123))).toBeCloseTo(123);
  });

  it('un rectángulo de getBoundingClientRect y un punto del ratón pasan a píxeles de la página', () => {
    ponerEscala(0.5);
    expect(rectaEnPagina({ left: 10, top: 20, right: 110, bottom: 70, width: 100, height: 50 })).toEqual({ left: 20, top: 40, right: 220, bottom: 140, width: 200, height: 100 });
    expect(puntoEnPagina({ clientX: 30, clientY: 40 })).toEqual({ x: 60, y: 80 });
  });
});

describe('la escala en los estilos y en el código', () => {
  const hojas = readdirSync(__dirname).filter((n) => n.endsWith('.css'));

  it('la raíz se escala con zoom y las unidades de la ventana se compensan', () => {
    const raiz = leer('estilos.css').match(/^:root \{[^}]*\}/m)?.[0] ?? '';
    expect(raiz).toContain('--escala: 1;');
    expect(raiz).toContain('zoom: var(--escala);');
    expect(raiz).toContain('--vh: calc(1vh / var(--escala));');
    expect(raiz).toContain('--vw: calc(1vw / var(--escala));');
    expect(raiz).toContain('--dvh: calc(1dvh / var(--escala));');
  });

  it('ningún estilo del Studio usa vh, vw ni dvh sueltos: con zoom miden la ventana sin la escala, y un alto de 100vh dejaría la barra lateral corta', () => {
    expect(hojas).toEqual(expect.arrayContaining(['estilos.css', 'director.css']));
    const sueltas = hojas.flatMap((hoja) =>
      leer(hoja)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n')
        .filter((l) => /[\d.](vh|vw|dvh|svh|lvh|dvw|vmin|vmax)\b/.test(l) && !/^\s*--(vh|vw|dvh):/.test(l))
        .map((l) => `${hoja}: ${l.trim().slice(0, 90)}`),
    );
    expect(sueltas).toEqual([]);
  });

  it('el Studio se escala al abrir', () => {
    const director = leer('director.ts');
    expect(director).toContain("import { anchoDeVentana, aplicarEscala, aPantalla, rectaEnPagina } from './escala';");
    // Antes de que nada se mida o se ubique
    expect(director.indexOf('\naplicarEscala();')).toBeGreaterThan(0);
    expect(director.indexOf('\naplicarEscala();')).toBeLessThan(director.indexOf('\ncerrarConClicFuera();'));
  });

  it('lo que ubica algo con las medidas de la pantalla las pasa a las de la página antes de escribirlo en un style', () => {
    // Cada lugar que escribe un top, un left o un right desde un rectángulo o el ratón, o mueve un desplazamiento propio hasta un elemento
    for (const archivo of ['panelSonidos.ts', 'selectorLista.ts', 'guiaLectura.ts']) expect(leer(archivo)).toContain('./escala');
    expect(leer('panelSonidos.ts')).toContain('rectaEnPagina(b.getBoundingClientRect())');
    expect(leer('selectorLista.ts')).toContain('rectaEnPagina(boton.getBoundingClientRect())');
    const guia = leer('guiaLectura.ts');
    expect(guia).toContain('const c = rectaEnPagina(rs[rs.length - 1] ?? r.getBoundingClientRect());');
    expect(guia).toContain('const r = rectaEnPagina(op.getBoundingClientRect());');
    expect(guia).toContain('const dedo = puntoEnPagina(e);');
    const director = leer('director.ts');
    expect(director).toContain('rectaEnPagina($(\'proyecto-activo\').getBoundingClientRect())');
    expect(director).toContain('desplazamientoParaVer(rectaEnPagina(columna.getBoundingClientRect()), rectaEnPagina(el.getBoundingClientRect()))');
    expect(director).toContain('desplazamientoParaVer(rectaEnPagina(columna.getBoundingClientRect()), rectaEnPagina(sel.getBoundingClientRect()))');
    // La ventana se desplaza en píxeles de pantalla, y la cabecera (--alto-cabeza) se mide en los de la página
    expect(director).toContain("const cabeza = aPantalla(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--alto-cabeza')) || 0);");
    expect(director).toContain('window.scrollY - aPantalla(cabeza + 12)');
  });
});

describe('la cabecera en una ventana pequeña (nota de voz del titular, 26 de octubre de 2026: una sola línea arriba, sin que los botones bajen)', () => {
  const css = leer('director.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const regla = (selector: string) => css.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{[^}]*\\}`))?.[0] ?? '';

  it('el título y los botones van en la misma fila, que no envuelve: el título cede y los botones no', () => {
    expect(regla('.cabeza-fila')).toContain('display: flex');
    expect(regla('.cabeza-fila')).toContain('flex-wrap: nowrap');
    // El título toma lo que queda y puede achicarse hasta nada (min-width 0); su contenedor mide para la letra
    expect(regla('.cabeza-fila .donde')).toContain('flex: 1 1 0');
    expect(regla('.cabeza-fila .donde')).toContain('min-width: 0');
    expect(regla('.cabeza-fila .donde')).toContain('container-type: inline-size');
    // Los botones: una sola línea y su tamaño, siempre
    expect(regla('.acciones-cabeza')).toContain('flex-wrap: nowrap');
    expect(regla('.acciones-cabeza')).toContain('flex: none');
    expect(regla('.acciones-cabeza > *')).toContain('white-space: nowrap');
    // En el teléfono (menos de 760 px, donde la escala no actúa) caben menos botones de los que hay: ahí envuelve
    expect(css).toMatch(/@media \(max-width: 759px\) \{\s*\.cabeza-fila:not\(\.segunda\) \{ flex-wrap: wrap; \}/);
  });

  it('el título de la fase baja su letra con el ancho que le queda y, si aun así no cabe, se corta con puntos suspensivos; la etapa se queda a su lado', () => {
    const h1 = regla('.cabeza-proyecto h1');
    expect(h1).toMatch(/font-size: clamp\(17px, [\d.]+cqi, 26px\)/);
    expect(h1).toContain('display: flex');
    expect(h1).toContain('overflow: hidden');
    const titulo = regla('.cabeza-proyecto h1 .titulo-fase');
    for (const p of ['min-width: 0', 'overflow: hidden', 'text-overflow: ellipsis', 'white-space: nowrap']) expect(titulo).toContain(p);
    expect(regla('.cabeza-proyecto h1 small')).toContain('flex: none');
    expect(regla('.cabeza-proyecto .sobretitulo')).toContain('text-overflow: ellipsis');
    // El título de la fase lleva su clase, para poder cortarlo sin cortar la etapa
    expect(leer('director.ts')).toContain('<h1><span class="titulo-fase">${esc(f.nombre)}</span> <small>${esc(corto(f.etapa))}</small></h1>');
  });

  it('la franja de abajo (criterios y meta) usa todo el ancho de una sola fila: la meta crece, y cada texto se corta con puntos suspensivos solo donde ya no cabe', () => {
    expect(regla('.cabeza-fila.segunda')).not.toContain('wrap;');
    expect(regla('.cabeza-fila.segunda')).not.toContain('flex-wrap: wrap');
    const avance = regla('.avance-puerta');
    expect(avance).toContain('flex: 0 1 auto');
    expect(avance).toContain('min-width: 0');
    const textoAvance = regla('.avance-puerta > span:last-child');
    for (const p of ['min-width: 0', 'overflow: hidden', 'text-overflow: ellipsis', 'white-space: nowrap']) expect(textoAvance).toContain(p);
    const meta = regla('.objetivo-cabeza');
    for (const p of ['flex: 1 1 auto', 'min-width: 0', 'overflow: hidden', 'text-overflow: ellipsis', 'white-space: nowrap']) expect(meta).toContain(p);
    // Ya no se topa a 560 px: antes dejaba la franja a medias y la meta bajaba a otra línea
    expect(meta).not.toContain('max-width');
  });
});
