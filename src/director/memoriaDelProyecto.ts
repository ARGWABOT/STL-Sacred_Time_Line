// Qué tan al día está la memoria de un proyecto que llega (nota del titular del 9 de noviembre de 2026): lo que el proyecto
// le dice a quien llega (las instrucciones para agentes de IA, como CLAUDE.md o AGENTS.md, y sus documentos de estado,
// como el README o el roadmap) puede haberse quedado atrás del código, o estar repetido en varios archivos que ya no
// dicen lo mismo. Si STL diagnostica sobre esa memoria, arranca desde un punto que ya no es el real. La radiografía lo
// mide sin modelo y sin tokens: cuánto cambió el código después del último cambio de cada archivo de memoria, y qué rutas
// o scripts cita que ya no existen. Con eso, el director lo dice en el diagnóstico y, si está atrasada, ofrece la
// verificación a fondo (la propuesta PROPUESTA_VERIFICAR_MEMORIA, docs/metodo/director/memory-check.md), que gasta más
// uso y es del titular decidirla. Aquí está lo puro, sin disco ni git; lo que lee git está en tools/director/diagnosticar.ts.

/** Del más al día al más atrasado; `sin_memoria`: el proyecto no trae instrucciones para agentes. */
export const NIVELES_MEMORIA = ['al_dia', 'algo_atrasada', 'atrasada', 'muy_atrasada', 'sin_memoria'] as const;
export type NivelMemoria = (typeof NIVELES_MEMORIA)[number];

/** La propuesta que ofrece la verificación a fondo al final del diagnóstico; aceptada, la bandeja nombra su procedimiento. */
export const PROPUESTA_VERIFICAR_MEMORIA = 'p_verificar_memoria';

/** Los niveles con los que el diagnóstico ofrece la verificación. */
export const NIVELES_QUE_OFRECEN_VERIFICAR: readonly NivelMemoria[] = ['algo_atrasada', 'atrasada', 'muy_atrasada'];

/** Lo que es cada archivo de memoria: lo que leen los agentes al llegar, o lo que cuenta el estado del proyecto. */
export type TipoMemoria = 'instrucciones' | 'estado';

/** Cuántos commits se leen hacia atrás, como mucho: en un repositorio enorme, lo de antes se dice «más de». */
export const VENTANA_COMMITS = 5000;
/** Cuántos archivos de memoria se miden, como mucho (un memory-bank o una carpeta de docs pueden traer muchos). */
const MAX_ARCHIVOS_MEMORIA = 25;

const FUERA = /(^|\/)(node_modules|vendor|dist|build|\.stl|\.git)(\/|$)/;

const INSTRUCCIONES: RegExp[] = [
  /(^|\/)CLAUDE(\.local)?\.md$/i,
  /(^|\/)AGENTS\.md$/i,
  /(^|\/)GEMINI\.md$/i,
  /(^|\/)\.cursorrules$/,
  /^\.cursor\/rules\/.+\.mdc?$/,
  /(^|\/)\.windsurfrules$/,
  /(^|\/)\.clinerules(\/.+\.md)?$/,
  /^\.github\/copilot-instructions\.md$/,
  /^\.github\/instructions\/.+\.md$/,
  /^\.kiro\/steering\/.+\.md$/,
  /(^|\/)memory-bank\/.+\.md$/i,
];
/** Los documentos de estado, por su nombre: en la raíz o en una carpeta de documentación. */
const ESTADO = /^(readme|roadmap|todo|plan|plans|planning|status|estado|progress|progreso|changelog|history|historial|context|contexto|architecture|arquitectura|decisions|decisiones|memory|memoria|handoff|pendientes)([-_. ][^/]*)?\.(md|txt)$/i;
const CARPETA_DOCS = /^(docs?|documentation|documentacion|documentación|notes|notas|\.github)\//i;

/** Si un archivo del repositorio es parte de su memoria, y de qué tipo. */
export function tipoDeMemoria(ruta: string): TipoMemoria | null {
  if (FUERA.test(ruta)) return null;
  if (INSTRUCCIONES.some((r) => r.test(ruta))) return 'instrucciones';
  const nombre = ruta.split('/').at(-1) ?? '';
  const enRaiz = !ruta.includes('/');
  if (ESTADO.test(nombre) && (enRaiz || (CARPETA_DOCS.test(ruta) && ruta.split('/').length <= 3))) return 'estado';
  return null;
}

