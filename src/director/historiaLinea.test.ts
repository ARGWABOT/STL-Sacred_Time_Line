import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ARCHIVO_LINEA, destinoDeRama, historiaConDetalle, historiaConRevision, informeDeRevision, leerHistoriaLinea, revisionDeLinea } from './historiaLinea';

// La historia de la línea viva, en la memoria del proyecto (pedido pd_linea_historia; elegido en t_linea_historia)
describe('la historia de la línea viva', () => {
  const desde = '2026-10-29T06:00:00.000Z';
  const corte = '2026-10-29T07:00:00.000Z';
  const junto = '2026-10-29T07:40:00.000Z';

  it('al cerrar, guarda las ramas que nacieron antes de empezar la revisión y que el director juntó en ella', () => {
    const notas = [
      { id: 'n1', cuando: '2026-10-29T06:10:00.000Z', sobre: { tipo: 'general' as const }, tipo: 'ajuste' as const },
      { id: 'n2', cuando: '2026-10-29T06:20:00.000Z', sobre: { tipo: 'mision' as const, eleccion: 'Sí' } },
      // Respondida en una revisión anterior: no es de esta
      { id: 'vieja', cuando: '2026-10-28T06:00:00.000Z', sobre: { tipo: 'general' as const } },
      // Llegó después de empezar: espera la siguiente
      { id: 'tarde', cuando: '2026-10-29T07:10:00.000Z', sobre: { tipo: 'general' as const } },
    ];
    const respuestas = {
      n1: { cuando: '2026-10-29T07:30:00.000Z' },
      n2: { cuando: '2026-10-29T07:30:00.000Z' },
      vieja: { cuando: '2026-10-28T08:00:00.000Z' },
    };
    const entregas = { t_a: { cuando: '2026-10-29T06:30:00.000Z' }, t_vieja: { cuando: '2026-10-27T06:30:00.000Z' } };
    const revisiones = { t_a: { cuando: '2026-10-29T07:20:00.000Z' }, t_vieja: { cuando: '2026-10-28T07:00:00.000Z' } };
    const propuestas = [{ id: 'pr_a', cuando: '2026-10-29T06:40:00.000Z' }, { id: 'pr_vieja', cuando: '2026-10-28T06:40:00.000Z' }];
    const r = revisionDeLinea(notas, respuestas, entregas, revisiones, propuestas, desde, corte, junto);
    // Con su corte: ahí apareció el director, y ahí se dibujan juntándose sus ramas
    expect(r).toEqual({
      desde,
      corte,
      junto,
      ramas: [
        { t: '2026-10-29T06:10:00.000Z', c: 'ajuste', n: 'n1', g: 'Una nota de voz', q: 'junta' },
        { t: '2026-10-29T06:20:00.000Z', c: 'eleccion', n: 'n2', g: 'Elegiste: Sí', q: 'junta' },
        { t: '2026-10-29T06:30:00.000Z', c: 'entrega', n: 'entrega-t_a', g: 'Entregaste una misión', q: 'junta' },
        { t: '2026-10-29T06:40:00.000Z', c: 'eleccion', n: 'propuesta-pr_a', g: 'Respondiste una propuesta', q: 'junta' },
      ],
    });
    // Poca cosa: unos cientos de letras por revisión
    expect(JSON.stringify(r).length).toBeLessThan(600);
  });

  it('cada rama guarda su nota, lo que dice su globo y la fase donde la dejó su respuesta (pd_linea_completa)', () => {
    const notas = [
      { id: 'n1', cuando: '2026-10-29T06:10:00.000Z', sobre: { tipo: 'general' as const }, tipo: 'idea' as const, texto: 'Que la línea suene\ncomo un resorte\ny algo más' },
      { id: 'n2', cuando: '2026-10-29T06:20:00.000Z', sobre: { tipo: 'general' as const }, tipo: 'ajuste' as const, texto: 'Más grande' },
    ];
    const respuestas: Record<string, { cuando: string; destino?: { vista?: string; fase?: string; ancla?: string } }> = {
      n1: { cuando: '2026-10-29T07:30:00.000Z', destino: { vista: 'ruta', fase: 'publico', ancla: 'pedido-pd_x' } },
      n2: { cuando: '2026-10-29T07:30:00.000Z', destino: { vista: 'misiones' } },
    };
    const r = revisionDeLinea(notas, respuestas, {}, {}, [], desde, corte, junto);
    expect(r.ramas).toEqual([
      { t: '2026-10-29T06:10:00.000Z', c: 'idea', n: 'n1', g: 'Que la línea suene\ncomo un resorte', f: 'publico', q: 'junta' },
      { t: '2026-10-29T06:20:00.000Z', c: 'ajuste', n: 'n2', g: 'Más grande', q: 'junta' },
    ]);
    // Se lee como se guardó; lo que no es texto, fuera
    const leida = leerHistoriaLinea(historiaConRevision(null, r))[0].ramas;
    expect(leida).toEqual(r.ramas);
    expect(leerHistoriaLinea('{"desde":"x","junto":"y","ramas":[{"t":"z","c":"idea","n":3,"g":null,"f":"claro"}]}')[0].ramas).toEqual([{ t: 'z', c: 'idea', f: 'claro' }]);
  });

  it('una misión entregada con lo que eligió en su último paso queda en la historia como una sola rama, la de la entrega (nmvvwyss9tit)', () => {
    const notas = [{ id: 'n1', cuando: '2026-10-29T06:29:59.000Z', sobre: { tipo: 'mision' as const, id: 't_a', seccion: 'Paso 1', eleccion: 'Sí' }, texto: 'Sí' }];
    const r = revisionDeLinea(notas, { n1: { cuando: '2026-10-29T07:30:00.000Z' } }, { t_a: { cuando: '2026-10-29T06:30:00.000Z' } },
      { t_a: { cuando: '2026-10-29T07:20:00.000Z' } }, [], desde, corte, junto);
    // Nacida cuando eligió, como la vio nacer (nmvvyrasktit)
    expect(r.ramas).toEqual([{ t: '2026-10-29T06:29:59.000Z', c: 'entrega', n: 'entrega-t_a', g: 'Entregaste una misión\nElegiste: Sí', q: 'junta' }]);
  });

  it('cada rama guarda qué hizo el director con ella, y el informe de la revisión cuenta las juntadas en la línea, las que esperan su fase y las cerradas, que suman las abiertas (pd_linea_informe, nmw2fksmgtit)', () => {
    const viene = new Set(['publico', 'despues']);
    // Integrada o una decisión de la fase en curso, junta; aplazada o llevada a una fase que viene, espera; informada o rechazada, cerrada
    expect(destinoDeRama({ cuando: 'x', tratamiento: 'integrada', destino: { fase: 'claro' } }, viene)).toBe('junta');
    expect(destinoDeRama({ cuando: 'x', tratamiento: 'decision' }, viene)).toBe('junta');
    expect(destinoDeRama({ cuando: 'x', tratamiento: 'integrada', destino: { fase: 'publico' } }, viene)).toBe('espera');
    expect(destinoDeRama({ cuando: 'x', tratamiento: 'aplazada', destino: { fase: 'claro' } }, viene)).toBe('espera');
    expect(destinoDeRama({ cuando: 'x', tratamiento: 'informada' }, viene)).toBe('cierra');
    expect(destinoDeRama({ cuando: 'x', tratamiento: 'rechazada' }, viene)).toBe('cierra');
    // Una entrega revisada o una propuesta respondida (sin respuesta propia), junta
    expect(destinoDeRama(undefined, viene)).toBe('junta');
    const notas = ['a', 'b', 'c', 'd'].map((id, i) => ({ id, cuando: `2026-11-04T06:1${i}:00.000Z`, sobre: { tipo: 'general' as const }, tipo: 'idea' as const }));
    const respuestas = {
      a: { cuando: '2026-11-04T07:30:00.000Z', tratamiento: 'integrada' },
      b: { cuando: '2026-11-04T07:30:00.000Z', tratamiento: 'aplazada', destino: { fase: 'publico' } },
      c: { cuando: '2026-11-04T07:30:00.000Z', tratamiento: 'informada' },
      d: { cuando: '2026-11-04T07:30:00.000Z', tratamiento: 'decision' },
    };
    const r = revisionDeLinea(notas, respuestas, {}, {}, [], '2026-11-04T06:00:00.000Z', '2026-11-04T07:00:00.000Z', '2026-11-04T07:40:00.000Z', viene);
    expect(r.ramas.map((x) => x.q)).toEqual(['junta', 'espera', 'cierra', 'junta']);
    expect(informeDeRevision(r)).toEqual({ abiertas: 4, juntadas: 2, esperan: 1, cerradas: 1 });
    // Se lee como se guardó; un destino inventado, fuera
    expect(leerHistoriaLinea(historiaConRevision(null, r))[0].ramas.map((x) => x.q)).toEqual(['junta', 'espera', 'cierra', 'junta']);
    expect(leerHistoriaLinea('{"desde":"x","junto":"y","ramas":[{"t":"z","c":"idea","q":"otra"}]}')[0].ramas[0]).not.toHaveProperty('q');
    // Antes del 4 de noviembre, solo cuántas se abrieron (nmw2hc1u0tit); con una rama sin el dato, también
    expect(informeDeRevision({ junto: '2026-10-29T07:40:00.000Z', ramas: [{ t: 'x', c: 'idea' }, { t: 'y', c: 'ajuste' }] })).toEqual({ abiertas: 2, sinDetalle: 'antes' });
    expect(informeDeRevision({ junto: '2026-11-04T07:40:00.000Z', ramas: [{ t: 'x', c: 'idea' }] })).toEqual({ abiertas: 1, sinDetalle: 'falta' });
    expect(informeDeRevision({ junto: '2026-11-04T07:40:00.000Z', ramas: [] })).toEqual({ abiertas: 0, juntadas: 0, esperan: 0, cerradas: 0 });
  });

  it('las revisiones desde el 4 de noviembre que aún no guardaban qué pasó con sus ramas lo completan de sus respuestas; las de antes, y lo que ya lo tiene, quedan igual (pd_linea_informe)', () => {
    const vieja = { desde: '2026-10-28T06:00:00.000Z', junto: '2026-10-28T07:00:00.000Z', ramas: [{ t: '2026-10-28T06:10:00.000Z', c: 'idea' as const, n: 'v' }] };
    const nueva = { desde: '2026-11-04T06:00:00.000Z', junto: '2026-11-04T07:00:00.000Z', ramas: [
      { t: '2026-11-04T06:10:00.000Z', c: 'idea' as const, n: 'a' },
      { t: '2026-11-04T06:20:00.000Z', c: 'entrega' as const, n: 'entrega-t_a' },
      { t: '2026-11-04T06:30:00.000Z', c: 'ajuste' as const, n: 'b', q: 'junta' as const },
    ] };
    const texto = historiaConRevision(historiaConRevision(null, vieja), nueva);
    const respuestas = { v: { cuando: 'x', tratamiento: 'informada' }, a: { cuando: 'x', tratamiento: 'rechazada' }, b: { cuando: 'x', tratamiento: 'informada' } };
    const completa = leerHistoriaLinea(historiaConDetalle(texto, respuestas, new Set()));
    expect(completa[0].ramas[0]).not.toHaveProperty('q');
    expect(completa[1].ramas.map((x) => x.q)).toEqual(['cierra', 'junta', 'junta']);
    expect(informeDeRevision(completa[1])).toEqual({ abiertas: 3, juntadas: 2, esperan: 0, cerradas: 1 });
    // Sin nada que completar, el mismo texto
    const ya = historiaConDetalle(texto, respuestas, new Set());
    expect(historiaConDetalle(ya, respuestas, new Set())).toBe(ya);
  });

  it('una revisión por línea; cerrar otra vez antes del commit la reemplaza, no la repite, y una línea rota no borra las demás', () => {
    const a = { desde: '2026-10-28T06:00:00.000Z', junto: '2026-10-28T07:00:00.000Z', ramas: [{ t: '2026-10-28T06:10:00.000Z', c: 'idea' as const }] };
    const b = { desde, junto, ramas: [] };
    const texto = historiaConRevision(historiaConRevision(null, b), a);
    expect(texto.trim().split('\n')).toHaveLength(2);
    expect(leerHistoriaLinea(texto).map((x) => x.junto)).toEqual([a.junto, b.junto]);
    const otraVez = historiaConRevision(texto, { ...b, junto: '2026-10-29T07:45:00.000Z' });
    expect(leerHistoriaLinea(otraVez)).toHaveLength(2);
    expect(leerHistoriaLinea(`${otraVez}{rota\n{"desde":"x","junto":"y","ramas":[{"t":"z","c":"inventada"}]}\n`)).toHaveLength(3);
    expect(leerHistoriaLinea(`{"desde":"x","junto":"y","ramas":[{"t":"z","c":"inventada"}]}`)[0].ramas).toEqual([]);
    // El corte se conserva al leer; las de antes, sin él, siguen valiendo
    expect(leerHistoriaLinea(historiaConRevision(null, { desde, corte, junto, ramas: [] }))[0].corte).toBe(corte);
    expect(leerHistoriaLinea(texto)[0]).not.toHaveProperty('corte');
    expect(leerHistoriaLinea(null)).toEqual([]);
  });

  it('el cierre la escribe junto al plan, su commit la incluye y el Studio la lee para la barra', () => {
    const raiz = join(__dirname, '..', '..');
    const bandeja = readFileSync(join(raiz, 'tools', 'director', 'bandeja.ts'), 'utf-8');
    const cierre = bandeja.slice(bandeja.indexOf("if (args.includes('--listo')) {\n  const elegido"), bandeja.indexOf("console.log(`Revisión marcada"));
    expect(cierre).toContain('revisionDeLinea(');
    expect(cierre).toContain('historiaConRevision(');
    // Con las fases que vienen, para contar lo que espera su fase, y completando lo que las del 4 de noviembre no guardaban
    expect(cierre).toContain('desde, corte ?? plan.revisado, plan.revisado, queViene,');
    expect(cierre).toContain('historiaConDetalle(existsSync(rutaLinea) ? readFileSync(rutaLinea, \'utf-8\') : null, completo.respuestas ?? {}, queViene)');
    expect(cierre.indexOf('historiaConRevision(')).toBeGreaterThan(cierre.indexOf('plan.revisado = new Date().toISOString();'));
    expect(bandeja).toContain('const suyos = `director/plan.json ${ARCHIVO_LINEA}');
    expect(ARCHIVO_LINEA).toBe('director/linea.jsonl');
    const servidor = readFileSync(join(raiz, 'estudio', 'servidor', 'api.ts'), 'utf-8');
    expect(servidor).toContain('lineaHistoria: leerHistoriaLinea(await leerFrescoTexto(raiz, `${rutasDe(id).base}/${ARCHIVO_LINEA}`)),');
  });
});
