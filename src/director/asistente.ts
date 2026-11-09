// El asistente de instalación (pedido pd_valores_instalar; notas nmvhpfix5tit y nmvx46phftit): una ventana a pantalla
// completa, por pasos, que se abre la primera vez y no se cierra sin elegir, porque sin ella el director quedaría sin modelo
// ni permisos. Aquí va lo que decide sin pantalla: cuándo se abre, qué trae marcado cada paso y qué queda guardado. Su pantalla
// está en estudio/src/asistente.ts y lo guardado, en estudio.local.json (fuera de git). Puro.
import { esPlanDeClaude, PLANES_DE_CLAUDE, type PlanDeClaude } from './consumoDelPlan.ts';
import { esResultadoPrueba, type ResultadoPrueba } from './instalacionVoz.ts';
import type { ModoPermisos, PermisoAutorizado } from './proyectos.ts';

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
export const PASOS_ASISTENTE = ['inicio', 'plan', 'modelo', 'permisos', 'lista', 'voz', 'final'] as const;
export type PasoAsistente = (typeof PASOS_ASISTENTE)[number];
const esPasoAsistente =(x: unknown): x is PasoAsistente => (PASOS_ASISTENTE as readonly unknown[]).includes(x);

/** Lo que recuerda este computador: dónde quedó quien cerró a mitad, con lo que ya eligió (t_decide_asistente_retoma). */
export interface EstadoAsistente {
  paso: PasoAsistente;
  plan?: PlanElegido;
  modelo?: string;
  modo?: ModoPermisos;
  /** Los ids de lo marcado en el paquete de permisos. */
  paquete?: string[];
  /** Lo que dijo de la prueba del micrófono. */
  prueba?: ResultadoPrueba;
  /** Cuándo terminó: desde ahí no se abre solo. */
  terminado?: string;
}

/** Lo que el servidor sabe de este computador para decidir si la ventana se abre sola. */
export interface EquipoDelAsistente {
  /** Los proyectos de este computador que no son el mismo Studio: STL Studio, que llega con la semilla, no cuenta. */
  proyectosPropios: number;
  modeloElegido: string | null;
  estado?: EstadoAsistente;
}

/**
 * Se abre solo si este computador no tiene ningún proyecto propio ni modelo elegido (t_decide_asistente_tu_copia), o si
 * quedó a mitad: quien lo cerró vuelve donde quedó, aunque ya haya elegido el modelo. Terminado, no vuelve: se ve con
 * «Repasar la instalación».
 */
