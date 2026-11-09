// La línea viva del proyecto y su historia (pedidos pd_linea_ramas y pd_linea_historia; t_linea_historia: en la memoria
// del proyecto). Lo que hace nacer cada rama (una nota por su tipo, lo que eliges, un «Hazlo tú», una entrega, una
// propuesta respondida) y, al cerrar cada revisión, una línea corta con las ramas que nacieron en ella y cuándo se
// juntaron, en `director/linea.jsonl`, junto al plan: viaja con el proyecto y el equipo ve la misma historia. Puro: lo usan
// la barra del Studio (estudio/src/lineaViva.ts), su servidor y el cierre de la revisión (bandeja.ts --listo).

import { tipoDeNota, type Nota } from './director.ts';

/** Las ramas principales, en el orden en que nacen sobre la línea: cada una con su color en el CSS (lv-<clase>). */
export const CLASES_RAMA = ['respuesta', 'ajuste', 'idea', 'falla', 'pregunta', 'eleccion', 'hazlo', 'entrega'] as const;
export type ClaseRama = (typeof CLASES_RAMA)[number];

/** Una rama: una intervención de la persona que el director aún no ha recibido, con lo que dice su globo. */
export interface Rama {
  id: string;
  cuando: string;
  clase: ClaseRama;
  /** Las dos primeras líneas de la nota (o lo que la hizo nacer), para el globo de su punta. */
  globo?: string;
  /** La nota entera (o la transcripción de su audio), para el globo que se abre al pasar sobre su cabecita (nmvtt33jctit). */
  texto?: string;
}

/** Lo más largo que lleva el globo de una cabecita: una nota de voz larga cabe entera, con su desplazamiento. */
const MAX_TEXTO_GLOBO = 4000;

/**
 * Lo más que separa la entrega de una misión de lo que eligió (o el «Hazlo tú») en su último paso: el clic que marca ese
 * paso la entrega en el mismo momento, así que las dos cosas son una sola rama (nota de voz del titular nmvvwyss9tit).
 */
const ENTREGA_CON_SU_PASO = 60_000;

/**
 * Una revisión en la historia de la línea: desde cuándo, dónde apareció el director a recoger (su corte: lo que nació
 * después ya no entraba), cuándo se juntaron sus ramas y cuándo nació cada una (t) y de qué tipo (c).
 */
export interface RevisionDeLinea {
  desde: string;
  corte?: string;
  junto: string;
  ramas: RamaPasada[];
}

/**
 * Una rama de la historia: cuándo nació (t), de qué tipo (c) y, desde el 4 de noviembre de 2026 (pedido pd_linea_completa),
 * de qué nota nació (n: su id, o entrega-<misión> y propuesta-<id>), lo que dice su globo (g: sus dos primeras líneas) y,
 * si la respuesta la llevó a una fase, cuál (f): mientras esa fase no llega, la rama se ve tenue en la línea. Las de antes
 * no traen n, g ni f, y siguen valiendo.
 */
export interface RamaPasada { t: string; c: ClaseRama; n?: string; g?: string; f?: string; q?: DestinoDeRama }

/**
 * Qué hizo el director con una rama en su revisión (pd_linea_informe, contado como eligió el titular, nmw2fksmgtit): la
 * juntó en la línea (la llevó a algo de la fase en curso: la integró o es una decisión que pidió), espera su fase (dejó un
 * pedido o una propuesta de una fase que viene) o la cerró (solo informaba o no se hace, con su razón).
 */
export type DestinoDeRama = 'junta' | 'espera' | 'cierra';
const DESTINOS: readonly DestinoDeRama[] = ['junta', 'espera', 'cierra'];

/** Lo que el informe de una rama mira de la respuesta que le dio el director. */
export type RespuestaDeRama = { cuando: string; tratamiento?: string; destino?: { fase?: string } };

/**
 * Qué pasó con una rama, según su respuesta: lo que solo informaba o se rechazó, cerrado; lo aplazado, o lo llevado a una
 * fase que viene, espera su fase; lo demás (integrado, una decisión, una entrega revisada, una propuesta respondida), junto
 * en la línea. Pura.
 */
