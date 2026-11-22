// «Abrir la terminal con esta orden»: el paso de una misión que la persona corre en su terminal (`terminal`) se abre
// en una ventana nueva, con la orden ya corriendo, para que no tenga que buscar la terminal ni dónde pegarla. La orden
// sale siempre del plan (nunca de lo que llega en la petición), y la ventana queda abierta al terminar para leer lo que dijo.
import { execFile, spawn } from 'node:child_process';
import { t } from '../src/textos.ts';
import { existsSync } from 'node:fs';
import { chmod, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { cumpleComprobacion, ordenDeComprobacion, type Comprobacion } from '../../src/director/director.ts';

/**
 * Comprueba un paso de terminal al marcarlo (`comprobar`): corre su orden de solo lectura en la carpeta del proyecto,
 * sin shell y sin modelo, y dice si su salida es la esperada y qué encontró, para mostrarlo tal cual.
 */
export async function comprobarPaso(c: Comprobacion, carpeta: string): Promise<{ cumple: boolean; encontrado: string }> {
  const o = ordenDeComprobacion(c.orden);
  if ('error' in o) return { cumple: false, encontrado: `La comprobación no se puede correr: ${o.error}.` };
  if (o.programa === 'existe' || o.programa === 'no existe') {
    const ruta = resolve(carpeta, o.args[0]);
    const dentro = ruta === resolve(carpeta) || ruta.startsWith(resolve(carpeta) + sep);
    if (!dentro) return { cumple: false, encontrado: `${o.args[0]} queda fuera de la carpeta del proyecto.` };
    const esta = existsSync(ruta);
    return { cumple: o.programa === 'existe' ? esta : !esta, encontrado: esta ? `${o.args[0]} está.` : `${o.args[0]} no está en la carpeta del proyecto.` };
  }
  return new Promise((ok) => execFile('git', o.args, { cwd: carpeta, windowsHide: true, timeout: 15_000, maxBuffer: 1024 * 1024 }, (e, out, err) => {
    const salida = String(out ?? '');
    if (e) return ok({ cumple: false, encontrado: (String(err ?? '').trim() || e.message).slice(0, 400) });
    ok({ cumple: cumpleComprobacion(salida, c), encontrado: salida.trim().slice(0, 400) || '(no dijo nada)' });
  }));
}

const comillas = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

/**
 * «start <carpeta>» abre una carpeta, pero en Git Bash `start` es `cmd /c start` y Windows no encuentra una ruta con barras
 * normales («docs/difusion/voz/en»: su ventana dice que no la encuentra aunque esté; notas nmwo2q7w7tit y nmwo2qy59tit).
 * Esa orden, con una sola ruta y sin opciones, se corre como «abrir esta carpeta» en cada sistema: en Windows, con la ruta
 * entera y sus barras de Windows (cygpath -wa); en macOS, open; en lo demás, xdg-open. Lo demás pasa igual. Pura.
 */
export function ordenQueAbre(orden: string): string {
  const m = /^\s*start\s+(?:"([^"]+)"|'([^']+)'|([^\s"'/&|;<>][^\s"'&|;<>]*))\s*$/.exec(orden);
  const ruta = m && (m[1] ?? m[2] ?? m[3]);
  if (!ruta) return orden;
  const r = comillas(ruta);
  return `if command -v cygpath >/dev/null 2>&1; then explorer "$(cygpath -wa ${r})"; elif [ "$(uname)" = Darwin ]; then open ${r}; else xdg-open ${r}; fi`;
}

/**
 * La orden como la corre bash. La que da sesionDeClaude para PowerShell (`& "C:\...\claude.exe" auth login`) empieza con «&»,
 * que en bash es un error de sintaxis: el guion moría en su segunda línea y la ventana se cerraba al instante, sin mostrar nada
 * (la segunda pantalla del asistente, «claude auth login»; la primera, `npm install -g …`, no lleva «&»). Aquí se le quita el
 * «&», y la ruta de Windows con barras invertidas pasa a barras normales, que bash entiende. Pura.
 */
export function ordenParaBash(orden: string): string {
  const m = /^\s*&\s+"([^"]+)"(.*)$/.exec(orden);
  if (m) return `"${m[1].replace(/\\/g, '/')}"${m[2]}`;
  return orden.replace(/^\s*&\s+/, '');
}

