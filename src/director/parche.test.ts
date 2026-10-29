import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Plan } from './director';
import { aplicarParche } from './parche';

// Escribir el plan con cambios puntuales (propuesta pr_encargo_a_medida, punto 1): el director escribe solo lo que cambia
const plan = {
  revisado: '2026-10-27T16:00:00.000Z',
  mensaje: { fecha: '2026-10-27T16:00:00.000Z', texto: 'Antes.' },
  misiones: [
    { id: 't_a', para: 'titular', fase: 'replicable', titulo: 'A', despuesDe: ['pd_x'] },
    { id: 't_b', para: 'titular', fase: 'replicable', titulo: 'B' },
  ],
  respuestas: { n_vieja: { cuando: '2026-10-26T10:00:00.000Z', texto: 'Dicho.' } },
  reservaCorta: { titular: { cuando: '2026-10-27T16:00:00.000Z', razon: 'Corta.' } },
  documentos: [{ ruta: 'docs/director/a.md', titulo: 'A' }],
} as unknown as Plan;

describe('el plan, con cambios puntuales', () => {
  it('por clave se suma o se reemplaza, por id se reemplaza entero o se suma, y lo demás se reemplaza; con null sale', () => {
    const r = aplicarParche(plan, {
      respuestas: { n_nueva: { cuando: '2026-10-27T17:00:00.000Z', texto: 'Hecho.', tratamiento: 'integrada' } },
      reservaCorta: { titular: null },
      misiones: [{ id: 't_b', para: 'titular', fase: 'replicable', titulo: 'B, otra vez' }, { id: 't_c', para: 'titular', fase: 'replicable', titulo: 'C' }],
      documentos: [{ ruta: 'docs/director/b.md', titulo: 'B' }],
      mensaje: { fecha: '2026-10-27T17:00:00.000Z', texto: 'Después.' },
    });
    expect(r.errores).toEqual([]);
    expect(Object.keys(r.plan.respuestas)).toEqual(['n_vieja', 'n_nueva']);
    expect(r.plan.reservaCorta).toEqual({});
    expect(r.plan.misiones.map((m) => `${m.id}:${m.titulo}`)).toEqual(['t_a:A', 't_b:B, otra vez', 't_c:C']);
    expect(r.plan.documentos.map((d) => d.ruta)).toEqual(['docs/director/a.md', 'docs/director/b.md']);
    expect(r.plan.mensaje.texto).toBe('Después.');
    expect(r.hecho).toEqual(['respuestas: n_nueva', 'reservaCorta: titular', 'misiones: t_b, t_c (nuevo)', 'documentos: docs/director/b.md (nuevo)', 'mensaje']);
    // el plan de antes no cambia
    expect(plan.misiones).toHaveLength(2);
    expect(plan.reservaCorta).toHaveProperty('titular');
  });

  it('la pieza siguiente de la cola se escribe entera, como el tramo (pd_paquete_listo)', () => {
    const pieza = { cuando: '2026-10-29T00:20:00.000Z', id: 'pd_x', archivos: [{ ruta: 'src/a.ts', parte: 'hacerA' }], comprueba: 'npm test' };
    const r = aplicarParche(plan, { piezaSiguiente: pieza });
    expect(r.errores).toEqual([]);
    expect(r.plan.piezaSiguiente).toEqual(pieza);
  });

  it('cambiar unos campos por id (con null el campo sale) y quitar por id, también de lo que el mismo parche sumó', () => {
    const r = aplicarParche(plan, {
      misiones: [{ id: 't_c', para: 'titular', fase: 'replicable', titulo: 'C' }],
      cambiar: { misiones: { t_a: { vigente: '2026-10-27T17:00:00.000Z', despuesDe: null }, t_c: { titulo: 'C, mejor' } } },
      quitar: { misiones: ['t_b'] },
    });
    expect(r.errores).toEqual([]);
    expect(r.plan.misiones).toEqual([
      { id: 't_a', para: 'titular', fase: 'replicable', titulo: 'A', vigente: '2026-10-27T17:00:00.000Z' },
      { id: 't_c', para: 'titular', fase: 'replicable', titulo: 'C, mejor' },
    ]);
    expect(r.hecho).toEqual(['misiones: t_c (nuevo)', 'cambiar misiones: t_a, t_c', 'quitar misiones: t_b']);
  });

  it('una lista de adentro, por posición: reemplazar, quitar y sumar al final, sin reenviarla entera', () => {
    const conFase = { ...plan, fases: [{ id: 'replicable', misiones: ['cero', 'uno', 'dos'] }] } as unknown as Plan;
    const r = aplicarParche(conFase, { cambiar: { fases: { replicable: { misiones: { 0: 'cero, al día', 1: null, '+': ['tres'] } } } } });
    expect(r.errores).toEqual([]);
    expect(r.plan.fases[0].misiones).toEqual(['cero, al día', 'dos', 'tres']);
    expect(aplicarParche(conFase, { cambiar: { fases: { replicable: { misiones: { 7: 'x' } } } } }).errores.join(' ')).toMatch(/no es una posición/);
  });

  it('lo que no se entiende no se aplica, y dice por qué: el plan queda tal cual', () => {
    const malos: [unknown, RegExp][] = [
      [[], /no es un objeto/],
      [{ revisado: 'x' }, /lo pone el cierre/],
      [{ respuesta: {} }, /no es una clave del plan/],
      [{ respuestas: [] }, /por clave/],
      [{ misiones: [{ titulo: 'sin id' }] }, /con su id/],
      [{ cambiar: { misiones: { t_z: { titulo: 'x' } } } }, /no hay t_z/],
      [{ cambiar: { misiones: { t_a: { id: 't_otra' } } } }, /sin cambiar su id/],
      [{ cambiar: { respuestas: {} } }, /con solo misiones/],
      [{ quitar: { misiones: ['t_z'] } }, /no hay t_z/],
    ];
    for (const [parche, error] of malos) {
      const r = aplicarParche(plan, parche);
      expect(r.errores.join(' ')).toMatch(error);
      expect(r.plan).toBe(plan);
      expect(r.hecho).toEqual([]);
    }
  });

  it('la bandeja lo aplica solo si no le suma errores al plan, y sin marcar la revisión en curso', () => {
    const bandeja = readFileSync(join(__dirname, '..', '..', 'tools', 'director', 'bandeja.ts'), 'utf-8');
    const aplicar = bandeja.slice(bandeja.indexOf("if (args.includes('--aplicar'))"), bandeja.indexOf("if (args.includes('--aclarar')"));
    expect(aplicar).toContain('aplicarParche(');
    expect(aplicar).toMatch(/validarPlan\(r\.plan, equipo\)\.filter\(\(e\) => !antes\.has\(e\)\)/);
    expect(aplicar).not.toContain('marcarRevision');
  });
});
