// Los permisos que le faltan al director en plena revisión, en el único modo de permisos del Studio (decisiones del
// titular nmwp8uot6tit, nmwp8vz8ftit, nmwp8wpaatit, nmwp6ch5utit y nmwp6dy6ntit, documento «One permission mode»; antes,
// pr_permisos_al_momento y pd_permiso_espera). Cada revisión, urgencia y aclaración corre en el modo que pregunta: lo de la
// lista corta y segura ya está dado (--allowedTools), lo que nunca se niega al instante, y todo lo demás llega aquí por el
// gancho PermissionRequest (tools/director/ganchoPermiso.ts) y pausa la revisión con el aviso hasta que la persona decide,
// sin límite de tiempo. Cuatro salidas, en una fila: «Solo esta vez» (esa llamada exacta), «Siempre, en este proyecto» y
// «Siempre, en todos los proyectos» (la regla general de ese tipo de acción, la misma del panel de permisos, que queda
// guardada) y «No lo autorizo». Lo que estuvo en pausa no cuenta para el límite de la revisión (`pausadoMs`). Si la
// revisión termina antes de la respuesta, lo que esperaba se niega y queda en el panel. Puro: sin archivos, sin
// temporizadores y con el reloj (`ahora`, en milisegundos) que le pasa quien lo use. Lo conecta el lanzador (revisor.ts ›
// lanzar) en toda revisión (estudio/servidor/modoPermisos.ts).
import { t } from '../src/textos.ts';
import { tb, type TextoBitacora } from '../../src/director/textoBitacora.ts';
import { nuncaDe, ordenesDe, ordenPermitida, reglaDe, reglaProhibida, type Negado, type Nunca, type ReglaPropuesta } from './permisosNegados.ts';

/**
 * La persona no tiene límite para responder (nmwp6ch5utit): la pregunta espera hasta que responde o hasta que termina la
 * revisión. Este es solo el tope técnico que pide el gancho de Claude Code (y su petición al Studio): un día.
 */
export const TOPE_GANCHO_MS = 24 * 60 * 60_000;
/** Cada cuánto se repite el sonido del diálogo, suave, mientras nadie lo toque. */
export const REPETIR_SONIDO_MS = 30_000;
/** Cuántas veces suena como máximo: al abrirse y a los 30, 60 y 90 segundos. */
export const MAX_AVISOS = 4;

/** Lo que el director intentó hacer y no podía: la herramienta y su entrada, igual que un negado. */
export type SolicitudDePermiso = Negado;

/** Las cuatro salidas del aviso: «Solo esta vez», «Siempre, en este proyecto», «Siempre, en todos los proyectos» y «No lo autorizo». */
export type Respuesta = 'una_vez' | 'siempre' | 'siempre_todos' | 'no';

/** Por qué se negó: lo que nunca, la persona, o la revisión terminó antes de que respondiera. */
export type MotivoDeNegar = 'nunca' | 'no_autorizado' | 'sin_respuesta';

/** El permiso general que se guarda con «Siempre»: para el proyecto que se revisa, o para todos. */
export interface PermisoParaGuardar {
  regla: string;
  alcance: 'proyecto' | 'todos';
  /** El proyecto que se revisa: con `alcance` «proyecto», el único para el que vale. */
  proyecto: string;
}

/** Lo que se decidió de una llamada: darla (y, con «Siempre», qué regla guardar) o negarla con su motivo. */
export type Decision = { permitir: true; guardar: PermisoParaGuardar | null; cadena?: true } | { permitir: false; motivo: MotivoDeNegar; nunca?: Nunca };

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
  /** La regla general que ofrecen los dos «Siempre», dicha en palabras (la del panel de permisos). */
  propuesta: ReglaPropuesta;
  /** Si los dos «Siempre» se ofrecen: hay regla y no choca con lo que nunca. */
  puedeSiempre: boolean;
  /** Si no se ofrecen, por qué, en una línea para el aviso (por ejemplo, que la orden junta varias órdenes); null si se ofrecen. */
  porQueNoSiempre: string | null;
  /** Si «Siempre» vale solo para este proyecto (subir, traer, publicar: soloEnEsteProyecto): el aviso no ofrece el de todos. */
  soloEsteProyecto?: true;
  /** De una cadena de órdenes, las que no tiene permitidas: el aviso pregunta solo por ellas (ordenesQueFaltan). */
  faltan?: string[];
  pedidoEn: number;
  decision: Decision | null;
}

