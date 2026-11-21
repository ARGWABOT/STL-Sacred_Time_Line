// La revisión como una conversación (notas nmvx09it7tit y nmvx0q10ctit): un registro en stream-json, con sus tiempos exactos.
import { describe, expect, it } from 'vitest';
import { claseDeOrden, claseDeTurno, contextoDeUso, conversacionDe, ENCARGO_DE_PLANEAR, esOrdenDePruebas, esperaDe, informeDeTurnos, leerRevisionEntera, leerTurnos, lecturaNueva, pruebasDe, TOPE_TEXTO } from './turnos';

const seg = (n: number) => new Date(Date.UTC(2026, 9, 31, 18, 0, n)).toISOString();
const dice = (t: number, ...content: unknown[]) => JSON.stringify({ type: 'assistant', message: { id: `m${t}`, content }, parent_tool_use_id: null, timestamp: seg(t) });
const vuelve = (t: number, id: string, content: unknown, extra = {}) => JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content, ...extra }] }, parent_tool_use_id: null, timestamp: seg(t) });
const usa = (id: string, name: string, input: unknown) => ({ type: 'tool_use', id, name, input });

/** El Studio le da el encargo a los 0 s; el modelo pide las pruebas a los 10; tu computador las corre en 30; el modelo dice algo a los 45. */
const registro = [
  'no es JSON: un aviso',
  JSON.stringify({ type: 'studio', primerTiempo: { ok: true, encargos: 3, minutos: 2.5, tokens: 1000 } }),
  JSON.stringify({ type: 'studio', encargo: { cuando: seg(0) } }),
  JSON.stringify({ type: 'system', subtype: 'init' }),
  dice(10, { type: 'text', text: 'Corro las pruebas.' }, usa('a', 'Bash', { command: 'npm test', description: 'Run the tests' })),
  vuelve(40, 'a', 'Tests 12 passed'),
  dice(45, { type: 'text', text: 'Listas.' }),
].join('\n');

describe('lo que dibuja la avalancha, sacado del registro (nmvzq49rutit, nmw3pqamctit)', () => {
  const llamada = (t: number, usage: unknown, padre: string | null = null) => JSON.stringify({ type: 'assistant', message: { id: `m${t}`, content: [{ type: 'text', text: 'Sigo.' }], usage }, parent_tool_use_id: padre, timestamp: seg(t) });
  it('la bola es lo que se mandó en la última llamada de la conversación principal, con su parte de la caché; los resúmenes, el pino', () => {
    expect(contextoDeUso({ input_tokens: 100, cache_creation_input_tokens: 300, cache_read_input_tokens: 600 })).toEqual({ contexto: 1000, cache: 0.6 });
    expect(contextoDeUso(undefined)).toEqual({ contexto: 0, cache: 0 });
    const l = leerTurnos([
      llamada(1, { input_tokens: 2000, output_tokens: 5 }),
      llamada(2, { input_tokens: 10, cache_read_input_tokens: 3990, output_tokens: 5 }),
      // Lo de un ayudante no es la bola de la conversación principal
      llamada(3, { input_tokens: 90_000, output_tokens: 5 }, 'tarea'),
      JSON.stringify({ type: 'system', subtype: 'compact_boundary', timestamp: seg(4) }),
    ].join('\n'));
    expect(conversacionDe(l).nieve).toEqual({ contexto: 4000, cache: 0.9975, llamadas: 2, resumenes: 1, ultimoResumen: seg(4) });
    // Sin llamadas informadas, no viene
    expect(conversacionDe(leerTurnos(registro)).nieve).toBeUndefined();
  });
});

