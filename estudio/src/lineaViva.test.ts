import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ALTO_FRANJA, MARGEN_COMPLETA, CADA_MOVIENDO, CLASES_RAMA, DERIVA_ESTRELLAS, DURA_CONVERGE, DURA_ENTRADA, DURA_PASO, DURA_SALIDA, ESCALA_REBOTE, ESPERA_REGRESO, FOCO_MAXIMO, FRENO_REGRESO, LENTO_EN_REVISION, MAX_RAMAS, ONDA_ALTO,
  PASO_ESTRELLAS, PASO_LEJANAS, PASO_POR_MINUTO, PASO_POR_RAMA, SALTO_REVISION, SEPARACION_CABEZAS, VELOCIDAD_REGRESO, altoDeLaBarra, altoParaRamas, alturaDeRama,
  cabezasALaVez, congelarLineaViva, corridoAl, dosLineas, duraRegreso, textoDelInforme, gruposDeRamas, juntadoAl, lugarDelGlobo, olvidarLineaViva, pintarLineaViva, ramasDeAhora, separacionDeCabezas,
  movimientoVisto, pasosVistos, svgCieloLateral, svgEstrellas, svgLineaViva, vistaDelDirector, type Rama,
} from './lineaViva';
import { caraDentro } from './cara';

// La línea viva del proyecto (pedidos pd_linea_viva, pd_linea_ramas, pd_linea_historia y pd_linea_ciclo; notas del titular
// nmvt5j010tit, nmvt5kudptit, nmvtgu78itit, nmvtgxhiztit, nmvtgydm0tit, nmvth8zj7tit, nmvti6za5tit, nmvtj98k5tit, nmvtjdwobtit,
// nmvtk5sfetit, nmvtk8pr3tit, nmvtki8k2tit y nmvtknaqytit)
const leer = (...r: string[]) => readFileSync(join(__dirname, ...r), 'utf-8');
const AHORA = Date.parse('2026-10-29T08:00:00.000Z');
/** Dónde empiezan, en estilos.css, los colores de la línea: los mismos en la barra y en la franja del enfoque, en los dos temas. */
const PALETA = ':is(.linea-viva, .franja-linea, .linea-grande) {';
const hace = (min: number) => new Date(AHORA - min * 60_000).toISOString();
const rama = (id: string, clase: Rama['clase'] = 'respuesta', globo = `Nota ${id}`, min = 30): Rama => ({ id, cuando: hace(min), clase, globo });
/** En la barra: 200 de ancho, la línea a media altura y tú al centro. */
const X_TU = 100;
const LINEA = 110;
const onda = (x: number, alto = 220) => alto / 2 + Math.sin(x / 14) * ONDA_ALTO;

/** Cada rama dibujada con su cabeza: su tipo, el principio y el final de su trazo (en la primera fase de la onda) y su punta. */
function dibujadas(svg: string) {
  return [...svg.matchAll(/<g class="lv-n([^"]*)" data-rama="([a-z]+)"[^>]*><path class="lv-rama" d="([^"]+)">.*?<g class="lv-cabeza" data-globo="([^"]*)"><g><animateTransform[^>]*\/><circle class="lv-halo" cx="([\d.-]+)" cy="([\d.-]+)"[^>]*\/><circle class="lv-punta" cx="([\d.-]+)" cy="([\d.-]+)"/g)]
    .map((m) => {
      const n = m[3].trim().split(/[\sML]+/).filter(Boolean).map(Number);
      return { recogida: m[1].includes('lv-recogida'), clase: m[2], inicio: [n[0], n[1]], fin: [n[n.length - 2], n[n.length - 1]], halo: [Number(m[5]), Number(m[6])], punta: [Number(m[7]), Number(m[8])], globo: m[4] };
    });
}
/** Dónde está cada director dibujado, y tú. */
const directores = (svg: string) => [...svg.matchAll(/class="lv-director"[^>]*>.*?<g transform="translate\(([\d.-]+) ([\d.-]+)\)">/gs)].map((m) => [Number(m[1]), Number(m[2])]);
const tu = (svg: string) => (svg.match(/class="lv-tu">.*?<g transform="translate\(([\d.-]+) ([\d.-]+)\)">/s) ?? []).slice(1).map(Number);

afterEach(() => {
  olvidarLineaViva();
  vi.useRealTimers();
});

