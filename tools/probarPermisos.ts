// La prueba real de «Los permisos, al momento» (propuesta aceptada pr_permisos_al_momento, su pieza 5: «antes de
// construir el modo "Me pregunta", una prueba real con la versión instalada de Claude Code»). Claude Code documenta un
// gancho, PermissionRequest, que corre cuando iba a pedir un permiso, también sin pantalla, y que puede dar o negar el
// permiso por la persona (code.claude.com/docs/en/hooks, «PermissionRequest»). Lo que la documentación no dice es si
// corre en el modo con que el Studio lanza hoy al director (dontAsk) ni con el arranque limpio (disableAllHooks): eso
// mide esta prueba, con tres lanzamientos cortos de Haiku que piden una orden fuera de la lista. Aquí, lo puro.

/**
 * La orden que se pide, fuera de la lista de lo permitido en cada caso: imprime la versión de Node. Era `node --version`,
 * y Claude Code la dejó correr sin pedir permiso en los tres casos (la segunda corrida, del 26 de octubre de 2026): la
 * tiene entre las órdenes que solo leen, así que el gancho no tuvo nada que responder. `node -p` evalúa código, y eso
 * sí lo pide; sin comillas, para que pase igual por la consola de Windows.
 */
const ORDEN = 'node -p process.version';

/** El encargo de cada lanzamiento: correr la orden y nada más. */
export const PEDIDO = `Usa la herramienta Bash para correr exactamente esta orden: ${ORDEN}. Responde solo con lo que imprimió. Si no puedes correrla, responde solo NO_PUDE.`;

/** Lo que espera el gancho antes de responder, para ver si Claude Code espera a la persona. */
const ESPERA_MS = 3000;

export interface Caso {
  id: string;
  modo: 'dontAsk' | 'default' | 'auto';
  sinGanchos: boolean;
  que: string;
  /** La orden va negada con una regla, como lo que el Studio nunca permite (revisor.ts › --disallowedTools). */
  negar?: boolean;
}

export const CASOS: Caso[] = [
  { id: 'dontAsk', modo: 'dontAsk', sinGanchos: false, que: 'El modo de hoy del director (dontAsk), con el gancho' },
  { id: 'default', modo: 'default', sinGanchos: false, que: 'El modo que pregunta (default), con el gancho' },
  { id: 'limpio', modo: 'dontAsk', sinGanchos: true, que: 'El arranque limpio de hoy (disableAllHooks), con el gancho' },
];

/** La regla con que se niega la orden en el caso `negar`, con la misma forma que las del lanzador. */
export const REGLA_NEGADA = 'Bash(node -p:*)';

/**
 * La prueba del modo automático (pd_permiso_automatico: «antes de construirlo, una prueba real con tu Claude Code»).
 * El titular comprobó el 26 de octubre de 2026 que su cuenta lo admite (respondió «hola»), pero con una orden que no
 * pedía permiso. Falta saber lo que el Studio necesita para vigilarlo: qué hace solo con una orden que sí lo pide (la
 * deja correr, la niega o llama al gancho) y si una regla que niega se respeta también ahí, porque la guardia de lo que
 * nunca se permite son esas reglas.
 */
export const CASOS_AUTO: Caso[] = [
  { id: 'auto', modo: 'auto', sinGanchos: false, que: 'El modo automático, con el gancho' },
  { id: 'auto-negado', modo: 'auto', sinGanchos: false, negar: true, que: 'El modo automático, con la orden negada por una regla, como lo que el Studio nunca permite' },
];

/** El gancho: anota lo que recibe en `registro` (una línea por llamada), espera `esperaMs` y da el permiso. */
export function textoDelGancho(registro: string, esperaMs = ESPERA_MS): string {
  return [
    "import { appendFileSync } from 'node:fs';",
    "let datos = '';",
    "process.stdin.on('data', (d) => (datos += d));",
    "process.stdin.on('end', () => {",
    '  let e = {};',
    '  try { e = JSON.parse(datos); } catch {}',
    '  const inicio = Date.now();',
    '  setTimeout(() => {',
    `    appendFileSync(${JSON.stringify(registro)}, JSON.stringify({ caso: process.env.STL_CASO ?? null, evento: e.hook_event_name ?? null, modo: e.permission_mode ?? null, herramienta: e.tool_name ?? null, entrada: e.tool_input ?? null, sugerencias: e.permission_suggestions ?? [], espero: Date.now() - inicio }) + '\\n');`,
    "    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'allow' } } }));",
    `  }, ${esperaMs});`,
    '});',
    '',
  ].join('\n');
}

