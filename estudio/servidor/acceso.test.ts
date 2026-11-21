import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { candadosDelAtajo, direccionDeLaPuerta, INTERRUPTOR_PUERTA } from '../../src/director/atajo';
import { respondeEnLocal } from './acceso';

const atajo = { url: 'http://localhost:8000/pedidos', rol: 'gerente', como: 'the manager' };

describe('los tres candados de la puerta, en la ruta del Studio (nmwejhse4tit)', () => {
  it('sin el archivo interruptor, la puerta no se abre', () => {
    expect(candadosDelAtajo({ atajo, direccion: '127.0.0.1', interruptor: false })).toBe('sinInterruptor');
    expect(candadosDelAtajo({ atajo, direccion: '127.0.0.1', interruptor: true })).toBeNull();
  });

  it('desde una dirección que no es de esta máquina, se rechaza', () => {
    expect(candadosDelAtajo({ atajo, direccion: '192.168.0.12', interruptor: true })).toBe('deAfuera');
    expect(candadosDelAtajo({ atajo, direccion: undefined, interruptor: true })).toBe('deAfuera');
    expect(candadosDelAtajo({ atajo, direccion: '::1', interruptor: true })).toBeNull();
  });

  it('hacia una dirección que no es local, el Studio no enlaza', () => {
    expect(candadosDelAtajo({ atajo: { ...atajo, url: 'https://idg.example.com/pedidos' }, direccion: '127.0.0.1', interruptor: true })).toBe('noLocal');
    expect(candadosDelAtajo({ atajo: { ...atajo, url: 'http://localhost.example.com/' }, direccion: '127.0.0.1', interruptor: true })).toBe('noLocal');
    expect(candadosDelAtajo({ atajo: undefined, direccion: '127.0.0.1', interruptor: true })).toBe('sinAtajo');
  });

  it('saber si la aplicación responde no pide el interruptor, pero sí los otros dos', () => {
    expect(candadosDelAtajo({ atajo, direccion: '127.0.0.1' })).toBeNull();
    expect(candadosDelAtajo({ atajo, direccion: '10.0.0.5' })).toBe('deAfuera');
  });

  it('la ruta del Studio pasa los tres candados antes de llevar a la puerta, y la dirección sale del plan', () => {
    const api = readFileSync(new URL('./api.ts', import.meta.url), 'utf-8');
    const ruta = api.slice(api.indexOf("if ((ruta === '/atajo'"), api.indexOf("if (ruta === '/terminal'"));
    expect(ruta).toContain('candadosDelAtajo(');
    expect(ruta).toContain('req.socket.remoteAddress');
    expect(ruta).toContain('INTERRUPTOR_PUERTA');
    expect(ruta).toContain('leerPlan(id)');
    expect(ruta.indexOf('if (falla')).toBeLessThan(ruta.indexOf('direccionDeLaPuerta('));
    expect(INTERRUPTOR_PUERTA).toBe('.stl-puerta');
    expect(direccionDeLaPuerta(atajo)).toBe('http://localhost:8000/__stl/puerta?rol=gerente&ir=%2Fpedidos');
  });
});

describe('«Arranca <proyecto> primero»: si la aplicación responde (nmwf5tf1stit)', () => {
  it('una aplicación encendida responde; apagada, no; y una dirección de afuera nunca se consulta', async () => {
    const servidor = createServer((_, res) => res.writeHead(302, { Location: '/login' }).end());
    await new Promise<void>((r) => servidor.listen(0, '127.0.0.1', r));
    const puerto = (servidor.address() as AddressInfo).port;
    expect(await respondeEnLocal(`http://127.0.0.1:${puerto}/pedidos`)).toBe(true);
    await new Promise<void>((r) => servidor.close(() => r()));
    expect(await respondeEnLocal(`http://127.0.0.1:${puerto}/pedidos`)).toBe(false);
    expect(await respondeEnLocal('https://example.com/')).toBe(false);
  });
});

describe('la sesión del atajo termina al cerrarse su ventana (nmwflqauvtit)', () => {
  it('la página vigila la pestaña del proyecto y, cerrada, pide a la puerta cerrar la sesión', () => {
    const app = readFileSync(new URL('../src/app.ts', import.meta.url), 'utf-8');
    const vigia = app.slice(app.indexOf('function vigilarVentanaDelAtajo'), app.indexOf('function vigilarVentanaDelAtajo') + 700);
    expect(vigia).toContain('ventana.closed');
    expect(vigia).toContain('a.salida');
    // En la pestaña de su proyecto, reusada en cada clic y sin soltar su `opener` (nmwo5rfhctit)
    // Y esa pestaña es la de QA del proyecto (pd_pestana_qa): la aplicación dentro de un marco
    expect(app).toContain('const ventana = abrirElAtajo(direccionQa(mision, paso), proyecto);');
    expect(app).not.toMatch(/opener\s*=\s*null/);
  });
});
