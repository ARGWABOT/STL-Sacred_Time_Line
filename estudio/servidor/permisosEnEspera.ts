// Las preguntas de permiso de las revisiones en marcha, mientras esperan a la persona (propuesta aceptada
// pr_permisos_al_momento, su pieza 3; pedido pd_permiso_espera). El gancho PermissionRequest del director
// (tools/director/ganchoPermiso.ts) le pasa al servidor la llamada que pide permiso y espera la respuesta; aquí esa llamada
// se vuelve una promesa que se cumple cuando la persona responde en el diálogo o cuando vencen sus dos minutos. La lógica
// de qué se decide es la de permisoAlMomento.ts; esto solo la ata al tiempo y a cada revisión, con un reloj que se puede
// cambiar en las pruebas. Una revisión solo pregunta si el lanzador la abrió con su clave: una clave desconocida no
// pregunta, y el gancho niega. Lo abre el lanzador (revisor.ts › lanzar) en el modo «Me pregunta en el Studio» y lo cierra
// cuando el director termina, de la forma que sea (estudio/servidor/modoPermisos.ts). La clave es la de un lanzamiento
// (un UUID nuevo por cada director que lanza el Studio): «Permitir todo en esta revisión» vive en la espera de esa clave y
// se olvida al cerrarla; otra clave, aunque sea del mismo proyecto, vuelve a preguntar.
import { EsperaDePermisos, respuestaDelGancho, solicitudDelGancho, type Decision, type Pedido, type RespuestaDelGancho, type Respondida, type Respuesta, type SolicitudDePermiso } from './permisoAlMomento';

/** El reloj y los temporizadores: los reales, o los de una prueba. `esperar` devuelve con qué cancelarlo. */
export interface Reloj {
  ahora(): number;
  esperar(ms: number, fn: () => void): () => void;
}

const RELOJ_REAL: Reloj = {
  ahora: () => Date.now(),
  esperar: (ms, fn) => {
    const t = setTimeout(fn, Math.max(0, ms));
    return () => clearTimeout(t);
  },
};

/** Un pedido que espera a la persona, con la revisión y el proyecto de donde viene: lo que muestra el diálogo. */
export interface PedidoEnEspera extends Pedido {
  clave: string;
  proyecto: string;
}

interface Revision {
  proyecto: string;
  espera: EsperaDePermisos;
  /** Quien espera cada pedido (el gancho, del otro lado de la petición) y con qué se cancela su temporizador. */
  esperando: Map<string, { cumplir: (d: Decision) => void; cancelar: () => void }>;
}

/** Lo que el gancho no deja pasar cuando no hay revisión que pregunte: la clave no es de una revisión abierta. */
const SIN_REVISION: Decision = { permitir: false, motivo: 'sin_respuesta' };

export class PermisosEnEspera {
  private readonly revisiones = new Map<string, Revision>();
  private readonly reloj: Reloj;

  constructor(reloj: Reloj = RELOJ_REAL) {
    this.reloj = reloj;
  }

  /**
   * El lanzador abre una revisión que puede preguntar: desde ahí, el gancho que lleva su clave pregunta en el Studio.
   * @param prohibidas lo que el lanzador le niega a ese proyecto (lo que nunca se pregunta).
   * @param casa la carpeta personal, para decir si una regla abarca demasiado.
   * @param permitidas lo que el lanzador le da en esa revisión: de una cadena de órdenes, lo que ya tiene no se pregunta.
   */
  abrir(clave: string, proyecto: string, prohibidas: string[], casa: string, permitidas: readonly string[] = []): void {
    if (this.revisiones.has(clave)) return;
    this.revisiones.set(clave, { proyecto, espera: new EsperaDePermisos(proyecto, prohibidas, casa, permitidas), esperando: new Map() });
  }

  /** Si hay una revisión abierta con esa clave. */
  abierta(clave: string): boolean {
    return this.revisiones.has(clave);
  }

  /** El proyecto de la revisión abierta con esa clave, o null. */
  proyectoDe(clave: string): string | null {
    return this.revisiones.get(clave)?.proyecto ?? null;
  }

  /**
   * La revisión terminó: lo que seguía esperando se niega sin respuesta y la revisión deja de preguntar. Devuelve lo que
   * queda pendiente en el panel de permisos (lo que la persona no decidió), para que la revisión lo diga.
   */
  cerrar(clave: string): Pedido[] {
    const r = this.revisiones.get(clave);
    if (!r) return [];
    for (const [id, quien] of r.esperando) {
      quien.cancelar();
      quien.cumplir({ permitir: false, motivo: 'sin_respuesta' });
      r.esperando.delete(id);
    }
    // Lo que se negó al cerrar cuenta como sin respuesta: se vence todo de una vez
    r.espera.vencer(Number.MAX_SAFE_INTEGER);
    this.revisiones.delete(clave);
    return r.espera.quedanParaElPanel();
  }

