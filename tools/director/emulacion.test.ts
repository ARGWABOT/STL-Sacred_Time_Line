// mirar.ts --emular: el teléfono se pone por el protocolo de depuración, porque la ventana sin pantalla no baja de ~492 px
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ordenesDeEmulacion } from './emulacion.ts';

describe('mirar.ts --emular: la pantalla de un teléfono de verdad', () => {
  it('pone el ancho y el alto pedidos, como teléfono y con toque, sin escala', () => {
    const [medidas, toque] = ordenesDeEmulacion(390, 844);
    expect(medidas).toEqual({ metodo: 'Emulation.setDeviceMetricsOverride', params: { width: 390, height: 844, deviceScaleFactor: 1, mobile: true } });
    expect(toque.metodo).toBe('Emulation.setTouchEmulationEnabled');
    expect(toque.params.enabled).toBe(true);
    expect(ordenesDeEmulacion(360, 780)[0].params).toMatchObject({ width: 360, height: 780 });
  });

  it('mirar.ts lo ofrece con --emular y dice en su cabecera por qué (la ventana sin pantalla mide 492 de ancho como mínimo)', () => {
    const mirar = readFileSync(join(import.meta.dirname, 'mirar.ts'), 'utf8');
    expect(mirar).toContain("args.includes('--emular')");
    expect(mirar).toContain('ordenesDeEmulacion(a.ancho, a.alto)');
    expect(mirar).toContain('Page.captureScreenshot');
    expect(mirar.split('\n').slice(0, 17).join('\n')).toContain('--emular');
  });
});
