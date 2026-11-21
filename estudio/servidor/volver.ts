// «Volver a la versión que funcionaba» (pd_salud_a, «Autorreparación», capa uno; decisión nmw9gq7sftit, 9 de noviembre de
// 2026): sin el modelo, devuelve el código del Studio a la última versión que cargó sin errores en la prueba antes de cerrar
// (bandeja.ts --listo la anota aquí). Antes muestra cuál es (nmw9oexiptit); si la carpeta tiene cambios sin commit, los
// guarda primero en una rama de respaldo local (nmw9oenmatit). Vuelve con un commit nuevo, hijo del de ahora: nunca reescribe
// la historia, y nunca toca .stl/ ni proyectos/ (la memoria de los proyectos, fuera de git en esta rama). Lo anotado vive en
// .estudio/, solo de este computador, como el registro de fallas (ultimaCaida.ts).
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ARCHIVO_VERSION = 'version-buena.json';
/** Lo que «Volver» nunca toca: la memoria de los proyectos. */
const INTOCABLES = ['.stl/', 'proyectos/'];

export interface VersionBuena {
  /** El commit completo que cargó. */
  commit: string;
  /** Cuándo pasó la prueba antes de cerrar. */
  cuando: string;
}

export type Git = (args: string[], env?: Record<string, string>) => Promise<{ ok: boolean; out: string; err: string }>;

/** git en `cwd`, con un entorno extra si hace falta (el índice de respaldo). */
export function gitDe(cwd: string): Git {
  return (args, env) =>
    new Promise((listo) => {
      execFile('git', ['-c', 'core.quotepath=false', ...args], {
        cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 60_000, windowsHide: true,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0', LANG: 'C', LC_ALL: 'C', ...(env ?? {}) },
      }, (e, out, err) => listo({ ok: !e, out: String(out ?? ''), err: String(err ?? '') }));
    });
}

/** La última versión que funcionó, o null. */
export function leerVersionBuena(carpeta: string): VersionBuena | null {
  const archivo = join(carpeta, ARCHIVO_VERSION);
  if (!existsSync(archivo)) return null;
  try {
    const v = JSON.parse(readFileSync(archivo, 'utf8')) as VersionBuena;
    return v && /^[0-9a-f]{40}$/.test(v.commit) && typeof v.cuando === 'string' ? v : null;
  } catch {
    return null;
  }
}

/**
 * Anota la versión de ahora como la que funciona, si la prueba antes de cerrar la cargó: el commit de HEAD, solo si no hay
 * cambios sin commit en lo que git guarda (si los hay, lo que cargó no es ese commit y no se anota). Devuelve lo anotado.
 */
export async function anotarVersionBuena(carpeta: string, git: Git, cuando = new Date().toISOString()): Promise<VersionBuena | null> {
  const head = await git(['rev-parse', 'HEAD']);
  const estado = await git(['status', '--porcelain', '--untracked-files=no']);
  if (!head.ok || !estado.ok || estado.out.trim()) return null;
  const v: VersionBuena = { commit: head.out.trim(), cuando };
  mkdirSync(carpeta, { recursive: true });
  writeFileSync(join(carpeta, ARCHIVO_VERSION), JSON.stringify(v, null, 2));
  return v;
}

/** Lo que la pantalla de emergencia muestra antes de volver (nmw9oexiptit). */
export type InfoVuelta =
  | { estado: 'lista'; commit: string; corto: string; fecha: string; despues: number; sinGuardar: number }
  | { estado: 'sin_version' | 'ya_esta' | 'no_sirve'; detalle?: string };

/** Lo que salió al volver. */
export type ResultadoVuelta =
  | { estado: 'hecha'; commit: string; fecha: string; respaldo: string | null }
  | { estado: 'sin_version' | 'ya_esta' | 'no_sirve' | 'fallo'; detalle?: string };

/** Los archivos de la memoria que cambiarían entre dos versiones (no debería haber ninguno). Pura. */
export function tocaLaMemoria(rutas: string[]): string[] {
  return rutas.filter((r) => INTOCABLES.some((p) => r === p.slice(0, -1) || r.startsWith(p)));
}

/** El nombre de la rama de respaldo, con la hora. Pura. */
export function ramaDeRespaldo(cuando: string): string {
  return `respaldo/antes-de-volver-${cuando.replace(/\.\d+Z$/, '').replace(/[-:]/g, '').replace('T', '-')}`;
}

