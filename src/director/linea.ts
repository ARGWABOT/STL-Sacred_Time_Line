// El plan en una sola línea hacia la meta (pedido pd_una_sola_linea; nota de voz del titular nmwmwyng3tit y sus decisiones
// del 19 de noviembre de 2026 en una-sola-linea.md, nmwmyxpxvtit a nmwmz48y0tit). Primera rebanada, la de los datos: la
// migración que pasa un plan de fases a la línea, guardando la historia, y lo pendiente como puntos en orden. «Hoy» con la
// línea y la tarjeta es la segunda rebanada; las reglas del director sin fases, la tercera. Puro: recibe y devuelve datos.
import {
  aceptadasSinEjecutar,
  DESPUES,
  esDeCierre,
  estadoMision,
  FASE_DE_LA_LINEA,
  propuestasPorResponder,
  reemplazos,
  type Destino,
  type EstadoDirector,
  type Fase,
  type FaseAntes,
  type Mision,
  type Paso,
  type Persona,
  type Plan,
} from './director.ts';

/**
 * La última pieza de la línea (t_decide_lista_meta, nmwo4ojsntit: «la lista la guarda el director»): la fase «meta» sale
 * de `fases` y queda, sin su id, en `linea.meta` (su lista, lo que mueve, su puerta y su plan); `fases` queda vacía. En
 * memoria vuelve a ser la fase en curso (director.ts › conSuMeta). Si ya está fuera, o el plan no está en línea, igual. Pura.
 */
export function metaFueraDeLasFases(plan: Plan): Plan {
  if (!plan.linea || plan.linea.meta) return plan;
  const fase = plan.fases.find((f) => f.id === FASE_DE_LA_LINEA);
  if (!fase) return plan;
  const { id: _id, ...meta } = fase;
  return { ...plan, fases: plan.fases.filter((f) => f !== fase), linea: { ...plan.linea, meta } };
}

/**
 * Pasa un plan de fases a la línea (decisiones nmwmyxpxvtit, nmwmz1x3ptit y nmwmz23qstit): las fases cuya puerta ya se cerró
 * quedan enteras como historia (`linea.fasesAntes`); la de ahora y las que faltan hasta la meta se juntan en una sola, la
 * meta, con todos sus criterios (la lista de lo que la cumple), su plan en orden y la puerta de la última, que es declarar
 * la meta cumplida. Todo lo que nombraba una fase de antes pasa a la meta y guarda la suya en `faseAntes`; lo de después
 * del lanzamiento queda después de la meta (`fase: "despues"`). Las fases de antes salen a `fasesRetiradas`, para que los
 * botones de la historia sigan llevando a algo. `nombre`, el de la meta en el idioma de la interfaz (sin él, el de la
 * última fase). Si el plan ya está en línea, lo devuelve igual. Pura.
 */
