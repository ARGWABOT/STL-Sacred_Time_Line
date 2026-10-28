// Un director a la vez en cada proyecto (pedido pd_un_director; la regla inviolable del titular, 22 de octubre de 2026):
// un candado por proyecto que todo director toma al empezar y suelta al cerrar. Lo toman el lanzador del Studio (una
// revisión, una urgencia o una aclaración), el de otra copia del Studio en otra carpeta y la sesión del director, que
// corre «revisa estudio» a mano y antes no le avisaba a nadie. Vive en la carpeta de git del repositorio del proyecto
// (.git/stl-director.json): no entra en ningún commit, y lo ven todas las copias del Studio de este computador que abran
// ese proyecto. El que se guarda en el repositorio, para todos los computadores, es de la fase del equipo.
import { execFileSync } from 'node:child_process';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

/** El archivo del candado, dentro de la carpeta de git del repositorio del proyecto. */
export const ARCHIVO_CANDADO = 'stl-director.json';
/** Cuánto vale el candado de la sesión del director sin que la bandeja lo renueve (cada vez que corre, lo renueva). */
export const MIN_CANDADO_SESION = 120;

export interface Candado {
  /** Quién lo tomó: el Studio que lanzó al director, o la sesión del director, a mano. */
  quien: 'studio' | 'sesion';
  /** La carpeta del Studio que lo tomó. */
  estudio: string;
  proyecto: string;
  tipo: 'revision' | 'urgencia' | 'aclaracion';
  desde: string;
  /** Hasta cuándo vale sin que nadie lo renueve: pasada esa hora, está abandonado. */
  hasta: string;
  /** El servidor que lanzó al director y el director lanzado: si el Studio lo tomó y ya no existe ninguno, está abandonado. */
  pid?: number;
  hijo?: number;
  /** El registro del director que lanzó el Studio: así su bandeja sabe que el candado es suyo. */
  registro?: string;
}

/** Quien pregunta por el candado: su Studio y, si lo lanzó el Studio, su registro. */
export interface QuienPregunta {
  estudio: string;
  registro?: string | null;
}

const clave = (r: string) => resolve(r).replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();

/**
 * Si el candado está libre: no hay, ya pasó su hora o, si lo tomó un Studio que anotó sus procesos, ya no existe ninguno
 * (ni el servidor ni el director que lanzó). Solo pregunta si los procesos existen: nunca los detiene. Pura, salvo `vive`.
 */
export function candadoLibre(c: Candado | null, ahora: number, vive: (pid: number) => boolean): boolean {
  if (!c) return true;
  const hasta = Date.parse(c.hasta);
  if (Number.isNaN(hasta) || ahora > hasta) return true;
  const procesos = [c.pid, c.hijo].filter((p): p is number => typeof p === 'number' && p > 0);
  return c.quien === 'studio' && procesos.length > 0 && !procesos.some(vive);
}

/**
 * Si el candado es de quien pregunta: el director que lanzó el Studio lo reconoce por su registro; la sesión del director,
 * porque lo tomó una sesión (sin registro) desde el mismo Studio. Pura.
 */
export function esDeQuien(c: Candado, yo: QuienPregunta): boolean {
  if (yo.registro) return !!c.registro && clave(c.registro) === clave(yo.registro);
  return c.quien === 'sesion' && clave(c.estudio) === clave(yo.estudio);
}

/** Quién tiene el candado, en una frase para la persona y para el director. Pura. */
export function quienLoTiene(c: Candado, yo?: QuienPregunta): string {
  const hora = new Date(c.desde).toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' });
  const deOtro = !!yo && clave(c.estudio) !== clave(yo.estudio);
  const que = c.tipo === 'urgencia' ? 'lo urgente de este proyecto' : c.tipo === 'aclaracion' ? 'una aclaración de este proyecto' : 'este proyecto';
  if (c.quien === 'sesion') return `La sesión del director${deOtro ? ` de otra copia del Studio (${c.estudio})` : ''} está revisando ${que} desde las ${hora}`;
  return `Un director que lanzó ${deOtro ? `otra copia del Studio (${c.estudio})` : 'el Studio'} está trabajando en ${que} desde las ${hora}`;
}

/** El candado que hay, o null si no hay o no se entiende (uno que no se entiende no detiene a nadie). */
export function leerCandado(archivo: string): Candado | null {
  try {
    const c = JSON.parse(readFileSync(archivo, 'utf-8'));
    return c && typeof c === 'object' && (c.quien === 'studio' || c.quien === 'sesion') && typeof c.hasta === 'string' ? (c as Candado) : null;
  } catch {
    return null;
  }
}

