import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { enunciadoDeMision } from './missionCard';
import { bloqueParaEmpezar, centralDeLaNiebla, conNiebla, tapaLaLectura, DEL_MODELO, enCola, juntarEnBloques, lejosDeLaVentana, pausaEntreCeldas, tablaDe, tandasDeFilas, TARJETA, tarjetaDe, PALABRAS_POR_BLOQUE, paraLeer, puntoDe, borde, CAMARA_MAX, conPunto, desdeRueda, esListaCorta, muescas, MUESCA, MS_REUBICAR, PALABRAS_POR_MUESCA, PALABRAS_PUNTO_CORTO, pasoCamara, pxDeRueda, queHaceCentral, dondeSeguir, huellaDe, leerPuntos, lugarEn, MIN_PALABRAS, MS_CAMBIO, MS_CAMBIO_ATRAS, nubesDe, oirVoz, palabrasDe, palabrasPorMinuto, ritmoDeVoz, sinVozAhora, vocesNaturales, vocesNaturalesDeLectura, posHacia, primerTextoPorLeer, textosPorLeer, PPM_BASE, pxPorPalabra, pxPorSegundo, RAPIDEZ_MIN, rapidezReubicar, renglonesDe, ritmo, RATON_QUIETO_MS, SALTO, seMovio, VELOCIDADES, type Caja } from './guiaLectura';

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
  it('un aviso que entra lejos de la ventana no hace volver a mirar los bloques; lo que la contiene o está dentro, sí (nota de voz del titular nmvzo6jjktit)', () => {
    type Nodo = { nombre: string; hijos: Nodo[]; contains(o: Nodo | null): boolean };
    const nodo = (nombre: string, ...hijos: Nodo[]): Nodo => ({ nombre, hijos, contains(o) { return o === this || this.hijos.some((h) => h.contains(o)); } });
    const parrafo = nodo('p');
    const ventana = nodo('mision', parrafo);
    const vista = nodo('vista', ventana);
    const aviso = nodo('error');
    expect(lejosDeLaVentana(aviso, ventana)).toBe(true);
    // El aviso entra con la narración en marcha: nada que soltar. Un repintado de la vista o un cambio en el texto, sí
    expect(lejosDeLaVentana(vista, ventana)).toBe(false);
    expect(lejosDeLaVentana(parrafo, ventana)).toBe(false);
    expect(lejosDeLaVentana(ventana, ventana)).toBe(false);
    // Sin ventana, cualquier cambio puede ser el que la trae
    expect(lejosDeLaVentana(aviso, null)).toBe(false);
    const guia = leer('guiaLectura.ts');
    expect(guia).toContain('if (cambios.every((c) => delDibujo(c) || lejosDeLaVentana<Node>(c.target, caja))) return;');
    expect(guia).toContain('export const narrando = () => !!voz || moviendo.size > 0 || (reproduciendo && enMarcha());');
  });

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
    expect(leer('app.ts')).toContain('<details class="pasos-completados"');
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
    expect(atajo).toContain('data-tx-aria="enfoque.grupoNiebla"');
    expect(atajo).toMatch(/ hidden>$/);
    const director = leer('app.ts');
    expect(director).toContain("import { cargarRegistroLectura, controlAuto, dondeVa, mandarRegistro, llamarNiebla, narrando, NO_AVANZA, nieblaPuesta, nubladoEn, ponerIdiomaDelTexto, ponerNiebla, prepararDeAntemano, prepararDelante, prepararPrimero, sinDestapar, vozPuesta } from './guiaLectura';");
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

  it('los botones tapados por la niebla no ocupan renglón (alto y relleno cero) y los párrafos nublados van justificados (nmw6lq7gstit)', () => {
    const css = leer('guiaLectura.css');
    const reglas = [...css.matchAll(/html\.niebla-lectura \.gl-tapado \{([^}]*)\}/g)].map((m) => m[1]).join('\n');
    expect(reglas).toMatch(/height: 0;/);
    expect(reglas).toMatch(/padding-block: 0;/);
    expect(reglas).toMatch(/margin-block: 0;/);
    expect(reglas).toMatch(/border-block-width: 0;/);
    expect(reglas).toMatch(/line-height: 0;/);
    expect(css).toMatch(/html\.niebla-lectura \.gl-bloque \{\s*text-align: justify;/);
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
    expect(guia).toContain("if (i) texto += fila && filaAntes ? pausaEntreCeldas(texto, fila === filaAntes) : ' ';");
    const cubrir = guia.match(/function cubrir\(b: Bloque, desde: number\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(cubrir).toContain('for (const { nodo, desde: d } of b.nodos) {');
    // El director espera al principio del primer miembro, con su lugar
    expect(guia).toContain('inicio.prepend(guia);');
    expect(leer('guiaLectura.css')).toMatch(/\.gl-inicio \{\n\s*padding-inline-start: 30px;/);
    // Escanear y cargar donde se va leyendo cuentan los mismos bloques
    expect(guia.match(/function escanear\(\) \{[\s\S]*?\n\}/)?.[0]).toContain('for (const u of unidadesDe(caja)) {');
    expect(guia.match(/export function dondeVa\(caja: HTMLElement\): Caja \| null \{[\s\S]*?\n\}/)?.[0]).toContain('const leidos = unidadesDe(caja)');
  });

  it('la tarjeta de tu misión se lee de una vez: su porqué y su paso, con un solo ▶ (nota de voz del titular nmvwjbuxutit)', () => {
    // Un árbol mínimo, con lo que tarjetaDe pregunta: qué lo rodea (closest) y qué tiene dentro (contains)
    interface Nodo { clases: string[]; padre: Nodo | null; closest(s: string): Nodo | null; contains(o: Nodo): boolean }
    const nodo = (etiqueta: string, clases: string[], padre: Nodo | null = null): Nodo => {
      const coincide = (n: Nodo, s: string) => (s.startsWith('.') ? n.clases.includes(s.slice(1)) : n.clases.includes(`<${s}>`));
      const n: Nodo = {
        clases: [`<${etiqueta}>`, ...clases],
        padre,
        closest: (s) => {
          for (let x: Nodo | null = n; x; x = x.padre) if (s.split(',').some((p) => coincide(x!, p.trim()))) return x;
          return null;
        },
        contains: (o) => {
          for (let x: Nodo | null = o; x; x = x.padre) if (x === n) return true;
          return false;
        },
      };
      return n;
    };
    expect(TARJETA).toBe('.mision-c');
    const tarjeta = nodo('article', ['mision-c', 'sigue', 'mia']);
    const porque = nodo('p', ['porque'], tarjeta);
    const pasos = nodo('ol', ['pasos'], tarjeta);
    const paso = nodo('li', [], pasos);
    const texto = nodo('span', [], paso);
    const detalle = nodo('span', ['detalle-paso'], paso);
    // El encabezado y el contenido de adentro, con la misma raíz: un solo bloque, un solo director y un solo audio
    expect(tarjetaDe(porque, tarjeta)).toBe(tarjeta);
    expect(tarjetaDe(texto, tarjeta)).toBe(tarjeta);
    expect(tarjetaDe(detalle, tarjeta)).toBe(tarjeta);
    // Lo que va aparte sigue aparte: la respuesta del director a un comentario del paso, y una tabla
    const respuesta = nodo('p', [], nodo('div', ['respuesta-dir'], paso));
    expect(tarjetaDe(respuesta, tarjeta)).toBeNull();
    expect(tarjetaDe(nodo('td', [], nodo('table', [], paso)), tarjeta)).toBeNull();
    // Fuera de una tarjeta, o con la tarjeta fuera de la ventana, como antes
    const lector = nodo('div', ['lector']);
    expect(tarjetaDe(nodo('p', [], lector), lector)).toBeNull();
    expect(tarjetaDe(porque, lector)).toBeNull();
    // Y raizDe la pregunta antes que los grupos de siempre
    const raiz = leer('guiaLectura.ts').match(/function raizDe\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(raiz.indexOf('const tarjeta = tarjetaDe<HTMLElement>(el, caja);')).toBeGreaterThan(0);
    expect(raiz.indexOf('const tarjeta = tarjetaDe<HTMLElement>(el, caja);')).toBeLessThan(raiz.indexOf('el.closest<HTMLElement>(GRUPO)'));
  });

  it('una tabla es un solo elemento que se narra: un director, un audio y ningún clic por celda (nota de voz del titular nmvya4yzftit)', () => {
    interface Nodo { clases: string[]; padre: Nodo | null; closest(s: string): Nodo | null; contains(o: Nodo): boolean }
    const nodo = (etiqueta: string, clases: string[], padre: Nodo | null = null): Nodo => {
      const coincide = (n: Nodo, s: string) => (s.startsWith('.') ? n.clases.includes(s.slice(1)) : n.clases.includes(`<${s}>`));
      const n: Nodo = {
        clases: [`<${etiqueta}>`, ...clases],
        padre,
        closest: (s) => {
          for (let x: Nodo | null = n; x; x = x.padre) if (s.split(',').some((p) => coincide(x!, p.trim()))) return x;
          return null;
        },
        contains: (o) => {
          for (let x: Nodo | null = o; x; x = x.padre) if (x === n) return true;
          return false;
        },
      };
      return n;
    };
    // En un documento, dentro de una idea: toda celda da la misma raíz, también lo que hay dentro de una celda
    const lector = nodo('div', ['lector']);
    const trozo = nodo('div', ['cuerpo-trozo'], lector);
    const tabla = nodo('table', [], trozo);
    const fila = nodo('tr', [], tabla);
    const celda = nodo('td', [], fila);
    expect(tablaDe(celda, lector)).toBe(tabla);
    expect(tablaDe(nodo('td', [], nodo('tr', [], tabla)), lector)).toBe(tabla);
    expect(tablaDe(nodo('th', [], fila), lector)).toBe(tabla);
    expect(tablaDe(nodo('p', [], celda), lector)).toBe(tabla);
    // Lo de alrededor no es de la tabla, y la tabla sigue aparte de su idea
    expect(tablaDe(nodo('p', [], trozo), lector)).toBeNull();
    // En una tarjeta de misión, la tabla es su raíz y no la tarjeta
    const tarjeta = nodo('article', ['mision-c']);
    const enPaso = nodo('td', [], nodo('tr', [], nodo('table', [], nodo('li', [], nodo('ol', ['pasos'], tarjeta)))));
    expect(tarjetaDe(enPaso, tarjeta)).toBeNull();
    expect(tablaDe(enPaso, tarjeta)?.clases).toContain('<table>');
    // Una tabla fuera de la ventana no cuenta
    expect(tablaDe(celda, nodo('div', ['otra']))).toBeNull();
    // Y raizDe la pregunta antes que nada, con todas las celdas entre lo que se lee (también los títulos de columna)
    const guia = leer('guiaLectura.ts');
    const raiz = guia.match(/function raizDe\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(raiz.indexOf('const tabla = tablaDe<HTMLElement>(el, caja);')).toBeGreaterThan(0);
    expect(raiz.indexOf('const tabla = tablaDe<HTMLElement>(el, caja);')).toBeLessThan(raiz.indexOf('const tarjeta = tarjetaDe'));
    expect(guia).toMatch(/const SELECTOR = 'p, li, td, th, /);
  });

  it('la voz hace su pausa entre celdas y entre filas, sin signos de más', () => {
    expect(pausaEntreCeldas('Por qué va ahí la misión', true)).toBe(', ');
    expect(pausaEntreCeldas('Da contexto', false)).toBe('. ');
    expect(pausaEntreCeldas('Ya termina en punto.', false)).toBe(' ');
    expect(pausaEntreCeldas('Una coma, ', true)).toBe(' ');
    expect(pausaEntreCeldas('', true)).toBe(' ');
  });

  it('una tabla cabe en un audio; solo una muy larga se parte, siempre entre dos filas', () => {
    expect(tandasDeFilas([100, 100, 100], 1000)).toEqual([[0, 1, 2]]);
    expect(tandasDeFilas([600, 300, 200, 900], 1000)).toEqual([[0, 1], [2], [3]]);
    // Una fila que ya pasa del tope va sola, y ninguna se pierde ni se reordena
    expect(tandasDeFilas([1500, 10], 1000)).toEqual([[0], [1]]);
    expect(tandasDeFilas([]).flat()).toEqual([]);
    expect(tandasDeFilas(Array.from({ length: 40 }, () => 200)).flat()).toEqual(Array.from({ length: 40 }, (_, i) => i));
    expect(tandasDeFilas(Array.from({ length: 40 }, () => 200)).length).toBe(2);
  });

  it('la celda siguiente, que vuelve arriba de su fila, empieza otro renglón', () => {
    const caja = (y: number, x = 0) => ({ x, y, ancho: 10, alto: 20 });
    // Dos renglones en la primera celda, y la segunda vuelve arriba
    expect(renglonesDe([caja(0), caja(24), caja(0, 100)])).toEqual([0, 1, 2]);
    // Lo de siempre: misma altura, mismo renglón
    expect(renglonesDe([caja(0), caja(0, 20), caja(24)])).toEqual([0, 0, 1]);
  });

  it('en el enfoque, la tarjeta de tu misión es la ventana y su bloque a la vez: el botón central y ▶ la encuentran (nota de voz del titular nmvwkp4u1tit)', () => {
    // Un árbol mínimo, con lo que conNiebla pregunta: si es un bloque (matches) y cuáles tiene dentro (querySelectorAll)
    interface Nodo { clases: string[]; hijos: Nodo[]; matches(s: string): boolean; querySelectorAll(s: string): Nodo[] }
    const nodo = (clases: string[], hijos: Nodo[] = []): Nodo => {
      const n: Nodo = {
        clases,
        hijos,
        matches: (s) => n.clases.includes(s.slice(1)),
        querySelectorAll: (s) => n.hijos.flatMap((h) => [...(h.matches(s) ? [h] : []), ...h.querySelectorAll(s)]),
      };
      return n;
    };
    // En el enfoque, la ventana es la tarjeta (html.enfoque-mision .mision-c.sigue.mia) y su bloque, la tarjeta entera:
    // buscarlo solo adentro no encontraba nada, y ▶ y el botón central no tenían qué leer
    const tarjeta = nodo(['mision-c', 'sigue', 'mia', 'gl-bloque'], [nodo(['porque']), nodo(['pasos'], [nodo(['paso'])])]);
    expect(tarjeta.querySelectorAll('.gl-bloque')).toEqual([]);
    expect(conNiebla(tarjeta)).toEqual([tarjeta]);
    // En «¿Dónde quedamos?», la tarjeta está dentro de la ventana: una vez, en su orden, y la ventana no cuenta
    const respuesta = nodo(['respuesta-dir', 'gl-bloque']);
    const dentro = nodo(['mision-c', 'gl-bloque'], [nodo(['porque']), respuesta]);
    const dialogo = nodo(['donde-quedamos'], [nodo(['dq-quedamos', 'gl-bloque']), dentro]);
    expect(conNiebla(dialogo).map((x) => x.clases[0])).toEqual(['dq-quedamos', 'mision-c', 'respuesta-dir']);
    // Lo usan los bloques de cada ventana (▶, el botón central, la rueda, lo que espera a la niebla) y la cámara
    const guia = leer('guiaLectura.ts');
    expect(guia.match(/const bloquesDe = \(caja: HTMLElement\) =>[\s\S]*?;\n/)?.[0]).toContain('conNiebla<HTMLElement>(caja)');
    expect(guia).not.toContain("caja.querySelectorAll<HTMLElement>('.gl-bloque')");
    expect(guia.match(/function contenedorDe\([\s\S]*?\n\}/)?.[0]).toContain('for (let p = el === tope ? tope : el.parentElement; p; p = p.parentElement) {');
  });

  it('el director siempre donde termina su niebla: si el texto se acomoda de otra forma, se mide de nuevo (notas de voz del titular nmvmzmwj9tit y nmvn0e14xtit)', () => {
    const guia = leer('guiaLectura.ts');
    // El navegador no avisa del tamaño de un texto en línea: se vigila también su ancla, que es un bloque
    expect(guia).toContain('if (ancla !== el) tamanos?.observe(ancla);');
    expect(guia).toContain('if (!cambiados.has(b.el) && !cambiados.has(b.ancla)) continue;');
  });

  it('con la niebla puesta, tocar una línea de «¿Dónde quedamos?» aún nublada no la da por leída (nota de voz del titular nmvn0h59stit)', () => {
    const tocar = leer('app.ts').match(/function tocarDq\([\s\S]*?\n\}/)?.[0] ?? '';
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
    const director = leer('app.ts');
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
    expect(ubicar).toContain("lugarDelGlobo(r, { ancho: g.offsetWidth, alto: g.offsetHeight }, { ancho: anchoDeVentana(), alto: altoDeVentana() }, { orden: ['arriba', 'abajo'], centrado: true, separacion: 8 })");
    expect(ubicar).not.toContain('Math.max(margen, Math.min(x - g.offsetWidth / 2, anchoDeVentana() - g.offsetWidth - margen))');
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
    const director = leer('app.ts');
    // (en sus grupos: el tema con la letra, la niebla con su ▶, la narración y el sonido; enfoque.test.ts)
    expect(director).toMatch(/tema: `\$\{botonTema\(\)\}<span class="tamanos-letra">[\s\S]*?niebla: controlAuto\('niebla'\),\n\s*narracion: controlAuto\('voz'\),/);
    expect(director).toContain("· ${tx('dq.titulo')}</h2>${((paro) => (paro ? lineaDeParo(paro) : ''))(paroReciente())}${opcionesDq()}</div>");    // Tomar al director (arrastrarlo, doble clic o el teclado) lo detiene; ▶ sigue desde el último bloque que se leyó
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
    expect(central).toContain('const lista = bloquesDe(caja);');
    expect(central).toContain('const b = bloqueParaLeer(lista);');
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
    expect(leer('app.ts')).toContain("<p class=\"esperando\">${tx('buzon.esperandoNota')}</p>");
  });

  it('cada párrafo con clase del Studio dice si es de la interfaz o del director: ninguno nace sin decirlo (nota de voz del titular nmvoksx45tit)', () => {
    const fuera = leer('guiaLectura.ts').match(/const FUERA = \[[\s\S]*?\]\.join/)?.[0] ?? '';
    const enFuera = (c: string) => new RegExp(`(^|[\\s,'])p?\\.${c}(?=[\\s,']|$)`).test(fuera);
    const clases = [...new Set([...leer('app.ts').matchAll(/<p class="([a-z][\w-]*)/g)].map((m) => m[1]))];
    expect(clases.length).toBeGreaterThan(30);
    // Una clase nueva sin decir de quién es falla aquí: va en FUERA (interfaz) o en DEL_MODELO (lo que escribe el director)
    expect(clases.filter((c) => !enFuera(c) && !(DEL_MODELO as readonly string[]).includes(c))).toEqual([]);
    expect(DEL_MODELO.filter(enFuera)).toEqual([]);
    // El de la captura: «Puedes elegir una o varias», de las opciones que se suman
    expect(enFuera('pista-varias')).toBe(true);
    expect(leer('app.ts')).toContain("<p class=\"pista-varias\">${tx('paso.pistaVarias')}</p>");
  });

  it('arriba de la ventana de lectura, la nube junto a su ▶, y el ▶ solo con la niebla puesta (nota de voz del titular nmvmyoo09tit)', () => {
    const guia = leer('guiaLectura.ts');
    const control = guia.match(/export function controlAuto\([^)]*\): string \{[\s\S]*?\n\}/)?.[0] ?? '';
    // La nube va primero, con el mismo data-niebla del atajo junto a la cara (app.ts la enciende y la pone al día)
    expect(control.indexOf('data-niebla aria-pressed')).toBeGreaterThan(-1);
    expect(control.indexOf('data-niebla aria-pressed')).toBeLessThan(control.indexOf('class="gl-auto"'));
    const css = leer('guiaLectura.css');
    // La nube, solo en la ventana de lectura; el ▶ y su velocidad, solo con la niebla puesta
    expect(css).toMatch(/\.gl-niebla \{\n\s*display: none;/);
    expect(css).toMatch(/html\.enfoque \.lector \.gl-niebla,\ndialog\.donde-quedamos \.gl-niebla \{\n\s*display: inline-flex;/);
    expect(css).toMatch(/\.gl-auto \{\n\s*display: none;/);
    expect(css).toMatch(/html\.niebla-lectura \.gl-auto \{\n\s*display: inline-flex;/);
    // El atajo junto a la cara se esconde fuera de la ventana de lectura; la nube de arriba ya está solo ahí
    const aplicar = leer('app.ts').match(/function aplicarEnfoque\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(aplicar).toContain("else b.setAttribute('aria-label', tx(niebla ? 'enfoque.quitarNiebla' : 'enfoque.grupoNiebla'));");
    expect(es['enfoque.quitarNiebla']).toBe('Quitar la niebla de lectura');
    expect(es['enfoque.grupoNiebla']).toBe('Niebla de lectura');
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
    const director = leer('app.ts');
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
    // El botón central, sin el desplazamiento automático del navegador; nunca donde se escribe, ni sobre un enlace ya
    // destapado (uno que la niebla tapa todavía es de la niebla: nmw5ekmcmtit)
    const central = guia.match(/function conBotonCentral\(e: MouseEvent\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(central).toContain("closest('textarea, select, input, [contenteditable]')");
    expect(central).toContain("if ((e.target as HTMLElement).closest('a[href]') && !quedaNiebla) return;");
    expect(central).toContain('e.preventDefault();');
    expect(central).toContain("if (e.type !== 'mousedown') {");
    expect(guia).toContain("document.addEventListener('mousedown', conBotonCentral);");
  });

  it('mientras quede niebla, el botón central es solo de la niebla y la narración: el botón oculto del paso no se oprime ni se abre su enlace (nmw5ekmcmtit)', () => {
    // La mirada en un bloque ya destapado, con otro por destapar: destapa, no deja pasar a lo que sigue
    expect(centralDeLaNiebla({ hace: 'nada', quedaNiebla: true })).toBe('avanzar');
    // Sin niebla, el botón del paso responde, como siempre (siguiente.ts)
    expect(centralDeLaNiebla({ hace: 'nada', quedaNiebla: false })).toBe('nada');
    expect(centralDeLaNiebla({ hace: 'detener', quedaNiebla: true })).toBe('detener');
    expect(centralDeLaNiebla({ hace: 'entendido', quedaNiebla: false })).toBe('entendido');
    const guia = leer('guiaLectura.ts');
    const central = guia.match(/function conBotonCentral\(e: MouseEvent\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    // Lo tomado en el «mousedown» se lleva también su «auxclick», que abriría el enlace en otra pestaña; y siguiente.ts,
    // que mira después, ve el defaultPrevented y no oprime nada
    expect(central).toContain('if (centralTomado) e.preventDefault();');
    expect(central.indexOf('e.preventDefault();\n  centralTomado = true;')).toBeGreaterThan(0);
    expect(central).toContain("const quedaNiebla = lista.some(sinTerminar) || !!caja.querySelector('.gl-tapado') || faltaPorMedir(caja);");
    expect(guia).toContain("document.addEventListener('auxclick', conBotonCentral);");
    expect(leer('siguiente.ts')).toContain('if (e.defaultPrevented) return;');
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
    expect(es['lectura.autoTitulo']).toContain('En un documento, cuando ya no queda nada por destapar, el botón central marca «Entendido».');
  });

  it('solo avanza la ventana de arriba: nada de lo que está detrás del enfoque o de un diálogo se destapa ni se desplaza (nota de voz del titular nmvol5ahftit)', () => {
    const guia = leer('guiaLectura.ts');
    // Con otro diálogo abierto encima de la ventana de lectura, ▶, la rueda y el botón central no la mueven
    const activa = guia.match(/const ventanaActiva = \(\) => \{[\s\S]*?\n\};/)?.[0] ?? '';
    expect(activa).toContain("![...document.querySelectorAll<HTMLElement>('dialog[open]')].some((d) => tapaLaLectura(d, caja))");
    // Un diálogo abierto encima la tapa; el que la lleva dentro, o el que espera a un lado con su nota grabada, no
    // (la corrección con voz de una nota del Buzón que espera enviarse no detiene la narración: nmw5f3xqetit)
    const caja = {} as HTMLElement;
    const dialogo = (dentro: boolean, aUnLado: boolean) => ({ contains: () => dentro, classList: { contains: (c: string) => c === 'a-un-lado' && aUnLado } });
    expect(tapaLaLectura(dialogo(false, false), caja)).toBe(true);
    expect(tapaLaLectura(dialogo(true, false), caja)).toBe(false);
    expect(tapaLaLectura(dialogo(false, true), caja)).toBe(false);
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
    const director = leer('app.ts');
    const centrar = director.match(/function centrarIdea\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    // Sin avance, con la niebla: arriba y de una vez, nunca a media ventana
    expect(centrar.indexOf('} else if (ventana && nieblaPuesta()) {')).toBeGreaterThan(centrar.indexOf('if (ventana && va) {'));
    expect(centrar).toContain("idea.scrollIntoView({ block: 'start', behavior: 'auto' });");
    // Al abrirse la parte siguiente, el desplazamiento de la anterior no se queda: se lleva a su primera idea
    const parte = director.match(/async function marcarParte\(titulo: string\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    const abre = parte.indexOf("decir(tx('leido.parteMenos'), 'feliz');");
    expect(es['leido.parteMenos']).toBe('¡Bien! Una parte menos: se abrió la siguiente.');
    expect(abre).toBeGreaterThan(-1);
    expect(parte.indexOf('centrarIdea();', abre)).toBeGreaterThan(abre);
    expect(parte.indexOf('centrarIdea();', abre)).toBeLessThan(parte.indexOf('await guardado;', abre));
  });

  it('carga donde se va leyendo: el primer bloque sin terminar, en su avance si lo tenía, o desde el principio', () => {
    expect(dondeSeguir([{ punto: 9, ultima: 9 }, { punto: 4, ultima: 12 }, { punto: -1, ultima: 8 }])).toEqual({ indice: 1, conAvance: true });
    expect(dondeSeguir([{ punto: 9, ultima: 9 }, { punto: -1, ultima: 8 }, { punto: 3, ultima: 8 }])).toEqual({ indice: 1, conAvance: false });
    expect(dondeSeguir([{ punto: 9, ultima: 9 }])).toBeNull();
    // Y una idea más alta que la ventana no se centra (empezaría a medio párrafo): va arriba
    const centrar = leer('app.ts').match(/function centrarIdea\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
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
    expect(leer('app.ts')).toContain('<ol class="pasos-progreso">');
  });

  it('el director flotante y sus atajos quedan siempre encima, también de un diálogo como «¿Dónde quedamos?»', () => {
    const encima = leer('encima.ts');
    expect(encima).toContain("export const SIEMPRE_ENCIMA = ['segundo-plano', 'progreso-director', 'atajos-director', 'director-flotante'] as const;");
    expect(encima).toContain('const deTodos = modalDeArriba(null, dialogos, abiertos);');
    expect(leer('app.ts')).toContain("import './encima';");
    const html = leer('../../index.html');
    for (const id of ['segundo-plano', 'progreso-director', 'atajos-director']) expect(html).toContain(`id="${id}"`);
    expect(leer('equipo.ts')).toContain("flotante.id = 'director-flotante';");
  });

  it('la revisión en marcha va en su atajo, discreta, y no en una pastilla que tape lo que se lee (nota de voz del titular nmvoottaitit)', () => {
    const director = leer('app.ts');
    const segundo = director.match(/function pintarSegundoPlano\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    // La pastilla ya no dice que el director revisa ni lo negado: eso lo dicen la cabecera y el atajo
    expect(segundo).not.toContain("r.estado === 'en_curso' ? [`<button type=\"button\" class=\"sp-linea");
    expect(segundo).not.toContain('Se le negó un permiso');
    // El atajo late, se pone rojo sin actividad y lleva lo negado como cifra; su nombre dice cómo va y cuánto lleva
    // (también mientras atiende lo urgente: nota de voz del titular nmvsytu00tit)
    expect(segundo).toContain("info.classList.toggle('trabajando', (r.estado === 'en_curso' && !parada) || urgente);");
    expect(segundo).toContain("info.dataset.cifra = negados.length ? String(negados.length) : '';");
    const rotulo = director.match(/function rotularProgreso\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(rotulo).toContain("parada ? tx('progreso.sinActividad') : tx('cabeza.revisando')");
    expect(rotulo).toContain("tx('progreso.negados', { n })");
    // «Sin novedades» (nmw5dh3uztit): los minutos y el porqué van en el texto que sale al pasar el ratón (parada.sinCambio)
    expect(es['progreso.sinActividad']).toBe('Sin novedades');
    expect(es['cabeza.sinActividad']).toBe(' · sin novedades');
    expect(en['progreso.sinActividad']).toBe('No news');
    expect(en['cabeza.sinActividad']).toBe(' · no news');
    expect(es['parada.sinCambio']).toContain('{min} minutos');
    expect(es['parada.sinCambio']).toContain('cada 15 segundos');
    expect(en['parada.sinCambio']).toContain('every 15 seconds');
    expect(director).toContain("info.title = [urgente ? tx('progreso.verUrgente') : parada ? PARADA(parada)");
    expect(es['cabeza.revisando']).toBe('El director está revisando');
    expect(es['progreso.negados']).toEqual({ uno: 'se le negó un permiso', otros: 'se le negaron {n} permisos' });
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
    expect(guia).toContain('return vozNaturalDe(idioma, id, naturales ?? null);');
    // La elección la usan el avance, el aviso al encenderla y el botón; «Sonidos» la ofrece con ▶ para oírla
    const panel = leer('panelSonidos.ts');
    expect(panel).toContain('data-ps="voz"');
    expect(panel).toContain("if (destino.closest('[data-ps-oir-voz]')) return oirVoz(vozElegida(idiomaActual()), idiomaActual());");
    expect(panel).toContain('elegirVozDelPanel(c.value || null);');
    expect(panel.match(/function contenido\(\): string \{[\s\S]*?\n\}/)?.[0]).toContain('grupoVoz()');
  });

  it('«Sonidos» ofrece solo las voces de Kokoro; sin ninguna instalada, dice cómo instalarlas en vez de un selector vacío', () => {
    const panel = leer('panelSonidos.ts');
    expect(panel).not.toMatch(/piper|speechSynthesis|vocesDeLectura/i);
    expect(panel).not.toContain('Del navegador');
    expect(panel).not.toContain('Naturales, en tu computador');
    expect(panel).not.toContain('aún no están instaladas');
    // Con voces: «Automática» y las de Kokoro; sin ninguna, el mismo aviso que el altavoz, sin selector
    const grupo = panel.match(/export function grupoVoz\([^)]*\): string \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(grupo).toContain("if (!naturales.length) return `<div class=\"ps-grupo\">${titulo}<p class=\"ps-nota\">${esc(sinVozAhora(false, idioma))}</p></div>`;");
    expect(grupo.indexOf('if (!naturales.length)')).toBeLessThan(grupo.indexOf('<select data-ps="voz"'));
    expect(grupo).toContain('${naturales.map(opcion).join(\'\')}');
    expect(es['sonidos.vozAutomatica']).toBe('Automática ({voz})');
    expect(panel).toContain('void vocesNaturales().then((n) => {');
  });

  it('«Sonidos» lista y guarda las voces del idioma de la interfaz; lo que se lee sigue con la del idioma del texto (nota nmvyq4syjtit)', async () => {
    const ingles = ['af_sarah:Sarah', 'am_adam:Adam', 'bm_george:George'].map((x) => ({ id: `kokoro:${x.split(':')[0]}`, nombre: x.split(':')[1], idioma: 'en' }));
    const espanol = ['ef_dora:Dora', 'em_alex:Alex', 'em_santa:Santa'].map((x) => ({ id: `kokoro:${x.split(':')[0]}`, nombre: x.split(':')[1], idioma: 'es' }));
    const todas = [...espanol, ...ingles];
    const guardado = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => guardado.get(k) ?? null, setItem: (k: string, v: string) => void guardado.set(k, v) });
    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => ({ voces: todas }) }));
    const { grupoVoz, elegirVozDelPanel } = await import('./panelSonidos');
    try {
      await vocesNaturales(true);
      // Un documento en español abierto, y la interfaz pasa a inglés
      ponerIdiomaDelTexto(() => 'es');
      ponerIdioma('en');
      const html = grupoVoz(todas);
      const opciones = [...html.matchAll(/<option value="kokoro:[^"]+"[^>]*>([^<]+)</g)].map((m) => m[1]);
      expect(opciones).toEqual(['Sarah', 'Adam', 'George']);
      expect(html).toContain('Automatic (George)');
      expect(html).toContain('Fog voice');
      // Lo que eliges se guarda en inglés, y se ve elegido
      elegirVozDelPanel('kokoro:bm_george');
      expect(guardado.get(claveVozDe('en'))).toBe('kokoro:bm_george');
      expect(guardado.has(claveVozDe('es'))).toBe(false);
      expect(grupoVoz(todas)).toContain('<option value="kokoro:bm_george" selected>');
      // Y ese documento en español se sigue leyendo con una voz en español
      expect((await vocesNaturalesDeLectura()).map((v) => v.nombre)).toEqual(['Dora', 'Alex', 'Santa']);
      expect(vozElegida()).not.toBe('kokoro:bm_george');
      // De vuelta en español, las tres de español, sin tocar lo que elegiste en inglés
      ponerIdioma('es');
      expect([...grupoVoz(todas).matchAll(/<option value="kokoro:[^"]+"[^>]*>([^<]+)</g)].map((m) => m[1])).toEqual(['Dora', 'Alex', 'Santa']);
      expect(grupoVoz(todas)).toContain('Automática (Santa)');
      expect(guardado.get(claveVozDe('en'))).toBe('kokoro:bm_george');
      // Con solo voces de otro idioma, dice que falta la de este, nunca un selector vacío
      ponerIdioma('en');
      const sinIngles = grupoVoz(espanol);
      expect(sinIngles).not.toContain('<select');
      expect(sinIngles).toContain('English');
    } finally {
      ponerIdiomaDelTexto(() => null);
      ponerIdioma('es');
      vi.unstubAllGlobals();
    }
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
    expect(control).toContain("if (parte === 'voz') return `<span class=\"gl-control\"><span class=\"gl-auto\" role=\"group\" aria-label=\"${tx('lectura.grupoVoz')}\">${botonVoz()}</span></span>`;");
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
    expect(leer('app.ts')).toContain('.gl-control');
  });

  it('nunca falla en silencio: sin Kokoro, dice que no está instalado y cómo instalarlo, en el altavoz y en «Oír» (nota de voz del titular nmvomwyidtit)', () => {
    const guia = leer('guiaLectura.ts');
    // ▶ sin voz de Kokoro: el aviso (una vez por cada ▶) con su botón; el director camina a su ritmo, sin otra voz
    const hablar = guia.match(/function hablar\(b: Bloque\): boolean \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(hablar).toContain("avisar(sinVozAhora(true), false, { etiqueta: tx('voz.comprobarBoton'), hacer: () => void comprobarVoz(true) });");
    expect(hablar.trimEnd().endsWith('  return false;\n}')).toBe(true);
    expect(guia).toContain('const palabraPorLeer = (b: Bloque) => Math.max(0, Math.floor(b.pos + EPS) + 1);');
    // «Oír» en «Sonidos» sin voz de Kokoro: lo mismo, nunca otra voz ni silencio
    expect(guia.match(/export function oirVoz\([\s\S]*?\n\}/)?.[0]).toContain('else avisar(sinVozAhora(false, idioma));');
    // Encender la voz sin Kokoro: queda apagada y el aviso trae su botón, que vuelve a mirar sin fiarse de la memoria
    const comprobar = guia.match(/async function comprobarVoz\(fresco = false\): Promise<void> \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(comprobar).toContain('await vocesNaturales(fresco || sinRespuestaDelStudio);');
    expect(comprobar).toContain("avisar(sinVozAhora(true), false, { etiqueta: tx('voz.comprobarBoton'), hacer: () => void comprobarVoz(true) });");
    expect(comprobar.indexOf('ponerVoz(false);')).toBeLessThan(comprobar.indexOf('avisar(sinVozAhora(true)'));
    // Y el botón del altavoz lo dice al pasar el ratón cuando ya sabe que no hay
    expect(guia).toContain("naturales && !sinRespuestaDelStudio && !naturalActual() ? 'voz.leerSinInstalar'");
    expect(es['voz.leerSinInstalar']).toContain('las voces de Kokoro no están instaladas en este computador');
  });

  it('una falla vieja no se avisa: ▶ y encender la voz vuelven a preguntar antes de decir nada (nmvzjrm42tit)', async () => {
    const guia = leer('guiaLectura.ts');
    const hablar = guia.match(/function hablar\(b: Bloque\): boolean \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(hablar).toContain('if (naturales === undefined || sinRespuestaDelStudio) {\n    void volverAPreguntar();\n    return false;');
    expect(hablar.indexOf('void volverAPreguntar();')).toBeLessThan(hablar.indexOf('avisar(sinVozAhora(true)'));
    const dormidas: number[] = [];
    let n = 0;
    const pedir = async () => {
      if (++n < 3) throw new Error('no');
      return 'listo';
    };
    expect(await conReintentos(pedir, ESPERAS_AL_REINTENTAR, async (ms) => void dormidas.push(ms))).toBe('listo');
    expect(dormidas).toEqual(ESPERAS_AL_REINTENTAR);
    await expect(conReintentos(async () => Promise.reject(new Error('siempre')), [0, 0])).rejects.toThrow('siempre');
  });

  it('el aviso de que no hay voz sale del servidor: con su motivo y su orden de instalar, o la de siempre si no respondió', async () => {
    const eventos: { texto: string; bien: boolean }[] = [];
    vi.stubGlobal('document', { documentElement: { lang: 'es' } });
    vi.stubGlobal('window', { dispatchEvent: (e: CustomEvent) => void eventos.push(e.detail) });
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' });
    const servidor = (cuerpo: unknown) => vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => cuerpo }));
    try {
      // El servidor dice que Kokoro no está instalado: ese es el aviso, con su orden y con que el director sigue a su ritmo
      const motivo = 'Las voces de Kokoro no están instaladas en este computador (faltan los archivos del modelo en la carpeta de voces). Se instalan, desde la carpeta del Studio, en Git Bash, con: bash tools/entorno/instalar_voces.sh';
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

      // Un servidor que no dice por qué: la orden de siempre, sin WSL (pr_voz_sin_wsl): en Windows, en Git Bash
      servidor({ voces: [] });
      await vocesNaturales(true);
      expect(sinVozAhora()).toContain('Las voces de Kokoro no están instaladas en este computador. Se instalan, desde la carpeta del Studio, en Git Bash, con: bash tools/entorno/instalar_voces.sh');
      expect(sinVozAhora()).not.toContain('wsl');
      vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' });
      expect(sinVozAhora()).toContain('Studio, con: bash tools/entorno/instalar_voces.sh');
      expect(sinVozAhora()).not.toContain('Git Bash');

      // El Studio no respondió ni al reintentar: lo dice, sin inventar que Kokoro falta ni pedir que termine de instalarse
      vi.stubGlobal('fetch', async () => {
        throw new Error('sin red');
      });
      await vocesNaturales(true, [0, 0]);
      expect(sinVozAhora()).toContain('No pude preguntarle al Studio qué voces de Kokoro hay.');
      expect(sinVozAhora(true)).toContain('Cuando vuelva a responder, oprime «Comprobar de nuevo».');
      expect(sinVozAhora(true)).not.toMatch(/instal/i);

      // Una falla de paso (el servidor reiniciándose) no llega a la persona: el reintento trae las voces y no hay aviso (nmvzjrm42tit)
      let intentos = 0;
      vi.stubGlobal('fetch', async () => {
        if (++intentos === 1) throw new Error('reiniciando');
        return { ok: true, json: async () => ({ voces: [{ id: 'kokoro:em_santa', nombre: 'Santa (Kokoro)', idioma: 'es' }] }) };
      });
      expect(await vocesNaturales(true, [0, 0])).toEqual([{ id: 'kokoro:em_santa', nombre: 'Santa (Kokoro)', idioma: 'es' }]);
      expect(intentos).toBe(2);
      expect(sinVozAhora()).not.toContain('No pude preguntarle');
      const veces = eventos.length;
      expect(await vocesNaturalesDeLectura()).toHaveLength(1);
      expect(eventos).toHaveLength(veces);

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

  it('si el audio del bloque no llega, la página lo pide una vez más antes de apagar la voz (pr_voz_sin_apagones)', async () => {
    expect(REINTENTO_DEL_AUDIO).toHaveLength(1);
    // Falla una vez y luego llega: suena, sin apagar la voz
    let n = 0;
    const unaFalla = async () => {
      if (++n < 2) throw new Error('El Studio respondió 503');
      return 'audio';
    };
    expect(await conReintentos(unaFalla, REINTENTO_DEL_AUDIO, async () => {})).toBe('audio');
    expect(n).toBe(2);
    // Falla dos veces: solo entonces sale la falla, tras dos pedidos y no tres
    let m = 0;
    await expect(conReintentos(async () => Promise.reject(new Error(`falla ${++m}`)), REINTENTO_DEL_AUDIO, async () => {})).rejects.toThrow('falla 2');
    expect(m).toBe(2);
    // Y así pide su audio el bloque que se lee
    const natural = leer('guiaLectura.ts').match(/function hablarNatural\([\s\S]*?\n\}\n/)?.[0] ?? '';
    expect(natural).toContain('conReintentos(() => (voz === actual ? audioDe(natural.id, textoDe(b.miembros).texto) :');
    expect(natural).toContain('REINTENTO_DEL_AUDIO)');
  });

  it('si la voz falla, la apaga, lo dice y el director sigue a su ritmo; callarla no es una falla', () => {
    const guia = leer('guiaLectura.ts');
    const natural = guia.match(/function hablarNatural\([\s\S]*?\n\}\n/)?.[0] ?? '';
    expect(natural).toContain("audio.onerror = () => fallar(fallaDeLaVoz(tx('voz.navegadorNoPudo')), `el navegador no pudo sonar el audio");
    expect(natural).toContain('fallar(fallaDeLaVoz(motivo), e instanceof Error && fallasDelServidor.has(e) ? undefined :');
    // Lo que falla en la página, a la bitácora (nmw46uyrytit)
    expect(natural).toContain('if (propia) reportarFallaDeVoz(propia,');
    expect(natural).toContain('ponerVoz(false);');
    // Al encenderla, dice con qué voz lee
    expect(guia).toContain("avisar(tx('voz.encendida', { voz: natural.nombre }), true);");
    expect(es['voz.encendida']).toContain('Voz encendida: lee «{voz}», una voz de Kokoro de este computador.');
    // El Studio lo muestra, también encima de «¿Dónde quedamos?», que es un diálogo
    const director = leer('app.ts');
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
    expect(comprobar).toContain("{ etiqueta: tx('voz.comprobarBoton'), hacer: () => void comprobarVoz(true) }");
    expect(comprobar).toContain('prepararVoz(natural);');
    // Ya no hay pasos de sistema ni cuenta de intentos: Kokoro se instala con una sola orden
    expect(guia).not.toContain('guardarIntentosVoz');
    expect(guia).not.toContain('CLAVE_INTENTOS_VOZ');
    // Encender la voz la comprueba
    expect(guia).toContain('} else await comprobarVoz();');
    // El aviso con botón se queda hasta usarlo o cerrarlo
    const director = leer('app.ts');
    expect(director).toContain('avisar(x.texto, !!x.bien, undefined, x.accion, !!x.accion)');
    expect(director.match(/function avisar\([\s\S]*?\n\}/)?.[0]).toContain('if (!fijo) avisoHasta = setTimeout(');
  });
});

import { CLAVE_VOZ_ELEGIDA, claveVozDe, conReintentos, elegirVoz, ESPERAS_AL_REINTENTAR, FALLAS_QUE_DETIENEN, ponerIdiomaDelTexto, REINTENTO_DEL_AUDIO, sigueLaCola, vozElegida } from './guiaLectura';
import { ponerIdioma } from './textos';
import { en } from './textos/en';
import { es } from './textos/es';

describe('cada texto, con la voz de su idioma (pd_voz_del_texto)', () => {
  const santa = { id: 'kokoro:em_santa', nombre: 'Santa (Kokoro)', idioma: 'es' };
  const heart = { id: 'kokoro:af_heart', nombre: 'Heart (Kokoro)', idioma: 'en' };
  const conVoces = async (voces: unknown[]) => {
    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => ({ voces }) }));
    await vocesNaturales(true);
  };

  it('la voz, la elegida y el aviso siguen al texto abierto; sin saberlo, la de la interfaz, y ▶ siempre tiene con qué leer', async () => {
    const guardado = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => guardado.get(k) ?? null, setItem: (k: string, v: string) => void guardado.set(k, v) });
    try {
      await conVoces([santa, heart]);
      ponerIdiomaDelTexto(() => 'en');
      expect(await vocesNaturalesDeLectura()).toEqual([heart]);
      ponerIdiomaDelTexto(() => 'es');
      expect(await vocesNaturalesDeLectura()).toEqual([santa]);
      // Sin idioma: la de la interfaz, en los dos sentidos
      ponerIdiomaDelTexto(() => null);
      ponerIdioma('en');
      expect(await vocesNaturalesDeLectura()).toEqual([heart]);
      ponerIdioma('es');
      expect(await vocesNaturalesDeLectura()).toEqual([santa]);
      // La elegida en «Sonidos» es la del idioma de ese texto
      elegirVoz('kokoro:ef_dora', 'es');
      ponerIdiomaDelTexto(() => 'es');
      expect(vozElegida()).toBe('kokoro:ef_dora');
      ponerIdiomaDelTexto(() => 'en');
      expect(vozElegida()).not.toBe('kokoro:ef_dora');
      // Un documento en inglés sin Heart instalada: el aviso dice que falta la de inglés, nunca lee con otra
      await conVoces([santa]);
      expect(await vocesNaturalesDeLectura()).toEqual([]);
      expect(sinVozAhora()).toContain('inglés');
    } finally {
      ponerIdiomaDelTexto(() => null);
      ponerIdioma('es');
      vi.unstubAllGlobals();
    }
  });

  it('el aviso de que no hay voz se dice en el idioma de la interfaz (pd_idiomas), con el nombre del idioma que se lee', async () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' });
    try {
      ponerIdiomaDelTexto(() => 'es');
      ponerIdioma('en');
      // Sin ninguna voz y sin que el servidor diga por qué: la orden de instalar, en inglés, con el botón en inglés
      vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => ({ voces: [] }) }));
      await vocesNaturales(true);
      expect(sinVozAhora()).toBe('Kokoro voices are not installed on this computer. They are installed from the Studio folder, in Git Bash, with: bash tools/entorno/instalar_voces.sh Meanwhile, the director stays without a voice, at its own pace.');
      expect(sinVozAhora(true)).toContain('When it finishes installing, press «Check again».');
      // El Studio no respondió: lo dice, sin inventar que Kokoro falta
      vi.stubGlobal('fetch', async () => {
        throw new Error('sin red');
      });
      await vocesNaturales(true, [0, 0]);
      expect(sinVozAhora()).toContain('I could not ask the Studio which Kokoro voices there are.');
      expect(sinVozAhora(true)).toContain('When it answers again, press «Check again».');
      // Voces de inglés para un texto en español: el idioma que falta, por su nombre en inglés
      await conVoces([heart]);
      expect(sinVozAhora()).toBe("I can't find a Kokoro voice in Spanish installed on this computer, so the director stays without a voice, at its own pace.");
      // Y en español, lo de siempre, con «español»
      ponerIdioma('es');
      expect(sinVozAhora()).toBe('No encuentro una voz de Kokoro en español instalada en este computador, así que el director sigue sin voz, a su ritmo.');
    } finally {
      ponerIdiomaDelTexto(() => null);
      ponerIdioma('es');
      vi.unstubAllGlobals();
    }
  });

  it('la página le dice el idioma del documento abierto, una vez por documento', () => {
    const director = leer('app.ts');
    expect(director).toContain("if (vista === 'documentos' && doc) return idiomaDe(doc);");
    expect(director).toContain('const idioma = idiomaDeDocumento(x.ruta, x.texto);');
    expect(director).toContain('data-idioma="${idioma}"');
  });
});
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
    expect(guia.match(/function preparando\([\s\S]*?\n\}/)?.[0]).toContain("globo(b, tx('voz.preparandoGlobo'), 0);");
    expect(guia).toContain("gl-voz${preparandoEn ? ' gl-preparando' : ''}");
    expect(guia.match(/function callar\(\) \{[\s\S]*?\n\}/)?.[0]).toContain('preparando(null);');
    // Falla: se apaga, se dice y el director sigue a su ritmo
    expect(natural).toContain('ponerVoz(false);');
    expect(natural).toContain('fallar(fallaDeLaVoz(');
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

