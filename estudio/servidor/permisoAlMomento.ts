// «Me pregunta en el Studio»: la lógica de los permisos que le faltan al director en plena revisión (propuesta aceptada
// pr_permisos_al_momento, su pieza 2; pedido pd_permiso_espera; decisión del titular del 26 de octubre de 2026). Cuando
// el director lanzado necesita un permiso que no tiene, Claude Code corre el gancho PermissionRequest (solo en el modo
// default: lo midió tools/probarPermisos.ts), y el Studio espera a la persona hasta dos minutos con tres salidas: «Solo
// esta vez» (esa llamada exacta), «Permitir siempre» (la regla general de ese tipo de acción, la misma que ofrece el
// panel de permisos, solo para el proyecto que se revisa) o «No lo autorizo». Sin respuesta a tiempo se niega y el permiso
// queda pendiente en el panel; si la primera pregunta de una revisión no se responde, la persona no está, y el resto se
// niega al instante. Lo que el Studio nunca permite se niega sin preguntar. Y una cuarta salida, «Permitir todo en esta
// revisión» (nota de voz del titular, 26 de octubre de 2026: tuvo que dar muchos clics en su primera revisión con el
// diálogo): deja pasar esa llamada y, hasta que termine esa revisión, todo lo que el director pida, sin diálogo, salvo lo
// que nunca, que se sigue negando al instante. No guarda ninguna regla: vive en la espera de esa revisión (la de un
// lanzamiento), que se cierra al terminar el director, y con ella se olvida. Puro: sin archivos, sin temporizadores y con
// el reloj (`ahora`, en milisegundos) que le pasa quien lo use. Lo conecta el lanzador (revisor.ts › lanzar) cuando el
// titular elige «Me pregunta en el Studio» (estudio/servidor/modoPermisos.ts); sin esa elección, el director sigue en dontAsk.
import { nuncaDe, ordenesDe, ordenPermitida, reglaDe, reglaProhibida, type Negado, type Nunca, type ReglaPropuesta } from './permisosNegados.ts';

/** Cuánto espera el Studio a la persona antes de negar: dos minutos (decisión del titular). */
export const ESPERA_PERMISO_MS = 120_000;
/** Cada cuánto se repite el sonido del diálogo, suave, mientras nadie lo toque. */
export const REPETIR_SONIDO_MS = 30_000;
/** Cuántas veces suena como máximo: al abrirse y a los 30, 60 y 90 segundos. */
export const MAX_AVISOS = 4;

/** Lo que el director intentó hacer y no podía: la herramienta y su entrada, igual que un negado. */
export type SolicitudDePermiso = Negado;

/** Lo que responde la persona en el diálogo: «Solo esta vez», «Permitir siempre», «Permitir todo en esta revisión» o «No lo autorizo». */
export type Respuesta = 'una_vez' | 'siempre' | 'todo' | 'no';

/** Por qué se negó: lo que nunca, la persona, dos minutos sin respuesta, o la persona no estaba desde la primera pregunta. */
export type MotivoDeNegar = 'nunca' | 'no_autorizado' | 'sin_respuesta' | 'ausente';

/** El permiso general que el caller guarda con «Permitir siempre»: solo para el proyecto que se revisa. */
export interface PermisoParaGuardar {
  regla: string;
  proyecto: string;
  alcance: 'proyecto';
}

/**
 * Si una llamada se dio por «Permitir todo en esta revisión»: `elegido` es la que la persona respondió con ese botón, y
 * `automatico` la que pasó sola porque ya lo había elegido (o esperaba en el diálogo cuando lo eligió).
 */
export type PorTodo = 'elegido' | 'automatico';

/**
 * Lo que se decidió de una llamada: darla (y, con «Permitir siempre», qué regla guardar; con «Permitir todo en esta
 * revisión», `todo`, sin regla que guardar) o negarla con su motivo.
 */
export type Decision = { permitir: true; guardar: PermisoParaGuardar | null; todo?: PorTodo; cadena?: true } | { permitir: false; motivo: MotivoDeNegar; nunca?: Nunca };

/**
 * La guardia que lee la orden entera (decisión del titular del 26 de octubre de 2026, misión «Decide qué pasa con las
 * órdenes encadenadas», pieza de «Los permisos, al momento»): de una cadena de órdenes, las que el director no tiene
 * permitidas. Vacía: pasa sola, sin preguntar. Null si no es una cadena (una orden sola, otra herramienta, o una que no se
 * puede separar sin cambiar lo que hace, con redirecciones o sustituciones) o si no tiene permitida ninguna de sus
 * órdenes: entonces se pregunta entera, como siempre. Pura.
 */
