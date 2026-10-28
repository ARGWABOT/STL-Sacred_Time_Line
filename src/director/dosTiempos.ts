// La revisión en dos tiempos (pedido pd_dos_tiempos; decisiones del titular del 24 de octubre de 2026, «El paquete de cada
// revisión», parte 12, y del 28 de octubre, en t_medir_dos_tiempos, cómo se mide). Un primer tiempo corto, con el mismo
// modelo del director y esfuerzo bajo, no ejecuta nada: lee lo de hoy y escribe el plan de la revisión como una lista de
// encargos que el código valida (sus archivos y la parte que tocan, qué hacer, qué se espera, qué procedimientos, skills y
// herramientas necesitan, con qué modelo y cuánto contexto calcula), para que el código nunca le dé un encargo a un modelo
// cuya ventana no lo aguanta con margen. El segundo tiempo lo ejecuta, encargo por encargo. El primero se salta cuando la
// revisión trae un solo trabajo pequeño. Y se mide con las revisiones de verdad, antes y después (cuánto duran, cuánto
// gastan y si cierran), con lo que el Studio ya anota de cada una (lineasDeRevision.ts), sin gastar nada aparte. Aquí, lo
// puro: el formato, su validación, cuándo se salta, el encargo del primer tiempo, cómo se lee su respuesta, lo que recibe
// el segundo y la comparación. El lanzador (estudio/servidor/revisor.ts › primerTiempo) lo usa en cada revisión.
import { colaDelDirector, pendientesDelDirector, type EstadoDirector, type Plan } from './director.ts';
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

/**
 * Lo que trae la revisión de un proyecto, contado como lo cuenta la bandeja: las notas sin respuesta, las entregas sin
 * veredicto, lo de la cola del director y los diagnósticos de la cola de diagnósticos que le abrió el Studio. Pura.
 */
export function trabajoDe(plan: Plan, estado: EstadoDirector, diagnosticos: number): TrabajoDeLaRevision {
  const p = pendientesDelDirector(plan, estado);
  return { notas: p.notas.length, entregas: p.entregas.length, cola: colaDelDirector(plan, estado).length, diagnosticos };
}

/** Lo más que dura el primer tiempo: pasado esto, se detiene y la revisión sigue en un solo tiempo, como antes. */
export const MAX_MIN_PRIMER_TIEMPO = 10;

/**
 * El encargo del primer tiempo: lee la bandeja y lo que necesite para nombrar archivos y partes, no ejecuta nada y
 * responde solo con la lista de encargos. Nace en inglés, como lo que lee el modelo (decisión del titular del 23 de
 * octubre de 2026). `minutos`: los de la revisión entera, para que planee lo que cabe en ella. Pura.
 */
export const encargoDelPrimerTiempo = (proyecto: string, minutos: number, bandeja: string | null = null): string =>
  `First time of the review requested from the Studio for project «${proyecto}». You are the STL Studio director, launched ` +
  `by the Studio without a screen, and this is only the plan of the review: a second session, also you, executes it ` +
  `right after. Do not execute anything: do not write or change any file, do not answer notes, do not commit. ` +
  (bandeja
    ? `The Studio already ran node tools/director/bandeja.ts --proyecto ${proyecto} for you, without a model: its output is ` +
      `at the end of this message, as it printed it. Do not run it again. `
    : `Run node tools/director/bandeja.ts --proyecto ${proyecto} once and read what it lists. `) +
  `Read with Read, Grep and Glob only ` +
  `what you need to name the files and the part each task touches (the plan and its archive by id, the project map, the ` +
  `code). Then decide what this review does, in the order it does it, within its ${minutos} minutes: each delivery and ` +
  `each note it must answer, and the pieces of your queue it can finish, from the top, each piece with its tests and its ` +
  `commit, never cut in half. Two tasks that touch the same file or the same decision go together, in one task. The ` +
  `closing (the plan's patch, the summary, --listo and the memory commit) is not a task: the second time always does it. ` +
  `End your turn with only a JSON array, without any text before or after it, where each task is ` +
  `{ "id": "<short and unique>", "que": "<what to do, in one or two sentences>", "origen": ["<ids of the notes, ` +
  `deliveries, proposals, requests or missions it comes from>"], "archivos": [{ "ruta": "<path>", "parte": "<function ` +
  `or section, if not the whole file>" }], "espera": "<what is expected at the end and how it is checked>", ` +
  `"procedimientos": [<keys among ${Object.keys(PROCEDIMIENTOS).map((k) => `"${k}"`).join(', ')}>], "skills": [], ` +
  `"herramientas": [], "modelo": "director" | "sonnet" | "haiku", "contexto": <tokens it reads plus writes> }. Use ` +
  `"sonnet" or "haiku" only for routine and checkable work (a long reading, a bounded change with its test); the core of ` +
  `the Studio, permissions and what deletes or costs go with "director". The Studio validates the list: a task that a ` +
  `model's window cannot hold with margin is rejected.` +
  (bandeja ? `\n\nThe inbox (bandeja.ts), as the Studio ran it:\n<<<\n${bandeja.trimEnd()}\n>>>` : '');