describe('la revisión entera, desde su primera comunicación (nota del titular nmvybx5rctit)', () => {
  const primero = [
    JSON.stringify({ type: 'studio', encargo: { cuando: seg(0), paraPlanear: true } }),
    dice(5, usa('p', 'Read', { file_path: 'plan.json' })),
    vuelve(7, 'p', 'texto'),
    dice(20, { type: 'text', text: '[]' }),
    JSON.stringify({ type: 'result', result: '[]', usage: { input_tokens: 100, output_tokens: 10 } }),
  ].join('\n');
  const segundo = [
    JSON.stringify({ type: 'studio', pedido: { modelo: null, esfuerzo: null } }),
    JSON.stringify({ type: 'studio', primerTiempo: { ok: true, encargos: 2, minutos: 0.3, tokens: 110 } }),
    JSON.stringify({ type: 'studio', encargo: { cuando: seg(30) } }),
    JSON.stringify({ type: 'assistant', message: { id: 'm40', usage: { input_tokens: 50, output_tokens: 5 }, content: [{ type: 'text', text: 'Listo.' }] }, parent_tool_use_id: null, timestamp: seg(40) }),
  ].join('\n');

  it('el primer tiempo va antes que el segundo, con el mismo orden en vivo y en el historial', () => {
    const entera = leerRevisionEntera(primero, segundo);
    expect(entera.turnos.map((t) => t.tipo)).toEqual(['encargo', 'pide', 'responde', 'dice', 'plan', 'encargo', 'dice']);
    expect(entera.turnos[0].texto).toBe(ENCARGO_DE_PLANEAR);
    expect(entera.turnos[5].texto).toBe('');
    // De a pedazos, como se lee en vivo, da lo mismo
    const vivo = leerTurnos(segundo, leerTurnos(primero));
    expect(vivo.turnos.map((t) => [t.id, t.tipo])).toEqual(entera.turnos.map((t) => [t.id, t.tipo]));
    // Sin primer tiempo, solo lo suyo
    expect(leerRevisionEntera('', segundo).turnos.map((t) => t.tipo)).toEqual(['plan', 'encargo', 'dice']);
    // Una revisión de antes, cuyo primer tiempo no escribió su encargo: lo demás se ve igual
    expect(leerRevisionEntera(primero.split('\n').slice(1).join('\n'), segundo).turnos.map((t) => t.tipo)).toEqual(['pide', 'responde', 'dice', 'plan', 'encargo', 'dice']);
  });

  it('los tokens y los tiempos son de toda la revisión, y lo del primer tiempo no se queda esperando', () => {
    const entera = leerRevisionEntera(primero, segundo);
    // 100 + 10 del resultado del primero, y 50 + 5 de lo que va del segundo: el final del primero no tapa lo que sigue
    expect(conversacionDe(entera).tokens).toEqual({ enviados: 150, recibidos: 15 });
    expect(entera.totales).toEqual({ modeloMs: 28_000, computadorMs: 2_000, ayudanteMs: 0 });
    // Un primer tiempo que se cortó con una herramienta sin respuesta tampoco deja a nadie esperando
    const cortado = leerRevisionEntera([JSON.stringify({ type: 'studio', encargo: { cuando: seg(0), paraPlanear: true } }), dice(5, usa('p', 'Read', { file_path: 'x' }))].join('\n'), JSON.stringify({ type: 'studio', primerTiempo: { ok: false, porque: 'no', minutos: 1 } }));
    expect(esperaDe(cortado)).toBeNull();
  });

  it('cada intento del primer tiempo suma sus tokens', () => {
    const intentos = leerRevisionEntera([
      JSON.stringify({ type: 'result', usage: { input_tokens: 100, output_tokens: 10 } }),
      JSON.stringify({ type: 'studio', intento: 2, porque: 'no pasó la validación' }),
      JSON.stringify({ type: 'result', usage: { input_tokens: 200, output_tokens: 20 } }),
    ].join('\n'), JSON.stringify({ type: 'studio', primerTiempo: { ok: true, encargos: 1, minutos: 1 } }));
    expect(conversacionDe(intentos).tokens).toEqual({ enviados: 300, recibidos: 30 });
  });
});

