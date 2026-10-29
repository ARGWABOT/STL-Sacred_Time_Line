// El modelo y el esfuerzo de Claude Code en este computador: los de su configuración (~/.claude/settings.json, o la de
// CLAUDE_CONFIG_DIR), los mismos que cambian /model y /effort. El Studio los lee y los escribe ahí, así que elegir en
// «Modelo y consumo» es lo mismo que usar /model o /effort en cualquier sesión de Claude Code, y al revés. Solo toca el
// modelo, el esfuerzo de ese modelo (en `modelSettings`, donde lo guarda /effort) y la clave de ultracode: lo demás queda
// intacto, y si el archivo no es JSON válido no lo toca.
//
// Como /effort (https://code.claude.com/docs/en/settings-reference#modelsettings): el esfuerzo se guarda por modelo, con
// su nombre canónico; la clave general `effortLevel` del archivo del usuario ya no cuenta para Opus 5.5 ni para los
// modelos posteriores; y «max» no se guarda nunca (Claude Code lo aplica solo a una sesión y rechaza el archivo que lo
// tenga), así que el Studio lo recuerda aparte (estudio.local.json › esfuerzoMaximo) y lo pasa con --effort a lo que lanza.
// Lo encontró el titular el 21 de octubre de 2026: con Sonnet y «Máximo», Claude Code seguía en medio.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { esEsfuerzo, MODELO_VALIDO, type Esfuerzo } from '../../src/director/proyectos.ts';
import { clavesDeAjustes } from './clavesAjustes.ts';

/** Los esfuerzos que Claude Code guarda en su configuración: todos menos «max», que vale solo para una sesión. */
const esEsfuerzoGuardable = (x: unknown): x is Exclude<Esfuerzo, 'max'> => esEsfuerzo(x) && x !== 'max';

/** La versión más nueva de cada familia, para un alias sin entrada en `modelSettings` (los mismos de «Modelo y consumo»). */
const MAS_NUEVO: Record<string, string> = { opus: 'claude-opus-5-5', sonnet: 'claude-sonnet-5-5', haiku: 'claude-haiku-5-5', fable: 'claude-fable-5-1' };

/** Dónde guarda Claude Code su configuración de usuario. */
export const archivoAjustesClaude = (env: NodeJS.ProcessEnv = process.env) => join(env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), 'settings.json');

/** El modelo y el esfuerzo elegidos en Claude Code; null: el que trae la cuenta por defecto. */
export interface AjustesClaude {
  modelo: string | null;
  esfuerzo: Esfuerzo | null;
  /**
   * Ultracode en las sesiones nuevas (la clave `ultracode`: Claude planea un flujo de varios agentes para cada tarea de
   * peso). Claude Code la lee pero no la escribe: /effort ultracode lo enciende solo para una sesión.
   */
  ultracode: boolean;
}

type Json = Record<string, any>;
const objeto = (x: unknown): Json => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Json) : {});

/**
 * La entrada de `modelSettings` que corresponde a un modelo: la de su id (sin «[1m]») o, si es un alias (opus,
 * sonnet…), la de la versión más nueva de esa familia que tenga una entrada. Ahí guarda Claude Code el esfuerzo de cada modelo.
 */
export function entradaDelModelo(porModelo: Json, modelo: string | null): string | null {
  const base = modelo?.replace(/\[1m\]$/i, '') ?? null;
  if (!base) return null;
  const claves = Object.keys(porModelo);
  if (claves.includes(base)) return base;
  if (!/^[a-z]+$/.test(base)) return null;
  return claves.filter((k) => k.startsWith(`claude-${base}-`)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).at(-1) ?? null;
}

/**
 * El nombre con que Claude Code guarda el esfuerzo de un modelo en `modelSettings`: su entrada si ya la tiene; si no, el
 * id sin «[1m]» ni fecha, o, para un alias, la versión más nueva de su familia.
 */
export function nombreCanonico(porModelo: Json, modelo: string | null): string | null {
  const entrada = entradaDelModelo(porModelo, modelo);
  if (entrada) return entrada;
  const base = modelo?.replace(/\[1m\]$/i, '').replace(/-\d{8}$/, '') ?? null;
  if (!base) return null;
  return /^[a-z]+$/.test(base) ? (MAS_NUEVO[base] ?? null) : base;
}

