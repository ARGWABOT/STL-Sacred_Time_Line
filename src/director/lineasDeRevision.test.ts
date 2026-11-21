// Una línea por cada revisión de este computador (pedido pd_lineas_por_revision): sacada de su registro sin modelo, escrita
// una sola vez cuando su lanzamiento terminó, y que no se borra aunque el registro se pode.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { ARCHIVO_LINEAS, ARCHIVO_RESUMENES, guardarLineasDeRevision, guardarResumenesDeRevision, historialDeProyecto, leerLineasDeRevision, leerResumenesDeRevision, lineaDeRegistro, resumenDeRegistro, tiemposDe } from './lineasDeRevision';

const base = mkdtempSync(join(tmpdir(), 'stl-lineas-'));
afterAll(() => rmSync(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));

const RAIZ = 'C:/Studio';
const ev = (x: unknown) => JSON.stringify(x);
const usar = (name: string, input: Record<string, unknown>) => ev({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'u1', name, input }] } });
const salida = (texto: string) => ev({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'u1', content: [{ type: 'text', text: texto }] }] } });

/** Lo que deja una revisión que cerró: respondió dos notas, cambió dos archivos, hizo un commit y se le negó una orden. */
const CERRADA = [
  '{"type":"studio","pedido":{"modelo":null,"esfuerzo":null}}',
  ev({ type: 'system', subtype: 'init', model: 'claude-opus-5-5[1m]' }),
  usar('Edit', { file_path: `${RAIZ}/CLAUDE.md`, old_string: 'a', new_string: 'b' }),
  usar('Write', { file_path: `${RAIZ}\\.stl\\director\\cambios.json`, content: JSON.stringify({ respuestas: { n_uno: {}, n_dos: {} }, misiones: [] }) }),
  usar('Edit', { file_path: `${RAIZ}/CLAUDE.md`, old_string: 'b', new_string: 'c' }),
  salida('[main 3fb3cf0] STL: el candado de cada proyecto\n 8 files changed, 449 insertions(+)'),
  salida('Revisión marcada: 2026-10-28T09:40:00.000Z'),
  salida('[stl 1a2b3c4] Director (p): revisión del 28 de octubre'),
  ev({ type: 'result', duration_ms: 5_400_000, modelUsage: { 'claude-opus-5-5[1m]': { inputTokens: 3_000, cacheCreationInputTokens: 200_000, cacheReadInputTokens: 1_000_000, outputTokens: 40_000 } }, permission_denials: [{ tool_name: 'Bash', tool_input: { command: 'powershell -NoProfile' } }] }),
].join('\n');

