// El director asistente en persona: su cara flota en el Estudio, dice frases de ánimo y de empuje y, al tocarla,
// lleva a la persona elegida a su siguiente pendiente sin completar (en el arranque, a conectar el repositorio o a
// fijar la meta). Aquí está lo que dice y adónde lleva; el dibujo y el clic, en estudio/src/equipo.ts.
import { t, type ClaveDeTexto } from '../../estudio/src/textos.ts';
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
  tipo: 'mision' | 'proyecto' | 'propuestas' | 'revision' | 'buzon';
  mision?: Mision;
  /** Lo que dice el botón: «Seguir con …». */
  texto: string;
}

/** Las etapas del arranque en que lo que sigue es de la persona (conectar, contar, fijar la meta), no una revisión. */
const ARRANQUE_DE_LA_PERSONA: EtapaArranque[] = ['conectar', 'contar', 'objetivo'];

export function siguientePendiente(ctx: Contexto, persona: Persona, etapa: EtapaArranque = 'en_marcha'): Pendiente {
  const { plan, estado } = ctx;
  const m = misionesAbiertas(plan, estado, persona)[0];
  if (m) return { tipo: 'mision', mision: m, texto: m.titulo };
  if (persona === TITULAR && etapa === 'conectar') return { tipo: 'proyecto', texto: t('animo.conectar') };
  if (persona === TITULAR && etapa === 'contar') return { tipo: 'proyecto', texto: t('animo.contar') };
  if (persona === TITULAR && etapa === 'objetivo') return { tipo: 'proyecto', texto: t('animo.fijar') };
  const actual = plan.fases.indexOf(faseActual(plan, estado));
  const abiertas = plan.propuestas.filter((p) => plan.fases.findIndex((f) => f.id === p.fase) <= actual && !estado.propuestas[p.id]);
  if (persona === TITULAR && abiertas.length) return { tipo: 'propuestas', texto: t('animo.propuestas') };
  if (ARRANQUE_DE_LA_PERSONA.includes(etapa)) return { tipo: 'buzon', texto: t('animo.buzon') };
  // Sin misión, lo que sigue es pedir la revisión, y se dice (nota de voz del titular nmvsrix5ptit, 28 de octubre de
  // 2026: «así sea que el paso siguiente sea pedir la revisión, al usuario hay que decírselo»)
  return { tipo: 'revision', texto: t('animo.pedir') };
}

/** Lo que pasa con la revisión del proyecto, visto desde «Hoy»: nada, pedida, en curso o un director ocupado en otra. */
export type EstadoParaHoy = 'libre' | 'pedida' | 'en_curso' | 'ocupado';

/** El paso siguiente de una persona sin misión abierta: qué hacer o qué esperar, y si «Hoy» ofrece pedir la revisión. */
export interface PasoSinMision {
  que: 'proyecto' | 'propuestas' | 'pedir' | 'esperar';
  texto: string;
  /** Con «pedir»: si conviene ofrecer también «Pedir revisiones seguidas» (la cola del director tiene algo). */
  seguidas?: boolean;
}

/**
 * «Hoy» nunca se queda sin un paso siguiente (nota de voz del titular nmvsrix5ptit, 28 de octubre de 2026, «una norma
 * crítica»: entregó la única misión de un lote corto y «Hoy» decía solo «Sin misiones por hacer», sin decirle que lo que
 * seguía era pedir la revisión; «el propósito del director es guiar al usuario y tenerle siempre algo para que haga, espere,
 * apruebe, examine o decida»). Sin misión abierta, dice qué sigue: lo del arranque, las propuestas por responder, esperar
 * la revisión que ya corre o está pedida, o pedirla, con su botón. La revisión nunca se pide sola: solo se ofrece. Con una
 * misión abierta, null: lo que sigue es ella.
 */
export function pasoSinMision(ctx: Contexto, persona: Persona, etapa: EtapaArranque, revision: EstadoParaHoy, entregadas = 0, colaDelDirector = 0): PasoSinMision | null {
  const sig = siguientePendiente(ctx, persona, etapa);
  if (sig.tipo === 'mision') return null;
  if (revision === 'en_curso') return { que: 'esperar', texto: t('sinMision.revisando') };
  if (revision === 'pedida') return { que: 'esperar', texto: t('sinMision.pedida') };
  if (sig.tipo === 'proyecto') return { que: 'proyecto', texto: t('sinMision.proyecto', { que: sig.texto }) };
  if (sig.tipo === 'propuestas') return { que: 'propuestas', texto: t('sinMision.propuestas') };
  if (revision === 'ocupado') return { que: 'esperar', texto: t('sinMision.ocupado') };
  const porQue = entregadas ? t('sinMision.entregadas', { n: entregadas }) : t('sinMision.sinAbiertas');
  return { que: 'pedir', texto: t('sinMision.pedir', { porQue }), seguidas: colaDelDirector > 0 };
}

