// La revisión en dos tiempos (pedido pd_dos_tiempos; decisiones del titular del 24 de octubre de 2026, «El paquete de cada
// revisión», parte 12, y del 28 de octubre, en t_medir_dos_tiempos, cómo se mide). Un primer tiempo corto, con el mismo
// modelo del director y esfuerzo medio (propuesta aceptada pr_plan_esfuerzo_medio, 31 de octubre de 2026; antes, bajo), que
// se reintenta una vez si no deja su lista (nota del titular nmvwig61gtit), no ejecuta nada: lee lo de hoy y escribe el
// plan de la revisión como una lista de encargos que el código valida (sus archivos y la parte que tocan, qué hacer, qué se espera, qué procedimientos, skills y
// herramientas necesitan, con qué modelo y cuánto contexto calcula), para que el código nunca le dé un encargo a un modelo
// cuya ventana no lo aguanta con margen. El segundo tiempo lo ejecuta, encargo por encargo. El primero corre en toda
// revisión, traiga lo que traiga (decisión del titular nmvxww5detit, 1 de noviembre de 2026: «vamos a seguir haciendo siempre
// el plan»). Y se mide con las revisiones de verdad, antes y después (cuánto duran, cuánto
// gastan y si cierran), con lo que el Studio ya anota de cada una (lineasDeRevision.ts), sin gastar nada aparte. Aquí, lo
// puro: el formato, su validación, el encargo del primer tiempo, cómo se lee su respuesta, lo que recibe
// el segundo y la comparación. El lanzador (estudio/servidor/revisor.ts › primerTiempo) lo usa en cada revisión.
import { tokensDelResultado } from './consumoDelPlan.ts';
import type { PiezaSiguiente } from './director.ts';
import { PROCEDIMIENTOS } from './procedimientos.ts';
import { modeloDelInventario, ventanaDe } from './modelos.ts';
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

/**
 * La ventana de cada modelo, en tokens: la del director, de un millón (el lanzador la cambia por la que informa Claude
 * Code), y la de los ayudantes, de la tabla de modelos (modelos.ts › INVENTARIO, con la que les da Claude Code).
 */
export const VENTANAS: Record<ModeloDelEncargo, number> = {
  director: 1_000_000,
  sonnet: ventanaDe(modeloDelInventario('sonnet')!),
  haiku: ventanaDe(modeloDelInventario('haiku')!),
};

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
    if (e?.skills !== undefined && !(Array.isArray(e.skills) && e.skills.every(texto))) errores.push(`${quien} no dice bien sus skills (\`skills\`: los nombres de las que necesita, o una lista vacía).`);
    if (!MODELOS.includes(e?.modelo as ModeloDelEncargo)) errores.push(`${quien} no dice con qué modelo va: ${MODELOS.join(', ')}.`);
    else if (typeof e.contexto !== 'number' || !(e.contexto > 0)) errores.push(`${quien} no calcula cuánto contexto necesita (\`contexto\`, en tokens).`);
    else if (e.contexto > ventanas[e.modelo!] * MARGEN_DE_VENTANA)
      errores.push(`${quien} pide ${e.contexto.toLocaleString('es')} tokens y con «${e.modelo}» caben ${Math.floor(ventanas[e.modelo!] * MARGEN_DE_VENTANA).toLocaleString('es')} con margen: pártelo, o dáselo a un modelo con más ventana.`);
  });
  return errores;
}

/** Lo más que dura cada intento del primer tiempo: pasado esto, se detiene, como cualquier intento que no deja su lista. */
export const MAX_MIN_PRIMER_TIEMPO = 10;

/**
 * Con cuánto esfuerzo piensa el primer tiempo (propuesta aceptada pr_plan_esfuerzo_medio, 31 de octubre de 2026): medio,
 * porque con bajo cometía descuidos pequeños que la validación no detiene (contar seis elecciones donde había siete). Se
 * deshace cambiando esta palabra.
 */
