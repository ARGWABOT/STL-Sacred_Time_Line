// El Director asistente en el servidor local (solo con `npm run estudio`).
//
// Un Estudio, varios proyectos (src/director/proyectos.ts): la memoria de cada uno (su contexto, su ruta, su buzón y su
// historial) vive en SU repositorio, en la carpeta .stl/ (rama stl), y aquí se nombra proyectos/<id>/…. El Estudio solo
// guarda su código y estudio.local.json (el proyecto activo y la carpeta de cada repositorio, fuera de git). Todo lo que
// muestra y decide el Estudio es del proyecto activo de este computador. Cada Estudio escribe solo el archivo de su
// persona en ese proyecto (y sus audios) y el titular, además, lo del proyecto (proyecto.json). Cada decisión queda en un
// commit local en la memoria del proyecto y, si el titular activó la sincronización, sube sola a GitHub
// (sincronizar.ts). Lo de las otras personas, la ruta y las respuestas del director (plan.json, que escribe la sesión del
// director), las transcripciones y los documentos se leen de donde estén más nuevos (src/director/fresco.ts). Del
// repositorio del proyecto, fuera de su memoria, el Studio solo lee.
//
// GET /__estudio/director: el proyecto activo (su ruta, su estado, su repositorio, sus señales) y el resumen de todos.
// GET /documentos y /documento?ruta=docs/…|repo:…: para leer y comentar. GET /archivo?ruta=proyectos/…/notas/…: un
// audio o un adjunto de una nota. POST /proyecto-nuevo: abre la memoria en el repositorio, crea el proyecto desde la plantilla (o retoma el que ya
// tenía) y lo activa. POST /proyectos-varios: lo mismo con varios. POST /activo: cambia el proyecto activo. POST
// /repositorio: la carpeta nueva del repositorio del proyecto activo, si se movió (debe tener su memoria).
// POST /accion: una decisión firmada con la identidad de git del clon, en el proyecto activo.
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { contenerRecargas } from './recarga';
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
  estadoPersonaVacio,
  etapaArranque,
  faseActual,
  esImagen,
  hoy,
  MAX_ADJUNTO,
  MAX_ADJUNTOS,
  misionesAbiertas,
  pendientesDelDirector,
  POSTURAS,
  RUTA_ADJUNTO,
  proyectoVacio,
  repartirCommit,
  RESPUESTAS,
  sumarDias,
  TIPOS_SOBRE,
  TIPOS_VALIDACION,
  TITULAR,
  unirArchivo,
  unirEstados,
  validarEstado,
  validarPlan,
  validarProyecto,
  type Adjunto,
  type Agenda,
  type CommitFrentes,
  type EstadoDirector,
  type EstadoPersona,
  type Persona,
  type Plan,
  type Proyecto,
  type Senales,
  type TipoValidacion,
  type Validacion,
} from '../../src/director/director';
import { leerFresco, leerFrescoTexto, listarRemoto, Traedor } from '../../src/director/fresco';
import { abrirMemoria, crearProyecto, elegirActivo, enDisco, guardarActivo, guardarRutaRepositorio, idDeNombre, leerLocal, leerRutaRepositorio, marcarUrgencia, memoriaDe, pedirAclaracion, pedirRevision, pedirUrgencia, proyectosLocales, RAMA, rutasDe, ubicar } from '../../src/director/proyectos';
import { comprobarRepositorio, gitEn, leerDelRepositorio, type InfoRepositorio } from '../../src/director/repositorio';
import { transcribirEnLocal } from '../../src/director/transcripcion';
import { escanear, fuentesDeEscaneo } from './escaneo';
import { progresoDeProyecto, Revisor } from './revisor';
import { correrGit, leerIdentidad, olvidarIdentidad, Sincronizador, type Identidad } from './sincronizar';
import { abrirTerminal, comprobarPaso } from './terminal';

const DIAS_ESFUERZO = 7;
const ESPERA_COMMIT_MS = 15_000;
const CACHE_MS = 60_000;
// los audios y los adjuntos llegan en base64 desde el navegador (un tercio más que su peso)
const MAX_CUERPO = 30 * 1024 * 1024 + Math.ceil((MAX_ADJUNTOS * MAX_ADJUNTO * 4) / 3);
const MAX_AUDIO = 15 * 1024 * 1024;
const MAX_DOCS_REPO = 400;

async function leerCuerpo(req: IncomingMessage): Promise<any> {
  let datos = '';
  for await (const trozo of req) {
    datos += trozo;
    if (datos.length > MAX_CUERPO) throw new Error('El envío es demasiado grande');
  }
  return JSON.parse(datos || '{}');
}

