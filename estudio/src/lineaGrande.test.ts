import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RevisionEnHistorial } from '../../src/director/lineasDeRevision';
import type { RevisionDeLinea } from '../../src/director/historiaLinea';
import { LUGAR_TU, PARTE_DEL_ALTO, ZOOM, abrirLineaGrande, alFinalDeLaConversacion,deltaDeRueda, fechaYHora, globoDeRevision, historiaDeRevisiones, historialHtml, lugaresDeRevisiones, moverLinea, noCerro, revisionesEnLinea, saleDelMargen, svgLineaGrande, vueltaDesde } from './lineaGrande';
import { MARGEN_COMPLETA, alturaDeRama, corridoAl, duraRegreso, svgLineaViva } from './lineaViva';

// La línea en grande (pedido pd_linea_zoom)
const leer = (...r: string[]) => readFileSync(join(__dirname, ...r), 'utf-8');
const AHORA = Date.parse('2026-11-02T12:00:00.000Z');
const nombres = { nombreModelo: (x: string) => x, nombreEsfuerzo: (x: string) => x };
const revision = (cuando: string, cambios: Partial<Extract<RevisionEnHistorial, { conRegistro: boolean }>> = {}): RevisionEnHistorial => ({
  registro: `stl-${cuando}.log`, proyecto: 'stl', cuando, planeo: [{ que: 'Las notas', hecho: true }], hizo: { commits: ['STL: la lupa'], notas: 3, archivos: 2 },
  minutos: 12, tokens: 1234567, modelo: 'claude-opus-5-5', esfuerzo: 'high', cerro: true, planAprox: 1.2, conRegistro: true, ...cambios,
});
const sinHistorial = (cuando: string): RevisionEnHistorial => ({ registro: 'x.log', proyecto: 'stl', cuando, sinHistorial: true });

/** Una revisión de la historia de la línea: su corte, cuándo cerró y dos ramas nacidas antes. */
const deLaHistoria = (corte: string, junto: string): RevisionDeLinea => {
  const hace = (min: number) => new Date(Date.parse(corte) - min * 60_000).toISOString();
  return { desde: hace(60), corte, junto, ramas: [{ t: hace(40), c: 'idea' }, { t: hace(20), c: 'ajuste' }] };
};