/** Si la clave general `effortLevel` del archivo del usuario ya no cuenta para ese modelo: Opus, Sonnet y Haiku desde la 5.5. */
export function ignoraEsfuerzoGeneral(canonico: string | null): boolean {
  const v = canonico?.match(/^claude-(?:opus|sonnet|haiku)-(\d+)-(\d+)$/);
  return !!v && (Number(v[1]) > 5 || (Number(v[1]) === 5 && Number(v[2]) >= 5));
}

async function leerJson(archivo: string): Promise<Json> {
  if (!existsSync(archivo)) return {};
  return objeto(JSON.parse(await readFile(archivo, 'utf-8')));
}

/**
 * Lo que Claude Code tiene elegido: el esfuerzo guardado para el modelo o, si ese modelo todavía la usa, la clave general;
 * null, el que trae el modelo por defecto. Si el archivo no está o no se entiende, el de la cuenta.
 */
export async function leerAjustesClaude(archivo = archivoAjustesClaude()): Promise<AjustesClaude> {
  let j: Json;
  try {
    j = await leerJson(archivo);
  } catch {
    return { modelo: null, esfuerzo: null, ultracode: false };
  }
  const modelo = typeof j.model === 'string' && MODELO_VALIDO.test(j.model) ? j.model : null;
  const porModelo = objeto(j.modelSettings);
  const canonico = nombreCanonico(porModelo, modelo);
  const propio = canonico ? objeto(porModelo[canonico]).effortLevel : undefined;
  const general = !ignoraEsfuerzoGeneral(canonico) && esEsfuerzoGuardable(j.effortLevel) ? j.effortLevel : null;
  return { modelo, esfuerzo: esEsfuerzoGuardable(propio) ? propio : general, ultracode: j.ultracode === true };
}

/** Cambia la configuración de Claude Code. Si el archivo no es JSON válido, no lo toca y lo dice. */
async function cambiar(archivo: string, cambio: (j: Json) => void): Promise<void> {
  let j: Json;
  try {
    j = await leerJson(archivo);
  } catch {
    throw new Error(`La configuración de Claude Code (${archivo}) no es JSON válido: el Studio no la toca. Corrígela o usa /model y /effort en Claude Code.`);
  }
  cambio(j);
  await mkdir(dirname(archivo), { recursive: true });
  // Primero a un archivo aparte y luego encima: nunca queda a medio escribir
  const temporal = `${archivo}.stl-${process.pid}.tmp`;
  await writeFile(temporal, JSON.stringify(j, null, 2) + '\n', 'utf-8');
  await rename(temporal, archivo);
}

/** Como /model: el modelo de Claude Code en este computador; null lo quita y vuelve al de la cuenta. */
export async function guardarModeloClaude(modelo: string | null, archivo = archivoAjustesClaude()): Promise<void> {
  if (modelo && !MODELO_VALIDO.test(modelo)) throw new Error(`«${modelo}» no es un modelo que acepte Claude Code.`);
  await cambiar(archivo, (j) => {
    if (modelo) j.model = modelo;
    else delete j.model;
  });
}

/**
 * Como /effort: el esfuerzo guardado para el modelo elegido, en su entrada de `modelSettings`; null lo quita (/effort
 * auto). Sin modelo elegido, la clave general, como antes. «max» no se guarda: Claude Code no lo acepta en su archivo (el
 * Studio lo recuerda aparte). Quita también un «max» que haya quedado de antes, que haría que Claude Code rechazara el archivo.
 */
