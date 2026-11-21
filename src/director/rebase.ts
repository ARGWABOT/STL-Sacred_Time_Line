// El rebase de la memoria de cada proyecto (pedido pd_rebase_memoria; nota de voz del titular nmwfl02i5tit, 13 de noviembre
// de 2026): la memoria arrastra meses de notas ya cerradas, y el Studio y cada revisión arrancarían más livianos desde el
// estado de hoy. El titular decidió borrarlas, nunca sin un «Confirmo» con el conteo a la vista (nmwfntv5vtit), ahora y al
// final de cada fase, en cada proyecto (nmwfnuk69tit); no se guarda un archivo aparte de ellas: una nota borrada vive solo
// como historia, que git conserva, y se encuentra pidiéndosela al director, que busca en git (nmwfnvif8tit). Esto solo elige
// qué se puede borrar; borrarlo lo hace el Studio, que es el único que escribe director/equipo/.
import { decisionesVigentes, notasReemplazadas, type Mision, type Nota, type Paso, type Pedido, type Respuesta, type Tratamiento } from './director.ts';
// Tras cada puerta, la limpieza ofrece solo lo cerrado antes de cruzarla y cuyo asunto terminó (`notasTrasLaPuerta`)

/** Un tratamiento que deja la nota pendiente: aplazada (espera una fase posterior) o de decisión (abrió una decisión sin responder). */
const PENDIENTE: ReadonlySet<Tratamiento> = new Set<Tratamiento>(['aplazada', 'decision']);

/** ¿La respuesta deja algo pendiente? Si su tratamiento, o el de alguna de sus partes, es aplazado o de decisión. Pura. */
function dejaPendiente(r: Respuesta): boolean {
  if (r.tratamiento && PENDIENTE.has(r.tratamiento)) return true;
  return (r.partes ?? []).some((p) => PENDIENTE.has(p.tratamiento));
}

/** Lo que el rebase necesita del plan para elegir qué borrar, sin leerlo entero. */
export interface PlanParaRebase {
  respuestas?: Record<string, Respuesta>;
  pedidos?: Pick<Pedido, 'id' | 'hecho' | 'notas'>[];
  misiones?: readonly { origen?: string[] }[];
}

/**
 * Las notas de la memoria que el rebase puede borrar: las cerradas —respondidas sin dejar nada pendiente, o reemplazadas por
 * otra posterior—, nunca una pendiente (sin responder, aplazada, con un pedido sin hacer) ni una en vigor (una decisión o una
 * opción elegida que siguen en firme), ni una del `origen` de una misión abierta (un hilo vivo que `origenesQueNoExisten`
 * exige). Da sus ids. Pura: no borra nada; borrarlas lo hace el Studio tras el «Confirmo».
 */
export function notasBorrables(notas: readonly Nota[], plan: PlanParaRebase): string[] {
  const respuestas = plan.respuestas ?? {};
  const reemplazadas = notasReemplazadas(respuestas);
  // Protegidas: lo que sigue en vigor y lo que un trabajo abierto todavía necesita
  const protegidas = new Set<string>(decisionesVigentes(respuestas, notas).map((n) => n.id));
  for (const m of plan.misiones ?? []) for (const id of m.origen ?? []) protegidas.add(id);
  for (const ped of plan.pedidos ?? []) if (!ped.hecho) for (const id of ped.notas ?? []) protegidas.add(id);
  const borrables: string[] = [];
  for (const n of notas) {
    if (protegidas.has(n.id)) continue;
    if (reemplazadas.has(n.id)) {
      borrables.push(n.id);
      continue;
    }
    const r = respuestas[n.id];
    if (r && !dejaPendiente(r)) borrables.push(n.id);
  }
  return borrables;
}

/** Lo que la limpieza tras una puerta necesita además: los pedidos con lo que reemplazan, y los veredictos de las misiones. */
export interface PlanTrasPuerta extends PlanParaRebase {
  pedidos?: Pick<Pedido, 'id' | 'hecho' | 'notas' | 'reemplaza'>[];
  revisiones?: Record<string, { veredicto?: string }>;
}

