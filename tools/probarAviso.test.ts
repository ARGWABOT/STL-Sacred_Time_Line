// La prueba real del aviso al director que corre (pr_procesos_vista, puntos 3 y 4), en lo puro: el gancho, los argumentos
// de cada caso, el veredicto de su salida y el informe. Sin lanzar a Claude Code
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { ajustesDelGancho, argumentosDelCaso, AVISO, CASOS, DETENIDO, informe, llegoATiempo, mensajeDeEntrada, ORDENES, PEDIDO, PERMITIDA, textoDelGancho, traeResultado, veredicto, type Caso } from './probarAviso';

const base = mkdtempSync(join(tmpdir(), 'stl-probar-aviso-'));
afterAll(() => rmSync(base, { recursive: true, force: true }));

const caso = (id: Caso['id']) => CASOS.find((c) => c.id === id)!;
/** Una salida en stream-json: `n` órdenes corridas y su resultado. */
const salida = (n: number, resultado: string) =>
  [
    JSON.stringify({ type: 'system', subtype: 'init' }),
    ...ORDENES.slice(0, n).flatMap((o, i) => [
      JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id: `t${i}`, name: 'Bash', input: { command: o } }] } }),
      JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: `t${i}`, content: String(i + 1) }] } }),
    ]),
    JSON.stringify({ type: 'result', result: resultado }),
  ].join('\n');

describe('la prueba real del aviso al director que corre', () => {
  it('el encargo y el aviso, en inglés, dicen qué responder al detenerse; solo se permiten las tres órdenes', () => {
    expect(PEDIDO).toContain(ORDENES.join(', then '));
    expect(PEDIDO).toContain(`answer only ${DETENIDO}`);
    expect(AVISO).toContain(`answer only ${DETENIDO}`);
    expect(CASOS.map((c) => c.id)).toEqual(['control', 'bloquea', 'contexto', 'entrada']);
  });

  it('como lanza el Studio al director: dontAsk, sin tus ajustes de usuario y con Haiku; por la entrada, en stream-json y sin el encargo como argumento', () => {
    const conGancho = argumentosDelCaso(caso('bloquea'), 'a.json');
    expect(conGancho.slice(0, 2)).toEqual(['-p', PEDIDO]);
    expect(conGancho).toEqual(expect.arrayContaining(['--setting-sources', 'project,local', '--permission-mode', 'dontAsk', '--allowedTools', PERMITIDA, '--model', 'haiku', '--output-format', 'stream-json', '--verbose']));
    const entrada = argumentosDelCaso(caso('entrada'), 'b.json');
    expect(entrada).not.toContain(PEDIDO);
    expect(entrada).toEqual(expect.arrayContaining(['--input-format', 'stream-json', '--output-format', 'stream-json']));
    expect(JSON.parse(mensajeDeEntrada('hola'))).toEqual({ type: 'user', message: { role: 'user', content: [{ type: 'text', text: 'hola' }] } });
    // El gancho, para todas las herramientas, con los ganchos encendidos (el arranque limpio los apaga)
    expect(ajustesDelGancho('C:\\t\\gancho.mjs')).toEqual({ disableAllHooks: false, hooks: { PostToolUse: [{ matcher: '*', hooks: [{ type: 'command', command: 'node "C:/t/gancho.mjs"', timeout: 30 }] }] } });
  });

  it('el gancho anota cada llamada y devuelve el aviso solo en la primera de su caso, de la forma de ese caso; en el control, nada', () => {
    const registro = join(base, 'registro.jsonl');
    const gancho = join(base, 'gancho.mjs');
    writeFileSync(gancho, textoDelGancho(registro));
    writeFileSync(registro, '');
    const llamar = (caso: string, orden: string) => execFileSync(process.execPath, [gancho], { input: JSON.stringify({ hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: orden } }), env: { ...process.env, STL_CASO: caso }, encoding: 'utf8' });
    expect(JSON.parse(llamar('bloquea', ORDENES[0]))).toEqual({ decision: 'block', reason: AVISO });
    expect(llamar('bloquea', ORDENES[1])).toBe('');
    expect(JSON.parse(llamar('contexto', ORDENES[0]))).toEqual({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: AVISO } });
    expect(llamar('control', ORDENES[0])).toBe('');
    const anotadas = readFileSync(registro, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    expect(anotadas.map((x) => [x.caso, x.orden])).toEqual([['bloquea', ORDENES[0]], ['bloquea', ORDENES[1]], ['contexto', ORDENES[0]], ['control', ORDENES[0]]]);
  });

  it('el veredicto cuenta las órdenes hasta su primer resultado y si dijo que se detuvo; a tiempo es antes de las tres', () => {
    expect(traeResultado(JSON.parse(salida(1, 'x').split('\n')[2]))).toBe(true);
    const control = veredicto(caso('control'), salida(3, '1 2 3'), 3);
    expect(control).toMatchObject({ corridas: 3, detenido: false, gancho: true, error: null });
    const aTiempo = veredicto(caso('bloquea'), salida(1, DETENIDO), 1);
    expect(llegoATiempo(aTiempo)).toBe(true);
    const tarde = veredicto(caso('entrada'), `${salida(3, '1 2 3')}\n${JSON.stringify({ type: 'result', result: DETENIDO })}`, 0);
    expect(tarde).toMatchObject({ corridas: 3, detenido: false });
    expect(llegoATiempo(tarde)).toBe(false);
    expect(veredicto(caso('contexto'), '', 0, 'se cortó').error).toBe('se cortó');
  });

  it('el informe dice qué camino sirve, y que la prueba no dice nada si sin aviso no corren las tres', () => {
    const control = veredicto(caso('control'), salida(3, '1 2 3'), 3);
    const bloquea = veredicto(caso('bloquea'), salida(1, DETENIDO), 1);
    const contexto = veredicto(caso('contexto'), salida(3, '1 2 3'), 3);
    const entrada = veredicto(caso('entrada'), salida(2, DETENIDO), 0);
    const l = informe('2.1.400', [control, bloquea, contexto, entrada]);
    expect(l[0]).toBe('Claude Code 2.1.400');
    expect(l.at(-1)).toBe('Conclusión: el Studio puede avisarle al director mientras trabaja con un gancho PostToolUse con «decision: block» o con un mensaje más por la entrada en stream-json: así se construyen «Detener», que le pide cerrar con lo hecho, y el aviso diez minutos antes de su límite.');
    expect(l).toContain('- Con un gancho PostToolUse que devuelve el aviso como «additionalContext»: el gancho se llamó; corrió 3 de las 3 órdenes y no dijo que se detenía.');
    expect(informe('x', [veredicto(caso('control'), salida(1, '1'), 1), bloquea]).at(-1)).toMatch(/^Conclusión: sin aviso no corrieron las tres órdenes/);
    expect(informe('x', [control, contexto]).at(-1)).toMatch(/^Conclusión: con esta versión ningún camino/);
  });
});
