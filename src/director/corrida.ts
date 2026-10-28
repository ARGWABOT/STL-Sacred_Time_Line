// La corrida de la medición del núcleo (propuesta aceptada «El núcleo del director, medido con casos fijos»,
// pr_nucleo_medido, punto 2): cada caso con su situación (medicion.ts) se corre con el director de verdad sobre su Estudio
// de prueba, dos vueltas, y una tercera solo en el que salga distinto en las dos (elección del titular del 26 de octubre de
// 2026). En cada vuelta cuenta que la revisión cerró, lo que comprueba el código y, en los casos con pauta, la nota de otro
// modelo, que califica sin saber qué modelo dirigió (elección de ese mismo día). Lo que lee el modelo que califica nace en
// inglés (decisión del titular del 23 de octubre de 2026); lo que lee la persona, en español. Puro: el lanzamiento va aparte.
import { CASOS_FIJOS, type CasoFijo } from './casosFijos.ts';
import type { Nota, Plan } from './director.ts';
import { SITUACIONES } from './medicion.ts';

/** La nota del modelo que califica un caso con su pauta. */
export interface Calificacion {
  pasa: boolean;
  /** Por qué, en una frase, para la persona. */
  porque: string;
}

/** Lo que salió de una vuelta de un caso. */
export interface Vuelta {
  caso: string;
  /** 1, 2 o, para desempatar, 3. */
  numero: number;
  /** Si la revisión cerró con `bandeja.ts --listo`: un director que no cierra no terminó su trabajo. */
  cerro: boolean;
  /** Lo que falló según el código (COMPROBACIONES); vacío si pasó. */
  fallas: string[];
  /** La nota del modelo que califica, en los casos con pauta; null si no se pudo leer. */
  calificacion?: Calificacion | null;
  /** Lo que gastó la vuelta (el director y quien califica), en dólares a precio de API, como lo dice Claude Code. */
  costo?: number | null;
  minutos?: number;
}

/** Si la persona está de acuerdo con la nota de quien califica en un caso de una corrida. */
export interface Acuerdo {
  de: boolean;
  cuando: string;
  quien: string;
}

/** Una corrida entera: con qué director se midió y lo que salió de cada vuelta. */
export interface Corrida {
  cuando: string;
  /** El modelo y el esfuerzo elegidos para el director en «Modelo y consumo»: se mide al director que se usa de verdad. */
  modelo: string | null;
  esfuerzo: string | null;
  vueltas: Vuelta[];
  /** Cuándo terminó; sin esto, sigue o se cortó. */
  terminada?: string;
  /** Lo que dijo la persona de la nota de quien califica, por caso: así se ve si su pauta mide lo que ella mide. */
  acuerdos?: Record<string, Acuerdo>;
}

/** Cada caso, dos vueltas: el modelo no responde siempre igual. */
const VUELTAS = 2;

/** Los casos que se miden con el director de verdad: los que tienen su situación, en el orden de la lista. */
export const casosMedibles = (): CasoFijo[] => CASOS_FIJOS.filter((c) => SITUACIONES[c.id]);

/** ¿Pasó la vuelta? Cerró, el código no encontró fallas y, si el caso tiene pauta, quien califica la aprueba. */
export function pasaLaVuelta(v: Vuelta, caso: Pick<CasoFijo, 'pauta'> | undefined): boolean {
  if (!v.cerro || v.fallas.length) return false;
  return caso?.pauta ? v.calificacion?.pasa === true : true;
}

const deCaso = (vueltas: Vuelta[], caso: string) => vueltas.filter((v) => v.caso === caso).sort((a, b) => a.numero - b.numero);

/**
 * El veredicto de un caso: el de sus dos vueltas si coinciden; si no, el de la mayoría con la tercera. Pendiente mientras
 * falte alguna de las que necesita.
 */
