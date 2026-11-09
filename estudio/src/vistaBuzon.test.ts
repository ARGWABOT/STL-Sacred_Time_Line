// La vista «Buzón», en su módulo (propuesta aceptada pr_partir_modulos): recibe lo que pinta y la página le da lo que
// depende de ella (la tarjeta de cada nota, los plegables, lo que quedó guardado de la búsqueda y los filtros), así que se
// prueba con datos hechos a mano, sin la página.
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { audiosPorTranscribir, lineasDeNota, loDichoEnOrden, type Nota, type Respuesta } from '../../src/director/director';
import { repartirDictado } from './grabadora';
import { conAyuda } from './palabras';
import { aperturaDeSeccion } from './seccionAbierta';
import { dichoDeNota, notasDelBuzon, RESPONDIDAS_DE_A, vistaBuzon, type DatosBuzon } from './vistaBuzon';

describe('lo que se le suma a una nota con audio sale después de él (nota de voz del titular nmvwpl26stit)', () => {
  const audio = 'proyectos/x/director/notas/n.webm';
  const sinAdjuntos = () => '';
  // Lo que se entendió de su audio, según vaya la transcripción: al pintarla en el Buzón y al leerla la bandeja
  const buzon = (n: Nota, oido?: string) => dichoDeNota(n, (a) => (a ? `[audio: ${oido ?? 'transcribiendo'}]` : ''), sinAdjuntos);
  const bandeja = (n: Nota, oido?: string) => lineasDeNota(n, () => oido ?? null);
  // Se grabó una nota; antes de que termine su transcripción, se corrige y se le suma otro audio, que se transcribe primero
  const corregida = () => {
    const sumado = repartirDictado({ despues: '' }, 'Incluso prefiero cinco segundos.');
    return nota('n', { texto: undefined, audio, despues: sumado.despues });
  };

  it('el Buzón la muestra después del audio, antes y después de que termine su transcripción', () => {
    const n = corregida();
    for (const oido of [undefined, 'Quiero que reduzcas a la mitad.']) {
      const html = buzon(n, oido);
      expect(html.indexOf('[audio:')).toBeGreaterThanOrEqual(0);
      expect(html.indexOf('[audio:')).toBeLessThan(html.indexOf('Incluso prefiero'));
    }
  });

  it('la bandeja también, y lo que se junta de la nota va en ese orden', () => {
    const n = corregida();
    expect(bandeja(n)).toEqual([`  Audio (${audio}): (not transcribed)`, '  Added after the audio: Incluso prefiero cinco segundos.']);
    expect(bandeja(n, 'Quiero que reduzcas a la mitad.')).toEqual([`  Audio (${audio}): Quiero que reduzcas a la mitad.`, '  Added after the audio: Incluso prefiero cinco segundos.']);
    expect(loDichoEnOrden({ texto: 'Escrito al dejarla.', audio, despues: 'Sumado.' }, () => 'Dicho.')).toEqual(['Escrito al dejarla.', 'Dicho.', 'Sumado.']);
  });

  it('lo que se suma después se acumula en orden, y lo que se marca se sigue reemplazando', () => {
    const una = repartirDictado({ despues: 'Primero.' }, 'Segundo.');
    expect(una.despues).toBe('Primero.\n\nSegundo.');
    const marcado = repartirDictado({ despues: 'Primero mal.' }, 'bien', { campo: 'despues', inicio: 8, fin: 11 });
    expect(marcado.despues).toContain('bien');
    expect(marcado.despues).not.toContain('mal');
    // Con lo entendido vacío, lo dicho sigue llenándolo, como antes
    expect(repartirDictado({ dicho: ' ', despues: 'Aparte.' }, 'Dicho.')).toEqual({ dicho: 'Dicho.', despues: 'Aparte.', texto: undefined });
  });

  it('una nota de antes, sin `despues`, se lee igual', () => {
    const vieja = nota('v', { texto: 'Lo escrito.', audio });
    expect(buzon(vieja, 'Lo dicho.')).toBe('<p>Lo escrito.</p>[audio: Lo dicho.]');
    expect(bandeja(vieja, 'Lo dicho.')).toEqual(['  Lo escrito.', `  Audio (${audio}): Lo dicho.`]);
    expect(repartirDictado({ texto: 'Lo escrito.' }, 'Más.').texto).toBe('Lo escrito.\n\nMás.');
  });
});