describe('la voz prepara la tarjeta que sigue mientras suena la de ahora (nota de voz del titular nmvv1xyz4tit, 30 de octubre de 2026)', () => {
  const palabras = (t: string) => palabrasDe(t).length;
  const rotulo = 'Para decidir:';
  const primero = 'La primera idea de la tarjeta que sigue.';
  const segundo = 'Y esta es otra idea, que se lee después.';

  it('de una tarjeta que aún no está en la ventana toma el primer bloque con director al que le falta por destapar', () => {
    // El rótulo de dos palabras no tiene director (MIN_PALABRAS): el primero con texto para leer
    expect(palabras(rotulo)).toBeLessThan(MIN_PALABRAS);
    expect(primerTextoPorLeer([rotulo, primero, segundo], () => -1)).toBe(primero);
    // Lo que se destapó entero (hasta su última palabra) ya no se lee: sigue el siguiente; a medias, sí se lee
    expect(primerTextoPorLeer([primero, segundo], (t) => (t === primero ? palabras(t) - 1 : -1))).toBe(segundo);
    expect(primerTextoPorLeer([primero, segundo], (t) => (t === primero ? palabras(t) - 2 : -1))).toBe(primero);
    // Si no queda ninguno por leer, no se pide nada
    expect(primerTextoPorLeer([rotulo, primero], palabras)).toBeNull();
    expect(primerTextoPorLeer([], () => -1)).toBeNull();
  });

  it('mientras suena un bloque, y solo con la voz de Kokoro, pide el audio del siguiente: el de la ventana o el de la tarjeta que sigue', () => {
    const guia = leer('guiaLectura.ts');
    const natural = guia.match(/function hablarNatural\(b: Bloque, natural: VozNatural\): boolean \{[\s\S]*?\n\}\n/)?.[0] ?? '';
    // Se pide cuando ya suena (después de play y de marcar que empezó), no antes: nunca hace esperar al de ahora
    expect(natural.indexOf('await audio.play();')).toBeGreaterThan(0);
    expect(natural.indexOf('prepararSiguiente(b, natural);')).toBeGreaterThan(natural.indexOf('actual.empezo = true;'));
    expect(natural.indexOf('actual.empezo = true;')).toBeGreaterThan(natural.indexOf('await audio.play();'));
    // Y solo la voz de Kokoro lo llama: la definición y esa llamada, nada más
    expect(guia.match(/prepararSiguiente\(/g)).toHaveLength(2);
    const preparar = guia.match(/function prepararSiguiente\(b: Bloque, natural: VozNatural\) \{[\s\S]*?\n\}\n/)?.[0] ?? '';
    // Lo de siempre: el siguiente bloque por leer de la misma ventana, con el texto que pedirá hablarNatural
    expect(preparar).toContain('const siguiente = lista.slice(lista.indexOf(b) + 1).find(sinTerminar);');
    expect(preparar).toContain('textoDe(enLaVentana.miembros).texto');
    // Nuevo: sin otro bloque antes de ella, la tarjeta que el Studio dejó en su <template>, por el mismo audioDe (la misma caché)
    expect(preparar).toContain('caja.querySelector<HTMLTemplateElement>(SIGUIENTE_IDEA)');
    expect(preparar).toContain('plantilla.compareDocumentPosition(siguiente.el) & Node.DOCUMENT_POSITION_FOLLOWING');
    expect(preparar).toContain('plantilla ? textoDeLaSiguiente(plantilla) : null');
    expect(preparar).toContain('if (texto) void audioDe(natural.id, texto).catch(() => {});');
    expect(guia).toContain('const AUDIOS_GUARDADOS = 12;');
  });

  it('el texto de la tarjeta que sigue se arma con las mismas piezas que el de su bloque al pintarla, para que la caché acierte', () => {
    const guia = leer('guiaLectura.ts');
    const deLaSiguiente = guia.match(/function textoDeLaSiguiente\(plantilla: HTMLTemplateElement\): string \| null \{[\s\S]*?\n\}\n/)?.[0] ?? '';
    // Sobre una copia del <template>: qué se lee junto (unidadesDe: lee, raizDe, GRUPO) y su texto (textoDe), sin copiar nada
    expect(deLaSiguiente).toContain('plantilla.content.cloneNode(true)');
    expect(deLaSiguiente).toContain('unidadesDe(copia).map(({ miembros }) => textoDe(miembros).texto)');
    // El mismo camino que el bloque de la ventana: escanear toma las unidades, adjuntar saca su texto y hablarNatural lo pide
    expect(guia.match(/function escanear\(\) \{[\s\S]*?\n\}/)?.[0]).toContain('for (const u of unidadesDe(caja)) {');
    expect(guia.match(/function adjuntar\([\s\S]*?\n\}/)?.[0]).toContain('const { nodos, texto } = textoDe(miembros);');
    expect(guia.match(/function hablarNatural\([\s\S]*?\n\}\n/)?.[0]).toContain('audioDe(natural.id, textoDe(b.miembros).texto)');
    // Con el mismo mínimo de palabras que adjuntar y el mismo recuerdo de lo leído (guardado, por la huella) que le da su punto
    expect(deLaSiguiente).toContain('(t) => guardado(huellaDe(t))');
    expect(guia.match(/function adjuntar\([\s\S]*?\n\}/)?.[0]).toContain('const antes = Math.min(guardado(huella), palabras.length - 1);');
    expect(guia.match(/export function primerTextoPorLeer\([\s\S]*?\n\}/)?.[0]).toContain('return textosPorLeer(textos, hasta)[0] ?? null;');
    expect(guia.match(/export function textosPorLeer\([\s\S]*?\n\}/)?.[0]).toContain('palabras >= MIN_PALABRAS && hasta(t) < palabras - 1');
    // Solo esto lee un <template>: la niebla, el reloj y la voz de ahora recorren la ventana sin entrar en él
    expect(guia.match(/\.content\b/g)).toHaveLength(1);
  });

  it('al abrir «¿Dónde quedamos?», la voz de todas sus pestañas y de las misiones se prepara de antemano, en orden y sin estorbar a lo que lees (pd_voz_precarga)', () => {
    // Todos los bloques por leer, en su orden y sin repetir; lo ya leído y lo que no tiene director no se prepara
    const a = 'La primera línea de una pestaña.';
    const b = 'Una línea de la pestaña siguiente.';
    expect(textosPorLeer(['Para decidir:', a, b, a], () => -1)).toEqual([a, b]);
    expect(textosPorLeer([a, b], (t) => (t === a ? palabrasDe(a).length - 1 : -1))).toEqual([b]);
    const director = leer('app.ts');
    // Al abrirse: el diálogo entero (todas sus pestañas, también las escondidas) y la tarjeta de tu misión de ahora y de
    // cada una de las que siguen, como se verá cuando sea la de ahora
    expect(director).toMatch(/dlg\.showModal\(\);\n\s*\/\/ Lo que se lee aquí[^\n]*\n\s*aplicarEnfoque\(\);\n\s*prepararLoQueSigue\(dlg\);/);
    const prepara = director.match(/function prepararLoQueSigue\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(prepara).toContain('misionesQueSiguen(reservaDeMisiones(d.plan, d.estado, yo), ahora?.id)');
    expect(prepara).toContain('if (dlg) prepararDelante(dlg);');
    expect(prepara).toContain('for (const m of misiones) prepararDeAntemano([tarjetaMision(m, false, 1), ...pasosPorVenir(m)], false, false, idiomaDeMision(m));');
    const guia = leer('guiaLectura.ts');
    // El texto de cada bloque, con las mismas piezas con que se pedirá al leerlo: el audio guardado es el mismo
    expect(guia.match(/function textosDeCajas\([\s\S]*?\n\}/)?.[0]).toContain('textosPorLeer(unidadesDe(el).map(({ miembros }) => textoDe(miembros).texto), (t) => guardado(huellaDe(t)))');
    // Uno a uno, y lo que lees va primero: la cola espera mientras se pide la voz de lo de ahora
    const cola = guia.match(/async function vaciarCola\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(cola).toContain('while (enPrimerPlano > 0)');
    expect(cola).toContain("fetch('/__estudio/voz/preparar'");
    expect(cola).toContain('p && vozPuesta()');
    expect(guia.match(/function audioDe\([\s\S]*?\n\}/)?.[0]).toContain('enPrimerPlano++;');
    expect(guia.match(/export function prepararDeAntemano\([\s\S]*?\n\}/)?.[0]).toContain('if (!vozPuesta()');
  });

  it('cada nota, cada paso que aún no se ve y la primera parte de cada documento quedan preparados antes de llegar a ellos (pd_voz_lista)', () => {
    const director = leer('app.ts');
    const prepara = director.match(/function prepararLoQueSigue\([\s\S]*?\n\}/)?.[0] ?? '';
    // La tarjeta muestra solo el paso que sigue: cada paso que viene después se prepara como se verá cuando sea el de ahora
    const porVenir = director.match(/function pasosPorVenir\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(porVenir).toContain('.filter((i) => i > sigue && !hechos.has(i))');
    expect(porVenir).toContain('`<article class="mision-c sigue mia">${enunciadoDeMision(m, new Set(m.pasos.map((_, k) => k).filter((k) => k < i)))}${listaDePasos(m, true, [i])}</article>`');
    expect(porVenir).not.toContain('m.porQue');
    // Todas las partes por leer de cada documento que piden las misiones, con la misma pintura que al leerlas (nmvzfcm2htit)
    expect(prepara).toContain('.then(() => partesPorLeer(misiones.flatMap(documentosDeMision), partesPedidas, true))');
    expect(prepara).toContain('.then((partes) => partes.length && prepararDeAntemano(partes));');
    const partes = director.match(/function partesPorLeerDe\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(partes).toContain("porTrozos(parte, [], 'parte')");
    expect(partes).toContain('!leidas.includes(p.titulo)');
    const porTrozos = director.match(/function porTrozos\([\s\S]*?\n\}\n/)?.[0] ?? '';
    expect(porTrozos).toContain("if (deLaSiguiente === 'parte') return ideas.filter((i) => !hecha(i)).map(tarjeta).join('');");
    // También al pintar «Hoy», sin abrir «¿Dónde quedamos?»
    expect(director).toContain("if (vista === 'misiones') prepararLoQueSigue();");
    // Una falla no detiene la cola entera: se salta, y solo varias seguidas la detienen
    expect(sigueLaCola(false, 0)).toEqual({ sigue: true, seguidas: 1 });
    expect(sigueLaCola(true, 2)).toEqual({ sigue: true, seguidas: 0 });
    expect(sigueLaCola(false, FALLAS_QUE_DETIENEN - 1)).toEqual({ sigue: false, seguidas: FALLAS_QUE_DETIENEN });
    const cola = leer('guiaLectura.ts').match(/async function vaciarCola\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(cola).not.toContain('if (!r?.ok) break;');
    expect(cola).toContain('if (!paso.sigue) break;');
  });

  it('la tarjeta de una misión no muestra su porQue: ni en el primer paso ni sin pasos; desde el segundo, «Siguiente paso» (nmw3s0bahtit, nmw3s3ux2tit)', () => {
    const m = { porQue: 'Te lo adelanto: por qué esta misión importa', pasos: ['Uno', 'Dos', 'Tres'] };
    expect(enunciadoDeMision(m, new Set())).toBe('');
    expect(enunciadoDeMision({ ...m, pasos: [] }, new Set())).toBe('');
    expect(leer('missionCard.ts')).not.toContain('class="porque"');
    // Tampoco el resumen de una misión entregada o pasada
    expect(leer('app.ts').match(/function misionPasada\([\s\S]*?\n\}/)?.[0]).not.toContain('m.porQue');
    // El segundo paso de ahora, y como se prepara cuando aún no llega: igual, con «Siguiente paso» y sin el enunciado
    const pintado = enunciadoDeMision(m, new Set([0]));
    expect(pintado).toBe('<p class="siguiente-paso">Siguiente paso</p>');
    expect(pintado).not.toContain(m.porQue);
    expect(enunciadoDeMision(m, new Set([0, 1]))).toBe(pintado);
    expect(enunciadoDeMision(m, new Set([0, 1, 2]))).toBe('');
    // Desmarcar el primero quita el rótulo, y el porQue tampoco vuelve
    expect(enunciadoDeMision(m, new Set([1]))).toBe('');
    // La tarjeta y lo preparado salen de la misma función, y el rótulo no lleva niebla ni voz
    expect(leer('missionCard.ts').match(/export function tarjetaMision\([\s\S]*?\n\}/)?.[0]).toContain('${enunciadoDeMision(m, hechos)}');
    expect(leer('missionCard.ts').match(/export function tarjetaMision\([\s\S]*?\n\}/)?.[0]).not.toContain('m.porQue');
    expect(leer('app.ts').match(/function pasosPorVenir\([\s\S]*?\n\}/)?.[0]).toContain('enunciadoDeMision(m, new Set(');
    expect(leer('guiaLectura.ts')).toMatch(/const FUERA = \[\n\s*'[^']*p\.siguiente-paso/);
    expect(DEL_MODELO as readonly string[]).not.toContain('siguiente-paso');
  });

  it('lo primero que vas a oír del documento al que te manda tu misión se prepara antes de abrirlo, delante de todo lo demás (pedido pd_precargar_doc)', () => {
    // La cola ya trae las tarjetas de tus misiones; lo primero del documento de tu misión de ahora pasa delante, una vez
    const v = 'kokoro_es';
    const tarjetas = ['El porqué de tu misión y su paso.', 'La tarjeta de la misión que sigue.', 'Lo primero del documento.'].map((texto) => ({ voz: v, texto }));
    const primero = { voz: v, texto: 'Lo primero del documento.' };
    expect(enCola(tarjetas, [primero], true)).toEqual([primero, tarjetas[0], tarjetas[1]]);
    // Sin `alFrente`, al final y sin repetir lo que ya esperaba: como antes
    expect(enCola(tarjetas.slice(0, 2), [primero, primero])).toEqual([...tarjetas.slice(0, 2), primero]);
    expect(enCola(tarjetas, [primero])).toEqual(tarjetas);
    const guia = leer('guiaLectura.ts');
    // Solo ese bloque, como elegiste: el resto se prepara mientras suena
    const antemano = guia.match(/export function prepararDeAntemano\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(antemano).toContain('textosDeCajas([c]).map((texto) => ({ texto, idioma: idiomaDeCaja(c) }))).slice(0, primero ? 1 : undefined);');
    expect(antemano).toContain('porPreparar.splice(0, porPreparar.length, ...enCola(porPreparar, nuevos, delante));');
    expect(antemano).toContain('primero = false, delante = primero');
    expect(guia).toContain('export const prepararPrimero = (caja: HTMLElement | string) => prepararDeAntemano([caja], true);');
    const director = leer('app.ts');
    const prepara = director.match(/function prepararLoQueSigue\([\s\S]*?\n\}/)?.[0] ?? '';
    // El documento del primer paso sin marcar que lleva a uno, antes que los de las demás misiones, y con su propio
    // registro: el que se preparó cuando venía después se adelanta al llegar a ser el de ahora
    expect(prepara).toContain('const suyo = ahora ? documentoDeLaMision(ahora) : undefined;');
    expect(prepara).toContain('void partesPorLeer(suyo ? [suyo] : [], primerosPedidos)');
    expect(prepara).toContain('.then(([caja]) => caja && prepararPrimero(caja))');
    expect(prepara.indexOf('prepararPrimero(caja)')).toBeLessThan(prepara.indexOf('partesPorLeer(misiones.flatMap(documentosDeMision)'));
    expect(director.match(/function documentoDeLaMision\([\s\S]*?\n\}/)?.[0]).toContain('m.pasos.find((p, i) => !hechos.has(i) && typeof p !== \'string\' && !!p.ir?.doc)');
    // Un documento sin partes (AGENTS.md) también: entero, en su única parte, como se pinta al abrirlo
    const parte = director.match(/function partesPorLeerDe\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(parte).toContain('secciones(otro.texto).filter((p) => paraLeer.has(p.titulo) && !leidas.includes(p.titulo))');
    expect(parte).toContain('`${lector}${parteEntera(conDecisiones(\'\', parte.md, []))}</div>`');
    expect(leer('vistaDocumentos.ts')).toContain("const cuerpo = porIdeas ? datos.porTrozos(s, notas) : datos.conDecisiones(s.titulo, s.md, notas.filter((x) => (x.sobre.seccion ?? '') === s.titulo && x.sobre.decision));");
  });

  it('el Studio pinta la tarjeta que sigue en un <template>, con las mismas funciones que la de ahora, y la primera de la otra parte si no queda otra', () => {
    const director = leer('app.ts');
    expect(director).toContain('<template class="idea-siguiente">');
    expect(leer('guiaLectura.ts')).toContain("const SIGUIENTE_IDEA = 'template.idea-siguiente';");
    const porTrozos = director.match(/function porTrozos\([\s\S]*?\n\}\n/)?.[0] ?? '';
    // La misma pintura (grupo y pintarTrozo) que la idea de ahora, sin su marca `actual`: esa arrancaría su seguro antes de tiempo
    const tarjeta = porTrozos.match(/const tarjeta = [^\n]*/)?.[0] ?? '';
    expect(tarjeta).toBe("const tarjeta = (i: number) => grupo(i).map((k) => pintarTrozo(k)).join('');");
    expect(porTrozos).toContain("grupo(i).map((k) => pintarTrozo(k, k === i ? ` actual${recienEntendida ? ' llega' : ''}` : ''))");
    // Después de las ideas a la vista, no dentro de ellas: el template no cambia lo que se ve ni lo que se lee
    expect(porTrozos.indexOf('<template class="idea-siguiente">')).toBeGreaterThan(porTrozos.indexOf('<div class="trozos">${ahora}</div>'));
    // La que sigue es la siguiente por entender de la parte; si no hay, la primera de la parte que se abre al terminarla
    expect(porTrozos).toContain('ideas.find((i) => i > actual && !hecha(i))');
    expect(porTrozos).toContain('proxima !== undefined ? tarjeta(proxima) : deOtraParte()');
    expect(porTrozos).toContain('porTrozos(otra, notas, true)');
    expect(porTrozos).toContain('(!leidas.includes(p.titulo) || reabierta(ruta, p))');
    // Para la otra parte solo se pinta esa tarjeta, antes de pintar nada de ella como la de ahora (ni su seguro ni su template)
    expect(porTrozos.indexOf('if (deLaSiguiente) return actual === undefined ? \'\' : tarjeta(actual);')).toBeGreaterThan(0);
    expect(porTrozos.indexOf('if (deLaSiguiente)')).toBeLessThan(porTrozos.indexOf('const ahora ='));
  });
});

describe('un documento que se lee entero, en bloques grandes: un ▶ y la voz sigue (nota de voz del titular nmvvmygfqtit)', () => {
  it('los puntos y párrafos seguidos de una misma parte van juntos, hasta el tope de palabras', () => {
    const parte = {};
    // Ocho puntos de 60 palabras, como los de AGENTS.md: dos bloques grandes, no ocho
    const puntos = Array.from({ length: 8 }, () => ({ parte, palabras: 60 }));
    const bloques = juntarEnBloques(puntos);
    expect(bloques.length).toBe(Math.ceil((8 * 60) / PALABRAS_POR_BLOQUE));
    expect(bloques.flat()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    for (const b of bloques) expect(b.reduce((s, i) => s + puntos[i].palabras, 0)).toBeLessThanOrEqual(PALABRAS_POR_BLOQUE);
  });

  it('nunca junta dos partes distintas, ni lo que se lee aparte; uno que ya pasa del tope va solo', () => {
    const a = {};
    const b = {};
    expect(juntarEnBloques([{ parte: a, palabras: 10 }, { parte: b, palabras: 10 }])).toEqual([[0], [1]]);
    // Lo que se lee aparte (una idea con su «Entendido», una tabla, lo comentado): parte null
    expect(juntarEnBloques([{ parte: a, palabras: 10 }, { parte: null, palabras: 10 }, { parte: a, palabras: 10 }])).toEqual([[0], [1], [2]]);
    expect(juntarEnBloques([{ parte: null, palabras: 10 }, { parte: null, palabras: 10 }])).toEqual([[0], [1]]);
    expect(juntarEnBloques([{ parte: a, palabras: PALABRAS_POR_BLOQUE + 50 }, { parte: a, palabras: 10 }])).toEqual([[0], [1]]);
  });

  it('el tope deja el audio de cada bloque muy por debajo de lo que lee una voz de una vez', () => {
    // Con palabras largas, de unos diez caracteres con su espacio, sigue cabiendo con holgura
    expect(PALABRAS_POR_BLOQUE * 10).toBeLessThan(6000);
  });

  it('en la ventana, los bloques se juntan por su parte del documento, salvo las ideas, las tablas y lo comentado', () => {
    const guia = leer('guiaLectura.ts');
    expect(guia).toContain("const PARTE_QUE_SE_JUNTA = '.parte-doc';");
    expect(guia).toContain("const NO_SE_JUNTA = '.cuerpo-trozo, table, .comentar-parte, .respuesta-dir';");
    const unidades = guia.match(/function unidadesDe\(caja: HTMLElement\): Unidad\[\] \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(unidades).toContain('return juntarEnBloques(');
    expect(unidades).toContain('{ el: unidades[g[0]].el, miembros: g.flatMap((i) => unidades[i].miembros) }');
    // Un bloque grande sigue en pie con sus miembros fuera de su raíz, y se mide de la raíz a su último miembro
    expect(guia).toContain('(m === el || el.contains(m) || (m.isConnected && caja.contains(m)))');
    expect(guia.match(/function medidas\([\s\S]*?\n\}/)?.[0]).toContain('const r = bordesDe(x);');
  });
});

import { colaConVozNueva, conVozNueva, idiomaDePreparacion } from './guiaLectura';

describe('la voz en inglés se prepara de antemano como la de español (nmw6r2nuwtit) y la niebla parte las palabras (nmw6rz7h6tit)', () => {
  const leerAqui = (...r: string[]) => readFileSync(join(__dirname, ...r), 'utf-8');
  it('cada misión se pone en la cola con la voz de su idioma, el mismo con que sonará: inglés con inglés, español con español', () => {
    const tarjeta = '<div class="mision-c">Look at the tour</div>';
    expect(idiomaDePreparacion(tarjeta, 'en')).toBe('en');
    expect(idiomaDePreparacion(tarjeta, 'es')).toBe('es');
    // Sin idioma de su misión, se queda en el de lo que se lee ahora (lo decide la cola, como antes)
    expect(idiomaDePreparacion(tarjeta, null)).toBeUndefined();
    // Un documento dice el suyo y manda
    expect(idiomaDePreparacion('<div class="lector" data-idioma="en"><p>x</p></div>', 'es')).toBe('en');
    const app = leerAqui('app.ts');
    // El idioma con que se prepara es el mismo con que suena: una sola función para los dos
    expect(app).toContain('return ahora ? idiomaDeMision(ahora) : null;');
    expect(app).toContain('function idiomaDeMision(m: Mision) {');
    const guia = leerAqui('guiaLectura.ts');
    expect(guia).toContain('const idiomaDeCaja = (c: HTMLElement | string) => idiomaDePreparacion(c, idioma);');
    expect(guia).toContain('const natural = idioma ? naturalActual(vozElegida(idioma), idioma) : naturalActual();');
  });

  it('bajo la niebla, el texto justificado lleva guiones con el idioma del bloque', () => {
    expect(leerAqui('guiaLectura.css')).toMatch(/html\.niebla-lectura \.gl-bloque \{\s*text-align: justify;\s*-webkit-hyphens: auto;\s*hyphens: auto;/);
    expect(leerAqui('guiaLectura.ts')).toContain('if (!el.lang) el.lang = idiomaDeLectura();');
  });
});

describe('al cambiar la voz, lo preparado vuelve a la cola con la voz nueva (nota de voz nmw2h8qm9tit)', () => {
  const pedidos = [
    { texto: 'Lo que avanzamos hoy.', idioma: 'es' },
    { texto: 'Your mission today.', idioma: 'en' },
    { texto: 'Tu misión de ahora.', idioma: 'es' },
    { texto: 'Lo que avanzamos hoy.', idioma: 'es' },
    { texto: 'El paso siguiente.', idioma: 'es' },
  ];

  it('los textos de ese idioma, con la voz nueva, en su orden y sin repetir; los de otro idioma no cambian de voz', () => {
    expect(conVozNueva(pedidos, 'es', 'kokoro:em_alex')).toEqual([
      { voz: 'kokoro:em_alex', texto: 'Lo que avanzamos hoy.' },
      { voz: 'kokoro:em_alex', texto: 'Tu misión de ahora.' },
      { voz: 'kokoro:em_alex', texto: 'El paso siguiente.' },
    ]);
    expect(conVozNueva(pedidos, 'fr', 'kokoro:ff_siwis')).toEqual([]);
  });

  it('la cola pierde lo que esperaba con la voz de antes y pone delante lo pedido con la nueva, sin repetir lo que ya esperaba con ella', () => {
    const cola = [
      { voz: 'kokoro:em_santa', texto: 'El paso siguiente.' },
      { voz: 'kokoro:bm_george', texto: 'Your mission today.' },
      { voz: 'kokoro:em_alex', texto: 'Tu misión de ahora.' },
    ];
    expect(colaConVozNueva(cola, pedidos, 'es', 'kokoro:em_alex')).toEqual([
      { voz: 'kokoro:em_alex', texto: 'Lo que avanzamos hoy.' },
      { voz: 'kokoro:em_alex', texto: 'Tu misión de ahora.' },
      { voz: 'kokoro:em_alex', texto: 'El paso siguiente.' },
      // Lo de otro idioma sigue con su voz, donde estaba
      { voz: 'kokoro:bm_george', texto: 'Your mission today.' },
    ]);
  });

  it('«Sonidos» lo pide al elegir la voz, y lo pedido de antemano queda anotado con su idioma', () => {
    const panel = readFileSync(join(import.meta.dirname, 'panelSonidos.ts'), 'utf8');
    expect(panel).toContain('elegirVoz(id, idiomaActual());\n  prepararConLaVozNueva(idiomaActual());');
    const guia = readFileSync(join(import.meta.dirname, 'guiaLectura.ts'), 'utf8');
    expect(guia.match(/export function prepararDeAntemano\([\s\S]*?\n\}/)?.[0]).toContain('anotarPedido({ texto, idioma: idioma ?? idiomaDeLectura() });');
    const nueva = guia.match(/export function prepararConLaVozNueva\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(nueva).toContain('if (!vozPuesta()');
    expect(nueva).toContain('colaConVozNueva(porPreparar, pedidosAnotados, idioma, natural.id)');
    expect(nueva).toContain('void vaciarCola();');
  });
});
