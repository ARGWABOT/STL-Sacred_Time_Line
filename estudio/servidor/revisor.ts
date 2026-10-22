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
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, statSync, unlinkSync, writeFileSync, writeSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, join, relative, resolve } from 'node:path';
import { ajustesDelDirector, archivoAjustesClaude, conMaximo, guardarEsfuerzoClaude, guardarModeloClaude, leerAjustesClaude } from './ajustesClaude';
import { negacionesDe } from '../../src/director/director';
import { enDisco, guardarEsfuerzoMaximo, leerLocal, leerRutaRepositorio, marcarAclaracion, marcarLanzada, marcarRevision, marcarUrgencia, pedirRevision, rutasDe, urgenciaActiva, type AclaracionPedida, type FallaRevision, type UrgenciaPedida } from '../../src/director/proyectos';

export type { FallaRevision };

/** Lo que el Studio muestra del revisor: si revisa solo, o por qué no puede. */
export interface EstadoRevisor {
  agente: string | null;
  problema: string | null;
  revisando: string | null;
}

/** Una revisión que tarda más que esto se da por perdida: el Studio la detiene y lo dice. */
export const MAX_MIN = 60;

/**
 * Lo que el director lanzado por el Studio no tiene: esperas programadas. Sin pantalla, una espera de 20 minutos para
 * «ver si ya terminó» un flujo lo deja parado (el 21 de octubre de 2026, una revisión pasó 25 de sus 40 minutos así); el
 * aviso de que algo en segundo plano terminó ya lo despierta solo.
 */
export const SIN_ESPERAS = ['ScheduleWakeup', 'CronCreate'];

/** Cómo espera lo que lanza en segundo plano (un flujo, un ayudante): sin esperas programadas, y con su límite. */
const esperar = (minutos: number) =>
  ` Si lanzas un flujo de varios agentes o un ayudante en segundo plano, sigue con lo demás y, cuando no quede nada más, ` +
  `termina tu turno: el aviso de que terminó te despierta solo (no tienes esperas programadas). Tienes ${minutos} ` +
  `minutos en total.`;

/**
 * Qué hace el director cuando un permiso le falta (nota del titular del 21 de octubre de 2026: que quede en la
 * estructura fija y no se pierda): ni lo rodea ni se queda sin él en silencio; lo pide en la misión del titular y, con
 * su «Autorizo», lo hace en la revisión siguiente. Va en cada encargo que ejecuta trabajo (la revisión y la urgencia).
 */
export const SIN_PERMISO =
  ` Si para lo aprobado te falta un permiso (una herramienta o una orden que se te niega), no lo rodees ni lo dejes en ` +
  `silencio: haz lo demás y convierte lo que no pudiste en un paso de la misión del titular que pida ese permiso (qué ` +
  `es, para qué, lo que cambia y lo que cuesta, con las opciones «Autorizo» y «No lo autorizo»; si se da fuera del ` +
  `Studio, con su guía completa), y dilo en la respuesta y en el mensaje. Con su «Autorizo», lo pendiente se ejecuta en ` +
  `la revisión siguiente. Nunca te des un permiso tú mismo sin ese «Autorizo».`;

/**
 * Cómo usar los permisos que el titular autorizó el 22 de octubre de 2026, para no perder turnos con lo que se niega:
 * git en otra carpeta con cd (git -C no se puede acotar a lecturas), copiar sin cp, y borrar o instalar solo así.
 */
export const COMO_ORDENES =
  ` Para leer con git en otra carpeta, da cd y luego la orden: git -C no está permitido. Copiar un archivo de texto no ` +
  `necesita permiso: léelo y escríbelo. Lees solo el Studio, el repositorio del proyecto y tus sesiones anteriores, ` +
  `nunca un archivo .env. Puedes mover con git mv y crear ramas de respaldo locales (git branch respaldo/…). Borras ` +
  `solo con git rm, archivos que git guarda, y solo con los dos pasos del titular en el Studio: lo aprobó y respondió ` +
  `«Confirmo» con la lista de lo que se borra a la vista. npm install, sin nombres de paquetes, solo cuando un cambio ` +
  `aprobado cambia package.json.`;

/**
 * Lo que se le encarga al director: lo mismo que «revisa estudio», de un proyecto, para una sesión sin pantalla. Con
 * `reintento`, la anterior no se cerró: retoma lo que dejó.
 */
export const encargo = (proyecto: string, reintento = false) =>
  `Revisión pedida desde el Studio para el proyecto «${proyecto}». Eres el director asistente de STL Studio y te lanzó el ` +
  `Studio, sin pantalla: nadie lee esta salida, así que todo lo que el titular deba saber va en el Studio. Haz «revisa ` +
  `estudio» de ese proyecto según CLAUDE.md (sección «La sesión del director»), con --proyecto ${proyecto} en todas las ` +
  `herramientas. Puedes escribir en el repositorio del proyecto, su memoria y su código, solo para lo que el titular ` +
  `aprobó o pidió en el Studio y con las normas de ese proyecto: pruebas en verde y commits locales. Nunca subas ni ` +
  `despliegues nada, ni borres de otra forma que la de abajo: si algo lo necesita, déjalo listo y dilo en la respuesta y ` +
  `en el mensaje. Tus permisos no ` +
  `aceptan órdenes encadenadas con &&: para cada commit da cd a la carpeta, luego git add y luego git commit, cada una ` +
  `por separado. Cierra como siempre: ` +
  `node tools/director/bandeja.ts --proyecto ${proyecto} --listo y el commit en la memoria del proyecto.` +
  (reintento ? ' Es un reintento: la revisión anterior no se cerró; retoma lo que dejó, sin rehacerlo (la bandeja lo lista).' : '') +
  COMO_ORDENES +
  SIN_PERMISO +
  esperar(MAX_MIN);

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
  `a la carpeta, luego git add y luego git commit, cada una por separado.` +
  esperar(MAX_MIN_ACLARAR);

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
  `y con las normas de ese proyecto: pruebas en verde y commits locales. Nunca subas ni despliegues nada, ni borres de ` +
  `otra forma que la de abajo: si algo ` +
  `lo necesita, déjalo listo y dilo en la respuesta. Tus permisos no aceptan órdenes encadenadas con &&: para cada commit ` +
  `da cd a la carpeta, luego git add y luego git commit, cada una por separado. Cierra con ` +
  `node tools/director/bandeja.ts --proyecto ${u.proyecto} --urgente --listo y el commit en la memoria del proyecto.` +
  COMO_ORDENES +
  SIN_PERMISO +
  esperar(MAX_MIN_URGENCIA);