describe('un audio ya respondido no se vuelve a transcribir en cada revisión (nmvvmc5rxtit)', () => {
  it('solo los de lo que el director aún no responde', () => {
    const notas = [{ id: 'a', audio: 'a.webm' }, { id: 'b', audio: 'b.webm' }, { id: 'c' }];
    const entregas = { m1: { cuando: '2026-10-20', audio: 'm1.webm' }, m2: { cuando: '2026-10-22', audio: 'm2.webm' }, m3: { cuando: '2026-10-20', audio: 'm3.webm' } };
    const plan = { respuestas: { a: {} }, revisiones: { m1: { cuando: '2026-10-21' }, m2: { cuando: '2026-10-21' } } };
    // m2 se volvió a entregar después de su veredicto: esa todavía espera
    expect(audiosPorTranscribir(plan, { notas, entregas })).toEqual(['b.webm', 'm2.webm', 'm3.webm']);
  });

  it('lo usan la bandeja y el servidor', () => {
    expect(readFileSync(new URL('../../tools/director/bandeja.ts', import.meta.url), 'utf8')).toContain('todosLosAudios().filter((a) => porOir.has(a) &&');
    expect(readFileSync(new URL('../servidor/api.ts', import.meta.url), 'utf8')).toContain('audios.filter((a) => !transcripciones[a] && porOir.has(a))');
  });
});

const nota = (id: string, x: Partial<Nota> = {}) => ({ id, cuando: '2026-10-20T10:00:00Z', quien: 'Ana', de: 'ana', sobre: { tipo: 'general' }, texto: `La ${id}`, ...x }) as Nota;
// Una idea que espera (n1), una falla ya respondida (n2) y otra falla, dicha de viva voz, que espera (n3)
const n1 = nota('n1', { tipo: 'idea', texto: 'Una idea nueva' });
const n2 = nota('n2', { tipo: 'falla', texto: 'Algo falla' });
const n3 = nota('n3', { tipo: 'falla', texto: undefined, audio: 'a.webm' });
const respuestas = {
  n2: { cuando: '2026-10-21T10:00:00Z', texto: 'Ya lo arreglé', tratamiento: 'informada' },
} as unknown as Record<string, Respuesta>;
const respuesta = (tratamiento: string) => ({ cuando: '2026-10-21T10:00:00Z', texto: 'Dime qué prefieres', tratamiento }) as unknown as Respuesta;
/** La tarjeta, como la pinta la página: aquí solo dice de qué nota es y con qué se la pidió. */
const tarjeta = (id: string, args: string) => `<li data-tarjeta="${id}" data-args="${args}"></li>`;
const datos = (x: Partial<DatosBuzon> = {}): DatosBuzon => ({
  notas: [n1, n2, n3], respuestas, transcripciones: { 'a.webm': 'Se cae al guardar' },
  busqueda: '', tipo: '', como: '', fijarFiltros: () => {}, respondidasAbiertas: false, resueltoAqui: () => false,
  filtroVisible: () => '<p class="filtro-equipo"></p>',
  plegable: (clave) => ` data-recuerda="${clave}"`,
  tarjetaNota: (n, conSobre, plegada, enRespuesta, aqui) => tarjeta(n.id, `${conSobre}|${plegada}|${enRespuesta}|${aqui.vista}`),
  ...x,
});
const veniaDe = (html: string) => [...html.matchAll(/data-tarjeta="(\w+)"/g)].map((m) => m[1]);