describe('cómo se mueve', () => {
  it('llega hasta lo más viejo, y no más allá de ti', () => {
    const atras = Number(svgLineaGrande([], { ancho: 500, alto: 300, ahora: AHORA, historia: [deLaHistoria('2026-10-01T12:00:00.000Z', '2026-10-01T12:30:00.000Z')] }).match(/data-atras="([\d.]+)"/)?.[1]);
    expect(atras).toBeGreaterThan(0);
    expect(moverLinea(0, -50, atras)).toBe(0);
    expect(moverLinea(0, 1e7, atras)).toBe(atras);
  });

  it('la rueda la mueve como una página, también si el ratón cuenta por líneas', () => {
    expect(deltaDeRueda({ deltaX: 0, deltaY: 100 })).toBe(100);
    expect(deltaDeRueda({ deltaX: -40, deltaY: 3 })).toBe(-40);
    expect(deltaDeRueda({ deltaX: 0, deltaY: 3, deltaMode: 1 })).toBe(96);
  });

  it('no vuelve sola: el botón de la esquina la lleva al punto de siempre, y al oprimirlo ya va andando (nmvzo9uaxtit)', () => {
    const codigo = leer('lineaGrande.ts').replace(/\r\n/g, '\n');
    // Soltarla, irse o abrir un historial no empiezan nada: la vuelta solo nace en el botón
    expect(codigo).not.toMatch(/alSoltar|sigueMirando|faltaParaVolver|encima = /);
    expect(codigo.match(/volviendo = vueltaDesde\(/g)).toHaveLength(1);
    expect(codigo).toContain("if (b.closest('[data-lg-al-punto]')) return empezarVuelta();");
    // Al oprimirlo ya no hay espera: un momento después ha andado, y llega al punto de siempre a la misma velocidad de la línea normal
    const ahora = 50_000;
    expect(corridoAl(200, vueltaDesde(ahora), ahora)).toBe(200);
    expect(corridoAl(200, vueltaDesde(ahora), ahora + 200)).toBeLessThan(200);
    expect(corridoAl(200, vueltaDesde(ahora), ahora + duraRegreso(200))).toBe(0);
    // Corre solo la cámara, sin rehacer el dibujo
    expect(codigo).toContain('corridoAl(corrido, volviendo, ahora)');
    expect(codigo).toContain("caja.querySelector('g.lv-camara')?.setAttribute('transform', `translate(${n1(c)} 0)`);");
  });

  it('mientras vuelve, la carita que pasa bajo el ratón no abre su globo ni detiene la vuelta (nmw76lu3qtit)', () => {
    const codigo = leer('lineaGrande.ts').replace(/\r\n/g, '\n');
    const globo = codigo.slice(codigo.indexOf('const mostrarGlobo = '), codigo.indexOf('globo.hidden = false;'));
    expect(globo).toContain('if (!r || (arrastro && desde) || volviendo !== null) return;');
    // Abrir el globo es lo único que la congela a media vuelta, y va después de esa salida
    expect(globo.indexOf('volviendo !== null) return;')).toBeLessThan(codigo.indexOf('congelarPorGlobo(true);') - codigo.indexOf('const mostrarGlobo = '));
  });

  it('con el globo de una revisión abierto la vuelta se detiene y, al cerrarlo, sigue desde donde iba, sin saltar (nmw2oyzjttit)', () => {
    const codigo = leer('lineaGrande.ts').replace(/\r\n/g, '\n');
    // Al abrirlo se detienen el cuadro de la vuelta y las animaciones del dibujo; lo que llega espera a que se cierre
    expect(codigo).toMatch(/globo\.hidden = false;\n {4}congelarPorGlobo\(true\);/);
    expect(codigo).toContain('if (volviendo !== null || desde || quietaDesde !== null) porPintar = true;');
    // Todo lo que lo cierra lo suelta, y solo ocultarGlobo lo esconde
    expect(codigo.match(/globo\.hidden = true;/g)).toHaveLength(1);
    expect(codigo).toMatch(/const ocultarGlobo = \(\) => \{\n {4}globo\.hidden = true;\n {4}congelarPorGlobo\(false\);/);
    // La vuelta se cuenta sin el tiempo que estuvo quieta: a la misma hora de antes, la cámara está en el mismo punto
    expect(codigo).toContain('volviendo += quieto;');
    const ahora = 50_000, quieto = 5000;
    const antes = corridoAl(200, vueltaDesde(ahora), ahora + 300);
    expect(antes).toBeGreaterThan(0);
    expect(corridoAl(200, vueltaDesde(ahora) + quieto, ahora + 300 + quieto)).toBeCloseTo(antes, 6);
  });

  it('el botón va en una esquina de la gráfica, fuera de lo que se arrastra, y solo se ve si está lejos del punto', () => {
    const codigo = leer('lineaGrande.ts');
    expect(codigo).toContain("alPunto.hidden = !corrido || volviendo !== null;");
    expect(codigo).toMatch(/<div class="linea-grande" data-lg-caja><\/div><button type="button" class="lg-al-punto"/);
    expect(leer('estilos.css')).toMatch(/\.lg-al-punto \{[^}]*position: absolute;[^}]*left: 12px;[^}]*bottom: 12px/);
    expect(leer('textos', 'es.ts')).toContain("'lineaGrande.alPunto':");
    expect(leer('textos', 'en.ts')).toContain("'lineaGrande.alPunto':");
  });
});

/** Lo poco del navegador que usa la ventana: lo que se escribe en la caja, la cámara, y los cuadros, que corren a mano. */
function ventanaDePrueba(datos: { historia: RevisionDeLinea[] }) {
  type Oyente = (e: Record<string, unknown>) => void;
  class Nodo {
    oyentes: Record<string, Oyente[]> = {};
    attrs: Record<string, string> = {};
    hidden = false;
    open = false;
    clientWidth = 1000;
    clientHeight = 500;
    scrollTop = 0;
    className = '';
    textContent = '';
    classList = { add() {}, remove() {}, toggle() {} };
    style = {};
    dataset = {};
    html = '';
    escrituras = 0;
    camara = new Nodo2();
    hijos: Record<string, Nodo> = {};
    addEventListener(tipo: string, f: Oyente) { (this.oyentes[tipo] ??= []).push(f); }
    get innerHTML() { return this.html; }
    set innerHTML(x: string) { this.html = x; this.escrituras++; }
    querySelector(s: string): unknown {
      if (s === 'g.lv-camara') return this.html.includes('class="lv-camara"') ? this.camara : null;
      if (s === 'svg') return { getAttribute: (a: string) => this.html.match(new RegExp(`${a}="([^"]*)"`))?.[1] ?? null, pauseAnimations() {} };
      return (this.hijos[s] ??= new Nodo());
    }
    querySelectorAll() { return []; }
    setPointerCapture() {}
    getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 500 }; }
    append() {}
    remove() {}
    showModal() { this.open = true; }
    close() { this.open = false; }
  }
  class Nodo2 {
    transform = '';
    setAttribute(_: string, v: string) { this.transform = v; }
  }
  const dlg = new Nodo();
  const cuadros: (() => void)[] = [];
  const delMundo: Oyente[] = [];
  vi.stubGlobal('document', { createElement: () => dlg, body: { append() {} } });
  vi.stubGlobal('window', { addEventListener: (_: string, f: Oyente) => delMundo.push(f), removeEventListener() {}, matchMedia: () => ({ matches: false }) });
  vi.stubGlobal('requestAnimationFrame', (f: () => void) => cuadros.push(f));
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('fetch', () => new Promise(() => {}));
  vi.stubGlobal('ResizeObserver', undefined);
  let linea = { ramas: [], historia: datos.historia };
  abrirLineaGrande({ linea: () => linea, conversacion: async () => null, nombreModelo: (x) => x, nombreEsfuerzo: (x) => x });
  const caja = dlg.querySelector('[data-lg-caja]') as Nodo;
  const emitir = (tipo: string, e: Record<string, unknown>) => caja.oyentes[tipo].forEach((f) => f(e));
  return {
    caja,
    emitir,
    globo: dlg.querySelector('[data-lg-globo]') as Nodo,
    alPunto: dlg.querySelector('[data-lg-al-punto]') as Nodo,
    apretar: (x: number) => emitir('pointerdown', { button: 0, clientX: x, pointerId: 1 }),
    mover: (x: number) => emitir('pointermove', { clientX: x, pointerId: 1 }),
    soltar: () => emitir('pointerup', {}),
    rueda: (d: number) => emitir('wheel', { deltaX: 0, deltaY: d, preventDefault() {} }),
    cuadro: () => cuadros.splice(0).forEach((f) => f()),
    llegan: (historia: RevisionDeLinea[]) => { linea = { ramas: [], historia }; delMundo.forEach((f) => f({})); },
  };
}