/** Lo que se lanza aparte de la revisión: una aclaración o una urgencia. */
type Aparte = { tipo: 'aclaracion'; a: AclaracionPedida } | { tipo: 'urgencia'; u: UrgenciaPedida };

/**
 * Una ruta en la forma de las reglas de permisos de Claude Code: «//ruta» es absoluta, y en Windows Claude Code compara
 * las rutas en forma POSIX (C:\repos\x es //c/repos/x).
 */
const reglaDeRuta = (ruta: string) =>
  '//' + ruta.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, unidad: string) => '/' + unidad.toLowerCase()).replace(/^\/+|\/+$/g, '');

/**
 * Donde Claude Code guarda las sesiones que se abren en una carpeta: ~/.claude/projects/ y la ruta con un guion en vez
 * de cada signo (C:\xampp\STL es C--xampp-STL). Ahí están las revisiones anteriores del director lanzado desde el Studio.
 */
export const carpetaDeSesiones = (carpeta: string, casa = homedir()) =>
  join(casa, '.claude', 'projects', carpeta.replace(/[\\/]+$/, '').replace(/[^A-Za-z0-9]/g, '-'));

/** Las reglas que niegan una opción de una orden, esté justo después de ella o más adelante («git rm -f x», «git rm x -f»). */
const sinOpcion = (orden: string, opciones: string[]) => opciones.flatMap((o) => [`Bash(${orden} ${o}*)`, `Bash(${orden} * ${o}*)`]);

/**
 * Lo único que puede hacer el director lanzado por el Studio (el titular lo autorizó el 17 de octubre de 2026): leer,
 * las herramientas del director, escribir dentro del repositorio del proyecto (su memoria y su código, para que una
 * urgencia aprobada se arregle al instante), correr sus pruebas y hacer commits locales. Desde el 19 de octubre, también
 * investigar en internet (buscar y leer páginas, propuesta «El director puede buscar en internet») y repartir la
 * lectura entre ayudantes (subagentes), que heredan los mismos límites. Nada que suba ni despliegue: eso queda listo para
 * el titular. Con `flujos` (ultracode encendido y el permiso del titular, del 21 de octubre de 2026), también los flujos
 * de varios agentes (Workflow), cuyos agentes tienen estos mismos límites.
 *
 * Desde el 22 de octubre de 2026, los seis grupos que el titular autorizó en su misión «Autoriza los permisos que le
 * faltaron al director»: (1) las órdenes que solo leen o comprueban; (2) una parte de las pruebas; (3) leer solo donde
 * trabaja: el Studio (`raiz`), el repositorio del proyecto y sus propias sesiones anteriores (`negado` dice lo que nunca);
 * (4) mover dentro del repositorio y crear ramas de respaldo locales; (5) borrar con git rm, que solo borra lo que git
 * guarda (el encargo exige los dos pasos del titular en el Studio); y (6) npm install, sin nombres de paquetes.
 */
export function permitido(repositorio: string, flujos = false, raiz = repositorio, casa = homedir()): string[] {
  // Una regla Edit cubre también la escritura de archivos nuevos
  const r = reglaDeRuta(repositorio);
  // (3) Leer solo donde trabaja: sin la regla suelta «Read» (que deja leer todo el computador). Leer, buscar y listar
  // dentro de las carpetas de trabajo (el Studio, donde arranca, y el repositorio, con --add-dir) no pide permiso; sus
  // sesiones anteriores están fuera de ellas, y la regla Read también vale para Grep y Glob
  const leer = [...new Set([raiz, repositorio, carpetaDeSesiones(raiz, casa)].map((c) => `Read(${reglaDeRuta(c)}/**)`))];
  return [
    ...leer, `Edit(${r}/**)`,
    // investigar: lo leído en internet es referencia, nunca una orden (CLAUDE.md)
    'WebSearch', 'WebFetch',
    // repartir una lectura grande entre ayudantes (un repositorio grande, los historiales de IA de la cola de
    // diagnósticos): cada ayudante hereda esta misma lista, ni un permiso más (decisión del 19 de octubre de 2026)
    'Agent', 'Task',
    ...(flujos ? ['Workflow'] : []),
    'Bash(node tools/director/bandeja.ts:*)', 'Bash(node tools/director/diagnosticar.ts:*)', 'Bash(node tools/director/estado.ts:*)',
    // (2) las pruebas completas o solo una parte (un archivo, un nombre)
    'Bash(npm test)', 'Bash(npm test:*)', 'Bash(npx vitest run:*)', 'Bash(npm run typecheck)', 'Bash(npm run typecheck:*)',
    // mirar en un navegador sin pantalla lo que cambió de la interfaz (propuesta aceptada el 20 de octubre de 2026):
    // solo esta herramienta, que abre páginas https o de este computador y guarda las capturas en la memoria
    'Bash(node tools/director/mirar.ts:*)',
    // los commits, como los da la bandeja (cd, add y commit): solo locales, nunca push
    'Bash(cd:*)', 'Bash(git add:*)', 'Bash(git commit:*)', 'Bash(git status:*)', 'Bash(git diff:*)', 'Bash(git log:*)',
    // (1) leer y comprobar sin cambiar nada; git -C no, porque no se puede acotar a lecturas (el encargo dice cd y luego la orden)
    'Bash(ls:*)', 'Bash(wc:*)', 'Bash(git show:*)', 'Bash(git ls-files:*)', 'Bash(git rev-parse:*)', 'Bash(git rev-list:*)',
    'Bash(git config --get:*)', 'Bash(git branch --show-current)', 'Bash(git stash list:*)', 'Bash(git remote -v)',
    'Bash(git worktree list:*)', 'Bash(git ls-remote:*)', 'Bash(gh auth status:*)',
    // (4) mover dentro del repositorio (git no deja salir de él) y ramas de respaldo locales, nada más (negado)
    'Bash(git mv:*)', 'Bash(git branch respaldo/:*)',
    // (5) borrar solo lo que git guarda, que queda en la historia y se recupera
    'Bash(git rm:*)',
    // (6) instalar lo que dice package.json, sin nombres de paquetes
    'Bash(npm install)',
  ];
}

/**
 * Lo que el director lanzado nunca lee ni toca, aunque esté dentro de lo permitido (grupo 3 de los permisos que el
 * titular autorizó el 22 de octubre de 2026): ningún archivo .env, ni los ajustes ni las credenciales de Claude Code; no
 * edita sus propios permisos (.claude/settings*), estudio.local.json, los registros de las revisiones (.revisiones, donde
 * también está su configuración) ni nada de .git. Y de mover, crear ramas y borrar, solo lo que autorizó: sin
 * renombrar ni borrar ramas, sin forzar y sin borrar lo que git no guarda.
 */
