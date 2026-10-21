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
import { appendFile, mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
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
  // El modelo y el esfuerzo del director ya no van aquí: son los de Claude Code (estudio/servidor/ajustesClaude.ts),
  // los mismos que cambian /model y /effort
  /**
   * Salvo «Máximo», que Claude Code no guarda en su configuración (lo aplica solo a una sesión): elegido en «Modelo y
   * consumo», el Studio lo recuerda aquí y lo pasa con --effort max al director y a la terminal que abre.
   */
  esfuerzoMaximo?: true;
  /**
   * Los permisos que el titular le dio al director lanzado, más allá de los de siempre (revisor.ts › permitido). Los pide el
   * Studio cuando hacen falta y el titular los da con «Autorizo»: `ultracode`, que el director siga a ultracode cuando está
   * encendido, con los flujos de varios agentes (Workflow) que eso necesita.
   */
  permisos?: { ultracode?: true };
}

/** Un modelo que acepta `claude --model`: un alias (opus, sonnet, haiku) o un id completo. */
export const MODELO_VALIDO = /^[a-z][a-z0-9.\-[\]]{1,59}$/;

/** Los niveles de esfuerzo que acepta `claude --effort`, de menos a más. */
export const ESFUERZOS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
export type Esfuerzo = (typeof ESFUERZOS)[number];
export const esEsfuerzo =(x: unknown): x is Esfuerzo => typeof x === 'string' && (ESFUERZOS as readonly string[]).includes(x);

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
  /** El reporte de por qué no terminó, para el diálogo «Qué pasó con la revisión» (junto a `error`, que lo resume). */
  falla?: FallaRevision;
  /** Cuándo se había lanzado la que no terminó (junto a `error`: `lanzada` sale, para que la tome la sesión del director). */
  fallida?: string;
  /**
   * Pedida de nuevo después de una que no se cerró: lo que esa alcanzó a dejar (desde `lanzada`) está hecho y no se
   * rehace; la bandeja lo lista y esta revisión solo termina lo que falta (nota de voz del titular, 21 de octubre de 2026).
   */
  reintento?: Reintento;
}

/** La revisión que no se cerró y que esta retoma: desde cuándo trabajó, qué pasó y su registro. */
export interface Reintento {
  lanzada: string;
  que: string;
  registro?: string;
}

/**
 * El reporte de una revisión lanzada que no se cerró (estudio/servidor/revisor.ts › diagnosticarFalla), para el diálogo
 * «Qué pasó con la revisión» (nota de voz del titular, 21 de octubre de 2026: dos revisiones se perdieron sin decir
 * nada; si algo sale mal, se avisa, y con su porqué). Se lee del registro, sin modelo.
 */
