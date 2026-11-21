// La orden de un paso, corrida a escondidas en el servidor del Studio (pedido pd_sin_terminal; documento «sin-terminal»,
// decisiones nmwpsogkvtit, nmwpsoraqtit y nmwpsp0k1tit; elecciones nmwpz12rqtit, nmwpz210xtit, nmwpz2uwktit, nmwpz3b9ctit
// y nmwpz4vnbtit). El clic en el paso es el permiso: la orden sale del plan, corre en la carpeta del proyecto sin ventana
// (en Windows, con el bash de Git Bash y la ventana escondida; en macOS y Linux, con bash), y su salida queda guardada con
// lo que parece un secreto tapado. Su límite es mixto: a los 10 minutos no se mata, pide «Darle 10 minutos más» o
// «Detener»; y si lleva mucho rato sin decir nada, se marca como callada, que suele ser una orden esperando una respuesta.
// Se detiene con «Detener» o al apagarse el Studio. Lo puro va aparte, con sus pruebas; la clase guarda las corridas en
// memoria (no sobreviven a un reinicio del servidor: la orden muere con él).
import { execFile, spawn } from 'node:child_process';
import type { PermisoAutorizado } from '../../src/director/proyectos.ts';
import { ordenPermitida, reglaDe } from './permisosNegados.ts';
import { soloEnEsteProyecto } from './permisoAlMomento.ts';
import { bashDelSistema, ordenQueAbre } from './terminal.ts';

/** A los 10 minutos la orden pide más tiempo, sin morir (nmwpv6oqftit; límite mixto, nmwpz4vnbtit). */
export const LIMITE_MS = 10 * 60_000;
/** Lo que suma «Darle 10 minutos más». */
export const MAS_TIEMPO_MS = 10 * 60_000;
/** Sin decir nada en este rato, la orden se marca callada: puede estar esperando una respuesta que nadie ve. */
export const SILENCIO_MS = 3 * 60_000;
/** Cuánto de la salida se guarda: el final, que es donde está lo que falló. */
const SALIDA_MAX =200_000;
const TAPADO = '••••';

/**
 * Tapa lo que parece un secreto antes de guardar la salida (nmwpz2uwktit): las llaves de GitHub, npm, AWS, Slack y de los
 * modelos, los «Bearer», las contraseñas en una dirección y lo que va tras «password=», «token=», «secret=» o «api_key=».
 * Lo que no parece un secreto queda igual. Pura.
 */
