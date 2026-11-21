// La barra fina de las cinco paradas de la entrega (pd_entrega_fluida, nmwdhtp2ntit; «Planteamiento» para un proyecto
// nuevo, nmwdxuaavtit): arriba de las dos esperas y de «La meta», la de ahora encendida y las hechas con su ✓.
import { describe, expect, it } from 'vitest';
import { proyectoVacio } from '../../src/director/director';
import { diagnosticoPendiente, htmlEspera } from './esperaRevision';
import { htmlParadas, PARADAS, paradaDeEspera, paradaDeLaMeta } from './paradasEntrega';
import { ponerIdioma } from './textos';
import { vistaProyecto, type DatosProyecto } from './vistaProyecto';

const paradaAhora = (html: string) => html.match(/data-parada="(\w+)" aria-current="step"/)?.[1];
const hechas = (html: string) => [...html.matchAll(/class="parada hecha" data-parada="(\w+)"/g)].map((m) => m[1]);

describe('la barra de las cinco paradas', () => {
  it('cinco paradas en orden, la de ahora encendida, las anteriores con ✓ y sin tiempos ni porcentajes', () => {
    ponerIdioma('en');
    const html = htmlParadas('meta', false);
    expect(PARADAS).toEqual(['entregado', 'diagnostico', 'meta', 'ruta', 'mision']);
    expect([...html.matchAll(/<li class="parada/g)]).toHaveLength(5);
    expect(html).toMatch(/Handed over.*Diagnosis.*Goal.*Route.*First mission/s);
    expect(paradaAhora(html)).toBe('meta');
    expect(hechas(html)).toEqual(['entregado', 'diagnostico']);
    expect(html.match(/✓/g)).toHaveLength(2);
    expect(html).not.toMatch(/%|\bmin\b|\d+ ?s\b/);
  });

  it('en un proyecto nuevo, la segunda parada es «Approach» («Planteamiento»), en los dos idiomas', () => {
    ponerIdioma('en');
    expect(htmlParadas('diagnostico', true)).toContain('Approach');
    expect(htmlParadas('diagnostico', true)).not.toContain('Diagnosis');
    ponerIdioma('es');
    expect(htmlParadas('diagnostico', true)).toContain('Planteamiento');
    expect(htmlParadas('diagnostico', false)).toMatch(/Entregado.*Diagnóstico.*Meta.*Ruta.*Primera misión/s);
  });

  it('la parada de cada espera y de «La meta»', () => {
    expect(paradaDeEspera('diagnostico', false)).toBe('diagnostico');
    expect(paradaDeEspera('diagnostico', true)).toBe('meta');
    expect(paradaDeEspera('ruta', false)).toBe('ruta');
    expect(paradaDeEspera('ruta', true)).toBe('mision');
    expect(paradaDeLaMeta(false, false)).toBe('diagnostico');
    expect(paradaDeLaMeta(false, true)).toBe('meta');
    expect(paradaDeLaMeta(true, true)).toBeNull();
  });

  it('va arriba de las dos esperas: el diagnóstico (o el planteamiento) mientras trabaja, la meta al terminar, la ruta', () => {
    ponerIdioma('en');
    const diag = htmlEspera('diagnostico', 'trabajando', 'Shops');
    expect(diag.indexOf('paradas-entrega')).toBeGreaterThan(-1);
    expect(diag.indexOf('paradas-entrega')).toBeLessThan(diag.indexOf('<h2>'));
    expect(paradaAhora(diag)).toBe('diagnostico');
    expect(htmlEspera('diagnostico', 'trabajando', 'Shops', 0, false, true)).toContain('Approach');
    expect(paradaAhora(htmlEspera('diagnostico', 'lista', 'Shops'))).toBe('meta');
    expect(paradaAhora(htmlEspera('diagnostico', 'cerrando', 'Shops'))).toBe('meta');
    const ruta = htmlEspera('ruta', 'trabajando', 'Shops');
    expect(ruta.indexOf('paradas-entrega')).toBeLessThan(ruta.indexOf('<h2>'));
    expect(paradaAhora(ruta)).toBe('ruta');
    expect(paradaAhora(htmlEspera('ruta', 'lista', 'Shops'))).toBe('mision');
  });

  it('va arriba de «La meta» solo mientras no hay meta fijada', () => {
    ponerIdioma('en');
    const datos = (x: Partial<DatosProyecto> = {}): DatosProyecto => ({
      proyecto: { ...proyectoVacio(), nombre: 'Shops' },
      repositorio: { ruta: null, info: null, error: null },
      plan: { objetivos: [], boletin: [], detectado: undefined, diagnostico: { fecha: '2026-11-12' } } as unknown as DatosProyecto['plan'],
      titular: true, nuevo: false, borrador: null,
      diagnostico: { ancla: 'p-diagnostico', titulo: 'Diagnosis', cuerpo: '<p>diagnosis</p>' },
      plegable: () => '', pestana: 'objetivo',
      ...x,
    });
    const html = vistaProyecto(datos());
    expect(paradaAhora(html)).toBe('meta');
    expect(html.indexOf('paradas-entrega')).toBeLessThan(html.indexOf('form-objetivo'));
    const sinDiagnostico = vistaProyecto(datos({ nuevo: true, plan: { objetivos: [], boletin: [], detectado: undefined, diagnostico: { fecha: null } } as unknown as DatosProyecto['plan'] }));
    expect(paradaAhora(sinDiagnostico)).toBe('diagnostico');
    expect(sinDiagnostico).toContain('Approach');
    const conMeta = vistaProyecto(datos({ proyecto: { ...proyectoVacio(), nombre: 'Shops', objetivo: { texto: 'x', exito: 'y', firmado: { quien: 'Ana', fecha: '2026-11-12' } } } as DatosProyecto['proyecto'] }));
    expect(conMeta).not.toContain('paradas-entrega');
  });
});

describe('la espera del diagnóstico se abre sola en cualquier pestaña (nmwdhucx8tit)', () => {
  it('solo con el diagnóstico pedido y sin terminar, y el proyecto sin meta ni diagnóstico', () => {
    expect(diagnosticoPendiente({}, false, false)).toBe(true);
    expect(diagnosticoPendiente(null, false, false)).toBe(false);
    expect(diagnosticoPendiente({ hecha: '2026-11-13' }, false, false)).toBe(false);
    expect(diagnosticoPendiente({ error: 'se detuvo' }, false, false)).toBe(false);
    expect(diagnosticoPendiente({}, true, false)).toBe(false);
    expect(diagnosticoPendiente({}, false, true)).toBe(false);
  });
});
