import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { alAbrir, carpetaDeComando, comandoDe, leerCandado, mismaCarpeta, otroServidor, puertoOcupado, rutaCandado, soltarCandado, tomarCandado } from './unico';

const raiz = mkdtempSync(join(tmpdir(), 'estudio-unico-'));
afterAll(() => rmSync(raiz, { recursive: true, force: true }));
const escribirCandado = (c: object) => {
  mkdirSync(join(raiz, '.estudio'), { recursive: true });
  writeFileSync(rutaCandado(raiz), JSON.stringify(c));
};

// Tu decisión nmvsv6pqutit (28 de octubre de 2026, misión t_decidir_servidor): al abrir una segunda copia del Studio,
// desde otra carpeta, se apaga la que está encendida y se enciende la nueva, sin preguntar (pedido pd_un_director)
describe('una segunda copia del Studio reemplaza a la primera', () => {
  const primera = 'C:\\Users\\ana\\Descargas\\STL-viejo';
  const segunda = 'C:/xampp2024/htdocs/www/STL';
  it('reconoce la carpeta de un servidor por su comando, lo encienda el vigilante o npm run estudio', () => {
    expect(carpetaDeComando(`"C:\\Program Files\\nodejs\\node.exe" "${primera}\\node_modules\\vite\\bin\\vite.js"`)).toBe(primera);
    expect(carpetaDeComando(`node ${segunda}/node_modules/.bin/../vite/bin/vite.js`)).toBe(segunda);
    expect(carpetaDeComando('"C:\\Program Files\\Otro\\otro.exe" --puerto 5180')).toBeNull();
    expect(carpetaDeComando(`node ${segunda}/node_modules/otra-cosa/index.js`)).toBeNull();
  });

  it('otra copia se apaga y se enciende la nueva; la misma copia se recarga; otro programa no se toca', () => {
    expect(alAbrir(segunda, primera, true, true)).toBe('reemplazar');
    expect(alAbrir(segunda, 'c:\\xampp2024\\htdocs\\www\\STL\\', true, true)).toBe('recargar');
    expect(alAbrir(segunda, null, false, true)).toBe('recargar');
    expect(alAbrir(segunda, 'C:\\otra-app', false, true)).toBe('no tocar');
    expect(mismaCarpeta('/home/ana/STL', '/home/ana/stl', false)).toBe(false);
  });

  it('abrir el Studio apaga la otra copia antes de encender esta, y nunca enciende con el puerto ocupado', () => {
    const encender = readFileSync(join(__dirname, '..', '..', 'tools', 'encender.ts'), 'utf-8');
    const cuerpo = encender.slice(encender.indexOf('async function encender()'));
    expect(cuerpo.indexOf("queHacer === 'reemplazar' && !(await apagarOtraCopia(")).toBeGreaterThan(0);
    expect(cuerpo.indexOf("queHacer === 'reemplazar'")).toBeLessThan(cuerpo.indexOf('lanzarVigilante()'));
    expect(cuerpo).toContain('process.exit(1)');
  });
});

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
    // Pregunta tres veces al sistema por un proceso: con el resto de las pruebas corriendo al lado pasaba de 5 segundos
  }, 20_000);
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
