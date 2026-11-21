// «Diagnosticar y reparar» («Autorreparación», capa dos: pedido pd_salud_c, en su forma más chica por la nota nmw9re982tit,
// 9 de noviembre de 2026). Solo con un clic de la persona, en la pantalla de emergencia o en «Salud del Studio», el Studio
// lanza al director como una urgencia, pero sobre el Studio mismo: con el modelo y el esfuerzo del director (nmw9ofkz6tit),
// 30 minutos, en la carpeta del Studio y sin subir nada. Si hay una revisión en marcha, espera y empieza sola cuando cierra
// (nmw9p84s1tit). Un intento por clic (nmw9rdej8tit). Su arreglo va en su propio commit (nmw9rcvyctit); al terminar, el
// Studio corre sin el modelo los tipos y las pruebas de lo que cambió: si fallan, deshace sus commits con otros nuevos (nunca
// reescribe la historia); si pasan, el Studio se reinicia solo (nmw9rd4gytit). Mientras trabaja, una línea dice qué hace
// (nmw9rdaystit). Lo pedido vive en .estudio/reparacion.json, solo de este computador. El lanzamiento es revisor.ts.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Git } from './volver.ts';

const ARCHIVO_REPARACION = 'reparacion.json';
/** Sus minutos: lo de una urgencia; una reparación que necesita más es una revisión (nmw9grxqatit). */
export const MAX_MIN_REPARAR = 30;
/** Desde este uso (%) del límite de cinco horas, una línea bajo el botón dice que la reparación puede cortarse (nmw9p8ihbtit). */
export const USO_AVISO_REPARAR = 90;
/** Cuánto pueden tardar los tipos y las pruebas que corre el Studio después de la reparación. */
const MIN_COMPROBAR = 15;

export type ResultadoReparacion = 'guardada' | 'deshecha' | 'sin_cambios' | 'no_termino';

export interface Reparacion {
  quien: string;
  pedida: string;
  /** La falla que la motivó, si vino de la pantalla de emergencia: su mensaje y su traza. */
  falla?: { mensaje: string; traza?: string };
  lanzada?: string;
  /** El commit de antes de lanzarla: lo que la reparación deja después de él es suyo. */
  antes?: string;
  /** Mientras el Studio comprueba lo que dejó (tipos y pruebas). */
  comprobando?: string;
  hecha?: string;
  resultado?: ResultadoReparacion;
  /** Lo que dijo el director al terminar, y lo que pasó al comprobarlo. */
  informe?: string;
}

/** Lo que muestran la pantalla de emergencia y «Salud del Studio», en una línea. */
export interface EstadoReparacion {
  estado: 'ninguna' | 'espera' | 'trabaja' | 'comprueba' | ResultadoReparacion;
  /** Minutos desde que empezó (trabaja, comprueba). */
  minutos?: number;
  /** Lo último que hizo, como lo resume el registro. */
  ultimo?: string;
  informe?: string;
  cuando?: string;
  /** El uso del límite de cinco horas (%), si se sabe; desde USO_AVISO_REPARAR, la línea de aviso. */
  uso?: number | null;
}

const archivo = (carpeta: string) => join(carpeta, ARCHIVO_REPARACION);

/** La reparación pedida o la última que terminó; null si nunca hubo. */
export function leerReparacion(carpeta: string): Reparacion | null {
  if (!existsSync(archivo(carpeta))) return null;
  try {
    const x = JSON.parse(readFileSync(archivo(carpeta), 'utf8')) as Reparacion;
    return x && typeof x.pedida === 'string' && typeof x.quien === 'string' ? x : null;
  } catch {
    return null;
  }
}

export function guardarReparacion(carpeta: string, r: Reparacion): void {
  mkdirSync(carpeta, { recursive: true });
  writeFileSync(archivo(carpeta), JSON.stringify(r, null, 2));
}

/** Si hay una pedida que no terminó. Pura. */
export const reparacionActiva = (r: Reparacion | null | undefined): r is Reparacion => !!r && !r.hecha;

/**
 * Pide una reparación (un clic, un intento): si ya hay una sin terminar, no pide otra (`ya`). Lo que vino de la pantalla
 * de emergencia va con su falla.
 */
export function pedirReparacion(carpeta: string, quien: string, falla?: { mensaje?: unknown; traza?: unknown } | null, ahora = new Date().toISOString()): { ok: true; ya: boolean; r: Reparacion } {
  const previa = leerReparacion(carpeta);
  if (reparacionActiva(previa)) return { ok: true, ya: true, r: previa };
  const mensaje = typeof falla?.mensaje === 'string' ? falla.mensaje.slice(0, 2000) : '';
  const traza = typeof falla?.traza === 'string' ? falla.traza.slice(0, 8000) : '';
  const r: Reparacion = { quien, pedida: ahora, ...(mensaje ? { falla: { mensaje, ...(traza ? { traza } : {}) } } : {}) };
  guardarReparacion(carpeta, r);
  return { ok: true, ya: false, r };
}

