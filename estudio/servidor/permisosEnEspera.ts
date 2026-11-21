// Las preguntas de permiso de las revisiones en marcha, mientras esperan a la persona (el único modo de permisos,
// documento «One permission mode»; antes pr_permisos_al_momento y pd_permiso_espera). El gancho PermissionRequest del
// director (tools/director/ganchoPermiso.ts) le pasa al servidor la llamada que pide permiso y espera la respuesta; aquí
// esa llamada se vuelve una promesa que se cumple cuando la persona responde en el aviso o cuando la revisión termina:
// sin límite de tiempo (nmwp6ch5utit). Mientras algo espera, la revisión está en pausa, y ese tiempo no cuenta para su
// límite (nmwp6dy6ntit; `pausadoMs` y `correrPorPausa`, que usa el lanzador). La lógica de qué se decide es la de
// permisoAlMomento.ts; esto solo la ata a cada revisión, con un reloj que se puede cambiar en las pruebas. Una revisión
// solo pregunta si el lanzador la abrió con su clave (un UUID por lanzamiento): una clave desconocida no pregunta, y el
// gancho niega. Lo abre el lanzador (revisor.ts › lanzar) y lo cierra cuando el director termina, de la forma que sea.
import { EsperaDePermisos, respuestaDelGancho, solicitudDelGancho, type Decision, type Pedido, type RespuestaDelGancho, type Respondida, type Respuesta, type SolicitudDePermiso } from './permisoAlMomento.ts';

/** El reloj: el real, o el de una prueba. */
export interface Reloj {
  ahora(): number;
}

const RELOJ_REAL: Reloj = { ahora: () => Date.now() };

/** Un pedido que espera a la persona, con la revisión y el proyecto de donde viene: lo que muestra el aviso. */
export interface PedidoEnEspera extends Pedido {
  clave: string;
  proyecto: string;
}

interface Revision {
  proyecto: string;
  espera: EsperaDePermisos;
  /** Quien espera cada pedido (el gancho, del otro lado de la petición). */
  esperando: Map<string, (d: Decision) => void>;
}

/** Lo que el gancho no deja pasar cuando no hay revisión que pregunte: la clave no es de una revisión abierta. */
const SIN_REVISION: Decision = { permitir: false, motivo: 'sin_respuesta' };

/** Cada cuánto vuelve a mirar el límite de la revisión mientras un permiso la tiene en pausa. */
export const MIRAR_PAUSA_MS = 15_000;

/**
 * Cuánto correr un reloj del límite de la revisión por el tiempo en pausa (nmwp6dy6ntit), cuando ese reloj llega: si algo
 * espera todavía, volver a mirar en `MIRAR_PAUSA_MS` sin contar nada aún; si hubo pausa que ese reloj no contó, correrlo
 * esa pausa y darla por contada; si no, null: el reloj hace lo suyo. Pura.
 */
export function correrPorPausa(pausa: { ms: number; enPausa: boolean }, contada: number): { en: number; contada: number } | null {
  if (pausa.enPausa) return { en: MIRAR_PAUSA_MS, contada };
  if (pausa.ms > contada) return { en: pausa.ms - contada, contada: pausa.ms };
  return null;
}

/** Lo que se deja pasar sin el aviso: una orden que solo le manda datos a este computador. */
const A_ESTE_COMPUTADOR: Decision = { permitir: true, guardar: null };

