import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decisionesVigentes, type Nota } from './director';

// Lo vigente, el primer bloque del paquete de cada revisión (decidido el 23 de octubre de 2026 en «El paquete de cada
// revisión», parte 10; pedido pd_lo_vigente): las decisiones de los documentos que siguen en firme, calculadas por el código
const decide = (id: string, cuando: string, decision: string, postura?: Nota['sobre']['postura'], doc = 'docs/director/a.md', seccion = '2. Algo'): Nota =>
  ({ id, cuando, quien: 'titular', sobre: { tipo: 'documento', id: doc, seccion, decision, postura }, texto: `nota ${id}` }) as Nota;

describe('lo vigente: las decisiones en firme de los documentos', () => {
  it('cada decisión la deja su última nota; un comentario no la decide; lo que no es una decisión no entra', () => {
    const notas = [
      decide('n1', '2026-10-20T10:00:00.000Z', '1. El orden', 'aprueba'),
      decide('n2', '2026-10-21T10:00:00.000Z', '1. El orden', 'decide'),
      decide('n3', '2026-10-22T10:00:00.000Z', '2. La voz', 'comenta'),
      decide('n4', '2026-10-19T10:00:00.000Z', '2. La voz'),
      { id: 'n5', cuando: '2026-10-23T10:00:00.000Z', quien: 'titular', sobre: { tipo: 'mision', id: 't_x', seccion: 'Paso 1' }, texto: 'otra cosa' } as Nota,
    ];
    expect(decisionesVigentes({}, notas).map((n) => n.id)).toEqual(['n4', 'n2']);
  });

  it('la que deja sin efecto una de otra parte lo dice en su respuesta, y la reemplazada sale; la bandeja lo pone al comienzo', () => {
    const notas = [
      decide('vieja', '2026-10-20T10:00:00.000Z', '1. El equipo', 'aprueba', 'docs/director/ruta.md'),
      decide('nueva', '2026-10-24T10:00:00.000Z', '3. El equipo después', 'decide', 'docs/director/otro.md'),
    ];
    const respuestas = { nueva: { cuando: '2026-10-24T12:00:00.000Z', texto: 'El equipo queda para después.', reemplaza: ['vieja'] } };
    expect(decisionesVigentes(respuestas, notas).map((n) => n.id)).toEqual(['nueva']);
    const bandeja = readFileSync(join(__dirname, '..', '..', 'tools', 'director', 'bandeja.ts'), 'utf-8');
    expect(bandeja.indexOf('## Lo vigente')).toBeGreaterThan(0);
    expect(bandeja.indexOf('## Lo vigente')).toBeLessThan(bandeja.indexOf('## Etapa del arranque'));
    expect(bandeja).toContain('decisionesVigentes(plan.respuestas ?? {}, estado.notas)');
  });
});