/** Lo que pasó al responder: si la respuesta se aplicó o llegó tarde, y la decisión que rige. */
export interface Respondida {
  aplicada: boolean;
  decision: Decision;
}

/**
 * Subir, traer y publicar (y desplegar) solo se dan «Siempre, en este proyecto», nunca para todos (decisión del titular
 * nmwpbxbmetit, misión t_decide_subir_siempre): cada proyecto tiene su cuenta y su remoto, y un permiso de subir para todos
 * subiría también los que nadie pensó subir.
 */
const SUBE_TRAE_PUBLICA = /^Bash\((git push|git pull|npm publish|yarn publish|pnpm publish|gh release|gh pr merge|vercel|npx vercel|netlify deploy|firebase deploy|fly deploy|flyctl deploy|wrangler deploy|npx wrangler deploy)\b/i;

/** Si la regla general de una llamada solo se puede dar para el proyecto que se revisa (SUBE_TRAE_PUBLICA). Pura. */
export const soloEnEsteProyecto = (regla: string | null): boolean => !!regla && SUBE_TRAE_PUBLICA.test(regla);

/**
 * Por qué los dos «Siempre» no se ofrecen para una llamada, en una línea para el aviso (nota de voz del titular, 26 de
 * octubre de 2026: que entienda que es la orden la que viene junta). Null si se ofrecen los dos. Si solo se ofrece
 * «Siempre, en este proyecto» (subir, traer o publicar: nmwpbxbmetit), la línea dice por qué falta el de todos. Pura.
 */
export function porQueNoSiempre(solicitud: SolicitudDePermiso, propuesta: ReglaPropuesta, puedeSiempre: boolean, nunca: Nunca | null): string | null {
  if (puedeSiempre) return soloEnEsteProyecto(propuesta.regla) ? t('permiso.soloEsteProyecto') : null;
  if (nunca) return t('permiso.noSiempreNunca');
  if (propuesta.regla === null) {
    // Varias órdenes en una: cada una tiene su propio tipo de acción, y no hay uno solo que dejar permitido
    const partes = solicitud.herramienta === 'Bash' ? ordenesDe(String(solicitud.entrada.command ?? '')) : null;
    if (partes && partes.length > 1) return t('permiso.noSiempreCadena', { n: partes.length });
    return propuesta.motivo ? propuesta.motivo.replace(/^./, (c) => c.toLowerCase()) : t('permiso.noSiempreTipo');
  }
  return t('permiso.noSiempreAbarca');
}

/**
 * Las preguntas de una revisión, con su estado y su pausa. Una por lanzamiento: si el director hace varias llamadas, cada
 * una es un pedido; mientras alguno espera, la revisión está en pausa, y ese tiempo se suma en `pausadoMs`.
 */
export class EsperaDePermisos {
  private readonly proyecto: string;
  private readonly prohibidas: string[];
  private readonly casa: string;
  private readonly permitidas: readonly string[];
  private readonly pedidos = new Map<string, Pedido>();
  private contador = 0;
  /** Desde cuándo hay algo esperando (null si nada espera), y la pausa ya terminada. */
  private enPausaDesde: number | null = null;
  private pausaCerrada = 0;

  /**
   * @param proyecto el proyecto que se revisa: «Siempre, en este proyecto» vale solo para él.
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

  /**
   * El director pide un permiso. Lo que nunca se niega al instante, sin preguntar; una cadena cuyas órdenes ya tiene pasa
   * sola; lo demás queda esperando (`decision` null) hasta `responder` o hasta que la revisión termine (`cerrarTodo`).
   */
  pedir(solicitud: SolicitudDePermiso, ahora: number): Pedido {
    const nunca = nuncaDe(solicitud, this.prohibidas, this.casa);
    // La guardia que lee la orden entera: de una cadena, solo lo que no tiene; si le falta una sola orden, «Siempre»
    // ofrece la regla de esa orden
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
      ...(puedeSiempre && soloEnEsteProyecto(propuesta.regla) ? { soloEsteProyecto: true as const } : {}),
      ...(faltan?.length ? { faltan } : {}),
      pedidoEn: ahora,
      decision: null,
    };
    if (nunca) pedido.decision = { permitir: false, motivo: 'nunca', nunca };
    else if (faltan && !faltan.length) pedido.decision = { permitir: true, guardar: null, cadena: true };
    else this.enPausaDesde ??= ahora;
    this.pedidos.set(pedido.id, pedido);
    return { ...pedido };
  }

  /**
   * La respuesta de la persona. Si el pedido ya se decidió (ya se respondió, o terminó la revisión), no cambia nada:
   * `aplicada` es falso y rige lo que ya se decidió. Los dos «Siempre» sin regla que ofrecer valen como «Solo esta vez».
   * Id desconocido, null.
   */
  responder(id: string, respuesta: Respuesta, ahora: number): Respondida | null {
    const pedido = this.pedidos.get(id);
    if (!pedido) return null;
    if (pedido.decision) return { aplicada: false, decision: pedido.decision };
    const siempre = respuesta === 'siempre' || respuesta === 'siempre_todos';
    pedido.decision =
      respuesta === 'no'
        ? { permitir: false, motivo: 'no_autorizado' }
        : {
            permitir: true,
            // Subir, traer y publicar valen solo para este proyecto, aunque llegue el de todos (nmwpbxbmetit)
            guardar: siempre && pedido.puedeSiempre && pedido.propuesta.regla ? { regla: pedido.propuesta.regla, alcance: respuesta === 'siempre_todos' && !pedido.soloEsteProyecto ? 'todos' : 'proyecto', proyecto: this.proyecto } : null,
          };
    this.cerrarPausaSiNadaEspera(ahora);
    return { aplicada: true, decision: pedido.decision };
  }

  /** La revisión terminó: lo que seguía esperando se niega (la persona no llegó a decidirlo) y se devuelve. */
  cerrarTodo(ahora: number): Pedido[] {
    const negados: Pedido[] = [];
    for (const p of this.pedidos.values()) {
      if (p.decision) continue;
      p.decision = { permitir: false, motivo: 'sin_respuesta' };
      negados.push({ ...p });
    }
    this.cerrarPausaSiNadaEspera(ahora);
    return negados;
  }

  /** Si algo espera a la persona: la revisión está en pausa. */
  get enPausa(): boolean {
    return this.enPausaDesde !== null;
  }

  /** Cuánto lleva en pausa esta revisión, en total, hasta `ahora` (nmwp6dy6ntit: ese tiempo no cuenta para su límite). */
  pausadoMs(ahora: number): number {
    return this.pausaCerrada + (this.enPausaDesde === null ? 0 : Math.max(0, ahora - this.enPausaDesde));
  }

  private cerrarPausaSiNadaEspera(ahora: number): void {
    if (this.enPausaDesde === null || [...this.pedidos.values()].some((p) => !p.decision)) return;
    this.pausaCerrada += Math.max(0, ahora - this.enPausaDesde);
    this.enPausaDesde = null;
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
   * Lo que se negó sin que la persona lo decidiera (la revisión terminó antes): sigue pendiente en «Modelo y consumo» ›
   * «Permisos», y la revisión lo dice. Lo que nunca y lo que la persona negó no entran: ya se decidieron.
   */
  quedanParaElPanel(): Pedido[] {
    return [...this.pedidos.values()].filter((p) => p.decision && !p.decision.permitir && p.decision.motivo === 'sin_respuesta').map((p) => ({ ...p }));
  }
}

/**
 * Lo que queda escrito en el registro de la revisión de cada permiso que se negó sin que la persona lo decidiera: una
 * línea con la forma del aviso de Claude Code (`system` › `permission_denied`) más la entrada de lo que intentó, que es lo
 * que lee el panel de permisos (permisosNegados.ts › negadosDe) y lo que se ve en vivo (director.ts › negadosEnVivo). Lleva
 * un salto de línea antes, por si el registro quedó a medias, y otro después. Pura.
 */
export function lineasDeNegadosSinDecidir(pedidos: readonly Pedido[]): string[] {
  return pedidos.map((p) => `\n${JSON.stringify({ type: 'system', subtype: 'permission_denied', origen: 'studio', motivo: p.decision && !p.decision.permitir ? p.decision.motivo : undefined, tool_name: p.solicitud.herramienta, tool_input: p.solicitud.entrada })}\n`);
}

/** Las cuatro respuestas que acepta el servidor del aviso, en el orden en que se ofrecen. */
export const RESPUESTAS: readonly Respuesta[] = ['una_vez', 'siempre', 'siempre_todos', 'no'];

/** De lo que manda el aviso, la respuesta que vale; null si no es una de las cuatro. Pura. */
export const respuestaValida = (valor: unknown): Respuesta | null => RESPUESTAS.find((r) => r === valor) ?? null;

/** Lo que la bitácora de este computador dice de una respuesta de la persona en el aviso, con `que` lo que pedía. Pura. */
export function queAnotarDeLaRespuesta(d: Decision, que: string): TextoBitacora {
  if (!d.permitir) return tb('bitacora.permiso.noAutoriza', { que });
  if (d.guardar) return tb(d.guardar.alcance === 'todos' ? 'bitacora.permiso.siempreTodos' : 'bitacora.permiso.siempre', { regla: d.guardar.regla });
  return tb('bitacora.permiso.estaVez', { que });
}

/** Lo que la bitácora dice de cada llamada del director que pasó por el gancho: qué herramienta pidió, si se le dio, y de dónde vino. */
export function queAnotarDeLaLlamada(herramienta: string, dado: boolean, decision: Decision | null): { que: TextoBitacora; desde: TextoBitacora } {
  const porCadena = decision?.permitir && decision.cadena;
  return {
    que: tb('bitacora.permiso.llamada', { herramienta, resultado: tb(dado ? 'bitacora.permiso.seLeDa' : 'bitacora.permiso.seLeNiega'), porque: porCadena ? tb('bitacora.permiso.porCadena') : '' }),
    desde: tb('bitacora.desde.gancho'),
  };
}

/** Lo que imprime el gancho PermissionRequest (la forma que usa tools/probarPermisos.ts): dar el permiso, o negarlo con el porqué. */
export interface RespuestaDelGancho {
  hookSpecificOutput: {
    hookEventName: 'PermissionRequest';
    decision: { behavior: 'allow' } | { behavior: 'deny'; message: string };
  };
}

/** Lo que se le dice al director cuando se le niega: sigue sin ello y dice en su respuesta qué le faltó. */
const SIGUE_SIN_ELLO = 'Go on with the rest without it, and say in your answer what you could not do and which permission was missing';

/** El mensaje que lee el director al negarle algo, según por qué (texto para el modelo: en inglés). */
function mensajeDeNegar(d: Extract<Decision, { permitir: false }>): string {
  switch (d.motivo) {
    case 'nunca':
      return `The Studio never allows this${d.nunca ? `: ${d.nunca.porque} ${d.nunca.enSuLugar}` : '.'} ${SIGUE_SIN_ELLO}.`;
    case 'no_autorizado':
      return `The person did not authorize it. ${SIGUE_SIN_ELLO}.`;
    case 'sin_respuesta':
      return `The review ended before the person answered. ${SIGUE_SIN_ELLO}.`;
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
 * Los instantes en que suena el aviso, desde que se abre (`desde`): al abrirse y cada 30 segundos, como mucho 4 veces. En
 * cuanto la persona toca el aviso (`tocado`), no suena más. El aviso sigue abierto después, sin sonar, hasta que responda.
 */
export function avisosDelSonido(desde: number, tocado?: number | null): number[] {
  const instantes: number[] = [];
  for (let i = 0; i < MAX_AVISOS; i++) {
    const t = desde + i * REPETIR_SONIDO_MS;
    if (tocado != null && t >= tocado) break;
    instantes.push(t);
  }
  return instantes;
}
