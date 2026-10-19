// «Abrir la terminal con esta orden»: el paso de una misión que la persona corre en su terminal (`terminal`) se abre
// en una ventana nueva, con la orden ya corriendo, para que no tenga que buscar la terminal ni dónde pegarla. La orden
// sale siempre del plan (nunca de lo que llega en la petición), y la ventana queda abierta al terminar para leer lo que dijo.
import { execFile, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chmod, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { cumpleComprobacion, ordenDeComprobacion, type Comprobacion } from '../../src/director/director';

/**
 * Comprueba un paso de terminal al marcarlo (`comprobar`): corre su orden de solo lectura en la carpeta del proyecto,
 * sin shell y sin modelo, y dice si su salida es la esperada y qué encontró, para mostrarlo tal cual.
 */
export async function comprobarPaso(c: Comprobacion, carpeta: string): Promise<{ cumple: boolean; encontrado: string }> {
  const o = ordenDeComprobacion(c.orden);
  if ('error' in o) return { cumple: false, encontrado: `La comprobación no se puede correr: ${o.error}.` };
  if (o.programa === 'existe') {
    const ruta = resolve(carpeta, o.args[0]);
    const dentro = ruta === resolve(carpeta) || ruta.startsWith(resolve(carpeta) + sep);
    const esta = dentro && existsSync(ruta);
    return { cumple: esta, encontrado: esta ? `${o.args[0]} está.` : `${o.args[0]} no está en la carpeta del proyecto.` };
  }
  return new Promise((ok) => execFile('git', o.args, { cwd: carpeta, windowsHide: true, timeout: 15_000, maxBuffer: 1024 * 1024 }, (e, out, err) => {
    const salida = String(out ?? '');
    if (e) return ok({ cumple: false, encontrado: (String(err ?? '').trim() || e.message).slice(0, 400) });
    ok({ cumple: cumpleComprobacion(salida, c), encontrado: salida.trim().slice(0, 400) || '(no dijo nada)' });
  }));
}

/** El guion que corre la ventana: entra a la carpeta, muestra la orden, la corre y espera Enter para cerrar. */
export function guionDeTerminal(orden: string, carpeta: string): string {
  const comillas = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;
  return [
    '#!/usr/bin/env bash',
    `cd ${comillas(carpeta.replace(/\\/g, '/'))} 2>/dev/null`,
    `printf '%s\\n\\n' ${comillas(`STL Studio corre: ${orden}`)}`,
    orden,
    'echo',
    'read -r -p "Terminó. Oprime Enter para cerrar esta ventana. "',
    '',
  ].join('\n');
}

/** La carpeta de Git para Windows (la que trae Git Bash), a partir de dónde está git. */
async function carpetaGit(): Promise<string | null> {
  const donde = await new Promise<string>((ok) => execFile('where', ['git'], { windowsHide: true, timeout: 8000 }, (e, out) => ok(e ? '' : String(out))));
  const candidatas = [
    ...donde.split(/\r?\n/).filter(Boolean).map((g) => dirname(dirname(g.trim()))),
    join(process.env.ProgramW6432 ?? 'C:\\Program Files', 'Git'),
    join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Git'),
    join(process.env.LOCALAPPDATA ?? '', 'Programs', 'Git'),
  ];
  return candidatas.find((c) => existsSync(join(c, 'usr', 'bin', 'mintty.exe')) && existsSync(join(c, 'usr', 'bin', 'bash.exe'))) ?? null;
}

/** Lanza la ventana sin atarla al Studio: si el Studio se apaga, la terminal sigue. */
function lanzar(programa: string, args: string[]): Promise<void> {
  return new Promise((ok, falla) => {
    const hijo = spawn(programa, args, { detached: true, stdio: 'ignore' });
    hijo.once('error', falla);
    hijo.once('spawn', () => { hijo.unref(); ok(); });
  });
}

/** Abre una terminal nueva que corre la orden en la carpeta. Si no se puede, dice por qué (para mostrarlo tal cual). */
export async function abrirTerminal(orden: string, carpeta: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const guion = join(tmpdir(), `stl-orden-${Date.now()}${process.platform === 'darwin' ? '.command' : '.sh'}`);
  await writeFile(guion, guionDeTerminal(orden, carpeta), 'utf8');
  await chmod(guion, 0o755).catch(() => {});
  try {
    if (process.platform === 'win32') {
      const git = await carpetaGit();
      if (!git) return { ok: false, error: 'No encontré Git Bash en este computador (viene con Git para Windows). Copia la orden y córrela en tu terminal.' };
      await lanzar(join(git, 'usr', 'bin', 'mintty.exe'), ['--title', 'STL Studio', '-e', join(git, 'usr', 'bin', 'bash.exe'), '--login', guion.replace(/\\/g, '/')]);
    } else if (process.platform === 'darwin') {
      await lanzar('open', ['-a', 'Terminal', guion]);
    } else {
      await lanzar('x-terminal-emulator', ['-e', 'bash', guion]).catch(() => lanzar('gnome-terminal', ['--', 'bash', guion]));
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'No se pudo abrir una terminal en este computador. Copia la orden y córrela en tu terminal.' };
  }
}
