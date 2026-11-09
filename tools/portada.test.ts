// La portada de la página pública (la animación de la línea del proyecto) es un solo archivo HTML con su código dentro:
// que su código se pueda leer (un error de sintaxis la dejaría quieta y en blanco para quien la abra).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { ARCHIVOS_THREE, CARPETA_THREE, importsSinRuta, IMPORTS_THREE, paginaDelRecorrido, resolverConImportmap } from './portada3d.ts';

const html = readFileSync(join(import.meta.dirname, '..', 'docs/difusion/linea-del-proyecto.html'), 'utf8');
const raiz = join(import.meta.dirname, '..');

describe('«What is STL» upright, a vertical frame that zooms in and follows you (nmw8fv481tit, replacing the band of nmw86aqe2tit)', () => {
  // The functions, taken from the page, run with the scene's state as plain variables
  const funcion = (nombre: string) => { const i = html.indexOf(`function ${nombre}(`); return html.slice(i, html.indexOf('\n  }\n', i) + 4); };
  type Estado = { modo: string; cabeza?: number; hebras?: { x: number }[]; st?: { x: number; a: number } | null; dirX?: number; dirA?: number; u?: unknown; aisla?: number };
  const encuadre = (e: Estado, pie: Record<string, number> = {}) => {
    const puesto: number[][] = [];
    const ctx = { setTransform: (...a: number[]) => puesto.push(a), save: () => {}, restore: () => {}, translate: () => {} };
    const PIE = { activo: true, ancho: 360, hud: 0.8, franja: 59, cssW: 390, cssH: 560, r: 1, my: 46, piso: 452, cima: 18, ...pie };
    const f = new Function('e', 'PIE', 'ctx', `const W = 1000, X0 = 60, META = 830; let MX = 500; const lerp = (a, b, k) => a + (b - a) * k; const tope = (k) => Math.max(0, Math.min(1, k));
      let { modo, cabeza, hebras, st = null, dirX, dirA = 0, u = null, aisla = 0 } = e;
      ${funcion('centroDePie')} ${funcion('encuadrar')} ${funcion('enBanda')}
      encuadrar(); const modelo = MX; enBanda(0, 16, 10, () => {}); enBanda(1, 756, 10, () => {}); return modelo;`);
    const modelo = f(e, PIE, ctx) as number;
    const [z, , , , tx, ty] = puesto[0];
    return { modelo, desde: -tx / z, hasta: (390 - tx) / z, z, ty, hud: puesto.slice(1) };
  };

  it('the attention and the tokens side by side at the top, the model back in the center and lower, the canvas filling the height', () => {
    expect(html).toContain("function zoomAtencion(now) { enBanda(0, 16, 10, () => zoomAtencionAqui(now)); }");
    expect(html).toContain("function contadorTokens(now) { enBanda(1, W - 16 - 228, 10, () => contadorTokensAqui(now)); }");
    expect(html).toContain("MX = W / 2; MY = recto ? PIE.my : 30;");
    expect(html).toContain('aspect-ratio: var(--aspecto, 1000 / 460);');
    expect(html).toContain('ctx.clearRect(-W, -H, 3 * W, 3 * H);');
    // Lower than the computer's 30, and the frame never closer than 340 points of the world nor wider than the line
    expect(html).toContain('PIE.ancho = Math.max(340, Math.min(868, (ancho * alto) / Math.max(1, libre - PIE.franja)));');
    const { hud } = encuadre({ modo: 'sin', hebras: [{ x: 60 }] });
    // Same height, the attention on the left and the tokens on the right, both inside the 390 px
    expect(hud[0][5]).toBe(hud[1][5]);
    expect(hud[0][4]).toBeGreaterThan(0);
    expect(hud[1][4]).toBeGreaterThan(hud[0][4] + 228 * 0.8);
    expect(hud[1][4] + 228 * 0.8).toBeLessThanOrEqual(390);
  });

  it('the frame starts at the start of the line, moves right with you, keeps the model at its center, and goes back to the start for «With STL»', () => {
    const inicio = encuadre({ modo: 'sin', hebras: [{ x: 60 }] });
    expect(inicio.desde).toBeLessThan(20);
    expect(inicio.hasta - inicio.desde).toBeCloseTo(360);
    expect(inicio.z).toBeCloseTo(390 / 360);
    const lejos = encuadre({ modo: 'sin', hebras: [{ x: 560 }] });
    expect(lejos.desde).toBeGreaterThan(inicio.desde + 300);
    // You stay inside the frame, a little behind its center: what comes ahead is in view
    expect(560).toBeGreaterThan(lejos.desde + 60); expect(560).toBeLessThan(lejos.modelo);
    expect(lejos.modelo).toBeCloseTo((lejos.desde + lejos.hasta) / 2);
    // With STL it starts again at the start of the line and reaches the goal without passing it
    expect(encuadre({ modo: 'con', cabeza: 60 }).desde).toBeLessThan(20);
    const meta = encuadre({ modo: 'con', cabeza: 860 });
    expect(meta.hasta).toBeGreaterThanOrEqual(880); expect(meta.hasta).toBeLessThanOrEqual(893);
    // The line (Y = 372) and what goes under it stay inside the canvas: the bottom of the world at the bottom
    expect(inicio.ty + 452 * inicio.z).toBeCloseTo(560);
  });

  it('what acts far from you (the Studio apart with the urgency, the director) opens the frame just enough, so nothing is cut at the sides', () => {
    const solo = encuadre({ modo: 'con', cabeza: 300, st: { x: 320, a: 1 }, dirX: 340, dirA: 1 });
    expect(solo.hasta - solo.desde).toBeCloseTo(360);
    const aparte = encuadre({ modo: 'con', cabeza: 300, st: { x: 680, a: 1 }, dirX: 600, dirA: 1 });
    expect(aparte.hasta).toBeGreaterThanOrEqual(680 + 44);
    expect(aparte.desde).toBeLessThan(300 - 30);
  });

  it('«Without STL · With STL» at the top center, a smaller title, subtitles only as tall as their lines, and one line for time, voice and speeds', () => {
    expect(html).toContain('#todo.vertical #modos { order: -1; justify-self: center; }');
    expect(html).toContain('#todo.vertical h1 { justify-self: center; text-align: center; font-size: clamp(12px, 3.6vw, 16px); }');
    expect(html).toMatch(/#todo\.vertical #estado \{\s*width: 100%; min-height: 0;/);
    expect(html).toContain('#todo.vertical #velocidad { flex: 1 1 0; min-width: 0; margin: 0; gap: 3px; flex-wrap: nowrap;');
    // The computer and the phone on its side do not change
    expect(html).toContain('PIE.activo = recto;');
  });
});

describe('el recorrido en 3D como portada pública (t_decide_portada, nmw2c1m7ktit)', () => {
  const mundo = readFileSync(join(raiz, 'docs/difusion/mundo-3d.html'), 'utf8');
  const js = readFileSync(join(raiz, 'docs/difusion/mundo-3d.js'), 'utf8');
  const publicar = readFileSync(join(raiz, 'tools/publicar-stl.ts'), 'utf8');

  it('cada import sin ruta del recorrido lo lleva el importmap a un archivo de three.js que se copia al sitio', () => {
    const nombres = importsSinRuta(js);
    expect(nombres).toEqual(['three', 'three/examples/jsm/geometries/RoundedBoxGeometry.js']);
    for (const n of nombres) {
      const destino = resolverConImportmap(n);
      expect(destino).not.toBeNull();
      const relativo = destino!.replace(`./${CARPETA_THREE}/`, '');
      expect(ARCHIVOS_THREE).toContain(relativo);
    }
    // Lo que importan esos archivos, también: three.module.js trae three.core.js, y RoundedBoxGeometry, «three»
    const modulo = readFileSync(join(raiz, 'node_modules/three/build/three.module.js'), 'utf8');
    if (modulo.includes("from './three.core.js'")) expect(ARCHIVOS_THREE).toContain('build/three.core.js');
    expect(importsSinRuta(readFileSync(join(raiz, 'node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js'), 'utf8'))).toEqual(['three']);
    for (const a of ARCHIVOS_THREE) expect(existsSync(join(raiz, 'node_modules/three', a))).toBe(true);
  });

  it('la página del recorrido lleva el importmap antes de su módulo, su título y metas, y sin la historia del boceto', () => {
    const pagina = paginaDelRecorrido(mundo, '<title>T</title>\n<meta name="description" content="D" />');
    const mapa = pagina.indexOf('<script type="importmap">');
    expect(mapa).toBeGreaterThan(-1);
    expect(mapa).toBeLessThan(pagina.indexOf('<script type="module" src="./mundo-3d.js"></script>'));
    expect(JSON.parse(pagina.match(/<script type="importmap">(.*?)<\/script>/)![1])).toEqual({ imports: IMPORTS_THREE });
    expect(pagina).toContain('<title>T</title>');
    expect(pagina.match(/<meta name="description"/g)).toHaveLength(1);
    expect(pagina).not.toContain('El recorrido en 3D de «Qué es STL» (pd_recorrido_3d');
    // Si un día el módulo se carga de otra forma, avisa en vez de publicar una página que no anda
    expect(() => paginaDelRecorrido('<html></html>', '')).toThrow(/importmap/);
  });

  it('la publicación arma la portada con el recorrido, su módulo, three.js, sus voces y la animación de la línea a su lado', () => {
    expect(publicar).toContain("writeFileSync(join(salida, 'index.html'), portada);");
    expect(publicar).toContain("copyFileSync(join(raiz, MODULO_RECORRIDO), join(salida, 'mundo-3d.js'));");
    expect(publicar).toContain("writeFileSync(join(salida, 'linea-del-proyecto.html'), linea);");
    expect(publicar).toContain('for (const archivo of ARCHIVOS_THREE) {');
    expect(publicar).toContain("copyFileSync(join(raiz, VOZ_RECORRIDO, archivo), join(salida, 'voz', 'es', archivo));");
    // El recorrido abre la animación por su nombre, junto a él
    expect(mundo).toContain('<iframe data-src="linea-del-proyecto.html"');
    // Subir sigue pasando primero por la cuenta aprobada (cuentaGit.ts)
    expect(publicar.indexOf('sesionAprobada(')).toBeLessThan(publicar.indexOf("git('commit'"));
  });
});

describe('la portada de «Qué es STL»', () => {
  it('su código se puede leer, y no arranca sola', () => {
    const codigos = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(codigos.length).toBeGreaterThan(0);
    for (const c of codigos) expect(() => new Function(c)).not.toThrow();
    expect(html).toContain('stl.portada.vista');
  });

  it('dentro del recorrido en 3D empieza sola a los 2 segundos, sin «Iniciar la presentación» ni su invitación; sola, espera (nmw197t4jtit)', () => {
    expect(html).toContain('try { enVisor = window.self !== window.top; } catch { enVisor = true; }');
    expect(html).toContain('const ARRANQUE_EN_VISOR = 2000;');
    expect(html).toContain("if (enVisor) $('invita').remove();\n  else mando.classList.add('llama');");
    expect(html).toContain('iniciarBtn.remove();');
    expect(html).toContain('setTimeout(() => { if (!bienvenida.hidden) cerrarBienvenida(!quieto); else if (!quieto) iniciar(); }, ARRANQUE_EN_VISOR);');
    // La explicación de la bienvenida se queda
    expect(html).toContain('Te lo explicamos clarito');
    // El arranque va después de declarar la bienvenida
    expect(html.indexOf('ARRANQUE_EN_VISOR);')).toBeGreaterThan(html.indexOf("const VISTA = 'stl.portada.vista'"));
  });

  it('el chiste escondido: después de la meta, cada 10 segundos de más, un globito con una de las quince frases aprobadas, barajadas y sin repetir hasta agotarlas (pd_globitos, nmw0xtin3tit)', () => {
    const bloque = html.match(/ {2}const GLOBITOS = [\s\S]*?\n {2}function globitoDeMeta/)?.[0].replace(/function globitoDeMeta$/, '') ?? '';
    const f = new Function(`${bloque} return { GLOBITOS, globitoDe, CADA_GLOBITO };`)() as { GLOBITOS: string[]; globitoDe: (extra: number) => { texto: string; k: number } | null; CADA_GLOBITO: number };
    expect(f.GLOBITOS).toHaveLength(15);
    expect(f.GLOBITOS).toContain('Hey, ¿todavía estás aquí?');
    expect(f.GLOBITOS).toContain('Sin prisa. Pero aquí no hay nada.');
    expect(f.CADA_GLOBITO).toBe(10000);
    // Antes de los primeros 10 segundos de más, nada; y entre un globito y el siguiente, un rato sin ninguno
    expect(f.globitoDe(0)).toBeNull();
    expect(f.globitoDe(9999)).toBeNull();
    expect(f.globitoDe(10000)).not.toBeNull();
    expect(f.globitoDe(17000)).toBeNull();
    // Las quince primeras, todas distintas; y la vuelta siguiente, otra vez las quince
    const vuelta = (v: number) => Array.from({ length: 15 }, (_, i) => f.globitoDe((v * 15 + i + 1) * 10000 + 100)?.texto);
    expect(new Set(vuelta(0)).size).toBe(15);
    expect(new Set(vuelta(1)).size).toBe(15);
    expect(vuelta(0)).not.toEqual(f.GLOBITOS);   // barajadas, no en orden
    // La misma vuelta sale igual al volver con la perilla
    expect(vuelta(0)).toEqual(vuelta(0));
    // Solo en la meta, y encima del dibujo de «con STL»
    expect(html).toContain("function dibujar(now) { encuadrar(); if (modo === 'sin') dibujarSin(now); else { dibujarCon(now); globitoDeMeta(now); } }");
    expect(html).toContain("if (fase !== 'meta') return;");
  });

  it('el globito sale justo encima del Studio, nunca sobre el contador de tokens de arriba, y sin salirse del dibujo (nmw479zmetit)', () => {
    const bloque = html.match(/ {2}function lugarDelGlobito[\s\S]*?\n {2}\}\n/)?.[0] ?? '';
    const lugarDelGlobito = new Function(`const W = 1000; ${bloque} return lugarDelGlobito;`)() as (sx: number, sy: number, s: number, w: number) => { x: number; y: number; pico: number };
    // Encima del Studio: el globito (de y - 16 a y + 24, con su piquito) termina antes de su borde de arriba, y apunta a él
    const sobre = lugarDelGlobito(700, 260, 20, 240);
    expect(sobre.y + 24).toBeLessThan(260 - 20);
    expect(sobre.x).toBe(700);
    expect(sobre.pico).toBe(700);
    // Nunca sube a la franja de arriba, la del contador de tokens, ni se sale por los lados
    expect(lugarDelGlobito(700, 60, 20, 240).y - 16).toBeGreaterThanOrEqual(54);
    const borde = lugarDelGlobito(990, 260, 20, 240);
    expect(borde.x + 120).toBeLessThanOrEqual(1000 - 10);
    // Ya no se mide la perilla: va con el Studio
    expect(html).toContain('lugar = lugarDelGlobito(st.x, st.y, 20, w)');
    expect(html).not.toContain('arribaDelMando');
  });

  it('después de la meta la línea sigue corriendo sin fin, y el botón del centro solo la detiene o la sigue, sin volver a empezarla (nmw2cw8xmtit)', () => {
    const meta = html.match(/\} else if \(fase === 'meta'\) \{[\s\S]*?\n {4}\}\n/)?.[0] ?? '';
    expect(meta).toContain("if (t >= durFase && midiendo) { termino = true; return; }");
    // Ya no se detiene sola al llegar a la meta
    expect(meta).not.toContain('reproduce = false');
    const alternar = html.match(/function alternar\(\) \{[\s\S]*?\n {2}\}/)?.[0] ?? '';
    expect(alternar).toContain('reproduce = !reproduce;');
    // Ni la vuelve a empezar desde el principio
    expect(alternar).not.toContain('buscar = 0');
  });
});