export async function guardarEsfuerzoClaude(esfuerzo: string | null, archivo = archivoAjustesClaude()): Promise<void> {
  if (esfuerzo === 'max') throw new Error('Claude Code no guarda el esfuerzo «max»: lo aplica solo a una sesión.');
  if (esfuerzo && !esEsfuerzoGuardable(esfuerzo)) throw new Error(`«${esfuerzo}» no es un esfuerzo que acepte Claude Code.`);
  await cambiar(archivo, (j) => {
    const porModelo = objeto(j.modelSettings);
    if (j.effortLevel === 'max') delete j.effortLevel;
    for (const k of Object.keys(porModelo)) if (objeto(porModelo[k]).effortLevel === 'max') delete porModelo[k].effortLevel;
    const canonico = nombreCanonico(porModelo, typeof j.model === 'string' ? j.model : null);
    if (!canonico) {
      if (esfuerzo) j.effortLevel = esfuerzo;
      else delete j.effortLevel;
    } else if (esfuerzo) porModelo[canonico] = { ...objeto(porModelo[canonico]), effortLevel: esfuerzo };
    else if (porModelo[canonico]) delete porModelo[canonico].effortLevel;
    // Sin entradas vacías: así queda como lo deja /effort auto
    for (const k of Object.keys(porModelo)) if (!Object.keys(objeto(porModelo[k])).length) delete porModelo[k];
    if (Object.keys(porModelo).length) j.modelSettings = porModelo;
    else delete j.modelSettings;
  });
}

/**
 * El esfuerzo con que el Studio lanza: «max» si se eligió (Claude Code no lo guarda, el Studio sí), o el guardado. Junto
 * con el guardado, que es con el que siguen tus otras sesiones de Claude Code.
 */
export function conMaximo(a: AjustesClaude, maximo: boolean): AjustesClaude & { esfuerzoGuardado: Esfuerzo | null } {
  return { ...a, esfuerzo: maximo ? 'max' : a.esfuerzo, esfuerzoGuardado: a.esfuerzo };
}

/** Ultracode en las sesiones nuevas de Claude Code de este computador; apagado quita la clave (sin ella, está apagado). */
export async function guardarUltracodeClaude(activo: boolean, archivo = archivoAjustesClaude()): Promise<void> {
  await cambiar(archivo, (j) => {
    if (activo) j.ultracode = true;
    else delete j.ultracode;
  });
}

/**
 * Lo que el Studio le suma a la configuración del director que lanza (--settings): sin ultracode, aunque tus sesiones lo
 * tengan, porque sus permisos no incluyen los flujos de varios agentes (Workflow) y nadie está mirando lo que gastan.
 * Darle ese permiso es una decisión del titular: con «Autorizo» en «Modelo y consumo» (ajustesDelDirector).
 */
export const AJUSTES_DEL_DIRECTOR = { ultracode: false } as const;

/**
 * Sin los conectores de claude.ai (Google Drive, Claude Docs y los demás), siempre (pedido del titular del 23 de octubre
 * de 2026, «El paquete de cada revisión», parte 3): el director no los puede usar, ocupaban contexto en cada revisión y en
 * cada ayudante, y el de Claude Docs le pedía crear documentos en la web de Claude, justo lo que prohíbe su regla.
 * `disableClaudeAiConnectors` está en la referencia de ajustes de Claude Code; el lanzador suma su variable
 * (ENABLE_CLAUDEAI_MCP_SERVERS=false) por si un ajuste de más arriba la contradice.
 */
export const SIN_CONECTORES = { disableClaudeAiConnectors: true } as const;

/**
 * El arranque igual y limpio de cada sesión que lanza el Studio (decisiones del titular del 23 de octubre de 2026, «El
 * paquete de cada revisión», parte 10; pd_arranque_limpio): sin tu CLAUDE.md global ni tus reglas de ~/.claude/rules
 * (claudeMdExcludes), sin tus hooks (disableAllHooks: el de sincronizar las cuentas corría en cada director), sin tu
 * memoria automática (autoMemoryEnabled) y sin la foto de git (includeGitInstructions), que cambian de un arranque a
 * otro y rompen la caché del comienzo. Las cuatro claves están en la referencia de ajustes de Claude Code, y el lanzador
 * suma las variables de las dos últimas. Las herramientas no se quitan (decisión 3: quitarlas rompe la caché), y tus
 * ajustes siguen cargando, para no perder lo que en ellos cuida tu privacidad. `home`: la carpeta de la persona. Pura.
 */
export function arranqueLimpio(home: string) {
  const casa = home.replace(/\\/g, '/').replace(/\/+$/, '');
  return {
    claudeMdExcludes: [`${casa}/.claude/CLAUDE.md`, `${casa}/.claude/rules/**`],
    disableAllHooks: true,
    autoMemoryEnabled: false,
    includeGitInstructions: false,
  };
}

