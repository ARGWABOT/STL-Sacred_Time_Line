// El repositorio de un proyecto que dirige el Director asistente: comprobar que es un repositorio git y leer sus
// archivos. El director solo lo lee (para el diagnóstico, los documentos repo:… y el esfuerzo); nunca escribe en él. La
// ruta de cada proyecto en este computador está en estudio.local.json (src/director/proyectos.ts). Lo usan el servidor
// del Estudio y tools/director/*.ts (por eso no importa nada relativo: Node lo corre tal cual).
import { execFile } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

export function gitEn(cwd: string, args: string[], ms = 30_000): Promise<{ ok: boolean; out: string; err: string }> {
  return new Promise((listo) => {
    execFile(
      'git',
      ['-c', 'core.quotepath=false', ...args],
      { cwd, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, timeout: ms, windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never', LANG: 'C', LC_ALL: 'C' } },
      (e, out, err) => listo({ ok: !e, out: String(out ?? ''), err: String(err ?? '') }),
    );
  });
}

export interface InfoRepositorio {
  /** La raíz del repositorio (la que devuelve git). */
  ruta: string;
  rama: string;
  remoto: string | null;
  ultimo: { fecha: string; autor: string; asunto: string } | null;
  commits: number;
  archivos: number;
  /** Archivos con cambios sin commit. */
  sinCommit: number;
}

/** Comprueba que una ruta sea un repositorio git y devuelve lo básico de él. */
export async function comprobarRepositorio(ruta: string): Promise<{ ok: true; info: InfoRepositorio } | { ok: false; error: string }> {
  const r = ruta.trim().replace(/^["']|["']$/g, '');
  if (!r) return { ok: false, error: 'Escribe la ruta de la carpeta del repositorio.' };
  if (!isAbsolute(r)) return { ok: false, error: 'Escribe la ruta completa (por ejemplo, C:\\proyectos\\mi-app o /home/yo/mi-app).' };
  if (!existsSync(r) || !statSync(r).isDirectory()) return { ok: false, error: 'Esa carpeta no existe en este computador.' };
  const top = await gitEn(r, ['rev-parse', '--show-toplevel']);
  if (!top.ok) return { ok: false, error: 'Esa carpeta no es un repositorio git (o git no está instalado). El director necesita su historial.' };
  const raiz = top.out.trim();
  const [rama, remoto, ultimo, commits, archivos, estado] = await Promise.all([
    gitEn(raiz, ['symbolic-ref', '-q', '--short', 'HEAD']),
    gitEn(raiz, ['remote', 'get-url', 'origin']),
    gitEn(raiz, ['log', '-1', '--format=%cI%x1f%an%x1f%s']),
    gitEn(raiz, ['rev-list', '--count', 'HEAD']),
    gitEn(raiz, ['ls-files']),
    gitEn(raiz, ['status', '--porcelain']),
  ]);
  const [fecha, autor, asunto] = ultimo.ok && ultimo.out.trim() ? ultimo.out.trim().split('\x1f') : [];
  return {
    ok: true,
    info: {
      ruta: raiz,
      rama: rama.out.trim() || '(sin rama)',
      remoto: remoto.ok ? remoto.out.trim().replace(/\/\/[^/@]+@/, '//') : null, // sin credenciales en la URL
      ultimo: fecha ? { fecha, autor, asunto } : null,
      commits: Number(commits.out.trim()) || 0,
      archivos: archivos.out.split('\n').filter(Boolean).length,
      sinCommit: estado.out.split('\n').filter(Boolean).length,
    },
  };
}

/** Un archivo del repositorio del proyecto (ruta relativa con «/»), solo si queda dentro de él. */
export async function leerDelRepositorio(raizRepo: string, rel: string): Promise<string | null> {
  const archivo = resolve(raizRepo, ...rel.split('/'));
  const dentro = relative(resolve(raizRepo), archivo);
  if (!dentro || dentro.startsWith('..') || isAbsolute(dentro)) return null;
  try {
    return await readFile(archivo, 'utf-8');
  } catch {
    return null;
  }
}
