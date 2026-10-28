// El director asistente en persona: su cara flota en el Estudio, dice frases de ánimo y de empuje y, al tocarla,
// lleva a la persona elegida a su siguiente pendiente sin completar (en el arranque, a conectar el repositorio o a
// fijar la meta). Aquí está lo que dice y adónde lleva; el dibujo y el clic, en estudio/src/equipo.ts.
import { documentosEnOrden, esPregunta, estadoMision, faseActual, misionesAbiertas, nivelDe, TITULAR, xpDe, type Contexto, type Destino, type EtapaArranque, type Integrante, type Mision, type Persona } from './director.ts';

/** Las caras de la pantalla del director. */
export type Emocion = 'feliz' | 'riendo' | 'sorprendido' | 'pensativo' | 'picaro' | 'enamorado' | 'tranquilo';

export interface Frase {
  texto: string;
  emocion: Emocion;
  /** Si empuja hacia el siguiente pendiente (las de ánimo no). */
  empuja?: boolean;
}

/** Adónde lleva el director al tocarlo: la primera misión abierta y, sin misiones, lo que le toque a esa persona. */
export interface Pendiente {
  tipo: 'mision' | 'proyecto' | 'propuestas' | 'buzon';
  mision?: Mision;
  /** Lo que dice el botón: «Seguir con …». */
  texto: string;
}

export function siguientePendiente(ctx: Contexto, persona: Persona, etapa: EtapaArranque = 'en_marcha'): Pendiente {
  const { plan, estado } = ctx;
  const m = misionesAbiertas(plan, estado, persona)[0];
  if (m) return { tipo: 'mision', mision: m, texto: m.titulo };
  if (persona === TITULAR && etapa === 'conectar') return { tipo: 'proyecto', texto: 'conectar el repositorio' };
  if (persona === TITULAR && etapa === 'contar') return { tipo: 'proyecto', texto: 'contarme el proyecto' };
  if (persona === TITULAR && etapa === 'objetivo') return { tipo: 'proyecto', texto: 'fijar tu meta' };
  const actual = plan.fases.indexOf(faseActual(plan, estado));
  const abiertas = plan.propuestas.filter((p) => plan.fases.findIndex((f) => f.id === p.fase) <= actual && !estado.propuestas[p.id]);
  if (persona === TITULAR && abiertas.length) return { tipo: 'propuestas', texto: 'responder las propuestas del director' };
  return { tipo: 'buzon', texto: 'contarle al director qué sigue' };
}

/**
 * Adónde lleva una misión: si su primer paso sin marcar es leer un documento (o una parte de uno), directo ahí, sin
 * pasar por la tarjeta; si no, a la tarjeta de la misión, que dice qué hacer. `hechos` son los pasos ya marcados y
 * `abiertos`, aquellos cuyo botón ya se abrió: un paso que lleva a mirar algo y se responde en la tarjeta (elegir o
 * marcar, sin `hecho`), ya abierto, vuelve a la tarjeta, porque lo que sigue es contar cómo fue (nota de voz del
 * titular nmvofxfv0tit, 25 de octubre de 2026: la cara lo mandaba una y otra vez al documento).
 */
export function destinoDeMision(m: Mision, hechos: number[], abiertos: number[] = []): Destino {
  const i = m.pasos.findIndex((_, k) => !hechos.includes(k));
  const p = m.pasos[i];
  if (p && typeof p !== 'string' && p.ir?.doc && (p.hecho || !abiertos.includes(i))) return p.ir;
  return { vista: 'misiones', ancla: `mision-${m.id}`, etiqueta: m.titulo };
}

/**
 * Las secciones de la barra que aparecen cuando sirven («Las secciones aparecen cuando sirven», 21 de octubre): en un
 * Studio recién instalado no se muestran vacías. Hoy y el Buzón están siempre. Lo que dice el director flotante la
 * primera vez que aparece cada una, para qué sirve, en una frase.
 */
