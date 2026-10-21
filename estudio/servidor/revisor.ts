// El revisor: cuando alguien pide una revisión en el Studio, el Studio mismo lanza al director, sin pantalla y con el
// contexto limpio (Claude Code con `claude -p`), y lo deja trabajar hasta que cierre con --listo. Mirar si hay una
// revisión pedida no usa ningún modelo, solo lee estudio.local.json: mientras no haya nada pedido, no se gasta nada.
//
// Con permisos acotados: el director lanzado así lee, corre las herramientas del director y escribe dentro del
// repositorio del proyecto (su memoria y su código), con pruebas y commits locales. Todo lo demás se le niega sin
// preguntar: no sube, no despliega ni borra nada. Así una urgencia aprobada se arregla al instante.
// Sin Claude Code con su sesión iniciada en este computador, las revisiones pedidas las toma esa sesión con
// /loop 5m /vigila, como antes.
import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, statSync, writeSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, join, relative, resolve } from 'node:path';
import { archivoAjustesClaude, guardarEsfuerzoClaude, guardarModeloClaude, leerAjustesClaude } from './ajustesClaude';
import { leerLocal, leerRutaRepositorio, marcarAclaracion, marcarLanzada, marcarUrgencia, pedirRevision, urgenciaActiva, type AclaracionPedida, type UrgenciaPedida } from '../../src/director/proyectos';

/** Lo que el Studio muestra del revisor: si revisa solo, o por qué no puede. */
export interface EstadoRevisor {
  agente: string | null;
  problema: string | null;
  revisando: string | null;
}

/** Una revisión que tarda más que esto se da por perdida: el Studio la detiene y lo dice. */
export const MAX_MIN = 60;

/** Lo que se le encarga al director: lo mismo que «revisa estudio», de un proyecto, para una sesión sin pantalla. */
export const encargo = (proyecto: string) =>
  `Revisión pedida desde el Studio para el proyecto «${proyecto}». Eres el director asistente de STL Studio y te lanzó el ` +
  `Studio, sin pantalla: nadie lee esta salida, así que todo lo que el titular deba saber va en el Studio. Haz «revisa ` +
  `estudio» de ese proyecto según CLAUDE.md (sección «La sesión del director»), con --proyecto ${proyecto} en todas las ` +
  `herramientas. Puedes escribir en el repositorio del proyecto, su memoria y su código, solo para lo que el titular ` +
  `aprobó o pidió en el Studio y con las normas de ese proyecto: pruebas en verde y commits locales. Nunca subas, ` +
  `despliegues ni borres nada: si algo lo necesita, déjalo listo y dilo en la respuesta y en el mensaje. Tus permisos no ` +
  `aceptan órdenes encadenadas con &&: para cada commit da cd a la carpeta, luego git add y luego git commit, cada una ` +
  `por separado. Cierra como siempre: ` +
  `node tools/director/bandeja.ts --proyecto ${proyecto} --listo y el commit en la memoria del proyecto.`;

/** Una aclaración es una ida y vuelta corta: si tarda más que esto, se detiene y el pedido queda para la revisión. */
export const MAX_MIN_ACLARAR = 15;

/**
 * Lo que se le encarga al director cuando alguien no entendió un paso («No lo entiendo, explícamelo mejor»): solo ese
 * paso, al instante, sin el resto de la revisión (lo demás espera su turno, intacto).
 */
export const encargoAclaracion = (a: AclaracionPedida) =>
  `Aclaración pedida desde el Studio para el proyecto «${a.proyecto}»: ${a.quien} no entendió el paso ${a.paso + 1} de la ` +
  `misión «${a.mision}» y oprimió «No lo entiendo, explícamelo mejor». Eres el director asistente de STL Studio y te lanzó ` +
  `el Studio, sin pantalla: nadie lee esta salida. Es una ida y vuelta corta: NO hagas la revisión completa ni atiendas ` +
  `nada más (las demás notas, entregas y documentos esperan la revisión siguiente). Corre ` +
  `node tools/director/bandeja.ts --proyecto ${a.proyecto} --aclarar y sigue lo que dice: reescribe solo ese paso en el ` +
  `plan, responde solo esa nota y cierra con node tools/director/bandeja.ts --proyecto ${a.proyecto} --aclarar --listo y ` +
  `el commit en la memoria del proyecto. No toques el código. Tus permisos no aceptan órdenes encadenadas con &&: da cd ` +
  `a la carpeta, luego git add y luego git commit, cada una por separado.`;