describe('lo pedido en un mismo mensaje lleva su lote, y lo que vuelve también (nmvzirz2ctit)', () => {
  it('cada bloque en su evento e intercalado con su resultado, como lo escribe el registro', () => {
    const mismo = (t: number, id: string) => JSON.stringify({ type: 'assistant', message: { id: 'm1', content: [usa(id, 'Read', { file_path: `${id}.ts` })] }, parent_tool_use_id: null, timestamp: seg(t) });
    const l = leerTurnos([mismo(10, 'a'), vuelve(11, 'a', 'x'), mismo(12, 'b'), vuelve(13, 'b', 'x'), dice(14, usa('c', 'Read', { file_path: 'c.ts' })), vuelve(15, 'c', 'x')].join('\n'));
    expect(l.turnos.map((t) => t.lote)).toEqual(['pide:m1', 'responde:m1', 'pide:m1', 'responde:m1', 'pide:m14', 'responde:m14']);
    // Lo que dice el modelo no entra en ningún lote, ni lo que corre un ayudante por dentro
    const texto = leerTurnos(dice(20, { type: 'text', text: 'Hola.' }));
    expect(texto.turnos[0].lote).toBeUndefined();
  });

  it('un registro sin id de mensaje sigue saliendo, con cada cosa en su globo', () => {
    const sinId = JSON.stringify({ type: 'assistant', message: { content: [usa('a', 'Read', { file_path: 'a.ts' })] }, parent_tool_use_id: null, timestamp: seg(1) });
    const l = leerTurnos([sinId, vuelve(2, 'a', 'x')].join('\n'));
    expect(l.turnos.map((t) => t.lote)).toEqual([undefined, undefined]);
  });
});