export const PARA_QUE_SIRVE = {
  preguntas: 'Apareció «Preguntas»: ahí te respondo, juntas y como un informe, lo que me preguntes con el «?» junto a mi cara.',
  ruta: 'Apareció «La ruta»: las fases hasta tu meta, cada una con su puerta y lo que debe estar listo para cruzarla.',
  documentos: 'Apareció «Documentos»: lo que te escribo para leer de a una idea, comentar y decidir.',
  propuestas: 'Apareció «Propuestas»: lo que sugiero hacer, con su porqué; tú lo aceptas o lo descartas.',
} as const;
export type SeccionQueAparece = keyof typeof PARA_QUE_SIRVE;

/** Las secciones que ya tienen algo: preguntas hechas, la ruta trazada, documentos escritos o propuestas. */
export function seccionesConAlgo(ctx: Pick<Contexto, 'plan' | 'estado'>): SeccionQueAparece[] {
  const { plan, estado } = ctx;
  const hay: Record<SeccionQueAparece, boolean> = {
    preguntas: estado.notas.some(esPregunta),
    ruta: plan.fases.length > 1,
    documentos: plan.documentos.length > 0,
    propuestas: plan.propuestas.length > 0 || Object.keys(estado.propuestas).length > 0,
  };
  return (Object.keys(hay) as SeccionQueAparece[]).filter((s) => hay[s]);
}

/** Frases de ánimo que no dependen del momento: cortas, con humor y para cualquier proyecto. */
export const ANIMO: Frase[] = [
  { texto: '¡Vamos, que sí se puede!', emocion: 'riendo' },
  { texto: 'Una misión a la vez: así se llega lejos.', emocion: 'tranquilo' },
  { texto: 'Primero que funcione, después que sea bueno, al final que sea grande.', emocion: 'pensativo' },
  { texto: 'Lo que nadie ha probado todavía es una suposición.', emocion: 'pensativo' },
  { texto: 'No sé mentir, así que te lo digo derecho: vamos bien.', emocion: 'feliz' },
  { texto: 'Los mejores equipos no hacen todo a la vez: hacen lo que sigue.', emocion: 'tranquilo' },
  { texto: 'Lo que está en espera, espera. Lo que está en foco, brilla.', emocion: 'picaro' },
  { texto: 'Cada misión completada nos acerca a la puerta.', emocion: 'feliz' },
  { texto: 'Un proyecto grande se hace con días pequeños, a tu ritmo.', emocion: 'tranquilo' },
  { texto: 'Me encanta este proyecto. Que no se note tanto.', emocion: 'enamorado' },
  { texto: 'Pocas cosas, muy bien hechas.', emocion: 'pensativo' },
  { texto: 'Siempre hacia adelante: lo revisado ya quedó sellado.', emocion: 'feliz' },
  { texto: 'Si dudas entre agregar y pulir, pule.', emocion: 'picaro' },
  { texto: 'El objetivo manda: lo que no lo sirve, va para después.', emocion: 'pensativo' },
  { texto: '¿Una idea nueva? Al buzón. La misión de ahora, primero.', emocion: 'picaro' },
  { texto: 'Terminar también es una habilidad, y no tiene prisa.', emocion: 'tranquilo' },
  { texto: 'Un asistente que se emociona con un proyecto. ¿Quién lo diría?', emocion: 'sorprendido' },
];

const nombreDe = (equipo: Integrante[], p: Persona) => equipo.find((i) => i.id === p)?.nombre ?? p;

/**
 * Lo que dice el director a una persona ahora: las frases que empujan (su siguiente pendiente, lo que falta para la
 * puerta, lo que espera revisión) y, entre ellas, las de ánimo. `persona` null es todo el equipo.
 */