async function revisar(git: Git, v: VersionBuena | null): Promise<InfoVuelta> {
  if (!v) return { estado: 'sin_version' };
  if (!(await git(['cat-file', '-e', `${v.commit}^{commit}`])).ok) return { estado: 'no_sirve', detalle: 'el commit anotado ya no existe' };
  if (!(await git(['merge-base', '--is-ancestor', v.commit, 'HEAD'])).ok) return { estado: 'no_sirve', detalle: 'el commit anotado no está en la historia de la rama de ahora' };
  const difiere = await git(['diff', '--name-only', v.commit, 'HEAD']);
  if (!difiere.ok) return { estado: 'no_sirve', detalle: difiere.err.trim() };
  const memoria = tocaLaMemoria(difiere.out.split(/\r?\n/).filter(Boolean));
  if (memoria.length) return { estado: 'no_sirve', detalle: `tocaría la memoria: ${memoria.slice(0, 3).join(', ')}` };
  const sinGuardar = (await git(['status', '--porcelain'])).out.split(/\r?\n/).filter(Boolean).length;
  if (!difiere.out.trim() && !sinGuardar) return { estado: 'ya_esta' };
  const despues = Number((await git(['rev-list', '--count', `${v.commit}..HEAD`])).out.trim()) || 0;
  const fecha = (await git(['show', '-s', '--format=%cI', v.commit])).out.trim();
  return { estado: 'lista', commit: v.commit, corto: v.commit.slice(0, 7), fecha, despues, sinGuardar };
}

/** Qué versión se recuperaría, para mostrarla antes de volver. */
export function infoDeVuelta(carpeta: string, git: Git): Promise<InfoVuelta> {
  return revisar(git, leerVersionBuena(carpeta));
}

/**
 * Vuelve a la versión que funcionaba: guarda lo que no tiene commit en una rama de respaldo (con un índice aparte, sin tocar
 * la carpeta), hace un commit nuevo con el árbol de esa versión encima del de ahora y deja la carpeta en él. `esperado` es el
 * commit que la persona vio: si cambió entre tanto, no vuelve.
 */
export async function volverALaVersion(carpeta: string, git: Git, esperado?: string, ahora = new Date().toISOString()): Promise<ResultadoVuelta> {
  const v = leerVersionBuena(carpeta);
  const info = await revisar(git, v);
  if (info.estado !== 'lista') return info;
  if (esperado && esperado !== info.commit) return { estado: 'no_sirve', detalle: 'la versión cambió desde que se mostró' };
  const head = (await git(['rev-parse', 'HEAD'])).out.trim();
  let respaldo: string | null = null;
  if (info.sinGuardar) {
    // Todo lo de la carpeta que git no ignora, en un commit hijo de HEAD, sin tocar el índice ni los archivos de la persona
    const indice = join(tmpdir(), `stl-respaldo-${process.pid}-${Date.now()}.index`);
    const env = { GIT_INDEX_FILE: indice };
    try {
      const pasos = [await git(['read-tree', 'HEAD'], env), await git(['add', '-A'], env)];
      const arbol = await git(['write-tree'], env);
      if (pasos.some((p) => !p.ok) || !arbol.ok) return { estado: 'fallo', detalle: `no se pudo guardar el respaldo: ${[...pasos, arbol].map((p) => p.err.trim()).filter(Boolean).join(' ')}` };
      const commit = await git(['commit-tree', arbol.out.trim(), '-p', head, '-m', `Studio: backup of the uncommitted changes before going back to ${info.corto}`]);
      if (!commit.ok) return { estado: 'fallo', detalle: `no se pudo guardar el respaldo: ${commit.err.trim()}` };
      respaldo = ramaDeRespaldo(ahora);
      const rama = await git(['branch', respaldo, commit.out.trim()]);
      if (!rama.ok) return { estado: 'fallo', detalle: `no se pudo crear la rama de respaldo: ${rama.err.trim()}` };
    } finally {
      rmSync(indice, { force: true });
    }
  }
  const arbolBueno = await git(['rev-parse', `${info.commit}^{tree}`]);
  const nuevo = await git(['commit-tree', arbolBueno.out.trim(), '-p', head, '-m', `Studio: goes back to the version that worked (${info.corto}, ${info.fecha.slice(0, 10)})`]);
  if (!arbolBueno.ok || !nuevo.ok) return { estado: 'fallo', detalle: `no se pudo hacer el commit: ${(nuevo.err || arbolBueno.err).trim()}${respaldo ? ` (los cambios ya están en ${respaldo})` : ''}` };
  // El commit nuevo es hijo de HEAD: la rama avanza, no se reescribe nada. Lo que no tenía commit ya está en el respaldo
  const dejar = await git(['reset', '--hard', nuevo.out.trim()]);
  if (!dejar.ok) return { estado: 'fallo', detalle: `no se pudo dejar la carpeta en la versión: ${dejar.err.trim()}` };
  return { estado: 'hecha', commit: nuevo.out.trim(), fecha: info.fecha, respaldo };
}
