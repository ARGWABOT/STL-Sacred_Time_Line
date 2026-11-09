import { describe, expect, it } from 'vitest';
import { limiteDelTramo, MAX_MIN_REVISION, TOPE_MIN_TRAMO, tramoPorCerrar, type Tramo } from './director';
import { ORIGENES_REVISION, seguidasActivas, siguienteDeLaCadena, USO_MAXIMO_SEGUIDAS, type RevisionPedida, type Seguidas } from './proyectos';

// «Pedir revisiones seguidas» (pedido pd_revisiones_seguidas: el titular lo eligió en t_encadenar_revisiones, 27 de octubre
// de 2026) y el límite de cada revisión, estimado por el director (su nota de voz nmvqwclpitit)
const cadena: Seguidas = { proyecto: 'p', quien: 'leonc', desde: '2026-10-27T17:00:00.000Z', hechas: 0 };
const cerrada: RevisionPedida = { proyecto: 'p', quien: 'leonc', pedida: '2026-10-27T17:00:00.000Z', lanzada: '2026-10-27T17:00:05.000Z', hecha: '2026-10-27T17:40:00.000Z', origen: 'seguidas' };
const sigue: Tramo = { cuando: '2026-10-27T17:39:00.000Z', seguir: true, razon: 'Mi cola sigue: lo que viene es por dentro.', minutos: 120 };
const holgura = { cincoHoras: 35, semana: 20 };

describe('las revisiones seguidas', () => {
  it('las pide la persona con su botón, y siguen mientras el director diga que su cola sigue', () => {
    expect(ORIGENES_REVISION.seguidas).toContain('Pedir revisiones seguidas');
    expect(siguienteDeLaCadena(cadena, cerrada, sigue, holgura)).toEqual({ sigue: true });
  });

  it('paran cuando algo necesita a la persona, cuando una falla, o cuando el director no lo dijo al cerrar', () => {
    expect(siguienteDeLaCadena(cadena, cerrada, { ...sigue, seguir: false, razon: 'necesito que decidas algo' }, holgura)).toEqual({ sigue: false, porque: 'necesito que decidas algo' });
    const fallo = siguienteDeLaCadena(cadena, { ...cerrada, hecha: undefined, error: 'La revisión que lanzó el Studio se cortó. Lo que alcanzó a hacer quedó en x.log.' }, sigue, holgura);
    expect(fallo).toEqual({ sigue: false, porque: 'la revisión no terminó (La revisión que lanzó el Studio se cortó.)' });
    // El tramo de una revisión anterior no dice nada de esta
    expect(siguienteDeLaCadena(cadena, cerrada, { ...sigue, cuando: '2026-10-27T16:00:00.000Z' }, holgura)).toMatchObject({ sigue: false });
    expect(siguienteDeLaCadena(cadena, cerrada, null, holgura)).toMatchObject({ sigue: false });
  });

  it('paran con tu límite de cinco horas o el semanal en el 80 %, y sin saberlo no se lanza a ciegas', () => {
    expect(siguienteDeLaCadena(cadena, cerrada, sigue, { cincoHoras: USO_MAXIMO_SEGUIDAS, semana: 10 })).toEqual({ sigue: false, porque: 'tu límite de cinco horas va en 80 %' });
    expect(siguienteDeLaCadena(cadena, cerrada, sigue, { cincoHoras: 10, semana: 91.5 })).toEqual({ sigue: false, porque: 'tu límite semanal va en 91.5 %' });
    expect(siguienteDeLaCadena(cadena, cerrada, sigue, null)).toMatchObject({ sigue: false });
  });

  it('sin cadena, detenida, de otro proyecto o con la revisión en marcha, nada que decidir', () => {
    expect(siguienteDeLaCadena(undefined, cerrada, sigue, holgura)).toBeNull();
    const detenida = { ...cadena, paro: { cuando: '2026-10-27T17:10:00.000Z', porque: 'la detuvo leonc' } };
    expect(seguidasActivas(detenida)).toBe(false);
    expect(siguienteDeLaCadena(detenida, cerrada, sigue, holgura)).toBeNull();
    expect(siguienteDeLaCadena(cadena, { ...cerrada, proyecto: 'otro' }, sigue, holgura)).toBeNull();
    expect(siguienteDeLaCadena(cadena, { ...cerrada, hecha: undefined }, sigue, holgura)).toBeNull();
  });
});

describe('el límite de cada revisión, estimado por el director', () => {
  it('lo de siempre sin estimación, y entre lo de siempre y el tope con ella', () => {
    expect(limiteDelTramo(undefined)).toBe(MAX_MIN_REVISION);
    expect(limiteDelTramo({ ...sigue, minutos: 75 })).toBe(75);
    expect(limiteDelTramo({ ...sigue, minutos: 20 })).toBe(MAX_MIN_REVISION);
    expect(limiteDelTramo({ ...sigue, minutos: 600 })).toBe(TOPE_MIN_TRAMO);
  });

  it('el tope es de 90 minutos (decisión nmvsptkshtit): una estimación de 180 queda en 90', () => {
    expect(TOPE_MIN_TRAMO).toBe(90);
    expect(limiteDelTramo(sigue)).toBe(90);
    expect(limiteDelTramo({ ...sigue, minutos: 180 })).toBe(90);
  });

  it('al cerrar: con la cadena en marcha, el tramo de esta revisión; nunca que sigue con la cola vacía', () => {
    const desde = '2026-10-27T17:00:00.000Z';
    expect(tramoPorCerrar(undefined, desde, true, 5)).toMatch(/no dijiste si tu cola sigue/);
    expect(tramoPorCerrar({ ...sigue, cuando: '2026-10-27T16:00:00.000Z' }, desde, true, 5)).toMatch(/no dijiste/);
    expect(tramoPorCerrar(sigue, desde, true, 5)).toBe('');
    expect(tramoPorCerrar(sigue, desde, true, 0)).toMatch(/cola está vacía/);
    expect(tramoPorCerrar({ ...sigue, seguir: false }, desde, true, 0)).toBe('');
    // Sin cadena no se exige: el tramo es opcional
    expect(tramoPorCerrar(undefined, desde, false, 5)).toBe('');
  });
});
