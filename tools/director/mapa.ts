// El mapa del proyecto (propuesta aceptada «El mapa de cada proyecto, al día»): lo que lee de git y del disco para que
// src/director/mapa.ts lo arme. Solo lee el repositorio y la memoria del proyecto; lo único que escribe es el mapa mismo,
// y solo cuando lo pide la bandeja (guardarMapa, en la memoria: director/mapa.json) o --guardar. Una orden de git por
// cosa, nunca una por archivo: el último cambio de todos los archivos sale de un solo git log. De cada archivo se lee
// solo su comienzo, para su título o su primera línea; de los binarios y los enormes, solo su tamaño.
// Uso: node tools/director/mapa.ts                      → el mapa entero del proyecto activo, en líneas (no escribe nada)
//      node tools/director/mapa.ts --proyecto <id>      → el de otro proyecto
//      node tools/director/mapa.ts --json               → tal como queda en la memoria (director/mapa.json)
//      node tools/director/mapa.ts --guardar <carpeta>  → además lo guarda en <carpeta>/mapa.json, para probarlo aparte
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { EstadoDirector, Persona, Plan } from '../../src/director/director.ts';
import {
  cambiosDeGit,
  commitsDeGit,
  documentosDelMapa,
  fichasDeDocumentos,
  indiceDelPlan,
  lineasDelMapa,
  mapaComoTexto,
  NOTA_MAPA,
  partesCambiadas,
  sinTitulo,
  tituloDeArchivo,
  ultimosCambios,
  type ArchivoMapa,
  type CambioArchivo,
  type CambioDocumento,
  type CambiosMapa,
  type EstadoCambio,
  type Mapa,
} from '../../src/director/mapa.ts';
import { enDisco, escribirDeUnaVez, memoriaDe, rutasDe } from '../../src/director/proyectos.ts';
import { gitEn } from '../../src/director/repositorio.ts';
import { argumentos, leerProyecto, proyectoElegido, raiz, type Todo } from './comun.ts';

/** De cada archivo se lee su comienzo, para su título o su primera línea. */
const COMIENZO = 4096;
/** Más grande que esto, un archivo va solo con su tamaño. */
const ENORME = 2 * 1024 * 1024;
/** Los que se leen enteros para su título (si no son enormes): una bibliografía, para contar sus referencias. */
const ENTERO = /\.bib$/i;
/**
 * Cuántos archivos lleva la instantánea (y lo que cambió), y cuántos de ellos nuevos que git no sigue ni ignora: un
 * repositorio sin .gitignore (con node_modules adentro) no debe volver enorme un mapa que se guarda en cada revisión.
 * Lo que pase de ahí, el mapa lo dice en sus avisos.
 */
const MAX_ARCHIVOS = 20_000;
const MAX_SIN_SEGUIR = 2_000;
/** Cuánto después de cerrar la revisión (--listo) puede llegar su commit en la memoria: el que la bandeja da al final. */
const CIERRE_MS = 30 * 60_000;

/** Una fecha como la entiende git sin dudas en --since y --before: con sus segundos y su zona (UTC). */
const fechaGit = (iso: string) => `${new Date(iso).toISOString().slice(0, 19).replace('T', ' ')} +0000`;
const enOrden = <T extends { ruta: string }>(a: T, b: T) => (a.ruta < b.ruta ? -1 : a.ruta > b.ruta ? 1 : 0);
const enCarpeta = (carpeta: string, ruta: string) => join(carpeta, ...ruta.split('/'));

/** Los nombres de una orden de git con -z; si falla, ninguno. */
async function nombres(cwd: string, args: string[]): Promise<string[]> {
  const r = await gitEn(cwd, args, 120_000);
  return r.ok ? r.out.split('\0').filter(Boolean) : [];
}

/** Los archivos nuevos que git no sigue ni ignora: los primeros MAX_SIN_SEGUIR, por su ruta, y cuántos son. */
async function sinSeguir(repo: string): Promise<{ rutas: string[]; total: number }> {
  const todos = (await nombres(repo, ['ls-files', '-z', '--others', '--exclude-standard'])).sort();
  return { rutas: todos.slice(0, MAX_SIN_SEGUIR), total: todos.length };
}

