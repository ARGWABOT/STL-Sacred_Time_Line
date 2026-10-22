// El mapa de cada proyecto (propuesta aceptada «El mapa de cada proyecto, al día», 22 de octubre de 2026). Para
// encontrar algo, el director volvía a explorar el repositorio o leía documentos enteros: sin abrirlos, no sabía qué
// contiene cada archivo, qué dice cada documento ni qué cambió desde la última vez que lo leyó. El mapa se lo dice sin
// base de datos ni vectores: lo calcula el código en cada revisión (la bandeja) y queda en la memoria del proyecto
// (director/mapa.json), con tres cosas:
// - la ficha de cada documento del director: qué cubre cada parte, qué decide, si está sellado o por leer, con qué
//   documentos se conecta y cuál lo reemplazó, tomada del plan y de sus títulos;
// - la instantánea del repositorio: cada archivo con su tamaño, su último cambio y su título o su primera línea, sin el
//   contenido;
// - lo que cambió desde la última revisión, según git: los archivos y las partes (##) de los documentos, para volver a
//   leer solo eso.
// No se escribe dentro de los documentos: uno revisado queda sellado, y un índice viejo engaña más que no tener ninguno.
// Aquí está lo puro, sin disco ni git; lo que lee git y el disco está en tools/director/mapa.ts.
import {
  ABIERTAS,
  claveLeido,
  decisionesDe,
  documentosDeMision,
  documentosEnOrden,
  estadoMision,
  textoPlano,
  trozosDeParte,
  type EstadoDirector,
  type EstadoDocumento,
  type Persona,
  type Plan,
} from './director.ts';

/** Lo que dice el mapa de sí mismo, al comienzo de director/mapa.json. */
export const NOTA_MAPA =
  'El mapa del proyecto: lo calcula tools/director/mapa.ts en cada revisión (la bandeja) y no se edita a mano. Una cosa por línea (un archivo, un cambio, un documento): búscala aquí con Grep antes de explorar el repositorio o de abrir un documento entero.';

/** Un archivo del repositorio en la instantánea: lo que dice qué es, sin su contenido. */
export interface ArchivoMapa {
  /** Relativa al repositorio, con «/». */
  ruta: string;
  bytes: number;
  /** Su último cambio (ISO): su último commit o, si tiene cambios sin commit, la fecha del archivo. */
  cambio: string | null;
  /** Nuevo o cambiado, sin commit todavía. */
  sinCommit?: true;
  /** Su título o su primera línea; los binarios y los enormes no lo tienen: solo su tamaño. */
  titulo?: string;
}

export type EstadoCambio = 'nuevo' | 'cambiado' | 'borrado';

/** Un archivo del repositorio que cambió desde la última revisión. */
export interface CambioArchivo {
  ruta: string;
  estado: EstadoCambio;
  bytes?: number;
  titulo?: string;
  sinCommit?: true;
}

/** Las partes de un documento que cambiaron, por su título ('' es la entrada: lo que va antes del primer `##`). */
export interface CambioPartes {
  nuevas: string[];
  cambiadas: string[];
  quitadas: string[];
}

/** Un documento del director (docs/… de la memoria) que cambió desde la última revisión, parte por parte. */
export interface CambioDocumento extends CambioPartes {
  ruta: string;
  estado: EstadoCambio;
}

export interface CommitMapa {
  hash: string;
  cuando: string;
  asunto: string;
}

/** Lo que cambió desde la última revisión, según git. */
export interface CambiosMapa {
  /** La última revisión (plan.revisado); null si nunca hubo una: todo es nuevo. */
  desde: string | null;
  /** El commit del repositorio con el que se compara: el último de antes de la revisión. */
  base: string | null;
  /** El de la memoria: el commit con el que cerró esa revisión o, sin él, el último de antes. */
  baseMemoria: string | null;
  /** El repositorio no tiene commits de antes de la revisión: todo él es nuevo desde entonces. */
  repositorioNuevo?: true;
  /** La memoria tampoco: todos los documentos del director son nuevos desde entonces. */
  documentosNuevos?: true;
  /** Los commits del repositorio desde entonces. */
  commits: CommitMapa[];
  archivos: CambioArchivo[];
  documentos: CambioDocumento[];
}

/** Lo que cubre una parte de un documento: su título, cuántas ideas se leen en ella, sus subtítulos y lo que pide decidir. */
export interface ParteFicha {
  titulo: string;
  ideas: number;
  subtitulos?: string[];
  decisiones?: string[];
}

/**
 * Dónde está un documento en la lectura del equipo: `sellado` si alguien ya lo revisó (no se toca: lo que cambie va en
 * uno nuevo), `por leer` si alguien lo tiene en una misión abierta, `en espera` si solo lo pide una misión de una fase
 * futura y `sin misión` si ninguna lo pide.
 */
export type LecturaDocumento = 'sellado' | 'por leer' | 'en espera' | 'sin misión';

/** Otro documento relacionado, y por qué. */
export interface Relacion {
  ruta: string;
  por: string;
}

