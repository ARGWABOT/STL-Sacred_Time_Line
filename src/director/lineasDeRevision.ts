// Una línea por cada revisión de este computador (pedido pd_lineas_por_revision; notas de voz del titular nmvjnsbt3tit y
// nmvph53e3tit): sacada de su registro sin modelo, con cuándo fue, de qué tipo, cuánto duró y gastó, si cerró, qué notas
// respondió, qué archivos cambió, qué commits hizo, qué se le negó y cuánto tardó cada uno, para buscarla
// (tools/director/buscar.ts). Cada línea se guarda aparte, en este computador y fuera de git (.estudio/revisiones.jsonl), y
// no se borra: el registro completo, con su chat, se poda a los quince días (DIAS_REGISTROS), la línea y sus tiempos se
// quedan. Se escribe una sola vez, cuando su lanzamiento terminó.
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix, resolve, win32 } from 'node:path';
import { semanaDeCadaUno, tokensDelResultado, type SemanaDelLanzamiento } from './consumoDelPlan.ts';
import { negacionesDe } from './director.ts';
import { archivoDeEncargos } from './dosTiempos.ts';
import { esFinEscrito, type QuienTermino } from './finDeLanzamiento.ts';
import { REGISTRO, REVISIONES } from './paquete.ts';
import { esOrdenDePruebas, leerTurnos } from './turnos.ts';

/** Donde viven las líneas: junto a la bitácora de este computador, fuera de git. */
export const ARCHIVO_LINEAS = join('.estudio', 'revisiones.jsonl');

export interface LineaDeRevision {
  /** El nombre de su registro («<proyecto>-…Z.log»): una línea por registro. */
  registro: string;
  proyecto: string;
  tipo: 'revision' | 'urgencia' | 'aclaracion';
  /** Cuándo se lanzó. */
  cuando: string;
  /** Cuánto duró, en minutos: lo que dice Claude Code al terminar o, si no terminó con su resultado, hasta lo último que escribió. */
  minutos: number | null;
  /** Los tokens que gastó, como los dice Claude Code; null si no terminó con su resultado. No viene en las líneas de antes. */
  tokens?: number | null;
  modelo: string | null;
  /** Si corrió su cierre y cerró (la revisión, la urgencia o la aclaración). */
  cerro: boolean;
  /** Las notas que respondió: las de sus parches (director/cambios.json). */
  notas: string[];
  /** Los archivos que cambió (editar o escribir), sin repetir, en el orden en que los tocó. */
  archivos: string[];
  /** Los commits que hizo, con su asunto corto. */
  commits: { hash: string; asunto: string }[];
  /** Lo que se le negó. */
  negados: string[];
  /** Quién lo terminó, como lo escribió el Studio al terminar (finDeLanzamiento.ts); no viene en los de antes. */
  termino?: QuienTermino;
  /** Cuánto tardó cada uno y cada corrida de pruebas (tiemposDe): quedan sin límite, cuando el chat ya se borró. No viene en las de antes. */
  tiempos?: TiemposDeRevision;
  /** Los otros modelos que trabajaron en ella (sus ayudantes), y para qué. Solo si hubo; no viene en las de antes. */
  otrosModelos?: OtroModelo[];
}

/** Un modelo distinto al del director que trabajó en una revisión, y lo que se le encargó a sus ayudantes. */
export interface OtroModelo { modelo: string; para: string[] }

const TOPE_FRASE = 140;
const frase = (x: string) => (x.length > TOPE_FRASE ? `${x.slice(0, TOPE_FRASE - 1).trimEnd()}…` : x);

/** Lo más que guarda de lo encargado a cada modelo. */
const TOPE_ENCARGOS_DE_MODELO = 12;
/** El mismo modelo, con su contexto de un millón o sin él: «claude-opus-5-5[1m]» es «claude-opus-5-5». */
const modeloBase = (m: string) => m.replace(/\[[^\]]*\]$/, '');

/**
 * Los tiempos de una revisión, que se guardan sin límite en su línea mientras el chat completo vive lo que su registro,
 * 15 días (elección del titular nmvx3zzkbtit, 31 de octubre de 2026, en t_decide_chat_guardar). Pesan pocos KB. Lo que
 * planeó e hizo, más abajo, en su resumen (ResumenDeRevision).
 */
export interface TiemposDeRevision {
  modeloMs: number;
  computadorMs: number;
  ayudanteMs: number;
  /** El primer tiempo de la revisión, si lo tuvo: va aparte de la conversación. */
  planMs?: number;
  pruebas: { orden: string; ms: number; fallo?: true }[];
}

