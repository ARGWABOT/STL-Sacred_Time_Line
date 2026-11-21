// La última caída del servidor (nota de voz del titular nmw6z1eartit): el vigilante la guarda, «Dónde quedamos» la cuenta
// una vez con sus causas probables, y el aviso de servidor caído dice cerrar la pestaña y abrir «Abrir STL Studio.cmd»
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { anotarCaida, anotarFalla, caidaPendiente, causaDeFalla, causasProbables, colaDelRegistro, DIAS_FALLAS, fallaDeRevision, fallasVigentes, fallaValida, LINEAS_CAIDA, leerFallas, marcarCaidaVista, resumenDeFallas, type FallaGuardada } from './ultimaCaida.ts';
import { en } from '../src/textos/en.ts';
import { es } from '../src/textos/es.ts';

const raiz = join(import.meta.dirname, '..', '..');
const leer = (r: string) => readFileSync(join(raiz, r), 'utf8');
const carpetas: string[] = [];
afterEach(() => { for (const c of carpetas.splice(0)) rmSync(c, { recursive: true, force: true }); });

describe('la última caída del servidor (nmw6z1eartit)', () => {
  it('una caída simulada se guarda con su código, sus últimas líneas y sus causas, y se muestra una sola vez', () => {
    const carpeta = mkdtempSync(join(tmpdir(), 'stl-caida-'));
    carpetas.push(carpeta);
    expect(caidaPendiente(carpeta)).toBeNull();
    const registro = [...Array.from({ length: 40 }, (_, i) => `[vite] línea ${i}`), '', 'FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory'].join('\n');
    anotarCaida(carpeta, 134, registro, '2026-11-07T22:00:00.000Z');
    const c = caidaPendiente(carpeta);
    expect(c).toMatchObject({ cuando: '2026-11-07T22:00:00.000Z', codigo: 134, vista: false, causas: ['memoria'] });
    expect(c!.lineas).toHaveLength(LINEAS_CAIDA);
    expect(c!.lineas.at(-1)).toContain('heap out of memory');
    // Al volver a encender, «Dónde quedamos» la muestra y la marca vista: ya no vuelve a salir
    marcarCaidaVista(carpeta);
    expect(caidaPendiente(carpeta)).toBeNull();
    // Una caída nueva vuelve a estar pendiente
    anotarCaida(carpeta, 1, 'Error: listen EADDRINUSE: address already in use :::5180');
    expect(caidaPendiente(carpeta)?.causas).toEqual(['puerto']);
  });

  it('las causas probables se leen en el registro; sin ninguna señal, «desconocida»', () => {
    expect(causasProbables(['Error [ERR_MODULE_NOT_FOUND]: Cannot find module x'])).toEqual(['modulo']);
    expect(causasProbables(['SyntaxError: Unexpected token'])).toEqual(['sintaxis']);
    expect(causasProbables(['Error: EPERM: operation not permitted'])).toEqual(['permiso']);
    expect(causasProbables(['ENOSPC: no space left on device'])).toEqual(['disco']);
    expect(causasProbables(['[vite] page reload'])).toEqual(['desconocida']);
    expect(colaDelRegistro('a\r\n\r\nb\nc', 2)).toEqual(['b', 'c']);
  });

  it('el vigilante la guarda en cada caída, el servidor la sirve y «Dónde quedamos» la cuenta una vez', () => {
    const encender = leer('tools/encender.ts');
    expect(encender).toContain("anotar(`El servidor se cayó (código ${codigo}).`);\n    // Guarda la caída");
    expect(encender).toContain("anotarCaida(carpeta, codigo, readFileSync(registro, 'utf8').slice(-20_000))");
    const api = leer('estudio/servidor/api.ts');
    expect(api).toContain("if (ruta === '/caida' && req.method === 'GET') return responder(res, 200, { caida: caidaPendiente(join(raiz, '.estudio')), carpeta: resolve(raiz) });");
    expect(api).toContain("if (ruta === '/caida/vista' && req.method === 'POST') {\n            marcarCaidaVista(join(raiz, '.estudio'));");
    const app = leer('estudio/src/app.ts');
    expect(app).toContain('${informeCaidaDq()}\n    ${informeNegadosDq()}');
    expect(app).toContain("if (!caidaPedida) { caidaPedida = true; await cargarCaida(); }");
    expect(app).toContain("if (!caidaMarcada) { caidaMarcada = true; void fetch('/__estudio/director/caida/vista', { method: 'POST' })");
    // Se declara antes de la primera carga (sin la zona muerta de let)
    expect(app.indexOf('let caidaDq')).toBeLessThan(app.indexOf('async function cargar(fresco = false) {'));
  });

  it('el aviso de servidor caído y el de «Dónde quedamos» dicen cerrar la pestaña y abrir «Abrir STL Studio.cmd», en los dos idiomas', () => {
    for (const textos of [es, en] as Record<string, unknown>[]) {
      expect(textos['servidor.sinRespuesta']).toContain('«Abrir STL Studio.cmd»');
      expect(textos['fijos.servidorNoResponde']).toContain('«Abrir STL Studio.cmd»');
      expect(textos['dq.caida']).toContain('«Abrir STL Studio.cmd»');
      for (const k of ['dq.caidaRegistro', 'dq.caidaMemoria', 'dq.caidaPuerto', 'dq.caidaModulo', 'dq.caidaSintaxis', 'dq.caidaPermiso', 'dq.caidaDisco', 'dq.caidaDesconocida']) expect(typeof textos[k], k).toBe('string');
    }
    expect(String(es['servidor.sinRespuesta'])).toMatch(/cierra esta pestaña/);
    expect(String(en['servidor.sinRespuesta'])).toMatch(/close this tab/);
  });

  it('los avisos nombran la carpeta del Studio entera, con el doble clic primero y «npm run encender» después (nmw71bfm4tit)', () => {
    for (const textos of [es, en] as Record<string, unknown>[]) {
      for (const k of ['servidor.sinRespuesta', 'fijos.servidorNoResponde', 'dq.caida', 'servidor.caidoTexto']) {
        const texto = String(textos[k]);
        expect(texto, k).toContain('{carpeta}');
        expect(texto.indexOf('«Abrir STL Studio.cmd»'), k).toBeLessThan(texto.indexOf(k === 'servidor.caidoTexto' ? 'terminal' : 'npm run encender'));
        expect(texto.indexOf('{carpeta}'), k).toBeLessThan(texto.indexOf('«Abrir STL Studio.cmd»'));
      }
      expect(String(textos['servidor.carpetaConRuta'])).toContain('{ruta}');
    }
    // La página la guarda mientras el servidor responde y la nombra cuando ya no responde
    const app = leer('estudio/src/app.ts');
    expect(app).toContain('guardarCarpetaDelStudio(r?.carpeta);');
    expect(app).toContain("const SIN_SERVIDOR = () => tx('servidor.sinRespuesta', { carpeta: laCarpetaDelStudio() });");
    expect(app).toContain("texto: tx('servidor.caidoTexto', { carpeta: laCarpetaDelStudio() })");
    expect(leer('estudio/src/textosFijos.ts')).toContain("t('fijos.servidorNoResponde', { carpeta: laCarpetaDelStudio() })");
  });

  it('la falla con la que la página no cargó queda en .estudio/fallas.json, 90 días (pd_salud_a, nmw9ltx31tit)', () => {
    const carpeta = mkdtempSync(join(tmpdir(), 'stl-fallas-'));
    carpetas.push(carpeta);
    expect(leerFallas(carpeta)).toEqual([]);
    const ahora = Date.parse('2026-11-09T19:00:00.000Z');
    const vieja = fallaValida({ cuando: new Date(ahora - (DIAS_FALLAS + 1) * 864e5).toISOString(), mensaje: 'vieja' })!;
    anotarFalla(carpeta, vieja, ahora - (DIAS_FALLAS + 1) * 864e5);
    const nueva = fallaValida({ cuando: '2026-11-09T18:59:00.000Z', mensaje: 'Error forzado', traza: 'at app.ts:1', donde: 'error', otra: 'x' })!;
    expect(nueva).toEqual({ cuando: '2026-11-09T18:59:00.000Z', mensaje: 'Error forzado', traza: 'at app.ts:1', donde: 'error', tipo: 'carga', causa: 'desconocida' });
    const lista = anotarFalla(carpeta, nueva, ahora);
    // La de más de 90 días se borró al guardar la nueva
    expect(lista.map((f) => f.mensaje)).toEqual(['Error forzado']);
    expect(JSON.parse(readFileSync(join(carpeta, 'fallas.json'), 'utf8'))).toEqual(lista);
    // Sin mensaje no es una falla; sin fecha válida, la de ahora
    expect(fallaValida({ mensaje: '  ' })).toBeNull();
    expect(fallaValida(null)).toBeNull();
    expect(fallaValida({ mensaje: 'x', cuando: 'ayer' }, '2026-11-09T00:00:00.000Z')?.cuando).toBe('2026-11-09T00:00:00.000Z');
    expect(fallaValida({ mensaje: 'x'.repeat(20_000) })!.mensaje.length).toBe(8000);
    expect(fallasVigentes([], ahora)).toEqual([]);
    // El servidor la recibe en /falla, junto a /caida
    const api = leer('estudio/servidor/api.ts');
    expect(api).toContain("if (ruta === '/falla' && req.method === 'POST') {\n            const falla = fallaValida(await leerCuerpo(req));");
    expect(api).toContain("anotarFalla(join(raiz, '.estudio'), falla);");
  });

  it('cada falla con su causa, sin el modelo (pd_salud_d; nmw9rdisqtit)', () => {
    expect(causaDeFalla('TypeError: x is not a function')).toBe('codigo');
    expect(causaDeFalla('Cannot find module ./voz')).toBe('codigo');
    expect(causaDeFalla('Error: ENOSPC: no space left on device')).toBe('computador');
    expect(causaDeFalla('JavaScript heap out of memory')).toBe('computador');
    expect(causaDeFalla('Claude AI usage limit reached')).toBe('cuenta');
    expect(causaDeFalla('API Error: 529 overloaded')).toBe('modelo');
    expect(causaDeFalla('algo raro')).toBe('desconocida');
  });

  it('cuenta las revisiones que no cerraron, no la que detuviste ni la que se cortó por su tiempo (nmw9rdn3xtit)', () => {
    const f = { que: 'No terminó', porque: 'Claude Code se detuvo: TypeError en bandeja.ts', cuando: '2026-11-09T10:00:00.000Z', registro: '.revisiones/x.log' };
    expect(fallaDeRevision(f)).toMatchObject({ tipo: 'revision', causa: 'codigo', traza: '.revisiones/x.log' });
    expect(fallaDeRevision({ ...f, accion: 'cuenta', porque: 'sin detalle' })?.causa).toBe('cuenta');
    expect(fallaDeRevision(f, { detenida: true })).toBeNull();
    expect(fallaDeRevision(f, { porTiempo: true })).toBeNull();
  });

  it('una línea por causa en 90 días, sin las de prueba, y dos seguidas con la misma causa (nmw9ofvc7tit, nmw9p97xwtit)', () => {
    const f = (cuando: string, mensaje: string, extra: Partial<FallaGuardada> = {}): FallaGuardada => ({ cuando, mensaje, traza: 't', donde: 'error', ...extra });
    const lista = [
      f('2026-10-01T00:00:00.000Z', 'TypeError: a'),
      f('2026-10-20T00:00:00.000Z', 'ENOSPC'),
      f('2026-11-01T00:00:00.000Z', 'Error forzado', { prueba: true, causa: 'desconocida' }),
      f('2026-11-05T00:00:00.000Z', 'ReferenceError: b'),
    ];
    const r = resumenDeFallas(lista);
    expect(r.fallas.map((x) => [x.causa, x.n])).toEqual([['codigo', 2], ['computador', 1]]);
    expect(r.fallas[0].ultima.mensaje).toBe('ReferenceError: b');
    // Las dos últimas: computador y código, no seguidas
    expect(r.dosSeguidas).toBeNull();
    const dos = [...lista, f('2026-11-08T00:00:00.000Z', 'TypeError: c')];
    expect(resumenDeFallas(dos).dosSeguidas).toBe('codigo');
    // Oprimir «Diagnosticar y reparar» después de la primera la quita
    expect(resumenDeFallas(dos, '2026-11-06T00:00:00.000Z').dosSeguidas).toBeNull();
  });

  it('una caída del servidor también cuenta como falla, con su causa', () => {
    const carpeta = mkdtempSync(join(tmpdir(), 'stl-caida-falla-'));
    carpetas.push(carpeta);
    anotarCaida(carpeta, 1, 'arranca\nError: listen EADDRINUSE: address already in use', '2026-11-09T10:00:00.000Z');
    expect(leerFallas(carpeta, Date.parse('2026-11-09T11:00:00.000Z'))).toMatchObject([{ tipo: 'servidor', causa: 'computador' }]);
  });

  it('la carpeta se guarda solo si es una ruta, y sin ella el aviso dice «la carpeta del Studio»', async () => {
    const { carpetaGuardada, guardarCarpetaDelStudio, laCarpetaDelStudio } = await import('../src/carpetaDelStudio.ts');
    const mapa = new Map<string, string>();
    const almacen = { getItem: (k: string) => mapa.get(k) ?? null, setItem: (k: string, v: string) => void mapa.set(k, v) };
    expect(carpetaGuardada(almacen)).toBe('');
    guardarCarpetaDelStudio(undefined, almacen);
    guardarCarpetaDelStudio('   ', almacen);
    expect(carpetaGuardada(almacen)).toBe('');
    guardarCarpetaDelStudio('C:\\xampp2024\\htdocs\\www\\STL', almacen);
    expect(carpetaGuardada(almacen)).toBe('C:\\xampp2024\\htdocs\\www\\STL');
    expect(laCarpetaDelStudio('C:\\xampp2024\\htdocs\\www\\STL')).toBe('la carpeta del Studio, C:\\xampp2024\\htdocs\\www\\STL,');
    expect(laCarpetaDelStudio('')).toBe('la carpeta del Studio');
  });
});
