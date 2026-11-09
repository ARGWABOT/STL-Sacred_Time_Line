// La revisión como una conversación (notas de voz del titular nmvx09it7tit y nmvx0q10ctit, 31 de octubre de 2026): quién le
// habla a quién, qué le pide y cuánto tardó el otro en responder, para saber «por qué se está demorando, quién está
// esperando a quién». Aquí, lo puro: del registro en stream-json de un lanzamiento (una línea JSON por evento) salen los
// turnos entre tu computador (el Studio y las herramientas que corren en él) y el modelo, y los tiempos de cada actor. Se lee
// de a pedazos (`leerTurnos`, con su estado), igual que lo demás de un registro en vivo, y sirve también para una revisión
// ya terminada: el registro es su historia. Lo que hace cada ayudante queda aparte, bajo el turno que lo pidió. Los textos
// para la persona los pone la interfaz (progresoVivo.ts, con el archivo de textos): aquí solo hay datos.

import { tokensDelResultado } from './consumoDelPlan.ts';

export type Actor = 'computador' | 'modelo' | 'ayudante';
export type TipoDeTurno = 'encargo' | 'plan' | 'aviso' | 'dice' | 'pide' | 'responde';

/** Qué es cada globo de la conversación (nota de voz del titular nmvxxg5wvtit): una solicitud, una pregunta o una respuesta. */
export type ClaseDeTurno = 'solicitud' | 'pregunta' | 'respuesta';

/** Lo que Claude Code dice que costó la revisión, como lo dice: lo enviado al modelo (también la caché) y lo que él devolvió. */
export interface TokensDeRevision {
  enviados: number;
  recibidos: number;
  /**
   * De lo enviado, lo que el modelo leyó de la caché, de la misma fuente: así el pie de la conversación («nuevos» y
   * «de la caché») suma lo mismo que la banda (nota nmw77f74atit). Solo si hubo.
   */
  cache?: number;
}

/** Un turno de la conversación. */
export interface Turno {
  id: string;
  de: Actor;
  a: Actor;
  tipo: TipoDeTurno;
  /** Si pide o responde: la herramienta, y en pocas palabras sobre qué (un archivo, una búsqueda, la descripción de una orden). */
  herramienta?: string;
  detalle?: string;
  /** Lo que se dice, entero hasta su tope (TOPE_TEXTO). */
  texto: string;
  /** Cuánto medía antes del tope, si se cortó. */
  largo?: number;
  cuando: string | null;
  /**
   * Cuánto tardó quien dice este turno en decirlo, en ms (nota de voz del titular nmvy3jz2otit, 1 de noviembre de 2026: el
   * tiempo va en el globo de quien se lo tomó). Del modelo, desde lo último que le llegó; de una herramienta, lo que corrió.
   * null si no hay de dónde medirlo o si ya lo muestra otro globo: un mensaje con varias partes lo muestra una sola vez.
   */
  tardoMs: number | null;
  /**
   * Los tokens que esta llamada al modelo leyó de la caché (`cache_read_input_tokens` de su mensaje), en su primer turno
   * y solo en ese (nota de voz del titular nmw5wu6gttit). Ausente si no leyó ninguno o si ya lo trae otro turno del mismo mensaje.
   */
  cacheLeidos?: number;
  /**
   * Todos los tokens de esa misma llamada (los de entrada nuevos, los que se guardaron en la caché, los leídos de ella y los
   * de salida), en el mismo turno que `cacheLeidos`: de ahí sale qué parte del turno vino de la caché (nota de voz del
   * titular nmw6se5vatit) y el total de la conversación, nuevos frente a caché (nmw6sdsuftit).
   */
  tokensLlamada?: number;
  error?: boolean;
  /** El id de lo que le pidió a un ayudante: sus turnos están en `ayudantes`. */
  ayudante?: string;
  /**
   * El lote: lo que el modelo pidió en un mismo mensaje, o lo que volvió de eso, comparten este valor, y la interfaz los
   * junta en un globo (nota de voz del titular nmvzirz2ctit, 2 de noviembre de 2026). El registro los trae intercalados,
   * pedido y resultado, a medida que corren; el modelo no sigue hasta tenerlos todos.
   */
  lote?: string;
}

/** Quién tiene el turno ahora, y desde cuándo: el cronómetro de la conversación. */
export interface Espera {
  quien: Actor;
  desde: string;
  /** Lo que se le pidió, si es una herramienta. */
  herramienta?: string;
  detalle?: string;
}

