import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { comoQuedaronEnBuzon, comoQuedoNota, estadoVacio, notasDeTipo, notasQueQuedaron, OPCIONES_TIPO_DE_NOTA, pideTipo, respuestasSinTipo, TIPO_ELIGE, tipoDeNota, tiposEnBuzon, validarEstado, type Nota, type Plan } from './director';

// El tipo de cada nota, obligatorio y de un toque (pedido pd_tipo_obligatorio, parte 1 de la propuesta aceptada
// pr_tipo_nota), y las notas de antes como «Sin tipo», con su filtro en el Buzón (tu decisión nmvsv9nuytit, en
// t_decidir_notas_viejas)
const nota = (id: string, sobre: Nota['sobre'], tipo?: Nota['tipo']): Nota => ({ id, cuando: '2026-10-29T02:00:00.000Z', quien: 'leonc', sobre, texto: 'Algo.', ...(tipo ? { tipo } : {}) });

describe('cada nota con su tipo', () => {
  it('se elige de un toque entre cinco tipos y «No sé: elígelo tú», salvo donde el lugar ya lo dice', () => {
    expect(OPCIONES_TIPO_DE_NOTA.map(([, n]) => n)).toEqual(['Idea para después', 'Ajuste', 'Algo falla', 'Pregunta', 'Te respondo', 'No sé: elígelo tú']);
    expect(pideTipo({ tipo: 'general' })).toBe(true);
    expect(pideTipo({ tipo: 'mision', id: 't_a', seccion: 'Paso 1' })).toBe(true);
    expect(pideTipo({ tipo: 'documento', id: 'docs/a.md', seccion: '1. Algo' })).toBe(true);
    // Una pregunta, una decisión, una opción elegida, un «Hazlo tú», «No lo entiendo» o «Ya lo hice: compruébalo tú»
    expect(pideTipo({ tipo: 'pregunta' })).toBe(false);
    expect(pideTipo({ tipo: 'documento', id: 'docs/a.md', seccion: '1. Algo', decision: 'X', postura: 'decide' })).toBe(false);
    expect(pideTipo({ tipo: 'mision', id: 't_a', seccion: 'Paso 1', eleccion: 'Sí' })).toBe(false);
    expect(pideTipo({ tipo: 'mision', id: 't_a', seccion: 'Paso 1', hazlo: true })).toBe(false);
    expect(pideTipo({ tipo: 'mision', id: 't_a', seccion: 'Paso 1', aclarar: true })).toBe(false);
    expect(pideTipo({ tipo: 'mision', id: 't_a', seccion: 'Paso 1', comprobar: true })).toBe(false);
  });

  it('las notas de antes quedan «Sin tipo»; la que dudó toma el que le pone el director; el lugar dice el suyo', () => {
    expect(tipoDeNota(nota('n1', { tipo: 'general' }))).toBe('sin');
    expect(tipoDeNota(nota('n2', { tipo: 'general' }, 'falla'))).toBe('falla');
    expect(tipoDeNota(nota('n3', { tipo: 'general' }, TIPO_ELIGE))).toBe(TIPO_ELIGE);
    expect(tipoDeNota(nota('n3', { tipo: 'general' }, TIPO_ELIGE), { tipo: 'idea' })).toBe('idea');
    // Una nota de antes que el director lee hoy: lleva el tipo que le puso al responderla
    expect(tipoDeNota(nota('n1', { tipo: 'general' }), { tipo: 'ajuste' })).toBe('ajuste');
    // Lo que eligió la persona manda sobre lo que dijo el director (si no calzaba, lo corrige en sus partes)
    expect(tipoDeNota(nota('n2', { tipo: 'general' }, 'falla'), { tipo: 'idea' })).toBe('falla');
    expect(tipoDeNota(nota('n4', { tipo: 'pregunta' }))).toBe('pregunta');
    expect(tipoDeNota(nota('n5', { tipo: 'mision', id: 't_a', eleccion: 'Sí' }))).toBe('respuesta');
  });

  it('el filtro del Buzón: cuántas de cada tipo, en el orden de los botones, y solo las de ese tipo', () => {
    const notas = [nota('n1', { tipo: 'general' }), nota('n2', { tipo: 'general' }, 'falla'), nota('n3', { tipo: 'general' }), nota('n4', { tipo: 'general' }, 'idea')];
    expect(tiposEnBuzon(notas, {})).toEqual([['idea', 1], ['falla', 1], ['sin', 2]]);
    expect(notasDeTipo(notas, {}, 'sin').map((n) => n.id)).toEqual(['n1', 'n3']);
    expect(notasDeTipo(notas, {}, '').map((n) => n.id)).toEqual(['n1', 'n2', 'n3', 'n4']);
  });

  it('el filtro «Cómo quedó» del Buzón: esperando o el tratamiento de su respuesta, sobre las del tipo elegido', () => {
    const notas = [nota('n1', { tipo: 'general' }, 'idea'), nota('n2', { tipo: 'general' }, 'falla'), nota('n3', { tipo: 'general' }, 'idea'), nota('n4', { tipo: 'general' })];
    const respuestas = { n1: { tratamiento: 'aplazada' as const }, n2: { tratamiento: 'integrada' as const }, n4: {} };
    expect(comoQuedoNota(notas[2], respuestas)).toBe('esperando');
    // Una respuesta de antes sin tratamiento cuenta como respondida
    expect(comoQuedoNota(notas[3], respuestas)).toBe('informada');
    expect(comoQuedaronEnBuzon(notas, respuestas)).toEqual([['esperando', 1], ['integrada', 1], ['aplazada', 1], ['informada', 1]]);
    const ideas = notasDeTipo(notas, {}, 'idea');
    expect(notasQueQuedaron(ideas, respuestas, 'aplazada').map((n) => n.id)).toEqual(['n1']);
    expect(notasQueQuedaron(ideas, respuestas, '').map((n) => n.id)).toEqual(['n1', 'n3']);
    const pagina = readFileSync(join(__dirname, '..', '..', 'estudio', 'src', 'director.ts'), 'utf-8');
    expect(pagina).toContain('const notas = notasQueQuedaron(deTipo, d.plan.respuestas, comoBuzon);');
  });

  it('el cierre exige el tipo en la respuesta a una nota que dejó «No sé: elígelo tú»; a una de antes, sin tipo, no', () => {
    const desde = '2026-10-29T01:00:00.000Z';
    const notas = [nota('n_duda', { tipo: 'general' }, TIPO_ELIGE), nota('n_vieja', { tipo: 'general' }), nota('n_con', { tipo: 'general' }, 'ajuste'), nota('n_eligio', { tipo: 'mision', id: 't_a', eleccion: 'Sí' })];
    const r = (tipo?: string) => ({ cuando: '2026-10-29T02:10:00.000Z', texto: 'Hecho.', tratamiento: 'informada', ...(tipo ? { tipo } : {}) });
    const plan = { respuestas: { n_duda: r(), n_vieja: r(), n_con: r(), n_eligio: r() } } as unknown as Plan;
    expect(respuestasSinTipo(plan, notas, desde)).toEqual(['n_duda']);
    const conTipo = { respuestas: { ...plan.respuestas, n_duda: r('idea') } } as unknown as Plan;
    expect(respuestasSinTipo(conTipo, notas, desde)).toEqual([]);
    // Lo respondido en revisiones de antes no se toca: queda «Sin tipo»
    expect(respuestasSinTipo(plan, notas, '2026-10-30T00:00:00.000Z')).toEqual([]);
  });

  it('un tipo desconocido en una nota guardada es un error', () => {
    const plan = { fases: [], frentes: [], propuestas: [], misiones: [] } as unknown as Plan;
    const e = estadoVacio();
    e.notas = [nota('n1', { tipo: 'general' }, 'idea'), { ...nota('n2', { tipo: 'general' }), tipo: 'otra' as never }];
    expect(validarEstado(e, plan)).toEqual(['La nota n2 tiene un tipo desconocido.']);
  });

  it('el servidor no guarda una nota sin su tipo donde hay que elegirlo, y el Studio lo pide en el comentario y en el Buzón', () => {
    const servidor = readFileSync(join(__dirname, '..', '..', 'estudio', 'servidor', 'director.ts'), 'utf-8');
    const comentar = servidor.slice(servidor.indexOf("case 'comentar': {"), servidor.indexOf("case 'borrar_nota': {"));
    expect(comentar).toContain('if (!tipo && pideTipo(donde)) throw new Rechazo(');
    expect(comentar.indexOf('pideTipo(donde)')).toBeLessThan(comentar.indexOf('guardarAudio('));
    const pagina = readFileSync(join(__dirname, '..', '..', 'estudio', 'src', 'director.ts'), 'utf-8');
    expect(pagina).toContain("campos: [...(pideTipo(sobre as Nota['sobre']) ? [campoTipo()] : []),");
    // El comentario general es el mismo diálogo único (pd_dialogo_unico): sobre «general», pideTipo lo pide
    expect(pagina).toContain("await comentar({ tipo: 'general' }");
    expect(pideTipo({ tipo: 'general' })).toBe(true);
    const bandeja = readFileSync(join(__dirname, '..', '..', 'tools', 'director', 'bandeja.ts'), 'utf-8');
    expect(bandeja).toContain('const sinTipo = respuestasSinTipo(plan, estado.notas, desde);');
  });
});