describe('en una pantalla pequeña, la animación usa el ancho y sus mandos no se amontonan (nota de voz nmw40vdvitit)', () => {
  it('si el alto limita el dibujo y sobra ancho, la perilla y sus mandos van afuera, a su derecha, en su propia columna; si no cabe, se quedan dentro', () => {
    const bloque = html.match(/ {2}function mandoAfuera\(vw, ancho\) \{[\s\S]*?\n {2}\}\n/)?.[0] ?? '';
    const mandoAfuera = new Function(`${bloque} return mandoAfuera;`)() as (vw: number, ancho: number) => number;
    // Más chica que antes (nmw473qxdtit): de 104 a 136 px
    expect(mandoAfuera(1078, 780)).toBeGreaterThanOrEqual(104);   // un portátil de 1360, en el recuadro del recorrido
    expect(mandoAfuera(1078, 780)).toBeLessThanOrEqual(136);
    expect(mandoAfuera(1360, 1260)).toBe(0);                        // el dibujo ya usa casi todo el ancho
    expect(html).toContain("todo.classList.toggle('mando-fuera', columna > 0);");
    expect(html).toContain('canvas { width: var(--lienzo, 100%);');
    expect(html).toContain('#todo.mando-fuera #perilla { width: min(100%, 80px); }');
    // Sin la línea de las cifras de abajo, y el dibujo sin otro tope que la pantalla (nmw473qxdtit, nmw479zmetit)
    expect(html).not.toContain('<div id="cuenta">');
    const ancho = new Function(`const W = 1000, H = 460; ${html.match(/ {2}function anchoDelDibujo[\s\S]*?\n {2}\}\n/)?.[0] ?? ''} return anchoDelDibujo;`)() as (vw: number, vh: number, resto: number) => number;
    expect(ancho(1900, 1000, 100)).toBeGreaterThan(1240);
    expect(ancho(1400, 600, 80)).toBe(Math.floor((520 * 1000) / 460));
    expect(ancho(1078, 900, 80)).toBe(1078 - 16);
    // En el visor, el título se va al visor y el interruptor baja a la columna de los mandos: el dibujo gana ese alto
    expect(html).toContain(".en-visor h1 { display: none; }");
    expect(html).toContain("if (enVisor) document.documentElement.classList.add('en-visor');");
    expect(html).toContain("$('mando').prepend(modos);");
    expect(html.indexOf("if (enVisor) document.documentElement.classList.add('en-visor');")).toBeLessThan(html.indexOf('  disponer();\n'));
    // El título, más chico, y en su portada nunca encima de la perilla
    expect(html).toContain('h1 { justify-self: start; font-size: clamp(13px, calc(var(--ancho) / 62), 19px);');
    expect(html).toContain("if (pisa(s)) { h1.style.transform = ''; return; }");
  });
});