/**
 * Las notas que ofrece la misión única tras cruzar una puerta (pd_rebase_memoria; decisiones del titular nmwgmvtc0tit,
 * nmwjl91dftit y nmwl4xwfmtit): de las borrables, solo las respondidas (o reemplazadas) antes de cruzar esa puerta y cuyo
 * asunto terminó —su pedido hecho o reemplazado por otro, su misión aprobada—, nunca una que la persona ya decidió
 * conservar. Nada de la fase que empieza ni nada en vigor (eso ya lo excluye `notasBorrables`). Sin ninguna, no hay
 * misión (nmwkbll1ytit). Da sus ids, en el orden de las notas. Pura.
 */
export function notasTrasLaPuerta(notas: readonly Nota[], plan: PlanTrasPuerta, cruce: string, conservadas: ReadonlySet<string> = new Set()): string[] {
  const respuestas = plan.respuestas ?? {};
  const pedidos = plan.pedidos ?? [];
  const reemplazados = new Set(pedidos.flatMap((p) => p.reemplaza ?? []));
  const pedidoDe = new Map<string, Pick<Pedido, 'id' | 'hecho'>[]>();
  for (const p of pedidos) for (const id of p.notas ?? []) pedidoDe.set(id, [...(pedidoDe.get(id) ?? []), p]);
  const porId = new Map(notas.map((n) => [n.id, n]));
  const antes = (iso: string | undefined) => !!iso && iso < cruce;
  // Un pedido que otro reemplazó ya no deja nada pendiente: sus notas no se protegen por él
  return notasBorrables(notas, { ...plan, pedidos: pedidos.filter((p) => !reemplazados.has(p.id)) }).filter((id) => {
    if (conservadas.has(id)) return false;
    const n = porId.get(id);
    // Cerrada antes de la puerta: su respuesta, o la nota misma si la reemplazó otra sin responderla
    if (!antes(respuestas[id]?.cuando ?? n?.cuando)) return false;
    // Su asunto terminó: cada pedido que la nombra, hecho o reemplazado; la misión sobre la que se dejó, aprobada
    if ((pedidoDe.get(id) ?? []).some((p) => !p.hecho && !reemplazados.has(p.id))) return false;
    const sobre = n?.sobre as { tipo?: string; id?: string } | undefined;
    if (sobre?.tipo === 'mision' && sobre.id && plan.revisiones?.[sobre.id]?.veredicto !== 'aprobada') return false;
    return true;
  });
}

// ── La misión de limpieza tras cada puerta (nota de voz del titular nmwmgrlwbtit, 18 de noviembre de 2026, que reemplaza
// la lista plegada y la elección nota por nota: nmwjm4zrntit, nmwmgq8xbtit, nmwmewgactit): una sola pregunta, «N notas ya
// no hacen falta porque se reemplazaron o ya se aplicaron; ¿las borro?», con «Sí» y «No», sin lista y sin elegir

/** El id de la misión de limpieza tras la puerta de una fase. */
const idDeLimpieza =(fase: string) => `t_limpieza_${fase}`;

/** Las dos opciones, en cada idioma: la primera borra (empieza con «Sí» o «Yes»), la segunda conserva. */
const OPCIONES_LIMPIEZA: Record<'es' | 'en', [string, string]> = { es: ['Sí, bórralas', 'No, consérvalas'], en: ['Yes, delete them', 'No, keep them'] };

/** Si lo elegido en el paso de limpieza es borrar: la primera opción («Sí…» o «Yes…»). Pura. */
export const eligeBorrar = (eleccion: string) => /^(s[ií]|yes)(?=[\s,.!]|$)/i.test(eleccion.trim());

/**
 * Las notas que la persona ya decidió conservar (nmwl4xwfmtit, para siempre): las que ofreció cada misión de limpieza a la
 * que respondió «No», es decir, las cerradas antes de cruzar esa puerta. No se vuelven a ofrecer. Pura.
 */
export function notasConservadas(notas: readonly Nota[], plan: PlanTrasPuerta, cierres: Record<string, { fecha: string }>): Set<string> {
  const kept = new Set<string>();
  for (const [fase, c] of Object.entries(conLosMeses(notas, cierres))) {
    const dijoNo = notas.some((n) => {
      const s = n.sobre as { tipo?: string; id?: string; eleccion?: string } | undefined;
      return s?.tipo === 'mision' && s.id === idDeLimpieza(fase) && typeof s.eleccion === 'string' && !eligeBorrar(s.eleccion);
    });
    if (dijoNo) for (const id of notasTrasLaPuerta(notas, plan, c.fecha)) kept.add(id);
  }
  return kept;
}

