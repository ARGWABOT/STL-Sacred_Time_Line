// Leer lo más nuevo del Director sin `git pull`. Cada Estudio guarda solo lo suyo (estudio/servidor/sincronizar.ts);
// para ver lo de las otras personas y lo que responde el director cuando el equipo trabaja en varios computadores, trae
// GitHub con `git fetch` y lee cada archivo de donde esté más nuevo: de la carpeta si tiene cambios propios (sin commit
// o en commits que GitHub no tiene), y si no, de su rama en GitHub. Lo de un proyecto (`proyectos/<id>/…`) vive en la
// memoria de su repositorio (`.stl/`, rama `stl`, en GitHub `origin/stl`); lo demás, en el Estudio (`origin/main`). No
// toca la carpeta de trabajo ni la rama local. Sin remoto (un solo computador), todo se lee de la carpeta. Lo usan el
// servidor del Director y tools/director/*.ts.
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { RAMA, ubicar } from './proyectos.ts';

/** Dónde leer una ruta del Estudio: su carpeta de git, la ruta dentro de ella y su rama en GitHub. */
function donde(raiz: string, ruta: string) {
  const u = ubicar(raiz, ruta);
  return { cwd: u.cwd, ruta: u.ruta, remota: u.memoria ? `origin/${RAMA}` : 'origin/main' };
}

interface Salida { ok: boolean; out: Buffer }

function git(raiz: string, args: string[], ms = 30_000): Promise<Salida> {
  return new Promise((listo) => {
    execFile(
      'git',
      ['-c', 'core.quotepath=false', ...args],
      {
        cwd: raiz,
        encoding: 'buffer',
        maxBuffer: 64 * 1024 * 1024,
        timeout: ms,
        windowsHide: true,
        // Nunca pide usuario ni contraseña en la consola: sin credenciales, falla y se sigue con lo local
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never', LANG: 'C', LC_ALL: 'C' },
      },
      (e, out) => listo({ ok: !e, out: out as Buffer }),
    );
  });
}

export interface EstadoTraida {
  /** Cuándo se trajo GitHub por última vez (ISO), o null si nunca. */
  traido: string | null;
  /** Por qué no se pudo traer, si falló la última vez. */
  error: string | null;
  /** Sin remoto `origin`: el Estudio trabaja solo en este computador. */
  local: boolean;
}

/** Trae GitHub (git fetch), como mucho una vez cada `cadaMs`; con `forzar`, ya. Nunca falla: el error queda en el estado. */
export class Traedor {
  private ultimo = 0;
  private enCurso: Promise<void> | null = null;
  estado: EstadoTraida = { traido: null, error: null, local: false };

  private readonly raiz: string;
  private readonly cadaMs: number;
  private readonly rama: string;

  /** `raiz`: la carpeta de git que se trae (la memoria de un proyecto o el Estudio); `rama`: la que se trae de GitHub. */
  constructor(raiz: string, cadaMs = 30_000, rama = RAMA) {
    this.raiz = raiz;
    this.cadaMs = cadaMs;
    this.rama = rama;
  }

  traer(forzar = false): Promise<void> {
    if (this.enCurso) return this.enCurso;
    if (!forzar && Date.now() - this.ultimo < this.cadaMs) return Promise.resolve();
    this.ultimo = Date.now();
    this.enCurso = (async () => {
      const remoto = existsSync(this.raiz) ? await git(this.raiz, ['remote', 'get-url', 'origin']) : { ok: false };
      if (!remoto.ok) {
        this.estado = { traido: null, error: null, local: true };
        return;
      }
      const r = await git(this.raiz, ['fetch', '--quiet', 'origin', this.rama], 45_000);
      this.estado = r.ok
        ? { traido: new Date().toISOString(), error: null, local: false }
        : { ...this.estado, local: false, error: 'No se pudo traer GitHub (¿sin red, sin permiso o sin la rama todavía?). Se muestra lo de este computador.' };
    })().finally(() => (this.enCurso = null));
    return this.enCurso;
  }
}

const sinCR = (b: Buffer) => (b.includes(13) ? Buffer.from(b.toString('latin1').replace(/\r\n/g, '\n'), 'latin1') : b);

async function contenidoEn(raiz: string, rev: string, ruta: string): Promise<Buffer | null> {
  const r = await git(raiz, ['show', `${rev}:${ruta}`]);
  return r.ok ? r.out : null;
}

async function hayCommits(raiz: string, rango: string, ruta: string): Promise<boolean> {
  const r = await git(raiz, ['log', '--format=%H', '-1', rango, '--', ruta]);
  return r.ok && r.out.toString().trim().length > 0;
}

/**
 * Un archivo (ruta del Estudio, con «/»), de donde esté más nuevo: la carpeta si tiene cambios propios (sin commit, o en
 * commits que GitHub no tiene), o GitHub si allá cambió después. null si no existe en ningún lado.
 */
