// La revisión en dos tiempos (pedido pd_dos_tiempos; decisiones del titular del 24 de octubre de 2026, «El paquete de cada
// revisión», parte 12, y del 28 de octubre, en t_medir_dos_tiempos, cómo se mide). Un primer tiempo corto, con el mismo
// modelo del director y esfuerzo bajo, no ejecuta nada: lee lo de hoy y escribe el plan de la revisión como una lista de
// encargos que el código valida (sus archivos y la parte que tocan, qué hacer, qué se espera, qué procedimientos, skills y
// herramientas necesitan, con qué modelo y cuánto contexto calcula), para que el código nunca le dé un encargo a un modelo
// cuya ventana no lo aguanta con margen. El segundo tiempo lo ejecuta, encargo por encargo. El primero se salta cuando la
// revisión trae un solo trabajo pequeño. Y se mide con las revisiones de verdad, antes y después (cuánto duran, cuánto
// gastan y si cierran), con lo que el Studio ya anota de cada una (lineasDeRevision.ts), sin gastar nada aparte. Aquí, lo
// puro: el formato, su validación, cuándo se salta y la comparación. El lanzador lo usa en su pieza siguiente.
import { PROCEDIMIENTOS } from './procedimientos.ts';
import type { LineaDeRevision } from './lineasDeRevision.ts';

/** Con qué modelo va un encargo: el del director, o uno de los de los ayudantes (revisor.ts › modeloDeLosAyudantes). */
export type ModeloDelEncargo = 'director' | 'sonnet' | 'haiku';

/** Un encargo del plan de la revisión, como lo escribe el primer tiempo. */
export interface EncargoDeRevision {
  id: string;
  /** Qué hacer, en una o dos frases. */
  que: string;
  /** Lo que atiende: los ids de las notas, entregas, propuestas, pedidos o misiones de donde nace. */
  origen: string[];
  /** Los archivos que toca y, si no es entero, la parte de cada uno (una función, una sección). */
  archivos: { ruta: string; parte?: string }[];
  /** Qué se espera al terminar y cómo se comprueba (sus pruebas, su commit, la respuesta escrita). */
  espera: string;
  /** Los procedimientos del director que necesita (las claves de PROCEDIMIENTOS). */
  procedimientos: string[];
  skills?: string[];
  herramientas?: string[];
  modelo: ModeloDelEncargo;
  /** Cuánto contexto calcula que necesita, en tokens: lo que lee más lo que escribe. */
  contexto: number;
  /** Cuándo quedó hecho, en el segundo tiempo (se marca al terminar, y se ve en «Lo que va haciendo el director»). */
  hecho?: string;
}

/** La ventana de cada modelo, en tokens (el de los ayudantes, Sonnet, con la misma de un millón que el director). */
export const VENTANAS: Record<ModeloDelEncargo, number> = { director: 1_000_000, sonnet: 1_000_000, haiku: 200_000 };

/** Lo más de su ventana que puede pedir un encargo: el resto es margen para lo que no se calculó. */
export const MARGEN_DE_VENTANA = 0.6;

const MODELOS: readonly ModeloDelEncargo[] = ['director', 'sonnet', 'haiku'];
const texto = (x: unknown): x is string => typeof x === 'string' && x.trim().length > 0;

/**
 * Lo que está mal en la lista de encargos del primer tiempo, una frase por cosa; [] si está bien. Cada encargo con su id
 * único, qué hacer, de dónde nace, qué se espera, sus archivos, procedimientos que existen, un modelo conocido y un
 * contexto que su ventana aguanta con margen (`ventanas`, para la ventana real del director elegido). Pura.
 */