/** Los programas que mandan datos por la red y cuyas direcciones se leen en la orden. */
const PROGRAMAS_DE_RED = /^(?:curl|curl\.exe|wget)$/i;
/** Lo que haría ir la orden a otro lado sin que se vea su dirección: un proxy, otra resolución, un archivo de opciones. */
const OPCIONES_QUE_DESVIAN = /^(?:-x|--proxy\S*|--preproxy|--socks\S*|--connect-to|--resolve|-K|--config|--doh-url)(?:=.*)?$/;
/** Las de wget que leen direcciones u órdenes de otro lado. */
const OPCIONES_QUE_DESVIAN_WGET = /^(?:-e|--execute|-i|--input-file|-B|--base)(?:=.*)?$/;
/** Las opciones cuyo valor es lo que se manda o dónde se guarda, nunca a dónde va: su valor no es una dirección. */
const OPCIONES_CON_VALOR = /^(?:-d|--data\S*|-F|--form\S*|-H|--header|-o|--output|-O|--output-document|-T|--upload-file|-A|--user-agent|-w|--write-out|--post-data|--post-file|--body-data|--body-file)$/;
const HOSTS_LOCALES = ['localhost', '127.0.0.1', '[::1]', '::1'];

/**
 * Si una orden solo le manda algo a este computador (decisión del titular nmwpkiddptit, 20 de noviembre de 2026: «Deja
 * pasar sin preguntar lo que va a mi propio computador»). Las reglas `ask` de Claude Code solo miran el principio de la
 * orden, así que `curl -d … http://localhost:5180/…` llegaba al aviso igual que a internet; aquí se lee entera. Pasa solo
 * una orden sola de curl o wget, sin cadenas, tuberías, redirecciones ni sustituciones, sin nada que la desvíe, con al
 * menos una dirección y todas a localhost, 127.0.0.1 o ::1. Cualquier duda (otra dirección, algo que parece un dominio,
 * una cadena) sigue preguntando. Pura.
 */