/** Una petición del modelo con su duración: de aquí sale cuánto tomó cada orden. */
export interface Peticion {
  id: string;
  herramienta: string;
  detalle: string;
  orden?: string;
  desde: string | null;
  ms: number | null;
  error?: boolean;
}

export interface TotalesDeTurnos {
  modeloMs: number;
  computadorMs: number;
  ayudanteMs: number;
}

/** El estado con que se lee un registro de a pedazos. */
export interface LecturaDeTurnos {
  turnos: Turno[];
  ayudantes: Record<string, Turno[]>;
  peticiones: Peticion[];
  totales: TotalesDeTurnos;
  /** El último instante visto de la conversación principal. */
  ultimo: number | null;
  /** Lo pedido por el modelo que aún no tiene respuesta. */
  abiertas: Map<string, { peticion: Peticion; desde: number | null; mensaje?: string }>;
  /** El último turno de tu computador, que espera la respuesta del modelo: de ahí se mide lo que tarda el modelo. */
  porResponder: Turno | null;
  /** Hasta dónde ya se mostró el tiempo de lo pedido a la vez: cada respuesta muestra solo lo suyo, y la suma es lo que corrió. */
  marcaDeRespuestas: number | null;
  /** Lo mismo en cada ayudante, por su petición: desde cuándo se le mide lo que tarda; null si ya lo mostró. */
  marcasDeAyudante: Map<string, number | null>;
  /** Lo que corre en segundo plano (ayudantes, flujos). */
  fondo: number;
  /** Si el modelo terminó su turno. */
  termino: boolean;
  cuenta: number;
  /** Los tokens de cada llamada al modelo, por su mensaje: una llamada llega en varios eventos y cuenta una sola vez. */
  usoPorMensaje: Map<string, TokensDeRevision>;
  /** Los mensajes del modelo cuya caché leída ya está en un turno (Turno.cacheLeidos): una llamada llega en varios eventos y cuenta una vez. */
  cacheContada: Set<string>;
  /** Los del resultado final, que mandan sobre lo sumado. */
  tokensDelFinal: TokensDeRevision | null;
  /** Los de lo que ya cerró antes en la misma lectura: cada intento del primer tiempo, que tiene su propio resultado final. */
  tokensAntes: TokensDeRevision | null;
  /** Lo que dibuja la avalancha (NieveDeRevision), con los mensajes de la conversación principal ya contados. */
  nieve: NieveDeRevision & { mensajes: Set<string> };
}

/**
 * Lo que cuenta la avalancha del contexto (progresoVivo.ts › avalanchaHtml; animacion-contexto.md › «La avalancha»), sacado
 * del registro sin gastar nada: cuánto le mandó tu computador al modelo en la última llamada de la conversación principal
 * (toda la conversación, otra vez: la bola), qué parte de eso vino de la caché (la nieve apretada), cuántas llamadas van
 * (las bolitas que la bola ya recogió) y cuántas veces se resumió la conversación al acercarse al límite (el pino).
 */
export interface NieveDeRevision {
  contexto: number;
  cache: number;
  llamadas: number;
  resumenes: number;
  ultimoResumen: string | null;
}
const nieveNueva = (): LecturaDeTurnos['nieve'] => ({ contexto: 0, cache: 0, llamadas: 0, resumenes: 0, ultimoResumen: null, mensajes: new Set() });

/** Lo que entró en una llamada al modelo, con la caché, y qué parte vino de ella. Pura. */
export function contextoDeUso(u: Record<string, unknown> | undefined): { contexto: number; cache: number } {
  const leido = cifraDeTokens(u?.cache_read_input_tokens);
  const contexto = cifraDeTokens(u?.input_tokens) + cifraDeTokens(u?.cache_creation_input_tokens) + leido;
  return { contexto, cache: contexto > 0 ? leido / contexto : 0 };
}

export const lecturaNueva = (): LecturaDeTurnos => ({ turnos: [], ayudantes: {}, peticiones: [], totales: { modeloMs: 0, computadorMs: 0, ayudanteMs: 0 }, ultimo: null, abiertas: new Map(), porResponder: null, marcaDeRespuestas: null, marcasDeAyudante: new Map(), fondo: 0, termino: false, cuenta: 0, usoPorMensaje: new Map(), cacheContada: new Set(), tokensDelFinal: null, tokensAntes: null, nieve: nieveNueva() });

/** Lo más que guarda un turno de su texto: lo demás está en el registro. */
export const TOPE_TEXTO = 1500;
const HERRAMIENTAS_DE_AYUDANTE = new Set(['Agent', 'Task', 'Workflow']);

