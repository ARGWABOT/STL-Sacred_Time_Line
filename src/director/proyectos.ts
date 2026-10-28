// Los proyectos del Estudio. Un Estudio dirige varios proyectos, y la memoria de cada uno vive en SU repositorio, no en
// el Estudio: en una rama aparte, `stl`, que el Estudio abre en la carpeta `.stl/` del proyecto (un worktree de git,
// excluido solo en ese computador). Así el código del proyecto no se mezcla con la dirección, su integración continua no
// corre por ella, y el Estudio queda limpio: solo su código y lo de este computador.
//
//   <repositorio>/.stl/proyecto.json              el contexto, el objetivo y el equipo (lo escribe el titular)
//   <repositorio>/.stl/director/plan.json         la ruta y lo que dice el director (lo escribe la sesión del director)
//   <repositorio>/.stl/director/archivo/          lo cerrado que salió del plan para que no pese, un AAAA-MM.json por mes
//                                                 (la bandeja, al cerrar); archivo.json, el de antes, de una sola pieza
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
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { appendFile, mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import type { Integrante, Proyecto, TipoProyecto, Tramo } from './director.ts';
import { esPlanDeClaude, type PlanDeClaude } from './costoDelPlan.ts';

/** El prefijo de las rutas virtuales de los proyectos dentro del Estudio. */
export const CARPETA = 'proyectos';
/** La carpeta de la memoria dentro del repositorio de cada proyecto, y su rama. */
export const MEMORIA = '.stl';
export const RAMA = 'stl';
export const ARCHIVO_LOCAL = 'estudio.local.json';
const ID_VALIDO = /^[a-z0-9][a-z0-9-]{0,39}$/;

/** Las rutas virtuales (con «/») de lo de un proyecto. */
export function rutasDe(id: string) {
  const base = `${CARPETA}/${id}`;
  return {
    base,
    proyecto: `${base}/proyecto.json`,
    plan: `${base}/director/plan.json`,
    /** Lo que salió del plan para que no pese, de una sola pieza: el de antes de partirlo por mes, que ya no cambia (director › `unirArchivo`). */
    archivo: `${base}/director/archivo.json`,
    /** Lo que sale del plan desde que el archivo se parte por mes: un AAAA-MM.json por mes (director › `partirArchivoPorMes`). */
    archivoMeses: `${base}/director/archivo`,
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

/**
 * Si dos correos son el mismo para el Estudio, que reconoce a cada persona comparando el correo de git de su carpeta con el
 * de su equipo (estudio/servidor/sincronizar.ts › leerIdentidad): sin distinguir mayúsculas ni espacios de más. Un correo
 * vacío (o que no es texto) no es el de nadie.
 */
export function mismoCorreo(a: unknown, b: unknown): boolean {
  const limpio = (c: unknown) => (typeof c === 'string' ? c.trim().toLowerCase() : '');
  return limpio(a) !== '' && limpio(a) === limpio(b);
}

/** Un correo con la forma algo@algo.algo, sin espacios (ni los signos que romperían una orden copiada a la terminal). */
export function correoValido(texto: string): boolean {
  return typeof texto === 'string' && /^[^@\s<>"`$\\]+@[^@\s<>"`$\\.]+(\.[^@\s<>"`$\\.]+)+$/.test(texto);
}

/**
 * El equipo de un proyecto con el correo de git de una persona cambiado: cada integrante cuyo correo es `viejo` (sin
 * distinguir mayúsculas ni espacios) queda con `nuevo`, y lo demás igual. Devuelve el equipo nuevo y a cuántos cambió, sin
 * tocar el que recibe. Con un `viejo` o un `nuevo` vacíos, o iguales, no cambia a nadie. Lo usa tools/cambiar-correo.ts: el
 * correo tiene que cambiar en el equipo y en git a la vez, o el Estudio deja de reconocer a la persona.
 */
export function cambiarCorreoDelEquipo(equipo: Integrante[], viejo: string, nuevo: string): { equipo: Integrante[]; cambiados: number } {
  const sinCambio = !nuevo.trim() || mismoCorreo(viejo, nuevo);
  let cambiados = 0;
  const cambiado = equipo.map((i) => {
    if (sinCambio || !mismoCorreo(i.correo, viejo)) return i;
    cambiados++;
    return { ...i, correo: nuevo.trim() };
  });
  return { equipo: cambiado, cambiados };
}

// ───────────────────────────────────────────── lo de este computador

/**
 * Cómo pide permisos el director lanzado: solo lo autorizado (el de siempre), preguntándote en el Studio, o «Automático,
 * vigilado», donde Claude Code decide solo lo que le falta y el Studio lo deja a la vista (pedido pd_permiso_automatico).
 */
export type ModoPermisos = 'autorizado' | 'pregunta' | 'automatico';
export const esModoPermisos = (x: unknown): x is ModoPermisos => x === 'autorizado' || x === 'pregunta' || x === 'automatico';

export interface Local {
  /** El proyecto activo en este computador. */
  activo: string | null;
  /** La carpeta del repositorio de cada proyecto en este computador: también, la lista de proyectos. */
  repositorios: Record<string, string>;
  /** La revisión pedida desde el Studio (botón «Pedir revisión»): la lanza el Studio o la toma la sesión del director. */
  revision?: RevisionPedida;
  /**
   * Lo que dejó una revisión que no se cerró y alguien canceló: la próxima que se pida de ese proyecto lo retoma igual
   * (pedirRevision; propuesta aceptada pr_retoma_automatica, punto 3). Una revisión que cierra lo borra.
   */
  retoma?: Reintento & { proyecto: string };
  /**
   * La huella del plan de cada proyecto al cerrar su última revisión, urgencia o aclaración (propuesta aceptada
   * pr_cierre_vigilado, punto 4): si el plan cambia después sin un director trabajando, el Studio lo avisa.
   */
  huellas?: Record<string, { sha: string; cuando: string }>;
  /** «No lo entiendo, explícamelo mejor» de un paso: la lanza el Studio aparte, sin el resto de la revisión. */
  aclaracion?: AclaracionPedida;
  /** Una nota urgente: la lanza el Studio sola y al instante, sin el resto de la revisión. */
  urgencia?: UrgenciaPedida;
  /** «Pedir revisiones seguidas»: la cadena que pidió una persona con ese botón, mientras no pare (`Seguidas`). */
  seguidas?: Seguidas;
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
  /** «Todo con el modelo que elegí»: los ayudantes, con el modelo del director (guardarTodoConElModelo). */
  todoConElModelo?: true;
  /**
   * `false`: el director que lanza el Studio arranca sin tus ajustes de usuario de Claude Code (~/.claude/settings.json) y,
   * con ellos, sin tus skills ni tus comandos; se elige en «Modelo y consumo», viendo los nombres de sus claves (nota de
   * voz del titular nmvojtb7rtit, 25 de octubre de 2026; pd_arranque_limpio). Sin la clave, los carga, como siempre.
   */
  ajustesPropios?: false;
  /**
   * Las claves de tus ajustes que el director conserva aunque no cargue el archivo (con `ajustesPropios` falso): las de
   * primer nivel y, de env y de permissions, cada una suya («env.X», «permissions.deny»). Se eligen una por una, con su
   * explicación, en «Modelo y consumo» (notas de voz del titular nmvolgrmctit y nmvoljwl9tit, 25 de octubre de 2026);
   * el lanzador las suma a los ajustes del Studio (estudio/servidor/ajustesPropios.ts › conservarDe).
   */
  ajustesConservados?: string[];
  /**
   * Todas las claves de tus ajustes que había al guardar esa selección (nota de voz del titular nmvoottaitit, 25 de octubre
   * de 2026: lo que el Studio detecta queda escrito, y si cambia, se vuelve a confirmar). Una clave que aparece después es
   * nueva: el director usa lo recomendado para ella y «Modelo y consumo» te pide confirmarla (ajustesPropios.ts › conNuevas).
   */
  ajustesVistos?: string[];
  /**
   * Cómo pide permisos el director lanzado (propuesta aceptada pr_permisos_al_momento; pedido pd_permiso_espera; se elige en
   * «Modelo y consumo» › «Cómo pide permisos el director»): `autorizado` (sin la clave, como siempre) es solo lo autorizado,
   * y lo que falta se le niega y queda en el panel de permisos; `pregunta` es «Me pregunta en el Studio»: lo que le falta se
   * te pregunta en un diálogo durante la revisión (estudio/servidor/modoPermisos.ts).
   */
  modoPermisos?: ModoPermisos;
  /**
   * Tu plan de Claude en este computador (Pro, Max 5x, Max 20x o una clave de API), para decir lo que gasta cada revisión
   * en lo que cuesta de tu plan y no a precio de API (pedido pd_costo_plan; costoDelPlan.ts). Sin él, a precio de API.
   */
  planDeClaude?: PlanDeClaude;
  /**
   * Los permisos que el titular le dio al director lanzado, más allá de los de siempre (revisor.ts › permitido). Los pide el
   * Studio cuando hacen falta y el titular los da con «Autorizo»: `ultracode`, que el director siga a ultracode cuando está
   * encendido, con los flujos de varios agentes (Workflow) que eso necesita. `autorizados`: lo que se le negó en una
   * revisión y el titular le dio con una casilla en «Modelo y consumo» › permisos (nota de voz del titular nmvotdn3ftit,
   * 26 de octubre de 2026; estudio/servidor/permisosNegados.ts).
   */
  permisos?: { ultracode?: true; autorizados?: PermisoAutorizado[] };
}

/**
 * Un permiso que se le negó al director y el titular le dio con su casilla: la regla de Claude Code (la general del tipo
 * de acción negado, permisosNegados.ts › reglaDe) y su alcance, «Solo este proyecto» (`proyecto`) o «Todos los proyectos de este computador».
 */
export interface PermisoAutorizado {
  regla: string;
  alcance: 'proyecto' | 'todos';
  proyecto?: string;
  cuando: string;
  quien: string;
  /**
   * `claude`: no lo marcó nadie con su casilla, lo aprobó solo Claude Code en el modo «Automático, vigilado», y el Studio lo
   * dejó aquí al terminar la revisión, para que se vea y se quite cuando quieras (tu elección del 26 de octubre de 2026).
   */
  origen?: 'claude';
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
  /** Desde dónde la pidió la persona: el botón que la nombra (`ORIGENES_REVISION`). */
  origen?: OrigenRevision;
  /** Sus minutos, si no son los de siempre: los que estimó el director al cerrar la anterior (`Plan.tramo`, limiteDelTramo). */
  limite?: number;
}

/**
 * «Pedir revisiones seguidas» (pedido pd_revisiones_seguidas: el titular lo eligió en t_encadenar_revisiones, 27 de octubre
 * de 2026). Con un clic, la persona pide una revisión y que, al cerrar cada una, el Studio lance la siguiente mientras el
 * director diga que su cola sigue (`Plan.tramo.seguir`). Para cuando algo de verdad necesita a la persona, cuando una falla,
 * cuando su límite de cinco horas o el semanal pasa de USO_MAXIMO_SEGUIDAS, o cuando oprime «Detener» (`paro`).
 */
export interface Seguidas {
  proyecto: string;
  /** Quien las pidió: cada revisión de la cadena va a su nombre, con su botón. */
  quien: string;
  desde: string;
  /** Cuántas lanzó la cadena después de la primera. */
  hechas: number;
  /** Por qué paró, y cuándo. Sin esto, sigue. */
  paro?: { cuando: string; porque: string };
}

/** El uso de tu límite de cinco horas o del semanal (en %) desde el que las revisiones seguidas paran. */
export const USO_MAXIMO_SEGUIDAS = 80;

/** Si hay revisiones seguidas en marcha (de ese proyecto, si se dice). */
export const seguidasActivas = (s: Seguidas | undefined | null, proyecto?: string): s is Seguidas => !!s && !s.paro && (!proyecto || s.proyecto === proyecto);

/**
 * Al cerrar o fallar una revisión de la cadena, si el Studio lanza la siguiente (`sigue`) o para, y por qué; null si no
 * hay cadena de ese proyecto o la revisión sigue en marcha. `limites`: el uso (%) de las ventanas del plan que dejó el
 * registro de la revisión que terminó; sin él, para (no se lanza a ciegas lo que gasta tu plan). Pura.
 */
export function siguienteDeLaCadena(
  s: Seguidas | undefined | null,
  r: RevisionPedida | undefined | null,
  tramo: Tramo | undefined | null,
  limites: { cincoHoras: number | null; semana: number | null } | null,
): { sigue: true } | { sigue: false; porque: string } | null {
  if (!seguidasActivas(s) || !r || r.proyecto !== s.proyecto) return null;
  if (r.error) return { sigue: false, porque: `la revisión no terminó (${r.error.replace(/\s+Lo que alcanzó a hacer.*$/, '')})` };
  if (!r.hecha) return null;
  const desde = Date.parse(r.lanzada ?? r.pedida);
  if (!tramo || !(Date.parse(tramo.cuando) >= desde)) return { sigue: false, porque: 'el director no dijo al cerrar si su cola sigue' };
  if (!tramo.seguir) return { sigue: false, porque: tramo.razon };
  const cinco = limites?.cincoHoras ?? null;
  if (cinco === null) return { sigue: false, porque: 'no se supo cuánto llevas de tu límite de cinco horas' };
  if (cinco >= USO_MAXIMO_SEGUIDAS) return { sigue: false, porque: `tu límite de cinco horas va en ${cinco} %` };
  const semana = limites?.semana ?? null;
  if (semana !== null && semana >= USO_MAXIMO_SEGUIDAS) return { sigue: false, porque: `tu límite semanal va en ${semana} %` };
  return { sigue: true };
}

/** Empieza las revisiones seguidas de un proyecto, a nombre de quien las pidió (las de antes, de cualquier proyecto, se reemplazan). */
export async function empezarSeguidas(raiz: string, proyecto: string, quien: string): Promise<void> {
  await cambiarLocal(raiz, (l) => ({ ...l, seguidas: { proyecto, quien, desde: new Date().toISOString(), hechas: 0 } }));
}

/** Las revisiones seguidas paran, con su porqué (solo si están en marcha y son de ese proyecto). */
export async function pararSeguidas(raiz: string, proyecto: string, porque: string): Promise<void> {
  await cambiarLocal(raiz, (l) => (seguidasActivas(l.seguidas, proyecto) ? { ...l, seguidas: { ...l.seguidas, paro: { cuando: new Date().toISOString(), porque } } } : undefined));
}

/**
 * La siguiente de las revisiones seguidas: la pidió la persona con «Pedir revisiones seguidas» (`seguidas`), así que va a
 * su nombre y con ese botón. Solo si siguen en marcha y la anterior de ese proyecto cerró; si no, null y nada cambia.
 */
export async function encadenarRevision(raiz: string, proyecto: string, limite: number): Promise<RevisionPedida | null> {
  const l = await cambiarLocal(raiz, (l) => {
    const s = l.seguidas;
    const r = l.revision;
    if (!seguidasActivas(s, proyecto) || r?.proyecto !== proyecto || !r.hecha || r.error) return undefined;
    const revision: RevisionPedida = { proyecto, quien: s.quien, pedida: new Date().toISOString(), origen: 'seguidas', limite };
    return { ...l, revision, seguidas: { ...s, hechas: s.hechas + 1 } };
  });
  const r = l.revision;
  return r?.proyecto === proyecto && r.origen === 'seguidas' && !r.hecha && !r.lanzada ? r : null;
}

/**
 * Una revisión la pide solo una persona, con un botón que dice que la pide (regla dura del titular, 23 de octubre de
 * 2026: «nunca se disparan revisiones automáticamente; solamente el usuario puede dispararlas»). Estos son esos botones;
 * el servidor no acepta otro origen, y nada del Studio la pide solo: ni entregar una misión o un proyecto, ni una
 * urgencia o una aclaración que no se pudieron lanzar (la prueba «nadie pide una revisión solo» lo vigila en el código).
 */
export const ORIGENES_REVISION = {
  cabecera: '«Pedir revisión», en la cabecera',
  falla: '«Retomarla», en «Qué pasó con la revisión»',
  falla_nota: '«Con una nota al director», en «Qué pasó con la revisión»',
  falla_sin_ultracode: '«Sin ultracode», en «Qué pasó con la revisión»',
  meta: '«Guardar y pedir la revisión», al replantear la meta',
  urgente: '«Sí, dejarlo y pedir la revisión», al marcar una nota urgente',
  recomendada: '«Pedir la revisión», en la recomendación del director',
  // Autoriza lo marcado y pide la revisión con el mismo clic, porque lo dice (decisión del titular del 23 de octubre de
  // 2026; pedido pd_panel_permisos)
  permisos: '«Autorizo y pido la revisión», en el panel de permisos',
  // Una revisión y, al cerrar cada una, la siguiente, mientras la cola del director siga (pedido pd_revisiones_seguidas: el
  // titular lo eligió el 27 de octubre de 2026, en t_encadenar_revisiones): la persona las pide con este botón, y para
  // cuando quiere (`Seguidas`)
  seguidas: '«Pedir revisiones seguidas», en la cabecera',
} as const;
export type OrigenRevision = keyof typeof ORIGENES_REVISION;
export const esOrigenRevision = (x: unknown): x is OrigenRevision => typeof x === 'string' && Object.hasOwn(ORIGENES_REVISION, x);

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
  /** Si no se pudo: el reporte de qué pasó, como el de una revisión (pr_retoma_automatica, punto 5). */
  falla?: FallaRevision;
  /** Pedida otra vez con «Retomarla» después de una que no se cerró: cuándo se lanzó esa y su registro. */
  reintento?: RetomaAparte;
}

/** De dónde retoma una aclaración o una urgencia pedida otra vez con «Retomarla» (pr_retoma_automatica, punto 5). */
export interface RetomaAparte {
  lanzada: string;
  registro?: string;
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
  falla?: FallaRevision;
  reintento?: RetomaAparte;
}

const vacio = (): Local => ({ activo: null, repositorios: {} });
/** Los permisos tal cual, sin un autorizado mal formado. Sin nada, undefined. */
const permisosNormales = (p: any): Local['permisos'] => {
  const autorizados: PermisoAutorizado[] = (Array.isArray(p?.autorizados) ? p.autorizados : [])
    .filter((a: any) => a && typeof a.regla === 'string' && a.regla && typeof a.cuando === 'string' && typeof a.quien === 'string' && (a.alcance === 'todos' || (a.alcance === 'proyecto' && typeof a.proyecto === 'string')))
    .map((a: any) => ({ regla: a.regla, alcance: a.alcance, ...(a.alcance === 'proyecto' ? { proyecto: a.proyecto } : {}), cuando: a.cuando, quien: a.quien, ...(a.origen === 'claude' ? { origen: 'claude' as const } : {}) }));
  const r = { ...(p?.ultracode === true ? { ultracode: true as const } : {}), ...(autorizados.length ? { autorizados } : {}) };
  return Object.keys(r).length ? r : undefined;
};
/** La revisión tal cual, salvo un `reintento` mal formado, que sale. */
const revisionNormal = (r: any): RevisionPedida => {
  const { reintento, ...resto } = r;
  const bien = reintento && typeof reintento.lanzada === 'string' && typeof reintento.que === 'string';
  return { ...resto, ...(bien ? { reintento: { lanzada: reintento.lanzada, que: reintento.que, ...(typeof reintento.registro === 'string' ? { registro: reintento.registro } : {}) } } : {}) };
};
/** Las revisiones seguidas tal cual, o undefined si están mal formadas (sin su `paro` si el suyo lo está). */
const seguidasNormales = (s: any): Seguidas | undefined => {
  if (!s || typeof s.proyecto !== 'string' || typeof s.quien !== 'string' || typeof s.desde !== 'string' || typeof s.hechas !== 'number') return undefined;
  const paro = s.paro && typeof s.paro.cuando === 'string' && typeof s.paro.porque === 'string' ? { paro: { cuando: s.paro.cuando, porque: s.paro.porque } } : {};
  return { proyecto: s.proyecto, quien: s.quien, desde: s.desde, hechas: s.hechas, ...paro };
};
// Cada clave de Local que no pasa por aquí se pierde en el siguiente cambio (cambiarLocal guarda lo que leyó): la cadena
// de «Pedir revisiones seguidas» se perdía así apenas el Studio marcaba lanzada su primera revisión
const normal = (x: any): Local => ({
  activo: typeof x?.activo === 'string' ? x.activo : null,
  repositorios: x?.repositorios && typeof x.repositorios === 'object' ? x.repositorios : {},
  ...(x?.revision && typeof x.revision.proyecto === 'string' && typeof x.revision.pedida === 'string' ? { revision: revisionNormal(x.revision) } : {}),
  ...(x?.aclaracion && typeof x.aclaracion.proyecto === 'string' && typeof x.aclaracion.nota === 'string' && typeof x.aclaracion.paso === 'number' ? { aclaracion: x.aclaracion as AclaracionPedida } : {}),
  ...(x?.urgencia && typeof x.urgencia.proyecto === 'string' && Array.isArray(x.urgencia.notas) && typeof x.urgencia.pedida === 'string' ? { urgencia: x.urgencia as UrgenciaPedida } : {}),
  ...((s) => (s ? { seguidas: s } : {}))(seguidasNormales(x?.seguidas)),
  ...(typeof x?.vigilia === 'string' ? { vigilia: x.vigilia } : {}),
  ...(x?.agente === false ? { agente: false as const } : {}),
  ...((p) => (p ? { permisos: p } : {}))(permisosNormales(x?.permisos)),
  ...(x?.esfuerzoMaximo === true ? { esfuerzoMaximo: true as const } : {}),
  ...(x?.todoConElModelo === true ? { todoConElModelo: true as const } : {}),
  ...(x?.ajustesPropios === false ? { ajustesPropios: false as const } : {}),
  ...(x?.ajustesPropios === false && Array.isArray(x?.ajustesConservados) ? { ajustesConservados: x.ajustesConservados.filter((c: unknown): c is string => typeof c === 'string') } : {}),
  ...(x?.ajustesPropios === false && Array.isArray(x?.ajustesVistos) ? { ajustesVistos: x.ajustesVistos.filter((c: unknown): c is string => typeof c === 'string') } : {}),
  ...(esModoPermisos(x?.modoPermisos) ? { modoPermisos: x.modoPermisos } : {}),
  ...(esPlanDeClaude(x?.planDeClaude) ? { planDeClaude: x.planDeClaude } : {}),
  ...((h) => (Object.keys(h).length ? { huellas: h } : {}))(Object.fromEntries(Object.entries(x?.huellas && typeof x.huellas === 'object' ? x.huellas : {}).filter(([, v]: [string, any]) => typeof v?.sha === 'string' && typeof v?.cuando === 'string').map(([k, v]: [string, any]) => [k, { sha: v.sha, cuando: v.cuando }]))),
  ...(x?.retoma && typeof x.retoma.proyecto === 'string' && typeof x.retoma.lanzada === 'string' && typeof x.retoma.que === 'string'
    ? { retoma: { proyecto: x.retoma.proyecto, lanzada: x.retoma.lanzada, que: x.retoma.que, ...(typeof x.retoma.registro === 'string' ? { registro: x.retoma.registro } : {}) } }
    : {}),
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

/**
 * Cambia los permisos que el titular le dio al director desde lo que se le negó (Local › permisos.autorizados), con el
 * candado de estudio.local.json. Sin ninguno, la clave sale.
 */
export async function cambiarAutorizados(raiz: string, cambiar: (antes: PermisoAutorizado[]) => PermisoAutorizado[]): Promise<PermisoAutorizado[]> {
  let quedan: PermisoAutorizado[] = [];
  await cambiarLocal(raiz, ({ permisos, ...l }) => {
    const { autorizados, ...otros } = permisos ?? {};
    quedan = cambiar(autorizados ?? []);
    const nuevos = { ...otros, ...(quedan.length ? { autorizados: quedan } : {}) };
    return { ...l, ...(Object.keys(nuevos).length ? { permisos: nuevos } : {}) };
  });
  return quedan;
}

/** «Máximo» para el director y la terminal que abre el Studio (Local › esfuerzoMaximo); sin él, la clave sale del archivo. */
export async function guardarEsfuerzoMaximo(raiz: string, activo: boolean): Promise<void> {
  await cambiarLocal(raiz, ({ esfuerzoMaximo, ...l }) => ({ ...l, ...(activo ? { esfuerzoMaximo: true as const } : {}) }));
}

/**
 * Cómo pide permisos el director lanzado (Local › modoPermisos), desde la próxima vez que se lanza. `autorizado` es el de
 * siempre: sin la clave, el archivo queda como estaba. Con el candado de cambiarLocal, como lo demás de este archivo.
 */
export async function guardarModoPermisos(raiz: string, modo: ModoPermisos): Promise<void> {
  await cambiarLocal(raiz, ({ modoPermisos, ...l }) => ({ ...l, ...(modo !== 'autorizado' ? { modoPermisos: modo } : {}) }));
}

/**
 * «Todo con el modelo que elegí» (propuesta aceptada «Cada modelo para lo suyo», pr_modelos_por_tarea, punto 4; tu
 * elección del 26 de octubre de 2026): los ayudantes y los agentes de los flujos del director trabajan con su mismo modelo,
 * en vez del más barato, para quien prefiera no delegar aunque gaste más. Apagada de entrada; con false, sale.
 */
export async function guardarTodoConElModelo(raiz: string, si: boolean): Promise<void> {
  await cambiarLocal(raiz, ({ todoConElModelo, ...l }) => ({ ...l, ...(si ? { todoConElModelo: true as const } : {}) }));
}

/** Tu plan de Claude en este computador (Local › planDeClaude); con null, sale, y lo gastado vuelve a decirse a precio de API. */
export async function guardarPlanDeClaude(raiz: string, plan: PlanDeClaude | null): Promise<void> {
  await cambiarLocal(raiz, ({ planDeClaude, ...l }) => ({ ...l, ...(plan ? { planDeClaude: plan } : {}) }));
}

/**
 * Si el director lanzado carga tus ajustes de usuario de Claude Code (Local › ajustesPropios) y, sin ellos, qué claves
 * conserva (Local › ajustesConservados) y cuáles había al elegir (Local › ajustesVistos, si se saben); cargarlos todos
 * quita las tres.
 */
export async function guardarAjustesPropios(raiz: string, cargar: boolean, conservar: readonly string[] = [], vistas?: readonly string[]): Promise<void> {
  const elegidas = [...new Set(conservar.filter((c) => typeof c === 'string' && c))];
  const todas = vistas ? [...new Set(vistas.filter((c) => typeof c === 'string' && c))] : null;
  await cambiarLocal(raiz, ({ ajustesPropios, ajustesConservados, ajustesVistos, ...l }) => ({ ...l, ...(cargar ? {} : { ajustesPropios: false as const, ...(elegidas.length ? { ajustesConservados: elegidas } : {}), ...(todas ? { ajustesVistos: todas } : {}) }) }));
}

/**
 * Anota las claves que hay ahora como ya vistas, sin cambiar la selección: para una guardada antes de que el Studio las
 * anotara (desde ahí, una clave que aparezca es nueva). Solo si el director no carga tus ajustes y aún no hay ninguna.
 */
export async function anotarAjustesVistos(raiz: string, vistas: readonly string[]): Promise<void> {
  await cambiarLocal(raiz, (l) => (l.ajustesPropios === false && !l.ajustesVistos ? { ...l, ajustesVistos: [...new Set(vistas)] } : l));
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
 * lleva su `reintento`: retoma lo que esa dejó, sin rehacerlo. Y la pista sobrevive a «Cancelar» (propuesta aceptada
 * pr_retoma_automatica, punto 3): cancelar una que no se cerró la guarda aparte (`retoma`), y la próxima que se pida de
 * ese proyecto la lleva igual; una revisión que cierra la borra, porque ya no hay nada que retomar.
 */
export async function pedirRevision(raiz: string, proyecto: string, quien: string | null, origen?: OrigenRevision): Promise<RevisionPedida | null> {
  // Sin el botón que la nombra, no hay revisión: cancelarla (quien null) sí se puede siempre
  if (quien && !esOrigenRevision(origen)) throw new Error('Una revisión la pide solo una persona, con un botón que dice que la pide.');
  const l = await cambiarLocal(raiz, ({ retoma, ...l }) => {
    const guardada = retoma?.proyecto === proyecto && typeof retoma.lanzada === 'string' && typeof retoma.que === 'string' ? { lanzada: retoma.lanzada, que: retoma.que, ...(typeof retoma.registro === 'string' ? { registro: retoma.registro } : {}) } : null;
    // Lo que retoma: la que no se cerró, la que se había pedido para retomarla (y se cancela antes de empezar) o la guardada
    const deLaPedida = l.revision?.proyecto === proyecto && !l.revision.hecha ? (l.revision.reintento ?? null) : null;
    const reintento = reintentoDe(l.revision, proyecto) ?? deLaPedida ?? guardada;
    if (!quien) return { ...l, revision: undefined, ...(reintento ? { retoma: { proyecto, ...reintento } } : retoma && retoma.proyecto !== proyecto ? { retoma } : {}) };
    const revision: RevisionPedida = { proyecto, quien, pedida: new Date().toISOString(), ...(reintento ? { reintento } : {}), origen };
    return { ...l, revision, ...(retoma && retoma.proyecto !== proyecto ? { retoma } : {}) };
  });
  return l.revision ?? null;
}

/**
 * El Studio lanzó al director para la revisión pedida, o la lanzada no terminó y `error` dice por qué: entonces vuelve a
 * quedar pedida (sin `enCurso`, para que el Studio no siga esperando), y la puede tomar la sesión del director. Con
 * `falla`, el reporte de qué pasó queda junto al error.
 */
export async function marcarLanzada(raiz: string, proyecto: string, error?: string, falla?: FallaRevision, limite?: number): Promise<void> {
  await cambiarLocal(raiz, (l) => {
    const r = l.revision?.proyecto === proyecto && !l.revision.hecha ? l.revision : null;
    if (!r) return undefined;
    // El reintento sigue con ella: si esta también falla, la siguiente retoma desde la primera. Sus minutos, si no son
    // los de siempre (limite), también: así quien la vigila sabe cuándo se pasó
    const minutos = limite ?? r.limite;
    const base = { proyecto: r.proyecto, quien: r.quien, pedida: r.pedida, ...(r.reintento ? { reintento: r.reintento } : {}), ...(r.origen ? { origen: r.origen } : {}), ...(minutos ? { limite: minutos } : {}) };
    const fallida = r.lanzada ?? r.fallida;
    const fallo = { ...base, error: error!, ...(falla ? { falla } : {}), ...(fallida ? { fallida } : {}) };
    return { ...l, revision: error ? fallo : { ...base, lanzada: new Date().toISOString() } };
  });
}

/**
 * La revisión lanzada recibe minutos de más, una sola vez, porque llegó a su límite avanzando (propuesta aceptada «Cada
 * proceso, a la vista», pr_procesos_vista, punto 4): su límite nuevo, para la cabecera («lleva 62 min de 70») y para
 * quien la vigile sin haberla lanzado. Sin una revisión en marcha de ese proyecto, nada.
 */
export async function prorrogarRevision(raiz: string, proyecto: string, limite: number): Promise<void> {
  await cambiarLocal(raiz, (l) => {
    const r = l.revision?.proyecto === proyecto && !l.revision.hecha && !l.revision.error && (l.revision.lanzada || l.revision.enCurso) ? l.revision : null;
    return r ? { ...l, revision: { ...r, limite } } : undefined;
  });
}

/** La huella de un plan: lo primero de su sha256, sin los saltos de línea de Windows (git los puede cambiar). Pura. */
export const huellaDelPlan = (texto: string): string => createHash('sha256').update(texto.replace(/\r\n/g, '\n')).digest('hex').slice(0, 16);

/**
 * El cierre guarda la huella del plan de ese proyecto tal como quedó en el disco (pr_cierre_vigilado, punto 4): lo último
 * que lo toca es el cierre, y lo que cambie después, sin un director trabajando, el Studio lo avisa. Sin plan, nada.
 */
export async function guardarHuella(raiz: string, proyecto: string): Promise<void> {
  let texto: string;
  try {
    texto = await readFile(enDisco(raiz, rutasDe(proyecto).plan), 'utf-8');
  } catch {
    return;
  }
  const sha = huellaDelPlan(texto);
  await cambiarLocal(raiz, (l) => ({ ...l, huellas: { ...(l.huellas ?? {}), [proyecto]: { sha, cuando: new Date().toISOString() } } }));
}

/**
 * Si el plan de un proyecto cambió después de su último cierre: su huella guardada no es la del plan de ahora. `trabaja`:
 * un director trabaja en ese proyecto (entonces es suyo cambiarlo). null si no cambió o no hay huella. Pura.
 */
export function planCambiadoTrasCierre(huella: { sha: string; cuando: string } | undefined, texto: string | null, trabaja: boolean): string | null {
  if (!huella || texto === null || trabaja || huellaDelPlan(texto) === huella.sha) return null;
  const cuando = new Date(huella.cuando).toLocaleString('es', { weekday: 'long', hour: 'numeric', minute: '2-digit' });
  return `El plan cambió después del último cierre del director (el ${cuando}), sin un director trabajando: lo que ves puede no ser lo que él dejó. Si no lo cambió una revisión de otro computador, la revisión siguiente lo comprueba en la memoria y lo dice.`;
}

/** La revisión pedida empieza (`en_curso`) o termina (`hecha`). Sin una pedida, `hecha` igual deja la fecha. */
export async function marcarRevision(raiz: string, proyecto: string, paso: 'en_curso' | 'hecha'): Promise<void> {
  await cambiarLocal(raiz, ({ retoma, ...l }) => {
    const r = l.revision?.proyecto === proyecto ? l.revision : null;
    if (paso === 'en_curso' && (!r || r.hecha || r.enCurso)) return undefined;
    const ahora = new Date().toISOString();
    // Cerrada, no queda nada que retomar de ese proyecto (pedirRevision › retoma)
    const sigue = retoma && !(paso === 'hecha' && retoma.proyecto === proyecto) ? { retoma } : {};
    return { ...l, ...sigue, revision: paso === 'en_curso' ? { ...r!, enCurso: ahora } : { ...(r ?? { proyecto, quien: '', pedida: ahora }), hecha: ahora } };
  });
}

/** Pide que el director aclare un paso, aparte de la revisión (reemplaza una aclaración anterior ya cerrada o fallida). */
export async function pedirAclaracion(raiz: string, a: Pick<AclaracionPedida, 'proyecto' | 'mision' | 'paso' | 'nota' | 'quien'>): Promise<AclaracionPedida> {
  const aclaracion: AclaracionPedida = { ...a, pedida: new Date().toISOString() };
  await cambiarLocal(raiz, (l) => ({ ...l, aclaracion }));
  return aclaracion;
}

/** La aclaración se lanzó, terminó (`hecha`) o falló (`error`): solo si es la de esa nota. */
export async function marcarAclaracion(raiz: string, nota: string, paso: 'lanzada' | 'hecha' | { error: string; falla?: FallaRevision }): Promise<void> {
  await cambiarLocal(raiz, (l) => {
    const a = l.aclaracion;
    if (!a || a.nota !== nota || a.hecha || a.error) return undefined;
    const ahora = new Date().toISOString();
    return { ...l, aclaracion: paso === 'lanzada' ? { ...a, lanzada: ahora } : paso === 'hecha' ? { ...a, hecha: ahora } : { ...a, error: paso.error, ...(paso.falla ? { falla: paso.falla } : {}) } };
  });
}

/**
 * «Retomarla» de una aclaración o una urgencia que no se cerró (pr_retoma_automatica, punto 5): la misma, pedida otra vez a
 * nombre de quien oprime el botón, con lo que esa dejó (`reintento`) para que la bandeja lo liste y no se rehaga. Una
 * urgencia lleva también las que esperaban en `luego`. Devuelve la pedida, o null si no había una fallida de ese proyecto.
 */
export async function retomarAparte(raiz: string, proyecto: string, tipo: 'aclaracion' | 'urgencia', quien: string): Promise<AclaracionPedida | UrgenciaPedida | null> {
  let nueva: AclaracionPedida | UrgenciaPedida | null = null;
  await cambiarLocal(raiz, (l) => {
    const x = tipo === 'aclaracion' ? l.aclaracion : l.urgencia;
    if (!x || x.proyecto !== proyecto || !x.error || x.hecha) return undefined;
    const reintento: RetomaAparte = x.reintento ?? { lanzada: x.lanzada ?? x.pedida, ...(x.falla?.registro ? { registro: x.falla.registro } : {}) };
    const pedida = new Date().toISOString();
    if (tipo === 'aclaracion') {
      const a = x as AclaracionPedida;
      nueva = { proyecto, mision: a.mision, paso: a.paso, nota: a.nota, quien, pedida, reintento };
      return { ...l, aclaracion: nueva };
    }
    const u = x as UrgenciaPedida;
    nueva = { proyecto, notas: [...new Set([...u.notas, ...(u.luego ?? [])])], quien, pedida, reintento };
    return { ...l, urgencia: nueva };
  });
  return nueva;
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
export async function marcarUrgencia(raiz: string, pedida: string, paso: 'lanzada' | 'hecha' | { error: string; falla?: FallaRevision }): Promise<void> {
  await cambiarLocal(raiz, (l) => {
    const u = l.urgencia;
    if (!u || u.pedida !== pedida || u.hecha || u.error) return undefined;
    const ahora = new Date().toISOString();
    // La siguiente se reconoce por su fecha: nunca la misma que la que termina
    const siguiente = ahora > u.pedida ? ahora : new Date(Date.parse(u.pedida) + 1).toISOString();
    const urgencia: UrgenciaPedida = paso === 'lanzada' ? { ...u, lanzada: ahora }
      : paso === 'hecha' && u.luego?.length ? { proyecto: u.proyecto, notas: u.luego, quien: u.quien, pedida: siguiente }
      : paso === 'hecha' ? { ...u, hecha: ahora }
      : { ...u, error: paso.error, ...(paso.falla ? { falla: paso.falla } : {}) };
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
