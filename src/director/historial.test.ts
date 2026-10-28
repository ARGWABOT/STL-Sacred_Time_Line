import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { estadoVacio, type EstadoDirector, type Nota, type Plan } from './director';
import { historialDeDecisiones, lineasDelHistorial, MAX_DISTINTO } from './historial';

// El historial de decisiones de cada proyecto (pr_nucleo_medido, punto 1): lo que recomendó el director y cómo salió,
// sacado sin modelo de lo que el Studio ya guarda
const decide = (id: string, cuando: string, decision: string, postura?: Nota['sobre']['postura'], texto = `nota ${id}`): Nota =>
  ({ id, cuando, quien: 'titular', sobre: { tipo: 'documento', id: 'docs/director/ruta.md', seccion: '2. Las fases', decision, postura }, texto }) as Nota;
const aclara = (id: string): Nota => ({ id, cuando: '2026-10-22T10:00:00.000Z', quien: 'titular', sobre: { tipo: 'mision', id: 't_a', seccion: 'Paso 1', aclarar: true } }) as Nota;

const plan = {
  propuestas: [{ id: 'pr_chat', titulo: 'El chat con el director' }],
  misiones: [{ id: 't_a', titulo: 'Lee la ruta' }, { id: 't_b', titulo: 'Prueba la instalación' }],
  revisiones: {
    t_a: { cuando: '2026-10-21T10:00:00.000Z', veredicto: 'aprobada', comentario: 'Bien.' },
    t_b: { cuando: '2026-10-23T10:00:00.000Z', veredicto: 'rehacer', comentario: 'Falta la captura del paso 3.' },
    t_viejo: { cuando: '2026-10-18T10:00:00.000Z', veredicto: 'aprobada', comentario: 'Del archivo.' },
  },
} as unknown as Plan;

const estado: EstadoDirector = {
  ...estadoVacio(),
  notas: [
    decide('n1', '2026-10-20T10:00:00.000Z', '1. El orden', 'aprueba'),
    decide('n2', '2026-10-21T10:00:00.000Z', '1. El orden', 'decide', 'Primero la voz, después el resto.'),
    decide('n3', '2026-10-22T10:00:00.000Z', '2. La voz', 'aprueba'),
    decide('n4', '2026-10-22T11:00:00.000Z', '3. El equipo', 'comenta'),
    aclara('n5'),
    aclara('n6'),
  ],
  propuestas: {
    pr_chat: { fecha: '2026-10-24T10:00:00.000Z', quien: 'titular', estado: 'descartada', nota: 'No hace falta un chat.' },
    pr_otra: { fecha: '2026-10-19T10:00:00.000Z', quien: 'titular', estado: 'aceptada' },
    pr_estudio: { fecha: '2026-10-19T10:00:00.000Z', quien: 'titular', estado: 'en_estudio' },
  },
  entregas: { t_b: { cuando: '2026-10-22T10:00:00.000Z', quien: 'titular', sinTerminar: 2 }, t_a: { cuando: '2026-10-20T10:00:00.000Z', quien: 'titular' } },
};

describe('el historial de decisiones de un proyecto', () => {
  it('cuenta cada decisión por su última nota, las propuestas respondidas, los veredictos, lo entregado sin terminar y los «No lo entiendo»', () => {
    const h = historialDeDecisiones(plan, estado);
    // «1. El orden» la decidió al final con sus palabras; un comentario no decide
    expect(h.decisiones).toEqual({ talCual: 1, conSusPalabras: 1 });
    expect(h.propuestas).toEqual({ aceptadas: 1, descartadas: 1 });
    // También lo del archivo (el plan unido)
    expect(h.misiones).toEqual({ aprobadas: 2, rehacer: 1, sinTerminar: 1 });
    expect(h.aclaraciones).toBe(2);
  });

  it('lo que salió distinto, de lo más nuevo a lo más viejo, con lo que se dijo', () => {
    const h = historialDeDecisiones(plan, estado);
    expect(h.distinto).toEqual([
      { cuando: '2026-10-24T10:00:00.000Z', que: 'propuesta descartada «El chat con el director»', dijo: 'No hace falta un chat.' },
      { cuando: '2026-10-23T10:00:00.000Z', que: 'misión para rehacer «Prueba la instalación»', dijo: 'Falta la captura del paso 3.' },
      { cuando: '2026-10-21T10:00:00.000Z', que: 'decisión «1. El orden» de ruta.md, con sus palabras', dijo: 'Primero la voz, después el resto.' },
    ]);
    // Lo que dice una nota con audio lo da la bandeja, que lee su transcripción
    expect(historialDeDecisiones(plan, estado, (n) => `oído ${n.id}`).distinto[2].dijo).toBe('oído n2');
    expect(historialDeDecisiones(plan, estado, undefined, 1).distinto).toHaveLength(1);
    expect(MAX_DISTINTO).toBeGreaterThan(2);
  });

  it('en la bandeja: tres líneas de cifras y lo que salió distinto; sin nada, nada', () => {
    const l = lineasDelHistorial(historialDeDecisiones(plan, estado));
    expect(l[0]).toBe('- Decisiones de los documentos: 2; 1 con «Apruebo lo que recomiendas» y 1 con sus palabras (iguales o distintas a tu recomendación).');
    expect(l[1]).toBe('- Propuestas respondidas: 1 aceptadas y 1 descartadas.');
    expect(l[2]).toBe('- Misiones revisadas: 2 aprobadas y 1 para rehacer; 1 entregadas sin terminar y 2 pasos con «No lo entiendo».');
    expect(l).toContain('- 2026-10-24 · propuesta descartada «El chat con el director»: «No hace falta un chat.»');
    expect(lineasDelHistorial(historialDeDecisiones({ propuestas: [], misiones: [], revisiones: {} } as unknown as Plan, estadoVacio()))).toEqual([]);
  });

  it('la bandeja lo sirve con el plan unido y las notas del proyecto que revisa', () => {
    const bandeja = readFileSync(join(__dirname, '..', '..', 'tools', 'director', 'bandeja.ts'), 'utf-8');
    expect(bandeja).toContain('lineasDelHistorial(historialDeDecisiones(plan, estado');
    expect(bandeja.indexOf('## Tu historial en este proyecto')).toBeGreaterThan(bandeja.indexOf('## Lo vigente'));
  });
});
