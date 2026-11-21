// Las funciones del Studio que cada proyecto adopta (nota del titular nmwjn980ctit, 16 de noviembre de 2026): «el usuario
// no tiene por qué estar recordándole al estudio cuáles son sus propias features». La puerta local se describía solo en el
// diagnóstico de un proyecto nuevo (diagnosis.md › «The local door»), así que un proyecto que ya estaba en marcha, como
// «app», nunca la adoptó, y nada avisaba de un paso que mandaba a la persona a escribir una dirección de localhost a mano.
// Aquí vive la lista: cada función, cómo se comprueba que un proyecto la adoptó y qué procedimiento leer. La bandeja la
// muestra en la revisión de cada proyecto y --listo no cierra mientras una falte, o hasta que el titular la decida.
import type { Plan } from './director.ts';
import { esDireccionLocal, INTERRUPTOR_PUERTA } from './atajo.ts';

/** Lo que el director anota de una función en el plan del proyecto (`plan.funciones[<id>]`). */
export interface AdopcionDeFuncion {
  cuando: string;
  /**
   * `adoptada`: ya la usa; `no_aplica`: el director leyó el repositorio y no le sirve (la nota dice por qué); `decision`:
   * se le preguntó al titular, en la misión o la propuesta `decision`.
   */
  estado: 'adoptada' | 'no_aplica' | 'decision';
  nota: string;
  decision?: string;
}

/** Lo que se sabe del proyecto sin un modelo: si existe un archivo en la raíz de su repositorio. */
export interface HechosDelProyecto {
  existeEnElRepositorio: (ruta: string) => boolean;
}

export interface FuncionDelStudio {
  id: string;
  /** Su nombre, en inglés: lo lee el modelo en la bandeja. */
  nombre: string;
  /** El procedimiento y su parte, para leerla antes de adoptarla. */
  procedimiento: string;
  seccion: string;
  /** Cómo se comprueba, en una frase, para la bandeja. */
  comprueba: string;
  /** ¿La adoptó, sin lo anotado en el plan? Por lo que se ve en el repositorio o en el plan. */
  seVeAdoptada: (plan: Plan, h: HechosDelProyecto) => boolean;
}

const pasosDe = (plan: Plan) => (plan.misiones ?? []).flatMap((m) => (m.pasos ?? []).filter((p): p is Exclude<typeof p, string> => typeof p !== 'string'));

/** Las funciones del Studio que todo proyecto adopta, en el orden en que llegaron. Una nueva entra aquí, con su prueba. */
export const FUNCIONES_DEL_STUDIO: FuncionDelStudio[] = [
  {
    id: 'puerta_local',
    nombre: 'the local door (shortcuts that open the project\'s app already signed in)',
    procedimiento: 'docs/metodo/director/diagnosis.md',
    seccion: 'The local door',
    comprueba: `built when the switch file ${INTERRUPTOR_PUERTA} is in the repository's root or a step of the plan carries an \`atajo\`; otherwise \`plan.funciones.puerta_local\` says \`no_aplica\` (not a web project with a sign-in, and why) or \`decision\` (the mission or proposal that asks the owner)`,
    seVeAdoptada: (plan, h) => h.existeEnElRepositorio(INTERRUPTOR_PUERTA) || pasosDe(plan).some((p) => p.atajo !== undefined),
  },
];

/** ¿Lo anotado en el plan vale? `decision` necesita una misión o propuesta que exista. Puro. */
function anotadaQueVale(plan: Plan, a: AdopcionDeFuncion | undefined): boolean {
  if (!a || typeof a.nota !== 'string' || !a.nota.trim()) return false;
  if (a.estado === 'adoptada' || a.estado === 'no_aplica') return true;
  if (a.estado !== 'decision' || !a.decision) return false;
  return (plan.misiones ?? []).some((m) => m.id === a.decision) || (plan.propuestas ?? []).some((p) => p.id === a.decision);
}

/** Las funciones que este proyecto todavía no adoptó ni decidió. Puro, con sus hechos. */
export function funcionesSinAdoptar(plan: Plan, h: HechosDelProyecto): FuncionDelStudio[] {
  const funciones = (plan as Plan & { funciones?: Record<string, AdopcionDeFuncion> }).funciones ?? {};
  return FUNCIONES_DEL_STUDIO.filter((f) => !f.seVeAdoptada(plan, h) && !anotadaQueVale(plan, funciones[f.id]));
}

/** Las líneas de la bandeja para lo que falta adoptar. */
export function lineasDeFuncionesSinAdoptar(faltan: FuncionDelStudio[]): string[] {
  return faltan.map((f) => `- Not adopted: ${f.nombre}. Read ${f.procedimiento} › «${f.seccion}» and adopt it in this review (its missions use it from now on), or write \`plan.funciones.${f.id}\` (\`{ "cuando", "estado": "no_aplica" | "decision", "nota", "decision"? }\`). How it is checked: ${f.comprueba}.`);
}