export function ordenesQueFaltan(solicitud: SolicitudDePermiso, permitidas: readonly string[]): string[] | null {
  if (solicitud.herramienta !== 'Bash') return null;
  const partes = ordenesDe(String(solicitud.entrada.command ?? ''));
  if (!partes || partes.length < 2) return null;
  const faltan = partes.filter((p) => !ordenPermitida(p, permitidas));
  return faltan.length < partes.length ? faltan : null;
}

/** Una llamada que el director pidió permiso para hacer, y lo que pasó con ella. `decision` es null mientras se espera. */
export interface Pedido {
  id: string;
  solicitud: SolicitudDePermiso;
  /** La regla general que ofrece «Permitir siempre», dicha en palabras (la del panel de permisos). */
  propuesta: ReglaPropuesta;
  /** Si «Permitir siempre» se ofrece: hay regla y no choca con lo que nunca. */
  puedeSiempre: boolean;
  /** Si no se ofrece, por qué, en una línea para el diálogo (por ejemplo, que la orden junta varias órdenes); null si se ofrece. */
  porQueNoSiempre: string | null;
  /** De una cadena de órdenes, las que no tiene permitidas: el diálogo pregunta solo por ellas (ordenesQueFaltan). */
  faltan?: string[];
  pedidoEn: number;
  venceEn: number;
  decision: Decision | null;
}

/** Lo que pasó al responder: si la respuesta se aplicó o llegó tarde, y la decisión que rige. */
export interface Respondida {
  aplicada: boolean;
  decision: Decision;
}

/**
 * Por qué «Permitir siempre» no se ofrece para una llamada, en una línea para el diálogo (nota de voz del titular, 26 de
 * octubre de 2026: que entienda que es la orden la que viene junta). Null si se ofrece. Pura.
 */
export function porQueNoSiempre(solicitud: SolicitudDePermiso, propuesta: ReglaPropuesta, puedeSiempre: boolean, nunca: Nunca | null): string | null {
  if (puedeSiempre) return null;
  if (nunca) return 'es de lo que el Studio nunca permite.';
  if (propuesta.regla === null) {
    // Varias órdenes en una: cada una tiene su propio tipo de acción, y no hay uno solo que dejar permitido
    const partes = solicitud.herramienta === 'Bash' ? ordenesDe(String(solicitud.entrada.command ?? '')) : null;
    if (partes && partes.length > 1) return `la orden junta ${partes.length} órdenes en una sola, cada una de su propio tipo, y no hay un solo tipo de acción que dejar permitido.`;
    return (propuesta.motivo ?? 'no hay un solo tipo de acción que dejar permitido.').replace(/^./, (c) => c.toLowerCase());
  }
  return 'ese tipo de acción dejaría pasar también algo que el Studio nunca permite.';
}

/**
 * Las preguntas de una revisión, con su estado. Una por revisión: si el director hace varias llamadas, cada una es un
 * pedido, y de si la primera que se pregunta se responde depende que se siga preguntando. Y, si la persona elige
 * «Permitir todo en esta revisión», lo demás de esa misma revisión pasa solo: la espera es de un lanzamiento, así que al
 * cerrarse (PermisosEnEspera › cerrar) se olvida, y la de otro lanzamiento o de otro proyecto vuelve a preguntar.
 */
export class EsperaDePermisos {
  private readonly proyecto: string;
  private readonly prohibidas: string[];
  private readonly casa: string;
  private readonly permitidas: readonly string[];
  private readonly pedidos = new Map<string, Pedido>();
  private contador = 0;
  /** La primera llamada que se preguntó de verdad: las de lo que nunca se niegan sin preguntar y no cuentan. */
  private primera: string | null = null;
  private respondio = false;
  private lejos = false;
  /** Si la persona eligió «Permitir todo en esta revisión»: vale solo para esta espera, no se guarda en ningún archivo. */
  private todo = false;

