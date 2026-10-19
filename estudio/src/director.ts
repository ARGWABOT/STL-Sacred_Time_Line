// El Director asistente: la portada del Estudio. El director guía al equipo: en el arranque pide el repositorio y el
// contexto, diagnostica el proyecto, propone objetivos y, con el objetivo firmado, traza la ruta. Después dice dónde
// estamos y qué hace hoy cada uno, asigna misiones paso a paso (una a la vez), recibe sus entregas y sus notas
// (escritas o en audio, también sobre los documentos, que se leen y se comentan aquí mismo, parte por parte) y responde
// en su sesión («revisa lo que hay para el director»): aprueba o pide rehacer, contesta cada nota y ajusta la ruta. La
// decisión final es del titular. La ruta y lo que dice el director viven en proyectos/<id>/director/plan.json; lo que hace
// cada uno, en proyectos/<id>/director/equipo/<persona>.json; lo del proyecto, en proyectos/<id>/proyecto.json (servidor:
// estudio/servidor/director.ts).
import { marked } from 'marked';
import {
  aclaracionesDe,
  avanceFase,
  bloqueosPuerta,
  claveIdea,
  claveLeido,
  decideDecision,
  decisionesDe,
  documentosEnOrden,
  enLectura,
  eleccionDe,
  encargoDe,
  enNumero,
  esImagen,
  esPregunta,
  hilosDePreguntas,
  raizDePregunta,
  estadoIdeas,
  estadoMision,
  evaluar,
  excepcionesActivas,
  faseActual,
  marcasAlDia,
  misionesAbiertas,
  nivelDe,
  NIVELES,
  notaFoco,
  partesDeDocumento,
  pasosVistos,
  pendientesDelDirector,
  repartoPorFrente,
  repartoPorNivel,
  seccionPaso,
  situacion,
  textoPaso,
  textoPlano,
  TIPOS_VALIDACION,
  TITULAR,
  trabajoDe,
  trozosDeParte,
  urgenciasDeLaSemana,
  xpDe,
  type Contexto,
  type Criterio,
  type Destino,
  type EstadoDirector,
  type EstadoMision,
  type EtapaArranque,
  type Fase,
  type Mision,
  type Nivel,
  type Nota,
  type Paso,
  type Persona,
  type Plan,
  type Proyecto,
  type Respuesta,
  type RespuestaPropuesta,
  type Senales,
  type TipoValidacion,
} from '../../src/director/director';
import type { InfoRepositorio } from '../../src/director/repositorio';
import type { ResumenProyecto } from '../servidor/director';
import { alCambiarVista, darDatosDirector, decir, nombrePersona, nombreVista, personasEquipo, personaVista, ponerVista, seVe } from './equipo';
import { elegirCarpeta } from './explorador';
import { icono, type Icono } from './iconos';
import { pedirProyectoNuevo } from './nuevo_proyecto';
import { confirmar } from './modal';
import { abrirPreguntas } from './preguntas';
import { Grabadora } from './grabadora';
import { Adjuntos } from './adjuntos';
import { activarRecorrido, paginaSTL, restaurarParada } from './stl';
import { clavePasos, esc, pasosHechos as pasosHechosDe } from './util';
import { celebracion, destinoDeMision, logrosDe } from '../../src/director/animo';

type Vista = 'misiones' | 'buzon' | 'documentos' | 'ruta' | 'propuestas' | 'proyectos' | 'proyecto' | 'diagnostico' | 'frentes' | 'validaciones' | 'esfuerzo' | 'metodo' | 'bitacora' | 'stl' | 'preguntas';
const VISTAS: Vista[] = ['misiones', 'buzon', 'documentos', 'ruta', 'propuestas', 'proyectos', 'proyecto', 'diagnostico', 'frentes', 'validaciones', 'esfuerzo', 'metodo', 'bitacora', 'stl', 'preguntas'];

/**
 * La barra lateral, en grupos: a la vista, solo lo de todos los días (Hoy, el Buzón, las preguntas, la ruta, los
 * documentos y las propuestas). El seguimiento y la consulta van plegados, y se abren cuando hacen falta. Proyecto (la
 * configuración) y el diagnóstico están en la barra solo mientras el proyecto arranca; después, Proyecto se abre con
 * el engranaje del selector de proyectos.
 */
function gruposNav(): { titulo: string; vistas: Vista[]; plegable?: boolean }[] {
  const arranca = d.arranque !== 'en_marcha';
  return [
    { titulo: '', vistas: ['misiones', 'buzon', 'preguntas'] },
    { titulo: 'El proyecto', vistas: ['ruta', 'documentos', 'propuestas', ...(arranca ? (['diagnostico', 'proyecto'] as Vista[]) : [])] },
    { titulo: 'Seguimiento', plegable: true, vistas: [...(arranca ? [] : (['diagnostico'] as Vista[])), 'frentes', 'validaciones', 'esfuerzo', 'bitacora', 'metodo'] },
  ];
}
const CLAVE_SEGUIMIENTO = 'estudio.nav.seguimiento';
const recortar = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);
const NOMBRE_VISTA: Record<Vista, string> = {
  misiones: 'Hoy', buzon: 'Buzón del director', documentos: 'Documentos', ruta: 'La ruta', propuestas: 'Propuestas', proyectos: 'Todos los proyectos',
  proyecto: 'Proyecto', diagnostico: 'Diagnóstico', frentes: 'Frentes', validaciones: 'Validaciones', esfuerzo: 'Esfuerzo', metodo: 'Método',
  bitacora: 'Bitácora', stl: 'Qué es STL', preguntas: 'Preguntas',
};
const ICONO_VISTA: Record<Vista, Icono> = {
  misiones: 'hoy', buzon: 'buzon', documentos: 'documentos', ruta: 'ruta', propuestas: 'propuestas', proyectos: 'proyectos', proyecto: 'proyecto',
  diagnostico: 'diagnostico', frentes: 'frentes', validaciones: 'validaciones', esfuerzo: 'esfuerzo', metodo: 'metodo', bitacora: 'bitacora', stl: 'stl', preguntas: 'pregunta',
};

interface Identidad { nombre: string; correo: string; rol: Persona | null; problema?: string; nuevo?: boolean }
interface Sincronizacion { traido: string | null; error: string | null; local: boolean; subida: { fase: string; mensaje: string; porSubir: number } | null }
interface Repositorio { ruta: string | null; info: InfoRepositorio | null; error: string | null }
interface Datos {
  activo: string; proyectos: ResumenProyecto[];
  plan: Plan; estado: EstadoDirector; senales: Senales; identidad: Identidad; transcripciones: Record<string, string>; sincronizacion: Sincronizacion;
  hoy: string; errores: string[]; proyecto: Proyecto; repositorio: Repositorio; arranque: EtapaArranque;
  /** Las notas de voz que el Studio está transcribiendo ahora, y las que no pudo (las transcribe el director al revisar). */
  transcribiendo?: string[]; sinTranscribir?: string[];
  /** La revisión pedida desde el Studio para este proyecto: la toma la sesión del director en su ciclo (/vigila). */
  revision?: { quien: string; pedida: string; lanzada?: string; enCurso?: string; hecha?: string; error?: string } | null;
  /** La última vuelta de la sesión del director mirando si hay revisiones pedidas. */
  vigilia?: string | null;
  /** Si el Studio lanza solo al director al pedir la revisión (estudio/servidor/revisor.ts), o por qué no puede. */
  revisor?: { agente: string | null; problema: string | null; revisando: string | null } | null;
  /** Lo que va haciendo el director que lanzó el Studio, mientras revisa (estudio/servidor/revisor.ts › progresoDe). */
  progreso?: { tipo: 'dice' | 'hace'; texto: string }[] | null;
  /** «No lo entiendo, explícamelo mejor» de un paso: el director lo aclara al instante, sin el resto de la revisión. */
  aclaracion?: { mision: string; paso: number; nota: string; pedida: string; lanzada?: string; hecha?: string; error?: string } | null;
}
/** Sin proyectos todavía: solo la bienvenida. */
interface SinProyectos { sinProyectos: true; proyectos: ResumenProyecto[]; identidad: Identidad; sincronizacion: Sincronizacion; hoy: string }
/** `studio`: es del propio Studio (su método, su diseño), no del proyecto. */
interface Documento { ruta: string; titulo: string; studio?: boolean }

const NOMBRE_NIVEL: Record<Nivel, string> = { foco: 'En foco', apoyo: 'De apoyo', espera: 'En espera' };
const NOMBRE_SITUACION = { superada: 'Superada', actual: 'Estás aquí', futura: 'Bajo niebla' };
const NOMBRE_TIPO: Record<TipoValidacion, string> = {
  usuarios: 'Con usuarios reales',
  cliente: 'Con el cliente o interesado',
  experto: 'Revisión de un experto',
  tecnica: 'Prueba técnica',
  piloto: 'Piloto en uso real',
};
const NOMBRE_RESPUESTA: Record<RespuestaPropuesta, string> = { aceptada: 'Aceptada', en_estudio: 'En estudio', descartada: 'Descartada' };
const NOMBRE_ESTADO_MISION: Record<EstadoMision, string> = {
  bloqueada: 'Bajo niebla',
  pendiente: 'Por hacer',
  en_curso: 'Por hacer',
  entregada: 'Esperando al director',
  aprobada: 'Aprobada',
  rehacer: 'Hay que rehacerla',
};

let d: Datos;
let vista: Vista = VISTAS.includes(localStorage.getItem('estudio.director.pestana') as Vista) ? (localStorage.getItem('estudio.director.pestana') as Vista) : 'misiones';
let faseVista: string | null = null;
let celda: { frente: string; fase: string } | null = null;
let consulta: string | null = null; // el frente de «¿Puedo trabajar en…?»
let documentos: Documento[] | null = null;
let doc: { ruta: string; texto: string } | null = null;
let irASeccion: string | null = null;
let verPropuestasPasadas = false; // Propuestas: las ya decididas, solo si se piden
let anclaPendiente: string | null = null; // el elemento que hay que mostrar y resaltar al pintar
let tipoValidacionInicial: TipoValidacion | null = null;
let borradorObjetivo: { texto: string; exito: string; horizonte: string; candidato: string } | null = null;
let destinos: Destino[] = []; // los botones «ir» de lo pintado: data-destino es su índice
const GUIA = 'estudio.director.guia_oculta';
const ICONO_ESTADO: Record<EstadoMision, string> = { aprobada: '✓', entregada: '⏳', rehacer: '↺', en_curso: '○', pendiente: '○', bloqueada: '☁' };
/**
 * Los pasos marcados de una misión: los de la memoria del proyecto (viajan con lo demás y los ve el director, que así no
 * vuelve a pedir lo que ya marcaste); este navegador guarda una copia, que lee el director flotante.
 */
const pasosHechos = (id: string): number[] => (d && 'estado' in d ? d.estado.pasos?.[id]?.hechos : undefined) ?? pasosHechosDe(d?.activo ?? '', id);
/** Marca o desmarca un paso (`hecho`: lo deja así; sin decirlo, lo invierte). */
const marcarPaso = (id: string, i: number, hecho?: boolean) => {
  const hechos = new Set(pasosHechos(id));
  if (hecho ?? !hechos.has(i)) hechos.add(i);
  else hechos.delete(i);
  const lista = [...hechos].sort((a, b) => a - b);
  localStorage.setItem(clavePasos(d?.activo ?? '', id), JSON.stringify(lista));
  d.estado.pasos = { ...(d.estado.pasos ?? {}), [id]: { hechos: lista, cuando: new Date().toISOString(), quien: d.identidad.nombre } };
  return accion({ tipo: 'paso', mision: id, hechos: lista }, '');
};

/**
 * Los pasos que se hacen dentro del Studio se marcan solos: el director le pone a cada uno lo que prueba que se hizo
 * (`hecho`: la meta fijada, una parte leída, una propuesta respondida…) y, en cuanto el Studio lo ve, lo marca con su
 * estrella, lo dice y ofrece volver a la misión; si era el último, la entrega. Sin modelo: es lo que el Studio ya lee.
 * Cada paso se marca solo una vez: si lo desmarcas, queda a mano (lo recuerda este navegador).
 */
const CLAVE_VISTOS = 'estudio.director.pasos-vistos';
let viendoPasos = false;
async function verPasosHechos() {
  if (viendoPasos || !d || !('plan' in d) || !d.identidad.rol) return;
  const yo = d.identidad.rol;
  let vistos: Set<string>;
  try {
    vistos = new Set<string>(JSON.parse(localStorage.getItem(CLAVE_VISTOS) ?? '[]'));
  } catch {
    vistos = new Set();
  }
  const clave = (m: Mision, i: number) => `${d.activo}|${m.id}|${i}`;
  const nuevos = misionesAbiertas(d.plan, d.estado, yo)
    .filter((m) => m.para === yo && ['pendiente', 'en_curso', 'rehacer'].includes(estadoMision(m, d.plan, d.estado)))
    .flatMap((m) => pasosVistos(m, d.proyecto, d.estado).filter((i) => !vistos.has(clave(m, i)) && !pasosHechos(m.id).includes(i)).map((i) => ({ m, i })));
  if (!nuevos.length) return;
  viendoPasos = true;
  try {
    for (const x of nuevos) vistos.add(clave(x.m, x.i));
    localStorage.setItem(CLAVE_VISTOS, JSON.stringify([...vistos].slice(-300)));
    const marcados = nuevos.map((x) => ({ ...x, guardado: marcarPaso(x.m.id, x.i, true) }));
    pintar();
    for (const x of marcados) if (await completarSiToca(x.m.id, x.guardado)) return void decir('¡Misión completada! Ya la tengo para revisarla.', 'riendo');
    const x = marcados[0];
    decir('¡Hecho! Lo vi en el Studio y marqué el paso.', 'feliz');
    avisar(`Hecho: lo vi en el Studio. «${recortar(textoPaso(x.m.pasos[x.i]), 80)}» quedó marcado.`, true, undefined, { etiqueta: 'Volver a tu misión', hacer: () => void ir({ vista: 'misiones', ancla: `mision-${x.m.id}`, etiqueta: '' }) });
  } finally {
    viendoPasos = false;
  }
}

/**
 * Al cargar: la copia de este navegador se pone al día con la memoria del proyecto, y lo que solo estaba marcado aquí
 * (de antes de que los pasos viajaran) se guarda allá una vez.
 */
function sincronizarPasos() {
  if (!d || !('estado' in d)) return;
  const yo = d.identidad.rol;
  for (const [id, x] of Object.entries(d.estado.pasos ?? {})) localStorage.setItem(clavePasos(d.activo, id), JSON.stringify(x.hechos));
  for (const m of misionesAbiertas(d.plan, d.estado, yo ?? TITULAR)) {
    if (m.para !== yo || d.estado.pasos?.[m.id]) continue;
    const locales = pasosHechosDe(d.activo, m.id);
    if (locales.length) void accion({ tipo: 'paso', mision: m.id, hechos: locales }, '');
  }
}

const $ = (id: string) => document.getElementById(id)!;
const ctx = (): Contexto => ({ plan: d.plan, estado: d.estado, senales: d.senales });
const titular = () => d.identidad.rol === TITULAR;
const nombreTitular = () => nombrePersona(TITULAR);
/** ¿El proyecto activo es nuevo (se plantea) o existente (se diagnostica)? */
const esNuevo = () => d?.proyecto.tipo === 'nuevo';
const NOMBRE_TRATAMIENTO: Record<string, string> = { integrada: 'Integrada', rechazada: 'Rechazada', aplazada: 'Aplazada', decision: 'Requiere tu decisión', informada: 'Respondida' };
const nombreFrente = (id: string) => d.plan.frentes.find((f) => f.id === id)?.nombre ?? id;
const nombreFase = (id: string) => d.plan.fases.find((f) => f.id === id)?.nombre ?? id;
const numeroFase = (f: Fase) => d.plan.fases.indexOf(f);
const ultima = () => d.plan.fases.length - 1;
const corto = (etapa: string) => etapa.split(/[:(]/)[0].trim();
const fecha = (f: string) => {
  // Con hora (ISO), el día de aquí: a las 9 p. m. del 16 en Colombia ya es 17 en UTC
  if (f.length > 10) return new Date(f).toLocaleDateString('es', { day: 'numeric', month: 'short' });
  const [a, m, dd] = f.slice(0, 10).split('-').map(Number);
  return new Date(a, m - 1, dd).toLocaleDateString('es', { day: 'numeric', month: 'short' });
};
const momento = (iso: string) => new Date(iso).toLocaleString('es', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const pct = (x: number) => `${Math.round(x)} %`;
const chipNivel = (n: Nivel) => `<span class="chip ${n}">${NOMBRE_NIVEL[n]}</span>`;
const tituloDoc = (ruta: string) => d.plan.documentos.find((x) => x.ruta === ruta)?.titulo ?? documentos?.find((x) => x.ruta === ruta)?.titulo ?? ruta.replace(/^docs\//, '').replace(/^repo:/, 'Del proyecto: ');

// ───────────────────────────────────────────── servidor

/**
 * Lo que se guarda va al servidor de a uno y en orden (`accion`), y lo que ya se pintó aquí (un «Entendido», una parte
 * leída) no lo deshace una respuesta vieja: al marcar dos ideas seguidas, la respuesta de la primera traía el estado sin
 * la segunda y la idea volvía atrás; y una recarga que salió antes de guardar traía el estado de antes.
 * `cambiosLocales` cuenta lo que se mandó a guardar; `enVuelo`, lo que aún no responde.
 */
let cambiosLocales = 0;
let enVuelo = 0;
let colaAcciones: Promise<unknown> = Promise.resolve();

async function cargar(fresco = false) {
  const marca = cambiosLocales;
  const r = await fetch(`/__estudio/director${fresco ? '?fresco=1' : ''}`);
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `El servidor respondió ${r.status}`);
  const nuevo: Datos | SinProyectos = await r.json();
  if ('sinProyectos' in nuevo) return pintarBienvenida(nuevo);
  // Con algo guardándose (o mandado a guardar mientras llegaba esto), lo de aquí es lo más nuevo: no se deshace
  if (d && d.activo === nuevo.activo && (enVuelo > 0 || marca !== cambiosLocales)) nuevo.estado = d.estado;
  document.body.classList.remove('sin-proyectos');
  // Otro proyecto: lo abierto del anterior no sirve
  if (d && d.activo !== nuevo.activo) {
    doc = null;
    documentos = null;
    faseVista = null;
    borradorObjetivo = null;
    consulta = null;
    celda = null;
  }
  // Si no llegó nada nuevo, no se repinta (no se pierde la lectura ni lo que suena): solo la hora de la sincronización
  const huella = (x: Datos) => JSON.stringify([x.activo, x.proyectos, x.plan, x.estado, x.transcripciones, x.transcribiendo, x.sinTranscribir, x.identidad, x.errores, x.proyecto, x.repositorio, x.arranque, x.revision, x.aclaracion]);
  const cambio = !d || huella(nuevo) !== huella(d);
  const antes = d?.activo === nuevo.activo ? d.transcribiendo ?? [] : [];
  // La revisión que se pidió desde aquí acaba de terminar: se dice, y lo nuevo ya está pintado
  const termino = d?.activo === nuevo.activo && !!d.revision && !d.revision.hecha && !!nuevo.revision?.hecha;
  // El paso que se pidió aclarar ya está reescrito (o no se pudo, y queda para la revisión)
  const aclarado = d?.activo === nuevo.activo && !!d.aclaracion && !d.aclaracion.hecha && !d.aclaracion.error && nuevo.aclaracion?.pedida === d.aclaracion.pedida ? nuevo.aclaracion : null;
  d = nuevo;
  if (aclarado?.hecha) avisar('El director reescribió el paso con más detalle: está en tu misión.', true, undefined, { etiqueta: 'Ver el paso', hacer: () => void ir({ vista: 'misiones', ancla: `mision-${aclarado.mision}`, etiqueta: '' }) });
  else if (aclarado?.error) avisar(`${aclarado.error} Tu pedido quedó en el Buzón: el director lo responde en la próxima revisión.`);
  // Al terminar, la página se recarga entera: si el director cambió el código del Studio, se ve sin refrescar a mano.
  // Con algo a medio escribir o grabando, espera a que quede libre (el aviso se da después de recargar)
  if (termino) recargarTrasRevision();
  sincronizarPasos();
  darDatosDirector(d);
  if (cambio) pintar();
  else {
    // La vuelta del director cambia cada pocos minutos: solo se repinta la cabecera, nunca lo que estás leyendo
    pintarSincronizacion();
    pintarMando();
  }
  // Lo que llegó puede ser justo lo que pedía un paso: se marca solo
  void verPasosHechos();
  pintarSegundoPlano();
  window.dispatchEvent(new Event('estudio:datos'));
  vigilarTranscripciones(antes);
}

const CLAVE_TERMINO = 'estudio.revision_terminada';
let esperaRecarga: ReturnType<typeof setInterval> | null = null;
function recargarTrasRevision() {
  if (esperaRecarga) return;
  const intentar = () => {
    if (ocupado()) return false;
    sessionStorage.setItem(CLAVE_TERMINO, '1');
    location.reload();
    return true;
  };
  if (!intentar()) esperaRecarga = setInterval(intentar, 2000);
}

/**
 * Lo que pasa en segundo plano, siempre a la vista junto a la cara del director: los audios que se están transcribiendo
 * y la revisión pedida (en curso, esperando su vuelta o sin nadie que la mire). Así nunca hay que adivinar.
 */
function pintarSegundoPlano() {
  const caja = document.getElementById('segundo-plano');
  if (!caja || !d) return;
  const procesando = [...d.estado.notas.map((n) => n.audio), ...Object.values(d.estado.entregas).map((x) => x.audio)]
    .filter((a): a is string => !!a && d.transcripciones[a] === undefined && !d.sinTranscribir?.includes(a)).length;
  const r = estadoRevision();
  const lineas = [
    ...(procesando ? [`<span class="sp-linea">Transcribiendo ${procesando === 1 ? 'tu audio' : `${procesando} audios`}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></span>`] : []),
    ...(r.estado === 'en_curso' ? [`<button type="button" class="sp-linea" data-progreso title="Ver lo que va haciendo">El director está revisando<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></button>`] : []),
    ...(r.estado === 'pedida' ? [`<span class="sp-linea">Revisión pedida · ${hora(d.revision!.pedida)}</span>`] : []),
    ...(r.estado === 'sin_vigilia' ? ['<button type="button" class="sp-linea alerta" data-revision="explicar">⚠ Revisión pedida, sin tomar</button>'] : []),
  ];
  caja.innerHTML = lineas.join('');
  caja.hidden = !lineas.length;
  // Mientras el director trabaja, se navega y se lee todo; lo que le agrega información queda apagado (ver revisando)
  document.body.classList.toggle('director-trabajando', r.estado === 'en_curso');
  // El atajo de revisión dice su estado
  const atajo = document.querySelector<HTMLElement>('.atajo[data-revision]');
  if (atajo) {
    const pendientes = cifras().buzon + cifras().preguntas;
    atajo.dataset.cifra = r.estado === 'ninguna' && pendientes ? String(pendientes) : '';
    atajo.dataset.etiqueta = r.estado === 'ninguna' ? 'Pedir revisión' : r.estado === 'en_curso' ? 'Revisando…' : 'Revisión pedida';
    atajo.classList.toggle('activo', r.estado !== 'ninguna');
    atajo.classList.toggle('alerta', r.estado === 'sin_vigilia');
  }
  const info = document.querySelector<HTMLElement>('.atajo[data-progreso]');
  if (info) {
    info.hidden = r.estado !== 'en_curso';
    info.classList.toggle('activo', progresoAbierto);
  }
  pintarProgreso(r.estado === 'en_curso');
}

/**
 * Lo que va haciendo el director mientras revisa, en vivo: lo que dice y cada cosa que hace (lee, edita, corre las
 * pruebas…), lo más nuevo abajo. Se abre con el atajo de información y se actualiza con cada consulta al servidor.
 */
// Abierto, sigue abierto al recargar la página mientras dure la misma revisión (lo recuerda esta pestaña)
const CLAVE_PROGRESO = 'estudio.director.progreso-abierto';
const revisionEnPantalla = () => (d?.revision ? `${d.activo}:${d.revision.pedida}` : '');
let progresoAbierto = false;
function pintarProgreso(trabajando: boolean) {
  const caja = document.getElementById('progreso-director');
  if (!caja) return;
  if (!progresoAbierto && trabajando && sessionStorage.getItem(CLAVE_PROGRESO) === revisionEnPantalla()) progresoAbierto = true;
  caja.hidden = !(trabajando && progresoAbierto);
  if (caja.hidden) return;
  const pasos = d.progreso ?? [];
  const lista = caja.querySelector<HTMLElement>('.pasos-progreso');
  const abajo = !lista || lista.scrollHeight - lista.scrollTop - lista.clientHeight < 40;
  caja.innerHTML = `<header><b>Lo que va haciendo el director</b><button type="button" class="enlace" data-cerrar-progreso aria-label="Cerrar">${icono('cerrar')}</button></header>
    ${d.progreso === null || d.progreso === undefined
      ? '<p class="como">El director revisa desde su sesión de Claude Code: aquí se ve el avance de las revisiones que lanza el Studio.</p>'
      : pasos.length
      ? `<ol class="pasos-progreso">${pasos.map((p, i) => `<li class="${p.tipo}${i === pasos.length - 1 ? ' ultimo' : ''}">${p.tipo === 'dice' ? esc(p.texto) : `<span class="como">${esc(p.texto)}</span>`}${i === pasos.length - 1 ? '<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span>' : ''}</li>`).join('')}</ol>`
      : '<p class="como">Arrancando<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></p>'}`;
  // Sigue lo más nuevo, salvo que estés leyendo más arriba
  const nueva = caja.querySelector<HTMLElement>('.pasos-progreso');
  if (nueva && abajo) nueva.scrollTop = nueva.scrollHeight;
  else if (nueva && lista) nueva.scrollTop = lista.scrollTop;
}
document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  if (t.closest('[data-cerrar-progreso]')) progresoAbierto = false;
  else if (t.closest('[data-progreso]')) progresoAbierto = !progresoAbierto;
  else return;
  if (progresoAbierto) sessionStorage.setItem(CLAVE_PROGRESO, revisionEnPantalla());
  else sessionStorage.removeItem(CLAVE_PROGRESO);
  pintarSegundoPlano();
  // Abierto, se pregunta más seguido para que avance en vivo
  if (progresoAbierto && d) void cargar().catch(() => undefined);
});

/**
 * Mientras el Studio transcribe notas de voz, se pregunta cada pocos segundos: cuando una queda lista aparece donde se
 * grabó (y en el Buzón), y si es tuya, un aviso te dice lo que se entendió.
 */
let sondeo: ReturnType<typeof setTimeout> | null = null;
const escribiendoEnVista = () => {
  const a = document.activeElement;
  return (!!a && $('vista').contains(a) && (a instanceof HTMLTextAreaElement || a instanceof HTMLInputElement) && a.value.trim() !== '') || !!document.querySelector('.grabando');
};
function vigilarTranscripciones(antes: string[]) {
  const mias = new Set([...d.estado.notas.filter((n) => n.de === d.identidad.rol).map((n) => n.audio), ...Object.values(d.estado.entregas).filter((e) => e.quien === d.identidad.nombre).map((e) => e.audio)]);
  const lista = antes.filter((a) => d.transcripciones[a] && mias.has(a)).at(-1);
  if (lista) {
    const t = d.transcripciones[lista];
    const nota = d.estado.notas.find((n) => n.audio === lista);
    const donde: Vista = nota && esPregunta(nota) ? 'preguntas' : 'buzon';
    avisar(`Tu audio quedó transcrito: «${t.length > 140 ? `${t.slice(0, 137)}…` : t}»`, true, undefined, nota ? { etiqueta: donde === 'preguntas' ? 'Ver en Preguntas' : 'Ver en el Buzón', hacer: () => irA(donde) } : undefined);
  }
  if (sondeo) clearTimeout(sondeo);
  const sinTexto = [...d.estado.notas.map((n) => n.audio), ...Object.values(d.estado.entregas).map((e) => e.audio)].some((a) => a && d.transcripciones[a] === undefined && !d.sinTranscribir?.includes(a));
  // Con una revisión pedida y sin terminar, también se pregunta (más espaciado): así se ve cuando empieza y cuando acaba
  const esperandoRevision = !!d.revision && !d.revision.hecha;
  // Un paso que se está aclarando se espera de cerca: es una ida y vuelta corta
  const esperandoAclaracion = !!d.aclaracion && !d.aclaracion.hecha && !d.aclaracion.error;
  // Con lo que va haciendo el director a la vista, cada pocos segundos (leer su registro no gasta nada)
  const cada = d.transcribiendo?.length || sinTexto || (esperandoRevision && progresoAbierto) || esperandoAclaracion ? 3000 : esperandoRevision ? 10_000 : 0;
  sondeo = cada ? setTimeout(() => (escribiendoEnVista() ? vigilarTranscripciones([]) : void cargar().catch(() => undefined)), cada) : null;
}

/** Un aviso abajo, que no mueve la página: lo bueno se va solo; un error se queda hasta cerrarlo (o un rato largo). */
let avisoHasta: ReturnType<typeof setTimeout> | null = null;
/** `reintentar`: si se puede volver a intentar lo que falló (con lo que se escribió o grabó guardado), el aviso lo ofrece. */
/** `ir`: un atajo dentro del aviso (por ejemplo, al Buzón donde quedó lo que se guardó). */
function avisar(texto: string, bien = false, reintentar?: () => void, ir?: { etiqueta: string; hacer: () => void }) {
  const e = $('error');
  e.hidden = !texto;
  e.className = `aviso-flotante ${bien ? 'bien' : 'mal'}`;
  e.setAttribute('role', bien ? 'status' : 'alert');
  e.innerHTML = `<span>${esc(texto)}</span>${ir ? `<button type="button" class="reintentar ir-aviso" data-ir-aviso>${esc(ir.etiqueta)}</button>` : ''}${reintentar ? '<button type="button" class="reintentar" data-reintentar>Reintentar</button>' : ''}<button type="button" data-cerrar-aviso aria-label="Cerrar el aviso">✕</button>`;
  e.querySelector('[data-cerrar-aviso]')!.addEventListener('click', () => (e.hidden = true));
  e.querySelector('[data-reintentar]')?.addEventListener('click', () => {
    e.hidden = true;
    reintentar!();
  });
  e.querySelector('[data-ir-aviso]')?.addEventListener('click', () => {
    e.hidden = true;
    ir!.hacer();
  });
  // Con un diálogo abierto, el error se ve también dentro de él (el aviso queda detrás de su velo)
  if (!bien) {
    const enDialogo = document.querySelector<HTMLElement>('dialog[open] .error-explorador');
    if (enDialogo) enDialogo.textContent = texto;
  }
  if (avisoHasta) clearTimeout(avisoHasta);
  // lo bueno se queda unos segundos para leerlo con calma (con un atajo, un poco más)
  avisoHasta = setTimeout(() => (e.hidden = true), bien ? (ir ? 10000 : 8000) : reintentar ? 60000 : 15000);
}

/**
 * El servidor del Studio (npm run estudio) es el que guarda todo: si no responde, un pedido falla con un error de red.
 * Se dice qué pasa y qué hacer; lo que se intentó guardar se puede reintentar, y el Studio se reconecta solo.
 */
const SIN_SERVIDOR = 'El servidor del Studio no responde: enciéndelo con «npm run encender» en la carpeta del Studio (o pídeselo a tu agente). Lo que escribiste o grabaste no se perdió: vuelve a intentarlo cuando esté encendido.';
const esDeRed = (e: unknown) => e instanceof TypeError || ['TimeoutError', 'AbortError'].includes((e as Error)?.name);
let sinServidor = false;
function marcarSinServidor(si: boolean) {
  if (sinServidor === si) return;
  sinServidor = si;
  document.body.classList.toggle('sin-servidor', si);
  if (si) {
    const el = $('sincronizacion');
    el.className = 'insignia sync choque';
    el.textContent = '⚠ Studio apagado';
    el.title = SIN_SERVIDOR;
  } else if (d) {
    pintarSincronizacion();
    avisar('El servidor del Studio volvió: todo al día.', true);
  }
}

/**
 * Mientras el director revisa, no se le agrega nada (comentarios, audios, preguntas, entregas ni decisiones): lo leería a
 * medias o se perdería. Se puede navegar y leer todo. Dice por qué y devuelve true si hay que esperar.
 */
const revisando = () => !!d && 'plan' in d && estadoRevision().estado === 'en_curso';
function esperaAlDirector(): boolean {
  if (!revisando()) return false;
  avisar('El director está revisando. Mientras termina, puedes moverte y leer todo, pero no agregar nada nuevo: comentarios, audios, preguntas, entregas ni decisiones. Al terminar, se habilita solo.', true);
  return true;
}