describe('el globo de una carita sale al pasar el ratón, sin un clic antes (nmw5dr9rxtit)', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
  const una = [deLaHistoria('2026-01-01T12:00:00.000Z', '2026-01-01T12:30:00.000Z')];
  const preparar = () => {
    const v = ventanaDePrueba({ historia: una });
    const globo = v.globo as unknown as { hidden: boolean; parentElement: unknown };
    globo.hidden = true;
    globo.parentElement = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000 }), offsetWidth: 1000 };
    const cara: Record<string, unknown> = { getAttribute: () => '0', getBoundingClientRect: () => ({ left: 100, top: 50, width: 20 }) };
    cara.closest = () => cara;
    return { v, globo, cara };
  };

  it('después de arrastrarla y soltarla fuera de la caja (sin el clic que lo desmarcaba), pasar sobre una carita abre su globo', () => {
    vi.useFakeTimers();
    const { v, globo, cara } = preparar();
    v.apretar(500);
    v.mover(560);
    v.soltar();
    vi.runAllTimers();
    v.emitir('pointerover', { target: cara });
    expect(globo.hidden).toBe(false);
  });

  it('también al moverse sobre ella sin un «pointerover» nuevo (el dibujo se rehizo debajo del ratón); con el clic se va, y vuelve al salir y entrar', () => {
    const { v, globo, cara } = preparar();
    v.emitir('pointermove', { target: cara, pointerId: 1 });
    expect(globo.hidden).toBe(false);
    v.emitir('click', { target: cara, clientX: 110 });
    expect(globo.hidden).toBe(true);
    v.emitir('pointermove', { target: cara, pointerId: 1 });
    expect(globo.hidden).toBe(true);
    v.emitir('pointerout', { target: cara, relatedTarget: null });
    v.emitir('pointermove', { target: cara, pointerId: 1 });
    expect(globo.hidden).toBe(false);
  });
});