export function destinoDeRama(r: RespuestaDeRama | undefined, queViene: ReadonlySet<string>): DestinoDeRama {
  if (r?.tratamiento === 'rechazada' || r?.tratamiento === 'informada') return 'cierra';
  if (r?.tratamiento === 'aplazada' || (r?.destino?.fase && queViene.has(r.destino.fase))) return 'espera';
  return 'junta';
}

/** Desde cuándo la historia guarda qué pasó con cada rama (nmw2hc1u0tit): las revisiones de antes dicen solo cuántas se abrieron. */
const DETALLE_DESDE = '2026-11-04';

/** El informe de una revisión: cuántas ramas abriste y, si se sabe, qué pasó con ellas (los tres suman las abiertas). */
export type InformeDeRevision =
  | { abiertas: number; juntadas: number; esperan: number; cerradas: number }
  | { abiertas: number; sinDetalle: 'antes' | 'falta' };

/**
 * Cuántas ramas abriste en una revisión y cuántas el director juntó en la línea, cuántas esperan su fase y cuántas cerró.
 * Una revisión de antes del 4 de noviembre, o con alguna rama sin ese dato, dice solo cuántas se abrieron. Pura.
 */
export function informeDeRevision(h: Pick<RevisionDeLinea, 'junto' | 'ramas'>): InformeDeRevision {
  const abiertas = h.ramas.length;
  if (h.junto < DETALLE_DESDE) return { abiertas, sinDetalle: 'antes' };
  if (h.ramas.some((r) => !r.q)) return { abiertas, sinDetalle: 'falta' };
  const cuenta = (q: DestinoDeRama) => h.ramas.filter((r) => r.q === q).length;
  return { abiertas, juntadas: cuenta('junta'), esperan: cuenta('espera'), cerradas: cuenta('cierra') };
}

/** Dónde vive la historia, relativa a la memoria del proyecto. */
export const ARCHIVO_LINEA = 'director/linea.jsonl';

export type NotaLinea = Pick<Nota, 'id' | 'cuando' | 'sobre' | 'texto' | 'tipo'>;

/** Las dos primeras líneas con texto, cada una de a lo más 90 letras. Puro. */
export function dosLineas(texto: string | undefined): string {
  return (texto ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 2)
    .map((l) => (l.length > 90 ? `${l.slice(0, 89).trimEnd()}…` : l)).join('\n');
}

/** De qué rama es una nota: lo que eligió o decidió, un «Hazlo tú» o, si no, su tipo (sin tipo, un comentario). Puro. */
function claseDeNota(n: Pick<Nota, 'sobre' | 'tipo'>): ClaseRama {
  const s = n.sobre;
  if (s.hazlo) return 'hazlo';
  if (s.eleccion || s.postura === 'aprueba' || s.postura === 'decide') return 'eleccion';
  const t = tipoDeNota(n);
  return t === 'ajuste' || t === 'idea' || t === 'falla' || t === 'pregunta' ? t : 'respuesta';
}

const recortado = (t: string) => (t.length > MAX_TEXTO_GLOBO ? `${t.slice(0, MAX_TEXTO_GLOBO - 1).trimEnd()}…` : t);

/**
 * La nota que entregó cada misión: lo que eligió o el «Hazlo tú» de uno de sus pasos, hasta ENTREGA_CON_SU_PASO antes de
 * la entrega; si hay varias, la última, que es la que marcó el último paso. Las demás siguen en su propia rama. Puro.
 */
function notasQueEntregaron(notas: NotaLinea[], entregas: { id: string; cuando: string }[]): Map<string, NotaLinea> {
  const suyas = new Map<string, NotaLinea>();
  for (const e of entregas) {
    const fin = Date.parse(e.cuando);
    const cerca = notas.filter((n) => n.sobre.tipo === 'mision' && n.sobre.id === e.id && (n.sobre.eleccion || n.sobre.hazlo)
      && n.cuando <= e.cuando && fin - Date.parse(n.cuando) <= ENTREGA_CON_SU_PASO);
    const ultima = cerca.reduce<NotaLinea | undefined>((u, n) => (!u || n.cuando > u.cuando ? n : u), undefined);
    if (ultima) suyas.set(e.id, ultima);
  }
  return suyas;
}