async function accion(cuerpo: Record<string, unknown>, hecho = 'Guardado.') {
  if (cuerpo.tipo !== 'paso' && cuerpo.tipo !== 'leido' && esperaAlDirector()) return false;
  const turno = ++cambiosLocales;
  enVuelo++;
  const antes = colaAcciones;
  let soltar = () => {};
  colaAcciones = new Promise<void>((ok) => (soltar = ok));
  try {
    await antes;
    // con límite: un servidor colgado no deja esperando sin fin
    const r = await fetch('/__estudio/director/accion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo), signal: AbortSignal.timeout(30_000) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error ?? `El servidor respondió ${r.status}`);
    // Si después se mandó otra cosa, su respuesta trae el estado completo: esta ya quedó vieja
    const ultima = turno === cambiosLocales;
    if (ultima) d.estado = j.estado;
    // Lo del proyecto cambia la identidad, el arranque y las señales: se recarga todo
    if (j.proyecto && JSON.stringify(j.proyecto) !== JSON.stringify(d.proyecto)) await cargar(true);
    else if (ultima) {
      darDatosDirector(d);
      pintar();
    }
    // Lo que queda en el Buzón (o en Preguntas) se puede ver desde el aviso; si llevaba audio, se dice que ya se transcribe
    if (cuerpo.tipo === 'comentar') {
      const sobre = cuerpo.sobre as { tipo?: string } | undefined;
      const donde: Vista = sobre?.tipo === 'pregunta' ? 'preguntas' : 'buzon';
      avisar(`${hecho}${cuerpo.audio ? ' Tu audio ya se está transcribiendo: te aviso cuando esté.' : ''}`, true, undefined, { etiqueta: donde === 'preguntas' ? 'Ver en Preguntas' : 'Ver en el Buzón', hacer: () => irA(donde) });
      pintarSegundoPlano();
    } else if (hecho) avisar(hecho, true);
    marcarSinServidor(false);
    // Lo que se acaba de hacer puede ser justo lo que pedía un paso: se marca solo
    if (ultima && cuerpo.tipo !== 'paso') void verPasosHechos();
    return true;
  } catch (e) {
    if (esDeRed(e)) {
      marcarSinServidor(true);
      // con un diálogo abierto, el diálogo conserva lo escrito y muestra el error: no hace falta reintentar desde el aviso
      avisar(SIN_SERVIDOR, false, document.querySelector('dialog[open]') ? undefined : () => void accion(cuerpo, hecho));
    } else avisar((e as Error).message);
    return false;
  } finally {
    enVuelo--;
    soltar();
  }
}

async function cargarDocumentos(forzar = false) {
  if (documentos && !forzar) return;
  const r = await fetch('/__estudio/director/documentos');
  documentos = r.ok ? (await r.json()).documentos : [];
}

async function abrirDocumento(ruta: string, seccion: string | null = null) {
  // Una cosa a la vez: lo que viene después en tu orden de lectura se abre al terminar el que sigue
  const yo = d?.identidad.rol;
  const enCola = yo ? lecturaDe(yo) : [];
  if (enCola.find((x) => x.ruta === ruta)?.lectura === 'despues') {
    const ahora = enCola.find((x) => x.lectura === 'siguiente');
    return avisar(`Ese documento se abre cuando termines de leer «${tituloDoc(ahora?.ruta ?? '')}»: una cosa a la vez.`);
  }
  await cargarDocumentos();
  const r = await fetch(`/__estudio/director/documento?ruta=${encodeURIComponent(ruta)}`);
  if (!r.ok) return avisar((await r.json().catch(() => ({}))).error ?? 'No se pudo abrir el documento.');
  doc = await r.json();
  irASeccion = seccion ?? '';
  irA('documentos');
}

// ───────────────────────────────────────────── ir a donde dice un paso

/** Un botón que lleva a un destino: dentro del Director (→) o a una página de afuera (↗, en pestaña nueva). */
function botonIr(dest: Destino, clase = 'ir-paso') {
  destinos.push(dest);
  const afuera = !!dest.url;
  return `<button type="button" class="${clase}" data-destino="${destinos.length - 1}" title="${afuera ? 'Se abre en una pestaña nueva' : 'Te lleva ahí'}">${esc(dest.etiqueta)} ${afuera ? '↗' : '→'}</button>`;
}

async function ir(dest: Destino) {
  if (dest.url) return void window.open(dest.url, '_blank', 'noopener');
  if (dest.doc) return abrirDocumento(dest.doc, dest.seccion ?? null);
  // «Escribirle al director» abre el comentario, como el atajo junto a su cara: el Buzón ya no tiene formulario
  if (dest.vista === 'buzon' && dest.ancla === 'escribir') return escribirAlDirector();
  if (dest.fase) faseVista = dest.fase;
  if (dest.tipoValidacion) tipoValidacionInicial = dest.tipoValidacion;
  anclaPendiente = dest.ancla ?? null;
  irA(dest.vista ?? 'misiones');
  // Sin un lugar preciso, la vista se lee desde arriba, con la cabecera entera y el contenido debajo (nunca tapado)
  if (!anclaPendiente) window.scrollTo({ top: 0 });
}

/** Muestra y resalta un elemento recién pintado (si es para escribir, lo deja listo). */
function resaltar(el: HTMLElement | null | undefined) {
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.classList.remove('resaltado');
  void el.offsetWidth;
  el.classList.add('resaltado');
  const campo = el.matches('textarea, input') ? el : el.querySelector<HTMLElement>('textarea, input[type="text"]');
  if (campo) setTimeout(() => campo.focus({ preventScroll: true }), 300);
}

// ───────────────────────────────────────────── diálogo

/** `explorar`: el campo es una carpeta, con su botón para buscarla en el computador. */
interface Campo { id: string; etiqueta: string; tipo: 'area' | 'texto' | 'select'; opciones?: [string, string][]; requerido?: boolean; valor?: string; explorar?: boolean; clase?: string; ayuda?: string; pista?: string }

/**
 * «Es urgente»: una casilla, sin explicación aparte (el porqué ya está en lo que se pide). Al marcarla, la revisión se
 * pide enseguida y el director lee la nota para decidir si va ya o qué debe ir antes. Es a propósito poco directa, en
 * dos pasos, para que no se vuelva costumbre: un símbolo discreto junto al título abre el panel, y ahí está la casilla.
 */
function botonUrgente() {
  return `<button type="button" class="abrir-urgente" data-abrir-urgente aria-expanded="false" aria-controls="panel-urgente" title="¿Es urgente?">${icono('urgente')}</button>`;
}

function campoUrgente() {
  // Se cuentan para que una urgencia siga siendo rara
  const semana = urgenciasDeLaSemana(d.estado.notas).length;
  return `<div class="panel-urgente" id="panel-urgente" hidden><label class="urgente-campo"><input name="urgente" type="checkbox" value="1" />
    <span class="interruptor" aria-hidden="true"></span><span>${icono('urgente')}<b>Marcar como urgente</b>
    <span class="ayuda-campo">Úsalo solo si de verdad no puede esperar. Al dejarlo se pide la revisión enseguida (te lo confirmo antes), y el director decide, por lo que pides, si va ya o qué debe ir antes.${semana ? ` Esta semana: ${semana} ${semana === 1 ? 'urgencia' : 'urgencias'}.` : ''}</span></span></label></div>`;
}

/** Marcar urgente pide la revisión de todo lo pendiente al dejar la nota: se confirma antes, diciendo qué va a pasar. */
function confirmarUrgencia() {
  const pedida = !!d.revision && !d.revision.hecha;
  return confirmar({
    titulo: 'Lo marcaste como urgente',
    texto: pedida
      ? 'Ya hay una revisión pedida: esto entra en ella, y el director lo atiende primero. Él decide si de verdad va ya o qué debe ir antes.'
      : 'Al dejarlo en el Buzón, el Studio pide la revisión ahora mismo, y el director revisa todo lo que está pendiente, empezando por esto. Él decide si de verdad va ya o qué debe ir antes.\n\n¿De acuerdo?',
    boton: pedida ? 'Sí, dejarlo' : 'Sí, dejarlo y pedir la revisión',
    cancelar: 'No, volver',
  });
}

function pedir(o: { titulo: string; ayuda?: string; campos: Campo[]; boton: string; audio?: boolean; vacioVale?: boolean; adjuntos?: boolean; urgente?: boolean }): Promise<(Record<string, string> & { audio?: string; adjuntos?: { nombre: string; datos: string }[] }) | null> {
  const dlg = $('dialogo') as HTMLDialogElement;
  dlg.innerHTML = `<form method="dialog">
    <header class="cabeza-dialogo">${o.urgente ? `<div class="titulo-con-urgente"><h2>${esc(o.titulo)}</h2>${botonUrgente()}</div>` : `<h2>${esc(o.titulo)}</h2>`}${o.ayuda ? `<p>${o.ayuda}</p>` : ''}</header>
    ${o.campos
      .map((c) => {
        // Con audio, lo obligatorio de escribir también se puede decir: lo comprueba el envío, no el navegador
        const req = c.requerido && !(o.audio && c.tipo === 'area') ? ' required' : '';
        const control =
          c.tipo === 'area' ? `<textarea name="${c.id}" rows="4"${req}>${esc(c.valor ?? '')}</textarea>`
          : c.tipo === 'select' ? `<select name="${c.id}">${(c.opciones ?? []).map(([v, n]) => `<option value="${esc(v)}"${v === c.valor ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>`
          : c.explorar ? `<span class="con-explorar"><input name="${c.id}" type="text" value="${esc(c.valor ?? '')}"${req} placeholder="Explora o escribe la ruta" /><button type="button" data-explorar="${c.id}">📁 Explorar…</button></span>`
          : `<input name="${c.id}" type="text" value="${esc(c.valor ?? '')}"${req}${c.pista ? ` placeholder="${esc(c.pista)}"` : ''} />`;
        return `<label class="campo${c.clase ? ` ${c.clase}` : ''}"><span class="etiqueta-campo">${esc(c.etiqueta)}</span>${c.ayuda ? `<span class="ayuda-campo">${esc(c.ayuda)}</span>` : ''}${control}</label>`;
      })
      .join('')}
    ${o.audio ? '<div class="grabadora" data-grabadora></div>' : ''}
    ${o.adjuntos ? '<div class="adjuntos" data-adjuntos></div>' : ''}
    ${o.urgente ? campoUrgente() : ''}
    <div class="botones"><button type="button" data-cancelar>Cancelar</button><button type="submit" class="primario">${esc(o.boton)}</button></div>
  </form>`;
  const grabadora = o.audio ? new Grabadora(dlg.querySelector('[data-grabadora]') as HTMLElement) : null;
  const adjuntos = o.adjuntos ? new Adjuntos(dlg.querySelector('[data-adjuntos]') as HTMLElement, dlg.querySelector('form')!, (t) => avisar(t)) : null;
  return new Promise((ok) => {
    const form = dlg.querySelector('form')!;
    // Se resuelve una sola vez y sin depender del evento «close» (no todos los navegadores lo disparan a tiempo)
    let listo = false;
    const terminar = (resultado: (Record<string, string> & { audio?: string; adjuntos?: { nombre: string; datos: string }[] }) | null) => {
      if (listo) return;
      listo = true;
      void grabadora?.terminar();
      adjuntos?.terminar();
      if (dlg.open) dlg.close();
      ok(resultado);
    };
    dlg.querySelector('[data-cancelar]')!.addEventListener('click', () => terminar(null));
    // Las carpetas se buscan en el explorador del computador
    form.addEventListener('click', async (e) => {
      // El primer paso de la urgencia: abre (o cierra) su panel; al cerrarlo, deja de estar marcada
      const u = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-abrir-urgente]');
      if (u) {
        const panel = form.querySelector<HTMLElement>('.panel-urgente')!;
        panel.hidden = !panel.hidden;
        u.setAttribute('aria-expanded', String(!panel.hidden));
        if (panel.hidden) form.querySelector<HTMLInputElement>('[name="urgente"]')!.checked = false;
        return;
      }
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-explorar]');
      if (!b) return;
      const campo = form.querySelector<HTMLInputElement>(`[name="${b.dataset.explorar}"]`)!;
      const elegida = await elegirCarpeta(campo.value);
      if (elegida) campo.value = elegida;
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const valores = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
      const audio = grabadora ? await grabadora.datos() : null;
      const archivos = adjuntos && !adjuntos.vacio ? await adjuntos.datos() : null;
      // La casilla de urgencia no es contenido: una nota marcada urgente y vacía sigue vacía
      const escrito = Object.entries(valores).some(([k, v]) => k !== 'urgente' && v.trim());
      if (o.audio && !o.vacioVale && !audio && !archivos && !escrito) return avisar(o.adjuntos ? 'Escribe algo, graba un audio o adjunta un archivo.' : 'Escribe algo o graba un audio.');
      // Lo que es obligatorio de escribir vale también dicho en audio
      const falta = o.campos.find((c) => c.requerido && !(valores[c.id] ?? '').trim());
      if (falta && !audio) return avisar(`Falta «${falta.etiqueta}»${o.audio ? ': escríbelo o dilo en un audio' : ''}.`);
      if (o.urgente && valores.urgente && !(await confirmarUrgencia())) return;
      terminar({ ...valores, ...(audio ? { audio } : {}), ...(archivos ? { adjuntos: archivos } : {}) } as Parameters<typeof terminar>[0]);
    });
    // Con Esc el navegador lo cierra solo: se resuelve sin respuesta (si sigue abierto, solo se hizo a un lado para grabar)
    dlg.addEventListener('close', () => { if (!dlg.open) terminar(null); });
    dlg.addEventListener('cancel', () => terminar(null), { once: true });
    dlg.showModal();
    (dlg.querySelector('textarea, input, select') as HTMLElement | null)?.focus();
  });
}

// ───────────────────────────────────────────── cabecera: quién, el puesto de mando, el arranque y la ruta

/** Cuánto hace que se trajo GitHub y cómo va lo propio. */
function pintarSincronizacion() {
  const s = d.sincronizacion;
  const el = $('sincronizacion');
  const hace = s.traido ? Math.max(0, Math.round((Date.now() - new Date(s.traido).getTime()) / 1000)) : null;
  const cuando = hace === null ? 'aún no' : hace < 60 ? `hace ${hace} s` : `hace ${Math.round(hace / 60)} min`;
  const subiendo = s.subida && (s.subida.porSubir > 0 || s.subida.fase === 'subiendo');
  const problema = s.error || (s.subida && ['choque', 'sin_red', 'en_espera'].includes(s.subida.fase) ? s.subida.mensaje : null);
  el.className = `insignia sync ${problema ? 'choque' : subiendo ? 'subiendo' : 'al_dia'}`;
  el.textContent = problema ? '⚠ Sincronización' : subiendo ? '↑ Guardando lo tuyo…' : s.local ? '✓ Guardado en este computador' : `↻ Al día con GitHub · ${cuando}`;
  el.title = problema ?? (s.local
    ? 'Cada decisión queda en un commit local de este Estudio. Para trabajar en equipo desde varios computadores, el Estudio necesita un remoto «origin» y la subida activa en Proyecto.'
    : 'Lo tuyo se guarda en commits locales (y sube solo si está activo en Proyecto); lo de los demás y lo que responde el director se trae cada 30 s. Clic: traer ya.');
}

function pintarQuien() {
  const q = $('quien');
  const id = d.identidad;
  q.textContent = id.rol ? `${nombrePersona(id.rol)} (${id.nombre}) · ${id.rol}${id.nuevo ? ', sin registrar' : ''}` : 'Sin identidad de git';
  q.classList.toggle('sin', !id.rol);
  q.title = id.problema ?? (id.rol === TITULAR ? 'Decides: fijas la meta, respondes las propuestas, cruzas las puertas y tienes la última palabra sobre cada criterio.' : 'Haces tus misiones, las entregas y le escribes al director; el titular decide.');
}

// ───────────────────────────────────────────── varios proyectos

const NOMBRE_ETAPA: Record<string, string> = {
  conectar: 'Falta entregar el repositorio',
  contar: 'Falta contar el proyecto',
  diagnostico: 'Esperando el diagnóstico',
  objetivo: 'Falta fijar la meta',
  ruta: 'Esperando la ruta',
  en_marcha: 'En marcha',
};

/** En qué va un proyecto, en pocas palabras: la etapa del arranque o, en marcha, su fase. */
const enQueVa = (p: ResumenProyecto) => (p.etapa === 'en_marcha' && p.fase ? `Fase «${p.fase}»` : NOMBRE_ETAPA[p.etapa] ?? p.etapa);

/**
 * El selector de proyecto, arriba de la barra lateral: el activo con en qué va y, al abrirlo, todos, cada uno con lo
 * que espera al director y su alerta. Cambiar de proyecto es un clic: el director dice dónde quedaron.
 */
function pintarSelectorProyecto(proyectos: ResumenProyecto[], activo: string | null) {
  $('selector-proyecto').hidden = !proyectos.length;
  const a = proyectos.find((p) => p.id === activo);
  $('proyecto-activo').innerHTML = a
    ? `<span class="inicial-p" aria-hidden="true">${esc(a.nombre.charAt(0).toUpperCase())}</span><span class="texto-p"><b>${esc(a.nombre)}</b><small>${esc(enQueVa(a))}</small></span>${a.alerta ? '<span class="alerta-punto" title="Tiene una alerta">!</span>' : ''}${icono('flecha', 'icono flecha-p')}`
    : '';
  $('proyecto-activo').title = 'Cambiar de proyecto';
  $('menu-proyectos').innerHTML = `<p class="titulo-menu">Tus proyectos <small>· uno activo a la vez</small></p>
    <ul role="list">${proyectos
      .map((p) => `<li class="fila-proyecto"><button type="button" class="opcion-proyecto${p.id === activo ? ' activo' : ''}" data-cambiar="${esc(p.id)}"${p.id === activo ? ' aria-current="true"' : ''}>
        <span class="inicial-p" aria-hidden="true">${esc(p.nombre.charAt(0).toUpperCase())}</span>
        <span class="texto-p"><b>${esc(p.nombre)}</b><small>${esc(enQueVa(p))}${p.porRevisar ? ` · ${p.porRevisar} por revisar` : ''}</small>${p.alerta ? `<small class="alerta-linea">⚠ ${esc(p.alerta)}</small>` : ''}</span>
        ${p.id === activo ? icono('check', 'icono marca-activo') : ''}</button><button type="button" class="engrane-p" data-config-proyecto="${esc(p.id)}" title="Configuración de ${esc(p.nombre)}: repositorio, contexto, meta y equipo" aria-label="Configuración de ${esc(p.nombre)}">${icono('ajustes')}</button></li>`)
      .join('')}</ul>
    <div class="acciones-menu"><button type="button" data-nuevo-proyecto>${icono('mas')} Entregar proyectos</button><button type="button" data-ver-proyectos>${icono('proyectos')} Ver todos</button></div>`;
}

function abrirMenuProyectos(abrir: boolean) {
  // Flota sobre el contenido, justo debajo del selector (la barra lateral es angosta para mostrarlo completo)
  const b = $('proyecto-activo').getBoundingClientRect();
  Object.assign($('menu-proyectos').style, { top: `${Math.round(b.bottom + 6)}px`, left: `${Math.round(b.left)}px` });
  $('menu-proyectos').hidden = !abrir;
  $('proyecto-activo').setAttribute('aria-expanded', String(abrir));
  if (abrir) $('menu-proyectos').querySelector<HTMLElement>('.opcion-proyecto.activo, .opcion-proyecto')?.focus();
}

/** Cambia el proyecto activo y, si se pide, lleva directo a un lugar de ese proyecto (su misión, sus propuestas…). */
async function activar(id: string, destino?: Destino) {
  if (d?.activo !== id) {
    const r = await fetch('/__estudio/director/activo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (!r.ok) return avisar((await r.json().catch(() => ({}))).error ?? 'No se pudo cambiar de proyecto.');
    await cargar(true);
  }
  if (destino) return void (await ir(destino));
  // Al cambiar de proyecto, lo primero: dónde quedamos
  await mostrarDondeQuedamos();
}

// ───────────────────────────────────────────── «Dónde quedamos»: el brief al volver a un proyecto

const claveVisto = (id: string) => `estudio.visto.${id}`;
const HORAS_PARA_RESUMEN = 4;

/** Si hace rato que no se veía este proyecto en este navegador (o nunca), al abrirlo toca el resumen. */
function tocaResumen(): boolean {
  const visto = localStorage.getItem(claveVisto(d.activo));
  return !visto || Date.now() - new Date(visto).getTime() > HORAS_PARA_RESUMEN * 3600_000;
}

/**
 * El brief del director al volver a un proyecto: en qué quedamos, lo que se avanzó y sus comentarios (lo escribe el
 * director en plan.resumen y plan.mensaje), más lo nuevo desde tu última visita, y un botón directo
 * a tu misión de ahora. Un proyecto a la vez: el director no lleva a misiones de otros proyectos.
 */
async function mostrarDondeQuedamos() {
  // Uno a la vez: si ya está abierto (se abre solo al volver, y también con su botón), no se abre otro encima
  if (document.querySelector('dialog.donde-quedamos[open]')) return;
  const r = d.plan.resumen;
  const visto = localStorage.getItem(claveVisto(d.activo));
  const p = d.proyectos.find((x) => x.id === d.activo);
  const yo = d.identidad.rol ?? TITULAR;
  const mia = misionesAbiertas(d.plan, d.estado, yo)[0];
  const respondidasDesde = visto ? d.estado.notas.filter((n) => (d.plan.respuestas[n.id]?.cuando ?? '') > visto) : [];
  const nuevasRespuestas = respondidasDesde.filter((n) => !esPregunta(n)).length;
  const nuevasPreguntas = respondidasDesde.filter(esPregunta).length;
  const nuevasAprobadas = visto ? Object.entries(d.plan.revisiones).filter(([, x]) => x.cuando > visto && x.veredicto === 'aprobada').length : 0;
  const porDecidir = p?.agenda.porDecidir ?? 0;
  // Cada línea se toca cuando se lee: se tacha, se rompe y baja a «Ya leído». Lo nuevo se acumula hasta que lo marques,
  // y lo leído se recuerda en este navegador. Lo que espera de ti no se dice aquí: solo lo dicen tu misión y el director
  const est = estadoDq(d.activo);
  const desde = visto ? `Tu última visita fue el ${momento(visto)}.` : `Es la primera vez que abres este proyecto en este navegador.${localStorage.getItem(GUIA) === '1' ? '' : ' Si también es tu primera vez en el Studio, <button type="button" class="enlace" data-a-guia>«Qué es STL»</button> lo explica en dos minutos.'}`;
  const novedades = [
    nuevasAprobadas ? `${nuevasAprobadas} ${nuevasAprobadas === 1 ? 'misión aprobada' : 'misiones aprobadas'}` : '',
    nuevasRespuestas ? `${nuevasRespuestas} ${nuevasRespuestas === 1 ? 'respuesta nueva' : 'respuestas nuevas'} del director en el Buzón` : '',
    nuevasPreguntas ? `${nuevasPreguntas} ${nuevasPreguntas === 1 ? 'pregunta respondida' : 'preguntas respondidas'} (en Preguntas)` : '',
  ].filter(Boolean);
  const dlg = document.createElement('dialog');
  dlg.className = 'dialogo-director donde-quedamos';
  dlg.innerHTML = `<form method="dialog">
    <h2 class="etiqueta" tabindex="-1" autofocus>${esc(d.proyecto.nombre || d.activo)} · dónde quedamos</h2>
    <p class="dq-quedamos">${r ? esc(r.quedamos) : 'Todavía no hay un resumen del director para este proyecto.'}</p>
    ${r?.alerta ? `<p class="alerta-p">⚠ ${esc(r.alerta)}</p>` : ''}
    <p class="como">${desde}${novedades.length ? ` Desde entonces: ${novedades.join(' y ')}.` : ''}${r ? ` Resumen del director del ${momento(r.fecha)}.` : ''}</p>
    ${lecturaDq(est)}
    <div class="botones"><button type="button" data-cerrar>Cerrar</button>${mia ? `<button type="button" class="primario" data-a-mision title="Abre la tarjeta de tu misión de ahora: ahí está el paso siguiente">Ir a lo que sigue →</button>` : porDecidir ? '<button type="button" class="primario" data-a-propuestas>Ver las propuestas →</button>' : ''}</div>
  </form>`;
  document.body.append(dlg);
  await new Promise<void>((ok) => {
    let listo = false;
    const terminar = async (destino?: Destino) => {
      if (listo) return;
      listo = true;
      localStorage.setItem(claveVisto(d.activo), new Date().toISOString());
      if (dlg.open) dlg.close();
      dlg.remove();
      pintarMando();
      if (destino) await ir(destino);
      ok();
    };
    dlg.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!b) return;
      if (b.classList.contains('dq-item')) return tocarDq(dlg, b, est);
      if (b.classList.contains('dq-mas')) return masDq(dlg, est);
      // Siempre a la tarjeta de la misión (no al documento del paso): el resumen da contexto y la misión dice el paso
      if (b.dataset.aMision !== undefined && mia) void terminar(tarjetaDe(mia));
      else if (b.dataset.aPropuestas !== undefined) void terminar({ vista: 'propuestas', etiqueta: '' });
      else if (b.dataset.aGuia !== undefined) void terminar({ vista: 'stl', etiqueta: '' });
      else if (b.dataset.cerrar !== undefined) void terminar();
    });
    dlg.addEventListener('cancel', () => void terminar());
    dlg.addEventListener('close', () => void terminar());
    pintarProgresoDq(dlg, est);
    dlg.showModal();
  });
}

// ───────────────────────────────────────────── «Dónde quedamos» como lectura de juego
// Cada línea del resumen se toca cuando se lee. Responde al instante (el check), se tacha, se rompe en pedazos y baja a
// «Ya leído», y la barra dice cuánto llevas. Al volver, solo aparece lo que falta. Lo que se repite es corto y nunca
// bloquea (se puede tocar la siguiente sin esperar), y lo especial queda para los hitos: la mitad, el final y, de vez en
// cuando, una chispa distinta. Lo nuevo se acumula: si el director reescribe el resumen antes de que lo leas, lo anterior
// sigue esperando hasta que lo marques. «Ya leído» muestra las últimas 20 y trae más de a 20, si se piden.

interface SeccionDq { id: string; titulo: string; items: string[] }
/** Una línea guardada en este navegador: espera hasta que la marques; leída, baja a «Ya leído» con su fecha. */
interface LineaDq { h: string; s: string; t: string; llego: string; leida?: string }
/** Lo que lleva abierto «Dónde quedamos»: el archivo de líneas, la barra (de lo de ahora) y cuántas leídas se ven. */
interface EstadoDq { proyecto: string; archivo: LineaDq[]; total: number; leidas: number; mostradas: number; contadas: Set<string> }

// Dos cosas distintas, cada una una sola vez: lo que se hizo (con su resultado) y lo que el director comenta (por qué
// decidió algo, lo que no pudo, lo que conviene saber). En este orden: primero lo avanzado
const TITULOS_DQ: Record<string, string> = { avanzamos: 'Lo que avanzamos', director: 'Comentarios del director' };
const LEIDAS_A_LA_VISTA = 20;
const LEIDAS_GUARDADAS = 300;

/** Lo que se lee en «Dónde quedamos»: lo avanzado y los comentarios del director en su última revisión. */
function seccionesDq(): SeccionDq[] {
  const r = d.plan.resumen;
  const dijo = d.plan.mensaje?.texto?.trim();
  return [
    { id: 'avanzamos', titulo: TITULOS_DQ.avanzamos, items: r?.avanzamos ?? [] },
    { id: 'director', titulo: TITULOS_DQ.director, items: dijo ? [dijo] : [] },
  ].filter((s) => s.items.length);
}

/** Para el botón «¿Dónde quedamos?»: cuántas líneas faltan por leer y si el director dejó algo desde tu última visita. */
function novedadesDq(): { sinLeer: number; nuevo: boolean } {
  if (!d || !('plan' in d)) return { sinLeer: 0, nuevo: false };
  const visto = localStorage.getItem(claveVisto(d.activo));
  const sinLeer = archivoDq(d.activo).filter((l) => !l.leida).length;
  return { sinLeer, nuevo: sinLeer > 0 && (!visto || (d.plan.resumen?.fecha ?? '') > visto) };
}
/** Antes del archivo, solo se guardaban las huellas de lo leído: se respetan al pasar al archivo. */
const claveLeidasDq = (id: string) => `estudio.dq.leidas.${id}`;
const claveArchivoDq = (id: string) => `estudio.dq.archivo.${id}`;
/** Una huella corta de cada línea: si el director la reescribe, vuelve a aparecer como nueva. */
const huellaDq = (seccion: string, texto: string) => {
  let h = 5381;
  for (const c of `${seccion}|${texto}`) h = ((h << 5) + h + c.codePointAt(0)!) | 0;
  return (h >>> 0).toString(36);
};

/**
 * Las líneas de «Dónde quedamos» en este navegador: las del resumen de ahora más las que llegaron antes y aún no marcas.
 * Lo que trae el resumen y no estaba, entra como nuevo.
 */
function archivoDq(proyecto: string): LineaDq[] {
  let archivo: LineaDq[] = [];
  try {
    const x = JSON.parse(localStorage.getItem(claveArchivoDq(proyecto)) ?? '[]');
    // Lo de una sección que ya no se muestra (los «resultados», que repetían lo avanzado) sale del archivo
    if (Array.isArray(x)) archivo = x.filter((l: LineaDq) => l.s in TITULOS_DQ);
  } catch { /* sin archivo todavía */ }
  const conocidas = new Set(archivo.map((l) => l.h));
  let viejas: Set<string> | null = null;
  const ahora = new Date().toISOString();
  let cambio = false;
  for (const s of seccionesDq()) {
    for (const t of s.items) {
      const h = huellaDq(s.id, t);
      if (conocidas.has(h)) continue;
      if (!viejas) {
        try { viejas = new Set(JSON.parse(localStorage.getItem(claveLeidasDq(proyecto)) ?? '[]') as string[]); } catch { viejas = new Set(); }
      }
      archivo.push({ h, s: s.id, t, llego: ahora, ...(viejas.has(h) ? { leida: ahora } : {}) });
      conocidas.add(h);
      cambio = true;
    }
  }
  if (cambio) guardarArchivoDq(proyecto, archivo);
  return archivo;
}

/** Guarda el archivo: todo lo que falta por leer y, de lo leído, solo lo más reciente. */
function guardarArchivoDq(proyecto: string, archivo: LineaDq[]) {
  const fuera = new Set(archivo.filter((l) => l.leida).sort((a, b) => b.leida!.localeCompare(a.leida!)).slice(LEIDAS_GUARDADAS).map((l) => l.h));
  try {
    localStorage.setItem(claveArchivoDq(proyecto), JSON.stringify(archivo.filter((l) => !fuera.has(l.h))));
  } catch { /* sin espacio: se recuerda mientras esté abierto */ }
}

/** Al abrir: la barra mide lo del resumen de ahora más lo que se acumuló sin leer. */
function estadoDq(proyecto: string): EstadoDq {
  const archivo = archivoDq(proyecto);
  const deAhora = new Set(seccionesDq().flatMap((s) => s.items.map((t) => huellaDq(s.id, t))));
  // Lo que mide la barra: lo de ahora (leído o no) y lo que se acumuló sin leer
  const contadas = new Set(archivo.filter((l) => !l.leida || deAhora.has(l.h)).map((l) => l.h));
  const leidas = archivo.filter((l) => l.leida && contadas.has(l.h)).length;
  return { proyecto, archivo, total: contadas.size, leidas, mostradas: LEIDAS_A_LA_VISTA, contadas };
}

/** Lo que falta de una sección, en orden: primero lo del resumen de ahora (como lo escribió el director), después lo anterior, lo más nuevo primero. */
function pendientesDq(est: EstadoDq, seccion: string): LineaDq[] {
  const ahora = seccionesDq().find((s) => s.id === seccion)?.items.map((t) => huellaDq(seccion, t)) ?? [];
  const lugar = (l: LineaDq) => (ahora.includes(l.h) ? ahora.indexOf(l.h) : Infinity);
  return est.archivo.filter((l) => l.s === seccion && !l.leida).sort((a, b) => lugar(a) - lugar(b) || b.llego.localeCompare(a.llego));
}

/** Lo leído, lo último primero. */
const leidasDq = (est: EstadoDq) => est.archivo.filter((l) => l.leida).sort((a, b) => b.leida!.localeCompare(a.leida!));

const itemDq = (l: LineaDq, orden: number, leida: boolean) =>
  `<li><button type="button" class="dq-item${leida ? ' leida' : ''}" data-huella="${l.h}" data-seccion="${esc(l.s)}" data-orden="${orden}" title="${leida ? 'Volver a ponerla entre lo que falta' : 'Tócala cuando la leas'}"><span class="dq-check" aria-hidden="true"></span><span class="dq-cuerpo"><span class="dq-texto">${esc(l.t)}</span></span><span class="sr-only">${leida ? ' (leída)' : ''}</span></button></li>`;

/** Las secciones con lo que falta por leer, la barra de lo leído y, al final, lo ya leído (plegado, de a 20). */
function lecturaDq(est: EstadoDq): string {
  if (!est.archivo.length) return '';
  const ids = Object.keys(TITULOS_DQ).filter((id) => est.archivo.some((l) => l.s === id));
  const leidas = leidasDq(est);
  return `<div class="dq-progreso" aria-live="polite"><div class="dq-barra"><i></i></div><span class="dq-cuenta"></span></div>
    ${ids.map((id) => `<section class="dq-seccion" data-seccion="${id}"><h3>${esc(TITULOS_DQ[id])}</h3><ul class="dq-lista">${pendientesDq(est, id).map((l, i) => itemDq(l, i, false)).join('')}</ul></section>`).join('')}
    <p class="dq-al-dia" hidden>¡Al día! Ya leíste todo lo nuevo. Lo que sigue es tu misión.</p>
    <details class="dq-leidas"${leidas.length ? '' : ' hidden'}><summary>Ya leído <span class="cifra">${leidas.length}</span></summary><ul class="dq-lista">${leidas.slice(0, est.mostradas).map((l) => itemDq(l, Infinity, true)).join('')}</ul><button type="button" class="enlace dq-mas" hidden></button></details>`;
}

/** «Mostrar más» en «Ya leído»: trae las 20 siguientes. */
function masDq(dlg: HTMLElement, est: EstadoDq) {
  const lista = dlg.querySelector('.dq-leidas .dq-lista')!;
  const leidas = leidasDq(est);
  const ya = lista.querySelectorAll('li').length;
  lista.insertAdjacentHTML('beforeend', leidas.slice(ya, ya + LEIDAS_A_LA_VISTA).map((l) => itemDq(l, Infinity, true)).join(''));
  est.mostradas = lista.querySelectorAll('li').length;
  pintarProgresoDq(dlg, est);
}

/** Pone al día la barra, el contador, las secciones vacías y lo ya leído. Al terminar, señala tu misión. */
function pintarProgresoDq(dlg: HTMLElement, est: EstadoDq, celebrar = false) {
  const cuenta = dlg.querySelector<HTMLElement>('.dq-cuenta');
  if (!cuenta) return;
  const { total, leidas } = est;
  const falta = total - leidas;
  dlg.querySelector<HTMLElement>('.dq-barra i')!.style.width = `${total ? Math.round((leidas / total) * 100) : 0}%`;
  cuenta.textContent = !leidas ? 'Toca cada línea cuando la leas' : !falta ? `¡Leíste las ${total}!` : `Leíste ${leidas} de ${total}${falta <= 2 ? ' · ¡ya casi!' : leidas === Math.ceil(total / 2) ? ' · ¡vas por la mitad!' : ''}`;
  dlg.querySelectorAll<HTMLElement>('.dq-seccion').forEach((s) => (s.hidden = !s.querySelector('li')));
  const yaLeido = dlg.querySelector<HTMLDetailsElement>('.dq-leidas')!;
  const todasLeidas = est.archivo.filter((l) => l.leida).length;
  yaLeido.hidden = !todasLeidas;
  yaLeido.querySelector('.cifra')!.textContent = String(todasLeidas);
  const mas = yaLeido.querySelector<HTMLButtonElement>('.dq-mas')!;
  const quedan = todasLeidas - yaLeido.querySelectorAll('.dq-lista li').length;
  mas.hidden = quedan <= 0;
  mas.textContent = `Mostrar más (${quedan > LEIDAS_A_LA_VISTA ? `${LEIDAS_A_LA_VISTA} de ${quedan}` : quedan})`;
  dlg.querySelector<HTMLElement>('.dq-al-dia')!.hidden = !!falta;
  const siguiente = dlg.querySelector<HTMLElement>('.botones .primario');
  siguiente?.classList.toggle('dq-llamada', !falta);
  if (celebrar && !falta && !quieto()) {
    const confeti = document.createElement('div');
    confeti.className = 'confeti';
    confeti.innerHTML = Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}"></i>`).join('');
    dlg.querySelector('form')?.append(confeti);
    setTimeout(() => confeti.remove(), 2600);
  }
}

