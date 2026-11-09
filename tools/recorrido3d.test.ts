import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

// El primer tramo del recorrido en 3D de «Qué es STL» (pd_recorrido_3d), con lo que eligió el titular el 3 de noviembre
// de 2026 (un tramo corto primero, los seis nombres del menú a la vista) y con lo que pidió al verlo: la portada con tú,
// el Studio y el modelo, la estación 1 solo con su botón, la estación 2 con un panel a la izquierda y un recuadro por
// problema, la cámara más lenta, la animación en grande sin tapar el menú y la frase de la estación 5
const raiz = join(import.meta.dirname, '..');
const html = readFileSync(join(raiz, 'docs/difusion/mundo-3d.html'), 'utf8');
const js = readFileSync(join(raiz, 'docs/difusion/mundo-3d.js'), 'utf8');
const estacionDos = html.match(/<article class="estacion dos" id="e-te-ha-pasado">[\s\S]*?<\/article>/)?.[0] ?? '';
const estacionUno = html.match(/<article class="estacion" id="e-que-es">[\s\S]*?<\/article>/)?.[0] ?? '';
// Los clips con su «Confirmo» que esperan la cuota de Google para generarse (mundo-3d.js › CLAVES_SIN_VOZ_TODAVIA): ni
// tienen su mp3 ni se piden
const clavesSinVozTodavia = new Set(new Function(`return ${js.match(/const CLAVES_SIN_VOZ_TODAVIA = new Set\((\[[^\n]*\])\);/)?.[1] ?? '[]'};`)() as string[]);
const problemasEnLaPagina = [...estacionDos.matchAll(/<details class="problema" data-resuelve="(\d+)" data-corto="([^"]+)"><summary>([^<]+)<\/summary><p>([^<]+)<\/p><\/details>/g)];

