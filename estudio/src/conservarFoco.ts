/**
 * El campo en que escribes no pierde el foco cuando la página se repinta (nota del titular nmw9w8e3itit, 9 de noviembre
 * de 2026: el campo de la cuenta de GitHub perdía el foco al hacer clic, porque la lista de las sesiones de gh y la
 * sincronización de cada 30 segundos repintaban la sección). Cada campo que lo pide lleva `data-conserva-foco="<clave>"`:
 * antes de repintar se guarda cuál era, lo escrito y dónde estaba el cursor; después, el campo nuevo recibe lo mismo,
 * aunque esté vacío. Puro, para probarlo sin la página.
 */

/** Lo que basta de un campo para guardarlo y devolverle el foco. */
export interface CampoConFoco {
  value: string;
  selectionStart: number | null;
  selectionEnd: number | null;
  dataset: Record<string, string | undefined>;
  focus(): void;
  setSelectionRange(inicio: number, fin: number): void;
}

export interface FocoGuardado {
  clave: string;
  valor: string;
  inicio: number | null;
  fin: number | null;
}

/** El campo enfocado, si es de los que conservan el foco; si no, null (la página sigue como siempre). */
export function guardarFoco(activo: unknown): FocoGuardado | null {
  const c = activo as Partial<CampoConFoco> | null;
  const clave = c?.dataset?.conservaFoco;
  if (!c || !clave || typeof c.value !== 'string') return null;
  return { clave, valor: c.value, inicio: c.selectionStart ?? null, fin: c.selectionEnd ?? null };
}

/** Devuelve el foco, lo escrito y el cursor al campo de la misma clave, si sigue en la página. */
export function devolverFoco(raiz: { querySelector(selector: string): unknown }, g: FocoGuardado | null): boolean {
  if (!g) return false;
  const campo = raiz.querySelector(`[data-conserva-foco="${g.clave.replace(/["\\]/g, '')}"]`) as CampoConFoco | null;
  if (!campo) return false;
  campo.value = g.valor;
  campo.focus();
  if (g.inicio !== null && g.fin !== null) {
    try {
      campo.setSelectionRange(g.inicio, g.fin);
    } catch {
      // Un campo sin cursor (un número, un correo): basta el foco
    }
  }
  return true;
}
