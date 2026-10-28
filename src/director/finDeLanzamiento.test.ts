// Quién terminó cada lanzamiento (pr_procesos_vista, punto 1): lo que se entiende como un final y cómo se cuentan.
import { describe, expect, it } from 'vitest';
import { contarFinales, esFinEscrito, NOMBRE_FIN } from './finDeLanzamiento';
import { lineaDeRegistro } from './lineasDeRevision';

describe('quién terminó cada lanzamiento', () => {
  it('se cuentan por cómo terminaron, en su orden, sin los que no pasaron ni los que no se entienden', () => {
    const fin = (quien: string) => ({ quien, causa: '', minutos: 1 }) as never;
    expect(contarFinales([fin('limite'), fin('cierre'), fin('cierre'), undefined, null, fin('otra cosa'), fin('afuera')])).toEqual([
      { quien: 'cierre', n: 2 },
      { quien: 'limite', n: 1 },
      { quien: 'afuera', n: 1 },
    ]);
    expect(esFinEscrito({ quien: 'cierre', causa: 'x', minutos: null })).toBe(true);
    expect(esFinEscrito({ quien: 'nada' })).toBe(false);
    // «Detener ahora» que no cerró a tiempo, junto al límite: los dos son el Studio que corta (pr_procesos_vista, punto 3)
    expect(Object.keys(NOMBRE_FIN)).toEqual(['cierre', 'tras_cierre', 'limite', 'detenida', 'cuenta', 'no_arranco', 'claude', 'afuera']);
  });

  it('la línea de cada revisión dice quién la terminó, si el Studio lo escribió', () => {
    const registro = [JSON.stringify({ type: 'system', subtype: 'init', model: 'm' }), JSON.stringify({ type: 'studio', fin: { quien: 'limite', causa: 'Seguía trabajando', minutos: 60 } })].join('\n');
    expect(lineaDeRegistro('p-2026-10-28T07-09-20-889Z.log', registro)?.termino).toBe('limite');
    expect(lineaDeRegistro('p-2026-10-28T07-09-20-889Z.log', registro.split('\n')[0])).not.toHaveProperty('termino');
  });
});
