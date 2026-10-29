// El Director asistente en el servidor local (solo con `npm run estudio`).
//
// Un Estudio, varios proyectos (src/director/proyectos.ts): la memoria de cada uno (su contexto, su ruta, su buzón y su
// historial) vive en SU repositorio, en la carpeta .stl/ (rama stl), y aquí se nombra proyectos/<id>/…. El Estudio solo
// guarda su código y estudio.local.json (el proyecto activo y la carpeta de cada repositorio, fuera de git). Todo lo que
// muestra y decide el Estudio es del proyecto activo de este computador. Cada Estudio escribe solo el archivo de su
// persona en ese proyecto (y la transcripción de sus audios: el audio nunca entra a git y se borra apenas su texto queda
// escrito) y el titular, además, lo del proyecto (proyecto.json). Cada decisión queda en un
// commit local en la memoria del proyecto y, si el titular activó la sincronización, sube sola a GitHub
// (sincronizar.ts). Lo de las otras personas, la ruta y las respuestas del director (plan.json, que escribe la sesión del
// director), las transcripciones y los documentos se leen de donde estén más nuevos (src/director/fresco.ts). Del
// repositorio del proyecto, fuera de su memoria, el Studio solo lee.
//
// GET /__estudio/director: el proyecto activo (su ruta, su estado, su repositorio, sus señales) y el resumen de todos.
// GET /documentos y /documento?ruta=docs/…|repo:…: para leer y comentar. GET /archivo?ruta=proyectos/…/notas/…: un
// audio (mientras no se haya transcrito) o un adjunto de una nota. POST /proyecto-nuevo: abre la memoria en el repositorio, crea el proyecto desde la plantilla (o retoma el que ya
// tenía) y lo activa. POST /proyectos-varios: lo mismo con varios. POST /activo: cambia el proyecto activo. POST
// /repositorio: la carpeta nueva del repositorio del proyecto activo, si se movió (debe tener su memoria).
// POST /accion: una decisión firmada con la identidad de git del clon, en el proyecto activo. GET /sonidos y
// /sonido?nombre=x.mp3: los sonidos del Studio, en estudio/sonidos (sonidos.ts). GET /paquete?registro=…&parte=encargo|bandeja:
// lo que recibió al empezar un lanzamiento del director, como texto (src/director/paquete.ts).
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { contenerRecargas, EVENTO_RECARGA } from './recarga.ts';
import { esRegistro, MAX_BYTES as MAX_BYTES_VER, paginaDeArchivo, paginaDeError, POLITICA as POLITICA_VER, rutaPermitida } from './verArchivo.ts';
import { leerCandado, otroServidor, soltarCandado, tomarCandado, yaEncendido } from './unico.ts';
import {
  aclaracionesDe,
  agendaDe,
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
  TIPOS_VALIDACION,
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
  type TipoValidacion,
  type Validacion,
} from '../../src/director/director.ts';
import { leerFresco, leerFrescosTexto, leerFrescoTexto, listarRemoto, Traedor } from '../../src/director/fresco.ts';
import { leerEstadoDelEquipo, leerPlanParaVer, leerPlanUnido, leerProyectoDe } from '../../src/director/memoria.ts';
import { medidaPorRevision } from '../../src/director/historial.ts';
import { leerLineasDeRevision } from '../../src/director/lineasDeRevision.ts';
import { abrirMemoria, anotarAjustesVistos, cambiarAutorizados, crearProyecto, elegirActivo, enDisco, escribirDeUnaVez, esModoPermisos, esOrigenRevision, guardarActivo, guardarAjustesPropios, guardarEsfuerzoMaximo, guardarModoPermisos, guardarPermiso, guardarPlanDeClaude, guardarRutaRepositorio, idDeNombre, leerLocal, leerRutaRepositorio, marcarUrgencia, memoriaDe, ORIGENES_REVISION, pararSeguidas, seguidasActivas, retomarAparte, planCambiadoTrasCierre, guardarTodoConElModelo, type AclaracionPedida, empezarSeguidas, pedirAclaracion, pedirRevision, pedirUrgencia, proyectosLocales, RAMA, rutasDe, ubicar, type OrigenRevision } from '../../src/director/proyectos.ts';
import { anotar, EL_STUDIO, eventoDeAccion, leerBitacora } from '../../src/director/bitacora.ts';
import { archivoDelPaquete } from '../../src/director/paquete.ts';
import { comprobarRepositorio, gitEn, leerDelRepositorio, type InfoRepositorio } from '../../src/director/repositorio.ts';
import { borrarSiTranscrito, quitarSiVacia, transcribirEnLocal, transcripcionEnDisco, txtDeAudio } from '../../src/director/transcripcion.ts';
import { escanear, fuentesDeEscaneo } from './escaneo.ts';
import { clavesDeTusAjustes, conMaximo, guardarEsfuerzoClaude, guardarModeloClaude, guardarUltracodeClaude, leerAjustesClaude } from './ajustesClaude.ts';
import { conNuevas, opcionesDeTusAjustes, recomendadas } from './ajustesPropios.ts';
import { POR_QUE_SIN_AUTOMATICO } from './modoPermisos.ts';
import { actividadDeProyecto, agruparPasos, automaticoDisponible, enCursoDeProyecto, automaticoSabido, buscarClaude, lanzamientosDelDirector, negadosDelDirector, negadosDeProyecto, ordenAbrirClaude, planDeProyecto, progresoDeProyecto, Revisor, tokensDeProyecto } from './revisor.ts';
import { corridasGuardadas, detenerMedicion, empezarMedicion, estadoDeMedicion, guardarAcuerdo, midiendo } from './medidor.ts';
import { ALCANCES, casosDelAlcance, casosMedibles, type Alcance } from '../../src/director/corrida.ts';
import { esPlanDeClaude, PLANES_DE_CLAUDE, type PlanDeClaude } from '../../src/director/costoDelPlan.ts';
import { revisarPedido, sinAutorizar, valePara } from './permisosNegados.ts';
import { queAnotarDeLaLlamada, queAnotarDeLaRespuesta, respuestaValida } from './permisoAlMomento.ts';
import { decidirParaElGancho, permisosEnEspera } from './permisosEnEspera.ts';
import { correrGit, leerIdentidad, olvidarIdentidad, Sincronizador, type Identidad } from './sincronizar.ts';
import { abrirTerminal, comprobarPaso } from './terminal.ts';
import { leerSonido, leerSonidos } from './sonidos.ts';
import { atenderVoz } from './voz.ts';
import { MAX_AUDIO, MAX_CUERPO, MAX_NOMBRE_ARCHIVO, Rechazo, textoDe } from './topes.ts';

