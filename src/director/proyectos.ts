// Los proyectos del Estudio. Un Estudio dirige varios proyectos, y la memoria de cada uno vive en SU repositorio, no en
// el Estudio: en una rama aparte, `stl`, que el Estudio abre en la carpeta `.stl/` del proyecto (un worktree de git,
// excluido solo en ese computador). Así el código del proyecto no se mezcla con la dirección, su integración continua no
// corre por ella, y el Estudio queda limpio: solo su código y lo de este computador.
//
//   <repositorio>/.stl/proyecto.json              el contexto, el objetivo y el equipo (lo escribe el titular)
//   <repositorio>/.stl/director/plan.json         la ruta y lo que dice el director (lo escribe la sesión del director)
//   <repositorio>/.stl/director/archivo.json      lo cerrado que salió del plan para que no pese (la bandeja, al cerrar)
//   <repositorio>/.stl/director/equipo/<p>.json   lo que hace cada persona: entregas, notas, decisiones (el Estudio)
//   <repositorio>/.stl/director/notas/            los audios y sus transcripciones
//   <repositorio>/.stl/docs/                      los documentos del director para ese proyecto
//
// Dentro del Estudio, todo eso se nombra con rutas virtuales, `proyectos/<id>/…` (así lo guardan las notas y así lo
// piden las páginas): `ubicar` y `enDisco` dicen dónde está de verdad. Lo que es de cada computador no va en git:
// estudio.local.json guarda el proyecto activo y la carpeta del repositorio de cada proyecto, que es también la lista
// de proyectos de este Estudio. Lo usan el servidor del Estudio y tools/director/*.ts (por eso no importa nada relativo
// en tiempo de ejecución: Node lo corre tal cual).
import { execFile } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import type { Proyecto, TipoProyecto } from './director';

/** El prefijo de las rutas virtuales de los proyectos dentro del Estudio. */
export const CARPETA = 'proyectos';
/** La carpeta de la memoria dentro del repositorio de cada proyecto, y su rama. */
export const MEMORIA = '.stl';
export const RAMA = 'stl';
export const ARCHIVO_LOCAL = 'estudio.local.json';
export const ID_VALIDO = /^[a-z0-9][a-z0-9-]{0,39}$/;

/** Las rutas virtuales (con «/») de lo de un proyecto. */
export function rutasDe(id: string) {
  const base = `${CARPETA}/${id}`;
  return {
    base,
    proyecto: `${base}/proyecto.json`,
    plan: `${base}/director/plan.json`,
    /** Lo que salió del plan para que no pese: respuestas y veredictos cerrados (director › `unirArchivo`). */
    archivo: `${base}/director/archivo.json`,
    equipo: `${base}/director/equipo`,
    persona: (p: string) => `${base}/director/equipo/${p}.json`,
    notas: `${base}/director/notas`,
    docs: `${base}/docs`,
    radiografia: `${base}/director/radiografia.md`,
  };
}

/** Lo que el Estudio sube solo a GitHub, relativo a la memoria: lo de cada persona, sus audios y lo del proyecto. */
export const SUBE_SOLO = /^(director\/equipo\/|director\/notas\/|proyecto\.json$)/;

/** Un id para un proyecto nuevo, a partir de su nombre. */
export function idDeNombre(nombre: string, usados: string[]): string {
  const base = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'proyecto';
  let id = base;
  for (let i = 2; usados.includes(id); i++) id = `${base}-${i}`;
  return id;
}

// ───────────────────────────────────────────── lo de este computador

export interface Local {
  /** El proyecto activo en este computador. */
  activo: string | null;
  /** La carpeta del repositorio de cada proyecto en este computador: también, la lista de proyectos. */
  repositorios: Record<string, string>;
  /** La revisión pedida desde el Studio (botón «Pedir revisión»): la lanza el Studio o la toma la sesión del director. */
  revision?: RevisionPedida;
  /** «No lo entiendo, explícamelo mejor» de un paso: la lanza el Studio aparte, sin el resto de la revisión. */
  aclaracion?: AclaracionPedida;
  /** Una nota urgente: la lanza el Studio sola y al instante, sin el resto de la revisión. */
  urgencia?: UrgenciaPedida;
  /**
   * La última vez que la sesión del director miró si había una revisión pedida (/vigila › bandeja --pedida). Así el
   * Studio sabe si alguien está mirando: un ciclo (/loop) vive solo mientras su sesión está abierta.
   */
  vigilia?: string;
  /**
   * Si el Studio lanza solo al director cuando se pide una revisión (estudio/servidor/revisor.ts). Sin decir nada, lo
   * hace si encuentra Claude Code con su sesión iniciada; `false` lo apaga y las toma la sesión del director (/vigila).
   */
  agente?: false;
}