function responder(res: ServerResponse, codigo: number, cuerpo: unknown) {
  res.statusCode = codigo;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(cuerpo));
}

/** Texto corto y limpio de lo que manda el navegador. */
const textoDe = (v: unknown, max = 2000) => String(v ?? '').trim().slice(0, max);
/** El título de un documento: su `#`, o el nombre del archivo. */
const tituloMd = (texto: string, ruta: string) => /^#\s+(.+)$/m.exec(texto)?.[1]?.trim() ?? ruta.split('/').pop()!;
/** ¿Dos rutas son la misma carpeta? (sin importar las barras ni las mayúsculas) */
const misma = (a: string, b: string) => a.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase() === b.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
const enteroDe = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));

class Rechazo extends Error {}

/** Guarda un audio grabado en el navegador (data URL de WebM, Ogg o MP4) en la carpeta de notas y devuelve su ruta. */
async function guardarAudio(raiz: string, carpeta: string, id: string, datos: unknown): Promise<string> {
  const m = /^data:audio\/(webm|ogg|mp4|x-m4a|mpeg)(?:;[^,]*)?;base64,([A-Za-z0-9+/=]+)$/.exec(String(datos ?? ''));
  if (!m) throw new Rechazo('El audio debe ser WebM, Ogg o MP4.');
  const bytes = Buffer.from(m[2], 'base64');
  if (bytes.length > MAX_AUDIO) throw new Rechazo('El audio pesa más de 15 MB: grábalo en partes.');
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
  const nombre = textoDe(a.nombre, 160).replace(/[\\/]/g, '_') || 'archivo';
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
export async function explorarCarpetas(raiz: string, pedida: string): Promise<{ ruta: string | null; padre: string | null; git: boolean; carpetas: Carpeta[]; inicios: Carpeta[] }> {
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
export async function saludDelEquipo(raiz: string): Promise<Comprobacion[]> {
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
    if (!traedores.has(m)) traedores.set(m, new Traedor(m, 30_000, RAMA));
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
  // El plan con lo archivado (director/archivo.json): el Studio lo muestra todo igual, aunque el plan ya no lo cargue
  const leerPlan = async (id: string): Promise<Plan> =>
    unirArchivo(JSON.parse((await leerFrescoTexto(raiz, rutasDe(id).plan)) ?? '{}'), JSON.parse((await leerFrescoTexto(raiz, rutasDe(id).archivo)) ?? 'null'));
  const leerProyecto = async (id: string): Promise<Proyecto> => ({ ...proyectoVacio(), ...JSON.parse((await leerFrescoTexto(raiz, rutasDe(id).proyecto)) ?? '{}') });

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

  /** Las personas con archivo de estado en un proyecto: las del equipo y las que haya en la carpeta o en GitHub. */
  async function personasConArchivo(id: string, proyecto: Proyecto): Promise<Persona[]> {
    const carpeta = rutasDe(id).equipo;
    const ids = new Set<Persona>([TITULAR, ...proyecto.equipo.map((i) => i.id)]);
    const dir = enDisco(raiz, carpeta);
    if (existsSync(dir)) for (const f of await readdir(dir)) if (f.endsWith('.json')) ids.add(f.slice(0, -5));
    for (const r of await listarRemoto(raiz, carpeta)) if (r.endsWith('.json')) ids.add(r.split('/').pop()!.slice(0, -5));
    return [...ids];
  }

  /** El archivo de una persona: el propio, de la carpeta (este Estudio es su único dueño); el de otra, lo más nuevo. */
  async function leerPersona(id: string, p: Persona, propia: boolean): Promise<EstadoPersona> {
    const ruta = rutasDe(id).persona(p);
    const local = enDisco(raiz, ruta);
    const texto = propia ? (existsSync(local) ? await readFile(local, 'utf-8') : null) : await leerFrescoTexto(raiz, ruta);
    return { ...estadoPersonaVacio(), ...(texto ? JSON.parse(texto) : {}) };
  }

  /** El estado del equipo de un proyecto, visto desde este Estudio. */
  async function leerEstado(id: string, yo: Persona | null, proyecto: Proyecto): Promise<{ propio: EstadoPersona | null; porPersona: Record<Persona, EstadoPersona>; estado: EstadoDirector }> {
    const porPersona: Record<Persona, EstadoPersona> = {};
    for (const p of await personasConArchivo(id, proyecto)) porPersona[p] = await leerPersona(id, p, p === yo);
    if (yo && !porPersona[yo]) porPersona[yo] = estadoPersonaVacio();
    return { propio: yo ? porPersona[yo] : null, porPersona, estado: unirEstados(porPersona) };
  }

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
   * la revisión del director: así el Buzón y el lugar donde se grabó muestran lo que se dijo. Si no se puede (sin WSL o
   * sin el entorno de transcripción), se anota y el director lo transcribe al revisar.
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
        for (const x of lote) {
          transcribiendo.delete(x.audio);
          if (existsSync(enDisco(raiz, txtDe(x.audio)))) programarCommit(x.id, quienGuarda || 'el Studio', 'transcribe en local una nota de voz', [txtDe(x.audio)]);
          else sinTranscribir.set(x.audio, r.error ?? 'No quedó texto.');
        }
      }
    } finally {
      transcriptorOcupado = false;
    }
  }

  // El que lanza al director cuando alguien pide una revisión (sin modelo mientras no haya nada pedido)
  let revisor: Revisor | null = null;
  const pedirYLanzar = async (id: string, quien: string | null) => {
    const r = await pedirRevision(raiz, id, quien);
    if (quien) void revisor?.mirar(true).catch(() => {});
    return r;
  };

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

  async function escribirJson(ruta: string, datos: unknown) {
    const archivo = enDisco(raiz, ruta);
    await mkdir(join(archivo, '..'), { recursive: true });
    await writeFile(archivo, JSON.stringify(datos, null, 2) + '\n', 'utf-8');
  }

  async function decidir(id: string, cuerpo: any, yo: Identidad & { rol: Persona }): Promise<{ estado: EstadoDirector; proyecto: Proyecto; que: string; archivos: string[] }> {
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
      proyecto.equipo.unshift({ id: TITULAR, nombre: yo.nombre, correo: yo.correo, cargo: 'Director de proyecto', papel: 'Dirige el proyecto: firma el objetivo, responde las propuestas y cruza las puertas.' });
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
        const nota = textoDe(cuerpo.nota, 4000);
        const audio = cuerpo.audio ? await guardarAudio(raiz, rutas.notas, `e_${m.id}_${Date.now().toString(36)}`, cuerpo.audio) : undefined;
        if (audio) archivos.push(audio);
        propio.entregas[m.id] = { cuando, quien: yo.nombre, ...(nota ? { nota } : {}), ...(audio ? { audio } : {}) };
        que = `entrega la misión «${m.titulo}»`;
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
        // En un paso con opciones: la que eligió con un clic (es la nota misma)
        const eleccion = sobre.tipo === 'mision' && typeof sobre.eleccion === 'string' ? textoDe(sobre.eleccion, 200) : '';
        // «Hazlo tú», confirmado: le encarga el paso al director (lo hace en su revisión siguiente)
        const hazlo = sobre.tipo === 'mision' && sobre.hazlo === true;
        const texto = textoDe(cuerpo.texto, 6000) || (postura === 'aprueba' ? 'Apruebo lo que recomiendas.' : eleccion);
        const nid = `n${Date.now().toString(36)}${yo.rol.slice(0, 3).replace(/-/g, '')}`;
        const lista: unknown[] = Array.isArray(cuerpo.adjuntos) ? cuerpo.adjuntos : [];
        if (lista.length > MAX_ADJUNTOS) throw new Rechazo(`Una nota lleva como mucho ${MAX_ADJUNTOS} adjuntos.`);
        if (!texto && !cuerpo.audio && !lista.length) throw new Rechazo('La nota está vacía: escribe, graba o adjunta algo.');
        // Seguir una pregunta: la que sigue debe existir y ser una pregunta (así arma su hilo)
        if (sobre.tipo === 'pregunta' && sobre.id && !estado.notas.some((x) => x.id === sobre.id && esPregunta(x))) throw new Rechazo('Esa pregunta ya no está: la conversación no se puede seguir.');
        const audio = cuerpo.audio ? await guardarAudio(raiz, rutas.notas, nid, cuerpo.audio) : undefined;
        if (audio) archivos.push(audio);
        const adjuntos: Adjunto[] = [];
        for (const [i, x] of lista.entries()) adjuntos.push(await guardarAdjunto(raiz, rutas.notas, `${nid}-${i + 1}`, x));
        archivos.push(...adjuntos.map((a) => a.ruta));
        // Urgente: una casilla, el porqué ya va en la nota (las preguntas no lo son: se responden en la revisión, como un informe)
        const urgente = sobre.tipo !== 'pregunta' && (cuerpo.urgente === true || cuerpo.urgente === 'on' || cuerpo.urgente === '1');
        propio.notas.push({
          id: nid, cuando, quien: yo.nombre,
          sobre: { tipo: sobre.tipo, ...(sobre.id ? { id: textoDe(sobre.id, 200) } : {}), ...(sobre.seccion ? { seccion: textoDe(sobre.seccion, 200) } : {}), ...(sobre.decision ? { decision: textoDe(sobre.decision, 200) } : {}), ...(sobre.fragmento ? { fragmento: textoDe(sobre.fragmento, 200) } : {}), ...(postura ? { postura } : {}), ...(sobre.tipo === 'mision' && sobre.aclarar === true ? { aclarar: true } : {}), ...(eleccion ? { eleccion } : {}), ...(hazlo ? { hazlo } : {}) },
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
        const texto = textoDe(cuerpo.texto, 6000);
        if (!texto && !n.audio && !n.adjuntos?.length) throw new Rechazo('La nota quedaría vacía: mejor bórrala.');
        if (texto) n.texto = texto;
        else delete n.texto;
        que = 'corrige una nota para el director';
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
        const texto = textoDe(cuerpo.texto, 6000);
        if (!texto) throw new Rechazo('Escribe lo que dijiste: la transcripción no puede quedar vacía.');
        const txt = audio.replace(/\.[a-z0-9]+$/i, '.txt');
        await writeFile(enDisco(raiz, txt), texto + '\n', 'utf-8');
        archivos.push(txt);
        que = 'corrige lo que se entendió de su nota de voz';
        break;
      }
      case 'marcar': {
        soloTitular('tomar la decisión final sobre un criterio');
        const c = criterio(cuerpo.criterio);
        const valor = cuerpo.estado === 'no_aplica' ? 'no_aplica' : 'cumplido';
        const nota = textoDe(cuerpo.nota, 600);
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
        const nota = textoDe(cuerpo.nota, 1000);
        propio.cierres[f.id] = { ...firma, ...(nota ? { nota } : {}) };
        que = `cruza la puerta «${f.puerta.nombre}» de la fase «${f.nombre}»`;
        break;
      }
      case 'reabrir': {
        soloTitular('reabrir una puerta');
        const f = faseDe(cuerpo.fase);
        const motivo = textoDe(cuerpo.nota, 1000);
        if (!motivo) throw new Rechazo('Para reabrir una puerta, escribe por qué.');
        // Reabrir una fase reabre también las que vinieron después
        for (const g of plan.fases.slice(plan.fases.indexOf(f))) delete propio.cierres[g.id];
        que = `reabre la fase «${f.nombre}»: ${motivo}`;
        break;
      }
      case 'excepcion': {
        const frente = plan.frentes.find((x) => x.id === cuerpo.frente);
        if (!frente) throw new Rechazo('Ese frente no está en la ruta.');
        const motivo = textoDe(cuerpo.motivo, 600);
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
        for (const k of ['contexto', 'loMejor', 'hallazgos', 'cambios'] as const) {
          const t = textoDe(v[k]);
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
        const nota = textoDe(cuerpo.nota, 1000);
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
        const textos = (x: unknown, max: number) => [...new Set((Array.isArray(x) ? (x as unknown[]) : []).filter((y): y is string => typeof y === 'string').map((y) => y.slice(0, 310)))].slice(0, max);
        const partes = textos(cuerpo.partes, 200);
        // Y las ideas de cada parte que ya marcó como entendidas
        const trozos = textos(cuerpo.trozos, 2000);
        // Marcar una idea suelta no va a la bitácora: solo cuando cambian las partes leídas
        const antes = propio.leidos?.[claveLeido(yo.rol, ruta)];
        if (antes && antes.partes.length === partes.length && partes.every((p) => antes.partes.includes(p)) && !!antes.completo === (cuerpo.completo === true)) callado = true;
        propio.leidos = { ...(propio.leidos ?? {}), [claveLeido(yo.rol, ruta)]: { partes, ...(trozos.length ? { trozos } : {}), ...(cuerpo.completo === true ? { completo: true } : {}), cuando, quien: yo.nombre } };
        que = cuerpo.completo === true ? `termina de leer ${ruta}` : `marca ${partes.length} ${partes.length === 1 ? 'parte leída' : 'partes leídas'} de ${ruta}`;
        break;
      }
      case 'anotar': {
        const texto = textoDe(cuerpo.texto, 1000);
        if (!texto) throw new Rechazo('La nota está vacía.');
        que = `anota en la bitácora: ${texto}`;
        break;
      }
      // ── Lo del proyecto: solo el titular
      case 'proyecto': {
        soloTitular('cambiar lo del proyecto');
        proyecto.nombre = textoDe(cuerpo.nombre, 120);
        proyecto.contexto = textoDe(cuerpo.contexto, 8000);
        proyecto.metaInicial = textoDe(cuerpo.metaInicial, 4000);
        if (cuerpo.terminado !== undefined) proyecto.terminado = textoDe(cuerpo.terminado, 4000);
        proyecto.repositorio = { url: textoDe(cuerpo.url, 300).replace(/\/\/[^/@]+@/, '//'), rama: textoDe(cuerpo.rama, 100) };
        if (!proyecto.nombre) throw new Rechazo('Ponle un nombre al proyecto.');
        cambiaProyecto = true;
        que = `cuenta qué es el proyecto «${proyecto.nombre}» y qué busca`;
        break;
      }
      case 'objetivo': {
        soloTitular('firmar el objetivo');
        if (proyecto.objetivo?.firmado) throw new Rechazo('Ya hay un objetivo firmado: para cambiarlo, primero reábrelo con su razón.');
        const texto = textoDe(cuerpo.texto, 1000);
        const exito = textoDe(cuerpo.exito, 1000);
        if (!texto || !exito) throw new Rechazo('Un objetivo claro dice qué se logra y cómo se sabe que se logró.');
        const horizonte = textoDe(cuerpo.horizonte, 200);
        const candidato = textoDe(cuerpo.candidato, 60);
        proyecto.objetivo = { texto, exito, ...(horizonte ? { horizonte } : {}), ...(candidato && plan.objetivos?.some((o) => o.id === candidato) ? { candidato } : {}), firmado: firma };
        cambiaProyecto = true;
        que = `firma el objetivo: ${texto}`;
        break;
      }
      case 'reabrir_objetivo': {
        soloTitular('reabrir el objetivo');
        if (!proyecto.objetivo) throw new Rechazo('No hay un objetivo firmado.');
        const motivo = textoDe(cuerpo.motivo, 1000);
        if (!motivo) throw new Rechazo('Para reabrir el objetivo, escribe por qué: queda en el historial.');
        proyecto.objetivosAnteriores = [...(proyecto.objetivosAnteriores ?? []), { ...proyecto.objetivo, reabierto: { ...firma, nota: motivo } }];
        proyecto.objetivo = null;
        cambiaProyecto = true;
        que = `reabre el objetivo: ${motivo}`;
        break;
      }
      case 'integrante': {
        soloTitular('cambiar el equipo');
        const nombre = textoDe(cuerpo.nombre, 80);
        const correo = textoDe(cuerpo.correo, 120).toLowerCase();
        if (!nombre || !/^[^@\s]+@[^@\s]+$/.test(correo)) throw new Rechazo('Escribe el nombre y el correo de git de la persona.');
        if (proyecto.equipo.some((i) => i.correo.toLowerCase() === correo)) throw new Rechazo('Ese correo ya está en el equipo.');
        const cargo = textoDe(cuerpo.cargo, 80);
        const papel = textoDe(cuerpo.papel, 300);
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
    return { estado: unido, proyecto, que, archivos };
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
      // Los del Studio (docs/, su método) se leen en «Qué es STL»: el Studio no los mezcla con los del proyecto
      salida.push({ ruta, titulo: tituloMd(texto, ruta), ...(real.startsWith(`${base}/`) ? {} : { studio: true }) });
    }
    const r = await repositorio(id);
    if (r.info) {
      const ls = await gitEn(r.info.ruta, ['ls-files', '--', '*.md', '*.MD']);
      // Si el proyecto es el propio Studio, sus documentos del método ya están en «Del Estudio» y los de los demás proyectos no son suyos
      const propio = misma(r.info.ruta, raiz);
      const mds = ls.out.split('\n').map((l) => l.trim()).filter((l) => l && !/(^|\/)(node_modules|vendor|dist|build)\//.test(l) && !(propio && /^(proyectos|docs)\//.test(l))).slice(0, MAX_DOCS_REPO);
      for (const m of mds) {
        const ruta = `repo:${m}`;
        if (!esDocumento(ruta)) continue;
        const texto = (await leerDelRepositorio(r.info.ruta, m))?.slice(0, 4000) ?? '';
        salida.push({ ruta, titulo: `${tituloMd(texto, m)} · ${m}` });
      }
    }
    return salida.sort((a, b) => Number(a.ruta.startsWith('repo:')) - Number(b.ruta.startsWith('repo:')) || a.ruta.localeCompare(b.ruta));
  }

  /** La documentación del propio Studio (docs/ en su carpeta): el método, el diseño, la difusión. Para «Qué es STL». */
  async function documentosDelStudio(): Promise<{ ruta: string; titulo: string; texto: string }[]> {
    const salida: { ruta: string; titulo: string; texto: string }[] = [];
    async function recorrer(carpeta: string) {
      const dir = enDisco(raiz, carpeta);
      if (!existsSync(dir)) return;
      for (const e of await readdir(dir, { withFileTypes: true })) {
        const ruta = `${carpeta}/${e.name}`;
        if (e.isDirectory()) await recorrer(ruta);
        else if (e.name.endsWith('.md')) {
          const texto = await readFile(enDisco(raiz, ruta), 'utf-8');
          salida.push({ ruta, titulo: tituloMd(texto, ruta), texto });
        }
      }
    }
    await recorrer('docs');
    // La metodología primero; lo demás, por su ruta
    return salida.sort((a, b) => Number(b.ruta.endsWith('/metodologia.md')) - Number(a.ruta.endsWith('/metodologia.md')) || a.ruta.localeCompare(b.ruta));
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
    configureServer(server) {
      // Cada 15 segundos mira si hay una revisión pedida que nadie tomó: es leer un archivo, no gasta nada
      revisor = new Revisor(raiz);
      const reloj = setInterval(() => void revisor?.mirar().catch(() => {}), 15_000);
      reloj.unref?.();
      server.httpServer?.on('close', () => clearInterval(reloj));
      // Mientras el director trabaja, la página no se recarga a pedazos: una sola vez, al final (recarga.ts)
      contenerRecargas(server, raiz, () => !!revisor?.estado().revisando);
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
          if (ruta === '/' && req.method === 'GET') {
            const fresco = url.searchParams.has('fresco');
            if (fresco) caches.clear();
            const id = await activo();
            if (id) await traedorDe(id).traer(fresco);
            const identidad = await leerIdentidad(raiz, id);
            const proyectos = await resumenProyectos();
            const sincronizacion = id ? { ...traedorDe(id).estado, subida: syncDe(id).estado() } : { traido: null, error: null, local: true, subida: null };
            await revisor?.preparar();
            if (!id) return responder(res, 200, { sinProyectos: true, proyectos, identidad, sincronizacion, hoy: hoy() });
            const [plan, proyecto, r] = await Promise.all([leerPlan(id), leerProyecto(id), repositorio(id, fresco)]);
            const { estado } = await leerEstado(id, identidad.rol, proyecto);
            // La transcripción de cada audio (la deja tools/director/transcribir.py junto al audio, como .txt)
            const transcripciones: Record<string, string> = {};
            const audios = [...estado.notas.map((n) => n.audio), ...Object.values(estado.entregas).map((e) => e.audio)].filter(Boolean) as string[];
            for (const a of audios) {
              const t = await leerFrescoTexto(raiz, a.replace(/\.[a-z0-9]+$/, '.txt'));
              if (t !== null) transcripciones[a] = t.trim(); // vacía: el audio no tenía voz
            }
            transcribirLuego(id, audios.filter((a) => !transcripciones[a]), `Notas para el director del proyecto ${proyecto.nombre || id}.`);
            const personas = proyecto.equipo.length ? proyecto.equipo.map((i) => i.id) : [TITULAR];
            return responder(res, 200, {
              activo: id,
              proyectos,
              plan,
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
              // El paso que alguien pidió aclarar («No lo entiendo»), si es de este proyecto
              aclaracion: ((a) => (a?.proyecto === id ? a : null))((await leerLocal(raiz)).aclaracion),
              // Las notas urgentes que el director atiende aparte, al instante, si son de este proyecto
              urgencia: ((u) => (u?.proyecto === id ? u : null))((await leerLocal(raiz)).urgencia),
              // La última vuelta de la sesión del director (/vigila): si es vieja, nadie está mirando las revisiones pedidas
              vigilia: (await leerLocal(raiz)).vigilia ?? null,
              // Si el Studio lanza solo al director, o por qué no puede
              revisor: revisor?.estado() ?? null,
              // Lo que va haciendo el director que lanzó el Studio, mientras revisa (el Studio lo muestra en vivo)
              progreso: await (async () => {
                const r = (await leerLocal(raiz)).revision;
                return r?.proyecto === id && r.lanzada && !r.hecha ? progresoDeProyecto(raiz, id) : null;
              })(),
              hoy: hoy(),
              errores: [...validarPlan(plan, personas), ...validarEstado(estado, plan), ...validarProyecto(proyecto)],
            });
          }
          if (ruta === '/proyecto-nuevo' && req.method === 'POST') {
            // Un proyecto para el Studio. Existente: su repositorio (el director lo diagnostica y propone los objetivos).
            // Nuevo: su explicación, su objetivo y cuándo se considera completo (el director lo plantea). Quien lo crea
            // queda como titular
            const cuerpo = await leerCuerpo(req);
            const yo = await leerIdentidad(raiz, null);
            if (!yo.nombre || !yo.correo) return responder(res, 403, { error: 'Configura tu identidad de git (user.name y user.email) en la carpeta del Estudio.' });
            const nombre = textoDe(cuerpo.nombre, 120);
            if (!nombre) return responder(res, 400, { error: 'Ponle un nombre al proyecto.' });
            const tipo = cuerpo.tipo === 'nuevo' ? 'nuevo' : 'existente';
            const rutaRepo = textoDe(cuerpo.ruta, 500);
            if (!rutaRepo) return responder(res, 400, { error: tipo === 'nuevo' ? 'Elige la carpeta donde vivirá el proyecto: su memoria se guarda ahí.' : 'Elige la carpeta del repositorio del proyecto con «Explorar…».' });
            if (tipo === 'nuevo' && (!textoDe(cuerpo.contexto) || !textoDe(cuerpo.metaInicial)))
              return responder(res, 400, { error: 'Un proyecto nuevo necesita su explicación y a dónde quieres llegar con él.' });
            // Un proyecto nuevo puede empezar en una carpeta sin git: se le inicia (es la carpeta que eligió su titular)
            if (tipo === 'nuevo' && existsSync(rutaRepo) && !(await gitEn(rutaRepo, ['rev-parse', '--show-toplevel'])).ok) await gitEn(rutaRepo, ['init', '-q']);
            const c = await comprobarRepositorio(rutaRepo);
            if (!c.ok) return responder(res, 400, { error: c.error });
            // El Studio también puede ser un proyecto (se dirige a sí mismo); lo que no puede es entrar dos veces
            if (Object.values((await leerLocal(raiz)).repositorios).some((x) => misma(x, c.info.ruta))) return responder(res, 400, { error: 'Ese repositorio ya está en el Studio.' });
            const id = await entregar({ nombre, ruta: c.info.ruta, remoto: textoDe(cuerpo.url, 300).replace(/\/\/[^/@]+@/, '//') || c.info.remoto || '', yo, tipo, contexto: textoDe(cuerpo.contexto, 8000), metaInicial: textoDe(cuerpo.metaInicial, 4000), terminado: textoDe(cuerpo.terminado, 4000) });
            await guardarActivo(raiz, id);
            olvidarIdentidad();
            // Entregar es pedirle al director que lo mire
            await pedirYLanzar(id, yo.nombre);
            return responder(res, 200, { id });
          }
          if (ruta === '/salud' && req.method === 'GET') return responder(res, 200, await saludDelEquipo(raiz));
          // La documentación del Studio, para «Qué es STL» (se ve aunque no haya proyectos)
          if (ruta === '/studio-docs' && req.method === 'GET') return responder(res, 200, { documentos: await documentosDelStudio() });
          // Escanear el equipo: qué se puede escanear (para pedir permiso) y el escaneo con lo que el usuario permitió
          if (ruta === '/escanear/fuentes' && req.method === 'GET') return responder(res, 200, await fuentesDeEscaneo());
          if (ruta === '/escanear' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const agentes = Array.isArray(cuerpo.agentes) ? cuerpo.agentes.map(String) : [];
            const unidades = Array.isArray(cuerpo.unidades) ? cuerpo.unidades.map(String).filter((u: string) => existsSync(u)) : [];
            if (!agentes.length && !unidades.length) return responder(res, 400, { error: 'Elige al menos un agente o una unidad para escanear.' });
            const local = await leerLocal(raiz);
            return responder(res, 200, await escanear(raiz, { agentes, unidades }, Object.values(local.repositorios)));
          }
          // Varios proyectos existentes a la vez (líneas o escaneo): la memoria de cada uno en su repositorio; el director
          // los diagnostica en sus próximas revisiones
          if (ruta === '/proyectos-varios' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const yo = await leerIdentidad(raiz, null);
            if (!yo.nombre || !yo.correo) return responder(res, 403, { error: 'Configura tu identidad de git (user.name y user.email) en la carpeta del Estudio.' });
            const lista: { nombre?: unknown; ruta?: unknown; historialIA?: unknown }[] = Array.isArray(cuerpo.proyectos) ? cuerpo.proyectos.slice(0, 60) : [];
            if (!lista.length) return responder(res, 400, { error: 'No hay proyectos para agregar.' });
            const creados: { id: string; nombre: string }[] = [];
            const errores: string[] = [];
            const local = await leerLocal(raiz);
            const yaEstan = Object.values(local.repositorios);
            for (const x of lista) {
              const nombre = textoDe(x.nombre, 120);
              const c = await comprobarRepositorio(textoDe(x.ruta, 500));
              if (!nombre) { errores.push('Una línea no tiene nombre.'); continue; }
              if (!c.ok) { errores.push(`«${nombre}»: ${c.error}`); continue; }
              if (yaEstan.some((y) => misma(y, c.info.ruta))) { errores.push(`«${nombre}»: ese repositorio ya está en el Studio.`); continue; }
              const historialIA = Array.isArray(x.historialIA)
                ? x.historialIA.slice(0, 5).map((s: any) => ({ agente: textoDe(s?.agente, 40), ...(s?.sesiones ? { sesiones: enteroDe(s.sesiones) } : {}), ...(s?.ultima ? { ultima: textoDe(s.ultima, 40) } : {}), ...(s?.donde ? { donde: textoDe(s.donde, 500) } : {}) })).filter((s: { agente: string }) => s.agente)
                : [];
              try {
                const id = await entregar({ nombre, ruta: c.info.ruta, remoto: c.info.remoto ?? '', yo, tipo: 'existente', contexto: '', metaInicial: '', terminado: '', historialIA });
                yaEstan.push(c.info.ruta);
                creados.push({ id, nombre });
              } catch (e) {
                errores.push(`«${nombre}»: ${(e as Error).message}`);
              }
            }
            if (creados.length) {
              if (!local.activo) await guardarActivo(raiz, creados[0].id);
              olvidarIdentidad();
              // La revisión del proyecto activo diagnostica también la cola de los recién entregados
              await pedirYLanzar((await activo()) ?? creados[0].id, yo.nombre);
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
          if (ruta === '/activo' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const id = String(cuerpo.id ?? '');
            if (!(await listarIds()).includes(id)) return responder(res, 404, { error: 'Ese proyecto no está.' });
            await guardarActivo(raiz, id);
            olvidarIdentidad();
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
              const nombre = textoDe(url.searchParams.get('nombre'), 160).replace(/["\\\r\n]/g, '_') || pedido.split('/').pop()!;
              res.setHeader('Content-Type', 'application/octet-stream');
              res.setHeader('Content-Disposition', `attachment; filename="${nombre.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(nombre)}`);
            }
            return res.end(datos);
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
            return responder(res, 200, { info: c.info });
          }
          // Pedir la revisión del director (o cancelarla mientras no empiece): una marca en este computador, fuera de git
          if (ruta === '/revision' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const yo = await leerIdentidad(raiz, id);
            if (!yo.rol) return responder(res, 403, { error: yo.problema ?? 'Este Estudio no sabe quién eres: configura git user.name y user.email.' });
            const actual = (await leerLocal(raiz)).revision;
            if ((actual?.enCurso || actual?.lanzada) && !actual.hecha) return responder(res, 400, { error: 'El director ya empezó la revisión: espera a que termine.' });
            return responder(res, 200, { revision: await pedirYLanzar(id, cuerpo.pedir ? yo.nombre : null) });
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
            return r.ok ? responder(res, 200, {}) : responder(res, 400, { error: r.error });
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
            return responder(res, 200, { ...(await comprobarPaso(c, carpeta)), espera: /^\s*no\s+existe\s/.test(c.orden) ? 'que ya no estuviera' : /^\s*existe\s/.test(c.orden) ? 'que estuviera' : c.vacia ? 'que no saliera nada' : c.espera ? `que dijera «${c.espera}»` : 'que la orden terminara bien' });
          }
          if (ruta === '/accion' && req.method === 'POST') {
            const cuerpo = await leerCuerpo(req);
            const yo = await leerIdentidad(raiz, id);
            if (!yo.rol) return responder(res, 403, { error: yo.problema ?? 'Este Estudio no sabe quién eres: configura git user.name y user.email.' });
            const { estado, proyecto, que, archivos } = await enFila(() => decidir(id, cuerpo, yo as Identidad & { rol: Persona }));
            programarCommit(id, yo.nombre, que, archivos);
            transcribirLuego(id, archivos.filter((a) => /\.(webm|ogg|m4a|mp3)$/.test(a)), `Notas para el director del proyecto ${proyecto.nombre || id}.`);
            // Lo urgente va solo y al instante: el Studio llama al director para esas notas, sin el resto de la revisión.
            // Sin quién lo llame, las notas esperan la revisión, que se pide
            if (cuerpo.tipo === 'comentar' && que === 'deja una nota urgente para el director') {
              const respondidas = (await leerPlan(id)).respuestas ?? {};
              const notas = estado.notas.filter((n) => n.urgente && !respondidas[n.id]).map((n) => n.id);
              const urgencia = notas.length ? await pedirUrgencia(raiz, { proyecto: id, notas, quien: yo.nombre }) : null;
              if (urgencia && revisor) await revisor.mirar(true).catch(() => {});
              else {
                if (urgencia) await marcarUrgencia(raiz, urgencia.pedida, { error: 'El Studio no puede llamar al director en este computador.' });
                const r = (await leerLocal(raiz)).revision;
                if (!r || r.hecha || r.proyecto !== id) await pedirYLanzar(id, yo.nombre);
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
