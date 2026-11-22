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

/** La última línea útil de lo que dijo git, sin su «fatal:»: la razón real de un fallo, para mostrarla tal cual. */
export const razonDeGit = (err: string): string =>
  err.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).pop()?.replace(/^(fatal|error):\s*/i, '') ?? '';

/**
 * Una carpeta entregada que existe y no está dentro de ningún repositorio git recibe el suyo, en la rama main, sea cual
 * sea el tipo que mande el formulario (nota del titular nmws3cw72tit: el Studio no detiene a nadie para que inicie git a
 * mano). Una carpeta dentro de otro repositorio no se toca: sigue siendo una subcarpeta (esSubcarpeta). Si git falla, su
 * razón real (`razon`), no un mensaje genérico; `sinGit` si git no está instalado.
 */
export async function iniciarSiNoEsGit(ruta: string): Promise<{ ok: true; iniciado: boolean } | { ok: false; razon: string; sinGit?: true }> {
  const r = ruta.trim().replace(/^["']|["']$/g, '');
  if (!r || !isAbsolute(r) || !existsSync(r) || !statSync(r).isDirectory()) return { ok: true, iniciado: false };
  const top = await gitEn(r, ['rev-parse', '--show-toplevel']);
  if (top.ok) return { ok: true, iniciado: false };
  if (!top.err.trim()) return { ok: false, razon: 'git', sinGit: true };
  // Solo «no es un repositorio» se arregla iniciándolo; otra razón (una carpeta de otro dueño, un .git roto) se dice tal cual
  if (!/not a git repository/i.test(top.err)) return { ok: false, razon: razonDeGit(top.err) };
  let init = await gitEn(r, ['init', '-q', '-b', 'main']);
  // git anterior a 2.28, sin -b: se inicia y HEAD se apunta a main
  if (!init.ok && /unknown switch|unknown option/i.test(init.err)) {
    init = await gitEn(r, ['init', '-q']);
    if (init.ok) init = await gitEn(r, ['symbolic-ref', 'HEAD', 'refs/heads/main']);
  }
  if (!init.ok) return init.err.trim() ? { ok: false, razon: razonDeGit(init.err) } : { ok: false, razon: 'git', sinGit: true };
  return { ok: true, iniciado: true };
}

/** Comprueba que una ruta sea un repositorio git y devuelve lo básico de él. */
export async function comprobarRepositorio(ruta: string): Promise<{ ok: true; info: InfoRepositorio } | { ok: false; error: string }> {
  const r = ruta.trim().replace(/^["']|["']$/g, '');
  if (!r) return { ok: false, error: 'Escribe la ruta de la carpeta del repositorio.' };
  if (!isAbsolute(r)) return { ok: false, error: 'Escribe la ruta completa (por ejemplo, C:\\proyectos\\mi-app o /home/yo/mi-app).' };
  if (!existsSync(r) || !statSync(r).isDirectory()) return { ok: false, error: 'Esa carpeta no existe en este computador.' };
  const top = await gitEn(r, ['rev-parse', '--show-toplevel']);
  if (!top.ok) {
    if (!top.err.trim()) return { ok: false, error: 'git no está instalado en este computador (o no se encuentra): el director lo necesita.' };
    return { ok: false, error: `Esa carpeta no se pudo leer como repositorio git: ${razonDeGit(top.err)}` };
  }
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

/**
 * ¿La carpeta elegida no es la raíz de su repositorio (la que devuelve git), sino una carpeta dentro de él? Entonces el
 * Studio no la registra como el repositorio entero sin que la persona lo elija (pd_auditoria_entrega, nmwdpftqatit).
 * Compara sin comillas, con «/» y sin la barra final; en Windows, sin distinguir mayúsculas. Pura.
 */
export function esSubcarpeta(elegida: string, raizRepo: string, windows = process.platform === 'win32'): boolean {
  const normal = (x: string) => {
    const r = x.trim().replace(/^["']|["']$/g, '').replace(/\\/g, '/').replace(/\/+$/, '');
    return windows ? r.toLowerCase() : r;
  };
  return normal(elegida) !== normal(raizRepo);
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
