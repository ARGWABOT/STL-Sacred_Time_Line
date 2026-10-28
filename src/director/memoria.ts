// La memoria de un proyecto, leída en un solo lugar. Antes la leían dos: las herramientas del director
// (tools/director/comun.ts) y el servidor del Studio (estudio/servidor/director.ts), cada una con su copia, y cada cambio
// había que hacerlo en las dos (propuesta «Pruebas donde fallaron los procesos que escriben», punto 2). Ahora ambas
// piden aquí: dónde está el plan (unido con su archivo), el proyecto y el estado de cada persona del equipo, y de dónde se
// lee lo más nuevo (src/director/fresco.ts). No escribe nada: `director/plan.json`, `director/archivo.json` (de antes) y
// `director/archivo/AAAA-MM.json`, `proyecto.json` y `director/equipo/<persona>.json`, en `proyectos/<id>/…` (proyectos.ts ›
// `rutasDe`; `ubicar` dice dónde están de verdad: <repositorio>/.stl, rama `stl`).
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { estadoPersonaVacio, juntarArchivos, proyectoVacio, TITULAR, unirArchivo, unirEstados, type ArchivoPlan, type EstadoDirector, type EstadoPersona, type Persona, type Plan, type Proyecto } from './director.ts';
import { leerFrescoTexto, listarRemoto } from './fresco.ts';
import { enDisco, rutasDe } from './proyectos.ts';

/**
 * Lo archivado de un proyecto, junto: el archivo de una sola pieza, de antes (director/archivo.json), y después los meses
 * (director/archivo/AAAA-MM.json, «El plan liviano», punto 2), que mandan sobre él. null si no hay ninguno.
 */
async function leerArchivoUnido(raiz: string, id: string): Promise<ArchivoPlan | null> {
  const rutas = rutasDe(id);
  const nombres = new Set<string>();
  const dir = enDisco(raiz, rutas.archivoMeses);
  if (existsSync(dir)) for (const f of await readdir(dir)) if (f.endsWith('.json')) nombres.add(f);
  for (const r of await listarRemoto(raiz, rutas.archivoMeses)) if (r.endsWith('.json')) nombres.add(r.split('/').pop()!);
  const partes: Partial<ArchivoPlan>[] = [];
  const previo = await leerFrescoTexto(raiz, rutas.archivo);
  if (previo !== null) partes.push(JSON.parse(previo));
  for (const f of [...nombres].sort()) {
    const texto = await leerFrescoTexto(raiz, `${rutas.archivoMeses}/${f}`);
    if (texto !== null) partes.push(JSON.parse(texto));
  }
  return partes.length ? juntarArchivos(partes) : null;
}

/** El plan de un proyecto con lo archivado: lo cerrado salió al archivo para que el plan no pese, pero cuenta igual. */
export async function leerPlanUnido(raiz: string, id: string): Promise<Plan> {
  return unirArchivo(JSON.parse((await leerFrescoTexto(raiz, rutasDe(id).plan)) ?? '{}'), await leerArchivoUnido(raiz, id));
}

/** El proyecto.json (el contexto, la meta y el equipo) sobre el proyecto vacío, para que ningún campo falte. */
export async function leerProyectoDe(raiz: string, id: string): Promise<Proyecto> {
  return { ...proyectoVacio(), ...JSON.parse((await leerFrescoTexto(raiz, rutasDe(id).proyecto)) ?? '{}') };
}

/** Un JSON de la memoria, lo más nuevo entre la carpeta y GitHub: null si existe y no se entiende; {} si no existe todavía. */
export async function leerJsonFresco(raiz: string, ruta: string): Promise<any | null> {
  const texto = await leerFrescoTexto(raiz, ruta);
  if (texto === null) return {};
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

/** Las personas con archivo de estado en un proyecto: el titular, las del equipo y las que haya en la carpeta o en GitHub. */
export async function personasConArchivo(raiz: string, id: string, proyecto: Proyecto): Promise<Persona[]> {
  const carpeta = rutasDe(id).equipo;
  const ids = new Set<Persona>([TITULAR, ...proyecto.equipo.map((i) => i.id)]);
  const dir = enDisco(raiz, carpeta);
  if (existsSync(dir)) for (const f of await readdir(dir)) if (f.endsWith('.json')) ids.add(f.slice(0, -5));
  for (const r of await listarRemoto(raiz, carpeta)) if (r.endsWith('.json')) ids.add(r.split('/').pop()!.slice(0, -5));
  return [...ids];
}

export interface OpcionesDelEquipo {
  /**
   * Un archivo de persona vacío (0 bytes) es un error de lectura, como siempre en las herramientas del director. Sin esto
   * (el servidor del Studio), cuenta como un estado vacío. Las dos formas existían antes de unir la lectura y se
   * conservan tal cual; es lo único en que los dos lectores difieren.
   */
  vacioEsError?: boolean;
}

/** Lo que dice el texto del archivo de una persona (null: no existe todavía), sobre un estado vacío. */
function estadoDelTexto(texto: string | null, vacioEsError: boolean): EstadoPersona {
  const datos = texto === null || (texto === '' && !vacioEsError) ? {} : JSON.parse(texto);
  return { ...estadoPersonaVacio(), ...datos };
}

/**
 * El archivo de una persona: el propio, de la carpeta (este Studio es su único dueño: es lo que sigue guardando, así que
 * no se mezcla con lo de GitHub); el de otra, lo más nuevo entre la carpeta y GitHub.
 */
export async function leerEstadoDePersona(raiz: string, id: string, p: Persona, propia: boolean, opciones: OpcionesDelEquipo = {}): Promise<EstadoPersona> {
  const ruta = rutasDe(id).persona(p);
  const local = enDisco(raiz, ruta);
  const texto = propia ? (existsSync(local) ? await readFile(local, 'utf-8') : null) : await leerFrescoTexto(raiz, ruta);
  return estadoDelTexto(texto, !!opciones.vacioEsError);
}

/**
 * El estado del equipo de un proyecto: el archivo de cada persona y su unión. `yo` es quien usa este Studio (null: nadie,
 * como las herramientas del director): su archivo se lee de la carpeta y siempre existe en el resultado, aunque aún no lo
 * haya escrito.
 */
export async function leerEstadoDelEquipo(
  raiz: string,
  id: string,
  proyecto: Proyecto,
  yo: Persona | null = null,
  opciones: OpcionesDelEquipo = {},
): Promise<{ propio: EstadoPersona | null; porPersona: Record<Persona, EstadoPersona>; estado: EstadoDirector }> {
  const porPersona: Record<Persona, EstadoPersona> = {};
  for (const p of await personasConArchivo(raiz, id, proyecto)) porPersona[p] = await leerEstadoDePersona(raiz, id, p, p === yo, opciones);
  if (yo && !porPersona[yo]) porPersona[yo] = estadoPersonaVacio();
  return { propio: yo ? porPersona[yo] : null, porPersona, estado: unirEstados(porPersona) };
}
