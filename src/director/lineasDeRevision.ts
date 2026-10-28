// Una línea por cada revisión de este computador (pedido pd_lineas_por_revision; notas de voz del titular nmvjnsbt3tit y
// nmvph53e3tit): sacada de su registro sin modelo, con cuándo fue, de qué tipo, cuánto duró y gastó, si cerró, qué notas
// respondió, qué archivos cambió, qué commits hizo y qué se le negó, para buscarla (tools/director/buscar.ts). Cada línea
// se guarda aparte, en este computador y fuera de git (.estudio/revisiones.jsonl), y no se borra: el registro completo
// se poda a los quince días (DIAS_REGISTROS), la línea se queda. Se escribe una sola vez, cuando su lanzamiento terminó.
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { negacionesDe } from './director.ts';
import { REGISTRO, REVISIONES } from './paquete.ts';

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
  /** Lo que gastó a precio de API, como lo dice Claude Code; null si no terminó con su resultado. */
  costo: number | null;
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
}

/** Lo que dice la bandeja cuando cierra: la revisión, la urgencia o la aclaración. */
const CERRO = /Revisión marcada: \d{4}-|Urgencia atendida: |Aclaración hecha: /;
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
  const base = raiz ? resolve(raiz).replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase() : null;
  const corta = (ruta: string) => {
    const r = ruta.replace(/\\/g, '/');
    return base && r.toLowerCase().startsWith(`${base}/`) ? r.slice(base.length + 1) : r;
  };
  let modelo: string | null = null;
  let resultado: { costo: number; minutos: number } | null = null;
  let cerro = false;
  const notas = new Set<string>();
  const archivos = new Set<string>();
  const commits = new Map<string, string>();
  for (const linea of texto.split('\n')) {
    if (!linea.startsWith('{')) continue;
    let ev: any;
    try { ev = JSON.parse(linea); } catch { continue; }
    if (!modelo && ev.type === 'system' && ev.subtype === 'init' && typeof ev.model === 'string') modelo = ev.model;
    if (ev.type === 'result') resultado = { costo: Number(ev.total_cost_usd) || 0, minutos: Math.round((Number(ev.duration_ms) || 0) / 6000) / 10 };
    for (const c of Array.isArray(ev.message?.content) ? ev.message.content : []) {
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
  const minutos = resultado?.minutos ?? (ultimo ? Math.max(0, Math.round((ultimo - Date.parse(cuando)) / 6000) / 10) : null);
  return {
    registro: nombre,
    proyecto: m[1],
    tipo: (m[2] as LineaDeRevision['tipo']) ?? 'revision',
    cuando,
    minutos,
    costo: resultado ? Math.round(resultado.costo * 100) / 100 : null,
    modelo,
    cerro,
    notas: [...notas],
    archivos: [...archivos],
    commits: [...commits].map(([hash, asunto]) => ({ hash, asunto })),
    negados: negacionesDe(texto),
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
  return [...guardadas, ...nuevas];
}