const nombreArchivo = (x: unknown) => String(x ?? '').split(/[\\/]/).pop() || '';
const enLinea = (x: unknown, n: number) => {
  const t = String(x ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};
const conTope = (t: string) => (t.length > TOPE_TEXTO ? { texto: `${t.slice(0, TOPE_TEXTO)}…`, largo: t.length } : { texto: t });

/** Sobre qué es una herramienta, en pocas palabras, y lo que pide entero (para abrirlo). Pura. */
function pedidoDe(nombre: string, e: Record<string, unknown>): { detalle: string; texto: string; orden?: string } {
  switch (nombre) {
    case 'Read': return { detalle: nombreArchivo(e.file_path), texto: String(e.file_path ?? '') };
    case 'Edit': case 'MultiEdit': return { detalle: nombreArchivo(e.file_path), texto: `${e.file_path ?? ''}\n- ${e.old_string ?? ''}\n+ ${e.new_string ?? ''}` };
    case 'Write': return { detalle: nombreArchivo(e.file_path), texto: `${e.file_path ?? ''}\n${e.content ?? ''}` };
    case 'NotebookEdit': return { detalle: nombreArchivo(e.notebook_path), texto: String(e.notebook_path ?? '') };
    case 'Grep': case 'Glob': return { detalle: enLinea(e.pattern, 60), texto: `${e.pattern ?? ''}${e.path ? `\n${e.path}` : ''}` };
    case 'Bash': return { detalle: enLinea(e.description || e.command, 120), texto: String(e.command ?? ''), orden: String(e.command ?? '') };
    case 'Task': case 'Agent': return { detalle: enLinea(e.description || e.prompt, 100), texto: String(e.prompt ?? e.description ?? '') };
    case 'WebSearch': return { detalle: enLinea(e.query, 80), texto: String(e.query ?? '') };
    case 'WebFetch': return { detalle: enLinea(e.url, 90), texto: String(e.url ?? '') };
    default: return { detalle: '', texto: JSON.stringify(e ?? {}) };
  }
}

/** El texto de un resultado de herramienta, que viene como texto o como una lista de partes. Pura. */
function textoDeResultado(c: unknown): string {
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.map((p: { type?: string; text?: string }) => (p?.type === 'text' ? (p.text ?? '') : p?.type ? `[${p.type}]` : '')).join('\n');
  return '';
}

/**
 * Un turno es una solicitud, una pregunta o una respuesta, según quién hace qué: el encargo, un aviso y lo que el modelo
 * pide son solicitudes; lo que vuelve de una herramienta y el plan que entrega el modelo, una respuesta; lo que el modelo
 * dice es una respuesta, salvo que termine preguntando. Pura.
 */
export function claseDeTurno(x: Pick<Turno, 'tipo' | 'texto'>): ClaseDeTurno {
  if (x.tipo === 'responde' || x.tipo === 'plan') return 'respuesta';
  if (x.tipo === 'dice') return /\?\s*$/.test(x.texto) ? 'pregunta' : 'respuesta';
  return 'solicitud';
}

const cifraDeTokens = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);

/**
 * Los tokens de lo que informa Claude Code, partidos en enviados y recibidos, con la misma cuenta de lo que gastó cada
 * lanzamiento (tokensDelResultado): lo recibido es su salida, y lo enviado, todo lo demás. Sin nada informado, null: no se
 * inventan. Pura.
 */
function partirTokens(r: { modelUsage?: unknown; usage?: unknown }): TokensDeRevision | null {
  const total = tokensDelResultado(r);
  if (!total) return null;
  const usos = r.modelUsage && typeof r.modelUsage === 'object' ? Object.values(r.modelUsage as Record<string, Record<string, unknown>>).filter((u) => u && typeof u === 'object') : [];
  const uso = r.usage as Record<string, unknown> | undefined;
  const recibidos = usos.length ? usos.reduce((s, u) => s + cifraDeTokens(u.outputTokens), 0) : cifraDeTokens(uso?.output_tokens);
  const cache = usos.length ? usos.reduce((s, u) => s + cifraDeTokens(u.cacheReadInputTokens), 0) : cifraDeTokens(uso?.cache_read_input_tokens);
  return conCache({ enviados: total - recibidos, recibidos }, cache);
}

const conCache = (t: { enviados: number; recibidos: number }, cache: number): TokensDeRevision => (cache > 0 ? { ...t, cache } : t);

/** Suma dos cuentas de tokens, con su caché. Pura. */
const sumarTokens = (a: TokensDeRevision, b: TokensDeRevision | null): TokensDeRevision =>
  conCache({ enviados: a.enviados + (b?.enviados ?? 0), recibidos: a.recibidos + (b?.recibidos ?? 0) }, (a.cache ?? 0) + (b?.cache ?? 0));

