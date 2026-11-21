// Quién terminó cada lanzamiento (pr_procesos_vista, punto 1): lo que se entiende como un final.
import { describe, expect, it } from 'vitest';
import { esFinEscrito, NOMBRE_FIN } from './finDeLanzamiento';
import { lineaDeRegistro } from './lineasDeRevision';

describe('quién terminó cada lanzamiento', () => {
  it('solo se entiende como final lo que dice una de sus formas', () => {
    expect(esFinEscrito({ quien: 'cierre', causa: 'x', minutos: null })).toBe(true);
    expect(esFinEscrito({ quien: 'nada' })).toBe(false);
    // «Detener ahora» que no cerró a tiempo, junto al límite: los dos son el Studio que corta (pr_procesos_vista, punto 3);
    // y con ellos, el director que dejó de responder (6 de noviembre de 2026)
    expect(Object.keys(NOMBRE_FIN)).toEqual(['cierre', 'tras_cierre', 'limite', 'detenida', 'sin_respuesta', 'cuenta', 'no_arranco', 'claude', 'afuera']);
  });

  it('la línea de cada revisión dice quién la terminó, si el Studio lo escribió', () => {
    const registro = [JSON.stringify({ type: 'system', subtype: 'init', model: 'm' }), JSON.stringify({ type: 'studio', fin: { quien: 'limite', causa: 'Seguía trabajando', minutos: 60 } })].join('\n');
    expect(lineaDeRegistro('p-2026-10-28T07-09-20-889Z.log', registro)?.termino).toBe('limite');
    expect(lineaDeRegistro('p-2026-10-28T07-09-20-889Z.log', registro.split('\n')[0])).not.toHaveProperty('termino');
  });
});
