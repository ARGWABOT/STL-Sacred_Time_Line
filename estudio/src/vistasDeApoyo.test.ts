import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { EstadoDirector, Plan } from '../../src/director/director';
import { vistaBitacora, vistaFrentes, vistaMetodo } from './vistasDeApoyo';

// Las vistas de apoyo, aparte de app.ts (pr_partir_modulos): pintan lo que reciben, sin cambiar lo que hacían
const plan = {
  fases: [{ id: 'a', nombre: 'Fase A' }, { id: 'b', nombre: 'Fase B' }],
  ritmo: ['Revisar cada semana'],
  lecciones: [{ titulo: 'Lo pequeño', quien: 'Alguien', que: 'Partir', fuente: 'https://ejemplo.org', paraElProyecto: 'Misiones cortas' }],
} as unknown as Plan;
const estado = { bitacora: [{ fecha: '2026-10-21', quien: 'ana', texto: 'Se <decidió> algo' }], cierres: {} } as unknown as EstadoDirector;

describe('las vistas de apoyo, en su módulo (pr_partir_modulos)', () => {
  it('el método y la bitácora pintan lo que reciben', () => {
    const metodo = vistaMetodo({ plan, nombreTitular: 'Ana <B>', botonMetodo: '<button>Leer</button>' });
    expect(metodo).toContain('Ana &lt;B&gt; decide:');
    expect(metodo).toContain('<p><button>Leer</button></p>');
    expect(metodo).toContain('<li>Revisar cada semana</li>');
    expect(vistaBitacora({ estado })).toContain('Se &lt;decidió&gt; algo');
  });

  it('los frentes: la matriz por fase, la celda elegida y las excepciones abiertas y vencidas', () => {
    const fases = [
      { id: 'a', nombre: 'Fase A', frentes: { web: { nivel: 'foco', que: 'Lo <primero>' } } },
      { id: 'b', nombre: 'Fase B', frentes: {} },
    ];
    const conFrentes = { ...plan, fases, frentes: [{ id: 'web', nombre: 'La web', rutas: ['web/'] }] } as unknown as Plan;
    const excepciones = [
      { id: 'x1', frente: 'web', motivo: 'Un arreglo', quien: 'ana', fecha: '2026-10-20', hasta: '2026-11-01' },
      { id: 'x2', frente: 'web', motivo: 'Uno viejo', quien: 'ana', fecha: '2026-10-01', hasta: '2026-10-05' },
    ];
    const conExcepciones = { ...estado, excepciones } as unknown as EstadoDirector;
    const html = vistaFrentes({ plan: conFrentes, estado: conExcepciones, hoy: '2026-10-29', celda: { frente: 'web', fase: 'a' }, puedoTrabajar: '<p id="puedo"></p>' });
    expect(html).toContain('<th class="actual">0. Fase A</th>');
    expect(html).toContain('data-celda="web|a" title="Lo &lt;primero&gt;">En foco</button>');
    expect(html).toContain('data-celda="web|b" title="Esta fase no lo nombra: espera.">En espera</button>');
    expect(html).toContain('<div class="panel-d detalle-celda"><b>La web</b> en <b>Fase A</b>');
    expect(html).toContain('data-cerrar-excepcion="x1"');
    expect(html).toContain('<li class="cerrada"><span><b>La web</b>: Uno viejo');
    expect(html.endsWith('<p id="puedo"></p>')).toBe(true);
    const sinCelda = vistaFrentes({ plan: conFrentes, estado: { ...estado, excepciones: [] } as unknown as EstadoDirector, hoy: '2026-10-29', celda: null, puedoTrabajar: '' });
    expect(sinCelda).not.toContain('detalle-celda');
    expect(sinCelda).toContain('Ninguna. Todo el trabajo va en orden.');
  });

  it('las validaciones de proyecto salieron del Studio (nmvy6vawvtit): ni su sección, ni su menú, ni su formulario, ni sus textos', () => {
    const leer = (ruta: string) => readFileSync(new URL(ruta, import.meta.url), 'utf8');
    for (const archivo of ['./app.ts', './vistasDeApoyo.ts', './vistaEsfuerzo.ts', './iconos.ts', './director.css', './textos/es.ts', './textos/en.ts', '../servidor/api.ts', '../../tools/director/bandeja.ts'])
      expect(leer(archivo), archivo).not.toMatch(/vistaValidaciones|form-validacion|lista-validaciones|borrar_validacion|borrarValidacion|tipoValidacion|TIPOS_VALIDACION|'validacion'|'nav\.validaciones'|'validaciones\.|estado\.validaciones|\bvalidaciones: /);
    // Lo que sigue llamándose validar es otra cosa: la del plan
    expect(leer('../../src/director/director.ts')).toContain('export function validarPlan(');
  });

  it('app.ts las importa y ya no las define', () => {
    const director = readFileSync(new URL('./app.ts', import.meta.url), 'utf8');
    expect(director).toContain("import { queDelFrente, vistaBitacora, vistaFrentes as vistaFrentesHtml, vistaMetodo } from './vistasDeApoyo';");
    for (const f of ['vistaMetodo', 'vistaBitacora']) expect(director).not.toContain(`function ${f}(`);
    // De los frentes queda solo lo que les da sus datos: el pintado está aquí
    expect(director).toContain('return vistaFrentesHtml({');
    expect(director).not.toContain('Excepciones abiertas');
  });
});