/**
 * ¿Pedir la revisión es lo único que le queda a esta persona? (nota de voz del titular nmvsxwjdxtit, 28 de octubre de
 * 2026: lo vio, pero le tomó un momento encontrarlo). Sin misión abierta, sin nada del arranque ni propuestas por
 * responder, y con la revisión libre: entonces «Pedir revisión», arriba, se resalta. Pura.
 */
export function pedirEsLoUnico(ctx: Contexto, persona: Persona, etapa: EtapaArranque): boolean {
  return pasoSinMision(ctx, persona, etapa, 'libre')?.que === 'pedir';
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
const EMOCION_ANIMO: Emocion[] = ['riendo', 'tranquilo', 'pensativo', 'pensativo', 'feliz', 'tranquilo', 'picaro', 'feliz', 'tranquilo', 'enamorado', 'pensativo', 'feliz', 'picaro', 'pensativo', 'picaro', 'tranquilo', 'sorprendido'];

/** Con su texto en el idioma de ahora, cada vez que se lee (textos/es.ts, animo.N). */
export const ANIMO: Frase[] = EMOCION_ANIMO.map((emocion, i) => ({ get texto() { return t(`animo.${i}` as ClaveDeTexto); }, emocion }));

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
  if (etapa === 'conectar') empujan.push({ texto: t('frase.conectar', { titular }), emocion: 'sorprendido', empuja: true });
  if (etapa === 'contar') empujan.push({ texto: t('frase.contar', { titular }), emocion: 'sorprendido', empuja: true });
  if (etapa === 'diagnostico') empujan.push({ texto: t('frase.diagnostico'), emocion: 'pensativo', empuja: true });
  if (etapa === 'objetivo') empujan.push({ texto: t('frase.objetivo', { titular }), emocion: 'pensativo', empuja: true });
  if (etapa === 'ruta') empujan.push({ texto: t('frase.ruta'), emocion: 'riendo', empuja: true });
  for (const p of personas) {
    const nombre = nombreDe(equipo, p);
    // Lo recién aprobado se celebra primero (los tres últimos días)
    const reciente = plan.misiones
      .filter((m) => m.para === p && estadoMision(m, plan, estado) === 'aprobada' && Date.now() - Date.parse(plan.revisiones[m.id].cuando) < 3 * 86_400_000)
      .sort((a, b) => plan.revisiones[b.id].cuando.localeCompare(plan.revisiones[a.id].cuando))[0];
    if (reciente) empujan.push({ texto: t('frase.aprobada', { nombre, titulo: reciente.titulo, felicitacion: felicitacion(reciente.titulo.length) }), emocion: 'riendo' });
    const sig = siguientePendiente(ctx, p, etapa);
    if (sig.mision) {
      const rehacer = estadoMision(sig.mision, plan, estado) === 'rehacer';
      empujan.push(rehacer
        ? { texto: t('frase.rehacer', { nombre, titulo: sig.mision.titulo }), emocion: 'pensativo', empuja: true }
        : { texto: t('frase.sigue', { nombre, titulo: sig.mision.titulo }), emocion: 'feliz', empuja: true });
    } else if (sig.tipo === 'propuestas') {
      empujan.push({ texto: t('frase.propuestas', { nombre }), emocion: 'sorprendido', empuja: true });
    } else if (sig.tipo === 'revision' && etapa === 'en_marcha') {
      empujan.push({ texto: t('frase.alDia', { nombre }), emocion: 'enamorado', empuja: true });
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
    { id: 'primera', nombre: t('logro.primera'), como: t('logro.primeraComo'), ganado: aprobadas >= 1 },
    { id: 'lector', nombre: t('logro.lector'), como: t('logro.lectorComo'), ganado: sellados >= 1 },
    { id: 'camino', nombre: t('logro.camino'), como: t('logro.caminoComo'), ganado: aprobadas >= 3 },
    { id: 'voz', nombre: t('logro.voz'), como: t('logro.vozComo'), ganado: integradas >= 10 },
    { id: 'puerta', nombre: t('logro.puerta'), como: t('logro.puertaComo'), ganado: Object.keys(estado.cierres).length >= 1 },
    { id: 'nivel3', nombre: t('logro.nivel3'), como: t('logro.nivel3Como'), ganado: nivel >= 3 },
  ];
}

/** Lo que dice el director al celebrar: corto y sincero. Señala lo que sigue sin apurar (nada de prisa ni de rachas). */
const FELICITACIONES = 5;
const felicitacion = (i: number) => t(`felicitacion.${i % FELICITACIONES}` as ClaveDeTexto);

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
    frase: felicitacion(celebradas.length),
  };
}