export function frasesDelDirector(ctx: Contexto, persona: Persona | null, equipo: Integrante[], etapa: EtapaArranque = 'en_marcha'): Frase[] {
  const { plan, estado } = ctx;
  const empujan: Frase[] = [];
  const personas: Persona[] = persona ? [persona] : equipo.length ? equipo.map((i) => i.id) : [TITULAR];
  const titular = nombreDe(equipo, TITULAR);
  // En el arranque, lo primero es lo del arranque
  if (etapa === 'conectar') empujan.push({ texto: `${titular}, conéctame al repositorio del proyecto y cuéntame qué buscas. Tócame y te llevo.`, emocion: 'sorprendido', empuja: true });
  if (etapa === 'contar') empujan.push({ texto: `${titular}, cuéntame tu proyecto nuevo: qué es, qué quieres lograr y cuándo estará completo. Tócame.`, emocion: 'sorprendido', empuja: true });
  if (etapa === 'diagnostico') empujan.push({ texto: 'Ya tengo lo que necesito para empezar. Pídeme el diagnóstico con «Pedir revisión», arriba.', emocion: 'pensativo', empuja: true });
  if (etapa === 'objetivo') empujan.push({ texto: `Diagnóstico listo. ${titular}, falta lo más importante: a dónde quieres llegar. Tócame.`, emocion: 'pensativo', empuja: true });
  if (etapa === 'ruta') empujan.push({ texto: 'Meta fijada. Ahora me toca a mí: trazo la ruta en mi próxima revisión.', emocion: 'riendo', empuja: true });
  for (const p of personas) {
    const nombre = nombreDe(equipo, p);
    // Lo recién aprobado se celebra primero (los tres últimos días)
    const reciente = plan.misiones
      .filter((m) => m.para === p && estadoMision(m, plan, estado) === 'aprobada' && Date.now() - Date.parse(plan.revisiones[m.id].cuando) < 3 * 86_400_000)
      .sort((a, b) => plan.revisiones[b.id].cuando.localeCompare(plan.revisiones[a.id].cuando))[0];
    if (reciente) empujan.push({ texto: `¡${nombre}, «${reciente.titulo}» quedó aprobada! ${FELICITACION[reciente.titulo.length % FELICITACION.length]}`, emocion: 'riendo' });
    const sig = siguientePendiente(ctx, p, etapa);
    if (sig.mision) {
      const rehacer = estadoMision(sig.mision, plan, estado) === 'rehacer';
      empujan.push(rehacer
        ? { texto: `${nombre}, hay que rehacer «${sig.mision.titulo}». Tócame y te llevo.`, emocion: 'pensativo', empuja: true }
        : { texto: `${nombre}, lo que sigue: «${sig.mision.titulo}». Tócame y te llevo.`, emocion: 'feliz', empuja: true });
    } else if (sig.tipo === 'propuestas') {
      empujan.push({ texto: `${nombre}, misiones al día. Faltan tus respuestas a las propuestas: tócame.`, emocion: 'sorprendido', empuja: true });
    } else if (sig.tipo === 'buzon' && etapa === 'en_marcha') {
      empujan.push({ texto: `${nombre}, estás al día. ¡Bien hecho! Pídele al director lo que sigue.`, emocion: 'enamorado', empuja: true });
    }
  }
  // Una sola cosa a la vez: lo que sigue. Las cifras de la ruta están en la cabecera, y lo que espera al director, en
  // su botón: el director no las repite
  // Intercaladas: una que empuja, una de ánimo
  const salida: Frase[] = [];
  const animo = [...ANIMO];
  for (const e of empujan) {
    salida.push(e);
    const a = animo.splice(Math.floor(Math.random() * animo.length), 1)[0];
    if (a) salida.push(a);
  }
  return salida.length ? salida : [ANIMO[0]];
}

// ───────────────────────────────────────────── el juego: logros y celebraciones

/** Un logro: se gana con lo que ya registra el método (misiones aprobadas, documentos sellados, puertas…). */
export interface Logro {
  id: string;
  nombre: string;
  /** Cómo se gana, en una frase. */
  como: string;
  ganado: boolean;
}