  /**
   * El gancho pregunta. La promesa se cumple con la decisión: al instante si es de lo que nunca o la persona ya no está, y
   * si no, cuando responda o cuando venzan los dos minutos. Con una clave que no es de una revisión abierta, se niega.
   */
  pedir(clave: string, solicitud: SolicitudDePermiso): Promise<Decision> {
    const r = this.revisiones.get(clave);
    if (!r) return Promise.resolve(SIN_REVISION);
    const pedido = r.espera.pedir(solicitud, this.reloj.ahora());
    // Pedir puede vencer otros (y dar por ausente a la persona): sus ganchos se enteran ya
    this.entregar(r);
    if (pedido.decision) return Promise.resolve(pedido.decision);
    return new Promise<Decision>((cumplir) => {
      const cancelar = this.reloj.esperar(pedido.venceEn - this.reloj.ahora(), () => {
        r.espera.vencer(this.reloj.ahora());
        this.entregar(r);
      });
      r.esperando.set(pedido.id, { cumplir, cancelar });
    });
  }

  /** La persona responde desde el diálogo. Null si la revisión o el pedido no existen. */
  responder(clave: string, id: string, respuesta: Respuesta): Respondida | null {
    const r = this.revisiones.get(clave);
    if (!r) return null;
    const respondida = r.espera.responder(id, respuesta, this.reloj.ahora());
    this.entregar(r);
    return respondida;
  }

  /** Lo que espera a la persona en todas las revisiones abiertas, en el orden en que se pidió: lo que muestra el diálogo. */
  pendientes(): PedidoEnEspera[] {
    const ahora = this.reloj.ahora();
    const todos: PedidoEnEspera[] = [];
    for (const [clave, r] of this.revisiones) {
      r.espera.vencer(ahora);
      this.entregar(r);
      for (const p of r.espera.pendientes()) todos.push({ ...p, clave, proyecto: r.proyecto });
    }
    return todos.sort((a, b) => a.pedidoEn - b.pedidoEn);
  }

  /** A cada gancho que espera un pedido ya decidido, su decisión. */
  private entregar(r: Revision): void {
    for (const [id, quien] of r.esperando) {
      const decision = r.espera.decisionDe(id);
      if (!decision) continue;
      quien.cancelar();
      r.esperando.delete(id);
      quien.cumplir(decision);
    }
  }
}

/**
 * Lo que el servidor le contesta al gancho: de lo que Claude Code le pasó (su entrada estándar, tal cual), la respuesta que
 * imprime. Null si no es un PermissionRequest: el gancho no imprime nada y Claude Code sigue como siempre.
 */
export async function contestarAlGancho(espera: PermisosEnEspera, clave: string, entrada: unknown): Promise<RespuestaDelGancho | null> {
  return (await decidirParaElGancho(espera, clave, entrada))?.respuesta ?? null;
}

/**
 * Lo mismo que `contestarAlGancho`, con la decisión que la originó (null si la clave no es de una revisión abierta): así
 * quien anota en la bitácora puede decir que la llamada pasó por «Permitir todo en esta revisión» (`decision.todo`).
 */
export async function decidirParaElGancho(espera: PermisosEnEspera, clave: string, entrada: unknown): Promise<{ respuesta: RespuestaDelGancho; decision: Decision | null } | null> {
  const solicitud = solicitudDelGancho(entrada);
  if (!solicitud) return null;
  if (!espera.abierta(clave)) return { respuesta: negarAlGancho(SIN_REVISION_MENSAJE), decision: null };
  const decision = await espera.pedir(clave, solicitud);
  return { respuesta: respuestaDelGancho(decision), decision };
}

/** Lo que lee el director si su revisión no puede preguntar en el Studio (la clave no es de una revisión abierta). */
export const SIN_REVISION_MENSAJE = 'Esta revisión no puede preguntar en el Studio. Sigue con lo demás sin hacerlo y dilo en tu respuesta.';

/** El gancho niega con su porqué, sin pasar por una espera: lo mismo que imprime tools/director/ganchoPermiso.ts si el Studio no responde. */
function negarAlGancho(mensaje: string): RespuestaDelGancho {
  return { hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'deny', message: mensaje } } };
}

/** Las preguntas de las revisiones de este servidor: una sola espera para el gancho, el diálogo y el lanzador. */
export const permisosEnEspera = new PermisosEnEspera();