export const ESFUERZO_PRIMER_TIEMPO = 'medium';

/**
 * Cuántas veces se intenta el primer tiempo antes de que la revisión siga en un solo tiempo: el primero y un reintento
 * (nota del titular nmvwig61gtit, 31 de octubre de 2026: la revisión en dos tiempos se garantiza reintentándola, no
 * volviendo a la de uno). Solo «Detener ahora» no se reintenta.
 */
export const INTENTOS_PRIMER_TIEMPO = 2;

/**
 * El encargo del primer tiempo: lee la bandeja y lo que necesite para nombrar archivos y partes, no ejecuta nada y
 * responde solo con la lista de encargos. Nace en inglés, como lo que lee el modelo (decisión del titular del 23 de
 * octubre de 2026). `minutos`: los de la revisión entera, para que planee lo que cabe en ella. `previo`: en el reintento,
 * por qué el intento anterior no dejó su lista, para que no repita el error. Pura.
 */
export const encargoDelPrimerTiempo = (proyecto: string, minutos: number, bandeja: string | null = null, previo: string | null = null): string =>
  `First time of the review requested from the Studio for project «${proyecto}». You are the STL Studio director, launched ` +
  `by the Studio without a screen, and this is only the plan of the review: a second session, also you, executes it ` +
  `right after. Do not execute anything: do not write or change any file, do not answer notes, do not commit. ` +
  (previo
    ? `A first attempt at this plan left no valid list (${previo}). This is its only retry: avoid that, and if it fails ` +
      `too, the review goes on in a single run. `
    : '') +
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
  `"procedimientos": [<keys among ${Object.keys(PROCEDIMIENTOS).map((k) => `"${k}"`).join(', ')}>], "skills": [<the names ` +
  `of the skills listed to you that the task needs; the second time starts with only the skills the plan names, so leave ` +
  `it empty if it needs none>], ` +
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
 * Lo que el segundo tiempo recibe de la bandeja ya corrida, al final de su encargo y en inglés, como lo que lee el modelo
 * (pd_nucleo_ingles): que no la corra para leerla y lo que imprimió, tal cual. Va después del plan de la revisión. Pura.
 */
export const conLaBandejaLista = (proyecto: string, bandeja: string): string =>
  ` The Studio already ran the inbox for you, without a model, right before launching you (node tools/director/bandeja.ts ` +
  `--proyecto ${proyecto}): what it printed goes at the end of this assignment, as it is. Do not run it again to read it: ` +
  `start working, with the procedures it names. Run it again only if you need what changed afterwards; --aplicar and ` +
  `--listo, as always.\n\nThe inbox:\n<<<\n${bandeja.trimEnd()}\n>>>`;

/**
 * Lo que impide cerrar por la pieza siguiente (pd_paquete_listo): con algo en la cola del director (`cola`, sus ids en su
 * orden), el director deja escrita en esta revisión (desde `desde`) cuál es la pieza que sigue, de su cola, con sus
 * archivos y cómo se comprueba. Sin cola, nada. null si está bien; si no, por qué, en una frase. Pura.
 */
export function piezaPorCerrar(pieza: PiezaSiguiente | undefined, desde: string, cola: readonly string[]): string | null {
  if (!cola.length) return null;
  const como = `\`"piezaSiguiente": { "cuando": "<ISO ahora>", "id": "<de tu cola>", "archivos": [{ "ruta": "<ruta en el repositorio>", "parte": "<función o sección, si no es entero>" }], "comprueba": "<cómo se comprueba al terminarla>" }\``;
  if (!pieza || !(Date.parse(pieza.cuando) >= Date.parse(desde))) return `deja escrita la pieza que sigue en tu cola, para que el Studio lance la revisión siguiente con lo que necesita dentro del encargo: ${como}.`;
  if (!cola.includes(pieza.id)) return `la pieza siguiente (\`piezaSiguiente.id\`: «${pieza.id}») no está en tu cola: elige una de ella (la primera es ${cola[0]}).`;
  if (!Array.isArray(pieza.archivos) || !pieza.archivos.length || !pieza.archivos.every((a) => texto(a?.ruta))) return `la pieza siguiente no dice bien sus archivos (cada uno con su \`ruta\`): ${como}.`;
  if (!texto(pieza.comprueba)) return 'la pieza siguiente no dice cómo se comprueba (`piezaSiguiente.comprueba`).';
  return null;
}