const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Unas chispas desde el check: de vez en cuando (y en los hitos), estrellas doradas en vez de puntos. */
function chispasDq(b: HTMLElement, especial: boolean) {
  const c = document.createElement('span');
  c.className = `dq-chispas${especial ? ' especial' : ''}`;
  const n = especial ? 9 : 6;
  c.innerHTML = Array.from({ length: n }, (_, i) => `<i style="--a:${Math.round((360 / n) * i + Math.random() * 20)}deg;--d:${especial ? 30 + Math.random() * 10 : 18 + Math.random() * 8}px;--h:${95 + Math.round(Math.random() * 60)}">${especial ? '★' : ''}</i>`).join('');
  b.append(c);
  setTimeout(() => c.remove(), 700);
}

/** Tocar una línea: si falta, se lee (con su efecto); si ya estaba leída, vuelve a su sitio. */
function tocarDq(dlg: HTMLElement, b: HTMLButtonElement, est: EstadoDq) {
  const li = b.closest('li')!;
  const h = b.dataset.huella!;
  const linea = est.archivo.find((l) => l.h === h);
  if (!linea) return;
  if (b.classList.contains('leida')) {
    // De vuelta a su sección, en su lugar (lo que no contaba en la barra, ahora cuenta)
    delete linea.leida;
    guardarArchivoDq(est.proyecto, est.archivo);
    if (est.contadas.has(h)) est.leidas--;
    else {
      est.contadas.add(h);
      est.total++;
    }
    b.classList.remove('leida');
    b.title = 'Tócala cuando la leas';
    b.querySelector('.sr-only')!.textContent = '';
    const lista = dlg.querySelector(`.dq-seccion[data-seccion="${linea.s}"] .dq-lista`)!;
    const orden = pendientesDq(est, linea.s).map((l) => l.h);
    const despues = [...lista.querySelectorAll<HTMLElement>('.dq-item')].find((x) => orden.indexOf(x.dataset.huella!) > orden.indexOf(h));
    lista.insertBefore(li, despues?.closest('li') ?? null);
    est.mostradas = Math.max(LEIDAS_A_LA_VISTA, est.mostradas - 1);
    return pintarProgresoDq(dlg, est);
  }
  if (b.classList.contains('tachando')) return;
  // El estado cambia de una vez (nada se pierde si se cierra a mitad del efecto); el efecto va detrás
  linea.leida = new Date().toISOString();
  guardarArchivoDq(est.proyecto, est.archivo);
  est.leidas++;
  const { total } = est;
  const hito = est.leidas === total || est.leidas === Math.ceil(total / 2);
  const mover = () => {
    li.removeAttribute('style');
    li.classList.remove('cerrando');
    b.classList.remove('tachando', 'rompiendo');
    b.classList.add('leida');
    b.title = 'Volver a ponerla entre lo que falta';
    b.querySelector('.sr-only')!.textContent = ' (leída)';
    const texto = b.querySelector<HTMLElement>('.dq-texto')!;
    if (texto.dataset.original) texto.textContent = texto.dataset.original;
    // Lo recién leído va primero en «Ya leído»
    dlg.querySelector('.dq-leidas .dq-lista')!.prepend(li);
    est.mostradas++;
    pintarProgresoDq(dlg, est, true);
  };
  if (quieto()) return mover();
  b.classList.add('tachando');
  chispasDq(b, hito || Math.random() < 0.16);
  pintarProgresoDq(dlg, est);
  // Se tacha (≈400 ms), se rompe en pedazos que caen (≈1,4 s) y la fila se cierra (≈200 ms): un segundo más que antes,
  // para que se aprecie (pedido del titular)
  setTimeout(() => {
    const texto = b.querySelector<HTMLElement>('.dq-texto')!;
    const palabras = (texto.textContent ?? '').split(/\s+/).filter(Boolean);
    texto.dataset.original = texto.textContent ?? '';
    const paso = Math.min(45, 600 / Math.max(palabras.length, 1));
    texto.innerHTML = palabras.map((w, i) => `<span class="dq-pieza" style="--dx:${Math.round(Math.random() * 40 - 12)}px;--dy:${Math.round(24 + Math.random() * 26)}px;--rot:${Math.round(Math.random() * 70 - 35)}deg;--retraso:${Math.round(i * paso)}ms">${esc(w)}</span>`).join(' ');
    b.classList.add('rompiendo');
  }, 400);
  setTimeout(() => {
    li.style.height = `${li.offsetHeight}px`;
    void li.offsetHeight;
    li.classList.add('cerrando');
    li.style.height = '0px';
  }, 1650);
  setTimeout(mover, 1870);
}

/** La tarjeta de una misión (en Hoy), para los botones «Ir a lo que sigue». */
const tarjetaDe = (m: Mision): Destino => ({ vista: 'misiones', ancla: `mision-${m.id}`, etiqueta: m.titulo });

const claveCelebradas = (p: Persona) => `estudio.director.celebradas.${d.activo}.${p}`;

/**
 * Cuando el director aprueba una misión tuya, el Studio lo celebra una vez: lo que dijo el director, la XP, el nivel,
 * los logros nuevos y un botón a lo que sigue (directo al documento, si lo que sigue es leer).
 */
async function celebrarSiToca() {
  if (!d || document.querySelector('dialog[open]')) return;
  const yo = d.identidad.rol ?? TITULAR;
  let celebradas: string[] = [];
  try { celebradas = JSON.parse(localStorage.getItem(claveCelebradas(yo)) ?? '[]'); } catch { /* sin celebrar aún */ }
  const c = celebracion(ctx(), yo, celebradas);
  if (!c) return;
  localStorage.setItem(claveCelebradas(yo), JSON.stringify([...celebradas, ...c.misiones.map((m) => m.id)]));
  const mia = misionesAbiertas(d.plan, d.estado, yo)[0];
  const sigue = mia ? tarjetaDe(mia) : null;
  const n = nivelDe(xpDe(d.plan, d.estado, yo));
  const dijo = c.misiones.length === 1 ? d.plan.revisiones[c.misiones[0].id]?.comentario : '';
  const dlg = document.createElement('dialog');
  dlg.className = 'dialogo-director celebracion';
  dlg.innerHTML = `<form method="dialog">
    <div class="confeti" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
    <span class="etiqueta">${c.misiones.length === 1 ? 'Misión aprobada' : `${c.misiones.length} misiones aprobadas`} · +${c.xp} XP</span>
    <h2>${esc(c.frase)}</h2>
    <ul class="cumplidas">${c.misiones.map((m) => `<li>${icono('check')}<span>${esc(m.titulo)}</span><b>+${m.xp} XP</b></li>`).join('')}</ul>
    ${dijo ? `<p class="como"><b>El director:</b> ${esc(dijo)}</p>` : ''}
    <div class="nivel-p"><div class="fila-nivel"><b>Nivel ${n.nivel}</b><small>${n.paraSubir - n.enNivel} XP para el nivel ${n.nivel + 1}</small></div><div class="barra-xp"><div style="width:${n.enNivel}%"></div></div></div>
    ${c.subeA ? `<p class="sube-nivel">${icono('estrella')} ¡Subiste al nivel ${c.subeA}!</p>` : ''}
    ${c.logros.length ? `<p class="logros-nuevos">${c.logros.length === 1 ? 'Logro nuevo' : 'Logros nuevos'}: ${c.logros.map((l) => `<span class="logro ganado" title="${esc(l.como)}">${icono('estrella')}<span>${esc(l.nombre)}</span></span>`).join(' ')}</p>` : ''}
    ${mia ? `<div class="mision-a"><span class="etiqueta">Lo que sigue</span><b>${esc(mia.titulo)}</b></div>` : ''}
    <div class="botones"><button type="button" data-cerrar>Cerrar</button>${sigue ? '<button type="button" class="primario" data-seguir title="Abre la tarjeta de tu misión de ahora: ahí está el paso siguiente">Ir a lo que sigue →</button>' : ''}</div>
  </form>`;
  document.body.append(dlg);
  await new Promise<void>((ok) => {
    let listo = false;
    const terminar = async (destino?: Destino | null) => {
      if (listo) return;
      listo = true;
      if (dlg.open) dlg.close();
      dlg.remove();
      if (destino) await ir(destino);
      ok();
    };
    dlg.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (b?.dataset.seguir !== undefined) void terminar(sigue);
      else if (b?.dataset.cerrar !== undefined) void terminar();
    });
    dlg.addEventListener('close', () => void terminar());
    dlg.showModal();
  });
}

/**
 * Al marcar el último paso, la misión se entrega sola (no hace falta un «Lo hice» aparte) y el Studio lo celebra: la
 * misión pasa a esperar al director y la siguiente queda a la vista, con su botón.
 */
async function completarSiToca(id: string, guardado: Promise<boolean>) {
  const m = d.plan.misiones.find((x) => x.id === id);
  if (!m || !m.pasos.length || !m.pasos.every((_, k) => pasosHechos(id).includes(k))) return false;
  if (!['pendiente', 'en_curso', 'rehacer'].includes(estadoMision(m, d.plan, d.estado))) return false;
  if (!(await guardado) || !(await accion({ tipo: 'entregar', mision: m.id }, ''))) return false;
  // Entregada, la revisión se pide sola: sin el clic aparte en «Pedir revisión»
  const pedida = !d.revision || d.revision.hecha ? await pedirLaRevision(true, true) : true;
  const mia = misionesAbiertas(d.plan, d.estado, d.identidad.rol ?? TITULAR)[0];
  const sigue = mia ? tarjetaDe(mia) : null;
  const dlg = document.createElement('dialog');
  dlg.className = 'dialogo-director celebracion';
  dlg.innerHTML = `<form method="dialog">
    ${quieto() ? '' : `<div class="confeti" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>`}
    <span class="etiqueta">Misión completada</span>
    <h2>¡Bien hecho!</h2>
    <ul class="cumplidas"><li>${icono('estrella')}<span>${esc(m.titulo)}</span><b>+${m.xp} XP</b></li></ul>
    <p class="como">Quedó entregada${pedida ? ' y la revisión quedó pedida' : ''}: el director la revisa${pedida ? '' : ' en su próxima revisión'} y, al aprobarla, sumas la XP. Si quieres contarle algo, «Comentar al director» en la misión.</p>
    ${mia ? `<div class="mision-a"><span class="etiqueta">Tu misión ahora</span><b>${esc(mia.titulo)}</b></div>` : ''}
    <div class="botones"><button type="button" data-cerrar>Cerrar</button>${sigue ? '<button type="button" class="primario" data-seguir>Ir a mi misión →</button>' : ''}</div>
  </form>`;
  document.body.append(dlg);
  dlg.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (b?.dataset.seguir === undefined && b?.dataset.cerrar === undefined) return;
    dlg.close();
    if (b.dataset.seguir !== undefined && sigue) void ir(sigue);
  });
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
  return true;
}

