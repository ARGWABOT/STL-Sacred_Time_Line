// «¿Dónde quedamos?» por pestañas, según el tipo de lo que se respondió (pedido pd_pestanas_donde_quedamos, parte 3 de la
// propuesta aceptada pr_tipo_nota; nota de voz del titular nmvkb2pnetit): las respuestas del director a tus notas, cada
// una en la pestaña de su tipo, y «La ruta» para lo que avanzó sin venir de una nota (lo avanzado y sus comentarios).
// Cada pestaña dice solo lo suyo, la que no tiene nada no aparece y, al abrirlo, va primero la que trae algo nuevo para
// ti, en el orden que elegiste el 26 de octubre. Puro: el diálogo vive en app.ts.

import { TIPOS_DE_NOTA, tipoDeNota, type Nota, type Respuesta, type TipoDeNota } from '../../src/director/director';
import { t } from './textos';

export type PestanaDq = TipoDeNota | 'otras' | 'ruta';

/**
 * En tu orden: preguntas, solicitudes (ajustes), fallas e ideas; después, las notas sin tipo y la ruta. Sin «Comentarios»:
 * lo que respondí a un comentario o a una opción que elegiste te volvía a contar lo que tú mismo dijiste (notas de voz
 * del titular nmvt43dvatit y nmvt4jxwjtit, 29 de octubre de 2026); esa respuesta se ve junto a su nota y a su paso.
 */
export const ORDEN_PESTANAS_DQ: PestanaDq[] = ['pregunta', 'ajuste', 'falla', 'idea', 'otras', 'ruta'];
export const NOMBRE_PESTANA_DQ: Record<PestanaDq, string> = {
  get pregunta() { return t('dq.pestanaPreguntas'); },
  get ajuste() { return t('dq.pestanaAjustes'); },
  get falla() { return t('dq.pestanaFallas'); },
  get respuesta() { return t('dq.pestanaComentarios'); },
  get idea() { return t('dq.pestanaIdeas'); },
  get otras() { return t('dq.pestanaOtras'); },
  get ruta() { return t('dq.pestanaRuta'); },
};

/**
 * El porqué de una parada de las revisiones seguidas, solo hasta que se pide o se lanza otra revisión, sola o seguida
 * (nota de voz del titular nmvtinjrvtit, 29 de octubre de 2026): después parece que habla de la última, y confunde. La
 * falla de una revisión ya funciona así: vive en la revisión pedida, y la siguiente la reemplaza. Pura.
 */
export function paroVigente<P extends { cuando: string }>(
  paro: P | null | undefined,
  revision?: { pedida?: string; lanzada?: string; enCurso?: string } | null,
): P | null {
  if (!paro) return null;
  return [revision?.pedida, revision?.lanzada, revision?.enCurso].some((x) => !!x && x > paro.cuando) ? null : paro;
}

/** La pestaña de una sección de líneas: las de las respuestas son `r-<tipo>`; lo avanzado y los comentarios, «La ruta». */
export const pestanaDeSeccion = (s: string): PestanaDq => (s.startsWith('r-') && ORDEN_PESTANAS_DQ.includes(s.slice(2) as PestanaDq) ? (s.slice(2) as PestanaDq) : 'ruta');

/**
 * Una respuesta, entera: nunca se corta a mitad de la explicación (notas de voz del titular nmvsyrkn4tit, 28 de octubre
 * de 2026: «nuevamente estás cortando el texto a mitad de explicación»). Sin enlaces (cada línea ya es un botón), con sus
 * párrafos y sus renglones (la línea los muestra con white-space: pre-line) y sin espacios de más. Pura.
 */
export function lineaDeRespuesta(texto: string): string {
  return texto
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .split(/\n\s*\n/)
    .map((p) => p.split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).filter(Boolean).join('\n'))
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Las líneas de las notas que el director respondió después de `desde`, cada una en la sección de su pestaña (`r-<tipo>`),
 * de la respuesta más nueva a la más vieja; una nota respondida por partes deja una línea por parte, con el tipo de cada
 * una. Las notas sin tipo, en «Otras notas». Lo respondido a un comentario (tipo «respuesta»: también una opción
 * elegida, un «Hazlo tú» o una postura) no entra: se lee junto a su nota (nmvt43dvatit). Pura.
 */
export function lineasDeRespuestas(notas: Pick<Nota, 'id' | 'sobre' | 'tipo'>[], respuestas: Record<string, Respuesta> | undefined, desde: string): { seccion: string; texto: string }[] {
  const respondidas = notas.map((n) => ({ n, r: respuestas?.[n.id] })).filter((x): x is { n: (typeof notas)[number]; r: Respuesta } => !!x.r && x.r.cuando > desde);
  respondidas.sort((a, b) => b.r.cuando.localeCompare(a.r.cuando));
  const deTipo = (t: string) => `r-${(TIPOS_DE_NOTA as readonly string[]).includes(t) ? t : 'otras'}`;
  return respondidas.flatMap(({ n, r }) =>
    (r.partes?.length ? r.partes.map((p) => ({ tipo: p.tipo as string, texto: p.texto })) : [{ tipo: tipoDeNota(n, r) as string, texto: r.texto }])
      .filter((x) => x.tipo !== 'respuesta')
      .map((x) => ({ seccion: deTipo(x.tipo), texto: lineaDeRespuesta(x.texto) }))
      .filter((x) => x.texto),
  );
}

/**
 * La respuesta entera de una línea que quedó cortada en el archivo de este navegador: antes de que se mostraran enteras,
 * cada línea se guardaba ya recortada, con «…», y seguía así aunque el código cambiara, porque la respuesta era de antes
 * de tu última visita (nota de voz del titular nmvsyn0r4tit, 28 de octubre de 2026). Se compara sin los saltos de línea,
 * que la versión cortada juntaba. null si no está cortada o no se encuentra entera. Pura.
 */
export function lineaCompleta(guardada: string, completas: string[]): string | null {
  if (!guardada.endsWith('…')) return null;
  const plano = (t: string) => t.replace(/\s+/g, ' ').trim();
  const inicio = plano(guardada.slice(0, -1));
  if (!inicio) return null;
  return completas.find((c) => c.length > guardada.length - 1 && plano(c).startsWith(inicio)) ?? null;
}

/** Las pestañas que se ven, en su orden: solo las que traen algo por leer. Pura. */
export function pestanasConAlgo(conPendientes: Iterable<PestanaDq>): PestanaDq[] {
  const hay = new Set(conPendientes);
  return ORDEN_PESTANAS_DQ.filter((p) => hay.has(p));
}

/** La pestaña que se abre: la que estaba abierta si aún trae algo; si no, la primera, en su orden, que trae algo. Pura. */
export function pestanaActiva(conPendientes: Iterable<PestanaDq>, abierta?: PestanaDq | null): PestanaDq | null {
  const visibles = pestanasConAlgo(conPendientes);
  return abierta && visibles.includes(abierta) ? abierta : visibles[0] ?? null;
}