describe('una línea por cada revisión', () => {
  it('de su registro: cuándo, de qué tipo, cuánto duró y gastó, si cerró, qué notas respondió, qué archivos cambió, sus commits y lo negado', () => {
    expect(lineaDeRegistro('p-2026-10-28T07-09-20-889Z.log', CERRADA, undefined, RAIZ)).toEqual({
      registro: 'p-2026-10-28T07-09-20-889Z.log',
      proyecto: 'p',
      tipo: 'revision',
      cuando: '2026-10-28T07:09:20.889Z',
      minutos: 90,
      tokens: 1_243_000,
      modelo: 'claude-opus-5-5[1m]',
      cerro: true,
      notas: ['n_uno', 'n_dos'],
      archivos: ['CLAUDE.md', '.stl/director/cambios.json'],
      commits: [{ hash: '3fb3cf0', asunto: 'STL: el candado de cada proyecto' }, { hash: '1a2b3c4', asunto: 'Director (p): revisión del 28 de octubre' }],
      negados: ['Bash: powershell -NoProfile'],
      tiempos: { modeloMs: 0, computadorMs: 0, ayudanteMs: 0, pruebas: [] },
    });
  });

  it('las cuatro frases con que la bandeja cierra siguen en español, tal cual las busca la línea: la revisión, la urgencia, la aclaración y la comprobación', () => {
    const bandeja = readFileSync(join(__dirname, '..', '..', 'tools', 'director', 'bandeja.ts'), 'utf-8');
    for (const [impresa, ejemplo] of [
      ['Revisión marcada: ${plan.revisado}', 'Revisión marcada: 2026-10-28T09:40:00.000Z'],
      ['Urgencia atendida: ${u.notas.join', 'Urgencia atendida: n_uno'],
      ["'Aclaración hecha'", 'Aclaración hecha: n_uno'],
      ["'Comprobación hecha'", 'Comprobación hecha: n_uno'],
    ]) {
      expect(bandeja, impresa).toContain(impresa);
      expect(lineaDeRegistro('p-2026-10-28T07-09-20-889Z.log', salida(ejemplo))?.cerro, ejemplo).toBe(true);
    }
  });

  it('las rutas quedan cortas con una raíz de Windows o de Linux, en cualquiera de los dos (la integración continua corre en Linux)', () => {
    const linux = usar('Edit', { file_path: '/srv/Studio/src/a.ts', old_string: 'a', new_string: 'b' });
    expect(lineaDeRegistro('p-2026-10-28T07-09-20-889Z.log', linux, undefined, '/srv/Studio')?.archivos).toEqual(['src/a.ts']);
    expect(lineaDeRegistro('p-2026-10-28T07-09-20-889Z.log', CERRADA, undefined, 'C:\\Studio\\')?.archivos).toEqual(['CLAUDE.md', '.stl/director/cambios.json']);
  });

  it('una que no terminó con su resultado: sin tokens, sin cierre, y dura hasta lo último que escribió', () => {
    const l = lineaDeRegistro('p-urgencia-2026-10-28T07-00-00-000Z.log', ev({ type: 'system', subtype: 'init', model: 'm' }), Date.parse('2026-10-28T07:30:00.000Z'));
    expect(l).toMatchObject({ tipo: 'urgencia', tokens: null, cerro: false, minutos: 30, notas: [], archivos: [], commits: [], negados: [] });
    expect(lineaDeRegistro('no-es-un-registro.txt', '')).toBeNull();
  });

  it('se escribe una sola vez, cuando terminó (no la del director que tiene el turno), y se queda aunque el registro se pode', () => {
    const raiz = mkdtempSync(join(base, 'r-'));
    const carpeta = join(raiz, '.revisiones');
    mkdirSync(carpeta);
    const terminada = 'p-2026-10-27T10-00-00-000Z.log';
    const enCurso = 'p-2026-10-28T07-09-20-889Z.log';
    const cortada = 'p-aclaracion-2026-10-26T10-00-00-000Z.log';
    writeFileSync(join(carpeta, terminada), CERRADA);
    // El director que trabaja ahora: ya dejó un resultado, pero puede seguir (un flujo en segundo plano)
    writeFileSync(join(carpeta, enCurso), CERRADA);
    writeFileSync(join(carpeta, 'lanzando.json'), JSON.stringify({ pid: 1, hijo: 2, registro: `.revisiones\\${enCurso}` }));
    // Una que el Studio cortó, sin su resultado
    writeFileSync(join(carpeta, cortada), ev({ type: 'system', subtype: 'init', model: 'm' }));
    expect(guardarLineasDeRevision(raiz).map((l) => l.registro)).toEqual([terminada]);
    // Lo que terminó, al terminar: el lanzador nombra el suyo
    expect(guardarLineasDeRevision(raiz, [join(carpeta, cortada)]).map((l) => l.registro)).toEqual([terminada, cortada]);
    // Sin nadie trabajando (antes de podar), todas
    expect(guardarLineasDeRevision(raiz, 'todos').map((l) => l.registro)).toEqual([terminada, cortada, enCurso]);
    // Nunca dos veces la misma
    guardarLineasDeRevision(raiz, 'todos');
    expect(readFileSync(join(raiz, ARCHIVO_LINEAS), 'utf8').trim().split('\n')).toHaveLength(3);
    // Podado el registro, su línea sigue
    unlinkSync(join(carpeta, terminada));
    expect(leerLineasDeRevision(raiz).map((l) => l.registro)).toContain(terminada);
  });
});

