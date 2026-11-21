// El audio de una nota, por partes (nota nmwk9fcimtit): 206 con su Content-Range, para que la barra y el tiempo correspondan.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { rangoPedido, responderConRango, type RespuestaConRango } from './rangos';

function respuesta() {
  const cabeceras: Record<string, string> = {};
  let cuerpo: Buffer | undefined;
  const res: RespuestaConRango = { statusCode: 0, setHeader: (n, v) => { cabeceras[n] = v; }, end: (d) => { cuerpo = d; } };
  return { res, cabeceras, cuerpo: () => cuerpo };
}

describe('servir un audio por partes (nmwk9fcimtit)', () => {
  const datos = Buffer.from('0123456789');

  it('lee la parte pedida, y lo que no cabe', () => {
    expect(rangoPedido(undefined, 10)).toBeNull();
    expect(rangoPedido('bytes=0-', 10)).toEqual({ inicio: 0, fin: 9 });
    expect(rangoPedido('bytes=2-5', 10)).toEqual({ inicio: 2, fin: 5 });
    expect(rangoPedido('bytes=8-50', 10)).toEqual({ inicio: 8, fin: 9 });
    expect(rangoPedido('bytes=-3', 10)).toEqual({ inicio: 7, fin: 9 });
    expect(rangoPedido('bytes=10-', 10)).toBe('fuera');
    expect(rangoPedido('bytes=5-2', 10)).toBe('fuera');
    // Varias partes o algo raro: se sirve entero
    expect(rangoPedido('bytes=0-1,4-5', 10)).toBeNull();
    expect(rangoPedido('items=0-1', 10)).toBeNull();
  });

  it('con Range, responde 206 con el Content-Range correcto y solo esa parte', () => {
    const r = respuesta();
    responderConRango(r.res, 'bytes=2-5', datos);
    expect(r.res.statusCode).toBe(206);
    expect(r.cabeceras['Content-Range']).toBe('bytes 2-5/10');
    expect(r.cabeceras['Accept-Ranges']).toBe('bytes');
    expect(r.cabeceras['Content-Length']).toBe('4');
    expect(r.cuerpo()?.toString()).toBe('2345');
  });

  it('sin Range, el archivo entero (200), diciendo que acepta partes; fuera del archivo, 416', () => {
    const entero = respuesta();
    responderConRango(entero.res, undefined, datos);
    expect(entero.res.statusCode).toBe(200);
    expect(entero.cabeceras['Accept-Ranges']).toBe('bytes');
    expect(entero.cuerpo()?.toString()).toBe('0123456789');
    const fuera = respuesta();
    responderConRango(fuera.res, 'bytes=20-', datos);
    expect(fuera.res.statusCode).toBe(416);
    expect(fuera.cabeceras['Content-Range']).toBe('bytes */10');
  });

  it('el audio de las notas se sirve así en GET /archivo', () => {
    const api = readFileSync(join(__dirname, 'api.ts'), 'utf-8');
    const archivo = api.slice(api.indexOf("if (ruta === '/archivo' && req.method === 'GET')"), api.indexOf("if (ruta === '/ver' && req.method === 'GET')"));
    expect(archivo).toContain('if (m) return responderConRango(res, req.headers.range, datos);');
  });
});