/**
 * Las ramas de ahora, de la más vieja a la más nueva: cada nota sin respuesta del director, cada misión entregada que
 * aún no revisa y cada propuesta respondida después de la última revisión. Entregar una misión con lo que se eligió en
 * su último paso es una sola cosa, así que nace una sola rama, la de la entrega, que en su globo dice las dos (nota de voz
 * del titular nmvvwyss9tit, 30 de octubre de 2026: antes nacían dos), en el momento en que eligió (nmvvyrasktit). Puro.
 */
export function ramasDeAhora(
  notas: NotaLinea[],
  respondidas: (id: string) => boolean,
  entregas: { id: string; cuando: string; titulo?: string }[],
  propuestas: { id: string; cuando?: string; titulo?: string }[],
  revisado?: string,
): Rama[] {
  const desde = revisado ?? '';
  const pendientes = notas.filter((n) => !respondidas(n.id));
  const entregaron = notasQueEntregaron(pendientes, entregas);
  const juntas = new Set([...entregaron.values()].map((n) => n.id));
  const deNotas = pendientes.filter((n) => !juntas.has(n.id)).map((n): Rama => {
    const clase = claseDeNota(n);
    const globo = n.sobre.eleccion ? `Elegiste: ${dosLineas(n.sobre.eleccion)}` : dosLineas(n.texto) || 'Una nota de voz';
    const texto = recortado((n.texto ?? '').trim());
    return { id: n.id, cuando: n.cuando, clase, globo, ...(texto && texto !== globo ? { texto } : {}) };
  });
  const deEntregas = entregas.map((e): Rama => {
    const entregaste = e.titulo ? `Entregaste «${e.titulo}»` : 'Entregaste una misión';
    const n = entregaron.get(e.id);
    if (!n) return { id: `entrega-${e.id}`, cuando: e.cuando, clase: 'entrega', globo: e.titulo ? `Entregaste «${dosLineas(e.titulo)}»` : 'Entregaste una misión' };
    // Lo que eligió, o el «Hazlo tú», en la segunda línea; en el globo que se abre, todo: la misión, lo elegido y lo que
    // escribió con ello (una opción que promete contar más trae su comentario; si no, su texto es la opción misma)
    const elegida = n.sobre.eleccion?.trim();
    const escrito = (n.texto ?? '').trim();
    const como = elegida ? `Elegiste: ${elegida}` : escrito || '«Hazlo tú»';
    const globo = dosLineas(`${entregaste}\n${como}`);
    const texto = recortado([entregaste, como, elegida && escrito !== elegida ? escrito : ''].filter(Boolean).join('\n'));
    // Nace cuando elegiste, no cuando se guardó la entrega, un momento después: si no, la rama de lo elegido volvía a
    // nacer con la entrega y la línea retrocedía para dar su paso otra vez (nota de voz del titular nmvvyrasktit)
    return { id: `entrega-${e.id}`, cuando: n.cuando, clase: 'entrega', globo, ...(texto !== globo ? { texto } : {}) };
  });
  const dePropuestas = propuestas.filter((p) => !!p.cuando && p.cuando > desde).map((p): Rama => ({
    id: `propuesta-${p.id}`, cuando: p.cuando!, clase: 'eleccion', globo: p.titulo ? `Respondiste «${dosLineas(p.titulo)}»` : 'Respondiste una propuesta',
  }));
  return [...deNotas, ...deEntregas, ...dePropuestas].sort((a, b) => a.cuando.localeCompare(b.cuando) || a.id.localeCompare(b.id));
}

/**
 * Lo que pasó en la línea en una revisión, al cerrarla: las ramas que la persona hizo nacer antes de que empezara (`corte`)
 * y que el director juntó en ella (las notas que respondió, las entregas que revisó y las propuestas respondidas desde la
 * revisión anterior). Puro.
 */
