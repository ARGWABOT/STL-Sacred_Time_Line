import { describe, expect, it } from 'vitest';
import { limiteDelTramo, MAX_MIN_REVISION, TOPE_MIN_TRAMO, type Tramo } from './director';
import { ORIGENES_REVISION } from './proyectos';

// El límite de cada revisión, estimado por el director al cerrar la anterior (nota de voz del titular nmvqwclpitit)
const estimado: Tramo = { cuando: '2026-10-27T17:39:00.000Z', minutos: 120 };

describe('el límite de cada revisión, estimado por el director', () => {
  it('lo de siempre sin estimación, y entre lo de siempre y el tope con ella', () => {
    expect(limiteDelTramo(undefined)).toBe(MAX_MIN_REVISION);
    expect(limiteDelTramo({ cuando: estimado.cuando })).toBe(MAX_MIN_REVISION);
    expect(limiteDelTramo({ ...estimado, minutos: 75 })).toBe(75);
    expect(limiteDelTramo({ ...estimado, minutos: 20 })).toBe(MAX_MIN_REVISION);
    expect(limiteDelTramo({ ...estimado, minutos: 600 })).toBe(TOPE_MIN_TRAMO);
  });

  it('el tope es de 90 minutos (decisión nmvsptkshtit): una estimación de 180 queda en 90', () => {
    expect(TOPE_MIN_TRAMO).toBe(90);
    expect(limiteDelTramo(estimado)).toBe(90);
    expect(limiteDelTramo({ ...estimado, minutos: 180 })).toBe(90);
  });
});

describe('una revisión a la vez, pedida a mano (nota de voz del titular nmwdqtq1ntit, 12 de noviembre de 2026)', () => {
  it('ningún botón pide revisiones encadenadas: cada origen pide una sola', () => {
    expect(Object.keys(ORIGENES_REVISION)).not.toContain('seguidas');
    for (const boton of Object.values(ORIGENES_REVISION)) expect(boton).not.toMatch(/revisiones seguidas/i);
  });
});
