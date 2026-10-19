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
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, join, relative } from 'node:path';
import { leerLocal, leerRutaRepositorio, marcarAclaracion, marcarLanzada, pedirRevision, type AclaracionPedida } from '../../src/director/proyectos';

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

/**
 * Lo único que puede hacer el director lanzado por el Studio (el titular lo autorizó el 17 de octubre de 2026): leer,
 * las herramientas del director, escribir dentro del repositorio del proyecto (su memoria y su código, para que una
 * urgencia aprobada se arregle al instante), correr sus pruebas y hacer commits locales. Desde el 19 de octubre, también
 * investigar en internet (buscar y leer páginas, propuesta «El director puede buscar en internet»). Nada que suba,
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
    'Bash(node tools/director/bandeja.ts:*)', 'Bash(node tools/director/diagnosticar.ts:*)', 'Bash(node tools/director/estado.ts:*)',
    'Bash(npm test)', 'Bash(npm run typecheck)',
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

  constructor(private raiz: string) {}

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
   * Si hay una aclaración o una revisión pedida que nadie tomó, lanza al director. La aclaración va primero: es corta y
   * alguien está esperando para seguir con su misión. Sin modelo: solo lee estudio.local.json.
   */
  async mirar(forzar = false): Promise<void> {
    if (this.hijo || this.ocupado) return;
    this.ocupado = true;
    try {
      const local = await leerLocal(this.raiz);
      const r = local.revision;
      const a = local.aclaracion;
      if (a && !a.hecha && !a.error) {
        if (a.lanzada) {
          // Lanzada por un servidor del Studio que ya no está: pasado el límite, queda para la revisión
          if (Date.now() - Date.parse(a.lanzada) > (MAX_MIN_ACLARAR + 5) * 60_000) await this.fallo(a, `La aclaración no terminó en ${MAX_MIN_ACLARAR} minutos.`);
        } else if (!(r && !r.hecha && (r.enCurso || r.lanzada))) {
          // Una revisión en marcha también escribe el plan: la aclaración espera a que termine
          await this.preparar(forzar);
          const repositorio = await leerRutaRepositorio(this.raiz, a.proyecto);
          if (!this.programa || this.problema || !repositorio) return void (await this.fallo(a, 'El Studio no puede llamar al director en este computador.'));
          return void (await this.lanzar(a.proyecto, this.programa, repositorio, a));
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

  private async lanzar(proyecto: string, programa: string, repositorio: string, aclaracion?: AclaracionPedida): Promise<void> {
    const carpeta = join(this.raiz, '.revisiones');
    mkdirSync(carpeta, { recursive: true });
    // La de una aclaración lleva su nombre: así no se confunde con el registro de la revisión (progresoDeProyecto)
    const archivo = join(carpeta, `${proyecto}-${aclaracion ? 'aclaracion-' : ''}${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
    const registro = openSync(archivo, 'a');
    // dontAsk: lo que no está en la lista se niega sin preguntar (nadie está mirando para responder). En stream-json, el
    // registro tiene cada paso a medida que ocurre: el Studio lo resume en vivo (progresoDe)
    const args = ['-p', '--output-format', 'stream-json', '--verbose', '--permission-mode', 'dontAsk', '--add-dir', repositorio, '--allowedTools', ...permitido(repositorio)];
    this.hijo = proyecto;
    if (aclaracion) await marcarAclaracion(this.raiz, aclaracion.nota, 'lanzada');
    else await marcarLanzada(this.raiz, proyecto);
    const p = lanzarClaude(programa, args, { cwd: this.raiz, stdio: ['pipe', registro, registro] });
    p.stdin?.end(aclaracion ? encargoAclaracion(aclaracion) : encargo(proyecto));
    const limite = setTimeout(() => p.kill(), (aclaracion ? MAX_MIN_ACLARAR : MAX_MIN) * 60_000);
    let cerrado = false;
    const fin = async (problema: string) => {
      if (cerrado) return;
      cerrado = true;
      clearTimeout(limite);
      closeSync(registro);
      this.hijo = null;
      if (aclaracion) {
        const a = (await leerLocal(this.raiz)).aclaracion;
        if (a?.nota === aclaracion.nota && !a.hecha) await this.fallo(a, problema.replace('La revisión', 'La aclaración'));
        // Lo que esperaba (una revisión pedida mientras tanto) se lanza ya
        return void this.mirar().catch(() => {});
      }
      const r = (await leerLocal(this.raiz)).revision;
      if (r?.proyecto === proyecto && !r.hecha) await marcarLanzada(this.raiz, proyecto, `${problema} Lo que alcanzó a hacer quedó en ${relative(this.raiz, archivo)}.`);
    };
    p.on('error', (e) => void fin(`El Studio no pudo lanzar Claude Code (${e.message}).`));
    p.on('exit', (codigo) => void fin(`La revisión que lanzó el Studio terminó sin cerrarse${codigo ? ` (código ${codigo})` : ''}.`));
  }
}