/** El comienzo de un archivo como texto (o entero, si se pide); null si es binario o no se puede leer. */
function comienzoDe(archivo: string, bytes: number, entero: boolean): string | null {
  const n = entero ? bytes : Math.min(bytes, COMIENZO);
  const b = Buffer.alloc(n);
  let fd: number | null = null;
  try {
    fd = openSync(archivo, 'r');
    const leido = b.subarray(0, readSync(fd, b, 0, n, 0));
    return leido.includes(0) ? null : leido.toString('utf8');
  } catch {
    return null;
  } finally {
    if (fd !== null) closeSync(fd);
  }
}

/** Un archivo de texto entero; null si no está o no se puede leer. */
function leerTexto(archivo: string): string | null {
  try {
    return readFileSync(archivo, 'utf8');
  } catch {
    return null;
  }
}

/**
 * La instantánea del repositorio: cada archivo (los que sigue git y los nuevos que no se ignoran), con su tamaño, su
 * último cambio y su título o su primera línea, sin el contenido. Lo que no tiene commit lleva la fecha del archivo.
 */
export async function instantanea(repo: string, avisos: string[]): Promise<ArchivoMapa[]> {
  const [seguidos, sueltos, tocados, log] = await Promise.all([
    nombres(repo, ['ls-files', '-z']),
    sinSeguir(repo),
    nombres(repo, ['diff', '--name-only', '-z', 'HEAD']),
    gitEn(repo, ['log', '--no-renames', '--format=%x1e%cI', '--name-only'], 180_000),
  ]);
  const ultimos = log.ok ? ultimosCambios(log.out) : new Map<string, string>();
  if (!log.ok && seguidos.length) avisos.push('No se pudo leer de git el último cambio de cada archivo (git log falló o tardó demasiado): la instantánea va sin esa fecha, salvo en lo que no tiene commit.');
  if (sueltos.total > sueltos.rutas.length) avisos.push(`Hay ${sueltos.total.toLocaleString('es-CO')} archivos nuevos que git no sigue ni ignora (¿falta algo en el .gitignore?): el mapa trae solo los primeros ${MAX_SIN_SEGUIR.toLocaleString('es-CO')}, por su ruta.`);
  const sinCommit = new Set([...sueltos.rutas, ...tocados]);
  const rutas = [...new Set([...seguidos, ...sueltos.rutas])].sort();
  if (rutas.length > MAX_ARCHIVOS) avisos.push(`El repositorio tiene ${rutas.length.toLocaleString('es-CO')} archivos: la instantánea trae los primeros ${MAX_ARCHIVOS.toLocaleString('es-CO')}, por su ruta; los demás no están en el mapa.`);
  const archivos: ArchivoMapa[] = [];
  for (const ruta of rutas.slice(0, MAX_ARCHIVOS)) {
    const archivo = enCarpeta(repo, ruta);
    let st;
    try {
      st = statSync(archivo);
    } catch {
      continue; // borrado en la carpeta: sale entre lo que cambió
    }
    if (!st.isFile()) continue;
    const nuevo = sinCommit.has(ruta);
    const a: ArchivoMapa = { ruta, bytes: st.size, cambio: nuevo ? st.mtime.toISOString() : (ultimos.get(ruta) ?? null), ...(nuevo ? { sinCommit: true as const } : {}) };
    if (st.size > 0 && st.size <= ENORME && !sinTitulo(ruta)) {
      const texto = comienzoDe(archivo, st.size, ENTERO.test(ruta));
      const titulo = texto === null ? undefined : tituloDeArchivo(ruta, texto);
      if (titulo) a.titulo = titulo;
    }
    archivos.push(a);
  }
  return archivos;
}

/**
 * Lo que cambió en el repositorio desde la última revisión: contra su último commit de antes de ella, con lo que aún no
 * tiene commit (cambiado, o nuevo si apareció después). Sin commits de antes, todo el repositorio es nuevo.
 */