export function abreSolo({ proyectosPropios, modeloElegido, estado }: EquipoDelAsistente): boolean {
  if (estado?.terminado) return false;
  if (estado) return true;
  return proyectosPropios === 0 && !modeloElegido;
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

/** Un grupo del paquete de permisos: su tipo de acción y las reglas que da, cada una con lo que hace a la vista. */
export interface GrupoDePermisos {
  id: 'leer' | 'probar' | 'commits' | 'subir' | 'traer' | 'publicar' | 'instalar';
  marcado: boolean;
  reglas: string[];
}

/**
 * El paquete de permisos recomendados (nota de voz del titular del 26 de octubre de 2026: «que nadie tenga que abrirlos
 * uno por uno»), por tipo de acción: los siete llegan marcados, en «Dejar todo como viene» y en «Repasar cada opción», con
 * por qué y en qué casos hace falta cada uno; la persona desmarca lo que no quiera dar, y si después su modelo lo necesita,
 * se lo pide (nota de voz del titular nmvypzj9jtit, 1 de noviembre de 2026, que reemplaza lo elegido el 30 de octubre y
 * nmvhpfix5tit: subir, traer, publicar e instalar llegaban sin marcar). Con un solo clic, quien instala autoriza también
 * subir y publicar. Lo que nunca se permite no está aquí, y aunque estuviera no pasa: el lanzador lo filtra
 * (permisosNegados.ts › autorizadasPara).
 */
export const PAQUETE_DE_PERMISOS: readonly GrupoDePermisos[] = [
  { id: 'leer', marcado: true, reglas: ['Bash(git log:*)', 'Bash(git show:*)', 'Bash(git status:*)', 'Bash(git diff:*)', 'Bash(git blame:*)', 'Bash(git grep:*)'] },
  { id: 'probar', marcado: true, reglas: ['Bash(npm test:*)', 'Bash(npx vitest run:*)', 'Bash(npm run typecheck:*)', 'Bash(composer test:*)', 'Bash(vendor/bin/phpunit:*)', 'Bash(pytest:*)', 'Bash(cargo test:*)', 'Bash(go test:*)', 'Bash(make test:*)'] },
  { id: 'commits', marcado: true, reglas: ['Bash(git add:*)', 'Bash(git commit:*)'] },
  { id: 'subir', marcado: true, reglas: ['Bash(git push:*)'] },
  { id: 'traer', marcado: true, reglas: ['Bash(git pull:*)', 'Bash(git fetch:*)'] },
  { id: 'publicar', marcado: true, reglas: ['Bash(npm publish:*)', 'Bash(gh release:*)'] },
  { id: 'instalar', marcado: true, reglas: ['Bash(npm install:*)', 'Bash(composer install:*)', 'Bash(pip install:*)'] },
];

/** Lo que el paquete trae marcado, sin que nadie toque nada: es lo que acepta «Dejar todo como viene». */
export const marcadoDeEntrada = (): string[] => PAQUETE_DE_PERMISOS.filter((g) => g.marcado).map((g) => g.id);

/** Lo marcado hoy, para «Repasar la instalación»: un grupo cuenta si todas sus reglas valen para todos los proyectos. */
export function marcadoHoy(autorizados: readonly Pick<PermisoAutorizado, 'regla' | 'alcance'>[]): string[] {
  const dados = new Set(autorizados.filter((a) => a.alcance === 'todos').map((a) => a.regla));
  return PAQUETE_DE_PERMISOS.filter((g) => g.reglas.every((r) => dados.has(r))).map((g) => g.id);
}

/**
 * Lo autorizado con lo marcado en el paquete: entran las reglas de lo marcado, para todos los proyectos, firmadas por quien
 * lo aprueba, y salen las de lo desmarcado. Las reglas siempre son las del paquete, nunca las que llegan de la página, y lo
 * demás que ya estaba autorizado (lo de un proyecto, lo que salió de lo negado) queda como estaba.
 */
export function autorizadosConPaquete(antes: readonly PermisoAutorizado[], marcados: readonly string[], firma: { cuando: string; quien: string }): PermisoAutorizado[] {
  const quedan = PAQUETE_DE_PERMISOS.filter((g) => marcados.includes(g.id)).flatMap((g) => g.reglas);
  const salen = new Set(PAQUETE_DE_PERMISOS.filter((g) => !marcados.includes(g.id)).flatMap((g) => g.reglas));
  const sigue = antes.filter((a) => !(a.alcance === 'todos' && salen.has(a.regla)));
  const nuevos = quedan.filter((r) => !sigue.some((a) => a.alcance === 'todos' && a.regla === r));
  // Lo de todos los proyectos reemplaza lo de uno solo con la misma regla, como en el panel
  return [...sigue.filter((a) => a.alcance === 'todos' || !quedan.includes(a.regla)), ...nuevos.map((regla) => ({ regla, alcance: 'todos' as const, ...firma }))];
}

/** Una casilla del paquete en «Permisos», para un proyecto: si sus reglas valen para él y con qué alcance. */
export interface GrupoEnElPanel { id: GrupoDePermisos['id']; marcado: boolean; alcance: PermisoAutorizado['alcance'] }

/**
 * Las casillas fijas de «Modelo y consumo» › «Permisos» (nota de voz del titular nmvzq8eb4tit, 2 de noviembre de 2026: «los
 * permisos que puedas necesitar déjalos de una vez allá con su casilla»): las mismas del paquete del asistente, para el proyecto
 * activo. Marcada, si todas sus reglas valen para él; todos los proyectos, si todas las reglas son para todos. Pura.
 */
export function gruposEnElPanel(autorizados: readonly Pick<PermisoAutorizado, 'regla' | 'alcance' | 'proyecto'>[], proyecto: string): GrupoEnElPanel[] {
  const paraTodos = new Set(marcadoHoy(autorizados));
  return PAQUETE_DE_PERMISOS.map((g) => ({
    id: g.id,
    marcado: g.reglas.every((r) => autorizados.some((a) => a.regla === r && (a.alcance === 'todos' || a.proyecto === proyecto))),
    alcance: paraTodos.has(g.id) ? 'todos' : 'proyecto',
  }));
}

/**
 * Marcar o desmarcar una casilla del paquete, con su alcance: marcar es la autorización. Las reglas siempre son las del
 * paquete, nunca las que llegan de la página; lo que nunca se permite lo sigue filtrando el lanzador (permisosNegados.ts ›
 * autorizadasPara), y lo demás autorizado queda como estaba. Sin ese grupo, nada cambia. Pura.
 */
export function autorizadosConGrupo(antes: readonly PermisoAutorizado[], pedido: { grupo: string; marcado: boolean; alcance: PermisoAutorizado['alcance']; proyecto: string }, firma: { cuando: string; quien: string }): PermisoAutorizado[] {
  const g = PAQUETE_DE_PERMISOS.find((x) => x.id === pedido.grupo);
  if (!g) return [...antes];
  const { marcado, alcance, proyecto } = pedido;
  const suya = (a: PermisoAutorizado) => g.reglas.includes(a.regla) && (a.alcance === 'todos' || a.proyecto === proyecto);
  if (!marcado) return antes.filter((a) => !suya(a));
  const igual = (a: PermisoAutorizado) => g.reglas.includes(a.regla) && a.alcance === alcance && (alcance === 'todos' || a.proyecto === proyecto);
  // Lo de todos los proyectos reemplaza lo de uno solo con la misma regla, como en el panel
  const sigue = antes.filter((a) => igual(a) || !(alcance === 'todos' ? g.reglas.includes(a.regla) : suya(a)));
  const nuevos = g.reglas.filter((r) => !sigue.some((a) => a.regla === r && igual(a)));
  return [...sigue, ...nuevos.map((regla) => ({ regla, alcance, ...(alcance === 'proyecto' ? { proyecto } : {}), ...firma }))];
}

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
  return { paso: 'lista', plan, modelo: estado.modelo ?? modeloDePlan(plan), paquete: estado.paquete ?? marcadoDeEntrada() };
}

