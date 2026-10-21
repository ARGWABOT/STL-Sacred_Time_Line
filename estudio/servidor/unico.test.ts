import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { comandoDe, leerCandado, otroServidor, puertoOcupado, rutaCandado, soltarCandado, tomarCandado } from './unico';

const raiz = mkdtempSync(join(tmpdir(), 'estudio-unico-'));
afterAll(() => rmSync(raiz, { recursive: true, force: true }));
const escribirCandado = (c: object) => {
  mkdirSync(join(raiz, '.estudio'), { recursive: true });
  writeFileSync(rutaCandado(raiz), JSON.stringify(c));
};

describe('un solo servidor del Studio', () => {
  it('el candado propio no cuenta como otro servidor, y solo lo suelta quien lo tiene', async () => {
    tomarCandado(raiz, 5180);
    expect(leerCandado(raiz)?.pid).toBe(process.pid);
    expect(await otroServidor(raiz)).toBeNull();
    soltarCandado(raiz);
    expect(leerCandado(raiz)).toBeNull();
    escribirCandado({ pid: process.ppid, puerto: 5180, desde: new Date().toISOString() });
    soltarCandado(raiz);
    expect(leerCandado(raiz)?.pid).toBe(process.ppid);
  });

  it('un candado de un proceso que ya no existe no impide encender', async () => {
    const hijo = spawn(process.execPath, ['-e', '0']);
    await new Promise((r) => hijo.on('exit', r));
    escribirCandado({ pid: hijo.pid, puerto: 5180, desde: new Date().toISOString() });
    expect(await otroServidor(raiz)).toBeNull();
  });

  it('otro proceso vivo con el candado lo impide: mientras arranca, o si su puerto responde', async () => {
    const vivo = process.ppid; // el proceso que corre las pruebas: existe, y no es este
    escribirCandado({ pid: vivo, puerto: 1, desde: new Date().toISOString() });
    expect((await otroServidor(raiz))?.pid).toBe(vivo);
    // Arrancó hace rato y su puerto no responde: no cuenta (ya no sirve)
    const hace = new Date(Date.now() - 10 * 60_000).toISOString();
    escribirCandado({ pid: vivo, puerto: 1, desde: hace });
    expect(await otroServidor(raiz)).toBeNull();
    // Arrancó hace rato y su puerto responde: es otro servidor encendido
    const servidor = createServer().listen(0, 'localhost');
    await new Promise((r) => servidor.once('listening', r));
    const puerto = (servidor.address() as { port: number }).port;
    escribirCandado({ pid: vivo, puerto, desde: hace });
    expect((await otroServidor(raiz))?.puerto).toBe(puerto);
    expect(await puertoOcupado(puerto)).toBe(true);
    await new Promise((r) => servidor.close(r));
    expect(await puertoOcupado(puerto)).toBe(false);
  });
});

describe('el candado, sin carreras y sin confundirse después de reiniciar el computador', () => {
  it('si otro servidor vivo acaba de tomarlo, no se toma; si su proceso ya no existe, se reemplaza', async () => {
    escribirCandado({ pid: process.ppid, puerto: 5180, desde: new Date().toISOString() });
    expect(tomarCandado(raiz, 5180)).toBe(false);
    expect(leerCandado(raiz)?.pid).toBe(process.ppid);
    const hijo = spawn(process.execPath, ['-e', '0']);
    await new Promise((r) => hijo.on('exit', r));
    escribirCandado({ pid: hijo.pid, puerto: 5180, desde: new Date().toISOString() });
    expect(tomarCandado(raiz, 5180)).toBe(true);
    expect(leerCandado(raiz)?.pid).toBe(process.pid);
    soltarCandado(raiz);
  });

  it('un número de proceso que ahora es de otro programa no cuenta como el Studio', async () => {
    // Un programa vivo que no es vite (este mismo test lanza uno): su candado es viejo
    const otro = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 20000)']);
    try {
      expect(comandoDe(otro.pid!)).toMatch(/setTimeout/);
      escribirCandado({ pid: otro.pid, puerto: 5180, desde: new Date().toISOString() });
      expect(await otroServidor(raiz)).toBeNull();
      expect(tomarCandado(raiz, 5180)).toBe(true);
      soltarCandado(raiz);
    } finally {
      otro.kill();
    }
  }, 30_000);
});