/**
 * El paquete listo (pedido pd_paquete_listo; decisión del titular nmvsptzs9tit, 28 de octubre de 2026, en «Revisiones
 * más cortas», parte 5): antes de lanzar al director, el Studio corre la bandeja él mismo, sin modelo, y lo que imprime va
 * dentro del encargo de los dos tiempos. El director empieza trabajando, no leyendo: no la corre, no busca su salida
 * guardada en un archivo ni la relee por partes. Si la bandeja no termina en este tope (la transcripción de muchos audios),
 * o falla, o sale vacía o demasiado grande, el director la corre él mismo, como antes.
 */
export const MAX_MIN_BANDEJA_LISTA = 5;
/** Lo más que pesa la bandeja que va dentro del encargo (en KB de texto): más, la corre el director, como antes. */
export const MAX_KB_BANDEJA_LISTA = 160;

/** Lo que imprimió la bandeja, si sirve para ir dentro del encargo: con algo y dentro de su tope; si no, null. Pura. */
export function bandejaParaElEncargo(salida: string | null | undefined): string | null {
  const t = (salida ?? '').trim();
  return t && t.length <= MAX_KB_BANDEJA_LISTA * 1024 ? t : null;
}

/**
 * Lo que el segundo tiempo recibe de la bandeja ya corrida, al final de su encargo y en su idioma: que no la corra para
 * leerla y lo que imprimió, tal cual. Va después del plan de la revisión. Pura.
 */
export const conLaBandejaLista = (proyecto: string, bandeja: string): string =>
  ` El Studio ya corrió la bandeja por ti, sin modelo, justo antes de lanzarte (node tools/director/bandeja.ts ` +
  `--proyecto ${proyecto}): lo que imprimió va al final de este encargo, tal cual. No la corras otra vez para leerla: ` +
  `empieza trabajando, con los procedimientos que nombra. Córrela de nuevo solo si necesitas lo que cambió después; ` +
  `--aplicar y --listo, como siempre.\n\nLa bandeja:\n<<<\n${bandeja.trimEnd()}\n>>>`;

/**
 * La lista de encargos de la respuesta final del primer tiempo: el arreglo JSON, solo o dentro de un bloque de código, y
 * validado (validarEncargos). Sin arreglo, o con uno que no pasa, los errores. Pura.
 */
export function encargosDeLaRespuesta(texto: string | null | undefined, ventanas: Record<ModeloDelEncargo, number> = VENTANAS): { encargos: EncargoDeRevision[] } | { errores: string[] } {
  const t = (texto ?? '').trim();
  const bloque = /```(?:json)?\s*([\s\S]*?)```/.exec(t)?.[1] ?? t;
  const ini = bloque.indexOf('[');
  const fin = bloque.lastIndexOf(']');
  if (ini < 0 || fin < ini) return { errores: ['El primer tiempo no respondió con la lista de encargos.'] };
  let lista: unknown;
  try {
    lista = JSON.parse(bloque.slice(ini, fin + 1));
  } catch {
    return { errores: ['La lista de encargos del primer tiempo no es JSON válido.'] };
  }
  const errores = validarEncargos(lista, ventanas);
  return errores.length ? { errores } : { encargos: lista as EncargoDeRevision[] };
}

/** La orden con que el segundo tiempo marca un encargo hecho (tools/director/encargos.ts). */
export const ordenDeHecho = (proyecto: string, id: string) => `node tools/director/encargos.ts --proyecto ${proyecto} --hecho ${id}`;

/**
 * Lo que el segundo tiempo recibe de su plan, al final de su encargo, en el idioma del encargo: la lista validada, en su
 * orden, y cómo marcar cada encargo al terminarlo. El cierre sigue exigiendo todo, lo haya previsto el plan o no. Pura.
 */