describe('arrastrarla corre solo la cámara (nmvztv1j7tit)', () => {
  afterEach(() => vi.unstubAllGlobals());
  const vieja = [deLaHistoria('2026-01-01T12:00:00.000Z', '2026-01-01T12:30:00.000Z')];

  it('dentro de lo dibujado no se reescribe el dibujo, ni con el arrastre ni con la rueda', () => {
    const v = ventanaDePrueba({ historia: vieja });
    expect(v.caja.escrituras).toBe(1);
    v.apretar(500);
    for (const x of [510, 560, 620]) {
      v.mover(x);
      v.cuadro();
    }
    expect(v.caja.escrituras).toBe(1);
    expect(v.caja.camara.transform).toBe(`translate(${120 / ZOOM} 0)`);
    expect(v.alPunto.hidden).toBe(false);
    v.soltar();
    v.rueda(50);
    v.cuadro();
    expect(v.caja.escrituras).toBe(1);
    expect(v.caja.camara.transform).toBe(`translate(${(120 + 50) / ZOOM} 0)`);
  });

  it('al ir a dejar lo dibujado, se repinta una vez, y sigue corriendo sin repintar', () => {
    const v = ventanaDePrueba({ historia: vieja });
    v.apretar(0);
    const hasta = (MARGEN_COMPLETA + 10) * ZOOM;
    v.mover(hasta);
    v.cuadro();
    expect(v.caja.escrituras).toBe(2);
    expect(v.caja.html).toContain(`translate(${MARGEN_COMPLETA + 10} 0)`);
    v.mover(hasta + 20);
    v.cuadro();
    expect(v.caja.escrituras).toBe(2);
  });

  it('lo que llega mientras se arrastra espera a que se suelte', () => {
    const v = ventanaDePrueba({ historia: vieja });
    const hace = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
    const otra = [...vieja, deLaHistoria(hace(40), hace(10))];
    v.apretar(100);
    v.mover(200);
    v.cuadro();
    v.llegan(otra);
    expect(v.caja.escrituras).toBe(1);
    // Ni una repintada del margen la mete: el dibujo sigue siendo el de antes de soltar
    const antes = v.caja.html.match(/lv-revision/g)?.length;
    v.mover(100 + (MARGEN_COMPLETA + 10) * ZOOM);
    v.cuadro();
    expect(v.caja.escrituras).toBe(2);
    expect(v.caja.html.match(/lv-revision/g)?.length).toBe(antes);
    v.soltar();
    expect(v.caja.escrituras).toBe(3);
    expect(v.caja.html.match(/lv-revision/g)?.length).toBeGreaterThan(antes ?? 0);
  });

  it('solo se repinta al salir del margen, de cualquier lado', () => {
    expect(saleDelMargen(100, 100)).toBe(false);
    expect(saleDelMargen(100 + MARGEN_COMPLETA - 80, 100)).toBe(false);
    expect(saleDelMargen(100 + MARGEN_COMPLETA, 100)).toBe(true);
    expect(saleDelMargen(100, 100 + MARGEN_COMPLETA)).toBe(true);
  });
});

describe('dónde se marca cada revisión', () => {
  it('donde se juntaron sus ramas; un intento que no cerró, en su momento', () => {
    const corte = '2026-11-02T09:01:00.000Z';
    const h = deLaHistoria(corte, '2026-11-02T09:30:00.000Z');
    const intento = revision('2026-11-02T08:55:00.000Z', { cerro: false });
    const cerro = revision('2026-11-02T09:00:00.000Z');
    expect(lugaresDeRevisiones([intento, cerro], [h])).toEqual([intento.cuando, corte]);
    expect(lugaresDeRevisiones([cerro], [])).toEqual([cerro.cuando]);
  });
});

describe('qué revisiones salen', () => {
  it('las de este computador y, sin historial, las que la historia del proyecto trae de otro', () => {
    const local = revision('2026-11-02T09:00:00.000Z');
    const todas = revisionesEnLinea([local], [
      { desde: '2026-11-02T08:00:00.000Z', corte: '2026-11-02T09:01:00.000Z', junto: '2026-11-02T09:30:00.000Z', ramas: [] },
      { desde: '2026-10-20T08:00:00.000Z', corte: '2026-10-20T09:00:00.000Z', junto: '2026-10-20T09:30:00.000Z', ramas: [] },
    ]);
    expect(todas).toHaveLength(2);
    expect(todas[0].sinHistorial).toBe(true);
    expect(todas[1]).toBe(local);
  });

  it('solo la que se sabe que no cerró va en rojo', () => {
    expect(noCerro(revision('2026-11-02T09:00:00.000Z', { cerro: false }))).toBe(true);
    expect(noCerro(revision('2026-11-02T09:00:00.000Z'))).toBe(false);
    expect(noCerro(sinHistorial('2026-11-02T09:00:00.000Z'))).toBe(false);
  });
});

