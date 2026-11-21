// La barrera de las herramientas del director dentro de una revisión: la revisión lanzada para un proyecto solo trabaja en
// ese proyecto (y en los de su cola de diagnósticos). El Studio le pasa los ids por el entorno (revisor.ts ›
// entornoDelDirector y su lanzador); fuera de una revisión no hay variables y nada cambia.

/** El proyecto para el que se lanzó la revisión. */
export const VARIABLE_REVISION_PROYECTO = 'STL_REVISION_PROYECTO';
/** Los ids de la cola de diagnósticos de esa revisión, separados por comas. */
export const VARIABLE_REVISION_COLA = 'STL_REVISION_COLA';

/** Las variables que el lanzador le pone a una revisión: su proyecto y los de su cola. Pura. */
export const entornoDeLaRevision = (proyecto: string, cola: string[]): Record<string, string> => ({
  [VARIABLE_REVISION_PROYECTO]: proyecto,
  [VARIABLE_REVISION_COLA]: [...new Set(cola)].join(','),
});

/**
 * Si una herramienta puede trabajar en `pedido` (el --proyecto, o el activo si no se pidió ninguno). Sin la variable de
 * revisión, siempre. Pura.
 */
export function proyectoPermitidoEnRevision(env: NodeJS.ProcessEnv, pedido: string): { ok: true } | { ok: false; error: string } {
  const de = env[VARIABLE_REVISION_PROYECTO];
  if (!de || pedido === de) return { ok: true };
  const cola = (env[VARIABLE_REVISION_COLA] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (cola.includes(pedido)) return { ok: true };
  return { ok: false, error: `This review is for project ${de}; it cannot work on ${pedido}. Load ${pedido} in the Studio to work on it.` };
}
