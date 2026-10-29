// La revisión en dos tiempos (pd_dos_tiempos): el formato de la lista de encargos del primer tiempo, su validación, cuándo
// se salta y cómo se mide, antes y después, con las revisiones de verdad.
import { describe, expect, it } from 'vitest';
import { lecturasDeLaPieza, MAX_KB_PARTE, parteDeArchivo, piezaPorCerrar, procedimientosNombrados, conElPaqueteListo } from './dosTiempos';
import { antesYDespues, archivoDeEncargos, ayudantesDelPlan, conLosAyudantesDelPlan, bandejaParaElEncargo, conElPlanDeLaRevision, conEncargoHecho, conLaBandejaLista, MAX_KB_BANDEJA_LISTA, encargoDelPrimerTiempo, encargosDeLaRespuesta, finDelPrimerTiempo, lineaDelPrimerTiempo, MARGEN_DE_VENTANA, ordenDeHecho, registroDelPrimerTiempo, resumirRevisiones, saltaPrimerTiempo, skillsDelPlan, ultimaListaDe, validarEncargos, VENTANAS, type EncargoDeRevision } from './dosTiempos';
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

  it('el paquete listo: con la bandeja que corrió el Studio, los dos tiempos la reciben dentro y no la corren (pd_paquete_listo)', () => {
    const bandeja = '# Bandeja del director · Golf (golf)\n## Notas sin respuesta (1)\n';
    const e = encargoDelPrimerTiempo('golf', 90, bandeja);
    expect(e).toContain('The Studio already ran node tools/director/bandeja.ts --proyecto golf for you');
    expect(e).toContain('Do not run it again');
    expect(e).not.toContain('once and read what it lists');
    expect(e.endsWith(`<<<\n${bandeja.trimEnd()}\n>>>`)).toBe(true);
    const s = conLaBandejaLista('golf', bandeja);
    expect(s).toContain('No la corras otra vez para leerla');
    expect(s.endsWith(`La bandeja:\n<<<\n${bandeja.trimEnd()}\n>>>`)).toBe(true);
    // Vacía, sin salida o demasiado grande, no va: el director la corre él mismo, como antes
    expect(bandejaParaElEncargo(bandeja)).toBe(bandeja.trim());
    expect(bandejaParaElEncargo('  \n')).toBeNull();
    expect(bandejaParaElEncargo(null)).toBeNull();
    expect(bandejaParaElEncargo('x'.repeat(MAX_KB_BANDEJA_LISTA * 1024 + 1))).toBeNull();
  });

  it('el paquete listo: la pieza siguiente se deja escrita al cerrar, de la cola y con sus archivos (pd_paquete_listo)', () => {
    const desde = '2026-10-29T00:00:00Z';
    const pieza = { cuando: '2026-10-29T01:00:00Z', id: 'pd_b', archivos: [{ ruta: 'src/b.ts', parte: 'hacerB' }], comprueba: 'npx vitest run src/b.test.ts' };
    // Sin cola, nada que pedir
    expect(piezaPorCerrar(undefined, desde, [])).toBeNull();
    expect(piezaPorCerrar(pieza, desde, ['pd_a', 'pd_b'])).toBeNull();
    // Sin ella, o la de una revisión anterior, no cierra
    expect(piezaPorCerrar(undefined, desde, ['pd_a'])).toContain('deja escrita la pieza que sigue');
    expect(piezaPorCerrar({ ...pieza, cuando: '2026-10-28T00:00:00Z' }, desde, ['pd_b'])).toContain('deja escrita la pieza que sigue');
    // De su cola, con sus archivos y cómo se comprueba
    expect(piezaPorCerrar(pieza, desde, ['pd_a'])).toContain('no está en tu cola');
    expect(piezaPorCerrar({ ...pieza, archivos: [] }, desde, ['pd_b'])).toContain('no dice bien sus archivos');
    expect(piezaPorCerrar({ ...pieza, comprueba: ' ' }, desde, ['pd_b'])).toContain('no dice cómo se comprueba');
  });

  it('el paquete listo: la parte de cada archivo, en código y en Markdown, con su tope (pd_paquete_listo)', () => {
    const codigo = "import x from 'y';\n\n// La primera\nexport function hacerA() {\n  return 1;\n}\n\n/**\n * La segunda.\n */\nexport const hacerB = () => {\n  return 2;\n};\n\nexport function hacerC() {}\n";
    const b = parteDeArchivo(codigo, 'src/b.ts', 'hacerB')!;
    expect(b.startsWith('/**\n * La segunda.')).toBe(true);
    expect(b).toContain('return 2;');
    expect(b).not.toContain('hacerA');
    expect(b).not.toContain('hacerC');
    const md = '# Título\n\n## 1. Lo que entendí\nUno.\n\n## 2. El alcance\nDos.\n### 2.1 Detalle\nMás.\n\n## 3. Otra\nTres.\n';
    expect(parteDeArchivo(md, 'docs/x.md', 'el alcance')).toBe('## 2. El alcance\nDos.\n### 2.1 Detalle\nMás.\n');
    // Sin parte, o si no la encuentra, entero; si no cabe, null (se lee aparte)
    expect(parteDeArchivo(md, 'docs/x.md')).toBe(md);
    expect(parteDeArchivo(codigo, 'src/b.ts', 'noExiste')).toBe(codigo);
    expect(parteDeArchivo('x'.repeat(MAX_KB_PARTE * 1024 + 1), 'a.txt')).toBeNull();
    // Entre todas, con su tope: la que no cabe va sin texto
    const grande = 'y'.repeat((MAX_KB_PARTE - 1) * 1024);
    const lecturas = lecturasDeLaPieza({ cuando: '', id: 'pd_b', comprueba: '', archivos: [1, 2, 3, 4].map((i) => ({ ruta: `f${i}.txt` })).concat({ ruta: 'no.txt' }) }, (r) => (r === 'no.txt' ? null : grande));
    expect(lecturas.map((l) => l.texto !== null)).toEqual([true, true, false, false, false]);
  });

  it('el paquete listo: los procedimientos que nombra la bandeja y la pieza siguiente van al final del encargo (pd_paquete_listo)', () => {
    const bandeja = `Los procedimientos: ${PROCEDIMIENTOS.ciclo.archivo} (el ciclo); ${PROCEDIMIENTOS.formatos.archivo} (los formatos).`;
    expect(procedimientosNombrados(bandeja)).toEqual([PROCEDIMIENTOS.ciclo.archivo, PROCEDIMIENTOS.formatos.archivo].sort((a, b) => Object.values(PROCEDIMIENTOS).findIndex((p) => p.archivo === a) - Object.values(PROCEDIMIENTOS).findIndex((p) => p.archivo === b)));
    const pieza = { cuando: '2026-10-29T01:00:00Z', id: 'pd_b', archivos: [{ ruta: 'src/b.ts', parte: 'hacerB' }, { ruta: 'grande.ts' }], comprueba: 'npx vitest run src/b.test.ts' };
    const s = conElPaqueteListo([{ ruta: PROCEDIMIENTOS.ciclo.archivo, texto: '# El ciclo' }, { ruta: 'falta.md', texto: null }], pieza, [{ ruta: 'src/b.ts', parte: 'hacerB', texto: 'export const hacerB = 1;' }, { ruta: 'grande.ts', texto: null }]);
    expect(s).toContain(`do not read them again.\n\n<<< ${PROCEDIMIENTOS.ciclo.archivo}\n# El ciclo\n>>>`);
    expect(s).not.toContain('falta.md');
    expect(s).toContain('The next piece of your queue, as you left it written when closing the last review (2026-10-29T01:00:00Z): pd_b. How it is checked: npx vitest run src/b.test.ts');
    expect(s).toContain('<<< src/b.ts › hacerB\nexport const hacerB = 1;\n>>>');
    expect(s).toContain('Read apart, they did not fit: grande.ts.');
    expect(conElPaqueteListo([], null, [])).toBe('');
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

  it('cada encargo nombra sus skills, y el segundo tiempo arranca solo con las del plan (pd_dos_tiempos, nmvm0r0rstit)', () => {
    expect(encargoDelPrimerTiempo('golf', 60)).toContain('the second time starts with only the skills the plan names');
    expect(validarEncargos([{ ...bien, skills: ['sitio-3d-scroll'] }, { ...bien, id: 'e2', skills: [] }])).toEqual([]);
    expect(validarEncargos([{ ...bien, skills: [''] }])[0]).toContain('no dice bien sus skills');
    expect(validarEncargos([{ ...bien, skills: 'dataviz' as unknown as string[] }])[0]).toContain('no dice bien sus skills');
    expect(skillsDelPlan([{ ...bien, skills: ['vigila', ' dataviz '] }, { ...bien, id: 'e2', skills: ['dataviz'] }, { ...bien, id: 'e3' }])).toEqual(['dataviz', 'vigila']);
    expect(skillsDelPlan([bien])).toEqual([]);
    const t = conElPlanDeLaRevision('golf', [{ ...bien, skills: ['dataviz'] }]);
    expect(t).toContain('Skills: dataviz.');
    expect(conElPlanDeLaRevision('golf', [bien])).not.toContain('Skills:');
  });

  it('el modelo de cada encargo se aplica a los ayudantes del segundo tiempo, nunca menor ni mayor que el de siempre (pr_modelos_por_tarea)', () => {
    const director = { ...bien, id: 'd', modelo: 'director' as const };
    const sonnet = { ...bien, id: 's', modelo: 'sonnet' as const };
    const haiku = { ...bien, id: 'h', modelo: 'haiku' as const, contexto: 50_000 };
    // Todo lo que delega va con Haiku: Haiku
    expect(ayudantesDelPlan([director, haiku], 'sonnet')).toBe('haiku');
    // Algo con Sonnet, o nada delegado: el de siempre
    expect(ayudantesDelPlan([haiku, sonnet], 'sonnet')).toBe('sonnet');
    expect(ayudantesDelPlan([director], 'sonnet')).toBe('sonnet');
    // Con un director Haiku, nunca uno mayor
    expect(ayudantesDelPlan([sonnet], 'haiku')).toBe('haiku');
    expect(conLosAyudantesDelPlan('haiku')).toContain('trabajan con «haiku»');
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