/**
 * Una revisión pedida desde el Studio. La toma el director lanzado por el Studio (`lanzada`) o, sin él, la sesión del
 * director en su ciclo (/loop con /vigila, que mira `bandeja.ts --pedida`). Al empezar queda `enCurso` y al cerrar,
 * `hecha`. Si la lanzada no terminó, `error` dice por qué, y la puede tomar la sesión del director.
 */
export interface RevisionPedida {
  proyecto: string;
  quien: string;
  pedida: string;
  lanzada?: string;
  enCurso?: string;
  hecha?: string;
  error?: string;
}

/**
 * Un paso que alguien no entendió («No lo entiendo, explícamelo mejor»): una ida y vuelta corta. El Studio lanza al
 * director solo para ese paso (`lanzada`), sin esperar ni procesar el resto de lo pendiente; al cerrar con
 * `bandeja.ts --aclarar --listo` queda `hecha`. Si no se pudo, `error` dice por qué y la nota espera la revisión.
 */
export interface AclaracionPedida {
  proyecto: string;
  mision: string;
  /** El número del paso, desde 0. */
  paso: number;
  /** La nota del Buzón que la pide. */
  nota: string;
  quien: string;
  pedida: string;
  lanzada?: string;
  hecha?: string;
  error?: string;
}

/**
 * Una o varias notas urgentes: el Studio lanza al director solo para ellas (`lanzada`), al instante, y lo demás del Buzón
 * espera la revisión completa. Al cerrar con `bandeja.ts --urgente --listo` queda `hecha`; el resultado llega como
 * reporte en «Dónde quedamos». Las urgentes que llegan mientras el director atiende otras esperan en `luego` y se lanzan
 * al terminar. Si no se pudo, `error` dice por qué y las notas esperan la revisión, que se pide.
 */
export interface UrgenciaPedida {
  proyecto: string;
  /** Las notas urgentes del Buzón que se atienden en este lanzamiento. */
  notas: string[];
  /** Las que llegaron mientras tanto: van en el lanzamiento siguiente. */
  luego?: string[];
  quien: string;
  pedida: string;
  lanzada?: string;
  hecha?: string;
  error?: string;
}

const vacio = (): Local => ({ activo: null, repositorios: {} });
const normal = (x: any): Local => ({
  activo: typeof x?.activo === 'string' ? x.activo : null,
  repositorios: x?.repositorios && typeof x.repositorios === 'object' ? x.repositorios : {},
  ...(x?.revision && typeof x.revision.proyecto === 'string' && typeof x.revision.pedida === 'string' ? { revision: x.revision as RevisionPedida } : {}),
  ...(x?.aclaracion && typeof x.aclaracion.proyecto === 'string' && typeof x.aclaracion.nota === 'string' && typeof x.aclaracion.paso === 'number' ? { aclaracion: x.aclaracion as AclaracionPedida } : {}),
  ...(x?.urgencia && typeof x.urgencia.proyecto === 'string' && Array.isArray(x.urgencia.notas) && typeof x.urgencia.pedida === 'string' ? { urgencia: x.urgencia as UrgenciaPedida } : {}),
  ...(typeof x?.vigilia === 'string' ? { vigilia: x.vigilia } : {}),
  ...(x?.agente === false ? { agente: false as const } : {}),
});

/** Cada cuánto mira la sesión del director (/loop 5m /vigila), y desde cuándo se considera que nadie está mirando. */
export const VIGILIA_MIN = 5;
export const vigilando = (vigilia: string | undefined | null, ahora = Date.now()) => !!vigilia && ahora - Date.parse(vigilia) < (VIGILIA_MIN * 2 + 2) * 60_000;

/** La sesión del director acaba de mirar si había una revisión pedida. */
export async function marcarVigilia(raiz: string): Promise<void> {
  const l = await leerLocal(raiz);
  await guardarLocal(raiz, { ...l, vigilia: new Date().toISOString() });
}

export async function leerLocal(raiz: string): Promise<Local> {
  try {
    return normal(JSON.parse(await readFile(join(raiz, ARCHIVO_LOCAL), 'utf-8')));
  } catch {
    return vacio();
  }
}