/** Elegir otro plan cambia el modelo que conviene; lo demás queda como iba. Cada pantalla usa lo que se eligió en la anterior. */
export const conPlan = (estado: EstadoAsistente, plan: PlanElegido): EstadoAsistente => ({ ...estado, plan, modelo: modeloDePlan(plan) });

/** Lo que recuerda el servidor, si se entiende: una pantalla que no existe vuelve al principio. */
export function estadoAsistenteDe(x: unknown): EstadoAsistente | undefined {
  const e = x as Partial<EstadoAsistente> | null | undefined;
  if (!e || typeof e !== 'object') return undefined;
  const validos = PAQUETE_DE_PERMISOS.map((g) => g.id as string);
  return {
    paso: esPasoAsistente(e.paso) ? e.paso : 'inicio',
    ...(esPlanElegido(e.plan) ? { plan: e.plan } : {}),
    ...(typeof e.modelo === 'string' && e.modelo ? { modelo: e.modelo } : {}),
    ...(esModo(e.modo) ? { modo: e.modo } : {}),
    ...(Array.isArray(e.paquete) ? { paquete: e.paquete.filter((p): p is string => typeof p === 'string' && validos.includes(p)) } : {}),
    ...(esResultadoPrueba(e.prueba) ? { prueba: e.prueba } : {}),
    ...(typeof e.terminado === 'string' ? { terminado: e.terminado } : {}),
  };
}

/** Lo que pide guardar la pantalla final, revisado: el modo, si no llega, es el que viene. */
export interface InstalacionPedida {
  plan: PlanElegido;
  modelo: string;
  modo: ModoPermisos;
  paquete: string[];
}
export function revisarInstalacion(x: unknown): { ok: true; pedido: InstalacionPedida } | { ok: false; error: 'plan' | 'modelo' | 'modo' } {
  const c = (x ?? {}) as Record<string, unknown>;
  if (!esPlanElegido(c.plan)) return { ok: false, error: 'plan' };
  if (typeof c.modelo !== 'string' || !/^[a-z0-9][\w.[\]-]{0,59}$/i.test(c.modelo)) return { ok: false, error: 'modelo' };
  const modo = c.modo === undefined ? MODO_DEL_ASISTENTE : c.modo;
  if (!esModo(modo)) return { ok: false, error: 'modo' };
  const validos = PAQUETE_DE_PERMISOS.map((g) => g.id as string);
  const paquete = Array.isArray(c.paquete) ? c.paquete.filter((p): p is string => typeof p === 'string' && validos.includes(p)) : marcadoDeEntrada();
  return { ok: true, pedido: { plan: c.plan, modelo: c.modelo, modo, paquete } };
}
