import { describe, expect, it } from 'vitest';
import { direccionDeLaPuerta, direccionDeSalida, esDireccionLocal, esPeticionLocal, problemaDelAtajo, rolQueReemplaza, ventanaDelAtajo } from './atajo';

const atajo = { url: 'http://localhost:8000/pedidos?x=1', rol: 'gerente', como: 'the manager', arranque: 'npm run dev' };

describe('El atajo de un paso a la aplicación local (pd_acceso_directo)', () => {
  it('solo enlaza a una dirección de este computador', () => {
    expect(esDireccionLocal('http://localhost:8000/x')).toBe(true);
    expect(esDireccionLocal('http://127.0.0.1/')).toBe(true);
    expect(esDireccionLocal('http://[::1]:3000/')).toBe(true);
    expect(esDireccionLocal('https://idg.example.com/')).toBe(false);
    expect(esDireccionLocal('http://localhost.evil.com/')).toBe(false);
    expect(esDireccionLocal('http://user:pw@localhost/')).toBe(false);
    expect(esDireccionLocal('file:///C:/x')).toBe(false);
    expect(esDireccionLocal('javascript:alert(1)')).toBe(false);
    expect(esDireccionLocal('no es una dirección')).toBe(false);
  });

  it('solo acepta peticiones de esta misma máquina', () => {
    expect(esPeticionLocal('127.0.0.1')).toBe(true);
    expect(esPeticionLocal('::1')).toBe(true);
    expect(esPeticionLocal('::ffff:127.0.0.1')).toBe(true);
    expect(esPeticionLocal('192.168.1.20')).toBe(false);
    expect(esPeticionLocal(undefined)).toBe(false);
  });

  it('valida el campo del paso: dirección local, rol y cómo se dice', () => {
    expect(problemaDelAtajo(atajo)).toBeNull();
    expect(problemaDelAtajo({ ...atajo, url: 'https://example.com/' })).toMatch(/dirección de este computador/);
    expect(problemaDelAtajo({ ...atajo, rol: 'ge rente' })).toMatch(/rol/);
    expect(problemaDelAtajo({ ...atajo, como: ' ' })).toMatch(/como/);
    expect(problemaDelAtajo({ ...atajo, arranque: 'a\nb' })).toMatch(/arranque/);
    expect(problemaDelAtajo('x')).toMatch(/objeto/);
  });

  it('abre la puerta con el rol y la página, y la cierra en el mismo origen', () => {
    expect(direccionDeLaPuerta(atajo)).toBe('http://localhost:8000/__stl/puerta?rol=gerente&ir=%2Fpedidos%3Fx%3D1');
    expect(direccionDeSalida(atajo)).toBe('http://localhost:8000/__stl/puerta/salir');
  });

  it('usa una pestaña por proyecto y dice el rol que reemplaza (un rol a la vez)', () => {
    expect(ventanaDelAtajo('app')).toBe('stl-atajo-app');
    expect(ventanaDelAtajo('mi proyecto')).toBe('stl-atajo-mi_proyecto');
    expect(rolQueReemplaza(atajo, undefined)).toBeNull();
    expect(rolQueReemplaza(atajo, { rol: 'gerente', como: 'the manager' })).toBeNull();
    expect(rolQueReemplaza(atajo, { rol: 'vendedor', como: 'the seller' })).toBe('the seller');
  });
});
