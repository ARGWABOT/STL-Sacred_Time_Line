import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import planPlantilla from '../../plantilla/plan.json';
import { pasoSinMision } from '../../src/director/animo';
import { estadoVacio, SIN_TRABAJO_EN_FASE, TITULAR, type Contexto, type EstadoDirector, type Fase, type Mision, type Nota, type Plan, type Propuesta, type Proyecto, type TareaDelDirector } from '../../src/director/director';
import { esIdioma, idiomaDelNavegador } from '../../src/director/idioma';
import { colaDelDirectorHtml } from './colaDirector';
import { fecha, hora, miles, momento, NOMBRE_NIVEL, pct } from './formato';
import { avisoDeEspera, resumenComentarios } from './lectura';
import { tarjetaMision, type DatosTarjeta } from './missionCard';
import { fichaPersona } from './personCard';
import { colaDe } from './queuePanel';
import { selectorIdioma } from './selectorIdioma';
import { arranqueHTML } from './startSteps';
import { idiomaActual, lenguaje, ponerIdioma, t } from './textos';
import { tituloPestanaRuta, type PestanaRuta } from './pestanasRuta';
import { NOMBRE_PESTANA_DQ, ORDEN_PESTANAS_DQ } from './pestanasDq';
import { controlesEnfoque, GRUPOS_ENFOQUE } from './controlesEnfoque';
import { queDelFrente, vistaFrentes, vistaMetodo } from './vistasDeApoyo';
import { vistaProyecto, type DatosProyecto } from './vistaProyecto';
import { vistaProyectos, type DatosProyectos } from './vistaProyectos';
import { NOMBRE_RESPUESTA, vistaPropuestas, type DatosPropuestas } from './vistaPropuestas';
import { vistaPreguntas, type DatosPreguntas } from './vistaPreguntas';
import { nombreComoQuedo, nombreTipoEnBuzon, notasDelBuzon, textoDeNotaALaVista, vistaBuzon, type DatosBuzon } from './vistaBuzon';
import { vistaDocumentos, type DatosDocumentos } from './vistaDocumentos';
import { NOMBRE_ESTADO_MISION, NOMBRE_SITUACION, vistaRuta, type DatosRuta } from './vistaRuta';
import { enTuPlan } from '../../src/director/consumoDelPlan';
import type { PermisoNegado } from '../servidor/permisosNegados';
import { filasBitacora, panelBitacora, type DatosBitacora } from './bitacoraDelComputador';
import { nombreEsfuerzo, nombreModelo, seccionDirector, type DatosDirector } from './modeloDelDirector';
import { vistaModelo, type DatosModelo } from './modelView';
import { PESTANAS_MODELO } from './pestanasModelo';
import { seccionAjustesPropios } from './vistaAjustesPropios';
import { enTuPlanTexto, seccionGasto, type DatosGasto, type Lanzamiento } from './vistaGasto';
import { avisoMidiendo, cuantoGasta, seccionMedicion, type EstadoMedicion } from './vistaMedicion';
import { MODOS_DE_PERMISOS, seccionPermisos, type DatosPermisos } from './vistaPermisos';
import { en } from './textos/en';
import { es } from './textos/es';

afterEach(() => ponerIdioma('es'));

