// El Director asistente en el servidor local (solo con `npm run estudio`).
//
// Un Estudio, varios proyectos (src/director/proyectos.ts): la memoria de cada uno (su contexto, su ruta, su buzón y su
// historial) vive en SU repositorio, en la carpeta .stl/ (rama stl), y aquí se nombra proyectos/<id>/…. El Estudio solo
// guarda su código y estudio.local.json (el proyecto activo y la carpeta de cada repositorio, fuera de git). Todo lo que
// muestra y decide el Estudio es del proyecto activo de este computador. Cada Estudio escribe solo el archivo de su
// persona en ese proyecto (y la transcripción de sus audios: el audio nunca entra a git y se borra apenas su texto queda
// escrito) y el titular, además, lo del proyecto (proyecto.json). Cada decisión queda en un
// commit local en la memoria del proyecto (sincronizar.ts), y la memoria se respalda entera en GitHub (respaldo.ts). Lo de las otras personas, la ruta y las respuestas del director (plan.json, que escribe la sesión del
// director), las transcripciones y los documentos se leen de donde estén más nuevos (src/director/fresco.ts). Del
// repositorio del proyecto, fuera de su memoria, el Studio solo lee.
//
// GET /__estudio/director: el proyecto activo (su ruta, su estado, su repositorio, sus señales) y el resumen de todos.
// GET /documentos y /documento?ruta=docs/…|repo:…: para leer y comentar. GET /archivo?ruta=proyectos/…/notas/…: un
// audio (mientras no se haya transcrito) o un adjunto de una nota. POST /proyecto-nuevo: abre la memoria en el repositorio, crea el proyecto desde la plantilla (o retoma el que ya
// tenía) y lo activa; se entrega un proyecto a la vez (nmwcw9ayjtit). POST /activo: cambia el proyecto activo. POST
// /repositorio: la carpeta nueva del repositorio del proyecto activo, si se movió (debe tener su memoria).
// POST /accion: una decisión firmada con la identidad de git del clon, en el proyecto activo. GET /sonidos y
// /sonido?nombre=x.mp3: los sonidos del Studio, en estudio/sonidos (sonidos.ts).
// Se llamaba director.ts hasta el 31 de octubre de 2026 y se renombró api.ts por elección del titular (nota nmvvyv6jztit,
// propuesta pr_partir_modulos), para que el único «director» sea la lógica del director.
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { leerTengo, partirConsulta } from '../../src/director/partesDeConsulta.ts';
import { candadosDelAtajo, direccionDeLaPuerta, esDispositivoQa, esPeticionLocal, INTERRUPTOR_PUERTA } from '../../src/director/atajo.ts';
import { cabecerasEnLocal, respondeEnLocal } from './acceso.ts';
import { correccionDeParte } from '../../src/director/dosIdiomas.ts';
import { CABECERAS_QA, esPaginaDelStudio, EVENTO_NOTA_QA, marcaSinCache, notaDeQa, paginaQa, rehusaElMarco, TAMANOS_QA, type DirectorQa } from '../src/qa.ts';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { cederALaNueva, contenerRecargas, EVENTO_CEDIO, EVENTO_RECARGA, type Contencion, type Rastro } from './recarga.ts';
import { esRegistro, MAX_BYTES as MAX_BYTES_VER, paginaDeArchivo, paginaDeError, POLITICA as POLITICA_VER, rutaPermitida } from './verArchivo.ts';
import { leerCandado, otroServidor, soltarCandado, tomarCandado, yaEncendido } from './unico.ts';
import { anotarFalla, caidaPendiente, fallaValida, leerFallas, marcarCaidaVista, resumenDeFallas } from './ultimaCaida.ts';
import { estadoDeReparacion, leerReparacion, pedirReparacion, type EstadoReparacion } from './reparar.ts';
import { gitDe, infoDeVuelta, volverALaVersion } from './volver.ts';
import { arregloEnLaBitacora, candadoViejo, chequearClaude, chequearDisco, chequearPlan, chequearRama, chequearSalud, leerArreglos, libreEnDisco, marcasCorregidas, MINUTOS_SALUD, procesoVive, revisionAtascada, type EstadoSalud, type Sonda } from './salud.ts';
import { archivoDelCandado, candadoLibre, leerCandado as leerCandadoDirector, MIN_CANDADO_SESION } from '../../src/director/candado.ts';
import { marcarLanzada, revisionDe, revisionCorriendo, revisionAbierta, proyectosRevisando, revisionesDeOtros } from '../../src/director/proyectos.ts';
import {
  aclaracionesDe,
  comprobacionesDe,
  seMarcaAMano,
  agendaDe,
  avanceFase,
  bloqueosPuerta,
  claveEntrega,
  seccionPaso,
  claveLeido,
  esDocumento,
  esPregunta,
  estadoMision,
  etapaArranque,
  faseActual,
  esImagen,
  hoy,
  MAX_ADJUNTO,
  MAX_ADJUNTOS,
  MAX_ELECCIONES,
  MAX_TEXTO,
  misionesAbiertas,
  pendientesDelDirector,
  POSTURAS,
  RUTA_ADJUNTO,
  repartirCommit,
  RESPUESTAS,
  sumarDias,
  TIPOS_SOBRE,
  OPCIONES_TIPO_DE_NOTA,
  pideTipo,
  TITULAR,
  planSinCommits,
  unirEstados,
  validarEstado,
  validarPlan,
  validarProyecto,
  type Adjunto,
  type Agenda,
  type CommitFrentes,
  type EstadoDirector,
  type Persona,
  type Plan,
  type Proyecto,
  type Senales,
  audiosPorTranscribir,
  huellasDePasos,
  reglasQueAutoriza,
} from '../../src/director/director.ts';
import { eligeBorrar, notasBorrables, notasDeLaLimpieza } from '../../src/director/rebase.ts';
import { leerFresco, leerFrescosTexto, leerFrescoTexto, listarRemoto } from '../../src/director/fresco.ts';
import { ARCHIVO_LINEA, leerHistoriaLinea } from '../../src/director/historiaLinea.ts';
import { registroValido } from '../../src/director/registroLectura.ts';
import { anotarLectura, leerRegistroLectura } from './lectura.ts';
import { leerEstadoDelEquipo, leerPlanParaVer, leerPlanUnido, leerProyectoDe } from '../../src/director/memoria.ts';
import { medidaPorRevision } from '../../src/director/historial.ts';
import { historialDeProyecto, leerLineasDeRevision, turnoDeProyecto } from '../../src/director/lineasDeRevision.ts';
import { abrirMemoria, anotarAjustesVistos, cambiarAutorizados, marcarEnVentana,cambiarAvisoVersion, refrescarAvisoVersion, versionInstalada, crearProyecto, elegirActivo, enDisco, escribirDeUnaVez, esModoPermisos, esOrigenRevision, guardarActivo, guardarAjustesPropios, guardarEsfuerzoMaximo, guardarModoPermisos, guardarPermiso, guardarPlanDeClaude, guardarRutaRepositorio, idDeNombre, leerLocal, leerRutaRepositorio, marcarUrgencia, memoriaDe, ORIGENES_REVISION, retomarAparte, planCambiadoTrasCierre, guardarTodoConElModelo, guardarAyudaVista, SECCIONES_DE_AYUDA, type AclaracionPedida, pedirAclaracion, pedirRevision, pedirUrgencia, proyectosLocales, RAMA, rutasDe, ubicar, type OrigenRevision } from '../../src/director/proyectos.ts';
import { lineaDeVersion } from '../../src/director/avisoVersion.ts';
import { anotar, conFrasesEnSuIdioma, EL_STUDIO, eventoDeAccion, juntas, leerBitacora, origenDeRevision, lineaDeNiveles, quienEnSuIdioma, tb, textoDeBitacora, type DatoBitacora, type TextoBitacora } from '../../src/director/bitacora.ts';
import { comprobarRepositorio, esSubcarpeta, gitEn, leerDelRepositorio, type InfoRepositorio } from '../../src/director/repositorio.ts';
import { comoDocumento, esArchivoClave } from '../../src/director/archivosClave.ts';
import { anotarFallo, audiosQueNoSeTranscriben, borrarSiTranscrito, quitarSiVacia, type Reintento, tocaIntentar, detenerTranscripcionResidente, iniciarTranscripcionResidente, modeloDeVoz, transcribirEnLocal, transcripcionEnDisco, txtDeAudio } from '../../src/director/transcripcion.ts';
import { escanear, fuentesDeEscaneo } from './escaneo.ts';
import { clavesDeTusAjustes, conMaximo, guardarEsfuerzoClaude, guardarModeloClaude, guardarUltracodeClaude, leerAjustesClaude } from './ajustesClaude.ts';
import { comprobarCuenta } from './comprobarCuenta.ts';
import { conNuevas, opcionesDeTusAjustes, recomendadas } from './ajustesPropios.ts';
import { porQueSinAutomatico } from './modoPermisos.ts';
import { actividadDeProyecto, automaticoDisponible, conversacionDeProyecto, conversacionDeRegistro, enCursoDeProyecto, automaticoSabido, buscarClaude, consumoDeRevisiones, estadoDelLanzado, fallaDeProyecto, MAX_MIN, negadosDelDirector, negadosDeProyecto, ordenAbrirClaude, planDeProyecto, progresoDeProyecto, PROYECTO_REPARAR, Revisor, sesionDeClaude, tokensDeProyecto, usoCincoHorasReciente } from './revisor.ts';
import { corridasGuardadas, detenerMedicion, empezarMedicion, estadoDeMedicion, midiendo } from './medidor.ts';
import { ALCANCES, casosDelAlcance, casosMedibles, type Alcance } from '../../src/director/corrida.ts';
import { esPlanDeClaude, PLANES_DE_CLAUDE, type PlanDeClaude } from '../../src/director/consumoDelPlan.ts';
import { esIdioma } from '../../src/director/idioma.ts';
import { avanzaUnaMision, urgenciaBloquea } from '../../src/director/candadoUrgencia.ts';
import { esElStudio, guardarAsistente, guardarCuentaGit, guardarIdioma, guardarRespaldoDelStudio, ponerRespaldoPublico, queSeBorra, quitarProyecto } from '../../src/director/proyectos.ts';
import { compararCuenta, cuentaQueApruebaUsar, entradaDeGh, entrarConGh, esCuentaGitHub, loginDeGitHubSinEsperar, seguirCuentaAlEntrar, sesionActivaDeGh, sesionesDeGh, usarSesionDeGh, vigiaDeCuentaGh, type AvisoDelVigia, type LecturaDeGh, type SeguimientoDeCuenta } from '../../src/director/cuentaGit.ts';
import { abreSolo, ESFUERZO_DEL_ASISTENTE, estadoAsistenteDe, revisarInstalacion } from '../../src/director/asistente.ts';
import { alinearSemilla } from '../../src/director/semilla.ts';
import { autorizadasPara, autorizadosDelPaso, revisarPedido, valePara } from './permisosNegados.ts';
import { comprobarPrivado, repoDeGithub, Respaldo } from './respaldo.ts';
import { guardarSkills, panelDeSkills } from './skillsDelProyecto.ts';
import { queAnotarDeLaLlamada, queAnotarDeLaRespuesta, respuestaValida } from './permisoAlMomento.ts';
import { decidirParaElGancho, permisosEnEspera } from './permisosEnEspera.ts';
import { correrGit, esCommitDelStudio, guardarIdentidad, identidadValida, leerIdentidad, mensajeDelStudio, olvidarIdentidad, Sincronizador, type Identidad } from './sincronizar.ts';
import { abrirTerminal, comprobarPaso } from './terminal.ts';
import { adjuntoDeSalida, CorridasOcultas, esCritica, marcaEnVentana, ordenNunca, permisoDeSiempre, reglaParaSiempre, ultimasLineas, vaEnVentana, yaAutorizada, type Corrida } from './terminalOculta.ts';

/** Las órdenes de los pasos que corren a escondidas en este servidor: una lista para todos los proyectos. */
const corridasOcultas = new CorridasOcultas();
import { InstaladorDeVoz } from './instalarVoz.ts';
import { leerSonido, leerSonidos } from './sonidos.ts';
import { responderConRango } from './rangos.ts';
import { atenderVoz } from './voz.ts';
import { MAX_AUDIO, MAX_CUERPO, MAX_NOMBRE_ARCHIVO, proyectoDeOtro, Rechazo, textoDe } from './topes.ts';
import { enIdioma, idiomaActual, ponerIdioma, t } from '../src/textos.ts';
import { nombreLegible } from '../src/nombreDeCarpeta.ts';
import { NotasEnCurso } from '../src/notasEnCurso.ts';
import { anotarEnSuIdioma, idiomaDeEsteComputador } from './bitacoraIdioma.ts';

/** «Paso 2» (como lo guarda el Studio) en el idioma de la bitácora: «paso 2», o «Paso 2» con mayúscula; otra sección, tal cual. */
const pasoEnLinea = (seccion: unknown, mayuscula = false): DatoBitacora => {
  if (seccion === undefined || seccion === null) return tb('bitacora.pasoSolo');
  const dicha = String(seccion);
  const numero = /^Paso (\d+)$/.exec(dicha);
  return numero ? tb(mayuscula ? 'bitacora.pasoMayus' : 'bitacora.paso', { n: numero[1] }) : mayuscula ? dicha : dicha.toLowerCase();
};

const DIAS_ESFUERZO = 7;
const ESPERA_COMMIT_MS = 15_000;
const CACHE_MS = 60_000;
/** Tras transcribir lo dicho para una nota, cuánto más espera la revisión de su proyecto a que la página la guarde. */
const GRACIA_DICTADO_MS = 10_000;
/** Cuánto espera, como mucho, un cambio de proyecto a la nota de voz que se transcribe en el activo. */
const TOPE_CAMBIO_CON_NOTA_MS = 5 * 60_000;
const MAX_DOCS_REPO = 400;
/** Los tokens de un lanzamiento: lo que estima lo que consumirá otro (medidor.ts › estadoDeMedicion). */
const tokensDe = (c: { entrada: number; cache: number; salida: number }) => c.entrada + c.cache + c.salida;
/** Las acciones de la bitácora que se ven en «Modelo y consumo» (las más nuevas). */
const MAX_BITACORA = 2000;

/**
 * Tus ajustes de Claude Code en el director, para «Modelo y consumo»: si los carga todos y, si no, qué claves conserva;
 * las claves sin sus valores y cada una con su explicación y su consejo (ajustesPropios.ts). Mientras los carga todos,
 * `conservados` trae lo recomendado, para marcarlo de entrada. Las claves que aparecieron después de guardar tu selección
 * (`nuevas`) vienen como el director las usa hasta que la guardes de nuevo: con lo recomendado (conNuevas). Una selección
 * guardada antes de que el Studio anotara las claves de ese momento las anota ahora, sin cambiarla (anotarAjustesVistos).
 */
async function estadoAjustesPropios(raiz: string) {
  let local = await leerLocal(raiz);
  const opciones = await opcionesDeTusAjustes();
  const cargar = local.ajustesPropios !== false;
  if (!cargar && opciones && !local.ajustesVistos) {
    await anotarAjustesVistos(raiz, opciones.map((o) => o.id));
    local = await leerLocal(raiz);
  }
  const { ids, nuevas } = conNuevas(opciones ?? [], local.ajustesConservados ?? [], cargar ? undefined : local.ajustesVistos);
  return { cargar, claves: await clavesDeTusAjustes(), opciones, conservados: cargar ? recomendadas(opciones ?? []) : ids, nuevas };
}

async function leerCuerpo(req: IncomingMessage): Promise<any> {
  let datos = '';
  for await (const trozo of req) {
    datos += trozo;
    if (datos.length > MAX_CUERPO) throw new Rechazo(t('servidor.api.envioPesado', { n: Math.round(MAX_CUERPO / 1024 / 1024) }));
  }
  return JSON.parse(datos || '{}');
}

function responder(res: ServerResponse, codigo: number, cuerpo: unknown) {
  res.statusCode = codigo;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(cuerpo));
}

/** El título de un documento: su `#`, o el nombre del archivo. */
// Un comando o una habilidad de un agente (.claude/commands, .agents/skills) dice qué es en su cabecera (description:)
const tituloMd = (texto: string, ruta: string) =>
  (texto.startsWith('---') ? /^description:\s*["']?(.+?)["']?\s*$/m.exec(texto.split(/^---\s*$/m)[1] ?? '')?.[1]?.trim() : undefined) ??
  /^#\s+(.+)$/m.exec(texto)?.[1]?.trim() ??
  ruta.split('/').pop()!;
/** ¿Dos rutas son la misma carpeta? (sin importar las barras ni las mayúsculas) */
const misma = (a: string, b: string) => a.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase() === b.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
const enteroDe = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));

/** Guarda un audio grabado en el navegador (data URL de WebM, Ogg o MP4) en la carpeta de notas y devuelve su ruta. */
async function guardarAudio(raiz: string, carpeta: string, id: string, datos: unknown): Promise<string> {
  const m = /^data:audio\/(webm|ogg|mp4|x-m4a|mpeg)(?:;[^,]*)?;base64,([A-Za-z0-9+/=]+)$/.exec(String(datos ?? ''));
  if (!m) throw new Rechazo(t('servidor.api.audioFormato'));
  const bytes = Buffer.from(m[2], 'base64');
  if (bytes.length > MAX_AUDIO) throw new Rechazo(t('servidor.api.audioPesado', { n: MAX_AUDIO / 1024 / 1024 }));
  if (bytes.length < 64) throw new Rechazo(t('servidor.api.audioVacio'));
  const firma = bytes.subarray(0, 12);
  const tipo = m[1];
  const valido = tipo === 'webm' ? firma.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
    : tipo === 'ogg' ? firma.toString('latin1', 0, 4) === 'OggS'
    : tipo === 'mpeg' ? firma.toString('latin1', 0, 3) === 'ID3' || firma[0] === 0xff
    : firma.toString('latin1', 4, 8) === 'ftyp';
  if (!valido) throw new Rechazo(t('servidor.api.archivoNoEsAudio'));
  const ext = tipo === 'webm' ? 'webm' : tipo === 'ogg' ? 'ogg' : tipo === 'mpeg' ? 'mp3' : 'm4a';
  const dir = enDisco(raiz, carpeta);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${id}.${ext}`), bytes);
  return `${carpeta}/${id}.${ext}`;
}

const TIPOS_AUDIO: Record<string, string> = { webm: 'audio/webm', ogg: 'audio/ogg', m4a: 'audio/mp4', mp3: 'audio/mpeg' };
const TIPOS_IMAGEN: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };

/**
 * Guarda un archivo adjunto a una nota (data URL desde el navegador) en notas/adjuntos/ y devuelve cómo quedó. Cualquier
 * tipo vale: el Studio solo muestra en miniatura las imágenes, y el resto lo sirve como descarga (ver /archivo).
 */
async function guardarAdjunto(raiz: string, carpeta: string, id: string, x: unknown): Promise<Adjunto> {
  const a = (x ?? {}) as { nombre?: unknown; datos?: unknown };
  const m = /^data:[^,]*?;base64,([A-Za-z0-9+/=]*)$/.exec(String(a.datos ?? ''));
  if (!m) throw new Rechazo(t('servidor.api.adjuntoDanado'));
  const bytes = Buffer.from(m[1], 'base64');
  // Entero: cortado, perdería su extensión y una imagen ya no se vería como imagen
  const nombre = textoDe(a.nombre, MAX_NOMBRE_ARCHIVO, t('servidor.api.etAdjunto'), t('servidor.api.haceAdjunto')).replace(/[\\/]/g, '_') || 'archivo';
  if (bytes.length > MAX_ADJUNTO) throw new Rechazo(t('servidor.api.adjuntoPesado', { nombre, n: MAX_ADJUNTO / 1024 / 1024 }));
  if (!bytes.length) throw new Rechazo(t('servidor.api.adjuntoVacio', { nombre }));
  const ext = (/\.([a-z0-9]{1,8})$/i.exec(nombre)?.[1] ?? 'bin').toLowerCase();
  const dir = enDisco(raiz, `${carpeta}/adjuntos`);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${id}.${ext}`), bytes);
  return { ruta: `${carpeta}/adjuntos/${id}.${ext}`, nombre, bytes: bytes.length };
}

const MAX_CARPETAS = 600;

export interface Carpeta { nombre: string; ruta: string; git: boolean }

/**
 * El explorador de carpetas de este computador, para elegir el repositorio de un proyecto sin escribir su ruta (el
 * navegador no entrega rutas reales). Solo lista carpetas, nunca archivos ni su contenido. Sin ruta, da los puntos de
 * partida: la carpeta personal, la que contiene al Estudio y las unidades del equipo.
 */