/** Lo más que guarda de cada orden de pruebas: la línea tiene que seguir pesando poco. */
const TOPE_ORDEN = 120;

/** Los tiempos de un registro: de cada actor, del primer tiempo y de cada corrida de pruebas, en el orden en que corrieron. Pura. */
export function tiemposDe(registro: string, primeroMinutos: number | null = null): TiemposDeRevision {
  const l = leerTurnos(registro);
  const pruebas = l.peticiones.filter((p) => esOrdenDePruebas(p.orden)).map((p) => ({ orden: p.orden!.trim().slice(0, TOPE_ORDEN), ms: p.ms ?? 0, ...(p.error ? { fallo: true as const } : {}) }));
  return { ...l.totales, ...(primeroMinutos ? { planMs: Math.round(primeroMinutos * 60_000) } : {}), pruebas };
}

/** Lo que dice la bandeja cuando cierra: la revisión, la urgencia o la aclaración. */
const CERRO = /Revisión marcada: \d{4}-|Urgencia atendida: |Aclaración hecha: |Comprobación hecha: /;
/** La línea con que git cuenta un commit hecho: «[main 3fb3cf0] El asunto». */
const COMMIT = /^\[[^\s\]]+(?: \([^)]*\))? ([0-9a-f]{7,40})\] (.+)$/gm;

const textoDe = (contenido: unknown): string =>
  typeof contenido === 'string' ? contenido : Array.isArray(contenido) ? contenido.map((c) => (typeof c === 'string' ? c : typeof c?.text === 'string' ? c.text : '')).join('\n') : '';

/**
 * La línea de una revisión, de su registro en stream-json. `nombre` es el del registro; `ultimo`, cuándo se escribió por
 * última vez (para la duración de uno que no terminó con su resultado); `raiz`, para dejar las rutas cortas. null si el
 * nombre no es el de un registro. Pura.
 */
