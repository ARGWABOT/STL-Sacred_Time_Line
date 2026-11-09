// «← Volver a tu misión», sin adivinar (nota de voz del titular nmvt2cfkktit, 29 de octubre de 2026: un paso lo llevó a
// «Documentos» sin nombrar un documento y el botón no apareció; «¿cuántas veces tengo que repetir lo mismo?»). De dónde
// se vuelve y dónde flota se deciden aquí, sin el navegador, para que su prueba recorra cada clase de destino de un paso.

/** De qué misión se vino y adónde: un documento (`ruta`) o una sección del Studio (`vista`). */
export interface DesdeMision {
  id: string;
  ruta?: string;
  vista?: string;
}

/** Lo que importa del botón de un paso para saber si cambia de lugar. */
export interface DestinoDePaso {
  vista?: string;
  ancla?: string;
  doc?: string;
  url?: string;
}

/**
 * Al oprimir el botón de un paso de la misión `mision`: de dónde se vuelve. `seccion` es la sección a la que lleva (con
 * los cambios de lugar de ir()). Una página de afuera (se abre en otra pestaña), el ✉ del Buzón (abre el diálogo aquí
 * mismo) o la misma sección de las misiones no cambian de lugar: no hay a dónde volver.
 */
export function desdeElPaso(mision: string, dest: DestinoDePaso, seccion: string | undefined): DesdeMision | null {
  if (dest.doc) return { id: mision, ruta: dest.doc };
  if (dest.url || (dest.vista === 'buzon' && dest.ancla === 'escribir')) return null;
  return seccion && seccion !== 'misiones' ? { id: mision, vista: seccion } : null;
}

/**
 * Si «← Volver a tu misión» flota donde está la persona: en la sección a la que llevó el paso mientras siga en ella; en
 * «Documentos», sobre el documento que nombró el paso o, si el paso llevó a la sección sin nombrar uno, sobre cualquiera
 * que abra ahí (y sin ninguno abierto). En las misiones nunca: ya está en ellas.
 */
export function flotaVolver(desde: DesdeMision | null, seccion: string, docAbierto: string | null): boolean {
  if (!desde || seccion === 'misiones') return false;
  if (seccion === 'documentos') return desde.vista === 'documentos' || (!!desde.ruta && desde.ruta === docAbierto);
  return desde.vista === seccion;
}