  /**
   * @param proyecto el proyecto que se revisa: «Permitir siempre» vale solo para él.
   * @param prohibidas lo que el lanzador le niega a ese proyecto (revisor.ts › negado, SIN_ESPERAS y NUNCA_SIEMPRE).
   * @param casa la carpeta personal, para decir si una regla abarca demasiado.
   * @param permitidas lo que el lanzador le da en esa revisión (--allowedTools): de una cadena, lo que ya tiene no se pregunta.
   */
  constructor(proyecto: string, prohibidas: string[], casa: string, permitidas: readonly string[] = []) {
    this.proyecto = proyecto;
    this.prohibidas = prohibidas;
    this.casa = casa;
    this.permitidas = permitidas;
  }

  /** Si se dio por hecho que la persona no está: la primera pregunta se quedó sin respuesta, y ya no se pregunta más. */
  get ausente(): boolean {
    return this.lejos;
  }

  /** Si la persona eligió «Permitir todo en esta revisión»: desde ahí, lo que no es de lo que nunca pasa sin preguntar. */
  get todoPermitido(): boolean {
    return this.todo;
  }

  /**
   * El director pide un permiso. Lo que nunca se niega al instante, sin preguntar (también con «Permitir todo en esta
   * revisión» encendido); con ese botón ya elegido, lo demás pasa solo; con la persona ausente se niega; lo demás queda
   * esperando (`decision` null) hasta `responder` o hasta que `vencer` lo niegue.
   */
  pedir(solicitud: SolicitudDePermiso, ahora: number): Pedido {
    this.vencer(ahora);
    const nunca = nuncaDe(solicitud, this.prohibidas, this.casa);
    // La guardia que lee la orden entera: de una cadena, solo lo que no tiene; si le falta una sola orden, «Permitir
    // siempre» ofrece la regla de esa orden
    const faltan = nunca ? null : ordenesQueFaltan(solicitud, this.permitidas);
    const sola = faltan?.length === 1 ? { herramienta: 'Bash', entrada: { command: faltan[0] } } : solicitud;
    const propuesta = reglaDe(sola, this.casa);
    const puedeSiempre = !nunca && propuesta.regla !== null && !reglaProhibida(propuesta.regla, this.prohibidas, this.casa);
    const pedido: Pedido = {
      id: `p${++this.contador}`,
      solicitud,
      propuesta,
      puedeSiempre,
      porQueNoSiempre: porQueNoSiempre(sola, propuesta, puedeSiempre, nunca),
      ...(faltan?.length ? { faltan } : {}),
      pedidoEn: ahora,
      venceEn: ahora + ESPERA_PERMISO_MS,
      decision: null,
    };
    if (nunca) pedido.decision = { permitir: false, motivo: 'nunca', nunca };
    else if (faltan && !faltan.length) pedido.decision = { permitir: true, guardar: null, cadena: true };
    else if (this.todo) pedido.decision = { permitir: true, guardar: null, todo: 'automatico' };
    else if (this.lejos) pedido.decision = { permitir: false, motivo: 'ausente' };
    else this.primera ??= pedido.id;
    this.pedidos.set(pedido.id, pedido);
    return { ...pedido };
  }

  /**
   * La respuesta de la persona. Si el pedido ya se decidió (venció, o ya se respondió), no cambia nada: `aplicada` es falso
   * y rige lo que ya se decidió. «Permitir siempre» sin regla que ofrecer vale como «Solo esta vez». «Permitir todo en esta
   * revisión» da esta llamada, deja pasar también lo que ya esperaba y lo que pida el director hasta que termine la
   * revisión, y no guarda ninguna regla. Id desconocido, null.
   */
  responder(id: string, respuesta: Respuesta, ahora: number): Respondida | null {
    this.vencer(ahora);
    const pedido = this.pedidos.get(id);
    if (!pedido) return null;
    if (pedido.decision) return { aplicada: false, decision: pedido.decision };
    this.respondio = true;
    if (respuesta === 'todo') {
      this.todo = true;
      pedido.decision = { permitir: true, guardar: null, todo: 'elegido' };
      // Lo que ya esperaba en el diálogo, de esta misma revisión, pasa con ella (lo que nunca no espera: se negó al pedirse)
      for (const otro of this.pedidos.values()) if (!otro.decision) otro.decision = { permitir: true, guardar: null, todo: 'automatico' };
      return { aplicada: true, decision: pedido.decision };
    }
    pedido.decision =
      respuesta === 'no'
        ? { permitir: false, motivo: 'no_autorizado' }
        : { permitir: true, guardar: respuesta === 'siempre' && pedido.puedeSiempre && pedido.propuesta.regla ? { regla: pedido.propuesta.regla, proyecto: this.proyecto, alcance: 'proyecto' } : null };
    return { aplicada: true, decision: pedido.decision };
  }