async function explorarCarpetas(raiz: string, pedida: string): Promise<{ ruta: string | null; padre: string | null; git: boolean; carpetas: Carpeta[]; inicios: Carpeta[] }> {
  const esGit = (r: string) => existsSync(join(r, '.git'));
  const inicios: Carpeta[] = [];
  const sumar = (nombre: string, r: string) => {
    if (existsSync(r) && !inicios.some((x) => x.ruta.toLowerCase() === r.toLowerCase())) inicios.push({ nombre, ruta: r, git: esGit(r) });
  };
  sumar('Junto al Estudio', dirname(raiz));
  sumar('Tu carpeta personal', homedir());
  if (process.platform === 'win32') for (const l of 'CDEFGHIJ') sumar(`Unidad ${l}:`, `${l}:\\`);
  else sumar('Raíz', '/');
  const r = pedida.trim().replace(/^["']|["']$/g, '');
  if (!r) return { ruta: null, padre: null, git: false, carpetas: [], inicios };
  if (!isAbsolute(r)) throw new Error(t('servidor.api.escribeRutaCompleta'));
  const abs = resolve(r);
  let entradas;
  try {
    entradas = await readdir(abs, { withFileTypes: true });
  } catch {
    throw new Error(t('servidor.api.carpetaNoSeAbre'));
  }
  const carpetas: Carpeta[] = entradas
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !['node_modules', '$RECYCLE.BIN', 'System Volume Information'].includes(e.name))
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
    .slice(0, MAX_CARPETAS)
    .map((e) => ({ nombre: e.name, ruta: join(abs, e.name), git: esGit(join(abs, e.name)) }));
  const padre = dirname(abs);
  return { ruta: abs, padre: padre === abs ? null : padre, git: esGit(abs), carpetas, inicios };
}

export interface Comprobacion { id: string; nombre: string; ok: boolean; opcional?: boolean; detalle: string; arreglo?: string }

/**
 * Lo que necesita un computador para usar el Studio (lo mismo que comprueba `npm run iniciar`): Node 24, git, la carpeta
 * del Studio como repositorio con identidad, y lo opcional (Claude Code para la sesión del director, la transcripción).
 */
async function saludDelEquipo(raiz: string): Promise<Comprobacion[]> {
  const salida: Comprobacion[] = [];
  const mayor = Number(process.versions.node.split('.')[0]);
  salida.push({ id: 'node', nombre: t('saludEquipo.nodeNombre'), ok: mayor >= 24, detalle: t('saludEquipo.nodeDetalle', { version: process.versions.node }), arreglo: t('saludEquipo.nodeArreglo') });
  const g = await gitEn(raiz, ['--version']);
  salida.push({ id: 'git', nombre: 'git', ok: g.ok, detalle: g.ok ? g.out.trim() : t('saludEquipo.gitDetalle'), arreglo: t('saludEquipo.gitArreglo') });
  const esRepo = (await gitEn(raiz, ['rev-parse', '--is-inside-work-tree'])).out.trim() === 'true';
  salida.push({ id: 'repo', nombre: t('saludEquipo.repoNombre'), ok: esRepo, detalle: esRepo ? t('saludEquipo.repoSi') : t('saludEquipo.repoNo'), arreglo: t('saludEquipo.repoArreglo') });
  const [nombre, correo] = await Promise.all(['user.name', 'user.email'].map(async (k) => (await gitEn(raiz, ['config', k])).out.trim()));
  salida.push({ id: 'identidad', nombre: t('saludEquipo.identidadNombre'), ok: !!(nombre && correo), detalle: nombre && correo ? `${nombre} <${correo}>` : t('saludEquipo.identidadDetalle'), arreglo: t('saludEquipo.identidadArreglo') });
  const claude = await new Promise<boolean>((ok) => execFile(process.platform === 'win32' ? 'claude.cmd' : 'claude', ['--version'], { windowsHide: true, timeout: 8000, shell: process.platform === 'win32' }, (e) => ok(!e)));
  salida.push({ id: 'claude', nombre: t('saludEquipo.claudeNombre'), ok: claude, opcional: true, detalle: claude ? t('saludEquipo.claudeSi') : t('saludEquipo.claudeNo'), arreglo: 'https://claude.com/claude-code' });
  return salida;
}

/** Lo que el Estudio muestra de cada proyecto en su lista. */
export interface ResumenProyecto {
  id: string;
  nombre: string;
  tipo: 'existente' | 'nuevo';
  objetivo: string | null;
  etapa: string;
  fase: string;
  /** Entregas y notas que esperan al director. */
  porRevisar: number;
  misionesAbiertas: number;
  revisado: string;
  conectado: boolean;
  /** Lo que espera de quien usa este computador (su persona en ese proyecto) y lo que espera al director. */
  agenda: Agenda;
  /** La alerta del director (fecha límite o riesgo activo), si la hay. */
  alerta: string | null;
  /** Quién es en ese proyecto quien usa este computador (null si no está en su equipo). */
  persona: Persona | null;
  /** Si es el proyecto que es este mismo Studio: va al final de la lista, con su marca, y no se quita (pd_stl_semilla). */
  esElStudio?: boolean;
}

export function servidorDirector(): Plugin {
  let raiz = process.cwd();

  /** Los proyectos de este Estudio: los de estudio.local.json con su memoria en su repositorio. */
  const listarIds = () => proyectosLocales(raiz);

  // Uno por memoria de proyecto: el que guarda sus decisiones en commits locales (ya no sube cada una ni trae GitHub: el
  // Studio es de una sola persona, pd_sin_modo_equipo) y el que respalda la memoria en GitHub al terminar cada revisión
  const syncs = new Map<string, Sincronizador>();
  const syncDe = (id: string) => {
    const m = memoriaDe(raiz, id)!;
    if (!syncs.has(m)) syncs.set(m, new Sincronizador(m));
    return syncs.get(m)!;
  };
  const respaldos = new Map<string, Respaldo>();
  const respaldoDe = (id: string) => {
    const m = memoriaDe(raiz, id)!;
    if (!respaldos.has(m)) respaldos.set(m, new Respaldo(m, async () => {
      const l = await leerLocal(raiz);
      const autorizadas = autorizadasPara(l.permisos?.autorizados, id, [], homedir());
      const repo = await leerRutaRepositorio(raiz, id);
      const igual = (a: string, b: string) => resolve(a).replace(/[\\/]+$/, '').toLowerCase() === resolve(b).replace(/[\\/]+$/, '').toLowerCase();
      const delStudio = !!repo && igual(repo, raiz);
      // La memoria del Studio va solo a su segunda dirección, de la cuenta aprobada (nmwfl2c3ltit); uno público, solo con
      // el respaldo encendido por su titular (nmwf5lg39tit)
      return {
        puedeSubir: autorizadas.includes('Bash(git push:*)'), delStudio,
        segunda: delStudio ? (l.respaldoDelStudio ?? null) : null, cuenta: l.cuentasGit?.[id] ?? null,
        publicoPermitido: !delStudio && (l.respaldoPublico ?? []).includes(id),
      };
    }, comprobarPrivado(async () => (await leerLocal(raiz)).cuentasGit?.[id] ?? null)));
    return respaldos.get(m)!;
  };
  /** Las rutas del Estudio (proyectos/<id>/…) como las ve la memoria del proyecto. */
  const enMemoria = (rutas: string[]) => rutas.map((x) => ubicar(raiz, x)).filter((u) => u.memoria).map((u) => u.ruta);

  const activo = async (): Promise<string | null> => elegirActivo(await leerLocal(raiz), await listarIds());
  // La memoria de cada proyecto se lee en un solo lugar (src/director/memoria.ts), el mismo que usan las herramientas del
  // director. El plan, con lo archivado (director/archivo.json): el Studio lo muestra todo igual, aunque el plan ya no lo cargue
  const leerPlan = (id: string): Promise<Plan> => leerPlanUnido(raiz, id);
  const leerProyecto = (id: string): Promise<Proyecto> => leerProyectoDe(raiz, id);

  // ─────────────────────────────────────────── el repositorio de cada proyecto (con caché de un minuto)
  const repos = new Map<string, { cuando: number; ruta: string | null; info: InfoRepositorio | null; error: string | null }>();
  async function repositorio(id: string, fresco = false) {
    const r0 = repos.get(id);
    if (r0 && !fresco && Date.now() - r0.cuando < CACHE_MS) return r0;
    const ruta = await leerRutaRepositorio(raiz, id);
    const c = ruta ? await comprobarRepositorio(ruta) : null;
    const r = { cuando: Date.now(), ruta, info: c?.ok ? c.info : null, error: c && !c.ok ? c.error : null };
    repos.set(id, r);
    return r;
  }

  /** El estado del equipo de un proyecto, visto desde este Estudio (su archivo propio, de la carpeta; el de otra persona, lo más nuevo). */
  const leerEstado = (id: string, yo: Persona | null, proyecto: Proyecto) => leerEstadoDelEquipo(raiz, id, proyecto, yo);

  /** Cómo va cada proyecto, para la lista. */
  async function resumenProyectos(): Promise<ResumenProyecto[]> {
    const local = await leerLocal(raiz);
    const correo = (await gitEn(raiz, ['config', 'user.email'])).out.trim().toLowerCase();
    const salida: ResumenProyecto[] = [];
    for (const id of await listarIds()) {
      try {
        const [plan, proyecto] = await Promise.all([leerPlan(id), leerProyecto(id)]);
        const { estado } = await leerEstado(id, null, proyecto);
        const pend = pendientesDelDirector(plan, estado);
        const personas = proyecto.equipo.length ? proyecto.equipo.map((i) => i.id) : [TITULAR];
        const persona = proyecto.equipo.find((i) => i.correo.trim().toLowerCase() === correo)?.id ?? (proyecto.equipo.length ? null : TITULAR);
        salida.push({
          id,
          nombre: proyecto.nombre || id,
          tipo: proyecto.tipo === 'nuevo' ? 'nuevo' : 'existente',
          objetivo: proyecto.objetivo?.texto ?? null,
          etapa: etapaArranque(plan, proyecto, !!local.repositorios[id]),
          fase: faseActual(plan, estado)?.nombre ?? '',
          porRevisar: pend.entregas.length + pend.notas.length,
          misionesAbiertas: personas.reduce((s, p) => s + misionesAbiertas(plan, estado, p).length, 0),
          revisado: plan.revisado ?? '',
          conectado: !!local.repositorios[id],
          agenda: agendaDe(plan, estado, persona ?? TITULAR),
          alerta: plan.resumen?.alerta?.trim() || null,
          persona,
          esElStudio: !!local.repositorios[id] && esElStudio(raiz, local.repositorios[id]),
        });
      } catch {
        salida.push({ id, nombre: id, tipo: 'existente', objetivo: null, etapa: 'conectar', fase: '', porRevisar: 0, misionesAbiertas: 0, revisado: '', conectado: false, agenda: { mision: null, enCola: 0, porDecidir: 0, porEjecutar: 0, alDirector: 0 }, alerta: null, persona: null });
      }
    }
    return salida;
  }

  // ─────────────────────────────────────────── las notas de voz: se transcriben en cuanto llegan
  /**
   * Cada audio que llega (o que se encuentra sin su .txt) se transcribe en este computador, uno tras otro, sin esperar a
   * la revisión del director: así el Buzón y el lugar donde se grabó muestran lo que se dijo. Con su texto escrito, el
   * audio se borra (nunca entra a git). Si no se puede (sin la transcripción instalada) o sale vacía, se anota,
   * el audio se queda y el director lo transcribe al revisar.
   */
  const transcribiendo = new Set<string>();
  // Las de cada proyecto, para que su revisión y el cambio de proyecto las esperen (nmwdwg5yvtit): cada audio en la cola y
  // cada «/dictar» cuentan hasta que su texto queda escrito o falla
  const notasEnCurso = new NotasEnCurso();
  const soltarAudio = new Map<string, () => void>();
  // Los que fallaron: nunca se borran ni se olvidan. Vuelven a la cola cuando pasa su espera, que crece con cada intento
  // y se queda en una hora (nota de voz del titular nmw159ihdtit, 3 de noviembre de 2026); al reiniciar el Studio, la
  // primera lectura los vuelve a encontrar sin su .txt y los intenta otra vez
  const sinTranscribir = new Map<string, Reintento>();
  const colaAudios: { id: string; audio: string; pista: string }[] = [];
  let transcriptorOcupado = false;
  const txtDe = (audio: string) => audio.replace(/\.[a-z0-9]+$/, '.txt');
  function reintentarLuego(id: string, audio: string, pista: string, r: Reintento) {
    if (!Number.isFinite(r.siguiente)) return;
    setTimeout(() => transcribirLuego(id, [audio], pista), Math.max(0, r.siguiente - Date.now())).unref?.();
  }
  function transcribirLuego(id: string, audios: string[], pista: string) {
    for (const audio of audios) {
      if (transcribiendo.has(audio) || !tocaIntentar(sinTranscribir.get(audio), Date.now()) || !existsSync(enDisco(raiz, audio)) || existsSync(enDisco(raiz, txtDe(audio)))) continue;
      transcribiendo.add(audio);
      soltarAudio.set(audio, notasEnCurso.empieza(id));
      colaAudios.push({ id, audio, pista });
    }
    void transcribirCola();
  }
  async function transcribirCola() {
    if (transcriptorOcupado) return;
    transcriptorOcupado = true;
    try {
      while (colaAudios.length) {
        const lote = colaAudios.splice(0);
        const r = await transcribirEnLocal(raiz, lote.map((x) => enDisco(raiz, x.audio)), lote[0].pista);
        // Cómo salió, en la bitácora: así se sabe que transcribió este computador, sin WSL, y si no, por qué (nota de voz del
        // titular nmvs7si3qtit)
        void anotarEnSuIdioma(raiz, () => {
          const cuantas = tb('bitacora.notasDeVoz', { n: lote.length });
          return { quien: EL_STUDIO, que: r.ok ? tb('bitacora.transcribio', { cuantas }) : tb('bitacora.noTranscribio', { cuantas, error: r.error ?? tb('bitacora.sinDetalle') }), desde: tb('bitacora.desde.transcripcionLocal'), proyecto: lote[0].id };
        });
        for (const x of lote) {
          transcribiendo.delete(x.audio);
          // Con su texto escrito, el audio se borra (nunca entra a git) y el commit lleva solo el .txt. Si falló o salió
          // vacía, el audio se queda en este computador hasta que salga bien
          const audio = enDisco(raiz, x.audio);
          if (quitarSiVacia(audio)) sinTranscribir.set(x.audio, anotarFallo(sinTranscribir.get(x.audio), 'No se oyó voz en el audio: se queda guardado.', Date.now(), true));
          else if (existsSync(enDisco(raiz, txtDe(x.audio)))) {
            sinTranscribir.delete(x.audio);
            borrarSiTranscrito(audio);
            programarCommit(x.id, quienGuarda || EL_STUDIO, () => 'transcribes a voice note locally', [txtDe(x.audio)]);
          } else {
            const fallo = anotarFallo(sinTranscribir.get(x.audio), r.error ?? 'No quedó texto.', Date.now());
            sinTranscribir.set(x.audio, fallo);
            reintentarLuego(x.id, x.audio, x.pista, fallo);
          }
          // Escrita o fallida, ya no se espera: la revisión pedida de su proyecto puede empezar
          soltarAudio.get(x.audio)?.();
          soltarAudio.delete(x.audio);
        }
      }
    } catch {
      // Si la transcripción se cae, ninguna revisión queda esperándola para siempre
      for (const soltar of soltarAudio.values()) soltar();
      soltarAudio.clear();
    } finally {
      transcriptorOcupado = false;
    }
  }

  // El que lanza al director cuando alguien pide una revisión (sin modelo mientras no haya nada pedido)
  let revisor: Revisor | null = null;
  /** Las recargas que se retienen mientras el director trabaja (recarga.ts): la página pregunta si hay alguna. */
  let contencion: Contencion | null = null;
  /** Las descargas de la pantalla de la voz: una sola, para que recargar la página no las pierda de vista. */
  let instalador: InstaladorDeVoz | null = null;
  const instaladorDeVoz = () => (instalador ??= new InstaladorDeVoz(raiz));
  // Solo desde la ruta «/revision», con el botón que la nombra: nada más en el Studio la pide (regla dura del titular, 23
  // de octubre de 2026; la prueba «nadie pide una revisión solo» lo vigila). Cada pedido y cada cancelación, a la bitácora
  const pedirYLanzar = async (id: string, quien: string | null, origen?: OrigenRevision, cancela?: string) => {
    const r = await pedirRevision(raiz, id, quien, origen);
    await anotar(raiz, quien
      ? { quien, que: tb('bitacora.pideRevision'), desde: origenDeRevision(origen!), proyecto: id }
      : { quien: cancela ?? 'alguien', que: tb('bitacora.cancelaRevision'), desde: tb('bitacora.desde.cancelar'), proyecto: id });
    if (quien) void revisor?.mirar(true).catch(() => {});
    return r;
  };
  // Quién está en este computador, para la bitácora de lo que no es de un proyecto (el modelo, ultracode, el proyecto
  // activo): la identidad de git de la carpeta del Studio
  const quienAqui = async () => (await leerIdentidad(raiz, null)).nombre || 'alguien en este computador';
  /**
   * La sesión activa de gh sigue a la cuenta aprobada del proyecto (cuentaGit.ts › seguirCuentaDelProyecto; nota de voz del
   * titular nmw9xvydetit): si gh la tiene guardada, la deja activa (cada ruta lo anota); si no, la página avisa. Sin cuenta
   * aprobada, nada. Nunca falla el cambio de proyecto: si gh no responde, se dice. A la página solo le llega lo que pasó, sin tokens.
   */
  // Las revisiones van con la llave de su cuenta (pd_semaforo_gh): la sesión activa sigue solo al proyecto abierto. Si gh no
  // respondió, no se sabe nada, y no se avisa (nmwo0dx41tit: el aviso falso de otra cuenta)
  const seguirCuenta = async (id: string): Promise<SeguimientoDeCuenta> => {
    const cuentas = (await leerLocal(raiz)).cuentasGit;
    const r: SeguimientoDeCuenta = await seguirCuentaAlEntrar(id, cuentas).catch(() => ({ que: 'sin_respuesta' as const }));
    // Lo que el Studio cambió al entrar ya lo dice su aviso: el vigía no lo repite
    if (r.que === 'cambiada' || r.que === 'ya_activa') lecturaGh = { activa: r.nombre, proyecto: id, aprobada: cuentas?.[id]?.trim() || null };
    return r;
  };
  // El vigía de la cuenta de gh (nmwo0dx41tit; cuentaGit.ts › vigiaDeCuentaGh): cada minuto lee la sesión activa de gh y
  // guarda un aviso, numerado, si cambió o no es la del proyecto activo; la página lo pide y lo muestra una vez
  let lecturaGh: LecturaDeGh | null = null;
  let avisoGh: { n: number; cuando: string; aviso: AvisoDelVigia } | null = null;
  const mirarCuentaGh = async () => {
    const l = await leerLocal(raiz);
    const ahora: LecturaDeGh = { activa: await sesionActivaDeGh(), proyecto: l.activo ?? null, aprobada: (l.activo && l.cuentasGit?.[l.activo]?.trim()) || null };
    const aviso = vigiaDeCuentaGh(lecturaGh, ahora);
    if (ahora.activa) lecturaGh = ahora;
    if (aviso) avisoGh = { n: (avisoGh?.n ?? 0) + 1, cuando: new Date().toISOString(), aviso };
  };
  const cambioDeCuenta = (r: SeguimientoDeCuenta, id: string, desde: TextoBitacora) =>
    r.que === 'cambiada' ? { quien: EL_STUDIO, que: tb('bitacora.dejaActivaGh', { nombre: r.nombre }), desde, proyecto: id } : null;

  // ─────────────────────────────────────────── señales (con caché de un minuto, por proyecto)
  const caches = new Map<string, { cuando: number; senales: Senales }>();
  async function senales(id: string, plan: Plan, proyecto: Proyecto): Promise<Senales> {
    const s: Senales = { proyecto: { objetivo: !!proyecto.objetivo?.firmado } };
    const c = caches.get(id);
    if (c && Date.now() - c.cuando < CACHE_MS) return { ...c.senales, ...s };
    const correos = Object.fromEntries(proyecto.equipo.map((i) => [i.correo.trim().toLowerCase(), i.id]));
    const r = await repositorio(id);
    const hasta = hoy();
    const desde = sumarDias(hasta, -(DIAS_ESFUERZO - 1));
    if (r.info) {
      // Los commits del repositorio del proyecto (los de esta rama y, si existe, los de su rama en GitHub)
      const remota = proyecto.repositorio.rama ? `origin/${proyecto.repositorio.rama}` : '';
      const conRemota = remota && (await gitEn(r.info.ruta, ['rev-parse', '--verify', '--quiet', remota])).ok;
      const salida = await gitEn(r.info.ruta, ['log', 'HEAD', ...(conRemota ? [remota] : []), `--since=${desde} 00:00`, '--no-merges', '--name-only', '--date=short', '--format=%x1e%ad%x1f%ae%x1f%s']);
      if (salida.ok) {
        const commits: CommitFrentes[] = [];
        for (const bloque of salida.out.split('\x1e').slice(1)) {
          const [cabeza, ...lineas] = bloque.split('\n');
          const [fecha, correo = ''] = cabeza.split('\x1f');
          const archivos = lineas.map((l) => l.trim()).filter(Boolean);
          if (!archivos.length) continue;
          const autor = correos[correo.toLowerCase()];
          commits.push({ fecha, frentes: repartirCommit(plan, archivos), ...(autor ? { autor } : {}) });
        }
        // Las decisiones del Estudio en este proyecto (entregar, comentar, marcar) son un clic, no trabajo: aparte
        const decisiones = await gitEn(memoriaDe(raiz, id)!, ['log', 'HEAD', `--since=${desde} 00:00`, '--format=%s']);
        s.esfuerzo = { desde, hasta, commits, decisiones: decisiones.out.split('\n').filter(esCommitDelStudio).length };
      }
    }
    caches.set(id, { cuando: Date.now(), senales: s });
    return s;
  }

  // ─────────────────────────────────────────── guardar las decisiones en git (agrupadas)
  let quienGuarda = '', temporizador: ReturnType<typeof setTimeout> | null = null;
  const porProyecto = new Map<string, { que: string[]; archivos: Set<string> }>();
  // El mensaje del commit, en inglés desde el 20 de noviembre de 2026 (nmwp711kitit): `que` es una frase que se arma
  // con el idioma puesto (la misma de la bitácora, `queBitacora`), y aquí se dice en inglés sea cual sea el de la interfaz
  /** La nota de error de una orden que falló sin ventana (pd_sin_terminal): al Buzón de su proyecto, sobre su paso. */
  async function notaDeErrorDeOrden(c: Corrida) {
    const yo = await leerIdentidad(raiz, c.proyecto);
    if (!yo.rol) return;
    const m = (await leerPlan(c.proyecto)).misiones?.find((x) => x.id === c.mision);
    if (!m) return;
    await idiomaDeEsteComputador(raiz);
    const nota = {
      tipo: 'comentar',
      sobre: { tipo: 'mision', id: c.mision, seccion: `Paso ${c.paso + 1}` },
      texto: t('terminal.notaError', { orden: c.orden, codigo: c.codigo ?? '—', lineas: ultimasLineas(c.salida) || '—' }),
      tipoNota: 'falla',
      adjuntos: [adjuntoDeSalida(c)],
    };
    const { queBitacora, queTb, archivos } = await enFila(() => decidir(c.proyecto, nota, yo as Identidad & { rol: Persona }));
    programarCommit(c.proyecto, yo.nombre, () => `${queBitacora()}, from a hidden command`, archivos);
    await anotarEnSuIdioma(raiz, () => eventoDeAccion(nota, yo.nombre, queTb(), c.proyecto));
  }

  function programarCommit(proyecto: string, quien: string, que: () => string, archivos: string[]) {
    const p = porProyecto.get(proyecto) ?? { que: [], archivos: new Set<string>() };
    p.que.push(enIdioma('en', que));
    for (const a of archivos) p.archivos.add(a);
    porProyecto.set(proyecto, p);
    quienGuarda = quien;
    if (temporizador) clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      temporizador = null;
      for (const [id, { que: lista, archivos }] of porProyecto) {
        if (!memoriaDe(raiz, id)) continue;
        const resumen = lista.length === 1 ? lista[0] : `${lista.length} decisions: ${lista.join('; ')}`;
        // Solo el mensaje del commit se acota: lo que cada quien escribió va entero en los archivos que guarda
        syncDe(id).registrar(enMemoria([...archivos]), mensajeDelStudio(id, `${enIdioma('en', () => quienEnSuIdioma(quienGuarda))} ${resumen}`).slice(0, 300)).catch(() => undefined);
      }
      porProyecto.clear();
    }, ESPERA_COMMIT_MS);
  }

  // ─────────────────────────────────────────── las decisiones (una a la vez)
  let fila: Promise<unknown> = Promise.resolve();
  const enFila = <T>(tarea: () => Promise<T>): Promise<T> => {
    const r = fila.then(tarea, tarea);
    fila = r.catch(() => undefined);
    return r;
  };

  // De una vez: la bandeja (otro proceso) lee lo de cada persona en plena revisión y no debe encontrarlo a medio escribir
  async function escribirJson(ruta: string, datos: unknown) {
    const archivo = enDisco(raiz, ruta);
    await mkdir(join(archivo, '..'), { recursive: true });
    await escribirDeUnaVez(archivo, JSON.stringify(datos, null, 2) + '\n');
  }

  async function decidir(id: string, cuerpo: any, yo: Identidad & { rol: Persona }): Promise<{ estado: EstadoDirector; proyecto: Proyecto; que: string; queBitacora: () => string; queTb: () => TextoBitacora; archivos: string[]; audios: string[] }> {
    const rutas = rutasDe(id);
    const plan = await leerPlan(id);
    const proyecto = await leerProyecto(id);
    const leido = await leerEstado(id, yo.rol, proyecto);
    const propio = leido.propio!;
    const estado = leido.estado; // para las comprobaciones; lo que cambia va en `propio`
    // La limpieza borra las notas de todo el proyecto, no solo las de quien decide (decisión del titular nmwmns8xstit,
    // pd_rebase_memoria): el archivo de cada persona que cambie se escribe junto al propio, tras validar
    const otrosLimpios: Persona[] = [];
    const borrarDeTodos = (borrar: ReadonlySet<string>): number => {
      let borradas = 0;
      for (const [p, e] of Object.entries(leido.porPersona)) {
        const antes = e.notas.length;
        e.notas = e.notas.filter((n) => !borrar.has(n.id));
        borradas += antes - e.notas.length;
        if (p !== yo.rol && e.notas.length !== antes) otrosLimpios.push(p);
      }
      return borradas;
    };
    // Lo que ya no cuadraba antes de esta decisión no es de la persona: el plan cambió bajo ella (una misión que el
    // director reordenó quitándola un momento, nota del titular nmvsv9ihxtit). Se rechaza solo lo que su decisión rompe
    const yaRoto = new Set(validarEstado(estado, plan));
    const firma = { fecha: hoy(), quien: yo.nombre };
    const titular = yo.rol === TITULAR;
    let cambiaProyecto = false;
    // Un proyecto sin equipo (hecho a mano): la primera persona que decide queda como su titular
    if (yo.nuevo && !proyecto.equipo.some((i) => i.id === TITULAR)) {
      proyecto.equipo.unshift({ id: TITULAR, nombre: yo.nombre, correo: yo.correo, cargo: 'Director de proyecto', papel: 'Dirige el proyecto: fija la meta, responde las propuestas y cruza las puertas.' });
      cambiaProyecto = true;
    }
    const soloTitular = (que: string) => {
      if (!titular) throw new Rechazo(t('servidor.api.soloTitular', { que }));
    };
    const criterio = (cid: string) => {
      const c = plan.fases.flatMap((f) => f.criterios).find((x) => x.id === cid);
      if (!c) throw new Rechazo(t('servidor.api.criterioNoEnRuta'));
      return c;
    };
    const faseDe = (fid: string) => {
      const f = plan.fases.find((x) => x.id === fid);
      if (!f) throw new Rechazo(t('servidor.api.faseNoEnRuta'));
      return f;
    };
    const mision = (mid: string) => {
      const m = plan.misiones?.find((x) => x.id === mid);
      if (!m) throw new Rechazo(t('servidor.api.misionNoEnRuta'));
      return m;
    };
    /** Algo de otra persona solo lo retira el titular, en su propio archivo. */
    const retirarDelOtro = (rid: string, que: string) => {
      if (!titular) throw new Rechazo(t('servidor.api.soloTitularOQuien', { que }));
      propio.retirados[rid] = firma;
    };
    const cuando = new Date().toISOString();
    const archivos: string[] = [rutas.persona(yo.rol)];
    // El audio de una nota de voz nunca entra a git: va aparte, a transcribirse; en el commit va su .txt cuando salga
    const audios: string[] = [];
    let que = '';
    // La misma frase para la bitácora de este computador, en el idioma de la interfaz del momento de escribirla; el commit
    // del equipo la dice en inglés (programarCommit; nmwp711kitit). `que`, en castellano, queda para lo que aún lo lee
    let queTb: () => TextoBitacora = () => tb('bitacora.accion.otra');
    let callado = false; // lo que no va a la bitácora (marcar una idea de una parte)
    switch (cuerpo.tipo) {
      case 'empezar': {
        const m = mision(cuerpo.mision);
        if (estadoMision(m, plan, estado) === 'bloqueada') throw new Rechazo(t('servidor.api.misionBajoNiebla'));
        propio.empezadas[m.id] = { cuando, quien: yo.nombre };
        que = `empieza la misión «${m.titulo}»`;
        queTb = () => tb('bitacora.accion.empieza', { titulo: m.titulo });
        break;
      }
      case 'entregar': {
        const m = mision(cuerpo.mision);
        if (estadoMision(m, plan, estado) === 'bloqueada') throw new Rechazo(t('servidor.api.misionBajoNiebla'));
        const nota = textoDe(cuerpo.nota, MAX_TEXTO, t('servidor.api.etEntrega'));
        const audio = cuerpo.audio ? await guardarAudio(raiz, rutas.notas, `e_${m.id}_${Date.now().toString(36)}`, cuerpo.audio) : undefined;
        if (audio) audios.push(audio);
        // «No me salió»: el paso que se le trabó, para que la bandeja y el sello de los documentos no lo deduzcan después
        const sinTerminar = Number.isInteger(cuerpo.sinTerminar) && cuerpo.sinTerminar >= 0 && cuerpo.sinTerminar < m.pasos.length ? (cuerpo.sinTerminar as number) : undefined;
        propio.entregas[m.id] = { cuando, quien: yo.nombre, ...(nota ? { nota } : {}), ...(audio ? { audio } : {}), ...(sinTerminar !== undefined ? { sinTerminar } : {}) };
        que = `entrega la misión «${m.titulo}»${sinTerminar !== undefined ? ` sin terminar (no le salió el paso ${sinTerminar + 1})` : ''}`;
        queTb = () => tb(sinTerminar !== undefined ? 'bitacora.accion.entregaSinTerminar' : 'bitacora.accion.entrega', { titulo: m.titulo, paso: (sinTerminar ?? 0) + 1 });
        break;
      }
      case 'deshacer_entrega': {
        const m = mision(cuerpo.mision);
        const e = estado.entregas[m.id];
        if (!e || estadoMision(m, plan, estado) !== 'entregada') throw new Rechazo(t('servidor.api.entregaYaRevisada'));
        if (propio.entregas[m.id]?.cuando === e.cuando) delete propio.entregas[m.id];
        else retirarDelOtro(claveEntrega(m.id, e.cuando), t('servidor.api.accRetirarEntrega'));
        que = `retira la entrega de «${m.titulo}»`;
        queTb = () => tb('bitacora.accion.retiraEntrega', { titulo: m.titulo });
        break;
      }
      case 'comentar': {
        const sobre = cuerpo.sobre ?? { tipo: 'general' };
        if (!TIPOS_SOBRE.includes(sobre.tipo)) throw new Rechazo(t('servidor.api.sobreQueNota'));
        // En una decisión de un documento: si aprueba lo que recomienda el director (un clic, sin escribir), si decide
        // otra cosa o si solo la comenta (queda abierta)
        const postura = sobre.tipo === 'documento' && sobre.decision && POSTURAS.includes(sobre.postura) ? sobre.postura : undefined;
        // En un paso con opciones: la que eligió con un clic (es la nota misma). Cabe entera: validarPlan no deja
        // escribir una opción más larga que MAX_ELECCION, y las de un paso con `varias` caben juntas (MAX_ELECCIONES)
        const eleccion = sobre.tipo === 'mision' && typeof sobre.eleccion === 'string' ? textoDe(sobre.eleccion, MAX_ELECCIONES, t('servidor.api.etOpcion'), t('servidor.api.haceOpcion')) : '';
        // «Hazlo tú», confirmado: le encarga el paso al director (lo hace en su revisión siguiente)
        const hazlo = sobre.tipo === 'mision' && sobre.hazlo === true;
        const texto = textoDe(cuerpo.texto, MAX_TEXTO, t('servidor.api.etNota')) || (postura === 'aprueba' ? 'Apruebo lo que recomiendas.' : eleccion);
        // Sobre qué es: los nombres que pone la página (la misión, la parte, la decisión), enteros o rechazados antes de
        // guardar el audio y los adjuntos. Solo `fragmento` se acota: es el comienzo de la idea que se comenta, un
        // localizador que arma la página (ya recortado allá), no contenido; lo que la persona dice va entero en el texto
        const general = t('servidor.api.comoGeneral');
        const donde = {
          tipo: sobre.tipo,
          ...(sobre.id ? { id: textoDe(sobre.id, 200, t('servidor.api.etNombreComentas'), general) } : {}),
          ...(sobre.seccion ? { seccion: textoDe(sobre.seccion, 200, t('servidor.api.etParteComentas'), general) } : {}),
          ...(sobre.decision ? { decision: textoDe(sobre.decision, 200, t('servidor.api.etDecisionResponde'), general) } : {}),
          ...(sobre.fragmento ? { fragmento: String(sobre.fragmento).trim().slice(0, 200) } : {}),
          ...(postura ? { postura } : {}), ...(sobre.tipo === 'mision' && sobre.aclarar === true ? { aclarar: true } : {}), ...(sobre.tipo === 'mision' && sobre.comprobar === true ? { comprobar: true } : {}), ...(eleccion ? { eleccion } : {}), ...(hazlo ? { hazlo } : {}),
        };
        // Con qué intención la escribe: obligatorio y de un toque, salvo donde el lugar ya lo dice (pd_tipo_obligatorio)
        const tipo = OPCIONES_TIPO_DE_NOTA.find(([t]) => t === cuerpo.tipoNota)?.[0];
        if (!tipo && pideTipo(donde)) throw new Rechazo(t('servidor.api.elegirTipoNota'));
        const nid = `n${Date.now().toString(36)}${yo.rol.slice(0, 3).replace(/-/g, '')}`;
        const lista: unknown[] = Array.isArray(cuerpo.adjuntos) ? cuerpo.adjuntos : [];
        if (lista.length > MAX_ADJUNTOS) throw new Rechazo(t('servidor.api.maxAdjuntos', { n: MAX_ADJUNTOS }));
        if (!texto && !cuerpo.audio && !lista.length) throw new Rechazo(t('servidor.api.notaVaciaEscribe'));
        // Seguir una pregunta: la que sigue debe existir y ser una pregunta (así arma su hilo)
        if (sobre.tipo === 'pregunta' && sobre.id && !estado.notas.some((x) => x.id === sobre.id && esPregunta(x))) throw new Rechazo(t('servidor.api.preguntaYaNoEsta'));
        const audio = cuerpo.audio ? await guardarAudio(raiz, rutas.notas, nid, cuerpo.audio) : undefined;
        if (audio) audios.push(audio);
        const adjuntos: Adjunto[] = [];
        for (const [i, x] of lista.entries()) adjuntos.push(await guardarAdjunto(raiz, rutas.notas, `${nid}-${i + 1}`, x));
        archivos.push(...adjuntos.map((a) => a.ruta));
        // Urgente: una casilla, el porqué ya va en la nota (las preguntas no lo son: se responden en la revisión, como un informe)
        const urgente = sobre.tipo !== 'pregunta' && (cuerpo.urgente === true || cuerpo.urgente === 'on' || cuerpo.urgente === '1');
        propio.notas.push({
          id: nid, cuando, quien: yo.nombre, sobre: donde,
          ...(texto ? { texto } : {}), ...(audio ? { audio } : {}), ...(adjuntos.length ? { adjuntos } : {}), ...(urgente ? { urgente } : {}), ...(tipo ? { tipo } : {}),
        });
        // El «Autorizo» de un paso de confirmación (nmwlai8g8tit): el titular lo dio, y queda en «Permisos» para este
        // proyecto, como una casilla marcada, para que la urgencia o la revisión siguiente lo use sin volver a preguntar
        if (eleccion && titular && sobre.id) {
          const m = plan.misiones?.find((x) => x.id === sobre.id);
          const reglas = reglasQueAutoriza(m?.pasos.find((_, i) => seccionPaso(i) === sobre.seccion), eleccion);
          if (reglas.length) {
            await cambiarAutorizados(raiz, (antes) => autorizadosDelPaso(antes, reglas, id, { cuando, quien: yo.nombre }));
            await anotar(raiz, { quien: yo.nombre, que: tb('bitacora.autorizaReglas', { reglas: reglas.map((r) => `«${r}»`).join(', '), alcance: tb('bitacora.enEsteProyecto') }), desde: tb('bitacora.desde.autorizoEnPaso', { paso: pasoEnLinea(sobre.seccion), mision: sobre.id }), proyecto: id });
          }
          // La limpieza tras la puerta (pd_rebase_memoria, nmwmgrlwbtit): «Sí» borra exactamente las notas que contó su misión;
          // «No» las deja conservadas para siempre (notasConservadas). Sin segunda confirmación: el sí es la decisión
          const paso = m?.pasos.find((_, i) => seccionPaso(i) === sobre.seccion);
          const limpia = typeof paso === 'object' ? paso.limpia : undefined;
          if (limpia && eligeBorrar(eleccion)) {
            const borradas = borrarDeTodos(new Set(notasDeLaLimpieza(estado.notas, plan, estado.cierres, limpia.fase)));
            await anotar(raiz, { quien: yo.nombre, que: tb('bitacora.limpiaMemoriaPuerta', { fase: limpia.fase, borradas }), desde: tb('bitacora.desde.siEnMision', { mision: sobre.id }), proyecto: id });
          }
        }
        que = eleccion ? `elige «${eleccion}» en el ${String(sobre.seccion ?? 'paso').toLowerCase()} de la misión ${sobre.id ?? ''}`.trim()
          : hazlo ? `le encarga al director el ${String(sobre.seccion ?? 'paso').toLowerCase()} de la misión ${sobre.id ?? ''}`.trim()
          : urgente ? 'deja una nota urgente para el director' : sobre.tipo === 'pregunta' ? (sobre.id ? 'sigue una conversación de preguntas con el director' : 'le hace una pregunta al director') : `deja una nota para el director${sobre.tipo === 'general' ? '' : ` (sobre ${sobre.tipo === 'documento' ? `el documento ${sobre.id}` : `${sobre.tipo} ${sobre.id ?? ''}`.trim()})`}`;
        queTb = () => eleccion ? tb('bitacora.accion.elige', { eleccion, paso: pasoEnLinea(sobre.seccion), mision: sobre.id ?? '' })
          : hazlo ? tb('bitacora.accion.encarga', { paso: pasoEnLinea(sobre.seccion), mision: sobre.id ?? '' })
          : urgente ? tb('bitacora.accion.notaUrgente') : sobre.tipo === 'pregunta' ? tb(sobre.id ? 'bitacora.accion.preguntaSigue' : 'bitacora.accion.preguntaNueva')
          : sobre.tipo === 'general' ? tb('bitacora.accion.nota')
          : sobre.tipo === 'documento' ? tb('bitacora.accion.notaSobreDocumento', { id: sobre.id })
          : tb('bitacora.accion.notaSobre', { lugar: `${sobre.tipo} ${sobre.id ?? ''}`.trim() });
        break;
      }
      case 'borrar_nota': {
        const n = estado.notas.find((x) => x.id === cuerpo.id);
        if (!n) throw new Rechazo(t('servidor.api.notaNoEsta'));
        if (plan.respuestas?.[n.id]) throw new Rechazo(t('servidor.api.directorYaRespondio'));
        if (propio.notas.some((x) => x.id === n.id)) propio.notas = propio.notas.filter((x) => x.id !== n.id);
        else retirarDelOtro(n.id, t('servidor.api.accBorrarNota'));
        que = 'borra una nota para el director';
        queTb = () => tb('bitacora.accion.borraNota');
        break;
      }
      case 'editar_nota': {
        // Piensa, corrige y luego envía: lo que está en el buzón se corrige hasta que el director lo responda
        const n = propio.notas.find((x) => x.id === cuerpo.id);
        if (!n) throw new Rechazo(t('servidor.api.soloCorregirPropias'));
        if (plan.respuestas?.[n.id]) throw new Rechazo(t('servidor.api.directorYaRespondio'));
        const texto = textoDe(cuerpo.texto, MAX_TEXTO, t('servidor.api.etNota'));
        // Lo que se le suma después de su audio (Nota › despues): sin nada que decir de ello, queda como estaba
        const despues = cuerpo.despues === undefined ? (n.despues ?? '') : textoDe(cuerpo.despues, MAX_TEXTO, t('servidor.api.etNota'));
        // Sus imágenes también se corrigen (notas de voz del titular nmvosyiartit y nmvot02hhtit, 26 de octubre de 2026;
        // pedido pd_corregir_adjuntos): se quitan de la nota las marcadas (el archivo sigue en la historia de la memoria)
        // y se guardan las nuevas, con el id de la nota y el número que sigue
        const quitar = new Set(Array.isArray(cuerpo.quitarAdjuntos) ? cuerpo.quitarAdjuntos.map(String) : []);
        const nuevos: unknown[] = Array.isArray(cuerpo.adjuntos) ? cuerpo.adjuntos : [];
        const quedan = (n.adjuntos ?? []).filter((a) => !quitar.has(a.ruta));
        if (quedan.length + nuevos.length > MAX_ADJUNTOS) throw new Rechazo(t('servidor.api.maxAdjuntos', { n: MAX_ADJUNTOS }));
        if (!texto && !despues && !n.audio && !quedan.length && !nuevos.length) throw new Rechazo(t('servidor.api.notaQuedariaVacia'));
        let siguiente = Math.max(0, ...(n.adjuntos ?? []).map((a) => Number(/-(\d+)\.[a-z0-9]+$/i.exec(a.ruta)?.[1] ?? 0)));
        for (const x of nuevos) {
          const a = await guardarAdjunto(raiz, rutas.notas, `${n.id}-${++siguiente}`, x);
          quedan.push(a);
          archivos.push(a.ruta);
        }
        if (quedan.length) n.adjuntos = quedan;
        else delete n.adjuntos;
        if (texto) n.texto = texto;
        else delete n.texto;
        if (despues) n.despues = despues;
        else delete n.despues;
        que = nuevos.length || quitar.size ? 'corrige una nota para el director, con sus adjuntos' : 'corrige una nota para el director';
        queTb = () => tb(nuevos.length || quitar.size ? 'bitacora.accion.corrigeNotaAdjuntos' : 'bitacora.accion.corrigeNota');
        break;
      }
      case 'tipo_nota': {
        // El tipo de una nota propia se cambia con su mismo botón del Buzón, hasta que el director la responda (nota de voz
        // del titular nmvt1vaaltit, 29 de octubre de 2026: si se equivocó al elegirlo, lo corrige antes de la revisión)
        const n = propio.notas.find((x) => x.id === cuerpo.id);
        if (!n) throw new Rechazo(t('servidor.api.soloTipoPropias'));
        if (plan.respuestas?.[n.id]) throw new Rechazo(t('servidor.api.directorYaRespondio'));
        if (!pideTipo(n.sobre)) throw new Rechazo(t('servidor.api.notaYaDiceQueEs'));
        const tipo = OPCIONES_TIPO_DE_NOTA.find(([t]) => t === cuerpo.tipoNota)?.[0];
        if (!tipo) throw new Rechazo(t('servidor.api.elegirTipoNota'));
        n.tipo = tipo;
        que = 'cambia el tipo de una nota para el director';
        queTb = () => tb('bitacora.accion.cambiaTipoNota');
        break;
      }
      case 'corregir_transcripcion': {
        // Lo que se entendió de un audio propio (el .txt junto al audio), hasta que el director lo lea
        const audio = typeof cuerpo.audio === 'string' ? cuerpo.audio : '';
        const nota = audio ? propio.notas.find((x) => x.audio === audio) : undefined;
        const entrega = audio ? Object.entries(propio.entregas).find(([, e]) => e.audio === audio) : undefined;
        if (!nota && !entrega) throw new Rechazo(t('servidor.api.soloCorregirAudios'));
        if (nota && plan.respuestas?.[nota.id]) throw new Rechazo(t('servidor.api.directorYaRespondio'));
        if (entrega && estadoMision(mision(entrega[0]), plan, estado) !== 'entregada') throw new Rechazo(t('servidor.api.directorYaReviso'));
        // Entera: un dictado de diez minutos ya pasa de los 6.000 caracteres que antes se guardaban
        const texto = textoDe(cuerpo.texto, MAX_TEXTO, t('servidor.api.etLoDijiste'));
        if (!texto) throw new Rechazo(t('servidor.api.escribeLoDijiste'));
        const txt = audio.replace(/\.[a-z0-9]+$/i, '.txt');
        await writeFile(enDisco(raiz, txt), texto + '\n', 'utf-8');
        archivos.push(txt);
        // Su texto ya quedó escrito: si el audio seguía aquí (su transcripción había salido vacía o fallado), se borra
        borrarSiTranscrito(enDisco(raiz, audio));
        que = 'corrige lo que se entendió de su nota de voz';
        queTb = () => tb('bitacora.accion.corrigeTranscripcion');
        break;
      }
      case 'marcar': {
        soloTitular(t('servidor.api.accDecisionFinal'));
        const c = criterio(cuerpo.criterio);
        const valor = cuerpo.estado === 'no_aplica' ? 'no_aplica' : 'cumplido';
        const nota = textoDe(cuerpo.nota, MAX_TEXTO, t('servidor.api.etPorQue'));
        if (valor === 'no_aplica' && !nota) throw new Rechazo(t('servidor.api.noAplicaPorQue'));
        propio.marcas[c.id] = { estado: valor, ...firma, ...(nota ? { nota } : {}) };
        que = `decide que ${valor === 'no_aplica' ? 'no aplica' : 'está cumplido'} «${c.texto}»`;
        queTb = () => tb(valor === 'no_aplica' ? 'bitacora.accion.decideNoAplica' : 'bitacora.accion.decideCumplido', { texto: c.texto });
        break;
      }
      case 'desmarcar': {
        soloTitular(t('servidor.api.accDecisionFinal'));
        const c = criterio(cuerpo.criterio);
        delete propio.marcas[c.id];
        que = `vuelve a dejar pendiente «${c.texto}»`;
        queTb = () => tb('bitacora.accion.vuelvePendiente', { texto: c.texto });
        break;
      }
      case 'cerrar': {
        soloTitular(t('servidor.api.accCruzarPuerta'));
        const f = faseDe(cuerpo.fase);
        // «Meta cumplida» con lo sin marcar a la vista (nmwnz4vqytit): solo con el plan en una línea, y lo sin marcar queda en el cierre
        const conPendientes = cuerpo.conPendientes === true && !!plan.linea;
        const ctxPuerta = { plan, estado, senales: await senales(id, plan, proyecto) };
        const bloqueos = bloqueosPuerta(f, ctxPuerta, { conPendientes });
        if (bloqueos.length) throw new Rechazo(bloqueos.join(' '));
        const sinMarcar = conPendientes ? avanceFase(f, ctxPuerta).pendientes.map((c) => `«${c.texto}»`) : [];
        const escrita = textoDe(cuerpo.nota, MAX_TEXTO, t('servidor.api.etPuerta'));
        const nota = [escrita, sinMarcar.length ? t('servidor.api.sinMarcarAlCumplir', { lista: sinMarcar.join(', ') }) : ''].filter(Boolean).join(' ');
        propio.cierres[f.id] = { ...firma, ...(nota ? { nota } : {}) };
        que = `cruza la puerta «${f.puerta.nombre}» de la fase «${f.nombre}»`;
        queTb = () => tb('bitacora.accion.cruzaPuerta', { puerta: f.puerta.nombre, fase: f.nombre });
        break;
      }
      case 'rebase': {
        // El rebase de la memoria (pedido pd_rebase_memoria): borra las notas cerradas, solo tras el «Confirmo» con el
        // conteo a la vista (nmwfntv5vtit). El Studio es el único que escribe director/equipo/, por eso lo hace aquí.
        soloTitular(t('servidor.api.accRebase'));
        if (cuerpo.confirmo !== true) throw new Rechazo(t('servidor.api.rebaseSinConfirmar'));
        const borradas = borrarDeTodos(new Set(notasBorrables(estado.notas, plan)));
        que = `limpia la memoria: borra ${borradas} notas cerradas (rebase, con «Confirmo»)`;
        queTb = () => tb('bitacora.accion.rebase', { n: borradas });
        break;
      }
      case 'reabrir': {
        soloTitular(t('servidor.api.accReabrirPuerta'));
        const f = faseDe(cuerpo.fase);
        const motivo = textoDe(cuerpo.nota, MAX_TEXTO, t('servidor.api.etPorQue'));
        if (!motivo) throw new Rechazo(t('servidor.api.reabrirPuertaPorQue'));
        // Reabrir una fase reabre también las que vinieron después
        for (const g of plan.fases.slice(plan.fases.indexOf(f))) delete propio.cierres[g.id];
        que = `reabre la fase «${f.nombre}»: ${motivo}`;
        queTb = () => tb('bitacora.accion.reabreFase', { fase: f.nombre, motivo });
        break;
      }
      case 'excepcion': {
        const frente = plan.frentes.find((x) => x.id === cuerpo.frente);
        if (!frente) throw new Rechazo(t('servidor.api.frenteNoEnRuta'));
        const motivo = textoDe(cuerpo.motivo, MAX_TEXTO, t('servidor.api.etRazonExcepcion'));
        if (!motivo) throw new Rechazo(t('servidor.api.excepcionNecesitaRazon'));
        const dias = Math.min(30, Math.max(1, enteroDe(cuerpo.dias) || 7));
        const fase = faseActual(plan, estado);
        propio.excepciones.push({ id: `x${Date.now().toString(36)}`, ...firma, frente: frente.id, fase: fase.id, motivo, hasta: sumarDias(firma.fecha, dias - 1) });
        que = `abre una excepción en «${frente.nombre}»: ${motivo}`;
        queTb = () => tb('bitacora.accion.abreExcepcion', { frente: frente.nombre, motivo });
        break;
      }
      case 'cerrar_excepcion': {
        const x = estado.excepciones.find((e) => e.id === cuerpo.id);
        if (!x) throw new Rechazo(t('servidor.api.excepcionNoEsta'));
        const mia = propio.excepciones.find((e) => e.id === x.id);
        if (mia) mia.cerrada = firma;
        else retirarDelOtro(x.id, t('servidor.api.accCerrarExcepcion'));
        que = `cierra la excepción de «${plan.frentes.find((f) => f.id === x.frente)?.nombre ?? x.frente}»`;
        queTb = () => tb('bitacora.accion.cierraExcepcion', { frente: plan.frentes.find((f) => f.id === x.frente)?.nombre ?? x.frente });
        break;
      }
      case 'responder': {
        soloTitular(t('servidor.api.accResponderPropuestas'));
        const p = plan.propuestas.find((x) => x.id === cuerpo.propuesta);
        if (!p) throw new Rechazo(t('servidor.api.propuestaNoEsta'));
        if (cuerpo.estado === null || cuerpo.estado === '') {
          delete propio.propuestas[p.id];
          que = `deja sin responder «${p.titulo}»`;
          queTb = () => tb('bitacora.accion.sinResponder', { titulo: p.titulo });
          break;
        }
        if (!RESPUESTAS.includes(cuerpo.estado)) throw new Rechazo(t('servidor.api.respuestaDesconocida'));
        const nota = textoDe(cuerpo.nota, MAX_TEXTO, t('servidor.api.etPorQue'));
        propio.propuestas[p.id] = { estado: cuerpo.estado, ...firma, ...(nota ? { nota } : {}) };
        que = `${cuerpo.estado === 'aceptada' ? 'acepta' : cuerpo.estado === 'descartada' ? 'descarta' : 'deja en estudio'} la propuesta «${p.titulo}»`;
        queTb = () => tb(cuerpo.estado === 'aceptada' ? 'bitacora.accion.aceptaPropuesta' : cuerpo.estado === 'descartada' ? 'bitacora.accion.descartaPropuesta' : 'bitacora.accion.estudiaPropuesta', { titulo: p.titulo });
        break;
      }
      case 'paso': {
        const m = mision(cuerpo.mision);
        if (m.para !== yo.rol && !titular) throw new Rechazo(t('servidor.api.misionDeOtra'));
        if (estadoMision(m, plan, estado) === 'bloqueada') throw new Rechazo(t('servidor.api.misionBajoNiebla'));
        const hechos = [...new Set((Array.isArray(cuerpo.hechos) ? (cuerpo.hechos as unknown[]) : []).map(Number))]
          .filter((i) => Number.isInteger(i) && i >= 0 && i < m.pasos.length)
          .sort((a, b) => a - b);
        // Con la huella de cada paso marcado: si el director lo reescribe, la marca deja de valer (pasosVigentes)
        propio.pasos = { ...(propio.pasos ?? {}), [m.id]: { hechos, cuando, quien: yo.nombre, huellas: huellasDePasos(m, hechos) } };
        // Marcar un paso es haberla empezado
        if (hechos.length && !estado.empezadas[m.id]) propio.empezadas[m.id] = { cuando, quien: yo.nombre };
        que = `marca ${hechos.length} de ${m.pasos.length} pasos de «${m.titulo}»`;
        queTb = () => tb('bitacora.accion.marcaPasos', { hechos: hechos.length, n: m.pasos.length, titulo: m.titulo });
        break;
      }
      case 'leido': {
        // Las partes de un documento que ya leyó: solo una bandera de quien lee
        const ruta = typeof cuerpo.doc === 'string' ? cuerpo.doc : '';
        if (!esDocumento(ruta)) throw new Rechazo(t('servidor.api.documentoNoSeMarca'));
        // Localizadores que arma la página (el nombre de cada parte, la huella de cada idea), no contenido: se acotan
        const textos = (x: unknown, max: number) => [...new Set((Array.isArray(x) ? (x as unknown[]) : []).filter((y): y is string => typeof y === 'string').map((y) => y.slice(0, 310)))].slice(0, max);
        const partes = textos(cuerpo.partes, 200);
        // Y las ideas de cada parte que ya marcó como entendidas
        const trozos = textos(cuerpo.trozos, 2000);
        // Marcar una idea suelta no va a la bitácora: solo cuando cambian las partes leídas
        const antes = propio.leidos?.[claveLeido(yo.rol, ruta)];
        if (antes && antes.partes.length === partes.length && partes.every((p) => antes.partes.includes(p)) && !!antes.completo === (cuerpo.completo === true)) callado = true;
        propio.leidos = { ...(propio.leidos ?? {}), [claveLeido(yo.rol, ruta)]: { partes, ...(trozos.length ? { trozos } : {}), ...(cuerpo.completo === true ? { completo: true } : {}), cuando, quien: yo.nombre } };
        // Una idea suelta no va a la bitácora del proyecto, pero sí a la de este computador (cada clic queda registrado:
        // nota de voz del titular, 23 de octubre de 2026), con lo que de verdad hizo
        const ideas = trozos.length - (antes?.trozos?.length ?? 0);
        const nIdeas = (n: number) => (n === 1 ? 'una idea' : `${n} ideas`);
        que = callado ? (ideas > 0 ? `marca ${nIdeas(ideas)} de ${ruta} como ${ideas === 1 ? 'entendida' : 'entendidas'}` : ideas < 0 ? `quita la marca de ${nIdeas(-ideas)} de ${ruta}` : `cambia las ideas entendidas de ${ruta}`)
          : cuerpo.completo === true ? `termina de leer ${ruta}` : `marca ${partes.length} ${partes.length === 1 ? 'parte leída' : 'partes leídas'} de ${ruta}`;
        queTb = () => callado ? (ideas > 0 ? tb('bitacora.accion.marcaIdeas', { n: ideas, ruta }) : ideas < 0 ? tb('bitacora.accion.quitaIdeas', { n: -ideas, ruta }) : tb('bitacora.accion.cambiaIdeas', { ruta }))
          : cuerpo.completo === true ? tb('bitacora.accion.terminaLeer', { ruta }) : tb('bitacora.accion.marcaPartes', { n: partes.length, ruta });
        break;
      }
      case 'anotar': {
        const texto = textoDe(cuerpo.texto, MAX_TEXTO, t('servidor.api.etNotaBitacora'));
        if (!texto) throw new Rechazo(t('servidor.api.notaVacia'));
        que = `anota en la bitácora: ${texto}`;
        queTb = () => tb('bitacora.accion.anota', { texto });
        break;
      }
      // ── Lo del proyecto: solo el titular
      // Corregir el nombre de una parte y lo que hace, en su idioma (pd_nombres_dos_idiomas; nmwpmfyv5tit): queda en el
      // proyecto, se muestra en vez del del director, y el director reescribe el otro idioma en la revisión siguiente
      case 'corregir_parte': {
        soloTitular(t('servidor.api.accCambiarProyecto'));
        const f = plan.frentes.find((x) => x.id === cuerpo.frente);
        if (!f) throw new Rechazo(t('servidor.api.ponleNombreProyecto'));
        const nombre = textoDe(cuerpo.nombre, 120, t('servidor.api.etNombreProyecto'));
        const queHace = textoDe(cuerpo.que, MAX_TEXTO, t('servidor.api.etContextoProyecto'));
        if (!nombre) throw new Rechazo(t('servidor.api.ponleNombreProyecto'));
        proyecto.correcciones = correccionDeParte(proyecto.correcciones, f.id, idiomaActual() === 'es' ? 'es' : 'en', nombre, queHace);
        cambiaProyecto = true;
        que = `corrige la parte «${nombre}»`;
        queTb = () => tb('bitacora.accion.corrigeParte', { nombre });
        break;
      }
      case 'proyecto': {
        soloTitular(t('servidor.api.accCambiarProyecto'));
        proyecto.nombre = textoDe(cuerpo.nombre, 120, t('servidor.api.etNombreProyecto'));
        proyecto.contexto = textoDe(cuerpo.contexto, MAX_TEXTO, t('servidor.api.etContextoProyecto'));
        proyecto.metaInicial = textoDe(cuerpo.metaInicial, MAX_TEXTO, t('servidor.api.etLoQueQuieres'));
        if (cuerpo.terminado !== undefined) proyecto.terminado = textoDe(cuerpo.terminado, MAX_TEXTO, t('servidor.api.etCuandoCompleto'));
        // La dirección en la web y la rama ya no están en el formulario (nota nmwavfpubtit): lo guardado se conserva
        proyecto.repositorio = {
          url: cuerpo.url === undefined ? proyecto.repositorio?.url ?? '' : textoDe(cuerpo.url, 300, t('servidor.api.etDireccionWeb')).replace(/\/\/[^/@]+@/, '//'),
          rama: cuerpo.rama === undefined ? proyecto.repositorio?.rama ?? '' : textoDe(cuerpo.rama, 100, t('servidor.api.etRamaPrincipal')),
        };
        if (!proyecto.nombre) throw new Rechazo(t('servidor.api.ponleNombreProyecto'));
        cambiaProyecto = true;
        que = `cuenta qué es el proyecto «${proyecto.nombre}» y qué busca`;
        queTb = () => tb('bitacora.accion.proyecto', { nombre: proyecto.nombre });
        break;
      }
      case 'objetivo': {
        soloTitular(t('servidor.api.accFijarMeta'));
        if (proyecto.objetivo?.firmado) throw new Rechazo(t('servidor.api.metaYaFijada'));
        const texto = textoDe(cuerpo.texto, MAX_TEXTO, t('servidor.api.etMeta'));
        const exito = textoDe(cuerpo.exito, MAX_TEXTO, t('servidor.api.etComoSabremos'));
        if (!texto || !exito) throw new Rechazo(t('servidor.api.metaClara'));
        const horizonte = textoDe(cuerpo.horizonte, MAX_TEXTO, t('servidor.api.etHorizonte'));
        // El candidato que se usó no es un texto: vale solo si es uno de los del plan (si no, no se guarda)
        const candidato = String(cuerpo.candidato ?? '').trim();
        proyecto.objetivo = { texto, exito, ...(horizonte ? { horizonte } : {}), ...(candidato && plan.objetivos?.some((o) => o.id === candidato) ? { candidato } : {}), firmado: firma };
        cambiaProyecto = true;
        que = `fija la meta: ${texto}`;
        queTb = () => tb('bitacora.accion.fijaMeta', { texto });
        break;
      }
      case 'reabrir_objetivo': {
        soloTitular(t('servidor.api.accReabrirMeta'));
        if (!proyecto.objetivo) throw new Rechazo(t('servidor.api.noHayMeta'));
        const motivo = textoDe(cuerpo.motivo, MAX_TEXTO, t('servidor.api.etPorQue'));
        if (!motivo) throw new Rechazo(t('servidor.api.reabrirMetaPorQue'));
        proyecto.objetivosAnteriores = [...(proyecto.objetivosAnteriores ?? []), { ...proyecto.objetivo, reabierto: { ...firma, nota: motivo } }];
        proyecto.objetivo = null;
        cambiaProyecto = true;
        que = `reabre el objetivo: ${motivo}`;
        queTb = () => tb('bitacora.accion.reabreObjetivo', { motivo });
        break;
      }
      case 'replantear_objetivo': {
        // «Replantear la meta»: la de ahora pasa al historial (con el porqué, si lo hay) y la nueva queda fijada de una vez
        soloTitular(t('servidor.api.accReplantearMeta'));
        if (!proyecto.objetivo) throw new Rechazo(t('servidor.api.noHayMetaReplantear'));
        const texto = textoDe(cuerpo.texto, MAX_TEXTO, t('servidor.api.etMeta'));
        const exito = textoDe(cuerpo.exito, MAX_TEXTO, t('servidor.api.etComoSabremos'));
        if (!texto || !exito) throw new Rechazo(t('servidor.api.metaClara'));
        const horizonte = textoDe(cuerpo.horizonte, MAX_TEXTO, t('servidor.api.etHorizonte'));
        const motivo = textoDe(cuerpo.motivo, MAX_TEXTO, t('servidor.api.etPorQue'));
        proyecto.objetivosAnteriores = [...(proyecto.objetivosAnteriores ?? []), { ...proyecto.objetivo, reabierto: { ...firma, ...(motivo ? { nota: motivo } : {}) } }];
        proyecto.objetivo = { texto, exito, ...(horizonte ? { horizonte } : {}), firmado: firma };
        cambiaProyecto = true;
        que = `replantea la meta: ${texto}`;
        queTb = () => tb('bitacora.accion.replantea', { texto });
        break;
      }
      default:
        throw new Rechazo(t('servidor.api.accionDesconocida'));
    }
    // La bitácora del proyecto, en el idioma de la interfaz de ese momento, como la de este computador (nmwo4nz4ytit); el
    // commit del equipo dice esa misma frase en inglés (programarCommit; nmwp711kitit)
    const queBitacora = () => textoDeBitacora(queTb());
    const linea = queBitacora();
    if (!callado) propio.bitacora.push({ ...firma, texto: linea.charAt(0).toUpperCase() + linea.slice(1) });
    propio.actualizado = firma.fecha;
    const unido = unirEstados({ ...leido.porPersona, [yo.rol]: propio });
    const errores = [...validarEstado(unido, plan).filter((e) => !yaRoto.has(e)), ...(cambiaProyecto ? validarProyecto(proyecto) : [])];
    if (errores.length) throw new Rechazo(errores.join(' '));
    await escribirJson(rutas.persona(yo.rol), propio);
    for (const p of otrosLimpios) {
      await escribirJson(rutas.persona(p), leido.porPersona[p]);
      archivos.push(rutas.persona(p));
    }
    if (cambiaProyecto) {
      await escribirJson(rutas.proyecto, proyecto);
      archivos.push(rutas.proyecto);
      olvidarIdentidad();
      caches.delete(id);
    }
    return { estado: unido, proyecto, que, queBitacora, queTb, archivos, audios };
  }

  /**
   * Entrega un proyecto al Studio: abre su memoria en su repositorio (.stl, rama stl) y, si no la tenía, la crea desde la
   * plantilla con quien lo entrega como titular. Si ya la tenía (el proyecto ya estuvo en un Estudio, aquí o en otro
   * computador), la retoma tal cual. Devuelve el id que tiene en este Estudio.
   */
  /**
   * Lo que el escaneo encontró de un proyecto (la página lo devuelve tal cual), entero o rechazado: hasta 5 señales, cada
   * texto con su tope. Sirve a «proyecto-nuevo» con el proyecto elegido del escaneo (pd_entrega_al_instante).
   */
  function historialDeEscaneo(lista: unknown, hace: string): NonNullable<Proyecto['historialIA']> {
    if (!Array.isArray(lista)) return [];
    return lista.slice(0, 5).map((s: any) => ({ agente: textoDe(s?.agente, 40, t('servidor.api.etAgenteIA'), hace), ...(s?.sesiones ? { sesiones: enteroDe(s.sesiones) } : {}), ...(s?.ultima ? { ultima: textoDe(s.ultima, 40, t('servidor.api.etFechaIA'), hace) } : {}), ...(s?.donde ? { donde: textoDe(s.donde, 500, t('servidor.api.etDondeIA'), hace) } : {}) })).filter((s: { agente: string }) => s.agente);
  }

  async function entregar(x: { nombre: string; ruta: string; remoto: string; yo: Identidad; tipo: 'nuevo' | 'existente'; contexto: string; metaInicial: string; terminado: string; historialIA?: Proyecto['historialIA']; diagnosticoPedido?: boolean; metaDetectada?: string; contextoOriginal?: string; contextoPorTraducir?: boolean }): Promise<string> {
    const { yaTenia } = await abrirMemoria(x.ruta);
    let nombre = x.nombre;
    if (yaTenia) {
      try {
        nombre = JSON.parse(await readFile(join(x.ruta, '.stl', 'proyecto.json'), 'utf-8')).nombre || nombre;
      } catch { /* se queda con el nombre que le dieron */ }
    }
    const id = idDeNombre(nombre, Object.keys((await leerLocal(raiz)).repositorios));
    await guardarRutaRepositorio(raiz, id, x.ruta);
    if (yaTenia) return id;
    const archivos = await crearProyecto(raiz, {
      id, nombre, tipo: x.tipo, contexto: x.contexto, metaInicial: x.metaInicial, terminado: x.terminado, url: x.remoto,
      titular: { nombre: x.yo.nombre, correo: x.yo.correo },
      ...(x.historialIA?.length ? { historialIA: x.historialIA } : {}),
      // Su arranque, en el idioma de la interfaz (nota nmw9wgco4tit)
      idioma: (await leerLocal(raiz)).idioma ?? 'es',
      // Con «Entregar y pedir su diagnóstico», sin la misión que solo pedía pedirlo (pd_entregar_y_diagnosticar)
      ...(x.diagnosticoPedido ? { diagnosticoPedido: true } : {}),
      // Contado en otro idioma (pd_campo_libre; nmwjm4r7atit, nmwjm4dcjtit): el original junto a la traducción, o la marca
      ...(x.contextoOriginal ? { contextoOriginal: x.contextoOriginal } : {}),
      ...(x.contextoPorTraducir ? { contextoPorTraducir: true } : {}),
    });
    // La parte de la meta que la comprobación encontró en lo contado (pd_campo_libre, nmwl4xd7utit) se guarda donde el
    // diagnóstico guarda la meta que detecta: `detectado.meta` del plan (pd_diagnostico_llena). «Tu meta» la muestra
    // marcada «Detectado» mientras la persona no escriba la suya; proyecto.json, que es del titular, no se toca
    if (x.metaDetectada) {
      const planArchivo = enDisco(raiz, rutasDe(id).plan);
      const plan = JSON.parse(await readFile(planArchivo, 'utf-8'));
      plan.detectado = { ...(plan.detectado ?? {}), meta: x.metaDetectada };
      await writeFile(planArchivo, JSON.stringify(plan, null, 2) + '\n', 'utf-8');
    }
    await syncDe(id).registrar(enMemoria(archivos), mensajeDelStudio(id, `${x.yo.nombre} hands the project «${nombre}» to the director`));
    return id;
  }

  /**
   * Los documentos de un proyecto: los suyos (proyectos/<id>/docs/, que el plan nombra como docs/…), los del Estudio
   * (docs/, el método) y los .md del repositorio del proyecto (repo:…).
   */
  async function listarDocumentos(id: string): Promise<{ documentos: { ruta: string; titulo: string }[]; fuera: number }> {
    const base = rutasDe(id).base;
    const rutas = new Map<string, string>(); // la ruta que usa el plan → la ruta en el Estudio (proyectos/<id>/docs/… o docs/…)
    /** Los .md de una carpeta del Estudio (ruta del Estudio, que puede estar en la memoria del proyecto). */
    async function recorrer(carpeta: string) {
      const dir = enDisco(raiz, carpeta);
      if (!existsSync(dir)) return;
      for (const e of await readdir(dir, { withFileTypes: true })) {
        const ruta = `${carpeta}/${e.name}`;
        if (e.isDirectory()) await recorrer(ruta);
        else if (e.name.endsWith('.md')) rutas.set(ruta.startsWith(`${base}/`) ? ruta.slice(base.length + 1) : ruta, ruta);
      }
    }
    await recorrer('docs');
    await recorrer(`${base}/docs`);
    for (const r of await listarRemoto(raiz, 'docs')) if (r.endsWith('.md')) rutas.set(r, r);
    for (const r of await listarRemoto(raiz, `${base}/docs`)) if (r.endsWith('.md')) rutas.set(r.slice(base.length + 1), r);
    const salida: { ruta: string; titulo: string; studio?: boolean }[] = [];
    for (const [ruta, real] of rutas) {
      const local = enDisco(raiz, real);
      const texto = existsSync(local) ? await readFile(local, 'utf-8') : ((await leerFrescoTexto(raiz, real)) ?? '');
      // Los del Studio (docs/, su método) no se mezclan con los del proyecto
      salida.push({ ruta, titulo: tituloMd(texto, ruta), ...(real.startsWith(`${base}/`) ? {} : { studio: true }) });
    }
    const r = await repositorio(id);
    // Los .md del repositorio que no caben en MAX_DOCS_REPO: la columna lo dice, no los deja fuera en silencio
    let fuera = 0;
    if (r.info) {
      // Sin comillas ni escapes en las rutas con tildes o eñes (core.quotepath): así se leen tal cual
      const ls = await gitEn(r.info.ruta, ['-c', 'core.quotepath=off', 'ls-files', '--', '*.md', '*.MD']);
      // Si el proyecto es el propio Studio, sus documentos del método ya están en «Del Estudio» y los de los demás
      // proyectos no son suyos; del método, solo el diseño y la evaluación del Studio, que son de este proyecto
      const propio = misma(r.info.ruta, raiz);
      const delStudio = (l: string) => /^proyectos\//.test(l) || (/^docs\//.test(l) && !/^docs\/metodo\/(diseno|evaluacion)-studio\.md$/.test(l));
      const todos = ls.out.split('\n').map((l) => l.trim()).filter((l) => l && !/(^|\/)(node_modules|vendor|dist|build)\//.test(l) && !(propio && delStudio(l)));
      fuera = Math.max(0, todos.length - MAX_DOCS_REPO);
      const mds = todos.slice(0, MAX_DOCS_REPO);
      for (const m of mds) {
        const ruta = `repo:${m}`;
        if (!esDocumento(ruta)) continue;
        const texto = (await leerDelRepositorio(r.info.ruta, m))?.slice(0, 4000) ?? '';
        salida.push({ ruta, titulo: `${tituloMd(texto, m)} · ${m}` });
      }
    }
    return { documentos: salida.sort((a, b) => Number(a.ruta.startsWith('repo:')) - Number(b.ruta.startsWith('repo:')) || a.ruta.localeCompare(b.ruta)), fuera };
  }

  /**
   * Un documento: docs/… del proyecto (o, si no está, del Estudio) o repo:… de su repositorio. Además, un archivo clave del
   * plan que no es .md (pd_archivos_clave), como texto en un bloque de código: solo los que el plan nombra en
   * `archivosClave`, y nunca un secreto (.env, llaves: rutaPermitida).
   */
  async function leerDocumento(id: string, ruta: string): Promise<string | null> {
    if (!esDocumento(ruta) && ruta.startsWith('repo:')) {
      const rel = ruta.slice(5);
      if (!rutaPermitida(rel) || !esArchivoClave((await leerPlan(id)).archivosClave, rel)) return null;
      const r = await repositorio(id);
      const texto = r.info ? await leerDelRepositorio(r.info.ruta, rel) : null;
      return texto === null ? null : comoDocumento(rel, texto);
    }
    if (!esDocumento(ruta)) return null;
    if (ruta.startsWith('repo:')) {
      const r = await repositorio(id);
      return r.info ? leerDelRepositorio(r.info.ruta, ruta.slice(5)) : null;
    }
    return (await leerFrescoTexto(raiz, `${rutasDe(id).base}/${ruta}`)) ?? leerFrescoTexto(raiz, ruta);
  }

  // ─────────────────────────────────────────── el chequeo de salud (salud.ts; pd_salud_b), sin modelo
  // Al encender y cada 5 minutos. Mira el proyecto activo, la revisión de estudio.local.json, Claude Code y el disco; lo
  // seguro lo arregla solo (una revisión atascada, un candado viejo, marcas que ya no valen) y lo anota en la bitácora
  let salud: EstadoSalud | null = null;
  let chequeando: Promise<EstadoSalud> | null = null;
  async function sondasDeSalud(): Promise<Sonda[]> {
    const id = await activo();
    const sondas: Sonda[] = [];
    if (id) {
      const rutas = rutasDe(id);
      sondas.push({
        id: 'plan',
        mirar: async () => {
          const problema = chequearPlan(await readFile(enDisco(raiz, rutas.plan), 'utf-8').catch(() => null), () => []);
          if (problema) return { problema };
          const proyecto = await leerProyecto(id);
          const errores = validarPlan(await leerPlan(id), proyecto.equipo.length ? proyecto.equipo.map((i) => i.id) : [TITULAR]);
          return errores.length ? { problema: { id: 'plan', dato: errores[0].slice(0, 300) } } : null;
        },
      });
      // Las marcas de quien usa este computador: las de otra persona las arregla su propio Studio, que es quien las escribe
      sondas.push({
        id: 'marcas',
        mirar: async () => {
          const yo = (await leerIdentidad(raiz, id)).rol;
          if (!yo) return null;
          const corregir = async () => {
            const { propio } = await leerEstado(id, yo, await leerProyecto(id));
            return propio ? { propio, cambios: marcasCorregidas((await leerPlan(id)).misiones ?? [], propio.pasos) } : null;
          };
          const antes = await corregir();
          if (!antes?.cambios) return null;
          return {
            arreglo: {
              tipo: 'marcas',
              dato: Object.keys(antes.cambios).join(', '),
              // En la fila de las decisiones, leído otra vez: nunca a la vez que un clic de la persona
              hacer: () => enFila(async () => {
                const ahora = await corregir();
                if (!ahora?.cambios) return;
                ahora.propio.pasos = { ...(ahora.propio.pasos ?? {}), ...ahora.cambios };
                await escribirJson(rutas.persona(yo), ahora.propio);
                const cuales = Object.keys(ahora.cambios).join(', ');
                programarCommit(id, "the Studio's health check", () => `removes step marks that no longer fit their mission (${cuales})`, [rutas.persona(yo)]);
              }),
            },
          };
        },
      });
    }
    sondas.push({
      id: 'revision',
      mirar: async () => {
        const r = revisionDe(await leerLocal(raiz), id);
        if (!r) return null;
        const repo = await leerRutaRepositorio(raiz, r.proyecto);
        const archivo = repo ? archivoDelCandado(repo) : null;
        const c = archivo ? leerCandadoDirector(archivo) : null;
        const atascada = revisionAtascada(r, {
          lanzado: estadoDelLanzado(turnoDeProyecto(join(raiz, '.revisiones'), r.proyecto), r.proyecto).estado,
          candadoVivo: !!c && !candadoLibre(c, Date.now(), procesoVive),
          esteLaVigila: !!revisor?.estado().revisandoEn.includes(r.proyecto),
          ahora: Date.now(),
          maxMin: MAX_MIN,
          minSesion: MIN_CANDADO_SESION,
        });
        if (!atascada) return null;
        return {
          arreglo: {
            tipo: 'revision',
            dato: r.proyecto,
            hacer: async () => {
              const problema = t(r.lanzada ? 'revisor.yaNoCorre' : 'salud.revisionSinProceso');
              await marcarLanzada(raiz, r.proyecto, problema, fallaDeProyecto(raiz, r.proyecto, { problema, muerto: true }));
            },
          },
        };
      },
    });
    if (id)
      sondas.push({
        id: 'candado',
        mirar: async () => {
          const repo = await leerRutaRepositorio(raiz, id);
          const archivo = repo ? archivoDelCandado(repo) : null;
          if (!archivo || !candadoViejo(leerCandadoDirector(archivo), Date.now(), procesoVive)) return null;
          return {
            arreglo: {
              tipo: 'candado',
              dato: id,
              hacer: async () => {
                if (candadoViejo(leerCandadoDirector(archivo), Date.now(), procesoVive)) await rm(archivo, { force: true });
              },
            },
          };
        },
      });
    const memoria = id ? memoriaDe(raiz, id) : null;
    if (memoria)
      sondas.push({
        id: 'rama',
        mirar: async () => {
          const u = await gitEn(memoria, ['ls-files', '-u']);
          if (!u.ok) throw new Error('git no respondió');
          const problema = chequearRama(u.out);
          return problema ? { problema } : null;
        },
      });
    // Claude Code: `claude auth status`, que no llama al modelo ni gasta del plan (nmw9p75pftit). Apagado a propósito, no se mira
    if ((await leerLocal(raiz)).agente !== false)
      sondas.push({
        id: 'claude',
        mirar: async () => {
          const problema = chequearClaude(await sesionDeClaude());
          return problema ? { problema } : null;
        },
      });
    sondas.push({
      id: 'disco',
      mirar: async () => {
        const problema = chequearDisco(libreEnDisco(raiz));
        return problema ? { problema } : null;
      },
    });
    return sondas;
  }
  /** La línea de «Diagnosticar y reparar»: lo pedido, si espera una revisión, lo último que hizo y el uso de cinco horas. */
  const estadoReparacion = async (): Promise<EstadoReparacion> => {
    const l = await leerLocal(raiz);
    const rep = leerReparacion(join(raiz, '.estudio'));
    const ultimo = rep?.lanzada && !rep.hecha ? progresoDeProyecto(raiz, PROYECTO_REPARAR, 'reparacion').at(-1)?.texto ?? null : null;
    return estadoDeReparacion(rep, { revisando: proyectosRevisando(l).length > 0, ultimo, uso: usoCincoHorasReciente(raiz) });
  };
  /** Las fallas de los últimos 90 días por causa, y la causa de dos seguidas, para «Salud del Studio» (pd_salud_d). */
  const fallasDeSalud = () => resumenDeFallas(leerFallas(join(raiz, '.estudio')), leerReparacion(join(raiz, '.estudio'))?.pedida);
  /** Corre el chequeo (uno a la vez) y guarda lo que encontró para GET /salud. */
  const correrSalud = (): Promise<EstadoSalud> =>
    (chequeando ??= (async () => {
      try {
        salud = await chequearSalud(await sondasDeSalud(), join(raiz, '.estudio'), (a) =>
          anotarEnSuIdioma(raiz, () => ({ quien: EL_STUDIO, que: arregloEnLaBitacora(a), desde: tb('bitacora.desde.chequeoSalud') })));
        return salud;
      } finally {
        chequeando = null;
      }
    })());

  return {
    name: 'servidor-director',
    configResolved(config) {
      raiz = config.root;
    },
    async configureServer(server) {
      // Un solo servidor del Studio en este computador (unico.ts): si ya hay otro vivo, este no arranca
      const otro = await otroServidor(raiz);
      if (otro) throw new Error(yaEncendido(otro));
      // Y uno solo por proceso: si Vite se reinicia y el servidor anterior siguiera escuchando, se cierra antes de que
      // este escuche (el 20 de octubre quedó vivo en el 5180 y el nuevo se subió al 5181, con su propio lanzador)
      const g = globalThis as { __estudioServidor?: typeof server };
      const previo = g.__estudioServidor;
      if (previo && previo !== server) {
        try {
          (previo.httpServer as { closeAllConnections?: () => void } | null)?.closeAllConnections?.();
          previo.httpServer?.close(() => {});
        } catch {
          /* ya estaba cerrado */
        }
      }
      if (!tomarCandado(raiz, server.config.server.port ?? 5180)) {
        const c = leerCandado(raiz);
        throw new Error(c ? yaEncendido(c) : 'Otro servidor de STL Studio está arrancando en este momento: no se enciende otro.');
      }
      g.__estudioServidor = server;
      server.httpServer?.once('listening', () => {
        const a = server.httpServer?.address();
        if (a && typeof a === 'object') tomarCandado(raiz, a.port);
      });
      server.httpServer?.on('close', () => { if (g.__estudioServidor === server) soltarCandado(raiz); });
      process.once('exit', () => soltarCandado(raiz));
      // Al apagarse el Studio, ninguna orden de un paso queda corriendo sola (pd_sin_terminal)
      process.once('exit', () => corridasOcultas.detenerTodas());
      // La orden que falla deja su nota de error directo en el Buzón de su proyecto, como una falla sobre su paso, con la
      // salida entera adjunta, plegada (nmwpz12rqtit, nmwpz210xtit, nmwpxp0z0tit): nadie tiene que copiarla
      corridasOcultas.alTerminar = (c) => {
        if (c.fase === 'fallo') void notaDeErrorDeOrden(c).catch(() => undefined);
      };
      // Cada 15 segundos mira si hay una revisión pedida que nadie tomó: es leer un archivo, no gasta nada
      revisor = new Revisor(raiz);
      const este = revisor;
      // Mientras se mide el núcleo del director no se lanza ningún director: gastan del mismo límite de la cuenta
      revisor.enPausa = midiendo;
      // Ni con una nota de voz de su proyecto transcribiéndose: la revisión la espera y empieza en cuanto quede escrita
      // (nmwdwg5yvtit)
      revisor.notasEnCurso = (p) => notasEnCurso.en(p);
      // Al terminar cada revisión, su memoria se respalda sola en GitHub, si se puede (pd_sin_modo_equipo; nmwdur1ejtit)
      revisor.alTerminarRevision = (p) => void respaldoDe(p).respaldar().then((r) => anotarEnSuIdioma(raiz, () => ({ quien: EL_STUDIO, que: r.fase === 'al_dia' ? tb('bitacora.respaldaAlTerminar', { destino: r.destino ?? '', rama: r.rama ?? '' }) : r.fase === 'fallo' ? tb('bitacora.falloRespaldoAlTerminar', { causa: r.causa ?? '', detalle: r.detalle ? ` (${r.detalle})` : '' }) : tb('bitacora.noRespaldaMemoria', { motivo: r.motivo ?? '', detalle: '' }), desde: tb('bitacora.desde.respaldoAlTerminar'), proyecto: p }))).catch(() => undefined);
      notasEnCurso.alQuedarLibre = () => void revisor?.mirar(true).catch(() => {});
      // Una reparación que pasó sus pruebas reinicia el Studio sola (nmw9rd4gytit): la página se recarga al reconectar
      revisor.alReparar = () => void server.restart().catch(() => {});
      const reloj = setInterval(() => void revisor?.mirar().catch(() => {}), 15_000);
      reloj.unref?.();
      // Una vez al día, si la casilla sigue encendida, le pregunta a GitHub por la versión; sin internet, calla (avisoVersion.ts)
      const mirarVersion = () => void refrescarAvisoVersion(raiz).catch(() => {});
      mirarVersion();
      setInterval(mirarVersion, 3_600_000).unref?.();
      // El vigía de la cuenta de gh, cada minuto (nmwo0dx41tit)
      const relojGh = setInterval(() => void mirarCuentaGh().catch(() => {}), 60_000);
      relojGh.unref?.();
      server.httpServer?.on('close', () => clearInterval(relojGh));
      // El chequeo de salud (salud.ts; pd_salud_b): al encender, en cuanto el servidor escucha, y cada 5 minutos. Sin modelo
      const mirarSalud = () => void correrSalud().catch(() => {});
      setTimeout(mirarSalud, 5_000).unref?.();
      const relojSalud = setInterval(mirarSalud, MINUTOS_SALUD * 60_000);
      relojSalud.unref?.();
      server.httpServer?.on('close', () => clearInterval(relojSalud));
      // El modelo de voz queda cargado mientras el Studio está encendido: las notas de voz no lo cargan cada vez
      // (nmwgu0fmbtit). Se apaga al cerrarse el servidor; si el nuevo ya lo inició, el reinicio lo vuelve a levantar
      iniciarTranscripcionResidente(raiz);
      server.httpServer?.on('close', () => { if (g.__estudioServidor === server) detenerTranscripcionResidente(); });
      // Al reiniciarse, este lanzador queda retirado: vigila al director que lanzó, y lo siguiente lo lanza el nuevo
      server.httpServer?.on('close', () => {
        clearInterval(reloj);
        este.retirado = true;
      });
      // Mientras el director trabaja, la página no se recarga a pedazos: una sola vez, al final (recarga.ts)
      // Con otro proyecto activo, lo que el servidor le manda a la página (recarga o reinicio) deja rastro: una línea en la
      // bitácora y una nota de falla en el Buzón del activo. Sin esperar y sin que una falla toque la recarga
      const rastroDeRecarga = ({ tipo, causa, archivo }: Rastro) => {
        void (async () => {
          const activo = (await leerLocal(raiz)).activo;
          await anotarEnSuIdioma(raiz, () => ({ quien: EL_STUDIO, que: tb('bitacora.recargaConOtroActivo', { que: tipo === 'reinicio' ? tb('bitacora.reinicioPagina') : tb('bitacora.recargoPagina'), causa }), desde: tb('bitacora.desde.servidorCambioArchivos'), ...(activo ? { proyecto: activo } : {}) }));
          if (!activo) return;
          ponerIdioma((await leerLocal(raiz)).idioma ?? 'es');
          const yo = await leerIdentidad(raiz, activo);
          if (!yo.rol) return;
          // La causa, en el idioma de la persona (la de la bitácora va en castellano, como sus demás líneas)
          const suCausa = tipo === 'reinicio' ? t('servidor.recarga.causaReinicio') : archivo ? t('servidor.recarga.causaArchivo', { archivo }) : t('servidor.recarga.causaRecarga');
          const nota = { tipo: 'comentar', sobre: { tipo: 'general' }, texto: t('servidor.recarga.nota', { causa: suCausa }), tipoNota: 'falla' };
          const { queBitacora, archivos } = await enFila(() => decidir(activo, nota, yo as Identidad & { rol: Persona }));
          programarCommit(activo, yo.nombre, () => `${queBitacora()}, after a reload of the Studio`, archivos);
        })().catch(() => {});
      };
      contencion = contenerRecargas(server, raiz, () => revisor?.estado().revisandoEn ?? [], undefined, rastroDeRecarga);
      // Lo que hizo cada página vieja al ceder el lugar a la nueva (app.ts › estudio:ceder): queda en la bitácora
      server.ws.on(EVENTO_CEDIO, (x?: { como?: string; historial?: number }) => {
        void anotarEnSuIdioma(raiz, () => {
          const como = x?.como === 'cubierta' ? tb('bitacora.cedioCubierta', { historial: x?.historial ?? '?' })
            : x?.como === 'espera' ? tb('bitacora.cedioEspera')
              : tb('bitacora.cedioCierra');
          return { quien: EL_STUDIO, que: tb('bitacora.pestanaCede', { como }), desde: tb('bitacora.desde.abrirOtraVez') };
        });
      });
      // Las voces de Kokoro, locales y las únicas: voz.ts corre tools/director/voz.py
      server.middlewares.use('/__estudio/voz', atenderVoz(raiz));
      server.middlewares.use('/__estudio/director', async (req, res) => {
        const url = new URL(req.url ?? '/', 'http://x');
        const ruta = url.pathname.replace(/\/+$/, '') || '/';
        // Lo que el servidor explica sale en el idioma de la interfaz (pd_idiomas): el guardado en este computador
        ponerIdioma((await leerLocal(raiz)).idioma ?? 'es');
        // Solo el Studio decide: una petición que cambia algo y viene de otra página (otro sitio abierto en el navegador o
        // una pestaña a medida, que corre aislada) se rechaza
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          const origen = req.headers.origin;
          const sitio = req.headers['sec-fetch-site'];
          const propio = (o: string) => o === `http://${req.headers.host}` || o === `https://${req.headers.host}`;
          if ((origen && !propio(origen)) || (sitio && sitio !== 'same-origin' && sitio !== 'none')) return responder(res, 403, { error: t('servidor.api.noVieneDelStudio') });
        }
        try {
          // Abrir el Studio cuando ya estaba encendido (encender.ts): no se enciende otro servidor. Con `nueva`, el
          // lanzador abre una pestaña al frente, y las que ya estaban le ceden el lugar cuando llegue (recarga.ts ›
          // cederALaNueva): una abierta que no ves (detrás de otra ventana, o en otro navegador) ya no deja el doble clic
          // sin pestaña, como el 3 de noviembre. Sin ella (--sin-abrir), la que esté abierta se recarga, con su cuenta
          if (ruta === '/recargar' && req.method === 'POST') {
            const nueva = url.searchParams.has('nueva');
            const abiertas = nueva ? cederALaNueva(server.ws) : server.ws.clients.size;
            if (!nueva) server.ws.send({ type: 'custom', event: EVENTO_RECARGA, data: { abrir: true } });
            const cuantas = tb('bitacora.paginaAbierta', { n: abiertas });
            await anotar(raiz, { quien: EL_STUDIO, que: tb('bitacora.reabrio', { que: nueva ? (abiertas ? tb('bitacora.abreNuevaYCede', { n: abiertas, cuantas }) : tb('bitacora.abreNueva')) : abiertas ? tb('bitacora.recargaPaginas', { cuantas }) : tb('bitacora.ningunaAbierta') }), desde: tb('bitacora.desde.abrirOtraVez') });
            return responder(res, 200, { abiertas });
          }
          // La última caída del servidor, si aún no se mostró (ultimaCaida.ts; nmw6z1eartit): «Dónde quedamos» la cuenta una
          // vez y la marca vista
          // Con la carpeta del Studio, que la página guarda para nombrarla en el aviso de servidor caído (nmw71bfm4tit)
          if (ruta === '/caida' && req.method === 'GET') return responder(res, 200, { caida: caidaPendiente(join(raiz, '.estudio')), carpeta: resolve(raiz) });
          if (ruta === '/caida/vista' && req.method === 'POST') {
            marcarCaidaVista(join(raiz, '.estudio'));
            await anotar(raiz, { quien: EL_STUDIO, que: tb('bitacora.mostroCaida'), desde: tb('bitacora.desde.dondeQuedamos') });
            return responder(res, 200, { ok: true });
          }
          // La falla con la que el Studio no cargó, desde la pantalla de emergencia (emergencia.ts; pd_salud_a): queda en
          // .estudio/fallas.json, junto a la última caída, 90 días (nmw9ltx31tit)
          if (ruta === '/falla' && req.method === 'POST') {
            const falla = fallaValida(await leerCuerpo(req));
            if (!falla) return responder(res, 400, { error: 'falla sin mensaje' });
            anotarFalla(join(raiz, '.estudio'), falla);
            await anotar(raiz, { quien: EL_STUDIO, que: tb('bitacora.noCargo', { prueba: falla.prueba ? tb('bitacora.unaPrueba') : '', mensaje: falla.mensaje.slice(0, 200) }), desde: tb('bitacora.desde.pantallaEmergencia') });
            return responder(res, 200, { ok: true });
          }
          // «Volver a la versión que funcionaba», desde la pantalla de emergencia (volver.ts; pd_salud_a, nmw9gq7sftit): con
          // GET, qué versión es, para mostrarla antes (nmw9oexiptit); con POST, vuelve, con lo que no tenía commit guardado
          // antes en una rama de respaldo (nmw9oenmatit)
          // El chequeo de salud (salud.ts; pd_salud_b): lo último que encontró, con los arreglos de los últimos 7 días; si
          // aún no corrió, corre ahora. «Salud del Studio» y el aviso de arriba lo leen al cargar y cada 5 minutos
          if (ruta === '/salud' && req.method === 'GET') return responder(res, 200, { ...(salud ? { ...salud, arreglos: leerArreglos(join(raiz, '.estudio')) } : await correrSalud()), reparacion: await estadoReparacion(), ...fallasDeSalud() });
          // «Diagnosticar y reparar» (reparar.ts; pd_salud_c): con GET, la línea de lo que hace (y el uso del límite de cinco
          // horas, para la línea de aviso); con POST, un clic, un intento, a la bitácora con su botón
          if (ruta === '/reparar' && req.method === 'GET') return responder(res, 200, await estadoReparacion());
          if (ruta === '/reparar' && req.method === 'POST') {
            const cuerpo = (await leerCuerpo(req)) as { falla?: { mensaje?: unknown; traza?: unknown } } | null;
            const quien = await quienAqui();
            const p = pedirReparacion(join(raiz, '.estudio'), quien, cuerpo?.falla ?? null);
            if (!p.ya) await anotar(raiz, { quien, que: tb('reparar.bitacora.pide'), desde: origenDeRevision('reparar') });
            void revisor?.mirar(true).catch(() => {});
            return responder(res, 200, { ya: p.ya, ...(await estadoReparacion()) });
          }
          if (ruta === '/volver' && req.method === 'GET') return responder(res, 200, await infoDeVuelta(join(raiz, '.estudio'), gitDe(raiz)));
          if (ruta === '/volver' && req.method === 'POST') {
            const cuerpo = (await leerCuerpo(req)) as { commit?: unknown } | null;
            const r = await volverALaVersion(join(raiz, '.estudio'), gitDe(raiz), typeof cuerpo?.commit === 'string' ? cuerpo.commit : undefined);
            await anotar(raiz, { quien: EL_STUDIO, que: r.estado === 'hecha' ? tb('bitacora.volvio', { commit: r.commit.slice(0, 7), respaldo: r.respaldo ? tb('bitacora.respaldoSinCommit', { rama: r.respaldo }) : '' }) : tb('bitacora.noPudoVolver', { estado: r.estado, detalle: r.detalle ? ` (${r.detalle})` : '' }), desde: tb('bitacora.desde.pantallaEmergencia') });
            return responder(res, 200, r);
          }
          if (ruta === '/' && req.method === 'GET') {
            // Lo que tarda cada parte de la carga: si pasa de 3 s, queda en el registro del servidor (.estudio/servidor.log),
            // para ver qué crece antes de que la página parezca colgada (así se encontraron las transcripciones, el 21 de octubre)
            const t0 = Date.now();
            const tiempos: string[] = [];
            const marcar = (que: string, desde: number) => tiempos.push(`${que} ${((Date.now() - desde) / 1000).toFixed(1)} s`);
            const fresco = url.searchParams.has('fresco');
            if (fresco) caches.clear();
            // `proyecto`: los datos de otro proyecto, sin cambiar el activo, para preparar la voz de su «¿Dónde quedamos?» en
            // cuanto cierra su revisión (nota nmwdx5z4gtit)
            const otro = url.searchParams.get('proyecto');
            const id = otro && (await listarIds()).includes(otro) ? otro : await activo();
            const identidad = await leerIdentidad(raiz, id);
            const proyectos = await resumenProyectos();
            // El último respaldo de la memoria en GitHub, para el pie de la barra (sin preguntarle nada a GitHub)
            const respaldo = id ? await respaldoDe(id).estado().catch(() => null) : null;
            await revisor?.preparar();
            marcar('Respaldo, identidad y proyectos', t0);
            if (!id) return responder(res, 200, { sinProyectos: true, proyectos, identidad, respaldo, hoy: hoy() });
            const tPlan = Date.now();
            // Lo que se muestra, aunque el plan de la carpeta no se entienda: el de su último commit, con su aviso (leerPlanParaVer)
            const [{ plan, aviso: avisoDelPlan }, proyecto, r] = await Promise.all([leerPlanParaVer(raiz, id), leerProyecto(id), repositorio(id, fresco)]);
            const { estado } = await leerEstado(id, identidad.rol, proyecto);
            marcar('plan, proyecto y equipo', tPlan);
            // La transcripción de cada audio (la deja tools/director/transcribir.py junto al audio, como .txt)
            const transcripciones: Record<string, string> = {};
            const audios = [...estado.notas.map((n) => n.audio), ...Object.values(estado.entregas).map((e) => e.audio)].filter(Boolean) as string[];
            // Todas de una vez: una por una eran dos o tres procesos de git por audio (más de 20 s con cientos de notas)
            const tTextos = Date.now();
            const txt = (a: string) => a.replace(/\.[a-z0-9]+$/, '.txt');
            const textos = await leerFrescosTexto(raiz, audios.map(txt));
            for (const a of audios) {
              const t = textos.get(txt(a));
              if (t != null) transcripciones[a] = t.trim(); // vacía: el audio no tenía voz
            }
            marcar(`${audios.length} transcripciones`, tTextos);
            const porOir = new Set(audiosPorTranscribir(plan, estado));
            transcribirLuego(id, audios.filter((a) => !transcripciones[a] && porOir.has(a)), `Notas para el director del proyecto ${proyecto.nombre || id}.`);
            const personas = proyecto.equipo.length ? proyecto.equipo.map((i) => i.id) : [TITULAR];
            const consumo = consumoDeRevisiones(raiz);
            const total = Date.now() - t0;
            if (total > 3000) console.warn(`[estudio] La carga de «${id}» tardó ${(total / 1000).toFixed(1)} s: ${tiempos.join('; ')}.`);
            // Solo viaja lo que la página no tiene ya, por su huella (partesDeConsulta.ts, pd_aligerar_consulta)
            return responder(res, 200, partirConsulta({
              activo: id,
              proyectos,
              // Sin hashes de commit: son del sistema, no de las personas (nota de voz del titular nmvov99tttit)
              plan: planSinCommits(plan),
              estado,
              proyecto,
              repositorio: ((l) => ({ ruta: r.ruta, info: r.info, error: r.error, cuentaGit: l.cuentasGit?.[id] ?? null, respaldoDelStudio: l.respaldoDelStudio ?? null, respaldoPublico: (l.respaldoPublico ?? []).includes(id) }))(await leerLocal(raiz)),
              arranque: etapaArranque(plan, proyecto, !!r.info),
              senales: await senales(id, plan, proyecto),
              identidad,
              transcripciones,
              transcribiendo: audios.filter((a) => transcribiendo.has(a)),
              // Los que fallaron y los que no se van a intentar (de lo ya respondido, o sin el audio aquí): no son «Transcribiendo»
              sinTranscribir: audiosQueNoSeTranscriben(audios, { transcripciones, porOir, transcribiendo, fallidos: sinTranscribir, existe: (a) => existsSync(enDisco(raiz, a)) }),
              // Los que fallaron y esperan su próximo intento: la página los muestra «en cola», con la hora
              enCola: Object.fromEntries(audios.flatMap((a) => { const f = sinTranscribir.get(a); return f && Number.isFinite(f.siguiente) ? [[a, new Date(f.siguiente).toISOString()]] : []; })),
              respaldo,
              // La revisión pedida desde el Studio, si es de este proyecto (la toma la sesión del director en su ciclo)
              revision: revisionDe(await leerLocal(raiz), id) ?? null,
              // Las de los otros proyectos, a la vez (pd_revisiones_simultaneas): la línea de la cabecera, el punto en la lista
              // de proyectos y el aviso «Ir a <proyecto>» al cerrar
              otrasRevisiones: revisionesDeOtros(await leerLocal(raiz), id, Object.fromEntries(proyectos.map((p) => [p.id, p.nombre]))),
              // La historia de la línea viva, en la memoria del proyecto (pd_linea_historia): cada revisión con las ramas que juntó
              lineaHistoria: leerHistoriaLinea(await leerFrescoTexto(raiz, `${rutasDe(id).base}/${ARCHIVO_LINEA}`)),
              // El paso que alguien pidió aclarar («No lo entiendo»), si es de este proyecto
              aclaracion: ((a) => (a?.proyecto === id ? a : null))((await leerLocal(raiz)).aclaracion),
              // Las notas urgentes que el director atiende aparte, al instante, si son de este proyecto
              urgencia: ((u) => (u?.proyecto === id ? u : null))((await leerLocal(raiz)).urgencia),
              // La última vuelta de la sesión del director (/vigila): si es vieja, nadie está mirando las revisiones pedidas
              vigilia: (await leerLocal(raiz)).vigilia ?? null,
              // Si el Studio lanza solo al director, o por qué no puede
              revisor: revisor?.estado(id) ?? null,
              // Si el servidor retiene una recarga o un reinicio (el director cambió archivos del Studio): solo entonces la
              // página se recarga al cerrar la revisión; si no, se pone al día en su sitio (recarga.ts; nota nmwbk689ttit)
              recargaRetenida: contencion?.retenida() ?? false,
              // El modelo y el esfuerzo de Claude Code (los de /model y /effort, con los que el Studio lanza al
              // director), y lo que gastó cada lanzamiento
              ...conMaximo(await leerAjustesClaude(), (await leerLocal(raiz)).esfuerzoMaximo === true),
              // Si el titular le dio al director el permiso de seguir a ultracode (con sus flujos de varios agentes)
              ultracodeDirector: (await leerLocal(raiz)).permisos?.ultracode === true,
              // «Todo con el modelo que elegí»: sus ayudantes, con su mismo modelo (pr_modelos_por_tarea, punto 4)
              todoConElModelo: (await leerLocal(raiz)).todoConElModelo === true,
              ayudasVistas: (await leerLocal(raiz)).ayudasVistas ?? [],
              // La línea de versión nueva, si hay, y si la casilla la apagó (avisoVersion.ts)
              avisoVersion: lineaDeVersion((await leerLocal(raiz)).avisoVersion, versionInstalada(raiz)),
              avisoVersionApagado: (await leerLocal(raiz)).avisoVersion?.apagado === true,
              // Si el director lanzado carga tus ajustes de usuario de Claude Code, y los nombres de sus claves, sin valores
              ajustesPropios: await estadoAjustesPropios(raiz),
              // Cómo pide permisos el director: solo lo autorizado (sin la clave) o preguntándote en el Studio
              modoPermisos: (await leerLocal(raiz)).modoPermisos ?? 'autorizado',
              // Tu plan de Claude, si lo dijiste: lo usa la recomendación del modelo
              planDeClaude: (await leerLocal(raiz)).planDeClaude ?? null,
              // El idioma de la interfaz en este computador; null: la página toma el del navegador y lo guarda (pd_idiomas)
              idioma: (await leerLocal(raiz)).idioma ?? null,
              // Si se puede elegir «Automático, vigilado» y, si no, lo que le falta: lo último que se supo, sin esperar a la
              // ayuda de Claude Code (mientras no se sabe, se ofrece, y guardarlo lo comprueba)
              automatico: automaticoSabido() === false ? { admite: false, porque: porQueSinAutomatico() } : { admite: true },
              // Lo que gastó cada lanzamiento que terminó
              consumo,
              // La medida del criterio del director en este proyecto, por revisión (pr_criterio_director, punto 3): lo
              // que salió de lo que dejó cada una, con si cerró y lo que gastó, de las líneas de este computador
              medidaDelDirector: medidaPorRevision(plan, estado, leerLineasDeRevision(raiz).filter((l) => l.proyecto === id && l.tipo === 'revision')),
              // Lo que este computador hace con el modelo de voz, por su memoria total («Modelo y consumo»: nmwjoff8qtit)
              modeloVoz: modeloDeVoz(),
              // La medición del núcleo con casos fijos (pr_nucleo_medido): la de ahora o la última, y lo que costaría otra,
              // por lo que costaron las revisiones si aún no hay una terminada
              // Solo en la copia de quien desarrolla el Studio (pd_medicion_solo_desarrollo): sin la marca, la página no recibe nada
              medicion: (await leerLocal(raiz)).copiaDeDesarrollo ? estadoDeMedicion(raiz, consumo.filter((c) => c.tipo === 'revision').map(tokensDe), consumo.filter((c) => c.tipo !== 'revision').map(tokensDe)) : null,
              // Lo que va haciendo el director que lanzó el Studio, mientras revisa: la conversación entre tu computador y el
              // modelo, con quién espera a quién y cuánto tardó cada uno (notas de voz del titular nmvx09it7tit y nmvx0q10ctit)
              conversacion: await (async () => {
                const r = revisionDe(await leerLocal(raiz), id);
                return r?.proyecto === id && r.lanzada && !r.hecha ? conversacionDeProyecto(raiz, id) : null;
              })(),
              // Y lo que va haciendo con lo urgente, que corre aparte: la cabecera lo muestra igual que una revisión, con su
              // aviso de que atiende una urgencia (nota de voz del titular nmvsytu00tit, 28 de octubre de 2026)
              conversacionUrgencia: await (async () => {
                const u = (await leerLocal(raiz)).urgencia;
                return u?.proyecto === id && u.lanzada && !u.hecha && !u.error ? conversacionDeProyecto(raiz, id, 'urgencia') : null;
              })(),
              // Y su plan, si la revisión va en dos tiempos: mientras planea y, después, su lista de encargos (pd_dos_tiempos)
              planVivo: await (async () => {
                const r = revisionDe(await leerLocal(raiz), id);
                return r?.proyecto === id && r.lanzada && !r.hecha ? planDeProyecto(raiz, id) : null;
              })(),
              // Y los tokens que lleva, para verlos subir junto a «El director está revisando»
              tokensVivos: await (async () => {
                const r = revisionDe(await leerLocal(raiz), id);
                return r?.proyecto === id && r.lanzada && !r.hecha ? tokensDeProyecto(raiz, id) : null;
              })(),
              // Y lo que se le lleva negado, en vivo, sin esperar a que termine (propuesta «Los permisos, al momento»)
              negadosVivos: await (async () => {
                const r = revisionDe(await leerLocal(raiz), id);
                return r?.proyecto === id && r.lanzada && !r.hecha ? negadosDeProyecto(raiz, id) : null;
              })(),
              // La última vez que creció su registro: sin nada nuevo en un buen rato, el Studio dice que está parada
              actividad: await (async () => {
                const r = revisionDe(await leerLocal(raiz), id);
                return r?.proyecto === id && r.lanzada && !r.hecha && !r.error ? actividadDeProyecto(raiz, id) : null;
              })(),
              // Y lo que tiene corriendo (una orden larga, un ayudante, un flujo): mientras corre, su registro no crece y
              // no está parado (pr_procesos_vista, punto 2)
              enCurso: await (async () => {
                const r = revisionDe(await leerLocal(raiz), id);
                return r?.proyecto === id && r.lanzada && !r.hecha && !r.error ? enCursoDeProyecto(raiz, id) : null;
              })(),
              hoy: hoy(),
              errores: [
                ...(avisoDelPlan ? [avisoDelPlan] : []),
                // El plan cambió después del último cierre, sin un director trabajando en él (pr_cierre_vigilado, punto 4)
                ...(await (async () => {
                  const l = await leerLocal(raiz);
                  const corre = (x: { proyecto: string; lanzada?: string; enCurso?: string; hecha?: string; error?: string } | undefined) => !!x && x.proyecto === id && !x.hecha && !x.error && !!(x.lanzada || x.enCurso);
                  const trabaja = !!revisor?.estado().revisandoEn.includes(id) || corre(revisionDe(l, id)) || corre(l.aclaracion) || corre(l.urgencia);
                  const texto = await readFile(enDisco(raiz, rutasDe(id).plan), 'utf-8').catch(() => null);
                  const aviso = planCambiadoTrasCierre(l.huellas?.[id], texto, trabaja);
                  return aviso ? [aviso] : [];
                })()),
                ...validarPlan(plan, personas),
                ...validarEstado(estado, plan),
                ...validarProyecto(proyecto),
              ],
            }, leerTengo(url.searchParams.get('tengo')), (texto) => createHash('sha1').update(texto).digest('hex').slice(0, 12)));
          }
          // La comprobación de lo contado al entregar (pd_campo_libre): le pregunta al modelo elegido en el Studio si dice qué es
          // y a dónde se quiere llevar. Sin Claude Code, sin sesión, con un error o una respuesta ilegible, `comprobacion` va
          // null y la página entrega sin comprobar, callada (nmwlfndp5tit). No toca nada del proyecto
          if (ruta === '/comprobar-cuenta' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const texto = typeof cuerpo.texto === 'string' ? cuerpo.texto.trim().slice(0, MAX_TEXTO) : '';
            // En la misma llamada, la traducción al idioma de la interfaz si se contó en otro (nmwjl8tuutit)
            const comprobacion = texto ? await comprobarCuenta(texto, (await leerLocal(raiz)).idioma ?? 'es') : null;
            // Solo qué encontró, nunca lo contado: la bitácora no guarda las palabras de la persona
            await anotar(raiz, { quien: EL_STUDIO, que: !comprobacion ? tb('bitacora.noComprobo') : tb('bitacora.comprobo', { que: comprobacion.falta.includes('que') ? tb('bitacora.faltaQue') : tb('bitacora.diceQue'), meta: comprobacion.falta.includes('meta') ? tb('bitacora.faltaMeta') : tb('bitacora.diceMeta') }), desde: tb('bitacora.desde.entregarDiagnostico') });
            return responder(res, 200, { comprobacion });
          }
          if (ruta === '/proyecto-nuevo' && req.method === 'POST') {
            // Un proyecto para el Studio. Existente: su repositorio (el director lo diagnostica y propone los objetivos).
            // Nuevo: su explicación, su objetivo y cuándo se considera completo (el director lo plantea). Quien lo crea
            // queda como titular
            const cuerpo = await leerCuerpo(req);
            const yo = await leerIdentidad(raiz, null);
            if (!yo.nombre || !yo.correo) return responder(res, 403, { error: t('servidor.api.identidadGit') });
            const tipo = cuerpo.tipo === 'nuevo' ? 'nuevo' : 'existente';
            const rutaRepo = textoDe(cuerpo.ruta, 500, t('servidor.api.etRutaCarpeta'), t('servidor.api.haceRutaCarpeta'));
            if (!rutaRepo) return responder(res, 400, { error: tipo === 'nuevo' ? t('servidor.api.eligeCarpetaNuevo') : t('servidor.api.eligeCarpetaRepo') });
            // Sin nombre, el de su carpeta, legible y sin modelo (pd_campo_libre, nmwfltw1dtit): el formulario ya no lo pide
            const nombre = textoDe(cuerpo.nombre, 120, t('servidor.api.etNombreProyecto')) || nombreLegible(rutaRepo);
            if (!nombre) return responder(res, 400, { error: t('servidor.api.ponleNombreProyecto') });
            // Lo que cuenta del proyecto, entero o rechazado antes de tocar la carpeta
            const contexto = textoDe(cuerpo.contexto, MAX_TEXTO, t('servidor.api.etContextoProyecto'));
            const metaInicial = textoDe(cuerpo.metaInicial, MAX_TEXTO, t('servidor.api.etLoQueQuieres'));
            const terminado = textoDe(cuerpo.terminado, MAX_TEXTO, t('servidor.api.etCuandoCompleto'));
            const remoto = textoDe(cuerpo.url, 300, t('servidor.api.etDireccionWeb')).replace(/\/\/[^/@]+@/, '//');
            // Uno nuevo necesita lo que contó en «Cuéntame tu proyecto», que va entero a «Qué es» (pd_campo_libre); uno que ya
            // existe puede llegar sin nada, y su diagnóstico lee la carpeta (nmwfltg6rtit)
            if (tipo === 'nuevo' && !contexto)
              return responder(res, 400, { error: t('servidor.api.proyectoNuevoNecesita') });
            // Un proyecto nuevo puede empezar en una carpeta sin git: se le inicia (es la carpeta que eligió su titular)
            if (tipo === 'nuevo' && existsSync(rutaRepo) && !(await gitEn(rutaRepo, ['rev-parse', '--show-toplevel'])).ok) await gitEn(rutaRepo, ['init', '-q']);
            const c = await comprobarRepositorio(rutaRepo);
            if (!c.ok) return responder(res, 400, { error: c.error });
            // Una carpeta dentro de un repositorio no se registra como el repositorio entero sin que la persona lo elija
            // (nmwdpftqatit): la página lo dice y ofrece entregar la raíz, que vuelve aquí con ella, u otra carpeta
            if (esSubcarpeta(rutaRepo, c.info.ruta)) return responder(res, 409, { error: t('servidor.api.esSubcarpeta', { repo: c.info.ruta }), subcarpeta: c.info.ruta });
            // El Studio también puede ser un proyecto (se dirige a sí mismo); lo que no puede es entrar dos veces
            if (Object.values((await leerLocal(raiz)).repositorios).some((x) => misma(x, c.info.ruta))) return responder(res, 400, { error: t('servidor.api.repoYaEnStudio') });
            // «Entregar y pedir su diagnóstico» (pd_entregar_y_diagnosticar): el proyecto nace sin la misión que solo pedía
            // pedirlo, y la página pide la revisión enseguida por «/revision», con ese botón como origen. Vale para los dos
            // tipos y para uno solo elegido del escaneo, que trae lo que se encontró de él (pd_entrega_al_instante)
            const diagnosticoPedido = cuerpo.diagnosticar === true;
            const historialIA = tipo === 'existente' ? historialDeEscaneo(cuerpo.historialIA, t('servidor.api.haceSinEscaneo')) : [];
            // La parte de la meta que encontró la comprobación de lo contado (pd_campo_libre): va a «Tu meta», marcada «Detectado»
            const metaDetectada = textoDe(cuerpo.metaDetectada, MAX_TEXTO, t('servidor.api.etLoQueQuieres'));
            // Lo contado en otro idioma (nmwjl8tuutit): con su traducción en `contexto`, las palabras de la persona quedan en la
            // memoria (nmwjm4r7atit); sin ella, la marca para que «Qué es» diga que se traducirá en la primera revisión (nmwjogccbtit)
            const contextoOriginal = contexto ? textoDe(cuerpo.contextoOriginal, MAX_TEXTO, t('servidor.api.etContextoProyecto')) : '';
            const contextoPorTraducir = !!contexto && !contextoOriginal && cuerpo.porTraducir === true;
            const id = await entregar({ nombre, ruta: c.info.ruta, remoto: remoto || c.info.remoto || '', yo, tipo, contexto, metaInicial, terminado, diagnosticoPedido, ...(historialIA.length ? { historialIA } : {}), ...(metaDetectada ? { metaDetectada } : {}), ...(contextoOriginal ? { contextoOriginal } : {}), ...(contextoPorTraducir ? { contextoPorTraducir } : {}) });
            await guardarActivo(raiz, id);
            olvidarIdentidad();
            // Entregar no pide la revisión: la pide la persona, cuando quiera (regla dura del 23 de octubre de 2026)
            await anotar(raiz, { quien: yo.nombre, que: tb('bitacora.entrega', { nombre }), desde: diagnosticoPedido ? tb('bitacora.desde.entregarDiagnosticoEnProyectos') : tb('bitacora.desde.entregarEnProyectos'), proyecto: id });
            return responder(res, 200, { id });
          }
          if (ruta === '/identidad' && req.method === 'POST') {
            // La ventana que pide el nombre y el correo una vez, al abrir el Studio sin identidad de git en su carpeta
            // (nmwds81gbtit, nmwfln1gatit): se guardan con git config en esa carpeta, y nunca pisan una que ya está
            const cuerpo = await leerCuerpo(req);
            const v = identidadValida(cuerpo.nombre, cuerpo.correo);
            if ('error' in v) return responder(res, 400, { error: t(v.error === 'nombre' ? 'identidad.nombreMal' : 'identidad.correoMal'), campo: v.error });
            const r = await guardarIdentidad(raiz, v.nombre, v.correo);
            if (r === 'ok') await anotar(raiz, { quien: v.nombre, que: tb('bitacora.guardaIdentidad'), desde: tb('bitacora.desde.ventanaIdentidad') });
            return responder(res, 200, { ok: true, ya: r === 'ya' });
          }
          if (ruta === '/salud' && req.method === 'GET') return responder(res, 200, await saludDelEquipo(raiz));
          // La bitácora del Studio en este computador: qué se hizo, quién, desde dónde y cuándo (la más nueva primero). Con
          // cada clic anotado crece rápido: se devuelven las últimas MAX_BITACORA, que la página filtra sin volver a pedirlas
          // Cada línea guarda su tipo fijo (clave y datos): aquí se dice, al leerla, en el idioma de este computador de ahora,
          // sea cual fuera el del servidor al escribirla. Las de la historia, que son texto suelto, quedan como están
          if (ruta === '/bitacora' && req.method === 'GET') {
            const eventos = await leerBitacora(raiz, MAX_BITACORA);
            const antes = idiomaActual();
            await idiomaDeEsteComputador(raiz);
            try {
              return responder(res, 200, { eventos: eventos.map(conFrasesEnSuIdioma), maximo: MAX_BITACORA });
            } finally {
              ponerIdioma(antes);
            }
          }
          // Lo que oyó la grabadora en cada fragmento: solo cifras, para leer los números de una prueba con el micrófono real
          if (ruta === '/niveles-grabadora' && req.method === 'POST') {
            const que = lineaDeNiveles(await leerCuerpo(req));
            if (!que) return responder(res, 400, { error: t('servidor.api.nivelesFragmento') });
            await anotar(raiz, { quien: EL_STUDIO, que, desde: tb('bitacora.desde.grabadora') });
            return responder(res, 200, { ok: true });
          }
          // La conversación de un lanzamiento pasado, de su registro: el historial de esa revisión (turnos.ts)
          if (ruta === '/conversacion' && req.method === 'GET') {
            const conversacion = conversacionDeRegistro(raiz, url.searchParams.get('registro'));
            return conversacion ? responder(res, 200, conversacion) : responder(res, 404, { error: t('servidor.api.registroNoEsta') });
          }
          // El historial de las revisiones de un proyecto, que sigue aunque sus registros se borren, para la línea en grande (pd_linea_zoom)
          if (ruta === '/historial-revisiones' && req.method === 'GET') {
            const proyecto = url.searchParams.get('proyecto') ?? (await leerLocal(raiz)).activo;
            return proyecto ? responder(res, 200, { revisiones: historialDeProyecto(raiz, proyecto) }) : responder(res, 200, { revisiones: [] });
          }
          // Escanear el equipo: qué se puede escanear (para pedir permiso) y el escaneo con lo que el usuario permitió
          if (ruta === '/escanear/fuentes' && req.method === 'GET') return responder(res, 200, await fuentesDeEscaneo());
          if (ruta === '/escanear' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const agentes = Array.isArray(cuerpo.agentes) ? cuerpo.agentes.map(String) : [];
            // Solo los lugares que el Studio ofrece (la carpeta personal y los habituales de código, nmwdupnbttit), nunca otra
            // ruta que llegue en la petición
            const ofrecidos = (await fuentesDeEscaneo()).lugares;
            const lugares = Array.isArray(cuerpo.lugares) ? cuerpo.lugares.map(String).filter((u: string) => ofrecidos.some((o) => misma(o, u))) : [];
            if (!agentes.length && !lugares.length) return responder(res, 400, { error: t('servidor.api.eligeAgenteOUnidad') });
            const local = await leerLocal(raiz);
            // Solo lee, pero lee el equipo con el permiso de la persona: queda en la bitácora qué permitió escanear
            await anotar(raiz, { quien: await quienAqui(), que: tb('bitacora.escanea', { fuentes: juntas('y', [agentes.length ? tb('bitacora.escaneaHistoriales', { agentes: agentes.join(', ') }) : null, lugares.length ? tb('bitacora.escaneaLugares', { lugares: lugares.join(', ') }) : null].filter((x): x is TextoBitacora => x !== null)) }), desde: tb('bitacora.desde.escanear') });
            return responder(res, 200, await escanear(raiz, { agentes, lugares }, Object.values(local.repositorios)));
          }
          if (ruta === '/carpetas' && req.method === 'GET') {
            try {
              return responder(res, 200, await explorarCarpetas(raiz, url.searchParams.get('ruta') ?? ''));
            } catch (e) {
              return responder(res, 400, { error: (e as Error).message });
            }
          }
          // El modelo y el esfuerzo de Claude Code en este computador: elegirlos aquí es lo mismo que /model y /effort
          // (vale para el director que lanza el Studio y para cualquier sesión de Claude Code), y no va en git
          if (ruta === '/modelo' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            let modelo: string | null = null;
            try {
              modelo = textoDe(cuerpo.modelo, 60, t('servidor.api.etModelo'), t('servidor.api.haceElige')) || null;
              await guardarModeloClaude(modelo);
            } catch (e) {
              return responder(res, 400, { error: (e as Error).message });
            }
            await anotar(raiz, { quien: await quienAqui(), que: modelo ? tb('bitacora.eligeModelo', { modelo }) : tb('bitacora.vuelveModelo'), desde: tb('bitacora.desde.modelo') });
            // El esfuerzo guardado es de cada modelo: al cambiar de modelo, se ve el suyo
            return responder(res, 200, conMaximo(await leerAjustesClaude(), (await leerLocal(raiz)).esfuerzoMaximo === true));
          }
          if (ruta === '/esfuerzo' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const esfuerzo = textoDe(cuerpo.esfuerzo, 10, t('servidor.api.etEsfuerzo'), t('servidor.api.haceElige')) || null;
            try {
              // «Máximo» Claude Code no lo guarda: lo recuerda el Studio, y el guardado de tus sesiones queda como estaba
              if (esfuerzo !== 'max') await guardarEsfuerzoClaude(esfuerzo);
              await guardarEsfuerzoMaximo(raiz, esfuerzo === 'max');
            } catch (e) {
              return responder(res, 400, { error: (e as Error).message });
            }
            await anotar(raiz, { quien: await quienAqui(), que: esfuerzo ? tb('bitacora.eligeEsfuerzo', { esfuerzo }) : tb('bitacora.vuelveEsfuerzo'), desde: tb('bitacora.desde.esfuerzo') });
            return responder(res, 200, conMaximo(await leerAjustesClaude(), esfuerzo === 'max'));
          }
          // Ultracode en las sesiones nuevas de Claude Code (la clave `ultracode`); el director que lanza el Studio lo sigue
          // solo con el permiso del titular (`director`: lo da o lo quita, con «Autorizo» en «Modelo y consumo»)
          if (ruta === '/ultracode' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            try {
              if (typeof cuerpo.activo === 'boolean') await guardarUltracodeClaude(cuerpo.activo);
              if (typeof cuerpo.director === 'boolean') await guardarPermiso(raiz, 'ultracode', cuerpo.director);
            } catch (e) {
              return responder(res, 400, { error: (e as Error).message });
            }
            const quienUltra = await quienAqui();
            if (typeof cuerpo.activo === 'boolean') await anotar(raiz, { quien: quienUltra, que: cuerpo.activo ? tb('bitacora.enciendeUltracode') : tb('bitacora.apagaUltracode'), desde: tb('bitacora.desde.ultracode') });
            if (typeof cuerpo.director === 'boolean') await anotar(raiz, { quien: quienUltra, que: cuerpo.director ? tb('bitacora.daPermisoUltracode') : tb('bitacora.quitaPermisoUltracode'), desde: cuerpo.director ? tb('bitacora.desde.autorizoUltracode') : tb('bitacora.desde.quitarPermisoUltracode') });
            return responder(res, 200, { ...(await leerAjustesClaude()), ultracodeDirector: (await leerLocal(raiz)).permisos?.ultracode === true });
          }
          // El registro de «Modelo y consumo» › Permisos: lo que el titular autorizó, con su alcance. La lista vieja de lo
          // negado se vació (nmwpby57jtit): el aviso pregunta en el momento, así que `pendientes` va siempre vacío y no se
          // leen los registros de las revisiones de antes
          if (ruta === '/permisos' && req.method === 'GET') {
            const autorizados = (await leerLocal(raiz)).permisos?.autorizados ?? [];
            return responder(res, 200, { pendientes: [], autorizados });
          }
          // Autorizar varios de una vez (un solo envío) o quitar uno: solo lo que salió de lo negado en ese proyecto, nunca
          // una regla escrita a mano ni una de lo que nunca (permisosNegados.ts › revisarPedido)
          if (ruta === '/permisos' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const autorizar: unknown[] = Array.isArray(cuerpo.autorizar) ? cuerpo.autorizar.slice(0, 100) : [];
            const quitar: unknown[] = Array.isArray(cuerpo.quitar) ? cuerpo.quitar.slice(0, 100) : [];
            if (!autorizar.length && !quitar.length) return responder(res, 400, { error: t('servidor.api.marcaUnPermiso') });
            const negados = autorizar.length ? await negadosDelDirector(raiz) : [];
            const revisados = autorizar.map((p: any) => revisarPedido({ regla: p?.regla, proyecto: p?.proyecto, alcance: p?.alcance }, negados));
            const malo = revisados.find((r) => !r.ok);
            if (malo && !malo.ok) return responder(res, 400, { error: malo.error });
            const quien = await quienAqui();
            const cuando = new Date().toISOString();
            const fuera = quitar.filter((q: any) => typeof q?.regla === 'string').map((q: any) => ({ regla: String(q.regla), alcance: q.alcance === 'todos' ? 'todos' : 'proyecto', proyecto: typeof q.proyecto === 'string' ? q.proyecto : undefined }));
            const autorizados = await cambiarAutorizados(raiz, (antes) => {
              const sigue = antes.filter((a) => !fuera.some((f) => f.regla === a.regla && f.alcance === a.alcance && (f.alcance === 'todos' || f.proyecto === a.proyecto)));
              for (const r of revisados) {
                if (!r.ok) continue;
                // Lo de todos los proyectos reemplaza lo de uno solo con la misma regla; lo de uno, si ya vale para él, sobra
                if (r.alcance === 'todos') sigue.splice(0, sigue.length, ...sigue.filter((a) => a.regla !== r.regla));
                else if (sigue.some((a) => a.regla === r.regla && valePara(a, r.proyecto))) continue;
                sigue.push({ regla: r.regla, alcance: r.alcance, ...(r.alcance === 'proyecto' ? { proyecto: r.proyecto } : {}), cuando, quien });
              }
              return sigue;
            });
            for (const r of revisados)
              if (r.ok) await anotar(raiz, { quien, que: tb('bitacora.autorizaReglas', { reglas: `«${r.regla}»`, alcance: r.alcance === 'todos' ? tb('bitacora.enTodosLosProyectos') : tb('bitacora.enEsteProyecto') }), desde: tb('bitacora.desde.autorizoMarcados'), ...(r.alcance === 'proyecto' ? { proyecto: r.proyecto } : {}) });
            for (const f of fuera)
              await anotar(raiz, { quien, que: tb('bitacora.quitaRegla', { regla: `«${f.regla}»`, alcance: f.alcance === 'todos' ? tb('bitacora.enTodosLosProyectos') : tb('bitacora.enEsteProyecto') }), desde: tb('bitacora.desde.quitarPermiso'), ...(f.proyecto ? { proyecto: f.proyecto } : {}) });
            return responder(res, 200, { pendientes: [], autorizados });
          }
          // Las skills de los proyectos (pr_skills_cierre): las que el director carga, cada una con la huella de sus archivos,
          // y las que no, con lo que el código vio en ellas. La huella la calcula aquí el Studio, nunca la página: se autoriza
          // la skill como está en el disco en ese momento
          if (ruta === '/skills' && req.method === 'GET') return responder(res, 200, { skills: await panelDeSkills(raiz) });
          if (ruta === '/skills' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const pedidas = (x: unknown): { proyecto: string; nombre: string; ruta: string }[] =>
              (Array.isArray(x) ? x.slice(0, 100) : []).filter((s: any) => typeof s?.proyecto === 'string' && typeof s?.nombre === 'string' && typeof s?.ruta === 'string');
            const autorizar = pedidas(cuerpo.autorizar);
            const quitar = pedidas(cuerpo.quitar);
            if (!autorizar.length && !quitar.length) return responder(res, 400, { error: t('servidor.api.marcaUnaSkill') });
            const quien = await quienAqui();
            const hecho = await guardarSkills(raiz, { autorizar, quitar }, { quien, cuando: new Date().toISOString() });
            if (hecho.yaNoEsta) return responder(res, 400, { error: t('servidor.api.skillYaNoEsta') });
            for (const s of hecho.halladas) await anotar(raiz, { quien, que: tb('bitacora.autorizaSkill', { nombre: s.nombre, ruta: s.ruta, huella: s.huella, vio: s.hallazgos.length ? tb('bitacora.elStudioVio', { hallazgos: s.hallazgos.join(' ') }) : '' }), desde: tb('bitacora.desde.autorizoMarcadasSkills'), proyecto: s.proyecto });
            for (const q of quitar) await anotar(raiz, { quien, que: tb('bitacora.quitaSkill', { nombre: q.nombre, ruta: q.ruta }), desde: tb('bitacora.desde.quitarSkill'), proyecto: q.proyecto });
            // Releído del disco: si no quedó como se pidió, no es «Guardado» (nmwmniitjtit)
            if (hecho.noQuedaron.length) return responder(res, 500, { error: t('servidor.api.skillNoQuedo', { nombres: hecho.noQuedaron.map((s) => `«${s.nombre}»`).join(', ') }), skills: hecho.skills });
            return responder(res, 200, { skills: hecho.skills });
          }
          // El único modo de permisos (documento «One permission mode»; antes pr_permisos_al_momento): el gancho del director
          // (tools/director/ganchoPermiso.ts) pregunta aquí y espera a la persona sin límite de tiempo; el aviso lee lo que
          // espera y responde. Una clave que no es de una revisión abierta no pregunta: se niega (permisosEnEspera.ts)
          if (ruta === '/permiso-al-momento/pedir' && req.method === 'POST') {
            const clave = url.searchParams.get('clave') ?? '';
            const entrada = await leerCuerpo(req);
            const proyecto = permisosEnEspera.proyectoDe(clave);
            const contestado = await decidirParaElGancho(permisosEnEspera, clave, entrada);
            if (!contestado) {
              res.statusCode = 204;
              return res.end();
            }
            const herramienta = typeof entrada?.tool_name === 'string' ? entrada.tool_name : 'una herramienta';
            const dado = contestado.respuesta.hookSpecificOutput.decision.behavior === 'allow';
            await anotar(raiz, { quien: 'el director', ...queAnotarDeLaLlamada(herramienta, dado, contestado.decision), ...(proyecto ? { proyecto } : {}) });
            return responder(res, 200, contestado.respuesta);
          }
          if (ruta === '/permiso-al-momento' && req.method === 'GET') return responder(res, 200, { pendientes: permisosEnEspera.pendientes() });
          if (ruta === '/permiso-al-momento' && req.method === 'POST') {
            // Responde la persona, desde el diálogo del navegador (que siempre dice de dónde viene): ni el gancho ni una orden
            // del director (que conoce la clave por su variable de entorno) pueden darse el permiso a sí mismos
            if (req.headers['sec-fetch-site'] !== 'same-origin') return responder(res, 403, { error: t('servidor.api.soloElDialogo') });
            const cuerpo = await leerCuerpo(req);
            const respuesta = respuestaValida(cuerpo.respuesta);
            if (typeof cuerpo.clave !== 'string' || typeof cuerpo.id !== 'string' || !respuesta) return responder(res, 400, { error: t('servidor.api.faltaRevisionPregunta') });
            const pregunta = permisosEnEspera.pendientes().find((p) => p.clave === cuerpo.clave && p.id === cuerpo.id);
            const respondida = permisosEnEspera.responder(cuerpo.clave, cuerpo.id, respuesta);
            if (!respondida) return responder(res, 404, { error: t('servidor.api.preguntaYaNoEstaRevision') });
            if (respondida.aplicada && pregunta) {
              const quien = await quienAqui();
              const d = respondida.decision;
              // «Siempre, en este proyecto» o «Siempre, en todos los proyectos»: la regla general de ese tipo de acción, como en
              // el panel, con el alcance elegido; queda guardada y la próxima vez no se pregunta (nmwp8wpaatit)
              if (d.permitir && d.guardar) {
                const g = d.guardar;
                const cuando = new Date().toISOString();
                // La hora de la pregunta de la revisión: el registro de «Permisos» dice de cuál salió
                const revision = new Date(pregunta.pedidoEn).toISOString();
                const nuevo = g.alcance === 'todos' ? { regla: g.regla, alcance: 'todos' as const, cuando, quien, revision } : { regla: g.regla, alcance: 'proyecto' as const, proyecto: g.proyecto, cuando, quien, revision };
                await cambiarAutorizados(raiz, (antes) => {
                  const yaVale = antes.some((a) => a.regla === g.regla && (g.alcance === 'todos' ? a.alcance === 'todos' : valePara(a, g.proyecto)));
                  // Para todos reemplaza el de solo este proyecto, que ya no hace falta
                  const sinElDeAntes = g.alcance === 'todos' ? antes.filter((a) => !(a.regla === g.regla && a.alcance === 'proyecto' && a.proyecto === g.proyecto)) : antes;
                  return yaVale ? antes : [...sinElDeAntes, nuevo];
                });
              }
              await anotar(raiz, { quien, que: queAnotarDeLaRespuesta(d, pregunta.propuesta.que), desde: tb('bitacora.desde.dialogoPermiso'), proyecto: pregunta.proyecto });
            }
            return responder(res, 200, { ...respondida, pendientes: permisosEnEspera.pendientes() });
          }
          // El selector de modo salió de «Modelo y consumo»: hay un solo modo de permisos (nmwp8uot6tit), y su ruta con él
          // «Todo con el modelo que elegí» (pr_modelos_por_tarea, punto 4): los ayudantes del director, con su mismo modelo
          // La línea de versión nueva: la ✕ la cierra hasta la versión siguiente, y la casilla la apaga o la enciende
          if (ruta === '/aviso-version' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            if (cuerpo.cerrar === true) await cambiarAvisoVersion(raiz, (a) => (a?.version ? { ...a, cerrada: a.version } : a));
            else if (typeof cuerpo.si === 'boolean') {
              const si = cuerpo.si;
              await cambiarAvisoVersion(raiz, ({ apagado, ...a } = {}) => ({ ...a, ...(si ? {} : { apagado: true as const }) }));
              await anotar(raiz, { quien: await quienAqui(), que: si ? tb('bitacora.enciendeAvisoVersion') : tb('bitacora.apagaAvisoVersion'), desde: tb('bitacora.desde.casillaModelo') });
            } else return responder(res, 400, { error: t('servidor.api.faltaAvisoVersion') });
            const a = (await leerLocal(raiz)).avisoVersion;
            return responder(res, 200, { avisoVersion: lineaDeVersion(a, versionInstalada(raiz)), avisoVersionApagado: a?.apagado === true });
          }
          if (ruta === '/todo-con-el-modelo' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            if (typeof cuerpo.si !== 'boolean') return responder(res, 400, { error: t('servidor.api.faltaSiAyudantes') });
            await guardarTodoConElModelo(raiz, cuerpo.si);
            await anotar(raiz, { quien: await quienAqui(), que: cuerpo.si ? tb('bitacora.ayudantesMismoModelo') : tb('bitacora.ayudantesBarato'), desde: tb('bitacora.desde.todoConModelo') });
            return responder(res, 200, { todoConElModelo: cuerpo.si });
          }
          // La ayuda guiada de una sección ya vista (o saltada): la recuerda el Studio, una vez para todos los proyectos
          // (pd_ayuda_guiada; ayudaGuiada.ts)
          if (ruta === '/ayuda-vista' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            if (typeof cuerpo.seccion !== 'string' || !(SECCIONES_DE_AYUDA as readonly string[]).includes(cuerpo.seccion)) return responder(res, 400, { error: 'seccion' });
            const ayudasVistas = await guardarAyudaVista(raiz, cuerpo.seccion);
            await anotar(raiz, { quien: await quienAqui(), que: tb('bitacora.ayudaGuiada', { seccion: cuerpo.seccion }), desde: tb('bitacora.desde.ayudaGuiada') });
            return responder(res, 200, { ayudasVistas });
          }
          // Tu plan de Claude, para recomendarte el modelo: lo pedirá el asistente de instalación (nota nmvxx61ictit: el selector
          // salió de «Lo que gasta», y lo guardado y esta ruta siguen, para él)
          if (ruta === '/plan-de-claude' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const elegido: unknown = cuerpo.plan === null || cuerpo.plan === '' ? null : cuerpo.plan;
            if (elegido !== null && !esPlanDeClaude(elegido)) return responder(res, 400, { error: t('servidor.api.eligePlan') });
            const plan = elegido as PlanDeClaude | null;
            await guardarPlanDeClaude(raiz, plan);
            await anotar(raiz, { quien: await quienAqui(), que: plan ? tb('bitacora.eligePlan', { plan: PLANES_DE_CLAUDE[plan].nombre }) : tb('bitacora.quitaPlan'), desde: tb('bitacora.desde.planClaude') });
            return responder(res, 200, { planDeClaude: plan });
          }
          // El asistente de instalación (pd_valores_instalar; src/director/asistente.ts): si se abre solo, donde quedó y lo que
          // hay hoy. Un modelo ya elegido en Claude Code no lo salta (nmwr3amdptit): solo un proyecto propio o haberlo terminado
          if (ruta === '/asistente' && req.method === 'GET') {
            const l = await leerLocal(raiz);
            const { modelo } = await leerAjustesClaude();
            const proyectosPropios = l.asistente ? 0 : (await resumenProyectos()).filter((p) => !p.esElStudio).length;
            return responder(res, 200, {
              abre: abreSolo({ proyectosPropios, estado: l.asistente }),
              estado: l.asistente ?? null,
              plan: l.asistente?.plan ?? l.planDeClaude ?? null,
              modelo,
              modo: l.modoPermisos ?? 'autorizado',
            });
          }
          // Quien cerró a mitad vuelve donde quedó, con lo que ya eligió marcado (t_decide_asistente_retoma)
          if (ruta === '/asistente' && req.method === 'POST') {
            const estado = estadoAsistenteDe(await leerCuerpo(req));
            if (!estado) return responder(res, 400, { error: t('servidor.api.faltaDondeAsistente') });
            // Terminar lo decide solo «/asistente/aplicar», que es donde se guarda de verdad
            const { terminado: _ignorado, ...sinTerminar } = estado;
            await guardarAsistente(raiz, sinTerminar);
            await anotar(raiz, { quien: await quienAqui(), que: tb('bitacora.vaEnPantalla', { paso: sinTerminar.paso }), desde: tb('bitacora.desde.asistente') });
            return responder(res, 200, {});
          }
          // La sesión de Claude Code, en su propia ruta: mirarla tarda, y solo hace falta con la ventana abierta
          if (ruta === '/asistente/sesion' && req.method === 'GET') return responder(res, 200, await sesionDeClaude());
          // La orden la pone el servidor, nunca la página
          if (ruta === '/asistente/terminal' && req.method === 'POST') {
            const sesion = await sesionDeClaude();
            if (sesion.ok) return responder(res, 200, {});
            const r = await abrirTerminal(sesion.orden, raiz);
            await anotar(raiz, { quien: await quienAqui(), que: r.ok ? tb('bitacora.abreTerminalAsistente', { orden: sesion.orden }) : tb('bitacora.noAbreTerminalAsistente', { error: r.error ?? '' }), desde: tb('bitacora.desde.abrirTerminalAsistente') });
            return r.ok ? responder(res, 200, {}) : responder(res, 400, { error: r.error });
          }
          // Guardar lo elegido: el plan, el modelo con su esfuerzo y el modo. Al repasar, el modelo y su esfuerzo se tocan
          // solo si cambió el modelo
          if (ruta === '/asistente/aplicar' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const revisado = revisarInstalacion(cuerpo);
            if (!revisado.ok) return responder(res, 400, { error: revisado.error === 'plan' ? t('servidor.api.eligeTuPlan') : revisado.error === 'modelo' ? t('servidor.api.eligeModeloLista') : t('servidor.api.eligeComoPide') });
            const { plan, modelo, modo } = revisado.pedido;
            if (modo === 'automatico' && !(await automaticoDisponible())) return responder(res, 400, { error: porQueSinAutomatico() });
            const antes = await leerAjustesClaude();
            const quien = await quienAqui();
            try {
              if (cuerpo.repaso !== true || antes.modelo !== modelo) {
                await guardarModeloClaude(modelo);
                await guardarEsfuerzoClaude(ESFUERZO_DEL_ASISTENTE);
                await guardarEsfuerzoMaximo(raiz, false);
              }
            } catch (e) {
              return responder(res, 400, { error: (e as Error).message });
            }
            await guardarPlanDeClaude(raiz, plan === 'nose' ? null : plan);
            await guardarModoPermisos(raiz, modo);
            // Queda guardado, y sigue: la pantalla de la voz. Termina con «/asistente/terminar»; quien ya había terminado sigue así
            const yaTerminado = (await leerLocal(raiz)).asistente?.terminado;
            await guardarAsistente(raiz, { paso: 'voz', plan, modelo, modo, ...(yaTerminado ? { terminado: yaTerminado } : {}) });
            await anotar(raiz, { quien, que: tb('bitacora.dejaInstalacion', { plan, modelo, modo }), desde: cuerpo.repaso === true ? tb('bitacora.desde.repasarInstalacion') : tb('bitacora.desde.asistente') });
            return responder(res, 200, {});
          }
          // La pantalla de la voz (src/director/instalacionVoz.ts): cómo van las dos descargas, y empezar una. Lo que se instala lo
          // dice el servidor por su nombre, nunca una orden de la página
          if (ruta === '/asistente/voz' && req.method === 'GET') return responder(res, 200, instaladorDeVoz().estado());
          if (ruta === '/asistente/instalar' && req.method === 'POST') {
            const { que } = await leerCuerpo(req);
            if (que !== 'transcripcion' && que !== 'voces') return responder(res, 400, { error: t('servidor.api.queInstalar') });
            if (instaladorDeVoz().instalar(que)) await anotar(raiz, { quien: await quienAqui(), que: tb('bitacora.instala', { que: que === 'voces' ? tb('bitacora.vocesQueLeen') : tb('bitacora.transcripcionNotas') }), desde: tb('bitacora.desde.pantallaVoz') });
            return responder(res, 200, instaladorDeVoz().estado());
          }
          // Terminó: desde aquí no se abre solo. Lo que eligió ya quedó guardado con «/asistente/aplicar»
          if (ruta === '/asistente/terminar' && req.method === 'POST') {
            const l = await leerLocal(raiz);
            await guardarAsistente(raiz, { paso: l.asistente?.paso ?? 'voz', ...l.asistente, terminado: new Date().toISOString() });
            await anotar(raiz, { quien: await quienAqui(), que: tb('bitacora.terminaAsistente'), desde: tb('bitacora.desde.asistente') });
            return responder(res, 200, {});
          }
          // La prueba del micrófono: como «/dictar», ni el audio ni su texto quedan en disco, y aquí todavía no hay proyecto propio
          if (ruta === '/asistente/prueba-mic' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const audio = enDisco(raiz, await guardarAudio(raiz, '.estudio/dictados', `p${Date.now().toString(36)}`, cuerpo.audio));
            try {
              const r = await transcribirEnLocal(raiz, [audio], 'Una frase de prueba, leída en voz alta.');
              const texto = (transcripcionEnDisco(audio) ?? '').trim();
              await anotar(raiz, { quien: await quienAqui(), que: texto ? tb('bitacora.pruebaMicro') : tb('bitacora.pruebaMicroFalla'), desde: tb('bitacora.desde.pantallaVoz') });
              if (texto) return responder(res, 200, { texto });
              return responder(res, 400, { error: r.ok ? t('servidor.api.audioSinNada') : t('servidor.api.noSePudoTranscribir', { razon: r.error ?? t('servidor.api.sinRazon') }) });
            } finally {
              await rm(audio, { force: true });
              await rm(txtDeAudio(audio), { force: true });
            }
          }
          // El idioma de la interfaz: en la configuración de este computador, para todos los proyectos y fuera de git (pd_idiomas)
          if (ruta === '/idioma' && req.method === 'POST') {
            const { idioma } = await leerCuerpo(req);
            if (!esIdioma(idioma)) return responder(res, 400, { error: t('servidor.api.idiomaNoEsta') });
            await guardarIdioma(raiz, idioma);
            ponerIdioma(idioma);
            // La semilla de STL Studio que nadie ha tocado se muestra en el idioma nuevo (semilla.ts); si no se pudo, sigue en el suyo
            await alinearSemilla(raiz, idioma).catch(() => false);
            await anotar(raiz, { quien: await quienAqui(), que: tb('bitacora.quedaIdioma', { idioma: idioma === 'en' ? tb('bitacora.idiomaIngles') : tb('bitacora.idiomaEspanol') }), desde: tb('bitacora.desde.idiomaNavegador') });
            return responder(res, 200, { idioma });
          }
          // Si el director que lanza el Studio carga tus ajustes de usuario de Claude Code (y con ellos tus skills y tus
          // comandos): se elige en «Modelo y consumo», viendo sus claves (pd_arranque_limpio)
          // Sin ellos, las claves que conserva, elegidas una por una con su explicación (`conservar`)
          if (ruta === '/ajustes-propios' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            if (typeof cuerpo.cargar !== 'boolean') return responder(res, 400, { error: t('servidor.api.faltaSiCarga') });
            const conservar: string[] = Array.isArray(cuerpo.conservar) ? cuerpo.conservar.filter((c: unknown): c is string => typeof c === 'string') : [];
            // Con lo elegido, las claves que había al elegir: una que aparezca después se vuelve a confirmar
            await guardarAjustesPropios(raiz, cuerpo.cargar, conservar, (await opcionesDeTusAjustes())?.map((o) => o.id));
            await anotar(raiz, { quien: await quienAqui(), que: cuerpo.cargar ? tb('bitacora.cargaAjustes') : tb('bitacora.noCargaAjustes', { conserva: conservar.length ? tb('bitacora.conserva', { lista: conservar.join(', ') }) : '' }), desde: tb('bitacora.desde.tusAjustes') });
            return responder(res, 200, await estadoAjustesPropios(raiz));
          }
          // «Abrir Claude Code»: una terminal nueva con Claude Code como lo lanza el Studio (en su carpeta, con la del
          // proyecto activo a la vista y la misma configuración). La orden la arma el servidor, nunca la petición
          if (ruta === '/abrir-claude' && req.method === 'POST') {
            const programa = buscarClaude();
            if (!programa) return responder(res, 400, { error: t('servidor.api.sinClaudeCode') });
            const activoAhora = await activo();
            const r = await abrirTerminal(ordenAbrirClaude(programa, raiz, activoAhora ? await leerRutaRepositorio(raiz, activoAhora) : null, (await leerLocal(raiz)).esfuerzoMaximo === true), raiz);
            await anotar(raiz, { quien: await quienAqui(), que: r.ok ? tb('bitacora.abreClaude') : tb('bitacora.noAbreClaude', { error: r.error ?? '' }), desde: tb('bitacora.desde.abrirClaude'), ...(activoAhora ? { proyecto: activoAhora } : {}) });
            return r.ok ? responder(res, 200, {}) : responder(res, 400, { error: r.error });
          }
          // «Medir el núcleo» (propuesta aceptada pr_nucleo_medido): la corrida de los casos fijos con el director de
          // verdad, que pide la persona con su costo a la vista, y «Detener». Nunca junto a una revisión: las dos gastan del
          // mismo límite de la cuenta (elección del titular del 26 de octubre de 2026)
          if (ruta === '/medicion' && req.method === 'POST') {
            // Sin la marca «copia de desarrollo», no se puede pedir (pd_medicion_solo_desarrollo)
            if (!(await leerLocal(raiz)).copiaDeDesarrollo) return responder(res, 403, { error: t('servidor.api.medicionSoloDesarrollo') });
            const tokensDeRevisiones = () => consumoDeRevisiones(raiz).filter((c) => c.tipo === 'revision').map(tokensDe);
            const tokensCortos = () => consumoDeRevisiones(raiz).filter((c) => c.tipo !== 'revision').map(tokensDe);
            const cuerpo = await leerCuerpo(req);
            const quien = await quienAqui();
            const desde = tb('bitacora.desde.medirNucleo');
            if (cuerpo.detener) {
              if (detenerMedicion()) await anotar(raiz, { quien, que: tb('bitacora.detieneMedicion'), desde });
              return responder(res, 200, { medicion: estadoDeMedicion(raiz, tokensDeRevisiones(), tokensCortos()) });
            }
            if (!cuerpo.pedir) return responder(res, 400, { error: t('servidor.api.faltaPedirODetener') });
            const l = await leerLocal(raiz);
            const enCurso = (x: { lanzada?: string; enCurso?: string; hecha?: string; error?: string } | null | undefined) => !!x && !x.hecha && !x.error;
            if (revisor?.estado().revisandoEn.length || Object.values(l.revisiones ?? {}).some(enCurso) || enCurso(l.aclaracion) || enCurso(l.urgencia))
              return responder(res, 400, { error: t('servidor.api.medicionEspera') });
            const programa = buscarClaude();
            if (!programa) return responder(res, 400, { error: t('servidor.api.sinClaudeCodeMedir') });
            // Qué casos: los que la persona eligió uno por uno de los que fallan (nota de voz del titular nmvsgcn7otit: lo que
            // ya pasa no se vuelve a correr) o, por alcance, lo que el último cambio pudo romper, lo que fallaba o todos
            // (nmvrimph5tit)
            const guardadas = corridasGuardadas(raiz);
            const elegidos = Array.isArray(cuerpo.casos) ? casosMedibles().filter((c) => (cuerpo.casos as unknown[]).includes(c.id)) : null;
            if (elegidos && !elegidos.length) return responder(res, 400, { error: t('servidor.api.eligeUnCaso') });
            const queFallan = new Set(casosDelAlcance('fallaban', guardadas).map((c) => c.id));
            const alcance: Alcance | undefined = elegidos ? (elegidos.every((c) => queFallan.has(c.id)) ? 'fallaban' : undefined) : ALCANCES.includes(cuerpo.alcance as Alcance) ? (cuerpo.alcance as Alcance) : 'todos';
            const casos = elegidos ?? casosDelAlcance(alcance!, guardadas);
            if (!casos.length) return responder(res, 400, { error: alcance === 'fallaban' ? t('servidor.api.ningunCasoFallaba') : t('servidor.api.noHayCasos') });
            const { modelo, esfuerzo } = conMaximo(await leerAjustesClaude(), l.esfuerzoMaximo === true);
            const empezo = empezarMedicion({
              raiz, modelo, esfuerzo, programa, quien, casos, alcance,
              alTerminar: (c, problema) => void anotarEnSuIdioma(raiz, () => ({ quien: EL_STUDIO, que: c ? tb('bitacora.terminaMedicion', { quien, vueltas: c.vueltas.length, detenida: c.terminada ? '' : tb('bitacora.detenidaAntes') }) : tb('bitacora.noTerminaMedicion', { quien, problema: problema ?? tb('bitacora.seCayo') }), desde: tb('bitacora.desde.medicion') })).catch(() => {}),
            });
            if (!empezo) return responder(res, 400, { error: t('servidor.api.yaSeMide') });
            await anotar(raiz, { quien, que: tb('bitacora.pideMedicion', { modelo: modelo ?? tb('bitacora.elModeloDeSuCuenta'), esfuerzo: esfuerzo ? tb('bitacora.yEsfuerzo', { esfuerzo }) : '', casos: elegidos ? tb('bitacora.casosElegidos', { n: elegidos.length, titulos: elegidos.map((c) => `«${c.titulo}»`).join(', ') }) : alcance === 'pasaban' ? tb('bitacora.casosPasaban', { n: casos.length }) : alcance === 'fallaban' ? tb('bitacora.casosFallaban', { n: casos.length }) : tb('bitacora.casosTodos', { n: casos.length }) }), desde });
            return responder(res, 200, { medicion: estadoDeMedicion(raiz, tokensDeRevisiones(), tokensCortos()) });
          }
          // Los sonidos (sonidos.ts): de su carpeta, estudio/sonidos, que viaja con el Studio
          if (ruta === '/sonidos' && req.method === 'GET') return responder(res, 200, await leerSonidos(raiz));
          if (ruta === '/sonido' && req.method === 'GET') {
            const datos = await leerSonido(raiz, url.searchParams.get('nombre') ?? '');
            if (!datos) return responder(res, 404, { error: t('servidor.api.sonidoNoEsta') });
            res.statusCode = 200;
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Cache-Control', 'private, max-age=86400');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            return res.end(datos);
          }
          if (ruta === '/activo' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const id = String(cuerpo.id ?? '');
            if (!(await listarIds()).includes(id)) return responder(res, 404, { error: t('servidor.api.proyectoNoEsta') });
            // Con una nota de voz del activo transcribiéndose, el cambio espera a que quede escrita: así llega al Buzón de su
            // proyecto y no al del nuevo (nmwdwg5yvtit). La página lo dice con su cargador
            const antes = await activo();
            if (antes && antes !== id) await notasEnCurso.esperar(antes, TOPE_CAMBIO_CON_NOTA_MS);
            await guardarActivo(raiz, id);
            olvidarIdentidad();
            const nombre = (await leerProyecto(id).catch(() => null))?.nombre || id;
            await anotar(raiz, { quien: await quienAqui(), que: tb('bitacora.cambiaProyecto', { nombre }), desde: tb('bitacora.desde.selectorProyecto'), proyecto: id });
            // La sesión activa de gh sigue a la cuenta aprobada de ese proyecto (nmw9xvydetit)
            const cuentaGh = await seguirCuenta(id);
            const cambio = cambioDeCuenta(cuentaGh, id, tb('bitacora.desde.alCambiarProyecto'));
            if (cambio) await anotar(raiz, cambio);
            return responder(res, 200, { id, cuentaGh });
          }
          // Lo mismo al cargar el Studio: la página lo pide una vez, para el proyecto activo
          if (ruta === '/cuenta-git/seguir' && req.method === 'POST') {
            const id = await activo();
            const cuentaGh: SeguimientoDeCuenta = id ? await seguirCuenta(id) : { que: 'sin_cuenta' };
            const cambio = id ? cambioDeCuenta(cuentaGh, id, tb('bitacora.desde.alAbrirStudio')) : null;
            if (cambio) await anotar(raiz, cambio);
            return responder(res, 200, { cuentaGh });
          }
          // «Quitarlo de este Studio» (pd_quitar_en_pantalla), en «Proyecto» › «Dónde está»: GET dice todo lo que se borraría
          // (lo encuentra el código, sin tocar nada), y POST, con la confirmación de la persona, lo borra. Solo su titular, y
          // nunca STL Studio mismo (queSeBorra lo rechaza)
          if (ruta === '/quitar-proyecto' && (req.method === 'GET' || req.method === 'POST')) {
            const cuerpo = req.method === 'POST' ? await leerCuerpo(req) : {};
            const quitar = String((req.method === 'POST' ? cuerpo.id : url.searchParams.get('id')) ?? '');
            if (!(await listarIds()).includes(quitar)) return responder(res, 404, { error: t('servidor.api.proyectoNoEsta') });
            const yo = await leerIdentidad(raiz, quitar);
            if (yo.rol !== 'titular') return responder(res, 403, { error: yo.problema ?? t('servidor.api.quitarSoloTitular') });
            // Nunca mientras su director trabaja o su revisión espera lanzarse: borraría la memoria bajo sus pies, y el
            // director seguiría escribiendo en una carpeta que ya no existe (auditoría de la entrega, nmwcebe0otit)
            if (req.method === 'POST') {
              const l = await leerLocal(raiz);
              const corre = (x: { proyecto: string; hecha?: string; error?: string } | undefined) => !!x && x.proyecto === quitar && !x.hecha && !x.error;
              if (!!revisor?.estado().revisandoEn.includes(quitar) || corre(revisionDe(l, quitar)) || corre(l.aclaracion) || corre(l.urgencia))
                return responder(res, 409, { error: t('servidor.api.quitarRevisando') });
            }
            try {
              if (req.method === 'GET') return responder(res, 200, { borra: await queSeBorra(raiz, quitar) });
              if (cuerpo.confirmo !== true) return responder(res, 400, { error: t('servidor.api.quitarSinConfirmo') });
              const r = await quitarProyecto(raiz, quitar, { idioma: (await leerLocal(raiz)).idioma });
              repos.delete(quitar);
              caches.delete(quitar);
              olvidarIdentidad();
              // La bitácora no guarda ni su id ni su nombre: nada suyo queda en este Studio (nmwb0rn8ztit)
              await anotar(raiz, { quien: yo.nombre, que: tb('bitacora.quitaProyecto'), desde: tb('bitacora.desde.quitarDelStudio') });
              return responder(res, 200, { quedo: r.quedo, despues: r.despues, commit: r.commit, remotaBorrada: r.remotaBorrada });
            } catch (e) {
              return responder(res, 400, { error: e instanceof Error ? e.message : String(e) });
            }
          }
          const id = await activo();
          if (!id) return responder(res, 409, { error: t('servidor.api.sinProyectos') });
          // El registro de lo que recorriste con la niebla (pd_registro_lectura): de quien abre el Studio, en este proyecto y en
          // este computador, fuera de git. Leerlo y sumarle lo recorrido no cambia nada del proyecto: no espera a la revisión
          if (ruta === '/lectura') {
            const yo = await leerIdentidad(raiz, id);
            if (!yo.rol) return responder(res, 200, { registro: {} });
            if (req.method === 'GET') return responder(res, 200, { registro: await leerRegistroLectura(raiz, id, yo.rol) });
            if (req.method === 'POST') return responder(res, 200, { registro: await anotarLectura(raiz, id, yo.rol, registroValido((await leerCuerpo(req)).cambios)) });
          }
          if (ruta === '/documentos' && req.method === 'GET') return responder(res, 200, await listarDocumentos(id));
          if (ruta === '/documento' && req.method === 'GET') {
            const pedido = url.searchParams.get('ruta') ?? '';
            const texto = await leerDocumento(id, pedido);
            if (texto === null) return responder(res, 404, { error: t('servidor.api.documentoNoEsta') });
            return responder(res, 200, { ruta: pedido, texto });
          }
          if (ruta === '/archivo' && req.method === 'GET') {
            const pedido = url.searchParams.get('ruta') ?? '';
            const m = /^proyectos\/[a-z0-9-]+\/director\/notas\/[\w.-]+\.(webm|ogg|m4a|mp3)$/.exec(pedido);
            const adjunto = !m && RUTA_ADJUNTO.test(pedido);
            const datos = m || adjunto ? await leerFresco(raiz, pedido) : null;
            if (!datos) return responder(res, 404, { error: m ? t('servidor.api.audioNoEsta') : t('servidor.api.archivoNoEsta') });
            res.statusCode = 200;
            res.setHeader('Cache-Control', 'private, max-age=3600');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            // El audio, por partes (rangos.ts, nmwk9fcimtit): con 206 el navegador sabe su duración y salta a cualquier punto
            if (m) res.setHeader('Content-Type', TIPOS_AUDIO[m[1]]);
            if (m) return responderConRango(res, req.headers.range, datos);
            // Las imágenes se ven tal cual; cualquier otro adjunto se descarga (nunca se abre como una página del Studio)
            else if (esImagen(pedido)) res.setHeader('Content-Type', TIPOS_IMAGEN[pedido.split('.').pop()!.toLowerCase()]);
            else {
              // El nombre de la descarga lo pone la página (el del adjunto, que ya cabe en este tope): un localizador, no
              // contenido; se acota, y el archivo va entero
              const nombre = String(url.searchParams.get('nombre') ?? '').trim().slice(0, MAX_NOMBRE_ARCHIVO).replace(/["\\\r\n]/g, '_') || pedido.split('/').pop()!;
              res.setHeader('Content-Type', 'application/octet-stream');
              res.setHeader('Content-Disposition', `attachment; filename="${nombre.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(nombre)}`);
            }
            return res.end(datos);
          }
          // Un archivo que nombra el director, con formato según su tipo, en una pestaña aparte (verArchivo.ts): de los
          // registros de este computador, del repositorio del proyecto activo o de su memoria; nunca un .env
          if (ruta === '/ver' && req.method === 'GET') {
            const pedido = url.searchParams.get('ruta') ?? '';
            const pagina = (codigo: number, html: string) => {
              res.statusCode = codigo;
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.setHeader('Content-Security-Policy', POLITICA_VER);
              res.setHeader('X-Content-Type-Options', 'nosniff');
              res.setHeader('Cache-Control', 'no-store');
              return res.end(html);
            };
            if (!rutaPermitida(pedido)) return pagina(400, paginaDeError(pedido, t('servidor.ver.rutaNoSeAbre')));
            const r = await repositorio(id);
            const texto = esRegistro(pedido)
              ? await readFile(join(raiz, ...pedido.split('/')), 'utf8').catch(() => null)
              : ((r.info ? await leerDelRepositorio(r.info.ruta, pedido) : null) ??
                (await leerFrescoTexto(raiz, `${rutasDe(id).base}/${pedido}`)) ??
                (pedido.startsWith(`${rutasDe(id).base}/`) ? await leerFrescoTexto(raiz, pedido) : null));
            if (texto === null) return pagina(404, paginaDeError(pedido, t('servidor.ver.noEsta')));
            if (texto.includes('\u0000')) return pagina(415, paginaDeError(pedido, t('servidor.ver.noEsTexto')));
            const cortado = texto.length > MAX_BYTES_VER;
            return pagina(200, paginaDeArchivo(pedido, cortado ? texto.slice(0, MAX_BYTES_VER) : texto, cortado));
          }
          if (ruta === '/repositorio' && req.method === 'POST') {
            // La ruta es de este computador: no va en git ni se firma; la guarda cualquiera del equipo
            const cuerpo = await leerCuerpo(req);
            const c = await comprobarRepositorio(String(cuerpo.ruta ?? ''));
            if (!c.ok) return responder(res, 400, { error: c.error });
            const otro = Object.entries((await leerLocal(raiz)).repositorios).find(([pid, x]) => pid !== id && misma(x, c.info.ruta));
            if (otro) return responder(res, 400, { error: t('servidor.api.repoYaEsDe', { proyecto: otro[0] }) });
            // La memoria del proyecto vive en su repositorio: la carpeta nueva debe tenerla (es el mismo repositorio, movido)
            const { yaTenia } = await abrirMemoria(c.info.ruta);
            if (!yaTenia) return responder(res, 400, { error: t('servidor.api.carpetaSinMemoria') });
            await guardarRutaRepositorio(raiz, id, c.info.ruta);
            repos.delete(id);
            caches.delete(id);
            await anotar(raiz, { quien: await quienAqui(), que: tb('bitacora.cambiaCarpeta', { ruta: c.info.ruta }), desde: tb('bitacora.desde.usarCarpeta'), proyecto: id });
            return responder(res, 200, { info: c.info });
          }
          // La cuenta de GitHub aprobada para este proyecto, en este computador (cuentaGit.ts): la pone su titular, y al
          // guardarla se le dice qué dice GitHub de la sesión de ahora
          // La segunda dirección del respaldo, solo del proyecto STL Studio: el repositorio privado de su memoria, que nunca es
          // el del mismo Studio (respaldo.ts; nmwfl2c3ltit). Vacía, se quita
          if (ruta === '/respaldo-segunda' && req.method === 'POST') {
            const yo = await leerIdentidad(raiz, id);
            if (yo.rol !== 'titular') return responder(res, 403, { error: yo.problema ?? t('servidor.api.cuentaGitSoloTitular') });
            const repo = await leerRutaRepositorio(raiz, id);
            if (!repo || !esElStudio(raiz, repo)) return responder(res, 400, { error: t('respaldo.segundaMal') });
            const url = String((await leerCuerpo(req)).url ?? '').trim();
            const propio = repoDeGithub((await correrGit(raiz, ['remote', 'get-url', 'origin'])).out);
            const destino = url ? repoDeGithub(url) : null;
            if (url && (!destino || url.length > 300 || (propio && destino.toLowerCase() === propio.toLowerCase()))) return responder(res, 400, { error: t('respaldo.segundaMal') });
            await guardarRespaldoDelStudio(raiz, url);
            await anotar(raiz, { quien: yo.nombre, que: url ? tb('bitacora.conectaRepoPrivado', { destino: destino ?? '' }) : tb('bitacora.quitaRepoPrivado'), desde: tb('bitacora.desde.dondeEsta'), proyecto: id });
            return responder(res, 200, { ok: true, respaldo: await respaldoDe(id).estado() });
          }
          // Respaldar aunque el repositorio sea público: lo enciende el titular, con el aviso a la vista (nmwf5lg39tit)
          if (ruta === '/respaldo-publico' && req.method === 'POST') {
            const yo = await leerIdentidad(raiz, id);
            if (yo.rol !== 'titular') return responder(res, 403, { error: yo.problema ?? t('servidor.api.cuentaGitSoloTitular') });
            const si = (await leerCuerpo(req)).si === true;
            await ponerRespaldoPublico(raiz, id, si);
            await anotar(raiz, { quien: yo.nombre, que: si ? tb('bitacora.enciendeRespaldoPublico') : tb('bitacora.apagaRespaldoPublico'), desde: tb('bitacora.desde.dondeEsta'), proyecto: id });
            return responder(res, 200, { ok: true, respaldo: await respaldoDe(id).estado() });
          }
          if (ruta === '/cuenta-git' && req.method === 'POST') {
            const yo = await leerIdentidad(raiz, id);
            if (yo.rol !== 'titular') return responder(res, 403, { error: yo.problema ?? t('servidor.api.cuentaGitSoloTitular') });
            const cuenta = String((await leerCuerpo(req)).cuenta ?? '').trim();
            if (cuenta && !esCuentaGitHub(cuenta)) return responder(res, 400, { error: t('servidor.api.cuentaGitInvalida') });
            await guardarCuentaGit(raiz, id, cuenta);
            await anotar(raiz, { quien: yo.nombre, que: cuenta ? tb('bitacora.aprobaCuenta', { cuenta }) : tb('bitacora.quitaCuenta'), desde: tb('bitacora.desde.dondeEsta'), proyecto: id });
            const login = await loginDeGitHubSinEsperar();
            return responder(res, 200, { cuenta, login, coincide: compararCuenta(cuenta, login).ok });
          }
          // Las sesiones de gh, desde el panel (nota nmw0vw3detit): cuáles guardó gh, de quién es cada una según GitHub, cuál
          // está activa y cuál es la aprobada. Solo el titular, porque cambiar la activa vale para todo este computador;
          // los tokens no salen del servidor. Con ?entrada=1, solo cómo va la entrada con otra cuenta (la página la sigue)
          if (ruta === '/cuenta-git/sesiones' && req.method === 'GET') {
            const yo = await leerIdentidad(raiz, id);
            if (yo.rol !== 'titular') return responder(res, 403, { error: yo.problema ?? t('servidor.api.cuentaGitSoloTitular') });
            if (url.searchParams.get('entrada')) return responder(res, 200, { entrada: entradaDeGh() });
            const aprobada = (await leerLocal(raiz)).cuentasGit?.[id] ?? null;
            return responder(res, 200, { aprobada, ...(await sesionesDeGh(aprobada)), entrada: entradaDeGh() });
          }
          // El vigía (nmwo0dx41tit): el último aviso, numerado; con ?mirar=1, lee gh ahora (tras «Usar esta»). Sin tokens
          if (ruta === '/cuenta-git/vigia' && req.method === 'GET') {
            if (url.searchParams.get('mirar')) await mirarCuentaGh().catch(() => {});
            return responder(res, 200, { aviso: avisoGh });
          }
          // «Usar esta»: gh auth switch a una sesión que gh ya tiene guardada
          if (ruta === '/cuenta-git/usar' && req.method === 'POST') {
            const yo = await leerIdentidad(raiz, id);
            if (yo.rol !== 'titular') return responder(res, 403, { error: yo.problema ?? t('servidor.api.cuentaGitSoloTitular') });
            const nombre = (await leerCuerpo(req)).nombre;
            const r = await usarSesionDeGh(nombre);
            if (!r.ok) return responder(res, 400, { error: r.error === 'sin_gh' ? t('servidor.api.sinGh') : r.error === 'sin_sesion' ? t('servidor.api.sesionGhNoEsta') : t('servidor.api.ghFallo', { error: r.error ?? '' }) });
            await anotar(raiz, { quien: yo.nombre, que: tb('bitacora.dejaActivaSesion', { nombre: String(nombre) }), desde: tb('bitacora.desde.usarEsta'), proyecto: id });
            // Sin cuenta aprobada en este proyecto, la que se elige aquí queda como la suya (nmwagmiditit)
            const aprobada = cuentaQueApruebaUsar((await leerLocal(raiz)).cuentasGit?.[id], nombre);
            if (aprobada) {
              await guardarCuentaGit(raiz, id, aprobada);
              await anotar(raiz, { quien: yo.nombre, que: tb('bitacora.aprobaCuenta', { cuenta: aprobada }), desde: tb('bitacora.desde.usarEstaSinCuenta'), proyecto: id });
            }
            return responder(res, 200, { ok: true, aprobada });
          }
          // «Entrar con otra cuenta»: gh auth login --web, con su código de un solo uso y su dirección
          if (ruta === '/cuenta-git/entrar' && req.method === 'POST') {
            const yo = await leerIdentidad(raiz, id);
            if (yo.rol !== 'titular') return responder(res, 403, { error: yo.problema ?? t('servidor.api.cuentaGitSoloTitular') });
            const e = await entrarConGh();
            if (e.estado === 'fallo') return responder(res, 400, { error: e.error === 'sin_gh' ? t('servidor.api.sinGh') : t('servidor.api.ghFallo', { error: e.error ?? '' }) });
            await anotar(raiz, { quien: yo.nombre, que: tb('bitacora.empiezaEntrarGh'), desde: tb('bitacora.desde.entrarOtraCuenta'), proyecto: id });
            return responder(res, 200, { entrada: e });
          }
          // «Retomarla» de una aclaración o una urgencia que no se cerró (pr_retoma_automatica, punto 5): la misma, pedida otra
          // vez por quien oprime el botón, y el director retoma lo que esa dejó. No es una revisión: solo esa aclaración o esas notas
          if (ruta === '/retomar-aparte' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const yo = await leerIdentidad(raiz, id);
            if (!yo.rol) return responder(res, 403, { error: yo.problema ?? t('servidor.api.estudioNoSabeQuien') });
            const tipo = cuerpo.tipo === 'aclaracion' || cuerpo.tipo === 'urgencia' ? cuerpo.tipo : null;
            if (!tipo) return responder(res, 400, { error: t('servidor.api.soloAclaracionOUrgente') });
            const nueva = await retomarAparte(raiz, id, tipo, yo.nombre);
            if (!nueva) return responder(res, 400, { error: tipo === 'urgencia' ? t('servidor.api.nadaUrgente') : t('servidor.api.nadaAclarar') });
            await anotar(raiz, { quien: yo.nombre, que: tipo === 'urgencia' ? tb('bitacora.retomaUrgencia') : tb('bitacora.retomaAclaracion', { paso: (nueva as AclaracionPedida).paso + 1, mision: (nueva as AclaracionPedida).mision }), desde: tb('bitacora.desde.retomarla'), proyecto: id });
            void revisor?.mirar(true).catch(() => {});
            const l = await leerLocal(raiz);
            return responder(res, 200, { aclaracion: l.aclaracion?.proyecto === id ? l.aclaracion : null, urgencia: l.urgencia?.proyecto === id ? l.urgencia : null });
          }
          // «Detener ahora» (pr_procesos_vista, punto 3; tu decisión del 26 de octubre de 2026): el Studio le pide al director
          // que corre cerrar con lo hecho y, si en tres minutos no cerró, lo corta
          // «Respaldar ahora», en la ventana de la línea del último respaldo (nmwf5n02utit): sube la memoria ya, con las mismas
          // condiciones que el respaldo de cada revisión (privado, con el permiso de subir, sin forzar ni traer)
          if (ruta === '/respaldar' && req.method === 'POST') {
            const r = await respaldoDe(id).respaldar();
            await anotar(raiz, { quien: EL_STUDIO, que: r.fase === 'al_dia' ? tb('bitacora.respaldaMemoria', { destino: r.destino ?? '', rama: r.rama ?? '' }) : tb('bitacora.noRespaldaMemoria', { motivo: r.motivo ?? r.causa ?? '', detalle: r.detalle ? ` (${r.detalle})` : '' }), desde: tb('bitacora.desde.respaldarAhora'), proyecto: id }).catch(() => undefined);
            return responder(res, 200, { respaldo: r });
          }
          if (ruta === '/detener' && req.method === 'POST') {
            const yo = await leerIdentidad(raiz, id);
            if (!yo.rol) return responder(res, 403, { error: yo.problema ?? t('servidor.api.estudioNoSabeQuien') });
            if (!revisor) return responder(res, 400, { error: t('servidor.api.noLlamaAlDirector') });
            const r = revisor.detenerAhora(id, yo.nombre);
            if (!r.ok) return responder(res, 400, { error: r.error });
            if (r.ya) return responder(res, 200, { revisor: revisor.estado(id) });
            await anotar(raiz, { quien: yo.nombre, que: tb('bitacora.pideCerrar'), desde: tb('bitacora.desde.detenerAhora'), proyecto: id });
            return responder(res, 200, { revisor: revisor.estado(id) });
          }
          // Pedir la revisión del director (o cancelarla mientras no empiece): una marca en este computador, fuera de git
          if (ruta === '/revision' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const yo = await leerIdentidad(raiz, id);
            if (!yo.rol) return responder(res, 403, { error: yo.problema ?? t('servidor.api.estudioNoSabeQuien') });
            const actual = revisionDe(await leerLocal(raiz), id);
            if ((actual?.enCurso || actual?.lanzada) && !actual.hecha) return responder(res, 400, { error: t('servidor.api.directorYaEmpezo') });
            // Pedirla exige el botón que la nombra; cancelarla, no
            if (cuerpo.pedir && !esOrigenRevision(cuerpo.origen)) return responder(res, 400, { error: t('servidor.api.revisionSoloConBoton') });
            // Ni junto a la medición del núcleo, que gasta del mismo límite de la cuenta
            if (cuerpo.pedir && midiendo()) return responder(res, 400, { error: t('servidor.api.seEstaMidiendo') });
            return responder(res, 200, { revision: await pedirYLanzar(id, cuerpo.pedir ? yo.nombre : null, cuerpo.pedir ? cuerpo.origen : undefined, yo.nombre) });
          }
          // «No lo entiendo, explícamelo mejor»: la nota de ese paso, sin escribir nada, y el director solo para eso (una
          // ida y vuelta corta, sin esperar el resto de la revisión). Sin quién lo llame, la nota espera la revisión
          if (ruta === '/aclarar' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const deOtro = proyectoDeOtro(cuerpo, id);
            if (deOtro) return responder(res, 409, { error: t('servidor.api.proyectoNoEsElActivo', { otro: deOtro, activo: id }) });
            const yo = await leerIdentidad(raiz, id);
            if (!yo.rol) return responder(res, 403, { error: yo.problema ?? t('servidor.api.estudioNoSabeQuien') });
            const local = await leerLocal(raiz);
            const r = revisionDe(local, id);
            if (r?.proyecto === id && (r.enCurso || r.lanzada) && !r.hecha) return responder(res, 400, { error: t('servidor.api.directorRevisando') });
            const a = local.aclaracion;
            if (a && !a.hecha && !a.error) return responder(res, 400, { error: t('servidor.api.directorAclarando') });
            const plan = await leerPlan(id);
            const m = plan.misiones?.find((x) => x.id === String(cuerpo.mision ?? ''));
            const paso = Number(cuerpo.paso);
            if (!m || !Number.isInteger(paso) || paso < 0 || paso >= m.pasos.length) return responder(res, 400, { error: t('servidor.api.pasoYaNoEsta') });
            if (m.para !== yo.rol) return responder(res, 400, { error: t('servidor.api.soloQuienExplica') });
            const proyectoAntes = await leerProyecto(id);
            const veces = aclaracionesDe((await leerEstado(id, yo.rol, proyectoAntes)).estado.notas, m.id, paso).length;
            const texto = veces ? `Aún no lo entiendo, detállalo más (es la ${veces + 1}.ª vez que lo pido).` : 'No lo entiendo, explícamelo mejor.';
            const sobre = { tipo: 'mision', id: m.id, seccion: seccionPaso(paso), aclarar: true };
            const { estado, proyecto, queBitacora, archivos } = await enFila(() => decidir(id, { tipo: 'comentar', sobre, texto }, yo as Identidad & { rol: Persona }));
            programarCommit(id, yo.nombre, () => `${queBitacora()}: does not understand step ${paso + 1} of «${m.titulo}»`, archivos);
            const nota = aclaracionesDe(estado.notas, m.id, paso).at(-1)!;
            const aclaracion = await pedirAclaracion(raiz, { proyecto: id, mision: m.id, paso, nota: nota.id, quien: yo.nombre });
            await anotar(raiz, { quien: yo.nombre, que: tb('bitacora.pideExplicar', { paso: pasoEnLinea(seccionPaso(paso)), titulo: m.titulo, veces: veces ? tb('bitacora.vezN', { n: veces + 1 }) : '' }), desde: tb('bitacora.desde.noLoEntiendo', { mision: m.id, paso: pasoEnLinea(seccionPaso(paso), true) }), proyecto: id });
            await revisor?.mirar(true).catch(() => {});
            // Si el Studio no pudo llamar al director, la aclaración quedó con su error y la revisión pedida
            const despues = await leerLocal(raiz);
            const fallo = despues.aclaracion?.nota === aclaracion.nota && !!despues.aclaracion.error;
            return responder(res, 200, { estado, proyecto, aclaracion: fallo ? null : despues.aclaracion, ...(fallo ? { revision: revisionDe(despues, id) ?? null } : {}) });
          }
          // «Ya lo hice: compruébalo tú» (propuesta aceptada pr_verificar_paso): un paso de afuera, ya marcado por la página;
          // la nota de ese paso y el director solo para comprobarlo, por el camino de la aclaración. Sin quién lo llame, la
          // nota espera la revisión que pida la persona (el Studio nunca la pide solo)
          if (ruta === '/comprobar-paso' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const deOtro = proyectoDeOtro(cuerpo, id);
            if (deOtro) return responder(res, 409, { error: t('servidor.api.proyectoNoEsElActivo', { otro: deOtro, activo: id }) });
            const yo = await leerIdentidad(raiz, id);
            if (!yo.rol) return responder(res, 403, { error: yo.problema ?? t('servidor.api.estudioNoSabeQuien') });
            const local = await leerLocal(raiz);
            const r = revisionDe(local, id);
            if (r?.proyecto === id && (r.enCurso || r.lanzada) && !r.hecha) return responder(res, 400, { error: t('servidor.api.revisandoPasoMarcado') });
            const a = local.aclaracion;
            if (a && !a.hecha && !a.error) return responder(res, 400, { error: t('servidor.api.atendiendoOtroPaso') });
            const plan = await leerPlan(id);
            const m = plan.misiones?.find((x) => x.id === String(cuerpo.mision ?? ''));
            const paso = Number(cuerpo.paso);
            if (!m || !Number.isInteger(paso) || paso < 0 || paso >= m.pasos.length) return responder(res, 400, { error: t('servidor.api.pasoYaNoEsta') });
            if (m.para !== yo.rol) return responder(res, 400, { error: t('servidor.api.soloQuienComprueba') });
            if (!seMarcaAMano(m.pasos[paso])) return responder(res, 400, { error: t('servidor.api.pasoLoComprueboElStudio') });
            const sobre = { tipo: 'mision', id: m.id, seccion: seccionPaso(paso), comprobar: true };
            const { estado, proyecto, queBitacora, archivos } = await enFila(() => decidir(id, { tipo: 'comentar', sobre, texto: 'Ya lo hice: compruébalo tú.' }, yo as Identidad & { rol: Persona }));
            programarCommit(id, yo.nombre, () => `${queBitacora()}: asks to check step ${paso + 1} of «${m.titulo}»`, archivos);
            const nota = comprobacionesDe(estado.notas, m.id, paso).at(-1)!;
            const comprobacion = await pedirAclaracion(raiz, { proyecto: id, mision: m.id, paso, nota: nota.id, quien: yo.nombre, comprobar: true });
            await anotar(raiz, { quien: yo.nombre, que: tb('bitacora.pideComprobar', { paso: pasoEnLinea(seccionPaso(paso)), titulo: m.titulo }), desde: tb('bitacora.desde.yaLoHice', { mision: m.id, paso: pasoEnLinea(seccionPaso(paso), true) }), proyecto: id });
            await revisor?.mirar(true).catch(() => {});
            const despues = await leerLocal(raiz);
            const fallo = despues.aclaracion?.nota === comprobacion.nota && !!despues.aclaracion.error;
            return responder(res, 200, { estado, proyecto, aclaracion: fallo ? null : despues.aclaracion });
          }
          // El atajo de un paso a la aplicación local del proyecto (pedido pd_acceso_directo): la dirección sale del plan,
          // nunca de la petición, y pasa los tres candados antes de enlazar a la puerta (nmwejhse4tit): solo a una
          // dirección de este computador, solo para una petición de esta misma máquina y solo con el archivo interruptor.
          // «/atajo/vivo» solo dice si la aplicación responde, para «Arranca <proyecto> primero» (nmwf5tf1stit)
          // «/qa»: la pestaña de QA del proyecto (pd_pestana_qa, primer tramo), con los mismos candados que «/atajo»
          if ((ruta === '/atajo' || ruta === '/atajo/vivo' || ruta === '/qa') && req.method === 'GET') {
            const q = new URL(req.url ?? '', 'http://localhost').searchParams;
            const m = (await leerPlan(id)).misiones?.find((x) => x.id === (q.get('mision') ?? ''));
            const p = m?.pasos[Number(q.get('paso'))];
            const atajo = p && typeof p !== 'string' ? p.atajo : undefined;
            const vivo = ruta === '/atajo/vivo';
            // El director flotante de la pestaña de QA (segundo tramo): el paso que la abrió y a dónde va su nota
            // y la vista de dispositivo en que abre, si el paso la dice en su atajo o en su botón a la página pública
            // (pd_qa_vista_dispositivo, nmwppzjq0tit): sale del plan, nunca de la petición
            const dispositivoDelPaso = p && typeof p !== 'string' ? (p.atajo?.dispositivo ?? p.ir?.dispositivo) : undefined;
            const directorQa = (): DirectorQa => ({
              proyecto: id, mision: m!.id, paso: Number(q.get('paso')),
              textos: {
                paso: t('qa.paso', { n: Number(q.get('paso')) + 1, titulo: m!.titulo }),
                nota: t('qa.nota'), captura: t('qa.captura'), volver: t('qa.volver'),
                plegar: t('qa.plegar'), desplegar: t('qa.desplegar'), mover: t('qa.mover'),
                dispositivos: t('qa.dispositivos'), escritorio: t('qa.disp.escritorio'), tableta: t('qa.disp.tableta'), telefono: t('qa.disp.telefono'), avisoDispositivo: t('qa.avisoDispositivo'),
              },
              ...(esDispositivoQa(dispositivoDelPaso) ? { dispositivo: dispositivoDelPaso } : {}),
            });
            // La página pública de STL, en la estación que nombra el paso, también abre en la pestaña de QA (nmwpc43ottit,
            // la publicada: nmwpkja4dtit). La dirección sale del plan, nunca de la petición, y solo para este computador
            const recorrido = ruta === '/qa' && !atajo && p && typeof p !== 'string' && p.ir?.url && esPaginaDelStudio(p.ir.url) ? p.ir.url : null;
            if (recorrido) {
              if (!esPeticionLocal(req.socket.remoteAddress)) return responder(res, 403, { error: t('servidor.api.atajo.deAfuera') });
              await idiomaDeEsteComputador(raiz);
              // Cada carga, con su marca antes del #: se pide entera, nunca de la caché (nmwpu4fgxtit)
              res.writeHead(200, CABECERAS_QA);
              return res.end(paginaQa({ puerta: marcaSinCache(recorrido, Date.now().toString(36)), idioma: idiomaActual(), rehusa: false, textos: { titulo: t('qa.titulo', { nombre: 'STL' }), rehusa: '', abrirAqui: '' }, director: directorQa() }));
            }
            const repo = vivo ? null : await leerRutaRepositorio(raiz, id);
            const falla = candadosDelAtajo({ atajo, direccion: req.socket.remoteAddress, ...(vivo ? {} : { interruptor: !!repo && existsSync(join(repo, INTERRUPTOR_PUERTA)) }) });
            const codigo = falla === 'deAfuera' ? 403 : 400;
            if (vivo) return falla || !atajo ? responder(res, codigo, { error: t(`servidor.api.atajo.${falla ?? 'sinAtajo'}`) }) : responder(res, 200, { vivo: await respondeEnLocal(atajo.url) });
            if (falla || !atajo) {
              // La pestaña del atajo muestra por qué no se abrió, en palabras
              res.writeHead(codigo, { 'Content-Type': 'text/html; charset=utf-8' });
              return res.end(`<!doctype html><meta charset="utf-8"><title>STL Studio</title><p style="font:16px system-ui;margin:40px">${t(`servidor.api.atajo.${falla ?? 'sinAtajo'}`).replace(/[<>&]/g, '')}</p>`);
            }
            if (ruta === '/qa') {
              // La aplicación, por su puerta, en un marco que llena la pestaña; si sus cabeceras rehúsan el marco, como
              // antes, con un aviso (pestana-qa.md › 7)
              await idiomaDeEsteComputador(raiz);
              const nombre = (await leerProyecto(id).catch(() => null))?.nombre || id;
              const cabeceras = await cabecerasEnLocal(atajo.url);
              const rehusa = !!cabeceras && rehusaElMarco(cabeceras, new URL(atajo.url).origin, `http://${req.headers.host ?? 'localhost'}`);
              // La marca va en la página a la que lleva la puerta, la que se muestra: se pide entera (nmwpu4fgxtit)
              res.writeHead(200, CABECERAS_QA);
              return res.end(paginaQa({ puerta: direccionDeLaPuerta({ ...atajo, url: marcaSinCache(atajo.url, Date.now().toString(36)) }), idioma: idiomaActual(), rehusa, textos: { titulo: t('qa.titulo', { nombre }), rehusa: t('qa.rehusa', { nombre }), abrirAqui: t('qa.abrirAqui') }, director: directorQa() }));
            }
            res.writeHead(302, { Location: direccionDeLaPuerta(atajo), 'Cache-Control': CABECERAS_QA['Cache-Control'], Pragma: 'no-cache', Expires: '0' });
            return res.end();
          }
          // La nota del director flotante de la pestaña de QA (nmwp9inuqtit): al Buzón del proyecto que abrió la pestaña,
          // aunque el activo haya cambiado, como un comentario sobre el paso que la abrió, con la página en su primera línea
          if (ruta === '/qa/nota' && req.method === 'POST') {
            if (!esPeticionLocal(req.socket.remoteAddress)) return responder(res, 403, { error: t('servidor.api.atajo.deAfuera') });
            const cuerpo = await leerCuerpo(req);
            const pid = typeof cuerpo.proyecto === 'string' && (await listarIds()).includes(cuerpo.proyecto) ? cuerpo.proyecto : null;
            if (!pid) return responder(res, 404, { error: t('servidor.api.proyectoNoEsta') });
            // La primera línea dice la página y, en tableta o teléfono, la vista y su tamaño (nmwppyi02tit)
            const nota = notaDeQa(cuerpo, (pagina, d) => {
              const tam = d ? TAMANOS_QA[d] : null;
              return d && tam ? t('qa.notaDesdeDispositivo', { pagina, dispositivo: t(`qa.dispEnNota.${d}`), ancho: tam.ancho, alto: tam.alto }) : t('qa.notaDesde', { pagina });
            });
            const m = nota && (await leerPlan(pid)).misiones?.find((x) => x.id === nota.sobre.id);
            if (!nota || !m || Number(cuerpo.paso) >= m.pasos.length) return responder(res, 400, { error: t('servidor.api.pasoYaNoEsta') });
            const yo = await leerIdentidad(raiz, pid);
            if (!yo.rol) return responder(res, 403, { error: yo.problema ?? t('servidor.api.estudioNoSabeQuien') });
            const { proyecto, queBitacora, queTb, archivos, audios } = await enFila(() => decidir(pid, nota, yo as Identidad & { rol: Persona }));
            programarCommit(pid, yo.nombre, () => `${queBitacora()}, from the QA tab`, archivos);
            // A la bitácora, como cualquier nota dejada en el Studio
            await anotarEnSuIdioma(raiz, () => eventoDeAccion(nota, yo.nombre, queTb(), pid));
            // Lo grabado se transcribe como el de cualquier nota, y el Studio abierto la muestra sola en su Buzón (nmwpmgesctit)
            transcribirLuego(pid, audios, `Notas para el director del proyecto ${proyecto.nombre || pid}.`);
            server.ws.send({ type: 'custom', event: EVENTO_NOTA_QA, data: { proyecto: pid } });
            return responder(res, 200, {});
          }
          // «Abrir la terminal con esta orden»: la orden sale del plan (del paso que se nombra), nunca de la petición; con
          // `arranque`, la que arranca la aplicación del atajo del paso
          if (ruta === '/terminal' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const yo = await leerIdentidad(raiz, id);
            if (!yo.rol) return responder(res, 403, { error: yo.problema ?? t('servidor.api.estudioNoSabeQuien') });
            const m = (await leerPlan(id)).misiones?.find((x) => x.id === String(cuerpo.mision ?? ''));
            const p = m?.pasos[Number(cuerpo.paso)];
            const orden = p && typeof p !== 'string' ? (cuerpo.arranque === true ? p.atajo?.arranque : p.terminal) : undefined;
            if (!m || !orden) return responder(res, 400, { error: t('servidor.api.pasoSinOrden') });
            if (m.para !== yo.rol) return responder(res, 400, { error: t('servidor.api.soloQuienTerminal') });
            const r = await abrirTerminal(orden, (await leerRutaRepositorio(raiz, id)) ?? homedir());
            const paso = seccionPaso(Number(cuerpo.paso));
            await anotar(raiz, { quien: yo.nombre, que: r.ok ? tb('bitacora.abreTerminalPaso', { paso: pasoEnLinea(paso), titulo: m.titulo, orden }) : tb('bitacora.noAbreTerminalPaso', { paso: pasoEnLinea(paso), titulo: m.titulo, error: r.error ?? '' }), desde: tb('bitacora.desde.abrirTerminalPaso', { mision: m.id, paso: pasoEnLinea(paso, true) }), proyecto: id });
            return r.ok ? responder(res, 200, {}) : responder(res, 400, { error: r.error });
          }
          // La orden del paso, a escondidas en este servidor (terminalOculta.ts; pd_sin_terminal): el clic es el permiso, la
          // orden sale del plan, y con `siempre` («Siempre, en este proyecto» o «en todos») queda en «Permisos», en la misma
          // lista del director; subir, traer y publicar, solo en este proyecto (nmwpsoraqtit)
          if (ruta === '/terminal/correr' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const yo = await leerIdentidad(raiz, id);
            if (!yo.rol) return responder(res, 403, { error: yo.problema ?? t('servidor.api.estudioNoSabeQuien') });
            const m = (await leerPlan(id)).misiones?.find((x) => x.id === String(cuerpo.mision ?? ''));
            const p = m?.pasos[Number(cuerpo.paso)];
            const orden = p && typeof p !== 'string' ? p.terminal : undefined;
            if (!m || !orden) return responder(res, 400, { error: t('servidor.api.pasoSinOrden') });
            if (m.para !== yo.rol) return responder(res, 400, { error: t('servidor.api.soloQuienTerminal') });
            if (ordenNunca(orden)) return responder(res, 400, { error: t('servidor.api.ordenNunca') });
            const local = await leerLocal(raiz);
            const carpeta = (await leerRutaRepositorio(raiz, id)) ?? homedir();
            // Un tipo de orden que ya pidió escribir se abre directo en una ventana (nmwqkn8m1tit)
            if (vaEnVentana(orden, local.enVentana ?? [], id)) {
              const r = await abrirTerminal(orden, carpeta);
              return r.ok ? responder(res, 200, { enVentana: true }) : responder(res, 400, { error: r.error });
            }
            const ya = yaAutorizada(orden, local.permisos?.autorizados ?? [], id);
            const siempre = cuerpo.siempre === 'proyecto' || cuerpo.siempre === 'todos' ? cuerpo.siempre : null;
            const regla = siempre && !ya ? reglaParaSiempre(orden, homedir()) : null;
            if (regla) {
              const nuevo = permisoDeSiempre(regla, siempre!, id, yo.nombre, new Date().toISOString());
              await cambiarAutorizados(raiz, (antes) => (antes.some((a) => a.regla === nuevo.regla && a.alcance === nuevo.alcance && a.proyecto === nuevo.proyecto) ? antes : [...antes, nuevo]));
            }
            const corrida = await corridasOcultas.iniciar({ proyecto: id, mision: m.id, paso: Number(cuerpo.paso), orden, carpeta });
            const paso = seccionPaso(Number(cuerpo.paso));
            await anotar(raiz, { quien: yo.nombre, que: tb('bitacora.correOrdenPaso', { paso: pasoEnLinea(paso), titulo: m.titulo, orden }), desde: tb('bitacora.desde.abrirTerminalPaso', { mision: m.id, paso: pasoEnLinea(paso, true) }), proyecto: id });
            return responder(res, 200, { corrida, yaAutorizada: ya || !!regla });
          }
          // Antes de correr la orden de un paso: si su tipo de acción ya tiene «Siempre», si es crítica (su línea va antes)
          // y si ya se marcó para abrirse en una ventana. La primera vez, el paso pregunta «Hazlo ahora», «Hazlo ahora, y
          // siempre en este proyecto» o «No» (sin-terminal.md › 5)
          if (ruta === '/terminal/consultar' && req.method === 'GET') {
            const m = (await leerPlan(id)).misiones?.find((x) => x.id === (url.searchParams.get('mision') ?? ''));
            const p = m?.pasos[Number(url.searchParams.get('paso'))];
            const orden = p && typeof p !== 'string' ? p.terminal : undefined;
            if (!m || !orden) return responder(res, 400, { error: t('servidor.api.pasoSinOrden') });
            if (ordenNunca(orden)) return responder(res, 400, { error: t('servidor.api.ordenNunca') });
            const local = await leerLocal(raiz);
            const carpeta = (await leerRutaRepositorio(raiz, id)) ?? homedir();
            return responder(res, 200, { orden, carpeta, ya: yaAutorizada(orden, local.permisos?.autorizados ?? [], id), critica: esCritica(orden, homedir()), seRecuerda: !!reglaParaSiempre(orden, homedir()), enVentana: vaEnVentana(orden, local.enVentana ?? [], id) });
          }
          // Cómo van las órdenes de todo este Studio, cada una con su proyecto: la línea de arriba las cuenta todas, estés en
          // el proyecto que estés (nmwpz3b9ctit, nmwqknqadtit)
          if (ruta === '/terminal/corridas' && req.method === 'GET') {
            const corridas = corridasOcultas.todas();
            const nombres: Record<string, string> = {};
            for (const c of corridas) nombres[c.proyecto] ??= (await leerProyecto(c.proyecto).catch(() => null))?.nombre || c.proyecto;
            return responder(res, 200, { corridas, enMarcha: corridasOcultas.enMarcha(), nombres });
          }
          // «Darle 10 minutos más» y «Detener» (el límite mixto, nmwpz4vnbtit), de cualquier proyecto: la línea las muestra todas
          if ((ruta === '/terminal/mas-tiempo' || ruta === '/terminal/detener') && req.method === 'POST') {
            const cid = String((await leerCuerpo(req)).id ?? '');
            const c = corridasOcultas.estado(cid);
            if (!c) return responder(res, 404, { error: t('servidor.api.corridaNoEsta') });
            const yo = await leerIdentidad(raiz, c.proyecto);
            if (!yo.rol) return responder(res, 403, { error: yo.problema ?? t('servidor.api.estudioNoSabeQuien') });
            const hecho = ruta === '/terminal/detener' ? corridasOcultas.detener(cid) : corridasOcultas.masTiempo(cid);
            return responder(res, 200, { hecho, corrida: corridasOcultas.estado(cid) });
          }
          // «Me pide escribir: ábrela en una terminal» (nmwqkn8m1tit): la orden callada se detiene, su tipo queda marcado en
          // su proyecto para abrirse directo en una ventana, y se abre ya en una
          if (ruta === '/terminal/a-ventana' && req.method === 'POST') {
            const cid = String((await leerCuerpo(req)).id ?? '');
            const c = corridasOcultas.estado(cid);
            if (!c) return responder(res, 404, { error: t('servidor.api.corridaNoEsta') });
            const yo = await leerIdentidad(raiz, c.proyecto);
            if (!yo.rol) return responder(res, 403, { error: yo.problema ?? t('servidor.api.estudioNoSabeQuien') });
            corridasOcultas.aVentana(cid);
            const marca = marcaEnVentana(c.orden, c.proyecto, homedir(), new Date().toISOString());
            if (marca) await marcarEnVentana(raiz, marca);
            const r = await abrirTerminal(c.orden, (await leerRutaRepositorio(raiz, c.proyecto)) ?? homedir());
            await anotar(raiz, { quien: yo.nombre, que: tb('bitacora.ordenAVentana', { orden: c.orden }), desde: tb('bitacora.desde.ordenesEnMarcha'), proyecto: c.proyecto });
            return r.ok ? responder(res, 200, { marcada: !!marca }) : responder(res, 400, { error: r.error });
          }
          // Sumarle algo hablando a una nota que el director aún no lee (nota de voz del titular nmvonrzz6tit, 25 de
          // octubre de 2026; pedido pd_tipo_voz): el audio se transcribe en este computador y se devuelve su texto, que la
          // página suma a la nota al guardarla. El audio y su texto van a .estudio/, fuera de git, y se borran cuando su
          // texto salió; si no salió, el audio se queda
          // (con el modelo de voz ya cargado, transcripcion.ts: nmwgu0fmbtit)
          // Si el modelo de voz se está preparando (al volver de liberarse en un computador chico): la grabación lo dice
          // mientras espera (pd_voz_memoria, nmwj6jszhtit)
          if (ruta === '/modelo-voz' && req.method === 'GET') return responder(res, 200, { modeloVoz: modeloDeVoz() });
          if (ruta === '/dictar' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const yo = await leerIdentidad(raiz, id);
            if (!yo.rol) return responder(res, 403, { error: yo.problema ?? t('servidor.api.estudioNoSabeQuien') });
            const audio = enDisco(raiz, await guardarAudio(raiz, '.estudio/dictados', `d${Date.now().toString(36)}`, cuerpo.audio));
            // Mientras se transcribe, la revisión de este proyecto y el cambio de proyecto esperan (nmwdwg5yvtit)
            // La página guarda la nota con ese texto justo después: unos segundos más de espera, para que llegue antes que la
            // revisión pedida mientras tanto
            const soltar = notasEnCurso.empieza(id);
            const soltarLuego = () => void setTimeout(soltar, GRACIA_DICTADO_MS).unref?.();
            try {
              const r = await transcribirEnLocal(raiz, [audio], 'Nota para el director de un proyecto.').catch((e: unknown) => {
                soltarLuego();
                throw e;
              });
              soltarLuego();
              const texto = (transcripcionEnDisco(audio) ?? '').trim();
              // Con la razón, en la bitácora: sin ella no se sabía si falló Python o si el audio no tenía voz
              const razon = r.ok ? 'no se oyó voz' : r.error ?? 'sin detalle';
              await anotar(raiz, { quien: yo.nombre, que: texto ? tb('bitacora.transcribeNota') : tb('bitacora.noTranscribeNota', { razon }), desde: tb('bitacora.desde.corregirNotaGrabar'), proyecto: id });
              if (texto) {
                await rm(audio, { force: true });
                await rm(txtDeAudio(audio), { force: true });
                return responder(res, 200, { texto });
              }
              // Sin texto, el audio no se borra (nota de voz del titular nmw159ihdtit): se queda en .estudio/dictados,
              // fuera de git, y el diálogo sigue abierto con lo grabado para volver a intentarlo
              await rm(txtDeAudio(audio), { force: true });
              return responder(res, 400, { error: r.ok ? t('servidor.api.audioSinNada') : t('servidor.api.noSePudoTranscribir', { razon: r.error ?? t('servidor.api.sinRazon') }) });
            } catch (e) {
              return responder(res, 500, { error: (e as Error).message });
            }
          }
          // Comprobar un paso de terminal al marcarlo: la orden también sale del plan, y solo si es de las que leen
          if (ruta === '/comprobar' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const yo = await leerIdentidad(raiz, id);
            if (!yo.rol) return responder(res, 403, { error: yo.problema ?? t('servidor.api.estudioNoSabeQuien') });
            const m = (await leerPlan(id)).misiones?.find((x) => x.id === String(cuerpo.mision ?? ''));
            const p = m?.pasos[Number(cuerpo.paso)];
            const c = p && typeof p !== 'string' ? p.comprobar : undefined;
            if (!m || !c) return responder(res, 400, { error: t('servidor.api.pasoSinComprobacion') });
            if (m.para !== yo.rol) return responder(res, 400, { error: t('servidor.api.soloQuienComprobar') });
            const carpeta = await leerRutaRepositorio(raiz, id);
            if (!carpeta) return responder(res, 400, { error: t('servidor.api.sinCarpetaDelProyecto') });
            // La orden corre en este computador: a la bitácora, con lo que salió
            const comprobado = await comprobarPaso(c, carpeta);
            const paso = seccionPaso(Number(cuerpo.paso));
            await anotar(raiz, { quien: yo.nombre, que: tb('bitacora.compruebaPaso', { paso: pasoEnLinea(paso), titulo: m.titulo, orden: c.orden, resultado: comprobado.cumple ? tb('bitacora.seCumple') : tb('bitacora.noSeCumple') }), desde: tb('bitacora.desde.marcarPaso', { mision: m.id, paso: pasoEnLinea(paso, true) }), proyecto: id });
            return responder(res, 200, { ...comprobado, espera: /^\s*no\s+existe\s/.test(c.orden) ? 'que ya no estuviera' : /^\s*existe\s/.test(c.orden) ? 'que estuviera' : c.vacia ? 'que no saliera nada' : c.espera ? `que dijera «${c.espera}»` : 'que la orden terminara bien' });
          }
          // «Nota para el Studio» (nota nmwces6tytit): lo que se nota del Studio mientras se dirige otro proyecto va al Buzón
          // del proyecto del Studio mismo (el registrado cuya carpeta es esta), nunca al del activo. Es una nota normal, sin
          // urgencia: no llama al director ni pide revisión, y espera la revisión que se pida en ese proyecto
          if (ruta === '/nota-al-studio' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const local = await leerLocal(raiz);
            const studio = (await listarIds()).find((p) => !!local.repositorios[p] && esElStudio(raiz, local.repositorios[p])) ?? null;
            if (!studio) return responder(res, 404, { error: t('servidor.api.sinProyectoDelStudio') });
            if (studio === id) return responder(res, 400, { error: t('servidor.api.studioEsElActivo') });
            const yo = await leerIdentidad(raiz, studio);
            if (!yo.rol) return responder(res, 403, { error: yo.problema ?? t('servidor.api.estudioNoSabeQuien') });
            // Solo lo que lleva una nota general: sin urgencia ni lugar, aunque la petición los traiga. Dice desde qué
            // proyecto se escribió (nmwj6f4z3tit), en su primera línea, para que el director sepa en qué contexto se notó
            const desde = t('servidor.api.notaDesde', { nombre: (await leerProyecto(id)).nombre || id });
            const dicho = typeof cuerpo.texto === 'string' ? cuerpo.texto.trim() : '';
            const nota = {
              tipo: 'comentar', sobre: { tipo: 'general' }, texto: dicho ? `${desde}\n\n${dicho}` : desde, audio: cuerpo.audio, tipoNota: cuerpo.tipoNota,
              ...(Array.isArray(cuerpo.adjuntos) ? { adjuntos: cuerpo.adjuntos } : {}),
            };
            const { proyecto, que, queBitacora, queTb, archivos, audios } = await enFila(() => decidir(studio, nota, yo as Identidad & { rol: Persona }));
            programarCommit(studio, yo.nombre, () => `${queBitacora()}, with «Note for the Studio»`, archivos);
            await anotarEnSuIdioma(raiz, () => ({ quien: yo.nombre, que: tb('bitacora.notaSobreElStudio', { que: queTb() }), desde: tb('bitacora.desde.notaStudio'), proyecto: studio }));
            transcribirLuego(studio, audios, `Notas para el director del proyecto ${proyecto.nombre || studio}.`);
            return responder(res, 200, { studio, nombre: proyecto.nombre || studio });
          }
          if (ruta === '/accion' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const deOtro = proyectoDeOtro(cuerpo, id);
            if (deOtro) return responder(res, 409, { error: t('servidor.api.proyectoNoEsElActivo', { otro: deOtro, activo: id }) });
            // Mientras el director atiende una urgencia, lo que hace avanzar una misión espera a que termine: el ✉, los
            // documentos y sus decisiones siguen abiertos (pd_urgencia_bloquea; candadoUrgencia.ts)
            if (avanzaUnaMision(cuerpo) && urgenciaBloquea(((u) => (u?.proyecto === id ? u : null))((await leerLocal(raiz)).urgencia)))
              return responder(res, 409, { error: t('servidor.api.urgenciaBloquea') });
            const yo = await leerIdentidad(raiz, id);
            if (!yo.rol) return responder(res, 403, { error: yo.problema ?? t('servidor.api.estudioNoSabeQuien') });
            const { estado, proyecto, que, queBitacora, queTb, archivos, audios } = await enFila(() => decidir(id, cuerpo, yo as Identidad & { rol: Persona }));
            programarCommit(id, yo.nombre, queBitacora, archivos);
            // A la bitácora de este computador: qué hizo, desde dónde y quién (o el Studio, si la página lo hizo sola en su
            // nombre: `automatico`), para poder auditarlo (nota de voz del titular, 23 de octubre de 2026). La línea sale en el
            // idioma de la interfaz (pd_bitacora_idioma) y se arma con el idioma ya puesto; el commit sigue en castellano
            await anotarEnSuIdioma(raiz, () => eventoDeAccion(cuerpo, yo.nombre, queTb(), id));
            // Lo que la página ya transcribió al detener la grabación (nota del titular nmvsyxjd6tit, 28 de octubre de
            // 2026): su texto queda escrito y el audio se borra, sin transcribirlo otra vez
            const dictado = cuerpo.tipo === 'comentar' && typeof cuerpo.dictado === 'string' ? cuerpo.dictado.trim() : '';
            if (dictado && audios.length === 1 && existsSync(enDisco(raiz, audios[0])) && !existsSync(enDisco(raiz, txtDe(audios[0])))) {
              await writeFile(enDisco(raiz, txtDe(audios[0])), `${dictado}\n`, 'utf-8');
              borrarSiTranscrito(enDisco(raiz, audios[0]));
              programarCommit(id, yo.nombre, () => 'transcribes a voice note locally', [txtDe(audios[0])]);
              void anotar(raiz, { quien: EL_STUDIO, que: tb('bitacora.transcribioAlDetener'), desde: tb('bitacora.desde.transcripcionLocal'), proyecto: id });
            }
            transcribirLuego(id, audios, `Notas para el director del proyecto ${proyecto.nombre || id}.`);
            // Lo urgente va solo y al instante: el Studio llama al director para esas notas, sin el resto de la revisión.
            // Sin quién lo llame, las notas esperan en el Buzón: la revisión la pide la persona, con su botón (regla dura
            // del 23 de octubre de 2026; si dijo «Sí, dejarlo y pedir la revisión», la pide la página con ese origen)
            if (cuerpo.tipo === 'comentar' && que === 'deja una nota urgente para el director') {
              const respondidas = (await leerPlan(id)).respuestas ?? {};
              const notas = estado.notas.filter((n) => n.urgente && !respondidas[n.id]).map((n) => n.id);
              const urgencia = notas.length ? await pedirUrgencia(raiz, { proyecto: id, notas, quien: yo.nombre }) : null;
              // La nota ya quedó anotada como de la persona; llamar al director para ella lo hace el Studio
              if (urgencia) await anotar(raiz, { quien: EL_STUDIO, que: tb('bitacora.pideUrgente', { quien: yo.nombre }), desde: tb('bitacora.desde.marcarUrgente'), proyecto: id });
              if (urgencia && revisor) await revisor.mirar(true).catch(() => {});
              else if (urgencia) {
                await marcarUrgencia(raiz, urgencia.pedida, { error: t('revisor.noPuedeLlamar') });
                await anotar(raiz, { quien: EL_STUDIO, que: tb('bitacora.noPuedeLlamar'), desde: tb('bitacora.desde.marcarUrgente'), proyecto: id });
              }
              const local = await leerLocal(raiz);
              return responder(res, 200, { estado, proyecto, urgencia: local.urgencia?.proyecto === id ? local.urgencia : null, revision: revisionDe(local, id) ?? null });
            }
            return responder(res, 200, { estado, proyecto });
          }
          responder(res, 404, { error: t('servidor.api.rutaNoExiste') });
        } catch (e) {
          if (e instanceof Rechazo) return responder(res, 400, { error: e.message });
          responder(res, 500, { error: String(e) });
        }
      });
    },
  };
}
