// Los procedimientos del director, aparte de CLAUDE.md (propuesta aceptada «Las reglas, a la medida de cada encargo»,
// pr_reglas_por_encargo): lo que se usa en una sola etapa o en un solo tipo de encargo vive en su archivo de
// docs/metodo/director/, y la bandeja dice cuál leer en cada revisión, así que lo elige el código, no el modelo. CLAUDE.md
// queda con lo que vale siempre y los nombra en su índice. Cada uno nace en inglés, para el modelo, con su versión en
// español al lado (`.es.md`), que es la que lee y aprueba el titular, con las mismas partes (su decisión del 26 de octubre
// de 2026). Funciona igual con cualquier agente y con cualquier proyecto: son archivos que la bandeja nombra.

const CARPETA_PROCEDIMIENTOS = 'docs/metodo/director';

/** Cada procedimiento: su archivo (en inglés) y para qué es, en una frase. */
export const PROCEDIMIENTOS = {
  studio: { archivo: `${CARPETA_PROCEDIMIENTOS}/studio-as-project.md`, para: 'cuando el proyecto es el mismo Studio (STL Studio se dirige a sí mismo)' },
  arranque: { archivo: `${CARPETA_PROCEDIMIENTOS}/start.md`, para: 'el arranque: proyecto existente o nuevo, y sus etapas' },
  diagnostico: { archivo: `${CARPETA_PROCEDIMIENTOS}/diagnosis.md`, para: 'el diagnóstico de un proyecto existente (también los de la cola), con su historial de IA' },
  planteamiento: { archivo: `${CARPETA_PROCEDIMIENTOS}/approach.md`, para: 'el planteamiento de un proyecto nuevo' },
  ruta: { archivo: `${CARPETA_PROCEDIMIENTOS}/route.md`, para: 'la ruta, cuando la meta se fija o se replantea' },
  mantenimiento: { archivo: `${CARPETA_PROCEDIMIENTOS}/maintenance.md`, para: 'cuando el titular da la meta por lograda, y mientras la fase es de mantenimiento' },
  cola: { archivo: `${CARPETA_PROCEDIMIENTOS}/diagnosis-queue.md`, para: 'la cola de diagnósticos, después del proyecto activo' },
  ciclo: { archivo: `${CARPETA_PROCEDIMIENTOS}/review-cycle.md`, para: 'el ciclo de revisión, «Dónde quedamos» y cómo se valida y se cierra' },
  decidir: { archivo: `${CARPETA_PROCEDIMIENTOS}/deciding.md`, para: 'el criterio para decidir: cómo ordenar, recomendar y partir una misión, y cuándo investigar' },
  formatos: { archivo: `${CARPETA_PROCEDIMIENTOS}/plan-formats.md`, para: 'los formatos del plan, antes de escribir en él' },
  documentos: { archivo: `${CARPETA_PROCEDIMIENTOS}/documents.md`, para: 'los documentos del director, antes de escribir o cambiar uno' },
} as const;
export type Procedimiento = keyof typeof PROCEDIMIENTOS;

/** La versión en español de un procedimiento, al lado de la suya en inglés. */
export const enEspanol = (archivo: string) => archivo.replace(/\.md$/, '.es.md');

/** Lo que la bandeja sabe de la revisión para elegir los procedimientos. */
export interface SituacionDeLaRevision {
  /** Para qué lanzaron al director: la revisión (lo de siempre), una urgencia o una aclaración, que atienden solo lo suyo. */
  encargo?: 'revision' | 'urgencia' | 'aclaracion';
  /** La etapa del arranque (etapaArranque): conectar, contar, diagnostico, objetivo, ruta o en_marcha. */
  etapa: string;
  tipo?: 'existente' | 'nuevo';
  /** La meta se replanteó desde la última revisión: la ruta se ajusta. */
  replanteada?: boolean;
  /** La fase en curso es de mantenimiento. */
  mantenimiento?: boolean;
  /** El repositorio del proyecto es el mismo Studio. */
  esElStudio?: boolean;
  /** Hay proyectos en la cola de diagnósticos. */
  hayCola?: boolean;
}

/**
 * Los procedimientos que tocan, sin repetir, en el orden en que se leen. Una urgencia o una aclaración atienden solo lo
 * suyo: los formatos del plan, para escribir su respuesta o su paso, y el del Studio si es el mismo Studio. Una revisión,
 * además, los de su etapa, el ciclo de revisión, el criterio para decidir y los documentos del director.
 */
export function procedimientosDeLaRevision(s: SituacionDeLaRevision): Procedimiento[] {
  const p: Procedimiento[] = [];
  if (s.esElStudio) p.push('studio');
  if ((s.encargo ?? 'revision') !== 'revision') return [...p, 'formatos'];
  if (['conectar', 'contar', 'diagnostico', 'objetivo', 'ruta'].includes(s.etapa)) p.push('arranque');
  if (s.etapa === 'diagnostico') p.push(s.tipo === 'nuevo' ? 'planteamiento' : 'diagnostico');
  if (s.etapa === 'ruta' || s.replanteada) p.push('ruta');
  if (s.mantenimiento) p.push('mantenimiento');
  if (s.hayCola) p.push('cola', 'diagnostico');
  p.push('ciclo', 'decidir', 'formatos', 'documentos');
  return [...new Set(p)];
}

/**
 * Las partes de un procedimiento, para ver que sus dos versiones digan lo mismo: cuántos títulos `##` y cuántos puntos de
 * lista (de cualquier nivel) tiene. Una traducción fiel tiene los mismos; si una versión gana o pierde una parte o un
 * punto, la prueba lo dice.
 */
export function partesDe(md: string): { titulos: number; puntos: number } {
  return { titulos: (md.match(/^## /gm) ?? []).length, puntos: (md.match(/^\s*(?:\d+\.|-) /gm) ?? []).length };
}