export async function leerFresco(raizEstudio: string, rutaEstudio: string): Promise<Buffer | null> {
  const { cwd: raiz, ruta, remota } = donde(raizEstudio, rutaEstudio);
  const archivo = join(raiz, ...ruta.split('/'));
  const local = existsSync(archivo) ? await readFile(archivo) : null;
  if (!existsSync(raiz)) return local;
  const remoto = await contenidoEn(raiz, remota, ruta);
  if (!remoto) return local;
  // Con core.autocrlf (Windows), la carpeta tiene CRLF y git guarda LF: en los textos se comparan sin esa diferencia
  const texto = /\.(json|md|txt)$/.test(ruta);
  const igual = (a: Buffer, b: Buffer) => (texto ? sinCR(a).equals(sinCR(b)) : a.equals(b));
  if (!local || igual(local, remoto)) return remoto;
  const head = await contenidoEn(raiz, 'HEAD', ruta);
  if (!head || !igual(local, head)) return local; // cambios propios sin commit
  // La carpeta está como su último commit: manda quien tenga commits que el otro no
  if (await hayCommits(raiz, `${remota}..HEAD`, ruta)) return local;
  return remoto;
}

export async function leerFrescoTexto(raiz: string, ruta: string): Promise<string | null> {
  return (await leerFresco(raiz, ruta))?.toString('utf-8') ?? null;
}

/**
 * Muchos textos de una vez (las transcripciones de todas las notas de voz), con el mismo resultado que leerFrescoTexto
 * uno por uno, pero sin dos o tres procesos de git por archivo: con cientos de notas, eso eran más de 20 segundos en
 * cada carga del Studio. Un solo `git diff` dice qué archivos difieren de GitHub; los demás se leen de la carpeta (o
 * son iguales a GitHub, o tienen cambios propios sin commit, que también mandan). Sin la rama en GitHub, todo es de
 * aquí. Solo lo que difiere, o lo que falta en la carpeta, pasa por leerFresco.
 */
export async function leerFrescosTexto(raizEstudio: string, rutasEstudio: string[]): Promise<Map<string, string | null>> {
  const salida = new Map<string, string | null>();
  const grupos = new Map<string, { remota: string; rutas: [string, string][] }>();
  for (const r of new Set(rutasEstudio)) {
    const { cwd, ruta, remota } = donde(raizEstudio, r);
    const g = grupos.get(cwd) ?? { remota, rutas: [] };
    g.rutas.push([r, ruta]);
    grupos.set(cwd, g);
  }
  for (const [cwd, g] of grupos) {
    // Lo que hay que leer de a uno: lo que difiere de GitHub (null = no se pudo saber, así que todo)
    let distintos: Set<string> | null = new Set();
    if (existsSync(cwd) && (await git(cwd, ['rev-parse', '--verify', '--quiet', g.remota])).ok) {
      const d = await git(cwd, ['diff', '--name-only', 'HEAD', g.remota, '--']);
      distintos = d.ok ? new Set(d.out.toString().split('\n').map((l) => l.trim()).filter(Boolean)) : null;
    }
    for (const [estudio, ruta] of g.rutas) {
      const archivo = join(cwd, ...ruta.split('/'));
      if (distintos && !distintos.has(ruta) && existsSync(archivo)) salida.set(estudio, await readFile(archivo, 'utf-8'));
      else salida.set(estudio, await leerFrescoTexto(raizEstudio, estudio));
    }
  }
  return salida;
}

/** Los archivos de una carpeta en GitHub (rutas del Estudio, con «/»), para conocer lo que otra persona agregó. */
export async function listarRemoto(raizEstudio: string, carpetaEstudio: string): Promise<string[]> {
  const { cwd, ruta, remota } = donde(raizEstudio, carpetaEstudio);
  if (!existsSync(cwd)) return [];
  const r = await git(cwd, ['ls-tree', '-r', '--name-only', remota, ...(ruta ? ['--', ruta] : [])]);
  if (!r.ok) return [];
  // Se devuelven como rutas del Estudio, igual que se pidieron
  const prefijo = carpetaEstudio.slice(0, carpetaEstudio.length - ruta.length).replace(/\/$/, '');
  return r.out.toString().split('\n').map((l) => l.trim()).filter(Boolean).map((l) => (prefijo ? `${prefijo}/${l}` : l));
}

/**
 * Cuándo cambió por última vez un archivo (ISO): su último commit aquí o en GitHub y, si tiene cambios sin commit (o
 * no está en git), la fecha del archivo. null si no existe en ningún lado. Sirve también para el repositorio del
 * proyecto (los documentos repo:…): ahí `raizEstudio` es la carpeta del repositorio.
 */
export async function fechaDeCambio(raizEstudio: string, rutaEstudio: string): Promise<string | null> {
  const { cwd: raiz, ruta, remota } = donde(raizEstudio, rutaEstudio);
  const fechas: string[] = [];
  const archivo = join(raiz, ...ruta.split('/'));
  if (!existsSync(raiz)) return null;
  for (const ref of ['HEAD', remota]) {
    const r = await git(raiz, ['log', '-1', '--format=%cI', ref, '--', ruta]);
    const f = r.ok ? r.out.toString().trim() : '';
    if (f) fechas.push(new Date(f).toISOString());
  }
  const cambios = await git(raiz, ['status', '--porcelain', '--', ruta]);
  if (existsSync(archivo) && (!cambios.ok || cambios.out.toString().trim() || !fechas.length)) fechas.push((await stat(archivo)).mtime.toISOString());
  return fechas.sort().at(-1) ?? null;
}