export function negado(repositorio: string, raiz = repositorio): string[] {
  const carpetas = [...new Set([raiz, repositorio].map(reglaDeRuta))];
  const s = reglaDeRuta(raiz);
  return [
    'Read(//**/.env)', 'Read(//**/.env.*)',
    'Read(~/.claude/settings.json)', 'Read(~/.claude/settings.local.json)', 'Read(~/.claude/.credentials.json)', 'Read(~/.claude.json)',
    ...carpetas.map((c) => `Edit(${c}/.claude/settings*.json)`),
    `Edit(${s}/estudio.local.json)`, `Edit(${s}/.revisiones/**)`,
    'Edit(//**/.git)', 'Edit(//**/.git/**)',
    ...sinOpcion('git branch', ['-d', '-D', '--delete', '-m', '-M', '--move', '-f', '--force']),
    ...sinOpcion('git mv', ['-f', '--force']),
    ...sinOpcion('git rm', ['-f', '-rf', '-fr', '--force']),
  ];
}

/** Un paso de lo que va haciendo el director: lo que dice o la herramienta que usa. */
export interface PasoRevision {
  tipo: 'dice' | 'hace';
  texto: string;
  /** Cuántas veces seguidas lo hizo, si fue más de una (agruparPasos). */
  veces?: number;
}

/**
 * Las líneas iguales seguidas, en una sola con su cuenta («Edita plan.json» y un 5, en vez de cinco líneas), como lo pidió
 * el titular el 21 de octubre de 2026. El orden se mantiene: al cambiar de cosa, la cuenta vuelve a empezar.
 */