describe('los turnos de una revisión', () => {
  it('quién le habla a quién, qué le pide y cuánto tardó el otro', () => {
    const { turnos } = leerTurnos(registro);
    expect(turnos.map((t) => [t.de, t.a, t.tipo])).toEqual([
      ['modelo', 'computador', 'plan'],
      ['computador', 'modelo', 'encargo'],
      ['modelo', 'computador', 'dice'],
      ['modelo', 'computador', 'pide'],
      ['computador', 'modelo', 'responde'],
      ['modelo', 'computador', 'dice'],
    ]);
    // El plan lo escribió el modelo en su primer tiempo: es su globo
    expect(turnos[0].tardoMs).toBe(150_000);
    // Quien da el encargo no tardó nada: lo que sigue es del modelo
    expect(turnos[1].tardoMs).toBeNull();
  });

  // Nota de voz del titular nmvy3jz2otit, 1 de noviembre de 2026: el tiempo estaba en el globo del otro
  it('cada tiempo va en el globo de quien se lo tomó: 13 s del modelo, en el del modelo; 2 s de la herramienta, en el del director', () => {
    const { turnos } = leerTurnos([
      JSON.stringify({ type: 'studio', encargo: { cuando: seg(0) } }),
      dice(13, usa('a', 'Read', { file_path: 'a.ts' })),
      vuelve(15, 'a', 'texto'),
      dice(28, { type: 'text', text: 'Listo.' }),
    ].join('\n'));
    expect(turnos.map((t) => [t.de, t.tipo, t.tardoMs])).toEqual([
      ['computador', 'encargo', null],
      ['modelo', 'pide', 13_000],
      ['computador', 'responde', 2_000],
      ['modelo', 'dice', 13_000],
    ]);
  });

  it('un mensaje con varias partes muestra su tiempo una sola vez, también si llega en varios eventos', () => {
    const { turnos } = leerTurnos([
      JSON.stringify({ type: 'studio', encargo: { cuando: seg(0) } }),
      dice(10, { type: 'text', text: 'Leo dos.' }, usa('a', 'Read', { file_path: 'a.ts' })),
      dice(10, usa('b', 'Read', { file_path: 'b.ts' })),
    ].join('\n'));
    expect(turnos.filter((t) => t.de === 'modelo').map((t) => t.tardoMs)).toEqual([10_000, null, null]);
  });

  it('un evento solo con su razonamiento no gasta el tiempo: lo muestra el globo que sí se ve', () => {
    const { turnos } = leerTurnos([
      JSON.stringify({ type: 'studio', encargo: { cuando: seg(0) } }),
      dice(4, { type: 'thinking', thinking: 'Pienso.' }),
      dice(9, { type: 'text', text: 'Listo.' }),
    ].join('\n'));
    expect(turnos.at(-1)).toMatchObject({ tipo: 'dice', tardoMs: 9_000 });
  });

  it('el tiempo de cada actor, exacto', () => {
    expect(leerTurnos(registro).totales).toEqual({ modeloMs: 15_000, computadorMs: 30_000, ayudanteMs: 0 });
  });

  it('pedidas a la vez, cuentan una sola vez, y el modelo solo espera cuando todas volvieron', () => {
    const l = leerTurnos([
      dice(0, usa('a', 'Read', { file_path: 'C:\\x\\uno.ts' }), usa('b', 'Grep', { pattern: 'hola' })),
      vuelve(2, 'a', 'uno'),
      vuelve(5, 'b', 'dos'),
      dice(9, { type: 'text', text: 'Listo.' }),
    ].join('\n'));
    expect(l.totales).toEqual({ modeloMs: 4_000, computadorMs: 5_000, ayudanteMs: 0 });
    // Lo que corrieron a la vez se reparte: cada respuesta lleva lo suyo desde la anterior, y la suma es lo que corrió
    const respuestas = l.turnos.filter((t) => t.tipo === 'responde');
    expect(respuestas.map((t) => t.tardoMs)).toEqual([2_000, 3_000]);
    expect(l.turnos.filter((t) => t.tipo === 'pide').map((t) => [t.detalle, t.tardoMs])).toEqual([['uno.ts', null], ['hola', null]]);
    // Lo que tomó cada una, por su cuenta, sigue para el informe
    expect(l.peticiones.map((p) => p.ms)).toEqual([2_000, 5_000]);
    // El modelo: lo suyo desde la última respuesta
    expect(l.turnos.at(-1)).toMatchObject({ tipo: 'dice', tardoMs: 4_000 });
  });

  it('las que vuelven en el mismo instante no repiten el tiempo', () => {
    const l = leerTurnos([
      dice(0, usa('a', 'Read', { file_path: 'uno.ts' }), usa('b', 'Grep', { pattern: 'hola' })),
      vuelve(5, 'a', 'uno'),
      vuelve(5, 'b', 'dos'),
    ].join('\n'));
    expect(l.turnos.filter((t) => t.tipo === 'responde').map((t) => t.tardoMs)).toEqual([5_000, null]);
  });

  it('se lee de a pedazos con el mismo resultado', () => {
    const lineas = registro.split('\n');
    const l = lecturaNueva();
    for (const x of lineas) leerTurnos(x, l);
    expect(l.turnos.map((t) => t.tardoMs)).toEqual(leerTurnos(registro).turnos.map((t) => t.tardoMs));
    expect(l.totales).toEqual(leerTurnos(registro).totales);
  });

  it('quién está esperando a quién: el cronómetro', () => {
    const l = leerTurnos(dice(10, usa('a', 'Bash', { command: 'npm test', description: 'Run the tests' })));
    expect(esperaDe(l)).toEqual({ quien: 'computador', desde: seg(10), herramienta: 'Bash', detalle: 'Run the tests' });
    leerTurnos(vuelve(40, 'a', 'ok'), l);
    expect(esperaDe(l)).toEqual({ quien: 'modelo', desde: seg(40) });
    leerTurnos(dice(45, { type: 'text', text: 'Fin.' }), l);
    leerTurnos(JSON.stringify({ type: 'result', duration_ms: 1 }), l);
    expect(esperaDe(l)).toBeNull();
    expect(esperaDe(lecturaNueva())).toBeNull();
  });

  it('lo del ayudante va aparte, bajo el turno que lo pidió, y en la conversación cuenta como su tiempo', () => {
    const conPadre = (x: string) => { const e = JSON.parse(x); e.parent_tool_use_id = 'h'; return JSON.stringify(e); };
    const l = leerTurnos([
      dice(0, usa('h', 'Agent', { description: 'Lee los módulos', prompt: 'Lee todo' })),
      conPadre(dice(3, { type: 'text', text: 'Leo.' }, usa('x', 'Read', { file_path: 'a.ts' }))),
      conPadre(vuelve(7, 'x', 'texto')),
      vuelve(20, 'h', 'Resumen'),
      dice(21, { type: 'text', text: 'Bien.' }),
    ].join('\n'));
    expect(l.turnos.filter((t) => t.de === 'ayudante')).toEqual([]);
    expect(l.turnos[0]).toMatchObject({ herramienta: 'Agent', ayudante: 'h', tardoMs: null });
    expect(l.turnos[1]).toMatchObject({ tipo: 'responde', herramienta: 'Agent', tardoMs: 20_000 });
    // Adentro, igual: lo del ayudante, en su globo, y lo de la herramienta, en el del director
    expect(l.ayudantes.h.map((t) => [t.de, t.tipo, t.detalle ?? '', t.tardoMs])).toEqual([['ayudante', 'dice', '', 3_000], ['ayudante', 'pide', 'a.ts', null], ['computador', 'responde', 'a.ts', 4_000]]);
    expect(l.totales).toEqual({ modeloMs: 1_000, computadorMs: 0, ayudanteMs: 20_000 });
    expect(conversacionDe(l).ayudantes.h).toHaveLength(3);
  });

  it('un error de una herramienta y un aviso del Studio se ven como lo que son', () => {
    const l = leerTurnos([
      dice(0, usa('a', 'Bash', { command: 'rm x' })),
      vuelve(1, 'a', 'denied', { is_error: true }),
      JSON.stringify({ type: 'studio', aviso: 'limite', cuando: seg(2) }),
    ].join('\n'));
    expect(l.turnos[1]).toMatchObject({ error: true, texto: 'denied' });
    expect(l.peticiones[0].error).toBe(true);
    expect(l.turnos[2]).toMatchObject({ de: 'computador', tipo: 'aviso', texto: 'limite' });
  });

  it('un texto largo se guarda hasta su tope y dice cuánto medía', () => {
    const l = leerTurnos(dice(0, { type: 'text', text: 'x'.repeat(TOPE_TEXTO + 10) }));
    expect(l.turnos[0].texto).toHaveLength(TOPE_TEXTO + 1);
    expect(l.turnos[0].largo).toBe(TOPE_TEXTO + 10);
  });

  it('a la página le llegan los últimos, con cuántos quedaron fuera', () => {
    const l = leerTurnos(registro);
    const c = conversacionDe(l, 2);
    expect(c.turnos).toHaveLength(2);
    expect(c.omitidos).toBe(4);
  });

  it('cada turno es una solicitud, una pregunta o una respuesta (nmvxxg5wvtit)', () => {
    const clases = leerTurnos(registro).turnos.map(claseDeTurno);
    expect(clases).toEqual(['respuesta', 'solicitud', 'respuesta', 'solicitud', 'respuesta', 'respuesta']);
    expect(claseDeTurno({ tipo: 'dice', texto: '¿Sigo con esto?  ' })).toBe('pregunta');
    expect(claseDeTurno({ tipo: 'aviso', texto: 'detener' })).toBe('solicitud');
  });

  describe('los tokens, como los dice Claude Code (nmvxxg5wvtit)', () => {
    const conUso = (t: number, id: string, usage: unknown, padre: string | null = null) => JSON.stringify({ type: 'assistant', message: { id, usage, content: [{ type: 'text', text: 'x' }] }, parent_tool_use_id: padre, timestamp: seg(t) });

    it('sin nada informado no se inventan', () => {
      expect(conversacionDe(leerTurnos(registro)).tokens).toBeNull();
    });

    it('lo enviado incluye la caché, lo recibido es la salida, y una llamada en varios eventos cuenta una vez', () => {
      const l = leerTurnos([
        conUso(1, 'a', { input_tokens: 10, cache_creation_input_tokens: 20, cache_read_input_tokens: 70, output_tokens: 5 }),
        conUso(2, 'a', { input_tokens: 10, cache_creation_input_tokens: 20, cache_read_input_tokens: 70, output_tokens: 9 }),
        conUso(3, 'b', { input_tokens: 1, output_tokens: 2 }),
        // Las llamadas de un ayudante también son del modelo
        conUso(4, 'c', { input_tokens: 3, output_tokens: 4 }, 'h'),
      ].join('\n'));
      // Con la caché leída, de la misma cuenta, para que el pie sume lo mismo que la banda (nmw77f74atit)
      expect(conversacionDe(l).tokens).toEqual({ enviados: 104, recibidos: 15, cache: 70 });
    });

    it('el resultado final manda, con la cuenta de cada lanzamiento (tokensDelResultado)', () => {
      const l = leerTurnos([
        conUso(1, 'a', { input_tokens: 10, output_tokens: 5 }),
        JSON.stringify({ type: 'result', usage: { input_tokens: 1, output_tokens: 1 }, modelUsage: { x: { inputTokens: 100, cacheCreationInputTokens: 20, cacheReadInputTokens: 30, outputTokens: 50 }, y: { inputTokens: 1, outputTokens: 2 } } }),
      ].join('\n'));
      expect(conversacionDe(l).tokens).toEqual({ enviados: 151, recibidos: 52, cache: 30 });
      // Un resultado sin tokens no borra lo que ya se sabía
      const sinNada = leerTurnos([conUso(1, 'a', { input_tokens: 10, output_tokens: 5 }), JSON.stringify({ type: 'result' })].join('\n'));
      expect(conversacionDe(sinNada).tokens).toEqual({ enviados: 10, recibidos: 5 });
    });

    it('la página sabe desde cuándo corre el reloj de quien tiene el turno', () => {
      expect(conversacionDe(leerTurnos(registro)).ultimo).toBe(seg(45));
    });
  });
});

