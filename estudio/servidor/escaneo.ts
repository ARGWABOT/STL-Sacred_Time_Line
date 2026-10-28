// Escanear el equipo: encontrar, de forma determinista, los proyectos que el usuario desarrolla con IA en este
// computador, para entregárselos al director de una vez. Dos fuentes, y las dos solo con el permiso explícito del
// usuario en el Studio:
//
// 1. Los historiales de los agentes de IA de la cuenta actual. Cada sesión deja escrita su carpeta de trabajo:
//    - Claude Code: ~/.claude/projects/<carpeta>/*.jsonl, campo "cwd" en las primeras líneas.
//    - Codex: ~/.codex/sessions/AAAA/MM/DD/rollout-*.jsonl, campo "cwd" de su session_meta.
//    - Cursor: %APPDATA%/Cursor/User/workspaceStorage/*/workspace.json, campo "folder".
//    Solo se leen los primeros KB de cada archivo, para sacar la carpeta: nunca el contenido de las conversaciones.
// 2. Las unidades que el usuario elija: se recorren buscando repositorios git con señales de trabajo con IA
//    (CLAUDE.md, AGENTS.md, .claude/, .cursor/, .cursorrules, .github/copilot-instructions.md), con límite de profundidad,
//    de carpetas y de tiempo, y sin entrar a carpetas del sistema ni de dependencias.
//
// Cada candidato se normaliza a la raíz de su repositorio git (las carpetas de trabajo temporales de los agentes, como
// .claude/worktrees/, se llevan a su repositorio). Solo los repositorios git se pueden entregar como proyecto existente.
import { existsSync } from 'node:fs';
import { open, readdir, readFile, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { gitEn } from '../../src/director/repositorio';

export interface Senal { agente: string; sesiones?: number; ultima?: string; donde?: string }
export interface Candidato {
  ruta: string;
  nombre: string;
  senales: Senal[];
  /** Lo más reciente que se sabe de él (ISO). */
  ultima: string | null;
  /** Ya está en el Studio (con este repositorio). */
  yaEsta: boolean;
}
export interface FuentesEscaneo {
  agentes: { id: string; nombre: string; donde: string; existe: boolean }[];
  unidades: string[];
}

const SALTAR = new Set(['node_modules', '.git', 'vendor', 'dist', 'build', 'out', '.next', '.cache', '.npm', '.venv', 'venv', '__pycache__', 'target',
  'Windows', 'Program Files', 'Program Files (x86)', 'ProgramData', 'AppData', '$Recycle.Bin', 'System Volume Information', 'Recovery', 'PerfLogs',
  'Library', 'Applications', 'proc', 'sys', 'dev', 'snap', 'usr', 'bin', 'sbin', 'etc', 'var', 'boot', 'lib', 'lib64', 'opt']);
const MARCAS = ['CLAUDE.md', 'AGENTS.md', '.claude', '.cursor', '.cursorrules', join('.github', 'copilot-instructions.md')];
const MAX_PROFUNDIDAD = 6;
const MAX_CARPETAS = 40_000;
const MAX_MS = 25_000;

const appData = () => process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming');

/** Lo que se puede escanear en este computador: los historiales de agentes que existen y las unidades. */
export async function fuentesDeEscaneo(): Promise<FuentesEscaneo> {
  const agentes = [
    { id: 'claude', nombre: 'Claude Code', donde: join(homedir(), '.claude', 'projects') },
    { id: 'codex', nombre: 'Codex', donde: join(homedir(), '.codex', 'sessions') },
    { id: 'cursor', nombre: 'Cursor', donde: join(appData(), 'Cursor', 'User', 'workspaceStorage') },
  ].map((a) => ({ ...a, existe: existsSync(a.donde) }));
  const unidades = process.platform === 'win32'
    ? 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => `${l}:\\`).filter((u) => existsSync(u))
    : [homedir(), '/'];
  return { agentes, unidades };
}

/** El campo "cwd" de las primeras líneas de un JSONL (sin leer la conversación). */
async function cwdDe(archivo: string): Promise<string | null> {
  let h;
  try {
    h = await open(archivo, 'r');
    const b = Buffer.alloc(64 * 1024);
    const { bytesRead } = await h.read(b, 0, b.length, 0);
    const m = /"cwd":"((?:[^"\\]|\\.)*)"/.exec(b.toString('utf8', 0, bytesRead));
    return m ? JSON.parse(`"${m[1]}"`) : null;
  } catch {
    return null;
  } finally {
    await h?.close();
  }
}

async function recorrerJsonl(dir: string, salida: string[], profundidad = 0) {
  if (profundidad > 5) return;
  let entradas;
  try { entradas = await readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entradas) {
    const r = join(dir, e.name);
    if (e.isDirectory()) await recorrerJsonl(r, salida, profundidad + 1);
    else if (e.name.endsWith('.jsonl')) salida.push(r);
  }
}

/** Lleva una carpeta de trabajo a la raíz de su repositorio (también desde los worktrees de los agentes). */
async function raizGit(ruta: string): Promise<string | null> {
  const limpia = ruta.replace(/[\\/]\.claude[\\/]worktrees[\\/].*$/i, '').replace(/[\\/]\.codex[\\/]worktrees[\\/].*$/i, '');
  if (!existsSync(limpia)) return null;
  const top = await gitEn(limpia, ['rev-parse', '--show-toplevel'], 8000);
  return top.ok ? resolve(top.out.trim()) : null;
}