/**
 * Las notas que borra «Sí» en la misión de limpieza de la puerta de `fase`: exactamente las que contó la misión
 * (notasTrasLaPuerta con lo cerrado antes de cruzarla, sin las conservadas). Sin cruce, ninguna. Pura.
 */
export function notasDeLaLimpieza(notas: readonly Nota[], plan: PlanTrasPuerta, cierres: Record<string, { fecha: string }>, fase: string): string[] {
  const cruce = cierres[fase]?.fecha ?? inicioDelMes(fase);
  if (!cruce) return [];
  return notasTrasLaPuerta(notas, plan, cruce, notasConservadas(notas, plan, cierres));
}

/**
 * La misión única tras cruzar la puerta de `fase`: la primera de la fase que empieza (`siguiente`), con un solo paso, el
 * conteo y «Sí» o «No». Sin notas que limpiar, no hay misión (nmwkbll1ytit): null. En el idioma de la interfaz. Pura.
 */
export function misionDeLimpieza(
  notas: readonly Nota[],
  plan: PlanTrasPuerta,
  cierres: Record<string, { fecha: string }>,
  datos: { fase: string; siguiente: string; frente: string; idioma: 'es' | 'en' },
): Mision | null {
  const n = notasDeLaLimpieza(notas, plan, cierres, datos.fase).length;
  if (!n) return null;
  const en = datos.idioma === 'en';
  const texto = en
    ? `${n === 1 ? '1 note is' : `${n} notes are`} no longer needed, because ${n === 1 ? 'it was' : 'they were'} replaced or already applied. Delete ${n === 1 ? 'it' : 'them'}? Git keeps the history: the director can still find any of them if you ask.`
    : `${n === 1 ? '1 nota ya no hace falta, porque se reemplazó' : `${n} notas ya no hacen falta, porque se reemplazaron`} o ya se ${n === 1 ? 'aplicó' : 'aplicaron'}. ¿${n === 1 ? 'La borro' : 'Las borro'}? Git conserva la historia: el director puede encontrar cualquiera si se la pides.`;
  return {
    id: idDeLimpieza(datos.fase),
    para: 'titular',
    fase: datos.siguiente,
    frente: datos.frente,
    titulo: en ? 'Clean up the notes that are no longer needed' : 'Limpia las notas que ya no hacen falta',
    porQue: en
      ? `Right after crossing the gate of «${datos.fase}» (pd_rebase_memoria, nmwmgrlwbtit): the memory starts the new phase lighter, with one yes or no.`
      : `Justo tras cruzar la puerta de «${datos.fase}» (pd_rebase_memoria, nmwmgrlwbtit): la memoria empieza la fase nueva más liviana, con un sí o un no.`,
    pasos: [{ texto, opciones: [...OPCIONES_LIMPIEZA[datos.idioma]], limpia: { fase: datos.fase } }],
    entrega: en ? 'Said yes or no to deleting the notes that are no longer needed.' : 'Dijo sí o no a borrar las notas que ya no hacen falta.',
    xp: 10,
    origen: ['pd_rebase_memoria'],
  };
}

/**
 * Desde cuándo una puerta cruzada trae su misión de limpieza: las que se cruzaron antes no la traen de vuelta (cada
 * proyecto la estrena en su próxima puerta, nmwk5o2rbtit).
 */
const LIMPIEZA_DESDE = '2026-11-18T22:00:00.000Z';

/**
 * La misión de limpieza que el plan todavía no tiene (pd_rebase_memoria, nmwjogp16tit: «justo tras la puerta»): la de la
 * última puerta cruzada de la ruta, como primera misión de la fase que empieza, con las notas de todo el proyecto
 * (nmwmns8xstit) y sin las conservadas para siempre (nmwl4xwfmtit). Ninguna si esa puerta se cruzó antes de
 * LIMPIEZA_DESDE, si su misión ya está o ya se usó (`usados`: el plan, su archivo y lo que guardó el equipo), si no hay
 * fase después, o si no cuenta ninguna nota (nmwkbll1ytit). Pura: bandeja.ts la pone en el plan con --aplicar y --listo.
 */
