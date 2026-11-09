// La regla del titular para toda animación del recorrido (nota de voz nmw5d6iqctit, 6 de noviembre de 2026): ningún
// elemento se sale de su contenedor ni pisa a otro, porque eso da una muy mala imagen de la animación
// (reglasDelTitular.ts › sin_superponer). Esta prueba dibuja cada situación y cada solución de «¿Te ha pasado…?» cuadro a
// cuadro con un lienzo de mentira, anota la caja de cada letrero, de cada recuadro y de cada ventana que dibujan sus
// funciones (letrero, caja, ventana y globo), y revisa en cada cuadro que dos letreros no se crucen, que un letrero o un
// recuadro no quede a medias sobre otro (o adentro del todo, o afuera del todo) y que nada se salga de su ventana. El ancho
// de cada letra es una estimación de la letra de la página (0,55 de su tamaño), la misma con que el globo mide su texto.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const raiz = join(import.meta.dirname, '..');
const js = readFileSync(join(raiz, 'docs/difusion/mundo-3d.js'), 'utf8');

// 'actor' es lo que ocupa su lugar y no contiene nada (un actor, un ícono, una palomita): nada puede cruzarlo ni ir encima.
// 'caja', 'ventana' y el Studio (que dibuja su marco con la cara de atrás) son contenedores: lo de adentro, entero adentro.
interface Caja { tipo: 'letrero' | 'caja' | 'ventana' | 'actor'; x: number; y: number; w: number; h: number; que: string }

const ANCHO_LETRA = 0.55;
const tamanoDe = (font: unknown) => Number(/(\d+(?:\.\d+)?)px/.exec(String(font ?? ''))?.[1] ?? 10);