const existe = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
};

/**
 * Toma el candado, o lo renueva si ya es de quien lo toma (`nuevo` dice quién es: su Studio y su registro). Si es de otro
 * y sigue vivo, no lo toca y lo devuelve. Crearlo es atómico (solo si no existe), así que dos que lo toman a la vez no se
 * lo quedan los dos. Sin carpeta de git donde escribirlo, no detiene a nadie (`tomado`, sin archivo).
 */
export function tomarCandado(archivo: string | null, nuevo: Candado, ahora = Date.now(), vive: (pid: number) => boolean = existe): { tomado: true } | { tomado: false; de: Candado } {
  if (!archivo) return { tomado: true };
  const yo: QuienPregunta = { estudio: nuevo.estudio, registro: nuevo.registro };
  for (let intento = 0; intento < 2; intento++) {
    try {
      writeFileSync(archivo, JSON.stringify(nuevo), { flag: 'wx' });
      return { tomado: true };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') return { tomado: true };
      const hay = leerCandado(archivo);
      if (hay && esDeQuien(hay, yo) && !candadoLibre(hay, ahora, vive)) {
        renovar(archivo, hay, nuevo.hasta);
        return { tomado: true };
      }
      if (hay && !candadoLibre(hay, ahora, vive)) return { tomado: false, de: hay };
      try { unlinkSync(archivo); } catch { /* otro lo soltó o lo tomó un instante antes */ }
    }
  }
  const hay = leerCandado(archivo);
  return hay && !esDeQuien(hay, yo) && !candadoLibre(hay, ahora, vive) ? { tomado: false, de: hay } : { tomado: true };
}

/** Lo renueva: todo lo que tenía anotado (quién, qué, desde cuándo, sus procesos) y, de la hora, la más tarde. */
function renovar(archivo: string, hay: Candado, hasta: string): void {
  const mas = Date.parse(hasta) > Date.parse(hay.hasta) ? hasta : hay.hasta;
  try { writeFileSync(archivo, JSON.stringify({ ...hay, hasta: mas })); } catch { /* sin disco, sigue tomado */ }
}

/**
 * Lo que hace quien escribe el plan sin empezar una revisión (el parche, `--aplicar`): si el candado es suyo, lo renueva
 * hasta `hasta`; si es de otro director que sigue vivo, lo devuelve, para no escribir a su lado; si no hay, no lo crea.
 */
export function renovarCandado(archivo: string | null, yo: QuienPregunta, hasta: string, ahora = Date.now(), vive: (pid: number) => boolean = existe): { tomado: true } | { tomado: false; de: Candado } {
  const hay = archivo ? leerCandado(archivo) : null;
  if (!archivo || !hay || candadoLibre(hay, ahora, vive)) return { tomado: true };
  if (!esDeQuien(hay, yo)) return { tomado: false, de: hay };
  renovar(archivo, hay, hasta);
  return { tomado: true };
}

/** Anota en el candado al director que lanzó el Studio (su proceso), si el candado es de ese lanzamiento. */
export function anotarDirector(archivo: string | null, registro: string, hijo: number | undefined): void {
  if (!archivo || !hijo) return;
  const hay = leerCandado(archivo);
  if (!hay?.registro || clave(hay.registro) !== clave(registro)) return;
  try { writeFileSync(archivo, JSON.stringify({ ...hay, hijo })); } catch { /* sin disco: vale por su hora */ }
}

/** Suelta el candado si es de quien pregunta; el de otro no se toca. */
export function soltarCandado(archivo: string | null, yo: QuienPregunta): void {
  if (!archivo) return;
  const hay = leerCandado(archivo);
  if (!hay || !esDeQuien(hay, yo)) return;
  try { unlinkSync(archivo); } catch { /* ya no estaba */ }
}

/**
 * Dónde va el candado de un proyecto: su archivo en la carpeta de git común del repositorio (.git, o la del repositorio
 * principal si el proyecto es un worktree). null si no es un repositorio de git.
 */
export function archivoDelCandado(repositorio: string): string | null {
  try {
    const comun = execFileSync('git', ['rev-parse', '--git-common-dir'], { cwd: repositorio, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true }).trim();
    if (!comun) return null;
    return join(isAbsolute(comun) ? comun : join(repositorio, comun), ARCHIVO_CANDADO);
  } catch {
    return null;
  }
}
