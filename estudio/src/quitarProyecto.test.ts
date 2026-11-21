// «Quitarlo de este Studio» no se queda colgado ni dice que falló lo que sí salió (auditoría de la entrega, punto 7, nota
// nmwcebe0otit): la lista de lo que se borra se espera con tope, y un proyecto ya quitado cuya página no se pudo traer de
// nuevo dice que salió, con cómo verlo.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { en } from './textos/en';
import { es } from './textos/es';

const app = readFileSync(join(__dirname, 'app.ts'), 'utf-8').replace(/\r\n/g, '\n');
const tramo = (desde: string, hasta: string) => app.slice(app.indexOf(desde), app.indexOf(hasta, app.indexOf(desde) + desde.length));

describe('«Quitarlo de este Studio», sin colgarse (auditoría de la entrega, punto 7)', () => {
  it('la lista de lo que se borra se espera con tope, y si tarda lo dice', () => {
    const pedir = tramo('async function pedirListaQuitar(', '\n}\n');
    expect(app).toContain('const TOPE_LISTA_QUITAR_MS = 30_000;');
    expect(pedir).toContain('signal: AbortSignal.timeout(TOPE_LISTA_QUITAR_MS)');
    expect(pedir).toContain("tx('proyecto.quitarTardo')");
    expect(String(en['proyecto.quitarTardo'])).toMatch(/try again/);
    expect(String(es['proyecto.quitarTardo'])).toMatch(/inténtalo de nuevo/);
  });

  it('un proyecto ya quitado no dice que falló si la página no se pudo traer de nuevo', () => {
    const confirmar = tramo('async function confirmarQuitar(', '\n}\n');
    // Lo que falla dentro del try es solo el borrado; traer el Studio de nuevo va después, fuera de él
    const intento = confirmar.slice(confirmar.indexOf('try {'), confirmar.indexOf('} catch'));
    expect(intento).not.toContain('cargar(true)');
    expect(confirmar.indexOf('await cargar(true).then(() => true, () => false)')).toBeGreaterThan(confirmar.indexOf('} catch'));
    expect(confirmar).toContain("tx('proyecto.quitarSinRecargar')");
  });
});
