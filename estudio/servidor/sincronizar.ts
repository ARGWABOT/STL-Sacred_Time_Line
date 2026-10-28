// Quién decide en este Estudio y cómo se guarda cada decisión en git.
//
// - Quién decide: la identidad de git del clon (`git config user.name` y `user.email`). El proyecto.json de cada
//   proyecto (en su memoria, versionado) dice quién es quién en el equipo por su correo: el titular fija la meta, cruza
//   las puertas y tiene la última palabra. Sin identidad no se decide nada (nunca se firma con la de otro). Quien
//   entrega un proyecto es su titular.
// - Cada decisión es un commit local en la memoria del proyecto (`<repositorio>/.stl`, rama `stl`), solo con su archivo
//   (el de la persona, sus audios o el proyecto), con el pie «Origen: Estudio». Hay un Sincronizador por memoria. Si
//   el titular activó la sincronización y hay un remoto `origin`, se sube SOLO ese cambio: se
//   arma un commit igual encima de la punta de GitHub con un índice temporal, sin tocar la carpeta de trabajo ni la
//   rama local, y se empuja sin forzar. Al próximo `git pull --rebase`, git descarta el commit local porque GitHub ya
//   tiene el mismo cambio. Si allá ese archivo cambió por otro lado, no se fuerza nada: el Estudio avisa.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, sep } from 'node:path';
import { TITULAR, type Persona, type Proyecto } from '../../src/director/director.ts';
import { enDisco, rutasDe, SUBE_SOLO } from '../../src/director/proyectos.ts';

export interface Identidad {
  nombre: string;
  correo: string;
  rol: Persona | null;
  problema?: string;
  /** El equipo está vacío: quien abre el Estudio es el titular hasta que guarde el Proyecto. */
  nuevo?: boolean;
}

/** Pie de los commits de decisiones: así se reconocen en la rama local para subirlos. */
export const PIE = 'Origen: Estudio';
const CLAVE_ID = 'Decision';
const reId = new RegExp(`^${CLAVE_ID}: (\\S+)$`, 'm');

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

const lineas = (texto: string) => texto.split('\n').map((l) => l.trim()).filter(Boolean);
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
 * La identidad del clon y quién es en el equipo del proyecto (se relee cada 15 s: basta configurar git y esperar). Sin
 * proyecto, el rol es nulo: cualquiera con identidad puede crear uno y queda como su titular.
 */
export async function leerIdentidad(raiz: string, proyecto: string | null): Promise<Identidad> {
  const clave = `${raiz}|${proyecto}`;
  if (identidadGuardada?.clave === clave && Date.now() - identidadGuardada.cuando < 15_000) return identidadGuardada.id;
  const [nombre, correo] = await Promise.all(['user.name', 'user.email'].map(async (k) => (await correrGit(raiz, ['config', k])).out.trim()));
  let id: Identidad;
  if (!nombre || !correo) {
    id = {
      nombre, correo, rol: null,
      problema: 'Este clon no tiene identidad de git y el Estudio no firma decisiones con la de otro. Configúrala con '
        + 'git config user.name "Tu Nombre" y git config user.email "tu@correo.com" en la carpeta del Estudio.',
    };
  } else {
    const equipo = proyecto ? ((await leerProyecto(raiz, proyecto))?.equipo ?? []) : [];
    const yo = equipo.find((i) => i.correo.trim().toLowerCase() === correo.trim().toLowerCase());
    if (!proyecto) id = { nombre, correo, rol: null, problema: 'Aún no hay proyectos: crea el primero.' };
    else if (yo) id = { nombre, correo, rol: yo.id };
    else if (!equipo.some((i) => i.id === TITULAR)) id = { nombre, correo, rol: TITULAR, nuevo: true };
    else id = { nombre, correo, rol: null, problema: `Tu correo de git (${correo}) no está en el equipo: pídele al titular que te agregue en Proyecto › El equipo.` };
  }
  identidadGuardada = { clave, cuando: Date.now(), id };
  return id;
}

export type Fase = 'local' | 'revisando' | 'al_dia' | 'subiendo' | 'en_espera' | 'sin_red' | 'choque';
export interface EstadoSync {
  fase: Fase;
  /** Para mostrar en el Estudio, en español. */
  mensaje: string;
  /** Decisiones que aún no están en GitHub. */
  porSubir: number;
  revisado: string | null;
  subido: string | null;
}

interface Pendiente { rutas: string[]; mensaje: string }
interface Entrada { modo: string; sha: string }
interface Cambio { ruta: string; entrada: Entrada | null }
interface Armado { punta: string | null; choques: string[]; detenidas: number }

/** Uno por memoria de proyecto (`raiz` es su carpeta `.stl`, rama `stl`). Todo lo que toca git va en fila, una cosa a la vez. */
export class Sincronizador {
  private fila: Promise<unknown> = Promise.resolve();
  private pendientes: Pendiente[] = [];
  private archivoPendientes: string | null = null;
  private rutasOcupado: string[] = [];
  private info: EstadoSync = { fase: 'local', mensaje: 'Las decisiones se guardan en commits locales.', porSubir: 0, revisado: null, subido: null };