/** Una urgencia puede llevar un arreglo con sus pruebas: tiene más tiempo que una aclaración, menos que una revisión. */
export const MAX_MIN_URGENCIA = 30;

/**
 * Lo que se le encarga al director cuando alguien marcó una nota como urgente: solo esas notas, al instante, sin el
 * resto de la revisión. El resultado vuelve como reporte en «Dónde quedamos», no como trabajo nuevo.
 */
export const encargoUrgencia = (u: UrgenciaPedida) =>
  `Urgencia pedida desde el Studio para el proyecto «${u.proyecto}»: ${u.quien} marcó como urgente ` +
  `${u.notas.length === 1 ? 'una nota' : `${u.notas.length} notas`} del Buzón. Eres el director asistente de STL Studio y te ` +
  `lanzó el Studio, sin pantalla: nadie lee esta salida, así que todo lo que el titular deba saber va en el Studio. Atiende ` +
  `SOLO esas notas: NO hagas la revisión completa ni respondas nada más (las demás notas, entregas y documentos esperan la ` +
  `revisión siguiente). Corre node tools/director/bandeja.ts --proyecto ${u.proyecto} --urgente y sigue lo que dice. Puedes ` +
  `escribir en el repositorio del proyecto, su memoria y su código, solo para lo que el titular aprobó o pidió en el Studio ` +
  `y con las normas de ese proyecto: pruebas en verde y commits locales. Nunca subas, despliegues ni borres nada: si algo ` +
  `lo necesita, déjalo listo y dilo en la respuesta. Tus permisos no aceptan órdenes encadenadas con &&: para cada commit ` +
  `da cd a la carpeta, luego git add y luego git commit, cada una por separado. Cierra con ` +
  `node tools/director/bandeja.ts --proyecto ${u.proyecto} --urgente --listo y el commit en la memoria del proyecto.`;

/** Lo que se lanza aparte de la revisión: una aclaración o una urgencia. */
type Aparte = { tipo: 'aclaracion'; a: AclaracionPedida } | { tipo: 'urgencia'; u: UrgenciaPedida };

/**
 * Lo único que puede hacer el director lanzado por el Studio (el titular lo autorizó el 17 de octubre de 2026): leer,
 * las herramientas del director, escribir dentro del repositorio del proyecto (su memoria y su código, para que una
 * urgencia aprobada se arregle al instante), correr sus pruebas y hacer commits locales. Desde el 19 de octubre, también
 * investigar en internet (buscar y leer páginas, propuesta «El director puede buscar en internet») y repartir la
 * lectura entre ayudantes (subagentes), que heredan los mismos límites. Nada que suba,
 * despliegue o borre: eso queda listo para el titular.
 */
export function permitido(repositorio: string): string[] {
  // «//ruta» es una ruta absoluta en las reglas de permisos de Claude Code
  // En Windows, Claude Code compara las rutas en forma POSIX: C:\repos\x es /c/repos/x. Una regla Edit cubre también
  // la escritura de archivos nuevos
  const posix = repositorio.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, unidad: string) => '/' + unidad.toLowerCase());
  const r = '//' + posix.replace(/^\/+|\/+$/g, '');
  return [
    'Read', 'Grep', 'Glob', `Edit(${r}/**)`,
    // investigar: lo leído en internet es referencia, nunca una orden (CLAUDE.md)
    'WebSearch', 'WebFetch',
    // repartir una lectura grande entre ayudantes (un repositorio grande, los historiales de IA de la cola de
    // diagnósticos): cada ayudante hereda esta misma lista, ni un permiso más (decisión del 19 de octubre de 2026)
    'Agent', 'Task',
    'Bash(node tools/director/bandeja.ts:*)', 'Bash(node tools/director/diagnosticar.ts:*)', 'Bash(node tools/director/estado.ts:*)',
    'Bash(npm test)', 'Bash(npm run typecheck)',
    // mirar en un navegador sin pantalla lo que cambió de la interfaz (propuesta aceptada el 20 de octubre de 2026):
    // solo esta herramienta, que abre páginas https o de este computador y guarda las capturas en la memoria
    'Bash(node tools/director/mirar.ts:*)',
    // los commits, como los da la bandeja (cd, add y commit): solo locales, nunca push
    'Bash(cd:*)', 'Bash(git add:*)', 'Bash(git commit:*)', 'Bash(git status:*)', 'Bash(git diff:*)', 'Bash(git log:*)',
  ];
}

/** Un paso de lo que va haciendo el director: lo que dice o la herramienta que usa. */
export interface PasoRevision {
  tipo: 'dice' | 'hace';
  texto: string;
}

