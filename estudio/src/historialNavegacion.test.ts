// El historial de navegación del Studio (nota nmwavgy3btit): el botón «Atrás» del navegador vuelve a la sección, o a la
// pestaña de «Proyecto», desde la que se llegó.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { claveDeLugar, estadoDeLugar, lugarDeEstado, pasoDeHistorial } from './historialNavegacion';

const VISTAS = ['misiones', 'proyecto', 'ruta'];
const PESTANAS = ['objetivo', 'diagnostico', 'equipo'];

describe('el historial de navegación (nota nmwavgy3btit)', () => {
  it('la primera pintada reemplaza la entrada, otro lugar suma una, y el mismo no hace nada', () => {
    expect(pasoDeHistorial(null, { vista: 'misiones' }, null)).toBe('reemplazar');
    // Al recargar, el navegador conserva el estado de la entrada: igual se reemplaza, sin duplicarla
    expect(pasoDeHistorial(null, { vista: 'misiones' }, estadoDeLugar({ vista: 'ruta' }))).toBe('reemplazar');
    const estado = estadoDeLugar({ vista: 'misiones' });
    expect(pasoDeHistorial('misiones', { vista: 'misiones' }, estado)).toBe('nada');
    expect(pasoDeHistorial('misiones', { vista: 'proyecto', pestana: 'objetivo' }, estado)).toBe('empujar');
    // Cambiar de pestaña en «Proyecto» también es navegar
    expect(pasoDeHistorial('proyecto:objetivo', { vista: 'proyecto', pestana: 'diagnostico' }, estadoDeLugar({ vista: 'proyecto', pestana: 'objetivo' }))).toBe('empujar');
    // Una entrada sin lugar del Studio se reemplaza
    expect(pasoDeHistorial('misiones', { vista: 'ruta' }, { otro: 1 })).toBe('reemplazar');
    expect(claveDeLugar({ vista: 'proyecto', pestana: 'equipo' })).toBe('proyecto:equipo');
  });

  it('una entrada se sigue solo si es del Studio y su sección existe; la pestaña, solo si existe', () => {
    expect(lugarDeEstado(estadoDeLugar({ vista: 'proyecto', pestana: 'diagnostico' }), VISTAS, PESTANAS)).toEqual({ vista: 'proyecto', pestana: 'diagnostico' });
    expect(lugarDeEstado({ stl: { vista: 'proyecto', pestana: 'otra' } }, VISTAS, PESTANAS)).toEqual({ vista: 'proyecto' });
    expect(lugarDeEstado({ stl: { vista: 'nada' } }, VISTAS, PESTANAS)).toBeNull();
    expect(lugarDeEstado(null, VISTAS, PESTANAS)).toBeNull();
    expect(lugarDeEstado({ vista: 'ruta' }, VISTAS, PESTANAS)).toBeNull();
  });

  it('la página anota cada pintada, vuelve con popstate sin sumar otra entrada, y limpiar la dirección conserva el lugar', () => {
    const app = readFileSync(join(__dirname, 'app.ts'), 'utf-8');
    const pintar = app.slice(app.indexOf('function pintar() {'), app.indexOf('const seccionesVistas'));
    expect(pintar).toContain('anotarLugar();');
    expect(app).toContain('if (paso === \'reemplazar\') history.replaceState(estadoDeLugar(lugar), \'\');');
    expect(app).toContain('else if (paso === \'empujar\') history.pushState(estadoDeLugar(lugar), \'\');');
    const volver = app.slice(app.indexOf("window.addEventListener('popstate'"), app.indexOf('// ───────────────────────────────────────────── eventos'));
    expect(volver.indexOf('lugarAnotado = claveDeLugar(lugar);')).toBeLessThan(volver.indexOf('irA(lugar.vista as Vista);'));
    expect(app).toContain("history.replaceState(history.state, '', location.pathname);");
    expect(app).not.toContain("history.replaceState(null, '', location.pathname);");
  });
});
