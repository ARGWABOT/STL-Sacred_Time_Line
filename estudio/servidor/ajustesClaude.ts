// El modelo y el esfuerzo de Claude Code en este computador: los de su configuración (~/.claude/settings.json, o la de
// CLAUDE_CONFIG_DIR), los mismos que cambian /model y /effort. El Studio los lee y los escribe ahí, así que elegir en
// «Modelo y consumo» es lo mismo que usar /model o /effort en cualquier sesión de Claude Code, y al revés. Solo toca esas dos
// claves (y el esfuerzo del modelo elegido en `modelSettings`, si Claude Code ya lo guarda ahí): lo demás queda intacto,
// y si el archivo no es JSON válido no lo toca.
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { esEsfuerzo, MODELO_VALIDO, type Esfuerzo } from '../../src/director/proyectos';

/** Dónde guarda Claude Code su configuración de usuario. */
export const archivoAjustesClaude = (env: NodeJS.ProcessEnv = process.env) => join(env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), 'settings.json');

/** El modelo y el esfuerzo elegidos en Claude Code; null: el que trae la cuenta por defecto. */
export interface AjustesClaude {
  modelo: string | null;
  esfuerzo: Esfuerzo | null;
}

type Json = Record<string, any>;
const objeto = (x: unknown): Json => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Json) : {});

/**
 * La entrada de `modelSettings` que corresponde a un modelo: la de su id (sin «[1m]») o, si es un alias (opus,
 * sonnet…), la de la versión más nueva de esa familia que tenga una entrada. Ahí guarda Claude Code el esfuerzo de cada modelo.
 */
export function entradaDelModelo(porModelo: Json, modelo: string | null): string | null {
  const base = modelo?.replace(/\[1m\]$/i, '') ?? null;
  if (!base) return null;
  const claves = Object.keys(porModelo);
  if (claves.includes(base)) return base;
  if (!/^[a-z]+$/.test(base)) return null;
  return claves.filter((k) => k.startsWith(`claude-${base}-`)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).at(-1) ?? null;
}

async function leerJson(archivo: string): Promise<Json> {
  if (!existsSync(archivo)) return {};
  return objeto(JSON.parse(await readFile(archivo, 'utf-8')));
}

/** Lo que Claude Code tiene elegido. Si el archivo no está o no se entiende, el de la cuenta. */
export async function leerAjustesClaude(archivo = archivoAjustesClaude()): Promise<AjustesClaude> {
  let j: Json;
  try {
    j = await leerJson(archivo);
  } catch {
    return { modelo: null, esfuerzo: null };
  }
  const modelo = typeof j.model === 'string' && MODELO_VALIDO.test(j.model) ? j.model : null;
  const porModelo = objeto(j.modelSettings);
  const entrada = entradaDelModelo(porModelo, modelo);
  const propio = entrada ? objeto(porModelo[entrada]).effortLevel : undefined;
  return { modelo, esfuerzo: esEsfuerzo(propio) ? propio : esEsfuerzo(j.effortLevel) ? j.effortLevel : null };
}

/** Cambia la configuración de Claude Code. Si el archivo no es JSON válido, no lo toca y lo dice. */
async function cambiar(archivo: string, cambio: (j: Json) => void): Promise<void> {
  let j: Json;
  try {
    j = await leerJson(archivo);
  } catch {
    throw new Error(`La configuración de Claude Code (${archivo}) no es JSON válido: el Studio no la toca. Corrígela o usa /model y /effort en Claude Code.`);
  }
  cambio(j);
  await mkdir(dirname(archivo), { recursive: true });
  // Primero a un archivo aparte y luego encima: nunca queda a medio escribir
  const temporal = `${archivo}.stl-${process.pid}.tmp`;
  await writeFile(temporal, JSON.stringify(j, null, 2) + '\n', 'utf-8');
  await rename(temporal, archivo);
}

/** Como /model: el modelo de Claude Code en este computador; null lo quita y vuelve al de la cuenta. */
export async function guardarModeloClaude(modelo: string | null, archivo = archivoAjustesClaude()): Promise<void> {
  if (modelo && !MODELO_VALIDO.test(modelo)) throw new Error(`«${modelo}» no es un modelo que acepte Claude Code.`);
  await cambiar(archivo, (j) => {
    if (modelo) j.model = modelo;
    else delete j.model;
  });
}

/** Como /effort: el esfuerzo de Claude Code en este computador (y el del modelo elegido, si lo tiene aparte); null lo quita. */
export async function guardarEsfuerzoClaude(esfuerzo: string | null, archivo = archivoAjustesClaude()): Promise<void> {
  if (esfuerzo && !esEsfuerzo(esfuerzo)) throw new Error(`«${esfuerzo}» no es un esfuerzo que acepte Claude Code.`);
  await cambiar(archivo, (j) => {
    if (esfuerzo) j.effortLevel = esfuerzo;
    else delete j.effortLevel;
    const porModelo = objeto(j.modelSettings);
    const entrada = entradaDelModelo(porModelo, typeof j.model === 'string' ? j.model : null);
    if (!entrada || !('effortLevel' in objeto(porModelo[entrada]))) return;
    if (esfuerzo) porModelo[entrada].effortLevel = esfuerzo;
    else delete porModelo[entrada].effortLevel;
  });
}