export function limpiezaQueFalta(
  notas: readonly Nota[],
  plan: Omit<PlanTrasPuerta, 'misiones'> & { fases: readonly { id: string }[]; frentes?: readonly { id: string }[]; misiones?: readonly { id?: string; origen?: string[] }[] },
  cierres: Record<string, { fecha: string }>,
  idioma: 'es' | 'en',
  usados: ReadonlySet<string> = new Set(),
): Mision | null {
  let i = -1;
  plan.fases.forEach((f, k) => {
    if (cierres[f.id]) i = k;
  });
  if (i < 0) return null;
  const fase = plan.fases[i].id;
  const siguiente = plan.fases[i + 1]?.id;
  const frente = plan.frentes?.[0]?.id;
  if (!siguiente || !frente || cierres[fase].fecha < LIMPIEZA_DESDE) return null;
  const id = idDeLimpieza(fase);
  if (usados.has(id) || (plan.misiones ?? []).some((m) => m.id === id)) return null;
  return misionDeLimpieza(notas, plan, cierres, { fase, siguiente, frente, idioma });
}

// ── La auditoría y la limpieza de cada mes, una misión (decisiones nmwn1jinktit, nmwnoex0mtit, nmwnz6hg1tit y nmwo2opc1tit):
// en un plan en línea ya no hay puertas que crucen fases, así que la limpieza va una vez al mes, en la primera revisión de
// cada mes, como una misión del lote de ese mes, con dos pasos: la auditoría del director del mes anterior (la medición de
// «Modelo y consumo» › «Lo que gasta») y el sí o no a la limpieza, con el conteo. Su corte es el primer día del mes: la clave
// `mes-AAAA-MM` hace de «fase» en `limpia`, y así el servidor borra con lo mismo que tras una puerta.

/** Desde qué mes la trae la línea: el primero después de decidirlo (noviembre de 2026). */
const AUDITORIA_DESDE = '2026-12';

/** El corte de la limpieza de un mes (`mes-2026-12` → su primer día, en UTC); de otra clave, nada. Pura. */
export function inicioDelMes(clave: string): string | undefined {
  const m = /^mes-(\d{4}-\d{2})$/.exec(clave);
  return m ? `${m[1]}-01T00:00:00.000Z` : undefined;
}

/** Los cierres más los meses cuya misión ya se respondió: «No» conserva para siempre también lo que ofreció un mes. Pura. */
function conLosMeses(notas: readonly Nota[], cierres: Record<string, { fecha: string }>): Record<string, { fecha: string }> {
  const todos = { ...cierres };
  for (const n of notas) {
    const id = (n.sobre as { id?: string } | undefined)?.id;
    const clave = id?.startsWith('t_limpieza_mes-') ? id.slice('t_limpieza_'.length) : undefined;
    const fecha = clave && inicioDelMes(clave);
    if (clave && fecha && !todos[clave]) todos[clave] = { fecha };
  }
  return todos;
}