  private readonly raiz: string;
  /** Si hay que subir a GitHub (lo decide el titular en Proyecto). Las rutas que recibe son relativas a la memoria. */
  private readonly subir: () => Promise<boolean>;

  constructor(raiz: string, subir: () => Promise<boolean> = async () => false) {
    this.raiz = raiz;
    this.subir = subir;
  }

  estado(): EstadoSync {
    return { ...this.info, porSubir: this.info.porSubir + this.pendientes.length };
  }

  /**
   * Registra una decisión ya escrita en su archivo: la deja en un commit local (o en espera, si git está ocupado) y,
   * si toca, lanza la subida a GitHub sin esperarla. Nunca falla: los problemas quedan en el estado.
   */
  async registrar(rutas: string[], mensaje: string): Promise<EstadoSync> {
    try {
      await this.cargarPendientes();
      this.pendientes.push({ rutas: rutas.map((r) => this.relativa(r)), mensaje });
      await this.guardarPendientes();
      if (!(await this.enFila(() => this.commitear()))) return this.estado();
      if (await this.subir()) {
        this.poner('subiendo', 'Subiendo la decisión a GitHub…');
        this.revisar().catch(() => undefined);
      } else {
        this.poner('local', 'Guardado en un commit local (la subida a GitHub está apagada en Proyecto).');
      }
    } catch (e) {
      this.poner('en_espera', `La decisión quedó guardada en su archivo, pero no se pudo hacer su commit: ${(e as Error).message}`);
    }
    return this.estado();
  }

