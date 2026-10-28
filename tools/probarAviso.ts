// La prueba real del aviso al director que corre (propuestas aceptadas «Cada proceso, a la vista», pr_procesos_vista,
// puntos 3 y 4, y «Una revisión que no termina se retoma con un botón», pr_retoma_automatica, punto 4). «Detener ahora» le
// pide al director que cierre con lo hecho y, si en tres minutos no cerró, lo corta (decisión del titular del 26 de octubre
// de 2026), y diez minutos antes de su límite el Studio le avisa que cierre. Las dos cosas necesitan decirle algo al
// director mientras trabaja sin pantalla, y la documentación de Claude Code no dice qué camino llega a tiempo: un gancho
// PostToolUse del Studio, que corre después de cada herramienta y le puede devolver un texto al modelo, de dos formas
// (code.claude.com/docs/en/hooks: `decision: "block"` con su `reason`, o `additionalContext`), o un mensaje más por la
// entrada en stream-json mientras trabaja. Esta prueba lo mide con la versión instalada, como lanza el Studio al director
// (dontAsk, sin tus ajustes de usuario): Haiku corre tres órdenes, una por una, y después de la primera se le avisa que se
// detenga. Lo que lee el modelo nace en inglés (decisión del titular del 23 de octubre de 2026). Aquí, lo puro.

/** Las tres órdenes, una por vez: solo imprimen un número. */
export const ORDENES = ['node -p 1', 'node -p 2', 'node -p 3'];

/** La regla que las permite, con la forma de las del lanzador (dontAsk niega lo demás). */
export const PERMITIDA = 'Bash(node -p:*)';

/** Lo que responde el modelo si recibió el aviso. */
export const DETENIDO = 'STOPPED';

/** El encargo: las tres órdenes y, como dirá el encargo del director, qué hacer si el Studio le avisa que se detenga. */
export const PEDIDO = `Use the Bash tool three times, one command per call, in this order: ${ORDENES.join(', then ')}. Then answer with the numbers they printed. If you receive a notice from the Studio asking you to stop, run no more commands and answer only ${DETENIDO}.`;

/** El aviso del Studio. */
export const AVISO = `Notice from the Studio: the person asked you to stop now. Run no more commands and answer only ${DETENIDO}.`;

/** Cómo le llega el aviso al modelo en cada caso; `control`, sin aviso, para saber que las tres órdenes corren. */
export type Via = 'control' | 'bloquea' | 'contexto' | 'entrada';

export interface Caso {
  id: Via;
  que: string;
}

export const CASOS: Caso[] = [
  { id: 'control', que: 'Sin aviso, para saber que las tres órdenes corren' },
  { id: 'bloquea', que: 'Con un gancho PostToolUse que devuelve «decision: block» con el aviso' },
  { id: 'contexto', que: 'Con un gancho PostToolUse que devuelve el aviso como «additionalContext»' },
  { id: 'entrada', que: 'Con el aviso como un mensaje más por la entrada en stream-json, mientras trabaja' },
];

/**
 * El gancho PostToolUse de un caso: anota cada llamada en `registro` (una línea) y, en la primera de su caso, le devuelve
 * el aviso al modelo, de la forma de ese caso; en las demás no dice nada. En el control no devuelve nada nunca.
 */
export function textoDelGancho(registro: string): string {
  return [
    "import { appendFileSync, readFileSync } from 'node:fs';",
    "let datos = '';",
    "process.stdin.on('data', (d) => (datos += d));",
    "process.stdin.on('end', () => {",
    '  let e = {};',
    '  try { e = JSON.parse(datos); } catch {}',
    "  const caso = process.env.STL_CASO ?? '';",
    `  let antes = '';`,
    `  try { antes = readFileSync(${JSON.stringify(registro)}, 'utf8'); } catch {}`,
    "  const primera = !antes.split('\\n').filter(Boolean).some((l) => { try { return JSON.parse(l).caso === caso; } catch { return false; } });",
    `  appendFileSync(${JSON.stringify(registro)}, JSON.stringify({ caso, evento: e.hook_event_name ?? null, herramienta: e.tool_name ?? null, orden: e.tool_input?.command ?? null }) + '\\n');`,
    '  if (!primera) return;',
    `  if (caso === 'bloquea') process.stdout.write(JSON.stringify({ decision: 'block', reason: ${JSON.stringify(AVISO)} }));`,
    `  if (caso === 'contexto') process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: ${JSON.stringify(AVISO)} } }));`,
    '});',
    '',
  ].join('\n');
}

/**
 * Los ajustes de los casos con gancho: el gancho PostToolUse para todas las herramientas y `disableAllHooks` en falso,
 * que el arranque limpio del director pone en verdadero (como el de «Me pregunta en el Studio», modoPermisos.ts).
 */
export function ajustesDelGancho(gancho: string): Record<string, unknown> {
  return {
    disableAllHooks: false,
    hooks: { PostToolUse: [{ matcher: '*', hooks: [{ type: 'command', command: `node "${gancho.replace(/\\/g, '/')}"`, timeout: 30 }] }] },
  };
}

