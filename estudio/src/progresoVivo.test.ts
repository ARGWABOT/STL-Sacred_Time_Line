import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cuentaDeCache, porcentajeDeCache, AVALANCHA, BAJO_LA_BOLA, PUNTOS_MONTANA, REPETICION, VUELTAS_FONDO, avanceDeLaEscena, bolaEncima, marchaDelModelo, recordarAvance,avalanchaDe, avalanchaHtml, avanceDeTareas, cuadroDeAvalanchaHtml, cuadroDeRepeticion, escenaDeAvalancha, repeticionDeAvalancha, ladoDeLosGlobos, avanzarTokens, tokensAlDia, CLAVE_DIVISION, DIVISION_PROGRESO, DURA_CARA, DURA_CUENTA, INSISTENCIA_MS, PASOS_MINIMO, PLAN_MINIMO, abiertaTrasClic, altoDelPlan, botonDelProgreso, cierraConClicFuera, progresoSeMuestra, altoGuardado, caraQueTrabaja, chatDeRevision, cifraAl, conSeparadores, cuentaTrasPintar, desplazamientoTrasPintar, duracion, globosDeInicio, globosDeTurnos, marcadorDe, PASO_GLOBO_MS, relojDesde, revelarGlobos, sigueLaPunta, vistaDelProgreso, type TokensDeBanda } from './progresoVivo';
import { conversacionDe, leerRevisionEntera, leerTurnos, type ConversacionDeRevision } from '../../src/director/turnos';
import { ponerIdioma } from './textos';
import { es } from './textos/es';
import { en } from './textos/en';
import { caraDelModeloSVG, caraSVG } from './cara';

const leer = (archivo: string) => readFileSync(join(__dirname, archivo), 'utf-8');

describe('lo que va haciendo el director, con lo más nuevo arriba (nota de voz del titular, 26 de octubre de 2026)', () => {
  it('sigue la punta de arriba: la primera vez, o con la lectura arriba, se queda en 0 para ver lo nuevo', () => {
    expect(desplazamientoTrasPintar(null, 800)).toBe(0);
    expect(desplazamientoTrasPintar({ desplazamiento: 0, alto: 500 }, 800)).toBe(0);
    expect(desplazamientoTrasPintar({ desplazamiento: 39, alto: 500 }, 800)).toBe(0);
  });

  it('si bajó a leer algo más viejo, se queda en lo mismo que leía aunque entren pasos nuevos por arriba', () => {
    // La lista creció 120 px por arriba: lo que leía bajó 120 px
    expect(desplazamientoTrasPintar({ desplazamiento: 300, alto: 700 }, 820)).toBe(420);
    // Sin pasos nuevos, no se mueve
    expect(desplazamientoTrasPintar({ desplazamiento: 300, alto: 700 }, 700)).toBe(300);
    // Nunca queda por debajo de 0
    expect(desplazamientoTrasPintar({ desplazamiento: 60, alto: 700 }, 100)).toBe(0);
  });

  it('el panel los pinta del más nuevo al más viejo, con la marca de «ahora» en el de arriba, y aplica ese desplazamiento', () => {
    const director = leer('app.ts');
    const pintar = director.match(/function pintarProgreso\(trabajando: boolean\) \{[\s\S]*?\n\}\n/)?.[0] ?? '';
    expect(pintar).toContain('chatDeRevision(conversacion, turnosAbiertos, { cuenta: cuentaBanda, nuevos, ocultos, naceHace, ahora: ahoraChat, repeticion: repeticionEnCurso(), tareas, recuerdo: avanceRecordado, tokens: tokensBanda })');
    expect(pintar).toContain('desplazamientoTrasPintar(');
    expect(director).toContain("import { CLAVE_DIVISION, DIVISION_PROGRESO, abiertaTrasClic, altoDelPlan, avanceDeLaEscena, avanzarTokens, bolaEncima, botonDelProgreso, altoGuardado, chatDeRevision, cierraConClicFuera, cuadroDeAvalanchaHtml, cuadroDeRepeticion, cuentaTrasPintar, desplazamientoTrasPintar, globosDeInicio, ladoDeLosGlobos, marcadorDe, pintarCuenta, pintarTokens, progresoSeMuestra, recordarAvance, relojDesde, revelarGlobos, sigueLaPunta, tokensAlDia, vistaDelProgreso, type ClicEnLaPagina, type CuadroDeAvalancha, type CuentaDeBanda, type MarcadorDeBanda, type RecuerdoDeAvance, type RepeticionEnCurso, type TokensDeBanda } from './progresoVivo';");
  });
});

describe('el panel de la revisión: de todo el alto, entre la barra y el contenido, solo mientras corre (nota nmw12urbdtit)', () => {
  it('en el panel la lista va invertida: la punta es abajo (0) y leer algo más viejo es subir (negativo)', () => {
    // En la punta, o la primera vez, se queda en la punta
    expect(desplazamientoTrasPintar(null, 800, true)).toBe(0);
    expect(desplazamientoTrasPintar({ desplazamiento: -20, alto: 500 }, 800, true)).toBe(0);
    // Leyendo más arriba, lo nuevo entra por abajo: se resta lo que creció y se queda en lo mismo
    expect(desplazamientoTrasPintar({ desplazamiento: -300, alto: 700 }, 820, true)).toBe(-420);
    expect(desplazamientoTrasPintar({ desplazamiento: -300, alto: 700 }, 700, true)).toBe(-300);
    // Nunca pasa de la punta
    expect(desplazamientoTrasPintar({ desplazamiento: -60, alto: 700 }, 100, true)).toBe(0);
    expect(sigueLaPunta(-39)).toBe(true);
    expect(sigueLaPunta(-40)).toBe(false);
  });

  it('se muestra mientras corre la revisión, se cierra y se recuerda cerrado, empuja el contenido y no se desprende del director', () => {
    const app = leer('app.ts');
    const pintar = app.match(/function pintarProgreso\(trabajando: boolean\) \{[\s\S]*?\n\}\n/)?.[0] ?? '';
    expect(pintar).toContain('const enPanel = trabajando && !cerrado;');
    expect(pintar).toContain("document.body.classList.toggle('con-panel-revision', enPanel && !caja.hidden);");
    expect(pintar).not.toContain('data-plegar-panel');
    expect(pintar).toContain('desplazamientoTrasPintar(antes, nueva.scrollHeight, enPanel)');
    expect(app).toContain("if (!n || caja.hidden || caja.classList.contains('panel-revision')) {");
    expect(app).toContain("localStorage.setItem(CLAVE_PANEL_PLEGADO, localStorage.getItem(CLAVE_PANEL_PLEGADO) === 'si' ? 'no' : 'si');");
    const css = leer('estilos.css');
    expect(css).toContain('body.con-panel-revision .principal { margin-left: var(--ancho-panel-revision); }');
    expect(css).toMatch(/\.progreso-director\.panel-revision \{[^}]*left: var\(--lateral\);[^}]*height: calc\(100 \* var\(--vh\)\);/);
    expect(css).toContain('.progreso-director.panel-revision .chat-revision { flex: 1 1 0; min-height: 0; display: flex; flex-direction: column-reverse; }');
  });
});

describe('mientras atiende lo urgente: debajo del enfoque y con su botón para plegarlo (notas de voz nmw46wkmstit y nmw46zhl5tit)', () => {
  it('con html.enfoque, lo que va haciendo el director queda debajo de lo enfocado y encima del velo, también el globo del director', () => {
    const css = leer('director.css');
    const z = (selector: RegExp) => Number(css.match(selector)?.[1]);
    const progreso = z(/html:is\(\.enfoque, \.enfoque-mision\) \.progreso-director, html:is\(\.enfoque, \.enfoque-mision\) \.progreso-director\.desde-director \{ z-index: (\d+); \}/);
    const enfocado = z(/html\.enfoque \.docs > \.lector, html\.enfoque-mision \.mision-c\.sigue\.mia \{[^}]*z-index: (\d+);/);
    const velo = z(/\.velo-zen \{[^}]*z-index: (\d+);/);
    expect(progreso).toBeLessThan(enfocado);
    expect(progreso).toBeGreaterThan(velo);
    // Ninguna otra regla del enfoque lo sube por encima
    expect(css).not.toMatch(/html:is\(\.enfoque, \.enfoque-mision\) \.progreso-director \{ z-index: 46; \}/);
  });

  it('en lo urgente, su panel lleva el botón para plegarlo; en una revisión, ninguno; fuera del panel, el de cerrar', () => {
    expect(botonDelProgreso({ enPanel: true, urgente: true })).toBe('plegar');
    expect(botonDelProgreso({ enPanel: true, urgente: false })).toBeNull();
    expect(botonDelProgreso({ enPanel: false, urgente: false })).toBe('cerrar');
    expect(botonDelProgreso({ enPanel: false, urgente: true })).toBe('cerrar');
    const app = leer('app.ts');
    const pintar = app.match(/function pintarProgreso\(trabajando: boolean\) \{[\s\S]*?\n\}\n/)?.[0] ?? '';
    expect(pintar).toContain('const boton = botonDelProgreso({ enPanel, urgente });');
    expect(pintar).toContain("data-plegar-progreso aria-label=\"${esc(tx('progreso.plegar'))}\"");
    expect(pintar).toContain("${icono('plegar')}");
    // Plegarlo es lo mismo que la cara del director en una revisión: el atajo, que late mientras atiende, lo abre otra vez
    expect(app).toContain("if (t.closest('[data-plegar-progreso]') && panelDeRevision) return alternarPanel();");
  });
});

describe('un clic abre la ventana, sin esperar la consulta siguiente (nota del titular nmvybvq1etit)', () => {
  it('se muestra con la revisión recién pedida, sin ningún dato todavía', () => {
    // Pedida y aún no lanzada: el director ya se ve en la línea, y la página todavía no sabe que trabaja
    expect(progresoSeMuestra(true, false, true)).toBe(true);
    expect(progresoSeMuestra(true, true, true)).toBe(true);
    // Lo urgente no tiene director en la línea
    expect(progresoSeMuestra(true, true, false)).toBe(true);
    // Cerrada, o sin nada en marcha, no
    expect(progresoSeMuestra(false, true, true)).toBe(false);
    expect(progresoSeMuestra(true, false, false)).toBe(false);
  });

  it('una respuesta lenta no la cierra: los clics que se juntan mientras carga no la vuelven a cerrar', () => {
    const abierta = 1_000;
    expect(abiertaTrasClic(false, 0, abierta)).toBe(true);
    // Insiste porque la página está leyendo su respuesta: sigue abierta
    expect(abiertaTrasClic(true, abierta, abierta + 200)).toBe(true);
    expect(abiertaTrasClic(true, abierta, abierta + INSISTENCIA_MS - 1)).toBe(true);
    // Pasado ese momento, el clic es para cerrarla
    expect(abiertaTrasClic(true, abierta, abierta + INSISTENCIA_MS)).toBe(false);
  });

  it('la página la abre en el clic mismo, dice en qué va la revisión y solo después pregunta', () => {
    const director = leer('app.ts');
    const abrir = director.match(/function abrirProgreso\(si: boolean\) \{[\s\S]*?\n\}\n/)?.[0] ?? '';
    expect(abrir.indexOf('pintarSegundoPlano();')).toBeGreaterThan(-1);
    expect(abrir.indexOf('pintarSegundoPlano();')).toBeLessThan(abrir.indexOf('void cargar()'));
    // Un clic de más, con ella abierta, no vuelve a traer los datos
    expect(abrir).toContain('if (si && progresoAbierto) return;');
    expect(director.match(/abiertaTrasClic\(progresoAbierto, progresoAbiertoEn, Date\.now\(\)\)/g)).toHaveLength(2);
    expect(director).toContain('caja.hidden = trabajando ? cerrado : !progresoSeMuestra(progresoAbierto, trabajando, revisionEnLinea() !== null);');
    const pintar = director.match(/function pintarProgreso\(trabajando: boolean\) \{[\s\S]*?\n\}\n/)?.[0] ?? '';
    expect(pintar.indexOf("vista === 'sinEmpezar'")).toBeLessThan(pintar.indexOf("tx('chat.desdeSuSesion')"));
    expect(pintar).toContain("${esc(sinEmpezar ?? '')}");
  });
});