describe('la línea viva del proyecto', () => {
  it('cada cosa que el director aún no recibe abre una rama de su tipo, de la más vieja a la más nueva', () => {
    const notas = [
      { id: 'n2', cuando: '2026-10-29T06:02:00.000Z', sobre: { tipo: 'pregunta' as const }, texto: '¿Cuánto cuesta?' },
      { id: 'n1', cuando: '2026-10-29T06:01:00.000Z', sobre: { tipo: 'mision' as const, eleccion: 'Sí' } },
      { id: 'n3', cuando: '2026-10-29T06:03:00.000Z', sobre: { tipo: 'mision' as const, hazlo: true } },
      { id: 'n4', cuando: '2026-10-29T06:04:00.000Z', sobre: { tipo: 'general' as const }, tipo: 'falla' as const, texto: 'Se cae\n\nal abrir\ny más' },
      { id: 'n5', cuando: '2026-10-29T06:04:30.000Z', sobre: { tipo: 'general' as const }, tipo: 'ajuste' as const },
      { id: 'n6', cuando: '2026-10-29T06:04:40.000Z', sobre: { tipo: 'documento' as const } },
      { id: 'vieja', cuando: '2026-10-20T06:00:00.000Z', sobre: { tipo: 'documento' as const } },
    ];
    const ramas = ramasDeAhora(notas, (id) => id === 'vieja', [{ id: 't_x', cuando: '2026-10-29T06:05:00.000Z', titulo: 'Mira la línea' }],
      [{ id: 'pr_a', cuando: '2026-10-29T06:06:00.000Z' }, { id: 'pr_vieja', cuando: '2026-10-28T06:00:00.000Z' }], '2026-10-29T05:00:00.000Z');
    expect(ramas.map((r) => `${r.id}:${r.clase}`)).toEqual([
      'n1:eleccion', 'n2:pregunta', 'n3:hazlo', 'n4:falla', 'n5:ajuste', 'n6:respuesta', 'entrega-t_x:entrega', 'propuesta-pr_a:eleccion',
    ]);
    // El globo: las dos primeras líneas de la nota, o lo que la hizo nacer
    expect(ramas.find((r) => r.id === 'n4')?.globo).toBe('Se cae\nal abrir');
    expect(ramas.find((r) => r.id === 'n1')?.globo).toBe('Elegiste: Sí');
    expect(ramas.find((r) => r.id === 'entrega-t_x')?.globo).toBe('Entregaste «Mira la línea»');
    expect(dosLineas('x'.repeat(200)).length).toBe(90);
    // Si la nota cambia de tipo, su rama se muda
    const otra = ramasDeAhora([{ ...notas[4], tipo: 'idea' as const }], () => false, [], []);
    expect(otra[0].clase).toBe('idea');
  });

  it('entregar una misión con lo que eliges en su último paso abre una sola rama, la de la entrega, con las dos cosas en su globo (nmvvwyss9tit)', () => {
    const mision = (id: string, seccion: string, cuando: string, sobre: { eleccion?: string; hazlo?: boolean }, texto?: string) =>
      ({ id, cuando, sobre: { tipo: 'mision' as const, id: 't_a', seccion, ...sobre }, ...(texto ? { texto } : {}) });
    const entrega = { id: 't_a', cuando: '2026-10-31T04:35:15.178Z', titulo: 'Cuenta las recargas' };
    // El clic en la opción marca el último paso y entrega la misión en el mismo segundo: una sola rama
    const una = ramasDeAhora([mision('e1', 'Paso 1', '2026-10-31T04:35:14.297Z', { eleccion: 'Una sola vez' }, 'Una sola vez')], () => false, [entrega], []);
    expect(una).toHaveLength(1);
    // Nace cuando eligió, no cuando se guardó la entrega: la rama no vuelve a nacer ni la línea retrocede (nmvvyrasktit)
    expect(una[0]).toMatchObject({ id: 'entrega-t_a', clase: 'entrega', cuando: '2026-10-31T04:35:14.297Z', globo: 'Entregaste «Cuenta las recargas»\nElegiste: Una sola vez' });
    expect(una[0].texto).toBeUndefined();
    // Una opción que promete contar más trae su comentario: va entero en el globo que se abre
    const contada = ramasDeAhora([mision('e2', 'Paso 1', '2026-10-31T04:35:10.000Z', { eleccion: 'Dos veces (te cuento con ✉)' }, 'La segunda tardó\nunos segundos')], () => false, [entrega], []);
    expect(contada).toHaveLength(1);
    expect(contada[0].texto).toBe('Entregaste «Cuenta las recargas»\nElegiste: Dos veces (te cuento con ✉)\nLa segunda tardó\nunos segundos');
    // Un «Hazlo tú» en el último paso, lo mismo
    const hazlo = ramasDeAhora([mision('h1', 'Paso 2', '2026-10-31T04:35:13.000Z', { hazlo: true }, 'Hazlo tú: subo la página')], () => false, [entrega], []);
    expect(hazlo.map((r) => `${r.id}:${r.clase}`)).toEqual(['entrega-t_a:entrega']);
    expect(hazlo[0].globo).toBe('Entregaste «Cuenta las recargas»\nHazlo tú: subo la página');
    // Lo elegido en un paso anterior, minutos antes, sigue en su rama; y lo de otra misión, también
    const antes = mision('e0', 'Paso 1', '2026-10-31T04:30:00.000Z', { eleccion: 'Sí' });
    const otraMision = { ...mision('o1', 'Paso 1', '2026-10-31T04:35:14.500Z', { eleccion: 'No' }), sobre: { tipo: 'mision' as const, id: 't_b', seccion: 'Paso 1', eleccion: 'No' } };
    const varias = ramasDeAhora([antes, mision('e1', 'Paso 2', '2026-10-31T04:35:14.297Z', { eleccion: 'Una sola vez' }), otraMision], () => false, [entrega], []);
    expect(varias.map((r) => `${r.id}:${r.clase}`)).toEqual(['e0:eleccion', 'entrega-t_a:entrega', 'o1:eleccion']);
    // Ya respondida por el director, la nota no se junta: la entrega va sola, como antes
    expect(ramasDeAhora([mision('e1', 'Paso 1', '2026-10-31T04:35:14.297Z', { eleccion: 'Sí' })], () => true, [entrega], [])[0].globo).toBe('Entregaste «Cuenta las recargas»');
  });

  it('tú vas al centro, sobre la línea; el director, solo mientras revisa (nmvtk5sfetit, nmvtk8pr3tit)', () => {
    const svg = svgLineaViva([rama('a')], { ahora: AHORA });
    expect(tu(svg)[0]).toBe(X_TU);
    expect(tu(svg)[1]).toBeCloseTo(onda(X_TU), 0);
    expect(svg).toContain('fill="url(#lv-tu)"');
    expect(svg.match(/class="lv-tu-ojo"/g)).toHaveLength(2);
    expect(directores(svg)).toHaveLength(0);
    // En una franja más ancha, también al centro
    expect(tu(svgLineaViva([rama('a')], { ahora: AHORA, ancho: 900, alto: ALTO_FRANJA }))[0]).toBe(450);
    expect(svgLineaViva([], { ahora: AHORA, ancho: 900, alto: ALTO_FRANJA })).toContain('viewBox="0 0 900 110"');
  });

  it('la base de cada rama se queda donde nació y solo su cabeza te sigue, a su altura (nmvtknaqytit)', () => {
    const a = rama('a', 'idea', 'x', 60);
    const [r] = dibujadas(svgLineaViva([a], { ahora: AHORA }));
    // Nació donde estabas: un paso por ella y el reloj de una hora la dejan atrás
    expect(r.inicio[0]).toBeCloseTo(X_TU - PASO_POR_RAMA - 60 * PASO_POR_MINUTO, 0);
    expect(r.inicio[1]).toBeCloseTo(onda(r.inicio[0]), 0);
    // Su cabeza va contigo, a su altura, en paralelo a la línea
    expect(r.punta[0]).toBe(X_TU);
    expect(r.punta[1] - onda(X_TU)).toBeCloseTo(alturaDeRama(0), 0);
    expect(r.punta).toEqual(r.fin);
    // Diez minutos después, la base sigue donde nació (se corre con la línea) y la cabeza, contigo
    const [luego] = dibujadas(svgLineaViva([a], { ahora: AHORA + 10 * 60_000 }));
    expect(luego.inicio[0]).toBeCloseTo(r.inicio[0] - 10 * PASO_POR_MINUTO, 0);
    expect(luego.punta[0]).toBe(X_TU);
    // Con otra cosa que le dejas, avanzas un paso más: la base de la primera queda más atrás, su cabeza no se mueve
    const b = { ...rama('b', 'falla', 'y', 0), cuando: new Date(AHORA).toISOString() };
    const tras = dibujadas(svgLineaViva([a, b], { ahora: AHORA + DURA_PASO }));
    expect(tras[0].inicio[0]).toBeCloseTo(r.inicio[0] - PASO_POR_RAMA, 0);
    expect(tras[0].punta).toEqual([X_TU, r.punta[1]]);
  });

  it('una rama nueva crece mientras la línea corre su paso, y todo sale de la hora: repintar o recargar no la rompe (nmvtk8pr3tit)', () => {
    const nueva = { ...rama('n', 'ajuste'), cuando: new Date(AHORA).toISOString() };
    const al = (ms: number) => dibujadas(svgLineaViva([nueva], { ahora: AHORA + ms }))[0];
    // Al nacer está en ti, sin largo; a medio paso, a medio camino; al terminar, un paso atrás y ya a su altura
    expect(al(0).inicio[0]).toBe(X_TU);
    expect(al(0).punta[1]).toBeCloseTo(onda(X_TU), 0);
    expect(al(DURA_PASO / 2).inicio[0]).toBeGreaterThan(X_TU - PASO_POR_RAMA);
    expect(al(DURA_PASO / 2).inicio[0]).toBeLessThan(X_TU);
    expect(al(DURA_PASO).inicio[0]).toBeCloseTo(X_TU - PASO_POR_RAMA, 0);
    expect(al(DURA_PASO).punta[1] - onda(X_TU)).toBeCloseTo(alturaDeRama(0), 0);
    // El mismo momento, el mismo dibujo; y sin trazos punteados ni animaciones de CSS que una recarga deje a medias
    const svg = svgLineaViva([nueva], { ahora: AHORA + 700 });
    expect(svgLineaViva([nueva], { ahora: AHORA + 700 })).toBe(svg);
    expect(svg).not.toMatch(/pathLength|lv-nueva|stroke-dasharray/);
    const css = leer('estilos.css');
    expect(css).not.toMatch(/lv-crece|lv-absorbe|lv-juntando/);
    // Con «menos movimiento», el paso se da de una vez
    expect(dibujadas(svgLineaViva([nueva], { ahora: AHORA + 1, quieta: true }))[0].inicio[0]).toBeCloseTo(X_TU - PASO_POR_RAMA, 0);
  });

  it('las alturas se reparten arriba y abajo, de afuera hacia adentro, parejas en todo el alto, y no se cruzan ni se repiten (nmvtv593wtit)', () => {
    for (const alto of [220, ALTO_FRANJA]) {
      const alturas = Array.from({ length: MAX_RAMAS }, (_, i) => alturaDeRama(i, alto, MAX_RAMAS));
      expect(new Set(alturas.map((h) => h.toFixed(2))).size).toBe(MAX_RAMAS);
      for (const [i, h] of alturas.entries()) {
        expect(Math.sign(h)).toBe(i % 2 === 0 ? -1 : 1);
        expect(Math.abs(h)).toBeLessThan(alto / 2 - 5);
        expect(Math.abs(h)).toBeGreaterThan(alto * 0.05);
      }
      // Las seis primeras de cada lado, cada una más adentro que la anterior: la que nace después no cruza a las que ya van
      for (const lado of [0, 1]) {
        const suyas = alturas.filter((_, i) => i % 2 === lado).slice(0, 6).map(Math.abs);
        expect([...suyas].sort((a, b) => b - a)).toEqual(suyas);
      }
      // Parejas: entre vecinas de un mismo lado, siempre la misma distancia, de la orilla a la línea; ninguna se apila
      for (const lado of [-1, 1]) {
        const suyas = alturas.filter((h) => Math.sign(h) === lado).sort((a, b) => a - b);
        const pasos = suyas.slice(1).map((h, i) => h - suyas[i]);
        for (const d of pasos) expect(d).toBeCloseTo(pasos[0], 6);
        expect(Math.max(...suyas.map(Math.abs))).toBeCloseTo(alto / 2 - 9, 6);
        expect(Math.min(...suyas.map(Math.abs))).toBeCloseTo(alto * 0.09, 6);
      }
    }
    // En el dibujo, cada cabeza a la suya
    const ramas = Array.from({ length: 6 }, (_, i) => rama(`r${i}`, CLASES_RAMA[i], 'x', 100 - i * 10));
    const alturas = dibujadas(svgLineaViva(ramas, { ahora: AHORA })).map((r) => r.punta[1] - onda(X_TU));
    alturas.forEach((h, i) => expect(h).toBeCloseTo(alturaDeRama(i, 220, 6), 0));
    // Al nacer otra, las de su lado se reacomodan mientras crece: a medio paso, a medio camino entre lo de antes y lo de después
    const nueva = { ...rama('r6', 'idea'), cuando: new Date(AHORA).toISOString() };
    const medio = dibujadas(svgLineaViva([...ramas, nueva], { ahora: AHORA + DURA_PASO / 2 })).map((r) => r.punta[1] - onda(X_TU));
    expect(medio[2]).toBeCloseTo((alturaDeRama(2, 220, 6) + alturaDeRama(2, 220, 7)) / 2, 0);
    // En la barra, el dibujo toma todo el alto de su caja, con el mismo ancho en unidades
    expect(altoDeLaBarra(250, 500)).toBe(400);
    expect(altoDeLaBarra(250, 100)).toBe(220);
    expect(altoDeLaBarra(0, 0)).toBe(220);
    expect(leer('lineaViva.ts')).toContain('{ alto: altoDeLaBarra(w, h), fondo: true, corrido }');
  });

  it('al pedir la revisión aparece el director ahí y se queda; tú das un salto adelante y lo nuevo nace de ti, no de él (nmvtnd08xtit, nmvtnerr3tit)', () => {
    const antes = [rama('a', 'idea', 'x', 90), rama('b', 'ajuste', 'x', 70)];
    const despues = rama('c', 'falla', 'x', 10);
    const svg = svgLineaViva([...antes, despues], { ahora: AHORA, revision: { aqui: hace(40) } });
    const [xd, yd] = directores(svg)[0];
    // El director, atrás de ti: el reloj desde que se pidió y el paso de lo que dejaste después, a un cuarto mientras
    // revisa, y el salto que diste; los dos comparten el enfoque, al centro (nmvtu16qctit)
    const lejos = (40 * PASO_POR_MINUTO + PASO_POR_RAMA) * LENTO_EN_REVISION + SALTO_REVISION;
    expect(xd).toBeCloseTo(X_TU - lejos / 2, 0);
    expect(yd).toBeCloseTo(onda(xd), 0);
    expect(tu(svg)[0]).toBeCloseTo(X_TU + lejos / 2, 0);
    // La de después va contigo, con la primera altura (es de la revisión siguiente), y nació aparte del director
    const r = dibujadas(svg);
    expect(r).toHaveLength(1);
    expect(r[0].recogida).toBe(false);
    expect(r[0].punta[0]).toBe(tu(svg)[0]);
    expect(r[0].punta[1] - onda(r[0].punta[0])).toBeCloseTo(alturaDeRama(0), 0);
    expect(r[0].inicio[0]).toBeGreaterThan(xd + SALTO_REVISION - 1);
    // Pasado el minuto, las dos de antes ya se juntaron: sus cabecitas giran alrededor del director
    expect(svg.match(/class="lv-punta lv-gira"/g)).toHaveLength(2);
    // Mientras giran no abren su globo al pasar, y el ratón las atraviesa hasta el director (nmvvcp89ttit)
    expect(svg).not.toMatch(/lv-gira"[^>]*data-globo/);
    expect(leer('estilos.css')).toContain('.lv-orbita { pointer-events: none; }');
    expect(svg).toMatch(/<g class="lv-orbita" style="animation-duration:14s;animation-delay:-[\d.]+s">/);
    expect(svg.match(/lv-recogida lv-girando/g)).toHaveLength(2);
    expect(svg).toMatch(/aria-label="La línea del proyecto: el director está revisando y ya juntó 2 ramas; otra va contigo/);
    // Un clic en él abre lo que va haciendo; lo que se le negó, en rojo
    expect(svg).toContain('<g class="lv-director" data-progreso role="button" tabindex="0"');
    expect(svg).not.toContain('lv-dir-aviso');
    expect(svgLineaViva(antes, { ahora: AHORA, revision: { aqui: hace(40), negados: 2 } })).toMatch(/class="lv-dir-aviso">.*>2<\/text>/);
  });

  it('las ramas se juntan en el director en un minuto, sin depender de lo que informe, y la recarga no lo cambia (nmvtnwub1tit)', () => {
    const aqui = hace(1);
    const ramas = [rama('a', 'idea', 'x', 3), rama('b', 'ajuste', 'x', 2)];
    const al = (ms: number) => svgLineaViva(ramas, { ahora: Date.parse(aqui) + ms, revision: { aqui } });
    const altura = (svg: string) => dibujadas(svg)[0].punta[1] - onda(directores(svg)[0][0]);
    expect(dibujadas(al(0)).map((x) => x.recogida)).toEqual([true, true]);
    expect(altura(al(0))).toBeCloseTo(alturaDeRama(0), 0);
    expect(altura(al(DURA_CONVERGE / 2))).toBeCloseTo(alturaDeRama(0) / 2, 0);
    expect(dibujadas(al(DURA_CONVERGE / 2))[0].punta[0]).toBeCloseTo(directores(al(DURA_CONVERGE / 2))[0][0], 0);
    expect(dibujadas(al(DURA_CONVERGE))).toHaveLength(0);
    expect(al(DURA_CONVERGE).match(/lv-gira"/g)).toHaveLength(2);
    expect(al(DURA_CONVERGE / 3)).toBe(al(DURA_CONVERGE / 3));
    expect(juntadoAl(aqui, Date.parse(aqui) + DURA_CONVERGE)).toBe(1);
    expect(juntadoAl(aqui, Date.parse(aqui), true)).toBe(1);
    expect(leer('app.ts')).toContain('return { aqui: corteRevision() ?? r.pedida, negados, vez: r.pedida };');
  });

  it('recoge sus ramas entero desde que la página lo pinta, aunque la revisión lleve rato andando (nota de voz del titular nmvxxk7kbtit)', () => {
    const aqui = hace(20);
    const t0 = Date.parse(aqui);
    // La página lo ve 8 segundos tarde: nada de eso se le descuenta, y otra vuelta del reloj no lo corre
    const v = vistaDelDirector(null, aqui, t0 + 8000);
    expect(v.desde).toBe(t0 + 8000);
    expect(juntadoAl(aqui, t0 + 8000)).toBe(1);
    expect(juntadoAl(aqui, t0 + 8000, false, v.desde)).toBe(0);
    expect(vistaDelDirector(v, aqui, t0 + 8033).desde).toBe(t0 + 8000);
    // Una parada mientras entra (la página repinta todo, la pestaña oculta, un globo abierto) se le devuelve, y lo que ya
    // había avanzado se queda
    const parada = vistaDelDirector({ vez: aqui, desde: t0, ultimo: t0 + 1000 }, aqui, t0 + 4000);
    expect(parada.desde).toBe(t0 + 3000);
    expect(juntadoAl(aqui, t0 + 4000, false, parada.desde)).toBeCloseTo(juntadoAl(aqui, t0 + 1000, false, t0), 5);
    // Ya entrado, una parada no lo devuelve; otra revisión, otra vez
    const fin = t0 + DURA_CONVERGE + DURA_SALIDA;
    expect(vistaDelDirector({ vez: aqui, desde: t0, ultimo: fin }, aqui, fin + 5000).desde).toBe(t0);
    expect(vistaDelDirector({ vez: aqui, desde: t0, ultimo: fin }, 'otra', fin + 5000)).toEqual({ vez: 'otra', desde: fin + 5000, ultimo: fin + 5000 });
    // Al pintarla: la entrada y la salida a girar se cuentan desde ahí
    const al = (ms: number) => svgLineaViva([rama('a', 'idea', 'x', 30)], { ahora: t0 + 8000 + ms, revision: { aqui, desde: t0 + 8000 } });
    expect(al(0)).toContain('<g class="lv-dir-entra"><animateTransform');
    expect(al(0)).not.toMatch(/lv-gira"/);
    expect(dibujadas(al(0))).toHaveLength(1);
    expect(al(DURA_CONVERGE)).toMatch(/lv-gira"/);
  });

  it('tu paso adelante se da entero desde que la página pinta al director, aunque su respuesta tarde (nota de voz del titular nmvzod6tmtit)', () => {
    const aqui = hace(20 / 60);
    const t0 = Date.parse(aqui);
    // La respuesta de la revisión tarda 8 segundos en pintarse: su paso aún no se ha dado
    const vio = t0 + 8000;
    const al = (ms: number) => svgLineaViva([rama('a', 'idea', 'x', 30)], { ahora: vio + ms, revision: { aqui, desde: vio } });
    const lugar = (svg: string) => tu(svg)[0] - directores(svg)[0][0];
    expect(lugar(al(0))).toBeLessThan(5);
    expect(lugar(al(DURA_PASO / 2))).toBeCloseTo(SALTO_REVISION / 2, -1);
    expect(lugar(al(DURA_PASO))).toBeGreaterThan(SALTO_REVISION / 2 - 1);
    // Cuadro a cuadro, sin saltar: tú y el director comparten el enfoque, y lo que os separa crece de a poco
    let antes = lugar(al(0));
    for (let ms = CADA_MOVIENDO; ms < DURA_PASO; ms += CADA_MOVIENDO) {
      const ahora = lugar(al(ms));
      expect(Math.abs(ahora - antes)).toBeLessThan(1.5);
      antes = ahora;
    }
    // Lo que nació entre el corte y ese momento ya va contigo, después del paso: no nace pegado al director
    const conNota = svgLineaViva([rama('a', 'idea', 'x', 30), { id: 'b', cuando: new Date(t0 + 3000).toISOString(), clase: 'ajuste' }], { ahora: vio + DURA_PASO, revision: { aqui, desde: vio } });
    expect(dibujadas(conNota).find((r) => !r.recogida)!.inicio[0]).toBeGreaterThan(directores(conNota)[0][0] + SALTO_REVISION / 2 - 2);
  });

  it('el paso de una rama se cuenta desde que la página la pinta, no desde que el servidor guardó la nota, y sus paradas no se le descuentan (nota de voz del titular nmvzpuv5jtit)', () => {
    const t = AHORA;
    const nota = { id: 'n', cuando: new Date(t).toISOString() };
    // Lo que ya estaba al abrir la página no da su paso otra vez
    const antes = pasosVistos(null, [{ id: 'vieja', cuando: new Date(t - 1000).toISOString() }], t);
    expect(antes.enMarcha.size).toBe(0);
    // Llega con 1,5 segundos de retraso (el loader): su paso empieza ahí, entero
    const llega = pasosVistos(antes, [{ id: 'vieja' }, nota], t + 1500);
    expect(llega.enMarcha.get('n')).toEqual({ desde: t + 1500, ultimo: t + 1500 });
    // Mientras la página se repinta, 800 ms sin cuadros: no se le descuentan
    const sigue = pasosVistos(llega, [{ id: 'vieja' }, nota], t + 2300);
    expect(sigue.enMarcha.get('n')).toEqual({ desde: t + 2300, ultimo: t + 2300 });
    // Un cuadro normal no corre nada, y al terminar se suelta
    expect(pasosVistos(sigue, [nota], t + 2333).enMarcha.get('n')!.desde).toBe(t + 2300);
    expect(pasosVistos(sigue, [nota], t + 2300 + 250).enMarcha.get('n')!.desde).toBe(t + 2300);
    expect(movimientoVisto({ desde: t, ultimo: t + 1000 }, t + 1300, DURA_PASO).desde).toBe(t + 300);
    const acabo = { desde: t, ultimo: t + DURA_PASO - 1 };
    expect(pasosVistos({ conocidas: new Set(['n']), enMarcha: new Map([['n', acabo]]) }, [nota], t + DURA_PASO).enMarcha.size).toBe(0);
    // Lo que ya es viejo al llegar (otro proyecto, otra persona) no vuelve a empezar: ya lo dio
    expect(pasosVistos(antes, [{ id: 'otra', cuando: new Date(t - 120_000).toISOString() }], t).enMarcha.size).toBe(0);
    // En el dibujo: al pintarla por primera vez, 1,5 segundos tarde, aún no se ha movido nada; sin esto, ya iba adelantada
    const ramas: Rama[] = [{ id: 'n', cuando: nota.cuando, clase: 'eleccion' }];
    const vista = t + 1500;
    const sinPaso = (svg: string) => dibujadas(svg)[0];
    const conVista = svgLineaViva(ramas, { ahora: vista, desdeDe: { n: vista } });
    const sinVista = svgLineaViva(ramas, { ahora: vista });
    expect(sinPaso(conVista).inicio[0]).toBeCloseTo(X_TU, 0);
    expect(sinPaso(sinVista).inicio[0]).toBeLessThan(X_TU - 3);
    // Y una misión entregada, igual: llegas a ella desde que la página lo pinta
    const lote = [{ id: 'm', titulo: 'x', entregada: nota.cuando }, { id: 'p', titulo: 'y' }];
    const proxima = (svg: string) => Number(svg.match(/class="lv-lote"><title>[^<]*<\/title><g><animateTransform[^>]*\/><circle cx="([\d.]+)"/)?.[1]);
    expect(proxima(svgLineaViva([], { ahora: vista, lote, desdeDe: { 'm:m': vista } }))).toBeGreaterThan(proxima(svgLineaViva([], { ahora: vista, lote })));
  });

  it('lo que se mueve sin parar lo lleva el compositor, no el hilo de la página: una carga o un repintado no lo detienen (nmvzpuv5jtit)', () => {
    const svg = svgLineaViva([rama('a', 'idea', 'x', 30)], { ahora: AHORA, ancho: 900, alto: ALTO_FRANJA, fondo: true, revision: { aqui: hace(5) } });
    // Sin animaciones del SVG en las estrellas, el latido y la órbita: esas corren en el hilo de la página
    expect(svg).not.toMatch(/lv-estrellas-[a-z]+"><animate/);
    expect(svg).not.toMatch(/lv-dir-late[^>]*><animate/);
    expect(svg).not.toMatch(/lv-orbita"[^>]*><animate/);
    const css = leer('estilos.css');
    expect(css).toMatch(/@keyframes lv-deriva \{ to \{ transform: translateX\(calc\(var\(--lv-ancho\) \* -1px\)\); \} \}/);
    expect(css).toMatch(/\.lv-deriva \{[^}]*will-change: transform/);
    expect(css).toMatch(/\.lv-orbita \{[^}]*will-change: transform/);
    expect(css).toMatch(/\.lv-dir-late \{[^}]*will-change: transform/);
    // Mirar un globo o pedir menos movimiento las sigue dejando quietas, aunque CSS no atienda pauseAnimations
    expect(css).toContain('.lv-congelada :is(.lv-deriva, .lv-orbita, .lv-dir-late) { animation-play-state: paused; }');
    expect(svgLineaViva([], { ahora: AHORA, quieta: true })).toContain('lv-congelada');
    expect(leer('lineaViva.ts')).toContain("?.classList?.add('lv-congelada')");
  });

  it('calcular lo avanzado no crece con el cuadrado de los pasos: se calcula 30 veces por segundo', () => {
    expect(leer('lineaViva.ts')).not.toContain('[...acc, acc[acc.length - 1] + p.w]');
  });

  it('la revisión que se pinta por primera vez cuando ya andaba corre su entrada completa, y su corte al lanzarla no la reinicia', () => {
    vi.useFakeTimers();
    vi.setSystemTime(AHORA);
    olvidarLineaViva();
    const el = { id: 'linea-viva', innerHTML: '', clientWidth: 0, clientHeight: 0, querySelector: () => null, ownerDocument: { defaultView: { setTimeout, clearTimeout } } };
    const doc = { getElementById: (id: string) => (id === 'linea-viva' ? el : null) } as unknown as Document;
    const ramas = [rama('a', 'idea', 'x', 50), rama('b', 'ajuste', 'x', 45)];
    const recogido = () => dibujadas(el.innerHTML)[0].punta[1] - onda(directores(el.innerHTML)[0][0]);
    const aqui = hace(20 / 60);
    pintarLineaViva(ramas, doc, { revision: { aqui, vez: aqui } });
    expect(el.innerHTML).not.toMatch(/lv-gira"/);
    expect(recogido()).toBeCloseTo(alturaDeRama(0), 0);
    vi.advanceTimersByTime(DURA_CONVERGE / 2);
    expect(recogido()).toBeCloseTo(alturaDeRama(0) / 2, 0);
    // Llega su hora de lanzada, un momento después de pedida: es la misma revisión
    pintarLineaViva(ramas, doc, { revision: { aqui: new Date(Date.parse(aqui) + 800).toISOString(), vez: aqui } });
    expect(recogido()).toBeCloseTo(alturaDeRama(0) / 2, 0);
    vi.advanceTimersByTime(DURA_CONVERGE / 2 + DURA_PASO);
    expect(el.innerHTML).toMatch(/lv-gira"/);
    olvidarLineaViva();
    vi.useRealTimers();
  });

  it('el director entra suave, desde su centro, crece un poco de más y se acomoda; tú y las cabecitas, sin saltos (nota de voz del titular nmvwjjvt6tit)', () => {
    const aqui = hace(1);
    const t0 = Date.parse(aqui);
    const ramas = [rama('a', 'idea', 'x', 3), rama('b', 'ajuste', 'x', 2)];
    const al = (ms: number, quieta = false) => svgLineaViva(ramas, { ahora: t0 + ms, revision: ms < 0 ? null : { aqui }, quieta });
    const entrada = (svg: string) => svg.match(/<g class="lv-dir-entra">((?:<animate[^>]*\/>)*)/)?.[1] ?? '';
    // Al aparecer, desde cero: crece hasta pasarse un poco y vuelve a su tamaño, como un resorte, y de transparente a visible
    expect(ESCALA_REBOTE).toBeGreaterThan(1);
    expect(ESCALA_REBOTE).toBeLessThan(1.25);
    expect(entrada(al(0))).toBe(`<animateTransform attributeName="transform" type="scale" dur="${DURA_ENTRADA / 1000}s" begin="-0s" fill="freeze" values="0;${ESCALA_REBOTE};1" keyTimes="0;0.55;1" calcMode="spline" keySplines="0.25 0.8 0.4 1;0.45 0 0.55 1"/><animate attributeName="opacity" dur="${DURA_ENTRADA / 1000}s" begin="-0s" fill="freeze" values="0;1;1" keyTimes="0;0.4;1"/>`);
    // Contada desde que apareció, como su latido: repintar a mitad de camino sigue donde iba, no la vuelve a empezar
    expect(entrada(al(300)).match(/begin="-0\.3s"/g)).toHaveLength(2);
    // Ya entrado, sin animación; con «menos movimiento», nunca: aparece en su lugar
    expect(entrada(al(DURA_ENTRADA))).toBe('');
    expect(al(0)).toContain('<g class="lv-dir-entra"><animateTransform');
    expect(entrada(al(0, true))).toBe('');
    // Tú das tu salto y las cabecitas se juntan cuadro a cuadro, sin saltar: tampoco en el cuadro en que aparece el director
    let antes = al(-CADA_MOVIENDO);
    for (let ms = 0; ms < DURA_CONVERGE; ms += CADA_MOVIENDO) {
      const svg = al(ms);
      expect(Math.abs(tu(svg)[0] - tu(antes)[0])).toBeLessThan(1);
      const [a, b] = [dibujadas(antes)[0].punta, dibujadas(svg)[0].punta];
      expect(Math.hypot(b[0] - a[0], b[1] - a[1])).toBeLessThan(2.5);
      antes = svg;
    }
    // Ya juntas, salen de él a girar, desde su centro, en vez de aparecer de una vez en su órbita
    expect(al(DURA_CONVERGE)).toContain(`<g class="lv-orbita-sale"><animateTransform attributeName="transform" type="scale" dur="${DURA_SALIDA / 1000}s" begin="-0s" fill="freeze" values="0;1"`);
    expect(al(DURA_CONVERGE + DURA_SALIDA)).toContain('<g class="lv-orbita-sale"><g class="lv-orbita"');
    expect(al(0, true)).toContain('<g class="lv-orbita-sale"><g class="lv-orbita"');
    // Todo cabe en lo que la línea se repinta seguido después de pedir la revisión
    expect(Math.max(DURA_ENTRADA, DURA_CONVERGE + DURA_SALIDA)).toBeLessThan(DURA_CONVERGE + DURA_PASO);
    expect(leer('lineaViva.ts')).toContain('(!!viva && ahora - desde! < DURA_CONVERGE + DURA_PASO)');
  });

  it('tu lote de misiones se reparte hacia adelante y, al entregar una, llegas a ella (nmvtnd08xtit)', () => {
    const lote = [{ id: 't1', titulo: 'Uno' }, { id: 't2', titulo: 'Dos' }, { id: 't3', titulo: 'Tres' }];
    const marcas = (svg: string) => [...svg.matchAll(/class="lv-lote"><title>([^<]*)<\/title><g><animateTransform[^>]*\/><circle cx="([\d.]+)"/g)].map((m) => ({ titulo: m[1], x: Number(m[2]) }));
    const antes = marcas(svgLineaViva([], { ahora: AHORA, lote }));
    expect(antes.map((m) => m.titulo)).toEqual(['Tu misión: «Uno»', 'Tu misión: «Dos»', 'Tu misión: «Tres»']);
    expect(antes[0].x).toBeGreaterThan(X_TU);
    expect(antes[1].x).toBeGreaterThan(antes[0].x);
    expect(antes[2].x).toBeLessThan(200 - 12);
    // Al entregar la primera, la línea corre hasta ella: a medio paso, a medio camino; al terminar, las demás un lugar más cerca
    const entregado = [{ ...lote[0], entregada: new Date(AHORA).toISOString() }, lote[1], lote[2]];
    const medio = marcas(svgLineaViva([], { ahora: AHORA + DURA_PASO / 2, lote: entregado }));
    expect(medio).toHaveLength(3);
    expect(medio[0].x).toBeGreaterThan(X_TU);
    expect(medio[0].x).toBeLessThan(antes[0].x);
    const tras = marcas(svgLineaViva([], { ahora: AHORA + DURA_PASO, lote: entregado }));
    expect(tras.map((m) => m.titulo)).toEqual(['Tu misión: «Dos»', 'Tu misión: «Tres»']);
    expect(tras[0].x).toBeCloseTo(antes[0].x, 0);
    expect(leer('app.ts')).toContain('revision: revisionEnLinea(), lote: loteEnLinea() });');
  });

  it('las revisiones de antes quedan marcadas donde apareció su director, con sus ramas juntándose ahí; lo que salió del cuadro no se dibuja', () => {
    const historia = [
      { desde: hace(400), corte: hace(150), junto: hace(120), ramas: [{ t: hace(200), c: 'ajuste' as const }, { t: hace(180), c: 'idea' as const }] },
      { desde: hace(9000), junto: hace(8000), ramas: [{ t: hace(8500), c: 'falla' as const }] },
    ];
    const svg = svgLineaViva([], { ahora: AHORA, historia, revisado: hace(120) });
    expect(svg.match(/class="lv-revision"/g)).toHaveLength(1);
    expect(svg.match(/class="lv-pasada /g)).toHaveLength(2);
    expect(directores(svg)).toHaveLength(0);
    const xj = Number(svg.match(/class="lv-revision">.*?<circle cx="([\d.-]+)"/s)?.[1]);
    for (const m of svg.matchAll(/<path class="lv-pasada [^"]+" d="([^"]+)"/g)) {
      const n = m[1].split(/[\sML]+/).filter(Boolean).map(Number);
      expect(n[n.length - 2]).toBeCloseTo(xj, 0);
      expect(n[n.length - 1]).toBeCloseTo(onda(xj), 0);
    }
    // Cerrada, su director ya no está, y el salto que diste al pedirla sigue en la línea: la marca queda donde estaba
    const cierra = [{ ...historia[0], junto: new Date(AHORA).toISOString() }, historia[1]];
    const xc = Number(svgLineaViva([], { ahora: AHORA, historia: cierra }).match(/class="lv-revision">.*?<circle cx="([\d.-]+)"/s)?.[1]);
    const enMarcha = svgLineaViva([], { ahora: AHORA, revision: { aqui: hace(150) }, historia: historia.slice(1) });
    expect(directores(enMarcha)[0][0]).toBeCloseTo(xc, 0);
  });

  it('al pasar el ratón por una revisión, su globo dice cuántas ramas abriste y cuántas juntó, esperan su fase o cerró; las de antes del 4 de noviembre, solo cuántas (pd_linea_informe, nmw2fksmgtit, nmw2hc1u0tit)', () => {
    const historia = [{ desde: '2026-11-04T06:00:00.000Z', corte: hace(150), junto: '2026-11-04T07:30:00.000Z', ramas: [
      { t: hace(200), c: 'idea' as const, q: 'junta' as const }, { t: hace(190), c: 'ajuste' as const, q: 'junta' as const }, { t: hace(180), c: 'falla' as const, q: 'cierra' as const },
    ] }];
    const svg = svgLineaViva([], { ahora: AHORA, historia });
    // Con el mismo globo que una cabecita (data-globo), sin el del navegador encima
    const marca = svg.match(/<g data-globo="([^"]*)" class="lv-revision">(.*?)<\/g><\/g>/s);
    expect(marca?.[1]).toBe('Una revisión del director: aquí juntó las ramas\nAbriste 3 ramas\nJuntadas en la línea: 2 · esperan su fase: 0 · cerradas: 1');
    expect(marca?.[2]).not.toContain('<title>');
    expect(textoDelInforme({ abiertas: 1, sinDetalle: 'antes' })).toBe('Abriste 1 rama\nSin detalle: de antes del 4 de noviembre');
    // Lo abre el mismo oyente que el de las cabecitas, en la barra y en la franja del modo enfoque
    expect(leer('lineaViva.ts')).toContain("const cabeza = (e.target as Element).closest?.('[data-globo]');");
  });

  it('una rama de la historia que su respuesta llevó a una fase que aún no llega se ve tenue hasta su turno (pd_linea_completa)', () => {
    const historia = [{ desde: hace(400), corte: hace(150), junto: hace(120), ramas: [
      { t: hace(200), c: 'idea' as const, n: 'n1', g: 'Para después', f: 'publico' },
      { t: hace(190), c: 'ajuste' as const, n: 'n2', g: 'Para ahora', f: 'claro' },
      { t: hace(180), c: 'falla' as const },
    ] }];
    const tenues = (porVenir?: string[]) => (svgLineaViva([], { ahora: AHORA, historia, porVenir }).match(/class="lv-pasada lv-[a-z]+ lv-tenue"/g) ?? []);
    expect(tenues(['publico', 'equipo', 'despues'])).toEqual(['class="lv-pasada lv-idea lv-tenue"']);
    // Llegó su fase: ya no espera
    expect(tenues(['equipo', 'despues'])).toEqual([]);
    expect(tenues()).toEqual([]);
    expect(leer('estilos.css')).toContain('.lv-pasada.lv-tenue {');
    expect(leer('app.ts')).toContain("return [...d.plan.fases.filter((f) => numeroFase(f) > ahora).map((f) => f.id), 'despues'];");
  });

  it('cada rama tiene su cabeza justo donde termina, y muchas no se vuelven una mancha; el globo no rompe el dibujo', () => {
    const todas = Array.from({ length: MAX_RAMAS + 5 }, (_, i) => rama(`r${i}`, CLASES_RAMA[i % CLASES_RAMA.length], `Nota r${i}`, 300 - i * 9));
    const vistas = dibujadas(svgLineaViva(todas, { ahora: AHORA }));
    expect(vistas).toHaveLength(MAX_RAMAS);
    for (const v of vistas) {
      expect(v.punta).toEqual(v.fin);
      expect(v.halo).toEqual(v.fin);
      expect(v.globo).toMatch(/\nNota r/);
      expect(v.punta[1]).toBeGreaterThanOrEqual(0);
      expect(v.punta[1]).toBeLessThanOrEqual(220);
    }
    expect(svgLineaViva([rama('a', 'respuesta', 'Dijo "hola" <y> & más')], { ahora: AHORA })).toContain('Dijo &quot;hola&quot; &lt;y&gt; &amp; más');
    const unida = svgLineaViva([], { ahora: AHORA });
    expect(unida).toContain('lv-unida');
    expect(unida).toMatch(/<path class="lv-linea" d="[^"]+"><animate attributeName="d" dur="7s" begin="-[\d.]+s"/);
    expect(LINEA).toBe(220 / 2);
  });

  it('se repinta seguido mientras el director junta y, al cerrarse la revisión, queda su marca aunque el Studio se recargue', () => {
    vi.useFakeTimers();
    vi.setSystemTime(AHORA);
    const el = { id: 'linea-viva', innerHTML: '', clientWidth: 0, clientHeight: 0, querySelector: () => null, ownerDocument: { defaultView: { setTimeout, clearTimeout } } };
    const doc = { getElementById: (id: string) => (id === 'linea-viva' ? el : null) } as unknown as Document;
    const ramas = [rama('a', 'idea', 'x', 50), rama('b', 'ajuste', 'x', 45)];
    const aqui = new Date(AHORA).toISOString();
    const recogido = () => dibujadas(el.innerHTML)[0].punta[1] - onda(directores(el.innerHTML)[0][0]);
    pintarLineaViva(ramas, doc, { revision: { aqui } });
    expect(recogido()).toBeCloseTo(alturaDeRama(0), 0);
    // A medio minuto, a media altura, sin que nadie vuelva a pintarla; al minuto, ya giran
    vi.advanceTimersByTime(DURA_CONVERGE / 2);
    expect(recogido()).toBeCloseTo(alturaDeRama(0) / 2, 0);
    vi.advanceTimersByTime(DURA_CONVERGE / 2 + DURA_PASO);
    expect(el.innerHTML).toMatch(/lv-gira"/);
    // Se cierra: el Studio se recarga (lo pintado se olvida) y la historia ya trae la revisión, con su corte
    olvidarLineaViva();
    const historia = [{ desde: hace(300), corte: aqui, junto: new Date(AHORA + 63_000).toISOString(), ramas: ramas.map((r) => ({ t: r.cuando, c: r.clase })) }];
    pintarLineaViva([], doc, { historia, revisado: historia[0].junto });
    expect(directores(el.innerHTML)).toHaveLength(0);
    expect(el.innerHTML).toContain('class="lv-revision"');
    expect(el.innerHTML).toContain('lv-unida');
    expect(() => pintarLineaViva([], { getElementById: () => null } as unknown as Document)).not.toThrow();
  });

  it('la franja del enfoque se pinta en cuanto toma tamaño, también la primera vez después de una revisión (nmvtnl7c0tit)', () => {
    let avisar: (cambios: { target: unknown }[]) => void = () => undefined;
    class Medidor {
      constructor(cb: typeof avisar) { avisar = cb; }
      observe() { /* la prueba avisa a mano */ }
      disconnect() { /* nada que soltar */ }
    }
    const franja = { id: 'linea-enfoque', innerHTML: '', clientWidth: 0, clientHeight: 0, querySelector: () => null, ownerDocument: { defaultView: { setTimeout, clearTimeout, ResizeObserver: Medidor } } };
    const doc = { getElementById: (id: string) => (id === 'linea-enfoque' ? franja : null) } as unknown as Document;
    pintarLineaViva([rama('a')], doc, {});
    expect(franja.innerHTML).toBe('');
    // El enfoque se pone y la franja toma su tamaño: se pinta sola, sin ocultarla y mostrarla
    franja.clientWidth = 900;
    franja.clientHeight = 140;
    avisar([{ target: franja }]);
    expect(franja.innerHTML).toContain('<svg');
    // Una unidad por píxel de alto: más alta, más espacio entre las cabecitas, no más grande; y con su fondo de espacio
    expect(franja.innerHTML).toContain('viewBox="0 0 900 140"');
    expect(franja.innerHTML).toContain('class="lv-espacio"');
    // Con lo mismo, el dibujo a la vista no se rehace (marcar un paso o un aviso repintan el Studio); con algo nuevo, sí
    franja.innerHTML += '<!--a la vista-->';
    pintarLineaViva([rama('a')], doc, {});
    expect(franja.innerHTML).toContain('<!--a la vista-->');
    pintarLineaViva([rama('a'), rama('b')], doc, {});
    expect(franja.innerHTML).not.toContain('<!--a la vista-->');
    // Oculta (el enfoque se va un momento), guarda su dibujo: al volver no hay un cuadro vacío (nmvvdc2f4tit)
    franja.clientWidth = 0;
    franja.clientHeight = 0;
    avisar([{ target: franja }]);
    expect(franja.innerHTML).toContain('<svg');
    olvidarLineaViva();
  });

  it('el fondo de espacio de la franja, en dos capas que se corren con la línea, más rápido las cercanas, y el mismo cielo oscuro en los dos temas (fondo-del-enfoque.md, nmvtut733tit)', () => {
    const estrellas = (svg: string, capa: string) => [...(svg.match(new RegExp(`<g class="lv-estrellas-${capa}">(.*?)</g>`))?.[1] ?? '').matchAll(/cx="([\d.]+)"/g)].map((m) => Number(m[1]));
    const antes = svgLineaViva([], { ahora: AHORA, ancho: 900, alto: ALTO_FRANJA, fondo: true });
    // Una rama nueva: la línea corre un paso; las lejanas, un tercio de ese paso, y las cercanas, casi el paso entero
    const nueva = { ...rama('n'), cuando: new Date(AHORA).toISOString() };
    const despues = svgLineaViva([nueva], { ahora: AHORA + DURA_PASO, ancho: 900, alto: ALTO_FRANJA, fondo: true });
    expect(PASO_ESTRELLAS).toBeGreaterThanOrEqual(2 / 3);
    for (const [capa, paso] of [['lejos', PASO_LEJANAS], ['cerca', PASO_ESTRELLAS]] as const) {
      const antesX = estrellas(antes, capa);
      const corridas = estrellas(despues, capa);
      expect(antesX.length).toBeGreaterThan(10);
      const corrido = antesX.map((x, i) => ((x - corridas[i]) % 900 + 900) % 900).filter((d) => d < 450);
      // El paso, más lo que derivan solas en ese tiempo, que ya va en su sitio al pintarlas (nmvvyrasktit)
      for (const d of corrido) expect(d).toBeCloseTo(PASO_POR_RAMA * paso + DERIVA_ESTRELLAS * paso * (DURA_PASO / 1000), 0);
    }
    // Pocas, pequeñas y sin halo; el mismo momento, el mismo cielo; con «menos movimiento», quietas; en la barra, nada
    const espacio = antes.slice(antes.indexOf('<g class="lv-espacio"'), antes.indexOf('<path class="lv-halo-linea"'));
    const radios = [...espacio.matchAll(/ r="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(radios.length).toBeGreaterThan(20);
    for (const r of radios) expect(r).toBeLessThanOrEqual(1.1);
    expect(espacio).not.toContain('lv-halo');
    expect(svgLineaViva([], { ahora: AHORA, ancho: 900, alto: ALTO_FRANJA, fondo: true })).toBe(antes);
    expect(estrellas(svgLineaViva([nueva], { ahora: AHORA + DURA_PASO, ancho: 900, alto: ALTO_FRANJA, fondo: true, quieta: true }), 'cerca')).toEqual(estrellas(svgEstrellas(900, ALTO_FRANJA, 0), 'cerca'));
    expect(svgLineaViva([], { ahora: AHORA })).not.toContain('lv-espacio');
    expect(svgEstrellas(900, ALTO_FRANJA, 0)).not.toContain('constelacion');
    // Y avanzan siempre, al paso que llevan cuando avanzas: el triple del tercio de antes (pd_estrellas_siempre, nmvvwzgtmtit,
    // nmvvyou1ytit). Cada capa da la vuelta a un ancho en lo que tarda a su paso; lo que ya derivó según la hora va en el sitio
    // de cada estrella y la animación empieza de cero, así un cuadro pintado antes de arrancarla no las tira hacia atrás
    // (nmvvyrasktit); cada estrella va dos veces, a un ancho de distancia, para que la vuelta no se note; con «menos
    // movimiento», sin animación
    expect(DERIVA_ESTRELLAS).toBeCloseTo(PASO_POR_RAMA / (DURA_PASO / 1000), 6);
    const unSegundo = svgLineaViva([], { ahora: AHORA + 1000, ancho: 900, alto: ALTO_FRANJA, fondo: true });
    for (const [capa, paso] of [['lejos', PASO_LEJANAS], ['cerca', PASO_ESTRELLAS]] as const) {
      const grupo = antes.match(new RegExp(`<g class="lv-estrellas-${capa}">(.*?)</g>`))?.[1] ?? '';
      const dura = 900 / (DERIVA_ESTRELLAS * paso);
      expect(grupo.startsWith(`<g class="lv-deriva" style="--lv-ancho:900;animation-duration:${Math.round(dura * 10) / 10}s">`)).toBe(true);
      const derivaron = estrellas(antes, capa).map((x, i) => ((x - estrellas(unSegundo, capa)[i]) % 900 + 900) % 900).filter((d) => d < 450);
      for (const d of derivaron) expect(d).toBeCloseTo(DERIVA_ESTRELLAS * paso, 0);
      const xs = estrellas(antes, capa);
      const mitad = xs.length / 2;
      for (let i = 0; i < mitad; i++) expect(xs[i + mitad] - xs[i]).toBeCloseTo(900, 0);
    }
    expect(svgEstrellas(900, ALTO_FRANJA, 0, AHORA, true)).not.toContain('animateTransform');
    expect(svgLineaViva([], { ahora: AHORA, ancho: 900, alto: ALTO_FRANJA, fondo: true, quieta: true })).not.toMatch(/lv-estrellas-[a-z]+"><animate/);
    // En el CSS: la franja y la barra toman el mismo cielo y los mismos colores en los dos temas; ni la carta celeste ni la paleta clara
    const css = leer('estilos.css');
    expect(css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')))).toContain('--lv-espacio:');
    expect(css.slice(css.indexOf(PALETA), css.indexOf('}', css.indexOf(PALETA)))).toContain('--lv-fondo: #12132a; --lv-borde: #12132a;');
    expect(css).not.toMatch(/constelacion/);
    expect(css).not.toContain('--lv-fondo: #f7f0dd');
    expect(css).toContain('stroke-width: var(--lv-rama-ancho, 1.6)');
    expect(leer('director.css')).toContain('background: var(--lv-espacio, var(--lv-fondo));');
  });

  it('las estrellas en toda la barra: las del menú, más tenues, al paso del enfoque y quietas con «menos movimiento» (pd_barra_galaxia)', () => {
    const cielo = svgCieloLateral(252, 900, AHORA);
    expect(cielo).toContain('viewBox="0 0 252 900"');
    // Una unidad por píxel: el mismo paso que las del enfoque
    const dura = (x: number) => Math.round((x / (DERIVA_ESTRELLAS * PASO_ESTRELLAS)) * 10) / 10;
    expect(cielo).toContain(`animation-duration:${dura(252)}s`);
    expect(svgEstrellas(900, 300, 0, AHORA)).toContain(`animation-duration:${dura(900)}s`);
    // Con «menos movimiento», sin animación, en el menú y en la línea de la barra
    expect(svgCieloLateral(252, 900, AHORA, true)).not.toContain('animateTransform');
    expect(svgCieloLateral(252, 900, AHORA, true)).toContain('<circle');
    // La línea de la barra lleva las suyas, más brillantes que las del menú
    const fuente = leer('lineaViva.ts');
    expect(fuente).toContain('{ alto: altoDeLaBarra(w, h), fondo: true, corrido }');
    expect(fuente).toContain('pintarCielo(u.raiz, ahora, quieta);');
    const css = leer('estilos.css').replace(/\r\n/g, '\n');
    const alto = (b: string, capa: string) => Number(b.match(new RegExp(`--lv-estrella-${capa}-alto: ([\\d.]+)`))?.[1]);
    const menu = css.slice(css.indexOf('.cielo-lateral {'), css.indexOf('}', css.indexOf('.cielo-lateral {')));
    const linea = css.slice(css.indexOf(PALETA), css.indexOf('}', css.indexOf(PALETA)));
    for (const capa of ['lejos', 'cerca']) expect(alto(menu, capa)).toBeLessThan(alto(linea, capa));
    // Está en la barra, detrás de todo, y no estorba los clics
    expect(menu).toContain('z-index: -1');
    expect(menu).toContain('pointer-events: none');
    expect(readFileSync(join(__dirname, '..', '..', 'index.html'), 'utf-8')).toContain('<div class="cielo-lateral" id="cielo-lateral" aria-hidden="true"></div>');
  });

  it('la franja crece hacia arriba antes de apilar las cabecitas, y vuelve a su alto al juntarlas el director (nmvttbn0otit)', () => {
    // Una por lado no pide más; desde dos en un lado, crece hasta que quedan a SEPARACION_CABEZAS
    expect(altoParaRamas(0)).toBe(ALTO_FRANJA);
    expect(altoParaRamas(2)).toBe(ALTO_FRANJA);
    for (const n of [3, 8, 13, MAX_RAMAS]) {
      const alto = altoParaRamas(n);
      expect(separacionDeCabezas(n, alto)).toBeGreaterThanOrEqual(SEPARACION_CABEZAS);
      if (alto > ALTO_FRANJA) expect(separacionDeCabezas(n, alto - 2)).toBeLessThan(SEPARACION_CABEZAS);
    }
    expect(altoParaRamas(13)).toBeGreaterThan(altoParaRamas(3));
    // Cuántas a la vez: las tuyas y, hasta que el director las junta, las suyas; ya juntas, ninguna de ellas
    const ramas = Array.from({ length: 9 }, (_, i) => rama(`r${i}`, 'idea', 'x', 50 - i));
    expect(cabezasALaVez(ramas, null, AHORA)).toBe(9);
    expect(cabezasALaVez(ramas, hace(0.05), AHORA)).toBe(9);
    expect(cabezasALaVez(ramas, hace(2), AHORA)).toBe(0);
    expect(cabezasALaVez(ramas, hace(45.5), AHORA)).toBe(4);
    // Lo pinta en --franja-crece, y el CSS lo corta con lo que deja la pantalla
    const css = leer('director.css');
    expect(css).toContain('--franja-linea: min(calc(112px + var(--franja-crece, 0px)), max(112px, calc(45 * var(--dvh))));');
    expect(leer('lineaViva.ts')).toContain("estilo.setProperty('--franja-crece', `${crece}px`);");
    // La ventana sube con ella: app.ts mide también la franja
    expect(leer('app.ts')).toContain('if (franjaMedida) medirEnfocada?.observe(franjaMedida);');
  });

  it('al pasar sobre una cabecita se abre su globo con la nota entera, desde ella, y la línea se queda quieta mientras lo lees (nmvtt33jctit)', () => {
    // La nota entera va en la rama (de voz, su transcripción: app.ts la pone como texto); la cabecita lleva lo corto
    const [r] = ramasDeAhora([{ id: 'v', cuando: hace(5), sobre: { tipo: 'general' as const }, texto: 'Uno\ndos\ntres y más' }], () => false, [], []);
    expect(r.texto).toBe('Uno\ndos\ntres y más');
    expect(r.globo).toBe('Uno\ndos');
    expect(ramasDeAhora([{ id: 'c', cuando: hace(5), sobre: { tipo: 'general' as const }, texto: 'Corta' }], () => false, [], [])[0].texto).toBeUndefined();
    const svg = svgLineaViva([r], { ahora: AHORA });
    expect(svg).toContain('<g class="lv-cabeza" data-globo="Comentario\nUno\ndos">');
    expect(svg).not.toMatch(/class="lv-cabeza"><title>/);
    expect(leer('app.ts')).toContain('d.estado.notas.map((n) => (n.audio && !n.texto && d.transcripciones[n.audio] ? { ...n, texto: d.transcripciones[n.audio] } : n))');
    // Va del lado con más espacio, centrado en la cabecita sin salirse, y con la letra más grande que quepa
    const vista = { ancho: 1400, alto: 900 };
    const corto = lugarDelGlobo({ x: 700, y: 800, ancho: 12, alto: 12 }, vista, 40);
    expect(corto.haciaArriba).toBe(true);
    expect(corto.borde).toBe(900 - 800 + 8);
    expect(corto.letra).toBe(19);
    expect(corto.izquierda + corto.ancho / 2).toBeCloseTo(706, -1);
    const largo = lugarDelGlobo({ x: 1380, y: 100, ancho: 12, alto: 12 }, vista, 3000);
    expect(largo.haciaArriba).toBe(false);
    expect(largo.izquierda + largo.ancho).toBeLessThanOrEqual(1400 - 12);
    expect(largo.maxAlto).toBeLessThan(900 - 112);
    expect(largo.letra).toBeGreaterThanOrEqual(13);
    expect(largo.letra).toBeLessThan(corto.letra);
    // Mientras está abierto, la línea no se repinta y sus animaciones se detienen; al cerrarlo, se pinta desde la hora
    const codigo = leer('lineaViva.ts');
    expect(codigo).toContain('if (!u || congelada || apretado) return;');
    expect(codigo).toContain("for (const id of CAJAS) (u.raiz.getElementById(id)?.querySelector('svg') as SVGSVGElement | null)?.pauseAnimations?.();");
    expect(codigo).toContain("caja.addEventListener('pointerover', (e) => {");
    expect(leer('estilos.css')).toMatch(/\.lv-globo \{[^}]*position: fixed;[^}]*overflow-y: auto;/);
  });

  it('el globo de una rama de ahora se abre solo al pasar el ratón por su cabecita: un clic en una rama no fija nada, y las pasadas no tienen globo (nmw2ng9jetit, nmw2h1c24tit)', () => {
    // En el dibujo: las ramas de ahora llevan su globo; las pasadas, ni grupo de rama ni globo
    const r = rama('a', 'idea', 'Mi idea', 5);
    const svg = svgLineaViva([r], { ahora: AHORA, historia: [{ desde: hace(120), junto: hace(60), ramas: [{ t: hace(90), c: 'ajuste', n: 'p', g: 'Vieja' }] }] });
    expect(svg).toContain('data-nota="a"><path class="lv-rama"');
    expect(svg).toContain('data-globo="Idea\nMi idea"');
    expect(svg).not.toContain('Vieja');
    // Al pasar por la cabecita se abre, y al salir se cierra; el clic en una rama ya no fija nada
    const codigo = leer('lineaViva.ts');
    expect(codigo).toContain('if (cabeza) abrirGlobo(cabeza, v);');
    for (const fuera of ['fijarGlobo', 'cerrarFijo', 'fijado', 'cabezaDelClic', 'RAMA_CON_GLOBO']) expect(codigo, fuera).not.toContain(fuera);
    expect(codigo).toContain('function soltarGlobo(v: Window & typeof globalThis): void {\n  if (cerrando !== null) v.clearTimeout(cerrando);');
    const css = leer('estilos.css');
    expect(css).not.toContain('.lv-n:not(.lv-girando) .lv-rama');
    expect(css).toContain('.lv-cabeza { cursor: help; }');
  });

  it('ocupa el espacio libre de la barra, con sus colores para el tema claro y para el oscuro (nmvtjdwobtit)', () => {
    const html = leer('..', '..', 'index.html');
    const i = html.indexOf('id="linea-viva"');
    expect(i).toBeGreaterThan(html.indexOf('id="navegacion"'));
    expect(i).toBeLessThan(html.indexOf('<div class="pie-lateral">'));
    const director = leer('app.ts');
    expect(director).toContain('pintarLineaViva(ramasEnLinea(), document, opcionesDeLinea());');
    expect(director).toContain('return ramasDeAhora(');
    expect(director).toContain('const opcionesDeLinea = () => ({ historia: d.lineaHistoria ?? [], porVenir: fasesPorVenir(), revisado: d.plan.revisado, revision: revisionEnLinea(), lote: loteEnLinea() });');
    const css = leer('estilos.css');
    const bloque = (desde: string) => css.slice(css.indexOf(desde), css.indexOf('}', css.indexOf(desde)));
    const paleta = bloque(PALETA);
    for (const v of ['--lv-fondo', '--lv-linea', '--lv-luz', ...CLASES_RAMA.map((c) => `--lv-${c}`), '--lv-nucleo-2', '--lv-ojo', '--lv-tu-1', '--lv-tu-2']) expect(paleta).toContain(`${v}:`);
    for (const c of CLASES_RAMA.filter((c) => c !== 'respuesta')) expect(css).toContain(`.lv-${c} { --color:`);
    // En la barra, sin bordes, a todo su ancho y sobre el cielo de la barra (nmvto1m1ytit, pd_barra_galaxia)
    const barra = bloque('.linea-viva { flex:');
    expect(barra).toContain('background: transparent');
    expect(barra).toContain('margin-inline: -12px');
    expect(barra).not.toMatch(/border|radius/);
  });

  it('lo que va haciendo el director se abre con un clic en él y se desprende de él; el atajo, solo sin la línea a la vista (nmvtnwub1tit)', () => {
    const director = leer('app.ts');
    expect(director).toContain("else if (t.closest('[data-progreso]')) abrirProgreso(abiertaTrasClic(progresoAbierto, progresoAbiertoEn, Date.now()));");
    expect(director).toContain("info.hidden = urgente ? false : r.estado !== 'en_curso' || directorEnLinea() !== null;");
    expect(director).toContain('  ubicarProgreso(caja);\n}');
    expect(director).toContain("caja.classList.add('desde-director');");
    expect(leer('estilos.css')).toContain('.progreso-director.desde-director {');
  });

  it('mientras el director revisa avanzas a un cuarto y los dos comparten el enfoque: el director nunca sale del cuadro, y al cerrarse vuelve a ti (nmvtu16qctit)', () => {
    // Una revisión larga, con muchas cosas que le dejas: lo de entre los dos se aprieta y el par se queda en el cuadro
    const aqui = hace(300);
    const muchas = Array.from({ length: 60 }, (_, i) => rama(`m${i}`, 'idea', 'x', 290 - i * 4));
    const svg = svgLineaViva(muchas, { ahora: AHORA, revision: { aqui } });
    const [xd] = directores(svg)[0];
    expect(xd).toBeGreaterThanOrEqual((200 * (1 - FOCO_MAXIMO)) / 2 - 0.5);
    expect(tu(svg)[0] - xd).toBeCloseTo(200 * FOCO_MAXIMO, 0);
    expect(tu(svg)[0]).toBeLessThan(200 - 12);
    // Al cerrarse, el enfoque vuelve a ti en unos segundos, y avanzas al paso de siempre
    const historia = [{ desde: hace(400), corte: aqui, junto: new Date(AHORA).toISOString(), ramas: [] }];
    expect(tu(svgLineaViva([], { ahora: AHORA, historia }))[0]).toBeGreaterThan(X_TU + 10);
    expect(tu(svgLineaViva([], { ahora: AHORA + 10_000, historia }))[0]).toBe(X_TU);
    // Se juntan en el 30 % de los quince segundos de antes (nmvvx1u1ptit)
    expect(DURA_CONVERGE).toBe((60_000 / 4) * 0.3);
  });

  it('el director va en la capa de encima, sobre su disco, y late con un zoom mientras trabaja; apretarlo deja quieta la línea hasta soltarlo (nmvttk603tit)', () => {
    const svg = svgLineaViva([rama('a', 'idea', 'x', 1), rama('b', 'ajuste', 'x', 0.5)], { ahora: AHORA, revision: { aqui: hace(0.2) } });
    expect(svg.indexOf('class="lv-director"')).toBeGreaterThan(svg.lastIndexOf('class="lv-rama"'));
    expect(svg.indexOf('class="lv-director"')).toBeGreaterThan(svg.indexOf('class="lv-tu"'));
    // El latido sigue donde iba aunque se repinte, al milisegundo, como la onda y las cabecitas que giran (nmvvyrasktit)
    expect(svg).toMatch(/<g class="lv-dir-late" style="animation-duration:[\d.]+s;animation-delay:-0\.8s">/);
    expect(svg).toMatch(/<animate attributeName="d" dur="7s" begin="-2s"/);
    expect(svg).toContain('<circle class="lv-dir-fondo" r="9.5"/>');
    // Su cara es la del director flotante, con su carita sonriente (nmvvx6o79tit): la misma de cara.ts
    expect(svg).toContain(`<g class="lv-dir-nucleo lv-dir-cara" transform="translate(-8.5 -9.2) scale(0.17)">${caraDentro('feliz')}</g>`);
    expect(svg).not.toContain('lv-dir-anillo');
    expect(leer('estilos.css')).toContain('.lv-dir-cara .luz { fill: none; stroke: #a8f4fb;');
    // Mientras algo se mueve, se repinta unas treinta veces por segundo: a 90 ms la rama que nace subía a saltos
    expect(CADA_MOVIENDO).toBeLessThanOrEqual(34);
    expect(leer('estilos.css')).toContain('.lv-dir-fondo { fill: var(--lv-fondo); }');
    // Mientras las ramas aún llegan se repinta seguido: apretarlo detiene el repintado hasta soltarlo, para que el clic le llegue
    const codigo = leer('lineaViva.ts');
    expect(codigo).toContain('if (!u || congelada || apretado) return;');
    expect(codigo).toContain("if ((e.target as Element).closest?.('[data-progreso]')) apretado = true;");
  });

  it('el director junta todas las que nacieron antes de aparecer, aunque después dejes muchas más (nota de voz nmvvjxk0ptit)', () => {
    const aqui = hace(60);
    const antes = Array.from({ length: 16 }, (_, i) => ({ cuando: hace(300 - i) }));
    const despues = Array.from({ length: 30 }, (_, i) => ({ cuando: hace(50 - i) }));
    const { recogidas, contigo } = gruposDeRamas([...antes, ...despues], aqui);
    // Antes, las 24 más nuevas eran todas de después y el director giraba sin ninguna de las suyas
    expect(recogidas).toHaveLength(16);
    expect(contigo).toHaveLength(MAX_RAMAS);
    expect(contigo[contigo.length - 1]).toBe(despues[despues.length - 1]);
    // Sin revisión en marcha, todas van contigo
    expect(gruposDeRamas(antes, null)).toEqual({ recogidas: [], contigo: antes });
    // En el dibujo, ya juntas, las 16 giran a su alrededor
    const ramas = [...antes, ...despues].map((r, i) => ({ id: `n${i}`, cuando: r.cuando, clase: 'ajuste' as const }));
    const svg = svgLineaViva(ramas, { ahora: AHORA, revision: { aqui } });
    expect(svg.match(/lv-gira"/g)).toHaveLength(16);
    expect(cabezasALaVez(ramas, aqui, AHORA)).toBe(MAX_RAMAS);
  });

  it('vuelve a una velocidad constante, la misma cerca que lejos, y solo frena al llegar (nota de voz nmvvjyx9ctit)', () => {
    const tras = (ms: number) => AHORA + ESPERA_REGRESO + ms;
    // En un segundo anda lo mismo desde cerca que desde lejos: VELOCIDAD_REGRESO unidades
    expect(40 - corridoAl(40, AHORA, tras(100))).toBeCloseTo(VELOCIDAD_REGRESO / 10, 6);
    expect(400 - corridoAl(400, AHORA, tras(100))).toBeCloseTo(VELOCIDAD_REGRESO / 10, 6);
    expect(400 - corridoAl(400, AHORA, tras(1000))).toBeCloseTo(VELOCIDAD_REGRESO, 6);
    // Hacia adelante, igual, con su signo
    expect(corridoAl(-400, AHORA, tras(1000))).toBeCloseTo(-(400 - VELOCIDAD_REGRESO), 6);
    // Lo lejano tarda más que lo cercano: el tiempo crece con la distancia, no es uno fijo
    expect(duraRegreso(400)).toBeGreaterThan(duraRegreso(40) * 5);
    expect(duraRegreso(400) - duraRegreso(200)).toBeCloseTo((200 / VELOCIDAD_REGRESO) * 1000, 6);
    // Nunca se pasa ni salta: baja siempre y, en el freno, llega a cero suave
    let antes = 400;
    for (let ms = 0; ms <= duraRegreso(400); ms += 50) {
      const ahora = corridoAl(400, AHORA, tras(ms));
      expect(ahora).toBeLessThanOrEqual(antes);
      expect(ahora).toBeGreaterThanOrEqual(0);
      antes = ahora;
    }
    expect(corridoAl(400, AHORA, tras(duraRegreso(400)))).toBe(0);
    expect(corridoAl(FRENO_REGRESO / 2, AHORA, tras(duraRegreso(FRENO_REGRESO / 2) / 2))).toBeGreaterThan(0);
  });

  it('la barra se arrastra para mirar el pasado y, dos segundos después de soltarla, vuelve despacio a ti (nmvtu61hxtit)', () => {
    // Lo arrastrado se queda mientras se arrastra y durante la espera; después vuelve hasta cero
    expect(corridoAl(40, null, AHORA)).toBe(40);
    expect(corridoAl(40, AHORA, AHORA + ESPERA_REGRESO)).toBe(40);
    expect(corridoAl(40, AHORA, AHORA + ESPERA_REGRESO + duraRegreso(40))).toBe(0);
    expect(corridoAl(-40, AHORA, AHORA + ESPERA_REGRESO + duraRegreso(40))).toBe(0);
    // Corrida, la cámara muestra lo que estaba fuera del cuadro, a la izquierda
    const historia = [{ desde: hace(900), corte: hace(700), junto: hace(690), ramas: [{ t: hace(800), c: 'falla' as const }] }];
    const quieta = svgLineaViva([], { ahora: AHORA, historia });
    expect(quieta).not.toContain('class="lv-revision"');
    const atras = Number(quieta.match(/data-atras="([\d.]+)"/)?.[1]);
    expect(atras).toBeGreaterThan(0);
    expect(quieta).toContain('data-adelante="0"');
    const corrida = svgLineaViva([], { ahora: AHORA, historia, corrido: atras });
    expect(corrida).toContain(`<g class="lv-camara" transform="translate(${atras} 0)">`);
    expect(corrida).toContain('class="lv-revision"');
    expect(corrida).toContain('class="lv-pasada lv-falla"');
    // Sin historia no hay pasado que mirar
    expect(svgLineaViva([], { ahora: AHORA })).toContain('data-atras="0"');
    const codigo = leer('lineaViva.ts');
    expect(codigo).toContain('miradas.set(caja.id, { corrido: dentro(desde.corrido + dx * porPixel, -adelante, atras), soltada: null });');
    expect(leer('estilos.css')).toMatch(/\.linea-viva \{ flex: 1 1 auto;[^}]*cursor: grab;[^}]*touch-action: pan-y;/);
  });

  it('la línea completa ondula igual en cada punto, sin importar hasta dónde esté corrida (nmvztv1j7tit)', () => {
    const op = { ahora: AHORA, ancho: 800, alto: 300, completa: true };
    const puntos = (html: string, fase: 0 | 1) => {
      const m = html.match(/<path class="lv-linea" d="[^"]*"><animate [^>]*values="([^"]*)"/)!;
      const d = m[1].split(';')[fase];
      return new Map(d.slice(1).split(' L').map((p) => p.split(' ').map(Number) as [number, number]));
    };
    const a = svgLineaViva([], { ...op, corrido: 0 });
    const b = svgLineaViva([], { ...op, corrido: 137.3 });
    for (const fase of [0, 1] as const) {
      const pa = puntos(a, fase);
      const pb = puntos(b, fase);
      const juntos = [...pa.keys()].filter((x) => pb.has(x));
      expect(juntos.length).toBeGreaterThan(100);
      for (const x of juntos) expect(pb.get(x), `en x=${x}`).toBe(pa.get(x));
    }
    // En la misma fase de la onda, y con lo dibujado a los dos lados de la vista, para correrla sin repintarla
    expect(a.match(/begin="([^"]*)"/)?.[1]).toBe(b.match(/begin="([^"]*)"/)?.[1]);
    const xs = [...puntos(a, 0).keys()];
    expect(Math.min(...xs)).toBeLessThanOrEqual(4 - MARGEN_COMPLETA);
    expect(Math.max(...xs)).toBe(400);
  });

  it('la franja del modo enfoque se arrastra igual que la barra (nmvvii0vwtit), cada una con su cámara (nmvvmggqgtit)', () => {
    const codigo = leer('lineaViva.ts');
    expect(codigo).not.toContain("if (caja.id === 'linea-viva') arrastrable(caja, v);");
    expect(codigo).toMatch(/apretable\(caja, v\);\n(?: {2}\/\/.*\n)* {2}arrastrable\(caja, v\);/);
    expect(codigo).toContain('const corrido = corridoDe(el.id);');
    expect(codigo).toContain("fondo: true, corrido } : { alto: altoDeLaBarra(w, h), fondo: true, corrido };");
    // Los píxeles pasan a unidades con el ancho del dibujo de cada caja, no con el de la barra
    expect(codigo).toContain("const porPixel = (Number(svg?.getAttribute('viewBox')?.split(' ')[2]) || ANCHO_BARRA) / Math.max(1, caja.clientWidth);");
    const css = leer('director.css');
    expect(css).toMatch(/\.franja-linea \.lv-caja \{[^}]*cursor: grab;[^}]*touch-action: pan-y;/);
    expect(css).toContain('.franja-linea .lv-caja.arrastrando { cursor: grabbing; }');
  });

  it('al volver a ti, la cámara se pinta en cada cuadro de la pantalla, no cada 90 ms: sin saltos (pd_linea_regreso_suave)', () => {
    vi.useFakeTimers({ now: AHORA });
    try {
      olvidarLineaViva();
      const cuadros: FrameRequestCallback[] = [];
      const v = { setTimeout, clearTimeout, requestAnimationFrame: (f: FrameRequestCallback) => cuadros.push(f), cancelAnimationFrame: () => undefined, matchMedia: () => ({ matches: false }) };
      const oyentes: Record<string, (e: unknown) => void> = {};
      const barra = {
        id: 'linea-viva', innerHTML: '', clientWidth: 300, clientHeight: 200, classList: { add: () => undefined, remove: () => undefined },
        querySelector: () => ({ getAttribute: (a: string) => (a === 'viewBox' ? '0 0 300 200' : a === 'data-atras' ? '500' : '0'), pauseAnimations: () => undefined }),
        addEventListener: (t: string, f: (e: unknown) => void) => (oyentes[t] = f), setPointerCapture: () => undefined, ownerDocument: { defaultView: v },
      };
      const doc = { getElementById: (id: string) => (id === 'linea-viva' ? barra : null) } as unknown as Document;
      pintarLineaViva([], doc, { historia: [{ desde: hace(900), corte: hace(700), junto: hace(690), ramas: [] }] });
      // Se arrastra y se suelta: durante la espera, con el reloj; al volver, con el cuadro siguiente de la pantalla
      oyentes.pointerdown({ button: 0, clientX: 100, pointerId: 1 });
      oyentes.pointermove({ clientX: 160, pointerId: 1 });
      oyentes.pointerup({ pointerId: 1 });
      const antes = cuadros.length;
      vi.advanceTimersByTime(ESPERA_REGRESO + 100);
      expect(cuadros.length).toBeGreaterThan(antes);
      expect(leer('lineaViva.ts')).toContain("cuadro = { v, id: v.requestAnimationFrame(() => correrCamaras()) };");
    } finally {
      olvidarLineaViva();
      vi.useRealTimers();
    }
  });

  it('al volver solo se corre el grupo de la cámara, sin rehacer el dibujo (la onda sigue), y solo en la línea que se arrastró (nmvvmm2rntit, nmvvmggqgtit)', () => {
    vi.useFakeTimers({ now: AHORA });
    try {
      olvidarLineaViva();
      const cuadros: FrameRequestCallback[] = [];
      const v = { setTimeout, clearTimeout, requestAnimationFrame: (f: FrameRequestCallback) => cuadros.push(f), cancelAnimationFrame: () => undefined, matchMedia: () => ({ matches: false }) };
      const caja = (id: string) => {
        const oyentes: Record<string, (e: unknown) => void> = {};
        const camara: string[] = [];
        let html = '';
        let pintadas = 0;
        const el = {
          id, clientWidth: 300, clientHeight: 200, classList: { add: () => undefined, remove: () => undefined },
          get innerHTML() { return html; },
          set innerHTML(x: string) { html = x; pintadas++; },
          querySelector: (s: string) => (s === 'g.lv-camara'
            ? (html.includes('class="lv-camara"') ? { setAttribute: (_: string, t: string) => camara.push(t) } : null)
            : { getAttribute: (a: string) => (a === 'viewBox' ? '0 0 300 200' : a === 'data-atras' ? '500' : '0'), pauseAnimations: () => undefined }),
          addEventListener: (t: string, f: (e: unknown) => void) => (oyentes[t] = f), setPointerCapture: () => undefined, ownerDocument: { defaultView: v },
        };
        return { el, oyentes, camara, pintadas: () => pintadas, html: () => html };
      };
      const barra = caja('linea-viva');
      const franja = caja('linea-enfoque');
      const doc = { getElementById: (id: string) => (id === 'linea-viva' ? barra.el : id === 'linea-enfoque' ? franja.el : null) } as unknown as Document;
      pintarLineaViva([], doc, { historia: [{ desde: hace(900), corte: hace(700), junto: hace(690), ramas: [] }] });
      const franjaAntes = franja.pintadas();
      // Se arrastra la barra: la franja no se toca
      barra.oyentes.pointerdown({ button: 0, clientX: 100, pointerId: 1 });
      barra.oyentes.pointermove({ clientX: 160, pointerId: 1 });
      expect(franja.pintadas()).toBe(franjaAntes);
      expect(barra.html()).toContain('class="lv-camara"');
      barra.oyentes.pointerup({ pointerId: 1 });
      vi.advanceTimersByTime(ESPERA_REGRESO + 100);
      // En la vuelta, cada cuadro solo corre la cámara de la barra: su dibujo no se rehace
      const pintadas = barra.pintadas();
      for (let k = 0; k < 5; k++) {
        vi.advanceTimersByTime(16);
        cuadros.shift()?.(0);
      }
      expect(barra.pintadas()).toBe(pintadas);
      expect(barra.camara.length).toBeGreaterThanOrEqual(5);
      expect(franja.camara).toHaveLength(0);
      expect(franja.html()).not.toContain('class="lv-camara"');
    } finally {
      olvidarLineaViva();
      vi.useRealTimers();
    }
  });

  it('con el globo abierto la línea entera se detiene, también la cámara que vuelve, y al cerrarlo sigue desde donde iba, sin saltar (nmw2oyzjttit)', () => {
    vi.useFakeTimers({ now: AHORA });
    try {
      olvidarLineaViva();
      const cuadros: FrameRequestCallback[] = [];
      const v = { setTimeout, clearTimeout, requestAnimationFrame: (f: FrameRequestCallback) => cuadros.push(f), cancelAnimationFrame: () => undefined, matchMedia: () => ({ matches: false }) };
      const oyentes: Record<string, (e: unknown) => void> = {};
      const camara: string[] = [];
      let html = '';
      const barra = {
        id: 'linea-viva', clientWidth: 300, clientHeight: 200, classList: { add: () => undefined, remove: () => undefined },
        get innerHTML() { return html; },
        set innerHTML(x: string) { html = x; },
        querySelector: (s: string) => (s === 'g.lv-camara'
          ? (html.includes('class="lv-camara"') ? { setAttribute: (_: string, t: string) => camara.push(t) } : null)
          : { getAttribute: (a: string) => (a === 'viewBox' ? '0 0 300 200' : a === 'data-atras' ? '500' : '0'), pauseAnimations: () => undefined, classList: { add: () => undefined } }),
        addEventListener: (t: string, f: (e: unknown) => void) => (oyentes[t] = f), setPointerCapture: () => undefined, ownerDocument: { defaultView: v },
      };
      const doc = { getElementById: (id: string) => (id === 'linea-viva' ? barra : null) } as unknown as Document;
      pintarLineaViva([], doc, { historia: [{ desde: hace(900), corte: hace(700), junto: hace(690), ramas: [] }] });
      // Se arrastra atrás, se suelta y empieza a volver
      oyentes.pointerdown({ button: 0, clientX: 100, pointerId: 1 });
      oyentes.pointermove({ clientX: 160, pointerId: 1 });
      oyentes.pointerup({ pointerId: 1 });
      vi.advanceTimersByTime(ESPERA_REGRESO + 200);
      cuadros.splice(0).forEach((f) => f(0));
      const antes = camara.at(-1)!;
      expect(antes).toMatch(/^translate\((?!0 )[\d.]+ 0\)$/);
      // El globo abierto cinco segundos: nada se mueve
      congelarLineaViva(true);
      const vistos = camara.length;
      vi.advanceTimersByTime(5000);
      cuadros.splice(0).forEach((f) => f(0));
      expect(camara.length).toBe(vistos);
      // Al cerrarlo, la cámara está donde se detuvo, no de vuelta en ti
      congelarLineaViva(false);
      expect(html).toContain(`<g class="lv-camara" transform="${antes}">`);
      cuadros.splice(0).forEach((f) => f(0));
      expect(camara.at(-1)).toBe(antes);
      // Y sigue volviendo desde ahí, a su paso de siempre
      vi.advanceTimersByTime(100);
      cuadros.splice(0).forEach((f) => f(0));
      expect(Number(camara.at(-1)!.match(/[\d.]+/)![0])).toBeLessThan(Number(antes.match(/[\d.]+/)![0]));
    } finally {
      olvidarLineaViva();
      vi.useRealTimers();
    }
  });

  it('la onda, un 20 % más baja que antes, y la vuelta, a la mitad de su velocidad (nmvvmm2rntit, nmvvmggqgtit)', () => {
    expect(ONDA_ALTO).toBeCloseTo(3.6 * 0.8, 6);
    expect(VELOCIDAD_REGRESO).toBe(70);
  });
});