/** Los argumentos de `claude` en un caso: sin pantalla, con Haiku, sin tus ajustes de usuario, en dontAsk, con solo las tres órdenes. */
export function argumentosDelCaso(caso: Caso, ajustes: string): string[] {
  const comunes = ['--model', 'haiku', '--settings', ajustes, '--setting-sources', 'project,local', '--permission-mode', 'dontAsk', '--allowedTools', PERMITIDA];
  return caso.id === 'entrada'
    ? ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose', ...comunes]
    : ['-p', PEDIDO, '--output-format', 'stream-json', '--verbose', ...comunes];
}

/** Un mensaje de la persona por la entrada en stream-json: una línea de JSON. */
export const mensajeDeEntrada = (texto: string): string => `${JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'text', text: texto }] } })}\n`;

/** Las líneas de JSON de una salida en stream-json; lo que no se entiende, fuera. */
export function eventos(salida: string): Record<string, unknown>[] {
  return salida.split(/\r?\n/).flatMap((l) => {
    const t = l.trim();
    if (!t.startsWith('{')) return [];
    try {
      return [JSON.parse(t) as Record<string, unknown>];
    } catch {
      return [];
    }
  });
}

/** Si un evento trae el resultado de una herramienta (la orden ya corrió). */
export const traeResultado = (e: Record<string, unknown>): boolean =>
  e.type === 'user' && Array.isArray((e.message as { content?: unknown } | undefined)?.content) && ((e.message as { content: { type?: string }[] }).content).some((b) => b?.type === 'tool_result');

export interface Resultado {
  caso: Via;
  que: string;
  /** Cuántas de las tres órdenes corrió antes de su primer resultado. */
  corridas: number;
  /** Si su primer resultado dice que se detuvo. */
  detenido: boolean;
  /** Si el gancho se llamó (en los casos con gancho). */
  gancho: boolean;
  error: string | null;
}

/**
 * Lo que pasó en un caso, de su salida en stream-json (hasta su primer resultado) y de lo que anotó el gancho. Pura.
 */
export function veredicto(caso: Caso, salida: string, llamadasDelGancho: number, error: string | null = null): Resultado {
  const todos = eventos(salida);
  const fin = todos.findIndex((e) => e.type === 'result');
  const hasta = fin >= 0 ? todos.slice(0, fin + 1) : todos;
  const usos = hasta
    .filter((e) => e.type === 'assistant')
    .flatMap((e) => ((e.message as { content?: unknown[] } | undefined)?.content ?? []) as { type?: string; name?: string; input?: { command?: string } }[])
    .filter((b) => b?.type === 'tool_use' && b.name === 'Bash' && ORDENES.some((o) => b.input?.command?.trim() === o));
  const resultado = fin >= 0 ? String((todos[fin] as { result?: unknown }).result ?? '') : '';
  return { caso: caso.id, que: caso.que, corridas: usos.length, detenido: resultado.includes(DETENIDO), gancho: llamadasDelGancho > 0, error: fin >= 0 ? null : error ?? 'no dio su resultado' };
}

/** Si el aviso llegó a tiempo: se detuvo antes de correr las tres. Pura. */
export const llegoATiempo = (r: Resultado): boolean => !r.error && r.detenido && r.corridas < ORDENES.length;

const NOMBRE_VIA: Record<Exclude<Via, 'control'>, string> = {
  bloquea: 'un gancho PostToolUse con «decision: block»',
  contexto: 'un gancho PostToolUse con «additionalContext»',
  entrada: 'un mensaje más por la entrada en stream-json',
};

/** Lo que pasó en un caso, en una línea. Pura. */
function lineaDelCaso(r: Resultado): string {
  if (r.error) return `- ${r.que}: no terminó (${r.error}).`;
  const corrio = `corrió ${r.corridas} de las ${ORDENES.length} órdenes`;
  if (r.caso === 'control') return `- ${r.que}: ${corrio}.`;
  const gancho = r.caso === 'entrada' ? '' : r.gancho ? 'el gancho se llamó; ' : 'el gancho no se llamó; ';
  return `- ${r.que}: ${gancho}${corrio} y ${r.detenido ? `respondió ${DETENIDO}` : 'no dijo que se detenía'}${llegoATiempo(r) ? ': el aviso llegó a tiempo' : r.detenido ? ': el aviso llegó tarde, después de las tres' : ''}.`;
}

/** El informe para la persona, en palabras: una línea por caso y qué camino sirve para avisarle al director. Pura. */
export function informe(version: string, resultados: Resultado[]): string[] {
  const l = [`Claude Code ${version}`, '', ...resultados.map(lineaDelCaso), ''];
  const control = resultados.find((r) => r.caso === 'control');
  if (!control || control.error || control.corridas < ORDENES.length) {
    l.push('Conclusión: sin aviso no corrieron las tres órdenes, así que la prueba todavía no dice nada del aviso (lo que pasó está arriba).');
    return l;
  }
  const sirven = resultados.filter((r) => r.caso !== 'control' && llegoATiempo(r)).map((r) => NOMBRE_VIA[r.caso as Exclude<Via, 'control'>]);
  l.push(sirven.length
    ? `Conclusión: el Studio puede avisarle al director mientras trabaja con ${sirven.join(' o con ')}: así se construyen «Detener», que le pide cerrar con lo hecho, y el aviso diez minutos antes de su límite.`
    : 'Conclusión: con esta versión ningún camino le avisa a tiempo al director que corre: «Detener» y el aviso antes del límite tendrán que esperar a que Claude Code lo permita, o ir por otro camino.');
  return l;
}
