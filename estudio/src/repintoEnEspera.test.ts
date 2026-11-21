import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LIBRE_SEGUIDAS, MS_MIRAR_LIBRE, repintoEnEspera } from './repintoEnEspera';

const leer = (ruta: string) => readFileSync(join(__dirname, ruta), 'utf-8').replace(/\r\n/g, '\n');

describe('lo que llega de fondo no interrumpe lo que se narra (notas de voz del titular nmvzo5gmhtit y nmvzo6jjktit)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('una transcripción terminada, con la narración en marcha, no pinta; lo pendiente llega al quedar libre, una sola vez', () => {
    let narrando = true;
    const pintar = vi.fn();
    const r = repintoEnEspera({ ocupado: () => narrando, pintar });
    expect(r.pedir()).toBe(false);
    expect(r.pedir()).toBe(false);
    vi.advanceTimersByTime(MS_MIRAR_LIBRE * 20);
    expect(pintar).not.toHaveBeenCalled();
    narrando = false;
    vi.advanceTimersByTime(MS_MIRAR_LIBRE * LIBRE_SEGUIDAS);
    expect(pintar).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(MS_MIRAR_LIBRE * 20);
    expect(pintar).toHaveBeenCalledTimes(1);
  });

  it('sin narración pinta de una vez', () => {
    const pintar = vi.fn();
    expect(repintoEnEspera({ ocupado: () => false, pintar }).pedir()).toBe(true);
    expect(pintar).toHaveBeenCalledTimes(1);
  });

  it('el instante libre entre un bloque y el siguiente no cuenta', () => {
    let narrando = true;
    const pintar = vi.fn();
    const r = repintoEnEspera({ ocupado: () => narrando, pintar });
    r.pedir();
    narrando = false;
    vi.advanceTimersByTime(MS_MIRAR_LIBRE);
    narrando = true;
    vi.advanceTimersByTime(MS_MIRAR_LIBRE * 5);
    expect(pintar).not.toHaveBeenCalled();
  });

  it('si otro repintado ya lo trajo, no queda nada pendiente', () => {
    let narrando = true;
    const pintar = vi.fn();
    const r = repintoEnEspera({ ocupado: () => narrando, pintar });
    r.pedir();
    r.cancelar();
    narrando = false;
    vi.advanceTimersByTime(MS_MIRAR_LIBRE * 5);
    expect(pintar).not.toHaveBeenCalled();
  });

  it('lo de fondo pasa por la espera: la consulta, la respuesta del servidor y el paso que se marca solo; y la recarga espera también', () => {
    const app = leer('app.ts');
    const cargar = app.match(/async function cargar\(fresco = false\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(cargar).toContain('repintoDeFondo.pedir()');
    expect(cargar).not.toMatch(/if \(cambio\) pintar\(\)/);
    expect(app).toMatch(/darDatosDirector\(d\);\n\s*repintoDeFondo\.pedir\(\);/);
    expect(app).toMatch(/pasoRecien = avance [^\n]*\n\s*repintoDeFondo\.pedir\(\);/);
    expect(app).toMatch(/function pintar\(\) \{[\s\S]{0,200}repintoDeFondo\.cancelar\(\);/);
    expect(app).toContain('if (ocupado() || narrando()) return false;');
  });
});