function preparar(en = false) {
  const colores = js.match(/const ORO = [^\n]+\nconst VERDE = [^\n]+\n/)?.[0] ?? '';
  const dibujo = js.slice(js.indexOf('// ── Las mini animaciones de los problemas'), js.indexOf('function iniciar() {'));
  const nada = () => undefined;
  // El lienzo de mentira lleva la cuenta de translate, scale y setTransform (lo único que usa el dibujo): [escalaX, escalaY,
  // dx, dy]. Las cajas se anotan ya en las unidades de 320 × 200 de la página (el lienzo real, de 1280 × 800, escala por 4)
  let m = [1, 1, 0, 0];
  let pila: number[][] = [];
  const reiniciar = () => { m = [1, 1, 0, 0]; pila = []; };
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (o, k) => k in o ? o[k as string]
      : k === 'measureText' ? (t: string) => ({ width: t.length * tamanoDe(o.font) * ANCHO_LETRA })
        : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop: nada })
          : k === '__matriz' ? m
            : k === 'save' ? () => { pila.push([...m]); }
              : k === 'restore' ? () => { m = pila.pop() ?? [1, 1, 0, 0]; }
                : k === 'translate' ? (x: number, y: number) => { m = [m[0], m[1], m[2] + m[0] * x, m[3] + m[1] * y]; }
                  : k === 'scale' ? (a: number, b: number) => { m = [m[0] * a, m[1] * b, m[2], m[3]]; }
                    : k === 'setTransform' ? (a: number, _b: number, _c: number, d: number, e: number, g: number) => { m = [a / 4, d / 4, e / 4, g / 4]; }
                      : nada,
    set: (o, k, v) => { o[k as string] = v; return true; },
  });
  const anotadas: Caja[] = [];
  // Las funciones que ocupan lugar, envueltas para anotar su caja real (nota nmw5eoz0rtit: los actores y los íconos también
  // cuentan, no solo los letreros y los recuadros); las demás, como son. El «Studio» es un contenedor que incluye su cara de
  // atrás (desplazada d hacia abajo y a la derecha); el resto de los actores, un sólido: el desarrollador mide 18 s de lado,
  // el director r × 1,5 y el modelo r × 1,8, todos centrados en (x, y)
  const envolver = `
    const nota = (c, tipo, x, y, w, h, que) => { const [sx, sy, tx, ty] = c.__matriz ?? [1, 1, 0, 0]; anotadas.push({ tipo, x: x * sx + tx, y: y * sy + ty, w: w * sx, h: h * sy, que }); };
    let nombreCaja = null;
    letrero = ((f) => (c, texto, x, y, color, tam = 10, alinea = 'center') => {
      const w = String(D(texto)).length * tam * ${ANCHO_LETRA}, x0 = alinea === 'left' ? x : alinea === 'right' ? x - w : x - w / 2;
      if (String(texto).trim()) nota(c, 'letrero', x0, y - tam * 0.78, w, tam * 1.0, String(D(texto)));
      return f(c, texto, x, y, color, tam, alinea);
    })(letrero);
    caja = ((f) => (c, x, y, w, h, ...resto) => { nota(c, 'caja', x, y, w, h, nombreCaja ?? 'recuadro'); return f(c, x, y, w, h, ...resto); })(caja);
    ventana = ((f) => (c, x, y, w, h, titulo, ...resto) => { nota(c, 'ventana', x, y, w, h, 'ventana «' + titulo + '»'); return f(c, x, y, w, h, titulo, ...resto); })(ventana);
    globo = ((f) => (c, x, y, texto, ...resto) => { const antes = nombreCaja; nombreCaja = 'globo «' + texto + '»'; try { return f(c, x, y, texto, ...resto); } finally { nombreCaja = antes; } })(globo);
    carpeta = ((f) => (c, x, y, w, h, color, nombre) => { nota(c, 'caja', x, y - 8, w, h + 8, 'carpeta'); return f(c, x, y, w, h, color, nombre); })(carpeta);
    actorDev = ((f) => (c, x, y, s, ...resto) => { nota(c, 'actor', x - 9 * s, y - 9 * s, 18 * s, 18 * s, 'el desarrollador'); return f(c, x, y, s, ...resto); })(actorDev);
    actorDirector = ((f) => (c, x, y, r) => { const l = r * 1.5; nota(c, 'actor', x - l / 2, y - l / 2, l, l, 'el director'); return f(c, x, y, r); })(actorDirector);
    actorModelo = ((f) => (c, x, y, r, ...resto) => { const l = r * 1.8; nota(c, 'actor', x - l / 2, y - l / 2, l, l, 'el modelo'); return f(c, x, y, r, ...resto); })(actorModelo);
    actorStudio = ((f) => (c, x, y, w, h, ...resto) => { const d = Math.min(3.5, h * 0.1); nota(c, 'caja', x, y, w + d, h + d, 'el Studio'); return f(c, x, y, w, h, ...resto); })(actorStudio);
    iconoNota = ((f) => (c, tipo, x, y, s = 1, alfa = 1) => {
      const e = { falla: [-0.3, -0.5, 0.3, 0.52], idea: [-0.38, -0.64, 0.38, 0.42], ajuste: [-0.46, -0.46, 0.46, 0.46], pregunta: [-0.42, -0.28, 0.42, 0.28] }[tipo] ?? [-0.46, -0.34, 0.46, 0.46], k = s * 14;
      nota(c, 'actor', x + e[0] * k, y + e[1] * k, (e[2] - e[0]) * k, (e[3] - e[1]) * k, 'ícono «' + tipo + '»');
      return f(c, tipo, x, y, s, alfa);
    })(iconoNota);
    palomita = ((f) => (c, x, y, r, ...resto) => { nota(c, 'actor', x - r - 1.1, y - r * 0.7 - 1.1, 2 * r + 2.2, 1.4 * r + 2.2, '✓'); return f(c, x, y, r, ...resto); })(palomita);
    cruz = ((f) => (c, x, y, r, ...resto) => { nota(c, 'actor', x - r - 1.1, y - r - 1.1, 2 * r + 2.2, 2 * r + 2.2, '✗'); return f(c, x, y, r, ...resto); })(cruz);
    lupa = ((f) => (c, x, y, r = 7) => { nota(c, 'actor', x - r - 1, y - r - 1, r * 2.6 + 2, r * 2.6 + 2, 'la lupa'); return f(c, x, y, r); })(lupa);
    altavoz = ((f) => (c, x, y) => { nota(c, 'actor', x - 7, y - 8, 19, 16, 'el altavoz'); return f(c, x, y); })(altavoz);
    microfono = ((f) => (c, x, y, color, s = 1) => { nota(c, 'actor', x - 8.3 * s, y - 15.8 * s, 16.6 * s, 24.6 * s, 'el micrófono'); return f(c, x, y, color, s); })(microfono);
    relojito = ((f) => (c, x, y, r, k) => { nota(c, 'actor', x - r - 0.6, y - r - 0.6, 2 * r + 1.2, 2 * r + 1.2, 'el reloj'); return f(c, x, y, r, k); })(relojito);
    wifi = ((f) => (c, x, y, color, cortado = false, alfa = 1) => {
      if (cortado) nota(c, 'actor', x - 13, y - 8, 26, 24, 'la señal'); else nota(c, 'actor', x - 10.7 - 0.9, y - 7 - 0.9, 21.4 + 1.8, 17.9 + 1.8, 'la señal');
      return f(c, x, y, color, cortado, alfa);
    })(wifi);
  `;
  const f = new Function('anotadas', 'document', `${colores}${dibujo}; ${envolver} return { SEGMENTOS, GRANDES, PASOS_SEG, ESCENAS_COMO, CIERRES, GUION_COMO, CONTENIDO, caja, letrero, pintarCierre, pintarComo, tamanoQueCabe, pintarBucleInstalar, BUCLE_SEG, BUCLE_TIEMPOS, VERTICAL, VERTICALES, esVertical, pintarCierreVertical, pintarEnunciadoVertical };`)(anotadas, en ? { documentElement: { lang: 'en' } } : undefined) as {
    SEGMENTOS: ({ problema: (c: unknown, q: number) => void; solucion: (c: unknown, q: number, tinta: string) => void } | null)[];
    VERTICAL: { ancho: number; alto: number };
    VERTICALES: Record<number, { problema: (c: unknown, q: number) => void; solucion: (c: unknown, q: number, tinta: string) => void }>;
    esVertical: (i: number) => boolean;
    pintarCierreVertical: (c: unknown, resuelto: string, frase: string, q: number) => void;
    pintarEnunciadoVertical: (c: unknown, texto: string, q: number) => void;
    GRANDES: number[][];
    PASOS_SEG: { problema: [number, string][]; solucion: [number, string][] }[];
    ESCENAS_COMO: unknown[];
    CIERRES: ([string, string] | null)[];
    GUION_COMO: { escenas: string[]; cierre: string };
    CONTENIDO: { x: number; y: number; escala: number };
    caja: (c: unknown, x: number, y: number, w: number, h: number, color: string, relleno?: number, r?: number) => void;
    letrero: (c: unknown, texto: string, x: number, y: number, color?: string, tam?: number, alinea?: string) => void;
    pintarCierre: (c: unknown, resuelto: string, frase: string, q: number, cual: string, etiqueta?: string) => void;
    pintarComo: (c: unknown, k: number, q: number, p: number) => void;
    tamanoQueCabe: (c: unknown, texto: string, tam: number, ancho: number) => number;
    pintarBucleInstalar: (c: unknown, s: number) => number;
    BUCLE_SEG: number;
    BUCLE_TIEMPOS: number;
  };
  return { ...f, ctx, anotadas, reiniciar };
}