describe('el resumen de cada revisión sobrevive a su registro, para la línea en grande (pd_linea_zoom)', () => {
  const limite = (uso: number) => ev({ type: 'rate_limit_event', rate_limit_info: { unifiedWindows: { seven_day: { utilization: uso, resetsAt: 1_800_000_000 } } } });
  // Lo que trae el registro de Claude Code y no se guarda: el nombre, armado, para que no lo cuente la guardia de consumoDelPlan.test.ts
  const conDinero = ev({ type: 'result', [['total', 'cost', 'u' + 'sd'].join('_')]: 12.34, duration_ms: 600_000, modelUsage: { m: { inputTokens: 1000, outputTokens: 500 } } });
  const REVISION = [
    ev({ type: 'studio', pedido: { modelo: 'claude-opus-5-5', esfuerzo: 'high' } }),
    ev({ type: 'system', subtype: 'init', model: 'claude-opus-5-5[1m]' }),
    limite(0.3),
    usar('Write', { file_path: `${RAIZ}/.stl/director/cambios.json`, content: JSON.stringify({ respuestas: { n1: {} } }) }),
    salida('[main 3fb3cf0] STL: lo que hizo\n'),
    salida('Revisión marcada: 2026-10-28T09:40:00.000Z'),
    limite(0.32),
    ev({ type: 'studio', fin: { quien: 'el_director', causa: 'cerró', minutos: 10 } }),
    conDinero,
  ].join('\n');
  const ENCARGOS = [{ id: 'e1', que: 'Uno', hecho: '2026-10-28T10-00-00-000Z', origen: ['x'] }, { id: 'e2', que: 'Dos', origen: ['y'] }];
  const NOMBRE = 'p-2026-10-28T09-00-00-000Z.log';

  /** Una raíz con esa revisión escrita en su carpeta de registros. */
  const raizCon = (nombre = NOMBRE, encargos: unknown = ENCARGOS) => {
    const raiz = mkdtempSync(join(base, 'r-'));
    const carpeta = join(raiz, '.revisiones');
    mkdirSync(carpeta);
    writeFileSync(join(carpeta, nombre), REVISION);
    if (encargos) writeFileSync(join(carpeta, nombre.replace('.log', '.encargos.json')), JSON.stringify(encargos));
    return { raiz, carpeta };
  };

  it('lo que planeó, lo que hizo, sus tokens, el modelo, el esfuerzo y cómo terminó, sin ningún dinero', () => {
    const r = resumenDeRegistro(NOMBRE, REVISION, ENCARGOS, undefined, RAIZ)!;
    expect(r).toMatchObject({
      registro: NOMBRE,
      proyecto: 'p',
      cuando: '2026-10-28T09:00:00.000Z',
      planeo: [{ que: 'Uno', hecho: true }, { que: 'Dos', hecho: false }],
      hizo: { commits: ['STL: lo que hizo'], notas: 1, archivos: 1 },
      minutos: 10,
      tokens: 1500,
      semana: { desde: 30, hasta: 32 },
      modelo: 'claude-opus-5-5[1m]',
      esfuerzo: 'high',
      cerro: true,
    });
    const todo = JSON.stringify(r).toLowerCase();
    for (const dinero of ['cost', 'dinero', 'precio', '$', '12.34']) expect(todo).not.toContain(dinero);
  });

  it('una urgencia o una aclaración no llevan resumen, y uno enorme sigue pesando pocos KB', () => {
    expect(resumenDeRegistro('p-urgencia-2026-10-28T09-00-00-000Z.log', REVISION, [])).toBeNull();
    const largo = 'x'.repeat(5000);
    const commits = Array.from({ length: 200 }, (_, i) => salida(`[main ${String(1000000 + i)}] ${largo}\n`));
    const r = resumenDeRegistro(NOMBRE, [REVISION, ...commits].join('\n'), Array.from({ length: 200 }, () => ({ que: largo })))!;
    expect(r.planeo.length).toBe(20);
    expect(r.hizo.commits.length).toBe(20);
    expect(JSON.stringify(r).length).toBeLessThan(8 * 1024);
  });

  it('se resumen también las de antes que aún tienen registro, una vez; una que sigue trabajando, no', () => {
    const { raiz, carpeta } = raizCon();
    writeFileSync(join(carpeta, 'p-2026-10-29T09-00-00-000Z.log'), ev({ type: 'system', subtype: 'init', model: 'm' }));
    expect(guardarLineasDeRevision(raiz).length).toBe(1);
    expect(leerResumenesDeRevision(raiz).map((r) => r.registro)).toEqual([NOMBRE]);
    guardarResumenesDeRevision(raiz);
    expect(leerResumenesDeRevision(raiz)).toHaveLength(1);
    expect(readFileSync(join(raiz, ARCHIVO_RESUMENES), 'utf-8').trim().split('\n')).toHaveLength(1);
  });

  it('borrado su registro, el historial sigue, sin «La conversación», con la parte de tu plan repartida', () => {
    const { raiz, carpeta } = raizCon();
    expect(historialDeProyecto(raiz, 'p')[0]).toMatchObject({ registro: NOMBRE, conRegistro: true, planAprox: 2 });
    unlinkSync(join(carpeta, NOMBRE));
    unlinkSync(join(carpeta, NOMBRE.replace('.log', '.encargos.json')));
    const [h] = historialDeProyecto(raiz, 'p');
    expect(h).toMatchObject({ registro: NOMBRE, conRegistro: false, planAprox: 2, modelo: 'claude-opus-5-5[1m]', esfuerzo: 'high', tokens: 1500, cerro: true });
    expect(h).toMatchObject({ planeo: [{ que: 'Uno', hecho: true }, { que: 'Dos', hecho: false }] });
    for (const fuera of ['cost', 'semana']) expect(JSON.stringify(h)).not.toContain(fuera);
    // De otro proyecto, nada
    expect(historialDeProyecto(raiz, 'otro')).toEqual([]);
  });

  it('cada revisión trae lo negado, los otros modelos y para qué, y las urgencias y aclaraciones que le siguieron (nmvzpxrkztit)', () => {
    const conAyudante = [
      ev({ type: 'system', subtype: 'init', model: 'claude-opus-5-5[1m]' }),
      ev({ type: 'assistant', message: { model: 'claude-opus-5-5', content: [{ type: 'tool_use', id: 'a1', name: 'Agent', input: { description: 'Leer los registros', prompt: 'x' } }] } }),
      ev({ type: 'assistant', parent_tool_use_id: 'a1', message: { model: 'claude-sonnet-5-5', content: [] } }),
      // Otro del mismo modelo, y uno con el modelo del director, que no es «otro»
      ev({ type: 'assistant', message: { model: 'claude-opus-5-5', content: [{ type: 'tool_use', id: 'a2', name: 'Agent', input: { description: 'Cruzar notas' } }, { type: 'tool_use', id: 'a3', name: 'Agent', input: { description: 'Lo delicado' } }] } }),
      ev({ type: 'assistant', parent_tool_use_id: 'a2', message: { model: 'claude-sonnet-5-5', content: [] } }),
      ev({ type: 'assistant', parent_tool_use_id: 'a3', message: { model: 'claude-opus-5-5', content: [] } }),
    ].join('\n');
    expect(lineaDeRegistro(NOMBRE, conAyudante)!.otrosModelos).toEqual([{ modelo: 'claude-sonnet-5-5', para: ['Leer los registros', 'Cruzar notas'] }]);

    const { raiz } = raizCon();
    const lineas = guardarLineasDeRevision(raiz);
    const suya = lineas.find((l) => l.registro === NOMBRE)!;
    // A su línea, ya guardada, se le suman; las de otro proyecto o de antes de la primera revisión no cuentan
    const mas = [
      { ...suya, negados: ['Bash: gh release create'], otrosModelos: [{ modelo: 'claude-sonnet-5-5', para: ['Leer'] }] },
      { ...suya, registro: 'p-urgencia-2099-01-01T00-00-00-000Z.log', tipo: 'urgencia', cuando: '2099-01-01T00:00:00.000Z', notas: ['n'], cerro: true },
      { ...suya, registro: 'p-aclaracion-2099-01-02T00-00-00-000Z.log', tipo: 'aclaracion', cuando: '2099-01-02T00:00:00.000Z', notas: [], cerro: false },
      { ...suya, registro: 'p-urgencia-2000-01-01T00-00-00-000Z.log', tipo: 'urgencia', cuando: '2000-01-01T00:00:00.000Z', notas: [], cerro: true },
      { ...suya, registro: 'q-urgencia-2099-01-01T00-00-00-000Z.log', proyecto: 'q', tipo: 'urgencia', cuando: '2099-01-01T00:00:00.000Z', notas: [], cerro: true },
    ];
    writeFileSync(join(raiz, ARCHIVO_LINEAS), `${mas.map((l) => JSON.stringify(l)).join('\n')}\n`);
    const [h] = historialDeProyecto(raiz, 'p');
    expect(h).toMatchObject({ registro: NOMBRE, negados: ['Bash: gh release create'], otrosModelos: [{ modelo: 'claude-sonnet-5-5', para: ['Leer'] }] });
    expect(h).toMatchObject({ aparte: [
      { tipo: 'urgencia', cuando: '2099-01-01T00:00:00.000Z', notas: 1, cerro: true },
      { tipo: 'aclaracion', cuando: '2099-01-02T00:00:00.000Z', notas: 0, cerro: false },
    ] });
    for (const fuera of ['cost', 'semana']) expect(JSON.stringify(h)).not.toContain(fuera);
  });

  it('una revisión de antes, con su línea pero sin registro ni resumen, lo dice', () => {
    const { raiz, carpeta } = raizCon();
    const vieja = 'p-2026-10-01T09-00-00-000Z.log';
    const linea = lineaDeRegistro(vieja, REVISION, undefined, RAIZ)!;
    mkdirSync(join(raiz, '.estudio'), { recursive: true });
    writeFileSync(join(raiz, ARCHIVO_LINEAS), `${JSON.stringify(linea)}\n`);
    expect(existsSync(join(carpeta, vieja))).toBe(false);
    const historial = historialDeProyecto(raiz, 'p');
    expect(historial.map((h) => h.registro)).toEqual([vieja, NOMBRE]);
    expect(historial[0]).toEqual({ registro: vieja, proyecto: 'p', cuando: '2026-10-01T09:00:00.000Z', sinHistorial: true });
    expect(historial[1].sinHistorial).toBeUndefined();
  });

  it('la API lo sirve aparte de la conversación', () => {
    const api = readFileSync(join(process.cwd(), 'estudio/servidor/api.ts'), 'utf-8');
    expect(api).toContain("if (ruta === '/historial-revisiones' && req.method === 'GET') {");
    expect(api).toContain('historialDeProyecto(raiz, proyecto)');
  });
});

