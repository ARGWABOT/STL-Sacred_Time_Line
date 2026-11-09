// «Automático, vigilado» (pedido pd_permiso_automatico; decisiones del titular del 26 de octubre de 2026): en ese modo,
// Claude Code decide solo lo que le falta al director, sin llamar al gancho del Studio (lo midió tools/probarPermisos.ts
// --auto). Para que el titular sepa en todo momento qué le tiene permitido el Studio, lo que Claude Code apruebe solo se
// lee del registro de la revisión: cada llamada que corrió y que no cabía en lo que el director ya tenía permitido. Cada
// una se vuelve la regla general de su tipo de acción (la misma del panel de permisos, permisosNegados.ts › reglaDe), que
// el Studio deja en el panel marcada «Lo aprobó Claude Code», con su casilla para quitarla. Puro: sin archivos. El
// lanzador (revisor.ts › lanzar) deja al empezar, en el registro, lo que el director ya tenía (lineaAutomatico): con eso,
// «Lo que va haciendo el director» muestra cada aprobación en vivo (aprobadoEnVivo), y al terminar, el panel la recibe.
import { ordenesDe, ordenPermitida, reglaDe, rutaPermitida, type Negado, type PermisoAutorizado, type ReglaPropuesta } from './permisosNegados.ts';

/** Las herramientas que piden permiso: las demás (TodoWrite, Agent, ToolSearch…) nunca pasan por él. */
const LEEN = new Set(['Read', 'Glob', 'Grep', 'LS']);
const ESCRIBEN = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const OTRAS = new Set(['Bash', 'WebFetch', 'WebSearch']);
const pidePermiso = (herramienta: string) => LEEN.has(herramienta) || ESCRIBEN.has(herramienta) || OTRAS.has(herramienta) || herramienta.startsWith('mcp__');

/** Lo que Claude Code aprobó solo en una revisión, por tipo de acción, con lo que intentó. */
export interface AprobadoSolo extends ReglaPropuesta {
  herramienta: string;
  /** Lo que corrió con ese tipo de acción, en líneas cortas, en el orden en que pasó, sin repetir. */
  intentos: string[];
}

const corto = (t: string, n = 160) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
const intentoDe = (n: Negado) => {
  const e = n.entrada;
  const detalle = String(e.command ?? e.file_path ?? e.notebook_path ?? e.path ?? e.url ?? e.query ?? e.pattern ?? '').trim();
  return corto(detalle ? `${n.herramienta}: ${detalle}` : n.herramienta);
};

/**
 * Si una llamada cabía en lo que el director ya tenía (`permitidas`: lo de --allowedTools). Una cadena de órdenes cabe si
 * cabe cada una; leer dentro de sus carpetas de trabajo (`carpetas`) nunca pide permiso.
 */
export function cabia(n: Negado, permitidas: readonly string[], carpetas: readonly string[], casa: string): boolean {
  const h = n.herramienta;
  const e = n.entrada;
  if (permitidas.includes(h)) return true;
  if (h === 'Bash') {
    const orden = String(e.command ?? '').trim();
    const partes = ordenesDe(orden) ?? [orden];
    return partes.every((p) => ordenPermitida(p, permitidas));
  }
  const ruta = String(e.file_path ?? e.notebook_path ?? e.path ?? '');
  if (LEEN.has(h)) return !ruta || rutaPermitida(false, ruta, [...permitidas, ...carpetas.map((c) => `Read(${c})`)], casa);
  if (ESCRIBEN.has(h)) return rutaPermitida(true, ruta, permitidas, casa);
  return permitidas.some((r) => r.startsWith(`${h}(`));
}

/**
 * Lo que Claude Code aprobó solo en un registro de revisión (stream-json): cada llamada que corrió (no se negó, ni en vivo
 * ni en el resultado), que pide permiso y que no cabía en lo permitido. `carpetas`: las de trabajo, como reglas
 * (//c/repos/golf/**). Agrupado por la regla general de su tipo de acción; lo que no tiene regla, por lo que intentó.
 */
export function aprobadosSolos(registro: string, permitidas: readonly string[], carpetas: readonly string[], casa: string): AprobadoSolo[] {
  const usos = new Map<string, Negado>();
  const negados = new Set<string>();
  for (const linea of registro.split('\n')) {
    if (!linea.startsWith('{')) continue;
    let ev: any;
    try {
      ev = JSON.parse(linea);
    } catch {
      continue;
    }
    if (ev?.type === 'assistant' && Array.isArray(ev.message?.content))
      for (const b of ev.message.content)
        if (b?.type === 'tool_use' && b.id) usos.set(String(b.id), { herramienta: String(b.name ?? ''), entrada: b.input && typeof b.input === 'object' ? b.input : {} });
    if (ev?.type === 'system' && ev.subtype === 'permission_denied' && ev.tool_use_id) negados.add(String(ev.tool_use_id));
    if (ev?.type === 'result' && Array.isArray(ev.permission_denials)) for (const x of ev.permission_denials) if (x?.tool_use_id) negados.add(String(x.tool_use_id));
  }
  const porRegla = new Map<string, AprobadoSolo>();
  for (const [id, n] of usos) {
    if (negados.has(id) || !pidePermiso(n.herramienta) || cabia(n, permitidas, carpetas, casa)) continue;
    const p = reglaDe(n, casa);
    const clave = p.regla ?? intentoDe(n);
    const antes = porRegla.get(clave);
    const intento = intentoDe(n);
    porRegla.set(clave, { ...p, herramienta: n.herramienta, intentos: [...(antes?.intentos ?? []).filter((x) => x !== intento), intento] });
  }
  return [...porRegla.values()];
}

