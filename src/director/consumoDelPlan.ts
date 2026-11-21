// Lo que consume una revisión de tu plan (regla del titular, nota de voz nmvx46phftit, 31 de octubre de 2026): el Studio y
// sus proyectos corren sobre la cuenta de la persona, con Claude Code, nunca con una clave de API, así que solo se muestra
// uso, como Claude Desktop y Codex: tokens y porcentaje del plan, y ninguna cifra de dinero. Lo que sí se sabe es cuánto de
// tu límite semanal llevas, antes y después de cada lanzamiento: lo que subió es la parte de tu semana que consumió. Como
// el límite se comparte con claude.ai y otras sesiones y se mide en saltos de 1 %, lo que subió en una misma ventana se
// reparte entre sus lanzamientos en proporción a sus tokens: por eso es aproximado. Puro.

/** Los planes de Claude. Sirven para recomendar el modelo; lo consumido se dice igual en todos. */
export const PLANES_DE_CLAUDE = {
  pro: { nombre: 'Pro' },
  max5: { nombre: 'Max 5x' },
  max20: { nombre: 'Max 20x' },
} as const;
export type PlanDeClaude = keyof typeof PLANES_DE_CLAUDE;

export const esPlanDeClaude = (x: unknown): x is PlanDeClaude => typeof x === 'string' && Object.hasOwn(PLANES_DE_CLAUDE, x);

/** El límite semanal dentro de un lanzamiento: cuánto llevaba al empezar y al terminar (de 0 a 100) y cuándo se renueva. */
export interface SemanaDelLanzamiento {
  desde: number;
  hasta: number;
  renueva: string | null;
}

const numero = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);

/**
 * Los tokens de un resultado de Claude Code: de todos los modelos de la sesión, si los dice (`modelUsage`); si no, los del
 * director en su último turno (`usage`). Lo escrito en la caché y lo leído de ella cuentan. Pura.
 */
export function tokensDelResultado(r: { modelUsage?: unknown; usage?: unknown } | null | undefined): number {
  const usos = r?.modelUsage && typeof r.modelUsage === 'object' ? Object.values(r.modelUsage as Record<string, Record<string, unknown>>).filter((u) => u && typeof u === 'object') : [];
  if (usos.length) return usos.reduce((s, u) => s + numero(u.inputTokens) + numero(u.cacheCreationInputTokens) + numero(u.cacheReadInputTokens) + numero(u.outputTokens), 0);
  const u = (r?.usage ?? {}) as Record<string, unknown>;
  return numero(u.input_tokens) + numero(u.cache_creation_input_tokens) + numero(u.cache_read_input_tokens) + numero(u.output_tokens);
}

/**
 * Qué parte de tu semana consumió cada lanzamiento, en puntos del límite semanal (de 0 a 100): lo que subió dentro de los
 * lanzamientos de una misma ventana (la que se renueva a la misma hora), repartido entre ellos en proporción a sus tokens.
 * Sin lo que dijo el límite, o con una ventana sin tokens, no viene.
 */
export function semanaDeCadaUno(lanzamientos: readonly { id: string; tokens: number; semana?: SemanaDelLanzamiento | null }[]): Map<string, number> {
  const ventanas = new Map<string, { subio: number; tokens: number; ids: { id: string; tokens: number }[] }>();
  for (const l of lanzamientos) {
    if (!l.semana || !(l.tokens >= 0)) continue;
    const clave = l.semana.renueva ?? 'sin hora';
    const v = ventanas.get(clave) ?? { subio: 0, tokens: 0, ids: [] };
    v.subio += Math.max(0, l.semana.hasta - l.semana.desde);
    v.tokens += l.tokens;
    v.ids.push({ id: l.id, tokens: l.tokens });
    ventanas.set(clave, v);
  }
  const parte = new Map<string, number>();
  for (const v of ventanas.values()) if (v.tokens > 0) for (const x of v.ids) parte.set(x.id, (v.subio * x.tokens) / v.tokens);
  return parte;
}

/** Lo que consumió, dicho como parte de tu plan: «≈ 2 % de tu semana, aproximado». Sin lo que dijo el límite, null. */
export function enTuPlan(puntos: number | undefined): string | null {
  if (puntos === undefined) return null;
  const pct = puntos < 0.1 ? 'menos del 0,1 %' : `${puntos.toLocaleString('es', { maximumFractionDigits: 1 })} %`;
  return `≈ ${pct} de tu semana, aproximado`;
}