/** Los archivos de memoria del repositorio, en orden: las instrucciones antes, lo de la raíz antes, como mucho MAX_ARCHIVOS_MEMORIA. */
export function archivosDeMemoria(archivos: string[]): { ruta: string; tipo: TipoMemoria }[] {
  const hondo = (r: string) => r.split('/').length;
  return archivos
    .map((ruta) => ({ ruta, tipo: tipoDeMemoria(ruta) }))
    .filter((x): x is { ruta: string; tipo: TipoMemoria } => !!x.tipo)
    .sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === 'instrucciones' ? -1 : 1) || hondo(a.ruta) - hondo(b.ruta) || a.ruta.localeCompare(b.ruta))
    .slice(0, MAX_ARCHIVOS_MEMORIA);
}

const EXTENSION = /\.[a-z0-9]{1,6}$/i;

/**
 * Las rutas que cita un texto de memoria, dentro de `código` o de un enlace (rutas con «/»; un nombre suelto es ambiguo):
 * sin direcciones, rutas absolutas, comodines ni marcadores como <id>, y sin el número de línea o el ancla.
 */
export function rutasCitadas(texto: string): string[] {
  const crudos = [
    ...[...texto.matchAll(/`([^`\n]+)`/g)].flatMap((m) => m[1].split(/\s+/)),
    ...[...texto.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]),
  ];
  const fuera = new Set<string>();
  for (const crudo of crudos) {
    const c = crudo.trim().replace(/^["'(]+|["'),;.]+$/g, '').replace(/^\.\//, '').replace(/[#?].*$/, '').replace(/:\d+(-\d+)?$/, '');
    if (!c.includes('/') || /^[a-z][a-z0-9+.-]*:/i.test(c) || /^[/~.\\]/.test(c) || /[<>*{}$|…\\[\]=@]/.test(c)) continue;
    if (!/^[\w.-]+(\/[\w.-]+)*\/?$/.test(c)) continue;
    fuera.add(c);
  }
  return [...fuera];
}

/** Los scripts de npm, pnpm o yarn que cita un texto (`npm run x`, `pnpm run x`, `yarn run x`). */
export function scriptsCitados(texto: string): string[] {
  return [...new Set([...texto.matchAll(/\b(?:npm|pnpm|yarn) run ([\w:.-]+)/g)].map((m) => m[1]))];
}

/** Un commit, del más nuevo al más viejo, con los archivos que tocó. */
export interface CommitConArchivos {
  sha: string;
  fecha: string;
  archivos: string[];
}

export interface AtrasoDeArchivo {
  ruta: string;
  tipo: TipoMemoria;
  /** Su último cambio en git (ISO); sin él, si no se encontró ni fuera de la ventana. */
  ultimo?: string;
  /** Tiene cambios sin commit ahora: se cuenta como al día con el código. */
  sinCommit?: boolean;
  /** Commits del código (los que tocan algo que no es memoria, dentro de su ámbito) después de su último cambio. */
  commitsDespues: number;
  /** Cuántos archivos del código cambiaron en esos commits. */
  archivosDespues: number;
  /** Su último cambio quedó fuera de la ventana: son más de los contados. */
  masDe?: boolean;
  /** Días entre su último cambio y el último commit del código en su ámbito. */
  dias?: number;
  /** El ámbito: la carpeta de un archivo de instrucciones que no está en la raíz; vacío, todo el repositorio. */
  ambito: string;
  rutasPerdidas: string[];
  scriptsPerdidos: string[];
  nivel: Exclude<NivelMemoria, 'sin_memoria'>;
}

export interface AtrasoDeLaMemoria {
  nivel: NivelMemoria;
  /** El archivo de instrucciones que da el nivel (el más atrasado). */
  principal?: string;
  archivos: AtrasoDeArchivo[];
  /** Instrucciones repetidas en la raíz para distintos agentes y cuánto se separaron (en commits del código). */
  copias?: { rutas: string[]; separados: number; atras: string };
}

export interface DatosDeLaMemoria {
  /** Del más nuevo al más viejo, como mucho VENTANA_COMMITS. */
  commits: CommitConArchivos[];
  /** Si los commits son toda la historia (no se cortó la ventana). */
  historiaCompleta: boolean;
  /** Los archivos que git conoce. */
  archivos: string[];
  /** Si existe una ruta del repositorio (en git o en el disco), relativa a su raíz. */
  existe: (ruta: string) => boolean;
  /** El texto de cada archivo de memoria. */
  textos: Record<string, string>;
  /** Los scripts del package.json de la raíz; null si no hay. */
  scripts: string[] | null;
  /** Los archivos con cambios sin commit. */
  sinCommit: Set<string>;
  /** El último cambio de los archivos que quedaron fuera de la ventana. */
  fechasFuera?: Record<string, string>;
}

const ORDEN: Exclude<NivelMemoria, 'sin_memoria'>[] = ['al_dia', 'algo_atrasada', 'atrasada', 'muy_atrasada'];
const peor = <T extends Exclude<NivelMemoria, 'sin_memoria'>>(a: T, b: T): T => (ORDEN.indexOf(a) >= ORDEN.indexOf(b) ? a : b);

/**
 * El nivel de un archivo: por los commits del código que vinieron después de su último cambio (hasta 5, al día; hasta 30,
 * algo atrasada; hasta 150, atrasada; más, muy atrasada). Lo que cita y ya no existe la deja al menos algo atrasada, no
 * más: puede ser algo planeado que aún no se crea, o una ruta escrita a la manera del proyecto, y eso lo juzga el director.
 */
export function nivelDeArchivo(commitsDespues: number, perdidas: number, masDe = false): Exclude<NivelMemoria, 'sin_memoria'> {
  const porCommits = masDe || commitsDespues > 150 ? 'muy_atrasada' : commitsDespues > 30 ? 'atrasada' : commitsDespues > 5 ? 'algo_atrasada' : 'al_dia';
  const porCitas = perdidas >= 1 ? 'algo_atrasada' : 'al_dia';
  return peor(porCommits, porCitas);
}

const carpetaDe = (ruta: string) => (ruta.includes('/') ? ruta.slice(0, ruta.lastIndexOf('/') + 1) : '');
const diasEntre = (a: string, b: string) => Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000));

/** Lo que mide la radiografía de la memoria del proyecto: cada archivo con su atraso, el nivel y las copias. */
export function medirMemoria(datos: DatosDeLaMemoria): AtrasoDeLaMemoria {
  const memoria = archivosDeMemoria(datos.archivos);
  const esMemoria = new Set(memoria.map((m) => m.ruta));
  const raices = new Set(datos.archivos.map((a) => a.split('/')[0]));
  const medidos: AtrasoDeArchivo[] = memoria.map(({ ruta, tipo }) => {
    // Un CLAUDE.md o un AGENTS.md de una subcarpeta habla de esa carpeta: se compara solo con lo que cambió ahí
    const ambito = tipo === 'instrucciones' && ruta.includes('/') && !/^\.(github|cursor|kiro|clinerules)\//.test(ruta) && !/(^|\/)memory-bank\//i.test(ruta) ? carpetaDe(ruta) : '';
    const delCodigo = (c: CommitConArchivos) => c.archivos.some((a) => !esMemoria.has(a) && !FUERA.test(a) && a.startsWith(ambito));
    const i = datos.commits.findIndex((c) => c.archivos.includes(ruta));
    const sinCommit = datos.sinCommit.has(ruta);
    const despues = sinCommit ? [] : i >= 0 ? datos.commits.slice(0, i) : datos.commits;
    const masDe = !sinCommit && i < 0 && !datos.historiaCompleta;
    const delCodigoDespues = despues.filter(delCodigo);
    const archivosDespues = new Set(delCodigoDespues.flatMap((c) => c.archivos.filter((a) => !esMemoria.has(a) && !FUERA.test(a) && a.startsWith(ambito))));
    const ultimo = i >= 0 ? datos.commits[i].fecha : datos.fechasFuera?.[ruta];
    const ultimoDelCodigo = delCodigoDespues[0]?.fecha;
    // Lo que cita, desde la raíz o desde su carpeta; solo si su primera carpeta existe (así «application/json» no cuenta)
    const texto = datos.textos[ruta] ?? '';
    const desde = carpetaDe(ruta);
    const rutasPerdidas = rutasCitadas(texto).filter((r) => {
      const quitada = r.replace(/\/$/, '');
      const candidatas = [quitada, desde ? `${desde}${quitada}` : ''].filter(Boolean);
      const primera = quitada.split('/')[0];
      if (!raices.has(primera) && !datos.existe(primera) && !(desde && datos.existe(`${desde}${primera}`))) return false;
      return !candidatas.some((c) => datos.existe(c));
    });
    const scriptsPerdidos = datos.scripts ? scriptsCitados(texto).filter((s) => !datos.scripts!.includes(s)) : [];
    return {
      ruta,
      tipo,
      ...(ultimo ? { ultimo } : {}),
      ...(sinCommit ? { sinCommit: true } : {}),
      commitsDespues: delCodigoDespues.length,
      archivosDespues: archivosDespues.size,
      ...(masDe ? { masDe: true } : {}),
      ...(ultimo && ultimoDelCodigo ? { dias: diasEntre(ultimo, ultimoDelCodigo) } : {}),
      ambito,
      rutasPerdidas,
      scriptsPerdidos,
      nivel: nivelDeArchivo(delCodigoDespues.length, rutasPerdidas.length + scriptsPerdidos.length, masDe),
    };
  });
  const instrucciones = medidos.filter((m) => m.tipo === 'instrucciones');
  if (!instrucciones.length) return { nivel: 'sin_memoria', archivos: medidos };
  // El más atrasado: por su nivel, después por los commits que lleva atrás y después por lo que cita y ya no existe
  const peso = (m: AtrasoDeArchivo) => [ORDEN.indexOf(m.nivel), m.commitsDespues, m.rutasPerdidas.length + m.scriptsPerdidos.length];
  const masAtras = (a: AtrasoDeArchivo, b: AtrasoDeArchivo) => { const [x, y] = [peso(a), peso(b)]; const i = x.findIndex((v, k) => v !== y[k]); return i >= 0 && y[i] > x[i]; };
  const principal = instrucciones.reduce((a, b) => (masAtras(a, b) ? b : a));
  // Las mismas instrucciones para distintos agentes, en la raíz: si se separaron, una de las dos ya no dice lo mismo
  const enRaiz = instrucciones.filter((m) => !m.ambito && !/memory-bank\//i.test(m.ruta) && !/^\.(cursor\/rules|github\/instructions|kiro)\//.test(m.ruta));
  let copias: AtrasoDeLaMemoria['copias'];
  if (enRaiz.length >= 2) {
    const porAtraso = [...enRaiz].sort((a, b) => b.commitsDespues - a.commitsDespues);
    copias = { rutas: enRaiz.map((m) => m.ruta), separados: porAtraso[0].commitsDespues - porAtraso.at(-1)!.commitsDespues, atras: porAtraso[0].ruta };
  }
  return { nivel: principal.nivel, principal: principal.ruta, archivos: medidos, ...(copias ? { copias } : {}) };
}

/** La salida de `git log --format=%x1e%H%x1f%cI --name-only`, en commits con sus archivos. */
export function commitsConArchivos(salida: string): CommitConArchivos[] {
  return salida
    .split('\x1e')
    .map((bloque) => bloque.replace(/\r/g, '').split('\n').map((l) => l.trim()).filter(Boolean))
    .filter((l) => l.length)
    .map(([cabeza, ...archivos]) => {
      const [sha, fecha] = cabeza.split('\x1f');
      return { sha, fecha, archivos };
    })
    .filter((c) => c.sha && c.fecha);
}

/** La carpeta donde Claude Code guarda su memoria de un proyecto (~/.claude/projects/<carpeta>/memory), por la ruta del repositorio. */
export const carpetaClaudeDe = (repo: string) => repo.replace(/[^a-zA-Z0-9]/g, '-');