export function lineaDeRegistro(nombre: string, texto: string, ultimo?: number, raiz?: string): LineaDeRevision | null {
  const m = REGISTRO.exec(nombre);
  if (!m) return null;
  const cuando = `${m[3]}T${m[4]}:${m[5]}:${m[6]}.${m[7]}Z`;
  // Una raíz ya absoluta, de Windows o de Linux, no se resuelve: en Linux, resolve('C:/…') la pega a la carpeta actual
  const absoluta = raiz && (win32.isAbsolute(raiz) || posix.isAbsolute(raiz)) ? raiz : raiz && resolve(raiz);
  const base = absoluta ? absoluta.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase() : null;
  const corta = (ruta: string) => {
    const r = ruta.replace(/\\/g, '/');
    return base && r.toLowerCase().startsWith(`${base}/`) ? r.slice(base.length + 1) : r;
  };
  let modelo: string | null = null;
  let resultado: { tokens: number; minutos: number } | null = null;
  let primero: { tokens: number; minutos: number } | null = null;
  let termino: QuienTermino | undefined;
  let cerro = false;
  const notas = new Set<string>();
  const archivos = new Set<string>();
  const commits = new Map<string, string>();
  // Lo que se le encargó a cada ayudante (Agent, Task), y qué modelo respondió por él: sus mensajes traen a quién responden
  const encargos = new Map<string, string>();
  const deAyudantes = new Map<string, Set<string>>();
  for (const linea of texto.split('\n')) {
    if (!linea.startsWith('{')) continue;
    let ev: any;
    try { ev = JSON.parse(linea); } catch { continue; }
    if (!modelo && ev.type === 'system' && ev.subtype === 'init' && typeof ev.model === 'string') modelo = ev.model;
    if (ev.type === 'assistant' && typeof ev.parent_tool_use_id === 'string' && typeof ev.message?.model === 'string') {
      const quien = modeloBase(ev.message.model);
      const para = deAyudantes.get(quien) ?? new Set<string>();
      const encargo = encargos.get(ev.parent_tool_use_id);
      if (encargo) para.add(encargo);
      deAyudantes.set(quien, para);
    }
    if (ev.type === 'result') resultado = { tokens: tokensDelResultado(ev), minutos: Math.round((Number(ev.duration_ms) || 0) / 6000) / 10 };
    // El primer tiempo de la revisión en dos tiempos (pd_dos_tiempos) corre aparte, y sus tokens y sus minutos se suman aquí
    if (ev.type === 'studio' && ev.primerTiempo && typeof ev.primerTiempo === 'object') primero = { tokens: Number(ev.primerTiempo.tokens) || 0, minutos: Number(ev.primerTiempo.minutos) || 0 };
    if (ev.type === 'studio' && esFinEscrito(ev.fin)) termino = ev.fin.quien;
    for (const c of Array.isArray(ev.message?.content) ? ev.message.content : []) {
      if (c?.type === 'tool_use' && ['Agent', 'Task'].includes(c.name) && typeof c.id === 'string') encargos.set(c.id, String(c.input?.description ?? '').trim());
      if (c?.type === 'tool_use' && ['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(c.name) && typeof c.input?.file_path === 'string') {
        archivos.add(corta(c.input.file_path));
        // Lo que respondió: las notas de su parche
        if (c.name === 'Write' && /[\\/]cambios\.json$/.test(c.input.file_path) && typeof c.input.content === 'string')
          try {
            const respuestas = JSON.parse(c.input.content)?.respuestas;
            if (respuestas && typeof respuestas === 'object') for (const id of Object.keys(respuestas)) notas.add(id);
          } catch { /* un parche que no se entiende no dice qué respondió */ }
      }
      if (c?.type === 'tool_result') {
        const salida = textoDe(c.content);
        if (CERRO.test(salida)) cerro = true;
        for (const x of salida.matchAll(COMMIT)) if (!commits.has(x[1])) commits.set(x[1], x[2].length > 160 ? `${x[2].slice(0, 159)}…` : x[2]);
      }
    }
  }
  const tiempos = tiemposDe(texto, primero ? (primero as { minutos: number }).minutos : null);
  // Con el primer tiempo, lo de los dos: lo que dura y gasta la revisión entera, como se compara antes y después
  if (resultado && primero) resultado = { tokens: resultado.tokens + primero.tokens, minutos: Math.round((resultado.minutos + primero.minutos) * 10) / 10 };
  const minutos = resultado?.minutos ?? (ultimo ? Math.max(0, Math.round((ultimo - Date.parse(cuando)) / 6000) / 10) : null);
  const otrosModelos: OtroModelo[] = [...deAyudantes].filter(([m]) => m !== (modelo && modeloBase(modelo))).map(([m, para]) => ({ modelo: m, para: [...para].filter(Boolean).slice(0, TOPE_ENCARGOS_DE_MODELO).map(frase) }));
  return {
    registro: nombre,
    proyecto: m[1],
    tipo: (m[2] as LineaDeRevision['tipo']) ?? 'revision',
    cuando,
    minutos,
    tokens: resultado ? resultado.tokens : null,
    modelo,
    cerro,
    notas: [...notas],
    archivos: [...archivos],
    commits: [...commits].map(([hash, asunto]) => ({ hash, asunto })),
    negados: negacionesDe(texto),
    ...(termino ? { termino } : {}),
    tiempos,
    ...(otrosModelos.length ? { otrosModelos } : {}),
  };
}

/** Las líneas guardadas en este computador, de la más vieja a la más nueva. Una que no se entiende se salta. */
export function leerLineasDeRevision(raiz: string): LineaDeRevision[] {
  const archivo = join(raiz, ARCHIVO_LINEAS);
  if (!existsSync(archivo)) return [];
  const lineas: LineaDeRevision[] = [];
  for (const l of readFileSync(archivo, 'utf-8').split('\n')) {
    if (!l.trim()) continue;
    try {
      const x = JSON.parse(l);
      if (x && typeof x.registro === 'string') lineas.push(x);
    } catch { /* una línea a medio escribir no tapa las demás */ }
  }
  return lineas;
}

/** El registro del director que trabaja ahora desde este Studio (el turno de lanzar), o null: el suyo aún no termina. */
function registroDelTurno(raiz: string): string | null {
  try {
    const t = JSON.parse(readFileSync(join(raiz, REVISIONES, 'lanzando.json'), 'utf-8'));
    return typeof t.registro === 'string' ? (t.registro.split(/[\\/]/).at(-1) ?? null) : null;
  } catch {
    return null;
  }
}

/**
 * Escribe la línea de cada registro de este computador que aún no la tiene y cuyo lanzamiento terminó: los que dice
 * `terminados` (sus nombres; con 'todos', todos, porque nadie trabaja), y los que ya tienen su resultado, salvo el del
 * director que tiene el turno, que puede seguir después de un resultado (con un flujo en segundo plano). Nunca reescribe
 * una línea. Devuelve todas las líneas.
 */
export function guardarLineasDeRevision(raiz: string, terminados: 'todos' | string[] = []): LineaDeRevision[] {
  const guardadas = leerLineasDeRevision(raiz);
  const carpeta = join(raiz, REVISIONES);
  if (!existsSync(carpeta)) return guardadas;
  const ya = new Set(guardadas.map((l) => l.registro));
  const enCurso = terminados === 'todos' ? null : registroDelTurno(raiz);
  const forzados = new Set(terminados === 'todos' ? [] : terminados.map((t) => t.split(/[\\/]/).at(-1)));
  const nuevas: LineaDeRevision[] = [];
  for (const nombre of readdirSync(carpeta).filter((n) => REGISTRO.test(n) && !ya.has(n)).sort()) {
    const ruta = join(carpeta, nombre);
    let texto: string;
    let ultimo: number;
    try {
      texto = readFileSync(ruta, 'utf-8');
      ultimo = statSync(ruta).mtimeMs;
    } catch {
      continue;
    }
    const termino = terminados === 'todos' || forzados.has(nombre) || (nombre !== enCurso && texto.includes('"type":"result"'));
    if (!termino) continue;
    const l = lineaDeRegistro(nombre, texto, ultimo, raiz);
    if (l) nuevas.push(l);
  }
  if (nuevas.length) {
    nuevas.sort((a, b) => a.cuando.localeCompare(b.cuando));
    mkdirSync(join(raiz, '.estudio'), { recursive: true });
    appendFileSync(join(raiz, ARCHIVO_LINEAS), nuevas.map((l) => JSON.stringify(l)).join('\n') + '\n', 'utf-8');
  }
  // Con su línea, su resumen, y el de las revisiones de antes que aún tienen registro: si falla, lo intenta la siguiente vez
  try {
    guardarResumenesDeRevision(raiz, terminados);
  } catch {
    // las líneas ya están; un resumen que falta no las toca
  }
  return [...guardadas, ...nuevas];
}

// ── El resumen de cada revisión, para la línea en grande (pedido pd_linea_zoom; elecciones del titular del 30 de octubre y del
// 1 de noviembre de 2026, t_decide_linea_vieja): lo que planeó, lo que hizo, sus tokens, la parte aproximada de tu plan, el
// modelo, el esfuerzo y cómo terminó, en pocos KB y sin límite de días, mientras su registro grande se borra a los 15. Nunca
// una cifra de dinero (nota de voz del titular nmvx46phftit), aunque el registro de Claude Code la traiga.

/** Donde viven los resúmenes: junto a las líneas, en este computador y fuera de git. */
export const ARCHIVO_RESUMENES = join('.estudio', 'revisiones-resumen.jsonl');

/** Lo que guarda de cada lista, para que un resumen siga pesando pocos KB. */
const TOPE_ENCARGOS = 20;
const TOPE_COMMITS = 20;

export interface ResumenDeRevision {
  registro: string;
  proyecto: string;
  cuando: string;
  /** Lo que planeó: sus encargos, y cuáles marcó hechos. Vacío si no tuvo plan o ya no está su lista. */
  planeo: { que: string; hecho: boolean }[];
  /** Lo que hizo: sus commits, cuántas notas respondió y cuántos archivos tocó. */
  hizo: { commits: string[]; notas: number; archivos: number };
  minutos: number | null;
  tokens: number | null;
  /** Lo que subió el límite semanal en este lanzamiento: de aquí sale la parte de tu plan (semanaDeCadaUno). */
  semana: SemanaDelLanzamiento | null;
  modelo: string | null;
  esfuerzo: string | null;
  cerro: boolean;
  termino?: QuienTermino;
}

/** El esfuerzo que pidió el Studio y el límite semanal al empezar y al terminar, de la misma ventana. Pura. */
function pedidoYSemana(registro: string): { esfuerzo: string | null; semana: SemanaDelLanzamiento | null } {
  let esfuerzo: string | null = null;
  let primera: { uso: number; renueva: string | null } | null = null;
  let ultima: { uso: number; renueva: string | null } | null = null;
  for (const linea of registro.split('\n')) {
    if (!linea.startsWith('{')) continue;
    let ev: any;
    try { ev = JSON.parse(linea); } catch { continue; }
    if (ev.type === 'studio' && typeof ev.pedido?.esfuerzo === 'string') esfuerzo = ev.pedido.esfuerzo;
    const w = ev.type === 'rate_limit_event' ? ev.rate_limit_info?.unifiedWindows?.seven_day : null;
    if (typeof w?.utilization !== 'number' || !Number.isFinite(w.utilization)) continue;
    ultima = { uso: Math.round(w.utilization * 1000) / 10, renueva: typeof w.resetsAt === 'number' ? new Date(w.resetsAt * 1000).toISOString() : null };
    primera ??= ultima;
  }
  const semana = primera && ultima && primera.renueva === ultima.renueva ? { desde: primera.uso, hasta: ultima.uso, renueva: ultima.renueva } : null;
  return { esfuerzo, semana };
}

/** El resumen de una revisión, de su registro y su lista de encargos. null si no es el registro de una revisión (una urgencia o una aclaración no van). Pura. */
export function resumenDeRegistro(nombre: string, texto: string, encargos: unknown, ultimo?: number, raiz?: string): ResumenDeRevision | null {
  const l = lineaDeRegistro(nombre, texto, ultimo, raiz);
  if (!l || l.tipo !== 'revision') return null;
  const lista = Array.isArray(encargos) ? encargos.filter((e) => e && typeof e.que === 'string') : [];
  return {
    registro: l.registro,
    proyecto: l.proyecto,
    cuando: l.cuando,
    planeo: lista.slice(0, TOPE_ENCARGOS).map((e) => ({ que: frase(e.que), hecho: !!e.hecho })),
    hizo: { commits: l.commits.slice(0, TOPE_COMMITS).map((c) => frase(c.asunto)), notas: l.notas.length, archivos: l.archivos.length },
    minutos: l.minutos,
    tokens: l.tokens ?? null,
    ...pedidoYSemana(texto),
    modelo: l.modelo,
    cerro: l.cerro,
    ...(l.termino ? { termino: l.termino } : {}),
  };
}

/** Los resúmenes guardados en este computador. Uno que no se entiende se salta. */
export function leerResumenesDeRevision(raiz: string): ResumenDeRevision[] {
  const archivo = join(raiz, ARCHIVO_RESUMENES);
  if (!existsSync(archivo)) return [];
  const resumenes: ResumenDeRevision[] = [];
  for (const l of readFileSync(archivo, 'utf-8').split('\n')) {
    if (!l.trim()) continue;
    try {
      const x = JSON.parse(l);
      if (x && typeof x.registro === 'string') resumenes.push(x);
    } catch { /* uno a medio escribir no tapa los demás */ }
  }
  return resumenes;
}

/**
 * Escribe el resumen de cada revisión que aún tiene su registro, ya terminó y no lo tiene: así, la primera vez, se resumen
 * también las de los últimos 15 días (t_decide_linea_vieja). Lo que termina, igual que guardarLineasDeRevision. Nunca
 * reescribe un resumen.
 */
export function guardarResumenesDeRevision(raiz: string, terminados: 'todos' | string[] = []): ResumenDeRevision[] {
  const guardados = leerResumenesDeRevision(raiz);
  const carpeta = join(raiz, REVISIONES);
  if (!existsSync(carpeta)) return guardados;
  const ya = new Set(guardados.map((r) => r.registro));
  const enCurso = terminados === 'todos' ? null : registroDelTurno(raiz);
  const forzados = new Set(terminados === 'todos' ? [] : terminados.map((t) => t.split(/[\\/]/).at(-1)));
  const nuevos: ResumenDeRevision[] = [];
  for (const nombre of readdirSync(carpeta).filter((n) => REGISTRO.exec(n)?.[2] === undefined && REGISTRO.test(n) && !ya.has(n)).sort()) {
    const ruta = join(carpeta, nombre);
    let texto: string;
    let ultimo: number;
    try {
      texto = readFileSync(ruta, 'utf-8');
      ultimo = statSync(ruta).mtimeMs;
    } catch {
      continue;
    }
    if (terminados !== 'todos' && !forzados.has(nombre) && (nombre === enCurso || !texto.includes('"type":"result"'))) continue;
    let encargos: unknown = null;
    try {
      encargos = JSON.parse(readFileSync(archivoDeEncargos(ruta), 'utf-8'));
    } catch { /* sin plan, o ya no está su lista */ }
    const r = resumenDeRegistro(nombre, texto, encargos, ultimo, raiz);
    if (r) nuevos.push(r);
  }
  if (nuevos.length) {
    mkdirSync(join(raiz, '.estudio'), { recursive: true });
    appendFileSync(join(raiz, ARCHIVO_RESUMENES), nuevos.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf-8');
  }
  return [...guardados, ...nuevos];
}

/** Una urgencia o una aclaración que corrió después de una revisión y antes de la siguiente. */
export interface LanzamientoAparte { tipo: 'urgencia' | 'aclaracion'; cuando: string; notas: number; cerro: boolean }

/**
 * Una revisión en el historial de la línea: su resumen, con la parte aproximada de tu plan, lo que se le negó, los otros modelos
 * y las urgencias y las aclaraciones que le siguieron (elección del titular nmvzpxrkztit, 2 de noviembre de 2026), o, sin él, que
 * no hay historial.
 */
export type RevisionEnHistorial =
  | (Omit<ResumenDeRevision, 'semana'> & { sinHistorial?: undefined; planAprox: number | null; conRegistro: boolean; negados?: string[]; otrosModelos?: OtroModelo[]; aparte?: LanzamientoAparte[] })
  | { registro: string; proyecto: string; cuando: string; sinHistorial: true };

/**
 * El historial de las revisiones de un proyecto en este computador, de la más vieja a la más nueva. Cada una, con su
 * resumen: si su registro ya no está, sigue ahí (`conRegistro: false`, sin «La conversación»). Una que tiene su línea pero no
 * su resumen, más vieja que todo esto, lo dice (`sinHistorial`). La parte de tu plan se reparte como en «Lo que gasta», entre
 * todas las de la misma ventana, de cualquier proyecto: el límite es de la cuenta. Pura.
 */
function historialDeRevisiones(proyecto: string, lineas: readonly LineaDeRevision[], resumenes: readonly ResumenDeRevision[], registros: readonly string[]): RevisionEnHistorial[] {
  const parte = semanaDeCadaUno(resumenes.map((r) => ({ id: r.registro, tokens: r.tokens ?? 0, semana: r.semana })));
  const presentes = new Set(registros);
  const linea = new Map(lineas.map((l) => [l.registro, l]));
  const suyas = resumenes.filter((r) => r.proyecto === proyecto).sort((a, b) => a.cuando.localeCompare(b.cuando));
  // Cada urgencia o aclaración, con la última revisión de antes de ella: de la primera hacia atrás no hay de quién colgarla
  const aparte = new Map<string, LanzamientoAparte[]>();
  for (const l of lineas) {
    if (l.proyecto !== proyecto || l.tipo === 'revision') continue;
    const antes = suyas.filter((r) => r.cuando <= l.cuando).at(-1);
    if (antes) aparte.set(antes.registro, [...(aparte.get(antes.registro) ?? []), { tipo: l.tipo, cuando: l.cuando, notas: l.notas.length, cerro: l.cerro }]);
  }
  const conResumen = suyas.map(({ semana: _, ...r }): RevisionEnHistorial => {
    const puntos = parte.get(r.registro);
    const l = linea.get(r.registro);
    return {
      ...r,
      planAprox: puntos === undefined ? null : Math.round(puntos * 10) / 10,
      conRegistro: presentes.has(r.registro),
      ...(l?.negados.length ? { negados: l.negados } : {}),
      ...(l?.otrosModelos?.length ? { otrosModelos: l.otrosModelos } : {}),
      ...(aparte.has(r.registro) ? { aparte: aparte.get(r.registro)!.sort((a, b) => a.cuando.localeCompare(b.cuando)) } : {}),
    };
  });
  const ya = new Set(resumenes.map((r) => r.registro));
  const sinResumen = lineas.filter((l) => l.proyecto === proyecto && l.tipo === 'revision' && !ya.has(l.registro)).map((l): RevisionEnHistorial => ({ registro: l.registro, proyecto: l.proyecto, cuando: l.cuando, sinHistorial: true }));
  return [...conResumen, ...sinResumen].sort((a, b) => a.cuando.localeCompare(b.cuando));
}

/** Lo mismo, del disco: antes, lo que le falte por resumir. */
export function historialDeProyecto(raiz: string, proyecto: string): RevisionEnHistorial[] {
  const lineas = guardarLineasDeRevision(raiz);
  const carpeta = join(raiz, REVISIONES);
  return historialDeRevisiones(proyecto, lineas, leerResumenesDeRevision(raiz), existsSync(carpeta) ? readdirSync(carpeta).filter((n) => REGISTRO.test(n)) : []);
}