/** Un proyecto nuevo: su nombre, su repositorio y lo que se quiere lograr. Quien lo crea queda como titular. */
async function nuevoProyecto() {
  const r = await pedirProyectoNuevo();
  if (!r) return;
  try {
    if (r.modo === 'uno') {
      const res = await fetch('/__estudio/director/proyecto-nuevo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r.datos) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? `El servidor respondió ${res.status}`);
      await cargar(true);
      irA('misiones');
      return avisar(`«${r.datos.nombre}» quedó en el Studio, con su memoria en su repositorio. Ya le pedí la revisión al director: te devuelve ${r.datos.tipo === 'nuevo' ? 'el planteamiento' : 'el diagnóstico'} en unos minutos.`, true);
    }
    // Varios existentes (en líneas o del escaneo): el director los diagnostica en sus próximas revisiones
    const res = await fetch('/__estudio/director/proyectos-varios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proyectos: r.proyectos }) });
    const j: { creados?: { id: string; nombre: string }[]; errores?: string[]; error?: string } = await res.json();
    if (!res.ok) throw new Error(j.error ?? `El servidor respondió ${res.status}`);
    await cargar(true);
    irA('proyectos');
    const n = j.creados?.length ?? 0;
    avisar(`${n === 1 ? 'Un proyecto entregado' : `${n} proyectos entregados`} al director, cada uno con su memoria en su repositorio. Ya le pedí la revisión: los diagnostica de a tres por revisión.${j.errores?.length ? ` No se agregaron: ${j.errores.join(' ')}` : ''}`, !j.errores?.length);
  } catch (e) {
    avisar(esDeRed(e) ? SIN_SERVIDOR : (e as Error).message);
  }
}

/** Sin proyectos: la bienvenida, con el botón para crear el primero. */
function pintarBienvenida(x: SinProyectos) {
  document.body.classList.add('sin-proyectos');
  pintarSelectorProyecto([], null);
  $('sincronizacion').textContent = '✓ Estudio local';
  const q = $('quien');
  q.textContent = x.identidad.nombre ? `${x.identidad.nombre} · sin proyecto` : 'Sin identidad de git';
  q.classList.toggle('sin', !x.identidad.nombre);
  $('mando').innerHTML = '';
  $('navegacion').innerHTML = '';
  $('vista').innerHTML = vista === 'stl' ? vistaStl(false) : `<section class="bienvenida panel-d">
    <span class="etiqueta">STL Studio · con director asistente</span>
    <h1>Entrégale tu primer proyecto al director</h1>
    <p>El director asistente se pone entre tú y el modelo de IA. Desde aquí diriges todos tus proyectos: tú comentas, entregas y decides; él diagnostica, traza la ruta por fases y te da <b>una misión a la vez</b>. Cada proyecto guarda su buzón, su ruta y su historial. <button type="button" class="enlace" data-vista="stl">Qué es la metodología STL →</button></p>
    <ol class="ritmo">
      <li><b>Un proyecto existente:</b> le das la carpeta de su repositorio. El director lo diagnostica, detecta lo que está en curso y hacia dónde va, y te propone metas.</li>
      <li><b>Un proyecto nuevo:</b> le cuentas qué es, qué quieres lograr y cuándo estará completo. El director te devuelve un planteamiento y metas posibles.</li>
      <li>Después, oprime <b>«Pedir revisión»</b>: el Studio llama al director. Todo pasa aquí, sin otra conversación.</li>
    </ol>
    <h3>Este computador</h3>
    <ul class="salud" id="salud"><li class="como">Comprobando…</li></ul>
    ${x.identidad.nombre && x.identidad.correo ? '<p><button type="button" class="primario grande" data-nuevo-proyecto>＋ Entregar el primer proyecto</button></p>' : `<p class="aviso remoto">${esc(x.identidad.problema ?? 'Configura tu identidad de git (user.name y user.email) en esta carpeta.')}</p>`}
  </section>`;
  void pintarSalud();
}

/** Lo que necesita este computador para usar el Studio (lo mismo que `npm run iniciar`). */
async function pintarSalud() {
  const el = document.getElementById('salud');
  if (!el) return;
  try {
    const lista: { nombre: string; ok: boolean; opcional?: boolean; detalle: string; arreglo?: string }[] = await fetch('/__estudio/director/salud').then((r) => r.json());
    el.innerHTML = lista
      .map((c) => `<li class="${c.ok ? 'ok' : c.opcional ? 'opcional' : 'falta'}"><span class="icono-s">${c.ok ? '✓' : c.opcional ? '○' : '✗'}</span><div><b>${esc(c.nombre)}</b>${c.opcional ? ' <small>(opcional)</small>' : ''}<small>${esc(c.detalle)}${!c.ok && c.arreglo ? ` Arreglo: <code>${esc(c.arreglo)}</code>` : ''}</small></div></li>`)
      .join('');
  } catch {
    el.innerHTML = '<li class="como">No se pudo comprobar el equipo.</li>';
  }
}

function vistaProyectos() {
  return `<p class="intro">Todos los proyectos de este Estudio. Cada uno guarda su buzón, su ruta, sus documentos y su historial aparte. El que está <b>activo</b> es el que ves y el único que dirige el director: un proyecto a la vez. Al entrar a otro, el director te dice dónde quedaron. La alerta ⚠, si aparece, es una fecha límite o un riesgo activo.</p>
    <div class="lista-proyectos">${d.proyectos
      .map((p) => `<article class="tarjeta-proyecto${p.id === d.activo ? ' activo' : ''}">
        <header><b>${esc(p.nombre)}</b>${p.id === d.activo ? '<span class="chip foco">Activo</span>' : ''}</header>
        <p class="como">${p.tipo === 'nuevo' ? 'Nuevo' : 'Existente'} · ${esc(NOMBRE_ETAPA[p.etapa] ?? p.etapa)}${p.etapa === 'en_marcha' && p.fase ? ` · fase «${esc(p.fase)}»` : ''}</p>
        ${p.alerta ? `<p class="alerta-p">⚠ ${esc(p.alerta)}</p>` : ''}
        <p>${p.objetivo ? `<b>Meta:</b> ${esc(p.objetivo)}` : '<span class="como">Sin meta fijada todavía.</span>'}</p>
        <ul class="cifras-p">
          <li><b>${p.porRevisar}</b> esperando al director</li>
          <li><b>${p.misionesAbiertas}</b> misiones abiertas</li>
          <li>${p.revisado ? `Última revisión: ${momento(p.revisado)}` : 'Sin revisiones todavía'}</li>
        </ul>
        <div class="acciones-p">${p.id === d.activo ? botonIr({ vista: 'misiones', etiqueta: 'Ir a sus misiones' }) : `<button type="button" class="primario" data-activar="${esc(p.id)}">Activar</button>`}</div>
      </article>`)
      .join('')}
      <article class="tarjeta-proyecto nueva"><button type="button" data-nuevo-proyecto>＋ Entregar proyectos</button><p class="como">Existentes (uno o varios), uno nuevo, o los que encuentre al escanear el equipo. El director los diagnostica en sus próximas revisiones.</p></article>
    </div>`;
}

function kpi(valor: string, nombre: string, extra: string, clase: string, ir: Vista) {
  return `<button type="button" class="kpi ${clase}" data-ir="${ir}"><b>${valor}</b><span>${nombre}</span><small>${extra}</small></button>`;
}

/** Las cifras de cada sección: para la barra lateral, la cabecera y el tablero de la fase. */
function cifras() {
  const f = faseActual(d.plan, d.estado);
  const persona: Persona = personaVista() ?? d.identidad.rol ?? TITULAR;
  return {
    f,
    av: avanceFase(f, ctx()),
    pend: pendientesDelDirector(d.plan, d.estado),
    misiones: d.plan.misiones.filter((m) => seVe(m.para) && ['pendiente', 'en_curso', 'rehacer'].includes(estadoMision(m, d.plan, d.estado))).length,
    porDecidir: d.plan.propuestas.filter((p) => faseAbierta(p.fase) && !d.estado.propuestas[p.id]).length,
    porLeer: documentosEnOrden(d.plan, d.estado, persona).filter((x) => x.estado !== 'revisado').length,
    buzon: pendientesDelDirector(d.plan, d.estado).notas.filter((n) => !esPregunta(n)).length,
    preguntas: d.estado.notas.filter((n) => esPregunta(n) && seVe(n.de) && !d.plan.respuestas[n.id]).length,
  };
}

/** La cabecera del proyecto, en dos líneas: en qué fase va, cuánto le falta para cruzar su puerta y contra qué objetivo se mide. */
function pintarMando() {
  const { f, av } = cifras();
  const objetivo = d.proyecto.objetivo;
  const arrancando = d.arranque !== 'en_marcha';
  $('mando').innerHTML = `
    <div class="cabeza-fila">
      <div class="donde">
        <span class="sobretitulo">${esc(d.proyecto.nombre || d.activo)} <span class="aqui">› ${esc(vista === 'diagnostico' && esNuevo() ? 'Planteamiento' : NOMBRE_VISTA[vista])}</span> · ${arrancando ? 'el arranque' : `fase ${numeroFase(f)} de ${ultima()}`}</span>
        <h1>${esc(f.nombre)} <small>${esc(corto(f.etapa))}</small></h1>
      </div>
      <div class="acciones-cabeza">${botonRevision()}${((nv) => `<button type="button" class="boton-suave${nv.sinLeer ? ' por-leer' : ''}${nv.nuevo ? ' hay-novedades' : ''}" data-donde-quedamos title="${nv.sinLeer ? `${nv.nuevo ? 'El director dejó algo nuevo. ' : ''}${nv.sinLeer} ${nv.sinLeer === 1 ? 'línea' : 'líneas'} por leer: lo que dijo el director, lo que avanzamos y en qué quedamos` : 'Lo que dijo el director, lo que avanzamos y en qué quedamos: al día'}">${icono('reloj')} ¿Dónde quedamos?${nv.sinLeer ? `<span class="cifra">${nv.sinLeer}</span>` : ''}</button>`)(novedadesDq())}${botonEnfoque()}${botonTema()}</div>
    </div>
    <div class="cabeza-fila segunda">
      <button type="button" class="avance-puerta" data-ir="ruta" title="Ver la fase y sus criterios">
        <span class="barra-medida"><span style="width:${(av.avance * 100).toFixed(1)}%"></span></span>
        <span>${av.cumplidos} de ${av.total} criterios para cruzar «${esc(f.puerta.nombre)}»</span>
      </button>
      ${objetivo ? `<span class="objetivo-cabeza" title="${esc(`${objetivo.texto} · Éxito: ${objetivo.exito}`)}"><b>Meta:</b> ${esc(objetivo.texto)}</span>` : '<span class="objetivo-cabeza sin">Sin meta fijada todavía</span>'}

    </div>`;
  $('titulo-movil').textContent = `${d.proyecto.nombre || d.activo} › ${vista === 'diagnostico' && esNuevo() ? 'Planteamiento' : NOMBRE_VISTA[vista]}`;
}

/**
 * «Pedir revisión»: deja una marca en este computador. Si el Studio tiene con qué (Claude Code con su sesión iniciada),
 * lanza al director en ese momento; si no, la toma la sesión del director en su ciclo (/loop 5m /vigila). Mientras tanto
 * dice en qué va: pedida (se puede cancelar), el director revisando, o cuándo fue la última.
 */
/** Cada cuánto mira la sesión del director (/loop 5m /vigila); sin una vuelta en más de dos ciclos, nadie está mirando. */
const VIGILIA_MIN = 5;
const vigilando = () => !!d.vigilia && Date.now() - Date.parse(d.vigilia) < (VIGILIA_MIN * 2 + 2) * 60_000;
const hora = (iso: string) => new Date(iso).toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' });
/** El Studio lanza solo al director: no hace falta ninguna sesión abierta mirando. */
const automatica = () => !!d.revisor?.agente && !d.revisor.problema;
/** En qué va la revisión pedida, en una frase (para la cabecera, el atajo y lo que pasa en segundo plano). */
function estadoRevision(): { estado: 'ninguna' | 'pedida' | 'en_curso' | 'sin_vigilia'; texto: string } {
  const r = d.revision;
  if (r && !r.hecha && (r.enCurso || r.lanzada)) return { estado: 'en_curso', texto: 'El director está revisando' };
  if (r && !r.hecha && r.error && !vigilando())
    return { estado: 'sin_vigilia', texto: `${r.error} Pídela de nuevo, o en la sesión del director escribe «revisa estudio».` };
  if (r && !r.hecha && automatica()) return { estado: 'pedida', texto: `Revisión pedida a las ${hora(r.pedida)}: el Studio está llamando al director.` };
  if (r && !r.hecha && !vigilando())
    return { estado: 'sin_vigilia', texto: `Revisión pedida a las ${hora(r.pedida)}, pero nadie la está tomando. ${d.revisor?.problema ?? 'El Studio no encontró Claude Code en este computador para llamar al director.'} Mientras tanto, en la sesión del director, escribe /loop 5m /vigila, o «revisa estudio».` };
  if (r && !r.hecha) return { estado: 'pedida', texto: `Revisión pedida a las ${hora(r.pedida)}. El director mira cada ${VIGILIA_MIN} minutos (su última vuelta: ${hora(d.vigilia!)}) y la toma en la siguiente; hasta que empiece, la puedes cancelar.` };
  return { estado: 'ninguna', texto: '' };
}

function botonRevision() {
  const r = d.revision;
  const e = estadoRevision();
  if (e.estado === 'en_curso') return `<span class="estado-revision en-curso" role="status">El director está revisando<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></span>`;
  if (e.estado === 'sin_vigilia') return `<span class="estado-revision sin-vigilia" role="alert" title="${esc(e.texto)}">⚠ Revisión pedida, sin tomar<button type="button" class="enlace" data-revision="explicar">¿Por qué?</button>${r?.error ? '<button type="button" class="enlace" data-revision="pedir">Pedirla de nuevo</button>' : ''}<button type="button" class="enlace" data-revision="cancelar">Cancelar</button></span>`;
  if (e.estado === 'pedida') return `<span class="estado-revision pedida" role="status" title="${esc(e.texto)}">Revisión pedida · ${hora(r!.pedida)}<button type="button" class="enlace" data-revision="cancelar">Cancelar</button></span>`;
  const pendientes = cifras().buzon + cifras().preguntas;
  return `<button type="button" class="boton-suave pedir-revision" data-revision="pedir" title="El director revisa todo lo pendiente (notas, preguntas, entregas). ${automatica() ? 'El Studio lo llama en cuanto la pides.' : vigilando() ? `Su sesión mira cada ${VIGILIA_MIN} minutos.` : 'Para que la tome sola, su sesión debe tener corriendo /loop 5m /vigila.'}${r?.hecha ? ` Última revisión: ${hora(r.hecha)}.` : ''}">${icono('revisar')} Pedir revisión${pendientes ? ` <span class="cifra">${pendientes}</span>` : ''}</button>`;
}

/**
 * «No lo entiendo, explícamelo mejor»: deja la nota de ese paso en el Buzón, sin escribir nada, y el Studio llama al
 * director solo para eso (una ida y vuelta corta, sin esperar el resto de la revisión). Sin quién lo llame, el pedido
 * espera en el Buzón y se pide la revisión.
 */
async function pedirAclaracion(mision: string, i: number) {
  if (esperaAlDirector()) return;
  // El aviso de espera, desde el clic: guardar la nota y llamar al director toma unos segundos
  aclarandoAqui = { mision, paso: i };
  pintar();
  const r = await fetch('/__estudio/director/aclarar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mision, paso: i }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
  aclarandoAqui = null;
  if (r instanceof Error) return void (pintar(), avisar('No se pudo hablar con el servidor del Studio.'));
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return void (pintar(), avisar(j.error ?? 'No se pudo.'));
  d.estado = j.estado;
  d.aclaracion = j.aclaracion ?? null;
  if (j.revision !== undefined) d.revision = j.revision;
  pintar();
  avisar(j.aclaracion ? 'El director lo revisa y te lo explica con más detalle aquí mismo, en un momento.' : 'El Studio no puede llamar al director ahora: tu pedido quedó en el Buzón y la revisión quedó pedida.', true);
  pintarSegundoPlano();
  vigilarTranscripciones([]);
}

/** `callada`: sin el aviso de que quedó pedida (lo dice quien la pidió, como la misión completada). ¿Quedó pedida? */
async function pedirLaRevision(pedir: boolean, callada = false): Promise<boolean> {
  const r = await fetch('/__estudio/director/revision', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pedir }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
  if (r instanceof Error || !r.ok) {
    avisar(r instanceof Error ? 'No se pudo hablar con el servidor del Studio.' : (await r.json().catch(() => ({}))).error ?? 'No se pudo.');
    return false;
  }
  // Solo se promete lo que es cierto: si la sesión del director no está mirando, se dice
  if (!callada || !(automatica() || vigilando())) avisar(!pedir ? 'Revisión cancelada.'
    : automatica() ? 'Revisión pedida: el Studio llama al director ahora mismo. Aquí verás cuando empiece y cuando termine.'
    : vigilando() ? `Revisión pedida: la sesión del director mira cada ${VIGILIA_MIN} minutos y la toma en su próxima vuelta. Aquí verás cuando empiece y cuando termine.`
    : 'Revisión pedida, pero nadie la está tomando: en la sesión del director, escribe /loop 5m /vigila (o «revisa estudio»).', pedir ? automatica() || vigilando() : true);
  await cargar();
  return true;
}

/** La barra lateral: las secciones en grupos, cada una con su cifra. */
function pintarNavegacion() {
  const c = cifras();
  const insignia: Partial<Record<Vista, { n: number | string; accion?: boolean; titulo: string }>> = {};
  if (c.buzon) insignia.buzon = { n: c.buzon, titulo: 'esperando respuesta del director' };
  // el atajo de preguntas, junto a la cara del director, también dice cuántas esperan respuesta
  document.querySelector('.atajo[data-preguntas]')?.setAttribute('data-cifra', c.preguntas ? String(c.preguntas) : '');
  if (c.preguntas) insignia.preguntas = { n: c.preguntas, titulo: c.preguntas === 1 ? 'pregunta esperando respuesta' : 'preguntas esperando respuesta' };
  if (c.porLeer) insignia.documentos = { n: c.porLeer, accion: true, titulo: 'por leer' };
  if (c.porDecidir) insignia.propuestas = { n: c.porDecidir, accion: titular(), titulo: 'por decidir' };
  if (['conectar', 'contar', 'objetivo'].includes(d.arranque)) insignia.proyecto = { n: '!', accion: true, titulo: 'falta algo tuyo aquí' };
  const boton = (v: Vista) => {
    const i = insignia[v];
    const nombre = v === 'diagnostico' && esNuevo() ? 'Planteamiento' : NOMBRE_VISTA[v];
    return `<button type="button" class="item-nav${vista === v ? ' sel' : ''}" data-vista="${v}"${vista === v ? ' aria-current="page"' : ''}>${icono(ICONO_VISTA[v])}<span>${nombre}</span>${i ? `<span class="cifra${i.accion ? ' accion' : ''}" title="${esc(`${i.n} ${i.titulo}`)}">${i.n}</span>` : ''}</button>`;
  };
  $('navegacion').innerHTML = gruposNav()
    .map((g) => {
      if (!g.plegable) return `<div class="grupo-nav">${g.titulo ? `<p class="titulo-grupo">${g.titulo}</p>` : ''}${g.vistas.map(boton).join('')}</div>`;
      // Plegado, salvo que lo abras (se recuerda) o estés en una de sus secciones; si algo de adentro pide algo, se marca
      const abierto = g.vistas.includes(vista as Vista) || localStorage.getItem(CLAVE_SEGUIMIENTO) === '1';
      const pide = g.vistas.some((v) => insignia[v]?.accion);
      return `<details class="grupo-nav plegable"${abierto ? ' open' : ''}><summary class="titulo-grupo">${g.titulo}${pide ? '<span class="punto-pide" title="Algo aquí espera algo tuyo"></span>' : ''}</summary>${g.vistas.map(boton).join('')}</details>`;
    })
    .join('');
}

/** El arranque, paso a paso: del repositorio a la ruta. Va en «Hoy» mientras el proyecto arranca. */
function arranqueHTML() {
  if (d.arranque === 'en_marcha') return '';
  const nuevo = esNuevo();
  const orden: EtapaArranque[] = [nuevo ? 'contar' : 'conectar', 'diagnostico', 'objetivo', 'ruta'];
  const i = orden.indexOf(d.arranque);
  const conectado = !!d.repositorio.info || !!d.plan.diagnostico.fecha;
  const hecho = !!d.plan.diagnostico.fecha;
  const pasos = [
    nuevo
      ? { n: 'Cuenta el proyecto', hecho: d.arranque !== 'contar', texto: 'Qué es, qué quieres lograr y cuándo estará completo, en Proyecto.', boton: botonIr({ vista: 'proyecto', ancla: 'p-contexto', etiqueta: 'Ir a Proyecto' }) }
      : { n: 'Entrega el repositorio', hecho: conectado, texto: 'Su carpeta, en Proyecto. Lo demás lo detecta el director.', boton: botonIr({ vista: 'proyecto', ancla: 'p-repositorio', etiqueta: 'Ir a Proyecto' }) },
    { n: nuevo ? 'El planteamiento' : 'El diagnóstico', hecho, texto: nuevo ? 'El director devuelve lo que entendió, el alcance, los riesgos y metas posibles. Pídelo con «Pedir revisión».' : 'El director lee el repositorio, detecta lo que está en curso y propone metas. Pídelo con «Pedir revisión».', boton: hecho ? botonIr({ vista: 'diagnostico', etiqueta: 'Leerlo' }) : '' },
    { n: 'Fija tu meta', hecho: !!d.proyecto.objetivo, texto: 'Elige uno de los que propone el director, o escribe el tuyo: qué se logra y cómo se sabe.', boton: hecho ? botonIr({ vista: 'proyecto', ancla: 'p-objetivo', etiqueta: 'Ir a la meta' }) : '' },
    { n: 'La ruta', hecho: d.plan.fases.length > 1, texto: 'De nuevo, «Pedir revisión»: trae las fases y tu primera misión.', boton: '' },
  ];
  return `<section class="arranque" aria-label="El arranque del proyecto"><h3>El arranque · ${nuevo ? 'de la idea a la ruta' : 'del repositorio a la ruta'}</h3>
    <ol class="pasos-arranque">${pasos
      .map((p, k) => `<li class="${p.hecho ? 'hecho' : k === i ? 'actual' : ''}"${k === i ? ' aria-current="step"' : ''}><span class="num-a">${p.hecho ? '✓' : k + 1}</span><div><b>${p.n}</b><small>${p.texto}</small>${k === i ? p.boton : ''}</div></li>`)
      .join('')}</ol></section>`;
}

/** La ruta como un mapa: las fases con su avance; las futuras, bajo niebla. Va arriba de «La ruta». */
function rutaHTML() {
  const n = Math.max(1, d.plan.fases.length) + (d.plan.fases.length <= 1 ? 1 : 0);
  return `<ol class="ruta" style="--fases:${n}" aria-label="La ruta del proyecto, fase por fase">${d.plan.fases
    .map((f, i) => {
      const s = situacion(d.plan, d.estado, f.id);
      const av = avanceFase(f, ctx()).avance;
      const vistaAhora = (faseVista ?? faseActual(d.plan, d.estado).id) === f.id;
      return `<li class="${s}${vistaAhora ? ' vista' : ''}">
        <button type="button" data-fase="${esc(f.id)}" title="${esc(f.meta)}"${vistaAhora ? ' aria-current="true"' : ''}>
          <span class="hito" data-n="${i}" style="--av:${s === 'superada' ? 1 : av.toFixed(3)}"></span>
          <span class="nombre">${esc(f.nombre)}</span>
          <span class="etapa">${esc(corto(f.etapa))}</span>
          <span class="estado-fase">${NOMBRE_SITUACION[s]}</span>
        </button></li>`;
    })
    .join('')}${d.plan.fases.length <= 1 ? '<li class="futura por-trazar"><button type="button" disabled><span class="hito" data-n="…"></span><span class="nombre">La ruta</span><span class="etapa">la traza el director</span><span class="estado-fase">Con la meta fijada</span></button></li>' : ''}</ol>`;
}

/** El tablero de la fase en curso: las cifras que importan, cada una lleva a su sección. */
function tableroFase() {
  const { f, av, pend, misiones, porDecidir } = cifras();
  const foco = d.senales.esfuerzo ? repartoPorNivel(f, d.senales.esfuerzo.commits).foco : null;
  const personas = d.estado.validaciones.filter((v) => v.fase === f.id).reduce((s, v) => s + v.personas, 0);
  const vistaP = personaVista();
  return `<div class="marcador">
    ${kpi(String(misiones), vistaP ? (vistaP === d.identidad.rol ? 'misiones tuyas por hacer' : `misiones de ${esc(nombrePersona(vistaP))} por hacer`) : 'misiones del equipo por hacer', 'una a la vez', misiones ? 'medio' : 'bien', 'misiones')}
    ${kpi(`${av.cumplidos} de ${av.total}`, 'criterios al 100 %', `para cruzar «${esc(f.puerta.nombre)}»`, av.total && av.cumplidos === av.total ? 'bien' : '', 'ruta')}
    ${kpi(String(pend.entregas.length + pend.notas.length), 'esperando al director', 'entregas y notas sin respuesta', '', 'buzon')}
    ${kpi(String(porDecidir), 'propuestas por decidir', `las decide ${esc(nombreTitular())}`, porDecidir ? 'medio' : 'bien', 'propuestas')}
    ${kpi(foco === null ? '—' : pct(foco), 'del esfuerzo, en foco', `nota de foco: ${foco === null ? '—' : notaFoco(foco)} · 7 días`, foco === null ? '' : foco >= 60 ? 'bien' : foco >= 40 ? 'medio' : 'mal', 'esfuerzo')}
    ${kpi(String(personas), 'personas validaron', 'en esta fase', personas >= 5 ? 'bien' : personas ? 'medio' : '', 'validaciones')}
  </div>`;
}

// ───────────────────────────────────────────── misiones

/**
 * Una nota de voz: lo que se dijo. Ya transcrita, no hace falta volver a escucharla: el reproductor solo aparece
 * mientras no hay texto (o si el audio no tenía voz). Mientras el Studio la transcribe, lo dice. Lo que se entendió se
 * corrige con el botón «Corregir» de la nota (o de la entrega), no aquí.
 */
function audioYTexto(audio: string | undefined) {
  if (!audio) return '';
  const t = d.transcripciones[audio];
  const reproductor = t ? '' : `<audio controls preload="none" src="/__estudio/director/archivo?ruta=${encodeURIComponent(audio)}"></audio>`;
  const texto = t === '' ? '<p class="transcripcion pendiente">El audio no tiene voz que se pueda transcribir.</p>'
    : t
    ? `<p class="transcripcion">${icono('microfono', 'icono icono-t')}<span>«${esc(t)}»</span></p>`
    : d.sinTranscribir?.includes(audio) ? '<p class="transcripcion pendiente">No se pudo transcribir en este computador: el director la transcribe al revisar.</p>'
    : '<p class="transcripcion procesando" role="status">Transcribiendo<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></p>';
  return `<div class="nota-voz">${texto}${reproductor}</div>`;
}

/** Lo adjuntado a una nota: las imágenes en miniatura (se abren grandes en otra pestaña) y el resto con su nombre, para descargarlo. */
function adjuntosDeNota(n: Nota) {
  if (!n.adjuntos?.length) return '';
  const url = (a: { ruta: string; nombre: string }) => `/__estudio/director/archivo?ruta=${encodeURIComponent(a.ruta)}&nombre=${encodeURIComponent(a.nombre)}`;
  return `<ul class="lista-adjuntos">${n.adjuntos
    .map((a) => `<li class="adjunto${esImagen(a.ruta) ? ' imagen' : ''}" title="${esc(a.nombre)}">${esImagen(a.ruta)
      ? `<a href="${url(a)}" target="_blank" rel="noopener"><img src="${url(a)}" alt="${esc(a.nombre)}" loading="lazy"></a>`
      : `<a class="nombre-adjunto" href="${url(a)}" download="${esc(a.nombre)}">${icono('clip')}${esc(a.nombre)}</a>`}</li>`)
    .join('')}</ul>`;
}

/**
 * Los pasos de una misión, uno a la vez: solo se ve el paso que sigue (el primero sin marcar, en el orden del director),
 * y el siguiente aparece al marcarlo. Mostrar la lista entera daría la cuenta de lo que falta y dejaría saltarse el
 * orden, que es justo lo que el método evita. Lo ya marcado baja a «Completado», plegado; cada paso conserva su número.
 */
function listaPasos(m: Mision) {
  const hechos = new Set(pasosHechos(m.id));
  const sigue = m.pasos.findIndex((_, i) => !hechos.has(i));
  if (!m.pasos.length) return '';
  return `${sigue >= 0 ? listaDePasos(m, true, [sigue]) : '<p class="pasos-listos">Hiciste todos los pasos: entrégala al director y él la revisa.</p>'}
    ${hechos.size ? `<details class="pasos-completados"><summary>Completado <span class="cifra">${hechos.size}</span></summary>${listaDePasos(m, true, [...hechos].sort((a, b) => a - b))}</details>` : ''}`;
}

function listaDePasos(m: Mision, conCasillas: boolean, indices: number[]) {
  const hechos = new Set(pasosHechos(m.id));
  return `<ol class="pasos">${indices.map((i) => [m.pasos[i], i] as const).map(([p, i]) => `<li value="${i + 1}" class="${hechos.has(i) ? 'hecho' : ''}">${conCasillas ? `<label class="casilla-paso" title="${hechos.has(i) ? 'Hecho: oprímela para desmarcarlo' : typeof p !== 'string' && p.hecho ? 'Se marca solo cuando el Studio vea que lo hiciste (o oprímela tú)' : 'Oprime la estrella cuando lo hagas'}"><input type="checkbox" class="sr-only" data-paso="${esc(m.id)}|${i}"${hechos.has(i) ? ' checked' : ''} aria-label="Paso ${i + 1} hecho" />${icono('estrella')}</label>` : ''}<span>${esc(typeof p === 'string' ? p : p.texto)}</span>${typeof p !== 'string' && p.ir ? botonIr(p.ir) : ''}${conCasillas ? `<button type="button" class="comentar-paso" data-comentar="mision|${esc(m.id)}|${seccionPaso(i)}" title="Comentar este paso al director (va al Buzón)">✉</button>` : ''}${typeof p !== 'string' && p.detalle?.length ? `<ol class="detalle-paso">${p.detalle.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}${typeof p !== 'string' && p.terminal ? ordenPaso(m, i, p.terminal) : ''}${typeof p !== 'string' && p.opciones?.length ? opcionesPaso(m, i, p.opciones, hechos.has(i)) : ''}${typeof p !== 'string' ? quienLoHace(m, i, p, hechos.has(i)) : ''}${conCasillas && !hechos.has(i) ? aclararPaso(m, i) : ''}</li>`).join('')}</ol>`;
}

/**
 * Un paso que pide elegir (sí o no, una de pocas): las opciones como botones, en el paso mismo. Un clic deja la
 * elección en el Buzón, firmada, y el paso se marca solo; para otra respuesta está el ✉ del paso.
 */
function opcionesPaso(m: Mision, i: number, opciones: string[], hecho: boolean): string {
  const elegida = eleccionDe(d.estado.notas, m.id, i, m.para)?.sobre.eleccion;
  if (elegida) return `<p class="eleccion-paso">${icono('check')} Elegiste: <b>${esc(elegida)}</b></p>`;
  if (hecho || d.identidad.rol !== m.para) return '';
  return `<div class="opciones-paso" role="group" aria-label="Elige una opción">${opciones.map((o, k) => `<button type="button" class="boton-opcion" data-elegir="${esc(m.id)}|${i}|${k}">${esc(o)}</button>`).join('')}</div>`;
}

/**
 * La orden de terminal de un paso: a la vista, con «Copiar» y, para quien tiene la misión, «Abrir la terminal con esta
 * orden», que abre una ventana nueva y la corre ahí (no hay que buscar la terminal ni dónde pegarla).
 */
function ordenPaso(m: Mision, i: number, orden: string): string {
  return `<div class="orden-paso"><code>${esc(orden)}</code><div class="acciones-orden">${d.identidad.rol === m.para ? `<button type="button" class="abrir-terminal" data-terminal="${esc(m.id)}|${i}" title="Abre una ventana de terminal nueva y corre esta orden ahí">Abrir la terminal con esta orden</button>` : ''}<button type="button" class="boton-suave" data-copiar-orden="${esc(orden)}" title="Copia la orden para pegarla en tu terminal">Copiar</button></div></div>`;
}

/**
 * Quién puede hacer el paso. Si el director puede hacerlo con tu permiso (`hazlo`), el botón «Hazlo tú»: explica qué
 * hará y, con tu segundo clic, se lo encarga (lo hace en su revisión siguiente). Si solo puedes tú (`soloTu`), lo dice,
 * con la razón, para que no lo esperes de él.
 */
function quienLoHace(m: Mision, i: number, p: Exclude<Paso, string>, hecho: boolean): string {
  if (p.soloTu) return `<p class="solo-tu">${icono('info')} <span><b>Esto lo haces tú:</b> ${esc(p.soloTu)}</span></p>`;
  if (!p.hazlo) return '';
  const encargo = encargoDe(d.estado.notas, m.id, i, m.para);
  if (encargo) {
    const respuesta = d.plan.respuestas?.[encargo.id];
    return respuesta ? `<p class="aclaracion-paso"><b>El director:</b> ${esc(respuesta.texto)}</p>` : `<p class="eleccion-paso">${icono('check')} Se lo encargaste al director: lo hace en su próxima revisión y te cuenta el resultado.</p>`;
  }
  if (hecho || d.identidad.rol !== m.para) return '';
  return `<button type="button" class="hazlo-paso" data-hazlo="${esc(m.id)}|${i}" title="El director puede hacer este paso por ti: te explica qué hará antes de encargárselo">Hazlo tú</button>`;
}

/** El paso que se acaba de pedir aclarar, mientras el servidor responde: el aviso de espera sale con el clic, no después. */
let aclarandoAqui: { mision: string; paso: number } | null = null;
/** ¿El director está aclarando ahora este paso (lo pidió «No lo entiendo»)? */
const aclarando = (mision: string, i: number) => (aclarandoAqui?.mision === mision && aclarandoAqui.paso === i)
  || (!!d.aclaracion && !d.aclaracion.hecha && !d.aclaracion.error && d.aclaracion.mision === mision && d.aclaracion.paso === i);

/**
 * «No lo entiendo, explícamelo mejor», en el paso de ahora: un clic y el director lo reescribe con más detalle, al
 * instante y sin el resto de la revisión. Debajo, lo que respondió la última vez; si se vuelve a pedir, va más a fondo.
 */
function aclararPaso(m: Mision, i: number): string {
  if (d.identidad.rol !== m.para) return '';
  const previas = aclaracionesDe(d.estado.notas, m.id, i);
  const ultima = previas.at(-1);
  const respuesta = ultima ? d.plan.respuestas?.[ultima.id] : undefined;
  const dijo = respuesta ? `<p class="aclaracion-paso"><b>El director:</b> ${esc(respuesta.texto)}</p>` : '';
  if (aclarando(m.id, i)) return `${dijo}<p class="aclarando-paso" role="status">El director lo está reescribiendo con más detalle<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></p>`;
  if (ultima && !respuesta) return '<p class="aclarando-paso" role="status">Le pediste que te lo explique mejor: lo responde aquí mismo en su próxima revisión.</p>';
  return `${dijo}<button type="button" class="aclarar-paso" data-aclarar="${esc(m.id)}|${i}" title="El director reescribe este paso con más detalle, al instante">${previas.length ? 'Aún no lo entiendo, detállalo más' : 'No lo entiendo, explícamelo mejor'}</button>`;
}

function tarjetaMision(m: Mision, compacta = false, numero = 0) {
  const e = estadoMision(m, d.plan, d.estado);
  const mia = d.identidad.rol === m.para;
  const rev = d.plan.revisiones[m.id];
  const ent = d.estado.entregas[m.id];
  if (compacta) {
    return `<article class="mision-c compacta ${e}" data-ancla="mision-${esc(m.id)}"><header><span class="icono-m ${e}">${ICONO_ESTADO[e]}</span><b>${esc(m.titulo)}</b><span class="xp">+${m.xp} XP</span></header>
      ${e === 'aprobada' && rev?.comentario ? `<p class="veredicto aprobada"><b>El director:</b> ${esc(rev.comentario)}</p>` : ''}</article>`;
  }
  if (e === 'entregada') {
    return `<article class="mision-c plegada entregada${mia ? ' mia' : ''}" data-ancla="mision-${esc(m.id)}">
      <header><span class="icono-m entregada">⏳</span><b>${esc(m.titulo)}</b><span class="xp">+${m.xp} XP</span></header>
      <p class="estado-texto">Entregada por ${esc(ent!.quien)} · ${momento(ent!.cuando)}. <b>Ya no tienes que hacer nada:</b> el director la revisa en su próxima revisión.</p>
      ${ent!.nota ? `<p class="nota-entrega">«${esc(ent!.nota)}»</p>` : ''}${audioYTexto(ent!.audio)}
      <div class="acciones-m">${ent!.audio && d.transcripciones[ent!.audio] && ent!.quien === d.identidad.nombre ? `<button type="button" data-corregir-transcripcion="${esc(ent!.audio)}" title="Si entendió mal tu audio, corrígelo: es lo que leerá el director">Corregir lo que se entendió</button>` : ''}${titular() || ent!.quien === d.identidad.nombre ? `<button type="button" data-deshacer-entrega="${esc(m.id)}">Retirar la entrega</button>` : ''}<button type="button" class="al-director" data-comentar="mision|${esc(m.id)}">✉ Comentar al director</button></div>
    </article>`;
  }
  const hechos = new Set(pasosHechos(m.id));
  const acciones: string[] = [];
  const todos = m.pasos.length > 0 && m.pasos.every((_, k) => hechos.has(k));
  // La misión se entrega sola al marcar su último paso; el botón queda solo si no tiene pasos o si esa entrega no se
  // pudo hacer (sin servidor, o el director revisando)
  if (['pendiente', 'en_curso', 'rehacer'].includes(e) && (todos || !m.pasos.length)) acciones.push(`<button type="button" class="primario${todos ? ' llamada' : ''}" data-entregar="${esc(m.id)}">Entregar al director</button>`);
  acciones.push(`<button type="button" class="al-director" data-comentar="mision|${esc(m.id)}">✉ Comentar al director</button>`);
  return `<article class="mision-c ${e}${mia ? ' mia' : ''}${numero === 1 ? ' sigue' : ''}" data-ancla="mision-${esc(m.id)}">
    ${numero === 1 ? '<span class="sigue-esta">→ Tu misión ahora</span>' : ''}
    <header>${numero > 1 ? `<span class="num-m">${numero}</span>` : ''}<b>${esc(m.titulo)}</b><span class="xp">+${m.xp} XP</span>${numero === 1 && e === 'pendiente' ? '' : `<span class="chip estado-m ${e}">${NOMBRE_ESTADO_MISION[e]}</span>`}</header>
    <p class="porque">${esc(m.porQue)}</p>
    ${listaPasos(m)}
    <p class="entrega"><b>Entrega:</b> ${esc(m.entrega)}</p>
    ${((sueltos) => (sueltos.length ? `<div class="docs-m">${sueltos.map((r) => botonIr({ doc: r, etiqueta: `Leer y comentar: ${tituloDoc(r)}` })).join('')}</div>` : ''))(
      // Solo los documentos que ningún paso lleva a leer: los demás ya tienen su botón en su paso
      (m.documentos ?? []).filter((r) => !m.pasos.some((p) => typeof p !== 'string' && p.ir?.doc === r)))}
    ${rev && (e === 'aprobada' || e === 'rehacer') ? `<div class="veredicto ${rev.veredicto}"><b>El director${rev.veredicto === 'aprobada' ? ' la aprobó' : ' pide rehacerla'}:</b> ${esc(rev.comentario)}</div>` : ''}
    ${ent ? `<div class="entregada-m"><span class="como">Entregada por ${esc(ent.quien)} · ${momento(ent.cuando)}</span>${ent.nota ? `<p>${esc(ent.nota)}</p>` : ''}${audioYTexto(ent.audio)}</div>` : ''}
    <div class="acciones-m">${acciones.join('')}</div>
  </article>`;
}

/** Una misión en cola: solo su título; los pasos se ven si se piden, pero la de arriba va primero. */
/** Los logros de una persona: los ganados, en dorado; los que faltan, apagados, con cómo se ganan. */
function insignias(p: Persona) {
  const logros = logrosDe(ctx(), p);
  const ganados = logros.filter((l) => l.ganado).length;
  return `<div class="logros-p" aria-label="Logros: ${ganados} de ${logros.length}"><span class="etiqueta">Logros · ${ganados} de ${logros.length}</span><ul>${logros
    .map((l) => `<li class="logro${l.ganado ? ' ganado' : ''}" title="${esc(`${l.nombre}: ${l.como}${l.ganado ? '' : ' (por ganar)'}`)}">${icono(l.ganado ? 'estrella' : 'candado')}<span>${esc(l.nombre)}</span></li>`)
    .join('')}</ul></div>`;
}

/** La ficha de una persona: quién es, su nivel, su foco de la semana, su boletín y el registro de sus misiones. */
function fichaPersona(p: Persona) {
  const integrante = d.proyecto.equipo.find((i) => i.id === p);
  const xp = xpDe(d.plan, d.estado, p);
  const n = nivelDe(xp);
  const mis = d.plan.misiones.filter((m) => m.para === p);
  const por = (es: EstadoMision[]) => mis.filter((m) => es.includes(estadoMision(m, d.plan, d.estado)));
  const hechas = por(['aprobada']);
  const commits = d.senales.esfuerzo?.commits.filter((c) => c.autor === p) ?? [];
  const foco = commits.length ? repartoPorNivel(faseActual(d.plan, d.estado), commits).foco : null;
  const boletin = [...d.plan.boletin].reverse().find((b) => b.para === p);
  const papel = integrante?.papel ?? integrante?.cargo ?? (p === TITULAR ? 'Dirige el proyecto: tiene la última palabra.' : '');
  return `<header class="cabeza-persona">
      <div class="monograma">${esc(nombrePersona(p).charAt(0))}</div>
      <div class="quien-p"><b>${esc(nombrePersona(p))}${d.identidad.rol === p ? ' <span class="chip foco">Tú</span>' : ''}</b><span>${esc(papel)}</span></div>
    </header>
    <div class="nivel-p"><div class="fila-nivel"><b>Nivel ${n.nivel}</b><small>${xp} XP · ${hechas.length} ${hechas.length === 1 ? 'misión aprobada' : 'misiones aprobadas'}</small></div><div class="barra-xp"><div style="width:${n.enNivel}%"></div></div><small class="para-subir">${n.paraSubir - n.enNivel} XP para el nivel ${n.nivel + 1}</small></div>
    ${insignias(p)}
    ${d.arranque === 'en_marcha' ? `<div class="notas-p">
      <span class="nota-letra ${foco === null ? '' : notaFoco(foco)}" title="Cuánto de sus commits de los últimos 7 días fue a los frentes en foco">${foco === null ? '—' : notaFoco(foco)}</span>
      <span>Foco de la semana${foco === null ? ': sin commits propios en 7 días' : `: ${pct(foco)} en foco (${commits.length} commits)`}</span>
    </div>` : '' /* en el arranque todos los frentes esperan: el foco no dice nada todavía */}
    ${boletin ? `<p class="boletin-p"><b>Boletín del director (${fecha(boletin.fecha)}):</b> ${Object.entries(boletin.notas).map(([k, v]) => `${esc(k)} <b>${v}</b>`).join(' · ')}. ${esc(boletin.comentario)}</p>` : ''}`;
}

/** Lo que una persona tiene que hacer: su misión de ahora completa; las demás en cola, esperando o hechas. */
function tareasDe(p: Persona) {
  const mis = d.plan.misiones.filter((m) => m.para === p);
  const por = (es: EstadoMision[]) => mis.filter((m) => es.includes(estadoMision(m, d.plan, d.estado)));
  const ahora = misionesAbiertas(d.plan, d.estado, p);
  const esperando = por(['entregada']);
  return `${ahora.length ? tarjetaMision(ahora[0], false, 1) : '<p class="vacio-m">Sin misiones por hacer: el director asigna la siguiente al revisar.</p>'}
    ${esperando.length ? `<h4>Esperando al director</h4>${esperando.map((m) => tarjetaMision(m)).join('')}` : ''}`;
}

/** Con todo el equipo a la vista: una columna por persona, su ficha arriba y su trabajo debajo. */
function columnaPersona(p: Persona) {
  return `<section class="columna-persona${d.identidad.rol === p ? ' yo' : ''}">${fichaPersona(p)}${tareasDe(p)}</section>`;
}

function puedoTrabajar() {
  if (!d.plan.frentes.length) return '';
  const f = faseActual(d.plan, d.estado);
  let respuesta = '';
  if (consulta) {
    const t = trabajoDe(f, consulta);
    const x = excepcionesActivas(d.estado, d.hoy, consulta)[0];
    const mia = d.identidad.rol ? misionesAbiertas(d.plan, d.estado, d.identidad.rol)[0] : undefined;
    respuesta =
      t.nivel === 'foco' ? `<p class="respuesta-d foco"><b>Sí: es prioridad en «${esc(f.nombre)}».</b> ${esc(t.que)}</p>`
      : t.nivel === 'apoyo' ? `<p class="respuesta-d apoyo"><b>Sí, con límite.</b> ${esc(t.que)}</p>`
      : `<div class="respuesta-d espera"><b>Todavía no.</b> En «${esc(f.nombre)}», ${esc(nombreFrente(consulta))} está en espera: ${esc(t.que)}
          ${x ? `<p>Hay una excepción abierta hasta el ${fecha(x.hasta)}: ${esc(x.motivo)}</p>` : ''}
          ${mia ? `<p>En cambio, lo que el director te pide ahora: «${esc(mia.titulo)}».</p>` : ''}
          ${x ? '' : '<p><button type="button" data-nueva-excepcion>Si de verdad hace falta: registrar la excepción con su razón</button></p>'}</div>`;
  }
  // Plegado: es para cuando hace falta, no algo que se lee cada día
  return `<details class="puedo panel-d"${consulta ? ' open' : ''}><summary><h3>¿Quieres trabajar en otra cosa? Pregúntale al director</h3></summary>
    <label class="campo-puedo">Quiero trabajar en
      <select data-consulta><option value="">Elige un frente…</option>${d.plan.frentes.map((x) => `<option value="${esc(x.id)}"${x.id === consulta ? ' selected' : ''}>${esc(x.nombre)}</option>`).join('')}</select></label>
    ${respuesta}
    <p class="como">Las sesiones de Claude que trabajan en el repositorio hacen esta misma pregunta antes de cada tarea (node tools/director/estado.ts).</p></details>`;
}

/** Para quien llega por primera vez: una línea que lleva a «Qué es STL» (con la guía de uso), sin empujar la misión. */
/**
 * «Hoy»: lo primero que se ve, y una sola línea: tu misión de ahora, completa (y, mientras el proyecto arranca, el
 * arranque). Lo que dijo el director y lo último que pasó no se repiten aquí: se leen en «¿Dónde quedamos?», cuyo botón
 * avisa cuando hay algo nuevo. Lo que espera de ti es tu misión.
 */
function vistaMisiones() {
  const personas = personasEquipo().filter(seVe);
  return `${arranqueHTML()}
    ${filtroVisible()}
    ${personas.length === 1
      ? `<div class="hoy-columnas"><div class="trabajo">${tareasDe(personas[0])}</div><aside class="ficha columna-persona${d.identidad.rol === personas[0] ? ' yo' : ''}">${fichaPersona(personas[0])}</aside></div>`
      : `<div class="equipo-misiones">${personas.map(columnaPersona).join('')}</div>`}`;
}

/** Con el filtro de una persona puesto, una línea que lo dice y deja ver todo el equipo. */
function filtroVisible() {
  const p = personaVista();
  if (!p || personasEquipo().length < 2) return '';
  return `<p class="filtro-equipo">Ves solo lo de <b>${esc(nombreVista(p))}</b> (lo eliges arriba a la derecha, en «Ver como»). <button type="button" class="enlace" data-vista-equipo="equipo">Ver todo el equipo</button></p>`;
}

// ───────────────────────────────────────────── el buzón del director

function sobreDe(n: Nota) {
  const s = n.sobre;
  if (s.tipo === 'mision') return `la misión «${esc(d.plan.misiones.find((m) => m.id === s.id)?.titulo ?? s.id ?? '')}»${s.seccion ? ` › ${esc(s.seccion)}` : ''}`;
  if (s.tipo === 'propuesta') return `la propuesta «${esc(d.plan.propuestas.find((p) => p.id === s.id)?.titulo ?? s.id ?? '')}»`;
  if (s.tipo === 'documento') return `<button type="button" class="enlace" data-doc="${esc(s.id ?? '')}" data-seccion="${esc(s.seccion ?? '')}">${esc(tituloDoc(s.id ?? ''))}${s.seccion ? ` › ${esc(s.seccion)}` : ''}${s.decision ? ` › decisión ${esc(s.decision)}` : ''}${s.fragmento ? ` › «${esc(recortar(s.fragmento, 60))}»` : ''}</button>`;
  if (s.tipo === 'criterio') return `el criterio «${esc(d.plan.fases.flatMap((f) => f.criterios).find((c) => c.id === s.id)?.texto ?? s.id ?? '')}»`;
  if (s.tipo === 'fase') return `la fase «${esc(nombreFase(s.id ?? ''))}»`;
  if (s.tipo === 'diagnostico') return `el diagnóstico${s.seccion ? ` › ${esc(nombreFrente(s.seccion))}` : ''}`;
  if (s.tipo === 'pregunta') return 'una pregunta';
  if (s.tipo === 'objetivo') return s.id ? `el objetivo candidato «${esc(d.plan.objetivos.find((o) => o.id === s.id)?.texto ?? s.id)}»` : 'el objetivo';
  return 'el proyecto en general';
}

/** Si una nota tiene algo que corregir: su texto o lo que se entendió de su audio (ya transcrito). */
const corregible = (n: Nota) => !!n.texto || (!!n.audio && !!d.transcripciones[n.audio]);

/** Lo que dice una nota en una línea, para verla plegada: su texto, o lo que se entendió de su audio, o sus adjuntos. */
function asuntoDe(n: Nota) {
  const t = n.texto?.trim() || (n.audio && d.transcripciones[n.audio]?.trim()) || (n.audio ? 'Audio' : n.adjuntos?.length ? 'Adjuntos' : '');
  return t.length > 110 ? `${t.slice(0, 107)}…` : t;
}

/** Las notas del Buzón que tiene desplegadas quien mira (para que un repintado no las pliegue). */
const notasAbiertas = new Set<string>();
document.addEventListener('toggle', (e) => {
  const det = e.target as HTMLElement;
  if (!(det instanceof HTMLDetailsElement) || !det.dataset.nota) return;
  if (det.open) notasAbiertas.add(det.dataset.nota);
  else notasAbiertas.delete(det.dataset.nota);
}, true);

/** Dónde quedó lo que dijo la nota (la misión, la propuesta, la fase o la parte de un documento), con su botón: para comprobarlo de un vistazo. */
const quedoEn = (r: Respuesta) => (r.destino ? `<p class="quedo-en">Quedó en: ${botonIr(r.destino, 'enlace')}</p>` : '');

/** `plegada`: en el Buzón cada nota se ve en una línea y se despliega la que se quiera revisar (sin scroll de más). */
function tarjetaNota(n: Nota, conSobre = true, plegada = false) {
  const r = d.plan.respuestas[n.id];
  const mia = n.de === d.identidad.rol;
  const puedeBorrar = !r && (titular() || mia);
  const urgente = n.urgente ? `<p class="urgente-n">${icono('urgente')}<span><b>Urgente</b>${typeof n.urgente === 'string' ? `: ${esc(n.urgente)}` : ''}</span></p>` : '';
  const botones = `${!r && mia && corregible(n) ? `<button type="button" data-editar-nota="${esc(n.id)}">Corregir</button>` : ''}${puedeBorrar ? `<button type="button" data-borrar-nota="${esc(n.id)}">Borrar</button>` : ''}`;
  const cuerpo = `${n.texto ? `<p>${esc(n.texto)}</p>` : ''}${audioYTexto(n.audio)}${adjuntosDeNota(n)}
    ${r ? `<div class="respuesta-dir"><b>El director (${momento(r.cuando)}):</b>${r.tratamiento ? ` <span class="tratamiento ${r.tratamiento}">${NOMBRE_TRATAMIENTO[r.tratamiento] ?? r.tratamiento}</span>` : ''} ${esc(r.texto)}${quedoEn(r)}</div>` : '<p class="esperando">Esperando al director. Hasta que lo lea, puedes corregirla o borrarla.</p>'}`;
  if (plegada) {
    return `<li class="nota-d plegable${r ? ' respondida' : ''}"><details data-nota="${esc(n.id)}"${notasAbiertas.has(n.id) ? ' open' : ''}>
      <summary>${n.urgente ? `<span class="urgente-s" title="Urgente">${icono('urgente')}</span>` : ''}<span class="asunto">${esc(asuntoDe(n))}</span><span class="como">${esc(n.quien)} · ${momento(n.cuando)}${conSobre ? ` · sobre ${sobreDe(n)}` : ''}${r?.tratamiento ? ` · <span class="tratamiento ${r.tratamiento}">${NOMBRE_TRATAMIENTO[r.tratamiento] ?? r.tratamiento}</span>` : ''}</span></summary>
      <div class="cuerpo-nota">${botones ? `<div class="botones-nota">${botones}</div>` : ''}${urgente}${cuerpo}</div>
    </details></li>`;
  }
  return `<li class="nota-d${r ? ' respondida' : ''}">
    <header><b>${esc(n.quien)}</b><span class="como">${momento(n.cuando)}${conSobre ? ` · sobre ${sobreDe(n)}` : ''}</span>${botones}</header>
    ${urgente}
    ${cuerpo}
  </li>`;
}

/**
 * El Buzón: lo que se le ha dicho al director y lo que respondió, cada nota plegada en una línea. No tiene formulario
 * propio: se le escribe desde el comentario junto a su cara, o con «Comentar al director» en cada cosa.
 */
function vistaBuzon() {
  const notas = [...d.estado.notas].reverse().filter((n) => seVe(n.de) && !esPregunta(n));
  const esperando = notas.filter((n) => !d.plan.respuestas[n.id]);
  const respondidas = notas.filter((n) => d.plan.respuestas[n.id]);
  return `<details class="explica-buzon panel-d">
      <summary>¿Qué es el Buzón del director?</summary>
      <p>Es donde llega <b>todo lo que le dicen al director</b>: el comentario junto a la cara del director (su globo, «Comentario») y cada <span class="al-director-chip">✉ Comentar al director</span> de las misiones, las propuestas, los criterios, el diagnóstico y las partes de los documentos.</p>
      <p><b>Piensa, corrige y luego envía:</b> lo que dejas espera, y lo puedes corregir o borrar. El director solo lo lee cuando se pide la revisión (<b>«Pedir revisión»</b>, arriba): entonces transcribe los audios, lee todo junto, responde en cada nota y, si hace falta, cambia la ruta o las misiones.</p>
      <p>Cada nota se ve en una línea: ábrela para leerla con su respuesta. Las <b>preguntas</b> van aparte, en <button type="button" class="enlace" data-vista="preguntas">Preguntas</button>: allí el director te las responde todas juntas, como un informe.</p>
    </details>
    ${filtroVisible()}<h3>Esperando respuesta del director <small>· ${esperando.length}</small></h3>
    ${esperando.length ? `<ul class="notas-lista">${esperando.map((n) => tarjetaNota(n, true, true)).join('')}</ul>` : '<p class="intro">Nada esperando: el director está al día.</p>'}
    ${respondidas.length
      // Lo ya respondido va plegado: al entrar, la atención queda en lo que espera
      ? `<details class="ya-respondidas" data-ya-respondidas${respondidasAbiertas ? ' open' : ''}><summary><h3>Ya respondidas <small>· ${respondidas.length}</small></h3></summary>
        <ul class="notas-lista">${respondidas.map((n) => tarjetaNota(n, true, true)).join('')}</ul></details>`
      : '<h3>Ya respondidas <small>· 0</small></h3><p class="intro">Todavía ninguna.</p>'}`;
}

// ───────────────────────────────────────────── las preguntas al director

/** Un hilo de preguntas en Markdown: para copiarlo y llevarlo a otra parte. */
function hiloEnTexto(notas: Nota[]) {
  const dicho = (n: Nota) => n.texto?.trim() || (n.audio && d.transcripciones[n.audio]) || 'Pregunta grabada';
  return `${notas.map((n) => `**${dicho(n)}**\n\n${d.plan.respuestas[n.id]?.texto.trim() ?? '_(esperando respuesta)_'}`).join('\n\n---\n\n')}\n`;
}

/** Los hilos que tiene abiertos quien mira (para que un repintado no los cierre). */
const hilosAbiertos = new Set<string>();
/** Si abriste «Ya respondidas» en el Buzón: se queda abierta mientras no salgas del Studio. */
let respondidasAbiertas = false;
document.addEventListener('toggle', (e) => {
  const det = e.target as HTMLElement;
  if (det instanceof HTMLDetailsElement && det.dataset.yaRespondidas !== undefined) respondidasAbiertas = det.open;
  if (!(det instanceof HTMLDetailsElement) || !det.dataset.hilo) return;
  if (det.open) hilosAbiertos.add(det.dataset.hilo);
  else hilosAbiertos.delete(det.dataset.hilo);
}, true);

/**
 * Preguntas: lo que se le pregunta al director va aparte de los comentarios y los pedidos del Buzón. Arriba, las que
 * esperan su primera respuesta (se corrigen o se quitan hasta que él las lea); debajo, las conversaciones: cada pregunta
 * con su respuesta y lo que se siguió preguntando sobre ella, plegadas para abrir solo la que quieres revisar.
 */
function vistaPreguntas() {
  const yo = d.identidad.rol;
  const hilos = hilosDePreguntas(d.estado.notas.filter((n) => seVe(n.de)));
  const espera = (n: Nota) => !d.plan.respuestas[n.id];
  const nuevas = hilos.filter((h) => espera(h.raiz)).map((h) => h.raiz);
  const conversaciones = hilos.filter((h) => !espera(h.raiz));
  const quien = (n: Nota) => (n.de && n.de !== yo ? `${esc(n.quien)} · ` : '');
  const acciones = (n: Nota) => {
    const mia = n.de === yo;
    return `${mia && corregible(n) ? `<button type="button" data-editar-nota="${esc(n.id)}">Corregir</button>` : ''}${mia || titular() ? `<button type="button" data-borrar-nota="${esc(n.id)}">Quitar</button>` : ''}`;
  };
  const resumir = (n: Nota) => {
    const t = n.texto?.trim() || (n.audio && d.transcripciones[n.audio]) || 'Pregunta grabada';
    return esc(t.length > 150 ? `${t.slice(0, 147)}…` : t);
  };
  return `<section class="cabeza-preguntas">
      <p class="intro">Tus preguntas al director, aparte de los comentarios y los pedidos del Buzón. Las anotas cuando se te ocurren, sin cortar lo que estás haciendo, y él las responde todas juntas en su próxima revisión. Sobre cada respuesta puedes seguir preguntando o comentando: queda en la misma conversación.</p>
      <button type="button" class="primario" data-preguntas>${icono('pregunta')} Agregar preguntas</button>
    </section>
    ${filtroVisible()}<h3>Esperando respuesta <small>· ${nuevas.length}</small></h3>
    ${nuevas.length ? `<ol class="preguntas-espera">${nuevas.map((n) => `<li>${n.texto ? `<p>${esc(n.texto)}</p>` : ''}${audioYTexto(n.audio)}${adjuntosDeNota(n)}
        <footer><span class="como">${quien(n)}${momento(n.cuando)}</span>${acciones(n)}</footer></li>`).join('')}</ol>` : '<p class="intro">Ninguna esperando: cuando se te ocurra una duda, anótala con el ícono de pregunta junto a la cara del director.</p>'}
    <h3>Conversaciones con el director <small>· ${conversaciones.length}</small></h3>
    ${conversaciones.length ? `<div class="hilos-preguntas">${conversaciones.map((h) => {
      const esperan = h.notas.filter(espera).length;
      return `<details class="hilo-preguntas" data-hilo="${esc(h.raiz.id)}" data-ancla="hilo-${esc(h.raiz.id)}"${hilosAbiertos.has(h.raiz.id) ? ' open' : ''}>
        <summary><span class="titulo-hilo">${resumir(h.raiz)}</span>
          <span class="como">${h.notas.length > 1 ? `${h.notas.length} preguntas · ` : ''}${momento(h.ultima)}</span>${esperan ? `<span class="chip-espera">${esperan === 1 ? 'una espera respuesta' : `${esperan} esperan respuesta`}</span>` : ''}</summary>
        <ol class="qa">${h.notas.map((n, i) => {
          const r = d.plan.respuestas[n.id];
          return `<li${i ? ' class="sigue"' : ''}>
            <div class="pregunta-qa">${i ? '<span class="etiqueta-sigue">Seguiste</span>' : ''}${n.texto ? `<p>${esc(n.texto)}</p>` : ''}${audioYTexto(n.audio)}${adjuntosDeNota(n)}<small class="como">${quien(n)}${momento(n.cuando)}</small></div>
            ${r ? `<div class="respuesta-qa">${marked.parse(r.texto, { async: false }) as string}${r.tratamiento === 'decision' ? '<p class="pide-decision">Esta respuesta pide tu decisión: está en el lugar que dice.</p>' : ''}${quedoEn(r)}</div>`
              : `<div class="respuesta-qa esperando"><span class="como">Esperando la respuesta del director, en su próxima revisión.</span>${acciones(n)}</div>`}
          </li>`;
        }).join('')}</ol>
        <footer class="pie-hilo"><button type="button" data-seguir-hilo="${esc(h.notas.at(-1)!.id)}">${icono('pregunta')} Seguir la conversación</button><button type="button" class="enlace" data-copiar-hilo="${esc(h.raiz.id)}" title="Copia la conversación en Markdown, para llevarla a otra parte">Copiar</button></footer>
      </details>`;
    }).join('')}</div>` : '<p class="intro">Todavía no hay respuestas. Llegan con la próxima revisión del director.</p>'}`;
}

/** El diálogo de las preguntas (estudio/src/preguntas.ts), con lo que necesita del Studio. */
function formularPreguntas() {
  if (esperaAlDirector()) return;
  const yo = d.identidad.rol;
  return abrirPreguntas({
    pendientes: () => d.estado.notas.filter((n) => esPregunta(n) && n.de === yo && !d.plan.respuestas[n.id]),
    respondidas: () => d.estado.notas.filter((n) => esPregunta(n) && seVe(n.de) && d.plan.respuestas[n.id]).length,
    agregar: (texto, audio, adjuntos) => accion({ tipo: 'comentar', sobre: { tipo: 'pregunta' }, texto, audio, ...(adjuntos?.length ? { adjuntos } : {}) },'Pregunta guardada: el director la responde en su próxima revisión.'),
    corregir: (id, texto) => accion({ tipo: 'editar_nota', id, texto }, 'Pregunta corregida.'),
    quitar: (id) => accion({ tipo: 'borrar_nota', id }, 'Pregunta quitada.'),
    verRespuestas: () => irA('preguntas'),
    audio: (n) => audioYTexto(n.audio) + adjuntosDeNota(n),
  });
}

// ───────────────────────────────────────────── documentos para leer y comentar


function secciones(texto: string): { titulo: string; md: string }[] {
  const salida: { titulo: string; md: string }[] = [{ titulo: '', md: '' }];
  let enCodigo = false;
  for (const linea of texto.split(/\r?\n/)) {
    if (/^```/.test(linea)) enCodigo = !enCodigo;
    const h2 = !enCodigo && /^##\s+(.+)$/.exec(linea);
    if (h2) salida.push({ titulo: textoPlano(h2[1]), md: linea + '\n' });
    else salida[salida.length - 1].md += linea + '\n';
  }
  return salida.filter((s) => s.titulo || s.md.trim());
}