  /** Sube lo que falte (si la subida está activa y hay remoto). */
  revisar(): Promise<void> {
    return this.enFila(() => this.ciclo()).catch((e) => this.poner('sin_red', `No se pudo revisar GitHub: ${(e as Error).message}`));
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
    if (this.rutasOcupado.slice(0, 2).some((r) => existsSync(r))) return 'Otra sesión está en medio de un rebase de git.';
    if (this.rutasOcupado.slice(2).some((r) => existsSync(r))) return 'Git está en medio de una mezcla (merge o cherry-pick).';
    if (!(await this.rama())) return 'La carpeta no está en una rama (HEAD suelto).';
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
      this.poner('en_espera', `${motivo} La decisión quedó guardada en su archivo y se guarda en git sola cuando se desocupe.`);
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

  private async ciclo() {
    await this.cargarPendientes();
    if (!(await this.commitear())) return;
    if (!(await this.subir())) return this.poner('local', 'Las decisiones se guardan en commits locales (la subida a GitHub está apagada en Proyecto).');
    if ((await correrGit(this.raiz, ['remote', 'get-url', 'origin'])).codigo !== 0) return this.poner('local', 'Este Estudio no tiene remoto «origin»: las decisiones quedan en commits locales.');
    const rama = await this.rama();
    // La primera vez, GitHub aún no tiene la rama de la memoria: se sube entera (sin forzar)
    const arriba = await correrGit(this.raiz, ['ls-remote', '--exit-code', '--heads', 'origin', rama], { ms: 90_000 });
    if (arriba.codigo === 2) {
      const s = await correrGit(this.raiz, ['push', '--porcelain', 'origin', `refs/heads/${rama}:refs/heads/${rama}`], { ms: 90_000 });
      if (s.codigo !== 0) return this.poner('sin_red', `No se pudo subir la memoria a GitHub (${resumen(s.err || s.out)}). Queda en commits locales; se reintenta con la próxima.`);
      this.info.subido = this.info.revisado = new Date().toISOString();
      this.info.porSubir = 0;
      return this.poner('al_dia', 'La memoria del proyecto quedó en GitHub, en su rama.');
    }
    for (let intento = 0; intento < 4; intento++) {
      const f = await correrGit(this.raiz, ['fetch', '--quiet', 'origin', rama], { ms: 90_000 });
      if (f.codigo !== 0) return this.poner('sin_red', `Sin conexión con GitHub (${resumen(f.err)}). Las decisiones quedan en commits locales y se suben solas.`);
      const armado = await this.armar(rama);
      if (armado.punta) {
        const s = await correrGit(this.raiz, ['push', '--porcelain', 'origin', `${armado.punta}:refs/heads/${rama}`], { ms: 90_000 });
        if (s.codigo !== 0) {
          // Alguien subió algo justo antes: se trae y se vuelve a armar encima (nunca se fuerza)
          if (/\[rejected\]|non-fast-forward|fetch first/i.test(s.out + s.err)) continue;
          return this.poner('sin_red', `No se pudo subir a GitHub (${resumen(s.err || s.out)}). La decisión está en un commit local; se reintenta con la próxima.`);
        }
        this.info.subido = new Date().toISOString();
      }
      this.info.porSubir = armado.detenidas;
      this.info.revisado = new Date().toISOString();
      if (armado.choques.length) {
        return this.poner('choque', `En GitHub cambió ${armado.choques.join(', ')} mientras se decidía aquí: hay que sincronizar `
          + '(git pull --rebase y resolver ese archivo). La decisión está en un commit local y no se forzó nada.');
      }
      return this.poner('al_dia', armado.punta ? 'Decisión subida a GitHub.' : 'Al día con GitHub.');
    }
    this.poner('sin_red', 'GitHub cambió varias veces seguidas mientras se subía la decisión; se reintenta con la próxima.');
  }

  private async entrada(rev: string, ruta: string): Promise<Entrada | null> {
    const m = /^(\d+) blob ([0-9a-f]+)\t/.exec(await git(this.raiz, ['ls-tree', rev, '--', ruta]));
    return m ? { modo: m[1], sha: m[2] } : null;
  }

  /** Arma encima de la punta de GitHub un commit por cada decisión local que falte allá. */
  private async armar(rama: string): Promise<Armado> {
    const remota = `refs/remotes/origin/${rama}`;
    const local = `refs/heads/${rama}`;
    if ((await correrGit(this.raiz, ['rev-parse', '--verify', '--quiet', remota])).codigo !== 0) return { punta: null, choques: [], detenidas: 0 };
    const base = (await git(this.raiz, ['merge-base', local, remota])).trim();
    const decisiones = lineas(await git(this.raiz, ['log', '--reverse', '--format=%H', `--grep=^${PIE}$`, `${remota}..${local}`]));
    const idsArriba = new Set([...(await git(this.raiz, ['log', '--format=%B', `--grep=^${CLAVE_ID}: `, `${base}..${remota}`]))
      .matchAll(new RegExp(reId.source, 'gm'))].map((m) => m[1]));
    let punta = (await git(this.raiz, ['rev-parse', remota])).trim();
    const choques: string[] = [];
    let aplicadas = 0;
    let detenidas = 0;
    for (const c of decisiones) {
      const id = reId.exec(await git(this.raiz, ['log', '-1', '--format=%B', c]))?.[1];
      if (id && idsArriba.has(id)) continue;
      const rutas = lineas(await git(this.raiz, ['diff-tree', '-r', '--no-commit-id', '--name-only', c]));
      if (!rutas.length || rutas.some((r) => !SUBE_SOLO.test(r))) continue; // solo lo que escribe el Estudio
      const cambios: Cambio[] = [];
      let choque = false;
      for (const ruta of rutas) {
        const [arriba, antes, ahora] = await Promise.all([this.entrada(punta, ruta), this.entrada(`${c}^`, ruta), this.entrada(c, ruta)]);
        if (arriba?.sha === ahora?.sha) continue; // ya está en GitHub
        if (arriba?.sha === antes?.sha) { cambios.push({ ruta, entrada: ahora }); continue; }
        choques.push(ruta);
        choque = true;
        break;
      }
      if (choque) { detenidas++; continue; }
      if (!cambios.length) continue;
      punta = await this.commitEncima(punta, c, cambios);
      aplicadas++;
    }
    return { punta: aplicadas ? punta : null, choques, detenidas };
  }

  /** El mismo cambio de la decisión `c`, encima de `padre`, con un índice temporal (no toca la carpeta ni la rama). */
  private async commitEncima(padre: string, c: string, cambios: Cambio[]): Promise<string> {
    const indice = join(tmpdir(), `estudio-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.index`);
    const env = { GIT_INDEX_FILE: indice };
    try {
      await git(this.raiz, ['read-tree', padre], { env });
      const info = cambios.map(({ ruta, entrada }) => (entrada ? `${entrada.modo} ${entrada.sha}\t${ruta}` : `0 ${'0'.repeat(40)}\t${ruta}`));
      await git(this.raiz, ['update-index', '--index-info'], { env, entrada: info.join('\n') + '\n' });
      const arbol = (await git(this.raiz, ['write-tree'], { env })).trim();
      const [nombre, correo, fecha, ...resto] = (await git(this.raiz, ['log', '-1', '--format=%an%x00%ae%x00%aI%x00%B', c])).split('\0');
      return (await git(this.raiz, ['commit-tree', arbol, '-p', padre, '-F', '-'], {
        env: { GIT_AUTHOR_NAME: nombre, GIT_AUTHOR_EMAIL: correo, GIT_AUTHOR_DATE: fecha },
        entrada: resto.join('\0').trim() + '\n',
      })).trim();
    } finally {
      await rm(indice, { force: true });
    }
  }
}

function resumen(texto: string): string {
  return texto.trim().split('\n').filter((l) => !/^To |^\s*$/.test(l)).slice(-1)[0]?.slice(0, 160) || 'sin detalle';
}