export function planEnLinea(plan: Plan, estado: Pick<EstadoDirector, 'cierres'>, cuando: string, nombre?: string): Plan {
  if (plan.linea) return plan;
  const cerradas = plan.fases.filter((f) => !!estado.cierres[f.id] && !f.sinCierre);
  const juntas = plan.fases.filter((f) => !cerradas.includes(f));
  if (!juntas.length) throw new Error('Todas las fases del plan tienen su puerta cerrada: no queda una meta a la que llevar la línea.');
  const ultima = juntas[juntas.length - 1];
  const frentes: Fase['frentes'] = {};
  for (const f of juntas)
    for (const [id, trabajo] of Object.entries(f.frentes)) frentes[id] = frentes[id] ? { nivel: frentes[id].nivel, que: [frentes[id].que, trabajo.que].filter(Boolean).join(' Then: ') } : { ...trabajo };
  const meta: Fase = {
    id: FASE_DE_LA_LINEA,
    nombre: nombre?.trim() || ultima.nombre,
    etapa: ultima.etapa,
    meta: juntas.map((f) => f.meta).join(' '),
    porQue: juntas.map((f) => f.porQue).join(' '),
    duracion: ultima.duracion,
    puerta: ultima.puerta,
    frentes,
    criterios: juntas.flatMap((f) => f.criterios),
    misiones: juntas.flatMap((f) => f.misiones),
  };
  const antes: FaseAntes[] = plan.fases.filter((f) => f.id !== FASE_DE_LA_LINEA).map((f) => ({ id: f.id, nombre: f.nombre, etapa: f.etapa, puerta: f.puerta, criterios: f.criterios, misiones: cerradas.includes(f) ? f.misiones : [] }));
  const viejas = new Set(antes.map((f) => f.id));
  const aLaMeta = <T extends { fase: string; faseAntes?: string }>(x: T): T => (viejas.has(x.fase) ? { ...x, fase: FASE_DE_LA_LINEA, faseAntes: x.faseAntes ?? x.fase } : x);
  // Lo que se marca con la puerta de una fase o lleva a ella, en lo que sigue abierto: a la meta
  const destino = (d: Destino | undefined): Destino | undefined => (d?.fase && viejas.has(d.fase) ? { ...d, fase: FASE_DE_LA_LINEA } : d);
  const paso = (p: Paso): Paso => {
    if (typeof p === 'string') return p;
    const hecho = p.hecho?.que === 'puerta' && p.hecho.id && viejas.has(p.hecho.id) ? { ...p.hecho, id: FASE_DE_LA_LINEA } : p.hecho;
    return { ...p, ...(p.ir ? { ir: destino(p.ir) } : {}), ...(hecho ? { hecho } : {}) } as Paso;
  };
  const mision = (m: Mision): Mision => {
    const movida = aLaMeta(m);
    return movida === m ? m : { ...movida, pasos: movida.pasos.map(paso) };
  };
  return {
    ...plan,
    fases: [meta],
    fasesRetiradas: [...new Set([...(plan.fasesRetiradas ?? []), ...viejas])],
    linea: { desde: cuando, fasesAntes: antes },
    misiones: plan.misiones.map(mision),
    propuestas: plan.propuestas.map(aLaMeta),
    pedidos: plan.pedidos?.map(aLaMeta),
    adelantado: plan.adelantado.map(aLaMeta),
  };
}

/** Un punto de la línea: qué es, de qué color va y si es de los finales. */
export interface PuntoDeLinea {
  id: string;
  tipo: 'mision' | 'pedido' | 'propuesta';
  /** `persona`: una misión tuya (amarillo); `director`: lo que el director construye (aquamarina); `espera`: una propuesta que espera tu respuesta (gris). */
  color: 'persona' | 'director' | 'espera';
  /** Los puntos finales (la prueba en un computador limpio, la subida): al final, antes de la bandera. */
  final: boolean;
  /** Para quién es, si es una misión. */
  para?: Persona;
  /** Ya entregada en esta tanda, sin revisar todavía: se pinta marcada (hechosDeLaTanda). */
  hecho?: boolean;
}

/**
 * Lo pendiente como una sola línea, en el orden del director (decisión nmwmyypmutit): las misiones sin entregar, lo que el
 * director construye (pedidos sin hacer y propuestas aceptadas sin ejecutar) y las propuestas que esperan respuesta. Primero
 * lo que `linea.orden` nombra, en su orden; después el resto, en el orden del plan (misiones, la cola del director y las
 * propuestas por responder); los puntos finales siempre al final. Lo de después de la meta y lo reemplazado no está. Pura.
 */
export function puntosDeLaLinea(plan: Plan, estado: EstadoDirector): PuntoDeLinea[] {
  const fuera = reemplazos(plan);
  const puntos: PuntoDeLinea[] = [];
  for (const m of plan.misiones)
    if (m.fase !== DESPUES && !['entregada', 'aprobada'].includes(estadoMision(m, plan, estado))) puntos.push({ id: m.id, tipo: 'mision', color: 'persona', final: esDeCierre(m) || !!m.pruebaDelTodo, para: m.para });
  const aceptadas = aceptadasSinEjecutar(plan, estado).map((x) => x.propuesta);
  const director = [...(plan.pedidos ?? []).filter((p) => !p.hecho && p.fase !== DESPUES && !fuera.has(p.id)).map((p) => ({ id: p.id, tipo: 'pedido' as const, final: !!p.alCierre })), ...aceptadas.map((p) => ({ id: p.id, tipo: 'propuesta' as const, final: !!p.alCierre }))];
  const enCola = new Map((plan.colaDirector ?? []).map((id, i) => [id, i]));
  director.sort((a, b) => (enCola.get(a.id) ?? Infinity) - (enCola.get(b.id) ?? Infinity));
  for (const d of director) puntos.push({ ...d, color: 'director' });
  for (const p of propuestasPorResponder(plan, estado)) puntos.push({ id: p.id, tipo: 'propuesta', color: 'espera', final: !!p.alCierre });
  const orden = new Map((plan.linea?.orden ?? []).map((id, i) => [id, i]));
  const enOrden = puntos.map((p, i) => ({ p, i })).sort((a, b) => Number(a.p.final) - Number(b.p.final) || (orden.get(a.p.id) ?? Infinity) - (orden.get(b.p.id) ?? Infinity) || a.i - b.i);
  return enOrden.map((x) => x.p);
}