const ETIQUETA_DOC = { siguiente: '→ Sigue este', despues: 'Después', leido: '✓ Leído', revisado: '✓ Revisado: no hay que volver' };

function vistaDocumentos() {
  const curados = d.plan.documentos;
  const persona: Persona = personaVista() ?? d.identidad.rol ?? TITULAR;
  const propia = persona === d.identidad.rol;
  const enRuta = lecturaDe(persona);
  // Mientras haya algo por leer, lo demás queda plegado: la columna lleva al documento que sigue
  const leyendo = propia && enRuta.some((x) => x.lectura === 'siguiente');
  const banco = curados.filter((c) => !enRuta.some((x) => x.ruta === c.ruta) && !esDelStudio(c.ruta));
  const otros = (documentos ?? []).filter((x) => !curados.some((c) => c.ruta === x.ruta) && !enRuta.some((y) => y.ruta === x.ruta) && !esDelStudio(x.ruta));
  const delProyecto = otros.filter((x) => !x.ruta.startsWith('repo:'));
  const delRepo = otros.filter((x) => x.ruta.startsWith('repo:'));
  const porQue = (ruta: string) => curados.find((c) => c.ruta === ruta)?.porQue ?? '';
  const boton = (x: Documento) => `<button type="button" class="doc-l chico${doc?.ruta === x.ruta ? ' sel' : ''}" data-doc="${esc(x.ruta)}">${esc(x.titulo)}</button>`;
  let n = 0;
  const tarjeta = (x: (typeof enRuta)[number]) => {
    // Lo que viene después se ve, pero se abre al terminar el que sigue
    const cerrado = propia && x.lectura === 'despues';
    const lectura = propia ? x.lectura : x.estado === 'pendiente' ? 'despues' : x.estado;
    return `<button type="button" class="doc-l ${lectura}${doc?.ruta === x.ruta ? ' sel' : ''}" data-doc="${esc(x.ruta)}"${cerrado ? ' disabled aria-disabled="true" title="Se abre cuando termines el que sigue"' : ''}>
      <span class="fila-doc"><span class="num-doc">${x.estado === 'revisado' || lectura === 'leido' ? '✓' : ++n}</span><b>${esc(tituloDoc(x.ruta))}</b></span>
      <span class="chip estado-doc ${lectura}">${cerrado ? 'Después: se abre al terminar el que sigue' : ETIQUETA_DOC[lectura]}</span>
      <small>${esc(porQue(x.ruta))} Misión: «${esc(x.mision.titulo)}».</small></button>`;
  };
  // Mientras lees, la columna muestra entero solo el que sigue: lo de después y lo ya leído, plegado en una línea
  // cada uno, para que la atención se quede en lo que toca ahora
  const plegado = (titulo: string, xs: typeof enRuta) => xs.length
    ? `<details class="docs-plegados"${xs.some((x) => x.ruta === doc?.ruta) ? ' open' : ''}><summary>${titulo} <span class="cifra">${xs.length}</span></summary>${xs.map((x) => `<button type="button" class="doc-l chico ${x.lectura}${doc?.ruta === x.ruta ? ' sel' : ''}" data-doc="${esc(x.ruta)}"${x.lectura === 'despues' ? ' disabled aria-disabled="true" title="Se abre cuando termines el que sigue"' : ''}><b>${esc(tituloDoc(x.ruta))}</b></button>`).join('')}</details>`
    : '';
  const ordenLectura = !enRuta.length ? '<p class="intro">Tus misiones de ahora no piden documentos.</p>'
    : leyendo ? `${enRuta.filter((x) => x.lectura === 'siguiente').map(tarjeta).join('')}${plegado('Después', enRuta.filter((x) => x.lectura === 'despues'))}${plegado('Ya leídos', enRuta.filter((x) => x.lectura === 'leido' || x.lectura === 'revisado'))}`
    : enRuta.map(tarjeta).join('');
  // Solo los documentos del proyecto: los del Studio (su método, su diseño) están en «Qué es STL», para no mezclarlos
  const lista = `<aside class="lista-docs" id="lista-docs">
      <div class="cabeza-lista"><h3>${leyendo ? 'Tu misión actual' : 'Tu orden de lectura'} <small>· ${esc(nombrePersona(persona))}</small></h3>
        <button type="button" class="plegar-lista" data-plegar-lista aria-controls="lista-docs" title="Plegar la columna: el documento a todo el ancho" aria-label="Plegar la columna de los documentos">${icono('plegar')}</button></div>
      ${ordenLectura}
      ${leyendo ? '<details class="otros-docs"><summary>Otros documentos, para consultar</summary>' : ''}
      ${banco.length ? `<h3>Para consultar</h3>${banco.map((c) => `<button type="button" class="doc-l chico${doc?.ruta === c.ruta ? ' sel' : ''}" data-doc="${esc(c.ruta)}"><b>${esc(c.titulo)}</b><small>${esc(c.porQue)}</small></button>`).join('')}` : ''}
      ${documentos ? `${delProyecto.length ? `<h3>Del proyecto</h3>${delProyecto.map(boton).join('')}` : ''}<h3>Del repositorio del proyecto</h3>${delRepo.map(boton).join('') || `<p class="intro">${d.repositorio.info ? 'El repositorio no tiene archivos .md.' : 'Conecta el repositorio en Proyecto para leer y comentar sus documentos.'}</p>`}` : '<button type="button" data-cargar-docs>Ver todos</button>'}
      <p class="como">La explicación del método y del Studio está en <button type="button" class="enlace" data-vista="stl">Qué es STL</button>.</p>
      ${leyendo ? '</details>' : ''}
    </aside>
    <button type="button" class="desplegar-lista" data-plegar-lista aria-controls="lista-docs" title="Ver la columna de los documentos" aria-label="Ver la columna de los documentos">${icono('desplegar')}</button>`;
  if (!doc) return `<div class="docs">${lista}<div class="lector"><p class="intro">Elige un documento. Debajo de cada parte está «Comentar esta parte al director»: lo que escribas o grabes llega al Buzón del director, que responde aquí mismo y ajusta lo que haga falta. También se comentan los documentos del repositorio del proyecto (su README, su documentación).</p></div></div>`;
  const ruta = doc.ruta;
  const notas = d.estado.notas.filter((x) => x.sobre.tipo === 'documento' && x.sobre.id === ruta);
  const paraLeer = new Set(partesDeDocumento(doc.texto));
  const leidas = new Set(leidasDe(ruta));
  const parte = (s: { titulo: string; md: string }) => {
    const deEsta = notas.filter((x) => (x.sobre.seccion ?? '') === s.titulo && !x.sobre.decision && !x.sobre.fragmento);
    // Una parte leída en la que el director reescribió una idea se vuelve a abrir, solo en esa idea
    const leida = leidas.has(s.titulo) && !reabierta(ruta, s);
    const seLee = !!d.identidad.rol && paraLeer.has(s.titulo);
    // Lo que falta por leer se lee de a una idea: cada párrafo o punto se marca «Entendido» y cada decisión se responde
    const porIdeas = seLee && !leida && !!s.titulo;
    const falta = porIdeas ? faltaEnParte(ruta, s) : null;
    // La entrada (el título y quién lo escribió) no se marca ni se comenta: no hay nada que leer ahí. Leída de a una
    // idea, se comenta cada idea (debajo de ella, junto a su «Entendido»), no la parte entera: un solo botón, sin dudas
    // sobre qué se comenta
    const botones = s.titulo || seLee;
    // Una parte sin ideas que marcar se marca entera con su estrella; con ideas, se marca sola al atenderlas todas
    const marcar = !seLee ? ''
      : falta && falta.total > 0 ? `<span class="progreso-parte" title="La parte se marca sola al atender cada idea">${icono('estrella')} ${falta.hechas} de ${falta.total}${falta.decisiones ? ` · ${falta.decisiones === 1 ? 'falta una decisión' : `faltan ${falta.decisiones} decisiones`}` : ''}</span>`
      : `<button type="button" class="leido-parte${leida ? ' hecho' : ''}" data-leido-parte="${esc(s.titulo)}" aria-pressed="${leida}" title="${leida ? 'Quitar la marca: vuelve a su lugar' : 'Márcala al terminar de leerla'}">${icono('estrella')} ${leida ? 'Leída' : 'Leída: márcala'}</button>`;
    const cuerpo = porIdeas ? porTrozos(s, notas) : conDecisiones(s.titulo, s.md, notas.filter((x) => (x.sobre.seccion ?? '') === s.titulo && x.sobre.decision));
    return `<section class="parte-doc${leida ? ' leida' : seLee ? ' por-leer' : ''}${s.titulo ? '' : ' entrada-doc'}" data-parte="${esc(s.titulo)}">
      ${cuerpo}
      ${deEsta.length || botones ? `<div class="comentar-parte">
        ${deEsta.length ? `<ul class="notas-lista">${deEsta.map((x) => tarjetaNota(x, false)).join('')}</ul>` : ''}
        ${botones ? `<div class="botones-parte">${porIdeas ? '' : `<button type="button" class="al-director" data-comentar="documento|${esc(ruta)}|${esc(s.titulo)}">✉ Comentar ${s.titulo ? 'esta parte' : 'el documento'} al director</button>`}${marcar}</div>` : ''}
      </div>` : ''}
    </section>`;
  };
  // Lo ya leído baja al final, a «Ya leído» (plegado): arriba queda solo lo que falta, en su orden. Y se lee parte por
  // parte: la que sigue se abre al terminar la de ahora, para no saltarse nada ni decidir sobre lo que no se ha leído
  const todas = secciones(doc.texto);
  const yaLeidas = todas.filter((s) => d.identidad.rol && paraLeer.has(s.titulo) && leidas.has(s.titulo) && !reabierta(ruta, s));
  const arriba = todas.filter((s) => !yaLeidas.includes(s));
  const ahora = arriba.find((s) => d.identidad.rol && s.titulo && paraLeer.has(s.titulo));
  const cerrada = (s: { titulo: string }) => `<section class="parte-doc cerrada" data-parte="${esc(s.titulo)}">
      <h2>${esc(s.titulo)}</h2>
      <p class="como">${icono('candado')} Se abre al terminar «${esc(ahora!.titulo)}».</p>
    </section>`;
  const partes = `${arriba.map((s) => (ahora && s !== ahora && s.titulo && paraLeer.has(s.titulo) && arriba.indexOf(s) > arriba.indexOf(ahora) ? cerrada(s) : parte(s))).join('')}${yaLeidas.length ? `<details class="ya-leido-doc"><summary>${icono('estrella')} Ya leído <span class="cifra">${yaLeidas.length}</span></summary>${yaLeidas.map(parte).join('')}</details>` : ''}`;
  return `<div class="docs${listaPlegada() ? ' sin-lista' : ''}">${lista}<article class="lector ${claseLector()}">${ajustesLector(ruta)}${partes}</article></div>`;
}

/** Los documentos del propio Studio (su método, su diseño): se leen en «Qué es STL», no entre los del proyecto. */
const esDelStudio = (ruta: string) => ruta.startsWith('docs/metodo/') || (documentos ?? []).some((x) => x.ruta === ruta && x.studio);

/** Si la columna de los documentos está plegada (es de este navegador). */
const listaPlegada = () => localStorage.getItem('estudio.docs.lista') === 'plegada';

/** Las ideas de las partes de un documento que ya marcaste como entendidas. */
const trozosLeidos = (ruta: string) => new Set(d.estado.leidos?.[claveLeido(d.identidad.rol ?? TITULAR, ruta)]?.trozos ?? []);

/** Cómo está cada idea de una parte para ti: entendida, o reescrita desde que la leíste. */
const ideasDe = (ruta: string, s: { titulo: string; md: string }) => estadoIdeas(s.titulo, s.md, trozosLeidos(ruta), leidasDe(ruta).includes(s.titulo));

/** Una parte que ya leíste y en la que el director reescribió (o agregó) una idea: se vuelve a abrir en esa idea. */
const reabierta = (ruta: string, s: { titulo: string; md: string }) => leidasDe(ruta).includes(s.titulo) && ideasDe(ruta, s).cambio.some(Boolean);

/** El comienzo de una idea, en texto: así se nombra al comentarla. */
const fragmentoDe = (md: string) => recortar(textoPlano(md.replace(/^ ?([-*+]|\d+[.)])\s+/, '')).replace(/[|\s]+/g, ' '), 120);

/** ¿Respondiste ya esta decisión de esta parte? Aprobarla o decidir otra cosa la responde; comentarla, no. */
const respondiste = (ruta: string, parte: string, decision: string) =>
  d.estado.notas.some((n) => n.de === d.identidad.rol && decideDecision(n) && n.sobre.id === ruta && (n.sobre.seccion ?? '') === parte && n.sobre.decision === decision);

/**
 * Los botones de una decisión: «Apruebo lo que recomiendas» (un clic) y «Comentar», que deja una duda sin decidirla.
 * Con un comentario ya dejado, aparece también «Decido otra cosa». Respondida, solo se le puede agregar algo.
 */
function botonesDecision(ruta: string, parte: string, nombre: string, deEsta: Nota[]): string {
  const previas = deEsta.length ? `<ul class="notas-lista">${deEsta.map((x) => tarjetaNota(x, false)).join('')}</ul>` : '';
  const base = `documento|${esc(ruta)}|${esc(parte)}|${esc(nombre)}|`;
  const botones = respondiste(ruta, parte, nombre)
    ? `<button type="button" class="al-director" data-comentar="${base}|comenta">✉ Agregar a esta decisión</button>`
    : `<button type="button" class="boton-aprobar" data-aprobar="${esc(ruta)}|${esc(parte)}|${esc(nombre)}" title="Quedas de acuerdo con lo que recomienda el director: queda en el Buzón como tu respuesta">${icono('check')}<span>Apruebo lo que recomiendas</span></button>
      ${deEsta.length ? `<button type="button" class="al-director" data-comentar="${base}|decide">🎙 Decido otra cosa</button>` : ''}
      <button type="button" class="al-director" data-comentar="${base}|comenta" title="Una duda o un comentario: la decisión sigue abierta">✉ Comentar</button>`;
  return `<div class="responder-decision">${previas}<div class="botones-decision">${botones}</div></div>`;
}

/** Cuántas decisiones tiene una parte y cuántas respondiste: «Decisión 1 de 2, respondida». */
function cuentaDecisiones(ruta: string, parte: string) {
  const s = doc?.ruta === ruta ? secciones(doc.texto).find((x) => x.titulo === parte) : undefined;
  const nombres = s ? decisionesDe(s.titulo, s.md) : [];
  return { total: nombres.length, hechas: nombres.filter((n) => respondiste(ruta, parte, n)).length };
}

/** Responder una decisión (aprobarla o decidir otra cosa): lo dice, y la parte pasa a lo siguiente con un cambio visible. */
async function decisionRespondida(ruta: string, parte: string) {
  const { total, hechas } = cuentaDecisiones(ruta, parte);
  recienEntendida = 'decision';
  try {
    await parteAtendida(ruta, parte);
    if (doc?.ruta === ruta && !leidasDe(ruta).includes(parte)) {
      pintar();
      centrarIdea();
    }
  } finally {
    recienEntendida = '';
  }
  if (total) avisar(`Decisión ${hechas} de ${total}, respondida: quedó en el Buzón, para el director.`, true);
}

/**
 * Lo que falta para dar una parte por leída: cada idea entendida y cada decisión respondida (una decisión no se salta:
 * sin tu respuesta, el director no sabe qué quieres). `total` cuenta las ideas que se atienden; `hechas`, las atendidas.
 */
function faltaEnParte(ruta: string, s: { titulo: string; md: string }) {
  const { entendida } = ideasDe(ruta, s);
  const ideas = trozosDeParte(s.titulo, s.md).map((t, i) => ({ t, i })).filter(({ t }) => t.tipo !== 'rotulo');
  const hecha = ({ t, i }: (typeof ideas)[number]) => (t.decision ? respondiste(ruta, s.titulo, t.decision) : entendida[i]);
  const hechas = ideas.filter(hecha).length;
  return { total: ideas.length, hechas, decisiones: ideas.filter((x) => x.t.decision && !hecha(x)).length, completa: hechas === ideas.length };
}

/**
 * Una parte por leer, idea por idea: solo la idea de ahora a la vista, a todo el ancho, y debajo su «Entendido» y su
 * «Comentar esta idea»
 * (o, si es una decisión, su botón para responderla, con lo que ya se dijo debajo). Lo entendido se pliega arriba en
 * una línea, que se abre para releer; lo que sigue no se muestra hasta llegar ahí. Una decisión se lee junto a la
 * idea que la explica (la última antes de «Para decidir»).
 */
function porTrozos(s: { titulo: string; md: string }, notas: Nota[]): string {
  const ruta = doc!.ruta;
  const titulo = /^##\s.*$/m.exec(s.md)?.[0] ?? '';
  const html = (md: string) => marked.parse(md, { async: false }) as string;
  const lista = trozosDeParte(s.titulo, s.md);
  const { entendida, cambio } = ideasDe(ruta, s);
  const hecha = (i: number) => {
    const t = lista[i];
    return t.decision ? respondiste(ruta, s.titulo, t.decision) : entendida[i];
  };
  const ideas = lista.map((t, i) => i).filter((i) => lista[i].tipo !== 'rotulo');
  const actual = ideas.find((i) => !hecha(i));
  // Cada idea lleva consigo los rótulos que la anteceden («Para decidir:» va con la primera decisión)
  const grupo = (i: number) => {
    let desde = i;
    while (desde > 0 && lista[desde - 1].tipo === 'rotulo') desde--;
    return lista.slice(desde, i + 1).map((_, k) => desde + k);
  };
  // La idea que explica la decisión de ahora: la última antes de «Para decidir» (se salta las decisiones ya respondidas)
  const contexto = actual !== undefined && lista[actual].decision ? ideas.filter((i) => i < actual && !lista[i].decision).pop() : undefined;
  const pintarTrozo = (i: number, clase = '') => {
    const t = lista[i];
    if (t.tipo === 'rotulo') return `<div class="trozo rotulo">${html(t.md)}</div>`;
    const fragmento = fragmentoDe(t.md);
    const deEste = notas.filter((x) => (x.sobre.seccion ?? '') === s.titulo && (t.decision ? x.sobre.decision === t.decision : !x.sobre.decision && x.sobre.fragmento === fragmento));
    if (t.decision) {
      const plantilla = document.createElement('template');
      plantilla.innerHTML = html(t.md);
      const ol = plantilla.content.querySelector('ol');
      const n = Number(ol?.getAttribute('start') ?? 1);
      ol?.classList.add('decisiones-d');
      ol?.setAttribute('style', `counter-reset: decision ${n - 1}`);
      const li = ol?.querySelector(':scope > li');
      li?.insertAdjacentHTML('beforeend', botonesDecision(ruta, s.titulo, t.decision, deEste));
      const respondida = hecha(i);
      return `<div class="trozo decision${respondida ? ' hecho' : ''}${clase}"><div class="cuerpo-trozo">${plantilla.innerHTML}</div>
        <div class="marcas-trozo"><span class="estado-decision${respondida ? ' hecha' : ''}">${respondida ? `${icono('check')} Respondida` : 'Falta tu decisión'}</span></div></div>`;
    }
    const hecho = entendida[i];
    const recien = hecho && recienEntendida === `${ruta}|${claveIdea(s.titulo, t.md)}`;
    const cambiada = cambio[i] ? `<p class="idea-cambiada">${icono('estrella')} Cambió desde que leíste esta parte</p>` : '';
    return `<div class="trozo${hecho ? ' hecho' : ''}${clase}">${cambiada}<div class="cuerpo-trozo">${html(t.md)}</div>
      <div class="marcas-trozo">
        <button type="button" class="entendido${hecho ? ' hecho' : ''}${recien ? ' recien' : ''}" data-entendido="${esc(s.titulo)}|${i}" aria-pressed="${hecho}" title="${hecho ? 'Quitar la marca' : 'Márcala al entender esta idea'}">${icono('check')}<span>Entendido</span></button>
        <button type="button" class="al-director comentar-idea" data-comentar="documento|${esc(ruta)}|${esc(s.titulo)}||${esc(fragmento)}" title="Comentar solo esta idea al director">✉ Comentar esta idea al director</button>
      </div>
      ${deEste.length ? `<ul class="notas-lista">${deEste.map((x) => tarjetaNota(x, false)).join('')}</ul>` : ''}</div>`;
  };
  const visibles = actual === undefined ? [] : [...(contexto !== undefined ? [contexto] : []), actual];
  const plegadas = ideas.filter((i) => hecha(i) && !visibles.includes(i));
  const entendidas = plegadas.length
    ? `<details class="ideas-entendidas"${actual === undefined ? ' open' : ''}><summary>${icono('check')} ${plegadas.length === 1 ? '1 idea entendida' : `${plegadas.length} ideas entendidas`}</summary><div class="trozos">${plegadas.flatMap(grupo).map((i) => pintarTrozo(i)).join('')}</div></details>`
    : '';
  const ahora = visibles.map((i) => (i === actual ? grupo(i).map((k) => pintarTrozo(k, k === i ? ` actual${recienEntendida ? ' llega' : ''}` : '')).join('') : pintarTrozo(i, ' contexto'))).join('');
  const cuenta = actual !== undefined && ideas.length > 1 ? `<p class="cuenta-ideas">Idea ${ideas.indexOf(actual) + 1} de ${ideas.length}</p>` : '';
  return `${html(titulo)}${entendidas}<div class="trozos">${ahora}</div>${cuenta}`;
}

/** La idea que se acaba de marcar (documento|clave): su botón lleva el estímulo una sola vez. */
let recienEntendida = '';

/**
 * Marca (o desmarca) una idea como entendida; con la última de la parte (y sus decisiones respondidas), la parte queda
 * leída. `soloMarcar`: nunca la desmarca (al comentarla, ya se da por entendida).
 */
async function marcarTrozo(titulo: string, i: number, soloMarcar = false) {
  const yo = d.identidad.rol;
  if (!doc || !yo || animandoParte) return;
  const ruta = doc.ruta;
  const s = secciones(doc.texto).find((x) => x.titulo === titulo);
  const t = s ? trozosDeParte(s.titulo, s.md)[i] : undefined;
  if (!s || !t) return;
  // Se marca por lo que dice la idea (su huella), y las marcas de antes, por número, pasan a su huella
  const clave = claveIdea(titulo, t.md);
  const trozos = new Set(marcasAlDia(secciones(doc.texto), trozosLeidos(ruta)));
  const marca = !trozos.has(clave);
  if (!marca && soloMarcar) return;
  if (marca) trozos.add(clave);
  else trozos.delete(clave);
  const previo = d.estado.leidos?.[claveLeido(yo, ruta)];
  d.estado.leidos = { ...(d.estado.leidos ?? {}), [claveLeido(yo, ruta)]: { partes: previo?.partes ?? [], trozos: [...trozos], ...(previo?.completo ? { completo: true } : {}), cuando: new Date().toISOString(), quien: d.identidad.nombre } };
  // Una parte ya leída que se reabrió por una idea cambiada no se vuelve a marcar: ya está entre las leídas
  if (marca && !leidasDe(ruta).includes(titulo) && faltaEnParte(ruta, s).completa) return void (await marcarParte(titulo));
  // El estímulo, solo en esta pintada: si se vuelve a pintar, el botón ya no late otra vez
  recienEntendida = marca ? `${ruta}|${clave}` : '';
  pintar();
  recienEntendida = '';
  if (marca) centrarIdea();
  await accion({ tipo: 'leido', doc: ruta, partes: previo?.partes ?? [], trozos: [...trozos], completo: !!previo?.completo }, '');
}

/** Si al responder una decisión quedó todo atendido en su parte, la parte queda leída (y se abre la siguiente). */
async function parteAtendida(ruta: string, titulo: string) {
  if (doc?.ruta !== ruta || leidasDe(ruta).includes(titulo)) return;
  const s = secciones(doc.texto).find((x) => x.titulo === titulo);
  if (s && faltaEnParte(ruta, s).completa) await marcarParte(titulo);
}

/** Cómo lee cada quien: el tamaño de la letra (tres). Es de este navegador, no del proyecto. Claro u oscuro es de todo el Studio. */
const LETRAS = ['Letra pequeña', 'Letra mediana', 'Letra grande'] as const;
const letraLector = () => Math.min(2, Math.max(0, Number(localStorage.getItem('estudio.lector.letra') ?? 1) || 0));
const claseLector = () => `letra-${letraLector()}`;

/**
 * El modo enfoque: un velo difuminado sobre la barra lateral, la cabecera, la columna de la misión y el director
 * flotante, y la idea de ahora centrada y nítida. Lo demás del documento se pliega (no se difumina). Esc para salir.
 * Es de esta visita: al salir de los documentos, se apaga.
 */
let enfoque = false;
const aplicarEnfoque = () => document.documentElement.classList.toggle('enfoque', enfoque && vista === 'documentos' && !!doc);
function ponerEnfoque(si: boolean) {
  enfoque = si;
  aplicarEnfoque();
  document.querySelectorAll<HTMLButtonElement>('[data-enfoque]').forEach((b) => {
    b.setAttribute('aria-pressed', String(si));
    b.title = si ? 'Salir del modo enfoque (Esc)' : 'Solo la idea de ahora, sin nada alrededor';
    b.querySelector('span')!.textContent = si ? 'Salir del enfoque' : 'Modo enfoque';
  });
  if (si) centrarIdea();
}
/** Lleva al centro de la pantalla la idea que toca leer (en el modo enfoque, o al marcar la anterior). */
function centrarIdea() {
  const idea = document.querySelector<HTMLElement>('.lector .trozo.actual');
  if (!idea) return;
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (enfoque) idea.scrollIntoView({ block: 'center', behavior: quieto ? 'auto' : 'smooth' });
  else {
    // Fuera del enfoque solo se mueve si la idea quedó fuera de la vista
    const r = idea.getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight) idea.scrollIntoView({ block: 'center', behavior: quieto ? 'auto' : 'smooth' });
  }
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && enfoque && !document.querySelector('dialog[open]')) ponerEnfoque(false);
});
// En todo el documento, como el del tema: el botón de arriba está en la cabecera, fuera de la vista
document.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('[data-enfoque]')) ponerEnfoque(!enfoque);
});

/**
 * El botón del modo enfoque: arriba, junto al del tema, y solo donde funciona (con un documento abierto). Con el
 * enfoque puesto la cabecera queda bajo el velo, así que «Salir del enfoque» aparece también en la franja del documento.
 */
const botonEnfoque = (donde: 'cabeza' | 'lector' = 'cabeza') =>
  vista === 'documentos' && doc
    ? `<button type="button" class="boton-suave boton-enfoque en-${donde}" data-enfoque aria-pressed="${enfoque}" title="${enfoque ? 'Salir del modo enfoque (Esc)' : 'Solo la idea de ahora, sin nada alrededor'}">${icono('enfoque')}<span>${enfoque ? 'Salir del enfoque' : 'Modo enfoque'}</span></button>`
    : '';

/** Arriba del documento, en una sola franja: cómo se termina de leer y el tamaño de la letra (y, en el enfoque, cómo salir). */
function ajustesLector(ruta: string) {
  const letra = letraLector();
  return `<div class="ajustes-lector">${leidoDoc(ruta)}
    <div class="opciones-lector" role="group" aria-label="Cómo leer">
      ${botonEnfoque('lector')}
      <span class="tamanos-letra">${LETRAS.map((t, i) => `<button type="button" class="tamano-letra t${i}${i === letra ? ' sel' : ''}" data-letra="${i}" aria-pressed="${i === letra}" title="${t}">A</button>`).join('')}</span>
    </div>
  </div>`;
}