  /**
   * Niega lo que pasó de los dos minutos sin respuesta y devuelve lo que acaba de negar. Si entre ellos está la primera
   * pregunta de la revisión y la persona no respondió ninguna, se da por ausente: lo que siga esperando se niega ya.
   */
  vencer(ahora: number): Pedido[] {
    const negados: Pedido[] = [];
    for (const p of this.pedidos.values()) {
      if (p.decision || ahora < p.venceEn) continue;
      p.decision = { permitir: false, motivo: 'sin_respuesta' };
      negados.push(p);
      if (p.id === this.primera && !this.respondio) this.lejos = true;
    }
    if (this.lejos)
      for (const p of this.pedidos.values()) {
        if (p.decision) continue;
        p.decision = { permitir: false, motivo: 'ausente' };
        negados.push(p);
      }
    return negados.map((p) => ({ ...p }));
  }

  /** Lo que sigue esperando a la persona, en el orden en que se pidió. */
  pendientes(): Pedido[] {
    return [...this.pedidos.values()].filter((p) => !p.decision).map((p) => ({ ...p }));
  }

  /** La decisión de un pedido, o null si aún espera o no existe. */
  decisionDe(id: string): Decision | null {
    return this.pedidos.get(id)?.decision ?? null;
  }

  /**
   * Lo que se negó sin que la persona lo decidiera (no respondió, o no estaba): sigue pendiente en «Modelo y consumo» ›
   * «Permisos», y la revisión lo dice. Lo que nunca y lo que la persona negó no entran: ya se decidieron.
   */
  quedanParaElPanel(): Pedido[] {
    return [...this.pedidos.values()]
      .filter((p) => p.decision && !p.decision.permitir && (p.decision.motivo === 'sin_respuesta' || p.decision.motivo === 'ausente'))
      .map((p) => ({ ...p }));
  }
}

/**
 * Lo que queda escrito en el registro de la revisión de cada permiso que se negó sin que la persona lo decidiera (no
 * respondió, o no estaba): una línea con la forma del aviso de Claude Code (`system` › `permission_denied`) más la entrada
 * de lo que intentó, que es lo que lee el panel de permisos (permisosNegados.ts › negadosDe) y lo que se ve en vivo
 * (director.ts › negadosEnVivo). Así el permiso queda pendiente en «Modelo y consumo» › «Permisos» aunque Claude Code no
 * cuente en su resultado lo que negó un gancho. Lleva un salto de línea antes, por si el registro quedó a medias, y otro
 * después. Pura.
 */
export function lineasDeNegadosSinDecidir(pedidos: readonly Pedido[]): string[] {
  return pedidos.map((p) => `\n${JSON.stringify({ type: 'system', subtype: 'permission_denied', origen: 'studio', motivo: p.decision && !p.decision.permitir ? p.decision.motivo : undefined, tool_name: p.solicitud.herramienta, tool_input: p.solicitud.entrada })}\n`);
}

/** Las cuatro respuestas que acepta el servidor del diálogo, en el orden en que se ofrecen. */
export const RESPUESTAS: readonly Respuesta[] = ['no', 'siempre', 'todo', 'una_vez'];

/** De lo que manda el diálogo, la respuesta que vale; null si no es una de las cuatro. Pura. */
export const respuestaValida = (valor: unknown): Respuesta | null => RESPUESTAS.find((r) => r === valor) ?? null;

/**
 * Lo que la bitácora de este computador dice de una respuesta de la persona en el diálogo (qué le autorizó al director o
 * no), con `que` lo que pedía. Con «Permitir todo en esta revisión», que no guarda ninguna regla, lo dice. Pura.
 */
export function queAnotarDeLaRespuesta(d: Decision, que: string): string {
  if (!d.permitir) return `no le autoriza al director «${que}»`;
  if (d.todo) return `le autoriza al director, con «Permitir todo en esta revisión», todo lo que pida hasta que termine esta revisión, salvo lo que el Studio nunca permite, y no guarda ninguna regla (empezó con «${que}»)`;
  if (d.guardar) return `le autoriza siempre al director «${d.guardar.regla}» en este proyecto`;
  return `le autoriza al director, solo esta vez, «${que}»`;
}

