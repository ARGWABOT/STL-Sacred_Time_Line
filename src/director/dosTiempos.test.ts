// La revisión en dos tiempos (pd_dos_tiempos): el formato de la lista de encargos del primer tiempo, su validación, cuándo
// se salta y cómo se mide, antes y después, con las revisiones de verdad.
import { describe, expect, it } from 'vitest';
import { antesYDespues, archivoDeEncargos, conElPlanDeLaRevision, conEncargoHecho, encargoDelPrimerTiempo, encargosDeLaRespuesta, finDelPrimerTiempo, lineaDelPrimerTiempo, MARGEN_DE_VENTANA, ordenDeHecho, registroDelPrimerTiempo, resumirRevisiones, saltaPrimerTiempo, ultimaListaDe, validarEncargos, VENTANAS, type EncargoDeRevision } from './dosTiempos';
import { lineaDeRegistro, type LineaDeRevision } from './lineasDeRevision';
import { PROCEDIMIENTOS } from './procedimientos';
import { REGISTRO } from './paquete';

const bien: EncargoDeRevision = {
  id: 'e1',
  que: 'Responder la nota del diálogo único y ajustar su paso.',
  origen: ['nmvshtxbitit'],
  archivos: [{ ruta: 'estudio/src/director.ts', parte: 'pedir()' }],
  espera: 'La nota respondida con su destino, y pruebas y tipos en verde.',
  procedimientos: ['formatos', 'ciclo'],
  modelo: 'sonnet',
  contexto: 120_000,
};

describe('la revisión en dos tiempos', () => {
  it('una lista de encargos bien escrita pasa', () => {
    expect(validarEncargos([bien, { ...bien, id: 'e2', modelo: 'director', archivos: [] }])).toEqual([]);
  });

  it('dice qué falta en cada encargo, por su id', () => {
    expect(validarEncargos([])).toEqual(['El plan de la revisión necesita al menos un encargo.']);
    expect(validarEncargos('x')).toHaveLength(1);
    const errores = validarEncargos([bien, { ...bien }, { id: 'e3', que: '', origen: [], archivos: [{}], espera: '', procedimientos: ['nada'], modelo: 'gpt', contexto: 1 }]);
    expect(errores).toContain('El encargo «e1» está dos veces.');
    for (const frase of ['no dice qué hacer', 'no dice qué se espera', 'no dice de dónde nace', 'no dice bien sus archivos', 'el procedimiento «nada», que no existe', 'no dice con qué modelo va'])
      expect(errores.some((e) => e.startsWith('El encargo «e3»') && e.includes(frase)), frase).toBe(true);
    expect(validarEncargos([{ ...bien, contexto: 0 }])[0]).toContain('no calcula cuánto contexto');
  });

  it('nunca le da a un modelo un encargo que su ventana no aguanta con margen', () => {
    const tope = Math.floor(VENTANAS.haiku * MARGEN_DE_VENTANA);
    expect(validarEncargos([{ ...bien, modelo: 'haiku', contexto: tope }])).toEqual([]);
    expect(validarEncargos([{ ...bien, modelo: 'haiku', contexto: tope + 1 }])[0]).toContain('pártelo, o dáselo a un modelo con más ventana');
    // Con la ventana real del director elegido (uno sin el millón)
    expect(validarEncargos([{ ...bien, modelo: 'director', contexto: 150_000 }], { ...VENTANAS, director: 200_000 })).toHaveLength(1);
  });

  it('el primer tiempo se salta cuando la revisión trae un solo trabajo pequeño', () => {
    expect(saltaPrimerTiempo({ notas: 1, entregas: 0, cola: 0, diagnosticos: 0 })).toBe(true);
    expect(saltaPrimerTiempo({ notas: 0, entregas: 0, cola: 0, diagnosticos: 0 })).toBe(true);
    expect(saltaPrimerTiempo({ notas: 1, entregas: 1, cola: 0, diagnosticos: 0 })).toBe(false);
    expect(saltaPrimerTiempo({ notas: 0, entregas: 0, cola: 1, diagnosticos: 0 })).toBe(false);
    expect(saltaPrimerTiempo({ notas: 0, entregas: 0, cola: 0, diagnosticos: 1 })).toBe(false);
  });

  it('se mide con las revisiones de verdad, antes y después: cuánto duran, cuánto gastan y cuántas cierran', () => {
    const l = (cuando: string, minutos: number | null, costo: number | null, cerro: boolean, tipo: LineaDeRevision['tipo'] = 'revision'): LineaDeRevision =>
      ({ registro: `p-${cuando}.log`, proyecto: 'p', tipo, cuando, minutos, costo, modelo: null, cerro, notas: [], archivos: [], commits: [], negados: [] });
    const lineas = [l('2026-10-20T10:00:00Z', 40, 10, true), l('2026-10-21T10:00:00Z', 60, 20, false), l('2026-10-22T10:00:00Z', 50, null, true), l('2026-10-22T12:00:00Z', 5, 1, true, 'urgencia'), l('2026-11-02T10:00:00Z', 30, 8, true)];
    expect(resumirRevisiones(lineas)).toEqual({ n: 4, minutos: 45, costo: 10, cerraron: 3 });
    const { antes, despues } = antesYDespues(lineas, '2026-11-01T00:00:00Z');
    expect(antes).toEqual({ n: 3, minutos: 50, costo: 15, cerraron: 2 });
    expect(despues).toEqual({ n: 1, minutos: 30, costo: 8, cerraron: 1 });
    expect(resumirRevisiones([])).toEqual({ n: 0, minutos: null, costo: null, cerraron: 0 });
  });
});

