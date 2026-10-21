import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { agruparPasos, compararVersion, consumoDe, consumoDeRevisiones, encargo, fallaDelEsfuerzo, fallaDelModelo, lineaPedido, permitido, progresoDe, progresoDeProyecto, trabajoConElPedido } from './revisor';

describe('el director que lanza el Studio', () => {
  it('escribe solo dentro del repositorio del proyecto, corre sus pruebas y hace commits locales', () => {
    const p = permitido(String.raw`C:\repos\golf`);
    expect(p).toContain('Edit(//c/repos/golf/**)');
    expect(p).toContain('Bash(node tools/director/bandeja.ts:*)');
    expect(p).toContain('Bash(git commit:*)');
    expect(permitido('/home/ana/golf/')).toContain('Edit(//home/ana/golf/**)');
    // investiga en internet: buscar y leer páginas
    expect(p).toEqual(expect.arrayContaining(['WebSearch', 'WebFetch']));
    // reparte la lectura entre ayudantes, que heredan esta misma lista
    expect(p).toEqual(expect.arrayContaining(['Agent', 'Task']));
    // mira la interfaz en un navegador sin pantalla, solo con su herramienta
    expect(p).toContain('Bash(node tools/director/mirar.ts:*)');
    // nada que suba, despliegue o borre, ni escribir fuera del repositorio
    expect(p.some((x) => /push|deploy|rm\b|reset|clean/.test(x))).toBe(false);
    expect(p.filter((x) => /^(Edit|Write)/.test(x)).every((x) => x.includes('//c/repos/golf/'))).toBe(true);
    // los flujos de varios agentes, solo con el permiso del titular (ultracode)
    expect(p).not.toContain('Workflow');
    expect(permitido(String.raw`C:\repos\golf`, true)).toEqual([...p.slice(0, p.indexOf('Task') + 1), 'Workflow', ...p.slice(p.indexOf('Task') + 1)]);
  });

  it('le encarga la revisión de un proyecto, con su id en las herramientas', () => {
    expect(encargo('golf')).toContain('--proyecto golf --listo');
  });

  it('resume en vivo lo que va haciendo, a partir de su registro en stream-json', () => {
    const registro = [
      JSON.stringify({ type: 'system', subtype: 'init' }),
      'un aviso que no es JSON',
      JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'Corro la bandeja.' }, { type: 'tool_use', name: 'Bash', input: { command: 'node tools/director/bandeja.ts', description: 'Ejecutar la bandeja' } }] } }),
      JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', content: 'mucho texto' }] } }),
      JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Edit', input: { file_path: String.raw`C:\repo\estudio\src\director.ts` } }] } }),
      '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Read"', // la línea que aún se está escribiendo
    ].join('\n');
    expect(progresoDe(registro)).toEqual([
      { tipo: 'hace', texto: 'Empieza la revisión' },
      { tipo: 'dice', texto: 'Corro la bandeja.' },
      { tipo: 'hace', texto: 'Ejecutar la bandeja' },
      { tipo: 'hace', texto: 'Edita director.ts' },
    ]);
    expect(progresoDe(registro, 2)).toHaveLength(2);
  });

  it('junta las líneas iguales seguidas en una, con su cuenta, sin cambiar el orden', () => {
    const hace = (texto: string) => ({ tipo: 'hace' as const, texto });
    expect(agruparPasos([hace('Edita plan.json'), hace('Edita plan.json'), hace('Edita plan.json'), hace('Lee CLAUDE.md'), hace('Edita plan.json'), { tipo: 'dice', texto: 'Edita plan.json' }])).toEqual([
      { tipo: 'hace', texto: 'Edita plan.json', veces: 3 },
      { tipo: 'hace', texto: 'Lee CLAUDE.md' },
      { tipo: 'hace', texto: 'Edita plan.json' },
      { tipo: 'dice', texto: 'Edita plan.json' },
    ]);
  });

  it('conserva todo lo que hizo en la revisión, de principio a fin, aunque el registro crezca', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'stl-revisor-'));
    try {
      mkdirSync(join(raiz, '.revisiones'));
      const log = join(raiz, '.revisiones', 'golf-2026-10-18T13-00-00-000Z.log');
      const dice = (t: string) => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: t }] } });
      writeFileSync(log, `${JSON.stringify({ type: 'system', subtype: 'init' })}\n${dice('Primero')}\n{"type":"assis`);
      expect(progresoDeProyecto(raiz, 'golf').map((p) => p.texto)).toEqual(['Empieza la revisión', 'Primero']);
      // Lo que se estaba escribiendo termina, y llega mucho más (lo que lee el director pesa)
      appendFileSync(log, `tant","message":{"content":[{"type":"text","text":"Segundo"}]}}\n${'x'.repeat(600 * 1024)}\n${dice('Tercero')}\n`);
      expect(progresoDeProyecto(raiz, 'golf').map((p) => p.texto)).toEqual(['Empieza la revisión', 'Primero', 'Segundo', 'Tercero']);
      // Una revisión nueva empieza de cero
      writeFileSync(join(raiz, '.revisiones', 'golf-2026-10-18T14-00-00-000Z.log'), `${dice('Otra')}\n`);
      expect(progresoDeProyecto(raiz, 'golf').map((p) => p.texto)).toEqual(['Otra']);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });

  it('guarda lo que gastó cada lanzamiento, tal como lo devuelve Claude Code al terminar', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'stl-consumo-'));
    try {
      mkdirSync(join(raiz, '.revisiones'));
      const resultado = (costo: number) => JSON.stringify({ duration_ms: 429_896, total_cost_usd: costo, usage: { input_tokens: 94, cache_creation_input_tokens: 1000, cache_read_input_tokens: 50_000, output_tokens: 2000 }, type: 'result', subtype: 'success' });
      const init = JSON.stringify({ type: 'system', subtype: 'init', model: 'claude-opus-5-5' });
      writeFileSync(join(raiz, '.revisiones', 'stl-studio-2026-10-21T06-03-39-556Z.log'), `${init}\n${resultado(2.8)}\n`);
      writeFileSync(join(raiz, '.revisiones', 'stl-studio-aclaracion-2026-10-21T07-00-00-000Z.log'), `${init}\n${resultado(0.3)}\n`);
      // una que no terminó (o sigue en marcha) no cuenta, ni una de hace dos meses
      writeFileSync(join(raiz, '.revisiones', 'golf-2026-10-21T08-00-00-000Z.log'), `${init}\n`);
      writeFileSync(join(raiz, '.revisiones', 'golf-2026-08-01T08-00-00-000Z.log'), `${init}\n${resultado(9)}\n`);
      const lista = consumoDeRevisiones(raiz, 35, Date.parse('2026-10-21T12:00:00Z'));
      expect(lista).toEqual([
        { cuando: '2026-10-21T07:00:00.000Z', proyecto: 'stl-studio', tipo: 'aclaracion', modelo: 'claude-opus-5-5', costo: 0.3, entrada: 1094, cache: 50_000, salida: 2000, minutos: 7.2, limites: null },
        { cuando: '2026-10-21T06:03:39.556Z', proyecto: 'stl-studio', tipo: 'revision', modelo: 'claude-opus-5-5', costo: 2.8, entrada: 1094, cache: 50_000, salida: 2000, minutos: 7.2, limites: null },
      ]);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });

  it('lee lo pedido, el modelo con que trabajó y los límites del plan que da Claude Code', () => {
    const limite = (cinco: number, semana: number) => JSON.stringify({ type: 'rate_limit_event', rate_limit_info: { status: 'allowed', unifiedWindows: { five_hour: { utilization: cinco, resetsAt: 1792339800 }, seven_day: { utilization: semana, resetsAt: 1792702800 } } } });
    const registro = [
      lineaPedido('claude-opus-5-5[1m]', 'high').trim(),
      JSON.stringify({ type: 'system', subtype: 'init', model: 'claude-opus-5-5[1m]' }),
      limite(0.1, 0.12),
      limite(0.11, 0.125),
      JSON.stringify({ type: 'result', total_cost_usd: 1, duration_ms: 60_000, usage: {} }),
    ].join('\n');
    const c = consumoDe(registro)!;
    expect(c.pedido).toEqual({ modelo: 'claude-opus-5-5[1m]', esfuerzo: 'high', cumplido: true });
    expect(consumoDe(registro.replace('"modelo":"claude-opus-5-5[1m]"', '"modelo":"sonnet"'))!.pedido!.cumplido).toBe(false);
    expect(consumoDe(registro.replace('"modelo":"claude-opus-5-5[1m]"', '"modelo":null'))!.pedido!.cumplido).toBeNull();
    expect(c.modelo).toBe('claude-opus-5-5[1m]');
    // el último aviso manda, en porcentaje
    expect(c.limites).toEqual({ cincoHoras: { uso: 11, renueva: new Date(1792339800_000).toISOString() }, semana: { uso: 12.5, renueva: new Date(1792702800_000).toISOString() } });
    // lo pedido no se confunde con un modelo que la cuenta rechazó, ni con un esfuerzo rechazado
    expect(fallaDelModelo(lineaPedido('haiku', null))).toBe(false);
    expect(fallaDelEsfuerzo(lineaPedido(null, 'max'))).toBe(false);
    // un registro de antes, sin lo pedido, sigue contando
    expect(consumoDe(registro.split('\n').slice(1).join('\n'))!.pedido).toBeUndefined();
  });

  it('dice si trabajó con el modelo pedido', () => {
    expect(trabajoConElPedido('claude-opus-5-5[1m]', 'claude-opus-5-5[1m]')).toBe(true);
    expect(trabajoConElPedido('claude-opus-5-5[1m]', 'claude-opus-5-5')).toBe(true);
    expect(trabajoConElPedido('opus', 'claude-opus-5-5')).toBe(true);
    expect(trabajoConElPedido('sonnet', 'claude-opus-5-5')).toBe(false);
    expect(trabajoConElPedido('claude-sonnet-5-5', 'claude-opus-5-5[1m]')).toBe(false);
  });

  it('reconoce cuando la cuenta no acepta el modelo elegido, y solo entonces', () => {
    const init = JSON.stringify({ type: 'system', subtype: 'init', model: 'haiku' });
    const error = JSON.stringify({ type: 'result', is_error: true, result: "There's an issue with the selected model (haiku). It may not exist or you may not have access to it." });
    expect(fallaDelModelo(`${init}\n${error}\n`)).toBe(true);
    // otro error antes de trabajar (la sesión, la red) no es del modelo, aunque el inicio lo nombre
    expect(fallaDelModelo(`${init}\n${JSON.stringify({ type: 'result', is_error: true, result: 'Invalid API key' })}\n`)).toBe(false);
    // si llegó a trabajar, el modelo sirvió
    expect(fallaDelModelo(`${init}\n${JSON.stringify({ type: 'assistant', message: { content: [] } })}\n${error}\n`)).toBe(false);
    expect(consumoDe(init)).toBeNull();
  });

  it('reconoce cuando Claude Code no acepta el esfuerzo elegido, y solo entonces', () => {
    expect(fallaDelEsfuerzo("error: unknown option '--effort'\n")).toBe(true);
    expect(fallaDelEsfuerzo(`${JSON.stringify({ type: 'result', is_error: true, result: 'Invalid effort level: xhigh' })}\n`)).toBe(true);
    expect(fallaDelEsfuerzo(`${JSON.stringify({ type: 'result', is_error: true, result: 'Invalid API key' })}\n`)).toBe(false);
    // si llegó a trabajar, el esfuerzo sirvió
    expect(fallaDelEsfuerzo(`${JSON.stringify({ type: 'assistant', message: { content: [] } })}\nerror: unknown option '--effort'\n`)).toBe(false);
  });

  it('elige la versión más nueva de Claude Code', () => {
    expect(['2.1.295', '2.1.299', '2.1.30', '10.0.0'].sort(compararVersion)).toEqual(['2.1.30', '2.1.295', '2.1.299', '10.0.0']);
  });
});