const MARGEN = 0.5;   // medio punto de holgura: lo que se toca en el borde no se pisa
const cruzan = (a: Caja, b: Caja) => a.x < b.x + b.w - MARGEN && b.x < a.x + a.w - MARGEN && a.y < b.y + b.h - MARGEN && b.y < a.y + a.h - MARGEN;
const dentro = (a: Caja, b: Caja) => a.x >= b.x - MARGEN && a.y >= b.y - MARGEN && a.x + a.w <= b.x + b.w + MARGEN && a.y + a.h <= b.y + b.h + MARGEN;
const igual = (a: Caja, b: Caja) => Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01 && Math.abs(a.w - b.w) < 0.01 && Math.abs(a.h - b.h) < 0.01;

/** Lo que se pisa en un cuadro: cada par que se cruza sin que uno contenga al otro, y cada letrero cruzado con otro. */
export function choques(cajas: Caja[]): string[] {
  // La caja con que la ventana se dibuja es la ventana misma
  const todas = cajas.filter((c) => !(c.tipo === 'caja' && cajas.some((v) => v.tipo === 'ventana' && igual(v, c))));
  const malos: string[] = [];
  for (let i = 0; i < todas.length; i++) for (let j = i + 1; j < todas.length; j++) {
    const a = todas[i], b = todas[j];
    if (!cruzan(a, b)) continue;
    const nombre = (c: Caja) => (c.tipo === 'letrero' ? `«${c.que}»` : c.que);
    if (a.tipo === 'letrero' && b.tipo === 'letrero') { malos.push(`«${a.que}» pisa «${b.que}»`); continue; }
    // Un actor o un ícono ocupa su lugar: solo puede estar entero dentro de un recuadro o una ventana, nunca cruzado con un
    // letrero ni con otro actor, ni con letreros encima de él
    if (a.tipo === 'actor' || b.tipo === 'actor') {
      const [s, o] = a.tipo === 'actor' ? [a, b] : [b, a];
      if ((o.tipo === 'caja' || o.tipo === 'ventana') && dentro(s, o)) continue;
      malos.push(`${nombre(s)} y ${nombre(o)} se pisan`);
      continue;
    }
    if (dentro(a, b) || dentro(b, a)) continue;
    malos.push(`${nombre(a)} se sale de ${nombre(b)} o la pisa`);
  }
  return malos;
}