export function agruparPasos(pasos: PasoRevision[]): PasoRevision[] {
  const juntos: PasoRevision[] = [];
  for (const p of pasos) {
    const ultimo = juntos.at(-1);
    if (ultimo && ultimo.tipo === p.tipo && ultimo.texto === p.texto) ultimo.veces = (ultimo.veces ?? 1) + (p.veces ?? 1);
    else juntos.push({ ...p });
  }
  return juntos;
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

const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
const sumaUso = (u: Record<string, unknown>) => n(u.input_tokens) + n(u.cache_creation_input_tokens) + n(u.cache_read_input_tokens) + n(u.output_tokens);
/** La clave del total exacto, el del evento `result` (no es el id de ninguna respuesta). */
const RESULTADO = '·resultado';

/**
 * Los tokens que lleva el director, de su registro en stream-json, para verlos subir mientras revisa (propuesta «Los
 * tokens del director, en vivo», aceptada el 21 de octubre de 2026): cada respuesta del modelo trae los suyos (lo que lee,
 * lo que toma de la caché y lo que escribe), repetidos en cada parte de la respuesta y con lo escrito un poco atrasado, así
 * que se cuenta una vez por respuesta, con lo más que haya dicho. Al terminar, el total exacto del evento `result`, el
 * mismo de «Lo que gastó». Se suma a lo ya contado (`porRespuesta`), para leer el registro de a pedazos.
 */
export function usoDe(registro: string, porRespuesta: Map<string, number> = new Map()): Map<string, number> {
  for (const linea of registro.split('\n')) {
    if (!linea.startsWith('{')) continue;
    let ev: { type?: string; usage?: Record<string, unknown>; message?: { id?: string; usage?: Record<string, unknown> } };
    try { ev = JSON.parse(linea); } catch { continue; }
    if (ev.type === 'assistant' && ev.message?.id && ev.message.usage) porRespuesta.set(ev.message.id, Math.max(porRespuesta.get(ev.message.id) ?? 0, sumaUso(ev.message.usage)));
    if (ev.type === 'result' && ev.usage) porRespuesta.set(RESULTADO, sumaUso(ev.usage));
  }
  return porRespuesta;
}

/** El total de lo contado: el exacto, si ya terminó; si no, la suma de cada respuesta. */
export function tokensDe(porRespuesta: Map<string, number>): number {
  return porRespuesta.get(RESULTADO) ?? [...porRespuesta.values()].reduce((s, x) => s + x, 0);
}

/** Lo que se lleva leído de cada registro: así cada consulta lee solo lo nuevo, y nada del principio se pierde. */
const leidos = new Map<string, { hasta: number; pasos: PasoRevision[]; uso: Map<string, number> }>();

/** Cuántos pasos se muestran, como mucho: una revisión entera cabe de sobra. */
export const MAX_PASOS = 2000;

/**
 * Lo que va haciendo el director en la revisión que lanzó el Studio para un proyecto (su último registro), de principio
 * a fin: recargar la página no lo reinicia, solo una revisión nueva.
 */
export function progresoDeProyecto(raiz: string, proyecto: string): PasoRevision[] {
  const archivo = ultimoRegistro(raiz, proyecto);
  if (!archivo) return [];
  const carpeta = join(raiz, '.revisiones');
  let leido = leidos.get(archivo);
  if (!leido) {
    // Una revisión nueva de este proyecto: lo de la anterior ya no hace falta
    for (const a of leidos.keys()) if (a.startsWith(join(carpeta, `${proyecto}-`))) leidos.delete(a);
    leido = { hasta: 0, pasos: [], uso: new Map() };
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
    const nuevo = buf.subarray(0, fin).toString('utf-8');
    leido.pasos = [...leido.pasos, ...progresoDe(nuevo, Infinity)].slice(-MAX_PASOS);
    usoDe(nuevo, leido.uso);
    leido.hasta += fin + 1;
    return leido.pasos;
  } finally {
    closeSync(fd);
  }
}

/** Los tokens que lleva la revisión que lanzó el Studio para un proyecto (su último registro); 0 si aún no hay. */
export function tokensDeProyecto(raiz: string, proyecto: string): number {
  progresoDeProyecto(raiz, proyecto);
  const prefijo = join(raiz, '.revisiones', `${proyecto}-`);
  const ultimo = [...leidos.keys()].filter((a) => a.startsWith(prefijo) && /^\d{4}-\d\d-\d\dT[\d-]+Z\.log$/.test(a.slice(prefijo.length))).sort().at(-1);
  return ultimo ? tokensDe(leidos.get(ultimo)!.uso) : 0;
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
  /**
   * Lo que se le negó en ese lanzamiento (`permission_denials`), sin repetir: se ve en «Lo que gastó» y la bandeja se lo
   * dice al director siguiente (propuesta aceptada «Lo que se le negó al director, a la vista»). Sin negaciones, no viene.
   */
  negados?: string[];
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
  const negados = negacionesDe(registro);
  return {
    modelo,
    ...(pedido ? { pedido } : {}),
    ...(negados.length ? { negados } : {}),
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

/** Lo que se sabe del final de un lanzamiento, además de su registro. */
export interface FinDeRevision {
  /** Lo que dijo el Studio al terminar (fin()). */
  problema?: string;
  /** Si la cortó el límite de tiempo, y cuál era (minutos). */
  limite?: number;
  /** El código con que salió Claude Code, si se sabe. */
  codigo?: number | null;
  /** Si el proceso de Claude Code ya no existe y nadie vio cómo terminó (el servidor que lo lanzó ya no estaba). */
  muerto?: boolean;
  /** Cuándo empezó, cuándo terminó y la última vez que su registro creció (ms). */
  inicio?: number;
  fin?: number;
  ultimaActividad?: number;
  registro?: string;
}

/** Cuánto se espera, sin nada nuevo en el registro, para decir que la revisión está parada. */
export const SIN_ACTIVIDAD_MIN = 10;

const SUGERENCIA_PEDIR = 'Pídela de nuevo: lo que el director alcanzó a guardar queda, y la revisión nueva retoma lo que falte.';
const SUGERENCIA_SIN_FLUJOS = 'Pídela sin ultracode: sin flujos de varios agentes, el director hace él mismo ese trabajo y cierra a tiempo. El permiso se le puede volver a dar en «Modelo y consumo».';

/**
 * Qué pasó con una revisión que no se cerró, leído de su registro en stream-json y de lo que se sabe del final: no
 * arrancó, la cuenta no aceptó el modelo o el esfuerzo, un error de la API o un límite de uso, el límite de tiempo,
 * el turno terminado esperando un flujo en segundo plano, permisos negados, o el proceso que murió. Puro: sin archivos.
 */
export function diagnosticarFalla(registro: string, f: FinDeRevision = {}): FallaRevision {
  const eventos: any[] = [];
  const textos: string[] = [];
  for (const linea of registro.split('\n')) {
    const t = linea.trim();
    if (!t) continue;
    if (!t.startsWith('{')) { textos.push(t); continue; }
    try { eventos.push(JSON.parse(t)); } catch { /* la línea que aún se escribía */ }
  }
  const arranco = eventos.some((e) => e.type === 'system' && e.subtype === 'init');
  // Un error de la API también llega como respuesta del modelo: esa no cuenta como trabajo
  const trabajo = eventos.some((e) => e.type === 'assistant' && !e.error && !e.message?.isApiErrorMessage);
  const resultados = eventos.filter((e) => e.type === 'result');
  const ultimo = resultados.at(-1);
  // Los flujos y los ayudantes que lanzó, y lo de fondo que seguía (o que Claude Code cortó) al terminar
  const usos = eventos.filter((e) => e.type === 'assistant' && Array.isArray(e.message?.content)).flatMap((e) => e.message.content).filter((b: any) => b?.type === 'tool_use');
  const flujos = usos.filter((b: any) => b.name === 'Workflow').length;
  const ayudantes = usos.filter((b: any) => b.name === 'Agent' || b.name === 'Task').length;
  // Lo de fondo, por su id: su nombre (de cualquier aviso), lo que seguía al final y lo que Claude Code cortó
  const nombres = new Map<string, string>();
  for (const e of eventos)
    if (e.type === 'system' && e.subtype === 'background_tasks_changed' && Array.isArray(e.tasks))
      for (const x of e.tasks) if (x?.task_id) nombres.set(String(x.task_id), corto(x.description ?? 'un trabajo en segundo plano', 90));
  const fondo = eventos.filter((e) => e.type === 'system' && e.subtype === 'background_tasks_changed').at(-1);
  const pendientes: string[] = Array.isArray(fondo?.tasks) ? fondo.tasks.map((x: any) => nombres.get(String(x?.task_id)) ?? 'un trabajo en segundo plano') : [];
  const idsCortados = eventos
    .filter((e) => e.type === 'system' && ((e.subtype === 'task_updated' && e.patch?.status === 'killed') || (e.subtype === 'task_notification' && /stopped|killed/.test(String(e.status)))))
    .map((e) => String(e.task_id));
  const cortados = idsCortados.length > 0 || textos.some((t) => /Background tasks still running/i.test(t));
  const esperas = usos.some((b: any) => b.name === 'ScheduleWakeup' || b.name === 'CronCreate');
  // Los permisos negados, sin repetir: la herramienta y lo que intentó (de su uso, por el id)
  const porId = new Map<string, any>(usos.map((b: any) => [String(b.id), b]));
  const idsNegados = [...new Set([
    ...eventos.filter((e) => e.type === 'system' && e.subtype === 'permission_denied').map((e) => String(e.tool_use_id)),
    ...resultados.flatMap((r) => (Array.isArray(r.permission_denials) ? r.permission_denials : [])).map((x: any) => String(x?.tool_use_id)),
  ])];
  const negados = [...new Set(idsNegados.map((id) => {
    const b = porId.get(id) ?? resultados.flatMap((r) => r.permission_denials ?? []).find((x: any) => String(x?.tool_use_id) === id);
    const nombre = b?.name ?? b?.tool_name ?? 'una herramienta';
    const que = b?.input?.command ?? b?.tool_input?.command ?? b?.input?.file_path ?? b?.tool_input?.file_path;
    return `${nombre}${que ? `: «${corto(que, 70)}»` : ''}`;
  }))].slice(0, 5);
  // Un error de la API, de la sesión o un límite de uso: lo dice el resultado, la respuesta del modelo o un texto de error
  const tipoError = eventos.filter((e) => e.type === 'assistant' && typeof e.error === 'string').map((e) => e.error as string).at(-1);
  const errorDicho = [
    ...textos.filter((t) => /error|limit|login|auth/i.test(t)),
    ...eventos.filter((e) => e.type === 'assistant' && (e.error || e.message?.isApiErrorMessage)).flatMap((e) => (e.message?.content ?? []).map((b: any) => String(b?.text ?? ''))),
    ...resultados.filter((r) => r.is_error || /^error/.test(String(r.subtype))).map((r) => String(r.result ?? r.subtype ?? '')),
  ].map((x) => x.trim()).filter(Boolean).at(-1);
  const rechazo = eventos.filter((e) => e.type === 'rate_limit_event' && e.rate_limit_info?.status === 'rejected').at(-1);
  const limiteDeUso = !!rechazo || tipoError === 'rate_limit' || (!!errorDicho && /usage limit|limit reached|rate.?limit|hit your limit|out of (extra )?usage/i.test(errorDicho));
  const sesion = tipoError === 'authentication_failed' || tipoError === 'billing_error' || (!!errorDicho && /invalid api key|\/login|not logged in|authenticat|oauth|credit balance/i.test(errorDicho));

  const duracion = f.inicio && f.fin && f.fin >= f.inicio ? Math.round((f.fin - f.inicio) / 6000) / 10 : ultimo ? Math.round(n(ultimo.duration_ms) / 6000) / 10 : null;
  const gasto = ultimo && typeof ultimo.total_cost_usd === 'number' ? ultimo.total_cost_usd : null;
  const ultimos = agruparPasos(progresoDe(registro, Infinity)).slice(-5);
  const sinActividad = f.fin && f.ultimaActividad ? Math.floor((f.fin - f.ultimaActividad) / 60_000) : 0;
  const deFondoLista = pendientes.length ? pendientes : idsCortados.map((id) => nombres.get(id)).filter((x): x is string => !!x);
  const deFondo = deFondoLista.length ? `«${deFondoLista[0]}»${deFondoLista.length > 1 ? ` y ${deFondoLista.length - 1} más` : ''}` : flujos ? 'un flujo de varios agentes' : 'un ayudante';
  const conFlujos = flujos > 0;
  const base = { duracion, gasto, ultimos, usoFlujos: flujos || ayudantes ? { flujos, ayudantes } : null, negados, cuando: new Date(f.fin ?? Date.now()).toISOString(), ...(f.registro ? { registro: f.registro } : {}) };
  const reporte = (que: string, porque: string, accion: FallaRevision['accion'] = 'pedir', sugerencia = SUGERENCIA_PEDIR, extra: Partial<FallaRevision> = {}): FallaRevision =>
    ({ que, porque, sugerencia, accion, ...base, ...extra });
  const salida = f.codigo ? ` (salió con el código ${f.codigo})` : '';

  // 1. No llegó a trabajar
  if (!trabajo && (fallaDelModelo(registro) || fallaDelEsfuerzo(registro)))
    return reporte('No arrancó', f.problema ?? `Claude Code no aceptó ${fallaDelModelo(registro) ? 'el modelo' : 'el esfuerzo'} elegido en «Modelo y consumo».`, 'pedir', 'El Studio ya volvió al de tu cuenta: pídela de nuevo.');
  if (!trabajo && sesion)
    return reporte('No arrancó', `Claude Code no tiene una sesión válida en este computador${errorDicho ? `: «${corto(errorDicho, 160)}»` : ''}.`, 'cuenta', 'Abre una terminal, corre «claude auth login» y, con la sesión iniciada, pídela de nuevo.');
  if (!trabajo && limiteDeUso)
    return reporte('No arrancó', 'Tu plan de Claude llegó a su límite de uso: Claude Code no aceptó más trabajo.', 'cuenta', 'Espera a que se renueve tu límite y pídela de nuevo; lo que llevas usado se ve en «Modelo y consumo».', renovacion(rechazo));
  if (!arranco && !trabajo)
    return reporte('No arrancó', `${f.problema && /no pudo lanzar/.test(f.problema) ? f.problema : `Claude Code se cerró antes de empezar${salida}.`}${textos.length ? ` Lo único que dijo: «${corto(textos.at(-1), 160)}».` : ' No escribió nada en su registro.'}`, 'pedir', 'Pídela de nuevo; si vuelve a pasar, abre Claude Code en una terminal (claude) para ver si arranca.');
  // 2. La cuenta o la API cortaron el trabajo
  if (limiteDeUso)
    return reporte('Se detuvo a mitad de camino', 'Tu plan de Claude llegó a su límite de uso mientras el director trabajaba.', 'cuenta', 'Espera a que se renueve tu límite y pídela de nuevo: lo que el director alcanzó a guardar queda; lo que llevas usado se ve en «Modelo y consumo».', renovacion(rechazo));
  if (sesion || (errorDicho && ultimo?.is_error))
    return reporte('Se detuvo a mitad de camino', errorDicho ? `Claude Code devolvió un error: «${corto(errorDicho, 200)}».` : 'Claude Code perdió la sesión de tu cuenta mientras el director trabajaba.', sesion ? 'cuenta' : 'pedir', sesion ? 'Abre una terminal, corre «claude auth login» y, con la sesión iniciada, pídela de nuevo.' : 'Pídela de nuevo: suele ser pasajero. Si se repite, abre Claude Code en una terminal para ver el error.');
  // 3. El límite de tiempo del Studio
  if (f.limite) {
    const porque = pendientes.length
      ? `Seguía esperando ${deFondo}, que trabajaba en segundo plano, cuando llegó el límite de ${f.limite} minutos.`
      : sinActividad >= SIN_ACTIVIDAD_MIN
        ? `Llevaba ${sinActividad} minutos sin ninguna actividad en su registro: se había quedado parado.`
        : `Seguía trabajando cuando llegó el límite de ${f.limite} minutos: la revisión tenía más de lo que cabe en ese tiempo.`;
    return reporte(`La revisión se cortó a los ${f.limite} minutos`, porque, conFlujos ? 'sin_ultracode' : 'pedir', conFlujos ? SUGERENCIA_SIN_FLUJOS : SUGERENCIA_PEDIR);
  }
  // 4. Terminó su turno con trabajo de fondo a medias (o se lo cortaron), sin cerrar
  if (pendientes.length || cortados || (esperas && (flujos || ayudantes)))
    return reporte('Claude Code terminó sin cerrar la revisión', `El director terminó su turno esperando ${deFondo} en segundo plano${cortados ? ', y Claude Code lo cortó sin volver a despertarlo' : ', y no volvió a despertar para cerrar'}.`, conFlujos ? 'sin_ultracode' : 'pedir', conFlujos ? SUGERENCIA_SIN_FLUJOS : SUGERENCIA_PEDIR);
  // 5. El proceso murió sin que nadie viera cómo
  if (f.muerto && !ultimo)
    return reporte('Claude Code se detuvo sin terminar', `El proceso de Claude Code ya no existe y su registro no tiene un final: se cerró desde afuera (el computador se suspendió o se apagó, o alguien cerró el proceso)${sinActividad ? `; lo último que escribió fue hace ${sinActividad} min` : ''}.`);
  if (!ultimo)
    return reporte('Claude Code se detuvo sin terminar', `Claude Code se cerró a mitad de camino${salida}, sin dar su resultado final.${textos.length ? ` Lo último que dijo: «${corto(textos.at(-1), 160)}».` : ''}`);
  // 6. Terminó su turno sin cerrar: con permisos negados, o sin más
  if (idsNegados.length)
    return reporte('Claude Code terminó sin cerrar la revisión', `Se le ${idsNegados.length === 1 ? 'negó un permiso' : `negaron ${idsNegados.length} permisos`}${negados.length ? ` (${negados.slice(0, 2).join('; ')})` : ''} y terminó su turno sin cerrar con «bandeja.ts --listo».${ultimo.result ? ` Lo último que dijo: «${corto(ultimo.result, 160)}».` : ''}`);
  return reporte('Claude Code terminó sin cerrar la revisión', `El director terminó su turno sin cerrar con «bandeja.ts --listo».${ultimo.result ? ` Lo último que dijo: «${corto(ultimo.result, 160)}».` : ''}`);
}

/** Cuándo se renueva el límite de uso, del aviso de límites que lo rechazó (resetsAt, en segundos). */
function renovacion(rechazo: any): Partial<FallaRevision> {
  const s = rechazo?.rate_limit_info?.resetsAt;
  return typeof s === 'number' && Number.isFinite(s) ? { renueva: new Date(s * 1000).toISOString() } : {};
}

/** El registro de la última revisión que lanzó el Studio para un proyecto («<proyecto>-<fecha>.log»), o null. */
export function ultimoRegistro(raiz: string, proyecto: string): string | null {
  const carpeta = join(raiz, '.revisiones');
  if (!existsSync(carpeta)) return null;
  // Con la fecha, «stl» no se confunde con «stl-studio»
  const ultimo = readdirSync(carpeta).filter((a) => a.startsWith(`${proyecto}-`) && /^\d{4}-\d\d-\d\dT[\d-]+Z\.log$/.test(a.slice(proyecto.length + 1))).sort().at(-1);
  return ultimo ? join(carpeta, ultimo) : null;
}

/** Cuándo empezó un registro, de su nombre («…-2026-10-21T18-37-34-899Z.log»), en ms; null si no se lee. */
export function inicioDeRegistro(archivo: string): number | null {
  const m = /(\d{4}-\d\d-\d\d)T(\d\d)-(\d\d)-(\d\d)-(\d{3})Z\.log$/.exec(archivo);
  const t = m ? Date.parse(`${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z`) : NaN;
  return Number.isFinite(t) ? t : null;
}

/** La última vez que creció el registro de la revisión en marcha de un proyecto (ISO), para ver si está parada. */
export function actividadDeProyecto(raiz: string, proyecto: string): string | null {
  const archivo = ultimoRegistro(raiz, proyecto);
  try {
    return archivo ? new Date(statSync(archivo).mtimeMs).toISOString() : null;
  } catch {
    return null;
  }
}

/** El reporte de la falla de la última revisión de un proyecto, leyendo su registro (si lo hay). */
export function fallaDeProyecto(raiz: string, proyecto: string, f: FinDeRevision = {}): FallaRevision {
  const archivo = ultimoRegistro(raiz, proyecto);
  if (!archivo) return diagnosticarFalla('', f);
  let texto = '';
  let mtime: number | undefined;
  try {
    texto = readFileSync(archivo, 'utf-8');
    mtime = statSync(archivo).mtimeMs;
  } catch {
    // se borró mientras tanto: el reporte dice lo que se sabe
  }
  return diagnosticarFalla(texto, { inicio: inicioDeRegistro(archivo) ?? undefined, fin: Date.now(), ultimaActividad: mtime, registro: relative(raiz, archivo), ...f });
}

/**
 * ¿La revisión se cerró, según el plan del proyecto? Lo que manda es `plan.revisado`, que solo escribe
 * `bandeja.ts --listo`: si es igual o posterior a cuando se lanzó (o, sin lanzar, a cuando se pidió), cerró, aunque
 * estudio.local.json no lo diga (el 21 de octubre de 2026 una revisión cerrada se mostró como fallida). Pura.
 */
export function cerroSegunPlan(revisado: string | null | undefined, r: { pedida: string; lanzada?: string }): boolean {
  const cerro = revisado ? Date.parse(revisado) : NaN;
  const desde = Date.parse(r.lanzada ?? r.pedida);
  return Number.isFinite(cerro) && Number.isFinite(desde) && cerro >= desde;
}

/** `plan.revisado` del proyecto, leído de su memoria; null si no se puede leer. */
export function revisadoDelPlan(raiz: string, proyecto: string): string | null {
  try {
    const revisado = JSON.parse(readFileSync(enDisco(raiz, rutasDe(proyecto).plan), 'utf-8'))?.revisado;
    return typeof revisado === 'string' ? revisado : null;
  } catch {
    return null;
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

/**
 * La orden que abre Claude Code en una terminal como lo lanza el Studio: en la carpeta del Studio (donde están las reglas
 * del director), con la del proyecto activo a la vista, y con el modelo y el esfuerzo de su configuración, que son los
 * que elige «Modelo y consumo» (y «Máximo», que Claude Code no guarda, con --effort max). Es una sesión de quien la abre:
 * pide permiso para lo que haga. Sin las variables de una sesión de Claude Code desde la que se haya encendido el Studio,
 * que le harían creer que está dentro de ella.
 */
export function ordenAbrirClaude(programa: string, raiz: string, repositorio: string | null, maximo = false): string {
  const q = (s: string) => `'${s.replace(/\\/g, '/').replace(/'/g, `'\\''`)}'`;
  // El .cmd de npm no corre en bash: ahí basta su nombre, porque se encontró en el PATH
  const claude = /\.cmd$/i.test(programa) ? 'claude' : q(programa);
  const otro = repositorio && resolve(repositorio) !== resolve(raiz) ? ` --add-dir ${q(repositorio)}` : '';
  return `env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT ${claude}${otro}${maximo ? ' --effort max' : ''}`;
}

/** Lanza Claude Code. El .cmd de npm, en Windows, solo corre dentro de una consola. */
function lanzarClaude(programa: string, args: string[], opciones: Parameters<typeof spawn>[2]) {
  // Lanzado desde otra sesión de Claude Code, heredaría sus variables y creería estar dentro de ella
  const env = { ...process.env };
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRYPOINT;
  // Sin pantalla, Claude Code corta lo que sigue en segundo plano (un flujo de varios agentes) 10 minutos después del
  // último turno, y el director nunca lo sabe: el 21 de octubre de 2026 dos revisiones perdieron así su flujo a medias.
  // Con 0 lo espera, y el aviso de que terminó despierta al director; el límite lo pone el Studio (MAX_MIN)
  env.CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS = '0';
  return process.platform === 'win32' && /\.cmd$/i.test(programa)
    ? spawn(conComillas(programa), args.map(conComillas), { ...opciones, env, shell: true, windowsHide: true })
    : spawn(programa, args, { ...opciones, env, windowsHide: true });
}

/**
 * Detiene al director con todo lo que lanzó. En Windows, matar el proceso deja vivo lo de abajo (el .cmd de npm corre
 * dentro de una consola, y Claude Code, debajo de ella): se cierra el árbol entero.
 */
function detener(p: ReturnType<typeof spawn>): void {
  if (process.platform === 'win32' && p.pid) spawn('taskkill', ['/pid', String(p.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  else p.kill();
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

/**
 * El turno de lanzar al director, entre todos los servidores del Studio de este computador: un archivo que se crea solo
 * si no existe (atómico), con el proceso que lo tiene. Sin él, dos servidores encendidos a la vez vieron la misma
 * revisión pedida y lanzaron dos directores sobre el mismo plan (21 de octubre de 2026). Si su proceso ya no existe o
 * pasó el límite de una revisión, está abandonado y se toma.
 */
export function tomarTurno(archivo: string, ahora = Date.now()): boolean {
  for (let intento = 0; intento < 2; intento++) {
    try {
      writeFileSync(archivo, JSON.stringify({ pid: process.pid, cuando: new Date(ahora).toISOString() }), { flag: 'wx' });
      return true;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') return false;
      if (!turnoAbandonado(archivo, ahora)) return false;
      try { unlinkSync(archivo); } catch { return false; }
    }
  }
  return false;
}

function turnoAbandonado(archivo: string, ahora: number): boolean {
  try {
    const t = JSON.parse(readFileSync(archivo, 'utf-8'));
    if (!(ahora - Date.parse(t.cuando) < (MAX_MIN + 5) * 60_000)) return true;
    process.kill(t.pid, 0); // solo pregunta si el proceso existe
    return false;
  } catch (e) {
    // EPERM: existe, pero es de otro usuario
    return (e as NodeJS.ErrnoException).code !== 'EPERM';
  }
}

/** Suelta el turno, si es de este proceso. */
export function soltarTurno(archivo: string): void {
  try {
    if (JSON.parse(readFileSync(archivo, 'utf-8')).pid === process.pid) unlinkSync(archivo);
  } catch {
    // ya no estaba
  }
}

/** Si lo que se iba a lanzar sigue sin lanzar (otro servidor del Studio pudo tomarlo un instante antes). */
function sigueSinLanzar(l: Awaited<ReturnType<typeof leerLocal>>, proyecto: string, aparte?: Aparte): boolean {
  if (aparte?.tipo === 'aclaracion') return l.aclaracion?.nota === aparte.a.nota && !l.aclaracion.lanzada && !l.aclaracion.hecha;
  if (aparte?.tipo === 'urgencia') return l.urgencia?.pedida === aparte.u.pedida && !l.urgencia.lanzada && !l.urgencia.hecha;
  const r = l.revision;
  return !!r && r.proyecto === proyecto && !r.lanzada && !r.enCurso && !r.hecha && !r.error;
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
      if (r.lanzada) return void (await this.vigilarLanzada(r.proyecto, r.lanzada));
      if (r.enCurso) return;
      await this.preparar(forzar);
      const repositorio = await leerRutaRepositorio(this.raiz, r.proyecto);
      if (!this.programa || this.problema || !repositorio) return;
      await this.lanzar(r.proyecto, this.programa, repositorio);
    } finally {
      this.ocupado = false;
    }
  }

  /**
   * Una revisión lanzada que este servidor no está mirando (la lanzó otro, o este antes de reiniciarse). Si Claude Code
   * ya no existe y nadie la cerró, se marca fallida en ese momento, con su reporte, sin esperar el límite; pasado el
   * límite, se da por perdida. Nunca detiene un proceso por su número: después de reiniciar el computador, ese número
   * puede ser ya de otro programa. Sin modelo: solo el turno, el registro y si los procesos existen.
   */
  private async vigilarLanzada(proyecto: string, lanzada: string): Promise<void> {
    // Si el plan dice que cerró, cerró: nunca se marca fallida una revisión que corrió --listo
    if (await this.cerrarSiCerro(proyecto, { pedida: lanzada, lanzada })) return;
    const lanzado = estadoDelLanzado(join(this.raiz, '.revisiones', 'lanzando.json'), proyecto);
    if (lanzado.estado === 'muerto') {
      const problema = 'La revisión que lanzó el Studio se detuvo: Claude Code ya no está corriendo y no la cerró.';
      const falla = fallaDeProyecto(this.raiz, proyecto, { problema, muerto: true });
      return void (await marcarLanzada(this.raiz, proyecto, `${problema}${falla.registro ? ` Lo que alcanzó a hacer quedó en ${falla.registro}.` : ''}`, falla));
    }
    if (!(Date.now() - Date.parse(lanzada) > (MAX_MIN + 5) * 60_000)) return;
    const problema = `La revisión que lanzó el Studio no terminó en ${MAX_MIN} minutos.`;
    const falla = fallaDeProyecto(this.raiz, proyecto, { problema, limite: MAX_MIN });
    await marcarLanzada(this.raiz, proyecto, problema, falla);
  }

  /**
   * Si el plan del proyecto dice que la revisión cerró (cerroSegunPlan), la deja `hecha` aunque estudio.local.json no
   * lo diga, y responde true: entonces no se marca fallida.
   */
  private async cerrarSiCerro(proyecto: string, r: { pedida: string; lanzada?: string }): Promise<boolean> {
    if (!cerroSegunPlan(revisadoDelPlan(this.raiz, proyecto), r)) return false;
    await marcarRevision(this.raiz, proyecto, 'hecha');
    return true;
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
    // Un director a la vez en este computador, aunque haya dos servidores del Studio encendidos
    const turno = join(carpeta, 'lanzando.json');
    if (!tomarTurno(turno)) return;
    const antes = await leerLocal(this.raiz);
    if (!sigueSinLanzar(antes, proyecto, aparte)) return soltarTurno(turno);
    // Pedida de nuevo después de una que no se cerró: retoma lo que esa dejó (la bandeja lo lista)
    const reintento = !aparte && !!antes.revision?.reintento;
    // La de una aclaración o una urgencia lleva su nombre: así no se confunde con el registro de la revisión (progresoDeProyecto)
    const archivo = join(carpeta, `${proyecto}-${aparte ? `${aparte.tipo}-` : ''}${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
    const registro = openSync(archivo, 'a');
    // El modelo y el esfuerzo de Claude Code (los de /model y /effort, que también se eligen en «Modelo y consumo»): se pasan
    // explícitos para que el registro diga qué se pidió
    // («Máximo», que Claude Code no guarda, lo recuerda el Studio: conMaximo)
    const maximo = (await leerLocal(this.raiz)).esfuerzoMaximo === true;
    const { modelo, esfuerzo, ultracode } = conMaximo(await leerAjustesClaude(this.ajustes), maximo);
    // Lo pedido va primero en el registro: así el Studio compara con el modelo con que de verdad trabajó
    writeSync(registro, lineaPedido(modelo, esfuerzo));
    // Sin ultracode aunque tus sesiones lo tengan, salvo que el titular le haya dado ese permiso (ajustesDelDirector): en
    // un archivo y no en el argumento, porque las comillas del JSON no pasan bien por la consola de Windows
    const director = ajustesDelDirector(ultracode, (await leerLocal(this.raiz)).permisos?.ultracode === true);
    const ajustes = join(carpeta, 'ajustes-del-director.json');
    writeFileSync(ajustes, JSON.stringify(director.ajustes));
    // dontAsk: lo que no está en la lista se niega sin preguntar (nadie está mirando para responder); las esperas
    // programadas no piden permiso, así que se quitan aparte (SIN_ESPERAS). En stream-json, el
    // registro tiene cada paso a medida que ocurre: el Studio lo resume en vivo (progresoDe)
    const args = ['-p', '--output-format', 'stream-json', '--verbose', ...(modelo ? ['--model', modelo] : []), ...(esfuerzo ? ['--effort', esfuerzo] : []), '--settings', ajustes, '--permission-mode', 'dontAsk', '--add-dir', repositorio, '--disallowedTools', ...SIN_ESPERAS, ...negado(repositorio, this.raiz), '--allowedTools', ...permitido(repositorio, director.flujos, this.raiz)];
    this.hijo = proyecto;
    if (aparte?.tipo === 'aclaracion') await marcarAclaracion(this.raiz, aparte.a.nota, 'lanzada');
    else if (aparte?.tipo === 'urgencia') await marcarUrgencia(this.raiz, aparte.u.pedida, 'lanzada');
    else await marcarLanzada(this.raiz, proyecto);
    const inicio = Date.now();
    const p = lanzarClaude(programa, args, { cwd: this.raiz, stdio: ['pipe', registro, registro] });
    // Quién es el director lanzado: si este servidor se reinicia, el siguiente sabe si sigue vivo (vigilarLanzada)
    anotarHijo(turno, p.pid, proyecto, relative(this.raiz, archivo));
    p.stdin?.end(aparte?.tipo === 'aclaracion' ? encargoAclaracion(aparte.a) : aparte?.tipo === 'urgencia' ? encargoUrgencia(aparte.u) : encargo(proyecto, reintento));
    const minutos = aparte?.tipo === 'aclaracion' ? MAX_MIN_ACLARAR : aparte?.tipo === 'urgencia' ? MAX_MIN_URGENCIA : MAX_MIN;
    let cortada = false;
    const limite = setTimeout(() => {
      cortada = true;
      detener(p);
    }, minutos * 60_000);
    let cerrado = false;
    const fin = async (problema: string, codigo?: number | null) => {
      if (cerrado) return;
      cerrado = true;
      clearTimeout(limite);
      closeSync(registro);
      this.hijo = null;
      soltarTurno(turno);
      if (cortada) problema = `La revisión que lanzó el Studio se cortó al llegar a su límite de ${minutos} minutos.`;
      // La cuenta no acepta el modelo elegido: vuelve al de siempre (también en Claude Code, que con él tampoco
      // arrancaría), y el aviso lo dice
      if (modelo && fallaDelModelo(readFileSync(archivo, 'utf-8'))) {
        await guardarModeloClaude(null, this.ajustes).catch(() => {});
        problema = `Tu cuenta de Claude Code no aceptó el modelo «${modelo}», así que el Studio lo quitó de la configuración de Claude Code y volvió al de tu cuenta: pide la revisión otra vez. En «Modelo y consumo», al pie de la barra, puedes elegir otro.`;
      } else if (esfuerzo && fallaDelEsfuerzo(readFileSync(archivo, 'utf-8'))) {
        await (maximo ? guardarEsfuerzoMaximo(this.raiz, false) : guardarEsfuerzoClaude(null, this.ajustes)).catch(() => {});
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
      if (r?.proyecto === proyecto && !r.hecha) {
        // Si corrió --listo (el plan lo dice), cerró: se deja hecha, aunque estudio.local.json lo haya perdido
        if (await this.cerrarSiCerro(proyecto, { pedida: r.pedida, lanzada: r.lanzada ?? new Date(inicio).toISOString() })) return;
        // El reporte de qué pasó, leído del registro: lo muestra «¿Por qué?» (nunca una falla en silencio)
        let texto = '';
        let ultimaActividad: number | undefined;
        try {
          texto = readFileSync(archivo, 'utf-8');
          ultimaActividad = statSync(archivo).mtimeMs;
        } catch {
          // sin registro, el reporte dice lo que se sabe
        }
        const falla = diagnosticarFalla(texto, { problema, codigo, inicio, fin: Date.now(), ultimaActividad, registro: relative(this.raiz, archivo), ...(cortada ? { limite: minutos } : {}) });
        await marcarLanzada(this.raiz, proyecto, `${problema} Lo que alcanzó a hacer quedó en ${relative(this.raiz, archivo)}.`, falla);
      }
    };
    p.on('error', (e) => void fin(`El Studio no pudo lanzar Claude Code (${e.message}).`));
    p.on('exit', (codigo) => void fin(`La revisión que lanzó el Studio terminó sin cerrarse${codigo ? ` (código ${codigo})` : ''}.`, codigo));
  }
}

/** Anota en el turno el proceso del director lanzado, su proyecto y su registro, si el turno es de este servidor. */
function anotarHijo(turno: string, hijo: number | undefined, proyecto: string, registro: string): void {
  if (!hijo) return;
  try {
    const t = JSON.parse(readFileSync(turno, 'utf-8'));
    if (t.pid === process.pid) writeFileSync(turno, JSON.stringify({ ...t, hijo, proyecto, registro }));
  } catch {
    // sin turno: no hay a quién anotar
  }
}

/** Si un proceso existe (solo lo pregunta). EPERM: existe, pero es de otro usuario. */
const existe = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
};

/**
 * Cómo está una revisión lanzada por otro servidor del Studio (o por este antes de reiniciarse), según el turno:
 * `servidor` (quien la lanzó sigue encendido y la vigila), `director` (quien la lanzó ya no está, pero Claude Code
 * sigue trabajando), `muerto` (ninguno de los dos existe: nadie la va a cerrar) o `desconocido` (sin datos del turno).
 */
export function estadoDelLanzado(turno: string, proyecto: string, vive: (pid: number) => boolean = existe): { estado: 'servidor' | 'director' | 'muerto' | 'desconocido'; hijo?: number } {
  try {
    const t = JSON.parse(readFileSync(turno, 'utf-8'));
    if (typeof t.hijo !== 'number' || t.proyecto !== proyecto) return { estado: 'desconocido' };
    if (t.pid !== process.pid && typeof t.pid === 'number' && vive(t.pid)) return { estado: 'servidor', hijo: t.hijo };
    return { estado: vive(t.hijo) ? 'director' : 'muerto', hijo: t.hijo };
  } catch {
    return { estado: 'desconocido' };
  }
}
