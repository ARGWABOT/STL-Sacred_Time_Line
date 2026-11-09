// La última caída del servidor del Studio (decisión del titular, nota de voz nmw6z1eartit, 7 de noviembre de 2026: «si el
// Studio arranca después de caerse, en «Dónde quedamos» dale el reporte de la última falla y sus posibles causas»). El
// vigilante (tools/encender.ts) la guarda cuando el servidor se cae: cuándo, su código y las últimas líneas de su registro
// (.estudio/servidor.log), con las causas probables que se leen en ellas. Al volver a encenderse, el Studio la muestra una
// vez en «Dónde quedamos» (app.ts › informeCaidaDq) y la marca vista. Vive en .estudio/, solo de este computador y fuera
// de git, como el registro.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ARCHIVO_CAIDA = 'ultima-caida.json';
/** Cuántas líneas del final del registro se guardan con la caída. */
export const LINEAS_CAIDA = 20;

/** Las causas que se reconocen en el registro; «desconocida» si ninguna. */
export type CausaCaida = 'memoria' | 'puerto' | 'modulo' | 'sintaxis' | 'permiso' | 'disco' | 'desconocida';

export interface Caida {
  cuando: string;
  codigo: number | null;
  lineas: string[];
  causas: CausaCaida[];
  vista: boolean;
}

const SENALES: [CausaCaida, RegExp][] = [
  ['memoria', /heap out of memory|ENOMEM|Allocation failed|JavaScript heap/i],
  ['puerto', /EADDRINUSE|address already in use|port \d+ is (already )?in use/i],
  ['modulo', /Cannot find module|ERR_MODULE_NOT_FOUND|Failed to resolve import|Failed to load url/i],
  ['sintaxis', /SyntaxError|Transform failed|Unexpected token/i],
  ['permiso', /EPERM|EACCES|operation not permitted|permission denied/i],
  ['disco', /ENOSPC|no space left/i],
];

/** Las causas probables de una caída, leídas en las últimas líneas de su registro. Pura. */
export function causasProbables(lineas: string[]): CausaCaida[] {
  const texto = lineas.join('\n');
  const causas = SENALES.filter(([, re]) => re.test(texto)).map(([c]) => c);
  return causas.length ? causas : ['desconocida'];
}

/** Las últimas líneas con algo del registro (sin las vacías). Pura. */
export function colaDelRegistro(registro: string, n = LINEAS_CAIDA): string[] {
  return registro.split(/\r?\n/).filter((l) => l.trim()).slice(-n);
}

/** Guarda la caída de ahora en `carpeta` (.estudio/), con las últimas líneas de su registro; reemplaza la anterior. */
export function anotarCaida(carpeta: string, codigo: number | null, registro: string, cuando = new Date().toISOString()): Caida {
  const lineas = colaDelRegistro(registro);
  const caida: Caida = { cuando, codigo, lineas, causas: causasProbables(lineas), vista: false };
  mkdirSync(carpeta, { recursive: true });
  writeFileSync(join(carpeta, ARCHIVO_CAIDA), JSON.stringify(caida, null, 2));
  return caida;
}

/** La caída que aún no se mostró, o null. */
export function caidaPendiente(carpeta: string): Caida | null {
  const archivo = join(carpeta, ARCHIVO_CAIDA);
  if (!existsSync(archivo)) return null;
  try {
    const c = JSON.parse(readFileSync(archivo, 'utf8')) as Caida;
    return c && !c.vista && typeof c.cuando === 'string' ? c : null;
  } catch {
    return null;
  }
}

/** Marca la caída como vista: ya no se vuelve a mostrar. */
export function marcarCaidaVista(carpeta: string): void {
  const archivo = join(carpeta, ARCHIVO_CAIDA);
  if (!existsSync(archivo)) return;
  try {
    const c = JSON.parse(readFileSync(archivo, 'utf8')) as Caida;
    writeFileSync(archivo, JSON.stringify({ ...c, vista: true }, null, 2));
  } catch { /* un archivo dañado no se muestra: caidaPendiente devuelve null */ }
}