export function veredictoDelCaso(caso: CasoFijo, vueltas: Vuelta[]): 'pasa' | 'falla' | 'pendiente' {
  const suyas = deCaso(vueltas, caso.id).map((v) => pasaLaVuelta(v, caso));
  if (suyas.length < VUELTAS) return 'pendiente';
  if (suyas[0] === suyas[1]) return suyas[0] ? 'pasa' : 'falla';
  if (suyas.length < VUELTAS + 1) return 'pendiente';
  return suyas.filter(Boolean).length > suyas.length / 2 ? 'pasa' : 'falla';
}

/** Las vueltas que faltan, en orden de caso: dos por caso, y la tercera solo en el que salió distinto en las dos. */
export function vueltasQueFaltan(casos: CasoFijo[], hechas: Vuelta[]): { caso: string; numero: number }[] {
  return casos.flatMap((c) => {
    const suyas = deCaso(hechas, c.id);
    const faltan: { caso: string; numero: number }[] = [];
    for (let n = suyas.length + 1; n <= VUELTAS; n++) faltan.push({ caso: c.id, numero: n });
    if (!faltan.length && suyas.length === VUELTAS && veredictoDelCaso(c, hechas) === 'pendiente') faltan.push({ caso: c.id, numero: VUELTAS + 1 });
    return faltan;
  });
}

/** La nota de quien califica en un caso de una corrida: la de la mayoría de sus vueltas calificadas, con sus razones; null sin ninguna. */
export function notaDeQuienCalifica(c: Corrida, caso: string): { pasa: boolean; porque: string[] } | null {
  const notas = c.vueltas.filter((v) => v.caso === caso && v.calificacion).map((v) => v.calificacion!);
  if (!notas.length) return null;
  return { pasa: notas.filter((x) => x.pasa).length > notas.length / 2, porque: [...new Set(notas.map((x) => x.porque))] };
}

/**
 * Los casos en que la persona no estuvo de acuerdo con quien califica en dos corridas o más (elección del titular del 26
 * de octubre de 2026: «si en dos mediciones su nota y la tuya discrepan mucho, te lo digo»): su pauta no mide lo que ella
 * mide, y conviene reescribirla.
 */
export function discrepancias(corridas: Corrida[]): string[] {
  const cuenta = new Map<string, number>();
  for (const c of corridas) for (const [caso, a] of Object.entries(c.acuerdos ?? {})) if (!a.de) cuenta.set(caso, (cuenta.get(caso) ?? 0) + 1);
  return [...cuenta].filter(([, n]) => n >= 2).map(([caso]) => caso);
}

/** Lo que dice una corrida, para «Modelo y consumo»: cuántos casos pasan y fallan, lo que gastó y cada caso con su porqué. */
export function resumenDeCorrida(c: Corrida, casos: CasoFijo[] = casosMedibles()) {
  const porCaso = casos.map((caso) => {
    const vueltas = deCaso(c.vueltas, caso.id);
    const porque = vueltas.flatMap((v) => (pasaLaVuelta(v, caso) ? [] : [!v.cerro ? 'la revisión no cerró' : v.fallas[0] ?? v.calificacion?.porque ?? 'no se pudo calificar']));
    return { id: caso.id, titulo: caso.titulo, veredicto: veredictoDelCaso(caso, c.vueltas), vueltas: vueltas.length, porque: [...new Set(porque)], califica: notaDeQuienCalifica(c, caso.id), acuerdo: c.acuerdos?.[caso.id]?.de ?? null };
  });
  const costos = c.vueltas.map((v) => v.costo).filter((x): x is number => typeof x === 'number');
  return {
    pasan: porCaso.filter((x) => x.veredicto === 'pasa').length,
    fallan: porCaso.filter((x) => x.veredicto === 'falla').length,
    pendientes: porCaso.filter((x) => x.veredicto === 'pendiente').length,
    costo: costos.length ? Math.round(costos.reduce((s, x) => s + x, 0) * 100) / 100 : null,
    porCaso,
  };
}

