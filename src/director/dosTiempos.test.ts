// La revisión en dos tiempos (pd_dos_tiempos): el formato de la lista de encargos del primer tiempo, su validación, cuándo
// se salta y cómo se mide, antes y después, con las revisiones de verdad.
import { describe, expect, it } from 'vitest';
import { antesYDespues, MARGEN_DE_VENTANA, resumirRevisiones, saltaPrimerTiempo, validarEncargos, VENTANAS, type EncargoDeRevision } from './dosTiempos';
import type { LineaDeRevision } from './lineasDeRevision';

const bien: EncargoDeRevision = {
  id: 'e1',
  que: 'Responder la nota del diálogo único y ajustar su paso.',
  origen: ['nmvshtxbitit'],
  archivos: [{ ruta: 'estudio/src/director.ts', parte: 'pedir()' }],
  espera: 'La nota respondida con su destino, y pruebas y tipos en verde.',
  procedimientos: ['formatos', 'ciclo'],
  modelo: 'sonnet',
  contexto: 120_000,
};

describe('la revisión en dos tiempos', () => {
  it('una lista de encargos bien escrita pasa', () => {
    expect(validarEncargos([bien, { ...bien, id: 'e2', modelo: 'director', archivos: [] }])).toEqual([]);
  });

  it('dice qué falta en cada encargo, por su id', () => {
    expect(validarEncargos([])).toEqual(['El plan de la revisión necesita al menos un encargo.']);
    expect(validarEncargos('x')).toHaveLength(1);
    const errores = validarEncargos([bien, { ...bien }, { id: 'e3', que: '', origen: [], archivos: [{}], espera: '', procedimientos: ['nada'], modelo: 'gpt', contexto: 1 }]);
    expect(errores).toContain('El encargo «e1» está dos veces.');
    for (const frase of ['no dice qué hacer', 'no dice qué se espera', 'no dice de dónde nace', 'no dice bien sus archivos', 'el procedimiento «nada», que no existe', 'no dice con qué modelo va'])
      expect(errores.some((e) => e.startsWith('El encargo «e3»') && e.includes(frase)), frase).toBe(true);
    expect(validarEncargos([{ ...bien, contexto: 0 }])[0]).toContain('no calcula cuánto contexto');
  });

  it('nunca le da a un modelo un encargo que su ventana no aguanta con margen', () => {
    const tope = Math.floor(VENTANAS.haiku * MARGEN_DE_VENTANA);
    expect(validarEncargos([{ ...bien, modelo: 'haiku', contexto: tope }])).toEqual([]);
    expect(validarEncargos([{ ...bien, modelo: 'haiku', contexto: tope + 1 }])[0]).toContain('pártelo, o dáselo a un modelo con más ventana');
    // Con la ventana real del director elegido (uno sin el millón)
    expect(validarEncargos([{ ...bien, modelo: 'director', contexto: 150_000 }], { ...VENTANAS, director: 200_000 })).toHaveLength(1);
  });

  it('el primer tiempo se salta cuando la revisión trae un solo trabajo pequeño', () => {
    expect(saltaPrimerTiempo({ notas: 1, entregas: 0, cola: 0, diagnosticos: 0 })).toBe(true);
    expect(saltaPrimerTiempo({ notas: 0, entregas: 0, cola: 0, diagnosticos: 0 })).toBe(true);
    expect(saltaPrimerTiempo({ notas: 1, entregas: 1, cola: 0, diagnosticos: 0 })).toBe(false);
    expect(saltaPrimerTiempo({ notas: 0, entregas: 0, cola: 1, diagnosticos: 0 })).toBe(false);
    expect(saltaPrimerTiempo({ notas: 0, entregas: 0, cola: 0, diagnosticos: 1 })).toBe(false);
  });

  it('se mide con las revisiones de verdad, antes y después: cuánto duran, cuánto gastan y cuántas cierran', () => {
    const l = (cuando: string, minutos: number | null, costo: number | null, cerro: boolean, tipo: LineaDeRevision['tipo'] = 'revision'): LineaDeRevision =>
      ({ registro: `p-${cuando}.log`, proyecto: 'p', tipo, cuando, minutos, costo, modelo: null, cerro, notas: [], archivos: [], commits: [], negados: [] });
    const lineas = [l('2026-10-20T10:00:00Z', 40, 10, true), l('2026-10-21T10:00:00Z', 60, 20, false), l('2026-10-22T10:00:00Z', 50, null, true), l('2026-10-22T12:00:00Z', 5, 1, true, 'urgencia'), l('2026-11-02T10:00:00Z', 30, 8, true)];
    expect(resumirRevisiones(lineas)).toEqual({ n: 4, minutos: 45, costo: 10, cerraron: 3 });
    const { antes, despues } = antesYDespues(lineas, '2026-11-01T00:00:00Z');
    expect(antes).toEqual({ n: 3, minutos: 50, costo: 15, cerraron: 2 });
    expect(despues).toEqual({ n: 1, minutos: 30, costo: 8, cerraron: 1 });
    expect(resumirRevisiones([])).toEqual({ n: 0, minutos: null, costo: null, cerraron: 0 });
  });
});
