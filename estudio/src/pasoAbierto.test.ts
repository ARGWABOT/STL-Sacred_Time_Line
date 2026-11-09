import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { seQuedaEnLaVista } from './util';

const director = readFileSync(join(__dirname, 'app.ts'), 'utf-8');

describe('el botón de un paso que no cambia de vista (nota del titular nmvu02yqetit)', () => {
  it('el diálogo para escribirle y una página de afuera dejan a la persona donde estaba', () => {
    expect(seQuedaEnLaVista({ vista: 'buzon', ancla: 'escribir' })).toBe(true);
    expect(seQuedaEnLaVista({ url: 'https://example.com' })).toBe(true);
    expect(seQuedaEnLaVista({ vista: 'buzon' })).toBe(false);
    expect(seQuedaEnLaVista({ vista: 'ruta', ancla: 'r-plan' })).toBe(false);
  });

  it('al cerrar el diálogo, también con «Cancelar», el paso se repinta con sus opciones encendidas', () => {
    const manejo = director.match(/\} else if \(ds\.destino !== undefined\) \{[\s\S]*?\n {2}\} else if/)?.[0] ?? '';
    // El botón ya cuenta como abierto antes de ir, y después de volver se repinta
    expect(manejo.indexOf("localStorage.setItem(claveAbierto(abre[0], Number(abre[1])), '1')")).toBeGreaterThan(-1);
    expect(manejo).toContain('await ir(dest);');
    expect(manejo).toContain('if (abre && dest && seQuedaEnLaVista(dest)) pintar();');
    expect(manejo.indexOf('await ir(dest);')).toBeLessThan(manejo.indexOf('seQuedaEnLaVista(dest)'));
  });
});