// Lo mismo, sin esperar: para resolver rutas en cualquier parte. Se relee solo si el archivo cambió.
let enMemoria: { raiz: string; cuando: number; local: Local } | null = null;
export function leerLocalYa(raiz: string): Local {
  const archivo = join(raiz, ARCHIVO_LOCAL);
  try {
    const cuando = statSync(archivo).mtimeMs;
    if (enMemoria?.raiz === raiz && enMemoria.cuando === cuando) return enMemoria.local;
    const local = normal(JSON.parse(readFileSync(archivo, 'utf-8')));
    enMemoria = { raiz, cuando, local };
    return local;
  } catch {
    return vacio();
  }
}

/**
 * ¿El director está trabajando ahora en este computador? Una revisión que ya empezó (o que el Studio lanzó), o una
 * aclaración o una urgencia lanzadas, sin cerrar ni fallar. Mientras tanto, el Studio no se recarga a pedazos.
 */
export function directorTrabajando(l: Local): boolean {
  const r = l.revision;
  const corriendo = (x: { lanzada?: string; hecha?: string; error?: string } | undefined) => !!x && !!x.lanzada && !x.hecha && !x.error;
  return (!!r && !r.hecha && !r.error && !!(r.enCurso || r.lanzada)) || corriendo(l.aclaracion) || corriendo(l.urgencia);
}

async function guardarLocal(raiz: string, l: Local): Promise<void> {
  const x = { nota: 'Lo de este computador, fuera de git: el proyecto activo y la carpeta del repositorio de cada proyecto (su memoria está en <repositorio>/.stl, rama stl).', ...l };
  await writeFile(join(raiz, ARCHIVO_LOCAL), JSON.stringify(x, null, 2) + '\n', 'utf-8');
  enMemoria = null;
}

export async function guardarActivo(raiz: string, id: string): Promise<void> {
  const l = await leerLocal(raiz);
  await guardarLocal(raiz, { ...l, activo: id });
}

export async function guardarRutaRepositorio(raiz: string, id: string, ruta: string): Promise<void> {
  const l = await leerLocal(raiz);
  await guardarLocal(raiz, { ...l, repositorios: { ...l.repositorios, [id]: ruta } });
}

/** Saca un proyecto de este Estudio (su memoria sigue en su repositorio, intacta). */
export async function olvidarProyecto(raiz: string, id: string): Promise<void> {
  const l = await leerLocal(raiz);
  const { [id]: _, ...resto } = l.repositorios;
  await guardarLocal(raiz, { ...l, activo: l.activo === id ? null : l.activo, repositorios: resto });
}

/** Pide (o cancela, con `quien` null) la revisión del director para un proyecto. */
export async function pedirRevision(raiz: string, proyecto: string, quien: string | null): Promise<RevisionPedida | null> {
  const l = await leerLocal(raiz);
  const revision = quien ? { proyecto, quien, pedida: new Date().toISOString() } : undefined;
  await guardarLocal(raiz, { ...l, revision });
  return revision ?? null;
}

/**
 * El Studio lanzó al director para la revisión pedida, o la lanzada no terminó y `error` dice por qué: entonces vuelve a
 * quedar pedida (sin `enCurso`, para que el Studio no siga esperando), y la puede tomar la sesión del director.
 */
export async function marcarLanzada(raiz: string, proyecto: string, error?: string): Promise<void> {
  const l = await leerLocal(raiz);
  const r = l.revision?.proyecto === proyecto && !l.revision.hecha ? l.revision : null;
  if (!r) return;
  const base = { proyecto: r.proyecto, quien: r.quien, pedida: r.pedida };
  await guardarLocal(raiz, { ...l, revision: error ? { ...base, error } : { ...base, lanzada: new Date().toISOString() } });
}

/** La revisión pedida empieza (`en_curso`) o termina (`hecha`). Sin una pedida, `hecha` igual deja la fecha. */
export async function marcarRevision(raiz: string, proyecto: string, paso: 'en_curso' | 'hecha'): Promise<void> {
  const l = await leerLocal(raiz);
  const r = l.revision?.proyecto === proyecto ? l.revision : null;
  if (paso === 'en_curso' && (!r || r.hecha || r.enCurso)) return;
  const ahora = new Date().toISOString();
  await guardarLocal(raiz, { ...l, revision: paso === 'en_curso' ? { ...r!, enCurso: ahora } : { ...(r ?? { proyecto, quien: '', pedida: ahora }), hecha: ahora } });
}

