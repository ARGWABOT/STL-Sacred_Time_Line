// «¿Dónde quedamos?» por pestañas, según el tipo de lo que se respondió (pedido pd_pestanas_donde_quedamos, parte 3 de la
// propuesta aceptada pr_tipo_nota; nota de voz del titular nmvkb2pnetit): las respuestas del director a tus notas, cada
// una en la pestaña de su tipo, y «La ruta» para lo que avanzó sin venir de una nota (lo avanzado y sus comentarios).
// Cada pestaña dice solo lo suyo, la que no tiene nada no aparece y, al abrirlo, va primero la que trae algo nuevo para
// ti, en el orden que elegiste el 26 de octubre. Puro: el diálogo vive en director.ts.

import { TIPOS_DE_NOTA, tipoDeNota, type Nota, type Respuesta, type TipoDeNota } from '../../src/director/director';

export type PestanaDq = TipoDeNota | 'otras' | 'ruta';

/** En tu orden: preguntas, solicitudes (ajustes), fallas, comentarios (te respondo) e ideas; después, las notas sin tipo y la ruta. */
export const ORDEN_PESTANAS_DQ: PestanaDq[] = ['pregunta', 'ajuste', 'falla', 'respuesta', 'idea', 'otras', 'ruta'];
export const NOMBRE_PESTANA_DQ: Record<PestanaDq, string> = { pregunta: 'Preguntas', ajuste: 'Ajustes', falla: 'Fallas', respuesta: 'Te respondo', idea: 'Ideas', otras: 'Otras notas', ruta: 'La ruta' };

/** La pestaña de una sección de líneas: las de las respuestas son `r-<tipo>`; lo avanzado y los comentarios, «La ruta». */
export const pestanaDeSeccion = (s: string): PestanaDq => (s.startsWith('r-') && ORDEN_PESTANAS_DQ.includes(s.slice(2) as PestanaDq) ? (s.slice(2) as PestanaDq) : 'ruta');

const LARGO_LINEA = 280;

/**
 * Una respuesta en una línea: su primer párrafo, sin enlaces y recortado en una palabra, con su negrilla cerrada si el
 * recorte la dejó abierta. Lo entero sigue en el Buzón. Pura.
 */
export function lineaDeRespuesta(texto: string): string {
  const parrafo = (texto.trim().split(/\n\s*\n/)[0] ?? '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ').trim();
  if (parrafo.length <= LARGO_LINEA) return parrafo;
  const corte = parrafo.slice(0, LARGO_LINEA);
  let linea = `${corte.slice(0, Math.max(corte.lastIndexOf(' '), LARGO_LINEA / 2)).replace(/[\s,;:.]+$/, '')}…`;
  if ((linea.match(/\*\*/g)?.length ?? 0) % 2) linea = linea.replace(/…$/, '**…');
  return linea;
}

/**
 * Las líneas de las notas que el director respondió después de `desde`, cada una en la sección de su pestaña (`r-<tipo>`),
 * de la respuesta más nueva a la más vieja; una nota respondida por partes deja una línea por parte, con el tipo de cada
 * una. Las notas sin tipo, en «Otras notas». Pura.
 */
export function lineasDeRespuestas(notas: Pick<Nota, 'id' | 'sobre' | 'tipo'>[], respuestas: Record<string, Respuesta> | undefined, desde: string): { seccion: string; texto: string }[] {
  const respondidas = notas.map((n) => ({ n, r: respuestas?.[n.id] })).filter((x): x is { n: (typeof notas)[number]; r: Respuesta } => !!x.r && x.r.cuando > desde);
  respondidas.sort((a, b) => b.r.cuando.localeCompare(a.r.cuando));
  const deTipo = (t: string) => `r-${(TIPOS_DE_NOTA as readonly string[]).includes(t) ? t : 'otras'}`;
  return respondidas.flatMap(({ n, r }) =>
    (r.partes?.length ? r.partes.map((p) => ({ tipo: p.tipo as string, texto: p.texto })) : [{ tipo: tipoDeNota(n, r) as string, texto: r.texto }])
      .map((x) => ({ seccion: deTipo(x.tipo), texto: lineaDeRespuesta(x.texto) }))
      .filter((x) => x.texto),
  );
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