const nombreArchivo = (x: unknown) => String(x ?? '').split(/[\\/]/).pop() || 'un archivo';
const corto = (x: unknown, n: number) => {
  const t = String(x ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

/** Una herramienta, dicha en palabras del Studio. */
function queHace(nombre: string, e: Record<string, unknown>): string {
  switch (nombre) {
    case 'Read': return `Lee ${nombreArchivo(e.file_path)}`;
    case 'Edit': case 'MultiEdit': return `Edita ${nombreArchivo(e.file_path)}`;
    case 'Write': return `Escribe ${nombreArchivo(e.file_path)}`;
    case 'NotebookEdit': return `Edita ${nombreArchivo(e.notebook_path)}`;
    case 'Grep': return `Busca «${corto(e.pattern, 60)}»`;
    case 'Glob': return `Busca archivos ${corto(e.pattern, 60)}`;
    case 'Bash': return e.description ? corto(e.description, 120) : `Corre ${corto(e.command, 90)}`;
    case 'Task': case 'Agent': return `Le pide a un ayudante: ${corto(e.description ?? e.prompt, 100)}`;
    case 'TodoWrite': return 'Ordena su lista de tareas';
    case 'WebSearch': return `Busca en internet «${corto(e.query, 80)}»`;
    case 'WebFetch': return `Lee la página ${corto(e.url, 90)}`;
    default: return `Usa ${nombre}`;
  }
}

/**
 * Lo que va haciendo el director, a partir de su registro en stream-json (una línea JSON por evento): lo que dice y
 * cada herramienta que usa, en orden. Las líneas que no son JSON (avisos, un registro viejo en texto) se ignoran.
 */
export function progresoDe(registro: string, max = 40): PasoRevision[] {
  const pasos: PasoRevision[] = [];
  for (const linea of registro.split('\n')) {
    if (!linea.startsWith('{')) continue;
    let ev: { type?: string; subtype?: string; message?: { content?: unknown } };
    try { ev = JSON.parse(linea); } catch { continue; }
    if (ev.type === 'system' && ev.subtype === 'init') pasos.push({ tipo: 'hace', texto: 'Empieza la revisión' });
    if (ev.type !== 'assistant' || !Array.isArray(ev.message?.content)) continue;
    for (const b of ev.message.content as { type?: string; text?: string; name?: string; input?: Record<string, unknown> }[]) {
      if (b.type === 'text' && b.text?.trim()) pasos.push({ tipo: 'dice', texto: corto(b.text, 400) });
      if (b.type === 'tool_use' && b.name) pasos.push({ tipo: 'hace', texto: queHace(b.name, b.input ?? {}) });
    }
  }
  return pasos.slice(-max);
}

/** Lo que se lleva leído de cada registro: así cada consulta lee solo lo nuevo, y nada del principio se pierde. */
const leidos = new Map<string, { hasta: number; pasos: PasoRevision[] }>();

/** Cuántos pasos se muestran, como mucho: una revisión entera cabe de sobra. */
export const MAX_PASOS = 2000;

/**
 * Lo que va haciendo el director en la revisión que lanzó el Studio para un proyecto (su último registro), de principio
 * a fin: recargar la página no lo reinicia, solo una revisión nueva.
 */
export function progresoDeProyecto(raiz: string, proyecto: string): PasoRevision[] {
  const carpeta = join(raiz, '.revisiones');
  if (!existsSync(carpeta)) return [];
  // «<proyecto>-<fecha>.log»: con la fecha, «stl» no se confunde con «stl-studio»
  const ultimo = readdirSync(carpeta).filter((a) => a.startsWith(`${proyecto}-`) && /^\d{4}-\d\d-\d\dT[\d-]+Z\.log$/.test(a.slice(proyecto.length + 1))).sort().at(-1);
  if (!ultimo) return [];
  const archivo = join(carpeta, ultimo);
  let leido = leidos.get(archivo);
  if (!leido) {
    // Una revisión nueva de este proyecto: lo de la anterior ya no hace falta
    for (const a of leidos.keys()) if (a.startsWith(join(carpeta, `${proyecto}-`))) leidos.delete(a);
    leido = { hasta: 0, pasos: [] };
    leidos.set(archivo, leido);
  }
  // Solo lo nuevo, y hasta la última línea completa: la que aún se escribe se lee en la consulta siguiente
  const tam = statSync(archivo).size;
  if (tam <= leido.hasta) return leido.pasos;
  const fd = openSync(archivo, 'r');
  try {
    const buf = Buffer.alloc(tam - leido.hasta);
    readSync(fd, buf, 0, buf.length, leido.hasta);
    const fin = buf.lastIndexOf(0x0a);
    if (fin < 0) return leido.pasos;
    leido.pasos = [...leido.pasos, ...progresoDe(buf.subarray(0, fin).toString('utf-8'), Infinity)].slice(-MAX_PASOS);
    leido.hasta += fin + 1;
    return leido.pasos;
  } finally {
    closeSync(fd);
  }
}

/**
 * Lo que gastó un lanzamiento del director, tal como lo devuelve Claude Code al terminar (el evento `result` del
 * stream-json): nada estimado por el Studio. `costo` es el costo en dólares que calcula Claude Code a precio de API; con
 * un plan de suscripción no se cobra aparte, pero cuenta para sus límites.
 */
export interface Consumo {
  cuando: string;
  proyecto: string;
  tipo: 'revision' | 'aclaracion' | 'urgencia';
  /** El modelo con que trabajó de verdad: lo dice Claude Code al empezar (el evento `init`). */
  modelo: string | null;
  /**
   * Lo que el Studio pidió al lanzarlo (`--model` y `--effort`; null: el de la cuenta). undefined en los registros de
   * antes de que el Studio lo anotara.
   */
  pedido?: { modelo: string | null; esfuerzo: string | null; cumplido?: boolean | null };
  costo: number;
  /** Tokens de entrada nuevos, los leídos de la caché y los escritos en ella. */
  entrada: number;
  cache: number;
  salida: number;
  minutos: number;
  /** Cuánto lleva usado el plan en ese momento, como lo ve /usage: el último `rate_limit_event` del registro. */
  limites: Limites | null;
}

/** Una ventana de los límites del plan: el porcentaje usado (0 a 100) y cuándo se renueva (ISO). */
export interface Ventana { uso: number; renueva: string | null }
export interface Limites { cincoHoras: Ventana | null; semana: Ventana | null }

/** La primera línea de cada registro: lo que el Studio pidió al lanzar al director. */
export const lineaPedido = (modelo: string | null, esfuerzo: string | null) => `${JSON.stringify({ type: 'studio', pedido: { modelo, esfuerzo } })}\n`;

/** Una ventana de `unifiedWindows` (utilization de 0 a 1, resetsAt en segundos), o null si no viene. */
function ventanaDe(w: any): Ventana | null {
  if (!w || typeof w.utilization !== 'number' || !Number.isFinite(w.utilization)) return null;
  return { uso: Math.round(w.utilization * 1000) / 10, renueva: typeof w.resetsAt === 'number' ? new Date(w.resetsAt * 1000).toISOString() : null };
}

/** El consumo de un registro en stream-json, o null si el lanzamiento no terminó con su resultado. */
export function consumoDe(registro: string): Omit<Consumo, 'cuando' | 'proyecto' | 'tipo'> | null {
  let modelo: string | null = null;
  let pedido: Consumo['pedido'];
  let resultado: any = null;
  let ventanas: any = null;
  for (const linea of registro.split('\n')) {
    if (!linea.startsWith('{')) continue;
    let ev: any;
    try { ev = JSON.parse(linea); } catch { continue; }
    if (ev.type === 'studio' && ev.pedido) pedido = { modelo: ev.pedido.modelo ?? null, esfuerzo: ev.pedido.esfuerzo ?? null };
    if (!modelo && ev.type === 'system' && ev.subtype === 'init' && typeof ev.model === 'string') modelo = ev.model;
    if (!modelo && ev.type === 'assistant' && typeof ev.message?.model === 'string') modelo = ev.message.model;
    if (ev.type === 'rate_limit_event' && ev.rate_limit_info?.unifiedWindows) ventanas = ev.rate_limit_info.unifiedWindows;
    if (ev.type === 'result') resultado = ev;
  }
  if (!resultado) return null;
  const u = resultado.usage ?? {};
  const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
  const limites = ventanas ? { cincoHoras: ventanaDe(ventanas.five_hour), semana: ventanaDe(ventanas.seven_day) } : null;
  // Si se pidió un modelo, si trabajó con él (null: no se pidió ninguno, o Claude Code no dijo cuál usó)
  if (pedido) pedido.cumplido = pedido.modelo && modelo ? trabajoConElPedido(pedido.modelo, modelo) : null;
  return {
    modelo,
    ...(pedido ? { pedido } : {}),
    costo: n(resultado.total_cost_usd),
    entrada: n(u.input_tokens) + n(u.cache_creation_input_tokens),
    cache: n(u.cache_read_input_tokens),
    salida: n(u.output_tokens),
    minutos: Math.round(n(resultado.duration_ms) / 6000) / 10,
    limites: limites && (limites.cincoHoras || limites.semana) ? limites : null,
  };
}

/**
 * Si el modelo con que trabajó es el que se pidió. Un alias («opus») vale por cualquier versión de su familia; una
 * versión, solo por ella misma (con o sin el sufijo del contexto, «[1m]», que Claude Code puede no repetir).
 */
export function trabajoConElPedido(pedido: string, real: string): boolean {
  const base = (x: string) => x.toLowerCase().replace(/\[[^\]]*\]$/, '');
  if (!pedido.startsWith('claude-')) return base(real).startsWith(`claude-${base(pedido)}`);
  return base(real) === base(pedido);
}

/** «<proyecto>-[aclaracion-|urgencia-]<fecha>.log», con la fecha sin «:» ni «.». */
const REGISTRO = /^([a-z0-9][a-z0-9-]*?)-(?:(aclaracion|urgencia)-)?(\d{4}-\d\d-\d\d)T(\d\d)-(\d\d)-(\d\d)-(\d{3})Z\.log$/;

/** Lo leído de cada registro: un registro terminado no cambia, así que se lee una sola vez. */
const consumos = new Map<string, { tam: number; c: Consumo | null }>();

/** Lo que gastó cada lanzamiento del director en este computador, del más nuevo al más viejo (los últimos `dias`). */
export function consumoDeRevisiones(raiz: string, dias = 35, ahora = Date.now()): Consumo[] {
  const carpeta = join(raiz, '.revisiones');
  if (!existsSync(carpeta)) return [];
  const lista: Consumo[] = [];
  for (const a of readdirSync(carpeta)) {
    const m = REGISTRO.exec(a);
    if (!m) continue;
    const cuando = `${m[3]}T${m[4]}:${m[5]}:${m[6]}.${m[7]}Z`;
    if (ahora - Date.parse(cuando) > dias * 86_400_000) continue;
    const archivo = join(carpeta, a);
    const tam = statSync(archivo).size;
    let leido = consumos.get(archivo);
    if (!leido || leido.tam !== tam) {
      const c = consumoDe(readFileSync(archivo, 'utf-8'));
      leido = { tam, c: c && { cuando, proyecto: m[1], tipo: (m[2] as Consumo['tipo']) ?? 'revision', ...c } };
      consumos.set(archivo, leido);
    }
    if (leido.c) lista.push(leido.c);
  }
  return lista.sort((x, y) => y.cuando.localeCompare(x.cuando));
}

/** Si el lanzamiento no llegó a trabajar porque la cuenta no acepta el modelo elegido. */
export const fallaDelModelo = (registro: string) =>
  !/"type":"assistant"/.test(registro) &&
  registro.split('\n').some((l) => !/"subtype":"init"/.test(l) && /selected model|invalid model|model[^\n]{0,80}(not (exist|found|available)|no access|access to it)/i.test(l));

/** Si el lanzamiento no llegó a trabajar porque Claude Code no aceptó el esfuerzo elegido (`--effort`). */
export const fallaDelEsfuerzo = (registro: string) =>
  !/"type":"assistant"/.test(registro) &&
  registro.split('\n').some((l) => !/"subtype":"init"/.test(l) && /unknown option '--effort'|effort[^\n]{0,80}(invalid|not (supported|available|allowed))|invalid[^\n]{0,40}effort/i.test(l));

/** Ordena versiones «1.2.10» de menor a mayor. */
export const compararVersion = (a: string, b: string) => {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
};

/** Claude Code en el PATH (el .exe; el .cmd de npm también sirve) o el que trae la app de escritorio de Claude. */
export function buscarClaude(): string | null {
  const extensiones = process.platform === 'win32' ? ['.exe', '.cmd'] : [''];
  for (const dir of (process.env.PATH ?? '').split(delimiter).filter(Boolean))
    for (const e of extensiones) if (existsSync(join(dir, 'claude' + e))) return join(dir, 'claude' + e);
  const base =
    process.platform === 'win32' ? join(process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'), 'Claude', 'claude-code')
    : process.platform === 'darwin' ? join(homedir(), 'Library', 'Application Support', 'Claude', 'claude-code')
    : null;
  if (!base || !existsSync(base)) return null;
  const exe = process.platform === 'win32' ? 'claude.exe' : 'claude';
  try {
    for (const v of readdirSync(base).filter((v) => /^\d+(\.\d+)+$/.test(v)).sort(compararVersion).reverse())
      for (const sub of ['', ...readdirSync(join(base, v))]) {
        const p = join(base, v, sub, exe);
        if (existsSync(p) && statSync(p).isFile()) return p;
      }
  } catch {
    // una carpeta que la app está actualizando: se busca en la próxima vuelta
  }
  return null;
}

const conComillas = (x: string) => (/[\s()*:&|<>^]/.test(x) ? `"${x}"` : x);
/** Un programa para escribirlo en la terminal: en PowerShell (la de Windows), una ruta entre comillas va con «&» delante. */
const comoComando = (programa: string) => {
  const p = conComillas(programa);
  return process.platform === 'win32' && p.startsWith('"') ? `& ${p}` : p;
};

/**
 * La orden que abre Claude Code en una terminal como lo lanza el Studio: en la carpeta del Studio (donde están las reglas
 * del director), con la del proyecto activo a la vista, y con el modelo y el esfuerzo de su configuración, que son los
 * que elige Proyecto. Es una sesión de quien la abre: pide permiso para lo que haga. Sin las variables de una sesión de
 * Claude Code desde la que se haya encendido el Studio, que le harían creer que está dentro de ella.
 */
export function ordenAbrirClaude(programa: string, raiz: string, repositorio: string | null): string {
  const q = (s: string) => `'${s.replace(/\\/g, '/').replace(/'/g, `'\\''`)}'`;
  // El .cmd de npm no corre en bash: ahí basta su nombre, porque se encontró en el PATH
  const claude = /\.cmd$/i.test(programa) ? 'claude' : q(programa);
  const otro = repositorio && resolve(repositorio) !== resolve(raiz) ? ` --add-dir ${q(repositorio)}` : '';
  return `env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT ${claude}${otro}`;
}

/** Lanza Claude Code. El .cmd de npm, en Windows, solo corre dentro de una consola. */
function lanzarClaude(programa: string, args: string[], opciones: Parameters<typeof spawn>[2]) {
  // Lanzado desde otra sesión de Claude Code, heredaría sus variables y creería estar dentro de ella
  const env = { ...process.env };
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRYPOINT;
  return process.platform === 'win32' && /\.cmd$/i.test(programa)
    ? spawn(conComillas(programa), args.map(conComillas), { ...opciones, env, shell: true, windowsHide: true })
    : spawn(programa, args, { ...opciones, env, windowsHide: true });
}

/** Si Claude Code no tiene sesión en este computador, cómo se inicia (una sola vez, en una terminal). */
function sinSesion(programa: string): Promise<string | null> {
  if (process.env.ANTHROPIC_API_KEY) return Promise.resolve(null);
  return new Promise((listo) => {
    let salida = '';
    const p = lanzarClaude(programa, ['auth', 'status'], { stdio: ['ignore', 'pipe', 'ignore'] });
    const limite = setTimeout(() => p.kill(), 15_000);
    p.stdout?.on('data', (x) => (salida += x));
    p.on('error', () => listo(null));
    p.on('close', () => {
      clearTimeout(limite);
      try {
        listo(JSON.parse(salida).loggedIn === false ? `Claude Code no tiene una sesión iniciada en este computador. Una sola vez, en una terminal: ${comoComando(programa)} auth login` : null);
      } catch {
        listo(null); // una versión que no responde en JSON: se intenta y, si falla, el Studio lo dice
      }
    });
  });
}

export class Revisor {
  private hijo: string | null = null;
  private ocupado = false;
  private programa: string | null = null;
  private problema: string | null = null;
  private visto = 0;

  /** `ajustes`: la configuración de Claude Code de donde salen el modelo y el esfuerzo (la de /model y /effort). */
  constructor(private raiz: string, private ajustes = archivoAjustesClaude()) {}

  estado(): EstadoRevisor {
    return { agente: this.programa ? 'Claude Code' : null, problema: this.problema, revisando: this.hijo };
  }

  /** Busca Claude Code y si tiene sesión: cada minuto como mucho. `agente: false` en estudio.local.json lo apaga. */
  async preparar(forzar = false): Promise<void> {
    if (!forzar && Date.now() - this.visto < 60_000) return;
    this.visto = Date.now();
    this.programa = (await leerLocal(this.raiz)).agente === false ? null : buscarClaude();
    this.problema = this.programa ? await sinSesion(this.programa) : null;
  }

  /**
   * Si hay una urgencia, una aclaración o una revisión pedida que nadie tomó, lanza al director. La urgencia va primero
   * (no puede esperar), luego la aclaración (es corta y alguien espera para seguir con su misión). Las dos esperan a una
   * revisión en marcha, que también escribe el plan. Sin modelo: solo lee estudio.local.json.
   */
  async mirar(forzar = false): Promise<void> {
    if (this.hijo || this.ocupado) return;
    this.ocupado = true;
    try {
      const local = await leerLocal(this.raiz);
      const r = local.revision;
      const a = local.aclaracion;
      const u = local.urgencia;
      const revisando = !!r && !r.hecha && !!(r.enCurso || r.lanzada);
      if (urgenciaActiva(u)) {
        if (u.lanzada) {
          // Lanzada por un servidor del Studio que ya no está: pasado el límite, queda para la revisión
          if (Date.now() - Date.parse(u.lanzada) > (MAX_MIN_URGENCIA + 5) * 60_000) await this.falloUrgencia(u, `La urgencia no terminó en ${MAX_MIN_URGENCIA} minutos.`);
        } else if (!revisando) {
          await this.preparar(forzar);
          const repositorio = await leerRutaRepositorio(this.raiz, u.proyecto);
          if (!this.programa || this.problema || !repositorio) return void (await this.falloUrgencia(u, 'El Studio no puede llamar al director en este computador.'));
          return void (await this.lanzar(u.proyecto, this.programa, repositorio, { tipo: 'urgencia', u }));
        }
      }
      if (a && !a.hecha && !a.error) {
        if (a.lanzada) {
          // Lanzada por un servidor del Studio que ya no está: pasado el límite, queda para la revisión
          if (Date.now() - Date.parse(a.lanzada) > (MAX_MIN_ACLARAR + 5) * 60_000) await this.fallo(a, `La aclaración no terminó en ${MAX_MIN_ACLARAR} minutos.`);
        } else if (!revisando) {
          // Una revisión en marcha también escribe el plan: la aclaración espera a que termine
          await this.preparar(forzar);
          const repositorio = await leerRutaRepositorio(this.raiz, a.proyecto);
          if (!this.programa || this.problema || !repositorio) return void (await this.fallo(a, 'El Studio no puede llamar al director en este computador.'));
          return void (await this.lanzar(a.proyecto, this.programa, repositorio, { tipo: 'aclaracion', a }));
        }
      }
      if (!r || r.hecha || r.error) return;
      // Lanzada por un servidor del Studio que ya no está (se reinició): pasado el límite, se da por perdida
      if (r.lanzada && Date.now() - Date.parse(r.lanzada) > (MAX_MIN + 5) * 60_000)
        return void (await marcarLanzada(this.raiz, r.proyecto, `La revisión que lanzó el Studio no terminó en ${MAX_MIN} minutos.`));
      if (r.lanzada || r.enCurso) return;
      await this.preparar(forzar);
      const repositorio = await leerRutaRepositorio(this.raiz, r.proyecto);
      if (!this.programa || this.problema || !repositorio) return;
      await this.lanzar(r.proyecto, this.programa, repositorio);
    } finally {
      this.ocupado = false;
    }
  }

  /** La aclaración no se pudo: lo dice, y el pedido (que ya está en el Buzón) queda para la revisión, que se pide. */
  private async fallo(a: AclaracionPedida, problema: string): Promise<void> {
    await marcarAclaracion(this.raiz, a.nota, { error: problema });
    const r = (await leerLocal(this.raiz)).revision;
    if (!r || r.hecha || r.proyecto !== a.proyecto) await pedirRevision(this.raiz, a.proyecto, a.quien);
  }

  /** La urgencia no se pudo: lo dice, y las notas (que ya están en el Buzón) quedan para la revisión, que se pide. */
  private async falloUrgencia(u: UrgenciaPedida, problema: string): Promise<void> {
    await marcarUrgencia(this.raiz, u.pedida, { error: problema });
    const r = (await leerLocal(this.raiz)).revision;
    if (!r || r.hecha || r.proyecto !== u.proyecto) await pedirRevision(this.raiz, u.proyecto, u.quien);
  }

  private async lanzar(proyecto: string, programa: string, repositorio: string, aparte?: Aparte): Promise<void> {
    const carpeta = join(this.raiz, '.revisiones');
    mkdirSync(carpeta, { recursive: true });
    // La de una aclaración o una urgencia lleva su nombre: así no se confunde con el registro de la revisión (progresoDeProyecto)
    const archivo = join(carpeta, `${proyecto}-${aparte ? `${aparte.tipo}-` : ''}${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
    const registro = openSync(archivo, 'a');
    // El modelo y el esfuerzo de Claude Code (los de /model y /effort, que también se eligen en Proyecto): se pasan
    // explícitos para que el registro diga qué se pidió
    const { modelo, esfuerzo } = await leerAjustesClaude(this.ajustes);
    // Lo pedido va primero en el registro: así el Studio compara con el modelo con que de verdad trabajó
    writeSync(registro, lineaPedido(modelo, esfuerzo));
    // dontAsk: lo que no está en la lista se niega sin preguntar (nadie está mirando para responder). En stream-json, el
    // registro tiene cada paso a medida que ocurre: el Studio lo resume en vivo (progresoDe)
    const args = ['-p', '--output-format', 'stream-json', '--verbose', ...(modelo ? ['--model', modelo] : []), ...(esfuerzo ? ['--effort', esfuerzo] : []), '--permission-mode', 'dontAsk', '--add-dir', repositorio, '--allowedTools', ...permitido(repositorio)];
    this.hijo = proyecto;
    if (aparte?.tipo === 'aclaracion') await marcarAclaracion(this.raiz, aparte.a.nota, 'lanzada');
    else if (aparte?.tipo === 'urgencia') await marcarUrgencia(this.raiz, aparte.u.pedida, 'lanzada');
    else await marcarLanzada(this.raiz, proyecto);
    const p = lanzarClaude(programa, args, { cwd: this.raiz, stdio: ['pipe', registro, registro] });
    p.stdin?.end(aparte?.tipo === 'aclaracion' ? encargoAclaracion(aparte.a) : aparte?.tipo === 'urgencia' ? encargoUrgencia(aparte.u) : encargo(proyecto));
    const limite = setTimeout(() => p.kill(), (aparte?.tipo === 'aclaracion' ? MAX_MIN_ACLARAR : aparte?.tipo === 'urgencia' ? MAX_MIN_URGENCIA : MAX_MIN) * 60_000);
    let cerrado = false;
    const fin = async (problema: string) => {
      if (cerrado) return;
      cerrado = true;
      clearTimeout(limite);
      closeSync(registro);
      this.hijo = null;
      // La cuenta no acepta el modelo elegido: vuelve al de siempre (también en Claude Code, que con él tampoco
      // arrancaría), y el aviso lo dice
      if (modelo && fallaDelModelo(readFileSync(archivo, 'utf-8'))) {
        await guardarModeloClaude(null, this.ajustes).catch(() => {});
        problema = `Tu cuenta de Claude Code no aceptó el modelo «${modelo}», así que el Studio lo quitó de la configuración de Claude Code y volvió al de tu cuenta: pide la revisión otra vez. En Proyecto puedes elegir otro.`;
      } else if (esfuerzo && fallaDelEsfuerzo(readFileSync(archivo, 'utf-8'))) {
        await guardarEsfuerzoClaude(null, this.ajustes).catch(() => {});
        problema = `Claude Code no aceptó el esfuerzo «${esfuerzo}» (puede que su versión no lo traiga, o que el modelo no lo use), así que el Studio lo quitó de la configuración de Claude Code y volvió al de tu cuenta: pide la revisión otra vez.`;
      }
      if (aparte?.tipo === 'aclaracion') {
        const a = (await leerLocal(this.raiz)).aclaracion;
        if (a?.nota === aparte.a.nota && !a.hecha) await this.fallo(a, problema.replace('La revisión', 'La aclaración'));
      } else if (aparte?.tipo === 'urgencia') {
        const u = (await leerLocal(this.raiz)).urgencia;
        if (u?.pedida === aparte.u.pedida && !u.hecha) await this.falloUrgencia(u, problema.replace('La revisión', 'La urgencia'));
      }
      // Lo que esperaba (otra urgencia, una aclaración o una revisión pedida mientras tanto) se lanza ya
      if (aparte) return void this.mirar().catch(() => {});
      const r = (await leerLocal(this.raiz)).revision;
      if (r?.proyecto === proyecto && !r.hecha) await marcarLanzada(this.raiz, proyecto, `${problema} Lo que alcanzó a hacer quedó en ${relative(this.raiz, archivo)}.`);
    };
    p.on('error', (e) => void fin(`El Studio no pudo lanzar Claude Code (${e.message}).`));
    p.on('exit', (codigo) => void fin(`La revisión que lanzó el Studio terminó sin cerrarse${codigo ? ` (código ${codigo})` : ''}.`));
  }
}