export interface FallaRevision {
  /** Qué pasó, en una frase. */
  que: string;
  /** La causa probable, leída del registro. */
  porque: string;
  /** Cuánto duró, en minutos; null si no se sabe. */
  duracion: number | null;
  /** Lo que gastó, como lo dice Claude Code (dólares a precio de API); null si no alcanzó a decirlo. */
  gasto: number | null;
  /** Lo último que alcanzó a hacer (hasta 5 pasos, con las líneas iguales seguidas en una). */
  ultimos: { tipo: 'dice' | 'hace'; texto: string; veces?: number }[];
  /** Cuántos flujos de varios agentes (Workflow) y cuántos ayudantes (Agent, Task) lanzó; null si ninguno. */
  usoFlujos: { flujos: number; ayudantes: number } | null;
  /** Los permisos que se le negaron (la herramienta y lo que intentó), sin repetir. */
  negados: string[];
  /** Qué conviene hacer, en una frase. */
  sugerencia: string;
  /** Lo que el diálogo ofrece primero: pedirla igual, pedirla sin ultracode, o arreglar antes la cuenta. */
  accion: 'pedir' | 'sin_ultracode' | 'cuenta';
  /** Cuándo se renueva el límite de uso, si fue eso (ISO). */
  renueva?: string;
  /** El registro, desde la carpeta del Studio. */
  registro?: string;
  cuando: string;
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
/** La revisión tal cual, salvo un `reintento` mal formado, que sale. */
const revisionNormal = (r: any): RevisionPedida => {
  const { reintento, ...resto } = r;
  const bien = reintento && typeof reintento.lanzada === 'string' && typeof reintento.que === 'string';
  return { ...resto, ...(bien ? { reintento: { lanzada: reintento.lanzada, que: reintento.que, ...(typeof reintento.registro === 'string' ? { registro: reintento.registro } : {}) } } : {}) };
};
const normal = (x: any): Local => ({
  activo: typeof x?.activo === 'string' ? x.activo : null,
  repositorios: x?.repositorios && typeof x.repositorios === 'object' ? x.repositorios : {},
  ...(x?.revision && typeof x.revision.proyecto === 'string' && typeof x.revision.pedida === 'string' ? { revision: revisionNormal(x.revision) } : {}),
  ...(x?.aclaracion && typeof x.aclaracion.proyecto === 'string' && typeof x.aclaracion.nota === 'string' && typeof x.aclaracion.paso === 'number' ? { aclaracion: x.aclaracion as AclaracionPedida } : {}),
  ...(x?.urgencia && typeof x.urgencia.proyecto === 'string' && Array.isArray(x.urgencia.notas) && typeof x.urgencia.pedida === 'string' ? { urgencia: x.urgencia as UrgenciaPedida } : {}),
  ...(typeof x?.vigilia === 'string' ? { vigilia: x.vigilia } : {}),
  ...(x?.agente === false ? { agente: false as const } : {}),
  ...(x?.permisos?.ultracode === true ? { permisos: { ultracode: true as const } } : {}),
  ...(x?.esfuerzoMaximo === true ? { esfuerzoMaximo: true as const } : {}),
});

/** Cada cuánto mira la sesión del director (/loop 5m /vigila), y desde cuándo se considera que nadie está mirando. */
export const VIGILIA_MIN = 5;
export const vigilando = (vigilia: string | undefined | null, ahora = Date.now()) => !!vigilia && ahora - Date.parse(vigilia) < (VIGILIA_MIN * 2 + 2) * 60_000;

/** La sesión del director acaba de mirar si había una revisión pedida. */
export async function marcarVigilia(raiz: string): Promise<void> {
  await cambiarLocal(raiz, (l) => ({ ...l, vigilia: new Date().toISOString() }));
}

/** Cuántas veces se relee estudio.local.json si no se entiende, y cuánto se espera entre una y otra (ms). */
const RELEER = 3;
const RELEER_MS = 50;
const noEsta = (e: unknown) => (e as NodeJS.ErrnoException)?.code === 'ENOENT';
const esperar = (ms: number) => new Promise((listo) => setTimeout(listo, ms));

/**
 * Lo de este computador. Lo escriben dos procesos (el servidor del Studio y la bandeja): un JSON que no se entiende
 * (con el archivo tomado un instante en Windows, o cambiado a mano) se relee unas veces antes de darlo por vacío. Para
 * mostrar basta; para cambiarlo, cambiarLocal lo lee sin darlo nunca por vacío.
 */
export async function leerLocal(raiz: string): Promise<Local> {
  return (await leerArchivoLocal(raiz)) ?? vacio();
}

/** El archivo leído, vacío si no existe, o null si existe y, releído, sigue sin entenderse. */
async function leerArchivoLocal(raiz: string): Promise<Local | null> {
  for (let intento = 1; ; intento++) {
    try {
      return normal(JSON.parse(await readFile(join(raiz, ARCHIVO_LOCAL), 'utf-8')));
    } catch (e) {
      if (noEsta(e)) return vacio();
      if (intento >= RELEER) return null;
      await esperar(RELEER_MS);
    }
  }
}

// Lo mismo, sin esperar: para resolver rutas en cualquier parte. Se relee solo si el archivo cambió. Si no se entiende,
// se relee al instante y, si sigue sin entenderse, vale lo último que se leyó bien (nunca lo vacío por un instante)
let enMemoria: { raiz: string; cuando: number; local: Local } | null = null;
export function leerLocalYa(raiz: string): Local {
  const archivo = join(raiz, ARCHIVO_LOCAL);
  for (let intento = 1; ; intento++) {
    try {
      const cuando = statSync(archivo).mtimeMs;
      if (enMemoria?.raiz === raiz && enMemoria.cuando === cuando) return enMemoria.local;
      const local = normal(JSON.parse(readFileSync(archivo, 'utf-8')));
      enMemoria = { raiz, cuando, local };
      return local;
    } catch (e) {
      if (noEsta(e)) return vacio();
      if (intento >= RELEER) return enMemoria?.raiz === raiz ? enMemoria.local : vacio();
    }
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

/**
 * Desde cuándo lo que llega ya no entra en la revisión en marcha de este proyecto: cuando el Studio lanzó al director o,
 * sin lanzarlo, cuando la revisión empezó. Lo que se deja después espera la revisión siguiente. Sin revisión en marcha, null.
 */
export function corteDeRevision(l: Local, proyecto: string): string | null {
  const r = l.revision;
  if (!r || r.proyecto !== proyecto || r.hecha || r.error) return null;
  const marcas = [r.lanzada, r.enCurso].filter((x): x is string => !!x).sort();
  return marcas[0] ?? null;
}

/** El candado de estudio.local.json: un archivo junto a él que solo un proceso a la vez puede crear. */
export const CANDADO_LOCAL = `${ARCHIVO_LOCAL}.candado`;
/**
 * Pasado este tiempo, un candado se da por abandonado (el proceso que lo tenía murió a mitad de un cambio) y se quita.
 * Un cambio dura milisegundos. Si en el doble de este tiempo no se pudo tomar (la carpeta no deja crear archivos), falla.
 */
export const CANDADO_VIEJO_MS = 10_000;
// Dentro de un mismo proceso, los cambios esperan su turno en fila, sin dar vueltas sobre el candado
const filas = new Map<string, Promise<unknown>>();

/**
 * Cambia lo de este computador sin perder lo que escribe otro (nota de voz del titular, 21 de octubre de 2026: que no
 * vuelva a pasar). Lo escriben dos procesos, el servidor del Studio y la bandeja, y cada cambio lee el archivo entero,
 * cambia una parte y lo guarda entero: si dos cambios se cruzaban, el segundo guardaba encima lo que había leído antes del
 * primero y lo borraba (así una revisión cerrada pudo perder su «hecha» y verse fallida). Por eso cada cambio toma el
 * candado, lee lo más nuevo, aplica el cambio, lo guarda y solo entonces lo suelta: de dos que se cruzan, el segundo
 * espera y parte de lo que dejó el primero. Y si el archivo existe pero no se entiende, no se guarda nada encima, porque
 * partir de vacío borraría la lista de proyectos y lo pedido. `cambio` devuelve lo nuevo, o undefined si no hay nada que
 * cambiar. Devuelve cómo quedó.
 */
async function cambiarLocal(raiz: string, cambio: (l: Local) => Local | undefined): Promise<Local> {
  const turno = (filas.get(raiz) ?? Promise.resolve()).catch(() => {}).then(() => conCandado(raiz, async () => {
    const l = await leerArchivoLocal(raiz);
    if (!l) throw new Error(`${ARCHIVO_LOCAL} no se entiende: no se guarda nada encima, para no borrar la lista de proyectos ni lo pedido. Corrige el archivo (es JSON) o bórralo y vuelve a entregar los proyectos.`);
    const nuevo = cambio(l);
    if (nuevo) await guardarLocal(raiz, nuevo);
    return nuevo ?? l;
  }));
  filas.set(raiz, turno);
  try {
    return await turno;
  } finally {
    if (filas.get(raiz) === turno) filas.delete(raiz);
  }
}

/**
 * Hace algo con el candado de estudio.local.json tomado. Se toma creando el archivo solo si no existe (de dos que lo
 * intentan a la vez, solo uno lo crea); si lo tiene otro, se espera. Uno abandonado se quita (CANDADO_VIEJO_MS). Solo lo
 * suelta quien lo tiene: su contenido es una marca de este proceso y de este cambio.
 */
async function conCandado<T>(raiz: string, hacer: () => Promise<T>): Promise<T> {
  const candado = join(raiz, CANDADO_LOCAL);
  const marca = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const limite = Date.now() + 2 * CANDADO_VIEJO_MS;
  for (;;) {
    try {
      await writeFile(candado, marca, { flag: 'wx' });
      break;
    } catch (e) {
      const codigo = String((e as NodeJS.ErrnoException)?.code);
      // En Windows, un candado recién soltado puede seguir «borrándose» un instante (EPERM, EACCES, EBUSY)
      if (!['EEXIST', 'EPERM', 'EACCES', 'EBUSY'].includes(codigo) || Date.now() > limite) throw e;
      if (codigo === 'EEXIST') {
        const otro = await readFile(candado, 'utf-8').catch(() => null);
        const viejo = await stat(candado).then((s) => Date.now() - s.mtimeMs > CANDADO_VIEJO_MS, () => false);
        // Abandonado: se quita, y solo si sigue siendo el mismo (que no sea el de otro que lo acaba de tomar)
        if (viejo && otro !== null && (await readFile(candado, 'utf-8').catch(() => null)) === otro) {
          await unlink(candado).catch(() => {});
          continue;
        }
      }
      await esperar(5 + Math.random() * 15);
    }
  }
  try {
    return await hacer();
  } finally {
    if ((await readFile(candado, 'utf-8').catch(() => null)) === marca) await unlink(candado).catch(() => {});
  }
}

/**
 * Escribe un archivo de una vez: primero a uno aparte en la misma carpeta y luego lo pone en su lugar (rename), así quien
 * lo lee desde otro proceso nunca lo encuentra a medio escribir (escribirlo encima lo vacía primero). En Windows, si el
 * archivo está tomado un instante (EPERM, EBUSY, EACCES: alguien lo está leyendo, o el antivirus), se reintenta, hasta
 * unos dos segundos. Para lo que leen dos procesos: estudio.local.json, el plan y lo de cada persona.
 */
export async function escribirDeUnaVez(archivo: string, texto: string): Promise<void> {
  const temporal = `${archivo}.${process.pid}-${Math.random().toString(36).slice(2, 8)}.tmp`;
  await writeFile(temporal, texto, 'utf-8');
  try {
    for (let intento = 1; ; intento++) {
      try {
        await rename(temporal, archivo);
        break;
      } catch (e) {
        const tomado = ['EPERM', 'EBUSY', 'EACCES'].includes(String((e as NodeJS.ErrnoException)?.code));
        if (!tomado || intento >= 8) throw e;
        await esperar(RELEER_MS * intento);
      }
    }
  } finally {
    await unlink(temporal).catch(() => {}); // ya se movió, o no se pudo: que no quede suelto
  }
}

/** Escribe lo de este computador de una vez. Solo lo llama cambiarLocal, con el candado tomado. */
async function guardarLocal(raiz: string, l: Local): Promise<void> {
  const x = { nota: 'Lo de este computador, fuera de git: el proyecto activo y la carpeta del repositorio de cada proyecto (su memoria está en <repositorio>/.stl, rama stl).', ...l };
  await escribirDeUnaVez(join(raiz, ARCHIVO_LOCAL), JSON.stringify(x, null, 2) + '\n');
  enMemoria = null;
}

export async function guardarActivo(raiz: string, id: string): Promise<void> {
  await cambiarLocal(raiz, (l) => ({ ...l, activo: id }));
}

/** Da o quita un permiso del director lanzado (Local › permisos). Sin permisos, la clave sale del archivo. */
export async function guardarPermiso(raiz: string, permiso: 'ultracode', activo: boolean): Promise<void> {
  await cambiarLocal(raiz, ({ permisos, ...l }) => {
    const otros = { ...permisos };
    if (activo) otros[permiso] = true;
    else delete otros[permiso];
    return { ...l, ...(Object.keys(otros).length ? { permisos: otros } : {}) };
  });
}

/** «Máximo» para el director y la terminal que abre el Studio (Local › esfuerzoMaximo); sin él, la clave sale del archivo. */
export async function guardarEsfuerzoMaximo(raiz: string, activo: boolean): Promise<void> {
  await cambiarLocal(raiz, ({ esfuerzoMaximo, ...l }) => ({ ...l, ...(activo ? { esfuerzoMaximo: true as const } : {}) }));
}

export async function guardarRutaRepositorio(raiz: string, id: string, ruta: string): Promise<void> {
  await cambiarLocal(raiz, (l) => ({ ...l, repositorios: { ...l.repositorios, [id]: ruta } }));
}

/** Saca un proyecto de este Estudio (su memoria sigue en su repositorio, intacta). */
export async function olvidarProyecto(raiz: string, id: string): Promise<void> {
  await cambiarLocal(raiz, (l) => {
    const { [id]: _, ...resto } = l.repositorios;
    return { ...l, activo: l.activo === id ? null : l.activo, repositorios: resto };
  });
}

/**
 * Lo que retoma una revisión pedida de nuevo: si la anterior del mismo proyecto no se cerró (`error`), desde cuándo
 * trabajó esa (o la primera de una seguidilla de fallidas), qué pasó y su registro. Si no, null.
 */
export function reintentoDe(antes: RevisionPedida | undefined, proyecto: string): Reintento | null {
  if (!antes || antes.proyecto !== proyecto || !antes.error || antes.hecha) return null;
  const registro = antes.falla?.registro ?? antes.reintento?.registro;
  return {
    lanzada: antes.reintento?.lanzada ?? antes.fallida ?? antes.pedida,
    que: antes.falla?.que ?? antes.error,
    ...(registro ? { registro } : {}),
  };
}

/**
 * Pide (o cancela, con `quien` null) la revisión del director para un proyecto. Si la anterior no se cerró, la nueva
 * lleva su `reintento`: retoma lo que esa dejó, sin rehacerlo.
 */
export async function pedirRevision(raiz: string, proyecto: string, quien: string | null): Promise<RevisionPedida | null> {
  const l = await cambiarLocal(raiz, (l) => {
    const reintento = reintentoDe(l.revision, proyecto);
    const revision: RevisionPedida | undefined = quien ? { proyecto, quien, pedida: new Date().toISOString(), ...(reintento ? { reintento } : {}) } : undefined;
    return { ...l, revision };
  });
  return l.revision ?? null;
}

/**
 * El Studio lanzó al director para la revisión pedida, o la lanzada no terminó y `error` dice por qué: entonces vuelve a
 * quedar pedida (sin `enCurso`, para que el Studio no siga esperando), y la puede tomar la sesión del director. Con
 * `falla`, el reporte de qué pasó queda junto al error.
 */
export async function marcarLanzada(raiz: string, proyecto: string, error?: string, falla?: FallaRevision): Promise<void> {
  await cambiarLocal(raiz, (l) => {
    const r = l.revision?.proyecto === proyecto && !l.revision.hecha ? l.revision : null;
    if (!r) return undefined;
    // El reintento sigue con ella: si esta también falla, la siguiente retoma desde la primera
    const base = { proyecto: r.proyecto, quien: r.quien, pedida: r.pedida, ...(r.reintento ? { reintento: r.reintento } : {}) };
    const fallida = r.lanzada ?? r.fallida;
    const fallo = { ...base, error: error!, ...(falla ? { falla } : {}), ...(fallida ? { fallida } : {}) };
    return { ...l, revision: error ? fallo : { ...base, lanzada: new Date().toISOString() } };
  });
}

/** La revisión pedida empieza (`en_curso`) o termina (`hecha`). Sin una pedida, `hecha` igual deja la fecha. */
export async function marcarRevision(raiz: string, proyecto: string, paso: 'en_curso' | 'hecha'): Promise<void> {
  await cambiarLocal(raiz, (l) => {
    const r = l.revision?.proyecto === proyecto ? l.revision : null;
    if (paso === 'en_curso' && (!r || r.hecha || r.enCurso)) return undefined;
    const ahora = new Date().toISOString();
    return { ...l, revision: paso === 'en_curso' ? { ...r!, enCurso: ahora } : { ...(r ?? { proyecto, quien: '', pedida: ahora }), hecha: ahora } };
  });
}

/** Pide que el director aclare un paso, aparte de la revisión (reemplaza una aclaración anterior ya cerrada o fallida). */
export async function pedirAclaracion(raiz: string, a: Pick<AclaracionPedida, 'proyecto' | 'mision' | 'paso' | 'nota' | 'quien'>): Promise<AclaracionPedida> {
  const aclaracion: AclaracionPedida = { ...a, pedida: new Date().toISOString() };
  await cambiarLocal(raiz, (l) => ({ ...l, aclaracion }));
  return aclaracion;
}

/** La aclaración se lanzó, terminó (`hecha`) o falló (`error`): solo si es la de esa nota. */
export async function marcarAclaracion(raiz: string, nota: string, paso: 'lanzada' | 'hecha' | { error: string }): Promise<void> {
  await cambiarLocal(raiz, (l) => {
    const a = l.aclaracion;
    if (!a || a.nota !== nota || a.hecha || a.error) return undefined;
    const ahora = new Date().toISOString();
    return { ...l, aclaracion: paso === 'lanzada' ? { ...a, lanzada: ahora } : paso === 'hecha' ? { ...a, hecha: ahora } : { ...a, error: paso.error } };
  });
}

/** Una urgencia en curso: pedida o lanzada, sin cerrar ni fallar. */
export const urgenciaActiva = (u: UrgenciaPedida | undefined | null): u is UrgenciaPedida => !!u && !u.hecha && !u.error;

/**
 * Pide que el director atienda notas urgentes, aparte de la revisión. Si ya hay una pedida y aún no lanzada del mismo
 * proyecto, se suman a ella; si el director ya está atendiendo una, esperan en `luego` y van en el lanzamiento siguiente.
 */
export async function pedirUrgencia(raiz: string, u: { proyecto: string; notas: string[]; quien: string }): Promise<UrgenciaPedida | null> {
  const l = await cambiarLocal(raiz, (l) => {
    const a = urgenciaActiva(l.urgencia) ? l.urgencia : null;
    if (a && a.proyecto !== u.proyecto) return undefined;
    const ya = new Set([...(a?.notas ?? []), ...(a?.luego ?? [])]);
    const nuevas = u.notas.filter((n) => !ya.has(n));
    if (a && !nuevas.length) return undefined;
    const urgencia: UrgenciaPedida = !a ? { ...u, notas: nuevas, pedida: new Date().toISOString() }
      : a.lanzada ? { ...a, luego: [...(a.luego ?? []), ...nuevas] }
      : { ...a, notas: [...a.notas, ...nuevas] };
    return { ...l, urgencia };
  });
  // Si el director atiende una urgencia de otro proyecto, esta espera la revisión
  return urgenciaActiva(l.urgencia) && l.urgencia.proyecto === u.proyecto ? l.urgencia : null;
}

/**
 * La urgencia se lanzó, terminó (`hecha`) o falló (`error`). Al terminar, las que esperaban en `luego` quedan pedidas
 * para el lanzamiento siguiente.
 */
export async function marcarUrgencia(raiz: string, pedida: string, paso: 'lanzada' | 'hecha' | { error: string }): Promise<void> {
  await cambiarLocal(raiz, (l) => {
    const u = l.urgencia;
    if (!u || u.pedida !== pedida || u.hecha || u.error) return undefined;
    const ahora = new Date().toISOString();
    // La siguiente se reconoce por su fecha: nunca la misma que la que termina
    const siguiente = ahora > u.pedida ? ahora : new Date(Date.parse(u.pedida) + 1).toISOString();
    const urgencia: UrgenciaPedida = paso === 'lanzada' ? { ...u, lanzada: ahora }
      : paso === 'hecha' && u.luego?.length ? { proyecto: u.proyecto, notas: u.luego, quien: u.quien, pedida: siguiente }
      : paso === 'hecha' ? { ...u, hecha: ahora }
      : { ...u, error: paso.error };
    return { ...l, urgencia };
  });
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
