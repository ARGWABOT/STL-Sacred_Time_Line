/**
 * Las pestañas de «Modelo y consumo» (nota de voz del titular nmvoqwicctit, 25 de octubre de 2026: ya eran demasiadas
 * tarjetas apiladas). Aquí vive lo puro: qué pestañas hay, qué partes tiene cada una y a cuál lleva un ancla. La
 * interfaz (director.ts › vistaModelo) solo pinta lo de la pestaña elegida.
 *
 * El criterio es el contenido: lo que se configura del director, lo que se le permite, lo que gasta y lo que se
 * audita. Un botón de la ruta o de una misión que lleva a una parte (`{ vista: 'modelo', ancla: 'm-permisos' }`) abre
 * antes la pestaña que la tiene.
 */

export type PestanaModelo = 'director' | 'permisos' | 'ajustes' | 'gasto' | 'bitacora';

// Los permisos y los ajustes de Claude Code, cada uno en su pestaña (nota de voz del titular nmvow70jqtit, 26 de octubre
// de 2026: «que permisos y ajustes sean secciones diferentes»)
export const PESTANAS_MODELO: readonly { id: PestanaModelo; titulo: string; anclas: readonly string[] }[] = [
  { id: 'director', titulo: 'El director', anclas: ['m-director'] },
  { id: 'permisos', titulo: 'Permisos', anclas: ['m-permisos'] },
  { id: 'ajustes', titulo: 'Ajustes de Claude Code', anclas: ['m-ajustes'] },
  { id: 'gasto', titulo: 'Lo que gasta', anclas: ['m-limites', 'm-consumo', 'm-medicion'] },
  { id: 'bitacora', titulo: 'Bitácora', anclas: ['m-bitacora'] },
];

/** La pestaña de partida: lo primero que se configura. */
export const PESTANA_MODELO_INICIAL: PestanaModelo = 'director';

/** Si `id` es una pestaña de «Modelo y consumo» (lo guardado en el navegador puede venir de una versión anterior). */
export function pestanaModeloValida(id: unknown): id is PestanaModelo {
  return PESTANAS_MODELO.some((p) => p.id === id);
}

/** La pestaña que tiene la parte con ese ancla (`m-permisos`…), o `null` si el ancla no es de «Modelo y consumo». */
export function pestanaDeAncla(ancla: string | null | undefined): PestanaModelo | null {
  if (!ancla) return null;
  return PESTANAS_MODELO.find((p) => p.anclas.includes(ancla))?.id ?? null;
}

/**
 * La pestaña a la que mueve una tecla desde `actual`, como en cualquier lista de pestañas accesible: flechas a los lados
 * (dando la vuelta en los extremos), Inicio y Fin. Con otra tecla, `null`: no se mueve nada.
 */
export function pestanaConTecla(actual: PestanaModelo, tecla: string): PestanaModelo | null {
  const n = PESTANAS_MODELO.length;
  const i = Math.max(0, PESTANAS_MODELO.findIndex((p) => p.id === actual));
  if (tecla === 'ArrowRight') return PESTANAS_MODELO[(i + 1) % n].id;
  if (tecla === 'ArrowLeft') return PESTANAS_MODELO[(i + n - 1) % n].id;
  if (tecla === 'Home') return PESTANAS_MODELO[0].id;
  if (tecla === 'End') return PESTANAS_MODELO[n - 1].id;
  return null;
}