/** Los tokens de la revisión: los del resultado final y, mientras no llega, los de cada llamada, sumados. Pura. */
function tokensDeLectura(l: Pick<LecturaDeTurnos, 'usoPorMensaje' | 'tokensDelFinal' | 'tokensAntes'>): TokensDeRevision | null {
  const ahora = l.tokensDelFinal ?? (l.usoPorMensaje.size ? [...l.usoPorMensaje.values()].reduce((s, u) => sumarTokens(s, u), { enviados: 0, recibidos: 0 }) : null);
  if (!l.tokensAntes) return ahora;
  return sumarTokens(l.tokensAntes, ahora);
}

/**
 * Lo que venía antes en la lectura ya cerró (un intento del primer tiempo, o el primer tiempo entero): sus tokens quedan
 * sumados, porque el resultado final de lo que sigue trae solo los suyos, y nadie sigue esperando una respuesta suya.
 */
function cerrarLoDeAntes(l: LecturaDeTurnos) {
  l.tokensAntes = tokensDeLectura(l);
  l.tokensDelFinal = null;
  l.usoPorMensaje.clear();
  l.abiertas.clear();
  l.porResponder = null;
  l.fondo = 0;
  l.termino = true;
}

/**
 * Lo que pasa entre el instante anterior y este es de quien tenía el turno: con una herramienta pedida, de tu computador (o
 * del ayudante, si es lo que espera); sin ninguna, del modelo. Pedidas a la vez, cuentan una sola vez.
 */
function contar(l: LecturaDeTurnos, ahora: number | null) {
  if (ahora === null) return;
  if (l.ultimo !== null && ahora > l.ultimo) {
    const d = ahora - l.ultimo;
    const abiertas = [...l.abiertas.values()];
    if (abiertas.some((a) => HERRAMIENTAS_DE_AYUDANTE.has(a.peticion.herramienta))) l.totales.ayudanteMs += d;
    else if (abiertas.length) l.totales.computadorMs += d;
    else if (l.termino && l.fondo > 0) l.totales.ayudanteMs += d;
    else if (!l.termino) l.totales.modeloMs += d;
  }
  if (l.ultimo === null || ahora > l.ultimo) l.ultimo = ahora;
}

const instante = (t: unknown): number | null => {
  const n = typeof t === 'string' ? Date.parse(t) : NaN;
  return Number.isFinite(n) ? n : null;
};

/** El `texto` del turno `encargo` que le pide planear la revisión: lo que dice el globo lo pone la interfaz. */
export const ENCARGO_DE_PLANEAR = 'plan';

/**
 * Una revisión entera, desde su primera comunicación (nota del titular nmvybx5rctit, 1 de noviembre de 2026): el registro
 * de su primer tiempo, si lo tuvo, y después el suyo, en una sola lectura. `primero` va vacío si no lo hubo. Pura.
 */
export const leerRevisionEntera = (primero: string, registro: string): LecturaDeTurnos => leerTurnos(registro, leerTurnos(primero));

/**
 * Suma a la lectura lo que traen estas líneas completas del registro y la devuelve. Las líneas que no son JSON (avisos, un
 * registro viejo en texto) se ignoran. Los turnos de un ayudante, los que traen `parent_tool_use_id`, van aparte y no
 * cuentan en los tiempos de la conversación principal: ahí su tiempo es el de la petición que lo lanzó.
 */
export function leerTurnos(registro: string, l: LecturaDeTurnos = lecturaNueva()): LecturaDeTurnos {
  for (const linea of registro.split('\n')) {
    if (!linea.startsWith('{')) continue;
    let ev: any;
    try { ev = JSON.parse(linea); } catch { continue; }
    leerEvento(ev, l);
  }
  return l;
}

function turnoNuevo(l: LecturaDeTurnos, t: Omit<Turno, 'id' | 'tardoMs'> & { tardoMs?: number | null }): Turno {
  return { id: `t${++l.cuenta}`, tardoMs: null, ...t };
}