export const conElPlanDeLaRevision = (proyecto: string, encargos: readonly EncargoDeRevision[]): string =>
  ` El plan de esta revisión lo escribió tu primer tiempo y el Studio lo validó: trabájalo en su orden, encargo por ` +
  `encargo, y apenas termines uno (con sus pruebas y su commit, si toca código), márcalo con ${ordenDeHecho(proyecto, '<id>')}: ` +
  `la persona ve la lista en «Lo que va haciendo el director». Lo que la bandeja pide y el plan no previó sigue siendo ` +
  `tuyo: el cierre exige todo, como siempre. Los encargos: ` +
  encargos
    .map((e, i) => `(${i + 1}) «${e.id}»: ${e.que} De: ${e.origen.join(', ')}. Archivos: ${e.archivos.length ? e.archivos.map((a) => (a.parte ? `${a.ruta} (${a.parte})` : a.ruta)).join(', ') : 'ninguno'}. Se espera: ${e.espera}${e.procedimientos.length ? ` Procedimientos: ${e.procedimientos.map((p) => (PROCEDIMIENTOS as Record<string, { archivo: string } | undefined>)[p]?.archivo ?? p).join(', ')}.` : ''}${e.modelo === 'director' ? '' : ` Con un ayudante (${e.modelo}), si lo vale.`}`)
    .join(' ');

/** Dónde queda la lista de encargos de una revisión: junto a su registro, como su paquete (paquete.ts). */
export const archivoDeEncargos = (registro: string) => `${registro.replace(/\.log$/, '')}.encargos.json`;

/** El registro del primer tiempo, junto al de la revisión y sin «.log»: así no se cuenta como otro lanzamiento. */
export const registroDelPrimerTiempo = (registro: string) => `${registro.replace(/\.log$/, '')}.primer.jsonl`;

/** Lo que quedó del primer tiempo, en una línea del registro de la revisión: para su costo y para saber cómo salió. */
export interface PrimerTiempoEscrito {
  /** Si dejó una lista de encargos válida. */
  ok: boolean;
  encargos?: number;
  /** Por qué no, en una frase. */
  porque?: string;
  minutos: number | null;
  costo: number | null;
}

/** La línea del registro de la revisión con lo que quedó del primer tiempo. Pura. */
export const lineaDelPrimerTiempo = (p: PrimerTiempoEscrito) => `${JSON.stringify({ type: 'studio', primerTiempo: p })}\n`;

/**
 * Lo que dice el registro del primer tiempo al terminar: su respuesta final, su costo, cuánto duró y la ventana del modelo
 * con que trabajó (para validar los encargos contra la del director de verdad). Puro: el texto del registro.
 */
export function finDelPrimerTiempo(registro: string): { respuesta: string | null; costo: number | null; minutos: number | null; ventana: number | null } {
  let r: any = null;
  for (const linea of registro.split('\n')) {
    if (!linea.startsWith('{')) continue;
    try {
      const e = JSON.parse(linea);
      if (e?.type === 'result') r = e;
    } catch {
      // una línea a medio escribir no dice nada
    }
  }
  if (!r) return { respuesta: null, costo: null, minutos: null, ventana: null };
  const ventanas = Object.values((r.modelUsage ?? {}) as Record<string, { contextWindow?: number }>).map((u) => Number(u?.contextWindow)).filter((n) => n > 0);
  return {
    respuesta: typeof r.result === 'string' ? r.result : null,
    costo: typeof r.total_cost_usd === 'number' ? Math.round(r.total_cost_usd * 100) / 100 : null,
    minutos: typeof r.duration_ms === 'number' ? Math.round(r.duration_ms / 6000) / 10 : null,
    ventana: ventanas.length ? Math.max(...ventanas) : null,
  };
}

/**
 * De los nombres de una carpeta de registros, el de la lista de encargos más nueva de las revisiones de un proyecto (no
 * las de una aclaración o una urgencia, que no tienen primer tiempo); null si no hay. Pura.
 */
export function ultimaListaDe(nombres: readonly string[], proyecto: string): string | null {
  const suyo = new RegExp(`^${proyecto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d{4}-\\d{2}-\\d{2}T[\\d-]+Z\\.encargos\\.json$`);
  return nombres.filter((n) => suyo.test(n)).sort().at(-1) ?? null;
}

/** La lista con el encargo `id` marcado hecho a la hora `cuando` (si ya lo estaba, igual); null si no existe. Pura. */
export function conEncargoHecho(lista: readonly EncargoDeRevision[], id: string, cuando: string): EncargoDeRevision[] | null {
  if (!lista.some((e) => e.id === id)) return null;
  return lista.map((e) => (e.id === id && !e.hecho ? { ...e, hecho: cuando } : e));
}

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
