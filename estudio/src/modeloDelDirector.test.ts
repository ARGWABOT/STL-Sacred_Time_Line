// La pestaña «El director» de «Modelo y consumo», en su módulo (propuesta aceptada pr_partir_modulos): se prueba con
// datos hechos a mano, sin la página.
import { describe, expect, it } from 'vitest';
import { nombreEsfuerzo, nombreModelo, seccionDirector, type DatosDirector } from './modeloDelDirector';
import type { Lanzamiento } from './vistaGasto';

const datos = (x: Partial<DatosDirector> = {}): DatosDirector => ({
  modelo: 'claude-opus-5-5', esfuerzo: 'high', esfuerzoGuardado: 'high', ultracode: false, ultracodeDirector: false, todoConElModelo: false, consumo: [], ahora: new Date('2026-10-29T19:00:00.000Z'), ...x,
});
const lanzamiento = (x: Partial<Lanzamiento>): Lanzamiento => ({
  cuando: '2026-10-29T18:00:00.000Z', proyecto: 'stl-studio', tipo: 'revision', modelo: 'claude-opus-5-5', entrada: 1, cache: 1, salida: 1, limites: null, ...x,
});

describe('«El director», aparte de app.ts (pr_partir_modulos)', () => {
  it('el nombre de un modelo sale de la lista o de su id, y el de un esfuerzo, en minúsculas', () => {
    expect(nombreModelo('claude-opus-5-5')).toBe('Opus 5.5');
    expect(nombreModelo('claude-haiku-4-5-20251001')).toBe('Haiku 4.5');
    expect(nombreModelo('otro')).toBe('otro');
    expect(nombreEsfuerzo('max')).toBe('máximo');
    expect(nombreEsfuerzo('raro')).toBe('raro');
  });

  it('el modelo y el esfuerzo elegidos van marcados, y un modelo escrito a mano entra en la lista', () => {
    const html = seccionDirector(datos({ modelo: 'claude-x-9' }));
    expect(html).toContain('data-ancla="m-director"');
    expect(html).toContain('<option value="claude-x-9" selected>claude-x-9</option>');
    expect(html).toContain('<option value="high" selected>Alto</option>');
  });

  it('el modelo y el esfuerzo con su cargador: apagado ya, el círculo a los 500 ms al lado y la línea roja si falla (nmwkbkofitit)', () => {
    const normal = seccionDirector(datos());
    expect(normal).not.toContain('aria-busy');
    expect(normal).not.toContain('circulo-carga');
    expect(normal).toContain('<select data-modelo>');
    const apagado = seccionDirector(datos({ cargadorModelo: { fase: 'apagado', guarda: true } }));
    expect(apagado).toContain('<select data-modelo disabled aria-busy="true" data-cargando="apagado">');
    expect(apagado).toContain('<select data-esfuerzo>');
    expect(apagado).not.toContain('circulo-carga');
    const girando = seccionDirector(datos({ cargadorEsfuerzo: { fase: 'girando', guarda: true } }));
    expect(girando).toContain('<select data-esfuerzo disabled aria-busy="true" data-cargando="girando">');
    expect(girando).toMatch(/<\/select><span class="circulo-carga"/);
    expect(girando).toContain('<select data-modelo>');
    const fallo = seccionDirector(datos({ cargadorModelo: { fase: 'error', guarda: true, error: 'No se guardó. Prueba otra vez.' } }));
    expect(fallo).toContain('<select data-modelo>');
    expect(fallo).toContain('linea-cargador falla');
    expect(fallo).toContain('No se guardó. Prueba otra vez.');
  });

  it('dice con cuál trabajó de verdad el último lanzamiento, y avisa si no fue el pedido', () => {
    expect(seccionDirector(datos())).toContain('aparece aquí después del primero');
    expect(seccionDirector(datos({ consumo: [lanzamiento({ pedido: { modelo: 'claude-opus-5-5', esfuerzo: null } })] }))).toContain('trabajó con <b>Opus 5.5</b>, el que elegiste');
    expect(seccionDirector(datos({ consumo: [lanzamiento({ modelo: 'claude-sonnet-5-5', pedido: { modelo: 'claude-opus-5-5', esfuerzo: null, cumplido: false } })] }))).toContain('pidió Opus 5.5, pero Claude Code trabajó con <b>Sonnet 5.5</b>');
  });

  it('el permiso de ultracode: pedirlo si está encendido y falta, quitarlo si lo tiene', () => {
    expect(seccionDirector(datos({ ultracode: true }))).toContain('data-permiso-ultracode="si"');
    expect(seccionDirector(datos({ ultracode: true, ultracodeDirector: true }))).toContain('data-permiso-ultracode="no"');
    expect(seccionDirector(datos({ esfuerzo: 'max', esfuerzoGuardado: 'high' }))).toContain('siguen con alto');
  });
});
