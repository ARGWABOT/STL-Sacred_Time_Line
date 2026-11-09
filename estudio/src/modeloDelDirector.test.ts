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
