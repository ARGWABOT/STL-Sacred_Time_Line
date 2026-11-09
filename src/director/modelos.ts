// El inventario de los modelos (propuesta aceptada «Cada modelo para lo suyo», pr_modelos_por_tarea, punto 1, con la
// opción que eligió el titular el 28 de octubre de 2026 en t_inventario_modelos: «B: la tabla en el código, con su
// aviso»). Una tabla con los modelos de Claude que puede tener a mano Claude Code y lo que Anthropic dice de cada uno
// (para qué lo recomienda y su contexto), con su fuente y su fecha. No gasta nada: se pone al día con cada
// versión nueva del Studio y se prueba como el resto del código. Como puede quedar vieja entre una versión y otra, dice
// cuándo un modelo no está en ella o cuándo pasó de DIAS_PARA_AVISO. La usan el encargo de cada revisión y la ejecución
// (revisor.ts › POLITICA_DE_MODELOS), las ventanas de los dos tiempos (dosTiempos.ts › VENTANAS) y «Modelo y consumo».

/** Una familia de modelos: también es el alias de Claude Code que sigue solo a la más nueva. */
export type Familia = 'opus' | 'sonnet' | 'haiku' | 'fable';

export interface ModeloConocido {
  id: string;
  familia: Familia;
  nombre: string;
  /** Para qué lo recomienda Anthropic, en una frase. */
  para: string;
  /** Lo mismo, en inglés: así lo lee el modelo en el encargo (INVENTARIO_EN_EL_ENCARGO). */
  paraEnIngles: string;
  /** Su contexto, en tokens. */
  contexto: number;
  /** Lo más que escribe en una respuesta, en tokens. */
  salida: number;
  /** La ventana que le da Claude Code, si es menor que su contexto en la API (lo informa en cada lanzamiento). */
  ventanaEnClaudeCode?: number;
}

/** La tabla, con su fecha y su fuente. La primera de cada familia es la más nueva: a ella apunta su alias. */
export const INVENTARIO: { fecha: string; fuente: string; modelos: ModeloConocido[] } = {
  fecha: '2026-10-28',
  fuente:
    'la tabla de modelos de Anthropic (platform.claude.com/docs/en/about-claude/models/overview y la guía de la API de ' +
    'Claude); la ventana de Haiku en Claude Code, la que él informó en un lanzamiento (modelUsage.contextWindow)',
  modelos: [
    { id: 'claude-fable-5-1', familia: 'fable', nombre: 'Fable 5.1', para: 'El más capaz: el razonamiento más exigente y el trabajo de agente de horas. Es el que más consume de tu plan.', paraEnIngles: 'The most capable: the most demanding reasoning and hours-long agent work. It uses the most of the plan.', contexto: 1_000_000, salida: 128_000 },
    { id: 'claude-opus-5-5', familia: 'opus', nombre: 'Opus 5.5', para: 'El Opus actual y el que Anthropic recomienda por defecto: dirigir, decidir y el código difícil.', paraEnIngles: "The current Opus and Anthropic's default recommendation: directing, deciding and hard code.", contexto: 1_000_000, salida: 128_000 },
    { id: 'claude-sonnet-5-5', familia: 'sonnet', nombre: 'Sonnet 5.5', para: 'Velocidad y capacidad para el código y los agentes de todos los días: los cambios acotados y con pruebas.', paraEnIngles: 'Speed and capability for everyday code and agents: bounded changes with their tests.', contexto: 1_000_000, salida: 128_000 },
    { id: 'claude-haiku-5-5', familia: 'haiku', nombre: 'Haiku 5.5', para: 'El más rápido y el que menos consume de tu plan: las lecturas y las búsquedas masivas, y lo simple.', paraEnIngles: 'The fastest, and the one that uses the least of the plan: bulk reading and searching, and simple work.', contexto: 1_000_000, salida: 128_000, ventanaEnClaudeCode: 200_000 },
  ],
};

/** Desde cuántos días la tabla puede haber quedado vieja: el Studio lo avisa. */
export const DIAS_PARA_AVISO = 60;

