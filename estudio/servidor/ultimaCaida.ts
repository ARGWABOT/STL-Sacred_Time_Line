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
  // Y cuenta como falla del servidor, con su causa (pd_salud_d)
  const texto = lineas.join('\n');
  anotarFalla(carpeta, { cuando, mensaje: (lineas.at(-1) ?? `código ${codigo}`).slice(0, MAX_TEXTO), traza: texto.slice(0, MAX_TEXTO), donde: 'servidor', tipo: 'servidor', causa: causaDeFalla(texto) });
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

// Las fallas de la página (pd_salud_a; nmw9gq7sftit): cuando el Studio no carga, la pantalla de emergencia
// (estudio/src/emergencia.ts) manda el error con su traza y queda aquí, en .estudio/, junto a la última caída. Cada una se
// guarda 90 días y luego se borra sola (decisión nmw9ltx31tit): las cuentas por causa de pd_salud_d quedan recientes.
const ARCHIVO_FALLAS = 'fallas.json';
/** Cuántos días se guarda cada falla (nmw9ltx31tit). */
export const DIAS_FALLAS = 90;
/** Un tope, por si algo falla en bucle: las más nuevas. */
const MAX_FALLAS = 500;
const MAX_TEXTO = 8000;

export interface FallaGuardada {
  cuando: string;
  mensaje: string;
  traza: string;
  donde: string;
  prueba?: boolean;
  /** Qué falló: la página que no cargó, el servidor que se detuvo o una revisión que no cerró (pd_salud_d; nmw9rdn3xtit). */
  tipo?: TipoFalla;
  /** Su causa, que pone el código sin el modelo (causaDeFalla; nmw9rdisqtit). */
  causa?: CausaFalla;
}

// «Autorreparación», capa tres (pd_salud_d, en su forma más chica por la nota nmw9re982tit): cada falla con su causa, que
// pone el código sin el modelo (nmw9rdisqtit), contando también las revisiones que no cerraron por el Studio, el computador o
// la cuenta, y nunca las fallas forzadas para probar (nmw9rdn3xtit). «Salud del Studio» muestra una línea por causa con su
// cuenta de 90 días (nmw9ofvc7tit) y, con dos seguidas de la misma causa, el aviso de arriba ofrece «Diagnosticar y
// reparar» (nmw9p97xwtit, nmw9rdkr3tit).
export type TipoFalla = 'carga' | 'servidor' | 'revision';
export type CausaFalla = 'modelo' | 'codigo' | 'computador' | 'cuenta' | 'desconocida';

const SENALES_CAUSA: [CausaFalla, RegExp][] = [
  ['cuenta', /usage limit|rate.?limit|límite de uso|not logged in|sin sesión|auth(entication)? (failed|error)|\b401\b|\b403\b|billing|login/i],
  ['computador', /ENOSPC|no space left|ENOMEM|heap out of memory|Allocation failed|EADDRINUSE|address already in use|EPERM|EACCES|permission denied|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|network/i],
  ['modelo', /overloaded|\b529\b|model.*(not|no) (found|available|accept)|context (length|window)|invalid_request_error|api_error/i],
  ['codigo', /TypeError|ReferenceError|SyntaxError|RangeError|Cannot find module|ERR_MODULE_NOT_FOUND|Failed to resolve import|Failed to load url|No se pudo cargar|is not a function|is not defined|Unexpected token|Transform failed/i],
];

/** La causa de una falla, leída en su texto, sin el modelo; «desconocida» si no está claro (nmw9rdisqtit). Pura. */
export function causaDeFalla(texto: string): CausaFalla {
  return SENALES_CAUSA.find(([, re]) => re.test(texto))?.[0] ?? 'desconocida';
}

/**
 * Una revisión que no cerró, como falla para contar: no la que la persona detuvo ni la que se cortó por su tiempo
 * (nmw9rdn3xtit). La cuenta va a «cuenta» aunque su texto no lo diga. null si no cuenta. Pura.
 */
export function fallaDeRevision(f: { que: string; porque: string; accion?: string; cuando: string; registro?: string }, x: { detenida?: boolean; porTiempo?: boolean } = {}): FallaGuardada | null {
  if (x.detenida || x.porTiempo) return null;
  const texto = `${f.que}\n${f.porque}`;
  return { cuando: f.cuando, mensaje: texto.slice(0, MAX_TEXTO), traza: f.registro ?? '', donde: 'revision', tipo: 'revision', causa: f.accion === 'cuenta' ? 'cuenta' : causaDeFalla(texto) };
}