export function validarEncargos(lista: unknown, ventanas: Record<ModeloDelEncargo, number> = VENTANAS): string[] {
  if (!Array.isArray(lista) || !lista.length) return ['El plan de la revisión necesita al menos un encargo.'];
  const errores: string[] = [];
  const vistos = new Set<string>();
  lista.forEach((e: Partial<EncargoDeRevision>, i) => {
    const quien = texto(e?.id) ? `El encargo «${e.id}»` : `El encargo ${i + 1}`;
    if (!texto(e?.id)) errores.push(`${quien} no tiene id.`);
    else if (vistos.has(e.id)) errores.push(`${quien} está dos veces.`);
    else vistos.add(e.id);
    if (!texto(e?.que)) errores.push(`${quien} no dice qué hacer.`);
    if (!texto(e?.espera)) errores.push(`${quien} no dice qué se espera ni cómo se comprueba.`);
    if (!Array.isArray(e?.origen) || !e.origen.length || !e.origen.every(texto)) errores.push(`${quien} no dice de dónde nace (\`origen\`: las notas, propuestas o pedidos que atiende).`);
    if (!Array.isArray(e?.archivos) || !e.archivos.every((a) => texto(a?.ruta))) errores.push(`${quien} no dice bien sus archivos (\`archivos\`: cada uno con su \`ruta\`).`);
    const procs = Array.isArray(e?.procedimientos) ? e.procedimientos : null;
    if (!procs) errores.push(`${quien} no dice qué procedimientos necesita (puede ser una lista vacía).`);
    else for (const p of procs.filter((x) => !Object.hasOwn(PROCEDIMIENTOS, x))) errores.push(`${quien} pide el procedimiento «${p}», que no existe: ${Object.keys(PROCEDIMIENTOS).join(', ')}.`);
    if (!MODELOS.includes(e?.modelo as ModeloDelEncargo)) errores.push(`${quien} no dice con qué modelo va: ${MODELOS.join(', ')}.`);
    else if (typeof e.contexto !== 'number' || !(e.contexto > 0)) errores.push(`${quien} no calcula cuánto contexto necesita (\`contexto\`, en tokens).`);
    else if (e.contexto > ventanas[e.modelo!] * MARGEN_DE_VENTANA)
      errores.push(`${quien} pide ${e.contexto.toLocaleString('es')} tokens y con «${e.modelo}» caben ${Math.floor(ventanas[e.modelo!] * MARGEN_DE_VENTANA).toLocaleString('es')} con margen: pártelo, o dáselo a un modelo con más ventana.`);
  });
  return errores;
}

/** Lo que trae una revisión, contado por la bandeja, para saber si vale la pena el primer tiempo. */
export interface TrabajoDeLaRevision {
  notas: number;
  entregas: number;
  /** Lo de la cola del director que tiene para hacer. */
  cola: number;
  /** Los diagnósticos de la cola de diagnósticos que le tocan. */
  diagnosticos: number;
}

/**
 * Si el primer tiempo se salta: la revisión trae un solo trabajo pequeño (una nota o una entrega, y nada de su cola ni de
 * diagnósticos), y planearla cuesta más de lo que ahorra. Sin nada, también: no hay qué planear. Pura.
 */
export const saltaPrimerTiempo = (t: TrabajoDeLaRevision): boolean => t.cola === 0 && t.diagnosticos === 0 && t.notas + t.entregas <= 1;

/** Cómo van unas revisiones: cuántas, cuánto duran y gastan (la mediana) y cuántas cerraron. */
export interface ResumenDeRevisiones {
  n: number;
  minutos: number | null;
  costo: number | null;
  cerraron: number;
}

const mediana = (xs: number[]): number | null => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round(((s[m - 1] + s[m]) / 2) * 100) / 100;
};

/** El resumen de unas revisiones (solo las de tipo revisión: las urgencias y las aclaraciones son otra cosa). Pura. */
export function resumirRevisiones(lineas: readonly LineaDeRevision[]): ResumenDeRevisiones {
  const rs = lineas.filter((l) => l.tipo === 'revision');
  return {
    n: rs.length,
    minutos: mediana(rs.map((l) => l.minutos).filter((x): x is number => typeof x === 'number')),
    costo: mediana(rs.map((l) => l.costo).filter((x): x is number => typeof x === 'number')),
    cerraron: rs.filter((l) => l.cerro).length,
  };
}

/**
 * Antes y después de la revisión en dos tiempos (tu elección del 28 de octubre de 2026: con las revisiones de verdad):
 * las de antes de `desde` y las de después, con su resumen cada una. Pura.
 */
export function antesYDespues(lineas: readonly LineaDeRevision[], desde: string): { antes: ResumenDeRevisiones; despues: ResumenDeRevisiones } {
  return { antes: resumirRevisiones(lineas.filter((l) => l.cuando < desde)), despues: resumirRevisiones(lineas.filter((l) => l.cuando >= desde)) };
}
