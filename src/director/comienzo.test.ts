import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { comienzoDeLaRevision } from './director';

// Correr --listo otra vez antes del commit (docs/metodo/director/review-cycle.md › «Validar y cerrar») no mueve el comienzo de la revisión
// (propuesta aceptada «El cierre no deja nada sin atender»): el 27 de octubre de 2026, la segunda corrida dio por viejo
// el lote corto recién escrito, y habría dejado sin comprobar las respuestas escritas antes de la primera
describe('el comienzo de la revisión que se cierra', () => {
  it('es la marca de la anterior; si un --listo de esta misma revisión ya puso otra sin commit, sigue siendo la anterior', () => {
    const anterior = '2026-10-27T16:04:44.937Z';
    const primerListo = '2026-10-27T16:23:37.155Z';
    expect(comienzoDeLaRevision(anterior, anterior)).toBe(anterior);
    expect(comienzoDeLaRevision(primerListo, anterior)).toBe(anterior);
    // Sin commit de la memoria, o sin marca, la del plan
    expect(comienzoDeLaRevision(anterior, undefined)).toBe(anterior);
    expect(comienzoDeLaRevision(undefined, anterior)).toBe('');
    const bandeja = readFileSync(join(__dirname, '..', '..', 'tools', 'director', 'bandeja.ts'), 'utf-8');
    expect(bandeja).toContain('const desde = comienzoDeLaRevision(plan.revisado, guardado?.revisado);');
  });
});