/** Lo más que pesa cada parte de un archivo que va dentro del encargo, y todas juntas (en KB de texto). */
export const MAX_KB_PARTE = 24;
const MAX_KB_PARTES = 64;

/**
 * La parte de un archivo que nombra la pieza siguiente: en Markdown, la sección cuyo título la contiene; en código, la
 * declaración con ese nombre, con su comentario de arriba, hasta la declaración siguiente. Sin parte, o si no la encuentra,
 * el archivo entero. null si lo que sale pasa de MAX_KB_PARTE (se lee aparte). Pura.
 */
export function parteDeArchivo(contenido: string, ruta: string, parte?: string): string | null {
  const lineas = contenido.split('\n');
  const cabe = (t: string) => (t.length <= MAX_KB_PARTE * 1024 ? t : null);
  if (!parte?.trim()) return cabe(contenido);
  const buscada = parte.trim().toLowerCase();
  if (/\.mdx?$/i.test(ruta)) {
    const ini = lineas.findIndex((l) => /^#{1,6} /.test(l) && l.toLowerCase().includes(buscada));
    if (ini < 0) return cabe(contenido);
    const nivel = /^#+/.exec(lineas[ini])![0].length;
    const fin = lineas.findIndex((l, i) => i > ini && new RegExp(`^#{1,${nivel}} `).test(l));
    return cabe(lineas.slice(ini, fin < 0 ? undefined : fin).join('\n'));
  }
  const nombre = parte.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const decl = lineas.findIndex((l) => new RegExp(`^(export\\s+)?(default\\s+)?(async\\s+)?(function\\*?|const|let|class|interface|type|enum)\\s+${nombre}\\b`).test(l));
  if (decl < 0) return cabe(contenido);
  let ini = decl;
  while (ini > 0 && /^(\/\*\*|\s\*|\/\/)/.test(lineas[ini - 1])) ini--;
  const fin = lineas.findIndex((l, i) => i > decl && /^(export |function |async |const |let |class |interface |type |enum |\/\*\*|\/\/)/.test(l));
  return cabe(lineas.slice(ini, fin < 0 ? undefined : fin).join('\n'));
}

/** Un procedimiento, o la parte de un archivo de la pieza siguiente, leído para ir dentro del encargo (null: no cupo). */
export interface Lectura {
  ruta: string;
  parte?: string;
  texto: string | null;
}

/**
 * El resto del paquete listo, al final del encargo del segundo tiempo, después de la bandeja (pd_paquete_listo): los
 * procedimientos que nombra la bandeja, enteros, para no leerlos; y la pieza siguiente de la cola, como la dejó escrita
 * el director al cerrar, con las partes de sus archivos ya leídas (lo que no cupo, se nombra para leerlo aparte). Nace en
 * inglés, como lo que lee el modelo. Sin nada, vacío. Pura.
 */
export function conElPaqueteListo(procedimientos: readonly Lectura[], pieza: PiezaSiguiente | null, partes: readonly Lectura[]): string {
  const bloques: string[] = [];
  const leidos = procedimientos.filter((p) => p.texto);
  if (leidos.length)
    bloques.push(`The procedures the inbox names, whole, as they are today: do not read them again.\n\n${leidos.map((p) => `<<< ${p.ruta}\n${p.texto!.trimEnd()}\n>>>`).join('\n\n')}`);
  if (pieza) {
    const enteras = partes.filter((p) => p.texto);
    const aparte = partes.filter((p) => !p.texto);
    bloques.push(
      `The next piece of your queue, as you left it written when closing the last review (${pieza.cuando}): ${pieza.id}. How it is checked: ${pieza.comprueba}` +
        (enteras.length ? ` Its files, already read (check them against the repository only if a commit since then touched them):\n\n${enteras.map((p) => `<<< ${p.ruta}${p.parte ? ` › ${p.parte}` : ''}\n${p.texto!.trimEnd()}\n>>>`).join('\n\n')}` : '') +
        (aparte.length ? `\n\nRead apart, they did not fit: ${aparte.map((p) => (p.parte ? `${p.ruta} (${p.parte})` : p.ruta)).join(', ')}.` : ''),
    );
  }
  return bloques.length ? `\n\n${bloques.join('\n\n')}` : '';
}

/**
 * Las lecturas de la pieza siguiente, con su tope entre todas (MAX_KB_PARTES): `leer` da el contenido de una ruta del
 * repositorio del proyecto, o null si no se puede leer. Pura, salvo `leer`.
 */
export function lecturasDeLaPieza(pieza: PiezaSiguiente, leer: (ruta: string) => string | null): Lectura[] {
  let usado = 0;
  return pieza.archivos.map((a) => {
    const contenido = leer(a.ruta);
    const t = contenido === null ? null : parteDeArchivo(contenido, a.ruta, a.parte);
    const cabe = t !== null && usado + t.length <= MAX_KB_PARTES * 1024;
    if (cabe) usado += t.length;
    return { ruta: a.ruta, ...(a.parte ? { parte: a.parte } : {}), texto: cabe ? t : null };
  });
}

/** Los procedimientos que nombra la salida de la bandeja (por su archivo), en el orden de PROCEDIMIENTOS. Pura. */
export const procedimientosNombrados = (bandeja: string): string[] =>
  Object.values(PROCEDIMIENTOS).map((p) => p.archivo).filter((a) => bandeja.includes(a));

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
 * Lo que el segundo tiempo recibe de su plan, al final de su encargo, en inglés como el resto (pd_nucleo_ingles): la lista
 * validada, en su orden, y cómo marcar cada encargo al terminarlo. El cierre sigue exigiendo todo, lo haya previsto el plan
 * o no. Pura.
 */
export const conElPlanDeLaRevision = (proyecto: string, encargos: readonly EncargoDeRevision[]): string =>
  ` Your first time wrote the plan of this review and the Studio validated it: work it in its order, task by task, and ` +
  `as soon as you finish one (with its tests and its commit, if it touches code), mark it with ${ordenDeHecho(proyecto, '<id>')}: ` +
  `the person sees the list in «Lo que va haciendo el director». What the inbox asks and the plan did not foresee is ` +
  `still yours: the closing requires everything, as always. The tasks: ` +
  encargos
    .map((e, i) => `(${i + 1}) «${e.id}»: ${e.que} From: ${e.origen.join(', ')}. Files: ${e.archivos.length ? e.archivos.map((a) => (a.parte ? `${a.ruta} (${a.parte})` : a.ruta)).join(', ') : 'none'}. Expected: ${e.espera}${e.procedimientos.length ? ` Procedures: ${e.procedimientos.map((p) => (PROCEDIMIENTOS as Record<string, { archivo: string } | undefined>)[p]?.archivo ?? p).join(', ')}.` : ''}${e.skills?.length ? ` Skills: ${e.skills.join(', ')}.` : ''}${e.modelo === 'director' ? '' : ` With a helper (${e.modelo}), if it is worth it.`}`)
    .join(' ');

/**
 * El modelo de los ayudantes del segundo tiempo, con el que su plan pide para cada encargo (propuesta aceptada
 * pr_modelos_por_tarea): el Studio lo fija al lanzarlo (revisor.ts › CLAUDE_CODE_SUBAGENT_MODEL, que ni el director ni la
 * definición del ayudante cambian), así que vale uno para todos. Si todo lo que el plan delega va con Haiku, Haiku; si algo
 * va con Sonnet, o nada se delega, el de siempre (`porDefecto`, modeloDeLosAyudantes): nunca uno menor que el que pide un
 * encargo, ni uno mayor que el de siempre. Pura.
 */
export function ayudantesDelPlan(encargos: readonly EncargoDeRevision[], porDefecto: string): string {
  const delegados = new Set(encargos.map((e) => e.modelo).filter((m) => m !== 'director'));
  return delegados.size === 1 && delegados.has('haiku') ? 'haiku' : porDefecto;
}

/** Lo que el segundo tiempo sabe del modelo de sus ayudantes, al final de su plan, en inglés como el resto. Pura. */
export const conLosAyudantesDelPlan = (modelo: string) =>
  ` Your helpers in this review work with «${modelo}»: the Studio set it from what your plan asks of each task.`;

/**
 * Las skills que nombra el plan de la revisión, sin repetir y en orden: el segundo tiempo arranca solo con ellas
 * (pd_dos_tiempos; decisión del titular nmvm0r0rstit, 24 de octubre de 2026, «El paquete de cada revisión», parte 12,
 * punto 2; ajustesClaude.ts › skillsDelSegundoTiempo). Pura.
 */
export const skillsDelPlan = (encargos: readonly EncargoDeRevision[]): string[] =>
  [...new Set(encargos.flatMap((e) => (Array.isArray(e.skills) ? e.skills.filter(texto).map((s) => s.trim()) : [])))].sort();

/** Dónde queda la lista de encargos de una revisión: junto a su registro, como su paquete (paquete.ts). */
export const archivoDeEncargos = (registro: string) => `${registro.replace(/\.log$/, '')}.encargos.json`;

/** El registro del primer tiempo, junto al de la revisión y sin «.log»: así no se cuenta como otro lanzamiento. */
export const registroDelPrimerTiempo = (registro: string) => `${registro.replace(/\.log$/, '')}.primer.jsonl`;

/** Lo que quedó del primer tiempo, en una línea del registro de la revisión: para sus tokens y para saber cómo salió. */
export interface PrimerTiempoEscrito {
  /** Si dejó una lista de encargos válida. */
  ok: boolean;
  encargos?: number;
  /** Por qué no, en una frase. */
  porque?: string;
  /** Con lo de los dos, los minutos y los tokens suman los de cada intento. */
  minutos: number | null;
  tokens: number | null;
  /** Si hubo reintento: cuántos intentos, y por qué el primero no dejó su lista. */
  intentos?: number;
  antes?: string;
}

/** La línea del registro de la revisión con lo que quedó del primer tiempo. Pura. */
export const lineaDelPrimerTiempo = (p: PrimerTiempoEscrito) => `${JSON.stringify({ type: 'studio', primerTiempo: p })}\n`;

/**
 * La línea con que empieza un reintento en el registro del primer tiempo: lo de antes de ella es del intento anterior, y
 * finDelPrimerTiempo no lo lee (ni su respuesta ni sus tokens). Pura.
 */
export const lineaDeReintento = (intento: number, porque: string) => `${JSON.stringify({ type: 'studio', intento, porque })}\n`;

/** Lo que deja un intento del primer tiempo: su lista, por qué no la hay, o quién lo detuvo con «Detener ahora». */
export type IntentoDelPrimerTiempo = { encargos: EncargoDeRevision[]; escrito: PrimerTiempoEscrito } | { porque: string; escrito: PrimerTiempoEscrito } | { detenida: string };

const sumar = (a: number | null, b: number | null, decimales: number) => (a === null && b === null ? null : Math.round(((a ?? 0) + (b ?? 0)) * 10 ** decimales) / 10 ** decimales);

/**
 * El primer tiempo con su reintento (nota del titular nmvwig61gtit, 31 de octubre de 2026): si un intento no deja una lista
 * válida, se intenta otra vez, con el porqué del anterior, hasta INTENTOS_PRIMER_TIEMPO; solo después la revisión sigue en
 * un solo tiempo. Lo que lleva a eso, en los dos intentos: que no responda con la lista o no sea JSON, que la lista no pase
 * la validación (un encargo que no cabe en la ventana de su modelo, un campo que falta), que Claude Code termine con error
 * sin dejarla (el límite de uso de la cuenta, la red, la sesión), que no arranque o que se pase de MAX_MIN_PRIMER_TIEMPO.
 * «Detener ahora» no se reintenta: la revisión termina ahí. Lo escrito suma los minutos y los tokens de los dos. `intentar`
 * corre un intento; `antesDeReintentar`, lo que se hace entre uno y otro (la bitácora). Sin entrada ni salida propias.
 */
export async function planearConReintento(intentar: (intento: number, previo: string | null) => Promise<IntentoDelPrimerTiempo>, antesDeReintentar?: (porque: string) => unknown): Promise<IntentoDelPrimerTiempo> {
  let fallido: { porque: string; escrito: PrimerTiempoEscrito } | null = null;
  for (let intento = 1; ; intento++) {
    const r = await intentar(intento, fallido?.porque ?? null);
    if ('detenida' in r) return r;
    const escrito: PrimerTiempoEscrito = fallido
      ? { ...r.escrito, minutos: sumar(fallido.escrito.minutos, r.escrito.minutos, 1), tokens: sumar(fallido.escrito.tokens, r.escrito.tokens, 0), intentos: intento, antes: fallido.porque }
      : r.escrito;
    if ('encargos' in r) return { encargos: r.encargos, escrito };
    fallido = { porque: r.porque, escrito };
    if (intento >= INTENTOS_PRIMER_TIEMPO) return fallido;
    await antesDeReintentar?.(r.porque);
  }
}

/**
 * Lo que dice el registro del primer tiempo al terminar: su respuesta final, sus tokens, cuánto duró y la ventana del modelo
 * con que trabajó (para validar los encargos contra la del director de verdad). Solo lo del último intento: un reintento
 * empieza con su línea (lineaDeReintento), y lo de antes no cuenta. Puro: el texto del registro.
 */
export function finDelPrimerTiempo(registro: string): { respuesta: string | null; tokens: number | null; minutos: number | null; ventana: number | null } {
  let r: any = null;
  for (const linea of registro.split('\n')) {
    if (!linea.startsWith('{')) continue;
    try {
      const e = JSON.parse(linea);
      if (e?.type === 'result') r = e;
      if (e?.type === 'studio' && typeof e.intento === 'number') r = null;
    } catch {
      // una línea a medio escribir no dice nada
    }
  }
  if (!r) return { respuesta: null, tokens: null, minutos: null, ventana: null };
  const ventanas = Object.values((r.modelUsage ?? {}) as Record<string, { contextWindow?: number }>).map((u) => Number(u?.contextWindow)).filter((n) => n > 0);
  return {
    respuesta: typeof r.result === 'string' ? r.result : null,
    tokens: tokensDelResultado(r),
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

/** Cómo van unas revisiones: cuántas, cuánto duran, sus tokens (la mediana) y cuántas cerraron. */
export interface ResumenDeRevisiones {
  n: number;
  minutos: number | null;
  tokens: number | null;
  cerraron: number;
}

const mediana = (xs: number[]): number | null => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round(((s[m - 1] + s[m]) / 2) * 100) / 100;
};

const enteros = (x: number | null) => (x === null ? null : Math.round(x));

/** El resumen de unas revisiones (solo las de tipo revisión: las urgencias y las aclaraciones son otra cosa). Pura. */
export function resumirRevisiones(lineas: readonly LineaDeRevision[]): ResumenDeRevisiones {
  const rs = lineas.filter((l) => l.tipo === 'revision');
  return {
    n: rs.length,
    minutos: mediana(rs.map((l) => l.minutos).filter((x): x is number => typeof x === 'number')),
    tokens: enteros(mediana(rs.map((l) => l.tokens).filter((x): x is number => typeof x === 'number'))),
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