function leerEvento(ev: any, l: LecturaDeTurnos) {
  if (ev?.type === 'studio') {
    if (ev.primerTiempo) {
      const p = ev.primerTiempo;
      cerrarLoDeAntes(l);
      // Lo tardó el modelo: es su globo, como todo tiempo suyo
      l.turnos.push(turnoNuevo(l, { de: 'modelo', a: 'computador', tipo: 'plan', texto: p.ok ? String(p.encargos ?? '') : String(p.porque ?? ''), cuando: null, tardoMs: typeof p.minutos === 'number' ? Math.round(p.minutos * 60_000) : null, error: !p.ok }));
    } else if (ev.intento) {
      // El reintento del primer tiempo (dosTiempos.ts › lineaDeReintento): el intento de antes ya no sigue
      cerrarLoDeAntes(l);
    } else if (ev.encargo) {
      // `paraPlanear`: el encargo del primer tiempo, en su registro (nota del titular nmvybx5rctit)
      l.turnos.push(turnoNuevo(l, { de: 'computador', a: 'modelo', tipo: 'encargo', texto: ev.encargo.paraPlanear ? ENCARGO_DE_PLANEAR : '', cuando: ev.encargo.cuando ?? null }));
      contar(l, instante(ev.encargo.cuando));
      // Desde aquí, el turno es del modelo: lo de antes (su primer tiempo) ya cerró
      l.termino = false;
      l.porResponder = l.turnos.at(-1)!;
    } else if (ev.aviso) {
      l.turnos.push(turnoNuevo(l, { de: 'computador', a: 'modelo', tipo: 'aviso', texto: String(ev.aviso), cuando: ev.cuando ?? null }));
    }
    return;
  }
  if (ev?.type === 'system' && ev.subtype === 'background_tasks_changed') {
    l.fondo = Array.isArray(ev.tasks) ? ev.tasks.length : 0;
    return;
  }
  // La conversación se resumió al acercarse al límite: la bola choca con el pino y se parte
  if (ev?.type === 'system' && ev.subtype === 'compact_boundary') {
    l.nieve.resumenes++;
    l.nieve.ultimoResumen = typeof ev.timestamp === 'string' ? ev.timestamp : l.ultimo === null ? null : new Date(l.ultimo).toISOString();
    return;
  }
  if (ev?.type === 'result') {
    l.termino = true;
    l.porResponder = null;
    l.tokensDelFinal = partirTokens(ev) ?? l.tokensDelFinal;
    return;
  }
  if ((ev?.type !== 'assistant' && ev?.type !== 'user') || !Array.isArray(ev.message?.content)) return;
  // Lo que informa cada llamada al modelo, también las de un ayudante, por su mensaje (el último dato de cada uno manda)
  if (ev.type === 'assistant' && ev.message.usage) {
    const uso = partirTokens({ usage: ev.message.usage });
    if (uso) l.usoPorMensaje.set(String(ev.message.id ?? `sin-id-${l.usoPorMensaje.size}`), uso);
    // La bola es lo de la conversación principal: lo de un ayudante va en su propia conversación
    if (!ev.parent_tool_use_id) {
      const { contexto, cache } = contextoDeUso(ev.message.usage);
      if (contexto > 0) Object.assign(l.nieve, { contexto, cache });
      l.nieve.mensajes.add(String(ev.message.id ?? `sin-id-${l.nieve.mensajes.size}`));
      l.nieve.llamadas = l.nieve.mensajes.size;
    }
  }
  const padre: string | null = ev.parent_tool_use_id ?? null;
  const cuando: string | null = typeof ev.timestamp === 'string' ? ev.timestamp : null;
  const ahora = instante(cuando);
  if (padre) return leerDeAyudante(ev, padre, cuando, l);
  if (ev.type === 'assistant') {
    contar(l, ahora);
    l.termino = false;
    l.marcaDeRespuestas = null;
    // Lo que tardó el modelo desde lo último que le llegó va en su primer globo de este mensaje, y solo en ese. Un mensaje
    // sin globo (solo su razonamiento) no lo gasta: el tiempo sigue corriendo hasta el que sí se ve
    const tardoElModelo = (): number | null => {
      if (!l.porResponder) return null;
      const desde = instante(l.porResponder.cuando);
      l.porResponder = null;
      return desde !== null && ahora !== null ? ahora - desde : null;
    };
    // La caché que leyó esta llamada va en su primer globo, y solo en ese, aunque la llamada llegue en varios eventos
    const idLlamada = typeof ev.message.id === 'string' && ev.message.id ? ev.message.id : null;
    const uso = ev.message.usage;
    let cachePorPoner = cifraDeTokens(uso?.cache_read_input_tokens);
    const deLaLlamada = cachePorPoner + cifraDeTokens(uso?.input_tokens) + cifraDeTokens(uso?.cache_creation_input_tokens) + cifraDeTokens(uso?.output_tokens);
    let porPoner = !(idLlamada && l.cacheContada.has(idLlamada)) && deLaLlamada > 0;
    if (!porPoner) cachePorPoner = 0;
    const conCache = (): { cacheLeidos?: number; tokensLlamada?: number } => {
      if (!porPoner) return {};
      const cacheLeidos = cachePorPoner;
      porPoner = false;
      cachePorPoner = 0;
      if (idLlamada) l.cacheContada.add(idLlamada);
      return { ...(cacheLeidos > 0 ? { cacheLeidos } : {}), tokensLlamada: deLaLlamada };
    };
    for (const b of ev.message.content) {
      if (b.type === 'text' && b.text?.trim()) l.turnos.push(turnoNuevo(l, { de: 'modelo', a: 'computador', tipo: 'dice', ...conTope(b.text), cuando, tardoMs: tardoElModelo(), ...conCache() }));
      if (b.type === 'tool_use' && b.name && b.id) {
        const p = pedidoDe(b.name, b.input ?? {});
        const mensaje = typeof ev.message.id === 'string' && ev.message.id ? ev.message.id : undefined;
        const turno = turnoNuevo(l, { de: 'modelo', a: 'computador', tipo: 'pide', herramienta: b.name, detalle: p.detalle, ...conTope(p.texto), cuando, tardoMs: tardoElModelo(), ...conCache(), ...(HERRAMIENTAS_DE_AYUDANTE.has(b.name) ? { ayudante: b.id } : {}), ...(mensaje ? { lote: `pide:${mensaje}` } : {}) });
        const peticion: Peticion = { id: b.id, herramienta: b.name, detalle: p.detalle, ...(p.orden ? { orden: p.orden } : {}), desde: cuando, ms: null };
        l.turnos.push(turno);
        l.peticiones.push(peticion);
        l.abiertas.set(b.id, { peticion, desde: ahora, ...(mensaje ? { mensaje } : {}) });
      }
    }
    return;
  }
  contar(l, ahora);
  for (const b of ev.message.content) {
    if (b.type === 'tool_result' && b.tool_use_id) {
      const abierta = l.abiertas.get(b.tool_use_id);
      l.abiertas.delete(b.tool_use_id);
      const ms = abierta?.desde != null && ahora !== null ? ahora - abierta.desde : null;
      if (abierta) {
        abierta.peticion.ms = ms;
        if (b.is_error) abierta.peticion.error = true;
      }
      const tardo = tardoDeRespuesta(abierta?.desde ?? null, l.marcaDeRespuestas, ahora);
      if (ahora !== null) l.marcaDeRespuestas = ahora;
      const respuesta = turnoNuevo(l, { de: 'computador', a: 'modelo', tipo: 'responde', ...(abierta ? { herramienta: abierta.peticion.herramienta, detalle: abierta.peticion.detalle } : {}), ...conTope(textoDeResultado(b.content)), cuando, tardoMs: tardo, ...(b.is_error ? { error: true } : {}), ...(abierta?.mensaje ? { lote: `responde:${abierta.mensaje}` } : {}) });
      l.turnos.push(respuesta);
      // Con todo respondido, ahora espera el modelo
      if (!l.abiertas.size) l.porResponder = respuesta;
    } else if (b.type === 'text' && b.text?.trim()) {
      // Un mensaje para el modelo: un aviso del Studio mientras trabaja
      const aviso = turnoNuevo(l, { de: 'computador', a: 'modelo', tipo: 'aviso', ...conTope(b.text), cuando });
      l.turnos.push(aviso);
      if (!l.abiertas.size) l.porResponder = aviso;
    }
  }
}