/** Los ajustes de un caso: el gancho para Bash, con margen para la espera de dos minutos, y si van apagados los ganchos. */
export function ajustesDelCaso(gancho: string, sinGanchos: boolean): Record<string, unknown> {
  const orden = `node "${gancho.replace(/\\/g, '/')}"`;
  return {
    hooks: { PermissionRequest: [{ matcher: 'Bash', hooks: [{ type: 'command', command: orden, timeout: 150 }] }] },
    ...(sinGanchos ? { disableAllHooks: true } : {}),
  };
}

/**
 * Un argumento para la consola de Windows, que es donde corre el .cmd de npm: cmd.exe recibe los argumentos unidos
 * con espacios y sin comillas, así que el encargo, con sus espacios y sus dos puntos, llegaba partido en palabras y
 * Claude Code no arrancaba (la primera corrida, del 26 de octubre de 2026, falló así en los tres casos). Lo mismo que
 * hace el lanzador del director (estudio/servidor/revisor.ts › conComillas).
 */
export const paraConsola = (x: string): string => (/[\s()*:&|<>^]/.test(x) ? `"${x}"` : x);

/** Lo útil de un error de un lanzamiento: la primera línea que dijo el programa, o la del error si no dijo nada. */
export function motivoDelError(e: { stderr?: string | Buffer; message?: string }): string {
  const dijo = String(e.stderr ?? '').split('\n').map((l) => l.trim()).find(Boolean);
  return dijo ?? (e.message ?? String(e)).split('\n')[0];
}

/** Los argumentos de `claude` para un caso: sin pantalla, con Haiku, solo con sus ajustes y sin Bash en la lista. */
export const argumentosDelCaso = (caso: Caso, ajustes: string): string[] => [
  '-p', PEDIDO, '--output-format', 'json', '--model', 'haiku', '--settings', ajustes,
  '--setting-sources', 'project,local', '--permission-mode', caso.modo, '--allowedTools', 'Read',
  ...(caso.negar ? ['--disallowedTools', REGLA_NEGADA] : []),
];

export interface Llamada {
  caso: string | null;
  evento: string | null;
  modo: string | null;
  herramienta: string | null;
  entrada: unknown;
  sugerencias: unknown[];
  espero: number;
}

export interface Resultado {
  caso: string;
  que: string;
  gancho: boolean;
  corrio: boolean;
  negadas: number;
  espero: number | null;
  sugerencias: string[];
  error: string | null;
}

/** Lo que pasó en un caso: si se llamó al gancho, si la orden corrió y si Claude Code la negó. Pura. */
export function veredicto(caso: Caso, llamadas: Llamada[], salida: string, error: string | null = null): Resultado {
  const mias = llamadas.filter((l) => l.caso === caso.id && l.evento === 'PermissionRequest');
  let texto = '';
  let negadas = 0;
  try {
    const j = JSON.parse(salida) as { result?: unknown; permission_denials?: unknown[] };
    texto = typeof j.result === 'string' ? j.result : '';
    negadas = Array.isArray(j.permission_denials) ? j.permission_denials.length : 0;
  } catch {
    texto = salida;
  }
  return {
    caso: caso.id,
    que: caso.que,
    gancho: mias.length > 0,
    corrio: /v\d+\.\d+\.\d+/.test(texto) && !/NO_PUDE/.test(texto),
    negadas,
    espero: mias.length ? Math.max(...mias.map((l) => l.espero)) : null,
    sugerencias: mias.flatMap((l) => l.sugerencias.map((s) => (s && typeof s === 'object' && 'type' in s ? String((s as { type: unknown }).type) : '?'))),
    error,
  };
}

/** La orden corrió sin que nadie diera el permiso: Claude Code no lo pidió, y el caso no dice nada del gancho. Pura. */
const sinPedir = (r: Resultado) => !r.error && r.corrio && !r.gancho;

