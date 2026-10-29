// El Director asistente: la portada del Estudio. El director guía al equipo: en el arranque pide el repositorio y el
// contexto, diagnostica el proyecto, propone objetivos y, con el objetivo firmado, traza la ruta. Después dice dónde
// estamos y qué hace hoy cada uno, asigna misiones paso a paso (una a la vez), recibe sus entregas y sus notas
// (escritas o en audio, también sobre los documentos, que se leen y se comentan aquí mismo, parte por parte) y responde
// en su sesión («revisa lo que hay para el director»): aprueba o pide rehacer, contesta cada nota y ajusta la ruta. La
// decisión final es del titular. La ruta y lo que dice el director viven en proyectos/<id>/director/plan.json; lo que hace
// cada uno, en proyectos/<id>/director/equipo/<persona>.json; lo del proyecto, en proyectos/<id>/proyecto.json (servidor:
// estudio/servidor/director.ts).
import { marked } from 'marked';
import { limpio } from './limpiar';
import { direccionVer } from './enlacesArchivos';
import {
  aclaracionesDe,
  comprobacionesDe,
  seMarcaAMano,
  aprobadoAntesDelCierre,
  aprobadasDeFase,
  pedidosAntesDelCierre,
  DESPUES,
  esperaA,
  nombreDeLoQueEspera,
  reemplazos,
  colaDelDirector,
  aquiMismo,
  avanceFase,
  bloqueosPuerta,
  claveIdea,
  claveLeido,
  coincideBusqueda,
  comentarioDe,
  decideDecision,
  decisionesDe,
  destinoVigente,
  documentosEnOrden,
  enLectura,
  eleccionDe,
  encargoDe,
  enNumero,
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
  origenDePrevista,
  marcasAlDia,
  misionesAbiertas,
  mismaIdea,
  nivelDe,
  RESERVA_MINIMA,
  reservaDeMisiones,
  mdDeBloqueDePuntos,
  NIVELES,
  NOMBRE_TIPO_DE_NOTA,
  NOMBRE_TIPO_EN_BUZON,
  OPCIONES_TIPO_DE_NOTA,
  pideTipo,
  tipoDeNota,
  tiposEnBuzon,
  notasDeTipo,
  type TipoEnBuzon,
  comoQuedaronEnBuzon,
  notasQueQuedaron,
  NOMBRE_COMO_QUEDO,
  type ComoQuedo,
  notaFoco,
  opcionConDetalle,
  opcionSola,
  juntarElecciones,
  destinoDelPaso,
  partesDeDocumento,
  palabrasDeBusqueda,
  pasosVistos,
  pendientesDelDirector,
  puntosDelBloque,
  repartoPorFrente,
  repartoPorNivel,
  seccionPaso,
  situacion,
  temasDelMensaje,
  textoPaso,
  textoPlano,
  TIPOS_VALIDACION,
  TITULAR,
  trabajoDe,
  trozosDeParte,
  urgenciasDeLaSemana,
  xpDe,
  YA_LO_DIJE,
  type Adjunto,
  type Contexto,
  type Criterio,
  type Destino,
  type EstadoDirector,
  type EstadoMision,
  type EtapaArranque,
  type Fase,
  type Lugar,
  type Mision,
  type Nivel,
  type Nota,
  type Paso,
  type Pedido,
  type Persona,
  type Plan,
  type Propuesta,
  type Proyecto,
  type Respuesta,
  type RespuestaPropuesta,
  type Senales,
  type TipoValidacion,
} from '../../src/director/director';
import type { InfoRepositorio } from '../../src/director/repositorio';
import type { FallaRevision, ModoPermisos } from '../../src/director/proyectos';
import type { EventoBitacora } from '../../src/director/bitacora';
import { duracionAprox, type Alcance as AlcanceMedicion } from '../../src/director/corrida';
import { contarFinales, NOMBRE_FIN, type FinEscrito } from '../../src/director/finDeLanzamiento';
import type { MedidaDeRevision } from '../../src/director/historial';
import { limiteCasiLleno, tiempoDeRevision } from '../../src/director/limites';
import { avisoDelInventario, fichaDe, INVENTARIO, modeloDelInventario } from '../../src/director/modelos';
import { enTuPlan, esPlanDeClaude, PLANES_DE_CLAUDE, semanaDeCadaUno, type PlanDeClaude } from '../../src/director/costoDelPlan';
import type { ResumenProyecto } from '../servidor/director';
import type { OpcionAjuste } from '../servidor/ajustesPropios';
import { ofrecidoEnVivo, pendientesEnVivo, type PermisoAutorizado, type PermisoNegado } from '../servidor/permisosNegados';
import { alCambiarVista, darDatosDirector, decir, nombrePersona, nombreVista, personasEquipo, personaVista, ponerVista, seVe } from './equipo';
import { elegirCarpeta } from './explorador';
import { icono, type Icono } from './iconos';
import { pedirProyectoNuevo } from './nuevo_proyecto';
import { cerrarConClicFuera, confirmar } from './modal';
import { abrirPreguntas } from './preguntas';
import { lineasDeRespuestas, NOMBRE_PESTANA_DQ, ORDEN_PESTANAS_DQ, pestanaActiva, pestanaDeSeccion, type PestanaDq } from './pestanasDq';
import { antesDeCerrarConClicFuera, antesDeOtroSobre, Grabadora, marcaDeCampos, repartirDictado, type Marca } from './grabadora';
import { borradoresDe, guardarBorrador, leerBorrador, lineaDeBorrador, quitarBorrador, type Borrador, type SobreBorrador } from './borradores';
import { probarDialogo, vigilarPermisos } from './dialogoPermiso';
import { Adjuntos } from './adjuntos';
import { activarDibujos } from './dibujos';
import { claveAbierto as claveAbiertoDe, clavePasos, esc, pasosHechos as pasosHechosDe } from './util';
import { colaDelDirectorHtml } from './colaDirector';
import { abiertaEnLista, desplazamientoParaVer, enSuIdioma, instruccionDeAgente } from './listas';
import { PESTANA_MODELO_INICIAL, PESTANAS_MODELO, pestanaConTecla, pestanaDeAncla, pestanaModeloValida, type PestanaModelo } from './pestanasModelo';
import { pestanaRutaConTecla, pestanaRutaElegida, pestanaRutaValida, pestanasRutaVisibles, tituloPestanaRuta, type PestanaRuta } from './pestanasRuta';
import { avisoDeEspera, resumenComentarios, segundosParaLeer } from './lectura';
import { marcarTrabajando, pantallaTrabajando, trabajandoGuardado, tituloTermino } from './trabajando';
import { sonar } from './sonidos';
import { botonSonido } from './panelSonidos';
import { controlesEnfoque } from './controlesEnfoque';
import { separarHechas } from './hechoAparte';
import { desplazamientoTrasPintar } from './progresoVivo';
import './zen';
import './encima';
import './siguiente';
import { controlAuto, dondeVa, llamarNiebla, NO_AVANZA, nieblaPuesta, nubladoEn, ponerNiebla, sinDestapar } from './guiaLectura';
import { celebracion, destinoDeMision, logrosDe, PARA_QUE_SIRVE, pasoSinMision, seccionesConAlgo } from '../../src/director/animo';
import { anchoDeVentana, aplicarEscala, aPantalla, rectaEnPagina } from './escala';

// La página se escala a la ventana (escala.ts): lo primero, antes de que nada se mida
aplicarEscala();
cerrarConClicFuera();

type Vista = 'misiones' | 'buzon' | 'documentos' | 'ruta' | 'propuestas' | 'proyectos' | 'proyecto' | 'diagnostico' | 'frentes' | 'validaciones' | 'esfuerzo' | 'metodo' | 'bitacora' | 'preguntas' | 'modelo';
const VISTAS: Vista[] = ['misiones', 'buzon', 'documentos', 'ruta', 'propuestas', 'proyectos', 'proyecto', 'diagnostico', 'frentes', 'validaciones', 'esfuerzo', 'metodo', 'bitacora', 'preguntas', 'modelo'];

/**
 * La barra lateral, solo con lo de todos los días: Hoy, el Buzón, las preguntas, la ruta, los documentos y las
 * propuestas. El seguimiento salió (decidido en «Un Studio más simple», 19 de octubre): los frentes viven solo en el
 * plan del director, las validaciones, el esfuerzo y la bitácora eran reportes, y el método tiene su documento (docs/metodo/metodologia.md).
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
    { titulo: '', vistas: (['misiones', 'buzon', 'preguntas'] as Vista[]).filter(sirve) },
    { titulo: 'El proyecto', vistas: (['ruta', 'documentos', 'propuestas', ...(arranca ? ['proyecto'] : [])] as Vista[]).filter(sirve) },
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
const NOMBRE_VISTA: Record<Vista, string> = {
  misiones: 'Hoy', buzon: 'Buzón del director', documentos: 'Documentos', ruta: 'La ruta', propuestas: 'Propuestas', proyectos: 'Todos los proyectos',
  proyecto: 'Proyecto', diagnostico: 'Diagnóstico', frentes: 'Frentes', validaciones: 'Validaciones', esfuerzo: 'Esfuerzo', metodo: 'Método',
  bitacora: 'Bitácora', preguntas: 'Preguntas', modelo: 'Modelo y consumo',
};
const ICONO_VISTA: Record<Vista, Icono> = {
  misiones: 'hoy', buzon: 'buzon', documentos: 'documentos', ruta: 'ruta', propuestas: 'propuestas', proyectos: 'proyectos', proyecto: 'proyecto',
  diagnostico: 'diagnostico', frentes: 'frentes', validaciones: 'validaciones', esfuerzo: 'esfuerzo', metodo: 'metodo', bitacora: 'bitacora', preguntas: 'pregunta', modelo: 'modelo',
};

interface Identidad { nombre: string; correo: string; rol: Persona | null; problema?: string; nuevo?: boolean }
interface Sincronizacion { traido: string | null; error: string | null; local: boolean; subida: { fase: string; mensaje: string; porSubir: number } | null }
interface Repositorio { ruta: string | null; info: InfoRepositorio | null; error: string | null }
/**
 * Lo que recibió un lanzamiento al empezar (revisor.ts › PaqueteDeConsumo): lo que pesan el encargo y lo que le dio la
 * bandeja (tokens estimados) y los tokens exactos de su primera llamada. No viene en los lanzamientos de antes.
 */
interface Paquete { registro: string; encargo?: { bytes: number; tokens: number }; bandeja?: { bytes: number; tokens: number }; arranque?: number }
interface Datos {
  activo: string; proyectos: ResumenProyecto[];
  plan: Plan; estado: EstadoDirector; senales: Senales; identidad: Identidad; transcripciones: Record<string, string>; sincronizacion: Sincronizacion;
  hoy: string; errores: string[]; proyecto: Proyecto; repositorio: Repositorio; arranque: EtapaArranque;
  /** Las notas de voz que el Studio está transcribiendo ahora, y las que no pudo (las transcribe el director al revisar). */
  transcribiendo?: string[]; sinTranscribir?: string[];
  /** La revisión pedida desde el Studio para este proyecto: la toma la sesión del director en su ciclo (/vigila). */
  revision?: { quien: string; pedida: string; lanzada?: string; enCurso?: string; hecha?: string; error?: string; falla?: FallaRevision; limite?: number } | null;
  /** «Pedir revisiones seguidas» de este proyecto: en marcha, o por qué paró (proyectos.ts › Seguidas). */
  seguidas?: { quien: string; desde: string; hechas: number; paro?: { cuando: string; porque: string } } | null;
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
  /**
   * Si el director lanzado carga tus ajustes de usuario de Claude Code, los nombres de sus claves (null: no es JSON válido)
   * y cada clave con su explicación y su consejo (estudio/servidor/ajustesPropios.ts), con las que conserva sin ellos.
   */
  ajustesPropios?: { cargar: boolean; claves: string[] | null; opciones?: OpcionAjuste[] | null; conservados?: string[]; nuevas?: string[] };
  /** Cómo pide permisos el director lanzado: solo lo autorizado (sin la clave), preguntándote en el Studio o automático (estudio/servidor/modoPermisos.ts). */
  modoPermisos?: ModoPermisos;
  /** Si el Claude Code de este computador trae el modo automático y, si no, lo que le falta para usarlo. */
  automatico?: { admite: boolean; porque?: string };
  /** Lo que gastó cada lanzamiento del director en este computador (estudio/servidor/revisor.ts › consumoDeRevisiones). */
  consumo?: {
    cuando: string; proyecto: string; tipo: 'revision' | 'aclaracion' | 'urgencia'; modelo: string | null; costo: number; entrada: number; cache: number; salida: number; minutos: number;
    pedido?: { modelo: string | null; esfuerzo: string | null; cumplido?: boolean | null };
    limites: { cincoHoras: { uso: number; renueva: string | null } | null; semana: { uso: number; renueva: string | null } | null } | null;
    /** Lo que se le negó en ese lanzamiento: las herramientas y órdenes que sus permisos no le dejaron. */
    negados?: string[];
    /** Cada modelo con que trabajó, lo que gastó y, si no es el principal, para qué se usó (revisor.ts › modelosDe). */
    modelos?: { modelo: string; principal: boolean; entrada: number; cache: number; salida: number; costo?: number; para?: string[] }[];
    /** Lo que recibió al empezar. No viene en los lanzamientos de antes. */
    paquete?: Paquete;
    /** Quién lo terminó, por qué y cuánto duró de verdad (revisor.ts › finEscrito). No viene en los de antes. */
    fin?: FinEscrito;
    /** Tu límite semanal al empezar y al terminar: lo que subió es la parte de tu semana que gastó (costoDelPlan.ts). */
    semana?: { desde: number; hasta: number; renueva: string | null };
  }[];
  /** Tu plan de Claude en este computador, para decir lo gastado en lo que cuesta de tu plan (pd_costo_plan); null: a precio de API. */
  planDeClaude?: PlanDeClaude | null;
  /**
   * Los lanzamientos que no terminaron con su resultado (siguen trabajando, el Studio los cortó o Claude Code murió), con
   * su paquete para abrirlo igual y quién los terminó (revisor.ts › SinTerminar). No cuentan en lo gastado: Claude Code no
   * lo devolvió.
   */
  sinTerminar?: { cuando: string; proyecto: string; tipo: 'revision' | 'aclaracion' | 'urgencia'; modelo: string | null; enCurso: boolean; paquete?: Paquete; fin?: FinEscrito }[];
  /** La medición del núcleo con casos fijos (estudio/servidor/medidor.ts › estadoDeMedicion): la de ahora o la última, y lo que costaría otra. */
  medicion?: EstadoMedicion;
  /** La medida del criterio del director en este proyecto, por revisión (pr_criterio_director, punto 3). */
  medidaDelDirector?: MedidaDeRevision[];
  /**
   * Lo que va haciendo el director que lanzó el Studio, mientras revisa (estudio/servidor/revisor.ts › progresoDe), con
   * las líneas iguales seguidas en una sola y su cuenta (`veces`, agruparPasos).
   */
  progreso?: { tipo: 'dice' | 'hace'; texto: string; veces?: number }[] | null;
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
/** La medición del núcleo, como la da el servidor (medidor.ts › estadoDeMedicion). */
interface EstadoMedicion {
  enMarcha: { quien: string; desde: string; vueltas: number } | null;
  ultima: {
    cuando: string; modelo: string | null; esfuerzo: string | null; terminada: string | null; vueltas: number;
    /** Qué casos midió: los que pasaban, los que fallaban o todos (null: todos, como las de antes). */
    alcance: AlcanceMedicion | null;
    pasan: number; fallan: number; pendientes: number; costo: number | null;
    /** Solo los casos que midió; `antes`, cómo estaba cada uno en la medición anterior que lo midió. */
    porCaso: { id: string; titulo: string; veredicto: 'pasa' | 'falla' | 'pendiente'; vueltas: number; porque: string[]; califica: { pasa: boolean; porque: string[] } | null; acuerdo: boolean | null; antes: 'pasa' | 'falla' | null }[];
  } | null;
  casos: number;
  /** Lo que costaría otra; sin una corrida, entre lo de un encargo corto del director (`desde`) y lo de una revisión. */
  estimado: { total: number; porVuelta: number; de: 'corrida' | 'revisiones'; desde?: number } | null;
  /** Lo que mediría, costaría y tardaría cada alcance (nota de voz del titular nmvrimph5tit: no repetir lo que no cambió). */
  alcances?: { alcance: AlcanceMedicion; casos: number; estimado: EstadoMedicion['estimado']; minutos: number | null }[];
  /** Los que fallan, para elegir uno por uno cuáles medir, y lo que cuesta y tarda cada caso (nota de voz del titular nmvsgcn7otit). */
  fallan?: { id: string; titulo: string }[];
  unCaso?: { estimado: EstadoMedicion['estimado']; minutos: number | null };
  /** Los casos en que no estuviste de acuerdo con quien califica en dos corridas: su pauta se revisa. */
  discrepan: { id: string; titulo: string }[];
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
if (vista === 'diagnostico') vista = 'proyecto'; // el diagnóstico ya vive en Proyecto
let faseVista: string | null = null;
const pestanaDeFase = new Map<string, PestanaRuta>(); // «La ruta»: la pestaña que se ve de cada fase, solo mientras viva la página
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
const ICONO_ESTADO: Record<EstadoMision, string> = { aprobada: '✓', entregada: '⏳', rehacer: '↺', en_curso: '○', pendiente: '○', bloqueada: '☁' };
/**
 * Los pasos marcados de una misión: los de la memoria del proyecto (viajan con lo demás y los ve el director, que así no
 * vuelve a pedir lo que ya marcaste); este navegador guarda una copia, que lee el director flotante.
 */
const pasosHechos = (id: string): number[] => (d && 'estado' in d ? d.estado.pasos?.[id]?.hechos : undefined) ?? pasosHechosDe(d?.activo ?? '', id);
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
  d.estado.pasos = { ...(d.estado.pasos ?? {}), [id]: { hechos: lista, cuando: new Date().toISOString(), quien: d.identidad.nombre } };
  return accion({ tipo: 'paso', mision: id, hechos: lista, ...(automatico ? { automatico } : {}) }, '');
};

/**
 * Los pasos que se hacen dentro del Studio se marcan solos: el director le pone a cada uno lo que prueba que se hizo
 * (`hecho`: la meta fijada, una parte leída, una propuesta respondida…) y, en cuanto el Studio lo ve, lo marca, lo dice y ofrece volver a la misión; si era el último, la entrega. Sin modelo: es lo que el Studio ya lee.
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
    const marcados = nuevos.map((x) => ({ ...x, guardado: marcarPaso(x.m.id, x.i, true, 'paso_visto') }));
    pintar();
    for (const x of marcados) if (await completarSiToca(x.m.id, x.guardado)) return void decir('¡Misión completada! La reviso cuando me pidas la revisión.', 'riendo');
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
    if (locales.length) void accion({ tipo: 'paso', mision: m.id, hechos: locales, automatico: 'pasos_del_navegador' }, '');
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
  // Mientras el director trabaja, lo que va escribiendo en el plan no se pinta a pedazos (te movería lo que lees): llega
  // todo junto al terminar
  if (d && d.activo === nuevo.activo && directorTrabaja(nuevo)) nuevo.plan = d.plan;
  document.body.classList.remove('sin-proyectos');
  // Otro proyecto: lo abierto del anterior no sirve
  if (d && d.activo !== nuevo.activo) {
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
  const huella = (x: Datos) => JSON.stringify([x.activo, x.proyectos, x.plan, x.estado, x.transcripciones, x.transcribiendo, x.sinTranscribir, x.identidad, x.errores, x.proyecto, x.repositorio, x.arranque, x.revision, x.aclaracion, x.urgencia, x.medicion]);
  const cambio = !d || huella(nuevo) !== huella(d);
  const antes = d?.activo === nuevo.activo ? d.transcribiendo ?? [] : [];
  // La revisión que se pidió desde aquí acaba de terminar: se dice, y lo nuevo ya está pintado
  const termino = d?.activo === nuevo.activo && !!d.revision && !d.revision.hecha && !!nuevo.revision?.hecha;
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
  marcarTrabajando(enCurso);
  // Las seguidas acaban de parar: su porqué llega unos segundos después del cierre de la revisión
  const paroNuevo = d?.activo === nuevo.activo && nuevo.seguidas?.paro && nuevo.seguidas.paro.cuando !== d.seguidas?.paro?.cuando ? nuevo.seguidas.paro : null;
  d = nuevo;
  if (terminoTrasRecarga) avisarTermino();
  // Se dice en ese momento, estés donde estés, y si «¿Dónde quedamos?» ya está abierto, va arriba de todo (pedido pd_parada_visible)
  if (paroNuevo) {
    const cabeza = document.querySelector('dialog.donde-quedamos[open] .dq-cabeza');
    if (!cabeza) avisar(`Las revisiones seguidas pararon: ${paroNuevo.porque}`, false, undefined, { etiqueta: '¿Dónde quedamos?', hacer: () => void mostrarDondeQuedamos() });
    else if (!cabeza.parentElement?.querySelector('.dq-paro')) cabeza.insertAdjacentHTML('afterend', lineaDeParo(paroNuevo));
  }
  if (fallo) avisar(((q) => (q?.startsWith('La revisión') ? `${q}.` : `La revisión no terminó.${q ? ` ${q}.` : ''}`))(d.revision!.falla?.que), false, undefined, { etiqueta: 'Qué pasó', hacer: () => void mostrarFalla() });
  if (aclarado?.hecha) avisar(aclarado.comprobar ? 'El director comprobó el paso: lo que encontró está debajo de él.' : 'El director reescribió el paso con más detalle: está en tu misión.', true, undefined, { etiqueta: 'Ver el paso', hacer: () => void ir({ vista: 'misiones', ancla: `mision-${aclarado.mision}`, etiqueta: '' }) });
  else if (aclarado?.error) avisar(`${aclarado.error} Tu pedido quedó en el Buzón: lo puedes retomar, o el director lo responde en la próxima revisión.`, false, undefined, { etiqueta: 'Qué pasó', hacer: () => void mostrarFallaAparte('aclaracion') });
  if (urgenciaFallo) avisar(`${urgenciaFallo} Lo urgente quedó en el Buzón: lo puedes retomar, o cuando pidas la revisión, con «Pedir revisión», arriba, el director lo atiende primero.`, false, undefined, { etiqueta: 'Qué pasó', hacer: () => void mostrarFallaAparte('urgencia') });
  else if (urgenciaLista) avisar('El director atendió lo urgente: el resultado está en «¿Dónde quedamos?».', true, undefined, { etiqueta: 'Ver el resultado', hacer: () => void mostrarDondeQuedamos() });
  // Al terminar, la página se recarga entera: si el director cambió el código del Studio, se ve sin refrescar a mano.
  // Con algo a medio escribir o grabando, espera a que quede libre (el aviso se da después de recargar)
  if (termino) {
    // El sonido, antes de recargar: después de la recarga el navegador ya no deja sonar sin un clic
    if (sonar('revision')) sessionStorage.setItem(CLAVE_SONO, '1');
    recargarTrasRevision();
    // La recarga ya viene, con su cuenta: no se pinta lo nuevo dos veces
    return;
  }
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
const CLAVE_SONO = 'estudio.revision_terminada.sono';
let esperaRecarga: ReturnType<typeof setInterval> | null = null;
/** Al terminar la revisión, una sola recarga, anunciada con su cuenta (así se ve lo nuevo, también el código del Studio). */
function recargarTrasRevision() {
  sessionStorage.setItem(CLAVE_TERMINO, '1');
  recargarConCuenta('El director terminó la revisión.');
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
  if (esperaRecarga) return;
  const empezar = () => {
    if (ocupado()) return false;
    if (esperaRecarga) clearInterval(esperaRecarga);
    esperaRecarga = setTimeout(() => {}, 0);
    let falta = SEGUNDOS_CUENTA;
    const texto = () => `${motivo} El Studio se actualiza en ${falta}…`;
    mostrarCubierta(texto(), reinicio ? undefined : () => recargarYa());
    // El servidor espera esta señal para reiniciarse: así nunca se lleva lo que alguien escribe o graba (recarga.ts)
    if (reinicio) import.meta.hot?.send('estudio:libre-para-reiniciar');
    const cuenta = setInterval(() => {
      falta -= 1;
      if (falta > 0) return void ponerTextoCubierta(texto());
      clearInterval(cuenta);
      ponerTextoCubierta('Actualizando el Studio…');
      if (reinicio) void esperarAlServidor();
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

function mostrarCubierta(texto: string, ya?: () => void) {
  const c = document.getElementById('cubierta-carga');
  if (!c) return;
  c.removeAttribute('hidden');
  c.classList.remove('saliendo');
  c.classList.add('en-cuenta');
  ponerTextoCubierta(texto);
  const b = c.querySelector<HTMLButtonElement>('.cubierta-ya');
  if (b) {
    b.hidden = !ya;
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
  if (!x?.reinicio && Date.now() - cargadaEn < 10_000) return;
  // Abriste el Studio otra vez (doble clic) con el servidor ya encendido: no se enciende otro, se recarga esta página
  recargarConCuenta(x?.abrir ? 'Abriste el Studio otra vez.' : 'El director terminó.', !!x?.reinicio);
});

/** El director terminó: un aviso grande, el sonido (si no sonó ya antes de recargar) y el título de la pestaña. */
function avisarTermino() {
  if (!sessionStorage.getItem(CLAVE_SONO)) sonar('revision');
  sessionStorage.removeItem(CLAVE_SONO);
  tituloTermino();
  avisar('El director terminó la revisión: lo nuevo ya está en el Studio.', true);
  const e = $('error');
  e.classList.add('termino');
  setTimeout(() => e.classList.remove('termino'), 12000);
}

/** Lo urgente que el director todavía atiende (pedido o lanzado, sin cerrar ni fallar). */
function urgenciaEnCurso(u: Datos['urgencia']): u is NonNullable<Datos['urgencia']> {
  return !!u && !u.hecha && !u.error;
}

/** Qué es lo negado en vivo, para quien lo ve mientras el director trabaja. */
const NEGADOS_VIVO = 'Lo que el director intentó en esta revisión y sus permisos no le dejaron hacer. Sigue con lo demás. Lo que le faltó se autoriza aquí, en lo que va haciendo, con un clic, y lo tiene desde su próximo lanzamiento.';

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
    ...(procesando ? [`<span class="sp-linea">Transcribiendo ${procesando === 1 ? 'tu audio' : `${procesando} audios`}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></span>`] : []),
    // Lo urgente va solo y se distingue: el director lo atiende aparte, mientras sigues con lo tuyo
    ...(u ? [`<span class="sp-linea alerta">${u.lanzada ? `El director atiende lo urgente${seguimientoAparte(u.lanzada, MIN_URGENCIA)}` : 'Lo urgente va al director'}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></span>`] : []),
    // La revisión en marcha no va aquí: tapaba lo que se lee, también dentro de un diálogo, y la cabecera ya la dice. Va
    // en su atajo (rotularProgreso), en la columna de la derecha (nota de voz del titular nmvoottaitit, 25 de octubre)
    ...(r.estado === 'pedida' ? [`<span class="sp-linea" title="${esc(r.texto)}">Revisión pedida · ${hora(d.revision!.pedida)}${automatica() && (ocupado || esperaCandado()) ? ' · espera su turno' : ''}</span>`] : []),
    // Un director vivo sin revisión de este proyecto en marcha: qué corre, y por qué no se puede pedir otra
    ...(r.estado === 'ninguna' && ocupado ? [`<span class="sp-linea" title="${esc(ocupado.porque)}">${esc(ocupado.corto)}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></span>`] : []),
    ...(r.estado === 'sin_vigilia' ? [`<button type="button" class="sp-linea alerta" data-revision="explicar">⚠ ${d.revision?.error ? 'La revisión no terminó · ¿Por qué?' : 'Revisión pedida, sin tomar'}</button>`] : []),
    // Lo urgente que no se cerró, mientras ninguna revisión respondió sus notas: su reporte y «Retomarla» (pr_retoma_automatica, punto 5)
    ...(urgenciaFallida() ? ['<button type="button" class="sp-linea alerta" data-aparte="urgencia">⚠ Lo urgente no terminó · ¿Por qué?</button>'] : []),
  ];
  caja.innerHTML = lineas.join('');
  caja.hidden = !lineas.length;
  contarTokens(r.estado === 'en_curso' ? (d.tokensVivos ?? null) : null);
  // Mientras el director trabaja, se navega, se lee y se avanza en las misiones; lo que cambia la ruta espera (ver
  // libreMientrasRevisa)
  document.body.classList.toggle('director-trabajando', r.estado === 'en_curso');
  const info = document.querySelector<HTMLElement>('.atajo[data-progreso]');
  if (info) {
    info.hidden = r.estado !== 'en_curso';
    info.classList.toggle('activo', progresoAbierto);
    // Lo que se le niega mientras trabaja, al momento y no solo al final (propuesta «Los permisos, al momento»): una
    // cifra roja sobre el atajo, que abre lo que va haciendo con lo negado arriba
    const negados = r.estado === 'en_curso' && d.negadosVivos?.length ? porAutorizarEnVivo(d.negadosVivos) : [];
    info.classList.toggle('trabajando', r.estado === 'en_curso' && !parada);
    info.classList.toggle('alerta', r.estado === 'en_curso' && !!parada);
    info.dataset.cifra = negados.length ? String(negados.length) : '';
    info.title = [parada ? PARADA(parada) : 'Ver en vivo lo que va haciendo el director', ...(negados.length ? [`${NEGADOS_VIVO} ${negados.join('; ')}`] : [])].join(' ');
    rotularProgreso();
  }
  pintarProgreso(r.estado === 'en_curso');
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
    parada ? `Sin actividad desde hace ${parada} min` : 'El director está revisando',
    ...(tokens ? [`${miles(tokens)} tokens`] : []),
    ...(n ? [n === 1 ? 'se le negó un permiso' : `se le negaron ${n} permisos`] : []),
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
  const antes = lista ? { desplazamiento: lista.scrollTop, alto: lista.scrollHeight } : null;
  const permisosAntes = caja.querySelector<HTMLElement>('.negados-vivo')?.scrollTop ?? 0;
  const negados = d.negadosVivos ?? [];
  const tokens = tokensMostrados ?? d.tokensVivos ?? null;
  const permisos = negadosEnVivoHtml(negados);
  // Su plan, plegado como lo dejaste (abrirlo no se pierde con cada consulta)
  const plan = planVivoHtml(d.planVivo, caja.querySelector<HTMLDetailsElement>('.plan-vivo')?.open ?? false);
  // Con el área de permisos, el panel toma toda su altura y se la reparte por mitades con los pasos
  caja.classList.toggle('con-permisos', !!permisos);
  caja.innerHTML = `<header><b>Lo que va haciendo el director</b><span class="tokens-vivos" data-tokens-vivos title="Lo que lleva leído y escrito el modelo en esta revisión; el total exacto queda en «Modelo y consumo»">${tokens ? `${miles(tokens)} tokens` : ''}</span><button type="button" class="enlace" data-cerrar-progreso aria-label="Cerrar">${icono('cerrar')}</button></header>
    ${permisos}
    ${plan}
    ${d.progreso === null || d.progreso === undefined
      ? '<p class="como">El director revisa desde su sesión de Claude Code: aquí se ve el avance de las revisiones que lanza el Studio.</p>'
      : pasos.length
      ? `<ol class="pasos-progreso">${[...pasos].reverse().map((p, i) => `<li class="${p.tipo}${i === 0 ? ' ultimo' : ''}">${p.tipo === 'dice' ? esc(p.texto) : `<span class="como">${esc(p.texto)}</span>`}${p.veces ? ` <span class="veces" title="${p.veces} veces seguidas">${p.veces}</span>` : ''}${i === 0 ? '<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span>' : ''}</li>`).join('')}</ol>`
      : '<p class="como">Arrancando<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></p>'}`;
  // Sigue lo más nuevo, que ahora está arriba, salvo que estés leyendo más abajo: ahí se queda en lo que leías
  const nueva = caja.querySelector<HTMLElement>('.pasos-progreso');
  if (nueva) nueva.scrollTop = desplazamientoTrasPintar(antes, nueva.scrollHeight);
  const zonaPermisos = caja.querySelector<HTMLElement>('.negados-vivo');
  if (zonaPermisos) zonaPermisos.scrollTop = permisosAntes;
}
/**
 * El plan de la revisión en dos tiempos (pd_dos_tiempos), arriba de los pasos y plegado, como elegiste el 26 de octubre
 * de 2026: mientras el primer tiempo planea, una línea que lo dice; después, cuántos encargos van hechos y, al abrirlo,
 * cada uno, marcado a medida que el director lo termina. Sin primer tiempo (una sola nota o entrega), nada.
 */
function planVivoHtml(p: Datos['planVivo'], abierto: boolean): string {
  if (!p) return '';
  if (p.planeando || !p.encargos) return '<p class="como plan-vivo">Planea la revisión: unos minutos, con esfuerzo bajo y sin tocar nada<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></p>';
  const hechos = p.encargos.filter((e) => e.hecho).length;
  return `<details class="plan-vivo"${abierto ? ' open' : ''}><summary>Su plan: ${hechos} de ${p.encargos.length} ${p.encargos.length === 1 ? 'encargo hecho' : 'encargos hechos'}</summary><ol>${p.encargos.map((e) => `<li${e.hecho ? ' class="hecho"' : ''}>${e.hecho ? '✓ ' : ''}${esc(e.que)}</li>`).join('')}</ol></details>`;
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
    if (!leido) return `<li>${que}<p class="como">Buscando qué permiso le faltó<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></p></li>`;
    return `<li>${que}${permisos.map((n) => `<p class="como">Le faltó: ${esc(n.que)}. <button type="button" class="boton-suave" data-autorizar-vivo="${esc(clavePermiso(n))}" title="${esc(n.riesgo)}">Autorizo en este proyecto</button></p>`).join('')}</li>`;
  };
  return `<div class="negados-vivo"><p class="como">${NEGADOS_VIVO}</p><ul>${ofrecidos.map(fila).join('')}</ul><button type="button" class="enlace" data-ir-permisos>Para todos tus proyectos, o para ver lo de antes: «Permisos»</button></div>`;
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
// Un Markdown que nombra el director (enlacesArchivos.ts): se lee en la columna de documentos; si se nombró dentro de un
// diálogo, ese diálogo se cierra para dejarlo a la vista
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-abrir-doc]');
  if (!b?.dataset.abrirDoc) return;
  b.closest('dialog')?.close();
  void abrirDocumento(b.dataset.abrirDoc);
});
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
  // Lo urgente también se espera de cerca: el resultado se avisa en cuanto llega
  const esperandoUrgencia = urgenciaEnCurso(d.urgencia);
  // Con lo que va haciendo el director a la vista, cada pocos segundos (leer su registro no gasta nada)
  const cada = d.transcribiendo?.length || sinTexto || (esperandoRevision && progresoAbierto) || esperandoAclaracion || esperandoUrgencia ? 3000 : esperandoRevision ? 10_000 : 0;
  sondeo = cada ? setTimeout(() => (escribiendoEnVista() ? vigilarTranscripciones([]) : void cargar().catch(() => undefined)), cada) : null;
}