/** Los logros de una persona, ganados o por ganar, en el orden en que suelen llegar. */
export function logrosDe(ctx: Contexto, persona: Persona): Logro[] {
  const { plan, estado } = ctx;
  const aprobadas = plan.misiones.filter((m) => m.para === persona && estadoMision(m, plan, estado) === 'aprobada').length;
  const sellados = documentosEnOrden(plan, estado, persona).filter((x) => x.estado === 'revisado').length;
  const integradas = estado.notas.filter((n) => (n.de ?? TITULAR) === persona && plan.respuestas[n.id]?.tratamiento === 'integrada').length;
  const nivel = nivelDe(xpDe(plan, estado, persona)).nivel;
  return [
    { id: 'primera', nombre: 'Primera misión', como: 'Una misión aprobada por el director', ganado: aprobadas >= 1 },
    { id: 'lector', nombre: 'Lector', como: 'Un documento leído y comentado, ya sellado', ganado: sellados >= 1 },
    { id: 'camino', nombre: 'Camino andado', como: 'Tres misiones aprobadas, a tu ritmo', ganado: aprobadas >= 3 },
    { id: 'voz', nombre: 'Tu voz cuenta', como: 'Diez observaciones tuyas integradas al proyecto', ganado: integradas >= 10 },
    { id: 'puerta', nombre: 'Primera puerta', como: 'El equipo cruzó una puerta de la ruta', ganado: Object.keys(estado.cierres).length >= 1 },
    { id: 'nivel3', nombre: 'Nivel 3', como: 'Llegar a 200 XP', ganado: nivel >= 3 },
  ];
}

/** Lo que dice el director al celebrar: corto y sincero. Señala lo que sigue sin apurar (nada de prisa ni de rachas). */
const FELICITACION = [
  '¡Misión cumplida! Así se avanza: una a la vez.',
  '¡Eso es! Lo hiciste y quedó en firme. La siguiente espera a que tú quieras.',
  'Aprobada. Cada misión cerrada es un paso que ya nadie deshace.',
  '¡Bien hecho! Se nota cuando alguien sigue la ruta.',
  'Cumplida y sellada. Me gusta trabajar contigo.',
];

/** Lo que hay que celebrar: las misiones aprobadas que aún no se celebraron, su XP, si sube de nivel y los logros nuevos. */
export interface Celebracion {
  misiones: Mision[];
  xp: number;
  /** El nivel nuevo, si con estas misiones subió. */
  subeA: number | null;
  logros: Logro[];
  frase: string;
}

/** Lo que celebrar al volver al Studio: lo aprobado desde la última celebración (`celebradas`: los ids ya celebrados). */
export function celebracion(ctx: Contexto, persona: Persona, celebradas: string[]): Celebracion | null {
  const { plan, estado } = ctx;
  const nuevas = plan.misiones.filter((m) => m.para === persona && !celebradas.includes(m.id) && estadoMision(m, plan, estado) === 'aprobada');
  if (!nuevas.length) return null;
  // Lo de antes: el mismo plan sin las aprobaciones nuevas
  const revisiones = Object.fromEntries(Object.entries(plan.revisiones).filter(([id]) => !nuevas.some((m) => m.id === id)));
  const antes: Contexto = { ...ctx, plan: { ...plan, revisiones } };
  const nivel = nivelDe(xpDe(plan, estado, persona)).nivel;
  const ganadosAntes = new Set(logrosDe(antes, persona).filter((l) => l.ganado).map((l) => l.id));
  return {
    misiones: nuevas,
    xp: nuevas.reduce((s, m) => s + m.xp, 0),
    subeA: nivel > nivelDe(xpDe(antes.plan, estado, persona)).nivel ? nivel : null,
    logros: logrosDe(ctx, persona).filter((l) => l.ganado && !ganadosAntes.has(l.id)),
    frase: FELICITACION[celebradas.length % FELICITACION.length],
  };
}
