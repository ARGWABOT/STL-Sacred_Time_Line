// El asistente de instalación (pedido pd_valores_instalar; notas nmvhpfix5tit y nmvx46phftit): una ventana a pantalla
// completa, por pasos, que se abre la primera vez y no se cierra sin elegir, porque sin ella el director quedaría sin modelo
// ni permisos. Aquí va lo que decide sin pantalla: cuándo se abre, qué trae marcado cada paso y qué queda guardado. Su pantalla
// está en estudio/src/asistente.ts y lo guardado, en estudio.local.json (fuera de git). Puro.
import { esPlanDeClaude, PLANES_DE_CLAUDE, type PlanDeClaude } from './consumoDelPlan.ts';
import { esResultadoPrueba, type ResultadoPrueba } from './instalacionVoz.ts';
import type { ModoPermisos } from './proyectos.ts';

// Sin importar proyectos.ts: este módulo también lo usa la página, y aquel lee el disco
const esModo = (x: unknown): x is ModoPermisos => x === 'autorizado' || x === 'pregunta' || x === 'automatico';

/** El plan que dijo la persona; «No lo sé» es una respuesta, y deja lo mismo que Pro (t_decide_plan_no_lo_se, 31 de octubre de 2026). */
export type PlanElegido = PlanDeClaude | 'nose';
export const PLANES_ELEGIBLES: readonly PlanElegido[] = [...(Object.keys(PLANES_DE_CLAUDE) as PlanDeClaude[]), 'nose'];
const esPlanElegido =(x: unknown): x is PlanElegido => x === 'nose' || esPlanDeClaude(x);

/**
 * Las pantallas, en su orden: cada una usa lo que se eligió en la anterior. `lista` es la que muestra todo lo que quedó, y al
 * dejarla se guarda: va antes de `voz` para que una descarga larga, si se corta, no se lleve lo elegido. `voz` instala y prueba
 * la voz, y `final` deja STL Studio activo, con el primer proyecto por entregar.
 */
export const PASOS_ASISTENTE = ['inicio', 'plan', 'modelo', 'lista', 'voz', 'final'] as const;
export type PasoAsistente = (typeof PASOS_ASISTENTE)[number];
const esPasoAsistente =(x: unknown): x is PasoAsistente => (PASOS_ASISTENTE as readonly unknown[]).includes(x);

/** Lo que recuerda este computador: dónde quedó quien cerró a mitad, con lo que ya eligió (t_decide_asistente_retoma). */
export interface EstadoAsistente {
  paso: PasoAsistente;
  plan?: PlanElegido;
  modelo?: string;
  modo?: ModoPermisos;
  /** Lo que dijo de la prueba del micrófono. */
  prueba?: ResultadoPrueba;
  /** Cuándo terminó: desde ahí no se abre solo. */
  terminado?: string;
}

/** Lo que el servidor sabe de este computador para decidir si la ventana se abre sola. */
export interface EquipoDelAsistente {
  /** Los proyectos de este computador que no son el mismo Studio: STL Studio, que llega con la semilla, no cuenta. */
  proyectosPropios: number;
  estado?: EstadoAsistente;
  /** Si este computador ya tiene la transcripción y las voces (estudio/servidor/instalarVoz.ts › estado): sin saberlo, no cuenta. */
  voz?: { transcripcion: boolean; voces: boolean };
}

/** Si a este computador le falta la transcripción o las voces, que son obligatorias (nota nmwr3fvgdtit). */
export const faltaLaVoz = ({ voz }: Pick<EquipoDelAsistente, 'voz'>): boolean => !!voz && (!voz.transcripcion || !voz.voces);

/**
 * Se abre solo si este computador no tiene ningún proyecto propio (t_decide_asistente_tu_copia), o si quedó a mitad:
 * quien lo cerró vuelve donde quedó. Terminado, no vuelve: se ve con «Repasar la instalación». Un modelo ya elegido en
 * Claude Code no lo salta: quien ya usa Claude Code instala igual la transcripción y las voces antes de entregar su
 * primer proyecto (nota urgente nmwr3amdptit: en Ubuntu, el Studio llevó directo a entregar sin instalarlas). Y mientras
 * falte la transcripción o las voces, se abre siempre, aun terminado o con proyectos: sin ellas no se entrega nada
 * (nota nmwr3fvgdtit).
 */
export function abreSolo(equipo: EquipoDelAsistente): boolean {
  const { proyectosPropios, estado } = equipo;
  if (faltaLaVoz(equipo)) return true;
  if (estado?.terminado) return false;
  if (estado) return true;
  return proyectosPropios === 0;
}

/**
 * Dónde abre la ventana que se abre sola: donde quedó. Si ya estaba terminado (o al final) y falta la voz, en la pantalla de la voz,
 * sin la marca de terminado: se termina otra vez al dejarla lista. Puro.
 */