/** La línea de la reparación, de lo guardado y de si hay una revisión en marcha. Pura. */
export function estadoDeReparacion(r: Reparacion | null, x: { revisando: boolean; ultimo?: string | null; uso?: number | null; ahora?: number }): EstadoReparacion {
  const ahora = x.ahora ?? Date.now();
  const uso = x.uso ?? null;
  if (!r) return { estado: 'ninguna', uso };
  const minutos = (desde: string) => Math.max(0, Math.floor((ahora - Date.parse(desde)) / 60_000));
  if (r.hecha) return { estado: r.resultado ?? 'no_termino', cuando: r.hecha, ...(r.informe ? { informe: r.informe } : {}), uso };
  if (r.comprobando) return { estado: 'comprueba', minutos: minutos(r.lanzada ?? r.pedida), uso };
  if (r.lanzada) return { estado: 'trabaja', minutos: minutos(r.lanzada), ...(x.ultimo ? { ultimo: x.ultimo } : {}), uso };
  return { estado: x.revisando ? 'espera' : 'trabaja', minutos: 0, uso };
}

/** Si va la línea de aviso bajo el botón: el uso del límite de cinco horas pasa de USO_AVISO_REPARAR. Pura. */
export const avisoDeLimite = (uso: number | null | undefined) => typeof uso === 'number' && uso >= USO_AVISO_REPARAR;

/** Lo que dijo el director al terminar: el texto del resultado de su registro (stream-json), o null. Pura. */
export function informeDeRegistro(registro: string): string | null {
  const lineas = registro.split('\n');
  for (let i = lineas.length - 1; i >= 0; i--) {
    if (!lineas[i].startsWith('{')) continue;
    try {
      const ev = JSON.parse(lineas[i]) as { type?: string; result?: unknown };
      if (ev.type === 'result' && typeof ev.result === 'string' && ev.result.trim()) return ev.result.trim().slice(0, 4000);
    } catch {
      // una línea a medias
    }
  }
  return null;
}

/** El encargo del director para reparar el Studio. Pura. */
export function encargoReparacion(r: Reparacion, minutos = MAX_MIN_REPARAR): string {
  const falla = r.falla ? ` The failure, as the emergency screen saw it: «${r.falla.mensaje}»${r.falla.traza ? `, with its trace:\n${r.falla.traza}\n` : '.'}` : ' No failure came with it: it was pressed in «Studio health».';
  return (
    `Repair requested from the Studio by ${r.quien} with «Diagnose and repair»: find why the Studio fails and fix it.` +
    falla +
    ' This is not a review and not a project: do not run the inbox, do not write in any plan, and do not touch any project\'s memory (.stl/, proyectos/) beyond the consistency of marks and stuck states.' +
    ' Read first .estudio/fallas.json, .estudio/salud.json, .estudio/servidor.log and the last logs in .revisiones/, then the code they point at.' +
    ' Touch only the Studio\'s code. One attempt: make the smallest fix, run the tests of the files you change (npx vitest run <file>) and npm run typecheck, alone and one after the other, and save the fix in its own local commit (cd to the folder, git add, git commit, three separate commands) whose message starts with «Reparación: » and names what failed. Never push.' +
    ' If you find nothing to fix, or the fix does not pass its tests, leave no commit and no change.' +
    ' Also leave, in your final answer, one line that starts with «Caso:» describing the situation for the core measurement (src/director/casosFijos.ts), so it reaches the owner as a proposal; do not write it in the code.' +
    ' End with a short report in the language of estudio.local.json › idioma (Spanish if none): what failed, whether the cause was the model, the Studio\'s code, the computer or the account, and what you changed.' +
    ` After you end, the Studio runs the types and the tests of what changed: if they fail, it undoes your commits; if they pass, it restarts. You have ${minutos} minutes.`
  );
}

/** Corre una orden en `cwd`, con su tope; true si terminó bien. */
export type Correr = (orden: string, args: string[]) => Promise<boolean>;

export function correrDe(cwd: string, minutos = MIN_COMPROBAR): Correr {
  return (orden, args) =>
    new Promise((listo) => {
      let p: ReturnType<typeof spawn>;
      try {
        p = spawn(orden, args, { cwd, shell: process.platform === 'win32', stdio: 'ignore', windowsHide: true });
      } catch {
        return listo(false);
      }
      const tope = setTimeout(() => p.kill(), minutos * 60_000);
      p.on('error', () => { clearTimeout(tope); listo(false); });
      p.on('exit', (codigo) => { clearTimeout(tope); listo(codigo === 0); });
    });
}

/**
 * Lo que hace el Studio cuando la reparación termina, sin el modelo: si no dejó commits, nada que comprobar; si dejó, corre
 * los tipos y las pruebas de lo que cambió y, si fallan, deshace sus commits con commits nuevos (git revert). Devuelve el
 * resultado; el reinicio lo hace quien la lanzó.
 */
export async function comprobarReparacion(antes: string | undefined, git: Git, correr: Correr): Promise<{ resultado: ResultadoReparacion; detalle?: string }> {
  if (!antes) return { resultado: 'no_termino', detalle: 'sin el commit de antes' };
  const ahora = await git(['rev-parse', 'HEAD']);
  if (!ahora.ok) return { resultado: 'no_termino', detalle: ahora.err.trim().slice(0, 300) };
  if (ahora.out.trim() === antes) return { resultado: 'sin_cambios' };
  const tipos = await correr('npm', ['run', 'typecheck']);
  const pruebas = tipos && (await correr('npx', ['vitest', 'run', '--changed', antes]));
  if (tipos && pruebas) return { resultado: 'guardada' };
  const r = await git(['revert', '--no-edit', `${antes}..HEAD`]);
  return { resultado: 'deshecha', detalle: `${tipos ? 'las pruebas' : 'los tipos'} no pasaron${r.ok ? '' : `; no se pudo deshacer: ${r.err.trim().slice(0, 200)}`}` };
}