describe('el informe: cuánto fue de cada quién y qué pruebas', () => {
  const l = leerTurnos([
    dice(0, usa('a', 'Bash', { command: 'npm test', description: 'x' })),
    vuelve(60, 'a', 'FAIL', { is_error: true }),
    dice(70, usa('b', 'Bash', { command: 'npm test', description: 'x' })),
    vuelve(100, 'b', 'ok'),
    dice(101, usa('c', 'Bash', { command: 'npx vitest run a.test.ts' })),
    vuelve(102, 'c', 'ok'),
  ].join('\n'));

  it('reconoce las órdenes de pruebas y de tipos', () => {
    for (const o of ['npm test', 'npx vitest run a.ts', 'npm run typecheck']) expect(esOrdenDePruebas(o), o).toBe(true);
    for (const o of ['git status', 'npm install', undefined]) expect(esOrdenDePruebas(o), String(o)).toBe(false);
  });

  it('agrupa las pruebas por orden, de la que más tomó a la que menos', () => {
    expect(pruebasDe(l.peticiones)).toEqual([
      { orden: 'npm test', veces: 2, ms: 90_000, fallas: 1 },
      { orden: 'npx vitest run a.test.ts', veces: 1, ms: 1_000, fallas: 0 },
    ]);
  });

  it('el informe trae los totales, cada corrida y lo que se repitió', () => {
    const texto = informeDeTurnos(l).join('\n');
    expect(texto).toContain('Model 0.2 min · Computer 1.5 min · Helpers 0.0 min');
    expect(texto).toContain('- 18:00:00 npm test: 60.0 s (failed)');
    expect(texto).toContain('- npm test: 2 runs, 1.5 min, 1 failed');
  });

  it('las demás órdenes van por su clase, sin sus argumentos: lo que cuesta cada proceso fijo de la revisión', () => {
    expect(claseDeOrden('node tools/director/bandeja.ts --proyecto stl-studio --listo')).toBe('bandeja.ts --listo');
    expect(claseDeOrden('node tools/director/bandeja.ts --proyecto stl-studio')).toBe('bandeja.ts');
    expect(claseDeOrden('node tools/director/firmar.ts -m "x" -- a')).toBe('firmar.ts');
    expect(claseDeOrden('git commit -m "x"')).toBe('git commit');
    const conOrdenes = leerTurnos([
      dice(0, usa('a', 'Bash', { command: 'node tools/director/bandeja.ts --proyecto p --aplicar' })),
      vuelve(4, 'a', 'ok'),
      dice(5, usa('b', 'Bash', { command: 'node tools/director/bandeja.ts --proyecto p --aplicar' })),
      vuelve(11, 'b', 'ok'),
    ].join('\n'));
    expect(informeDeTurnos(conOrdenes).join('\n')).toContain('- bandeja.ts --aplicar: 2 runs, 10.0 s');
  });
});