describe('los tiempos sobreviven al registro: los tiempos para siempre y el chat 15 días (nmvx3zzkbtit)', () => {
  const inicio = Date.parse('2026-10-31T10:00:00.000Z');
  const seg = (t: number) => new Date(inicio + t * 1000).toISOString();
  const pide = (t: number, id: string, command: string) => ev({ type: 'assistant', parent_tool_use_id: null, timestamp: seg(t), message: { content: [{ type: 'tool_use', id, name: 'Bash', input: { command } }] } });
  const vuelve = (t: number, id: string, error = false) => ev({ type: 'user', parent_tool_use_id: null, timestamp: seg(t), message: { content: [{ type: 'tool_result', tool_use_id: id, content: 'x', ...(error ? { is_error: true } : {}) }] } });
  const REGISTRO = [
    ev({ type: 'studio', primerTiempo: { ok: true, encargos: 3, minutos: 2, tokens: 1000 } }),
    pide(60, 'a', 'npm test'),
    vuelve(120, 'a', true),
    pide(150, 'b', 'npx vitest run a.test.ts'),
    vuelve(155, 'b'),
    pide(160, 'c', 'git status'),
    vuelve(161, 'c'),
    ev({ type: 'result', duration_ms: 200_000, usage: { input_tokens: 5 } }),
  ].join('\n');

  it('de cada actor, del plan y de cada corrida de pruebas, en su orden', () => {
    expect(tiemposDe(REGISTRO, 2)).toEqual({
      modeloMs: 35_000,
      computadorMs: 66_000,
      ayudanteMs: 0,
      planMs: 120_000,
      pruebas: [{ orden: 'npm test', ms: 60_000, fallo: true }, { orden: 'npx vitest run a.test.ts', ms: 5000 }],
    });
  });

  it('borrado el registro, y con él el chat, siguen en su línea', () => {
    const raiz = mkdtempSync(join(base, 't-'));
    const carpeta = join(raiz, '.revisiones');
    mkdirSync(carpeta);
    const nombre = 'p-2026-10-31T10-00-00-000Z.log';
    writeFileSync(join(carpeta, nombre), REGISTRO);
    guardarLineasDeRevision(raiz, 'todos');
    unlinkSync(join(carpeta, nombre));
    const [l] = leerLineasDeRevision(raiz);
    expect(l.tiempos?.computadorMs).toBe(66_000);
    expect(l.tiempos?.pruebas.map((p) => p.orden)).toEqual(['npm test', 'npx vitest run a.test.ts']);
    // Y sin el registro, ya no hay chat: el suyo vive 15 días
    expect(existsSync(join(carpeta, nombre))).toBe(false);
  });

  it('el resumen pesa pocos KB, aun con muchas corridas y órdenes largas', () => {
    const muchas = Array.from({ length: 40 }, (_, i) => [pide(i * 10, `p${i}`, `npx vitest run ${'estudio/src/un-archivo-largo.test.ts '.repeat(20)}`), vuelve(i * 10 + 5, `p${i}`)].join('\n')).join('\n');
    const peso = JSON.stringify(tiemposDe(muchas)).length;
    expect(peso).toBeLessThan(8 * 1024);
    expect(tiemposDe(muchas).pruebas[0].orden.length).toBeLessThanOrEqual(120);
  });
});