describe('el Buzón abre con todo lo que espera y las últimas 50 ya respondidas (t_decide_aligerar_buzon)', () => {
  const muchas = Array.from({ length: 120 }, (_, i) => nota(`r${i}`, { texto: i === 3 ? 'la palabra escondida' : 'algo', cuando: new Date(Date.UTC(2026, 9, 1, 0, i)).toISOString() }));
  const resp = Object.fromEntries(muchas.map((n) => [n.id, { cuando: n.cuando, texto: 'ok', tratamiento: 'informada' } as Respuesta]));
  const esperan = Array.from({ length: 70 }, (_, i) => nota(`e${i}`, { cuando: new Date(Date.UTC(2026, 9, 2, 0, i)).toISOString() }));
  const conTodo = (x: Partial<DatosBuzon> = {}) => datos({ notas: [...muchas, ...esperan], respuestas: resp, ...x });

  it('todo lo que espera se ve, sin tope, y de lo respondido solo las 50 más nuevas, con «Ver las anteriores»', () => {
    const html = notasDelBuzon(conTodo());
    const ids = veniaDe(html);
    expect(ids.filter((i) => i.startsWith('e'))).toHaveLength(70);
    const vistas = ids.filter((i) => i.startsWith('r'));
    expect(vistas).toHaveLength(RESPONDIDAS_DE_A);
    expect(RESPONDIDAS_DE_A).toBe(50);
    expect(vistas[0]).toBe('r119');
    expect(vistas.at(-1)).toBe('r70');
    // La cuenta sigue diciendo cuántas son todas
    expect(html).toContain('<h3>Ya respondidas <small>· 120</small></h3>');
    expect(html).toContain('data-ver-anteriores>Ver las anteriores (70 más)</button>');
  });

  it('«Ver las anteriores» trae las siguientes, hasta el final, y ahí ya no se ofrece', () => {
    expect(veniaDe(notasDelBuzon(conTodo({ respondidasVistas: 100 }))).filter((i) => i.startsWith('r'))).toHaveLength(100);
    expect(notasDelBuzon(conTodo({ respondidasVistas: 119 }))).toContain('>Ver la anterior</button>');
    const todas = notasDelBuzon(conTodo({ respondidasVistas: 150 }));
    expect(veniaDe(todas).filter((i) => i.startsWith('r'))).toHaveLength(120);
    expect(todas).not.toContain('data-ver-anteriores');
    expect(notasDelBuzon(datos({ notas: [n1, n2] }))).not.toContain('data-ver-anteriores');
    const app = readFileSync(`${__dirname}/app.ts`, 'utf8');
    expect(app).toContain('respondidasVistas += RESPONDIDAS_DE_A;');
    expect(app).toContain('respondidasAbiertas, respondidasVistas, resueltoAqui,');
  });

  it('nada se pierde: buscar y los filtros miran también las que no se pintan', () => {
    const hallada = notasDelBuzon(conTodo({ busqueda: 'escondida' }));
    expect(veniaDe(hallada)).toEqual(['r3']);
    expect(hallada).toContain('<small>· 1</small>');
  });
});

describe('una sección se abre de una vez (t_decide_aligerar_carga, t_decide_aligerar_volver)', () => {
  it('la primera vez, su título y una línea de que carga', () => {
    const html = aperturaDeSeccion(undefined, 'La <ruta>', 'Cargando');
    expect(html).toContain('<h2>La &lt;ruta&gt;</h2>');
    expect(html).toContain('<p class="como">Cargando<span class="puntos"');
    expect(html).toContain('aria-busy="true"');
  });

  it('al volver, sin esperar: lo último que trajo, y se pinta con lo de ahora en el cuadro siguiente', () => {
    expect(aperturaDeSeccion('<p>Lo de antes</p>', 'La ruta', 'Cargando')).toBe('<p>Lo de antes</p>');
    const app = readFileSync(`${__dirname}/app.ts`, 'utf8').replace(/\r\n/g, '\n');
    const abrir = app.slice(app.indexOf('function abrirSeccion(nueva: Vista) {'), app.indexOf('function irA(nueva: Vista) {'));
    expect(abrir).toContain("$('vista').innerHTML = aperturaDeSeccion(seccionesVistas.get(nueva), NOMBRE_VISTA[nueva], tx('seccion.cargando'));");
    expect(abrir.indexOf('aperturaDeSeccion(')).toBeLessThan(abrir.indexOf('requestAnimationFrame(() => setTimeout(() => irA(nueva), 0));'));
    expect(app).toContain('if (d) abrirSeccion(v);');
    expect(app).toContain('seccionesVistas.set(vista, v.innerHTML);');
    // Lo de un proyecto no se ve en otro
    expect(app.slice(app.indexOf('if (d && d.activo !== nuevo.activo) {'))).toContain('seccionesVistas.clear();');
  });
});

