// Quién decide en este Estudio y cómo se guarda cada decisión en git.
//
// - Quién decide: la identidad de git del clon (`git config user.name` y `user.email`). Quien la tiene es el titular de
//   cada proyecto. Sin identidad no se decide nada (nunca se firma con la de otro).
// - Cada decisión es un commit local en la memoria del proyecto (`<repositorio>/.stl`, rama `stl`), solo con su archivo
//   (el de la persona, sus audios o el proyecto), con el pie «Origen: Estudio». Hay un Sincronizador por memoria. Desde
//   que el Studio es de una sola persona (pd_sin_modo_equipo) no se sube nada decisión por decisión: la memoria se
//   respalda entera al terminar cada revisión (respaldo.ts).
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, sep } from 'node:path';
import { TITULAR, type Persona, type Proyecto } from '../../src/director/director.ts';
import { t } from '../src/textos.ts';
import { enDisco, rutasDe } from '../../src/director/proyectos.ts';

export interface Identidad {
  nombre: string;
  correo: string;
  rol: Persona | null;
  problema?: string;
  /** El equipo está vacío: quien abre el Estudio es el titular hasta que guarde el Proyecto. */
  nuevo?: boolean;
}

/** Pie de los commits de decisiones: así se reconocen en la rama local. */
export const PIE = 'Origin: Studio';

/**
 * El asunto de un commit del Studio en la memoria de un proyecto: en inglés desde el 20 de noviembre de 2026 (nmwp711kitit),
 * «Studio (<id>): …». Los de antes, «Estudio (<id>): …», quedan como están y se siguen reconociendo (`esCommitDelStudio`).
 */