/**
 * Las skills del segundo tiempo de la revisión (pd_dos_tiempos; decisión del titular nmvm0r0rstit, 24 de octubre de 2026,
 * «El paquete de cada revisión», parte 12, punto 2): arranca solo con las que nombra su plan (dosTiempos.ts ›
 * skillsDelPlan), y así no carga en su contexto la lista de las demás. Las que el Studio encuentra en sus carpetas
 * (`disponibles`, skillsDisponibles) y el plan no nombra se apagan con `skillOverrides` en «off» (ni el modelo ni el menú
 * las ven), y las que trae Claude Code, con `disableBundledSkills`, salvo que el plan nombre una que no está entre las
 * disponibles (puede ser de las que trae: la guía de los flujos, por ejemplo). Las dos claves están en la referencia de
 * ajustes de Claude Code. Sin plan (`nombradas` null), nada: arranca como hoy. Pura.
 */
export function skillsDelSegundoTiempo(nombradas: readonly string[] | null, disponibles: readonly string[]): { skillOverrides?: Record<string, 'off'>; disableBundledSkills?: true } {
  if (!nombradas) return {};
  const apagadas = [...new Set(disponibles)].filter((s) => !nombradas.includes(s)).sort();
  const deClaude = nombradas.some((s) => !disponibles.includes(s));
  return { ...(apagadas.length ? { skillOverrides: Object.fromEntries(apagadas.map((s) => [s, 'off' as const])) } : {}), ...(deClaude ? {} : { disableBundledSkills: true as const }) };
}

/** Los ajustes del director (su JSON) con las skills de su plan (skillsDelSegundoTiempo), sobre lo que ya traían. Pura. */
export function conSkillsDelPlan(ajustes: string, nombradas: readonly string[] | null, disponibles: readonly string[]): string {
  const a = JSON.parse(ajustes) as Record<string, unknown>;
  const s = skillsDelSegundoTiempo(nombradas, disponibles);
  if (!Object.keys(s).length) return ajustes;
  const antes = a.skillOverrides && typeof a.skillOverrides === 'object' ? (a.skillOverrides as Record<string, unknown>) : {};
  return JSON.stringify({ ...a, ...s, ...(s.skillOverrides ? { skillOverrides: { ...antes, ...s.skillOverrides } } : {}) });
}

/**
 * Los nombres de las skills y los comandos que Claude Code encuentra en unas carpetas (la del Studio, la del proyecto y la
 * de la persona): cada `.claude/skills/<nombre>/SKILL.md` (con el `name:` de su cabecera, si lo trae) y cada
 * `.claude/commands/<nombre>.md`. Sin repetir y en orden; lo que no se puede leer no cuenta.
 */
export function skillsDisponibles(carpetas: readonly string[]): string[] {
  const nombres = new Set<string>();
  for (const c of carpetas) {
    const skills = join(c, '.claude', 'skills');
    if (existsSync(skills)) {
      for (const d of leerCarpeta(skills)) {
        const archivo = join(skills, d, 'SKILL.md');
        if (!existsSync(archivo)) continue;
        let nombre = d;
        try {
          const cabecera = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(archivo, 'utf8'))?.[1] ?? '';
          nombre = /^name:\s*["']?([^"'\r\n]+?)["']?\s*$/m.exec(cabecera)?.[1] ?? d;
        } catch {
          // sin leerla, su carpeta dice su nombre
        }
        nombres.add(nombre.trim());
      }
    }
    const comandos = join(c, '.claude', 'commands');
    if (existsSync(comandos)) for (const f of leerCarpeta(comandos)) if (f.endsWith('.md')) nombres.add(f.slice(0, -3));
  }
  return [...nombres].sort();
}

const leerCarpeta = (carpeta: string): string[] => {
  try {
    return readdirSync(carpeta);
  } catch {
    return [];
  }
};

/**
 * El núcleo del director, explícito (propuesta aceptada «Las reglas, a la medida de cada encargo», pr_reglas_por_encargo,
 * punto 3): el lanzador le pasa las reglas del Studio, su CLAUDE.md, al final de su indicación de sistema
 * (--append-system-prompt-file, en la referencia de la línea de órdenes de Claude Code), en vez de esperar que Claude Code
 * las cargue solo, que en el modo sin pantalla dejará de hacerlo en una versión futura: lo elige el código, no el modelo.
 * Las saca de lo que carga solo (claudeMdExcludes), con el AGENTS.md que leería en su lugar, para que no lleguen dos
 * veces. `estudio`: la carpeta del Studio; `archivo`: donde el lanzador deja el texto que pasa (textoDelNucleo). Pura.
 */