/** Un aviso abajo, que no mueve la página: lo bueno se va solo; un error se queda hasta cerrarlo (o un rato largo). */
let avisoHasta: ReturnType<typeof setTimeout> | null = null;
/** `reintentar`: si se puede volver a intentar lo que falló (con lo que se escribió o grabó guardado), el aviso lo ofrece. */
/** `ir`: un atajo dentro del aviso (por ejemplo, al Buzón donde quedó lo que se guardó). */
function avisar(texto: string, bien = false, reintentar?: () => void, ir?: { etiqueta: string; hacer: () => void }, fijo = false) {
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
  avisoHasta = null;
  // lo bueno se queda unos segundos para leerlo con calma (con un atajo, un poco más); lo fijo, una guía que se sigue
  // fuera del Studio, hasta que se use su botón o se cierre
  if (!fijo) avisoHasta = setTimeout(() => (e.hidden = true), bien ? (ir ? 10000 : 8000) : reintentar ? 60000 : 15000);
  alFrente(e);
}

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
const SIN_SERVIDOR = 'El servidor del Studio no responde: enciéndelo con «npm run encender» en la carpeta del Studio (o pídeselo a tu agente). Lo que escribiste o grabaste no se perdió: vuelve a intentarlo cuando esté encendido.';
const esDeRed = (e: unknown) => e instanceof TypeError || ['TimeoutError', 'AbortError'].includes((e as Error)?.name);
let sinServidor = false;
function marcarSinServidor(si: boolean) {
  if (sinServidor === si) return;
  sinServidor = si;
  document.body.classList.toggle('sin-servidor', si);
  if (si) {
    const el = $('sincronizacion');
    // Con el director trabajando, casi siempre es él reiniciando el servidor con un cambio suyo: vuelve solo
    const director = !!trabajandoGuardado();
    el.className = `insignia sync ${director ? 'subiendo' : 'choque'}`;
    el.textContent = director ? '↻ El director reinicia el Studio' : '⚠ Studio apagado';
    el.title = director ? 'El director está trabajando y el servidor del Studio se reinicia con sus cambios. Vuelve solo en unos segundos.' : SIN_SERVIDOR;
  } else if (d) {
    pintarSincronizacion();
    avisar('El servidor del Studio volvió: todo al día.', true);
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
  avisar('El director está revisando. Mientras termina, puedes leer, hablarle y avanzar en tus misiones y decisiones (todo queda para la revisión siguiente), pero no cambiar la ruta ni lo que él ya está leyendo. Al terminar, se habilita solo.', true);
  return true;
}

/** Desde cuándo lo que se deja ya no entra en la revisión en marcha (src/director/proyectos.ts › corteDeRevision). */
function corteRevision(): string | null {
  const r = d?.revision;
  if (!r || r.hecha || r.error) return null;
  return [r.lanzada, r.enCurso].filter((x): x is string => !!x).sort()[0] ?? null;
}
/** ¿La nota llegó después de empezar la revisión en marcha? Entonces el director no la está leyendo: se corrige o se quita. */
function notaTrasCorte(n: Nota | undefined): boolean {
  const c = corteRevision();
  return !!n && !!c && n.cuando > c;
}
/** Lo que se le dice a quien escribe mientras el director revisa. */
const AVISO_REVISANDO = '<b>El director está revisando.</b> Lo que dejes ahora no entra en esta revisión: queda en el Buzón para la siguiente. ';
const avisoRevisando = () => (revisando() ? AVISO_REVISANDO : '');

/**
 * ¿Esta acción puede hacerse mientras el director revisa? Leer, hablarle y avanzar en las misiones y las decisiones sí
 * (espera la revisión siguiente); lo que cambia la ruta o lo que él ya está leyendo, no.
 */
function libreMientrasRevisa(cuerpo: Record<string, unknown>): boolean {
  if (['paso', 'leido', 'comentar', 'empezar', 'entregar', 'responder'].includes(String(cuerpo.tipo))) return true;
  // Retirar una entrega que él no está leyendo (llegó después de empezar)
  if (cuerpo.tipo === 'deshacer_entrega') { const c = corteRevision(); return !!c && (d.estado.entregas[String(cuerpo.mision)]?.cuando ?? '') > c; }
  if (cuerpo.tipo === 'editar_nota' || cuerpo.tipo === 'borrar_nota') return notaTrasCorte(d.estado.notas.find((n) => n.id === cuerpo.id));
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
  // Las mismas condiciones que `opcionesPaso`: el botón no se usa antes de abrir el paso ni mientras corre su cuenta (y
  // el que llevaría a su propia misión no se dibuja: no hay que oprimirlo)
  const ir = destinoDelPaso(p, m);
  const cuando = ir && !pasoAbierto(m.id, i) ? ` cuando oprimas «${ir.etiqueta}»,`
    : p.esperar && !ir && inicioEspera(`${m.id}|${i}`) + p.esperar * 1000 > Date.now() ? ' al terminar la cuenta,' : '';
  return ` Si con eso respondiste el paso,${cuando} márcalo con «${YA_LO_DIJE}».`;
}

async function accion(cuerpo: Record<string, unknown>, hecho = 'Guardado.') {
  if (!libreMientrasRevisa(cuerpo) && esperaAlDirector()) return false;
  if (cuerpo.tipo === 'comentar' && revisando() && hecho) hecho = cuerpo.urgente
    ? 'Lo urgente va solo al director en cuanto termine la revisión que está haciendo (las dos escriben el plan). Lo demás del Buzón espera la siguiente.'
    : (cuerpo.sobre as { eleccion?: string } | undefined)?.eleccion === YA_LO_DIJE
    ? 'Listo: el paso queda con lo que le contaste en tu comentario. Entra en la revisión siguiente, porque el director ya empezó esta.'
    : (cuerpo.sobre as { eleccion?: string } | undefined)?.eleccion
    ? `Elegiste «${(cuerpo.sobre as { eleccion: string }).eleccion}»: queda para la revisión siguiente, porque el director ya empezó esta.`
    : 'Quedó en el Buzón para la revisión siguiente: el director ya empezó esta y no la incluye.';
  else if ((cuerpo.tipo === 'entregar' || cuerpo.tipo === 'responder') && revisando() && hecho) hecho = `${hecho} Entra en la revisión siguiente: el director ya empezó esta.`;
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
    // Una nota urgente: el Studio ya llamó al director para ella (o pidió la revisión, si no puede llamarlo)
    if (j.urgencia !== undefined) d.urgencia = j.urgencia;
    if (j.revision !== undefined) d.revision = j.revision;
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
      avisar(`${hecho}${pistaYaLoDije(cuerpo.sobre as Nota['sobre'] | undefined)}${cuerpo.audio ? ' Tu audio ya se está transcribiendo: te aviso cuando esté.' : ''}`, true, undefined, { etiqueta: donde === 'preguntas' ? 'Ver en Preguntas' : 'Ver en el Buzón', hacer: () => irA(donde) });
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
  // En el idioma de quien lee, si el documento trae esa versión a su lado (los procedimientos del director: X.md, en
  // inglés, y X.es.md): no el que pide leer una misión o el plan, cuyas partes leídas se cuentan por su ruta
  if (!enCola.some((x) => x.ruta === ruta) && !d.plan.documentos.some((x) => x.ruta === ruta)) ruta = enSuIdioma(ruta, (documentos ?? []).map((x) => x.ruta));
  const r = await fetch(`/__estudio/director/documento?ruta=${encodeURIComponent(ruta)}`);
  if (!r.ok) return avisar((await r.json().catch(() => ({}))).error ?? 'No se pudo abrir el documento.');
  doc = await r.json();
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
  return `<button type="button" class="${clase}" data-destino="${destinos.length - 1}"${extra} title="${afuera ? 'Se abre en una pestaña nueva' : 'Te lleva ahí'}">${esc(dest.etiqueta)} ${afuera ? '↗' : '→'}</button>`;
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
function irDelPaso(m: Mision, i: number, dest: Destino, deAhora: boolean, esperar?: number) {
  if (!deAhora || d.identidad.rol !== m.para) return botonIr(dest);
  const abierto = pasoAbierto(m.id, i);
  const hasta = esperar && !abierto ? inicioEspera(`${m.id}|${i}`) + esperar * 1000 : 0;
  // Mientras espera, el botón no se ve (no se muestra lo que aún no se puede hacer): la cuenta, grande, dice por qué y
  // qué aparece al terminar; a cero, la cuenta sale y el botón aparece resaltado (pedido del titular)
  if (hasta > Date.now()) {
    return `${cuentaGrande(hasta, `${m.id}|${i}`, `Al terminar, aquí aparece «${dest.etiqueta}».`)}
      ${botonIr(dest, 'ir-paso principal', ` data-abre="${esc(m.id)}|${i}" data-espera="${esc(m.id)}|${i}" hidden`)}`;
  }
  return botonIr(dest, abierto ? 'ir-paso' : 'ir-paso principal', ` data-abre="${esc(m.id)}|${i}"`);
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
  if (dest.tipoValidacion) tipoValidacionInicial = dest.tipoValidacion;
  anclaPendiente = dest.ancla ?? null;
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
  const ir = (suave: boolean) => {
    if (!el.isConnected) return;
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
}

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
  return `<button type="button" class="abrir-urgente" data-abrir-urgente aria-expanded="false" aria-controls="panel-urgente" title="¿Es urgente?">${icono('urgente')}</button>`;
}

function campoUrgente() {
  // Se cuentan para que una urgencia siga siendo rara
  const semana = urgenciasDeLaSemana(d.estado.notas).length;
  return `<div class="panel-urgente" id="panel-urgente" hidden><label class="urgente-campo"><input name="urgente" type="checkbox" value="1" />
    <span class="interruptor" aria-hidden="true"></span><span>${icono('urgente')}<b>Marcar como urgente</b>
    <span class="ayuda-campo">Úsalo solo si de verdad no puede esperar. Al dejarlo, el Studio se lo lleva solo al director, al instante (te lo confirmo antes), y el director decide, por lo que pides, si va ya o qué debe ir antes. El resultado te llega en «¿Dónde quedamos?».${semana ? ` Esta semana: ${semana} ${semana === 1 ? 'urgencia' : 'urgencias'}.` : ''}</span></span></label></div>`;
}

/** Marcar urgente llama al director al dejar la nota: se confirma antes, diciendo qué va a pasar. */
function confirmarUrgencia() {
  // Sin quién llame al director desde aquí, lo urgente cae a la revisión de siempre
  if (!automatica()) {
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
  return confirmar({
    titulo: 'Lo marcaste como urgente',
    texto: 'Al dejarlo, el Studio se lo lleva solo al director, ahora mismo: él atiende solo esto, decide si de verdad va ya y, si es un arreglo que pediste, lo hace. Tú sigues con lo tuyo.\n\nEl resultado te llega como reporte en «¿Dónde quedamos?» y, si hay que comprobarlo, con una sola misión: revisarlo. Lo demás del Buzón no se toca: espera la revisión.\n\n¿De acuerdo?',
    boton: 'Sí, llevárselo al director',
    cancelar: 'No, volver',
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
const SIGUE_AQUI = 'Lo que escribiste, grabaste o adjuntaste sigue aquí: vuelve a intentarlo.';

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
  dlg.innerHTML = `<form method="dialog">
    <header class="cabeza-dialogo">${o.urgente ? `<div class="titulo-con-urgente"><h2>${esc(o.titulo)}</h2>${botonUrgente()}</div>` : `<h2>${esc(o.titulo)}</h2>`}${o.ayuda ? `<p>${o.ayuda}</p>` : ''}${previo ? '<p class="borrador-guardado" role="status">Borrador guardado: está como lo dejaste. <button type="button" class="enlace" data-borrar-borrador>Borrarlo</button></p>' : ''}</header>
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
          : c.explorar ? `<span class="con-explorar"><input name="${c.id}" type="text" value="${esc(c.valor ?? '')}"${req} placeholder="Explora o escribe la ruta" /><button type="button" data-explorar="${c.id}">📁 Explorar…</button></span>`
          : `<input name="${c.id}" type="text" value="${esc(c.valor ?? '')}"${req}${c.pista ? ` placeholder="${esc(c.pista)}"` : ''} />`;
        return `<label class="campo${c.clase ? ` ${c.clase}` : ''}"><span class="etiqueta-campo">${esc(c.etiqueta)}</span>${c.ayuda ? `<span class="ayuda-campo">${esc(c.ayuda)}</span>` : ''}${control}</label>`;
      })
      .join('')}
    ${o.audio ? '<div class="grabadora" data-grabadora></div>' : ''}
    ${o.actuales?.length ? `<fieldset class="adjuntos-actuales"><legend>Lo que ya tiene adjunto</legend>${o.actuales.map((a) => `<label class="casilla-d"><input type="checkbox" name="quitar-adjunto" value="${esc(a.ruta)}"> Quitar «${esc(a.nombre)}»</label>`).join('')}</fieldset>` : ''}
    ${o.adjuntos ? '<div class="adjuntos" data-adjuntos></div>' : ''}
    ${o.urgente ? campoUrgente() : ''}
    <p class="error-explorador" role="alert"></p>
    <div class="botones"><button type="button" data-cancelar>${esc(o.cancelar ?? 'Cancelar')}</button><button type="submit" class="primario">${esc(o.boton)}</button></div>
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
      form.querySelector<HTMLButtonElement>('button[type="submit"]')!.textContent = si ? 'Guardando…' : o.boton;
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
        return avisar('Borraste el borrador.', true);
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
        const audio = grabadora ? await grabadora.datos() : null;
        const archivos = adjuntos && !adjuntos.vacio ? await adjuntos.datos() : null;
        // La casilla de urgencia no es contenido: una nota marcada urgente y vacía sigue vacía
        const escrito = Object.entries(valores).some(([k, v]) => k !== 'urgente' && !o.campos.some((c) => c.id === k && c.tipo === 'botones') && v.trim());
        if (o.audio && !o.vacioVale && !audio && !archivos && !escrito) return avisar(o.adjuntos ? 'Escribe algo, graba un audio o adjunta un archivo.' : 'Escribe algo o graba un audio.');
        // Lo que es obligatorio de escribir vale también dicho en audio; lo que se elige de un toque, no
        const falta = o.campos.find((c) => c.requerido && !(valores[c.id] ?? '').trim() && (c.tipo === 'botones' || !audio));
        if (falta) return avisar(falta.tipo === 'botones' ? `Elige «${falta.etiqueta}».` : `Falta «${falta.etiqueta}»${o.audio ? ': escríbelo o dilo en un audio' : ''}.`);
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
        error.textContent = porque === SIN_SERVIDOR ? `No se guardó. ${porque}` : `No se guardó${porque ? `: ${porque.replace(/\.$/, '')}` : ''}. ${SIGUE_AQUI}`;
      } finally {
        enviando = false;
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
  if (como === 'sin_audio') avisar('Lo que escribiste quedó como borrador, pero el audio no cupo en este navegador: grábalo de nuevo al volver.');
  else if (como === 'no') avisar('No se pudo guardar el borrador en este navegador: lo que escribiste o grabaste no quedó.');
}

/**
 * Lo que se dijo en un audio, transcrito en este computador y sin guardar el audio (el servidor › /dictar), para sumarlo
 * a una nota que se corrige. null si no se pudo: el aviso lo dice dentro del diálogo, que sigue abierto con lo grabado.
 */
async function dictar(audio: string): Promise<string | null> {
  decir('Transcribo lo que dijiste, en tu computador: puede tardar un poco.', 'pensativo');
  const r = await fetch('/__estudio/director/dictar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio }), signal: AbortSignal.timeout(5 * 60_000) }).catch((e) => e as Error);
  if (r instanceof Error) {
    avisar('No se pudo transcribir lo que dijiste: el Studio no respondió a tiempo.');
    return null;
  }
  const c = await r.json().catch(() => ({}));
  if (!r.ok || !c.texto) {
    avisar(c.error ?? 'No se pudo transcribir lo que dijiste.');
    return null;
  }
  return String(c.texto);
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
  const b = rectaEnPagina($('proyecto-activo').getBoundingClientRect());
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
  const desde = visto ? `Tu última visita fue el ${momento(visto)}.` : 'Es la primera vez que abres este proyecto en este navegador.';
  const novedades = [
    nuevasAprobadas ? `${nuevasAprobadas} ${nuevasAprobadas === 1 ? 'misión aprobada' : 'misiones aprobadas'}` : '',
    nuevasRespuestas ? `${nuevasRespuestas} ${nuevasRespuestas === 1 ? 'respuesta nueva' : 'respuestas nuevas'} del director en el Buzón` : '',
    nuevasPreguntas ? `${nuevasPreguntas} ${nuevasPreguntas === 1 ? 'pregunta respondida' : 'preguntas respondidas'} (en Preguntas)` : '',
  ].filter(Boolean);
  const dlg = document.createElement('dialog');
  dlg.className = 'dialogo-director donde-quedamos';
  dlg.innerHTML = `<form method="dialog">
    <div class="dq-cabeza"><h2 class="etiqueta" tabindex="-1" autofocus>${esc(d.proyecto.nombre || d.activo)} · dónde quedamos</h2>${opcionesDq()}</div>
    ${((paro) => (paro ? lineaDeParo(paro) : ''))(paroReciente())}
    <p class="dq-quedamos">${r ? esc(r.quedamos) : 'Todavía no hay un resumen del director para este proyecto.'}</p>
    ${r?.alerta ? `<p class="alerta-p">⚠ ${esc(r.alerta)}</p>` : ''}
    <p class="como">${desde}${novedades.length ? ` Desde entonces: ${novedades.join(' y ')}.` : ''}${r ? ` Resumen del director del ${momento(r.fecha)}.` : ''}</p>
    ${lecturaDq(est)}
    ${informeNegadosDq()}
    <div class="botones"><button type="button" data-cerrar>Cerrar</button>${mia ? `<button type="button" class="primario" data-a-mision${SIGUE_AL_DIA} title="Abre la tarjeta de tu misión de ahora: ahí está el paso siguiente">Ir a lo que sigue →</button>` : porDecidir ? `<button type="button" class="primario" data-a-propuestas${SIGUE_AL_DIA}>Ver las propuestas →</button>` : ''}</div>
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
      // Sin «¿Dónde quedamos?», la niebla de lectura vuelve a ser solo del enfoque
      aplicarEnfoque();
      pintarMando();
      if (destino) await ir(destino);
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
      if (b.dataset.aMision !== undefined && mia) void terminar(tarjetaDe(mia));
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
  });
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
  return `<p class="negados-dq">${icono('candado')}<span>En su última revisión, del ${esc(momento(ultima.cuando))}, se le ${n === 1 ? 'negó 1 permiso' : `negaron ${n} permisos`} al director: lo que no pudo hacer por eso lo dice en sus comentarios. <button type="button" class="enlace" data-a-permisos>Ver en el panel</button></span></p>`;
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
  avanzamos: 'Lo que avanzamos',
  director: 'Comentarios del director',
  'r-pregunta': 'Lo que respondí a tus preguntas',
  'r-ajuste': 'Lo que pediste cambiar',
  'r-falla': 'Lo que fallaba',
  'r-respuesta': 'Lo que me respondiste',
  'r-idea': 'Tus ideas',
  'r-otras': 'Tus otras notas',
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
  const conocidas = new Set(archivo.map((l) => l.h));
  let viejas: Set<string> | null = null;
  const ahora = new Date().toISOString();
  const secciones = seccionesDq();
  const deAhora = new Set(secciones.flatMap((s) => s.items.map((t) => huellaDq(s.id, t))));
  let cambio = false;
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
  `<li><button type="button" class="dq-item${leida ? ' leida' : ''}" data-huella="${l.h}" data-seccion="${esc(l.s)}" data-orden="${orden}" title="${leida ? 'Volver a ponerla entre lo que falta' : 'Tócala cuando la leas'}"><span class="dq-check" aria-hidden="true"></span><span class="dq-cuerpo"><span class="dq-texto">${textoDq(l)}</span></span><span class="sr-only">${leida ? ' (leída)' : ''}</span></button><button type="button" class="dq-comentar" data-dq-comentar="${l.h}" title="Comentar o preguntar sobre esto al director" aria-label="Comentar esto al director">✉</button></li>`;

/** El ✉ de una línea: una nota general que cita la línea (su sección y su comienzo), para que el director sepa a qué responde. */
async function comentarDq(h: string, est: EstadoDq) {
  const l = est.archivo.find((x) => x.h === h);
  if (!l) return;
  const t = l.t.replace(/\*\*/g, '');
  await comentar({ tipo: 'general', seccion: `Dónde quedamos › ${TITULOS_DQ[l.s] ?? l.s}`, fragmento: recortar(t, 200) }, `Comentar «${recortar(t, 70)}»`);
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
    <div class="filtro-tipo dq-pestanas" role="tablist" aria-label="Lo que hay, por tipo">${pestanas.map((p) => `<button type="button" role="tab" class="chip-tipo${p === activa ? ' activo' : ''}" data-dq-pestana="${p}" aria-selected="${p === activa}">${esc(NOMBRE_PESTANA_DQ[p])} · <span class="cifra"></span></button>`).join('')}</div>
    ${pestanas.map((p) => `<div class="dq-panel" role="tabpanel" data-pestana="${p}"${p === activa ? '' : ' hidden'}>${ids.filter((id) => pestanaDeSeccion(id) === p).map(seccion).join('')}</div>`).join('')}
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
  // Subir de nivel suena más grande que la misión aprobada que lo trajo
  sonar(c.subeA ? 'logro' : 'aprobada');
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
    <div class="botones"><button type="button" data-cerrar autofocus>Cerrar</button>${sigue ? '<button type="button" class="primario" data-seguir data-siguiente title="Abre la tarjeta de tu misión de ahora: ahí está el paso siguiente">Ir a lo que sigue →</button>' : ''}</div>
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
  if (!(await guardado) || !(await accion({ tipo: 'entregar', mision: m.id, automatico: 'ultimo_paso' }, ''))) return false;
  sonar('entrega');
  // Entregada, la revisión no se pide sola ni se ofrece aquí, ni siquiera con la última misión (nota de voz del titular,
  // 22 de octubre de 2026: quedarse sin misiones no es motivo para pedirla; antes puede querer leer, comentar o corregir,
  // y un botón de pedirla en la celebración se oprimía sin querer). La pide la persona cuando quiera, con «Pedir
  // revisión», arriba, en la cabecera. Con el director ya revisando, no entra en esa revisión
  // Un director vivo (el de la anterior, que termina lo último, o el de otro proyecto) cuenta como en marcha
  const ocupado = directorOcupado();
  const enMarcha = revisando() || !!ocupado;
  const yaPedida = !enMarcha && !!d.revision && !d.revision.hecha;
  const mia = misionesAbiertas(d.plan, d.estado, d.identidad.rol ?? TITULAR)[0];
  const CUANDO_QUIERAS = 'Pide la revisión cuando quieras, con «Pedir revisión», arriba, en la cabecera: antes puedes leer, comentar o corregir lo que necesites';
  const ENTREGADA_EN_MARCHA = ocupado && !revisando()
    ? `Quedó entregada para la revisión siguiente. ${ocupado.corto}: cuando termine, pide la revisión cuando quieras, con «Pedir revisión», arriba, en la cabecera`
    // Con la hora y quién la pidió: que nadie crea que entregar la misión la disparó (nota de voz del titular, 23 de octubre)
    : `Quedó entregada para la revisión siguiente: el director trabaja desde las ${d.revision ? hora(d.revision.lanzada ?? d.revision.pedida) : '…'} en la que pidió ${d.revision?.quien ?? 'alguien'}, y no la incluye; entregarla no pidió ninguna. Cuando termine, pide la revisión cuando quieras, con «Pedir revisión», arriba, en la cabecera`;
  // La recomendación del director, si la dejó en esta misión y no hay ya una revisión pedida o en marcha
  const recomienda = !enMarcha && !yaPedida && m.recomiendaRevision?.trim() ? m.recomiendaRevision.trim() : null;
  // Si ya hay otro diálogo abierto (por ejemplo «Dónde quedamos»), no se le encima: basta el aviso
  if (document.querySelector('dialog[open]')) {
    avisar(`Misión completada: «${recortar(m.titulo, 70)}». ${enMarcha ? ENTREGADA_EN_MARCHA : yaPedida ? 'Quedó entregada y entra en la revisión ya pedida' : `Quedó entregada. ${recomienda ? `El director recomienda pedir la revisión ahora: ${recomienda}` : CUANDO_QUIERAS}`}.`, true);
    return true;
  }
  const sigue = mia ? tarjetaDe(mia) : null;
  const dlg = document.createElement('dialog');
  dlg.className = 'dialogo-director celebracion';
  dlg.innerHTML = `<form method="dialog">
    ${quieto() ? '' : `<div class="confeti" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>`}
    <span class="etiqueta">Misión completada</span>
    <h2>${mia ? '¡Bien hecho!' : '¡Felicidades!'}</h2>
    <ul class="cumplidas"><li>${icono('estrella')}<span>${esc(m.titulo)}</span><b>+${m.xp} XP</b></li></ul>
    ${recomienda ? recomendacionDeRevision(recomienda) : ''}
    ${mia
      ? `<p class="como">${enMarcha
        ? ENTREGADA_EN_MARCHA
        : yaPedida
        ? 'Quedó entregada y entra en la revisión que ya pediste'
        : `Quedó entregada: el director la revisa en la revisión que pidas. ${CUANDO_QUIERAS}`}. Al aprobarla, sumas la XP. Si quieres contarle algo, «Comentar al director» en la misión.</p>
    <div class="mision-a"><span class="etiqueta">Tu misión ahora</span><b>${esc(mia.titulo)}</b></div>`
      // Sin otra misión abierta tampoco se empuja la revisión: el director define las siguientes en la que se pida
      : `<p class="todas-hechas">${enMarcha
        ? `Completaste todas las misiones que tenías por ahora. ${ocupado && !revisando() ? `${ocupado.corto} y trabaja un director a la vez` : 'El director ya empezó una revisión y esta entrega no entra en ella'}: cuando termine, pide la revisión cuando quieras, con «Pedir revisión», arriba, en la cabecera.`
        : yaPedida
        ? 'Completaste todas las misiones que tenías por ahora. Entra en la revisión que ya pediste: el director analiza el resultado y define tus misiones siguientes.'
        : `Completaste todas las misiones que tenías por ahora. El director define las siguientes en la revisión que pidas. ${CUANDO_QUIERAS}.`}</p>
    <p class="como">Al aprobarla, sumas la XP. Si quieres contarle algo, «Comentar al director» en la misión.</p>`}
    <div class="botones">${sigue ? '<button type="button" data-cerrar autofocus>Cerrar</button><button type="button" class="primario" data-seguir data-siguiente>Ir a mi misión →</button>' : '<button type="button" class="primario" data-cerrar data-siguiente autofocus>Entendido</button>'}</div>
  </form>`;
  document.body.append(dlg);
  dlg.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    // «Pedir la revisión» de la recomendación la pide el oyente de toda la página ([data-revision]); aquí solo se cierra
    if (b?.dataset.revision === 'pedir') return void dlg.close();
    if (b?.dataset.seguir === undefined && b?.dataset.cerrar === undefined) return;
    dlg.close();
    if (b.dataset.seguir !== undefined && sigue) void ir(sigue);
  });
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
  return true;
}

/**
 * La recomendación del director de pedir la revisión al entregar una misión (`recomiendaRevision`), con su razón y su
 * botón. Solo la recomienda: la revisión la pide la persona con ese botón, o no la pide (regla dura del 23 de octubre).
 */
function recomendacionDeRevision(razon: string): string {
  return `<div class="recomienda-revision" role="note"><p><b>El director recomienda pedir la revisión ahora.</b> ${esc(razon)}</p>
    <button type="button" data-revision="pedir" data-origen="recomendada" title="Solo tú pides la revisión: entregar la misión no la pidió">Pedir la revisión</button></div>`;
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
      return avisar(`«${r.datos.nombre}» quedó en el Studio, con su memoria en su repositorio. Cuando quieras, pide la revisión con «Pedir revisión», arriba: el director te devuelve ${r.datos.tipo === 'nuevo' ? 'el planteamiento' : 'el diagnóstico'}. Solo tú la pides.`, true);
    }
    // Varios existentes (en líneas o del escaneo): el director los diagnostica en sus próximas revisiones
    const res = await fetch('/__estudio/director/proyectos-varios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proyectos: r.proyectos }) });
    const j: { creados?: { id: string; nombre: string }[]; errores?: string[]; error?: string } = await res.json();
    if (!res.ok) throw new Error(j.error ?? `El servidor respondió ${res.status}`);
    await cargar(true);
    irA('proyectos');
    const n = j.creados?.length ?? 0;
    avisar(`${n === 1 ? 'Un proyecto entregado' : `${n} proyectos entregados`} al director, cada uno con su memoria en su repositorio. Cuando pidas la revisión, con «Pedir revisión», arriba, los diagnostica de a tres por revisión.${j.errores?.length ? ` No se agregaron: ${j.errores.join(' ')}` : ''}`, !j.errores?.length);
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
  $('vista').innerHTML = `<section class="bienvenida panel-d">
    <span class="etiqueta">STL Studio · con director asistente</span>
    <h1>Entrégale tu primer proyecto al director</h1>
    <p>El director asistente se pone entre tú y el modelo de IA. Desde aquí diriges todos tus proyectos: tú comentas, entregas y decides; él diagnostica, traza la ruta por fases y te da <b>una misión a la vez</b>. Cada proyecto guarda su buzón, su ruta y su historial.</p>
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
        <h1><span class="titulo-fase">${esc(f.nombre)}</span> <small>${esc(corto(f.etapa))}</small></h1>
      </div>
      <div class="acciones-cabeza">${botonRevision()}${((nv) => `<button type="button" class="boton-suave${nv.sinLeer ? ' por-leer' : ''}${nv.nuevo ? ' hay-novedades' : ''}" data-donde-quedamos title="${nv.sinLeer ? `${nv.nuevo ? 'El director dejó algo nuevo. ' : ''}${nv.sinLeer} ${nv.sinLeer === 1 ? 'línea' : 'líneas'} por leer: lo que dijo el director, lo que avanzamos y en qué quedamos` : 'Lo que dijo el director, lo que avanzamos y en qué quedamos: al día'}">${icono('reloj')} ¿Dónde quedamos?${nv.sinLeer ? `<span class="cifra">${nv.sinLeer}</span>` : ''}</button>`)(novedadesDq())}${botonEnfoque()}${botonTema()}${botonSonido()}</div>
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
/**
 * La revisión pedida espera aunque nadie trabaje desde este Studio: otro director tiene el candado de su proyecto (la sesión
 * del director, u otro Studio), o la ventana de uso de tu plan está agotada.
 */
const esperaCandado = () => !!d.revision && !!d.revisor?.espera && d.revisor.espera.proyecto === d.activo;
/** En qué va la revisión pedida, en una frase (para la cabecera y lo que pasa en segundo plano). */
function estadoRevision(): { estado: 'ninguna' | 'pedida' | 'en_curso' | 'sin_vigilia'; texto: string } {
  const r = d.revision;
  if (r && !r.hecha && (r.enCurso || r.lanzada)) return { estado: 'en_curso', texto: 'El director está revisando' };
  if (r && !r.hecha && r.error && !vigilando())
    return { estado: 'sin_vigilia', texto: `${r.error} Pídela de nuevo, o en la sesión del director escribe «revisa estudio».` };
  // Un director sigue trabajando (el de la revisión anterior, que ya la cerró y termina lo último, o el de otro
  // proyecto): esta espera su turno y empieza sola, porque trabaja un director a la vez (nota de voz del 22 de octubre)
  if (r && !r.hecha && automatica() && d.revisor?.revisando)
    return { estado: 'pedida', texto: `Revisión pedida a las ${hora(r.pedida)}: espera su turno. ${d.revisor.revisando === d.activo ? 'El director de la revisión anterior ya la cerró, pero sigue terminando lo último' : 'Un director está trabajando en otro proyecto'}; esta empieza sola en cuanto él termine, porque trabaja un director a la vez.` };
  // Otro director tiene el candado del proyecto (la sesión del director, que corre «revisa estudio» a mano, o uno que
  // lanzó otra copia del Studio; pd_un_director), o la ventana de uso de tu plan está agotada (pr_procesos_vista, punto
  // 4): esta espera su turno y empieza sola, y el porqué lo dice el servidor
  if (r && !r.hecha && automatica() && esperaCandado())
    return { estado: 'pedida', texto: `Revisión pedida a las ${hora(r.pedida)}: espera su turno. ${d.revisor!.espera!.texto}` };
  if (r && !r.hecha && automatica()) return { estado: 'pedida', texto: `Revisión pedida a las ${hora(r.pedida)}: el Studio está llamando al director.` };
  if (r && !r.hecha && !vigilando())
    return { estado: 'sin_vigilia', texto: `Revisión pedida a las ${hora(r.pedida)}, pero nadie la está tomando. ${d.revisor?.problema ?? 'El Studio no encontró Claude Code en este computador para llamar al director.'} Mientras tanto, en la sesión del director, escribe /loop 5m /vigila, o «revisa estudio».` };
  if (r && !r.hecha) return { estado: 'pedida', texto: `Revisión pedida a las ${hora(r.pedida)}. El director mira cada ${VIGILIA_MIN} minutos (su última vuelta: ${hora(d.vigilia!)}) y la toma en la siguiente; hasta que empiece, la puedes cancelar.` };
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
  if (m) return { corto: 'Se está midiendo el núcleo', porque: `La medición del núcleo del director que pidió ${m.quien} está corriendo y gasta del mismo límite de tu cuenta: «Pedir revisión» vuelve cuando termine, o cuando la detengas en «Modelo y consumo» › «Lo que gasta».` };
  const vivo = d?.revisor?.revisando;
  if (!vivo) return null;
  const vuelve = 'Trabaja un director a la vez: «Pedir revisión» vuelve en cuanto termine.';
  return vivo === d.activo
    ? { corto: 'El director termina lo último', porque: `El director de la revisión anterior ya la cerró, pero sigue terminando lo último. ${vuelve}` }
    : { corto: 'Un director trabaja en otro proyecto', porque: `Un director está trabajando en otro proyecto de este Studio. ${vuelve}` };
}

/** Cuánto se espera, sin nada nuevo en el registro de la revisión lanzada, para decir que está parada (revisor.ts › SIN_ACTIVIDAD_MIN). */
const SIN_ACTIVIDAD_MIN = 10;
/** Los minutos que lleva sin nada nuevo la revisión en marcha, si pasan de SIN_ACTIVIDAD_MIN; si no, 0. */
function minutosSinActividad(): number {
  if (!d?.actividad || estadoRevision().estado !== 'en_curso') return 0;
  const m = Math.floor((Date.now() - Date.parse(d.actividad)) / 60_000);
  return m >= SIN_ACTIVIDAD_MIN ? m : 0;
}
const PARADA = (min: number) =>
  `El registro del director no cambia desde hace ${min} minutos: puede haberse quedado parado. El Studio lo vigila: si Claude Code se detuvo, la marca como fallida y te dice por qué; si sigue así, la corta al llegar a su límite.`;
/** Lo que corre el director mientras su registro no crece: espera a que termine, y el límite lo sigue cuidando. */
const CORRE = (que: string, min: number) =>
  `Desde hace ${min} minutos espera a que termine lo que corre (${que.replace(/\.$/, '')}), y su registro no cambia mientras tanto. Si llega a su límite, el Studio lo corta y te dice qué esperaba.`;

/** Cuánto se sigue mostrando por qué pararon las revisiones seguidas (horas). */
const PARO_VISIBLE_H = 12;

/**
 * Las revisiones seguidas (pedido pd_revisiones_seguidas): en marcha, cuántas van y «Detener»; si pararon hace poco, por
 * qué (nunca en silencio). Vacío si no hay.
 */
function cadenaDeRevisiones(): string {
  const s = d.seguidas;
  if (!s) return '';
  if (!s.paro) return `<span class="estado-revision seguidas" role="status" title="${esc(`Las pidió ${s.quien} a las ${hora(s.desde)}: al cerrar cada revisión, el Studio lanza la siguiente mientras mi cola siga. Paran cuando algo de verdad te necesita, cuando una falla, cuando tu límite de cinco horas o el semanal pasa del 80 % o cuando las detienes.`)}">Revisiones seguidas${s.hechas ? ` · ${s.hechas + 1}` : ''}<button type="button" class="enlace" data-seguidas="detener">Detener</button></span>`;
  if (!paroReciente()) return '';
  // Corto, para no tapar «¿Dónde quedamos?» en la cabecera: el porqué entero está ahí, arriba de todo (pedido pd_parada_visible)
  return `<span class="estado-revision seguidas-paro" role="status" title="${esc(`Pararon a las ${hora(s.paro.cuando)}: ${s.paro.porque}.`)}">Las seguidas pararon<button type="button" class="enlace" data-donde-quedamos>¿Por qué?</button></span>`;
}

/** Por qué pararon las revisiones seguidas, si fue hace poco (PARO_VISIBLE_H); si no, null. */
function paroReciente(): { cuando: string; porque: string } | null {
  const paro = d?.seguidas?.paro;
  return paro && Date.now() - Date.parse(paro.cuando) <= PARO_VISIBLE_H * 3_600_000 ? paro : null;
}

/** El porqué de la parada, lo primero de «¿Dónde quedamos?» (nota de voz del titular, 27 de octubre de 2026). */
const lineaDeParo = (paro: { cuando: string; porque: string }) =>
  `<p class="alerta-p dq-paro">Las revisiones seguidas pararon a las ${hora(paro.cuando)}: ${esc(paro.porque.replace(/\.$/, ''))}.</p>`;

/** Cuánto tiene el director para cerrar después de «Detener ahora» (avisoAlDirector.ts › DETENER_TRAS_MIN). */
const DETENER_TRAS_MIN = 3;

/**
 * «Detener ahora», junto a «El director está revisando», solo si lo lanzó este Studio (la sesión del director, a mano, no
 * se le puede hablar); o, si alguien ya lo oprimió, que cierra con lo hecho, quién lo pidió y cuándo.
 */
function detenerAhora(): { boton: string; cerrando: string | null } {
  const v = d?.revisor?.deteniendo;
  if (v && v.proyecto === d.activo) return { boton: '', cerrando: `${v.quien} oprimió «Detener ahora» a las ${hora(v.cuando)}: el director cierra con lo hecho y, si a las ${hora(new Date(Date.parse(v.cuando) + DETENER_TRAS_MIN * 60_000).toISOString())} no cerró, el Studio lo corta.` };
  if (!automatica() || d?.revisor?.revisando !== d.activo) return { boton: '', cerrando: null };
  return { boton: `<button type="button" class="enlace" data-revision="detener" title="Le pide al director que cierre con lo hecho; si en ${DETENER_TRAS_MIN} minutos no cerró, el Studio lo corta">Detener ahora</button>`, cerrando: null };
}

/** Los límites de lo que el director hace aparte de la revisión (revisor.ts › MAX_MIN_URGENCIA y MAX_MIN_ACLARAR). */
const MIN_URGENCIA = 30;
const MIN_ACLARAR = 15;

/**
 * Lo urgente y una aclaración, también a la vista mientras corren (pr_procesos_vista, punto 3): cuánto lleva de su límite
 * y «Detener ahora», o que cierra con lo hecho. Vacío si aún no se lanzó.
 */
function seguimientoAparte(lanzada: string | undefined, limite: number): string {
  const t = tiempoDeRevision(lanzada ? { lanzada, limite } : null);
  if (!t) return '';
  const parar = detenerAhora();
  return parar.cerrando ? ' · cierra con lo hecho' : ` · lleva ${t.lleva} min de ${t.limite}${parar.boton}`;
}

/** «Detener ahora», con su confirmación: lo que hace, lo que queda y lo que no. */
async function detenerLaRevision(): Promise<void> {
  const seguidas = !!d.seguidas && !d.seguidas.paro;
  const si = await pedir({
    titulo: '¿Detener al director ahora?',
    ayuda: `Le pido al director que cierre con lo hecho: que no empiece nada nuevo, guarde en sus commits lo que ya pasa sus pruebas, escriba lo que alcanzó y lo que no, y cierre. Lo verás en «¿Dónde quedamos?», como siempre. Si en ${DETENER_TRAS_MIN} minutos no cerró, el Studio lo corta: lo que alcanzó a guardar queda, y la revisión que pidas después termina solo lo que falte.${seguidas ? ' Las revisiones seguidas también paran.' : ''}`,
    campos: [],
    boton: 'Detenerlo',
    cancelar: 'Que siga trabajando',
    vacioVale: true,
  });
  if (!si) return;
  const r = await fetch('/__estudio/director/detener', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(30_000) }).catch((x) => x as Error);
  if (r instanceof Error || !r.ok) return avisar(r instanceof Error ? 'No se pudo hablar con el servidor del Studio.' : (await r.json().catch(() => ({}))).error ?? `No se pudo: el servidor respondió ${r.status}.`);
  avisar(`Le pedí al director que cierre con lo hecho. Si en ${DETENER_TRAS_MIN} minutos no cerró, el Studio lo corta.`);
  await cargar();
}

function botonRevision() {
  const r = d.revision;
  const e = estadoRevision();
  const parada = minutosSinActividad();
  const cadena = cadenaDeRevisiones();
  // Lo que lleva y lo que le queda de su límite, a la vista mientras trabaja (pr_procesos_vista, punto 3)
  const tiempo = tiempoDeRevision(r);
  const lleva = (t = tiempo) => (t ? ` · lleva ${t.lleva} min de ${t.limite}` : '');
  const cuandoCorta = tiempo ? ` Lleva ${tiempo.lleva} minutos de los ${tiempo.limite} de su límite: ${tiempo.queda ? `le quedan ${tiempo.queda}` : 'llegó a su límite, y el Studio lo corta'}. Unos minutos antes le avisa que cierre con lo hecho y, si sigue avanzando, le da unos minutos más, una sola vez.` : '';
  // «Detener ahora» (pr_procesos_vista, punto 3), o que ya cierra con lo hecho porque alguien lo pidió
  const parar = detenerAhora();
  // Con algo corriendo (una orden larga, un ayudante, un flujo), su registro no crece y no está parado: es avance, y se dice
  // qué corre (pr_procesos_vista, punto 2)
  if (e.estado === 'en_curso' && parar.cerrando) return `<span class="estado-revision en-curso" role="status" title="${esc(parar.cerrando)}">El director cierra con lo hecho${lleva()}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></span>${cadena}`;
  if (e.estado === 'en_curso' && parada && d.enCurso) return `<span class="estado-revision en-curso" role="status" title="${esc(`${CORRE(d.enCurso, parada)}${cuandoCorta}`)}">El director está revisando${lleva()} · corre algo largo<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span>${parar.boton}</span>${cadena}`;
  if (e.estado === 'en_curso' && parada) return `<span class="estado-revision en-curso" role="status" title="${esc(PARADA(parada) + cuandoCorta)}">El director está revisando · sin actividad desde hace ${parada} min${parar.boton}</span>${cadena}`;
  if (e.estado === 'en_curso') return `<span class="estado-revision en-curso" role="status"${cuandoCorta ? ` title="${esc(cuandoCorta.trim())}"` : ''}>El director está revisando${lleva()}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span>${parar.boton}</span>${cadena}`;
  // Lanzada y fallida no es «sin tomar»: se dice lo que pasó, y «¿Por qué?» abre su reporte
  const ocupado = directorOcupado();
  if (e.estado === 'sin_vigilia') return `<span class="estado-revision sin-vigilia" role="alert" title="${esc(e.texto)}">⚠ ${r?.error ? 'La revisión no terminó' : 'Revisión pedida, sin tomar'}<button type="button" class="enlace" data-revision="explicar">¿Por qué?</button>${r?.error && !ocupado ? '<button type="button" class="enlace" title="La pide otra vez: retoma lo que esta dejó hecho, sin rehacerlo, y termina lo que falta" data-revision="pedir">Retomarla</button>' : ''}<button type="button" class="enlace" data-revision="cancelar">Cancelar</button></span>`;
  // Con un director vivo, solo una pedida sola (al entregar un proyecto) puede estar esperando: empieza cuando él termine
  if (e.estado === 'pedida') return `<span class="estado-revision pedida" role="status" title="${esc(e.texto)}">Revisión pedida · ${hora(r!.pedida)}${automatica() && (ocupado || esperaCandado()) ? ' · espera su turno' : ''}<button type="button" class="enlace" data-revision="cancelar">Cancelar</button></span>${cadena}`;
  // Un director sigue vivo: en lugar del botón, qué corre y por qué no se puede pedir, sin clic
  if (ocupado) return `<span class="estado-revision ocupado" role="status" title="${esc(ocupado.porque)}">${esc(ocupado.corto)}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></span>${cadena}`;
  const pendientes = cifras().buzon + cifras().preguntas;
  // Seguidas, solo con el Studio que llama al director: la sesión del director (/vigila) no las encadena
  const seguidas = automatica() && !(d.seguidas && !d.seguidas.paro)
    ? `<button type="button" class="boton-suave pedir-revision seguidas" data-revision="pedir" data-origen="seguidas" title="Una revisión y, al cerrar cada una, la siguiente, mientras mi cola siga. Paran cuando algo de verdad te necesita, cuando una falla, cuando tu límite de cinco horas o el semanal pasa del 80 % o cuando oprimes «Detener». Cada una dura lo que estimé al cerrar la anterior (de una hora a una y media). Gastan lo mismo que pedirlas una por una, sin que estés mirando.">Pedir revisiones seguidas</button>`
    : '';
  return `<button type="button" class="boton-suave pedir-revision" data-revision="pedir" title="El director revisa todo lo pendiente (notas, preguntas, entregas). ${automatica() ? 'El Studio lo llama en cuanto la pides.' : vigilando() ? `Su sesión mira cada ${VIGILIA_MIN} minutos.` : 'Para que la tome sola, su sesión debe tener corriendo /loop 5m /vigila.'}${r?.hecha ? ` Última revisión: ${hora(r.hecha)}.` : ''}">${icono('revisar')} Pedir revisión${pendientes ? ` <span class="cifra">${pendientes}</span>` : ''}</button>${seguidas}${cadena}`;
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
  const duro = f?.duracion == null ? '' : f.duracion < 1 ? 'Duró menos de un minuto' : `Duró ${Math.round(f.duracion)} min`;
  const gasto = f?.gasto ? `gastó ${dolares(f.gasto)} a precio de API (con un plan de suscripción no se cobra aparte, pero cuenta para sus límites)` : '';
  const usos = f?.usoFlujos ? [f.usoFlujos.flujos ? `${f.usoFlujos.flujos} ${f.usoFlujos.flujos === 1 ? 'flujo' : 'flujos'} de varios agentes` : '', f.usoFlujos.ayudantes ? `${f.usoFlujos.ayudantes} ${f.usoFlujos.ayudantes === 1 ? 'ayudante' : 'ayudantes'}` : ''].filter(Boolean).join(' y ') : '';
  const cifrasFalla = [duro && gasto ? `${duro} y ${gasto}.` : duro ? `${duro}.` : gasto ? `${gasto[0].toUpperCase()}${gasto.slice(1)}.` : '', usos ? `Lanzó ${usos}.` : ''].filter(Boolean).join(' ');
  const ultimos = f?.ultimos ?? [];
  // Con un director vivo no se ofrece pedirla de nuevo: se dice qué corre y vuelve cuando termine
  const ocupado = directorOcupado();
  // Con tu plan en su límite, retomarla la deja esperando a que se renueve (el lanzador no la lanza a fallar)
  const limitada = !!f?.renueva && Date.parse(f.renueva) > Date.now();
  const dlg = document.createElement('dialog');
  dlg.className = 'dialogo-director falla-revision';
  dlg.innerHTML = `<form method="dialog">
    <header class="cabeza-dialogo"><span class="etiqueta">Qué pasó con la revisión</span><h2>${esc(f?.que ?? 'La revisión no terminó')}</h2></header>
    <p class="alerta-p"><b>Por qué:</b> ${esc(f?.porque ?? r.error)}</p>
    ${cifrasFalla ? `<p class="como">${esc(cifrasFalla)}</p>` : ''}
    ${ultimos.length ? `<p class="etiqueta">Lo último que alcanzó a hacer</p>
    <ol class="pasos-progreso">${ultimos.map((p) => `<li class="${p.tipo}">${p.tipo === 'dice' ? esc(recortar(p.texto, 240)) : `<span class="como">${esc(p.texto)}</span>`}${p.veces ? ` <span class="veces" title="${p.veces} veces seguidas">${p.veces}</span>` : ''}</li>`).join('')}</ol>` : ''}
    ${f?.negados.length ? `<p class="como"><b>Permisos que se le negaron:</b> ${f.negados.map(esc).join('; ')}.</p>` : ''}
    <p><b>Qué conviene:</b> ${esc(f?.sugerencia ?? 'Pídela de nuevo, o en la sesión del director escribe «revisa estudio».')}${f?.renueva ? ` Tu límite se renueva el ${esc(momento(f.renueva))}.` : ''}</p>
    ${f?.registro ? `<p class="como">El detalle completo quedó en ${esc(f.registro)}, en la carpeta del Studio.</p>` : ''}
    ${ocupado ? `<p class="como"><b>${esc(ocupado.corto)}.</b> ${esc(ocupado.porque)}</p>` : ''}
    <div class="botones">
      <button type="button"${ocupado ? ' class="primario"' : ''} data-cerrar>Cerrar</button>
      <button type="button" data-cancelar title="Quita la revisión pedida: lo que dejaste en el Buzón sigue ahí, y lo que esta dejó hecho lo retoma la próxima que pidas">Cancelar la revisión</button>
      ${ocupado ? '' : `<button type="button" data-nota title="Le dejas una nota en el Buzón (qué atender primero, qué no hacer) y la revisión se pide de nuevo: el director la lee al empezar">Decirle algo y pedirla</button>
      ${sinUltracode ? `<button type="button"${f?.accion === 'sin_ultracode' ? ' class="primario"' : ''} data-sin-ultracode title="Le quita al director el permiso de ultracode (se lo puedes volver a dar en «Modelo y consumo») y pide la revisión: trabaja sin flujos de varios agentes">Pedirla sin ultracode</button>` : ''}
      <button type="button"${sinUltracode && f?.accion === 'sin_ultracode' ? '' : ' class="primario"'} data-pedir title="${esc(`La pide otra vez: retoma lo que esta dejó hecho, sin rehacerlo, y termina lo que falta${limitada ? '. Con tu plan en su límite, se lanza sola cuando se renueve' : ''}`)}">${limitada ? 'Retomarla cuando se renueve' : 'Retomarla'}</button>`}
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
    const dejo = await comentar({ tipo: 'general', seccion: 'La revisión que no terminó', fragmento: recortar(f?.que ?? r.error, 200) }, 'Lo que el director debe saber para la revisión');
    if (dejo) await pedirLaRevision(true, 'falla_nota');
    return;
  }
  if (que === 'sin_ultracode') {
    // La misma acción de «Modelo y consumo» (quitarle el permiso), sin su aviso: el de la revisión pedida basta
    const q = await fetch('/__estudio/director/ultracode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ director: false }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
    const x = q instanceof Error ? null : await q.json().catch(() => ({}));
    if (q instanceof Error || !q.ok) return avisar(`No se pudo quitar el permiso de ultracode${x?.error ? ` (${x.error})` : ''}: la revisión no se pidió. Puedes quitarlo en «Modelo y consumo».`);
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
  const nombre = tipo === 'aclaracion' ? 'la aclaración' : 'lo urgente';
  const duro = f?.duracion == null ? '' : f.duracion < 1 ? 'Duró menos de un minuto' : `Duró ${Math.round(f.duracion)} min`;
  const gasto = f?.gasto ? `gastó ${dolares(f.gasto)} a precio de API` : '';
  const cifras = duro && gasto ? `${duro} y ${gasto}.` : duro ? `${duro}.` : gasto ? `${gasto[0].toUpperCase()}${gasto.slice(1)}.` : '';
  const ocupado = directorOcupado() ?? (revisando() ? { corto: 'El director está revisando', porque: 'Trabaja un director a la vez: «Retomarla» vuelve en cuanto termine.' } : null);
  const dlg = document.createElement('dialog');
  dlg.className = 'dialogo-director falla-revision';
  dlg.innerHTML = `<form method="dialog">
    <header class="cabeza-dialogo"><span class="etiqueta">Qué pasó con ${nombre}</span><h2>${esc(f?.que ?? (tipo === 'aclaracion' ? 'La aclaración no terminó' : 'Lo urgente no terminó'))}</h2></header>
    <p class="alerta-p"><b>Por qué:</b> ${esc(f?.porque ?? x.error)}</p>
    ${cifras ? `<p class="como">${esc(cifras)}</p>` : ''}
    ${f?.ultimos.length ? `<p class="etiqueta">Lo último que alcanzó a hacer</p>
    <ol class="pasos-progreso">${f.ultimos.map((p) => `<li class="${p.tipo}">${p.tipo === 'dice' ? esc(recortar(p.texto, 240)) : `<span class="como">${esc(p.texto)}</span>`}</li>`).join('')}</ol>` : ''}
    ${f?.negados.length ? `<p class="como"><b>Permisos que se le negaron:</b> ${f.negados.map(esc).join('; ')}.</p>` : ''}
    <p><b>Qué conviene:</b> Retómala: lo que el director alcanzó a guardar queda, y termina solo lo que faltó. O déjala para la revisión, que la atiende con lo demás: ${tipo === 'aclaracion' ? 'tu pedido' : 'lo urgente'} ya está en el Buzón.${f?.renueva ? ` Tu límite se renueva el ${esc(momento(f.renueva))}.` : ''}</p>
    ${f?.registro ? `<p class="como">El detalle completo quedó en ${esc(f.registro)}, en la carpeta del Studio.</p>` : ''}
    ${ocupado ? `<p class="como"><b>${esc(ocupado.corto)}.</b> ${esc(ocupado.porque)}</p>` : ''}
    <div class="botones">
      <button type="button"${ocupado ? ' class="primario"' : ''} data-cerrar>Dejarla para la revisión</button>
      ${ocupado ? '' : '<button type="button" class="primario" data-retomar title="La pide otra vez, solo a ella: el director retoma lo que esta dejó, sin rehacerlo, y termina lo que falta">Retomarla</button>'}
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
  if (q instanceof Error || !q.ok) return avisar(q instanceof Error ? 'No se pudo hablar con el servidor del Studio.' : (await q.json().catch(() => ({}))).error ?? `No se pudo: el servidor respondió ${q.status}.`);
  avisar(tipo === 'aclaracion' ? 'El director retoma la aclaración: termina solo lo que faltó, y el paso se reescribe aquí mismo.' : 'El director retoma lo urgente: termina solo lo que faltó, y el resultado llega a «¿Dónde quedamos?».', true);
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
  if (aclarando(id, i)) return avisar('El director está reescribiendo este paso para que se entienda mejor: espera su explicación, que llega aquí mismo, antes de dejárselo.');
  const ok = await confirmar({
    titulo: 'Seguir con otra misión',
    texto: `Esta misión pasa al director tal como está, con el paso ${i + 1} sin hacer${paso ? ' y lo que encontró el Studio al comprobarlo' : ''}: él lo hace, si puede, o te la devuelve con el paso corregido. Tú sigues ahora con la siguiente.\n\nSi tienes una captura o algo más que contarle, déjalo antes con el ✉ del paso: así le llega junto.`,
    boton: 'Sí, seguir con otra',
    cancelar: 'No, volver',
  });
  if (!ok) return;
  // Lo confirmado en el diálogo pudo cambiar mientras estaba abierto (una revisión, la comprobación que volvió)
  if (!['pendiente', 'en_curso', 'rehacer'].includes(estadoMision(m, d.plan, d.estado)) || pasosHechos(id).includes(i)) return;
  const nota = `No me salió el paso ${i + 1} y seguí con otra misión.${paso ? ` ${paso}` : ''}`;
  if (!(await accion({ tipo: 'entregar', mision: id, nota, sinTerminar: i }, 'La misión quedó para el director tal como está, con lo que pasó.'))) return;
  const mia = misionesAbiertas(d.plan, d.estado, m.para)[0];
  decir(mia ? `Sigamos con «${recortar(mia.titulo, 80)}». Lo otro lo veo yo.` : 'Lo veo yo en la revisión. Por ahora no tienes otra misión abierta.', 'feliz');
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
  avisar(j.aclaracion ? 'El director lo revisa y te lo explica con más detalle aquí mismo, en un momento.' : 'El Studio no puede llamar al director ahora: tu pedido quedó en el Buzón y entra en la revisión que pidas, con «Pedir revisión», arriba.', true);
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
  if (r instanceof Error) return void (pintar(), avisar('No se pudo hablar con el servidor del Studio.'));
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return void (pintar(), avisar(j.error ?? 'No se pudo.'));
  d.estado = j.estado;
  d.aclaracion = j.aclaracion ?? null;
  pintar();
  avisar(j.aclaracion ? 'El paso quedó marcado y el director lo comprueba en un momento: lo que encuentre aparece debajo de él. Sigue con lo tuyo.' : 'El paso quedó marcado. El Studio no puede llamar al director ahora: tu pedido quedó en el Buzón y lo comprueba la revisión que pidas, con «Pedir revisión», arriba.', true);
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
    titulo: 'Tu límite de cada cinco horas está casi lleno',
    ayuda: `Llevas el ${v.uso.toLocaleString('es')} % de tu límite de cada cinco horas, y se renueva el ${fecha(v.renueva!)} a las ${hora(v.renueva!)}. Es lo que informó Claude Code al terminar el último lanzamiento: con lo que hayas usado después en otras sesiones, puede ser más. Una revisión gasta una parte grande de ese límite y, si llega al 100 %, se detiene a mitad de camino: lo hecho queda guardado, y la retomas cuando se renueve. Con «Esperar» no se pide nada.`,
    campos: [],
    boton: 'Pedirla de todos modos',
    cancelar: 'Esperar',
    vacioVale: true,
  });
  return !!si;
}

async function pedirLaRevision(pedir: boolean, origen?: 'cabecera' | 'falla' | 'falla_nota' | 'falla_sin_ultracode' | 'meta' | 'urgente' | 'recomendada' | 'permisos' | 'seguidas' | 'hoy', callada = false): Promise<boolean> {
  // Ningún camino pide una segunda revisión mientras un director vive: se dice qué corre y por qué
  const ocupado = pedir ? directorOcupado() : null;
  if (ocupado || (pedir && revisando())) {
    avisar(ocupado ? `${ocupado.corto}. ${ocupado.porque}` : 'El director ya está revisando: trabaja un director a la vez, y «Pedir revisión» vuelve en cuanto termine.');
    return false;
  }
  // Lo que quedó sin enviar no le llega al director: primero se muestra (pd_dialogo_unico)
  if (pedir && !callada && !(await antesDeLosBorradores())) return false;
  // Con el límite de cada cinco horas casi lleno, primero cuánto queda y cuándo se renueva (pr_procesos_vista, punto 4)
  if (pedir && !(await seguirCercaDelLimite())) return false;
  const r = await fetch('/__estudio/director/revision', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pedir, ...(pedir ? { origen } : {}) }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
  if (r instanceof Error || !r.ok) {
    // Si el servidor dice por qué no, se muestra su mensaje tal cual
    avisar(r instanceof Error ? 'No se pudo hablar con el servidor del Studio.' : (await r.json().catch(() => ({}))).error ?? `No se pudo: el servidor respondió ${r.status}.`);
    return false;
  }
  // Solo se promete lo que es cierto: si la sesión del director no está mirando, se dice
  if (!callada || !(automatica() || vigilando())) avisar(!pedir ? 'Revisión cancelada.'
    : automatica() && origen === 'seguidas' ? 'Revisiones seguidas pedidas: el Studio llama al director ahora mismo y, al cerrar cada revisión, lanza la siguiente mientras su cola siga. Aquí verás cuántas van, y «Detener» las para.'
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
  // «Modelo y consumo», en el pie: no es de un proyecto, pero se marca igual cuando estás en ella
  const pie = $('ir-modelo');
  pie.innerHTML = `${icono(ICONO_VISTA.modelo)}<span>${NOMBRE_VISTA.modelo}</span>`;
  pie.classList.toggle('sel', vista === 'modelo');
  if (vista === 'modelo') pie.setAttribute('aria-current', 'page');
  else pie.removeAttribute('aria-current');
  avisarSeccionesNuevas();
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
    { n: nuevo ? 'El planteamiento' : 'El diagnóstico', hecho, texto: nuevo ? 'El director devuelve lo que entendió, el alcance, los riesgos y metas posibles. Pídelo con «Pedir revisión».' : 'El director lee el repositorio, detecta lo que está en curso y propone metas. Pídelo con «Pedir revisión».', boton: hecho ? botonIr({ vista: 'proyecto', ancla: 'p-diagnostico', etiqueta: 'Leerlo' }) : '' },
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
  const vistaP = personaVista();
  return `<div class="marcador">
    ${kpi(String(misiones), vistaP ? (vistaP === d.identidad.rol ? 'misiones tuyas por hacer' : `misiones de ${esc(nombrePersona(vistaP))} por hacer`) : 'misiones del equipo por hacer', 'una a la vez', misiones ? 'medio' : 'bien', 'misiones')}
    ${kpi(`${av.cumplidos} de ${av.total}`, 'criterios al 100 %', `para cruzar «${esc(f.puerta.nombre)}»`, av.total && av.cumplidos === av.total ? 'bien' : '', 'ruta')}
    ${kpi(String(pend.entregas.length + pend.notas.length), 'esperando al director', 'entregas y notas sin respuesta', '', 'buzon')}
    ${kpi(String(porDecidir), 'propuestas por decidir', `las decide ${esc(nombreTitular())}`, porDecidir ? 'medio' : 'bien', 'propuestas')}
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
    : d.sinTranscribir?.includes(audio) ? '<p class="transcripcion pendiente">No se pudo transcribir en este computador: el director lo intenta otra vez al revisar, y quien la grabó la puede escribir con «Escribir lo que dijiste».</p>'
    : '<p class="transcripcion procesando" role="status">Transcribiendo<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></p>';
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
  if (!caja.querySelector('.transcripcion:not(.procesando)')) caja.insertAdjacentHTML('beforeend', '<p class="transcripcion pendiente">El audio ya no está en este computador.</p>');
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
function listaPasos(m: Mision) {
  const hechos = new Set(pasosHechos(m.id));
  const sigue = m.pasos.findIndex((_, i) => !hechos.has(i));
  if (!m.pasos.length) return '';
  return `${sigue >= 0 ? listaDePasos(m, true, [sigue]) : '<p class="pasos-listos">Hiciste todos los pasos: entrégala al director y él la revisa.</p>'}
    ${hechos.size ? `<details class="pasos-completados"${plegable(`pasos|${m.id}|${hechos.size}`)}><summary>Completado <span class="cifra">${hechos.size}</span></summary>${listaDePasos(m, true, [...hechos].sort((a, b) => a - b))}</details>` : ''}`;
}

function listaDePasos(m: Mision, conCasillas: boolean, indices: number[]) {
  const hechos = new Set(pasosHechos(m.id));
  // El botón de un paso que lleva a su propia misión no se dibuja (`destinoDelPaso` con la misión): ya estás en ella
  return `<ol class="pasos">${indices.map((i) => [m.pasos[i], i] as const).map(([p, i]) => `<li value="${i + 1}" class="${hechos.has(i) ? 'hecho' : ''}${conCasillas ? ' con-marca' : ''}"><span>${esc(typeof p === 'string' ? p : p.texto)}</span>${typeof p !== 'string' && destinoDelPaso(p, m) ? irDelPaso(m, i, destinoDelPaso(p, m)!, conCasillas && !hechos.has(i), p.esperar) : ''}${conCasillas && hechos.has(i) && d.identidad.rol === m.para ? `<button type="button" class="enlace desmarcar-paso" data-desmarcar-paso="${esc(m.id)}|${i}" title="Lo marcaste por error: el paso vuelve a quedar por hacer">Desmarcar</button>` : ''}${conCasillas ? `<button type="button" class="comentar-paso" data-comentar="mision|${esc(m.id)}|${seccionPaso(i)}" title="Comentar este paso al director (va al Buzón)">✉</button>` : ''}${typeof p !== 'string' && p.detalle?.length ? `<ol class="detalle-paso">${p.detalle.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}${typeof p !== 'string' && p.terminal ? ordenPaso(m, i, p, conCasillas && !hechos.has(i)) : ''}${typeof p !== 'string' && p.copiar ? textoParaCopiar(p.copiar) : ''}${typeof p !== 'string' && p.opciones?.length ? opcionesPaso(m, i, p.opciones, hechos.has(i), p.esperar, destinoDelPaso(p, m), p.varias === true) : ''}${typeof p !== 'string' ? quienLoHace(m, i, p, hechos.has(i)) : ''}${conCasillas ? `<div class="pie-paso">${comprobarPaso(m, i, p, hechos.has(i))}${hechos.has(i) ? '' : aclararPaso(m, i)}${marcaPaso(m, i, p, hechos.has(i))}</div>` : ''}</li>`).join('')}</ol>`;
}

/**
 * Cómo se marca un paso: «Listo, ya lo hice», abajo a la derecha del paso de ahora (la estrella no se entendía como
 * «terminé», pedido del titular). Un paso con orden de terminal ya trae su «Ya lo hice» junto a la orden, y uno que pide
 * elegir se marca al elegir: ahí no hay otro botón. La casilla queda siempre, escondida: la usan «Ya lo hice» y «Desmarcar».
 */
function marcaPaso(m: Mision, i: number, p: Paso, hecho: boolean): string {
  const o = typeof p === 'string' ? null : p;
  const casilla = (oculta: boolean) => `<input type="checkbox" ${oculta ? 'hidden' : 'class="sr-only"'} data-paso="${esc(m.id)}|${i}"${hecho ? ' checked' : ''} aria-label="Paso ${i + 1} hecho" />`;
  if (hecho || d.identidad.rol !== m.para || o?.terminal || o?.opciones?.length) return casilla(true);
  const titulo = o?.hecho ? 'Se marca solo cuando el Studio vea que lo hiciste; si ya lo hiciste, márcalo tú' : o?.comprobar ? 'El Studio comprueba que salió bien antes de marcarlo' : 'Márcalo cuando lo hayas hecho';
  return `<label class="listo-paso" title="${titulo}">${casilla(false)}${icono('check')} Listo, ya lo hice</label>`;
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
  const elegida = eleccionDe(d.estado.notas, m.id, i, m.para)?.sobre.eleccion;
  if (elegida === YA_LO_DIJE) return `<p class="eleccion-paso">${icono('check')} Lo respondiste con tu comentario</p>`;
  if (elegida) return `<p class="eleccion-paso">${icono('check')} Elegiste: <b>${esc(elegida)}</b></p>`;
  if (hecho || d.identidad.rol !== m.para) return '';
  // Lo que ya contó con el ✉ del paso también lo responde: un botón más, discreto, al final de las opciones
  const yaLoDijo = comentarioDe(d.estado.notas, m.id, i, m.para);
  const yaLoDije = (atributos: string) => (yaLoDijo ? `<button type="button" class="boton-opcion ya-lo-dije" ${atributos} title="Marca el paso con lo que ya le contaste al director en tu comentario, sin elegir otra opción">${esc(YA_LO_DIJE)}</button>` : '');
  // Si el paso manda a ver algo, primero se ve: las opciones se abren cuando se abre su botón (y, si el paso pide
  // esperar, la espera bloquea ese botón: al abrirlo ya pasó, así que las opciones no esperan otra vez)
  // Mientras su botón espera, nada de esto se ve: aparece con él, al terminar la cuenta
  const clave = `${m.id}|${i}`;
  if (ir && !pasoAbierto(m.id, i)) {
    const esperando = !!esperar && inicioEspera(clave) + esperar * 1000 > Date.now();
    return `<div class="tras-espera" data-tras-espera="${esc(clave)}"${esperando ? ' hidden' : ''}><p class="espera-paso por-abrir">${icono('info')} <span>Primero oprime «${esc(ir.etiqueta)}»: cuando lo hayas visto, aquí eliges cómo te fue.</span></p>
      <div class="opciones-paso en-espera" role="group" aria-label="Elige una opción (se abre al ver lo que pide el paso)">${opciones.map((o) => `<button type="button" class="boton-opcion" disabled>${esc(o)}</button>`).join('')}${yaLoDije('disabled')}</div></div>`;
  }
  const hasta = esperar && !ir ? inicioEspera(clave) + esperar * 1000 : 0;
  const bloqueadas = hasta > Date.now();
  const cuenta = bloqueadas ? cuentaGrande(hasta, clave, 'Al terminar, aquí aparecen las opciones para responder.') : '';
  if (varias) {
    const marcadas = marcadasVarias.get(clave) ?? new Set<number>();
    return `${cuenta}<div class="opciones-paso varias" role="group" aria-label="Elige una o varias opciones"${bloqueadas ? ` data-espera="${esc(clave)}" hidden` : ''}><p class="pista-varias">Puedes elegir una o varias: márcalas y oprime «Listo».</p>${opciones.map((o, k) => `<button type="button" class="boton-opcion" data-marcar-opcion="${esc(m.id)}|${i}|${k}" aria-pressed="${marcadas.has(k)}">${icono('check')}${esc(o)}</button>`).join('')}${botonListoVarias(clave, marcadas.size)}${yaLoDije(`data-ya-lo-dije="${esc(m.id)}|${i}"`)}</div>`;
  }
  return `${cuenta}<div class="opciones-paso" role="group" aria-label="Elige una opción"${bloqueadas ? ` data-espera="${esc(clave)}" hidden` : ''}>${opciones.map((o, k) => `<button type="button" class="boton-opcion" data-elegir="${esc(m.id)}|${i}|${k}">${esc(o)}</button>`).join('')}${yaLoDije(`data-ya-lo-dije="${esc(m.id)}|${i}"`)}</div>`;
}

/** En un paso con `varias`, las opciones marcadas y aún sin entregar, por `<misión>|<paso>`: sobreviven a cada repintado. */
const marcadasVarias = new Map<string, Set<number>>();

const botonListoVarias = (clave: string, cuantas: number) =>
  `<button type="button" class="boton-opcion listo-varias" data-elegir-varias="${esc(clave)}"${cuantas ? '' : ' disabled'}>${cuantas > 1 ? `Listo: elijo estas ${cuantas}` : cuantas ? 'Listo: elijo esta' : 'Listo'}</button>`;

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
async function elegirEnPaso(b: HTMLButtonElement, id: string, i: number, eleccion: string, conDetalle: boolean): Promise<boolean> {
  const sobre = { tipo: 'mision' as const, id, seccion: seccionPaso(i), eleccion };
  if (conDetalle) {
    const detalle = await pedir({
      titulo: `Elegiste «${eleccion.replace(/\s*\([^)]*\)\s*$/, '')}»: cuéntale al director`,
      ayuda: 'Lo que viste, escrito o en audio (también puedes pegar una captura). Va al Buzón junto con tu elección, y el paso queda hecho.',
      campos: [{ id: 'texto', etiqueta: 'Qué pasó', tipo: 'area' }],
      boton: 'Enviar al director',
      audio: true,
      adjuntos: true,
      guardar: (r) => accion({ tipo: 'comentar', sobre, texto: r.texto ?? '', audio: r.audio, ...(r.adjuntos?.length ? { adjuntos: r.adjuntos } : {}) }, `Elegiste «${eleccion}» y se lo contaste: quedó en el Buzón para el director.`),
    });
    if (detalle) sonar('paso');
    return !!detalle;
  }
  b.setAttribute('disabled', '');
  const ok = await accion({ tipo: 'comentar', sobre }, `Elegiste «${eleccion}»: quedó en el Buzón para el director.`);
  if (!ok) b.removeAttribute('disabled');
  else sonar('paso');
  return !!ok;
}

/**
 * La cuenta de un paso que pide esperar, grande y a la vista: dice cuánto falta, por qué y qué aparece al terminar.
 * Lo que espera no se muestra deshabilitado: no se muestra, y aparece resaltado cuando la cuenta llega a cero.
 */
function cuentaGrande(hasta: number, clave: string, alTerminar: string): string {
  return `<div class="espera-paso grande" role="timer" aria-live="off" data-hasta="${hasta}" data-libera="${esc(clave)}">${icono('reloj')}<b class="cifra">${mmss(hasta - Date.now())}</b><span>Espera: es lo que tarda en verse el cambio. ${esc(alTerminar)}</span></div>`;
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
    p.outerHTML = `<p class="espera-paso lista" role="status">${icono('check')} <span>Listo: ya puedes ${boton ? 'abrirlo' : 'responder'}.</span></p>`;
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
    ? `<button type="button" class="boton-ya-hice" data-ya-hice="${esc(m.id)}|${i}" title="${p.comprobar ? 'El Studio comprueba que la orden salió bien y, si es así, marca el paso' : 'Marca el paso como hecho'}">${icono('check')} Ya lo hice</button>`
      // Mientras el director reescribe este paso («No lo entiendo»), se espera su explicación
      + (aclarando(m.id, i) ? '' : `<button type="button" class="boton-suave" data-no-salio="${esc(m.id)}|${i}" title="Si la orden falla, la misión pasa al director tal como está y tú sigues con otra">No me salió</button>`)
    : '';
  return `<div class="orden-paso"><code>${esc(orden)}</code><div class="acciones-orden">${mia ? `<button type="button" class="abrir-terminal" data-terminal="${esc(m.id)}|${i}" title="Abre una ventana de terminal nueva y corre esta orden ahí">Abrir la terminal con esta orden</button>` : ''}<button type="button" class="boton-suave" data-copiar-orden="${esc(orden)}" title="Copia la orden para pegarla en tu terminal">Copiar</button>${yaHice}</div></div>`;
}

/**
 * El texto que la persona pega en otra parte (`copiar`): entero, a la vista y con «Copiar», en el paso mismo, para que
 * no dependa de lo que imprimió una orden en una ventana ya cerrada (nota de voz del titular nmvrikd6ptit).
 */
function textoParaCopiar(texto: string): string {
  return `<div class="orden-paso texto-copiar"><blockquote>${esc(texto)}</blockquote><div class="acciones-orden"><button type="button" class="boton-suave" data-copiar-texto="${esc(texto)}" title="Copia el texto para pegarlo donde dice el paso">Copiar el texto</button></div></div>`;
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
  const dijo = respuesta ? `<p class="aclaracion-paso"><b>El director:</b> ${esc(respuesta.texto)}</p>` : '';
  if (aclarando(m.id, i)) return `${dijo}<p class="aclarando-paso" role="status">El director lo está reescribiendo con más detalle${seguimientoAparte(d.aclaracion?.mision === m.id && d.aclaracion.paso === i ? d.aclaracion.lanzada : undefined, MIN_ACLARAR)}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></p>`;
  // La aclaración de este paso no se cerró: su reporte y «Retomarla» (pr_retoma_automatica, punto 5)
  const fallida = !!ultima && !respuesta && d.aclaracion?.nota === ultima.id && !!d.aclaracion.error;
  if (ultima && !respuesta) return `<p class="aclarando-paso" role="status">${fallida ? 'La aclaración no terminó: la puedes retomar, o la responde aquí mismo la próxima revisión.<button type="button" class="enlace" data-aparte="aclaracion">¿Por qué?</button>' : 'Le pediste que te lo explique mejor: lo responde aquí mismo en su próxima revisión.'}</p>`;
  return `${dijo}<button type="button" class="aclarar-paso" data-aclarar="${esc(m.id)}|${i}" title="El director reescribe este paso con más detalle, al instante">${previas.length ? 'Aún no lo entiendo, detállalo más' : 'No lo entiendo, explícamelo mejor'}</button>`;
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
  if (respuesta) return `<p class="aclaracion-paso"><b>El director lo comprobó:</b> ${esc(respuesta.texto)}</p>`;
  if (comprobando(m.id, i)) return `<p class="aclarando-paso" role="status">El director lo está comprobando: sigue con lo tuyo${seguimientoAparte(d.aclaracion?.mision === m.id && d.aclaracion.paso === i ? d.aclaracion.lanzada : undefined, MIN_ACLARAR)}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></p>`;
  if (ultima) {
    const fallida = d.aclaracion?.nota === ultima.id && !!d.aclaracion.error;
    return `<p class="aclarando-paso" role="status">${fallida ? 'La comprobación no terminó: la puedes retomar, o la hace la próxima revisión.<button type="button" class="enlace" data-aparte="aclaracion">¿Por qué?</button>' : 'Le pediste que lo compruebe: lo responde aquí mismo en su próxima revisión.'}</p>`;
  }
  // Solo en un paso de afuera: uno que lleva a un lugar del Studio se ve ahí mismo
  const deAfuera = seMarcaAMano(p) && (typeof p === 'string' || !p.ir || !!p.ir.url);
  if (hecho || !deAfuera) return '';
  return `<button type="button" class="aclarar-paso" data-comprobar-paso="${esc(m.id)}|${i}" title="Marca el paso y el director comprueba al instante que salió bien, aparte de la revisión: usa el modelo, como «No lo entiendo»">Ya lo hice: compruébalo tú</button>`;
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
  // pudo hacer (sin servidor). Con el director revisando también se entrega: queda para la revisión siguiente
  // En la de ahora, lo resaltado es también lo que hace el botón central del ratón (siguiente.ts)
  const siguiente = numero === 1 && mia ? ' data-siguiente' : '';
  if (['pendiente', 'en_curso', 'rehacer'].includes(e) && (todos || !m.pasos.length)) acciones.push(`<button type="button" class="primario${todos ? ' llamada' : ''}" data-entregar="${esc(m.id)}"${siguiente}>Entregar al director</button>`);
  acciones.push(`<button type="button" class="al-director" data-comentar="mision|${esc(m.id)}">✉ Comentar al director</button>`);
  // Si lo que sigue es leer o decidir en un documento, se continúa de un clic: directo a lo que toca, o en el modo
  // enfoque. Para cualquier otro paso no aparecen: ese paso trae su propio botón. Tampoco cuando ya se fue a mirar lo
  // que pide un paso que se responde aquí (elegir o marcar): lo que sigue es contar cómo fue, no volver a ir (nota de
  // voz del titular nmvofxfv0tit, 25 de octubre de 2026; animo.ts › destinoDeMision, lo mismo para la cara)
  const sigue = m.pasos.findIndex((_, k) => !hechos.has(k));
  const paso = sigue >= 0 ? m.pasos[sigue] : undefined;
  if (numero === 1 && mia && typeof paso === 'object' && paso.ir?.doc && (paso.hecho || !pasoAbierto(m.id, sigue))) {
    acciones.push(`<span class="continuar-m"><button type="button" data-continuar="${esc(m.id)}|${sigue}|" title="Te lleva a lo que toca leer o decidir">Continuar misión →</button><button type="button" class="primario" data-continuar="${esc(m.id)}|${sigue}|enfoque"${siguiente} title="Lo mismo, con solo la idea de ahora a la vista">${icono('enfoque')} Continuar en modo enfoque</button></span>`);
  }
  return `<article class="mision-c ${e}${mia ? ' mia' : ''}${numero === 1 ? ' sigue' : ''}" data-ancla="mision-${esc(m.id)}">
    ${numero === 1 ? `<div class="franja-mision"><span class="sigue-esta">→ Tu misión ahora</span>${mia ? opcionesMision() : ''}</div>` : ''}
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

/**
 * La franja de arriba de tu misión de ahora en su modo enfoque, como la del documento: el tema y la niebla de lectura,
 * con su ▶ y su velocidad (nota de voz del titular nmvofr7x3tit, 25 de octubre de 2026: la niebla se podía poner en la
 * misión, pero sus controles no estaban arriba). Fuera del enfoque no se ve: arriba, en la cabecera, está el tema. En
 * cuatro grupos separados por una línea fina, los mismos de la franja del documento (controlesEnfoque.ts): el tema, la
 * niebla, la narración y el sonido, con su menú ahí mismo (pd_controles_enfoque).
 */
function opcionesMision() {
  return `<span class="opciones-mision" role="group" aria-label="Cómo leer">${controlesEnfoque({ tema: botonTema(), niebla: controlAuto('niebla'), narracion: controlAuto('voz'), sonido: botonSonido() })}</span>`;
}

/**
 * Los mismos controles de lectura arriba de «¿Dónde quedamos?» (nota de voz del titular nmvpi5ydttit, 26 de octubre de
 * 2026: «donde sea que se pueda controlar el modo niebla y este tipo de controles, debe presentar el panel de la misma
 * forma»): los cuatro grupos de controlesEnfoque, en su orden y con su línea fina, como en la franja del documento y en la
 * de la misión. El tema, la niebla (con su ▶ y su velocidad), la narración (solo con la niebla puesta) y el sonido, con su
 * menú ahí mismo, dentro del diálogo.
 */
function opcionesDq() {
  return `<span class="opciones-dq" role="group" aria-label="Cómo leer">${controlesEnfoque({ tema: botonTema(), niebla: controlAuto('niebla'), narracion: controlAuto('voz'), sonido: botonSonido() })}</span>`;
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
  return `${ahora.length ? tarjetaMision(ahora[0], false, 1) : pasoSiguienteHtml(p, esperando.length)}
    ${colaDe(p)}
    ${esperando.length ? `<h4>Esperando al director</h4>${esperando.map((m) => tarjetaMision(m)).join('')}` : ''}`;
}

/**
 * Sin misión abierta, «Hoy» dice el paso siguiente, nunca solo que no hay nada (nota de voz del titular nmvsrix5ptit, 28
 * de octubre de 2026; animo.ts › pasoSinMision): esperar la revisión que corre o está pedida, lo del arranque, las
 * propuestas o pedir la revisión, con su botón, que dice que la pide (origen «hoy»): solo se ofrece, nunca se pide sola.
 */
function pasoSiguienteHtml(p: Persona, entregadas: number): string {
  const e = estadoRevision();
  const revision = e.estado === 'en_curso' ? 'en_curso' : e.estado === 'pedida' || (e.estado === 'sin_vigilia' && !d.revision?.error) ? 'pedida' : directorOcupado() ? 'ocupado' : 'libre';
  const paso = pasoSinMision(ctx(), p, d.arranque, revision, entregadas, colaDelDirector(d.plan, d.estado).length);
  if (!paso) return '';
  const botones =
    paso.que === 'pedir'
      ? `<button type="button" class="primario" data-revision="pedir" data-origen="hoy" title="Solo tú pides la revisión: el Studio llama al director con este clic">${icono('revisar')} Pedir la revisión</button>${paso.seguidas && automatica() ? '<button type="button" class="boton-suave" data-revision="pedir" data-origen="seguidas" title="Una revisión y, al cerrar cada una, la siguiente, mientras la cola del director siga; paran cuando algo de verdad te necesita, o con «Detener»">Pedir revisiones seguidas</button>' : ''}`
      : paso.que === 'proyecto' ? botonIr({ vista: 'proyecto', ancla: d.arranque === 'objetivo' ? 'p-objetivo' : d.arranque === 'contar' ? 'p-contexto' : 'p-repositorio', etiqueta: 'Ir a «Proyecto»' })
      : paso.que === 'propuestas' ? botonIr({ vista: 'propuestas', etiqueta: 'Ir a las propuestas' })
      : '';
  return `<div class="paso-siguiente vacio-m" id="paso-siguiente" role="status"><p>${esc(paso.texto)}</p>${botones ? `<div class="botones">${botones}</div>` : ''}</div>`;
}

/**
 * La cola, plegada debajo de la misión de ahora (nota de voz del titular, 22 de octubre de 2026: «quiero ver la lista de
 * misiones pendientes para confirmar si estás cumpliendo la condición; colapsable, para no quitarle atención»). Cerrada
 * por defecto: cada misión que sigue con su porqué, y aparte las retenidas al cierre y las de la fase siguiente, que no
 * cuentan en la reserva porque no se alcanzan sin el director. Solo se lee: se trabaja en la de ahora. Al final, aparte,
 * la cola del director (colaDirector.ts), solo en la columna de quien mira: es la misma para todo el equipo.
 */
function colaDe(p: Persona) {
  const r = reservaDeMisiones(d.plan, d.estado, p);
  const siguen = r.abiertas.slice(1);
  const delDirector = p === (d.identidad.rol ?? TITULAR) ? colaDelDirector(d.plan, d.estado) : [];
  // El lote corto, con su razón a la vista (nota del titular nmvq6s7wmtit, 26 de octubre de 2026): donde se ve y se discute
  const corta = d.plan.reservaCorta?.[p]?.razon?.trim();
  if (!siguen.length && !r.enEspera.length && !r.esperan.length && !r.siguientes.length && !delDirector.length && !corta) return '';
  const item = (m: Mision) => `<li><b>${esc(m.titulo)}</b><small>${esc(m.porQue)}</small></li>`;
  // Lo que necesita antes, con su nombre: así se ve por qué todavía no aparece
  const queEspera = (m: Mision) => `<li><b>${esc(m.titulo)}</b><small>Aparece cuando esté hecho: ${esperaA(d.plan, d.estado, m).map((id) => `«${esc(nombreDeLoQueEspera(d.plan, id))}»`).join(', ')}.</small></li>`;
  // La cuenta baja al entregar cada una, hasta la revisión siguiente, que la vuelve a llenar: no es una alarma
  return `<details class="cola-m panel-d"${plegable(`cola-${p}`)}><summary><h4>Lo que sigue · ${siguen.length} ${siguen.length === 1 ? 'misión' : 'misiones'} más</h4><small class="reserva-m" title="Cada revisión te deja tu misión de ahora y por lo menos ${RESERVA_MINIMA - 1} más que alcanzas sin esperar al director">${corta && !r.alcanza ? 'Lote corto: ya lo entregaste entero; las siguientes llegan con la revisión' : corta ? `Lote corto: ${r.alcanza} contando la de ahora, con su razón` : `Reserva: ${r.alcanza} contando la de ahora (cada revisión deja ${RESERVA_MINIMA} o más)`}</small></summary>
    ${corta ? `<p class="como reserva-corta"><b>Por qué este lote es de menos de ${RESERVA_MINIMA}:</b> ${esc(corta)} Si no te convence, díselo al director en el Buzón: cada revisión busca otra vez ${RESERVA_MINIMA} que de verdad sirvan a la ruta, nunca de relleno.</p>` : ''}
    ${siguen.length ? `<ol class="cola-lista">${siguen.map(item).join('')}</ol>` : '<p class="como">No hay más misiones abiertas después de esta.</p>'}
    ${r.esperan.length ? `<p class="como">Cuando esté hecho lo que necesitan antes:</p><ul class="cola-lista espera">${r.esperan.map(queEspera).join('')}</ul>` : ''}
    ${r.enEspera.length ? `<p class="como">Al cierre de la fase, cuando el director termine lo aprobado (no cuentan en la reserva):</p><ul class="cola-lista espera">${r.enEspera.map(item).join('')}</ul>` : ''}
    ${r.siguientes.length ? `<p class="como">En la fase siguiente, al cruzar su puerta${r.enEspera.length ? ' (tampoco cuentan mientras haya algo al cierre)' : ''}: ${r.siguientes.map((m) => `«${esc(m.titulo)}»`).join(', ')}.</p>` : ''}
    ${colaDelDirectorHtml(delDirector)}
  </details>`;
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
  return `<details class="puedo panel-d"${consulta ? ' data-recuerda="puedo" open' : plegable('puedo')}><summary><h3>¿Quieres trabajar en otra cosa? Pregúntale al director</h3></summary>
    <label class="campo-puedo">Quiero trabajar en
      <select data-consulta><option value="">Elige un frente…</option>${d.plan.frentes.map((x) => `<option value="${esc(x.id)}"${x.id === consulta ? ' selected' : ''}>${esc(x.nombre)}</option>`).join('')}</select></label>
    ${respuesta}
    <p class="como">Las sesiones de Claude que trabajan en el repositorio hacen esta misma pregunta antes de cada tarea (node tools/director/estado.ts).</p></details>`;
}

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
  if (s.seccion || s.fragmento) return `${s.seccion ? esc(s.seccion) : 'el proyecto'}${s.fragmento ? ` › «${esc(recortar(s.fragmento, 60))}»` : ''}`;
  return 'el proyecto en general';
}

/** Si una nota tiene algo que corregir: su texto o lo que se entendió de su audio (ya transcrito). */
const corregible = (n: Nota) => !!n.texto || (!!n.audio && !!d.transcripciones[n.audio]);

/**
 * Si su audio no se pudo transcribir en este computador, quien lo grabó lo escribe (propuesta aceptada «La voz sin WSL»,
 * pr_voz_sin_wsl: el audio se queda hasta que salga bien, con un botón para escribir lo que se dijo). Al guardarlo, su
 * texto es la transcripción y el audio se borra, como si se hubiera transcrito.
 */
const botonEscribirLoDicho = (n: Nota) =>
  n.audio && !n.texto && d.transcripciones[n.audio] === undefined && d.sinTranscribir?.includes(n.audio)
    ? `<button type="button" data-corregir-transcripcion="${esc(n.audio)}" title="No se pudo transcribir tu audio en este computador: escribe lo que dijiste, que es lo que leerá el director">Escribir lo que dijiste</button>`
    : '';

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
  : aqui && llevaAqui(r.destino, aqui) ? `<p class="quedo-en">Quedó aquí, ${aquiMismo(r.destino)}.</p>`
  : `<p class="quedo-en">Quedó en: ${botonIr(r.destino, 'enlace')}</p>`);

/**
 * Si la nota traía varias cosas, cada una por su lado, como la separó el director (pedido pd_partes_separadas): su tipo,
 * lo que responde de ella, su tratamiento y dónde quedó.
 */
const partesDeRespuesta = (r: Respuesta, aqui?: Lugar) => (!r.partes?.length ? ''
  : `<ol class="partes-resp">${r.partes.map((p) => `<li class="parte-resp"><p class="cabeza-parte"><span class="tipo-nota ${esc(p.tipo)}">${esc(NOMBRE_TIPO_DE_NOTA[p.tipo] ?? p.tipo)}</span><span class="tratamiento ${esc(p.tratamiento)}">${NOMBRE_TRATAMIENTO[p.tratamiento] ?? esc(p.tratamiento)}</span></p><div class="texto-resp">${limpio(marked.parse(p.texto, { async: false }) as string)}</div>${quedoEn(p, aqui)}</li>`).join('')}</ol>`);

/** La parte de un documento como lugar: ahí se leen las notas sobre ella, sobre sus ideas y sobre sus decisiones. */
const enParte = (ruta: string, seccion: string): Lugar => ({ vista: 'documentos', doc: ruta, seccion });

/** Lo que dijiste en una nota de un documento y abriste entero: un repintado no lo vuelve a plegar. */
const dichosAbiertos = new Set<string>();
function plegarDicho(el: HTMLElement) {
  const abierto = !el.classList.toggle('plegado');
  if (abierto) dichosAbiertos.add(el.dataset.dicho!);
  else dichosAbiertos.delete(el.dataset.dicho!);
  el.setAttribute('aria-expanded', String(abierto));
  el.title = abierto ? 'Tócalo para plegarlo a su primer renglón' : 'Lo que dijiste, en su primer renglón: tócalo para verlo entero';
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
function tarjetaNota(n: Nota, conSobre = true, plegada = false, enRespuesta = false, aqui?: Lugar) {
  const r = d.plan.respuestas[n.id];
  const mia = n.de === d.identidad.rol;
  const puedeBorrar = !r && (titular() || mia);
  const urgente = n.urgente ? `<p class="urgente-n">${icono('urgente')}<span><b>Urgente</b>${typeof n.urgente === 'string' ? `: ${esc(n.urgente)}` : ''}</span></p>` : '';
  const botones = `${!r && mia && corregible(n) ? `<button type="button" data-editar-nota="${esc(n.id)}">Corregir</button>` : ''}${!r && mia ? botonEscribirLoDicho(n) : ''}${puedeBorrar ? `<button type="button" data-borrar-nota="${esc(n.id)}">Borrar</button>` : ''}`;
  // Lo que dijo la persona no lleva la niebla de lectura (`gl-sin`: es suyo, no hay nada que desvelarle) y lo que respondió
  // el director sí (`texto-resp`). En un documento, lo dicho se pliega a su primer renglón y se abre con un clic, para que
  // la lectura siga en lo del director (nota de voz del titular nmvmytjd0tit, 24 de octubre de 2026). Lo que respondió se
  // lee con formato y con sus dibujos, como las respuestas a las preguntas (pedido pd_graficos_svg), limpio de lo que corre
  const dicho = `${n.texto ? `<p>${esc(n.texto)}</p>` : ''}${audioYTexto(n.audio)}${adjuntosDeNota(n)}`;
  const enDoc = aqui?.vista === 'documentos';
  const plegado = enDoc && !dichosAbiertos.has(n.id);
  const deLaPersona = !dicho ? ''
    : enDoc ? `<div class="dicho-nota gl-sin plegable-dicho${plegado ? ' plegado' : ''}" data-dicho="${esc(n.id)}" tabindex="0" aria-expanded="${!plegado}" title="${plegado ? 'Lo que dijiste, en su primer renglón: tócalo para verlo entero' : 'Tócalo para plegarlo a su primer renglón'}">${dicho}</div>`
    : `<div class="dicho-nota gl-sin">${dicho}</div>`;
  const cuerpo = `${deLaPersona}
    ${r ? `<div class="respuesta-dir"><b>El director (${momento(r.cuando)}):</b>${r.tratamiento ? ` <span class="tratamiento ${r.tratamiento}">${NOMBRE_TRATAMIENTO[r.tratamiento] ?? r.tratamiento}</span>` : ''}<div class="texto-resp">${limpio(marked.parse(r.texto, { async: false }) as string)}</div>${quedoEn(r, aqui)}${partesDeRespuesta(r, aqui)}</div>` : '<p class="esperando">Esperando al director. Hasta que lo lea, puedes corregirla o borrarla.</p>'}`;
  // Su tipo, como lo eligió (o se lo puso el director): las de antes, «Sin tipo» (pd_tipo_obligatorio)
  const tipo = tipoDeNota(n, r);
  const chipTipo = `<span class="tipo-nota ${tipo}">${esc(NOMBRE_TIPO_EN_BUZON[tipo])}</span>`;
  if (plegada) {
    return `<li class="nota-d plegable${r ? ' respondida' : ''}"><details data-nota="${esc(n.id)}"${notasAbiertas.has(n.id) ? ' open' : ''}>
      <summary>${n.urgente ? `<span class="urgente-s" title="Urgente">${icono('urgente')}</span>` : ''}<span class="asunto">${esc(asuntoDe(n))}</span><span class="como">${chipTipo} ${esc(n.quien)} · ${momento(n.cuando)}${conSobre ? ` · sobre ${sobreDe(n)}` : ''}${r?.tratamiento ? ` · <span class="tratamiento ${r.tratamiento}">${NOMBRE_TRATAMIENTO[r.tratamiento] ?? r.tratamiento}</span>` : ''}${enRespuesta ? ' · <span class="hallado-en">está en la respuesta del director</span>' : ''}</span></summary>
      <div class="cuerpo-nota">${botones ? `<div class="botones-nota">${botones}</div>` : ''}${urgente}${cuerpo}</div>
    </details></li>`;
  }
  return `<li class="nota-d${r ? ' respondida' : ''}" data-guia="no">
    <header><b>${esc(n.quien)}</b><span class="como">${chipTipo} ${momento(n.cuando)}${conSobre ? ` · sobre ${sobreDe(n)}` : ''}</span>${botones}</header>
    ${urgente}
    ${cuerpo}
  </li>`;
}

/**
 * El Buzón: lo que se le ha dicho al director y lo que respondió, cada nota plegada en una línea. No tiene formulario
 * propio: se le escribe desde el comentario junto a su cara, o con «Comentar al director» en cada cosa.
 */
function vistaBuzon() {
  return `<details class="explica-buzon panel-d"${plegable('explica-buzon')}>
      <summary>¿Qué es el Buzón del director?</summary>
      <p>Es donde llega <b>todo lo que le dicen al director</b>: el comentario junto a la cara del director (su globo, «Comentario») y cada <span class="al-director-chip">✉ Comentar al director</span> de las misiones, las propuestas, los criterios, el diagnóstico y las partes de los documentos.</p>
      <p><b>Piensa, corrige y luego envía:</b> lo que dejas espera, y lo puedes corregir o borrar. El director solo lo lee cuando se pide la revisión (<b>«Pedir revisión»</b>, arriba): entonces transcribe los audios, lee todo junto, responde en cada nota y, si hace falta, cambia la ruta o las misiones.</p>
      <p>Cada nota se ve en una línea: ábrela para leerla con su respuesta. Para encontrar una, escribe en <b>«Buscar en el Buzón»</b> palabras de lo que dijiste o de lo que respondió el director. Las <b>preguntas</b> van aparte, en <button type="button" class="enlace" data-vista="preguntas">Preguntas</button>: allí el director te las responde todas juntas, como un informe.</p>
    </details>
    ${filtroVisible()}<div class="buscar-buzon" role="search">
      <label for="buscar-buzon">Buscar en el Buzón</label>
      <input id="buscar-buzon" type="search" data-buscar-buzon value="${esc(busquedaBuzon)}" placeholder="Palabras de lo que dijiste o de lo que respondió el director" autocomplete="off" spellcheck="false">
      <p class="como">Sin importar tildes ni mayúsculas, y en cualquier orden. Entre comillas, una frase tal cual.</p>
    </div>
    <div id="resultados-buzon">${notasDelBuzon()}</div>`;
}

/** Lo que se escribió en «Buscar en el Buzón»: se queda mientras no cambies de proyecto. */
let busquedaBuzon = '';
/** El tipo elegido en el filtro del Buzón (vacío: todas), como la búsqueda. */
let tipoBuzon: TipoEnBuzon | '' = '';
/** Cómo quedó, en el filtro «Cómo quedó» del Buzón (vacío: todas): se suma al del tipo. */
let comoBuzon: ComoQuedo | '' = '';

/** Lo que dice una nota (su texto, lo que se entendió de su audio, lo que eligió) y, con `conRespuesta`, lo que respondió el director. */
function textosDeNota(n: Nota, conRespuesta = true) {
  return [n.texto, n.audio && d.transcripciones[n.audio], n.sobre.eleccion, n.sobre.fragmento, conRespuesta ? d.plan.respuestas[n.id]?.texto : undefined];
}

/**
 * Las notas del Buzón: lo que espera al director y, plegado, lo ya respondido. Con algo en «Buscar en el Buzón», solo
 * las que lo dicen (en la nota o en su respuesta), todas juntas, de la más nueva a la más vieja. Se repinta sola al
 * escribir, sin tocar el campo de búsqueda.
 */
function notasDelBuzon() {
  const todas = [...d.estado.notas].reverse().filter((n) => seVe(n.de) && !esPregunta(n));
  // El filtro por tipo: uno por tipo que tenga notas, con su cuenta; las de antes, en «Sin tipo» (tu decisión nmvsv9nuytit)
  const tipos = tiposEnBuzon(todas, d.plan.respuestas);
  if (tipoBuzon && !tipos.some(([t]) => t === tipoBuzon)) tipoBuzon = '';
  let filtro = tipos.length > 1
    ? `<div class="filtro-tipo" role="group" aria-label="Filtrar por tipo">${[['', `Todas · ${todas.length}`] as [string, string], ...tipos.map(([t, k]) => [t, `${NOMBRE_TIPO_EN_BUZON[t]} · ${k}`] as [string, string])]
      .map(([t, n]) => `<button type="button" class="chip-tipo${t === tipoBuzon ? ' activo' : ''}" data-tipo-buzon="${t}" aria-pressed="${t === tipoBuzon}">${esc(n)}</button>`).join('')}</div>`
    : '';
  // Y cómo quedó cada una (la parte «Seguimiento» de pr_tipo_nota): esperando o el tratamiento de su respuesta, sobre las de ese tipo
  const deTipo = notasDeTipo(todas, d.plan.respuestas, tipoBuzon);
  const comos = comoQuedaronEnBuzon(deTipo, d.plan.respuestas);
  if (comoBuzon && !comos.some(([c]) => c === comoBuzon)) comoBuzon = '';
  const filtroComo = comos.length > 1
    ? `<div class="filtro-tipo filtro-como" role="group" aria-label="Filtrar por cómo quedó"><span class="como">Cómo quedó:</span>${[['', `Todas · ${deTipo.length}`] as [string, string], ...comos.map(([c, k]) => [c, `${NOMBRE_COMO_QUEDO[c]} · ${k}`] as [string, string])]
      .map(([c, n]) => `<button type="button" class="chip-tipo${c === comoBuzon ? ' activo' : ''}" data-como-buzon="${c}" aria-pressed="${c === comoBuzon}">${esc(n)}</button>`).join('')}</div>`
    : '';
  const notas = notasQueQuedaron(deTipo, d.plan.respuestas, comoBuzon);
  filtro += filtroComo;
  const aqui: Lugar = { vista: 'buzon' };
  if (palabrasDeBusqueda(busquedaBuzon).length) {
    const halladas = notas.filter((n) => coincideBusqueda(textosDeNota(n), busquedaBuzon));
    const enPreguntas = d.estado.notas.filter((n) => seVe(n.de) && esPregunta(n) && coincideBusqueda(textosDeNota(n), busquedaBuzon)).length;
    const tambien = enPreguntas ? ` ${enPreguntas === 1 ? 'Hay una' : `Hay ${enPreguntas}`} en <button type="button" class="enlace" data-vista="preguntas">Preguntas</button>, que van aparte.` : '';
    return `${filtro}<h3>Lo que encontré <small>· ${halladas.length}</small></h3>
      ${halladas.length
        ? `${tambien ? `<p class="como">${tambien.trim()}</p>` : ''}<ul class="notas-lista">${halladas.map((n) => tarjetaNota(n, true, true, !coincideBusqueda(textosDeNota(n, false), busquedaBuzon), aqui)).join('')}</ul>`
        : `<p class="intro">Ninguna nota del Buzón dice «${esc(busquedaBuzon.trim())}», ni en lo que se dijo ni en lo que respondió el director. Prueba con menos palabras o con otras.${tambien}</p>`}`;
  }
  const esperando = notas.filter((n) => !d.plan.respuestas[n.id]);
  const respondidas = notas.filter((n) => d.plan.respuestas[n.id]);
  return `${filtro}<h3>Esperando respuesta del director <small>· ${esperando.length}</small></h3>
    ${esperando.length ? `<ul class="notas-lista">${esperando.map((n) => tarjetaNota(n, true, true, false, aqui)).join('')}</ul>` : '<p class="intro">Nada esperando: el director está al día.</p>'}
    ${respondidas.length
      // Lo ya respondido va plegado: al entrar, la atención queda en lo que espera
      ? `<details class="ya-respondidas" data-ya-respondidas${respondidasAbiertas ? ' open' : ''}><summary><h3>Ya respondidas <small>· ${respondidas.length}</small></h3></summary>
        <ul class="notas-lista">${respondidas.map((n) => tarjetaNota(n, true, true, false, aqui)).join('')}</ul></details>`
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
    return `${mia && corregible(n) ? `<button type="button" data-editar-nota="${esc(n.id)}">Corregir</button>` : ''}${mia ? botonEscribirLoDicho(n) : ''}${mia || titular() ? `<button type="button" data-borrar-nota="${esc(n.id)}">Quitar</button>` : ''}`;
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
            ${r ? `<div class="respuesta-qa">${limpio(marked.parse(r.texto, { async: false }) as string)}${r.tratamiento === 'decision' ? '<p class="pide-decision">Esta respuesta pide tu decisión: está en el lugar que dice.</p>' : ''}${quedoEn(r, { vista: 'preguntas', ancla: `hilo-${h.raiz.id}` })}</div>`
              : `<div class="respuesta-qa esperando"><span class="como">Esperando la respuesta del director, en su próxima revisión.</span>${acciones(n)}</div>`}
          </li>`;
        }).join('')}</ol>
        <footer class="pie-hilo"><button type="button" data-seguir-hilo="${esc(h.notas.at(-1)!.id)}">${icono('pregunta')} Seguir la conversación</button><button type="button" class="enlace" data-copiar-hilo="${esc(h.raiz.id)}" title="Copia la conversación en Markdown, para llevarla a otra parte">Copiar</button></footer>
      </details>`;
    }).join('')}</div>` : '<p class="intro">Todavía no hay respuestas. Llegan con la próxima revisión del director.</p>'}`;
}

/** El diálogo de las preguntas (estudio/src/preguntas.ts), con lo que necesita del Studio. */
function formularPreguntas() {
  const yo = d.identidad.rol;
  return abrirPreguntas({
    pendientes: () => d.estado.notas.filter((n) => esPregunta(n) && n.de === yo && !d.plan.respuestas[n.id]),
    respondidas: () => d.estado.notas.filter((n) => esPregunta(n) && seVe(n.de) && d.plan.respuestas[n.id]).length,
    agregar: (texto, audio, adjuntos) => accion({ tipo: 'comentar', sobre: { tipo: 'pregunta' }, texto, audio, ...(adjuntos?.length ? { adjuntos } : {}) },'Pregunta guardada: el director la responde en su próxima revisión.'),
    corregir: (id, texto) => accion({ tipo: 'editar_nota', id, texto }, 'Pregunta corregida.'),
    quitar: (id) => accion({ tipo: 'borrar_nota', id }, 'Pregunta quitada.'),
    verRespuestas: () => irA('preguntas'),
    audio: (n) => audioYTexto(n.audio) + adjuntosDeNota(n),
    aviso: avisoRevisando,
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
  // Del repositorio, la documentación por un lado y, aparte y plegadas, las instrucciones para los agentes de IA
  // (CLAUDE.md, AGENTS.md y los comandos de Claude Code y de Codex), con un nombre que se entienda
  const instrucciones = otros.flatMap((x) => {
    const nombre = instruccionDeAgente(x.ruta, x.titulo);
    return nombre ? [{ ...x, titulo: nombre }] : [];
  });
  const delRepo = otros.filter((x) => x.ruta.startsWith('repo:') && !instrucciones.some((y) => y.ruta === x.ruta));
  const porQue = (ruta: string) => curados.find((c) => c.ruta === ruta)?.porQue ?? '';
  // Ninguna parte plegable de la columna se pliega sola, ni al abrir un documento ni al repintarse: queda como la dejaste.
  // La que recibe el documento abierto (lo acabas de abrir, o pasó a ella al leerlo) se abre, para que lo veas marcado en
  // ella (nota del titular, 22 de octubre)
  mostrarEnColumna = doc !== docEnColumna;
  docEnColumna = doc;
  // Cada parte se pliega y despliega a mano, siempre (nota del titular, 22 de octubre: lo único que no quiere es que se
  // plieguen solas). `abiertaAlNacer`: cómo nace la primera vez, si no tiene el documento abierto
  const plegableEnColumna = (clave: string, rutas: string[], abiertaAlNacer = false) => {
    const tiene = !!doc && rutas.includes(doc.ruta);
    const recibe = tiene && docEnPlegable.get(clave) !== doc;
    docEnPlegable.set(clave, tiene ? doc : null);
    if (recibe) mostrarEnColumna = true;
    const abierta = abiertaEnLista(plegadosAMano.get(clave), tiene || abiertaAlNacer, recibe);
    plegadosAMano.set(clave, abierta);
    return ` data-recuerda="${esc(clave)}"${abierta ? ' open' : ''}`;
  };
  // Al pasar el ratón, qué es: su título y, si es del repositorio, dónde está
  const queEs = (x: Documento) => (x.ruta.startsWith('repo:') ? `Del repositorio del proyecto: ${x.titulo.includes(' · ') ? x.titulo : `${x.titulo} · ${x.ruta.slice(5)}`}` : x.titulo);
  const boton = (x: Documento) => `<button type="button" class="doc-l chico${doc?.ruta === x.ruta ? ' sel' : ''}" data-doc="${esc(x.ruta)}" title="${esc(queEs(x))}">${esc(x.titulo)}</button>`;
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
  const plegado = (titulo: string, xs: typeof enRuta, abiertaAlNacer = false) => xs.length
    ? `<details class="docs-plegados" data-ancla="${titulo === 'Después' ? 'd-despues' : 'd-leidos'}"${plegableEnColumna(`columna|${titulo}`, xs.map((x) => x.ruta), abiertaAlNacer)}><summary>${titulo} <span class="cifra">${xs.length}</span></summary>${xs.map((x) => `<button type="button" class="doc-l chico ${x.lectura}${doc?.ruta === x.ruta ? ' sel' : ''}" data-doc="${esc(x.ruta)}"${x.lectura === 'despues' ? ' disabled aria-disabled="true" title="Se abre cuando termines el que sigue"' : ` title="${esc(tituloDoc(x.ruta))}"`}><b>${esc(tituloDoc(x.ruta))}</b></button>`).join('')}</details>`
    : '';
  // Lo de después y lo ya leído, siempre en su parte plegable: plegadas mientras hay algo por leer, abiertas al nacer si no
  const ordenLectura = !enRuta.length ? '<p class="intro">Tus misiones de ahora no piden documentos.</p>'
    : propia ? `${enRuta.filter((x) => x.lectura === 'siguiente').map(tarjeta).join('')}${plegado('Después', enRuta.filter((x) => x.lectura === 'despues'), !leyendo)}${plegado('Ya leídos', enRuta.filter((x) => x.lectura === 'leido' || x.lectura === 'revisado'), !leyendo)}`
    : enRuta.map(tarjeta).join('');
  // Solo los documentos del proyecto: los del Studio (su método, su diseño) no se mezclan con ellos
  const lista = `<aside class="lista-docs" id="lista-docs">
      <div class="cabeza-lista"><h3>${leyendo ? 'Tu misión actual' : 'Tu orden de lectura'} <small>· ${esc(nombrePersona(persona))}</small></h3>
        <button type="button" class="plegar-lista" data-plegar-lista aria-controls="lista-docs" title="Plegar la columna: el documento a todo el ancho" aria-label="Plegar la columna de los documentos">${icono('plegar')}</button></div>
      ${ordenLectura}
      <details class="otros-docs" data-ancla="d-otros"${plegableEnColumna('columna|otros', [...banco, ...otros].map((x) => x.ruta), !leyendo)}><summary>Otros documentos, para consultar</summary>
      ${banco.length ? `<h3>Para consultar</h3>${banco.map((c) => `<button type="button" class="doc-l chico${doc?.ruta === c.ruta ? ' sel' : ''}" data-doc="${esc(c.ruta)}" title="${esc(c.porQue || c.titulo)}"><b>${esc(c.titulo)}</b><small>${esc(c.porQue)}</small></button>`).join('')}` : ''}
      ${documentos ? `${delProyecto.length ? `<h3>Del proyecto</h3>${delProyecto.map(boton).join('')}` : ''}<h3>Del repositorio del proyecto</h3>${delRepo.map(boton).join('') || `<p class="intro">${d.repositorio.info ? (instrucciones.length ? 'El repositorio no tiene más documentación en .md.' : 'El repositorio no tiene archivos .md.') : 'Conecta el repositorio en Proyecto para leer y comentar sus documentos.'}</p>`}${instrucciones.length ? `<details class="instrucciones-agentes" data-ancla="d-agentes"${plegableEnColumna('columna|instrucciones', instrucciones.map((x) => x.ruta))}><summary>Instrucciones para los agentes <span class="cifra">${instrucciones.length}</span></summary>${instrucciones.map(boton).join('')}</details>` : ''}` : '<button type="button" data-cargar-docs>Ver todos</button>'}
      </details>
    </aside>
    <button type="button" class="desplegar-lista" data-plegar-lista aria-controls="lista-docs" title="Ver la columna de los documentos" aria-label="Ver la columna de los documentos">${icono('desplegar')}</button>`;
  if (!doc) return `<div class="docs">${lista}<div class="lector"><p class="intro">Elige un documento. Debajo de cada parte está «Comentar esta parte al director»: lo que escribas o grabes llega al Buzón del director, que responde aquí mismo y ajusta lo que haga falta. También se comentan los documentos del repositorio del proyecto (su README, su documentación).</p></div></div>`;
  const ruta = doc.ruta;
  const notas = d.estado.notas.filter((x) => x.sobre.tipo === 'documento' && x.sobre.id === ruta);
  const paraLeer = new Set(partesDeDocumento(doc.texto));
  const leidas = new Set(leidasDe(ruta));
  const parte = (s: { titulo: string; md: string }) => {
    // Una parte leída en la que el director reescribió una idea se vuelve a abrir, solo en esa idea
    const leida = leidas.has(s.titulo) && !reabierta(ruta, s);
    const seLee = !!d.identidad.rol && paraLeer.has(s.titulo);
    // Lo que falta por leer se lee de a una idea: cada párrafo o punto se marca «Entendido» y cada decisión se responde
    const porIdeas = seLee && !leida && !!s.titulo;
    // Leída de a una idea, lo comentado de cada idea va debajo de ella; ya leída (entera, sin ideas), va al pie de la
    // parte con lo demás, con su respuesta y su «Quedó aquí»: antes no se veía en ninguna parte (el titular no vio la
    // respuesta a su comentario sobre una idea de una parte ya leída, 22 de octubre de 2026)
    const deEsta = notas.filter((x) => (x.sobre.seccion ?? '') === s.titulo && !x.sobre.decision && (!x.sobre.fragmento || !porIdeas));
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
        ${deEsta.length ? `<ul class="notas-lista">${deEsta.map((x) => tarjetaNota(x, false, false, false, enParte(ruta, s.titulo))).join('')}</ul>` : ''}
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
  // Plegado, lo leído parecía un documento vacío: el rótulo dice que está ahí y cómo releerlo (nota de voz del titular,
  // 22 de octubre de 2026)
  const nLeidas = yaLeidas.length;
  const ayudaLeido = `${ahora ? '' : 'Ya leíste todo el documento: '}${nLeidas === 1 ? 'la parte que leíste está aquí, plegada. Ábrela para releerla' : `las ${nLeidas} partes que leíste están aquí, plegadas. Ábrelas para releerlas`}.`;
  const partes = `${arriba.map((s) => (ahora && s !== ahora && s.titulo && paraLeer.has(s.titulo) && arriba.indexOf(s) > arriba.indexOf(ahora) ? cerrada(s) : parte(s))).join('')}${nLeidas ? `<details class="ya-leido-doc"${plegable(`leido|${ruta}|${nLeidas}`)}><summary>${icono('estrella')} Ya leído <span class="cifra">${nLeidas}</span> <span class="ayuda-leido">${ayudaLeido}</span></summary>${yaLeidas.map(parte).join('')}</details>` : ''}`;
  return `<div class="docs${listaPlegada() ? ' sin-lista' : ''}">${lista}<article class="lector ${claseLector()}">${ajustesLector(ruta)}${partes}</article>${volverAMisionDe(ruta)}</div>`;
}

/** Los documentos del propio Studio (su método, su diseño): no van entre los del proyecto. */
const esDelStudio = (ruta: string) => ruta.startsWith('docs/metodo/') || (documentos ?? []).some((x) => x.ruta === ruta && x.studio);

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
    ? `<button type="button" class="al-director" data-comentar="${base}|comenta">✉ Agregar a esta decisión</button>`
    : `<button type="button" class="boton-aprobar" data-aprobar="${esc(ruta)}|${esc(parte)}|${esc(nombre)}" title="Quedas de acuerdo con lo que recomienda el director: queda en el Buzón como tu respuesta">${icono('check')}<span>Apruebo lo que recomiendas</span></button>
      <button type="button" class="al-director" data-comentar="${base}|decide" title="Decides otra cosa: lo escribes o lo grabas, y queda como tu respuesta">🎙 Decido otra cosa</button>`;
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
  const html = (md: string) => limpio(marked.parse(md, { async: false }) as string);
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
      li.insertAdjacentHTML('beforeend', ` <button type="button" class="al-director comentar-punto" data-comentar="documento|${esc(ruta)}|${esc(s.titulo)}||${esc(fragmentoDe(puntos[k]))}" title="Comentar este punto al director" aria-label="Comentar este punto al director">✉</button>`),
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
        <div class="marcas-trozo"><span class="estado-decision${respondida ? ' hecha' : ''}">${respondida ? `${icono('check')} Respondida` : 'Falta tu decisión'}</span></div></div>`;
    }
    const hecho = entendida[i];
    const recien = hecho && recienEntendida === `${ruta}|${claveIdea(s.titulo, t.md)}`;
    const cambiada = cambio[i] ? `<p class="idea-cambiada">${icono('estrella')} Cambió desde que leíste esta parte</p>` : '';
    // El seguro: la idea de ahora, la primera vez, deja marcar «Entendido» después de lo que tarda en leerse
    const falta = clase.includes('actual') ? esperaDeIdea(ruta, claveIdea(s.titulo, t.md), t.md, hecho) : 0;
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
        <button type="button" class="al-director comentar-idea" data-comentar="documento|${esc(ruta)}|${esc(s.titulo)}||${esc(fragmento)}" title="Comentar solo esta idea al director">✉ Comentar esta idea al director</button>
        <button type="button" class="entendido${hecho ? ' hecho' : ''}${recien ? ' recien' : ''}${seguro}" data-entendido="${esc(s.titulo)}|${i}" aria-pressed="${hecho}" title="${hecho ? 'Quitar la marca' : 'Márcala al entender esta idea: sigue la siguiente'}">${icono('check')}<span>Entendido</span>${hecho ? '' : '<span class="sigue-e" aria-hidden="true">→</span>'}${falta > 0 ? `<span class="seguro-e" aria-hidden="true">${Math.ceil(falta / 1000)}</span>` : ''}</button>
      </div></div>`;
  };
  const visibles = actual === undefined ? [] : [...(contexto !== undefined ? [contexto] : []), actual];
  const plegadas = ideas.filter((i) => hecha(i) && !visibles.includes(i));
  const entendidas = plegadas.length
    // La clave lleva cuántas hay: al marcar otra idea el plegable vuelve a nacer cerrado, como siempre
    ? `<details class="ideas-entendidas"${plegable(`ideas|${ruta}|${s.titulo}|${plegadas.length}`, actual === undefined)}><summary>${icono('check')} ${plegadas.length === 1 ? '1 idea entendida' : `${plegadas.length} ideas entendidas`}</summary><div class="trozos">${plegadas.flatMap(grupo).map((i) => pintarTrozo(i)).join('')}</div></details>`
    : '';
  const ahora = visibles.map((i) => (i === actual ? grupo(i).map((k) => pintarTrozo(k, k === i ? ` actual${recienEntendida ? ' llega' : ''}` : '')).join('') : pintarTrozo(i, ' contexto'))).join('');
  const cuenta = actual !== undefined && ideas.length > 1 ? `<p class="cuenta-ideas">Idea ${ideas.indexOf(actual) + 1} de ${ideas.length}</p>` : '';
  return `${html(titulo)}${entendidas}<div class="trozos">${ahora}</div>${cuenta}`;
}

/** La idea que se acaba de marcar (documento|clave): su botón lleva el estímulo una sola vez. */
let recienEntendida = '';

/** Cuándo se vio por primera vez cada idea por leer (documento|clave): desde ahí corre su seguro. */
const ideaVista = new Map<string, number>();
/**
 * Los milisegundos que le faltan al «Entendido» de una idea para activarse (0: ya se puede). La primera vez que se lee,
 * lo que tarda en leerse a buen ritmo (lectura.ts › segundosParaLeer); lo ya marcado, o un documento ya leído (al
 * releer), sin espera (nota de voz del titular, 22 de octubre de 2026).
 */
function esperaDeIdea(ruta: string, clave: string, md: string, hecho: boolean): number {
  if (hecho || yaLeido(ruta, d.identidad.rol ?? TITULAR)) return 0;
  const k = `${ruta}|${clave}`;
  if (!ideaVista.has(k)) ideaVista.set(k, Date.now());
  return Math.max(0, ideaVista.get(k)! + segundosParaLeer(md) * 1000 - Date.now());
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
const LETRAS = ['Letra pequeña', 'Letra mediana', 'Letra grande'] as const;
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
const etiquetaEnfoque = (si: boolean) => (si ? 'Salir del enfoque' : 'Modo enfoque');
const tituloEnfoque = (si: boolean, aqui: string) =>
  si ? 'Salir del modo enfoque (Esc)' : aqui === 'documento' ? 'Solo la idea de ahora, sin nada alrededor' : 'Solo tu misión de ahora, sin nada alrededor';
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
    else b.setAttribute('aria-label', niebla ? 'Quitar la niebla de lectura' : 'Niebla de lectura');
    b.setAttribute('aria-pressed', String(niebla));
    b.classList.toggle('activo', niebla);
    b.dataset.etiqueta = niebla ? 'Quitar la niebla de lectura' : 'Niebla de lectura';
  }
  ubicarEnfoque();
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
  if (!salida || !arriba?.offsetWidth || !caja || innerWidth < 760) {
    html.style.removeProperty('--enfoque-arriba');
    return;
  }
  const r = rectaEnPagina(arriba.getBoundingClientRect());
  salida.style.top = `${r.top}px`;
  salida.style.right = `${anchoDeVentana() - r.right}px`;
  const c = rectaEnPagina(caja.getBoundingClientRect());
  const debajo = c.left < r.right + 12 && c.right > r.left - 12;
  html.style.setProperty('--enfoque-arriba', `${debajo ? Math.ceil(r.bottom + 12) : 24}px`);
}
/** Pone o quita el enfoque en lo que se puede enfocar aquí (la tarjeta de la misión ya queda al centro, en su ventana). */
function ponerEnfoque(si: boolean) {
  enfoque = si ? queEnfocar() : '';
  // Un documento ya leído entero no tiene idea que enfocar: se dice, en vez de abrir una ventana vacía
  if (enfoque === 'documento' && nadaPorLeer()) avisar('Ya leíste todo este documento: no queda ninguna idea por enfocar. Lo tienes entero aquí, para releer lo que quieras.', true);
  aplicarEnfoque();
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
  }
});

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
let desdeMision: { id: string; ruta?: string; vista?: Vista } | null = null;
const botonVolverMision = (id: string | undefined) => {
  const m = id ? d.plan.misiones.find((x) => x.id === id) : undefined;
  return m ? `<button type="button" class="volver-flotante" data-volver-mision="${esc(m.id)}" title="${esc(`Vuelve a «${m.titulo}»`)}"><b>← Volver a tu misión</b><small>Ahí marcas o eliges cómo te fue</small></button>` : '';
};
const volverAMisionDe = (ruta: string) => botonVolverMision(desdeMision?.ruta === ruta ? desdeMision.id : undefined);
/** La sección a la que lleva un destino, con los cambios de lugar que hace ir(). */
const vistaDeDestino = (dest: Destino): Vista | undefined =>
  dest.vista === 'proyecto' && dest.ancla === 'p-director' ? 'modelo' : dest.vista === 'diagnostico' ? 'proyecto' : dest.vista;

function ajustesLector(ruta: string) {
  const letra = letraLector();
  return `<div class="ajustes-lector">${leidoDoc(ruta)}
    <div class="opciones-lector" role="group" aria-label="Cómo leer">
      ${controlesEnfoque({
        tema: `${botonTema()}<span class="tamanos-letra">${LETRAS.map((t, i) => `<button type="button" class="tamano-letra t${i}${i === letra ? ' sel' : ''}" data-letra="${i}" aria-pressed="${i === letra}" title="${t}">A</button>`).join('')}</span>`,
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
  return `<button type="button" class="boton-suave boton-tema" data-tema aria-pressed="${oscuro}" title="${oscuro ? 'Pasar el Studio a claro' : 'Pasar el Studio a oscuro'}" aria-label="${oscuro ? 'Tema claro' : 'Tema oscuro'}">${icono(oscuro ? 'sol' : 'luna')}</button>`;
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
  return `<p class="leido-doc">${icono('estrella')}<span>Lee de a una idea: solo la de ahora está a la vista. Márcala con «Entendido», abajo a la derecha (o responde la decisión), y aparece la siguiente; lo entendido queda plegado arriba, para releerlo. Al terminar, la parte baja a «Ya leído» y se abre la siguiente. Con la última, el paso de tu misión queda hecho. Puedes comentar cualquier idea antes de marcarla: comentarla no la marca, y lo comentado queda plegado debajo de ella.</span></p>`;
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
      decir('¡Bien! Una parte menos: se abrió la siguiente.', 'feliz');
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
  for (const x of marcados) if (await completarSiToca(x.id, x.guardado)) return void decir('¡Misión completada! La reviso cuando me pidas la revisión.', 'riendo');
  // Leído en el modo enfoque: sin diálogo de por medio, de vuelta a la tarjeta de tu misión, con el paso de leer ya
  // marcado y el siguiente a la vista (captura del titular, 22 de octubre de 2026: quedaba una ventana vacía)
  if (enEnfoque) {
    decir('¡Leído de punta a punta! Seguimos con tu misión.', 'feliz');
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
  const mia = misionesAbiertas(d.plan, d.estado, d.identidad.rol ?? TITULAR)[0];
  const sigue = mia ? tarjetaDe(mia) : null;
  if (sigue) void ir(sigue);
  else irA('misiones');
}

/**
 * Si el documento abierto ya no tiene nada por leer para ti (todas sus partes por leer están leídas): en el modo
 * enfoque no quedaría idea que mostrar, solo una ventana vacía.
 */
function nadaPorLeer(): boolean {
  if (!doc || !d.identidad.rol) return false;
  const ruta = doc.ruta;
  const paraLeer = new Set(partesDeDocumento(doc.texto));
  const leidas = new Set(leidasDe(ruta));
  const porLeer = secciones(doc.texto).filter((s) => s.titulo && paraLeer.has(s.titulo));
  return porLeer.length > 0 && porLeer.every((s) => leidas.has(s.titulo) && !reabierta(ruta, s));
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
    <div class="botones"><button type="button" data-cerrar autofocus title="Sale del modo enfoque y muestra el documento entero, para releer lo que quieras">Ver el documento entero</button>${sigue ? '<button type="button" class="primario" data-seguir data-siguiente>Ir a mi misión →</button>' : ''}</div>
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
  const html = limpio(marked.parse(md, { async: false }) as string);
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

/**
 * Una misión aprobada, para releerla en «La ruta» (nota de voz del titular, 22 de octubre de 2026: quiso volver a lo que
 * comentó en una misión pasada y no supo dónde): sus pasos con lo que eligió, lo que comentó sobre ella con la respuesta
 * del director, su entrega y el veredicto. Solo se lee: lo que quiera agregar va con «Comentar al director».
 */
function misionPasada(m: Mision) {
  const rev = d.plan.revisiones[m.id];
  const ent = d.estado.entregas[m.id];
  // Una elección con un clic ya se ve en su paso: aquí van las notas con algo dicho
  const notas = d.estado.notas
    .filter((n) => n.sobre.tipo === 'mision' && n.sobre.id === m.id && !(n.sobre.eleccion && !n.audio && (n.texto ?? '').trim() === n.sobre.eleccion))
    .sort((a, b) => a.cuando.localeCompare(b.cuando));
  return `<div class="cuerpo-pasada">
    <p class="porque">${esc(m.porQue)}</p>
    ${m.pasos.length ? listaDePasos(m, false, m.pasos.map((_, i) => i)) : ''}
    <p class="entrega"><b>Entrega:</b> ${esc(m.entrega)}</p>
    ${ent ? `<div class="entregada-m"><span class="como">Entregada por ${esc(ent.quien)} · ${momento(ent.cuando)}</span>${ent.nota ? `<p>${esc(ent.nota)}</p>` : ''}${audioYTexto(ent.audio)}</div>` : ''}
    ${notas.length ? `<h4>Lo que comentaste</h4><ul class="notas-lista">${notas.map((n) => tarjetaNota(n)).join('')}</ul>` : ''}
    ${rev ? `<div class="veredicto ${rev.veredicto}"><b>El director${rev.veredicto === 'aprobada' ? ' la aprobó' : ' pidió rehacerla'}:</b> ${esc(rev.comentario)}</div>` : ''}
    <div class="acciones-m"><button type="button" class="al-director" data-comentar="mision|${esc(m.id)}">✉ Comentar al director</button></div>
  </div>`;
}

/**
 * Una propuesta en «La ruta», con su estado: aceptada no basta, dice si ya está hecha o sigue por hacer. Se abre para leer
 * lo que trae (notas de voz del titular, 22 de octubre de 2026: buscó «¿Dónde quedamos?» por pestañas y no lo encontró,
 * porque iba dentro de «Cada nota con su tipo» y la ruta solo decía su título).
 */
function filaPropuesta(p: Propuesta) {
  const r = d.estado.propuestas[p.id];
  const hecha = d.plan.ejecutadas?.[p.id];
  const por = reemplazos(d.plan).get(p.id);
  const chip = !r ? '<span class="chip espera">Por decidir</span>'
    : r.estado !== 'aceptada' ? `<span class="chip">${NOMBRE_RESPUESTA[r.estado]}</span>`
    : hecha ? '<span class="chip">Aceptada · hecha</span>'
    : por !== undefined ? chipReemplazado(por)
    : '<span class="chip espera">Aceptada · por hacer</span>';
  // Lo cerrado lleva su fecha y hora: cuando se hizo, o cuando se decidió si no se aceptó
  const cuando = cierreDePropuesta(p);
  return `<li><details class="mision-pasada" data-ancla="propuesta-${esc(p.id)}"${plegable(`propuesta-ruta|${p.id}`)}><summary>${esc(p.titulo)} ${chip}${cuando ? ` <span class="como cuando-hecha">${momento(cuando)}</span>` : ''}</summary><div class="cuerpo-pasada"><p>${esc(p.propuesta)}</p>${hecha ? `<p class="como"><b>Hecha:</b> ${esc(hecha.nota)}</p>` : ''}</div></details></li>`;
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

/**
 * El estado de lo que otro pedido o propuesta reemplazó (`reemplazos`, pd_lo_vigente): cerrado sin hacerse, con el nombre
 * de lo que lo reemplazó al pasar el ratón.
 */
function chipReemplazado(por: string) {
  return `<span class="chip" title="${esc(`Lo reemplazó: ${nombreDeLoQueEspera(d.plan, por)}`)}">Reemplazado</span>`;
}

/** Las propuestas de una lista, lo por hacer primero y en su orden, y lo hecho o decidido aparte, lo más nuevo arriba. */
function listaDePropuestas(lista: Propuesta[]) {
  const fuera = reemplazos(d.plan);
  const { porHacer, hechas } = separarHechas(lista, (p) => !!d.plan.ejecutadas?.[p.id] || fuera.has(p.id) || (!!d.estado.propuestas[p.id] && d.estado.propuestas[p.id].estado !== 'aceptada'), cierreDePropuesta);
  return partesPorHacerYHechas(porHacer.map(filaPropuesta), hechas.map(filaPropuesta), 'Por decidir y por hacer', 'Hechas y decididas');
}

/**
 * Lo por hacer y lo hecho de una lista de «La ruta», cada uno en su `<ul>` y con su subtítulo solo si hay de los dos
 * (notas de voz del titular, 26 de octubre de 2026): lo por hacer hacia adelante, lo hecho de lo más nuevo a lo más viejo.
 */
function partesPorHacerYHechas(porHacer: string[], hechas: string[], tituloPorHacer: string, tituloHechas: string) {
  const ambas = porHacer.length > 0 && hechas.length > 0;
  return `${porHacer.length ? `${ambas ? `<h4 class="sub-hechas">${tituloPorHacer}</h4>` : ''}<ul class="adelantado">${porHacer.join('')}</ul>` : ''}${hechas.length ? `${ambas ? `<h4 class="sub-hechas">${tituloHechas}</h4>` : ''}<ul class="adelantado">${hechas.join('')}</ul>` : ''}`;
}

/**
 * El estado de una misión prevista de la fase, calculado de lo que nombra (origenDePrevista, «El plan liviano», punto 3):
 * «Hecho», «Por hacer» o cuántos de sus pedidos, propuestas y misiones están hechos. Lo que no nombra nada, sin chip.
 */
function chipDePrevista(texto: string): string {
  const { ids, hechos } = origenDePrevista(texto, d.plan, d.estado);
  if (!ids.length) return '';
  if (hechos.length === ids.length) return ' <span class="chip">Hecho</span>';
  return hechos.length ? ` <span class="chip espera">${hechos.length} de ${ids.length} hechos</span>` : ' <span class="chip espera">Por hacer</span>';
}

function vistaRuta() {
  const f = d.plan.fases.find((x) => x.id === faseVista) ?? faseActual(d.plan, d.estado);
  const s = situacion(d.plan, d.estado, f.id);
  const porNivel = (n: Nivel) => d.plan.frentes.filter((x) => trabajoDe(f, x.id).nivel === n);
  const adelantado = d.plan.adelantado.filter((a) => a.fase === f.id);
  // De una fase futura solo se dice cuántas misiones y propuestas trae: se abren al llegar. Lo que ya aprobaste para ella
  // sí se ve, con su estado: está decidido y programado ahí, como lo pedido (notas de voz del titular, 22 de octubre de 2026)
  const abierta = faseAbierta(f.id);
  const propuestas = abierta ? d.plan.propuestas.filter((p) => p.fase === f.id) : [];
  const misiones = abierta ? d.plan.misiones.filter((m) => m.fase === f.id) : [];
  const aprobadas = abierta ? [] : aprobadasDeFase(d.plan, d.estado, f.id);
  const cerradas = abierta ? 0 : d.plan.misiones.filter((m) => m.fase === f.id).length + d.plan.propuestas.filter((p) => p.fase === f.id).length - aprobadas.length;
  // Lo aceptado en una fase ya cruzada y sin hacer se ve en la fase en curso: no se pierde de vista (nota de voz del
  // titular, 22 de octubre de 2026)
  const heredadas = s === 'actual' ? aprobadoAntesDelCierre(d.plan, d.estado, f.id).filter((p) => p.fase !== f.id) : [];
  // Lo pedido en las notas, con su estado: lo de esta fase y, en la fase en curso, lo que quedó sin hacer de antes. Se ve
  // también en una fase futura: es lo que pediste, programado ahí, no trabajo que se decida antes de tiempo (notas de voz
  // del titular, 22 de octubre de 2026: «tienen que quedar registradas en la ruta futura»)
  const pedidos = [...(s === 'actual' ? pedidosAntesDelCierre(d.plan, f.id).filter((p) => p.fase !== f.id) : []), ...(d.plan.pedidos ?? []).filter((p) => p.fase === f.id)];
  // Lo reemplazado ya no es trabajo: se ve cerrado, con lo que lo reemplazó (pd_lo_vigente)
  const reemplazado = reemplazos(d.plan);
  const porHacer = pedidos.filter((p) => !p.hecho && !reemplazado.has(p.id)).length;
  // Lo de después del lanzamiento, al final de la última fase: a la vista y con su estado, sin detener ninguna puerta
  // (decisión del titular, 22 de octubre de 2026)
  const despues = d.plan.fases.at(-1)?.id === f.id ? (d.plan.pedidos ?? []).filter((p) => p.fase === DESPUES) : [];
  const filaPedido = (p: Pedido) => `<li data-ancla="pedido-${esc(p.id)}">${esc(p.texto)} ${p.hecho ? `<span class="chip" title="${esc(p.hecho.nota)}">Hecho</span> <span class="como cuando-hecha">${momento(p.hecho.cuando)}</span>` : reemplazado.has(p.id) ? chipReemplazado(reemplazado.get(p.id)!) : '<span class="chip espera">Por hacer</span>'}</li>`;
  // Lo por hacer hacia adelante y lo hecho aparte, lo más nuevo arriba, con la fecha y la hora en que se hizo
  const listaDePedidos = (lista: Pedido[]) => {
    const { porHacer: pendientes, hechas } = separarHechas(lista, (p) => !!p.hecho || reemplazado.has(p.id), (p) => p.hecho?.cuando);
    return partesPorHacerYHechas(pendientes.map(filaPedido), hechas.map(filaPedido), 'Por hacer', 'Hechos');
  };
  // Cada fase se parte en pestañas de ancho completo, las mismas en todas, cada una con lo que tenga (pd_ruta_pestanas); un
  // botón que lleva a un pedido, una propuesta o una misión abre antes la pestaña que lo tiene
  const cuentas = { misiones: misiones.length, pedidos: pedidos.length + despues.length, propuestas: propuestas.length + aprobadas.length + heredadas.length };
  const visibles = pestanasRutaVisibles(cuentas);
  const elegida = pestanaRutaElegida(pestanaDeFase.get(f.id), anclaPendiente, visibles);
  pestanaDeFase.set(f.id, elegida);
  // Solo se pinta la pestaña elegida: lo demás no está en la página
  const cuerpos: Record<PestanaRuta, () => string> = {
    fase: () => `<div class="panel-d">
        <h2>Fase ${numeroFase(f)}: ${esc(f.nombre)} <span class="chip">${NOMBRE_SITUACION[s]}</span></h2>
        <div class="como">${esc(f.etapa)} · ${esc(f.duracion)}</div>
        <p class="texto-fase">${esc(f.meta)}</p>
        <p class="por-que"><b>Por qué va aquí.</b> ${esc(f.porQue)}</p>
        <h3>Para cruzar la puerta, todo esto al 100 %</h3>
        <p class="como">Los evalúa el director con lo que entregan las misiones, o se miden solos. ${esc(nombreTitular())} tiene la última palabra en cada uno.</p>
        <ul class="criterios">${f.criterios.map((c) => filaCriterio(c, f)).join('')}</ul>
        ${pintarPuerta(f)}
      </div>
      ${cerradas ? `<div class="panel-d"><h3>Bajo niebla</h3><p class="como">${cerradas} misiones y propuestas esperan esta fase. El director las abre cuando la ruta llegue aquí.</p></div>` : ''}
      <div class="panel-d" data-ancla="r-plan"><h3>El plan de la fase</h3><ol class="misiones">${f.misiones.map((m) => `<li>${esc(m)}${chipDePrevista(m)}</li>`).join('')}</ol></div>
      <div class="panel-d"><h3>Qué hace cada frente</h3>
        <ul class="frentes-fase">${NIVELES.flatMap((n) => porNivel(n).map((x) => `<li>${chipNivel(n)}<b>${esc(x.nombre)}</b><span class="t">${esc(trabajoDe(f, x.id).que)}</span></li>`)).join('')}</ul>
      </div>
      ${adelantado.length ? `<div class="panel-d"><h3>Ya adelantado para esta fase</h3><ul class="adelantado">${adelantado.map((a) => `<li><b>${esc(nombreFrente(a.frente))}:</b> ${esc(a.texto)}</li>`).join('')}</ul></div>` : ''}
      ${d.plan.fases.length <= 1 ? '<div class="panel-d"><h3>El resto de la ruta</h3><p class="como">Lo traza el director cuando la meta esté fijada: las fases para llegar a él, cada una con su puerta y sus criterios, lo que hace cada frente en cada una y la primera misión de cada persona.</p></div>' : ''}`,
    misiones: () => `${misiones.length ? `<div class="panel-d" data-ancla="r-misiones"><h3>Las misiones de esta fase</h3>${misiones.some((m) => estadoMision(m, d.plan, d.estado) === 'aprobada') ? '<p class="como">Las aprobadas se abren para releerlas: sus pasos, lo que elegiste, lo que comentaste con la respuesta del director y su veredicto.</p>' : ''}${personasEquipo().map((p) => {
        const ms = misiones.filter((m) => m.para === p);
        // Lo por hacer, en el orden del plan; lo aprobado aparte, lo más nuevo arriba, con la fecha y la hora en que se aprobó
        const { porHacer: pendientes, hechas } = separarHechas(ms, (m) => estadoMision(m, d.plan, d.estado) === 'aprobada', (m) => d.plan.revisiones[m.id]?.cuando);
        const fila = (m: Mision) => {
          const e = estadoMision(m, d.plan, d.estado);
          const chip = `<span class="chip estado-m ${e}">${NOMBRE_ESTADO_MISION[e]}</span>`;
          const cuando = d.plan.revisiones[m.id]?.cuando;
          return e === 'aprobada'
            ? `<li><details class="mision-pasada" data-ancla="pasada-${esc(m.id)}"${plegable(`pasada|${m.id}`)}><summary>${esc(m.titulo)} ${chip}${cuando ? ` <span class="como cuando-hecha">${momento(cuando)}</span>` : ''}</summary>${misionPasada(m)}</details></li>`
            : `<li>${esc(m.titulo)} ${chip}</li>`;
        };
        return ms.length ? `<p class="como"><b>${esc(nombrePersona(p))}</b></p>${partesPorHacerYHechas(pendientes.map(fila), hechas.map(fila), 'Por hacer', 'Aprobadas')}` : '';
      }).join('')}</div>` : ''}`,
    pedidos: () => `${pedidos.length ? `<div class="panel-d" data-ancla="r-pedidos"><h3>Lo pedido para esta fase <span class="chip${porHacer ? ' espera' : ''}">${porHacer ? `${porHacer} por hacer de ${pedidos.length}` : 'Todo hecho'}</span></h3><p class="como">${abierta ? 'Cada cosa pedida en las notas que el director se comprometió a hacer, con su estado. La misión que cierra la fase no aparece mientras quede una por hacer.' : 'Lo que pediste en tus notas y el director programó para esta fase: queda aquí, con su estado, y se hace cuando la ruta llegue.'}</p>${listaDePedidos(pedidos)}</div>` : ''}
      ${despues.length ? `<div class="panel-d" data-ancla="r-despues"><h3>Después del lanzamiento</h3><p class="como">Lo que pediste para cuando la meta esté cumplida, con su estado: queda a la vista y no detiene ninguna puerta.</p>${listaDePedidos(despues)}</div>` : ''}`,
    propuestas: () => `${aprobadas.length ? `<div class="panel-d" data-ancla="r-aprobadas"><h3>Lo que aprobaste para esta fase</h3><p class="como">Las propuestas que aceptaste y el director programó aquí, con su estado: se hacen cuando la ruta llegue.</p>${listaDePropuestas(aprobadas)}</div>` : ''}
      ${propuestas.length ? `<div class="panel-d"><h3>Propuestas que se deciden aquí</h3>${listaDePropuestas(propuestas)}</div>` : ''}
      ${heredadas.length ? `<div class="panel-d"><h3>Aprobadas en fases anteriores, por hacer</h3><p class="como">Las aceptaste en una fase que ya cruzaste y siguen sin hacerse: son trabajo de esta fase.</p>${listaDePropuestas(heredadas)}</div>` : ''}`,
  };
  // Cada cuenta va en su pestaña («Misiones (12)»); la de «La fase» no cuenta nada: siempre está
  const barra = `<div class="pestanas-stl pestanas-ruta" role="tablist" aria-label="Fase ${numeroFase(f)}: ${esc(f.nombre)}">${visibles.map((id) => {
    const sel = id === elegida;
    const n = id === 'fase' ? null : cuentas[id];
    return `<button type="button" role="tab" id="pestana-ruta-${id}" class="pestana-stl${sel ? ' sel' : ''}" data-pestana-ruta="${id}" data-fase-de-pestana="${esc(f.id)}" aria-selected="${sel}"${sel ? ` aria-controls="panel-ruta-${id}"` : ''} tabindex="${sel ? 0 : -1}">${esc(tituloPestanaRuta(id))}${n === null ? '' : ` (${n})`}</button>`;
  }).join('')}</div>`;
  return `${rutaHTML()}${tableroFase()}${barra}
  <div role="tabpanel" id="panel-ruta-${elegida}" aria-labelledby="pestana-ruta-${elegida}" class="panel-pestana-ruta p-${elegida}">${cuerpos[elegida]()}</div>`;
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
  const repo = `<section class="panel-d" data-ancla="p-repositorio">
        <h3>Dónde está</h3>
        ${info ? `<p class="bien-repo">✓ ${esc(info.ruta)}</p>
          <p class="como">Su memoria (la ruta, las notas, los documentos del director) vive en ese repositorio, en la rama <code>stl</code>, abierta en la carpeta <code>.stl</code>. Sube a su nube solo si tú lo pides.</p>
          <details class="detalles-repo"${plegable('detalles-repo')}><summary>Detalles del repositorio</summary>
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
      </section>`;
  const contexto = `<section class="panel-d" data-ancla="p-contexto">
        <h3>Qué es el proyecto y qué buscas <span class="chip ${esNuevo() ? 'apoyo' : 'foco'}">${esNuevo() ? 'Proyecto nuevo' : 'Proyecto existente'}</span></h3>
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
          <label class="ancho">${esNuevo() ? 'Qué quieres lograr, en tus palabras' : 'Tu meta'}<textarea name="metaInicial" rows="3"${soloLectura} placeholder="Ej.: que 20 talleres paguen por ella antes de fin de año, sin que se caiga">${esc(meta)}</textarea>${marca(!p.metaInicial && !!det?.meta, 'Meta sugerida por el director, según lo que detectó: complétala o reemplázala con la tuya. La fijas en «La meta».')}</label>`;
          })()}
          ${esNuevo() ? `<label class="ancho">¿Cuándo se considera completo?<textarea name="terminado" rows="2"${soloLectura} placeholder="Ej.: cuando 20 talleres paguen la suscripción dos meses seguidos">${esc(p.terminado ?? '')}</textarea></label>` : ''}
          <details class="ancho mas-datos"${plegable('mas-datos')}><summary>Más datos del repositorio (opcional)</summary>
            <div class="form-proyecto">
              <label>Dirección en la web<input type="text" name="url" value="${esc(p.repositorio.url)}"${soloLectura} placeholder="https://github.com/…" /></label>
              <label>Rama principal<input type="text" name="rama" value="${esc(p.repositorio.rama || info?.rama || '')}"${soloLectura} placeholder="main" /></label>
            </div>
          </details>
          ${t ? '<div class="botones"><button type="submit" class="primario">Guardar</button></div>' : ''}
        </form>
      </section>`;
  const meta = `<section class="panel-d" data-ancla="p-objetivo">
        <h3>La meta</h3>
        ${o ? `<div class="objetivo-firmado">
            <span class="etiqueta">Meta fijada · ${fecha(o.firmado.fecha)} · ${esc(o.firmado.quien)}</span>
            <p class="obj-texto">${esc(o.texto)}</p>
            <p><b>Cómo sabremos que se cumplió:</b> ${esc(o.exito)}</p>
            ${o.horizonte ? `<p><b>Horizonte:</b> ${esc(o.horizonte)}</p>` : ''}
            <div class="acciones-p">${t ? '<button type="button" data-replantear-objetivo>Replantear la meta</button>' : ''}<button type="button" class="al-director" data-comentar="objetivo|">✉ Comentar al director</button></div>
          </div>`
        : `<p class="como">Una meta clara dice <b>qué se logra</b> y <b>cómo se sabe que se logró</b> (un número o un hecho que se pueda comprobar). ${d.plan.diagnostico.fecha ? 'Elige uno de los que propone el director, mézclalos o escribe el tuyo.' : 'El director recomienda fijarla después del diagnóstico: así se mide contra lo que de verdad hay.'}</p>
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
        ${(p.objetivosAnteriores ?? []).length ? `<details class="detalles-repo metas-anteriores"${plegable('metas-anteriores')}><summary>Metas anteriores <span class="cifra">${p.objetivosAnteriores!.length}</span></summary><ul class="adelantado">${p.objetivosAnteriores!.map((x) => `<li>«${esc(x.texto)}» <small>(fijada el ${fecha(x.firmado.fecha)}, replanteada el ${fecha(x.reabierto.fecha)}${x.reabierto.nota ? `: ${esc(x.reabierto.nota)}` : ''})</small></li>`).join('')}</ul></details>` : ''}
      </section>`;
  const equipo = [...d.plan.boletin].reverse().find((x) => x.para === 'equipo');
  // Con la meta fijada, va arriba: es contra lo que se mide todo. Antes, el orden del arranque: dónde está, qué es, el
  // diagnóstico del director y la meta (decidido en «Un Studio más simple»: el diagnóstico vive en Proyecto, plegado)
  const orden = o ? [meta, contexto, seccionDiagnostico(), repo] : [repo, contexto, seccionDiagnostico(), meta];
  return `<p class="intro">${o ? 'Tu meta, qué es el proyecto, lo que encontró el director al diagnosticarlo y dónde está.' : 'Lo que el director necesita para trabajar: dónde está el proyecto, qué es y, después de su diagnóstico, a dónde quieres llegar.'} En el repositorio solo escribe su memoria (la rama <code>stl</code>) y lo que tú apruebes.</p>
  <div class="dos-columnas">
    <div>
      ${orden.join('\n      ')}
    </div>
    <div>
      <section class="panel-d" data-ancla="p-equipo">
        <h3>El equipo</h3>
        ${equipo ? `<div class="boletin-equipo"><p class="etiqueta-boletin">Boletín del equipo · ${fecha(equipo.fecha)}</p><div class="notas-boletin">${Object.entries(equipo.notas).map(([k, v]) => `<span><span class="nota-letra ${v}">${v}</span>${esc(k)}</span>`).join('')}</div><p>${esc(equipo.comentario)}</p></div>` : ''}
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

/**
 * Los modelos que se pueden elegir para el director, con qué esperar de cada uno: por versión, y los alias de Claude
 * Code, que siguen solos a la más nueva de cada familia. Claude Code no tiene cómo listar desde fuera los que acepta
 * cada plan: si la cuenta no tiene el elegido, la revisión lo dice y el Studio vuelve al de la cuenta.
 */
const MODELOS: { id: string; nombre: string; que: string; grupo?: string }[] = [
  { id: '', nombre: 'El de tu cuenta', que: 'Sin un modelo elegido en Claude Code: el que trae tu cuenta por defecto.' },
  { id: 'claude-opus-5-5', nombre: 'Opus 5.5', grupo: 'Por versión', que: 'El más capaz para dirigir y escribir código, y el que más gasta.' },
  { id: 'claude-opus-5-5[1m]', nombre: 'Opus 5.5, contexto de 1 M', grupo: 'Por versión', que: 'Opus 5.5 con un contexto de un millón de tokens: aguanta revisiones muy largas sin resumirse. Gasta como Opus.' },
  { id: 'claude-sonnet-5-5', nombre: 'Sonnet 5.5', grupo: 'Por versión', que: 'Buen equilibrio: dirige bien y gasta bastante menos que Opus.' },
  { id: 'claude-haiku-5-5', nombre: 'Haiku 5.5', grupo: 'Por versión', que: 'El más rápido y el que menos gasta. Puede quedarse corto en una revisión larga o con código.' },
  { id: 'claude-fable-5-1', nombre: 'Fable 5.1', grupo: 'Por versión', que: 'La familia Fable de Claude. Solo si tu plan la incluye.' },
  { id: 'opus', nombre: 'Opus, el más nuevo', grupo: 'Siempre el más nuevo', que: 'El Opus más nuevo que tenga Claude Code: cambia solo cuando sale una versión.' },
  { id: 'sonnet', nombre: 'Sonnet, el más nuevo', grupo: 'Siempre el más nuevo', que: 'El Sonnet más nuevo que tenga Claude Code: cambia solo cuando sale una versión.' },
  { id: 'haiku', nombre: 'Haiku, el más nuevo', grupo: 'Siempre el más nuevo', que: 'El Haiku más nuevo que tenga Claude Code: cambia solo cuando sale una versión.' },
];

/**
 * Lo que dice de Anthropic la tabla de modelos del Studio sobre el elegido, con su fuente y su fecha, y su aviso si no
 * está en ella o si la tabla quedó vieja (pr_modelos_por_tarea, punto 1; opción B, elegida el 28 de octubre de 2026).
 */
function lineaInventario(actual: string) {
  const m = modeloDelInventario(actual);
  const aviso = avisoDelInventario(actual, new Date());
  return `${m ? `<p class="como inventario-modelo" title="${esc(`Fuente: ${INVENTARIO.fuente}.`)}">Según Anthropic (la tabla del Studio, del ${esc(INVENTARIO.fecha)}): ${esc(fichaDe(m))}</p>` : ''}${aviso ? `<p class="aviso-modelo">${esc(aviso)}</p>` : ''}`;
}

/** Cuánto piensa el director antes de responder (`claude --effort`). */
const ESFUERZOS: { id: string; nombre: string; que: string }[] = [
  { id: '', nombre: 'El de tu cuenta', que: 'El que trae el modelo por defecto (en Opus, Sonnet y Haiku 5.5, medio).' },
  { id: 'low', nombre: 'Bajo', que: 'Piensa poco: más rápido y gasta menos, para revisiones cortas.' },
  { id: 'medium', nombre: 'Medio', que: 'Un término medio.' },
  { id: 'high', nombre: 'Alto', que: 'Piensa más en cada decisión: tarda y gasta más.' },
  { id: 'xhigh', nombre: 'Muy alto', que: 'Para revisiones con mucho código o decisiones difíciles.' },
  { id: 'max', nombre: 'Máximo', que: 'Lo más que puede pensar: lo más lento y lo que más gasta.' },
];

/** Las opciones de un selector, con sus grupos (optgroup) en el orden en que aparecen. */
function opcionesDe(lista: { id: string; nombre: string; grupo?: string }[], actual: string) {
  const op = (m: { id: string; nombre: string }) => `<option value="${esc(m.id)}"${m.id === actual ? ' selected' : ''}>${esc(m.nombre)}</option>`;
  const grupos = [...new Set(lista.map((m) => m.grupo ?? ''))];
  return grupos.map((g) => (g ? `<optgroup label="${esc(g)}">${lista.filter((m) => m.grupo === g).map(op).join('')}</optgroup>` : lista.filter((m) => !m.grupo).map(op).join(''))).join('');
}

const miles = (n: number) => (n >= 1e6 ? `${(n / 1e6).toLocaleString('es', { maximumFractionDigits: 1 })} M` : n >= 1e3 ? `${Math.round(n / 1e3).toLocaleString('es')} mil` : String(n));
const dolares = (n: number) => `US$ ${n.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const NOMBRE_LANZAMIENTO = { revision: 'Revisión', aclaracion: '«No lo entiendo»', urgencia: 'Urgencia' } as const;

/**
 * Desde cuándo rige un cambio de modelo o de esfuerzo: el Studio lo escribe en la configuración de Claude Code y lo pasa
 * al lanzar al director cada vez, así que no hay que reiniciar nada (duda del titular, 21 de octubre de 2026).
 */
const CUANDO_RIGE = 'Ya quedó: el director lo usa desde lo próximo que le pidas (la revisión, una urgencia o «No lo entiendo»), sin reiniciar nada; si está revisando ahora, termina con el de antes. También tus sesiones nuevas de Claude Code.';

/** Lo que el director necesita para trabajar con ultracode, dicho en el diálogo que pide el permiso. */
const PERMISO_ULTRACODE =
  'El director que lanza el Studio trabaja hoy sin ultracode porque le falta un permiso: correr flujos de varios agentes (la herramienta Workflow de Claude Code).\n\n' +
  'Si se lo das, desde su próximo lanzamiento (la próxima revisión, urgencia o «No lo entiendo») planea esos flujos para las tareas de peso, como tus sesiones. Cada agente del flujo tiene sus mismos límites: no sube, no despliega ni borra nada.\n\n' +
  'Lo que cambia es el gasto: un flujo puede gastar varias veces lo de una revisión, y lo verás en «Lo que gastó el director». Puedes quitárselo aquí mismo cuando quieras.';

/** El permiso del director para seguir a ultracode: si lo tiene, si le falta (con «Darle el permiso») y cómo quitarlo. */
function permisoUltracode() {
  if (d.ultracodeDirector)
    return `<p class="como">El director que lanza el Studio ${d.ultracode ? 'también trabaja con ultracode' : 'trabajará con ultracode cuando lo enciendas'}: le diste el permiso de correr flujos de varios agentes.</p>
        <button type="button" class="boton-suave" data-permiso-ultracode="no">Quitarle el permiso al director</button>`;
  if (d.ultracode)
    return `<p class="como">El director que lanza el Studio trabaja sin ultracode: le falta el permiso de correr flujos de varios agentes.</p>
        <button type="button" class="boton-suave" data-permiso-ultracode="si">Darle el permiso al director</button>`;
  return '<p class="como">El director que lanza el Studio trabaja sin ultracode, salvo que le des ese permiso: al encenderlo, el Studio te lo pide.</p>';
}

/**
 * Cómo pide permisos el director, con el modo de hoy (propuesta aceptada «Los permisos, al momento», lo primero que no
 * da poderes nuevos): qué puede, qué pasa cuando le falta algo y lo que nunca hace, en ningún modo. Lo que nunca es lo
 * que niega su lanzador, como regla explícita (estudio/servidor/revisor.ts › negado). Con la elección entre los dos modos
 * (pr_permisos_al_momento, pieza 4): solo lo autorizado, o «Me pregunta en el Studio».
 */
const MODOS_DE_PERMISOS: Record<ModoPermisos, { nombre: string; que: string }> = {
  autorizado: {
    nombre: 'Solo lo autorizado',
    que: 'Es el modo de siempre, igual en todos tus proyectos: lo que le falta al director se le niega sin preguntarte, y aparece aquí abajo, en «Lo que se le negó al director», para que lo autorices con una casilla.',
  },
  pregunta: {
    nombre: 'Me pregunta en el Studio',
    que: 'Cuando al director le falte un permiso durante una revisión, una urgencia o un «No lo entiendo», el Studio te lo pregunta en un diálogo, con lo que pide y lo que puede pasar. Tienes dos minutos para elegir «Solo esta vez», «Permitir siempre» (la regla general de ese tipo de acción, solo para ese proyecto), «Permitir todo en esta revisión» (deja pasar todo lo que pida el director hasta que termine esa revisión, salvo lo que nunca hace, y no guarda ninguna regla) o «No lo autorizo». Si no respondes, el director sigue sin ese permiso y queda pendiente aquí abajo; si no respondes a la primera pregunta de una revisión, no te pregunta más en ella. Lo que nunca hace, se le niega sin preguntarte. Para poder preguntarte, el director corre en el modo que pregunta de Claude Code, con un gancho del Studio: por eso tus hooks y tu línea de estado de ~/.claude no corren en él, y tus skills y comandos de usuario no se cargan, como cuando eliges no cargar tus ajustes.',
  },
  automatico: {
    nombre: 'Automático, vigilado',
    que: 'Lo que le falte al director lo decide solo Claude Code, con su modo automático, sin preguntarte ni detener la revisión. El Studio lo vigila: cada cosa que Claude Code apruebe sola es una línea en «Lo que va haciendo el director», sin sonido ni diálogo, y al terminar la revisión queda aquí abajo, en «Lo que ya autorizaste», marcada «Lo aprobó Claude Code», como el permiso de ese tipo de acción y solo para ese proyecto: lo quitas cuando quieras. Lo que nunca hace se le sigue negando, también en este modo.',
  },
};

/** Un modo de los tres, de lo que trae el servidor o un botón; cualquier otra cosa es «Solo lo autorizado». */
const modoDe = (x: unknown): ModoPermisos => (x === 'pregunta' || x === 'automatico' ? x : 'autorizado');

function seccionPermisos() {
  const modo: ModoPermisos = d.modoPermisos ?? 'autorizado';
  // «Automático, vigilado», apagado con lo que le falta si el Claude Code de este computador no lo trae; si ya estaba
  // elegido, el lanzador vuelve a lo autorizado, y aquí se dice
  const sinAutomatico = d.automatico?.admite === false;
  const porque = esc(d.automatico?.porque ?? '');
  const eleccion = (Object.keys(MODOS_DE_PERMISOS) as ModoPermisos[]).map((m) => `<button type="button" data-modo-permisos="${m}" aria-pressed="${m === modo}"${m === 'automatico' && sinAutomatico && modo !== 'automatico' ? ` disabled title="${porque}"` : ''}>${esc(MODOS_DE_PERMISOS[m].nombre)}</button>`).join('');
  return `<section class="panel-d" data-ancla="m-permisos">
        <h3>Cómo pide permisos el director</h3>
        <div class="filtro-propuestas" role="group" aria-label="Cómo pide permisos el director">${eleccion}</div>
        ${!sinAutomatico ? '' : modo === 'automatico' ? `<p class="como"><b>«Automático, vigilado» no está disponible en este computador:</b> ${porque} Mientras tanto, el director trabaja con «Solo lo autorizado».</p>` : `<p class="como"><b>«Automático, vigilado» está apagado:</b> ${porque}</p>`}
        <p class="modo-permisos">${icono('candado')}<span><b>${esc(MODOS_DE_PERMISOS[modo].nombre)}.</b> ${esc(MODOS_DE_PERMISOS[modo].que)}</span></p>
        <p class="como">Lo que elijas rige desde el próximo lanzamiento del director (la revisión, una urgencia o «No lo entiendo»); si está revisando ahora, termina como empezó.</p>
        <p class="como"><button type="button" data-probar-permiso="1">Probar el diálogo</button> Te llama con un permiso de prueba, como lo haría el director en una revisión, para ver y probar cada botón cuando quieras, sin pedir una revisión ni gastar nada de tu plan; lo que elijas no se guarda.</p>
        <p class="como">El director que lanza el Studio trabaja con una lista fija de lo que puede hacer: leer el Studio y el repositorio del proyecto, correr sus herramientas y las pruebas, y escribir en ese repositorio y en su memoria, solo para lo que aprobaste o pediste en el Studio, con commits locales. Lo que no está en la lista no lo rodea: hace lo demás. Lo que se le negó, o lo que no respondiste, aparece justo aquí abajo, para que se lo autorices con una casilla; con tu «Autorizo», lo tiene desde su próximo lanzamiento.</p>
        ${seccionNegados()}
        <p class="como"><b>Lo que nunca hace, en ningún modo:</b> reescribir la historia de git, también la ya subida (forzar una subida o borrar una rama del remoto), leer un archivo .env o las credenciales de Claude Code, cambiar sus propios permisos, tu configuración del Studio, sus registros o la carpeta .git, ni borrar sin tus dos pasos (la aprobación y «Confirmo», con lo que se borra a la vista). Subir, bajar y publicar (git push, git pull, npm publish, una versión en GitHub) son permisos como los demás: los das en «Permisos», con su casilla y su alcance, y con ese permiso subir es algo que pediste; sin él, el director lo deja listo y te lo dice. Al revisar el mismo Studio, la animación de su página pública la sube con su herramienta cuando la cambia.</p>
      </section>`;
}

/**
 * Lo que se le negó al director, para autorizarlo con una casilla (nota de voz del titular nmvotdn3ftit, 26 de octubre de
 * 2026: «No quiero volver a que el director falle por permisos»; pedido pd_panel_permisos). Lo trae el servidor aparte
 * (/permisos: lee los registros de las revisiones, que pesan), y se vuelve a pedir a los 30 segundos. Lo marcado y el
 * alcance elegido se recuerdan aquí, para que un repintado no los borre.
 */
let panelPermisos: { pendientes: PermisoNegado[]; autorizados: PermisoAutorizado[]; error?: string } | null = null;
let permisosLeidos = 0;
let leyendoPermisos = false;
const permisosMarcados = new Set<string>();
const alcanceElegido = new Map<string, PermisoAutorizado['alcance']>();
// La clave viaja en un atributo del HTML: sin caracteres de control, que el navegador cambia al leerlo (con un \u0000,
// la casilla marcada nunca coincidía y «Autorizo los marcados» no guardaba nada). El id de un proyecto no lleva espacios
const clavePermiso = (n: { proyecto: string; regla: string | null }) => `${n.proyecto} ${n.regla ?? ''}`;
const fechaHora = (iso: string) => new Date(iso).toLocaleString('es', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
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
    : { pendientes: [], autorizados: [], error: x?.error ?? 'el Studio no respondió' };
  if (vista === 'modelo') pintar();
  // Lo negado en vivo, con su «Autorizo» (negadosEnVivoHtml)
  else if (progresoAbierto) pintarSegundoPlano();
}

function seccionNegados() {
  if ((!panelPermisos || Date.now() - permisosLeidos > 30_000) && !leyendoPermisos) void leerPermisos();
  if (!panelPermisos) return '<div class="negados-panel"><h4>Lo que se le negó al director</h4><p class="como">Buscando en los registros de sus revisiones<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></p></div>';
  if (panelPermisos.error) return `<div class="negados-panel"><h4>Lo que se le negó al director</h4><p class="como">No pude leer lo que se le negó (${esc(panelPermisos.error)}). Vuelve a abrir esta pestaña en un momento.</p></div>`;
  const { pendientes, autorizados } = panelPermisos;
  const autorizables = pendientes.filter((n) => n.regla && !n.nunca);
  const item = (n: PermisoNegado) => {
    const clave = clavePermiso(n);
    const alcance = alcanceElegido.get(clave) ?? 'proyecto';
    const donde = `En «${esc(nombreDeProyecto(n.proyecto))}», ${n.veces === 1 ? 'en la revisión' : `en ${n.veces} revisiones; la última,`} del ${esc(fechaHora(n.cuando))}.`;
    const cabeza = n.nunca
      ? `<span class="casilla-d">${icono('candado')} <span>${esc(n.que)}</span> <span class="consejo-ajuste">Nunca, por la regla del Studio</span></span>`
      : n.regla
        ? `<label class="casilla-d"><input type="checkbox" data-permiso-negado="${esc(clave)}"${permisosMarcados.has(clave) ? ' checked' : ''}> <span>${esc(n.que)}</span></label>`
        : `<span class="casilla-d">${icono('candado')} <span>${esc(n.que)}</span> <span class="consejo-ajuste">No se autoriza tal cual</span></span>`;
    const detalle = n.nunca
      ? `<p class="como"><b>Por qué no:</b> ${esc(n.nunca.porque)} <b>En su lugar:</b> ${esc(n.nunca.enSuLugar)}</p>`
      : n.regla
        ? `<p class="como"><b>Qué puede pasar:</b> ${esc(n.riesgo)}</p>
           <p class="como"><label>Vale para <select data-alcance-permiso="${esc(clave)}" aria-label="Para qué proyectos vale este permiso"><option value="proyecto"${alcance === 'proyecto' ? ' selected' : ''}>Solo este proyecto</option><option value="todos"${alcance === 'todos' ? ' selected' : ''}>Todos los proyectos de este computador</option></select></label></p>`
        : `<p class="como"><b>Por qué no:</b> ${esc(n.motivo ?? '')}</p>`;
    // Las pruebas de un proyecto no se le negaron: el Studio las leyó del proyecto y te las ofrece antes (tu decisión del
    // 26 de octubre de 2026, «Que la lea y me la ofrezca»)
    const paraQue = n.ofrecido === 'pruebas'
      ? `<b>Para qué:</b> el Studio leyó en «${esc(nombreDeProyecto(n.proyecto))}» que sus pruebas se corren así. Con este permiso, el director comprueba lo que cambia en su código; sin él, se lo dejaría a tu misión.`
      : `<b>Para qué lo quería:</b> lo intentó así: ${n.intentos.map((i) => `<code>${esc(i)}</code>`).join(', ')}. ${donde}`;
    return `<li class="ajuste-d negado-d${n.nunca ? ' consejo-nunca' : ''}">${cabeza}
        <p class="como">${paraQue}</p>
        ${detalle}${n.regla && !n.nunca ? `<p class="como"><small>La regla exacta: <code>${esc(n.regla)}</code></small></p>` : ''}
      </li>`;
  };
  const lista = pendientes.length
    ? `<ul class="ajustes-d">${pendientes.map(item).join('')}</ul>
       ${autorizables.length ? `<div class="acciones-p"><button type="button" class="primario" data-autorizar-permisos>Autorizo los marcados</button><button type="button" class="boton-suave" data-autorizar-permisos="revision" title="Autoriza lo marcado y, con el mismo clic, pide la revisión de «${esc(nombreDeProyecto(d.activo))}»: el director la empieza ya con estos permisos">Autorizo y pido la revisión</button></div>` : ''}`
    : '<p class="como">No hay nada pendiente: en sus últimas revisiones no se le negó nada que no le hayas autorizado.</p>';
  const ya = autorizados.length
    ? `<h4>Lo que ya autorizaste</h4><ul class="ajustes-d">${autorizados.map((a) => `<li class="ajuste-d"><span class="casilla-d"><code>${esc(a.regla)}</code> <span class="consejo-ajuste">${a.alcance === 'todos' ? 'Todos los proyectos de este computador' : `Solo «${esc(nombreDeProyecto(a.proyecto))}»`}</span></span>
         <p class="como">${a.origen === 'claude' ? `<b>Lo aprobó Claude Code</b>, solo, en el modo automático, en la revisión del ${esc(fechaHora(a.cuando))}.` : `Lo autorizó ${esc(a.quien)} el ${esc(fechaHora(a.cuando))}.`} <button type="button" class="enlace" data-quitar-permiso="${esc(JSON.stringify({ regla: a.regla, alcance: a.alcance, proyecto: a.proyecto }))}">Quitar</button></p></li>`).join('')}</ul>`
    : '';
  return `<div class="negados-panel"><h4>Lo que se le negó al director</h4>
      <p class="como">Cada permiso es el de ese tipo de acción, no el de una línea: todas las órdenes de ese programa (curl, git log, node con su herramienta), la carpeta que quiso leer o la carpeta donde quiso escribir. Marca los que le das, elige para qué proyectos vale cada uno y oprime «Autorizo los marcados»: lo tendrá desde su próximo lanzamiento (la revisión, una urgencia o «No lo entiendo»). «Autorizo y pido la revisión» hace lo mismo y, con el mismo clic, pide la revisión del proyecto activo, para que haga ya lo que no pudo. Lo que nunca hace no trae casilla. Aquí también aparecen las pruebas de cada proyecto, leídas del proyecto mismo, antes de que le hagan falta: nada corre hasta que las autorizas.</p>
      ${lista}${ya}</div>`;
}

/** Autoriza lo marcado o quita uno ya autorizado, en un solo envío, y muestra cómo quedó. */
async function cambiarPermisos(cuerpo: { autorizar?: { regla: string; proyecto: string; alcance: PermisoAutorizado['alcance'] }[]; quitar?: { regla: string; alcance: string; proyecto?: string }[] }): Promise<boolean> {
  const r = await fetch('/__estudio/director/permisos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo), signal: AbortSignal.timeout(60_000) }).catch((e) => e as Error);
  if (r instanceof Error) return (avisar('No se pudo guardar: el Studio no respondió.'), false);
  const x = await r.json().catch(() => ({}));
  if (!r.ok) return (avisar(x.error ?? 'No se pudo guardar.'), false);
  panelPermisos = { pendientes: Array.isArray(x.pendientes) ? x.pendientes : [], autorizados: Array.isArray(x.autorizados) ? x.autorizados : [] };
  permisosLeidos = Date.now();
  permisosMarcados.clear();
  pintar();
  const n = cuerpo.autorizar?.length ?? 0;
  avisar(n ? `Hecho: ${n === 1 ? 'el permiso queda autorizado' : `los ${n} permisos quedan autorizados`}. El director lo${n === 1 ? '' : 's'} tiene desde su próximo lanzamiento.` : 'Hecho: el permiso queda quitado desde el próximo lanzamiento del director.', true);
  return true;
}

/**
 * Tus ajustes de Claude Code en el director (nota de voz del titular nmvojtb7rtit, 25 de octubre de 2026: una opción en
 * «Modelo y consumo», no una orden en la terminal; pd_arranque_limpio): los nombres de las claves de tu archivo de
 * ajustes, sin sus valores, y una casilla para que el director que lanza el Studio los cargue o arranque sin ellos, y
 * con ellos sin tus skills ni tus comandos. El modelo y el esfuerzo se le siguen pasando aparte. Clave por clave (notas
 * de voz del titular nmvolgrmctit y nmvoljwl9tit, 25 de octubre de 2026): cada una dice qué es, qué cambia en el
 * director y qué recomienda el Studio, con su casilla, y la selección se guarda; lo que le daría un permiso no se elige.
 */
const CONSEJO_AJUSTE: Record<OpcionAjuste['consejo'], string> = { si: 'Conviene conservarla', no: 'No la necesita', igual: 'Da igual', nunca: 'Nunca, por la regla del Studio' };
function seccionAjustesPropios() {
  const a = d.ajustesPropios;
  if (!a) return '';
  const elegidas = new Set(a.conservados ?? []);
  // Las que aparecieron en tu archivo después de guardar tu selección: el director usa lo recomendado hasta que confirmes
  // (nota de voz del titular nmvoottaitit, 25 de octubre de 2026; ajustesPropios.ts › conNuevas)
  const nuevas = new Set(a.cargar ? [] : (a.nuevas ?? []));
  const opciones = a.opciones ?? (a.claves ?? []).map((c): OpcionAjuste => ({ id: c, nombre: c, que: '', enElDirector: '', consejo: 'igual' }));
  const lista = a.claves === null
    ? '<p class="como">Tu archivo de ajustes de Claude Code no es JSON válido: no muestro sus claves, y Claude Code tampoco lo puede leer así.</p>'
    : opciones.length
      ? `<ul class="ajustes-d">${opciones.map((o) => `<li class="ajuste-d consejo-${o.consejo}${nuevas.has(o.id) ? ' nueva' : ''}">
            <label class="casilla-d">${o.consejo === 'nunca' ? icono('candado') : `<input type="checkbox" data-ajuste="${esc(o.id)}"${elegidas.has(o.id) ? ' checked' : ''}>`} <code>${esc(o.nombre)}</code>${o.dentro ? ` <small class="como">(${esc(o.dentro)})</small>` : ''} <span class="consejo-ajuste">${esc(CONSEJO_AJUSTE[o.consejo])}</span>${nuevas.has(o.id) ? ' <span class="ajuste-nueva">Nueva: confírmala</span>' : ''}</label>
            ${o.que ? `<p class="como"><b>Qué es:</b> ${esc(o.que)}</p><p class="como"><b>En el director:</b> ${esc(o.enElDirector)}${o.sinElla ? ` <b>Sin ella:</b> ${esc(o.sinElla)}` : ''}${o.fuente ? ` <a href="${esc(o.fuente)}" target="_blank" rel="noopener noreferrer">De dónde lo sé ↗</a>` : ''}</p>` : ''}
          </li>`).join('')}</ul>`
      : '<p class="como">No tienes ajustes de usuario de Claude Code en este computador: no hay nada que perder sin ellos.</p>';
  const hoy = a.cargar
    ? 'Hoy el director carga todos tus ajustes, con tus skills y tus comandos. Abajo, cada clave dice qué es y qué te recomiendo, y vienen marcadas las que conviene conservar: revísalas y oprime «Guardar mi selección».'
    : `Hoy el director arranca sin tus ajustes, sin tus skills ni tus comandos, y conserva ${elegidas.size ? `${elegidas.size === 1 ? 'la clave marcada' : `las ${elegidas.size} claves marcadas`}` : 'ninguna clave'}.`;
  const avisoNuevas = nuevas.size
    ? `<p class="aviso-ajustes-nuevas">${nuevas.size === 1 ? 'Una clave apareció' : `${nuevas.size} claves aparecieron`} en tu archivo después de que guardaste tu selección. Hasta que la guardes de nuevo, el director usa lo que te recomiendo para ${nuevas.size === 1 ? 'ella' : 'ellas'}, como viene marcado: revísa${nuevas.size === 1 ? 'la' : 'las'} y oprime «Guardar mi selección».</p>`
    : '';
  return `<section class="panel-d" data-ancla="m-ajustes">
        <h3>Tus ajustes de Claude Code en el director</h3>
        <p class="como">Son los de tu archivo de ajustes de usuario de Claude Code, los mismos que usan tus sesiones. El director no necesita casi ninguno: el Studio le da el modelo, el esfuerzo, sus reglas y sus permisos, igual en todo proyecto. Sin ellos arranca más liviano y siempre igual. Conviene conservar solo lo que cuida tu privacidad o lo que Claude Code necesita para conectarse. Desmarcar una clave no la quita de tus sesiones ni de tu archivo: solo el director arranca sin ella. Cada explicación sale de la documentación oficial de Claude Code, con su enlace; lo que el Studio no sabe explicar viene marcado para conservarlo, porque no se quita a ciegas. Solo se ven los nombres, nunca sus valores.</p>
        <p class="como">El director es un Claude Code aparte, que el Studio abre para cada revisión, urgencia o «No lo entiendo» y cierra al terminar: lo que elijas aquí vale para todo ese trabajo, de principio a fin, y no cambia tus sesiones. Las claves las lee el Studio de tu archivo cada vez que abres esta sección; guarda las que había al elegir, y si después aparece una nueva, te la marca para que la confirmes.</p>
        <p class="como">${hoy}</p>
        ${avisoNuevas}
        ${lista}
        <div class="acciones-p">${opciones.length ? '<button type="button" class="primario" data-guardar-ajustes>Guardar mi selección</button>' : ''}${a.cargar ? '' : '<button type="button" class="boton-suave" data-cargar-ajustes>Volver a cargarlos todos</button>'}</div>
      </section>`;
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
    return avisar(`No se pudo guardar${x?.error ? ` (${x.error})` : ': el Studio no respondió'}.`);
  }
  d.ajustesPropios = { cargar: x.cargar === true, claves: Array.isArray(x.claves) ? x.claves : null, opciones: Array.isArray(x.opciones) ? x.opciones : null, conservados: Array.isArray(x.conservados) ? x.conservados : [] };
  pintar();
  avisar(cargar ? 'Hecho: el director vuelve a cargar todos tus ajustes de Claude Code desde su próximo lanzamiento.' : `Hecho: desde su próximo lanzamiento, el director arranca sin tus ajustes de Claude Code (ni tus skills ni tus comandos)${conservar.length ? ` y conserva ${conservar.length === 1 ? 'la clave que marcaste' : `las ${conservar.length} claves que marcaste`}` : ''}.`, true);
}

/** Da o quita el permiso del director para seguir a ultracode; al darlo, primero lo explica y espera «Autorizo». */
async function cambiarPermisoUltracode(dar: boolean): Promise<void> {
  if (dar && !(await confirmar({ titulo: '¿Ultracode también para el director?', texto: PERMISO_ULTRACODE, boton: 'Autorizo', cancelar: 'Solo para mis sesiones' }))) return;
  const r = await fetch('/__estudio/director/ultracode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ director: dar }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
  if (r instanceof Error) return avisar('No se pudo guardar el permiso: el Studio no respondió.');
  const x = await r.json().catch(() => ({}));
  if (!r.ok) return avisar(x.error ?? 'No se pudo guardar el permiso.');
  d.ultracodeDirector = x.ultracodeDirector === true;
  pintar();
  avisar(d.ultracodeDirector ? `Permiso dado: el director ${d.ultracode ? 'trabaja con ultracode' : 'trabajará con ultracode cuando lo enciendas'} desde su próximo lanzamiento.` : 'Permiso quitado: el director vuelve a trabajar sin ultracode desde su próximo lanzamiento.', true);
}

/**
 * Elige cómo pide permisos el director: solo lo autorizado, o «Me pregunta en el Studio» (propuesta aceptada
 * pr_permisos_al_momento). Vale desde su próximo lanzamiento; un clic basta, porque cada permiso que se dé en el diálogo
 * lo da la persona, uno a uno.
 */
async function cambiarModoPermisos(modo: ModoPermisos): Promise<void> {
  if (modo === (d.modoPermisos ?? 'autorizado')) return;
  const r = await fetch('/__estudio/director/modo-permisos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ modo }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
  if (r instanceof Error) return avisar('No se pudo guardar: el Studio no respondió.');
  const x = await r.json().catch(() => ({}));
  if (!r.ok) return avisar(x.error ?? 'No se pudo guardar.');
  d.modoPermisos = modoDe(x.modoPermisos);
  pintar();
  avisar(
    d.modoPermisos === 'pregunta' ? 'Hecho: desde su próximo lanzamiento, cuando al director le falte un permiso, el Studio te lo pregunta en un diálogo.'
    : d.modoPermisos === 'automatico' ? 'Hecho: desde su próximo lanzamiento, lo que le falte al director lo decide solo Claude Code; cada cosa que apruebe la ves en «Lo que va haciendo el director» y, al terminar, aquí, en el panel.'
    : 'Hecho: desde su próximo lanzamiento, el director trabaja solo con lo autorizado; lo que le falte se le niega y queda aquí, en «Lo que se le negó al director».',
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
 * Modelo y consumo: con qué modelo y cuánto piensa el director que lanza el Studio, y lo que gastó cada vez, por día,
 * por semana y por proyecto. No es de ningún proyecto: es la configuración de Claude Code en este computador (la de
 * /model y /effort), la misma para todos, así que va aparte, en el pie de la barra, y no en Proyecto (pedido del
 * titular, 21 de octubre). Solo datos verdaderos: lo que Claude Code dice al empezar y devuelve al terminar cada
 * lanzamiento, también los límites del plan (los mismos de /usage).
 */
function vistaModelo() {
  const actual = d.modelo ?? '';
  const lista = d.consumo ?? [];
  const sinTerminar = d.sinTerminar ?? [];
  const elegido = MODELOS.find((m) => m.id === actual);
  const opciones = [...MODELOS, ...(elegido ? [] : [{ id: actual, nombre: actual, que: 'El que tiene la configuración de Claude Code (lo eligió /model o se escribió a mano).' }])];
  const hoyLocal = new Date();
  const dia = (x: Date) => `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`;
  // Lo gastado, en lo que cuesta de tu plan y no a precio de API (pd_costo_plan): la parte de tu semana que gastó cada
  // lanzamiento, repartida en cada ventana en proporción a su gasto, y su equivalente aproximado con el precio de tu plan
  const plan = d.planDeClaude ?? null;
  const conPlan = !!plan && PLANES_DE_CLAUDE[plan].mes !== null;
  const idDe = (x: (typeof lista)[number]) => `${x.tipo}|${x.proyecto}|${x.cuando}`;
  const deTuSemana = semanaDeCadaUno(lista.map((x) => ({ id: idDe(x), costo: x.costo, semana: x.semana })));
  const suma = (xs: typeof lista) => ({ n: xs.length, costo: xs.reduce((s, x) => s + x.costo, 0), tokens: xs.reduce((s, x) => s + x.entrada + x.cache + x.salida, 0), negados: xs.reduce((s, x) => s + (x.negados?.length ?? 0), 0), ...(xs.some((x) => deTuSemana.has(idDe(x))) ? { semana: xs.reduce((s, x) => s + (deTuSemana.get(idDe(x)) ?? 0), 0) } : {}) });
  const negadosDe = (n: number) => `${n} ${n === 1 ? 'permiso negado' : 'permisos negados'}`;
  const deHoy = suma(lista.filter((x) => dia(new Date(x.cuando)) === dia(hoyLocal)));
  const semana = lista.filter((x) => hoyLocal.getTime() - Date.parse(x.cuando) < 7 * 86_400_000);
  const deSemana = suma(semana);
  // Con tu plan elegido, lo de tu plan, y el precio de API al pasar el ratón; si falta lo que dijo tu límite, sin monto
  const gastado = (costo: number, puntos: number | undefined) => {
    if (!conPlan) return dolares(costo);
    const enPlan = enTuPlan(puntos, plan);
    return `<span title="${esc(`A precio de API serían ${dolares(costo)}: no es lo que pagas con tu plan.`)}">${enPlan ? esc(enPlan) : 'sin lo que dijo tu límite semanal'}</span>`;
  };
  const cifra = (titulo: string, s: ReturnType<typeof suma>) => `<div><span class="tit">${titulo}</span><b>${conPlan ? gastado(s.costo, s.semana) : dolares(s.costo)}</b><small>${s.n} ${s.n === 1 ? 'lanzamiento' : 'lanzamientos'} · ${miles(s.tokens)} tokens${s.negados ? ` · ${negadosDe(s.negados)}` : ''}</small></div>`;
  // El nombre de un modelo: el de la lista o, si no está, el que dice su id («claude-haiku-4-5-20251001» es «Haiku 4.5»)
  const nombreModelo = (id: string) => {
    const m = /^claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?(\[1m\])?$/i.exec(id);
    return MODELOS.find((x) => x.id === id)?.nombre ?? (m ? `${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2]}${m[3] ? `.${m[3]}` : ''}${m[4] ? ', contexto de 1 M' : ''}` : id);
  };
  // Los modelos de un lanzamiento, solo si usó otros además del principal: cuáles, lo que gastó cada uno y para qué
  // (nota de voz del titular del 22 de octubre de 2026); al pasar el ratón, sus tokens por tipo
  const lineaModelos = (x: (typeof lista)[number]) => {
    const ms = x.modelos ?? [];
    if (!ms.some((m) => !m.principal)) return '';
    const para = (p: string[]) => `${p.slice(0, 3).join('; ')}${p.length > 3 ? ` y ${p.length - 3} más` : ''}`;
    const uno = (m: (typeof ms)[number]) => `${esc(nombreModelo(m.modelo))} (${m.costo != null ? `${dolares(m.costo)} · ` : ''}${miles(m.entrada + m.cache + m.salida)} tokens${m.para?.length ? `: ${esc(para(m.para))}` : ''})`;
    const detalle = ms.map((m) => `${nombreModelo(m.modelo)}: ${miles(m.entrada)} de entrada, ${miles(m.cache)} de la caché y ${miles(m.salida)} de salida`).join('\n');
    return `<small class="consumo-modelos" title="${esc(detalle)}">Modelos: ${ms.map(uno).join(' · ')}</small>`;
  };
  // Lo que recibió al empezar (pedido del titular del 23 de octubre de 2026): el encargo y lo que le dio la bandeja, cada
  // uno abre su texto en otra pestaña, y el arranque, los tokens exactos de su primera llamada. Los de antes no lo tienen
  const kb = (bytes: number) => `${(bytes / 1024).toLocaleString('es', { maximumFractionDigits: bytes < 10_240 ? 1 : 0 })} KB`;
  const lineaPaquete = (p: Paquete | undefined) => {
    if (!p) return '';
    const parte = (que: 'encargo' | 'bandeja', nombre: string, peso?: { bytes: number; tokens: number }) =>
      peso ? `<a href="/__estudio/director/paquete?registro=${encodeURIComponent(p.registro)}&amp;parte=${que}" target="_blank" rel="noopener">${nombre} (${kb(peso.bytes)}, unos ${miles(peso.tokens)} tokens)</a>` : '';
    // Y su registro completo, una línea por evento, en otra pestaña (pd_enlaces_archivos)
    const registro = `<a href="${esc(direccionVer(`.revisiones/${p.registro}`))}" target="_blank" rel="noopener">El registro completo</a>`;
    const partes = [parte('encargo', 'El encargo', p.encargo), parte('bandeja', 'Lo que le dio la bandeja', p.bandeja), registro, p.arranque != null ? `el arranque: ${p.arranque.toLocaleString('es')} tokens` : ''].filter(Boolean);
    return `<small class="consumo-paquete">El paquete: ${partes.join(' · ')}</small>`;
  };
  const nombreProyecto = (id: string) => d.proyectos.find((p) => p.id === id)?.nombre || id;
  // Lo de cada proyecto en la semana, del que más gastó al que menos: solo si el director trabajó en más de uno
  const porProyecto = [...new Set(semana.map((x) => x.proyecto))].map((id) => ({ id, ...suma(semana.filter((x) => x.proyecto === id)) })).sort((a, b) => b.costo - a.costo);
  // Cada lanzamiento, del más nuevo al más viejo: los que terminaron, con lo que gastaron, y los que no terminaron con su
  // resultado (siguen trabajando, se cortaron o Claude Code murió), sin lo gastado, que Claude Code devuelve solo al
  // terminar, pero con su paquete, porque son justo los que más conviene mirar
  const cual = (x: { cuando: string; tipo: keyof typeof NOMBRE_LANZAMIENTO; proyecto: string; modelo: string | null }) =>
    `${fecha(x.cuando)} ${hora(x.cuando)} · ${NOMBRE_LANZAMIENTO[x.tipo]} de ${esc(nombreProyecto(x.proyecto))}${x.modelo ? ` · ${esc(nombreModelo(x.modelo))}` : ''}`;
  // Quién terminó cada uno, como lo escribió el Studio al terminar (pr_procesos_vista, punto 1): al pasar el ratón, por qué
  const termino = (f: FinEscrito | undefined) => (f ? `<small class="consumo-fin" title="${esc(f.causa)}">Terminó: ${esc(NOMBRE_FIN[f.quien])}${f.minutos != null ? `, a los ${Math.round(f.minutos).toLocaleString('es')} min de lanzarlo` : ''}</small>` : '');
  const filas = [
    ...lista.map((x) => ({ cuando: x.cuando, html: `<li><span>${cual(x)}${x.pedido?.esfuerzo ? ` · esfuerzo ${esc(ESFUERZOS.find((e) => e.id === x.pedido!.esfuerzo)?.nombre.toLowerCase() ?? x.pedido.esfuerzo)}` : ''}</span><span>${gastado(x.costo, deTuSemana.get(idDe(x)))} · ${miles(x.entrada + x.cache + x.salida)} tokens · ${x.minutos.toLocaleString('es')} min${x.negados?.length ? ` · <span title="${esc(x.negados.join('\n'))}">${negadosDe(x.negados.length)}</span>` : ''}</span>${termino(x.fin)}${lineaModelos(x)}${lineaPaquete(x.paquete)}</li>` })),
    ...sinTerminar.map((x) => ({ cuando: x.cuando, html: `<li><span>${cual(x)}</span><span>${x.enCurso ? 'En curso: lo que gasta se sabe al terminar' : 'Sin terminar: Claude Code no devolvió lo que gastó'}</span>${termino(x.fin)}${lineaPaquete(x.paquete)}</li>` })),
  ].sort((a, b) => b.cuando.localeCompare(a.cuando)).map((f) => f.html).join('');
  // Cómo terminaron los de la semana, también los que se cortaron sin resultado: solo los que tienen su final escrito
  const finales = contarFinales([...semana.map((x) => x.fin), ...sinTerminar.filter((x) => hoyLocal.getTime() - Date.parse(x.cuando) < 7 * 86_400_000).map((x) => x.fin)]);
  const comoTerminaron = finales.length
    ? `<p class="como consumo-finales">Cómo terminaron en los últimos 7 días: ${finales.map((f) => `${f.n} ${NOMBRE_FIN[f.quien]}`).join(' · ')}. Cuentan los que el Studio anotó al terminar, también los que se cortaron sin lo gastado.</p>`
    : '';
  // La medida del criterio del director en este proyecto, por revisión (pr_criterio_director, punto 3): lo que salió de lo
  // que dejó cada una, para que se vean sus fallas y si mejora
  const medida = d.medidaDelDirector ?? [];
  const celda = (n: number) => `<td${n ? ' class="hay"' : ''}>${n.toLocaleString('es')}</td>`;
  const tablaMedida = medida.length
    ? `<details class="detalles-repo"${plegable('consumo-medida')}><summary>Cómo salió lo que recomendó, por revisión (este proyecto)</summary>
        <table class="tabla-medida"><thead><tr><th>Revisión</th><th>Cerró</th><th>Gastó</th><th>Aprobadas tal cual</th><th>Cambiadas</th><th>Para rehacer</th><th>«No lo entiendo»</th></tr></thead>
          <tbody>${medida.map((m) => `<tr><td>${fecha(m.cuando)} ${hora(m.cuando)}</td><td>${m.cerro ? 'Sí' : '<b>No</b>'}</td><td>${m.costo != null ? dolares(m.costo) : '—'}</td><td>${m.talCual.toLocaleString('es')}</td>${celda(m.cambiadas)}${celda(m.rehacer)}${celda(m.aclaraciones)}</tr>`).join('')}</tbody></table>
        <p class="como">Cada fila es una revisión de este computador y lo que hiciste con lo que dejó, hasta la siguiente: las decisiones y propuestas que aprobaste tal cual o cambiaste, y los pasos que no entendiste; una misión para rehacer cuenta para la revisión que la dejó. Una recomendación cambiada, una misión rehecha o un «No lo entiendo» son fallas del director, no tuyas: él las mira antes de ordenar y recomendar. Lo gastado, a precio de API.</p>
      </details>`
    : '';
  // Con cuál trabajó de verdad: Claude Code lo dice al empezar cada lanzamiento, y el Studio anota lo que pidió
  const ultimo = lista.find((x) => x.modelo);
  const cuandoUltimo = ultimo ? `${fecha(ultimo.cuando)} ${hora(ultimo.cuando)}` : '';
  const trabajo = !ultimo
    ? '<p class="como">Con qué modelo trabaja de verdad lo dice Claude Code al empezar cada lanzamiento: aparece aquí después del primero.</p>'
    : ultimo.pedido?.cumplido === false
      ? `<p class="aviso-modelo">El último lanzamiento (${cuandoUltimo}) pidió ${esc(nombreModelo(ultimo.pedido.modelo ?? ''))}, pero Claude Code trabajó con <b>${esc(nombreModelo(ultimo.modelo!))}</b>. Revisa en Claude Code qué modelos trae tu plan.</p>`
      : `<p class="como modelo-real">El último lanzamiento (${cuandoUltimo}) trabajó con <b>${esc(nombreModelo(ultimo.modelo!))}</b>${ultimo.pedido ? (ultimo.pedido.modelo ? ', el que elegiste' : ', el de tu cuenta') : ''}: lo dice Claude Code al empezar.${ultimo.pedido && (ultimo.pedido.modelo ?? '') !== actual ? ' Lo que acabas de elegir se confirma aquí en el próximo lanzamiento.' : ''}</p>`;
  // Los límites del plan, como los muestra /usage: Claude Code los informa en cada lanzamiento
  const conLimites = lista.find((x) => x.limites);
  const ventana = (titulo: string, v: { uso: number; renueva: string | null } | null) => {
    if (!v) return '';
    if (v.renueva && Date.parse(v.renueva) < Date.now()) return `<div><span class="tit">${titulo}</span><b>Renovado</b><small>se renovó el ${fecha(v.renueva)} a las ${hora(v.renueva)}</small></div>`;
    return `<div><span class="tit">${titulo}</span><b>${v.uso.toLocaleString('es')} % usado</b><small>${v.renueva ? `se renueva el ${fecha(v.renueva)} a las ${hora(v.renueva)}` : ''}</small></div>`;
  };
  const limites = conLimites?.limites
    ? `<div class="consumo-cifras">${ventana('Cada cinco horas', conLimites.limites.cincoHoras)}${ventana('Semanal', conLimites.limites.semana)}</div>
        <p class="como">Son de tu cuenta de Claude, no de un proyecto: lo mismo que muestra <code>/usage</code> en Claude Code, como estaba al terminar el último lanzamiento (${fecha(conLimites.cuando)} ${hora(conLimites.cuando)}). Claude Code lo informa en cada uno, así que no cuenta lo que hayas usado después en otras sesiones.</p>`
    : '<p class="como">Son de tu cuenta de Claude, no de un proyecto: cuánto llevas de tu límite de cada cinco horas y del semanal. Claude Code los informa en cada lanzamiento, así que aparecen aquí después del próximo. Mientras tanto, míralos en Claude Code con <code>/usage</code>.</p>';
  // Un botón que lleva a una parte (un paso, la ruta) abre antes la pestaña que la tiene; después se la resalta como siempre
  const deAncla = pestanaDeAncla(anclaPendiente);
  if (deAncla && deAncla !== pestanaModelo) ponerPestanaModelo(deAncla);
  // Solo se pinta la pestaña elegida (la bitácora, por ejemplo, no se pide hasta que se la abre)
  const cuerpos: Record<PestanaModelo, () => string> = {
    director: () => `
      <section class="panel-d" data-ancla="m-director">
        <h3>El director</h3>
        <p class="como">Con qué modelo te revisa el director cuando el Studio lo llama (la revisión, «No lo entiendo» y lo urgente), en cualquiera de tus proyectos. Lo que elijas aquí vale también para tus sesiones nuevas de Claude Code, y lo que cambies allá con <code>/model</code> o <code>/effort</code> se ve aquí.</p>
        <label class="campo-modelo">Modelo<select data-modelo>${opcionesDe(opciones, actual)}</select></label>
        <p class="como">${esc(opciones.find((m) => m.id === actual)?.que ?? '')} Si tu cuenta no acepta el que elijas, el lanzamiento falla antes de trabajar, el Studio lo quita de la configuración de Claude Code, vuelve al de tu cuenta y lo dice.</p>
        ${lineaInventario(actual)}
        ${trabajo}
        <label class="campo-modelo">Esfuerzo<select data-esfuerzo>${opcionesDe(ESFUERZOS, d.esfuerzo ?? '')}</select></label>
        <p class="como">${esc(ESFUERZOS.find((x) => x.id === (d.esfuerzo ?? ''))?.que ?? '')} ${d.esfuerzo === 'max' ? `Claude Code no guarda «Máximo» en su configuración (lo aplica solo a una sesión): el Studio lo recuerda y lo usa para el director y para la terminal que abres aquí abajo. Tus otras sesiones de Claude Code siguen con ${esc(ESFUERZOS.find((x) => x.id === (d.esfuerzoGuardado ?? ''))?.nombre.toLowerCase() ?? 'el de tu cuenta')}; en ellas, <code>/effort max</code>. ` : 'Cada modelo guarda su propio esfuerzo, como en Claude Code: al cambiar de modelo, aquí se ve el suyo. '}Cambiar el modelo o el esfuerzo no cambia las reglas del director ni lo que puede hacer: solo qué tan bien piensa, cuánto tarda y cuánto gasta. Claude Code no informa el esfuerzo con que trabajó: si no acepta el elegido, falla al empezar y el Studio vuelve al de tu cuenta.</p>
        <label class="interruptor-s"><input type="checkbox" data-ultracode${d.ultracode ? ' checked' : ''} /> Ultracode</label>
        <p class="como">Con ultracode, Claude planea un flujo de varios agentes para cada tarea de peso, en vez de esperar a que se lo pidas, y gasta bastante más. Es la clave <code>ultracode</code> de la configuración de Claude Code: vale para tus sesiones nuevas de este computador (<code>/effort ultracode</code> lo enciende solo en una).</p>
        ${permisoUltracode()}
        <label class="interruptor-s"><input type="checkbox" data-todo-modelo${d.todoConElModelo ? ' checked' : ''} /> Todo con el modelo que elegí</label>
        <p class="como">Sin esta casilla, los ayudantes del director y los agentes de sus flujos trabajan con un modelo más barato (Sonnet, o Haiku si él trabaja con Haiku), y él decide y comprueba con el suyo: así gasta menos. Con ella, todos trabajan con el modelo de arriba, para quien prefiera no delegar aunque gaste más. Si arriba dice «el de tu cuenta», el Studio no sabe cuál es, y los ayudantes siguen con el más barato.</p>
        <div class="abrir-claude"><button type="button" class="boton-suave" data-abrir-claude>Abrir Claude Code en una terminal</button>
          <p class="como">Abre una ventana nueva con Claude Code como lo lanza el Studio: en la carpeta del Studio, con la del proyecto activo a la vista, y con este modelo y este esfuerzo. Sirve para lo que solo se hace allí, como <code>/usage</code> o iniciar sesión. Es una sesión tuya, aparte: te pide permiso para cada cosa, y lo del proyecto sigue yendo por el Buzón.</p></div>
      </section>`,
    permisos: seccionPermisos,
    ajustes: seccionAjustesPropios,
    // Los límites y lo gastado, dos tarjetas de todo el ancho, una encima de la otra (nota de voz del titular
    // nmvow70jqtit, 26 de octubre de 2026: en vez de una pequeña y otra a la derecha)
    gasto: () => `
      <section class="panel-d" data-ancla="m-limites">
        <h3>Los límites de tu plan</h3>
        ${limites}
        <label class="campo-modelo">Tu plan de Claude<select data-plan-claude>${[['', 'No lo digo: lo gastado, a precio de API'], ...Object.entries(PLANES_DE_CLAUDE).map(([id, p]) => [id, p.mes === null ? p.nombre : `${p.nombre}, US$ ${p.mes} al mes`])].map(([v, n]) => `<option value="${esc(v)}"${(plan ?? '') === v ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
        <p class="como">Con tu plan, lo que gasta el director se dice en lo que cuesta de él, y no a precio de API: la parte de tu semana que gastó cada lanzamiento (lo que subió tu límite semanal mientras trabajaba, repartido en proporción a lo que gastó cada uno, porque el límite se mide en saltos de 1 % y lo comparte con tus otras sesiones) y su equivalente con el precio de tu plan (al mes, por 12 y entre 52: el de una semana). Es aproximado: Anthropic no publica cuánto trae cada plan. Con una clave de API pagas por uso, y entonces el precio de API es el real.</p>
      </section>
      <section class="panel-d" data-ancla="m-consumo">
        <h3>Lo que gastó el director</h3>
        ${lista.length ? `<div class="consumo-cifras">${cifra('Hoy', deHoy)}${cifra('Últimos 7 días', deSemana)}</div>
          ${porProyecto.length > 1 ? `<ul class="consumo-proyectos" aria-label="Por proyecto, en los últimos 7 días">${porProyecto.map((p) => `<li><span>${esc(nombreProyecto(p.id))}</span><span>${conPlan ? gastado(p.costo, p.semana) : dolares(p.costo)} · ${p.n} ${p.n === 1 ? 'lanzamiento' : 'lanzamientos'}</span></li>`).join('')}</ul>` : ''}` : ''}
        ${comoTerminaron}
        ${tablaMedida}
        ${filas ? `<details class="detalles-repo"${plegable('consumo-lanzamientos')}><summary>Cada lanzamiento (últimos 35 días)</summary>
            <ul class="consumo-lista">${filas}</ul>
          </details>` : '<p class="como">Todavía no hay lanzamientos del director en este computador.</p>'}
        <p class="como">Los tokens son exactos: los cuenta la API y Claude Code los devuelve al terminar cada lanzamiento. ${conPlan ? `Lo gastado va como parte de tu plan ${esc(PLANES_DE_CLAUDE[plan!].nombre)}, aproximado; al pasar el ratón, lo que sería a precio de API, que no es un cobro: con un plan de suscripción lo que gastas de verdad es el porcentaje de tus límites.` : 'Los dólares no son un cobro: Claude Code multiplica esos tokens por el precio de la API. Con un plan de suscripción no pagas eso; lo que gastas de verdad es el porcentaje de tus límites. Elige tu plan en «Los límites de tu plan» para verlo en lo que cuesta de él.'}</p>
        <p class="como">Si un lanzamiento usó otros modelos además del principal, debajo dice cuáles, lo que gastó cada uno y para qué: lo que se le pidió al ayudante o la fase del flujo que lo usó, o «por dentro de Claude Code» si lo usó Claude Code por su cuenta (WebFetch, por ejemplo, resume con un modelo pequeño cada página que lee). Si no dice nada, trabajó solo con el principal.</p>
        <p class="como">«El paquete» es lo que el director recibió al empezar: el encargo con que lo lanzó el Studio y lo que le dio la bandeja (cada vez que la corrió, menos al cerrar). Cada uno se abre en otra pestaña, para leerlo. Sus tokens son estimados (los caracteres entre 4); el del arranque es exacto: todo lo que leyó en su primera llamada al modelo, con sus reglas y lo que trae Claude Code. Los lanzamientos de antes no lo tienen. Los que no terminaron (siguen trabajando, se cortaron o Claude Code murió) también están en la lista con su paquete, pero sin lo gastado y sin contar en las cifras: Claude Code solo lo devuelve al terminar.</p>
        <p class="como">Los permisos negados son lo que el director intentó y sus permisos no le dejaron hacer: en cada lanzamiento, pasa el ratón sobre la cifra para verlos. La revisión siguiente empieza sabiéndolo, para no intentarlo igual; si le hace falta uno para lo que aprobaste, lo encuentras en la pestaña «Permisos», para autorizarlo con una casilla.</p>
      </section>
      ${seccionMedicion(nombreModelo)}`,
    bitacora: seccionBitacora,
  };
  const barra = `<div class="pestanas-stl pestanas-modelo" role="tablist" aria-label="Modelo y consumo">${PESTANAS_MODELO.map((p) => {
    const sel = p.id === pestanaModelo;
    return `<button type="button" role="tab" id="pestana-modelo-${p.id}" class="pestana-stl${sel ? ' sel' : ''}" data-pestana-modelo="${p.id}" aria-selected="${sel}"${sel ? ` aria-controls="panel-modelo-${p.id}"` : ''} tabindex="${sel ? 0 : -1}">${esc(p.titulo)}</button>`;
  }).join('')}</div>`;
  return `<p class="intro">Con qué modelo trabaja el director y lo que gasta, en este computador. No es de ningún proyecto: es la configuración de Claude Code, la misma que cambian <code>/model</code> y <code>/effort</code>, y vale igual para todos tus proyectos y para tus sesiones nuevas de Claude Code. No va en git.</p>
  ${barra}
  <div role="tabpanel" id="panel-modelo-${pestanaModelo}" aria-labelledby="pestana-modelo-${pestanaModelo}" class="panel-pestana-modelo p-${pestanaModelo}">${cuerpos[pestanaModelo]()}</div>`;
}

/**
 * La medición del núcleo del director con casos fijos (propuesta aceptada pr_nucleo_medido): la corrida que pide la
 * persona, con su costo a la vista, antes de cambiar las reglas del director, para saber que el cambio no rompe nada. La
 * de ahora, con «Detener», o la última, con cada caso y su porqué; nunca junto a una revisión (directorOcupado).
 */
/**
 * Lo que costaría una corrida, en palabras: por lo que costó cada vuelta de la última o, sin una, entre lo que cuesta un
 * encargo corto del director y lo que cuesta una revisión, porque una de prueba queda entre los dos.
 */
function cuantoCuesta(e: NonNullable<EstadoMedicion['estimado']>): string {
  if (e.de === 'corrida') return `unos <b>${dolares(e.total)}</b> (${dolares(e.porVuelta)} por vuelta, lo que costó cada una en la última)`;
  if (e.desde !== undefined) return `entre unos <b>${dolares(e.desde)}</b> y <b>${dolares(e.total)}</b> (cada vuelta es una revisión de un proyecto de prueba, chico: cuesta más que un encargo corto del director y menos que una revisión de verdad; después de la primera, se sabe lo exacto)`;
  return `unos <b>${dolares(e.total)}</b> como mucho (${dolares(e.porVuelta)} por vuelta, lo que cuesta una revisión del director; una de prueba cuesta menos)`;
}

/** Si hay un director trabajando o algo pedido que lo lanzará: lo mismo que mira el servidor antes de medir. */
const hayDirectorPendiente = () => {
  const pendiente = (x: { hecha?: string; error?: string } | null | undefined) => !!x && !x.hecha && !x.error;
  return !!d.revisor?.revisando || pendiente(d.revision) || pendiente(d.aclaracion) || pendiente(d.urgencia);
};

function seccionMedicion(nombreModelo: (id: string) => string) {
  const m = d.medicion;
  if (!m) return '';
  const u = m.ultima;
  const VEREDICTO = { pasa: 'Pasa', falla: 'Falla', pendiente: 'Sin terminar' } as const;
  const conQue = (x: { modelo: string | null; esfuerzo: string | null }) => `${x.modelo ? esc(nombreModelo(x.modelo)) : 'el modelo de tu cuenta'}${x.esfuerzo ? `, esfuerzo ${esc(ESFUERZOS.find((e) => e.id === x.esfuerzo)?.nombre.toLowerCase() ?? x.esfuerzo)}` : ''}`;
  // Lo que no comprueba el código lo califica otro modelo: la persona dice si está de acuerdo (en dos corridas sin
  // acuerdo, la pauta de ese caso se revisa)
  const acuerdo = (c: NonNullable<typeof u>['porCaso'][number]) => {
    if (!c.califica || m.enMarcha) return '';
    const boton = (de: boolean, texto: string) => `<button type="button" class="enlace" data-acuerdo="${esc(`${u!.cuando}|${c.id}|${de ? 'si' : 'no'}`)}" aria-pressed="${c.acuerdo === de}">${c.acuerdo === de ? `<b>${texto}</b>` : texto}</button>`;
    return `<small>Quien califica: ${c.califica.pasa ? 'pasa' : 'falla'}, porque ${esc(c.califica.porque.join(' · '))} · ${boton(true, 'De acuerdo')} ${boton(false, 'No de acuerdo')}</small>`;
  };
  // Cómo estaba cada caso en la medición anterior: lo que pasaba y ahora falla se rompió con el último cambio
  const cambio = (c: NonNullable<typeof u>['porCaso'][number]) => (c.antes === 'pasa' && c.veredicto === 'falla' ? ' · <b>se rompió</b>' : c.antes === 'falla' && c.veredicto === 'pasa' ? ' · se arregló' : '');
  const casos = u?.porCaso.length
    ? `<details class="detalles-repo"${plegable('medicion-casos')}><summary>Cada caso</summary><ul class="consumo-lista">${u.porCaso.map((c) => `<li><span>${esc(c.titulo)}</span><span>${VEREDICTO[c.veredicto]}${c.vueltas ? ` · ${c.vueltas} ${c.vueltas === 1 ? 'vuelta' : 'vueltas'}` : ''}${cambio(c)}</span>${c.porque.length ? `<small>${esc(c.porque.join(' · '))}</small>` : ''}${acuerdo(c)}</li>`).join('')}</ul></details>`
    : '';
  const discrepan = m.discrepan?.length
    ? `<p class="aviso-modelo">En dos mediciones no estuviste de acuerdo con quien califica en ${m.discrepan.map((x) => `«${esc(x.titulo)}»`).join(', ')}: su pauta no mide lo que tú mides. Te propondré reescribirla.</p>`
    : '';
  const midio = !u || u.porCaso.length >= m.casos ? '' : `${u.alcance === 'pasaban' ? `Midió los ${u.porCaso.length} casos que pasaban, lo que el último cambio pudo romper` : u.alcance === 'fallaban' ? `Midió los ${u.porCaso.length} casos que fallaban` : `Midió ${u.porCaso.length} de los ${m.casos} casos`}: `;
  const rotos = u?.porCaso.filter((c) => c.antes === 'pasa' && c.veredicto === 'falla').length ?? 0;
  const ultima = !u
    ? '<p class="como">Todavía no se ha medido en este computador.</p>'
    : `<p class="como">${m.enMarcha ? 'Esta' : u.terminada ? 'La última' : 'La última, detenida antes de terminar'}: ${fecha(u.cuando)} ${hora(u.cuando)}, con ${conQue(u)}. ${midio}<b>${u.pasan} de ${u.porCaso.length} casos pasan</b>${u.fallan ? `, ${u.fallan} ${u.fallan === 1 ? 'falla' : 'fallan'}` : ''}${rotos ? ` (${rotos === 1 ? 'uno pasaba antes y se rompió' : `${rotos} pasaban antes y se rompieron`})` : ''}${u.costo != null ? ` · ${dolares(u.costo)}` : ''}.</p>${casos}`;
  const e = m.estimado;
  // Con una medición anterior, lo que ya pasa no se vuelve a correr: se eligen al pedirla, uno por uno, los que fallan
  const fallan = m.fallan?.length ?? 0;
  const costo = u
    ? `Lo que ya pasa no se vuelve a medir: al pedirla eliges cuáles de ${fallan === 1 ? 'el que falla' : `los ${fallan} que fallan`} medir${fallan ? '' : ' (ahora ninguno)'}, o todos los casos para una base nueva, al cambiar de modelo o de esfuerzo; cada opción dice lo que cuesta y tarda.`
    : e
      ? `Una corrida mide ${m.casos} casos, dos vueltas cada uno: ${cuantoCuesta(e)}. Si un caso sale distinto en sus dos vueltas, una tercera: unos ${dolares(e.porVuelta)} más, como mucho.`
      : `Una corrida mide ${m.casos} casos, dos vueltas cada uno: lo que cuesta se sabe después de la primera revisión del director en este computador.`;
  const accion = m.enMarcha
    ? `<p class="como"><b>Midiendo:</b> ${m.enMarcha.vueltas} ${m.enMarcha.vueltas === 1 ? 'vuelta hecha' : 'vueltas hechas'}, desde las ${hora(m.enMarcha.desde)} (la pidió ${esc(m.enMarcha.quien)}). Mientras tanto no se lanza ningún director.</p>
        <div class="abrir-claude"><button type="button" class="boton-suave" data-medir="detener">Detener</button><p class="como">Termina la vuelta que está corriendo y no empieza otra: lo hecho queda guardado.</p></div>`
    : `<div class="abrir-claude"><button type="button" class="boton-suave" data-medir="pedir"${hayDirectorPendiente() ? ' disabled title="Hay una revisión pedida o un director trabajando: la medición se pide cuando termine."' : ''}>Medir el núcleo</button><p class="como">${costo}</p></div>`;
  return `<section class="panel-d" data-ancla="m-medicion">
      <h3>La medición del núcleo</h3>
      <p class="como">Mide al director con los errores que no deben repetirse: cada caso es una situación de prueba, y el director de verdad (con este modelo, este esfuerzo y sus reglas de ahora) hace su revisión sobre un proyecto de prueba, sin tocar los tuyos. Lo comprueba el código y, donde no alcanza, otro modelo con una pauta. Sirve para ver si un cambio de sus reglas arregló lo que fallaba, y para tener una base nueva al cambiar de modelo. Lo que avanza se ve aquí, vuelta por vuelta, sin salir de la página.</p>
      ${discrepan}
      ${ultima}
      ${accion}
      <p class="como">Gasta de tu plan, como una revisión: por eso la pides tú, y nunca corre junto a una revisión. Lo que sale queda en este computador, fuera de git. En cada caso que califica otro modelo, dime si estás de acuerdo con su nota: si en dos mediciones no lo estás, su pauta se revisa.</p>
    </section>`;
}

/**
 * La bitácora de este computador: cada acción que se hizo en el Studio, quién la hizo (o «el Studio», si la hizo solo),
 * desde dónde y cuándo, para poder auditarla. No va en los menús principales: es la última pestaña de «Modelo y
 * consumo» (nota de voz del titular, 23 de octubre de 2026; la pestaña, 25 de octubre). Se pide al servidor al abrirla,
 * y lo que llega se pinta solo dentro de su lista: el resto de la página no se mueve.
 */
let bitacora: { eventos: EventoBitacora[]; maximo: number; cuando: number } | null = null;
let errorBitacora = '';
let filtroBitacora = '';
let cargandoBitacora = false;
/** Si la bitácora estaba abierta: al volver a abrirla después de cerrarla, se pide de nuevo. */
let bitacoraAbierta = false;
/** Cuánto vale lo ya traído: un repintado dentro de ese rato no la vuelve a pedir. */
const FRESCA_BITACORA_MS = 20_000;

function seccionBitacora() {
  // Abierta (en su pestaña nace abierta, y si la cerraste el repintado lo recuerda), se trae lo más nuevo si lo que hay
  // ya es viejo
  if (plegadosAMano.get('bitacora') ?? true) void cargarBitacora();
  return `<section class="panel-d" data-ancla="m-bitacora">
      <details class="plegable-d" data-bitacora${plegable('bitacora', true)}>
        <summary><h3>La bitácora de este computador</h3><small>quién hizo qué, desde dónde y cuándo</small></summary>
        <p class="como">Cada acción que se hace en el Studio de este computador queda aquí: lo que hace cada persona (cada clic que guarda algo, cada pedido) y lo que el Studio hace solo, que firma como «el Studio». Es solo de este computador: vive en <code>.estudio/bitacora.jsonl</code>, no va en git ni sube a ninguna parte, y cada computador tiene la suya. Sirve para auditar lo que pasó: por ejemplo, quién pidió una revisión y con qué botón.</p>
        <label class="filtro-bitacora">Filtrar<input type="search" data-filtro-bitacora value="${esc(filtroBitacora)}" placeholder="Un nombre, un botón, un proyecto…" autocomplete="off" spellcheck="false"></label>
        <div id="lista-bitacora">${filasBitacora()}</div>
      </details>
    </section>`;
}

/** Las filas de la bitácora, con el filtro (sin importar tildes ni mayúsculas, como «Buscar en el Buzón»). */
function filasBitacora() {
  if (!bitacora) return `<p class="como">${errorBitacora ? esc(errorBitacora) : 'Leyendo la bitácora…'}</p>`;
  if (!bitacora.eventos.length) return '<p class="como">Todavía no hay nada anotado en este computador.</p>';
  const nombre = (id?: string) => (id ? d?.proyectos?.find((p) => p.id === id)?.nombre || id : '');
  const filas = bitacora.eventos.filter((e) => coincideBusqueda([e.quien, e.que, e.desde, e.proyecto, nombre(e.proyecto)], filtroBitacora));
  const total = bitacora.eventos.length;
  const cuantas = `${total.toLocaleString('es')} ${total === 1 ? 'acción' : 'acciones'}${bitacora.maximo && total >= bitacora.maximo ? ' (las más nuevas)' : ''}`;
  if (!filas.length) return `<p class="como">Ninguna de las ${cuantas} dice «${esc(filtroBitacora.trim())}». Prueba con menos palabras o con otras.</p>`;
  return `<p class="como">${filas.length === total ? cuantas : `${filas.length.toLocaleString('es')} de ${cuantas}`}, de la más nueva a la más vieja.</p>
        <ul class="lista-bitacora">${filas.map((e) => `<li><span class="f" title="${esc(new Date(e.cuando).toLocaleString('es'))}">${esc(momento(e.cuando))}</span><span class="q">${esc(e.quien)}</span><span>${esc(e.que)}<small>${esc(e.desde)}${e.proyecto ? ` · ${esc(nombre(e.proyecto))}` : ''}</small></span></li>`).join('')}</ul>`;
}

/** Trae la bitácora (`forzar`: aunque lo traído sea reciente) y repinta solo su lista. */
async function cargarBitacora(forzar = false) {
  if (cargandoBitacora || (!forzar && bitacora && Date.now() - bitacora.cuando < FRESCA_BITACORA_MS)) return;
  cargandoBitacora = true;
  try {
    const r = await fetch('/__estudio/director/bitacora', { signal: AbortSignal.timeout(30_000) });
    const x = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(x.error ?? 'No se pudo leer la bitácora.');
    bitacora = { eventos: Array.isArray(x.eventos) ? x.eventos : [], maximo: Number(x.maximo) || 0, cuando: Date.now() };
    errorBitacora = '';
  } catch (e) {
    errorBitacora = esDeRed(e) ? 'No se pudo leer la bitácora: el Studio no respondió.' : `No se pudo leer la bitácora: ${(e as Error).message}`;
  } finally {
    cargandoBitacora = false;
  }
  const lista = document.getElementById('lista-bitacora');
  if (lista) lista.innerHTML = filasBitacora();
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
  const titulo = nuevo ? 'El planteamiento del director' : 'El diagnóstico del director';
  if (!dg.fecha) {
    return `<section class="panel-d sin-diagnostico" data-ancla="p-diagnostico">
        <h3>${titulo}</h3>
        <p class="como">${nuevo
          ? 'Este proyecto es nuevo: no hay repositorio que diagnosticar. Con lo que cuentes en «Qué es el proyecto», el director te devuelve lo que entendió, el alcance, los supuestos, los riesgos y las preguntas abiertas, con dos o tres metas para elegir.'
          : 'El director lee el repositorio (su historial, su estructura, su documentación y su código), detecta lo que está en curso y hacia dónde apunta según sus propios documentos, te dice con franqueza qué está listo, qué falta y qué riesgos ve, y te propone dos o tres metas.'} Pídelo con <b>«Pedir revisión»</b>, arriba.</p>
      </section>`;
  }
  // Lo de cada frente, en un párrafo: lo más listo y lo más flojo, con el veredicto de lo más flojo si es uno solo
  const fr = d.plan.frentes.filter((x) => dg.frentes[x.id]).map((x) => ({ nombre: x.nombre, ...dg.frentes[x.id] }));
  const conNota = (x: (typeof fr)[number]) => `${esc(x.nombre)} (${x.nota} de 5)`;
  const max = Math.max(...fr.map((x) => x.nota));
  const min = Math.min(...fr.map((x) => x.nota));
  const flojos = fr.filter((x) => x.nota === min);
  const compilado = !fr.length ? ''
    : max === min ? `<p class="compilado-frentes"><b>Frente por frente:</b> ${unir(fr.map(conNota))}.</p>`
    : `<p class="compilado-frentes"><b>Lo más listo:</b> ${unir(fr.filter((x) => x.nota === max).map(conNota))}. <b>Lo más flojo:</b> ${unir(flojos.map(conNota))}${flojos.length === 1 && flojos[0].veredicto ? `: ${esc(flojos[0].veredicto.replace(/\.$/, ''))}` : ''}.</p>`;
  const est = dg.estrategia;
  const estrategia = est ? `<h4>La estrategia para este tipo de proyecto</h4><p class="texto-d">${esc(est.texto)}</p><p class="como">Fuentes: ${est.fuentes.map(conEnlaces).join(' · ')}</p>` : '';
  const documento = d.plan.documentos.find((x) => /(^|\/)(diagnostico|planteamiento)\.md$/.test(x.ruta));
  return `<section class="panel-d" data-ancla="p-diagnostico">
      <details class="plegable-d"${plegable('diagnostico', !d.proyecto.objetivo)}>
        <summary><h3>${titulo}</h3><small>del ${fecha(dg.fecha)}</small></summary>
        <ul class="resumen-d">${dg.resumen.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
        ${compilado}
        ${estrategia}
        <div class="acciones-p">${documento ? botonIr({ doc: documento.ruta, etiqueta: 'Leer el documento completo' }, 'boton-suave') : ''}<button type="button" class="al-director" data-comentar="diagnostico|">✉ Comentar ${nuevo ? 'el planteamiento' : 'el diagnóstico'} al director</button></div>
        ${dg.fuentes?.length ? `<details class="detalles-repo"${plegable('diagnostico-fuentes')}><summary>Lo que leyó el director</summary><ul class="adelantado">${dg.fuentes.map((f) => `<li>${conEnlaces(f)}</li>`).join('')}</ul></details>` : ''}
      </details>
    </section>`;
}

// ───────────────────────────────────────────── frentes por fase y excepciones

function vistaFrentes() {
  const actual = faseActual(d.plan, d.estado);
  const sel = celda && d.plan.fases.find((f) => f.id === celda!.fase);
  const activas = excepcionesActivas(d.estado, d.hoy);
  const recientes = d.estado.excepciones.filter((e) => !activas.includes(e)).slice(-8).reverse();
  return `<p class="intro">Lo que hace cada frente en cada fase. <b>En foco</b>: la prioridad de la fase. <b>De apoyo</b>: se trabaja, limitado a lo que dice la celda. <b>En espera</b>: no se abre trabajo nuevo; si de verdad hace falta, se registra una excepción con su razón. Clic en una celda para leerla.</p>
    <div><table class="matriz">
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
  const porDecidir = abiertas.length - pasadas;
  // La barra de la sección: cuántas esperan y, si hay decididas, el filtro entre «Por decidir» y «Todas»
  const filtro = pasadas
    ? `<div class="filtro-propuestas" role="group" aria-label="Qué propuestas ver">
        <button type="button" data-ver-pasadas="0" aria-pressed="${!verPropuestasPasadas}">Por decidir <span class="cifra">${porDecidir}</span></button>
        <button type="button" data-ver-pasadas="1" aria-pressed="${verPropuestasPasadas}">Todas <span class="cifra">${abiertas.length}</span></button>
      </div>`
    : '';
  const barra = abiertas.length
    ? `<div class="barra-propuestas"><p class="cuenta-propuestas">${porDecidir ? `<b>${porDecidir}</b> ${porDecidir === 1 ? 'espera' : 'esperan'} respuesta` : 'Nada espera respuesta'}${pasadas ? ` · ${pasadas} ya ${pasadas === 1 ? 'decidida' : 'decididas'}` : ''}</p>${filtro}</div>`
    : '';
  // Sin nada que decidir a la vista: un estado vacío con su porqué, no una línea suelta
  const vacio = (titulo: string, texto: string, boton = '') => `<div class="vacio-propuestas">${icono('propuestas', 'icono icono-vacio')}<div><b>${titulo}</b><p>${texto}</p>${boton}</div></div>`;
  return `<p class="intro">El director propone y ${esc(nombreTitular())} decide. Cualquiera puede comentar una propuesta: el director responde con su recomendación. Una aceptada se vuelve trabajo de su fase; una descartada queda marcada, y el director no la vuelve a proponer. Aquí ves solo las que esperan respuesta: lo que decides sigue a la vista, para comentarlo, hasta que vuelvas a abrir el Studio.</p>
    ${barra}
    ${abiertas.length ? '' : vacio('Todavía no hay propuestas en la fase en curso', 'El director las trae cuando ve algo que cambiar o decidir. Mientras tanto, la misión de ahora es lo que sigue.')}
    ${abiertas.length && !porDecidir && !verPropuestasPasadas ? vacio('Estás al día: ninguna espera respuesta', `Ya decidiste ${pasadas === 1 ? 'la propuesta de esta fase' : `las ${pasadas} propuestas de esta fase`}. Si quieres volver a mirarlas o comentarlas, están en «Todas».`, `<button type="button" class="boton-suave" data-ver-pasadas="1">Ver las decididas</button>`) : ''}
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
              ${notas.length ? `<ul class="notas-lista">${notas.map((n) => tarjetaNota(n, false, false, false, { vista: 'propuestas', ancla: `propuesta-${p.id}` })).join('')}</ul>` : ''}
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
    <details class="guia-plegada"${plegable('guia-validacion')}><summary>Cómo se hace una validación</summary><p>De 3 a 5 personas que no conocen el proyecto usan lo hecho en una tarea concreta, diciendo en voz alta lo que piensan. Nadie les explica ni les ayuda; tú miras y anotas. Al final, tres preguntas: ¿qué había que hacer?, ¿qué fue lo mejor?, ¿lo volverías a usar (o lo pagarías)? Cuenta más lo que hacen que lo que dicen. Las pruebas técnicas (rendimiento, seguridad, carga) también se registran aquí.</p></details>
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
    <p class="leyenda-d"><span><i style="background:var(--barra-foco)"></i>En foco ${pct(nivel.foco)}</span><span><i style="background:var(--barra-apoyo)"></i>De apoyo ${pct(nivel.apoyo)}</span><span><i style="background:var(--barra-espera)"></i>En espera ${pct(nivel.espera)}</span><span><i style="background:var(--barra-otros)"></i>Otros ${pct(nivel.otros)}</span><span>La meta del director: 60 % o más en foco y poco en espera.</span></p>
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
  return `<p class="intro">Cómo trabaja el equipo con el director en este proyecto, y lo que enseñan los mejores métodos de dirección de proyectos, con su fuente y lo que significa para este proyecto.</p>
    <h3>Cómo funciona el director</h3>
    <ol class="ritmo">
      <li><b>El arranque:</b> conectas el repositorio y cuentas qué buscas; el director lo diagnostica y propone metas; ${esc(nombreTitular())} fija una; el director traza la ruta.</li>
      <li><b>El director asigna:</b> en Misiones, cada uno ve su misión de ahora, paso a paso, y por qué. Una a la vez.</li>
      <li><b>Ustedes hacen y entregan:</b> cada paso se marca con «Listo, ya lo hice» y, al marcar el último, la misión queda entregada. Los documentos se leen y se comentan aquí mismo, parte por parte.</li>
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
  // Los errores del plan le llegan solos al director (su bandeja los pone primero): aquí solo se avisa, sin pedirte nada
  const errores = d.errores.length ? `<details class="aviso remoto"><summary>El director tiene algo por corregir en su plan. No tienes que hacer nada: lo ve y lo corrige solo en su próxima revisión.</summary>${d.errores.map((e) => `<p>${esc(e)}</p>`).join('')}</details>` : '';
  const html = {
    misiones: vistaMisiones, buzon: vistaBuzon, documentos: vistaDocumentos, ruta: vistaRuta, propuestas: vistaPropuestas,
    proyectos: vistaProyectos, proyecto: vistaProyecto, diagnostico: vistaProyecto, frentes: vistaFrentes, validaciones: vistaValidaciones, esfuerzo: vistaEsfuerzo,
    metodo: vistaMetodo, bitacora: vistaBitacora, preguntas: vistaPreguntas, modelo: vistaModelo,
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
  v.innerHTML = errores + html + (vista !== 'documentos' && desdeMision?.vista === vista ? botonVolverMision(desdeMision.id) : '');
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
  const enfocada = enfocadoEn ? cajaEnfocada() : null;
  if (enfocada) enfocada.scrollTop = enfocadoEn;
  if (vista === 'documentos' && irASeccion !== null) {
    const parte = [...v.querySelectorAll<HTMLElement>('[data-parte]')].find((x) => x.dataset.parte === irASeccion);
    // Un documento abre arriba del todo, salvo que el paso nombre una de sus partes o que ya hayas leído algo:
    // entonces abre en el comienzo de la primera parte que te falta, para seguir donde ibas
    // Una parte que aún está cerrada no se salta: se va a la que toca leer ahora
    const cerrada = !!parte?.classList.contains('cerrada');
    const falta = doc && (leidasDe(doc.ruta).length || cerrada) ? v.querySelector<HTMLElement>('.parte-doc.por-leer') : null;
    if (cerrada) decir(`«${irASeccion}» se abre al terminar la parte de ahora: una a la vez.`, 'pensativo');
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
    resaltar(el);
    anclaPendiente = null;
  } else seguirResalte(v);
  tipoValidacionInicial = null;
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

// Cualquier botón que lleve a una sección (la barra lateral, un enlace dentro de un texto). Sin proyectos solo hay la
// bienvenida, y no lleva a ninguna
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-vista]');
  if (!b || b.closest('dialog')) return;
  const v = b.dataset.vista as Vista;
  if (!VISTAS.includes(v)) return;
  if (d) irA(v);
});

// «Detener» las revisiones seguidas: la que está en marcha termina, y el Studio no lanza otra
document.addEventListener('click', (e) => {
  if (!(e.target as HTMLElement).closest('[data-seguidas="detener"]') || !d) return;
  void (async () => {
    const r = await fetch('/__estudio/director/seguidas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ detener: true }), signal: AbortSignal.timeout(30_000) }).catch((x) => x as Error);
    if (r instanceof Error || !r.ok) return avisar(r instanceof Error ? 'No se pudo hablar con el servidor del Studio.' : (await r.json().catch(() => ({}))).error ?? `No se pudo: el servidor respondió ${r.status}.`);
    avisar('Revisiones seguidas detenidas: la que está en marcha termina, y no se lanza otra.');
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
async function comentar(sobre: { tipo: string; id?: string; seccion?: string; decision?: string; fragmento?: string; postura?: string },titulo: string) {
  const general = sobre.tipo === 'general' && !sobre.seccion;
  const r = await pedir({
    titulo,
    ayuda: avisoRevisando() + (general
      ? 'Plantéale un comentario o una idea que quieras que tenga en cuenta. No entra de golpe al proyecto: el director decide <b>cómo y dónde</b> administrarlo según lo que le digas (una misión, una propuesta, un documento o la ruta) y te responde en el <b>Buzón</b>. Hasta que lo lea, lo puedes corregir o borrar.'
      : 'Tu comentario queda en el <b>Buzón del director</b>, donde lo puedes corregir o borrar. Cuando se pida la revisión, él lo lee junto con todo lo demás y te responde ahí y debajo de este mismo lugar, con su recomendación; el titular decide.'),
    campos: [...(pideTipo(sobre as Nota['sobre']) ? [campoTipo()] : []), { id: 'texto', etiqueta: general ? 'Tu comentario o idea (o graba un audio, o pega una imagen)' : 'Tu comentario (o graba un audio, o pega una imagen)', tipo: 'area' }],
    boton: 'Dejarlo en el Buzón',
    audio: true,
    adjuntos: true,
    urgente: true,
    borrador: { proyecto: d.activo, sobre },
    // Se guarda con el ✉ abierto: si el servidor falla, lo escrito, lo grabado y lo adjunto siguen ahí (pd_nada_se_corta)
    guardar: (dicho) => dejarNota(sobre, dicho.texto, dicho.audio, !!dicho.urgente, dicho.adjuntos, dicho.tipoNota),
  });
  // Solo vuelve con algo si la nota quedó en el Buzón
  return !!r;
}

/**
 * El tipo de la nota, obligatorio y de un toque (pedido pd_tipo_obligatorio): con qué intención la escribes, para que el
 * director la lea así y el Buzón la filtre. Si dudas, «No sé: elígelo tú», y el director se lo pone al leerla. En un audio
 * también: lo eliges al enviarlo, así que grabas sin esperar.
 */
function campoTipo(): Campo {
  return { id: 'tipoNota', etiqueta: '¿Qué es?', tipo: 'botones', requerido: true, opciones: OPCIONES_TIPO_DE_NOTA, ayuda: 'Si trae varias cosas, elige la principal: el director separa las demás al responder.' };
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
  await accion({ tipo: 'comentar', sobre, texto: rotulo, tipoNota: 'respuesta', ...(audio ? { audio } : {}), ...(r.adjuntos?.length ? { adjuntos: r.adjuntos } : {}) }, 'Lo que dijiste o adjuntaste quedó también en el Buzón, para el director.');
}

/**
 * Deja una nota en el Buzón. Si es urgente, el servidor se la lleva sola al director, al instante, sin el resto de la
 * revisión (si no puede llamarlo, pide la revisión); el director decide si de verdad lo es.
 */
async function dejarNota(sobre: { tipo: string; id?: string; seccion?: string; decision?: string; fragmento?: string; postura?: string },texto: string | undefined, audio: string | null | undefined, urgente = false, adjuntos?: { nombre: string; datos: string }[], tipoNota?: string) {
  const ok = await accion({ tipo: 'comentar', sobre, texto, audio, urgente, ...(tipoNota ? { tipoNota } : {}), ...(adjuntos?.length ? { adjuntos } : {}) },
    !urgente ? 'Quedó en el Buzón del director. Te responde cuando revise.'
    : automatica() ? 'Lo urgente va solo al director, ahora mismo, y tú sigues con lo tuyo. Te trae el resultado en «¿Dónde quedamos?»; lo demás del Buzón espera la revisión.'
    : 'Quedó en el Buzón, marcada urgente, y la revisión quedó pedida: el director la atiende primero.');
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
  if (lista) lista.innerHTML = filasBitacora();
});

$('vista').addEventListener('change', async (e) => {
  // Lo marcado y el alcance de cada permiso negado se recuerdan: un repintado no los borra
  const negado = e.target as HTMLInputElement & HTMLSelectElement;
  if (negado.dataset?.permisoNegado !== undefined) return void (negado.checked ? permisosMarcados.add(negado.dataset.permisoNegado) : permisosMarcados.delete(negado.dataset.permisoNegado));
  if (negado.dataset?.alcancePermiso !== undefined) return void alcanceElegido.set(negado.dataset.alcancePermiso, negado.value === 'todos' ? 'todos' : 'proyecto');
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
    // Un paso de terminal con su comprobación: el Studio la corre antes de marcarlo; si no se cumple, no se marca
    const conComprobar = d.plan.misiones.find((x) => x.id === id)?.pasos[Number(i)];
    if (casilla.checked && typeof conComprobar !== 'string' && conComprobar?.comprobar) {
      casilla.checked = false;
      casilla.disabled = true;
      // Mientras se comprueba, «No me salió» de ese paso espera: no se cruza una entrega con la comprobación
      const noSalio = $('vista').querySelector<HTMLButtonElement>(`[data-no-salio="${CSS.escape(`${id}|${i}`)}"]`);
      if (noSalio) noSalio.disabled = true;
      decir('Déjame comprobar que la orden hizo lo que debía…', 'pensativo');
      const r = await fetch('/__estudio/director/comprobar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mision: id, paso: Number(i) }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
      casilla.disabled = false;
      if (noSalio) noSalio.disabled = false;
      // Si la misión dejó de estar abierta mientras tanto (se entregó, la revisó el director), no se marca nada
      const m = d.plan.misiones.find((x) => x.id === id);
      if (!m || !['pendiente', 'en_curso', 'rehacer'].includes(estadoMision(m, d.plan, d.estado))) return;
      if (r instanceof Error) return avisar('No se pudo comprobar el paso: el Studio no respondió. Vuelve a marcarlo en un momento.');
      const c = await r.json().catch(() => ({}));
      if (!r.ok) return avisar(c.error ?? 'No se pudo comprobar el paso.');
      if (!c.cumple) {
        decir('Todavía no: la orden no dejó lo que esperaba. Mira el aviso.', 'pensativo');
        // Sin salida, la persona quedaba atrapada en un paso que no le sale: puede dejárselo al director y seguir
        const encontrado = recortar(String(c.encontrado ?? ''), 160);
        return avisar(`Aún no está: esperaba ${c.espera}, y encontré: «${encontrado}». Revisa lo que dijo la terminal y vuelve a marcar el paso. Si no te sale, déjamelo y sigue con otra misión.`, false, undefined,
          { etiqueta: 'No me sale: sigo con otra', hacer: () => void seguirConOtra(id, Number(i), `Al comprobarlo, el Studio esperaba ${c.espera} y encontró: «${encontrado}».`) });
      }
      casilla.checked = true;
      avisar('Hecho: lo comprobé. La orden dejó lo que debía.', true);
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
        decir(`¡Bien! Lo que sigue: ${recortar(texto(m.pasos[sigue]), 110)}`, 'feliz');
        // Por si fue sin querer: deshacerlo está a un clic (después, «Desmarcar» en «Completado»)
        const comprobado = typeof conComprobar !== 'string' && !!conComprobar?.comprobar;
        avisar(`${comprobado ? 'Hecho: lo comprobé. ' : ''}Paso ${Number(i) + 1} marcado como hecho.`, true, undefined, { etiqueta: 'Deshacer', hacer: () => { void marcarPaso(id, Number(i), false); pintar(); } });
      }
      else if (m && (await completarSiToca(id, guardado))) decir('¡Misión completada! La reviso cuando me pidas la revisión.', 'riendo');
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
    if (r instanceof Error) return avisar('No se pudo guardar el modelo: el Studio no respondió.');
    const x = await r.json().catch(() => ({}));
    if (!r.ok) return avisar(x.error ?? 'No se pudo guardar el modelo.');
    Object.assign(d, { modelo: x.modelo ?? null, esfuerzo: x.esfuerzo ?? null, esfuerzoGuardado: x.esfuerzoGuardado ?? null });
    pintar();
    return avisar(`${d.modelo ? `Claude Code trabaja con ${MODELOS.find((m) => m.id === d.modelo)?.nombre ?? d.modelo}, como con /model.` : 'Claude Code vuelve al modelo de tu cuenta.'} ${CUANDO_RIGE}`, true);
  }
  // Tu plan de Claude, para ver lo gastado en lo que cuesta de tu plan y no a precio de API (pd_costo_plan)
  const sp = (e.target as HTMLElement).closest<HTMLSelectElement>('[data-plan-claude]');
  if (sp) {
    const r = await fetch('/__estudio/director/plan-de-claude', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: sp.value || null }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
    if (r instanceof Error) return avisar('No se pudo guardar tu plan: el Studio no respondió.');
    const x = await r.json().catch(() => ({}));
    if (!r.ok) return avisar(x.error ?? 'No se pudo guardar tu plan.');
    d.planDeClaude = esPlanDeClaude(x.planDeClaude) ? x.planDeClaude : null;
    pintar();
    const p = d.planDeClaude;
    return avisar(!p ? 'Lo que gasta el director vuelve a decirse a precio de API.' : PLANES_DE_CLAUDE[p].mes === null ? 'Con una clave de API pagas por uso: lo que gasta el director, a precio de API, es lo que de verdad pagas.' : `Lo que gasta el director se dice ahora como parte de tu plan ${PLANES_DE_CLAUDE[p].nombre}: la parte de tu semana que gastó cada lanzamiento y su equivalente aproximado en dólares.`, true);
  }
  const se = (e.target as HTMLElement).closest<HTMLSelectElement>('[data-esfuerzo]');
  if (se) {
    const r = await fetch('/__estudio/director/esfuerzo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ esfuerzo: se.value }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
    if (r instanceof Error) return avisar('No se pudo guardar el esfuerzo: el Studio no respondió.');
    const x = await r.json().catch(() => ({}));
    if (!r.ok) return avisar(x.error ?? 'No se pudo guardar el esfuerzo.');
    Object.assign(d, { modelo: x.modelo ?? null, esfuerzo: x.esfuerzo ?? null, esfuerzoGuardado: x.esfuerzoGuardado ?? null });
    pintar();
    if (d.esfuerzo === 'max') return avisar('El director y la terminal que abres aquí trabajan con esfuerzo máximo. Claude Code no lo guarda en su configuración, así que tus otras sesiones siguen con el que tenían (en ellas, /effort max). El director lo usa desde lo próximo que le pidas, sin reiniciar nada.', true);
    return avisar(`${d.esfuerzo ? `Claude Code trabaja con esfuerzo ${ESFUERZOS.find((x) => x.id === d.esfuerzo)?.nombre.toLowerCase() ?? d.esfuerzo}, como con /effort.` : 'Claude Code vuelve al esfuerzo de tu cuenta.'} ${CUANDO_RIGE}`, true);
  }
  // «Todo con el modelo que elegí» (pr_modelos_por_tarea, punto 4): los ayudantes del director, con su mismo modelo
  const tm = (e.target as HTMLElement).closest<HTMLInputElement>('[data-todo-modelo]');
  if (tm) {
    const r = await fetch('/__estudio/director/todo-con-el-modelo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ si: tm.checked }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
    if (r instanceof Error) return avisar('No se pudo guardar: el Studio no respondió.');
    const x = await r.json().catch(() => ({}));
    if (!r.ok) return avisar(x.error ?? 'No se pudo guardar.');
    d.todoConElModelo = x.todoConElModelo === true;
    pintar();
    return avisar(d.todoConElModelo ? 'Desde su próximo lanzamiento, los ayudantes del director trabajan con el mismo modelo que él: gasta más.' : 'Desde su próximo lanzamiento, los ayudantes del director vuelven a trabajar con un modelo más barato.', true);
  }
  const su = (e.target as HTMLElement).closest<HTMLInputElement>('[data-ultracode]');
  if (su) {
    const r = await fetch('/__estudio/director/ultracode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: su.checked }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
    if (r instanceof Error) return avisar('No se pudo guardar ultracode: el Studio no respondió.');
    const x = await r.json().catch(() => ({}));
    if (!r.ok) return avisar(x.error ?? 'No se pudo guardar ultracode.');
    d.ultracode = x.ultracode === true;
    d.ultracodeDirector = x.ultracodeDirector === true;
    pintar();
    // Al encenderlo, si al director le falta el permiso, el Studio se lo pide (lo que el director necesita, se pide)
    if (d.ultracode && !d.ultracodeDirector) return cambiarPermisoUltracode(true).then(() => { if (!d.ultracodeDirector) avisar('Ultracode encendido para tus sesiones nuevas de Claude Code en este computador. El director sigue sin él: «Darle el permiso al director» está debajo.', true); });
    return avisar(d.ultracode ? 'Ultracode encendido para tus sesiones nuevas de Claude Code y para el director desde su próximo lanzamiento.' : `Ultracode apagado para tus sesiones nuevas de Claude Code en este computador${d.ultracodeDirector ? ' y para el director' : ''}.`, true);
  }
  const sync = (e.target as HTMLElement).closest<HTMLInputElement>('[data-sincronizar]');
  if (sync) await accion({ tipo: 'sincronizar', activo: sync.checked }, sync.checked ? 'Desde ahora, lo que decide cada persona sube solo a GitHub.' : 'La subida a GitHub quedó apagada: todo queda en commits locales.');
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
  decir('Primero termina de leer lo que sigue bajo la niebla: te muestro por dónde seguir. Cuando esté todo destapado, esto se puede usar.', 'pensativo');
}, true);

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
  } else if (ds.guardarAjustes !== undefined) {
    // Tus ajustes de Claude Code en el director, clave por clave: sin ellos, conserva las marcadas
    const marcadas = [...(b.closest('[data-ancla="m-ajustes"]')?.querySelectorAll<HTMLInputElement>('[data-ajuste]') ?? [])].filter((c) => c.checked).map((c) => c.dataset.ajuste!);
    await cambiarAjustesPropios(false, marcadas);
  } else if (ds.cargarAjustes !== undefined) {
    await cambiarAjustesPropios(true);
  } else if (ds.autorizarPermisos !== undefined) {
    // Lo que se le negó al director, autorizado con su casilla y su alcance, en un solo envío
    const marcados = (panelPermisos?.pendientes ?? []).filter((n) => n.regla && !n.nunca && permisosMarcados.has(clavePermiso(n)));
    if (!marcados.length) return avisar('Marca al menos un permiso para autorizarlo.');
    const guardado = await cambiarPermisos({ autorizar: marcados.map((n) => ({ regla: n.regla!, proyecto: n.proyecto, alcance: alcanceElegido.get(clavePermiso(n)) ?? 'proyecto' })) });
    // «Autorizo y pido la revisión»: el mismo clic pide la revisión del proyecto activo, porque el botón lo dice
    if (guardado && ds.autorizarPermisos === 'revision') await pedirLaRevision(true, 'permisos');
  } else if (ds.quitarPermiso) {
    const q = JSON.parse(ds.quitarPermiso) as { regla: string; alcance: string; proyecto?: string };
    if (await confirmar({ titulo: '¿Le quitas este permiso al director?', texto: `Desde su próximo lanzamiento, el director ya no podrá: ${q.regla}. Si lo vuelve a necesitar, se le negará y aparecerá otra vez aquí, para que decidas.`, boton: 'Quitárselo', cancelar: 'Dejárselo' })) await cambiarPermisos({ quitar: [q] });
  } else if (ds.corregirTranscripcion) {
    const audio = ds.corregirTranscripcion;
    // Sin transcripción (no se pudo en este computador), se escribe lo que se dijo, y el audio se borra al guardarlo
    const sinTexto = d.transcripciones[audio] === undefined;
    const r = await pedir({
      titulo: sinTexto ? 'Escribir lo que dijiste' : 'Corregir lo que se entendió',
      ayuda: sinTexto
        ? 'Tu audio no se pudo transcribir en este computador. Escribe lo que dijiste: es lo que leerá el director, y al guardarlo el audio se borra, como cuando se transcribe.'
        : 'Es lo que leerá el director de tu nota de voz. Corrígelo solo si la transcripción entendió mal: el audio queda igual.',
      campos: [{ id: 'texto', etiqueta: 'Lo que dijiste', tipo: 'area', valor: d.transcripciones[audio] ?? '', requerido: true }],
      boton: 'Guardar',
    });
    if (r && (await accion({ tipo: 'corregir_transcripcion', audio, texto: r.texto }, 'Transcripción corregida.'))) {
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
    if (hilo) await navigator.clipboard.writeText(hiloEnTexto(hilo.notas)).then(() => avisar('Conversación copiada, en Markdown.', true), () => avisar('No se pudo copiar.'));
  } else if (ds.seguirHilo) {
    // Lo que se sigue preguntando o comentando sobre una respuesta queda en su misma conversación, guardado con el ✉
    // abierto: si el servidor falla, nada se pierde (pd_nada_se_corta)
    const hilo = ds.seguirHilo;
    await pedir({ titulo: 'Seguir la conversación', ayuda: avisoRevisando() + 'Pregunta algo más o comenta la respuesta: queda en esta misma conversación y el director lo responde en su próxima revisión.', campos: [{ id: 'texto', etiqueta: 'Lo que quieres agregar (o graba un audio, o pega una imagen)', tipo: 'area' }], boton: 'Agregar a la conversación', audio: true, adjuntos: true,
      guardar: async (r) => {
        hilosAbiertos.add(raizDePregunta(d.estado.notas.find((n) => n.id === hilo)!, d.estado.notas).id);
        return accion({ tipo: 'comentar', sobre: { tipo: 'pregunta', id: hilo }, texto: r.texto ?? '', audio: r.audio, ...(r.adjuntos?.length ? { adjuntos: r.adjuntos } : {}) },'Agregado a la conversación: el director lo responde en su próxima revisión.');
      } });
  } else if (ds.fase) {
    faseVista = ds.fase;
    pintar();
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
    if (deMision && dest?.doc) desdeMision = { id: deMision, ruta: dest.doc };
    else if (deMision && dest && !dest.url && !(dest.vista === 'buzon' && dest.ancla === 'escribir')) {
      const a = vistaDeDestino(dest);
      if (a && a !== 'misiones') desdeMision = { id: deMision, vista: a };
    }
    await ir(dest);
    // Una página de afuera se abre en otra pestaña: el paso se repinta aquí, ya con sus opciones
    if (abre && dest.url) pintar();
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
    // Los pasos marcados aquí se guardan antes de entregar: si el guardado del último falló, la entrega no se va sin él
    const hechos = pasosHechos(m.id);
    if (r && m.pasos.length && hechos.length && !(await accion({ tipo: 'paso', mision: m.id, hechos }, ''))) return;
    if (r && (await accion({ tipo: 'entregar', mision: m.id, nota: r.nota, audio: r.audio }, `¡Bien hecho! Entregada: el director la revisa en su próxima revisión y, al aprobarla, sumas ${m.xp} XP.`))) {
      sonar('entrega');
      await anexar(r, { tipo: 'mision', id: m.id }, `Con la entrega de «${m.titulo}»`, false);
    }
  } else if (ds.deshacerEntrega) {
    await accion({ tipo: 'deshacer_entrega', mision: ds.deshacerEntrega });
  } else if (ds.copiarOrden !== undefined) {
    await navigator.clipboard.writeText(ds.copiarOrden).then(() => avisar('Orden copiada: pégala en tu terminal y oprime Enter.', true), () => avisar('No se pudo copiar.'));
  } else if (ds.copiarTexto !== undefined) {
    await navigator.clipboard.writeText(ds.copiarTexto).then(() => avisar('Texto copiado: pégalo donde dice el paso (Ctrl + V).', true), () => avisar('No se pudo copiar: selecciona el texto con el ratón y cópialo con Ctrl + C.'));
  } else if (ds.terminal) {
    // La ventana se abre en este computador, con la orden corriendo; el paso se marca a mano cuando termine
    const [mision, i] = ds.terminal.split('|');
    b.setAttribute('disabled', '');
    const r = await fetch('/__estudio/director/terminal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mision, paso: Number(i) }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
    b.removeAttribute('disabled');
    if (r instanceof Error) return avisar('No se pudo hablar con el servidor del Studio.');
    if (!r.ok) return avisar((await r.json().catch(() => ({}))).error ?? 'No se pudo abrir la terminal.');
    const p = d.plan.misiones.find((x) => x.id === mision)?.pasos[Number(i)];
    avisar(`Se abrió una ventana de terminal con la orden corriendo. Cuando diga que terminó, oprime «Ya lo hice»${typeof p !== 'string' && p?.comprobar ? ': el Studio comprueba que salió bien y marca el paso' : ' y el paso se marca'}.`, true);
  } else if (ds.acuerdo) {
    // Si está de acuerdo con la nota de quien califica en un caso de la medición del núcleo
    const [corrida, caso, de] = ds.acuerdo.split('|');
    b.setAttribute('disabled', '');
    const r = await fetch('/__estudio/director/medicion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acuerdo: { corrida, caso, de: de === 'si' } }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
    b.removeAttribute('disabled');
    if (r instanceof Error) return avisar('No se pudo hablar con el servidor del Studio.');
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return avisar(j.error ?? 'No se pudo guardar.');
    if (j.medicion) d.medicion = j.medicion;
    pintar();
  } else if (ds.medir) {
    // La medición del núcleo: se pide con su costo a la vista, en un diálogo, y se detiene al terminar la vuelta que corre
    const pedirla = ds.medir === 'pedir';
    let cuerpo: { pedir: true; alcance: AlcanceMedicion } | { pedir: true; casos: string[] } = { pedir: true, alcance: 'todos' };
    if (pedirla) {
      const m = d.medicion;
      const e = m?.estimado;
      const total = m?.casos ?? 0;
      // Con una medición anterior, lo que ya pasa no se vuelve a correr: se eligen uno por uno los que fallan, o todos
      // para una base nueva (nota de voz del titular nmvsgcn7otit, 28 de octubre de 2026)
      const elegir = !!m?.ultima;
      const cuanto = (x: { estimado: EstadoMedicion['estimado']; minutos: number | null } | undefined) => [x?.estimado ? `unos ${dolares(x.estimado.total)}` : '', x?.minutos ? duracionAprox(x.minutos) : ''].filter(Boolean).join(' y ');
      const unCaso = cuanto(m?.unCaso);
      const todos = cuanto(m?.alcances?.find((a) => a.alcance === 'todos'));
      const opciones: [string, string][] = [
        ...(m?.fallan ?? []).map((c): [string, string] => [c.id, `«${c.titulo}», que falla${unCaso ? ` (${unCaso})` : ''}`]),
        ['todos', `Todos los ${total} casos, una base nueva: al cambiar de modelo o de esfuerzo${todos ? ` (${todos})` : ''}`],
      ];
      const si = await pedir({
        titulo: 'Medir el núcleo del director',
        ayuda: elegir
          ? `Lo que ya pasa no se vuelve a medir: es largo, y lo que el código puede comprobar lo comprueba sin gastar nada al cerrar cada revisión. Marca cuáles de los que fallan quieres medir, para ver si un cambio los arregló; cada uno son dos revisiones de prueba del director de verdad, con el modelo y el esfuerzo que elegiste. ${m?.fallan?.length ? '' : 'Ahora no falla ninguno. '}Lo que cuesta va a precio de API; con un plan de suscripción no se cobra aparte: es parte de tus límites. Mientras mide, no se lanza ningún director; la puedes detener cuando quieras.`
          : `El director de verdad hace ${total} revisiones de prueba, dos por caso, con el modelo y el esfuerzo que elegiste. ${e ? `A precio de API cuesta ${cuantoCuesta(e)}, y como mucho unos ${dolares(e.porVuelta)} más por cada caso que salga distinto en sus dos vueltas. Con un plan de suscripción no se cobra aparte: lo que gasta es parte de tus límites.` : 'Lo que cuesta se sabe al terminar: es como una revisión por cada vuelta.'} Mientras mide, no se lanza ningún director; la puedes detener cuando quieras.`,
        campos: elegir ? [{ id: 'casos', etiqueta: 'Qué casos medir', tipo: 'casillas', opciones, requerido: true }] : [],
        boton: 'Medir',
        vacioVale: true,
      });
      if (!si) return;
      const marcados = (si.casos ?? '').split(',').filter(Boolean);
      if (elegir && !marcados.includes('todos')) cuerpo = { pedir: true, casos: marcados };
    }
    b.setAttribute('disabled', '');
    const r = await fetch('/__estudio/director/medicion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pedirla ? cuerpo : { detener: true }), signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
    b.removeAttribute('disabled');
    if (r instanceof Error) return avisar('No se pudo hablar con el servidor del Studio.');
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return avisar(j.error ?? 'No se pudo.');
    if (j.medicion) d.medicion = j.medicion;
    avisar(pedirla ? 'La medición empezó: cada vuelta es una revisión de prueba, y lo que sale aparece aquí a medida que termina.' : 'La medición se detiene al terminar la vuelta que está corriendo: lo hecho queda guardado.', true);
    pintar();
  } else if (ds.abrirClaude !== undefined) {
    // Claude Code en una terminal nueva, como lo lanza el Studio; es una sesión tuya, aparte del Studio
    b.setAttribute('disabled', '');
    const r = await fetch('/__estudio/director/abrir-claude', { method: 'POST', signal: AbortSignal.timeout(30_000) }).catch((e) => e as Error);
    b.removeAttribute('disabled');
    if (r instanceof Error) return avisar('No se pudo hablar con el servidor del Studio.');
    if (!r.ok) return avisar((await r.json().catch(() => ({}))).error ?? 'No se pudo abrir la terminal.');
    avisar('Se abrió una ventana de terminal con Claude Code, con el mismo modelo y el mismo esfuerzo. Lo que hagas ahí es tuyo: te pide permiso para cada cosa.', true);
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
    if (!(await accion({ tipo: 'comentar', sobre }, 'Listo: el paso queda con lo que le contaste en tu comentario.'))) b.removeAttribute('disabled');
  } else if (ds.hazlo) {
    // «Hazlo tú»: primero, qué hará el director; con el segundo clic, el encargo queda en el Buzón y el paso se marca solo.
    // No se ejecuta ahora: lo hace en su revisión siguiente
    const [id, i] = ds.hazlo.split('|');
    const p = d.plan.misiones.find((x) => x.id === id)?.pasos[Number(i)];
    const que = p && typeof p !== 'string' ? p.hazlo : undefined;
    if (!que) return;
    const si = await confirmar({
      titulo: '¿Se lo encargas al director?',
      texto: `Lo que hará: ${que}\n\nNo lo hace ahora: tu encargo queda en el Buzón, firmado, y lo hace en su ${revisando() ? 'revisión siguiente (ya empezó la de ahora)' : 'próxima revisión'}, con las normas del proyecto. Te cuenta el resultado en su respuesta, aquí mismo en el paso. El paso queda marcado.`,
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
    // Comentar una idea no la marca ni avanza: solo «Entendido» lleva a la siguiente, porque se puede comentar una idea
    // (o varias líneas suyas) más de una vez antes de darla por entendida (nota de voz del titular, 24 de octubre de 2026)
  } else if (ds.aprobar !== undefined) {
    // Aprobar lo que recomienda el director: un clic, sin escribir; queda en el Buzón como tu respuesta, firmada
    const [ruta, seccion, decision] = ds.aprobar.split('|');
    b.setAttribute('disabled', '');
    if (await accion({ tipo: 'comentar', sobre: { tipo: 'documento', id: ruta, seccion, decision, postura: 'aprueba' } }, 'Aprobado: quedó en el Buzón como tu respuesta.')) await decisionRespondida(ruta, seccion);
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
  } else if (ds.borrarNota) {
    if (await confirmar({ titulo: '¿Quitar esta nota?', texto: 'El director nunca la verá.', boton: 'Quitar', peligro: true })) await accion({ tipo: 'borrar_nota', id: ds.borrarNota }, 'Quitada.');
  } else if (ds.editarNota) {
    // Una nota de voz se corrige en lo que se entendió de ella (el audio queda igual); una escrita, en su texto. Y a
    // cualquiera se le suma algo hablando (nota de voz del titular nmvonrzz6tit, 25 de octubre de 2026; pedido
    // pd_tipo_voz): lo grabado se transcribe en este computador al guardar y queda al final de la nota escrita o, si
    // solo es de voz, de lo que se entendió de ella. El audio nuevo no se guarda: solo su texto
    const n = d.estado.notas.find((x) => x.id === ds.editarNota)!;
    const dicho = n.audio ? d.transcripciones[n.audio] : undefined;
    const conTexto = !!(n.texto || !dicho);
    // Para rehacer una parte con la voz (pd_tipo_voz): la selección de cada campo sigue ahí al oprimir «Grabar» y «Guardar»;
    // vale la del último campo que tocaste
    let ultimoCampo: Marca['campo'] | null = null;
    const marcaAlGuardar = () => marcaDeCampos((['texto', 'dicho'] as const).flatMap((campo) => {
      const t = $('dialogo').querySelector<HTMLTextAreaElement>(`textarea[name="${campo}"]`);
      return t ? [{ campo, inicio: t.selectionStart, fin: t.selectionEnd }] : [];
    }), ultimoCampo);
    const corrigiendo = pedir({
      titulo: 'Corregir la nota',
      ayuda: `El director solo verá lo que quede aquí cuando revise.${dicho ? ' Si la transcripción entendió mal tu audio, corrígela: el audio queda igual.' : ''} Para sumarle algo hablando, oprime «Grabar»: al guardar, lo que digas se transcribe en tu computador y queda al final de ${conTexto ? 'tu nota' : 'lo que dijiste'}. Para rehacer una parte con la voz, márcala antes de grabar: lo que digas la reemplaza. Para sumarle una imagen, pégala con Ctrl + V o adjúntala, como al escribirla${n.adjuntos?.length ? '; y para quitar una que ya tiene, márcala abajo' : ''}.`,
      campos: [
        ...(conTexto ? [{ id: 'texto', etiqueta: 'Tu nota', tipo: 'area' as const, valor: n.texto ?? '' }] : []),
        ...(dicho ? [{ id: 'dicho', etiqueta: 'Lo que dijiste en el audio', tipo: 'area' as const, valor: dicho, requerido: true }] : []),
      ],
      boton: 'Guardar',
      audio: true,
      // Las imágenes también se corrigen: se suman pegándolas o adjuntándolas, y se quitan con su casilla (notas de voz
      // del titular nmvosyiartit y nmvot02hhtit, 26 de octubre de 2026; pedido pd_corregir_adjuntos)
      adjuntos: true,
      actuales: n.adjuntos ?? [],
      vacioVale: true,
      guardar: async (r) => {
        let texto: string | undefined = r.texto;
        let nuevo: string | undefined = r.dicho;
        // Si vació lo que se entendió de su audio y grabó, lo dicho lo reemplaza (nota de voz nmvpmv30ytit)
        const reemplaza = !!(r.audio && dicho && !(nuevo ?? '').trim());
        const marca = r.audio ? marcaAlGuardar() : null;
        if (r.audio) {
          const sumado = await dictar(r.audio);
          if (sumado === null) return false;
          ({ texto, dicho: nuevo } = repartirDictado({ texto, dicho: nuevo }, sumado, marca));
        }
        // Lo que se entendió de un audio no queda vacío: se dice antes de guardar nada, con lo que puede hacer
        if (dicho && nuevo !== undefined && !nuevo.trim()) {
          avisar('Lo que dijiste en el audio no puede quedar vacío: escríbelo o graba lo que quieres decir.');
          return false;
        }
        const alGuardar = r.audio ? (marca ? 'Corregida: lo que dijiste reemplazó lo que marcaste.' : reemplaza ?'Corregida: lo que dijiste reemplazó lo que se entendió del audio.' : `Corregida: lo que dijiste quedó al final de ${conTexto ? 'tu nota' : 'lo que dijiste'}.`) : 'Corregida.';
        const conAdjuntos = !!(r.adjuntos?.length || r.quitarAdjuntos?.length);
        const cambioTexto = texto !== undefined && texto.trim() !== (n.texto ?? '').trim();
        if ((cambioTexto || conAdjuntos) && !(await accion({ tipo: 'editar_nota', id: n.id, texto: texto ?? n.texto ?? '', ...(r.adjuntos?.length ? { adjuntos: r.adjuntos } : {}), ...(r.quitarAdjuntos?.length ? { quitarAdjuntos: r.quitarAdjuntos } : {}) }, alGuardar))) return false;
        if (dicho && nuevo !== undefined && nuevo.trim() !== dicho.trim()) {
          if (!(await accion({ tipo: 'corregir_transcripcion', audio: n.audio, texto: nuevo }, alGuardar))) return false;
          d.transcripciones[n.audio!] = nuevo.trim(); // el .txt ya cambió: se muestra sin esperar a la próxima lectura
          pintar();
        }
        return true;
      },
    });
    // El diálogo ya está en pantalla: se anota el último campo que tocas, para saber cuál marcaste
    const mientras = new AbortController();
    $('dialogo').addEventListener('focusin', (e) => {
      const nombre = (e.target as HTMLTextAreaElement).name;
      if (nombre === 'texto' || nombre === 'dicho') ultimoCampo = nombre;
    }, { signal: mientras.signal });
    await corrigiendo;
    mientras.abort();
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
      sonar('logro');
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
  } else if (ds.replantearObjetivo !== undefined) {
    // «Replantear la meta»: la de ahora, lista para cambiarla; al guardarla se pide la revisión, y el director hace un
    // análisis fresco del proyecto hacia la meta nueva y ajusta la ruta (decidido en «Un Studio más simple»)
    const o = d.proyecto.objetivo;
    if (!o) return;
    const r = await pedir({
      titulo: 'Replantear la meta',
      ayuda: 'Cambia lo que haga falta. Al guardarla, el Studio le pide la revisión al director: hace un análisis fresco del proyecto hacia la meta nueva y ajusta la ruta. La de ahora queda en «Metas anteriores», con tu porqué si lo dices.',
      campos: [
        { id: 'texto', etiqueta: 'La meta: a dónde quieres llegar', tipo: 'area', requerido: true, valor: o.texto },
        { id: 'exito', etiqueta: 'Cómo sabremos que se cumplió', tipo: 'area', requerido: true, valor: o.exito },
        { id: 'horizonte', etiqueta: 'Horizonte (opcional: un hito, no un plazo)', tipo: 'texto', valor: o.horizonte ?? '' },
        { id: 'motivo', etiqueta: 'Por qué la replanteas (opcional; escrito o en audio)', tipo: 'area' },
      ],
      boton: 'Guardar y pedir la revisión',
      audio: true,
      adjuntos: true,
      vacioVale: true,
    });
    if (!r) return;
    if (!r.texto?.trim() || !r.exito?.trim()) return void avisar('Una meta clara dice qué se logra y cómo se sabe que se logró: escribe las dos.');
    const igual = r.texto.trim() === o.texto && r.exito.trim() === o.exito && (r.horizonte?.trim() ?? '') === (o.horizonte ?? '');
    if (igual) return void avisar('La meta quedó igual: no cambié nada.', true);
    const motivo = r.motivo?.trim() || (r.audio ? EN_AUDIO : '');
    if (!(await accion({ tipo: 'replantear_objetivo', texto: r.texto, exito: r.exito, horizonte: r.horizonte ?? '', motivo }, ''))) return;
    await anexar(r, { tipo: 'objetivo' }, 'Al replantear la meta');
    await pedirLaRevision(true, 'meta');
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

/** El comentario al director en general (el director flotante, el Buzón): el mismo diálogo único, sobre nada en particular. */
async function escribirAlDirector() {
  await comentar({ tipo: 'general' }, 'Un comentario para el director');
}

/**
 * La tecla N abre el diálogo único sobre lo que estás mirando (tu elección del 26 de octubre de 2026): el ✉ que está más
 * cerca del centro de la pantalla (una idea, una parte, un paso), como si lo oprimieras; sin ninguno a la vista, el
 * comentario general. Solo cuando no escribes en un campo ni hay otro diálogo abierto, y sin Ctrl, Alt ni Cmd.
 */
document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() !== 'n' || e.ctrlKey || e.metaKey || e.altKey || e.repeat || !d) return;
  const foco = document.activeElement as HTMLElement | null;
  if (foco && (foco.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(foco.tagName))) return;
  if (document.querySelector('dialog[open]')) return;
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
    titulo: lista.length === 1 ? 'Tienes un borrador sin enviar' : `Tienes ${lista.length} borradores sin enviar`,
    texto: `El director no los lee: solo lo enviado le llega.\n\n${lista.map((b) => `• ${lineaDeBorrador(b)}`).join('\n')}\n\n¿Pides la revisión sin ${lista.length === 1 ? 'él' : 'ellos'}, o lo${lista.length === 1 ? '' : 's'} ves antes?`,
    boton: 'Pedir la revisión sin ellos',
    cancelar: lista.length === 1 ? 'Ver mi borrador' : 'Ver el primero',
  });
  if (!sigue) void comentar(lista[0].sobre, lista[0].titulo);
  return sigue;
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
  ponerTextoCubierta(`El servidor del Studio está tardando en responder (lleva ${s} s). Sigue esperando${s >= 60 ? '; si no avanza, su registro está en .estudio/servidor.log' : ''}.`);
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
    // voz del titular, 27 de octubre de 2026, pedido pd_parada_visible). Después, si el director aprobó algo tuyo, se celebra
    // (?mirar: el director lo mira sin pantalla y el resumen taparía la vista; no cuenta como visita)
    if (pedido.has('mirar')) {
      /* nada que mostrar encima */
    } else if (termino || (tocaResumen() && (d.plan.resumen || d.arranque === 'en_marcha'))) void mostrarDondeQuedamos().then(celebrarSiToca);
    else {
      localStorage.setItem(claveVisto(d.activo), new Date().toISOString());
      void celebrarSiToca();
    }
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
    $('vista').innerHTML = `<p class="aviso remoto">No se pudo cargar el Director: ${esc((e as Error).message)}</p>`;
  })
  // La cubierta de carga sale cuando el Studio ya está pintado entero (nunca se ve a medio cargar)
  .finally(() => requestAnimationFrame(quitarCubierta));
// Por si algo se queda colgado: la cubierta nunca tapa el Studio más de 20 segundos
setTimeout(quitarCubierta, 20_000);
// Lo que dice el director cambia mientras se trabaja: se relee al volver
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && d && !ocupado()) cargar(true).catch(() => undefined);
});