/**
 * Lo que corrió una herramienta, si su tiempo no se ha mostrado: de lo pedido a la vez, cada respuesta muestra lo que corrió
 * desde la anterior, y las que vuelven en el mismo instante no repiten nada. Pura.
 */
function tardoDeRespuesta(desde: number | null, marca: number | null, ahora: number | null): number | null {
  if (desde === null || ahora === null || marca === ahora) return null;
  return ahora - Math.max(desde, marca ?? desde);
}

function leerDeAyudante(ev: any, padre: string, cuando: string | null, l: LecturaDeTurnos) {
  const lista = (l.ayudantes[padre] ??= []);
  const ahora = instante(cuando);
  const marca = l.marcasDeAyudante.has(padre) ? l.marcasDeAyudante.get(padre)! : l.abiertas.get(padre)?.desde ?? null;
  if (ev.type === 'assistant') {
    // Igual que el modelo: lo que tardó, en su primer globo de este mensaje
    let desde = marca;
    const tardoElAyudante = (): number | null => {
      const antes = desde;
      desde = null;
      l.marcasDeAyudante.set(padre, null);
      return antes !== null && ahora !== null ? ahora - antes : null;
    };
    for (const b of ev.message.content) {
      if (b.type === 'text' && b.text?.trim()) lista.push(turnoNuevo(l, { de: 'ayudante', a: 'computador', tipo: 'dice', ...conTope(b.text), cuando, tardoMs: tardoElAyudante() }));
      if (b.type === 'tool_use' && b.name) {
        const p = pedidoDe(b.name, b.input ?? {});
        lista.push({ ...turnoNuevo(l, { de: 'ayudante', a: 'computador', tipo: 'pide', herramienta: b.name, detalle: p.detalle, ...conTope(p.texto), cuando, tardoMs: tardoElAyudante() }), id: b.id ?? `t${l.cuenta}` });
      }
    }
    return;
  }
  for (const b of ev.message.content) {
    if (b.type !== 'tool_result' || !b.tool_use_id) continue;
    const pedida = lista.find((t) => t.id === b.tool_use_id);
    if (!pedida) continue;
    // Lo que corrió la herramienta es del director: va en su propio globo, y desde ahí se mide lo que sigue del ayudante
    lista.push(turnoNuevo(l, { de: 'computador', a: 'ayudante', tipo: 'responde', herramienta: pedida.herramienta, detalle: pedida.detalle, texto: '', cuando, tardoMs: tardoDeRespuesta(instante(pedida.cuando), l.marcasDeAyudante.get(padre) ?? null, ahora), ...(b.is_error ? { error: true } : {}) }));
    if (ahora !== null) l.marcasDeAyudante.set(padre, ahora);
  }
}

