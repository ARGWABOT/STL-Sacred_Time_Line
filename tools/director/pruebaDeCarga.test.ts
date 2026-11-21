// La prueba antes de cerrar (pd_salud_a; nmw9gqf1ptit, nmw9lrvnrtit): --listo no cierra si la página del Studio no carga,
// y en un computador sin Edge ni Chrome (o con el Studio apagado) cierra con un aviso en su mensaje.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { argumentosPruebaDeCarga, cierreConCarga, URL_PRUEBA_CARGA, veredictoDeCarga } from '../../src/director/mirada.ts';
import { probarCarga } from './pruebaDeCarga.ts';

const CARGADO = '<html lang="en" class="oscuro" data-estudio="cargado"><head></head><body>…</body></html>';
const FALLO = '<html lang="en" data-estudio="fallo"><body><div class="emergencia-fallo">TypeError: x is undefined</div></body></html>';
const COLGADO = '<html lang="en"><body><div class="cubierta-carga"></div></body></html>';

describe('la prueba antes de cerrar', () => {
  it('lee en la etiqueta html si el Studio cargó, si salió la pantalla de emergencia o si no terminó', () => {
    expect(veredictoDeCarga(CARGADO)).toEqual({ estado: 'cargo' });
    expect(veredictoDeCarga(FALLO)).toEqual({ estado: 'fallo', detalle: 'TypeError: x is undefined' });
    expect(veredictoDeCarga(COLGADO, '[1:2:INFO:CONSOLE(3)] "Uncaught SyntaxError: Unexpected token"')).toEqual({ estado: 'no_termino', detalle: '"Uncaught SyntaxError: Unexpected token"' });
    expect(veredictoDeCarga('')).toEqual({ estado: 'no_termino', detalle: 'el navegador no devolvió la página' });
    // Una marca en otra etiqueta no cuenta
    expect(veredictoDeCarga('<html><body data-estudio="cargado"></body></html>').estado).toBe('no_termino');
  });

  it('abre sin pantalla, con su perfil aparte, y devuelve el DOM', () => {
    const a = argumentosPruebaDeCarga(URL_PRUEBA_CARGA, 'C:/tmp/p');
    expect(a).toContain('--headless=new');
    expect(a).toContain('--dump-dom');
    expect(a).toContain('--user-data-dir=C:/tmp/p');
    expect(a.at(-1)).toBe('http://localhost:5180/?mirar');
  });

  it('no cierra si la página no carga, y dice cómo mirarla', () => {
    for (const r of [veredictoDeCarga(FALLO), veredictoDeCarga(COLGADO)]) {
      const c = cierreConCarga(r);
      expect(c.cierra).toBe(false);
      expect(c.texto).toMatch(/^Review not closed/);
      expect(c.texto).toContain('mirar.ts --carga');
      expect(c.aviso).toBeUndefined();
    }
    expect(cierreConCarga({ estado: 'cargo' })).toMatchObject({ cierra: true });
    expect(cierreConCarga({ estado: 'cargo' }).aviso).toBeUndefined();
  });

  it('sin Edge ni Chrome cierra con un aviso en el mensaje, en el idioma de la interfaz, que dice qué instalar (nmw9lrvnrtit)', () => {
    const en = cierreConCarga({ estado: 'sin_navegador' }, 'en');
    expect(en.cierra).toBe(true);
    expect(en.aviso).toMatch(/^- \*\*About the closing test:\*\*/);
    expect(en.aviso).toContain('Microsoft Edge or Google Chrome');
    const es = cierreConCarga({ estado: 'sin_navegador' }, 'es');
    expect(es.aviso).toMatch(/^- \*\*Sobre la prueba de cierre:\*\*/);
    expect(cierreConCarga({ estado: 'sin_servidor' }, 'en')).toMatchObject({ cierra: true });
  });

  it('corre el navegador solo si hay uno y el Studio responde', async () => {
    let corrio = 0;
    const ejecutar = async () => { corrio++; return { stdout: CARGADO, stderr: '' }; };
    expect(await probarCarga({ navegador: null, ejecutar })).toEqual({ estado: 'sin_navegador' });
    expect(await probarCarga({ navegador: 'edge.exe', servidorVivo: async () => false, ejecutar })).toEqual({ estado: 'sin_servidor' });
    expect(corrio).toBe(0);
    expect(await probarCarga({ navegador: 'edge.exe', servidorVivo: async () => true, ejecutar })).toEqual({ estado: 'cargo' });
    expect(await probarCarga({ navegador: 'edge.exe', servidorVivo: async () => true, ejecutar: async () => ({ stdout: FALLO, stderr: '' }) })).toMatchObject({ estado: 'fallo' });
    expect(corrio).toBe(1);
  });

  it('--listo la corre antes de marcar la revisión, y no cierra si no carga', () => {
    const bandeja = readFileSync('tools/director/bandeja.ts', 'utf8');
    const prueba = bandeja.indexOf('const carga = cierreConCarga(await probarCarga()');
    expect(prueba).toBeGreaterThan(0);
    expect(prueba).toBeLessThan(bandeja.indexOf('plan.revisado = new Date().toISOString();'));
    expect(bandeja).toContain("if (!carga.cierra) {\n    console.error(carga.texto);\n    process.exit(1);\n  }");
    expect(bandeja).toContain('if (carga.aviso) plan.mensaje =');
    expect(readFileSync('tools/director/mirar.ts', 'utf8')).toContain("if (args.includes('--carga')) {");
    // Los Estudios temporales de las pruebas y de la medición no abren el Studio real, ni heredan la barrera de la revisión
    const prueba2 = readFileSync('tools/director/estudioDePrueba.ts', 'utf8');
    expect(prueba2).toContain("entorno[SIN_PRUEBA_DE_CARGA] = '1';");
    expect(prueba2).toContain('delete entorno.STL_REVISION_PROYECTO;');
    expect(cierreConCarga({ estado: 'omitida' })).toMatchObject({ cierra: true });
    expect(cierreConCarga({ estado: 'omitida' }).aviso).toBeUndefined();
  });
});