/** El mes anterior a `mes` («2026-12» → «2026-11»). Pura. */
const mesAnterior = (mes: string) => {
  const [a, m] = mes.split('-').map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`;
};

/** El nombre de un mes en el idioma de la interfaz («November 2026», «noviembre de 2026»). Pura. */
const nombreDelMes = (mes: string, idioma: 'es' | 'en') => {
  const [a, m] = mes.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, 15)).toLocaleDateString(idioma === 'en' ? 'en-US' : 'es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};

/**
 * La misión del mes que el plan todavía no tiene: solo en un plan en línea, desde AUDITORIA_DESDE, en la primera revisión
 * del mes (después ya está en el plan o en lo usado). Su primer paso es la auditoría del mes anterior, que el director
 * escribe en su `detalle` (la bandeja se lo pide, y no cierra sin ella: auditoriaSinEscribir); el segundo, el sí o no a la
 * limpieza con el conteo, solo si hay notas que limpiar. `ahora`, ISO. Pura.
 */
export function auditoriaDelMes(
  notas: readonly Nota[],
  plan: Omit<PlanTrasPuerta, 'misiones'> & { linea?: unknown; frentes?: readonly { id: string }[]; misiones?: readonly { id?: string; origen?: string[] }[] },
  cierres: Record<string, { fecha: string }>,
  idioma: 'es' | 'en',
  ahora: string,
  usados: ReadonlySet<string> = new Set(),
): Mision | null {
  const mes = ahora.slice(0, 7);
  const frente = plan.frentes?.[0]?.id;
  if (!plan.linea || !frente || mes < AUDITORIA_DESDE) return null;
  const clave = `mes-${mes}`;
  const id = idDeLimpieza(clave);
  if (usados.has(id) || (plan.misiones ?? []).some((m) => m.id === id)) return null;
  const en = idioma === 'en';
  const antes = nombreDelMes(mesAnterior(mes), idioma);
  const auditoria: Paso = {
    texto: en
      ? `How the director did in ${antes}: below this step, what that month's measurement shows (recommendations you approved as they were or changed, steps you asked to explain better, reviews that did not close) and what the director changes because of it. The month's rows are in «Model & usage» › «What it uses». Does it match what you lived?`
      : `Cómo lo hizo el director en ${antes}: debajo de este paso, lo que muestra la medición de ese mes (recomendaciones que aprobaste tal cual o cambiaste, pasos que pediste explicar mejor, revisiones que no cerraron) y lo que el director cambia por eso. Las filas del mes están en «Modelo y consumo» › «Lo que gasta». ¿Coincide con lo que viviste?`,
    ir: { vista: 'modelo', ancla: 'm-consumo', etiqueta: en ? 'See what it uses' : 'Ver lo que gasta' },
    detalle: [],
    opciones: en ? ['Yes, it matches', 'Not quite (I\'ll tell you with ✉)'] : ['Sí, coincide', 'No del todo (te cuento con ✉)'],
  };
  const limpieza = misionDeLimpieza(notas, plan, cierres, { fase: clave, siguiente: FASE_DEL_MES, frente, idioma });
  return {
    id,
    para: 'titular',
    fase: FASE_DEL_MES,
    frente,
    titulo: en ? `The director's audit of ${antes}${limpieza ? ', and the clean-up' : ''}` : `La auditoría del director de ${antes}${limpieza ? ', y la limpieza' : ''}`,
    porQue: en
      ? `The first review of the month brings it (nmwo2opc1tit): the audit of the month before, so a failing habit of the director is seen and fixed, and the yes or no to the memory clean-up (nmwnoex0mtit).`
      : `La primera revisión del mes la trae (nmwo2opc1tit): la auditoría del mes anterior, para ver y corregir un mal hábito del director, y el sí o no a la limpieza de la memoria (nmwnoex0mtit).`,
    pasos: [auditoria, ...(limpieza ? limpieza.pasos : [])],
    entrega: en ? 'Read the month\'s audit and said yes or no to the clean-up.' : 'Leyó la auditoría del mes y dijo sí o no a la limpieza.',
    xp: 15,
    origen: ['pd_una_sola_linea'],
  };
}

/** La fase de lo que va hacia la meta en un plan en línea (director.ts › FASE_DE_LA_LINEA). */
const FASE_DEL_MES = 'meta';

/**
 * La misión del mes cuya auditoría no se escribió: abierta, de un mes, con el `detalle` de su primer paso vacío. La bandeja
 * no cierra con ella (nmwo2opc1tit: la auditoría la hace el director, no la persona). Pura.
 */
export function auditoriaSinEscribir(misiones: readonly Mision[], aprobada: (id: string) => boolean): string[] {
  return misiones
    .filter((m) => m.id.startsWith('t_limpieza_mes-') && !aprobada(m.id))
    .filter((m) => {
      const p = m.pasos[0];
      return typeof p !== 'string' && !(p?.detalle ?? []).some((l) => l.trim());
    })
    .map((m) => m.id);
}

/** El plan con la misión de limpieza que falta, la primera de todas; sin ella, el mismo plan. Pura. */
export function conLimpiezaTrasLaPuerta<P extends { misiones: Mision[] }>(plan: P, mision: Mision | null): P {
  return mision ? { ...plan, misiones: [mision, ...plan.misiones] } : plan;
}

/** El conteo del ensayo (dry-run): cuántas notas se borrarían, cuántas hay y cuántas quedan. Pura. */
export function conteoDeRebase(notas: readonly Nota[], plan: PlanParaRebase): { borrables: number; total: number; quedan: number } {
  const borrables = notasBorrables(notas, plan).length;
  return { borrables, total: notas.length, quedan: notas.length - borrables };
}