/** Quién tiene el turno ahora; null si la conversación terminó y nada corre. Pura. */
export function esperaDe(l: LecturaDeTurnos): Espera | null {
  const abiertas = [...l.abiertas.values()];
  if (abiertas.length) {
    const a = abiertas.at(-1)!;
    return { quien: HERRAMIENTAS_DE_AYUDANTE.has(a.peticion.herramienta) ? 'ayudante' : 'computador', desde: a.peticion.desde ?? new Date(l.ultimo ?? 0).toISOString(), herramienta: a.peticion.herramienta, detalle: a.peticion.detalle };
  }
  if (l.ultimo === null) return null;
  if (l.termino) return l.fondo > 0 ? { quien: 'ayudante', desde: new Date(l.ultimo).toISOString() } : null;
  return { quien: 'modelo', desde: new Date(l.ultimo).toISOString() };
}

/** Lo que le llega a la página: los últimos turnos, cuántos quedaron fuera, quién espera y los tiempos de cada actor. */
export interface ConversacionDeRevision {
  turnos: Turno[];
  ayudantes: Record<string, Turno[]>;
  omitidos: number;
  espera: Espera | null;
  totales: TotalesDeTurnos;
  /** Desde cuándo corre lo que aún no está en los totales: el reloj de quien tiene el turno suma desde ahí. */
  ultimo?: string | null;
  /** Lo que Claude Code ha informado de tokens; null si no ha informado nada. */
  tokens?: TokensDeRevision | null;
  /** Lo que dibuja la avalancha; sin llamadas informadas, no viene. */
  nieve?: NieveDeRevision;
}

/** Lo que se le manda a la página en cada consulta, con su tope, para no mandarle la revisión entera cada vez. Pura. */
const TOPE_TURNOS_EN_VIVO = 300;
export function conversacionDe(l: LecturaDeTurnos, tope = TOPE_TURNOS_EN_VIVO): ConversacionDeRevision {
  const turnos = l.turnos.slice(-tope);
  const ayudantes: Record<string, Turno[]> = {};
  for (const t of turnos) if (t.ayudante && l.ayudantes[t.ayudante]) ayudantes[t.ayudante] = l.ayudantes[t.ayudante];
  return { turnos, ayudantes, omitidos: l.turnos.length - turnos.length, espera: esperaDe(l), totales: { ...l.totales }, ultimo: l.ultimo === null ? null : new Date(l.ultimo).toISOString(), tokens: tokensDeLectura(l), ...nieveDe(l) };
}
const nieveDe = (l: LecturaDeTurnos): { nieve?: NieveDeRevision } => {
  const { mensajes: _, ...nieve } = l.nieve;
  return nieve.contexto > 0 ? { nieve } : {};
};

/** Si una orden corre pruebas o tipos. Pura. */
export const esOrdenDePruebas = (orden: string | undefined): boolean => !!orden && /^\s*(npm test\b|npm run (typecheck|test)\b|npx (vitest|tsc)\b)/.test(orden);