export function estadoAlAbrir(equipo: EquipoDelAsistente): EstadoAsistente | undefined {
  const { estado } = equipo;
  if (!estado || !faltaLaVoz(equipo) || (!estado.terminado && estado.paso !== 'final')) return estado;
  const { terminado: _terminado, ...sinTerminar } = estado;
  return { ...sinTerminar, paso: 'voz' };
}

/** El esfuerzo que deja el asistente: alto, con cualquier plan (decisión del 30 de octubre de 2026). */
export const ESFUERZO_DEL_ASISTENTE = 'high';
export const MODELO_MAX20 = 'claude-opus-5-5';
export const MODELO_DE_LOS_DEMAS = 'claude-sonnet-5-5';

/** El modelo que le conviene a un plan: con Max 20x, Opus 5.5; con Max 5x, Pro o sin saberlo, Sonnet 5.5. */
export const modeloDePlan = (plan: PlanElegido | undefined): string => (plan === 'max20' ? MODELO_MAX20 : MODELO_DE_LOS_DEMAS);

/** Los modelos que ofrece su pantalla: el que conviene primero y, si ya hay otro elegido, también ese. */
export function modelosDelPaso(plan: PlanElegido | undefined, actual: string | null | undefined): string[] {
  const recomendado = modeloDePlan(plan);
  return [...new Set([recomendado, MODELO_MAX20, MODELO_DE_LOS_DEMAS, ...(actual ? [actual] : [])])];
}

/** Con qué modo llega el director: te pregunta en el Studio lo que le falte (decisión del 26 de octubre de 2026). */
export const MODO_DEL_ASISTENTE: ModoPermisos = 'pregunta';

/** El siguiente paso y el anterior; en los extremos, el mismo. */
export function pasoSiguiente(paso: PasoAsistente): PasoAsistente {
  return PASOS_ASISTENTE[Math.min(PASOS_ASISTENTE.indexOf(paso) + 1, PASOS_ASISTENTE.length - 1)];
}
export function pasoAnterior(paso: PasoAsistente): PasoAsistente {
  return PASOS_ASISTENTE[Math.max(PASOS_ASISTENTE.indexOf(paso) - 1, 0)];
}

/** «Dejar todo como viene»: acepta lo marcado y lleva a la lista de lo que quedó, para cambiar algo si se quiere. */
export function dejarComoViene(estado: Partial<EstadoAsistente>): EstadoAsistente {
  const plan = estado.plan ?? 'nose';
  return { paso: 'lista', plan, modelo: estado.modelo ?? modeloDePlan(plan) };
}

/** Elegir otro plan cambia el modelo que conviene; lo demás queda como iba. Cada pantalla usa lo que se eligió en la anterior. */
export const conPlan = (estado: EstadoAsistente, plan: PlanElegido): EstadoAsistente => ({ ...estado, plan, modelo: modeloDePlan(plan) });

/** Lo que recuerda el servidor, si se entiende: una pantalla que no existe vuelve al principio. */
export function estadoAsistenteDe(x: unknown): EstadoAsistente | undefined {
  const e = x as Partial<EstadoAsistente> | null | undefined;
  if (!e || typeof e !== 'object') return undefined;
  return {
    // La pantalla de los permisos ya no existe: quien quedó en ella sigue en la lista
    paso: (e.paso as unknown) === 'permisos' ? 'lista' : esPasoAsistente(e.paso) ? e.paso : 'inicio',
    ...(esPlanElegido(e.plan) ? { plan: e.plan } : {}),
    ...(typeof e.modelo === 'string' && e.modelo ? { modelo: e.modelo } : {}),
    ...(esModo(e.modo) ? { modo: e.modo } : {}),
    ...(esResultadoPrueba(e.prueba) ? { prueba: e.prueba } : {}),
    ...(typeof e.terminado === 'string' ? { terminado: e.terminado } : {}),
  };
}

/** Lo que pide guardar la pantalla final, revisado: el modo, si no llega, es el que viene. */
export interface InstalacionPedida {
  plan: PlanElegido;
  modelo: string;
  modo: ModoPermisos;
}
export function revisarInstalacion(x: unknown): { ok: true; pedido: InstalacionPedida } | { ok: false; error: 'plan' | 'modelo' | 'modo' } {
  const c = (x ?? {}) as Record<string, unknown>;
  if (!esPlanElegido(c.plan)) return { ok: false, error: 'plan' };
  if (typeof c.modelo !== 'string' || !/^[a-z0-9][\w.[\]-]{0,59}$/i.test(c.modelo)) return { ok: false, error: 'modelo' };
  const modo = c.modo === undefined ? MODO_DEL_ASISTENTE : c.modo;
  if (!esModo(modo)) return { ok: false, error: 'modo' };
  return { ok: true, pedido: { plan: c.plan, modelo: c.modelo, modo } };
}