/** El tema de todo el Studio, claro u oscuro (de este navegador). Arriba, junto a «¿Dónde quedamos?», siempre a mano. */
const temaOscuro = () => (localStorage.getItem('estudio.tema') ?? localStorage.getItem('estudio.lector.tema')) === 'oscuro';
const aplicarTema = () => document.documentElement.classList.toggle('oscuro', temaOscuro());
const botonTema = () => {
  const oscuro = temaOscuro();
  return `<button type="button" class="boton-suave boton-tema" data-tema aria-pressed="${oscuro}" title="${oscuro ? 'Pasar el Studio a claro' : 'Pasar el Studio a oscuro'}" aria-label="${oscuro ? 'Tema claro' : 'Tema oscuro'}">${icono(oscuro ? 'sol' : 'luna')}</button>`;
};
aplicarTema();
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-tema]');
  if (!b) return;
  localStorage.setItem('estudio.tema', temaOscuro() ? 'claro' : 'oscuro');
  aplicarTema();
  b.outerHTML = botonTema();
});

/** Los pasos de las misiones abiertas de alguien (tú, si no se dice) que piden leer este documento entero (no una parte suya, que suele pedir decidir). */
function pasosDeLeer(ruta: string, persona: Persona | undefined = d.identidad.rol ?? undefined): { m: Mision; i: number; hecho: boolean }[] {
  if (!persona) return [];
  return misionesAbiertas(d.plan, d.estado, persona)
    .filter((m) => m.para === persona)
    .flatMap((m) => m.pasos.map((p, i) => ({ m, i, p })))
    .filter(({ p }) => typeof p !== 'string' && p.ir?.doc === ruta && !p.ir.seccion)
    .map(({ m, i }) => ({ m, i, hecho: pasosHechos(m.id).includes(i) }));
}

/**
 * El guardrail de la lectura: un paso que manda a leer un documento no se marca a mano mientras no se haya leído, parte
 * por parte (si no, se podría dar por leído sin abrirlo). Si nombra una parte (suele ser para decidir), basta con marcar
 * esa parte como leída o con haberla comentado o respondido. Dice qué falta y a dónde ir, o null si se puede marcar.
 */
function faltaLeer(id: string, i: number): { texto: string; ir: Destino } | null {
  const yo = d.identidad.rol;
  const p = d.plan.misiones.find((m) => m.id === id)?.pasos[i];
  if (!yo || !p || typeof p === 'string' || !p.ir?.doc) return null;
  const ruta = p.ir.doc;
  const titulo = tituloDoc(ruta);
  if (p.ir.seccion) {
    const parte = textoPlano(p.ir.seccion);
    if (leidasDe(ruta).includes(parte)) return null;
    // Si la parte pide decidir, cada decisión necesita su respuesta: comentar la parte no basta
    const s = doc?.ruta === ruta ? secciones(doc.texto).find((x) => x.titulo === parte) : undefined;
    const decisiones = s ? decisionesDe(s.titulo, s.md) : [];
    const respondida = decisiones.length
      ? decisiones.every((x) => respondiste(ruta, parte, x))
      : d.estado.notas.some((n) => n.de === yo && n.sobre.tipo === 'documento' && n.sobre.id === ruta && textoPlano(n.sobre.seccion ?? '') === parte);
    if (respondida) return null;
    return { texto: `Este paso se marca solo: lee «${p.ir.seccion}» idea por idea${decisiones.length ? ' y responde cada decisión' : ', o responde lo que pide'}.`, ir: { doc: ruta, seccion: p.ir.seccion, etiqueta: titulo } };
  }
  if (d.estado.leidos?.[claveLeido(yo, ruta)]?.completo) return null;
  // Un documento sin partes que marcar no tiene cómo leerse por partes
  if (doc?.ruta === ruta && !partesDeDocumento(doc.texto).length) return null;
  return { texto: `Este paso se marca solo, cuando termines de leer «${titulo}»: marca cada parte con su estrella al leerla.`, ir: { doc: ruta, etiqueta: titulo } };
}

/** Las partes de un documento que alguien (tú, si no se dice) ya marcó como leídas. */
const leidasDe = (ruta: string, persona: Persona = d.identidad.rol ?? TITULAR) => d.estado.leidos?.[claveLeido(persona, ruta)]?.partes ?? [];

/** ¿Ya lo terminó de leer? Todas sus partes marcadas, o el paso de su misión que pedía leerlo, hecho. */
function yaLeido(ruta: string, persona: Persona): boolean {
  if (d.estado.leidos?.[claveLeido(persona, ruta)]?.completo) return true;
  const pasos = pasosDeLeer(ruta, persona);
  return pasos.length > 0 && pasos.every((x) => x.hecho);
}

/** Los documentos de alguien en su orden de lectura: solo se abre el que sigue. */
const lecturaDe = (persona: Persona) => enLectura(documentosEnOrden(d.plan, d.estado, persona), (ruta) => yaLeido(ruta, persona));

/** Arriba del documento que una misión pide leer: cómo se termina, o que ya quedó leído. */
function leidoDoc(ruta: string): string {
  const yo = d.identidad.rol;
  if (!yo || (!pasosDeLeer(ruta).length && !lecturaDe(yo).some((x) => x.ruta === ruta && x.estado !== 'revisado'))) return '';
  if (yaLeido(ruta, yo)) return `<p class="leido-doc hecho">${icono('check')}<span>Leído: el paso de tu misión quedó marcado.</span></p>`;
  return `<p class="leido-doc">${icono('estrella')}<span>Lee de a una idea: solo la de ahora está a la vista. Márcala «Entendido» (o responde la decisión) y aparece la siguiente; lo entendido queda plegado arriba, para releerlo. Al terminar, la parte baja a «Ya leído» y se abre la siguiente. Con la última, el paso de tu misión queda hecho. Puedes comentar cualquier idea: al comentarla, queda marcada «Entendido».</span></p>`;
}

/** Mientras una parte se rompe, la página no se repinta (lo haría a mitad del efecto): se repinta al terminar. */
let animandoParte = false;

/**
 * El efecto de una parte leída, como el de «Dónde quedamos» pero más largo (unos 2,3 s, para que se aprecie): se tacha,
 * sus palabras se sueltan y caen en abanico, y la parte se cierra. Después se repinta y aparece en «Ya leído».
 */
async function romperParte(sec: HTMLElement) {
  animandoParte = true;
  const espera = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
  try {
    sec.classList.add('tachando-parte');
    await espera(450);
    // Las palabras de la parte, cada una en su pieza (hasta 260; lo demás se desvanece con la parte)
    const nodos: Text[] = [];
    const recorrido = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement?.closest('.comentar-parte') || !n.textContent?.trim() ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    while (recorrido.nextNode()) nodos.push(recorrido.currentNode as Text);
    const total = nodos.reduce((s, n) => s + (n.textContent!.match(/\S+/g)?.length ?? 0), 0);
    const paso = Math.min(30, 900 / Math.max(Math.min(total, 260), 1));
    let k = 0;
    for (const n of nodos) {
      if (k >= 260) break;
      const trozo = document.createDocumentFragment();
      for (const t of n.textContent!.split(/(\s+)/)) {
        if (!t) continue;
        if (/^\s+$/.test(t) || k >= 260) {
          trozo.append(t);
          continue;
        }
        const s = document.createElement('span');
        s.className = 'pieza-parte';
        s.textContent = t;
        s.style.cssText = `--dx:${Math.round(Math.random() * 80 - 30)}px;--dy:${Math.round(40 + Math.random() * 60)}px;--rot:${Math.round(Math.random() * 90 - 45)}deg;--retraso:${Math.round(k++ * paso)}ms`;
        trozo.append(s);
      }
      n.replaceWith(trozo);
    }
    sec.classList.add('rompiendo-parte');
    await espera(1500);
    sec.style.height = `${sec.offsetHeight}px`;
    void sec.offsetHeight;
    sec.classList.add('cerrando-parte');
    sec.style.height = '0px';
    await espera(350);
  } finally {
    animandoParte = false;
  }
}

/** Marca (o desmarca) una parte como leída; con todas, termina el documento: el paso de tu misión queda hecho y vuelves a ella. */
async function marcarParte(titulo: string) {
  const yo = d.identidad.rol;
  if (!doc || !yo || animandoParte) return;
  const ruta = doc.ruta;
  const todas = partesDeDocumento(doc.texto);
  const leidas = new Set(leidasDe(ruta));
  const trozos = trozosLeidos(ruta);
  if (leidas.has(titulo)) {
    // Quitar la marca es volver a leerla: sus ideas vuelven a quedar por marcar
    leidas.delete(titulo);
    for (const t of [...trozos]) if (t.startsWith(`${titulo}§`)) trozos.delete(t);
  } else {
    leidas.add(titulo);
    // Se tacha, se rompe y se va: baja a «Ya leído», al final del documento (nada se borra)
    const sec = [...document.querySelectorAll<HTMLElement>('.lector [data-parte]')].find((x) => x.dataset.parte === titulo);
    if (sec && !quieto()) await romperParte(sec);
  }
  const partes = todas.filter((t) => leidas.has(t));
  const antes = yaLeido(ruta, yo);
  const completo = todas.length > 0 && partes.length === todas.length;
  d.estado.leidos = { ...(d.estado.leidos ?? {}), [claveLeido(yo, ruta)]: { partes, ...(trozos.size ? { trozos: [...trozos] } : {}), ...(completo || d.estado.leidos?.[claveLeido(yo, ruta)]?.completo ? { completo: true } : {}), cuando: new Date().toISOString(), quien: d.identidad.nombre } };
  const guardado = accion({ tipo: 'leido', doc: ruta, partes, trozos: [...trozos], completo: completo || antes }, '');
  pintar();
  if (!completo || antes) {
    if (leidas.has(titulo)) decir('¡Bien! Una parte menos: se abrió la siguiente.', 'feliz');
    return void (await guardado);
  }
  // La última parte: el paso que pedía leerlo queda hecho y, si era el último, la misión se entrega sola
  const pasos = pasosDeLeer(ruta).filter((x) => !x.hecho);
  if (!(await guardado)) return;
  const marcados = pasos.map((x) => ({ id: x.m.id, guardado: marcarPaso(x.m.id, x.i, true) }));
  pintar();
  for (const x of marcados) if (await completarSiToca(x.id, x.guardado)) return void decir('¡Misión completada! Ya la tengo para revisarla.', 'riendo');
  await documentoTerminado(ruta, marcados.length > 0);
}

/** Terminaste de leer un documento: se celebra y vuelves a tu misión, con lo que sigue listo para empezar. */
async function documentoTerminado(ruta: string, conPaso: boolean) {
  const mia = misionesAbiertas(d.plan, d.estado, d.identidad.rol ?? TITULAR)[0];
  const sigue = mia ? tarjetaDe(mia) : null;
  decir('¡Leído de punta a punta!', 'feliz');
  const dlg = document.createElement('dialog');
  dlg.className = 'dialogo-director celebracion';
  dlg.innerHTML = `<form method="dialog">
    ${quieto() ? '' : `<div class="confeti" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>`}
    <span class="etiqueta">Documento leído</span>
    <h2>¡Bien hecho!</h2>
    <ul class="cumplidas"><li>${icono('estrella')}<span>${esc(tituloDoc(ruta))}</span></li></ul>
    <p class="como">${conPaso ? 'El paso de tu misión que pedía leerlo quedó hecho.' : 'Marcaste todas sus partes como leídas.'} Lo que comentaste le llega al director en su próxima revisión.</p>
    ${mia ? `<div class="mision-a"><span class="etiqueta">Tu misión ahora</span><b>${esc(mia.titulo)}</b></div>` : ''}
    <div class="botones"><button type="button" data-cerrar>Seguir aquí</button>${sigue ? '<button type="button" class="primario" data-seguir>Ir a mi misión →</button>' : ''}</div>
  </form>`;
  document.body.append(dlg);
  dlg.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (b?.dataset.seguir === undefined && b?.dataset.cerrar === undefined) return;
    dlg.close();
    if (b.dataset.seguir !== undefined && sigue) void ir(sigue);
  });
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
}

/**
 * Una parte de documento ya en HTML. Si es de decisiones, cada punto de su lista lleva su propio botón para responderlo
 * (escrito o en audio) y, debajo, lo que ya se dijo de él y la respuesta del director.
 */
function conDecisiones(titulo: string, md: string, notas: Nota[]): string {
  const html = marked.parse(md, { async: false }) as string;
  const decisiones = decisionesDe(titulo, md);
  if (!decisiones.length) return html;
  const t = document.createElement('template');
  t.innerHTML = html;
  const lista = [...t.content.children].filter((e) => e.tagName === 'OL').at(-1); // la última lista numerada de la parte
  if (!lista) return html;
  lista.classList.add('decisiones-d');
  [...lista.children].forEach((li, i) => {
    const nombre = decisiones[i];
    if (!nombre) return;
    li.insertAdjacentHTML('beforeend', botonesDecision(doc!.ruta, titulo, nombre, notas.filter((x) => x.sobre.decision === nombre)));
  });
  return t.innerHTML;
}

// ───────────────────────────────────────────── la ruta: una fase

function filaCriterio(c: Criterio, f: Fase) {
  const ev = evaluar(c, f, ctx());
  const clase = ev.por === 'no_aplica' ? 'cumplido no_aplica' : ev.cumplido ? 'cumplido' : '';
  const icono = ev.por === 'no_aplica' ? '–' : ev.cumplido ? '✓' : '';
  let medida = '';
  if (c.indicador) {
    const meta = c.meta ?? (enNumero(c) ? 1 : 100);
    const valor = ev.valor === null ? 'sin datos' : enNumero(c) ? `${ev.valor} de ${meta}` : `${ev.valor} % (meta ${meta} %)`;
    medida = `<div class="medida-c"><span class="auto" title="Se cumple solo cuando llega a su meta">se mide solo</span>
      <div class="barra-medida"><div style="width:${(Math.min(1, ev.valor === null ? 0 : ev.valor / meta) * 100).toFixed(1)}%"></div></div><span>${valor}</span></div>`;
  }
  const firma = ev.marca
    ? `<div class="firma">Decisión de ${esc(ev.marca.quien)} (${fecha(ev.marca.fecha)}): ${ev.marca.estado === 'no_aplica' ? 'no aplica' : 'cumplido'}${ev.marca.nota ? ` · ${esc(ev.marca.nota)}` : ''}</div>`
    : ev.evaluacion ? `<div class="firma">El director (${fecha(ev.evaluacion.fecha)}): ${ev.evaluacion.estado === 'no_aplica' ? 'no aplica' : 'cumplido'} · ${esc(ev.evaluacion.nota)}</div>`
    : ev.por === 'indicador' ? '<div class="firma">Se cumplió solo: llegó a su meta.</div>'
    : '<div class="firma">Lo evalúa el director con lo que entreguen las misiones.</div>';
  const botones = titular()
    ? ev.marca ? `<button type="button" data-desmarcar="${esc(c.id)}" title="Vuelve a mandar la evaluación del director">Deshacer mi decisión</button>`
      : `<button type="button" data-decidir="${esc(c.id)}" title="Tu decisión manda sobre la del director">Decidir yo</button>`
    : '';
  return `<li class="criterio ${clase}"><span class="marca">${icono}</span>
    <div><div class="que">${esc(c.texto)}</div>${c.como ? `<div class="como">${esc(c.como)}</div>` : ''}${medida}${firma}</div>
    <div class="botones-c">${botones}<button type="button" class="al-director" data-comentar="criterio|${esc(c.id)}">✉ Comentar al director</button></div></li>`;
}