describe('el primer tramo del recorrido en 3D de «Qué es STL»', () => {
  it('el menú flotante lleva los tres nombres, en el orden elegido, sin «Cómo funciona», «Lo que ya trae» ni «¿Reemplaza a otros métodos?» (nmw40cp3jtit, nmw40fizktit, nmw47ga2wtit), y enlaza solo las estaciones que ya existen', () => {
    const menu = html.match(/<nav class="menu"[\s\S]*?<\/nav>/)?.[0] ?? '';
    const nombres = [...menu.matchAll(/<(?:a|span)[^>]*>([^<]+)<\/(?:a|span)>/g)].map((m) => m[1]);
    // «Cómo empezar», la estación 3, en lugar de «¿Reemplaza a otros métodos?» (pd_como_empezar)
    expect(nombres).toEqual(['Qué es STL', '¿Te ha pasado…?', 'Cómo empezar', 'La documentación']);
    const destinos = [...menu.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    // «La documentación», la última, ya existe y tiene su enlace (pd_pagina_unica)
    expect(destinos).toEqual(['e-que-es', 'e-te-ha-pasado', 'e-como-empezar', 'e-documentacion']);
    for (const id of destinos) expect(html).toMatch(new RegExp(`<article class="estacion[^"]*" id="${id}">`));
    // El de la estación en que se está, resaltado
    expect(js).toContain("a.classList.toggle('actual', es);");
  });

  it('«Qué es STL» del menú vuelve a la estación 1 desde cualquier estación: cierra el recuadro abierto, y con ?ver=N ya no recarga otra ?ver=: suelta la estación fija y viaja por la línea (nmw19elcqtit, nmw9f5k8ptit)', () => {
    const menu = js.match(/enlaces\.forEach\(\(a\) => a\.addEventListener\('click', \(e\) => \{[\s\S]*?\n {2}\}\)\);/)?.[0] ?? '';
    expect(menu).toContain('if (i < 0) return;');
    expect(menu.indexOf('cerrarPopup();')).toBeGreaterThan(menu.indexOf('e.preventDefault();'));
    expect(menu.indexOf('cerrarPopup();')).toBeLessThan(menu.indexOf('scrollTo('));
    expect(menu).not.toContain('location.search');
    expect(menu.indexOf('soltarFijo();')).toBeGreaterThan(menu.indexOf('cerrarPopup();'));
    expect(menu.indexOf('soltarFijo();')).toBeLessThan(menu.indexOf('if (fijo !== null) return;'));
    expect(menu.indexOf('if (fijo !== null) return;')).toBeLessThan(menu.indexOf('scrollTo('));
    expect(menu).toContain('scrollTo({ top: anclas[i + 1]');
  });

  it('con ?ver=N, el primer toque de una persona la vuelve el recorrido de siempre: el menú viaja, la rueda y el arrastre mueven la cámara; sin toque, ?video y ?compartir siguen fijos (nmw9f5k8ptit)', () => {
    // fijo ya no es const: se suelta
    expect(js).toMatch(/\nlet fijo = compartir \? 0 : enVideo \? 1 : verTexto === null \? null/);
    expect(js).not.toMatch(/const fijo = /);
    const soltar = js.match(/function soltarFijo\(\) \{[\s\S]*?\n {2}\}/)?.[0] ?? '';
    // Solo ?ver=N: ni el video ni la imagen al compartir
    expect(soltar).toContain('if (fijo === null || verTexto === null || enVideo || compartir) return;');
    // La página deja de ser una sola estación, se vuelve a medir y el scroll queda donde ya está la cámara, antes de soltar
    const pasos = ["classList.remove('ver-parada')", 'medir();', "behavior: 'instant'", 'fijo = null;', 'history.replaceState('];
    const donde = pasos.map((p) => soltar.indexOf(p));
    for (const [i, d] of donde.entries()) expect(d, pasos[i]).toBeGreaterThan(-1);
    expect([...donde].sort((a, b) => a - b)).toEqual(donde);
    // Con decimales (?ver=3.4), entre sus dos anclas, como en medir()
    expect(soltar).toContain('anclas[k] + (anclas[k + 1] - anclas[k]) * f');
    // Y la dirección pierde ?ver, ?abrir y ?seg: al recargar sigue siendo el recorrido de siempre
    expect(soltar).toContain("for (const p of ['ver', 'abrir', 'seg']) q.delete(p);");
    // El toque la suelta; objetivo() sigue el scroll en cuanto fijo es null
    const toque = js.slice(js.indexOf('let tocadaEnFijo = false'), js.indexOf('function cuadro()'));
    expect(toque).toMatch(/tocadaEnFijo = true;\n\s+soltarFijo\(\);/);
    expect(js).toContain('if (fijo !== null) return fijo;');
    // Sin toque, sigue quieta a los 150 cuadros para capturarla sin pantalla
    expect(js).toContain('if (fijo !== null && !enVideo && !tocadaEnFijo && ++dibujados > 150) { quietaEnFijo = true; return; }');
  });

  describe('(a) la portada: tú, el Studio y el modelo, sin fragmentos de colores', () => {
    it('no quedan fragmentos, triángulos de colores ni toros (las estrellas son solo el cielo lejano, abajo; los únicos anillos, los de las paradas, son tubos: nmw727omntit)', () => {
      expect(js).not.toMatch(/TetrahedronGeometry/);
      expect(js).not.toMatch(/PointsMaterial/);
      expect((js.match(/new THREE\.Points\(/g) ?? []).length).toBe(1);   // uno solo, el de cada capa del cielo
      expect(js).not.toMatch(/TorusGeometry/);
      expect(js).not.toMatch(/ConeGeometry/);
    });

    it('tú es un cubo redondeado amarillo con su sonrisa, y el Studio una caja translúcida', () => {
      expect(js).toContain('RoundedBoxGeometry');
      expect(js).toContain("AMARILLO_TU = '#ffd98a'");
      expect(js).toContain('quadraticCurveTo(128, 202, 168, 158)');   // la sonrisa de su cara
      expect(js).toContain('new THREE.CanvasTexture(c)');
      expect(js).toMatch(/new THREE\.BoxGeometry\(LADO_S, LADO_S, LADO_S\)/);   // el Studio, un cuadrado
      expect(js).toContain('EdgesGeometry');   // con su marco
      expect(js).toContain('rotulo(T.estudio, MORADO, 1.0)');
    });

    it('tres actores: el desarrollador en la línea, a la izquierda, y el Studio y el modelo EN ALTO, muy por encima de ella (nmw1c3q68tit)', () => {
      // Sobre la línea: el desarrollador a la izquierda del Studio, y el modelo a su derecha
      const dTu = Number(js.match(/const D_TU = (-?\d+), D_MODELO = (-?\d+);/)?.[1]);
      const dModelo = Number(js.match(/const D_TU = (-?\d+), D_MODELO = (-?\d+);/)?.[2]);
      expect(dTu).toBeLessThan(0);
      expect(dModelo).toBeGreaterThan(0);
      expect(js).toContain('const pTu = enLinea(D_TU).addScaledVector(ARRIBA, 1.0);');   // el desarrollador, parado en la línea
      // En alto: antes el Studio estaba a 1,9 de la línea y el modelo a 2,4
      const alto = js.match(/const ALTO_STUDIO = ([\d.]+), ALTO_MODELO = ([\d.]+);/);
      expect(Number(alto?.[1])).toBeGreaterThanOrEqual(5);
      expect(Number(alto?.[2])).toBeGreaterThanOrEqual(5);
      expect(js).toContain('const centro = enLinea(0).addScaledVector(ARRIBA, ALTO_STUDIO);');
      expect(js).toContain('const pModelo = enLinea(D_MODELO).addScaledVector(ARRIBA, ALTO_MODELO);');
      expect(js).not.toContain('OctahedronGeometry');
      expect(js).not.toContain('ENTRE_ACTORES');   // ya no son cuatro en fila
      // El director, DENTRO del Studio: el mismo cubo blanco con el visor de su cara, más chico que el Studio
      const lado = Number(js.match(/const LADO_S = ([\d.]+);/)?.[1]);
      const dir = Number(js.match(/cuboConCara\(([\d.]+), '#f4f1ea', 0\.12/)?.[1]);
      expect(dir).toBeGreaterThan(0);
      expect(dir).toBeLessThan(lado / 2);
      expect(js).toContain('const pDir = centro.clone();');   // bien centrado en el cubo (nmw1g3dfftit)
      expect(js).toContain('visorDirector()');
      // La órbita de las figuras y las ordenadas caben dentro del Studio
      expect(Number(js.match(/Math\.cos\(a\) \* ([\d.]+)\)/)?.[1])).toBeLessThan(lado / 2);
      // La vista de costado, con todo (el Studio y el modelo en alto, la línea y las misiones) y más lejos
      // Centrada en el Studio, para que el modelo no quede bajo el menú de la derecha
      expect(js).toContain('const mitad = enLinea(0).addScaledVector(ARRIBA, 5);');
      expect(js).toContain('posicion: mitad.clone().addScaledVector(lado, 34).addScaledVector(ARRIBA, 0.8),');
    });

    it('los rótulos son más grandes que antes y salen de un diccionario por idioma, elegido con <html lang> (es y en)', () => {
      const dic = js.match(/const TEXTOS = \{([\s\S]*?)\n\};/)?.[1] ?? '';
      const es = dic.match(/es: \{([^}]+)\}/)?.[1] ?? '', en = dic.match(/en: \{([^}]+)\}/)?.[1] ?? '';
      const lee = (s: string) => Object.fromEntries([...s.matchAll(/(\w+): '([^']+)'/g)].map((m) => [m[1], m[2]]));
      expect(lee(es)).toMatchObject({ dev: 'Desarrollador', estudio: 'Estudio', director: 'Director', modelo: 'Modelo', falla: 'Error', idea: 'Idea', ajuste: 'Ajuste', pregunta: 'Petición', respuesta: 'Comentario' });
      expect(lee(en)).toMatchObject({ dev: 'Dev', estudio: 'Studio', director: 'Director', modelo: 'Model', falla: 'Bug', idea: 'Idea', ajuste: 'Tweak', pregunta: 'Request', respuesta: 'Comment' });
      expect(Object.keys(lee(en))).toEqual(Object.keys(lee(es)));
      expect(js).toContain("document.documentElement.lang || 'es'");
      expect(js).toContain('rotulo(T.dev, ');
      expect(js).toContain('rotulo(T.director, ');
      expect(js).toContain('rotulo(T.modelo, ');
      expect(js).toContain('rotulo(T[tipo], COLOR_TIPO[tipo]');
      // Más grandes que antes (0,55 el de «tú»; 0,5 el del director y el del modelo)
      for (const f of [/rotulo\(T\.dev, '[^']+', ([\d.]+)\)/, /rotulo\(T\.estudio, MORADO, ([\d.]+)\)/, /rotulo\(T\.modelo, MODELO, ([\d.]+)\)/]) expect(Number(js.match(f)?.[1])).toBeGreaterThanOrEqual(1);
      expect(Number(js.match(/rotulo\(T\.director, ORO, ([\d.]+)\)/)?.[1])).toBeGreaterThanOrEqual(0.7);
      // Sin textos de la estación 1 escritos a mano en español
      expect(js).not.toMatch(/rotulo\('(tú|el Studio|el director|el modelo)'/);
    });

    it('la estación 3 rotula sus tres referencias, en español y en inglés, a la derecha de cada una y sin tocarse (nmw6u5bqttit)', () => {
      const dic = js.match(/const TEXTOS = \{([\s\S]*?)\n\};/)?.[1] ?? '';
      const es = dic.match(/es: \{([^}]+)\}/)?.[1] ?? '', en = dic.match(/en: \{([^}]+)\}/)?.[1] ?? '';
      const lee = (s: string) => Object.fromEntries([...s.matchAll(/(\w+): '([^']+)'/g)].map((m) => [m[1], m[2]]));
      expect(lee(es)).toMatchObject({ descargalo: 'Descárgalo', tuCarpeta: 'Tu carpeta', pideAgente: 'Pídeselo a tu agente' });
      expect(lee(en)).toMatchObject({ descargalo: 'Download it', tuCarpeta: 'Your folder', pideAgente: 'Ask your agent' });
      expect(js).toContain('[T.descargalo, CIAN, 4.2], [T.tuCarpeta, ORO, 2.6], [T.pideAgente, VERDE, 1]');
      // Cada rótulo empieza pasado el borde de su figura y a su altura: ni una figura ni otro rótulo
      expect(js).toContain('enEscena(r, COLUMNA + 0.8 + r.scale.x / 2, y)');
      expect(js).toContain('rotulo(texto, color, 0.45, 1)');
    });

    it('cada tipo de pedido es su propia figura 3D, no solo un color, con su color del Studio y su rótulo (nmw1c3q68tit)', () => {
      const figuras = js.match(/const hacerFigura = \{([\s\S]*?)\n {4}\};/)?.[1] ?? '';
      expect([...figuras.matchAll(/\n {6}(\w+): \(mat\) => \{/g)].map((m) => m[1])).toEqual(['falla', 'idea', 'ajuste', 'pregunta', 'respuesta']);
      const tipos = new Set(JSON.parse((js.match(/const TIPOS_ENTREGA = (\[[^\]]+\]);/)?.[1] ?? '[]').replace(/'/g, '"')) as string[]);
      expect([...tipos].sort()).toEqual(['ajuste', 'falla', 'idea', 'pregunta', 'respuesta']);
      const de = (tipo: string) => figuras.match(new RegExp(`\\n {6}${tipo}: \\(mat\\) => \\{([\\s\\S]*?)\\n {6}\\},`))?.[1] ?? '';
      expect(de('falla')).toContain('new THREE.Shape()');   // un rayo, extruido
      expect(de('falla')).toContain('extruida(');
      expect(de('idea')).toContain('new THREE.SphereGeometry(');   // una bombilla: esfera y base
      expect(de('idea')).toContain('RoundedBoxGeometry');
      expect(de('ajuste')).toContain('dientes');   // un engranaje con dientes, extruido
      expect(de('ajuste')).toContain('extruida(');
      expect(de('ajuste')).toContain('holes.push');
      expect(de('pregunta')).toContain('RoundedBoxGeometry');   // un sobre con su solapa
      expect(de('pregunta')).toContain('extruida(');
      expect(de('respuesta')).toContain('quadraticCurveTo');   // un globo de diálogo con su colita, extruido
      expect(de('respuesta')).toContain('extruida(');
      expect(js).toContain('new THREE.ExtrudeGeometry(forma,');
      // Cada una con el color de su tipo, el del Studio
      expect(js).toContain('hacerFigura[tipo](brillo(COLOR_TIPO[tipo], 0.8))');
      // Un rótulo en cada figura (nmw1o0ca0tit), que pierden justo cuando el director empieza a procesarla (nmw1kggjmtit)
      expect(js).toContain('const etiquetasTipo = TIPOS_ENTREGA.map((tipo, k) => {');
      expect(js).toContain('const conEtiqueta = (k, c) => c < procesa(k) ||');
      expect(js).toContain('[procesa(k), procesa(k) + 0.06, (v) => flota(e, k, tt, v), (v) => orbita(k, tt, v), 0.5],');
    });

    it('el ciclo que se repite: unas diez cosas suben del desarrollador al Studio, el director las ordena (giran mientras habla con el modelo), vuelven ordenadas y salen a la línea como misiones', () => {
      const tipos = JSON.parse((js.match(/const TIPOS_ENTREGA = (\[[^\]]+\]);/)?.[1] ?? '[]').replace(/'/g, '"')) as string[];
      expect(tipos).toHaveLength(10);
      // Su velocidad normal (36 s; nmw1kggjmtit), con cinco segundos menos mientras el director habla con el modelo
      // (nmw1o0ca0tit, nmw27y0antit, nmw2cpbentit)
      expect(js).toContain('const CICLO_BASE = 36, MENOS_HABLA = 5, HABLA_DE = 0.28, HABLA_A = 0.48;');
      expect(js).toContain('const s = tt % CICLO_ENTREGA,');   // se repite
      // Los cuatro tramos, en su orden
      const tramos = ['// tú → el Studio', '// el Studio → el director', '// el director → el Studio, ordenados', '// el Studio → la línea, en misiones'].map((t) => js.indexOf(t));
      expect(tramos.every((i) => i > 0)).toBe(true);
      expect([...tramos].sort((a, b) => a - b)).toEqual(tramos);
      // Giran alrededor del director mientras él habla con el modelo, con sus pulsos
      expect(js).toContain('const orbita = (k, tt, v) =>');
      expect(js).toContain('const hablan = c > 0.28 && c < 0.48;');
      expect(js).toContain('m.position.copy(pDir).lerp(pModelo, ida);');
      expect(js).toContain('ordenado: centro.clone()');
      expect(js).toContain('ORDEN_TIPOS.indexOf(TIPOS_ENTREGA[a]) - ORDEN_TIPOS.indexOf(TIPOS_ENTREGA[b])');
      expect(js).not.toContain('fila: pTu.clone()');
    });

    it('el final del ciclo: el Studio devuelve «Misión 1», «Misión 2» y «Misión 3» a la línea, repartidas a lo ancho; avanzan hacia la izquierda, cada una se pone verde con su ✓ al encontrar al desarrollador y se apaga en el horizonte (nmw1c3q68tit)', () => {
      // Tres misiones sobre la línea del tiempo, repartidas (separadas entre sí) y ya no hay actores parados en ella
      const dMision = JSON.parse(js.match(/const D_MISION = (\[[^\]]+\]);/)?.[1] ?? '[]') as number[];
      expect(dMision).toHaveLength(3);
      expect(dMision).toEqual([...dMision].sort((a, b) => a - b));
      for (let j = 1; j < 3; j++) expect(dMision[j] - dMision[j - 1]).toBeGreaterThanOrEqual(5);
      const dTu = Number(js.match(/const D_TU = (-?\d+),/)?.[1]);
      for (const d of dMision) expect(d).toBeGreaterThan(dTu);   // nacen a la derecha del desarrollador
      expect(js).toContain('const pos = enLinea(d).addScaledVector(ARRIBA, 0.3);');
      expect(js).toContain('rotulo(`${T.mision} ${j + 1}`, ORO, 0.8), hecha = rotulo(`${T.mision} ${j + 1} ✓`, VERDE, 0.8);');
      // Lo que le entregaste se junta en ellas, ya ordenado: los primeros, la misión 1
      expect(js).toContain('mision: MISIONES[Math.min(2, Math.floor((r * 3) / N_ENTREGA))].pos,');
      // Se mueven a la IZQUIERDA (hacia atrás en la línea): su posición baja con el avance, hasta pasar al desarrollador y más allá
      expect(js).toContain('const d = m.d - avance;');
      expect(js).toContain('enLinea(d, m.pos).addScaledVector(ARRIBA, 0.3);');
      const fin = Number(js.match(/const D_FIN = (-?\d+);/)?.[1]);
      expect(fin).toBeLessThan(dTu);
      expect(js).toContain('const RECORRIDO = D_MISION[2] - D_FIN;');
      // Salen después de que vuelven ordenadas al Studio y terminan antes de que el ciclo empiece otra vez
      const [sale, llega] = (js.match(/const SALEN = ([\d.]+), LLEGAN = ([\d.]+);/) ?? []).slice(1).map(Number);
      expect(sale).toBeGreaterThan(0.68);   // la última figura llega a su misión hacia 0,676
      expect(llega).toBeGreaterThan(sale);
      expect(llega).toBeLessThan(1);
      // Al encontrarse con el desarrollador se ponen verdes con su ✓; después se apagan en el horizonte, detrás
      expect(js).toContain('const hecha = d <= D_TU + 0.6;');
      expect(js).toContain('m.mat.color.copy(hecha ? verde : oro); m.mat.emissive.copy(hecha ? verde : oro);');
      expect(js).toContain('m.hecha.visible = ve * alfa > 0.02 && hecha;');
      expect(js).toContain('const alfa = 1 - tope((D_TU - 2 - d) / 9);');
      expect(js).toContain('const ve = tope((c - 0.62) / 0.04) * (1 - tope((c - 0.97) / 0.03));');
      // El desarrollador queda en su lugar, listo (se alegra cuando una misión lo alcanza), y se acabó la caminata de antes
      expect(js).toContain('tu.position.copy(pTu).addScaledVector(ARRIBA, suave(encuentro) * 0.5');
      expect(js).toContain('rTu.position.copy(tu.position).addScaledVector(ARRIBA, 1.9);');
      for (const viejo of ['CAMINATA', 'HECHA', 'VUELVE', 'dondeTu']) expect(js).not.toContain(viejo);
    });
  });

  describe('(b) la estación 1: solo su título y el botón', () => {
    it('la tarjeta es solo su botón, que dice «Qué es STL», sin rótulo encima ni miniatura (nmw17k73utit, nmw5o26vdtit, nmw6p0g7htit)', () => {
      expect(estacionUno).not.toContain('<h2');
      expect(estacionUno.match(/Qué es STL/g)).toHaveLength(1);   // sin el «1 · Qué es STL» repetido
      expect(estacionUno).not.toContain('class="eyebrow"');
      expect(estacionUno).toContain('data-texto-ver>Qué es STL</a>');
      expect(estacionUno).not.toContain('Ver la animación');
      expect(estacionUno).not.toContain('<iframe');
      expect(html).not.toContain('class="marco"');
      expect(html).not.toContain('ver-marco');
    });

    it('no quedan los párrafos explicativos, el pie ni el texto de la entrada', () => {
      expect(estacionUno.match(/<p[ >]/g)).toBeNull();   // ni siquiera el eyebrow repetido
      expect(html).not.toContain('class="pie"');
      expect(html).not.toContain('lo detiene, y el');
      expect(html).not.toContain('La línea del tiempo de un proyecto, por dentro');
    });

    it('la entrada conserva «¿Qué es STL?» y «Empieza el recorrido ↓»', () => {
      const entrada = html.match(/<header class="entrada">[\s\S]*?<\/header>/)?.[0] ?? '';
      expect(entrada).toContain('<h1>¿Qué es STL?</h1>');
      expect(entrada).toContain('Empieza el recorrido <span aria-hidden="true">↓</span>');
      expect(entrada).not.toContain('<p>');
    });
  });

  describe('(c) la estación 2: un panel a la izquierda con los cinco grandes problemas siempre a la vista (nmw1bwnvztit)', () => {
    it('con 3D no hay lista ni tarjeta: una sola línea flotante, también en inglés, sin el «2», sin título ni «Abriste N de 6», y la lista oculta (sin 3D se ve), de donde salen los enunciados de la voz (nmw40cp3jtit)', () => {
      // La frase nueva (nmw46tffetit), con los siete desde el dictado (nmw4f73aftit)
      // Sin el «7»: cada problema abre más de una situación, agrupadas en siete (nmw6p0g7htit)
      expect(estacionDos).toContain('<h2 class="linea-dos" data-titulo-dos>Problemas de desarrollar por chat que STL resuelve muy bien</h2>');
      expect(estacionDos.match(/class="tarjeta/g)).toHaveLength(1);
      expect(estacionDos).not.toContain('class="eyebrow"');
      expect(estacionDos).not.toContain('data-cuenta');
      expect(estacionDos).not.toContain('Abriste');
      expect(html).not.toContain('Esta dispersión de la atención');
      // Ya no flota: la misma tarjeta que la estación 1, sin un estilo propio (nmw5o26vdtit)
      expect(estacionDos).toContain('<div class="tarjeta corta">');
      expect(html).not.toMatch(/.js-3d .panel/);
      expect(html).not.toContain('background: none; border: 0; box-shadow: none;');
      // La lista queda en la página, dentro de su contenedor, y con 3D se oculta
      expect(estacionDos).toMatch(/<div class="lista-problemas">\s*<details class="problema"/);
      expect(html).toContain('.js-3d .lista-problemas { display: none; }');
      // La línea sale del diccionario por idioma: en español, la pedida; en inglés, su equivalente natural
      const dic = js.match(/const TEXTOS = \{([\s\S]*?)\n\};/)?.[1] ?? '';
      expect(dic.match(/es: \{[^}]*pasado: '([^']+)'/)?.[1]).toBe('Problemas de desarrollar por chat que STL resuelve muy bien');
      expect(dic.match(/en: \{[^}]*pasado: '([^']+)'/)?.[1]).toBe('Problems of developing through chat that STL solves really well');
      expect(js).toContain('if (tituloDos) tituloDos.textContent = T.pasado;');
    });

      it('trae los cinco grandes problemas, en su orden, cada uno con su respuesta de STL, con los guiones del titular del 4 de noviembre (nmw24lltqtit a nmw27jyxjtit)', () => {
      expect(estacionDos).not.toContain('<h3>');   // cada problema es ya su propio grupo
      expect(problemasEnLaPagina).toHaveLength(7);
      expect(problemasEnLaPagina.map((m) => Number(m[1]))).toEqual([0, 1, 2, 3, 4, 5, 6]);
      // «Tienes que estar encima» salió (nmw26lr5jtit): el tercero junta las terceras situaciones de los dos primeros
      // El nombre corto de cada uno, el de su globo, en dos palabras (nmw40cp3jtit); el del dictado, «Cansancio de escribir»,
      // con su «de» (nmw4f8wietit), sin «pereza», que Kai pronunciaba mal (nmw56lwtbtit)
      expect(problemasEnLaPagina.map((m) => m[2])).toEqual(['Atención dispersa', 'Mensajes incompletos', 'Hilo perdido', 'Respuestas largas', 'Modelo olvidadizo', 'Sin internet', 'Cansancio de escribir']);
      for (const [, , corto] of problemasEnLaPagina) expect(corto.split(' ').filter((p) => p !== 'de')).toHaveLength(2);
      expect(html).not.toContain('Tienes que estar encima');
      for (const [, , , problema, respuesta] of problemasEnLaPagina) {
        expect(problema.startsWith('¿')).toBe(true);
        expect(problema.endsWith('?')).toBe(true);
        expect(respuesta.length).toBeGreaterThan(40);
      }
      // Cada uno nombra las situaciones que junta, con el enunciado y la respuesta corta de su guion
      const [atencion, dices, retomas, leer, olvida, sinInternet, dictado] = problemasEnLaPagina.map((m) => m[3] + ' ' + m[4]);
      for (const palabra of ['cansa', 'dictas', 'con un amigo', 'divagar', 'transcriben en tu computador', 'Buzón', 'corriges']) expect(dictado).toContain(palabra);
      expect(dictado).not.toContain('pereza');
      for (const palabra of ['sin internet', 'Buzón', 'sin conexión', 'auditando', 'todo junto']) expect(sinInternet.toLowerCase()).toContain(palabra.toLowerCase());
      for (const palabra of ['4 o más sesiones', 'idea', 'Buzón', 'qué sigue']) expect(atencion).toContain(palabra);
      for (const palabra of ['te faltó algo', 'Buzón', 'en firme', 'cambio de decisión']) expect(dices).toContain(palabra);
      // «Hilo perdido» y «Modelo olvidadizo», con los enunciados y respuestas aprobados (pd_fusion_olvidadizo, nmw5cks5utit)
      for (const palabra of ['pausa', 'en qué ibas ni qué sigue', 'explicas otra vez todo', '«¿Dónde quedamos?»', 'una sola misión', 'sin repetirle nada']) expect(retomas).toContain(palabra);
      for (const palabra of ['largas', 'leíste', 'releer', 'Entendido', 'sellado', 'documento corto']) expect(leer).toContain(palabra);
      for (const palabra of ['tokens', 'se contamina', 'qué recuerda el modelo', 'solo lo que cambió', 'sale del contexto', 'cada paso entre el director y el modelo']) expect(olvida).toContain(palabra);
      for (const [, , corto] of problemasEnLaPagina) expect(corto.length).toBeLessThanOrEqual(40);
    });

    it('marca con ✓ cada problema abierto, también sin WebGL, sin la cuenta «Abriste N de 6» (nmw40cp3jtit)', () => {
      expect(js).not.toContain('data-cuenta');
      expect(js).toContain("problemas[i].classList.add('visto');");
      expect(html).toContain("content: '✓'");
      // Se conecta antes de mirar si hay 3D: sin WebGL, cada problema se abre con su respuesta en el mismo lugar
      expect(js.indexOf("problemas.forEach((d, i) => d.addEventListener('toggle'")).toBeLessThan(js.indexOf('if (lienzo && estaciones.length && hayWebGL())'));
      expect(html).toMatch(/\.js-3d \.problema p \{ display: none; \}/);   // con 3D, la respuesta va en el reproductor; sin 3D, queda a la vista
    });

    it('en el 3D, los seis flotan como íconos 3D (no esferas), cada uno con su figura; un clic abre su reproductor con la animación en 2D', () => {
      expect(js).toContain('orbes.push({');
      expect(js).toContain('ESFERAS.forEach((pos, i) => {');
      expect(js).toContain('rayo.intersectObjects(tocables');
      expect(js).toContain("lienzo.addEventListener('click'");
      // Seis íconos, uno por problema: ventanas, un globo partido, un hilo enredado, una pila de páginas, una caja negra y un wifi cortado
      const iconos = js.match(/const ICONOS = \[([\s\S]*?)\n {4}\];/)?.[1] ?? '';
      expect(iconos.match(/\n {6}\/\/ \d · /g)).toHaveLength(7);
      expect(iconos).toContain('CapsuleGeometry');   // el micrófono del dictado (pd_dictado)
      expect(iconos).toContain('cajita(');   // las ventanas, las páginas y la caja negra (cajas redondeadas)
      expect(js).toContain('new RoundedBoxGeometry(w, h, d, 3, r)');
      expect(iconos).toContain('forma([[-0.58, 0.2]');   // el globo de mensaje, partido en dos
      expect(iconos).toContain('THREE.TubeGeometry');   // el hilo enredado
      expect(iconos).toContain("textura('?'");   // la caja negra con su «?»
      expect(iconos).toContain('Math.PI * 0.25, Math.PI * 0.75');   // los arcos del wifi, con su corte
      expect(js).toContain('const orbe = ICONOS[i](mat, apoyo);');
      expect(js).not.toContain('new THREE.SphereGeometry(0.5, 18, 14)');   // ya no son esferas rojas
      // Se toca su área invisible, y la cámara de la lista de antes no se acerca: se vuelve a la pantalla
      expect(js).not.toMatch(/zoomK|zoomObj/);
      expect(js).toContain('function pintarClip(ctx, i, t)');
      expect(js).toContain('const SEGMENTOS = [');
      expect(js).toContain('const GRANDES = [');
      expect(html).toContain('<canvas id="popup-clip" width="1280" height="800"');
      // Animación hecha en la página: nada de imágenes ni de video
      expect(html).not.toMatch(/\.(jpe?g|png|mp4|webm)\b/i);
    });

    it('el reproductor crece a la izquierda del anillo hasta donde deja la pantalla, con sus mandos fijos adentro, debajo de la animación, sin título ni botón para cerrarlo (nmw40cp3jtit)', () => {
      const recuadro = html.match(/<aside class="popup"[\s\S]*?<\/aside>/)?.[0] ?? '';
      expect(recuadro.indexOf('<canvas id="popup-clip"')).toBeLessThan(recuadro.indexOf('<div class="popup-barra">'));
      expect(recuadro).not.toContain('data-cerrar-popup');
      expect(recuadro).not.toContain('popup-problema');
      expect(html).not.toContain('.popup canvas { display: none; }');
      expect(html).toMatch(/\.popup \{[^}]*flex-direction: column;/);
      // Ya no hay pantalla 3D en la escena: ni su textura ni sus chispas
      expect(js).not.toContain('function crearPantalla(');
      expect(js).not.toContain('const chispas');
      expect(js).toContain('popup.style.width = `${Math.round(w)}px`;');
      // Dónde va, entre 1350 y 1920 de ancho: a la izquierda del anillo, que queda junto al menú, y nada se pisa
      const g = new Function(`${js.match(/const ASPECTO_CLIP = [^\n]+\n/)?.[0]}${js.match(/function disponerReproductor\(v\) \{[\s\S]*?\n\}/)?.[0]}; return disponerReproductor;`)() as (v: Record<string, number>) => { x: number; y: number; w: number; h: number; anilloX: number; anilloY: number };
      for (const [ancho, alto] of [[1350, 760], [1360, 768], [1440, 900], [1920, 1080]]) {
        const v = { ancho, alto, menuIzq: ancho - 250, lineaArriba: alto - 80, anilloMedio: alto * 0.22, anilloAlto: alto * 0.16, mandos: 64 };
        const d = g(v);
        expect(d.x, `${ancho}`).toBeGreaterThanOrEqual(16);
        expect(d.y, `${ancho}`).toBeGreaterThanOrEqual(16);
        expect(d.y + d.h, `${ancho}`).toBeLessThanOrEqual(v.lineaArriba - 16 + 0.01);
        expect(d.x + d.w + 24, `${ancho}`).toBeLessThanOrEqual(d.anilloX - v.anilloMedio + 0.01);   // no tapa los íconos
        expect(d.anilloX + v.anilloMedio + 24, `${ancho}`).toBeLessThanOrEqual(v.menuIzq + 0.01);   // ni el anillo al menú
        expect((d.h - 64) * 16 / 10).toBeCloseTo(d.w, 3);   // la animación, en su 16 × 10
        expect(d.w / ancho, `${ancho}`).toBeGreaterThan(0.38);   // y grande
      }
    });

    it('el globo de cada ícono sale al pasar el ratón o al hacer clic, con su nombre en dos palabras, y nunca pisa otro ícono, el reproductor, el menú ni la línea (nmw40cp3jtit)', () => {
      expect(html).toContain('<div class="globo-problema" id="globo-problema" role="tooltip" hidden></div>');
      expect(js).toContain('const i = sobre >= 0 ? sobre : seleccionado;');
      const g = new Function(`${js.match(/const cruce = [^\n]+\n/)?.[0]}${js.match(/function lugarDelGlobo\([^)]*\) \{[\s\S]*?\n\}/)?.[0]}; return { lugarDelGlobo, cruce };`)() as {
        lugarDelGlobo: (i: { x: number; y: number; r: number }, w: number, h: number, c: { x: number; y: number }, o: { x: number; y: number; w: number; h: number }[], l: { ancho: number; alto: number }) => { x: number; y: number; w: number; h: number };
        cruce: (a: object, b: object) => number;
      };
      const lim = { ancho: 1360, alto: 768 };
      // Hacia afuera del anillo cuando ahí no hay nada
      const libre = g.lugarDelGlobo({ x: 1000, y: 300, r: 30 }, 160, 34, { x: 800, y: 350 }, [], lim);
      expect(libre.x).toBeGreaterThan(1000);
      // Con el menú a la derecha, va al otro lado, sin pisarlo ni pisar el ícono
      const menu = { x: 1100, y: 200, w: 250, h: 300 }, icono = { x: 980, y: 280, w: 60, h: 60 };
      const lado = g.lugarDelGlobo({ x: 1010, y: 310, r: 30 }, 160, 34, { x: 800, y: 350 }, [menu, icono], lim);
      expect(g.cruce(lado, menu)).toBe(0);
      // Con el reproductor a la izquierda y el menú a la derecha, arriba o abajo
      const reproductor = { x: 20, y: 30, w: 600, h: 650 };
      const angosto = g.lugarDelGlobo({ x: 700, y: 400, r: 30 }, 160, 34, { x: 900, y: 400 }, [reproductor, { x: 740, y: 200, w: 600, h: 400 }], lim);
      expect(g.cruce(angosto, reproductor)).toBe(0);
      expect(angosto.x).toBeGreaterThanOrEqual(8);
    });

    it('los íconos giran despacio alrededor de la línea, como un anillo, a por lo menos el 60 % de su tamaño de antes, separados; el abierto se agranda y toma su color (nmw40cp3jtit, nmw40fizktit, nmw46qjootit)', () => {
      expect(js).toContain("o.grande += ((seleccionado === i ? 1.25 : sobre === i ? 1.12 : 1) - o.grande) * (quieto ? 1 : 0.12);");
      expect(js).toContain('o.mat.color.lerp(tono, quieto ? 1 : 0.15)');
      const escala = Number(js.match(/const ESCALA_ICONO = ([\d.]+);/)?.[1]);
      expect(escala).toBeGreaterThanOrEqual(1.45 * 0.6);
      expect(escala).toBeLessThan(1.45);
      // Siete lugares (con el dictado) a la misma distancia en una elipse alrededor de la línea, que gira despacio (más de 40 s por vuelta)
      expect(js).toContain('const ESFERAS = Array.from({ length: 7 }, (_, i) => ({ a: Math.PI / 2 + (i * 2 * Math.PI) / 7 }));');
      const [, rx, ry, , abierto, giro] = js.match(/const RADIO_X = ([\d.]+), RADIO_Y = ([\d.]+), INCLINA = ([\d.]+), ANILLO_ABIERTO = ([\d.]+), GIRO_ANILLO = ([\d.]+);/)?.map(Number) ?? [];
      expect((2 * Math.PI) / giro).toBeGreaterThan(40);
      // Separados: entre dos vecinos, más que el ícono agrandado (los íconos miden unos 1,6 por su escala), también con el
      // anillo achicado, donde los íconos se achican un poco
      const chico = Number(js.match(/lerp\(1, ([\d.]+), abierto\)\);/)?.[1]);
      const lugar = (a: number, s: number) => [Math.cos(a) * rx * s, Math.sin(a) * ry * s];
      for (const [s, icono] of [[1, 1], [abierto, chico]]) for (let i = 0; i < 7; i++) {
        const [x1, y1] = lugar(Math.PI / 2 + (i * 2 * Math.PI) / 7, s), [x2, y2] = lugar(Math.PI / 2 + ((i + 1) * 2 * Math.PI) / 7, s);
        expect(Math.hypot(x2 - x1, y2 - y1)).toBeGreaterThan(1.6 * escala * 1.25 * icono);
      }
      expect(js).toContain('lugarEnAnillo(o.a + s * GIRO_ANILLO, anillo.escala, o.casa);');
      expect(js).toContain('focos.push(anillo.centro.clone());');
    });

    it('hay trece segmentos (doce de antes y la caja negra, nueva) y cada gran problema compone los suyos, como dicen los guiones del titular: primero cada situación como pasa en el chat, después cómo la resuelve STL (nmw24lltqtit a nmw27jyxjtit, t_decide_clip_antes)', () => {
      expect(js).not.toContain('GRUPO_DE');
      const segmentos = js.match(/const SEGMENTOS = \[[\s\S]*?\n\];/)?.[0] ?? '';
      // El 10 salió: se juntó con el 9 en «Hilo perdido», y su lugar queda vacío para que los demás conserven sus claves de voz (pd_fusion_olvidadizo)
      expect(segmentos.match(/\n {4}problema: \(c, q\) =>/g)).toHaveLength(14);
      expect(segmentos.match(/\n {4}solucion: \(c, q(, tinta)?\) =>/g)).toHaveLength(14);
      const numeros = [...segmentos.matchAll(/\n {2}\{ \/\/ (\d+)\. /g)].map((m) => Number(m[1]));
      expect(numeros).toEqual([...Array(15).keys()].map((k) => k + 1).filter((n) => n !== 10));
      expect(segmentos).toContain('\n  null,   // 10. (Salió');
      // Lo que salió: el «¿sigo?», el «listo» que no lo estaba, la decisión enterrada y la memoria aparte (nmw26lr5jtit)
      for (const fuera of ['«¿Sigo?»', '¡Listo! Ya funciona', 'el chat, tres horas después', 'otro sistema que mantener']) expect(segmentos).not.toContain(fuera);
      // El contexto que se contamina, con la nota vieja y su «Reemplazado»; y la caja negra, con el ciclo de inferencia
      const contexto = segmentos.slice(segmentos.indexOf('{ // 12. '), segmentos.indexOf('{ // 13. '));
      expect(contexto).toContain("'Reemplazado'");
      expect(contexto).toContain('solo lo que aprobaste');
      const caja = segmentos.slice(segmentos.indexOf('{ // 13. '), segmentos.indexOf('{ // 14. '));
      // La caja negra, como un chat entre el director y el modelo, con su reloj, sus tokens de entrada y de salida y el historial (nmw5cyd6otit)
      for (const parte of ['caja negra', 'el director', 'el modelo', 'El director solicita', 'El modelo responde', 'El director espera al modelo', 'relojito(', 'tokens de entrada', 'tokens de salida', 'el historial']) expect(caja).toContain(parte);
      // Los cinco clips juntan los segmentos de su problema, cada segmento una sola vez, en el orden pedido: 2, 2, 2, 3 y 4 situaciones
      const grandes = JSON.parse(js.match(/const GRANDES = (\[\[[\d,\] [\]]+\]);/)?.[1] ?? '[]') as number[][];
      expect(grandes).toEqual([[1, 2], [0, 6], [8, 10], [3, 4, 5], [7, 11, 12], [13], [14]]);
      expect(grandes.flat().sort((a, b) => a - b)).toEqual([...Array(15).keys()].filter((j) => j !== 9));
      // Ninguno pasa de tres situaciones (pd_fusion_olvidadizo, nmw5chos7tit)
      for (const g of grandes) expect(g.length).toBeLessThanOrEqual(3);
      expect(grandes).toHaveLength(problemasEnLaPagina.length);
      // Un 35 % más rápidas que en la vuelta anterior (6,5 s cada situación en rojo y 15 cada solución; nmw1kwbsftit), y otro 10 % (nmw1oblmstit)
      expect(js).toContain('const RAPIDEZ = 1.35 * 1.1;');
      expect(js).toContain('const PROBLEMA_SEG = 6.5 / RAPIDEZ;');
      expect(js).toContain('const SOLUCION_SEG = 15 / RAPIDEZ;');
      expect(js).not.toContain('DURA_CLIP');   // la duración sale de las partes
      expect(js).toContain('if (enProblema) segmento.problema(ctx, q);\n  else segmento.solucion(ctx, q, TINTAS[(i + k) % TINTAS.length]);');
      expect(js).toContain("enProblema ? 'Sin STL' : 'Con STL'");
      expect(js).toContain('`${k + 1} de ${n}`');   // cuál de las situaciones se ve
    });

    it('los cinco se dibujan de principio a fin sin errores (con un lienzo de mentira, cuadro a cuadro), con el «Sin STL», el «Con STL», el «1 de 3» y el «Reemplazado»', () => {
      const colores = js.match(/const ORO = [^\n]+\nconst VERDE = [^\n]+\n/)?.[0] ?? '';
      const dibujo = js.slice(js.indexOf('// ── Las mini animaciones de los problemas'), js.indexOf('function iniciar() {'));
      expect(colores).not.toBe('');
      expect(dibujo).toContain('function pintarClip(ctx, i, t)');
      const nada = () => undefined;
      let textos: string[] = [];
      const ctx = new Proxy({} as Record<string, unknown>, {
        get: (o, k) => k in o ? o[k as string] : k === 'fillText' ? (texto: string) => { textos.push(texto); } : k === 'measureText' ? () => ({ width: 60 }) : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop: nada }) : nada,
        set: (o, k, v) => { o[k as string] = v; return true; },
      });
      const pintar = new Function('ctx', `${colores}${dibujo}; return { pintarClip, duraClip, n: GRANDES.length, segmentos: SEGMENTOS.length };`)(ctx) as { pintarClip: (c: unknown, i: number, t: number) => void; duraClip: (i: number) => number; n: number; segmentos: number };
      // Por lo menos lo de antes por situación (7 s el enunciado, 6,5 cada situación y 15 cada solución, a su rapidez)
      expect(pintar.duraClip(0)).toBeGreaterThanOrEqual((7 + 2 * (6.5 + 15)) / (1.35 * 1.1) - 1e-9);
      expect(pintar.n).toBe(7);
      expect(pintar.segmentos).toBe(15);
      const vistos = [];
      for (let i = 0; i < 7; i++) {
        textos = [];
        for (let t = 0; t <= pintar.duraClip(i) + 0.5; t += 0.25) expect(() => pintar.pintarClip(ctx, i, t)).not.toThrow();
        vistos.push(textos);
      }
      for (const t of vistos) { expect(t).toContain('Sin STL'); expect(t).toContain('Con STL'); expect(t.some((x) => /^1 de \d$/.test(x))).toBe(true); }
      expect(vistos[0]).toContain('2 de 2');
      expect(vistos[0]).not.toContain('3 de 3');
      expect(vistos[4]).toContain('Reemplazado');
      expect(vistos[4]).toContain('solo envías decisiones aprobadas por ti');
      expect(vistos[2]).toContain('solo retomas, y ya sabes qué sigue');
      expect(vistos[3]).toContain('3 de 3');
      // Cada clip termina en el último paso de su última solución, y no se pasa de ahí
      expect(vistos[4]).toContain('3 de 3');
      expect(vistos[4]).not.toContain('4 de 4');
      expect(vistos[4]).toContain('y quedas con este historial, para auditarlo y aprender');
    });

    it('el sexto problema, «¿Te quedaste sin internet…?», está en la lista con su resumen, se dibuja de principio a fin y su enunciado ya habla con Kai; sus pasos todavía no tienen voz: con su «Confirmo» (nmw2slvaatit), esperan la cuota de Google, y ni se precargan ni se reproducen', async () => {
      const { SIN_VOZ_TODAVIA } = await import('./vozRecorrido.ts');
      const sexto = problemasEnLaPagina[5];
      expect(sexto[1]).toBe('5');
      expect(sexto[3]).toBe('¿Te quedaste sin internet y tu trabajo con la IA se detuvo?');
      expect(sexto[4]).toBe('Con STL Studio sigues trabajando sin conexión: el Buzón recoge tus notas, ajustes y entregas, y sigues leyendo tus documentos y respuestas y auditando el trabajo del modelo. Nada se pierde, y al volver la conexión el director lo recibe todo junto.');
      const colores = js.match(/const ORO = [^\n]+\nconst VERDE = [^\n]+\n/)?.[0] ?? '';
      const dibujo = js.slice(js.indexOf('// ── Las mini animaciones de los problemas'), js.indexOf('function iniciar() {'));
      const nada = () => undefined;
      let textos: string[] = [];
      const ctx = new Proxy({} as Record<string, unknown>, {
        get: (o, k) => k in o ? o[k as string] : k === 'fillText' ? (texto: string) => { textos.push(texto); } : k === 'measureText' ? () => ({ width: 60 }) : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop: nada }) : nada,
        set: (o, k, v) => { o[k as string] = v; return true; },
      });
      const f = new Function('ctx', `${colores}${dibujo}; return { pintarClip, duraClip, pasoDeClip, clavesDeClip, clavesDelGuion, tramoDeVoz, enunciadoSeg, ENUNCIADOS, GRANDES, PISTA_VOZ_ES, PASOS_SEG, problemaSeg, solucionSeg, tardaVoz };`)(ctx) as {
        pintarClip: (c: unknown, i: number, t: number) => void; duraClip: (i: number) => number; pasoDeClip: (i: number, t: number) => { clave: string; texto: string };
        clavesDeClip: (i: number) => string[]; clavesDelGuion: (i: number) => string[]; tramoDeVoz: (i: number, t: number) => unknown; enunciadoSeg: (i: number) => number;
        ENUNCIADOS: string[]; GRANDES: number[][]; PISTA_VOZ_ES: Record<string, number>; PASOS_SEG: { problema: [number, string][]; solucion: [number, string][] }[];
        problemaSeg: (j: number) => number; solucionSeg: (j: number) => number; tardaVoz: (t: string) => number;
      };
      f.ENUNCIADOS[5] = sexto[3];
      expect(f.GRANDES[5]).toEqual([13]);
      // Los rótulos, exactos
      expect(f.PASOS_SEG[13].problema.map(([, t]) => t)).toEqual(['Se cae el internet a mitad de tu trabajo,', 'y el chat con el modelo se detiene: ¿y ahora qué?']);
      expect(f.PASOS_SEG[13].solucion.map(([d, t]) => [d, t])).toEqual([[0, 'Con STL Studio, sigues trabajando sin conexión:'], [0.2, 'el Buzón recoge tus notas, ajustes y entregas,'], [0.4, 'y sigues leyendo documentos y respuestas'], [0.58, 'o auditando el trabajo del modelo.'], [0.74, 'Nada se pierde: todo queda en la memoria del proyecto.'], [0.88, 'Al volver la conexión, el director lo recibe todo junto.']]);
      // Se dibuja de principio a fin, con su «Sin STL», su «Con STL» y su último rótulo
      textos = [];
      for (let t = 0; t <= f.duraClip(5) + 0.5; t += 0.25) expect(() => f.pintarClip(ctx, 5, t)).not.toThrow();
      expect(textos).toContain('Sin STL');
      expect(textos).toContain('Con STL');
      expect(textos).toContain('Al volver la conexión, el director lo recibe todo junto.');
      expect(textos).toContain('sin conexión');
      // Desde el 5 de noviembre por la tarde, sus pasos también hablan con Kai: cada clip con su pista, y se precargan todos
      expect(f.clavesDelGuion(5)).toEqual(['g6-e', 's14-p1', 's14-p2', 's14-1', 's14-2', 's14-3', 's14-4', 's14-5', 's14-6', 's14-c']);
      for (const c of f.clavesDelGuion(5)) expect(f.PISTA_VOZ_ES[c], c).toBeGreaterThan(500);
      expect(f.clavesDeClip(5)).toEqual(f.clavesDelGuion(5));
      expect(SIN_VOZ_TODAVIA).toEqual([]);
      // El mecanismo para un problema nuevo que espera su voz sigue, vacío
      expect(js).toContain('const SIN_VOZ_TODAVIA = new Set([]);');
      expect(js).toContain('const ENUNCIADOS_SIN_VOZ_TODAVIA = new Set([]);');
      expect(js).toContain('if (!conVoz || quieto || sinVozTodavia(clave)) return;');
      const decir = js.match(/function decir\(clave, desde = 0\) \{[\s\S]*?\n {2}\}/)?.[0] ?? '';
      expect(decir.indexOf('sinVozTodavia(clave)')).toBeGreaterThan(-1);
      expect(decir.indexOf('sinVozTodavia(clave)')).toBeLessThan(decir.indexOf('audioDe(clave)'));
      // El generador los salta
      const generador = readFileSync(join(raiz, 'tools', 'vozRecorrido.ts'), 'utf8');
      expect(generador).toContain('.filter(({ clave }) => !SIN_VOZ_TODAVIA.includes(clave))');
    });

    it('problema y solución se intercalan, segmento por segmento: la situación 1 y su solución, luego la 2 y la suya (nmw1ktmeatit)', () => {
      const colores = js.match(/const ORO = [^\n]+\nconst VERDE = [^\n]+\n/)?.[0] ?? '';
      const dibujo = js.slice(js.indexOf('// ── Las mini animaciones de los problemas'), js.indexOf('function iniciar() {'));
      type Paso = { k: number; j: number; enEnunciado: boolean; enProblema: boolean; enCierre: boolean; clave: string; texto: string };
      const f = new Function(`${colores}${dibujo}; return { pasoDeClip, duraClip, clavesDelGuion, GRANDES, PROBLEMA_SEG, SOLUCION_SEG, problemaSeg, solucionSeg, enunciadoSeg, cierreSeg, CIERRE_SEG };`)() as { cierreSeg: (j: number) => number; CIERRE_SEG: number; pasoDeClip: (i: number, t: number) => Paso; duraClip: (i: number) => number; clavesDelGuion: (i: number) => string[]; GRANDES: number[][]; PROBLEMA_SEG: number; SOLUCION_SEG: number; problemaSeg: (j: number) => number; solucionSeg: (j: number) => number; enunciadoSeg: (i: number) => number };
      expect(f.PROBLEMA_SEG).toBeCloseTo(6.5 / (1.35 * 1.1), 9);
      expect(f.SOLUCION_SEG).toBeCloseTo(15 / (1.35 * 1.1), 9);
      for (let i = 0; i < f.GRANDES.length; i++) {
        // Lo que se ve, en orden: «p» (problema) o «s» (solución) de cada segmento, sin repetir los seguidos
        const visto: string[] = [];
        const claves: string[] = [];
        for (let t = 0; t <= f.duraClip(i); t += 0.05) {
          const p = f.pasoDeClip(i, t), marca = p.enEnunciado ? 'e' : `${p.enCierre ? 'c' : p.enProblema ? 'p' : 's'}${p.j}`;
          if (visto.at(-1) !== marca) visto.push(marca);
          if (claves.at(-1) !== p.clave) claves.push(p.clave);
        }
        // Cada solución termina con su cierre, antes del problema siguiente (nmw3ruscptit)
        expect(visto).toEqual(['e', ...f.GRANDES[i].flatMap((j) => [`p${j}`, `s${j}`, `c${j}`])]);
        // Los rótulos van en el mismo orden en que se piden sus voces (clavesDeClip, sin las que aún no tienen voz)
        expect(claves).toEqual(f.clavesDelGuion(i));
        // Al terminar la primera solución viene su cierre, de unos dos segundos, y el segundo problema justo después
        const j0 = f.GRANDES[i][0], finSolucion = f.enunciadoSeg(i) + f.problemaSeg(j0) + f.solucionSeg(j0);
        expect(f.pasoDeClip(i, finSolucion + 0.01)).toMatchObject({ k: 0, enCierre: true, clave: `s${j0 + 1}-c` });
        expect(f.cierreSeg(j0)).toBeGreaterThanOrEqual(f.CIERRE_SEG);
        if (f.GRANDES[i].length > 1) expect(f.pasoDeClip(i, finSolucion + f.cierreSeg(j0) + 0.01)).toMatchObject({ k: 1, enProblema: true, enCierre: false });
      }
      expect(js).not.toContain('const finProblema = n * PROBLEMA_SEG');
    });

    it('la voz va al mismo ritmo que la animación, un 35 % más rápida y sin cambiar su tono (nmw1kwbsftit)', () => {
      // Kokoro, a RAPIDEZ; la de Google, a su ritmo natural (ritmoDeClave), las dos a la velocidad elegida
      expect(js).toContain('const r = a.ritmo ?? RAPIDEZ;');
      expect(js).toContain('a.defaultPlaybackRate = r; a.playbackRate = r * velClip;');
      expect(js).toContain('const ritmoDeClave = (clave) => (pistaVoz(clave) == null ? RAPIDEZ : RITMO_VOZ_ES[clave] ?? 1);');
      expect(js).toContain('a.ritmo = ritmoDeClave(clave);');
      expect(js).toContain('a.preservesPitch = true;');
      // Cada vez que suena, a su ritmo
      const decir = js.match(/function decir\(clave, desde = 0\) \{[\s\S]*?\n {2}\}/)?.[0] ?? '';
      expect(decir.indexOf('aSuRitmo(a);')).toBeGreaterThan(-1);
      expect(decir.indexOf('aSuRitmo(a);')).toBeLessThan(decir.indexOf('a.play()'));
    });

    it('un control de velocidad, 1x · 1.25x · 1.5x · 2x, acelera la voz y el reloj del clip la sigue; cada vez que se abre empieza a 1,25x (nmw2n33o6tit, nmw5gelsmtit)', () => {
      const barra = html.match(/<div class="popup-barra">[\s\S]*?\n {2}<\/div>/)?.[0] ?? '';
      const grupo = barra.match(/<div class="velocidad" data-velocidad-clip role="group"[^>]*>.*?<\/div>/)?.[0] ?? '';
      expect([...grupo.matchAll(/data-v="([\d.]+)"[^>]*>([^<]+)</g)].map((m) => [m[1], m[2]])).toEqual([['1', '1x'], ['1.25', '1.25x'], ['1.5', '1.5x'], ['2', '2x']]);
      // Al abrir, 1,25x es el oprimido, y la voz suena a 1,25 veces su ritmo
      expect([...grupo.matchAll(/data-v="([\d.]+)" aria-pressed="true"/g)].map((m) => m[1])).toEqual(['1.25']);
      expect(js).toContain('const VELOCIDADES_CLIP = [1, 1.25, 1.5, 2], VELOCIDAD_INICIAL = 1.25;');
      expect(js).toContain('let velClip = VELOCIDAD_INICIAL;');
      expect(js).toContain('a.defaultPlaybackRate = r; a.playbackRate = r * velClip;');
      // No se guarda de una visita a otra: nada la lee ni la escribe en el navegador
      expect(js).not.toMatch(/localStorage\.\w+Item\([^)]*VELOCIDAD/);
      expect(js).not.toContain('stl-recorrido-velocidad');
      // La voz que habla cambia ya de velocidad, y el reloj del clip avanza a esa velocidad
      expect(js).toContain('if (voz.audio) aSuRitmo(voz.audio);');
      expect(js).toContain('luego = pasoDeClip(seleccionado, clipT + dt * velClip);');
    });

    it('en vez de «↻ Repetir», una perilla chica como la de la animación del principio: la rueda la adelanta o la devuelve y el botón del centro la pausa o la sigue (nmw1kwbsftit)', () => {
      // Con la pantalla 3D (5 de noviembre), la barra de mandos suma «↻ Repetir» junto a «🔊 Voz» y a la perilla
      const recuadro = html.match(/<aside class="popup"[\s\S]*?<\/aside>/)?.[0] ?? '';
      expect(recuadro).toContain('data-perilla-clip');
      expect(recuadro).toContain('data-repetir-clip');
      expect(recuadro).toContain('↻ Repetir</button>');
      expect(js).toContain("popup?.querySelector('[data-repetir-clip]')?.addEventListener('click', () => { if (seleccionado >= 0) empezarClip(true); });");
      const barra = html.match(/<div class="popup-barra">[\s\S]*?\n {2}<\/div>/)?.[0] ?? '';
      expect(barra).toContain('data-voz-clip');
      expect(barra).toContain('<div class="mini-perilla" data-perilla-clip role="slider" tabindex="0"');
      expect(barra).toContain('<g data-giro-clip>');
      expect(barra).toContain('<button type="button" class="mini-pausa" data-pausa-clip aria-label="Pausar la animación">');
      // Ids propios: no chocan con los de otra perilla
      expect(barra).toContain('id="mp-cuerpo"');
      expect(html).toMatch(/\.mini-perilla \{[^}]*cursor: grab;/);
      // La rueda, sobre el reproductor (la animación, sus mandos o la perilla): adelanta o devuelve, sin cerrarlo (nmw40cp3jtit)
      expect(js).toContain("popup?.addEventListener('wheel', ruedaClip, { passive: false });");
      const rueda = js.match(/const ruedaClip = \(e\) => \{[\s\S]*?\n {2}\};/)?.[0] ?? '';
      expect(rueda.indexOf('e.stopPropagation();')).toBe(rueda.indexOf('{') + 6);
      expect(rueda).toContain('moverClip(');
      // Girarla con el ratón, como la grande, y las flechas de a un segundo
      expect(js).toContain("perillaClip?.addEventListener('pointerdown', (e) => {");
      expect(js).toContain('moverClip((d / (2 * Math.PI)) * VUELTA_CLIP);');
      expect(js).toContain("{ ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5 }[e.key]");
      // El centro pausa o sigue; al final, seguir es verla otra vez
      expect(js).toContain("pausaClip?.addEventListener('click', alternarClip);");
      expect(js).toContain('if (terminado()) empezarClip(true);');
      // En pausa el reloj no avanza ni habla, y la voz que hablaba se detiene y sigue donde iba
      const avanzar = js.match(/function avanzarClip\(\) \{[\s\S]*?\n {2}\}/)?.[0] ?? '';
      expect(avanzar).toContain('if (!pausado) {');
      expect(avanzar.indexOf('if (!pausado) {')).toBeLessThan(avanzar.indexOf('decir('));
      expect(js).toContain('if (si) voz.audio.pause();');
      // Moverla no deja el reloj fuera de la animación
      expect(js).toContain('clipT = Math.max(0, Math.min(duraClip(seleccionado), clipT + seg));');
      expect(js).toContain('clipT = 0; clipAntes = performance.now();');
    });

    it('ninguna estación se anima hasta «Empieza el recorrido», y un clic en una estación del menú vuelve a empezar la suya (nmw1khrketit)', () => {
      expect(js).toContain('const relojes = [null, null, null, null];');
      expect(js).toContain('const tiempoDe = (k) => relojes[k] === null ? 0 : performance.now() / 1000 - relojes[k];');
      // Las dos estaciones corren con su propio reloj
      expect(js).toContain('animar.push(deEstacion(0, (tt) => {');
      expect(js).toContain('animar.push(deEstacion(1, moverAnillo));');
      // «Empieza el recorrido» las echa a andar
      expect(js).toContain("document.querySelector('.entrada .bajar')?.addEventListener('click', (e) => {\n    relojes.forEach((_, k) => empezarEstacion(k));");
      expect(html).toContain('<a class="bajar" href="#e-que-es">');
      // El menú reinicia la de la estación elegida
      const menu = js.match(/enlaces\.forEach\(\(a\) => a\.addEventListener\('click', \(e\) => \{[\s\S]*?\n {2}\}\)\);/)?.[0] ?? '';
      expect(menu).toContain('empezarEstacion(i);');
      // Con ?ver=N, para capturarla, empiezan solas
      expect(js).toContain('if (fijo !== null) relojes.forEach((_, k) => empezarEstacion(k));');
    });

    it('cada animación dura lo que necesita (sin tope de 6 segundos) y pasa una vez con sus pasos rotulados (nmw17vv4htit)', () => {
      expect(js).not.toContain('(t % 6) / 6');
      expect(js).toContain('const dura = duraClip(i), s = Math.min(dura, Math.max(0, t)), p = s / dura;');
      // La duración sale de las partes: cada situación, cada solución y su cierre (nmw3ruscptit), de los segmentos que junta. Más larga que las de antes (12 a 13,5 s)
      expect(js).toContain('const duraClip = (i) => (i === GUIA ? duraComo() : enunciadoSeg(i) + (GRANDES[i] ?? GRANDES[0]).reduce((s, j) => s + segmentoSeg(j), 0));');
      expect(js).toContain('const segmentoSeg = (j) => problemaSeg(j) + solucionSeg(j) + cierreSeg(j);');
      const problemaS = 6.5 / (1.35 * 1.1), solucionS = 15 / (1.35 * 1.1);
      const grandes = JSON.parse(js.match(/const GRANDES = (\[\[[\d,\] [\]]+\]);/)?.[1] ?? '[]') as number[][];
      // El sexto problema es de un solo segmento (los demás juntan 2 o más): le basta pasar de los 13,5 s de antes
      for (const g of grandes) expect(g.length * (problemaS + solucionS)).toBeGreaterThan(g.length > 1 ? 13.5 * 1.5 : 13.5);
      // Los pasos del problema y de la solución de cada segmento, frase por frase, en orden y sin pasarse del final
      const pasos = js.match(/const PASOS_SEG = \[[\s\S]*?\n\];/)?.[0] ?? '';
      const filas = [...pasos.matchAll(/\{ problema: \[(.+)\], solucion: \[(.+)\] \},?\n/g)];
      expect(filas).toHaveLength(14);   // el 10 salió, y su lugar queda vacío
      for (const fila of filas) for (const lista of [fila[1], fila[2]]) {
        // Cada frase cabe en el recuadro: la letra baja si es larga (tamanoQueCabe), sin pasar de unas 66 letras
        const desde = [...lista.matchAll(/\[([\d.]+), '([^']+)'\]/g)].map((m) => { expect(m[2].length, m[2]).toBeLessThanOrEqual(66); return Number(m[1]); });
        expect(desde.length).toBeGreaterThan(0);
        expect(desde[0]).toBe(0);
        expect([...desde].sort((a, b) => a - b)).toEqual(desde);
        expect(desde.at(-1)).toBeLessThan(1);
      }
      expect(js).toContain("if (paso) letrero(ctx, paso, 160, 190, enProblema ? '#ffc2cf' : '#fffaf0', tamanoQueCabe(ctx, paso, 11, 300));");
    });

    it('cada parte dura lo que su voz tarda en decirla, con sus pausas, y nunca menos que el ritmo aprobado (nmw24lltqtit, nmw27l2u2tit)', () => {
      const colores = js.match(/const ORO = [^\n]+\nconst VERDE = [^\n]+\n/)?.[0] ?? '';
      const dibujo = js.slice(js.indexOf('// ── Las mini animaciones de los problemas'), js.indexOf('function iniciar() {'));
      const f = new Function(`${colores}${dibujo}; return { tardaVoz, problemaSeg, solucionSeg, PASOS_SEG, PROBLEMA_SEG, SOLUCION_SEG };`)() as { tardaVoz: (t: string) => number; problemaSeg: (j: number) => number; solucionSeg: (j: number) => number; PASOS_SEG: { problema: [number, string][]; solucion: [number, string][] }[]; PROBLEMA_SEG: number; SOLUCION_SEG: number };
      // Una frase más larga tarda más, y una coma suma su pausa
      expect(f.tardaVoz('Con STL, tu idea va al Buzón')).toBeGreaterThan(f.tardaVoz('Con STL tu idea va al Buzón'));
      f.PASOS_SEG.forEach((p, j) => {
        expect(f.problemaSeg(j)).toBeGreaterThanOrEqual(f.PROBLEMA_SEG);
        expect(f.solucionSeg(j)).toBeGreaterThanOrEqual(f.SOLUCION_SEG);
        expect(f.solucionSeg(j)).toBeGreaterThanOrEqual(p.solucion.reduce((s, [, t]) => s + f.tardaVoz(t), 0) - 1e-9);
      });
    });

    it('la estación 1, como la pidió el titular (nmw1g3dfftit, nmw1kggjmtit): el Studio al menos el doble, el director centrado y un 10 % más grande que en la vuelta anterior, el modelo un 30 % menos, la línea con el modelo solo mientras hablan y todo a su velocidad normal', () => {
      expect(Number(js.match(/const LADO_S = ([\d.]+);/)?.[1])).toBe(9.2);
      expect(Number(js.match(/cuboConCara\(([\d.]+), '#f4f1ea', 0\.12/)?.[1])).toBeCloseTo(1.2 * 1.1, 5);
      expect(Number(js.match(/const modelo = cuboConCara\(([\d.]+), MODELO,/)?.[1])).toBeCloseTo(3 * 0.7, 5);
      // La línea entre el director y el modelo: escondida desde el comienzo, y visible solo mientras hablan
      expect(js).toContain('hiloMalla.visible = false;');
      expect(js).toContain('hiloMalla.visible = hablan;');
      expect(js).not.toContain('hilo.opacity = hablan ? 0.32 : 0.12;');
      // Las órbitas, los pulsos y los vaivenes, otra vez a su velocidad normal: la mitad era para las animaciones de los
      // problemas, no para esta (nmw1kggjmtit)
      expect(js).toContain('const a = tt * 1.1 + k * (Math.PI * 2 / N_ENTREGA);');
      expect(js).toContain('const f = (tt * 0.7 + j / 3) % 1,');
      expect(js).toContain('e.m.rotation.y = c > 0.54 ? 0 : tt * 0.8;');
      expect(js).toContain('Math.abs(Math.sin(tt * 2)) * 0.04');
      expect(js).toContain('Math.sin(tt * 5) ** 2');
      expect(js).toContain('Math.abs(Math.sin(tt * 3)) * 0.12');
      for (const lento of ['tt * 0.55', 'tt * 0.35', 'tt * 0.4;', 'Math.sin(tt))', 'tt * 2.5', 'tt * 1.5))']) expect(js).not.toContain(lento);
      // Lo ordenado, todavía dentro del Studio
      expect(js).toContain('.addScaledVector(ARRIBA, -2.0 - Math.floor(r / 5) * 1.15).addScaledVector(lado, 2.2),');
    });

    it('lo que le entregas flota ALREDEDOR del director, sin taparlo, y solo gira a su alrededor desde que él empieza a procesarlo (nmw1kggjmtit)', () => {
      // En un anillo de frente a la cámara (a lo largo de la línea y hacia arriba), apenas hacia la cámara
      const revuelto = js.match(/revuelto: pDir\.clone\(\)\.addScaledVector\(t, Math\.cos\(anillo\(k\)\) \* \(([\d.]+) \+ \(\(k \* 7\) % 3\) \* ([\d.]+)\)\)\.addScaledVector\(ARRIBA, Math\.sin\(anillo\(k\)\) \* \(([\d.]+) \+ \(\(k \* 5\) % 3\) \* ([\d.]+)\)\)\.addScaledVector\(lado, \(\(k \* 3\) % 3\) \* ([\d.]+)\),/);
      expect(revuelto).not.toBeNull();
      const [r0, dr, a0, da, haciaCamara] = (revuelto ?? []).slice(1).map(Number);
      const lado = Number(js.match(/const LADO_S = ([\d.]+);/)?.[1]);
      const dir = Number(js.match(/cuboConCara\(([\d.]+), '#f4f1ea', 0\.12/)?.[1]);
      // Lejos del director (la mitad de su lado, más su rótulo y el tamaño de la figura) y dentro del Studio
      expect(Math.min(r0, a0)).toBeGreaterThan(dir / 2 + 1.2);
      expect(r0 + 2 * dr).toBeLessThan(lado / 2 - 0.4);
      expect(a0 + 2 * da).toBeLessThan(lado / 2 - 0.4);
      expect(2 * haciaCamara).toBeLessThan(1);
      // Mientras esperan, flotan en su lugar; desde procesa(k), giran
      expect(js).toContain('const flota = (e, k, tt, v) => v.copy(e.revuelto).addScaledVector(ARRIBA,');
      expect(js).toContain('const procesa = (k) => 0.20 + 0.004 * k;');
      expect(js).toContain("[0.02 + 0.01 * k, 0.09 + 0.01 * k, () => salida, (v) => flota(e, k, tt, v), 2.2],");
      // Y procesar empieza antes de que hable con el modelo
      expect(0.20 + 0.004 * 9 + 0.06).toBeLessThan(0.28 + 0.03);
    });

    it('sin el texto del camino entre estaciones («La línea del tiempo: cada idea abre una rama…», nmw1g3dfftit)', () => {
      expect(html).not.toContain('La línea del tiempo: cada idea abre una rama');
      expect(html).toContain('<div class="camino-texto" aria-hidden="true"></div>');
      expect(html).not.toMatch(/<div class="camino-texto"><p>/);
    });

    it('el contenido de cada animación no toca las píldoras de arriba ni el rótulo de abajo, y el recuadro de «Las respuestas largas» no pisa su rótulo (nmw1g3dfftit)', () => {
      const c = js.match(/const CONTENIDO = \{ x: ([\d.]+), y: ([\d.]+), escala: ([\d.]+) \};/);
      const y = Number(c?.[2]), escala = Number(c?.[3]);
      // Lo que se dibujaba desde 14 empieza bajo las píldoras (llegan hasta 19), y lo que llegaba a 180 queda sobre el rótulo de abajo (empieza en unos 182)
      expect(y + 14 * escala).toBeGreaterThan(19 + 2);
      expect(y + 180 * escala).toBeLessThan(182 - 8);
      expect(Number(c?.[1]) + 160 * escala).toBeCloseTo(160, 5);   // centrado
      expect(js).toContain('ctx.save(); ctx.translate(CONTENIDO.x, CONTENIDO.y); ctx.scale(CONTENIDO.escala, CONTENIDO.escala);');
      // «Las respuestas largas»: el recuadro termina en 160 y su rótulo va debajo
      expect(js).toContain("ventana(c, 50, 16, 190, 144, 'la respuesta del modelo');");
      expect(js).toContain("letrero(c, 'y le dices «sí» a todo', 145, 174, ROJO, 9)");
    });

    it('la voz en español: un clip de Kokoro em_santa por cada rótulo, que dice lo mismo que el rótulo; suena al abrir, se calla con su botón (que el navegador recuerda) y cada rótulo espera a que termine (nmw1ga4dftit, pd_narrador)', async () => {
      const { rotulosDelRecorrido, VOZ_RECORRIDO, ESPERAN_CONFIRMO, SIN_VOZ_TODAVIA } = await import('./vozRecorrido.ts');
      expect(VOZ_RECORRIDO).toBe('kokoro:em_santa');
      // El sexto problema todavía no tiene voz (espera el «Confirmo»): su clave no cuenta aquí
      // Ni los que esperan la cuota de Google (CLAVES_SIN_VOZ_TODAVIA)
      const rotulos = rotulosDelRecorrido(js, html).filter(({ clave }) => !SIN_VOZ_TODAVIA.includes(clave) && !clavesSinVozTodavia.has(clave));
      expect(rotulos.length).toBeGreaterThan(16 * 2 + 5);
      const carpeta = join(__dirname, '..', 'docs', 'difusion', 'voz', 'es');
      const dichos = JSON.parse(readFileSync(join(carpeta, 'textos.json'), 'utf8')) as Record<string, string | { texto: string }>;
      for (const { clave, texto } of rotulos) {
        expect(existsSync(join(carpeta, `${clave}.mp3`)), clave).toBe(true);
        const d = dichos[clave];
        // Dice exactamente lo que dice el rótulo; el que espera su «Confirmo» para generarse otra vez, lo de antes, que
        // solo cambió en un signo
        const dicho = typeof d === 'object' ? d.texto : d;
        if (ESPERAN_CONFIRMO.includes(clave)) expect(dicho.replace(/[,;.]$/, ''), clave).toBe(texto.replace(/[,;.]$/, ''));
        else expect(dicho, clave).toBe(texto);
      }
      // El botón para callarla, que el navegador recuerda, y la voz que suena al abrir la animación
      expect(html).toContain('data-voz-clip aria-pressed="true"');
      expect(js).toContain("const VOZ_GUARDADA = 'stl-recorrido-voz';");
      expect(js).toContain("localStorage.setItem(VOZ_GUARDADA, conVoz ? 'si' : 'no');");
      expect(js).toContain("a.src = `voz/${vozEnIngles(clave) ? 'en' : 'es'}/${clave}.mp3`;");
      expect(js).toContain('const ahoraEn = pasoDeClip(seleccionado, clipT).clave');
      expect(js).toContain('else decir(ahoraEn, dicho * ritmoDeClave(ahoraEn));');
      // Cada rótulo se queda hasta que la voz termina: el reloj del clip no pasa al siguiente mientras habla
      expect(js).toContain('if (luego.clave === ya.clave || !sigueHablando()) clipT = Math.min(duraClip(seleccionado), clipT + dt * velClip);');
      // Al cerrar, se calla
      expect(js.slice(js.indexOf('cerrarPopup = () => {'))).toMatch(/^cerrarPopup = \(\) => \{\n {4}if \(seleccionado < 0\) return false;\n {4}callar\(\);/);
    });

    it('la primera animación, «Tu atención se dispersa», habla con la voz de Google y la animación la sigue: cada rótulo dura su clip y su respiro, y lo que se ve avanza con lo que se dice (nmw2p37bktit, pr_voz_google)', async () => {
      const { clavesDelProblema, conPistaRecorrido, CON_GOOGLE_FALTAN, guionComoEmpezar, PROBLEMAS_CON_GOOGLE, SUELTOS_CON_GOOGLE, VOZ_GOOGLE_RECORRIDO } = await import('./vozRecorrido.ts');
      // La primera, la segunda (nmw2qmq0ftit) y, desde el 5 de noviembre por la tarde, las otras cuatro, con su «Confirmo»
      expect(PROBLEMAS_CON_GOOGLE).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(VOZ_GOOGLE_RECORRIDO).toEqual({ modelo: 'gemini-3.8-flash-tts', voz: 'es-419-commercial-11' });
      const colores = js.match(/const ORO = [^\n]+\nconst VERDE = [^\n]+\n/)?.[0] ?? '';
      const dibujo = js.slice(js.indexOf('// ── Las mini animaciones de los problemas'), js.indexOf('function iniciar() {'));
      type Paso = { enEnunciado: boolean; enProblema: boolean; clave: string; q: number };
      const f = new Function(`${colores}${dibujo}; return { PISTA_VOZ_ES, PASOS_SEG, GRANDES, problemaSeg, solucionSeg, enunciadoSeg, tiemposConPista, pasoDeClip, duraClip, clavesDeClip, RESPIRO_COMA, RESPIRO_FRASE, RESPIRO_ENUNCIADO, ritmoDeClave, PAUSA_VOZ_ES };`)() as {
        PAUSA_VOZ_ES: Record<string, number>; PISTA_VOZ_ES: Record<string, number>; PASOS_SEG: { problema: [number, string][]; solucion: [number, string][] }[]; GRANDES: number[][]; problemaSeg: (j: number) => number; solucionSeg: (j: number) => number;
        enunciadoSeg: (i: number) => number; tiemposConPista: (j: number, p: boolean) => number[]; pasoDeClip: (i: number, t: number) => Paso; duraClip: (i: number) => number; clavesDeClip: (i: number) => string[]; RESPIRO_COMA: number; RESPIRO_FRASE: number; RESPIRO_ENUNCIADO: number; ritmoDeClave: (c: string) => number;
      };
      // Los 18 clips de la primera y los 15 de la segunda tienen pista, y solo ellos (con el cierre de cada segmento, nmw3ruscptit)
      const claves = clavesDelProblema(js, 1);
      expect(claves).toHaveLength(18);
      expect(claves).toEqual(f.clavesDeClip(0));
      const segunda = clavesDelProblema(js, 2);
      expect(segunda).toHaveLength(15);
      expect(segunda).toEqual(f.clavesDeClip(1));
      // Y las otras cuatro, enteras: ya no queda ningún clip suelto ni nada por generar (nmw2xuhhgtit)
      expect(SUELTOS_CON_GOOGLE).toEqual([]);
      expect(CON_GOOGLE_FALTAN).toEqual({ problemas: [], frasesNuevas: {} });
      // (con el séptimo, el del dictado, y «Cómo empezar», menos los clips que esperan la cuota de Google)
      const otras = [...[3, 4, 5, 6, 7].flatMap((p) => clavesDelProblema(js, p)), ...guionComoEmpezar(js).map(({ clave }) => clave)].filter((c) => !clavesSinVozTodavia.has(c));
      // Las frases de «Cómo funciona» salieron con su estación (nmw40cp3jtit)
      expect(Object.keys(f.PISTA_VOZ_ES).sort()).toEqual([...claves, ...segunda, ...otras].sort());
      for (const c of [...segunda, ...otras]) expect(existsSync(join(raiz, 'docs', 'difusion', 'voz', 'es', `${c}.mp3`)), c).toBe(true);
      const carpeta = join(raiz, 'docs', 'difusion', 'voz', 'es');
      const dichos = JSON.parse(readFileSync(join(carpeta, 'textos.json'), 'utf8')) as Record<string, string | { texto: string; ms: number }>;
      for (const c of [...claves, ...segunda, ...otras]) {
        const d = dichos[c];
        expect(typeof d, c).toBe('object');
        expect((d as { ms: number }).ms, c).toBe(f.PISTA_VOZ_ES[c]);
        expect(f.PISTA_VOZ_ES[c], c).toBeGreaterThan(500);
      }
      // La animación dura lo que su voz: el enunciado y cada paso, su clip y su respiro
      expect(f.enunciadoSeg(0)).toBeCloseTo(f.PISTA_VOZ_ES['g1-e'] / 1000 + f.RESPIRO_ENUNCIADO, 6);
      for (const j of f.GRANDES[0]) {
        const tp = f.tiemposConPista(j, true), ts = f.tiemposConPista(j, false);
        expect(f.problemaSeg(j)).toBeCloseTo(Math.max(6.5 / (1.35 * 1.1), tp.reduce((s, x) => s + x, 0)), 6);
        expect(f.solucionSeg(j)).toBeCloseTo(Math.max(15 / (1.35 * 1.1), ts.reduce((s, x) => s + x, 0)), 6);
        // Respira poco donde la frase sigue y más al terminarla
        // (y, donde va una pausa estratégica, también ella: nmw2r873etit)
        f.PASOS_SEG[j].solucion.forEach(([, texto], m) => { const c = `s${j + 1}-${m + 1}`; expect(ts[m] - f.PISTA_VOZ_ES[c] / 1000 / f.ritmoDeClave(c)).toBeCloseTo((m === ts.length - 1 || /[.?!]$/.test(texto) ? f.RESPIRO_FRASE : f.RESPIRO_COMA) + (f.PAUSA_VOZ_ES[c] ?? 0), 6); });
      }
      // Cada rótulo empieza justo cuando termina el anterior, y el dibujo avanza con él, de su «desde» al del siguiente
      const j0 = f.GRANDES[0][0], e = f.enunciadoSeg(0), tp = f.tiemposConPista(j0, true);
      expect(f.pasoDeClip(0, e + 0.001)).toMatchObject({ enProblema: true, clave: `s${j0 + 1}-p1` });
      expect(f.pasoDeClip(0, e + tp[0] - 0.001).clave).toBe(`s${j0 + 1}-p1`);
      expect(f.pasoDeClip(0, e + tp[0] + 0.001)).toMatchObject({ clave: `s${j0 + 1}-p2` });
      expect(f.pasoDeClip(0, e + tp[0] + 0.001).q).toBeCloseTo(f.PASOS_SEG[j0].problema[1][0], 2);
      let antes = -1;
      for (let t = e; t < e + f.problemaSeg(j0); t += 0.1) { const q = f.pasoDeClip(0, t).q; expect(q).toBeGreaterThanOrEqual(antes); antes = q; }
      // La herramienta escribe la pista en una sola línea
      const otra = conPistaRecorrido(js, { 'g1-e': 1000 });
      expect(otra).toContain('const PISTA_VOZ_ES = {"g1-e":1000};');
      expect(otra.match(/const PISTA_VOZ_ES = /g)).toHaveLength(1);
      // El guion no se alargó: la frase retocada es más corta que antes
      expect(f.PASOS_SEG[1].problema[2][1]).toBe('y te agotas tratando de seguirlas todas');
      // El final de la idea que surge a mitad de algo ya lleva su pausa estratégica antes del remate (nmw2r873etit): su
      // penúltima frase ya suena con su clip nuevo, sin los dos puntos, y la última llega con el suyo, cuando Google deje
      // generarlo; mientras, rótulo y voz dicen lo de antes
      expect(f.PASOS_SEG[2].solucion[4][1]).toBe('sin perder esa idea o ajuste nuevo,');
      expect(dichos['s3-5']).toMatchObject({ texto: 'sin perder esa idea o ajuste nuevo,' });
      expect(f.PASOS_SEG[2].solucion[5][1]).toBe('y este queda en la ruta donde debe ir');
      expect(dichos['s3-6']).toMatchObject({ texto: 'y este queda en la ruta donde debe ir' });
      expect(f.PAUSA_VOZ_ES).toEqual({ 's3-5': 0.6 });
    });

    it('la voz manda: mientras un clip de Google suena, el reloj de la animación es el de la voz, a cualquier velocidad, sin esperas entre rótulos (nmw2qhhsjtit, nmw2qiyuwtit)', () => {
      const colores = js.match(/const ORO = [^\n]+\nconst VERDE = [^\n]+\n/)?.[0] ?? '';
      const dibujo = js.slice(js.indexOf('// ── Las mini animaciones de los problemas'), js.indexOf('function iniciar() {'));
      type Tramo = { clave: string; desde: number; voz: number } | null;
      const f = new Function(`${colores}${dibujo}; return { tramoDeVoz, pasoDeClip, duraClip, PASOS_SEG, RESPIRO_COMA, RESPIRO_FRASE, ritmoDeClave, PAUSA_VOZ_ES };`)() as {
        PAUSA_VOZ_ES: Record<string, number>; tramoDeVoz: (i: number, t: number) => Tramo; pasoDeClip: (i: number, t: number) => { clave: string }; duraClip: (i: number) => number;
        PASOS_SEG: { problema: [number, string][]; solucion: [number, string][] }[]; RESPIRO_COMA: number; RESPIRO_FRASE: number; ritmoDeClave: (c: string) => number;
      };
      // Los respiros, cortos: en la coma, casi de corrido
      expect(f.RESPIRO_COMA).toBeLessThanOrEqual(0.05);
      expect(f.RESPIRO_FRASE).toBeLessThanOrEqual(0.35);
      for (const i of [0, 1]) {
        let antes: Tramo = null;
        for (let t = 0; t < f.duraClip(i); t += 0.02) {
          const tr = f.tramoDeVoz(i, t);
          expect(tr, `${i} ${t}`).not.toBeNull();
          // El mismo paso que se ve, y empieza donde empieza ese rótulo
          expect(tr!.clave).toBe(f.pasoDeClip(i, t).clave);
          expect(tr!.desde).toBeLessThanOrEqual(t + 1e-9);
          expect(f.pasoDeClip(i, tr!.desde + 1e-6).clave).toBe(tr!.clave);
          // Su voz cabe en su rótulo: al terminar de decirlo, el rótulo sigue siendo el suyo
          expect(f.pasoDeClip(i, tr!.desde + tr!.voz - 1e-6).clave).toBe(tr!.clave);
          // Cada rótulo nuevo empieza al respiro del anterior, sin esperas (en la primera; en la segunda, su situación de
          // una sola frase guarda el mínimo aprobado para que se alcance a ver)
          // (más la pausa estratégica de antes del remate, si la lleva: nmw2r873etit)
          // El cierre, en cambio, se queda sus dos segundos aunque su frase sea corta (nmw3ruscptit)
          if (i === 0 && antes && antes.clave !== tr!.clave && !antes.clave.endsWith('-c')) expect(tr!.desde - (antes.desde + antes.voz)).toBeLessThanOrEqual(0.5 + (f.PAUSA_VOZ_ES[antes.clave] ?? 0) + 1e-6);
          antes = tr;
        }
      }
      // «y se organiza automáticamente», sin la coma, con su clip nuevo y a su ritmo natural, sin el 20 % de más (nmw2rqwg6tit)
      expect(f.PASOS_SEG[1].solucion[1][1]).toBe('y se organiza automáticamente');
      expect(f.ritmoDeClave('s2-2')).toBe(1);
      expect(js).toContain('const RITMO_VOZ_ES = {};');
      // El reloj de la voz: lo que lleva dicho, en el tiempo del clip (la velocidad elegida acelera los dos igual)
      expect(js).toContain('if (tr && a && voz.hablando && voz.clave === tr.clave && !a.paused) clipT = tr.desde + Math.min(tr.voz, a.currentTime / (a.ritmo ?? 1));');
      // Al mover la perilla, la voz va donde quedó la animación
      expect(js).toContain('if (pasoDeClip(seleccionado, clipT).clave !== antes || tramoDeVoz(seleccionado, clipT)) callar();');
    });

    it('cada animación empieza diciendo su enunciado, el «¿Te ha pasado…?» de la lista, escrito y con su voz, y su clip existe (nmw1olvthtit)', async () => {
      const { enunciadosDelRecorrido, SIN_VOZ_TODAVIA } = await import('./vozRecorrido.ts');
      const colores = js.match(/const ORO = [^\n]+\nconst VERDE = [^\n]+\n/)?.[0] ?? '';
      const dibujo = js.slice(js.indexOf('// ── Las mini animaciones de los problemas'), js.indexOf('function iniciar() {'));
      type Paso = { enEnunciado: boolean; clave: string; texto: string };
      const f = new Function(`${colores}${dibujo}; return { pasoDeClip, clavesDeClip, ENUNCIADOS, GRANDES };`)() as { pasoDeClip: (i: number, t: number) => Paso; clavesDeClip: (i: number) => string[]; ENUNCIADOS: string[]; GRANDES: number[][] };
      const enunciados = enunciadosDelRecorrido(html);
      expect(enunciados).toHaveLength(7);
      const carpeta = join(raiz, 'docs', 'difusion', 'voz', 'es');
      const crudos = JSON.parse(readFileSync(join(carpeta, 'textos.json'), 'utf8')) as Record<string, string | { texto: string }>;
      const dichos = Object.fromEntries(Object.entries(crudos).map(([k, d]) => [k, typeof d === 'object' ? d.texto : d]));
      problemasEnLaPagina.forEach((m, i) => {
        expect(enunciados[i]).toEqual({ clave: `g${i + 1}-e`, texto: m[3].trim() });
        f.ENUNCIADOS[i] = m[3].trim();
        // La primera voz del clip es la de su enunciado, y lo primero que se ve es él
        expect(f.pasoDeClip(i, 0)).toMatchObject({ enEnunciado: true, clave: `g${i + 1}-e`, texto: m[3].trim() });
        // El que aún no tiene voz (el sexto, hasta su «Confirmo») no se pide ni tiene clip
        if (SIN_VOZ_TODAVIA.includes(`g${i + 1}-e`)) {
          expect(f.clavesDeClip(i)).not.toContain(`g${i + 1}-e`);
          expect(existsSync(join(carpeta, `g${i + 1}-e.mp3`))).toBe(false);
          return;
        }
        // El que cambió de texto y espera su «Confirmo» (los de «Hilo perdido» y «Modelo olvidadizo»): no se pide su clip viejo
        if (clavesSinVozTodavia.has(`g${i + 1}-e`)) { expect(f.clavesDeClip(i)).not.toContain(`g${i + 1}-e`); return; }
        expect(f.clavesDeClip(i)[0]).toBe(`g${i + 1}-e`);
        expect(existsSync(join(carpeta, `g${i + 1}-e.mp3`))).toBe(true);
        expect(dichos[`g${i + 1}-e`]).toBe(m[3].trim());
      });
      // La página los llena con el texto de cada <summary>
      expect(js).toContain("problemas.forEach((d, i) => { ENUNCIADOS[i] = d.querySelector('summary')?.textContent.trim() ?? ''; });");
    });

    it('un clic en la barra de lo que va lleva la animación a ese punto, también con el lienzo encajado en su recuadro (nmw1oc8mctit)', () => {
      const dibujo = js.slice(js.indexOf('// ── Las mini animaciones de los problemas'), js.indexOf('function iniciar() {'));
      const colores = js.match(/const ORO = [^\n]+\nconst VERDE = [^\n]+\n/)?.[0] ?? '';
      const { puntoDeBarra, BARRA } = new Function(`${colores}${dibujo}; return { puntoDeBarra, BARRA };`)() as { puntoDeBarra: (x: number, y: number, w: number, h: number) => number | null; BARRA: { x: number; y: number; ancho: number; alto: number } };
      // A la medida (1280 × 800): el principio, la mitad y el final de la barra
      const y = (BARRA.y + 1) * 4;
      expect(puntoDeBarra(BARRA.x * 4, y, 1280, 800)).toBeCloseTo(0, 5);
      expect(puntoDeBarra((BARRA.x + BARRA.ancho / 2) * 4, y, 1280, 800)).toBeCloseTo(0.5, 5);
      expect(puntoDeBarra((BARRA.x + BARRA.ancho) * 4, y, 1280, 800)).toBeCloseTo(1, 5);
      // Más ancho que alto: el dibujo queda al centro, con bandas a los lados
      expect(puntoDeBarra(200 + (BARRA.x + BARRA.ancho / 4) * 2, (BARRA.y + 1) * 2, 1040, 400)).toBeCloseTo(0.25, 5);
      // Arriba de la barra, en el dibujo, no
      expect(puntoDeBarra(640, 100 * 4, 1280, 800)).toBeNull();
      expect(puntoDeBarra(640, 150 * 4, 1280, 800)).toBeNull();
      // El clic la mueve a ese punto
      const clic = js.match(/clip\?\.addEventListener\('click', \(e\) => \{[\s\S]*?\n {2}\}\);/)?.[0] ?? '';
      expect(clic).toContain('if (f !== null) moverClip(f * duraClip(seleccionado) - clipT);');
      expect(js).toContain('return puntoDeBarra(e.clientX - b.left, e.clientY - b.top, b.width, b.height);');
    });

    it('la estación 1: cada figura con el rótulo de su tipo, sin pisarse en el anillo, solo sin él mientras gira alrededor del director y con él al caer a la línea (nmw1o0ca0tit)', () => {
      const tipos = JSON.parse((js.match(/const TIPOS_ENTREGA = (\[[^\]]+\]);/)?.[1] ?? '[]').replace(/'/g, '"')) as string[];
      const T = JSON.parse((js.match(/ {2}es: (\{[^}]+\}),/)?.[1] ?? '{}').replace(/(\w+): '/g, '"$1": \'').replace(/'/g, '"')) as Record<string, string>;
      expect(tipos).toHaveLength(10);
      // Un rótulo por figura, no solo en la primera de cada tipo
      expect(js).toContain('const etiquetasTipo = TIPOS_ENTREGA.map((tipo, k) => {');
      expect(js).not.toContain('if (TIPOS_ENTREGA.indexOf(tipo) !== k) return;');
      const alto = Number(js.match(/const ALTO_ETIQUETA = ([\d.]+), SOBRE_FIGURA = ([\d.]+);/)?.[1]);
      const sobre = Number(js.match(/const ALTO_ETIQUETA = ([\d.]+), SOBRE_FIGURA = ([\d.]+);/)?.[2]);
      expect(alto).toBeGreaterThan(0.4);
      // En el anillo: dónde queda cada rótulo (a lo largo de la línea y hacia arriba), con el vaivén de cada figura
      const revuelto = js.match(/revuelto: pDir\.clone\(\)\.addScaledVector\(t, Math\.cos\(anillo\(k\)\) \* \(([\d.]+) \+ \(\(k \* 7\) % 3\) \* ([\d.]+)\)\)\.addScaledVector\(ARRIBA, Math\.sin\(anillo\(k\)\) \* \(([\d.]+) \+ \(\(k \* 5\) % 3\) \* ([\d.]+)\)\)/);
      const [r0, dr, a0, da] = (revuelto ?? []).slice(1).map(Number);
      const vaiven = Number(js.match(/const flota = \(e, k, tt, v\) => v\.copy\(e\.revuelto\)\.addScaledVector\(ARRIBA, Math\.sin\([^)]+\) \* ([\d.]+)\);/)?.[1]);
      expect(vaiven).toBeGreaterThan(0);
      const anillo = (k: number) => k * (Math.PI * 2 / tipos.length) + 0.3;
      // Ancho de cada rótulo como lo mide rotulo(): letras de 46 px (unos 28 de ancho cada una, de más) y 56 de margen, en 84 de alto
      const caja = tipos.map((tipo, k) => ({ x: Math.cos(anillo(k)) * (r0 + ((k * 7) % 3) * dr), y: Math.sin(anillo(k)) * (a0 + ((k * 5) % 3) * da) + sobre, w: (alto * (T[tipo].length * 28 + 56)) / 84 }));
      for (let a = 0; a < caja.length; a++) for (let b = a + 1; b < caja.length; b++) {
        const separados = Math.abs(caja[a].x - caja[b].x) >= (caja[a].w + caja[b].w) / 2 || Math.abs(caja[a].y - caja[b].y) >= alto + 2 * vaiven;
        expect(separados, `${a} y ${b}`).toBe(true);
      }
      // Sin rótulo solo mientras gira alrededor del director; con él al volver ordenada y al caer a la línea
      const conEtiqueta = new Function(`const procesa = (k) => 0.20 + 0.004 * k; ${js.match(/const conEtiqueta = [^\n]+/)?.[0]} return conEtiqueta;`)() as (k: number, c: number) => boolean;
      for (let k = 0; k < 10; k++) {
        expect(conEtiqueta(k, 0.1)).toBe(true);                 // flotando en el anillo
        expect(conEtiqueta(k, 0.3)).toBe(false);                // girando alrededor del director
        expect(conEtiqueta(k, 0.56)).toBe(true);                // ordenada
        expect(conEtiqueta(k, 0.6 + 0.004 * k)).toBe(true);     // cayendo a la línea
      }
      expect(js).toContain('r.visible = conEtiqueta(k, c) && m.scale.x > 0.6;');
    });

    it('la estación 1: el director habla con el modelo cinco segundos menos que al principio (dos, dos y uno), y lo demás del ciclo va igual (nmw1o0ca0tit, nmw27y0antit, nmw2cpbentit)', () => {
      const bloque = js.match(/const CICLO_BASE = [\s\S]*?\n {4}\};/)?.[0] ?? '';
      const cicloDe = new Function(`${bloque} return cicloDe;`)() as (tt: number) => number;
      // Al principio, de 0,28 a 0,48 de 36 s: 7,2 s. Luego 5,2, después 3,2 y ahora 2,2
      const habla: number[] = [];
      for (let s = 0; s < 31; s += 0.01) { const c = cicloDe(s); if (c > 0.28 && c < 0.48) habla.push(s); }
      expect(habla.length * 0.01).toBeCloseTo(2.2, 1);
      // Antes de hablar, igual que antes; después, cinco segundos antes
      expect(cicloDe(5) * 36).toBeCloseTo(5, 6);
      expect(cicloDe(27) * 36).toBeCloseTo(32, 6);
      // Y el ciclo de 31 s se repite sin saltos: al final vuelve a empezar
      expect(cicloDe(30.999)).toBeCloseTo(1, 3);
      expect(cicloDe(31)).toBe(0);
      expect(js).toContain('const c = cicloDe(tt);');
    });

    it('la estación 1: el rótulo del Studio no lo toca la arista de arriba del cubo, vista desde la cámara de la portada (nmw27yt10tit)', () => {
      const lado = Number(js.match(/const LADO_S = ([\d.]+);/)?.[1]);
      const sobre = Number(js.match(/const ROTULO_SOBRE_STUDIO = ([\d.]+);/)?.[1]);
      const alto = Number(js.match(/const ALTO_STUDIO = ([\d.]+)/)?.[1]);
      expect(js).toContain('rStudio.position.copy(centro).addScaledVector(ARRIBA, LADO_S / 2 + ROTULO_SOBRE_STUDIO);');
      expect(js).toContain('const rStudio = rotulo(T.estudio, MORADO, 1.0);');
      // La cámara de la portada: 5,8 sobre la línea y 34 de frente al centro del Studio (portada.posicion)
      expect(js).toContain('const mitad = enLinea(0).addScaledVector(ARRIBA, 5);');
      expect(js).toContain('posicion: mitad.clone().addScaledVector(lado, 34).addScaledVector(ARRIBA, 0.8),');
      const camara = 5.8, distancia = 34, mitadRotulo = 0.5;
      // Lo más alto que se ve del cubo: su arista de arriba más cercana; y lo más bajo del rótulo, con un margen
      const arista = (alto + lado / 2 - camara) / (distancia - lado / 2);
      const rotulo = (alto + lado / 2 + sobre - mitadRotulo - camara) / distancia;
      expect(rotulo - arista).toBeGreaterThan(0.01);
    });

    it('la estación 1: el desarrollador y el modelo llevan su luz, como en la animación de la línea (nmw1o0ca0tit)', () => {
      expect(js).toContain('function resplandor(rgb, color, tam) {');
      expect(js).toContain("const luzTu = resplandor('255, 241, 196', '#fff1c4', 1.7 * 2.6);");
      expect(js).toContain("const luzModelo = resplandor('197, 210, 230', MODELO, 2.1 * 2.6);");
      // El mismo halo tibio del desarrollador en la animación de la línea
      const linea = readFileSync(join(raiz, 'docs/difusion/linea-del-proyecto.html'), 'utf8');
      expect(linea).toContain("halo.addColorStop(0, 'rgba(255,241,196,.28)');");
      // La luz sigue al desarrollador cuando salta
      expect(js).toContain('luzTu.halo.position.copy(tu.position);');
    });

    it('la estación 1: al soltar la perilla, la línea que ya pasó no se repite; la que aún corre sigue desde donde va (nmw2ed0sqtit)', () => {
      const linea = readFileSync(join(raiz, 'docs/difusion/linea-del-proyecto.html'), 'utf8');
      const regla = linea.match(/const desdeTrasMover = [^\n]+/)?.[0] ?? '';
      const desdeTrasMover = new Function(`${regla} return desdeTrasMover;`)() as (pasado: number, dura: number) => number | null;
      // Ya pasó su tiempo: callada, no se repite
      expect(desdeTrasMover(5200, 4000)).toBeNull();
      expect(desdeTrasMover(4000, 4000)).toBeNull();
      // Aún corre: desde donde va, para seguir a la escena; si apenas empezaba, desde su comienzo
      expect(desdeTrasMover(1800, 4000)).toBe(1800);
      expect(desdeTrasMover(150, 4000)).toBe(0);
      // La página la usa al soltar, con el momento en que empezó a decirse la línea que se ve
      const alDia = linea.match(/function vozAlDia\(\) \{[\s\S]*?\n {2}\}/)?.[0] ?? '';
      expect(alDia).toContain('const desde = narra.trasMover ? desdeTrasMover(reloj - actualEn, duraLinea(actual)) : 0;');
      expect(alDia).toContain('if (desde === null) narra.dicha = actual;');
      expect(linea).toContain('narra.movida = performance.now(); narra.trasMover = true; }');
      // Al saltar, cada línea guarda su momento, no el del salto
      expect(linea).toContain('if (ultima) mostrar(ultima.t, ultima.en);');
      expect(linea).toContain('mostrar(lineas[i], t0 + en[i]);');
    });

    it('el anillo queda en el centro de lo que deja libre el menú y, con un reproductor abierto, junto al menú: la imagen se corre, la cámara no se mueve', () => {
      expect(js).toContain('camara.setViewOffset(ancho, alto, -dx * cerca, corrimientoSinBajar(-dy * cerca), ancho, alto);');
      expect(js).toContain('camara.clearViewOffset();');
      expect(js).toContain('const dx = lerp(menuIzq / 2, d.anilloX, e) - c.x');
      expect(js).not.toContain('vista.dos');
    });

    it('el reproductor se cierra solo 4 s después de que termina su animación; si se oprime «↻ Repetir» antes, se queda abierto y ya no se cierra solo', () => {
      const colores = js.match(/const ORO = [^\n]+\nconst VERDE = [^\n]+\n/)?.[0] ?? '';
      const dibujo = js.slice(js.indexOf('// ── Las mini animaciones de los problemas'), js.indexOf('function iniciar() {'));
      type Reloj = { cuadro: (ahora: number, terminada: boolean) => boolean; repetir: () => void; abrir: () => void; sola: boolean };
      const { relojAutocierre, CIERRA_TRAS_SEG } = new Function(`${colores}${dibujo}; return { relojAutocierre, CIERRA_TRAS_SEG };`)() as { relojAutocierre: () => Reloj; CIERRA_TRAS_SEG: number };
      expect(CIERRA_TRAS_SEG).toBe(4);
      // Mientras la animación corre no cuenta nada; al terminar, cuenta 4 s y recién ahí manda cerrar
      const r = relojAutocierre();
      expect(r.cuadro(0, false)).toBe(false);
      expect(r.cuadro(30_000, false)).toBe(false);
      expect(r.cuadro(40_000, true)).toBe(false);     // acaba de terminar
      expect(r.cuadro(43_900, true)).toBe(false);     // 3,9 s después, todavía no
      expect(r.cuadro(44_000, true)).toBe(true);      // a los 4 s, se cierra
      // Si la animación se vuelve a mover (la perilla la devolvió), el conteo empieza de nuevo
      const p = relojAutocierre();
      p.cuadro(0, true); p.cuadro(2000, false);
      expect(p.cuadro(5000, true)).toBe(false);
      expect(p.cuadro(8900, true)).toBe(false);
      expect(p.cuadro(9000, true)).toBe(true);
      // «↻ Repetir» antes de que se cierre: se queda abierta, y ya no se cierra sola aunque pase mucho tiempo y termine otra vez
      const s = relojAutocierre();
      s.cuadro(0, true);
      expect(s.cuadro(3000, true)).toBe(false);
      s.repetir();
      expect(s.sola).toBe(false);
      expect(s.cuadro(3100, false)).toBe(false);
      expect(s.cuadro(20_000, true)).toBe(false);
      expect(s.cuadro(200_000, true)).toBe(false);
      // Una pantalla nueva vuelve a cerrarse sola
      s.abrir();
      expect(s.sola).toBe(true);
      expect(s.cuadro(300_000, true)).toBe(false);
      expect(s.cuadro(304_000, true)).toBe(true);
      // Cómo se conecta: cada cuadro con la hora y si terminó; «↻ Repetir» y «Verla otra vez» lo detienen; una pantalla nueva lo rearma
      expect(js).toContain('if (autocierre.cuadro(ahoraMs, terminado())) cerrarPopup();');
      expect(js).toContain('if (manual) autocierre.repetir();');
      expect(js).toContain('autocierre.abrir();');
      // Al cerrarse (solo o a mano) el anillo vuelve a su tamaño y al centro
      expect(js).toContain('pantalla2.cam = quieto ? meta : pantalla2.cam + (meta - pantalla2.cam) * Math.min(1, dt * 4);');
      expect(js).toContain('pantalla2.abierta = false;\n    return true;');
    });

    it('el cierre de cada solución (el ✓, el problema resuelto y la frase de Kai) queda a la vista al menos 4 segundos (CIERRE_SEG)', () => {
      const colores = js.match(/const ORO = [^\n]+\nconst VERDE = [^\n]+\n/)?.[0] ?? '';
      const dibujo = js.slice(js.indexOf('// ── Las mini animaciones de los problemas'), js.indexOf('function iniciar() {'));
      const g = new Function(`${colores}${dibujo}; return { CIERRE_SEG, cierreSeg, CIERRES, pasoDeClip, duraClip, GRANDES, enunciadoSeg, segmentoSeg };`)() as {
        CIERRE_SEG: number; cierreSeg: (j: number) => number; CIERRES: [string, string][]; GRANDES: number[][]; duraClip: (i: number) => number;
        pasoDeClip: (i: number, t: number) => { enCierre: boolean; clave: string }; enunciadoSeg: (i: number) => number; segmentoSeg: (j: number) => number;
      };
      expect(g.CIERRE_SEG).toBeGreaterThanOrEqual(4);
      for (let j = 0; j < g.CIERRES.length; j++) expect(g.cierreSeg(j), `cierre ${j + 1}`).toBeGreaterThanOrEqual(4);
      // Medido en el reloj del clip: cada cierre ocupa 4 s o más seguidos
      for (let i = 0; i < g.GRANDES.length; i++) {
        let enCierre = 0, mayor = 0, claveAntes = '';
        const duraciones: number[] = [];
        for (let t = 0; t <= g.duraClip(i); t += 0.05) {
          const p = g.pasoDeClip(i, t);
          if (p.enCierre && p.clave === claveAntes) enCierre += 0.05;
          else { if (enCierre) duraciones.push(enCierre); enCierre = p.enCierre ? 0.05 : 0; }
          claveAntes = p.clave; mayor = Math.max(mayor, enCierre);
        }
        if (enCierre) duraciones.push(enCierre);
        expect(duraciones, `clip ${i + 1}`).toHaveLength(g.GRANDES[i].length);
        for (const d of duraciones) expect(d, `clip ${i + 1}`).toBeGreaterThanOrEqual(4 - 0.1);
      }
    });

    it('las animaciones usan los actores e íconos de la estación 1 (el desarrollador, el Studio con el director dentro, el modelo, los íconos de cada nota y la misión), con las mismas formas y colores, y no los dibujos genéricos de antes', () => {
      const colores = js.match(/const ORO = [^\n]+\nconst VERDE = [^\n]+\n/)?.[0] ?? '';
      const dibujo = js.slice(js.indexOf('// ── Las mini animaciones de los problemas'), js.indexOf('function iniciar() {'));
      for (const viejo of ['function cubito', 'function cajaStudio', 'function rombo', 'function bombilla', 'function tarjeta(']) expect(dibujo, viejo).not.toContain(viejo);
      for (const nuevo of ['function actorDev(', 'function actorStudio(', 'function actorDirector(', 'function actorModelo(', 'function iconoNota(', 'function placaMision(']) expect(dibujo, nuevo).toContain(nuevo);
      // Las mismas formas que en iniciar(): la carita del cubo, el visor del director y los colores de cada tipo de nota del Studio
      expect(dibujo).toContain('c.quadraticCurveTo(128, 202, 168, 158)');   // la sonrisa del cubo del desarrollador y del modelo
      expect(dibujo).toContain('c.fillStyle = AMARILLO_TU;');
      expect(dibujo).toContain("c.fillStyle = '#f4f1ea';");               // el cubo blanco del director
      expect(dibujo).toContain("c.fillStyle = '#2b2826';");               // y su visor
      expect(dibujo).toContain("c.strokeStyle = '#a8f4fb';");             // con sus ojos y su sonrisa de luz cian
      expect(dibujo).toContain('c.fillStyle = MODELO;');
      expect(dibujo).toContain('const COLOR_TIPO = {');
      expect(dibujo).toContain("rgba(185, 163, 255, .12)");               // el Studio, morado translúcido
      // Con ellos se dibujan los clips: el desarrollador, el Studio y el director aparecen en las animaciones de los problemas
      const segmentos = dibujo.match(/const SEGMENTOS = \[[\s\S]*?\n\];/)?.[0] ?? '';
      for (const uso of ['actorDev(', 'actorStudio(', 'actorDirector(', 'actorModelo(', "iconoNota(c, 'idea'", 'placaMision(']) expect(segmentos, uso).toContain(uso);
      expect(segmentos).not.toMatch(/\bcubito\(|\bcajaStudio\(|\brombo\(|\bbombilla\(/);
      // Los cinco íconos de nota se dibujan sin errores
      const nada = () => undefined;
      const ctx = new Proxy({} as Record<string, unknown>, { get: (o, k) => k in o ? o[k as string] : k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop: nada }) : nada, set: (o, k, v) => { o[k as string] = v; return true; } });
      const { iconoNota, COLOR_TIPO } = new Function(`${colores}${dibujo}; return { iconoNota, COLOR_TIPO };`)() as { iconoNota: (c: unknown, tipo: string, x: number, y: number, s?: number, a?: number) => void; COLOR_TIPO: Record<string, string> };
      for (const tipo of ['falla', 'idea', 'ajuste', 'pregunta', 'respuesta']) { expect(COLOR_TIPO[tipo]).toMatch(/^#[0-9a-f]{6}$/); expect(() => iconoNota(ctx, tipo, 10, 10, 1)).not.toThrow(); }
    });

    it('el reproductor se cierra con la rueda fuera de él, con Esc o con el menú, sin botón para cerrarlo (nmw40cp3jtit)', () => {
      expect(html).not.toContain('data-cerrar-popup');
      expect(js).toContain("addEventListener('wheel'");
      expect(js).toContain('passive: false');
      expect(js).toContain("e.key === 'Escape'");
      expect(js).toContain('    seleccionado = -1;\n');
    });
  });

  describe('(d) el movimiento y el camino: sin estrellas, adornos ni postes, y más lento', () => {
    it('no hay estrellas ni fragmentos; la cámara va a la mitad de la velocidad de antes entre estaciones (nmw17rx07tit)', () => {
      expect(js).not.toMatch(/nEstrellas/);
      expect((js.match(/new THREE\.BufferGeometry\(/g) ?? []).length).toBe(1);   // solo el del cielo
      expect(js).not.toMatch(/GridHelper|const suelo\b/);   // el cielo reemplaza el suelo
      expect(js).not.toMatch(/const fragmentos|nFragmentos/);
      expect(js).toContain('(w - cur) * (arranque ? SUAVIZADO_ARRANQUE : suavizadoPara(w - cur))');
      expect(js).not.toContain('0.085;');
    });

    it('entre estaciones vecinas la cámara va a la mitad de la velocidad de antes (el doble de tiempo); un salto de dos o más sigue con la de antes (nmw5o26vdtit)', () => {
      const f = new Function(`${js.match(/const SUAVIZADO = [^\n]+\n/)?.[0]}${js.match(/const suavizadoPara = [^\n]+\n/)?.[0]}; return { SUAVIZADO, SUAVIZADO_SALTO, suavizadoPara };`)() as { SUAVIZADO: number; SUAVIZADO_SALTO: number; suavizadoPara: (d: number) => number };
      expect(f.SUAVIZADO).toBe(0.015 / 2);   // antes 0,015
      expect(f.suavizadoPara(1)).toBe(0.015 / 2);
      expect(f.suavizadoPara(-1)).toBe(0.015 / 2);
      expect(f.suavizadoPara(2)).toBe(f.SUAVIZADO_SALTO);
      expect(f.SUAVIZADO_SALTO).toBe(0.015);
      // Cuadros hasta cubrir el 95 % de una estación vecina: el doble que con la velocidad anterior
      const cuadros = (k: number) => Math.ceil(Math.log(0.05) / Math.log(1 - k));
      expect(cuadros(f.suavizadoPara(1)) / cuadros(0.015)).toBeGreaterThan(1.95);
      expect(cuadros(f.suavizadoPara(1)) / cuadros(0.015)).toBeLessThan(2.05);
    });

    it('«Empieza el recorrido» llega hasta la estación 1, donde la cámara se detiene (el mismo punto que su entrada del menú), en la mitad del tiempo (nmw6xuro1tit)', () => {
      const f = new Function(`${js.match(/const SUAVIZADO = [^\n]+\n/)?.[0]}${js.match(/const SUAVIZADO_ARRANQUE = [^\n]+\n/)?.[0]}; return { SUAVIZADO, SUAVIZADO_ARRANQUE };`)() as { SUAVIZADO: number; SUAVIZADO_ARRANQUE: number };
      // Cuadros hasta llegar (a LLEGADA, 0,12, de la estación): la mitad que un paso entre estaciones vecinas
      const cuadros = (k: number) => Math.ceil(Math.log(0.12) / Math.log(1 - k));
      const razon = cuadros(f.SUAVIZADO_ARRANQUE) / cuadros(f.SUAVIZADO);
      expect(razon).toBeGreaterThan(0.48);
      expect(razon).toBeLessThan(0.52);
      // El clic no sigue el enlace (caía al borde de arriba del bloque): va al ancla de la estación 1, como el menú
      const manejo = js.slice(js.indexOf("document.querySelector('.entrada .bajar')?.addEventListener('click'"), js.indexOf('// «¿Qué es STL?» y «Empieza el recorrido», arriba de la portada'));
      expect(manejo).toContain('e.preventDefault();');
      expect(manejo).toContain('arranque = true;');
      expect(manejo).toContain("scrollTo({ top: anclas[1], behavior: quieto ? 'auto' : 'smooth' });");
      expect(manejo).toContain('relojes.forEach((_, k) => empezarEstacion(k));');
      // La rueda o la llegada lo apagan: el resto del recorrido sigue a su paso de siempre
      expect(js).toContain("addEventListener('wheel', () => { ultimaRueda = performance.now(); arranque = false; }, { passive: true });");
      expect(js).toContain('if (arranque && Math.abs(cur - 1) <= LLEGADA / 4) arranque = false;');
    });

    it('un anillo dorado entero, con su halo, alrededor de la línea unos metros antes de cada estación desde la 2, que la cámara cruza sin que nada le tape la vista (pd_estaciones_decoradas, nmw6z9v94tit, nmw727omntit)', () => {
      const radio = Number(js.match(/const ARCO_RADIO = ([\d.]+), ARCO_ANTES = ([\d.]+);/)?.[1]);
      const antes = Number(js.match(/const ARCO_RADIO = [\d.]+, ARCO_ANTES = ([\d.]+);/)?.[1]);
      // La cámara va a 1,4 del centro de la línea y a la altura de ALTURA_CAMARA: pasa por dentro del arco, con aire
      const altura = Number(js.match(/const ALTURA_CAMARA = ([\d.]+);/)?.[1]);
      expect(Math.hypot(1.4, altura)).toBeLessThan(radio - 0.8);
      // Antes de la parada (la cámara se detiene 7,5 detrás de su estación): lo cruza al llegar y no queda a la vista al detenerse
      expect(antes).toBeGreaterThan(0.02);
      expect(antes).toBeLessThan(0.06);
      // Entero (cerrado) y con su halo tenue, aditivo
      expect(js).toContain('const formaArco = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(circulo, true), 144, 0.05, 8, true);');
      expect(js).toContain('const formaHaloArco = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(circulo, true), 144, 0.24, 8, true);');
      expect(js).toContain('for (const u of [...ANILLOS_ENTRADA, ...lugaresDeAnillos(PARADA, antesDeLlegar)]) {\n    const { p, lado } = marco(u);');
      // On a phone the arrival ring goes before where the camera stops once it pulls back to fit the station, with 3 of air
      // (nmw87ytm7tit: it stopped just before the last ring, which blocked the station); on a computer, ARCO_ANTES
      expect(js).toContain('if (!movil) return ARCO_ANTES;');
      expect(js).toContain('return Math.max(ARCO_ANTES, ((7.5 + s) * alejar - s + 3) / LARGO_LINEA);');
      // From station 2 on, the phone camera pulls back along the line itself, at its usual height and side, so it stays
      // inside every ring (nmw8aqna1tit: pulling back toward what it looks at lifted it above the rings' radius); and it
      // pulls back exactly what antesDeLlegar assumes, so it stops 3 past the arrival ring
      expect(js).toContain('if (k >= 2) posicion = pose(uLinea - ((ancho - 1) * cerca * (7.5 + 0.022 * LARGO_LINEA)) / LARGO_LINEA).posicion;');
      const sDeLlegar = 0.022, largo = 380, alejarMax = 2.2;
      const camaraDetras = 7.5 + (alejarMax - 1) * (7.5 + sDeLlegar * largo);
      const anilloDetras = (7.5 + sDeLlegar * largo) * alejarMax - sDeLlegar * largo + 3;
      expect(anilloDetras - camaraDetras).toBeCloseTo(3, 9);
      expect(js).not.toContain('medioCirculo');
    });

    it('the tour starts standing in front of the line, on every screen, crosses three entrance rings and opens to station 1; the 3→4 framing is measured from station 3 (nmw84v293tit, nmw84xwcrtit)', () => {
      const parada = JSON.parse(js.match(/const PARADA = (\[[^\]]+\]);/)?.[1] ?? '[]') as number[];
      const antes = Number(js.match(/const ARCO_RADIO = [\d.]+, ARCO_ANTES = ([\d.]+);/)?.[1]);
      const { entradaDeAnillos, lugaresDeAnillos } = new Function(`${js.match(/const ANILLOS_POR_TRAMO = [^\n]+\n/)?.[0]}${js.match(/function lugaresDeAnillos\([^)]*\) \{[\s\S]*?\n\}/)?.[0]}${js.match(/function entradaDeAnillos\([^)]*\) \{[\s\S]*?\n\}/)?.[0]}; return { entradaDeAnillos, lugaresDeAnillos };`)() as { entradaDeAnillos: (p: number[], a: number) => { nace: number; anillos: number[]; paso: number }; lugaresDeAnillos: (p: number[], a: number) => number[] };
      const { nace, anillos: entrada, paso } = entradaDeAnillos(parada, antes);
      const sale = Number(js.match(/const U_SALE = ([\d.]+);/)?.[1]);
      expect(js).toContain('const { nace: U_NACE, anillos: ANILLOS_ENTRADA } = entradaDeAnillos(PARADA, ARCO_ANTES);');
      expect(entrada).toHaveLength(3);
      // Ahead of where the camera is born, before it opens to the side, and all before station 1
      for (const u of entrada) { expect(u).toBeGreaterThan(nace); expect(u).toBeLessThan(sale); expect(u).toBeLessThan(parada[0]); }
      // Much further back (nmw85pz2mtit): the gap before the first ring and between the entrance rings is the ring gap of
      // stations 1 and 2, the last one «antes» before station 1, and from the start to station 1 the same as from 1 to 2
      const [primero] = lugaresDeAnillos(parada, antes);
      expect(paso).toBeCloseTo(primero - parada[0], 10);
      expect(entrada[0] - nace).toBeCloseTo(paso, 10);
      expect(entrada[1] - entrada[0]).toBeCloseTo(paso, 10);
      expect(entrada[2] - entrada[1]).toBeCloseTo(paso, 10);
      expect(entrada[2]).toBeCloseTo(parada[0] - antes, 10);
      expect(parada[0] - nace).toBeCloseTo(parada[1] - parada[0], 10);
      expect(nace).toBeLessThan(0);
      // Before 0 the line goes on straight backwards, and it is drawn from there
      expect(js).toContain('const puntoEn = (u) => u >= 0 ? camino.getPointAt(Math.min(u, 1)) : NACE_P.clone().addScaledVector(NACE_T, u * LARGO_LINEA);');
      expect(js).toContain('const p = puntoEn(u), t = tangenteEn(u);');
      expect(js).toContain('puntoEn(INICIO_LINEA + (k / 200) * (FIN_LINEA - INICIO_LINEA))');
      // It opens to the side only once the camera (7.5 behind its point) has crossed the third ring, with 1.5 of air
      // (nmw87ytm7tit), and on a phone it pulls back only while it opens, never back behind that ring
      expect(js).toContain('const U_CRUCE = ANILLOS_ENTRADA[ANILLOS_ENTRADA.length - 1] + 9 / LARGO_LINEA;');
      expect(js).toContain('const b = masSuave(tope((w - W_CRUCE) / (1 - W_CRUCE)));');
      expect(js).toContain("const cerca = suave(tope(1 - Math.abs(w - k) / 0.5)) * (w < 1 ? giroEntrada : 1);");
      // No side view at the start any more: the camera begins on the line
      expect(js).not.toContain('INTRO_POS');
      expect(js).toContain('({ posicion, mira } = pose(lerp(U_NACE, U_SALE_ENTRADA, e)));');
      // Leaving station 3, the framing is measured from it, still, and fades out by 0.4, like the one of station 2
      expect(js).toContain('const cerca = suave(tope(1 - Math.abs(w - 3) / (w > 3 ? 0.4 : 0.6)));');
      expect(js).toContain('const cam = w > 3 ? ponerCamaraEn(2) : camara;');
      expect(js).toContain('const c = aPantalla(focos[2], ancho, alto, cam)');
    });

    it('on a phone: each station fits the width, a soft stop at each one, the card as a small pill at the bottom, the ring names to touch, no scrollbar (pd_telefono_vertical, pieces 2 and 5)', () => {
      const html = readFileSync(join(raiz, 'docs/difusion/mundo-3d.html'), 'utf8');
      // The camera moves back only where the view is narrower than a computer's
      const alejar = new Function('THREE', 'tope', 'camara', `const ANCHO_VISTA = ${js.match(/const ANCHO_VISTA = ([\d.]+)/)?.[1]}, ALEJAR_MAX = ${js.match(/ALEJAR_MAX = ([\d.]+);/)?.[1]}; ${js.match(/const alejarPorAncho = [^\n]+\n/)?.[0]} return alejarPorAncho();`) as (t: unknown, f: (k: number) => number, c: { fov: number; aspect: number }) => number;
      const three = { MathUtils: { degToRad: (d: number) => (d * Math.PI) / 180 } };
      const tope = (k: number) => Math.max(0, Math.min(1, k));
      expect(alejar(three, tope, { fov: 55, aspect: 1440 / 900 })).toBe(1);
      expect(alejar(three, tope, { fov: 68, aspect: 390 / 844 })).toBeGreaterThan(1.8);
      expect(alejar(three, tope, { fov: 68, aspect: 360 / 780 })).toBeLessThanOrEqual(2.2);
      expect(html).toContain('scroll-snap-type: y proximity;');
      expect(html).toContain('scroll-snap-align: center; scroll-snap-stop: always;');
      expect(html).toContain('html { scrollbar-width: none; }');
      expect(html).toContain('html::-webkit-scrollbar { display: none; }');
      // The card, a pill at the bottom and centered, a little wider than its button: never full width or vertically
      // centered (nmw86ofbytit, which replaces the full-width panel of nmw7yh2tntit)
      const telefono = html.slice(html.indexOf('/* La tarjeta de cada estación, una píldora abajo'), html.indexOf('/* Los siete nombres del anillo'));
      expect(telefono).toContain('.js-3d .tarjeta.corta { width: auto; max-width: calc(100vw - 24px);');
      expect(telefono).toContain('border-radius: 28px; flex-direction: row;');
      expect(telefono).not.toContain('width: 100%');
      expect(html).toContain('.js-3d .estacion { justify-content: center; align-items: flex-end; }');
      expect(html).not.toContain('border-radius: 18px 18px 0 0;');
      expect(html).not.toContain('.js-3d .estacion { justify-content: center; flex-direction: column; align-items: center; }');
      expect(js).toContain("nombresAnillo.className = 'nombres-anillo';");
      expect(js).toContain('b.addEventListener(\'click\', () => alternarProblema(i));');
      // The names sit just above the station's panel, away from the ring's and the line's icons (nmw8ahxg4tit)
      expect(js).toContain('nombresAnillo.style.top = `${Math.round(Math.max(60, limite))}px`;');
      // A new width (another phone, a turn) keeps the tour where it was, so its card and names stay (nmw8ahxg4tit)
      expect(js).toContain("const iba = anclas.length && fijo === null && anchoMedido !== innerWidth ? objetivo() : null;");
      expect(js).toContain("if (Math.abs(destino - y) > 1) scrollTo({ top: destino, behavior: 'instant' });");
      // «Next problem ›» at the end of every problem, on computers too and without closing by itself (nmw8b5l2atit), in a
      // cycle: after the last one, the first, and none leads to «Getting started» (nmw8cmckvtit, which replaces nmw8b4l91tit)
      const fuente = js.match(/const siguienteDe = \(i\) => \{[\s\S]*?\n {2}\};/)?.[0] ?? '';
      expect(fuente).not.toBe('');
      const GUIA = Number(js.match(/const GUIA = (\d+);/)?.[1]);
      const hacer = (orbes: unknown[]) => new Function('GUIA', 'problemas', 'orbes', `${fuente}; return siguienteDe;`)(GUIA, orbes, orbes) as (i: number) => number;
      const siete = hacer(Array.from({ length: 7 }, () => ({})));
      expect([0, 1, 2, 3, 4, 5, 6].map(siete)).toEqual([1, 2, 3, 4, 5, 6, 0]);
      expect(siete(GUIA)).toBe(-1);
      expect(siete(-1)).toBe(-1);
      // A problem without its icon is skipped
      expect(hacer([{}, null, {}])(0)).toBe(2);
      expect(hacer([{}, null, {}])(2)).toBe(0);
      expect(js).not.toContain("L('Cómo empezar ›', 'Getting started ›')");
      expect(js).toContain('if (s >= 0) abrirProblema(s);');
      expect(js).not.toContain('if (movil) autocierre.repetir();');
      expect(html).toContain('@media (min-width: 901px) {\n    .js-3d .popup .siguiente-clip:not([hidden]) { display: inline-flex;');
      // «What is STL» on the 1360 laptop: the four speeds always on one line (nmw8alvfatit)
      const linea = readFileSync(join(raiz, 'docs/difusion/linea-del-proyecto.html'), 'utf8');
      expect(linea).toContain('#todo.mando-fuera #velocidad { flex-wrap: nowrap; gap: 2px; }');
    });

    it('three golden rings in every gap after station 1, evenly spaced, the last one just before the next stop; none before station 1 (nmw74wypntit)', () => {
      const { lugaresDeAnillos } = new Function(`${js.match(/const ANILLOS_POR_TRAMO = [^\n]+\n/)?.[0]}${js.match(/function lugaresDeAnillos\([^)]*\) \{[\s\S]*?\n\}/)?.[0]}; return { lugaresDeAnillos };`)() as { lugaresDeAnillos: (p: number[], a: number) => number[] };
      const parada = JSON.parse(js.match(/const PARADA = (\[[^\]]+\]);/)?.[1] ?? '[]') as number[];
      const antes = Number(js.match(/const ARCO_RADIO = [\d.]+, ARCO_ANTES = ([\d.]+);/)?.[1]);
      const lugares = lugaresDeAnillos(parada, antes);
      expect(lugares).toHaveLength(3 * (parada.length - 1));
      // None before station 1: every ring is past the first stop
      for (const u of lugares) expect(u).toBeGreaterThan(parada[0]);
      for (let k = 1; k < parada.length; k++) {
        const tramo = lugares.slice((k - 1) * 3, k * 3);
        // The arrival ring, as before, «antes» before its stop; and every ring inside its own gap
        expect(tramo[2]).toBeCloseTo(parada[k] - antes, 10);
        for (const u of tramo) { expect(u).toBeGreaterThan(parada[k - 1]); expect(u).toBeLessThan(parada[k]); }
        // The same distance between them (the curve is walked by its length: getPointAt)
        const pasos = [tramo[0] - parada[k - 1], tramo[1] - tramo[0], tramo[2] - tramo[1]];
        for (const d of pasos) expect(d).toBeCloseTo(pasos[0], 10);
      }
      expect(js).toContain('const { p, lado } = marco(u);\n    const hacia = new THREE.Vector3().crossVectors(lado, ARRIBA).normalize();');
    });

    it('station 2 ring in color from afar, gray on arrival until each one is opened; station 1 emblem with its halo, growing into view and without a name over the Studio (t_decide_anillo_lejos, nmw74wypntit, nmw5eregptit, nmw766nyutit)', () => {
      const { lejania } = new Function(`const tope = (k) => Math.max(0, Math.min(1, k)); const suave = (k) => k * k * (3 - 2 * k); const tramo = (p, a, b) => suave(tope((p - a) / (b - a))); ${js.match(/const lejania = [^\n]+\n/)?.[0]} return { lejania };`)() as { lejania: (d: number, c: number, l: number) => number };
      expect(lejania(10, 22, 48)).toBe(0);
      expect(lejania(60, 22, 48)).toBe(1);
      expect(lejania(35, 22, 48)).toBeGreaterThan(0);
      expect(lejania(35, 22, 48)).toBeLessThan(1);
      // The camera stops about 16 from the ring's centre: gray there, as before; colored from 48 on
      const cerca = Number(js.match(/const COLOR_CERCA = (\d+), COLOR_LEJOS = (\d+);/)?.[1]);
      expect(cerca).toBeGreaterThan(16);
      expect(js).toContain('if (visto) tono.copy(o.color); else tono.copy(gris).lerp(o.color, deLejos);');
      expect(js).toContain('const deLejos = lejania(camara.position.distanceTo(anillo.centro), COLOR_CERCA, COLOR_LEJOS);');
      // Station 1: the halo behind its three actors, growing as the camera comes near; no name over the «STL Studio» label
      expect(js).not.toContain('nombreUno');
      expect(js).not.toContain('rotulo(T.uno');
      expect(js).toContain('const lejos = lejania(camara.position.distanceTo(CENTRO_EMBLEMA), EMBLEMA_CERCA, EMBLEMA_LEJOS);');
      // It follows the camera every frame, also with reduced motion (it is not animated by itself)
      expect(js).toContain('marcar(cur);\n    segunLejania.forEach((f) => f());\n    if (!quieto) {');
    });

    it('lo que flota junto a la línea nunca queda detrás del menú flotante, de 1350 a 1920 de ancho (nmw6z8b3btit)', () => {
      const { apartarDelMenu, AIRE_MENU } = new Function(`${js.match(/const AIRE_MENU = [^\n]+\n/)?.[0]}${js.match(/function apartarDelMenu\([^)]*\) \{[\s\S]*?\n\}/)?.[0]}; return { apartarDelMenu, AIRE_MENU };`)() as {
        apartarDelMenu: (c: Caja2, m: Caja2, ancho: number, alto: number) => { dx: number; dy: number }; AIRE_MENU: number;
      };
      type Caja2 = { x: number; y: number; w: number; h: number };
      const cruza = (a: Caja2, b: Caja2) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      // Lo que no toca el menú no se mueve
      expect(apartarDelMenu({ x: 200, y: 200, w: 180, h: 160 }, { x: 1700, y: 340, w: 200, h: 210 }, 1920, 890)).toEqual({ dx: 0, dy: 0 });
      // El menú como lo pone la página (mundo-3d.html: fijo a 16 px de la derecha y al centro de la altura, con «ES · EN»
      // encima): unos 200 × 210 px. Las referencias, con sus rótulos, de unos 200 × 240 px en una pantalla de 1920 y en
      // proporción en las demás; se barren por todo el borde derecho, también encima del menú, como en la captura del titular
      for (const [ancho, alto] of [[1350, 640], [1366, 650], [1366, 768], [1600, 780], [1920, 890], [1920, 1080]]) {
        const menu = { x: ancho - 16 - 205, y: alto / 2 - 105, w: 205, h: 210 };
        const escala = ancho / 1920, w = 200 * escala + 40, h = Math.min(240 * escala + 20, alto / 2 - 60);
        for (let x = ancho - 420; x <= ancho - w; x += 10) for (let y = 0; y <= alto - h; y += 10) {
          const caja = { x, y, w, h };
          const { dx, dy } = apartarDelMenu(caja, menu, ancho, alto);
          const nueva = { x: x + dx, y: y + dy, w, h };
          const conAire = { x: menu.x - AIRE_MENU + 1, y: menu.y - AIRE_MENU + 1, w: menu.w + 2 * AIRE_MENU - 2, h: menu.h + 2 * AIRE_MENU - 2 };
          expect(cruza(nueva, conAire), `${ancho} × ${alto}: la caja en (${x}, ${y}) queda detrás del menú`).toBe(false);
          expect(nueva.x, `${ancho} × ${alto}: sale por la izquierda`).toBeGreaterThanOrEqual(0);
          expect(nueva.y, `${ancho} × ${alto}: sale por arriba`).toBeGreaterThanOrEqual(0);
          expect(nueva.x + nueva.w).toBeLessThanOrEqual(ancho);
          expect(nueva.y + nueva.h).toBeLessThanOrEqual(alto);
          const aireEntero = { x: menu.x - AIRE_MENU, y: menu.y - AIRE_MENU, w: menu.w + 2 * AIRE_MENU, h: menu.h + 2 * AIRE_MENU };
          if (!cruza(caja, aireEntero)) expect({ dx, dy }).toEqual({ dx: 0, dy: 0 });
        }
      }
      // Si toca el menú, se corre a su misma altura hasta quedar sobre la línea, sin pisar la pantalla de la estación ni nada
      // más, y no sube hacia arriba de la pantalla (nmw7160d0tit). Medidas de 1360 × 768, con la cámara quieta en la estación
      // 3: la línea en x ≈ 676, la pantalla de 449 a 596
      const menu1360 = { x: 1360 - 16 - 205, y: 768 / 2 - 105, w: 205, h: 210 };
      const pantalla1360 = { x: 449, y: 335, w: 147, h: 140 };
      const columna1360 = { x: 1000, y: 296, w: 330, h: 211 };
      const sobre = apartarDelMenu(columna1360, menu1360, 1360, 768, 676 - 1030, [pantalla1360]);
      expect(sobre).toEqual({ dx: 676 - 1030, dy: 0 });
      expect(cruza({ ...columna1360, x: columna1360.x + sobre.dx }, pantalla1360)).toBe(false);
      // Si sobre la línea pisaría la pantalla, se corre solo lo justo para salir del menú, y sigue a su altura
      const justo = apartarDelMenu(columna1360, menu1360, 1360, 768, -500, [pantalla1360]);
      expect(justo).toEqual({ dx: menu1360.x - AIRE_MENU - (columna1360.x + columna1360.w), dy: 0 });
      // Y con la línea y otra pieza en cualquier lugar, nunca queda detrás del menú ni sobre lo que evita
      for (const [ancho, alto] of [[1350, 640], [1366, 768], [1920, 1080]]) {
        const menu = { x: ancho - 16 - 205, y: alto / 2 - 105, w: 205, h: 210 };
        const otra = { x: ancho / 2 - 260, y: alto / 2 - 60, w: 150, h: 140 };
        for (const linea of [-600, -300, -150, -40, null]) for (let x = ancho - 420; x <= ancho - 240; x += 20) for (let y = 0; y <= alto - 220; y += 20) {
          const caja = { x, y, w: 240, h: 200 };
          const { dx, dy } = apartarDelMenu(caja, menu, ancho, alto, linea, [otra]);
          const nueva = { x: x + dx, y: y + dy, w: 240, h: 200 };
          expect(cruza(nueva, { x: menu.x - AIRE_MENU + 1, y: menu.y - AIRE_MENU + 1, w: menu.w + 2 * AIRE_MENU - 2, h: menu.h + 2 * AIRE_MENU - 2 })).toBe(false);
          expect(nueva.x).toBeGreaterThanOrEqual(0);
          if (dy === 0 && dx) expect(cruza(nueva, otra), `${ancho}: (${x}, ${y}) con la línea a ${linea}`).toBe(false);
        }
      }
      expect(js).toContain('const pide = enSuLugar ? apartarDelMenu(enSuLugar, menu, ancho, alto, haciaLaLinea(ancho, alto), evitar) : { dx: 0, dy: 0 };');
      expect(js).toContain('const evitar = [cajaEnPantalla(como3d.pantalla, ancho, alto)];');
      expect(js).toContain('Object.assign(como3d, { linea: p.clone(), figura: flecha });');
      // Y el recorrido lo aplica en cada cuadro a la columna de la estación 3 (flecha, carpeta, terminal y sus rótulos)
      expect(js).toContain("const menuEntero = document.querySelector('.menu');");
      expect(js).toContain('encuadrarDos(w);\n    apartarColumna();');
      expect(js.match(/enColumna\(enEscena\(/g)).toHaveLength(4);
    });

    it('la cámara nunca mira hacia abajo: lo que mira nunca queda bajo ella, en ninguna vista del recorrido (nmw5o26vdtit)', () => {
      const f = new Function(`${js.match(/const sinMirarAbajo = [^\n]+\n/)?.[0]}; return { sinMirarAbajo };`)() as { sinMirarAbajo: (p: { x: number; y: number; z: number }, m: { x: number; y: number; z: number }) => { x: number; y: number; z: number } };
      const posicion = { x: 3, y: 2.8, z: -40 };
      expect(f.sinMirarAbajo(posicion, { x: 3, y: 0.9, z: -60 })).toEqual({ x: 3, y: 2.8, z: -60 });   // mira al piso: se nivela
      expect(f.sinMirarAbajo(posicion, { x: 3, y: 5, z: -60 }).y).toBe(5);   // mirar arriba, sí
      for (let y = -10; y <= 10; y += 0.5) expect(f.sinMirarAbajo(posicion, { x: 0, y, z: -60 }).y).toBeGreaterThanOrEqual(posicion.y);
      // Y colocar() lo aplica a toda vista: la entrada, la portada de la estación 1 y el camino
      expect(js).toContain('const ojo = sinMirarAbajo(posicion, mira);\n    camara.lookAt(ojo.x, ojo.y, ojo.z);');
      expect(js.match(/camara\.lookAt\(/g)).toHaveLength(1);
    });

    describe('el cielo de estrellas (nmw5erxrytit, nmw5es4cgtit, nmw5es6twtit, nmw5gvj21tit, nmw5iur8itit, nmw5mkt58tit)', () => {
      const cielo = js.slice(js.indexOf('const CIELO_SEMILLA'), js.indexOf('// Sin suelo: bajo la línea'));
      const capas = [...cielo.matchAll(/\{ n: (\d+), radio: (\d+), sigue: ([\d.]+),/g)].map((m) => ({ n: Number(m[1]), radio: Number(m[2]), sigue: Number(m[3]) }));

      it('tres capas, con muchísimas más estrellas que las 280 de antes (más de 1500; en un teléfono, la mitad), lejos (varias veces los 28 entre estaciones) y un solo Points por capa (nmw5o26vdtit)', () => {
        expect(capas).toHaveLength(3);
        const total = capas.reduce((s, c) => s + c.n, 0);
        expect(total).toBeGreaterThanOrEqual(1500);
        expect(total).toBeLessThanOrEqual(4000);
        expect(cielo).toContain('Math.round(capa.n * (movil ? 0.5 : 1))');
        for (const c of capas) { expect(c.radio).toBeGreaterThanOrEqual(28 * 5); expect(c.radio).toBeLessThan(600); }
        expect(cielo).toContain('banda: true');
        expect(cielo).toContain('new THREE.Points(geo, mat)');
        expect(cielo).toContain('geo.boundingSphere = new THREE.Sphere(');
        // Paralaje con la cámara, en el bucle de siempre
        expect(js).toContain('c.puntos.position.copy(camara.position).multiplyScalar(c.sigue)');
      });

      it('the parallax goes 25% faster, with the same stars, and the nebula carries a very faint tint of real nebulae (nmw753vdutit)', () => {
        expect(cielo).toContain('const PARALAJE_CIELO = 1.25;');
        expect(cielo).toContain('return { puntos, sigue: 1 - (1 - capa.sigue) * PARALAJE_CIELO };');
        // Every layer still stays behind the camera less than it follows it (sigue between 0 and 1)
        for (const c of capas) { const sigue = 1 - (1 - c.sigue) * 1.25; expect(sigue).toBeGreaterThan(0.8); expect(sigue).toBeLessThan(1); }
        const arcoiris = Number(cielo.match(/const NEBULOSA_ARCOIRIS = ([\d.]+);/)?.[1]);
        expect(arcoiris).toBeGreaterThan(0);
        expect(arcoiris).toBeLessThanOrEqual(0.35);   // only a hint: it does not compete with what is in front
        expect(cielo).toContain('tinte = mix(tinte, arcoiris, ${NEBULOSA_ARCOIRIS.toFixed(2)});');
        // It only tints the clouds that were there: the brightness still comes from the same density
        expect(cielo).toContain('vec3 color = base + tinte * (0.34 * denso + 0.16 * velo) * (0.55 + 0.45 * a);');
      });

      it('semilla fija: mulberry32 con una constante, sin Math.random, y sin dorado', () => {
        expect(cielo).toMatch(/const CIELO_SEMILLA = 0x[0-9a-f]+;/);
        expect(cielo).toContain('const cieloAzar = mulberry32(CIELO_SEMILLA);');
        expect(cielo).not.toContain('Math.random');
        expect(cielo).not.toMatch(/\bORO\b|\bLINEA\b|\bLUZ\b|#f5d27a|#ffcf5a|#ffe7b8|#fff6d8/i);
        for (const c of cielo.match(/'#[0-9a-f]{6}'/gi) ?? []) {
          const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i + 1, i + 3), 16));
          expect(b).toBeGreaterThanOrEqual(r);   // blancos fríos o azules
          expect(b).toBeGreaterThanOrEqual(g);
        }
      });

      it('una de cada diez titila (con la semilla), con ciclo de 3 a 6 s, y con movimiento reducido ninguna', () => {
        expect(cielo).toContain('TITILA = 1 / 10');
        expect(cielo).toContain('CICLO_MIN = 3, CICLO_MAX = 6');
        expect(cielo).toContain('const titila = cieloAzar() < TITILA;');
        expect(cielo).toContain('CICLO_MIN + cieloAzar() * (CICLO_MAX - CICLO_MIN)');
        expect(cielo).toContain('BRILLO_MIN = 0.35');
        expect(cielo).toContain('nmw5mkt58tit');
        // Sin movimiento reducido: el shader no varía nada (uMueve 0) y el tiempo no avanza
        expect(cielo).toContain('uMueve: { value: quieto ? 0 : 1 }');
        expect(cielo).toContain('aCiclo > 0.0 && uMueve > 0.5');
        expect(js).toContain('if (!quieto) cieloUniformes.uTiempo.value = ahoraMs / 1000;');
        // Sin un bucle nuevo: el cielo va en el cuadro() de siempre (el tercero lo despierta tras el reposo del teléfono, y
        // el cuarto, con ?ver=N, al primer toque: nmw8kg745tit)
        expect((js.match(/requestAnimationFrame\(cuadro\)/g) ?? []).length).toBe(4);
        expect(js.match(/requestAnimationFrame\(/g) ?? []).toHaveLength(4);
      });

      it('detrás de las estrellas, un fondo de nebulosa suave: una esfera por dentro que acompaña a la cámara, procedural y con semilla fija, igual mire donde mire (nmw5o26vdtit)', () => {
        expect(cielo).toContain('const nebulosa = new THREE.Mesh(');
        expect(cielo).toContain('new THREE.SphereGeometry(NEBULOSA_RADIO');
        expect(cielo).toContain('side: THREE.BackSide');
        expect(cielo).toMatch(/const NEBULOSA_SEMILLA = [\d.]+;/);
        expect(cielo).toContain('NEBULOSA_RADIO = 500');   // dentro del plano lejano de la cámara (600)
        expect(js).toContain('new THREE.PerspectiveCamera(55, 1, 0.1, 600)');
        // Ruido sobre la dirección (sin costuras ni polos), sin imágenes ni azar: el mismo fondo en todas las direcciones
        expect(cielo).toContain('vec3 d = normalize(vDir);');
        expect(cielo).toContain('float nube(vec3 p)');
        expect(cielo).not.toContain('Math.random');
        expect(cielo).not.toContain('TextureLoader');
        // Va detrás de todo, sin niebla, y no se anima: con movimiento reducido es igual
        expect(cielo).toContain('nebulosa.renderOrder = -20;');
        expect(cielo).toContain('fog: false');
        expect(cielo).not.toMatch(/nebulosa[^;]*uTiempo/);
        expect(js).toContain('nebulosa.position.copy(camara.position);');
        // Conserva lo aprobado: el resplandor bajo la línea y la una de cada diez que titila
        expect(js).toContain('const brilloBajoLaLinea');
        expect(cielo).toContain('TITILA = 1 / 10');
      });

      it('el suelo ya no está: queda un resplandor suave sin bordes duros bajo la línea', () => {
        // Con su propio nombre: «resplandor» ya es la función del halo de los actores, y repetirlo rompía el recorrido entero
        expect(js).toContain('const brilloBajoLaLinea = (() => {');
        expect(js).toContain("g.addColorStop(1, 'rgba(255, 207, 90, 0)')");
      });

      it('el archivo se compila: ningún nombre declarado dos veces en el mismo lugar (el error que dejaba la página en negro)', () => {
        const cuerpo = js.replace(/^import .*$/gm, '').replace(/^export /gm, '');
        const Asincrona = Object.getPrototypeOf(async function () {}).constructor as new (codigo: string) => unknown;
        expect(() => new Asincrona(`"use strict";\n${cuerpo}`)).not.toThrow();
      });
    });

    it('entre las estaciones 1 y 2 solo queda la línea, que late: sin postes ni bolitas de colores (nmw76cwtctit)', () => {
      expect(js).not.toContain('CylinderGeometry');
      expect(js).not.toContain('const poste');
      expect(js).not.toContain('faroles');
      expect(js).not.toContain('TubeGeometry(curva, 48');
      expect(js).not.toContain('bolitas');
      expect(js).not.toContain('COLORES_TIPO');
      expect(js).toContain('halo.opacity = 0.18 + 0.08 * Math.sin(t * 1.2) ** 2;');
    });

    it('los tipos de nota llevan los colores del Studio', () => {
      const estilos = readFileSync(join(raiz, 'estudio/src/estilos.css'), 'utf8');
      const delStudio = Object.fromEntries([...estilos.matchAll(/--lv-(\w+): (#[0-9a-f]{6});/g)].map((m) => [m[1], m[2]]));
      const tipos = js.match(/const COLOR_TIPO = \{([^}]+)\};/)?.[1] ?? '';
      const enLaPagina = Object.fromEntries([...tipos.matchAll(/(\w+): '(#[0-9a-f]{6})'/g)].map((m) => [m[1], m[2]]));
      expect(Object.keys(enLaPagina).length).toBeGreaterThanOrEqual(6);
      for (const [tipo, color] of Object.entries(enLaPagina)) expect(delStudio[tipo]).toBe(color);
      // Lo que le entregas al Studio en la estación 1, también
      expect(js).toContain('brillo(COLOR_TIPO[tipo], 0.8)');
    });
  });

  describe('(e) la animación en grande', () => {
    it('«▶ Ver la animación» la agranda; el botón «← Volver al recorrido» la cierra', () => {
      expect(html.match(/data-ver-animacion/g)).toHaveLength(1);
      expect(html).toContain('<span class="volver-largo">← Volver al recorrido</span><span class="volver-x" aria-hidden="true">✕</span></button>');
      expect(js).toContain("visor?.querySelector('[data-cerrar-visor]')?.addEventListener('click', cerrarVisor);");
    });

    it('on a phone or a touch screen, only «✕» closes it and «Esc also goes back» is hidden (nmw86aqe2tit)', () => {
      expect(html).toContain('aria-label="Volver al recorrido"');
      expect(js).toContain("'Volver al recorrido': 'Back to the tour',");
      expect(html).toContain('<span class="visor-esc">Esc también vuelve</span>');
      const telefono = html.slice(html.indexOf('@media (max-width: 900px), (pointer: coarse) {\n    .visor .volver'));
      expect(telefono).toContain('.visor .volver-largo, .visor-barra .visor-esc { display: none; }');
      expect(telefono).toContain('.visor .volver-x { display: inline; }');
      expect(html).toContain('.volver-x { display: none; }');
    });

    it('ocupa casi toda la pantalla pero deja libre el ancho del menú de la derecha', () => {
      const visor = html.match(/\.visor \{[^}]*\}/)?.[0] ?? '';
      expect(visor).toContain('top: 5vh; bottom: 5vh');
      expect(visor).toContain('right: var(--menu-ancho)');
      expect(visor).toMatch(/z-index: 12/);   // por debajo del menú (15)
      expect(html).toMatch(/\.menu \{[^}]*z-index: 15/);
      // El menú fijo de la derecha cabe en el ancho que se deja libre
      expect(Number(html.match(/--menu-ancho: (\d+)px/)?.[1])).toBeGreaterThanOrEqual(250);
    });

    it('Esc, el desplazamiento o el menú la cierran y la persona queda donde estaba (no se mueve el scroll)', () => {
      expect(js).toContain("e.key === 'Escape' && (cerrarVisor() || cerrarPopup())");
      expect(js).toContain("addEventListener('wheel', (e) => { if (cerrarVisor() || cerrarPopup()) e.preventDefault(); }, { passive: false });");
      expect(js).toContain("addEventListener('touchmove'");
      expect(js).toContain("enlaces.forEach((a) => a.addEventListener('click', cerrarVisor));");
      expect(js).toContain("visorIframe.removeAttribute('src');");
      // Funciona sin WebGL: se conecta antes de mirar si hay 3D
      expect(js.indexOf("data-ver-animacion")).toBeLessThan(js.indexOf('if (lienzo && estaciones.length && hayWebGL())'));
    });
  });

  describe('(e) «Cómo funciona» y «Lo que ya trae» salieron del recorrido (nmw3xje22tit, nmw40cp3jtit, nmw40fizktit)', () => {
    it('sin su estación, su menú, su lienzo, su voz ni su código', () => {
      expect(html).not.toContain('e-como-funciona');
      expect(html).not.toContain('funciona-clip');
      expect(html).not.toContain('data-repetir-funciona');
      expect(js).not.toMatch(/FUNCIONA|pintarFunciona|iniciarFunciona|giro3/);
      expect(js).not.toMatch(/"f(\d+-\d+|-c)":/);   // ni su pista de tiempos
      const textos = JSON.parse(readFileSync(join(raiz, 'docs/difusion/voz/es/textos.json'), 'utf8')) as Record<string, unknown>;
      expect(Object.keys(textos).filter((k) => /^f(\d+-\d+|-c)$/.test(k))).toEqual([]);
      expect(existsSync(join(raiz, 'docs/difusion/voz/es/f1-1.mp3'))).toBe(false);
    });
  });

  describe('(f) «¿Reemplaza a otros métodos?» salió del recorrido (nmw47ga2wtit: en su lugar irá «Cómo empezar», pd_como_empezar)', () => {
    it('no está en el menú ni en el cierre del tramo', () => {
      expect(html).not.toContain('¿Reemplaza a otros métodos?</span>');
      expect(html.match(/<nav class="menu"[\s\S]*?<\/nav>/)?.[0]).not.toMatch(/[Rr]eemplaza/);
      // Con «La documentación» en el recorrido, el final ya no anuncia otro tramo
      expect(html).not.toContain('Aquí termina este tramo del recorrido');
    });
  });

  describe('(g) los ajustes del 5 de noviembre: la estación 1 en el visor y la estación 2 con íconos de un color', () => {
    it('el título de la animación va arriba a la derecha del visor, en los dos idiomas (nmw479zmetit)', () => {
      expect(html).toContain('<h2 class="visor-titulo" data-titulo-visor>¿Qué es STL?: <span>El guardrail donde más hacía falta, en el Dev</span></h2>');
      expect(html).toMatch(/\.visor-barra \.visor-titulo \{ margin: 0 6px 0 auto;/);
      expect(js).toMatch(/es: \{[^}]*visor: '¿Qué es STL\?: <span>El guardrail donde más hacía falta, en el Dev<\/span>'/);
      expect(js).toMatch(/en: \{[^}]*visor: 'What is STL\?: <span>/);
      expect(js).toContain('if (tituloVisor) tituloVisor.innerHTML = T.visor;');
    });

    it('cada ícono, de un solo color con el blanco, con la paleta de las notas, distinto por problema; gris hasta el ratón o el clic (nmw46qjootit)', () => {
      const colores = js.match(/const COLOR_TIPO = \{[^\n]*\};/)?.[0] ?? '';
      const bloque = js.match(/const VERDE_DICTADO = [\s\S]*?\nfunction enColor[\s\S]*?\n\}\n/)?.[0] ?? '';
      const { COLOR_PROBLEMA, GRIS_PROBLEMA, COLOR_TIPO, enColor } = new Function(`${colores}${bloque} return { COLOR_PROBLEMA, GRIS_PROBLEMA, COLOR_TIPO, enColor };`)() as { COLOR_PROBLEMA: string[]; GRIS_PROBLEMA: string; COLOR_TIPO: Record<string, string>; enColor: (i: number, sobre: number, sel: number, vistos: Set<number>) => boolean };
      expect(COLOR_PROBLEMA).toHaveLength(7);
      expect(new Set(COLOR_PROBLEMA).size).toBe(7);
      for (const c of COLOR_PROBLEMA.slice(0, 6)) expect(Object.values(COLOR_TIPO)).toContain(c);
      // El séptimo, el micrófono del dictado: el verde de las entregas, más claro que el de «Con STL» (nmw4it925tit)
      const luz = (h: string) => [1, 3, 5].reduce((s, k) => s + parseInt(h.slice(k, k + 2), 16), 0);
      expect(luz(COLOR_PROBLEMA[6])).toBeGreaterThan(luz(COLOR_TIPO.entrega));
      expect(parseInt(COLOR_PROBLEMA[6].slice(3, 5), 16)).toBeGreaterThan(parseInt(COLOR_PROBLEMA[6].slice(1, 3), 16));   // verde
      expect(COLOR_PROBLEMA).not.toContain(GRIS_PROBLEMA);
      // Gris al llegar; su color con el ratón encima, abierto o ya abierto antes
      expect(enColor(2, -1, -1, new Set())).toBe(false);
      expect(enColor(2, 2, -1, new Set())).toBe(true);
      expect(enColor(2, -1, 2, new Set())).toBe(true);
      expect(enColor(2, -1, -1, new Set([2]))).toBe(true);
      // Los materiales: el del ícono empieza gris y el de apoyo es blanco; ya no se vuelven verdes ni hay caja negra
      expect(js).toContain("const mat = brillo(GRIS_PROBLEMA, 0.2), apoyo = brillo('#ffffff', 0.3);");
      expect(js).not.toContain('pintarVerde');
      expect(js).not.toContain("color: '#2b2826', emissive: '#2b2826'");
      expect(js).toContain('const visto = enColor(i, sobre, seleccionado, resueltos);');
    });

    it('cada ícono es un interruptor: otro clic en el abierto lo cierra, y uno en otro cierra el que estaba y abre ese (nmw46tffetit)', () => {
      const alternar = js.match(/function alternarProblema\(i\) \{[\s\S]*?\n {2}\}/)?.[0] ?? '';
      expect(alternar).toContain('if (seleccionado === i) cerrarPopup();');
      expect(alternar).toContain('else abrirProblema(i);');
      expect(js).toContain('const i = bajoElPuntero(e);\n    if (i >= 0) alternarProblema(i);\n    else if (sobreLaPantalla(e))');
      expect(js).toContain("d.querySelector('summary')?.addEventListener('click', (e) => { e.preventDefault(); alternarProblema(i); })");
    });

    it('el clip «sin explicarle al modelo a qué parte te refieres» se rehízo con Kai, con su indicación de tono y su pista (nmw46qjootit)', () => {
      const textos = JSON.parse(readFileSync(join(raiz, 'docs/difusion/voz/es/textos.json'), 'utf8')) as Record<string, { texto: string; ms: number; entonacion?: string }>;
      expect(textos['s4-6'].texto).toBe('sin explicarle al modelo a qué parte te refieres');
      expect(textos['s4-6'].entonacion).toContain('no es una pregunta');
      expect(js).toContain(`"s4-6":${textos['s4-6'].ms}`);
      expect(existsSync(join(raiz, 'docs/difusion/voz/es/s4-6.mp3'))).toBe(true);
    });
  });

  it('la cámara se detiene en las cuatro estaciones, con «Cómo empezar» y «La documentación», y ?ver=N no pasa de la última', () => {
    expect(js).toContain('const PARADA = [0.1, 0.42, 0.7, 0.9];');
    expect(js).toContain('Math.min(estaciones.length,');
    expect(html.match(/<article class="estacion/g)).toHaveLength(4);
  });

  it('el texto se lee sin JavaScript y el lienzo no lo leen los lectores de pantalla', () => {
    expect(html).toContain('<div class="escenario" aria-hidden="true"><canvas id="mundo"></canvas></div>');
    expect(html).toContain('<a class="saltar" href="#fin">Saltar el recorrido</a>');
    // La animación en grande carga solo al abrirla
    expect(html).toContain('<iframe data-src="linea-del-proyecto.html"');
    // Con movimiento reducido, nada se anima: la cámara salta y el recuadro se pinta una vez, ya en su último cuadro
    expect(js).toContain('cur = quieto ? Math.round(w)');
    expect(js).toContain('if (quieto && ctxClip) { pintarClip(ctxClip, i, duraClip(i)); }');
  });

  it('un teléfono abre el recorrido directo; solo el lento queda cubierto, sin versión simple ni botón para pasar (nmw7y7d0ktit, nmw7yb1bttit)', () => {
    const cubierta = html.match(/<div class="cubierta-movil"[\s\S]*?<\/div>\n<\/div>/)?.[0] ?? '';
    expect(cubierta).toContain('role="dialog"');
    expect(cubierta).toContain('Tu teléfono es demasiado lento para este recorrido');
    expect(cubierta).toContain('Te invitamos a verlo en un computador o en un teléfono más rápido.');
    expect(cubierta).not.toContain('<button');
    expect(js).not.toContain('data-cerrar-cubierta');
    // Escondida siempre; solo con «lenta», que pone cubrirLento, y ya no por el ancho de la pantalla
    expect(html).toContain('.cubierta-movil { display: none; }');
    expect(html).toMatch(/\.cubierta-movil\.lenta \{ position: fixed; inset: 0; z-index: 30;/);
    expect(html).not.toContain('(pointer: coarse) and (orientation: portrait)');
    expect(js).toContain("document.getElementById('cubierta-movil')?.classList.add('lenta');");
    // Sin WebGL en un teléfono, o con pocos cuadros por segundo en sus primeros segundos, y ?lento para revisarlo
    expect(js).toContain('} else if (movil && lienzo && estaciones.length) cubrirLento();');
    expect(js).toContain('const FPS_MINIMO = 20, MS_MEDIR_FPS = 3000;');
    expect(js).toContain('if (fps < FPS_MINIMO) return cubrirLento();');
    expect(js).toContain("if (new URLSearchParams(location.search).has('lento')) cubrirLento();");
    expect(js).toContain('if (!enVista || cubierto) return;');
    // Sus textos, en los dos idiomas
    expect(js).toContain("'Tu teléfono es demasiado lento para este recorrido': 'Your phone is too slow for this tour',");
    expect(js).toContain("'Te invitamos a verlo en un computador o en un teléfono más rápido.': 'We invite you to see it on a computer or on a faster phone.',");
  });

  it('en un teléfono, el menú es un solo botón que despliega las estaciones y «ES · EN»; en el computador no cambia (nmw7yg7m2tit)', () => {
    const nav = html.match(/<nav class="menu"[\s\S]*?<\/nav>/)?.[0] ?? '';
    expect(nav).toContain('<button type="button" class="menu-boton" data-menu-boton aria-expanded="false" aria-controls="menu-estaciones" aria-label="Las estaciones y el idioma">☰</button>');
    expect(nav).toContain('<ol id="menu-estaciones">');
    // El botón solo existe en pantallas angostas; plegado, ni las estaciones ni el idioma se ven
    expect(html).toContain('.menu-boton { display: none; }');
    const angosta = html.slice(html.indexOf('.menu-boton { display: none; }'));
    expect(angosta).toMatch(/@media \(max-width: 900px\) \{\s*\.js-3d \.menu \{ position: fixed; top: 0; right: 0; left: auto;/);
    expect(angosta).toContain('.js-3d .menu:not(.abierto) .idioma, .js-3d .menu:not(.abierto) ol { display: none; }');
    expect(angosta).toContain('width: 48px; height: 48px;');
    expect(angosta).toContain('env(safe-area-inset-top)');
    expect(html).toContain('viewport-fit=cover');
    expect(js).toContain("menuBoton?.addEventListener('click', () => plegarMenu(!menuNav.classList.contains('abierto')));");
    expect(js).toContain("document.querySelectorAll('.menu ol a').forEach((a) => a.addEventListener('click', () => plegarMenu(false)));");
    expect(js).toContain("'Las estaciones y el idioma': 'The stations and the language',");
    // El computador sigue igual: el menú a la derecha, de arriba abajo
    expect(html).toContain('.js-3d .menu { position: fixed; top: 50%; right: 16px; transform: translateY(-50%); padding: 0; }');
    // Y el mundo descansa cuando nada se mueve, a no más de 1,25 veces la pantalla
    expect(js).toContain('renderer.setPixelRatio(Math.min(devicePixelRatio, movil ? 1.25 : 1.75));');
    expect(js).toContain('const MS_REPOSO = 20000;');
    expect(js).toContain('enReposo = true;');
  });

  it('el mundo arranca al final del módulo, cuando ya existen todas sus constantes (si no, la página queda sin 3D)', () => {
    const arranque = js.lastIndexOf('if (lienzo && estaciones.length && hayWebGL())');
    for (const m of js.matchAll(/^const (\w+)/gm)) expect(m.index!).toBeLessThan(arranque);
    expect(js.indexOf('iniciar();')).toBeGreaterThan(arranque);
  });
});

// La estación 3, «Cómo empezar» (pd_como_empezar), y el séptimo problema, el dictado (pd_dictado), con sus guiones
// confirmados el 6 de noviembre de 2026 (nmw4f5xg4tit, nmw4f8wietit) y lo que decidió el titular en su lote
describe('«Cómo empezar» y el dictado (pd_como_empezar, pd_dictado)', () => {
  const colores = js.match(/const ORO = [^\n]+\nconst VERDE = [^\n]+\n/)?.[0] ?? '';
  const dibujo = js.slice(js.indexOf('// ── Las mini animaciones de los problemas'), js.indexOf('function iniciar() {'));
  const nada = () => undefined;
  let textos: string[] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (o, k) => k in o ? o[k as string] : k === 'fillText' ? (texto: string) => { textos.push(texto); } : k === 'measureText' ? () => ({ width: 60 }) : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop: nada }) : nada,
    set: (o, k, v) => { o[k as string] = v; return true; },
  });
  type Paso = { k: number; n: number; enCierre: boolean; clave: string; texto: string };
  const f = new Function('ctx', `${colores}${dibujo}; return { GUIA, GUION_COMO, PEDIDOS_COMO, ENLACE_COMO, VENTANA_COMO, pintarClip, duraClip, pasoDeClip, clavesDelGuion, clavesDeClip, tramoDeVoz, escenaSeg, PASOS_SEG, CIERRES, GRANDES, ENUNCIADOS, PISTA_VOZ_ES };`)(ctx) as {
    GUIA: number; GUION_COMO: { escenas: string[]; cierre: string }; PEDIDOS_COMO: Record<number, string>; ENLACE_COMO: string; VENTANA_COMO: string;
    pintarClip: (c: unknown, i: number, t: number) => void; duraClip: (i: number) => number; pasoDeClip: (i: number, t: number) => Paso; clavesDelGuion: (i: number) => string[]; clavesDeClip: (i: number) => string[];
    tramoDeVoz: (i: number, t: number) => unknown; escenaSeg: (k: number) => number; PASOS_SEG: { problema: [number, string][]; solucion: [number, string][] }[]; CIERRES: [string, string][]; GRANDES: number[][]; ENUNCIADOS: string[]; PISTA_VOZ_ES: Record<string, number>;
  };

  it('«Cómo empezar» es la estación 3, con su nombre en el menú, y sin 3D se leen sus siete pasos, lo que se le pide al modelo y el enlace al README', () => {
    const tres = html.match(/<article class="estacion tres" id="e-como-empezar">[\s\S]*?<\/article>/)?.[0] ?? '';
    expect(tres).not.toBe('');
    expect(html.indexOf('id="e-como-empezar"')).toBeGreaterThan(html.indexOf('id="e-te-ha-pasado"'));
    const pasos = [...tres.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1].replace(/<[^>]+>/g, ''));
    expect(pasos).toHaveLength(7);
    f.GUION_COMO.escenas.forEach((escena, k) => expect(pasos[k].startsWith(escena.replace(/ la documentación\.$/, '')), escena).toBe(true));
    // Lo que se le pide al modelo, como ejemplo en texto, no como orden para copiar (nmw56hkz8tit)
    for (const pedido of Object.values(f.PEDIDOS_COMO)) expect(tres).toContain(`Por ejemplo, en Claude Code: <q class="ejemplo-como">${pedido}</q>`);
    expect(tres).not.toContain('<code>');
    expect(tres).toContain(`href="${f.ENLACE_COMO}"`);
    expect(tres).toContain(f.GUION_COMO.cierre);
    // Con 3D, solo su botón «Cómo empezar» (nmw6p0g7htit); la lista queda para quien no tiene 3D
    expect(tres).toContain('data-ver-como>Cómo empezar</button>');
    expect(html).toContain('.js-3d .lista-como { display: none; }');
  });

  it('una sola tarjeta para todas las estaciones: «Cómo empezar» y la frase de la 2 usan la clase de la estación 1, con el mismo botón; ninguna repite su título (nmw5o26vdtit)', () => {
    const tarjetas = [...html.matchAll(/<div class="tarjeta([^"]*)">/g)].map((m) => m[1]);
    expect(tarjetas).toEqual([' corta', ' corta', ' corta', ' corta']);
    const tres = html.match(/<article class="estacion tres" id="e-como-empezar">[\s\S]*?<\/article>/)?.[0] ?? '';
    // Su título, solo para quien lee sin 3D: con 3D la tarjeta es solo el botón (nmw6p0g7htit)
    expect(tres).toContain('<h2 class="sin-3d" data-titulo-tres>Cómo empezar</h2>');
    expect(html).toContain('.js-3d .tarjeta .sin-3d { display: none; }');
    expect(tres).toContain('<div class="acciones"><button type="button" class="boton-ver ver-como" data-ver-como>Cómo empezar</button></div>');
    expect(tres).not.toContain('class="eyebrow"');
    expect(tres).not.toContain('linea-dos');
    expect(html).toContain('<div class="acciones"><a class="boton-ver" href="linea-del-proyecto.html" data-ver-animacion');
    // Ningún título de tarjeta se repite dentro de la misma tarjeta (ni eyebrow + h2 iguales)
    for (const t of html.matchAll(/<div class="tarjeta corta">([\s\S]*?)<\/div>\s*<\/article>/g)) {
      const titulos = [...t[1].matchAll(/<(?:h2|p class="eyebrow")[^>]*>([^<]+)/g)].map((m) => m[1].trim());
      expect(new Set(titulos).size).toBe(titulos.length);
    }
    // En inglés también, por el diccionario: un título por tarjeta y el botón en el mismo formato
    const dic = js.match(/const TEXTOS = \{([\s\S]*?)\n\};/)?.[1] ?? '';
    expect(dic).toContain("uno: 'What is STL', tres: 'Getting started',");
    expect(dic).toContain("uno: 'Qué es STL', tres: 'Cómo empezar',");
    expect(dic).not.toContain('verComo');
    // Los botones dicen el nombre de su estación, en los dos idiomas
    expect(js).toContain("for (const [marca, texto] of [['[data-titulo-tres]', T.tres], ['[data-texto-ver]', T.uno], ['[data-ver-como]', T.tres]]) {");
  });

  it('«Cómo empezar» tiene su escena de instalar, sin nada que orbite: la pantalla flotante que se ve desde lejos, la descarga y la barra que se llena (nmw5wbs86tit, que reemplaza el anillo de nmw5o26vdtit)', () => {
    const bloque = js.slice(js.indexOf('// ── Estación 3, «Cómo empezar» (pd_como_empezar): el camino'), js.indexOf('// ── La cámara: arriba'));
    expect(bloque).toContain('const u = SITIO[2];');
    // Nada gira alrededor de la línea
    expect(bloque).not.toContain('PIEZAS_COMO');
    expect(bloque).not.toMatch(/RADIO_[XY]3|GIRO_ANILLO3|moverAnilloComo/);
    // La pantalla, más chica, a la izquierda, y tres referencias pequeñas a la instalación en columna a la derecha, sin la barra
    // de carga que pisaba la pantalla ni el haz alto (nmw6lwwbxtit)
    for (const parte of ['// 1 · La pantalla flotante', '// 2 · Tres referencias pequeñas a la instalación']) expect(bloque).toContain(parte);
    expect(bloque).not.toMatch(/const (riel|relleno|haz) =/);
    expect(bloque).toContain('enEscena(pantallaComo, -3.4, 2.4, 0.6);');
    expect(bloque).toContain("resplandor('90, 209, 255', CIAN, 6).halo");
    expect(bloque).toContain('Object.assign(como3d, { pantalla: pantallaComo, brillo: brilloPantalla });');
    // La misma pantalla se oprime, crece en el reproductor (que nace de ella) y se encoge de vuelta al irse
    expect(js).toContain('else if (sobreLaPantalla(e)) { guia.visita = true; abrirComo(); }');
    expect(js).toContain('origenPopup = dondeEstaLaPantalla();');
    expect(js).toContain('if (popup && eraGuia && !quieto) encogerHaciaLaPantalla();');
    expect(js).toContain('como3d.pantalla.visible = como3d.brillo.visible = !(seleccionado === GUIA || como3d.volviendo);');
    // La columna: cada referencia con aire de las otras (sus alturas, de arriba abajo, y su medio alto ya escalado)
    expect(bloque).toContain('enColumna(enEscena(flecha, COLUMNA, 4.2));');
    expect(bloque).toContain('enColumna(enEscena(carpeta, COLUMNA, 2.6));');
    expect(bloque).toContain('enColumna(enEscena(terminal, COLUMNA, 1));');
    const ESCALA = 1.35, flechaAbajo = 4.2 - 0.16 - 0.48 * ESCALA, carpetaArriba = 2.6 + 0.32 * ESCALA, carpetaAbajo = 2.6 - 0.24 * ESCALA, terminalArriba = 1 + 0.29 * ESCALA;
    expect(flechaAbajo - carpetaArriba).toBeGreaterThan(0.3);
    expect(carpetaAbajo - terminalArriba).toBeGreaterThan(0.3);
    // La pantalla (3,3 de ancho, en −3,4) y la columna (en 3,4) no se acercan
    expect(3.4 - 0.55 - (-3.4 + 1.65)).toBeGreaterThan(4);
    expect(bloque).toContain('animar.push(deEstacion(2, moverEscenaComo));');
    // El bucle de la instalación, en la pantalla de pie (nmw6xq68htit): su lienzo dentro del marco, el ▶ chico en su esquina,
    // el poste y la base debajo, que llegan a la línea sin cruzarla, y la referencia que nombra se enciende sin moverse
    expect(bloque).toContain('new THREE.PlaneGeometry(2.96, 1.72)');
    expect(2.96).toBeLessThan(3.12);
    expect(1.72).toBeLessThan(1.82);
    expect(bloque).toContain('play.position.set(1.32, -0.66, 0.09);');
    expect(1.32 + 0.38 * 0.42).toBeLessThan(3.12 / 2);
    expect(bloque).toContain('pantallaComo.add(marcoLuz, panel, pantallaBucle, play, pieDePantalla, base);');
    // El poste va del borde de abajo de la pantalla (−1) a la base, y la base queda sobre la línea (2,4 − 2,32 − 0,04 ≥ 0)
    expect(-1.66 + 1.32 / 2).toBeCloseTo(-1, 6);
    expect(2.4 - 2.32 - 0.04).toBeGreaterThanOrEqual(0);
    // La base (1,1 de ancho, en −3,4) no llega a la columna de la derecha (en 3,4) ni a la línea (en 0)
    expect(-3.4 + 0.55).toBeLessThan(-1);
    expect(bloque).toContain('if (cuadro !== cuadroBucle) { cuadroBucle = cuadro; tiempoBucle = dibujarBucle(s); }');
    expect(bloque).toContain('carpeta.children[0].material.emissiveIntensity = 0.4 + 0.15 * Math.sin(s * 1.2) + luz(1);');
    // Con movimiento reducido, la pantalla muestra el último cuadro del bucle, quieto
    expect(bloque).toContain('dibujarBucle(quieto ? BUCLE_SEG * (BUCLE_TIEMPOS - 1) + BUCLE_SEG - 0.01 : 0);');
    // Sus tres tiempos se llaman como las tres referencias, en los dos idiomas (nmw6u5bqttit)
    expect(js).toContain("const ROTULOS_BUCLE = () => [L('Descárgalo', 'Download it'), L('Tu carpeta', 'Your folder'), L('Pídeselo a tu agente', 'Ask your agent')];");
    expect(js).toContain("descargalo: 'Descárgalo', tuCarpeta: 'Tu carpeta', pideAgente: 'Pídeselo a tu agente'");
    expect(js).toContain("descargalo: 'Download it', tuCarpeta: 'Your folder', pideAgente: 'Ask your agent'");
    expect(bloque).not.toContain('seleccionado');
    expect(bloque).not.toContain('Math.random');
    expect(js).toContain('const relojes = [null, null, null, null];');
  });

  it('en un teléfono, «La documentación» cubre la pantalla, con «✕» (y Esc) para cerrarla, y abre siempre en «Instalar» (nmw86lki4tit, nmw8cshdztit)', () => {
    const cuatro = html.match(/<article class="estacion cuatro" id="e-documentacion">[\s\S]*?<\/article>/)?.[0] ?? '';
    expect(cuatro).toMatch(/<div class="doc-arriba">\s*<button type="button" class="cerrar-doc" data-cerrar-doc aria-label="Cerrar la documentación">✕<\/button>\s*<div class="doc-pestanas"/);
    expect(html).toContain('.cerrar-doc { display: none; }');
    const telefono = html.slice(html.indexOf('«La documentación» en un teléfono'));
    expect(telefono).toContain('.js-3d .documentacion { inset: 0; width: auto; max-width: none; max-height: none;');
    expect(telefono).toContain('z-index: 26;');
    expect(telefono).toContain('.js-3d .cerrar-doc { display: grid;');
    expect(telefono).toContain('.js-3d:has(.estacion.actual .documentacion.abierta) .menu { display: none; }');
    expect(js).toContain("cerrarDoc?.addEventListener('click', cerrarLectorDoc);");
    expect(js).toContain("if (e.key === 'Escape') cerrarLectorDoc();");
    expect(js).toContain("cerrarDoc?.setAttribute('aria-label', 'Close the documentation');");
    expect(js).toContain('if (abre) elegirPestana(0);');
  });

  it('en un teléfono, un cielo más liviano: la mitad de las estrellas y la nebulosa pintada una vez en un cubo, que cada cuadro solo lee (nmw86moqgtit)', () => {
    expect(js).toContain('Math.round(capa.n * (movil ? 0.5 : 1))');
    expect(js).toContain('defines: { OCTAVAS: 5 },');
    const rama = js.slice(js.indexOf('if (movil) {\n    const cuboCielo'), js.indexOf('escena.add(nebulosa);'));
    expect(rama).toContain('new THREE.WebGLCubeRenderTarget(512)');
    expect(rama).toContain('new THREE.CubeCamera(1, 1000, cuboCielo).update(renderer, soloCielo);');
    expect(rama).toContain('textureCube(uCubo, normalize(vDir))');
    expect(rama).toContain('side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false');
  });

  it('«La documentación», la última estación: su «▶» abre la tarjeta de texto en la pestaña de instalar, con tres pestañas cortas, y la línea termina en su libro abierto (nmw76dn24tit, nmw76dxyhtit, nmw76f854tit)', () => {
    const cuatro = html.match(/<article class="estacion cuatro" id="e-documentacion">[\s\S]*?<\/article>/)?.[0] ?? '';
    expect(cuatro).toContain('<button type="button" class="boton-ver ver-doc" data-ver-doc aria-controls="documentacion" aria-expanded="false">▶ La documentación</button>');
    expect([...cuatro.matchAll(/role="tab"[^>]*>([^<]+)</g)].map((m) => m[1])).toEqual(['Instalar', 'Glosario', 'Método']);
    expect(js).toContain("pestanas: ['Install', 'Glossary', 'Method']");
    expect(js).toContain('if (abre) elegirPestana(0);');
    expect(html).toContain('.js-3d .estacion.actual .documentacion.abierta { display: block; }');
    // Instalar: los tres pasos del README y la guía en el idioma de la página (nmw73ypystit)
    const pasosReadme = (archivo: string) => (readFileSync(join(raiz, archivo), 'utf8').match(/\n1\. [\s\S]*?\n3\. [^\n]+/)?.[0] ?? '').trim().split('\n').map((l) => l.replace(/^\d\. /, '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'));
    const pasosEs = [...cuatro.matchAll(/<li>(<strong>[\s\S]*?)<\/li>/g)].map((m) => m[1].replace(/<[^>]+>/g, ''));
    expect(pasosEs).toEqual(pasosReadme('README.es.md'));
    const pasosEn = (new Function(`return ${js.match(/ {2}pasos: (\[`[\s\S]*?'\]),\n/)?.[1].replace(/\$\{REPO\}/g, 'R') ?? '[]'};`)() as string[]).map((p) => p.replace(/<[^>]+>/g, ''));
    expect(pasosEn).toEqual(pasosReadme('README.md'));
    expect(cuatro).toContain('/blob/main/INSTALAR.md');
    expect(js).toContain('`${REPO}/blob/main/INSTALL.md`');
    // El glosario: los textos del «?» del Studio, en el orden del ciclo (palabras.ts › GLOSARIO), cada palabra con su enlace
    const orden = ['mision', 'revision', 'buzon', 'director', 'memoria', 'dispersion', 'ruta', 'fase', 'puerta', 'propuesta', 'pedido', 'linea'];
    expect(readFileSync(join(raiz, 'estudio/src/palabras.ts'), 'utf8')).toContain(`export const GLOSARIO = [${orden.map((p) => `'${p}'`).join(', ')}] as const;`);
    const textos = (idioma: string) => readFileSync(join(raiz, `estudio/src/textos/${idioma}.ts`), 'utf8');
    const palabra = (idioma: string, id: string, campo: string) => textos(idioma).match(new RegExp(`'palabra\\.${id}\\.${campo}': '([^']+)'`))?.[1];
    const glosarioEs = [...cuatro.matchAll(/<dt><a href="[^"]+metodologia\.es\.md#[^"]+"[^>]*>([^<]+)<\/a><\/dt><dd>([^<]+)<\/dd>/g)].map((m) => [m[1], m[2]]);
    expect(glosarioEs).toEqual(orden.map((id) => [palabra('es', id, 'nombre'), palabra('es', id, 'frase')]));
    const glosarioEn = js.match(/ {2}glosario: \[([\s\S]*?)\]\],\n\};/)?.[1] ?? '';
    const entradasEn = [...glosarioEn.matchAll(/\['([^']+)', '([^']+)', (\d)/g)].map((m) => [m[1], m[2]]);
    expect(entradasEn).toEqual(orden.map((id) => [palabra('en', id, 'nombre'), palabra('en', id, 'frase')]));
    // El método: solo los títulos de sus seis partes, con su enlace en el idioma de la página (nmw76ej5vtit, nmw728gogtit)
    const titulos = (archivo: string) => [...readFileSync(join(raiz, archivo), 'utf8').matchAll(/^## \d\. (.+)$/gm)].map((m) => m[1].trim());
    expect([...cuatro.matchAll(/metodologia\.es\.md#\d[^"]*"[^>]*>([^<]+)<\/a><\/li>/g)].map((m) => m[1])).toEqual(titulos('docs/metodo/metodologia.es.md'));
    expect([...js.matchAll(/\['#\d-[a-z-]+', '([^']+)'\]/g)].map((m) => m[1])).toEqual(titulos('docs/metodo/metodologia.md'));
    // Cada ancla en inglés es la que GitHub le da a su título («## 3. The roadmap» › #3-the-roadmap, pd_idioma_repositorio)
    const anclaDeGitHub = (n: number, titulo: string) => `#${n}-${titulo.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ /g, '-')}`;
    expect([...js.matchAll(/\['(#\d-[a-z-]+)', '[^']+'\]/g)].map((m) => m[1])).toEqual(titulos('docs/metodo/metodologia.md').map((t, i) => anclaDeGitHub(i + 1, t)));
    // La línea termina en el libro: se dibuja hasta FIN_LINEA, que es el lugar de la estación, y el libro empieza ahí
    expect(js).toContain('const FIN_LINEA = 0.922;');
    expect(0.9 + 0.022).toBeCloseTo(0.922, 9);
    expect(js).toContain('new THREE.TubeGeometry(trazo, 1400, 0.11, 10, false)');
    expect(js).not.toContain('new THREE.TubeGeometry(camino, 1400');
    // Raised toward the arriving camera, like on a lectern, and larger, its bottom edge where the line ends (nmw8aqna1tit)
    expect(js).toContain("libro.rotation.set(-INCLINA_LIBRO, Math.atan2(t.x, t.z), 0, 'YXZ');");
    const inclina = Number(js.match(/const INCLINA_LIBRO = ([\d.]+), ESCALA_LIBRO = ([\d.]+);/)?.[1]);
    const escala = Number(js.match(/const INCLINA_LIBRO = [\d.]+, ESCALA_LIBRO = ([\d.]+);/)?.[1]);
    expect(inclina).toBeGreaterThan(0.7);
    expect(inclina).toBeLessThan(1.3);
    expect(escala).toBeGreaterThan(1.2);
    expect(js).toContain('libro.position.copy(p).addScaledVector(t, medioLibro * Math.cos(INCLINA_LIBRO) - 0.1)');
    expect(js).toContain("const haloLibro = resplandor('255, 214, 140', ORO, 9 * ESCALA_LIBRO).halo;");
  });

  it('su guion es el confirmado, tal como está: siete escenas y su cierre, ocho clips de Kai (nmw4f5xg4tit), con la ventana «Claude Code» (nmw4irns1tit) y sus ejemplos de lo que se pide (nmw56hkz8tit)', () => {
    expect(f.GUION_COMO.escenas).toEqual([
      '¿Quieres probar el Studio ahora? Así se empieza.',
      'Primero, tráelo a tu computador: clona el repositorio, o descárgalo desde GitHub.',
      'Ponlo en la carpeta donde quieras trabajar.',
      'Para tu tranquilidad, pídele primero a tu modelo un escaneo de seguridad: que confirme que no trae nada malicioso.',
      'Después, pídele que lo instale.',
      'Desde ahí, el Studio te guía paso a paso.',
      'Si te queda alguna duda, consulta la documentación.',
    ]);
    expect(f.GUION_COMO.cierre).toBe('Listo: ya estás en marcha.');
    expect(f.PEDIDOS_COMO).toEqual({ 3: 'Revisa este repositorio y dime si trae algo malicioso antes de instalarlo', 4: 'Inicializa STL Studio' });
    expect(f.VENTANA_COMO).toBe('Claude Code');
    expect(f.ENLACE_COMO).toBe('https://github.com/ARGWABOT/STL-Sacred_Time_Line#readme');
    expect(f.clavesDelGuion(f.GUIA)).toEqual(['como-1', 'como-2', 'como-3', 'como-4', 'como-5', 'como-6', 'como-7', 'como-c']);
  });

  it('se dibuja en el reproductor de principio a fin, escena por escena, con su rótulo igual a su voz y su cierre', () => {
    textos = [];
    const claves: string[] = [];
    for (let t = 0; t <= f.duraClip(f.GUIA) + 0.5; t += 0.2) {
      expect(() => f.pintarClip(ctx, f.GUIA, t)).not.toThrow();
      const p = f.pasoDeClip(f.GUIA, t);
      if (claves.at(-1) !== p.clave) claves.push(p.clave);
    }
    expect(claves).toEqual(f.clavesDelGuion(f.GUIA));
    for (const x of ['Cómo empezar', '1 de 7', '7 de 7', 'Claude Code', 'GitHub', 'tu computador', 'nada malicioso', 'tu primera misión', 'Listo: ya estás en marcha.']) expect(textos, x).toContain(x);
    // Las escenas con su ejemplo de lo que se pide duran más, para alcanzar a leerlo
    expect(f.escenaSeg(3)).toBeGreaterThan(f.escenaSeg(2));
    expect(f.pasoDeClip(f.GUIA, f.duraClip(f.GUIA))).toMatchObject({ enCierre: true, clave: 'como-c' });
  });

  it('de pie, en el teléfono o la tableta de pie, también se dibuja en su cuadro de 9:16 (180 × 320), con la ventana de Claude Code angosta y alta (nmw8cs8bytit)', () => {
    // El lienzo de pie y el dibujo de pie sirven también a «Cómo empezar»; el computador (320 × 200) sigue con su dibujo de siempre
    expect(js).toContain('const esVertical = (i) => { if (i === GUIA) return true;');
    expect(js).toContain('const vertical = !!aparte && ctx.canvas?.height > ctx.canvas?.width && esVertical(i);');
    expect(js).toContain('if (i === GUIA) return void (vertical ? pintarComoVertical(ctx, k, q) : pintarComo(ctx, k, q, p));');
    expect(js).toContain('const v = seleccionado >= 0 && innerHeight > innerWidth && esVertical(seleccionado);');
    expect(js).toContain('const ESCENAS_COMO_VERTICAL = [');
    expect(js).toContain('ventana(c, 16, 22, 148, 100, VENTANA_COMO, CIAN);');
    // Se pinta con el lienzo de pie y la fila de arriba en HTML: ni la píldora, ni el rótulo, ni la barra van en el dibujo
    const dibujado: string[] = [], puestos: [string, number, number][] = [];
    const lienzo: Record<string, unknown> = { canvas: { width: 720, height: 1280 } };
    const vertical = new Proxy(lienzo, {
      get: (o, k) => k in o ? o[k as string] : k === 'fillText' ? (texto: string, x: number, y: number) => { dibujado.push(texto); puestos.push([texto, x, y]); } : k === 'measureText' ? () => ({ width: 60 }) : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop: nada }) : nada,
      set: (o, k, v) => { o[k as string] = v; return true; },
    });
    const fuera = { cuentas: new Set<string>(), subs: new Set<string>() };
    const g = new Function('ctx', 'fuera', `${colores}${dibujo}; aparte = { pildoras: (m, c) => fuera.cuentas.add(c), sub: (s) => fuera.subs.add(s) }; return { GUIA, pintarClip, duraClip, pasoDeClip, esVertical };`)(vertical, fuera) as { GUIA: number; pintarClip: (c: unknown, i: number, t: number) => void; duraClip: (i: number) => number; pasoDeClip: (i: number, t: number) => Paso; esVertical: (i: number) => boolean };
    expect(g.esVertical(g.GUIA)).toBe(true);
    for (let t = 0; t <= g.duraClip(g.GUIA) + 0.5; t += 0.2) expect(() => g.pintarClip(vertical, g.GUIA, t)).not.toThrow();
    // Su rótulo y su «k de 7» salen fuera del dibujo, en la fila de arriba y la franja de abajo del reproductor
    expect([...fuera.cuentas]).toEqual(expect.arrayContaining(['1 de 7', '7 de 7']));
    expect([...fuera.subs].filter(Boolean).length).toBeGreaterThanOrEqual(7);
    for (const x of ['Cómo empezar', '1 de 7', '7 de 7']) expect(dibujado, x).not.toContain(x);
    for (const x of ['Claude Code', 'GitHub', 'tu computador', 'nada malicioso', 'tu primera misión', 'Listo: ya estás en marcha.']) expect(dibujado, x).toContain(x);
    // Nada se sale del cuadro de 180 × 320 (el texto se ancla en x; el de la izquierda empieza dentro y el de al centro cae en la mitad)
    for (const [texto, x, y] of puestos) { expect(x, texto).toBeGreaterThanOrEqual(0); expect(x, texto).toBeLessThanOrEqual(180); expect(y, texto).toBeGreaterThan(0); expect(y, texto).toBeLessThanOrEqual(320); }
    // El pedido a Claude Code se parte en renglones (cada uno cabe en la ventana angosta) y no se corta
    expect(dibujado.join(' ')).toContain('Inicializa STL Studio');
  });

  it('se abre solo con el clic del visitante en «▶ Ver cómo empezar», nunca al llegar (nmw5wbs86tit)', () => {
    expect(js).not.toContain('else if (!guia.visita && Math.abs(w - 3) < 0.02');
    expect(js.match(/abrirComo\(\)/g)?.length).toBe(4);   // su definición, el clic de «▶ Ver cómo empezar», el de su pantalla 3D (nmw6lwwbxtit) y ?ver=3&abrir=como, solo para capturarlo (nmw6z8b3btit)
    expect(js).toContain("if (fijo !== null && abrirN === 'como') { guia.visita = true; abrirComo(); pantalla2.cam = 1; }");
    // Abierto así desde el visor de teléfonos, un toque lo despierta: la quietud de ?ver=N es solo para capturar sin
    // pantalla, y «▶ Empezar con voz» arranca la animación y su voz (nmw8kg745tit)
    const toque = js.slice(js.indexOf('let tocadaEnFijo = false'), js.indexOf('function cuadro()'));
    for (const ev of ['pointerdown', 'keydown', 'wheel', 'touchstart']) expect(toque).toContain(`'${ev}'`);
    expect(toque).toContain('if (quietaEnFijo) { quietaEnFijo = false; ultimoCuadro = performance.now(); requestAnimationFrame(cuadro); }');
    expect(js.indexOf('let tocadaEnFijo = false')).toBeGreaterThan(js.indexOf('ultimoCuadro = performance.now()'));
    expect(js).toContain("verComo?.addEventListener('click', () => { guia.visita = true; abrirComo(); });");
  });

  it('con los mandos de los problemas; si la voz no puede sonar, espera con «▶ Empezar con voz»; y no se cierra solo (nmw4ircrjtit, nmw4irz3etit, nmw4isbmktit)', () => {
    const recuadro = html.match(/<aside class="popup"[\s\S]*?<\/aside>/)?.[0] ?? '';
    expect(recuadro).toContain('<button type="button" class="empezar-voz" data-empezar-voz hidden>▶ Empezar con voz</button>');
    // Sin «Copiar»: el pedido va como ejemplo, en texto (nmw56hkz8tit)
    expect(recuadro).toContain('<span class="ejemplo-como" data-pedido-como hidden></span>');
    expect(recuadro).not.toContain('Copiar</button>');
    expect(js).not.toContain('data-copiar-como');
    expect(js).toContain('pedidoComo.textContent = pedido ? L(`Por ejemplo: «${pedido}»`, `For example: «${pedido}»`) : \'\';');
    // En la página en inglés, «Cómo empezar» sin español: su guion, lo que se le pide al modelo, sus rótulos y sus botones (nmw6r9827tit)
    const enIngles = js.match(/const GUION_COMO_EN = (\{[\s\S]*?\n\});/)?.[1] ?? '';
    const guionEn = new Function(`return ${enIngles};`)() as { escenas: string[]; cierre: string };
    expect(guionEn.escenas).toHaveLength(7);
    const espanol = /[ñ¿¡áéíóú]|\b(el|la|los|las|del|que|para|con|una|tu|paso|listo)\b/i;
    for (const frase of [...guionEn.escenas, guionEn.cierre]) expect(espanol.test(frase), frase).toBe(false);
    expect(js).toContain('if (COMO_EN) Object.assign(GUION_COMO, GUION_COMO_EN);');
    expect(js).toContain("if (COMO_EN) Object.assign(PEDIDOS_COMO, { 3: 'Review this repository and tell me whether it brings anything malicious before installing it', 4: 'Initialize STL Studio' });");
    const escenas = js.slice(js.indexOf('const ESCENAS_COMO = ['), js.indexOf('function pintarComo('));
    // Ningún rótulo de sus escenas queda solo en español: cada uno va con su par en inglés
    expect(escenas.match(/letrero\(c, '[^'?]*[a-záéíóúñ]{3}[^']*'/gi) ?? []).toEqual(["letrero(c, 'STL Studio'", "letrero(c, 'STL-Sacred_Time_Line'", "letrero(c, 'STL'", "letrero(c, 'STL'", "letrero(c, 'STL Studio'", "letrero(c, 'STL Studio'"]);
    // Con su voz en inglés, la gemela de Kai (nmw6xp1d1tit): cada escena y su cierre, con su mp3 en voz/en/, lo que dice su rótulo y su pista
    expect(js).toContain("if (vozEnIngles(clave)) return pistaVoz(clave) == null;");
    const pistaEn = JSON.parse(js.match(/const PISTA_VOZ_EN = (\{[^\n]*\});/)?.[1] ?? '{}') as Record<string, number>;
    const dichosEn = JSON.parse(readFileSync(join(raiz, 'docs/difusion/voz/en/textos.json'), 'utf8')) as Record<string, { texto: string; ms: number }>;
    [...guionEn.escenas, guionEn.cierre].forEach((texto, k) => {
      const clave = k < guionEn.escenas.length ? `como-${k + 1}` : 'como-c';
      expect(existsSync(join(raiz, `docs/difusion/voz/en/${clave}.mp3`)), clave).toBe(true);
      expect(dichosEn[clave]?.texto, clave).toBe(texto);
      expect(pistaEn[clave], clave).toBe(dichosEn[clave].ms);
    });
    expect(js).toContain("if (empezar) empezar.textContent = '▶ Start with voice';");
    expect(recuadro).toContain('data-enlace-como href="https://github.com/ARGWABOT/STL-Sacred_Time_Line#readme"');
    expect(js).toContain('if (conVoz && !quieto && !sinVozTodavia(claveDeComo(0)) && navigator.userActivation && !navigator.userActivation.hasBeenActive) alNoPoderSonar();');
    expect(js).toContain("if (e?.name === 'NotAllowedError') alNoPoderSonar();");
    expect(js).toContain('autocierre.abrir(); autocierre.repetir();   // no se cierra solo');
    expect(js).toContain('if (seleccionado >= 0 && Math.abs(cur - (seleccionado === GUIA ? 3 : 2)) > 0.45) cerrarPopup();');
    // El camino de la 2 a la 3, la línea sola (nmw4isvr9tit): sin nada nuevo entre las dos estaciones
    expect(js).toContain('focos.push(p.clone().addScaledVector(ARRIBA, 0.9));');
  });

  it('el dictado es el séptimo problema, con su guion confirmado (nmw4f8wietit), su micrófono y su voz de Kai', () => {
    expect(f.GRANDES[6]).toEqual([14]);
    // «cansa» en vez de «pereza», que Kai pronunciaba mal (nmw56lwtbtit), y «hablas como hablarías», ampliado con el texto
    // que dictó el titular (nmw56n724tit)
    expect(f.PASOS_SEG[14].problema.map(([, t]) => t)).toEqual(['Tienes la idea clara en la cabeza,', 'pero escribirla entera cansa,', 'y al modelo le llega solo la mitad.']);
    expect(f.PASOS_SEG[14].solucion.map(([, t]) => t)).toEqual([
      'Con STL, la dictas: hablas como hablarías con un amigo,',
      'de forma natural, explicándole lo que tienes en mente.',
      'Incluso puedes divagar, no importa: el director te entenderá bien.',
      'Lo importante es que expreses tu idea como de verdad la quieres,',
      'con tu lenguaje natural: la comprensión, déjasela al director.',
      'Tu nota se transcribe en tu computador.',
      'Como va al Buzón y no directo al modelo,',
      'la lees y la corriges antes de que llegue:',
      'le quitas o le agregas lo que quieras.',
    ]);
    expect(f.CIERRES[14]).toEqual(['El cansancio de escribir', 'Hablas, corriges y envías: sin escribir de más.']);
    expect(problemasEnLaPagina[6][3]).toBe('¿Te cansa escribir todo lo que piensas, y tus mensajes al modelo salen a medias?');
    expect(JSON.stringify(f.PASOS_SEG[14]) + problemasEnLaPagina[6][0]).not.toContain('pereza');
    f.ENUNCIADOS[6] = problemasEnLaPagina[6][3];
    textos = [];
    for (let t = 0; t <= f.duraClip(6) + 0.5; t += 0.25) expect(() => f.pintarClip(ctx, 6, t)).not.toThrow();
    for (const x of ['Sin STL', 'Con STL', 'Buzón del Studio', 'se transcribe en tu computador', 'le quitas o le agregas lo que quieras.']) expect(textos, x).toContain(x);
    // Catorce clips de Kai: su enunciado, sus doce pasos y su cierre
    expect(f.clavesDelGuion(6)).toEqual(['g7-e', 's15-p1', 's15-p2', 's15-p3', 's15-1', 's15-2', 's15-3', 's15-4', 's15-5', 's15-6', 's15-7', 's15-8', 's15-9', 's15-c']);
    expect(TITULOS_EN()).toContain('Typing fatigue');
  });

  it('el generador de la voz en inglés lee el guion de «Getting started» y escribe su pista (nmw6xp1d1tit)', async () => {
    const { guionComoEmpezarEn, conPistaRecorridoEn } = await import('./vozRecorrido.ts');
    const guion = guionComoEmpezarEn(js);
    expect(guion.map(({ clave }) => clave)).toEqual(['como-1', 'como-2', 'como-3', 'como-4', 'como-5', 'como-6', 'como-7', 'como-c']);
    expect(guion[0].texto).toBe('Want to try the Studio now? This is how you start.');
    expect(conPistaRecorridoEn('const PISTA_VOZ_EN = {};\nx', { 'como-1': 1200 })).toBe('const PISTA_VOZ_EN = {"como-1":1200};\nx');
  });

  it('los 22 clips nuevos: los que ya salieron tienen su mp3 y su pista; los que esperan la cuota de Google ni se piden ni tienen mp3, y el generador los hará', async () => {
    const { rotulosDelRecorrido } = await import('./vozRecorrido.ts');
    const nuevos = [...f.clavesDelGuion(6), ...f.clavesDelGuion(f.GUIA)];
    expect(nuevos).toHaveLength(22);
    const delGenerador = rotulosDelRecorrido(js, html).map(({ clave }) => clave);
    for (const c of nuevos) expect(delGenerador, c).toContain(c);
    const carpeta = join(raiz, 'docs', 'difusion', 'voz', 'es');
    for (const c of nuevos) {
      const hay = existsSync(join(carpeta, `${c}.mp3`));
      expect(hay, c).toBe(!clavesSinVozTodavia.has(c));
      if (hay) expect(f.PISTA_VOZ_ES[c], c).toBeGreaterThan(300);
    }
    for (const c of clavesSinVozTodavia) expect(f.clavesDeClip(c.startsWith('como') ? f.GUIA : 6)).not.toContain(c);
  });
});
const TITULOS_EN = () => js.match(/const TITULOS_CORTOS_EN = \[([^\n]*)\];/)?.[1] ?? '';

describe('la imagen al compartir el enlace (pd_imagen_compartir; nmw2nl736tit, nmw2p52extit, nmw2xzruatit)', () => {
  const js = readFileSync(join(raiz, 'docs', 'difusion', 'mundo-3d.js'), 'utf8');
  const html = readFileSync(join(raiz, 'docs', 'difusion', 'mundo-3d.html'), 'utf8');
  const publicar = readFileSync(join(raiz, 'tools', 'publicar-stl.ts'), 'utf8');

  it('con ?compartir, la portada queda quieta en el momento en que el director habla con el modelo, sin rótulos ni texto encima', () => {
    expect(js).toContain("const compartir = new URLSearchParams(location.search).has('compartir');");
    expect(js).toContain('let fijo = compartir ? 0 :');
    expect(js).toContain('const deEstacion = (k, f) => () => f(compartir ? MOMENTO_COMPARTIR : tiempoDe(k));');
    // El momento cae dentro de lo que el director habla con el modelo, en el ciclo de la estación 1
    const momento = Number(js.match(/const MOMENTO_COMPARTIR = ([\d.]+);/)?.[1]);
    const [base, menos, de, a] = (js.match(/const CICLO_BASE = (\d+), MENOS_HABLA = (\d+), HABLA_DE = ([\d.]+), HABLA_A = ([\d.]+);/) ?? []).slice(1).map(Number);
    expect(momento).toBeGreaterThan(de * base);
    expect(momento).toBeLessThan(a * base - menos);
    expect(js).toContain('s.visible = !compartir;');
    expect(html).toContain('.compartir .menu, .compartir .estaciones, .compartir .popup, .compartir .globo-problema { display: none !important; }');
  });

  it('el enlace lleva la captura nueva y su título y descripción en inglés; el gráfico que comparaba con otros métodos ya no', () => {
    expect(publicar).toContain("const IMAGEN_COMPARTIR = 'recorrido-compartir';");
    expect(existsSync(join(raiz, 'docs', 'difusion', 'recorrido-compartir.png'))).toBe(true);
    expect(publicar).not.toContain('grafico-comparativo');
    expect(publicar).toContain("const TITULO_ENLACE = 'What is STL? · The guardrail developers were missing';");
    expect(publicar).toContain('${metas(TITULO_ENLACE, URL_PUBLICA)}');
    for (const m of ['og:image', 'og:description', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) expect(publicar).toContain(m);
  });
});

describe('el video corto de la difusión, en español y horizontal (pd_voz_video)', () => {
  const ruta = join(raiz, 'docs/difusion/video-corto.js');
  const fuente = readFileSync(ruta, 'utf8');
  // Lo puro del video se prueba de verdad, sin navegador: su módulo no toca la página hasta montar()
  const cargar = () => import(pathToFileURL(ruta).href);
  // Lo que dura cada animación ya acortada, inventado aquí: el montaje solo suma
  const dura = (i: number) => [30, 40, 50, 60][i] ?? 20;

  it('empieza con unos 8 segundos del ciclo de la estación 1 bajo «¿Qué es STL?», en el momento en que el director habla con el modelo (nmw47nttptit)', async () => {
    const { VIDEO, montaje } = await cargar();
    const { partes } = montaje(dura);
    expect(partes[0]).toEqual({ tipo: 'estacion1', dura: 8, desde: 0 });
    expect(VIDEO.titulo).toBe('¿Qué es STL?');
    // El director habla con el modelo hacia el segundo 11 de su ciclo (MOMENTO_COMPARTIR): cae dentro de lo que se ve
    const momento = Number(js.match(/const MOMENTO_COMPARTIR = ([\d.]+);/)?.[1]);
    expect(momento).toBeGreaterThan(VIDEO.desdeEstacion1);
    expect(momento).toBeLessThan(VIDEO.desdeEstacion1 + VIDEO.estacion1);
    // La cámara queda fija en la estación 1, que sigue animándose (no se detiene a los 150 cuadros como ?ver=N)
    expect(js).toContain('let fijo = compartir ? 0 : enVideo ? 1 :');
    expect(js).toContain('if (fijo !== null && !enVideo && !tocadaEnFijo && ++dibujados > 150) { quietaEnFijo = true; return; }');
    expect(js).toContain('ganchoVideo.estacion1 = (seg) => { relojes[0] = performance.now() / 1000 - seg; };');
  });

  it('sigue con «Atención dispersa», «Respuestas largas» y «Mensajes incompletos», cada uno en su versión corta: su enunciado, una situación y su solución con su cierre (nmw47pe1qtit, nmw47naiitit)', async () => {
    const { VIDEO, montaje, acortar } = await cargar();
    expect(VIDEO.problemas.map((p: { nombre: string }) => p.nombre)).toEqual(['Atención dispersa', 'Respuestas largas', 'Mensajes incompletos']);
    // Son los mismos problemas de la estación 2, en su lugar, con sus títulos cortos de la página
    const cortos = problemasEnLaPagina.map((m) => m[2]);
    for (const p of VIDEO.problemas) expect(cortos[p.i]).toBe(p.nombre);
    // Cada uno se queda con una sola de sus situaciones, la primera, sin tocar los demás
    const grandes = [[1, 2], [0, 6], [8, 10], [3, 4, 5], [7, 11, 12], [13], [14]];
    expect(JSON.stringify(grandes)).toBe(JSON.stringify(eval(js.match(/const GRANDES = (\[[^\n]*\]);/)?.[1] ?? '[]')));
    expect(acortar(grandes)).toEqual([[1], [0], [8, 10], [3], [7, 11, 12], [13], [14]]);
    expect(() => acortar([[1, 2]], [{ i: 0, segmento: 5 }])).toThrow();
    // En el montaje, un problema tras otro, con al menos un segundo entre partes, en el orden pedido
    const { partes } = montaje(dura);
    const clips = partes.filter((p: { tipo: string }) => p.tipo === 'clip');
    expect(clips.map((p: { i: number; dura: number }) => [p.i, p.dura])).toEqual([[0, 30], [3, 60], [1, 40]]);
    partes.forEach((p: { tipo: string }, k: number) => { if (p.tipo === 'clip') expect(partes[k - 1].tipo).toBe('pausa'); });
    expect(VIDEO.entre).toBeGreaterThanOrEqual(1);
    // Con la voz de Kai que ya suena en el recorrido, y la voz manda: el reloj la espera
    expect(fuente).toContain('new Audio(`voz/es/${clave}.mp3`)');
    expect(fuente).toContain('tramoDeVoz(parte.i, t)');
    // Con una sola situación, el «1 de 1» no va
    expect(js).toContain("n > 1 || !sinCuenta ? `${k + 1} ${L('de', 'of')} ${n}` : ''");
    expect(fuente).toContain('sinCuenta?.();');
  });

  it('termina en la pantalla de GitHub con el enlace a la página pública, y cada parte se encuentra por su segundo', async () => {
    const { VIDEO, montaje, parteEn } = await cargar();
    const m = montaje(dura);
    const ultima = m.partes[m.partes.length - 1];
    expect(ultima.tipo).toBe('final');
    expect(ultima.desde + ultima.dura).toBe(m.total);
    expect(m.total).toBeCloseTo(8 + 4 * VIDEO.entre + 30 + 60 + 40 + VIDEO.final);
    const publicar = readFileSync(join(raiz, 'tools/publicar-stl.ts'), 'utf8');
    expect(VIDEO.enlace).toBe(`https://argwabot.github.io/${publicar.match(/const REPOSITORIO = '([^']+)';/)?.[1]}/`);
    expect(fuente).toContain('Gratis, en GitHub');
    expect(parteEn(m, 0).parte.tipo).toBe('estacion1');
    expect(parteEn(m, 8.5).parte.tipo).toBe('pausa');
    expect(parteEn(m, 10).parte).toMatchObject({ tipo: 'clip', i: 0 });
    expect(parteEn(m, 10).t).toBeCloseTo(10 - 8 - VIDEO.entre);
    expect(parteEn(m, m.total + 5).parte.tipo).toBe('final');
  });

  it('lleva una música suave de fondo, muy baja bajo la voz, con su licencia revisada: la toca la misma página, bajo la licencia del Studio, PolyForm Shield (nmw3q8tr7tit, nmw7wf461tit)', async () => {
    const { VIDEO, ACORDES } = await cargar();
    expect(VIDEO.volumen).toBeLessThanOrEqual(0.08);
    expect(ACORDES.length).toBeGreaterThan(1);
    for (const acorde of ACORDES) for (const f of acorde) expect(f).toBeGreaterThan(60);
    // Nada se baja: ningún archivo de música, solo los osciladores del navegador
    expect(fuente).not.toMatch(/\.(ogg|wav|m4a|flac)\b/);
    // El único audio que se pide es la voz de Kai, de voz/es/
    expect([...fuente.matchAll(/[\w/${}.-]*\.mp3/g)].map((m) => m[0])).toEqual(['voz/es/${clave}.mp3']);
    expect(fuente).toContain('createOscillator()');
    expect(fuente).toContain('bajo su misma licencia PolyForm Shield (LICENSE)');
    const licencia = readFileSync(join(raiz, 'LICENSE'), 'utf8');
    expect(licencia).toMatch(/^Required Notice: .*ARGWABOT/);
    expect(licencia).toContain('# PolyForm Shield License 1.0.0');
  });

  it('se abre con ?video en el recorrido y se publica junto a él', () => {
    expect(js).toContain("if (enVideo) import('./video-corto.js').then((m) => m.montar({ grandes: GRANDES, pintarClip, duraClip, tramoDeVoz, gancho: ganchoVideo, sinCuenta: () => { sinCuenta = true; } }));");
    const publicar = readFileSync(join(raiz, 'tools/publicar-stl.ts'), 'utf8');
    expect(publicar).toContain("const MODULO_VIDEO = 'docs/difusion/video-corto.js';");
    expect(publicar).toContain("copyFileSync(join(raiz, MODULO_VIDEO), join(salida, 'video-corto.js'));");
    expect(existsSync(ruta)).toBe(true);
  });
});

describe('la cámara mira siempre al frente, como caminando sobre la línea, de la estación 1 a la 3 (nmw5w9ldotit)', () => {
  // Se rehace el camino y la pose de la cámara con las mismas cifras del recorrido (el código se lee para atarlas), y se
  // mira, cuadro a cuadro, hacia dónde apunta la imagen: la inclinación de la cámara y el corrimiento del encuadre de la 2
  it('ni la cámara ni el encuadre de la estación 2 miran hacia abajo al irse hacia la 3: el corrimiento solo se apaga', async () => {
    const THREE = await import('three');
    const linea = js.match(/for \(let i = 0; i <= 13; i\+\+\) puntos\.push\(new THREE\.Vector3\(([^;]*)\)\);/)?.[1] ?? '';
    expect(linea).toBe('Math.sin(i * 0.7) * 7 + (i % 3 - 1) * 1.5, 0.6 + Math.sin(i * 0.45) * 1.1, -i * 28');
    expect(js).toContain('const PARADA = [0.1, 0.42, 0.7, 0.9];');
    expect(js).toContain('const posicion = p.clone().addScaledVector(t, -7.5).addScaledVector(ARRIBA, ALTURA_CAMARA).addScaledVector(lado, 1.4);');
    expect(js).toContain('const ALTURA_CAMARA = 2.8;');
    expect(js).toContain('const sinMirarAbajo = (posicion, mira) => ({ x: mira.x, y: Math.max(mira.y, posicion.y), z: mira.z });');
    expect(js).toContain('const cam = w > 2 ? ponerCamaraEnDos() : camara;');
    expect(js).toContain('const c = aPantalla(anillo.centro, ancho, alto, cam);');
    const puntos = Array.from({ length: 14 }, (_, i) => new THREE.Vector3(Math.sin(i * 0.7) * 7 + (i % 3 - 1) * 1.5, 0.6 + Math.sin(i * 0.45) * 1.1, -i * 28));
    const camino = new THREE.CatmullRomCurve3(puntos, false, 'centripetal');
    const ARRIBA = new THREE.Vector3(0, 1, 0);
    const PARADA = [0.1, 0.42, 0.7, 0.9], SITIO = PARADA.map((u) => u + 0.022);
    const marco = (u: number) => { const p = camino.getPointAt(u), t = camino.getTangentAt(u); return { p, t, lado: new THREE.Vector3(-t.z, 0, t.x).normalize() }; };
    const focos = SITIO.map((u) => marco(u).p.clone().addScaledVector(ARRIBA, 0.9));
    const suave = (k: number) => k * k * (3 - 2 * k), tope = (k: number) => Math.max(0, Math.min(1, k));
    const masSuave = (x: number) => x * x * x * (x * (6 * x - 15) + 10);
    const pose = (u: number) => {
      const { p, t, lado } = marco(u);
      const posicion = p.clone().addScaledVector(t, -7.5).addScaledVector(ARRIBA, 2.8).addScaledVector(lado, 1.4);
      const adelante = camino.getPointAt(Math.min(u + 0.03, 1)).addScaledVector(ARRIBA, 0.9);
      let peso = 0, foco: InstanceType<typeof THREE.Vector3> | null = null;
      PARADA.forEach((s, i) => { const w = Math.max(0, 1 - Math.abs(u - s) / 0.06); if (w > peso) { peso = w; foco = focos[i]; } });
      return { posicion, mira: foco ? adelante.lerp(foco, suave(peso) * 0.8) : adelante };
    };
    const ancho = 1360, alto = 768;
    const camara = (u: number) => {
      const c = new THREE.PerspectiveCamera(55, ancho / alto, 0.1, 400);
      const { posicion, mira } = pose(u);
      c.position.copy(posicion);
      c.lookAt(mira.x, Math.max(mira.y, posicion.y), mira.z);
      c.updateMatrixWorld();
      return c;
    };
    const enDos = camara(PARADA[1]);
    // Cuánto corre la imagen hacia abajo el encuadre de la 2 (en píxeles; positivo, hacia abajo), con la cámara que usa el código
    const haciaAbajo = (w: number) => {
      const u = PARADA[1] + (PARADA[2] - PARADA[1]) * masSuave(w - 2);
      const cam = w > 2 ? enDos : camara(u);
      const v = focos[1].clone().project(cam);
      const cy = (1 - v.y) / 2 * alto;
      return (cy - alto / 2) * suave(tope(1 - Math.abs(w - 2) / 0.6));
    };
    let antes = haciaAbajo(2);
    for (let w = 2.01; w <= 2.6; w += 0.01) {
      const ahora = haciaAbajo(w);
      expect(ahora, `w = ${w.toFixed(2)}`).toBeLessThanOrEqual(antes + 1e-6);
      antes = ahora;
    }
    // Y la cámara misma nunca apunta por debajo del horizonte, de la estación 1 a la 3
    for (let w = 1; w <= 3; w += 0.01) {
      const k = Math.min(2, Math.floor(w)), f = w - k;
      const u = PARADA[k - 1] + (PARADA[k] - PARADA[k - 1]) * masSuave(f);
      const dir = new THREE.Vector3();
      camara(u).getWorldDirection(dir);
      expect(dir.y, `w = ${w.toFixed(2)}`).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  // La nota nmw6lcanstit: la prueba de arriba miraba solo que el corrimiento se apagara, pero en la estación 2 misma la imagen
  // ya iba corrida hacia arriba (como mirando 7,6° al piso), y al irse volvía. Ahora se mide lo que se ve: el rayo del centro
  // de la imagen, con el corrimiento puesto, cuadro a cuadro (cada 4 cuadros) con el suavizado real, de la estación 2 a la 3
  it('el centro de la imagen nunca apunta por debajo del horizonte al irse de la 2 a la 3, cada 4 cuadros (nmw6lcanstit)', async () => {
    const THREE = await import('three');
    expect(js).toContain('const corrimientoSinBajar = (y) => Math.min(0, y);');
    expect(js).toContain('camara.setViewOffset(ancho, alto, -dx * cerca, corrimientoSinBajar(-dy * cerca), ancho, alto);');
    expect(js).toContain('Object.assign(anillo, { centro: p.clone().addScaledVector(ARRIBA, ALTURA_CAMARA), lado, tan: t });');
    expect(js).toContain('const cerca = suave(tope(1 - Math.abs(w - 2) / (w > 2 ? 0.4 : 0.6)));');
    expect(js).toContain('const SUAVIZADO = 0.0075, SUAVIZADO_SALTO = 0.015;');
    const corrimientoSinBajar = (y: number) => Math.min(0, y);
    const puntos = Array.from({ length: 14 }, (_, i) => new THREE.Vector3(Math.sin(i * 0.7) * 7 + (i % 3 - 1) * 1.5, 0.6 + Math.sin(i * 0.45) * 1.1, -i * 28));
    const camino = new THREE.CatmullRomCurve3(puntos, false, 'centripetal');
    const ARRIBA = new THREE.Vector3(0, 1, 0);
    const PARADA = [0.1, 0.42, 0.7, 0.9], SITIO = PARADA.map((u) => u + 0.022);
    const marco = (u: number) => { const p = camino.getPointAt(u), t = camino.getTangentAt(u); return { p, t, lado: new THREE.Vector3(-t.z, 0, t.x).normalize() }; };
    const centroAnillo = marco(SITIO[1]).p.clone().addScaledVector(ARRIBA, 2.8);
    const suave = (k: number) => k * k * (3 - 2 * k), tope = (k: number) => Math.max(0, Math.min(1, k));
    const masSuave = (x: number) => x * x * x * (x * (6 * x - 15) + 10);
    for (const [ancho, alto] of [[1360, 768], [1920, 1080]]) {
      const camara = (u: number) => {
        const { p, t, lado } = marco(u);
        const c = new THREE.PerspectiveCamera(55, ancho / alto, 0.1, 400);
        c.position.copy(p.clone().addScaledVector(t, -7.5).addScaledVector(ARRIBA, 2.8).addScaledVector(lado, 1.4));
        const mira = camino.getPointAt(Math.min(u + 0.03, 1)).addScaledVector(ARRIBA, 0.9);
        c.lookAt(mira.x, Math.max(mira.y, c.position.y), mira.z);
        c.updateMatrixWorld();
        return c;
      };
      const enDos = camara(PARADA[1]);
      let w = 2;
      for (let n = 0; n < 1200 && w < 2.995; n++) {
        w += (3 - w) * 0.0075;
        if (n % 4) continue;
        const cam = camara(PARADA[1] + (PARADA[2] - PARADA[1]) * masSuave(w - 2));
        const v = centroAnillo.clone().project(enDos);
        const dy = (alto / 2 - 22) - (1 - v.y) / 2 * alto;   // el anillo, hacia el centro de lo libre sobre la línea de abajo
        const cerca = suave(tope(1 - Math.abs(w - 2) / 0.4));
        cam.setViewOffset(ancho, alto, 0, corrimientoSinBajar(-dy * cerca), ancho, alto);
        cam.updateMatrixWorld();
        const rayo = new THREE.Vector3(0, 0, 0.5).unproject(cam).sub(cam.position).normalize();
        expect(rayo.y, `${ancho} · cuadro ${n} · w = ${w.toFixed(3)}`).toBeGreaterThanOrEqual(-1e-6);
      }
    }
  });
});

describe('los textos de las estaciones, en una sola línea abajo y pequeños, y «ES · EN» arriba del menú (nmw5w9ldotit, nmw5wf86xtit)', () => {
  it('cada título va sin partirse, en una píldora pegada abajo y al centro, con una letra que crece con la pantalla: el doble de antes en 1360 y casi el triple en 1920 (nmw6lwwbxtit)', () => {
    expect(html).toContain('.js-3d .tarjeta.corta h2 { margin: 0; font-size: clamp(16px, 1.35vw, 28px); line-height: 1.3; white-space: nowrap; text-wrap: nowrap; }');
    const antes = (ancho: number) => Math.min(30, Math.max(22, ancho * 0.024)) * 0.3, ahora = (ancho: number) => Math.min(28, Math.max(16, ancho * 0.0135));
    for (const ancho of [1360, 1920]) expect(ahora(ancho) / antes(ancho), String(ancho)).toBeGreaterThanOrEqual(2);
    expect(html).toContain('.js-3d .estacion { justify-content: center; }');
    // La entrada: sus dos líneas arriba, sin montarse sobre la línea ni los anillos, en el computador como en el teléfono
    // (nmw8bic81tit, que reemplaza el centro de nmw86na4vtit), y la página sin 3D no se asoma mientras carga
    expect(html).toMatch(/\.js-3d \.entrada \{[^}]*justify-content: flex-start; padding-top: 13vh;/);
    expect(html).not.toMatch(/\.js-3d \.entrada \{[^}]*justify-content: center;/);
    expect(html).toContain('.cargando-3d:not(.js-3d) #viaje, .cargando-3d:not(.js-3d) .fin { visibility: hidden; }');
    expect(html).toContain("document.documentElement.classList.add('cargando-3d');");
    expect(js).toContain("document.documentElement.classList.remove('cargando-3d');");
    // La carga a página completa (nmw6p3dj8tit): encima de todo, menú y «ES · EN» incluidos, hasta el load, y se desvanece despacio
    expect(html.indexOf('<div class="cargador"')).toBeLessThan(html.indexOf('<nav class="menu"'));
    expect(html).toContain('.cargando-3d .cargador { opacity: 1; visibility: visible; pointer-events: auto; transition: none; }');
    expect(html).toMatch(/\.cargador \{[^}]*z-index: 60;[^}]*transition: opacity 1\.8s ease, visibility 0s 1\.8s; \}/);
    expect(Number(html.match(/\.cubierta-movil\.lenta \{ position: fixed; inset: 0; z-index: (\d+)/)?.[1])).toBeLessThan(60);
    expect(js).toContain("else addEventListener('load', listo, { once: true });");
    expect(js).toContain('const listo = () => setTimeout(mostrarPagina, 150);');
    // Para capturar o grabar, sin carga
    expect(js.replace(/\r\n/g, '\n')).toContain("if (fijo !== null || compartir || enVideo) {\n  document.documentElement.classList.add('sin-cargador');");
    // El texto de cada estación no se asoma: oculto hasta que la cámara llega, sube desde abajo y se va al seguir (nmw6p0g7htit)
    expect(html).toMatch(/\.js-3d \.tarjeta \{[^}]*opacity: 0; visibility: hidden; transform: translateY\(4vh\);/);
    expect(html).toMatch(/\.js-3d \.estacion\.actual \.tarjeta \{ opacity: 1; visibility: visible; transform: none;/);
    expect(js).toContain('const k = Math.abs(w - Math.round(w)) <= LLEGADA ? Math.round(w) - 1 : -1;');
    // Llega cuando la cámara se ve quieta, sin los 2 s de más (nmw6rki46tit), y aparece rápido
    expect(js).toContain('const LLEGADA = 0.12;');
    const masSuave = (x: number) => x * x * x * (x * (6 * x - 15) + 10);
    expect(1 - masSuave(1 - 0.12)).toBeLessThan(0.015);
    expect(html).toContain('.js-3d .estacion.actual .tarjeta { opacity: 1; visibility: visible; transform: none; transition: opacity .25s, transform .3s');
    // Al centro exacto de la ventana, sin el margen del menú y con la barra de desplazamiento (nmw6qlm1ttit)
    expect(html).not.toContain('.js-3d .estacion { padding-right: 250px; }');
    expect(html).toContain('.js-3d .estacion { padding-left: calc(clamp(16px, 5vw, 64px) + 100vw - 100%); padding-right: clamp(16px, 5vw, 64px); }');
    expect(js).toContain("addEventListener('scroll', irseLaEntrada, { passive: true });");
    expect(html).toContain('.tarjeta h2 { margin: 0 0 10px; font-size: clamp(22px, 2.4vw, 30px);');
    expect(html).toMatch(/\.js-3d \.tarjeta\.corta \{[^}]*white-space: nowrap;[^}]*\}/);
    // Las cuatro estaciones usan esa tarjeta
    expect(html.match(/<div class="tarjeta corta">/g)?.length).toBe(4);
  });

  it('«ES · EN» va arriba del menú y cambia la página de idioma, que se abre en el del enlace, el guardado o el del navegador', () => {
    const menu = html.match(/<nav class="menu"[\s\S]*?<\/nav>/)?.[0] ?? '';
    expect(menu.indexOf('class="idioma"')).toBeGreaterThan(0);
    expect(menu.indexOf('class="idioma"')).toBeLessThan(menu.indexOf('<ol'));
    expect(menu).toContain('data-idioma="es"');
    expect(menu).toContain('data-idioma="en"');
    // El idioma se decide en <head>, antes del recorrido, que lo lee de <html lang>
    expect(html.indexOf("document.documentElement.lang = valido(pedido) ? pedido : valido(guardado) ? guardado : navegador;")).toBeLessThan(html.indexOf('mundo-3d.js'));
    expect(html).toContain("var pedido = new URLSearchParams(location.search).get('lang')");
    expect(js).toContain("url.searchParams.set('lang', idioma);");
    expect(js).toContain("menu: ['What is STL', 'Has this happened to you?', 'Getting started', 'Documentation']");
  });
});

// La estación 2, «Has this happened to you?», en inglés (pd_bilingue; t_decide_estacion2_textos, nmw738o1ktit): los
// rótulos de cada paso, los enunciados, los cierres y las palabras dibujadas en cada escena
describe('station 2 in English, with ?lang=en (nmw738o1ktit)', () => {
  const literal = (nombre: string, abre: string, cierra: string) => new Function(`return ${js.match(new RegExp('const ' + nombre + ' = (\\' + abre + '[\\s\\S]*?\\n\\' + cierra + ');'))?.[1] ?? 'null'};`)();
  const espanol = /[¿¡ñáéíóú]/;
  type Paso = [number, string];
  const es = literal('PASOS_SEG', '[', ']') as { problema: Paso[]; solucion: Paso[] }[];
  const en = literal('PASOS_SEG_EN', '[', ']') as { problema: Paso[]; solucion: Paso[] }[];

  it('every step of every segment has its English line, with the same cuts as the Spanish (nmw3q7lw7tit)', () => {
    expect(en).toHaveLength(es.length);
    es.forEach((s, j) => {
      for (const parte of ['problema', 'solucion'] as const) {
        expect(en[j][parte].map(([desde]) => desde), `segment ${j + 1}, ${parte}`).toEqual(s[parte].map(([desde]) => desde));
        for (const [, texto] of en[j][parte]) expect(texto, `segment ${j + 1}`).not.toMatch(espanol);
      }
    });
    expect(js).toContain('if (EN_DIBUJO) {\n  PASOS_SEG.forEach((s, j) => Object.assign(s, PASOS_SEG_EN[j]));\n  CIERRES.splice(0, CIERRES.length, ...CIERRES_EN);\n}');
  });

  it('every closing has its English pair, and the page swaps the seven statements and their answers', () => {
    const cierresEs = literal('CIERRES', '[', ']') as ([string, string] | null)[];
    const cierresEn = literal('CIERRES_EN', '[', ']') as ([string, string] | null)[];
    expect(cierresEn.map((c) => c === null)).toEqual(cierresEs.map((c) => c === null));
    for (const c of cierresEn) if (c) { expect(c[0]).not.toMatch(espanol); expect(c[1]).not.toMatch(espanol); }
    const problemasEn = js.match(/const PROBLEMAS_EN = (\[[\s\S]*?\n {2}\]);/)?.[1] ?? '[]';
    const lista = new Function(`return ${problemasEn};`)() as [string, string][];
    expect(lista).toHaveLength(problemasEnLaPagina.length);
    for (const [enunciado, respuesta] of lista) { expect(enunciado).not.toMatch(espanol); expect(respuesta).not.toMatch(espanol); }
    expect(js).toContain("document.querySelectorAll('details.problema').forEach((d, i) => {");
  });

  it('the words drawn in the scenes have their English, and the pills say «Without STL» and «1 of 3»', () => {
    const dibujo = new Function(`return ${js.match(/const DIBUJO_EN = (\{[\s\S]*?\n\});/)?.[1] ?? '{}'};`)() as Record<string, string>;
    expect(Object.keys(dibujo).length).toBeGreaterThan(100);
    for (const [palabra, ingles] of Object.entries(dibujo)) expect(ingles, palabra).not.toMatch(espanol);
    expect(dibujo['Sin STL']).toBe('Without STL');
    expect(js).toContain("c.fillText(D(texto), x, y);");
    expect(js).toContain("letrero(ctx, `${k + 1} ${L('de', 'of')} ${n}`, 287,");
  });

  it('every word written into a scene (letrero, globo, ventana) has its English in DIBUJO_EN (nmw766nyutit)', () => {
    const dibujo = new Function(`return ${js.match(/const DIBUJO_EN = (\{[\s\S]*?\n\});/)?.[1] ?? '{}'};`)() as Record<string, string>;
    const NO_ES_TEXTO = /^(#|rgba?\(|\d|left$|right$|center$|middle$|GitHub$|STL( Studio|-Sacred_Time_Line)?$|Claude Code$|bold|italic|600|700)/;
    const sinIngles = js.split('\n')
      .filter((l) => /\b(letrero|globo|ventana)\(c(tx)?, /.test(l) && !/^\s*(\/\/|function )/.test(l))
      .map((l) => l.replace(/L\('[^']*', '[^']*'\)/g, ''))
      .flatMap((l) => [...l.matchAll(/'([^'\\]*)'/g)].map((m) => m[1]))
      .filter((t) => /\p{L}/u.test(t) && !NO_ES_TEXTO.test(t) && !Object.hasOwn(dibujo, t));
    expect([...new Set(sinIngles)]).toEqual([]);
  });

  // Con «EN», nada de la página queda en español (nota del titular nmw766nyutit): cada texto y cada etiqueta fija de
  // mundo-3d.html tiene su inglés, por su gancho o en FIJO_EN
  it('every fixed text, aria-label, title and aria-valuetext of the tour page has its English (nmw766nyutit)', () => {
    const fijo = new Function(`return ${js.match(/const FIJO_EN = (\{[\s\S]*?\n\});/)?.[1] ?? '{}'};`)() as Record<string, string>;
    const pagina = js.match(/const PAGINA = \{\s*es: (\{[^\n]*\}),/)?.[1] ?? '{}';
    const conSuGancho = new Set(Object.values(new Function(`return ${pagina};`)() as Record<string, string | string[]>).flat());
    let cuerpo = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<svg[\s\S]*?<\/svg>/g, '');
    // Lo que ya cambia su propio código: los problemas, los pasos de «Cómo empezar», los textos con su gancho y los de la carga
    for (const re of [/<details class="problema"[\s\S]*?<\/details>/g, /<ol class="lista-como">[\s\S]*?<\/ol>/g, /<p class="lista-como">[\s\S]*?<\/p>/g,
      /<span lang="(es|en)">[^<]*<\/span>/g, /<(\w+)[^>]*data-(titulo-dos|titulo-tres|texto-ver|ver-como|empezar-voz|enlace-como)[^>]*>[^<]*<\/\1>/g,
      /<h2 class="visor-titulo"[\s\S]*?<\/h2>/g, /<canvas id="popup-clip"[^>]*>/g, /<section class="documentacion"[\s\S]*?<\/section>/g,
      /<(\w+)[^>]*data-(titulo-doc|ver-doc)[^>]*>[^<]*<\/\1>/g, /<meta (charset|name="viewport")[^>]*>/g]) cuerpo = cuerpo.replace(re, '');
    const textos = [...cuerpo.matchAll(/>([^<>]+)</g)].map((m) => m[1].trim());
    const atributos = [...cuerpo.matchAll(/\s(?:aria-label|title|aria-valuetext|content)="([^"]+)"/g)].map((m) => m[1].trim());
    const IGUAL = new Set(['ES', 'EN', '1x', '1.25x', '1.5x', '2x', 'Idioma · Language']);
    const sinIngles = [...textos, ...atributos].filter((t) => /\p{L}/u.test(t) && !IGUAL.has(t) && !conSuGancho.has(t) && !Object.hasOwn(fijo, t));
    expect(sinIngles).toEqual([]);
    for (const [es, en] of Object.entries(fijo)) expect(en, es).not.toMatch(espanol);
    // Se aplica por texto y por etiqueta, también al título y a la descripción
    expect(js).toContain("document.title = FIJO_EN[document.title] ?? document.title;");
    expect(js).toContain("for (const atributo of ['aria-label', 'title', 'aria-valuetext']) {");
    expect(fijo['← Volver al recorrido']).toBe('← Back to the tour');
  });

  it('what the player writes while it runs (voice, pause, knob) also follows the page language (nmw766nyutit)', () => {
    expect(js).toContain("botonVoz.textContent = conVoz ? L('🔊 Voz', '🔊 Voice') : L('🔇 Sin voz', '🔇 No voice');");
    expect(js).toContain("L('Pausar la animación', 'Pause the animation')");
    expect(js).toContain("`${L('segundo', 'second')} ${s} ${L('de', 'of')} ");
    expect(js).not.toMatch(/textContent = conVoz \? '🔊 Voz'/);
  });

  it('station 2 in English speaks with its English voice (nmw74uq8qtit); a clip still without it plays silent, never with the Spanish voice (nmw6r9827tit)', async () => {
    expect(js).toContain(String.raw`const vozEnIngles = (clave) => EN_DIBUJO && /^(como-|s\d+-|g\d+-e$)/.test(clave);`);
    const { rotulosDelRecorridoEn } = await import('./vozRecorrido.ts');
    const rotulos = rotulosDelRecorridoEn(js);
    // The 118 clips of station 2 (its seven statements, the steps of its segments and their closings) and the 8 of «Getting started»
    expect(rotulos.filter(({ clave }) => !clave.startsWith('como-'))).toHaveLength(118);
    expect(rotulos[0]).toEqual({ clave: 'g1-e', texto: expect.stringMatching(/^Do you open 4 or more sessions at once/) });
    expect(rotulos.find(({ clave }) => clave === 's15-c')?.texto).toBe('Talk, correct and send: no extra typing.');
    // Each clip already generated says exactly what its label says, and its time is in the track
    const pistaEn = JSON.parse(js.match(/const PISTA_VOZ_EN = (\{[^\n]*\});/)?.[1] ?? '{}') as Record<string, number>;
    const dichosEn = JSON.parse(readFileSync(join(raiz, 'docs/difusion/voz/en/textos.json'), 'utf8')) as Record<string, { texto: string; ms: number }>;
    for (const clave of Object.keys(pistaEn)) {
      expect(rotulos.find((r) => r.clave === clave)?.texto, clave).toBe(dichosEn[clave]?.texto);
      expect(existsSync(join(raiz, `docs/difusion/voz/en/${clave}.mp3`)), clave).toBe(true);
    }
  });

  it('in English, an animation of station 2 speaks only when all its phrases have their voice: half of one stays silent whole', async () => {
    const { rotulosDelRecorridoEn, pistaDeAnimacionesEnteras, ordenDeAnimaciones, clavesDelProblema } = await import('./vozRecorrido.ts');
    const rotulos = rotulosDelRecorridoEn(js);
    const dicho = (claves: string[]) => Object.fromEntries(rotulos.filter((r) => claves.includes(r.clave)).map((r) => [r.clave, { texto: r.texto, ms: 1000 }]));
    // The first animation is segments 2 and 3: with only its statement and segment 2, it stays out of the track
    const primera = clavesDelProblema(js, 1);
    expect(primera.slice(0, 2)).toEqual(['g1-e', 's2-p1']);
    expect(Object.keys(pistaDeAnimacionesEnteras(js, rotulos, dicho(primera.slice(0, 9))))).toEqual([]);
    expect(Object.keys(pistaDeAnimacionesEnteras(js, rotulos, dicho([...primera, 'como-1'])))).toEqual([...primera, 'como-1']);
    // A clip whose text changed does not count as said
    const cambiado = { ...dicho(primera), 's2-p1': { texto: 'old text', ms: 1000 } };
    expect(pistaDeAnimacionesEnteras(js, rotulos, cambiado)).toEqual({});
    // The generator goes animation by animation, so a cut by the daily quota leaves whole ones
    expect(ordenDeAnimaciones(js).slice(0, primera.length)).toEqual(primera);
    expect(new Set(ordenDeAnimaciones(js))).toEqual(new Set(rotulos.map((r) => r.clave)));
  });
});