/** Quién tiene un documento en su orden de lectura, en qué misión y cuántas de sus partes ya marcó como leídas. */
export interface LectorDocumento {
  persona: Persona;
  estado: EstadoDocumento;
  mision: string;
  leidas?: number;
}

/** La ficha de un documento del director: lo que hay que saber de él sin abrirlo. */
export interface FichaDocumento {
  ruta: string;
  titulo: string;
  porQue?: string;
  /** Si se encontró el archivo (en la memoria, en el Studio o en el repositorio, si es repo:…). */
  existe: boolean;
  partes: ParteFicha[];
  /** Cuántas decisiones pide, entre todas sus partes. */
  decisiones: number;
  lectura: LecturaDocumento;
  lectores: LectorDocumento[];
  /** Las misiones que lo piden. */
  misiones: string[];
  /** Cuándo quedó sellado: la entrega (o el veredicto) de la primera misión hecha que lo pedía. */
  sellado?: string;
  /** Cuándo nació en la memoria (su primer commit, o la fecha del archivo si aún no tiene). */
  creado?: string;
  conecta: Relacion[];
  /** Los documentos escritos después que lo siguieron, ya sellado: lo nombran al empezar o recogen sus notas. */
  reemplazadoPor: Relacion[];
  /** Los documentos sellados a los que este siguió. */
  reemplaza: Relacion[];
}

export interface Mapa {
  nota: string;
  version: 1;
  generado: string;
  proyecto: string;
  repositorio: { rama: string | null; commit: string | null; archivos: number; bytes: number } | null;
  /** Lo que no se pudo leer o se leyó a medias: el mapa lo dice, nunca se queda callado. */
  avisos: string[];
  cambios: CambiosMapa;
  documentos: FichaDocumento[];
  instantanea: ArchivoMapa[];
}

// ───────────────────────────────────────────── los documentos, parte por parte

/** Una parte de un documento con su texto (con su línea `##`); la entrada es la de título ''. */
export interface ParteConTexto {
  titulo: string;
  md: string;
}

/**
 * Las partes de un documento con su texto, cortadas como las corta el Studio al leerlo (estudio/src/director.ts ›
 * secciones): la entrada y cada `##` fuera de un bloque de código, con su título sin formato (textoPlano). Sus títulos son
 * los de `partesDeDocumento`, los mismos con los que el Studio marca lo leído y nombra cada parte en las notas.
 */
