import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { bloqueParaEmpezar, DEL_MODELO, paraLeer, puntoDe, borde, CAMARA_MAX, conPunto, desdeRueda, esListaCorta, muescas, MUESCA, MS_REUBICAR, PALABRAS_POR_MUESCA, PALABRAS_PUNTO_CORTO, pasoCamara, pxDeRueda, queHaceCentral, dondeSeguir, huellaDe, leerPuntos, lugarEn, MIN_PALABRAS, MS_CAMBIO, MS_CAMBIO_ATRAS, nubesDe, oirVoz, palabrasDe, palabrasPorMinuto, ritmoDeVoz, sinVozAhora, vocesNaturales, vocesNaturalesDeLectura, posHacia, PPM_BASE, pxPorPalabra, pxPorSegundo, RAPIDEZ_MIN, rapidezReubicar, renglonesDe, ritmo, RATON_QUIETO_MS, SALTO, seMovio, VELOCIDADES, type Caja } from './guiaLectura';

// Tres renglones de cuatro palabras, de 40 px de ancho, 20 px de alto y 10 px entre una y otra
const cajas: Caja[] = [0, 1, 2].flatMap((r) => [0, 1, 2, 3].map((p) => ({ x: p * 50, y: r * 30, ancho: 40, alto: 20 })));
const renglones = renglonesDe(cajas);
const leer = (ruta: string) => readFileSync(join(__dirname, ruta), 'utf-8').replace(/\r\n/g, '\n');
const LADO = 22;

/** El director caminando solo hacia `destino`, a toda marcha y a 60 cuadros por segundo: cuánto tarda y el mayor salto entre dos cuadros. */
function caminar(destino: number, velocidad: number) {
  const px = pxPorSegundo(velocidad, pxPorPalabra(cajas, renglones));
  let pos = -1;
  let ms = 0;
  let mayor = 0;
  let antes = lugarEn(cajas, renglones, pos, LADO);
  while (pos < destino && ms < 120_000) {
    const r = ritmo(cajas, renglones, pos, 1, px, MS_CAMBIO, LADO);
    pos = Math.min(destino, borde(renglones, pos, 1), pos + (r * 1000) / 60 / 1000);
    ms += 1000 / 60;
    const l = lugarEn(cajas, renglones, pos, LADO);
    mayor = Math.max(mayor, Math.hypot(l.x - antes.x, l.y - antes.y));
    antes = l;
  }
  return { ms, mayor, px };
}