describe('el dibujo', () => {
  const op = { ancho: 1000, alto: 500, ahora: AHORA };
  const historia = [deLaHistoria('2026-11-02T09:00:00.000Z', '2026-11-02T09:30:00.000Z'), deLaHistoria('2026-11-02T10:00:00.000Z', '2026-11-02T10:30:00.000Z')];

  it('sobre el mismo cielo, tú hacia el 85 %, con la carita del director en cada revisión y en rojo las que no cerraron', () => {
    const svg = svgLineaGrande([revision('2026-11-02T09:00:00.000Z'), revision('2026-11-02T10:00:00.000Z', { cerro: false })], { ...op, historia });
    expect(svg).toContain('lv-estrellas-lejos');
    expect(svg).toContain('lv-tu');
    expect(svg.match(/data-lg-revision=/g)).toHaveLength(2);
    expect(svg.match(/lg-revision no-cerro/g)).toHaveLength(1);
    expect(svg.match(/class="lv-dir-nucleo lv-dir-cara"/g)).toHaveLength(2);
    expect(Number(svg.match(/class="lv-tu"><title>[^<]*<\/title><g>.*?translate\(([\d.]+) /s)?.[1])).toBe(1000 * LUGAR_TU);
    expect(ZOOM).toBeGreaterThan(1);
  });

  it('con las ramas y los trazos que se juntan en cada revisión: los mismos de la línea normal (nmvzlkkuztit)', () => {
    const grande = svgLineaGrande([revision('2026-11-02T09:00:00.000Z')], { ...op, historia });
    const normal = svgLineaViva([], { ...op, historia });
    expect(grande.match(/class="lv-pasada /g)).toHaveLength(normal.match(/class="lv-pasada /g)!.length);
    expect(grande.match(/class="lv-pasada /g)).toHaveLength(4);
    expect(grande.match(/class="lv-revision"/g)).toHaveLength(2);
    // Y las ramas de ahora, las mismas de la barra
    const ramas = [{ id: 'n', cuando: '2026-11-02T11:00:00.000Z', clase: 'idea' as const }];
    expect(svgLineaGrande([], { ...op, ramas })).toContain('class="lv-rama"');
  });

  it('las líneas ocupan cerca del 30 % del alto, con el cielo a la vista, y cabe más historia (nmvznun6qtit)', () => {
    expect(PARTE_DEL_ALTO).toBe(0.3);
    // La rama más alejada de la línea, en la gráfica nueva, frente a la que llenaba todo el alto
    const lejosDe = (svg: string) => Math.max(...[...svg.matchAll(/class="lv-pasada [^"]*"[^>]*\bd="([^"]+)"/g)].flatMap((m) => [...m[1].matchAll(/-?\d+(?:\.\d+)? (-?\d+(?:\.\d+)?)/g)].map((y) => Math.abs(Number(y[1]) - op.alto / 2))));
    const nueva = lejosDe(svgLineaGrande([], { ...op, historia }));
    const antes = lejosDe(svgLineaViva([], { ...op, historia }));
    expect(nueva / antes).toBeLessThan(0.45);
    expect(Math.abs(alturaDeRama(0, op.alto * PARTE_DEL_ALTO, 1))).toBeCloseTo(op.alto * PARTE_DEL_ALTO / 2 - 9);
    // Y la misma ventana, a menos píxeles por unidad, abarca más tiempo que antes
    expect(ZOOM).toBeLessThan(2);
  });

  it('la historia entera, sin el tope de la línea normal, y solo lo que está cerca de la vista', () => {
    const larga = Array.from({ length: 30 }, (_, i) => deLaHistoria(new Date(AHORA - (30 - i) * 3_600_000).toISOString(), new Date(AHORA - (30 - i) * 3_600_000 + 60_000).toISOString()));
    expect(svgLineaGrande([], { ancho: 8000, alto: 500, ahora: AHORA, historia: larga }).match(/class="lv-pasada /g)!.length).toBe(60);
    // Corrida muy atrás, lo de cerca de ti no se dibuja: no se paga lo que no se ve
    const atras = Number(svgLineaGrande([], { ...op, historia: larga }).match(/data-atras="([\d.]+)"/)?.[1]);
    const lejos = svgLineaGrande([], { ...op, historia: larga, corrido: atras });
    expect(lejos.match(/class="lv-pasada /g)!.length).toBeLessThan(60);
  });

  it('sin fechas en texto: lo dice un globo al pasar, que se va con el clic (nmvzls511tit)', () => {
    const svg = svgLineaGrande([revision('2026-11-02T09:00:00.000Z')], { ...op, historia });
    expect(svg).not.toContain('<text');
    expect(svg).not.toContain('lg-fecha');
    // Sin el globo del navegador encima del nuestro
    expect(svg.slice(svg.indexOf('data-lg-revision'))).not.toMatch(/<title>[^<]*revisi/i);
    expect(svg).not.toMatch(/<svg[^>]*>\s*<title>/);
    expect(fechaYHora('2026-11-02T17:37:00.000Z')).toMatch(/2 de noviembre de 2026.*\d{1,2}:37/);
    const codigo = leer('lineaGrande.ts');
    expect(codigo).toContain('globo.textContent = globoDeRevision(r, historiaDeRevisiones(revisiones, historia())[i] ?? null);');
    const elegir = codigo.slice(codigo.indexOf('const elegir ='), codigo.indexOf('const mostrarGlobo ='));
    expect(elegir).toContain('globo.hidden = true;');
  });

  it('el globo de cada revisión trae, debajo de su fecha, su informe: cuántas ramas abriste y qué pasó con ellas, o que es de antes del 4 de noviembre (pd_linea_informe, nmw2nig5ftit)', () => {
    const nueva: RevisionDeLinea = { desde: '2026-11-04T06:00:00.000Z', corte: '2026-11-04T07:00:00.000Z', junto: '2026-11-04T07:30:00.000Z', ramas: [
      { t: '2026-11-04T06:10:00.000Z', c: 'idea', q: 'junta' }, { t: '2026-11-04T06:20:00.000Z', c: 'ajuste', q: 'espera' }, { t: '2026-11-04T06:30:00.000Z', c: 'falla', q: 'cierra' },
    ] };
    const vieja: RevisionDeLinea = { desde: '2026-10-29T06:00:00.000Z', junto: '2026-10-29T07:30:00.000Z', ramas: [{ t: '2026-10-29T06:10:00.000Z', c: 'idea' }] };
    const revs = [revision('2026-10-29T07:25:00.000Z'), revision('2026-11-04T07:02:00.000Z'), revision('2026-11-05T09:00:00.000Z')];
    const suya = historiaDeRevisiones(revs, [vieja, nueva]);
    expect(suya).toEqual([vieja, nueva, null]);
    // Los lugares siguen siendo los de siempre
    expect(lugaresDeRevisiones(revs, [vieja, nueva])).toEqual([vieja.junto, nueva.corte, revs[2].cuando]);
    expect(globoDeRevision(revs[1], nueva)).toBe(`${fechaYHora(revs[1].cuando)}\nAbriste 3 ramas\nJuntadas en la línea: 1 · esperan su fase: 1 · cerradas: 1`);
    expect(globoDeRevision(revs[0], vieja)).toBe(`${fechaYHora(revs[0].cuando)}\nAbriste 1 rama\nSin detalle: de antes del 4 de noviembre`);
    expect(globoDeRevision(revs[2], null)).toBe(fechaYHora(revs[2].cuando));
    // En varias líneas
    expect(leer('estilos.css')).toMatch(/\.lg-globo \{[^}]*white-space: pre;/);
  });

  it('con «menos movimiento», quieta: el dibujo se detiene al pintarlo, como la línea normal', () => {
    expect(leer('lineaGrande.ts')).toContain("if (quieta) caja.querySelector<SVGSVGElement>('svg')?.pauseAnimations?.();");
    // Y las estrellas no derivan
    expect(svgLineaGrande([], { ...op, quieta: true })).not.toContain('lv-deriva');
    expect(svgLineaGrande([], op)).toContain('<g class="lv-deriva"');
  });

  it('volver no rehace el dibujo a mitad de camino: lo que falta por verse se dibuja de una vez, al oprimir el botón (nota de voz del titular nmvzps27qtit)', () => {
    const codigo = leer('lineaGrande.ts').replace(/\r\n/g, '\n');
    const volver = codigo.slice(codigo.indexOf('const volver = () => {'), codigo.indexOf('/** La toma donde va'));
    // Solo corre la cámara; sin pintar en cada tramo, salvo lo que llegó de fondo, ya al final
    expect(volver).not.toContain('MARGEN_COMPLETA /');
    expect(volver.match(/pintar\(/g)).toHaveLength(1);
    expect(volver).toMatch(/if \(porPintar\) \{\s+porPintar = false;\s+pintar\(\);/);
    const empezar = codigo.slice(codigo.indexOf('const empezarVuelta = () => {'), codigo.indexOf('const elegir ='));
    expect(empezar).toContain('pintar(true);');
    // Lo de fondo y el tamaño esperan a que llegue
    expect(codigo).toContain('if (volviendo !== null || desde || quietaDesde !== null) porPintar = true;');
    expect(codigo.slice(codigo.indexOf('new ResizeObserver'), codigo.indexOf('medidor?.observe'))).toContain('pintarAlQuedarLibre();');
    // Una consulta del Studio sin nada nuevo no rehace el dibujo ni reinicia la onda
    expect(codigo).toContain('if (nueva === huella) return;');
    // Y de verdad está todo: lo que quedaba a la derecha de la vista, lejos, se dibuja al pedirlo, y sin eso no
    const comun = { ancho: 500, alto: 300, ahora: AHORA };
    const historia = [deLaHistoria('2026-11-02T11:00:00.000Z', '2026-11-02T11:30:00.000Z')];
    const reciente = [{ id: 'r', cuando: new Date(AHORA - 1000).toISOString(), clase: 'idea' as const }];
    const lejos = { ...comun, historia, ramas: [...Array(60)].map((_, i) => ({ id: `v${i}`, cuando: new Date(AHORA - (100 + i) * 3_600_000).toISOString(), clase: 'idea' as const })).concat(reciente) };
    const trazoHastaTi = (svg: string) => Math.max(...[...(svg.match(/<path class="lv-linea" d="M([^"]+)"/)?.[1] ?? '').matchAll(/([\d.-]+) [\d.-]+/g)].map((m) => Number(m[1])));
    expect(trazoHastaTi(svgLineaGrande([], { ...lejos, corrido: 2000, hastaTi: true }))).toBeGreaterThan(trazoHastaTi(svgLineaGrande([], { ...lejos, corrido: 2000 })));
  });
});

describe('el historial de una revisión', () => {
  it('su título dice la fecha y la hora exactas (nmvzls511tit)', () => {
    const html = historialHtml(revision('2026-11-02T17:37:00.000Z'), 0, nombres);
    expect(html.match(/<header class="cabeza-historial"><b>([^<]*)<\/b>/)?.[1]).toBe(fechaYHora('2026-11-02T17:37:00.000Z'));
    expect(fechaYHora('2026-11-02T17:37:00.000Z')).toMatch(/\d{1,2}:37/);
    expect(historialHtml(sinHistorial('2026-11-02T17:37:00.000Z'), 0, nombres)).toMatch(/<b>[^<]*:37/);
  });

  it('dice lo que planeó, lo que hizo y lo que gastó, en tokens y parte aproximada del plan, nunca en dinero', () => {
    const html = historialHtml(revision('2026-11-02T09:00:00.000Z'), 0, nombres);
    expect(html).toContain('Las notas');
    expect(html).toContain('STL: la lupa');
    expect(html).toMatch(/1.234.567/);
    expect(html).toContain('1,2');
    expect(html).toContain('aproximado');
    expect(html).toContain('data-lg-conversacion="0"');
  });

  it('suma lo que eligió el titular: lo negado, los otros modelos y para qué, y las urgencias y aclaraciones; sin nada de eso, no lo menciona (nmvzpxrkztit)', () => {
    const sin = historialHtml(revision('2026-11-02T09:00:00.000Z'), 0, nombres);
    for (const titulo of ['Lo que se le negó', 'Otros modelos', 'Las urgencias']) expect(sin).not.toContain(titulo);
    const con = historialHtml(revision('2026-11-02T09:00:00.000Z', {
      negados: ['Bash: gh release create <x>'],
      otrosModelos: [{ modelo: 'claude-sonnet-5-5', para: ['Leer los registros', 'Cruzar notas'] }, { modelo: 'claude-haiku-5-5', para: [] }],
      aparte: [{ tipo: 'urgencia', cuando: '2026-11-02T10:00:00.000Z', notas: 1, cerro: true }, { tipo: 'aclaracion', cuando: '2026-11-02T11:00:00.000Z', notas: 2, cerro: false }],
    }), 0, nombres);
    expect(con).toContain('<h4>Lo que se le negó</h4>');
    expect(con).toContain('Bash: gh release create &lt;x&gt;');
    expect(con).toContain('claude-sonnet-5-5, para: Leer los registros; Cruzar notas');
    expect(con).toContain('<li>claude-haiku-5-5</li>');
    expect(con).toContain('<h4>Las urgencias y las aclaraciones que le siguieron</h4>');
    expect(con).toMatch(/Urgencia · [^<]* · 1 nota respondida<\/li>/);
    expect(con).toMatch(/Aclaración · [^<]* · 2 notas respondidas · No cerró<\/li>/);
  });

  it('sin su registro, sin «La conversación» y lo dice; sin resumen, también lo dice', () => {
    expect(historialHtml(revision('2026-11-02T09:00:00.000Z', { conRegistro: false }), 0, nombres)).not.toContain('data-lg-conversacion');
    const sin = historialHtml(sinHistorial('2026-11-02T09:00:00.000Z'), 0, nombres);
    expect(sin).toContain('no hay historial');
    expect(sin).not.toContain('data-lg-conversacion');
  });

  it('con su registro, dos pestañas, «Resumen» elegida y «Conversación», sin el botón «Ver la conversación» (nmw5iimavtit)', () => {
    const html = historialHtml(revision('2026-11-02T09:00:00.000Z'), 0, nombres);
    expect(html).toContain('role="tablist"');
    expect(html).toMatch(/aria-selected="true" data-lg-pestana="resumen">Resumen<\/button>/);
    expect(html).toMatch(/aria-selected="false" data-lg-pestana="conversacion" data-lg-conversacion="0">Conversación<\/button>/);
    expect(html).toContain('data-lg-panel="resumen">');
    expect(html).toContain('data-lg-panel="conversacion" hidden></div>');
    expect(html).not.toContain('boton-suave');
    for (const idioma of ['es', 'en']) {
      const textos = leer('textos', `${idioma}.ts`);
      expect(textos).not.toContain("'lineaGrande.conversacion'");
      expect(textos).not.toContain("'lineaGrande.volver'");
    }
    // «Resumen» vuelve arriba; «Conversación», al final
    const codigo = leer('lineaGrande.ts');
    expect(codigo).toContain("if (pestana.dataset.lgPestana === 'resumen') return alResumen();");
    expect(codigo).toContain('const alResumen = () => { lado.scrollTop = 0; };');
    expect(codigo).toContain('if (panel.dataset.lgCargada) return alFinalDeLaConversacion(lado);');
  });

  it('«Conversación» abre al final, donde terminó la revisión, no arriba (nmw5gj40stit)', () => {
    const chat = { scrollTop: 0, scrollHeight: 900 };
    const lado = { scrollTop: 0, scrollHeight: 2400, querySelectorAll: (s: string) => (s === '.chat-revision' ? [chat] : []) };
    alFinalDeLaConversacion(lado);
    expect(lado.scrollTop).toBe(lado.scrollHeight);
    expect(chat.scrollTop).toBe(chat.scrollHeight);
    // Sin conversación dentro, igual queda abajo
    const solo = { scrollTop: 0, scrollHeight: 300 };
    alFinalDeLaConversacion(solo);
    expect(solo.scrollTop).toBe(300);
    // Al traerla, el panel va al final, también en el cuadro siguiente, y nunca vuelve arriba
    const codigo = leer('lineaGrande.ts');
    const clic = codigo.slice(codigo.indexOf("closest<HTMLButtonElement>('[data-lg-conversacion]')"), codigo.indexOf('// Al abrirse o cerrarse el historial'));
    expect(clic).toContain('alFinalDeLaConversacion(lado);');
    expect(clic).toContain('requestAnimationFrame(() => alFinalDeLaConversacion(lado));');
    expect(clic).not.toContain('lado.scrollTop = 0');
  });

  it('la que no cerró lo dice, con su causa', () => {
    expect(historialHtml(revision('2026-11-02T09:00:00.000Z', { cerro: false, termino: 'detenida' }), 0, nombres)).toMatch(/No cerró.*detuv/);
  });
});

describe('la lupa', () => {
  const html = leer('..', '..', 'index.html');
  const css = leer('estilos.css');

  it('va fuera de la caja que se arrastra, así que apretarla no arrastra; siempre a la vista, tenue; y solo en la barra', () => {
    expect(html).toMatch(/id="linea-viva"><\/div>\s*<button type="button" class="lupa-linea" id="lupa-linea"/);
    expect(css).toMatch(/\.lupa-linea \{[^}]*opacity: 0\.5/);
    // A la derecha de la barra: a la izquierda se traslapaba con las líneas (nmvznw85ttit)
    expect(css).toMatch(/\.lupa-linea \{ align-self: flex-end;/);
    expect(css).toContain('.linea-viva:empty + .lupa-linea { display: none; }');
    expect(html.match(/lupa-linea/g)!.length).toBe(2);
  });

  it('la ventana mide un 90 % de la pantalla, con su lado más ancho, sobre el mismo cielo y con la paleta de la línea', () => {
    expect(css).toMatch(/\.ventana-linea \{[^}]*width: calc\(90 \* var\(--vw\)\);[^}]*height: calc\(90 \* var\(--vh\)\)/);
    expect(css).toContain('.lado-linea-grande { flex: 0 0 min(560px, 42%);');
    expect(css).toMatch(/\.linea-grande \{[^}]*background: var\(--lv-espacio\)/);
    expect(css).toContain(':is(.linea-viva, .franja-linea, .linea-grande) {');
  });

  it('app.ts la abre con la lupa y le da la conversación, y el servidor ya da su historial', () => {
    const app = leer('app.ts');
    expect(app).toContain("closest?.('#lupa-linea')");
    expect(app).toContain('abrirLineaGrande({');
    expect(leer('lineaGrande.ts')).toContain("fetch('/__estudio/director/historial-revisiones')");
  });
});

describe('la rueda en la línea en grande (nota de voz del titular nmw6schrhtit)', () => {
  it('mueve el tiempo solo sobre la línea; sobre la conversación y las listas desplaza como siempre, y la página de atrás no se mueve', () => {
    const codigo = leer('lineaGrande.ts');
    // El oyente que toma la rueda está en la caja de la línea, y la conversación (el lado) es su hermana, no su hija
    expect(codigo).toContain("caja.addEventListener('wheel', (e) => {");
    expect(codigo).not.toMatch(/(dlg|lado|document)\.addEventListener\('wheel'/);
    expect(codigo).toContain('<div class="linea-grande" data-lg-caja></div>');
    const caja = codigo.indexOf('data-lg-caja></div>');
    const lado = codigo.indexOf('<aside class="lado-linea-grande" data-lg-lado hidden></aside></div>');
    expect(caja).toBeGreaterThan(0);
    expect(lado).toBeGreaterThan(caja);
    const css = leer('estilos.css');
    // La conversación se desplaza: nada de adentro del diálogo corta la cadena de la rueda
    expect(css).toMatch(/^\.lado-linea-grande \{[^}]*overflow-y: auto;/m);
    expect(css).not.toMatch(/dialog \*[^{]*\{[^}]*overscroll-behavior/);
    // Y la página de atrás se queda quieta: el diálogo corta la cadena y la página no se desplaza con uno abierto
    expect(css).toContain('\ndialog { overscroll-behavior: contain; }');
    expect(css).toContain('\nhtml:has(dialog:modal) { overflow: hidden;');
  });
});