/** Lo que pasó en un caso, en una línea. Pura. */
function lineaDelCaso(r: Resultado): string {
  if (r.error) return `- ${r.que}: no se pudo lanzar (${r.error}).`;
  const gancho = r.gancho ? `el gancho se llamó${r.espero !== null ? ` y esperó ${Math.round(r.espero / 1000)} s` : ''}` : 'el gancho no se llamó';
  const orden = sinPedir(r) ? 'la orden corrió sin pedir permiso' : r.corrio ? 'la orden corrió' : r.negadas ? 'la orden se negó' : 'la orden no corrió';
  return `- ${r.que}: ${gancho}; ${orden}.`;
}

/** El informe para la persona, en palabras: una línea por caso y lo que significa para el Studio. Pura. */
export function informe(version: string, resultados: Resultado[]): string[] {
  const l = [`Claude Code ${version}`, '', ...resultados.map(lineaDelCaso)];
  const de = (id: string) => resultados.find((r) => r.caso === id);
  const conHoy = de('dontAsk');
  const conDefault = de('default');
  const limpio = de('limpio');
  l.push('');
  // Un caso que no arrancó no dice nada del gancho: sin esto, tres lanzamientos fallidos se leían como «el gancho no basta»
  if (resultados.every((r) => r.error)) l.push('Conclusión: Claude Code no arrancó en ningún caso, así que la prueba todavía no dice nada del gancho (lo que falló en cada uno está arriba).');
  // Lo mismo si la orden no necesitó permiso: sin esto, la segunda corrida se leyó como «el gancho no basta»
  else if (resultados.filter((r) => !r.error).every(sinPedir)) l.push('Conclusión: Claude Code dejó correr la orden sin pedir permiso, así que la prueba no midió el gancho: hay que pedirle una orden que sí lo necesite.');
  else if (conHoy?.gancho && conHoy.corrio) l.push('Conclusión: el Studio puede preguntarte desde el modo de hoy, sumándole el gancho.');
  else if (conDefault?.gancho && conDefault.corrio) l.push('Conclusión: el Studio puede preguntarte, pero lanzando al director en el modo default, con el gancho.');
  else if (conHoy?.error || conDefault?.error) l.push('Conclusión: uno de los dos modos no arrancó (lo que falló está arriba), y con el otro solo no alcanza para decidir.');
  else l.push('Conclusión: con esta versión el gancho no basta; el Studio tendrá que preguntarte por otro camino.');
  if (limpio && !limpio.error && !limpio.gancho && !sinPedir(limpio)) l.push('Con el arranque limpio de hoy el gancho no corre: el Studio tendrá que apagar tus ganchos de otra forma.');
  return l;
}

/** El informe de la prueba del modo automático: qué hace solo y si la guardia del Studio lo sigue sujetando. Pura. */
export function informeAuto(version: string, resultados: Resultado[]): string[] {
  const l = [`Claude Code ${version}`, '', ...resultados.map(lineaDelCaso), ''];
  const auto = resultados.find((r) => r.caso === 'auto');
  const negado = resultados.find((r) => r.caso === 'auto-negado');
  if (resultados.every((r) => r.error)) {
    l.push('Conclusión: Claude Code no arrancó en el modo automático (lo que falló está arriba): con esta cuenta o esta versión, el Studio no puede ofrecerlo todavía.');
    return l;
  }
  if (auto && !auto.error) {
    if (auto.gancho) l.push('El modo automático preguntó por el gancho: lo que no decide solo, el Studio te lo puede preguntar con el mismo diálogo de «Me pregunta en el Studio».');
    else if (auto.corrio) l.push('El modo automático decidió solo y dejó correr la orden, sin preguntar: lo que apruebe así, el Studio lo tiene que leer del registro de la revisión para mostrártelo.');
    else l.push('El modo automático negó solo la orden, sin preguntar: lo que niegue así, el Studio lo tiene que llevar al panel de «Permisos».');
  }
  if (negado && !negado.error) {
    if (negado.corrio) l.push('Cuidado: con la orden negada por una regla, el modo automático la dejó correr igual. La guardia de lo que nunca se permite no basta en este modo, y el Studio no debe ofrecerlo así.');
    else l.push('La regla que niega se respetó en el modo automático: la guardia de lo que nunca se permite (subir, desplegar, leer un .env…) sirve también en este modo.');
  }
  return l;
}