/** Lo que un paso manda a abrir en este computador: su `ir.url` local, o una dirección de localhost en su texto. Puro. */
const LOCALHOST_EN_TEXTO = /\bhttps?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?\b/i;
export function pasoALocalSinAtajo(p: { texto?: unknown; detalle?: unknown; ir?: unknown; atajo?: unknown }): boolean {
  if (p.atajo !== undefined) return false;
  const url = p.ir && typeof p.ir === 'object' && 'url' in p.ir ? String((p.ir as { url?: unknown }).url ?? '') : '';
  if (url && esDireccionLocal(url)) return true;
  return [p.texto, ...(Array.isArray(p.detalle) ? p.detalle : [])].some((t) => typeof t === 'string' && LOCALHOST_EN_TEXTO.test(t));
}

/**
 * Si el proyecto tiene pestaña de QA (pd_pestana_qa, cuarto tramo), desde el proyecto mismo (nmwpou0wptit): `si` cuando su
 * revisión encontró una dirección local (la puerta adoptada o un paso con su `atajo`, que abren en la pestaña de QA) o es
 * el Studio mismo (su página pública abre ahí, nmwpkja4dtit); `no` cuando el director anotó que la puerta no le sirve
 * (`no_aplica`): «Proyecto» lo dice una vez (nmwpmegh3tit, nmwpov2zetit); `sin_saber` mientras no se decidió. Puro.
 */
export type PestanaQa = 'si' | 'no' | 'sin_saber';
export function pestanaQaDelProyecto(plan: Pick<Plan, 'misiones'> & { funciones?: Record<string, AdopcionDeFuncion> }, esElStudio = false): PestanaQa {
  if (esElStudio) return 'si';
  const estado = plan.funciones?.puerta_local?.estado;
  if (estado === 'adoptada' || pasosDe(plan as Plan).some((p) => p.atajo !== undefined && estado !== 'no_aplica')) return 'si';
  return estado === 'no_aplica' ? 'no' : 'sin_saber';
}

/** Lo que la bandeja le dice al director de la pestaña de QA del proyecto, antes de escribir misiones. */
export const LINEA_PESTANA_QA: Record<PestanaQa, string> = {
  si: 'QA tab: yes. A step that sends the person to look at the app carries its `atajo` (or, for the Studio itself, a link to its published page), and it opens in the project\'s QA tab with the floating director and its photo note.',
  no: 'QA tab: no (`funciones.puerta_local` is `no_aplica`), and «Project» says so once. Never write a step with an `atajo`: its missions are checked in its own files and commands (validarPlan refuses one).',
  sin_saber: 'QA tab: not known yet. It comes with the local door (diagnosis.md › «The local door»), once `funciones.puerta_local` says `adoptada`.',
};

/**
 * Los pasos de las misiones no aprobadas que traen un atajo a la pestaña de QA en un proyecto sin ella (nmwpouy68tit: «el
 * director detecta automáticamente que no debe generar misiones de este tipo»). Son errores de validarPlan, así que ni
 * --aplicar ni --listo los dejan pasar. Puro.
 */
export function atajosSinPestanaQa(plan: Plan, aprobada: (id: string) => boolean): string[] {
  const funciones = (plan as Plan & { funciones?: Record<string, AdopcionDeFuncion> }).funciones ?? {};
  if (funciones.puerta_local?.estado !== 'no_aplica') return [];
  const errores: string[] = [];
  for (const m of plan.misiones ?? []) {
    if (aprobada(m.id)) continue;
    (m.pasos ?? []).forEach((p, i) => {
      if (typeof p !== 'string' && p.atajo !== undefined) errores.push(`Step ${i + 1} of mission «${m.id}» carries an \`atajo\`, which opens the QA tab, but this project has none (\`funciones.puerta_local\` is \`no_aplica\`): check it in its files or commands instead, or build the local door and write \`puerta_local\` as \`adoptada\` first.`);
    });
  }
  return errores;
}

/**
 * Los avisos de los pasos que mandan a la persona a una dirección de localhost a mano, sin `atajo`, en las misiones que
 * no están aprobadas. Nada si el proyecto anotó que la puerta no le sirve (`no_aplica`). Puro.
 */
export function avisosDePasosALocal(plan: Plan, aprobada: (id: string) => boolean): string[] {
  const funciones = (plan as Plan & { funciones?: Record<string, AdopcionDeFuncion> }).funciones ?? {};
  if (funciones.puerta_local?.estado === 'no_aplica') return [];
  const avisos: string[] = [];
  for (const m of plan.misiones ?? []) {
    if (aprobada(m.id)) continue;
    (m.pasos ?? []).forEach((p, i) => {
      if (typeof p !== 'string' && pasoALocalSinAtajo(p)) avisos.push(`Step ${i + 1} of mission «${m.id}» sends the person to a localhost address by hand, without an \`atajo\`: give it its \`atajo\` (plan-formats.md › «A shortcut into the project's app»), or build the local door first.`);
    });
  }
  return avisos;
}
