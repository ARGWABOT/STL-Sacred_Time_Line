// El Director asistente: la portada del Estudio. El director guía al equipo: en el arranque pide el repositorio y el
// contexto, diagnostica el proyecto, propone objetivos y, con el objetivo firmado, traza la ruta. Después dice dónde
// estamos y qué hace hoy cada uno, asigna misiones paso a paso (una a la vez), recibe sus entregas y sus notas
// (escritas o en audio, también sobre los documentos, que se leen y se comentan aquí mismo, parte por parte) y responde
// en su sesión («revisa lo que hay para el director»): aprueba o pide rehacer, contesta cada nota y ajusta la ruta. La
// decisión final es del titular. La ruta y lo que dice el director viven en proyectos/<id>/director/plan.json; lo que hace
// cada uno, en proyectos/<id>/director/equipo/<persona>.json; lo del proyecto, en proyectos/<id>/proyecto.json (servidor:
// estudio/servidor/api.ts). Se llamaba director.ts hasta el 31 de octubre de 2026 y se renombró app.ts por elección del
// titular (nota nmvvyv6jztit, propuesta pr_partir_modulos), para que el único «director» sea la lógica del director.
import { marked } from 'marked';
import { limpio } from './limpiar';
import {
  aclaracionesDe,
  comprobacionesDe,
  seMarcaAMano,
  seMideSolo,
  pideLeerEntero,
  reemplazos,
  colaDelDirector,
  aquiMismo,
  avanceFase,
  motivosDePuerta,
  claveIdea,
  claveLeido,
  comentarioDe,
  decideDecision,
  decisionesDe,
  destinoVigente,
  documentosEnOrden,
  enLectura,
  loPideUnPaso,
  eleccionDe,
  encargoDe,
  esImagen,
  esPregunta,
  hilosDePreguntas,
  llevaAqui,
  raizDePregunta,
  estadoIdeas,
  estadoMision,
  evaluar,
  excepcionesActivas,
  faseActual,
  marcasAlDia,
  misionesAbiertas,
  sinEsperarLoLargo,
  mismaIdea,
  nivelDe,
  reservaDeMisiones,
  mdDeBloqueDePuntos,
  OPCIONES_TIPO_DE_NOTA,
  TIPOS_DE_NOTA,
  TIPO_ELIGE,
  pideTipo,
  tipoDeNota,
  type TipoEnBuzon,
  comoQuedoNota,
  destinoResuelto,
  type ComoQuedo,
  opcionConDetalle,
  opcionSola,
  juntarElecciones,
  destinoDelPaso,
  parteConDecisionPendiente,
  partesDeDocumento,
  pasosVistos,
  claveDePasoVisto,
  eleccionALaVista,
  pendientesDelDirector,
  puntosDelBloque,
  seccionPaso,
  situacion,
  temasDelMensaje,
  textoPaso,
  textoPlano,
  TITULAR,
  trabajoDe,
  trozosDeParte,
  urgenciasDeLaSemana,
  xpDe,
  YA_LO_DIJE,
  YA_LO_COMENTE,
  remiteALoDicho,
  type Adjunto,
  type Contexto,
  type Criterio,
  type Destino,
  type EstadoDirector,
  type EtapaArranque,
  type Fase,
  type Lugar,
  type Mision,
  type Nivel,
  type Nota,
  type Paso,
  type Persona,
  type Plan,
  type Propuesta,
  type Proyecto,
  type Respuesta,
  type RespuestaPropuesta,
  type Senales,
  loDichoEnOrden,
  huellasDePasos,
  pasosVigentes,
} from '../../src/director/director';
import type { InfoRepositorio } from '../../src/director/repositorio';
import type { FallaRevision, ModoPermisos } from '../../src/director/proyectos';
import { duracionAprox, type Alcance as AlcanceMedicion } from '../../src/director/corrida';
import type { MedidaDeRevision } from '../../src/director/historial';
import { limiteCasiLleno, tiempoDeRevision } from '../../src/director/limites';
import type { PlanDeClaude } from '../../src/director/consumoDelPlan';
import type { ResumenProyecto } from '../servidor/api';
import type { Caida, CausaCaida } from '../servidor/ultimaCaida';
import { ofrecidoEnVivo, pendientesEnVivo, type PermisoAutorizado, type PermisoNegado } from '../servidor/permisosNegados';
import { alCambiarVista, darDatosDirector, decir, nombrePersona, nombreVista, personasEquipo, personaVista, ponerVista, seVe } from './equipo';
import { elegirCarpeta } from './explorador';
import { icono, type Icono } from './iconos';
import { pedirProyectoNuevo } from './nuevo_proyecto';
import { cerrarConClicFuera, confirmar } from './modal';
import { lineaCompleta, lineasDeRespuestas, NOMBRE_PESTANA_DQ, ORDEN_PESTANAS_DQ, paroVigente, pestanaActiva, pestanaDeSeccion, type PestanaDq } from './pestanasDq';
import { antesDeCerrarConClicFuera, antesDeOtroSobre, enDatos, Grabadora, GRABACION_MUDA, marcaDeCampos, repartirDictado, type Marca } from './grabadora';
import { borradoresDe, guardarBorrador, leerBorrador, lineaDeBorrador, quitarBorrador, type Borrador, type SobreBorrador } from './borradores';
import { probarDialogo, vigilarPermisos } from './dialogoPermiso';
import { Adjuntos } from './adjuntos';
import { activarDibujos } from './dibujos';
import { claveAbierto as claveAbiertoDe, clavePasos, esc, pasosHechos as pasosHechosDe, seQuedaEnLaVista } from './util';
import { fecha, hora, miles, momento, pct } from './formato';
import { vistaEsfuerzo } from './vistaEsfuerzo';
import { type Lanzamiento } from './vistaGasto';
import { ESFUERZOS, MODELOS, nombreEsfuerzo, nombreModelo } from './modeloDelDirector';
import { ANCLA_MEDICION, avisoMidiendo, cuantoGasta, type EstadoMedicion } from './vistaMedicion';
import { type AjustesPropios } from './vistaAjustesPropios';
import { filasBitacora, type Bitacora, type DatosBitacora } from './bitacoraDelComputador';
import { claveGrupo, claveSkill, clavePermiso, type PanelPermisos, type PanelSkills } from './vistaPermisos';
import { gruposEnElPanel } from '../../src/director/asistente';
import { vistaModelo, type DatosModelo } from './modelView';
import { queDelFrente, vistaBitacora, vistaFrentes as vistaFrentesHtml, vistaMetodo } from './vistasDeApoyo';
import { escribirTengo, mismoPorEncima, unirConsulta, type MemoriaDePartes } from '../../src/director/partesDeConsulta';
import { aperturaDeSeccion } from './seccionAbierta';
import { notasDelBuzon as notasDelBuzonHtml, RESPONDIDAS_DE_A, vistaBuzon as vistaBuzonHtml, type DatosBuzon } from './vistaBuzon';
import { dichoDeNota, marcaReemplazada, nombreComoQuedo, nombreTipoEnBuzon, textoDeNotaALaVista } from './vistaBuzon';
import { parteEntera, secciones, vistaDocumentos as vistaDocumentosHtml, type Documento } from './vistaDocumentos';
import { vistaPreguntas as vistaPreguntasHtml } from './vistaPreguntas';
import { NOMBRE_RESPUESTA, vistaPropuestas as vistaPropuestasHtml } from './vistaPropuestas';
import { avanceDelPaso, AVISO_AUDIO_MS, AVISO_CON_ATAJO_MS, AVISO_MS, completaLaMision, completasSinEntregar, conEntregasEnVuelo, mostrarAvisoMision, opcionesHabilitadas, quitarAvisoMision, RECIEN_MS, rotuloDelPaso } from './avisoMision';
import { vistaProyecto as vistaProyectoHtml, type PanelSesionesGh } from './vistaProyecto';
import type { EntradaGh } from '../../src/director/cuentaGit';
import { vistaProyectos as vistaProyectosHtml } from './vistaProyectos';
import { chipReemplazado, NOMBRE_SITUACION, partesPorHacerYHechas, vistaRuta as vistaRutaHtml } from './vistaRuta';
import { misionesQueSiguen } from './colaDirector';
import { abiertaEnLista, desplazamientoParaVer, desplazamientosEnCadena, enSuIdioma, scrollAlRepintar, seQuedaEnSuRuta } from './listas';
import { PESTANA_MODELO_INICIAL, pestanaConTecla, pestanaModeloValida, type PestanaModelo } from './pestanasModelo';
import { pestanaRutaConTecla, pestanaRutaElegida, pestanaRutaValida, type PestanaRuta } from './pestanasRuta';
import { avisoDeEspera, resumenComentarios, segundosDelSeguro } from './lectura';
import { esIdioma, idiomaDelNavegador, type Idioma } from '../../src/director/idioma';
import { idiomaActual, lenguaje, ponerIdioma, t as tx, type ClaveDeTexto } from './textos';
import { aplicarTextosFijos } from './textosFijos';
import { guardarCarpetaDelStudio, laCarpetaDelStudio } from './carpetaDelStudio';
import { fichaPersona as fichaDePersona } from './personCard';
import { iniciarAsistente } from './asistente';
import { arranqueHTML as arranqueDe } from './startSteps';
import { selectorIdioma } from './selectorIdioma';
import { conAyuda } from './palabras';   // también registra el oyente del «?» (pr_palabras, nmw5f1q72tit)
import { aLaVista, debeOfrecerse, empezarGuia, guiaActiva, instalarAyuda, modoAyuda, pintarAtajoAyuda, pintarGuia, repetirHtml, SECCIONES, seccionDeVista } from './ayudaGuiada';
import { textoDelPaso } from './stepText';
import { colaDe as colaDeLaPersona } from './queuePanel';
import { vistaHoy, type DatosHoy } from './todayView';
import { vistaHoyEnRuta, type FaseEnBarra } from './hoyEnRuta';
import { enunciadoDeMision, tarjetaMision as tarjetaDeMision, type DatosTarjeta } from './missionCard';
import { abrirAlCargar, lineaSeCongela, marcarTrabajando, pantallaTrabajando, recargaTrasRevision, trabajandoGuardado, tituloTermino, type EsperaTrasRevision } from './trabajando';
import { sonar } from './sonidos';
import { alCambiarIdioma as sonidosAlCambiarIdioma, botonSonido } from './panelSonidos';
import { controlesEnfoque } from './controlesEnfoque';
import { separarHechas } from './hechoAparte';
import { CLAVE_DIVISION, DIVISION_PROGRESO, abiertaTrasClic, altoDelPlan, avanceDeLaEscena, avanzarTokens, bolaEncima, botonDelProgreso, altoGuardado, chatDeRevision, cierraConClicFuera, cuadroDeAvalanchaHtml, cuadroDeRepeticion, cuentaTrasPintar, desplazamientoTrasPintar, globosDeInicio, ladoDeLosGlobos, marcadorDe, pintarCuenta, pintarTokens, progresoSeMuestra, recordarAvance, relojDesde, revelarGlobos, sigueLaPunta, tokensAlDia, vistaDelProgreso, type ClicEnLaPagina, type CuadroDeAvalancha, type CuentaDeBanda, type MarcadorDeBanda, type RecuerdoDeAvance, type RepeticionEnCurso, type TokensDeBanda } from './progresoVivo';
import type { ConversacionDeRevision } from '../../src/director/turnos';
import './zen';
import './encima';
import { clicDelCentral, irDelPasoSigue } from './siguiente';
import { repintoEnEspera } from './repintoEnEspera';
import { cargarRegistroLectura, controlAuto, dondeVa, mandarRegistro, llamarNiebla, narrando, NO_AVANZA, nieblaPuesta, nubladoEn, ponerIdiomaDelTexto, ponerNiebla, prepararDeAntemano, prepararDelante, prepararPrimero, sinDestapar, vozPuesta } from './guiaLectura';
import { idiomaDeDocumento, idiomaDeTexto } from '../../src/director/voz';
import { celebracion, destinoDeMision, PARA_QUE_SIRVE, pasoSinMision, pedirEsLoUnico, seccionesConAlgo } from '../../src/director/animo';
import { altoDeVentana, anchoDeVentana, aplicarEscala, aPantalla, lugarDeLaSalida, rectaEnPagina } from './escala';
import { desdeElPaso, flotaVolver, type DesdeMision } from './volverMision';
import { abrirLineaGrande } from './lineaGrande';
import { pintarLineaViva, ramasDeAhora, repintarLineaViva, type MisionEnLinea } from './lineaViva';
import type { RevisionDeLinea } from '../../src/director/historiaLinea';

// La página se escala a la ventana (escala.ts): lo primero, antes de que nada se mida
aplicarEscala();
cerrarConClicFuera();

type Vista = 'misiones' | 'buzon' | 'documentos' | 'ruta' | 'propuestas' | 'proyectos' | 'proyecto' | 'diagnostico' | 'frentes' | 'esfuerzo' | 'metodo' | 'bitacora' | 'preguntas' | 'modelo';
const VISTAS: Vista[] = ['misiones', 'buzon', 'documentos', 'ruta', 'propuestas', 'proyectos', 'proyecto', 'diagnostico', 'frentes', 'esfuerzo', 'metodo', 'bitacora', 'preguntas', 'modelo'];

/**
 * La barra lateral, solo con lo de todos los días: el Buzón, las preguntas, la ruta, los documentos y las
 * propuestas. «Hoy» ya no es una sección de la barra: es el inicio, y lo abre la marca de arriba (la casita y el nombre;
 * `#ir-inicio`, pedido pd_inicio_logo). El seguimiento salió (decidido en «Un Studio más simple», 19 de octubre): los frentes viven solo en el
 * plan del director, el esfuerzo y la bitácora eran reportes, y el método tiene su documento (docs/metodo/metodologia.md). Las
 * validaciones de proyecto salieron del Studio (nota de voz del titular nmvy6vawvtit, 1 de noviembre de 2026): son de cada equipo.
 * Proyecto (la configuración) está en la barra solo mientras el proyecto arranca; después, se abre con el engranaje
 * del selector de proyectos. «Modelo y consumo» no es de ningún proyecto (es Claude Code en este computador): va en el
 * pie de la barra, aparte (pedido del titular, 21 de octubre). El diagnóstico vive en Proyecto, plegado. Preguntas, la ruta, los
 * documentos y las propuestas aparecen cuando tienen algo (o si estás en ellas); la primera vez, el director dice para
 * qué sirven (`avisarSeccionesNuevas`).
 */
function gruposNav(): { titulo: string; vistas: Vista[]; plegable?: boolean }[] {
  const arranca = d.arranque !== 'en_marcha';
  const conAlgo = seccionesConAlgo({ plan: d.plan, estado: d.estado }) as Vista[];
  const sirve = (v: Vista) => !(v in PARA_QUE_SIRVE) || conAlgo.includes(v) || vista === v;
  return [
    // «Preguntas» ya no va en la barra (tu decisión del 26 de octubre, pedido pd_preguntas_buzon): están en el Buzón, con
    // su filtro, y su informe se abre desde ahí; mientras lo lees, se ve aquí para saber dónde estás
    { titulo: '', vistas: (['buzon', ...(vista === 'preguntas' ? ['preguntas'] : [])] as Vista[]).filter(sirve) },
    // «La ruta» ya no va en la barra: es la pestaña «Datos del proceso» de «Hoy» (pd_hoy_en_ruta)
    { titulo: tx('nav.elProyecto'), vistas: (['documentos', 'propuestas', ...(arranca ? ['proyecto'] : [])] as Vista[]).filter(sirve) },
  ];
}

/**
 * La primera vez que aparece una sección en este navegador, el director dice para qué sirve. La primera carga solo
 * anota las que ya están: quien ya usaba el Studio no recibe avisos de lo que conoce.
 */
const CLAVE_SECCIONES = 'estudio.nav.vistas';
function avisarSeccionesNuevas() {
  const ahora = seccionesConAlgo({ plan: d.plan, estado: d.estado });
  const guardadas = localStorage.getItem(CLAVE_SECCIONES);
  const vistas: string[] = guardadas ? JSON.parse(guardadas) : [];
  const nuevas = guardadas ? ahora.filter((s) => !vistas.includes(s)) : [];
  if (guardadas && !nuevas.length) return;
  localStorage.setItem(CLAVE_SECCIONES, JSON.stringify([...new Set([...vistas, ...ahora])]));
  if (nuevas.length) decir(PARA_QUE_SIRVE[nuevas[0]], 'sorprendido');
}
const CLAVE_SEGUIMIENTO = 'estudio.nav.seguimiento';
const recortar = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);
/** El nombre de cada sección, en el idioma de ahora (textos/es.ts, nav.*). */
const NOMBRE_VISTA = new Proxy({} as Record<Vista, string>, { get: (_, v) => tx(`nav.${String(v)}` as ClaveDeTexto) });
const ICONO_VISTA: Record<Vista, Icono> = {
  misiones: 'hoy', buzon: 'buzon', documentos: 'documentos', ruta: 'ruta', propuestas: 'propuestas', proyectos: 'proyectos', proyecto: 'proyecto',
  diagnostico: 'diagnostico', frentes: 'frentes', esfuerzo: 'esfuerzo', metodo: 'metodo', bitacora: 'bitacora', preguntas: 'pregunta', modelo: 'modelo',
};

interface Identidad { nombre: string; correo: string; rol: Persona | null; problema?: string; nuevo?: boolean }
interface Sincronizacion { traido: string | null; error: string | null; local: boolean; subida: { fase: string; mensaje: string; porSubir: number } | null }
interface Repositorio { ruta: string | null; info: InfoRepositorio | null; error: string | null; cuentaGit?: string | null }
interface Datos {
  activo: string; proyectos: ResumenProyecto[];
  plan: Plan; estado: EstadoDirector; senales: Senales; identidad: Identidad; transcripciones: Record<string, string>; sincronizacion: Sincronizacion;
  hoy: string; errores: string[]; proyecto: Proyecto; repositorio: Repositorio; arranque: EtapaArranque;
  /** Las notas de voz que el Studio está transcribiendo ahora, y las que no pudo (las transcribe el director al revisar). */
  transcribiendo?: string[]; sinTranscribir?: string[]; enCola?: Record<string, string>;
  /** La revisión pedida desde el Studio para este proyecto: la toma la sesión del director en su ciclo (/vigila). */
  revision?: { quien: string; pedida: string; lanzada?: string; enCurso?: string; hecha?: string; error?: string; falla?: FallaRevision; limite?: number } | null;
  /** «Pedir revisiones seguidas» de este proyecto: en marcha, o por qué paró (proyectos.ts › Seguidas). */
  seguidas?: { quien: string; desde: string; hechas: number; paro?: { cuando: string; porque: string } } | null;
  /** La historia de la línea viva: cada revisión con las ramas que juntó (historiaLinea.ts, en la memoria del proyecto). */
  lineaHistoria?: RevisionDeLinea[];
  /** La última vez que creció el registro de la revisión en marcha (revisor.ts › actividadDeProyecto): si es vieja, está parada. */
  actividad?: string | null;
  /** Lo que tiene corriendo el director ahora (revisor.ts › herramientaEnCurso): mientras corre, su registro no crece y no está parado. */
  enCurso?: string | null;
  /** La última vuelta de la sesión del director mirando si hay revisiones pedidas. */
  vigilia?: string | null;
  /** Si el Studio lanza solo al director al pedir la revisión (estudio/servidor/revisor.ts), o por qué no puede. */
  /** `espera`: otro director tiene el candado del proyecto (la sesión del director, u otra copia del Studio), en una frase. */
  /** `deteniendo`: alguien oprimió «Detener ahora» y el director cierra con lo hecho (revisor.ts › detenerAhora). */
  revisor?: { agente: string | null; problema: string | null; revisando: string | null; espera?: { proyecto: string; texto: string } | null; deteniendo?: { proyecto: string; quien: string; cuando: string } | null } | null;
  /** El modelo de Claude Code en este computador, el de /model, con el que el Studio lanza al director (null: el de la cuenta). */
  modelo?: string | null;
  /** Cuánto piensa (el esfuerzo de Claude Code, el de /effort; null: el de la cuenta). */
  esfuerzo?: string | null;
  /** El que tiene guardado Claude Code para ese modelo: el mismo, salvo con «Máximo», que Claude Code no guarda. */
  esfuerzoGuardado?: string | null;
  /** Ultracode en las sesiones nuevas de Claude Code de este computador. */
  ultracode?: boolean;
  /** Si el titular le dio al director que lanza el Studio el permiso de seguir a ultracode (sin él, trabaja sin ultracode). */
  ultracodeDirector?: boolean;
  /** «Todo con el modelo que elegí»: los ayudantes del director, con su mismo modelo (pr_modelos_por_tarea, punto 4). */
  todoConElModelo?: boolean;
  /** Las secciones cuya ayuda guiada ya se vio, en este Studio (ayudaGuiada.ts). */
  ayudasVistas?: string[];
  /** La línea de versión nueva, si hay (avisoVersion.ts), y si su casilla la apagó. */
  avisoVersion?: { version: string; enlace: string } | null;
  avisoVersionApagado?: boolean;
  /**
   * Si el director lanzado carga tus ajustes de usuario de Claude Code, los nombres de sus claves (null: no es JSON válido)
   * y cada clave con su explicación y su consejo (estudio/servidor/ajustesPropios.ts), con las que conserva sin ellos.
   */
  ajustesPropios?: AjustesPropios;
  /** Cómo pide permisos el director lanzado: solo lo autorizado (sin la clave), preguntándote en el Studio o automático (estudio/servidor/modoPermisos.ts). */
  modoPermisos?: ModoPermisos;
  /** Si el Claude Code de este computador trae el modo automático y, si no, lo que le falta para usarlo. */
  automatico?: { admite: boolean; porque?: string };
  /** Lo que gastó cada lanzamiento del director en este computador (estudio/servidor/revisor.ts › consumoDeRevisiones). */
  consumo?: Lanzamiento[];
  /** Tu plan de Claude en este computador, si lo dijiste; null si no. */
  planDeClaude?: PlanDeClaude | null;
  /** El idioma de la interfaz en este computador; null: la primera vez (fijarIdioma). */
  idioma?: Idioma | null;
  /** La medición del núcleo con casos fijos (estudio/servidor/medidor.ts › estadoDeMedicion): la de ahora o la última, y lo que costaría otra. */
  medicion?: EstadoMedicion;
  /** La medida del criterio del director en este proyecto, por revisión (pr_criterio_director, punto 3). */
  medidaDelDirector?: MedidaDeRevision[];
  /** Lo que va haciendo el director que lanzó el Studio, mientras revisa: la conversación entre tu computador y el modelo (turnos.ts). */
  conversacion?: ConversacionDeRevision | null;
  /** Lo mismo con lo urgente, que corre aparte (null sin urgencia en marcha). */
  conversacionUrgencia?: ConversacionDeRevision | null;
  /** Los tokens que lleva el director en esa revisión (revisor.ts › tokensDeProyecto); al terminar, el total exacto. */
  tokensVivos?: number | null;
  /** Lo que se le lleva negado al director en esa revisión, mientras trabaja (revisor.ts › negadosDeProyecto). */
  negadosVivos?: string[] | null;
  /** Su plan, si la revisión va en dos tiempos: mientras planea y su lista de encargos (revisor.ts › planDeProyecto). */
  planVivo?: { planeando: boolean; encargos: { id: string; que: string; hecho?: string }[] | null } | null;
  /** «No lo entiendo, explícamelo mejor» de un paso: el director lo aclara al instante, sin el resto de la revisión. */
  /** `falla`: si no se cerró, el reporte de qué pasó, como el de una revisión (pr_retoma_automatica, punto 5). */
  aclaracion?: { mision: string; paso: number; nota: string; pedida: string; lanzada?: string; hecha?: string; error?: string; falla?: FallaRevision; comprobar?: boolean } | null;
  /** Las notas urgentes: el director las atiende solas, al instante, y el resultado vuelve en «¿Dónde quedamos?». */
  urgencia?: { notas: string[]; luego?: string[]; pedida: string; lanzada?: string; hecha?: string; error?: string; falla?: FallaRevision } | null;
}
/** Sin proyectos todavía: solo la bienvenida. */
interface SinProyectos { sinProyectos: true; proyectos: ResumenProyecto[]; identidad: Identidad; sincronizacion: Sincronizacion; hoy: string }


let d: Datos;
let vista: Vista = VISTAS.includes(localStorage.getItem('estudio.director.pestana') as Vista) ? (localStorage.getItem('estudio.director.pestana') as Vista) : 'misiones';
if (vista === 'diagnostico') vista = 'proyecto'; // el diagnóstico ya vive en Proyecto
let faseVista: string | null = null;
const pestanaDeFase = new Map<string, PestanaRuta>(); // «La ruta»: la pestaña que se ve de cada fase, solo mientras viva la página
let celda: { frente: string; fase: string } | null = null;
let consulta: string | null = null; // el frente de «¿Puedo trabajar en…?»
let documentos: Documento[] | null = null;
let documentosFuera = 0; // los .md del repositorio que no caben en la lista (el servidor dice cuántos)
let doc: { ruta: string; texto: string } | null = null;
let irASeccion: string | null = null;
let verPropuestasPasadas = false; // Propuestas: las ya decididas, solo si se piden
let anclaPendiente: string | null = null; // el elemento que hay que mostrar y resaltar al pintar
let anclaEsperandoDesde = 0; // desde cuándo se espera un ancla que la sección aún no pintó
const MS_ESPERAR_ANCLA = 5000;
let borradorObjetivo: { texto: string; exito: string; horizonte: string; candidato: string } | null = null;
let destinos: Destino[] = []; // los botones «ir» de lo pintado: data-destino es su índice
/**
 * Los pasos marcados de una misión: los de la memoria del proyecto (viajan con lo demás y los ve el director, que así no
 * vuelve a pedir lo que ya marcaste); este navegador guarda una copia, que lee el director flotante.
 */
const pasosHechos = (id: string): number[] => {
  const marca = (d && 'estado' in d ? d.estado.pasos?.[id] : undefined) ?? { hechos: pasosHechosDe(d?.activo ?? '', id) };
  // Solo las marcas que valen para los pasos de hoy: si el director reescribió la misión, las de sus pasos viejos no
  // (pasosVigentes; el 9 de noviembre de 2026 una marca de un paso que ya no existía no dejaba cargar el Studio)
  const m = d?.plan?.misiones?.find((x) => x.id === id);
  return m ? pasosVigentes(m, marca) : marca.hechos;
};
/**
 * Las misiones abiertas de una persona, en su orden; la que solo espera la medición que ya corre va al final, y la de
 * ahora es la que sigue: lo largo no detiene a nadie y su paso se marca solo al terminar (nota de voz nmvv3fgp3tit).
 */
const abiertasDe = (persona: Persona) => sinEsperarLoLargo(misionesAbiertas(d.plan, d.estado, persona), pasosHechos, d.medicion);
/**
 * Marca o desmarca un paso (`hecho`: lo deja así; sin decirlo, lo invierte). `automatico`: por qué lo marca la página
 * sola, sin un clic para eso (la bitácora lo firma como el Studio: src/director/bitacora.ts › AUTOMATICOS).
 */
const marcarPaso = (id: string, i: number, hecho?: boolean, automatico?: 'paso_visto' | 'leido_entero') => {
  const hechos = new Set(pasosHechos(id));
  if (hecho ?? !hechos.has(i)) hechos.add(i);
  else hechos.delete(i);
  const lista = [...hechos].sort((a, b) => a - b);
  localStorage.setItem(clavePasos(d?.activo ?? '', id), JSON.stringify(lista));
  const m = d.plan.misiones.find((x) => x.id === id);
  d.estado.pasos = { ...(d.estado.pasos ?? {}), [id]: { hechos: lista, cuando: new Date().toISOString(), quien: d.identidad.nombre, ...(m ? { huellas: huellasDePasos(m, lista) } : {}) } };
  return accion({ tipo: 'paso', mision: id, hechos: lista, ...(automatico ? { automatico } : {}) }, '');
};

/**
 * Los pasos que se hacen dentro del Studio se marcan solos: el director le pone a cada uno lo que prueba que se hizo
 * (`hecho`: la meta fijada, una parte leída, una propuesta respondida…) y, en cuanto el Studio lo ve, lo marca, lo dice y ofrece volver a la misión; si era el último, la entrega. Sin modelo: es lo que el Studio ya lee.
 * Cada paso se marca solo una vez: si lo desmarcas, queda a mano (lo recuerda este navegador).
 */
const CLAVE_VISTOS = 'estudio.director.pasos-vistos';
let viendoPasos = false;
/** Si se pidió mirar los pasos mientras se miraban: se mira otra vez al terminar, para que ninguna nota quede sin ver. */
let verPasosOtraVez = false;
/** Las misiones completas sin entregar que este navegador ya intentó entregar solas: una vez cada una (completasSinEntregar). */
const entregaReintentada = new Set<string>();
/** El paso al que se acaba de llegar, realzado unos segundos: que se note que avanzó (avisoMision.ts › avanceDelPaso). */
let pasoRecien: { id: string; i: number; hasta: number } | null = null;
async function verPasosHechos() {
  if (viendoPasos) return void (verPasosOtraVez = true);
  if (!d || !('plan' in d) || !d.identidad.rol) return;
  try {
    await mirarPasosHechos(d.identidad.rol);
  } finally {
    if (verPasosOtraVez) {
      verPasosOtraVez = false;
      void verPasosHechos();
    }
  }
}

async function mirarPasosHechos(yo: Persona) {
  let vistos: Set<string>;
  try {
    vistos = new Set<string>(JSON.parse(localStorage.getItem(CLAVE_VISTOS) ?? '[]'));
  } catch {
    vistos = new Set();
  }
  const clave = (m: Mision, i: number) => claveDePasoVisto(d.activo, m, i, d.estado.notas);
  const nuevos = abiertasDe(yo)
    .filter((m) => m.para === yo && ['pendiente', 'en_curso', 'rehacer'].includes(estadoMision(m, d.plan, d.estado)))
    // En una para rehacer, lo elegido antes del veredicto no la vuelve a marcar
    .flatMap((m) => pasosVistos(m, d.proyecto, d.estado, estadoMision(m, d.plan, d.estado) === 'rehacer' ? d.plan.revisiones[m.id]?.cuando : undefined, d.medicion).filter((i) => !vistos.has(clave(m, i)) && !pasosHechos(m.id).includes(i)).map((i) => ({ m, i })));
  if (!nuevos.length) return entregarCompletas(yo);
  viendoPasos = true;
  try {
    for (const x of nuevos) vistos.add(clave(x.m, x.i));
    localStorage.setItem(CLAVE_VISTOS, JSON.stringify([...vistos].slice(-300)));
    const marcados = nuevos.map((x) => ({ ...x, guardado: marcarPaso(x.m.id, x.i, true, 'paso_visto') }));
    const x = marcados[0];
    const paso = x.m.pasos[x.i];
    // Elegir una opción deja a la persona en la misión: el aviso dice a qué paso llegó, sin botón para volver a donde ya está
    const eligio = typeof paso !== 'string' && !!paso.opciones?.length;
    const avance = avanceDelPaso(x.m.pasos.length, pasosHechos(x.m.id), x.i);
    pasoRecien = avance ? { id: x.m.id, i: avance.sigue - 1, hasta: Date.now() + RECIEN_MS } : null;
    repintoDeFondo.pedir();
    for (const y of marcados) if (await completarSiToca(y.m.id, y.guardado)) return void decir(tx('mision.completadaDirector'), 'riendo');
    decir(tx('paso.visto'), 'feliz');
    if (eligio && avance) avisar(tx('paso.sigueAviso', avance), true);
    else avisar(tx('paso.vistoAviso', { paso: recortar(textoPaso(paso), 80) }), true, undefined, { etiqueta: tx('paso.volverMision'), hacer: () => void ir({ vista: 'misiones', ancla: `mision-${x.m.id}`, etiqueta: '' }) });
  } finally {
    viendoPasos = false;
  }
}

/**
 * Una misión tuya con todos sus pasos marcados que no se entregó (la página se recargó a media entrega, o el último paso
 * se marcó mientras se miraban otros) se entrega sola, sin la pantalla «Entregar al director» de por medio (nota de voz
 * del titular nmw2rpl8atit). Una vez por misión en esta página: si el servidor no la guarda, queda su botón.
 */
async function entregarCompletas(yo: Persona) {
  const abiertas = abiertasDe(yo).filter((m) => m.para === yo && ['pendiente', 'en_curso'].includes(estadoMision(m, d.plan, d.estado)));
  const sueltas = completasSinEntregar(abiertas, pasosHechos).filter((id) => !entregandoSola.has(id) && !entregaReintentada.has(id));
  if (!sueltas.length) return;
  viendoPasos = true;
  try {
    for (const id of sueltas) {
      entregaReintentada.add(id);
      if (await completarSiToca(id, accion({ tipo: 'paso', mision: id, hechos: pasosHechos(id) }, ''))) return void decir(tx('mision.completadaDirector'), 'riendo');
    }
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
  for (const m of abiertasDe(yo ?? TITULAR)) {
    if (m.para !== yo || d.estado.pasos?.[m.id]) continue;
    const locales = pasosHechosDe(d.activo, m.id);
    if (locales.length) void accion({ tipo: 'paso', mision: m.id, hechos: locales, automatico: 'pasos_del_navegador' }, '');
  }
}

const $ = (id: string) => document.getElementById(id)!;
const ctx = (): Contexto => ({ plan: d.plan, estado: d.estado, senales: d.senales });
const titular = () => d.identidad.rol === TITULAR;
const nombreTitular = () => nombrePersona(TITULAR);
/** ¿El proyecto activo es nuevo (se plantea) o existente (se diagnostica)? */
const esNuevo = () => d?.proyecto.tipo === 'nuevo';
/** El nombre de un tratamiento, en el idioma de ahora; uno que no se conoce, como venga. */
const nombreTratamiento = (x: string) => (['integrada', 'rechazada', 'aplazada', 'decision', 'informada'].includes(x) ? nombreComoQuedo(x as ComoQuedo) : esc(x));
const nombreFrente = (id: string) => d.plan.frentes.find((f) => f.id === id)?.nombre ?? id;
const nombreFase = (id: string) => d.plan.fases.find((f) => f.id === id)?.nombre ?? id;
const numeroFase = (f: Fase) => d.plan.fases.indexOf(f);
const ultima = () => d.plan.fases.length - 1;
const corto = (etapa: string) => etapa.split(/[:(]/)[0].trim();
const tituloDoc = (ruta: string) => d.plan.documentos.find((x) => x.ruta === ruta)?.titulo ?? documentos?.find((x) => x.ruta === ruta)?.titulo ?? ruta.replace(/^docs\//, '').replace(/^repo:/, `${tx('docs.delProyecto')}: `);

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

/** El idioma de la interfaz: el que se guardó en este computador o, la primera vez, el del navegador, que se guarda una vez (pd_idiomas). */
const CLAVE_IDIOMA_LOCAL = 'estudio.idioma';
// La primera pintura, antes de saber lo que guardó el servidor: el idioma de la última vez en este navegador (o el del
// navegador), para que la cubierta de carga y lo fijo de index.html no salgan nunca en otro idioma
try {
  const local = localStorage.getItem(CLAVE_IDIOMA_LOCAL);
  ponerIdioma(esIdioma(local) ? local : idiomaDelNavegador(navigator.language));
} catch {}
aplicarTextosFijos();
let idiomaGuardandose = false;
let idiomaPorGuardar: Idioma | null = null;
let cambiosDeIdioma = 0;
function fijarIdioma(guardado: Idioma | null | undefined) {
  // Lo que se acaba de elegir con el selector manda sobre lo que traiga una carga que salió antes
  if (idiomaPorGuardar) return;
  const idioma = esIdioma(guardado) ? guardado : idiomaDelNavegador(navigator.language);
  ponerIdioma(idioma);
  if (esIdioma(guardado) || idiomaGuardandose) return;
  idiomaGuardandose = true;
  // Si no se pudo guardar, se vuelve a tomar del navegador la próxima vez: no hay nada que decirle a la persona
  void fetch('/__estudio/director/idioma', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idioma }) }).catch(() => {});
}

/** El selector ES y EN, al pie de la barra, siempre a la vista, con el de ahora resaltado (t_decide_selector_cuando). */
function pintarSelectorIdioma() {
  const caja = $('selector-idioma');
  caja.setAttribute('aria-label', tx('idioma.grupo'));
  caja.innerHTML = selectorIdioma(idiomaActual());
  // Lo fijo de index.html, que no trae frases: cada elemento nombra su clave (textosFijos.ts). El idioma queda también en
  // este navegador, para que la próxima carga pinte su cubierta en él desde el primer instante
  aplicarTextosFijos();
  try { localStorage.setItem(CLAVE_IDIOMA_LOCAL, idiomaActual()); } catch {}
  // Los círculos del director y el botón de la línea del enfoque, que están en index.html y zen.ts: en el idioma de la
  // interfaz (pd_interfaz_ingles, nmw6r9at1tit). «Qué está haciendo» cambia su nombre en vivo mientras revisa
  const comentario = document.querySelector<HTMLElement>('.atajo[data-escribir]');
  if (comentario) {
    comentario.dataset.etiqueta = tx('atajos.comentario');
    comentario.title = tx('atajos.comentarioTitulo');
    comentario.setAttribute('aria-label', tx('atajos.comentarioAria'));
  }
  const queHace = document.querySelector<HTMLElement>('.atajo[data-progreso]');
  if (queHace) {
    if (queHace.hidden) queHace.dataset.etiqueta = tx('atajos.queHace');
    queHace.title = tx('atajos.queHaceTitulo');
    queHace.setAttribute('aria-label', tx('atajos.queHaceAria'));
  }
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-franja-linea]')) b.textContent = tx(document.documentElement.classList.contains('linea-enfoque-oculta') ? 'enfoque.mostrarLinea' : 'enfoque.ocultarLinea');
  for (const s of document.querySelectorAll<HTMLElement>('.salida-enfoque span')) s.textContent = tx('enfoque.salir');
  pintarAvisoSinServidor();
}

/** Cambia el idioma de un toque: se ve enseguida y se guarda en este computador, para todos sus proyectos. */
async function cambiarIdioma(idioma: Idioma) {
  if (idioma === idiomaActual()) return;
  idiomaPorGuardar = idioma;
  cambiosDeIdioma++;
  ponerIdioma(idioma);
  if (d && 'plan' in d) {
    pintar();
    darDatosDirector(d); // su cara y «Ver como» también hablan en el idioma nuevo
    // El documento abierto, si trae su versión en el idioma nuevo, se abre en ella (nmw5o660stit)
    const yo = d.identidad.rol;
    // Con la lista de documentos sin cargar no hay versión que buscar: se carga antes de decidir
    if (doc && !documentos) await cargarDocumentos();
    const otra = doc ? rutaEnSuIdioma(doc.ruta, yo ? lecturaDe(yo) : []) : null;
    if (doc && otra && otra !== doc.ruta) void abrirDocumento(otra, null, copiaEnClave);
  } else pintarSelectorIdioma();
  sonidosAlCambiarIdioma(); // «Sonidos» lista y guarda las voces del idioma nuevo (nmvyq4syjtit)
  const ok = await fetch('/__estudio/director/idioma', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idioma }) }).then((r) => r.ok).catch(() => false);
  idiomaPorGuardar = null;
  if (!ok) avisar(tx('idioma.noGuardado'));
}

/** Lo último que llegó de cada parte de la consulta, con su huella. */
const memoriaDePartes: MemoriaDePartes = new Map();
/** Lo que llega de fondo, mientras algo se narra, se pinta al quedar libre. */
const repintoDeFondo = repintoEnEspera({ ocupado: narrando, pintar: () => pintar() });
/**
 * La última caída del servidor, una vez, en «Dónde quedamos» (nota de voz del titular nmw6z1eartit, 7 de noviembre de
 * 2026): cuándo pasó, su código, sus causas probables y qué hacer si vuelve a pasar, con las últimas líneas del registro
 * plegadas. Se pide en la primera carga (cargar) y se marca vista al mostrarse: sigue a la vista en esta página, y al volver
 * a abrir el Studio ya no sale (estudio/servidor/ultimaCaida.ts)
 */
let caidaDq: Caida | null = null, caidaPedida = false, caidaMarcada = false;
const CAUSAS_CAIDA: Record<CausaCaida, ClaveDeTexto> = {
  memoria: 'dq.caidaMemoria', puerto: 'dq.caidaPuerto', modulo: 'dq.caidaModulo', sintaxis: 'dq.caidaSintaxis',
  permiso: 'dq.caidaPermiso', disco: 'dq.caidaDisco', desconocida: 'dq.caidaDesconocida',
};
async function cargarCaida() {
  const r = await fetch('/__estudio/director/caida').then((x) => (x.ok ? x.json() : null)).catch(() => null) as { caida?: Caida | null; carpeta?: string } | null;
  caidaDq = r?.caida ?? null;
  // La carpeta del Studio, guardada mientras el servidor responde: el aviso de servidor caído la nombra (nmw71bfm4tit)
  guardarCarpetaDelStudio(r?.carpeta);
  aplicarTextosFijos();
}
function informeCaidaDq() {
  if (!caidaDq) return '';
  if (!caidaMarcada) { caidaMarcada = true; void fetch('/__estudio/director/caida/vista', { method: 'POST' }).catch(() => {}); }
  const causas = caidaDq.causas.map((c) => tx(CAUSAS_CAIDA[c] ?? 'dq.caidaDesconocida')).join(tx('dq.y'));
  const registro = caidaDq.lineas.length ? `<details><summary>${tx('dq.caidaRegistro')}</summary><pre>${esc(caidaDq.lineas.join('\n'))}</pre></details>` : '';
  return `<div class="negados-dq caida-dq"><p>⚠ ${tx('dq.caida', { cuando: esc(momento(caidaDq.cuando)), codigo: caidaDq.codigo ?? '—', causas: esc(causas), carpeta: esc(laCarpetaDelStudio()) })}</p>${registro}</div>`;
}

async function cargar(fresco = false) {
  const marca = cambiosLocales;
  const marcaIdioma = cambiosDeIdioma;
  // Solo viaja lo que no se tiene ya: esto se dice por sus huellas, y lo que no viene se arma con lo que ya llegó (partesDeConsulta.ts)
  const tengo = escribirTengo([...memoriaDePartes].map(([p, v]) => [p, v.huella] as const));
  // En la primera carga, la última caída del servidor, si no se mostró (informeCaidaDq)
  if (!caidaPedida) { caidaPedida = true; await cargarCaida(); }
  const r = await fetch(`/__estudio/director?tengo=${encodeURIComponent(tengo)}${fresco ? '&fresco=1' : ''}`);
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? tx('nuevo.servidorRespondio', { estado: r.status }));
  const nuevo: Datos | SinProyectos = unirConsulta(await r.json(), memoriaDePartes);
  if ('sinProyectos' in nuevo) return pintarBienvenida(nuevo);
  if (marcaIdioma === cambiosDeIdioma) fijarIdioma(nuevo.idioma);
  // Con algo guardándose (o mandado a guardar mientras llegaba esto), lo de aquí es lo más nuevo: no se deshace
  if (d && d.activo === nuevo.activo && (enVuelo > 0 || marca !== cambiosLocales)) nuevo.estado = d.estado;
  // La revisión que se pidió desde aquí acaba de terminar: se dice, y lo nuevo ya está pintado
  const termino = d?.activo === nuevo.activo && !!d.revision && !d.revision.hecha && !!nuevo.revision?.hecha;
  // Cerrada, con el director todavía vivo (termina lo último), la recarga espera a que salga: una sola (trabajando.ts)
  const tras = d?.activo === nuevo.activo ? recargaTrasRevision({ termino, espera: esperaTrasRevision, pedida: nuevo.revision?.pedida, vivo: !!nuevo.revisor?.revisando, ahora: Date.now() }) : null;
  // Desde que la revisión se cierra, la línea de la barra se queda como estaba hasta la recarga (nmw0ypwnrtit)
  if (lineaSeCongela({ termino, tras, espera: esperaTrasRevision, recargando: contando || !!esperaRecarga })) lineaCongelada = true;
  // Mientras el director trabaja, lo que va escribiendo en el plan no se pinta a pedazos (te movería lo que lees): llega
  // todo junto al terminar, con la recarga
  if (d && d.activo === nuevo.activo && (directorTrabaja(nuevo) || tras === 'esperar')) nuevo.plan = d.plan;
  document.body.classList.remove('sin-proyectos');
  // Otro proyecto: lo abierto del anterior no sirve
  if (d && d.activo !== nuevo.activo) {
    seccionesVistas.clear();
    respondidasVistas = RESPONDIDAS_DE_A;
    doc = null;
    documentos = null;
    faseVista = null;
    pestanaDeFase.clear();
    borradorObjetivo = null;
    consulta = null;
    celda = null;
    busquedaBuzon = '';
    tipoBuzon = '';
    comoBuzon = '';
    // La columna de los documentos vuelve arriba. El repintado toma su scroll de la que está en pantalla, que es la del
    // anterior: también esa vuelve arriba (si no, el proyecto nuevo heredaba hasta dónde bajaste en el otro)
    scrollColumna = 0;
    $('vista').querySelector<HTMLElement>('.lista-docs')?.scrollTo(0, 0);
  }
  // Si no llegó nada nuevo, no se repinta (no se pierde la lectura ni lo que suena): solo la hora de la sincronización
  // La medición del núcleo también: lo que avanza cada vuelta se ve sin salir de la página (nota de voz del titular
  // nmvs9on6ktit, 28 de octubre de 2026)
  // Una misión que se está entregando sigue entregada mientras el servidor la guarda (completarSiToca)
  if (d?.activo === nuevo.activo) nuevo.estado = conEntregasEnVuelo(nuevo.estado, entregasEnVuelo);
  // Lo que pesa se compara entero solo si no es lo mismo que ya estaba: leerlo dos veces en cada consulta también detenía la página
  const liviano = (x: Datos) => JSON.stringify([x.activo, x.proyectos, x.transcribiendo, x.sinTranscribir, x.identidad, x.errores, x.proyecto, x.repositorio, x.arranque, x.revision, x.aclaracion, x.urgencia, x.medicion]);
  const pesado = (x: Datos) => JSON.stringify([x.plan, x.estado, x.transcripciones]);
  const cambio = !d || liviano(nuevo) !== liviano(d) || (!(mismoPorEncima(nuevo.plan, d.plan) && mismoPorEncima(nuevo.estado, d.estado) && nuevo.transcripciones === d.transcripciones) && pesado(nuevo) !== pesado(d));
  const antes = d?.activo === nuevo.activo ? d.transcribiendo ?? [] : [];
  // La que estaba en marcha acaba de fallar: se avisa en ese momento, con su reporte a un clic (nunca en silencio)
  const fallo = d?.activo === nuevo.activo && !!d.revision && !d.revision.hecha && !d.revision.error && !!(d.revision.lanzada || d.revision.enCurso) && nuevo.revision?.pedida === d.revision.pedida && !!nuevo.revision.error;
  // El paso que se pidió aclarar ya está reescrito (o no se pudo, y queda para la revisión)
  const aclarado = d?.activo === nuevo.activo && !!d.aclaracion && !d.aclaracion.hecha && !d.aclaracion.error && nuevo.aclaracion?.pedida === d.aclaracion.pedida ? nuevo.aclaracion : null;
  // Lo urgente ya está atendido (o siguió con las que llegaron mientras tanto), o no se pudo y queda para la revisión
  const urgenciaAntes = d?.activo === nuevo.activo && urgenciaEnCurso(d.urgencia) ? d.urgencia : null;
  const urgenciaLista = !!urgenciaAntes && (nuevo.urgencia?.pedida !== urgenciaAntes.pedida || !!nuevo.urgencia?.hecha);
  const urgenciaFallo = !!urgenciaAntes && nuevo.urgencia?.pedida === urgenciaAntes.pedida && nuevo.urgencia.error ? nuevo.urgencia.error : null;
  // La señal de que el director trabaja sobrevive a las recargas: si la página se recargó a mitad de la revisión y ya
  // terminó, aquí es donde se sabe (no hay un estado de antes con que comparar)
  const rv = nuevo.revision;
  const enCurso = rv && !rv.hecha && (rv.enCurso || rv.lanzada) ? `${nuevo.activo}:${rv.pedida}` : null;
  const guardada = trabajandoGuardado();
  const terminoTrasRecarga = !termino && !d && !!guardada && !enCurso && guardada === `${nuevo.activo}:${rv?.pedida}` && !!rv?.hecha;
  // Si el director aún termina lo último, su recarga también espera aquí: la de ahora no fue la de la revisión
  if (terminoTrasRecarga && nuevo.revisor?.revisando) esperaTrasRevision = { pedida: rv!.pedida, desde: Date.now() };
  // La señal sigue mientras la recarga espera: si recargas a mano entretanto, se sabe que la revisión terminó
  marcarTrabajando(enCurso ?? (tras === 'esperar' || (terminoTrasRecarga && esperaTrasRevision) ? `${nuevo.activo}:${rv!.pedida}` : null));
  // Las seguidas acaban de parar: su porqué llega unos segundos después del cierre de la revisión
  const paroNuevo = d?.activo === nuevo.activo && nuevo.seguidas?.paro && nuevo.seguidas.paro.cuando !== d.seguidas?.paro?.cuando ? nuevo.seguidas.paro : null;
  d = nuevo;
  // Recargada a mitad de la revisión, y ya terminó: lo dice el arranque, con el reporte y «¿Dónde quedamos?», como tras su recarga
  if (terminoTrasRecarga && !esperaTrasRevision) sessionStorage.setItem(CLAVE_TERMINO, '1');
  // Se dice en ese momento, estés donde estés, y si «¿Dónde quedamos?» ya está abierto, va arriba de todo (pedido pd_parada_visible)
  if (paroNuevo) {
    const cabeza = document.querySelector('dialog.donde-quedamos[open] .dq-cabeza');
    if (!cabeza) avisar(tx('aviso.seguidasPararon', { porque: paroNuevo.porque }), false, undefined, { etiqueta: tx('cabeza.dondeQuedamos'), hacer: () => void mostrarDondeQuedamos() });
    else if (!cabeza.querySelector('.dq-paro')) cabeza.querySelector('h2')?.insertAdjacentHTML('afterend', lineaDeParo(paroNuevo));
  }
  // «La revisión…» o «The review…»: el reporte que escribió el servidor, en el idioma de ese momento, que ya la nombra
  if (fallo) avisar(((q) => (q?.startsWith('La revisión') || q?.startsWith('The review') ? `${q}.` : `${tx('aviso.revisionNoTermino')}${q ? ` ${q}.` : ''}`))(d.revision!.falla?.que), false, undefined, { etiqueta: tx('paso.quePaso'), hacer: () => void mostrarFalla() });
  if (aclarado?.hecha) avisar(tx(aclarado.comprobar ? 'aviso.pasoComprobado' : 'aviso.pasoReescrito'), true, undefined, { etiqueta: tx('aviso.verPaso'), hacer: () => void ir({ vista: 'misiones', ancla: `mision-${aclarado.mision}`, etiqueta: '' }) });
  else if (aclarado?.error) avisar(tx('aviso.aclaracionFallo', { error: aclarado.error }), false, undefined, { etiqueta: tx('paso.quePaso'), hacer: () => void mostrarFallaAparte('aclaracion') });
  if (urgenciaFallo) avisar(tx('aviso.urgenciaFallo', { error: urgenciaFallo }), false, undefined, { etiqueta: tx('paso.quePaso'), hacer: () => void mostrarFallaAparte('urgencia') });
  else if (urgenciaLista) avisar(tx('aviso.urgenciaAtendida'), true, undefined, { etiqueta: tx('aviso.verResultado'), hacer: () => void mostrarDondeQuedamos() });
  // Al terminar, la página se recarga entera, una vez: si el director cambió el código del Studio, se ve sin refrescar a
  // mano. Con el director todavía vivo, espera a que salga; con algo a medio escribir o grabando, a que quede libre (el
  // aviso se da después de recargar)
  if (tras === 'esperar' && !esperaTrasRevision) esperaTrasRevision = { pedida: nuevo.revision!.pedida, desde: Date.now() };
  if (tras === 'ya') {
    recargarLaRevision();
    // La recarga ya viene, con su cuenta: no se pinta lo nuevo dos veces
    return;
  }
  sincronizarPasos();
  darDatosDirector(d);
  // Con algo narrándose, lo nuevo espera a que quede libre: pintar la vista quitaría la niebla y callaría la voz (repintoEnEspera.ts)
  if (!cambio || !repintoDeFondo.pedir()) {
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

const CLAVE_ENTREGAR_AL_CARGAR = 'estudio.asistente.entregar';
const CLAVE_TERMINO = 'estudio.revision_terminada';
const CLAVE_SONO = 'estudio.revision_terminada.sono';
let esperaRecarga: ReturnType<typeof setInterval> | null = null;
/** La línea de la barra, quieta desde que la revisión se cierra hasta la recarga (trabajando.ts › lineaSeCongela). */
let lineaCongelada = false;
/** La revisión cerrada cuya recarga espera a que el director termine lo último (trabajando.ts › recargaTrasRevision). */
let esperaTrasRevision: EsperaTrasRevision | null = null;
/** La recarga que viene trae un reinicio del servidor: se espera a que vuelva (también si se supo con la cuenta ya en marcha). */
let conReinicio = false;
let contando = false;
/** Al terminar la revisión, una sola recarga, anunciada con su cuenta (así se ve lo nuevo, también el código del Studio). */
function recargarLaRevision() {
  esperaTrasRevision = null;
  // El sonido, antes de recargar: después de la recarga el navegador ya no deja sonar sin un clic
  if (sonar('revision')) sessionStorage.setItem(CLAVE_SONO, '1');
  // Y la voz de «¿Dónde quedamos?», que se abre solo tras la recarga, ya empieza a prepararse (pd_voz_dq_al_cerrar)
  prepararDondeQuedamos();
  sessionStorage.setItem(CLAVE_TERMINO, '1');
  recargarConCuenta(tx('recarga.revisionTermino'));
}

/** La recarga que viene trae un reinicio del servidor: la cuenta lo espera, también si ya estaba contando. */
function conReinicioDelServidor() {
  if (conReinicio) return;
  conReinicio = true;
  if (!contando) return;
  import.meta.hot?.send('estudio:libre-para-reiniciar');
  const ya = document.querySelector<HTMLButtonElement>('#cubierta-carga .cubierta-ya');
  if (ya) ya.hidden = true;
}

/** ¿El director trabaja ahora en este proyecto? (una revisión empezada o lanzada, o una aclaración o urgencia lanzadas) */
function directorTrabaja(x: Datos): boolean {
  const r = x.revision;
  const corriendo = (y: { lanzada?: string; hecha?: string; error?: string } | null | undefined) => !!y && !!y.lanzada && !y.hecha && !y.error;
  return (!!r && !r.hecha && !r.error && !!(r.enCurso || r.lanzada)) || corriendo(x.aclaracion) || corriendo(x.urgencia);
}

const SEGUNDOS_CUENTA = 3;
const cargadaEn = Date.now();

/**
 * La única recarga: la cubierta de carga a pantalla completa, con su cuenta de tres segundos y «Ya», y después la
 * recarga (que vuelve a mostrar la cubierta hasta que el Studio esté pintado). Con algo a medio escribir o grabando,
 * espera a que quede libre. Con `reinicio`, el servidor del Studio se reinicia: la página se recarga cuando vuelva.
 */
function recargarConCuenta(motivo: string, reinicio = false) {
  lineaCongelada = true;
  // Si ya viene una recarga y ahora se supo que el servidor se reinicia, la misma cuenta lo espera: nunca dos recargas
  if (reinicio) conReinicioDelServidor();
  if (esperaRecarga) return;
  const empezar = () => {
    if (ocupado() || narrando()) return false;
    if (esperaRecarga) clearInterval(esperaRecarga);
    esperaRecarga = setTimeout(() => {}, 0);
    contando = true;
    let falta = SEGUNDOS_CUENTA;
    const texto = () => tx('recarga.cuenta', { motivo, falta });
    mostrarCubierta(texto(), conReinicio ? undefined : () => recargarYa());
    // El servidor espera esta señal para reiniciarse: así nunca se lleva lo que alguien escribe o graba (recarga.ts)
    if (conReinicio) import.meta.hot?.send('estudio:libre-para-reiniciar');
    const cuenta = setInterval(() => {
      falta -= 1;
      if (falta > 0) return void ponerTextoCubierta(texto());
      clearInterval(cuenta);
      ponerTextoCubierta(tx('recarga.actualizando'));
      if (conReinicio) void esperarAlServidor();
      else recargarYa();
    }, 1000);
    return true;
  };
  // Un momento, para que el sonido alcance a oírse antes de empezar
  esperaRecarga = setTimeout(() => {
    esperaRecarga = null;
    if (!empezar()) esperaRecarga = setInterval(() => void empezar(), 2000);
  }, 900);
}

function recargarYa() {
  location.reload();
}

/** El servidor se reinicia: se espera a que se vaya y vuelva (o, si nunca se fue, un momento) y se recarga una vez. */
async function esperarAlServidor() {
  let seFue = false;
  const inicio = Date.now();
  while (Date.now() - inicio < 60_000) {
    await new Promise((listo) => setTimeout(listo, 1500));
    const vivo = await fetch('/', { method: 'HEAD', cache: 'no-store' }).then(() => true, () => false);
    if (!vivo) seFue = true;
    else if (seFue || Date.now() - inicio > 12_000) return recargarYa();
  }
  recargarYa();
}

/** La cubierta de carga (está en index.html desde el primer momento): se quita cuando el Studio ya está pintado. */
function quitarCubierta() {
  const c = document.getElementById('cubierta-carga');
  if (!c || c.classList.contains('en-cuenta')) return;
  c.classList.add('saliendo');
  setTimeout(() => c.setAttribute('hidden', ''), 380);
}

function mostrarCubierta(texto: string, ya?: () => void, etiqueta = tx('recarga.ya')) {
  const c = document.getElementById('cubierta-carga');
  if (!c) return;
  c.removeAttribute('hidden');
  c.classList.remove('saliendo');
  c.classList.add('en-cuenta');
  ponerTextoCubierta(texto);
  const b = c.querySelector<HTMLButtonElement>('.cubierta-ya');
  if (b) {
    b.hidden = !ya;
    b.textContent = etiqueta;
    b.onclick = ya ? () => ya() : null;
    if (ya) b.focus();
  }
}

function ponerTextoCubierta(texto: string) {
  const t = document.getElementById('cubierta-texto');
  if (t) t.textContent = texto;
}

// El servidor retuvo los cambios del Studio mientras el director trabajaba (estudio/servidor/recarga.ts): ahora, una
// sola recarga. Si la página es de hace un momento, ya los trae: no hace falta
import.meta.hot?.on('estudio:recargar', (x?: { reinicio?: boolean; abrir?: boolean }) => {
  // La revisión ya cerró y su recarga esperaba a que el director saliera: esta es esa, la única. Se trae lo último (la
  // voz de «¿Dónde quedamos?» se prepara con eso) y cargar() la lanza; si el servidor no responde, se recarga igual
  if (esperaTrasRevision && !x?.abrir) {
    if (x?.reinicio) conReinicioDelServidor();
    const recargarSiSigue = () => { if (esperaTrasRevision) recargarLaRevision(); };
    return void cargar(true).then(recargarSiSigue, recargarSiSigue);
  }
  if (!x?.reinicio && Date.now() - cargadaEn < 10_000) return;
  // Abriste el Studio otra vez (doble clic) con el servidor ya encendido: no se enciende otro, se recarga esta página
  recargarConCuenta(tx(x?.abrir ? 'recarga.abriste' : 'recarga.directorTermino'), !!x?.reinicio);
});

// Abriste el Studio otra vez (doble clic) y se abrió en una pestaña nueva, al frente: esta le cede el lugar
// (estudio/servidor/recarga.ts › cederALaNueva). Se cierra si el navegador lo deja (una pestaña que no cambió de
// página); si no, queda cubierta, con «Seguir en esta pestaña». Nunca mientras escribes, grabas o el Studio te lee: espera
// a que quede libre. La que abre mirar.ts para sus capturas no se toca
import.meta.hot?.on('estudio:ceder', () => {
  if (navigator.webdriver) return;
  // Lo que hizo queda en la bitácora del Studio
  const contar = (como: 'cierra' | 'cubierta' | 'espera') => import.meta.hot?.send('estudio:cedio', { como, historial: history.length });
  const ceder = () => {
    if (ocupado() || narrando()) return false;
    contar('cierra');
    window.close();
    setTimeout(() => {
      contar('cubierta');
      mostrarCubierta(tx('recarga.otraPestana'), () => recargarYa(), tx('recarga.seguirAqui'));
    }, 500);
    return true;
  };
  if (!ceder()) {
    contar('espera');
    const espera = setInterval(() => { if (ceder()) clearInterval(espera); }, 2000);
  }
});

/** El director terminó: un aviso grande, el sonido (si no sonó ya antes de recargar) y el título de la pestaña. */
function avisarTermino() {
  if (!sessionStorage.getItem(CLAVE_SONO)) sonar('revision');
  sessionStorage.removeItem(CLAVE_SONO);
  tituloTermino();
  avisar(tx('recarga.nuevoEnElStudio'), true);
  const e = $('error');
  e.classList.add('termino');
  setTimeout(() => e.classList.remove('termino'), 12000);
}

/** Lo urgente que el director todavía atiende (pedido o lanzado, sin cerrar ni fallar). */
function urgenciaEnCurso(u: Datos['urgencia']): u is NonNullable<Datos['urgencia']> {
  return !!u && !u.hecha && !u.error;
}

/** Qué es lo negado en vivo, para quien lo ve mientras el director trabaja. */
const NEGADOS_VIVO = () => tx('negados.vivo');

/** La cifra de tokens que se ve ahora junto a «El director está revisando», mientras sube hacia la nueva. */
let tokensMostrados: number | null = null;
let cuentaTokens = 0;

/**
 * Los tokens del director, en vivo (propuesta aceptada el 21 de octubre de 2026): cada vez que cambia la cifra, sube
 * hasta la nueva con una cuenta corta; con movimiento reducido, salta. Sin revisión en marcha, se olvida.
 */
function contarTokens(meta: number | null) {
  cancelAnimationFrame(cuentaTokens);
  if (meta === null) return void (tokensMostrados = null);
  const desde = tokensMostrados ?? meta;
  const pintar = (x: number) => {
    tokensMostrados = x;
    rotularProgreso();
  };
  if (desde === meta || matchMedia('(prefers-reduced-motion: reduce)').matches) return pintar(meta);
  const inicio = performance.now();
  const paso = (t: number) => {
    const k = Math.min(1, (t - inicio) / 700);
    pintar(Math.round(desde + (meta - desde) * (1 - (1 - k) ** 3)));
    if (k < 1) cuentaTokens = requestAnimationFrame(paso);
  };
  cuentaTokens = requestAnimationFrame(paso);
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
  const u = urgenciaEnCurso(d.urgencia) ? d.urgencia : null;
  // Con algo corriendo, no está parado aunque su registro no crezca (pr_procesos_vista, punto 2)
  const parada = d.enCurso ? 0 : minutosSinActividad();
  const ocupado = directorOcupado();
  const lineas = [
    ...(procesando ? [`<span class="sp-linea">${tx('segundoPlano.transcribiendo', { n: procesando })}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></span>`] : []),
    // Lo urgente va solo y se distingue: el director lo atiende aparte, mientras sigues con lo tuyo
    ...(u ? [`<span class="sp-linea alerta">${u.lanzada ? `${tx('segundoPlano.atiendeUrgente')}${seguimientoAparte(u.lanzada, MIN_URGENCIA)}` : tx('segundoPlano.urgenteVa')}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></span>`] : []),
    // La revisión en marcha no va aquí: tapaba lo que se lee, también dentro de un diálogo, y la cabecera ya la dice. Va
    // en su atajo (rotularProgreso), en la columna de la derecha (nota de voz del titular nmvoottaitit, 25 de octubre)
    ...(r.estado === 'pedida' ? [`<span class="sp-linea" title="${esc(r.texto)}">${tx('cabeza.revisionPedida', { hora: hora(d.revision!.pedida) })}${automatica() && (ocupado || esperaCandado()) ? tx('cabeza.esperaTurno') : ''}</span>`] : []),
    // Un director vivo sin revisión de este proyecto en marcha: qué corre, y por qué no se puede pedir otra
    // La medición del núcleo, como en la cabecera, lleva a su tarjeta (nota de voz del titular nmvviiwfqtit)
    ...(r.estado === 'ninguna' && ocupado ? [d.medicion?.enMarcha
      ? `<button type="button" class="sp-linea" data-ver-medicion title="${esc(tx('segundoPlano.clicMedicion', { porque: ocupado.porque }))}">${esc(ocupado.corto)}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></button>`
      : `<span class="sp-linea" title="${esc(ocupado.porque)}">${esc(ocupado.corto)}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></span>`] : []),
    ...(r.estado === 'sin_vigilia' ? [`<button type="button" class="sp-linea alerta" data-revision="explicar">⚠ ${d.revision?.error ? `${tx('cabeza.revisionNoTermino')} · ${tx('cabeza.porQue')}` : tx('cabeza.revisionSinTomar')}</button>`] : []),
    // Lo urgente que no se cerró, mientras ninguna revisión respondió sus notas: su reporte y «Retomarla» (pr_retoma_automatica, punto 5)
    ...(urgenciaFallida() ? [`<button type="button" class="sp-linea alerta" data-aparte="urgencia">⚠ ${tx('segundoPlano.urgenteNoTermino')} · ${tx('cabeza.porQue')}</button>`] : []),
  ];
  caja.innerHTML = lineas.join('');
  caja.hidden = !lineas.length;
  contarTokens(r.estado === 'en_curso' ? (d.tokensVivos ?? null) : null);
  // Mientras el director trabaja, se navega, se lee y se avanza en las misiones; lo que cambia la ruta espera (ver
  // libreMientrasRevisa)
  document.body.classList.toggle('director-trabajando', r.estado === 'en_curso');
  const info = document.querySelector<HTMLElement>('.atajo[data-progreso]');
  // Lo urgente, ya lanzado y sin revisión en marcha, también trae su atajo y lo que va haciendo (atiendeUrgencia)
  const urgente = atiendeUrgencia();
  if (info) {
    // En una revisión, lo que va haciendo lo abre el director de la línea viva, con un clic (nota de voz del titular
    // nmvtnwub1tit): el atajo queda solo para lo urgente y para cuando la línea no se ve (el teléfono, una pantalla baja)
    info.hidden = urgente ? false : r.estado !== 'en_curso' || directorEnLinea() !== null;
    info.classList.toggle('activo', progresoAbierto);
    // Lo que se le niega mientras trabaja, al momento y no solo al final (propuesta «Los permisos, al momento»): una
    // cifra roja sobre el atajo, que abre lo que va haciendo con lo negado arriba
    const negados = r.estado === 'en_curso' && d.negadosVivos?.length ? porAutorizarEnVivo(d.negadosVivos) : [];
    info.classList.toggle('trabajando', (r.estado === 'en_curso' && !parada) || urgente);
    info.classList.toggle('alerta', r.estado === 'en_curso' && !!parada);
    info.dataset.cifra = negados.length ? String(negados.length) : '';
    info.title = [urgente ? tx('progreso.verUrgente') : parada ? PARADA(parada) : tx('progreso.ver'), ...(negados.length ? [`${NEGADOS_VIVO()} ${negados.join('; ')}`] : [])].join(' ');
    rotularProgreso();
  }
  pintarProgreso(r.estado === 'en_curso' || urgente);
  pintarInfoJugador();
}

/**
 * Tu nivel y tu avance, en un icono de información abajo a la izquierda de la cara del director flotante (pedido
 * pd_panel_revision, notas de voz del titular nmw12urbdtit y nmw16j8a4tit, 3 de noviembre de 2026): ya no ocupan un lado
 * de «Hoy», donde le quitaban espacio a la misión. Un clic abre un globo con tu ficha; otro clic en el icono, Esc o un clic
 * fuera lo cierran. Van dentro del director flotante, que está siempre a la vista: antes se colgaban del director de la
 * línea, que solo aparece mientras corre una revisión, y sin revisión el icono no estaba (nota nmw17uq82tit). Dentro de él,
 * se mueven con su cara y suben con él encima de un diálogo abierto (encima.ts).
 */
let infoJugadorAbierta = false;
function pintarInfoJugador() {
  const rol = d?.identidad.rol;
  const flotante = document.getElementById('director-flotante');
  let boton = document.getElementById('info-jugador') as HTMLButtonElement | null;
  let globo = document.getElementById('globo-jugador');
  if (!flotante || !rol) {
    if (boton) boton.hidden = true;
    if (globo) globo.hidden = true;
    infoJugadorAbierta = false;
    flotante?.classList.remove('con-info');
    return;
  }
  if (!boton) {
    boton = document.createElement('button');
    boton.type = 'button';
    boton.id = 'info-jugador';
    boton.className = 'info-jugador';
    boton.dataset.infoJugador = '';
    boton.setAttribute('aria-controls', 'globo-jugador');
    boton.innerHTML = icono('info');
  }
  if (boton.parentElement !== flotante) flotante.append(boton);
  boton.title = tx('jugador.info');
  boton.setAttribute('aria-label', tx('jugador.info'));
  boton.setAttribute('aria-expanded', String(infoJugadorAbierta));
  boton.hidden = false;
  // Abierto, lo que dice el director se recoge para no quedar debajo de tu ficha (director.css › .con-info)
  flotante.classList.toggle('con-info', infoJugadorAbierta);
  if (!infoJugadorAbierta) {
    if (globo) globo.hidden = true;
    return;
  }
  if (!globo) {
    globo = document.createElement('div');
    globo.id = 'globo-jugador';
    globo.className = 'globo-jugador';
    globo.setAttribute('role', 'dialog');
  }
  if (globo.parentElement !== flotante) flotante.append(globo);
  globo.setAttribute('aria-label', tx('jugador.info'));
  globo.innerHTML = fichaPersona(rol);
  globo.hidden = false;
}
function abrirInfoJugador(si: boolean) {
  infoJugadorAbierta = si;
  pintarInfoJugador();
}
document.addEventListener('click', (e) => {
  const t = e.target as Element;
  if (t.closest('[data-info-jugador]')) abrirInfoJugador(!infoJugadorAbierta);
  else if (infoJugadorAbierta && t.isConnected && !t.closest('#globo-jugador') && !t.closest('dialog[open]')) abrirInfoJugador(false);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && infoJugadorAbierta) abrirInfoJugador(false); });

/** Lo que dice la ventana mientras la revisión se pidió y aún no se lanza: en qué va, con las palabras de la cabecera. */
const progresoSinEmpezar = () => {
  const r = estadoRevision();
  return r.estado === 'en_curso' || atiendeUrgencia() ? null : r.texto;
};

/**
 * ¿El director atiende ahora lo urgente, sin una revisión en marcha? Entonces la cabecera trae el mismo atajo y lo que va
 * haciendo que en una revisión, con un aviso de que es una urgencia (nota de voz del titular nmvsytu00tit, 28 de octubre
 * de 2026: solo se veía la leyenda en rojo y «Detener» no se leía).
 */
function atiendeUrgencia(): boolean {
  return !!d && 'plan' in d && estadoRevision().estado !== 'en_curso' && urgenciaEnCurso(d.urgencia) && !!d.urgencia.lanzada;
}

/**
 * La revisión en marcha, discreta y sin tapar nada (nota de voz del titular nmvoottaitit, 25 de octubre de 2026): el
 * atajo de lo que va haciendo late mientras el director trabaja, y su nombre, al pasar el ratón, dice cómo va, cuántos
 * tokens lleva y lo que se le negó. Sin actividad en un buen rato, se pone rojo y lo dice (lo que se ve es verdad).
 */
function rotularProgreso() {
  const info = document.querySelector<HTMLElement>('.atajo[data-progreso]');
  if (!info || !d) return;
  // Con algo corriendo, no está parado aunque su registro no crezca (pr_procesos_vista, punto 2)
  const parada = d.enCurso ? 0 : minutosSinActividad();
  const n = estadoRevision().estado === 'en_curso' && d.negadosVivos?.length ? porAutorizarEnVivo(d.negadosVivos).length : 0;
  const tokens = tokensMostrados ?? d.tokensVivos ?? null;
  info.dataset.etiqueta = [
    atiendeUrgencia() ? tx('segundoPlano.atiendeUrgente') : parada ? tx('progreso.sinActividad') : tx('cabeza.revisando'),
    ...(tokens ? [`${miles(tokens)} tokens`] : []),
    ...(n ? [tx('progreso.negados', { n })] : []),
  ].join(' · ');
  for (const el of document.querySelectorAll<HTMLElement>('[data-tokens-vivos]')) el.textContent = tokens ? `${miles(tokens)} tokens` : '';
}

/**
 * Lo que va haciendo el director mientras revisa, en vivo: lo que dice y cada cosa que hace (lee, edita, corre las
 * pruebas…), lo más nuevo arriba (nota de voz del titular, 26 de octubre de 2026). Se abre con el atajo de información y
 * se actualiza con cada consulta al servidor. Arriba, solo si hay algo por autorizar, el área de permisos: mitad y mitad
 * con la de los pasos, cada una con su desplazamiento; sin nada pendiente, los pasos ocupan todo el panel.
 */
// Abierto, sigue abierto al recargar la página mientras dure la misma revisión (lo recuerda esta pestaña)
const CLAVE_PROGRESO = 'estudio.director.progreso-abierto';
// El panel de la revisión, plegado o desplegado como lo dejaste (lo recuerda este navegador)
const CLAVE_PANEL_PLEGADO = 'estudio.director.panel-plegado';
const revisionEnPantalla = () => (d?.revision ? `${d.activo}:${d.revision.pedida}` : '');
let progresoAbierto = false;
/** ¿Corre una revisión (o lo urgente) y lo que va haciendo va en el panel de todo el alto? Entonces la cara lo abre y lo cierra. */
let panelDeRevision = false;
/** Hasta dónde llegaron los actores de la avalancha en esta revisión (progresoVivo.ts › recordarAvance): sobrevive a cerrar y abrir el panel. */
let avanceRecordado: RecuerdoDeAvance | null = null;
function pintarProgreso(trabajando: boolean) {
  const caja = document.getElementById('progreso-director');
  if (!caja) return;
  if (!progresoAbierto && trabajando && sessionStorage.getItem(CLAVE_PROGRESO) === revisionEnPantalla()) progresoAbierto = true;
  // Mientras corre una revisión, es un panel de todo el alto entre la barra de la línea y el contenido (pedido
  // pd_panel_revision, nota de voz del titular nmw12urbdtit); fuera de ella, el globo que abre el director de la línea para
  // mirar una revisión pasada. Lo abre y lo cierra solo la cara del director que trabaja, la de las bolitas: cerrado no
  // deja ninguna barra a la vista ni botón en medio (nota de voz del titular nmw18d768tit)
  panelDeRevision = trabajando;
  const cerrado = trabajando && localStorage.getItem(CLAVE_PANEL_PLEGADO) === 'si';
  const enPanel = trabajando && !cerrado;
  caja.hidden = trabajando ? cerrado : !progresoSeMuestra(progresoAbierto, trabajando, revisionEnLinea() !== null);
  caja.classList.toggle('panel-revision', enPanel);
  document.body.classList.toggle('con-panel-revision', enPanel && !caja.hidden);
  clearTimeout(siguienteGlobo);
  if (caja.hidden) {
    // Al abrirla otra vez, lo que pasó mientras tanto ya pasó: se ve entero, sin esperar su turno
    globos = globosDeInicio();
    return;
  }
  const sinEmpezar = progresoSinEmpezar();
  // Con lo urgente, su propio registro y un aviso de que eso atiende
  const urgente = atiendeUrgencia();
  const conversacion = urgente ? d.conversacionUrgencia : d.conversacion;
  // Lanzada por el Studio, su conversación vacía es la espera de su primera línea, no la sesión del director (nmw2y41f7tit)
  const vista = vistaDelProgreso({ sinEmpezar, lanzadaPorElStudio: urgente || !!d.revision?.lanzada, conversacion });
  const lista = caja.querySelector<HTMLElement>('.pasos-progreso');
  const antes = lista ? { desplazamiento: lista.scrollTop, alto: lista.scrollHeight } : null;
  const permisosAntes = caja.querySelector<HTMLElement>('.negados-vivo')?.scrollTop ?? 0;
  // Su plan, abierto, se lee sin que cada consulta lo devuelva arriba (nota de voz del titular nmvt1hcjutit, 29 de octubre)
  const planAntes = caja.querySelector<HTMLElement>('.plan-vivo ol')?.scrollTop ?? 0;
  const negados = d.negadosVivos ?? [];
  const tokens = tokensMostrados ?? d.tokensVivos ?? null;
  const permisos = negadosEnVivoHtml(negados);
  // Su plan, plegado como lo dejaste (abrirlo no se pierde con cada consulta)
  const plan = planVivoHtml(d.planVivo, caja.querySelector<HTMLDetailsElement>('.plan-vivo')?.open ?? false);
  // Los globos que nacen ahora y, si un turno se completó desde la pintada anterior, la subida de las cifras (nmvy08oe4tit)
  const ahoraChat = Date.now();
  // Dónde van los actores no se pierde al cerrar y abrir el panel: se recuerda por revisión y solo sube
  const tareas = d.planVivo?.encargos ? { hechas: d.planVivo.encargos.filter((e) => e.hecho).length, total: d.planVivo.encargos.length } : null;
  // Y mientras la bola está encima del modelo, no avanza: avanza después de que la arroja (nmw5gj40stit)
  if (conversacion?.nieve) avanceRecordado = recordarAvance(avanceRecordado, revisionEnPantalla(), avanceDeLaEscena(conversacion.nieve.contexto, 'viva', tareas), ahoraChat);
  const turnosHay = conversacion ? conversacion.turnos.length + (conversacion.omitidos ?? 0) : 0;
  if (turnosHay < turnosPintados) {
    globos = globosDeInicio();
    tokensBanda = null;
  }
  const marcador = conversacion?.turnos.length ? marcadorDe(conversacion, true, ahoraChat) : null;
  const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  cuentaBanda = marcador && !sinMovimiento ? cuentaTrasPintar(cuentaBanda, marcadorAntes, turnosHay > turnosPintados, marcador, ahoraChat) : null;
  // De a uno, cada segundo, aunque hayan llegado varios juntos (nmvyr3syltit, nmvziozqbtit): lo que falta espera su turno
  const { nuevos, ocultos, naceHace, proximoEn } = conversacion ? revelarGlobos(conversacion, globos, ahoraChat, sinMovimiento || document.hidden) : { nuevos: new Set<string>(), ocultos: new Set<string>(), naceHace: 0, proximoEn: null };
  // Quién está activo sale de los globos a la vista; sus tokens suben solo mientras lo está (nmw5mogqotit)
  ladoBanda = conversacion ? ladoDeLosGlobos(conversacion, ocultos) : null;
  objetivoTokens = marcador;
  tokensBanda = !marcador ? null : sinMovimiento ? { enviados: marcador.enviados, recibidos: marcador.recibidos, ahora: ahoraChat } : avanzarTokens(tokensBanda, marcador, ladoBanda, ahoraChat);
  if (proximoEn !== null) siguienteGlobo = setTimeout(() => pintarProgreso(trabajando), proximoEn);
  // Con el área de permisos, el panel toma toda su altura y se la reparte por mitades con los pasos
  caja.classList.toggle('con-permisos', !!permisos);
  // En el panel de una revisión, ningún botón para cerrarlo: lo cierra la cara del director (nmw18d768tit); en el de lo
  // urgente, que no tiene esa cara, su botón para plegarlo (progresoVivo.ts › botonDelProgreso, nmw46zhl5tit)
  const boton = botonDelProgreso({ enPanel, urgente });
  const cerrar = boton === 'cerrar'
    ? `<button type="button" class="enlace" data-cerrar-progreso aria-label="${esc(tx('chat.cerrar'))}">${icono('cerrar')}</button>`
    : boton === 'plegar'
    ? `<button type="button" class="enlace" data-plegar-progreso aria-label="${esc(tx('progreso.plegar'))}" title="${esc(tx('progreso.plegarTitulo'))}">${icono('plegar')}</button>`
    : '';
  caja.innerHTML = `<header><b>${tx('chat.titulo')}</b><span class="tokens-vivos" data-tokens-vivos title="${esc(tx('progreso.tokensTitulo'))}">${tokens ? `${miles(tokens)} tokens` : ''}</span>${cerrar}</header>
    ${urgente ? `<p class="aviso-urgencia" role="status">${tx('progreso.urgencia')}</p>` : ''}
    ${permisos}
    ${plan}${plan ? DIVISION_PROGRESO() : ''}
    ${vista === 'sinEmpezar'
      ? `<p class="como">${esc(sinEmpezar ?? '')}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></p>`
      : vista === 'desdeSuSesion'
      ? `<p class="como">${tx('chat.desdeSuSesion')}</p>`
      : vista === 'chat' && conversacion
      ? chatDeRevision(conversacion, turnosAbiertos, { cuenta: cuentaBanda, nuevos, ocultos, naceHace, ahora: ahoraChat, repeticion: repeticionEnCurso(), tareas, recuerdo: avanceRecordado, tokens: tokensBanda })
      : `<p class="como">${tx('chat.arrancando')}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></p>`}`;
  // La próxima subida sale de aquí; sin conversación, no hay de dónde
  marcadorAntes = marcador;
  turnosPintados = turnosHay;
  moverCuenta(caja);
  moverTokens(caja);
  pintarCronometros();
  // Sigue lo más nuevo, que ahora está arriba, salvo que estés leyendo más abajo: ahí se queda en lo que leías
  const nueva = caja.querySelector<HTMLElement>('.pasos-progreso');
  if (nueva) {
    // En el panel, los globos suben desde los personajes de abajo (la lista va invertida): lo más nuevo, abajo
    nueva.scrollTop = desplazamientoTrasPintar(antes, nueva.scrollHeight, enPanel);
    marcarPunta(nueva);
    // Lo de abajo baja en un segundo para hacerle lugar al globo que nace; si estás leyendo más abajo, nada se te mueve
    const naciendo = enPanel ? null : nueva.querySelector<HTMLElement>(':scope > .turno.nace');
    if (naciendo && sigueLaPunta(nueva.scrollTop)) {
      nueva.style.setProperty('--alto-nace', `${naciendo.offsetHeight + 10}px`);
      nueva.style.setProperty('--nace-hace', `-${Math.round(naceHace)}ms`);
    }
  }
  const zonaPermisos = caja.querySelector<HTMLElement>('.negados-vivo');
  if (zonaPermisos) zonaPermisos.scrollTop = permisosAntes;
  const listaPlan = caja.querySelector<HTMLElement>('.plan-vivo ol');
  if (listaPlan) listaPlan.scrollTop = planAntes;
  // La línea entre su plan y lo que va haciendo, donde la dejaste (lo recuerda este navegador)
  const alto = altoGuardado(localStorage.getItem(CLAVE_DIVISION));
  if (alto === null) caja.style.removeProperty('--alto-plan-vivo');
  else caja.style.setProperty('--alto-plan-vivo', `${alto}px`);
  ubicarProgreso(caja);
}

/** El botón que lleva de vuelta a donde va la conversación: solo si te fuiste a leer algo más viejo (nmvziozqbtit). */
function marcarPunta(lista: HTMLElement) {
  const boton = lista.querySelector<HTMLElement>('[data-ir-a-la-punta]');
  if (boton) boton.hidden = sigueLaPunta(lista.scrollTop);
}
document.addEventListener('scroll', (e) => {
  const lista = e.target;
  if (lista instanceof HTMLElement && lista.matches('.progreso-director .chat-revision')) marcarPunta(lista);
}, { capture: true, passive: true });

// Lo que abriste de la conversación sigue abierto al repintarla con cada consulta. Los globos son un acordeón: el navegador
// cierra el que estaba abierto (su atributo `name`), y este toggle lo saca de aquí; lo de un ayudante se abre aparte
const turnosAbiertos = new Set<string>();
/** Lo que mostró la banda en la pintada anterior: desde ahí suben sus cifras cuando un turno se completa. */
let marcadorAntes: MarcadorDeBanda | null = null;
/** Cuántos turnos había en la pintada anterior, los globos ya vistos y la subida de las cifras en curso. */
let turnosPintados = 0;
let globos = globosDeInicio();
let siguienteGlobo: ReturnType<typeof setTimeout> | undefined;
let cuentaBanda: CuentaDeBanda | null = null;
let cuadroCuenta = 0;
/** Los tokens que muestra cada lado, el lado activo y lo real a lo que suben: solo suben los del lado activo. */
let tokensBanda: TokensDeBanda | null = null;
let ladoBanda: 'computador' | 'modelo' | null = null;
let objetivoTokens: MarcadorDeBanda | null = null;
let cuadroTokens = 0;
/** Los tokens del lado activo suben cuadro a cuadro hacia lo real; los del otro se quedan quietos. */
function moverTokens(caja: HTMLElement) {
  cancelAnimationFrame(cuadroTokens);
  const paso = () => {
    if (!tokensBanda || !objetivoTokens || tokensAlDia(tokensBanda, objetivoTokens, ladoBanda)) return;
    tokensBanda = avanzarTokens(tokensBanda, objetivoTokens, ladoBanda, Date.now());
    pintarTokens(caja, tokensBanda);
    cuadroTokens = requestAnimationFrame(paso);
  };
  cuadroTokens = requestAnimationFrame(paso);
}
/** La subida, cuadro a cuadro, sobre lo pintado: una sola a la vez, también si se repinta en medio. */
function moverCuenta(caja: HTMLElement) {
  cancelAnimationFrame(cuadroCuenta);
  if (!cuentaBanda) return;
  const paso = () => {
    if (!cuentaBanda) return;
    if (pintarCuenta(caja, cuentaBanda, Date.now(), ['director', 'modelo'])) cuadroCuenta = requestAnimationFrame(paso);
    else cuentaBanda = null;
  };
  cuadroCuenta = requestAnimationFrame(paso);
}
// La repetición de la avalancha (progresoVivo.ts › repeticionDeAvalancha; nmw3r7c5atit): «↻ Repetir la avalancha» la vuelve
// a mostrar con los tiempos guardados de la revisión, cuadro a cuadro sobre el mismo dibujo (así la bola rueda y crece en
// vez de saltar). Si el panel se repinta en medio, sigue donde iba (pintarProgreso le pasa repeticionEnCurso)
let repeticionAvalancha: { cuadros: CuadroDeAvalancha[]; cache: number; llamadas: number; desde: number; final: string } | null = null;
let siguienteCuadro: ReturnType<typeof setTimeout> | undefined;
function repeticionEnCurso(): RepeticionEnCurso {
  const r = repeticionAvalancha;
  const c = r && cuadroDeRepeticion(r.cuadros, Date.now() - r.desde);
  return c ? { cuadro: c.cuadro, hace: c.hace } : null;
}
/** Pone en el dibujo que está a la vista lo de otro: su escena, su tamaño y su pino, sin cambiar la bola ni el modelo. */
function ponerCuadro(dibujo: Element, html: string, repite: boolean) {
  const nuevo = document.createRange().createContextualFragment(html).firstElementChild;
  if (!nuevo) return;
  dibujo.className = `${nuevo.className}${repite ? ' repite' : ''}`;
  // El ciclo de la escena sigue donde iba: su fase no cambia de un cuadro al siguiente (si cambiara, saltaría)
  const estilo = (dibujo as HTMLElement).style;
  const fase = estilo.getPropertyValue('--fase'), faseFondo = estilo.getPropertyValue('--fase-fondo'), avance = estilo.getPropertyValue('--avance');
  for (const a of ['style', 'aria-label', 'title']) dibujo.setAttribute(a, nuevo.getAttribute(a) ?? '');
  if (fase) estilo.setProperty('--fase', fase);
  if (faseFondo) estilo.setProperty('--fase-fondo', faseFondo);
  // Con la bola encima, el modelo no avanza: el cuadro siguiente lo mueve después de que la arroja (nmw5gj40stit)
  if (repite && avance && bolaEncima(Date.now())) estilo.setProperty('--avance', avance);
  for (const x of dibujo.querySelectorAll(':scope > .avalancha-pino, :scope > .avalancha-trozos')) x.remove();
  const grupo = dibujo.querySelector(':scope > .avalancha-grupo');
  for (const x of [...nuevo.querySelectorAll(':scope > .avalancha-pino, :scope > .avalancha-trozos')]) dibujo.insertBefore(x, grupo);
}
function moverRepeticion() {
  clearTimeout(siguienteCuadro);
  const r = repeticionAvalancha;
  const boton = document.querySelector<HTMLElement>('[data-repetir-avalancha][data-repitiendo]');
  const dibujo = boton?.previousElementSibling;
  const c = r && cuadroDeRepeticion(r.cuadros, Date.now() - r.desde);
  if (!r || !c || !dibujo?.classList.contains('avalancha')) {
    // Terminó: queda quieta otra vez, con el tamaño al que llegó la revisión
    if (r && dibujo?.classList.contains('avalancha')) ponerCuadro(dibujo, r.final, false);
    boton?.removeAttribute('data-repitiendo');
    repeticionAvalancha = null;
    return;
  }
  ponerCuadro(dibujo, cuadroDeAvalanchaHtml(c.cuadro, r, c.hace), true);
  siguienteCuadro = setTimeout(moverRepeticion, c.queda);
}
document.addEventListener('click', (e) => {
  const boton = (e.target as Element).closest?.<HTMLElement>('[data-repetir-avalancha]');
  const dibujo = boton?.previousElementSibling;
  if (!boton || !dibujo?.classList.contains('avalancha')) return;
  const datos = JSON.parse(boton.dataset.repetirAvalancha ?? '{}') as { cuadros?: CuadroDeAvalancha[]; cache?: number; llamadas?: number };
  if (!datos.cuadros?.length) return;
  for (const otro of document.querySelectorAll('[data-repitiendo]')) otro.removeAttribute('data-repitiendo');
  boton.setAttribute('data-repitiendo', '');
  repeticionAvalancha = { cuadros: datos.cuadros, cache: datos.cache ?? 0, llamadas: datos.llamadas ?? 0, desde: Date.now(), final: repeticionAvalancha?.final ?? dibujo.outerHTML };
  moverRepeticion();
});
document.addEventListener('toggle', (e) => {
  const turno = (e.target as HTMLElement | null)?.dataset?.turnoAbrir;
  if (!turno) return;
  if ((e.target as HTMLDetailsElement).open) turnosAbiertos.add(turno);
  else turnosAbiertos.delete(turno);
}, true);
// El cronómetro de quién tiene el turno y el reloj de su lado en la banda, segundo a segundo, sin esperar la consulta siguiente
const pintarCronometros = () => {
  for (const c of document.querySelectorAll<HTMLElement>('[data-crono]')) c.textContent = relojDesde(Date.now() - Date.parse(c.dataset.crono!));
  for (const c of document.querySelectorAll<HTMLElement>('[data-reloj-lado]')) {
    const seg = Number(c.dataset.relojLado) + Math.floor((Date.now() - Number(c.dataset.relojDesde)) / 1000);
    c.textContent = relojDesde(seg * 1000);
  }
};
setInterval(pintarCronometros, 1000);
/** La ✕ de la línea de versión nueva, o su casilla en «Modelo y consumo»: guarda, repinta y dice si pudo. */
async function guardarAvisoVersion(cuerpo: { cerrar: true } | { si: boolean }): Promise<boolean> {
  const r = await fetch('/__estudio/director/aviso-version', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
  if (r instanceof Error) return avisar(tx('guardado.noGuardar')), false;
  const x = await r.json().catch(() => ({}));
  if (!r.ok) return avisar(x.error ?? tx('guardado.noGuardarCorto')), false;
  d.avisoVersion = x.avisoVersion ?? null;
  d.avisoVersionApagado = x.avisoVersionApagado === true;
  pintar();
  return true;
}
// La conversación de una revisión pasada, de su registro: su historial (la abre `?mirar=` en la dirección, abajo)
async function abrirConversacion(registro: string) {
  const r = await fetch(`/__estudio/director/conversacion?registro=${encodeURIComponent(registro)}`).catch(() => null);
  if (!r?.ok) return avisar(r ? (await r.json().catch(() => ({}))).error ?? tx('chat.sinRegistro') : tx('chat.sinRegistro'));
  const dlg = document.createElement('dialog');
  dlg.className = 'dialogo-director chat-historial';
  dlg.innerHTML = `<form method="dialog"><header class="cabeza-dialogo"><span class="etiqueta">${tx('chat.historial')}</span></header>${chatDeRevision(await r.json() as ConversacionDeRevision, turnosAbiertos, { vivo: false })}<div class="botones"><button type="submit" class="primario">${tx('chat.cerrar')}</button></div></form>`;
  document.body.append(dlg);
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
}
document.addEventListener('click', (e) => {
  if ((e.target as Element).closest?.('[data-cerrar-version]')) void guardarAvisoVersion({ cerrar: true });
  // La lupa de la barra abre la línea en grande (lineaGrande.ts); «La conversación» se abre en su mismo lado
  if ((e.target as Element).closest?.('#lupa-linea')) abrirLineaGrande({
    linea: () => ({ ramas: ramasEnLinea(), ...opcionesDeLinea() }),
    nombreModelo,
    nombreEsfuerzo,
    conversacion: async (registro) => {
      const r = await fetch(`/__estudio/director/conversacion?registro=${encodeURIComponent(registro)}`).catch(() => null);
      return r?.ok ? chatDeRevision(await r.json() as ConversacionDeRevision, turnosAbiertos, { vivo: false }) : null;
    },
  });
});

// La línea entre su plan y lo que va haciendo se arrastra con el ratón, y solo con él (progresoVivo.ts › CLAVE_DIVISION)
document.addEventListener('pointerdown', (e) => {
  const linea = (e.target as Element | null)?.closest?.<HTMLElement>('[data-division-progreso]');
  if (!linea || e.pointerType !== 'mouse' || e.button !== 0) return;
  const caja = linea.closest<HTMLElement>('.progreso-director');
  const lista = caja?.querySelector<HTMLElement>('.plan-vivo ol');
  if (!caja || !lista) return;
  e.preventDefault();
  const desde = { y: e.clientY, alto: lista.getBoundingClientRect().height };
  const panel = parseFloat(getComputedStyle(caja).maxHeight) || caja.clientHeight;
  // Lo que no es el plan ni lo que va haciendo (la cabecera, el resumen del plan, la línea) también ocupa el panel
  const fijo = caja.clientHeight - lista.getBoundingClientRect().height - (caja.querySelector<HTMLElement>('.pasos-progreso')?.clientHeight ?? 0);
  let alto = desde.alto;
  // En el documento, no en la línea: el panel se repinta con cada consulta y la línea de ahora puede ser otra
  caja.classList.add('dividiendo');
  const mover = (m: PointerEvent) => {
    alto = altoDelPlan(desde.alto + m.clientY - desde.y, panel - fijo);
    caja.style.setProperty('--alto-plan-vivo', `${alto}px`);
  };
  const soltar = () => {
    document.removeEventListener('pointermove', mover);
    document.removeEventListener('pointerup', soltar);
    document.removeEventListener('pointercancel', soltar);
    caja.classList.remove('dividiendo');
    localStorage.setItem(CLAVE_DIVISION, String(alto));
  };
  document.addEventListener('pointermove', mover);
  document.addEventListener('pointerup', soltar);
  document.addEventListener('pointercancel', soltar);
});
/**
 * El director de la línea viva que se ve ahora (el de la franja del enfoque antes que el de la barra), o null: en el
 * teléfono la barra es un menú y no cuenta.
 */
function directorEnLinea(): HTMLElement | null {
  if (innerWidth < 760) return null;
  for (const id of ['linea-enfoque', 'linea-viva']) {
    const n = document.querySelector<HTMLElement>(`#${id} .lv-director .lv-dir-nucleo`);
    if (n?.getClientRects().length && n.getBoundingClientRect().width) return n;
  }
  return null;
}
/**
 * Lo que va haciendo se desprende del director de la línea (nota de voz del titular nmvtnwub1tit): junto a él, a su
 * derecha en la barra y encima en la franja del enfoque, y crece desde él (estilos.css › .desde-director). Sin director
 * a la vista, en su lugar de siempre.
 */
function ubicarProgreso(caja: HTMLElement) {
  const n = directorEnLinea();
  // El panel de la revisión tiene su lugar fijo, entre la barra y el contenido: no se desprende del director
  if (!n || caja.hidden || caja.classList.contains('panel-revision')) {
    caja.classList.remove('desde-director');
    for (const p of ['left', 'top', 'right', 'bottom', 'transform-origin']) caja.style.removeProperty(p);
    return;
  }
  caja.classList.add('desde-director');
  const r = rectaEnPagina(n.getBoundingClientRect());
  const ancho = caja.offsetWidth;
  const alto = caja.offsetHeight;
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const enFranja = !!n.closest('#linea-enfoque');
  const left = enFranja ? Math.min(Math.max(12, cx - 40), anchoDeVentana() - ancho - 12) : r.right + 16;
  const top = enFranja ? Math.max(12, r.top - alto - 16) : Math.min(Math.max(12, cy - 40), altoDeVentana() - alto - 12);
  caja.style.left = `${Math.round(left)}px`;
  caja.style.top = `${Math.round(top)}px`;
  caja.style.right = 'auto';
  caja.style.bottom = 'auto';
  caja.style.transformOrigin = `${Math.round(cx - left)}px ${Math.round(cy - top)}px`;
}
/**
 * El plan de la revisión en dos tiempos (pd_dos_tiempos), arriba de los pasos y plegado, como elegiste el 26 de octubre
 * de 2026: mientras el primer tiempo planea, una línea que lo dice; después, cuántos encargos van hechos y, al abrirlo,
 * cada uno, marcado a medida que el director lo termina. Sin primer tiempo (una sola nota o entrega), nada.
 */
function planVivoHtml(p: Datos['planVivo'], abierto: boolean): string {
  if (!p) return '';
  if (p.planeando || !p.encargos) return `<p class="como plan-vivo">${tx('progreso.planea')}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></p>`;
  const hechos = p.encargos.filter((e) => e.hecho).length;
  return `<details class="plan-vivo"${abierto ? ' open' : ''}><summary>${tx('progreso.suPlan', { hechos, n: p.encargos.length })}</summary><ol>${p.encargos.map((e) => `<li${e.hecho ? ' class="hecho"' : ''}>${e.hecho ? '✓ ' : ''}${esc(e.que)}</li>`).join('')}</ol></details>`;
}

/**
 * Lo negado en vivo, con su «Autorizo» ahí mismo (nota de voz del titular nmvowqdnztit, 26 de octubre de 2026: «Autorizar
 * con una casilla» lo llevaba a un panel sin esa casilla, y luego había que marcarla y guardar): cada intento, con el
 * permiso general que le faltó y un clic que lo autoriza y lo guarda para este proyecto. Solo lo pendiente (nota de voz del
 * titular, 26 de octubre de 2026): lo ya autorizado, lo que no hace falta autorizar (cada orden de una cadena ya la tiene)
 * y lo que nunca hace no aparecen, y sin nada pendiente el área entera desaparece (`pendientesEnVivo`). El panel se lee
 * de nuevo cuando aparece un negado nuevo, no en cada consulta: lee los registros.
 */
let negadosVistos = 0;
let negadosCambiaron = 0;
function negadosEnVivoHtml(negados: string[]) {
  if (!negados.length) return '';
  if (negados.length !== negadosVistos) [negadosVistos, negadosCambiaron] = [negados.length, Date.now()];
  const leido = !!panelPermisos && !panelPermisos.error && permisosLeidos > negadosCambiaron;
  if (!leido && !leyendoPermisos && Date.now() - permisosLeidos > 5_000) void leerPermisos();
  // Solo lo que falta autorizar (nota de voz del titular, 26 de octubre de 2026): lo ya autorizado, las cadenas con todo
  // permitido y lo que nunca hace no se listan; sin nada pendiente, el área entera desaparece. Mientras se busca qué le
  // faltó, se sigue mostrando.
  const ofrecidos = pendientesEnVivo(ofrecidoEnVivo(negados, panelPermisos?.pendientes ?? [], d.activo), leido);
  if (!ofrecidos.length) return '';
  const fila = ({ intento, permisos }: { intento: string; permisos: PermisoNegado[] }) => {
    const que = esc(intento);
    if (!leido) return `<li>${que}<p class="como">${tx('negados.buscando')}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></p></li>`;
    return `<li>${que}${permisos.map((n) => `<p class="como">${tx('negados.leFalto', { que: esc(n.que) })} <button type="button" class="boton-suave" data-autorizar-vivo="${esc(clavePermiso(n))}" title="${esc(n.riesgo)}">${tx('negados.autorizoAqui')}</button></p>`).join('')}</li>`;
  };
  return `<div class="negados-vivo"><p class="como">${NEGADOS_VIVO()}</p><ul>${ofrecidos.map(fila).join('')}</ul><button type="button" class="enlace" data-ir-permisos>${tx('negados.irPermisos')}</button></div>`;
}
/**
 * Los intentos negados que la cifra del atajo y su nombre cuentan: los mismos que lista el área de permisos, solo lo que
 * falta autorizar (mientras se busca qué le faltó, todos), para que la cifra no diga «2» con el área vacía.
 */
function porAutorizarEnVivo(negados: string[]): string[] {
  if (negados.length !== negadosVistos) [negadosVistos, negadosCambiaron] = [negados.length, Date.now()];
  const leido = !!panelPermisos && !panelPermisos.error && permisosLeidos > negadosCambiaron;
  if (!leido && !leyendoPermisos && Date.now() - permisosLeidos > 5_000) void leerPermisos();
  return pendientesEnVivo(ofrecidoEnVivo(negados, panelPermisos?.pendientes ?? [], d.activo), leido).map((o) => o.intento);
}
// «Autorizo en este proyecto», junto a lo negado: un clic lo autoriza y lo guarda, sin pasar por el panel
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-autorizar-vivo]');
  if (!b) return;
  const n = panelPermisos?.pendientes.find((x) => x.regla && !x.nunca && clavePermiso(x) === b.dataset.autorizarVivo);
  if (!n) return;
  b.disabled = true;
  void cambiarPermisos({ autorizar: [{ regla: n.regla!, proyecto: n.proyecto, alcance: 'proyecto' }] }).then(() => pintarSegundoPlano());
});
// El panel de permisos, junto a lo negado: para darlo a todos los proyectos o ver lo de revisiones anteriores
document.addEventListener('click', (e) => {
  if (!(e.target as HTMLElement).closest('[data-ir-permisos]')) return;
  progresoAbierto = false;
  sessionStorage.removeItem(CLAVE_PROGRESO);
  panelPermisos = null;
  void ir({ vista: 'modelo', ancla: 'm-permisos', etiqueta: '' });
});
// Un Markdown que nombra el director o que enlaza un documento (enlacesArchivos.ts): se lee en la columna de documentos,
// sin que el enlace cambie la pestaña del Studio (nmw7ur9h9tit); si se nombró dentro de un diálogo, ese diálogo se cierra
// para dejarlo a la vista
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-abrir-doc]');
  if (!b?.dataset.abrirDoc) return;
  e.preventDefault();
  b.closest('dialog')?.close();
  void abrirDocumento(b.dataset.abrirDoc);
});
let progresoAbiertoEn = 0;
function abrirProgreso(si: boolean) {
  // Sigue abierta: un clic de más no vuelve a traer los datos, que pesan (progresoVivo.ts › abiertaTrasClic)
  if (si && progresoAbierto) return;
  progresoAbierto = si;
  if (si) progresoAbiertoEn = Date.now();
  if (progresoAbierto) sessionStorage.setItem(CLAVE_PROGRESO, revisionEnPantalla());
  else sessionStorage.removeItem(CLAVE_PROGRESO);
  // Se muestra aquí mismo, con lo que ya se sabe; lo nuevo llega después, sin que ella lo espere
  pintarSegundoPlano();
  // Abierto, se pregunta más seguido para que avance en vivo
  if (progresoAbierto && d) void cargar().catch(() => undefined);
}
// El atajo, o el director de la línea viva (lineaViva.ts › data-progreso), lo abren y lo cierran
document.addEventListener('click', (e) => {
  const t = e.target as Element;
  if (t.closest('[data-cerrar-progreso]')) abrirProgreso(false);
  // El panel de lo urgente se pliega con su botón; lo abre otra vez su atajo
  if (t.closest('[data-plegar-progreso]') && panelDeRevision) return alternarPanel();
  // Mientras corre una revisión, la cara del director que trabaja (o, donde la línea no se ve, el atajo) abre y cierra el
  // panel: ella misma es su interruptor, sin barra ni botón en medio (notas de voz del titular nmw16j8a4tit y nmw18d768tit)
  if (t.closest('[data-progreso]') && panelDeRevision) return alternarPanel();
  if (t.closest('[data-ir-a-la-punta]')) t.closest<HTMLElement>('.chat-revision')?.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  else if (t.closest('[data-progreso]')) abrirProgreso(abiertaTrasClic(progresoAbierto, progresoAbiertoEn, Date.now()));
  else if (cierraConClicFuera(progresoVisible(), dondeCayo(t))) abrirProgreso(false);
});
// Un clic fuera la cierra (progresoVivo.ts › cierraConClicFuera): lo que se aprieta dentro y se suelta fuera no cuenta
let apretoEnProgreso = false;
document.addEventListener('pointerdown', (e) => { apretoEnProgreso = !!(e.target as Element).closest?.('#progreso-director'); }, true);
const progresoVisible = () => progresoAbierto && document.getElementById('progreso-director')?.hidden === false;
const dondeCayo = (t: Element): ClicEnLaPagina => ({
  dentro: !!t.closest('#progreso-director'),
  empezoDentro: apretoEnProgreso,
  enAtajo: !!t.closest('[data-progreso]'),
  enAutorizar: !!t.closest('[data-autorizar-vivo]'),
  enDialogo: !!t.closest('dialog[open]'),
  sigueEnLaPagina: t.isConnected,
});
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && (e.target as Element).closest?.('.lv-director[data-progreso]')) {
    e.preventDefault();
    if (panelDeRevision) alternarPanel();
    else abrirProgreso(abiertaTrasClic(progresoAbierto, progresoAbiertoEn, Date.now()));
  }
});
/** Abre o cierra el panel de la revisión en marcha; el navegador lo recuerda como lo dejaste. */
function alternarPanel() {
  localStorage.setItem(CLAVE_PANEL_PLEGADO, localStorage.getItem(CLAVE_PANEL_PLEGADO) === 'si' ? 'no' : 'si');
  pintarSegundoPlano();
}

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
    // Solo que ya está, con su atajo opcional, y breve: lo que se entendió se lee en el Buzón (nmvvi8xi2tit)
    avisar(tx('aviso.audioTraducido'), true, undefined, nota ? { etiqueta: tx(donde === 'preguntas' ? 'aviso.verPreguntas' : 'aviso.verBuzon'), hacer: () => irA(donde) } : undefined, false, AVISO_AUDIO_MS);
  }
  if (sondeo) clearTimeout(sondeo);
  const sinTexto = [...d.estado.notas.map((n) => n.audio), ...Object.values(d.estado.entregas).map((e) => e.audio)].some((a) => a && d.transcripciones[a] === undefined && !d.sinTranscribir?.includes(a));
  // Con una revisión pedida y sin terminar, también se pregunta (más espaciado): así se ve cuando empieza y cuando acaba
  // Y cerrada, mientras su recarga espera a que el director termine lo último: se ve de cerca cuándo sale
  const esperandoRevision = (!!d.revision && !d.revision.hecha) || !!esperaTrasRevision;
  // Un paso que se está aclarando se espera de cerca: es una ida y vuelta corta
  const esperandoAclaracion = !!d.aclaracion && !d.aclaracion.hecha && !d.aclaracion.error;
  // Lo urgente también se espera de cerca: el resultado se avisa en cuanto llega
  const esperandoUrgencia = urgenciaEnCurso(d.urgencia);
  // Con lo que va haciendo el director a la vista, cada pocos segundos (leer su registro no gasta nada)
  const cada = d.transcribiendo?.length || sinTexto || (esperandoRevision && progresoAbierto) || esperandoAclaracion || esperandoUrgencia || esperaTrasRevision ? 3000 : esperandoRevision ? 10_000 : 0;
  sondeo = cada ? setTimeout(() => (escribiendoEnVista() ? vigilarTranscripciones([]) : void cargar().catch(() => undefined)), cada) : null;
}

/**
 * Un aviso arriba a la derecha, angosto y alto, con el estilo del de misión completada (avisoMision.ts; nota de voz del
 * titular nmvvdc2f4tit, 30 de octubre de 2026: todos los avisos, en un solo estilo y ahí): lo bueno se va solo, pronto;
 * un error se queda hasta cerrarlo (o un rato largo).
 */
let avisoHasta: ReturnType<typeof setTimeout> | null = null;
/** `reintentar`: si se puede volver a intentar lo que falló (con lo que se escribió o grabó guardado), el aviso lo ofrece. */
/** `ir`: un atajo dentro del aviso (por ejemplo, al Buzón donde quedó lo que se guardó). */
/** `dura`: cuánto se queda lo bueno, si no es lo de siempre (el aviso del audio transcrito, AVISO_AUDIO_MS). */
/** `yaSeVe`: lo mismo ya se lee dentro del diálogo, en su lugar: el aviso no lo repite en la línea de errores del diálogo. */
function avisar(texto: string, bien = false, reintentar?: () => void, ir?: { etiqueta: string; hacer: () => void }, fijo = false, dura?: number, yaSeVe = false) {
  const e = $('error');
  e.hidden = !texto;
  e.className = `aviso-flotante ${bien ? 'bien' : 'mal'}`;
  e.setAttribute('role', bien ? 'status' : 'alert');
  e.innerHTML = `<span>${esc(texto)}</span>${ir ? `<button type="button" class="reintentar ir-aviso" data-ir-aviso>${esc(ir.etiqueta)}</button>` : ''}${reintentar ? `<button type="button" class="reintentar" data-reintentar>${tx('aviso.reintentar')}</button>` : ''}<button type="button" data-cerrar-aviso aria-label="${esc(tx('mision.cerrarAviso'))}">✕</button>`;
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
  if (!bien && !yaSeVe) {
    const enDialogo = document.querySelector<HTMLElement>('dialog[open] .error-explorador');
    if (enDialogo) enDialogo.textContent = texto;
  }
  if (avisoHasta) clearTimeout(avisoHasta);
  avisoHasta = null;
  // lo bueno se queda poco, como el aviso de misión completada (con un atajo, un poco más: nota de voz nmvvdc2f4tit); un
  // error, hasta leerlo; lo fijo, una guía que se sigue fuera del Studio, hasta que se use su botón o se cierre
  if (!fijo) avisoHasta = setTimeout(() => (e.hidden = true), bien ? dura ?? (ir ? AVISO_CON_ATAJO_MS : AVISO_MS) : reintentar ? 60000 : 15000);
  alFrente(e);
}

// La grabadora canceló por falta de sonido: el por qué, también como aviso, además de la leyenda que deja en su lugar
// (nota de voz del titular nmvy4nxxdtit, 1 de noviembre de 2026)
window.addEventListener(GRABACION_MUDA, (e) => avisar((e as CustomEvent<string>).detail, false, undefined, undefined, false, undefined, true));

/**
 * Con un diálogo abierto (como «¿Dónde quedamos?»), el aviso sube a la capa de arriba, como un popover: si no, queda
 * detrás de su velo y no se ve (la voz que no encontraba con qué leer lo decía ahí, y nadie lo veía). Sin diálogo, vuelve
 * a ser un aviso de la página.
 */
function alFrente(e: HTMLElement) {
  if (typeof e.showPopover !== 'function') return;
  if (e.hasAttribute('popover')) e.removeAttribute('popover');
  if (e.hidden || !document.querySelector('dialog[open]')) return;
  e.popover = 'manual';
  e.showPopover();
}

/**
 * El servidor del Studio (npm run estudio) es el que guarda todo: si no responde, un pedido falla con un error de red.
 * Se dice qué pasa y qué hacer; lo que se intentó guardar se puede reintentar, y el Studio se reconecta solo.
 */
const SIN_SERVIDOR = () => tx('servidor.sinRespuesta', { carpeta: laCarpetaDelStudio() });
const esDeRed = (e: unknown) => e instanceof TypeError || ['TimeoutError', 'AbortError'].includes((e as Error)?.name);
let sinServidor = false;
/** Desde cuándo no responde, para decir cuánto lleva así y, con el director trabajando, esperar antes de avisar. */
let sinServidorDesde = 0;
let relojSinServidor: ReturnType<typeof setTimeout> | null = null;
/** Con el director trabajando, el servidor suele reiniciarse con un cambio suyo y vuelve solo: se avisa si no vuelve en este tiempo. */
const ESPERA_REINICIO_DIRECTOR = 20_000;

/**
 * El aviso fijo de que el servidor del Studio se apagó (nota de voz del titular nmw6r2nuwtit: «el Studio se murió y yo no
 * sabía qué hacer; se quedaba preparando»): arriba de todo, en el idioma de la interfaz, dice que hay que volver a
 * encenderlo y cómo, y no se va hasta que el servidor vuelve. Con el director trabajando, espera
 * ESPERA_REINICIO_DIRECTOR: casi siempre es él reiniciándolo. Pura: el HTML del aviso.
 */
const avisoSinServidorHtml =(o: { orden: string; titulo: string; texto: string; espera: string }) =>
  `<div class="aviso-sin-servidor-caja"><b>${esc(o.titulo)}</b><p>${esc(o.texto)}</p><p><code>${esc(o.orden)}</code></p><p class="como">${esc(o.espera)}</p></div>`;
function pintarAvisoSinServidor() {
  let el = document.getElementById('aviso-sin-servidor');
  const director = !!trabajandoGuardado();
  const ver = sinServidor && (!director || Date.now() - sinServidorDesde >= ESPERA_REINICIO_DIRECTOR);
  if (!ver) { el?.remove(); return; }
  if (!el) {
    el = document.createElement('div');
    el.id = 'aviso-sin-servidor';
    el.className = 'aviso-sin-servidor';
    el.setAttribute('role', 'alert');
    // En la capa de arriba (popover), sobre cualquier ventana abierta
    el.setAttribute('popover', 'manual');
    document.body.append(el);
  }
  el.innerHTML = avisoSinServidorHtml({ orden: 'npm run encender', titulo: tx('servidor.caidoTitulo'), texto: tx('servidor.caidoTexto', { carpeta: laCarpetaDelStudio() }), espera: tx('servidor.caidoEspera') });
  try { if (typeof el.showPopover === 'function' && !el.matches(':popover-open')) el.showPopover(); } catch { /* se queda en la página */ }
}

function marcarSinServidor(si: boolean) {
  if (sinServidor === si) return;
  sinServidor = si;
  sinServidorDesde = si ? Date.now() : 0;
  if (relojSinServidor) clearTimeout(relojSinServidor);
  relojSinServidor = si ? setTimeout(pintarAvisoSinServidor, ESPERA_REINICIO_DIRECTOR + 100) : null;
  pintarAvisoSinServidor();
  document.body.classList.toggle('sin-servidor', si);
  if (si) {
    const el = $('sincronizacion');
    // Con el director trabajando, casi siempre es él reiniciando el servidor con un cambio suyo: vuelve solo
    const director = !!trabajandoGuardado();
    el.className = `insignia sync ${director ? 'subiendo' : 'choque'}`;
    el.textContent = tx(director ? 'servidor.reinicia' : 'servidor.apagado');
    el.title = director ? tx('servidor.reiniciaTitulo') : SIN_SERVIDOR();
  } else if (d) {
    pintarSincronizacion();
    avisar(tx('servidor.volvio'), true);
  }
}

/**
 * Mientras el director revisa, se navega, se lee, se le sigue hablando (comentarios, audios y preguntas) y se avanza en
 * las misiones y las decisiones (marcar pasos, elegir, encargar, entregar, aprobar y responder propuestas), como lo pidió
 * el titular el 21 de octubre de 2026: lo que llega después de empezar no entra en esa revisión, espera la siguiente
 * (bandeja.ts › corteDeRevision). Solo espera a que termine lo que cambia la ruta o lo que él ya está leyendo (cruzar una
 * puerta, la meta, el proyecto y su equipo, corregir una nota de antes) y lo que lo llama a él («No lo entiendo»).
 * Dice por qué y devuelve true si hay que esperar.
 */
const revisando = () => !!d && 'plan' in d && estadoRevision().estado === 'en_curso';
function esperaAlDirector(): boolean {
  if (!revisando()) return false;
  avisar(tx('aviso.directorRevisando'), true);
  return true;
}

/** Desde cuándo lo que se deja ya no entra en la revisión en marcha (src/director/proyectos.ts › corteDeRevision). */
function corteRevision(): string | null {
  const r = d?.revision;
  if (!r || r.hecha || r.error) return null;
  return [r.lanzada, r.enCurso].filter((x): x is string => !!x).sort()[0] ?? null;
}
/**
 * La revisión en marcha, en la línea viva: el director aparece donde se pidió (o donde empezó, su corte), junta en un
 * minuto y trabaja (pd_linea_ciclo; notas de voz del titular nmvtki8k2tit y nmvtnwub1tit), con lo que se le negó en rojo.
 */
function revisionEnLinea(): { aqui: string; negados: number; vez: string } | null {
  const r = d?.revision;
  if (!r || r.hecha || r.error) return null;
  const negados = d.negadosVivos?.length ? porAutorizarEnVivo(d.negadosVivos).length : 0;
  return { aqui: corteRevision() ?? r.pedida, negados, vez: r.pedida };
}
/**
 * Tu lote de misiones, en el futuro de la línea (nota de voz del titular nmvtnd08xtit): las que entregaste desde la
 * última revisión, por cuándo, y después las abiertas, en el orden del director.
 */
function loteEnLinea(): MisionEnLinea[] {
  const yo = d.identidad.rol ?? TITULAR;
  const desde = d.plan.revisado ?? '';
  const entregadas = d.plan.misiones
    .filter((m) => m.para === yo && (d.estado.entregas[m.id]?.cuando ?? '') > desde)
    .map((m) => ({ id: m.id, titulo: m.titulo, entregada: d.estado.entregas[m.id].cuando }))
    .sort((a, b) => a.entregada.localeCompare(b.entregada));
  const ya = new Set(entregadas.map((m) => m.id));
  return [...entregadas, ...abiertasDe(yo).filter((m) => !ya.has(m.id)).map((m) => ({ id: m.id, titulo: m.titulo }))];
}
/**
 * La línea viva: una rama por lo que el director aún no recibe (pd_linea_viva). Una nota de voz lleva su transcripción, para
 * el globo de su cabecita (nmvtt33jctit). Lo mismo se dibuja en la barra, al pie del enfoque y en la línea en grande.
 */
function ramasEnLinea() {
  return ramasDeAhora(
    d.estado.notas.map((n) => (n.audio && !n.texto && d.transcripciones[n.audio] ? { ...n, texto: d.transcripciones[n.audio] } : n)),
    (id) => !!d.plan.respuestas?.[id],
    Object.entries(d.estado.entregas).filter(([id, e]) => (d.plan.revisiones[id]?.cuando ?? '') < e.cuando)
      .map(([id, e]) => ({ id, cuando: e.cuando, titulo: d.plan.misiones.find((m) => m.id === id)?.titulo })),
    Object.entries(d.estado.propuestas).map(([id, r]) => ({ id, cuando: r.fecha, titulo: d.plan.propuestas.find((p) => p.id === id)?.titulo })),
    d.plan.revisado,
  );
}
const opcionesDeLinea = () => ({ historia: d.lineaHistoria ?? [], porVenir: fasesPorVenir(), revisado: d.plan.revisado, revision: revisionEnLinea(), lote: loteEnLinea() });
/** Las fases que aún no llegan (y «Después del lanzamiento»): lo que espera en ellas se ve tenue en la línea. */
function fasesPorVenir(): string[] {
  const ahora = numeroFase(faseActual(d.plan, d.estado));
  return [...d.plan.fases.filter((f) => numeroFase(f) > ahora).map((f) => f.id), 'despues'];
}
/** ¿La nota llegó después de empezar la revisión en marcha? Entonces el director no la está leyendo: se corrige o se quita. */
function notaTrasCorte(n: Nota | undefined): boolean {
  const c = corteRevision();
  return !!n && !!c && n.cuando > c;
}
/** Lo que se le dice a quien escribe mientras el director revisa. */
const avisoRevisando = () => (revisando() ? tx('aviso.revisando') : '');

/**
 * ¿Esta acción puede hacerse mientras el director revisa? Leer, hablarle y avanzar en las misiones y las decisiones sí
 * (espera la revisión siguiente); lo que cambia la ruta o lo que él ya está leyendo, no.
 */
function libreMientrasRevisa(cuerpo: Record<string, unknown>): boolean {
  if (['paso', 'leido', 'comentar', 'empezar', 'entregar', 'responder'].includes(String(cuerpo.tipo))) return true;
  // Retirar una entrega que él no está leyendo (llegó después de empezar)
  if (cuerpo.tipo === 'deshacer_entrega') { const c = corteRevision(); return !!c && (d.estado.entregas[String(cuerpo.mision)]?.cuando ?? '') > c; }
  if (cuerpo.tipo === 'editar_nota' || cuerpo.tipo === 'borrar_nota' || cuerpo.tipo === 'tipo_nota') return notaTrasCorte(d.estado.notas.find((n) => n.id === cuerpo.id));
  if (cuerpo.tipo === 'corregir_transcripcion') return notaTrasCorte(d.estado.notas.find((n) => n.audio === cuerpo.audio));
  return false;
}

/** Tras un ✉ de la persona de la misión en un paso con opciones aún sin responder: cómo darlo por respondido con eso. */
function pistaYaLoDije(sobre: Nota['sobre'] | undefined): string {
  if (sobre?.tipo !== 'mision' || sobre.eleccion || sobre.hazlo || sobre.aclarar) return '';
  const m = d.plan.misiones.find((x) => x.id === sobre.id);
  const i = m ? m.pasos.findIndex((_, k) => seccionPaso(k) === sobre.seccion) : -1;
  const p = m?.pasos[i];
  if (!m || !p || typeof p === 'string' || !p.opciones?.length || d.identidad.rol !== m.para) return '';
  if (eleccionDe(d.estado.notas, m.id, i, m.para) || pasosHechos(m.id).includes(i)) return '';
  // Las mismas condiciones que `opcionesPaso`: el botón no se usa mientras corre la cuenta del paso. Con el enlace sin
  // visitar sí se usa: ya hay comentario (avisoMision.ts › opcionesHabilitadas). El que llevaría a su propia misión no se dibuja
  const ir = destinoDelPaso(p, m);
  const cuando = p.esperar && !ir && inicioEspera(`${m.id}|${i}`) + p.esperar * 1000 > Date.now() ? tx('accion.pistaAlTerminar') : '';
  return tx('accion.pistaYaLoDije', { cuando, boton: tx('paso.yaLoDije') });
}

async function accion(cuerpo: Record<string, unknown>, hecho = tx('guardado.listo')) {
  if (!libreMientrasRevisa(cuerpo) && esperaAlDirector()) return false;
  // Con el director revisando, el aviso dice solo eso, en pocas palabras (nota de voz del titular nmvvk7nw2tit)
  if (cuerpo.tipo === 'comentar' && revisando() && hecho) hecho = cuerpo.urgente
    ? tx('accion.urgenteVa')
    : remiteALoDicho((cuerpo.sobre as { eleccion?: string } | undefined)?.eleccion)
    ? tx('accion.listoSiguiente')
    : (cuerpo.sobre as { eleccion?: string } | undefined)?.eleccion
    ? tx('accion.elegisteSiguiente', { eleccion: recortar((cuerpo.sobre as { eleccion: string }).eleccion, 40) })
    : tx('accion.guardadoSiguiente');
  else if ((cuerpo.tipo === 'entregar' || cuerpo.tipo === 'responder') && revisando() && hecho) hecho = `${hecho} ${tx('accion.vaSiguiente')}`;
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
    if (!r.ok) throw new Error(j.error ?? tx('nuevo.servidorRespondio', { estado: r.status }));
    // Si después se mandó otra cosa, su respuesta trae el estado completo: esta ya quedó vieja
    const ultima = turno === cambiosLocales;
    if (ultima) d.estado = conEntregasEnVuelo(j.estado, entregasEnVuelo);
    // Una nota urgente: el Studio ya llamó al director para ella (o pidió la revisión, si no puede llamarlo)
    if (j.urgencia !== undefined) d.urgencia = j.urgencia;
    if (j.revision !== undefined) d.revision = j.revision;
    // Lo del proyecto cambia la identidad, el arranque y las señales: se recarga todo
    if (j.proyecto && JSON.stringify(j.proyecto) !== JSON.stringify(d.proyecto)) await cargar(true);
    else if (ultima) {
      darDatosDirector(d);
      repintoDeFondo.pedir();
    }
    // Lo que queda en el Buzón (o en Preguntas) se puede ver desde el aviso. Con audio no se avisa aquí: el único aviso es
    // el de cuando ya está traducido a texto (vigilarTranscripciones; nmvvi8xi2tit: «avísame cuando esté hecho»)
    if (cuerpo.tipo === 'comentar') {
      const sobre = cuerpo.sobre as { tipo?: string } | undefined;
      const donde: Vista = sobre?.tipo === 'pregunta' ? 'preguntas' : 'buzon';
      if (!cuerpo.audio && hecho) avisar(`${hecho}${pistaYaLoDije(cuerpo.sobre as Nota['sobre'] | undefined)}`, true, undefined, { etiqueta: tx(donde === 'preguntas' ? 'aviso.verPreguntas' : 'aviso.verBuzon'), hacer: () => irA(donde) });
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
      avisar(SIN_SERVIDOR(), false, document.querySelector('dialog[open]') ? undefined : () => void accion(cuerpo, hecho));
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
  const cuerpo = r.ok ? await r.json() : null;
  documentos = cuerpo?.documentos ?? [];
  documentosFuera = Number(cuerpo?.fuera) || 0;
}

/** Si el documento abierto se abrió con su botón de «Archivos clave» de la columna: solo esa copia se marca (nmw2db9dptit). */
let copiaEnClave = false;

/**
 * La ruta de un documento en el idioma de la interfaz (listas.ts › enSuIdioma), salvo el que pide leer una misión o el
 * plan, cuyas partes leídas se cuentan por su ruta; los del método del Studio (docs/metodo/, también desde el repositorio)
 * sí, aunque el plan los nombre.
 */
function rutaEnSuIdioma(ruta: string, enCola: readonly { ruta: string }[]): string {
  if (seQuedaEnSuRuta(ruta, enCola, d.plan.documentos.map((x) => x.ruta))) return ruta;
  return enSuIdioma(ruta, (documentos ?? []).map((x) => x.ruta), idiomaActual());
}

async function abrirDocumento(ruta: string, seccion: string | null = null, enClave = false) {
  // Una cosa a la vez: lo que viene después en tu orden de lectura se abre al terminar el que sigue. Salvo lo que pide
  // abrir un paso de una misión que tienes al alcance: ese se abre siempre (nota nmw7tbm5ttit)
  const yo = d?.identidad.rol;
  const enCola = yo ? lecturaDe(yo) : [];
  if (enCola.find((x) => x.ruta === ruta)?.lectura === 'despues' && !(yo && loPideUnPaso(d.plan, d.estado, yo, ruta))) {
    const ahora = enCola.find((x) => x.lectura === 'siguiente');
    return avisar(tx('aviso.docSeAbre', { titulo: tituloDoc(ahora?.ruta ?? '') }));
  }
  await cargarDocumentos();
  // En el idioma de quien lee, si el documento trae esa versión a su lado (los procedimientos del director: X.md, en
  // inglés, y X.es.md): no el que pide leer una misión o el plan, cuyas partes leídas se cuentan por su ruta. Los del
  // método del Studio (docs/metodo/) sí, aunque el plan los nombre: la metodología que la plantilla pone en cada plan
  // nació en inglés, con metodologia.es.md al lado
  ruta = rutaEnSuIdioma(ruta, enCola);
  const r = await fetch(`/__estudio/director/documento?ruta=${encodeURIComponent(ruta)}`);
  if (!r.ok) return avisar((await r.json().catch(() => ({}))).error ?? tx('aviso.noSePudoAbrirDoc'));
  doc = await r.json();
  copiaEnClave = enClave;
  irASeccion = seccion ?? '';
  // Si lleva a mirar una parte que ya leíste, el enfoque no se pone solo: escondería lo que hay que mirar
  enfoqueAlAbrir = !seccion || !leidasDe(ruta).includes(seccion);
  irA('documentos');
}

// ───────────────────────────────────────────── ir a donde dice un paso

/** Un botón que lleva a un destino: dentro del Director (→) o a una página de afuera (↗, en pestaña nueva). */
function botonIr(dest: Destino, clase = 'ir-paso', extra = '') {
  dest = destinoVigente(dest);
  destinos.push(dest);
  const afuera = !!dest.url;
  return `<button type="button" class="${clase}" data-destino="${destinos.length - 1}"${extra} title="${tx(afuera ? 'ir.pestana' : 'ir.lleva')}">${esc(dest.etiqueta)} ${afuera ? '↗' : '→'}</button>`;
}

/**
 * ¿Ya abrió el botón de este paso (su `ir`)? Lo recuerda este navegador. Mientras no, ese botón es lo principal del
 * paso y sus opciones esperan: no se califica lo que aún no se ha visto.
 */
const claveAbierto = (mision: string, i: number) => claveAbiertoDe(d?.activo ?? '', mision, i);
const pasoAbierto = (mision: string, i: number) => localStorage.getItem(claveAbierto(mision, i)) === '1';

/**
 * El botón de un paso: en el paso de ahora, mientras no se abre, es lo principal (lo más visible, y late). Si el paso
 * pide esperar (`esperar`: lo que tarda en verse un cambio), el botón queda bloqueado con su cuenta regresiva hasta que
 * pase: abrirlo antes mostraría lo de antes. La cuenta empieza la primera vez que el paso se ve en este navegador.
 */
function irDelPaso(m: Mision, i: number, dest: Destino, deAhora: boolean, esperar?: number, central = false) {
  if (!deAhora || d.identidad.rol !== m.para) return botonIr(dest);
  const abierto = pasoAbierto(m.id, i);
  const paso = m.pasos[i];
  // En el paso de ahora de tu misión de ahora, ir a donde pide es también lo que hace el botón central (siguiente.ts › irDelPasoSigue)
  const sigue = irDelPasoSigue({ deAhora: central, doc: !!dest.doc, hecho: typeof paso === 'object' && !!paso.hecho, abierto }) ? ' data-siguiente' : '';
  const hasta = esperar && !abierto ? inicioEspera(`${m.id}|${i}`) + esperar * 1000 : 0;
  // Mientras espera, el botón no se ve (no se muestra lo que aún no se puede hacer): la cuenta, grande, dice por qué y
  // qué aparece al terminar; a cero, la cuenta sale y el botón aparece resaltado (pedido del titular)
  if (hasta > Date.now()) {
    return `${cuentaGrande(hasta, `${m.id}|${i}`, tx('paso.alTerminarBoton', { etiqueta: dest.etiqueta }))}
      ${botonIr(dest, 'ir-paso principal', ` data-abre="${esc(m.id)}|${i}" data-espera="${esc(m.id)}|${i}"${sigue} hidden`)}`;
  }
  return botonIr(dest, abierto ? 'ir-paso' : 'ir-paso principal', ` data-abre="${esc(m.id)}|${i}"${sigue}`);
}

async function ir(dest: Destino) {
  dest = destinoVigente(dest); // un botón viejo a una pestaña que ya no existe («Qué es STL») lleva a la página pública
  if (dest.url) return void window.open(dest.url, '_blank', 'noopener');
  if (dest.doc) return abrirDocumento(dest.doc, dest.seccion ?? null);
  // «Escribirle al director» abre el comentario, como el atajo junto a su cara: el Buzón ya no tiene formulario
  if (dest.vista === 'buzon' && dest.ancla === 'escribir') return escribirAlDirector();
  // Lo que cambió de lugar: «El director en este computador» salió de Proyecto a «Modelo y consumo», y el diagnóstico
  // (con sus metas propuestas) entró en Proyecto. Los botones de antes llevan al lugar nuevo
  if (dest.vista === 'proyecto' && dest.ancla === 'p-director') dest = { ...dest, vista: 'modelo', ancla: 'm-director' };
  if (dest.vista === 'diagnostico') dest = { ...dest, vista: 'proyecto', ancla: dest.ancla === 'd-objetivos' ? 'p-objetivo' : 'p-diagnostico' };
  if (dest.fase) faseVista = dest.fase;
  anclaPendiente = dest.ancla ?? null;
  anclaEsperandoDesde = 0;
  irA(dest.vista ?? 'misiones');
  // Sin un lugar preciso, la vista se lee desde arriba, con la cabecera entera y el contenido debajo (nunca tapado)
  if (!anclaPendiente) window.scrollTo({ top: 0 });
}

/** Lo que dura el resalte (director.css › .resaltado): un repintado en medio no lo corta. */
const MS_RESALTE = 4600;
let resalteVivo: { ancla: string; desde: number } | null = null;

/**
 * Lleva la ventana hasta que el elemento quede entero a la vista, debajo de la cabecera fija: centrado si cabe y, si es
 * más alto que la pantalla, con su comienzo arriba. Lo vuelve a comprobar cuando la página termina de acomodarse
 * (imágenes, un repintado), porque un desplazamiento suave que empieza antes puede quedarse corto (nota del titular:
 * lo señalado quedaba varias pantallas más abajo y no se veía el resalte).
 */
function mostrarEntero(el: HTMLElement) {
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ancla = el.dataset.ancla;
  const ir = (suave: boolean) => {
    // Si un repintado lo reemplazó, se busca el de ahora por su ancla: antes la segunda comprobación se perdía y lo
    // señalado quedaba fuera de la vista (nota de voz del titular nmw15wqz9tit, la cuenta de GitHub en «Dónde está»)
    if (!el.isConnected && ancla) el = document.querySelector<HTMLElement>(`[data-ancla="${CSS.escape(ancla)}"]`) ?? el;
    if (!el.isConnected) return;
    // Primero cada contenedor con su propio scroll, del más cercano al más lejano; después, la ventana
    const cajas: HTMLElement[] = [];
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p).overflowY;
      if ((s === 'auto' || s === 'scroll') && p.scrollHeight > p.clientHeight + 1) cajas.push(p);
    }
    desplazamientosEnCadena(cajas.map((c) => rectaEnPagina(c.getBoundingClientRect())), rectaEnPagina(el.getBoundingClientRect()))
      .forEach((d, i) => { if (d) cajas[i].scrollTop += d; });
    // La cabecera se mide en píxeles de la página; el resto (el rectángulo, la ventana, el desplazamiento), en los de pantalla
    const cabeza = aPantalla(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--alto-cabeza')) || 0);
    const r = el.getBoundingClientRect();
    const alto = innerHeight - cabeza - 24;
    if (r.top >= cabeza + 8 && r.bottom <= innerHeight - 8) return; // ya se ve entero
    const arriba = r.top + scrollY - cabeza - 12 - (r.height < alto ? (alto - r.height) / 2 : 0);
    window.scrollTo({ top: Math.max(0, arriba), behavior: suave && !quieto ? 'smooth' : 'auto' });
  };
  ir(true);
  setTimeout(() => ir(false), 700);
  setTimeout(() => ir(false), 1600); // la sección que se pinta con lo de ahora en el cuadro siguiente puede tardar más
}

/** Mientras dura este tiempo desde que empezó el resalte, un repintado vuelve a llevar lo resaltado a la vista. */
const MS_SEGUIR_A_LA_VISTA = 2000;

/**
 * Lo que un botón señala se ve: si es un plegable o está dentro de uno («Ya leído» de un documento, «Otros documentos»,
 * «Completado»), se despliega, con cada plegable que lo contiene. Antes quedaba resaltado pero escondido (el titular
 * llegó con un botón a una parte ya leída y vio el documento vacío, 22 de octubre de 2026).
 */
function abrirPlegados(el: HTMLElement) {
  if (el instanceof HTMLDetailsElement) el.open = true;
  for (let p = el.parentElement?.closest('details'); p; p = p.parentElement?.closest('details')) p.open = true;
  // En la columna de los documentos, plegada a un lado, lo señalado no se vería: la columna se despliega
  const docs = el.closest<HTMLElement>('.docs.sin-lista');
  if (docs && el.closest('.lista-docs')) {
    localStorage.setItem('estudio.docs.lista', 'abierta');
    docs.classList.remove('sin-lista');
  }
}

/** Muestra y resalta un elemento recién pintado (si es para escribir, lo deja listo). */
function resaltar(el: HTMLElement | null | undefined) {
  if (!el) return;
  abrirPlegados(el);
  // La columna de los documentos tiene su propio scroll: se mueve hasta lo señalado
  const columna = el.closest<HTMLElement>('.lista-docs');
  if (columna && columna !== el) columna.scrollTop += desplazamientoParaVer(rectaEnPagina(columna.getBoundingClientRect()), rectaEnPagina(el.getBoundingClientRect()));
  mostrarEntero(el);
  el.classList.remove('resaltado');
  el.style.animationDelay = '';
  void el.offsetWidth;
  el.classList.add('resaltado');
  if (el.dataset.ancla) resalteVivo = { ancla: el.dataset.ancla, desde: Date.now() };
  const campo = el.matches('textarea, input') ? el : el.querySelector<HTMLElement>('textarea, input[type="text"]');
  if (campo) setTimeout(() => campo.focus({ preventScroll: true }), 300);
}

/** Tras un repintado, el resalte que seguía encendido continúa donde iba, sin empezar de nuevo. */
function seguirResalte(v: HTMLElement) {
  if (!resalteVivo) return;
  const pasado = Date.now() - resalteVivo.desde;
  if (pasado >= MS_RESALTE) return void (resalteVivo = null);
  const el = v.querySelector<HTMLElement>(`[data-ancla="${CSS.escape(resalteVivo.ancla)}"]`);
  if (!el || el.classList.contains('resaltado')) return;
  el.style.animationDelay = `-${pasado}ms`;
  el.classList.add('resaltado');
  // Recién llegado, el repintado puede dejarlo más abajo de donde la ventana se movió: se lleva otra vez a la vista
  if (pasado < MS_SEGUIR_A_LA_VISTA) { abrirPlegados(el); mostrarEntero(el); }
}

// ───────────────────────────────────────────── diálogo

/** `explorar`: el campo es una carpeta, con su botón para buscarla en el computador. */
/** `casillas`: varias opciones que se marcan, cada una con su casilla; llegan juntas, separadas por comas. */
interface Campo { id: string; etiqueta: string; tipo: 'area' | 'texto' | 'select' | 'casillas' | 'botones'; opciones?: [string, string][]; requerido?: boolean; valor?: string; explorar?: boolean; clase?: string; ayuda?: string; pista?: string }

/**
 * «Es urgente»: una casilla, sin explicación aparte (el porqué ya está en lo que se pide). Al marcarla, el Studio se la
 * lleva sola al director, al instante, y el director lee la nota para decidir si va ya o qué debe ir antes; el resultado
 * vuelve en «¿Dónde quedamos?» y lo demás del Buzón espera la revisión. Es a propósito poco directa, en
 * dos pasos, para que no se vuelva costumbre: un símbolo discreto junto al título abre el panel, y ahí está la casilla.
 */
function botonUrgente() {
  return `<button type="button" class="abrir-urgente" data-abrir-urgente aria-expanded="false" aria-controls="panel-urgente" title="${esc(tx('buzon.esUrgente'))}">${icono('urgente')}</button>`;
}

function campoUrgente() {
  // Se cuentan para que una urgencia siga siendo rara
  const semana = urgenciasDeLaSemana(d.estado.notas).length;
  return `<div class="panel-urgente" id="panel-urgente" hidden><label class="urgente-campo"><input name="urgente" type="checkbox" value="1" />
    <span class="interruptor" aria-hidden="true"></span><span>${icono('urgente')}<b>${tx('buzon.marcarUrgente')}</b>
    <span class="ayuda-campo">${tx('buzon.urgenteAyuda')}${semana ? ` ${tx('buzon.urgenteSemana', { n: semana })}` : ''}</span></span></label></div>`;
}

/** Marcar urgente llama al director al dejar la nota: se confirma antes, diciendo qué va a pasar. */
function confirmarUrgencia() {
  // Sin quién llame al director desde aquí, lo urgente cae a la revisión de siempre
  if (!automatica()) {
    const pedida = !!d.revision && !d.revision.hecha;
    return confirmar({
      titulo: tx('buzon.urgenteTitulo'),
      texto: tx(pedida ? 'buzon.urgenteYaPedida' : 'buzon.urgentePide'),
      boton: tx(pedida ? 'buzon.urgenteSi' : 'buzon.urgenteSiPedir'),
      cancelar: tx('buzon.urgenteNo'),
    });
  }
  return confirmar({
    titulo: tx('buzon.urgenteTitulo'),
    texto: tx('buzon.urgenteLleva'),
    boton: tx('buzon.urgenteSiLlevar'),
    cancelar: tx('buzon.urgenteNo'),
  });
}

/** La grabadora del ✉ abierto (pedir), para saber qué se perdería si se rehiciera encima. */
let grabadoraDelSobre: Grabadora | null = null;
// Un clic fuera, en el fondo, cierra el ✉ si no tiene nada escrito (modal.ts › cerrarConClicFuera): con un audio grabado
// sin enviar no le llega, porque se perdería sin aviso, y la grabación dice qué hacer. Solo si el clic empezó afuera
let abajoDelSobre: EventTarget | null = null;
$('dialogo').addEventListener('pointerdown', (e) => (abajoDelSobre = e.target));
$('dialogo').addEventListener('click', (e) => {
  const dlg = e.currentTarget as HTMLDialogElement;
  const g = grabadoraDelSobre;
  if (!g || !dlg.open || e.target !== dlg || abajoDelSobre !== dlg) return;
  const aviso = antesDeCerrarConClicFuera(g.estado);
  if (!aviso) return;
  e.stopPropagation();
  g.avisar(aviso);
});

/** Lo que dice el ✉ cuando el servidor no guardó lo que se envió (pedir › guardar), después del porqué. */
const sigueAqui = () => tx('dialogo.sigueAqui');

/**
 * El diálogo común (el ✉ y los demás que piden algo). Con `guardar`, no se cierra hasta que el servidor lo guardó
 * (pedido del titular pd_nada_se_corta): mientras guarda, ni Cancelar, ni Esc, ni un clic fuera lo cierran; si no se
 * guardó, queda abierto con todo lo escrito, grabado y adjunto, y lo dice. `guardar` devuelve true si quedó guardado.
 */
function pedir(o: { titulo: string; ayuda?: string; campos: Campo[]; boton: string; cancelar?: string; audio?: boolean; vacioVale?: boolean; adjuntos?: boolean; actuales?: Adjunto[]; urgente?: boolean; guardar?: (r: Dicho) => Promise<boolean>; borrador?: { proyecto: string; sobre: SobreBorrador } }): Promise<(Record<string, string> & { audio?: string; adjuntos?: { nombre: string; datos: string }[] }) | null> {
  const dlg = $('dialogo') as HTMLDialogElement;
  // El ✉ es uno solo: si sigue abierto (graba a un lado y la página quedó con clics), no se rehace encima de lo grabado.
  // Queda como está y la persona lee por qué en su pastilla, que siempre está a la vista (grabadora.ts › antesDeOtroSobre)
  const ocupado = antesDeOtroSobre(dlg.open, grabadoraDelSobre?.estado ?? 'sin_audio');
  if (ocupado) {
    if (grabadoraDelSobre) grabadoraDelSobre.avisar(ocupado);
    else avisar(ocupado);
    return Promise.resolve(null);
  }
  // Lo que quedó sin enviar sobre lo mismo vuelve como estaba, y lo dice (borradores.ts; pd_dialogo_unico)
  const previo = o.borrador ? leerBorrador(localStorage, o.borrador.proyecto, o.borrador.sobre) : null;
  if (previo) o = { ...o, campos: o.campos.map((c) => (c.id === 'texto' ? { ...c, valor: previo.texto } : c.id === 'tipoNota' && previo.tipoNota ? { ...c, valor: previo.tipoNota } : c)) };
  // El de una nota (con su borrador o su tipo) lleva data-nota: la tecla N también lo cierra
  const deNota = !!o.borrador || o.campos.some((c) => c.id === 'tipoNota');
  dlg.innerHTML = `<form method="dialog"${deNota ? ' data-nota' : ''}>
    <header class="cabeza-dialogo">${o.urgente ? `<div class="titulo-con-urgente"><h2>${esc(o.titulo)}</h2>${botonUrgente()}</div>` : `<h2>${esc(o.titulo)}</h2>`}${o.ayuda ? `<p>${o.ayuda}</p>` : ''}${previo ? `<p class="borrador-guardado" role="status">${tx('dialogo.borrador')} <button type="button" class="enlace" data-borrar-borrador>${tx('dialogo.borrarlo')}</button></p>` : ''}</header>
    ${o.campos
      .map((c) => {
        // Con audio, lo obligatorio de escribir también se puede decir: lo comprueba el envío, no el navegador
        const req = c.requerido && !(o.audio && c.tipo === 'area') ? ' required' : '';
        // Las casillas van en su grupo, con su leyenda: una etiqueta no puede llevar otras dentro
        if (c.tipo === 'casillas')
          return `<fieldset class="campo campo-casillas${c.clase ? ` ${c.clase}` : ''}"><legend class="etiqueta-campo">${esc(c.etiqueta)}</legend>${c.ayuda ? `<span class="ayuda-campo">${esc(c.ayuda)}</span>` : ''}${(c.opciones ?? []).map(([v, n]) => `<label class="casilla-d"><input type="checkbox" name="${c.id}" value="${esc(v)}"${(c.valor ?? '').split(',').includes(v) ? ' checked' : ''}> ${esc(n)}</label>`).join('')}</fieldset>`;
        // Una sola opción, de un toque, como botones (el tipo de una nota, pd_tipo_obligatorio)
        if (c.tipo === 'botones')
          return `<fieldset class="campo campo-botones${c.clase ? ` ${c.clase}` : ''}"><legend class="etiqueta-campo">${esc(c.etiqueta)}</legend>${c.ayuda ? `<span class="ayuda-campo">${esc(c.ayuda)}</span>` : ''}<div class="botones-campo">${(c.opciones ?? []).map(([v, n]) => `<label class="boton-campo"><input type="radio" name="${c.id}" value="${esc(v)}"${v === c.valor ? ' checked' : ''}><span>${esc(n)}</span></label>`).join('')}</div></fieldset>`;
        const control =
          c.tipo === 'area' ? `<textarea name="${c.id}" rows="4"${req}>${esc(c.valor ?? '')}</textarea>`
          : c.tipo === 'select' ? `<select name="${c.id}">${(c.opciones ?? []).map(([v, n]) => `<option value="${esc(v)}"${v === c.valor ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>`
          : c.explorar ? `<span class="con-explorar"><input name="${c.id}" type="text" value="${esc(c.valor ?? '')}"${req} placeholder="${esc(tx('nuevo.exploraRuta'))}" /><button type="button" data-explorar="${c.id}">${tx('nuevo.explorar')}</button></span>`
          : `<input name="${c.id}" type="text" value="${esc(c.valor ?? '')}"${req}${c.pista ? ` placeholder="${esc(c.pista)}"` : ''} />`;
        return `<label class="campo${c.clase ? ` ${c.clase}` : ''}"><span class="etiqueta-campo">${esc(c.etiqueta)}</span>${c.ayuda ? `<span class="ayuda-campo">${esc(c.ayuda)}</span>` : ''}${control}</label>`;
      })
      .join('')}
    ${o.audio ? '<div class="grabadora" data-grabadora></div>' : ''}
    ${o.actuales?.length ? `<fieldset class="adjuntos-actuales"><legend>${tx('dialogo.yaAdjunto')}</legend>${o.actuales.map((a) => `<label class="casilla-d"><input type="checkbox" name="quitar-adjunto" value="${esc(a.ruta)}"> ${tx('dialogo.quitarAdjunto', { nombre: esc(a.nombre) })}</label>`).join('')}</fieldset>` : ''}
    ${o.adjuntos ? '<div class="adjuntos" data-adjuntos></div>' : ''}
    ${o.urgente ? campoUrgente() : ''}
    <p class="error-explorador" role="alert"></p>
    <div class="botones"><button type="button" data-cancelar>${esc(o.cancelar ?? tx('cabeza.cancelar'))}</button><button type="submit" class="primario">${esc(o.boton)}</button></div>
  </form>`;
  const grabadora = (grabadoraDelSobre = o.audio ? new Grabadora(dlg.querySelector('[data-grabadora]') as HTMLElement) : null);
  if (previo?.audio) void grabadora?.cargar(previo.audio, previo.segundos);
  const adjuntos = o.adjuntos ? new Adjuntos(dlg.querySelector('[data-adjuntos]') as HTMLElement, dlg.querySelector('form')!, (t) => avisar(t)) : null;
  return new Promise((ok) => {
    const form = dlg.querySelector('form')!;
    // Un error con el diálogo abierto se ve aquí (avisar lo escribe en él): el aviso queda detrás de su velo
    const error = form.querySelector<HTMLElement>('.error-explorador')!;
    // Se resuelve una sola vez y sin depender del evento «close» (no todos los navegadores lo disparan a tiempo)
    let listo = false;
    // Un envío a la vez (con «Enviar ya» o un doble clic, la nota no queda dos veces) y, con `guardar`, mientras guarda
    let enviando = false;
    let guardando = false;
    // «Borrarlo»: el borrador se va y el diálogo se cierra sin guardar otro
    let borrado = false;
    const terminar = (resultado: (Record<string, string> & { audio?: string; adjuntos?: { nombre: string; datos: string }[] }) | null) => {
      if (listo) return;
      listo = true;
      dlg.removeEventListener('close', alCerrar);
      dlg.removeEventListener('cancel', alCancelar);
      // Lo escrito y lo elegido se leen antes de cerrar; lo grabado, cuando la grabación termina
      const escrito = o.borrador && !resultado && !borrado ? { texto: String(new FormData(form).get('texto') ?? ''), tipoNota: String(new FormData(form).get('tipoNota') ?? '') || undefined } : null;
      const fin = grabadora?.terminar();
      adjuntos?.terminar();
      if (dlg.open) dlg.close();
      ok(resultado);
      if (o.borrador && (resultado || borrado)) quitarBorrador(localStorage, o.borrador.proyecto, o.borrador.sobre);
      // Cerrado sin enviar: queda como borrador, en silencio (pd_dialogo_unico); solo se dice si algo no cupo
      if (o.borrador && escrito) void guardarAlCerrar(o.borrador, o.titulo, escrito, fin, grabadora);
    };
    // Mientras guarda, nada lo cierra ni lo cambia: ni sus botones, ni lo escrito, ni la grabadora, ni lo adjunto
    const marcarGuardando = (si: boolean) => {
      guardando = si;
      form.querySelector<HTMLButtonElement>('button[type="submit"]')!.textContent = si ? tx('dialogo.guardando') : o.boton;
      form.querySelectorAll<HTMLButtonElement>('.botones button').forEach((b) => (b.disabled = si));
      form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('textarea, input[type="text"]').forEach((c) => (c.readOnly = si));
      form.querySelectorAll<HTMLElement>('[data-grabadora], [data-adjuntos]').forEach((x) => (x.inert = si));
    };
    dlg.querySelector('[data-cancelar]')!.addEventListener('click', () => { if (!guardando) terminar(null); });
    // Las carpetas se buscan en el explorador del computador
    form.addEventListener('click', async (e) => {
      if ((e.target as HTMLElement).closest('[data-borrar-borrador]') && !guardando) {
        borrado = true;
        terminar(null);
        return avisar(tx('dialogo.borraste'), true);
      }
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
      if (enviando) return;
      enviando = true;
      try {
        error.textContent = '';
        const valores = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
        // Las casillas marcadas, todas juntas (FormData deja solo la última de cada nombre)
        for (const c of o.campos) if (c.tipo === 'casillas') valores[c.id] = new FormData(form).getAll(c.id).map(String).join(',');
        // Lo que falta se dice antes de cerrar la grabación: cerrarla quitaba «Añadir otro fragmento», y quien olvidó
        // elegir el tipo ya no podía seguir grabando (nota del titular nmvsyxjd6tit, 28 de octubre de 2026)
        const hayAudio = !!grabadora && grabadora.estado !== 'sin_audio';
        // Lo que es obligatorio de escribir vale también dicho en audio; lo que se elige de un toque, no
        const falta = o.campos.find((c) => c.requerido && !(valores[c.id] ?? '').trim() && (c.tipo === 'botones' || !hayAudio));
        if (falta) return avisar(tx(falta.tipo === 'botones' ? 'dialogo.elige' : o.audio ? 'dialogo.faltaAudio' : 'dialogo.falta', { campo: falta.etiqueta }));
        const audio = grabadora ? await grabadora.datos() : null;
        const archivos = adjuntos && !adjuntos.vacio ? await adjuntos.datos() : null;
        // La casilla de urgencia no es contenido: una nota marcada urgente y vacía sigue vacía
        const escrito = Object.entries(valores).some(([k, v]) => k !== 'urgente' && !o.campos.some((c) => c.id === k && c.tipo === 'botones') && v.trim());
        if (o.audio && !o.vacioVale && !audio && !archivos && !escrito) return avisar(tx(o.adjuntos ? 'dialogo.vacioAdjuntos' : 'dialogo.vacio'));
        if (o.urgente && valores.urgente && !(await confirmarUrgencia())) return;
        // Si lo cerraron (Cancelar o Esc) mientras se preparaba el audio o lo adjunto, no se envía nada
        if (listo) return;
        // Lo adjunto que se quita al corregir una nota (pd_corregir_adjuntos): una casilla por adjunto, con su ruta
        const quitar = new FormData(form).getAll('quitar-adjunto').map(String);
        const resultado = { ...valores, ...(audio ? { audio } : {}), ...(archivos ? { adjuntos: archivos } : {}), ...(quitar.length ? { quitarAdjuntos: quitar } : {}) } as Dicho;
        if (!o.guardar) return terminar(resultado);
        // Se cierra solo cuando el servidor lo guardó: lo que falla al guardar (también si se lanza) cuenta como no guardado
        marcarGuardando(true);
        const guardado = await Promise.resolve(resultado).then(o.guardar).catch(() => false);
        marcarGuardando(false);
        if (guardado) return terminar(resultado);
        // El porqué ya lo dejó aquí el aviso (avisar); el de sin servidor ya dice que nada se perdió
        const porque = (error.textContent ?? '').trim();
        error.textContent = porque === SIN_SERVIDOR() ? `${tx('dialogo.noGuardo')} ${porque}` : `${porque ? tx('dialogo.noGuardoPorque', { porque: porque.replace(/\.$/, '') }) : tx('dialogo.noGuardo')} ${sigueAqui()}`;
      } finally {
        enviando = false;
        // Con «Enviar ya», el diálogo se envía a un lado: si el envío no siguió, vuelve al frente con su aviso (nota nmvvki7gktit)
        if (!listo) grabadora?.alFrente();
      }
    });
    // Con Esc el navegador lo cierra solo: se resuelve sin respuesta (si sigue abierto, solo se hizo a un lado para grabar).
    // Mientras guarda, se vuelve a abrir: con dos Esc seguidos, el navegador lo cierra aunque su «cancel» se lo impida
    const alCerrar = () => {
      if (dlg.open) return;
      if (guardando) dlg.showModal();
      else terminar(null);
    };
    // Esc y un clic fuera (modal.ts › cerrarConClicFuera) piden su «cancel»: mientras guarda, no se cierra
    const alCancelar = (e: Event) => {
      if (guardando) e.preventDefault();
      else terminar(null);
    };
    dlg.addEventListener('close', alCerrar);
    dlg.addEventListener('cancel', alCancelar);
    dlg.showModal();
    (dlg.querySelector('textarea, input, select') as HTMLElement | null)?.focus();
  });
}

/**
 * Guarda como borrador lo que quedó sin enviar al cerrar el diálogo (borradores.ts; pd_dialogo_unico): lo escrito, el
 * tipo elegido y, cuando su grabación termina, el audio. En silencio, salvo que el audio no quepa en este navegador.
 */
async function guardarAlCerrar(donde: { proyecto: string; sobre: SobreBorrador }, titulo: string, escrito: { texto: string; tipoNota?: string }, fin: Promise<void> | undefined, grabadora: Grabadora | null) {
  await fin?.catch(() => undefined);
  const audio = (await grabadora?.datos().catch(() => null)) ?? undefined;
  const como = guardarBorrador(localStorage, { ...donde, titulo, ...escrito, ...(audio ? { audio, segundos: grabadora?.duracion } : {}), cuando: new Date().toISOString() });
  if (como === 'sin_audio') avisar(tx('dialogo.borradorSinAudio'));
  else if (como === 'no') avisar(tx('dialogo.borradorNo'));
}

/**
 * Lo que se dijo en un audio, transcrito en este computador y sin guardar el audio (el servidor › /dictar), para sumarlo
 * a una nota que se corrige. null si no se pudo: el aviso lo dice dentro del diálogo, que sigue abierto con lo grabado.
 */
async function dictar(audio: string, callado = false): Promise<string | null> {
  if (!callado) decir(tx('nota.dictando'), 'pensativo');
  const r = await fetch('/__estudio/director/dictar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio }), signal: AbortSignal.timeout(15 * 60_000) }).catch((e) => e as Error);
  if (r instanceof Error) {
    if (!callado) avisar(tx('nota.dictadoSinRespuesta'));
    return null;
  }
  const c = await r.json().catch(() => ({}));
  if (!r.ok || !c.texto) {
    if (!callado) avisar(c.error ?? tx('nota.dictadoNo'));
    return null;
  }
  return String(c.texto);
}

/**
 * Lo grabado en un diálogo empieza a transcribirse apenas se detiene, con su indicador debajo de la grabación (nota del
 * titular nmvsyxjd6tit, 28 de octubre de 2026: «debe iniciarse tan pronto se termina de grabar, no solo cuando se envía la
 * nota al buzón»); otro fragmento lo empieza de nuevo, con todo lo grabado. `esperar()` da lo entendido de lo último que
 * se grabó (null si no se pudo: entonces se transcribe como siempre); `listo()`, solo si ya terminó, sin esperar.
 */
function transcribirAlDetener(g: Grabadora | null, entendido = (t: string) => tx('nota.seEntendio', { texto: recortar(t, 200) })) {
  let vez = 0;
  type Dictado = { vez: number; fragmentos: number; texto: Promise<string | null>; listo?: string | null };
  let actual: Dictado | null = null;
  if (g) g.alDetener = (blob) => {
    const esta = ++vez;
    const caja = $('dialogo').querySelector<HTMLElement>('[data-grabadora]');
    caja?.parentElement?.querySelector('[data-dictando]')?.remove();
    caja?.insertAdjacentHTML('afterend', `<p class="transcripcion procesando" role="status" data-dictando>${tx('nota.transcribiendo')}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></p>`);
    const este: Dictado = { vez: esta, fragmentos: g.cuantosFragmentos, texto: enDatos(blob).then((a) => dictar(a, true)).catch(() => null) };
    actual = este;
    void este.texto.then((t) => {
      este.listo = t;
      const aviso = $('dialogo').querySelector<HTMLElement>('[data-dictando]');
      if (!aviso || esta !== vez) return;
      if (t === null) return void aviso.remove();
      aviso.className = 'transcripcion';
      aviso.textContent = entendido(t);
    });
  };
  // Vale lo de la última vez que se detuvo, si después no empezó otro fragmento ni se quitó el audio
  const deAhora = () => (actual && actual.vez === vez && g?.blob && g.cuantosFragmentos === actual.fragmentos ? actual : null);
  return { esperar: () => deAhora()?.texto ?? Promise.resolve(null), listo: () => deAhora()?.listo ?? null };
}

// ───────────────────────────────────────────── cabecera: quién, el puesto de mando, el arranque y la ruta

/** Cuánto hace que se trajo GitHub y cómo va lo propio. */
function pintarSincronizacion() {
  const s = d.sincronizacion;
  const el = $('sincronizacion');
  const hace = s.traido ? Math.max(0, Math.round((Date.now() - new Date(s.traido).getTime()) / 1000)) : null;
  const cuando = hace === null ? tx('sync.aunNo') : hace < 60 ? tx('sync.haceSegundos', { n: hace }) : tx('sync.haceMinutos', { n: Math.round(hace / 60) });
  const subiendo = s.subida && (s.subida.porSubir > 0 || s.subida.fase === 'subiendo');
  const problema = s.error || (s.subida && ['choque', 'sin_red', 'en_espera'].includes(s.subida.fase) ? s.subida.mensaje : null);
  el.className = `insignia sync ${problema ? 'choque' : subiendo ? 'subiendo' : 'al_dia'}`;
  el.textContent = problema ? tx('sync.problema') : subiendo ? tx('sync.subiendo') : s.local ? tx('sync.local') : tx('sync.alDia', { cuando });
  el.title = problema ?? tx(s.local ? 'sync.tituloLocal' : 'sync.tituloGithub');
}

function pintarQuien() {
  pintarSelectorIdioma();
  const q = $('quien');
  const id = d.identidad;
  q.textContent = id.rol ? `${nombrePersona(id.rol)} (${id.nombre}) · ${id.rol}${id.nuevo ? tx('equipo.sinRegistrar') : ''}` : tx('equipo.sinIdentidad');
  q.classList.toggle('sin', !id.rol);
  q.title = id.problema ?? tx(id.rol === TITULAR ? 'equipo.tituloTitular' : 'equipo.tituloIntegrante');
}

// ───────────────────────────────────────────── varios proyectos

const NOMBRE_ETAPA: Record<string, string> = {
  get conectar() { return tx('etapa.conectar'); },
  get contar() { return tx('etapa.contar'); },
  get diagnostico() { return tx('etapa.diagnostico'); },
  get objetivo() { return tx('etapa.objetivo'); },
  get ruta() { return tx('etapa.ruta'); },
  get en_marcha() { return tx('etapa.enMarcha'); },
};

/** En qué va un proyecto, en pocas palabras: la etapa del arranque o, en marcha, su fase. */
const enQueVa = (p: ResumenProyecto) => (p.etapa === 'en_marcha' && p.fase ? tx('etapa.fase', { fase: p.fase }) : NOMBRE_ETAPA[p.etapa] ?? p.etapa);

/**
 * El selector de proyecto, arriba de la barra lateral: el activo con en qué va y, al abrirlo, todos, cada uno con lo
 * que espera al director y su alerta. Cambiar de proyecto es un clic: el director dice dónde quedaron.
 */
function pintarSelectorProyecto(proyectos: ResumenProyecto[], activo: string | null) {
  $('selector-proyecto').hidden = !proyectos.length;
  const a = proyectos.find((p) => p.id === activo);
  $('proyecto-activo').innerHTML = a
    ? `<span class="inicial-p" aria-hidden="true">${esc(a.nombre.charAt(0).toUpperCase())}</span><span class="texto-p"><b>${esc(a.nombre)}</b><small>${esc(enQueVa(a))}</small></span>${a.alerta ? `<span class="alerta-punto" title="${esc(tx('proyectos.tieneAlerta'))}">!</span>` : ''}${icono('flecha', 'icono flecha-p')}`
    : '';
  $('proyecto-activo').title = tx('proyectos.cambiar');
  $('menu-proyectos').innerHTML = `<p class="titulo-menu">${tx('proyectos.tusProyectos')} <small>${tx('proyectos.unoActivo')}</small></p>
    <ul role="list">${proyectos
      .map((p) => `<li class="fila-proyecto"><button type="button" class="opcion-proyecto${p.id === activo ? ' activo' : ''}" data-cambiar="${esc(p.id)}"${p.id === activo ? ' aria-current="true"' : ''}>
        <span class="inicial-p" aria-hidden="true">${esc(p.nombre.charAt(0).toUpperCase())}</span>
        <span class="texto-p"><b>${esc(p.nombre)}</b>${p.esElStudio ? `<small class="marca-studio">${esc(tx('proyectos.tuStudio'))}</small>` : ''}<small>${esc(enQueVa(p))}${p.porRevisar ? ` · ${tx('proyectos.porRevisar', { n: p.porRevisar })}` : ''}</small>${p.alerta ? `<small class="alerta-linea">⚠ ${esc(p.alerta)}</small>` : ''}</span>
        ${p.id === activo ? icono('check', 'icono marca-activo') : ''}</button><button type="button" class="engrane-p" data-config-proyecto="${esc(p.id)}" title="${esc(tx('proyectos.configTitulo', { nombre: p.nombre }))}" aria-label="${esc(tx('proyectos.configNombre', { nombre: p.nombre }))}">${icono('ajustes')}</button></li>`)
      .join('')}</ul>
    <div class="acciones-menu"><button type="button" data-nuevo-proyecto>${icono('mas')} ${tx('proyectos.entregar')}</button><button type="button" data-ver-proyectos>${icono('proyectos')} ${tx('proyectos.verTodos')}</button></div>`;
}

function abrirMenuProyectos(abrir: boolean) {
  // Flota sobre el contenido, justo debajo del selector (la barra lateral es angosta para mostrarlo completo)
  const b = rectaEnPagina($('proyecto-activo').getBoundingClientRect());
  Object.assign($('menu-proyectos').style, { top: `${Math.round(b.bottom + 6)}px`, left: `${Math.round(b.left)}px` });
  $('menu-proyectos').hidden = !abrir;
  $('proyecto-activo').setAttribute('aria-expanded', String(abrir));
  if (abrir) $('menu-proyectos').querySelector<HTMLElement>('.opcion-proyecto.activo, .opcion-proyecto')?.focus();
}

/** Cambia el proyecto activo y, si se pide, lleva directo a un lugar de ese proyecto (su misión, sus propuestas…). */
async function activar(id: string, destino?: Destino) {
  if (d?.activo !== id) {
    mandarRegistro();
    const r = await fetch('/__estudio/director/activo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (!r.ok) return avisar((await r.json().catch(() => ({}))).error ?? tx('proyectos.noSePudoCambiar'));
    await cargar(true);
    // Lo que recorriste con la niebla es de cada proyecto (pd_registro_lectura)
    await cargarRegistroLectura();
  }
  if (destino) return void (await ir(destino));
  // Al cambiar de proyecto, lo primero: dónde quedamos
  await mostrarDondeQuedamos();
}

// ───────────────────────────────────────────── «Dónde quedamos»: el brief al volver a un proyecto

const claveVisto = (id: string) => `estudio.visto.${id}`;
/** Al terminar de marcar sus líneas, el botón central lleva a lo que sigue (siguiente.ts): antes, no. */
const SIGUE_AL_DIA = ' data-siguiente data-siguiente-tras=".dq-seccion .dq-item:not(.leida)"';
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
  const { html, est, mia, porDecidir } = htmlDondeQuedamos();
  const dlg = document.createElement('dialog');
  dlg.className = CLASE_DQ;
  dlg.innerHTML = html;
  document.body.append(dlg);
  await new Promise<void>((ok) => {
    let listo = false;
    const terminar = async (destino?: Destino, enfocar = false) => {
      if (listo) return;
      listo = true;
      localStorage.setItem(claveVisto(d.activo), new Date().toISOString());
      if (dlg.open) dlg.close();
      dlg.remove();
      // Sin «¿Dónde quedamos?», la niebla de lectura vuelve a ser solo del enfoque
      aplicarEnfoque();
      pintarMando();
      if (destino) await ir(destino);
      // Con el botón central, el autoavance sigue en tu misión en modo enfoque (nmw0ysgrytit)
      if (enfocar && vista === 'misiones') quererEnfoque(true);
      ok();
    };
    dlg.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!b) return;
      if (b.classList.contains('dq-item')) return tocarDq(dlg, b, est);
      if (b.dataset.dqPestana) return mostrarPestanaDq(dlg, b.dataset.dqPestana as PestanaDq);
      if (b.classList.contains('dq-mas')) return masDq(dlg, est);
      if (b.dataset.dqComentar) return void comentarDq(b.dataset.dqComentar, est);
      // Siempre a la tarjeta de la misión (no al documento del paso): el resumen da contexto y la misión dice el paso
      if (b.dataset.aMision !== undefined && mia) void terminar(tarjetaDe(mia), clicDelCentral());
      else if (b.dataset.aPropuestas !== undefined) void terminar({ vista: 'propuestas', etiqueta: '' });
      else if (b.dataset.aPermisos !== undefined) void terminar({ vista: 'modelo', ancla: 'm-permisos', etiqueta: '' });
      else if (b.dataset.cerrar !== undefined) void terminar();
    });
    dlg.addEventListener('cancel', () => void terminar());
    dlg.addEventListener('close', () => void terminar());
    pintarProgresoDq(dlg, est);
    dlg.showModal();
    // Lo que se lee aquí lo escribió el director: la niebla de lectura también va, con su atajo junto a la cara
    aplicarEnfoque();
    prepararLoQueSigue(dlg);
  });
}

const CLASE_DQ = 'dialogo-director donde-quedamos';

/**
 * La voz de «¿Dónde quedamos?», preparada en cuanto termina la revisión, sin esperar a que se abra (pedido
 * pd_voz_dq_al_cerrar; nota de voz del titular nmvvepu96tit, 30 de octubre de 2026: «tan pronto termine la revisión,
 * automáticamente en segundo plano»): antes de la recarga con que el Studio muestra lo nuevo, la cola manda a preparar
 * sus bloques en orden, desde el primero; el servidor los guarda en el computador, así que al abrirse suena sin esperar.
 */
function prepararDondeQuedamos() {
  prepararDeAntemano([cajaDondeQuedamos()]);
}

/** «¿Dónde quedamos?» como se va a abrir, para preparar su voz sin abrirlo. */
const cajaDondeQuedamos = () => `<dialog class="${CLASE_DQ}">${htmlDondeQuedamos().html}</dialog>`;

/** Lo de adentro de «¿Dónde quedamos?», con lo que hace falta para abrirlo: el mismo para mostrarlo y para preparar su voz. */
function htmlDondeQuedamos() {
  const r = d.plan.resumen;
  const visto = localStorage.getItem(claveVisto(d.activo));
  const p = d.proyectos.find((x) => x.id === d.activo);
  const yo = d.identidad.rol ?? TITULAR;
  const mia = abiertasDe(yo)[0];
  const respondidasDesde = visto ? d.estado.notas.filter((n) => (d.plan.respuestas[n.id]?.cuando ?? '') > visto) : [];
  const nuevasRespuestas = respondidasDesde.filter((n) => !esPregunta(n)).length;
  const nuevasPreguntas = respondidasDesde.filter(esPregunta).length;
  const nuevasAprobadas = visto ? Object.entries(d.plan.revisiones).filter(([, x]) => x.cuando > visto && x.veredicto === 'aprobada').length : 0;
  const porDecidir = p?.agenda.porDecidir ?? 0;
  // Cada línea se toca cuando se lee: se tacha, se rompe y baja a «Ya leído». Lo nuevo se acumula hasta que lo marques,
  // y lo leído se recuerda en este navegador. Lo que espera de ti no se dice aquí: solo lo dicen tu misión y el director
  const est = estadoDq(d.activo);
  const desde = visto ? tx('dq.ultimaVisita', { cuando: momento(visto) }) : tx('dq.primeraVez');
  const novedades = [
    nuevasAprobadas ? tx('dq.misionesAprobadas', { n: nuevasAprobadas }) : '',
    nuevasRespuestas ? tx('dq.respuestasNuevas', { n: nuevasRespuestas }) : '',
    nuevasPreguntas ? tx('dq.preguntasRespondidas', { n: nuevasPreguntas }) : '',
  ].filter(Boolean);
  const html = `<form method="dialog">
    <div class="dq-cabeza"><h2 class="etiqueta" tabindex="-1" autofocus>${esc(d.proyecto.nombre || d.activo)} · ${tx('dq.titulo')}</h2>${((paro) => (paro ? lineaDeParo(paro) : ''))(paroReciente())}${opcionesDq()}</div>
    <p class="dq-quedamos">${r ? esc(r.quedamos) : tx('dq.sinResumen')}</p>
    ${r?.alerta ? `<p class="alerta-p">⚠ ${esc(r.alerta)}</p>` : ''}
    <p class="como">${desde}${novedades.length ? ` ${tx('dq.desdeEntonces', { novedades: novedades.join(tx('dq.y')) })}` : ''}${r ? ` ${tx('dq.resumenDel', { cuando: momento(r.fecha) })}` : ''}</p>
    ${lecturaDq(est)}
    ${informeCaidaDq()}
    ${informeNegadosDq()}
    <div class="botones"><button type="button" data-cerrar>${tx('dq.cerrar')}</button>${mia ? `<button type="button" class="primario" data-a-mision${SIGUE_AL_DIA} title="${esc(tx('dq.irTitulo'))}">${tx('dq.irALoQueSigue')}</button>` : porDecidir ? `<button type="button" class="primario" data-a-propuestas${SIGUE_AL_DIA}>${tx('dq.verPropuestas')}</button>` : ''}</div>
  </form>`;
  return { html, est, mia, porDecidir };
}

/**
 * El informe de lo que se le negó al director en su última revisión de este proyecto, en una sola línea, con su botón al
 * panel de permisos (decisión del titular del 26 de octubre de 2026, misión «Decide cómo te cuenta «¿Dónde quedamos?» lo
 * que se le negó al director»: «Una sola línea, como recomiendas»; pedido pd_panel_permisos). En vez de un paso de misión
 * por permiso: el detalle de cada uno está en el panel, donde se autoriza, y lo que no pudo hacer, en sus comentarios.
 */
function informeNegadosDq() {
  const ultima = (d.consumo ?? []).filter((x) => x.proyecto === d.activo && x.tipo === 'revision').sort((a, b) => b.cuando.localeCompare(a.cuando))[0];
  const n = ultima?.negados?.length ?? 0;
  if (!n) return '';
  return `<p class="negados-dq">${icono('candado')}<span>${tx('dq.negados', { cuando: esc(momento(ultima.cuando)), n })} <button type="button" class="enlace" data-a-permisos>${tx('dq.verPanel')}</button></span></p>`;
}

// ───────────────────────────────────────────── «Dónde quedamos» como lectura de juego
// Cada línea del resumen se toca cuando se lee. Responde al instante (el check), se tacha, se rompe en pedazos y baja a
// «Ya leído», y la barra dice cuánto llevas. Al volver, solo aparece lo que falta. Lo que se repite es corto y nunca
// bloquea (se puede tocar la siguiente sin esperar), y lo especial queda para los hitos: la mitad, el final y, de vez en
// cuando, una chispa distinta. Lo nuevo se acumula: si el director reescribe el resumen antes de que lo leas, lo anterior
// sigue esperando hasta que lo marques, salvo que lo nuevo sea otra versión de lo mismo (mismaIdea): entonces la
// reemplaza. «Ya leído» muestra las últimas 20 y trae más de a 20, si se piden.

interface SeccionDq { id: string; titulo: string; items: string[] }
/** Una línea guardada en este navegador: espera hasta que la marques; leída, baja a «Ya leído» con su fecha. */
interface LineaDq { h: string; s: string; t: string; llego: string; leida?: string }
/** Lo que lleva abierto «Dónde quedamos»: el archivo de líneas, la barra (de lo de ahora) y cuántas leídas se ven. */
interface EstadoDq { proyecto: string; archivo: LineaDq[]; total: number; leidas: number; mostradas: number; contadas: Set<string> }

// Dos cosas distintas, cada una una sola vez: lo que se hizo (con su resultado) y lo que el director comenta (por qué
// decidió algo, lo que no pudo, lo que conviene saber). En este orden: primero lo avanzado
// Y, en su pestaña cada una, las respuestas a tus notas por su tipo (pestanasDq.ts; pd_pestanas_donde_quedamos)
const TITULOS_DQ: Record<string, string> = {
  get avanzamos() { return tx('dq.avanzamos'); },
  get director() { return tx('dq.comentarios'); },
  get 'r-pregunta'() { return tx('dq.rPregunta'); },
  get 'r-ajuste'() { return tx('dq.rAjuste'); },
  get 'r-falla'() { return tx('dq.rFalla'); },
  get 'r-idea'() { return tx('dq.rIdea'); },
  get 'r-otras'() { return tx('dq.rOtras'); },
};
const LEIDAS_A_LA_VISTA = 20;
const LEIDAS_GUARDADAS = 300;

/**
 * Lo que se lee en «Dónde quedamos»: lo avanzado y los comentarios del director en su última revisión, un tema por
 * línea (sus viñetas: temasDelMensaje).
 */
function seccionesDq(): SeccionDq[] {
  const r = d.plan.resumen;
  // Lo respondido desde tu última visita (la primera vez, lo del día del resumen), cada nota en la pestaña de su tipo
  const visto = localStorage.getItem(claveVisto(d.activo));
  const desde = visto ?? (r ? new Date(new Date(r.fecha).getTime() - 24 * 3600_000).toISOString() : new Date().toISOString());
  const respondidas = lineasDeRespuestas(d.estado.notas.filter((n) => seVe(n.de)), d.plan.respuestas, desde);
  return [
    ...Object.keys(TITULOS_DQ).filter((id) => id.startsWith('r-')).map((id) => ({ id, titulo: TITULOS_DQ[id], items: respondidas.filter((x) => x.seccion === id).map((x) => x.texto) })),
    { id: 'avanzamos', titulo: TITULOS_DQ.avanzamos, items: r?.avanzamos ?? [] },
    { id: 'director', titulo: TITULOS_DQ.director, items: temasDelMensaje(d.plan.mensaje?.texto ?? '') },
  ].filter((s) => s.items.length);
}

/** Una línea de «Dónde quedamos»: los comentarios del director y sus respuestas traen negrilla (Markdown en línea). */
// Sin enlaces a los archivos: cada línea ya es un botón, y un enlace no va dentro de otro
const textoDq = (l: LineaDq) => (l.s === 'director' || l.s.startsWith('r-') ? limpio(marked.parseInline(l.t, { async: false }) as string, false) : esc(l.t));

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
  // Lo que el archivo guardó cortado, de cuando las respuestas se recortaban, vuelve entero (pestanasDq.ts › lineaCompleta)
  let completas: { seccion: string; texto: string }[] | null = null;
  let cambio = false;
  for (const l of archivo) {
    if (l.leida || !l.s.startsWith('r-') || !l.t.endsWith('…')) continue;
    completas ??= lineasDeRespuestas(d.estado.notas, d.plan.respuestas, '');
    const entera = lineaCompleta(l.t, completas.filter((c) => c.seccion === l.s).map((c) => c.texto));
    if (!entera) continue;
    l.t = entera;
    l.h = huellaDq(l.s, entera);
    cambio = true;
  }
  const conocidas = new Set(archivo.map((l) => l.h));
  let viejas: Set<string> | null = null;
  const ahora = new Date().toISOString();
  const secciones = seccionesDq();
  const deAhora = new Set(secciones.flatMap((s) => s.items.map((t) => huellaDq(s.id, t))));
  for (const s of secciones) {
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
  // Una línea que esperaba sin leer y que el director reescribió o alargó (ya no está en el resumen) sale: la reemplaza
  // su versión más nueva, para no leer dos veces lo mismo con otras palabras
  const vigentes = archivo.filter((l) => !l.leida || deAhora.has(l.h));
  const masNueva = (v: LineaDq, w: LineaDq) => deAhora.has(w.h) || w.llego > v.llego || (w.llego === v.llego && w.t.length > v.t.length);
  const sobran = new Set(vigentes.filter((v) => !v.leida && !deAhora.has(v.h) && vigentes.some((w) => w !== v && w.s === v.s && masNueva(v, w) && mismaIdea(v.t, w.t))));
  if (sobran.size) archivo = archivo.filter((l) => !sobran.has(l));
  if (cambio || sobran.size) guardarArchivoDq(proyecto, archivo);
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

// Cada línea trae su ✉: preguntar o comentar justo eso al director, sin tener que citarlo en el Buzón
const itemDq = (l: LineaDq, orden: number, leida: boolean) =>
  `<li><button type="button" class="dq-item${leida ? ' leida' : ''}" data-huella="${l.h}" data-seccion="${esc(l.s)}" data-orden="${orden}" title="${esc(tx(leida ? 'dq.volverAPoner' : 'dq.tocala'))}"><span class="dq-check" aria-hidden="true"></span><span class="dq-cuerpo"><span class="dq-texto">${textoDq(l)}</span></span><span class="sr-only">${leida ? ` ${tx('dq.leida')}` : ''}</span></button><button type="button" class="dq-comentar" data-dq-comentar="${l.h}" title="${esc(tx('dq.comentarTitulo'))}" aria-label="${esc(tx('dq.comentarAria'))}">✉</button></li>`;

/** El ✉ de una línea: una nota general que cita la línea (su sección y su comienzo), para que el director sepa a qué responde. */
async function comentarDq(h: string, est: EstadoDq) {
  const l = est.archivo.find((x) => x.h === h);
  if (!l) return;
  const t = l.t.replace(/\*\*/g, '');
  await comentar({ tipo: 'general', seccion: `Dónde quedamos › ${TITULOS_DQ[l.s] ?? l.s}`, fragmento: recortar(t, 200) }, tx('dq.comentarLinea', { linea: recortar(t, 70) }));
}

/**
 * Al abrirse «¿Dónde quedamos?», la voz de todas sus pestañas y la de tus misiones se prepara en segundo plano, en el orden
 * en que las vas a leer (pedido pd_voz_precarga; guiaLectura.ts › prepararDeAntemano): las pestañas, una tras otra; tu
 * misión de ahora y las que siguen, cada una con la tarjeta con que se verá cuando sea la de ahora, y cada paso suyo que
 * todavía no se ve (pasosPorVenir); y la primera parte de cada documento que te piden leer (primerasPartes). Antes que
 * todo eso, lo primero que vas a oír del documento al que te manda tu misión de ahora (pedido pd_precargar_doc;
 * guiaLectura.ts › prepararPrimero). Lo mismo al pintar «Hoy», sin «¿Dónde quedamos?», y al salir el reporte de lo cumplido
 * (el arranque, nota de voz del titular nmvzfcm2htit): lo ya preparado no se vuelve a pedir. «¿Dónde quedamos?», que es lo
 * primero que se lee, va delante de lo que «Hoy» ya puso en la cola.
 */
function prepararLoQueSigue(dlg?: HTMLElement | string) {
  const yo = d.identidad.rol ?? TITULAR;
  const ahora = abiertasDe(yo)[0];
  const misiones = [...(ahora ? [ahora] : []), ...misionesQueSiguen(reservaDeMisiones(d.plan, d.estado, yo), ahora?.id)];
  if (dlg) prepararDelante(dlg);
  // Cada misión con la voz de su idioma, el mismo con que sonará al darle ▶ (nmw6r2nuwtit)
  for (const m of misiones) prepararDeAntemano([tarjetaMision(m, false, 1), ...pasosPorVenir(m)], false, false, idiomaDeMision(m));
  if (!vozPuesta()) return;
  const suyo = ahora ? documentoDeLaMision(ahora) : undefined;
  void partesPorLeer(suyo ? [suyo] : [], primerosPedidos)
    .then(([caja]) => caja && prepararPrimero(caja))
    .then(() => partesPorLeer(misiones.flatMap(documentosDeMision), partesPedidas, true))
    .then((partes) => partes.length && prepararDeAntemano(partes));
}

/** Los documentos que pide leer una misión: los de sus pasos que llevan a uno y los que nombra, en su orden. */
const documentosDeMision = (m: Mision) => [...m.pasos.flatMap((p) => (typeof p !== 'string' && p.ir?.doc ? [p.ir.doc] : [])), ...(m.documentos ?? [])];

/** El documento al que te manda tu misión: el del primer paso sin marcar que lleva a uno o, si no hay, el primero que nombra. */
function documentoDeLaMision(m: Mision): string | undefined {
  const hechos = new Set(pasosHechos(m.id));
  const paso = m.pasos.find((p, i) => !hechos.has(i) && typeof p !== 'string' && !!p.ir?.doc);
  return (typeof paso === 'object' ? paso.ir?.doc : undefined) ?? m.documentos?.[0];
}

/**
 * Cada paso de una misión que todavía no se ve, como se verá cuando sea el de ahora: la tarjeta muestra solo el paso que
 * sigue (listaPasos), así que la voz de los demás no se preparaba, y al marcar uno había que esperar la del siguiente
 * (nota de voz del titular nmvvbqi6wtit, 30 de octubre de 2026: «tuve que esperar todo el tiempo que procesara su audio»).
 */
function pasosPorVenir(m: Mision): string[] {
  const hechos = new Set(pasosHechos(m.id));
  const sigue = m.pasos.findIndex((_, i) => !hechos.has(i));
  if (sigue < 0) return [];
  // Con lo mismo que llevará su tarjeta cuando sea el de ahora (missionCard.ts › enunciadoDeMision), sin el porqué: así el
  // audio preparado es el mismo
  return m.pasos.map((_, i) => i).filter((i) => i > sigue && !hechos.has(i)).map((i) => `<article class="mision-c sigue mia">${enunciadoDeMision(m, new Set(m.pasos.map((_, k) => k).filter((k) => k < i)))}${listaDePasos(m, true, [i])}</article>`);
}

/**
 * Los documentos cuya primera parte ya se mandó a preparar en esta visita: no se vuelven a pedir en cada repintado. Lo
 * primero que vas a oír del de tu misión de ahora va aparte: el que se preparó en su orden cuando venía después se
 * adelanta al llegar a ser el de ahora.
 */
const partesPedidas = new Set<string>();
const primerosPedidos = new Set<string>();

/**
 * Las partes por leer de cada uno de esos documentos, como se pinta cada una al llegar a ella, para que su voz también esté
 * lista al abrirlo: la primera (elección del titular en t_decide_voz_precarga, nota nmvvbrivwtit, 30 de octubre de 2026) o,
 * con `todas`, todas (nota de voz del titular nmvzfcm2htit, 2 de noviembre de 2026: «documentos que va a tener que leer,
 * mete todo eso en la cola»). Un documento que no se puede abrir se salta.
 */
async function partesPorLeer(rutas: string[], pedidas = partesPedidas, todas = false): Promise<string[]> {
  const cajas: string[] = [];
  for (const ruta of [...new Set(rutas)].filter((r) => !pedidas.has(r))) {
    pedidas.add(ruta);
    const r = await fetch(`/__estudio/director/documento?ruta=${encodeURIComponent(ruta)}`).catch(() => null);
    const otro = r?.ok ? ((await r.json().catch(() => null)) as typeof doc) : null;
    const suyas = otro?.texto ? partesPorLeerDe(otro) : [];
    cajas.push(...(todas ? suyas : suyas.slice(0, 1)));
  }
  return cajas;
}

/** El idioma de un documento, una vez por documento (src/director/voz.ts): se recuerda mientras su texto sea el mismo. */
const idiomasDeDocumentos = new Map<string, { texto: string; idioma: 'es' | 'en' | null }>();
function idiomaDe(x: NonNullable<typeof doc>) {
  const visto = idiomasDeDocumentos.get(x.ruta);
  if (visto?.texto === x.texto) return visto.idioma;
  const idioma = idiomaDeDocumento(x.ruta, x.texto);
  idiomasDeDocumentos.set(x.ruta, { texto: x.texto, idioma });
  return idioma;
}

/**
 * Lo que se lee ahora: el documento abierto o, en «Hoy», tu misión de ahora, por la mayoría de sus palabras (lo escrito
 * antes de un cambio de idioma suena en el suyo, t_decide_voz_docs_viejos). Null si no se sabe: lee la voz de la interfaz.
 */
ponerIdiomaDelTexto(() => {
  if (!d || !('plan' in d)) return null;
  if (vista === 'documentos' && doc) return idiomaDe(doc);
  const ahora = vista === 'misiones' ? abiertasDe(d.identidad.rol ?? TITULAR)[0] : undefined;
  return ahora ? idiomaDeMision(ahora) : null;
});
/** El idioma de una misión, por la mayoría de sus palabras: con él suena y con él se prepara de antemano (guiaLectura.ts). */
function idiomaDeMision(m: Mision) {
  return idiomaDeTexto(`${m.titulo}. ${m.porQue} ${m.pasos.map(textoPaso).join(' ')}`);
}

/**
 * Las partes por leer de un documento, cada una pintada como al abrirla: idea por idea (porTrozos › 'parte') o, si no tiene
 * partes (AGENTS.md), entera, en su única parte, donde la voz junta los párrafos en bloques grandes (guiaLectura.ts ›
 * juntarEnBloques). Esa se saltaba: al entrar a AGENTS.md, su audio apenas empezaba a prepararse (nota de voz del titular
 * nmvvvbxdjtit, 31 de octubre de 2026). Ninguna si ya se leyó todo.
 */
function partesPorLeerDe(otro: NonNullable<typeof doc>): string[] {
  const paraLeer = new Set(partesDeDocumento(otro.texto));
  const leidas = leidasDe(otro.ruta);
  const partes = secciones(otro.texto).filter((p) => paraLeer.has(p.titulo) && !leidas.includes(p.titulo));
  // porTrozos y conDecisiones pintan el documento abierto: se les presta este un momento, sin esperar nada en medio
  const abierto = doc;
  doc = otro;
  try {
    // Con el idioma de ese documento: lo que se prepara suena con la voz con que se va a leer (guiaLectura.ts › prepararDeAntemano)
    const idioma = idiomaDe(otro);
    const lector = `<div class="lector"${idioma ? ` data-idioma="${idioma}"` : ''}>`;
    return partes.map((parte) => (parte.titulo
      ? `${lector}${porTrozos(parte, [], 'parte')}</div>`
      : `${lector}${parteEntera(conDecisiones('', parte.md, []))}</div>`));
  } finally {
    doc = abierto;
  }
}

/** Las secciones con lo que falta por leer, la barra de lo leído y, al final, lo ya leído (plegado, de a 20). */
function lecturaDq(est: EstadoDq): string {
  if (!est.archivo.length) return '';
  const ids = Object.keys(TITULOS_DQ).filter((id) => est.archivo.some((l) => l.s === id));
  const leidas = leidasDq(est);
  // Una pestaña por tipo de lo respondido, y «La ruta»; cada una con sus secciones (también la que ya no trae nada por
  // leer, para que una línea vuelva a su lugar), y sus botones solo donde hay algo (pintarProgresoDq)
  const pestanas = ORDEN_PESTANAS_DQ.filter((p) => ids.some((id) => pestanaDeSeccion(id) === p));
  const activa = pestanaActiva(ids.filter((id) => pendientesDq(est, id).length).map(pestanaDeSeccion));
  const seccion = (id: string) => `<section class="dq-seccion" data-seccion="${id}"><h3>${esc(TITULOS_DQ[id])}</h3><ul class="dq-lista">${pendientesDq(est, id).map((l, i) => itemDq(l, i, false)).join('')}</ul></section>`;
  return `<div class="dq-progreso" aria-live="polite"><div class="dq-barra"><i></i></div><span class="dq-cuenta"></span></div>
    <div class="filtro-tipo dq-pestanas" role="tablist" aria-label="${esc(tx('dq.porTipo'))}">${pestanas.map((p) => `<button type="button" role="tab" class="chip-tipo${p === activa ? ' activo' : ''}" data-dq-pestana="${p}" aria-selected="${p === activa}">${esc(NOMBRE_PESTANA_DQ[p])} · <span class="cifra"></span></button>`).join('')}</div>
    ${pestanas.map((p) => `<div class="dq-panel" role="tabpanel" data-pestana="${p}"${p === activa ? '' : ' hidden'}>${ids.filter((id) => pestanaDeSeccion(id) === p).map(seccion).join('')}</div>`).join('')}
    <p class="dq-al-dia" hidden>${tx('dq.alDia')}</p>
    <details class="dq-leidas"${leidas.length ? '' : ' hidden'}><summary>${tx('dq.yaLeido')} <span class="cifra">${leidas.length}</span></summary><ul class="dq-lista">${leidas.slice(0, est.mostradas).map((l) => itemDq(l, Infinity, true)).join('')}</ul><button type="button" class="enlace dq-mas" hidden></button></details>`;
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
  cuenta.textContent = !leidas ? tx('dq.tocaCada') : !falta ? tx('dq.leisteTodas', { total }) : `${tx('dq.leiste', { leidas, total })}${falta <= 2 ? ` · ${tx('dq.yaCasi')}` : leidas === Math.ceil(total / 2) ? ` · ${tx('dq.laMitad')}` : ''}`;
  dlg.querySelectorAll<HTMLElement>('.dq-seccion').forEach((s) => (s.hidden = !s.querySelector('li')));
  // Las pestañas: solo las que traen algo por leer, con cuántas; al terminar una, se pasa sola a la siguiente
  const paneles = [...dlg.querySelectorAll<HTMLElement>('.dq-panel')];
  const cuantas = new Map(paneles.map((p) => [p.dataset.pestana as PestanaDq, p.querySelectorAll('.dq-seccion li').length]));
  const conAlgo = [...cuantas].filter(([, k]) => k).map(([p]) => p);
  dlg.querySelectorAll<HTMLButtonElement>('[data-dq-pestana]').forEach((b) => {
    const k = cuantas.get(b.dataset.dqPestana as PestanaDq) ?? 0;
    b.hidden = !k;
    b.querySelector('.cifra')!.textContent = String(k);
  });
  const barra = dlg.querySelector<HTMLElement>('.dq-pestanas');
  if (barra) barra.hidden = conAlgo.length < 2;
  const abierta = paneles.find((p) => !p.hidden)?.dataset.pestana as PestanaDq | undefined;
  mostrarPestanaDq(dlg, pestanaActiva(conAlgo, abierta) ?? abierta ?? null);
  const yaLeido = dlg.querySelector<HTMLDetailsElement>('.dq-leidas')!;
  const todasLeidas = est.archivo.filter((l) => l.leida).length;
  yaLeido.hidden = !todasLeidas;
  yaLeido.querySelector('.cifra')!.textContent = String(todasLeidas);
  const mas = yaLeido.querySelector<HTMLButtonElement>('.dq-mas')!;
  const quedan = todasLeidas - yaLeido.querySelectorAll('.dq-lista li').length;
  mas.hidden = quedan <= 0;
  mas.textContent = quedan > LEIDAS_A_LA_VISTA ? tx('dq.mostrarDe', { n: LEIDAS_A_LA_VISTA, quedan }) : tx('dq.mostrarMas', { quedan });
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

/** Abre una pestaña de «¿Dónde quedamos?» y esconde las demás. */
function mostrarPestanaDq(dlg: HTMLElement, pestana: PestanaDq | null) {
  if (!pestana) return;
  dlg.querySelectorAll<HTMLElement>('.dq-panel').forEach((p) => (p.hidden = p.dataset.pestana !== pestana));
  dlg.querySelectorAll<HTMLButtonElement>('[data-dq-pestana]').forEach((b) => {
    const si = b.dataset.dqPestana === pestana;
    b.classList.toggle('activo', si);
    b.setAttribute('aria-selected', String(si));
  });
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
    b.title = tx('dq.tocala');
    b.querySelector('.sr-only')!.textContent = '';
    const lista = dlg.querySelector(`.dq-seccion[data-seccion="${linea.s}"] .dq-lista`)!;
    const orden = pendientesDq(est, linea.s).map((l) => l.h);
    const despues = [...lista.querySelectorAll<HTMLElement>('.dq-item')].find((x) => orden.indexOf(x.dataset.huella!) > orden.indexOf(h));
    lista.insertBefore(li, despues?.closest('li') ?? null);
    est.mostradas = Math.max(LEIDAS_A_LA_VISTA, est.mostradas - 1);
    return pintarProgresoDq(dlg, est);
  }
  if (b.classList.contains('tachando')) return;
  // Con la niebla puesta, una línea que sigue nublada no se da por leída al tocarla: se lee destapándola (nota de voz
  // del titular nmvn0h59stit, 24 de octubre de 2026); su director brinca para decir por dónde se empieza
  const texto = b.querySelector('.dq-texto');
  if (sinDestapar(texto)) return llamarNiebla(texto, NO_AVANZA);
  // El estado cambia de una vez (nada se pierde si se cierra a mitad del efecto); el efecto va detrás
  linea.leida = new Date().toISOString();
  guardarArchivoDq(est.proyecto, est.archivo);
  est.leidas++;
  // Con su sonido, que se elige en «Sonidos» (nota de voz del titular, 22 de octubre de 2026)
  sonar('linea');
  const { total } = est;
  const hito = est.leidas === total || est.leidas === Math.ceil(total / 2);
  const mover = () => {
    li.removeAttribute('style');
    li.classList.remove('cerrando');
    b.classList.remove('tachando', 'rompiendo');
    b.classList.add('leida');
    b.title = tx('dq.volverAPoner');
    b.querySelector('.sr-only')!.textContent = ` ${tx('dq.leida')}`;
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
    sonar('desarme');
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
 * los logros nuevos y un botón a lo que sigue (directo al documento, si lo que sigue es leer). Con `luegoDq`, al cerrarse
 * se abre «¿Dónde quedamos?» (que lleva a la misión): su botón dice eso, en vez de llevar a la misión por encima de él.
 */
async function celebrarSiToca(luegoDq = false) {
  if (!d || document.querySelector('dialog[open]')) return;
  const yo = d.identidad.rol ?? TITULAR;
  let celebradas: string[] = [];
  try { celebradas = JSON.parse(localStorage.getItem(claveCelebradas(yo)) ?? '[]'); } catch { /* sin celebrar aún */ }
  const c = celebracion(ctx(), yo, celebradas);
  if (!c) return;
  localStorage.setItem(claveCelebradas(yo), JSON.stringify([...celebradas, ...c.misiones.map((m) => m.id)]));
  // Subir de nivel suena más grande que la misión aprobada que lo trajo
  sonar(c.subeA ? 'logro' : 'aprobada');
  const mia = abiertasDe(yo)[0];
  const sigue = mia && !luegoDq ? tarjetaDe(mia) : null;
  const n = nivelDe(xpDe(d.plan, d.estado, yo));
  const dijo = c.misiones.length === 1 ? d.plan.revisiones[c.misiones[0].id]?.comentario : '';
  const dlg = document.createElement('dialog');
  dlg.className = 'dialogo-director celebracion';
  dlg.innerHTML = `<form method="dialog">
    <div class="confeti" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
    <span class="etiqueta">${tx('celebracion.aprobadas', { n: c.misiones.length })} · +${c.xp} XP</span>
    <h2>${esc(c.frase)}</h2>
    <ul class="cumplidas">${c.misiones.map((m) => `<li>${icono('check')}<span>${esc(m.titulo)}</span><b>+${m.xp} XP</b></li>`).join('')}</ul>
    ${dijo ? `<p class="como"><b>${tx('mision.elDirector')}</b> ${esc(dijo)}</p>` : ''}
    <div class="nivel-p"><div class="fila-nivel"><b>${tx('ficha.nivel', { n: n.nivel })}</b><small>${tx('ficha.paraSubir', { faltan: n.paraSubir - n.enNivel, nivel: n.nivel + 1 })}</small></div><div class="barra-xp"><div style="width:${n.enNivel}%"></div></div></div>
    ${c.subeA ? `<p class="sube-nivel">${icono('estrella')} ${tx('celebracion.subiste', { nivel: c.subeA })}</p>` : ''}
    ${c.logros.length ? `<p class="logros-nuevos">${tx('celebracion.logros', { n: c.logros.length })}: ${c.logros.map((l) => `<span class="logro ganado" title="${esc(l.como)}">${icono('estrella')}<span>${esc(l.nombre)}</span></span>`).join(' ')}</p>` : ''}
    ${mia ? `<div class="mision-a"><span class="etiqueta">${tx('celebracion.loQueSigue')}</span><b>${esc(mia.titulo)}</b></div>` : ''}
    <div class="botones">${luegoDq ? `<button type="button" class="primario" data-cerrar data-siguiente autofocus title="${esc(tx('celebracion.verDqTitulo'))}">${tx('celebracion.verDq')}</button>` : `<button type="button" data-cerrar autofocus>${tx('comun.cerrar')}</button>${sigue ? `<button type="button" class="primario" data-seguir data-siguiente title="${esc(tx('celebracion.sigueTitulo'))}">${tx('dq.irALoQueSigue')}</button>` : ''}`}</div>
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

/** Las misiones que se están entregando solas, al marcar su último paso: una sola entrega por misión. */
const entregandoSola = new Set<string>();
/** Las mismas, ya entregadas en este navegador mientras el servidor las guarda (avisoMision.ts › conEntregasEnVuelo). */
const entregasEnVuelo = new Map<string, EstadoDirector['entregas'][string]>();

/**
 * Al marcar el último paso, la misión se entrega sola (no hace falta un «Lo hice» aparte) y el Studio lo celebra: la
 * misión pasa a esperar al director y la siguiente queda a la vista, con su botón.
 */
async function completarSiToca(id: string, guardado: Promise<boolean>) {
  const m = d.plan.misiones.find((x) => x.id === id);
  if (!m || !m.pasos.length || !m.pasos.every((_, k) => pasosHechos(id).includes(k))) return false;
  if (!['pendiente', 'en_curso', 'rehacer'].includes(estadoMision(m, d.plan, d.estado))) return false;
  // Mientras se entrega sola, su «Entregar al director» no está: ni a la vista ni para el botón central, que lo oprimía
  // y abría la ventana «Lo hice» entre una misión y la siguiente (nota de voz del titular nmvvdc2f4tit, 30 de octubre)
  if (entregandoSola.has(id)) return false;
  entregandoSola.add(id);
  for (const b of document.querySelectorAll<HTMLElement>(`[data-entregar="${CSS.escape(id)}"]`)) b.hidden = true;
  // La siguiente toma su lugar ya, sin esperar al servidor: la misión completa ya no se queda unos segundos en pantalla
  // mientras se guarda (nota de voz del titular nmvvi7svwtit, 30 de octubre: «solamente saltar a la siguiente nota o
  // misión presentando el avance en el toast»). Si el servidor no la guarda, vuelve, con su botón
  entregasEnVuelo.set(id, { cuando: new Date().toISOString(), quien: d.identidad.nombre });
  d.estado = conEntregasEnVuelo(d.estado, entregasEnVuelo);
  const entregada = avisarEntrega(m);
  let guardada = false;
  try {
    guardada = !!(await guardado) && !!(await accion({ tipo: 'entregar', mision: m.id, automatico: 'ultimo_paso' }, ''));
  } finally {
    entregandoSola.delete(id);
    entregasEnVuelo.delete(id);
  }
  if (!guardada) {
    // Sin servidor, la misión vuelve como estaba, con «Entregar al director»: con él se entrega igual, sin la ventana
    const { [id]: _, ...resto } = d.estado.entregas;
    d.estado = { ...d.estado, entregas: resto };
    quitarAvisoMision();
    pintar();
    return false;
  }
  return entregada;
}

/** El aviso de la misión completada y la siguiente en su lugar, en cuanto se completa (completarSiToca). */
function avisarEntrega(m: Mision) {
  sonar('entrega');
  // Solo cambia lo de adentro: la misión siguiente donde estaba la entregada (también en su modo enfoque)
  pintar();
  // Entregada, la revisión no se pide sola ni se ofrece aquí, ni siquiera con la última misión (nota de voz del titular,
  // 22 de octubre de 2026: quedarse sin misiones no es motivo para pedirla; antes puede querer leer, comentar o corregir,
  // y un botón de pedirla en la celebración se oprimía sin querer). La pide la persona cuando quiera, con «Pedir
  // revisión», arriba, en la cabecera. Con el director ya revisando, no entra en esa revisión
  // Un director vivo (el de la anterior, que termina lo último, o el de otro proyecto) cuenta como en marcha
  const ocupado = directorOcupado();
  const enMarcha = revisando() || !!ocupado;
  const yaPedida = !enMarcha && !!d.revision && !d.revision.hecha;
  const mia = abiertasDe(d.identidad.rol ?? TITULAR)[0];
  // La recomendación del director, si la dejó en esta misión y no hay ya una revisión pedida o en marcha
  const recomienda = !enMarcha && !yaPedida && m.recomiendaRevision?.trim() ? m.recomiendaRevision.trim() : null;
  // En pocas palabras (nota de voz del titular nmvvk7nw2tit): el aviso dice solo en qué quedó la entrega. «Va en la
  // revisión siguiente» ya dice que entregarla no pidió ninguna
  const estado = enMarcha
    ? tx('accion.vaSiguiente')
    : yaPedida
    ? tx('entrega.entraPedida')
    : mia
    ? tx('entrega.pideCuandoQuieras')
    : tx('entrega.eranTodas');
  // Si ya hay otro diálogo abierto (por ejemplo «Dónde quedamos»), no se le encima: basta el aviso
  if (document.querySelector('dialog[open]')) {
    avisar(tx('entrega.completada', { titulo: recortar(m.titulo, 60), estado: recomienda ? tx('entrega.recomienda') : estado }), true);
    return true;
  }
  const sigue = mia ? tarjetaDe(mia) : null;
  // Un aviso a un lado que se va solo, no una ventana que pide un clic para seguir (pedido pd_toast_mision; nota de voz del
  // titular nmvvbmk29tit, 30 de octubre de 2026): en «Hoy», la misión siguiente queda a la vista desde el primer momento;
  // en otra sección, el aviso trae «Ir a mi misión →». Sin otra misión abierta tampoco se empuja la revisión
  const enHoy = vista === 'misiones';
  mostrarAvisoMision({ titulo: m.titulo, xp: m.xp, estado, recomienda: recomienda ? recomendacionDeRevision(recomienda) : undefined, irAMision: !!sigue && !enHoy }, () => sigue && void ir(sigue));
  // En el enfoque de la misión, la siguiente ya ocupa su lugar: solo cambia lo de adentro, sin volver a navegar ni a
  // resaltarla, y el gráfico de su pie sigue en pantalla (nmvvdc2f4tit)
  if (sigue && enHoy && !enfoque.startsWith('mision-')) void ir(sigue);
  return true;
}

/**
 * La recomendación del director de pedir la revisión al entregar una misión (`recomiendaRevision`), con su razón y su
 * botón. Solo la recomienda: la revisión la pide la persona con ese botón, o no la pide (regla dura del 23 de octubre).
 */
function recomendacionDeRevision(razon: string): string {
  return `<div class="recomienda-revision" role="note"><p><b>${tx('entrega.recomiendaAhora')}</b> ${esc(razon)}</p>
    <button type="button" data-revision="pedir" data-origen="recomendada" title="${esc(tx('entrega.recomiendaTitulo'))}">${tx('entrega.botonPedir')}</button></div>`;
}

/** Un proyecto nuevo: su nombre, su repositorio y lo que se quiere lograr. Quien lo crea queda como titular. */
async function nuevoProyecto() {
  const r = await pedirProyectoNuevo();
  if (!r) return;
  try {
    if (r.modo === 'uno') {
      const res = await fetch('/__estudio/director/proyecto-nuevo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r.datos) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? tx('nuevo.servidorRespondio', { estado: res.status }));
      await cargar(true);
      irA('misiones');
      return avisar(tx(r.datos.tipo === 'nuevo' ? 'nuevo.quedoUnoNuevo' : 'nuevo.quedoUno', { nombre: r.datos.nombre }), true);
    }
    // Varios existentes (en líneas o del escaneo): el director los diagnostica en sus próximas revisiones
    const res = await fetch('/__estudio/director/proyectos-varios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proyectos: r.proyectos }) });
    const j: { creados?: { id: string; nombre: string }[]; errores?: string[]; error?: string } = await res.json();
    if (!res.ok) throw new Error(j.error ?? tx('nuevo.servidorRespondio', { estado: res.status }));
    await cargar(true);
    irA('proyectos');
    const n = j.creados?.length ?? 0;
    avisar(`${tx('nuevo.quedaronVarios', { n })}${j.errores?.length ? ` ${tx('nuevo.noSeAgregaron', { errores: j.errores.join(' ') })}` : ''}`, !j.errores?.length);
  } catch (e) {
    avisar(esDeRed(e) ? SIN_SERVIDOR() : (e as Error).message);
  }
}

/** Sin proyectos: la bienvenida, con el botón para crear el primero. */
function pintarBienvenida(x: SinProyectos) {
  document.body.classList.add('sin-proyectos');
  pintarSelectorProyecto([], null);
  $('sincronizacion').textContent = tx('bienvenida.local');
  pintarSelectorIdioma();
  const q = $('quien');
  q.textContent = x.identidad.nombre ? tx('bienvenida.sinProyecto', { nombre: x.identidad.nombre }) : tx('equipo.sinIdentidad');
  q.classList.toggle('sin', !x.identidad.nombre);
  $('mando').innerHTML = '';
  $('navegacion').innerHTML = '';
  $('ir-inicio').toggleAttribute('disabled', true); // sin proyectos no hay «Hoy» a donde ir
  $('vista').innerHTML = `<section class="bienvenida panel-d">
    <span class="etiqueta">${tx('bienvenida.etiqueta')}</span>
    <h1>${tx('bienvenida.titulo')}</h1>
    <p>${tx('bienvenida.intro')}</p>
    <ol class="ritmo">
      <li>${tx('bienvenida.existente')}</li>
      <li>${tx('bienvenida.nuevo')}</li>
      <li>${tx('bienvenida.despues')}</li>
    </ol>
    <h3>${tx('bienvenida.computador')}</h3>
    <ul class="salud" id="salud"><li class="como">${tx('bienvenida.comprobando')}</li></ul>
    ${x.identidad.nombre && x.identidad.correo ? `<p><button type="button" class="primario grande" data-nuevo-proyecto>${tx('bienvenida.entregarPrimero')}</button></p>` : `<p class="aviso remoto">${esc(x.identidad.problema ?? tx('bienvenida.configurarGit'))}</p>`}
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
      .map((c) => `<li class="${c.ok ? 'ok' : c.opcional ? 'opcional' : 'falta'}"><span class="icono-s">${c.ok ? '✓' : c.opcional ? '○' : '✗'}</span><div><b>${esc(c.nombre)}</b>${c.opcional ? ` <small>${tx('salud.opcional')}</small>` : ''}<small>${esc(c.detalle)}${!c.ok && c.arreglo ? ` ${tx('salud.arreglo')} <code>${esc(c.arreglo)}</code>` : ''}</small></div></li>`)
      .join('');
  } catch {
    el.innerHTML = `<li class="como">${tx('salud.noSePudo')}</li>`;
  }
}

function vistaProyectos() {
  return vistaProyectosHtml({ proyectos: d.proyectos, activo: d.activo, nombreEtapa: (e) => NOMBRE_ETAPA[e] ?? e, irAMisiones: botonIr({ vista: 'misiones', etiqueta: tx('proyectos.irAMisiones') }) });
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
        <span class="sobretitulo">${esc(d.proyecto.nombre || d.activo)} <span class="aqui">› ${esc(vista === 'diagnostico' && esNuevo() ? tx('nav.planteamiento') : NOMBRE_VISTA[vista])}</span> · ${arrancando ? tx('cabeza.elArranque') : tx('cabeza.fase', { n: numeroFase(f), total: ultima() })}</span>
        <h1><span class="titulo-fase">${esc(f.nombre)}</span> <small>${esc(corto(f.etapa))}</small></h1>
      </div>
      <div class="acciones-cabeza">${botonRevision()}${((nv) => `<button type="button" class="boton-suave${nv.sinLeer ? ' por-leer' : ''}${nv.nuevo ? ' hay-novedades' : ''}" data-donde-quedamos${nv.sinLeer && vista === 'misiones' ? ' data-central-dq' : ''} title="${esc(nv.sinLeer ? `${nv.nuevo ? `${tx('dq.algoNuevo')} ` : ''}${tx('dq.tituloSinLeer', { n: nv.sinLeer })}` : tx('dq.tituloAlDia'))}">${icono('reloj')} ${tx('cabeza.dondeQuedamos')}${nv.sinLeer ? `<span class="cifra">${nv.sinLeer}</span>` : ''}</button>`)(novedadesDq())}${botonEnfoque()}${botonTema()}${botonSonido()}</div>
    </div>
    <div class="cabeza-fila segunda">
      <button type="button" class="avance-puerta" data-ir="ruta" title="${tx('ruta.verFase')}">
        <span class="barra-medida"><span style="width:${(av.avance * 100).toFixed(1)}%"></span></span>
        <span>${tx('cabeza.criterios', { cumplidos: av.cumplidos, total: av.total, puerta: esc(f.puerta.nombre) })}</span>
      </button>
      ${objetivo ? `<span class="objetivo-cabeza" title="${esc(`${objetivo.texto} · ${tx('proyecto.exito')}: ${objetivo.exito}`)}"><b>${tx('cabeza.meta')}</b> ${esc(objetivo.texto)}</span>` : `<span class="objetivo-cabeza sin">${tx('cabeza.sinMeta')}</span>`}

    </div>`;
  $('titulo-movil').textContent = `${d.proyecto.nombre || d.activo} › ${vista === 'diagnostico' && esNuevo() ? tx('nav.planteamiento') : NOMBRE_VISTA[vista]}`;
}

/**
 * «Pedir revisión»: deja una marca en este computador. Si el Studio tiene con qué (Claude Code con su sesión iniciada),
 * lanza al director en ese momento; si no, la toma la sesión del director en su ciclo (/loop 5m /vigila). Mientras tanto
 * dice en qué va: pedida (se puede cancelar), el director revisando, o cuándo fue la última.
 */
/** Cada cuánto mira la sesión del director (/loop 5m /vigila); sin una vuelta en más de dos ciclos, nadie está mirando. */
const VIGILIA_MIN = 5;
const vigilando = () => !!d.vigilia && Date.now() - Date.parse(d.vigilia) < (VIGILIA_MIN * 2 + 2) * 60_000;
/** El Studio lanza solo al director: no hace falta ninguna sesión abierta mirando. */
const automatica = () => !!d.revisor?.agente && !d.revisor.problema;
/**
 * La revisión pedida espera aunque nadie trabaje desde este Studio: otro director tiene el candado de su proyecto (la sesión
 * del director, u otro Studio), o la ventana de uso de tu plan está agotada.
 */
const esperaCandado = () => !!d.revision && !!d.revisor?.espera && d.revisor.espera.proyecto === d.activo;
/** En qué va la revisión pedida, en una frase (para la cabecera y lo que pasa en segundo plano). */
function estadoRevision(): { estado: 'ninguna' | 'pedida' | 'en_curso' | 'sin_vigilia'; texto: string } {
  const r = d.revision;
  if (r && !r.hecha && (r.enCurso || r.lanzada)) return { estado: 'en_curso', texto: tx('cabeza.revisando') };
  if (r && !r.hecha && r.error && !vigilando())
    return { estado: 'sin_vigilia', texto: `${r.error} ${tx('falla.pideDeNuevo')}` };
  // Un director sigue trabajando (el de la revisión anterior, que ya la cerró y termina lo último, o el de otro
  // proyecto): esta espera su turno y empieza sola, porque trabaja un director a la vez (nota de voz del 22 de octubre)
  if (r && !r.hecha && automatica() && d.revisor?.revisando)
    return { estado: 'pedida', texto: tx('revision.esperaTurnoDirector', { hora: hora(r.pedida), quien: tx(d.revisor.revisando === d.activo ? 'revision.anteriorTermina' : 'revision.otroProyecto') }) };
  // Otro director tiene el candado del proyecto (la sesión del director, que corre «revisa estudio» a mano, o uno que
  // lanzó otra copia del Studio; pd_un_director), o la ventana de uso de tu plan está agotada (pr_procesos_vista, punto
  // 4): esta espera su turno y empieza sola, y el porqué lo dice el servidor
  if (r && !r.hecha && automatica() && esperaCandado())
    return { estado: 'pedida', texto: tx('revision.esperaTurno', { hora: hora(r.pedida), texto: d.revisor!.espera!.texto }) };
  if (r && !r.hecha && automatica()) return { estado: 'pedida', texto: tx('revision.llamando', { hora: hora(r.pedida) }) };
  if (r && !r.hecha && !vigilando())
    return { estado: 'sin_vigilia', texto: tx('revision.nadieLaToma', { hora: hora(r.pedida), problema: d.revisor?.problema ?? tx('revision.sinClaude') }) };
  if (r && !r.hecha) return { estado: 'pedida', texto: tx('revision.vigilia', { hora: hora(r.pedida), min: VIGILIA_MIN, vuelta: hora(d.vigilia!) }) };
  return { estado: 'ninguna', texto: '' };
}

/**
 * Un director lanzado sigue vivo (el de la revisión anterior, que ya la cerró y termina lo último, o el de otro
 * proyecto): mientras tanto no se ofrece pedir otra revisión, en ninguna parte (cero tolerancia del titular a dos
 * revisiones o dos pedidos a la vez, nota de voz del 22 de octubre de 2026). Dice qué corre y por qué no se puede pedir.
 */
function directorOcupado(): { corto: string; porque: string } | null {
  // La medición del núcleo gasta del mismo límite de tu cuenta: mientras corre, no se lanza ningún director
  const m = d?.medicion?.enMarcha;
  if (m) return { corto: tx('ocupado.midiendo'), porque: tx('ocupado.midiendoPorque', { quien: m.quien }) };
  const vivo = d?.revisor?.revisando;
  if (!vivo) return null;
  const vuelve = tx('ocupado.vuelve');
  return vivo === d.activo
    ? { corto: tx('ocupado.terminaUltimo'), porque: tx('ocupado.terminaUltimoPorque', { vuelve }) }
    : { corto: tx('ocupado.otroProyectoCorto'), porque: tx('ocupado.otroProyectoPorque', { vuelve }) };
}

/** Cuánto se espera, sin nada nuevo en el registro de la revisión lanzada, para decir que está parada (revisor.ts › SIN_ACTIVIDAD_MIN). */
const SIN_ACTIVIDAD_MIN = 10;
/** Los minutos que lleva sin nada nuevo la revisión en marcha, si pasan de SIN_ACTIVIDAD_MIN; si no, 0. */
function minutosSinActividad(): number {
  if (!d?.actividad || estadoRevision().estado !== 'en_curso') return 0;
  const m = Math.floor((Date.now() - Date.parse(d.actividad)) / 60_000);
  return m >= SIN_ACTIVIDAD_MIN ? m : 0;
}
const PARADA = (min: number) => tx('parada.sinCambio', { min });
/** Lo que corre el director mientras su registro no crece: espera a que termine, y el límite lo sigue cuidando. */
const CORRE = (que: string, min: number) => tx('parada.corre', { min, que: que.replace(/\.$/, '') });

/**
 * Las revisiones seguidas (pedido pd_revisiones_seguidas): en marcha, cuántas van y «Detener»; si pararon hace poco, por
 * qué (nunca en silencio). Vacío si no hay.
 */
function cadenaDeRevisiones(): string {
  const s = d.seguidas;
  if (!s) return '';
  if (!s.paro) return `<span class="estado-revision seguidas" role="status" title="${esc(tx('seguidas.titulo', { quien: s.quien, hora: hora(s.desde) }))}">${tx('seguidas.estado')}${s.hechas ? ` · ${s.hechas + 1}` : ''}<button type="button" class="enlace" data-seguidas="detener">${tx('comun.detener')}</button></span>`;
  if (!paroReciente()) return '';
  // Corto, para no tapar «¿Dónde quedamos?» en la cabecera: el porqué entero está ahí, arriba de todo (pedido pd_parada_visible)
  return `<span class="estado-revision seguidas-paro" role="status" title="${esc(tx('seguidas.pararonA', { hora: hora(s.paro.cuando), porque: s.paro.porque }))}">${tx('seguidas.pararon')}<button type="button" class="enlace" data-donde-quedamos>${tx('cabeza.porQue')}</button></span>`;
}

/**
 * Por qué pararon las revisiones seguidas, solo hasta que se lanza otra revisión, sola o seguida (nota de voz del titular
 * nmvtinjrvtit, 29 de octubre de 2026: más tarde parece que habla de la última); si no, null.
 */
function paroReciente(): { cuando: string; porque: string } | null {
  return paroVigente(d?.seguidas?.paro, d?.revision);
}

/**
 * El porqué de la parada, lo primero de «¿Dónde quedamos?» (nota de voz del titular, 27 de octubre de 2026): un ícono de
 * información junto al título que, con un clic, abre el porqué como un menú contextual, y con otro lo cierra. No queda a
 * la vista todo el rato, en rojo, rompiendo el diseño (nota de voz del titular nmvt0g2rrtit, 29 de octubre de 2026).
 */
const lineaDeParo = (paro: { cuando: string; porque: string }) =>
  `<details class="dq-paro"><summary title="${esc(tx('dq.paroPorQue'))}" aria-label="${esc(tx('dq.paroPorQue'))}">${icono('info')}</summary><p class="dq-paro-menu" role="note">${tx('dq.paro', { hora: hora(paro.cuando), porque: esc(paro.porque.replace(/\.$/, '')) })}</p></details>`;

/** Cuánto tiene el director para cerrar después de «Detener ahora» (avisoAlDirector.ts › DETENER_TRAS_MIN). */
const DETENER_TRAS_MIN = 3;

/**
 * «Detener ahora», junto a «El director está revisando», solo si lo lanzó este Studio (la sesión del director, a mano, no
 * se le puede hablar); o, si alguien ya lo oprimió, que cierra con lo hecho, quién lo pidió y cuándo.
 */
function detenerAhora(): { boton: string; cerrando: string | null } {
  const v = d?.revisor?.deteniendo;
  if (v && v.proyecto === d.activo) return { boton: '', cerrando: tx('detener.cerrando', { quien: v.quien, hora: hora(v.cuando), hasta: hora(new Date(Date.parse(v.cuando) + DETENER_TRAS_MIN * 60_000).toISOString()) }) };
  if (!automatica() || d?.revisor?.revisando !== d.activo) return { boton: '', cerrando: null };
  return { boton: `<button type="button" class="enlace" data-revision="detener" title="${esc(tx('detener.botonTitulo', { min: DETENER_TRAS_MIN }))}">${tx('detener.boton')}</button>`, cerrando: null };
}

/** Los límites de lo que el director hace aparte de la revisión (revisor.ts › MAX_MIN_URGENCIA y MAX_MIN_ACLARAR). */
const MIN_URGENCIA = 30;
const MIN_ACLARAR = 15;

/**
 * Lo urgente y una aclaración, también a la vista mientras corren (pr_procesos_vista, punto 3): cuánto lleva de su límite
 * y «Detener ahora», o que cierra con lo hecho. Vacío si aún no se lanzó.
 */
function seguimientoAparte(lanzada: string | undefined, limite: number): string {
  const cuanto = tiempoDeRevision(lanzada ? { lanzada, limite } : null);
  if (!cuanto) return '';
  const parar = detenerAhora();
  return parar.cerrando ? tx('detener.cierraConLoHecho') : `${tx('cabeza.lleva', { lleva: cuanto.lleva, limite: cuanto.limite })}${parar.boton}`;
}

/** «Detener ahora», con su confirmación: lo que hace, lo que queda y lo que no. */
async function detenerLaRevision(): Promise<void> {
  const seguidas = !!d.seguidas && !d.seguidas.paro;
  const si = await pedir({
    titulo: tx('detener.titulo'),
    ayuda: `${tx('detener.ayuda', { min: DETENER_TRAS_MIN })}${seguidas ? ` ${tx('detener.seguidasParan')}` : ''}`,
    campos: [],
    boton: tx('detener.detenerlo'),
    cancelar: tx('detener.sigaTrabajando'),
    vacioVale: true,
  });
  if (!si) return;
  const r = await fetch('/__estudio/director/detener', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(30_000) }).catch((x) => x as Error);
  if (r instanceof Error || !r.ok) return avisar(r instanceof Error ? tx('servidor.noHabla') : (await r.json().catch(() => ({}))).error ?? tx('servidor.noSePudoRespondio', { estado: r.status }));
  avisar(tx('detener.pedido', { min: DETENER_TRAS_MIN }));
  await cargar();
}

function botonRevision() {
  const r = d.revision;
  const e = estadoRevision();
  const parada = minutosSinActividad();
  const cadena = cadenaDeRevisiones();
  // Lo que lleva y lo que le queda de su límite, a la vista mientras trabaja (pr_procesos_vista, punto 3)
  const tiempo = tiempoDeRevision(r);
  const lleva = (x = tiempo) => (x ? tx('cabeza.lleva', { lleva: x.lleva, limite: x.limite }) : '');
  const cuandoCorta = tiempo ? tx('tiempo.lleva', { lleva: tiempo.lleva, limite: tiempo.limite, estado: tiempo.queda ? tx('tiempo.quedan', { queda: tiempo.queda }) : tx('tiempo.llego') }) : '';
  // «Detener ahora» (pr_procesos_vista, punto 3), o que ya cierra con lo hecho porque alguien lo pidió
  const parar = detenerAhora();
  // Con algo corriendo (una orden larga, un ayudante, un flujo), su registro no crece y no está parado: es avance, y se dice
  // qué corre (pr_procesos_vista, punto 2)
  if (e.estado === 'en_curso' && parar.cerrando) return `<span class="estado-revision en-curso" role="status" title="${esc(parar.cerrando)}">${tx('cabeza.cierra')}${lleva()}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></span>${cadena}`;
  if (e.estado === 'en_curso' && parada && d.enCurso) return `<span class="estado-revision en-curso" role="status" title="${esc(`${CORRE(d.enCurso, parada)}${cuandoCorta}`)}">${tx('cabeza.revisando')}${lleva()}${tx('cabeza.corre')}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span>${parar.boton}</span>${cadena}`;
  if (e.estado === 'en_curso' && parada) return `<span class="estado-revision en-curso" role="status" title="${esc(PARADA(parada) + cuandoCorta)}">${tx('cabeza.revisando')}${tx('cabeza.sinActividad')}${parar.boton}</span>${cadena}`;
  if (e.estado === 'en_curso') return `<span class="estado-revision en-curso" role="status"${cuandoCorta ? ` title="${esc(cuandoCorta.trim())}"` : ''}>${tx('cabeza.revisando')}${lleva()}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span>${parar.boton}</span>${cadena}`;
  // Lanzada y fallida no es «sin tomar»: se dice lo que pasó, y «¿Por qué?» abre su reporte
  const ocupado = directorOcupado();
  if (e.estado === 'sin_vigilia') return `<span class="estado-revision sin-vigilia" role="alert" title="${esc(e.texto)}">⚠ ${tx(r?.error ? 'cabeza.revisionNoTermino' : 'cabeza.revisionSinTomar')}<button type="button" class="enlace" data-revision="explicar">${tx('cabeza.porQue')}</button>${r?.error && !ocupado ? `<button type="button" class="enlace" title="${esc(tx('falla.retomarTitulo'))}" data-revision="pedir">${tx('cabeza.retomarla')}</button>` : ''}<button type="button" class="enlace" data-revision="cancelar">${tx('cabeza.cancelar')}</button></span>`;
  // Con un director vivo, solo una pedida sola (al entregar un proyecto) puede estar esperando: empieza cuando él termine
  if (e.estado === 'pedida') return `<span class="estado-revision pedida" role="status" title="${esc(e.texto)}">${tx('cabeza.revisionPedida', { hora: hora(r!.pedida) })}${automatica() && (ocupado || esperaCandado()) ? tx('cabeza.esperaTurno') : ''}<button type="button" class="enlace" data-revision="cancelar">${tx('cabeza.cancelar')}</button></span>${cadena}`;
  // Un director sigue vivo: en lugar del botón, qué corre y por qué no se puede pedir, sin pedir nada. La medición del
  // núcleo, además, lleva a su tarjeta (nota de voz del titular nmvviiwfqtit)
  if (ocupado && d.medicion?.enMarcha) return `${avisoMidiendo(ocupado.porque)}${cadena}`;
  if (ocupado) return `<span class="estado-revision ocupado" role="status" title="${esc(ocupado.porque)}">${esc(ocupado.corto)}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></span>${cadena}`;
  const pendientes = cifras().buzon + cifras().preguntas;
  // Cuando pedirla es lo único que te queda, el botón se resalta (nota nmvsxwjdxtit): el mismo pulso suave del Studio
  const unico = !!d.identidad.rol && pedirEsLoUnico(ctx(), d.identidad.rol, d.arranque);
  // Seguidas, solo con el Studio que llama al director: la sesión del director (/vigila) no las encadena
  const seguidas = automatica() && !(d.seguidas && !d.seguidas.paro)
    ? `<button type="button" class="boton-suave pedir-revision seguidas" data-revision="pedir" data-origen="seguidas" title="${esc(tx('seguidas.pedirTitulo'))}">${tx('hoy.seguidas')}</button>`
    : '';
  return `<button type="button" class="boton-suave pedir-revision${unico ? ' recomendado' : ''}" data-revision="pedir" title="${esc([unico ? tx('pedir.tituloUnico') : '', tx('pedir.titulo'), automatica() ? tx('pedir.tituloAutomatica') : vigilando() ? tx('pedir.tituloVigilando', { min: VIGILIA_MIN }) : tx('pedir.tituloManual'), r?.hecha ? tx('pedir.tituloUltima', { hora: hora(r.hecha) }) : ''].filter(Boolean).join(' '))}">${icono('revisar')} ${tx('cabeza.pedirRevision')}${pendientes ? ` <span class="cifra">${pendientes}</span>` : ''}</button>${conAyuda('revision')}${seguidas}${cadena}`;
}

/**
 * «¿Por qué?» de una revisión lanzada que no se cerró: «Qué pasó con la revisión», con el reporte que el servidor leyó
 * de su registro (revisor.ts › diagnosticarFalla): qué pasó, por qué, cuánto duró y gastó, lo último que alcanzó a hacer
 * y qué conviene. Y sus salidas: pedirla de nuevo, pedirla sin ultracode (si se le fue en flujos), decirle algo al
 * director antes de pedirla, cancelarla o cerrar (nota de voz del titular, 21 de octubre de 2026: si algo sale mal, se
 * avisa con su porqué, nunca en silencio). Una falla de antes del reporte muestra su texto, como antes.
 */
async function mostrarFalla() {
  const r = d.revision;
  if (!r?.error) return;
  const f = r.falla;
  // Sin ultracode: solo si la revisión usó flujos y el director los tiene hoy (ultracode encendido y su permiso)
  const sinUltracode = !!f?.usoFlujos?.flujos && !!d.ultracodeDirector && !!d.ultracode;
  const duro = f?.duracion == null ? '' : f.duracion < 1 ? tx('falla.duroMenos') : tx('falla.duro', { n: Math.round(f.duracion) });
  const gasto = f?.tokens ? tx('falla.gasto', { tokens: miles(f.tokens) }) : '';
  const usos = f?.usoFlujos ? [f.usoFlujos.flujos ? tx('falla.flujos', { n: f.usoFlujos.flujos }) : '', f.usoFlujos.ayudantes ? tx('falla.ayudantes', { n: f.usoFlujos.ayudantes }) : ''].filter(Boolean).join(` ${tx('falla.y')} `) : '';
  const cifrasFalla = [duro && gasto ? tx('falla.duroYGasto', { duro, gasto }) : duro ? `${duro}.` : gasto ? `${gasto[0].toUpperCase()}${gasto.slice(1)}.` : '', usos ? tx('falla.lanzo', { usos }) : ''].filter(Boolean).join(' ');
  const ultimos = f?.ultimos ?? [];
  // Con un director vivo no se ofrece pedirla de nuevo: se dice qué corre y vuelve cuando termine
  const ocupado = directorOcupado();
  // Con tu plan en su límite, retomarla la deja esperando a que se renueve (el lanzador no la lanza a fallar)
  const limitada = !!f?.renueva && Date.parse(f.renueva) > Date.now();
  const dlg = document.createElement('dialog');
  dlg.className = 'dialogo-director falla-revision';
  dlg.innerHTML = `<form method="dialog">
    <header class="cabeza-dialogo"><span class="etiqueta">${tx('falla.quePasoRevision')}</span><h2>${esc(f?.que ?? tx('cabeza.revisionNoTermino'))}</h2></header>
    <p class="alerta-p"><b>${tx('falla.porque')}</b> ${esc(f?.porque ?? r.error)}</p>
    ${cifrasFalla ? `<p class="como">${esc(cifrasFalla)}</p>` : ''}
    ${ultimos.length ? `<p class="etiqueta">${tx('falla.ultimo')}</p>
    <ol class="pasos-progreso">${ultimos.map((p) => `<li class="${p.tipo}">${p.tipo === 'dice' ? esc(recortar(p.texto, 240)) : `<span class="como">${esc(p.texto)}</span>`}${p.veces ? ` <span class="veces" title="${esc(tx('falla.veces', { n: p.veces }))}">${p.veces}</span>` : ''}</li>`).join('')}</ol>` : ''}
    ${f?.negados.length ? `<p class="como"><b>${tx('falla.negados')}</b> ${f.negados.map(esc).join('; ')}.</p>` : ''}
    <p><b>${tx('falla.conviene')}</b> ${esc(f?.sugerencia ?? tx('falla.pideDeNuevo'))}${f?.renueva ? ` ${esc(tx('falla.renueva', { cuando: momento(f.renueva) }))}` : ''}</p>
    ${f?.registro ? `<p class="como">${tx('falla.detalle', { registro: esc(f.registro) })}</p>` : ''}
    ${ocupado ? `<p class="como"><b>${esc(ocupado.corto)}.</b> ${esc(ocupado.porque)}</p>` : ''}
    <div class="botones">
      <button type="button"${ocupado ? ' class="primario"' : ''} data-cerrar>${tx('comun.cerrar')}</button>
      <button type="button" data-cancelar title="${esc(tx('falla.cancelarTitulo'))}">${tx('falla.cancelar')}</button>
      ${ocupado ? '' : `<button type="button" data-nota title="${esc(tx('falla.decirleTitulo'))}">${tx('falla.decirle')}</button>
      ${sinUltracode ? `<button type="button"${f?.accion === 'sin_ultracode' ? ' class="primario"' : ''} data-sin-ultracode title="${esc(tx('falla.sinUltracodeTitulo'))}">${tx('falla.sinUltracode')}</button>` : ''}
      <button type="button"${sinUltracode && f?.accion === 'sin_ultracode' ? '' : ' class="primario"'} data-pedir title="${esc(tx(limitada ? 'falla.retomarTituloLimite' : 'falla.retomarTitulo'))}">${tx(limitada ? 'falla.retomarRenueva' : 'cabeza.retomarla')}</button>`}
    </div>
  </form>`;
  document.body.append(dlg);
  const que = await new Promise<'cerrar' | 'cancelar' | 'nota' | 'sin_ultracode' | 'pedir'>((ok) => {
    let listo = false;
    const terminar = (x: 'cerrar' | 'cancelar' | 'nota' | 'sin_ultracode' | 'pedir') => {
      if (listo) return;
      listo = true;
      if (dlg.open) dlg.close();
      dlg.remove();
      ok(x);
    };
    dlg.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!b) return;
      if (b.dataset.pedir !== undefined) terminar('pedir');
      else if (b.dataset.sinUltracode !== undefined) terminar('sin_ultracode');
      else if (b.dataset.nota !== undefined) terminar('nota');
      else if (b.dataset.cancelar !== undefined) terminar('cancelar');
      else if (b.dataset.cerrar !== undefined) terminar('cerrar');
    });
    dlg.addEventListener('cancel', () => terminar('cerrar'));
    dlg.addEventListener('close', () => terminar('cerrar'));
    dlg.showModal();
    dlg.querySelector<HTMLButtonElement>('button.primario')?.focus();
  });
  if (que === 'pedir') return void (await pedirLaRevision(true, 'falla'));
  if (que === 'cancelar') return void (await pedirLaRevision(false));
  if (que === 'nota') {
    // Lo que el director debe saber para esta vez: va al Buzón como cualquier nota, y la revisión se pide con ella
    const dejo = await comentar({ tipo: 'general', seccion: 'La revisión que no terminó', fragmento: recortar(f?.que ?? r.error, 200) }, tx('falla.notaTitulo'));
    if (dejo) await pedirLaRevision(true, 'falla_nota');
    return;
  }
  if (que === 'sin_ultracode') {
    // La misma acción de «Modelo y consumo» (quitarle el permiso), sin su aviso: el de la revisión pedida basta
    const q = await fetch('/__estudio/director/ultracode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ director: false }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
    const x = q instanceof Error ? null : await q.json().catch(() => ({}));
    if (q instanceof Error || !q.ok) return avisar(tx('falla.noQuitoUltracode', { detalle: x?.error ? ` (${x.error})` : '' }));
    d.ultracodeDirector = x?.ultracodeDirector === true;
    await pedirLaRevision(true, 'falla_sin_ultracode');
  }
}

/** Lo urgente que no se cerró, mientras ninguna revisión respondió sus notas (después, ya no hay nada que retomar). */
function urgenciaFallida(): boolean {
  const u = d?.urgencia;
  return !!u && !!u.error && !u.hecha && u.notas.some((n) => !d.plan.respuestas?.[n]);
}

/**
 * «¿Por qué?» de una aclaración o de lo urgente que no se cerró (propuesta aceptada pr_retoma_automatica, punto 5): el
 * mismo reporte que el de una revisión, leído de su registro, y «Retomarla», que la pide otra vez y el director termina
 * solo lo que faltó. Con «Dejarla para la revisión» no se hace nada: la nota ya está en el Buzón.
 */
async function mostrarFallaAparte(tipo: 'aclaracion' | 'urgencia') {
  const x = tipo === 'aclaracion' ? d.aclaracion : d.urgencia;
  if (!x?.error) return;
  const f = x.falla;
  const duro = f?.duracion == null ? '' : f.duracion < 1 ? tx('falla.duroMenos') : tx('falla.duro', { n: Math.round(f.duracion) });
  const gasto = f?.tokens ? tx('falla.gasto', { tokens: miles(f.tokens) }) : '';
  const cifras = duro && gasto ? tx('falla.duroYGasto', { duro, gasto }) : duro ? `${duro}.` : gasto ? `${gasto[0].toUpperCase()}${gasto.slice(1)}.` : '';
  const ocupado = directorOcupado() ?? (revisando() ? { corto: tx('cabeza.revisando'), porque: tx('falla.unoALaVez') } : null);
  const dlg = document.createElement('dialog');
  dlg.className = 'dialogo-director falla-revision';
  dlg.innerHTML = `<form method="dialog">
    <header class="cabeza-dialogo"><span class="etiqueta">${tx(tipo === 'aclaracion' ? 'falla.quePasoAclaracion' : 'falla.quePasoUrgente')}</span><h2>${esc(f?.que ?? tx(tipo === 'aclaracion' ? 'falla.aclaracionNoTermino' : 'segundoPlano.urgenteNoTermino'))}</h2></header>
    <p class="alerta-p"><b>${tx('falla.porque')}</b> ${esc(f?.porque ?? x.error)}</p>
    ${cifras ? `<p class="como">${esc(cifras)}</p>` : ''}
    ${f?.ultimos.length ? `<p class="etiqueta">${tx('falla.ultimo')}</p>
    <ol class="pasos-progreso">${f.ultimos.map((p) => `<li class="${p.tipo}">${p.tipo === 'dice' ? esc(recortar(p.texto, 240)) : `<span class="como">${esc(p.texto)}</span>`}</li>`).join('')}</ol>` : ''}
    ${f?.negados.length ? `<p class="como"><b>${tx('falla.negados')}</b> ${f.negados.map(esc).join('; ')}.</p>` : ''}
    <p><b>${tx('falla.conviene')}</b> ${tx('falla.convieneAparte', { que: tx(tipo === 'aclaracion' ? 'falla.tuPedido' : 'falla.loUrgente') })}${f?.renueva ? ` ${esc(tx('falla.renueva', { cuando: momento(f.renueva) }))}` : ''}</p>
    ${f?.registro ? `<p class="como">${tx('falla.detalle', { registro: esc(f.registro) })}</p>` : ''}
    ${ocupado ? `<p class="como"><b>${esc(ocupado.corto)}.</b> ${esc(ocupado.porque)}</p>` : ''}
    <div class="botones">
      <button type="button"${ocupado ? ' class="primario"' : ''} data-cerrar>${tx('falla.dejarla')}</button>
      ${ocupado ? '' : `<button type="button" class="primario" data-retomar title="${esc(tx('falla.retomarAparteTitulo'))}">${tx('cabeza.retomarla')}</button>`}
    </div>
  </form>`;
  document.body.append(dlg);
  const retomar = await new Promise<boolean>((ok) => {
    let listo = false;
    const terminar = (si: boolean) => {
      if (listo) return;
      listo = true;
      if (dlg.open) dlg.close();
      dlg.remove();
      ok(si);
    };
    dlg.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (b?.dataset.retomar !== undefined) terminar(true);
      else if (b?.dataset.cerrar !== undefined) terminar(false);
    });
    dlg.addEventListener('cancel', () => terminar(false));
    dlg.addEventListener('close', () => terminar(false));
    dlg.showModal();
    dlg.querySelector<HTMLButtonElement>('button.primario')?.focus();
  });
  if (!retomar) return;
  const q = await fetch('/__estudio/director/retomar-aparte', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
  if (q instanceof Error || !q.ok) return avisar(q instanceof Error ? tx('servidor.noHabla') : (await q.json().catch(() => ({}))).error ?? tx('servidor.noSePudoRespondio', { estado: q.status }));
  avisar(tx(tipo === 'aclaracion' ? 'falla.retomaAclaracion' : 'falla.retomaUrgente'), true);
  await cargar();
}

document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-aparte]');
  if (!b || !d) return;
  void mostrarFallaAparte(b.dataset.aparte === 'aclaracion' ? 'aclaracion' : 'urgencia');
});

/**
 * Un paso de afuera que no sale no atrapa a nadie (nota del titular, 22 de octubre de 2026: la orden falló, la
 * comprobación no dejaba marcar el paso y no podía seguir con otras misiones). «No me salió» entrega la misión tal como
 * está, con lo que pasó, y la siguiente queda a la vista. El director hace lo que falte o la devuelve con el paso
 * corregido: la bandeja se la muestra como entregada sin terminar (`pasosSinMarcar`). `paso`: lo que vio el Studio.
 */
async function seguirConOtra(id: string, i: number, paso = '') {
  const m = d.plan.misiones.find((x) => x.id === id);
  if (!m || d.identidad.rol !== m.para) return;
  // Un aviso viejo (la misión ya se entregó, o el paso ya quedó hecho) no la vuelve a entregar ni pisa su nota
  if (!['pendiente', 'en_curso', 'rehacer'].includes(estadoMision(m, d.plan, d.estado)) || pasosHechos(id).includes(i)) return;
  if (aclarando(id, i)) return avisar(tx('seguir.reescribiendo'));
  const ok = await confirmar({
    titulo: tx('seguir.titulo'),
    texto: tx('seguir.texto', { paso: i + 1, comprobado: paso ? tx('seguir.comprobado') : '' }),
    boton: tx('seguir.boton'),
    cancelar: tx('seguir.cancelar'),
  });
  if (!ok) return;
  // Lo confirmado en el diálogo pudo cambiar mientras estaba abierto (una revisión, la comprobación que volvió)
  if (!['pendiente', 'en_curso', 'rehacer'].includes(estadoMision(m, d.plan, d.estado)) || pasosHechos(id).includes(i)) return;
  const nota = `No me salió el paso ${i + 1} y seguí con otra misión.${paso ? ` ${paso}` : ''}`;
  if (!(await accion({ tipo: 'entregar', mision: id, nota, sinTerminar: i }, tx('seguir.hecho')))) return;
  const mia = abiertasDe(m.para)[0];
  decir(mia ? tx('seguir.sigamos', { titulo: recortar(mia.titulo, 80) }) : tx('seguir.loVeoYo'), 'feliz');
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
  if (r instanceof Error) return void (pintar(), avisar(tx('servidor.noHabla')));
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return void (pintar(), avisar(j.error ?? tx('guardado.noSePudo')));
  d.estado = j.estado;
  d.aclaracion = j.aclaracion ?? null;
  if (j.revision !== undefined) d.revision = j.revision;
  pintar();
  avisar(tx(j.aclaracion ? 'aclarar.llamado' : 'aclarar.sinLlamar'), true);
  pintarSegundoPlano();
  vigilarTranscripciones([]);
}

/**
 * «Ya lo hice: compruébalo tú» (pr_verificar_paso): marca el paso, deja la nota en el Buzón y el Studio llama al director
 * solo para comprobarlo. Sin quién lo llame, el pedido espera en el Buzón la revisión que pida la persona.
 */
async function pedirComprobacion(mision: string, i: number) {
  if (esperaAlDirector()) return;
  comprobandoAqui = { mision, paso: i };
  if (!pasosHechos(mision).includes(i) && !(await marcarPaso(mision, i, true))) return void ((comprobandoAqui = null), pintar());
  pintar();
  const r = await fetch('/__estudio/director/comprobar-paso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mision, paso: i }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
  comprobandoAqui = null;
  if (r instanceof Error) return void (pintar(), avisar(tx('servidor.noHabla')));
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return void (pintar(), avisar(j.error ?? tx('guardado.noSePudo')));
  d.estado = j.estado;
  d.aclaracion = j.aclaracion ?? null;
  pintar();
  avisar(tx(j.aclaracion ? 'comprobar.llamado' : 'comprobar.sinLlamar'), true);
  pintarSegundoPlano();
}

/**
 * `origen`: el botón que la pide (proyectos.ts › ORIGENES_REVISION): el servidor no acepta una revisión sin él, porque
 * solo la persona la pide (regla dura del titular, 23 de octubre de 2026). `callada`: sin el aviso de que quedó pedida.
 * ¿Quedó pedida?
 */
/**
 * Si al pedir la revisión el límite de cada cinco horas de tu plan va en el 90 % o más (lo último que informó Claude Code,
 * y no se ha renovado), dice cuánto llevas y cuándo se renueva, con «Pedirla de todos modos» y «Esperar» (tu elección del
 * 26 de octubre de 2026, en «Cada proceso, a la vista»). true: se pide.
 */
async function seguirCercaDelLimite(): Promise<boolean> {
  const v = limiteCasiLleno((d.consumo ?? []).find((x) => x.limites?.cincoHoras)?.limites?.cincoHoras);
  if (!v) return true;
  const si = await pedir({
    titulo: tx('limite.titulo'),
    ayuda: tx('limite.ayuda', { uso: v.uso.toLocaleString(lenguaje()), fecha: fecha(v.renueva!), hora: hora(v.renueva!) }),
    campos: [],
    boton: tx('limite.pedirDeTodosModos'),
    cancelar: tx('limite.esperar'),
    vacioVale: true,
  });
  return !!si;
}

async function pedirLaRevision(pedir: boolean, origen?: 'cabecera' | 'falla' | 'falla_nota' | 'falla_sin_ultracode' | 'meta' | 'urgente' | 'recomendada' | 'permisos' | 'seguidas' | 'hoy', callada = false): Promise<boolean> {
  // Ningún camino pide una segunda revisión mientras un director vive: se dice qué corre y por qué
  const ocupado = pedir ? directorOcupado() : null;
  if (ocupado || (pedir && revisando())) {
    avisar(ocupado ? `${ocupado.corto}. ${ocupado.porque}` : tx('aviso.yaRevisando'));
    return false;
  }
  // Lo que quedó sin enviar no le llega al director: primero se muestra (pd_dialogo_unico)
  if (pedir && !callada && !(await antesDeLosBorradores())) return false;
  // Con el límite de cada cinco horas casi lleno, primero cuánto queda y cuándo se renueva (pr_procesos_vista, punto 4)
  if (pedir && !(await seguirCercaDelLimite())) return false;
  const r = await fetch('/__estudio/director/revision', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pedir, ...(pedir ? { origen } : {}) }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
  if (r instanceof Error || !r.ok) {
    // Si el servidor dice por qué no, se muestra su mensaje tal cual
    avisar(r instanceof Error ? tx('servidor.noHabla') : (await r.json().catch(() => ({}))).error ?? tx('servidor.noSePudoRespondio', { estado: r.status }));
    return false;
  }
  // Solo se promete lo que es cierto: si la sesión del director no está mirando, se dice
  if (!callada || !(automatica() || vigilando())) avisar(!pedir ? tx('pedir.cancelada')
    : automatica() && origen === 'seguidas' ? tx('pedir.seguidas')
    : automatica() ? tx('pedir.automatica')
    : vigilando() ? tx('pedir.vigilando', { min: VIGILIA_MIN })
    : tx('pedir.sinNadie'), pedir ? automatica() || vigilando() : true);
  await cargar();
  return true;
}

/** La barra lateral: las secciones en grupos, cada una con su cifra. */
function pintarNavegacion() {
  const c = cifras();
  const insignia: Partial<Record<Vista, { n: number | string; accion?: boolean; titulo: string }>> = {};
  if (c.buzon) insignia.buzon = { n: c.buzon, titulo: tx('nav.esperandoRespuesta') };
  if (c.preguntas) insignia.preguntas = { n: c.preguntas, titulo: tx('nav.preguntasEsperando', { n: c.preguntas }) };
  if (c.porLeer) insignia.documentos = { n: c.porLeer, accion: true, titulo: tx('nav.porLeer') };
  if (c.porDecidir) insignia.propuestas = { n: c.porDecidir, accion: titular(), titulo: tx('nav.porDecidir') };
  if (['conectar', 'contar', 'objetivo'].includes(d.arranque)) insignia.proyecto = { n: '!', accion: true, titulo: tx('nav.faltaAlgo') };
  const boton = (v: Vista) => {
    const i = insignia[v];
    const nombre = v === 'diagnostico' && esNuevo() ? tx('nav.planteamiento') : NOMBRE_VISTA[v];
    return `<button type="button" class="item-nav${vista === v ? ' sel' : ''}" data-vista="${v}"${vista === v ? ' aria-current="page"' : ''}>${icono(ICONO_VISTA[v])}<span>${nombre}</span>${i ? `<span class="cifra${i.accion ? ' accion' : ''}" title="${esc(`${i.n} ${i.titulo}`)}">${i.n}</span>` : ''}</button>`;
  };
  $('navegacion').innerHTML = gruposNav()
    .map((g) => {
      if (!g.plegable) return `<div class="grupo-nav">${g.titulo ? `<p class="titulo-grupo">${g.titulo}</p>` : ''}${g.vistas.map(boton).join('')}</div>`;
      // Plegado, salvo que lo abras (se recuerda) o estés en una de sus secciones; si algo de adentro pide algo, se marca
      const abierto = g.vistas.includes(vista as Vista) || localStorage.getItem(CLAVE_SEGUIMIENTO) === '1';
      const pide = g.vistas.some((v) => insignia[v]?.accion);
      return `<details class="grupo-nav plegable"${abierto ? ' open' : ''}><summary class="titulo-grupo">${g.titulo}${pide ? `<span class="punto-pide" title="${esc(tx('nav.pideAlgo'))}"></span>` : ''}</summary>${g.vistas.map(boton).join('')}</details>`;
    })
    .join('');
  if (!lineaCongelada) pintarLineaViva(ramasEnLinea(), document, opcionesDeLinea());
  const lupa = $('lupa-linea');
  lupa.title = tx('linea.lupa');
  lupa.setAttribute('aria-label', tx('linea.lupa'));
  // La línea de versión nueva, al pie, junto a tu nombre (avisoVersion.ts)
  const lineaVersion = $('linea-version');
  lineaVersion.hidden = !d.avisoVersion;
  lineaVersion.innerHTML = d.avisoVersion ? `<a href="${esc(d.avisoVersion.enlace)}" target="_blank" rel="noopener" title="${esc(tx('version.notas'))}">${esc(tx('version.nueva', { version: d.avisoVersion.version }))} <span aria-hidden="true">↗</span></a><button type="button" class="enlace" data-cerrar-version title="${esc(tx('version.cerrar'))}" aria-label="${esc(tx('version.cerrar'))}">✕</button>` : '';
  // El inicio, en la marca de arriba: se marca cuando estás en «Hoy» (no tiene cifra: lo que espera se cuenta en las otras secciones)
  const inicio = $('ir-inicio');
  inicio.toggleAttribute('disabled', false);
  if (vista === 'misiones' || vista === 'ruta') inicio.setAttribute('aria-current', 'page');
  else inicio.removeAttribute('aria-current');
  // «Modelo y consumo», en el pie: no es de un proyecto, pero se marca igual cuando estás en ella
  const pie = $('ir-modelo');
  pie.innerHTML = `${icono(ICONO_VISTA.modelo)}<span>${NOMBRE_VISTA.modelo}</span>`;
  pie.classList.toggle('sel', vista === 'modelo');
  if (vista === 'modelo') pie.setAttribute('aria-current', 'page');
  else pie.removeAttribute('aria-current');
  avisarSeccionesNuevas();
}

/** El arranque, paso a paso (startSteps.ts): con lo que pinta, de los datos del proyecto. */
function arranqueHTML() {
  return arranqueDe({
    arranque: d.arranque,
    nuevo: esNuevo(),
    conectado: !!d.repositorio.info || !!d.plan.diagnostico.fecha,
    diagnosticado: !!d.plan.diagnostico.fecha,
    conMeta: !!d.proyecto.objetivo,
    conRuta: d.plan.fases.length > 1,
    botonIr: (dest) => botonIr(dest),
  });
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
  const texto = t === '' ? `<p class="transcripcion pendiente">${tx('buzon.sinVoz')}</p>`
    : t
    ? `<p class="transcripcion">${icono('microfono', 'icono icono-t')}<span>«${esc(t)}»</span></p>`
    // Falló y espera su próximo intento: está en cola, no perdido (nota de voz del titular nmw159ihdtit)
    : d.enCola?.[audio] ? `<p class="transcripcion pendiente">${tx('buzon.enColaReintento', { hora: hora(d.enCola[audio]) })}</p>`
    : d.sinTranscribir?.includes(audio) ? `<p class="transcripcion pendiente">${tx('buzon.noTranscribio')}</p>`
    : `<p class="transcripcion procesando" role="status">${tx('buzon.transcribiendo')}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></p>`;
  return `<div class="nota-voz">${texto}${reproductor}</div>`;
}

// Un audio que ya no existe (el Studio los borra apenas tienen su texto) no deja un reproductor roto: si falla al
// cargar, se quita, y la nota queda con su texto; sin texto, lo dice (el error de un <audio> no sube: se escucha en la
// captura)
document.addEventListener('error', (e) => {
  const a = e.target;
  if (!(a instanceof HTMLAudioElement) || !a.closest('.nota-voz')) return;
  const caja = a.closest('.nota-voz')!;
  a.remove();
  if (!caja.querySelector('.transcripcion:not(.procesando)')) caja.insertAdjacentHTML('beforeend', `<p class="transcripcion pendiente">${tx('buzon.audioNoEsta')}</p>`);
}, true);

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
function listaPasos(m: Mision, deAhora = false) {
  const hechos = new Set(pasosHechos(m.id));
  const sigue = m.pasos.findIndex((_, i) => !hechos.has(i));
  if (!m.pasos.length) return '';
  return `${sigue >= 0 ? listaDePasos(m, true, [sigue], deAhora ? sigue : -1) :`<p class="pasos-listos">${tx('paso.todosHechos')}</p>`}
    ${hechos.size ? `<details class="pasos-completados"${plegable(`pasos|${m.id}|${hechos.size}`)}><summary>${tx('paso.completado')} <span class="cifra">${hechos.size}</span></summary>${listaDePasos(m, true, [...hechos].sort((a, b) => a - b))}</details>` : ''}`;
}

/** `central`: el paso cuyo botón «ir» es también lo que hace el botón central del ratón (el de ahora de tu misión de ahora), o -1. */
function listaDePasos(m: Mision, conCasillas: boolean, indices: number[], central = -1) {
  const hechos = new Set(pasosHechos(m.id));
  // El botón de un paso que lleva a su propia misión no se dibuja (`destinoDelPaso` con la misión): ya estás en ella. Su
  // texto va de corrido: el botón, su detalle con la misma letra y el ✉ al final (stepText.ts, nota nmvvvazd4tit)
  const recien = (i: number) => pasoRecien?.id === m.id && pasoRecien.i === i && pasoRecien.hasta > Date.now();
  const rotulo = (i: number) => (conCasillas && m.pasos.length > 1 ? `<small class="rotulo-paso">${esc(rotuloDelPaso(i, m.pasos.length))}</small>` : '');
  return `<ol class="pasos">${indices.map((i) => [m.pasos[i], i] as const).map(([p, i]) => `<li value="${i + 1}" class="${hechos.has(i) ? 'hecho' : ''}${conCasillas ? ' con-marca' : ''}${recien(i) ? ' paso-recien' : ''}">${rotulo(i)}${textoDelPaso({
    texto: typeof p === 'string' ? p : p.texto,
    ir: typeof p !== 'string' && destinoDelPaso(p, m) ? irDelPaso(m, i, destinoDelPaso(p, m)!, conCasillas && !hechos.has(i), p.esperar, i === central) : '',
    detalle: typeof p !== 'string' ? p.detalle : undefined,
    desmarcar: conCasillas && hechos.has(i) && d.identidad.rol === m.para ? `<button type="button" class="enlace desmarcar-paso" data-desmarcar-paso="${esc(m.id)}|${i}" title="${esc(tx('paso.desmarcarTitulo'))}">${tx('paso.desmarcar')}</button>` : '',
    comentar: conCasillas ? `<button type="button" class="comentar-paso" data-comentar="mision|${esc(m.id)}|${seccionPaso(i)}" title="${esc(tx('paso.comentarTitulo'))}">✉</button>` : '',
  })}${typeof p !== 'string' && p.terminal ? ordenPaso(m, i, p, conCasillas && !hechos.has(i)) : ''}${typeof p !== 'string' && p.copiar ? textoParaCopiar(p.copiar) : ''}${typeof p !== 'string' && p.opciones?.length ? opcionesPaso(m, i, p.opciones, hechos.has(i), p.esperar, destinoDelPaso(p, m), p.varias === true) : ''}${typeof p !== 'string' ? quienLoHace(m, i, p, hechos.has(i)) : ''}${conCasillas ? `<div class="pie-paso">${comprobarPaso(m, i, p, hechos.has(i))}${hechos.has(i) ? '' : aclararPaso(m, i)}${marcaPaso(m, i, p, hechos.has(i))}</div>` : ''}</li>`).join('')}</ol>`;
}

/**
 * Cómo se marca un paso: «Listo, ya lo hice», abajo a la derecha del paso de ahora (la estrella no se entendía como
 * «terminé», pedido del titular). Un paso con orden de terminal ya trae su «Ya lo hice» junto a la orden, y uno que pide
 * elegir se marca al elegir: ahí no hay otro botón. La casilla queda siempre, escondida: la usan «Ya lo hice» y «Desmarcar».
 */
function marcaPaso(m: Mision, i: number, p: Paso, hecho: boolean): string {
  const o = typeof p === 'string' ? null : p;
  const casilla = (oculta: boolean) => `<input type="checkbox" ${oculta ? 'hidden' : 'class="sr-only"'} data-paso="${esc(m.id)}|${i}"${hecho ? ' checked' : ''} aria-label="${tx('paso.hechoAria', { n: i + 1 })}" />`;
  if (hecho || d.identidad.rol !== m.para || o?.terminal || o?.opciones?.length) return casilla(true);
  const titulo = esc(tx(o?.hecho ? 'paso.listoTituloSolo' : o?.comprobar ? 'paso.listoTituloComprueba' : 'paso.listoTitulo'));
  return `<label class="listo-paso" title="${titulo}">${casilla(false)}${icono('check')} ${tx('paso.listo')}</label>`;
}

/**
 * Un paso que pide elegir (sí o no, una de pocas): las opciones como botones, en el paso mismo. Un clic deja la
 * elección en el Buzón, firmada, y el paso se marca solo; para otra respuesta está el ✉ del paso. Si ya respondió con
 * el ✉, va también «Ya te lo dije en mi comentario» (`YA_LO_DIJE`), que marca el paso sin elegir una opción que no le
 * calza (pedido del titular). Si el paso pide esperar (`esperar`: lo que tarda en verse un cambio), las opciones quedan
 * bloqueadas con su cuenta regresiva, para no responder antes de tiempo; la cuenta empieza la primera vez que el paso se
 * ve en este navegador. Con `varias`, cada opción se marca y se desmarca, y «Listo» entrega las marcadas juntas
 * (marcadasVarias las guarda mientras el Studio repinta).
 */
function opcionesPaso(m: Mision, i: number, opciones: string[], hecho: boolean, esperar?: number, ir?: Destino, varias = false): string {
  // Solo un paso marcado muestra lo que elegiste: sin marcar, vuelven sus opciones (eleccionALaVista)
  const elegida = eleccionALaVista(d.estado.notas, m.id, i, m.para, hecho)?.sobre.eleccion;
  if (elegida === YA_LO_DIJE) return `<p class="eleccion-paso">${icono('check')} ${tx('paso.respondidoComentario')}</p>`;
  if (elegida === YA_LO_COMENTE) return `<p class="eleccion-paso">${icono('check')} ${tx('paso.respondidoAntes')}</p>`;
  if (elegida) return `<p class="eleccion-paso">${icono('check')} ${tx('paso.elegiste')} <b>${esc(elegida)}</b></p>`;
  if (hecho || d.identidad.rol !== m.para) return '';
  const antes = eleccionDe(d.estado.notas, m.id, i, m.para)?.sobre.eleccion;
  const pista = antes && !remiteALoDicho(antes) ? `<p class="como">${tx('paso.vezAnterior', { antes: esc(antes) })}</p>` : '';
  return pista + opcionesSinElegir(m, i, opciones, esperar, ir, varias);
}

function opcionesSinElegir(m: Mision, i: number, opciones: string[], esperar?: number, ir?: Destino, varias = false): string {
  // Lo que ya contó con el ✉ del paso también lo responde: un botón más, discreto, al final de las opciones
  const yaLoDijo = comentarioDe(d.estado.notas, m.id, i, m.para);
  // Y en todo paso con opciones, «Ya lo comenté antes»: lo marca sin elegir ni comentar, porque la instrucción ya va en
  // una nota anterior (nota de voz del titular nmw1l6eo6tit); el director la busca en sus notas y la sigue
  const yaLoComente = (atributos: string) => `<button type="button" class="boton-opcion ya-lo-dije" ${atributos.replace('data-ya-lo-dije', 'data-ya-lo-comente')} title="${esc(tx('paso.yaLoComenteTitulo'))}">${esc(tx('paso.yaLoComente'))}</button>`;
  // Antes de visitar el enlace, «Ya te lo dije» y «Ya lo comenté antes» ya se pueden usar (avisoMision.ts › opcionesHabilitadas): `atributosComente` es lo que lleva el otro
  const yaLoDije = (atributos: string, atributosComente = atributos) => (yaLoDijo ? `<button type="button" class="boton-opcion ya-lo-dije" ${atributos} title="${esc(tx('paso.yaLoDijeTitulo'))}">${esc(tx('paso.yaLoDije'))}</button>` : '') + yaLoComente(atributosComente);
  // Si el paso manda a ver algo, primero se ve: las opciones se abren cuando se abre su botón (y, si el paso pide
  // esperar, la espera bloquea ese botón: al abrirlo ya pasó, así que las opciones no esperan otra vez)
  // Mientras su botón espera, nada de esto se ve: aparece con él, al terminar la cuenta
  const clave = `${m.id}|${i}`;
  const libre = opcionesHabilitadas({ requiereVisita: !!ir, visitado: !ir || pasoAbierto(m.id, i), comento: !!yaLoDijo });
  if (!libre.opciones) {
    const esperando = !!esperar && inicioEspera(clave) + esperar * 1000 > Date.now();
    return `<div class="tras-espera" data-tras-espera="${esc(clave)}"${esperando ? ' hidden' : ''}><p class="espera-paso por-abrir">${icono('info')} <span>${tx('paso.primeroOprime', { etiqueta: esc(ir?.etiqueta ?? '') })}</span></p>
      <div class="opciones-paso en-espera" role="group" aria-label="${esc(tx('paso.eligeAlAbrir'))}">${opciones.map((o) => `<button type="button" class="boton-opcion" disabled>${esc(o)}</button>`).join('')}${yaLoDije(libre.yaLoDijeHabilitado ? `data-ya-lo-dije="${esc(m.id)}|${i}"` : 'disabled', libre.yaLoComenteHabilitado ? `data-ya-lo-dije="${esc(m.id)}|${i}"` : 'disabled')}</div></div>`;
  }
  const hasta = esperar && !ir ? inicioEspera(clave) + esperar * 1000 : 0;
  const bloqueadas = hasta > Date.now();
  const cuenta = bloqueadas ? cuentaGrande(hasta, clave, tx('paso.alTerminarOpciones')) : '';
  if (varias) {
    const marcadas = marcadasVarias.get(clave) ?? new Set<number>();
    return `${cuenta}<div class="opciones-paso varias" role="group" aria-label="${esc(tx('paso.eligeVarias'))}"${bloqueadas ? ` data-espera="${esc(clave)}" hidden` : ''}><p class="pista-varias">${tx('paso.pistaVarias')}</p>${opciones.map((o, k) => `<button type="button" class="boton-opcion" data-marcar-opcion="${esc(m.id)}|${i}|${k}" aria-pressed="${marcadas.has(k)}">${icono('check')}${esc(o)}</button>`).join('')}${botonListoVarias(clave, marcadas.size)}${yaLoDije(`data-ya-lo-dije="${esc(m.id)}|${i}"`)}</div>`;
  }
  return `${cuenta}<div class="opciones-paso" role="group" aria-label="${esc(tx('paso.eligeUna'))}"${bloqueadas ? ` data-espera="${esc(clave)}" hidden` : ''}>${opciones.map((o, k) => `<button type="button" class="boton-opcion" data-elegir="${esc(m.id)}|${i}|${k}">${esc(o)}</button>`).join('')}${yaLoDije(`data-ya-lo-dije="${esc(m.id)}|${i}"`)}</div>`;
}

/** En un paso con `varias`, las opciones marcadas y aún sin entregar, por `<misión>|<paso>`: sobreviven a cada repintado. */
const marcadasVarias = new Map<string, Set<number>>();

const botonListoVarias = (clave: string, cuantas: number) =>
  `<button type="button" class="boton-opcion listo-varias" data-elegir-varias="${esc(clave)}"${cuantas ? '' : ' disabled'}>${cuantas > 1 ? tx('paso.listoElijoEstas', { n: cuantas }) : tx(cuantas ? 'paso.listoElijoEsta' : 'paso.listoVarias')}</button>`;

/** Marca o desmarca una opción de un paso con `varias`; una opción sola («Ninguna por ahora») no va con las demás. */
function marcarOpcion(clave: string, k: number, opciones: string[]) {
  const marcadas = marcadasVarias.get(clave) ?? new Set<number>();
  if (marcadas.has(k)) marcadas.delete(k);
  else {
    for (const j of [...marcadas]) if (opcionSola(opciones[j]) || opcionSola(opciones[k])) marcadas.delete(j);
    marcadas.add(k);
  }
  marcadasVarias.set(clave, marcadas);
  // Sin repintar el Studio: solo el grupo de ese paso
  for (const b of document.querySelectorAll<HTMLButtonElement>(`[data-marcar-opcion^="${CSS.escape(clave)}|"]`)) b.setAttribute('aria-pressed', String(marcadas.has(Number(b.dataset.marcarOpcion!.split('|')[2]))));
  for (const b of document.querySelectorAll<HTMLButtonElement>(`[data-elegir-varias="${CSS.escape(clave)}"]`)) b.outerHTML = botonListoVarias(clave, marcadas.size);
}

/**
 * Deja en el Buzón lo elegido en un paso (una opción, o las de un paso con `varias` juntas) y el paso se marca solo. Si
 * lo elegido promete contar más («te cuento con ✉»), abre ahí mismo el comentario: la elección y lo que cuentas van
 * juntos en una sola nota, guardada con el ✉ abierto (si el servidor falla, nada se pierde: pd_nada_se_corta). Si cierras
 * sin enviar, no se elige nada y el paso sigue abierto. Dice si quedó guardado.
 */
/** Si este paso es el último por hacer de su misión: su aviso es el de misión completada, no el del paso (avisoMision.ts › completaLaMision). */
const ultimoPaso = (id: string, i: number) => completaLaMision(d.plan.misiones.find((x) => x.id === id)?.pasos.length ?? 0, pasosHechos(id), i);

async function elegirEnPaso(b: HTMLButtonElement, id: string, i: number, eleccion: string, conDetalle: boolean): Promise<boolean> {
  const sobre = { tipo: 'mision' as const, id, seccion: seccionPaso(i), eleccion };
  const ultimo = ultimoPaso(id, i);
  if (conDetalle) {
    const detalle = await pedir({
      titulo: tx('paso.eligesCuentale', { eleccion: eleccion.replace(/\s*\([^)]*\)\s*$/, '') }),
      ayuda: tx('paso.eligesAyuda'),
      // El mismo diálogo que lo demás, con su tipo: marcado como comentario sobre el paso, y se cambia de un toque (nota nmvsxgf6ttit)
      campos: [campoTipo('respuesta'), { id: 'texto', etiqueta: tx('paso.quePaso'), tipo: 'area' }],
      boton: tx('paso.enviarDirector'),
      audio: true,
      adjuntos: true,
      guardar: (r) => accion({ tipo: 'comentar', sobre, texto: r.texto ?? '', audio: r.audio, ...(r.tipoNota ? { tipoNota: r.tipoNota } : {}), ...(r.adjuntos?.length ? { adjuntos: r.adjuntos } : {}) }, ultimo ? '' : tx('paso.eligesYContaste', { eleccion: recortar(eleccion, 40) })),
    });
    if (detalle) sonar('paso');
    return !!detalle;
  }
  b.setAttribute('disabled', '');
  const ok = await accion({ tipo: 'comentar', sobre }, ultimo ? '' : tx('paso.eligesAviso', { eleccion: recortar(eleccion, 40) }));
  if (!ok) b.removeAttribute('disabled');
  else sonar('paso');
  return !!ok;
}

/**
 * La cuenta de un paso que pide esperar, grande y a la vista: dice cuánto falta, por qué y qué aparece al terminar.
 * Lo que espera no se muestra deshabilitado: no se muestra, y aparece resaltado cuando la cuenta llega a cero.
 */
function cuentaGrande(hasta: number, clave: string, alTerminar: string): string {
  return `<div class="espera-paso grande" role="timer" aria-live="off" data-hasta="${hasta}" data-libera="${esc(clave)}">${icono('reloj')}<b class="cifra">${mmss(hasta - Date.now())}</b><span>${tx('paso.espera')} ${esc(alTerminar)}</span></div>`;
}

/** Cuándo empezó a contar la espera de un paso en este navegador (la primera vez que se vio). */
function inicioEspera(clave: string): number {
  const k = `estudio.espera.${clave}`;
  const guardado = Number(localStorage.getItem(k));
  if (guardado > 0) return guardado;
  const ahora = Date.now();
  localStorage.setItem(k, String(ahora));
  return ahora;
}

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// La cuenta regresiva de los pasos que piden esperar: se actualiza en su sitio, sin repintar lo que estás leyendo, y al
// llegar a cero sale y aparece, resaltado, lo que esperaba: el botón que lleva a verlo (con lo que viene tras él) o, si
// el paso no tiene botón, las opciones
setInterval(() => {
  for (const p of document.querySelectorAll<HTMLElement>('.espera-paso[data-hasta]')) {
    const falta = Number(p.dataset.hasta) - Date.now();
    if (falta > 0) {
      p.querySelector('.cifra')!.textContent = mmss(falta);
      continue;
    }
    const clave = CSS.escape(p.dataset.libera ?? '');
    const boton = p.parentElement?.querySelector<HTMLElement>(`[data-espera="${clave}"]`)?.tagName === 'BUTTON';
    p.parentElement?.querySelectorAll<HTMLElement>(`[data-espera="${clave}"], [data-tras-espera="${clave}"]`).forEach((x) => {
      x.hidden = false;
      if (x.dataset.espera) x.classList.add('recien-libre');
    });
    p.outerHTML = `<p class="espera-paso lista" role="status">${icono('check')} <span>${tx(boton ? 'paso.yaPuedesAbrir' : 'paso.yaPuedesResponder')}</span></p>`;
  }
}, 1000);

/**
 * La orden de terminal de un paso: a la vista, con «Copiar» y, para quien tiene la misión, «Abrir la terminal con esta
 * orden», que abre una ventana nueva y la corre ahí (no hay que buscar la terminal ni dónde pegarla). Mientras el paso
 * no está hecho, «Ya lo hice» lo marca como la estrella: si el paso tiene `comprobar`, el Studio lo comprueba antes.
 */
function ordenPaso(m: Mision, i: number, p: Exclude<Paso, string>, pendiente: boolean): string {
  const orden = p.terminal ?? '';
  const mia = d.identidad.rol === m.para;
  const yaHice = mia && pendiente
    ? `<button type="button" class="boton-ya-hice" data-ya-hice="${esc(m.id)}|${i}" title="${esc(tx(p.comprobar ? 'paso.yaLoHiceTituloComprueba' : 'paso.yaLoHiceTitulo'))}">${icono('check')} ${tx('paso.yaLoHice')}</button>`
      // Mientras el director reescribe este paso («No lo entiendo»), se espera su explicación
      + (aclarando(m.id, i) ? '' : `<button type="button" class="boton-suave" data-no-salio="${esc(m.id)}|${i}" title="${esc(tx('paso.noMeSalioTitulo'))}">${esc(tx('paso.noMeSalio'))}</button>`)
    : '';
  return `<div class="orden-paso"><code>${esc(orden)}</code><div class="acciones-orden">${mia ? `<button type="button" class="abrir-terminal" data-terminal="${esc(m.id)}|${i}" title="${esc(tx('paso.abrirTerminalTitulo'))}">${tx('paso.abrirTerminal')}</button>` : ''}<button type="button" class="boton-suave" data-copiar-orden="${esc(orden)}" title="${esc(tx('paso.copiarTitulo'))}">${tx('paso.copiar')}</button>${yaHice}</div></div>`;
}

/**
 * El texto que la persona pega en otra parte (`copiar`): entero, a la vista y con «Copiar», en el paso mismo, para que
 * no dependa de lo que imprimió una orden en una ventana ya cerrada (nota de voz del titular nmvrikd6ptit).
 */
function textoParaCopiar(texto: string): string {
  return `<div class="orden-paso texto-copiar"><blockquote>${esc(texto)}</blockquote><div class="acciones-orden"><button type="button" class="boton-suave" data-copiar-texto="${esc(texto)}" title="${esc(tx('paso.copiarTextoTitulo'))}">${tx('paso.copiarTexto')}</button></div></div>`;
}

/**
 * Quién puede hacer el paso. Si el director puede hacerlo con tu permiso (`hazlo`), el botón «Hazlo tú»: explica qué
 * hará y, con tu segundo clic, se lo encarga (lo hace en su revisión siguiente). Si solo puedes tú (`soloTu`), lo dice,
 * con la razón, para que no lo esperes de él.
 */
function quienLoHace(m: Mision, i: number, p: Exclude<Paso, string>, hecho: boolean): string {
  if (p.soloTu) return `<p class="solo-tu">${icono('info')} <span><b>${tx('paso.soloTu')}</b> ${esc(p.soloTu)}</span></p>`;
  if (!p.hazlo) return '';
  const encargo = encargoDe(d.estado.notas, m.id, i, m.para);
  if (encargo) {
    const respuesta = d.plan.respuestas?.[encargo.id];
    return respuesta ? `<p class="aclaracion-paso"><b>${tx('mision.elDirector')}</b> ${esc(respuesta.texto)}</p>` : `<p class="eleccion-paso">${icono('check')} ${tx('paso.encargado')}</p>`;
  }
  if (hecho || d.identidad.rol !== m.para) return '';
  return `<button type="button" class="hazlo-paso" data-hazlo="${esc(m.id)}|${i}" title="${esc(tx('paso.hazloTitulo'))}">${tx('paso.hazlo')}</button>`;
}

/** El paso que se acaba de pedir aclarar, mientras el servidor responde: el aviso de espera sale con el clic, no después. */
let aclarandoAqui: { mision: string; paso: number } | null = null;
/** ¿El director está aclarando ahora este paso (lo pidió «No lo entiendo»)? */
const aclarando = (mision: string, i: number) => (aclarandoAqui?.mision === mision && aclarandoAqui.paso === i)
  || (!!d.aclaracion && !d.aclaracion.comprobar && !d.aclaracion.hecha && !d.aclaracion.error && d.aclaracion.mision === mision && d.aclaracion.paso === i);

/**
 * «No lo entiendo, explícamelo mejor», en el paso de ahora: un clic y el director lo reescribe con más detalle, al
 * instante y sin el resto de la revisión. Debajo, lo que respondió la última vez; si se vuelve a pedir, va más a fondo.
 */
function aclararPaso(m: Mision, i: number): string {
  if (d.identidad.rol !== m.para) return '';
  const previas = aclaracionesDe(d.estado.notas, m.id, i);
  const ultima = previas.at(-1);
  const respuesta = ultima ? d.plan.respuestas?.[ultima.id] : undefined;
  const dijo = respuesta ? `<p class="aclaracion-paso"><b>${tx('mision.elDirector')}</b> ${esc(respuesta.texto)}</p>` : '';
  if (aclarando(m.id, i)) return `${dijo}<p class="aclarando-paso" role="status">${tx('paso.reescribiendo')}${seguimientoAparte(d.aclaracion?.mision === m.id && d.aclaracion.paso === i ? d.aclaracion.lanzada : undefined, MIN_ACLARAR)}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></p>`;
  // La aclaración de este paso no se cerró: su reporte y «Retomarla» (pr_retoma_automatica, punto 5)
  const fallida = !!ultima && !respuesta && d.aclaracion?.nota === ultima.id && !!d.aclaracion.error;
  if (ultima && !respuesta) return `<p class="aclarando-paso" role="status">${fallida ? `${tx('paso.aclaracionNoTermino')}<button type="button" class="enlace" data-aparte="aclaracion">${tx('cabeza.porQue')}</button>` : tx('paso.aclararPedido')}</p>`;
  return `${dijo}<button type="button" class="aclarar-paso" data-aclarar="${esc(m.id)}|${i}" title="${esc(tx('paso.aclararTitulo'))}">${esc(tx(previas.length ? 'paso.aclararMas' : 'paso.aclarar'))}</button>`;
}

/** El paso que se acaba de pedir comprobar, mientras el servidor responde. */
let comprobandoAqui: { mision: string; paso: number } | null = null;
/** ¿El director está comprobando ahora este paso (lo pidió «Ya lo hice: compruébalo tú»)? */
const comprobando = (mision: string, i: number) => (comprobandoAqui?.mision === mision && comprobandoAqui.paso === i)
  || (!!d.aclaracion?.comprobar && !d.aclaracion.hecha && !d.aclaracion.error && d.aclaracion.mision === mision && d.aclaracion.paso === i);

/**
 * «Ya lo hice: compruébalo tú» (propuesta aceptada pr_verificar_paso), en un paso que se hace fuera del Studio y que
 * nada comprueba solo: lo marca y el director lo comprueba al instante, aparte de la revisión, con la evidencia que pueda
 * leer. Mientras tanto, la persona sigue con lo suyo; debajo del paso queda lo que encontró y, si no se cumplió, qué hacer.
 */
function comprobarPaso(m: Mision, i: number, p: Paso, hecho: boolean): string {
  if (d.identidad.rol !== m.para) return '';
  const ultima = comprobacionesDe(d.estado.notas, m.id, i).at(-1);
  const respuesta = ultima ? d.plan.respuestas?.[ultima.id] : undefined;
  if (respuesta) return `<p class="aclaracion-paso"><b>${tx('paso.comprobado')}</b> ${esc(respuesta.texto)}</p>`;
  if (comprobando(m.id, i)) return `<p class="aclarando-paso" role="status">${tx('paso.comprobando')}${seguimientoAparte(d.aclaracion?.mision === m.id && d.aclaracion.paso === i ? d.aclaracion.lanzada : undefined, MIN_ACLARAR)}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></p>`;
  if (ultima) {
    const fallida = d.aclaracion?.nota === ultima.id && !!d.aclaracion.error;
    return `<p class="aclarando-paso" role="status">${fallida ? `${tx('paso.comprobacionNoTermino')}<button type="button" class="enlace" data-aparte="aclaracion">${tx('cabeza.porQue')}</button>` : tx('paso.comprobarPedido')}</p>`;
  }
  // Solo en un paso de afuera: uno que lleva a un lugar del Studio se ve ahí mismo
  const deAfuera = seMarcaAMano(p) && (typeof p === 'string' || !p.ir || !!p.ir.url);
  if (hecho || !deAfuera) return '';
  return `<button type="button" class="aclarar-paso" data-comprobar-paso="${esc(m.id)}|${i}" title="${esc(tx('paso.comprobarTitulo'))}">${tx('paso.comprobar')}</button>`;
}

/** La tarjeta de una misión (missionCard.ts), con los datos de la página y lo que depende de ella. */
/**
 * La tarjeta de una misión. Si algo de ella no se puede dibujar, lo dice en su lugar y el resto del Studio carga igual: el
 * 9 de noviembre de 2026, un paso que ya no existía en una misión de «Lo que sigue» dejó todo en «No se pudo cargar el
 * Director» (nunca una falla en silencio: el error queda a la vista y en la consola).
 */
const tarjetaMision = (m: Mision, compacta = false, numero = 0) => {
  try {
    return tarjetaDeMision(datosTarjeta(), m, compacta, numero);
  } catch (e) {
    console.error(`No se pudo dibujar la misión ${m.id}`, e);
    return `<article class="mision tarjeta-fallida" id="mision-${esc(m.id)}"><p class="aviso remoto">${tx('mision.noSePudoDibujar', { titulo: esc(m.titulo ?? m.id), error: esc((e as Error).message) })}</p></article>`;
  }
};

function datosTarjeta(): DatosTarjeta {
  return {
    plan: d.plan, estado: d.estado, rol: d.identidad.rol, nombre: d.identidad.nombre, transcripciones: d.transcripciones,
    entregandoSola, pasosHechos, pasoAbierto, listaPasos, misionPasada, audioYTexto, opcionesMision,
    botonIr: (destino) => botonIr(destino), tituloDoc, plegable: (clave) => plegable(clave),
  };
}

/**
 * La franja de arriba de tu misión de ahora en su modo enfoque, como la del documento: el tema y la niebla de lectura,
 * con su ▶ y su velocidad (nota de voz del titular nmvofr7x3tit, 25 de octubre de 2026: la niebla se podía poner en la
 * misión, pero sus controles no estaban arriba). Fuera del enfoque no se ve: arriba, en la cabecera, está el tema. En
 * cuatro grupos separados por una línea fina, los mismos de la franja del documento (controlesEnfoque.ts): el tema, la
 * niebla, la narración y el sonido, con su menú ahí mismo (pd_controles_enfoque).
 */
function opcionesMision() {
  return `<span class="opciones-mision" role="group" aria-label="${esc(tx('dq.comoLeer'))}">${controlesEnfoque({ tema: botonTema(), niebla: controlAuto('niebla'), narracion: controlAuto('voz'), sonido: botonSonido() })}</span>`;
}

/**
 * Los mismos controles de lectura arriba de «¿Dónde quedamos?» (nota de voz del titular nmvpi5ydttit, 26 de octubre de
 * 2026: «donde sea que se pueda controlar el modo niebla y este tipo de controles, debe presentar el panel de la misma
 * forma»): los cuatro grupos de controlesEnfoque, en su orden y con su línea fina, como en la franja del documento y en la
 * de la misión. El tema, la niebla (con su ▶ y su velocidad), la narración (solo con la niebla puesta) y el sonido, con su
 * menú ahí mismo, dentro del diálogo.
 */
function opcionesDq() {
  return `<span class="opciones-dq" role="group" aria-label="${esc(tx('dq.comoLeer'))}">${controlesEnfoque({ tema: botonTema(), niebla: controlAuto('niebla'), narracion: controlAuto('voz'), sonido: botonSonido() })}</span>`;
}

/** La ficha de una persona, con sus logros (personCard.ts): con lo que pinta, de los datos del proyecto. */
function fichaPersona(p: Persona) {
  return fichaDePersona({ persona: p, nombre: nombrePersona(p), esYo: d.identidad.rol === p, ctx: ctx(), equipo: d.proyecto.equipo, arranque: d.arranque });
}

/** «Lo que sigue» de una persona (queuePanel.ts): con lo que pinta, de los datos del proyecto. */
function colaDe(p: Persona) {
  return colaDeLaPersona({ plan: d.plan, estado: d.estado, persona: p, ahora: abiertasDe(p)[0]?.id, conColaDelDirector: p === (d.identidad.rol ?? TITULAR), plegable: (clave) => plegable(clave) });
}

/** Cómo va la revisión, para el paso siguiente de quien no tiene misión: corriendo, pedida, el director ocupado o libre. */
function revisionParaHoy() {
  const e = estadoRevision();
  return e.estado === 'en_curso' ? 'en_curso' : e.estado === 'pedida' || (e.estado === 'sin_vigilia' && !d.revision?.error) ? 'pedida' : directorOcupado() ? 'ocupado' : 'libre';
}

/** Lo que pinta «Hoy» (todayView.ts), de los datos del proyecto: la tarjeta de cada misión (missionCard.ts) se le pasa. */
function datosHoy(): DatosHoy {
  return {
    plan: d.plan, estado: d.estado, rol: d.identidad.rol, personas: personasEquipo().filter(seVe),
    arranque: arranqueHTML(), filtro: filtroVisible(), etapa: d.arranque,
    abiertasDe, tarjeta: tarjetaMision, cola: colaDe, ficha: fichaPersona,
    pasoSinMision: (p, entregadas) => pasoSinMision(ctx(), p, d.arranque, revisionParaHoy(), entregadas, colaDelDirector(d.plan, d.estado).length),
    seguidas: automatica(),
    botonIr: (destino) => botonIr(destino),
  };
}

function puedoTrabajar() {
  if (!d.plan.frentes.length) return '';
  const f = faseActual(d.plan, d.estado);
  let respuesta = '';
  if (consulta) {
    const t = trabajoDe(f, consulta);
    const x = excepcionesActivas(d.estado, d.hoy, consulta)[0];
    const mia = d.identidad.rol ? abiertasDe(d.identidad.rol)[0] : undefined;
    respuesta =
      t.nivel === 'foco' ? `<p class="respuesta-d foco"><b>${tx('puedo.foco', { fase: esc(f.nombre) })}</b> ${esc(queDelFrente(t.que))}</p>`
      : t.nivel === 'apoyo' ? `<p class="respuesta-d apoyo"><b>${tx('puedo.apoyo')}</b> ${esc(queDelFrente(t.que))}</p>`
      : `<div class="respuesta-d espera"><b>${tx('puedo.espera')}</b> ${tx('puedo.enEspera', { fase: esc(f.nombre), frente: esc(nombreFrente(consulta)), que: esc(queDelFrente(t.que)) })}
          ${x ? `<p>${tx('puedo.excepcion', { fecha: fecha(x.hasta), motivo: esc(x.motivo) })}</p>` : ''}
          ${mia ? `<p>${tx('puedo.enCambio', { titulo: esc(mia.titulo) })}</p>` : ''}
          ${x ? '' : `<p><button type="button" data-nueva-excepcion>${tx('puedo.registrar')}</button></p>`}</div>`;
  }
  // Plegado: es para cuando hace falta, no algo que se lee cada día
  return `<details class="puedo panel-d"${consulta ? ' data-recuerda="puedo" open' : plegable('puedo')}><summary><h3>${tx('puedo.titulo')}</h3></summary>
    <label class="campo-puedo">${tx('puedo.quiero')}
      <select data-consulta><option value="">${tx('puedo.elige')}</option>${d.plan.frentes.map((x) => `<option value="${esc(x.id)}"${x.id === consulta ? ' selected' : ''}>${esc(x.nombre)}</option>`).join('')}</select></label>
    ${respuesta}
    <p class="como">${tx('puedo.sesiones')}</p></details>`;
}

/** «Hoy» (todayView.ts): tu misión de ahora, completa, y con el equipo a la vista, una columna por persona. */
function vistaMisiones() {
  return vistaHoyEnRuta({ fases: fasesEnBarra(), pestana: 'mision', cuerpo: vistaHoy(datosHoy()) });
}

/**
 * Las fases para la barra delgada de «Hoy» (hoyEnRuta.ts): cómo va cada una y cuál se mira en «Datos del proceso» (solo
 * allí: en «Tu misión» ninguna está elegida).
 */
function fasesEnBarra(): FaseEnBarra[] {
  const mirada = vista === 'ruta' ? (faseVista ?? faseActual(d.plan, d.estado).id) : null;
  return d.plan.fases.map((f) => ({ id: f.id, nombre: f.nombre, situacion: situacion(d.plan, d.estado, f.id), avance: avanceFase(f, ctx()).avance, vista: f.id === mirada }));
}

/** Con el filtro de una persona puesto, una línea que lo dice y deja ver todo el equipo. */
function filtroVisible() {
  const p = personaVista();
  if (!p || personasEquipo().length < 2) return '';
  return `<p class="filtro-equipo">${tx('hoy.filtro', { nombre: esc(nombreVista(p)) })} <button type="button" class="enlace" data-vista-equipo="equipo">${tx('hoy.verEquipo')}</button></p>`;
}

// ───────────────────────────────────────────── el buzón del director

function sobreDe(n: Nota) {
  const s = n.sobre;
  if (s.tipo === 'mision') return `${tx('buzon.sobreMision', { que: esc(d.plan.misiones.find((m) => m.id === s.id)?.titulo ?? s.id ?? '') })}${s.seccion ? ` › ${esc(s.seccion)}` : ''}`;
  if (s.tipo === 'propuesta') return tx('buzon.sobrePropuesta', { que: esc(d.plan.propuestas.find((p) => p.id === s.id)?.titulo ?? s.id ?? '') });
  if (s.tipo === 'documento') return `<button type="button" class="enlace" data-doc="${esc(s.id ?? '')}" data-seccion="${esc(s.seccion ?? '')}">${esc(tituloDoc(s.id ?? ''))}${s.seccion ? ` › ${esc(s.seccion)}` : ''}${s.decision ? ` › ${tx('buzon.sobreDecision', { que: esc(s.decision) })}` : ''}${s.fragmento ? ` › «${esc(recortar(s.fragmento, 60))}»` : ''}</button>`;
  if (s.tipo === 'criterio') return tx('buzon.sobreCriterio', { que: esc(d.plan.fases.flatMap((f) => f.criterios).find((c) => c.id === s.id)?.texto ?? s.id ?? '') });
  if (s.tipo === 'fase') return tx('buzon.sobreFase', { que: esc(nombreFase(s.id ?? '')) });
  if (s.tipo === 'diagnostico') return `${tx('buzon.sobreDiagnostico')}${s.seccion ? ` › ${esc(nombreFrente(s.seccion))}` : ''}`;
  if (s.tipo === 'pregunta') return tx('buzon.sobrePregunta');
  if (s.tipo === 'objetivo') return s.id ? tx('buzon.sobreCandidato', { que: esc(d.plan.objetivos.find((o) => o.id === s.id)?.texto ?? s.id) }) : tx('buzon.sobreObjetivo');
  if (s.seccion || s.fragmento) return `${s.seccion ? esc(s.seccion) : tx('buzon.sobreProyecto')}${s.fragmento ? ` › «${esc(recortar(s.fragmento, 60))}»` : ''}`;
  return tx('buzon.sobreGeneral');
}

/**
 * Si una nota se puede corregir: toda la que trae algo, también una de voz que aún se transcribe o que no se pudo
 * transcribir. «Corregir» siempre trae «Grabar» para sumarle o rehacer una parte con la voz; antes, un audio sin
 * transcribir solo ofrecía «Escribir lo que dijiste» (nota de voz del titular nmvsyn0r4tit, 28 de octubre de 2026).
 */
const corregible = (n: Nota) => !!n.texto || !!n.audio || !!n.adjuntos?.length;

/**
 * Si su audio no se pudo transcribir en este computador, quien lo grabó lo escribe (propuesta aceptada «La voz sin WSL»,
 * pr_voz_sin_wsl: el audio se queda hasta que salga bien, con un botón para escribir lo que se dijo). Al guardarlo, su
 * texto es la transcripción y el audio se borra, como si se hubiera transcrito.
 */
const botonEscribirLoDicho = (n: Nota) =>
  n.audio && !n.texto && d.transcripciones[n.audio] === undefined && d.sinTranscribir?.includes(n.audio)
    ? `<button type="button" data-corregir-transcripcion="${esc(n.audio)}" title="${esc(tx('buzon.escribirTitulo'))}">${tx('buzon.escribir')}</button>`
    : '';

/** Lo que dice una nota en una línea, para verla plegada: su texto, o lo que se entendió de su audio, o sus adjuntos. */
function asuntoDe(n: Nota) {
  const t = textoDeNotaALaVista(n)?.trim() || (n.audio && d.transcripciones[n.audio]?.trim()) || n.despues?.trim() || (n.audio ? tx('buzon.asuntoAudio') : n.adjuntos?.length ? tx('buzon.asuntoAdjuntos') : '');
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

/**
 * Los plegables que quien mira abrió o cerró a mano («N ideas entendidas», «Ya leído», «Completado», las partes de la
 * columna de los documentos y los paneles que explican o se consultan, como «¿Qué es el Buzón del director?»), por su
 * clave (`data-recuerda`). Ninguno se pliega solo (nota del titular, 22 de octubre de 2026). El Studio se repinta solo cuando algo cambia (una transcripción que termina, una nota que llega), y
 * sin esto cada repintado los devolvería a como nacen: se cerraban solos a los pocos segundos de abrirlos.
 */
const plegadosAMano = new Map<string, boolean>();
document.addEventListener('toggle', (e) => {
  const det = e.target as HTMLElement;
  if (det instanceof HTMLDetailsElement && det.dataset.recuerda) plegadosAMano.set(det.dataset.recuerda, det.open);
}, true);
/** El atributo de un plegable que recuerda si quien mira lo abrió: `porDefecto`, mientras no lo haya tocado. */
const plegable = (clave: string, porDefecto = false) => ` data-recuerda="${esc(clave)}"${plegadosAMano.get(clave) ?? porDefecto ? ' open' : ''}`;

/**
 * Dónde quedó lo que dijo la nota (la misión, la propuesta, la fase o la parte de un documento), con su botón: para
 * comprobarlo de un vistazo. Si es el mismo lugar donde se lee la respuesta (`aqui`), se dice sin botón: uno que te deja
 * donde ya estás confunde (nota de voz del titular, 22 de octubre).
 */
const quedoEn = (r: Pick<Respuesta, 'destino'>, aqui?: Lugar) => (!r.destino ? ''
  : aqui && llevaAqui(r.destino, aqui) ? `<p class="quedo-en">${tx('buzon.quedoAqui', { donde: tx(`buzon.aqui.${aquiMismo(r.destino)}`) })}</p>`
  : `<p class="quedo-en">${tx('buzon.quedoEn')} ${botonIr(r.destino, 'enlace')}</p>`);

/**
 * Si la nota traía varias cosas, cada una por su lado, como la separó el director (pedido pd_partes_separadas): su tipo,
 * lo que responde de ella, su tratamiento y dónde quedó.
 */
const partesDeRespuesta = (r: Respuesta, aqui?: Lugar) => (!r.partes?.length ? ''
  : `<ol class="partes-resp">${r.partes.map((p) => `<li class="parte-resp"><p class="cabeza-parte"><span class="tipo-nota ${esc(p.tipo)}">${esc(TIPOS_DE_NOTA.includes(p.tipo) ? nombreTipoEnBuzon(p.tipo) : p.tipo)}</span><span class="tratamiento ${esc(p.tratamiento)}">${nombreTratamiento(p.tratamiento)}</span></p><div class="texto-resp">${limpio(marked.parse(p.texto, { async: false }) as string)}</div>${quedoEn(p, aqui)}</li>`).join('')}</ol>`);

/** La parte de un documento como lugar: ahí se leen las notas sobre ella, sobre sus ideas y sobre sus decisiones. */
const enParte = (ruta: string, seccion: string): Lugar => ({ vista: 'documentos', doc: ruta, seccion });

/** Lo que dijiste en una nota de un documento y abriste entero: un repintado no lo vuelve a plegar. */
const dichosAbiertos = new Set<string>();
function plegarDicho(el: HTMLElement) {
  const abierto = !el.classList.toggle('plegado');
  if (abierto) dichosAbiertos.add(el.dataset.dicho!);
  else dichosAbiertos.delete(el.dataset.dicho!);
  el.setAttribute('aria-expanded', String(abierto));
  el.title = tx(abierto ? 'buzon.dichoAbierto' : 'buzon.dichoPlegado');
}
// Un clic lo abre o lo pliega, salvo en lo que ya hace algo (un enlace, el audio) o al seleccionar su texto para copiarlo
document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const el = t.closest<HTMLElement>('[data-dicho]');
  if (el && !t.closest('a, button, audio, input, textarea, select') && !getSelection()?.toString()) plegarDicho(el);
});
document.addEventListener('keydown', (e) => {
  const el = e.target as HTMLElement;
  if ((e.key === 'Enter' || e.key === ' ') && el.matches?.('[data-dicho]')) {
    e.preventDefault();
    plegarDicho(el);
  }
});

/**
 * `plegada`: en el Buzón cada nota se ve en una línea y se despliega la que se quiera revisar (sin scroll de más).
 * `enRespuesta`: lo buscado está en lo que respondió el director, no en la línea que se ve: la línea lo dice.
 * `aqui`: dónde se ve la nota (el Buzón, la parte de un documento, una propuesta), para no ofrecer un «Quedó en» a ese mismo lugar.
 */
/** Si el lugar donde quedó una respuesta ya se resolvió (la propuesta respondida, el pedido hecho, la misión entregada…). */
const resueltoAqui = (r: Pick<Respuesta, 'tratamiento'> & Partial<Pick<Respuesta, 'destino' | 'cuando'>>) => destinoResuelto(r, d.plan, d.estado);

function tarjetaNota(n: Nota, conSobre = true, plegada = false, enRespuesta = false, aqui?: Lugar) {
  const r0 = d.plan.respuestas[n.id];
  // Lo que «Requiere tu decisión» o quedó «Aplazada» y ya se resolvió en su lugar se ve integrado, sin modelo (nmvt1uaxhtit)
  const r = r0 && { ...r0, tratamiento: comoQuedoNota(n, d.plan.respuestas, resueltoAqui) as Respuesta['tratamiento'] };
  const mia = n.de === d.identidad.rol;
  const puedeBorrar = !r && (titular() || mia);
  const urgente = n.urgente ? `<p class="urgente-n">${icono('urgente')}<span><b>${tx('buzon.urgente')}</b>${typeof n.urgente === 'string' ? `: ${esc(n.urgente)}` : ''}</span></p>` : '';
  const botones = `${!r && mia && corregible(n) ? `<button type="button" data-editar-nota="${esc(n.id)}">${tx('buzon.corregir')}</button>` : ''}${!r && mia ? botonEscribirLoDicho(n) : ''}${puedeBorrar ? `<button type="button" data-borrar-nota="${esc(n.id)}">${tx('buzon.borrar')}</button>` : ''}`;
  // Lo que dijo la persona no lleva la niebla de lectura (`gl-sin`: es suyo, no hay nada que desvelarle) y lo que respondió
  // el director sí (`texto-resp`). En un documento, lo dicho se pliega a su primer renglón y se abre con un clic, para que
  // la lectura siga en lo del director (nota de voz del titular nmvmytjd0tit, 24 de octubre de 2026). Lo que respondió se
  // lee con formato y con sus dibujos, como las respuestas a las preguntas (pedido pd_graficos_svg), limpio de lo que corre
  const dicho = dichoDeNota(n, audioYTexto, adjuntosDeNota);
  const enDoc = aqui?.vista === 'documentos';
  const plegado = enDoc && !dichosAbiertos.has(n.id);
  const deLaPersona = !dicho ? ''
    : enDoc ? `<div class="dicho-nota gl-sin plegable-dicho${plegado ? ' plegado' : ''}" data-dicho="${esc(n.id)}" tabindex="0" aria-expanded="${!plegado}" title="${esc(tx(plegado ? 'buzon.dichoPlegado' : 'buzon.dichoAbierto'))}">${dicho}</div>`
    : `<div class="dicho-nota gl-sin">${dicho}</div>`;
  const cuerpo = `${deLaPersona}
    ${r ? `<div class="respuesta-dir"><b>${tx('buzon.elDirector', { cuando: momento(r.cuando) })}</b>${r.tratamiento ? ` <span class="tratamiento ${r.tratamiento}">${nombreTratamiento(r.tratamiento)}</span>` : ''}<div class="texto-resp">${limpio(marked.parse(r.texto, { async: false }) as string)}</div>${quedoEn(r, aqui)}${partesDeRespuesta(r, aqui)}</div>` : `<p class="esperando">${tx('buzon.esperandoNota')}</p>`}`;
  // Su tipo, como lo eligió (o se lo puso el director): las de antes, «Sin tipo» (pd_tipo_obligatorio)
  const tipo = tipoDeNota(n, r);
  // Hasta que el director la lea, su autor le cambia el tipo con este mismo botón (nota de voz del titular nmvt1vaaltit)
  const chipTipo = !r && mia && pideTipo(n.sobre)
    ? `<button type="button" class="tipo-nota cambiar-tipo ${tipo}" data-cambiar-tipo="${esc(n.id)}" title="${esc(tx('buzon.cambiarTipo'))}">${esc(nombreTipoEnBuzon(tipo))} <span aria-hidden="true">▾</span></button>`
    : `<span class="tipo-nota ${tipo}">${esc(nombreTipoEnBuzon(tipo))}</span>`;
  // Si otra nota posterior la dejó sin efecto, se ve «Reemplazado» (pd_reemplaza_elecciones)
  const reemplazada = marcaReemplazada(n, d.plan.respuestas);
  if (plegada) {
    return `<li class="nota-d plegable${r ? ' respondida' : ''}"><details data-nota="${esc(n.id)}"${notasAbiertas.has(n.id) ? ' open' : ''}>
      <summary>${n.urgente ? `<span class="urgente-s" title="${esc(tx('buzon.urgente'))}">${icono('urgente')}</span>` : ''}<span class="asunto">${esc(asuntoDe(n))}</span><span class="como">${chipTipo} ${esc(n.quien)} · ${momento(n.cuando)}${conSobre ? ` · ${tx('buzon.sobre', { que: sobreDe(n) })}` : ''}${r?.tratamiento ? ` · <span class="tratamiento ${r.tratamiento}">${nombreTratamiento(r.tratamiento)}</span>` : ''}${reemplazada ? ` ${reemplazada}` : ''}${enRespuesta ? ` · <span class="hallado-en">${tx('buzon.enRespuesta')}</span>` : ''}</span></summary>
      <div class="cuerpo-nota">${botones ? `<div class="botones-nota">${botones}</div>` : ''}${urgente}${cuerpo}</div>
    </details></li>`;
  }
  return `<li class="nota-d${r ? ' respondida' : ''}" data-guia="no">
    <header><b>${esc(n.quien)}</b><span class="como">${chipTipo} ${momento(n.cuando)}${conSobre ? ` · ${tx('buzon.sobre', { que: sobreDe(n) })}` : ''}${reemplazada ? ` ${reemplazada}` : ''}</span>${botones}</header>
    ${urgente}
    ${cuerpo}
  </li>`;
}

/** Lo que se escribió en «Buscar en el Buzón»: se queda mientras no cambies de proyecto. */
let busquedaBuzon = '';
/** El tipo elegido en el filtro del Buzón (vacío: todas), como la búsqueda. */
let tipoBuzon: TipoEnBuzon | '' = '';
/** Cómo quedó, en el filtro «Cómo quedó» del Buzón (vacío: todas): se suma al del tipo. */
let comoBuzon: ComoQuedo | '' = '';

/** Buzón: la vista vive en vistaBuzon.ts; aquí, lo que depende de la página (quién mira, la búsqueda y los filtros que quedaron, lo que tiene abierto, cómo se pinta una nota). */
const datosBuzon = (): DatosBuzon => ({
  notas: d.estado.notas.filter((n) => seVe(n.de)), respuestas: d.plan.respuestas, transcripciones: d.transcripciones,
  busqueda: busquedaBuzon, tipo: tipoBuzon, como: comoBuzon,
  fijarFiltros: (f) => { tipoBuzon = f.tipo; comoBuzon = f.como; },
  respondidasAbiertas, respondidasVistas, resueltoAqui, filtroVisible, plegable, tarjetaNota,
});

function vistaBuzon() {
  return vistaBuzonHtml(datosBuzon());
}

/** Las notas del Buzón: se repintan solas al buscar o al filtrar, sin tocar el campo de búsqueda. */
function notasDelBuzon() {
  return notasDelBuzonHtml(datosBuzon());
}

// ───────────────────────────────────────────── las preguntas al director

/** Un hilo de preguntas en Markdown: para copiarlo y llevarlo a otra parte. */
function hiloEnTexto(notas: Nota[]) {
  const dicho = (n: Nota) => loDichoEnOrden(n, (a) => d.transcripciones[a]).join('\n\n') || tx('preguntas.grabada');
  return `${notas.map((n) => `**${dicho(n)}**\n\n${d.plan.respuestas[n.id]?.texto.trim() ?? tx('preguntas.sinRespuesta')}`).join('\n\n---\n\n')}\n`;
}

/** Los hilos que tiene abiertos quien mira (para que un repintado no los cierre). */
const hilosAbiertos = new Set<string>();
/** Si abriste «Ya respondidas» en el Buzón: se queda abierta mientras no salgas del Studio. */
let respondidasAbiertas = false;
/** Cuántas de las ya respondidas se pintan: las últimas y, con «Ver las anteriores», de a tantas más (t_decide_aligerar_buzon). */
let respondidasVistas = RESPONDIDAS_DE_A;
document.addEventListener('click', (e) => {
  if (!(e.target as HTMLElement).closest?.('[data-ver-anteriores]')) return;
  respondidasVistas += RESPONDIDAS_DE_A;
  const resultados = document.getElementById('resultados-buzon');
  if (resultados) resultados.innerHTML = notasDelBuzon();
});
document.addEventListener('toggle', (e) => {
  const det = e.target as HTMLElement;
  if (det instanceof HTMLDetailsElement && det.dataset.yaRespondidas !== undefined) respondidasAbiertas = det.open;
  if (!(det instanceof HTMLDetailsElement) || !det.dataset.hilo) return;
  if (det.open) hilosAbiertos.add(det.dataset.hilo);
  else hilosAbiertos.delete(det.dataset.hilo);
}, true);

/** Preguntas: la vista vive en vistaPreguntas.ts; aquí, lo que depende de la página (quién mira, lo que tiene abierto, cómo se pinta un audio o un adjunto). */
function vistaPreguntas() {
  return vistaPreguntasHtml({
    notas: d.estado.notas.filter((n) => seVe(n.de)), respuestas: d.plan.respuestas, transcripciones: d.transcripciones,
    yo: d.identidad.rol, esTitular: titular(), hilosAbiertos,
    filtroVisible, audioYTexto, adjuntosDeNota, botonEscribirLoDicho, corregible, quedoEn,
    respuestaHtml: (texto) => limpio(marked.parse(texto, { async: false }) as string),
  });
}


// ───────────────────────────────────────────── documentos para leer y comentar

/**
 * Documentos: la vista vive en vistaDocumentos.ts; aquí, lo que depende de la página (quién mira y la lectura de quién se
 * ve, lo que la columna recordó, lo que tiene leído, cómo se lee cada parte, idea por idea o con sus decisiones, y cómo se
 * pinta una nota, los ajustes del lector y el botón de volver a la misión).
 */
function vistaDocumentos() {
  const persona: Persona = personaVista() ?? d.identidad.rol ?? TITULAR;
  return vistaDocumentosHtml({
    yo: d.identidad.rol, persona, nombreDePersona: nombrePersona(persona),
    curados: d.plan.documentos, archivosClave: d.plan.archivosClave ?? [], enRuta: lecturaDe(persona),
    documentos, documentosFuera, repositorioConectado: !!d.repositorio.info,
    doc, copiaEnClave, notas: d.estado.notas, listaPlegada: listaPlegada(),
    alEmpezarColumna, plegableEnColumna, plegable, tituloDoc, leidasDe, reabierta, faltaEnParte, porTrozos, conDecisiones,
    enParte, tarjetaNota, volverAMisionDe, ajustesLector, claseLector,
  });
}

/** Si la columna de los documentos está plegada (es de este navegador). */
const listaPlegada = () => localStorage.getItem('estudio.docs.lista') === 'plegada';

/**
 * Lo que la columna de los documentos mostró la última vez: el documento abierto y, por cada parte plegable, el que tenía
 * dentro. Así sabe si lo abierto es nuevo o acaba de llegar a una parte (lo leído pasa a «Ya leídos»).
 */
let docEnColumna: { ruta: string; texto: string } | null = null;
const docEnPlegable = new Map<string, { ruta: string; texto: string } | null>();
/** Si al pintar hay que llevar la columna hasta el documento abierto, para que se vea marcado en ella. */
let mostrarEnColumna = false;
/**
 * Empieza el pintado de la columna. Ninguna parte plegable de la columna se pliega sola, ni al abrir un documento ni al
 * repintarse: queda como la dejaste. La que recibe el documento abierto (lo acabas de abrir, o pasó a ella al leerlo) se
 * abre, para que lo veas marcado en ella (nota del titular, 22 de octubre)
 */
const alEmpezarColumna = () => {
  mostrarEnColumna = doc !== docEnColumna;
  docEnColumna = doc;
};
/**
 * Cada parte se pliega y despliega a mano, siempre (nota del titular, 22 de octubre: lo único que no quiere es que se
 * plieguen solas). `abiertaAlNacer`: cómo nace la primera vez, si no tiene el documento abierto
 */
const plegableEnColumna = (clave: string, rutas: string[], abiertaAlNacer = false) => {
  const tiene = !!doc && rutas.includes(doc.ruta);
  const recibe = tiene && docEnPlegable.get(clave) !== doc;
  docEnPlegable.set(clave, tiene ? doc : null);
  if (recibe) mostrarEnColumna = true;
  const abierta = abiertaEnLista(plegadosAMano.get(clave), tiene || abiertaAlNacer, recibe);
  plegadosAMano.set(clave, abierta);
  return ` data-recuerda="${esc(clave)}"${abierta ? ' open' : ''}`;
};

/** Hasta dónde bajaste en la columna de los documentos (tiene su propio scroll): un repintado no la devuelve arriba. */
let scrollColumna = 0;

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
 * Los botones de una decisión: «Apruebo lo que recomiendas» (un clic) y, a su lado desde el principio, «Decido otra
 * cosa», que abre el comentario para decir, escrito o grabado, lo que decides (nota de voz del titular nmvoko66ttit, 25
 * de octubre de 2026: aparecía solo después de comentar, y con él ya no hace falta «Comentar»). Respondida, solo se le
 * puede agregar algo.
 */
function botonesDecision(ruta: string, parte: string, nombre: string, deEsta: Nota[]): string {
  const previas = deEsta.length ? `<ul class="notas-lista">${deEsta.map((x) => tarjetaNota(x, false, false, false, enParte(ruta, parte))).join('')}</ul>` : '';
  const base = `documento|${esc(ruta)}|${esc(parte)}|${esc(nombre)}|`;
  const botones = respondiste(ruta, parte, nombre)
    ? `<button type="button" class="al-director" data-comentar="${base}|comenta">${tx('docs.agregar')}</button>`
    : `<button type="button" class="boton-aprobar" data-aprobar="${esc(ruta)}|${esc(parte)}|${esc(nombre)}" title="${esc(tx('docs.aprobarTitulo'))}">${icono('check')}<span>${tx('docs.aprobar')}</span></button>
      <button type="button" class="al-director" data-comentar="${base}|decide" title="${esc(tx('docs.decidirOtraTitulo'))}">${tx('docs.decidirOtra')}</button>`;
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
  sonar('decision');
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
  if (total) avisar(tx('docs.decisionRespondida', { hechas, total }), true);
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
 *
 * Eso sí, la idea que sigue va ya pintada, tal como se verá, dentro de un <template> (inerte: no ocupa lugar, y ni la
 * niebla ni la voz la ven): así la voz pide su audio mientras suena la de ahora y, al marcar «Entendido», ya está listo
 * (nota de voz del titular nmvv1xyz4tit, 30 de octubre de 2026). Si la de ahora es la última de la parte, la que sigue es
 * la primera de la parte que se abre al terminarla: `deLaSiguiente` pide solo esa, sin más template ni más marcas.
 */
function porTrozos(s: { titulo: string; md: string }, notas: Nota[], deLaSiguiente: boolean | 'parte' = false): string {
  const ruta = doc!.ruta;
  const titulo = /^##\s.*$/m.exec(s.md)?.[0] ?? '';
  const html = (md: string) => limpio(marked.parse(md, { async: false }) as string, true, ruta);
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
  // Un bloque de puntos cortos se lee de una vez, y cada punto trae su ✉ pequeño para comentarlo aparte, sin marcar el
  // bloque (nota de voz del titular, 22 de octubre de 2026). Si los puntos dibujados no son los del bloque, va sin ellos.
  // Los puntos se dibujan pegados, para que el ✉ quede en el mismo renglón de su texto y sin espacio de más entre ellos.
  const conSobres = (md: string, puntos: string[]) => {
    if (puntos.length < 2) return html(md);
    const plantilla = document.createElement('template');
    plantilla.innerHTML = html(mdDeBloqueDePuntos(md, puntos));
    const items = [...plantilla.content.children]
      .filter((e) => e.tagName === 'UL' || e.tagName === 'OL')
      .flatMap((l) => [...l.children].filter((e) => e.tagName === 'LI'));
    if (items.length !== puntos.length) return plantilla.innerHTML;
    items.forEach((li, k) =>
      li.insertAdjacentHTML('beforeend', ` <button type="button" class="al-director comentar-punto" data-comentar="documento|${esc(ruta)}|${esc(s.titulo)}||${esc(fragmentoDe(puntos[k]))}" title="${esc(tx('docs.comentarPunto'))}" aria-label="${esc(tx('docs.comentarPunto'))}">✉</button>`),
    );
    return plantilla.innerHTML;
  };
  const pintarTrozo = (i: number, clase = '') => {
    const t = lista[i];
    if (t.tipo === 'rotulo') return `<div class="trozo rotulo">${html(t.md)}</div>`;
    const fragmento = fragmentoDe(t.md);
    // Un bloque de puntos cortos trae debajo también lo que se comentó de cada punto (antes, o con su ✉)
    const puntos = puntosDelBloque(t);
    const suyos = new Set([fragmento, ...puntos.map(fragmentoDe)]);
    const deEste = notas.filter((x) => (x.sobre.seccion ?? '') === s.titulo && (t.decision ? x.sobre.decision === t.decision : !x.sobre.decision && x.sobre.fragmento !== undefined && suyos.has(x.sobre.fragmento)));
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
        <div class="marcas-trozo"><span class="estado-decision${respondida ? ' hecha' : ''}">${respondida ? `${icono('check')} ${tx('docs.respondida')}` : tx('docs.faltaTuDecision')}</span></div></div>`;
    }
    const hecho = entendida[i];
    const recien = hecho && recienEntendida === `${ruta}|${claveIdea(s.titulo, t.md)}`;
    const cambiada = cambio[i] ? `<p class="idea-cambiada">${icono('estrella')} ${tx('docs.ideaCambiada')}</p>` : '';
    // El seguro: en el enfoque, la idea de ahora, la primera vez, deja marcar «Entendido» a los pocos segundos
    const falta = clase.includes('actual') ? esperaDeIdea(ruta, claveIdea(s.titulo, t.md), hecho) : 0;
    const seguro = falta > 0 ? ` con-seguro" data-listo="${Date.now() + falta}` : '';
    // Lo comentado de la idea, con las respuestas del director, va plegado y a la vista, antes de los botones: no hace
    // falta para seguir. Y «Entendido» es lo último, abajo a la derecha, como un «Siguiente»: se suele comentar primero y
    // marcar después (nota de voz del titular nmvn0vsbmtit, 24 de octubre de 2026)
    const comentadas = deEste.length
      ? `<details class="notas-idea"${plegable(`notas-idea|${ruta}|${claveIdea(s.titulo, t.md)}|${deEste.length}`)}><summary>✉ ${resumenComentarios(deEste.length, deEste.filter((x) => d.plan.respuestas[x.id]).length)}${icono('flecha')}</summary><ul class="notas-lista">${deEste.map((x) => tarjetaNota(x, false, false, false, enParte(ruta, s.titulo))).join('')}</ul></details>`
      : '';
    return `<div class="trozo${hecho ? ' hecho' : ''}${clase}">${cambiada}<div class="cuerpo-trozo">${conSobres(t.md, puntos)}</div>
      ${comentadas}
      <div class="marcas-trozo">
        <button type="button" class="al-director comentar-idea" data-comentar="documento|${esc(ruta)}|${esc(s.titulo)}||${esc(fragmento)}" title="${esc(tx('docs.comentarIdeaTitulo'))}">${tx('docs.comentarIdea')}</button>
        <button type="button" class="entendido${hecho ? ' hecho' : ''}${recien ? ' recien' : ''}${seguro}" data-entendido="${esc(s.titulo)}|${i}" aria-pressed="${hecho}" title="${esc(tx(hecho ? 'docs.quitarMarca' : 'docs.marcarIdea'))}">${icono('check')}<span>${tx('docs.entendido')}</span>${hecho ? '' : '<span class="sigue-e" aria-hidden="true">→</span>'}${falta > 0 ? `<span class="seguro-e" aria-hidden="true">${Math.ceil(falta / 1000)}</span>` : ''}</button>
      </div></div>`;
  };
  // La idea con sus rótulos, como se pinta al llegar a ella (grupo y pintarTrozo, los mismos): sin la marca `actual`,
  // que arranca el seguro de su «Entendido» (esperaDeIdea), y esa idea aún no se ve
  const tarjeta = (i: number) => grupo(i).map((k) => pintarTrozo(k)).join('');
  // Para la voz preparada (primerasPartes), cada idea por leer de la parte, cada una como se pintará al llegar a ella
  if (deLaSiguiente === 'parte') return ideas.filter((i) => !hecha(i)).map(tarjeta).join('');
  if (deLaSiguiente) return actual === undefined ? '' : tarjeta(actual);
  const visibles = actual === undefined ? [] : [...(contexto !== undefined ? [contexto] : []), actual];
  const plegadas = ideas.filter((i) => hecha(i) && !visibles.includes(i));
  const entendidas = plegadas.length
    // La clave lleva cuántas hay: al marcar otra idea el plegable vuelve a nacer cerrado, como siempre
    ? `<details class="ideas-entendidas"${plegable(`ideas|${ruta}|${s.titulo}|${plegadas.length}`, actual === undefined)}><summary>${icono('check')} ${tx('docs.ideasEntendidas', { n: plegadas.length })}</summary><div class="trozos">${plegadas.flatMap(grupo).map((i) => pintarTrozo(i)).join('')}</div></details>`
    : '';
  const ahora = visibles.map((i) => (i === actual ? grupo(i).map((k) => pintarTrozo(k, k === i ? ` actual${recienEntendida ? ' llega' : ''}` : '')).join('') : pintarTrozo(i, ' contexto'))).join('');
  const cuenta = actual !== undefined && ideas.length > 1 ? `<p class="cuenta-ideas">${tx('docs.cuentaIdeas', { n: ideas.indexOf(actual) + 1, total: ideas.length })}</p>` : '';
  // Al marcar la última idea se abre la parte siguiente (marcarParte): la primera por leer de las que quedan, como la elige
  // vistaDocumentos (una parte leída que se reabrió también cuenta)
  const deOtraParte = () => {
    const partes = secciones(doc!.texto);
    const paraLeer = new Set(partesDeDocumento(doc!.texto));
    const leidas = leidasDe(ruta);
    const otra = partes.slice(partes.findIndex((p) => p.titulo === s.titulo) + 1).find((p) => p.titulo && paraLeer.has(p.titulo) && (!leidas.includes(p.titulo) || reabierta(ruta, p)));
    return otra ? porTrozos(otra, notas, true) : '';
  };
  const proxima = actual === undefined ? undefined : ideas.find((i) => i > actual && !hecha(i));
  const siguiente = actual === undefined ? '' : proxima !== undefined ? tarjeta(proxima) : deOtraParte();
  return `${html(titulo)}${entendidas}<div class="trozos">${ahora}</div>${cuenta}${siguiente ? `<template class="idea-siguiente">${siguiente}</template>` : ''}`;
}

/** La idea que se acaba de marcar (documento|clave): su botón lleva el estímulo una sola vez. */
let recienEntendida = '';

/** Cuándo se vio por primera vez cada idea por leer (documento|clave): desde ahí corre su seguro. */
const ideaVista = new Map<string, number>();
/**
 * Si la idea que se pinta se lee en el modo enfoque. Un documento que se abre ya enfocado todavía no lo dice en `enfoque`,
 * que se pone al día después de pintarlo (aplicarEnfoque): por eso cuenta también lo que la persona quiere.
 */
const enfoqueDeLaIdea = () => enfoque === 'documento' || (enfoqueQuerido && enfoqueAlAbrir);
/**
 * Los milisegundos que le faltan al «Entendido» de una idea para activarse (0: ya se puede). En el modo enfoque, la primera
 * vez que se lee, los mismos segundos en cualquier idea (lectura.ts › segundosDelSeguro); sin el enfoque, lo ya marcado o
 * un documento ya leído (al releer), sin espera (notas de voz del titular nmvwpl26stit y nmvwprqjctit).
 */
function esperaDeIdea(ruta: string, clave: string, hecho: boolean): number {
  const segundos = segundosDelSeguro(enfoqueDeLaIdea());
  if (!segundos || hecho || yaLeido(ruta, d.identidad.rol ?? TITULAR)) return 0;
  const k = `${ruta}|${clave}`;
  if (!ideaVista.has(k)) ideaVista.set(k, Date.now());
  return Math.max(0, ideaVista.get(k)! + segundos * 1000 - Date.now());
}
// La cuenta del seguro, en el botón mismo: al llegar a cero, «Entendido» queda listo
setInterval(() => {
  for (const b of document.querySelectorAll<HTMLButtonElement>('.entendido[data-listo]')) {
    const faltan = Number(b.dataset.listo) - Date.now();
    if (faltan > 0) {
      const cuenta = b.querySelector('.seguro-e');
      if (cuenta) cuenta.textContent = String(Math.ceil(faltan / 1000));
      continue;
    }
    b.classList.remove('con-seguro');
    delete b.dataset.listo;
    b.querySelector('.seguro-e')?.remove();
  }
}, 250);

/**
 * Marca (o desmarca) una idea como entendida; con la última de la parte (y sus decisiones respondidas), la parte queda
 * leída. Solo la llama «Entendido»: comentar una idea no la marca.
 */
async function marcarTrozo(titulo: string, i: number) {
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
  if (marca) trozos.add(clave);
  else trozos.delete(clave);
  const previo = d.estado.leidos?.[claveLeido(yo, ruta)];
  d.estado.leidos = { ...(d.estado.leidos ?? {}), [claveLeido(yo, ruta)]: { partes: previo?.partes ?? [], trozos: [...trozos], ...(previo?.completo ? { completo: true } : {}), cuando: new Date().toISOString(), quien: d.identidad.nombre } };
  // Una parte ya leída que se reabrió por una idea cambiada no se vuelve a marcar: ya está entre las leídas
  if (marca && !leidasDe(ruta).includes(titulo) && faltaEnParte(ruta, s).completa) return void (await marcarParte(titulo));
  // Cada idea entendida de la parte sube una nota; la última suena como la parte leída (marcarParte)
  if (marca) sonar('entendido', `${ruta}|${titulo}`);
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
const LETRAS = ['docs.letraPequena', 'docs.letraMediana', 'docs.letraGrande'] as const;
const letraLector = () => Math.min(2, Math.max(0, Number(localStorage.getItem('estudio.lector.letra') ?? 1) || 0));
const claseLector = () => `letra-${letraLector()}`;

/**
 * El modo enfoque, uno solo para un documento y para la misión: un velo cubre toda la pantalla, también la cabecera, y
 * desenfoca todo lo de alrededor; lo de ahora queda nítido en una ventana al centro, ancha. En «Documentos», la idea
 * que toca leer (lo demás del documento se pliega, no se desenfoca); en «Misiones», la tarjeta de tu misión de ahora
 * (no es un diálogo: sus pasos llevan a otras partes del Studio). Se pone con su botón, arriba a la derecha, y se quita
 * con la salida, que flota encima del velo en ese mismo lugar (salir está donde se entró), o con su atajo junto a la
 * cara del director; Esc para salir. Donde no aplica, ni el botón ni el atajo se ven. Se mantiene al navegar (nota de
 * voz del titular nmvog4cd2tit, 25 de octubre de 2026): si la persona lo puso, cada lugar al que va donde aplica (el
 * documento al que lleva un paso, la tarjeta de su misión al volver) se abre ya enfocado, y donde no aplica no se
 * fuerza; si lo quita, queda quitado en todas partes. Es de esta visita: la recarga del final de una revisión lo
 * apaga. Lo enfocado: «documento» (el abierto), el ancla de la tarjeta de tu misión de ahora («mision-<id>») o nada ('').
 */
let enfoque = '';
/** Si la persona trabaja en el modo enfoque: lo cambian solo sus botones, su atajo y Esc (quererEnfoque). */
let enfoqueQuerido = false;
/**
 * Al abrir un documento en una parte que ya leíste (un paso que lleva a mirar algo ahí), el enfoque no se pone solo:
 * mostraría la idea por leer, no lo que el paso pide mirar.
 */
let enfoqueAlAbrir = true;
/** Lo que se puede enfocar aquí, con la misma forma: así, si la misión enfocada deja de ser la de ahora, ya no coincide. */
const queEnfocar = () =>
  vista === 'documentos' && doc ? 'documento' : (vista === 'misiones' && $('vista').querySelector<HTMLElement>('.mision-c.sigue.mia')?.dataset.ancla) || '';
const etiquetaEnfoque = (si: boolean) => tx(si ? 'enfoque.salir' : 'enfoque.modo');
const tituloEnfoque = (si: boolean, aqui: string) =>
  tx(si ? 'enfoque.tituloSalir' : aqui === 'documento' ? 'enfoque.tituloIdea' : 'enfoque.tituloMision');
/** Lo que dura la salida del velo (director.css › .velo-zen): mientras tanto, lo que estaba enfocado sigue encima de él. */
const MS_VELO = 600;
let saliendo: ReturnType<typeof setTimeout> | undefined;

/** El velo, el botón de arriba, la salida y el atajo, al día: al pintar (si lo enfocado ya no está, el enfoque se apaga) y al ponerlo o quitarlo. */
function aplicarEnfoque() {
  const aqui = queEnfocar();
  const antes = enfoque;
  // Lo enfocado cambió de lugar (se navegó): si la persona trabaja enfocada y aquí aplica, sigue enfocada aquí
  if (enfoque !== aqui) enfoque = enfoqueQuerido && (aqui !== 'documento' || enfoqueAlAbrir) ? aqui : '';
  // Nunca una ventana vacía: un documento sin nada por leer no tiene idea que enfocar, y el enfoque se apaga
  if (enfoque === 'documento' && nadaPorLeer()) enfoque = '';
  const html = document.documentElement;
  const estaba = html.classList.contains('enfoque') || html.classList.contains('enfoque-mision');
  html.classList.toggle('enfoque', enfoque === 'documento');
  html.classList.toggle('enfoque-mision', enfoque.startsWith('mision-'));
  if (estaba && !enfoque) {
    html.classList.add('enfoque-saliendo');
    clearTimeout(saliendo);
    saliendo = setTimeout(() => html.classList.remove('enfoque-saliendo'), MS_VELO);
  } else if (enfoque) html.classList.remove('enfoque-saliendo');
  // El de arriba, la salida y el atajo dicen lo mismo y cambian en su sitio. La salida solo está con el enfoque puesto,
  // y el de arriba queda entonces bajo el velo: el foco del teclado pasa de uno al otro (el del atajo se queda)
  const si = !!enfoque;
  const conFoco = document.activeElement?.closest('[data-enfoque]');
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-enfoque]')) {
    b.hidden = b.classList.contains('salida-enfoque') ? !si : !aqui;
    // En «Hoy», sin el enfoque puesto, el botón central lo oprime: abre tu misión de ahora en modo enfoque (siguiente.ts › ENFOCAR_EN_HOY)
    b.toggleAttribute('data-central-enfoque', !si && aqui.startsWith('mision-') && !b.classList.contains('salida-enfoque'));
    b.setAttribute('aria-pressed', String(si));
    b.title = tituloEnfoque(si, aqui);
    if (b.classList.contains('atajo')) {
      b.dataset.etiqueta = etiquetaEnfoque(si);
      b.setAttribute('aria-label', etiquetaEnfoque(si));
      b.classList.toggle('activo', si);
    } else b.querySelector('span')!.textContent = etiquetaEnfoque(si);
  }
  if (conFoco && !conFoco.classList.contains('atajo')) document.querySelector<HTMLElement>(si ? '.salida-enfoque' : '#mando [data-enfoque]')?.focus();
  // La niebla de lectura es para leer lo que escribe el modelo: su atajo solo se ve con el enfoque puesto o con «¿Dónde
  // quedamos?» abierto (nota de voz del titular, 24 de octubre de 2026), y se recuerda encendida o apagada en este
  // navegador (guiaLectura.ts la pone en lo que se lee de esa ventana)
  const paraLeer = si || !!document.querySelector('dialog.donde-quedamos[open]');
  const niebla = paraLeer && nieblaPuesta();
  html.classList.toggle('niebla-lectura', niebla);
  // La nube va también arriba de la ventana de lectura, junto a su ▶ (guiaLectura.ts › controlAuto): esa ya se ve solo ahí
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-niebla]')) {
    if (b.classList.contains('atajo')) b.hidden = !paraLeer;
    else b.setAttribute('aria-label', tx(niebla ? 'enfoque.quitarNiebla' : 'enfoque.grupoNiebla'));
    b.setAttribute('aria-pressed', String(niebla));
    b.classList.toggle('activo', niebla);
    b.dataset.etiqueta = tx(niebla ? 'enfoque.quitarNiebla' : 'enfoque.grupoNiebla');
  }
  ubicarEnfoque();
  // La línea del pie de la ventana se pinta con el ancho que tiene ahora (sin el enfoque no se ve, y guarda su dibujo)
  if (si !== !!antes) requestAnimationFrame(() => repintarLineaViva());
  // Un documento que se abrió ya enfocado se lee desde la idea que toca, como al poner el enfoque
  if (enfoque === 'documento' && antes !== 'documento') requestAnimationFrame(() => centrarIdea());
}
/** Lo enfocado en la página: la ventana del documento o la tarjeta de tu misión de ahora (sin enfoque, nada). */
function cajaEnfocada() {
  if (enfoque === 'documento') return document.querySelector<HTMLElement>('.docs > .lector');
  return enfoque ? $('vista').querySelector<HTMLElement>(`.mision-c.sigue[data-ancla="${CSS.escape(enfoque)}"]`) : null;
}
/**
 * En el enfoque no hay franja arriba (nota del titular, 22 de octubre): el velo lo cubre todo, también la cabecera, y
 * la salida flota encima en el lugar exacto del botón de la cabecera, que queda bajo el velo sin verse. Lo enfocado va
 * al centro de la pantalla; solo si la salida le quedaría encima, empieza justo debajo de ella (--enfoque-arriba). En
 * el teléfono no hay salida arriba: se sale con el atajo.
 */
function ubicarEnfoque() {
  const html = document.documentElement;
  const salida = document.querySelector<HTMLElement>('.salida-enfoque');
  const arriba = $('mando').querySelector<HTMLElement>('.boton-enfoque');
  const caja = cajaEnfocada();
  if (caja !== enfocadaMedida) {
    if (enfocadaMedida) medirEnfocada?.unobserve(enfocadaMedida);
    if (caja) medirEnfocada?.observe(caja);
    enfocadaMedida = caja;
  }
  if (!salida || !arriba?.offsetWidth || !caja || innerWidth < 760) {
    // Sin donde medirla, la salida vuelve a su lugar del CSS: nunca se queda donde la dejó una medida vieja
    salida?.style.removeProperty('top');
    salida?.style.removeProperty('right');
    html.style.removeProperty('--enfoque-arriba');
    html.style.removeProperty('--franja-pie');
    return;
  }
  const r = rectaEnPagina(arriba.getBoundingClientRect());
  // Si la cabecera quedó fuera de la ventana (se entró con la página bajada), la salida va arriba a la derecha (escala.ts › lugarDeLaSalida)
  const lugar = lugarDeLaSalida(r, anchoDeVentana(), altoDeVentana());
  salida.style.top = `${lugar.top}px`;
  salida.style.right = `${lugar.right}px`;
  const c = rectaEnPagina(caja.getBoundingClientRect());
  const debajo = c.left < anchoDeVentana() - lugar.right + 12 && c.right > anchoDeVentana() - lugar.right - r.width - 12;
  html.style.setProperty('--enfoque-arriba', `${debajo ? Math.ceil(lugar.abajo + 12) : 24}px`);
  pegarFranja(caja);
}
/**
 * La ventana enfocada y la línea de su pie se centran juntas en el alto de la pantalla (nota de voz del titular
 * nmvtn6ypetit, 29 de octubre de 2026): el CSS centra la ventana en el alto que le deja la franja, que es lo mismo que
 * centrar las dos juntas, y aquí la franja se pega a su borde de abajo (--franja-pie, la distancia de ella al pie de la
 * pantalla), se vea la línea o solo su botón. Si la ventana llena el alto, queda a 24 px del pie, como antes.
 */
function pegarFranja(caja: HTMLElement) {
  const franja = document.querySelector<HTMLElement>('.franja-linea');
  const html = document.documentElement;
  if (!franja?.offsetHeight) {
    html.style.removeProperty('--franja-pie');
    return;
  }
  const c = rectaEnPagina(caja.getBoundingClientRect());
  html.style.setProperty('--franja-pie', `${Math.max(0, Math.round(altoDeVentana() - c.bottom - franja.offsetHeight))}px`);
}
/** Lo enfocado cambia de alto (se marca un paso, se abre una idea): la franja lo sigue. */
let enfocadaMedida: HTMLElement | null = null;
const medirEnfocada = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { if (enfoque) ubicarEnfoque(); });
// Y la franja de la línea, que crece hacia arriba con las cabecitas (lineaViva.ts › altoParaRamas): la ventana sube con ella
const franjaMedida = document.querySelector('.franja-linea');
if (franjaMedida) medirEnfocada?.observe(franjaMedida);
/** Pone o quita el enfoque en lo que se puede enfocar aquí (la tarjeta de la misión ya queda al centro, en su ventana). */
function ponerEnfoque(si: boolean) {
  enfoque = si ? queEnfocar() : '';
  // Un documento ya leído entero no tiene idea que enfocar: se dice, en vez de abrir una ventana vacía
  if (enfoque === 'documento' && nadaPorLeer()) avisar(tx('enfoque.nadaPorEnfocar'), true);
  aplicarEnfoque();
  // El seguro de «Entendido» solo existe en el enfoque: la idea de ahora lo toma o lo suelta en este momento
  if (vista === 'documentos' && doc) pintar();
  if (enfoque === 'documento') centrarIdea();
}
/** La persona pone o quita el enfoque: queda así al navegar, en cada lugar donde aplica (aplicarEnfoque). */
function quererEnfoque(si: boolean) {
  enfoqueQuerido = si;
  enfoqueAlAbrir = true;
  ponerEnfoque(si);
}
/** Lleva al centro de la pantalla la idea que toca leer (en el modo enfoque, o al marcar la anterior). */
function centrarIdea() {
  const idea = document.querySelector<HTMLElement>('.lector .trozo.actual');
  if (!idea) return;
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const como: ScrollBehavior = quieto ? 'auto' : 'smooth';
  if (enfoque === 'documento') {
    // Se carga donde se va leyendo (nota de voz del titular, 24 de octubre de 2026): con la niebla de lectura, si la idea
    // ya tenía avance, en el renglón donde iba el director; si no, desde su principio. Una idea más alta que la ventana
    // tampoco se centra (empezaría a medio párrafo): va arriba, justo bajo la franja y el título de la parte
    const ventana = idea.closest<HTMLElement>('.lector');
    const va = dondeVa(idea);
    if (ventana && va) {
      // `va` (guiaLectura.ts › cajaDe) y el rectángulo, en píxeles de la página, que es en lo que se desplaza la ventana
      const v = rectaEnPagina(ventana.getBoundingClientRect());
      ventana.scrollBy({ top: va.y + va.alto / 2 - (v.top + v.height * 0.45), behavior: como });
    } else if (ventana && nieblaPuesta()) {
      // Con la niebla, una idea sin destapar se carga siempre desde arriba, de una vez (nota de voz del titular
      // nmvoby2uvtit, 25 de octubre de 2026: la parte siguiente se abría con el desplazamiento de la anterior, a media niebla)
      idea.scrollIntoView({ block: 'start', behavior: 'auto' });
    } else idea.scrollIntoView({ block: ventana && idea.offsetHeight > ventana.clientHeight * 0.6 ? 'start' : 'center', behavior: como });
  } else {
    // Fuera del enfoque solo se mueve si la idea quedó fuera de la vista
    const r = idea.getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight) idea.scrollIntoView({ block: 'center', behavior: quieto ? 'auto' : 'smooth' });
  }
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && enfoque && !document.querySelector('dialog[open]')) quererEnfoque(false);
});
// En todo el documento, como el del tema: el botón de arriba está en la cabecera, y el atajo, junto a la cara del director
document.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('[data-enfoque]')) quererEnfoque(!enfoque);
  else if ((e.target as HTMLElement).closest('[data-niebla]')) {
    ponerNiebla(!nieblaPuesta());
    aplicarEnfoque();
  } else if ((e.target as HTMLElement).closest('[data-franja-linea]')) ponerLineaEnfoque(!lineaEnfoquePuesta());
});

/**
 * La línea viva al pie de la ventana del enfoque (linea-en-enfoque.md, decisiones nmvtm8pdmtit y nmvtm9ghltit): viene
 * encendida y su botón la oculta o la muestra; se recuerda en este computador. Al cambiar, la ventana se ajusta al espacio
 * (director.css › .franja-linea) y la línea se repinta con el ancho que le queda.
 */
const CLAVE_LINEA_ENFOQUE = 'estudio.lineaEnfoque';
const lineaEnfoquePuesta = () => localStorage.getItem(CLAVE_LINEA_ENFOQUE) !== '0';
function ponerLineaEnfoque(si: boolean) {
  localStorage.setItem(CLAVE_LINEA_ENFOQUE, si ? '1' : '0');
  document.documentElement.classList.toggle('linea-enfoque-oculta', !si);
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-franja-linea]')) {
    b.textContent = tx(si ? 'enfoque.ocultarLinea' : 'enfoque.mostrarLinea');
    b.setAttribute('aria-pressed', String(si));
    b.title = tx(si ? 'enfoque.ocultarLineaTitulo' : 'enfoque.mostrarLineaTitulo');
  }
  // Al mostrarla o al ocultarla, la ventana y la franja se vuelven a centrar juntas (ubicarEnfoque › pegarFranja)
  requestAnimationFrame(() => {
    repintarLineaViva();
    if (enfoque) ubicarEnfoque();
  });
}
ponerLineaEnfoque(lineaEnfoquePuesta());
addEventListener('resize', () => repintarLineaViva());

/**
 * El botón del modo enfoque, arriba a la derecha junto al del tema: el mismo para un documento y para la misión. Donde
 * el enfoque no aplica no se ve (aplicarEnfoque lo pone al día cuando la sección ya está pintada).
 */
function botonEnfoque() {
  const aqui = queEnfocar();
  const si = !!enfoque;
  return `<button type="button" class="boton-suave boton-enfoque" data-enfoque aria-pressed="${si}" title="${tituloEnfoque(si, aqui)}"${aqui ? '' : ' hidden'}>${icono('enfoque')}<span>${etiquetaEnfoque(si)}</span></button>`;
}

/** Arriba del documento, en una sola franja: cómo se termina de leer y el tamaño de la letra (y, en el enfoque, el tema). */
/**
 * El documento al que se llegó con el botón de un paso de una misión (o con «Continuar misión»): mientras siga abierto,
 * lleva «← Volver a tu misión» (nota del titular, 22 de octubre de 2026). Flota abajo, al centro, siempre en el mismo
 * lugar y encima del velo del enfoque, con lo que se hace al volver (pd_volver_flotante; notas de voz del titular
 * nmvofxfv0tit y nmvog4cd2tit, 25 de octubre de 2026: no había cómo regresar sin buscar). Abrir otro documento lo deja atrás.
 * Lo mismo cuando el paso lleva a otra sección del Studio (una fase en «La ruta», Proyecto, «Modelo y consumo»): mientras
 * sigas en ella, el botón flota igual (nota de voz del titular nmvok784vtit: fue a ver una fase y no tenía cómo volver a
 * responder lo que decidió).
 */
// Sobrevive a la recarga del final de una revisión (o de una urgencia), que lo borraba a mitad del paso: la persona
// quedaba en el Buzón sin cómo volver (nota de voz del titular nmvsze1tytit, 28 de octubre de 2026). Esta pestaña lo guarda
const CLAVE_DESDE_MISION = 'estudio.director.desde-mision';
let desdeMision: DesdeMision | null = (() => {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE_DESDE_MISION) ?? 'null');
  } catch {
    return null;
  }
})();
const recordarDesdeMision = () => {
  try {
    if (desdeMision) sessionStorage.setItem(CLAVE_DESDE_MISION, JSON.stringify(desdeMision));
    else sessionStorage.removeItem(CLAVE_DESDE_MISION);
  } catch {
    /* sin almacenamiento, vale solo mientras no se recargue */
  }
};
const botonVolverMision = (id: string | undefined) => {
  const m = id ? d.plan.misiones.find((x) => x.id === id) : undefined;
  return m ? `<button type="button" class="volver-flotante" data-volver-mision="${esc(m.id)}" title="${esc(tx('volver.titulo', { titulo: m.titulo }))}"><b>← ${tx('paso.volverMision')}</b><small>${tx('volver.ahi')}</small></button>` : '';
};
// En «Documentos»: sobre el documento del paso o, si el paso llevó a la sección sin nombrar uno, sobre el que abras ahí
const volverAMisionDe = (ruta: string | null) => botonVolverMision(flotaVolver(desdeMision, 'documentos', ruta) ? desdeMision?.id : undefined);
/** La sección a la que lleva un destino, con los cambios de lugar que hace ir(). */
const vistaDeDestino = (dest: Destino): Vista | undefined =>
  dest.vista === 'proyecto' && dest.ancla === 'p-director' ? 'modelo' : dest.vista === 'diagnostico' ? 'proyecto' : dest.vista;

function ajustesLector(ruta: string) {
  const letra = letraLector();
  return `<div class="ajustes-lector">${leidoDoc(ruta)}
    <div class="opciones-lector" role="group" aria-label="${esc(tx('docs.comoLeer'))}">
      ${controlesEnfoque({
        tema: `${botonTema()}<span class="tamanos-letra">${LETRAS.map((clave, i) => `<button type="button" class="tamano-letra t${i}${i === letra ? ' sel' : ''}" data-letra="${i}" aria-pressed="${i === letra}" title="${esc(tx(clave))}">A</button>`).join('')}</span>`,
        niebla: controlAuto('niebla'),
        narracion: controlAuto('voz'),
        sonido: botonSonido(),
      })}
    </div>
  </div>`;
}

/** El tema de todo el Studio, claro u oscuro (de este navegador). Arriba, junto a «¿Dónde quedamos?», siempre a mano. */
const temaOscuro = () => (localStorage.getItem('estudio.tema') ?? localStorage.getItem('estudio.lector.tema')) === 'oscuro';
const aplicarTema = () => document.documentElement.classList.toggle('oscuro', temaOscuro());
const botonTema = () => {
  const oscuro = temaOscuro();
  return `<button type="button" class="boton-suave boton-tema" data-tema aria-pressed="${oscuro}" title="${esc(tx(oscuro ? 'tema.aClaro' : 'tema.aOscuro'))}" aria-label="${esc(tx(oscuro ? 'tema.claro' : 'tema.oscuro'))}">${icono(oscuro ? 'sol' : 'luna')}</button>`;
};
aplicarTema();
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-tema]');
  if (!b) return;
  localStorage.setItem('estudio.tema', temaOscuro() ? 'claro' : 'oscuro');
  aplicarTema();
  // Hay uno arriba y otro en la ventana del enfoque: los dos cambian de icono, y el foco se queda en el que se tocó
  const todos = [...document.querySelectorAll<HTMLElement>('[data-tema]')];
  const cual = todos.indexOf(b);
  todos.forEach((x) => (x.outerHTML = botonTema()));
  document.querySelectorAll<HTMLElement>('[data-tema]')[cual]?.focus();
});

/**
 * Los pasos de las misiones abiertas de alguien (tú, si no se dice) que piden leer este documento entero (no una parte
 * suya, que suele pedir decidir, ni uno que pide elegir: ese se marca al elegir, pr_paso_que_elige).
 */
function pasosDeLeer(ruta: string, persona: Persona | undefined = d.identidad.rol ?? undefined): { m: Mision; i: number; hecho: boolean }[] {
  if (!persona) return [];
  return abiertasDe(persona)
    .filter((m) => m.para === persona)
    .flatMap((m) => m.pasos.map((p, i) => ({ m, i, p })))
    .filter(({ p }) => pideLeerEntero(p, ruta))
    .map(({ m, i }) => ({ m, i, hecho: pasosHechos(m.id).includes(i) }));
}

/**
 * El guardrail de la lectura: un paso que manda a leer un documento no se marca a mano mientras no se haya leído, parte
 * por parte (si no, se podría dar por leído sin abrirlo). Si nombra una parte (suele ser para decidir), basta con marcar
 * esa parte como leída o con haberla comentado o respondido. Dice qué falta y a dónde ir, o null si se puede marcar.
 */
async function faltaLeer(id: string, i: number): Promise<{ texto: string; ir: Destino } | null> {
  const yo = d.identidad.rol;
  const p = d.plan.misiones.find((m) => m.id === id)?.pasos[i];
  if (!yo || !p || typeof p === 'string' || !p.ir?.doc) return null;
  const ruta = p.ir.doc;
  const titulo = tituloDoc(ruta);
  const parte = p.ir.seccion ? textoPlano(p.ir.seccion) : null;
  if (parte ? leidasDe(ruta).includes(parte) : d.estado.leidos?.[claveLeido(yo, ruta)]?.completo) return null;
  // «Listo, ya lo hice» lo da por leído si no le queda nada por decidir (t_decide_listo_lectura): tú sabes si ya lo
  // conoces. Lo que pide decidir sigue pidiendo su respuesta. Sin el texto a mano, se trae; si no llega, se lee
  const texto = doc?.ruta === ruta ? doc.texto : await fetch(`/__estudio/director/documento?ruta=${encodeURIComponent(ruta)}`).then((r) => (r.ok ? r.json() : null)).then((x) => (x?.texto as string | undefined) ?? null).catch(() => null);
  if (texto === null) return { texto: tx('paso.faltaLeer', { titulo }), ir: { doc: ruta, ...(p.ir.seccion ? { seccion: p.ir.seccion } : {}), etiqueta: titulo } };
  const porDecidir = parteConDecisionPendiente(secciones(texto), (s, x) => respondiste(ruta, s, x), parte);
  return porDecidir ? { texto: tx('paso.faltaDecidir', { parte: porDecidir }), ir: { doc: ruta, seccion: porDecidir, etiqueta: titulo } } : null;
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
  if (yaLeido(ruta, yo)) return `<p class="leido-doc hecho">${icono('check')}<span>${tx('docs.leidoHecho')}</span></p>`;
  return `<p class="leido-doc">${icono('estrella')}<span>${tx('docs.comoSeLee')}</span></p>`;
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
    sonar('desarme');
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
  // Si se leía en el modo enfoque: al terminar, no queda idea que enfocar y se vuelve a la misión (antes de pintar,
  // que apaga el enfoque sin nada por leer)
  const enEnfoque = enfoque === 'documento';
  const todas = partesDeDocumento(doc.texto);
  const leidas = new Set(leidasDe(ruta));
  const trozos = trozosLeidos(ruta);
  if (leidas.has(titulo)) {
    // Quitar la marca es volver a leerla: sus ideas vuelven a quedar por marcar
    leidas.delete(titulo);
    for (const t of [...trozos]) if (t.startsWith(`${titulo}§`)) trozos.delete(t);
  } else {
    leidas.add(titulo);
    sonar('parte');
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
    if (leidas.has(titulo)) {
      decir(tx('leido.parteMenos'), 'feliz');
      // La parte que se abre se lee desde su primera idea, no desde donde quedó el desplazamiento de la anterior
      centrarIdea();
    }
    await guardado;
    // Releído entero en el enfoque: nunca una ventana vacía, se vuelve a la misión
    if (completo && enEnfoque) volverAMision();
    return;
  }
  // La última parte: el paso que pedía leerlo queda hecho y, si era el último, la misión se entrega sola
  const pasos = pasosDeLeer(ruta).filter((x) => !x.hecho);
  if (!(await guardado)) return;
  const marcados = pasos.map((x) => ({ id: x.m.id, guardado: marcarPaso(x.m.id, x.i, true, 'leido_entero') }));
  // En el enfoque, el velo se va antes de lo que sigue (la celebración de la misión o la misión misma)
  if (enEnfoque && enfoque) ponerEnfoque(false);
  pintar();
  for (const x of marcados) if (await completarSiToca(x.id, x.guardado)) return void decir(tx('mision.completadaDirector'), 'riendo');
  // Leído en el modo enfoque: sin diálogo de por medio, de vuelta a la tarjeta de tu misión, con el paso de leer ya
  // marcado y el siguiente a la vista (captura del titular, 22 de octubre de 2026: quedaba una ventana vacía)
  if (enEnfoque) {
    decir(tx('leido.puntaASeguimos'), 'feliz');
    return volverAMision();
  }
  await documentoTerminado(ruta, marcados.length > 0);
}

/**
 * De un documento terminado a la tarjeta de tu misión de ahora (sin misión abierta, a «Hoy»): el enfoque del documento
 * se quita y, si la persona trabaja enfocada, la tarjeta se abre enfocada (aplicarEnfoque).
 */
function volverAMision() {
  if (enfoque) ponerEnfoque(false);
  const mia = abiertasDe(d.identidad.rol ?? TITULAR)[0];
  const sigue = mia ? tarjetaDe(mia) : null;
  if (sigue) void ir(sigue);
  else irA('misiones');
}

/**
 * Si el documento abierto ya no tiene nada por leer para ti (todas sus partes por leer están leídas): en el modo
 * enfoque no quedaría idea que mostrar, solo una ventana vacía. Un documento sin partes (AGENTS.md) se lee entero, en
 * su única parte, sin título: también cuenta (nota de voz del titular nmvvkncc1tit, 30 de octubre de 2026).
 */
function nadaPorLeer(): boolean {
  if (!doc || !d.identidad.rol) return false;
  const ruta = doc.ruta;
  const paraLeer = new Set(partesDeDocumento(doc.texto));
  const leidas = new Set(leidasDe(ruta));
  const porLeer = secciones(doc.texto).filter((s) => paraLeer.has(s.titulo));
  return porLeer.length > 0 && porLeer.every((s) => leidas.has(s.titulo) && !reabierta(ruta, s));
}

/** Terminaste de leer un documento: se celebra y vuelves a tu misión, con lo que sigue listo para empezar. */
async function documentoTerminado(ruta: string, conPaso: boolean) {
  const mia = abiertasDe(d.identidad.rol ?? TITULAR)[0];
  const sigue = mia ? tarjetaDe(mia) : null;
  decir(tx('leido.punta'), 'feliz');
  const dlg = document.createElement('dialog');
  dlg.className = 'dialogo-director celebracion';
  dlg.innerHTML = `<form method="dialog">
    ${quieto() ? '' : `<div class="confeti" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>`}
    <span class="etiqueta">${tx('leido.etiqueta')}</span>
    <h2>${tx('leido.bienHecho')}</h2>
    <ul class="cumplidas"><li>${icono('estrella')}<span>${esc(tituloDoc(ruta))}</span></li></ul>
    <p class="como">${tx(conPaso ? 'leido.pasoHecho' : 'leido.marcaste')} ${tx('leido.comentaste')}</p>
    ${mia ? `<div class="mision-a"><span class="etiqueta">${tx('leido.tuMision')}</span><b>${esc(mia.titulo)}</b></div>` : ''}
    <div class="botones"><button type="button" data-cerrar autofocus title="${esc(tx('leido.verEnteroTitulo'))}">${tx('leido.verEntero')}</button>${sigue ? `<button type="button" class="primario" data-seguir data-siguiente>${tx('mision.irAMiMision')}</button>` : ''}</div>
  </form>`;
  document.body.append(dlg);
  dlg.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (b?.dataset.seguir === undefined && b?.dataset.cerrar === undefined) return;
    dlg.close();
    if (b.dataset.seguir !== undefined && sigue) void ir(sigue);
  });
  // Leído entero, ya no hay idea que enfocar: el enfoque se apaga y queda el documento completo a la vista
  dlg.addEventListener('close', () => {
    dlg.remove();
    if (enfoque) ponerEnfoque(false);
    if (vista === 'documentos') window.scrollTo({ top: 0, behavior: quieto() ? 'auto' : 'smooth' });
  });
  dlg.showModal();
}

/**
 * Una parte de documento ya en HTML. Si es de decisiones, cada punto de su lista lleva su propio botón para responderlo
 * (escrito o en audio) y, debajo, lo que ya se dijo de él y la respuesta del director.
 */
function conDecisiones(titulo: string, md: string, notas: Nota[]): string {
  const html = limpio(marked.parse(md, { async: false }) as string, true, doc!.ruta);
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
  if (seMideSolo(c)) {
    const meta = c.meta ?? 100;
    const valor = ev.valor === null ? tx('ruta.sinDatos') : tx('ruta.pctMeta', { valor: ev.valor, meta });
    medida = `<div class="medida-c"><span class="auto" title="${tx('ruta.seMideSoloTitulo')}">${tx('ruta.seMideSolo')}</span>
      <div class="barra-medida"><div style="width:${(Math.min(1, ev.valor === null ? 0 : ev.valor / meta) * 100).toFixed(1)}%"></div></div><span>${valor}</span></div>`;
  }
  const firma = ev.marca
    ? `<div class="firma">${tx('ruta.decisionDe', { quien: esc(ev.marca.quien), fecha: fecha(ev.marca.fecha), estado: tx(ev.marca.estado === 'no_aplica' ? 'ruta.noAplica' : 'ruta.cumplido') })}${ev.marca.nota ? ` · ${esc(ev.marca.nota)}` : ''}</div>`
    : ev.evaluacion ? `<div class="firma">${tx('ruta.elDirectorFecha', { fecha: fecha(ev.evaluacion.fecha), estado: tx(ev.evaluacion.estado === 'no_aplica' ? 'ruta.noAplica' : 'ruta.cumplido') })} · ${esc(ev.evaluacion.nota)}</div>`
    : ev.por === 'indicador' ? `<div class="firma">${tx('ruta.seCumplioSolo')}</div>`
    : `<div class="firma">${tx('ruta.loEvalua')}</div>`;
  const botones = titular()
    ? ev.marca ? `<button type="button" data-desmarcar="${esc(c.id)}" title="${tx('ruta.deshacerTitulo')}">${tx('ruta.deshacerDecision')}</button>`
      : `<button type="button" data-decidir="${esc(c.id)}" title="${tx('ruta.decidirTitulo')}">${tx('ruta.decidirYo')}</button>`
    : '';
  return `<li class="criterio ${clase}"><span class="marca">${icono}</span>
    <div><div class="que">${esc(c.texto)}</div>${c.como ? `<div class="como">${esc(c.como)}</div>` : ''}${medida}${firma}</div>
    <div class="botones-c">${botones}<button type="button" class="al-director" data-comentar="criterio|${esc(c.id)}">${tx('criterio.comentar')}</button></div></li>`;
}

function pintarPuerta(f: Fase) {
  // Una fase permanente, sin puerta que cruzar (la del proyecto STL Studio de quien instala)
  if (f.sinCierre) return '';
  const cierre = d.estado.cierres[f.id];
  if (cierre) {
    return `<div class="puerta abierta" data-ancla="puerta"><div class="cabeza-p"><b>${tx('ruta.puerta', { nombre: esc(f.puerta.nombre) })}${conAyuda('puerta')}</b><span class="chip foco">${tx('ruta.cruzada')}</span></div>
      <p>${esc(f.puerta.prueba)}</p>
      <p>${tx('ruta.cruzadaEl', { fecha: fecha(cierre.fecha), quien: esc(cierre.quien) })}${cierre.nota ? ` ${esc(cierre.nota)}` : ''}</p>
      ${titular() ? `<div class="acciones-p"><button type="button" data-reabrir="${esc(f.id)}">${tx('ruta.reabrir')}</button></div>` : ''}</div>`;
  }
  const bloqueos = motivosDePuerta(f, ctx()).map((m) =>
    m.que === 'antes' ? tx('ruta.antes', { nombre: m.nombre })
    : m.que === 'cerrada' ? tx('ruta.yaCerrada')
    : tx('ruta.faltan', { n: m.criterios.length, criterios: m.criterios.map((c) => `«${c}»`).join(', ') }));
  return `<div class="puerta" data-ancla="puerta"><div class="cabeza-p"><b>${tx('ruta.puerta', { nombre: esc(f.puerta.nombre) })}${conAyuda('puerta')}</b><span class="chip">${bloqueos.length ? tx('ruta.cerrada') : tx('ruta.recomiendaCruzar')}</span></div>
    <p>${esc(f.puerta.prueba)}</p>
    ${bloqueos.length ? `<ul class="bloqueos">${bloqueos.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
    <div class="acciones-p">${
      titular()
        ? `<button type="button" class="primario" data-cruzar="${esc(f.id)}"${bloqueos.length ? ' disabled' : ''}>${tx('ruta.cruzar')}</button>`
        : `<span class="nota-rol">${tx('ruta.laCruzaTitular')}</span>`
    }</div></div>`;
}

/**
 * Una misión aprobada, para releerla en «La ruta» (nota de voz del titular, 22 de octubre de 2026: quiso volver a lo que
 * comentó en una misión pasada y no supo dónde): sus pasos con lo que eligió, lo que comentó sobre ella con la respuesta
 * del director, su entrega y el veredicto. Solo se lee: lo entregado no vuelve atrás (pregunta del titular nmvt4w3wgtit,
 * 29 de octubre de 2026); lo nuevo que quiera decir va al Buzón, como una nota nueva. Es también el resumen que despliega
 * una misión entregada que espera al director.
 */
function misionPasada(m: Mision) {
  const rev = d.plan.revisiones[m.id];
  const ent = d.estado.entregas[m.id];
  // Una elección con un clic ya se ve en su paso: aquí van las notas con algo dicho
  const notas = d.estado.notas
    .filter((n) => n.sobre.tipo === 'mision' && n.sobre.id === m.id && !(n.sobre.eleccion && !n.audio && (n.texto ?? '').trim() === n.sobre.eleccion))
    .sort((a, b) => a.cuando.localeCompare(b.cuando));
  // Sin su porQue, como la tarjeta de ahora (missionCard.ts › enunciadoDeMision; notas nmw3s0bahtit y nmw3s3ux2tit)
  return `<div class="cuerpo-pasada">
    ${m.pasos.length ? listaDePasos(m, false, m.pasos.map((_, i) => i)) : ''}
    <p class="entrega"><b>${tx('mision.entrega')}</b> ${esc(m.entrega)}</p>
    ${ent ? `<div class="entregada-m"><span class="como">${tx('mision.entregadaPor', { quien: esc(ent.quien), cuando: momento(ent.cuando) })}</span>${ent.nota ? `<p>${esc(ent.nota)}</p>` : ''}${audioYTexto(ent.audio)}</div>` : ''}
    ${notas.length ? `<h4>${tx('ruta.comentaste')}</h4><ul class="notas-lista">${notas.map((n) => tarjetaNota(n)).join('')}</ul>` : ''}
    ${rev ? `<div class="veredicto ${rev.veredicto}"><b>${tx(rev.veredicto === 'aprobada' ? 'ruta.aprobo' : 'ruta.pidioRehacer')}</b> ${esc(rev.comentario)}</div>` : ''}
  </div>`;
}

/**
 * Una propuesta en «La ruta», como resumen: su título, su estado (aceptada no basta: dice si ya está hecha o sigue por
 * hacer), el comienzo de su problema y, si su fase ya llegó, el botón a «Propuestas», el único lugar donde se lee entera
 * y se decide (notas de voz del titular nmvv3wl19tit y nmvv433cxtit, 30 de octubre de 2026: «no podemos tener dos
 * interfaces diferentes para el mismo fin»). Lo hecho trae su nota.
 */
function filaPropuesta(p: Propuesta) {
  const r = d.estado.propuestas[p.id];
  const hecha = d.plan.ejecutadas?.[p.id];
  const por = reemplazos(d.plan).get(p.id);
  const chip = !r ? `<span class="chip espera">${tx('ruta.porDecidir')}</span>`
    : r.estado !== 'aceptada' ? `<span class="chip">${NOMBRE_RESPUESTA[r.estado]}</span>`
    : hecha ? `<span class="chip">${tx('ruta.aceptadaHecha')}</span>`
    : por !== undefined ? chipReemplazado(d.plan, por)
    : `<span class="chip espera">${tx('ruta.aceptadaPorHacer')}</span>`;
  // Lo cerrado lleva su fecha y hora: cuando se hizo, o cuando se decidió si no se aceptó
  const cuando = cierreDePropuesta(p);
  const verla = faseAbierta(p.fase) ? ` ${botonIr({ vista: 'propuestas', ancla: `propuesta-${p.id}`, etiqueta: tx('ruta.verEnPropuestas') }, 'enlace')}` : '';
  return `<li class="propuesta-resumen" data-ancla="propuesta-${esc(p.id)}"><b>${esc(p.titulo)}</b> ${chip}${cuando ? ` <span class="como cuando-hecha">${momento(cuando)}</span>` : ''}${verla}<p class="como">${esc(recortar(p.problema, 160))}</p>${hecha ? `<p class="como"><b>${tx('ruta.hecha')}</b> ${esc(hecha.nota)}</p>` : ''}</li>`;
}

/**
 * Cuándo se cerró una propuesta: cuando se hizo (aceptada y ejecutada) o cuando se decidió que no (descartada o aplazada).
 * Sin fecha, la propuesta sigue por decidir o por hacer.
 */
function cierreDePropuesta(p: Propuesta): string | undefined {
  const hecha = d.plan.ejecutadas?.[p.id];
  if (hecha) return hecha.cuando;
  const r = d.estado.propuestas[p.id];
  return r && r.estado !== 'aceptada' ? r.fecha : undefined;
}

/** Las propuestas de una lista, lo por hacer primero y en su orden, y lo hecho o decidido aparte, lo más nuevo arriba. */
function listaDePropuestas(lista: Propuesta[]) {
  const fuera = reemplazos(d.plan);
  const { porHacer, hechas } = separarHechas(lista, (p) => !!d.plan.ejecutadas?.[p.id] || fuera.has(p.id) || (!!d.estado.propuestas[p.id] && d.estado.propuestas[p.id].estado !== 'aceptada'), cierreDePropuesta);
  return partesPorHacerYHechas(porHacer.map(filaPropuesta), hechas.map(filaPropuesta), tx('ruta.porDecidirYHacer'), tx('ruta.hechasYDecididas'));
}

/**
 * «La ruta» es ahora la pestaña auxiliar de «Hoy», «Datos del proceso» (pd_hoy_en_ruta): la misma barra delgada arriba, y
 * la fase elegida con sus pestañas, sin la barra grande, el tablero ni los frentes.
 */
function vistaRuta() {
  const f = d.plan.fases.find((x) => x.id === faseVista) ?? faseActual(d.plan, d.estado);
  return vistaHoyEnRuta({ fases: fasesEnBarra(), pestana: 'proceso', cuerpo: vistaRutaHtml({
    plan: d.plan, estado: d.estado, fase: f, abierta: faseAbierta(f.id), titular: nombreTitular(),
    personas: personasEquipo().map((id) => ({ id, nombre: nombrePersona(id) })),
    // La pestaña de cada fase la recuerda la página mientras viva; un ancla pendiente abre la que la tiene
    elegir: (visibles) => {
      const elegida = pestanaRutaElegida(pestanaDeFase.get(f.id), anclaPendiente, visibles);
      pestanaDeFase.set(f.id, elegida);
      return elegida;
    },
    rutaHTML: '', tableroFase: '', pintarPuerta, filaCriterio, listaDePropuestas, misionPasada, plegable,
  }) });
}

/** Cambia la pestaña de una fase y deja el foco en la nueva, para seguir con las flechas (el repintado lo habría perdido). */
function cambiarPestanaRuta(fase: string | undefined, id: string | undefined) {
  if (!fase || !pestanaRutaValida(id)) return;
  if (id !== (pestanaDeFase.get(fase) ?? 'fase')) {
    pestanaDeFase.set(fase, id);
    pintar();
  }
  $('vista').querySelector<HTMLElement>(`[data-pestana-ruta="${id}"]`)?.focus({ preventScroll: true });
}

// Con el teclado, entre las pestañas que se ven: flechas a los lados (dando la vuelta), Inicio y Fin
$('vista').addEventListener('keydown', (e) => {
  const pestana = (e.target as HTMLElement).closest<HTMLElement>('[data-pestana-ruta]');
  if (!pestana || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const visibles = [...(pestana.parentElement?.querySelectorAll<HTMLElement>('[data-pestana-ruta]') ?? [])].map((x) => x.dataset.pestanaRuta as PestanaRuta);
  const otra = pestanaRutaConTecla(pestana.dataset.pestanaRuta as PestanaRuta, e.key, visibles);
  if (!otra) return;
  e.preventDefault();
  cambiarPestanaRuta(pestana.dataset.faseDePestana, otra);
});

// ───────────────────────────────────────────── el proyecto: repositorio, contexto, objetivo y equipo

function vistaProyecto() {
  // Las sesiones de gh se piden una vez al abrir «Proyecto» (cada una le pregunta a GitHub), y otra con «Actualizar»
  if (sesionesGhDe !== d.activo) {
    // Otro proyecto, otra cuenta aprobada: la lista se pide de nuevo
    sesionesGhDe = d.activo;
    sesionesGh = null;
    sesionesGhPedidas = false;
  }
  if (titular() && d.repositorio.info && !sesionesGh && !sesionesGhPedidas) {
    sesionesGhPedidas = true;
    setTimeout(() => void cargarSesionesGh(), 0);
  }
  return vistaProyectoHtml({
    proyecto: d.proyecto, repositorio: d.repositorio, plan: d.plan, titular: titular(), yo: d.identidad.rol ?? undefined, nuevo: esNuevo(), borrador: borradorObjetivo,
    nombreTitular: nombreTitular(), correo: d.identidad.correo, subida: d.sincronizacion.subida?.mensaje ?? '', diagnostico: seccionDiagnostico(), plegable,
    sesionesGh,
  });
}

/** Las sesiones de gh del panel de «Dónde está» (nota nmw0vw3detit): lo último que dijo el servidor. */
let sesionesGh: PanelSesionesGh | null = null;
let sesionesGhPedidas = false;
let sesionesGhDe: string | null | undefined;
let siguiendoEntradaGh: ReturnType<typeof setInterval> | null = null;

async function cargarSesionesGh() {
  sesionesGh = { hayGh: true, aprobada: null, sesiones: [], entrada: null, ...(sesionesGh ?? {}), cargando: true };
  pintar();
  try {
    const r = await fetch('/__estudio/director/cuenta-git/sesiones');
    const j = await r.json();
    if (!r.ok) throw new Error(j.error ?? tx('nuevo.servidorRespondio', { estado: r.status }));
    sesionesGh = { cargando: false, hayGh: !!j.hayGh, aprobada: j.aprobada ?? null, sesiones: j.sesiones ?? [], entrada: j.entrada ?? null };
  } catch (err) {
    sesionesGh = null;
    avisar(esDeRed(err) ? SIN_SERVIDOR() : (err as Error).message);
  }
  pintar();
}

/** Mientras gh espera el código, el panel pregunta cada 5 segundos cómo va; al terminar, trae la lista otra vez. */
function seguirEntradaGh() {
  if (siguiendoEntradaGh) return;
  siguiendoEntradaGh = setInterval(async () => {
    try {
      const j = await (await fetch('/__estudio/director/cuenta-git/sesiones?entrada=1')).json();
      const e = j.entrada as EntradaGh | null;
      if (e?.estado === 'esperando') return;
      if (siguiendoEntradaGh) clearInterval(siguiendoEntradaGh);
      siguiendoEntradaGh = null;
      if (e?.estado === 'lista') avisar(tx('proyecto.sesionGhLista'), true);
      await cargarSesionesGh();
    } catch {
      // Sin servidor, se vuelve a preguntar en 5 segundos
    }
  }, 5000);
}


/**
 * Desde cuándo rige un cambio de modelo o de esfuerzo: el Studio lo escribe en la configuración de Claude Code y lo pasa
 * al lanzar al director cada vez, así que no hay que reiniciar nada (duda del titular, 21 de octubre de 2026).
 */
const cuandoRige = () => tx('guardado.cuandoRige');

/** Lo que el director necesita para trabajar con ultracode, dicho en el diálogo que pide el permiso. */
const PERMISO_ULTRACODE = () => tx('ultracode.permiso');

/** Un modo de los tres, de lo que trae el servidor o un botón; cualquier otra cosa es «Solo lo autorizado». */
const modoDe = (x: unknown): ModoPermisos => (x === 'pregunta' || x === 'automatico' ? x : 'autorizado');

/**
 * Lo que se le negó al director, para autorizarlo con una casilla (nota de voz del titular nmvotdn3ftit, 26 de octubre de
 * 2026: «No quiero volver a que el director falle por permisos»; pedido pd_panel_permisos). Lo trae el servidor aparte
 * (/permisos: lee los registros de las revisiones, que pesan), y se vuelve a pedir a los 30 segundos. Lo marcado y el
 * alcance elegido se recuerdan aquí, para que un repintado no los borre.
 */
let panelPermisos: PanelPermisos = null;
let permisosLeidos = 0;
let leyendoPermisos = false;
const permisosMarcados = new Set<string>();
const alcanceElegido = new Map<string, PermisoAutorizado['alcance']>();
const nombreDeProyecto = (id?: string) => (id ? d.proyectos.find((p) => p.id === id)?.nombre ?? id : '');

async function leerPermisos(): Promise<void> {
  if (leyendoPermisos) return;
  leyendoPermisos = true;
  const r = await fetch('/__estudio/director/permisos', { signal: AbortSignal.timeout(60_000) }).catch((e) => e as Error);
  const x = r instanceof Error ? null : await r.json().catch(() => null);
  leyendoPermisos = false;
  permisosLeidos = Date.now();
  panelPermisos = x && !(r instanceof Error) && r.ok && Array.isArray(x.pendientes)
    ? { pendientes: x.pendientes, autorizados: Array.isArray(x.autorizados) ? x.autorizados : [] }
    : { pendientes: [], autorizados: [], error: x?.error ?? tx('servidor.studioNoRespondio') };
  if (vista === 'modelo') pintar();
  // Lo negado en vivo, con su «Autorizo» (negadosEnVivoHtml)
  else if (progresoAbierto) pintarSegundoPlano();
}

/**
 * Las skills de los proyectos (propuesta aceptada pr_skills_cierre; dónde se autorizan lo elegiste en t_skills_panel: aquí,
 * en «Permisos»): el director no carga ninguna skill ni ningún comando de un proyecto que no autorices con su casilla, y
 * si un archivo suyo cambia, deja de cargarla hasta que la autorices otra vez. Antes de la casilla, lo que el Studio vio
 * en ella (skillsDelProyecto.ts › revisarSkill). Lo trae el servidor aparte (/skills), como lo negado.
 */
let panelSkills: PanelSkills = null;
let skillsLeidas = 0;
let leyendoSkills = false;
const skillsMarcadas = new Set<string>();

async function leerSkills(): Promise<void> {
  if (leyendoSkills) return;
  leyendoSkills = true;
  const r = await fetch('/__estudio/director/skills', { signal: AbortSignal.timeout(60_000) }).catch((e) => e as Error);
  const x = r instanceof Error ? null : await r.json().catch(() => null);
  leyendoSkills = false;
  skillsLeidas = Date.now();
  panelSkills = x && !(r instanceof Error) && r.ok && Array.isArray(x.skills) ? { skills: x.skills } : { skills: [], error: x?.error ?? tx('servidor.studioNoRespondio') };
  if (vista === 'modelo') pintar();
}

async function cambiarSkills(cuerpo: { autorizar?: { proyecto: string; nombre: string; ruta: string }[]; quitar?: { proyecto: string; nombre: string; ruta: string }[] }): Promise<void> {
  const r = await fetch('/__estudio/director/skills', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo), signal: AbortSignal.timeout(60_000) }).catch((e) => e as Error);
  if (r instanceof Error) return avisar(tx('guardado.noGuardar'));
  const x = await r.json().catch(() => ({}));
  if (!r.ok) return avisar(x.error ?? tx('guardado.noGuardarCorto'));
  panelSkills = { skills: Array.isArray(x.skills) ? x.skills : [] };
  skillsLeidas = Date.now();
  skillsMarcadas.clear();
  pintar();
  const n = cuerpo.autorizar?.length ?? 0;
  avisar(n ? tx('guardado.skills', { n }) : tx('guardado.skillQuitada'), true);
}

/** Autoriza lo marcado o quita uno ya autorizado, en un solo envío, y muestra cómo quedó. */
async function cambiarPermisos(cuerpo: { autorizar?: { regla: string; proyecto: string; alcance: PermisoAutorizado['alcance'] }[]; quitar?: { regla: string; alcance: string; proyecto?: string }[] }): Promise<boolean> {
  const r = await fetch('/__estudio/director/permisos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo), signal: AbortSignal.timeout(60_000) }).catch((e) => e as Error);
  if (r instanceof Error) return (avisar(tx('guardado.noGuardar')), false);
  const x = await r.json().catch(() => ({}));
  if (!r.ok) return (avisar(x.error ?? tx('guardado.noGuardarCorto')), false);
  panelPermisos = { pendientes: Array.isArray(x.pendientes) ? x.pendientes : [], autorizados: Array.isArray(x.autorizados) ? x.autorizados : [] };
  permisosLeidos = Date.now();
  permisosMarcados.clear();
  pintar();
  const n = cuerpo.autorizar?.length ?? 0;
  avisar(n ? tx('guardado.permisos', { n }) : tx('guardado.permisoQuitado'), true);
  return true;
}

/** Una casilla fija de los permisos, con su alcance: guarda y muestra cómo quedó; si no se pudo, vuelve a como estaba. */
async function cambiarGrupo(grupo: string, marcado: boolean): Promise<void> {
  const alcance = alcanceElegido.get(claveGrupo(grupo)) ?? gruposEnElPanel(panelPermisos?.autorizados ?? [], d.activo).find((g) => g.id === grupo)?.alcance ?? 'proyecto';
  const r = await fetch('/__estudio/director/permisos/grupo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grupo, marcado, alcance }), signal: AbortSignal.timeout(60_000) }).catch((e) => e as Error);
  const x = r instanceof Error ? null : await r.json().catch(() => ({}));
  if (r instanceof Error || !r.ok) {
    pintar();
    return avisar(x?.error ?? tx('guardado.noGuardar'));
  }
  panelPermisos = { pendientes: Array.isArray(x.pendientes) ? x.pendientes : [], autorizados: Array.isArray(x.autorizados) ? x.autorizados : [] };
  permisosLeidos = Date.now();
  alcanceElegido.delete(claveGrupo(grupo));
  pintar();
  avisar(marcado ? tx('guardado.permisos', { n: 1 }) : tx('guardado.permisoQuitado'), true);
}

/**
 * Guarda si el director lanzado carga todos tus ajustes de usuario de Claude Code o, sin ellos, qué claves conserva
 * (`conservar`); vale desde su próximo lanzamiento.
 */
async function cambiarAjustesPropios(cargar: boolean, conservar: string[] = []): Promise<void> {
  const r = await fetch('/__estudio/director/ajustes-propios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cargar, conservar }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
  const x = r instanceof Error ? null : await r.json().catch(() => ({}));
  if (r instanceof Error || !r.ok) {
    pintar();
    return avisar(x?.error ? tx('guardado.noGuardarPorque', { error: x.error }) : tx('guardado.noGuardar'));
  }
  d.ajustesPropios = { cargar: x.cargar === true, claves: Array.isArray(x.claves) ? x.claves : null, opciones: Array.isArray(x.opciones) ? x.opciones : null, conservados: Array.isArray(x.conservados) ? x.conservados : [] };
  pintar();
  avisar(cargar ? tx('guardado.ajustesCarga') : tx('guardado.ajustesSin', { conserva: conservar.length ? tx('guardado.ajustesConserva', { n: conservar.length }) : '' }), true);
}

/** Da o quita el permiso del director para seguir a ultracode; al darlo, primero lo explica y espera «Autorizo». */
async function cambiarPermisoUltracode(dar: boolean): Promise<void> {
  if (dar && !(await confirmar({ titulo: tx('ultracode.titulo'), texto: PERMISO_ULTRACODE(), boton: tx('comun.autorizo'), cancelar: tx('ultracode.soloMias') }))) return;
  const r = await fetch('/__estudio/director/ultracode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ director: dar }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
  if (r instanceof Error) return avisar(tx('guardado.noPermiso'));
  const x = await r.json().catch(() => ({}));
  if (!r.ok) return avisar(x.error ?? tx('guardado.noPermisoCorto'));
  d.ultracodeDirector = x.ultracodeDirector === true;
  pintar();
  avisar(tx(!d.ultracodeDirector ? 'guardado.ultraPermisoSin' : d.ultracode ? 'guardado.ultraPermisoCon' : 'guardado.ultraPermisoAlEncender'), true);
}

/**
 * Elige cómo pide permisos el director: solo lo autorizado, o «Me pregunta en el Studio» (propuesta aceptada
 * pr_permisos_al_momento). Vale desde su próximo lanzamiento; un clic basta, porque cada permiso que se dé en el diálogo
 * lo da la persona, uno a uno.
 */
async function cambiarModoPermisos(modo: ModoPermisos): Promise<void> {
  if (modo === (d.modoPermisos ?? 'autorizado')) return;
  const r = await fetch('/__estudio/director/modo-permisos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ modo }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
  if (r instanceof Error) return avisar(tx('guardado.noGuardar'));
  const x = await r.json().catch(() => ({}));
  if (!r.ok) return avisar(x.error ?? tx('guardado.noGuardarCorto'));
  d.modoPermisos = modoDe(x.modoPermisos);
  pintar();
  avisar(
    tx(d.modoPermisos === 'pregunta' ? 'guardado.modoPregunta' : d.modoPermisos === 'automatico' ? 'guardado.modoAutomatico' : 'guardado.modoAutorizado'),
    true,
  );
}

/**
 * La pestaña de «Modelo y consumo» que se ve (nota de voz del titular nmvoqwicctit, 25 de octubre de 2026: tantas
 * tarjetas apiladas se organizan por pestañas, según su contenido; las pestañas y su ancla, en pestanasModelo.ts). Se
 * recuerda en este navegador: el Studio se repinta entero a cada rato, y una recarga vuelve a donde ibas.
 */
let pestanaModelo: PestanaModelo = (() => {
  const guardada = localStorage.getItem('estudio.modelo.pestana');
  return pestanaModeloValida(guardada) ? guardada : PESTANA_MODELO_INICIAL;
})();

function ponerPestanaModelo(id: PestanaModelo) {
  pestanaModelo = id;
  localStorage.setItem('estudio.modelo.pestana', id);
}

/** Cambia de pestaña y deja el foco en la nueva, para seguir con las flechas (el repintado lo habría perdido). */
function cambiarPestanaModelo(id: string | undefined) {
  if (!pestanaModeloValida(id)) return;
  if (id !== pestanaModelo) {
    ponerPestanaModelo(id);
    pintar();
  }
  $('vista').querySelector<HTMLElement>(`[data-pestana-modelo="${id}"]`)?.focus({ preventScroll: true });
}

$('vista').addEventListener('keydown', (e) => {
  const pestana = (e.target as HTMLElement).closest<HTMLElement>('[data-pestana-modelo]');
  if (!pestana || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const otra = pestanaConTecla(pestana.dataset.pestanaModelo as PestanaModelo, e.key);
  if (!otra) return;
  e.preventDefault();
  cambiarPestanaModelo(otra);
});

/**
 * Lo que pinta «Modelo y consumo» (modelView.ts): los datos de cada pestaña y lo que depende de la página (la pestaña
 * elegida, el ancla, lo traído de los permisos y de la bitácora, y cómo traerlo). Solo se pinta la pestaña elegida: lo
 * que se trae del servidor, se trae al pintarla.
 */
function datosModelo(): DatosModelo {
  const consumo = d.consumo ?? [];
  const ahora = new Date();
  return {
    pestana: pestanaModelo,
    ponerPestana: ponerPestanaModelo,
    ancla: anclaPendiente,
    director: {
      modelo: d.modelo ?? null,
      esfuerzo: d.esfuerzo ?? null,
      esfuerzoGuardado: d.esfuerzoGuardado ?? null,
      ultracode: !!d.ultracode,
      ultracodeDirector: !!d.ultracodeDirector,
      todoConElModelo: !!d.todoConElModelo,
      avisoVersionApagado: !!d.avisoVersionApagado,
      consumo,
      ahora,
    },
    permisos: {
      datos: {
        modo: d.modoPermisos ?? 'autorizado',
        automatico: d.automatico,
        negados: { panel: panelPermisos, marcados: permisosMarcados, alcances: alcanceElegido, activo: d.activo, nombre: nombreDeProyecto },
        skills: { panel: panelSkills, marcadas: skillsMarcadas, nombre: nombreDeProyecto },
      },
      permisosLeidos,
      leyendoPermisos,
      leerPermisos: () => void leerPermisos(),
      skillsLeidas,
      leyendoSkills,
      leerSkills: () => void leerSkills(),
      ahora: ahora.getTime(),
    },
    ajustes: d.ajustesPropios,
    gasto: {
      consumo,
      medida: d.medidaDelDirector ?? [],
      ahora,
      nombreProyecto: (id) => d.proyectos.find((p) => p.id === id)?.nombre || id,
      plegable: (clave) => plegable(clave),
    },
    medicion: { medicion: d.medicion ?? null, directorPendiente: hayDirectorPendiente(), plegable: (clave) => plegable(clave) },
    bitacora: { abierta: plegadosAMano.get('bitacora') ?? true, cargar: () => void cargarBitacora(), datos: datosBitacora, plegable: plegable('bitacora', true) },
  };
}

/**
 * La medición del núcleo del director con casos fijos (propuesta aceptada pr_nucleo_medido), en su módulo
 * (vistaMedicion.ts): la corrida que pide la persona, con su consumo a la vista, nunca junto a una revisión.
 * Si hay un director trabajando o algo pedido que lo lanzará: lo mismo que mira el servidor antes de medir.
 */
const hayDirectorPendiente = () => {
  const pendiente = (x: { hecha?: string; error?: string } | null | undefined) => !!x && !x.hecha && !x.error;
  return !!d.revisor?.revisando || pendiente(d.revision) || pendiente(d.aclaracion) || pendiente(d.urgencia);
};

/**
 * La bitácora de este computador: cada acción que se hizo en el Studio, quién la hizo (o «el Studio», si la hizo solo),
 * desde dónde y cuándo, para poder auditarla. No va en los menús principales: es la última pestaña de «Modelo y
 * consumo» (nota de voz del titular, 23 de octubre de 2026; la pestaña, 25 de octubre). Se pide al servidor al abrirla,
 * y lo que llega se pinta solo dentro de su lista: el resto de la página no se mueve.
 */
let bitacora: Bitacora = null;
let errorBitacora = '';
let filtroBitacora = '';
let cargandoBitacora = false;
/** Si la bitácora estaba abierta: al volver a abrirla después de cerrarla, se pide de nuevo. */
let bitacoraAbierta = false;
/** Cuánto vale lo ya traído: un repintado dentro de ese rato no la vuelve a pedir. */
const FRESCA_BITACORA_MS = 20_000;

/** Lo que pinta la bitácora (bitacoraDelComputador.ts): lo traído, su error, el filtro escrito y el nombre de cada proyecto. */
const datosBitacora = (): DatosBitacora => ({ bitacora, error: errorBitacora, filtro: filtroBitacora, nombre: (id) => (id ? d?.proyectos?.find((p) => p.id === id)?.nombre || id : '') });

/** Trae la bitácora (`forzar`: aunque lo traído sea reciente) y repinta solo su lista. */
async function cargarBitacora(forzar = false) {
  if (cargandoBitacora || (!forzar && bitacora && Date.now() - bitacora.cuando < FRESCA_BITACORA_MS)) return;
  cargandoBitacora = true;
  try {
    const r = await fetch('/__estudio/director/bitacora', { signal: AbortSignal.timeout(30_000) });
    const x = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(x.error ?? tx('bitacora.noSePudoLeer'));
    bitacora = { eventos: Array.isArray(x.eventos) ? x.eventos : [], maximo: Number(x.maximo) || 0, cuando: Date.now() };
    errorBitacora = '';
  } catch (e) {
    errorBitacora = esDeRed(e) ? tx('bitacora.noRespondio') : tx('bitacora.error', { error: (e as Error).message });
  } finally {
    cargandoBitacora = false;
  }
  const lista = document.getElementById('lista-bitacora');
  if (lista) lista.innerHTML = filasBitacora(datosBitacora());
}

// Al abrirla, se pide lo más nuevo; cerrada, no se pide nada
document.addEventListener('toggle', (e) => {
  const det = e.target as HTMLElement;
  if (!(det instanceof HTMLDetailsElement) || det.dataset.bitacora === undefined) return;
  if (det.open) void cargarBitacora(!bitacoraAbierta);
  bitacoraAbierta = det.open;
}, true);

// ───────────────────────────────────────────── diagnóstico

/** «a», «a y b», «a, b y c». */
const unir = (xs: string[]) => (xs.length < 2 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`);
/** Una fuente: si trae una dirección, la dirección se vuelve enlace (se abre aparte). */
const conEnlaces = (t: string) => esc(t).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);

/**
 * El diagnóstico del director, dentro de Proyecto (decidido en «Un Studio más simple»): abierto mientras no hay meta
 * (se lee para elegirla) y plegado después. Su resumen, lo de cada frente compilado en un párrafo (lo más listo y lo más
 * flojo, sin tarjetas por frente), la estrategia para este tipo de proyecto con sus fuentes, y el documento completo a
 * un clic. Las metas que propone van en «La meta», solo mientras no hay una.
 */
function seccionDiagnostico() {
  const dg = d.plan.diagnostico;
  const nuevo = esNuevo();
  const titulo = tx(nuevo ? 'diagnostico.tituloNuevo' : 'diagnostico.titulo');
  if (!dg.fecha) {
    return `<section class="panel-d sin-diagnostico" data-ancla="p-diagnostico">
        <h3>${titulo}</h3>
        <p class="como">${tx(nuevo ? 'diagnostico.explicaNuevo' : 'diagnostico.explica')} ${tx('diagnostico.pidelo')}</p>
      </section>`;
  }
  // Lo de cada frente, en un párrafo: lo más listo y lo más flojo, con el veredicto de lo más flojo si es uno solo
  const fr = d.plan.frentes.filter((x) => dg.frentes[x.id]).map((x) => ({ nombre: x.nombre, ...dg.frentes[x.id] }));
  const conNota = (x: (typeof fr)[number]) => `${esc(x.nombre)} (${tx('diagnostico.nota', { nota: x.nota })})`;
  const max = Math.max(...fr.map((x) => x.nota));
  const min = Math.min(...fr.map((x) => x.nota));
  const flojos = fr.filter((x) => x.nota === min);
  const compilado = !fr.length ? ''
    : max === min ? `<p class="compilado-frentes"><b>${tx('diagnostico.frentePorFrente')}</b> ${unir(fr.map(conNota))}.</p>`
    : `<p class="compilado-frentes"><b>${tx('diagnostico.masListo')}</b> ${unir(fr.filter((x) => x.nota === max).map(conNota))}. <b>${tx('diagnostico.masFlojo')}</b> ${unir(flojos.map(conNota))}${flojos.length === 1 && flojos[0].veredicto ? `: ${esc(flojos[0].veredicto.replace(/\.$/, ''))}` : ''}.</p>`;
  const est = dg.estrategia;
  const estrategia = est ? `<h4>${tx('diagnostico.estrategia')}</h4><p class="texto-d">${esc(est.texto)}</p><p class="como">${tx('diagnostico.fuentes')} ${est.fuentes.map(conEnlaces).join(' · ')}</p>` : '';
  const documento = d.plan.documentos.find((x) => /(^|\/)(diagnostico|planteamiento)\.md$/.test(x.ruta));
  return `<section class="panel-d" data-ancla="p-diagnostico">
      <details class="plegable-d"${plegable('diagnostico', !d.proyecto.objetivo)}>
        <summary><h3>${titulo}</h3><small>${tx('diagnostico.del', { fecha: fecha(dg.fecha) })}</small></summary>
        <ul class="resumen-d">${dg.resumen.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>${dg.boton ? botonIr({ doc: dg.boton.doc, etiqueta: dg.boton.etiqueta }) : ''}
        ${compilado}
        ${estrategia}
        <div class="acciones-p">${documento ? botonIr({ doc: documento.ruta, etiqueta: tx('diagnostico.leerCompleto') }, 'boton-suave') : ''}<button type="button" class="al-director" data-comentar="diagnostico|">✉ ${tx(nuevo ? 'diagnostico.comentarNuevo' : 'diagnostico.comentar')}</button></div>
        ${dg.fuentes?.length ? `<details class="detalles-repo"${plegable('diagnostico-fuentes')}><summary>${tx('diagnostico.loQueLeyo')}</summary><ul class="adelantado">${dg.fuentes.map((f) => `<li>${conEnlaces(f)}</li>`).join('')}</ul></details>` : ''}
      </details>
    </section>`;
}

// ───────────────────────────────────────────── frentes por fase y excepciones

function vistaFrentes() {
  return vistaFrentesHtml({ plan: d.plan, estado: d.estado, hoy: d.hoy, celda, puedoTrabajar: puedoTrabajar() });
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

/** La propuesta que tienes abierta en «Propuestas» (una a la vez): un repintado no la pliega. */
let propuestaAbierta = '';
document.addEventListener('toggle', (e) => {
  const det = e.target;
  if (!(det instanceof HTMLDetailsElement) || !det.matches('details.propuesta[name="propuestas"]')) return;
  const id = det.dataset.ancla?.replace(/^propuesta-/, '') ?? '';
  if (det.open) propuestaAbierta = id;
  else if (propuestaAbierta === id) propuestaAbierta = '';
}, true);

function vistaPropuestas() {
  // Un botón que lleva a una propuesta ya decidida la muestra
  if (anclaPendiente?.startsWith('propuesta-') && propuestaPasada(anclaPendiente.slice(10))) verPropuestasPasadas = true;
  return vistaPropuestasHtml({
    plan: d.plan, estado: d.estado, faseAbierta, propuestaPasada, verPasadas: verPropuestasPasadas, nombreTitular: nombreTitular(), esTitular: titular(),
    tarjetaNota: (n, id) => tarjetaNota(n, false, false, false, { vista: 'propuestas', ancla: `propuesta-${id}` }),
    abierta: propuestaAbierta,
  });
}

// ───────────────────────────────────────────── pintar y eventos

/**
 * Tras cada pintada: el globo de la ayuda que va, sobre su parte ya repintada; si no va ninguna, la de «Hoy» se ofrece una
 * vez, en «Hoy», con tu misión a la vista y sin el director revisando (pd_ayuda_guiada).
 */
function alPintarAyuda() {
  // El círculo del modo ayuda, en el idioma de ahora (cambia con «ES · EN» sin recargar)
  pintarAtajoAyuda();
  if (guiaActiva()) return pintarGuia();
  if (!d?.identidad.rol) return;
  const seccion = seccionDeVista(vista);
  if (!seccion) return;
  const revisando = estadoRevision().estado === 'en_curso';
  if (debeOfrecerse({ vista, vistas: d.ayudasVistas ?? [], revisando, hayAlgo: !!aLaVista(SECCIONES[seccion].espera), ayuda: modoAyuda() })) empezarGuia(seccion, () => void ayudaVista(seccion));
}
/** Que la ayuda de una sección ya se vio (o se saltó) lo recuerda el Studio, una vez para todos los proyectos. */
async function ayudaVista(seccion: string) {
  d.ayudasVistas = [...new Set([...(d.ayudasVistas ?? []), seccion])];
  await fetch('/__estudio/director/ayuda-vista', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seccion }), signal: AbortSignal.timeout(30_000) }).catch(() => null);
}
instalarAyuda({ repintar: () => pintar(), repetir: () => { const s = seccionDeVista(vista); if (s) empezarGuia(s, () => undefined); }, seccion: () => seccionDeVista(vista) });

function pintar() {
  if (!d) return; // aún cargando: se pinta al llegar los datos
  if (animandoParte) return; // marcarParte repinta al terminar el efecto
  repintoDeFondo.cancelar();
  destinos = [];
  pintarSelectorProyecto(d.proyectos, d.activo);
  pintarQuien();
  pintarSincronizacion();
  pintarMando();
  pintarNavegacion();
  const v = $('vista');
  // Los errores del plan le llegan solos al director (su bandeja los pone primero): aquí solo se avisa, sin pedirte nada
  const errores = d.errores.length ? `<details class="aviso remoto"><summary>${tx('errores.plan')}</summary>${d.errores.map((e) => `<p>${esc(e)}</p>`).join('')}</details>` : '';
  const html = {
    misiones: vistaMisiones, buzon: vistaBuzon, documentos: vistaDocumentos, ruta: vistaRuta, propuestas: vistaPropuestas,
    proyectos: vistaProyectos, proyecto: vistaProyecto, diagnostico: vistaProyecto, frentes: vistaFrentes, esfuerzo: () => vistaEsfuerzo(d),
    metodo: () => vistaMetodo({ plan: d.plan, nombreTitular: nombreTitular(), botonMetodo: botonIr({ doc: 'docs/metodo/metodologia.md', etiqueta: tx('metodo.leerCompleto') }) }),
    bitacora: () => vistaBitacora(d), preguntas: vistaPreguntas, modelo: () => vistaModelo(datosModelo()),
  }[vista]();
  // Si estabas escribiendo en «Buscar en el Buzón» (o en el filtro de la bitácora), el repintado no te saca del campo ni
  // te mueve el cursor
  const buscando = document.activeElement instanceof HTMLInputElement && (document.activeElement.dataset.buscarBuzon !== undefined || document.activeElement.dataset.filtroBitacora !== undefined) ? document.activeElement : null;
  const cursor = buscando ? [buscando.selectionStart, buscando.selectionEnd] : null;
  // Lo enfocado se desplaza por dentro, en su ventana: el repintado no lo devuelve arriba
  const enfocadoEn = cajaEnfocada()?.scrollTop ?? 0;
  scrollColumna = v.querySelector<HTMLElement>('.lista-docs')?.scrollTop ?? scrollColumna;
  // La lista de la bitácora también se desplaza por dentro: sigue donde la dejaste
  const scrollBitacora = v.querySelector<HTMLElement>('.lista-bitacora')?.scrollTop ?? 0;
  // Llegaste a esta sección con el botón de un paso: «← Volver a tu misión» flota mientras sigas en ella
  recordarDesdeMision();
  v.innerHTML = errores + html + (vista !== 'documentos' && flotaVolver(desdeMision, vista, null) ? botonVolverMision(desdeMision?.id) : '');
  // Lo que se ve al volver a esta sección, antes de pintarla otra vez con lo nuevo (abrirSeccion)
  seccionesVistas.set(vista, v.innerHTML);
  // En «Hoy», la voz de tus misiones y sus pasos se prepara aunque no se haya abierto «¿Dónde quedamos?»
  if (vista === 'misiones') prepararLoQueSigue();
  // La ayuda de la sección (ayudaGuiada.ts): con el modo ayuda encendido, «Ver otra vez el recorrido» arriba; y se ofrece una vez
  if (seccionDeVista(vista) && modoAyuda()) v.insertAdjacentHTML('afterbegin', repetirHtml());
  requestAnimationFrame(alPintarAyuda);
  if (cursor) {
    const campo = v.querySelector<HTMLInputElement>(buscando!.dataset.buscarBuzon !== undefined ? '[data-buscar-buzon]' : '[data-filtro-bitacora]');
    campo?.focus();
    campo?.setSelectionRange(cursor[0], cursor[1]);
  }
  const listaBitacora = v.querySelector<HTMLElement>('.lista-bitacora');
  if (listaBitacora) listaBitacora.scrollTop = scrollBitacora;
  // La columna de los documentos sigue donde la dejaste, y el documento que acabas de abrir se ve marcado en ella: solo se
  // mueve la columna, nunca la página
  const columna = v.querySelector<HTMLElement>('.lista-docs');
  if (columna) {
    columna.scrollTop = scrollColumna;
    const sel = mostrarEnColumna ? columna.querySelector<HTMLElement>('.doc-l.sel') : null;
    if (sel) columna.scrollTop += desplazamientoParaVer(rectaEnPagina(columna.getBoundingClientRect()), rectaEnPagina(sel.getBoundingClientRect()));
  }
  mostrarEnColumna = false;
  // El modo enfoque solo vale donde aplica (un documento abierto, la tarjeta de tu misión de ahora): si no, se apaga
  aplicarEnfoque();
  // Un documento que se acaba de abrir empieza arriba, también en el modo enfoque: no hereda el scroll del anterior
  const abreOtro = vista === 'documentos' && irASeccion !== null;
  const enfocada = enfocadoEn ? cajaEnfocada() : null;
  if (enfocada) enfocada.scrollTop = scrollAlRepintar(enfocadoEn, abreOtro);
  if (vista === 'documentos' && irASeccion !== null) {
    const parte = [...v.querySelectorAll<HTMLElement>('[data-parte]')].find((x) => x.dataset.parte === irASeccion);
    // Un documento abre arriba del todo, salvo que el paso nombre una de sus partes o que ya hayas leído algo:
    // entonces abre en el comienzo de la primera parte que te falta, para seguir donde ibas
    // Una parte que aún está cerrada no se salta: se va a la que toca leer ahora
    const cerrada = !!parte?.classList.contains('cerrada');
    const falta = doc && (leidasDe(doc.ruta).length || cerrada) ? v.querySelector<HTMLElement>('.parte-doc.por-leer') : null;
    if (cerrada) decir(tx('docs.parteCerrada', { parte: irASeccion }), 'pensativo');
    // En una pantalla angosta (1100 px o menos) la columna va encima del documento y ya no se pliega sola: entonces el
    // documento abre en su comienzo, no arriba de la lista
    const angosta = matchMedia('(max-width: 1100px)').matches;
    const destino = falta ?? (angosta ? v.querySelector<HTMLElement>('.docs > .lector') : null);
    if (irASeccion && parte && !cerrada) resaltar(parte);
    else if (destino) {
      // La ventana se desplaza en píxeles de pantalla; la cabecera y el margen de 12, medidos en los de la página
      const cabeza = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--alto-cabeza')) || 0;
      window.scrollTo({ top: Math.max(0, destino.getBoundingClientRect().top + window.scrollY - aPantalla(cabeza + 12)) });
    } else window.scrollTo({ top: 0 });
    irASeccion = null;
  }
  if (anclaPendiente) {
    const el = v.querySelector<HTMLElement>(`[data-ancla="${CSS.escape(anclaPendiente)}"]`);
    // Lo que se señala se ve abierto: un botón que lleva al diagnóstico, plegado, lo despliega
    el?.querySelector<HTMLDetailsElement>(':scope > details.plegable-d')?.setAttribute('open', '');
    if (el) {
      resaltar(el);
      anclaPendiente = null;
      anclaEsperandoDesde = 0;
    } else if (!anclaEsperandoDesde) anclaEsperandoDesde = Date.now();
    // La sección aún no trae lo señalado (se pinta primero con lo último que tenía): se espera al pintado siguiente,
    // un rato y no para siempre
    else if (Date.now() - anclaEsperandoDesde > MS_ESPERAR_ANCLA) { anclaPendiente = null; anclaEsperandoDesde = 0; }
  } else seguirResalte(v);
}

/** Lo último que se pintó de cada sección de este proyecto. */
const seccionesVistas = new Map<Vista, string>();
/**
 * Abrir una sección desde la barra: se ve de una vez, con lo último que trajo o, la primera vez, con su título y una línea de
 * que carga, y se pinta con lo de ahora en el cuadro siguiente (t_decide_aligerar_carga, t_decide_aligerar_volver). Armar una
 * sección grande detenía la página antes de mostrar nada.
 */
function abrirSeccion(nueva: Vista) {
  if (nueva === vista) return irA(nueva);
  $('vista').innerHTML = aperturaDeSeccion(seccionesVistas.get(nueva), NOMBRE_VISTA[nueva], tx('seccion.cargando'));
  for (const x of document.querySelectorAll('.item-nav.sel')) x.classList.remove('sel');
  document.querySelector(`.item-nav[data-vista="${nueva}"]`)?.classList.add('sel');
  window.scrollTo({ top: 0 });
  requestAnimationFrame(() => setTimeout(() => irA(nueva), 0));
}

function irA(nueva: Vista) {
  // El diagnóstico ya no es una sección: vive en Proyecto, plegado
  if (nueva === 'diagnostico') {
    anclaPendiente ??= 'p-diagnostico';
    nueva = 'proyecto';
  }
  const otra = nueva !== vista;
  vista = nueva;
  // De vuelta en las misiones, el ir y volver a otra sección terminó
  if (nueva === 'misiones' && desdeMision?.vista) desdeMision = null;
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
    return void (await activar(config.dataset.configProyecto!, { vista: 'proyecto', etiqueta: tx('proyectos.configEtiqueta') }));
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

// Cualquier botón que lleve a una sección (la barra lateral, un enlace dentro de un texto). Sin proyectos solo hay la
// bienvenida, y no lleva a ninguna
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-vista]');
  if (!b || b.closest('dialog')) return;
  const v = b.dataset.vista as Vista;
  if (!VISTAS.includes(v)) return;
  if (d) abrirSeccion(v);
});

// «Se está midiendo el núcleo», en la cabecera o junto a la cara del director: un atajo a la medición en curso (nota de
// voz del titular nmvviiwfqtit)
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest('[data-ver-medicion]');
  if (!b || b.closest('dialog') || !d) return;
  void ir({ vista: 'modelo', ancla: ANCLA_MEDICION, etiqueta: tx('modelo.medicionTitulo') });
});

// «Detener» las revisiones seguidas: la que está en marcha termina, y el Studio no lanza otra
document.addEventListener('click', (e) => {
  if (!(e.target as HTMLElement).closest('[data-seguidas="detener"]') || !d) return;
  void (async () => {
    const r = await fetch('/__estudio/director/seguidas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ detener: true }), signal: AbortSignal.timeout(30_000) }).catch((x) => x as Error);
    if (r instanceof Error || !r.ok) return avisar(r instanceof Error ? tx('servidor.noHabla') : (await r.json().catch(() => ({}))).error ?? tx('servidor.noSePudoRespondio', { estado: r.status }));
    avisar(tx('seguidas.detenidas'));
    await cargar();
  })();
});

// La revisión se pide (y se cancela) arriba, en la cabecera, y no junto a la cara del director, al lado de
// «Comentario» y «Preguntas», donde un clic de más la lanzaba. Lo que pasa en segundo plano, que sí vive junto a la
// cara, dice en qué va: por eso se escucha en todo el documento
document.addEventListener('click', (e) => {
  const rev = (e.target as HTMLElement).closest<HTMLElement>('[data-revision]');
  if (rev && d) {
    const que = rev.dataset.revision;
    const ahora = estadoRevision();
    if (que === 'pedir') return void pedirLaRevision(true, rev.dataset.origen === 'recomendada' ? 'recomendada' : rev.dataset.origen === 'seguidas' ? 'seguidas' : rev.dataset.origen === 'hoy' ? 'hoy' : 'cabecera');
    if (que === 'cancelar') return void pedirLaRevision(false);
    if (que === 'detener') return void detenerLaRevision();
    // Una revisión lanzada que no se cerró: el reporte de qué pasó, en su diálogo (nunca solo un aviso que se va)
    if (ahora.estado === 'sin_vigilia' && d.revision?.error) return void mostrarFalla();
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

/**
 * El diálogo único para hablarle al director (pedido pd_dialogo_unico, tu elección nmvj2fac5tit): el ✉ de cada lugar,
 * «Decido otra cosa» y «Agregar a esta decisión», el comentario general (el director flotante y el Buzón) y la tecla N
 * abren este mismo, que ya sabe sobre qué es la nota, pide su tipo donde hace falta y trae la grabación y los adjuntos.
 * Lo que se cierra sin enviar queda como borrador en este navegador (borradores.ts).
 */
async function comentar(sobre: { tipo: string; id?: string; seccion?: string; decision?: string; fragmento?: string; postura?: string },titulo: string, tipoInicial?: string) {
  const general = sobre.tipo === 'general' && !sobre.seccion;
  const pregunta = sobre.tipo === 'pregunta';
  // Un comentario general con el tipo «Pregunta» es una pregunta: va con las demás y se responde como un informe (el
  // canal único, nota nmvt2rup6tit); sin urgencia, como toda pregunta
  const comoPregunta = (dicho: Dicho) => general && dicho.tipoNota === 'pregunta';
  // Lo grabado se transcribe al detenerlo, con su indicador; si ya terminó al dejar la nota, va con ella y no se repite
  let pre: ReturnType<typeof transcribirAlDetener> | null = null;
  const antes = grabadoraDelSobre;
  const pidiendo = pedir({
    titulo,
    ayuda: avisoRevisando() + tx(pregunta ? 'buzon.ayudaPregunta' : general ? 'buzon.ayudaGeneral' : 'buzon.ayudaLugar'),
    // Desde un lugar (el ✉ de una idea, de un paso, de una línea), es un comentario sobre él: va marcado, y se cambia de un toque (nota nmvsx5o4htit)
    campos: [...(pideTipo(sobre as Nota['sobre']) ? [campoTipo(tipoInicial ?? (general ? undefined : 'respuesta'))] : []),{ id: 'texto', etiqueta: tx(pregunta ? 'buzon.etiquetaPregunta' : general ? 'buzon.etiquetaGeneral' : 'buzon.etiquetaLugar'), tipo: 'area' }],
    boton: tx('buzon.dejar'),
    audio: true,
    adjuntos: true,
    // Una pregunta no es urgente: se responde en la revisión, como un informe
    urgente: !pregunta,
    borrador: { proyecto: d.activo, sobre },
    // Se guarda con el ✉ abierto: si el servidor falla, lo escrito, lo grabado y lo adjunto siguen ahí (pd_nada_se_corta)
    guardar: (dicho) => dejarNota(comoPregunta(dicho) ? { tipo: 'pregunta' } : sobre, dicho.texto, dicho.audio, !!dicho.urgente && !comoPregunta(dicho), dicho.adjuntos, dicho.tipoNota, dicho.audio ? pre?.listo() ?? undefined : undefined),
  });
  // Solo si se abrió este diálogo (no otro que seguía grabando)
  if (grabadoraDelSobre !== antes) pre = transcribirAlDetener(grabadoraDelSobre);
  const r = await pidiendo;
  // Solo vuelve con algo si la nota quedó en el Buzón
  return !!r;
}

/**
 * El tipo de la nota, obligatorio y de un toque (pedido pd_tipo_obligatorio): con qué intención la escribes, para que el
 * director la lea así y el Buzón la filtre. Si dudas, «Auto (el modelo decide)», y el director se lo pone al leerla. En un audio
 * también: lo eliges al enviarlo, así que grabas sin esperar.
 */
// Sin otro marcado (el ✉ de un lugar ya trae «Comentario»), parte en «Auto», el primero: la persona lo cambia si quiere
// (nota de voz del titular nmvsyxjd6tit, 28 de octubre de 2026)
function campoTipo(valor: string = TIPO_ELIGE): Campo {
  return { id: 'tipoNota', etiqueta: tx('buzon.queEsNota'), tipo: 'botones', clase: 'campo-tipo', requerido: true, opciones: OPCIONES_TIPO_DE_NOTA.map(([v]) => [v, nombreTipoEnBuzon(v)]), valor, ayuda: tx('buzon.queEsAyuda') };
}

type Dicho = Record<string, string> & { audio?: string; adjuntos?: { nombre: string; datos: string }[]; quitarAdjuntos?: string[] };
const EN_AUDIO = 'Lo dije en audio: está en el Buzón.';

/**
 * Todo lo que se le dice al director admite los tres canales: escrito, en audio o con imágenes. En un diálogo que no es
 * una nota (entregar, cruzar una puerta, responder una propuesta…), lo dicho en audio y lo adjunto le llegan como nota del
 * Buzón sobre lo mismo. `conAudio: false` cuando la acción ya guarda el audio (la entrega).
 */
async function anexar(r: Dicho, sobre: { tipo: string; id?: string }, rotulo: string, conAudio = true) {
  const audio = conAudio ? r.audio : undefined;
  if (!audio && !r.adjuntos?.length) return;
  // Acompaña lo que la persona hace en ese diálogo (entregar, responder): le responde al director
  await accion({ tipo: 'comentar', sobre, texto: rotulo, tipoNota: 'respuesta', ...(audio ? { audio } : {}), ...(r.adjuntos?.length ? { adjuntos: r.adjuntos } : {}) }, tx('anexar.quedoEnBuzon'));
}

/**
 * Deja una nota en el Buzón. Si es urgente, el servidor se la lleva sola al director, al instante, sin el resto de la
 * revisión (si no puede llamarlo, pide la revisión); el director decide si de verdad lo es.
 */
async function dejarNota(sobre: { tipo: string; id?: string; seccion?: string; decision?: string; fragmento?: string; postura?: string },texto: string | undefined, audio: string | null | undefined, urgente = false, adjuntos?: { nombre: string; datos: string }[], tipoNota?: string, dictado?: string) {
  // `dictado`: lo que ya se entendió del audio al detener su grabación; el servidor lo escribe y no lo transcribe otra vez
  const ok = await accion({ tipo: 'comentar', sobre, texto, audio, urgente, ...(tipoNota ? { tipoNota } : {}), ...(adjuntos?.length ? { adjuntos } : {}), ...(audio && dictado ? { dictado } : {}) },
    tx(!urgente ? 'buzon.quedo' : automatica() ? 'buzon.quedoUrgenteSolo' : 'buzon.quedoUrgentePedida'));
  // La respuesta a una decisión suena como firmada (decisionRespondida), no como una nota más
  if (ok && !(sobre.decision && sobre.postura !== 'comenta')) sonar('nota');
  // Sin quién llame al director, lo urgente espera en el Buzón: la revisión la pide la página porque la persona dijo «Sí,
  // dejarlo y pedir la revisión» (el servidor ya no la pide solo: regla dura del 23 de octubre de 2026). La nota ya quedó:
  // si después falla traer lo nuevo, no se da por no guardada (el ✉ la dejaría abierta para enviarla otra vez)
  if (ok && urgente && !automatica() && !(d.revision && !d.revision.hecha)) await pedirLaRevision(true, 'urgente', true).catch(() => false);
  if (ok && urgente) {
    pintarSegundoPlano();
    vigilarTranscripciones([]);
  }
  return ok;
}

// «Buscar en el Buzón»: cada letra filtra las notas al momento, sin repintar el campo
$('vista').addEventListener('input', (e) => {
  const campo = (e.target as HTMLElement).closest<HTMLInputElement>('[data-buscar-buzon]');
  if (!campo) return;
  busquedaBuzon = campo.value;
  const resultados = document.getElementById('resultados-buzon');
  if (resultados) resultados.innerHTML = notasDelBuzon();
});
// El filtro por tipo del Buzón: un toque deja solo las de ese tipo (pd_tipo_obligatorio; las de antes, «Sin tipo»)
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-tipo-buzon]');
  if (!b) return;
  tipoBuzon = (b.dataset.tipoBuzon ?? '') as TipoEnBuzon | '';
  const resultados = document.getElementById('resultados-buzon');
  if (resultados) resultados.innerHTML = notasDelBuzon();
});
// Y el de cómo quedó: igual, sobre las del tipo elegido
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-como-buzon]');
  if (!b) return;
  comoBuzon = (b.dataset.comoBuzon ?? '') as ComoQuedo | '';
  const resultados = document.getElementById('resultados-buzon');
  if (resultados) resultados.innerHTML = notasDelBuzon();
});
// «Filtrar» la bitácora de este computador: igual, cada letra filtra sus filas sin repintar el campo
$('vista').addEventListener('input', (e) => {
  const campo = (e.target as HTMLElement).closest<HTMLInputElement>('[data-filtro-bitacora]');
  if (!campo) return;
  filtroBitacora = campo.value;
  const lista = document.getElementById('lista-bitacora');
  if (lista) lista.innerHTML = filasBitacora(datosBitacora());
});

$('selector-idioma').addEventListener('click', (e) => {
  const elegido = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-idioma]')?.dataset.idioma;
  if (esIdioma(elegido)) void cambiarIdioma(elegido);
});

$('vista').addEventListener('change', async (e) => {
  // Lo marcado y el alcance de cada permiso negado se recuerdan: un repintado no los borra
  const negado = e.target as HTMLInputElement & HTMLSelectElement;
  if (negado.dataset?.permisoNegado !== undefined) return void (negado.checked ? permisosMarcados.add(negado.dataset.permisoNegado) : permisosMarcados.delete(negado.dataset.permisoNegado));
  if (negado.dataset?.alcancePermiso !== undefined) return void alcanceElegido.set(negado.dataset.alcancePermiso, negado.value === 'todos' ? 'todos' : 'proyecto');
  if (negado.dataset?.skillMarca !== undefined) return void (negado.checked ? skillsMarcadas.add(negado.dataset.skillMarca) : skillsMarcadas.delete(negado.dataset.skillMarca));
  // Las casillas fijas de los permisos: marcarla es la autorización; cambiar el alcance de una marcada, también
  if (negado.dataset?.permisoGrupo !== undefined) return void cambiarGrupo(negado.dataset.permisoGrupo, negado.checked);
  if (negado.dataset?.alcanceGrupo !== undefined) {
    const id = negado.dataset.alcanceGrupo;
    alcanceElegido.set(claveGrupo(id), negado.value === 'todos' ? 'todos' : 'proyecto');
    return void (gruposEnElPanel(panelPermisos?.autorizados ?? [], d.activo).find((g) => g.id === id)?.marcado ? cambiarGrupo(id, true) : undefined);
  }
  const casilla = (e.target as HTMLElement).closest<HTMLInputElement>('[data-paso]');
  if (casilla) {
    const [id, i] = casilla.dataset.paso!.split('|');
    // Un paso de leer se marca a mano solo si no le queda nada por decidir (faltaLeer)
    const falta = casilla.checked ? await faltaLeer(id, Number(i)) : null;
    if (falta) {
      casilla.checked = false;
      decir(falta.texto, 'pensativo');
      return void ir(falta.ir);
    }
    // Un paso de terminal con su comprobación: el Studio la corre antes de marcarlo; si no se cumple, no se marca
    const conComprobar = d.plan.misiones.find((x) => x.id === id)?.pasos[Number(i)];
    if (casilla.checked && typeof conComprobar !== 'string' && conComprobar?.comprobar) {
      casilla.checked = false;
      casilla.disabled = true;
      // Mientras se comprueba, «No me salió» de ese paso espera: no se cruza una entrega con la comprobación
      const noSalio = $('vista').querySelector<HTMLButtonElement>(`[data-no-salio="${CSS.escape(`${id}|${i}`)}"]`);
      if (noSalio) noSalio.disabled = true;
      decir(tx('comprobar.dejame'), 'pensativo');
      const r = await fetch('/__estudio/director/comprobar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mision: id, paso: Number(i) }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
      casilla.disabled = false;
      if (noSalio) noSalio.disabled = false;
      // Si la misión dejó de estar abierta mientras tanto (se entregó, la revisó el director), no se marca nada
      const m = d.plan.misiones.find((x) => x.id === id);
      if (!m || !['pendiente', 'en_curso', 'rehacer'].includes(estadoMision(m, d.plan, d.estado))) return;
      if (r instanceof Error) return avisar(tx('comprobar.noRespondio'));
      const c = await r.json().catch(() => ({}));
      if (!r.ok) return avisar(c.error ?? tx('comprobar.noSePudo'));
      if (!c.cumple) {
        decir(tx('comprobar.todaviaNo'), 'pensativo');
        // Sin salida, la persona quedaba atrapada en un paso que no le sale: puede dejárselo al director y seguir
        const encontrado = recortar(String(c.encontrado ?? ''), 160);
        return avisar(tx('comprobar.aunNo', { espera: c.espera, encontrado }), false, undefined,
          { etiqueta: tx('comprobar.sigoConOtra'), hacer: () => void seguirConOtra(id, Number(i), `Al comprobarlo, el Studio esperaba ${c.espera} y encontró: «${encontrado}».`) });
      }
      casilla.checked = true;
      avisar(tx('comprobar.hecho'), true);
    }
    const guardado = marcarPaso(id, Number(i));
    pintar();
    if (casilla.checked) {
      sonar('paso');
      const m = d.plan.misiones.find((x) => x.id === id);
      const hechos = pasosHechos(id);
      const sigue = m?.pasos.findIndex((_, k) => !hechos.includes(k)) ?? -1;
      const texto = (p: Paso) => (typeof p === 'string' ? p : p.texto);
      if (m && sigue >= 0) {
        decir(tx('paso.bienSigue', { texto: recortar(texto(m.pasos[sigue]), 110) }), 'feliz');
        // Por si fue sin querer: deshacerlo está a un clic (después, «Desmarcar» en «Completado»)
        const comprobado = typeof conComprobar !== 'string' && !!conComprobar?.comprobar;
        avisar(`${comprobado ? `${tx('comprobar.hechoCorto')} ` : ''}${tx('paso.marcado', { n: Number(i) + 1 })}`, true, undefined, { etiqueta: tx('paso.deshacer'), hacer: () => { void marcarPaso(id, Number(i), false); pintar(); } });
      }
      else if (m && (await completarSiToca(id, guardado))) decir(tx('mision.completadaDirector'), 'riendo');
    }
    return;
  }
  const s = (e.target as HTMLElement).closest<HTMLSelectElement>('[data-consulta]');
  if (s) {
    consulta = s.value || null;
    pintar();
    return;
  }
  const sm = (e.target as HTMLElement).closest<HTMLSelectElement>('[data-modelo]');
  if (sm) {
    const r = await fetch('/__estudio/director/modelo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ modelo: sm.value }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
    if (r instanceof Error) return avisar(tx('guardado.noModelo'));
    const x = await r.json().catch(() => ({}));
    if (!r.ok) return avisar(x.error ?? tx('guardado.noModeloCorto'));
    Object.assign(d, { modelo: x.modelo ?? null, esfuerzo: x.esfuerzo ?? null, esfuerzoGuardado: x.esfuerzoGuardado ?? null });
    pintar();
    return avisar(`${d.modelo ? tx('guardado.modelo', { nombre: MODELOS.find((m) => m.id === d.modelo)?.nombre ?? d.modelo }) : tx('guardado.modeloCuenta')} ${cuandoRige()}`, true);
  }
  const se =(e.target as HTMLElement).closest<HTMLSelectElement>('[data-esfuerzo]');
  if (se) {
    const r = await fetch('/__estudio/director/esfuerzo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ esfuerzo: se.value }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
    if (r instanceof Error) return avisar(tx('guardado.noEsfuerzo'));
    const x = await r.json().catch(() => ({}));
    if (!r.ok) return avisar(x.error ?? tx('guardado.noEsfuerzoCorto'));
    Object.assign(d, { modelo: x.modelo ?? null, esfuerzo: x.esfuerzo ?? null, esfuerzoGuardado: x.esfuerzoGuardado ?? null });
    pintar();
    if (d.esfuerzo === 'max') return avisar(tx('guardado.esfuerzoMax'), true);
    return avisar(`${d.esfuerzo ? tx('guardado.esfuerzo', { nombre: ESFUERZOS.find((x) => x.id === d.esfuerzo)?.nombre.toLowerCase() ?? d.esfuerzo }) : tx('guardado.esfuerzoCuenta')} ${cuandoRige()}`, true);
  }
  // «Todo con el modelo que elegí» (pr_modelos_por_tarea, punto 4): los ayudantes del director, con su mismo modelo
  const av = (e.target as HTMLElement).closest<HTMLInputElement>('[data-aviso-version]');
  if (av) {
    const x = await guardarAvisoVersion({ si: av.checked });
    if (x) avisar(tx(av.checked ? 'guardado.avisoVersionSi' : 'guardado.avisoVersionNo'), true);
    return;
  }
  const tm = (e.target as HTMLElement).closest<HTMLInputElement>('[data-todo-modelo]');
  if (tm) {
    const r = await fetch('/__estudio/director/todo-con-el-modelo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ si: tm.checked }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
    if (r instanceof Error) return avisar(tx('guardado.noGuardar'));
    const x = await r.json().catch(() => ({}));
    if (!r.ok) return avisar(x.error ?? tx('guardado.noGuardarCorto'));
    d.todoConElModelo = x.todoConElModelo === true;
    pintar();
    return avisar(tx(d.todoConElModelo ? 'guardado.ayudantesIgual' : 'guardado.ayudantesMenos'), true);
  }
  const su = (e.target as HTMLElement).closest<HTMLInputElement>('[data-ultracode]');
  if (su) {
    const r = await fetch('/__estudio/director/ultracode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: su.checked }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
    if (r instanceof Error) return avisar(tx('guardado.noUltracode'));
    const x = await r.json().catch(() => ({}));
    if (!r.ok) return avisar(x.error ?? tx('guardado.noUltracodeCorto'));
    d.ultracode = x.ultracode === true;
    d.ultracodeDirector = x.ultracodeDirector === true;
    pintar();
    // Al encenderlo, si al director le falta el permiso, el Studio se lo pide (lo que el director necesita, se pide)
    if (d.ultracode && !d.ultracodeDirector) return cambiarPermisoUltracode(true).then(() => { if (!d.ultracodeDirector) avisar(tx('guardado.ultraSinDirector'), true); });
    return avisar(d.ultracode ? tx('guardado.ultraEncendido') : tx('guardado.ultraApagado', { yDirector: d.ultracodeDirector ? tx('guardado.yDirector') : '' }), true);
  }
  const sync = (e.target as HTMLElement).closest<HTMLInputElement>('[data-sincronizar]');
  if (sync) await accion({ tipo: 'sincronizar', activo: sync.checked }, tx(sync.checked ? 'guardado.subidaSi' : 'guardado.subidaNo'));
  // Los idiomas que lee una persona, en su ficha del equipo (pd_reglas_lectura): se guardan todos los marcados de esa ficha
  const lee = (e.target as HTMLElement).closest<HTMLInputElement>('[data-lee]');
  if (lee) {
    const id = lee.dataset.lee!.split('|')[0];
    const marcados = [...document.querySelectorAll<HTMLInputElement>('[data-lee]')].filter((x) => x.dataset.lee!.split('|')[0] === id && x.checked).map((x) => x.dataset.lee!.split('|')[1]);
    if (!(await accion({ tipo: 'idiomas_integrante', id, lee: marcados }))) lee.checked = !lee.checked;
  }
});

/**
 * Todo botón que hace esperar (guardar, llamar al director, cargar) lo dice en él mismo: si a los 300 ms no terminó, se
 * pone en espera, con sus puntos, hasta que termina. Con un diálogo abierto, no: lo que espera es tu respuesta.
 */
/**
 * Con la niebla puesta, lo que hace avanzar (elegir, marcar un paso, «Entendido», una decisión, entregar o ir a otro lugar)
 * espera a que se destape todo el texto de su caja: la tarjeta de la misión o la idea del documento. Al tocarlo antes, el
 * director de la niebla brinca donde falta y el director lo recuerda (nota de voz del titular nmvojwvsmtit, 25 de octubre
 * de 2026: eligió una opción con textos aún nublados y no pudo volver a ellos; el objetivo de la niebla es que se lea
 * todo). Comentar, el enfoque, los controles de la niebla y los de la franja del enfoque (el tema y el sonido, que no
 * hacen avanzar nada) siguen libres. Lo que va y vuelve también (nota de voz del
 * titular nmvolmqojtit, 25 de octubre de 2026): el botón de un paso que lleva a un documento, a una sección o a una página
 * (data-destino), y abrir o copiar su orden de terminal o el texto que se pega afuera, porque al volver la tarjeta sigue
 * igual y la lectura sigue donde iba; se frena solo lo que cambia la tarjeta o la misión. Sin niebla, nada cambia.
 */
const CAJA_NIEBLA = '.mision-c, .trozo';
const LIBRE_DE_NIEBLA = '[data-comentar], [data-enfoque], [data-niebla], [data-niebla-auto], [data-volver-mision], [data-destino], [data-terminal], [data-copiar-orden], [data-copiar-texto], .gl-control, [data-tema], [data-sonido]';
document.addEventListener('click', (e) => {
  const accion = (e.target as HTMLElement).closest<HTMLElement>('button, input[type="checkbox"]');
  if (!accion || accion.closest(LIBRE_DE_NIEBLA)) return;
  const caja = accion.closest(CAJA_NIEBLA);
  const nublado = caja ? nubladoEn(caja) : null;
  if (!nublado) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  llamarNiebla(nublado, NO_AVANZA);
  decir(tx('niebla.primeroTermina'), 'pensativo');
}, true);

$('vista').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!b) return;
  // El tipo de una nota plegada está en su línea: cambiarlo no la despliega
  if (b.dataset.cambiarTipo !== undefined) e.preventDefault();
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
  } else if (ds.verSesionesGh !== undefined) {
    await cargarSesionesGh();
  } else if (ds.usarSesionGh) {
    // «Usar esta»: cambia la sesión activa de gh para todo el computador, y por eso lo dice antes
    const login = ds.loginGh ?? ds.usarSesionGh;
    if (!(await confirmar({ titulo: tx('proyecto.sesionGhUsarTitulo', { login }), texto: tx('proyecto.sesionGhUsarTexto', { login }), boton: tx('proyecto.sesionGhUsar') }))) return;
    b.disabled = true;
    try {
      const r = await fetch('/__estudio/director/cuenta-git/usar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: ds.usarSesionGh }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? tx('nuevo.servidorRespondio', { estado: r.status }));
      avisar(tx('proyecto.sesionGhUsada', { login }), true);
      await cargarSesionesGh();
    } catch (err) {
      avisar(esDeRed(err) ? SIN_SERVIDOR() : (err as Error).message);
    } finally {
      b.disabled = false;
    }
  } else if (ds.entrarGh !== undefined) {
    // «Entrar con otra cuenta»: gh auth login --web, con el código a la vista y la lista que se actualiza al terminar
    if (!(await confirmar({ titulo: tx('proyecto.sesionGhEntrarTitulo'), texto: tx('proyecto.sesionGhEntrarTexto'), boton: tx('proyecto.sesionGhEntrarBoton') }))) return;
    b.disabled = true;
    try {
      const r = await fetch('/__estudio/director/cuenta-git/entrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? tx('nuevo.servidorRespondio', { estado: r.status }));
      sesionesGh = { cargando: false, hayGh: true, aprobada: null, sesiones: [], ...(sesionesGh ?? {}), entrada: j.entrada as EntradaGh };
      pintar();
      seguirEntradaGh();
    } catch (err) {
      avisar(esDeRed(err) ? SIN_SERVIDOR() : (err as Error).message);
    } finally {
      b.disabled = false;
    }
  } else if (ds.activar) {
    await activar(ds.activar);
  } else if (ds.guardarAjustes !== undefined) {
    // Tus ajustes de Claude Code en el director, clave por clave: sin ellos, conserva las marcadas
    const marcadas = [...(b.closest('[data-ancla="m-ajustes"]')?.querySelectorAll<HTMLInputElement>('[data-ajuste]') ?? [])].filter((c) => c.checked).map((c) => c.dataset.ajuste!);
    await cambiarAjustesPropios(false, marcadas);
  } else if (ds.cargarAjustes !== undefined) {
    await cambiarAjustesPropios(true);
  } else if (ds.autorizarPermisos !== undefined) {
    // Lo que se le negó al director, autorizado con su casilla y su alcance, en un solo envío
    const marcados = (panelPermisos?.pendientes ?? []).filter((n) => n.regla && !n.nunca && permisosMarcados.has(clavePermiso(n)));
    if (!marcados.length) return avisar(tx('guardado.marcaPermiso'));
    const guardado = await cambiarPermisos({ autorizar: marcados.map((n) => ({ regla: n.regla!, proyecto: n.proyecto, alcance: alcanceElegido.get(clavePermiso(n)) ?? 'proyecto' })) });
    // «Autorizo y pido la revisión»: el mismo clic pide la revisión del proyecto activo, porque el botón lo dice
    if (guardado && ds.autorizarPermisos === 'revision') await pedirLaRevision(true, 'permisos');
  } else if (ds.autorizarSkills !== undefined) {
    // Las skills de los proyectos (pr_skills_cierre): lo marcado, en un solo envío; la huella la pone el servidor
    const marcadas = (panelSkills?.skills ?? []).filter((s) => s.estado !== 'autorizada' && skillsMarcadas.has(claveSkill(s)));
    if (!marcadas.length) return avisar(tx('guardado.marcaSkill'));
    await cambiarSkills({ autorizar: marcadas.map(({ proyecto, nombre, ruta }) => ({ proyecto, nombre, ruta })) });
  } else if (ds.quitarSkill) {
    const q = JSON.parse(ds.quitarSkill) as { proyecto: string; nombre: string; ruta: string };
    if (await confirmar({ titulo: tx('quitar.skillTitulo'), texto: tx('quitar.skillTexto', { nombre: q.nombre, proyecto: nombreDeProyecto(q.proyecto) }), boton: tx('quitar.skillBoton'), cancelar: tx('quitar.skillCancelar') })) await cambiarSkills({ quitar: [q] });
  } else if (ds.quitarPermiso) {
    const q = JSON.parse(ds.quitarPermiso) as { regla: string; alcance: string; proyecto?: string };
    if (await confirmar({ titulo: tx('quitar.permisoTitulo'), texto: tx('quitar.permisoTexto', { regla: q.regla }), boton: tx('quitar.permisoBoton'), cancelar: tx('quitar.permisoCancelar') })) await cambiarPermisos({ quitar: [q] });
  } else if (ds.corregirTranscripcion) {
    const audio = ds.corregirTranscripcion;
    // Sin transcripción (no se pudo en este computador), se escribe lo que se dijo, y el audio se borra al guardarlo
    const sinTexto = d.transcripciones[audio] === undefined;
    const r = await pedir({
      titulo: tx(sinTexto ? 'buzon.escribir' : 'nota.corregirEntendido'),
      ayuda: tx(sinTexto ? 'nota.ayudaEscribir' : 'nota.ayudaEntendido'),
      campos: [{ id: 'texto', etiqueta: tx('nota.loQueDijiste'), tipo: 'area', valor: d.transcripciones[audio] ?? '', requerido: true }],
      boton: tx('nota.guardar'),
    });
    if (r && (await accion({ tipo: 'corregir_transcripcion', audio, texto: r.texto }, tx('nota.transcripcionCorregida')))) {
      d.transcripciones[audio] = r.texto.trim(); // el .txt ya cambió: se muestra sin esperar a la próxima lectura
      pintar();
    }
  } else if (ds.pestanaModelo !== undefined) {
    cambiarPestanaModelo(ds.pestanaModelo);
  } else if (ds.pestanaRuta !== undefined) {
    cambiarPestanaRuta(ds.faseDePestana, ds.pestanaRuta);
  } else if (ds.letra !== undefined) {
    // Los ajustes de lectura son de este navegador: se aplican sin repintar, para no perder dónde ibas
    localStorage.setItem('estudio.lector.letra', ds.letra);
    const lector = b.closest<HTMLElement>('.lector');
    if (lector) {
      lector.className = `lector ${claseLector()}`;
      lector.querySelector('.ajustes-lector')!.outerHTML = ajustesLector(doc?.ruta ?? '');
    }
  } else if (ds.leidoParte !== undefined) {
    // Leer un documento se marca donde se lee, parte por parte: con la última, el paso de la misión queda hecho solo
    await marcarParte(ds.leidoParte);
  } else if (ds.copiarHilo) {
    const hilo = hilosDePreguntas(d.estado.notas).find((h) => h.raiz.id === ds.copiarHilo);
    if (hilo) await navigator.clipboard.writeText(hiloEnTexto(hilo.notas)).then(() => avisar(tx('preguntas.copiada'), true), () => avisar(tx('preguntas.noCopio')));
  } else if (ds.seguirHilo) {
    // Lo que se sigue preguntando o comentando sobre una respuesta queda en su misma conversación, guardado con el ✉
    // abierto: si el servidor falla, nada se pierde (pd_nada_se_corta)
    const hilo = ds.seguirHilo;
    await pedir({ titulo: tx('preguntas.seguir'), ayuda: avisoRevisando() + tx('preguntas.seguirAyuda'), campos: [{ id: 'texto', etiqueta: tx('preguntas.seguirEtiqueta'), tipo: 'area' }], boton: tx('preguntas.seguirBoton'), audio: true, adjuntos: true,
      guardar: async (r) => {
        hilosAbiertos.add(raizDePregunta(d.estado.notas.find((n) => n.id === hilo)!, d.estado.notas).id);
        return accion({ tipo: 'comentar', sobre: { tipo: 'pregunta', id: hilo }, texto: r.texto ?? '', audio: r.audio, ...(r.adjuntos?.length ? { adjuntos: r.adjuntos } : {}) },tx('preguntas.seguirAgregado'));
      } });
  } else if (ds.fase) {
    // Un clic en una fase de la barra delgada abre «Datos del proceso» en esa fase (nmw0zzx7itit)
    faseVista = ds.fase;
    if (vista !== 'ruta') irA('ruta');
    else pintar();
  } else if (ds.ir) {
    if (ds.ir === 'ruta') faseVista = null;
    irA(ds.ir as Vista);
  } else if (ds.destino !== undefined) {
    const dest = destinos[Number(ds.destino)];
    // El botón de un paso, abierto: desde ahora se pueden elegir sus opciones
    const abre = ds.abre?.split('|');
    if (abre) localStorage.setItem(claveAbierto(abre[0], Number(abre[1])), '1');
    // Desde el paso de una misión a un documento: el documento ofrece volver a ella
    const deMision = b.closest<HTMLElement>('.mision-c')?.dataset.ancla?.replace(/^mision-/, '');
    if (deMision && dest) desdeMision = desdeElPaso(deMision, dest, vistaDeDestino(dest)) ?? desdeMision;
    await ir(dest);
    // Una página de afuera se abre en otra pestaña, y el diálogo para escribirle se cierra aquí mismo, también con
    // «Cancelar»: el paso se repinta, ya con sus opciones
    if (abre && dest && seQuedaEnLaVista(dest)) pintar();
  } else if (ds.verPasadas !== undefined) {
    // El filtro de las propuestas: solo las que esperan respuesta, o todas las de la fase (también las decididas)
    verPropuestasPasadas = ds.verPasadas === '1';
    pintar();
  } else if (ds.desmarcarPaso) {
    // «Desmarcar»: quita la marca de un paso ya hecho, a la vista en «Completado»
    const casilla = $('vista').querySelector<HTMLInputElement>(`[data-paso="${CSS.escape(ds.desmarcarPaso)}"]`);
    if (casilla?.checked) {
      casilla.checked = false;
      casilla.dispatchEvent(new Event('change', { bubbles: true }));
    }
  } else if (ds.continuar !== undefined) {
    const [id, i, modo] = ds.continuar.split('|');
    const paso = d.plan.misiones.find((x) => x.id === id)?.pasos[Number(i)];
    if (typeof paso !== 'object' || !paso.ir?.doc) return;
    desdeMision = { id, ruta: paso.ir.doc };
    // Como con el botón del paso: ya se vio, y al volver lo que sigue es contar cómo fue (tarjetaMision)
    localStorage.setItem(claveAbierto(id, Number(i)), '1');
    await ir(paso.ir);
    if (modo === 'enfoque' && vista === 'documentos' && doc?.ruta === paso.ir.doc) quererEnfoque(true);
  } else if (ds.volverMision) {
    const m = d.plan.misiones.find((x) => x.id === ds.volverMision);
    desdeMision = null;
    if (m) await ir({ vista: 'misiones', ancla: `mision-${m.id}`, etiqueta: '' });
  } else if (ds.doc !== undefined) {
    await abrirDocumento(ds.doc, ds.seccion || null, !!b.closest('[data-ancla="d-clave"]'));
  } else if (ds.cargarDocs !== undefined) {
    await cargarDocumentos(true);
    pintar();
  } else if (ds.entregar) {
    const m = d.plan.misiones.find((x) => x.id === ds.entregar)!;
    // Con todos sus pasos marcados, la misión ya está hecha: se entrega como al marcar el último, sin la ventana «Lo hice»
    // de por medio (nota de voz del titular nmvvdc2f4tit). Lo que quiera contar va en el ✉ de la misión
    const hechosYa = pasosHechos(m.id);
    if (m.pasos.length && m.pasos.every((_, k) => hechosYa.includes(k))) {
      if (!entregandoSola.has(m.id) && await completarSiToca(m.id, accion({ tipo: 'paso', mision: m.id, hechos: hechosYa }, ''))) decir(tx('mision.completadaDirector'), 'riendo');
      return;
    }
    const r = await pedir({
      titulo: tx('lohice.titulo', { titulo: m.titulo }),
      ayuda: `<b>${tx('mision.entrega')}</b> ${esc(m.entrega)}<br>${tx('lohice.ayuda')}${m.documentos?.length ? ` ${tx('lohice.comentarios')}` : ''}`,
      campos: [{ id: 'nota', etiqueta: tx('lohice.campo'), tipo: 'area' }],
      boton: tx('mision.entregar'),
      audio: true,
      adjuntos: true,
      vacioVale: true,
    });
    // Los pasos marcados aquí se guardan antes de entregar: si el guardado del último falló, la entrega no se va sin él
    const hechos = pasosHechos(m.id);
    if (r && m.pasos.length && hechos.length && !(await accion({ tipo: 'paso', mision: m.id, hechos }, ''))) return;
    if (r && (await accion({ tipo: 'entregar', mision: m.id, nota: r.nota, audio: r.audio }, tx('lohice.hecho', { xp: m.xp })))) {
      sonar('entrega');
      await anexar(r, { tipo: 'mision', id: m.id }, `Con la entrega de «${m.titulo}»`, false);
    }
  } else if (ds.deshacerEntrega) {
    await accion({ tipo: 'deshacer_entrega', mision: ds.deshacerEntrega });
  } else if (ds.copiarOrden !== undefined) {
    await navigator.clipboard.writeText(ds.copiarOrden).then(() => avisar(tx('copiar.orden'), true), () => avisar(tx('copiar.noSePudo')));
  } else if (ds.copiarTexto !== undefined) {
    await navigator.clipboard.writeText(ds.copiarTexto).then(() => avisar(tx('copiar.texto'), true), () => avisar(tx('copiar.textoNoSePudo')));
  } else if (ds.terminal) {
    // La ventana se abre en este computador, con la orden corriendo; el paso se marca a mano cuando termine
    const [mision, i] = ds.terminal.split('|');
    b.setAttribute('disabled', '');
    const r = await fetch('/__estudio/director/terminal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mision, paso: Number(i) }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
    b.removeAttribute('disabled');
    if (r instanceof Error) return avisar(tx('servidor.noHabla'));
    if (!r.ok) return avisar((await r.json().catch(() => ({}))).error ?? tx('terminal.noSePudo'));
    const p = d.plan.misiones.find((x) => x.id === mision)?.pasos[Number(i)];
    avisar(tx('terminal.abierta', { boton: tx('paso.yaLoHice'), despues: tx(typeof p !== 'string' && p?.comprobar ? 'terminal.despuesComprueba' : 'terminal.despuesMarca') }), true);
  } else if (ds.medir) {
    // La medición del núcleo: se pide con su consumo a la vista, en un diálogo, y se detiene al terminar la vuelta que corre
    const pedirla = ds.medir === 'pedir';
    let cuerpo: { pedir: true; alcance: AlcanceMedicion } | { pedir: true; casos: string[] } = { pedir: true, alcance: 'todos' };
    if (pedirla) {
      const m = d.medicion;
      const e = m?.estimado;
      const total = m?.casos ?? 0;
      // Con una medición anterior, lo que ya pasa no se vuelve a correr: se eligen uno por uno los que fallan, o todos
      // para una base nueva (nota de voz del titular nmvsgcn7otit, 28 de octubre de 2026)
      const elegir = !!m?.ultima;
      const cuanto = (x: { estimado: EstadoMedicion['estimado']; minutos: number | null } | undefined) => {
        const tokens = x?.estimado ? tx('medir.unosTokens', { tokens: miles(x.estimado.total) }) : '';
        const tiempo = x?.minutos ? duracionAprox(x.minutos, idiomaActual()) : '';
        const dicho = tokens && tiempo ? tx('medir.tokensYTiempo', { tokens, tiempo }) : tokens || tiempo;
        return dicho ? ` (${dicho})` : '';
      };
      const unCaso = cuanto(m?.unCaso);
      const todos = cuanto(m?.alcances?.find((a) => a.alcance === 'todos'));
      const opciones: [string, string][] = [
        ...(m?.fallan ?? []).map((c): [string, string] => [c.id, tx('medir.queFalla', { titulo: c.titulo, cuanto: unCaso })]),
        ['todos', tx('medir.todos', { total, cuanto: todos })],
      ];
      const si = await pedir({
        titulo: tx('medir.titulo'),
        ayuda: elegir
          ? tx('medir.ayudaElegir', { ninguno: m?.fallan?.length ? '' : tx('medir.ninguno') })
          : tx('medir.ayudaPrimera', { total, gasta: e ? tx('medir.gastaCon', { gasta: cuantoGasta(e), tokens: miles(e.porVuelta) }) : tx('medir.gastaAlTerminar') }),
        campos: elegir ? [{ id: 'casos', etiqueta: tx('medir.queCasos'), tipo: 'casillas', opciones, requerido: true }] : [],
        boton: tx('medir.boton'),
        vacioVale: true,
      });
      if (!si) return;
      const marcados = (si.casos ?? '').split(',').filter(Boolean);
      if (elegir && !marcados.includes('todos')) cuerpo = { pedir: true, casos: marcados };
    }
    b.setAttribute('disabled', '');
    const r = await fetch('/__estudio/director/medicion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pedirla ? cuerpo : { detener: true }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
    b.removeAttribute('disabled');
    if (r instanceof Error) return avisar(tx('guardado.sinServidor'));
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return avisar(j.error ?? tx('guardado.noSePudo'));
    if (j.medicion) d.medicion = j.medicion;
    avisar(tx(pedirla ? 'medir.empezo' : 'medir.seDetiene'), true);
    pintar();
  } else if (ds.abrirClaude !== undefined) {
    // Claude Code en una terminal nueva, como lo lanza el Studio; es una sesión tuya, aparte del Studio
    b.setAttribute('disabled', '');
    const r = await fetch('/__estudio/director/abrir-claude', { method: 'POST', signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
    b.removeAttribute('disabled');
    if (r instanceof Error) return avisar(tx('servidor.noHabla'));
    if (!r.ok) return avisar((await r.json().catch(() => ({}))).error ?? tx('terminal.noSePudo'));
    avisar(tx('terminal.claudeAbierto'), true);
  } else if (ds.modoPermisos) {
    // Cómo pide permisos el director: solo lo autorizado, «Me pregunta en el Studio» o «Automático, vigilado»
    await cambiarModoPermisos(modoDe(ds.modoPermisos));
  } else if (ds.probarPermiso) {
    // El simulacro del diálogo de permisos: no va al servidor y dice lo que habría pasado (t_simulacro_permiso)
    probarDialogo((texto) => avisar(texto, true));
  } else if (ds.permisoUltracode) {
    // El permiso del director para seguir a ultracode: darlo pide «Autorizo», quitarlo no
    await cambiarPermisoUltracode(ds.permisoUltracode === 'si');
  } else if (ds.yaHice) {
    // «Ya lo hice»: lo mismo que «Listo, ya lo hice» (con su comprobación, si la tiene), a la vista junto a la orden
    const casilla = $('vista').querySelector<HTMLInputElement>(`[data-paso="${CSS.escape(ds.yaHice)}"]`);
    if (casilla && !casilla.checked) {
      casilla.checked = true;
      casilla.dispatchEvent(new Event('change', { bubbles: true }));
    }
  } else if (ds.noSalio) {
    const [id, i] = ds.noSalio.split('|');
    void seguirConOtra(id, Number(i));
  } else if (ds.aclarar) {
    const [id, i] = ds.aclarar.split('|');
    await pedirAclaracion(id, Number(i));
  } else if (ds.comprobarPaso) {
    const [id, i] = ds.comprobarPaso.split('|');
    await pedirComprobacion(id, Number(i));
  } else if (ds.elegir) {
    // Elegir una opción del paso: un clic, sin ir al Buzón; queda como nota del paso y el paso se marca solo
    const [id, i, k] = ds.elegir.split('|');
    const p = d.plan.misiones.find((x) => x.id === id)?.pasos[Number(i)];
    const eleccion = p && typeof p !== 'string' ? p.opciones?.[Number(k)] : undefined;
    if (!eleccion) return;
    await elegirEnPaso(b, id, Number(i), eleccion, opcionConDetalle(eleccion));
  } else if (ds.marcarOpcion) {
    // Un paso con `varias`: marcar o desmarcar, sin guardar nada todavía; «Listo» las entrega juntas
    const [id, i, k] = ds.marcarOpcion.split('|');
    const p = d.plan.misiones.find((x) => x.id === id)?.pasos[Number(i)];
    if (p && typeof p !== 'string' && p.opciones?.[Number(k)] !== undefined) marcarOpcion(`${id}|${i}`, Number(k), p.opciones);
  } else if (ds.elegirVarias) {
    const [id, i] = ds.elegirVarias.split('|');
    const p = d.plan.misiones.find((x) => x.id === id)?.pasos[Number(i)];
    const opciones = p && typeof p !== 'string' ? p.opciones ?? [] : [];
    const marcadas = [...(marcadasVarias.get(ds.elegirVarias) ?? [])].filter((k) => opciones[k] !== undefined);
    if (!marcadas.length) return;
    if (await elegirEnPaso(b, id, Number(i), juntarElecciones(opciones, marcadas), marcadas.some((k) => opcionConDetalle(opciones[k])))) marcadasVarias.delete(ds.elegirVarias);
  } else if (ds.yaLoDije) {
    // «Ya te lo dije en mi comentario»: el paso queda respondido con lo que ya dijo con su ✉, sin elegir otra opción
    const [id, i] = ds.yaLoDije.split('|');
    b.setAttribute('disabled', '');
    const sobre = { tipo: 'mision' as const, id, seccion: seccionPaso(Number(i)), eleccion: YA_LO_DIJE };
    if (!(await accion({ tipo: 'comentar', sobre }, ultimoPaso(id, Number(i)) ? '' : tx('paso.listoComentario')))) b.removeAttribute('disabled');
  } else if (ds.yaLoComente) {
    // «Ya lo comenté antes»: el paso queda respondido con una instrucción anterior, sin elegir ni comentar (nmw1l6eo6tit)
    const [id, i] = ds.yaLoComente.split('|');
    b.setAttribute('disabled', '');
    const sobre = { tipo: 'mision' as const, id, seccion: seccionPaso(Number(i)), eleccion: YA_LO_COMENTE };
    if (!(await accion({ tipo: 'comentar', sobre }, ultimoPaso(id, Number(i)) ? '' : tx('paso.listoComentario')))) b.removeAttribute('disabled');
  } else if (ds.hazlo) {
    // «Hazlo tú»: primero, qué hará el director; con el segundo clic, el encargo queda en el Buzón y el paso se marca solo.
    // No se ejecuta ahora: lo hace en su revisión siguiente
    const [id, i] = ds.hazlo.split('|');
    const p = d.plan.misiones.find((x) => x.id === id)?.pasos[Number(i)];
    const que = p && typeof p !== 'string' ? p.hazlo : undefined;
    if (!que) return;
    const si = await confirmar({
      titulo: tx('hazlo.titulo'),
      texto: tx('hazlo.texto', { que, cuando: tx(revisando() ? 'hazlo.revisionSiguiente' : 'hazlo.proximaRevision') }),
      boton: tx('hazlo.boton'),
      cancelar: tx('hazlo.cancelar'),
    });
    if (si) await accion({ tipo: 'comentar', sobre: { tipo: 'mision', id, seccion: seccionPaso(Number(i)), hazlo: true }, texto: `Hazlo tú: ${que}` }, tx('hazlo.hecho'));
  } else if (ds.comentar !== undefined) {
    const [tipo, id, seccion, decision, fragmento, postura] = ds.comentar.split('|');
    const tituloMision = d.plan.misiones.find((m) => m.id === id)?.titulo ?? '';
    const titulo =
      decision ? (postura === 'comenta' ? tx('comentar.decisionSin', { decision }) : postura === 'decide' ? tx('comentar.decido', { decision }) : tx('comentar.decision', { decision }))
      : fragmento ? tx('comentar.idea', { fragmento: recortar(fragmento, 70) })
      : tipo === 'documento' ? (seccion ? tx('comentar.documentoDe', { seccion }) : tx('comentar.elDocumento'))
      : tipo === 'mision' ? (!seccion ? tx('comentar.mision', { titulo: tituloMision }) : /^Paso \d+$/.test(seccion) ? tx('comentar.pasoDeMision', { n: seccion.slice(5), titulo: tituloMision }) : tx('comentar.seccionDeMision', { seccion: seccion.toLowerCase(), titulo: tituloMision }))
      : tipo === 'propuesta' ? tx('comentar.propuesta', { titulo: d.plan.propuestas.find((p) => p.id === id)?.titulo ?? '' })
      : tipo === 'diagnostico' ? (seccion ? tx('comentar.diagnosticoDe', { frente: nombreFrente(seccion) }) : tx('comentar.diagnostico'))
      : tipo === 'objetivo' ? (id ? tx('comentar.metaDe', { texto: d.plan.objetivos.find((o) => o.id === id)?.texto ?? '' }) : tx('comentar.meta'))
      : tx('comentar.criterio');
    const dejada = await comentar({ tipo, ...(id ? { id } : {}), ...(seccion ? { seccion } : {}), ...(decision ? { decision } : {}), ...(fragmento ? { fragmento } : {}), ...(decision && postura ? { postura } : {}) }, titulo);
    // Responder la última decisión de una parte (con sus ideas ya entendidas) la deja leída; comentarla la deja abierta
    if (dejada && tipo === 'documento' && decision && id && postura !== 'comenta') await decisionRespondida(id, seccion ?? '');
    // Comentar una idea no la marca ni avanza: solo «Entendido» lleva a la siguiente, porque se puede comentar una idea
    // (o varias líneas suyas) más de una vez antes de darla por entendida (nota de voz del titular, 24 de octubre de 2026)
  } else if (ds.aprobar !== undefined) {
    // Aprobar lo que recomienda el director: un clic, sin escribir; queda en el Buzón como tu respuesta, firmada
    const [ruta, seccion, decision] = ds.aprobar.split('|');
    b.setAttribute('disabled', '');
    if (await accion({ tipo: 'comentar', sobre: { tipo: 'documento', id: ruta, seccion, decision, postura: 'aprueba' } }, tx('comentar.aprobado'))) await decisionRespondida(ruta, seccion);
    else b.removeAttribute('disabled');
  } else if (ds.entendido !== undefined) {
    // Antes de tiempo, el seguro lo dice con humor y con lo que falta, y la idea no se marca
    const faltan = Number(ds.listo ?? 0) - Date.now();
    if (faltan > 0) return avisar(avisoDeEspera(faltan / 1000));
    const corte = ds.entendido.lastIndexOf('|');
    await marcarTrozo(ds.entendido.slice(0, corte), Number(ds.entendido.slice(corte + 1)));
  } else if (ds.plegarLista !== undefined) {
    // La columna de los documentos se pliega para leer a todo el ancho (es de este navegador)
    localStorage.setItem('estudio.docs.lista', listaPlegada() ? 'abierta' : 'plegada');
    b.closest('.docs')?.classList.toggle('sin-lista', listaPlegada());
  } else if (ds.cambiarTipo) {
    const n = d.estado.notas.find((x) => x.id === ds.cambiarTipo);
    if (!n) return;
    const r = await pedir({ titulo: tx('buzon.cambiarTipoTitulo'), ayuda: tx('buzon.cambiarTipoAyuda'), campos: [campoTipo(n.tipo ?? TIPO_ELIGE)], boton: tx('buzon.guardarTipo') });
    if (r?.tipoNota && r.tipoNota !== n.tipo) await accion({ tipo: 'tipo_nota', id: n.id, tipoNota: r.tipoNota }, tx('buzon.tipoCambiado'));
  } else if (ds.borrarNota) {
    if (await confirmar({ titulo: tx('buzon.quitarTitulo'), texto: tx('buzon.quitarTexto'), boton: tx('buzon.quitar'), peligro: true })) await accion({ tipo: 'borrar_nota', id: ds.borrarNota }, tx('buzon.quitada'));
  } else if (ds.editarNota) {
    // Una nota de voz se corrige en lo que se entendió de ella (el audio queda igual); una escrita, en su texto. Y a
    // cualquiera se le suma algo hablando (nota de voz del titular nmvonrzz6tit, 25 de octubre de 2026; pedido
    // pd_tipo_voz): lo grabado se transcribe en este computador al guardar y queda al final de la nota escrita o, si
    // solo es de voz, de lo que se entendió de ella. El audio nuevo no se guarda: solo su texto
    const n = d.estado.notas.find((x) => x.id === ds.editarNota)!;
    const dicho = n.audio ? d.transcripciones[n.audio] : undefined;
    const conTexto = !!(n.texto || !n.audio);
    // Lo que se le suma a una nota con audio va después de él (Nota › despues): si no, lo escrito salía antes que el audio
    // aunque hubiera entrado después (nota de voz del titular nmvwpl26stit). Con lo dicho a la vista y sin texto, va en lo dicho
    const conDespues = !!n.audio && (!dicho || !!n.texto || !!n.despues);
    // Para rehacer una parte con la voz (pd_tipo_voz): la selección de cada campo sigue ahí al oprimir «Grabar» y «Guardar»;
    // vale la del último campo que tocaste
    let ultimoCampo: Marca['campo'] | null = null;
    // La transcripción que empezó al detener la grabación (transcribirAlDetener, abajo)
    let pre: ReturnType<typeof transcribirAlDetener> | null = null;
    const marcaAlGuardar = () => marcaDeCampos((['texto', 'dicho', 'despues'] as const).flatMap((campo) => {
      const t = $('dialogo').querySelector<HTMLTextAreaElement>(`textarea[name="${campo}"]`);
      return t ? [{ campo, inicio: t.selectionStart, fin: t.selectionEnd }] : [];
    }), ultimoCampo);
    const antes = grabadoraDelSobre;
    const corrigiendo = pedir({
      titulo: tx('nota.corregirTitulo'),
      ayuda: `${tx('nota.ayudaInicio')}${dicho ? ` ${tx('nota.ayudaDicho')}` : ''} ${tx('nota.ayudaGrabar', { donde: tx(conTexto || conDespues ? 'nota.enTuNota' : 'nota.enLoDicho') })}${n.adjuntos?.length ? ` ${tx('nota.ayudaQuitar')}` : ''}`,
      campos: [
        ...(conTexto ? [{ id: 'texto', etiqueta: tx('nota.tuNota'), tipo: 'area' as const, valor: n.texto ?? '' }] : []),
        ...(dicho ? [{ id: 'dicho', etiqueta: tx('nota.loDicho'), tipo: 'area' as const, valor: dicho, requerido: true }] : []),
        ...(conDespues ? [{ id: 'despues', etiqueta: tx('nota.loSumado'), tipo: 'area' as const, valor: n.despues ?? '' }] : []),
      ],
      boton: tx('nota.guardar'),
      audio: true,
      // Las imágenes también se corrigen: se suman pegándolas o adjuntándolas, y se quitan con su casilla (notas de voz
      // del titular nmvosyiartit y nmvot02hhtit, 26 de octubre de 2026; pedido pd_corregir_adjuntos)
      adjuntos: true,
      actuales: n.adjuntos ?? [],
      vacioVale: true,
      guardar: async (r) => {
        let texto: string | undefined = r.texto;
        let nuevo: string | undefined = r.dicho;
        let despues: string | undefined = r.despues;
        // Si vació lo que se entendió de su audio y grabó, lo dicho lo reemplaza (nota de voz nmvpmv30ytit)
        const reemplaza = !!(r.audio && dicho && !(nuevo ?? '').trim());
        const marca = r.audio ? marcaAlGuardar() : null;
        if (r.audio) {
          // Lo que empezó a transcribirse al detener la grabación, si después no se grabó más; si no, ahora
          const previo = (await pre?.esperar()) ?? null;
          const sumado = previo ?? (await dictar(r.audio));
          if (sumado === null) return false;
          ({ texto, dicho: nuevo, despues } = repartirDictado({ texto, dicho: nuevo, despues }, sumado, marca));
        }
        // Lo que se entendió de un audio no queda vacío: se dice antes de guardar nada, con lo que puede hacer
        if (dicho && nuevo !== undefined && !nuevo.trim()) {
          avisar(tx('nota.dichoVacio'));
          return false;
        }
        const alGuardar = r.audio ? (marca ? tx('nota.corregidaMarca') : reemplaza ? tx('nota.corregidaReemplaza') : tx('nota.corregidaFinal', { donde: tx(conTexto || conDespues ? 'nota.enTuNota' : 'nota.enLoDicho') })) : tx('nota.corregida');
        const conAdjuntos = !!(r.adjuntos?.length || r.quitarAdjuntos?.length);
        const cambioTexto = texto !== undefined && texto.trim() !== (n.texto ?? '').trim();
        const cambioDespues = despues !== undefined && despues.trim() !== (n.despues ?? '').trim();
        if ((cambioTexto || cambioDespues || conAdjuntos) && !(await accion({ tipo: 'editar_nota', id: n.id, texto: texto ?? n.texto ?? '', ...(despues !== undefined ? { despues } : {}), ...(r.adjuntos?.length ? { adjuntos: r.adjuntos } : {}), ...(r.quitarAdjuntos?.length ? { quitarAdjuntos: r.quitarAdjuntos } : {}) }, alGuardar))) return false;
        if (dicho && nuevo !== undefined && nuevo.trim() !== dicho.trim()) {
          if (!(await accion({ tipo: 'corregir_transcripcion', audio: n.audio, texto: nuevo }, alGuardar))) return false;
          d.transcripciones[n.audio!] = nuevo.trim(); // el .txt ya cambió: se muestra sin esperar a la próxima lectura
          pintar();
        }
        return true;
      },
    });
    // Lo grabado empieza a transcribirse apenas se detiene, con su indicador en el diálogo, sin esperar a «Guardar»
    if (grabadoraDelSobre !== antes) pre = transcribirAlDetener(grabadoraDelSobre, (t) => tx(marcaAlGuardar() ? 'nota.seEntendioMarca' : 'nota.seEntendioSuma', { texto: recortar(t, 200) }));
    // El diálogo ya está en pantalla: se anota el último campo que tocas, para saber cuál marcaste
    const mientras = new AbortController();
    $('dialogo').addEventListener('focusin', (e) => {
      const nombre = (e.target as HTMLTextAreaElement).name;
      if (nombre === 'texto' || nombre === 'dicho' || nombre === 'despues') ultimoCampo = nombre;
    }, { signal: mientras.signal });
    await corrigiendo;
    mientras.abort();
  } else if (ds.decidir) {
    const c = d.plan.fases.flatMap((f) => f.criterios).find((x) => x.id === ds.decidir)!;
    const r = await pedir({
      titulo: tx('decidir.titulo'),
      ayuda: tx('decidir.ayuda', { texto: esc(c.texto) }),
      campos: [
        { id: 'estado', etiqueta: tx('decidir.decidoQue'), tipo: 'select', opciones: [['cumplido', tx('decidir.cumplido')], ['no_aplica', tx('decidir.noAplica')]] },
        { id: 'nota', etiqueta: tx('decidir.porQue'), tipo: 'area' },
      ],
      boton: tx('decidir.boton'),
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
    const r = await pedir({ titulo: tx('cruzar.titulo', { nombre: f.puerta.nombre }), ayuda: `${esc(f.puerta.prueba)}<br><br>${siguiente ? tx('cruzar.alCruzar', { siguiente: esc(siguiente) }) : tx('cruzar.ultima')}`, campos: [{ id: 'nota', etiqueta: tx('cruzar.campo'), tipo: 'area' }], boton: tx('cruzar.boton'), audio: true, adjuntos: true, vacioVale: true });
    if (r && (await accion({ tipo: 'cerrar', fase: f.id, nota: r.nota?.trim() || (r.audio ? EN_AUDIO : r.nota) }, `${tx('cruzar.hecho')}${siguiente ? ` ${tx('cruzar.ahora', { siguiente })}` : ''}`))) {
      sonar('logro');
      faseVista = null;
      await anexar(r, { tipo: 'fase', id: f.id }, `Al cruzar «${f.puerta.nombre}»`);
    }
    pintar();
  } else if (ds.reabrir) {
    const r = await pedir({ titulo: tx('reabrir.titulo'), ayuda: tx('reabrir.ayuda'), campos: [{ id: 'nota', etiqueta: tx('reabrir.porQue'), tipo: 'area', requerido: true }], boton: tx('reabrir.boton'), audio: true, adjuntos: true });
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
    const r = await pedir({ titulo: tx('propuestas.descartarTitulo', { titulo: p.titulo }), ayuda: tx('propuestas.descartarAyuda'), campos: [{ id: 'nota', etiqueta: tx('propuestas.descartarPorQue'), tipo: 'area' }], boton: tx('propuestas.descartarSi'), audio: true, adjuntos: true });
    if (r && (await accion({ tipo: 'responder', propuesta: id, estado, nota: r.nota?.trim() || (r.audio ? EN_AUDIO : undefined) }))) await anexar(r, { tipo: 'propuesta', id }, `${NOMBRE_RESPUESTA[estado as RespuestaPropuesta]}: «${p.titulo}»`);
  } else if (ds.usarCandidato) {
    const c = d.plan.objetivos.find((x) => x.id === ds.usarCandidato)!;
    borradorObjetivo = { texto: c.texto, exito: c.exito, horizonte: c.horizonte ?? '', candidato: c.id };
    anclaPendiente = 'p-objetivo';
    irA('proyecto');
  } else if (ds.replantearObjetivo !== undefined) {
    // «Replantear la meta»: la de ahora, lista para cambiarla; al guardarla se pide la revisión, y el director hace un
    // análisis fresco del proyecto hacia la meta nueva y ajusta la ruta (decidido en «Un Studio más simple»)
    const o = d.proyecto.objetivo;
    if (!o) return;
    const r = await pedir({
      titulo: tx('replantear.titulo'),
      ayuda: tx('replantear.ayuda'),
      campos: [
        { id: 'texto', etiqueta: tx('replantear.meta'), tipo: 'area', requerido: true, valor: o.texto },
        { id: 'exito', etiqueta: tx('replantear.exito'), tipo: 'area', requerido: true, valor: o.exito },
        { id: 'horizonte', etiqueta: tx('replantear.horizonte'), tipo: 'texto', valor: o.horizonte ?? '' },
        { id: 'motivo', etiqueta: tx('replantear.motivo'), tipo: 'area' },
      ],
      boton: tx('replantear.boton'),
      audio: true,
      adjuntos: true,
      vacioVale: true,
    });
    if (!r) return;
    if (!r.texto?.trim() || !r.exito?.trim()) return void avisar(tx('replantear.escribeLas'));
    const igual = r.texto.trim() === o.texto && r.exito.trim() === o.exito && (r.horizonte?.trim() ?? '') === (o.horizonte ?? '');
    if (igual) return void avisar(tx('replantear.igual'), true);
    const motivo = r.motivo?.trim() || (r.audio ? EN_AUDIO : '');
    if (!(await accion({ tipo: 'replantear_objetivo', texto: r.texto, exito: r.exito, horizonte: r.horizonte ?? '', motivo }, ''))) return;
    await anexar(r, { tipo: 'objetivo' }, 'Al replantear la meta');
    await pedirLaRevision(true, 'meta');
  } else if (ds.quitarIntegrante) {
    const i = d.proyecto.equipo.find((x) => x.id === ds.quitarIntegrante)!;
    if (await confirmar({ titulo: tx('equipo.quitarTitulo', { nombre: i.nombre }), texto: tx('equipo.quitarTexto'), boton: tx('equipo.quitarBoton'), peligro: true })) await accion({ tipo: 'quitar_integrante', id: i.id });
  }
}

$('vista').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const datos = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
  if (form.id === 'form-nota' && datos.texto?.trim()) await accion({ tipo: 'anotar', texto: datos.texto }, tx('nota.anotado'));
  if (form.id === 'form-repositorio') {
    const boton = form.querySelector('button')!;
    boton.disabled = true;
    try {
      const r = await fetch('/__estudio/director/repositorio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ruta: datos.ruta }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? tx('nuevo.servidorRespondio', { estado: r.status }));
      documentos = null;
      await cargar(true);
      avisar(tx('repositorio.conectado', { ruta: j.info.ruta }), true);
    } catch (err) {
      avisar(esDeRed(err) ? SIN_SERVIDOR() : (err as Error).message);
    } finally {
      boton.disabled = false;
    }
  }
  if (form.id === 'form-cuenta-git') {
    const boton = form.querySelector('button');
    if (boton) boton.disabled = true;
    try {
      const r = await fetch('/__estudio/director/cuenta-git', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cuenta: datos.cuenta }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? tx('nuevo.servidorRespondio', { estado: r.status }));
      await cargar(true);
      // Lo que dice GitHub, a la vista: si la sesión no es la aprobada, se sabe ahora y no al subir
      if (!j.cuenta) avisar(tx('proyecto.cuentaGitQuitada'), true);
      else if (!j.login) avisar(tx('proyecto.cuentaGitSinLeer', { cuenta: j.cuenta }));
      else if (j.coincide) avisar(tx('proyecto.cuentaGitBien', { cuenta: j.cuenta }), true);
      else avisar(tx('proyecto.cuentaGitOtra', { cuenta: j.cuenta, login: j.login }));
      // La lista de las sesiones marca la aprobada nueva
      if (sesionesGh) void cargarSesionesGh();
    } catch (err) {
      avisar(esDeRed(err) ? SIN_SERVIDOR() : (err as Error).message);
    } finally {
      if (boton) boton.disabled = false;
    }
  }
  if (form.id === 'form-proyecto') await accion({ tipo: 'proyecto', ...datos }, tx('proyecto.guardadoHecho'));
  if (form.id === 'form-objetivo') {
    if (!(await confirmar({ titulo: tx('meta.fijarTitulo'), texto: tx('meta.fijarTexto', { texto: datos.texto }), boton: tx('meta.fijarBoton') }))) return;
    if (await accion({ tipo: 'objetivo', ...datos }, tx('meta.fijada'))) borradorObjetivo = null;
  }
  if (form.id === 'form-integrante') await accion({ tipo: 'integrante', ...datos }, tx('equipo.yaEsDelEquipo', { nombre: datos.nombre }));
});

document.addEventListener('click', async (e) => {
  if (!(e.target as HTMLElement).closest('[data-preguntas]') || !d) return;
  cerrarMenuMovil();
  // Un solo canal (nota de voz del titular nmvt2rup6tit, 29 de octubre de 2026: «no hace falta un formulario diferente
  // solo para preguntas»): «Hacer una pregunta», en Preguntas, abre el mismo diálogo del comentario general, con su tipo
  // «Pregunta» ya marcado; las que esperan se ven y se corrigen en el Buzón, con el filtro «Pregunta»
  await comentar({ tipo: 'general' }, tx('buzon.unComentario'), 'pregunta');
});
// Junto a la cara del director, «Comentario»: el diálogo único, también para una pregunta (su tipo «Pregunta»)
document.addEventListener('click', async (e) => {
  if (!(e.target as HTMLElement).closest('[data-escribir]') || !d) return;
  cerrarMenuMovil();
  await escribirAlDirector();
});

/** El comentario al director en general (el director flotante, el Buzón): el mismo diálogo único, sobre nada en particular. */
async function escribirAlDirector() {
  await comentar({ tipo: 'general' }, tx('buzon.unComentario'));
}

/**
 * La tecla N abre el diálogo único sobre lo que estás mirando (tu elección del 26 de octubre de 2026): el ✉ que está más
 * cerca del centro de la pantalla (una idea, una parte, un paso), como si lo oprimieras; sin ninguno a la vista, el
 * comentario general. Y lo cierra, si es el que está abierto (nota nmvsxhzqvtit: abre y cierra, como un interruptor), con
 * lo dicho como borrador, igual que «Cancelar». Solo cuando no escribes en un campo (elegir el tipo no es escribir) ni hay
 * otro diálogo abierto, y sin Ctrl, Alt ni Cmd.
 */
document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() !== 'n' || e.ctrlKey || e.metaKey || e.altKey || e.repeat || !d) return;
  const foco = document.activeElement as HTMLElement | null;
  if (foco && (foco.isContentEditable || /^(TEXTAREA|SELECT)$/.test(foco.tagName) || (foco.tagName === 'INPUT' && !/^(radio|checkbox|button|submit)$/.test((foco as HTMLInputElement).type)))) return;
  const abierto = document.querySelector('dialog[open]');
  if (abierto) {
    const cerrar = abierto.querySelector<HTMLButtonElement>('form[data-nota] [data-cancelar]');
    if (cerrar && !cerrar.disabled) {
      e.preventDefault();
      cerrar.click();
    }
    return;
  }
  e.preventDefault();
  const sobre = sobreLoQueMiras();
  if (sobre) sobre.click();
  else void escribirAlDirector();
});

/** El ✉ de lo que se mira: el visible más cerca del centro, sin los de una decisión (esos deciden, no comentan). */
function sobreLoQueMiras(): HTMLElement | null {
  const centro = window.innerHeight / 2;
  let mejor: { b: HTMLElement; dist: number } | null = null;
  for (const b of document.querySelectorAll<HTMLElement>('#vista [data-comentar]')) {
    if (b.closest('[hidden]') || (b.dataset.comentar ?? '').split('|')[3]) continue;
    const r = b.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > window.innerHeight) continue;
    const dist = Math.abs((r.top + r.bottom) / 2 - centro);
    if (!mejor || dist < mejor.dist) mejor = { b, dist };
  }
  return mejor?.b ?? null;
}

/**
 * Antes de pedir la revisión, los borradores sin enviar de este proyecto (pd_dialogo_unico, tu propuesta del 26 de
 * octubre de 2026): el director no los ve, porque nunca le llegan. true si se sigue pidiendo; si eliges «Ver mis
 * borradores», se abre el primero, para enviarlo, terminarlo o borrarlo, y la revisión se pide después, con el botón.
 */
async function antesDeLosBorradores(): Promise<boolean> {
  const lista: Borrador[] = borradoresDe(localStorage, d.activo);
  if (!lista.length) return true;
  const sigue = await confirmar({
    titulo: tx('borradores.titulo', { n: lista.length }),
    texto: tx('borradores.texto', { n: lista.length, lista: lista.map((b) => `• ${lineaDeBorrador(b)}`).join('\n') }),
    boton: tx('borradores.boton'),
    cancelar: tx('borradores.ver', { n: lista.length }),
  });
  if (!sigue) void comentar(lista[0].sobre, lista[0].titulo);
  return sigue;
}

async function registrarExcepcion() {
  const actual = faseActual(d.plan, d.estado);
  const enEspera = d.plan.frentes.filter((x) => trabajoDe(actual, x.id).nivel === 'espera');
  const r = await pedir({
    titulo: tx('frentes.registrar'),
    ayuda: tx('excepcion.ayuda'),
    campos: [
      { id: 'frente', etiqueta: tx('excepcion.frente'), tipo: 'select', valor: consulta ?? undefined, opciones: (enEspera.length ? enEspera : d.plan.frentes).map((x) => [x.id, x.nombre]) },
      { id: 'motivo', etiqueta: tx('excepcion.porQueAhora'), tipo: 'area', requerido: true },
      { id: 'dias', etiqueta: tx('excepcion.cuantosDias'), tipo: 'select', opciones: [1, 3, 7, 14].map((n): [string, string] => [String(n), tx('excepcion.dias', { n })]), valor: '7' },
    ],
    boton: tx('excepcion.boton'),
    audio: true,
    adjuntos: true,
  });
  if (r && (await accion({ tipo: 'excepcion', frente: r.frente, motivo: r.motivo?.trim() || EN_AUDIO, dias: Number(r.dias) }, tx('excepcion.hecho')))) await anexar(r, { tipo: 'general' }, `Sobre la excepción en «${nombreFrente(r.frente)}»`);
}

// Entregar proyectos: desde el menú de proyectos, la bienvenida y la lista
document.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('[data-nuevo-proyecto]')) void nuevoProyecto();
});

$('sincronizacion').addEventListener('click', () => {
  $('sincronizacion').textContent = tx('sync.trayendo');
  cargar(true).then(() => { marcarSinServidor(false); avisar(tx('servidor.alDia'), true); }).catch((e) => (esDeRed(e) ? (marcarSinServidor(true), avisar(SIN_SERVIDOR())) : avisar((e as Error).message)));
});

const ocupado = () =>
  ($('dialogo') as HTMLDialogElement).open || !!document.querySelector('dialog[open]') ||
  ((document.activeElement instanceof HTMLTextAreaElement || document.activeElement instanceof HTMLInputElement) && document.activeElement.value.trim() !== '') ||
  !!document.querySelector('.grabando');
setInterval(() => {
  if (sinServidor && document.visibilityState === 'visible') cargar().then(() => marcarSinServidor(false), () => undefined);
}, 5_000);
// La sincronización de fondo espera también mientras hay texto seleccionado (para copiarlo): repintar lo deseleccionaría
const seleccionando = () => !!document.getSelection()?.toString().trim();
setInterval(() => {
  if (document.visibilityState === 'visible' && d && !ocupado() && !seleccionando()) cargar().then(() => marcarSinServidor(false), (e) => esDeRed(e) && marcarSinServidor(true));
}, 30_000);
// Lo que el director pregunta en plena revisión llega en su diálogo, encima de lo que estés haciendo (pd_permiso_espera)
vigilarPermisos();

// La cabecera fija: se compacta al bajar (con margen, para que no tiemble en el borde) y los títulos de los documentos
// se pegan justo debajo de ella (--alto-cabeza)
function medirCabeza() {
  const y = window.scrollY;
  if (y > 120) document.body.classList.add('cabeza-compacta');
  else if (y < 20) document.body.classList.remove('cabeza-compacta');
  const movil = window.innerWidth < 760;
  const alto = movil ? (document.querySelector<HTMLElement>('.barra-movil')?.offsetHeight ?? 0) : $('mando').offsetHeight;
  document.documentElement.style.setProperty('--alto-cabeza', `${alto}px`);
  // Con el enfoque puesto, la salida sigue al botón de la cabecera si esta cambia (otro ancho de ventana)
  if (enfoque) ubicarEnfoque();
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
window.addEventListener('estudio:ir', (e) => { if (d) void irDesdeLaCara((e as CustomEvent<Destino>).detail); });
// Lo que la niebla tiene que decir a la vista (la voz que no encuentra o que falla: guiaLectura.ts › avisar)
// Con su botón (la voz que guía hasta encontrarse, con «Comprobar de nuevo»), el aviso se queda hasta que se use o se cierre
window.addEventListener('estudio:aviso', (e) => { const x = (e as CustomEvent<{ texto: string; bien?: boolean; accion?: { etiqueta: string; hacer: () => void } }>).detail; if (x?.texto) avisar(x.texto, !!x.bien, undefined, x.accion, !!x.accion); });
/**
 * La cara del director sigue a mano en el modo enfoque. Si lo que toca es justo lo que se está leyendo (el mismo
 * documento y, si nombra una parte, la que está abierta), se queda en el enfoque y vuelve a centrar la idea; si es otra
 * cosa, lleva ahí sin preguntar, y el enfoque sigue donde aplica (nota de voz del titular nmvog4cd2tit: aplicarEnfoque).
 */
async function irDesdeLaCara(dest: Destino) {
  if (enfoque === 'documento') {
    const abiertas = [...document.querySelectorAll<HTMLElement>('.lector .parte-doc:not(.cerrada)')].map((p) => p.dataset.parte ?? '');
    if (dest.doc && dest.doc === doc?.ruta && (!dest.seccion || abiertas.includes(dest.seccion))) return centrarIdea();
  }
  return ir(dest);
}
alCambiarVista(() => { if (d) pintar(); });
// Los dibujos del director en sus documentos se abren en grande con un clic
activarDibujos();
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-vista-equipo]');
  if (b) ponerVista(b.dataset.vistaEquipo as 'equipo');
});
const pedido = new URLSearchParams(location.search);
// Si el director estaba trabajando, se dice desde el primer momento: mientras llegan los datos (o el servidor se reinicia
// con un cambio suyo) la página no se queda en blanco, y se reintenta sola hasta que responda
if (trabajandoGuardado()) $('vista').innerHTML = pantallaTrabajando();
// (si en tres minutos no vuelve, ya no es un reinicio: se dice que el servidor no responde)
const cargarAlArrancar = (intentos = 0): Promise<void> =>
  cargar().catch((e) => {
    if (!trabajandoGuardado() || intentos >= 60) throw e;
    quitarCubierta();
    $('vista').innerHTML = pantallaTrabajando();
    return new Promise<void>((listo) => setTimeout(listo, 3000)).then(() => cargarAlArrancar(intentos + 1));
  });
// Si la primera carga tarda, la cubierta lo dice: nunca un «cargando» mudo (el 21 de octubre tardaba más de 20 s y no
// decía nada). Pasados 8 s, cuánto lleva; pasado un minuto, dónde mirar
const inicioCarga = Date.now();
const relojCarga = setInterval(() => {
  const s = Math.round((Date.now() - inicioCarga) / 1000);
  if (d || s < 8) return;
  ponerTextoCubierta(tx('servidor.tardando', { s, donde: s >= 60 ? tx('servidor.tardandoRegistro') : '' }));
}, 1000);
cargarAlArrancar()
  .finally(() => clearInterval(relojCarga))
  .then(() => {
    if (!d) return; // sin proyectos: la bienvenida
    // Recién recargada porque el director terminó su revisión: se dice
    const termino = !!sessionStorage.getItem(CLAVE_TERMINO);
    if (termino) {
      sessionStorage.removeItem(CLAVE_TERMINO);
      avisarTermino();
    }
    // Al volver al Studio después de un rato, lo primero: dónde quedamos en el proyecto activo. Y cada vez que el director
    // se detiene, sea cual sea la causa, también, estés donde estés: su porqué, lo avanzado y tu misión a un clic (nota de
    // voz del titular, 27 de octubre de 2026, pedido pd_parada_visible). Antes, si el director aprobó algo tuyo, el reporte
    // de lo cumplido, y al cerrarlo «¿Dónde quedamos?» (nota del titular nmvvmc5rxtit; trabajando.ts › abrirAlCargar)
    // (?mirar: el director lo mira sin pantalla y el resumen taparía la vista; no cuenta como visita)
    const abrir = abrirAlCargar({ termino, tocaResumen: tocaResumen() && (!!d.plan.resumen || d.arranque === 'en_marcha'), mirar: pedido.has('mirar') });
    if (!pedido.has('mirar') && !abrir.includes('dondeQuedamos')) localStorage.setItem(claveVisto(d.activo), new Date().toISOString());
    // La voz de lo que viene empieza aquí, con el reporte, en segundo plano: la cola de antes de la recarga murió con ella,
    // y «¿Dónde quedamos?» no se abre hasta que se cierra el reporte, que puede quedar horas a la vista (nmvzfcm2htit)
    if (abrir.length) prepararLoQueSigue(abrir.includes('dondeQuedamos') ? cajaDondeQuedamos() : undefined);
    void (async () => {
      for (const x of abrir) await (x === 'celebracion' ? celebrarSiToca(abrir.includes('dondeQuedamos')) : mostrarDondeQuedamos());
    })();
    // (?mirar&conversacion=<registro>: el director mira sin pantalla la conversación de una revisión, con sus globos)
    const registroAMirar = pedido.has('mirar') ? pedido.get('conversacion') : null;
    if (registroAMirar) void abrirConversacion(registroAMirar);
    const v = pedido.get('vista');
    if (v && (VISTAS as string[]).includes(v)) {
      history.replaceState(null, '', location.pathname);
      void ir({ vista: v as Destino['vista'], ancla: pedido.get('ancla') ?? undefined, etiqueta: '' }).then(() => {
        // (?mirar&enfoque: el director mira el modo enfoque sin pantalla; con &vista=misiones, el de la misión)
        if (pedido.has('enfoque')) ponerEnfoque(true);
      });
    } else if (d.arranque === 'conectar' && !localStorage.getItem('estudio.director.pestana')) {
      // La primera vez, directo a conectar el repositorio
      void ir({ vista: 'misiones', ancla: 'guia', etiqueta: '' });
    }
  })
  .catch((e) => {
    $('vista').innerHTML = `<p class="aviso remoto">${tx('director.noSePudoCargar', { error: esc((e as Error).message) })}</p>`;
  })
  // La cubierta de carga sale cuando el Studio ya está pintado entero (nunca se ve a medio cargar)
  .finally(() => requestAnimationFrame(quitarCubierta))
  // El asistente de instalación se abre solo cuando le toca (?mirar: el director lo mira sin pantalla: no estorba)
  .finally(() => {
    if (!pedido.has('mirar')) {
      void iniciarAsistente((entregar) => {
        // «Entregar mi primer proyecto», con la página ya al día con lo que eligió
        if (entregar) sessionStorage.setItem(CLAVE_ENTREGAR_AL_CARGAR, '1');
        location.reload();
      });
    }
    if (sessionStorage.getItem(CLAVE_ENTREGAR_AL_CARGAR)) {
      sessionStorage.removeItem(CLAVE_ENTREGAR_AL_CARGAR);
      void nuevoProyecto();
    }
  });
// Por si algo se queda colgado: la cubierta nunca tapa el Studio más de 20 segundos
setTimeout(quitarCubierta, 20_000);
// Lo que dice el director cambia mientras se trabaja: se relee al volver
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && d && !ocupado()) cargar(true).catch(() => undefined);
});