describe('ningún elemento de las animaciones se sale de su contenedor ni pisa a otro (regla del titular, nmw5d6iqctit)', () => {
  it('la prueba ve lo que pisa: un letrero sobre otro y una tarjeta que se sale de su ventana', () => {
    const ventana: Caja = { tipo: 'ventana', x: 30, y: 22, w: 260, h: 140, que: 'ventana' };
    expect(choques([ventana, { tipo: 'caja', x: 28, y: 34, w: 110, h: 62, que: 'tarjeta' }])).toHaveLength(1);
    expect(choques([{ tipo: 'letrero', x: 150, y: 80, w: 90, h: 9, que: 'Haz que el botón…' }, { tipo: 'letrero', x: 225, y: 88, w: 70, h: 9, que: 'le llega la mitad' }])).toHaveLength(1);
    expect(choques([ventana, { tipo: 'caja', x: 40, y: 36, w: 104, h: 58, que: 'tarjeta' }, { tipo: 'letrero', x: 60, y: 50, w: 40, h: 9, que: 'adentro' }])).toEqual([]);
  });

  it('y toda animación del reproductor espera con «Cargando la voz…» solo al abrirla, mientras cargan todas sus voces, nunca entre un rótulo y otro (nmw5d6iqctit, nmw5h32xptit)', () => {
    expect(js).toContain('const cargandoVoz = () => conVoz && !quieto && seleccionado >= 0 && cargaDe === seleccionado && !cargaLista;');
    expect(js).not.toContain('readyState < 3');
    expect(js).toContain('cargarVocesDe(i);');
    expect(js).toContain('cargarVocesDe(GUIA);');
    expect(js).toContain('if (!pausado && cargandoVoz()) { pintarClip(ctxClip, seleccionado, clipT); pintarCargando(ctxClip, clip.width, clip.height, ahora / 1000); pintarMando(); return; }');
    expect(js).toContain("'Cargando la voz…'");
  });

  it('y ve también a los actores y los íconos: un letrero sobre el marco del Studio, o un actor que cruza un recuadro (nmw5eoz0rtit)', () => {
    const studio: Caja = { tipo: 'caja', x: 108, y: 40, w: 123.5, h: 95.5, que: 'el Studio' };
    expect(choques([studio, { tipo: 'letrero', x: 120, y: 130, w: 96, h: 8.5, que: 'la lees y la corriges' }])).toHaveLength(1);
    expect(choques([studio, { tipo: 'letrero', x: 120, y: 142, w: 96, h: 8.5, que: 'debajo' }])).toEqual([]);
    expect(choques([studio, { tipo: 'actor', x: 100, y: 60, w: 18, h: 18, que: 'el desarrollador' }])).toHaveLength(1);
    expect(choques([studio, { tipo: 'actor', x: 130, y: 60, w: 18, h: 18, que: 'el director' }])).toEqual([]);
    expect(choques([{ tipo: 'actor', x: 130, y: 60, w: 18, h: 18, que: 'el director' }, { tipo: 'letrero', x: 132, y: 64, w: 10, h: 8, que: 'encima' }])).toHaveLength(1);
  });

  // Cada animación, en español y en la página en inglés (?lang=en; pd_bilingue, nmw738o1ktit): el inglés es más largo y
  // tiene que caber igual
  for (const en of [false, true]) describe(en ? 'in English (?lang=en)' : 'en español', () => {
  const { SEGMENTOS, GRANDES, PASOS_SEG, CIERRES, GUION_COMO, CONTENIDO, caja, letrero, pintarCierre, pintarComo, tamanoQueCabe, pintarBucleInstalar, BUCLE_SEG, BUCLE_TIEMPOS, VERTICAL, VERTICALES, esVertical, pintarCierreVertical, pintarEnunciadoVertical, ctx, anotadas, reiniciar } = preparar(en);

  /** Recorre q de 0 a 1 y devuelve lo que se pisa, con el primer q en que pasa. Lo que va de viaje (cambia de lugar o de
   * tamaño de un cuadro al siguiente, como la nota que vuela al Buzón o el globo que sube) puede pasar por encima mientras
   * viaja; lo que está quieto, no. */
  const barrer = (dibuja: (q: number) => void) => {
    const vistos = new Map<string, number>();
    const cuadro = (q: number) => { reiniciar(); anotadas.length = 0; dibuja(q); return [...anotadas]; };
    const clave = (c: Caja, n: number) => `${c.tipo}|${c.que}|${n}`;
    const lugares = (lista: Caja[]) => {
      const cuenta = new Map<string, number>(), m = new Map<string, Caja>();
      for (const c of lista) { const b = `${c.tipo}|${c.que}`, n = cuenta.get(b) ?? 0; cuenta.set(b, n + 1); m.set(clave(c, n), c); }
      return m;
    };
    for (let k = 0; k <= 100; k++) {
      const q = k / 100;
      const antes = lugares(cuadro(Math.max(0, q - 0.004))), despues = lugares(cuadro(Math.min(1, q + 0.004)));
      const ahora = cuadro(q), cuenta = new Map<string, number>();
      const quietas = ahora.filter((c) => {
        const b = `${c.tipo}|${c.que}`, n = cuenta.get(b) ?? 0; cuenta.set(b, n + 1);
        return [antes.get(clave(c, n)), despues.get(clave(c, n))].every((o) => o && igual(o, c));
      });
      for (const m of choques(quietas)) if (!vistos.has(m)) vistos.set(m, q);
    }
    return [...vistos].map(([m, q]) => `${m} (en q = ${q})`);
  };

  const enUso = [...new Set(GRANDES.flat())].sort((a, b) => a - b);
  for (const j of enUso) for (const parte of ['problema', 'solucion'] as const) {
    it(`el segmento ${j + 1}, en su ${parte === 'problema' ? 'situación' : 'solución'}, de principio a fin`, () => {
      const s = SEGMENTOS[j];
      expect(s, `el segmento ${j + 1} existe`).toBeTruthy();
      const pasos = PASOS_SEG[j][parte];
      expect(barrer((q) => {
        // Como lo arma pintarClip: la escena, a 0,9 y bajo las píldoras, y encima las píldoras y el rótulo de abajo
        ctx.save(); ctx.translate(CONTENIDO.x, CONTENIDO.y); ctx.scale(CONTENIDO.escala, CONTENIDO.escala);
        if (parte === 'problema') s!.problema(ctx, q); else s!.solucion(ctx, q, '#5ad1ff');
        ctx.restore();
        const pildora = en ? 62 : 52;
        caja(ctx, 8, 5, pildora, 14, '#fff'); letrero(ctx, parte === 'problema' ? 'Sin STL' : 'Con STL', 8 + pildora / 2, 15.5, '#fff', 8.5);
        caja(ctx, 262, 5, 50, 14, '#fff'); letrero(ctx, en ? '1 of 3' : '1 de 3', 287, 15.5, '#fff', 8.5);
        const paso = pasos.filter(([desde]) => q >= desde).at(-1)?.[1] ?? pasos[0]?.[1] ?? '';
        if (paso) letrero(ctx, paso, 160, 190, '#fff', tamanoQueCabe(ctx, paso, 11, 300));
        caja(ctx, 20, 195, 280, 3, '#fff');
      })).toEqual([]);
    });
  }

  // «Cómo empezar» (GUIA): sus siete escenas con su cierre, tal como las arma pintarComo (píldoras, rótulo y barra)
  for (let k = 0; k <= GUION_COMO.escenas.length; k++) {
    it(`«Cómo empezar», ${k < GUION_COMO.escenas.length ? `la escena ${k + 1}` : 'su cierre'}, de principio a fin`, () => {
      expect(barrer((q) => pintarComo(ctx, k, q, 0.5))).toEqual([]);
    });
  }

  // El bucle de la instalación en la pantalla de pie de la estación 3 (nmw6xq68htit): cada uno de sus tres tiempos, de principio a fin
  for (let k = 0; k < BUCLE_TIEMPOS; k++) {
    it(`el bucle de la instalación, su tiempo ${k + 1}, de principio a fin`, () => {
      expect(barrer((q) => { expect(pintarBucleInstalar(ctx, BUCLE_SEG * (k + 0.001 + 0.998 * q))).toBe(k); })).toEqual([]);
    });
  }

  // El cierre de cada segmento: la tarjeta verde con su ✓, lo resuelto, tu cubito sonriendo y la frase de abajo
  CIERRES.forEach((cierre, j) => {
    if (!cierre) return;
    it(`el cierre del segmento ${j + 1} («${cierre[0]}»), de principio a fin`, () => {
      expect(barrer((q) => {
        pintarCierre(ctx, cierre[0], cierre[1], q, '1 de 3');
        caja(ctx, 20, 195, 280, 3, '#fff');
      })).toEqual([]);
    });
  });

  // De pie, en el cuadro fijo de 9:16 del teléfono y la tableta (pd_telefono_vertical, nmw8aincatit): nada se pisa y nada
  // se sale de sus 180 × 320. Ya están los siete problemas, con todos sus segmentos (nmw8e2ry6tit, nmw8e34lktit, nmw8e39mmtit)
  const fuera = (cajas: Caja[]) => cajas.filter((c) => c.x < -MARGEN || c.y < -MARGEN || c.x + c.w > VERTICAL.ancho + MARGEN || c.y + c.h > VERTICAL.alto + MARGEN).map((c) => c.que);
  const deVerticales = Object.keys(VERTICALES).map(Number);
  it('de pie, los siete problemas, con todos sus segmentos', () => {
    expect(GRANDES.map((_, i) => esVertical(i))).toEqual(GRANDES.map(() => true));
    expect([...deVerticales].sort((a, b) => a - b)).toEqual(GRANDES.flat().sort((a, b) => a - b));
  });
  for (const j of deVerticales) {
    for (const parte of ['problema', 'solucion'] as const) {
      it(`de pie, el segmento ${j + 1}, en su ${parte === 'problema' ? 'situación' : 'solución'}, de principio a fin, dentro de 9:16`, () => {
        const salidos = new Set<string>();
        expect(barrer((q) => {
          if (parte === 'problema') VERTICALES[j].problema(ctx, q); else VERTICALES[j].solucion(ctx, q, '#5ad1ff');
          for (const s of fuera(anotadas)) salidos.add(s);
        })).toEqual([]);
        expect([...salidos]).toEqual([]);
      });
    }
    it(`de pie, el cierre del segmento ${j + 1}, de principio a fin, dentro de 9:16`, () => {
      const salidos = new Set<string>();
      expect(barrer((q) => {
        pintarCierreVertical(ctx, CIERRES[j]![0], CIERRES[j]![1], q);
        for (const s of fuera(anotadas)) salidos.add(s);
      })).toEqual([]);
      expect([...salidos]).toEqual([]);
    });
  }
  it('de pie, el enunciado: tú y tus «?» caben arriba, sin pisarse', () => {
    const salidos = new Set<string>();
    expect(barrer((q) => { pintarEnunciadoVertical(ctx, 'Saltas entre sesiones y tareas a medio hacer, y ya no sabes en qué ibas', q); for (const s of fuera(anotadas)) salidos.add(s); })).toEqual([]);
    expect([...salidos]).toEqual([]);
  });

  // Nada de lo dibujado en las escenas de la estación 2 queda en español en la página en inglés (t_decide_estacion2_textos)
  if (en) it('in English, no word drawn in a scene of station 2 stays in Spanish (nmw738o1ktit)', () => {
    const textos = (p: ReturnType<typeof preparar>) => {
      const vistos = new Set<string>();
      for (const j of enUso) for (let k = 0; k <= 60; k++) {
        p.reiniciar(); p.anotadas.length = 0;
        p.SEGMENTOS[j]!.problema(p.ctx, k / 60); p.SEGMENTOS[j]!.solucion(p.ctx, k / 60, '#5ad1ff');
        // y su dibujo de pie, si ya lo tiene
        if (p.VERTICALES[j]) { p.VERTICALES[j].problema(p.ctx, k / 60); p.VERTICALES[j].solucion(p.ctx, k / 60, '#5ad1ff'); }
        for (const a of p.anotadas) if (a.tipo === 'letrero') vistos.add(a.que);
      }
      return vistos;
    };
    const espanol = textos(preparar(false));
    expect([...textos(preparar(true))].filter((t) => espanol.has(t) && /[a-záéíóúñ]/.test(t) && !/^[\d.,]+ tokens$/.test(t))).toEqual([]);
  });
  });
});