describe('la niebla de lectura (notas de voz del titular, 24 de octubre de 2026)', () => {
  it('parte el texto en palabras, con su lugar exacto, y deja sin niebla lo que es solo un rótulo', () => {
    expect(palabrasDe('  Hola,  mundo\nlargo ')).toEqual([[2, 7], [9, 14], [15, 20]]);
    expect(MIN_PALABRAS).toBe(3);
  });

  it('nada dentro de algo plegable lleva niebla, y lo que se lee y deja de verse se detiene (nota de voz del titular nmvosyiartit)', () => {
    const guia = leer('guiaLectura.ts');
    expect(guia).toContain("export const PLEGABLE = 'details';");
    expect(guia).toMatch(/const lee = \(el: HTMLElement\) => [^\n]*!el\.closest\(PLEGABLE\)/);
    // Al volver a mirar: si el bloque de la voz se plegó o ya no está, calla; si el del avance solo no se ve, se detiene
    const escanear = guia.match(/function escanear\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(escanear).toContain('if (voz && (!bloques.has(voz.b.el) || !seMuestra(voz.b.el))) callar();');
    expect(escanear).toContain('if ([...bloques.values()].some((b) => b.auto && !seMuestra(b.el))) reproducir(false);');
    // Los pasos completados de una misión van plegados: nunca con niebla
    expect(leer('director.ts')).toContain('<details class="pasos-completados"');
  });

  it('la huella no cambia con los espacios, y sí cuando el texto se reescribe', () => {
    expect(huellaDe('Un  texto\npara leer')).toBe(huellaDe('Un texto para leer '));
    expect(huellaDe('Un texto para leer')).not.toBe(huellaDe('Un texto para releer'));
  });

  it('recuerda hasta dónde se leyó cada bloque, olvida al volver al principio y, pasado el tope, los más viejos', () => {
    let p = conPunto({}, 'a', 3, 1);
    p = conPunto(p, 'b', 5, 2);
    expect(p).toEqual({ a: [3, 1], b: [5, 2] });
    expect(conPunto(p, 'a', -1, 3)).toEqual({ b: [5, 2] });
    expect(Object.keys(conPunto(p, 'c', 1, 3, 2))).toEqual(['b', 'c']);
    expect(leerPuntos('no es json')).toEqual({});
    expect(leerPuntos('[1]')).toEqual({});
    expect(leerPuntos(JSON.stringify(p))).toEqual(p);
  });

  it('sabe en qué renglón va cada palabra', () => {
    expect(renglones).toEqual([0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2]);
  });

  it('el puntero marca el lugar exacto del camino, no la palabra más cercana, y estar al principio de un renglón es haber bajado a él', () => {
    // Nada leído: con el director justo después de la segunda palabra, hasta ella; a medio camino, a medias
    expect(posHacia(cajas, renglones, 91, 10, LADO)).toBe(1);
    expect(posHacia(cajas, renglones, 66, 10, LADO)).toBeCloseTo(0.5);
    // Antes de la primera palabra: nada leído
    expect(posHacia(cajas, renglones, -40, 10, LADO)).toBe(-1);
    // Con el puntero en el renglón de abajo, al principio: el director baja a él (antes se quedaba pegado al final del de arriba)
    expect(posHacia(cajas, renglones, -11, 40, LADO)).toBeCloseTo(3 + SALTO);
    expect(posHacia(cajas, renglones, -60, 40, LADO)).toBeCloseTo(3 + SALTO);
    expect(posHacia(cajas, renglones, -11, 40, LADO)).toBeGreaterThan(3);
    // Tres renglones abajo de golpe: el destino es allá (el director camina hasta él a su ritmo, no salta)
    expect(posHacia(cajas, renglones, 91, 70, LADO)).toBe(9);
    expect(posHacia(cajas, renglones, 500, 500, LADO)).toBe(11);
  });

  it('camina parejo en píxeles: la misma rapidez en una palabra larga que en una corta, a la velocidad elegida', () => {
    const mixtas: Caja[] = [0, 30, 140, 170].map((x, i) => ({ x, y: 0, ancho: [20, 100, 20, 60][i], alto: 20 }));
    const r = renglonesDe(mixtas);
    const largo = (k: number) => (k < 0 ? mixtas[0].x + mixtas[0].ancho + 1 - (mixtas[0].x - LADO - 4) : mixtas[k + 1].x + mixtas[k + 1].ancho - (mixtas[k].x + mixtas[k].ancho));
    for (const k of [-1, 0, 1, 2]) expect(ritmo(mixtas, r, k + 0.5, 1, 40, MS_CAMBIO, LADO) * largo(k)).toBeCloseTo(40);
    // La velocidad: 1× son 50 palabras por minuto, y cada paso suma 50; vale también al arrastrar
    expect(PPM_BASE).toBe(50);
    expect(VELOCIDADES.map(palabrasPorMinuto)).toEqual([50, 100, 150, 200, 250]);
    expect(pxPorPalabra(cajas, renglones)).toBeCloseTo((190 * 3) / 12);
    expect(pxPorSegundo(1, 48)).toBeCloseTo(40);
  });

  it('aunque el puntero se adelante o baje de golpe, recorre lo que falta a su velocidad, sin saltos entre dos cuadros', () => {
    const a1 = caminar(11, 1);
    const a5 = caminar(11, 5);
    // Lo que camina sobre los tres renglones, a su rapidez, más dos cambios de renglón de MS_CAMBIO cada uno
    const camino = 217 + 202 * 2;
    expect(a1.ms / 1000).toBeCloseTo(camino / a1.px + (2 * MS_CAMBIO) / 1000, 0);
    expect(a5.ms / 1000).toBeCloseTo(camino / a5.px + (2 * MS_CAMBIO) / 1000, 0);
    expect(a1.ms).toBeGreaterThan(a5.ms);
    // A 60 cuadros por segundo, ni en el arco del cambio de renglón pasa de unos pocos píxeles de un cuadro al siguiente
    expect(a1.mayor).toBeLessThan(16);
    expect(a5.mayor).toBeLessThan(16);
  });

  it('el cambio de renglón es un solo movimiento suave de un segundo, sin pausa antes ni espera después, sea largo o corto el renglón; de vuelta, más rápido (nota de voz del titular nmvmz5okftit)', () => {
    expect(MS_CAMBIO).toBe(1000);
    expect(MS_CAMBIO_ATRAS).toBeLessThan(MS_CAMBIO);
    // En el cambio, el ritmo es de tiempo: el mismo para cualquier velocidad y cualquier largo de renglón
    expect(ritmo(cajas, renglones, 3.1, 1, 40, MS_CAMBIO, LADO)).toBeCloseTo((SALTO * 1000) / MS_CAMBIO);
    expect(ritmo(cajas, renglones, 3.1, 1, 400, MS_CAMBIO, LADO)).toBeCloseTo((SALTO * 1000) / MS_CAMBIO);
    // Un paso no cruza el borde de su tramo: el cambio termina en 3 + SALTO, y de ahí camina hasta 4
    expect(borde(renglones, 3, 1)).toBeCloseTo(3 + SALTO);
    expect(borde(renglones, 3 + SALTO, 1)).toBe(4);
    expect(borde(renglones, 4, -1)).toBeCloseTo(3 + SALTO);
    expect(borde(renglones, 3 + SALTO, -1)).toBe(3);
    // Del final del renglón (x 191, y 10) al principio del siguiente (x -11, y 40): todo el cambio es el movimiento,
    // nunca quieto al final ni al llegar
    expect(lugarEn(cajas, renglones, 3, LADO)).toEqual({ x: 191, y: 10, saltando: true });
    let antes = lugarEn(cajas, renglones, 3, LADO);
    for (let i = 1; i <= 20; i++) {
      const l = lugarEn(cajas, renglones, 3 + (SALTO * i) / 20, LADO);
      expect(l.x).toBeLessThan(antes.x);
      antes = l;
    }
    const llega = lugarEn(cajas, renglones, 3 + SALTO, LADO);
    expect(llega.x).toBeCloseTo(-11);
    expect(llega.y).toBe(40);
    expect(llega.saltando).toBe(false);
    // Apenas llega, sigue caminando sobre la primera palabra del renglón nuevo
    expect(lugarEn(cajas, renglones, 3 + SALTO + 0.02, LADO).x).toBeGreaterThan(-11);
    const guia = leer('guiaLectura.ts');
    expect(guia).not.toContain('CAMBIO.pausa');
    expect(leer('guiaLectura.css')).toContain('animation: gl-salto 1s ease-in-out;');
  });

  it('cubre con una nube cada renglón por leer, desde la primera palabra que falta, y desvela lo que deja atrás el director', () => {
    // Nada leído: tres nubes, cada una de un renglón entero
    expect(nubesDe(cajas, renglones, -1)).toEqual([0, 1, 2].map((r) => ({ renglon: r, x: 0, y: r * 30, ancho: 190, alto: 20 })));
    // Leído hasta la segunda palabra: la nube del primer renglón empieza en la tercera
    expect(nubesDe(cajas, renglones, 1)[0]).toEqual({ renglon: 0, x: 100, y: 0, ancho: 90, alto: 20 });
    // El primer renglón entero leído: su nube ya no está
    expect(nubesDe(cajas, renglones, 3).map((n) => n.renglon)).toEqual([1, 2]);
    // Todo leído: sin niebla
    expect(nubesDe(cajas, renglones, 11)).toEqual([]);
  });

  it('va en el modo enfoque y en «¿Dónde quedamos?», con su atajo, «Niebla de lectura», encendido; fuera de ellos, nada', () => {
    const guia = leer('guiaLectura.ts');
    expect(guia).toContain("const activa = () => document.documentElement.classList.contains('niebla-lectura');");
    expect(guia).toContain("document.querySelector<HTMLElement>('dialog.donde-quedamos[open]') ??");
    expect(guia).toContain("'html.enfoque .docs > .lector, html.enfoque-mision .mision-c.sigue.mia'");
    // En «¿Dónde quedamos?», lo que escribió el director: en qué quedamos (un párrafo) y las líneas que faltan por leer
    expect(guia).toContain(".dq-item:not(.leida, .tachando) .dq-texto'");
    // Sin la niebla puesta, cada bloque la suelta
    expect(guia).toMatch(/const caja = activa\(\) \? ventana\(\) : null;\n\s*for \(const \[el, b\] of bloques\) if \(!caja[^\n]*soltarBloque\(b\);/);
    // Ni títulos ni la interfaz del Studio; sí las decisiones (un punto con sus botones debajo)
    expect(guia).toMatch(/const FUERA = \[\n\s*'nav, header, summary, label, select, textarea, \[contenteditable\], button/);
    expect(guia).not.toMatch(/const SELECTOR = [^\n]*h[1-6]/);
    // El atajo, junto a la cara del director, escondido hasta que el enfoque se pone
    const atajo = leer('../../index.html').match(/<button[^>]*data-niebla[^>]*>/)?.[0] ?? '';
    expect(atajo).toContain('data-etiqueta="Niebla de lectura"');
    expect(atajo).toMatch(/ hidden>$/);
    const director = leer('director.ts');
    expect(director).toContain("import { controlAuto, dondeVa, llamarNiebla, NO_AVANZA, nieblaPuesta, nubladoEn, ponerNiebla, sinDestapar } from './guiaLectura';");
    const aplicar = director.match(/function aplicarEnfoque\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(aplicar).toContain("const paraLeer = si || !!document.querySelector('dialog.donde-quedamos[open]');");
    expect(aplicar).toContain('const niebla = paraLeer && nieblaPuesta();');
    expect(aplicar).toContain("html.classList.toggle('niebla-lectura', niebla);");
    expect(aplicar).toContain("if (b.classList.contains('atajo')) b.hidden = !paraLeer;");
    // «¿Dónde quedamos?» la pone al abrirse y la quita al cerrarse
    const dq = director.match(/async function mostrarDondeQuedamos\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(dq).toMatch(/dlg\.showModal\(\);\n[^\n]*\n\s*aplicarEnfoque\(\);/);
    expect(dq).toMatch(/dlg\.remove\(\);\n[^\n]*\n\s*aplicarEnfoque\(\);/);
  });

  it('las nubes nunca quedan encima del título de la parte ni de la franja de arriba: cada bloque es su propia capa', () => {
    const css = leer('guiaLectura.css');
    expect(css).toMatch(/\.gl-ancla,\n\.gl-bloque \{\n\s*isolation: isolate;/);
    // Y sin transiciones que hagan ir al director o a las nubes detrás de su lugar
    expect(css).not.toMatch(/transition: left/);
  });

  it('un solo director para lo que se lee de una vez: una idea entera, un paso con su detalle, una lista de puntos cortos (nota de voz del titular nmvmzsi0stit)', () => {
    // Una lista se junta si tiene más de un punto y todos son cortos (unos tres renglones)
    expect(esListaCorta([12, 30, PALABRAS_PUNTO_CORTO])).toBe(true);
    expect(esListaCorta([12, PALABRAS_PUNTO_CORTO + 1])).toBe(false);
    expect(esListaCorta([12])).toBe(false);
    const guia = leer('guiaLectura.ts');
    // Los grupos: la idea de un documento y el paso de la misión; dentro, aparte, una tabla y la respuesta del director
    expect(guia).toContain("const GRUPO = '.cuerpo-trozo, ol.pasos > li';");
    expect(guia).toContain("const APARTE_DEL_GRUPO = 'table, .respuesta-dir';");
    // Las líneas que se tocan una por una nunca se juntan
    expect(guia).toContain("const LISTA_SUELTA = '.dq-lista, .pasos';");
    // El texto de cada miembro, uno tras otro, y la niebla cubre solo su texto, nodo por nodo (nunca lo que hay entre dos)
    expect(guia).toContain("if (i) texto += ' ';");
    const cubrir = guia.match(/function cubrir\(b: Bloque, desde: number\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(cubrir).toContain('for (const { nodo, desde: d } of b.nodos) {');
    // El director espera al principio del primer miembro, con su lugar
    expect(guia).toContain('inicio.prepend(guia);');
    expect(leer('guiaLectura.css')).toMatch(/\.gl-inicio \{\n\s*padding-inline-start: 30px;/);
    // Escanear y cargar donde se va leyendo cuentan los mismos bloques
    expect(guia.match(/function escanear\(\) \{[\s\S]*?\n\}/)?.[0]).toContain('for (const u of unidadesDe(caja)) {');
    expect(guia.match(/export function dondeVa\(caja: HTMLElement\): Caja \| null \{[\s\S]*?\n\}/)?.[0]).toContain('const leidos = unidadesDe(caja)');
  });

  it('el director siempre donde termina su niebla: si el texto se acomoda de otra forma, se mide de nuevo (notas de voz del titular nmvmzmwj9tit y nmvn0e14xtit)', () => {
    const guia = leer('guiaLectura.ts');
    // El navegador no avisa del tamaño de un texto en línea: se vigila también su ancla, que es un bloque
    expect(guia).toContain('if (ancla !== el) tamanos?.observe(ancla);');
    expect(guia).toContain('if (!cambiados.has(b.el) && !cambiados.has(b.ancla)) continue;');
  });

  it('con la niebla puesta, tocar una línea de «¿Dónde quedamos?» aún nublada no la da por leída (nota de voz del titular nmvn0h59stit)', () => {
    const tocar = leer('director.ts').match(/function tocarDq\([\s\S]*?\n\}/)?.[0] ?? '';
    // Y lo dice en el globito, como en todo lugar donde no se deja avanzar (nota de voz del titular nmvouevcdtit)
    const guarda = tocar.indexOf('if (sinDestapar(texto)) return llamarNiebla(texto, NO_AVANZA);');
    expect(guarda).toBeGreaterThan(0);
    // Antes de marcarla leída, y después de la vuelta de una ya leída (esa no lleva niebla)
    expect(guarda).toBeLessThan(tocar.indexOf('linea.leida = new Date().toISOString();'));
    expect(guarda).toBeGreaterThan(tocar.indexOf("if (b.classList.contains('leida')) {"));
    // Sin niebla, lo de siempre
    expect(leer('guiaLectura.ts').match(/export function sinDestapar\([\s\S]*?\n\}/)?.[0]).toContain('if (!el || !activa()) return false;');
  });

  it('con la niebla puesta, lo que hace avanzar espera a que se destape toda su tarjeta o su idea (nota de voz del titular nmvojwvsmtit)', () => {
    const director = leer('director.ts');
    // Se frena antes que todo lo demás (en la captura), en la tarjeta de la misión y en la idea de un documento
    expect(director).toContain("const CAJA_NIEBLA = '.mision-c, .trozo';");
    const freno = director.slice(director.indexOf('const LIBRE_DE_NIEBLA'), director.indexOf("$('vista').addEventListener('click'"));
    expect(freno).toContain("closest<HTMLElement>('button, input[type=\"checkbox\"]')");
    expect(freno).toContain('e.stopImmediatePropagation();');
    // Y no solo brinca: lo dice en un globito junto al director (nota de voz del titular nmvot7ynytit)
    expect(freno).toContain('llamarNiebla(nublado, NO_AVANZA);');
    // Con las palabras del titular, y el tiempo de leerlas (nota de voz del titular nmvouevcdtit)
    expect(leer('guiaLectura.ts')).toContain("export const NO_AVANZA = 'Mientras tengas el modo niebla activado, no puedes avanzar hasta que termines de descubrir todo el texto.';");
    const llamar = leer('guiaLectura.ts').match(/export function llamarNiebla\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(llamar).toContain('if (dice) {');
    expect(llamar).toContain('globo(b, dice, GLOBO_MS);');
    // Y detiene ▶ y la voz: se vuelve a oprimir ▶ (nota de voz del titular nmvovmscdtit)
    expect(llamar).toContain('if (dice && (reproduciendo || voz)) reproducir(false);');
    expect(llamar.indexOf('reproducir(false)')).toBeLessThan(llamar.indexOf('marcarUltimo(b)'));
    // El globito lo dibuja la niebla: no se lee, no hace volver a mirar y se va con su bloque
    const guia = leer('guiaLectura.ts');
    expect(guia).toContain("const DIBUJO = '.gl-guia, .gl-nube, .gl-efecto, .gl-globo, .gl-control';");
    expect(guia).toMatch(/const SALTAR = `[^`]*\.gl-globo/);
    expect(guia).toContain("b.inicio.querySelectorAll(':scope > .gl-efecto').forEach((e) => e.remove());\n  quitarGlobo(b);");
    expect(leer('guiaLectura.css')).toContain('.gl-globo {');
    // En la capa de arriba y dentro de la ventana: ningún contenedor lo corta cerca del borde (nota de voz del titular
    // nmvovbwxctit, 26 de octubre de 2026)
    const dibujaGlobo = guia.match(/function globo\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(dibujaGlobo).toContain("g.popover = 'manual';");
    expect(dibujaGlobo).toContain('document.body.append(g);');
    expect(dibujaGlobo).not.toContain('b.guia.after(g)');
    const ubicar = guia.match(/function ubicarGlobo\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(ubicar).toContain('Math.max(margen, Math.min(x - g.offsetWidth / 2, anchoDeVentana() - g.offsetWidth - margen))');
    expect(leer('guiaLectura.css')).toMatch(/\.gl-globo \{\s*position: fixed;/);
    expect(freno).toContain('}, true);');
    // Comentar, el enfoque y los controles de la niebla siguen libres
    for (const libre of ['[data-comentar]', '[data-enfoque]', '[data-niebla]', '[data-niebla-auto]', '.gl-control']) expect(freno).toContain(libre);
    // Lo que va y vuelve sin cambiar la tarjeta, también (nota de voz del titular nmvolmqojtit): el botón de un paso a un
    // documento, una sección o una página, abrir o copiar su orden de terminal y copiar el texto que se pega afuera
    for (const libre of ['[data-destino]', '[data-terminal]', '[data-copiar-orden]', '[data-copiar-texto]']) expect(freno).toContain(libre);
    // Lo que cambia la tarjeta sigue frenado: elegir, marcar, «Ya lo hice», «Hazlo tú», entregar
    for (const frenado of ['[data-opcion', '[data-ya-hice', '[data-hazlo', '[data-entregar', '[data-paso']) expect(freno.match(/const LIBRE_DE_NIEBLA = '([^']*)'/)?.[1]).not.toContain(frenado);
    // Sin niebla, nada cambia; y lo que no se ve (un plegable cerrado) no detiene
    const nublado = leer('guiaLectura.ts').match(/export function nubladoEn\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(nublado).toContain('if (!activa()');
    expect(nublado).toContain('sinTerminar(b) && b.el.getClientRects().length > 0');
  });

  it('camina suave: entre dos cuadros cualquiera nunca salta, ni al cambiar de renglón, y llega justo a cada palabra', () => {
    let antes = lugarEn(cajas, renglones, -1, 22);
    let mayor = 0;
    for (let i = 1; i <= 4800; i++) {
      const pos = -1 + i / 400;
      const l = lugarEn(cajas, renglones, pos, 22);
      mayor = Math.max(mayor, Math.hypot(l.x - antes.x, l.y - antes.y));
      antes = l;
    }
    // Un renglón entero de vuelta mide 200 px: de a 1/400 de palabra, ningún tramo pasa de unos pocos píxeles
    expect(mayor).toBeLessThan(6);
    // En cada palabra, justo después de ella; antes del texto, a su izquierda; al cambiar de renglón, en el aire
    expect(lugarEn(cajas, renglones, 1, 22)).toEqual({ x: 91, y: 10, saltando: false });
    expect(lugarEn(cajas, renglones, -1, 22).x).toBeLessThan(0);
    const medio = 3 + SALTO / 2;
    expect(lugarEn(cajas, renglones, medio, 22).saltando).toBe(true);
    // En arco: a medio cambio va por encima de la recta entre los dos renglones
    expect(lugarEn(cajas, renglones, medio, 22).y).toBeLessThan((lugarEn(cajas, renglones, 3, 22).y + lugarEn(cajas, renglones, 4, 22).y) / 2);
    expect(lugarEn(cajas, renglones, 11, 22)).toEqual({ x: 191, y: 70, saltando: false });
  });

  it('el avance solo: de 1× a 5×, la misma velocidad que al arrastrar, y solo el bloque de ahora', () => {
    expect([...VELOCIDADES]).toEqual([1, 2, 3, 4, 5]);
    const guiaTs = leer('guiaLectura.ts');
    const avanzar = guiaTs.match(/function avanzar\(b: Bloque, dt: number\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    // Arrastrado o solo, la misma rapidez hacia adelante: la de la velocidad elegida
    expect(avanzar).toContain('const px = dir > 0 ? pxPorSegundo(velocidadAuto(), b.pxPalabra) :');
    expect(avanzar).not.toContain('b.auto');
    // Al terminar el bloque, el avance solo se detiene: el siguiente espera a que la persona oprima ▶ (nota de voz del titular)
    const llegar = guiaTs.match(/function llegar\(b: Bloque\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(llegar).toContain('if (fin) reproducir(false);');
    expect(llegar).not.toMatch(/setTimeout\(seguirLeyendo, fin/);
    // Su control va en la franja de arriba del enfoque, junto al tema y la letra, y en «¿Dónde quedamos?»
    const director = leer('director.ts');
    // (en sus grupos: el tema con la letra, la niebla con su ▶, la narración y el sonido; enfoque.test.ts)
    expect(director).toMatch(/tema: `\$\{botonTema\(\)\}<span class="tamanos-letra">[\s\S]*?niebla: controlAuto\('niebla'\),\n\s*narracion: controlAuto\('voz'\),/);
    expect(director).toContain('· dónde quedamos</h2>${opcionesDq()}</div>');    // Tomar al director (arrastrarlo, doble clic o el teclado) lo detiene; ▶ sigue desde el último bloque que se leyó
    const guia = leer('guiaLectura.ts');
    expect(guia.match(/\n\s*tomar\(\);/g)?.length).toBe(3);
    expect(guia).toContain('return lista[paraLeer(cajas, vista, u ? lista.indexOf(u) : -1)];');
  });

  it('▶ y el botón central toman el bloque por leer donde está la mirada, y nunca quedan encendidos sin caminar (notas de voz del titular nmvn1aw18tit, nmvn1bxiptit, nmvn1cztxtit y nmvn1pcastit)', () => {
    const vista = { arriba: 0, abajo: 800 };
    const b = (arriba: number, sinTerminar = true) => ({ arriba, abajo: arriba + 100, sinTerminar });
    // El último que se leyó, si se ve y le falta
    expect(paraLeer([b(100, false), b(300), b(500)], vista, 1)).toBe(1);
    // Si se ve y ya se terminó, el siguiente sin terminar, aunque esté más abajo (la cámara lleva hasta él)
    expect(paraLeer([b(100, false), b(300, false), b(1200)], vista, 1)).toBe(2);
    // Si no se ve (se leyó en otra parte de la ventana), el primero sin terminar que se ve: no uno lejos de la mirada
    expect(paraLeer([b(-2000), b(300, false), b(500)], vista, 0)).toBe(2);
    expect(paraLeer([b(-2000), b(300), b(500)], vista, -1)).toBe(1);
    expect(paraLeer([b(100, false)], vista, 0)).toBe(-1);
    // De arriba hacia abajo (nota de voz del titular nmvoj0kmetit): con niebla más arriba, el último que se leyó espera,
    // también si ya se terminó (en la captura, la línea del director al pie de la tarjeta, con el paso de arriba nublado)
    expect(paraLeer([b(100), b(300, false), b(500)], vista, 2)).toBe(0);
    expect(paraLeer([b(100), b(300, false), b(500, false), b(1200)], vista, 2)).toBe(0);
    // Lo de arriba que no se ve no lo saca de donde está la mirada
    expect(paraLeer([b(-2000), b(300), b(500)], vista, 2)).toBe(1);
    // Hasta dónde se leyó un bloque quieto sale de dónde está su director: un dibujo que no se pudo medir ya no lo deja
    // en -1 con el director al final (▶ no tenía a dónde caminar y quedaba encendido sin moverse)
    expect(puntoDe(11, 11)).toBe(11);
    expect(puntoDe(10.9999999, 11)).toBe(11);
    expect(puntoDe(4.5, 11)).toBe(4);
    expect(puntoDe(-1, 11)).toBe(-1);
    const guia = leer('guiaLectura.ts');
    expect(guia).toContain('if (!moviendo.has(b) && b.punto !== puntoDe(b.pos, b.palabras.length - 1)) fijar(b, false);');
    const seguir = guia.match(/function seguirLeyendo\(\): void \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(seguir).toContain('if (!b || !sinTerminar(b)) return reproducir(false);');
    // Un bloque que falla no detiene el camino de los demás
    expect(guia.match(/function latir\(t: number\) \{[\s\S]*?\n\}/)?.[0]).toContain('} catch {');
    // El botón central enciende o detiene el avance solo, con la niebla puesta, y toma el bloque como ▶
    const central = guia.match(/function conBotonCentral\(e: MouseEvent\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(central).toContain('const b = bloqueParaLeer(bloquesDe(caja));');
    expect(central).toContain('avanza: reproduciendo && enMarcha()');
  });

  it('un solo director a la vista, donde está la mirada (nota de voz del titular nmvn1aw18tit)', () => {
    const guia = leer('guiaLectura.ts');
    const mostrar = guia.match(/function mostrarActual\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(mostrar).toContain("for (const b of bloques.values()) b.guia.classList.toggle('gl-otro', b !== actual);");
    // Se elige de nuevo al desplazar, al repintar, al llegar, al encender o detener y al tocar una línea nublada
    expect(guia).toContain("document.addEventListener('scroll', pedirActual, { capture: true, passive: true });");
    expect(guia.match(/function escanear\(\) \{[\s\S]*?\n\}/)?.[0]).toContain('mostrarActual();');
    expect(guia.match(/export function llamarNiebla\([\s\S]*?\n\}/)?.[0]).toContain('mostrarActual();');
    // El que camina es el que se ve
    expect(guia.match(/function irA\([\s\S]*?\n\}/)?.[0]).toContain("b.guia.classList.remove('gl-otro');");
    expect(leer('guiaLectura.css')).toMatch(/\.gl-guia\.gl-otro \{\n\s*opacity: 0;\n\s*visibility: hidden;\n\s*pointer-events: none;/);
  });

  it('los mensajes del Studio no llevan niebla: solo lo que escribió el modelo (nota de voz del titular nmvn1rfv4tit)', () => {
    const fuera = leer('guiaLectura.ts').match(/const FUERA = \[[\s\S]*?\]\.join/)?.[0] ?? '';
    for (const clase of ['esperando', 'quedo-en', 'pide-decision', 'transcripcion', 'aviso', 'urgente-n']) expect(fuera).toContain(`.${clase}`);
    // El de la captura: la nota que espera al director
    expect(leer('director.ts')).toContain('<p class="esperando">Esperando al director. Hasta que lo lea, puedes corregirla o borrarla.</p>');
  });

  it('cada párrafo con clase del Studio dice si es de la interfaz o del director: ninguno nace sin decirlo (nota de voz del titular nmvoksx45tit)', () => {
    const fuera = leer('guiaLectura.ts').match(/const FUERA = \[[\s\S]*?\]\.join/)?.[0] ?? '';
    const enFuera = (c: string) => new RegExp(`(^|[\\s,'])p?\\.${c}(?=[\\s,']|$)`).test(fuera);
    const clases = [...new Set([...leer('director.ts').matchAll(/<p class="([a-z][\w-]*)/g)].map((m) => m[1]))];
    expect(clases.length).toBeGreaterThan(30);
    // Una clase nueva sin decir de quién es falla aquí: va en FUERA (interfaz) o en DEL_MODELO (lo que escribe el director)
    expect(clases.filter((c) => !enFuera(c) && !(DEL_MODELO as readonly string[]).includes(c))).toEqual([]);
    expect(DEL_MODELO.filter(enFuera)).toEqual([]);
    // El de la captura: «Puedes elegir una o varias», de las opciones que se suman
    expect(enFuera('pista-varias')).toBe(true);
    expect(leer('director.ts')).toContain('<p class="pista-varias">Puedes elegir una o varias: márcalas y oprime «Listo».</p>');
  });

  it('arriba de la ventana de lectura, la nube junto a su ▶, y el ▶ solo con la niebla puesta (nota de voz del titular nmvmyoo09tit)', () => {
    const guia = leer('guiaLectura.ts');
    const control = guia.match(/export function controlAuto\([^)]*\): string \{[\s\S]*?\n\}/)?.[0] ?? '';
    // La nube va primero, con el mismo data-niebla del atajo junto a la cara (director.ts la enciende y la pone al día)
    expect(control.indexOf('data-niebla aria-pressed')).toBeGreaterThan(-1);
    expect(control.indexOf('data-niebla aria-pressed')).toBeLessThan(control.indexOf('class="gl-auto"'));
    const css = leer('guiaLectura.css');
    // La nube, solo en la ventana de lectura; el ▶ y su velocidad, solo con la niebla puesta
    expect(css).toMatch(/\.gl-niebla \{\n\s*display: none;/);
    expect(css).toMatch(/html\.enfoque \.lector \.gl-niebla,\ndialog\.donde-quedamos \.gl-niebla \{\n\s*display: inline-flex;/);
    expect(css).toMatch(/\.gl-auto \{\n\s*display: none;/);
    expect(css).toMatch(/html\.niebla-lectura \.gl-auto \{\n\s*display: inline-flex;/);
    // El atajo junto a la cara se esconde fuera de la ventana de lectura; la nube de arriba ya está solo ahí
    const aplicar = leer('director.ts').match(/function aplicarEnfoque\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(aplicar).toContain("else b.setAttribute('aria-label', niebla ? 'Quitar la niebla de lectura' : 'Niebla de lectura');");
  });

  it('▶ empieza donde está la persona y sigue al último bloque aunque el Studio vuelva a dibujar la ventana (nota de voz del titular nmvmyusuotit)', () => {
    const vista = { arriba: 0, abajo: 800 };
    const b = (arriba: number, sinTerminar = true) => ({ arriba, abajo: arriba + 100, sinTerminar });
    // Sin un último bloque: el primero sin terminar que se ve, aunque arriba haya otros sin terminar fuera de la vista
    expect(bloqueParaEmpezar([b(-3000), b(-1500), b(200, false), b(400), b(900)], vista)).toBe(3);
    // Si ninguno se ve, el primero sin terminar que viene después; si tampoco, el primero sin terminar
    expect(bloqueParaEmpezar([b(-3000), b(100, false), b(1200), b(2000)], vista)).toBe(2);
    expect(bloqueParaEmpezar([b(-3000), b(-1500), b(100, false)], vista)).toBe(0);
    expect(bloqueParaEmpezar([b(100, false)], vista)).toBe(-1);
    const guia = leer('guiaLectura.ts');
    // El último se busca también por su huella: un repintado no lo pierde
    expect(guia).toContain('const b = huellaUltima ? lista.find((x) => x.huella === huellaUltima) : undefined;');
    expect(guia.match(/\n\s*marcarUltimo\(b\);/g)?.length).toBe(4);
    // Un bloque que caminaba solo y se quitó al repintar: lo caminado se guarda y el avance sigue en el bloque nuevo
    const soltar = guia.match(/function soltarBloque\(b: Bloque\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(soltar).toContain('if (moviendo.has(b) || b.auto) guardar(b);');
    expect(soltar).toContain('if (b.auto) sinTerminarAlRepintar = true;');
    expect(guia.match(/function escanear\(\) \{[\s\S]*?\n\}/)?.[0]).toContain('if (reproduciendo) requestAnimationFrame(() => requestAnimationFrame(() => !enMarcha() && seguirLeyendo()));');
    // Encendido sin nadie caminando se lee como detenido: el clic en ▶ lo enciende, no lo apaga
    expect(guia).toContain("if ((e.target as HTMLElement).closest('[data-niebla-auto]')) reproducir(!(reproduciendo && enMarcha()));");
  });

  it('en cada nota, lo que dijo la persona va sin niebla y lo que respondió el director, con ella; en un documento, lo dicho se pliega a un renglón (nota de voz del titular nmvmytjd0tit)', () => {
    const guia = leer('guiaLectura.ts');
    // Lo que respondió llega con formato (pedido pd_graficos_svg): se lee en sus párrafos y sus puntos, sin un selector
    // aparte que lo leería dos veces
    expect(guia).toMatch(/const SELECTOR = 'p, li, [^']*';/);
    expect(guia).not.toMatch(/const SELECTOR = '[^']*texto-resp/);
    expect(guia).toMatch(/const FUERA = \[\n[^\n]*\.gl-sin'/);
    const director = leer('director.ts');
    const tarjeta = director.match(/function tarjetaNota\([^)]*\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(tarjeta).toContain('<div class="texto-resp">${limpio(marked.parse(r.texto, { async: false }) as string)}</div>');
    expect(tarjeta).toContain('`<div class="dicho-nota gl-sin">${dicho}</div>`');
    expect(tarjeta).toContain("const enDoc = aqui?.vista === 'documentos';");
    expect(tarjeta).toContain('<div class="dicho-nota gl-sin plegable-dicho${plegado ? \' plegado\' : \'\'}" data-dicho=');
    expect(tarjeta).toContain('<li class="nota-d${r ? \' respondida\' : \'\'}" data-guia="no">');
    // Plegado, se ve solo su primer renglón; un clic lo abre, y un repintado no lo vuelve a plegar
    const css = leer('director.css');
    expect(css).toContain('.dicho-nota.plegado > :not(:first-child), .dicho-nota.plegado audio, .dicho-nota.plegado .lista-adjuntos { display: none; }');
    expect(css).toMatch(/\.dicho-nota\.plegado > p:first-child[^{]*\{[^}]*-webkit-line-clamp: 1;/);
    expect(director).toContain('if (abierto) dichosAbiertos.add(el.dataset.dicho!);');
    // Sobre la respuesta del director (oscura), las nubes de noche
    expect(leer('guiaLectura.css')).toMatch(/html\.oscuro,\n\.respuesta-dir \{\n\s*--gl-nube-alta/);
  });

  it('la cámara mantiene centrado el renglón del director, lenta y suave: arranca y llega despacio, y nunca se pasa (nota de voz del titular nmvmy9nhjtit)', () => {
    // Un cambio de renglón (28 px), a 60 cuadros por segundo
    const seguirA = (objetivo: number) => {
      let p = { y: 0, v: 0 };
      let mayor = 0;
      let primero = 0;
      let ms = 0;
      let alcanza95 = 0;
      while (ms < 5000) {
        const antes = p.y;
        p = pasoCamara(p.y, p.v, objetivo, 1000 / 60);
        ms += 1000 / 60;
        if (!primero) primero = p.y - antes;
        mayor = Math.max(mayor, Math.abs(p.y - antes));
        expect(p.y).toBeLessThanOrEqual(objetivo);
        if (!alcanza95 && p.y >= objetivo * 0.95) alcanza95 = ms;
      }
      return { mayor, primero, alcanza95, final: p.y };
    };
    const renglon = seguirA(28);
    // Arranca despacio (menos de medio píxel en el primer cuadro), nunca da un tirón y se acomoda en más de un segundo
    expect(renglon.primero).toBeLessThan(0.5);
    expect(renglon.mayor).toBeLessThan(1);
    expect(renglon.alcanza95).toBeGreaterThan(1000);
    expect(renglon.alcanza95).toBeLessThan(2500);
    expect(renglon.final).toBeCloseTo(28, 1);
    // Aunque el director quede lejos, la cámara no pasa de su rapidez máxima
    expect(seguirA(3000).mayor).toBeLessThanOrEqual(CAMARA_MAX / 60 + 1e-9);
    // Un cuadro largo no la hace pasarse del renglón
    expect(pasoCamara(0, 900, 10, 64)).toEqual({ y: 10, v: 0 });
    const guia = leer('guiaLectura.ts');
    // La sigue lo que mueve al director solo (el avance solo, la rueda mientras avanza, el teclado), y ya no hay saltos
    // de desplazamiento; arrastrado, no (la cámara se mira en la prueba del arrastre)
    expect(guia.match(/function irA\(b: Bloque, destino: number, conCamara = true\) \{[\s\S]*?\n\}/)?.[0]).toContain('if (conCamara) seguir(b);');
    expect(guia).not.toContain("behavior: 'smooth'");
    expect(guia).not.toContain('scrollBy(');
  });

  it('arrastrado va a donde lo lleve la persona, sin tope ni cámara, y al soltarlo la niebla se destapa o se tapa muy rápido hasta ahí (nota de voz del titular nmvmzeviqtit)', () => {
    // Muy rápido: un tramo largo, en lo que dura la reubicación; uno corto, en menos, y nunca más lento que su mínimo
    expect(MS_REUBICAR).toBeLessThanOrEqual(500);
    expect(30 / rapidezReubicar(0, 30)).toBeCloseTo(MS_REUBICAR / 1000);
    expect(rapidezReubicar(10, -1)).toBeCloseTo(11 / (MS_REUBICAR / 1000));
    expect(rapidezReubicar(0, 1)).toBe(RAPIDEZ_MIN);
    expect(1 / rapidezReubicar(0, 1)).toBeLessThan(MS_REUBICAR / 1000);
    const guia = leer('guiaLectura.ts');
    const tomar = guia.match(/guia\.addEventListener\('pointerdown', \(e\) => \{[\s\S]*?\n {2}\}\);/)?.[0] ?? '';
    // Tomarlo detiene el avance solo y la cámara lo suelta; mientras lo tiene, el director va a la marca y la niebla espera
    expect(tomar).toContain('tomar();');
    expect(tomar).toContain('if (camara.b === b) camara.b = null;');
    expect(tomar).toContain('irA(b, b.pos, false);');
    expect(tomar).toContain('b.marca = posHacia(cajas, b.renglones, px - o.x - dx, py - o.y - dy, LADO);');
    expect(tomar).not.toMatch(/irA\(b, posHacia/);
    // El puntero marca el texto como está ahora: si la persona desplaza la ventana con el director tomado, se vuelve a medir
    expect(tomar).toContain('const o = base(b);');
    expect(tomar).toContain("document.addEventListener('scroll', marcar, true);");
    // Al soltarlo, se reubica muy rápido, sin cámara, y el avance solo no se vuelve a encender
    expect(tomar).toContain('reubicar(b, a, false);');
    expect(tomar).not.toMatch(/reproducir\(true\)|seguirLeyendo/);
    // El director se dibuja en su marca, y la niebla en su avance; al llegar, la marca se suelta
    expect(guia).toContain('const f = b.marca === null ? l : lugarEn(cajas, b.renglones, b.marca, LADO);');
    const llegar = guia.match(/function llegar\(b: Bloque\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(llegar).toContain("if (!b.guia.classList.contains('gl-arrastrando')) b.marca = null;");
    expect(llegar).toContain('b.veloz = 0;');
    // Reubicarse no lleva el ritmo de lectura ni el segundo del cambio de renglón
    const avanzar = guia.match(/function avanzar\(b: Bloque, dt: number\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(avanzar.indexOf('if (b.veloz) {')).toBeGreaterThan(-1);
    expect(avanzar.indexOf('if (b.veloz) {')).toBeLessThan(avanzar.indexOf('ritmo('));
  });

  it('con el ratón: la rueda lo adelanta o lo regresa solo mientras avanza solo, y el botón central enciende o detiene el avance solo (notas de voz del titular nmvmyb878tit y nmvmzgq7ntit)', () => {
    expect(muescas(250)).toEqual({ pasos: 2, resto: 50 });
    expect(muescas(-130)).toEqual({ pasos: -1, resto: -30 });
    expect(muescas(40).pasos).toBe(0);
    expect(MUESCA).toBe(100);
    expect(PALABRAS_POR_MUESCA).toBe(3);
    // La rueda mide en píxeles, en renglones o en páginas
    expect(pxDeRueda(100, 0, 800)).toBe(100);
    expect(pxDeRueda(3, 1, 800)).toBe(99);
    expect(pxDeRueda(1, 2, 800)).toBe(800);
    // Cuenta desde donde va el director o, si ya se reubica por otra muesca, desde donde va a quedar; si en ese sentido
    // no queda nada en el bloque, nada (la rueda desplaza la ventana)
    expect(desdeRueda({ pos: 4.5, destino: 11, veloz: 0, ultima: 11 }, 1)).toBe(4.5);
    expect(desdeRueda({ pos: 4.5, destino: 7, veloz: 20, ultima: 11 }, 1)).toBe(7);
    expect(desdeRueda({ pos: 11, destino: 11, veloz: 0, ultima: 11 }, 1)).toBeNull();
    expect(desdeRueda({ pos: -1, destino: 11, veloz: 0, ultima: 11 }, -1)).toBeNull();
    expect(desdeRueda({ pos: -1, destino: 11, veloz: 0, ultima: 11 }, 1)).toBe(-1);
    const guia = leer('guiaLectura.ts');
    expect(guia).toContain("document.addEventListener('wheel', conRueda, { passive: false });");
    const rueda = guia.match(/function conRueda\(e: WheelEvent\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    // Sin el avance solo, la rueda es la de siempre: se va antes de tomarla
    expect(rueda).toContain('if (!activa() || !reproduciendo ||');
    // Esté donde esté el ratón, no solo sobre el párrafo (nota de voz del titular nmvofzas1tit); otra ventana encima, no
    expect(rueda).not.toContain('caja.contains(t)');
    expect(rueda).toContain('const caja = ventanaActiva();');
    expect(rueda.indexOf('if (!b || desde === null) return void (rueda = 0);')).toBeLessThan(rueda.indexOf('e.preventDefault();'));
    // Con el avance solo, mueve el bloque que avanza, muy rápido y con cámara, y no lo detiene: al llegar, retoma
    expect(rueda).toContain('const b = bloquesDe(caja).find((x) => x.auto);');
    expect(rueda).toContain('reubicar(b, (sentido > 0 ? Math.floor(desde + EPS) : Math.ceil(desde - EPS)) + pasos * PALABRAS_POR_MUESCA, true);');
    expect(rueda).not.toContain('reproducir(false)');
    expect(guia.match(/function llegar\(b: Bloque\) \{[\s\S]*?\n\}/)?.[0]).toContain('else setTimeout(seguirLeyendo, 0);');
    // El botón central, sin el desplazamiento automático del navegador y nunca sobre un enlace
    const central = guia.match(/function conBotonCentral\(e: MouseEvent\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(central).toContain("closest('a[href], textarea, select, input, [contenteditable]')");
    expect(central).toContain('e.preventDefault();');
    expect(central).toContain("if (e.type !== 'mousedown') return;");
    expect(guia).toContain("document.addEventListener('mousedown', conBotonCentral);");
  });

  it('el botón central, sin nada más por destapar en un documento, marca «Entendido» (nota de voz del titular nmvodewtctit)', () => {
    // Detiene a quien camina; si no, avanza mientras quede algo por destapar
    expect(queHaceCentral({ avanza: true, porDestapar: true, entendido: true })).toBe('detener');
    expect(queHaceCentral({ avanza: false, porDestapar: true, entendido: true })).toBe('avanzar');
    // Ya no queda nada por destapar: el «Entendido» de la idea de ahora, si lo hay
    expect(queHaceCentral({ avanza: false, porDestapar: false, entendido: true })).toBe('entendido');
    expect(queHaceCentral({ avanza: false, porDestapar: false, entendido: false })).toBe('nada');
    const guia = leer('guiaLectura.ts');
    // Solo en un documento (no en «¿Dónde quedamos?» ni en la misión), y la idea de ahora, aún sin marcar
    expect(guia).toContain("const entendidoDe = (caja: HTMLElement) => (caja.matches('.lector') ? caja.querySelector<HTMLButtonElement>('.trozo.actual .entendido:not(.hecho)') : null);");
    // Con el mismo botón: su seguro vale igual que con el clic
    const central = guia.match(/function conBotonCentral\(e: MouseEvent\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(central).toContain("if (hace === 'entendido') boton!.click();");
    // Solo con la niebla puesta, como el resto del botón central
    expect(central).toContain('const caja = e.button === 1 && activa() ? ventanaActiva() : null;');
    // Y el ▶ lo dice
    expect(guia).toContain('En un documento, cuando ya no queda nada por destapar, el botón central marca «Entendido».');
  });

  it('solo avanza la ventana de arriba: nada de lo que está detrás del enfoque o de un diálogo se destapa ni se desplaza (nota de voz del titular nmvol5ahftit)', () => {
    const guia = leer('guiaLectura.ts');
    // Con otro diálogo abierto encima de la ventana de lectura, ▶, la rueda y el botón central no la mueven
    const activa = guia.match(/const ventanaActiva = \(\) => \{[\s\S]*?\n\};/)?.[0] ?? '';
    expect(activa).toContain("![...document.querySelectorAll('dialog[open]')].some((d) => !d.contains(caja))");
    for (const f of ['function seguirLeyendo(): void', 'function conRueda(e: WheelEvent)', 'function conBotonCentral(e: MouseEvent)']) {
      const cuerpo = guia.slice(guia.indexOf(f), guia.indexOf('\n}', guia.indexOf(f)));
      expect(cuerpo).toContain('ventanaActiva()');
      expect(cuerpo).not.toMatch(/[^.\w]ventana\(\)/);
    }
    // Un bloque escondido dentro de la ventana (plegado, con hidden) no se toma, aunque se haya medido antes
    expect(guia).toContain('.filter((b): b is Bloque => !!b && seMuestra(b.el) && !!medir(b))');
    // La cámara desplaza la ventana o algo dentro de ella, nunca la página de detrás del velo
    const contenedor = guia.match(/function contenedorDe\(el: HTMLElement\): HTMLElement \| null \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(contenedor).toContain('const tope = el.closest<HTMLElement>(VENTANAS);');
    expect(contenedor).toContain('if (p === tope) break;');
    const encuadre = guia.match(/function encuadre\(b: Bloque\)[\s\S]*?\n\}/)?.[0] ?? '';
    expect(encuadre).not.toContain('scrollingElement');
    expect(encuadre).toContain('const el = contenedorDe(b.el);\n  if (!el) return null;');
  });

  it('con la niebla, la idea nueva se carga desde arriba, también la primera de la parte que se abre (nota de voz del titular nmvoby2uvtit)', () => {
    const director = leer('director.ts');
    const centrar = director.match(/function centrarIdea\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    // Sin avance, con la niebla: arriba y de una vez, nunca a media ventana
    expect(centrar.indexOf('} else if (ventana && nieblaPuesta()) {')).toBeGreaterThan(centrar.indexOf('if (ventana && va) {'));
    expect(centrar).toContain("idea.scrollIntoView({ block: 'start', behavior: 'auto' });");
    // Al abrirse la parte siguiente, el desplazamiento de la anterior no se queda: se lleva a su primera idea
    const parte = director.match(/async function marcarParte\(titulo: string\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    const abre = parte.indexOf("decir('¡Bien! Una parte menos: se abrió la siguiente.', 'feliz');");
    expect(abre).toBeGreaterThan(-1);
    expect(parte.indexOf('centrarIdea();', abre)).toBeGreaterThan(abre);
    expect(parte.indexOf('centrarIdea();', abre)).toBeLessThan(parte.indexOf('await guardado;', abre));
  });

  it('carga donde se va leyendo: el primer bloque sin terminar, en su avance si lo tenía, o desde el principio', () => {
    expect(dondeSeguir([{ punto: 9, ultima: 9 }, { punto: 4, ultima: 12 }, { punto: -1, ultima: 8 }])).toEqual({ indice: 1, conAvance: true });
    expect(dondeSeguir([{ punto: 9, ultima: 9 }, { punto: -1, ultima: 8 }, { punto: 3, ultima: 8 }])).toEqual({ indice: 1, conAvance: false });
    expect(dondeSeguir([{ punto: 9, ultima: 9 }])).toBeNull();
    // Y una idea más alta que la ventana no se centra (empezaría a medio párrafo): va arriba
    const centrar = leer('director.ts').match(/function centrarIdea\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(centrar).toContain('const va = dondeVa(idea);');
    expect(centrar).toContain("idea.offsetHeight > ventana.clientHeight * 0.6 ? 'start' : 'center'");
  });

  it('lo que corre en vivo no lleva niebla, aunque entre en «¿Dónde quedamos?» para quedar encima (nota de voz del titular nmvquww8htit)', () => {
    const fuera = leer('guiaLectura.ts').match(/const FUERA = \[[\s\S]*?\]\.join/)?.[0] ?? '';
    const encima = leer('encima.ts').match(/SIEMPRE_ENCIMA = \[([^\]]*)\]/)?.[1] ?? '';
    const ids = [...encima.matchAll(/'([\w-]+)'/g)].map((m) => m[1]);
    // Todo lo que encima.ts mete en el diálogo de arriba (también lo que se le sume después) queda fuera de la niebla
    expect(ids).toContain('progreso-director');
    expect(ids.filter((id) => !new RegExp(`#${id}(?=[\\s,']|$)`).test(fuera))).toEqual([]);
    // Y lo último que hizo una revisión, del registro, donde se muestre
    expect(fuera).toContain('.pasos-progreso');
    expect(leer('director.ts')).toContain('<ol class="pasos-progreso">');
  });

  it('el director flotante y sus atajos quedan siempre encima, también de un diálogo como «¿Dónde quedamos?»', () => {
    const encima = leer('encima.ts');
    expect(encima).toContain("export const SIEMPRE_ENCIMA = ['segundo-plano', 'progreso-director', 'atajos-director', 'director-flotante'] as const;");
    expect(encima).toContain('const arriba = modalDeArriba(null, document.querySelectorAll(\'dialog\'), abiertos);');
    expect(leer('director.ts')).toContain("import './encima';");
    const html = leer('../../index.html');
    for (const id of ['segundo-plano', 'progreso-director', 'atajos-director']) expect(html).toContain(`id="${id}"`);
    expect(leer('equipo.ts')).toContain("flotante.id = 'director-flotante';");
  });

  it('la revisión en marcha va en su atajo, discreta, y no en una pastilla que tape lo que se lee (nota de voz del titular nmvoottaitit)', () => {
    const director = leer('director.ts');
    const segundo = director.match(/function pintarSegundoPlano\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    // La pastilla ya no dice que el director revisa ni lo negado: eso lo dicen la cabecera y el atajo
    expect(segundo).not.toContain("r.estado === 'en_curso' ? [`<button type=\"button\" class=\"sp-linea");
    expect(segundo).not.toContain('Se le negó un permiso');
    // El atajo late, se pone rojo sin actividad y lleva lo negado como cifra; su nombre dice cómo va y cuánto lleva
    expect(segundo).toContain("info.classList.toggle('trabajando', r.estado === 'en_curso' && !parada);");
    expect(segundo).toContain("info.dataset.cifra = negados.length ? String(negados.length) : '';");
    const rotulo = director.match(/function rotularProgreso\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(rotulo).toContain("parada ? `Sin actividad desde hace ${parada} min` : 'El director está revisando'");
    expect(rotulo).toContain("n === 1 ? 'se le negó un permiso'");
    // Los tokens siguen subiendo con su cuenta, en el atajo y en lo que va haciendo
    expect(director.match(/function contarTokens\([\s\S]*?\n\}/)?.[0]).toContain('rotularProgreso();');
    expect(director).toContain('<span class="tokens-vivos" data-tokens-vivos');
    const css = leer('estilos.css');
    expect(css).toContain('.atajo.trabajando { animation: atajo-late');
    expect(css).toMatch(/\.sp-linea \{[^}]*font-size: 11px;/);
  });

  it('el personaje es una miniatura del director, con una cara quieto, otra caminando y otra al despejar el bloque, que suena', () => {
    const guia = leer('guiaLectura.ts');
    // La misma cara del director flotante (equipo.ts la usa de cara.ts)
    expect(guia).toContain("import { caraSVG } from './cara';");
    expect(leer('equipo.ts')).toContain("import { caraSVG } from './cara';");
    expect(guia).toContain("ponerCara(b, 'feliz')");
    expect(guia).toContain("ponerCara(b, 'riendo')");
    expect(guia).toContain("ponerCara(b, 'enamorado')");
    expect(guia).toContain("sonar('niebla')");
    const css = leer('guiaLectura.css');
    expect(css).toMatch(/::highlight\(niebla-lectura\)/);
    expect(css).toContain('@keyframes gl-salto');
  });

  it('con el avance solo, el ratón quieto dos segundos se esconde con sus textos de ayuda, hasta que se mueve (nota de voz del titular nmvn13enetit)', () => {
    expect(RATON_QUIETO_MS).toBe(2000);
    // El navegador repite el evento en el mismo lugar cuando el texto se desplaza debajo: eso no es moverse
    expect(seMovio(null, { x: 10, y: 20 })).toBe(true);
    expect(seMovio({ x: 10, y: 20 }, { x: 10, y: 20 })).toBe(false);
    expect(seMovio({ x: 10, y: 20 }, { x: 11, y: 20 })).toBe(true);
    const guia = leer('guiaLectura.ts');
    // Encender o detener el avance solo (por cualquier camino: ▶, el botón central, el fin del bloque, apagar la niebla) pone al día el reloj
    const reproducir = guia.match(/function reproducir\(si: boolean\): void \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(reproducir).toContain('vigilarRaton();');
    expect(guia.match(/^\s+reproduciendo = /gm)).toHaveLength(1);
    const vigilar = guia.match(/function vigilarRaton\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(vigilar).toContain('if (!reproduciendo) return mostrarRaton();');
    expect(vigilar).toContain('setTimeout(esconderRaton, RATON_QUIETO_MS)');
    // Se esconde solo con el avance solo, y se lleva los textos de ayuda (también los que se dibujen mientras tanto)
    const esconder = guia.match(/function esconderRaton\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(esconder).toContain('!reproduciendo');
    expect(esconder).toContain('guardarAyudas(document.body);');
    expect(esconder).toContain("attributeFilter: ['title']");
    // Al volver, cada texto de ayuda vuelve a su lugar
    const mostrar = guia.match(/function mostrarRaton\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(mostrar).toContain('vigiaAyudas?.disconnect();');
    expect(mostrar).toContain("x.setAttribute('title', x.getAttribute('data-gl-titulo')!)");
    expect(guia).toContain("document.addEventListener('pointermove', conRaton");
    expect(guia).toContain("document.addEventListener('pointerdown', conRaton");
    expect(leer('guiaLectura.css')).toMatch(/body\.gl-sin-raton \* \{\s*cursor: none !important;/);
  });
});

describe('leer en voz alta, como opción de la niebla (notas de voz del titular nmvoi1e0etit y nmvokue4itit, 25 de octubre de 2026)', () => {
  it('lee solo con las voces de Kokoro: ni las del navegador (las de Windows) ni las de Piper (nota de voz del titular nmvpdu9zqtit, 26 de octubre de 2026)', () => {
    const guia = leer('guiaLectura.ts');
    // Ni una línea de la síntesis del navegador, ni de sus voces, ni de las de Piper
    expect(guia).not.toMatch(/speechSynthesis|SpeechSynthesis/i);
    expect(guia).not.toMatch(/piper/i);
    for (const viejo of ['sintesis()', 'vozDelComputador', 'vocesParaLeer', 'vocesListas', 'idDeVoz', 'hayVoz', 'pasoSinVoz', 'errorDeVoz(', 'vocesDeLectura', 'PALABRAS_SEG_VOZ', 'palabraDelCaracter']) {
      expect(guia).not.toContain(viejo);
    }
    // Lo que se lee y lo que se oye en «Sonidos» sale del mismo lugar: la voz de Kokoro del idioma
    expect(guia).toContain('return vozNaturalDe(idiomaDeLectura(), id, naturales ?? null);');
    // La elección la usan el avance, el aviso al encenderla y el botón; «Sonidos» la ofrece con ▶ para oírla
    const panel = leer('panelSonidos.ts');
    expect(panel).toContain('data-ps="voz"');
    expect(panel).toContain("if (t.closest('[data-ps-oir-voz]')) return oirVoz(vozElegida());");
    expect(panel).toContain('elegirVoz(c.value || null);');
    expect(panel.match(/function contenido\(\): string \{[\s\S]*?\n\}/)?.[0]).toContain('grupoVoz()');
  });

  it('«Sonidos» ofrece solo las voces de Kokoro; sin ninguna instalada, dice cómo instalarlas en vez de un selector vacío', () => {
    const panel = leer('panelSonidos.ts');
    expect(panel).not.toMatch(/piper|speechSynthesis|vocesDeLectura/i);
    expect(panel).not.toContain('Del navegador');
    expect(panel).not.toContain('Naturales, en tu computador');
    expect(panel).not.toContain('aún no están instaladas');
    // Con voces: «Automática» y las de Kokoro; sin ninguna, el mismo aviso que el altavoz, sin selector
    const grupo = panel.match(/function grupoVoz\(\): string \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(grupo).toContain("if (!naturales.length) return `<div class=\"ps-grupo\">${titulo}<p class=\"ps-nota\">${esc(sinVozAhora())}</p></div>`;");
    expect(grupo.indexOf('if (!naturales.length)')).toBeLessThan(grupo.indexOf('<select data-ps="voz"'));
    expect(grupo).toContain('${naturales.map(opcion).join(\'\')}');
    expect(grupo).toContain('Automática (');
    expect(panel).toContain('void vocesNaturalesDeLectura().then((n) => {');
  });

  it('la rapidez de la voz sigue a la velocidad del director, de 1× a 5×', () => {
    expect(VELOCIDADES.map(ritmoDeVoz)).toEqual([0.8, 1, 1.2, 1.45, 1.7]);
    expect(ritmoDeVoz(9)).toBe(1.7);
    expect(ritmoDeVoz(0)).toBe(0.8);
  });

  it('va entre los controles de la niebla, el avance la usa, y callar la detiene donde se detiene el avance', () => {
    const guia = leer('guiaLectura.ts');
    // Un botón más en el grupo del avance solo: solo existe con la niebla puesta (.gl-auto)
    // (junto al ▶ en «¿Dónde quedamos?»; en la franja del enfoque, solo, en su grupo de narración)
    const control = guia.match(/export function controlAuto\(parte: 'todo' \| 'niebla' \| 'voz' = 'todo'\): string \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(control).toContain("${avance}${parte === 'todo' ? botonVoz() : ''}</span></span>`;");
    expect(control).toContain("if (parte === 'voz') return `<span class=\"gl-control\"><span class=\"gl-auto\" role=\"group\" aria-label=\"Lectura en voz alta de la niebla de lectura\">${botonVoz()}</span></span>`;");
    expect(guia).toContain('data-niebla-voz');
    // Con la voz encendida, ▶ lee en voz alta; sin voz de Kokoro, camina como siempre (y lo dice)
    expect(guia.match(/function seguirLeyendo\(\): void \{[\s\S]*?\n\}/)?.[0]).toContain('if (!(vozPuesta() && hablar(b))) irA(b, b.palabras.length - 1);');
    // Mientras la voz lee, el bloque no termina en cada palabra: espera a que la voz calle
    const llegar = guia.match(/function llegar\(b: Bloque\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(llegar.indexOf('if (voz?.b === b) return;')).toBeGreaterThan(llegar.indexOf('guardar(b);'));
    expect(llegar.indexOf('if (voz?.b === b) return;')).toBeLessThan(llegar.indexOf('if (!b.auto) return void mostrarActual();'));
    // Detener el avance (▶, el botón central, tomar al director) la calla; la rueda la calla y el avance la retoma
    expect(guia.match(/function reproducir\(si: boolean\): void \{[\s\S]*?\n\}/)?.[0]).toContain('if (!si) callar();');
    expect(guia.match(/function conRueda\(e: WheelEvent\) \{[\s\S]*?\n\}/)?.[0]).toContain('if (voz?.b === b) callar();');
    // Solo la voz de Kokoro del idioma, a la velocidad del director, sobre la duración real del audio
    const hablar = guia.match(/function hablar\(b: Bloque\): boolean \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(hablar).toContain('const natural = naturalActual();');
    expect(hablar).toContain('if (natural) return hablarNatural(b, natural);');
    expect(guia.match(/function hablarNatural\([\s\S]*?\n\}\n/)?.[0]).toContain('audio.playbackRate = ritmoDeVoz(velocidadAuto());');
    // Va dentro de los controles de la niebla, que el freno de la niebla deja libres
    expect(leer('director.ts')).toContain('.gl-control');
  });

  it('nunca falla en silencio: sin Kokoro, dice que no está instalado y cómo instalarlo, en el altavoz y en «Oír» (nota de voz del titular nmvomwyidtit)', () => {
    const guia = leer('guiaLectura.ts');
    // ▶ sin voz de Kokoro: el aviso (una vez por cada ▶) con su botón; el director camina a su ritmo, sin otra voz
    const hablar = guia.match(/function hablar\(b: Bloque\): boolean \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(hablar).toContain("avisar(sinVozAhora(true), false, { etiqueta: 'Comprobar de nuevo', hacer: () => void comprobarVoz(true) });");
    expect(hablar.trimEnd().endsWith('  return false;\n}')).toBe(true);
    expect(guia).toContain('const palabraPorLeer = (b: Bloque) => Math.max(0, Math.floor(b.pos + EPS) + 1);');
    // «Oír» en «Sonidos» sin voz de Kokoro: lo mismo, nunca otra voz ni silencio
    expect(guia.match(/export function oirVoz\([\s\S]*?\n\}/)?.[0]).toContain('else avisar(sinVozAhora());');
    // Encender la voz sin Kokoro: queda apagada y el aviso trae su botón, que vuelve a mirar sin fiarse de la memoria
    const comprobar = guia.match(/async function comprobarVoz\(fresco = false\): Promise<void> \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(comprobar).toContain('await vocesNaturales(fresco);');
    expect(comprobar).toContain("avisar(sinVozAhora(true), false, { etiqueta: 'Comprobar de nuevo', hacer: () => void comprobarVoz(true) });");
    expect(comprobar.indexOf('ponerVoz(false);')).toBeLessThan(comprobar.indexOf('avisar(sinVozAhora(true)'));
    // Y el botón del altavoz lo dice al pasar el ratón cuando ya sabe que no hay
    expect(guia).toContain("naturales && !naturalActual() ? 'Leer en voz alta: las voces de Kokoro no están instaladas en este computador (al oprimir, te digo cómo instalarlas)'");
  });

  it('el aviso de que no hay voz sale del servidor: con su motivo y su orden de instalar, o la de siempre si no respondió', async () => {
    const eventos: { texto: string; bien: boolean }[] = [];
    vi.stubGlobal('document', { documentElement: { lang: 'es' } });
    vi.stubGlobal('window', { dispatchEvent: (e: CustomEvent) => void eventos.push(e.detail) });
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' });
    const servidor = (cuerpo: unknown) => vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => cuerpo }));
    try {
      // El servidor dice que Kokoro no está instalado: ese es el aviso, con su orden y con que el director sigue a su ritmo
      const motivo = 'Las voces de Kokoro no están instaladas en este computador (faltan los archivos del modelo en la carpeta de voces). Se instalan, desde la carpeta del Studio, con: wsl -d Ubuntu -- bash tools/entorno/instalar_voces.sh';
      servidor({ voces: [], motivo });
      expect(await vocesNaturales(true)).toEqual([]);
      expect(await vocesNaturalesDeLectura()).toEqual([]);
      expect(sinVozAhora()).toBe(`${motivo} Mientras tanto, el director sigue sin voz, a su ritmo.`);
      expect(sinVozAhora(true)).toContain('Cuando termine de instalarse, oprime «Comprobar de nuevo».');
      // «Oír» sin Kokoro no suena ni calla: avisa con ese texto
      oirVoz(null);
      expect(eventos.at(-1)).toMatchObject({ texto: sinVozAhora() });
      expect(eventos.at(-1)?.texto).toContain('bash tools/entorno/instalar_voces.sh');
      expect(eventos.at(-1)?.bien).toBeFalsy();

      // Un servidor que no dice por qué: la orden de siempre, la de Windows (dentro de WSL) o la de los demás sistemas
      servidor({ voces: [] });
      await vocesNaturales(true);
      expect(sinVozAhora()).toContain('Las voces de Kokoro no están instaladas en este computador. Se instalan, desde la carpeta del Studio, con: wsl -d Ubuntu -- bash tools/entorno/instalar_voces.sh');
      vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' });
      expect(sinVozAhora()).toContain('con: bash tools/entorno/instalar_voces.sh');
      expect(sinVozAhora()).not.toContain('wsl');

      // El Studio no respondió: lo dice, sin inventar que Kokoro falta
      vi.stubGlobal('fetch', async () => {
        throw new Error('sin red');
      });
      await vocesNaturales(true);
      expect(sinVozAhora()).toContain('No pude preguntarle al Studio qué voces de Kokoro hay.');

      // Con Kokoro instalado solo para inglés y el texto en español, lo dice y no pide instalar lo que ya está
      servidor({ voces: [{ id: 'kokoro:af_heart', nombre: 'Heart (Kokoro)', idioma: 'en' }] });
      await vocesNaturales(true);
      expect(await vocesNaturalesDeLectura()).toEqual([]);
      expect(sinVozAhora()).toBe('No encuentro una voz de Kokoro en español instalada en este computador, así que el director sigue sin voz, a su ritmo.');

      // Y con las de español, «Sonidos» las ofrece: solo las de Kokoro del idioma (una de Piper que llegara no cuenta)
      servidor({
        voces: [
          { id: 'kokoro:em_santa', nombre: 'Santa (Kokoro)', idioma: 'es' },
          { id: 'piper:es_MX-claude-high', nombre: 'Claude (Piper)', idioma: 'es' },
          { id: 'kokoro:af_heart', nombre: 'Heart (Kokoro)', idioma: 'en' },
        ],
      });
      await vocesNaturales(true);
      expect(await vocesNaturalesDeLectura()).toEqual([{ id: 'kokoro:em_santa', nombre: 'Santa (Kokoro)', idioma: 'es' }]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('si la voz falla, la apaga, lo dice y el director sigue a su ritmo; callarla no es una falla', () => {
    const guia = leer('guiaLectura.ts');
    const natural = guia.match(/function hablarNatural\([\s\S]*?\n\}\n/)?.[0] ?? '';
    expect(natural).toContain("audio.onerror = () => fallar(errorDeVozNatural('el navegador no pudo reproducir el audio'));");
    expect(natural).toContain('.catch((e) => fallar(errorDeVozNatural(e instanceof Error ? e.message : String(e))));');
    expect(natural).toContain('ponerVoz(false);');
    // Al encenderla, dice con qué voz lee
    expect(guia).toContain('Voz encendida: lee «${natural.nombre}», una voz de Kokoro de este computador.');
    // El Studio lo muestra, también encima de «¿Dónde quedamos?», que es un diálogo
    const director = leer('director.ts');
    expect(director).toContain("window.addEventListener('estudio:aviso'");
    expect(director.match(/function avisar\([\s\S]*?\n\}/)?.[0]).toContain('alFrente(e);');
    expect(director.match(/function alFrente\(e: HTMLElement\) \{[\s\S]*?\n\}/)?.[0]).toContain("document.querySelector('dialog[open]')");
  });

  it('al grabar, la lectura sola y la voz se detienen, y siguen solo con ▶ (nota de voz del titular nmvoooca4tit)', () => {
    // La grabadora lo avisa antes de pedir el micrófono, también al seguir grabando un fragmento más
    const grabadora = leer('grabadora.ts');
    expect(grabadora).toContain("export const EMPIEZA_GRABACION = 'estudio:grabando';");
    const grabar = grabadora.match(/private async grabar\(\) \{[\s\S]*?\n {2}\}/)?.[0] ?? '';
    expect(grabar.indexOf('window.dispatchEvent(new Event(EMPIEZA_GRABACION));')).toBeGreaterThan(grabar.indexOf('if (otra) return this.avisar(otra);'));
    expect(grabar.indexOf('window.dispatchEvent(new Event(EMPIEZA_GRABACION));')).toBeLessThan(grabar.indexOf('getUserMedia({ audio: true })'));
    // La niebla lo oye y detiene el avance con la voz (reproducir(false) calla), sin volver a encenderlo sola
    const guia = leer('guiaLectura.ts');
    expect(guia).toContain("addEventListener('estudio:grabando', () => {\n    if (reproduciendo || voz) reproducir(false);\n  });");
    expect(guia.match(/function reproducir\(si: boolean\): void \{[\s\S]*?\n\}/)?.[0]).toContain('if (!si) callar();');
  });

  it('sin voz, guía hasta lograrlo: encender la voz la comprueba y «Comprobar de nuevo» vuelve a mirar (nota de voz del titular nmvonrzz6tit)', () => {
    const guia = leer('guiaLectura.ts');
    const comprobar = guia.match(/async function comprobarVoz\(fresco = false\): Promise<void> \{[\s\S]*?\n\}/)?.[0] ?? '';
    // Sin voz, queda apagada y el aviso trae su botón; con ella, se enciende y se prepara
    expect(comprobar).toContain("{ etiqueta: 'Comprobar de nuevo', hacer: () => void comprobarVoz(true) }");
    expect(comprobar).toContain('prepararVoz(natural);');
    // Ya no hay pasos de sistema ni cuenta de intentos: Kokoro se instala con una sola orden
    expect(guia).not.toContain('guardarIntentosVoz');
    expect(guia).not.toContain('CLAVE_INTENTOS_VOZ');
    // Encender la voz la comprueba
    expect(guia).toContain('} else await comprobarVoz();');
    // El aviso con botón se queda hasta usarlo o cerrarlo
    const director = leer('director.ts');
    expect(director).toContain('avisar(x.texto, !!x.bien, undefined, x.accion, !!x.accion)');
    expect(director.match(/function avisar\([\s\S]*?\n\}/)?.[0]).toContain('if (!fijo) avisoHasta = setTimeout(');
  });
});

import { CLAVE_VOZ_ELEGIDA, claveVozDe, elegirVoz, vozElegida } from './guiaLectura';
import { vozNaturalDe } from '../../src/director/voz';

describe('la voz de Kokoro y la elección por idioma (notas de voz del titular nmvoqbqs9tit, nmvoqcrf4tit y nmvoqqt3ftit)', () => {
  const guardado = new Map<string, string>();
  const antes = (globalThis as { localStorage?: unknown }).localStorage;
  const poner = () => {
    guardado.clear();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => guardado.get(k) ?? null,
      setItem: (k: string, v: string) => void guardado.set(k, v),
      removeItem: (k: string) => void guardado.delete(k),
    };
  };
  const quitar = () => {
    (globalThis as { localStorage?: unknown }).localStorage = antes;
  };

  it('guarda una voz por idioma y sigue leyendo la clave de antes para el idioma que no tenga la suya', () => {
    poner();
    try {
      // Lo elegido antes de este cambio (una sola voz de Kokoro) vale para cualquier idioma sin elección propia
      guardado.set(CLAVE_VOZ_ELEGIDA, 'kokoro:ef_dora');
      expect(vozElegida('es')).toBe('kokoro:ef_dora');
      expect(vozElegida('en')).toBe('kokoro:ef_dora');
      // Cada idioma guarda la suya, sin tocar la del otro
      elegirVoz('kokoro:em_alex', 'es');
      elegirVoz('kokoro:bm_george', 'en');
      expect(guardado.get(claveVozDe('es'))).toBe('kokoro:em_alex');
      expect(vozElegida('es')).toBe('kokoro:em_alex');
      expect(vozElegida('en')).toBe('kokoro:bm_george');
      // «Automática» es una elección: la clave de antes ya no cuenta para ese idioma
      elegirVoz(null, 'es');
      expect(vozElegida('es')).toBeNull();
      expect(vozElegida('en')).toBe('kokoro:bm_george');
    } finally {
      quitar();
    }
  });

  it('una elección guardada de antes que no es de Kokoro (una voz del navegador o de Piper) cuenta como sin elegir y lee la de por defecto', () => {
    poner();
    try {
      // La clave de antes con una voz del navegador, y las de cada idioma con una de Piper o con una del navegador
      guardado.set(CLAVE_VOZ_ELEGIDA, 'Microsoft Sabina');
      expect(vozElegida('es')).toBeNull();
      expect(vozElegida('en')).toBeNull();
      guardado.set(claveVozDe('es'), 'piper:es_MX-claude-high');
      guardado.set(claveVozDe('en'), 'urn:moz-tts:sapi:Microsoft David?en-US');
      expect(vozElegida('es')).toBeNull();
      expect(vozElegida('en')).toBeNull();
      // Sin elegir, lee la de por defecto de cada idioma: Santa y Heart
      const santa = { id: 'kokoro:em_santa', nombre: 'Santa (Kokoro)', idioma: 'es' };
      const heart = { id: 'kokoro:af_heart', nombre: 'Heart (Kokoro)', idioma: 'en' };
      expect(vozNaturalDe('es', vozElegida('es'), [santa, heart])).toBe(santa);
      expect(vozNaturalDe('en', vozElegida('en'), [santa, heart])).toBe(heart);
    } finally {
      quitar();
    }
  });

  it('con una voz de Kokoro, ▶ pide el audio al servidor, el director camina sobre su duración y callar la detiene', () => {
    const guia = leer('guiaLectura.ts');
    const hablar = guia.match(/function hablar\(b: Bloque\): boolean \{[\s\S]*?\n\}/)?.[0] ?? '';
    // La de Kokoro instalada o elegida lee; sin ninguna, no lee (y lo dice): no hay otro camino
    expect(hablar).toContain('if (natural) return hablarNatural(b, natural);');
    const natural = guia.match(/function hablarNatural\(b: Bloque, natural: VozNatural\): boolean \{[\s\S]*?\n\}\n/)?.[0] ?? '';
    expect(natural).toContain('audioDe(natural.id,');
    expect(natural).toContain('audio.playbackRate = ritmoDeVoz(velocidadAuto());');
    // El audio es el del bloque entero y empieza en la palabra que sigue: regresar o adelantar no lo vuelve a pedir
    // (nota de voz del titular nmvot5hg8tit, 26 de octubre de 2026)
    expect(natural).toContain('audioDe(natural.id, textoDe(b.miembros).texto)');
    expect(natural).not.toContain('.texto.slice(desde)');
    expect(natural).toContain('momentos = momentosDePalabras(b.palabras, b.palabras[0][0], audio.duration);');
    expect(natural).toContain('audio.currentTime = momentos[inicio] ?? 0;');
    // Y en cuanto suena, se pide el del bloque siguiente, para que no haya pausa entre bloques
    expect(natural).toContain('prepararSiguiente(b, natural);');
    expect(guia).toContain('const AUDIOS_GUARDADOS = 12;');
    // Mientras llega el audio, el altavoz late y el director lo dice (nota de voz del titular nmvot3vw4tit)
    expect(natural).toContain('preparando(b)');
    expect(natural).toContain('preparando(null);');
    expect(guia.match(/function preparando\([\s\S]*?\n\}/)?.[0]).toContain("globo(b, 'Preparando la voz…', 0);");
    expect(guia).toContain("gl-voz${preparandoEn ? ' gl-preparando' : ''}");
    expect(guia.match(/function callar\(\) \{[\s\S]*?\n\}/)?.[0]).toContain('preparando(null);');
    // Falla: se apaga, se dice y el director sigue a su ritmo
    expect(natural).toContain('ponerVoz(false);');
    expect(natural).toContain('fallar(errorDeVozNatural(');
    expect(natural).toContain('voz = actual;');
    // Callar (▶, la rueda, grabar) detiene el audio
    expect(guia.match(/function callar\(\) \{[\s\S]*?\n\}/)?.[0]).toContain('era.audio.pause();');
    // El servidor se pregunta solo con la voz encendida o al abrir «Sonidos»
    expect(guia).toContain('if (vozPuesta()) void vocesNaturales().then(() => {');
    expect(guia.match(/async function comprobarVoz\(fresco = false\): Promise<void> \{[\s\S]*?\n\}/)?.[0]).toContain('const natural = naturalActual();');
    // Y se prepara al encenderla, y al abrir el Studio con ella encendida, para que el primer ▶ no espere (decisión del
    // titular del 26 de octubre de 2026, misión t_voz_al_encender): con un texto corto que no suena, por el mismo camino
    expect(guia.match(/async function comprobarVoz\(fresco = false\): Promise<void> \{[\s\S]*?\n\}/)?.[0]).toContain('prepararVoz(natural);');
    expect(guia).toContain('if (natural && vozPuesta()) prepararVoz(natural);');
    expect(guia.match(/function prepararVoz\([\s\S]*?\n\}/)?.[0]).toContain('void audioDe(natural.id, TEXTO_PREPARAR).catch(() => {});');
  });
});