const DIAS_ESFUERZO = 7;
const ESPERA_COMMIT_MS = 15_000;
const CACHE_MS = 60_000;
const MAX_DOCS_REPO = 400;
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
    if (datos.length > MAX_CUERPO) throw new Rechazo(`El envío pesa más de ${Math.round(MAX_CUERPO / 1024 / 1024)} MB, lo más que recibe el Studio de una vez: manda el audio o los adjuntos en notas aparte.`);
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
  if (!m) throw new Rechazo('El audio debe ser WebM, Ogg o MP4.');
  const bytes = Buffer.from(m[2], 'base64');
  if (bytes.length > MAX_AUDIO) throw new Rechazo(`El audio pesa más de ${MAX_AUDIO / 1024 / 1024} MB: grábalo en partes.`);
  if (bytes.length < 64) throw new Rechazo('El audio está vacío.');
  const firma = bytes.subarray(0, 12);
  const tipo = m[1];
  const valido = tipo === 'webm' ? firma.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
    : tipo === 'ogg' ? firma.toString('latin1', 0, 4) === 'OggS'
    : tipo === 'mpeg' ? firma.toString('latin1', 0, 3) === 'ID3' || firma[0] === 0xff
    : firma.toString('latin1', 4, 8) === 'ftyp';
  if (!valido) throw new Rechazo('El archivo no es el audio que dice ser.');
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
  if (!m) throw new Rechazo('Un adjunto llegó dañado: vuelve a adjuntarlo.');
  const bytes = Buffer.from(m[1], 'base64');
  // Entero: cortado, perdería su extensión y una imagen ya no se vería como imagen
  const nombre = textoDe(a.nombre, MAX_NOMBRE_ARCHIVO, 'El nombre de un adjunto', 'Cámbiale el nombre al archivo y vuelve a adjuntarlo.').replace(/[\\/]/g, '_') || 'archivo';
  if (bytes.length > MAX_ADJUNTO) throw new Rechazo(`«${nombre}» pesa más de ${MAX_ADJUNTO / 1024 / 1024} MB.`);
  if (!bytes.length) throw new Rechazo(`«${nombre}» está vacío.`);
  const ext = (/\.([a-z0-9]{1,8})$/i.exec(nombre)?.[1] ?? 'bin').toLowerCase();
  const dir = enDisco(raiz, `${carpeta}/adjuntos`);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${id}.${ext}`), bytes);
  return { ruta: `${carpeta}/adjuntos/${id}.${ext}`, nombre, bytes: bytes.length };
}

/** Un id para una persona nueva del equipo, a partir de su nombre. */
function idPara(nombre: string, usados: string[]): string {
  const base = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'persona';
  let id = base === TITULAR ? 'persona' : base;
  for (let i = 2; usados.includes(id); i++) id = `${base}-${i}`;
  return id;
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
  if (!isAbsolute(r)) throw new Error('Escribe una ruta completa.');
  const abs = resolve(r);
  let entradas;
  try {
    entradas = await readdir(abs, { withFileTypes: true });
  } catch {
    throw new Error('No se puede abrir esa carpeta (no existe o no hay permiso).');
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
  salida.push({ id: 'node', nombre: 'Node.js 24 o más nuevo', ok: mayor >= 24, detalle: `Tienes Node ${process.versions.node}.`, arreglo: 'Instala Node.js 24 desde https://nodejs.org' });
  const g = await gitEn(raiz, ['--version']);
  salida.push({ id: 'git', nombre: 'git', ok: g.ok, detalle: g.ok ? g.out.trim() : 'No se encontró git.', arreglo: 'Instala git desde https://git-scm.com' });
  const esRepo = (await gitEn(raiz, ['rev-parse', '--is-inside-work-tree'])).out.trim() === 'true';
  salida.push({ id: 'repo', nombre: 'La carpeta del Studio es un repositorio git', ok: esRepo, detalle: esRepo ? 'Cada decisión queda en un commit local.' : 'Sin git no hay historial de decisiones.', arreglo: 'git init -b main (en la carpeta del Studio)' });
  const [nombre, correo] = await Promise.all(['user.name', 'user.email'].map(async (k) => (await gitEn(raiz, ['config', k])).out.trim()));
  salida.push({ id: 'identidad', nombre: 'Tu identidad de git', ok: !!(nombre && correo), detalle: nombre && correo ? `${nombre} <${correo}>` : 'El Studio firma cada decisión con ella.', arreglo: 'git config user.name "Tu Nombre" y git config user.email "tu@correo.com"' });
  const claude = await new Promise<boolean>((ok) => execFile(process.platform === 'win32' ? 'claude.cmd' : 'claude', ['--version'], { windowsHide: true, timeout: 8000, shell: process.platform === 'win32' }, (e) => ok(!e)));
  salida.push({ id: 'claude', nombre: 'Claude Code (la sesión del director)', ok: claude, opcional: true, detalle: claude ? 'Ábrelo en la carpeta del Studio y escribe «revisa estudio».' : 'No se encontró el comando claude; también sirve la app de escritorio, abierta en esta carpeta.', arreglo: 'https://claude.com/claude-code' });
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
}

export function servidorDirector(): Plugin {
  let raiz = process.cwd();

  /** Los proyectos de este Estudio: los de estudio.local.json con su memoria en su repositorio. */
  const listarIds = () => proyectosLocales(raiz);

  // Uno por memoria de proyecto: el que trae su rama de GitHub y el que guarda (y sube) sus decisiones
  const traedores = new Map<string, Traedor>();
  const traedorDe = (id: string) => {
    const m = memoriaDe(raiz, id)!;
    if (!traedores.has(m)) traedores.set(m, new Traedor(m, 30_000, RAMA, async () => !!(await leerProyecto(id)).sincronizar));
    return traedores.get(m)!;
  };
  const syncs = new Map<string, Sincronizador>();
  const syncDe = (id: string) => {
    const m = memoriaDe(raiz, id)!;
    if (!syncs.has(m)) syncs.set(m, new Sincronizador(m, async () => !!(await leerProyecto(id)).sincronizar && (await correrGit(m, ['remote', 'get-url', 'origin'])).codigo === 0));
    return syncs.get(m)!;
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
  const sinTranscribir = new Map<string, string>();
  const colaAudios: { id: string; audio: string; pista: string }[] = [];
  let transcriptorOcupado = false;
  const txtDe = (audio: string) => audio.replace(/\.[a-z0-9]+$/, '.txt');
  function transcribirLuego(id: string, audios: string[], pista: string) {
    for (const audio of audios) {
      if (transcribiendo.has(audio) || sinTranscribir.has(audio) || !existsSync(enDisco(raiz, audio)) || existsSync(enDisco(raiz, txtDe(audio)))) continue;
      transcribiendo.add(audio);
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
        const cuantas = lote.length === 1 ? 'una nota de voz' : `${lote.length} notas de voz`;
        void anotar(raiz, { quien: EL_STUDIO, que: r.ok ? `transcribió ${cuantas} en este computador, sin WSL` : `no pudo transcribir ${cuantas} (${r.error ?? 'sin detalle'})`, desde: 'la transcripción local', proyecto: lote[0].id });
        for (const x of lote) {
          transcribiendo.delete(x.audio);
          // Con su texto escrito, el audio se borra (nunca entra a git) y el commit lleva solo el .txt. Si falló o salió
          // vacía, el audio se queda en este computador hasta que salga bien
          const audio = enDisco(raiz, x.audio);
          if (quitarSiVacia(audio)) sinTranscribir.set(x.audio, 'La transcripción salió vacía: el audio se queda para volver a intentarlo.');
          else if (existsSync(enDisco(raiz, txtDe(x.audio)))) {
            borrarSiTranscrito(audio);
            programarCommit(x.id, quienGuarda || 'el Studio', 'transcribe en local una nota de voz', [txtDe(x.audio)]);
          } else sinTranscribir.set(x.audio, r.error ?? 'No quedó texto.');
        }
      }
    } finally {
      transcriptorOcupado = false;
    }
  }

  // El que lanza al director cuando alguien pide una revisión (sin modelo mientras no haya nada pedido)
  let revisor: Revisor | null = null;
  // Solo desde la ruta «/revision», con el botón que la nombra: nada más en el Studio la pide (regla dura del titular, 23
  // de octubre de 2026; la prueba «nadie pide una revisión solo» lo vigila). Cada pedido y cada cancelación, a la bitácora
  const pedirYLanzar = async (id: string, quien: string | null, origen?: OrigenRevision, cancela?: string) => {
    const r = await pedirRevision(raiz, id, quien, origen);
    // «Pedir revisiones seguidas»: esta y, al cerrar cada una, la siguiente, a su nombre (revisor.ts › seguirLaCadena).
    // Cancelar la pedida también las para
    if (quien && origen === 'seguidas') await empezarSeguidas(raiz, id, quien);
    if (!quien) await pararSeguidas(raiz, id, `la canceló ${cancela ?? 'alguien'}`);
    await anotar(raiz, quien
      ? { quien, que: origen === 'seguidas' ? 'pide revisiones seguidas del director' : 'pide la revisión del director', desde: ORIGENES_REVISION[origen!], proyecto: id }
      : { quien: cancela ?? 'alguien', que: 'cancela la revisión pedida', desde: '«Cancelar», junto a la revisión pedida', proyecto: id });
    if (quien) void revisor?.mirar(true).catch(() => {});
    return r;
  };
  // Quién está en este computador, para la bitácora de lo que no es de un proyecto (el modelo, ultracode, el proyecto
  // activo): la identidad de git de la carpeta del Studio
  const quienAqui = async () => (await leerIdentidad(raiz, null)).nombre || 'alguien en este computador';

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
        s.esfuerzo = { desde, hasta, commits, decisiones: decisiones.out.split('\n').filter((l) => l.startsWith('Estudio')).length };
      }
    }
    caches.set(id, { cuando: Date.now(), senales: s });
    return s;
  }

  // ─────────────────────────────────────────── guardar las decisiones en git (agrupadas)
  let quienGuarda = '', temporizador: ReturnType<typeof setTimeout> | null = null;
  const porProyecto = new Map<string, { que: string[]; archivos: Set<string> }>();
  function programarCommit(proyecto: string, quien: string, que: string, archivos: string[]) {
    const p = porProyecto.get(proyecto) ?? { que: [], archivos: new Set<string>() };
    p.que.push(que);
    for (const a of archivos) p.archivos.add(a);
    porProyecto.set(proyecto, p);
    quienGuarda = quien;
    if (temporizador) clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      temporizador = null;
      for (const [id, { que: lista, archivos }] of porProyecto) {
        if (!memoriaDe(raiz, id)) continue;
        const resumen = lista.length === 1 ? lista[0] : `${lista.length} decisiones: ${lista.join('; ')}`;
        // Solo el mensaje del commit se acota: lo que cada quien escribió va entero en los archivos que guarda
        syncDe(id).registrar(enMemoria([...archivos]), `Estudio (${id}): ${quienGuarda} ${resumen}`.slice(0, 300)).catch(() => undefined);
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

  async function decidir(id: string, cuerpo: any, yo: Identidad & { rol: Persona }): Promise<{ estado: EstadoDirector; proyecto: Proyecto; que: string; archivos: string[]; audios: string[] }> {
    const rutas = rutasDe(id);
    const plan = await leerPlan(id);
    const proyecto = await leerProyecto(id);
    const leido = await leerEstado(id, yo.rol, proyecto);
    const propio = leido.propio!;
    const estado = leido.estado; // para las comprobaciones; lo que cambia va en `propio`
    const firma = { fecha: hoy(), quien: yo.nombre };
    const titular = yo.rol === TITULAR;
    let cambiaProyecto = false;
    // Un proyecto sin equipo (hecho a mano): la primera persona que decide queda como su titular
    if (yo.nuevo && !proyecto.equipo.some((i) => i.id === TITULAR)) {
      proyecto.equipo.unshift({ id: TITULAR, nombre: yo.nombre, correo: yo.correo, cargo: 'Director de proyecto', papel: 'Dirige el proyecto: fija la meta, responde las propuestas y cruza las puertas.' });
      cambiaProyecto = true;
    }
    const soloTitular = (que: string) => {
      if (!titular) throw new Rechazo(`Solo el titular puede ${que}.`);
    };
    const criterio = (cid: string) => {
      const c = plan.fases.flatMap((f) => f.criterios).find((x) => x.id === cid);
      if (!c) throw new Rechazo('Ese criterio no está en la ruta.');
      return c;
    };
    const faseDe = (fid: string) => {
      const f = plan.fases.find((x) => x.id === fid);
      if (!f) throw new Rechazo('Esa fase no está en la ruta.');
      return f;
    };
    const mision = (mid: string) => {
      const m = plan.misiones?.find((x) => x.id === mid);
      if (!m) throw new Rechazo('Esa misión no está en la ruta.');
      return m;
    };
    /** Algo de otra persona solo lo retira el titular, en su propio archivo. */
    const retirarDelOtro = (rid: string, que: string) => {
      if (!titular) throw new Rechazo(`Solo el titular o quien lo hizo pueden ${que}.`);
      propio.retirados[rid] = firma;
    };
    const cuando = new Date().toISOString();
    const archivos: string[] = [rutas.persona(yo.rol)];
    // El audio de una nota de voz nunca entra a git: va aparte, a transcribirse; en el commit va su .txt cuando salga
    const audios: string[] = [];
    let que = '';
    let callado = false; // lo que no va a la bitácora (marcar una idea de una parte)
    switch (cuerpo.tipo) {
      case 'empezar': {
        const m = mision(cuerpo.mision);
        if (estadoMision(m, plan, estado) === 'bloqueada') throw new Rechazo('Esa misión es de una fase que todavía está bajo niebla.');
        propio.empezadas[m.id] = { cuando, quien: yo.nombre };
        que = `empieza la misión «${m.titulo}»`;
        break;
      }
      case 'entregar': {
        const m = mision(cuerpo.mision);
        if (estadoMision(m, plan, estado) === 'bloqueada') throw new Rechazo('Esa misión es de una fase que todavía está bajo niebla.');
        const nota = textoDe(cuerpo.nota, MAX_TEXTO, 'Lo que cuentas de la entrega');
        const audio = cuerpo.audio ? await guardarAudio(raiz, rutas.notas, `e_${m.id}_${Date.now().toString(36)}`, cuerpo.audio) : undefined;
        if (audio) audios.push(audio);
        // «No me salió»: el paso que se le trabó, para que la bandeja y el sello de los documentos no lo deduzcan después
        const sinTerminar = Number.isInteger(cuerpo.sinTerminar) && cuerpo.sinTerminar >= 0 && cuerpo.sinTerminar < m.pasos.length ? (cuerpo.sinTerminar as number) : undefined;
        propio.entregas[m.id] = { cuando, quien: yo.nombre, ...(nota ? { nota } : {}), ...(audio ? { audio } : {}), ...(sinTerminar !== undefined ? { sinTerminar } : {}) };
        que = `entrega la misión «${m.titulo}»${sinTerminar !== undefined ? ` sin terminar (no le salió el paso ${sinTerminar + 1})` : ''}`;
        break;
      }
      case 'deshacer_entrega': {
        const m = mision(cuerpo.mision);
        const e = estado.entregas[m.id];
        if (!e || estadoMision(m, plan, estado) !== 'entregada') throw new Rechazo('Esa entrega ya la revisó el director o no existe.');
        if (propio.entregas[m.id]?.cuando === e.cuando) delete propio.entregas[m.id];
        else retirarDelOtro(claveEntrega(m.id, e.cuando), 'retirar una entrega');
        que = `retira la entrega de «${m.titulo}»`;
        break;
      }
      case 'comentar': {
        const sobre = cuerpo.sobre ?? { tipo: 'general' };
        if (!TIPOS_SOBRE.includes(sobre.tipo)) throw new Rechazo('¿Sobre qué es la nota?');
        // En una decisión de un documento: si aprueba lo que recomienda el director (un clic, sin escribir), si decide
        // otra cosa o si solo la comenta (queda abierta)
        const postura = sobre.tipo === 'documento' && sobre.decision && POSTURAS.includes(sobre.postura) ? sobre.postura : undefined;
        // En un paso con opciones: la que eligió con un clic (es la nota misma). Cabe entera: validarPlan no deja
        // escribir una opción más larga que MAX_ELECCION, y las de un paso con `varias` caben juntas (MAX_ELECCIONES)
        const eleccion = sobre.tipo === 'mision' && typeof sobre.eleccion === 'string' ? textoDe(sobre.eleccion, MAX_ELECCIONES, 'La opción elegida', 'Cuéntale al director lo que elegiste con el ✉ del paso.') : '';
        // «Hazlo tú», confirmado: le encarga el paso al director (lo hace en su revisión siguiente)
        const hazlo = sobre.tipo === 'mision' && sobre.hazlo === true;
        const texto = textoDe(cuerpo.texto, MAX_TEXTO, 'La nota') || (postura === 'aprueba' ? 'Apruebo lo que recomiendas.' : eleccion);
        // Sobre qué es: los nombres que pone la página (la misión, la parte, la decisión), enteros o rechazados antes de
        // guardar el audio y los adjuntos. Solo `fragmento` se acota: es el comienzo de la idea que se comenta, un
        // localizador que arma la página (ya recortado allá), no contenido; lo que la persona dice va entero en el texto
        const general = 'Déjalo como comentario general y di ahí sobre qué es.';
        const donde = {
          tipo: sobre.tipo,
          ...(sobre.id ? { id: textoDe(sobre.id, 200, 'El nombre de lo que comentas', general) } : {}),
          ...(sobre.seccion ? { seccion: textoDe(sobre.seccion, 200, 'El nombre de la parte que comentas', general) } : {}),
          ...(sobre.decision ? { decision: textoDe(sobre.decision, 200, 'El nombre de la decisión que respondes', general) } : {}),
          ...(sobre.fragmento ? { fragmento: String(sobre.fragmento).trim().slice(0, 200) } : {}),
          ...(postura ? { postura } : {}), ...(sobre.tipo === 'mision' && sobre.aclarar === true ? { aclarar: true } : {}), ...(eleccion ? { eleccion } : {}), ...(hazlo ? { hazlo } : {}),
        };
        const nid = `n${Date.now().toString(36)}${yo.rol.slice(0, 3).replace(/-/g, '')}`;
        const lista: unknown[] = Array.isArray(cuerpo.adjuntos) ? cuerpo.adjuntos : [];
        if (lista.length > MAX_ADJUNTOS) throw new Rechazo(`Una nota lleva como mucho ${MAX_ADJUNTOS} adjuntos.`);
        if (!texto && !cuerpo.audio && !lista.length) throw new Rechazo('La nota está vacía: escribe, graba o adjunta algo.');
        // Seguir una pregunta: la que sigue debe existir y ser una pregunta (así arma su hilo)
        if (sobre.tipo === 'pregunta' && sobre.id && !estado.notas.some((x) => x.id === sobre.id && esPregunta(x))) throw new Rechazo('Esa pregunta ya no está: la conversación no se puede seguir.');
        const audio = cuerpo.audio ? await guardarAudio(raiz, rutas.notas, nid, cuerpo.audio) : undefined;
        if (audio) audios.push(audio);
        const adjuntos: Adjunto[] = [];
        for (const [i, x] of lista.entries()) adjuntos.push(await guardarAdjunto(raiz, rutas.notas, `${nid}-${i + 1}`, x));
        archivos.push(...adjuntos.map((a) => a.ruta));
        // Urgente: una casilla, el porqué ya va en la nota (las preguntas no lo son: se responden en la revisión, como un informe)
        const urgente = sobre.tipo !== 'pregunta' && (cuerpo.urgente === true || cuerpo.urgente === 'on' || cuerpo.urgente === '1');
        propio.notas.push({
          id: nid, cuando, quien: yo.nombre, sobre: donde,
          ...(texto ? { texto } : {}), ...(audio ? { audio } : {}), ...(adjuntos.length ? { adjuntos } : {}), ...(urgente ? { urgente } : {}),
        });
        que = eleccion ? `elige «${eleccion}» en el ${String(sobre.seccion ?? 'paso').toLowerCase()} de la misión ${sobre.id ?? ''}`.trim()
          : hazlo ? `le encarga al director el ${String(sobre.seccion ?? 'paso').toLowerCase()} de la misión ${sobre.id ?? ''}`.trim()
          : urgente ? 'deja una nota urgente para el director' : sobre.tipo === 'pregunta' ? (sobre.id ? 'sigue una conversación de preguntas con el director' : 'le hace una pregunta al director') : `deja una nota para el director${sobre.tipo === 'general' ? '' : ` (sobre ${sobre.tipo === 'documento' ? `el documento ${sobre.id}` : `${sobre.tipo} ${sobre.id ?? ''}`.trim()})`}`;
        break;
      }
      case 'borrar_nota': {
        const n = estado.notas.find((x) => x.id === cuerpo.id);
        if (!n) throw new Rechazo('Esa nota no está.');
        if (plan.respuestas?.[n.id]) throw new Rechazo('El director ya respondió esa nota: queda en el historial.');
        if (propio.notas.some((x) => x.id === n.id)) propio.notas = propio.notas.filter((x) => x.id !== n.id);
        else retirarDelOtro(n.id, 'borrar una nota');
        que = 'borra una nota para el director';
        break;
      }
      case 'editar_nota': {
        // Piensa, corrige y luego envía: lo que está en el buzón se corrige hasta que el director lo responda
        const n = propio.notas.find((x) => x.id === cuerpo.id);
        if (!n) throw new Rechazo('Solo puedes corregir tus propias notas.');
        if (plan.respuestas?.[n.id]) throw new Rechazo('El director ya respondió esa nota: queda en el historial.');
        const texto = textoDe(cuerpo.texto, MAX_TEXTO, 'La nota');
        // Sus imágenes también se corrigen (notas de voz del titular nmvosyiartit y nmvot02hhtit, 26 de octubre de 2026;
        // pedido pd_corregir_adjuntos): se quitan de la nota las marcadas (el archivo sigue en la historia de la memoria)
        // y se guardan las nuevas, con el id de la nota y el número que sigue
        const quitar = new Set(Array.isArray(cuerpo.quitarAdjuntos) ? cuerpo.quitarAdjuntos.map(String) : []);
        const nuevos: unknown[] = Array.isArray(cuerpo.adjuntos) ? cuerpo.adjuntos : [];
        const quedan = (n.adjuntos ?? []).filter((a) => !quitar.has(a.ruta));
        if (quedan.length + nuevos.length > MAX_ADJUNTOS) throw new Rechazo(`Una nota lleva como mucho ${MAX_ADJUNTOS} adjuntos.`);
        if (!texto && !n.audio && !quedan.length && !nuevos.length) throw new Rechazo('La nota quedaría vacía: mejor bórrala.');
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
        que = nuevos.length || quitar.size ? 'corrige una nota para el director, con sus adjuntos' : 'corrige una nota para el director';
        break;
      }
      case 'corregir_transcripcion': {
        // Lo que se entendió de un audio propio (el .txt junto al audio), hasta que el director lo lea
        const audio = typeof cuerpo.audio === 'string' ? cuerpo.audio : '';
        const nota = audio ? propio.notas.find((x) => x.audio === audio) : undefined;
        const entrega = audio ? Object.entries(propio.entregas).find(([, e]) => e.audio === audio) : undefined;
        if (!nota && !entrega) throw new Rechazo('Solo puedes corregir lo que se entendió de tus propios audios.');
        if (nota && plan.respuestas?.[nota.id]) throw new Rechazo('El director ya respondió esa nota: queda en el historial.');
        if (entrega && estadoMision(mision(entrega[0]), plan, estado) !== 'entregada') throw new Rechazo('El director ya revisó esa entrega: queda en el historial.');
        // Entera: un dictado de diez minutos ya pasa de los 6.000 caracteres que antes se guardaban
        const texto = textoDe(cuerpo.texto, MAX_TEXTO, 'Lo que dijiste');
        if (!texto) throw new Rechazo('Escribe lo que dijiste: la transcripción no puede quedar vacía.');
        const txt = audio.replace(/\.[a-z0-9]+$/i, '.txt');
        await writeFile(enDisco(raiz, txt), texto + '\n', 'utf-8');
        archivos.push(txt);
        // Su texto ya quedó escrito: si el audio seguía aquí (su transcripción había salido vacía o fallado), se borra
        borrarSiTranscrito(enDisco(raiz, audio));
        que = 'corrige lo que se entendió de su nota de voz';
        break;
      }
      case 'marcar': {
        soloTitular('tomar la decisión final sobre un criterio');
        const c = criterio(cuerpo.criterio);
        const valor = cuerpo.estado === 'no_aplica' ? 'no_aplica' : 'cumplido';
        const nota = textoDe(cuerpo.nota, MAX_TEXTO, 'El porqué');
        if (valor === 'no_aplica' && !nota) throw new Rechazo('Para decir que no aplica, escribe por qué.');
        propio.marcas[c.id] = { estado: valor, ...firma, ...(nota ? { nota } : {}) };
        que = `decide que ${valor === 'no_aplica' ? 'no aplica' : 'está cumplido'} «${c.texto}»`;
        break;
      }
      case 'desmarcar': {
        soloTitular('tomar la decisión final sobre un criterio');
        const c = criterio(cuerpo.criterio);
        delete propio.marcas[c.id];
        que = `vuelve a dejar pendiente «${c.texto}»`;
        break;
      }
      case 'cerrar': {
        soloTitular('cruzar una puerta');
        const f = faseDe(cuerpo.fase);
        const bloqueos = bloqueosPuerta(f, { plan, estado, senales: await senales(id, plan, proyecto) });
        if (bloqueos.length) throw new Rechazo(bloqueos.join(' '));
        const nota = textoDe(cuerpo.nota, MAX_TEXTO, 'Lo que dijo la revisión de la puerta');
        propio.cierres[f.id] = { ...firma, ...(nota ? { nota } : {}) };
        que = `cruza la puerta «${f.puerta.nombre}» de la fase «${f.nombre}»`;
        break;
      }
      case 'reabrir': {
        soloTitular('reabrir una puerta');
        const f = faseDe(cuerpo.fase);
        const motivo = textoDe(cuerpo.nota, MAX_TEXTO, 'El porqué');
        if (!motivo) throw new Rechazo('Para reabrir una puerta, escribe por qué.');
        // Reabrir una fase reabre también las que vinieron después
        for (const g of plan.fases.slice(plan.fases.indexOf(f))) delete propio.cierres[g.id];
        que = `reabre la fase «${f.nombre}»: ${motivo}`;
        break;
      }
      case 'excepcion': {
        const frente = plan.frentes.find((x) => x.id === cuerpo.frente);
        if (!frente) throw new Rechazo('Ese frente no está en la ruta.');
        const motivo = textoDe(cuerpo.motivo, MAX_TEXTO, 'La razón de la excepción');
        if (!motivo) throw new Rechazo('Una excepción necesita su razón.');
        const dias = Math.min(30, Math.max(1, enteroDe(cuerpo.dias) || 7));
        const fase = faseActual(plan, estado);
        propio.excepciones.push({ id: `x${Date.now().toString(36)}`, ...firma, frente: frente.id, fase: fase.id, motivo, hasta: sumarDias(firma.fecha, dias - 1) });
        que = `abre una excepción en «${frente.nombre}»: ${motivo}`;
        break;
      }
      case 'cerrar_excepcion': {
        const x = estado.excepciones.find((e) => e.id === cuerpo.id);
        if (!x) throw new Rechazo('Esa excepción no está.');
        const mia = propio.excepciones.find((e) => e.id === x.id);
        if (mia) mia.cerrada = firma;
        else retirarDelOtro(x.id, 'cerrar una excepción');
        que = `cierra la excepción de «${plan.frentes.find((f) => f.id === x.frente)?.nombre ?? x.frente}»`;
        break;
      }
      case 'validacion': {
        const v = cuerpo.validacion ?? {};
        const tipo = v.tipo as TipoValidacion;
        if (!TIPOS_VALIDACION.includes(tipo)) throw new Rechazo('Elige el tipo de validación.');
        const personas = enteroDe(v.personas);
        if (personas < 1) throw new Rechazo('Di cuántas personas (o casos) participaron.');
        const fase = plan.fases.find((f) => f.id === v.fase) ?? faseActual(plan, estado);
        const nueva: Validacion = {
          id: `v${Date.now().toString(36)}`,
          fecha: /^\d{4}-\d{2}-\d{2}$/.test(v.fecha) ? v.fecha : firma.fecha,
          fase: fase.id,
          tipo,
          personas,
          lograron: Math.min(personas, enteroDe(v.lograron)),
          aprueban: Math.min(personas, enteroDe(v.aprueban)),
          quien: yo.nombre,
        };
        const campos = { contexto: 'El contexto', loMejor: '«Lo mejor, según ellos»', hallazgos: '«Lo que se vio»', cambios: '«Qué cambiamos por esto»' } as const;
        for (const k of ['contexto', 'loMejor', 'hallazgos', 'cambios'] as const) {
          const t = textoDe(v[k], MAX_TEXTO, campos[k]);
          if (t) nueva[k] = t;
        }
        propio.validaciones.push(nueva);
        que = `registra una validación (${tipo}) con ${personas} ${personas === 1 ? 'persona' : 'personas'}`;
        break;
      }
      case 'borrar_validacion': {
        const v = estado.validaciones.find((x) => x.id === cuerpo.id);
        if (!v) throw new Rechazo('Esa validación no está.');
        if (propio.validaciones.some((x) => x.id === v.id)) propio.validaciones = propio.validaciones.filter((x) => x.id !== v.id);
        else retirarDelOtro(v.id, 'borrar una validación');
        que = `borra la validación del ${v.fecha}`;
        break;
      }
      case 'responder': {
        soloTitular('responder a las propuestas del director');
        const p = plan.propuestas.find((x) => x.id === cuerpo.propuesta);
        if (!p) throw new Rechazo('Esa propuesta no está.');
        if (cuerpo.estado === null || cuerpo.estado === '') {
          delete propio.propuestas[p.id];
          que = `deja sin responder «${p.titulo}»`;
          break;
        }
        if (!RESPUESTAS.includes(cuerpo.estado)) throw new Rechazo('Respuesta desconocida.');
        const nota = textoDe(cuerpo.nota, MAX_TEXTO, 'El porqué');
        propio.propuestas[p.id] = { estado: cuerpo.estado, ...firma, ...(nota ? { nota } : {}) };
        que = `${cuerpo.estado === 'aceptada' ? 'acepta' : cuerpo.estado === 'descartada' ? 'descarta' : 'deja en estudio'} la propuesta «${p.titulo}»`;
        break;
      }
      case 'paso': {
        const m = mision(cuerpo.mision);
        if (m.para !== yo.rol && !titular) throw new Rechazo('Esa misión es de otra persona: sus pasos los marca ella.');
        if (estadoMision(m, plan, estado) === 'bloqueada') throw new Rechazo('Esa misión es de una fase que todavía está bajo niebla.');
        const hechos = [...new Set((Array.isArray(cuerpo.hechos) ? (cuerpo.hechos as unknown[]) : []).map(Number))]
          .filter((i) => Number.isInteger(i) && i >= 0 && i < m.pasos.length)
          .sort((a, b) => a - b);
        propio.pasos = { ...(propio.pasos ?? {}), [m.id]: { hechos, cuando, quien: yo.nombre } };
        // Marcar un paso es haberla empezado
        if (hechos.length && !estado.empezadas[m.id]) propio.empezadas[m.id] = { cuando, quien: yo.nombre };
        que = `marca ${hechos.length} de ${m.pasos.length} pasos de «${m.titulo}»`;
        break;
      }
      case 'leido': {
        // Las partes de un documento que ya leyó: solo una bandera de quien lee
        const ruta = typeof cuerpo.doc === 'string' ? cuerpo.doc : '';
        if (!esDocumento(ruta)) throw new Rechazo('Ese documento no se puede marcar.');
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
        break;
      }
      case 'anotar': {
        const texto = textoDe(cuerpo.texto, MAX_TEXTO, 'La nota de la bitácora');
        if (!texto) throw new Rechazo('La nota está vacía.');
        que = `anota en la bitácora: ${texto}`;
        break;
      }
      // ── Lo del proyecto: solo el titular
      case 'proyecto': {
        soloTitular('cambiar lo del proyecto');
        proyecto.nombre = textoDe(cuerpo.nombre, 120, 'El nombre del proyecto');
        proyecto.contexto = textoDe(cuerpo.contexto, MAX_TEXTO, 'El contexto del proyecto');
        proyecto.metaInicial = textoDe(cuerpo.metaInicial, MAX_TEXTO, 'Lo que quieres lograr');
        if (cuerpo.terminado !== undefined) proyecto.terminado = textoDe(cuerpo.terminado, MAX_TEXTO, 'Cuándo se considera completo');
        proyecto.repositorio = { url: textoDe(cuerpo.url, 300, 'La dirección en la web').replace(/\/\/[^/@]+@/, '//'), rama: textoDe(cuerpo.rama, 100, 'La rama principal') };
        if (!proyecto.nombre) throw new Rechazo('Ponle un nombre al proyecto.');
        cambiaProyecto = true;
        que = `cuenta qué es el proyecto «${proyecto.nombre}» y qué busca`;
        break;
      }
      case 'objetivo': {
        soloTitular('fijar la meta');
        if (proyecto.objetivo?.firmado) throw new Rechazo('Ya hay una meta fijada: para cambiarla, primero reábrela con su razón.');
        const texto = textoDe(cuerpo.texto, MAX_TEXTO, 'La meta');
        const exito = textoDe(cuerpo.exito, MAX_TEXTO, 'Cómo sabremos que se cumplió');
        if (!texto || !exito) throw new Rechazo('Una meta clara dice qué se logra y cómo se sabe que se logró.');
        const horizonte = textoDe(cuerpo.horizonte, MAX_TEXTO, 'El horizonte');
        // El candidato que se usó no es un texto: vale solo si es uno de los del plan (si no, no se guarda)
        const candidato = String(cuerpo.candidato ?? '').trim();
        proyecto.objetivo = { texto, exito, ...(horizonte ? { horizonte } : {}), ...(candidato && plan.objetivos?.some((o) => o.id === candidato) ? { candidato } : {}), firmado: firma };
        cambiaProyecto = true;
        que = `fija la meta: ${texto}`;
        break;
      }
      case 'reabrir_objetivo': {
        soloTitular('reabrir la meta');
        if (!proyecto.objetivo) throw new Rechazo('No hay una meta fijada.');
        const motivo = textoDe(cuerpo.motivo, MAX_TEXTO, 'El porqué');
        if (!motivo) throw new Rechazo('Para reabrir la meta, escribe por qué: queda en el historial.');
        proyecto.objetivosAnteriores = [...(proyecto.objetivosAnteriores ?? []), { ...proyecto.objetivo, reabierto: { ...firma, nota: motivo } }];
        proyecto.objetivo = null;
        cambiaProyecto = true;
        que = `reabre el objetivo: ${motivo}`;
        break;
      }
      case 'replantear_objetivo': {
        // «Replantear la meta»: la de ahora pasa al historial (con el porqué, si lo hay) y la nueva queda fijada de una vez
        soloTitular('replantear la meta');
        if (!proyecto.objetivo) throw new Rechazo('No hay una meta fijada que replantear.');
        const texto = textoDe(cuerpo.texto, MAX_TEXTO, 'La meta');
        const exito = textoDe(cuerpo.exito, MAX_TEXTO, 'Cómo sabremos que se cumplió');
        if (!texto || !exito) throw new Rechazo('Una meta clara dice qué se logra y cómo se sabe que se logró.');
        const horizonte = textoDe(cuerpo.horizonte, MAX_TEXTO, 'El horizonte');
        const motivo = textoDe(cuerpo.motivo, MAX_TEXTO, 'El porqué');
        proyecto.objetivosAnteriores = [...(proyecto.objetivosAnteriores ?? []), { ...proyecto.objetivo, reabierto: { ...firma, ...(motivo ? { nota: motivo } : {}) } }];
        proyecto.objetivo = { texto, exito, ...(horizonte ? { horizonte } : {}), firmado: firma };
        cambiaProyecto = true;
        que = `replantea la meta: ${texto}`;
        break;
      }
      case 'integrante': {
        soloTitular('cambiar el equipo');
        const nombre = textoDe(cuerpo.nombre, 80, 'El nombre');
        const correo = textoDe(cuerpo.correo, 120, 'El correo', 'Escribe solo el correo de git de la persona.').toLowerCase();
        if (!nombre || !/^[^@\s]+@[^@\s]+$/.test(correo)) throw new Rechazo('Escribe el nombre y el correo de git de la persona.');
        if (proyecto.equipo.some((i) => i.correo.toLowerCase() === correo)) throw new Rechazo('Ese correo ya está en el equipo.');
        const cargo = textoDe(cuerpo.cargo, 80, 'El cargo', 'Déjalo en pocas palabras y escribe lo demás en «Su papel».');
        const papel = textoDe(cuerpo.papel, MAX_TEXTO, 'Su papel');
        proyecto.equipo.push({ id: idPara(nombre, proyecto.equipo.map((i) => i.id)), nombre, correo, ...(cargo ? { cargo } : {}), ...(papel ? { papel } : {}) });
        cambiaProyecto = true;
        que = `suma a ${nombre} al equipo`;
        break;
      }
      case 'quitar_integrante': {
        soloTitular('cambiar el equipo');
        const i = proyecto.equipo.find((x) => x.id === cuerpo.id);
        if (!i) throw new Rechazo('Esa persona no está en el equipo.');
        if (i.id === TITULAR) throw new Rechazo('El titular no se puede quitar del equipo.');
        proyecto.equipo = proyecto.equipo.filter((x) => x.id !== i.id);
        cambiaProyecto = true;
        que = `quita a ${i.nombre} del equipo`;
        break;
      }
      case 'sincronizar': {
        soloTitular('decidir si el Estudio sube solo a GitHub');
        proyecto.sincronizar = !!cuerpo.activo;
        cambiaProyecto = true;
        que = proyecto.sincronizar ? 'activa la subida automática a GitHub' : 'apaga la subida automática a GitHub';
        break;
      }
      default:
        throw new Rechazo('Acción desconocida.');
    }
    if (!callado) propio.bitacora.push({ ...firma, texto: que.charAt(0).toUpperCase() + que.slice(1) });
    propio.actualizado = firma.fecha;
    const unido = unirEstados({ ...leido.porPersona, [yo.rol]: propio });
    const errores = [...validarEstado(unido, plan), ...(cambiaProyecto ? validarProyecto(proyecto) : [])];
    if (errores.length) throw new Rechazo(errores.join(' '));
    await escribirJson(rutas.persona(yo.rol), propio);
    if (cambiaProyecto) {
      await escribirJson(rutas.proyecto, proyecto);
      archivos.push(rutas.proyecto);
      olvidarIdentidad();
      caches.delete(id);
    }
    return { estado: unido, proyecto, que, archivos, audios };
  }

  /**
   * Entrega un proyecto al Studio: abre su memoria en su repositorio (.stl, rama stl) y, si no la tenía, la crea desde la
   * plantilla con quien lo entrega como titular. Si ya la tenía (el proyecto ya estuvo en un Estudio, aquí o en otro
   * computador), la retoma tal cual. Devuelve el id que tiene en este Estudio.
   */
  async function entregar(x: { nombre: string; ruta: string; remoto: string; yo: Identidad; tipo: 'nuevo' | 'existente'; contexto: string; metaInicial: string; terminado: string; historialIA?: Proyecto['historialIA'] }): Promise<string> {
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
    });
    await syncDe(id).registrar(enMemoria(archivos), `Estudio (${id}): ${x.yo.nombre} entrega el proyecto «${nombre}» al director`);
    return id;
  }

  /**
   * Los documentos de un proyecto: los suyos (proyectos/<id>/docs/, que el plan nombra como docs/…), los del Estudio
   * (docs/, el método) y los .md del repositorio del proyecto (repo:…).
   */
  async function listarDocumentos(id: string): Promise<{ ruta: string; titulo: string }[]> {
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
    if (r.info) {
      // Sin comillas ni escapes en las rutas con tildes o eñes (core.quotepath): así se leen tal cual
      const ls = await gitEn(r.info.ruta, ['-c', 'core.quotepath=off', 'ls-files', '--', '*.md', '*.MD']);
      // Si el proyecto es el propio Studio, sus documentos del método ya están en «Del Estudio» y los de los demás
      // proyectos no son suyos; del método, solo el diseño y la evaluación del Studio, que son de este proyecto
      const propio = misma(r.info.ruta, raiz);
      const delStudio = (l: string) => /^proyectos\//.test(l) || (/^docs\//.test(l) && !/^docs\/metodo\/(diseno|evaluacion)-studio\.md$/.test(l));
      const mds = ls.out.split('\n').map((l) => l.trim()).filter((l) => l && !/(^|\/)(node_modules|vendor|dist|build)\//.test(l) && !(propio && delStudio(l))).slice(0, MAX_DOCS_REPO);
      for (const m of mds) {
        const ruta = `repo:${m}`;
        if (!esDocumento(ruta)) continue;
        const texto = (await leerDelRepositorio(r.info.ruta, m))?.slice(0, 4000) ?? '';
        salida.push({ ruta, titulo: `${tituloMd(texto, m)} · ${m}` });
      }
    }
    return salida.sort((a, b) => Number(a.ruta.startsWith('repo:')) - Number(b.ruta.startsWith('repo:')) || a.ruta.localeCompare(b.ruta));
  }

  /** Un documento: docs/… del proyecto (o, si no está, del Estudio) o repo:… de su repositorio. */
  async function leerDocumento(id: string, ruta: string): Promise<string | null> {
    if (!esDocumento(ruta)) return null;
    if (ruta.startsWith('repo:')) {
      const r = await repositorio(id);
      return r.info ? leerDelRepositorio(r.info.ruta, ruta.slice(5)) : null;
    }
    return (await leerFrescoTexto(raiz, `${rutasDe(id).base}/${ruta}`)) ?? leerFrescoTexto(raiz, ruta);
  }

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
      // Cada 15 segundos mira si hay una revisión pedida que nadie tomó: es leer un archivo, no gasta nada
      revisor = new Revisor(raiz);
      // Mientras se mide el núcleo del director no se lanza ningún director: gastan del mismo límite de la cuenta
      revisor.enPausa = midiendo;
      const reloj = setInterval(() => void revisor?.mirar().catch(() => {}), 15_000);
      reloj.unref?.();
      server.httpServer?.on('close', () => clearInterval(reloj));
      // Mientras el director trabaja, la página no se recarga a pedazos: una sola vez, al final (recarga.ts)
      contenerRecargas(server, raiz, () => !!revisor?.estado().revisando);
      // Las voces de Kokoro, locales y las únicas: voz.ts corre tools/director/voz.py
      server.middlewares.use('/__estudio/voz', atenderVoz(raiz));
      server.middlewares.use('/__estudio/director', async (req, res) => {
        const url = new URL(req.url ?? '/', 'http://x');
        const ruta = url.pathname.replace(/\/+$/, '') || '/';
        // Solo el Studio decide: una petición que cambia algo y viene de otra página (otro sitio abierto en el navegador o
        // una pestaña a medida, que corre aislada) se rechaza
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          const origen = req.headers.origin;
          const sitio = req.headers['sec-fetch-site'];
          const propio = (o: string) => o === `http://${req.headers.host}` || o === `https://${req.headers.host}`;
          if ((origen && !propio(origen)) || (sitio && sitio !== 'same-origin' && sitio !== 'none')) return responder(res, 403, { error: 'Esa petición no viene del Studio.' });
        }
        try {
          // Abrir el Studio cuando ya estaba encendido (encender.ts): no se enciende otro servidor; la página que esté
          // abierta se recarga (con su cuenta, sin cortar a quien escribe o graba) y se dice cuántas hay
          if (ruta === '/recargar' && req.method === 'POST') {
            const abiertas = server.ws.clients.size;
            server.ws.send({ type: 'custom', event: EVENTO_RECARGA, data: { abrir: true } });
            await anotar(raiz, { quien: EL_STUDIO, que: `alguien volvió a abrir el Studio, que ya estaba encendido: ${abiertas ? `recarga ${abiertas === 1 ? 'la página abierta' : `las ${abiertas} páginas abiertas`}` : 'no había ninguna página abierta que recargar'}`, desde: 'abrir el Studio otra vez (el acceso directo o npm run encender)' });
            return responder(res, 200, { abiertas });
          }
          if (ruta === '/' && req.method === 'GET') {
            // Lo que tarda cada parte de la carga: si pasa de 3 s, queda en el registro del servidor (.estudio/servidor.log),
            // para ver qué crece antes de que la página parezca colgada (así se encontraron las transcripciones, el 21 de octubre)
            const t0 = Date.now();
            const tiempos: string[] = [];
            const marcar = (que: string, desde: number) => tiempos.push(`${que} ${((Date.now() - desde) / 1000).toFixed(1)} s`);
            const fresco = url.searchParams.has('fresco');
            if (fresco) caches.clear();
            const id = await activo();
            if (id) await traedorDe(id).traer(fresco);
            const identidad = await leerIdentidad(raiz, id);
            const proyectos = await resumenProyectos();
            const sincronizacion = id ? { ...traedorDe(id).estado, subida: syncDe(id).estado() } : { traido: null, error: null, local: true, subida: null };
            await revisor?.preparar();
            marcar('GitHub, identidad y proyectos', t0);
            if (!id) return responder(res, 200, { sinProyectos: true, proyectos, identidad, sincronizacion, hoy: hoy() });
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
            transcribirLuego(id, audios.filter((a) => !transcripciones[a]), `Notas para el director del proyecto ${proyecto.nombre || id}.`);
            const personas = proyecto.equipo.length ? proyecto.equipo.map((i) => i.id) : [TITULAR];
            const lanzamientos = lanzamientosDelDirector(raiz);
            const total = Date.now() - t0;
            if (total > 3000) console.warn(`[estudio] La carga de «${id}» tardó ${(total / 1000).toFixed(1)} s: ${tiempos.join('; ')}.`);
            return responder(res, 200, {
              activo: id,
              proyectos,
              // Sin hashes de commit: son del sistema, no de las personas (nota de voz del titular nmvov99tttit)
              plan: planSinCommits(plan),
              estado,
              proyecto,
              repositorio: { ruta: r.ruta, info: r.info, error: r.error },
              arranque: etapaArranque(plan, proyecto, !!r.info),
              senales: await senales(id, plan, proyecto),
              identidad,
              transcripciones,
              transcribiendo: audios.filter((a) => transcribiendo.has(a)),
              sinTranscribir: audios.filter((a) => sinTranscribir.has(a)),
              sincronizacion,
              // La revisión pedida desde el Studio, si es de este proyecto (la toma la sesión del director en su ciclo)
              revision: ((r) => (r?.proyecto === id ? r : null))((await leerLocal(raiz)).revision),
              // «Pedir revisiones seguidas», si la cadena es de este proyecto: en marcha, o por qué paró
              seguidas: ((s) => (s?.proyecto === id ? s : null))((await leerLocal(raiz)).seguidas),
              // El paso que alguien pidió aclarar («No lo entiendo»), si es de este proyecto
              aclaracion: ((a) => (a?.proyecto === id ? a : null))((await leerLocal(raiz)).aclaracion),
              // Las notas urgentes que el director atiende aparte, al instante, si son de este proyecto
              urgencia: ((u) => (u?.proyecto === id ? u : null))((await leerLocal(raiz)).urgencia),
              // La última vuelta de la sesión del director (/vigila): si es vieja, nadie está mirando las revisiones pedidas
              vigilia: (await leerLocal(raiz)).vigilia ?? null,
              // Si el Studio lanza solo al director, o por qué no puede
              revisor: revisor?.estado() ?? null,
              // El modelo y el esfuerzo de Claude Code (los de /model y /effort, con los que el Studio lanza al
              // director), y lo que gastó cada lanzamiento
              ...conMaximo(await leerAjustesClaude(), (await leerLocal(raiz)).esfuerzoMaximo === true),
              // Si el titular le dio al director el permiso de seguir a ultracode (con sus flujos de varios agentes)
              ultracodeDirector: (await leerLocal(raiz)).permisos?.ultracode === true,
              // «Todo con el modelo que elegí»: sus ayudantes, con su mismo modelo (pr_modelos_por_tarea, punto 4)
              todoConElModelo: (await leerLocal(raiz)).todoConElModelo === true,
              // Si el director lanzado carga tus ajustes de usuario de Claude Code, y los nombres de sus claves, sin valores
              ajustesPropios: await estadoAjustesPropios(raiz),
              // Cómo pide permisos el director: solo lo autorizado (sin la clave) o preguntándote en el Studio
              modoPermisos: (await leerLocal(raiz)).modoPermisos ?? 'autorizado',
              // Tu plan de Claude, para decir lo gastado en lo que cuesta de tu plan (pd_costo_plan); null: a precio de API
              planDeClaude: (await leerLocal(raiz)).planDeClaude ?? null,
              // Si se puede elegir «Automático, vigilado» y, si no, lo que le falta: lo último que se supo, sin esperar a la
              // ayuda de Claude Code (mientras no se sabe, se ofrece, y guardarlo lo comprueba)
              automatico: automaticoSabido() === false ? { admite: false, porque: POR_QUE_SIN_AUTOMATICO } : { admite: true },
              // Lo que gastó cada lanzamiento que terminó (`consumo`) y, aparte, los que no terminaron con su resultado,
              // con su paquete para abrirlo igual (`sinTerminar`)
              ...lanzamientos,
              // La medida del criterio del director en este proyecto, por revisión (pr_criterio_director, punto 3): lo
              // que salió de lo que dejó cada una, con si cerró y lo que gastó, de las líneas de este computador
              medidaDelDirector: medidaPorRevision(plan, estado, leerLineasDeRevision(raiz).filter((l) => l.proyecto === id && l.tipo === 'revision')),
              // La medición del núcleo con casos fijos (pr_nucleo_medido): la de ahora o la última, y lo que costaría otra,
              // por lo que costaron las revisiones si aún no hay una terminada
              medicion: estadoDeMedicion(raiz, lanzamientos.consumo.filter((c) => c.tipo === 'revision').map((c) => c.costo), lanzamientos.consumo.filter((c) => c.tipo !== 'revision').map((c) => c.costo)),
              // Lo que va haciendo el director que lanzó el Studio, mientras revisa (el Studio lo muestra en vivo)
              progreso: await (async () => {
                const r = (await leerLocal(raiz)).revision;
                return r?.proyecto === id && r.lanzada && !r.hecha ? agruparPasos(progresoDeProyecto(raiz, id)) : null;
              })(),
              // Y su plan, si la revisión va en dos tiempos: mientras planea y, después, su lista de encargos (pd_dos_tiempos)
              planVivo: await (async () => {
                const r = (await leerLocal(raiz)).revision;
                return r?.proyecto === id && r.lanzada && !r.hecha ? planDeProyecto(raiz, id) : null;
              })(),
              // Y los tokens que lleva, para verlos subir junto a «El director está revisando»
              tokensVivos: await (async () => {
                const r = (await leerLocal(raiz)).revision;
                return r?.proyecto === id && r.lanzada && !r.hecha ? tokensDeProyecto(raiz, id) : null;
              })(),
              // Y lo que se le lleva negado, en vivo, sin esperar a que termine (propuesta «Los permisos, al momento»)
              negadosVivos: await (async () => {
                const r = (await leerLocal(raiz)).revision;
                return r?.proyecto === id && r.lanzada && !r.hecha ? negadosDeProyecto(raiz, id) : null;
              })(),
              // La última vez que creció su registro: sin nada nuevo en un buen rato, el Studio dice que está parada
              actividad: await (async () => {
                const r = (await leerLocal(raiz)).revision;
                return r?.proyecto === id && r.lanzada && !r.hecha && !r.error ? actividadDeProyecto(raiz, id) : null;
              })(),
              // Y lo que tiene corriendo (una orden larga, un ayudante, un flujo): mientras corre, su registro no crece y
              // no está parado (pr_procesos_vista, punto 2)
              enCurso: await (async () => {
                const r = (await leerLocal(raiz)).revision;
                return r?.proyecto === id && r.lanzada && !r.hecha && !r.error ? enCursoDeProyecto(raiz, id) : null;
              })(),
              hoy: hoy(),
              errores: [
                ...(avisoDelPlan ? [avisoDelPlan] : []),
                // El plan cambió después del último cierre, sin un director trabajando en él (pr_cierre_vigilado, punto 4)
                ...(await (async () => {
                  const l = await leerLocal(raiz);
                  const corre = (x: { proyecto: string; lanzada?: string; enCurso?: string; hecha?: string; error?: string } | undefined) => !!x && x.proyecto === id && !x.hecha && !x.error && !!(x.lanzada || x.enCurso);
                  const trabaja = revisor?.estado().revisando === id || corre(l.revision) || corre(l.aclaracion) || corre(l.urgencia);
                  const texto = await readFile(enDisco(raiz, rutasDe(id).plan), 'utf-8').catch(() => null);
                  const aviso = planCambiadoTrasCierre(l.huellas?.[id], texto, trabaja);
                  return aviso ? [aviso] : [];
                })()),
                ...validarPlan(plan, personas),
                ...validarEstado(estado, plan),
                ...validarProyecto(proyecto),
              ],
            });
          }
          if (ruta === '/proyecto-nuevo' && req.method === 'POST') {
            // Un proyecto para el Studio. Existente: su repositorio (el director lo diagnostica y propone los objetivos).
            // Nuevo: su explicación, su objetivo y cuándo se considera completo (el director lo plantea). Quien lo crea
            // queda como titular
            const cuerpo = await leerCuerpo(req);
            const yo = await leerIdentidad(raiz, null);
            if (!yo.nombre || !yo.correo) return responder(res, 403, { error: 'Configura tu identidad de git (user.name y user.email) en la carpeta del Estudio.' });
            const nombre = textoDe(cuerpo.nombre, 120, 'El nombre del proyecto');
            if (!nombre) return responder(res, 400, { error: 'Ponle un nombre al proyecto.' });
            const tipo = cuerpo.tipo === 'nuevo' ? 'nuevo' : 'existente';
            const rutaRepo = textoDe(cuerpo.ruta, 500, 'La ruta de la carpeta', 'Elige una carpeta con una ruta más corta.');
            if (!rutaRepo) return responder(res, 400, { error: tipo === 'nuevo' ? 'Elige la carpeta donde vivirá el proyecto: su memoria se guarda ahí.' : 'Elige la carpeta del repositorio del proyecto con «Explorar…».' });
            // Lo que cuenta del proyecto, entero o rechazado antes de tocar la carpeta
            const contexto = textoDe(cuerpo.contexto, MAX_TEXTO, 'El contexto del proyecto');
            const metaInicial = textoDe(cuerpo.metaInicial, MAX_TEXTO, 'Lo que quieres lograr');
            const terminado = textoDe(cuerpo.terminado, MAX_TEXTO, 'Cuándo se considera completo');
            const remoto = textoDe(cuerpo.url, 300, 'La dirección en la web').replace(/\/\/[^/@]+@/, '//');
            if (tipo === 'nuevo' && (!contexto || !metaInicial))
              return responder(res, 400, { error: 'Un proyecto nuevo necesita su explicación y a dónde quieres llegar con él.' });
            // Un proyecto nuevo puede empezar en una carpeta sin git: se le inicia (es la carpeta que eligió su titular)
            if (tipo === 'nuevo' && existsSync(rutaRepo) && !(await gitEn(rutaRepo, ['rev-parse', '--show-toplevel'])).ok) await gitEn(rutaRepo, ['init', '-q']);
            const c = await comprobarRepositorio(rutaRepo);
            if (!c.ok) return responder(res, 400, { error: c.error });
            // El Studio también puede ser un proyecto (se dirige a sí mismo); lo que no puede es entrar dos veces
            if (Object.values((await leerLocal(raiz)).repositorios).some((x) => misma(x, c.info.ruta))) return responder(res, 400, { error: 'Ese repositorio ya está en el Studio.' });
            const id = await entregar({ nombre, ruta: c.info.ruta, remoto: remoto || c.info.remoto || '', yo, tipo, contexto, metaInicial, terminado });
            await guardarActivo(raiz, id);
            olvidarIdentidad();
            // Entregar no pide la revisión: la pide la persona, cuando quiera (regla dura del 23 de octubre de 2026)
            await anotar(raiz, { quien: yo.nombre, que: `entrega el proyecto «${nombre}»`, desde: '«Entregar», en «Proyectos»', proyecto: id });
            return responder(res, 200, { id });
          }
          if (ruta === '/salud' && req.method === 'GET') return responder(res, 200, await saludDelEquipo(raiz));
          // La bitácora del Studio en este computador: qué se hizo, quién, desde dónde y cuándo (la más nueva primero). Con
          // cada clic anotado crece rápido: se devuelven las últimas MAX_BITACORA, que la página filtra sin volver a pedirlas
          if (ruta === '/bitacora' && req.method === 'GET') return responder(res, 200, { eventos: await leerBitacora(raiz, MAX_BITACORA), maximo: MAX_BITACORA });
          // El paquete de un lanzamiento del director (pedido del titular del 23 de octubre de 2026): el encargo con que se
          // lanzó o lo que le dio la bandeja, como texto, para abrirlo desde «Lo que gastó el director». Solo lee, y solo en
          // .revisiones: el nombre de un registro, sin rutas, y una de sus partes (paquete.ts › archivoDelPaquete)
          if (ruta === '/paquete' && req.method === 'GET') {
            const archivo = archivoDelPaquete(raiz, url.searchParams.get('registro'), url.searchParams.get('parte'));
            if (!archivo) return responder(res, 400, { error: 'Pide el nombre de un registro de .revisiones y una de sus partes (encargo o bandeja).' });
            const texto = await readFile(archivo, 'utf8').catch(() => null);
            if (texto === null) return responder(res, 404, { error: 'Esa parte del paquete no está.' });
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            return res.end(texto);
          }
          // Escanear el equipo: qué se puede escanear (para pedir permiso) y el escaneo con lo que el usuario permitió
          if (ruta === '/escanear/fuentes' && req.method === 'GET') return responder(res, 200, await fuentesDeEscaneo());
          if (ruta === '/escanear' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const agentes = Array.isArray(cuerpo.agentes) ? cuerpo.agentes.map(String) : [];
            const unidades = Array.isArray(cuerpo.unidades) ? cuerpo.unidades.map(String).filter((u: string) => existsSync(u)) : [];
            if (!agentes.length && !unidades.length) return responder(res, 400, { error: 'Elige al menos un agente o una unidad para escanear.' });
            const local = await leerLocal(raiz);
            // Solo lee, pero lee el equipo con el permiso de la persona: queda en la bitácora qué permitió escanear
            await anotar(raiz, { quien: await quienAqui(), que: `escanea el equipo en busca de proyectos: ${[agentes.length ? `los historiales de ${agentes.join(', ')}` : '', unidades.length ? `las unidades ${unidades.join(', ')}` : ''].filter(Boolean).join(' y ')}`, desde: '«Escanear», en «Escanear el equipo», al entregar proyectos' });
            return responder(res, 200, await escanear(raiz, { agentes, unidades }, Object.values(local.repositorios)));
          }
          // Varios proyectos existentes a la vez (líneas o escaneo): la memoria de cada uno en su repositorio; el director
          // los diagnostica en sus próximas revisiones
          if (ruta === '/proyectos-varios' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const yo = await leerIdentidad(raiz, null);
            if (!yo.nombre || !yo.correo) return responder(res, 403, { error: 'Configura tu identidad de git (user.name y user.email) en la carpeta del Estudio.' });
            // Hasta 60 por vez; los que sobren no se pierden en silencio: se dice cuántos quedaron fuera
            const todos: { nombre?: unknown; ruta?: unknown; historialIA?: unknown }[] = Array.isArray(cuerpo.proyectos) ? cuerpo.proyectos : [];
            const lista = todos.slice(0, 60);
            if (!lista.length) return responder(res, 400, { error: 'No hay proyectos para agregar.' });
            const creados: { id: string; nombre: string }[] = [];
            const errores: string[] = todos.length > lista.length ? [`Quedaron fuera ${todos.length - lista.length} de los ${todos.length}: por vez entran ${lista.length}. Entrégalos en otra tanda.`] : [];
            const local = await leerLocal(raiz);
            const yaEstan = Object.values(local.repositorios);
            // Lo que encontró el escaneo (la página lo devuelve tal cual) también va entero: si algo no cabe, ese proyecto
            // no entra y se dice por qué
            const sinEscaneo = 'Entrégalo en una línea, con su nombre y su ruta.';
            for (const x of lista) {
              let nombre = '';
              try {
                nombre = textoDe(x.nombre, 120, 'El nombre del proyecto');
                const c = await comprobarRepositorio(textoDe(x.ruta, 500, 'La ruta de la carpeta', 'Elige una carpeta con una ruta más corta.'));
                if (!nombre) { errores.push('Una línea no tiene nombre.'); continue; }
                if (!c.ok) { errores.push(`«${nombre}»: ${c.error}`); continue; }
                if (yaEstan.some((y) => misma(y, c.info.ruta))) { errores.push(`«${nombre}»: ese repositorio ya está en el Studio.`); continue; }
                const historialIA = Array.isArray(x.historialIA)
                  ? x.historialIA.slice(0, 5).map((s: any) => ({ agente: textoDe(s?.agente, 40, 'El nombre de un agente de IA', sinEscaneo), ...(s?.sesiones ? { sesiones: enteroDe(s.sesiones) } : {}), ...(s?.ultima ? { ultima: textoDe(s.ultima, 40, 'La fecha de su última sesión de IA', sinEscaneo) } : {}), ...(s?.donde ? { donde: textoDe(s.donde, 500, 'Dónde está su historial de IA', sinEscaneo) } : {}) })).filter((s: { agente: string }) => s.agente)
                  : [];
                const id = await entregar({ nombre, ruta: c.info.ruta, remoto: c.info.remoto ?? '', yo, tipo: 'existente', contexto: '', metaInicial: '', terminado: '', historialIA });
                yaEstan.push(c.info.ruta);
                creados.push({ id, nombre });
              } catch (e) {
                errores.push(nombre ? `«${nombre}»: ${(e as Error).message}` : (e as Error).message);
              }
            }
            if (creados.length) {
              if (!local.activo) await guardarActivo(raiz, creados[0].id);
              olvidarIdentidad();
              // La revisión del proyecto activo diagnostica también la cola de los recién entregados, cuando la persona
              // la pida: entregar no la pide (regla dura del 23 de octubre de 2026)
              await anotar(raiz, { quien: yo.nombre, que: `entrega ${creados.length === 1 ? 'un proyecto' : `${creados.length} proyectos`}: ${creados.map((c) => `«${c.nombre}»`).join(', ')}`, desde: '«Entregar varios», en «Proyectos»' });
            }
            return responder(res, creados.length ? 200 : 400, { creados, errores, ...(creados.length ? {} : { error: errores.join(' ') || 'No se agregó ningún proyecto.' }) });
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
              modelo = textoDe(cuerpo.modelo, 60, 'El nombre del modelo', 'Elige uno de la lista.') || null;
              await guardarModeloClaude(modelo);
            } catch (e) {
              return responder(res, 400, { error: (e as Error).message });
            }
            await anotar(raiz, { quien: await quienAqui(), que: modelo ? `elige el modelo ${modelo} para el director y las sesiones nuevas de Claude Code` : 'vuelve al modelo de su cuenta de Claude', desde: '«Modelo», en «Modelo y consumo»' });
            // El esfuerzo guardado es de cada modelo: al cambiar de modelo, se ve el suyo
            return responder(res, 200, conMaximo(await leerAjustesClaude(), (await leerLocal(raiz)).esfuerzoMaximo === true));
          }
          if (ruta === '/esfuerzo' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const esfuerzo = textoDe(cuerpo.esfuerzo, 10, 'El esfuerzo', 'Elige uno de la lista.') || null;
            try {
              // «Máximo» Claude Code no lo guarda: lo recuerda el Studio, y el guardado de tus sesiones queda como estaba
              if (esfuerzo !== 'max') await guardarEsfuerzoClaude(esfuerzo);
              await guardarEsfuerzoMaximo(raiz, esfuerzo === 'max');
            } catch (e) {
              return responder(res, 400, { error: (e as Error).message });
            }
            await anotar(raiz, { quien: await quienAqui(), que: esfuerzo ? `elige el esfuerzo ${esfuerzo} para el director` : 'vuelve al esfuerzo de su cuenta de Claude', desde: '«Esfuerzo», en «Modelo y consumo»' });
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
            if (typeof cuerpo.activo === 'boolean') await anotar(raiz, { quien: quienUltra, que: `${cuerpo.activo ? 'enciende' : 'apaga'} ultracode en las sesiones nuevas de Claude Code de este computador`, desde: '«Ultracode», en «Modelo y consumo»' });
            if (typeof cuerpo.director === 'boolean') await anotar(raiz, { quien: quienUltra, que: cuerpo.director ? 'le da al director el permiso de trabajar con ultracode (flujos de varios agentes)' : 'le quita al director el permiso de trabajar con ultracode', desde: cuerpo.director ? '«Autorizo», al pedir el permiso de ultracode, en «Modelo y consumo»' : '«Quitarle el permiso al director», en «Modelo y consumo»' });
            return responder(res, 200, { ...(await leerAjustesClaude()), ultracodeDirector: (await leerLocal(raiz)).permisos?.ultracode === true });
          }
          // Lo que se le negó al director en sus revisiones, para autorizarlo con una casilla en «Modelo y consumo» › permisos
          // (nota de voz del titular nmvotdn3ftit, 26 de octubre de 2026: «No quiero volver a que el director falle por
          // permisos»): lo que falta autorizar, con la revisión en que se negó, y lo ya autorizado, con su alcance
          if (ruta === '/permisos' && req.method === 'GET') {
            const autorizados = (await leerLocal(raiz)).permisos?.autorizados ?? [];
            return responder(res, 200, { pendientes: sinAutorizar(await negadosDelDirector(raiz), autorizados), autorizados });
          }
          // Autorizar varios de una vez (un solo envío) o quitar uno: solo lo que salió de lo negado en ese proyecto, nunca
          // una regla escrita a mano ni una de lo que nunca (permisosNegados.ts › revisarPedido)
          if (ruta === '/permisos' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const autorizar: unknown[] = Array.isArray(cuerpo.autorizar) ? cuerpo.autorizar.slice(0, 100) : [];
            const quitar: unknown[] = Array.isArray(cuerpo.quitar) ? cuerpo.quitar.slice(0, 100) : [];
            if (!autorizar.length && !quitar.length) return responder(res, 400, { error: 'Marca al menos un permiso.' });
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
              if (r.ok) await anotar(raiz, { quien, que: `le autoriza al director «${r.regla}»${r.alcance === 'todos' ? ' en todos los proyectos de este computador' : ' en este proyecto'}`, desde: '«Autorizo los marcados», en «Modelo y consumo» › permisos', ...(r.alcance === 'proyecto' ? { proyecto: r.proyecto } : {}) });
            for (const f of fuera)
              await anotar(raiz, { quien, que: `le quita al director «${f.regla}»${f.alcance === 'todos' ? ' en todos los proyectos de este computador' : ' en este proyecto'}`, desde: '«Quitar», en «Modelo y consumo» › permisos', ...(f.proyecto ? { proyecto: f.proyecto } : {}) });
            return responder(res, 200, { pendientes: sinAutorizar(await negadosDelDirector(raiz), autorizados), autorizados });
          }
          // «Me pregunta en el Studio» (pr_permisos_al_momento, pieza 3; pd_permiso_espera): el gancho del director
          // (tools/director/ganchoPermiso.ts) pregunta aquí y espera a la persona hasta dos minutos; el diálogo lee lo que
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
            // Lo que pasó por «Permitir todo en esta revisión» queda anotado como cualquier llamada dada, diciendo que fue por él
            await anotar(raiz, { quien: 'el director', ...queAnotarDeLaLlamada(herramienta, dado, contestado.decision), ...(proyecto ? { proyecto } : {}) });
            return responder(res, 200, contestado.respuesta);
          }
          if (ruta === '/permiso-al-momento' && req.method === 'GET') return responder(res, 200, { pendientes: permisosEnEspera.pendientes() });
          if (ruta === '/permiso-al-momento' && req.method === 'POST') {
            // Responde la persona, desde el diálogo del navegador (que siempre dice de dónde viene): ni el gancho ni una orden
            // del director (que conoce la clave por su variable de entorno) pueden darse el permiso a sí mismos
            if (req.headers['sec-fetch-site'] !== 'same-origin') return responder(res, 403, { error: 'Solo el diálogo del Studio responde a esta pregunta.' });
            const cuerpo = await leerCuerpo(req);
            const respuesta = respuestaValida(cuerpo.respuesta);
            if (typeof cuerpo.clave !== 'string' || typeof cuerpo.id !== 'string' || !respuesta) return responder(res, 400, { error: 'Falta la revisión, la pregunta o la respuesta.' });
            const pregunta = permisosEnEspera.pendientes().find((p) => p.clave === cuerpo.clave && p.id === cuerpo.id);
            const respondida = permisosEnEspera.responder(cuerpo.clave, cuerpo.id, respuesta);
            if (!respondida) return responder(res, 404, { error: 'Esa pregunta ya no está: la revisión terminó.' });
            if (respondida.aplicada && pregunta) {
              const quien = await quienAqui();
              const d = respondida.decision;
              // «Permitir siempre»: la regla general de ese tipo de acción, solo para el proyecto que se revisa, como en el panel
              if (d.permitir && d.guardar) {
                const g = d.guardar;
                const cuando = new Date().toISOString();
                await cambiarAutorizados(raiz, (antes) => (antes.some((a) => a.regla === g.regla && valePara(a, g.proyecto)) ? antes : [...antes, { regla: g.regla, alcance: 'proyecto', proyecto: g.proyecto, cuando, quien }]));
              }
              // «Permitir todo en esta revisión» no guarda ninguna regla: vive en la espera de esa revisión (permisosEnEspera.ts) y
              // se olvida cuando termina el director
              await anotar(raiz, { quien, que: queAnotarDeLaRespuesta(d, pregunta.propuesta.que), desde: 'el diálogo que pregunta un permiso en plena revisión', proyecto: pregunta.proyecto });
            }
            return responder(res, 200, { ...respondida, pendientes: permisosEnEspera.pendientes() });
          }
          // Cómo pide permisos el director lanzado: solo lo autorizado, o «Me pregunta en el Studio» (pr_permisos_al_momento;
          // pd_permiso_espera). Vale desde su próximo lanzamiento; el que está revisando ahora termina como empezó
          if (ruta === '/modo-permisos' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            if (!esModoPermisos(cuerpo.modo)) return responder(res, 400, { error: 'Elige «Solo lo autorizado», «Me pregunta en el Studio» o «Automático, vigilado».' });
            // El modo automático, solo si el Claude Code de este computador lo trae (pd_permiso_automatico)
            if (cuerpo.modo === 'automatico' && !(await automaticoDisponible())) return responder(res, 400, { error: POR_QUE_SIN_AUTOMATICO });
            await guardarModoPermisos(raiz, cuerpo.modo);
            await anotar(raiz, { quien: await quienAqui(), que: cuerpo.modo === 'pregunta' ? 'elige que el director le pregunte en el Studio lo que le falte de permisos, en vez de negárselo' : cuerpo.modo === 'automatico' ? 'elige «Automático, vigilado»: lo que le falte al director lo decide solo Claude Code, y lo que apruebe queda en el panel de permisos' : 'vuelve a dejar al director solo con lo autorizado: lo que le falta se le niega y queda en el panel de permisos', desde: '«Cómo pide permisos el director», en «Modelo y consumo»' });
            return responder(res, 200, { modoPermisos: cuerpo.modo });
          }
          // «Todo con el modelo que elegí» (pr_modelos_por_tarea, punto 4): los ayudantes del director, con su mismo modelo
          if (ruta === '/todo-con-el-modelo' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            if (typeof cuerpo.si !== 'boolean') return responder(res, 400, { error: 'Falta si los ayudantes van con el modelo que elegiste (si).' });
            await guardarTodoConElModelo(raiz, cuerpo.si);
            await anotar(raiz, { quien: await quienAqui(), que: cuerpo.si ? 'pide que los ayudantes del director trabajen con el mismo modelo que él, aunque gaste más' : 'vuelve a dejar que los ayudantes del director trabajen con un modelo más barato', desde: '«Todo con el modelo que elegí», en «Modelo y consumo»' });
            return responder(res, 200, { todoConElModelo: cuerpo.si });
          }
          // Tu plan de Claude, para decir lo que gasta cada revisión en lo que cuesta de tu plan y no a precio de API (pedido
          // pd_costo_plan): se elige en «Modelo y consumo» › «Lo que gasta»
          if (ruta === '/plan-de-claude' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const elegido: unknown = cuerpo.plan === null || cuerpo.plan === '' ? null : cuerpo.plan;
            if (elegido !== null && !esPlanDeClaude(elegido)) return responder(res, 400, { error: 'Elige Pro, Max 5x, Max 20x o una clave de API.' });
            const plan = elegido as PlanDeClaude | null;
            await guardarPlanDeClaude(raiz, plan);
            await anotar(raiz, { quien: await quienAqui(), que: plan ? `elige su plan de Claude, ${PLANES_DE_CLAUDE[plan].nombre}, para ver lo que gasta cada revisión en lo que cuesta de su plan` : 'quita su plan de Claude: lo que gasta cada revisión vuelve a decirse a precio de API', desde: '«Tu plan de Claude», en «Modelo y consumo»' });
            return responder(res, 200, { planDeClaude: plan });
          }
          // Si el director que lanza el Studio carga tus ajustes de usuario de Claude Code (y con ellos tus skills y tus
          // comandos): se elige en «Modelo y consumo», viendo sus claves (pd_arranque_limpio)
          // Sin ellos, las claves que conserva, elegidas una por una con su explicación (`conservar`)
          if (ruta === '/ajustes-propios' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            if (typeof cuerpo.cargar !== 'boolean') return responder(res, 400, { error: 'Falta si el director carga tus ajustes (cargar).' });
            const conservar: string[] = Array.isArray(cuerpo.conservar) ? cuerpo.conservar.filter((c: unknown): c is string => typeof c === 'string') : [];
            // Con lo elegido, las claves que había al elegir: una que aparezca después se vuelve a confirmar
            await guardarAjustesPropios(raiz, cuerpo.cargar, conservar, (await opcionesDeTusAjustes())?.map((o) => o.id));
            await anotar(raiz, { quien: await quienAqui(), que: cuerpo.cargar ? 'el director lanzado vuelve a cargar sus ajustes de usuario de Claude Code' : `el director lanzado deja de cargar sus ajustes de usuario de Claude Code (sus skills y sus comandos)${conservar.length ? `, y conserva ${conservar.join(', ')}` : ''}`, desde: '«Tus ajustes de Claude Code», en «Modelo y consumo»' });
            return responder(res, 200, await estadoAjustesPropios(raiz));
          }
          // «Abrir Claude Code»: una terminal nueva con Claude Code como lo lanza el Studio (en su carpeta, con la del
          // proyecto activo a la vista y la misma configuración). La orden la arma el servidor, nunca la petición
          if (ruta === '/abrir-claude' && req.method === 'POST') {
            const programa = buscarClaude();
            if (!programa) return responder(res, 400, { error: 'No encontré Claude Code en este computador. Instálalo (https://claude.com/claude-code) y vuelve a intentarlo.' });
            const activoAhora = await activo();
            const r = await abrirTerminal(ordenAbrirClaude(programa, raiz, activoAhora ? await leerRutaRepositorio(raiz, activoAhora) : null, (await leerLocal(raiz)).esfuerzoMaximo === true), raiz);
            await anotar(raiz, { quien: await quienAqui(), que: r.ok ? 'abre Claude Code en una terminal, como lo lanza el Studio' : `no pudo abrir Claude Code en una terminal: ${r.error}`, desde: '«Abrir Claude Code en una terminal», en «Modelo y consumo»', ...(activoAhora ? { proyecto: activoAhora } : {}) });
            return r.ok ? responder(res, 200, {}) : responder(res, 400, { error: r.error });
          }
          // «Medir el núcleo» (propuesta aceptada pr_nucleo_medido): la corrida de los casos fijos con el director de
          // verdad, que pide la persona con su costo a la vista, y «Detener». Nunca junto a una revisión: las dos gastan del
          // mismo límite de la cuenta (elección del titular del 26 de octubre de 2026)
          if (ruta === '/medicion' && req.method === 'POST') {
            const costosDeRevisiones = () => lanzamientosDelDirector(raiz).consumo.filter((c) => c.tipo === 'revision').map((c) => c.costo);
            const costosCortos = () => lanzamientosDelDirector(raiz).consumo.filter((c) => c.tipo !== 'revision').map((c) => c.costo);
            const cuerpo = await leerCuerpo(req);
            const quien = await quienAqui();
            const desde = '«Medir el núcleo», en «Modelo y consumo» › «Lo que gasta»';
            if (cuerpo.detener) {
              if (detenerMedicion()) await anotar(raiz, { quien, que: 'detiene la medición del núcleo del director: termina la vuelta que corre y no empieza otra', desde });
              return responder(res, 200, { medicion: estadoDeMedicion(raiz, costosDeRevisiones(), costosCortos()) });
            }
            // Si está de acuerdo con la nota de quien califica en un caso: en dos corridas sin acuerdo, su pauta se revisa
            if (cuerpo.acuerdo && typeof cuerpo.acuerdo === 'object') {
              const a = cuerpo.acuerdo as { corrida?: unknown; caso?: unknown; de?: unknown };
              if (typeof a.corrida !== 'string' || typeof a.caso !== 'string' || typeof a.de !== 'boolean') return responder(res, 400, { error: 'Falta la corrida, el caso o si estás de acuerdo.' });
              if (!guardarAcuerdo(raiz, { corrida: a.corrida, caso: a.caso, de: a.de, quien })) return responder(res, 400, { error: 'No se guardó: esa corrida o la nota de ese caso ya no están, o se está midiendo (espera a que termine).' });
              await anotar(raiz, { quien, que: `${a.de ? 'está de acuerdo' : 'no está de acuerdo'} con la nota de quien califica en el caso ${a.caso} de la medición del núcleo`, desde: '«De acuerdo» o «No de acuerdo», en «La medición del núcleo»' });
              return responder(res, 200, { medicion: estadoDeMedicion(raiz, costosDeRevisiones(), costosCortos()) });
            }
            if (!cuerpo.pedir) return responder(res, 400, { error: 'Falta decir si se pide o se detiene la medición.' });
            const l = await leerLocal(raiz);
            const enCurso = (x: { lanzada?: string; enCurso?: string; hecha?: string; error?: string } | null | undefined) => !!x && !x.hecha && !x.error;
            if (revisor?.estado().revisando || enCurso(l.revision) || enCurso(l.aclaracion) || enCurso(l.urgencia))
              return responder(res, 400, { error: 'Hay una revisión pedida o un director trabajando: la medición gasta del mismo límite de tu cuenta, así que se pide cuando termine.' });
            const programa = buscarClaude();
            if (!programa) return responder(res, 400, { error: 'No encontré Claude Code en este computador: sin él no se puede medir al director.' });
            // Qué casos: los que la persona eligió uno por uno de los que fallan (nota de voz del titular nmvsgcn7otit: lo que
            // ya pasa no se vuelve a correr) o, por alcance, lo que el último cambio pudo romper, lo que fallaba o todos
            // (nmvrimph5tit)
            const guardadas = corridasGuardadas(raiz);
            const elegidos = Array.isArray(cuerpo.casos) ? casosMedibles().filter((c) => (cuerpo.casos as unknown[]).includes(c.id)) : null;
            if (elegidos && !elegidos.length) return responder(res, 400, { error: 'Elige al menos un caso que medir.' });
            const queFallan = new Set(casosDelAlcance('fallaban', guardadas).map((c) => c.id));
            const alcance: Alcance | undefined = elegidos ? (elegidos.every((c) => queFallan.has(c.id)) ? 'fallaban' : undefined) : ALCANCES.includes(cuerpo.alcance as Alcance) ? (cuerpo.alcance as Alcance) : 'todos';
            const casos = elegidos ?? casosDelAlcance(alcance!, guardadas);
            if (!casos.length) return responder(res, 400, { error: alcance === 'fallaban' ? 'Ningún caso fallaba en la última medición: no hay nada que medir con esa opción.' : 'No hay casos que medir con esa opción.' });
            const { modelo, esfuerzo } = conMaximo(await leerAjustesClaude(), l.esfuerzoMaximo === true);
            const empezo = empezarMedicion({
              raiz, modelo, esfuerzo, programa, quien, casos, alcance,
              alTerminar: (c, problema) => void anotar(raiz, { quien: EL_STUDIO, que: c ? `termina la medición del núcleo que pidió ${quien}: ${c.vueltas.length} vueltas${c.terminada ? '' : ', detenida antes de terminar'}` : `no pudo terminar la medición del núcleo que pidió ${quien}: ${problema ?? 'se cayó'}`, desde: 'la medición del núcleo' }).catch(() => {}),
            });
            if (!empezo) return responder(res, 400, { error: 'Ya se está midiendo.' });
            await anotar(raiz, { quien, que: `pide la medición del núcleo del director, con ${modelo ?? 'el modelo de su cuenta'}${esfuerzo ? ` y esfuerzo ${esfuerzo}` : ''}: ${elegidos ? `${elegidos.length === 1 ? 'el caso' : `los ${elegidos.length} casos`} que eligió (${elegidos.map((c) => `«${c.titulo}»`).join(', ')})` : alcance === 'pasaban' ? `los ${casos.length} casos que pasaban` : alcance === 'fallaban' ? `los ${casos.length} casos que fallaban` : `los ${casos.length} casos`}`, desde });
            return responder(res, 200, { medicion: estadoDeMedicion(raiz, costosDeRevisiones(), costosCortos()) });
          }
          // Los sonidos (sonidos.ts): de su carpeta, estudio/sonidos, que viaja con el Studio
          if (ruta === '/sonidos' && req.method === 'GET') return responder(res, 200, await leerSonidos(raiz));
          if (ruta === '/sonido' && req.method === 'GET') {
            const datos = await leerSonido(raiz, url.searchParams.get('nombre') ?? '');
            if (!datos) return responder(res, 404, { error: 'Ese sonido no está.' });
            res.statusCode = 200;
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Cache-Control', 'private, max-age=86400');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            return res.end(datos);
          }
          if (ruta === '/activo' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const id = String(cuerpo.id ?? '');
            if (!(await listarIds()).includes(id)) return responder(res, 404, { error: 'Ese proyecto no está.' });
            await guardarActivo(raiz, id);
            olvidarIdentidad();
            const nombre = (await leerProyecto(id).catch(() => null))?.nombre || id;
            await anotar(raiz, { quien: await quienAqui(), que: `cambia el proyecto activo a «${nombre}»`, desde: 'el selector de proyecto (o un botón que lleva a otro proyecto)', proyecto: id });
            return responder(res, 200, { id });
          }
          const id = await activo();
          if (!id) return responder(res, 409, { error: 'Aún no hay proyectos: crea el primero.' });
          if (ruta === '/documentos' && req.method === 'GET') return responder(res, 200, { documentos: await listarDocumentos(id) });
          if (ruta === '/documento' && req.method === 'GET') {
            const pedido = url.searchParams.get('ruta') ?? '';
            const texto = await leerDocumento(id, pedido);
            if (texto === null) return responder(res, 404, { error: 'Ese documento no está (ni en el proyecto ni en su repositorio).' });
            return responder(res, 200, { ruta: pedido, texto });
          }
          if (ruta === '/archivo' && req.method === 'GET') {
            const pedido = url.searchParams.get('ruta') ?? '';
            const m = /^proyectos\/[a-z0-9-]+\/director\/notas\/[\w.-]+\.(webm|ogg|m4a|mp3)$/.exec(pedido);
            const adjunto = !m && RUTA_ADJUNTO.test(pedido);
            const datos = m || adjunto ? await leerFresco(raiz, pedido) : null;
            if (!datos) return responder(res, 404, { error: m ? 'Ese audio no está.' : 'Ese archivo no está.' });
            res.statusCode = 200;
            res.setHeader('Cache-Control', 'private, max-age=3600');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            if (m) res.setHeader('Content-Type', TIPOS_AUDIO[m[1]]);
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
            if (!rutaPermitida(pedido)) return pagina(400, paginaDeError(pedido, 'Esa ruta no se abre desde el Studio: solo archivos del proyecto, de su memoria o de los registros de este computador, y nunca un .env ni una llave.'));
            const r = await repositorio(id);
            const texto = esRegistro(pedido)
              ? await readFile(join(raiz, ...pedido.split('/')), 'utf8').catch(() => null)
              : ((r.info ? await leerDelRepositorio(r.info.ruta, pedido) : null) ??
                (await leerFrescoTexto(raiz, `${rutasDe(id).base}/${pedido}`)) ??
                (pedido.startsWith(`${rutasDe(id).base}/`) ? await leerFrescoTexto(raiz, pedido) : null));
            if (texto === null) return pagina(404, paginaDeError(pedido, 'Ese archivo no está, ni en el repositorio del proyecto ni en su memoria.'));
            if (texto.includes('\u0000')) return pagina(415, paginaDeError(pedido, 'Ese archivo no es de texto: ábrelo con su programa.'));
            const cortado = texto.length > MAX_BYTES_VER;
            return pagina(200, paginaDeArchivo(pedido, cortado ? texto.slice(0, MAX_BYTES_VER) : texto, cortado));
          }
          if (ruta === '/repositorio' && req.method === 'POST') {
            // La ruta es de este computador: no va en git ni se firma; la guarda cualquiera del equipo
            const cuerpo = await leerCuerpo(req);
            const c = await comprobarRepositorio(String(cuerpo.ruta ?? ''));
            if (!c.ok) return responder(res, 400, { error: c.error });
            const otro = Object.entries((await leerLocal(raiz)).repositorios).find(([pid, x]) => pid !== id && misma(x, c.info.ruta));
            if (otro) return responder(res, 400, { error: `Ese repositorio ya es el del proyecto «${otro[0]}».` });
            // La memoria del proyecto vive en su repositorio: la carpeta nueva debe tenerla (es el mismo repositorio, movido)
            const { yaTenia } = await abrirMemoria(c.info.ruta);
            if (!yaTenia) return responder(res, 400, { error: 'Esa carpeta no tiene la memoria de este proyecto (su rama stl). Para traer otro repositorio, entrégalo como proyecto nuevo.' });
            await guardarRutaRepositorio(raiz, id, c.info.ruta);
            repos.delete(id);
            caches.delete(id);
            await anotar(raiz, { quien: await quienAqui(), que: `cambia la carpeta del repositorio del proyecto a ${c.info.ruta}`, desde: '«Usar esta carpeta», en «Proyecto» › Dónde está', proyecto: id });
            return responder(res, 200, { info: c.info });
          }
          // «Detener» las revisiones seguidas: la que está en marcha termina, y no se lanza otra
          if (ruta === '/seguidas' && req.method === 'POST') {
            const yo = await leerIdentidad(raiz, id);
            if (!yo.rol) return responder(res, 403, { error: yo.problema ?? 'Este Estudio no sabe quién eres: configura git user.name y user.email.' });
            await pararSeguidas(raiz, id, `la detuvo ${yo.nombre}`);
            await anotar(raiz, { quien: yo.nombre, que: 'detiene las revisiones seguidas', desde: '«Detener», junto a las revisiones seguidas', proyecto: id });
            return responder(res, 200, { seguidas: ((s) => (s?.proyecto === id ? s : null))((await leerLocal(raiz)).seguidas) });
          }
          // «Retomarla» de una aclaración o una urgencia que no se cerró (pr_retoma_automatica, punto 5): la misma, pedida otra
          // vez por quien oprime el botón, y el director retoma lo que esa dejó. No es una revisión: solo esa aclaración o esas notas
          if (ruta === '/retomar-aparte' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const yo = await leerIdentidad(raiz, id);
            if (!yo.rol) return responder(res, 403, { error: yo.problema ?? 'Este Estudio no sabe quién eres: configura git user.name y user.email.' });
            const tipo = cuerpo.tipo === 'aclaracion' || cuerpo.tipo === 'urgencia' ? cuerpo.tipo : null;
            if (!tipo) return responder(res, 400, { error: 'Solo se retoma una aclaración o lo urgente.' });
            const nueva = await retomarAparte(raiz, id, tipo, yo.nombre);
            if (!nueva) return responder(res, 400, { error: tipo === 'urgencia' ? 'Ya no hay nada urgente que retomar: lo atiende la revisión.' : 'Ya no hay una aclaración que retomar: la responde la revisión.' });
            await anotar(raiz, { quien: yo.nombre, que: tipo === 'urgencia' ? 'retoma lo urgente que no se cerró: el director termina lo que faltó' : `retoma la aclaración del paso ${(nueva as AclaracionPedida).paso + 1} de ${(nueva as AclaracionPedida).mision}, que no se cerró`, desde: '«Retomarla», en «Qué pasó»', proyecto: id });
            void revisor?.mirar(true).catch(() => {});
            const l = await leerLocal(raiz);
            return responder(res, 200, { aclaracion: l.aclaracion?.proyecto === id ? l.aclaracion : null, urgencia: l.urgencia?.proyecto === id ? l.urgencia : null });
          }
          // «Detener ahora» (pr_procesos_vista, punto 3; tu decisión del 26 de octubre de 2026): el Studio le pide al director
          // que corre cerrar con lo hecho y, si en tres minutos no cerró, lo corta. Las revisiones seguidas paran con él
          if (ruta === '/detener' && req.method === 'POST') {
            const yo = await leerIdentidad(raiz, id);
            if (!yo.rol) return responder(res, 403, { error: yo.problema ?? 'Este Estudio no sabe quién eres: configura git user.name y user.email.' });
            if (!revisor) return responder(res, 400, { error: 'El Studio no está llamando al director en este computador: no hay nada que detener desde aquí.' });
            const r = revisor.detenerAhora(id, yo.nombre);
            if (!r.ok) return responder(res, 400, { error: r.error });
            if (r.ya) return responder(res, 200, { revisor: revisor.estado() });
            const seguidas = seguidasActivas((await leerLocal(raiz)).seguidas, id);
            if (seguidas) await pararSeguidas(raiz, id, `la detuvo ${yo.nombre} con «Detener ahora»`);
            await anotar(raiz, { quien: yo.nombre, que: `le pide al director que cierre con lo hecho; si en tres minutos no cerró, el Studio lo corta${seguidas ? '. Las revisiones seguidas paran con él' : ''}`, desde: '«Detener ahora», junto a «El director está revisando»', proyecto: id });
            return responder(res, 200, { revisor: revisor.estado() });
          }
          // Pedir la revisión del director (o cancelarla mientras no empiece): una marca en este computador, fuera de git
          if (ruta === '/revision' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const yo = await leerIdentidad(raiz, id);
            if (!yo.rol) return responder(res, 403, { error: yo.problema ?? 'Este Estudio no sabe quién eres: configura git user.name y user.email.' });
            const actual = (await leerLocal(raiz)).revision;
            if ((actual?.enCurso || actual?.lanzada) && !actual.hecha) return responder(res, 400, { error: 'El director ya empezó la revisión: espera a que termine.' });
            // Pedirla exige el botón que la nombra; cancelarla, no
            if (cuerpo.pedir && !esOrigenRevision(cuerpo.origen)) return responder(res, 400, { error: 'Una revisión se pide solo con un botón que lo dice.' });
            // Ni junto a la medición del núcleo, que gasta del mismo límite de la cuenta
            if (cuerpo.pedir && midiendo()) return responder(res, 400, { error: 'Se está midiendo el núcleo del director: pide la revisión cuando termine, o detén la medición en «Modelo y consumo» › «Lo que gasta».' });
            return responder(res, 200, { revision: await pedirYLanzar(id, cuerpo.pedir ? yo.nombre : null, cuerpo.pedir ? cuerpo.origen : undefined, yo.nombre) });
          }
          // «No lo entiendo, explícamelo mejor»: la nota de ese paso, sin escribir nada, y el director solo para eso (una
          // ida y vuelta corta, sin esperar el resto de la revisión). Sin quién lo llame, la nota espera la revisión
          if (ruta === '/aclarar' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const yo = await leerIdentidad(raiz, id);
            if (!yo.rol) return responder(res, 403, { error: yo.problema ?? 'Este Estudio no sabe quién eres: configura git user.name y user.email.' });
            const local = await leerLocal(raiz);
            const r = local.revision;
            if (r?.proyecto === id && (r.enCurso || r.lanzada) && !r.hecha) return responder(res, 400, { error: 'El director está revisando: espera a que termine.' });
            const a = local.aclaracion;
            if (a && !a.hecha && !a.error) return responder(res, 400, { error: 'El director ya está aclarando un paso: espera a que termine.' });
            const plan = await leerPlan(id);
            const m = plan.misiones?.find((x) => x.id === String(cuerpo.mision ?? ''));
            const paso = Number(cuerpo.paso);
            if (!m || !Number.isInteger(paso) || paso < 0 || paso >= m.pasos.length) return responder(res, 400, { error: 'Ese paso ya no está en la misión.' });
            if (m.para !== yo.rol) return responder(res, 400, { error: 'Solo quien tiene la misión puede pedir que se le explique.' });
            const proyectoAntes = await leerProyecto(id);
            const veces = aclaracionesDe((await leerEstado(id, yo.rol, proyectoAntes)).estado.notas, m.id, paso).length;
            const texto = veces ? `Aún no lo entiendo, detállalo más (es la ${veces + 1}.ª vez que lo pido).` : 'No lo entiendo, explícamelo mejor.';
            const sobre = { tipo: 'mision', id: m.id, seccion: seccionPaso(paso), aclarar: true };
            const { estado, proyecto, que, archivos } = await enFila(() => decidir(id, { tipo: 'comentar', sobre, texto }, yo as Identidad & { rol: Persona }));
            programarCommit(id, yo.nombre, `${que}: no entiende el paso ${paso + 1} de «${m.titulo}»`, archivos);
            const nota = aclaracionesDe(estado.notas, m.id, paso).at(-1)!;
            const aclaracion = await pedirAclaracion(raiz, { proyecto: id, mision: m.id, paso, nota: nota.id, quien: yo.nombre });
            await anotar(raiz, { quien: yo.nombre, que: `pide que le expliquen mejor el ${seccionPaso(paso).toLowerCase()} de «${m.titulo}»${veces ? ` (es la ${veces + 1}.ª vez)` : ''}`, desde: `«No lo entiendo, explícamelo mejor» · misión ${m.id} › ${seccionPaso(paso)}`, proyecto: id });
            await revisor?.mirar(true).catch(() => {});
            // Si el Studio no pudo llamar al director, la aclaración quedó con su error y la revisión pedida
            const despues = await leerLocal(raiz);
            const fallo = despues.aclaracion?.nota === aclaracion.nota && !!despues.aclaracion.error;
            return responder(res, 200, { estado, proyecto, aclaracion: fallo ? null : despues.aclaracion, ...(fallo ? { revision: despues.revision?.proyecto === id ? despues.revision : null } : {}) });
          }
          // «Abrir la terminal con esta orden»: la orden sale del plan (del paso que se nombra), nunca de la petición
          if (ruta === '/terminal' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const yo = await leerIdentidad(raiz, id);
            if (!yo.rol) return responder(res, 403, { error: yo.problema ?? 'Este Estudio no sabe quién eres: configura git user.name y user.email.' });
            const m = (await leerPlan(id)).misiones?.find((x) => x.id === String(cuerpo.mision ?? ''));
            const p = m?.pasos[Number(cuerpo.paso)];
            const orden = p && typeof p !== 'string' ? p.terminal : undefined;
            if (!m || !orden) return responder(res, 400, { error: 'Ese paso ya no tiene una orden para la terminal.' });
            if (m.para !== yo.rol) return responder(res, 400, { error: 'Solo quien tiene la misión puede abrir su terminal.' });
            const r = await abrirTerminal(orden, (await leerRutaRepositorio(raiz, id)) ?? homedir());
            const paso = seccionPaso(Number(cuerpo.paso));
            await anotar(raiz, { quien: yo.nombre, que: r.ok ? `abre la terminal con la orden del ${paso.toLowerCase()} de «${m.titulo}»: ${orden}` : `no pudo abrir la terminal con la orden del ${paso.toLowerCase()} de «${m.titulo}»: ${r.error}`, desde: `«Abrir la terminal con esta orden» · misión ${m.id} › ${paso}`, proyecto: id });
            return r.ok ? responder(res, 200, {}) : responder(res, 400, { error: r.error });
          }
          // Sumarle algo hablando a una nota que el director aún no lee (nota de voz del titular nmvonrzz6tit, 25 de
          // octubre de 2026; pedido pd_tipo_voz): el audio se transcribe en este computador y se devuelve su texto, que la
          // página suma a la nota al guardarla. Ni el audio ni su texto quedan en disco: van a .estudio/, fuera de git, y
          // se borran al terminar
          if (ruta === '/dictar' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const yo = await leerIdentidad(raiz, id);
            if (!yo.rol) return responder(res, 403, { error: yo.problema ?? 'Este Estudio no sabe quién eres: configura git user.name y user.email.' });
            const audio = enDisco(raiz, await guardarAudio(raiz, '.estudio/dictados', `d${Date.now().toString(36)}`, cuerpo.audio));
            try {
              const r = await transcribirEnLocal(raiz, [audio], 'Nota para el director de un proyecto.');
              const texto = (transcripcionEnDisco(audio) ?? '').trim();
              await anotar(raiz, { quien: yo.nombre, que: texto ? 'transcribe en local lo que dijo, para sumarlo a una nota' : 'no pudo transcribir lo que dijo para sumarlo a una nota', desde: '«Corregir la nota» › Grabar', proyecto: id });
              if (texto) return responder(res, 200, { texto });
              return responder(res, 400, { error: r.ok ? 'No se entendió nada en el audio: vuelve a grabarlo, más cerca del micrófono.' : `No se pudo transcribir en este computador (${r.error ?? 'sin razón'}).` });
            } finally {
              await rm(audio, { force: true });
              await rm(txtDeAudio(audio), { force: true });
            }
          }
          // Comprobar un paso de terminal al marcarlo: la orden también sale del plan, y solo si es de las que leen
          if (ruta === '/comprobar' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const yo = await leerIdentidad(raiz, id);
            if (!yo.rol) return responder(res, 403, { error: yo.problema ?? 'Este Estudio no sabe quién eres: configura git user.name y user.email.' });
            const m = (await leerPlan(id)).misiones?.find((x) => x.id === String(cuerpo.mision ?? ''));
            const p = m?.pasos[Number(cuerpo.paso)];
            const c = p && typeof p !== 'string' ? p.comprobar : undefined;
            if (!m || !c) return responder(res, 400, { error: 'Ese paso ya no tiene cómo comprobarse.' });
            if (m.para !== yo.rol) return responder(res, 400, { error: 'Solo quien tiene la misión puede comprobar su paso.' });
            const carpeta = await leerRutaRepositorio(raiz, id);
            if (!carpeta) return responder(res, 400, { error: 'Este computador no tiene la carpeta del proyecto: no hay dónde comprobarlo.' });
            // La orden corre en este computador: a la bitácora, con lo que salió
            const comprobado = await comprobarPaso(c, carpeta);
            const paso = seccionPaso(Number(cuerpo.paso));
            await anotar(raiz, { quien: yo.nombre, que: `comprueba el ${paso.toLowerCase()} de «${m.titulo}» con «${c.orden}»: ${comprobado.cumple ? 'se cumple' : 'no se cumple'}`, desde: `marcar el paso · misión ${m.id} › ${paso}`, proyecto: id });
            return responder(res, 200, { ...comprobado, espera: /^\s*no\s+existe\s/.test(c.orden) ? 'que ya no estuviera' : /^\s*existe\s/.test(c.orden) ? 'que estuviera' : c.vacia ? 'que no saliera nada' : c.espera ? `que dijera «${c.espera}»` : 'que la orden terminara bien' });
          }
          if (ruta === '/accion' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const yo = await leerIdentidad(raiz, id);
            if (!yo.rol) return responder(res, 403, { error: yo.problema ?? 'Este Estudio no sabe quién eres: configura git user.name y user.email.' });
            const { estado, proyecto, que, archivos, audios } = await enFila(() => decidir(id, cuerpo, yo as Identidad & { rol: Persona }));
            programarCommit(id, yo.nombre, que, archivos);
            // A la bitácora de este computador: qué hizo, desde dónde y quién (o el Studio, si la página lo hizo sola en su
            // nombre: `automatico`), para poder auditarlo (nota de voz del titular, 23 de octubre de 2026)
            await anotar(raiz, eventoDeAccion(cuerpo, yo.nombre, que, id));
            transcribirLuego(id, audios, `Notas para el director del proyecto ${proyecto.nombre || id}.`);
            // Lo urgente va solo y al instante: el Studio llama al director para esas notas, sin el resto de la revisión.
            // Sin quién lo llame, las notas esperan en el Buzón: la revisión la pide la persona, con su botón (regla dura
            // del 23 de octubre de 2026; si dijo «Sí, dejarlo y pedir la revisión», la pide la página con ese origen)
            if (cuerpo.tipo === 'comentar' && que === 'deja una nota urgente para el director') {
              const respondidas = (await leerPlan(id)).respuestas ?? {};
              const notas = estado.notas.filter((n) => n.urgente && !respondidas[n.id]).map((n) => n.id);
              const urgencia = notas.length ? await pedirUrgencia(raiz, { proyecto: id, notas, quien: yo.nombre }) : null;
              // La nota ya quedó anotada como de la persona; llamar al director para ella lo hace el Studio
              if (urgencia) await anotar(raiz, { quien: EL_STUDIO, que: `pide llevarle al director, solo y al instante, lo urgente que dejó ${yo.nombre}`, desde: '«Marcar como urgente», al dejar una nota', proyecto: id });
              if (urgencia && revisor) await revisor.mirar(true).catch(() => {});
              else if (urgencia) {
                await marcarUrgencia(raiz, urgencia.pedida, { error: 'El Studio no puede llamar al director en este computador.' });
                await anotar(raiz, { quien: EL_STUDIO, que: 'no puede llamar al director en este computador: lo urgente espera en el Buzón la revisión que pida la persona', desde: '«Marcar como urgente», al dejar una nota', proyecto: id });
              }
              const local = await leerLocal(raiz);
              return responder(res, 200, { estado, proyecto, urgencia: local.urgencia?.proyecto === id ? local.urgencia : null, revision: local.revision?.proyecto === id ? local.revision : null });
            }
            return responder(res, 200, { estado, proyecto });
          }
          responder(res, 404, { error: 'No existe esa ruta del Director.' });
        } catch (e) {
          if (e instanceof Rechazo) return responder(res, 400, { error: e.message });
          responder(res, 500, { error: String(e) });
        }
      });
    },
  };
}