/** Cuántos puntos se ven antes de plegar el resto (decisión nmwn1gkpytit): tus diez misiones a mano y dos del director. */
export const PUNTOS_A_LA_VISTA = 12;

/**
 * Las misiones de esta tanda que la persona ya entregó y el director aún no revisó, en el orden en que las entregó (nota
 * nmwnnb5aitit, 19 de noviembre de 2026: «que se vaya viendo cómo se avanza» hacia la bandera antes de pedir la revisión).
 * Quedan en la línea, marcadas como hechas, delante de lo que falta; con la revisión, aprobadas, salen. Pura.
 */
export function hechosDeLaTanda(plan: Plan, estado: EstadoDirector, persona?: Persona): PuntoDeLinea[] {
  return plan.misiones
    .filter((m) => m.fase !== DESPUES && (!persona || m.para === persona) && estadoMision(m, plan, estado) === 'entregada')
    .sort((a, b) => (estado.entregas[a.id]?.cuando ?? '').localeCompare(estado.entregas[b.id]?.cuando ?? ''))
    .map((m) => ({ id: m.id, tipo: 'mision' as const, color: 'persona' as const, final: esDeCierre(m) || !!m.pruebaDelTodo, para: m.para, hecho: true }));
}

/**
 * La línea como se pinta en «Hoy» (segunda rebanada; decisiones del 19 de noviembre de 2026): los primeros doce puntos a la
 * vista y el resto plegado en «y N más» (nmwn1gkpytit), salvo que se haya abierto; la bandera dice cuántos quedan, nunca un
 * porcentaje (nmwn1gup1tit); y el punto de ahora es tu primera misión (nmwn1fh8etit). El Studio es para una persona que
 * desarrolla sola (nmwno0btttit): con `persona`, las misiones de otra no están. Lo ya entregado de la tanda (`hechos`) va
 * delante, marcado (nmwnnb5aitit): no cuenta en lo que queda, pero sí entre los doce a la vista, para que la línea nunca
 * se alargue (nmwnz2wrvtit): lo que falta se pliega un poco antes a medida que entregas. Pura.
 */
export function lineaDeHoy(puntos: readonly PuntoDeLinea[], o: { persona?: Persona; abierta?: boolean; aLaVista?: number; hechos?: readonly PuntoDeLinea[] } = {}): { visibles: PuntoDeLinea[]; hechos: PuntoDeLinea[]; plegados: number; quedan: number; actual: string | null } {
  const tope = o.abierta ? Infinity : Math.max(0, (o.aLaVista ?? PUNTOS_A_LA_VISTA) - (o.hechos?.length ?? 0));
  const suyos = puntos.filter((p) => !o.persona || p.color !== 'persona' || !p.para || p.para === o.persona);
  const visibles = suyos.slice(0, tope);
  const actual = suyos.find((p) => p.color === 'persona' && !p.final)?.id ?? null;
  return { visibles, hechos: [...(o.hechos ?? [])], plegados: suyos.length - visibles.length, quedan: suyos.length, actual };
}

/**
 * Antes de que el proyecto tenga su meta, una línea corta con solo los pasos para llegar a ella, y la bandera vacía
 * (decisión nmwn1hld9tit): leer el diagnóstico y fijar la meta. El que ya pasó no está. Pura.
 */
export function lineaSinMeta(o: { diagnosticoLeido: boolean }): ('diagnostico' | 'meta')[] {
  return o.diagnosticoLeido ? ['meta'] : ['diagnostico', 'meta'];
}

/** Lo que queda después de la meta, plegado tras la bandera (decisión nmwmz31bgtit): los pedidos de «después». Pura. */
export const despuesDeLaMeta = (plan: Plan): string[] => (plan.pedidos ?? []).filter((p) => p.fase === DESPUES && !p.hecho && !reemplazos(plan).has(p.id)).map((p) => p.id);