export interface ResumenDeFallas {
  /** Una línea por causa, la más frecuente primero, con su cuenta de 90 días y la última, con su traza. */
  fallas: { causa: CausaFalla; n: number; ultima: { cuando: string; mensaje: string; traza: string; tipo: TipoFalla } }[];
  /** La causa de las dos últimas, si es la misma (y ninguna reparación se pidió después de la primera); null si no. */
  dosSeguidas: CausaFalla | null;
}

/** Las fallas de los últimos 90 días por causa, sin las de prueba, y si las dos últimas comparten causa. Pura. */
export function resumenDeFallas(fallas: FallaGuardada[], reparadaDesde?: string | null): ResumenDeFallas {
  const reales = fallas.filter((f) => !f.prueba).sort((a, b) => a.cuando.localeCompare(b.cuando));
  const causa = (f: FallaGuardada) => f.causa ?? causaDeFalla(`${f.mensaje}\n${f.traza}`);
  const por = new Map<CausaFalla, ResumenDeFallas['fallas'][number]>();
  for (const f of reales) {
    const c = causa(f);
    const previa = por.get(c);
    por.set(c, { causa: c, n: (previa?.n ?? 0) + 1, ultima: { cuando: f.cuando, mensaje: f.mensaje, traza: f.traza, tipo: f.tipo ?? (f.donde === 'revision' ? 'revision' : 'carga') } });
  }
  const [a, b] = reales.slice(-2);
  const despues = (f: FallaGuardada) => !reparadaDesde || f.cuando > reparadaDesde;
  const dosSeguidas = a && b && causa(a) === causa(b) && despues(a) ? causa(a) : null;
  return { fallas: [...por.values()].sort((x, y) => y.n - x.n || y.ultima.cuando.localeCompare(x.ultima.cuando)), dosSeguidas };
}

/** Lo que llega de la página, limpio: textos acotados y sin campos de más; null si no trae un mensaje. Pura. */
export function fallaValida(x: unknown, ahora = new Date().toISOString()): FallaGuardada | null {
  const f = x as Partial<Record<keyof FallaGuardada, unknown>> | null;
  if (!f || typeof f.mensaje !== 'string' || !f.mensaje.trim()) return null;
  const cuando = typeof f.cuando === 'string' && !Number.isNaN(Date.parse(f.cuando)) ? f.cuando : ahora;
  return {
    cuando,
    mensaje: f.mensaje.slice(0, MAX_TEXTO),
    traza: typeof f.traza === 'string' ? f.traza.slice(0, MAX_TEXTO) : '',
    donde: typeof f.donde === 'string' ? f.donde.slice(0, 20) : 'error',
    ...(f.prueba === true ? { prueba: true } : {}),
    tipo: 'carga',
    causa: causaDeFalla(`${f.mensaje}\n${typeof f.traza === 'string' ? f.traza : ''}`),
  };
}

/** Las que siguen vigentes: de los últimos 90 días, las más nuevas hasta el tope. Pura. */
export function fallasVigentes(fallas: FallaGuardada[], ahora = Date.now()): FallaGuardada[] {
  const limite = ahora - DIAS_FALLAS * 24 * 60 * 60 * 1000;
  return fallas.filter((f) => Date.parse(f.cuando) >= limite).slice(-MAX_FALLAS);
}

/** Las fallas guardadas en `carpeta` (.estudio/), ya sin las de más de 90 días. */
export function leerFallas(carpeta: string, ahora = Date.now()): FallaGuardada[] {
  const archivo = join(carpeta, ARCHIVO_FALLAS);
  if (!existsSync(archivo)) return [];
  try {
    const lista = JSON.parse(readFileSync(archivo, 'utf8')) as FallaGuardada[];
    return Array.isArray(lista) ? fallasVigentes(lista, ahora) : [];
  } catch {
    return [];
  }
}

/** Guarda una falla de la página y, de paso, borra las de más de 90 días. */
export function anotarFalla(carpeta: string, falla: FallaGuardada, ahora = Date.now()): FallaGuardada[] {
  const lista = fallasVigentes([...leerFallas(carpeta, ahora), falla], ahora);
  mkdirSync(carpeta, { recursive: true });
  writeFileSync(join(carpeta, ARCHIVO_FALLAS), JSON.stringify(lista, null, 2));
  return lista;
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