function pintarPuerta(f: Fase) {
  const cierre = d.estado.cierres[f.id];
  if (cierre) {
    return `<div class="puerta abierta" data-ancla="puerta"><div class="cabeza-p"><b>Puerta: ${esc(f.puerta.nombre)}</b><span class="chip foco">Cruzada</span></div>
      <p>${esc(f.puerta.prueba)}</p>
      <p>Cruzada el ${fecha(cierre.fecha)} por ${esc(cierre.quien)}.${cierre.nota ? ` ${esc(cierre.nota)}` : ''}</p>
      ${titular() ? `<div class="acciones-p"><button type="button" data-reabrir="${esc(f.id)}">Reabrir esta fase</button></div>` : ''}</div>`;
  }
  const bloqueos = bloqueosPuerta(f, ctx());
  return `<div class="puerta" data-ancla="puerta"><div class="cabeza-p"><b>Puerta: ${esc(f.puerta.nombre)}</b><span class="chip">${bloqueos.length ? 'Cerrada' : 'El director recomienda cruzarla'}</span></div>
    <p>${esc(f.puerta.prueba)}</p>
    ${bloqueos.length ? `<ul class="bloqueos">${bloqueos.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
    <div class="acciones-p">${
      titular()
        ? `<button type="button" class="primario" data-cruzar="${esc(f.id)}"${bloqueos.length ? ' disabled' : ''}>Cruzar la puerta</button>`
        : '<span class="nota-rol">La puerta la cruza el titular.</span>'
    }</div></div>`;
}

function vistaRuta() {
  const f = d.plan.fases.find((x) => x.id === faseVista) ?? faseActual(d.plan, d.estado);
  const s = situacion(d.plan, d.estado, f.id);
  const porNivel = (n: Nivel) => d.plan.frentes.filter((x) => trabajoDe(f, x.id).nivel === n);
  const adelantado = d.plan.adelantado.filter((a) => a.fase === f.id);
  // De una fase futura solo se dice cuántas misiones y propuestas trae: se abren al llegar
  const abierta = faseAbierta(f.id);
  const propuestas = abierta ? d.plan.propuestas.filter((p) => p.fase === f.id) : [];
  const misiones = abierta ? d.plan.misiones.filter((m) => m.fase === f.id) : [];
  const cerradas = abierta ? 0 : d.plan.misiones.filter((m) => m.fase === f.id).length + d.plan.propuestas.filter((p) => p.fase === f.id).length;
  return `${rutaHTML()}${tableroFase()}<div class="dos-columnas">
    <div>
      <div class="panel-d">
        <h2>Fase ${numeroFase(f)}: ${esc(f.nombre)} <span class="chip">${NOMBRE_SITUACION[s]}</span></h2>
        <div class="como">${esc(f.etapa)} · ${esc(f.duracion)}</div>
        <p class="texto-fase">${esc(f.meta)}</p>
        <p class="por-que"><b>Por qué va aquí.</b> ${esc(f.porQue)}</p>
        <h3>Para cruzar la puerta, todo esto al 100 %</h3>
        <p class="como">Los evalúa el director con lo que entregan las misiones, o se miden solos. ${esc(nombreTitular())} tiene la última palabra en cada uno.</p>
        <ul class="criterios">${f.criterios.map((c) => filaCriterio(c, f)).join('')}</ul>
        ${pintarPuerta(f)}
      </div>
      ${d.plan.fases.length <= 1 ? '<div class="panel-d"><h3>El resto de la ruta</h3><p class="como">Lo traza el director cuando la meta esté fijada: las fases para llegar a él, cada una con su puerta y sus criterios, lo que hace cada frente en cada una y la primera misión de cada persona.</p></div>' : ''}
    </div>
    <div>
      ${cerradas ? `<div class="panel-d"><h3>Bajo niebla</h3><p class="como">${cerradas} misiones y propuestas esperan esta fase. El director las abre cuando la ruta llegue aquí.</p></div>` : ''}
      ${misiones.length ? `<div class="panel-d"><h3>Las misiones de esta fase</h3>${personasEquipo().map((p) => {
        const ms = misiones.filter((m) => m.para === p);
        return ms.length ? `<p class="como"><b>${esc(nombrePersona(p))}</b></p><ul class="adelantado">${ms.map((m) => `<li>${esc(m.titulo)} <span class="chip estado-m ${estadoMision(m, d.plan, d.estado)}">${NOMBRE_ESTADO_MISION[estadoMision(m, d.plan, d.estado)]}</span></li>`).join('')}</ul>` : '';
      }).join('')}</div>` : ''}
      <div class="panel-d"><h3>El plan de la fase</h3><ol class="misiones">${f.misiones.map((m) => `<li>${esc(m)}</li>`).join('')}</ol></div>
      <div class="panel-d"><h3>Qué hace cada frente</h3>
        <ul class="frentes-fase">${NIVELES.flatMap((n) => porNivel(n).map((x) => `<li>${chipNivel(n)}<b>${esc(x.nombre)}</b><span class="t">${esc(trabajoDe(f, x.id).que)}</span></li>`)).join('')}</ul>
      </div>
      ${propuestas.length ? `<div class="panel-d"><h3>Propuestas que se deciden aquí</h3><ul class="adelantado">${propuestas
        .map((p) => `<li>${esc(p.titulo)} ${d.estado.propuestas[p.id] ? `<span class="chip">${NOMBRE_RESPUESTA[d.estado.propuestas[p.id].estado]}</span>` : '<span class="chip espera">Por decidir</span>'}</li>`)
        .join('')}</ul></div>` : ''}
      ${adelantado.length ? `<div class="panel-d"><h3>Ya adelantado para esta fase</h3><ul class="adelantado">${adelantado.map((a) => `<li><b>${esc(nombreFrente(a.frente))}:</b> ${esc(a.texto)}</li>`).join('')}</ul></div>` : ''}
    </div>
  </div>`;
}

// ───────────────────────────────────────────── el proyecto: repositorio, contexto, objetivo y equipo

function vistaProyecto() {
  const p = d.proyecto;
  const r = d.repositorio;
  const o = p.objetivo;
  const t = titular();
  const soloLectura = t ? '' : ' readonly';
  const info = r.info;
  const b = borradorObjetivo ?? { texto: '', exito: '', horizonte: '', candidato: '' };
  const candidatos = d.plan.objetivos ?? [];
  // Lo de git (rama, último commit, historial) no hace falta para dirigir: va plegado, para quien lo quiera ver
  const formRepo = `<form id="form-repositorio" class="fila-form">
          <input type="text" name="ruta" value="${esc(r.ruta ?? '')}" placeholder="C:\\proyectos\\mi-app" aria-label="Carpeta del repositorio" />
          <button type="button" data-explorar-repo>📁 Explorar…</button>
          <button type="submit" class="primario">${r.ruta ? 'Usar esta carpeta' : 'Conectar'}</button>
        </form>`;
  return `<p class="intro">Lo que el director necesita para trabajar: dónde está el proyecto, qué es y, después del diagnóstico, a dónde quieres llegar. En el repositorio solo escribe su memoria (la rama <code>stl</code>) y lo que tú apruebes.</p>
  <div class="dos-columnas">
    <div>
      <section class="panel-d" data-ancla="p-repositorio">
        <h3>1. Dónde está</h3>
        ${info ? `<p class="bien-repo">✓ ${esc(info.ruta)}</p>
          <p class="como">Su memoria (la ruta, las notas, los documentos del director) vive en ese repositorio, en la rama <code>stl</code>, abierta en la carpeta <code>.stl</code>. Sube a su nube solo si tú lo pides.</p>
          <details class="detalles-repo"><summary>Detalles del repositorio</summary>
            <dl class="info-repo">
              <dt>Rama</dt><dd>${esc(info.rama)}</dd>
              <dt>Historial</dt><dd>${info.commits.toLocaleString('es')} commits · ${info.archivos.toLocaleString('es')} archivos en git${info.sinCommit ? ` · ${info.sinCommit} con cambios sin commit` : ''}</dd>
              <dt>Último commit</dt><dd>${info.ultimo ? `${fecha(info.ultimo.fecha)} · ${esc(info.ultimo.autor)}: «${esc(info.ultimo.asunto)}»` : '—'}</dd>
              <dt>Remoto</dt><dd>${esc(info.remoto ?? 'ninguno (solo local)')}</dd>
            </dl>
            <p class="como">¿Moviste la carpeta? Elige dónde quedó (la carpeta guarda su memoria, así que el director sigue donde iba).</p>
            ${formRepo}
          </details>`
        : `<p class="como">La carpeta del proyecto en <b>este computador</b>.</p>${formRepo}${r.error ? `<p class="aviso remoto">${esc(r.error)}</p>` : ''}`}
      </section>
      <section class="panel-d" data-ancla="p-contexto">
        <h3>2. Qué es el proyecto y qué buscas <span class="chip ${esNuevo() ? 'apoyo' : 'foco'}">${esNuevo() ? 'Proyecto nuevo' : 'Proyecto existente'}</span></h3>
        <p class="como">${esNuevo() ? 'Cuéntalo sin pulir, como se lo dirías a alguien que llega nuevo. Con esto el director hace el planteamiento y te propone metas.' : 'El director lo detecta al leer el repositorio y lo deja escrito aquí. Corrígelo o complétalo si hace falta (prioridades, lo que está a medias) y guárdalo.'}${t ? '' : ' Lo escribe el titular.'}</p>
        <form id="form-proyecto" class="form-proyecto">
          <label>Nombre del proyecto<input type="text" name="nombre" value="${esc(p.nombre)}" required${soloLectura} /></label>
          ${(() => {
            // Lo que el director ya sabe del proyecto llena el campo vacío; queda dicho que es suyo y que se puede cambiar
            const det = d.plan.detectado;
            const ctx = p.contexto || det?.contexto || '';
            const meta = p.metaInicial || det?.meta || '';
            const marca = (usa: boolean, texto: string) => (usa ? `<small class="detectado">✦ ${texto}</small>` : '');
            return `<label class="ancho">Qué es, para quién y en qué punto está<textarea name="contexto" rows="5"${soloLectura} placeholder="Ej.: una app para que los talleres agenden citas. La usan 3 talleres de prueba. El código lo hice yo solo en 6 meses…">${esc(ctx)}</textarea>${marca(!p.contexto && !!det?.contexto, 'Lo detectó el director al leer el repositorio: corrígelo si hace falta y guárdalo.')}</label>
          <label class="ancho">${esNuevo() ? 'Qué quieres lograr, en tus palabras' : 'Tu meta'}<textarea name="metaInicial" rows="3"${soloLectura} placeholder="Ej.: que 20 talleres paguen por ella antes de fin de año, sin que se caiga">${esc(meta)}</textarea>${marca(!p.metaInicial && !!det?.meta, 'Meta sugerida por el director, según lo que detectó: complétala o reemplázala con la tuya. La fijas en «3. La meta».')}</label>`;
          })()}
          ${esNuevo() ? `<label class="ancho">¿Cuándo se considera completo?<textarea name="terminado" rows="2"${soloLectura} placeholder="Ej.: cuando 20 talleres paguen la suscripción dos meses seguidos">${esc(p.terminado ?? '')}</textarea></label>` : ''}
          <details class="ancho mas-datos"><summary>Más datos del repositorio (opcional)</summary>
            <div class="form-proyecto">
              <label>Dirección en la web<input type="text" name="url" value="${esc(p.repositorio.url)}"${soloLectura} placeholder="https://github.com/…" /></label>
              <label>Rama principal<input type="text" name="rama" value="${esc(p.repositorio.rama || info?.rama || '')}"${soloLectura} placeholder="main" /></label>
            </div>
          </details>
          ${t ? '<div class="botones"><button type="submit" class="primario">Guardar</button></div>' : ''}
        </form>
      </section>
      <section class="panel-d" data-ancla="p-objetivo">
        <h3>3. La meta</h3>
        ${o ? `<div class="objetivo-firmado">
            <span class="etiqueta">Meta fijada · ${fecha(o.firmado.fecha)} · ${esc(o.firmado.quien)}</span>
            <p class="obj-texto">${esc(o.texto)}</p>
            <p><b>Cómo sabremos que se cumplió:</b> ${esc(o.exito)}</p>
            ${o.horizonte ? `<p><b>Horizonte:</b> ${esc(o.horizonte)}</p>` : ''}
            <div class="acciones-p">${t ? '<button type="button" data-reabrir-objetivo>Cambiar la meta</button>' : ''}<button type="button" class="al-director" data-comentar="objetivo|">✉ Comentar al director</button></div>
          </div>`
        : `<p class="como">Una meta clara dice <b>qué se logra</b> y <b>cómo se sabe que se logró</b> (un número o un hecho que se pueda comprobar). ${d.plan.diagnostico.fecha ? 'Elige uno de los que propone el director, mézclalos o escribe el tuyo.' : 'El director recomienda firmarlo después del diagnóstico: así se mide contra lo que de verdad hay.'}</p>
          ${candidatos.length ? `<div class="candidatos">${candidatos.map((c) => `<article class="candidato${b.candidato === c.id ? ' sel' : ''}" data-ancla="objetivo-${esc(c.id)}">
              <b>${esc(c.texto)}</b>
              <p><span class="tit">Éxito</span> ${esc(c.exito)}</p>
              <p><span class="tit">Por qué</span> ${esc(c.porQue)}</p>
              ${c.riesgo ? `<p><span class="tit">Riesgo</span> ${esc(c.riesgo)}</p>` : ''}
              ${c.horizonte ? `<p><span class="tit">Horizonte</span> ${esc(c.horizonte)}</p>` : ''}
              <div class="acciones-p">${t ? `<button type="button" data-usar-candidato="${esc(c.id)}">Usar este</button>` : ''}<button type="button" class="al-director" data-comentar="objetivo|${esc(c.id)}">✉ Comentar</button></div>
            </article>`).join('')}</div>` : ''}
          ${t ? `<form id="form-objetivo" class="form-proyecto">
            <input type="hidden" name="candidato" value="${esc(b.candidato)}" />
            <label class="ancho">La meta: a dónde quieres llegar<textarea name="texto" rows="2" required placeholder="Ej.: 20 talleres pagando la suscripción">${esc(b.texto)}</textarea></label>
            <label class="ancho">Cómo sabremos que se cumplió<textarea name="exito" rows="2" required placeholder="Ej.: 20 cobros mensuales recurrentes registrados en la pasarela">${esc(b.exito)}</textarea></label>
            <label>Horizonte (opcional: un hito, no un plazo)<input type="text" name="horizonte" value="${esc(b.horizonte)}" placeholder="Ej.: antes de abrir a otra ciudad" /></label>
            <div class="botones"><button type="submit" class="primario">Fijar esta meta</button></div>
          </form>` : '<p class="nota-rol">La meta la fija el titular.</p>'}`}
        ${(p.objetivosAnteriores ?? []).length ? `<h3>Metas anteriores</h3><ul class="adelantado">${p.objetivosAnteriores!.map((x) => `<li>«${esc(x.texto)}» <small>(firmado el ${fecha(x.firmado.fecha)}, reabierto el ${fecha(x.reabierto.fecha)}: ${esc(x.reabierto.nota ?? '')})</small></li>`).join('')}</ul>` : ''}
      </section>
    </div>
    <div>
      <section class="panel-d" data-ancla="p-equipo">
        <h3>El equipo</h3>
        <p class="como">Cada persona trabaja en su computador y firma con su identidad de git: el Estudio la reconoce por su correo. El titular decide; los demás hacen sus misiones y le escriben al director.</p>
        <ul class="lista-equipo">${(p.equipo.length ? p.equipo : [{ id: TITULAR, nombre: nombrePersona(TITULAR), correo: d.identidad.correo, cargo: 'Director de proyecto (se registra al guardar)' }])
          .map((i) => `<li><span class="monograma">${esc(i.nombre.charAt(0))}</span><div><b>${esc(i.nombre)}</b>${i.id === TITULAR ? ' <span class="chip foco">Titular</span>' : ''}<small>${esc(i.cargo ?? '')}${i.cargo ? ' · ' : ''}${esc(i.correo)}</small></div>${t && i.id !== TITULAR ? `<button type="button" data-quitar-integrante="${esc(i.id)}">Quitar</button>` : ''}</li>`)
          .join('')}</ul>
        ${t ? `<form id="form-integrante" class="form-proyecto">
          <label>Nombre<input type="text" name="nombre" required /></label>
          <label>Correo de git<input type="text" name="correo" required placeholder="el de git config user.email" /></label>
          <label>Cargo<input type="text" name="cargo" placeholder="Ej.: Desarrollo" /></label>
          <label>Su papel<input type="text" name="papel" placeholder="Ej.: el servidor y la base de datos" /></label>
          <div class="botones"><button type="submit">Sumar al equipo</button></div>
        </form>` : ''}
      </section>
      <section class="panel-d" data-ancla="p-sincronizar">
        <h3>Varios computadores</h3>
        <p class="como">Cada decisión queda en un commit local de este Estudio. Si el equipo trabaja en varios computadores, el Estudio necesita un repositorio remoto (<code>origin</code>, por ejemplo en GitHub) y esta opción: así sube solo lo de cada persona, sin forzar nada, y trae lo de los demás cada 30 segundos.</p>
        <label class="interruptor-s"><input type="checkbox" data-sincronizar${p.sincronizar ? ' checked' : ''}${t ? '' : ' disabled'} /> Subir solo a GitHub lo que decide cada persona</label>
        <p class="como">${esc(d.sincronizacion.subida?.mensaje ?? '')}</p>
      </section>
    </div>
  </div>`;
}

// ───────────────────────────────────────────── diagnóstico

function estrellas(n: number) {
  return `<span class="estrellas" title="${n} de 5: qué tan listo está para lo que pide la meta">${'★'.repeat(n)}<span class="vacia">${'★'.repeat(5 - n)}</span></span>`;
}

function vistaDiagnostico() {
  const dg = d.plan.diagnostico;
  if (!dg.fecha) {
    return esNuevo()
      ? `<div class="panel-d sin-diagnostico">
      <h3>Todavía no hay planteamiento</h3>
      <p>Este proyecto es nuevo: no hay repositorio que diagnosticar. El director parte de lo que le cuentes y te devuelve un planteamiento: lo que entendió, el alcance, los supuestos, los riesgos y las preguntas abiertas, con dos o tres objetivos para firmar.</p>
      <ol class="ritmo">
        <li>Cuenta el proyecto: qué es, qué quieres lograr y cuándo estará completo. ${botonIr({ vista: 'proyecto', ancla: 'p-contexto', etiqueta: 'Ir a Proyecto' })}</li>
        <li>Oprime <b>«Pedir revisión»</b>, arriba: el Studio llama al director.</li>
      </ol></div>`
      : `<div class="panel-d sin-diagnostico">
      <h3>Todavía no hay diagnóstico</h3>
      <p>El director lee el repositorio: su historial, su estructura, su documentación y su código. Detecta lo que está en curso y hacia dónde apunta el proyecto según sus propios documentos, te dice con franqueza qué está listo, qué falta y qué riesgos ve, y te propone dos o tres objetivos.</p>
      <ol class="ritmo">
        <li>Comprueba que el repositorio está conectado. ${botonIr({ vista: 'proyecto', ancla: 'p-repositorio', etiqueta: 'Ir a Proyecto' })}</li>
        <li>Oprime <b>«Pedir revisión»</b>, arriba: el Studio llama al director.</li>
      </ol></div>`;
  }
  const actual = faseActual(d.plan, d.estado);
  const esfuerzo = d.senales.esfuerzo ? repartoPorFrente(d.senales.esfuerzo.commits) : {};
  const equipo = [...d.plan.boletin].reverse().find((b) => b.para === 'equipo');
  return `<p class="intro">${esNuevo() ? 'Planteamiento' : 'Diagnóstico'} del director del ${fecha(dg.fecha)}. Las estrellas dicen qué tan listo está cada frente para lo que pide el objetivo, no cuánto se ha trabajado en él. ¿Algo no te cuadra? Coméntalo donde lo leas: el director lo revisa y lo corrige en un documento nuevo.</p>
    ${equipo ? `<div class="panel-d boletin-equipo"><h3>Boletín del equipo · ${fecha(equipo.fecha)}</h3><div class="notas-boletin">${Object.entries(equipo.notas).map(([k, v]) => `<span><span class="nota-letra ${v}">${v}</span>${esc(k)}</span>`).join('')}</div><p>${esc(equipo.comentario)}</p></div>` : ''}
    <ul class="resumen-d" data-ancla="d-resumen">${dg.resumen.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
    <p><button type="button" class="al-director" data-comentar="diagnostico|">✉ Comentar el diagnóstico al director</button></p>
    ${(d.plan.objetivos ?? []).length ? `<h3 data-ancla="d-objetivos">Las metas que propone el director</h3>
      <div class="candidatos">${d.plan.objetivos.map((c) => `<article class="candidato${d.proyecto.objetivo?.candidato === c.id ? ' sel' : ''}">
        <b>${esc(c.texto)}</b><p><span class="tit">Éxito</span> ${esc(c.exito)}</p><p><span class="tit">Por qué</span> ${esc(c.porQue)}</p>${c.riesgo ? `<p><span class="tit">Riesgo</span> ${esc(c.riesgo)}</p>` : ''}
        <div class="acciones-p">${d.proyecto.objetivo ? (d.proyecto.objetivo.candidato === c.id ? '<span class="chip foco">El firmado</span>' : '') : titular() ? `<button type="button" data-usar-candidato="${esc(c.id)}">Usar este</button>` : ''}<button type="button" class="al-director" data-comentar="objetivo|${esc(c.id)}">✉ Comentar</button></div>
      </article>`).join('')}</div>` : ''}
    <h3 data-ancla="d-frentes">Frente por frente <small>· su papel en «${esc(actual.nombre)}»</small></h3>
    <div class="rejilla-frentes">${d.plan.frentes
      .map((x) => {
        const g = dg.frentes[x.id];
        const t = trabajoDe(actual, x.id);
        if (!g) return '';
        return `<article class="tarjeta-frente">
          <header><b>${esc(x.nombre)}</b>${estrellas(g.nota)}</header>
          <p class="veredicto-f">${esc(g.veredicto)}</p>
          <div class="listas"><div><span class="tit">Hecho</span><ul>${g.hecho.map((h) => `<li>${esc(h)}</li>`).join('')}</ul></div>
            <div><span class="tit">Falta</span><ul>${g.falta.map((h) => `<li>${esc(h)}</li>`).join('')}</ul></div></div>
          <div class="pie">${chipNivel(t.nivel)}<span>${esc(t.que)}</span></div>
          <div class="pie"><span>Esfuerzo de los últimos 7 días: ${pct(esfuerzo[x.id] ?? 0)}</span>${x.rutas.length ? `<span>· ${x.rutas.map(esc).join(', ')}</span>` : ''}</div>
          <div class="pie"><button type="button" class="al-director" data-comentar="diagnostico||${esc(x.id)}">✉ Comentar este frente</button></div>
        </article>`;
      })
      .join('')}</div>
    ${dg.fuentes?.length ? `<h3>Lo que leyó el director</h3><ul class="adelantado">${dg.fuentes.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}`;
}

// ───────────────────────────────────────────── frentes por fase y excepciones

function vistaFrentes() {
  const actual = faseActual(d.plan, d.estado);
  const sel = celda && d.plan.fases.find((f) => f.id === celda!.fase);
  const activas = excepcionesActivas(d.estado, d.hoy);
  const recientes = d.estado.excepciones.filter((e) => !activas.includes(e)).slice(-8).reverse();
  return `<p class="intro">Lo que hace cada frente en cada fase. <b>En foco</b>: la prioridad de la fase. <b>De apoyo</b>: se trabaja, limitado a lo que dice la celda. <b>En espera</b>: no se abre trabajo nuevo; si de verdad hace falta, se registra una excepción con su razón. Clic en una celda para leerla.</p>
    <div style="overflow-x:auto"><table class="matriz">
      <thead><tr><th></th>${d.plan.fases.map((f) => `<th class="${f === actual ? 'actual' : ''}">${numeroFase(f)}. ${esc(f.nombre)}</th>`).join('')}</tr></thead>
      <tbody>${d.plan.frentes
        .map((x) => `<tr><th>${esc(x.nombre)}${x.rutas.length ? `<small class="rutas-f">${x.rutas.map(esc).join(', ')}</small>` : ''}</th>${d.plan.fases
          .map((f) => {
            const t = trabajoDe(f, x.id);
            const es = celda?.frente === x.id && celda?.fase === f.id;
            return `<td class="${f === actual ? 'actual' : ''}"><button type="button" class="${t.nivel}${es ? ' sel' : ''}" data-celda="${esc(x.id)}|${esc(f.id)}" title="${esc(t.que)}">${NOMBRE_NIVEL[t.nivel]}</button></td>`;
          })
          .join('')}</tr>`)
        .join('')}</tbody></table></div>
    ${sel ? `<div class="panel-d detalle-celda"><b>${esc(nombreFrente(celda!.frente))}</b> en <b>${esc(sel.nombre)}</b> ${chipNivel(trabajoDe(sel, celda!.frente).nivel)}<p>${esc(trabajoDe(sel, celda!.frente).que)}</p></div>` : ''}
    <h3>Excepciones abiertas <small>· trabajo fuera de orden, con su razón</small></h3>
    ${activas.length ? `<ul class="excepciones">${activas
      .map((e) => `<li><span><b>${esc(nombreFrente(e.frente))}</b>: ${esc(e.motivo)} <small>(${esc(e.quien)}, hasta el ${fecha(e.hasta)})</small></span><button type="button" data-cerrar-excepcion="${esc(e.id)}">Cerrar</button></li>`)
      .join('')}</ul>` : '<p class="intro">Ninguna. Todo el trabajo va en orden.</p>'}
    <p><button type="button" data-nueva-excepcion>Registrar una excepción</button></p>
    ${recientes.length ? `<h3>Excepciones anteriores</h3><ul class="excepciones">${recientes
      .map((e) => `<li class="cerrada"><span><b>${esc(nombreFrente(e.frente))}</b>: ${esc(e.motivo)} <small>(${esc(e.quien)}, ${fecha(e.fecha)}${e.cerrada ? `; cerrada por ${esc(e.cerrada.quien)}` : '; venció'})</small></span></li>`)
      .join('')}</ul>` : ''}
    ${puedoTrabajar()}`;
}

// ───────────────────────────────────────────── propuestas

/** ¿Ya llegó la ruta a esta fase? Lo de las fases futuras no se muestra: el director lo abre cuando toque. */
const faseAbierta = (id: string) => {
  const f = d.plan.fases.find((x) => x.id === id);
  return !!f && numeroFase(f) <= numeroFase(faseActual(d.plan, d.estado));
};

/**
 * Una propuesta ya decidida (aceptada o descartada) sale de la vista la próxima vez que se carga el Studio; la que se
 * acaba de decidir aquí sigue a la vista, para poder comentarla. «En estudio» (de antes) sigue a la vista, por definir.
 */
const propuestasDecididasAqui = new Set<string>();
const propuestaPasada = (id: string) => !propuestasDecididasAqui.has(id) && ['aceptada', 'descartada'].includes(d.estado.propuestas[id]?.estado ?? '');

function vistaPropuestas() {
  const futuras = d.plan.propuestas.filter((p) => !faseAbierta(p.fase)).length;
  const abiertas = d.plan.propuestas.filter((p) => faseAbierta(p.fase));
  const pasadas = abiertas.filter((p) => propuestaPasada(p.id)).length;
  // Un botón que lleva a una propuesta ya decidida la muestra
  if (anclaPendiente?.startsWith('propuesta-') && propuestaPasada(anclaPendiente.slice(10))) verPropuestasPasadas = true;
  const seVeP = (id: string) => verPropuestasPasadas || !propuestaPasada(id);
  return `<p class="intro">El director propone y ${esc(nombreTitular())} decide. Cualquiera puede comentar una propuesta: el director responde con su recomendación. Una aceptada se vuelve trabajo de su fase; una descartada queda marcada, y el director no la vuelve a proponer. Aquí ves solo las que esperan respuesta: lo que decides sigue a la vista, para comentarlo, hasta que vuelvas a abrir el Studio.</p>
    ${abiertas.length ? '' : '<p class="intro"><b>Todavía no hay propuestas en la fase en curso.</b> El director las trae cuando ve algo que cambiar o decidir.</p>'}
    ${abiertas.length && abiertas.length === pasadas && !verPropuestasPasadas ? '<p class="intro"><b>Ninguna espera respuesta.</b> Las ya decididas están en «Ver las pasadas».</p>' : ''}
    ${pasadas ? `<label class="ver-pasadas"><input type="checkbox" data-ver-pasadas${verPropuestasPasadas ? ' checked' : ''} /> Ver las pasadas (${pasadas} ya ${pasadas === 1 ? 'decidida' : 'decididas'})</label>` : ''}
    ${d.plan.fases
      .map((f) => {
        // Lo que espera respuesta, arriba; lo ya decidido (si se pidió verlo), al final
        const ps = d.plan.propuestas.filter((p) => p.fase === f.id && seVeP(p.id)).sort((a, b) => Number(propuestaPasada(a.id)) - Number(propuestaPasada(b.id)));
        if (!ps.length || !faseAbierta(f.id)) return '';
        return `<h3 data-ancla="fase-${esc(f.id)}">Para decidir en «${esc(f.nombre)}»</h3><div class="propuestas">${ps
          .map((p) => {
            const r = d.estado.propuestas[p.id];
            const notas = d.estado.notas.filter((n) => n.sobre.tipo === 'propuesta' && n.sobre.id === p.id);
            return `<article class="propuesta ${r?.estado ?? ''}" data-ancla="propuesta-${esc(p.id)}">
              <header><b>${esc(p.titulo)}</b><span class="chip">${esc(p.area)}</span>${r ? `<span class="chip ${r.estado === 'aceptada' ? 'foco' : r.estado === 'en_estudio' ? 'espera' : ''}">${NOMBRE_RESPUESTA[r.estado]}</span>` : '<span class="chip espera">Por decidir</span>'}</header>
              <dl><dt>El problema</dt><dd>${esc(p.problema)}</dd><dt>La propuesta</dt><dd>${esc(p.propuesta)}</dd><dt>Qué conecta</dt><dd>${esc(p.conecta)}</dd></dl>
              ${r ? `<div class="firma">${NOMBRE_RESPUESTA[r.estado]} por ${esc(r.quien)} el ${fecha(r.fecha)}${r.nota ? `: ${esc(r.nota)}` : ''}</div>` : ''}
              ${notas.length ? `<ul class="notas-lista">${notas.map((n) => tarjetaNota(n, false)).join('')}</ul>` : ''}
              <div class="respuesta">${titular() ? (['aceptada', 'descartada'] as RespuestaPropuesta[])
                .map((e) => `<button type="button" data-responder="${esc(p.id)}|${e}" class="${r?.estado === e ? 'sel' : ''}"${r?.estado === e ? ' disabled' : ''}>${e === 'aceptada' ? 'Aceptar' : 'Descartar'}</button>`)
                .join('') : ''}<button type="button" class="al-director" data-comentar="propuesta|${esc(p.id)}">✉ Comentar al director</button></div>
            </article>`;
          })
          .join('')}</div>`;
      })
      .join('')}
    ${futuras ? `<p class="intro futuras">${futuras} propuestas más esperan su fase. El director las abre cuando la ruta llegue ahí: decidirlas antes sería adelantarse a lo que todavía no está en firme.</p>` : ''}`;
}

// ───────────────────────────────────────────── validaciones

function vistaValidaciones() {
  const actual = faseActual(d.plan, d.estado);
  const resumen = d.plan.fases
    .map((f) => {
      const vs = d.estado.validaciones.filter((v) => v.fase === f.id && v.tipo !== 'tecnica');
      const personas = vs.reduce((s, v) => s + v.personas, 0);
      if (!personas) return '';
      const log = vs.reduce((s, v) => s + v.lograron, 0), apr = vs.reduce((s, v) => s + v.aprueban, 0);
      return `<li><b>${esc(f.nombre)}:</b> ${personas} ${personas === 1 ? 'persona' : 'personas'} en ${vs.length} ${vs.length === 1 ? 'validación' : 'validaciones'} · lo lograron ${pct((log / personas) * 100)} · lo aprueban ${pct((apr / personas) * 100)}</li>`;
    })
    .join('');
  return `<p class="intro">Gente de afuera usando lo que se hizo: la única forma de saber si funciona de verdad.</p>
    <details class="guia-plegada"><summary>Cómo se hace una validación</summary><p>De 3 a 5 personas que no conocen el proyecto usan lo hecho en una tarea concreta, diciendo en voz alta lo que piensan. Nadie les explica ni les ayuda; tú miras y anotas. Al final, tres preguntas: ¿qué había que hacer?, ¿qué fue lo mejor?, ¿lo volverías a usar (o lo pagarías)? Cuenta más lo que hacen que lo que dicen. Las pruebas técnicas (rendimiento, seguridad, carga) también se registran aquí.</p></details>
    ${resumen ? `<ul class="resumen-d">${resumen}</ul>` : '<p class="intro"><b>Todavía no hay ninguna validación registrada.</b></p>'}
    <h3>Registrar una validación</h3>
    <form class="form-validacion panel-d" id="form-validacion" data-ancla="registrar-validacion">
      <label>Fecha<input type="date" name="fecha" value="${d.hoy}" required /></label>
      <label>Fase<select name="fase">${d.plan.fases.map((f) => `<option value="${esc(f.id)}"${f === actual ? ' selected' : ''}>${esc(f.nombre)}</option>`).join('')}</select></label>
      <label>Tipo<select name="tipo">${TIPOS_VALIDACION.map((t) => `<option value="${t}"${t === tipoValidacionInicial ? ' selected' : ''}>${NOMBRE_TIPO[t]}</option>`).join('')}</select></label>
      <label>Personas (o casos)<input type="number" name="personas" min="1" value="5" required /></label>
      <label>Lo lograron sin ayuda<input type="number" name="lograron" min="0" value="0" /></label>
      <label>Lo aprueban o lo volverían a usar<input type="number" name="aprueban" min="0" value="0" /></label>
      <label class="ancho">Contexto<input type="text" name="contexto" placeholder="Ej.: dueños de taller, en su celular, en su taller; o cifras si es técnica" /></label>
      <label class="ancho">Lo mejor, según ellos<textarea name="loMejor" rows="2"></textarea></label>
      <label class="ancho">Lo que se vio (dónde se perdieron, qué no entendieron, qué les gustó)<textarea name="hallazgos" rows="3"></textarea></label>
      <label class="ancho">Qué cambiamos por esto<textarea name="cambios" rows="2"></textarea></label>
      <div class="botones"><button type="submit" class="primario">Registrar la validación</button></div>
    </form>
    ${d.estado.validaciones.length ? `<h3>Validaciones registradas</h3><ul class="lista-validaciones">${[...d.estado.validaciones]
      .reverse()
      .map((v) => `<li><header><b>${fecha(v.fecha)} · ${NOMBRE_TIPO[v.tipo]} · ${v.personas} ${v.personas === 1 ? 'persona' : 'personas'}</b><span class="chip">${esc(nombreFase(v.fase))}</span>
          ${titular() || v.quien === d.identidad.nombre ? `<button type="button" data-borrar-validacion="${esc(v.id)}">Borrar</button>` : ''}</header>
          <p>Lo lograron ${v.lograron} · lo aprueban ${v.aprueban} · registró ${esc(v.quien)}${v.contexto ? ` · ${esc(v.contexto)}` : ''}</p>
          ${v.loMejor ? `<p><b>Lo mejor:</b> ${esc(v.loMejor)}</p>` : ''}${v.hallazgos ? `<p><b>Lo que se vio:</b> ${esc(v.hallazgos)}</p>` : ''}${v.cambios ? `<p><b>Qué cambiamos:</b> ${esc(v.cambios)}</p>` : ''}</li>`)
      .join('')}</ul>` : ''}`;
}

// ───────────────────────────────────────────── esfuerzo

function vistaEsfuerzo() {
  const e = d.senales.esfuerzo;
  if (!e) return `<p class="intro">${d.repositorio.info ? 'No se pudo leer el historial de git del repositorio.' : 'El esfuerzo se mide con los commits del repositorio del proyecto: conéctalo en Proyecto.'}</p>`;
  const actual = faseActual(d.plan, d.estado);
  const nivel = repartoPorNivel(actual, e.commits);
  const frente = repartoPorFrente(e.commits);
  const filas = [...d.plan.frentes.map((x) => x.id), 'otros']
    .map((id) => ({ id, v: frente[id] ?? 0, n: id === 'otros' ? 'otros' : trabajoDe(actual, id).nivel }))
    .sort((a, b) => b.v - a.v);
  const max = Math.max(1, ...filas.map((f) => f.v));
  const dias = [...new Set(e.commits.map((c) => c.fecha))].sort().reverse();
  const validaciones = d.estado.validaciones.filter((v) => v.fecha >= e.desde).length;
  const segmento = (k: keyof typeof nivel, nombre: string) => (nivel[k] > 0 ? `<div class="${k}" style="width:${nivel[k]}%" title="${nombre}: ${pct(nivel[k])}">${nivel[k] >= 8 ? `${nombre} ${pct(nivel[k])}` : ''}</div>` : '');
  const porPersona = personasEquipo().map((p) => {
    const cs = e.commits.filter((c) => c.autor === p);
    const f = cs.length ? repartoPorNivel(actual, cs).foco : null;
    return `<li><b>${esc(nombrePersona(p))}:</b> ${cs.length} commits · ${f === null ? 'sin commits propios' : `${pct(f)} en foco, nota ${notaFoco(f)}`}</li>`;
  }).join('');
  return `<p class="intro">Los ${e.commits.length} commits del repositorio del proyecto del ${fecha(e.desde)} al ${fecha(e.hasta)}, repartidos por frente según sus archivos. Las ${e.decisiones} decisiones del Estudio (entregar, comentar, marcar) se cuentan aparte: son un clic, no trabajo. Las validaciones no hacen commits: en estos días se registraron <b>${validaciones}</b>.</p>
    <h3>Según la fase en curso («${esc(actual.nombre)}»)</h3>
    <div class="reparto">${segmento('foco', 'En foco')}${segmento('apoyo', 'De apoyo')}${segmento('espera', 'En espera')}${segmento('otros', 'Otros')}</div>
    <p class="leyenda-d"><span><i style="background:#3b8a5a"></i>En foco ${pct(nivel.foco)}</span><span><i style="background:#5b86c5"></i>De apoyo ${pct(nivel.apoyo)}</span><span><i style="background:#d39a3a"></i>En espera ${pct(nivel.espera)}</span><span><i style="background:#b9b5aa"></i>Otros ${pct(nivel.otros)}</span><span>La meta del director: 60 % o más en foco y poco en espera.</span></p>
    <h3>Por persona</h3><ul class="resumen-d">${porPersona}</ul>
    <h3>Por frente</h3>
    <div class="barras">${filas
      .map((f) => `<div class="fila-barra"><span>${esc(f.id === 'otros' ? 'Otros' : nombreFrente(f.id))} ${f.id === 'otros' ? '' : chipNivel(f.n as Nivel)}</span><div class="pista-b"><div class="${f.n}" style="width:${((f.v / max) * 100).toFixed(1)}%"></div></div><span class="valor">${pct(f.v)}</span></div>`)
      .join('')}</div>
    <h3>Día por día</h3>
    <table class="dias"><thead><tr><th>Día</th><th>Commits</th><th>En foco</th><th>En espera</th></tr></thead><tbody>${dias
      .map((dia) => {
        const cs = e.commits.filter((c) => c.fecha === dia);
        const r = repartoPorNivel(actual, cs);
        return `<tr><td>${fecha(dia)}</td><td>${cs.length}</td><td>${pct(r.foco)}</td><td>${pct(r.espera)}</td></tr>`;
      })
      .join('')}</tbody></table>`;
}

// ───────────────────────────────────────────── el método y la bitácora

function vistaMetodo() {
  return `<p class="intro">Cómo trabaja el equipo con el director en este proyecto, y lo que enseñan los mejores métodos de dirección de proyectos, con su fuente y lo que significa para este proyecto. La metodología, explicada desde cero, está en <button type="button" class="enlace" data-vista="stl">Qué es STL</button>.</p>
    <h3>Cómo funciona el director</h3>
    <ol class="ritmo">
      <li><b>El arranque:</b> conectas el repositorio y cuentas qué buscas; el director lo diagnostica y propone metas; ${esc(nombreTitular())} fija una; el director traza la ruta.</li>
      <li><b>El director asigna:</b> en Misiones, cada uno ve su misión de ahora, paso a paso, y por qué. Una a la vez.</li>
      <li><b>Ustedes hacen y entregan:</b> cada paso se marca con su estrella y, al marcar el último, la misión queda entregada. Los documentos se leen y se comentan aquí mismo, parte por parte.</li>
      <li><b>Ustedes opinan:</b> lo que no les guste, en el Buzón o en «Comentar», escrito o grabado. Se corrige o se borra hasta la revisión.</li>
      <li><b>El director revisa:</b> cuando ${esc(nombreTitular())} pide la revisión («Pedir revisión», o «revisa estudio» en su sesión), el director transcribe los audios, lee todo junto y responde. Aprueba o pide rehacer cada entrega, contesta cada nota, ajusta la ruta, asigna la misión siguiente y pone el boletín.</li>
      <li><b>${esc(nombreTitular())} decide:</b> fija la meta, responde las propuestas, tiene la última palabra sobre cada criterio y cruza las puertas.</li>
    </ol>
    <p>${botonIr({ doc: 'docs/metodo/metodologia.md', etiqueta: 'Leer el método completo' })}</p>
    <h3>El ritmo</h3><ol class="ritmo">${d.plan.ritmo.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>
    <h3>Lecciones de los mejores</h3><div class="lecciones">${d.plan.lecciones
      .map((l) => `<article class="leccion"><b>${esc(l.titulo)}</b><span class="quien">${esc(l.quien)}</span><span>${esc(l.que)}</span><span class="para"><b>Para este proyecto:</b> ${esc(l.paraElProyecto)}</span><a href="${esc(l.fuente)}" target="_blank" rel="noopener noreferrer">${esc(l.fuente)}</a></article>`)
      .join('')}</div>`;
}

function vistaBitacora() {
  return `<p class="intro">Cada decisión tomada en el Estudio, firmada. Queda en un commit de git como las demás decisiones.</p>
    <form id="form-nota" class="panel-d form-nota">
      <textarea name="texto" rows="2" aria-label="Una nota para la bitácora" placeholder="Una nota para la bitácora (una decisión, algo que se aprendió)"></textarea>
      <button type="submit">Anotar</button></form>
    <ul class="bitacora">${[...d.estado.bitacora]
      .reverse()
      .map((b) => `<li><span class="f">${fecha(b.fecha)}</span><span class="q">${esc(b.quien)}</span><span>${esc(b.texto)}</span></li>`)
      .join('')}</ul>`;
}

// ───────────────────────────────────────────── «Qué es STL»: el recorrido y la documentación del Studio

/** La documentación del propio Studio (docs/ en su carpeta): se trae una vez, al abrir su pestaña. */
let docsStudio: { ruta: string; titulo: string; texto: string }[] | null = null;
const pestanaStl = () => localStorage.getItem('estudio.stl.pestana') ?? 'recorrido';

/**
 * «Qué es STL» es el «acerca de» del Studio: el recorrido y, en pestañas, su documentación (la metodología, el diseño…).
 * Va aparte de los documentos de cada proyecto, para no mezclar lo del Studio con el trabajo del proyecto.
 */
function vistaStl(conProyectos: boolean): string {
  const sel = pestanaStl();
  const pestanas = [{ ruta: 'recorrido', titulo: 'El recorrido' }, ...(docsStudio ?? []).map((x) => ({ ruta: x.ruta, titulo: x.titulo }))];
  const barra = `<nav class="pestanas-stl" role="tablist" aria-label="Qué es STL">${pestanas.map((p) => `<button type="button" role="tab" class="pestana-stl${p.ruta === sel ? ' sel' : ''}" data-pestana-stl="${esc(p.ruta)}" aria-selected="${p.ruta === sel}">${esc(p.titulo)}</button>`).join('')}${docsStudio ? '' : '<button type="button" class="pestana-stl" data-pestana-stl="cargar">La documentación del Studio…</button>'}</nav>`;
  if (!docsStudio && !cargandoDocsStudio) {
    cargandoDocsStudio = true;
    void cargarDocsStudio().then(() => repintarStl(conProyectos));
  }
  const elegido = docsStudio?.find((x) => x.ruta === sel);
  const cuerpo = sel === 'recorrido' || !elegido
    ? paginaSTL({ conProyectos, conPestanas: true })
    : `<article class="lector doc-studio ${claseLector()}"><p class="como">${icono('documentos')} De la documentación del Studio (${esc(elegido.ruta)}): para leer y consultar. Lo que quieras decir del Studio, díselo al director en su proyecto.</p>${marked.parse(elegido.texto, { async: false }) as string}</article>`;
  return `${barra}${cuerpo}`;
}

let cargandoDocsStudio = false;
async function cargarDocsStudio() {
  if (docsStudio) return;
  const r = await fetch('/__estudio/director/studio-docs').catch(() => null);
  docsStudio = r?.ok ? (await r.json()).documentos : [];
}

/** Repinta «Qué es STL» (con o sin proyectos), en la parada en que ibas. */
function repintarStl(conProyectos: boolean) {
  if (vista !== 'stl') return;
  if (d) return pintar();
  const v = $('vista');
  v.innerHTML = vistaStl(conProyectos);
  restaurarParada(v);
}

// ───────────────────────────────────────────── pintar y eventos

function pintar() {
  if (!d) return; // aún cargando: se pinta al llegar los datos
  if (animandoParte) return; // marcarParte repinta al terminar el efecto
  destinos = [];
  pintarSelectorProyecto(d.proyectos, d.activo);
  pintarQuien();
  pintarSincronizacion();
  pintarMando();
  pintarNavegacion();
  const v = $('vista');
  const errores = d.errores.length ? `<p class="aviso remoto">La ruta o el estado tienen errores (díselo al director): ${d.errores.map(esc).join(' ')}</p>` : '';
  const html = {
    misiones: vistaMisiones, buzon: vistaBuzon, documentos: vistaDocumentos, ruta: vistaRuta, propuestas: vistaPropuestas,
    proyectos: vistaProyectos, proyecto: vistaProyecto, diagnostico: vistaDiagnostico, frentes: vistaFrentes, validaciones: vistaValidaciones, esfuerzo: vistaEsfuerzo,
    metodo: vistaMetodo, bitacora: vistaBitacora, stl: () => vistaStl(true), preguntas: vistaPreguntas,
  }[vista]();
  v.innerHTML = errores + html;
  // El modo enfoque solo vale en un documento abierto: en otra sección se apaga
  if (enfoque && (vista !== 'documentos' || !doc)) enfoque = false;
  aplicarEnfoque();
  if (vista === 'stl') restaurarParada(v);
  if (vista === 'documentos' && irASeccion !== null) {
    const parte = [...v.querySelectorAll<HTMLElement>('[data-parte]')].find((x) => x.dataset.parte === irASeccion);
    // Un documento abre arriba del todo, salvo que el paso nombre una de sus partes o que ya hayas leído algo:
    // entonces abre en el comienzo de la primera parte que te falta, para seguir donde ibas
    // Una parte que aún está cerrada no se salta: se va a la que toca leer ahora
    const cerrada = !!parte?.classList.contains('cerrada');
    const falta = doc && (leidasDe(doc.ruta).length || cerrada) ? v.querySelector<HTMLElement>('.parte-doc.por-leer') : null;
    if (cerrada) decir(`«${irASeccion}» se abre al terminar la parte de ahora: una a la vez.`, 'pensativo');
    if (irASeccion && parte && !cerrada) resaltar(parte);
    else if (falta) {
      const cabeza = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--alto-cabeza')) || 0;
      window.scrollTo({ top: Math.max(0, falta.getBoundingClientRect().top + window.scrollY - cabeza - 12) });
    } else window.scrollTo({ top: 0 });
    irASeccion = null;
  }
  if (anclaPendiente) {
    resaltar(v.querySelector<HTMLElement>(`[data-ancla="${CSS.escape(anclaPendiente)}"]`));
    anclaPendiente = null;
  }
  tipoValidacionInicial = null;
}

function irA(nueva: Vista) {
  const otra = nueva !== vista;
  vista = nueva;
  localStorage.setItem('estudio.director.pestana', nueva);
  cerrarMenuMovil();
  if (otra) window.scrollTo({ top: 0 });
  if (nueva === 'documentos' && !documentos) cargarDocumentos().then(pintar).catch(() => undefined);
  // Sin un documento abierto, Documentos abre el que sigue en el orden de lectura
  if (nueva === 'documentos' && !doc && d) {
    const enCola = lecturaDe(personaVista() ?? d.identidad.rol ?? TITULAR);
    const siguiente = enCola.find((x) => x.lectura === 'siguiente') ?? enCola.find((x) => x.lectura === 'leido');
    if (siguiente) return void abrirDocumento(siguiente.ruta);
  }
  pintar();
}

// ───────────────────────────────────────────── eventos

function cerrarMenuMovil() {
  document.body.classList.remove('menu-abierto');
  $('velo-menu').hidden = true;
  $('abrir-menu').setAttribute('aria-expanded', 'false');
}
$('abrir-menu').addEventListener('click', () => {
  document.body.classList.add('menu-abierto');
  $('velo-menu').hidden = false;
  $('abrir-menu').setAttribute('aria-expanded', 'true');
  $('lateral').querySelector<HTMLElement>('.item-nav.sel, .item-nav')?.focus();
});
$('cerrar-menu').addEventListener('click', cerrarMenuMovil);
// En pantallas anchas, la barra lateral se pliega para dejar todo el ancho a lo que haces (es de este navegador)
for (const id of ['plegar-lateral', 'desplegar-lateral']) {
  $(id).addEventListener('click', () => {
    const plegada = document.documentElement.classList.toggle('lateral-plegada');
    localStorage.setItem('estudio.lateral', plegada ? 'plegada' : 'abierta');
    $(plegada ? 'desplegar-lateral' : 'plegar-lateral').focus();
  });
}
$('velo-menu').addEventListener('click', cerrarMenuMovil);

// La barra lateral: el selector de proyecto y su menú
$('lateral').addEventListener('click', async (e) => {
  const t = e.target as HTMLElement;
  const plegado = t.closest('details.plegable > summary')?.parentElement as HTMLDetailsElement | undefined;
  if (plegado) localStorage.setItem(CLAVE_SEGUIMIENTO, plegado.open ? '0' : '1');
  if (t.closest('#proyecto-activo')) return abrirMenuProyectos(Boolean($('menu-proyectos').hidden));
  const cambiar = t.closest<HTMLElement>('[data-cambiar]');
  if (cambiar) {
    abrirMenuProyectos(false);
    cerrarMenuMovil();
    if (cambiar.dataset.cambiar === d?.activo) return void (await mostrarDondeQuedamos());
    return void (await activar(cambiar.dataset.cambiar!));
  }
  const config = t.closest<HTMLElement>('[data-config-proyecto]');
  if (config) {
    abrirMenuProyectos(false);
    cerrarMenuMovil();
    return void (await activar(config.dataset.configProyecto!, { vista: 'proyecto', etiqueta: 'Configuración del proyecto' }));
  }
  if (t.closest('[data-ver-proyectos]')) {
    abrirMenuProyectos(false);
    return irA('proyectos');
  }
  if (t.closest('[data-nuevo-proyecto]')) return abrirMenuProyectos(false); // lo abre el manejador de todo el documento
});
// El menú de proyectos se cierra al hacer clic afuera o con Esc; con Esc también el menú del teléfono
document.addEventListener('click', (e) => {
  if (!$('menu-proyectos').hidden && !(e.target as HTMLElement).closest('#selector-proyecto')) abrirMenuProyectos(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || document.querySelector('dialog[open]')) return;
  if (!$('menu-proyectos').hidden) {
    abrirMenuProyectos(false);
    $('proyecto-activo').focus();
  }
  cerrarMenuMovil();
});

// Cualquier botón que lleve a una sección (la barra lateral, «Qué es STL», un enlace dentro de un texto)
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-vista]');
  if (!b || b.closest('dialog')) return;
  const v = b.dataset.vista as Vista;
  if (!VISTAS.includes(v)) return;
  if (d) return irA(v);
  // Sin proyectos: solo la bienvenida y «Qué es STL»
  vista = v === 'stl' ? 'stl' : 'misiones';
  window.scrollTo({ top: 0 });
  void cargar();
});

// La revisión se pide desde la cabecera, desde lo que pasa en segundo plano y desde el atajo junto a la cara del
// director: los dos últimos viven fuera de la cabecera, así que se escucha en todo el documento
document.addEventListener('click', (e) => {
  const rev = (e.target as HTMLElement).closest<HTMLElement>('[data-revision]');
  if (rev && d) {
    const que = rev.dataset.revision;
    const ahora = estadoRevision();
    // El atajo junto a la cara del director: pide la revisión o dice en qué va
    if (que === 'pedir' || (que === 'atajo' && ahora.estado === 'ninguna')) return void pedirLaRevision(true);
    if (que === 'cancelar') return void pedirLaRevision(false);
    return avisar(ahora.texto, ahora.estado !== 'sin_vigilia');
  }
});
$('mando').addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('[data-donde-quedamos]')) return void mostrarDondeQuedamos();
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-ir]');
  if (b) {
    if (b.dataset.ir === 'ruta') faseVista = null;
    irA(b.dataset.ir as Vista);
  }
});