/** Lo que tomó cada orden de pruebas, agrupado por orden, de la que más tomó a la que menos. Pura. */
export function pruebasDe(peticiones: readonly Peticion[]): { orden: string; veces: number; ms: number; fallas: number }[] {
  const porOrden = new Map<string, { orden: string; veces: number; ms: number; fallas: number }>();
  for (const p of peticiones) {
    if (!esOrdenDePruebas(p.orden)) continue;
    const g = porOrden.get(p.orden!) ?? { orden: p.orden!, veces: 0, ms: 0, fallas: 0 };
    g.veces++;
    g.ms += p.ms ?? 0;
    if (p.error) g.fallas++;
    porOrden.set(p.orden!, g);
  }
  return [...porOrden.values()].sort((a, b) => b.ms - a.ms);
}

/** La clase de una orden, sin sus argumentos: «bandeja.ts --listo», «git commit», «firmar.ts». Pura. */
export function claseDeOrden(orden: string): string {
  const palabras = orden.trim().split(/\s+/);
  if (palabras[0] === 'git') return `git ${palabras[1] ?? ''}`.trim();
  if (palabras[0] !== 'node' || !palabras[1]) return palabras[0] ?? '';
  const script = palabras[1].split(/[\\/]/).pop() ?? palabras[1];
  const modo = palabras.slice(2).find((x, i, xs) => /^--[a-z]/.test(x) && x !== '--proyecto' && xs[i - 1] !== '--proyecto');
  return modo ? `${script} ${modo}` : script;
}

const seg = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
const min = (ms: number) => `${(ms / 60_000).toFixed(1)} min`;

/**
 * El informe de un registro, en inglés como lo que lee el modelo: cuánto fue de cada actor, lo que más tomó por herramienta,
 * cada corrida de pruebas y lo que se repitió (el mismo archivo leído varias veces, la misma orden). Sale con
 * `bandeja.ts --turnos <registro>`. Pura.
 */
export function informeDeTurnos(l: LecturaDeTurnos): string[] {
  const { modeloMs, computadorMs, ayudanteMs } = l.totales;
  const salida = [`Model ${min(modeloMs)} · Computer ${min(computadorMs)} · Helpers ${min(ayudanteMs)} · ${l.turnos.length} turns, ${l.peticiones.length} tool calls.`];
  const porHerramienta = new Map<string, { veces: number; ms: number }>();
  for (const p of l.peticiones) {
    const g = porHerramienta.get(p.herramienta) ?? { veces: 0, ms: 0 };
    g.veces++;
    g.ms += p.ms ?? 0;
    porHerramienta.set(p.herramienta, g);
  }
  salida.push('By tool:', ...[...porHerramienta].sort((a, b) => b[1].ms - a[1].ms).map(([n, g]) => `- ${n}: ${g.veces} calls, ${min(g.ms)}`));
  salida.push('Tests, each run:', ...l.peticiones.filter((p) => esOrdenDePruebas(p.orden)).map((p) => `- ${p.desde?.slice(11, 19) ?? '?'} ${p.orden}: ${seg(p.ms ?? 0)}${p.error ? ' (failed)' : ''}`));
  salida.push('Tests, by command:', ...pruebasDe(l.peticiones).map((g) => `- ${g.orden}: ${g.veces} runs, ${min(g.ms)}${g.fallas ? `, ${g.fallas} failed` : ''}`));
  const repetidas = new Map<string, number>();
  for (const p of l.peticiones) {
    if (!['Read', 'Bash'].includes(p.herramienta)) continue;
    const clave = `${p.herramienta} ${p.orden ?? p.detalle}`;
    repetidas.set(clave, (repetidas.get(clave) ?? 0) + 1);
  }
  // Las demás órdenes, por su clase (la herramienta y su modo): lo que cuesta cada proceso fijo de la revisión
  const clases = new Map<string, { veces: number; ms: number }>();
  for (const p of l.peticiones) {
    if (p.herramienta !== 'Bash' || !p.orden || esOrdenDePruebas(p.orden)) continue;
    const clave = claseDeOrden(p.orden);
    const g = clases.get(clave) ?? { veces: 0, ms: 0 };
    g.veces++;
    g.ms += p.ms ?? 0;
    clases.set(clave, g);
  }
  salida.push('Other commands, by kind:', ...[...clases].sort((a, b) => b[1].ms - a[1].ms).map(([c, g]) => `- ${c}: ${g.veces} runs, ${seg(g.ms)}`));
  salida.push('Repeated (3 or more):', ...[...repetidas].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).map(([c, n]) => `- ${n}× ${enLinea(c, 120)}`));
  return salida;
}