async function cambiosDelRepositorio(repo: string, desde: string, archivos: ArchivoMapa[], avisos: string[] = []): Promise<Pick<CambiosMapa, 'base' | 'commits' | 'archivos' | 'repositorioNuevo'>> {
  const base = (await gitEn(repo, ['rev-list', '-1', `--before=${fechaGit(desde)}`, 'HEAD'])).out.trim() || null;
  if (!base) return { base: null, commits: [], archivos: [], repositorioNuevo: true };
  const [diff, log, sueltos] = await Promise.all([
    gitEn(repo, ['diff', '--name-status', '--no-renames', '-z', base], 120_000),
    gitEn(repo, ['log', '--format=%h%x09%cI%x09%s', `${base}..HEAD`], 120_000),
    sinSeguir(repo),
  ]);
  if (!diff.ok) throw new Error(`git diff no pudo comparar el repositorio con ${base.slice(0, 7)}: ${diff.err.trim().split('\n')[0]}`);
  const porRuta = new Map(archivos.map((a) => [a.ruta, a]));
  const con = (ruta: string, estado: EstadoCambio): CambioArchivo => {
    const a = estado === 'borrado' ? undefined : porRuta.get(ruta);
    return { ruta, estado, ...(a ? { bytes: a.bytes, ...(a.titulo ? { titulo: a.titulo } : {}), ...(a.sinCommit ? { sinCommit: true as const } : {}) } : {}) };
  };
  const cambios = new Map(cambiosDeGit(diff.out).map(({ ruta, estado }) => [ruta, con(ruta, estado)]));
  // Lo nuevo que git todavía no sigue (y no se ignora): nuevo si apareció después de la revisión
  for (const ruta of sueltos.rutas) {
    const cambio = porRuta.get(ruta)?.cambio;
    if (!cambios.has(ruta) && cambio && cambio > desde) cambios.set(ruta, con(ruta, 'nuevo'));
  }
  const lista = [...cambios.values()].sort(enOrden);
  if (lista.length > MAX_ARCHIVOS) avisos.push(`Cambiaron ${lista.length.toLocaleString('es-CO')} archivos desde la última revisión: el mapa trae los primeros ${MAX_ARCHIVOS.toLocaleString('es-CO')}, por su ruta (git diff --name-status ${base.slice(0, 7)} da todos).`);
  return { base, commits: commitsDeGit(log.out), archivos: lista.slice(0, MAX_ARCHIVOS) };
}

/**
 * Lo que cambió en los documentos del director (docs/ de la memoria) desde la última revisión, parte por parte. Se
 * compara con la memoria como quedó al cerrar esa revisión: su commit de cierre («Director (…)», el que la bandeja da al
 * final, minutos después de --listo) o, sin él, su último commit de antes. Así lo que escribió esa revisión no vuelve
 * como nuevo. Sin commits de antes, todos los documentos son nuevos.
 */
