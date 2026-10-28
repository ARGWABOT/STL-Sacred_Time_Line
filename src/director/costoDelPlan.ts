// Lo que gasta una revisión, dicho en lo que cuesta de tu plan y no a precio de API (pedido pd_costo_plan; nota de voz del
// titular nmvpn8mv1tit, 26 de octubre de 2026: a precio de API parece que se gasta mucho más de lo que de verdad se paga).
// Anthropic no publica cuántos tokens o dólares trae cada plan, así que no hay tasa: lo que sí se sabe es cuánto de tu
// límite semanal llevas, antes y después de cada lanzamiento. Lo que subió es la parte de tu semana que gastó, y con el
// precio de tu plan (al mes, por 12 y entre 52: el de una semana) sale su equivalente aproximado. Como el límite se
// comparte con claude.ai y otras sesiones y se mide en saltos de 1 %, lo que subió en una misma ventana se reparte entre
// sus lanzamientos en proporción a su gasto. Con una clave de API, que sí paga por uso, el precio de API es el real.
// Fuentes: claude.com/pricing, support.claude.com (planes Max, y Claude Code con Pro o Max). Puro.

/** Los planes de Claude, con lo que cuestan al mes en dólares (claude.com/pricing); la clave de API paga por uso. */
export const PLANES_DE_CLAUDE = {
  pro: { nombre: 'Pro', mes: 20 },
  max5: { nombre: 'Max 5x', mes: 100 },
  max20: { nombre: 'Max 20x', mes: 200 },
  api: { nombre: 'Una clave de API, que paga por uso', mes: null },
} as const;
export type PlanDeClaude = keyof typeof PLANES_DE_CLAUDE;

export const esPlanDeClaude = (x: unknown): x is PlanDeClaude => typeof x === 'string' && Object.hasOwn(PLANES_DE_CLAUDE, x);

/** Lo que cuesta una semana de un plan: el precio al mes, por 12 y entre 52 (unos 46 USD en Max 20x). */
export const precioSemanal = (mes: number) => (mes * 12) / 52;

/** El límite semanal dentro de un lanzamiento: cuánto llevaba al empezar y al terminar (de 0 a 100) y cuándo se renueva. */
export interface SemanaDelLanzamiento {
  desde: number;
  hasta: number;
  renueva: string | null;
}

/**
 * Qué parte de tu semana gastó cada lanzamiento, en puntos del límite semanal (de 0 a 100): lo que subió dentro de los
 * lanzamientos de una misma ventana (la que se renueva a la misma hora), repartido entre ellos en proporción a lo que
 * gastó cada uno. Sin lo que dijo el límite, o con una ventana sin gasto, no viene.
 */
export function semanaDeCadaUno(lanzamientos: readonly { id: string; costo: number; semana?: SemanaDelLanzamiento | null }[]): Map<string, number> {
  const ventanas = new Map<string, { subio: number; gasto: number; ids: { id: string; costo: number }[] }>();
  for (const l of lanzamientos) {
    if (!l.semana || !(l.costo >= 0)) continue;
    const clave = l.semana.renueva ?? 'sin hora';
    const v = ventanas.get(clave) ?? { subio: 0, gasto: 0, ids: [] };
    v.subio += Math.max(0, l.semana.hasta - l.semana.desde);
    v.gasto += l.costo;
    v.ids.push({ id: l.id, costo: l.costo });
    ventanas.set(clave, v);
  }
  const parte = new Map<string, number>();
  for (const v of ventanas.values()) if (v.gasto > 0) for (const x of v.ids) parte.set(x.id, (v.subio * x.costo) / v.gasto);
  return parte;
}

/**
 * Lo que gastó, dicho como parte de tu plan: «≈ 2 % de tu semana, ≈ US$ 0,90 de tu plan, aproximado». Con una clave de
 * API, o sin plan elegido o sin lo que dijo el límite, null: entonces vale lo que se muestra a precio de API, que con la
 * clave es el real.
 */
export function enTuPlan(puntos: number | undefined, plan: PlanDeClaude | null | undefined): string | null {
  if (puntos === undefined || !plan) return null;
  const mes = PLANES_DE_CLAUDE[plan].mes;
  if (mes === null) return null;
  const usd = (puntos / 100) * precioSemanal(mes);
  const pct = puntos < 0.1 ? 'menos del 0,1 %' : `${puntos.toLocaleString('es', { maximumFractionDigits: 1 })} %`;
  return `≈ ${pct} de tu semana, ≈ US$ ${usd.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} de tu plan, aproximado`;
}