export function nucleoExplicito(estudio: string, archivo: string): { claudeMdExcludes: string[]; argumentos: string[] } {
  const carpeta = estudio.replace(/\\/g, '/').replace(/\/+$/, '');
  return { claudeMdExcludes: [`${carpeta}/CLAUDE.md`, `${carpeta}/AGENTS.md`], argumentos: ['--append-system-prompt-file', archivo] };
}

/**
 * Lo que el lanzador pasa como núcleo: CLAUDE.md tal cual, con una línea antes que dice qué es, para que «CLAUDE.md» en el
 * encargo o en un procedimiento nombre este texto y no un archivo que abrir. En inglés, porque lo lee el modelo. Pura.
 */
export const textoDelNucleo = (claude: string) =>
  `# CLAUDE.md, the rules of STL Studio\n\nThe launcher passes them here instead of letting Claude Code load the file on its own. Wherever the assignment or a procedure says «CLAUDE.md», it means this text: there is no need to open the file.\n\n${claude}`;

/** Los ajustes del director (su JSON) con el núcleo explícito: lo que ya no carga solo, sumado a lo que excluía el arranque limpio. Pura. */
export function conNucleoExplicito(ajustes: string, estudio: string): string {
  const a = JSON.parse(ajustes) as Record<string, unknown>;
  const antes = Array.isArray(a.claudeMdExcludes) ? a.claudeMdExcludes.filter((x): x is string => typeof x === 'string') : [];
  return JSON.stringify({ ...a, claudeMdExcludes: [...new Set([...antes, ...nucleoExplicito(estudio, '').claudeMdExcludes])] });
}

/**
 * La configuración del director lanzado y si puede correr flujos de varios agentes: con el permiso del titular y
 * ultracode encendido, sigue a ultracode como tus sesiones (y necesita Workflow); si falta cualquiera de los dos, sin él.
 * Siempre sin los conectores de claude.ai (SIN_CONECTORES) y con el arranque limpio (arranqueLimpio). Sin tus ajustes
 * (`propios` falso, fuentesDelDirector), ultracode ya no llega de ellos: si sigue, va explícito.
 */
export function ajustesDelDirector(ultracode: boolean, permitido: boolean, home = homedir(), propios = true): { ajustes: Record<string, unknown>; flujos: boolean } {
  const siempre = { ...SIN_CONECTORES, ...arranqueLimpio(home) };
  if (ultracode && permitido) return { ajustes: propios ? siempre : { ...siempre, ultracode: true }, flujos: true };
  return { ajustes: { ...siempre, ...AJUSTES_DEL_DIRECTOR }, flujos: false };
}

/**
 * De dónde carga sus ajustes el director lanzado: sin tus ajustes de usuario (Local › ajustesPropios falso), solo los del
 * proyecto y los locales, y con ellos se van tus skills, tus comandos y lo demás de ~/.claude/settings.json (nota de voz
 * del titular nmvojtb7rtit, 25 de octubre de 2026: elegirlo en «Modelo y consumo»; pd_arranque_limpio). Los de --settings
 * (ajustesDelDirector) se cargan siempre. Con ellos, nada cambia: lo de siempre. Pura.
 */
export const fuentesDelDirector = (propios: boolean): string[] => (propios ? [] : ['--setting-sources', 'project,local']);

/**
 * Los nombres de las claves de tus ajustes de usuario de Claude Code, sin sus valores, para elegir en «Modelo y consumo»
 * si el director los carga (clavesDeAjustes). [] si no hay archivo; null si no es JSON válido. Lo lee el servidor del
 * Studio, nunca el director.
 */
export async function clavesDeTusAjustes(archivo = archivoAjustesClaude()): Promise<string[] | null> {
  if (!existsSync(archivo)) return [];
  try {
    return clavesDeAjustes(JSON.parse(await readFile(archivo, 'utf8')));
  } catch {
    return null;
  }
}