async function cambiosDeLaMemoria(memoria: string, desde: string): Promise<Pick<CambiosMapa, 'baseMemoria' | 'documentos' | 'documentosNuevos'>> {
  const despues = commitsDeGit((await gitEn(memoria, ['log', '--reverse', `--since=${fechaGit(desde)}`, '--format=%H%x09%cI%x09%s'])).out);
  const cierre = despues.find((c) => /^Director \(/.test(c.asunto) && Date.parse(c.cuando) - Date.parse(desde) <= CIERRE_MS);
  const base = cierre?.hash ?? ((await gitEn(memoria, ['rev-list', '-1', `--before=${fechaGit(desde)}`, 'HEAD'])).out.trim() || null);
  if (!base) return { baseMemoria: null, documentos: [], documentosNuevos: true };
  const [diff, sueltos] = await Promise.all([
    gitEn(memoria, ['diff', '--name-status', '--no-renames', '-z', base, '--', 'docs'], 60_000),
    nombres(memoria, ['ls-files', '-z', '--others', '--exclude-standard', '--', 'docs']),
  ]);
  if (!diff.ok) throw new Error(`git diff no pudo comparar los documentos con ${base.slice(0, 7)}: ${diff.err.trim().split('\n')[0]}`);
  const cambios = cambiosDeGit(diff.out);
  for (const ruta of sueltos) {
    let nuevo = false;
    try {
      nuevo = statSync(enCarpeta(memoria, ruta)).mtime.toISOString() > desde;
    } catch {
      // ya no está
    }
    if (nuevo && !cambios.some((x) => x.ruta === ruta)) cambios.push({ ruta, estado: 'nuevo' });
  }
  const documentos: CambioDocumento[] = [];
  for (const { ruta, estado } of cambios.sort(enOrden)) {
    // Lo que no es Markdown (un boceto, una imagen) no tiene partes: va solo con lo que le pasó
    if (!/\.md$/i.test(ruta)) {
      documentos.push({ ruta, estado, nuevas: [], cambiadas: [], quitadas: [] });
      continue;
    }
    const antes = estado === 'nuevo' ? null : await gitEn(memoria, ['show', `${base}:${ruta}`]).then((r) => (r.ok ? r.out : null));
    const ahora = estado === 'borrado' ? null : leerTexto(enCarpeta(memoria, ruta));
    documentos.push({ ruta, estado, ...partesCambiadas(antes, ahora) });
  }
  return { baseMemoria: base, documentos };
}

/** Cuándo nació cada documento en la memoria (docs/…): el commit que lo agregó (el último, si se borró y volvió). */
async function creadosEnLaMemoria(memoria: string): Promise<Record<string, string>> {
  const r = await gitEn(memoria, ['log', '--diff-filter=A', '--no-renames', '--format=%x1e%cI', '--name-only', '--', 'docs'], 60_000);
  return r.ok ? Object.fromEntries(ultimosCambios(r.out)) : {};
}

export interface EntradaMapa {
  proyecto: string;
  /** La carpeta del repositorio del proyecto, si está conectado en este computador. */
  repo: string | null;
  /** Su memoria (<repositorio>/.stl, rama stl). */
  memoria: string | null;
  /** La carpeta del Studio: los documentos docs/… que no están en la memoria (el método) se leen de ahí. */
  studio?: string | null;
  plan: Plan;
  estado: EstadoDirector;
  personas: Persona[];
}

/** Dónde está un documento del plan: docs/… en la memoria (o, si no está ahí, en el Studio) y repo:… en el repositorio. */
function archivoDelDocumento(ruta: string, e: EntradaMapa): { archivo: string; enMemoria: boolean } | null {
  if (ruta.startsWith('repo:')) return e.repo ? { archivo: enCarpeta(e.repo, ruta.slice(5)), enMemoria: false } : null;
  if (e.memoria && existsSync(enCarpeta(e.memoria, ruta))) return { archivo: enCarpeta(e.memoria, ruta), enMemoria: true };
  if (e.studio && existsSync(enCarpeta(e.studio, ruta))) return { archivo: enCarpeta(e.studio, ruta), enMemoria: false };
  return null;
}

/**
 * El mapa de un proyecto: la instantánea de su repositorio, lo que cambió desde la última revisión (plan.revisado; sin
 * ella, todo es nuevo) y la ficha de cada documento del plan. Lo que no se puede leer va en sus avisos: el mapa nunca
 * falla entero por una parte.
 */
export async function calcularMapa(e: EntradaMapa): Promise<Mapa> {
  const avisos: string[] = [];
  const desde = e.plan.revisado || null;
  const esGit = (carpeta: string | null): carpeta is string => !!carpeta && existsSync(join(carpeta, '.git'));
  const cambios: CambiosMapa = { desde, base: null, baseMemoria: null, commits: [], archivos: [], documentos: [] };
  let archivos: ArchivoMapa[] = [];
  let repositorio: Mapa['repositorio'] = null;
  if (esGit(e.repo)) {
    try {
      archivos = await instantanea(e.repo, avisos);
      const [rama, cabeza] = await Promise.all([gitEn(e.repo, ['symbolic-ref', '-q', '--short', 'HEAD']), gitEn(e.repo, ['rev-parse', '--short', 'HEAD'])]);
      repositorio = { rama: rama.out.trim() || null, commit: cabeza.ok ? cabeza.out.trim() || null : null, archivos: archivos.length, bytes: archivos.reduce((n, a) => n + a.bytes, 0) };
      if (desde) Object.assign(cambios, await cambiosDelRepositorio(e.repo, desde, archivos, avisos));
    } catch (error) {
      avisos.push(`No se pudo leer todo el repositorio: ${(error as Error).message}`);
    }
  } else {
    avisos.push(e.repo ? `${e.repo} no es un repositorio de git: el mapa va sin su instantánea ni lo que cambió en él.` : 'El repositorio no está conectado en este computador: el mapa va sin su instantánea ni lo que cambió en él.');
  }
  let creados: Record<string, string> = {};
  if (esGit(e.memoria)) {
    try {
      if (desde) Object.assign(cambios, await cambiosDeLaMemoria(e.memoria, desde));
      creados = await creadosEnLaMemoria(e.memoria);
    } catch (error) {
      avisos.push(`No se pudo leer lo que cambió en los documentos del director: ${(error as Error).message}`);
    }
  } else {
    avisos.push('La memoria del proyecto no está en este computador (o no es de git): el mapa va sin lo que cambió en los documentos del director.');
  }
  const textos: Record<string, string | null> = {};
  for (const ruta of documentosDelMapa(e.plan)) {
    const d = archivoDelDocumento(ruta, e);
    textos[ruta] = d ? leerTexto(d.archivo) : null;
    // Un documento nuevo sin commit nació cuando se escribió
    if (d?.enMemoria && textos[ruta] !== null && !creados[ruta]) {
      try {
        creados[ruta] = statSync(d.archivo).mtime.toISOString();
      } catch {
        // se borró en este instante: va sin fecha
      }
    }
  }
  return {
    nota: NOTA_MAPA,
    version: 1,
    generado: new Date().toISOString(),
    proyecto: e.proyecto,
    repositorio,
    avisos,
    cambios,
    documentos: fichasDeDocumentos(e.plan, e.estado, e.personas, textos, creados),
    plan: indiceDelPlan(e.plan, e.estado),
    instantanea: archivos,
  };
}

/** El mapa de un proyecto ya leído (comun.ts › leerProyecto): su repositorio, su memoria y el Studio, para el método. */
export function mapaDe(t: Pick<Todo, 'id' | 'plan' | 'estado' | 'personas' | 'repo'>): Promise<Mapa> {
  return calcularMapa({ proyecto: t.id, repo: t.repo?.ruta ?? null, memoria: memoriaDe(raiz, t.id), studio: raiz, plan: t.plan, estado: t.estado, personas: t.personas });
}

/** Dónde queda el mapa de un proyecto (ruta del Studio): en su memoria, director/mapa.json. */
export const rutaDelMapa = (id: string) => `${rutasDe(id).base}/director/mapa.json`;

/** Guarda el mapa en la memoria del proyecto, de una vez (lo lee el director mientras tanto). Devuelve dónde quedó. */
export async function guardarMapa(id: string, mapa: Mapa): Promise<string> {
  const memoria = memoriaDe(raiz, id);
  // Sin su memoria, la ruta caería en la carpeta del Studio: ahí no se escribe nada de un proyecto
  if (!memoria || !existsSync(memoria)) throw new Error('la memoria del proyecto no está en este computador, así que el mapa no se guardó');
  const archivo = enDisco(raiz, rutaDelMapa(id));
  mkdirSync(dirname(archivo), { recursive: true });
  await escribirDeUnaVez(archivo, mapaComoTexto(mapa));
  return archivo;
}

// Corrido solo: el mapa entero, sin escribir nada en la memoria
if (import.meta.main) {
  const { args, pedido } = argumentos();
  const t = await leerProyecto(await proyectoElegido(pedido));
  const mapa = await mapaDe(t);
  const i = args.indexOf('--guardar');
  if (i >= 0) {
    const carpeta = args[i + 1];
    if (!carpeta) {
      console.error('Falta la carpeta: --guardar <carpeta>.');
      process.exit(1);
    }
    mkdirSync(carpeta, { recursive: true });
    writeFileSync(join(carpeta, 'mapa.json'), mapaComoTexto(mapa), 'utf-8');
    console.error(`Guardado en ${join(carpeta, 'mapa.json')}.`);
  }
  console.log(args.includes('--json') ? mapaComoTexto(mapa) : lineasDelMapa(mapa, { entero: true }).join('\n'));
  const c = mapa.cambios;
  console.error(`Mapa de «${t.id}»: ${mapa.instantanea.length} archivos en la instantánea; desde la última revisión (${c.desde ?? 'ninguna'}), ${c.commits.length} commits, ${c.archivos.length} archivos y ${c.documentos.length} documentos cambiados; ${mapa.documentos.length} fichas de documentos.`);
}