/** Quien firma en el panel lo que aprobó solo Claude Code. */
export const LO_APROBO_CLAUDE = 'Claude Code';

/**
 * Lo autorizado, con lo que Claude Code aprobó solo en una revisión: cada regla nueva, con el alcance de «Permitir siempre»
 * (solo el proyecto que se revisaba) y marcada `origen: 'claude'`, para quitarla con su casilla (tu elección del 26 de
 * octubre de 2026). Lo que no tiene regla (una cadena con redirección, una orden que no quedó) no entra: no se puede
 * autorizar tal cual, y vuelve a pasar por Claude Code la próxima vez. Lo que ya estaba autorizado no se repite. Pura.
 */
export function conLoAprobado(antes: PermisoAutorizado[], aprobados: readonly AprobadoSolo[], proyecto: string, cuando: string): PermisoAutorizado[] {
  const ya = (regla: string) => antes.some((a) => a.regla === regla && (a.alcance === 'todos' || a.proyecto === proyecto));
  const nuevas = [...new Set(aprobados.map((a) => a.regla).filter((r): r is string => !!r && !ya(r)))];
  return [...antes, ...nuevas.map((regla) => ({ regla, alcance: 'proyecto' as const, proyecto, cuando, quien: LO_APROBO_CLAUDE, origen: 'claude' as const }))];
}

/** Lo que el director ya tenía al empezar una revisión en el modo automático: lo que se compara con lo que corrió. */
export interface YaPermitido {
  permitidas: string[];
  carpetas: string[];
  casa: string;
}

/** La línea del registro con lo que el director ya tenía (la escribe el lanzador antes de lanzarlo, como la del pedido). */
export const lineaAutomatico = (ya: YaPermitido) => `${JSON.stringify({ type: 'studio', automatico: ya })}\n`;

/** Lo que ya tenía, de la línea del lanzador; null si la línea es otra. */
function yaPermitidoDe(ev: any): YaPermitido | null {
  const a = ev?.type === 'studio' ? ev.automatico : null;
  if (!a || !Array.isArray(a.permitidas) || !Array.isArray(a.carpetas) || typeof a.casa !== 'string') return null;
  return { permitidas: a.permitidas.map(String), carpetas: a.carpetas.map(String), casa: a.casa };
}

/** Lo que se lleva leído de una revisión en el modo automático, de un pedazo del registro al siguiente. */
export interface EnVivo {
  ya?: YaPermitido;
  /** Lo que pidió el director y aún no tiene resultado, por el id de su uso. */
  usos: Map<string, Negado>;
}

/**
 * Lo que Claude Code acaba de aprobar solo, de un evento del registro, para «Lo que va haciendo el director»: el uso de
 * una herramienta que pide permiso y que no cabía en lo que el director ya tenía, cuando llega su resultado sin error (lo
 * negado vuelve con error). Una línea por aprobación, dicha como en el panel («Bash: curl -s …»); null en cualquier otro
 * evento, y siempre que la revisión no corre en el modo automático (sin la línea del lanzador).
 */
export function aprobadoEnVivo(ev: any, estado: EnVivo): string | null {
  const ya = yaPermitidoDe(ev);
  if (ya) return (estado.ya = ya), null;
  if (!estado.ya) return null;
  const contenido = Array.isArray(ev?.message?.content) ? ev.message.content : [];
  if (ev?.type === 'assistant')
    for (const b of contenido) if (b?.type === 'tool_use' && b.id && pidePermiso(String(b.name ?? ''))) estado.usos.set(String(b.id), { herramienta: String(b.name), entrada: b.input && typeof b.input === 'object' ? b.input : {} });
  if (ev?.type !== 'user') return null;
  const aprobados: string[] = [];
  for (const b of contenido) {
    const n = b?.type === 'tool_result' ? estado.usos.get(String(b.tool_use_id)) : undefined;
    if (!n) continue;
    estado.usos.delete(String(b.tool_use_id));
    if (b.is_error !== true && !cabia(n, estado.ya.permitidas, estado.ya.carpetas, estado.ya.casa)) aprobados.push(intentoDe(n));
  }
  return aprobados.length ? aprobados.join(' · ') : null;
}