/** Lo que una frase pide entre llaves, en todas sus formas. */
const llaves = (x: string | { uno: string; otros: string }) => [...new Set([...(typeof x === 'string' ? x : `${x.uno} ${x.otros}`).matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();

describe('el archivo de textos, con el español como modelo (pd_idiomas; t_decide_textos_archivo)', () => {
  it('al inglés no le falta ni le sobra ninguna clave', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
  });

  it('cada frase tiene la misma forma en los dos idiomas y pide lo mismo entre llaves', () => {
    for (const clave of Object.keys(es) as (keyof typeof es)[]) {
      expect(typeof en[clave], clave).toBe(typeof es[clave]);
      expect(llaves(en[clave]), clave).toEqual(llaves(es[clave]));
    }
  });

  it('t da la frase del idioma de ahora, con lo que va entre llaves y su forma según el número', () => {
    expect(t('lectura.segundosMas', { n: 1 })).toBe('un segundo más');
    expect(t('lectura.segundosMas', { n: 4 })).toBe('4 segundos más');
    ponerIdioma('en');
    expect(idiomaActual()).toBe('en');
    expect(t('lectura.segundosMas', { n: 1 })).toBe('one more second');
    expect(t('lectura.segundosMas', { n: 4 })).toBe('4 more seconds');
    // Lo que no se le dio queda a la vista: nunca una frase cortada en silencio
    expect(t('lectura.sinRespuesta')).toBe('{cuantos}, no reply yet');
  });
});

describe('las fechas y los números, según el idioma', () => {
  const momentoLocal = new Date(2026, 9, 30, 23, 17).toISOString();

  it('en inglés', () => {
    ponerIdioma('en');
    expect(lenguaje()).toBe('en-US');
    expect(fecha('2026-10-30')).toBe('Oct 30');
    expect(fecha(momentoLocal)).toBe('Oct 30');
    expect(momento(momentoLocal).replace(/\s/g, ' ')).toBe('Oct 30, 11:17 PM');
    expect(hora(momentoLocal).replace(/\s/g, ' ')).toBe('11:17 PM');
    expect(pct(59.6)).toBe('60%');
    expect(miles(1_400_000)).toBe('1.4M');
    expect(miles(12_000)).toBe('12K');
    expect(NOMBRE_NIVEL.foco).toBe('In focus');
  });

  it('en español, todo sigue igual', () => {
    expect(lenguaje()).toBe('es');
    expect(fecha('2026-10-30')).toBe(new Date(2026, 9, 30).toLocaleDateString('es', { day: 'numeric', month: 'short' }));
    // Con su hora, el mes en palabras; en las listas, corto (t_decide_fecha_corta)
    expect(momento(momentoLocal).replace(/\s/g, ' ')).toMatch(/^30 de octubre, 11:17 p\. ?m\.$/);
    expect(fecha(momentoLocal)).not.toContain('octubre');
    expect(pct(59.6)).toBe('60 %');
    expect(miles(1_400_000)).toBe('1,4 M');
    expect(miles(12_000)).toBe('12 mil');
    expect(NOMBRE_NIVEL.foco).toBe('En foco');
  });
});

describe('lo que dice la lectura, según el idioma', () => {
  it('el seguro de «Entendido»', () => {
    expect(avisoDeEspera(3.2)).toBe('¡Ey, espera! ¿Seguro que ya la leíste? Dale 4 segundos más y el botón queda listo.');
    ponerIdioma('en');
    expect(avisoDeEspera(0.4)).toBe('Hey, hold on! Are you sure you read it? Give it one more second and the button will be ready.');
  });

  it('el rótulo de lo comentado', () => {
    ponerIdioma('en');
    expect(resumenComentarios(1, 0)).toBe('1 comment on this idea, no reply yet');
    expect(resumenComentarios(3, 3)).toBe('3 comments on this idea, with their replies');
    expect(resumenComentarios(3, 1)).toBe('3 comments on this idea, 1 with a reply');
  });
});

describe('qué idioma se usa', () => {
  it('la primera vez, el del navegador: español si está en español, inglés en cualquier otro caso', () => {
    expect(idiomaDelNavegador('es-CO')).toBe('es');
    expect(idiomaDelNavegador('es')).toBe('es');
    expect(idiomaDelNavegador('en-US')).toBe('en');
    expect(idiomaDelNavegador('fr')).toBe('en');
    expect(idiomaDelNavegador('este')).toBe('en');
    expect(idiomaDelNavegador(undefined)).toBe('en');
    expect(esIdioma('en')).toBe(true);
    expect(esIdioma('pt')).toBe(false);
  });

  it('la página lo fija antes de pintar y el servidor lo guarda en este computador, fuera de git', () => {
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8');
    expect(app).toContain("if ('sinProyectos' in nuevo) return pintarBienvenida(nuevo);\n  if (marcaIdioma === cambiosDeIdioma) fijarIdioma(nuevo.idioma);");
    expect(app).toContain('idiomaDelNavegador(navigator.language)');
    const api = readFileSync(new URL('../servidor/api.ts', import.meta.url), 'utf8');
    expect(api).toContain("if (ruta === '/idioma' && req.method === 'POST') {");
    expect(api).toContain('idioma: (await leerLocal(raiz)).idioma ?? null,');
    const proyectos = readFileSync(new URL('../../src/director/proyectos.ts', import.meta.url), 'utf8');
    expect(proyectos).toContain('...(esIdioma(x?.idioma) ? { idioma: x.idioma } : {}),');
    // Sin tocar el idioma de la voz: sale de cada documento (src/director/voz.ts)
    expect(readFileSync(new URL('./textos.ts', import.meta.url), 'utf8')).not.toContain('documentElement');
  });
});

describe('el selector ES y EN (t_decide_selector_cuando)', () => {
  it('las dos siglas, siempre a la vista, con la de ahora resaltada', () => {
    const html = selectorIdioma('en');
    expect(html).toContain('data-idioma="es" aria-pressed="false"');
    expect(html).toMatch(/class="sigla-idioma sel" data-idioma="en" aria-pressed="true"[^>]*>EN</);
    expect(selectorIdioma('es')).toMatch(/class="sigla-idioma sel" data-idioma="es"/);
  });

  it('va junto a tu nombre, al pie de la barra, y lo que eliges se guarda en este computador', () => {
    const pagina = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    expect(pagina).toMatch(/id="identidad"[^\n]*\n[^\n]*\n\s*<div class="selector-idioma" id="selector-idioma"/);
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8');
    expect(app).toContain("fetch('/__estudio/director/idioma', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idioma }) }).then((r) => r.ok)");
  });
});

// Las palabras que delatan el español en lo que pinta el Studio, fuera de lo que escribió el director (va con la marca XX)
const ESPANOL = /\b(misi[oó]n|misiones|paso|entrega|entregar|director la|revisi[oó]n|pedir|lo que sigue|reserva|nivel|logros|aprobada|hazlo|comprueba|listo|foco)\b/i;

describe('«La ruta» en inglés: nada en español de lo suyo (pd_idiomas)', () => {
  // Lo que delata el español en lo de «La ruta», fuera de lo que escribió el director (va con la marca XX)
  const ESPANOL_RUTA = /\b(fase|puerta|criterios?|frentes?|misi[oó]n|misiones|propuestas?|pedidos?|pedido|hecho|hechos|hechas|por hacer|aprobadas?|aprobaste|bajo niebla|estás|reemplazado|director la|cruzar|cruzada|lanzamiento|adelantado|plan de la)\b/i;
  const f = { id: 'arranque', nombre: 'XX', etapa: 'XX', duracion: 'XX', meta: 'XX', porQue: 'XX', puerta: { nombre: 'XX', prueba: 'XX' }, criterios: [{ id: 'c1', texto: 'XX' }], misiones: ['XX', 'XX t_a'], frentes: {} } as unknown as Fase;
  const ultima = { ...f, id: 'fin' } as Fase;
  const mision = (x: Partial<Mision> = {}): Mision => ({ id: 't_a', para: TITULAR, fase: 'arranque', frente: 'direccion', titulo: 'XX', porQue: 'XX', pasos: ['XX'], entrega: 'XX', xp: 10, ...x });
  const propuesta = (id: string, fase = 'arranque') => ({ id, area: 'XX', titulo: 'XX', problema: 'XX', propuesta: 'XX', conecta: 'XX', fase }) as Propuesta;
  const plan = {
    ...(planPlantilla as unknown as Plan), fases: [f, ultima], frentes: [{ id: 'direccion', nombre: 'XX', rutas: [] }], adelantado: [{ fase: 'arranque', frente: 'direccion', texto: 'XX' }],
    misiones: [mision(), mision({ id: 't_b' })], revisiones: { t_b: { cuando: '2026-10-30T10:00:00Z', veredicto: 'aprobada', comentario: 'XX' } },
    propuestas: [propuesta('pr_a'), propuesta('pr_b', 'fin')],
    pedidos: [{ id: 'pd_a', fase: 'arranque', texto: 'XX' }, { id: 'pd_b', fase: 'arranque', texto: 'XX', hecho: { cuando: '2026-10-30T10:00:00Z', nota: 'XX' } }, { id: 'pd_c', fase: 'arranque', texto: 'XX', reemplaza: ['pd_a'] }, { id: 'pd_d', fase: 'despues', texto: 'XX' }],
  } as unknown as Plan;
  const datos = (fase: Fase, abierta: boolean, pestana: PestanaRuta): DatosRuta => ({
    plan, estado: estadoVacio(), fase, abierta, titular: 'Ana', personas: [{ id: TITULAR, nombre: 'Ana' }], elegir: () => pestana,
    rutaHTML: '', tableroFase: '', pintarPuerta: () => '', filaCriterio: () => '', listaDePropuestas: () => '', misionPasada: () => '', plegable: () => '',
  });
  const sinMarcas = (x: string) => x.replace(/<[^>]*>/g, ' ');

  it('sus cuatro pestañas, con lo que pinta cada una', () => {
    ponerIdioma('en');
    const pestanas: PestanaRuta[] = ['fase', 'misiones', 'pedidos', 'propuestas'];
    const textos = pestanas.map((p) => sinMarcas(vistaRuta(datos(f, true, p))));
    expect(textos[0]).toContain('Phase 0:');
    expect(textos[0]).toContain('To cross the gate, all of this at 100%');
    // Los frentes salieron de la pantalla (decisión del titular nmvya8sb4tit, pd_hoy_en_ruta)
    expect(textos[0]).not.toContain('What each front does');
    expect(textos[0]).toContain('Already done ahead for this phase');
    expect(textos[1]).toContain('The missions of this phase');
    expect(textos[1]).toContain('Approved');
    expect(textos[2]).toContain('Requested for this phase');
    expect(textos[2]).toContain('To do');
    expect(textos[2]).toContain('Replaced');
    expect(textos[3]).toContain('The proposals of this phase');
    expect(['Phase', 'Missions', 'Requests', 'Proposals'].every((x) => textos[0].includes(x))).toBe(true);
    for (const x of textos) expect(x).not.toMatch(/\b(La fase|Fase|Misiones|Lo pedido|Propuestas|Puerta|Por hacer|Hecho|Reemplazado|Todo hecho|Aprobadas)\b/);
    // Las palabras en inglés del método (gate, front, phase) pasan; lo que delata el español, no
    for (const x of textos.map((y) => y.replace(/\b(mission|missions|proposal|proposals)\b/gi, ''))) expect(x).not.toMatch(ESPANOL_RUTA);
  });

  it('una fase bajo niebla y lo de después del lanzamiento', () => {
    ponerIdioma('en');
    const fase = sinMarcas(vistaRuta(datos(ultima, false, 'fase')));
    expect(fase).toContain('are waiting for this phase');
    expect(fase).toContain('In the fog');
    const pedidos = sinMarcas(vistaRuta(datos(ultima, false, 'pedidos')));
    expect(pedidos).toContain('After the launch');
    expect(pedidos).toContain('it stays in view and holds no gate');
    expect(pedidos).not.toMatch(ESPANOL_RUTA);
    const propuestas = sinMarcas(vistaRuta(datos(ultima, false, 'propuestas')));
    expect(propuestas).not.toMatch(ESPANOL_RUTA);
  });

  it('los nombres de cada estado, y los que usa el método', () => {
    ponerIdioma('en');
    expect(Object.values(NOMBRE_SITUACION)).toEqual(['Passed', 'You are here', 'In the fog']);
    expect(Object.values(NOMBRE_RESPUESTA)).toEqual(['Accepted', 'Under review', 'Discarded']);
    expect(t('ruta.puerta', { nombre: 'XX' })).toBe('Gate: XX');
    expect(t('ruta.cruzar')).toBe('Cross the gate');
    expect(t('ruta.faltan', { n: 1, criterios: 'XX' })).toBe('One criterion is not at 100%: XX.');
    expect(t('ruta.faltan', { n: 2, criterios: 'XX' })).toBe('2 criteria are not at 100%: XX.');
    expect(tituloPestanaRuta('pedidos')).toBe('Requests');
    ponerIdioma('es');
    expect(NOMBRE_SITUACION.actual).toBe('Estás aquí');
    expect(tituloPestanaRuta('pedidos')).toBe('Lo pedido');
  });

  it('lo que le pone la página: el código no deja frases escritas a mano', () => {
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8');
    const parte = (desde: string, hasta: string) => app.slice(app.indexOf(desde), app.indexOf(hasta));
    const delaRuta = [parte('function rutaHTML(', '// ───────────────────────────────────────────── misiones'), parte('function filaCriterio(', 'function misionPasada('), parte('function filaPropuesta(', 'function cierreDePropuesta('), parte('function misionPasada(', 'function filaPropuesta(')].join('\n');
    for (const frase of ['misiones tuyas', 'criterios al 100', 'esperando al director', 'propuestas por decidir', 'se mide solo', 'Decisión de', 'Se cumplió solo', 'Lo evalúa el director', 'Deshacer mi decisión', 'Decidir yo', 'Puerta:', 'Cruzada', 'Reabrir esta fase', 'Cruzar la puerta', 'Lo que comentaste', 'Por decidir', 'Aceptada ·', 'Verla en', '<b>Hecha:', 'Con la meta fijada'])
      expect(delaRuta, frase).not.toContain(frase);
  });
});

describe('«Documentos» en inglés: nada en español de lo suyo (pd_idiomas)', () => {
  // Lo que delata el español en la columna y en el documento abierto, fuera de lo que escribió el director (va con la marca XX)
  const ESPANOL_DOCS = /\b(sigue este|despu[eé]s|le[ií]dos?|le[ií]da|misi[oó]n|documentos?|repositorio|proyecto|para consultar|archivos clave|ver todos|plegar|comentar|al director|m[aá]rcala|falta|se abre|elige)\b/i;
  const mision = { titulo: 'XX' } as Mision;
  const enRuta = [
    { ruta: 'a', estado: 'siguiente', mision, lectura: 'siguiente' },
    { ruta: 'b', estado: 'pendiente', mision, lectura: 'despues' },
    { ruta: 'c', estado: 'pendiente', mision, lectura: 'leido' },
  ] as DatosDocumentos['enRuta'];
  const datos = (x: Partial<DatosDocumentos> = {}): DatosDocumentos => ({
    yo: 'ana', persona: 'ana', nombreDePersona: 'XX', curados: [{ ruta: 'g', titulo: 'XX', porQue: 'XX' }], archivosClave: [{ ruta: 'k.ts', para: 'XX' }], enRuta,
    documentos: [{ ruta: 'p', titulo: 'XX' }, { ruta: 'repo:r.md', titulo: 'XX' }, { ruta: 'repo:CLAUDE.md', titulo: 'XX' }], documentosFuera: 2, repositorioConectado: true, doc: null, notas: [], listaPlegada: false,
    alEmpezarColumna: () => undefined, plegableEnColumna: () => '', plegable: () => '', tituloDoc: () => 'XX', leidasDe: () => [], reabierta: () => false,
    faltaEnParte: () => ({ total: 2, hechas: 1, decisiones: 2 }), porTrozos: () => '', conDecisiones: () => '', enParte: () => ({ vista: 'documentos' }), tarjetaNota: () => '', volverAMisionDe: () => '', ajustesLector: () => '', claseLector: () => '',
    ...x,
  });
  const sinMarcas = (x: string) => x.replace(/<[^>]*>/g, ' ');
  const conAtributos = (x: string) => x.replace(/<[^>]*\b(?:title|aria-label)="([^"]*)"[^>]*>/g, ' $1 ').replace(/<[^>]*>/g, ' ');
  const abierto = { ruta: 'a', texto: '# XX\n\n## XX1\nXX\n\n## XX2\nXX\n\n## XX3\nXX\n' };

  it('la columna, con «Project documentation», lo plegable y lo que dice al pasar el ratón', () => {
    ponerIdioma('en');
    const html = vistaDocumentos(datos());
    const texto = sinMarcas(html);
    expect(texto).toContain('Your mission now');
    expect(texto).toContain('Project documentation');
    expect(texto).toContain('Key files');
    expect(texto).toContain("From the project's repository");
    expect(texto).toContain('Instructions for agents');
    expect(texto).toContain('CLAUDE.md: instructions for Claude Code');
    expect(texto).toContain('There are 2 more documents in the repository that do not fit in this list.');
    // Solo las palabras en inglés que comparten letras con las delatoras («document», «project», «repository», «mission»)
    const propio = (x: string) => x.replace(/\b(documents?|documentation|project'?s?|repository|mission)\b/gi, '');
    expect(propio(conAtributos(html))).not.toMatch(ESPANOL_DOCS);
    // Lo que la página recuerda no cambia con el idioma
    const pedidas: string[] = [];
    vistaDocumentos(datos({ plegableEnColumna: (clave) => { pedidas.push(clave); return ''; } }));
    expect(pedidas).toEqual(['columna|Después', 'columna|Ya leídos', 'columna|otros', 'columna|instrucciones']);
  });

  it('el documento abierto: lo que falta, la parte cerrada y lo ya leído, con lo que escribió el director tal cual', () => {
    ponerIdioma('en');
    const html = vistaDocumentos(datos({ doc: abierto, leidasDe: () => ['XX1'] }));
    expect(sinMarcas(html)).toContain('Opens when you finish “XX2”.');
    expect(sinMarcas(html)).toContain('1 of 2');
    expect(sinMarcas(html)).toContain('2 decisions left');
    expect(sinMarcas(html)).toContain('the part you read is here, folded');
    const todo = sinMarcas(vistaDocumentos(datos({ doc: abierto, leidasDe: () => ['XX1', 'XX2', 'XX3'] })));
    expect(todo).toContain('You read the whole document: the 3 parts you read are here, folded.');
    // Sin nada abierto, lo que invita a elegir uno
    expect(sinMarcas(vistaDocumentos(datos()))).toContain('Choose a document.');
  });

  it('las ideas y las decisiones, con los nombres que eligió el titular; el código no deja frases escritas a mano', () => {
    ponerIdioma('en');
    expect(t('docs.entendido')).toBe('Got it');
    expect(t('docs.aprobar')).toBe('Approve recommendation');
    expect(t('docs.decidirOtra')).toBe('🎙 Decide otherwise');
    expect(t('docs.documentacion')).toBe('Project documentation');
    expect(t('docs.ideasEntendidas', { n: 3 })).toBe('3 ideas understood');
    expect(t('docs.cuentaIdeas', { n: 1, total: 4 })).toBe('Idea 1 of 4');
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8');
    const parte = (desde: string, hasta: string) => app.slice(app.indexOf(desde), app.indexOf(hasta));
    const deDocumentos = [parte('function botonesDecision(', '/**\n * Una parte por leer').replace(/\/\*\*[\s\S]*?\*\//g, ''), parte('function porTrozos(', 'function esperaDeIdea(').replace(/\/\*\*[\s\S]*?\*\//g, ''), parte('function leidoDoc(', 'let animandoParte')].join('\n');
    for (const frase of ['Apruebo lo que recomiendas', 'Decido otra cosa', 'Agregar a esta decisión', "icono('check')} Respondida", 'respondida: quedó', 'Falta tu decisión', '<span>Entendido</span>', 'Comentar esta idea', 'ideas entendidas', 'Lee de a una idea']) expect(deDocumentos, frase).not.toContain(frase);
    ponerIdioma('es');
    expect(t('docs.documentacion')).toBe('Documentación del proyecto');
  });
});

describe('el Buzón en inglés: nada en español de lo suyo (pd_idiomas)', () => {
  // Lo que delata el español en el Buzón, fuera de lo que dijo cada persona (va con la marca XX)
  const ESPANOL_BUZON = /\b(buz[oó]n|todas|esperando|respondidas?|integradas?|aplazadas?|rechazadas?|requiere|tipo|c[oó]mo qued[oó]|encontr[eé]|buscar|nada|ninguna|todav[ií]a|comentario|ajuste|falla|pregunta|sin tipo|filtrar|sobre|graba|grabar|detener|enviar|adjuntar|quitar)\b/i;
  const nota = (id: string, x: Partial<Nota> = {}) => ({ id, cuando: '2026-10-20T10:00:00Z', quien: 'Ana', de: 'ana', sobre: { tipo: 'general' }, texto: 'XX', ...x }) as Nota;
  const datos = (x: Partial<DatosBuzon> = {}): DatosBuzon => ({
    notas: [nota('a', { tipo: 'idea' }), nota('b', { tipo: 'falla' }), nota('c', { tipo: 'pregunta', sobre: { tipo: 'pregunta' } }), nota('d', { tipo: 'ajuste' }), nota('e', { tipo: 'respuesta' }), nota('f')],
    respuestas: { b: { cuando: '2026-10-21T10:00:00Z', texto: 'XX', tratamiento: 'informada' }, d: { cuando: '2026-10-21T10:00:00Z', texto: 'XX', tratamiento: 'rechazada' } } as unknown as DatosBuzon['respuestas'],
    transcripciones: {}, busqueda: '', tipo: '', como: '', fijarFiltros: () => {}, respondidasAbiertas: false, resueltoAqui: () => false,
    filtroVisible: () => '', plegable: () => '', tarjetaNota: () => '<li>XX</li>', ...x,
  });
  const conAtributos = (x: string) => x.replace(/<[^>]*\b(?:placeholder|aria-label)="([^"]*)"[^>]*>/g, ' $1 ').replace(/<[^>]*>/g, ' ');

  it('sus filtros, sus estados y sus tipos, con los nombres que eligió el titular (nmvxx8kr9tit)', () => {
    ponerIdioma('en');
    const html = vistaBuzon(datos());
    const texto = conAtributos(html);
    for (const x of ['Search the Inbox', 'All', 'Idea', 'Bug', 'Question', 'Tweak', 'Comment', 'No type', 'Status:', 'Waiting', 'Answered', 'Declined', 'Waiting for the director to answer', 'Already answered'])
      expect(texto, x).toContain(x);
    expect(texto).not.toMatch(ESPANOL_BUZON);
    expect((['esperando', 'integrada', 'aplazada', 'decision', 'informada', 'rechazada'] as const).map(nombreComoQuedo)).toEqual(['Waiting', 'Done', 'Postponed', 'To decide', 'Answered', 'Declined']);
    expect((['respuesta', 'ajuste', 'idea', 'falla', 'pregunta'] as const).map(nombreTipoEnBuzon)).toEqual(['Comment', 'Tweak', 'Idea', 'Bug', 'Question']);
    ponerIdioma('es');
    expect(nombreComoQuedo('decision')).toBe('Requiere tu decisión');
    expect(nombreTipoEnBuzon('falla')).toBe('Algo falla');
  });

  it('sin hallar nada y sin nada que esperar, y lo que dijo la persona queda como está', () => {
    ponerIdioma('en');
    expect(conAtributos(notasDelBuzon(datos({ busqueda: 'zzz' })))).toContain('No note in the Inbox says “zzz”');
    const vacio = conAtributos(notasDelBuzon(datos({ notas: [] })));
    expect(vacio).toContain('Nothing waiting: the director is up to date.');
    expect(vacio).toContain('None yet.');
    expect(vacio).not.toMatch(ESPANOL_BUZON);
    // Lo dicho no se traduce: la tarjeta lo recibe tal cual
    const dichas: (string | undefined)[] = [];
    vistaBuzon(datos({ notas: [nota('a', { texto: 'Lo que dije en español' })], tarjetaNota: (n) => { dichas.push(n.texto); return ''; } }));
    expect(dichas).toEqual(['Lo que dije en español']);
  });

  it('el diálogo para comentar y la grabadora: el código no deja frases escritas a mano', () => {
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8');
    const parte = (desde: string, hasta: string) => app.slice(app.indexOf(desde), app.indexOf(hasta));
    const delDialogo = [parte('async function comentar(', 'type Dicho = '), parte('function tarjetaNota(', 'let busquedaBuzon'), parte('function sobreDe(', 'const corregible')].join('\n');
    for (const frase of ['Dejarlo en el Buzón', '¿Qué es?', 'Tu comentario (o graba', 'Si trae varias cosas', 'Esperando al director', '>Corregir<', '>Borrar<', 'está en la respuesta del director', 'la misión «', 'el proyecto en general']) expect(delDialogo, frase).not.toContain(frase);
    const grabadora = readFileSync(new URL('./grabadora.ts', import.meta.url), 'utf8').replace(/^\s*(\/\/|\*|\/\*\*).*$/gm, '');
    for (const frase of ['Detener y revisar', 'Enviar ya', 'Añadir otro fragmento', 'Quitar el audio', '<b>Grabando', 'Audio listo', 'Todavía no está grabando']) expect(grabadora, frase).not.toContain(frase);
    ponerIdioma('en');
    expect(t('buzon.dejar')).toBe('Leave it in the Inbox');
    expect(t('grabadora.detenerRevisar')).toBe('Stop and review');
    expect(t('grabadora.enviarYa')).toBe('Send now');
    expect(t('buzon.sobreMision', { que: 'XX' })).toBe('the mission “XX”');
  });
});

describe('“Modelo y consumo” en inglés: nada en español de lo suyo (pd_idiomas)', () => {
  // Lo que delata el español en sus cinco pestañas, fuera de lo que viene del servidor o lo escribió el director (va con la marca XX)
  const ESPANOL_MODELO = /\b(el|la|los|las|del|de|con|para|por|que|qu[eé]|una?|y|en|se|su|sus|tu|tus|lo|al|es|est[aá]|cada|solo|sin|todos?|todas?|permisos?|autoriz\w+|lanzamientos?|revisi[oó]n|revisiones|gast[ao]\w*|semana|proyectos?|computador|ajustes|medici[oó]n|n[uú]cleo|vueltas?|casos?|pasan?|fallan?|renov\w+|negad[oa]s?|bit[aá]cora|hoy|d[ií]as|horas|l[ií]mites?|claves?|nueva|marcad\w+|aprob\w+|siempre|nunca|todav[ií]a|mientras|ahora|desde|hasta|entre|como|modelos?|esfuerzo|vigilado|terminaron|tokens? de|lanzar\w*)\b/i;
  const sinMarcas = (x: string) => x.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  const conAtributos = (x: string) => x.replace(/<[^>]*\b(?:title|aria-label)="([^"]*)"[^>]*>/g, ' $1 ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  // La forma del HTML sin lo que dice al pasar el ratón: las marcas, los ids, los data-* y las clases no dependen del idioma
  const forma = (x: string) => (x.match(/<[^>]*>/g) ?? []).map((m) => m.replace(/\s(?:title|aria-label)="[^"]*"/g, ''));
  const AHORA = new Date('2026-10-29T19:00:00.000Z');
  const CUANDO = '2026-10-29T18:00:00.000Z';

  const lanzamiento = (x: Partial<Lanzamiento> = {}): Lanzamiento => ({
    cuando: CUANDO, proyecto: 'p', tipo: 'revision', modelo: 'm', entrada: 1000, cache: 20_000, salida: 3000,
    limites: { cincoHoras: { uso: 40, renueva: '2026-10-29T22:00:00.000Z' }, semana: { uso: 12, renueva: '2026-10-28T00:00:00.000Z' } },
    ...x,
  });
  const datosGasto = (x: Partial<DatosGasto> = {}): DatosGasto => ({
    consumo: [], medida: [], ahora: AHORA,
    nombreProyecto: () => 'XX', plegable: () => '', ...x,
  });
  const completo = lanzamiento({ negados: ['XX'], semana: { desde: 10, hasta: 12, renueva: 'v1' } });

  it('las cinco pestañas, con los nombres que eligió el titular, y sus ids y anclas no cambian', () => {
    expect(PESTANAS_MODELO.map((p) => p.titulo)).toEqual(['El director', 'Permisos', 'Ajustes de Claude Code', 'Lo que gasta', 'Bitácora']);
    ponerIdioma('en');
    expect(PESTANAS_MODELO.map((p) => p.titulo)).toEqual(['The director', 'Permissions', 'Claude Code settings', 'Usage', 'Log']);
    expect(PESTANAS_MODELO.map((p) => [p.id, ...p.anclas])).toEqual([
      ['director', 'm-director'], ['permisos', 'm-permisos'], ['ajustes', 'm-ajustes'], ['gasto', 'm-limites', 'm-consumo', 'm-medicion'], ['bitacora', 'm-bitacora'],
    ]);
    // La vista: la barra y su introducción, y lo que la página usa para moverse no cambia con el idioma
    const bitacora = { abierta: false, cargar: () => undefined, datos: () => ({ bitacora: null, error: '', filtro: '', nombre: (id?: string) => id ?? '' }), plegable: '' };
    const base = { director: {} as DatosModelo['director'], permisos: {} as DatosModelo['permisos'], ajustes: undefined, gasto: {} as DatosModelo['gasto'], medicion: {} as DatosModelo['medicion'], bitacora, ponerPestana: () => undefined, ancla: null };
    const enHtml = vistaModelo({ ...base, pestana: 'ajustes' });
    ponerIdioma('es');
    const esHtml = vistaModelo({ ...base, pestana: 'ajustes' });
    expect(esHtml).toContain('role="tablist" aria-label="Modelo y consumo"');
    expect(esHtml).toContain('Con qué modelo trabaja el director y lo que gasta, en este computador.');
    expect(forma(enHtml)).toEqual(forma(esHtml));
    const texto = conAtributos(enHtml);
    for (const x of ['The director', 'Permissions', 'Claude Code settings', 'Usage', 'Log', 'Model &amp; usage', 'Which model the director works with and what it uses, on this computer.']) expect(enHtml, x).toContain(x);
    expect(texto).not.toMatch(ESPANOL_MODELO);
  });

  it('«Lo que gasta»: los límites, las cifras y la medida del director', () => {
    ponerIdioma('en');
    const otro = lanzamiento({ proyecto: 'q', tipo: 'urgencia', cuando: '2026-10-29T17:00:00.000Z' });
    const medida = [{ cuando: CUANDO, cerro: true, tokens: 7, tiempos: { modeloMs: 1_500_000, computadorMs: 300_000, ayudanteMs: 0, pruebas: [{ orden: 'XX', ms: 50_000, fallo: true }] }, talCual: 3, cambiadas: 1, rehacer: 0, aclaraciones: 0 }, { cuando: CUANDO, cerro: false, tokens: null, tiempos: null, talCual: 0, cambiadas: 0, rehacer: 0, aclaraciones: 0 }] as unknown as DatosGasto['medida'];
    const html = seccionGasto(datosGasto({ consumo: [completo, otro], medida }));
    const texto = conAtributos(html);
    for (const x of [
      'Your plan limits', 'Every five hours', 'Weekly', '40% used', 'Renewed', 'renewed on', 'renews on', 'What the director used', 'Today', 'Last 7 days',
      '≈ 2% of your week, approximate', '2 launches · 48K tokens', '1 permission denied', 'By project, in the last 7 days',
      'the large line',
      'How what it recommended turned out, by review (this project)', 'Model / your computer', 'Approved as is', 'To redo', 'Yes', '25 min / 5 min', 'XX: 50 s (failed)', '“I don\'t get it”',
      'Each row is a review on this computer', 'The tokens are returned by Claude Code when each launch ends.', 'Denied permissions are what the director tried',
    ]) expect(texto, x).toContain(x);
    expect(texto).not.toMatch(ESPANOL_MODELO);
    expect(html).not.toMatch(/US\$|\$\d|d[o]llar|price/i);
    // Sin lanzamientos, y con uno solo (sin tarjeta por proyecto)
    const vacio = conAtributos(seccionGasto(datosGasto()));
    expect(vacio).toContain('There are no director launches on this computer yet.');
    expect(vacio).toContain('Meanwhile, see them in Claude Code with');
    expect(vacio).not.toMatch(ESPANOL_MODELO);
    expect(conAtributos(seccionGasto(datosGasto({ consumo: [lanzamiento()] })))).toContain('1 launch · 24K tokens');
    // La parte de tu semana sigue las dos lenguas, y en español nada cambió
    ponerIdioma('es');
    for (const p of [2, 0.05, 12.5, 0.1, 100, undefined]) expect(enTuPlanTexto(p)).toBe(enTuPlan(p));
    ponerIdioma('en');
    expect(enTuPlanTexto(0.05)).toBe('≈ less than 0.1% of your week, approximate');
    expect(enTuPlanTexto(12.5)).toBe('≈ 12.5% of your week, approximate');
  });

  const permiso = (x: Partial<PermisoNegado> = {}): PermisoNegado => ({ proyecto: 'p', herramienta: 'Bash', intentos: ['XX'], cuando: CUANDO, registro: 'r.log', veces: 3, regla: 'Bash(curl:*)', que: 'XX', riesgo: 'XX', ...x });
  const datosPermisos = (modo: DatosPermisos['modo'], automatico: DatosPermisos['automatico'] = { admite: false, porque: 'XX' }): DatosPermisos => ({
    modo, automatico,
    negados: {
      panel: {
        pendientes: [
          permiso(), permiso({ regla: 'Bash(git push:*)', nunca: { porque: 'XX', enSuLugar: 'XX' } }), permiso({ regla: null, motivo: 'XX' }),
          permiso({ regla: 'Bash(npm test:*)', ofrecido: 'pruebas' }), permiso({ regla: 'Bash(ls:*)', veces: 1 }),
        ],
        autorizados: [{ regla: 'Bash(a:*)', alcance: 'todos', cuando: CUANDO, quien: 'XX' }, { regla: 'Bash(b:*)', alcance: 'proyecto', proyecto: 'p', cuando: CUANDO, quien: 'XX', origen: 'claude' }],
      },
      marcados: new Set(['p Bash(curl:*)']), alcances: new Map([['p Bash(ls:*)', 'todos' as const]]), activo: 'p', nombre: () => 'XX',
    },
    skills: {
      panel: {
        skills: [
          { proyecto: 'p', nombre: 'XX', ruta: '.claude/XX', huella: 'h', estado: 'nueva', hallazgos: ['XX'] },
          { proyecto: 'p', nombre: 'XX', ruta: '.claude/XX', huella: 'h', estado: 'cambio', hallazgos: [] },
          { proyecto: 'p', nombre: 'XX', ruta: '.claude/XX', huella: 'h', estado: 'autorizada', hallazgos: [], quien: 'XX', cuando: CUANDO },
          { proyecto: 'p', nombre: 'XX', ruta: '.claude/XX', huella: 'h', estado: 'autorizada', hallazgos: [] },
        ],
      },
      marcadas: new Set<string>(), nombre: () => 'XX',
    },
  });

  it('«Permisos»: las casillas fijas están listas antes de hacer falta, publicar entre ellas, con su alcance y lo que da (nmvzq8eb4tit)', () => {
    ponerIdioma('en');
    const base = datosPermisos('autorizado');
    const firma = { cuando: CUANDO, quien: 'XX' };
    const conPublicar = [{ regla: 'Bash(npm publish:*)', alcance: 'todos' as const, ...firma }, { regla: 'Bash(gh release:*)', alcance: 'todos' as const, ...firma }];
    const html = seccionPermisos({ ...base, negados: { ...base.negados, activo: 'p', panel: { pendientes: [], autorizados: conPublicar } } });
    expect(html).toContain('What you allow the director');
    expect(html).toMatch(/data-permiso-grupo="publicar" checked> <span>Publish<\/span>/);
    for (const id of ['leer', 'probar', 'commits', 'subir', 'traer', 'instalar']) expect(html).toMatch(new RegExp(`data-permiso-grupo="${id}"> <span>`));
    expect(html).toMatch(/data-alcance-grupo="publicar"[^>]*><option value="proyecto">[^<]*<\/option><option value="todos" selected>/);
    expect(html).toContain('<code>Bash(gh release:*)</code>');
    expect(html.indexOf('data-permiso-grupo')).toBeLessThan(html.indexOf('<h4>What the director was denied'));
    // Aún sin saber lo autorizado, a la vista pero apagadas: nunca una marca falsa
    const buscando = seccionPermisos({ ...base, negados: { ...base.negados, panel: null } });
    expect(buscando).toMatch(/data-permiso-grupo="publicar" disabled>/);
    // Marcarla es la autorización: guarda sola, por su propia ruta, y las reglas las pone el servidor
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8');
    expect(app).toContain('if (negado.dataset?.permisoGrupo !== undefined) return void cambiarGrupo(negado.dataset.permisoGrupo, negado.checked);');
    expect(app).toContain("'/__estudio/director/permisos/grupo'");
    const api = readFileSync(new URL('../servidor/api.ts', import.meta.url), 'utf8');
    expect(api).toContain("if (ruta === '/permisos/grupo' && req.method === 'POST') {");
    expect(api).toContain('const grupo = PAQUETE_DE_PERMISOS.find((g) => g.id === cuerpo.grupo);');
  });

  it('«Permisos»: los modos, lo negado, lo autorizado y las skills; las reglas y los ids no cambian con el idioma', () => {
    ponerIdioma('en');
    const html = seccionPermisos(datosPermisos('pregunta'));
    const texto = conAtributos(html);
    for (const x of [
      'How the director asks for permissions', 'Only what is authorized', 'Ask me in the Studio', 'Automatic, watched', '“Automatic, watched” is off:', 'Try the dialog',
      'What the director was denied', 'Authorize the checked', 'Authorize and request the review', 'Never, by the Studio\'s rule', 'Not authorized as is', 'Only this project', 'All projects on this computer',
      'Which projects this permission applies to', 'Applies to', 'in 3 reviews; the latest, of', 'in the review of', 'What for:', 'What it wanted it for:', 'The exact rule:', 'Why not:', 'Instead:', 'What could happen:',
      'What you already authorized', 'Approved by Claude Code', 'Authorized by XX on', 'Only “XX”', 'Remove',
      'The skills of your projects', 'What the Studio saw:', 'nothing that approves tools', 'Changed since you authorized it', 'The ones it already loads', 'Authorized by someone.', 'Authorized by XX on', 'It is in',
      'What it never does, in any mode:', 'Each permission is the one for that kind of action',
    ]) expect(texto, x).toContain(x);
    expect(texto).not.toMatch(ESPANOL_MODELO);
    // Con el automático en uso, el aviso es otro; sin él, no hay aviso
    expect(sinMarcas(seccionPermisos(datosPermisos('automatico')))).toContain('is not available on this computer: XX Meanwhile, the director works with “Only what is authorized”.');
    expect(sinMarcas(seccionPermisos(datosPermisos('autorizado', { admite: true })))).not.toContain('is off');
    // La lista nueva, sin nada pendiente, ni autorizado, ni skills
    const vacio = datosPermisos('autorizado');
    vacio.negados = { ...vacio.negados, panel: { pendientes: [], autorizados: [] } };
    vacio.skills = { ...vacio.skills, panel: { skills: [] } };
    const textoVacio = conAtributos(seccionPermisos(vacio));
    expect(textoVacio).toContain('Nothing pending: in its latest reviews it was denied nothing you have not authorized.');
    expect(textoVacio).toContain('None of your projects has skills: there is nothing to authorize.');
    expect(textoVacio).not.toMatch(ESPANOL_MODELO);
    // Buscando y con error
    const buscando = { ...vacio, negados: { ...vacio.negados, panel: null }, skills: { ...vacio.skills, panel: null } };
    expect(sinMarcas(seccionPermisos(buscando))).toContain('Searching the logs of its reviews');
    expect(sinMarcas(seccionPermisos(buscando))).toContain('Searching your projects');
    const error = { ...vacio, negados: { ...vacio.negados, panel: { pendientes: [], autorizados: [], error: 'XX' } }, skills: { ...vacio.skills, panel: { skills: [], error: 'XX' } } };
    expect(sinMarcas(seccionPermisos(error))).toContain('I could not read what was denied to it (XX). Open this tab again in a moment.');
    expect(sinMarcas(seccionPermisos(error))).toContain('I could not read the skills of your projects (XX)');
    // Las reglas no cambian: los ids, los data-* y toda la forma del HTML son los mismos en los dos idiomas, y los tres modos son los de siempre
    const enHtml = [seccionPermisos(datosPermisos('pregunta')), seccionPermisos(datosPermisos('automatico')), seccionPermisos(buscando), seccionPermisos(error), seccionPermisos(vacio)];
    ponerIdioma('es');
    const esHtml = [seccionPermisos(datosPermisos('pregunta')), seccionPermisos(datosPermisos('automatico')), seccionPermisos(buscando), seccionPermisos(error), seccionPermisos(vacio)];
    enHtml.forEach((h, i) => expect(forma(h)).toEqual(forma(esHtml[i])));
    const atributos = (x: string) => [...x.matchAll(/\s(?:data-[\w-]+(?:="[^"]*")?|id="[^"]*"|value="[^"]*")/g)].map((m) => m[0]);
    expect(atributos(enHtml[0])).toEqual(atributos(esHtml[0]));
    expect(atributos(esHtml[0]).filter((a) => a.includes('data-modo-permisos'))).toEqual([' data-modo-permisos="autorizado"', ' data-modo-permisos="pregunta"', ' data-modo-permisos="automatico"']);
    for (const a of ['data-permiso-negado="p Bash(curl:*)"', 'data-alcance-permiso="p Bash(curl:*)"', 'data-autorizar-permisos', 'data-autorizar-permisos="revision"', 'data-quitar-permiso=', 'data-probar-permiso="1"', 'data-skill-marca="p .claude/XX"', 'data-autorizar-skills', 'data-quitar-skill=']) expect(esHtml[0], a).toContain(a);
    expect(esHtml[0]).toContain('Solo lo autorizado');
    expect(esHtml[0]).toContain('Autorizo y pido la revisión');
    expect(esHtml[0]).toContain('<code>Bash(curl:*)</code>');
    expect(MODOS_DE_PERMISOS.pregunta.nombre).toBe('Me pregunta en el Studio');
  });

  it('«Ajustes de Claude Code»: cada clave con su consejo, lo que hoy carga el director y lo nuevo', () => {
    ponerIdioma('en');
    const opciones = (['si', 'no', 'igual', 'nunca'] as const).map((c) => ({ id: c, nombre: 'XX', dentro: 'XX', que: 'XX', enElDirector: 'XX', sinElla: 'XX', consejo: c, fuente: 'https://example.com/XX' }));
    const html = seccionAjustesPropios({ cargar: false, claves: ['si', 'no', 'igual', 'nunca'], opciones, conservados: ['si', 'no'], nuevas: ['igual', 'nunca'] });
    // El consejo de cada clave se escapa (esc), como siempre: el apóstrofo sale como entidad
    const texto = conAtributos(html).replace(/&#39;/g, '\'');
    for (const x of [
      'Your Claude Code settings in the director', 'Worth keeping', 'Not needed', 'Makes no difference', 'Never, by the Studio\'s rule', 'What it is:', 'In the director:', 'Without it:', 'Where I know it from ↗',
      'New: confirm it', 'Save my selection', 'Load them all again', 'Today the director starts without your settings, without your skills or your commands, and keeps the 2 checked keys.',
      '2 keys appeared in your file after you saved your selection.', 'These are the ones in your Claude Code user settings file',
    ]) expect(texto, x).toContain(x);
    expect(texto).not.toMatch(ESPANOL_MODELO);
    const una = conAtributos(seccionAjustesPropios({ cargar: false, claves: ['si'], opciones: opciones.slice(0, 2), conservados: ['si'], nuevas: ['no'] }));
    expect(una).toContain('and keeps the checked key.');
    expect(una).toContain('A key appeared in your file');
    expect(una).toContain('uses what I recommend for it,');
    expect(conAtributos(seccionAjustesPropios({ cargar: false, claves: [], opciones: [], conservados: [] }))).toContain('and keeps no key.');
    const carga = conAtributos(seccionAjustesPropios({ cargar: true, claves: ['si'], opciones: opciones.slice(0, 1) }));
    expect(carga).toContain('Today the director loads all your settings, with your skills and your commands.');
    expect(carga).not.toContain('Load them all again');
    expect(conAtributos(seccionAjustesPropios({ cargar: true, claves: null }))).toContain('is not valid JSON');
    expect(conAtributos(seccionAjustesPropios({ cargar: true, claves: [] }))).toContain('You have no Claude Code user settings on this computer');
    // Las casillas y los botones no cambian con el idioma
    const ids = (x: string) => [...x.matchAll(/data-[\w-]+(?:="[^"]*")?/g)].map((m) => m[0]);
    const enIds = ids(html);
    ponerIdioma('es');
    const esHtml = seccionAjustesPropios({ cargar: false, claves: ['si', 'no', 'igual', 'nunca'], opciones, conservados: ['si', 'no'], nuevas: ['igual', 'nunca'] });
    expect(enIds).toEqual(ids(esHtml));
    expect(forma(html)).toEqual(forma(esHtml));
    expect(esHtml).toContain('Conviene conservarla');
  });

  it('la medición del núcleo: la última, lo que gastaría y lo que se detiene', () => {
    ponerIdioma('en');
    const porCaso: NonNullable<EstadoMedicion['ultima']>['porCaso'] = [
      { id: 'a', titulo: 'XX', veredicto: 'falla', vueltas: 2, porque: ['XX'], califica: { pasa: false, porque: ['XX'] }, antes: 'pasa' },
      { id: 'b', titulo: 'XX', veredicto: 'pasa', vueltas: 1, porque: [], califica: { pasa: true, porque: ['XX'] }, antes: 'falla' },
      { id: 'c', titulo: 'XX', veredicto: 'pendiente', vueltas: 0, porque: [], califica: null, antes: null },
    ];
    const ultima = (x: Partial<NonNullable<EstadoMedicion['ultima']>> = {}): NonNullable<EstadoMedicion['ultima']> => ({
      cuando: '2026-10-28T15:01:00.000Z', modelo: 'XX', esfuerzo: 'XX', terminada: null, vueltas: 20, alcance: 'pasaban', pasan: 8, fallan: 2, pendientes: 4, tokens: 1_234_567, porCaso, ...x,
    });
    const datos = (medicion: EstadoMedicion | null, directorPendiente = false) => ({ medicion, directorPendiente, plegable: () => '' });
    const base: EstadoMedicion = { enMarcha: null, ultima: ultima(), casos: 13, estimado: { total: 1_400_000, porVuelta: 70_000, de: 'corrida' }, fallan: [{ id: 'a', titulo: 'XX' }] };
    const html = seccionMedicion(datos(base));
    const texto = conAtributos(html);
    for (const x of [
      'The core measurement', 'Measures the director against the mistakes that must not be repeated', 'The last one, stopped before finishing', ', with XX, effort XX.', 'Measured the 3 cases that passed, what the last change could have broken',
      '8 of 3 cases pass', ', 2 fail', '(one passed before and broke)', '1.2M tokens', 'Each case', 'Passes', 'Fails', 'Not finished', '2 rounds', '1 round', 'broke', 'got fixed',
      'Grader: fails, because XX', 'Grader: passes, because XX', 'Measure the core', 'What already passes is not measured again', 'which of the one that fails to measure',
      'It uses your plan, like a review', 'What fails reaches you as a mission in the next review',
    ]) expect(texto, x).toContain(x);
    expect(texto).not.toMatch(ESPANOL_MODELO);
    expect(conAtributos(seccionMedicion(datos({ ...base, fallan: [] })))).toContain('which of the 0 that fail to measure (none right now)');
    expect(conAtributos(seccionMedicion(datos({ ...base, fallan: [{ id: 'a', titulo: 'XX' }, { id: 'b', titulo: 'XX' }] })))).toContain('which of the 2 that fail to measure');
    const sin = conAtributos(seccionMedicion(datos({ ...base, ultima: null })));
    expect(sin).toContain('Not measured on this computer yet.');
    expect(sin).toContain('A run measures 13 cases, two rounds each: about 1.4M tokens (70K per round, what each one used in the last run). If a case comes out different in its two rounds, a third one: about 70K tokens more, at most.');
    expect(conAtributos(seccionMedicion(datos({ ...base, ultima: null, estimado: null })))).toContain('what it uses is known after the director\'s first review on this computer.');
    expect(conAtributos(seccionMedicion(datos({ ...base, ultima: ultima({ alcance: 'fallaban' }) })))).toContain('Measured the 3 cases that failed');
    expect(conAtributos(seccionMedicion(datos({ ...base, casos: 20, ultima: ultima({ alcance: null, terminada: 'v1' }) })))).toContain('The last one: ');
    expect(conAtributos(seccionMedicion(datos({ ...base, casos: 20, ultima: ultima({ alcance: null, terminada: 'v1' }) })))).toContain('Measured 3 of the 20 cases');
    // Midiendo ahora, y lo que gastaría otra de cada forma
    const enMarcha = seccionMedicion(datos({ ...base, enMarcha: { quien: 'XX', desde: '2026-10-29T18:00:00.000Z', vueltas: 3 } }));
    expect(conAtributos(enMarcha)).toContain('Measuring: 3 rounds done, since');
    expect(conAtributos(enMarcha)).toContain('(asked for by XX). No director is launched meanwhile.');
    expect(conAtributos(enMarcha)).toContain('Stop');
    expect(conAtributos(enMarcha)).toContain('It finishes the round that is running and starts no other: what was done is saved.');
    expect(conAtributos(seccionMedicion(datos(base, true)))).toContain('There is a review requested or a director working: the measurement is requested when it finishes.');
    expect(sinMarcas(cuantoGasta({ total: 1_400_000, porVuelta: 70_000, de: 'revisiones', desde: 20_000 }))).toBe('between about 20K and 1.4M tokens (each round is a review of a small test project: it uses more than a short director assignment and less than a real review; after the first one, the exact figure is known)');
    expect(sinMarcas(cuantoGasta({ total: 1_400_000, porVuelta: 70_000, de: 'revisiones' }))).toContain('at most (70K per round, what a director review uses; a test one uses less)');
    const aviso = avisoMidiendo('XX.');
    expect(sinMarcas(aviso)).toContain('The core is being measured');
    expect(aviso).toContain('title="XX. One click takes you to the measurement in progress."');
    expect(aviso).toContain('data-ver-medicion');
    // Las acciones no cambian con el idioma
    const ids = (x: string) => [...x.matchAll(/data-[\w-]+(?:="[^"]*")?/g)].map((m) => m[0]);
    const enPendiente = seccionMedicion(datos(base, true));
    ponerIdioma('es');
    const esPendiente = seccionMedicion(datos(base, true));
    expect(ids(enPendiente)).toEqual(ids(esPendiente));
    expect(forma(enPendiente)).toEqual(forma(esPendiente));
    expect(avisoMidiendo('XX.')).toContain('Se está midiendo el núcleo');
  });

  it('el código no deja frases escritas a mano, y los nombres del catálogo de otros módulos quedan como están', () => {
    for (const f of ['vistaGasto.ts', 'vistaPermisos.ts', 'vistaAjustesPropios.ts', 'vistaMedicion.ts', 'modelView.ts']) {
      const fuente = readFileSync(new URL(`./${f}`, import.meta.url), 'utf8').replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      for (const frase of ['Lo que gastó el director', 'Los límites de tu plan', 'Cómo pide permisos', 'Autorizo los marcados', 'Guardar mi selección', 'La medición del núcleo', 'Medir el núcleo', 'Todavía no hay lanzamientos', 'Conviene conservarla', 'Con qué modelo trabaja', '>Quitar<', 'Cada lanzamiento', 'Detener</button>'])
        expect(fuente, `${f}: ${frase}`).not.toContain(frase);
      expect(fuente, f).not.toMatch(/toLocaleString\('es'/);
    }
  });
});

describe('las pestañas «El director» y «Bitácora» en inglés (pd_idiomas)', () => {
  const ESPANOL_MODELO = /\b(modelo|esfuerzo|cuenta|lanzamiento|elegiste|gasta|permiso|director que|bit[aá]cora|filtrar|acciones?|todav[ií]a)\b/i;
  const sinMarcas = (x: string) => x.replace(/<code>[^<]*<\/code>/g, ' ').replace(/<[^>]*>/g, ' ');
  const director =(x: Partial<DatosDirector> = {}): DatosDirector => ({ modelo: 'claude-opus-5-5', esfuerzo: 'high', esfuerzoGuardado: null, ultracode: false, ultracodeDirector: false, todoConElModelo: false, consumo: [], ahora: new Date('2026-10-30T10:00:00Z'), ...x });

  it('«The director», con sus modelos, sus esfuerzos y sus avisos; lo que cambia con el idioma, al momento', () => {
    ponerIdioma('en');
    const html = seccionDirector(director());
    expect(sinMarcas(html)).toContain('The director');
    expect(sinMarcas(html)).toContain('Everything with the model I chose');
    expect(html).toContain('optgroup label="By version"');
    expect(html).toContain('>High<');
    expect(sinMarcas(html.replace(/<option[^>]*>[^<]*<\/option>/g, ''))).not.toMatch(ESPANOL_MODELO);
    // Lo que elige sigue siendo lo mismo: sus ids y sus atributos no cambian con el idioma
    const marcas = (x: string) => [...x.matchAll(/data-[a-z-]+(?:="[^"]*")?|value="[^"]*"/g)].map((m) => m[0]);
    const enIngles = marcas(html);
    ponerIdioma('es');
    expect(marcas(seccionDirector(director()))).toEqual(enIngles);
    expect(seccionDirector(director())).toContain('optgroup label="Por versión"');
    expect(nombreEsfuerzo('max')).toBe('máximo');
    ponerIdioma('en');
    expect(nombreEsfuerzo('max')).toBe('maximum');
    expect(nombreModelo('claude-opus-5-5[1m]')).toBe('Opus 5.5, 1M context');
  });

  it('«Log», con sus filas y su filtro; lo que hizo cada quien queda como está', () => {
    ponerIdioma('en');
    const datos = (x: Partial<DatosBitacora> = {}): DatosBitacora => ({ bitacora: { eventos: [{ cuando: '2026-10-30T10:00:00Z', quien: 'XX', que: 'XX', desde: 'XX' }], maximo: 0, cuando: 0 } as DatosBitacora['bitacora'], error: '', filtro: '', nombre: () => 'XX', ...x });
    const html = panelBitacora(datos(), '');
    expect(sinMarcas(html)).toContain("This computer's log");
    expect(sinMarcas(html)).toContain('1 action, from newest to oldest.');
    expect(sinMarcas(html)).not.toMatch(ESPANOL_MODELO);
    expect(filasBitacora(datos({ filtro: 'zzz' }))).toContain('None of the 1 action says “zzz”.');
    ponerIdioma('es');
    expect(filasBitacora(datos())).toContain('1 acción, de la más nueva a la más vieja.');
  });
});

describe('«Hoy» en inglés: nada en español de lo suyo (pd_idiomas)', () => {
  const mision = (x: Partial<Mision> = {}): Mision => ({ id: 't_a', para: TITULAR, fase: 'arranque', frente: 'direccion', titulo: 'XX', porQue: 'XX', pasos: ['XX'], entrega: 'XX', xp: 10, ...x });
  const planDe = (misiones: Mision[]): Plan => ({ ...(planPlantilla as unknown as Plan), misiones, colaDirector: [], propuestas: [], pedidos: [] });

  it('la tarjeta de una misión, en cada estado', () => {
    ponerIdioma('en');
    const datos = (m: Mision, estado = estadoVacio()): DatosTarjeta => ({
      plan: planDe([m]), estado, rol: TITULAR, nombre: 'Ana', transcripciones: {}, entregandoSola: new Set(),
      pasosHechos: () => [], pasoAbierto: () => false, listaPasos: () => '', misionPasada: () => '', audioYTexto: () => '', opcionesMision: () => '',
      botonIr: () => '', tituloDoc: () => 'XX', plegable: () => '',
    });
    const ahora = tarjetaMision(datos(mision()), mision(), false, 1);
    expect(ahora).toContain('Your mission now');
    expect(ahora).toContain('Hand-in:');
    expect(ahora).toContain('Comment to the director');
    expect(ahora.replace(/<[^>]*>/g, ' ')).not.toMatch(ESPANOL);
    const estado = { ...estadoVacio(), entregas: { t_a: { cuando: '2026-10-30T10:00:00Z', quien: 'Ana' } } };
    const entregada = tarjetaMision(datos(mision(), estado as EstadoDirector), mision());
    expect(entregada).toContain('Handed in by Ana');
    expect(entregada.replace(/<[^>]*>/g, ' ')).not.toMatch(ESPANOL);
  });

  it('los estados, la ficha, el paso sin misión y el arranque', () => {
    ponerIdioma('en');
    expect(Object.values(NOMBRE_ESTADO_MISION)).toEqual(['In the fog', 'To do', 'To do', 'Waiting for the director', 'Approved', 'Needs rework']);
    const plan = planDe([]);
    const ctx: Contexto = { plan, estado: estadoVacio(), senales: { repositorio: null, esfuerzo: null } as unknown as Contexto['senales'] };
    const ficha = fichaPersona({ persona: TITULAR, nombre: 'Ana', esYo: true, ctx, equipo: [], arranque: 'en_marcha' }).replace(/<[^>]*>/g, ' ');
    expect(ficha).toContain('Level 1');
    expect(ficha).toContain('First mission');
    expect(ficha).toContain('Your voice counts');
    expect(ficha).not.toMatch(ESPANOL);
    const sinMision = pasoSinMision(ctx, TITULAR, 'en_marcha', 'libre', 2, 1)!;
    expect(sinMision.texto).toBe('Your next step: request the review. You handed in the 2 missions you had: the director checks them and leaves you your next missions. Only you request it, whenever you want.');
    const arranque = arranqueHTML({ arranque: 'conectar', nuevo: false, conectado: false, diagnosticado: false, conMeta: false, conRuta: false, botonIr: () => '' }).replace(/<[^>]*>/g, ' ');
    expect(arranque).toContain('Hand over the repository');
    expect(arranque).not.toMatch(ESPANOL);
  });

  it('«Up next», con la cola del director', () => {
    ponerIdioma('en');
    const html = colaDe({ plan: planDe([mision({ id: 't_b' })]), estado: estadoVacio(), persona: TITULAR, conColaDelDirector: false, plegable: () => '' }).replace(/<[^>]*>/g, ' ');
    expect(html).toContain('Up next · 1 more mission');
    expect(html).not.toContain('Reserve:');
    expect(html).not.toMatch(ESPANOL);
    const cola = colaDelDirectorHtml([{ id: 'x', tipo: 'pedido', titulo: 'XX' } as TareaDelDirector]).replace(/<[^>]*>/g, ' ');
    expect(cola).toContain('What the director is doing');
    expect(cola).toContain('Request');
  });

  it('los pasos: el código de la tarjeta no deja frases escritas a mano', () => {
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8');
    const inicio = app.indexOf('function listaPasos(');
    const fin = app.indexOf('function datosTarjeta(');
    for (const frase of ['Listo, ya lo hice</label>', '>Hazlo tú<', 'Lo respondiste con tu comentario', 'No lo entiendo, explícamelo mejor\'', '>Copiar<', 'No me salió<']) expect(app.slice(inicio, fin), frase).not.toContain(frase);
    // Y en inglés, los nombres que eligió el titular
    ponerIdioma('en');
    expect(t('paso.aclarar')).toBe('Explain it better');
    expect(t('paso.hazlo')).toBe('Do it for me');
    expect(t('paso.comprobar')).toBe('Done, check it');
    expect(t('mision.entregar')).toBe('Hand in');
    expect(t('cabeza.pedirRevision')).toBe('Request review');
    expect(t('cabeza.dondeQuedamos')).toBe('Where we left off');
    expect(t('felicitacion.0')).toBe("Mission done. That's the way: one at a time.");
  });
});

describe('«Fronts», «Method» y los controles del modo enfoque en inglés (pd_idiomas)', () => {
  // Lo que delata el español en estas vistas, fuera de lo que escribió cada persona o el plan (va con la marca XX)
  const ESPANOL_APOYO = /\b(los|las|del|una|con|para|que|qué|lo|fase|fases|persona|personas|frentes?|excepci[oó]n|excepciones|ninguna|cerrar|registrar|registr[oó]|borrar|fecha|tipo|contexto|ritmo|lecciones|titular|meta|ruta|puertas|misi[oó]n|bolet[ií]n|hasta|venci[oó]|cerrada|seg[uú]n|este|esta|proyecto|ejemplo|cada|equipo)\b/i;
  const conAtributos = (x: string) => x.replace(/<[^>]*\b(?:title|aria-label|placeholder)="([^"]*)"[^>]*>/g, ' $1 ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  const forma = (x: string) => (x.match(/<[^>]*>/g) ?? []).map((m) => m.replace(/\s(?:title|aria-label|placeholder)="[^"]*"/g, ''));
  const fases = [
    { id: 'a', nombre: 'XX', frentes: { web: { nivel: 'foco', que: 'XX' } } },
    { id: 'b', nombre: 'XX', frentes: { web: { nivel: 'apoyo', que: 'XX' } } },
  ];
  const plan = {
    fases, frentes: [{ id: 'web', nombre: 'XX', rutas: ['XX/'] }], ritmo: ['XX'],
    lecciones: [{ titulo: 'XX', quien: 'XX', que: 'XX', fuente: 'https://x.y', paraElProyecto: 'XX' }],
  } as unknown as Plan;
  const estado = (x: Record<string, unknown> = {}) => ({ excepciones: [], cierres: {}, bitacora: [], ...x }) as unknown as EstadoDirector;

  it('«Method»: cómo funciona el director, el ritmo y las lecciones, con el nombre del titular tal cual', () => {
    const vista = () => vistaMetodo({ plan, nombreTitular: 'XX', botonMetodo: '<button>XX</button>' });
    ponerIdioma('en');
    const html = vista();
    const texto = conAtributos(html);
    for (const x of ['How the team works with the director', 'How the director works', 'The start:', 'in Today', 'marked with “Done”', 'in the Inbox or in “Comment”', '“Request review”', 'XX decides:', 'The rhythm', 'Lessons from the best', 'For this project:']) expect(texto, x).toContain(x);
    expect(texto).not.toMatch(ESPANOL_APOYO);
    ponerIdioma('es');
    expect(forma(html)).toEqual(forma(vista()));
    expect(vista()).toContain('Cómo funciona el director');
    expect(vista()).toContain('<b>XX decide:</b>');
  });

  it('«Fronts»: la matriz, la celda elegida y las excepciones, en inglés y con las mismas marcas', () => {
    const excepciones = [
      { id: 'x1', frente: 'web', motivo: 'XX', quien: 'XX', fecha: '2026-10-20', hasta: '2026-11-01' },
      { id: 'x2', frente: 'web', motivo: 'XX', quien: 'XX', fecha: '2026-10-01', hasta: '2026-10-05' },
      { id: 'x3', frente: 'web', motivo: 'XX', quien: 'XX', fecha: '2026-10-02', hasta: '2026-10-30', cerrada: { quien: 'YY' } },
    ];
    const vista = (conExcepciones = true) => vistaFrentes({ plan, estado: estado({ excepciones: conExcepciones ? excepciones : [] }), hoy: '2026-10-29', celda: { frente: 'web', fase: 'a' }, puedoTrabajar: '<p>XX</p>' });
    ponerIdioma('en');
    const html = vista();
    const texto = conAtributos(html);
    for (const x of ['What each front does in each phase', 'In focus', 'Supporting', 'On hold', 'XX in XX', 'Open exceptions', 'work out of order, with its reason', '(XX, until Nov 1)', 'Close', 'Record an exception', 'Earlier exceptions', '(XX, Oct 1; expired)', '(XX, Oct 2; closed by YY)']) expect(texto, x).toContain(x);
    expect(texto).not.toMatch(ESPANOL_APOYO);
    const ninguna = conAtributos(vista(false));
    expect(ninguna).toContain('None. All the work is in order.');
    expect(ninguna).not.toMatch(ESPANOL_APOYO);
    ponerIdioma('es');
    expect(forma(html)).toEqual(forma(vista()));
    expect(vista()).toContain('Excepciones abiertas');
    expect(vista()).toContain('cerrada por YY');
    expect(vista(false)).toContain('Ninguna. Todo el trabajo va en orden.');
  });

  it('los controles del modo enfoque: el nombre de cada grupo, en el idioma de ahora', () => {
    const piezas = { tema: 'T', niebla: 'F', narracion: 'N', sonido: 'S' };
    ponerIdioma('en');
    const html = controlesEnfoque(piezas);
    expect(GRUPOS_ENFOQUE.map((g) => g.nombre)).toEqual(['Theme', 'Reading fog', 'Read-aloud narration', 'Sound']);
    expect(conAtributos(html)).not.toMatch(ESPANOL_APOYO);
    ponerIdioma('es');
    expect(forma(html)).toEqual(forma(controlesEnfoque(piezas)));
    expect(controlesEnfoque(piezas)).toContain('aria-label="Narración en voz alta"');
  });
});

describe('«Project», «All projects» y «Where we left off» en inglés (pd_idiomas; nombres elegidos en nmvy2w2lttit)', () => {
  // Lo que delata el español en estas vistas, fuera de lo que escribió cada persona o el director (va con la marca XX)
  const ESPANOL_PROYECTO = /\b(proyectos?|meta|metas|equipo|titular|carpeta|repositorio|rama|historial|guardar|quitar|sumar|nombre|correo|cargo|papel|horizonte|fijar|fijada|activar|activo|nuevo|existente|esperando|misiones|revisi[oó]n|entregar|varios|computadores|dónde|qué)\b/i;
  const conAtributos = (x: string) => x.replace(/<[^>]*\b(?:title|aria-label|placeholder)="([^"]*)"[^>]*>/g, ' $1 ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  const proyecto = (x: Partial<Proyecto> = {}) => ({
    nombre: 'XX', contexto: 'XX', metaInicial: 'XX', repositorio: { url: 'https://x.y', rama: 'XX' }, equipo: [{ id: 'ana', nombre: 'XX', correo: 'x@y.z', cargo: 'XX' }],
    objetivosAnteriores: [{ texto: 'XX', exito: 'XX', firmado: { fecha: '2026-10-20', quien: 'XX' }, reabierto: { fecha: '2026-10-21', quien: 'XX', nota: 'XX' } }], ...x,
  }) as unknown as Proyecto;
  const datos = (x: Partial<DatosProyecto> = {}): DatosProyecto => ({
    proyecto: proyecto(), repositorio: { ruta: 'XX', info: { ruta: 'XX', rama: 'XX', commits: 1234, archivos: 56, sinCommit: 2, ultimo: { fecha: '2026-10-20', autor: 'XX', asunto: 'XX' }, remoto: null } as unknown as DatosProyecto['repositorio']['info'], error: null },
    plan: { objetivos: [{ id: 'o1', texto: 'XX', exito: 'XX', porQue: 'XX', riesgo: 'XX', horizonte: 'XX' }], boletin: [], diagnostico: { fecha: '2026-10-20' }, detectado: undefined } as unknown as DatosProyecto['plan'],
    titular: true, nuevo: false, borrador: null, nombreTitular: 'XX', correo: 'x@y.z', subida: 'XX', diagnostico: '', plegable: () => '', ...x,
  });

  it('«Project»: sin meta, con meta y sin ser el titular, todo en inglés y con las mismas marcas', () => {
    ponerIdioma('en');
    const html = vistaProyecto(datos());
    const texto = conAtributos(html);
    for (const x of ['Where it is', 'Repository details', '1,234 commits · 56 files in git', 'Your goal', 'Earlier goals', 'The team', 'Several computers', 'Choose one of those the director proposes', 'Use this one', 'Set this goal', 'Add to the team', 'Save', 'What the project is and what you are after', 'Existing project', 'none (local only)']) expect(texto, x).toContain(x);
    expect(texto.replace(/\.stl|stl/g, '')).not.toMatch(ESPANOL_PROYECTO);
    const fijada = conAtributos(vistaProyecto(datos({ proyecto: proyecto({ objetivo: { texto: 'XX', exito: 'XX', horizonte: 'XX', firmado: { fecha: '2026-10-20', quien: 'XX' } } } as unknown as Partial<Proyecto>), titular: false, nuevo: true })));
    for (const x of ['Goal set', 'How we will know it was met:', 'Comment to the director', 'New project', 'The owner writes it.', 'When is it considered complete?']) expect(fijada, x).toContain(x);
    expect(fijada).not.toMatch(ESPANOL_PROYECTO);
    expect(vistaProyecto(datos({ proyecto: proyecto({ nombre: 'Mi proyecto' }) }))).toContain('Mi proyecto');
    const forma = (x: string) => (x.match(/<[^>]*>/g) ?? []).map((m) => m.replace(/\s(?:title|aria-label|placeholder)="[^"]*"/g, ''));
    ponerIdioma('es');
    expect(forma(html)).toEqual(forma(vistaProyecto(datos())));
    expect(vistaProyecto(datos())).toContain('Dónde está');
  });

  it('«All projects»: con los nombres que elegiste, y sin español de lo suyo', () => {
    ponerIdioma('en');
    const lista = (o: string | null) => ({ id: 'a', nombre: 'XX', tipo: 'existente', objetivo: o, etapa: 'en_marcha', fase: 'XX', porRevisar: 2, misionesAbiertas: 3, revisado: '2026-10-20T10:00:00Z', alerta: 'XX' });
    const html = vistaProyectos({ proyectos: [lista('XX'), { ...lista(null), id: 'b', tipo: 'nuevo', revisado: '' }] as unknown as DatosProyectos['proyectos'], activo: 'a', nombreEtapa: () => 'XX', irAMisiones: '' });
    const texto = conAtributos(html);
    for (const x of ['All the projects in this Studio', 'Active', 'Existing', 'New', 'phase “XX”', 'Goal:', 'No goal set yet.', 'waiting for the director', 'open missions', 'Last review:', 'No reviews yet', 'Activate', 'Hand over projects']) expect(texto, x).toContain(x);
    expect(texto).not.toMatch(ESPANOL_PROYECTO);
  });

  it('«Where we left off»: sus pestañas, y lo que queda en app.ts ya no se escribe en español', () => {
    ponerIdioma('en');
    expect(ORDEN_PESTANAS_DQ.map((p) => NOMBRE_PESTANA_DQ[p])).toEqual(['Questions', 'Adjustments', 'Failures', 'Ideas', 'Other notes', 'The roadmap']);
    expect(t('dq.misionesAprobadas', { n: 1 })).toBe('1 mission approved');
    expect(t('dq.respuestasNuevas', { n: 2 })).toBe('2 new answers from the director in the Inbox');
    expect(t('dq.mostrarDe', { n: 20, quedan: 30 })).toBe('Show more (20 of 30)');
    ponerIdioma('es');
    expect(NOMBRE_PESTANA_DQ.ruta).toBe('La ruta');
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8');
    for (const x of ['¡Al día! Ya leíste', 'Ya leído <span', 'Lo que avanzamos', 'Todavía no hay un resumen del director', 'Toca cada línea cuando la leas', 'Frente por frente:']) expect(app.includes(x), x).toBe(false);
  });
});

describe('«Questions» y «Proposals» en inglés: nada en español de lo suyo (pd_idiomas)', () => {
  // Lo que delata el español en las dos vistas, fuera de lo que escribió cada persona o el director (va con la marca XX)
  const ESPANOL_PYP = /\b(pregunta|preguntas|esperando|espera|esperan|respuestas?|conversaci[oó]n|conversaciones|seguiste|seguir|copiar|corregir|quitar|propuestas?|decidir|decididas?|aceptar|aceptada|descartar|descartada|problema|conecta|nada|todas|ninguna|ya|fase|buz[oó]n|estudio)\b/i;
  const conAtributos = (x: string) => x.replace(/<[^>]*\b(?:title|aria-label)="([^"]*)"[^>]*>/g, ' $1 ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  const nota = (id: string, x: Partial<Nota> = {}) => ({ id, cuando: '2026-10-20T10:00:00Z', quien: 'XX', de: 'ana', sobre: { tipo: 'pregunta' }, texto: 'XX', ...x }) as Nota;
  const respuestas = { n2: { cuando: '2026-10-18T12:00:00Z', texto: 'XX', tratamiento: 'decision', destino: { vista: 'ruta' } } } as unknown as DatosPreguntas['respuestas'];
  const preguntas = (x: Partial<DatosPreguntas> = {}): DatosPreguntas => ({
    notas: [nota('n1'), nota('n2', { cuando: '2026-10-18T10:00:00Z' }), nota('n3', { cuando: '2026-10-19T10:00:00Z', de: 'beto', sobre: { tipo: 'pregunta', id: 'n2' } })],
    respuestas, transcripciones: {}, yo: 'ana', esTitular: false, hilosAbiertos: new Set(),
    filtroVisible: () => '', audioYTexto: () => '', adjuntosDeNota: () => '', botonEscribirLoDicho: () => '', corregible: () => true,
    quedoEn: () => '', respuestaHtml: (texto) => `<p>${texto}</p>`, ...x,
  });
  const propuesta = (id: string, fase: string) => ({ id, fase, area: 'XX', titulo: 'XX', problema: 'XX', propuesta: 'XX', conecta: 'XX' });
  const plan = { fases: [{ id: 'a', nombre: 'XX' }, { id: 'b', nombre: 'XX' }], propuestas: [propuesta('p1', 'a'), propuesta('p2', 'a'), propuesta('p3', 'b'), propuesta('p4', 'b')] } as unknown as Plan;
  const estado = { propuestas: { p2: { estado: 'aceptada', quien: 'XX', fecha: '2026-10-20', nota: 'XX' } }, notas: [] } as unknown as EstadoDirector;
  const propuestas = (x: Partial<DatosPropuestas> = {}): DatosPropuestas => ({
    plan, estado, faseAbierta: (id) => id === 'a', propuestaPasada: (id) => id === 'p2', verPasadas: false, nombreTitular: 'XX', esTitular: true, tarjetaNota: () => '', ...x,
  });

  it('«Questions»: lo que espera, la conversación con su respuesta y lo que sigue', () => {
    ponerIdioma('en');
    const html = vistaPreguntas(preguntas());
    const texto = conAtributos(html);
    for (const x of [
      'Your questions to the director', 'Ask a question', 'Waiting for an answer', 'Conversations with the director', 'Correct', 'Remove', '2 questions', 'one is waiting for an answer',
      'Follow-up', 'This answer asks for your decision', "Waiting for the director's answer, in the next review.", 'Continue the conversation', 'Copy', 'Copies the conversation as Markdown',
    ]) expect(texto, x).toContain(x);
    expect(texto).not.toMatch(ESPANOL_PYP);
    const vacio = conAtributos(vistaPreguntas(preguntas({ notas: [] })));
    expect(vacio).toContain('None waiting: when a doubt occurs to you');
    expect(vacio).toContain('There are no answers yet.');
    expect(vacio).not.toMatch(ESPANOL_PYP);
    expect(conAtributos(vistaPreguntas(preguntas({ notas: [nota('n4', { texto: undefined, audio: 'a.webm' }), nota('n5', { cuando: '2026-10-20T11:00:00Z', texto: undefined, audio: 'b.webm' })], respuestas: { n4: respuestas.n2 } })))).toContain('Recorded question');
    // Lo que dijo cada persona queda como está, y las marcas no cambian con el idioma
    expect(vistaPreguntas(preguntas({ notas: [nota('n1', { texto: 'Lo que dije en español' })] }))).toContain('Lo que dije en español');
    const forma = (x: string) => (x.match(/<[^>]*>/g) ?? []).map((m) => m.replace(/\s(?:title|aria-label)="[^"]*"/g, ''));
    ponerIdioma('es');
    expect(forma(html)).toEqual(forma(vistaPreguntas(preguntas())));
    expect(vistaPreguntas(preguntas())).toContain('Seguiste');
  });

  it('«Proposals»: la barra, el filtro, cada propuesta con su firma y el estado vacío', () => {
    ponerIdioma('en');
    const html = vistaPropuestas(propuestas());
    const texto = conAtributos(html);
    for (const x of [
      'The director proposes and XX decides.', '1 is waiting for an answer', '1 already decided', 'Which proposals to see', 'To decide', 'All', 'To decide in “XX”', 'The problem', 'The proposal', 'What it connects',
      'Accept', 'Discard', '✉ Comment to the director', '2 more proposals are waiting for their phase.',
    ]) expect(texto, x).toContain(x);
    expect(texto).not.toMatch(ESPANOL_PYP);
    const todas = conAtributos(vistaPropuestas(propuestas({ verPasadas: true })));
    expect(todas).toContain('Accepted by XX on Oct 20: XX');
    expect(todas).not.toMatch(ESPANOL_PYP);
    const alDia = conAtributos(vistaPropuestas(propuestas({ propuestaPasada: () => true })));
    expect(alDia).toContain('You are up to date: none is waiting for an answer');
    expect(alDia).toContain('You already decided the 2 proposals of this phase.');
    expect(alDia).toContain('See the decided ones');
    expect(alDia).not.toMatch(ESPANOL_PYP);
    const una = { ...plan, propuestas: [propuesta('p2', 'a'), propuesta('p3', 'b')] } as Plan;
    const unaSola = conAtributos(vistaPropuestas(propuestas({ plan: una })));
    expect(unaSola).toContain('Nothing is waiting for an answer · 1 already decided');
    expect(unaSola).toContain('You already decided the proposal of this phase.');
    expect(unaSola).toContain('1 more proposal is waiting for its phase.');
    const sinFase = conAtributos(vistaPropuestas(propuestas({ faseAbierta: () => false })));
    expect(sinFase).toContain('There are no proposals in the current phase yet');
    expect(sinFase).not.toMatch(ESPANOL_PYP);
    // Solo el titular acepta o descarta; las marcas no cambian con el idioma
    const forma = (x: string) => (x.match(/<[^>]*>/g) ?? []).map((m) => m.replace(/\s(?:title|aria-label)="[^"]*"/g, ''));
    ponerIdioma('es');
    expect(forma(html)).toEqual(forma(vistaPropuestas(propuestas())));
    expect(vistaPropuestas(propuestas())).toContain('Para decidir en «XX»');
  });

  it('el diálogo y los avisos de la página: el código no deja frases escritas a mano', () => {
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8');
    const parte = (desde: string, hasta: string) => app.slice(app.indexOf(desde), app.indexOf(hasta));
    const deLaPagina = [parte('function hiloEnTexto(', '/** Los hilos que tiene abiertos'), parte('} else if (ds.copiarHilo) {', '} else if (ds.fase) {'), parte('} else if (ds.responder) {', '} else if (ds.usarCandidato) {'), parte('const avisoRevisando', 'function libreMientrasRevisa')].join('\n');
    for (const frase of ['Pregunta grabada', 'esperando respuesta', 'Conversación copiada', 'Seguir la conversación', 'Pregunta algo más', 'Lo que quieres agregar', 'Agregar a la conversación', 'Agregado a la conversación', '¿Descartar', 'Queda marcada como descartada', 'Por qué (opcional', 'Sí, descartarla', 'El director está revisando'])
      expect(deLaPagina, frase).not.toContain(frase);
    ponerIdioma('en');
    expect(t('preguntas.seguir')).toBe('Continue the conversation');
    expect(t('preguntas.seguirBoton')).toBe('Add to the conversation');
    expect(t('propuestas.descartarTitulo', { titulo: 'XX' })).toBe('Discard “XX”?');
    expect(t('propuestas.descartarSi')).toBe('Yes, discard it');
    expect(t('aviso.revisando')).toContain('The director is reviewing.');
    ponerIdioma('es');
    expect(t('propuestas.descartarTitulo', { titulo: 'XX' })).toBe('¿Descartar «XX»?');
  });
});

describe('lo que queda de la interfaz en inglés: el menú de proyectos, la bienvenida, los avisos y los diálogos (pd_idiomas)', () => {
  const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8');
  /** El código de la página, sin sus comentarios: lo que dice una frase en un comentario no cuenta. */
  const codigo = app.split('\n').filter((l) => !/^\s*(\/\/|\/?\*)/.test(l)).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n');

  it('el menú de proyectos y su «Entregar proyectos», en los dos idiomas', () => {
    expect(t('proyectos.entregar')).toBe('Entregar proyectos');
    expect(t('proyectos.verTodos')).toBe('Ver todos');
    expect(t('proyectos.tusProyectos')).toBe('Tus proyectos');
    expect(t('proyectos.porRevisar', { n: 3 })).toBe('3 por revisar');
    ponerIdioma('en');
    expect(t('proyectos.entregar')).toBe('Hand over projects');
    expect(t('proyectos.verTodos')).toBe('View all');
    expect(t('proyectos.tusProyectos')).toBe('Your projects');
    expect(t('proyectos.unoActivo')).toBe('· one active at a time');
    expect(t('proyectos.cambiar')).toBe('Switch project');
    expect(t('proyectos.porRevisar', { n: 3 })).toBe('3 to review');
    expect(t('proyectos.configTitulo', { nombre: 'XX' })).toBe('Settings for XX: repository, context, goal and team');
    expect(t('proyectos.tieneAlerta')).toBe('Has an alert');
    expect(t('bienvenida.titulo')).toBe('Hand your first project over to the director');
    expect(t('bienvenida.entregarPrimero')).toBe('＋ Hand over the first project');
    expect(t('salud.opcional')).toBe('(optional)');
    expect(t('sync.alDia', { cuando: '3 min ago' })).toBe('↻ Up to date with GitHub · 3 min ago');
  });

  it('los avisos y los diálogos: una muestra en inglés, y el español de siempre en el otro idioma', () => {
    const muestra: [Parameters<typeof t>[0], Record<string, string | number>, string, string][] = [
      ['aviso.audioTraducido', {}, 'Tu audio fue traducido a texto.', 'Your audio was turned into text.'],
      ['aviso.docSeAbre', { titulo: 'XX' }, 'Ese documento se abre cuando termines de leer «XX»: una cosa a la vez.', 'That document opens when you finish reading «XX»: one thing at a time.'],
      ['aviso.reintentar', {}, 'Reintentar', 'Try again'],
      ['servidor.volvio', {}, 'El servidor del Studio volvió: todo al día.', 'The Studio server is back: everything is up to date.'],
      ['servidor.noHabla', {}, 'No se pudo hablar con el servidor del Studio.', 'Could not talk to the Studio server.'],
      ['recarga.cuenta', { motivo: 'XX', falta: 3 }, 'XX El Studio se actualiza en 3…', 'XX The Studio updates in 3…'],
      ['segundoPlano.transcribiendo', { n: 1 }, 'Transcribiendo tu audio', 'Transcribing your audio'],
      ['segundoPlano.transcribiendo', { n: 3 }, 'Transcribiendo 3 audios', 'Transcribing 3 audios'],
      ['progreso.negados', { n: 1 }, 'se le negó un permiso', 'one permission was denied'],
      ['progreso.negados', { n: 2 }, 'se le negaron 2 permisos', '2 permissions were denied'],
      ['progreso.suPlan', { hechos: 1, n: 1 }, 'Su plan: 1 de 1 encargo hecho', 'Its plan: 1 of 1 task done'],
      ['progreso.suPlan', { hechos: 2, n: 4 }, 'Su plan: 2 de 4 encargos hechos', 'Its plan: 2 of 4 tasks done'],
      ['falla.quePasoRevision', {}, 'Qué pasó con la revisión', 'What happened with the review'],
      ['falla.sinUltracode', {}, 'Pedirla sin ultracode', 'Request it without ultracode'],
      ['detener.titulo', {}, '¿Detener al director ahora?', 'Stop the director now?'],
      ['detener.boton', {}, 'Detener ahora', 'Stop now'],
      ['seguir.titulo', {}, 'Seguir con otra misión', 'Move on to another mission'],
      ['limite.titulo', {}, 'Tu límite de cada cinco horas está casi lleno', 'Your five-hour limit is almost full'],
      ['borradores.titulo', { n: 1 }, 'Tienes un borrador sin enviar', 'You have a draft that was not sent'],
      ['borradores.titulo', { n: 2 }, 'Tienes 2 borradores sin enviar', 'You have 2 drafts that were not sent'],
      ['cruzar.titulo', { nombre: 'XX' }, 'Cruzar «XX»', 'Cross «XX»'],
      ['replantear.titulo', {}, 'Replantear la meta', 'Rethink the goal'],
      ['excepcion.dias', { n: 7 }, '7 días', '7 days'],
      ['puedo.titulo', {}, '¿Quieres trabajar en otra cosa? Pregúntale al director', 'Want to work on something else? Ask the director'],
      ['leido.punta', {}, '¡Leído de punta a punta!', 'Read from start to finish!'],
      ['tema.aOscuro', {}, 'Pasar el Studio a oscuro', 'Switch the Studio to dark'],
      ['voz.comprobarBoton', {}, 'Comprobar de nuevo', 'Check again'],
    ];
    for (const [clave, valores, espanol] of muestra) expect(t(clave, valores), clave).toBe(espanol);
    ponerIdioma('en');
    for (const [clave, valores, , ingles] of muestra) expect(t(clave, valores), clave).toBe(ingles);
  });

  it('app.ts ya no trae esas frases escritas a mano: llama a tx(clave)', () => {
    for (const frase of [
      'Entregar proyectos', 'Ver todos', 'Tus proyectos', 'Cambiar de proyecto', 'por revisar', 'Tiene una alerta', 'Estudio local', 'Entrégale tu primer proyecto', 'Comprobando…', 'Este computador',
      'Configura tu identidad de git', 'El servidor del Studio no responde', 'Tu audio fue traducido', 'Studio apagado', 'El servidor del Studio volvió', 'Qué pasó con la revisión', 'Permisos que se le negaron',
      'Decirle algo y pedirla', 'Pedirla sin ultracode', 'Seguir con otra misión', '¿Detener al director ahora?', 'Tu límite de cada cinco horas', 'Revisión cancelada.', 'Reintentar',
      'No se pudo hablar con el servidor del Studio', 'Lo urgente va al director', 'Documento leído', '¿Ultracode también', 'Replantear la meta', 'Registrar una excepción', 'Tienes un borrador sin enviar',
      'Meta fijada', 'Anotado.', 'Conectado: ${', 'Orden copiada', 'Trayendo', 'Al día.', 'Hecho: lo comprobé', 'Lo hice: «', 'Sí, encárgaselo', 'Cruzar la puerta', 'Reabrir la fase', 'Tu decisión final',
      'Quitárselo', '¿Le quitas esta skill', 'Pasar el Studio a claro', 'Quitar la niebla de lectura', 'Ocultar la línea', 'Salir del modo enfoque (Esc)', 'Elige un frente', '¿Quieres trabajar en otra cosa?',
      '¡Leído de punta a punta!', 'Ya leíste todo este documento', 'El director está revisando. Mientras', 'Mientras tanto, el director',
    ]) expect(codigo, frase).not.toContain(frase);
    // Las constantes de frases son funciones que piden la clave al decirlas: así siguen el idioma de ahora
    expect(app).toContain("const SIN_SERVIDOR = () => tx('servidor.sinRespuesta', { carpeta: laCarpetaDelStudio() });");
    expect(app).toContain("const NEGADOS_VIVO = () => tx('negados.vivo');");
    expect(app).toContain("const PERMISO_ULTRACODE = () => tx('ultracode.permiso');");
    expect(app).toContain('duracionAprox(x.minutos, idiomaActual())');
  });

  it('cada clave que app.ts pide existe en los dos idiomas (si falta una, falla aquí y no en la pantalla)', () => {
    const pedidas = [...new Set([...app.matchAll(/\btx\(\s*'([\w.]+)'/g)].map((m) => m[1]))];
    expect(pedidas.length).toBeGreaterThan(300);
    for (const clave of pedidas) {
      expect(es, clave).toHaveProperty([clave]);
      expect(en, clave).toHaveProperty([clave]);
    }
  });

  it('lo que se guarda o se compara sigue en español: la sección de un paso, el texto del servidor y lo que se le deja al director', () => {
    // La revisión que falló: el servidor dice «La revisión…» (en español por ahora) y también se acepta en inglés
    expect(app).toContain("q?.startsWith('La revisión') || q?.startsWith('The review')");
    expect(app).toContain("seccion: 'La revisión que no terminó'");
    expect(app).toContain("const EN_AUDIO = 'Lo dije en audio: está en el Buzón.';");
    expect(app).toContain('seccion: seccionPaso(Number(i))');
    // Un comentario sobre un paso: «Paso 2» es la clave de la sección; la persona lee «step 2»
    expect(app).toContain('/^Paso \\d+$/.test(seccion)');
    ponerIdioma('en');
    expect(t('comentar.pasoDeMision', { n: 2, titulo: 'XX' })).toBe('Comment on step 2 of the mission «XX»');
  });

  it('el inglés no trae tildes ni signos del español en ninguna de sus frases', () => {
    for (const [clave, texto] of Object.entries(en)) expect(typeof texto === 'string' ? texto : `${texto.uno} ${texto.otros}`, clave).not.toMatch(/[áéíóúñ¿¡ÁÉÍÓÚ]/);
  });

  it('un frente que la fase no nombra: el Studio lo dice en el idioma de ahora, y lo que escribió el plan se deja tal cual', () => {
    const plan = {
      fases: [{ id: 'a', nombre: 'XX', frentes: { web: { nivel: 'foco', que: 'Lo que escribió el plan' } } }],
      frentes: [{ id: 'web', nombre: 'XX', rutas: [] }, { id: 'api', nombre: 'YY', rutas: [] }],
      ritmo: [], lecciones: [],
    } as unknown as Plan;
    const vista = () => vistaFrentes({ plan, estado: { excepciones: [], cierres: {}, bitacora: [] } as unknown as EstadoDirector, hoy: '2026-10-29', celda: { frente: 'api', fase: 'a' }, puedoTrabajar: '' });
    expect(queDelFrente(SIN_TRABAJO_EN_FASE)).toBe('Esta fase no lo nombra: espera.');
    expect(vista()).toContain('title="Esta fase no lo nombra: espera."');
    expect(vista()).toContain('title="Lo que escribió el plan"');
    ponerIdioma('en');
    expect(queDelFrente(SIN_TRABAJO_EN_FASE)).toBe('This phase does not name it: on hold.');
    expect(queDelFrente('Lo que escribió el plan')).toBe('Lo que escribió el plan');
    const html = vista();
    expect(html).toContain('title="This phase does not name it: on hold."');
    expect(html).toContain('<p>This phase does not name it: on hold.</p>');
    expect(html).toContain('title="Lo que escribió el plan"');
    expect(html).not.toContain('Esta fase no lo nombra');
  });
});

describe('lo que explica el servidor, en el idioma de la interfaz (pd_idiomas)', () => {
  it('los permisos negados, las voces, la terminal y los ajustes: en inglés si la interfaz está en inglés, y el código no deja frases a mano', () => {
    ponerIdioma('en');
    expect(t('servidor.negado.juntas', { orden: 'a' })).toBe('Run these commands together: a');
    expect(t('servidor.nunca.historia')).toBe('Rewriting git history can lose work: the director never does it.');
    expect(t('servidor.sinTerminal')).toBe('Could not open a terminal on this computer. Copy the command and run it in your terminal.');
    expect(t('servidor.vozSinAudio')).toBe('The Kokoro voice returned no audio.');
    const fuente = (x: string) => readFileSync(new URL(`../servidor/${x}`, import.meta.url), 'utf8');
    expect(fuente('permisosNegados.ts')).not.toContain('Reescribir la historia de git');
    expect(fuente('terminal.ts')).not.toContain('No se pudo abrir una terminal');
    expect(fuente('voz.ts')).not.toContain('no devolvió audio');
    expect(fuente('ajustesClaude.ts')).not.toContain('el Studio no la toca');
  });

  it('api.ts: los avisos salen del archivo de textos, en inglés si la interfaz está en inglés, y el código no deja frases a mano', () => {
    expect(t('servidor.api.eligeUnCaso')).toBe('Elige al menos un caso que medir.');
    ponerIdioma('en');
    expect(t('servidor.api.eligeUnCaso')).toBe('Choose at least one case to measure.');
    expect(t('servidor.api.soloTitular', { que: t('servidor.api.accCruzarPuerta') })).toBe('Only the owner can cross a gate.');
    expect(t('servidor.api.adjuntoPesado', { nombre: 'a.png', n: 5 })).toBe('“a.png” weighs more than 5 MB.');
    expect(t('servidor.api.eligeModoPermisos')).toBe('Choose “Only what is authorized”, “Ask me in the Studio” or “Automatic, watched”.');
    // Los textos de topes.ts siguen el idioma al leerse, no al cargar
    expect(t('servidor.topes.sobraCampo')).toBe('Shorten the text and try again.');
    const api = readFileSync(new URL('../servidor/api.ts', import.meta.url), 'utf8');
    for (const frase of ['Esa petición no viene del Studio', 'Marca al menos un permiso', 'Ese paso ya no está en la misión', 'El director está revisando: espera', 'Ese idioma no está', 'Escribe una ruta completa', 'Solo el titular puede', 'Ese correo ya está en el equipo', 'El nombre del proyecto', 'Elige un modelo de la lista'])
      expect(api, frase).not.toContain(frase);
    // El servidor pone el idioma al empezar cada petición y al guardar el que eligió la persona
    expect(api).toContain("ponerIdioma((await leerLocal(raiz)).idioma ?? 'es');");
    expect(api.slice(api.indexOf("if (ruta === '/idioma' && req.method === 'POST') {"), api.indexOf("if (ruta === '/idioma' && req.method === 'POST') {") + 700)).toContain('ponerIdioma(idioma);');
    // El log sigue en español: lo que va a anotar(...) no pasa por t
    expect(api).not.toMatch(/anotar\([^\n]*\bt\('servidor/);
  });
});

describe('en inglés no queda nada en español en lo que pinta la interfaz (pd_interfaz_ingles, nmw6r9at1tit)', () => {
  afterEach(() => ponerIdioma('es'));
  /** Lo que delata el español: sus signos y sus palabras más comunes que no existen en inglés. */
  const ESPANOL = /[ñ¿¡]|\b(del|los|las|una|está|también|ningún|ninguna|aquí|ahora|cómo|qué|misión|revisión|línea|tú|sí|comentario|haciendo|ocultar|salir|dije)\b/i;
  const sinMarcadores = (v: string) => v.replace(/\{\w+\}/g, '');

  it('ninguna frase del diccionario en inglés trae español', () => {
    const quedan = Object.entries(en).filter(([, v]) => typeof v === 'string' && ESPANOL.test(sinMarcadores(v))).map(([k]) => k);
    expect(quedan).toEqual([]);
  });

  it('la prueba sí encuentra el español que quede', () => {
    for (const frase of ['Ocultar la línea', 'Ya te lo dije en mi comentario', 'Qué está haciendo', 'Comentario', 'Salir del enfoque']) expect(ESPANOL.test(frase), frase).toBe(true);
  });

  it('«Ya te lo dije en mi comentario», guardado así, se pinta en el idioma de la interfaz', () => {
    const marca = { texto: 'Ya te lo dije en mi comentario', sobre: { tipo: 'mision' as const, id: 't_x', seccion: 'Paso 4', eleccion: 'Ya te lo dije en mi comentario' } };
    expect(textoDeNotaALaVista(marca)).toBe('Ya te lo dije en mi comentario');
    ponerIdioma('en');
    expect(textoDeNotaALaVista(marca)).toBe('I already told you in my comment');
    // Con lo que escribió después, eso queda como lo dijo
    expect(textoDeNotaALaVista({ ...marca, texto: 'Ya te lo dije en mi comentario\n\nSee this error' })).toBe('I already told you in my comment\n\nSee this error');
    expect(textoDeNotaALaVista({ ...marca, texto: 'Ya lo comenté antes', sobre: { ...marca.sobre, eleccion: 'Ya lo comenté antes' } })).toBe('I already commented on it');
    // Lo que alguien escribió con sus palabras, sin elegir la marca, no se toca
    expect(textoDeNotaALaVista({ texto: 'Ya te lo dije en mi comentario', sobre: { tipo: 'general' as const } } as never)).toBe('Ya te lo dije en mi comentario');
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf-8');
    expect(app).toContain('const t = textoDeNotaALaVista(n)?.trim() ||');
    expect(readFileSync(new URL('./vistaBuzon.ts', import.meta.url), 'utf-8')).toContain('<p>${esc(textoDeNotaALaVista(n) ?? \'\')}</p>');
  });

  it('lo fijo de index.html y zen.ts (los círculos del director, «Ocultar la línea», «Salir del enfoque») se vuelve a poner desde los diccionarios', () => {
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf-8');
    const zen = readFileSync(new URL('./zen.ts', import.meta.url), 'utf-8');
    for (const clave of ['atajos.comentario', 'atajos.comentarioTitulo', 'atajos.comentarioAria', 'atajos.queHace', 'atajos.queHaceTitulo', 'atajos.queHaceAria', 'enfoque.ocultarLinea', 'enfoque.mostrarLinea', 'enfoque.salir']) {
      expect(app.includes(`'${clave}'`) || zen.includes(`'${clave}'`), clave).toBe(true);
      expect(ESPANOL.test(sinMarcadores((en as Record<string, string>)[clave])), clave).toBe(false);
    }
    expect(zen).not.toContain('Ocultar la línea');
    expect(zen).not.toContain('Salir del enfoque');
    ponerIdioma('en');
    expect(t('atajos.comentario')).toBe('Comment');
    expect(t('atajos.queHace')).toBe('What it is doing');
    expect(t('enfoque.ocultarLinea')).toBe('Hide the line');
  });

  it('con el servidor apagado, un aviso fijo dice que hay que volver a encenderlo y cómo, en los dos idiomas (nmw6r2nuwtit)', () => {
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf-8');
    expect(app).toContain("titulo: tx('servidor.caidoTitulo'), texto: tx('servidor.caidoTexto', { carpeta: laCarpetaDelStudio() }), espera: tx('servidor.caidoEspera')");
    expect(app).toContain("orden: 'npm run encender'");
    expect(app).toContain('pintarAvisoSinServidor();');
    expect(t('servidor.caidoTitulo')).toContain('volver a encenderlo');
    ponerIdioma('en');
    expect(t('servidor.caidoTitulo')).toBe('The Studio stopped: it has to be turned on again');
    expect(t('servidor.caidoTexto', { carpeta: 'the Studio folder' })).toContain('open the Studio folder and double-click «Abrir STL Studio.cmd»');
    expect(t('servidor.caidoTexto')).toContain('open a terminal in that folder');
  });
});

describe('index.html y los estilos no traen frases: todo sale de los diccionarios (pd_interfaz_ingles, nmw6u7ylttit, nmw6ucev4tit)', () => {
  const pagina = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  /** La página sin sus comentarios, sus scripts y sus estilos: lo que se pinta. */
  const cuerpo = pagina.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  /** Lo que no se traduce: el nombre del producto. */
  const PROPIO = /^(STL|STL Studio)$/;

  it('ningún texto entre etiquetas, fuera del nombre del producto', () => {
    const textos = [...cuerpo.matchAll(/>([^<]+)</g)].map((m) => m[1].trim()).filter((x) => /\p{L}{2,}/u.test(x) && !PROPIO.test(x));
    expect(textos).toEqual([]);
  });

  it('ningún title, aria-label, data-etiqueta, placeholder ni alt escrito a mano: cada uno nombra su clave', () => {
    const atributos = [...cuerpo.matchAll(/\s(title|aria-label|data-etiqueta|placeholder|alt)="([^"]*)"/g)].map((m) => `${m[1]}="${m[2]}"`).filter((x) => /\p{L}{2,}/u.test(x.split('=')[1]));
    expect(atributos).toEqual([]);
  });

  it('cada clave que nombra existe en los dos idiomas, y la cubierta de carga y el aviso de pantalla ancha están entre ellas', () => {
    const claves = [...cuerpo.matchAll(/\sdata-tx(?:-title|-aria|-etiqueta)?="([^"]+)"/g)].map((m) => m[1]);
    for (const c of claves) {
      expect(c in es, c).toBe(true);
      expect(c in en, c).toBe(true);
    }
    for (const c of ['fijos.anchoTitulo', 'fijos.anchoTexto', 'fijos.abriendo', 'recarga.ya', 'nav.queEsStl', 'fijos.queEsStlTitulo']) expect(claves, c).toContain(c);
    ponerIdioma('en');
    expect(t('fijos.queEsStlTitulo')).toBe('Opens the public page in a new tab, the one you can share');
    expect(t('nav.queEsStl')).toBe('What is STL Studio');
  });

  it('los estilos no traen frases en content: los avisos los dan los diccionarios con attr()', () => {
    const carpeta = new URL('./', import.meta.url);
    const hojas = ['estilos.css', 'director.css', 'guiaLectura.css', 'asistente.css', 'equipo.css', 'selectorLista.css'].map((h) => readFileSync(new URL(h, carpeta), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''));
    const frases = hojas.flatMap((h) => [...h.matchAll(/content:\s*(['"])(.*?)\1/g)].map((m) => m[2])).filter((x) => /\p{L}{2,}/u.test(x));
    expect(frases).toEqual([]);
    expect(hojas[0]).toContain('body.sin-servidor .cabeza-proyecto::before { content: attr(data-aviso-sin-servidor);');
    const fijos = readFileSync(new URL('./textosFijos.ts', import.meta.url), 'utf8');
    expect(fijos).toContain("cabeza?.setAttribute('data-aviso-sin-servidor', t('fijos.servidorNoResponde', { carpeta: laCarpetaDelStudio() }));");
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8');
    // Al cargar y cada vez que cambia el idioma (pintarSelectorIdioma)
    expect(app.match(/aplicarTextosFijos\(\);/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
