import { describe, expect, it } from 'vitest';
import { cerradasDesde, lineaDeOtras, puntoDe } from './otrasRevisiones';
import type { OtraRevision } from '../../src/director/proyectos';

const tx = (clave: string, datos: Record<string, string | number> = {}) => `${clave}${JSON.stringify(datos)}`;
const app: OtraRevision = { proyecto: 'app', nombre: 'App', estado: 'en_marcha', desde: '2026-11-12T11:00:00Z' };
const golf: OtraRevision = { proyecto: 'golf', nombre: 'Golf', estado: 'pedida', desde: '2026-11-12T11:30:00Z' };

describe('las revisiones de otros proyectos, a la vez (pd_revisiones_simultaneas)', () => {
  it('una línea en la cabecera mientras otra está abierta; con una actualización retenida, que espera a esa revisión', () => {
    expect(lineaDeOtras([], false, tx)).toBe('');
    expect(lineaDeOtras([{ ...app, estado: 'hecha', hecha: 'x' }], false, tx)).toBe('');
    expect(lineaDeOtras([app, golf], false, tx)).toBe('simult.otraCorre{"nombres":"App, Golf"}');
    expect(lineaDeOtras([app], true, tx)).toBe('simult.actualizacion{"nombres":"App"}');
  });

  it('el punto de la lista dice si corre y cuánto lleva, o que está pedida', () => {
    const ahora = Date.parse('2026-11-12T11:12:30Z');
    expect(puntoDe([app, golf], 'app', tx, ahora)).toEqual({ enMarcha: true, titulo: 'simult.puntoCorre{"min":12}' });
    expect(puntoDe([app, golf], 'golf', tx, ahora)).toEqual({ enMarcha: false, titulo: 'simult.puntoPedida{}' });
    expect(puntoDe([app], 'stl-studio', tx, ahora)).toBeNull();
  });

  it('el aviso de cierre sale una sola vez: solo la que estaba abierta en la consulta anterior', () => {
    const hecha = { ...app, estado: 'hecha' as const, hecha: '2026-11-12T11:40:00Z' };
    expect(cerradasDesde([app, golf], [hecha, golf])).toEqual([hecha]);
    expect(cerradasDesde([hecha], [hecha])).toEqual([]);
    expect(cerradasDesde(undefined, [hecha])).toEqual([]);
  });
});