/**
 * El guion que corre la ventana: avisa que arrancó (si hay `marca`, escribe ese archivo en su primera línea: es como el Studio
 * sabe que la ventana de verdad se abrió), entra a la carpeta, muestra la orden, la corre y espera Enter para cerrar.
 */
export function guionDeTerminal(orden: string, carpeta: string, marca?: string): string {
  const bash = ordenParaBash(orden);
  return [
    '#!/usr/bin/env bash',
    ...(marca ? [`echo ok > ${comillas(marca.replace(/\\/g, '/'))} 2>/dev/null`] : []),
    `cd ${comillas(carpeta.replace(/\\/g, '/'))} 2>/dev/null`,
    `printf '%s\\n\\n' ${comillas(`STL Studio corre: ${bash}`)}`,
    ordenQueAbre(bash),
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

/** El bash con que corren los guiones de tools/entorno, sin ventana: en Windows, el de Git Bash (null si no hay); en lo demás, `bash`. */
export async function bashDelSistema(): Promise<string | null> {
  if (process.platform !== 'win32') return 'bash';
  const git = await carpetaGit();
  return git && join(git, 'usr', 'bin', 'bash.exe');
}

/** Lanza la ventana sin atarla al Studio: si el Studio se apaga, la terminal sigue. */
function lanzar(programa: string, args: string[]): Promise<void> {
  return new Promise((ok, falla) => {
    const hijo = spawn(programa, args, { detached: true, stdio: 'ignore' });
    hijo.once('error', falla);
    hijo.once('spawn', () => { hijo.unref(); ok(); });
  });
}

/** Espera a que exista la marca que escribe el guion en su primera línea; true si apareció antes del plazo. */
export async function esperarMarca(marca: string, plazoMs = 15000, cadaMs = 150): Promise<boolean> {
  const fin = Date.now() + plazoMs;
  for (;;) {
    if (existsSync(marca)) return true;
    if (Date.now() >= fin) return false;
    await new Promise((ok) => setTimeout(ok, cadaMs));
  }
}

let cuantas = 0;

/**
 * Abre una terminal nueva que corre la orden en la carpeta y comprueba que de verdad se abrió: su guion escribe una marca
 * al empezar. Sin marca a tiempo, dice que no se abrió (que la página lo vuelva a pedir o muestre «copia la orden»). Si no se
 * puede, dice por qué (para mostrarlo tal cual). Cada apertura usa guion y marca propios (nombres que no se repiten).
 */
// 15 s, no 6: un bash --login de Git Bash recién instalado prepara su carpeta la primera vez y tarda; con un plazo corto, la
// ventana que sí se abría se daba por perdida y el reintento abría otra, que corría la misma orden dos veces
export async function abrirTerminal(orden: string, carpeta: string, plazoMs = 15000): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = `${Date.now()}-${process.pid}-${++cuantas}`;
  const guion = join(tmpdir(), `stl-orden-${id}${process.platform === 'darwin' ? '.command' : '.sh'}`);
  const marca = join(tmpdir(), `stl-orden-${id}.abierta`);
  await writeFile(guion, guionDeTerminal(orden, carpeta, marca), 'utf8');
  await chmod(guion, 0o755).catch(() => {});
  try {
    if (process.platform === 'win32') {
      const git = await carpetaGit();
      if (!git) return { ok: false, error: t('servidor.sinGitBash') };
      await lanzar(join(git, 'usr', 'bin', 'mintty.exe'), ['--title', 'STL Studio', '-e', join(git, 'usr', 'bin', 'bash.exe'), '--login', guion.replace(/\\/g, '/')]);
    } else if (process.platform === 'darwin') {
      await lanzar('open', ['-a', 'Terminal', guion]);
    } else {
      await lanzar('x-terminal-emulator', ['-e', 'bash', guion]).catch(() => lanzar('gnome-terminal', ['--', 'bash', guion]));
    }
    if (!(await esperarMarca(marca, plazoMs))) return { ok: false, error: t('servidor.sinTerminal') };
    await unlink(marca).catch(() => {});
    return { ok: true };
  } catch {
    return { ok: false, error: t('servidor.sinTerminal') };
  }
}