/**
 * Lo que la bitácora dice de cada llamada del director que pasó por el gancho: qué herramienta pidió y si se le dio, y de
 * dónde vino. Una llamada dada por «Permitir todo en esta revisión» lo dice, para que se sepa por qué pasó sin preguntar.
 */
export function queAnotarDeLaLlamada(herramienta: string, dado: boolean, decision: Decision | null): { que: string; desde: string } {
  const porTodo = decision?.permitir && decision.todo;
  const porCadena = decision?.permitir && decision.cadena;
  return {
    que: `pide un permiso en plena revisión (${herramienta}) y ${dado ? 'se le da' : 'se le niega'}${porTodo ? ', por «Permitir todo en esta revisión»' : porCadena ? ', porque cada orden de la cadena ya la tenía permitida' : ''}`,
    desde: porTodo === 'automatico' ? 'el gancho de permisos de Claude Code, con «Permitir todo en esta revisión» ya elegido en esta revisión' : 'el gancho de permisos de Claude Code',
  };
}

/** Lo que imprime el gancho PermissionRequest (la forma que usa tools/probarPermisos.ts): dar el permiso, o negarlo con el porqué. */
export interface RespuestaDelGancho {
  hookSpecificOutput: {
    hookEventName: 'PermissionRequest';
    decision: { behavior: 'allow' } | { behavior: 'deny'; message: string };
  };
}

/** Lo que se le dice al director cuando se le niega: sigue sin ello, lo dice en su respuesta y el permiso queda en el panel. */
const SIGUE_SIN_ELLO = 'Sigue con lo demás sin hacerlo y dilo en tu respuesta';
const QUEDA_EN_EL_PANEL = 'el permiso queda pendiente en «Modelo y consumo» › «Permisos»';

/** El mensaje que lee el director al negarle algo, según por qué: qué hacer, y dónde queda el permiso. */
function mensajeDeNegar(d: Extract<Decision, { permitir: false }>): string {
  switch (d.motivo) {
    case 'nunca':
      return `El Studio nunca permite esto${d.nunca ? `: ${d.nunca.porque} ${d.nunca.enSuLugar}` : '.'} ${SIGUE_SIN_ELLO}.`;
    case 'no_autorizado':
      return `La persona no lo autorizó. ${SIGUE_SIN_ELLO}; ${QUEDA_EN_EL_PANEL}, por si lo autoriza después.`;
    case 'sin_respuesta':
      return `La persona no respondió en ${ESPERA_PERMISO_MS / 60_000} minutos. ${SIGUE_SIN_ELLO}; ${QUEDA_EN_EL_PANEL}.`;
    case 'ausente':
      return `La persona no respondió a la primera pregunta de esta revisión, así que el Studio no pregunta más en ella. ${SIGUE_SIN_ELLO}; ${QUEDA_EN_EL_PANEL}.`;
  }
}

/** El JSON exacto que el gancho imprime para una decisión. */
export function respuestaDelGancho(decision: Decision): RespuestaDelGancho {
  return {
    hookSpecificOutput: {
      hookEventName: 'PermissionRequest',
      decision: decision.permitir ? { behavior: 'allow' } : { behavior: 'deny', message: mensajeDeNegar(decision) },
    },
  };
}

/** De lo que Claude Code le da al gancho por la entrada estándar, la llamada que pide permiso; null si no es un PermissionRequest. */
export function solicitudDelGancho(entrada: unknown): SolicitudDePermiso | null {
  const e = entrada as { hook_event_name?: unknown; tool_name?: unknown; tool_input?: unknown } | null;
  if (!e || e.hook_event_name !== 'PermissionRequest' || typeof e.tool_name !== 'string' || !e.tool_name) return null;
  return { herramienta: e.tool_name, entrada: e.tool_input && typeof e.tool_input === 'object' ? (e.tool_input as Record<string, unknown>) : {} };
}

/**
 * Los instantes en que suena el diálogo, desde que se abre (`desde`): al abrirse y cada 30 segundos, como mucho 4 veces y
 * nunca pasados los 2 minutos. En cuanto la persona toca el diálogo (`tocado`), no suena más.
 */
export function avisosDelSonido(desde: number, tocado?: number | null): number[] {
  const instantes: number[] = [];
  for (let i = 0; i < MAX_AVISOS; i++) {
    const t = desde + i * REPETIR_SONIDO_MS;
    if (t >= desde + ESPERA_PERMISO_MS || (tocado != null && t >= tocado)) break;
    instantes.push(t);
  }
  return instantes;
}