export function revisionDeLinea(
  notas: NotaLinea[],
  respuestas: Record<string, RespuestaDeRama | undefined>,
  entregas: Record<string, { cuando: string }>,
  revisiones: Record<string, { cuando: string } | undefined>,
  propuestas: { id: string; cuando?: string }[],
  desde: string,
  corte: string,
  junto: string,
  /** Las fases que vienen, después de la de ahora: lo que se lleva a ellas espera su fase. */
  queViene: ReadonlySet<string> = new Set(),
): RevisionDeLinea {
  const enEsta = (c?: string) => !!c && c >= desde;
  const ramas = ramasDeAhora(
    notas.filter((n) => n.cuando <= corte),
    (id) => !enEsta(respuestas[id]?.cuando),
    Object.entries(entregas).filter(([id, e]) => e.cuando <= corte && enEsta(revisiones[id]?.cuando)).map(([id, e]) => ({ id, cuando: e.cuando })),
    propuestas.filter((p) => !!p.cuando && p.cuando <= corte),
    desde,
  );
  return { desde, corte, junto, ramas: ramas.map((r) => pasada(r, respuestas[r.id], queViene)) };
}

/** Una rama de ahora, como queda en la historia: con su nota, su globo, la fase donde quedó, si la tiene, y qué pasó con ella. Pura. */
const pasada = (r: Rama, resp: RespuestaDeRama | undefined, queViene: ReadonlySet<string>): RamaPasada => {
  const fase = resp?.destino?.fase;
  return { t: r.cuando, c: r.clase, n: r.id, ...(r.globo ? { g: r.globo } : {}), ...(fase ? { f: fase } : {}), q: destinoDeRama(resp, queViene) };
};

/**
 * La historia con qué pasó con cada rama en las revisiones desde el 4 de noviembre que aún no lo guardaban (las que ya
 * traían su nota, n), leído de sus respuestas: así su informe sale con sus cuatro números (pd_linea_informe). Lo que ya lo
 * tiene, o es de antes, queda igual. El texto del archivo; sin nada que completar, el mismo. Puro.
 */
export function historiaConDetalle(texto: string | null | undefined, respuestas: Record<string, RespuestaDeRama | undefined>, queViene: ReadonlySet<string>): string | null | undefined {
  const historia = leerHistoriaLinea(texto);
  let cambio = false;
  for (const h of historia) {
    if (h.junto < DETALLE_DESDE) continue;
    for (const r of h.ramas) {
      if (r.q || !r.n) continue;
      r.q = destinoDeRama(respuestas[r.n], queViene);
      cambio = true;
    }
  }
  return cambio ? historia.map((x) => JSON.stringify(x)).join('\n') + '\n' : texto;
}

const esClase = (c: unknown): c is ClaseRama => typeof c === 'string' && (CLASES_RAMA as readonly string[]).includes(c);

/** La historia, leída de su archivo: una revisión por línea, de la más vieja a la más nueva; lo que no se entiende, fuera. Puro. */
export function leerHistoriaLinea(texto: string | null | undefined): RevisionDeLinea[] {
  const fuera: RevisionDeLinea[] = [];
  for (const l of (texto ?? '').split(/\r?\n/)) {
    if (!l.trim()) continue;
    try {
      const r = JSON.parse(l) as Partial<RevisionDeLinea>;
      if (typeof r.junto !== 'string' || typeof r.desde !== 'string' || !Array.isArray(r.ramas)) continue;
      const ramas = r.ramas.filter((x) => x && typeof x.t === 'string' && esClase(x.c)).map((x): RamaPasada => ({
        t: x.t, c: x.c,
        ...(typeof x.n === 'string' ? { n: x.n } : {}), ...(typeof x.g === 'string' ? { g: x.g } : {}), ...(typeof x.f === 'string' ? { f: x.f } : {}),
        ...(DESTINOS.includes(x.q as DestinoDeRama) ? { q: x.q } : {}),
      }));
      fuera.push({ desde: r.desde, ...(typeof r.corte === 'string' ? { corte: r.corte } : {}), junto: r.junto, ramas });
    } catch {
      // una línea rota no borra las demás
    }
  }
  return fuera.sort((a, b) => a.junto.localeCompare(b.junto));
}

/**
 * La historia con una revisión más: la del mismo comienzo (correr el cierre otra vez antes del commit) se reemplaza, no se
 * repite. El texto del archivo, una revisión por línea. Puro.
 */
export function historiaConRevision(texto: string | null | undefined, r: RevisionDeLinea): string {
  const otras = leerHistoriaLinea(texto).filter((x) => x.desde !== r.desde);
  return [...otras, r].sort((a, b) => a.junto.localeCompare(b.junto)).map((x) => JSON.stringify(x)).join('\n') + '\n';
}
