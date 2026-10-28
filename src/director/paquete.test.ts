import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { archivoDelPaquete, bandejaDelPaquete, copiarSalida, DIAS_FUERA_DEL_STUDIO, idsPorFase, paqueteDeRegistro, PARTES, REGISTRO, REVISIONES, separadorDeBandeja, tokensEstimados } from './paquete';

const base = mkdtempSync(join(tmpdir(), 'estudio-paquete-'));
afterAll(() => rmSync(base, { recursive: true, force: true }));
const NOMBRE = 'stl-studio-2026-10-23T18-04-05-123Z.log';
const siempre = () => true;

describe('el paquete de cada revisión (pedido del titular del 23 de octubre de 2026)', () => {
  it('sus partes van junto al registro, con su mismo nombre', () => {
    const registro = join(base, REVISIONES, NOMBRE);
    expect(paqueteDeRegistro(registro)).toEqual({
      encargo: join(base, REVISIONES, 'stl-studio-2026-10-23T18-04-05-123Z.encargo.txt'),
      bandeja: join(base, REVISIONES, 'stl-studio-2026-10-23T18-04-05-123Z.bandeja.txt'),
    });
    expect(paqueteDeRegistro('golf-urgencia-2026-10-23T18-04-05-123Z.log').encargo).toBe('golf-urgencia-2026-10-23T18-04-05-123Z.encargo.txt');
  });

  it('lo pendiente fuera de la cola va por fase, en el orden de la ruta, y lo de ninguna fase al final', () => {
    const fases = ['arranque', 'mvp', 'piloto', 'lanzamiento'];
    const cosas = [
      { id: 'pd_despues', fase: 'despues' },
      { id: 'pd_lanzar', fase: 'lanzamiento' },
      { id: 'pr_piloto', fase: 'piloto' },
      { id: 'pd_lanzar_2', fase: 'lanzamiento' },
      { id: 'pd_piloto', fase: 'piloto' },
    ];
    expect(idsPorFase(cosas, fases)).toEqual([
      { fase: 'piloto', ids: ['pr_piloto', 'pd_piloto'] },
      { fase: 'lanzamiento', ids: ['pd_lanzar', 'pd_lanzar_2'] },
      { fase: 'despues', ids: ['pd_despues'] },
    ]);
    expect(idsPorFase([], fases)).toEqual([]);
    // No cambia lo que recibe
    expect(cosas[0].id).toBe('pd_despues');
  });

  it('lo pedido fuera del Studio llega solo de los últimos días', () => {
    expect(DIAS_FUERA_DEL_STUDIO).toBeGreaterThanOrEqual(1);
    expect(DIAS_FUERA_DEL_STUDIO).toBeLessThan(7);
  });

  it('los tokens de una parte son estimados: sus caracteres entre 4, hacia arriba', () => {
    expect(tokensEstimados('')).toBe(0);
    expect(tokensEstimados('abcd')).toBe(1);
    expect(tokensEstimados('abcde')).toBe(2);
    expect(tokensEstimados('canción')).toBe(2);
  });

  describe('la bandeja guarda lo que imprime', () => {
    const registro = join(base, REVISIONES, NOMBRE);

    it('solo si la corre el director que lanzó el Studio, y no al cerrar', () => {
      expect(bandejaDelPaquete(registro, base, [], siempre)).toBe(paqueteDeRegistro(registro).bandeja);
      expect(bandejaDelPaquete(registro, base, ['--proyecto', 'golf', '--sin-transcribir'], siempre)).toBe(paqueteDeRegistro(registro).bandeja);
      expect(bandejaDelPaquete(registro, base, ['--urgente'], siempre)).toBe(paqueteDeRegistro(registro).bandeja);
      expect(bandejaDelPaquete(registro, base, ['--aclarar'], siempre)).toBe(paqueteDeRegistro(registro).bandeja);
      // Sin la variable (la sesión del director, una persona en su terminal), nada
      expect(bandejaDelPaquete(undefined, base, [], siempre)).toBeNull();
      expect(bandejaDelPaquete('', base, [], siempre)).toBeNull();
      // El cierre no es lo que recibe al empezar
      expect(bandejaDelPaquete(registro, base, ['--listo'], siempre)).toBeNull();
      expect(bandejaDelPaquete(registro, base, ['--aclarar', '--listo'], siempre)).toBeNull();
    });

    it('solo junto a un registro que existe, por su nombre, en la carpeta .revisiones de este Studio', () => {
      // Otra carpeta, una subcarpeta, otro nombre o un registro que no está: no se toca
      expect(bandejaDelPaquete(join(base, 'otra', NOMBRE), base, [], siempre)).toBeNull();
      expect(bandejaDelPaquete(join(base, REVISIONES, 'sub', NOMBRE), base, [], siempre)).toBeNull();
      expect(bandejaDelPaquete(join(base, REVISIONES, '..', NOMBRE), base, [], siempre)).toBeNull();
      expect(bandejaDelPaquete(join(base, REVISIONES, 'lanzando.json'), base, [], siempre)).toBeNull();
      expect(bandejaDelPaquete(join(base, REVISIONES, 'stl-studio-2026-10-23T18-04-05-123Z.encargo.txt'), base, [], siempre)).toBeNull();
      expect(bandejaDelPaquete(registro, base, [], () => false)).toBeNull();
      // Una ruta relativa se lee desde la carpeta de trabajo, como el sistema
      expect(bandejaDelPaquete(join(REVISIONES, NOMBRE), process.cwd(), [], siempre)).toBe(paqueteDeRegistro(join(process.cwd(), REVISIONES, NOMBRE)).bandeja);
    });

    it('copia todo lo que imprime, en orden y sin cambiarlo, a medida que lo imprime y con su separador', () => {
      const carpeta = join(base, 'copia');
      mkdirSync(carpeta, { recursive: true });
      const destino = join(carpeta, 'x.bandeja.txt');
      const impreso: string[] = [];
      // Cada corrida de la bandeja es un proceso aparte, con su propia consola
      const correr = (args: string[], hora: string, lineas: (consola: { log: (...xs: unknown[]) => void; error: (...xs: unknown[]) => void }) => void) => {
        const consola = { log: (...xs: unknown[]) => void impreso.push(`log ${xs.join(' ')}`), info: () => {}, warn: () => {}, error: (...xs: unknown[]) => void impreso.push(`error ${xs.join(' ')}`) };
        copiarSalida(destino, separadorDeBandeja(args, new Date(hora)), consola);
        lineas(consola);
      };
      correr(['--proyecto', 'golf'], '2026-10-23T18:05:00.000Z', (consola) => {
        consola.log('# Bandeja · Golf');
        // Ya está en el archivo, sin esperar a la salida: si la bandeja muere aquí, lo impreso queda
        expect(readFileSync(destino, 'utf8')).toContain('# Bandeja · Golf\n');
        consola.error('Transcribiendo 1 audio en local…');
        consola.log('lleva %d notas', 3);
        consola.log();
      });
      // Lo que imprime sigue igual
      expect(impreso).toEqual(['log # Bandeja · Golf', 'error Transcribiendo 1 audio en local…', 'log lleva %d notas 3', 'log ']);
      // La segunda vez en la misma revisión, al final, con su línea
      correr(['--sin-transcribir'], '2026-10-23T18:20:00.000Z', (consola) => consola.log('# Bandeja otra vez'));
      expect(readFileSync(destino, 'utf8')).toBe(
        '──── node tools/director/bandeja.ts --proyecto golf · 2026-10-23T18:05:00.000Z ────\n' +
          '# Bandeja · Golf\nTranscribiendo 1 audio en local…\nlleva 3 notas\n\n' +
          '──── node tools/director/bandeja.ts --sin-transcribir · 2026-10-23T18:20:00.000Z ────\n' +
          '# Bandeja otra vez\n',
      );
      expect(separadorDeBandeja([], new Date('2026-10-23T18:05:00.000Z'))).toBe('──── node tools/director/bandeja.ts · 2026-10-23T18:05:00.000Z ────\n');
    });

    it('la bandeja lo copia desde antes de imprimir nada, con la variable del lanzador', () => {
      const bandeja = readFileSync(join(__dirname, '../../tools/director/bandeja.ts'), 'utf-8');
      const copia = bandeja.indexOf('copiarSalida(copia, separadorDeBandeja(process.argv.slice(2)))');
      expect(bandeja).toContain('const copia = bandejaDelPaquete(process.env[VARIABLE_REGISTRO], raiz, args);');
      expect(copia).toBeGreaterThan(0);
      for (const primero of ['console.log(', 'console.error(', 'process.exit(']) expect(bandeja.indexOf(primero)).toBeGreaterThan(copia);
    });

    it('si no puede escribir, sigue sin error', () => {
      const nada = (..._: unknown[]) => {};
      const consola = { log: nada, info: nada, warn: nada, error: nada };
      expect(() => copiarSalida(join(base, 'no-existe', 'x.bandeja.txt'), 'separador\n', consola)).not.toThrow();
      expect(() => consola.log('hola')).not.toThrow();
    });
  });

  describe('la página abre una parte, y nada más', () => {
    it('con el nombre de un registro y una de sus partes, dentro de .revisiones', () => {
      expect(PARTES).toEqual(['encargo', 'bandeja']);
      expect(archivoDelPaquete(base, NOMBRE, 'encargo')).toBe(paqueteDeRegistro(join(base, REVISIONES, NOMBRE)).encargo);
      expect(archivoDelPaquete(base, 'golf-aclaracion-2026-10-23T18-04-05-123Z.log', 'bandeja')).toBe(join(base, REVISIONES, 'golf-aclaracion-2026-10-23T18-04-05-123Z.bandeja.txt'));
    });

    it('nunca una ruta, «..», una barra, otro archivo ni otra parte', () => {
      for (const malo of [`../${NOMBRE}`, `..\\${NOMBRE}`, `sub/${NOMBRE}`, `/${NOMBRE}`, `C:\\${NOMBRE}`, '..', 'lanzando.json', 'ajustes-del-director.json', NOMBRE.replace('.log', '.encargo.txt'), `${NOMBRE}\n`, `${NOMBRE}/../x`, 'Golf-2026-10-23T18-04-05-123Z.log', '', null, undefined, 3, ['x'], { registro: NOMBRE }])
        expect(archivoDelPaquete(base, malo, 'encargo'), String(malo)).toBeNull();
      for (const parte of ['registro', 'log', '', '../encargo', 'Encargo', null, undefined, 1]) expect(archivoDelPaquete(base, NOMBRE, parte), String(parte)).toBeNull();
      // Lo que acepta es solo el nombre de un registro
      expect(REGISTRO.test(NOMBRE)).toBe(true);
    });
  });

  it('con el disco de verdad: solo cuando el registro ya existe', () => {
    const raiz = join(base, 'studio');
    mkdirSync(join(raiz, REVISIONES), { recursive: true });
    const registro = join(raiz, REVISIONES, NOMBRE);
    expect(bandejaDelPaquete(registro, raiz, [])).toBeNull();
    writeFileSync(registro, '{"type":"studio"}\n');
    expect(bandejaDelPaquete(registro, raiz, [])).toBe(paqueteDeRegistro(registro).bandeja);
  });
});
