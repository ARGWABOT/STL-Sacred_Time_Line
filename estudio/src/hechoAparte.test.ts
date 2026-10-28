import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { separarHechas } from './hechoAparte';

type Cosa = { id: string; hecha?: boolean; cuando?: string };
const separar = (items: Cosa[]) => {
  const { porHacer, hechas } = separarHechas(items, (x) => !!x.hecha, (x) => x.cuando);
  return { porHacer: porHacer.map((x) => x.id), hechas: hechas.map((x) => x.id) };
};

describe('lo hecho aparte de lo por hacer en «La ruta»', () => {
  it('lo por hacer conserva el orden del plan y lo hecho va de lo más nuevo a lo más viejo', () => {
    const r = separar([
      { id: 'a', hecha: true, cuando: '2026-10-20T10:00:00.000Z' },
      { id: 'b' },
      { id: 'c', hecha: true, cuando: '2026-10-25T08:30:00.000Z' },
      { id: 'd' },
      { id: 'e', hecha: true, cuando: '2026-10-22T23:59:00.000Z' },
    ]);
    expect(r).toEqual({ porHacer: ['b', 'd'], hechas: ['c', 'e', 'a'] });
  });

  it('lo hecho sin fecha (o con una fecha ilegible) va al final, en su orden', () => {
    const r = separar([
      { id: 'sin1', hecha: true },
      { id: 'viejo', hecha: true, cuando: '2026-10-01T00:00:00.000Z' },
      { id: 'rara', hecha: true, cuando: 'ayer' },
      { id: 'nuevo', hecha: true, cuando: '2026-10-26T00:00:00.000Z' },
    ]);
    expect(r.hechas).toEqual(['nuevo', 'viejo', 'sin1', 'rara']);
  });

  it('a la misma hora conserva el orden del plan, y entiende un día solo y una hora completa', () => {
    const iguales = separar([
      { id: 'x', hecha: true, cuando: '2026-10-24T12:00:00.000Z' },
      { id: 'y', hecha: true, cuando: '2026-10-24T12:00:00.000Z' },
    ]);
    expect(iguales.hechas).toEqual(['x', 'y']);
    const mezcla = separar([
      { id: 'dia', hecha: true, cuando: '2026-10-24' },
      { id: 'hora', hecha: true, cuando: '2026-10-24T09:00:00.000Z' },
    ]);
    expect(mezcla.hechas).toEqual(['hora', 'dia']);
  });

  it('sin nada hecho o sin nada por hacer, deja la otra parte vacía y no toca la lista de entrada', () => {
    const entrada: Cosa[] = [{ id: 'p' }, { id: 'q' }];
    expect(separar(entrada)).toEqual({ porHacer: ['p', 'q'], hechas: [] });
    expect(entrada.map((x) => x.id)).toEqual(['p', 'q']);
    expect(separar([{ id: 'h', hecha: true, cuando: '2026-10-26T00:00:00.000Z' }])).toEqual({ porHacer: [], hechas: ['h'] });
    expect(separar([])).toEqual({ porHacer: [], hechas: [] });
  });

  it('«La ruta» lo usa en las misiones, las propuestas y lo pedido, con la fecha y la hora de lo hecho', () => {
    const director = readFileSync(join(__dirname, 'director.ts'), 'utf-8');
    // Las misiones, por persona: aprobadas por la fecha de su veredicto
    expect(director).toContain("separarHechas(ms, (m) => estadoMision(m, d.plan, d.estado) === 'aprobada', (m) => d.plan.revisiones[m.id]?.cuando)");
    // Las propuestas: hechas por cuando se ejecutaron, o decididas por cuando se decidieron
    expect(director).toContain('(p) => !!d.plan.ejecutadas?.[p.id] ||');
    expect(director).toContain('cierreDePropuesta);');
    // Lo pedido: por cuando se hizo; lo reemplazado, con lo cerrado (pd_lo_vigente)
    expect(director).toContain('separarHechas(lista, (p) => !!p.hecho || reemplazado.has(p.id), (p) => p.hecho?.cuando)');
    expect(director).toContain('fuera.has(p.id) || (!!d.estado.propuestas[p.id]');
    // Cada fila hecha dice cuándo, con fecha y hora
    expect(director.match(/class="como cuando-hecha">\$\{momento\(/g)?.length).toBe(3);
  });
});
