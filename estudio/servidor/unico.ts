// Un solo servidor del Studio en este computador. Venga de donde venga (el doble clic en «Abrir STL Studio.cmd»,
// npm run estudio, la vista previa de un agente, un proceso del director), si ya hay uno vivo no se enciende otro: dos
// servidores son dos lanzadores de revisiones, dos traídas de GitHub y dos guardados a la vez. El 20 de octubre, un
// reinicio de Vite dejó un servidor en el 5180 y otro en el 5181 (en el mismo proceso), y la revisión del 21 se lanzó
// dos veces. El candado vive en .estudio/servidor.json (solo de este computador, fuera de git).
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { join } from 'node:path';

export interface Candado {
  pid: number;
  puerto: number;
  desde: string;
}

/** Mientras un servidor arranca, su puerto todavía no responde: su candado vale igual este rato. */
const ARRANCANDO_MS = 2 * 60_000;

export const rutaCandado = (raiz: string) => join(raiz, '.estudio', 'servidor.json');

export function leerCandado(raiz: string): Candado | null {
  try {
    const c = JSON.parse(readFileSync(rutaCandado(raiz), 'utf8'));
    return Number.isInteger(c?.pid) && Number.isInteger(c?.puerto) ? c : null;
  } catch {
    return null;
  }
}

/** ¿Existe ese proceso? (EPERM: existe, pero es de otro usuario.) */
export function procesoVivo(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/** ¿Algo escucha en ese puerto de este computador? (localhost: Vite escucha en IPv6 o en IPv4, según el sistema.) */
export function puertoOcupado(puerto: number, ms = 1500): Promise<boolean> {
  return new Promise((listo) => {
    const s = createConnection({ host: 'localhost', port: puerto });
    const fin = (si: boolean) => {
      s.destroy();
      listo(si);
    };
    s.setTimeout(ms, () => fin(false));
    s.once('connect', () => fin(true));
    s.once('error', () => fin(false));
  });
}

/**
 * El otro servidor del Studio que ya está vivo, si lo hay (nunca este mismo proceso): su proceso existe y su puerto
 * responde, o acaba de arrancar. Un candado de un proceso que ya no existe no cuenta.
 */
export async function otroServidor(raiz: string, ahora = Date.now()): Promise<Candado | null> {
  const c = leerCandado(raiz);
  if (!c || c.pid === process.pid || !procesoVivo(c.pid)) return null;
  if (ahora - Date.parse(c.desde) < ARRANCANDO_MS) return c;
  return (await puertoOcupado(c.puerto)) ? c : null;
}

export function tomarCandado(raiz: string, puerto: number): void {
  mkdirSync(join(raiz, '.estudio'), { recursive: true });
  const previo = leerCandado(raiz);
  const desde = previo?.pid === process.pid ? previo.desde : new Date().toISOString();
  writeFileSync(rutaCandado(raiz), JSON.stringify({ pid: process.pid, puerto, desde }) + '\n');
}

/** Solo lo suelta quien lo tiene. */
export function soltarCandado(raiz: string): void {
  if (leerCandado(raiz)?.pid === process.pid && existsSync(rutaCandado(raiz))) rmSync(rutaCandado(raiz), { force: true });
}

/** Lo que se dice cuando alguien intenta encender un segundo servidor. */
export const yaEncendido = (c: Candado) =>
  `STL Studio ya está encendido (proceso ${c.pid}, http://localhost:${c.puerto}/): no se enciende otro servidor. Ábrelo ahí; para apagarlo, npm run encender -- --apagar.`;