describe('al empezar una revisión que lanzó el Studio, la espera y después la conversación, nunca el texto fijo de la sesión (nota del titular nmw2y41f7tit)', () => {
  const vacia = { turnos: [], espera: null };
  it('pedida y aún sin lanzar: en qué va, con sus puntos', () => {
    expect(vistaDelProgreso({ sinEmpezar: 'Llamando al director…', lanzadaPorElStudio: false, conversacion: null })).toBe('sinEmpezar');
  });
  it('lanzada, entre el lanzamiento y la primera línea de su registro (la conversación aún no existe, null o undefined): la espera', () => {
    expect(vistaDelProgreso({ sinEmpezar: null, lanzadaPorElStudio: true, conversacion: null })).toBe('arrancando');
    expect(vistaDelProgreso({ sinEmpezar: null, lanzadaPorElStudio: true, conversacion: undefined })).toBe('arrancando');
    expect(vistaDelProgreso({ sinEmpezar: null, lanzadaPorElStudio: true, conversacion: vacia })).toBe('arrancando');
  });
  it('en cuanto hay un turno, o alguien espera a alguien, la conversación', () => {
    expect(vistaDelProgreso({ sinEmpezar: null, lanzadaPorElStudio: true, conversacion: { turnos: [{}], espera: null } })).toBe('chat');
    expect(vistaDelProgreso({ sinEmpezar: null, lanzadaPorElStudio: true, conversacion: { turnos: [], espera: { quien: 'modelo' } } })).toBe('chat');
  });
  it('solo si nadie la lanzó desde el Studio (la sesión del director revisa a mano), el texto de la sesión', () => {
    expect(vistaDelProgreso({ sinEmpezar: null, lanzadaPorElStudio: false, conversacion: null })).toBe('desdeSuSesion');
    expect(vistaDelProgreso({ sinEmpezar: null, lanzadaPorElStudio: false, conversacion: undefined })).toBe('desdeSuSesion');
  });
  it('la página lo usa: lanzada por el Studio es la revisión con su lanzamiento, o lo urgente ya lanzado', () => {
    const pintar = leer('app.ts').match(/function pintarProgreso\(trabajando: boolean\) \{[\s\S]*?\n\}\n/)?.[0] ?? '';
    expect(pintar).toContain('const vista = vistaDelProgreso({ sinEmpezar, lanzadaPorElStudio: urgente || !!d.revision?.lanzada, conversacion });');
    expect(pintar).not.toContain('conversacion === null || conversacion === undefined');
  });
});

describe('un clic fuera de la ventana la cierra (nota del titular nmw10oqgstit)', () => {
  const fuera = { dentro: false, empezoDentro: false, enAtajo: false, enAutorizar: false, enDialogo: false, sigueEnLaPagina: true };

  it('abierta y a la vista, un clic en cualquier otra parte de la página la cierra', () => {
    expect(cierraConClicFuera(true, fuera)).toBe(true);
  });

  it('dentro de ella, en su atajo, en autorizar o en un diálogo encima, no', () => {
    expect(cierraConClicFuera(true, { ...fuera, dentro: true })).toBe(false);
    expect(cierraConClicFuera(true, { ...fuera, enAtajo: true })).toBe(false);
    expect(cierraConClicFuera(true, { ...fuera, enAutorizar: true })).toBe(false);
    expect(cierraConClicFuera(true, { ...fuera, enDialogo: true })).toBe(false);
  });

  it('apretar dentro y soltar fuera (arrastrar la división) no es un clic fuera, ni lo que un repintado quitó de la página', () => {
    expect(cierraConClicFuera(true, { ...fuera, empezoDentro: true })).toBe(false);
    expect(cierraConClicFuera(true, { ...fuera, sigueEnLaPagina: false })).toBe(false);
  });

  it('si no se ve, no hay nada que cerrar', () => {
    expect(cierraConClicFuera(false, fuera)).toBe(false);
  });

  it('la página la cierra con esa regla, después del atajo, y olvida que estaba abierta', () => {
    const director = leer('app.ts');
    expect(director).toContain("else if (t.closest('[data-progreso]')) abrirProgreso(abiertaTrasClic(progresoAbierto, progresoAbiertoEn, Date.now()));\n  else if (cierraConClicFuera(progresoVisible(), dondeCayo(t))) abrirProgreso(false);");
    expect(director).toContain("enAutorizar: !!t.closest('[data-autorizar-vivo]'),");
    expect(director).toContain("document.addEventListener('pointerdown', (e) => { apretoEnProgreso = !!(e.target as Element).closest?.('#progreso-director'); }, true);");
    // Cerrarla es abrirProgreso(false), que borra lo que recuerda la pestaña
    const abrir = director.match(/function abrirProgreso\(si: boolean\) \{[\s\S]*?\n\}\n/)?.[0] ?? '';
    expect(abrir).toContain('else sessionStorage.removeItem(CLAVE_PROGRESO);');
  });
});

