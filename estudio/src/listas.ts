// Las listas del Studio con partes plegables (la columna de los documentos): ninguna se pliega sola.

/**
 * Si una parte plegable de una lista va abierta (nota del titular, 22 de octubre de 2026: «las listas no se deben
 * autocolapsar al abrir elementos»). Queda como estaba (`antes`: como la dejó quien mira, o como se vio la última vez)
 * y, la primera vez, como nace (`porDefecto`): ni abrir un elemento ni un repintado la pliegan. Lo único que la mueve
 * sin tocarla es que le llegue lo abierto (`recibe`: lo acabas de abrir y está en ella, o pasó a ella, como lo leído a
 * «Ya leídos»): se abre, para que lo abierto se vea marcado en ella.
 */
export const abiertaEnLista = (antes: boolean | undefined, porDefecto: boolean, recibe: boolean): boolean =>
  recibe || (antes ?? porDefecto);

/**
 * Cuánto mover el scroll propio de una lista para que se vea el elemento marcado en ella (con sus cajas en pantalla, las
 * de getBoundingClientRect): nada si ya se ve entero; si no, lo justo para dejarlo en el medio de la lista (o arriba, si
 * no cabe entero).
 */
export function desplazamientoParaVer(lista: { top: number; bottom: number }, el: { top: number; bottom: number }): number {
  if (el.top >= lista.top && el.bottom <= lista.bottom) return 0;
  return el.top - lista.top - Math.max(0, (lista.bottom - lista.top - (el.bottom - el.top)) / 2);
}

/** El idioma de quien lee: el de la interfaz, que todavía es solo el español (elegirlo es de una fase que viene, pd_bilingue). */
export const IDIOMA_DE_QUIEN_LEE = 'es';

/**
 * La versión de un documento en el idioma de quien lee, si está a su lado (X.md → X.es.md): los procedimientos del
 * director nacen en inglés, para el modelo, y traen su versión en español, que es la que se lee y se aprueba (propuesta
 * aceptada «Las reglas, a la medida de cada encargo», pr_reglas_por_encargo, punto 6). Igual con cualquier documento que
 * venga así, de cualquier proyecto. Si no la hay, o si ya es una versión (X.en.md), el mismo. `hay`: las rutas que
 * existen. Pura.
 */
export function enSuIdioma(ruta: string, hay: readonly string[], idioma = IDIOMA_DE_QUIEN_LEE): string {
  if (!/\.md$/i.test(ruta) || /\.[a-z]{2}\.md$/i.test(ruta)) return ruta;
  const version = ruta.replace(/\.md$/i, `.${idioma}.md`);
  return hay.includes(version) ? version : ruta;
}

/**
 * Si un archivo del repositorio (`repo:…`) es una instrucción para los agentes de IA y no documentación: CLAUDE.md,
 * AGENTS.md y los comandos de Claude Code (.claude/commands/) y de Codex (.agents/skills/<n>/SKILL.md, .codex/prompts/).
 * Devuelve su nombre para la columna, que se entienda («/revisa (Claude Code)», con su título si lo tiene), o null si es
 * documentación (decisión del titular, 22 de octubre de 2026: «Sepáralas como recomiendas»). `titulo`: el que da el
 * servidor («<título> · <ruta>», o el nombre del archivo si no tiene título).
 */
export function instruccionDeAgente(ruta: string, titulo: string): string | null {
  if (!ruta.startsWith('repo:')) return null;
  const p = ruta.slice(5);
  const partes = p.split('/');
  const archivo = partes.at(-1)!;
  const carpeta = partes.slice(0, -1).join('/');
  // El título propio (su primer encabezado), sin la ruta que le suma el servidor; si es solo el nombre del archivo, nada
  const propio = titulo.replace(new RegExp(` · ${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '').trim();
  const con = (nombre: string) => (propio && propio !== archivo ? `${nombre}: ${propio}` : nombre);
  const donde = carpeta ? ` · ${carpeta}` : '';
  if (/^claude\.md$/i.test(archivo)) return `CLAUDE.md: instrucciones para Claude Code${donde}`;
  if (/^agents\.md$/i.test(archivo)) return `AGENTS.md: instrucciones para Codex y otros agentes${donde}`;
  let m = /^\.claude\/commands\/(.+)\.md$/i.exec(p);
  if (m) return `${con(`/${m[1]}`)} (Claude Code)`;
  m = /^\.agents\/skills\/([^/]+)\/skill\.md$/i.exec(p) ?? /^\.codex\/prompts\/(.+)\.md$/i.exec(p);
  if (m) return `${con(`/${m[1]}`)} (Codex)`;
  return null;
}
