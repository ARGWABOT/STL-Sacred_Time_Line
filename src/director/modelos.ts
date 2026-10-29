// El inventario de los modelos (propuesta aceptada «Cada modelo para lo suyo», pr_modelos_por_tarea, punto 1, con la
// opción que eligió el titular el 28 de octubre de 2026 en t_inventario_modelos: «B: la tabla en el código, con su
// aviso»). Una tabla con los modelos de Claude que puede tener a mano Claude Code y lo que Anthropic dice de cada uno
// (para qué lo recomienda, su precio y su contexto), con su fuente y su fecha. No gasta nada: se pone al día con cada
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
  /** Lo que cuesta por millón de tokens, en dólares, a precio de API. */
  precio: { entrada: number; salida: number };
  /** Una nota del precio, si cambia con el tamaño de la entrada. */
  notaPrecio?: string;
  /** Su contexto en la API, en tokens. */
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
    { id: 'claude-fable-5-1', familia: 'fable', nombre: 'Fable 5.1', para: 'El más capaz: el razonamiento más exigente y el trabajo de agente de horas. Cuesta más que Opus.', precio: { entrada: 10, salida: 50 }, contexto: 1_000_000, salida: 128_000 },
    { id: 'claude-opus-5-5', familia: 'opus', nombre: 'Opus 5.5', para: 'El Opus actual y el que Anthropic recomienda por defecto: dirigir, decidir y el código difícil.', precio: { entrada: 4, salida: 20 }, contexto: 1_000_000, salida: 128_000 },
    { id: 'claude-sonnet-5-5', familia: 'sonnet', nombre: 'Sonnet 5.5', para: 'Velocidad y capacidad para el código y los agentes de todos los días: los cambios acotados y con pruebas.', precio: { entrada: 2, salida: 10 }, contexto: 1_000_000, salida: 128_000 },
    { id: 'claude-haiku-5-5', familia: 'haiku', nombre: 'Haiku 5.5', para: 'El más rápido y el más barato: las lecturas y las búsquedas masivas, y lo simple.', precio: { entrada: 0.1, salida: 0.5 }, notaPrecio: 'hasta 100 mil tokens de entrada; más allá, 0,50 y 2,50', contexto: 1_000_000, salida: 128_000, ventanaEnClaudeCode: 200_000 },
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
const dolares = (n: number) => n.toLocaleString('es', { minimumFractionDigits: n < 1 ? 2 : 0, maximumFractionDigits: 2 });
const tokens = (n: number) => (n >= 1_000_000 ? `${n / 1_000_000} M` : `${n / 1000} mil`);

/** Lo que la tabla dice de un modelo, en una frase. Pura. */
export const fichaDe = (m: ModeloConocido) =>
  `${m.para} US$ ${dolares(m.precio.entrada)} por millón de tokens de entrada y ${dolares(m.precio.salida)} de salida` +
  `${m.notaPrecio ? ` (${m.notaPrecio})` : ''}; contexto de ${tokens(m.contexto)}` +
  `${m.ventanaEnClaudeCode ? ` (en Claude Code, ${tokens(m.ventanaEnClaudeCode)})` : ''}.`;

/**
 * El aviso de la tabla para el modelo elegido: si no está en ella (un modelo nuevo, o uno escrito a mano), o si la tabla
 * pasó de DIAS_PARA_AVISO. null: nada que avisar. Sin modelo elegido («el de tu cuenta»), solo el de la fecha. Pura.
 */
export function avisoDelInventario(modelo: string | null | undefined, hoy: Date): string | null {
  const avisos: string[] = [];
  if ((modelo ?? '').trim() && !modeloDelInventario(modelo))
    avisos.push(`«${modelo}» no está en la tabla de modelos del Studio: el director no sabe para qué lo recomienda Anthropic, su precio ni su contexto. Si es un modelo nuevo, entra con la próxima versión del Studio.`);
  const dias = diasDelInventario(hoy);
  if (dias > DIAS_PARA_AVISO)
    avisos.push(`La tabla de modelos del Studio es del ${fechaLarga(INVENTARIO.fecha)}, hace ${dias} días: puede que falte un modelo nuevo o que un precio haya cambiado. Se pone al día con cada versión nueva del Studio.`);
  return avisos.length ? avisos.join(' ') : null;
}

/** La tabla, como la trae el encargo de cada revisión: una línea, sin fecha de hoy, para que no cambie entre una y otra. */
export const INVENTARIO_EN_EL_ENCARGO =
  ` Los modelos que conoce el Studio (su tabla del ${INVENTARIO.fecha}, de ${INVENTARIO.fuente.split(';')[0]}): ` +
  INVENTARIO.modelos.map((m) => `${m.nombre} (${m.id}, alias ${m.familia}): ${fichaDe(m)}`).join(' ');
