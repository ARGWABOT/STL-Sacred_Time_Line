// Un solo servidor del Studio en este computador. Venga de donde venga (el doble clic en «Abrir STL Studio.cmd»,
// npm run estudio, la vista previa de un agente, un proceso del director), si ya hay uno vivo no se enciende otro: dos
// servidores son dos lanzadores de revisiones, dos traídas de GitHub y dos guardados a la vez. El 20 de octubre, un
// reinicio de Vite dejó un servidor en el 5180 y otro en el 5181 (en el mismo proceso), y la revisión del 21 se lanzó
// dos veces. El candado vive en .estudio/servidor.json (solo de este computador, fuera de git).
import { spawnSync } from 'node:child_process';
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

/**
 * Con qué comando se lanzó un proceso, o null si no se puede saber. Sirve para no confundir al Studio con otro programa
 * que, después de reiniciar el computador, quedó con el mismo número de proceso que un candado viejo.
 */
export function comandoDe(pid: number): string | null {
  try {
    const r = process.platform === 'win32'
      ? spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`], { encoding: 'utf8', windowsHide: true, timeout: 15_000 })
      : spawnSync('ps', ['-o', 'args=', '-p', String(pid)], { encoding: 'utf8', timeout: 5000 });
    return r.status === 0 ? r.stdout.trim() || null : null;
  } catch {
    return null;
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
  // Un número de proceso que ahora es de otro programa (después de reiniciar el computador): el candado es viejo
  const cmd = comandoDe(c.pid);
  if (cmd !== null && !/vite/i.test(cmd)) return null;
  if (ahora - Date.parse(c.desde) < ARRANCANDO_MS) return c;
  return (await puertoOcupado(c.puerto)) ? c : null;
}

/**
 * Toma el candado, sin carreras: el archivo se crea solo si no existe (de dos servidores que arrancan al mismo tiempo,
 * solo uno lo crea). Lo retoma el mismo proceso (un reinicio de Vite) y lo reemplaza si es viejo: de un proceso que ya
 * no existe, o de uno que otroServidor ya juzgó que no sirve (vivo, pero sin servidor desde hace rato). Devuelve false
 * si otro acaba de tomarlo.
 */
export function tomarCandado(raiz: string, puerto: number, ahora = Date.now()): boolean {
  mkdirSync(join(raiz, '.estudio'), { recursive: true });
  const ruta = rutaCandado(raiz);
  const datos = (desde: string) => JSON.stringify({ pid: process.pid, puerto, desde }) + '\n';
  for (let intento = 0; intento < 3; intento++) {
    try {
      writeFileSync(ruta, datos(new Date(ahora).toISOString()), { flag: 'wx' });
      return true;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
      const c = leerCandado(raiz);
      if (c?.pid === process.pid) {
        writeFileSync(ruta, datos(c.desde));
        return true;
      }
      // Otro servidor vivo que lo tomó hace un momento: está arrancando, se le deja (si su número de proceso es ahora
      // de otro programa, el candado es viejo)
      if (c && procesoVivo(c.pid) && ahora - Date.parse(c.desde) < ARRANCANDO_MS && ((cmd) => cmd === null || /vite/i.test(cmd))(comandoDe(c.pid))) return false;
      rmSync(ruta, { force: true });
    }
  }
  return false;
}

/** Solo lo suelta quien lo tiene. */
export function soltarCandado(raiz: string): void {
  if (leerCandado(raiz)?.pid === process.pid && existsSync(rutaCandado(raiz))) rmSync(rutaCandado(raiz), { force: true });
}

/** Lo que se dice cuando alguien intenta encender un segundo servidor. */
export const yaEncendido = (c: Candado) =>
  `STL Studio ya está encendido (proceso ${c.pid}, http://localhost:${c.puerto}/): no se enciende otro servidor. Ábrelo ahí; para apagarlo, npm run encender -- --apagar.`;