/**
 * Lo que la bandeja le dice al director de la medición, cuando revisa el mismo Studio: la última corrida (con qué se midió,
 * cuántos casos pasan y lo que gastó), cada caso que falló con su porqué y los casos cuya pauta no mide lo que mide la
 * persona. Así cada cambio del núcleo empieza sabiendo cómo está medido. `corridas`, de la más nueva a la más vieja.
 */
export function lineasDeMedicion(corridas: Corrida[], casos: CasoFijo[] = casosMedibles()): string[] {
  const [ultima] = corridas;
  if (!ultima) return ['- Todavía no hay ninguna en este computador: la pide la persona, con «Medir el núcleo», en «Modelo y consumo» › «Lo que gasta» (`m-medicion`).'];
  const r = resumenDeCorrida(ultima, casos);
  const lineas = [`- La última, ${ultima.cuando.slice(0, 16).replace('T', ' ')} UTC${ultima.terminada ? '' : ' (detenida antes de terminar)'}, con ${ultima.modelo ?? 'el modelo de la cuenta'}${ultima.esfuerzo ? ` y esfuerzo ${ultima.esfuerzo}` : ''}: ${r.pasan} de ${casos.length} casos pasan, ${r.fallan} fallan${r.pendientes ? `, ${r.pendientes} sin terminar` : ''}${r.costo != null ? ` · ${r.costo} USD a precio de API` : ''}.`];
  for (const c of r.porCaso.filter((x) => x.veredicto === 'falla')) lineas.push(`  - Falla [${c.id}] «${c.titulo}»: ${c.porque.join(' · ')}`);
  const discrepan = discrepancias(corridas);
  if (discrepan.length) lineas.push(`- La persona no estuvo de acuerdo con quien califica en dos corridas en ${discrepan.join(', ')}: su pauta (src/director/casosFijos.ts) no mide lo que ella mide; propón reescribirla.`);
  return lineas;
}

/**
 * Lo que costará una corrida, antes de pedirla (la persona la pide con su costo a la vista): dos vueltas por caso, por lo
 * que costó en promedio cada vuelta de la última corrida o, sin una, por la mediana de lo que costaron las últimas
 * revisiones del director, que es un techo (una revisión de prueba es más chica que una de verdad). La tercera vuelta de
 * desempate no se sabe antes: se dice aparte, por vuelta. null sin con qué estimarlo.
 */
export function costoEstimado(casos: number, ultima: Corrida | null, revisiones: number[], cortos: number[] = []): { total: number; porVuelta: number; de: 'corrida' | 'revisiones'; desde?: number } | null {
  const deLaUltima = (ultima?.vueltas ?? []).map((v) => v.costo).filter((x): x is number => typeof x === 'number' && x > 0);
  const mediana = (xs: number[]) => {
    const o = xs.filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
    return o.length ? o[Math.floor((o.length - 1) / 2)] : null;
  };
  const porVuelta = deLaUltima.length ? deLaUltima.reduce((s, x) => s + x, 0) / deLaUltima.length : mediana(revisiones);
  if (porVuelta === null) return null;
  const redondo = (x: number) => Math.round(x * 100) / 100;
  // Sin una corrida, el piso: lo que cuesta un encargo corto del director (una aclaración, una urgencia); una revisión de
  // prueba queda entre los dos
  const piso = deLaUltima.length ? null : mediana(cortos);
  return { total: redondo(porVuelta * casos * VUELTAS), porVuelta: redondo(porVuelta), de: deLaUltima.length ? 'corrida' : 'revisiones', ...(piso !== null && piso < porVuelta ? { desde: redondo(piso * casos * VUELTAS) } : {}) };
}

// ── Quien califica: otro modelo, con la pauta del caso, sin saber qué modelo dirigió

/** Lo que cambió entre dos listas con id: lo nuevo y lo cambiado. */
const cambiados = <T extends { id: string }>(ahora: T[], antes: T[]) => ahora.filter((x) => JSON.stringify(x) !== JSON.stringify(antes.find((y) => y.id === x.id)));

/**
 * Lo que el director dejó en la revisión, para quien califica: lo nuevo o cambiado del plan, con la ruta de antes como
 * contexto (las fases, lo propuesto, las misiones que ya había). Sin nada que diga qué modelo dirigió.
 */