/** Pide que el director aclare un paso, aparte de la revisión (reemplaza una aclaración anterior ya cerrada o fallida). */
export async function pedirAclaracion(raiz: string, a: Pick<AclaracionPedida, 'proyecto' | 'mision' | 'paso' | 'nota' | 'quien'>): Promise<AclaracionPedida> {
  const l = await leerLocal(raiz);
  const aclaracion: AclaracionPedida = { ...a, pedida: new Date().toISOString() };
  await guardarLocal(raiz, { ...l, aclaracion });
  return aclaracion;
}

/** La aclaración se lanzó, terminó (`hecha`) o falló (`error`): solo si es la de esa nota. */
export async function marcarAclaracion(raiz: string, nota: string, paso: 'lanzada' | 'hecha' | { error: string }): Promise<void> {
  const l = await leerLocal(raiz);
  const a = l.aclaracion;
  if (!a || a.nota !== nota || a.hecha || a.error) return;
  const ahora = new Date().toISOString();
  await guardarLocal(raiz, { ...l, aclaracion: paso === 'lanzada' ? { ...a, lanzada: ahora } : paso === 'hecha' ? { ...a, hecha: ahora } : { ...a, error: paso.error } });
}

/** Una urgencia en curso: pedida o lanzada, sin cerrar ni fallar. */
export const urgenciaActiva = (u: UrgenciaPedida | undefined | null): u is UrgenciaPedida => !!u && !u.hecha && !u.error;

/**
 * Pide que el director atienda notas urgentes, aparte de la revisión. Si ya hay una pedida y aún no lanzada del mismo
 * proyecto, se suman a ella; si el director ya está atendiendo una, esperan en `luego` y van en el lanzamiento siguiente.
 */
export async function pedirUrgencia(raiz: string, u: { proyecto: string; notas: string[]; quien: string }): Promise<UrgenciaPedida | null> {
  const l = await leerLocal(raiz);
  const a = urgenciaActiva(l.urgencia) ? l.urgencia : null;
  if (a && a.proyecto !== u.proyecto) return null;
  const ya = new Set([...(a?.notas ?? []), ...(a?.luego ?? [])]);
  const nuevas = u.notas.filter((n) => !ya.has(n));
  if (a && !nuevas.length) return a;
  const urgencia: UrgenciaPedida = !a ? { ...u, notas: nuevas, pedida: new Date().toISOString() }
    : a.lanzada ? { ...a, luego: [...(a.luego ?? []), ...nuevas] }
    : { ...a, notas: [...a.notas, ...nuevas] };
  await guardarLocal(raiz, { ...l, urgencia });
  return urgencia;
}

/**
 * La urgencia se lanzó, terminó (`hecha`) o falló (`error`). Al terminar, las que esperaban en `luego` quedan pedidas
 * para el lanzamiento siguiente.
 */
export async function marcarUrgencia(raiz: string, pedida: string, paso: 'lanzada' | 'hecha' | { error: string }): Promise<void> {
  const l = await leerLocal(raiz);
  const u = l.urgencia;
  if (!u || u.pedida !== pedida || u.hecha || u.error) return;
  const ahora = new Date().toISOString();
  // La siguiente se reconoce por su fecha: nunca la misma que la que termina
  const siguiente = ahora > u.pedida ? ahora : new Date(Date.parse(u.pedida) + 1).toISOString();
  const urgencia: UrgenciaPedida = paso === 'lanzada' ? { ...u, lanzada: ahora }
    : paso === 'hecha' && u.luego?.length ? { proyecto: u.proyecto, notas: u.luego, quien: u.quien, pedida: siguiente }
    : paso === 'hecha' ? { ...u, hecha: ahora }
    : { ...u, error: paso.error };
  await guardarLocal(raiz, { ...l, urgencia });
}

export async function leerRutaRepositorio(raiz: string, id: string): Promise<string | null> {
  return (await leerLocal(raiz)).repositorios[id]?.trim() || null;
}

// ───────────────────────────────────────────── dónde está cada cosa

/** La memoria de un proyecto en este computador (<repositorio>/.stl), o null si no está en este Estudio. */
export function memoriaDe(raiz: string, id: string): string | null {
  const repo = leerLocalYa(raiz).repositorios[id]?.trim();
  return repo ? join(repo, MEMORIA) : null;
}

