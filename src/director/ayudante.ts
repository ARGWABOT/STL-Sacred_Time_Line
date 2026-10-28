// Los encargos cortos a ayudantes (propuesta aceptada «El director arma el contexto de cada encargo», pr_encargo_a_medida,
// punto 2): para el trabajo aprobado y acotado, el director escribe qué hacer, qué leer y cómo se comprueba, y un ayudante
// lo ejecuta con contexto limpio, solo con eso y con sus mismos permisos (revisor.ts › entornoDelDirector: con un modelo
// más barato y sin abrir otros); al terminar, el director lo verifica contra el encargo y, si falta algo, se lo devuelve
// con lo que faltó. Lo que no cambia de un encargo a otro (cómo se corren las órdenes, el commit, lo que nunca hace y cómo
// responde) lo pone el código, para que ningún ayudante arranque sin las reglas que el director sí recibe (revisor.ts ›
// COMO_ORDENES). Es texto para el modelo: nace en inglés (decisión del titular del 23 de octubre de 2026).

/** Lo que el director escribe en cada encargo; lo demás lo pone `encargoDeAyudante`. */
export interface EncargoDeAyudante {
  /** De dónde nace: el id de la propuesta aceptada o del pedido que se ejecuta. */
  origen: string;
  /** Qué hacer: el resultado que se espera, en pocas frases. */
  que: string;
  /** Lo que lee primero, rutas del repositorio: con eso empieza, sin explorar el resto. */
  leer: string[];
  /** Cómo se comprueba: las pruebas que lo cubren y lo que debe pasar. */
  comprobar: string;
}

/** El repositorio donde trabaja el ayudante: su proyecto, su carpeta y si sus commits nacen con la firma de publicación. */
export interface RepositorioDelAyudante {
  proyecto: string;
  carpeta: string;
  firma: boolean;
}

/** Lo que le falta a un encargo para darlo: sin eso, el ayudante adivina. Vacío, está completo. Pura. */
export function faltaEnElEncargo(e: Partial<EncargoDeAyudante>): string[] {
  const falta: string[] = [];
  if (!e.origen?.trim()) falta.push('--origen: el id de la propuesta o el pedido aprobado que se ejecuta');
  if (!e.que?.trim()) falta.push('--que: qué hacer, el resultado que se espera');
  if (!e.leer?.some((r) => r.trim())) falta.push('--leer: los archivos que lee primero, separados por comas');
  if (!e.comprobar?.trim()) falta.push('--comprobar: cómo se comprueba (sus pruebas y lo que debe pasar)');
  return falta;
}

/** Cómo se corren las órdenes con los permisos del director, que el ayudante hereda: lo mismo que COMO_ORDENES. */
export const ORDENES_DEL_AYUDANTE =
  'To read with git in another folder, cd there first and then run the command: git -C is not allowed. Run the tests ' +
  'and the type check alone and as they are (npm test, npx vitest run <file>, npm run typecheck): no variables in front, ' +
  'no ; and no pipes or redirections (| or 2>&1), which are denied. Never chain commands with && or ;. To read and ' +
  'search use Read, Grep and Glob, not the terminal (cat, sed, grep, head, ls, wc). Never read a .env file.';

/** Lo que el ayudante nunca hace, aunque su tarea parezca pedirlo: eso es del director, con los pasos del titular. */
export const NUNCA_EL_AYUDANTE =
  'Never: push or publish, rewrite history, delete files, install anything, start the Studio server, touch the ' +
  "project's memory (.stl) or the director's plan, change anything outside your task, or launch other helpers.";

/** El commit de cada cambio: con la firma de publicación del proyecto (tools/director/firmar.ts) o con git, en su carpeta. */
const comoCommit = (r: RepositorioDelAyudante) =>
  r.firma
    ? `with the project's publication signature: node tools/director/firmar.ts --proyecto ${r.proyecto} -m "<message>" -- <paths> (a new file needs git add first, from ${r.carpeta})`
    : `cd ${r.carpeta}, then git add <paths>, then git commit -m "<message>" -- <paths>, each one separately`;

/**
 * El encargo entero de un ayudante, para dárselo tal cual: lo que escribió el director (de dónde nace, qué hacer, qué leer
 * y cómo se comprueba) y las reglas que el ayudante no recibe (las normas del proyecto, las órdenes, el commit, lo que
 * nunca hace y cómo responde, para que el director lo verifique). Pura.
 */
export function encargoDeAyudante(e: EncargoDeAyudante, r: RepositorioDelAyudante): string {
  const leer = e.leer.map((x) => x.trim()).filter(Boolean);
  return [
    `You are a helper of the STL Studio director, working on the repository of the project «${r.proyecto}» (${r.carpeta}). You start with a clean context: you don't know the review or the plan, and you don't need them. Do only this task, with the rules below.`,
    `Task (from ${e.origen.trim()}, already approved by the project owner): ${e.que.trim()}`,
    `Read first: ${leer.join(', ')}. Start there; open anything else only when those files point you to it.`,
    `How it is checked: ${e.comprobar.trim()}`,
    [
      'Rules:',
      "- The repository's own norms (its CLAUDE.md or AGENTS.md) decide how the work is done: style, tests, branches. Follow them; if one clashes with these rules, don't do that part and say so in your reply.",
      '- Write code that reads like the code around it, with tests for what you change. Comments and the commit message in the language of the repository (Spanish, if it is written in Spanish).',
      `- Commands: ${ORDENES_DEL_AYUDANTE}`,
      `- Commit each change as soon as its tests and its types pass, only with your paths, ${comoCommit(r)}. End the message with the line "Co-Authored-By: Claude <noreply@anthropic.com>".`,
      `- ${NUNCA_EL_AYUDANTE}`,
      "- If a permission is denied, don't work around it: finish the rest and say what you couldn't do and which permission was missing.",
    ].join('\n'),
    "When you finish, reply in a few lines, without embellishing: what you changed (the files), each commit (its subject), how you checked it (the tests and the type check you ran, and their result) and what you couldn't do or didn't work. The director checks your work against this brief before counting it as done.",
  ].join('\n\n');
}