export function partesConTexto(texto: string): ParteConTexto[] {
  const salida: ParteConTexto[] = [{ titulo: '', md: '' }];
  let enCodigo = false;
  for (const linea of texto.split(/\r?\n/)) {
    if (/^```/.test(linea)) enCodigo = !enCodigo;
    const h2 = !enCodigo && /^##\s+(.+)$/.exec(linea);
    if (h2) salida.push({ titulo: textoPlano(h2[1]), md: `${linea}\n` });
    else salida[salida.length - 1].md += `${linea}\n`;
  }
  return salida.filter((s) => s.titulo || s.md.trim());
}

/** El título de un documento: su `#`, como lo muestra el Studio. */
export const tituloDeDocumento = (texto: string): string | undefined => /^#\s+(.+)$/m.exec(texto)?.[1]?.trim() || undefined;

/** Las partes que se nombran de un documento: sus `##` o, si no tiene ninguno, su entrada sola (como en el Studio). */
function partesNombradas(texto: string): ParteConTexto[] {
  const partes = partesConTexto(texto);
  const conTitulo = partes.filter((p) => p.titulo);
  return conTitulo.length ? conTitulo : partes.slice(0, 1);
}

/** Los subtítulos de una parte (`###` y más hondos, fuera de los bloques de código): lo que cubre por dentro. */
function subtitulosDe(md: string): string[] {
  const salida: string[] = [];
  let enCodigo = false;
  for (const linea of md.split('\n')) {
    if (/^ {0,3}(```|~~~)/.test(linea)) enCodigo = !enCodigo;
    const h = !enCodigo && /^ {0,3}#{3,6}\s+(.+?)(?:\s+#+)?\s*$/.exec(linea);
    const titulo = h ? textoPlano(h[1]) : '';
    if (titulo) salida.push(titulo);
  }
  return salida;
}

/** Lo que cubre cada parte de un documento: su título, cuántas ideas se leen en ella, sus subtítulos y sus decisiones. */
export function partesDeFicha(texto: string): ParteFicha[] {
  return partesNombradas(texto).map((p) => {
    const subtitulos = subtitulosDe(p.md);
    const decisiones = decisionesDe(p.titulo, p.md);
    return {
      titulo: p.titulo,
      ideas: trozosDeParte(p.titulo, p.md).filter((t) => t.tipo !== 'rotulo' && !t.decision).length,
      ...(subtitulos.length ? { subtitulos } : {}),
      ...(decisiones.length ? { decisiones } : {}),
    };
  });
}

/**
 * Qué partes de un documento cambiaron entre dos versiones (null: aún no existía, o ya no existe): las nuevas, las que
 * cambiaron y las que salieron, por su título. Un documento nuevo trae todas sus partes como nuevas. Los espacios y los
 * fines de línea no cuentan: con core.autocrlf, git guarda LF y la carpeta tiene CRLF.
 */
export function partesCambiadas(antes: string | null, ahora: string | null): CambioPartes {
  if (antes === null || ahora === null) {
    const titulos = partesNombradas(antes ?? ahora ?? '').map((p) => p.titulo);
    return { nuevas: antes === null ? titulos : [], cambiadas: [], quitadas: antes === null ? [] : titulos };
  }
  // Por título; si dos partes se llaman igual, por su orden entre ellas
  const huellas = (texto: string) => {
    const vistas = new Map<string, number>();
    const salida = new Map<string, { titulo: string; huella: string }>();
    for (const p of partesConTexto(texto)) {
      const n = vistas.get(p.titulo) ?? 0;
      vistas.set(p.titulo, n + 1);
      salida.set(`${p.titulo}\u0000${n}`, { titulo: p.titulo, huella: p.md.replace(/\s+/g, ' ').trim() });
    }
    return salida;
  };
  const a = huellas(antes);
  const b = huellas(ahora);
  const cambio: CambioPartes = { nuevas: [], cambiadas: [], quitadas: [] };
  for (const [clave, p] of b) {
    const x = a.get(clave);
    if (!x) cambio.nuevas.push(p.titulo);
    else if (x.huella !== p.huella) cambio.cambiadas.push(p.titulo);
  }
  for (const [clave, p] of a) if (!b.has(clave)) cambio.quitadas.push(p.titulo);
  return cambio;
}

// ───────────────────────────────────────────── la instantánea: el título de cada archivo

/** Lo que no tiene un título que leer (imágenes, sonido, video, fuentes, comprimidos, documentos de oficina, binarios): solo su tamaño. */
const SIN_TITULO =
  /\.(png|jpe?g|gif|webp|bmp|ico|icns|tiff?|psd|ai|eps|sketch|fig|xcf|heic|avif|svgz?|mp3|wav|ogg|oga|flac|m4a|aac|opus|midi?|mp4|m4v|webm|mov|avi|mkv|wmv|woff2?|ttf|otf|eot|zip|gz|tgz|bz2|xz|zst|7z|rar|tar|jar|war|apk|aab|ipa|exe|msi|dll|so|dylib|bin|o|a|lib|obj|class|pyc|pyo|wasm|node|pdf|docx?|xlsx?|pptx?|odt|ods|odp|epub|mobi|sqlite3?|db|mdb|accdb|parquet|feather|npy|npz|pkl|pickle|h5|hdf5|onnx|pt|pth|ckpt|safetensors|keystore|jks|p12|pfx)$/i;

export const sinTitulo = (ruta: string) => SIN_TITULO.test(ruta);

/** Lo más largo que se guarda de un título o de una primera línea. */
export const MAX_TITULO = 120;

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const limpio = (x: string) => x.replace(/&([a-z]+);/gi, (m, e: string) => ENTIDADES[e.toLowerCase()] ?? m).replace(/\s+/g, ' ').trim();

/**
 * La primera línea que dice algo: sin las marcas de comentario, y saltando lo que no dice qué es el archivo (#!, <?php,
 * <!DOCTYPE, 'use strict', la codificación, o una línea sin letras ni números, como «{» o «---»).
 */
function primeraLinea(texto: string): string | undefined {
  for (const cruda of texto.split(/\r?\n/, 200)) {
    const l = cruda.trim();
    if (!l || /^(#!|<\?(php|xml)\b|<!doctype\b|<html\b|['"]use (strict|client|server)['"]|#.*-\*-.*coding|@echo off\b)/i.test(l)) continue;
    const sin = l.replace(/^(\/\/+|\/\*+|\*+\/?|#+|--+|;+|%+|<!--+|"""|'''|rem\s+)\s*/i, '').replace(/\s*(\*+\/|-->|"""|''')\s*$/, '');
    if (/[\p{L}\p{N}]/u.test(sin)) return limpio(sin);
  }
  return undefined;
}

/**
 * El título de un archivo de texto, o su primera línea con sentido, a partir de su comienzo: lo que dice qué es sin
 * abrirlo. Markdown: su `#` (o el `title` de su encabezado); HTML: su <title> o su <h1>; LaTeX: su \title, \chapter o
 * \section; BibTeX: cuántas referencias trae (para eso se lee entero). Lo demás: su primera línea que dice algo, sin las
 * marcas de comentario (en el código suele ser lo que explica el archivo). Hasta MAX_TITULO caracteres.
 */
export function tituloDeArchivo(ruta: string, texto: string): string | undefined {
  // Sin la marca de orden de bytes (BOM) con la que empiezan algunos archivos
  const t = texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
  const ext = /\.([a-z0-9]+)$/i.exec(ruta)?.[1].toLowerCase() ?? '';
  let titulo: string | undefined;
  if (['md', 'markdown', 'mdx', 'qmd', 'rmd'].includes(ext)) {
    const encabezado = /^---\r?\n([\s\S]*?)\r?\n---/.exec(t)?.[1];
    titulo = (encabezado && /^title:\s*["']?(.+?)["']?\s*$/m.exec(encabezado)?.[1]) || /^ {0,3}#{1,6}[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*\r?$/m.exec(t)?.[1];
    titulo = titulo?.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*`]/g, '');
  } else if (['html', 'htm', 'xhtml'].includes(ext)) {
    titulo = (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(t) ?? /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(t))?.[1].replace(/<[^>]*>/g, '');
  } else if (['tex', 'ltx', 'latex'].includes(ext)) {
    titulo = /\\(?:title|chapter|section)\*?\s*(?:\[[^\]]*\])?\s*\{([^}]*)\}/.exec(t)?.[1];
  } else if (ext === 'bib') {
    const n = (t.match(/^[ \t]*@[a-z]+[ \t]*[{(]/gim) ?? []).filter((x) => !/@(comment|string|preamble)/i.test(x)).length;
    if (n) titulo = `${n} ${n === 1 ? 'referencia' : 'referencias'}`;
  }
  const final = (titulo && limpio(titulo)) || primeraLinea(t);
  if (!final) return undefined;
  return final.length > MAX_TITULO ? `${final.slice(0, MAX_TITULO - 1)}…` : final;
}

// ───────────────────────────────────────────── lo que dice git

/** Una fecha de git (con su zona) en ISO, en UTC: así se comparan entre sí y con plan.revisado. */
const isoDe = (f: string) => {
  const d = new Date(f.trim());
  return Number.isNaN(d.getTime()) ? f.trim() : d.toISOString();
};

/** Una ruta que git escribió entre comillas (con \", \\, \t, \n o bytes en octal), tal como es. */
export function desescapar(ruta: string): string {
  if (ruta.length < 2 || !ruta.startsWith('"') || !ruta.endsWith('"')) return ruta;
  const especiales: Record<string, number> = { a: 7, b: 8, t: 9, n: 10, v: 11, f: 12, r: 13, '"': 34, '\\': 92 };
  const bytes: number[] = [];
  const codificar = new TextEncoder();
  for (const m of ruta.slice(1, -1).matchAll(/\\([0-7]{3})|\\(.)|([^\\]+)/gs)) {
    if (m[1]) bytes.push(parseInt(m[1], 8));
    else if (m[2] !== undefined) bytes.push(especiales[m[2]] ?? m[2].charCodeAt(0));
    else bytes.push(...codificar.encode(m[3]));
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

/**
 * De `git log --format=%x1e%cI --name-only`: la fecha (ISO) del último commit de cada archivo. Se queda con la más
 * nueva de cada uno, porque el orden de git log no siempre es el de las fechas.
 */
export function ultimosCambios(salida: string): Map<string, string> {
  const ultimos = new Map<string, string>();
  let cuando = '';
  for (const cruda of salida.split('\n')) {
    const l = cruda.replace(/\r$/, '');
    if (l.startsWith('\x1e')) {
      cuando = isoDe(l.slice(1));
      continue;
    }
    if (!l.trim() || !cuando) continue;
    const ruta = desescapar(l);
    const antes = ultimos.get(ruta);
    if (!antes || antes < cuando) ultimos.set(ruta, cuando);
  }
  return ultimos;
}

/** De `git diff --name-status -z`: cada ruta con lo que le pasó (A, nuevo; D, borrado; lo demás, cambiado). */
export function cambiosDeGit(salida: string): { ruta: string; estado: EstadoCambio }[] {
  const t = salida.split('\0');
  const salidaLista: { ruta: string; estado: EstadoCambio }[] = [];
  for (let i = 0; i < t.length; ) {
    const letra = t[i].trim()[0];
    if (!letra || i + 1 >= t.length) {
      i++;
      continue;
    }
    // Un renombre o una copia traen dos rutas: la de antes y la de ahora
    if (letra === 'R' || letra === 'C') {
      if (letra === 'R') salidaLista.push({ ruta: t[i + 1], estado: 'borrado' });
      if (t[i + 2]) salidaLista.push({ ruta: t[i + 2], estado: 'nuevo' });
      i += 3;
      continue;
    }
    if (t[i + 1]) salidaLista.push({ ruta: t[i + 1], estado: letra === 'A' ? 'nuevo' : letra === 'D' ? 'borrado' : 'cambiado' });
    i += 2;
  }
  return salidaLista;
}

/**
 * De `git status --porcelain=v1 -z --no-renames --untracked-files=all`: lo que el repositorio tiene sin commit (cambiado,
 * nuevo o borrado), sin lo que git ignora. Después de una revisión que no se cerró, puede ser trabajo suyo a medias.
 */
export function sinCommitDeGit(salida: string): { ruta: string; estado: EstadoCambio }[] {
  return salida
    .split('\0')
    .filter((t) => t.length > 3 && t[2] === ' ' && !t.startsWith('!!'))
    .map((t) => {
      const xy = t.slice(0, 2);
      const estado: EstadoCambio = xy === '??' || xy.includes('A') ? 'nuevo' : xy.includes('D') ? 'borrado' : 'cambiado';
      return { ruta: t.slice(3), estado };
    });
}

/** De `git log --format=%h%x09%cI%x09%s` (o %H): los commits, con su fecha en ISO. */
export function commitsDeGit(salida: string): CommitMapa[] {
  return salida
    .split('\n')
    .map((l) => l.replace(/\r$/, ''))
    .filter((l) => l.trim())
    .map((l) => {
      const [hash, cuando, ...asunto] = l.split('\t');
      return { hash, cuando: isoDe(cuando ?? ''), asunto: asunto.join('\t') };
    });
}

// ───────────────────────────────────────────── las fichas de los documentos

/** Los documentos del director que lleva el mapa: los del plan (`documentos`) y los que piden sus misiones, sin repetir. */
export function documentosDelMapa(plan: Plan): string[] {
  const rutas = [...(plan.documentos ?? []).map((d) => d.ruta), ...(plan.misiones ?? []).flatMap(documentosDeMision)];
  return [...new Set(rutas)].filter((r) => !!r && !r.includes('..'));
}

/** Sin tildes, en minúsculas y con los espacios seguidos en uno: como se comparan los nombres. */
const comoSeCompara = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ');
const escaparRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Si un texto nombra a otro documento: por su ruta o su nombre de archivo («ruta.md»), o por su título exacto (si no es
 * corto). Con `conNombre`, también por su nombre dicho en palabras («desde el diagnóstico» nombra a diagnostico.md),
 * si es de seis letras o más: eso solo se mira al comienzo de un documento, donde dice de dónde viene. `plano`: el texto
 * como se compara, si ya se tiene (un documento se compara con todos los demás).
 */
function nombra(texto: string, otro: { ruta: string; titulo: string }, conNombre = false, plano = comoSeCompara(texto)): boolean {
  const archivo = otro.ruta.replace(/^repo:/, '').split('/').pop() ?? '';
  if (archivo && new RegExp(`(^|[^\\w.-])${escaparRe(archivo)}(?![\\w-])`, 'i').test(texto)) return true;
  const titulo = comoSeCompara(otro.titulo).trim();
  if (titulo.length >= 15 && plano.includes(titulo)) return true;
  if (!conNombre) return false;
  const nombre = comoSeCompara(archivo.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ')).trim();
  return nombre.replace(/ /g, '').length >= 6 && new RegExp(`(^|[^a-z0-9])${escaparRe(nombre)}($|[^a-z0-9])`).test(plano);
}

/** Cuántas líneas con texto del comienzo de un documento dicen de dónde viene (el título, la firma y una más). */
const LINEAS_DEL_COMIENZO = 4;

/** Suma una relación a una lista; si el otro documento ya está, junta las razones. */
function relacionar(lista: Relacion[], ruta: string, por: string) {
  const ya = lista.find((x) => x.ruta === ruta);
  if (!ya) lista.push({ ruta, por });
  else if (!ya.por.split('; ').includes(por)) ya.por += `; ${por}`;
}

/**
 * La ficha de cada documento del director, tomada del plan (sus documentos y sus misiones, quién lo lee y quién ya lo
 * revisó, las notas sobre él y dónde quedaron) y de sus títulos (sus `##`, sus `###` y su «Para decidir»). `textos`: lo que
 * dice cada documento ahora (null si no se encontró); `creados`: cuándo nació cada uno en la memoria. Se conecta con
 * otro si los pide la misma misión, si lo nombra (su ruta, su nombre de archivo o su título exacto) o si sus notas
 * quedaron en él. Y lo reemplazó uno escrito después de sellarlo que lo nombra al empezar («Lo nuevo desde el
 * diagnóstico») o que recoge sus notas: siempre hacia adelante, lo que cambia de un documento revisado va en uno nuevo.
 */
export function fichasDeDocumentos(plan: Plan, estado: EstadoDirector, personas: Persona[], textos: Record<string, string | null>, creados: Record<string, string> = {}): FichaDocumento[] {
  const rutas = documentosDelMapa(plan);
  const enMapa = new Set(rutas);
  const delPlan = new Map((plan.documentos ?? []).map((d) => [d.ruta, d]));
  const misiones = plan.misiones ?? [];
  const ordenes = personas.map((p) => ({ p, orden: documentosEnOrden(plan, estado, p) }));
  const fichas = new Map<string, FichaDocumento>();
  for (const ruta of rutas) {
    const texto = textos[ruta] ?? null;
    const suyas = misiones.filter((m) => documentosDeMision(m).includes(ruta));
    const lectores: LectorDocumento[] = ordenes.flatMap(({ p, orden }) =>
      orden.filter((d) => d.ruta === ruta).map((d) => {
        const leidas = estado.leidos?.[claveLeido(p, ruta)]?.partes.length ?? 0;
        return { persona: p, estado: d.estado, mision: d.mision.id, ...(leidas ? { leidas } : {}) };
      }),
    );
    // Sellado desde la primera misión hecha (entregada o aprobada) que lo pedía, como en selladosQueCambiaron
    const hechas = suyas.filter((m) => {
      const e = estadoMision(m, plan, estado);
      return e !== 'bloqueada' && !ABIERTAS.includes(e);
    });
    const sellado = hechas.map((m) => estado.entregas?.[m.id]?.cuando ?? plan.revisiones?.[m.id]?.cuando ?? '').filter(Boolean).sort()[0];
    const lectura: LecturaDocumento = lectores.some((x) => x.estado === 'revisado') ? 'sellado' : lectores.length ? 'por leer' : suyas.length ? 'en espera' : 'sin misión';
    const partes = texto === null ? [] : partesDeFicha(texto);
    const d = delPlan.get(ruta);
    fichas.set(ruta, {
      ruta,
      titulo: d?.titulo || (texto !== null ? tituloDeDocumento(texto) : undefined) || ruta.split('/').pop() || ruta,
      ...(d?.porQue ? { porQue: d.porQue } : {}),
      existe: texto !== null,
      partes,
      decisiones: partes.reduce((n, p) => n + (p.decisiones?.length ?? 0), 0),
      lectura,
      lectores,
      misiones: suyas.map((m) => m.id),
      ...(sellado ? { sellado } : {}),
      ...(creados[ruta] ? { creado: creados[ruta] } : {}),
      conecta: [],
      reemplazadoPor: [],
      reemplaza: [],
    });
  }
  const ficha = (ruta: string) => fichas.get(ruta)!;
  // Los que se leen en la misma misión
  for (const m of misiones) {
    const ds = documentosDeMision(m).filter((r) => enMapa.has(r));
    for (const a of ds) for (const b of ds) if (a !== b) relacionar(ficha(a).conecta, b, 'en la misma misión');
  }
  // Los que nombra
  for (const a of rutas) {
    const t = textos[a];
    if (!t) continue;
    const plano = comoSeCompara(t);
    for (const b of rutas) {
      if (b === a || !nombra(t, ficha(b), false, plano)) continue;
      relacionar(ficha(a).conecta, b, 'este lo nombra');
      relacionar(ficha(b).conecta, a, 'nombra a este');
    }
  }
  // Dónde quedaron sus notas: una nota sobre un documento que el director llevó a otro
  const recoge = new Map<string, Set<string>>();
  for (const n of estado.notas ?? []) {
    const sobre = n.sobre?.tipo === 'documento' ? n.sobre.id : undefined;
    const destino = plan.respuestas?.[n.id]?.destino?.doc;
    if (!sobre || !destino || sobre === destino || !enMapa.has(sobre) || !enMapa.has(destino)) continue;
    relacionar(ficha(sobre).conecta, destino, 'ahí quedaron sus notas');
    relacionar(ficha(destino).conecta, sobre, 'este recoge sus notas');
    recoge.set(sobre, new Set([...(recoge.get(sobre) ?? []), destino]));
  }
  // Lo que reemplazó a cada documento sellado. «Al empezar» es su título y las líneas que lo siguen antes de la primera
  // parte (quién lo escribe, cuándo y de dónde viene: «Lo nuevo desde el diagnóstico»), no el documento entero
  const comienzos = new Map(rutas.map((r) => {
    const entrada = textos[r] ? (partesConTexto(textos[r]!).find((p) => !p.titulo)?.md ?? '') : '';
    return [r, entrada.split('\n').filter((l) => l.trim()).slice(0, LINEAS_DEL_COMIENZO).join('\n')];
  }));
  for (const viejo of fichas.values()) {
    if (viejo.lectura !== 'sellado') continue;
    for (const nuevo of fichas.values()) {
      if (nuevo === viejo) continue;
      const despues = !viejo.sellado || !nuevo.creado || nuevo.creado > viejo.sellado;
      const comienzo = comienzos.get(nuevo.ruta) ?? '';
      const razones = [
        ...(despues && comienzo && nombra(comienzo, viejo, true) ? ['lo nombra al empezar'] : []),
        ...(recoge.get(viejo.ruta)?.has(nuevo.ruta) ? ['recoge sus notas'] : []),
      ];
      for (const por of razones) {
        relacionar(viejo.reemplazadoPor, nuevo.ruta, por);
        relacionar(nuevo.reemplaza, viejo.ruta, por);
      }
    }
  }
  // Lo que ya dice el reemplazo no se repite entre las conexiones
  for (const f of fichas.values()) {
    const ya = new Set([...f.reemplazadoPor, ...f.reemplaza].map((x) => x.ruta));
    f.conecta = f.conecta.filter((x) => !ya.has(x.ruta));
  }
  return rutas.map(ficha);
}

// ───────────────────────────────────────────── lo que imprime la bandeja

/** Cuántos archivos cambiados, documentos cambiados y fichas imprime la bandeja: el resto está en director/mapa.json, y lo dice. */
export const MAX_CAMBIOS = 25;
export const MAX_DOCUMENTOS_CAMBIADOS = 15;
export const MAX_FICHAS = 30;

export const tamano = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** Un documento por su nombre corto (sin docs/director/, donde están casi todos). */
const corto = (ruta: string) => ruta.replace(/^docs\/director\//, '');
const parte = (titulo: string) => (titulo ? `«${titulo}»` : '«la entrada»');
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Un archivo de la instantánea en una línea. */
export function lineaDeArchivo(a: ArchivoMapa): string {
  return [a.ruta, tamano(a.bytes), a.cambio ? a.cambio.slice(0, 10) : '', a.sinCommit ? 'sin commit' : '', a.titulo ? `«${a.titulo}»` : ''].filter(Boolean).join(' · ');
}

/** Un documento que cambió, en una línea: qué partes son nuevas, cuáles cambiaron y cuáles salieron. */
function lineaDeCambio(d: CambioDocumento): string {
  const lista = (titulos: string[]) => titulos.map(parte).join(', ');
  const partes =
    d.estado === 'borrado' ? []
    : d.estado === 'nuevo' ? (d.nuevas.length ? [`sus partes: ${lista(d.nuevas)}`] : [])
    : [d.nuevas.length ? `nuevas: ${lista(d.nuevas)}` : '', d.cambiadas.length ? `cambiadas: ${lista(d.cambiadas)}` : '', d.quitadas.length ? `quitadas: ${lista(d.quitadas)}` : ''].filter(Boolean);
  if (d.estado === 'cambiado' && !partes.length) partes.push('sus partes dicen lo mismo (solo cambió la forma)');
  return [`documento ${d.estado}`, d.ruta, ...partes].join(' · ');
}

/** La ficha de un documento en una línea. */
export function lineaDeFicha(f: FichaDocumento): string {
  const sellado = f.lectores.filter((x) => x.estado === 'revisado');
  const porLeer = f.lectores.filter((x) => x.estado !== 'revisado');
  const lectura = [
    sellado.length ? `sellado (lo revisó ${sellado.map((x) => x.persona).join(', ')}${f.sellado ? ` el ${f.sellado.slice(0, 10)}` : ''})` : '',
    porLeer.length ? `por leer: ${porLeer.map((x) => `${x.persona}${x.estado === 'siguiente' ? ' (el que sigue)' : ''}${x.leidas ? `, ${x.leidas} de ${f.partes.length} partes leídas` : ''}`).join('; ')}` : '',
  ].filter(Boolean);
  if (!lectura.length) lectura.push(f.lectura === 'en espera' ? 'lo pide una misión de una fase futura' : 'sin misión que lo pida');
  const partes =
    !f.existe ? 'no se encontró el archivo'
    : !f.partes.length ? 'vacío'
    : f.partes.length === 1 && !f.partes[0].titulo ? `sin partes (##)${f.decisiones ? `, ${plural(f.decisiones, 'decisión', 'decisiones')}` : ''}`
    : `${plural(f.partes.length, 'parte', 'partes')}: ${f.partes.map((p) => `${parte(p.titulo)}${p.decisiones?.length ? ` (${p.decisiones.length} por decidir)` : ''}`).join(', ')}`;
  const rel = (xs: Relacion[]) => xs.map((x) => `${corto(x.ruta)} (${x.por})`).join(', ');
  return [
    `${f.ruta} «${f.titulo}»`,
    ...lectura,
    partes,
    f.conecta.length ? `se conecta con: ${rel(f.conecta)}` : '',
    f.reemplazadoPor.length ? `lo reemplazó: ${rel(f.reemplazadoPor)}` : '',
    f.reemplaza.length ? `reemplaza a: ${rel(f.reemplaza)}` : '',
  ].filter(Boolean).join(' · ');
}

/** El orden de las fichas en la bandeja: primero lo que alguien lee ahora, al final lo sellado (en el orden del plan). */
const ORDEN_LECTURA: Record<LecturaDocumento, number> = { 'por leer': 0, 'en espera': 1, 'sin misión': 2, sellado: 3 };
const primeroLoQueSigue = (f: FichaDocumento) => (f.lectores.some((x) => x.estado === 'siguiente') ? -1 : ORDEN_LECTURA[f.lectura]);

export interface OpcionesLineas {
  /** Dónde está el mapa entero, para decirlo cuando una lista no cabe. */
  archivo?: string;
  /** Todo, sin topes y con la instantánea archivo por archivo: lo que imprime `node tools/director/mapa.ts`. */
  entero?: boolean;
}

/**
 * El mapa en líneas cortas, una por cosa: lo que cambió desde la última revisión (cada archivo con su estado, su tamaño
 * y su título; cada documento del director con sus partes nuevas o cambiadas) y la ficha de cada documento. Sin topes
 * silenciosos: si una lista es larga, van las primeras y una línea dice cuántas más hay y dónde están.
 */
export function lineasDelMapa(mapa: Mapa, { archivo = 'director/mapa.json', entero = false }: OpcionesLineas = {}): string[] {
  const l: string[] = [];
  const c = mapa.cambios;
  const tope = (n: number) => (entero ? Infinity : n);
  const resto = (total: number, n: number, donde: string) => {
    if (total > n) l.push(`  - … y ${total - n} más, en ${archivo} (${donde}).`);
  };
  l.push(`Para encontrar algo, empieza por aquí y por ${archivo}, antes de explorar el repositorio o de abrir un documento entero: una cosa por línea (un archivo, un cambio, un documento), para buscarla con Grep.`);
  const r = mapa.repositorio;
  if (r) l.push(`- El repositorio${r.rama ? ` (rama ${r.rama}${r.commit ? `, ${r.commit}` : ''})` : ''}: ${plural(r.archivos, 'archivo', 'archivos')}, ${tamano(r.bytes)}, cada uno con su tamaño, su último cambio y su título o su primera línea (\`instantanea\`).`);
  if (entero) for (const a of mapa.instantanea) l.push(`  - ${lineaDeArchivo(a)}`);
  if (!c.desde) {
    l.push(`- No hay revisión anterior: todo es nuevo para el director (${plural(mapa.instantanea.length, 'archivo', 'archivos')} del repositorio y ${plural(mapa.documentos.length, 'documento', 'documentos')} del plan).`);
  } else {
    const deRepo = !r ? '' : c.repositorioNuevo ? `todo el repositorio es nuevo (${plural(mapa.instantanea.length, 'archivo', 'archivos')}); ` : `${plural(c.commits.length, 'commit', 'commits')} y ${plural(c.archivos.length, 'archivo cambiado', 'archivos cambiados')} en el repositorio; `;
    const deDocs = c.documentosNuevos ? 'todos los documentos del director son nuevos' : plural(c.documentos.length, 'documento del director cambiado', 'documentos del director cambiados');
    const hay = c.archivos.length + c.documentos.length > 0;
    l.push(`- Desde la última revisión (${c.desde.slice(0, 16).replace('T', ' ')} UTC): ${deRepo}${deDocs}.${hay ? ' Vuelve a leer solo eso:' : ''}`);
    for (const a of c.archivos.slice(0, tope(MAX_CAMBIOS))) {
      l.push(`  - ${[`${a.estado}${a.sinCommit ? ', sin commit' : ''}`, a.ruta, a.bytes !== undefined && a.estado !== 'borrado' ? tamano(a.bytes) : '', a.titulo ? `«${a.titulo}»` : ''].filter(Boolean).join(' · ')}`);
    }
    resto(c.archivos.length, tope(MAX_CAMBIOS), 'cambios.archivos');
    for (const d of c.documentos.slice(0, tope(MAX_DOCUMENTOS_CAMBIADOS))) l.push(`  - ${lineaDeCambio(d)}`);
    resto(c.documentos.length, tope(MAX_DOCUMENTOS_CAMBIADOS), 'cambios.documentos');
  }
  if (!mapa.documentos.length) l.push('- El plan aún no nombra documentos del director.');
  else {
    l.push(`- Los documentos del director (${mapa.documentos.length}), una ficha por línea: si está sellado o por leer, sus partes (con lo que piden decidir), con qué se conecta y qué lo reemplazó.`);
    const orden = mapa.documentos.map((f, i) => ({ f, i })).sort((a, b) => primeroLoQueSigue(a.f) - primeroLoQueSigue(b.f) || a.i - b.i).map(({ f }) => f);
    for (const f of orden.slice(0, tope(MAX_FICHAS))) l.push(`  - ${lineaDeFicha(f)}`);
    resto(orden.length, tope(MAX_FICHAS), 'documentos');
  }
  for (const a of mapa.avisos) l.push(`- ⚠ ${a}`);
  return l;
}

/**
 * El mapa como queda en la memoria (director/mapa.json): JSON válido con una cosa por línea (un archivo, un cambio, un
 * commit, un documento), para buscar en él con Grep y leer solo lo que hace falta, sin abrirlo entero.
 */
export function mapaComoTexto(mapa: Mapa): string {
  const j = (x: unknown) => JSON.stringify(x);
  const lista = (xs: unknown[], sangria: string) => (xs.length ? `[\n${xs.map((x) => `${sangria}  ${j(x)}`).join(',\n')}\n${sangria}]` : '[]');
  const { commits, archivos, documentos, ...resto } = mapa.cambios;
  const cambios = [
    ...Object.entries(resto).filter(([, v]) => v !== undefined).map(([k, v]) => `    ${j(k)}: ${j(v)}`),
    `    "commits": ${lista(commits, '    ')}`,
    `    "archivos": ${lista(archivos, '    ')}`,
    `    "documentos": ${lista(documentos, '    ')}`,
  ];
  return `${[
    '{',
    `  "nota": ${j(mapa.nota)},`,
    `  "version": ${j(mapa.version)},`,
    `  "generado": ${j(mapa.generado)},`,
    `  "proyecto": ${j(mapa.proyecto)},`,
    `  "repositorio": ${j(mapa.repositorio)},`,
    `  "avisos": ${lista(mapa.avisos, '  ')},`,
    `  "cambios": {\n${cambios.join(',\n')}\n  },`,
    `  "documentos": ${lista(mapa.documentos, '  ')},`,
    `  "instantanea": ${lista(mapa.instantanea, '  ')}`,
    '}',
  ].join('\n')}\n`;
}