export interface Ubicacion {
  /** La carpeta de trabajo de git donde está: la memoria del proyecto o el Estudio. */
  cwd: string;
  /** La ruta dentro de esa carpeta (con «/»; vacía si es la carpeta misma). */
  ruta: string;
  /** Si es la memoria de un proyecto (rama `stl`) y no el Estudio (rama `main`). */
  memoria: boolean;
}

/** Dónde está de verdad una ruta del Estudio: `proyectos/<id>/…` vive en la memoria del repositorio de ese proyecto. */
export function ubicar(raiz: string, ruta: string): Ubicacion {
  const m = /^proyectos\/([a-z0-9][a-z0-9-]{0,39})(?:\/(.*))?$/.exec(ruta);
  const mem = m ? memoriaDe(raiz, m[1]) : null;
  if (m && mem) return { cwd: mem, ruta: m[2] ?? '', memoria: true };
  return { cwd: raiz, ruta, memoria: false };
}

/** La ruta en disco de una ruta del Estudio. */
export function enDisco(raiz: string, ruta: string): string {
  const u = ubicar(raiz, ruta);
  return u.ruta ? join(u.cwd, ...u.ruta.split('/')) : u.cwd;
}

// ───────────────────────────────────────────── la lista y los proyectos nuevos

/** Los proyectos de este Estudio: los de estudio.local.json cuya memoria está en su repositorio. */
export async function proyectosLocales(raiz: string): Promise<string[]> {
  const l = await leerLocal(raiz);
  return Object.entries(l.repositorios)
    .filter(([id, repo]) => ID_VALIDO.test(id) && repo && existsSync(join(repo, MEMORIA, 'proyecto.json')))
    .map(([id]) => id)
    .sort();
}

/** El proyecto activo de este computador: el guardado si existe y, si no, el primero que haya. */
export function elegirActivo(local: Local, ids: string[]): string | null {
  return local.activo && ids.includes(local.activo) ? local.activo : (ids[0] ?? null);
}

