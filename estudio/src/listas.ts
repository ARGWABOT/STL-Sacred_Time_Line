// Las listas del Studio con partes plegables (la columna de los documentos): ninguna se pliega sola.
import { t } from './textos';

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

/**
 * Cuánto mover cada contenedor con scroll propio, del más cercano al elemento al más lejano, para que el elemento se vea
 * en todos (nota de voz del titular nmw15wqz9tit, 3 de noviembre de 2026: lo resaltado siempre se lleva a la vista, también
 * dentro de un panel con su propio scroll). Al mover uno, el elemento, y los contenedores que van dentro de él, suben o
 * bajan eso mismo; los de afuera, no. Pura: cajas en pantalla, como getBoundingClientRect.
 */
export function desplazamientosEnCadena(contenedores: { top: number; bottom: number }[], el: { top: number; bottom: number }): number[] {
  let caja = { ...el };
  return contenedores.map((c) => {
    const d = desplazamientoParaVer(c, caja);
    caja = { top: caja.top - d, bottom: caja.bottom - d };
    return d;
  });
}

/**
 * Dónde queda, al repintar, una caja con su propio scroll (el documento en el modo enfoque): donde la dejaste, salvo que
 * se acabe de abrir otro documento, que empieza arriba del todo (nota de voz del titular nmw2db9dptit, 4 de noviembre de
 * 2026: «todo documento que se abra debe acomodarse automáticamente en top»). Pura.
 */
export const scrollAlRepintar = (antes: number, abreOtro: boolean): number => (abreOtro ? 0 : antes);

/** El idioma de quien lee si no se dice otro; app.ts pasa el de la interfaz (idiomaActual). */
export const IDIOMA_DE_QUIEN_LEE = 'es';

/**
 * La versión de un documento en el idioma de quien lee, si está a su lado (X.md → X.es.md): los procedimientos del
 * director nacen en inglés, para el modelo, y traen su versión en español, que es la que se lee y se aprueba (propuesta
 * aceptada «Las reglas, a la medida de cada encargo», pr_reglas_por_encargo, punto 6). Igual con cualquier documento que
 * venga así, de cualquier proyecto. Y de vuelta: una versión de otro idioma (X.es.md) con la interfaz en inglés abre la
 * del idioma de quien lee si la hay (X.en.md) o su principal (X.md) (nota del titular nmw5o660stit, 7 de noviembre de 2026: «intenté
 * leerlo en inglés al cambiar de idioma y no funcionó»). Si no hay otra, el mismo. `hay`: las rutas que existen. Pura.
 */
export function enSuIdioma(ruta: string, hay: readonly string[], idioma = IDIOMA_DE_QUIEN_LEE): string {
  if (!/\.md$/i.test(ruta)) return ruta;
  const m = /^(.*)\.([a-z]{2})\.md$/i.exec(ruta);
  if (m && m[2].toLowerCase() === idioma) return ruta;
  const principal = m ? `${m[1]}.md` : ruta;
  const version = principal.replace(/\.md$/i, `.${idioma}.md`);
  if (hay.includes(version)) return version;
  // La principal sin sufijo es la de inglés solo cuando su par es de otro idioma (X.md, para el modelo, y X.es.md): así
  // se vuelve a ella solo leyendo en inglés; leyendo en español, una X.en.md pedida por su ruta se respeta
  if (m && idioma === 'en' && hay.includes(principal)) return principal;
  // Un documento del método pedido desde el repositorio (repo:docs/metodo/…) cuando el proyecto es el propio Studio: la
  // lista no lo trae con «repo:», porque ya está entre los del Studio, sin él. Su versión en el otro idioma es esa (nota
  // del titular nmw6u5386tit: repo:docs/metodo/director/plan-formats.es.md seguía en español con la interfaz en inglés)
  if (ruta.startsWith('repo:')) {
    const delStudio = ruta.slice(5);
    const otra = enSuIdioma(delStudio, hay, idioma);
    if (otra !== delStudio && hay.includes(otra)) return otra;
  }
  return ruta;
}

/**
 * ¿Este documento se abre siempre por su ruta, sin pasar a su versión en otro idioma? El que pide leer una misión, el plan
 * o la cola de lectura (`enCola`, `delPlan`: sus rutas), porque sus partes leídas se cuentan por ella. Los del método del
 * Studio (docs/metodo/, también desde el repositorio) sí cambian, aunque la cola o el plan los nombren: al cambiar de idioma
 * con uno abierto debe abrirse en el idioma nuevo (nota del titular nmw6mnqqftit). Pura.
 */
export function seQuedaEnSuRuta(ruta: string, enCola: readonly { ruta: string }[], delPlan: readonly string[]): boolean {
  if (/^(repo:)?docs\/metodo\//.test(ruta)) return false;
  return enCola.some((x) => x.ruta === ruta) || delPlan.includes(ruta);
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
  if (/^claude\.md$/i.test(archivo)) return `${t('docs.instruccionesClaude')}${donde}`;
  if (/^agents\.md$/i.test(archivo)) return `${t('docs.instruccionesAgents')}${donde}`;
  let m = /^\.claude\/commands\/(.+)\.md$/i.exec(p);
  if (m) return `${con(`/${m[1]}`)} (Claude Code)`;
  m = /^\.agents\/skills\/([^/]+)\/skill\.md$/i.exec(p) ?? /^\.codex\/prompts\/(.+)\.md$/i.exec(p);
  if (m) return `${con(`/${m[1]}`)} (Codex)`;
  return null;
}