/**
 * El modelo de la tabla que corresponde a un id como lo guarda Claude Code: el id tal cual, sin «[1m]» ni fecha, o un
 * alias (opus, sonnet…), que apunta al más nuevo de su familia. null: sin modelo elegido, o uno que la tabla no tiene. Pura.
 */
export function modeloDelInventario(id: string | null | undefined): ModeloConocido | null {
  const base = (id ?? '').trim().toLowerCase().replace(/\[1m\]$/, '').replace(/-\d{8}$/, '');
  if (!base) return null;
  return INVENTARIO.modelos.find((m) => m.id === base) ?? INVENTARIO.modelos.find((m) => m.familia === base) ?? null;
}

/** La ventana con que trabaja un modelo en Claude Code, en tokens: la que él da, o su contexto. Pura. */
export const ventanaDe = (m: ModeloConocido) => m.ventanaEnClaudeCode ?? m.contexto;

/** Cuántos días tiene la tabla. Pura. */
export const diasDelInventario = (hoy: Date) => Math.floor((hoy.getTime() - Date.parse(`${INVENTARIO.fecha}T00:00:00Z`)) / 86_400_000);

const fechaLarga = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const tokens = (n: number) => (n >= 1_000_000 ? `${n / 1_000_000} M` : `${n / 1000} mil`);

/** Lo que la tabla dice de un modelo, en una frase. Pura. */
export const fichaDe = (m: ModeloConocido) =>
  `${m.para} Contexto de ${tokens(m.contexto)}` +
  `${m.ventanaEnClaudeCode ? ` (en Claude Code, ${tokens(m.ventanaEnClaudeCode)})` : ''}.`;

/**
 * El aviso de la tabla para el modelo elegido: si no está en ella (un modelo nuevo, o uno escrito a mano), o si la tabla
 * pasó de DIAS_PARA_AVISO. null: nada que avisar. Sin modelo elegido («el de tu cuenta»), solo el de la fecha. Pura.
 */
export function avisoDelInventario(modelo: string | null | undefined, hoy: Date): string | null {
  const avisos: string[] = [];
  if ((modelo ?? '').trim() && !modeloDelInventario(modelo))
    avisos.push(`«${modelo}» no está en la tabla de modelos del Studio: el director no sabe para qué lo recomienda Anthropic ni su contexto. Si es un modelo nuevo, entra con la próxima versión del Studio.`);
  const dias = diasDelInventario(hoy);
  if (dias > DIAS_PARA_AVISO)
    avisos.push(`La tabla de modelos del Studio es del ${fechaLarga(INVENTARIO.fecha)}, hace ${dias} días: puede que falte un modelo nuevo. Se pone al día con cada versión nueva del Studio.`);
  return avisos.length ? avisos.join(' ') : null;
}

const tokensEnIngles = (n: number) => (n >= 1_000_000 ? `${n / 1_000_000}M` : `${n / 1000}K`);

/** La ficha de un modelo, en inglés, como la lee el modelo en el encargo (lo que lee el modelo nace en inglés). Pura. */
export const fichaEnIngles = (m: ModeloConocido) =>
  `${m.paraEnIngles} A ${tokensEnIngles(m.contexto)} context` +
  `${m.ventanaEnClaudeCode ? ` (${tokensEnIngles(m.ventanaEnClaudeCode)} in Claude Code)` : ''}.`;

/**
 * La tabla, como la trae el encargo de cada revisión: una línea, en inglés como lo demás del encargo (pd_nucleo_ingles) y
 * sin fecha de hoy, para que no cambie entre una y otra.
 */
export const INVENTARIO_EN_EL_ENCARGO =
  ` The models the Studio knows (its table of ${INVENTARIO.fecha}, from Anthropic's models overview, ` +
  `platform.claude.com/docs/en/about-claude/models/overview, and the Claude API guide): ` +
  INVENTARIO.modelos.map((m) => `${m.nombre} (${m.id}, alias ${m.familia}): ${fichaEnIngles(m)}`).join(' ');