/** Escanea con lo que el usuario permitió: los historiales de los agentes elegidos y las unidades elegidas. */
export async function escanear(raizEstudio: string, permiso: { agentes: string[]; unidades: string[] }, rutasEnEstudio: string[]): Promise<{ candidatos: Candidato[]; omitidas: number; aviso: string | null }> {
  const porRuta = new Map<string, Candidato>();
  const clave = (r: string) => r.toLowerCase().replace(/\\/g, '/').replace(/\/$/, '');
  const estudio = clave(resolve(raizEstudio));
  const enEstudio = new Set(rutasEnEstudio.map((r) => clave(resolve(r))));
  let omitidas = 0;
  let aviso: string | null = null;
  const cache = new Map<string, string | null>();
  const raiz = async (r: string) => {
    const k = clave(r);
    if (!cache.has(k)) cache.set(k, await raizGit(r));
    return cache.get(k)!;
  };
  async function sumar(ruta: string, senal: Senal) {
    const r = await raiz(ruta);
    if (!r) { omitidas++; return; }
    const k = clave(r);
    if (k === estudio) return;
    const c = porRuta.get(k) ?? { ruta: r, nombre: basename(r), senales: [], ultima: null, yaEsta: enEstudio.has(k) };
    const previa = c.senales.find((s) => s.agente === senal.agente);
    if (previa) {
      previa.sesiones = (previa.sesiones ?? 0) + (senal.sesiones ?? 0);
      if (senal.ultima && (!previa.ultima || senal.ultima > previa.ultima)) previa.ultima = senal.ultima;
    } else c.senales.push(senal);
    if (senal.ultima && (!c.ultima || senal.ultima > c.ultima)) c.ultima = senal.ultima;
    porRuta.set(k, c);
  }

  // ── Los historiales de los agentes
  const fuentes = await fuentesDeEscaneo();
  for (const a of fuentes.agentes.filter((x) => x.existe && permiso.agentes.includes(x.id))) {
    if (a.id === 'claude') {
      for (const d of await readdir(a.donde, { withFileTypes: true }).catch(() => [])) {
        if (!d.isDirectory()) continue;
        const archivos = (await readdir(join(a.donde, d.name)).catch(() => [] as string[])).filter((x) => x.endsWith('.jsonl'));
        if (!archivos.length) continue;
        const fechas = await Promise.all(archivos.map(async (x) => (await stat(join(a.donde, d.name, x))).mtime.toISOString()));
        const ultimo = archivos[fechas.indexOf(fechas.slice().sort().at(-1)!)];
        const cwd = await cwdDe(join(a.donde, d.name, ultimo));
        if (cwd) await sumar(cwd, { agente: 'Claude Code', sesiones: archivos.length, ultima: fechas.sort().at(-1), donde: join(a.donde, d.name) });
      }
    } else if (a.id === 'codex') {
      const archivos: string[] = [];
      await recorrerJsonl(a.donde, archivos);
      for (const f of archivos) {
        const cwd = await cwdDe(f);
        if (cwd) await sumar(cwd, { agente: 'Codex', sesiones: 1, ultima: (await stat(f)).mtime.toISOString() });
      }
    } else if (a.id === 'cursor') {
      for (const d of await readdir(a.donde, { withFileTypes: true }).catch(() => [])) {
        const ws = join(a.donde, d.name, 'workspace.json');
        if (!existsSync(ws)) continue;
        try {
          const folder: string = JSON.parse(await readFile(ws, 'utf8')).folder ?? '';
          if (!folder.startsWith('file://')) continue;
          let ruta = decodeURIComponent(folder.replace(/^file:\/\//, ''));
          if (process.platform === 'win32') ruta = ruta.replace(/^\/([a-zA-Z]):/, '$1:').replace(/\//g, '\\');
          await sumar(ruta, { agente: 'Cursor', sesiones: 1, ultima: (await stat(ws)).mtime.toISOString() });
        } catch {
          // un workspace a medio escribir
        }
      }
    }
  }

  // ── Las unidades: repositorios git con señales de trabajo con IA
  if (permiso.unidades.length) {
    const inicio = Date.now();
    let vistas = 0;
    const cola: { dir: string; nivel: number }[] = permiso.unidades.map((u) => ({ dir: u, nivel: 0 }));
    while (cola.length) {
      if (vistas > MAX_CARPETAS || Date.now() - inicio > MAX_MS) { aviso = 'El recorrido de las unidades llegó a su límite de tiempo o de carpetas: puede que falten proyectos muy profundos.'; break; }
      const { dir, nivel } = cola.shift()!;
      vistas++;
      if (existsSync(join(dir, '.git'))) {
        const marcas = MARCAS.filter((m) => existsSync(join(dir, m)));
        if (marcas.length) await sumar(dir, { agente: 'Archivos de IA', donde: marcas.join(', ') });
        continue; // no se entra a un repositorio
      }
      if (nivel >= MAX_PROFUNDIDAD) continue;
      let entradas;
      try { entradas = await readdir(dir, { withFileTypes: true }); } catch { continue; }
      for (const e of entradas) if (e.isDirectory() && !SALTAR.has(e.name) && !e.name.startsWith('$')) cola.push({ dir: join(dir, e.name), nivel: nivel + 1 });
    }
  }

  const candidatos = [...porRuta.values()].sort((a, b) => Number(a.yaEsta) - Number(b.yaEsta) || (b.ultima ?? '').localeCompare(a.ultima ?? '') || a.nombre.localeCompare(b.nombre));
  return { candidatos, omitidas, aviso };
}
