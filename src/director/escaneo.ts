// El escaneo técnico de cada revisión (nota de voz del titular nmvx17ixjtit, 31 de octubre de 2026: «que no actúe como un
// zombie que siempre hace lo mismo, aunque ya esté hecho», y que quede en código, no en el modelo, que lo olvida). Antes de
// trabajar, el código dice qué condiciones del cierre ya se cumplen, para que el director no las revise ni las escriba otra
// vez, y qué pruebas necesita lo que cambie. El cierre (bandeja.ts --listo) sigue exigiendo todo: esto no quita ninguna
// condición, solo evita volver a trabajar las que ya están. Nace en inglés, como lo que lee el modelo. Puro.

/** Lo que el escaneo mira, ya contado por la bandeja. */
export interface DatosDelEscaneo {
  /** Cada persona, con lo que alcanza de su reserva y lo que le falta (reservaDeMisiones). */
  reservas: { nombre: string; alcanza: number; faltan: number }[];
  /** Lo que cambió desde la última revisión, del mapa: commits, archivos y documentos del director. */
  commits: number;
  archivos: number;
  documentos: number;
  /** Lo pendiente que un commit nombra o se le parece («It may already be done»). */
  pistas: number;
  /** Las misiones abiertas que hay que volver a mirar por lo que pasó desde la última revisión. */
  misionesPorVigilar: number;
  /** Los documentos que alguien aún tiene por leer: lo nuevo se les integra. */
  documentosPorLeer: number;
  /** Hasta dónde llega el repositorio al empezar (su commit), para pedir las pruebas de lo que cambie. */
  base: string | null;
}

/** Lo que ya se cumple y no se rehace, y lo que falta de verdad. */
export interface Escaneo {
  yaEsta: string[];
  falta: string[];
}

/**
 * Lo que ya se cumple en esta revisión y lo que no, una frase por cosa. Con la reserva completa no se escriben misiones para
 * llenarla; con el mapa sin cambios no se explora ni se cruza nada; sin código tocado, ninguna prueba. Puro.
 */
export function escaneoDeLaRevision(d: DatosDelEscaneo): Escaneo {
  const yaEsta: string[] = [];
  const falta: string[] = [];
  for (const r of d.reservas) {
    // Lo que ya está en la cola y lo que cambia en esta revisión no toca sigue valiendo: se escribe solo lo que falta
    // (nota de voz del titular nmvx3tnpjtit, 31 de octubre de 2026)
    if (r.faltan) falta.push(`${r.nombre}'s reserve: ${r.alcanza} at hand, ${r.faltan} missing. ${r.alcanza ? `The ${r.alcanza} already queued stay valid unless this review's changes touch them: check that, and` : 'Nothing is queued:'} write only the ${r.faltan} missing, never the whole batch again.`);
    else yaEsta.push(`${r.nombre}'s reserve is complete (${r.alcanza} at hand): do not write, rewrite or reorder missions to fill it; only what a note, a delivery or a finished piece asks for.`);
  }
  const sinCambios = !d.commits && !d.archivos && !d.documentos;
  if (sinCambios) yaEsta.push('The repository and the documents did not change since the last review: do not explore them again or rebuild what you know from them; `alDia` is required only if you commit in this review.');
  else falta.push(`Since the last review: ${d.commits} commits, ${d.archivos} changed files and ${d.documentos} changed documents. Read only that again, and cross it with what is pending in \`alDia\`.`);
  if (d.pistas) falta.push(`${d.pistas} pending items a commit names or resembles: look at each one.`);
  else yaEsta.push('Nothing pending looks already done: no need to search for it item by item.');
  if (d.misionesPorVigilar) falta.push(`${d.misionesPorVigilar} open missions to look at again, for what happened around them.`);
  else yaEsta.push('No open mission needs looking at again: do not rewrite them or refresh their `vigente`.');
  if (!d.documentosPorLeer) yaEsta.push('Nobody has a document to read: there is nothing to integrate the feedback into.');
  const cambios = d.base ? `npx vitest run --changed ${d.base}` : 'npx vitest run <file>';
  falta.push(`Tests, only if you touch code: while working, the tests of the file that changes (\`npx vitest run <file>\`, or \`${cambios}\` for what imports it); before each commit, those and the types; the whole suite once, before closing the review (some tests read other files as text, and imports do not see them). Without code touched, none.`);
  return { yaEsta, falta };
}

/** Lo que la bandeja imprime del escaneo. Puro. */
export function lineasDelEscaneo(e: Escaneo): string[] {
  return [
    ...(e.yaEsta.length ? ['What already holds, and is not redone:', ...e.yaEsta.map((x) => `- ${x}`)] : []),
    ...(e.falta.length ? ['What does need you:', ...e.falta.map((x) => `- ${x}`)] : []),
  ];
}
