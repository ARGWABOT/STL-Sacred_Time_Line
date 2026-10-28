/**
 * Los controles del modo enfoque (pd_controles_enfoque), en cuatro grupos separados por una línea fina y siempre en este
 * orden: el tema (con la letra, donde la hay), la niebla de lectura (la nube, ▶ y su velocidad), la narración (la persona
 * que habla, que lee en voz alta; distinta del altavoz del sonido) y el sonido (el botón que abre su menú ahí mismo). Los dos lugares donde aparecen, la franja de la
 * ventana del documento y la de la tarjeta de tu misión, los arman aquí, para que el orden sea uno solo. La línea es CSS
 * (director.css › .grupo-enfoque): un grupo que no se ve (la narración sin la niebla) no deja la suya.
 */

export type GrupoEnfoque = 'tema' | 'niebla' | 'narracion' | 'sonido';

/** Los grupos, en su orden, con el nombre que lee un lector de pantalla. */
export const GRUPOS_ENFOQUE: readonly { id: GrupoEnfoque; nombre: string }[] = [
  { id: 'tema', nombre: 'Tema' },
  { id: 'niebla', nombre: 'Niebla de lectura' },
  { id: 'narracion', nombre: 'Narración en voz alta' },
  { id: 'sonido', nombre: 'Sonido' },
];

/** Cada pieza dentro de su grupo, en el orden de los grupos; un grupo sin pieza (una franja que no lo lleva) no se dibuja. */
export function controlesEnfoque(piezas: Partial<Record<GrupoEnfoque, string>>): string {
  return GRUPOS_ENFOQUE.filter((g) => piezas[g.id])
    .map((g) => `<span class="grupo-enfoque grupo-enfoque-${g.id}" role="group" aria-label="${g.nombre}">${piezas[g.id]}</span>`)
    .join('');
}
