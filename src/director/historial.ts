// El historial de decisiones de cada proyecto (propuesta aceptada «El núcleo del director, medido con casos fijos»,
// pr_nucleo_medido, punto 1): por cada recomendación del director, lo que eligió la persona y cómo salió, sacado sin modelo
// de lo que el Studio ya guarda en la memoria del proyecto (las notas del equipo, las revisiones de las misiones con su
// archivo y las propuestas respondidas). La bandeja le sirve al director solo el del proyecto que revisa: al cambiar de
// proyecto cambia el historial, y nada de uno pasa a otro. Es también la medida de su criterio («El criterio del director,
// escrito y medido», pr_criterio_director, punto 3): ver sus fallas, no rehacerlas.
import { decideDecision, enUnaLinea, textoPlano, type EstadoDirector, type Nota, type Plan } from './director.ts';

/** Lo que recomendó el director en un proyecto y cómo salió, en cifras y con lo último que salió distinto. */
export interface HistorialDeDecisiones {
  /** Las decisiones de los documentos (la última nota de cada una): con «Apruebo lo que recomiendas», o con sus palabras. */
  decisiones: { talCual: number; conSusPalabras: number };
  /** Las propuestas respondidas. */
  propuestas: { aceptadas: number; descartadas: number };
  /** Las misiones revisadas, por su veredicto de ahora, y las que se entregaron sin terminar («No me salió»). */
  misiones: { aprobadas: number; rehacer: number; sinTerminar: number };
  /** Los pasos que alguien no entendió («No lo entiendo, explícamelo mejor»). */
  aclaraciones: number;
  /** Lo último que no se aprobó tal cual como lo recomendó el director, de lo más nuevo a lo más viejo. */
  distinto: { cuando: string; que: string; dijo: string }[];
}

/** Cuántas de las que salieron distinto sirve la bandeja: las últimas, que son las que enseñan algo de hoy. */
export const MAX_DISTINTO = 6;

/**
 * El historial de un proyecto. `plan`: el plan unido con su archivo (memoria.ts › leerPlanUnido), para contar también lo
 * cerrado. `textoDe`: lo que dice una nota (su texto o la transcripción de su audio), que la bandeja lee del disco. Pura.
 */
export function historialDeDecisiones(plan: Plan, estado: EstadoDirector, textoDe: (n: Nota) => string = (n) => n.texto ?? '', max = MAX_DISTINTO): HistorialDeDecisiones {
  const distinto: HistorialDeDecisiones['distinto'] = [];
  // Cada decisión, por la última nota que la decide (otra posterior sobre la misma decisión la reemplaza), con la misma
  // llave que «Lo vigente» (decisionesVigentes); aquí cuenta también lo reemplazado: fue una recomendación respondida
  const ultima = new Map<string, Nota>();
  for (const n of estado.notas.filter(decideDecision).sort((a, b) => a.cuando.localeCompare(b.cuando)))
    ultima.set(`${n.sobre.id}\u0000${textoPlano(n.sobre.seccion ?? '')}\u0000${n.sobre.decision}`, n);
  const decisiones = { talCual: 0, conSusPalabras: 0 };
  for (const n of ultima.values()) {
    if (n.sobre.postura === 'aprueba') decisiones.talCual++;
    else {
      decisiones.conSusPalabras++;
      distinto.push({ cuando: n.cuando, que: `decisión «${n.sobre.decision}» de ${(n.sobre.id ?? '').replace(/^docs\/director\//, '')}, con sus palabras`, dijo: textoDe(n) });
    }
  }
  const propuestas = { aceptadas: 0, descartadas: 0 };
  for (const [id, r] of Object.entries(estado.propuestas)) {
    if (r.estado === 'aceptada') propuestas.aceptadas++;
    if (r.estado !== 'descartada') continue;
    propuestas.descartadas++;
    distinto.push({ cuando: r.fecha, que: `propuesta descartada «${plan.propuestas.find((p) => p.id === id)?.titulo ?? id}»`, dijo: r.nota ?? '' });
  }
  const misiones = { aprobadas: 0, rehacer: 0, sinTerminar: Object.values(estado.entregas).filter((e) => e.sinTerminar !== undefined).length };
  for (const [id, r] of Object.entries(plan.revisiones ?? {})) {
    if (r.veredicto === 'aprobada') misiones.aprobadas++;
    if (r.veredicto !== 'rehacer') continue;
    misiones.rehacer++;
    distinto.push({ cuando: r.cuando, que: `misión para rehacer «${plan.misiones.find((m) => m.id === id)?.titulo ?? id}»`, dijo: r.comentario });
  }
  const aclaraciones = estado.notas.filter((n) => n.sobre?.tipo === 'mision' && n.sobre.aclarar).length;
  distinto.sort((a, b) => b.cuando.localeCompare(a.cuando));
  return { decisiones, propuestas, misiones, aclaraciones, distinto: distinto.slice(0, max) };
}

/** El historial en la bandeja: tres líneas de cifras y lo último que salió distinto, una línea cada cosa. Pura. */
export function lineasDelHistorial(h: HistorialDeDecisiones): string[] {
  const { decisiones: d, propuestas: p, misiones: m } = h;
  const l: string[] = [];
  if (d.talCual + d.conSusPalabras) l.push(`- Decisiones de los documentos: ${d.talCual + d.conSusPalabras}; ${d.talCual} con «Apruebo lo que recomiendas» y ${d.conSusPalabras} con sus palabras (iguales o distintas a tu recomendación).`);
  if (p.aceptadas + p.descartadas) l.push(`- Propuestas respondidas: ${p.aceptadas} aceptadas y ${p.descartadas} descartadas.`);
  if (m.aprobadas + m.rehacer + m.sinTerminar + h.aclaraciones) l.push(`- Misiones revisadas: ${m.aprobadas} aprobadas y ${m.rehacer} para rehacer; ${m.sinTerminar} entregadas sin terminar y ${h.aclaraciones} pasos con «No lo entiendo».`);
  if (h.distinto.length) {
    l.push('Lo último que no se aprobó tal cual, para aprender de ello y no repetirlo (no es trabajo nuevo):');
    for (const x of h.distinto) l.push(`- ${x.cuando.slice(0, 10)} · ${x.que}${x.dijo.trim() ? `: «${enUnaLinea(x.dijo, 200)}»` : ''}`);
  }
  return l;
}