export const mensajeDelStudio = (id: string, que: string) => `Studio (${id}): ${que}`;
export const esCommitDelStudio = (asunto: string) => /^(Estudio|Studio)( \(|:)/.test(asunto);
const CLAVE_ID = 'Decision';

interface Salida { codigo: number; out: string; err: string }
interface Opciones { env?: Record<string, string>; entrada?: string; ms?: number }

function correr(programa: string, raiz: string, args: string[], op: Opciones = {}): Promise<Salida> {
  return new Promise((resolve) => {
    const hijo = spawn(programa, args, {
      cwd: raiz,
      // En inglés para leer las respuestas de git; nunca pide usuario ni contraseña en la consola
      env: { ...process.env, LANG: 'C', LC_ALL: 'C', GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never', ...op.env },
      windowsHide: true,
    });
    let out = '';
    let err = '';
    hijo.stdout.setEncoding('utf8').on('data', (d: string) => (out += d));
    hijo.stderr.setEncoding('utf8').on('data', (d: string) => (err += d));
    const reloj = setTimeout(() => { err += '\n(tiempo agotado)'; hijo.kill(); }, op.ms ?? 60_000);
    hijo.on('error', (e) => { clearTimeout(reloj); resolve({ codigo: -1, out, err: String(e) }); });
    hijo.on('close', (codigo) => { clearTimeout(reloj); resolve({ codigo: codigo ?? -1, out, err }); });
    // Si git ya terminó cuando le llega la entrada (en Linux, con la integración continua), escribirle da EPIPE: no es una
    // falla de la orden, que ya dijo cómo salió en «close», y sin esto el error queda suelto y tumba al servidor o a las pruebas
    hijo.stdin.on('error', () => undefined);
    hijo.stdin.end(op.entrada ?? '');
  });
}

export const correrGit = (raiz: string, args: string[], op?: Opciones) => correr('git', raiz, ['-c', 'core.quotepath=false', ...args], op);

async function git(raiz: string, args: string[], op?: Opciones): Promise<string> {
  const s = await correrGit(raiz, args, op);
  if (s.codigo !== 0) throw new Error(`git ${args[0]}: ${(s.err || s.out).trim().split('\n').slice(-2).join(' ')}`);
  return s.out;
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function leerProyecto(raiz: string, id: string): Promise<Proyecto | null> {
  try {
    return JSON.parse(await readFile(enDisco(raiz, rutasDe(id).proyecto), 'utf-8'));
  } catch {
    return null;
  }
}

let identidadGuardada: { clave: string; cuando: number; id: Identidad } | null = null;
export const olvidarIdentidad = () => (identidadGuardada = null);

/**
 * La identidad de git de la carpeta del Studio (se relee cada 15 s). El Studio es de una sola persona (pd_sin_modo_equipo):
 * quien tiene la identidad es el titular de cada proyecto, sin buscarla en ningún equipo. Sin identidad no se firma nada
 * (nunca con la de otro): la página la pide una vez al abrir el Studio (ventanaIdentidad.ts, nmwds81gbtit, nmwfln1gatit).
 * Sin proyecto, el rol es nulo: quien entrega el primero queda como su titular.
 */
export async function leerIdentidad(raiz: string, proyecto: string | null): Promise<Identidad> {
  const clave = `${raiz}|${proyecto}`;
  if (identidadGuardada?.clave === clave && Date.now() - identidadGuardada.cuando < 15_000) return identidadGuardada.id;
  const [nombre, correo] = await Promise.all(['user.name', 'user.email'].map(async (k) => (await correrGit(raiz, ['config', k])).out.trim()));
  let id: Identidad;
  if (!nombre || !correo) id = { nombre, correo, rol: null, problema: t('identidad.falta') };
  else if (!proyecto) id = { nombre, correo, rol: null, problema: t('identidad.sinProyectos') };
  else {
    // Un proyecto hecho a mano, sin titular en su proyecto.json: la primera decisión lo anota (api.ts › decidir)
    const equipo = (await leerProyecto(raiz, proyecto))?.equipo ?? [];
    id = { nombre, correo, rol: TITULAR, ...(equipo.some((i) => i.id === TITULAR) ? {} : { nuevo: true }) };
  }
  identidadGuardada = { clave, cuando: Date.now(), id };
  return id;
}

/** El nombre y el correo que se guardan como identidad, o por qué no sirven. Pura. */
export function identidadValida(nombre: unknown, correo: unknown): { nombre: string; correo: string } | { error: 'nombre' | 'correo' } {
  const n = typeof nombre === 'string' ? nombre.trim() : '';
  const c = typeof correo === 'string' ? correo.trim() : '';
  if (!n || n.length > 120 || /[\n\r<>]/.test(n)) return { error: 'nombre' };
  if (c.length > 200 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(c)) return { error: 'correo' };
  return { nombre: n, correo: c };
}

/**
 * Guarda la identidad con git config en la carpeta del Studio, solo si le falta (la ventana la pide una vez y nunca pisa
 * una que ya está). 'ya': ya tenía las dos; 'ok': guardada.
 */
export async function guardarIdentidad(raiz: string, nombre: string, correo: string): Promise<'ok' | 'ya'> {
  const [n, c] = await Promise.all(['user.name', 'user.email'].map(async (k) => (await correrGit(raiz, ['config', k])).out.trim()));
  if (n && c) return 'ya';
  if (!n) await git(raiz, ['config', 'user.name', nombre]);
  if (!c) await git(raiz, ['config', 'user.email', correo]);
  olvidarIdentidad();
  return 'ok';
}

export type Fase = 'local' | 'en_espera';
export interface EstadoSync {
  fase: Fase;
  /** Para mostrar en el Estudio, en español. */
  mensaje: string;
  /** Decisiones que aún no están en un commit local. */
  porSubir: number;
}

interface Pendiente { rutas: string[]; mensaje: string }

/** Uno por memoria de proyecto (`raiz` es su carpeta `.stl`, rama `stl`). Todo lo que toca git va en fila, una cosa a la vez. */
export class Sincronizador {
  private fila: Promise<unknown> = Promise.resolve();
  private pendientes: Pendiente[] = [];
  private archivoPendientes: string | null = null;
  private rutasOcupado: string[] = [];
  private info: EstadoSync = { fase: 'local', mensaje: t('syncMsg.inicial'), porSubir: 0 };

  private readonly raiz: string;
  constructor(raiz: string) {
    this.raiz = raiz;
  }

  estado(): EstadoSync {
    return { ...this.info, porSubir: this.info.porSubir + this.pendientes.length };
  }

  /**
   * Registra una decisión ya escrita en su archivo: la deja en un commit local (o en espera, si git está ocupado).
   * Nunca falla: los problemas quedan en el estado.
   */
  async registrar(rutas: string[], mensaje: string): Promise<EstadoSync> {
    try {
      await this.cargarPendientes();
      this.pendientes.push({ rutas: rutas.map((r) => this.relativa(r)), mensaje });
      await this.guardarPendientes();
      if (!(await this.enFila(() => this.commitear()))) return this.estado();
      this.poner('local', t('syncMsg.guardadoLocal'));
    } catch (e) {
      this.poner('en_espera', t('syncMsg.sinCommit', { detalle: (e as Error).message }));
    }
    return this.estado();
  }

  // ------------------------------------------------------------------ pasos

  private enFila<T>(tarea: () => Promise<T>): Promise<T> {
    const r = this.fila.then(tarea, tarea);
    this.fila = r.catch(() => undefined);
    return r;
  }

  private poner(fase: Fase, mensaje: string) {
    this.info.fase = fase;
    this.info.mensaje = mensaje;
  }

  private relativa(ruta: string): string {
    return (isAbsolute(ruta) ? relative(this.raiz, ruta) : ruta).split(sep).join('/');
  }

  private async rutaGit(nombre: string): Promise<string> {
    const r = (await git(this.raiz, ['rev-parse', '--git-path', nombre])).trim();
    return isAbsolute(r) ? r : join(this.raiz, r);
  }

  private async cargarPendientes() {
    if (this.archivoPendientes) return;
    this.archivoPendientes = await this.rutaGit('estudio-pendientes.json');
    this.rutasOcupado = await Promise.all(['rebase-merge', 'rebase-apply', 'MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD'].map((n) => this.rutaGit(n)));
    try {
      this.pendientes = JSON.parse(await readFile(this.archivoPendientes, 'utf-8'));
    } catch {
      this.pendientes = [];
    }
  }

  /** Fuera de git (en .git/): sobrevive a un reinicio del servidor sin versionarse. */
  private async guardarPendientes() {
    if (!this.archivoPendientes) return;
    if (this.pendientes.length) await writeFile(this.archivoPendientes, JSON.stringify(this.pendientes, null, 2));
    else await rm(this.archivoPendientes, { force: true });
  }

  /** Por qué no se puede commitear ahora (null: se puede). */
  private async ocupado(): Promise<string | null> {
    if (this.rutasOcupado.slice(0, 2).some((r) => existsSync(r))) return t('syncMsg.ocupadoRebase');
    if (this.rutasOcupado.slice(2).some((r) => existsSync(r))) return t('syncMsg.ocupadoMerge');
    if (!(await this.rama())) return t('syncMsg.ocupadoHead');
    return null;
  }

  private async rama(): Promise<string> {
    return (await correrGit(this.raiz, ['symbolic-ref', '-q', '--short', 'HEAD'])).out.trim();
  }

  /** Otra sesión puede tener tomado el índice de git un momento: se reintenta. */
  private async conReintentos(args: string[]) {
    for (let i = 0; ; i++) {
      const s = await correrGit(this.raiz, args);
      if (s.codigo === 0) return;
      if (!s.err.includes('index.lock') || i >= 15) throw new Error(`git ${args[0]}: ${s.err.trim().split('\n').slice(-2).join(' ')}`);
      await dormir(400);
    }
  }

  /** Commit local de cada decisión pendiente, solo con sus rutas. false: git ocupado (quedan en espera). */
  private async commitear(): Promise<boolean> {
    await this.cargarPendientes();
    if (!this.pendientes.length) return true;
    const motivo = await this.ocupado();
    if (motivo) {
      this.poner('en_espera', t('syncMsg.enEspera', { detalle: motivo }));
      return false;
    }
    while (this.pendientes.length) {
      const p = this.pendientes[0];
      const rutas = p.rutas.filter((r) => existsSync(join(this.raiz, r)));
      if (rutas.length && (await git(this.raiz, ['status', '--porcelain', '--', ...rutas])).trim()) {
        const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        await this.conReintentos(['add', '--', ...rutas]);
        await this.conReintentos(['commit', '-q', '-m', `${p.mensaje}\n\n${PIE}\n${CLAVE_ID}: ${id}`, '--', ...rutas]);
      }
      this.pendientes.shift();
      await this.guardarPendientes();
    }
    return true;
  }
}