function git(cwd: string, args: string[]): Promise<{ ok: boolean; out: string; err: string }> {
  return new Promise((listo) => {
    execFile('git', ['-c', 'core.quotepath=false', ...args], { cwd, encoding: 'utf8', timeout: 60_000, windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never', LANG: 'C', LC_ALL: 'C' } },
      (e, out, err) => listo({ ok: !e, out: String(out ?? ''), err: String(err ?? '') }));
  });
}

/**
 * Abre la memoria de un proyecto en su repositorio: la carpeta `.stl/` con la rama `stl`. Si la rama ya existe (aquí o
 * en GitHub, porque el proyecto ya estuvo en un Estudio), la abre tal cual; si no, la crea vacía, sin historia común con
 * el código. Excluye `.stl/` solo en este computador (.git/info/exclude): no toca el .gitignore del proyecto, ni sus
 * ramas, ni su código. Devuelve si ya tenía memoria (proyecto.json).
 */
export async function abrirMemoria(repo: string): Promise<{ yaTenia: boolean }> {
  if (!isAbsolute(repo)) throw new Error('La carpeta del repositorio debe ser una ruta completa.');
  const dir = join(repo, MEMORIA);
  const yaAbierta = existsSync(join(dir, '.git'));
  if (!yaAbierta) {
    if (existsSync(dir)) throw new Error(`Ese repositorio ya tiene una carpeta ${MEMORIA} que no es la memoria de STL: muévela o cámbiale el nombre.`);
    const hay = async (ref: string) => (await git(repo, ['rev-parse', '--verify', '--quiet', ref])).ok;
    let r;
    if (await hay(`refs/heads/${RAMA}`)) r = await git(repo, ['worktree', 'add', MEMORIA, RAMA]);
    else if (await hay(`refs/remotes/origin/${RAMA}`)) r = await git(repo, ['worktree', 'add', '--track', '-b', RAMA, MEMORIA, `origin/${RAMA}`]);
    else {
      r = await git(repo, ['worktree', 'add', '--orphan', '-b', RAMA, MEMORIA]);
      // git anterior a 2.42: sin --orphan, se abre suelta y se cambia a una rama nueva sin historia
      if (!r.ok) {
        r = await git(repo, ['worktree', 'add', '--detach', MEMORIA]);
        if (r.ok) r = await git(dir, ['switch', '--orphan', RAMA]);
      }
    }
    if (!r.ok) throw new Error(`No se pudo abrir la memoria del proyecto (${r.err.trim().split('\n').pop() || 'git falló'}).`);
  }
  const comun = (await git(repo, ['rev-parse', '--path-format=absolute', '--git-common-dir'])).out.trim();
  if (comun) {
    const excluir = join(comun, 'info', 'exclude');
    const ya = existsSync(excluir) ? await readFile(excluir, 'utf-8') : '';
    if (!ya.split(/\r?\n/).some((l) => l.trim() === `/${MEMORIA}/`)) {
      await mkdir(join(comun, 'info'), { recursive: true });
      await appendFile(excluir, `${ya && !ya.endsWith('\n') ? '\n' : ''}# La memoria de STL Studio (rama ${RAMA}): ver ${MEMORIA}/README.md\n/${MEMORIA}/\n`, 'utf-8');
    }
  }
  return { yaTenia: existsSync(join(dir, 'proyecto.json')) };
}

/** Lo que explica la rama `stl` a quien la encuentre en el repositorio o en GitHub. */
const LEEME = `# La memoria de STL Studio

Esta rama (\`${RAMA}\`) guarda la dirección del proyecto con la Metodología STL: su objetivo, su ruta, las misiones, las
notas del equipo y los documentos del director. No tiene código ni historia común con las ramas del proyecto, así que
no se mezcla con ellas ni hace correr su integración continua.

STL Studio la abre en la carpeta \`${MEMORIA}/\` del repositorio. Para retomarla en otro computador, entrega este
repositorio en tu STL Studio: la encuentra y sigue donde quedó.
`;

/**
 * Crea un proyecto en la memoria de su repositorio, desde su plantilla: su proyecto.json (con lo que contó quien lo
 * crea, que queda como titular) y su plan de arranque. Un proyecto existente nace de plantilla/plan.json (el director lo
 * diagnostica); uno nuevo, de plantilla/plan-nuevo.json (el director lo plantea a partir de lo que se le cuenta). La
 * memoria ya debe estar abierta (abrirMemoria) y el proyecto, en estudio.local.json. Devuelve las rutas virtuales que
 * escribió (para su commit).
 */
export async function crearProyecto(
  raiz: string,
  datos: { id: string; nombre: string; tipo?: TipoProyecto; contexto: string; metaInicial: string; terminado?: string; url: string; titular: { nombre: string; correo: string }; historialIA?: Proyecto['historialIA'] },
): Promise<string[]> {
  const r = rutasDe(datos.id);
  if (!memoriaDe(raiz, datos.id)) throw new Error(`El proyecto «${datos.id}» no tiene su repositorio en este Estudio.`);
  if (existsSync(enDisco(raiz, r.proyecto))) throw new Error(`El proyecto «${datos.id}» ya tiene su memoria.`);
  const tipo: TipoProyecto = datos.tipo === 'nuevo' ? 'nuevo' : 'existente';
  const proyecto: Proyecto = {
    ...JSON.parse(await readFile(join(raiz, 'plantilla', 'proyecto.json'), 'utf-8')),
    nombre: datos.nombre,
    tipo,
    contexto: datos.contexto,
    metaInicial: datos.metaInicial,
    terminado: datos.terminado ?? '',
    ...(datos.historialIA?.length ? { historialIA: datos.historialIA } : {}),
    repositorio: { url: datos.url, rama: '' },
    equipo: [{ id: 'titular', nombre: datos.titular.nombre, correo: datos.titular.correo, cargo: 'Director de proyecto', papel: 'Dirige el proyecto: fija la meta, responde las propuestas y cruza las puertas.' }],
  };
  const plan = JSON.parse(await readFile(join(raiz, 'plantilla', tipo === 'nuevo' ? 'plan-nuevo.json' : 'plan.json'), 'utf-8'));
  const hoy = new Date().toISOString().slice(0, 10);
  plan.actualizado = hoy;
  plan.mensaje.fecha = hoy;
  const escribir = async (ruta: string, x: unknown) => {
    const archivo = enDisco(raiz, ruta);
    await mkdir(join(archivo, '..'), { recursive: true });
    await writeFile(archivo, typeof x === 'string' ? x : JSON.stringify(x, null, 2) + '\n', 'utf-8');
  };
  const leeme = `${r.base}/README.md`;
  await escribir(r.proyecto, proyecto);
  await escribir(r.plan, plan);
  if (!existsSync(enDisco(raiz, leeme))) await escribir(leeme, LEEME);
  return [r.proyecto, r.plan, leeme];
}