export function enmascarar(texto: string): string {
  return texto
    .replace(/\b(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|npm_[A-Za-z0-9]{20,}|xox[abprs]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16})\b/g, TAPADO)
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{12,}/gi, (_, tipo: string) => `${tipo} ${TAPADO}`)
    .replace(/(\b[a-z][a-z0-9+.-]*:\/\/)([^\s/:@]+):([^\s/@]+)@/gi, (_, esquema: string, usuario: string) => `${esquema}${usuario}:${TAPADO}@`)
    .replace(/\b((?:[A-Z0-9_]*_)?(?:password|passwd|pwd|token|secret|api[_-]?key|access[_-]?key)[A-Z0-9_]*)(\s*[:=]\s*)(["']?)[^\s"']{4,}\3/gi, (_, nombre: string, signo: string, comilla: string) => `${nombre}${signo}${comilla}${TAPADO}${comilla}`);
}

/** Lo que nunca corre, aunque llegue de un paso: subir a la fuerza, reescribir la historia y leer un .env. Pura. */
export function ordenNunca(orden: string): boolean {
  const o = orden.replace(/\s+/g, ' ');
  if (/\bgit push\b[^|;&]*(\s--force\b|\s-f\b|\s--force-with-lease\b|\s\+\S)/.test(o)) return true;
  if (/\bgit (filter-branch|filter-repo)\b/.test(o)) return true;
  return /(^|[\s/'"])\.env(\.[\w-]+)?($|[\s'"])/.test(o);
}

/** Cómo va el tiempo de una corrida: si ya pide más tiempo y si lleva callada demasiado. Pura. */
export function tiempoDeCorrida(o: { inicio: number; extra: number; ultimaSalida: number; ahora: number; termino: boolean }): { pideTiempo: boolean; callada: boolean; quedanMs: number } {
  if (o.termino) return { pideTiempo: false, callada: false, quedanMs: 0 };
  const quedanMs = o.inicio + LIMITE_MS + o.extra - o.ahora;
  return { pideTiempo: quedanMs <= 0, callada: o.ahora - o.ultimaSalida >= SILENCIO_MS, quedanMs: Math.max(0, quedanMs) };
}

/** Las reglas de «Permisos» que valen en un proyecto: las suyas y las de todos. Pura. */
const reglasDe = (autorizados: readonly PermisoAutorizado[], proyecto: string) =>
  autorizados.filter((a) => a.alcance === 'todos' || a.proyecto === proyecto).map((a) => a.regla);

/** Si esa orden ya tiene «Siempre» en ese proyecto (la misma lista de «Permisos» que usa el director; nmwpsoraqtit). Pura. */
export const yaAutorizada = (orden: string, autorizados: readonly PermisoAutorizado[], proyecto: string): boolean =>
  ordenPermitida(orden, reglasDe(autorizados, proyecto));

/**
 * La regla que guarda «Siempre» para la orden de un paso: la del tipo de acción, como en el aviso del director. Subir,
 * traer, publicar y desplegar valen solo en este proyecto; lo demás, en este o en todos. Null si no hay un tipo de acción
 * que guardar (varias órdenes juntas, una redirección). Pura.
 */
export function reglaParaSiempre(orden: string, casa: string): { regla: string; soloEsteProyecto: boolean } | null {
  const r = reglaDe({ herramienta: 'Bash', entrada: { command: orden } }, casa).regla;
  return r ? { regla: r, soloEsteProyecto: soloEnEsteProyecto(r) } : null;
}

/** El permiso que se guarda con «Siempre» desde un paso: en el mismo formato y la misma lista que los del director. Pura. */
export function permisoDeSiempre(regla: { regla: string; soloEsteProyecto: boolean }, alcance: 'proyecto' | 'todos', proyecto: string, quien: string, cuando: string): PermisoAutorizado {
  return { regla: regla.regla, alcance: regla.soloEsteProyecto ? 'proyecto' : alcance, ...(regla.soloEsteProyecto || alcance === 'proyecto' ? { proyecto } : {}), cuando, quien };
}

/**
 * Si la orden es crítica (subir, traer, publicar, desplegar): su «Siempre» vale solo en este proyecto y, antes de correr,
 * su línea dice qué manda y desde dónde (nmwpxsauntit). Pura.
 */
export const esCritica = (orden: string, casa: string): boolean => !!reglaParaSiempre(orden, casa)?.soloEsteProyecto;

/**
 * Un tipo de orden que «Me pide escribir: ábrela en una terminal» marcó en un proyecto (nmwqkn8m1tit): desde entonces, esa
 * orden se abre directo en una ventana. Se guarda en este computador (estudio.local.json › enVentana).
 */
export interface OrdenEnVentana { proyecto: string; regla: string; cuando: string }

/** La marca que deja «ábrela en una terminal» para esa orden, o null si no tiene un tipo de acción que marcar. Pura. */
export function marcaEnVentana(orden: string, proyecto: string, casa: string, cuando: string): OrdenEnVentana | null {
  const r = reglaParaSiempre(orden, casa);
  return r ? { proyecto, regla: r.regla, cuando } : null;
}

/** Si esa orden, en ese proyecto, ya se marcó para abrirse en una ventana. Pura. */
export const vaEnVentana = (orden: string, marcas: readonly OrdenEnVentana[], proyecto: string): boolean =>
  ordenPermitida(orden, marcas.filter((m) => m.proyecto === proyecto).map((m) => m.regla));

/** Las últimas líneas de la salida, para la línea del paso y para la nota de error: lo entero va plegado aparte. Pura. */
export function ultimasLineas(salida: string, n = 12): string {
  return salida.replace(/\r\n?/g, '\n').trimEnd().split('\n').slice(-n).join('\n');
}

/** La salida entera, como el archivo adjunto de la nota de error (se ve plegada, como descarga). Pura. */
export const adjuntoDeSalida = (c: Pick<Corrida, 'id' | 'salida'>): { nombre: string; datos: string } => ({
  nombre: `salida-${c.id}.txt`,
  datos: `data:text/plain;base64,${Buffer.from(c.salida || '(sin salida)', 'utf8').toString('base64')}`,
});

/** Lo que el proceso de la orden ofrece: su salida, su final y cómo pararlo. Con esto las pruebas usan uno de mentira. */
export interface Proceso {
  pid?: number;
  stdout: { on(e: 'data', f: (b: Buffer | string) => void): unknown } | null;
  stderr: { on(e: 'data', f: (b: Buffer | string) => void): unknown } | null;
  on(e: 'close', f: (codigo: number | null) => void): unknown;
  on(e: 'error', f: (err: Error) => void): unknown;
}
export type Lanzador = (orden: string, carpeta: string) => Promise<Proceso>;
export type Parador = (p: Proceso) => void;

/**
 * How the hidden bash is called. On Windows, as Git Bash does: a login shell (its /etc/profile puts /usr/bin and
 * /mingw64/bin on the PATH, so `sleep` exists and npm's own sh script finds what it calls; notes nmwqmmidgtit,
 * nmwqmrxsgtit), in MINGW64 and staying in the folder (CHERE_INVOKING). On macOS and Linux, as before. Pure.
 */
export function llamadaDeBash(orden: string, plataforma: NodeJS.Platform, base: NodeJS.ProcessEnv): { args: string[]; env: NodeJS.ProcessEnv } {
  const env: NodeJS.ProcessEnv = { ...base, GIT_TERMINAL_PROMPT: '0' };
  if (plataforma !== 'win32') return { args: ['-c', ordenQueAbre(orden)], env };
  return { args: ['--login', '-c', ordenQueAbre(orden)], env: { ...env, MSYSTEM: base.MSYSTEM || 'MINGW64', CHERE_INVOKING: '1' } };
}

/** Corre la orden en bash, sin ventana y sin entrada (lo que espera una respuesta recibe un fin y no se cuelga). */
const lanzarEnBash: Lanzador =async (orden, carpeta) => {
  const bash = await bashDelSistema();
  if (!bash) throw new Error('sin_bash');
  const { args, env } = llamadaDeBash(orden, process.platform, process.env);
  return spawn(bash, args, {
    cwd: carpeta,
    windowsHide: true,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
    env,
  });
};

/** Para la orden con todo lo que lanzó: en Windows, el árbol entero con taskkill; en lo demás, su grupo de procesos. */
const pararArbol: Parador =(p) => {
  if (!p.pid) return;
  if (process.platform === 'win32') execFile('taskkill', ['/PID', String(p.pid), '/T', '/F'], { windowsHide: true }, () => undefined);
  else {
    try {
      process.kill(-p.pid, 'SIGTERM');
    } catch {
      // ya terminó
    }
  }
};

export type FaseCorrida = 'corriendo' | 'hecha' | 'fallo' | 'detenida';
export interface Corrida {
  id: string;
  proyecto: string;
  mision: string;
  paso: number;
  orden: string;
  fase: FaseCorrida;
  codigo: number | null;
  /** La salida entera, con los secretos tapados, hasta SALIDA_MAX (el final). */
  salida: string;
  inicio: string;
  fin: string | null;
  pideTiempo: boolean;
  callada: boolean;
  quedanMs: number;
}

interface Viva {
  c: Omit<Corrida, 'pideTiempo' | 'callada' | 'quedanMs'>;
  proceso: Proceso | null;
  inicio: number;
  extra: number;
  ultimaSalida: number;
}

/** Las corridas de este servidor: se lanzan, se leen, se les da más tiempo y se detienen. */
export class CorridasOcultas {
  private readonly vivas = new Map<string, Viva>();
  private contador = 0;
  /** Lo que se hace cuando una corrida termina sola (no al detenerla): la que falla deja su nota de error en el Buzón. */
  alTerminar?: (c: Corrida) => void;
  constructor(
    private readonly lanzar: Lanzador = lanzarEnBash,
    private readonly parar: Parador = pararArbol,
    private readonly reloj: () => number = Date.now,
  ) {}

  /** Lanza la orden de un paso. Si no se pudo lanzar, la corrida queda en «fallo» con el porqué en su salida. */
  async iniciar(o: { proyecto: string; mision: string; paso: number; orden: string; carpeta: string }): Promise<Corrida> {
    const ahora = this.reloj();
    const id = `c${++this.contador}-${ahora.toString(36)}`;
    const v: Viva = { c: { id, proyecto: o.proyecto, mision: o.mision, paso: o.paso, orden: o.orden, fase: 'corriendo', codigo: null, salida: '', inicio: new Date(ahora).toISOString(), fin: null }, proceso: null, inicio: ahora, extra: 0, ultimaSalida: ahora };
    this.vivas.set(id, v);
    try {
      const p = await this.lanzar(o.orden, o.carpeta);
      v.proceso = p;
      const sumar = (b: Buffer | string) => {
        v.ultimaSalida = this.reloj();
        const todo = v.c.salida + enmascarar(String(b));
        v.c.salida = todo.length > SALIDA_MAX ? todo.slice(-SALIDA_MAX) : todo;
      };
      p.stdout?.on('data', sumar);
      p.stderr?.on('data', sumar);
      p.on('error', (e) => this.terminar(v, null, e.message));
      p.on('close', (codigo) => this.terminar(v, codigo));
    } catch (e) {
      this.terminar(v, null, (e as Error).message);
    }
    return this.estado(id)!;
  }

  private terminar(v: Viva, codigo: number | null, error?: string) {
    if (v.c.fin) return;
    v.c.fin = new Date(this.reloj()).toISOString();
    v.c.codigo = codigo;
    if (error) v.c.salida += `${v.c.salida && !v.c.salida.endsWith('\n') ? '\n' : ''}${enmascarar(error)}`;
    if (v.c.fase !== 'detenida') v.c.fase = codigo === 0 ? 'hecha' : 'fallo';
    v.proceso = null;
    if (v.c.fase !== 'detenida') {
      try {
        this.alTerminar?.(this.estado(v.c.id)!);
      } catch {
        // la nota de error no detiene nada
      }
    }
  }

  /** La corrida pasó a una ventana («Me pide escribir»): se detiene sin dejar nota de error. */
  aVentana(id: string): Corrida | null {
    const c = this.estado(id);
    if (!c || c.fase !== 'corriendo') return c;
    this.detener(id);
    return this.estado(id);
  }

  /** Cómo va una corrida, con su tiempo al día; null si no existe. */
  estado(id: string): Corrida | null {
    const v = this.vivas.get(id);
    if (!v) return null;
    return { ...v.c, ...tiempoDeCorrida({ inicio: v.inicio, extra: v.extra, ultimaSalida: v.ultimaSalida, ahora: this.reloj(), termino: !!v.c.fin }) };
  }

  /** Las de un proyecto (o todas), la más reciente primero. */
  todas(proyecto?: string): Corrida[] {
    return [...this.vivas.keys()].reverse().map((id) => this.estado(id)!).filter((c) => !proyecto || c.proyecto === proyecto);
  }

  /** Cuántas siguen corriendo: la línea de arriba dice una sola cosa, con cuántas van (nmwpz3b9ctit). */
  enMarcha(proyecto?: string): number {
    return this.todas(proyecto).filter((c) => c.fase === 'corriendo').length;
  }

  /** «Darle 10 minutos más»: suma tiempo a una que corre. False si ya terminó o no existe. */
  masTiempo(id: string): boolean {
    const v = this.vivas.get(id);
    if (!v || v.c.fin) return false;
    v.extra += MAS_TIEMPO_MS;
    return true;
  }

  /** «Detener»: para la orden y lo que lanzó. False si ya terminó o no existe. */
  detener(id: string): boolean {
    const v = this.vivas.get(id);
    if (!v || v.c.fin) return false;
    v.c.fase = 'detenida';
    if (v.proceso) this.parar(v.proceso);
    else this.terminar(v, null);
    return true;
  }

  /** Al apagarse el Studio, nada queda corriendo solo. */
  detenerTodas(): number {
    let n = 0;
    for (const id of this.vivas.keys()) if (this.detener(id)) n++;
    return n;
  }
}
