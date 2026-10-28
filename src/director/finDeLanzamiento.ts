// Quién terminó cada lanzamiento del director (propuesta aceptada «Cada proceso, a la vista», pr_procesos_vista, punto 1):
// el Studio lo escribe en su registro al terminar (estudio/servidor/revisor.ts › finEscrito), y «Modelo y consumo» lo dice
// en cada lanzamiento y los cuenta por cómo terminaron. Puro: lo usan el servidor y la página.

/**
 * Cerró solo; cerró y el Studio lo detuvo después de su cierre; lo cortó el límite del Studio; lo detuvo la cuenta (su
 * límite de uso o su sesión); no arrancó; Claude Code terminó sin cerrar; o se cerró desde afuera, sin su resultado final.
 */
export type QuienTermino = 'cierre' | 'tras_cierre' | 'limite' | 'cuenta' | 'no_arranco' | 'claude' | 'afuera';

export interface FinEscrito {
  quien: QuienTermino;
  /** Por qué, en una o dos frases. */
  causa: string;
  /** Cuánto duró de verdad, de que lo lanzó a que terminó, en minutos; null si no se sabe. */
  minutos: number | null;
  codigo?: number | null;
}

/** Cada final, como se dice en «Modelo y consumo», en el orden en que se cuentan. */
export const NOMBRE_FIN: Record<QuienTermino, string> = {
  cierre: 'cerró',
  tras_cierre: 'cerró, y el Studio lo detuvo después',
  limite: 'lo cortó el límite del Studio',
  cuenta: 'lo detuvo la cuenta',
  no_arranco: 'no arrancó',
  claude: 'Claude Code terminó sin cerrar',
  afuera: 'se cerró desde afuera',
};

/** Si algo es un final escrito que se entiende. */
export const esFinEscrito = (x: unknown): x is FinEscrito =>
  !!x && typeof x === 'object' && typeof (x as FinEscrito).quien === 'string' && Object.hasOwn(NOMBRE_FIN, (x as FinEscrito).quien);

/** Cuántos terminaron de cada forma, en el orden de NOMBRE_FIN, sin las que no pasaron. */
export function contarFinales(fines: readonly (FinEscrito | null | undefined)[]): { quien: QuienTermino; n: number }[] {
  const cuenta = new Map<QuienTermino, number>();
  for (const f of fines) if (esFinEscrito(f)) cuenta.set(f.quien, (cuenta.get(f.quien) ?? 0) + 1);
  return (Object.keys(NOMBRE_FIN) as QuienTermino[]).filter((q) => cuenta.has(q)).map((quien) => ({ quien, n: cuenta.get(quien)! }));
}
