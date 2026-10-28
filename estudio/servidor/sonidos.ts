// Los sonidos del Studio: los MP3 que hizo el titular, que viajan con el Studio.
//
// Se generaron con ElevenLabs. El titular confirmó el 23 de octubre de 2026 que su licencia deja publicarlos («Se pueden
// publicar: llévalos», en la misión «Dime si la licencia de tus sonidos deja publicarlos»): van en su propia carpeta del
// Studio, `estudio/sonidos/`, con su efectos.json, guardados en git. El servidor los lee de `estudio.local.json ›
// sonidos.carpeta` si existe y, si no, de la carpeta del Studio. Sin ninguna, el Studio queda en silencio y el control de
// sonido lo dice.
//
// GET /__estudio/director/sonidos: la lista (efectos.json), o { hay: false }. GET /sonido?nombre=x.mp3: un MP3 de la carpeta.
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { ARCHIVO_LOCAL } from '../../src/director/proyectos';

/** Solo un nombre de archivo, sin carpetas: nada de `..`, barras ni rutas absolutas. */
export const NOMBRE_SONIDO = /^[a-z0-9-]+\.mp3$/;

/** La carpeta propia de los sonidos dentro del Studio (viaja con él). */
const CARPETA_SONIDOS = join('estudio', 'sonidos');

/** Donde están los sonidos en este computador, o null si no hay. */
export function carpetaSonidos(raiz: string, local: unknown): string | null {
  const pedida = (local as { sonidos?: { carpeta?: unknown } } | null)?.sonidos?.carpeta;
  const candidatas = [typeof pedida === 'string' && pedida.trim() ? resolve(raiz, pedida.trim()) : null, resolve(raiz, CARPETA_SONIDOS)];
  for (const c of candidatas) if (c && existsSync(join(c, 'efectos.json'))) return c;
  return null;
}

/** Lo que el navegador necesita de efectos.json: los efectos con sus tomas y las músicas. */
export interface ListaSonidos {
  efectos: Record<string, string[]>;
  musica: Record<string, { archivo: string; volumen: number; nombre: string; fondo: boolean }>;
}

/** De efectos.json, solo lo que sirve y con nombres válidos (las tomas de música no son efectos). */
export function listaDe(json: unknown): ListaSonidos {
  const x = (json ?? {}) as { todas?: unknown; publicados?: unknown; musica?: unknown };
  const fuente = (x.todas ?? x.publicados ?? {}) as Record<string, unknown>;
  const efectos: ListaSonidos['efectos'] = {};
  for (const [nombre, tomas] of Object.entries(fuente)) {
    if (nombre.startsWith('musica') || !Array.isArray(tomas)) continue;
    const validas = tomas.filter((t): t is string => typeof t === 'string' && NOMBRE_SONIDO.test(t));
    if (validas.length) efectos[nombre] = validas;
  }
  const musica: ListaSonidos['musica'] = {};
  for (const [id, m] of Object.entries((x.musica ?? {}) as Record<string, any>)) {
    if (!m || typeof m.archivo !== 'string' || !NOMBRE_SONIDO.test(m.archivo)) continue;
    const volumen = Number(m.volumen);
    musica[id] = { archivo: m.archivo, volumen: volumen > 0 && volumen <= 1 ? volumen : 0.12, nombre: String(m.nombre ?? id), fondo: m.fondo === true };
  }
  return { efectos, musica };
}

async function carpetaDe(raiz: string): Promise<string | null> {
  let local: unknown = null;
  try {
    local = JSON.parse(await readFile(join(raiz, ARCHIVO_LOCAL), 'utf-8'));
  } catch {
    /* sin estudio.local.json: la carpeta del Studio */
  }
  return carpetaSonidos(raiz, local);
}

/** La lista de sonidos de este computador, o { hay: false } si no hay carpeta (o su efectos.json no se lee). */
export async function leerSonidos(raiz: string): Promise<({ hay: true } & ListaSonidos) | { hay: false }> {
  const c = await carpetaDe(raiz);
  if (!c) return { hay: false };
  try {
    return { hay: true, ...listaDe(JSON.parse(await readFile(join(c, 'efectos.json'), 'utf-8'))) };
  } catch {
    return { hay: false };
  }
}

/** Un MP3 de la carpeta, solo si el nombre es válido y el archivo está ahí. */
export async function leerSonido(raiz: string, nombre: string): Promise<Buffer | null> {
  if (!NOMBRE_SONIDO.test(nombre)) return null;
  const c = await carpetaDe(raiz);
  if (!c) return null;
  try {
    return await readFile(join(c, nombre));
  } catch {
    return null;
  }
}