describe('la revisión como un chat, con quién espera a quién (notas nmvx09it7tit y nmvx0q10ctit)', () => {
  const seg = (n: number) => new Date(Date.UTC(2026, 9, 31, 18, 0, n)).toISOString();
  const lleno = (x: unknown) => x as ConversacionDeRevision;
  const conversacion = leerConversacion();
  function leerConversacion() {
    const dice = (t: number, ...content: unknown[]) => JSON.stringify({ type: 'assistant', message: { id: `m${t}`, content }, parent_tool_use_id: null, timestamp: seg(t) });
    const vuelve = (t: number, id: string, content: string) => JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content }] }, parent_tool_use_id: null, timestamp: seg(t) });
    return conversacionDe(leerTurnos([
      JSON.stringify({ type: 'studio', encargo: { cuando: seg(0) } }),
      dice(10, { type: 'text', text: 'Corro las pruebas.' }, { type: 'tool_use', id: 'a', name: 'Bash', input: { command: 'npm test', description: 'Run the tests' } }),
      vuelve(40, 'a', `línea 1\nlínea 2\nlínea 3\n${'x'.repeat(30)}`),
      dice(45, { type: 'text', text: 'Listas.' }, { type: 'tool_use', id: 'b', name: 'Read', input: { file_path: 'C:\\x\\app.ts' } }),
    ].join('\n')));
  }

  it('cada globo con la cara de quien habla, quién hace qué y de qué clase, y lo nuevo arriba (nmvxxg5wvtit)', () => {
    const html = chatDeRevision(conversacion);
    expect(html.indexOf('Pide leer app.ts')).toBeLessThan(html.indexOf('Pide correr: Run the tests'));
    expect(html).toContain('class="turno de-modelo clase-solicitud"');
    expect(html).toContain('class="turno de-computador clase-respuesta"');
    expect(html).toContain('<span class="globo-clase">El modelo solicita</span>');
    expect(html).toContain('<span class="globo-clase">El director responde</span>');
    expect(html).toContain('<span class="globo-clase">El director solicita</span>');
    // Las dos caras: la del director y la del modelo, sin chispa encima (nmvy3nroytit)
    expect(html).toContain('class="visor"');
    expect(html).not.toContain('chispa');
    expect(html.match(/turno-icono/g)!.length).toBeGreaterThan(4);
  });

  it('una pregunta del modelo se clasifica como pregunta; lo que dice sin preguntar, como respuesta', () => {
    const dice = (texto: string) => lleno({ ...conversacion, turnos: [{ id: 't1', de: 'modelo', a: 'computador', tipo: 'dice', texto, cuando: seg(1), tardoMs: null }], ayudantes: {} });
    expect(chatDeRevision(dice('¿Sigo con esto?'))).toContain('<span class="globo-clase">El modelo pregunta</span>');
    expect(chatDeRevision(dice('Listo.'))).toContain('<span class="globo-clase">El modelo responde</span>');
  });

  it('cada tiempo, en el globo de quien se lo tomó (nmvy3jz2otit): 13 s del modelo, en el del modelo', () => {
    const globoDe = (html: string, frase: string) => {
      const inicio = html.lastIndexOf('<li class="turno', html.indexOf(frase));
      return html.slice(inicio, html.indexOf('</li>', inicio));
    };
    const trece = conversacionDe(leerTurnos([
      JSON.stringify({ type: 'studio', encargo: { cuando: seg(0) } }),
      JSON.stringify({ type: 'assistant', message: { id: 'm', content: [{ type: 'tool_use', id: 'a', name: 'Read', input: { file_path: 'a.ts' } }] }, parent_tool_use_id: null, timestamp: seg(13) }),
      JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'a', content: 'texto' }] }, parent_tool_use_id: null, timestamp: seg(15) }),
    ].join('\n')));
    const html = chatDeRevision(trece);
    const delModelo = globoDe(html, 'Pide leer a.ts');
    expect(delModelo).toContain('turno de-modelo');
    expect(delModelo).toContain('data-titulo="El modelo tardó 13 s en responder"');
    const delDirector = globoDe(html, 'Responde a «a.ts»');
    expect(delDirector).toContain('turno de-computador');
    expect(delDirector).toContain('data-titulo="El director tardó 2 s"');
    // Quien solo da el encargo no tardó nada
    expect(globoDe(html, 'Le da el encargo de la revisión.')).not.toContain('globo-tardo');
    // Y lo mismo con la que se viene mostrando
    const otra = chatDeRevision(conversacion);
    expect(otra).toContain('data-titulo="El director tardó 30 s"');
    expect(otra).toContain('data-titulo="El modelo tardó 5 s en responder"');
    expect(otra).toContain('data-titulo="El modelo tardó 10 s en responder"');
  });

  it('cada globo del modelo dice, chico, cuántos tokens leyó de la caché, una vez por llamada (nmw5wu6gttit)', () => {
    const usoCache = { input_tokens: 5, cache_creation_input_tokens: 10, cache_read_input_tokens: 12345, output_tokens: 7 };
    const conv = conversacionDe(leerTurnos([
      JSON.stringify({ type: 'studio', encargo: { cuando: seg(0) } }),
      JSON.stringify({ type: 'assistant', message: { id: 'm1', usage: usoCache, content: [{ type: 'text', text: 'Voy a leer.' }] }, parent_tool_use_id: null, timestamp: seg(3) }),
      JSON.stringify({ type: 'assistant', message: { id: 'm1', usage: usoCache, content: [{ type: 'tool_use', id: 'a', name: 'Read', input: { file_path: 'a.ts' } }] }, parent_tool_use_id: null, timestamp: seg(3) }),
    ].join('\n')));
    const turnos = conv.turnos.filter((x) => x.de === 'modelo');
    expect(turnos.map((x) => x.cacheLeidos)).toEqual([12345, undefined]);
    const html = chatDeRevision(conv);
    expect(html.match(/globo-cache/g)).toHaveLength(1);
    // Con su parte del turno: 12.345 de 12.367 (nmw6se5vatit); nunca «100 %» si algo fue nuevo
    expect(turnos.map((x) => x.tokensLlamada)).toEqual([12367, undefined]);
    expect(html).toContain('>12.345 de la caché (99 %)<');
    expect(html).toContain('el 99 % de los 12.367 del turno (aproximado)');
    // Al pie, la conversación entera: nuevos frente a caché, aproximado y sin dinero (nmw6sdsuftit)
    expect(cuentaDeCache(conv)).toEqual({ nuevos: 22, cache: 12345 });
    expect(html).toContain('En toda la conversación: <b class="cifra-tokens">22</b> tokens nuevos y <b class="cifra-tokens">12.345</b> leídos de la caché (aproximado)');
    // Las cifras, en negrita y del color de lo resaltado (nmw6uup0atit), como las del marcador
    expect(readFileSync(new URL('./director.css', import.meta.url), 'utf8')).toContain('.banda-tokens .cifra-tokens, .resumen-cache .cifra-tokens { font-weight: 750; color: var(--acento-texto);');
    ponerIdioma('en');
    const enIngles = chatDeRevision(conv);
    expect(enIngles).toContain('>12,345 from cache (99%)<');
    expect(enIngles).toContain('In the whole conversation: <b class="cifra-tokens">22</b> new tokens and <b class="cifra-tokens">12,345</b> read from the cache (approximate)');
    ponerIdioma('es');
    expect([porcentajeDeCache(50, 100), porcentajeDeCache(100, 100), porcentajeDeCache(1, 1000), porcentajeDeCache(0, 10), porcentajeDeCache(5, undefined)]).toEqual([50, 100, 1, null, null]);
    // Sin caché leída, no hay etiqueta
    const sin = conversacionDe(leerTurnos([
      JSON.stringify({ type: 'studio', encargo: { cuando: seg(0) } }),
      JSON.stringify({ type: 'assistant', message: { id: 'm2', usage: { input_tokens: 1, output_tokens: 1 }, content: [{ type: 'text', text: 'Hola.' }] }, parent_tool_use_id: null, timestamp: seg(2) }),
    ].join('\n')));
    expect(chatDeRevision(sin)).not.toContain('globo-cache');
  });

  it('el pie suma lo mismo que la banda: también las llamadas sin globo, las de los ayudantes y la caché escrita (nmw77f74atit)', () => {
    const lineas = [
      JSON.stringify({ type: 'studio', encargo: { cuando: seg(0) } }),
      // Una llamada con globo, que escribe y lee caché
      JSON.stringify({ type: 'assistant', message: { id: 'm1', usage: { input_tokens: 10, cache_creation_input_tokens: 2000, cache_read_input_tokens: 50_000, output_tokens: 300 }, content: [{ type: 'text', text: 'Voy.' }] }, parent_tool_use_id: null, timestamp: seg(2) }),
      // Una que solo razona: no deja globo, pero cuenta
      JSON.stringify({ type: 'assistant', message: { id: 'm2', usage: { input_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 52_000, output_tokens: 900 }, content: [{ type: 'thinking', thinking: '…' }] }, parent_tool_use_id: null, timestamp: seg(4) }),
      JSON.stringify({ type: 'assistant', message: { id: 'm3', usage: { input_tokens: 3, cache_read_input_tokens: 1000, output_tokens: 20 }, content: [{ type: 'tool_use', id: 'ag', name: 'Agent', input: { description: 'x', prompt: 'y' } }] }, parent_tool_use_id: null, timestamp: seg(5) }),
      // Una de un ayudante: va en su propia conversación, sin tokens en su globo
      JSON.stringify({ type: 'assistant', message: { id: 'h1', usage: { input_tokens: 7, cache_creation_input_tokens: 4000, cache_read_input_tokens: 30_000, output_tokens: 400 }, content: [{ type: 'text', text: 'Leo.' }] }, parent_tool_use_id: 'ag', timestamp: seg(6) }),
    ];
    const conv = conversacionDe(leerTurnos(lineas.join('\n')));
    const total = (conv.tokens!.enviados + conv.tokens!.recibidos);
    const cuenta = cuentaDeCache(conv)!;
    expect(cuenta.nuevos + cuenta.cache).toBe(total);
    expect(cuenta.cache).toBe(133_000);
    // Antes, solo las llamadas con globo: m1 y m3, sin la que razonaba ni la del ayudante
    const soloGlobos = cuentaDeCache({ turnos: conv.turnos, ayudantes: conv.ayudantes });
    expect(soloGlobos!.cache).toBe(51_000);
    // Con el resultado final (lo que Claude Code informa de la revisión entera, también sus llamadas propias), lo mismo
    const conFinal = conversacionDe(leerTurnos([...lineas, JSON.stringify({ type: 'result', modelUsage: {
      'claude-opus-5-5': { inputTokens: 18, cacheCreationInputTokens: 2000, cacheReadInputTokens: 103_000, outputTokens: 1220 },
      'claude-sonnet-5-5': { inputTokens: 7, cacheCreationInputTokens: 4000, cacheReadInputTokens: 30_000, outputTokens: 400 },
      'claude-haiku-5-5': { inputTokens: 900, cacheCreationInputTokens: 0, cacheReadInputTokens: 0, outputTokens: 60 },
    } })].join('\n')));
    const final = cuentaDeCache(conFinal)!;
    expect(final.nuevos + final.cache).toBe(conFinal.tokens!.enviados + conFinal.tokens!.recibidos);
    expect(final).toEqual({ nuevos: 18 + 2000 + 1220 + 7 + 4000 + 400 + 900 + 60, cache: 133_000 });
    expect(chatDeRevision(conFinal)).toContain('<b class="cifra-tokens">133.000</b> leídos de la caché');
  });

  it('el primer globo de la revisión es el que le pide planear, y en el historial también (nmvybx5rctit)', () => {
    const entera = conversacionDe(leerRevisionEntera(
      JSON.stringify({ type: 'studio', encargo: { cuando: seg(0), paraPlanear: true } }),
      [JSON.stringify({ type: 'studio', primerTiempo: { ok: true, encargos: 2, minutos: 1 } }), JSON.stringify({ type: 'studio', encargo: { cuando: seg(60) } })].join('\n'),
    ));
    for (const html of [chatDeRevision(entera), chatDeRevision({ ...entera, espera: null }, new Set(), { vivo: false })]) {
      const orden = ['Le pide planear la revisión.', 'Entrega el plan de la revisión, con 2 encargos.', 'Le da el encargo de la revisión.'].map((x) => html.indexOf(x));
      // Lo más nuevo arriba: el encargo de la revisión, su plan y, abajo de todo, lo que se le pidió primero
      expect(orden.every((x) => x >= 0)).toBe(true);
      expect(orden[2]).toBeLessThan(orden[1]);
      expect(orden[1]).toBeLessThan(orden[0]);
    }
    ponerIdioma('en');
    try {
      expect(chatDeRevision(entera)).toContain('Asks it to plan the review.');
    } finally {
      ponerIdioma('es');
    }
  });

  it('quién está esperando, con su cronómetro: el modelo pidió leer y el director aún no responde', () => {
    const html = chatDeRevision(conversacion);
    expect(html).toContain('El modelo espera al director (app.ts):');
    expect(html).toContain(`data-crono="${seg(45)}"`);
    expect(relojDesde(0)).toBe('0:00');
    expect(relojDesde(75_000)).toBe('1:15');
    expect(relojDesde(3_725_000)).toBe('1:02:05');
    // Terminada, nadie espera
    expect(chatDeRevision({ ...conversacion, espera: null })).not.toContain('data-crono');
  });

  it('un clic abre solo ese globo: son un acordeón, y lo que abriste sigue abierto al repintar', () => {
    const respuesta = conversacion.turnos.find((x) => x.tipo === 'responde')!;
    expect(chatDeRevision(conversacion)).toContain(`<details class="globo" name="globos-revision" data-turno-abrir="${respuesta.id}">`);
    expect(chatDeRevision(conversacion, new Set([respuesta.id]))).toContain(`<details class="globo" name="globos-revision" data-turno-abrir="${respuesta.id}" open>`);
    // Todos los de la conversación, en el mismo acordeón
    const html = chatDeRevision(conversacion);
    expect((html.match(/<details class="globo"/g) ?? []).length).toBe((html.match(/name="globos-revision"/g) ?? []).length);
    // El encargo no tiene más que decir: es un globo sin abrir
    expect(html).toContain('<div class="globo sin-detalle">');
  });

  it('lo de un ayudante sigue a mano, adentro de su globo y en su propio acordeón; los mensajes más viejos se cuentan', () => {
    const conAyudante = lleno({ ...conversacion, omitidos: 3, turnos: [{ id: 't1', de: 'modelo', a: 'computador', tipo: 'pide', herramienta: 'Agent', detalle: 'Lee', texto: 'Lee', cuando: seg(1), tardoMs: 2000, ayudante: 'h' }, { id: 't3', de: 'computador', a: 'modelo', tipo: 'responde', herramienta: 'Agent', detalle: 'Lee', texto: 'Listo', cuando: seg(9), tardoMs: 8000 }], ayudantes: { h: [{ id: 't2', de: 'ayudante', a: 'computador', tipo: 'dice', texto: 'Leo.', cuando: seg(2), tardoMs: null }] } });
    const html = chatDeRevision(conAyudante);
    expect(html).toContain('data-titulo="El modelo tardó 2 s en responder"');
    expect(html).toContain('data-titulo="El ayudante tardó 8 s"');
    expect(html).toContain('Lo que hizo el ayudante (un mensaje)');
    expect(html).toContain('class="turno de-ayudante clase-respuesta"');
    expect(html).toContain('<details class="globo" name="globos-revision" data-turno-abrir="t1">');
    expect(html).toContain('3 mensajes más viejos');
  });

  it('un color por personaje, de su lado, hasta un 70 % y con la puntica hacia su cara (nmvyr1fpvtit)', () => {
    const css = leer('director.css');
    expect(css).toContain('.turno.de-modelo { --tono: #f2b84b; }');
    expect(css).toContain('.turno.de-ayudante { --tono: #3fbf95; }');
    expect(css).toContain('.turno.con-error { --tono: var(--peligro); }');
    // Ya no por lo que dice
    expect(css).not.toMatch(/\.turno\.clase-\w+ \{ --tono/);
    expect(css).toMatch(/\.globo \{[^}]*flex: 0 1 auto;[^}]*max-width: 70%;/);
    expect(css).toMatch(/\.turno\.de-modelo, \.turno\.de-ayudante \{ flex-direction: row-reverse; \}/);
    expect(css).toMatch(/\.globo::before \{[^}]*left: -7px;[^}]*background: inherit;/);
    expect(css).toMatch(/\.turno\.de-modelo > \.globo::before, \.turno\.de-ayudante > \.globo::before \{[^}]*right: -7px;/);
  });

  describe('lo pedido a la vez va en un globo, y lo que vuelve, en otro (nmvzirz2ctit)', () => {
    // Como el registro de verdad: un mensaje del modelo con tres pedidos, cada bloque en su evento e intercalado con su resultado
    const pide = (t: number, id: string, archivo: string) => JSON.stringify({ type: 'assistant', message: { id: 'm1', content: [{ type: 'tool_use', id, name: 'Read', input: { file_path: archivo } }] }, parent_tool_use_id: null, timestamp: seg(t) });
    const vuelve = (t: number, id: string, error = false) => JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content: 'texto', is_error: error }] }, parent_tool_use_id: null, timestamp: seg(t) });
    const lote = conversacionDe(leerTurnos([
      JSON.stringify({ type: 'studio', encargo: { cuando: seg(0) } }),
      pide(10, 'a', 'uno.ts'), vuelve(11, 'a'),
      pide(12, 'b', 'dos.ts'), vuelve(13, 'b'),
      pide(14, 'c', 'tres.ts'), vuelve(15, 'c', true),
      JSON.stringify({ type: 'assistant', message: { id: 'm2', content: [{ type: 'text', text: 'Listo.' }] }, parent_tool_use_id: null, timestamp: seg(20) }),
    ].join('\n')));

    it('un mensaje con varios pedidos da una solicitud y una respuesta, en el orden del registro', () => {
      const globos = globosDeTurnos(lote.turnos);
      expect(globos.map((g) => g.length)).toEqual([1, 3, 3, 1]);
      expect(globos.map((g) => g[0].tipo)).toEqual(['encargo', 'pide', 'responde', 'dice']);
      const html = chatDeRevision({ ...lote, espera: null }).replace(/<[^>]*>/g, '|');
      expect(html).toContain('El modelo solicita 3 cosas');
      expect(html).toContain('uno.ts · dos.ts · tres.ts');
      expect(html).toContain('El director responde 3');
      // Lo más nuevo arriba: lo que dijo después, la respuesta y, abajo, lo pedido
      expect(html.indexOf('Listo.')).toBeLessThan(html.indexOf('El director responde 3'));
      expect(html.indexOf('El director responde 3')).toBeLessThan(html.indexOf('El modelo solicita 3 cosas'));
    });

    it('se abre con un clic a su lista, con el tiempo de cada uno, y si uno falló el globo lo dice', () => {
      const html = chatDeRevision({ ...lote, espera: null });
      const grande = html.slice(html.indexOf('El director responde 3'));
      expect(html).toContain('Pide leer tres.ts');
      expect(html).toContain('Responde con un error a «tres.ts»');
      expect(html).toContain('name="globos-revision-t');
      expect(html).toMatch(/class="turno de-computador clase-respuesta con-error"/);
      expect(grande).toContain('data-titulo="El director tardó 3 s"');
      // Abrir un lote sigue abierto al repintar, y su globo es uno solo del acordeón
      const id = globosDeTurnos(lote.turnos)[1][0].id;
      expect(chatDeRevision({ ...lote, espera: null }, new Set([id]))).toContain(`data-turno-abrir="${id}" open>`);
    });

    it('sale una sola vez: si llega otro del mismo lote, el globo crece sin nacer de nuevo', () => {
      const parte = { ...lote, espera: null, turnos: lote.turnos.slice(0, 2) };
      const e = globosDeInicio();
      revelarGlobos(parte, e, 1000);
      const conMas = revelarGlobos({ ...lote, espera: null, turnos: lote.turnos.slice(0, 4) }, e, 2000);
      // Lo nuevo es la respuesta, no el mismo pedido otra vez
      expect([...conMas.nuevos]).toEqual([lote.turnos[2].id]);
      expect(lote.turnos[2].tipo).toBe('responde');
    });

    it('los lotes de otro mensaje no se juntan, y un pedido solo sigue siendo un globo normal', () => {
      const dos = conversacionDe(leerTurnos([pide(10, 'a', 'uno.ts'), vuelve(11, 'a'), JSON.stringify({ type: 'assistant', message: { id: 'm2', content: [{ type: 'tool_use', id: 'd', name: 'Read', input: { file_path: 'cuatro.ts' } }] }, parent_tool_use_id: null, timestamp: seg(12) }), vuelve(13, 'd')].join('\n')));
      expect(globosDeTurnos(dos.turnos).map((g) => g.length)).toEqual([1, 1, 1, 1]);
      expect(chatDeRevision({ ...dos, espera: null })).not.toContain('cosas');
    });
  });

  describe('la lista se mueve suave, y quien se fue a leer se queda donde está (nmvziozqbtit)', () => {
    it('sale un globo cada segundo y medio, y la lista baja en un segundo', () => {
      const css = leer('director.css');
      expect(PASO_GLOBO_MS).toBe(1500);
      expect(css).toContain('.chat-revision > .turno.nace ~ li { animation: lista-baja 1s');
      expect(css).toContain('from { transform: translateY(calc(-1 * var(--alto-nace, 0px))); }');
    });

    it('quien se fue a leer mantiene su lugar y ve el botón; el historial no lo lleva', () => {
      expect(sigueLaPunta(0)).toBe(true);
      expect(sigueLaPunta(39)).toBe(true);
      expect(sigueLaPunta(40)).toBe(false);
      // Con lo nuevo entrando por arriba, lo que lee sigue en su lugar
      expect(desplazamientoTrasPintar({ desplazamiento: 300, alto: 700 }, 760)).toBe(360);
      const html = chatDeRevision(conversacion);
      expect(html).toContain('data-ir-a-la-punta hidden');
      expect(html).toContain('Ir a donde va la conversación');
      expect(html.indexOf('data-ir-a-la-punta')).toBeLessThan(html.indexOf('<li class="turno '));
      expect(chatDeRevision(conversacion, new Set(), { vivo: false })).not.toContain('data-ir-a-la-punta');
      const app = leer('app.ts').replace(/\r\n/g, '\n');
      expect(app).toContain('if (boton) boton.hidden = sigueLaPunta(lista.scrollTop);');
      const pintar = app.match(/function pintarProgreso\(trabajando: boolean\) \{[\s\S]*?\n\}\n/)?.[0] ?? '';
      expect(pintar).toContain('if (naciendo && sigueLaPunta(nueva.scrollTop)) {');
      expect(pintar).toContain('marcarPunta(nueva);');
      expect(app).toContain("behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'");
    });

    it('con «menos movimiento» o la pestaña sin mirar, lo nuevo se ve de una vez', () => {
      const e = globosDeInicio();
      revelarGlobos(conversacion, e, 1000);
      const turno = (id: string) => ({ ...conversacion.turnos[0], id });
      const de = revelarGlobos({ ...conversacion, espera: null, turnos: [...conversacion.turnos, turno('x'), turno('y')] }, e, 1100, true);
      expect(de).toEqual({ ocultos: new Set(), nuevos: new Set(), naceHace: 0, proximoEn: null });
    });
  });

  it('los globos salen de a uno, en su orden, cada segundo, aunque hayan llegado varios juntos (nmvyr3syltit, nmvziozqbtit)', () => {
    const css = leer('director.css');
    expect(PASO_GLOBO_MS).toBe(1500);
    expect(css).toContain('.turno.nace > .globo { transform-origin: var(--origen-globo); animation: globo-nace 1s');
    expect(css).toMatch(/\.turno\.nace > \.globo, [^{]*\{ animation: none; \}/);
    const e = globosDeInicio();
    // La primera pintada de un historial no espera ni anima: lo que ya estaba, ya estaba
    expect(revelarGlobos(conversacion, e, 1000)).toEqual({ ocultos: new Set(), nuevos: new Set(), naceHace: 0, proximoEn: null });
    // Llegan tres en el mismo segundo
    const turno = (id: string) => ({ ...conversacion.turnos[0], id });
    const mas = { ...conversacion, espera: null, turnos: [...conversacion.turnos, turno('a'), turno('b'), turno('c')] };
    const uno = revelarGlobos(mas, e, 2000);
    expect([...uno.nuevos]).toEqual(['a']);
    expect([...uno.ocultos]).toEqual(['b', 'c']);
    expect(uno.proximoEn).toBe(PASO_GLOBO_MS);
    const html = chatDeRevision(mas, new Set(), { nuevos: uno.nuevos, ocultos: uno.ocultos });
    expect(html.match(/ nace"/g)?.length).toBe(1);
    expect(html.match(/<li class="turno /g)?.length).toBe(mas.turnos.length - 2);
    // Repintar antes de su segundo no adelanta al siguiente, y sigue la animación donde iba
    const medio = revelarGlobos(mas, e, 2200);
    expect([...medio.nuevos]).toEqual(['a']);
    expect(medio.naceHace).toBe(200);
    expect(medio.proximoEn).toBe(1300);
    expect(chatDeRevision(mas, new Set(), { nuevos: medio.nuevos, ocultos: medio.ocultos, naceHace: medio.naceHace })).toContain('style="--nace-hace:-200ms"');
    // Pasado el segundo, el siguiente; el último ya no deja nada por pintar
    expect([...revelarGlobos(mas, e, 3500).nuevos]).toEqual(['b']);
    const fin = revelarGlobos(mas, e, 5000);
    expect([...fin.nuevos]).toEqual(['c']);
    expect(fin.ocultos.size).toBe(0);
    expect(fin.proximoEn).toBeNull();
    expect(revelarGlobos(mas, e, 6600)).toEqual({ ocultos: new Set(), nuevos: new Set(), naceHace: 0, proximoEn: null });
    // Quien tiene el turno espera a que salgan los anteriores, y la banda sigue con la cuenta real
    const espera = { ...mas, turnos: [...mas.turnos, turno('d')], espera: { quien: 'modelo' as const, desde: seg(50) } };
    const conEspera = revelarGlobos(espera, e, 8000);
    expect([...conEspera.nuevos]).toEqual(['d']);
    expect(chatDeRevision(espera, new Set(), { nuevos: conEspera.nuevos, ocultos: conEspera.ocultos })).not.toContain('turno esperando');
    // Y el lado activo sigue al último globo a la vista (aquí el de «d», que es del director); al salir la espera, la suya
    expect(chatDeRevision(espera, new Set(), { nuevos: conEspera.nuevos, ocultos: conEspera.ocultos })).toContain('banda-lado de-computador tiene-turno');
    expect(chatDeRevision(espera, new Set(), { nuevos: new Set(), ocultos: new Set() })).toContain('banda-lado de-modelo tiene-turno');
    // Con «menos movimiento», o sin mirar la pestaña, de una vez
    const otra = globosDeInicio();
    revelarGlobos(conversacion, otra, 1000);
    expect(revelarGlobos(mas, otra, 2000, true)).toEqual({ ocultos: new Set(), nuevos: new Set(), naceHace: 0, proximoEn: null });
    const pintar = leer('app.ts').match(/function pintarProgreso\(trabajando: boolean\) \{[\s\S]*?\n\}\n/)?.[0] ?? '';
    expect(pintar).toContain('revelarGlobos(conversacion, globos, ahoraChat, sinMovimiento || document.hidden)');
    expect(pintar).toContain('if (proximoEn !== null) siguienteGlobo = setTimeout(() => pintarProgreso(trabajando), proximoEn);');
    // Y un historial se abre entero, sin esperar a nadie
    expect(chatDeRevision(mas, new Set(), { vivo: false })).not.toContain(' nace"');
  });

  describe('el lado activo y los tokens siguen a los globos que se ven, no a lo que pasó de verdad (nota nmw5mogqotit)', () => {
    const turno = (id: string, de: 'computador' | 'modelo') => ({ ...conversacion.turnos[0], id, de, lote: undefined });
    const dos = { ...conversacion, turnos: [turno('a', 'computador'), turno('b', 'modelo')], espera: { quien: 'computador' as const, desde: seg(50) } };
    const banda = (html: string) => html.slice(html.indexOf('<div class="banda-reloj"'));

    it('el lado activo cambia justo cuando aparece el globo del otro', () => {
      // Ya pasó todo (la espera es del director), pero solo se ve el globo «a»: activo, el director
      expect(ladoDeLosGlobos(dos, new Set(['b', 'espera:computador:' + seg(50)]))).toBe('computador');
      // Sale «b»: pasa al modelo, y los demás se ponen en gris
      expect(ladoDeLosGlobos(dos, new Set(['espera:computador:' + seg(50)]))).toBe('modelo');
      // Sale la espera: le toca al director
      expect(ladoDeLosGlobos(dos, new Set())).toBe('computador');
      // Nada a la vista, o nadie con el turno: ninguno
      expect(ladoDeLosGlobos(dos, new Set(['a', 'b', 'espera:computador:' + seg(50)]))).toBeNull();
      expect(ladoDeLosGlobos({ ...dos, espera: null })).toBeNull();
      const html = (ocultos: string[]) => banda(chatDeRevision(dos, new Set(), { ocultos: new Set(ocultos) }));
      expect(html(['b', 'espera:computador:' + seg(50)])).toContain('banda-lado de-computador tiene-turno');
      expect(html(['b', 'espera:computador:' + seg(50)])).toContain('banda-lado de-modelo sin-turno');
      expect(html(['espera:computador:' + seg(50)])).toContain('banda-lado de-modelo tiene-turno');
      expect(html(['espera:computador:' + seg(50)])).toContain('banda-lado de-computador sin-turno');
    });

    it('los globos salen cada 1500 ms, pase lo que pase con las respuestas reales', () => {
      expect(PASO_GLOBO_MS).toBe(1500);
      const e = globosDeInicio();
      e.vistos.add('previo');
      const t0 = 10_000;
      const salio = (ahora: number) => [...revelarGlobos(dos, e, ahora).nuevos];
      expect(salio(t0)).toEqual(['a']);
      expect(salio(t0 + 1499)).toEqual(['a']);
      expect(salio(t0 + 1500)).toEqual(['b']);
      expect(salio(t0 + 2999)).toEqual(['b']);
      expect(salio(t0 + 3000)).toEqual(['espera:computador:' + seg(50)]);
    });

    it('los tokens de un lado no se mueven mientras está inactivo, y suben, sin pasarse, mientras está activo', () => {
      const real = { enviados: 1000, recibidos: 500 };
      const inicio = avanzarTokens(null, { enviados: 100, recibidos: 50 }, null, 0);
      expect(inicio).toEqual({ enviados: 100, recibidos: 50, ahora: 0 });
      // Activo el modelo: sube solo lo recibido; lo enviado se queda
      let t: TokensDeBanda = inicio;
      for (let ms = 16; ms <= 800; ms += 16) t = avanzarTokens(t, real, 'modelo', ms);
      expect(t.enviados).toBe(100);
      expect(t.recibidos).toBeGreaterThan(50);
      expect(t.recibidos).toBeLessThanOrEqual(500);
      // Pasa al director: lo recibido queda quieto, lo enviado sube
      const quieto = t.recibidos;
      for (let ms = 816; ms <= 1600; ms += 16) t = avanzarTokens(t, real, 'computador', ms);
      expect(t.recibidos).toBe(quieto);
      expect(t.enviados).toBeGreaterThan(100);
      // Sin nadie activo, nada se mueve; con tiempo de sobra, llega exacto y nunca se pasa
      expect(avanzarTokens(t, real, null, 5000)).toMatchObject({ enviados: t.enviados, recibidos: quieto });
      for (let ms = 1616; ms <= 20_000; ms += 16) t = avanzarTokens(t, real, 'computador', ms);
      expect(t.enviados).toBe(1000);
      expect(t.recibidos).toBe(quieto);
      expect(tokensAlDia(t, real, 'computador')).toBe(true);
      expect(tokensAlDia(t, real, 'modelo')).toBe(false);
      // Un salto grande entre cálculos (pestaña dormida) no los dispara de golpe
      expect(avanzarTokens({ enviados: 0, recibidos: 0, ahora: 0 }, { enviados: 1000, recibidos: 0 }, 'computador', 60_000).enviados).toBeLessThan(250);
      // Si lo real baja (otra conversación), se ajusta
      expect(avanzarTokens(t, { enviados: 10, recibidos: 10 }, 'modelo', 21_000)).toMatchObject({ enviados: 10, recibidos: 10 });
      // La banda pinta lo mostrado, no lo real
      const conTokens = { ...dos, tokens: { enviados: 1000, recibidos: 500 } };
      const html = banda(chatDeRevision(conTokens, new Set(), { tokens: { enviados: 100, recibidos: 50, ahora: 0 } }));
      expect(html).toContain('<span class="cifra-tokens" data-cuenta="enviados">100</span>');
      expect(html).toContain('<span class="cifra-tokens" data-cuenta="recibidos">50</span>');
    });
  });

  describe('la cara de quien trabaja se anima, en la banda y en la línea de ahora (nmvy3m9rjtit, nmvy4it8etit)', () => {
    const conTurno = (quien: 'computador' | 'modelo') => ({ ...conversacion, espera: { quien, desde: seg(50) } });
    const banda = (html: string) => html.slice(html.indexOf('<div class="banda-reloj"'));

    it('en la línea de ahora y en su lado de la banda, solo la suya, y pasa al otro con el turno', () => {
      for (const [quien, otro] of [['computador', 'modelo'], ['modelo', 'computador']] as const) {
        const html = chatDeRevision(conTurno(quien), new Set(), { ahora: 5000 });
        expect(html).toMatch(new RegExp(`class="turno esperando de-${quien}"><span class="turno-icono cara-chat" style="animation-delay:-200ms">`));
        expect(banda(html)).toMatch(new RegExp(`banda-lado de-${quien} tiene-turno"><span class="cara-chat" data-titulo="[^"]*" style="animation-delay:-200ms">`));
        expect(banda(html)).toMatch(new RegExp(`banda-lado de-${otro} sin-turno"><span class="cara-chat" data-titulo="[^"]*">`));
        expect(html.match(/animation-delay/g)).toHaveLength(2);
      }
      // En el historial nadie trabaja
      expect(chatDeRevision(conTurno('modelo'), new Set(), { vivo: false })).not.toContain('animation-delay');
    });

    it('repintar sigue donde iba: la vuelta sale del reloj, no de cuándo se pintó', () => {
      expect(DURA_CARA).toBe(2400);
      expect(caraQueTrabaja(0)).toContain('-0ms');
      expect(caraQueTrabaja(DURA_CARA + 300)).toContain('-300ms');
      expect(leer('director.css')).toContain(`animation: cara-trabaja ${DURA_CARA / 1000}s ease-in-out infinite;`);
    });

    it('crece, decrece y se mece, con suavidad; ya no hay relojito, ni lo que cae, ni chispa', () => {
      const css = leer('director.css');
      const giro = css.match(/@keyframes cara-trabaja \{[\s\S]*?\n\}/)?.[0] ?? '';
      expect(giro).toMatch(/scale\(1\.12\)/);
      expect(giro).toMatch(/rotate\(-4deg\)/);
      expect(css).toContain('.turno.esperando > .turno-icono, .banda-lado.tiene-turno .cara-chat {');
      for (const archivo of ['director.css', 'progresoVivo.ts', 'cara.ts']) expect(leer(archivo)).not.toMatch(/relojito|manecilla|class="cae"|\.cae\b|cae-sobre|DURA_CAE|\.chispa|class="chispa"|banda-lado\.sube|' sube'/);
    });
  });

  it('los globos y las tarjetas de abajo, sin borde: los distingue su fondo (nmvy3nroytit)', () => {
    const regla = (selector: string) => leer('director.css').split('\n').find((l) => l.startsWith(`${selector} {`)) ?? '';
    for (const selector of ['.globo', '.banda-lado', '.banda-lado.tiene-turno', '.turno.esperando > .globo']) {
      expect(regla(selector), selector).toContain('background');
      expect(regla(selector), selector).not.toMatch(/border(-color|-style)?:/);
    }
  });

  describe('la banda, como un reloj de ajedrez', () => {
    const banda = (c: ConversacionDeRevision, o?: Parameters<typeof chatDeRevision>[2]) => chatDeRevision(c, new Set(), o).slice(chatDeRevision(c, new Set(), o).indexOf('<div class="banda-reloj"'));
    const conTokens = (x: Partial<ConversacionDeRevision> = {}) => ({ ...conversacion, tokens: { enviados: 1200, recibidos: 340 }, ...x });
    const conNieve = (n: Partial<NonNullable<ConversacionDeRevision['nieve']>>, espera?: ConversacionDeRevision['espera']): ConversacionDeRevision => ({ ...conTokens(), nieve: { contexto: 0, cache: 0, llamadas: 3, resumenes: 0, ultimoResumen: null, ...n }, ...(espera === undefined ? {} : { espera }) });

    it('la avalancha del contexto, en una franja encima de los dos actores: la bola crece con lo que se le manda al modelo en cada turno, y la revisión siguiente empieza pequeña (pd_animacion_contexto, nmw2spfhvtit, nmw2spsestit)', () => {
      // Crece turno a turno con lo que se manda, hacia el pino del límite, sin salirse de la franja
      const chica = avalanchaDe(1200), media = avalanchaDe(40_000), grande = avalanchaDe(700_000);
      expect(chica.radio).toBeLessThan(media.radio);
      expect(media.radio).toBeLessThan(grande.radio);
      expect(chica.avance).toBeLessThan(media.avance);
      expect(avalanchaDe(0)).toEqual({ avance: 0, radio: AVALANCHA.radioMin });
      expect(avalanchaDe(5e6)).toEqual({ avance: 1, radio: AVALANCHA.radioMax });
      // Va justo encima de la banda de los dos actores, debajo de la conversación
      const html = chatDeRevision(conNieve({ contexto: 40_000 }));
      const franja = html.indexOf('<div class="avalancha');
      expect(franja).toBeGreaterThan(html.indexOf('</ol>'));
      expect(franja).toBeLessThan(html.indexOf('<div class="banda-reloj"'));
      expect(html).toContain(`--radio:${Math.round(media.radio * 10) / 10}px`);
      expect(html).toContain('Ahora: 40.000 tokens');
      // Terminada, queda en reposo con su tamaño; otra revisión, con lo suyo, vuelve a empezar pequeña
      const terminada = chatDeRevision(conNieve({ contexto: 40_000 }), new Set(), { vivo: false });
      expect(terminada).toContain(`--radio:${Math.round(media.radio * 10) / 10}px`);
      expect(terminada).toContain('class="avalancha escena-quieta"');
      expect(chatDeRevision(conNieve({ contexto: 900 }))).toContain(`--radio:${AVALANCHA.radioMin}px`);
      // Sin llamadas informadas, no hay bola que mostrar
      expect(chatDeRevision({ ...conversacion, nieve: undefined } as ConversacionDeRevision)).not.toContain('class="avalancha');
      expect(leer('director.css')).toContain('.avalancha-bola {');
    });

    it('la bola mide un 30 % más que antes, en su crecimiento y en su tamaño final (nmw5dgs3gtit)', () => {
      // Antes: radio de 9 a 24 px, lineal con el avance; ahora, 1,3 veces eso en cada momento
      const antes = (contexto: number) => 9 + (24 - 9) * avalanchaDe(contexto).avance;
      expect(AVALANCHA.radioMin).toBeCloseTo(9 * 1.3, 10);
      expect(AVALANCHA.radioMax).toBeCloseTo(24 * 1.3, 10);
      expect(avalanchaDe(40_000).radio).toBeCloseTo(antes(40_000) * 1.3, 10);
      expect(avalanchaDe(700_000).radio).toBeCloseTo(antes(700_000) * 1.3, 10);
      expect(avalanchaDe(5e6).radio).toBeCloseTo(24 * 1.3, 10);
    });

    it('la avalancha nunca se queda quieta: con las caras del chat (nmw46zhl5tit), la bola alcanza y apachurra al modelo, él forcejea y la lanza lejos hacia atrás con un rebote, y vuelve a perseguirlo, en una montaña nevada que baja de izquierda a derecha (nmw3sctymtit, nmw3se32utit, nmw3xxk15tit)', () => {
      const desde = '2026-11-05T16:00:00.000Z', ahora = Date.parse(desde) + 1500;
      // Mientras alguien tiene el turno, del modelo o de tu computador, la misma escena sin fin; sin turno, en reposo
      expect(escenaDeAvalancha({ espera: { quien: 'modelo', desde } }, true)).toBe('viva');
      expect(escenaDeAvalancha({ espera: { quien: 'computador', desde } }, true)).toBe('viva');
      expect(escenaDeAvalancha({ espera: { quien: 'ayudante', desde } }, true)).toBe('viva');
      expect(escenaDeAvalancha({ espera: { quien: 'modelo', desde } }, false)).toBe('quieta');
      expect(escenaDeAvalancha({ espera: null }, true)).toBe('quieta');
      const viva = avalanchaHtml(conNieve({ contexto: 40_000 }, { quien: 'modelo', desde }), true, ahora);
      expect(viva).toContain('class="avalancha escena-viva"');
      // Los personajes son las mismas caras del chat (nmw46zhl5tit): la del director dentro de la bola, y la del modelo, que
      // al quedar apachurrado aprieta los ojos
      const bola = viva.slice(viva.indexOf('<span class="avalancha-bola"'));
      expect(bola).toContain(`<span class="avalancha-director"><span class="cara-chat">${caraSVG('feliz')}</span></span>`);
      const modelo = viva.slice(viva.indexOf('<span class="avalancha-modelo"'), viva.indexOf('<span class="avalancha-esfuerzo"'));
      expect(modelo).toContain('<span class="cara-chat"><svg viewBox="0 20 100 88"');
      expect(modelo).toContain('<rect class="carcasa" x="6" y="27" width="88" height="74" rx="30"/>');
      expect(modelo).toMatch(/class="luz cara-feliz"[\s\S]*class="luz cara-apretada"/);
      // Los cubos de la estación 1 ya no van
      expect(viva).not.toContain('#c5d2e6');
      // La cara del modelo en el chat sigue igual, sin el gesto de apretar
      expect(caraDelModeloSVG()).not.toContain('cara-apretada');
      expect(caraDelModeloSVG()).toContain('<g class="luz"><path d="M33 60v2"/>');
      // Y con los colores del chat: la del modelo, los suyos
      expect(leer('director.css')).toContain('.avalancha-modelo .cara-chat .carcasa { fill: #e3e7fb; stroke: #bcc4ec; }');
      for (const parte of ['avalancha-fondo', 'avalancha-copos', 'avalancha-ladera', 'avalancha-esfuerzo', 'avalancha-golpe', 'avalancha-apretada']) expect(viva).toContain(parte);
      // El ciclo va atado a la hora: dos pintadas en el mismo instante del ciclo dan la misma fase, y sigue donde iba
      const fase = (h: string) => Number(h.match(/--fase:-(\d+)ms/)?.[1]);
      expect(fase(viva)).toBe(ahora % AVALANCHA.cicloMs);
      expect(fase(avalanchaHtml(conNieve({ contexto: 40_000 }, { quien: 'computador', desde }), true, ahora + AVALANCHA.cicloMs))).toBe(fase(viva));
      expect(viva).toContain(`--ciclo:${AVALANCHA.cicloMs}ms`);
      // La lanza más lejos cuanto más avanzó, sin pasarse, y sube por la ladera al ir hacia atrás
      const atras = (h: string) => Number(h.match(/--atras:(\d+)/)?.[1]);
      const tareas = (hechas: number) => avalanchaHtml(conNieve({ contexto: 40_000 }, { quien: 'modelo', desde }), true, ahora, null, { hechas, total: 6 });
      expect(atras(tareas(0))).toBe(22);
      expect(atras(tareas(6))).toBe(42);
      expect(tareas(3)).toMatch(/--sube:-\d/);
      // El recorrido avanza con los encargos hechos del plan; sin plan, con lo que crece la conversación
      expect(tareas(0)).toContain('--avance:0.000');
      expect(tareas(3)).toContain('--avance:0.500');
      expect(tareas(6)).toContain('--avance:1.000');
      expect(avanceDeTareas(null)).toBeNull();
      expect(avanceDeTareas({ hechas: 0, total: 0 })).toBeNull();
      expect(viva).toContain(`--avance:${avalanchaDe(40_000).avance.toFixed(3)}`);
      // La nieve de la caché va apretada en el centro
      const conCache = avalanchaHtml(conNieve({ contexto: 40_000, cache: 0.81 }, { quien: 'modelo', desde }), true, ahora);
      expect(conCache).toContain('--apretada:90%');
      expect(conCache).toContain('el 81 % de la caché');
      // Lo que dice al pasar el ratón, corto (nota de voz del titular nmw489ysjtit): qué representa y las cifras de ahora
      for (const dicho of [es['chat.avalancha'], en['chat.avalancha']] as string[]) {
        for (const x of ['{n}', '{cache}', '{llamadas}']) expect(dicho).toContain(x);
        expect(dicho.split(/\. /).length).toBeLessThanOrEqual(2);
        expect(dicho.length).toBeLessThan(240);
      }
      // Lejos del límite no hay pino; cerca, sí; y al resumirse, la bola se parte en trozos un rato
      expect(viva).not.toContain('avalancha-pino');
      expect(avalanchaHtml(conNieve({ contexto: 600_000 }), true, ahora)).toContain('avalancha-pino');
      const partida = avalanchaHtml(conNieve({ contexto: 30_000, resumenes: 1, ultimoResumen: new Date(ahora - 500).toISOString() }), true, ahora);
      expect(partida).toContain('avalancha-pino');
      expect(partida).toContain('class="avalancha-trozos" style="--hace:-500ms"');
      expect(avalanchaHtml(conNieve({ contexto: 30_000, resumenes: 1, ultimoResumen: new Date(ahora - 60_000).toISOString() }), true, ahora)).not.toContain('avalancha-trozos');
      // La hoja de estilos: cada parte de la escena viva va con el mismo ciclo, infinito, desde su fase
      const css = leer('director.css');
      for (const [parte, anim] of [['avalancha-nieve', 'av-rueda'], ['avalancha-modelo', 'av-modelo'], ['avalancha-modelo .cara-feliz', 'av-cara-feliz'], ['avalancha-modelo .cara-apretada', 'av-cara-apretada'], ['avalancha-esfuerzo i', 'av-sudor'], ['avalancha-golpe', 'av-golpe']]) {
        const re = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        expect(css, parte).toMatch(new RegExp(`${re(`.escena-viva .${parte} { animation: ${anim} var(--ciclo) `)}[a-z-]+${re(' var(--fase) infinite; }')}`));
        expect(css).toContain(`@keyframes ${anim} `);
      }
      // Sus cuatro momentos, en orden: persigue, la apachurra (el modelo aplastado), la lanza hacia atrás y rebota
      const bolaKf = css.slice(css.indexOf('@keyframes av-bola-y {'), css.indexOf('@keyframes av-modelo {'));
      const lejos = bolaKf.indexOf('calc(var(--lanza) * -1)'), encima = bolaKf.indexOf('calc(var(--radio) + 14px)');
      expect(encima).toBeGreaterThan(0);
      expect(lejos).toBeGreaterThan(encima);
      expect(css).toMatch(/@keyframes av-modelo \{[\s\S]*?scale\(1\.7, 0\.32\)/);
      // Nunca quieta: la nieve rueda, el modelo trota, la nieve cae y la montaña se desliza, todo infinito
      for (const anim of ['av-trote var(--ciclo) ease-in-out var(--fase) infinite', 'av-copos 7s linear infinite', 'av-fondo calc(4 * var(--ciclo)) linear var(--fase-fondo) infinite']) expect(css).toContain(anim);
      // La ladera baja de izquierda a derecha, y el grupo va parado sobre ella
      expect(css).toContain('clip-path: polygon(0 calc(100% - 8px - var(--pendiente)), 100% calc(100% - 8px)');
      expect(css).toContain('bottom: calc(8px + var(--pendiente) * (1 - var(--avance)))');
      // En reposo, la nieve sigue cayendo y el modelo respira
      expect(css).toContain('.escena-quieta .avalancha-modelo svg { animation: av-respira');
      // Con «reducir el movimiento», queda quieta; y se queda dentro de su franja
      expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\n  \.avalancha-bola, \.avalancha-modelo/);
      expect(css).toMatch(/\.avalancha \{[^}]*overflow: hidden/);
      expect(css).toMatch(/\.avalancha \{[^}]*container-type: inline-size/);
      // La repetición de un cuadro a otro no salta: la página conserva la fase del ciclo
      expect(leer('app.ts')).toContain("if (fase) estilo.setProperty('--fase', fase);");
    });

    it('la bola rueda con detalle: manchas, vetas y una marca que gira con la distancia que avanza, y vuelve al mismo ángulo en cada ciclo (nota de voz del 6 de noviembre de 2026)', () => {
      const css = leer('director.css');
      const nieve = css.match(/\.avalancha-nieve \{[^\n]*\}/)?.[0] ?? '';
      expect(nieve.match(/radial-gradient/g)!.length).toBeGreaterThanOrEqual(7);
      expect(nieve).toContain('conic-gradient(');
      const giro = css.match(/@keyframes av-rueda \{[\s\S]*?\n\}/)?.[0] ?? '';
      const angulos = [...giro.matchAll(/rotate: (-?\d+)deg/g)].map((m) => Number(m[1]));
      // Lo que gira hacia delante (de la cueva a la bola que llega) es lo que gira hacia atrás al ser arrojada
      expect(angulos.at(-1)).toBe(angulos[0]);
      expect(Math.min(...angulos)).toBeLessThan(angulos[0]);
      expect(Math.max(...angulos)).toBe(0);
    });

    it('arrojada hacia atrás cae con gravedad real: sube frenando, baja acelerando, dos o tres rebotes que se amortiguan, y rueda con inercia (aceleración y frenado suaves)', () => {
      const css = leer('director.css');
      const alto = css.match(/@keyframes av-bola-y \{[\s\S]*?\n\}/)?.[0] ?? '';
      // Las alturas de cada tope: el vuelo y los rebotes, cada uno más bajo que el anterior
      const topes = [...alto.matchAll(/translateY\(-(\d+(?:\.\d+)?)px\) scale\(1, 1\); animation-timing-function: cubic-bezier\(0\.11, 0, 0\.5, 0\)/g)].map((m) => Number(m[1]));
      expect(topes).toHaveLength(3);
      expect(topes[0]).toBeGreaterThan(topes[1]);
      expect(topes[1]).toBeGreaterThan(topes[2]);
      // Subida con ease-out cuadrático, bajada con ease-in cuadrático: parábola
      expect(alto.match(/cubic-bezier\(0\.5, 1, 0\.89, 1\)/g)!.length).toBeGreaterThanOrEqual(3);
      // Al caer se aplasta
      expect(alto).toMatch(/translateY\(0\) scale\(1\.14, 0\.86\)/);
      // La inercia: ninguna parte lineal de principio a fin; el avance en x arranca y frena con curvas
      const x = css.match(/@keyframes av-bola-x \{[\s\S]*?\n\}/)?.[0] ?? '';
      expect(x).toContain('cubic-bezier(0.5, 0, 1, 1)');
      expect(x).toContain('animation-timing-function: ease-out');
      expect(css).toContain('animation: av-bola-x var(--ciclo) linear var(--fase) infinite, av-bola-y var(--ciclo) linear var(--fase) infinite;');
      expect(css).not.toMatch(/@keyframes av-bola \{/);
    });

    it('al alcanzar al modelo no se detiene ni le salta encima: sigue rodando sin frenar, sube por encima mientras él se aplasta y se queda ahí hasta que la arroja (nmw5dku7utit)', () => {
      const css = leer('director.css');
      const x = css.match(/@keyframes av-bola-x \{[\s\S]*?\n\}/)?.[0] ?? '';
      // Hasta tocarlo (27 %), a velocidad pareja: sin la curva que la frenaba antes de llegar
      expect(x).toMatch(/0% \{ translate: [^}]*animation-timing-function: linear; \}/);
      // Solo frena ya encima, y ahí se queda (32 a 62 %)
      expect(x).toMatch(/27% \{ translate: -4px 0; animation-timing-function: ease-out; \}/);
      expect(x).toContain('32%, 62% { translate: calc(var(--radio) + 14px) 0;');
      // En vertical no se despega del suelo hasta que el modelo empieza a aplastarse (28 %, av-modelo)
      const y = css.match(/@keyframes av-bola-y \{[\s\S]*?\n\}/)?.[0] ?? '';
      expect(y).toContain('0%, 28% { transform: translateY(0) scale(1, 1);');
      expect(css).toMatch(/@keyframes av-modelo \{\n  0%, 28% \{ transform: none; \}/);
      // Y la nieve gira mientras rueda hasta quedar encima, no se queda quieta al tocarlo
      const giro = css.match(/@keyframes av-rueda \{[\s\S]*?\n\}/)?.[0] ?? '';
      expect(giro).toContain('27% { rotate: -60deg;');
      expect(giro).toContain('32%, 62% { rotate: 0deg;');
    });

    it('con la bola encima el modelo se detiene, y vuelve a avanzar después de arrojarla (nmw5gj40stit)', () => {
      const ciclo = AVALANCHA.cicloMs;
      const en = (u: number, vuelta = 0) => vuelta * ciclo + u * ciclo;
      // La bola está encima de que lo alcanza a que él la arroja
      expect(bolaEncima(en(0.1))).toBe(false);
      expect(bolaEncima(en(BAJO_LA_BOLA.desde))).toBe(true);
      expect(bolaEncima(en(0.5))).toBe(true);
      expect(bolaEncima(en(BAJO_LA_BOLA.hasta))).toBe(false);
      expect(bolaEncima(en(0.5, 7) + 1_000_000 * ciclo)).toBe(true);
      // Lo que lleva caminado sobre la montaña: avanza mientras persigue, no se mueve con la bola encima y avanza otra vez después
      const x = (u: number, vuelta = 0) => marchaDelModelo(en(u, vuelta));
      expect(x(0.2)).toBeGreaterThan(x(0.1));
      expect(x(0.3)).toBe(x(BAJO_LA_BOLA.desde));
      expect(x(0.45)).toBe(x(0.3));
      expect(x(0.65)).toBe(x(0.3));
      expect(x(0.7)).toBeGreaterThan(x(0.65));
      expect(x(0.99)).toBeGreaterThan(x(0.7));
      // Y en cada ciclo, un cuarto del tramo: la vuelta entera cierra donde empezó, sin salto
      expect(x(0, 1)).toBeCloseTo(1 / VUELTAS_FONDO, 6);
      expect(marchaDelModelo(VUELTAS_FONDO * ciclo)).toBe(0);
      // La montaña de director.css sigue esos mismos puntos (se desliza la mitad de su ancho por tramo)
      const css = leer('director.css');
      const fondo = css.match(/@keyframes av-fondo \{[\s\S]*?\n\}/)?.[0] ?? '';
      const puntos = [...fondo.matchAll(/(\d+(?:\.\d+)?)% \{ transform: translateX\((-?\d+(?:\.\d+)?)%\); \}/g)].map((m) => [Number(m[1]), Number(m[2])]);
      expect(puntos.length).toBe(13);
      for (const [p, v] of puntos) expect(v, `${p}%`).toBeCloseTo(p === 100 ? -50 : -50 * marchaDelModelo((p / 100) * VUELTAS_FONDO * ciclo), 2);
      // El trote se detiene con la bola encima: ningún salto entre que lo alcanza y que la arroja
      const trote = css.match(/@keyframes av-trote \{[\s\S]*?\n\}/)?.[0] ?? '';
      const saltos = (trote.match(/\n {2}([^{]+)\{ transform: translateY\(-1\.5px\)/)?.[1] ?? '').split(',').map((s) => Number(s.trim().replace('%', '')));
      expect(saltos.length).toBeGreaterThan(6);
      for (const s of saltos) expect(s < BAJO_LA_BOLA.desde * 100 || s > BAJO_LA_BOLA.hasta * 100, `${s}%`).toBe(true);
      // El dibujo lleva la fase de la montaña, atada a la hora como la del ciclo
      const viva = avalanchaHtml(conNieve({ contexto: 40_000 }, { quien: 'modelo', desde: '2026-11-05T16:00:00.000Z' }), true, en(0.5, 2));
      expect(viva).toContain(`--fase-fondo:-${Math.round(en(0.5, 2))}ms`);
    });

    it('lo que avanza el recorrido espera a que el modelo arroje la bola: con la bola encima, el avance recordado no sube (nmw5gj40stit)', () => {
      const ciclo = AVALANCHA.cicloMs;
      const desde = '2026-11-05T16:00:00.000Z';
      const avance = (h: string) => Number(h.match(/--avance:([\d.]+)/)?.[1]);
      let recuerdo = recordarAvance(null, 'p:1', 0.5, 0.1 * ciclo);
      // Termina un encargo mientras la bola está encima: no se mueve
      recuerdo = recordarAvance(recuerdo, 'p:1', 0.7, 0.4 * ciclo);
      expect(recuerdo.avance).toBe(0.5);
      expect(avance(avalanchaHtml(conNieve({ contexto: 4_000 }, { quien: 'modelo', desde }), true, 0.4 * ciclo, null, { hechas: 7, total: 10 }, recuerdo))).toBe(0.5);
      // Ya arrojada, avanza
      recuerdo = recordarAvance(recuerdo, 'p:1', 0.7, 0.7 * ciclo);
      expect(recuerdo.avance).toBe(0.7);
      expect(avance(avalanchaHtml(conNieve({ contexto: 4_000 }, { quien: 'modelo', desde }), true, 0.7 * ciclo, null, { hechas: 7, total: 10 }, recuerdo))).toBe(0.7);
      // La página le da la hora, y en la repetición el cuadro que llega con la bola encima conserva el avance
      const app = leer('app.ts');
      expect(app).toContain("avanceDeLaEscena(conversacion.nieve.contexto, 'viva', tareas), ahoraChat);");
      expect(app).toContain("if (repite && avance && bolaEncima(Date.now())) estilo.setProperty('--avance', avance);");
      expect(app).toContain("if (faseFondo) estilo.setProperty('--fase-fondo', faseFondo);");
    });

    it('el corte de cada tramo de montañas está en un punto bajo entre dos montañas, así nunca se ve una partida por la mitad', () => {
      const puntos = PUNTOS_MONTANA.split(' ').map((p) => p.split(',').map(Number));
      // Arriba de la base: sin el piso (y = 80), el primer y el último punto del perfil
      const perfil = puntos.filter(([, y]) => y < 80);
      const [primero, ultimo] = [perfil[0], perfil.at(-1)!];
      expect(primero[0]).toBe(0);
      expect(ultimo[0]).toBe(400);
      // Los dos bordes se encuentran a la misma altura (el siguiente tramo empieza donde este termina)
      expect(primero[1]).toBe(ultimo[1]);
      // Y es un valle: más bajo (y mayor) que sus vecinos más próximos, no media ladera
      expect(primero[1]).toBeGreaterThan(perfil[1][1]);
      expect(ultimo[1]).toBeGreaterThan(perfil.at(-2)![1]);
      // Cada tramo se dibuja con ese perfil, dos veces seguidas
      const viva = avalanchaHtml(conNieve({ contexto: 40_000 }, { quien: 'modelo', desde: '2026-11-05T16:00:00.000Z' }), true, 0);
      expect(viva.split(`points="${PUNTOS_MONTANA}"`)).toHaveLength(3);
    });

    it('al cerrar y volver a abrir el panel, los actores conservan su avance y el director nunca sale del cuadro al ser arrojado (nota de voz del 6 de noviembre de 2026)', () => {
      const desde = '2026-11-05T16:00:00.000Z';
      const con = (hechas: number | null, recuerdo: ReturnType<typeof recordarAvance> | null) => avalanchaHtml(conNieve({ contexto: 4_000 }, { quien: 'modelo', desde }), true, 0, null, hechas === null ? null : { hechas, total: 6 }, recuerdo);
      const avance = (h: string) => Number(h.match(/--avance:([\d.]+)/)?.[1]);
      // Mientras el panel estaba abierto, los actores llegaron a la mitad del recorrido
      let recuerdo = recordarAvance(null, 'p:1', avanceDeLaEscena(4_000, 'viva', { hechas: 3, total: 6 }));
      expect(avance(con(3, recuerdo))).toBe(0.5);
      // Se cierra (no se pinta) y se abre otra vez con el plan aún sin traer: no vuelven a la izquierda
      recuerdo = recordarAvance(recuerdo, 'p:1', avanceDeLaEscena(4_000, 'viva', null));
      expect(recuerdo.avance).toBe(0.5);
      expect(avance(con(null, recuerdo))).toBe(0.5);
      expect(avance(con(null, null))).toBeLessThan(0.5);
      // Un plan que reporta menos encargos hechos no los hace retroceder; uno que avanza sí los mueve
      expect(avance(con(1, recuerdo))).toBe(0.5);
      expect(avance(con(5, recuerdo))).toBeCloseTo(0.833, 3);
      expect(recordarAvance(recuerdo, 'p:1', 0.9).avance).toBe(0.9);
      // Otra revisión empieza de nuevo
      expect(recordarAvance(recuerdo, 'p:2', 0.1)).toEqual({ revision: 'p:2', avance: 0.1 });
      // La página lo recuerda en cada pintada y se lo pasa al dibujo
      const app = leer('app.ts');
      expect(app).toContain("avanceRecordado = recordarAvance(avanceRecordado, revisionEnPantalla(), avanceDeLaEscena(conversacion.nieve.contexto, 'viva', tareas), ahoraChat);");
      // Y la bola arrojada se queda dentro del cuadro: lo lejos que va no pasa de lo que cabe a la izquierda del modelo
      const css = leer('director.css');
      expect(css).toContain('--lanza: max(0px, min(calc(var(--atras) * 1cqw), calc(var(--izq) - 2 * var(--radio) - 10px)));');
      expect(css).toContain('left: var(--izq);');
      expect(css).not.toContain('var(--atras) * -1cqw');
    });

    it('con la revisión cerrada, «↻ Repetir la avalancha» la vuelve a mostrar con la misma escena y los tiempos guardados de sus turnos, de principio a fin (nmw3r7c5atit, nmw3xxk15tit)', () => {
      const t0 = Date.parse('2026-11-05T16:00:00.000Z');
      const turno = (i: number, de: 'modelo' | 'computador', tardoMs: number | null) => ({ id: `t${i}`, de, a: de === 'modelo' ? 'computador' : 'modelo', tipo: de === 'modelo' ? 'pide' : 'responde', texto: '', cuando: new Date(t0 + i * 60_000).toISOString(), tardoMs }) as ConversacionDeRevision['turnos'][number];
      // Dos del modelo seguidos se juntan en un cuadro; uno sin tiempo no cuenta
      const turnos = [turno(1, 'modelo', 30_000), turno(2, 'modelo', 10_000), turno(3, 'computador', 5_000), turno(4, 'computador', null), turno(5, 'modelo', 90_000), turno(6, 'computador', 600_000)];
      const cerrada = { ...conNieve({ contexto: 200_000, resumenes: 1, ultimoResumen: new Date(t0 + 4.5 * 60_000).toISOString() }), turnos, espera: null };
      const cuadros = repeticionDeAvalancha(cerrada);
      expect(cuadros).toHaveLength(4);
      // La bola crece cuadro a cuadro hasta el tamaño al que llegó la revisión, el recorrido va del principio al fin, y se
      // parte en el cuadro del último resumen
      expect(cuadros.map((c) => c.contexto)).toEqual([...cuadros.map((c) => c.contexto)].sort((a, b) => a - b));
      expect(cuadros.at(-1)!.contexto).toBe(200_000);
      expect(cuadros.map((c) => c.avance)).toEqual([0.25, 0.5, 0.75, 1]);
      expect(cuadros.map((c) => c.partiendo)).toEqual([false, false, true, false]);
      // Más rápida que la revisión, en proporción a lo que tardó cada uno, sin pasarse de sus topes
      for (const c of cuadros) expect(c.ms).toBeGreaterThanOrEqual(REPETICION.minMs), expect(c.ms).toBeLessThanOrEqual(REPETICION.maxMs);
      expect(cuadros[3].ms).toBeGreaterThan(cuadros[1].ms);
      // Con muchos turnos, nunca más de REPETICION.cuadros
      const muchos = Array.from({ length: 200 }, (_, i) => turno(i, i % 2 ? 'computador' : 'modelo', 1000));
      expect(repeticionDeAvalancha({ ...cerrada, turnos: muchos })).toHaveLength(REPETICION.cuadros);
      // Cerrada, el botón está debajo del dibujo y lleva sus cuadros; mientras alguien tiene el turno, no
      const html = chatDeRevision(cerrada, new Set(), { vivo: false });
      expect(html).toMatch(/<div class="avalancha escena-quieta"[^>]*>[\s\S]*?<\/div><button type="button" class="enlace avalancha-repetir" data-repetir-avalancha="/);
      expect(html).toContain('↻ Repetir la avalancha');
      expect(avalanchaHtml({ ...cerrada, espera: { quien: 'modelo', desde: new Date(t0).toISOString() } }, true)).not.toContain('data-repetir-avalancha');
      expect(avalanchaHtml({ ...cerrada, turnos: [turno(1, 'modelo', 1000)] }, false)).not.toContain('data-repetir-avalancha');
      // Cuadro a cuadro: qué va en cada momento, y al final, nada (vuelve al reposo)
      expect(cuadroDeRepeticion(cuadros, 0)).toMatchObject({ cuadro: cuadros[0], hace: 0, queda: cuadros[0].ms });
      expect(cuadroDeRepeticion(cuadros, cuadros[0].ms + 10)).toMatchObject({ cuadro: cuadros[1], hace: 10 });
      expect(cuadroDeRepeticion(cuadros, cuadros.reduce((s, c) => s + c.ms, 0))).toBeNull();
      // Si el panel se repinta en medio, pinta la escena viva del cuadro que va y el botón sigue marcado
      const enMedio = chatDeRevision(cerrada, new Set(), { vivo: false, repeticion: { cuadro: cuadros[0], hace: 100 } });
      expect(enMedio).toContain('class="avalancha escena-viva"');
      expect(enMedio).toContain('--avance:0.250');
      expect(enMedio).toContain(' data-repitiendo');
      expect(cuadroDeAvalanchaHtml(cuadros[2], { cache: 0, llamadas: 3 }, 200)).toContain('class="avalancha-trozos" style="--hace:-200ms"');
      // La página la mueve sobre el mismo dibujo, y cada texto está en los dos idiomas
      const app = leer('app.ts');
      expect(app).toContain("closest?.<HTMLElement>('[data-repetir-avalancha]')");
      expect(app).toContain('ponerCuadro(dibujo, cuadroDeAvalanchaHtml(c.cuadro, r, c.hace), true);');
      for (const idioma of ['es', 'en']) for (const clave of ['chat.repetirAvalancha', 'chat.repetirAvalanchaTitulo']) expect(leer(`textos/${idioma}.ts`)).toContain(`'${clave}':`);
    });

    it('mitad y mitad, con la cara de cada uno, y quien tiene el turno se resalta con su reloj corriendo', () => {
      const html = banda(conTokens());
      expect(html).toContain('class="banda-lado de-computador tiene-turno"');
      // El que espera, en gris y algo transparente (nmw5h6wg0tit)
      expect(html).toContain('class="banda-lado de-modelo sin-turno"');
      expect(leer('director.css')).toContain('.banda-lado.sin-turno { opacity: 0.55; filter: grayscale(1); }');
      expect(html.match(/data-reloj-lado/g)).toHaveLength(1);
      expect(html).toMatch(/banda-lado de-computador tiene-turno[\s\S]*class="banda-tiempo cifra-tiempo corre"[\s\S]*data-reloj-lado="\d+"/);
      // Cuando le toca al modelo, corre el suyo
      const html2 = banda(conTokens({ espera: { quien: 'modelo', desde: seg(50) } }));
      expect(html2).toContain('class="banda-lado de-modelo tiene-turno"');
      expect(html2).not.toContain('banda-lado de-computador tiene-turno');
      // Lo que hace un ayudante se le pidió al modelo: corre en su lado
      expect(banda(conTokens({ espera: { quien: 'ayudante', desde: seg(50) } }))).toContain('class="banda-lado de-modelo tiene-turno"');
      // En el historial nadie corre, y nadie espera
      const historial = banda(conTokens(), { vivo: false });
      expect(historial).not.toContain('data-reloj-lado');
      expect(historial).not.toContain('tiene-turno');
      expect(historial).not.toContain('sin-turno');
      expect(chatDeRevision(conTokens(), new Set(), { vivo: false })).not.toContain('data-crono');
    });

    it('cada lado acumula su tiempo, y el de los ayudantes corre en el del modelo', () => {
      const ahora = Date.parse(seg(45));
      const m = marcadorDe(lleno({ ...conversacion, espera: null, totales: { modeloMs: 15_000, computadorMs: 30_000, ayudanteMs: 5_000 } }), true, ahora);
      expect(m).toMatchObject({ director: 30, modelo: 20 });
      // Con el turno, suma lo que lleva corriendo desde lo último que pasó
      const corre = marcadorDe(lleno({ ...conversacion, ultimo: seg(45), espera: { quien: 'modelo', desde: seg(45) }, totales: { modeloMs: 15_000, computadorMs: 30_000, ayudanteMs: 0 } }), true, ahora + 7_000);
      expect(corre).toMatchObject({ director: 30, modelo: 22 });
      // En el historial, solo lo acumulado
      expect(marcadorDe(lleno({ ...conversacion, ultimo: seg(45), espera: { quien: 'modelo', desde: seg(45) }, totales: { modeloMs: 15_000, computadorMs: 30_000, ayudanteMs: 0 } }), false, ahora + 7_000)).toMatchObject({ modelo: 15 });
    });

    it('los tokens, exactos como los dice Claude Code y con sus separadores, en el idioma de la interfaz; sin ellos, lo dice, y nunca dinero', () => {
      const html = banda(conTokens());
      expect(html).toContain('<span class="cifra-tokens" data-cuenta="enviados">1.200</span> tokens de entrada');
      expect(html).toContain('<span class="cifra-tokens" data-cuenta="recibidos">340</span> tokens de salida');
      expect(conSeparadores(1_234_567)).toBe('1.234.567');
      ponerIdioma('en');
      try {
        expect(conSeparadores(1200)).toBe('1,200');
      } finally {
        ponerIdioma('es');
      }
      expect(html).not.toMatch(/US\$|\$|d[oó]lar|precio/i);
      const sin = banda(conTokens({ tokens: null }));
      expect(sin.match(/sin-tokens/g)).toHaveLength(2);
      expect(sin).toContain('Claude Code no ha dicho sus tokens');
      expect(sin).not.toContain('cifra-tokens');
    });

    it('al completarse un turno, las cifras suben unos 3 segundos desde lo que mostraban hasta lo nuevo (nmvy08oe4tit)', () => {
      const antes = { director: 5, modelo: 2, enviados: 1000, recibidos: 300 };
      const m = { director: 8, modelo: 20, enviados: 1200, recibidos: 900 };
      expect(DURA_CUENTA).toBe(3000);
      // Sin turno completado no empieza; con él, sí
      expect(cuentaTrasPintar(null, antes, false, m, 0)).toBeNull();
      expect(cuentaTrasPintar(null, null, true, m, 0)).toBeNull();
      const cuenta = cuentaTrasPintar(null, antes, true, m, 1000)!;
      expect(cuenta).toEqual({ desde: antes, hasta: m, inicio: 1000 });
      // Sube parejo, se ve a mitad de camino y llega exacto; nunca baja ni se pasa
      expect(cifraAl(300, 900, 0)).toBe(300);
      expect(cifraAl(300, 900, 1500)).toBe(600);
      expect(cifraAl(300, 900, 2999)).toBeLessThanOrEqual(900);
      expect(cifraAl(300, 900, 3000)).toBe(900);
      expect(cifraAl(900, 300, 100)).toBe(300);
      // Repintar en medio no la reinicia, y al terminar se va
      expect(cuentaTrasPintar(cuenta, m, false, m, 2500)).toBe(cuenta);
      expect(cuentaTrasPintar(cuenta, m, false, m, 4000)).toBeNull();
      // Otro turno en medio sale de lo que se ve en ese momento, no de la cifra final
      const otra = cuentaTrasPintar(cuenta, m, true, { ...m, recibidos: 1000 }, 2500)!;
      expect(otra.desde.recibidos).toBe(600);
      // Lo que se pinta en medio lleva lo de ese momento
      const html = banda(conTokens({ espera: null, tokens: { enviados: 1200, recibidos: 900 } }), { cuenta, ahora: 2500 });
      expect(html).toContain('<span class="cifra-tokens" data-cuenta="recibidos">600</span>');
      // Sin subida, la cifra final: así queda sin movimiento (app.ts no la crea) y en el historial
      expect(banda(conTokens({ espera: null }))).toContain('>1.200</span>');
      const app = leer('app.ts');
      expect(app).toContain("const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;");
      expect(app).toContain('cuentaBanda = marcador && !sinMovimiento ? cuentaTrasPintar(cuentaBanda, marcadorAntes, turnosHay > turnosPintados, marcador, ahoraChat) : null;');
      // Mientras corre, el reloj lo mueve la página, segundo a segundo
      expect(app).toContain("document.querySelectorAll<HTMLElement>('[data-reloj-lado]')");
    });

    it('sin movimiento, nada se anima: ni los globos ni las caras, que descansan', () => {
      const css = leer('director.css');
      expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\n {2}\.banda-lado \{ transition: none; \}\n {2}\.turno\.nace > \.globo, \.turno\.nace > \.turno-icono, \.turno\.esperando > \.turno-icono, \.banda-lado\.tiene-turno \.cara-chat \{ animation: none; \}\n\}/);
    });
  });

  it('en inglés, con el archivo de textos desde el comienzo', () => {
    ponerIdioma('en');
    try {
      const html = chatDeRevision({ ...conversacion, tokens: null });
      const texto = html.replace(/<[^>]*>/g, ' ');
      expect(html).toContain('data-titulo="The director took 30 s"');
      expect(texto).toContain('The model requests');
      expect(texto).toContain('The director answers');
      expect(texto).toContain('The model is waiting for the director (app.ts):');
      expect(texto).toContain('Claude Code has not reported its tokens');
      expect(texto).not.toMatch(/\b(tardó|modelo|computador|espera|Pide|solicita|responde)\b/);
    } finally {
      ponerIdioma('es');
    }
  });

  it('las duraciones, cortas', () => {
    expect(duracion(400)).toBe('0,4 s');
    expect(duracion(12_300)).toBe('12 s');
    expect(duracion(60_000)).toBe('1 min');
    expect(duracion(200_000)).toBe('3 min 20 s');
  });

  it('la conversación de una revisión pasada se abre de su registro', () => {
    const director = leer('app.ts');
    expect(director).toContain('/__estudio/director/conversacion?registro=');
    expect(leer('../servidor/api.ts')).toContain("ruta === '/conversacion'");
  });
});

describe('la línea entre su plan y lo que va haciendo, que se arrastra con el ratón (pd_division_arrastrable)', () => {
  it('el plan crece o se encoge con lo arrastrado, sin quedarse sin lugar ni dejar sin lugar a lo que va haciendo', () => {
    expect(altoDelPlan(300, 700)).toBe(300);
    expect(altoDelPlan(10, 700)).toBe(PLAN_MINIMO);
    expect(altoDelPlan(900, 700)).toBe(700 - PASOS_MINIMO);
    // En un panel muy bajo, el plan conserva su mínimo
    expect(altoDelPlan(300, 100)).toBe(PLAN_MINIMO);
    expect(altoDelPlan(250.6, 700)).toBe(251);
  });

  it('se queda donde la dejas: lo guardado vuelve al pintar el panel, y lo que no vale no cuenta', () => {
    expect(altoGuardado('260')).toBe(260);
    expect(altoGuardado(null)).toBeNull();
    expect(altoGuardado('')).toBeNull();
    expect(altoGuardado('abc')).toBeNull();
    expect(altoGuardado('-4')).toBeNull();
    const director = leer('app.ts');
    const pintar = director.match(/function pintarProgreso\(trabajando: boolean\) \{[\s\S]*?\n\}\n/)?.[0] ?? '';
    expect(pintar).toContain("${plan}${plan ? DIVISION_PROGRESO() : ''}");
    expect(pintar).toContain('altoGuardado(localStorage.getItem(CLAVE_DIVISION))');
    expect(pintar).toContain("caja.style.setProperty('--alto-plan-vivo', `${alto}px`)");
    expect(CLAVE_DIVISION).toBe('estudio.director.division-progreso');
  });

  it('solo con el ratón: en el teléfono o una pantalla táctil no está, y el plan conserva su alto (t_decide_division_movil)', () => {
    const director = leer('app.ts');
    expect(director).toContain("if (!linea || e.pointerType !== 'mouse' || e.button !== 0) return;");
    // Se sigue en el documento: el panel se repinta con cada consulta mientras se arrastra
    expect(director).toContain("document.addEventListener('pointermove', mover);");
    expect(director).toContain('localStorage.setItem(CLAVE_DIVISION, String(alto));');
    expect(DIVISION_PROGRESO()).toContain('role="separator"');
    const css = leer('estilos.css');
    expect(css).toMatch(/@media \(hover: none\), \(pointer: coarse\), \(max-width: 759px\) \{\n {2}\.progreso-director \.division-progreso \{ display: none; \}/);
    expect(css).toMatch(/@media \(hover: hover\) and \(pointer: fine\) and \(min-width: 760px\) \{\n {2}\.progreso-director details\.plan-vivo ol \{ max-height: var\(--alto-plan-vivo, 220px\); \}/);
    expect(css).toContain('.progreso-director :is(details.plan-vivo:not([open]), p.plan-vivo) + .division-progreso { display: none; }');
  });
});