async function comentar(sobre: { tipo: string; id?: string; seccion?: string; decision?: string; fragmento?: string; postura?: string },titulo: string) {
  if (esperaAlDirector()) return false;
  const r = await pedir({
    titulo,
    ayuda: 'Tu comentario queda en el <b>Buzón del director</b>, donde lo puedes corregir o borrar. Cuando se pida la revisión, él lo lee junto con todo lo demás y te responde ahí y debajo de este mismo lugar, con su recomendación; el titular decide.',
    campos: [{ id: 'texto', etiqueta: 'Tu comentario (o graba un audio, o pega una imagen)', tipo: 'area' }],
    boton: 'Dejarlo en el Buzón',
    audio: true,
    adjuntos: true,
    urgente: true,
  });
  return r ? await dejarNota(sobre, r.texto, r.audio, !!r.urgente, r.adjuntos) : false;
}

type Dicho = Record<string, string> & { audio?: string; adjuntos?: { nombre: string; datos: string }[] };
const EN_AUDIO = 'Lo dije en audio: está en el Buzón.';

/**
 * Todo lo que se le dice al director admite los tres canales: escrito, en audio o con imágenes. En un diálogo que no es
 * una nota (entregar, cruzar una puerta, responder una propuesta…), lo dicho en audio y lo adjunto le llegan como nota del
 * Buzón sobre lo mismo. `conAudio: false` cuando la acción ya guarda el audio (la entrega).
 */
async function anexar(r: Dicho, sobre: { tipo: string; id?: string }, rotulo: string, conAudio = true) {
  const audio = conAudio ? r.audio : undefined;
  if (!audio && !r.adjuntos?.length) return;
  await accion({ tipo: 'comentar', sobre, texto: rotulo, ...(audio ? { audio } : {}), ...(r.adjuntos?.length ? { adjuntos: r.adjuntos } : {}) }, 'Lo que dijiste o adjuntaste quedó también en el Buzón, para el director.');
}

/** Deja una nota en el Buzón. Si es urgente, pide la revisión enseguida; el director decide si lo es. */
async function dejarNota(sobre: { tipo: string; id?: string; seccion?: string; decision?: string; fragmento?: string; postura?: string },texto: string | undefined, audio: string | null | undefined, urgente = false, adjuntos?: { nombre: string; datos: string }[]) {
  const ok = await accion({ tipo: 'comentar', sobre, texto, audio, urgente, ...(adjuntos?.length ? { adjuntos } : {}) }, urgente ? 'Quedó en el Buzón, marcada urgente. El director la atiende primero y decide si va ya o qué debe ir antes.' : 'Quedó en el Buzón del director. Te responde cuando revise.');
  // Una urgencia no espera a que alguien pida la revisión: se pide sola (si ya hay una pedida, entra en esa)
  if (ok && urgente && (!d.revision || d.revision.hecha)) await pedirLaRevision(true);
  return ok;
}

$('vista').addEventListener('change', async (e) => {
  const casilla = (e.target as HTMLElement).closest<HTMLInputElement>('[data-paso]');
  if (casilla) {
    const [id, i] = casilla.dataset.paso!.split('|');
    // Un paso de leer no se marca a mano: se termina leyendo (cada parte, con su estrella) o respondiendo lo que pide
    const falta = casilla.checked ? faltaLeer(id, Number(i)) : null;
    if (falta) {
      casilla.checked = false;
      decir(falta.texto, 'pensativo');
      return void ir(falta.ir);
    }
    const guardado = marcarPaso(id, Number(i));
    pintar();
    if (casilla.checked) {
      const m = d.plan.misiones.find((x) => x.id === id);
      const hechos = pasosHechos(id);
      const sigue = m?.pasos.findIndex((_, k) => !hechos.includes(k)) ?? -1;
      const texto = (p: Paso) => (typeof p === 'string' ? p : p.texto);
      if (m && sigue >= 0) decir(`¡Bien! Lo que sigue: ${recortar(texto(m.pasos[sigue]), 110)}`, 'feliz');
      else if (m && (await completarSiToca(id, guardado))) decir('¡Misión completada! Ya la tengo para revisarla.', 'riendo');
    }
    return;
  }
  const s = (e.target as HTMLElement).closest<HTMLSelectElement>('[data-consulta]');
  if (s) {
    consulta = s.value || null;
    pintar();
    return;
  }
  const pasadas = (e.target as HTMLElement).closest<HTMLInputElement>('[data-ver-pasadas]');
  if (pasadas) {
    verPropuestasPasadas = pasadas.checked;
    pintar();
    return;
  }
  const sync = (e.target as HTMLElement).closest<HTMLInputElement>('[data-sincronizar]');
  if (sync) await accion({ tipo: 'sincronizar', activo: sync.checked }, sync.checked ? 'Desde ahora, lo que decide cada persona sube solo a GitHub.' : 'La subida a GitHub quedó apagada: todo queda en commits locales.');
});

/**
 * Todo botón que hace esperar (guardar, llamar al director, cargar) lo dice en él mismo: si a los 300 ms no terminó, se
 * pone en espera, con sus puntos, hasta que termina. Con un diálogo abierto, no: lo que espera es tu respuesta.
 */
$('vista').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!b) return;
  const espera = setTimeout(() => {
    if (!b.isConnected || document.querySelector('dialog[open]')) return;
    b.classList.add('esperando');
    b.setAttribute('aria-busy', 'true');
  }, 300);
  void clicEnVista(b).finally(() => {
    clearTimeout(espera);
    b.classList.remove('esperando');
    b.removeAttribute('aria-busy');
  });
});

async function clicEnVista(b: HTMLButtonElement) {
  const ds = b.dataset;
  if (ds.irProyecto) {
    const destino: Destino = ds.irMision ? { vista: 'misiones', ancla: `mision-${ds.irMision}`, etiqueta: '' } : { vista: (ds.irVista as Destino['vista']) ?? 'misiones', etiqueta: '' };
    await activar(ds.irProyecto, destino);
  } else if (ds.explorarRepo !== undefined) {
    const form = b.closest('form') as HTMLFormElement;
    const campo = form.querySelector<HTMLInputElement>('[name="ruta"]')!;
    const elegida = await elegirCarpeta(campo.value);
    if (elegida) {
      campo.value = elegida;
      form.requestSubmit();
    }
  } else if (ds.activar) {
    await activar(ds.activar);
  } else if (ds.corregirTranscripcion) {
    const audio = ds.corregirTranscripcion;
    const r = await pedir({ titulo: 'Corregir lo que se entendió', ayuda: 'Es lo que leerá el director de tu nota de voz. Corrígelo solo si la transcripción entendió mal: el audio queda igual.', campos: [{ id: 'texto', etiqueta: 'Lo que dijiste', tipo: 'area', valor: d.transcripciones[audio] ?? '', requerido: true }], boton: 'Guardar' });
    if (r && (await accion({ tipo: 'corregir_transcripcion', audio, texto: r.texto }, 'Transcripción corregida.'))) {
      d.transcripciones[audio] = r.texto.trim(); // el .txt ya cambió: se muestra sin esperar a la próxima lectura
      pintar();
    }
  } else if (ds.pestanaStl !== undefined) {
    if (ds.pestanaStl !== 'cargar') localStorage.setItem('estudio.stl.pestana', ds.pestanaStl);
    await cargarDocsStudio();
    repintarStl(!!d);
    window.scrollTo({ top: 0 });
  } else if (ds.letra !== undefined) {
    // Los ajustes de lectura son de este navegador: se aplican sin repintar, para no perder dónde ibas
    localStorage.setItem('estudio.lector.letra', ds.letra);
    const lector = b.closest<HTMLElement>('.lector');
    if (lector) {
      lector.className = `lector ${claseLector()}`;
      lector.querySelector('.ajustes-lector')!.outerHTML = ajustesLector(doc?.ruta ?? '');
    }
  } else if (ds.enfoque !== undefined) {
    // El modo enfoque se atiende en todo el documento (arriba, con el del tema)
  } else if (ds.leidoParte !== undefined) {
    // Leer un documento se marca donde se lee, parte por parte: con la última, el paso de la misión queda hecho solo
    await marcarParte(ds.leidoParte);
  } else if (ds.copiarHilo) {
    const hilo = hilosDePreguntas(d.estado.notas).find((h) => h.raiz.id === ds.copiarHilo);
    if (hilo) await navigator.clipboard.writeText(hiloEnTexto(hilo.notas)).then(() => avisar('Conversación copiada, en Markdown.', true), () => avisar('No se pudo copiar.'));
  } else if (ds.seguirHilo) {
    if (esperaAlDirector()) return;
    // Lo que se sigue preguntando o comentando sobre una respuesta queda en su misma conversación
    const r = await pedir({ titulo: 'Seguir la conversación', ayuda: 'Pregunta algo más o comenta la respuesta: queda en esta misma conversación y el director lo responde en su próxima revisión.', campos: [{ id: 'texto', etiqueta: 'Lo que quieres agregar (o graba un audio, o pega una imagen)', tipo: 'area' }], boton: 'Agregar a la conversación', audio: true, adjuntos: true });
    if (r) {
      hilosAbiertos.add(raizDePregunta(d.estado.notas.find((n) => n.id === ds.seguirHilo)!, d.estado.notas).id);
      await accion({ tipo: 'comentar', sobre: { tipo: 'pregunta', id: ds.seguirHilo }, texto: r.texto ?? '', audio: r.audio, ...(r.adjuntos?.length ? { adjuntos: r.adjuntos } : {}) },'Agregado a la conversación: el director lo responde en su próxima revisión.');
    }
  } else if (ds.fase) {
    faseVista = ds.fase;
    pintar();
  } else if (ds.ir) {
    if (ds.ir === 'ruta') faseVista = null;
    irA(ds.ir as Vista);
  } else if (ds.destino !== undefined) {
    await ir(destinos[Number(ds.destino)]);
  } else if (ds.doc !== undefined) {
    await abrirDocumento(ds.doc, ds.seccion || null);
  } else if (ds.cargarDocs !== undefined) {
    await cargarDocumentos(true);
    pintar();
  } else if (ds.entregar) {
    const m = d.plan.misiones.find((x) => x.id === ds.entregar)!;
    const r = await pedir({
      titulo: `Lo hice: «${m.titulo}»`,
      ayuda: `<b>Entrega:</b> ${esc(m.entrega)}<br>Si quieres, cuéntale al director qué hiciste o qué te quedó en duda, escrito o en audio. No es obligatorio.${m.documentos?.length ? ' Tus comentarios en los documentos ya le llegan.' : ''}`,
      campos: [{ id: 'nota', etiqueta: 'Qué hiciste (opcional: si ya lo dijiste en tus comentarios, déjalo en blanco)', tipo: 'area' }],
      boton: 'Entregar al director',
      audio: true,
      adjuntos: true,
      vacioVale: true,
    });
    if (r && (await accion({ tipo: 'entregar', mision: m.id, nota: r.nota, audio: r.audio }, `¡Bien hecho! Entregada: el director la revisa en su próxima revisión y, al aprobarla, sumas ${m.xp} XP.`))) await anexar(r, { tipo: 'mision', id: m.id }, `Con la entrega de «${m.titulo}»`, false);
  } else if (ds.deshacerEntrega) {
    await accion({ tipo: 'deshacer_entrega', mision: ds.deshacerEntrega });
  } else if (ds.copiarOrden !== undefined) {
    await navigator.clipboard.writeText(ds.copiarOrden).then(() => avisar('Orden copiada: pégala en tu terminal y oprime Enter.', true), () => avisar('No se pudo copiar.'));
  } else if (ds.terminal) {
    // La ventana se abre en este computador, con la orden corriendo; el paso se marca a mano cuando termine
    const [mision, i] = ds.terminal.split('|');
    b.setAttribute('disabled', '');
    const r = await fetch('/__estudio/director/terminal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mision, paso: Number(i) }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
    b.removeAttribute('disabled');
    if (r instanceof Error) return avisar('No se pudo hablar con el servidor del Studio.');
    if (!r.ok) return avisar((await r.json().catch(() => ({}))).error ?? 'No se pudo abrir la terminal.');
    avisar('Se abrió una ventana de terminal con la orden corriendo: síguela ahí hasta que diga que terminó.', true);
  } else if (ds.aclarar) {
    const [id, i] = ds.aclarar.split('|');
    await pedirAclaracion(id, Number(i));
  } else if (ds.elegir) {
    // Elegir una opción del paso: un clic, sin ir al Buzón; queda como nota del paso y el paso se marca solo
    const [id, i, k] = ds.elegir.split('|');
    const p = d.plan.misiones.find((x) => x.id === id)?.pasos[Number(i)];
    const eleccion = p && typeof p !== 'string' ? p.opciones?.[Number(k)] : undefined;
    if (!eleccion || esperaAlDirector()) return;
    b.setAttribute('disabled', '');
    if (!(await accion({ tipo: 'comentar', sobre: { tipo: 'mision', id, seccion: seccionPaso(Number(i)), eleccion } }, `Elegiste «${eleccion}»: quedó en el Buzón para el director.`))) b.removeAttribute('disabled');
  } else if (ds.hazlo) {
    // «Hazlo tú»: primero, qué hará el director; con el segundo clic, el encargo queda en el Buzón y el paso se marca solo.
    // No se ejecuta ahora: lo hace en su revisión siguiente
    const [id, i] = ds.hazlo.split('|');
    const p = d.plan.misiones.find((x) => x.id === id)?.pasos[Number(i)];
    const que = p && typeof p !== 'string' ? p.hazlo : undefined;
    if (!que || esperaAlDirector()) return;
    const si = await confirmar({
      titulo: '¿Se lo encargas al director?',
      texto: `Lo que hará: ${que}\n\nNo lo hace ahora: tu encargo queda en el Buzón, firmado, y lo hace en su próxima revisión, con las normas del proyecto. Te cuenta el resultado en su respuesta, aquí mismo en el paso. El paso queda marcado.`,
      boton: 'Sí, encárgaselo',
      cancelar: 'Mejor lo hago yo',
    });
    if (si) await accion({ tipo: 'comentar', sobre: { tipo: 'mision', id, seccion: seccionPaso(Number(i)), hazlo: true }, texto: `Hazlo tú: ${que}` }, 'Encargado: quedó en el Buzón y el director lo hace en su próxima revisión.');
  } else if (ds.comentar !== undefined) {
    const [tipo, id, seccion, decision, fragmento, postura] = ds.comentar.split('|');
    const titulo =
      decision ? (postura === 'comenta' ? `Comentar la decisión ${decision}, sin decidirla` : postura === 'decide' ? `Decido otra cosa: ${decision}` : `Decisión ${decision}`)
      : fragmento ? `Comentar la idea «${recortar(fragmento, 70)}»`
      : tipo === 'documento' ? `Comentar ${seccion ? `«${seccion}»` : 'el documento'}`
      : tipo === 'mision' ? `Comentar ${seccion ? `el ${seccion.toLowerCase()} de ` : ''}la misión «${d.plan.misiones.find((m) => m.id === id)?.titulo}»`
      : tipo === 'propuesta' ? `Comentar «${d.plan.propuestas.find((p) => p.id === id)?.titulo}»`
      : tipo === 'diagnostico' ? `Comentar el diagnóstico${seccion ? `: ${nombreFrente(seccion)}` : ''}`
      : tipo === 'objetivo' ? (id ? `Comentar la meta «${d.plan.objetivos.find((o) => o.id === id)?.texto}»` : 'Comentar la meta')
      : 'Comentar el criterio';
    const dejada = await comentar({ tipo, ...(id ? { id } : {}), ...(seccion ? { seccion } : {}), ...(decision ? { decision } : {}), ...(fragmento ? { fragmento } : {}), ...(decision && postura ? { postura } : {}) }, titulo);
    // Responder la última decisión de una parte (con sus ideas ya entendidas) la deja leída; comentarla la deja abierta
    if (dejada && tipo === 'documento' && decision && id && postura !== 'comenta') await decisionRespondida(id, seccion ?? '');
    // Comentar una idea es haberla leído: queda marcada «Entendido» sola (y, si era la última, la parte queda leída)
    if (dejada && tipo === 'documento' && fragmento && id && doc?.ruta === id) {
      const s = secciones(doc.texto).find((x) => x.titulo === (seccion ?? ''));
      const i = s ? trozosDeParte(s.titulo, s.md).findIndex((t) => t.tipo !== 'rotulo' && !t.decision && fragmentoDe(t.md) === fragmento) : -1;
      if (s && i >= 0) await marcarTrozo(s.titulo, i, true);
    }
  } else if (ds.aprobar !== undefined) {
    // Aprobar lo que recomienda el director: un clic, sin escribir; queda en el Buzón como tu respuesta, firmada
    const [ruta, seccion, decision] = ds.aprobar.split('|');
    if (esperaAlDirector()) return;
    b.setAttribute('disabled', '');
    if (await accion({ tipo: 'comentar', sobre: { tipo: 'documento', id: ruta, seccion, decision, postura: 'aprueba' } }, 'Aprobado: quedó en el Buzón como tu respuesta.')) await decisionRespondida(ruta, seccion);
    else b.removeAttribute('disabled');
  } else if (ds.entendido !== undefined) {
    const corte = ds.entendido.lastIndexOf('|');
    await marcarTrozo(ds.entendido.slice(0, corte), Number(ds.entendido.slice(corte + 1)));
  } else if (ds.plegarLista !== undefined) {
    // La columna de los documentos se pliega para leer a todo el ancho (es de este navegador)
    localStorage.setItem('estudio.docs.lista', listaPlegada() ? 'abierta' : 'plegada');
    b.closest('.docs')?.classList.toggle('sin-lista', listaPlegada());
  } else if (ds.borrarNota) {
    if (await confirmar({ titulo: '¿Quitar esta nota?', texto: 'El director nunca la verá.', boton: 'Quitar', peligro: true })) await accion({ tipo: 'borrar_nota', id: ds.borrarNota }, 'Quitada.');
  } else if (ds.editarNota) {
    // Una nota de voz se corrige en lo que se entendió de ella (el audio queda igual); una escrita, en su texto
    const n = d.estado.notas.find((x) => x.id === ds.editarNota)!;
    const dicho = n.audio ? d.transcripciones[n.audio] : undefined;
    const r = await pedir({
      titulo: 'Corregir la nota',
      ayuda: `El director solo verá lo que quede aquí cuando revise.${dicho ? ' Si la transcripción entendió mal tu audio, corrígela: el audio queda igual.' : ''}`,
      campos: [
        ...(n.texto || !dicho ? [{ id: 'texto', etiqueta: 'Tu nota', tipo: 'area' as const, valor: n.texto ?? '' }] : []),
        ...(dicho ? [{ id: 'dicho', etiqueta: 'Lo que dijiste en el audio', tipo: 'area' as const, valor: dicho, requerido: true }] : []),
      ],
      boton: 'Guardar',
    });
    if (!r) return;
    if (r.texto !== undefined && r.texto.trim() !== (n.texto ?? '').trim() && !(await accion({ tipo: 'editar_nota', id: n.id, texto: r.texto }, 'Corregida.'))) return;
    if (dicho && r.dicho !== undefined && r.dicho.trim() !== dicho.trim() && (await accion({ tipo: 'corregir_transcripcion', audio: n.audio, texto: r.dicho }, 'Corregida.'))) {
      d.transcripciones[n.audio!] = r.dicho.trim(); // el .txt ya cambió: se muestra sin esperar a la próxima lectura
      pintar();
    }
  } else if (ds.decidir) {
    const c = d.plan.fases.flatMap((f) => f.criterios).find((x) => x.id === ds.decidir)!;
    const r = await pedir({
      titulo: 'Tu decisión final',
      ayuda: `«${esc(c.texto)}». Normalmente lo evalúa el director con lo que entregan las misiones. Tu decisión manda sobre la suya y queda firmada.`,
      campos: [
        { id: 'estado', etiqueta: 'Decido que', tipo: 'select', opciones: [['cumplido', 'Está cumplido'], ['no_aplica', 'No aplica']] },
        { id: 'nota', etiqueta: 'Por qué (obligatorio si no aplica; escrito o en audio)', tipo: 'area' },
      ],
      boton: 'Decidir',
      audio: true,
      adjuntos: true,
      vacioVale: true,
    });
    if (r && (await accion({ tipo: 'marcar', criterio: c.id, estado: r.estado, nota: r.nota?.trim() || (r.audio ? EN_AUDIO : r.nota) }))) await anexar(r, { tipo: 'criterio', id: c.id }, `Al decidir «${c.texto}»`);
  } else if (ds.desmarcar) {
    await accion({ tipo: 'desmarcar', criterio: ds.desmarcar });
  } else if (ds.cruzar) {
    const f = d.plan.fases.find((x) => x.id === ds.cruzar)!;
    const siguiente = d.plan.fases[numeroFase(f) + 1]?.nombre;
    const r = await pedir({ titulo: `Cruzar «${f.puerta.nombre}»`, ayuda: `${esc(f.puerta.prueba)}<br><br>${siguiente ? `Al cruzarla se abre «${esc(siguiente)}» y cambia lo que cada frente puede hacer.` : 'Es la última puerta de la ruta.'}`, campos: [{ id: 'nota', etiqueta: 'Qué dijo la revisión de la puerta (opcional: escrito, en audio o con imágenes)', tipo: 'area' }], boton: 'Cruzar la puerta', audio: true, adjuntos: true, vacioVale: true });
    if (r && (await accion({ tipo: 'cerrar', fase: f.id, nota: r.nota?.trim() || (r.audio ? EN_AUDIO : r.nota) }, `Puerta cruzada.${siguiente ? ` Ahora: ${siguiente}.` : ''}`))) {
      faseVista = null;
      await anexar(r, { tipo: 'fase', id: f.id }, `Al cruzar «${f.puerta.nombre}»`);
    }
    pintar();
  } else if (ds.reabrir) {
    const r = await pedir({ titulo: 'Reabrir la fase', ayuda: 'Reabrir una fase reabre también las que vinieron después.', campos: [{ id: 'nota', etiqueta: 'Por qué', tipo: 'area', requerido: true }], boton: 'Reabrir', audio: true, adjuntos: true });
    if (r && (await accion({ tipo: 'reabrir', fase: ds.reabrir, nota: r.nota?.trim() || EN_AUDIO }))) await anexar(r, { tipo: 'fase', id: ds.reabrir }, 'Al reabrir la fase');
  } else if (ds.celda) {
    const [frente, fase] = ds.celda.split('|');
    celda = celda?.frente === frente && celda?.fase === fase ? null : { frente, fase };
    pintar();
  } else if (ds.nuevaExcepcion !== undefined) {
    await registrarExcepcion();
  } else if (ds.cerrarExcepcion) {
    await accion({ tipo: 'cerrar_excepcion', id: ds.cerrarExcepcion });
  } else if (ds.responder) {
    const [id, estado] = ds.responder.split('|');
    const p = d.plan.propuestas.find((x) => x.id === id)!;
    // Lo decidido sigue a la vista hasta que se recargue la página: así se le puede agregar un comentario enseguida
    propuestasDecididasAqui.add(id);
    // Aceptar va de un clic (lo que haya que decir, con «Comentar al director»); descartar se confirma antes
    if (estado !== 'descartada') return void (await accion({ tipo: 'responder', propuesta: id, estado }, `${NOMBRE_RESPUESTA[estado as RespuestaPropuesta]}: «${p.titulo}».`));
    const r = await pedir({ titulo: `¿Descartar «${p.titulo}»?`, ayuda: 'Queda marcada como descartada, no se borra: el director sabe que ya la decidiste y no te la vuelve a proponer. Sale de la lista la próxima vez que abras el Studio, y la encuentras en «Ver las pasadas».', campos: [{ id: 'nota', etiqueta: 'Por qué (opcional; escrito o en audio)', tipo: 'area' }], boton: 'Sí, descartarla', audio: true, adjuntos: true });
    if (r && (await accion({ tipo: 'responder', propuesta: id, estado, nota: r.nota?.trim() || (r.audio ? EN_AUDIO : undefined) }))) await anexar(r, { tipo: 'propuesta', id }, `${NOMBRE_RESPUESTA[estado as RespuestaPropuesta]}: «${p.titulo}»`);
  } else if (ds.borrarValidacion) {
    if (await confirmar({ titulo: '¿Borrar esta validación?', texto: 'Deja de contar para los criterios de su fase.', boton: 'Borrar', peligro: true })) await accion({ tipo: 'borrar_validacion', id: ds.borrarValidacion });
  } else if (ds.usarCandidato) {
    const c = d.plan.objetivos.find((x) => x.id === ds.usarCandidato)!;
    borradorObjetivo = { texto: c.texto, exito: c.exito, horizonte: c.horizonte ?? '', candidato: c.id };
    anclaPendiente = 'p-objetivo';
    irA('proyecto');
  } else if (ds.reabrirObjetivo !== undefined) {
    const r = await pedir({ titulo: 'Cambiar la meta', ayuda: 'Cambiar la meta cambia la ruta: el director la revisa con la meta nueva. El anterior queda en el historial con tu razón.', campos: [{ id: 'motivo', etiqueta: 'Por qué', tipo: 'area', requerido: true }], boton: 'Reabrir', audio: true, adjuntos: true });
    if (r && (await accion({ tipo: 'reabrir_objetivo', motivo: r.motivo?.trim() || EN_AUDIO }, 'Meta reabierta. Fija la nueva cuando la tengas clara.'))) await anexar(r, { tipo: 'objetivo' }, 'Al cambiar la meta');
  } else if (ds.quitarIntegrante) {
    const i = d.proyecto.equipo.find((x) => x.id === ds.quitarIntegrante)!;
    if (await confirmar({ titulo: `¿Quitar a ${i.nombre} del equipo?`, texto: 'Lo que ya hizo queda en el historial.', boton: 'Quitar del equipo', peligro: true })) await accion({ tipo: 'quitar_integrante', id: i.id });
  }
}

$('vista').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const datos = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
  if (form.id === 'form-validacion') await accion({ tipo: 'validacion', validacion: datos }, 'Validación registrada.');
  if (form.id === 'form-nota' && datos.texto?.trim()) await accion({ tipo: 'anotar', texto: datos.texto }, 'Anotado.');
  if (form.id === 'form-repositorio') {
    const boton = form.querySelector('button')!;
    boton.disabled = true;
    try {
      const r = await fetch('/__estudio/director/repositorio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ruta: datos.ruta }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? `El servidor respondió ${r.status}`);
      documentos = null;
      await cargar(true);
      avisar(`Conectado: ${j.info.ruta}. El director ya puede leerlo.`, true);
    } catch (err) {
      avisar(esDeRed(err) ? SIN_SERVIDOR : (err as Error).message);
    } finally {
      boton.disabled = false;
    }
  }
  if (form.id === 'form-proyecto') await accion({ tipo: 'proyecto', ...datos }, 'Guardado. El director lo lee en su próxima revisión.');
  if (form.id === 'form-objetivo') {
    if (!(await confirmar({ titulo: '¿Fijar esta meta?', texto: `«${datos.texto}»\n\nDesde ahora, todo el trabajo se mide contra ella. Si cambia, la cambias aquí mismo.`, boton: 'Fijar esta meta' }))) return;
    if (await accion({ tipo: 'objetivo', ...datos }, 'Meta fijada. Pide la revisión: el director traza la ruta.')) borradorObjetivo = null;
  }
  if (form.id === 'form-integrante') await accion({ tipo: 'integrante', ...datos }, `${datos.nombre} ya es del equipo. Dile que configure su git con ese correo.`);
});

document.addEventListener('click', async (e) => {
  if (!(e.target as HTMLElement).closest('[data-preguntas]') || !d) return;
  cerrarMenuMovil();
  await formularPreguntas();
});
// Junto a la cara del director, dos atajos: un comentario (va al Buzón) y las preguntas (van aparte, respondidas como un informe)
document.addEventListener('click', async (e) => {
  if (!(e.target as HTMLElement).closest('[data-escribir]') || !d) return;
  cerrarMenuMovil();
  await escribirAlDirector();
});

/** El comentario al director: lo único que se le escribe en general (el Buzón ya no tiene su propio formulario). */
async function escribirAlDirector() {
  if (esperaAlDirector()) return;
  const r = await pedir({
    titulo: 'Un comentario para el director',
    ayuda: 'Plantéale un comentario o una idea que quieras que tenga en cuenta. No entra de golpe al proyecto: el director decide <b>cómo y dónde</b> administrarlo según lo que le digas (una misión, una propuesta, un documento o la ruta) y te responde en el <b>Buzón</b>. Hasta que lo lea, lo puedes corregir o borrar.',
    campos: [{ id: 'texto', etiqueta: 'Tu comentario o idea (o graba un audio, o pega una imagen)', tipo: 'area' }],
    boton: 'Dejarlo en el Buzón',
    audio: true,
    adjuntos: true,
    urgente: true,
  });
  if (r) await dejarNota({ tipo: 'general' }, r.texto, r.audio, !!r.urgente, r.adjuntos);
}

async function registrarExcepcion() {
  const actual = faseActual(d.plan, d.estado);
  const enEspera = d.plan.frentes.filter((x) => trabajoDe(actual, x.id).nivel === 'espera');
  const r = await pedir({
    titulo: 'Registrar una excepción',
    ayuda: 'Trabajar en un frente en espera a veces hace falta (un error que bloquea a los usuarios, algo que frena una validación). El director no lo prohíbe: pide que se diga por qué y por cuánto tiempo, y lo tiene en cuenta en el boletín.',
    campos: [
      { id: 'frente', etiqueta: 'Frente', tipo: 'select', valor: consulta ?? undefined, opciones: (enEspera.length ? enEspera : d.plan.frentes).map((x) => [x.id, x.nombre]) },
      { id: 'motivo', etiqueta: 'Por qué ahora', tipo: 'area', requerido: true },
      { id: 'dias', etiqueta: 'Por cuántos días', tipo: 'select', opciones: [['1', '1 día'], ['3', '3 días'], ['7', '7 días'], ['14', '14 días']], valor: '7' },
    ],
    boton: 'Registrar',
    audio: true,
    adjuntos: true,
  });
  if (r && (await accion({ tipo: 'excepcion', frente: r.frente, motivo: r.motivo?.trim() || EN_AUDIO, dias: Number(r.dias) }, 'Excepción registrada.'))) await anexar(r, { tipo: 'general' }, `Sobre la excepción en «${nombreFrente(r.frente)}»`);
}

// Entregar proyectos: desde el menú de proyectos, la bienvenida y la lista
document.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('[data-nuevo-proyecto]')) void nuevoProyecto();
});

$('sincronizacion').addEventListener('click', () => {
  $('sincronizacion').textContent = '↻ Trayendo…';
  cargar(true).then(() => { marcarSinServidor(false); avisar('Al día.', true); }).catch((e) => (esDeRed(e) ? (marcarSinServidor(true), avisar(SIN_SERVIDOR)) : avisar((e as Error).message)));
});

const ocupado = () =>
  ($('dialogo') as HTMLDialogElement).open || !!document.querySelector('dialog[open]') ||
  ((document.activeElement instanceof HTMLTextAreaElement || document.activeElement instanceof HTMLInputElement) && document.activeElement.value.trim() !== '') ||
  !!document.querySelector('.grabando');
setInterval(() => {
  if (sinServidor && document.visibilityState === 'visible') cargar().then(() => marcarSinServidor(false), () => undefined);
}, 5_000);
setInterval(() => {
  if (document.visibilityState === 'visible' && d && !ocupado()) cargar().then(() => marcarSinServidor(false), (e) => esDeRed(e) && marcarSinServidor(true));
}, 30_000);

// La cabecera fija: se compacta al bajar (con margen, para que no tiemble en el borde) y los títulos de los documentos
// se pegan justo debajo de ella (--alto-cabeza)
function medirCabeza() {
  const y = window.scrollY;
  if (y > 120) document.body.classList.add('cabeza-compacta');
  else if (y < 20) document.body.classList.remove('cabeza-compacta');
  const movil = window.innerWidth < 760;
  const alto = movil ? (document.querySelector<HTMLElement>('.barra-movil')?.offsetHeight ?? 0) : $('mando').offsetHeight;
  document.documentElement.style.setProperty('--alto-cabeza', `${alto}px`);
}
window.addEventListener('scroll', medirCabeza, { passive: true });
// Si la página se va a recargar (por ejemplo, porque el director cambió el código del Studio) en medio de una grabación
// o con algo escrito en un diálogo, el navegador pregunta antes: así no se pierde
window.addEventListener('beforeunload', (e) => {
  const grabando = !!document.querySelector('.en-grabacion');
  const escrito = [...document.querySelectorAll<HTMLTextAreaElement>('dialog[open] textarea')].some((t) => t.value.trim());
  if (grabando || escrito) e.preventDefault();
});
window.addEventListener('resize', medirCabeza);
new ResizeObserver(medirCabeza).observe($('mando'));

// El director flotante (equipo.ts) lleva al siguiente pendiente
window.addEventListener('estudio:ir', (e) => { if (d) void ir((e as CustomEvent<Destino>).detail); });
alCambiarVista(() => { if (d) pintar(); });
// Los gráficos de «Qué es STL» se amplían en pantalla completa
activarRecorrido();
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-vista-equipo]');
  if (b) ponerVista(b.dataset.vistaEquipo as 'equipo');
});
const pedido = new URLSearchParams(location.search);
cargar()
  .then(() => {
    if (!d) return; // sin proyectos: la bienvenida
    // Recién recargada porque el director terminó su revisión: se dice
    if (sessionStorage.getItem(CLAVE_TERMINO)) {
      sessionStorage.removeItem(CLAVE_TERMINO);
      avisar('El director terminó la revisión: lo nuevo ya está en el Studio.', true);
    }
    // Al volver al Studio después de un rato, lo primero: dónde quedamos en el proyecto activo
    // Y después, si el director aprobó algo tuyo, se celebra
    if (tocaResumen() && (d.plan.resumen || d.arranque === 'en_marcha')) void mostrarDondeQuedamos().then(celebrarSiToca);
    else {
      localStorage.setItem(claveVisto(d.activo), new Date().toISOString());
      void celebrarSiToca();
    }
    const v = pedido.get('vista');
    if (v && (VISTAS as string[]).includes(v)) {
      history.replaceState(null, '', location.pathname);
      void ir({ vista: v as Destino['vista'], ancla: pedido.get('ancla') ?? undefined, etiqueta: '' });
    } else if (d.arranque === 'conectar' && !localStorage.getItem('estudio.director.pestana')) {
      // La primera vez, directo a conectar el repositorio
      void ir({ vista: 'misiones', ancla: 'guia', etiqueta: '' });
    }
  })
  .catch((e) => {
    $('vista').innerHTML = `<p class="aviso remoto">No se pudo cargar el Director: ${esc((e as Error).message)}</p>`;
  });
// Lo que dice el director cambia mientras se trabaja: se relee al volver
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && d && !ocupado()) cargar(true).catch(() => undefined);
});