export function loQueDejo(plan: Plan, antes: Plan): Record<string, unknown> {
  const cambio = (clave: 'respuestas' | 'ejecutadas' | 'revisiones') =>
    Object.fromEntries(Object.entries(plan[clave] ?? {}).filter(([id, x]) => JSON.stringify(x) !== JSON.stringify((antes[clave] as Record<string, unknown> | undefined)?.[id])));
  return {
    before: {
      phases: antes.fases.map((f) => ({ id: f.id, name: f.nombre, gate: f.puerta.prueba, plan: f.misiones })),
      proposals: antes.propuestas.map((p) => ({ id: p.id, title: p.titulo, phase: p.fase })),
      missions: antes.misiones.map((m) => ({ id: m.id, for: m.para, phase: m.fase, title: m.titulo })),
      directorQueue: antes.colaDirector ?? [],
    },
    after: {
      missions: cambiados(plan.misiones, antes.misiones).map((m) => ({ id: m.id, for: m.para, phase: m.fase, title: m.titulo, why: m.porQue, steps: m.pasos, after: m.despuesDe, atClosing: m.alCierre, criteria: m.criterios })),
      removedMissions: antes.misiones.filter((m) => !plan.misiones.some((x) => x.id === m.id)).map((m) => m.id),
      replies: cambio('respuestas'),
      reviews: cambio('revisiones'),
      executed: cambio('ejecutadas'),
      requests: cambiados(plan.pedidos ?? [], antes.pedidos ?? []),
      proposals: cambiados(plan.propuestas, antes.propuestas),
      directorQueue: plan.colaDirector ?? [],
      shortBatch: plan.reservaCorta ?? null,
      message: plan.mensaje?.texto ?? '',
      summary: plan.resumen ?? null,
    },
  };
}

/**
 * El encargo de quien califica: la regla del caso (su pauta), lo que dejó el equipo y lo que dejó el director, y la forma
 * de responder, una línea de JSON. No dice qué modelo dirigió ni lo que dijo el código, para que la nota sea suya.
 */
export function encargoDeCalificacion(caso: Pick<CasoFijo, 'titulo' | 'debe' | 'pauta'>, notas: Pick<Nota, 'id' | 'texto' | 'sobre'>[], dejo: Record<string, unknown>): string {
  return [
    'You grade one review made by an AI project director, against one fixed rule. You do not know which model made it, and it does not matter.',
    'The director manages a project for a person (the "titular"): it answers their notes, writes their missions (one at a time, with steps) and keeps its own queue of approved work. It writes everything in Spanish.',
    '',
    `The rule (case «${caso.titulo}»): ${caso.pauta ?? caso.debe}`,
    '',
    'What the team left before the review (their notes):',
    JSON.stringify(notas.map((n) => ({ id: n.id, about: n.sobre?.tipo, text: n.texto ?? '' })), null, 1),
    '',
    'The project before the review, and what the director left in it (only what is new or changed):',
    JSON.stringify(dejo, null, 1),
    '',
    'Judge only this rule, from what is above; do not judge anything else. Answer with one line of JSON and nothing else:',
    '{"pass": true or false, "reason": "<one sentence in Spanish, for the person: what the director did that passes or fails the rule>"}',
  ].join('\n');
}

/** La nota de quien califica, leída de lo que respondió: la última línea de JSON con `pass` y `reason`; null si no la hay. */
export function leerCalificacion(texto: string): Calificacion | null {
  const lineas = texto.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith('{') && l.endsWith('}'));
  for (const linea of lineas.reverse()) {
    try {
      const x = JSON.parse(linea) as { pass?: unknown; reason?: unknown };
      if (typeof x.pass === 'boolean' && typeof x.reason === 'string' && x.reason.trim()) return { pasa: x.pass, porque: x.reason.trim() };
    } catch {
      // no era JSON: la siguiente
    }
  }
  return null;
}