describe('«Buzón», aparte de app.ts (pr_partir_modulos)', () => {
  it('lo que espera al director, arriba y de la más nueva a la más vieja; lo ya respondido, plegado debajo', () => {
    const html = vistaBuzon(datos({ notas: [n1, n2] }));
    expect(html).toContain('<details class="explica-buzon panel-d" data-recuerda="explica-buzon">');
    expect(html).toContain(`<summary>¿Qué es el Buzón del director?${conAyuda('buzon')}</summary>`);
    expect(html).toContain('<p class="filtro-equipo"></p><div class="buscar-buzon" role="search">');
    expect(html).toContain('<input id="buscar-buzon" type="search" data-buscar-buzon value="" placeholder=');
    expect(html).toContain('<div id="resultados-buzon"><');
    expect(html).toContain('<h3>Esperando respuesta del director <small>· 1</small></h3>');
    expect(html).toContain(`<ul class="notas-lista">${tarjeta('n1', 'true|true|false|buzon')}</ul>`);
    expect(html).toContain('<details class="ya-respondidas" data-ya-respondidas><summary><h3>Ya respondidas <small>· 1</small></h3></summary>');
    expect(html).toContain(`${tarjeta('n2', 'true|true|false|buzon')}</ul></details>`);
    // Dos que esperan: primero la que llegó última
    const otra = nota('n4', { cuando: '2026-10-22T10:00:00Z' });
    expect(veniaDe(notasDelBuzon(datos({ notas: [n1, otra] })))).toEqual(['n4', 'n1']);
    // Quien abrió «Ya respondidas» la sigue viendo abierta
    expect(notasDelBuzon(datos({ notas: [n1, n2] }))).not.toContain('data-ya-respondidas open');
    expect(notasDelBuzon(datos({ notas: [n1, n2], respondidasAbiertas: true }))).toContain('data-ya-respondidas open>');
  });

  it('el filtro por tipo: una pestaña por tipo con lo que pide atención, y solo las notas de ese tipo', () => {
    const todas = notasDelBuzon(datos());
    expect(todas).toContain('<div class="filtro-tipo filtro-pestanas" role="group" aria-label="Filtrar por tipo">'
      + '<button type="button" class="chip-tipo activo" data-tipo-buzon="" aria-pressed="true">Todas · 2</button>'
      + '<button type="button" class="chip-tipo" data-tipo-buzon="idea" aria-pressed="false">Idea para después · 1</button>'
      + '<button type="button" class="chip-tipo" data-tipo-buzon="falla" aria-pressed="false">Algo falla · 1</button></div>');
    expect(veniaDe(todas)).toEqual(['n3', 'n1', 'n2']);
    const fallas = notasDelBuzon(datos({ tipo: 'falla' }));
    expect(fallas).toContain('<button type="button" class="chip-tipo" data-tipo-buzon="" aria-pressed="false">Todas · 2</button>');
    expect(fallas).toContain('<button type="button" class="chip-tipo activo" data-tipo-buzon="falla" aria-pressed="true">Algo falla · 1</button>');
    expect(veniaDe(fallas)).toEqual(['n3', 'n2']);
    // Con un solo tipo, no hay pestañas
    expect(notasDelBuzon(datos({ notas: [n2, n3] }))).not.toContain('filtro-pestanas');
  });

  it('«Cómo quedó»: esperando o el tratamiento de la respuesta, sobre las del tipo elegido; lo ya resuelto en su lugar queda integrado', () => {
    const todas = notasDelBuzon(datos());
    expect(todas).toContain('<span class="como">Cómo quedó:</span>'
      + '<button type="button" class="chip-tipo activo" data-como-buzon="" aria-pressed="true">Todas · 2</button>'
      + '<button type="button" class="chip-tipo" data-como-buzon="esperando" aria-pressed="false">Esperando · 2</button>'
      + '<button type="button" class="chip-tipo" data-como-buzon="informada" aria-pressed="false">Respondida</button>');
    const esperando = notasDelBuzon(datos({ tipo: 'falla', como: 'esperando' }));
    expect(esperando).toContain('<button type="button" class="chip-tipo activo" data-como-buzon="esperando" aria-pressed="true">Esperando · 1</button>');
    expect(veniaDe(esperando)).toEqual(['n3']);
    expect(esperando).toContain('<h3>Ya respondidas <small>· 0</small></h3><p class="intro">Todavía ninguna.</p>');
    // Una respuesta que pide tu decisión cuenta como pendiente, hasta que su lugar se resuelve
    const pide = { n5: respuesta('decision') };
    const n5 = nota('n5', { tipo: 'idea' });
    expect(notasDelBuzon(datos({ notas: [n1, n5], respuestas: pide }))).toContain('data-como-buzon="decision" aria-pressed="false">Requiere tu decisión · 1</button>');
    const resuelta = notasDelBuzon(datos({ notas: [n1, n5], respuestas: pide, resueltoAqui: () => true }));
    expect(resuelta).toContain('data-como-buzon="integrada" aria-pressed="false">Integrada</button>');
    expect(resuelta).toContain('data-como-buzon="" aria-pressed="true">Todas · 1</button>');
  });

  it('un filtro que ya no tiene ninguna nota vuelve a «Todas», y la página lo guarda', () => {
    const fijar = vi.fn();
    const html = notasDelBuzon(datos({ tipo: 'pregunta', como: 'rechazada', fijarFiltros: fijar }));
    expect(fijar).toHaveBeenLastCalledWith({ tipo: '', como: '' });
    expect(html).toContain('data-tipo-buzon="" aria-pressed="true">Todas · 2</button>');
    expect(veniaDe(html)).toEqual(['n3', 'n1', 'n2']);
    // Un tipo que sí tiene notas se queda, y un «Cómo quedó» que ya no calza con él se suelta
    notasDelBuzon(datos({ tipo: 'idea', como: 'informada', fijarFiltros: fijar }));
    expect(fijar).toHaveBeenLastCalledWith({ tipo: 'idea', como: '' });
    notasDelBuzon(datos({ tipo: 'falla', como: 'esperando', fijarFiltros: fijar }));
    expect(fijar).toHaveBeenLastCalledWith({ tipo: 'falla', como: 'esperando' });
  });

  it('con el filtro «Pregunta», las respuestas se leen juntas como un informe', () => {
    const duda = nota('n6', { sobre: { tipo: 'pregunta' }, texto: '¿Qué sigue?' });
    const conPregunta = notasDelBuzon(datos({ notas: [n1, duda], tipo: 'pregunta' }));
    expect(conPregunta).toContain('<p class="como informe-preguntas">Mis respuestas a tus preguntas también se leen juntas, como un informe, con cada conversación: <button type="button" class="enlace" data-vista="preguntas">Leerlas como informe</button></p>');
    expect(veniaDe(conPregunta)).toEqual(['n6']);
    // Las preguntas también están en el Buzón, con su pestaña; el informe se ofrece solo con su filtro
    expect(notasDelBuzon(datos({ notas: [n1, duda] }))).toContain('data-tipo-buzon="pregunta" aria-pressed="false">Pregunta · 1</button>');
    expect(notasDelBuzon(datos({ notas: [n1, duda] }))).not.toContain('informe-preguntas');
  });

  it('«Buscar en el Buzón»: halla en lo dicho, en lo que se entendió de un audio y en la respuesta, y lo dice si no halla', () => {
    const buscando = (busqueda: string, x: Partial<DatosBuzon> = {}) => notasDelBuzon(datos({ busqueda, ...x }));
    // En el audio: la línea de la nota lo dice por sí sola
    const audio = buscando('guardar');
    expect(audio).toContain('<h3>Lo que encontré <small>· 1</small></h3>');
    expect(audio).toContain(`<ul class="notas-lista">${tarjeta('n3', 'true|true|false|buzon')}</ul>`);
    expect(audio).not.toContain('Esperando respuesta del director');
    expect(audio).not.toContain('Ya respondidas');
    // En lo que respondió el director: la tarjeta lo avisa (enRespuesta), sin tildes ni mayúsculas
    expect(buscando('ARREGLE')).toContain(tarjeta('n2', 'true|true|true|buzon'));
    // Varias palabras, en cualquier orden, y solo entre las del tipo elegido
    expect(veniaDe(buscando('falla algo'))).toEqual(['n2']);
    expect(buscando('guardar', { tipo: 'idea' })).toContain('Ninguna nota del Buzón dice «guardar»');
    const nada = buscando('  zzz <b>  ');
    expect(nada).toContain('<h3>Lo que encontré <small>· 0</small></h3>');
    expect(nada).toContain('<p class="intro">Ninguna nota del Buzón dice «zzz &lt;b&gt;», ni en lo que se dijo ni en lo que respondió el director. Prueba con menos palabras o con otras.</p>');
    expect(veniaDe(nada)).toEqual([]);
    // Lo escrito vuelve al campo, escapado
    expect(vistaBuzon(datos({ busqueda: '  zzz <b>  ' }))).toContain('value="  zzz &lt;b&gt;  "');
  });

  it('sin notas, cada parte dice por qué está vacía y no hay filtros', () => {
    const vacio = notasDelBuzon(datos({ notas: [] }));
    expect(vacio).toBe('<h3>Esperando respuesta del director <small>· 0</small></h3>\n'
      + '    <p class="intro">Nada esperando: el director está al día.</p>\n'
      + '    <h3>Ya respondidas <small>· 0</small></h3><p class="intro">Todavía ninguna.</p>');
    expect(vacio).not.toContain('filtro-tipo');
    expect(vacio).not.toContain('<details');
    expect(vistaBuzon(datos({ notas: [] }))).toContain('<div id="resultados-buzon"><h3>Esperando respuesta del director <small>· 0</small></h3>');
  });

  it('app.ts la importa, le da lo que depende de la página y ya no la pinta', () => {
    const director = readFileSync(new URL('./app.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    expect(director).toContain("import { notasDelBuzon as notasDelBuzonHtml, RESPONDIDAS_DE_A, vistaBuzon as vistaBuzonHtml, type DatosBuzon } from './vistaBuzon';");
    expect(director).toContain('return vistaBuzonHtml(datosBuzon());');
    expect(director).toContain('return notasDelBuzonHtml(datosBuzon());');
    // La búsqueda y los filtros siguen siendo de la página, que guarda los que el módulo deja vigentes
    expect(director).toContain('fijarFiltros: (f) => { tipoBuzon = f.tipo; comoBuzon = f.como; },');
    expect(director).toContain('respondidasAbiertas, respondidasVistas, resueltoAqui, filtroVisible, plegable, tarjetaNota,');
    expect(director).not.toContain('class="buscar-buzon"');
    expect(director).not.toContain('class="filtro-tipo filtro-');
    expect(director).not.toContain('class="ya-respondidas"');
  });
});