describe('el primer tiempo, conectado al lanzador', () => {
  it('su encargo nace en inglés, solo planea y nombra la bandeja, los minutos y las claves de los procedimientos', () => {
    const e = encargoDelPrimerTiempo('golf', 90);
    expect(e).toMatch(/^First time of the review/);
    expect(e).toContain('Do not execute anything');
    expect(e).toContain('node tools/director/bandeja.ts --proyecto golf');
    expect(e).toContain('within its 90 minutes');
    expect(e).toContain('only a JSON array');
    for (const k of Object.keys(PROCEDIMIENTOS)) expect(e).toContain(`"${k}"`);
  });

  it('lee la lista de su respuesta final, suelta o en un bloque de código, y la valida', () => {
    const json = JSON.stringify([bien]);
    expect(encargosDeLaRespuesta(json)).toEqual({ encargos: [bien] });
    expect(encargosDeLaRespuesta(`Aquí va:\n\`\`\`json\n${json}\n\`\`\`\n`)).toEqual({ encargos: [bien] });
    expect(encargosDeLaRespuesta(`El plan: ${json} y nada más.`)).toEqual({ encargos: [bien] });
    expect(encargosDeLaRespuesta('No sé qué hacer.')).toEqual({ errores: ['El primer tiempo no respondió con la lista de encargos.'] });
    expect(encargosDeLaRespuesta(null)).toEqual({ errores: ['El primer tiempo no respondió con la lista de encargos.'] });
    expect(encargosDeLaRespuesta('[{ "id": "e1", ]')).toEqual({ errores: ['La lista de encargos del primer tiempo no es JSON válido.'] });
    // Lo que no pasa la validación no se le da al director, con la ventana real del modelo
    expect('errores' in encargosDeLaRespuesta(JSON.stringify([{ ...bien, modelo: 'director', contexto: 150_000 }]), { ...VENTANAS, director: 200_000 })).toBe(true);
  });

  it('el segundo tiempo recibe su plan en su orden, con cómo marcar cada encargo hecho', () => {
    const otro = { ...bien, id: 'e2', que: 'Escribir el pedido nuevo.', archivos: [], modelo: 'director' as const, procedimientos: [] };
    const t = conElPlanDeLaRevision('golf', [bien, otro]);
    expect(t).toContain(ordenDeHecho('golf', '<id>'));
    expect(t).toContain('el cierre exige todo');
    expect(t.indexOf('«e1»')).toBeLessThan(t.indexOf('«e2»'));
    expect(t).toContain('estudio/src/director.ts (pedir())');
    expect(t).toContain(PROCEDIMIENTOS.formatos.archivo);
    expect(t).toContain('Con un ayudante (sonnet)');
    expect(t).toContain('Archivos: ninguno');
  });

  it('la lista y el registro del primer tiempo van junto al de la revisión, sin parecer otro lanzamiento', () => {
    const r = 'C:/s/.revisiones/golf-2026-10-28T20-20-02-425Z.log';
    expect(archivoDeEncargos(r)).toBe('C:/s/.revisiones/golf-2026-10-28T20-20-02-425Z.encargos.json');
    expect(registroDelPrimerTiempo(r)).toBe('C:/s/.revisiones/golf-2026-10-28T20-20-02-425Z.primer.jsonl');
    expect(REGISTRO.test('golf-2026-10-28T20-20-02-425Z.primer.jsonl')).toBe(false);
    const nombres = ['golf-2026-10-27T10-00-00-000Z.encargos.json', 'golf-2026-10-28T20-20-02-425Z.encargos.json', 'golf-aclaracion-2026-10-29T10-00-00-000Z.encargos.json', 'golf-norte-2026-10-30T10-00-00-000Z.encargos.json', 'golf-2026-10-28T20-20-02-425Z.log'];
    expect(ultimaListaDe(nombres, 'golf')).toBe('golf-2026-10-28T20-20-02-425Z.encargos.json');
    expect(ultimaListaDe(nombres, 'golf-norte')).toBe('golf-norte-2026-10-30T10-00-00-000Z.encargos.json');
    expect(ultimaListaDe(nombres, 'tenis')).toBeNull();
  });

  it('cada encargo se marca hecho una vez, y uno que no existe no se marca', () => {
    const lista = [bien, { ...bien, id: 'e2' }];
    const una = conEncargoHecho(lista, 'e2', '2026-10-28T21:00:00.000Z')!;
    expect(una.map((e) => e.hecho)).toEqual([undefined, '2026-10-28T21:00:00.000Z']);
    expect(conEncargoHecho(una, 'e2', '2026-10-28T22:00:00.000Z')![1].hecho).toBe('2026-10-28T21:00:00.000Z');
    expect(conEncargoHecho(lista, 'nada', '2026-10-28T21:00:00.000Z')).toBeNull();
  });

  it('de su registro saca su respuesta, su costo, sus minutos y la ventana del modelo', () => {
    const registro = [
      '{"type":"system","subtype":"init","model":"claude-opus-5-5[1m]"}',
      'un aviso en texto',
      JSON.stringify({ type: 'result', result: '[]', total_cost_usd: 0.4567, duration_ms: 95_000, modelUsage: { 'claude-opus-5-5[1m]': { contextWindow: 1_000_000 }, 'claude-haiku-5-5': { contextWindow: 200_000 } } }),
    ].join('\n');
    expect(finDelPrimerTiempo(registro)).toEqual({ respuesta: '[]', costo: 0.46, minutos: 1.6, ventana: 1_000_000 });
    expect(finDelPrimerTiempo('')).toEqual({ respuesta: null, costo: null, minutos: null, ventana: null });
  });

  it('la línea de la revisión suma lo que gastó y duró su primer tiempo', () => {
    const texto = [lineaDelPrimerTiempo({ ok: true, encargos: 3, minutos: 2.5, costo: 0.5 }).trim(), JSON.stringify({ type: 'result', total_cost_usd: 4, duration_ms: 600_000 })].join('\n');
    const l = lineaDeRegistro('golf-2026-10-28T20-20-02-425Z.log', texto)!;
    expect(l.costo).toBe(4.5);
    expect(l.minutos).toBe(12.5);
  });
});