export function soloAEsteComputador(s: SolicitudDePermiso): boolean {
  if (s.herramienta !== 'Bash') return false;
  const orden = typeof s.entrada.command === 'string' ? s.entrada.command.trim() : '';
  if (!orden || /[;&|`<>\n\r]|\$\(|\$\{/.test(orden)) return false;
  const partes = (orden.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map((p) => p.replace(/^(["'])([\s\S]*)\1$/, '$2'));
  if (!PROGRAMAS_DE_RED.test(partes[0] ?? '')) return false;
  const wget = /^wget$/i.test(partes[0]);
  let destinos = 0;
  let saltar = false;
  for (const p of partes.slice(1)) {
    if (saltar) {
      saltar = false;
      continue;
    }
    if (OPCIONES_QUE_DESVIAN.test(p) || (wget && OPCIONES_QUE_DESVIAN_WGET.test(p))) return false;
    // Un proxy o un archivo de opciones pegado a otras letras («-sx», «-xhttp://…», «-K…»)
    if (/^-[a-zA-Z]*[xK]/.test(p)) return false;
    if (OPCIONES_CON_VALOR.test(p)) {
      saltar = true;
      continue;
    }
    // Una dirección con su esquema: solo a este computador
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(p)) {
      let u: URL;
      try {
        u = new URL(p);
      } catch {
        return false;
      }
      if (u.username || u.password || !HOSTS_LOCALES.includes(u.hostname.toLowerCase())) return false;
      destinos++;
      continue;
    }
    // Sin esquema: lo que parece un servidor (un dominio, o algo con su puerto) cuenta como dirección
    const host = /^(\[[0-9a-f:]+\]|[a-z0-9-]+(?:\.[a-z0-9-]+)*)(?::\d+)?(?:\/\S*)?$/i.exec(p)?.[1];
    if (host && (host.includes('.') || /:\d+/.test(p) || HOSTS_LOCALES.includes(host.toLowerCase()))) {
      if (!HOSTS_LOCALES.includes(host.toLowerCase())) return false;
      destinos++;
    }
  }
  return destinos > 0;
}

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

  /** La pausa de la revisión con esa clave: cuánto lleva en total y si algo espera ahora. Sin revisión, cero. */
  pausa(clave: string): { ms: number; enPausa: boolean } {
    const r = this.revisiones.get(clave);
    return r ? { ms: r.espera.pausadoMs(this.reloj.ahora()), enPausa: r.espera.enPausa } : { ms: 0, enPausa: false };
  }

  /**
   * La revisión terminó: lo que seguía esperando se niega y la revisión deja de preguntar. Devuelve lo que queda pendiente
   * en el panel de permisos (lo que la persona no llegó a decidir), para que la revisión lo diga.
   */
  cerrar(clave: string): Pedido[] {
    const r = this.revisiones.get(clave);
    if (!r) return [];
    r.espera.cerrarTodo(this.reloj.ahora());
    this.entregar(r);
    this.revisiones.delete(clave);
    return r.espera.quedanParaElPanel();
  }

  /**
   * El gancho pregunta. La promesa se cumple con la decisión: al instante si es de lo que nunca (o una cadena que ya
   * tiene), y si no, cuando la persona responda o cuando la revisión termine. Con una clave desconocida, se niega.
   */
  pedir(clave: string, solicitud: SolicitudDePermiso): Promise<Decision> {
    const r = this.revisiones.get(clave);
    if (!r) return Promise.resolve(SIN_REVISION);
    // Lo que solo va a este computador pasa sin el aviso (nmwpkiddptit)
    if (soloAEsteComputador(solicitud)) return Promise.resolve(A_ESTE_COMPUTADOR);
    const pedido = r.espera.pedir(solicitud, this.reloj.ahora());
    if (pedido.decision) return Promise.resolve(pedido.decision);
    return new Promise<Decision>((cumplir) => r.esperando.set(pedido.id, cumplir));
  }

  /** La persona responde desde el aviso. Null si la revisión o el pedido no existen. */
  responder(clave: string, id: string, respuesta: Respuesta): Respondida | null {
    const r = this.revisiones.get(clave);
    if (!r) return null;
    const respondida = r.espera.responder(id, respuesta, this.reloj.ahora());
    this.entregar(r);
    return respondida;
  }

  /** Lo que espera a la persona en todas las revisiones abiertas, en el orden en que se pidió: lo que muestra el aviso. */
  pendientes(): PedidoEnEspera[] {
    const todos: PedidoEnEspera[] = [];
    for (const [clave, r] of this.revisiones) for (const p of r.espera.pendientes()) todos.push({ ...p, clave, proyecto: r.proyecto });
    return todos.sort((a, b) => a.pedidoEn - b.pedidoEn);
  }

  /** A cada gancho que espera un pedido ya decidido, su decisión. */
  private entregar(r: Revision): void {
    for (const [id, cumplir] of r.esperando) {
      const decision = r.espera.decisionDe(id);
      if (!decision) continue;
      r.esperando.delete(id);
      cumplir(decision);
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

/** Lo mismo que `contestarAlGancho`, con la decisión que la originó (null si la clave no es de una revisión abierta), para la bitácora. */
export async function decidirParaElGancho(espera: PermisosEnEspera, clave: string, entrada: unknown): Promise<{ respuesta: RespuestaDelGancho; decision: Decision | null } | null> {
  const solicitud = solicitudDelGancho(entrada);
  if (!solicitud) return null;
  if (!espera.abierta(clave)) return { respuesta: negarAlGancho(SIN_REVISION_MENSAJE), decision: null };
  const decision = await espera.pedir(clave, solicitud);
  return { respuesta: respuestaDelGancho(decision), decision };
}

/** Lo que lee el director si su revisión no puede preguntar en el Studio (la clave no es de una revisión abierta). */
export const SIN_REVISION_MENSAJE = 'This review cannot ask in the Studio. Go on with the rest without it, and say in your answer what you could not do and which permission was missing.';

/** El gancho niega con su porqué, sin pasar por una espera: lo mismo que imprime tools/director/ganchoPermiso.ts si el Studio no responde. */
function negarAlGancho(mensaje: string): RespuestaDelGancho {
  return { hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'deny', message: mensaje } } };
}

/** Las preguntas de las revisiones de este servidor: una sola espera para el gancho, el aviso y el lanzador. */
export const permisosEnEspera = new PermisosEnEspera();
