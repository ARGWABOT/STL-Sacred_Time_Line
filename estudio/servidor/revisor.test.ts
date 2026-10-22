import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { actividadDeProyecto, agruparPasos, carpetaDeSesiones, cerroSegunPlan, COMO_ORDENES, compararVersion, negado, revisadoDelPlan, consumoDe, consumoDeRevisiones, diagnosticarFalla, estadoDelLanzado, fallaDeProyecto, inicioDeRegistro, encargo, encargoAclaracion, encargoUrgencia, MAX_MIN, MAX_MIN_ACLARAR, MAX_MIN_URGENCIA, SIN_ESPERAS, SIN_PERMISO, fallaDelEsfuerzo, fallaDelModelo, lineaPedido, permitido, progresoDe, progresoDeProyecto, soltarTurno, tokensDe, tokensDeProyecto, tomarTurno, trabajoConElPedido, usoDe } from './revisor';

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
    // nada que suba o despliegue, ni escribir fuera del repositorio; borrar, solo con git rm (lo que git guarda)
    expect(p.some((x) => /push|deploy|reset|clean/.test(x))).toBe(false);
    expect(p.filter((x) => /\brm\b/.test(x))).toEqual(['Bash(git rm:*)']);
    expect(p.filter((x) => /^(Edit|Write)/.test(x)).every((x) => x.includes('//c/repos/golf/'))).toBe(true);
    // los flujos de varios agentes, solo con el permiso del titular (ultracode)
    expect(p).not.toContain('Workflow');
    expect(permitido(String.raw`C:\repos\golf`, true)).toEqual([...p.slice(0, p.indexOf('Task') + 1), 'Workflow', ...p.slice(p.indexOf('Task') + 1)]);
  });

  it('trae los seis grupos de permisos que autorizó el titular el 22 de octubre de 2026, y nada más', () => {
    const p = permitido(String.raw`C:\repos\golf`, false, String.raw`C:\xampp\STL`, String.raw`C:\Users\ana`);
    // (1) leer y comprobar sin cambiar nada; git -C no, porque no se puede acotar a lecturas
    expect(p).toEqual(expect.arrayContaining(['Bash(ls:*)', 'Bash(wc:*)', 'Bash(git show:*)', 'Bash(git ls-files:*)', 'Bash(git rev-parse:*)', 'Bash(git rev-list:*)', 'Bash(git config --get:*)', 'Bash(git branch --show-current)', 'Bash(git stash list:*)', 'Bash(git remote -v)', 'Bash(git worktree list:*)', 'Bash(git ls-remote:*)', 'Bash(gh auth status:*)']));
    expect(p.some((x) => x.includes('git -C'))).toBe(false);
    // (2) una parte de las pruebas
    expect(p).toEqual(expect.arrayContaining(['Bash(npm test)', 'Bash(npm test:*)', 'Bash(npx vitest run:*)', 'Bash(npm run typecheck)', 'Bash(npm run typecheck:*)']));
    // (3) leer solo donde trabaja: el Studio, el repositorio y sus sesiones anteriores, sin la regla suelta que deja leer todo
    expect(p).not.toContain('Read');
    expect(p).not.toContain('Grep');
    expect(p).not.toContain('Glob');
    expect(p.filter((x) => x.startsWith('Read('))).toEqual(['Read(//c/xampp/STL/**)', 'Read(//c/repos/golf/**)', 'Read(//c/Users/ana/.claude/projects/C--xampp-STL/**)']);
    // (4) mover y ramas de respaldo; (5) git rm; (6) npm install sin nombres de paquetes
    expect(p).toEqual(expect.arrayContaining(['Bash(git mv:*)', 'Bash(git branch respaldo/:*)', 'Bash(git rm:*)', 'Bash(npm install)']));
    expect(p.some((x) => /npm install[: ]/.test(x))).toBe(false);
    // lo que nunca: ningún .env, ni los ajustes de Claude, ni editar sus permisos, estudio.local.json, los registros o .git
    const n = negado(String.raw`C:\repos\golf`, String.raw`C:\xampp\STL`);
    expect(n).toEqual(expect.arrayContaining(['Read(//**/.env)', 'Read(//**/.env.*)', 'Read(~/.claude/settings.json)', 'Edit(//c/xampp/STL/.claude/settings*.json)', 'Edit(//c/repos/golf/.claude/settings*.json)', 'Edit(//c/xampp/STL/estudio.local.json)', 'Edit(//c/xampp/STL/.revisiones/**)', 'Edit(//**/.git/**)']));
    // ni renombrar o borrar ramas, ni forzar al mover o al borrar, la opción vaya donde vaya
    expect(n).toEqual(expect.arrayContaining(['Bash(git branch -D*)', 'Bash(git branch * -D*)', 'Bash(git mv * -f*)', 'Bash(git rm -rf*)', 'Bash(git rm * --force*)']));
    // las sesiones de una carpeta, como las nombra Claude Code
    expect(carpetaDeSesiones(String.raw`C:\xampp2024\htdocs\www\STL`, String.raw`C:\Users\leonc`)).toBe(join(String.raw`C:\Users\leonc`, '.claude', 'projects', 'C--xampp2024-htdocs-www-STL'));
  });

  it('el encargo dice cómo usar esos permisos: cd en vez de git -C, y borrar solo con git rm y los dos pasos del titular', () => {
    const urgencia = encargoUrgencia({ proyecto: 'golf', notas: ['n1'], quien: 'ana', pedida: '2026-10-21T00:00:00Z' });
    for (const texto of [encargo('golf'), encargo('golf', true), urgencia]) {
      expect(texto).toContain(COMO_ORDENES);
      expect(texto).toContain('git -C no está permitido');
      expect(texto).toContain('«Confirmo»');
      expect(texto).not.toContain('ni borres nada');
    }
  });

  it('lanza un director a la vez, aunque haya dos servidores del Studio encendidos', () => {
    const dir = mkdtempSync(join(tmpdir(), 'stl-turno-'));
    try {
      const turno = join(dir, 'lanzando.json');
      expect(tomarTurno(turno)).toBe(true);
      // el otro servidor llega 109 ms después: no lo toma
      expect(tomarTurno(turno)).toBe(false);
      soltarTurno(turno);
      expect(tomarTurno(turno)).toBe(true);
      soltarTurno(turno);
      // uno abandonado (su proceso ya no existe, o pasó el límite de una revisión) se toma
      writeFileSync(turno, JSON.stringify({ pid: 2 ** 30, cuando: new Date().toISOString() }));
      expect(tomarTurno(turno)).toBe(true);
      writeFileSync(turno, JSON.stringify({ pid: process.pid, cuando: '2026-01-01T00:00:00.000Z' }));
      expect(tomarTurno(turno)).toBe(true);
      // soltar el de otro proceso no lo suelta
      writeFileSync(turno, JSON.stringify({ pid: 2 ** 30, cuando: new Date().toISOString() }));
      soltarTurno(turno);
      expect(existsSync(turno)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('le encarga la revisión de un proyecto, con su id en las herramientas', () => {
    expect(encargo('golf')).toContain('--proyecto golf --listo');
    expect(encargo('golf')).not.toContain('Es un reintento');
    // Pedida de nuevo después de una que no se cerró: retoma lo que dejó, sin rehacerlo
    expect(encargo('golf', true)).toContain('Es un reintento: la revisión anterior no se cerró; retoma lo que dejó, sin rehacerlo (la bandeja lo lista).');
  });

  it('una revisión que cerró con --listo nunca se marca fallida: manda plan.revisado', () => {
    // el 21 de octubre de 2026 una revisión cerró a las 21:20:50 y el Studio la mostró como «no terminó»
    const r = { pedida: '2026-10-21T21:11:52.000Z', lanzada: '2026-10-21T21:11:53.437Z' };
    expect(cerroSegunPlan('2026-10-21T21:20:50.854Z', r)).toBe(true);
    expect(cerroSegunPlan('2026-10-21T21:11:53.437Z', r)).toBe(true);
    // el revisado de una revisión anterior no la cierra
    expect(cerroSegunPlan('2026-10-21T20:00:00.000Z', r)).toBe(false);
    expect(cerroSegunPlan(null, r)).toBe(false);
    expect(cerroSegunPlan('no es fecha', r)).toBe(false);
    // sin lanzar (la tomó la sesión del director), cuenta desde que se pidió
    expect(cerroSegunPlan('2026-10-21T21:12:00.000Z', { pedida: r.pedida })).toBe(true);
    // y se lee del plan del proyecto (sin plan, null)
    const dir = mkdtempSync(join(tmpdir(), 'stl-revisado-'));
    try {
      expect(revisadoDelPlan(dir, 'golf')).toBeNull();
      mkdirSync(join(dir, 'proyectos', 'golf', 'director'), { recursive: true });
      writeFileSync(join(dir, 'proyectos', 'golf', 'director', 'plan.json'), JSON.stringify({ revisado: '2026-10-21T21:20:50.854Z' }));
      expect(revisadoDelPlan(dir, 'golf')).toBe('2026-10-21T21:20:50.854Z');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('espera lo que lanza en segundo plano sin esperas programadas, y con el límite de cada encargo', () => {
    // el 21 de octubre de 2026 una revisión se programó dos esperas de 20 minutos mientras su flujo ya estaba muerto
    expect(SIN_ESPERAS).toEqual(expect.arrayContaining(['ScheduleWakeup', 'CronCreate']));
    const aclaracion = encargoAclaracion({ proyecto: 'golf', mision: 't_x', paso: 0, nota: 'n1', quien: 'ana', pedida: '2026-10-21T00:00:00Z' });
    const urgencia = encargoUrgencia({ proyecto: 'golf', notas: ['n1'], quien: 'ana', pedida: '2026-10-21T00:00:00Z' });
    for (const [texto, minutos] of [[encargo('golf'), MAX_MIN], [aclaracion, MAX_MIN_ACLARAR], [urgencia, MAX_MIN_URGENCIA]] as const) {
      expect(texto).toContain('el aviso de que terminó te despierta solo');
      expect(texto).toContain(`Tienes ${minutos} minutos en total.`);
    }
  });

  it('pide en la misión del titular el permiso que le falta, en cada encargo que ejecuta trabajo (nota del titular, 21 de octubre de 2026)', () => {
    const urgencia = encargoUrgencia({ proyecto: 'golf', notas: ['n1'], quien: 'ana', pedida: '2026-10-21T00:00:00Z' });
    for (const texto of [encargo('golf'), encargo('golf', true), urgencia]) {
      expect(texto).toContain(SIN_PERMISO);
      expect(texto).toContain('«Autorizo»');
      expect(texto).toContain('Nunca te des un permiso tú mismo');
    }
  });

  it('ni los encargos ni la bandeja le dan órdenes encadenadas con && (propuesta «El cierre no deja nada sin atender»)', () => {
    // los permisos del director lanzado no aceptan &&, y hasta el 21 de octubre de 2026 la bandeja le daba así el commit de cierre
    const encadenada = /&&\s*(git|cd|node|npm)\b/;
    expect(readFileSync(new URL('../../tools/director/bandeja.ts', import.meta.url), 'utf8')).not.toMatch(encadenada);
    const aclaracion = encargoAclaracion({ proyecto: 'golf', mision: 't_x', paso: 0, nota: 'n1', quien: 'ana', pedida: '2026-10-21T00:00:00Z' });
    const urgencia = encargoUrgencia({ proyecto: 'golf', notas: ['n1'], quien: 'ana', pedida: '2026-10-21T00:00:00Z' });
    for (const texto of [encargo('golf'), encargo('golf', true), aclaracion, urgencia]) expect(texto).not.toMatch(encadenada);
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

  it('cuenta los tokens en vivo: una vez por respuesta, aunque venga repetida en sus partes, y al terminar el total exacto', () => {
    const resp = (id: string, salida: number) => JSON.stringify({ type: 'assistant', message: { id, content: [], usage: { input_tokens: 2, cache_creation_input_tokens: 100, cache_read_input_tokens: 1000, output_tokens: salida } } });
    // La misma respuesta en dos partes, con lo escrito atrasado en la primera: cuenta lo más que dijo
    const uso = usoDe(`${resp('m1', 1)}\n${resp('m1', 40)}\n${resp('m2', 10)}\nno es json\n`);
    expect(tokensDe(uso)).toBe(1142 + 1112);
    // De a pedazos: suma a lo ya contado
    usoDe(`${resp('m3', 0)}\n`, uso);
    expect(tokensDe(uso)).toBe(1142 + 1112 + 1102);
    // Al terminar, el del evento result (el mismo de «Lo que gastó»)
    usoDe(`${JSON.stringify({ type: 'result', usage: { input_tokens: 5, cache_creation_input_tokens: 300, cache_read_input_tokens: 3000, output_tokens: 60 } })}\n`, uso);
    expect(tokensDe(uso)).toBe(3365);
    expect(tokensDe(usoDe(''))).toBe(0);
  });

  it('lleva los tokens de la revisión del proyecto mientras su registro crece', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'stl-tokens-'));
    try {
      mkdirSync(join(raiz, '.revisiones'));
      const log = join(raiz, '.revisiones', 'golf-2026-10-21T13-00-00-000Z.log');
      const resp = (id: string) => JSON.stringify({ type: 'assistant', message: { id, content: [], usage: { input_tokens: 1, output_tokens: 9 } } });
      expect(tokensDeProyecto(raiz, 'golf')).toBe(0);
      writeFileSync(log, `${resp('a')}\n`);
      expect(tokensDeProyecto(raiz, 'golf')).toBe(10);
      appendFileSync(log, `${resp('b')}\n${resp('b')}\n`);
      expect(tokensDeProyecto(raiz, 'golf')).toBe(20);
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
    // sin permisos negados no trae la lista; con ellos, cada uno una vez (propuesta «Lo que se le negó al director, a la vista»)
    expect(c.negados).toBeUndefined();
    const negado = registro.replace('"usage":{}', '"usage":{},"permission_denials":[{"tool_name":"Bash","tool_input":{"command":"git -C .stl status"}},{"tool_name":"Bash","tool_input":{"command":"git -C .stl status"}}]');
    expect(consumoDe(negado)!.negados).toEqual(['Bash: git -C .stl status']);
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

  describe('el reporte de una revisión que no se cerró', () => {
    const init = JSON.stringify({ type: 'system', subtype: 'init', model: 'claude-opus-5-5' });
    const dice = (t: string) => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: t }] } });
    const usa = (id: string, name: string, input: Record<string, unknown>) => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input }] } });
    const resultado = (x: Record<string, unknown> = {}) => JSON.stringify({ type: 'result', subtype: 'success', is_error: false, duration_ms: 120_000, total_cost_usd: 3.5, result: 'Listo por ahora.', ...x });
    const inicio = Date.parse('2026-10-21T18:00:00Z');

    it('el límite de tiempo: cuánto duró y lo último que hacía', () => {
      const registro = [lineaPedido(null, null).trim(), init, dice('Corro la bandeja.'), usa('t1', 'Read', { file_path: 'C:/x/plan.json' }), usa('t2', 'Edit', { file_path: 'C:/x/plan.json' }), usa('t3', 'Edit', { file_path: 'C:/x/plan.json' })].join('\n');
      const f = diagnosticarFalla(registro, { limite: 60, inicio, fin: inicio + 60 * 60_000, ultimaActividad: inicio + 59 * 60_000 });
      expect(f.que).toBe('La revisión se cortó a los 60 minutos');
      expect(f.porque).toContain('Seguía trabajando');
      expect(f.duracion).toBe(60);
      expect(f.accion).toBe('pedir');
      expect(f.ultimos).toEqual([
        { tipo: 'hace', texto: 'Empieza la revisión' },
        { tipo: 'dice', texto: 'Corro la bandeja.' },
        { tipo: 'hace', texto: 'Lee plan.json' },
        { tipo: 'hace', texto: 'Edita plan.json', veces: 2 },
      ]);
      // sin nada nuevo en su registro desde hace rato, se había quedado parado
      expect(diagnosticarFalla(registro, { limite: 60, inicio, fin: inicio + 60 * 60_000, ultimaActividad: inicio + 30 * 60_000 }).porque).toContain('30 minutos sin ninguna actividad');
      // esperando un flujo en segundo plano: conviene pedirla sin ultracode
      const conFlujo = diagnosticarFalla(`${registro}\n${usa('t4', 'Workflow', { description: 'Investigar' })}\n${JSON.stringify({ type: 'system', subtype: 'background_tasks_changed', tasks: [{ task_id: 'w1', description: 'Evalúa los tipos de nota' }] })}`, { limite: 60 });
      expect(conFlujo.porque).toContain('Seguía esperando «Evalúa los tipos de nota»');
      expect(conFlujo).toMatchObject({ accion: 'sin_ultracode', usoFlujos: { flujos: 1, ayudantes: 0 } });
    });

    it('el turno terminado con un flujo en segundo plano, que Claude Code cortó', () => {
      // lo que pasó el 21 de octubre de 2026: el director esperó su flujo, terminó el turno y Claude Code lo cortó
      const registro = [
        init,
        usa('t1', 'Workflow', { description: 'Evalúa la idea' }),
        JSON.stringify({ type: 'system', subtype: 'background_tasks_changed', tasks: [{ task_id: 'w1', task_type: 'local_workflow', description: 'Evalúa la idea del titular' }] }),
        resultado({ result: 'Espero el resultado del análisis para responder la nota.', total_cost_usd: 14.17 }),
        'Background tasks still running 10m after the last turn (workflow "Evalúa la idea del titular"); stopping them.',
        JSON.stringify({ type: 'system', subtype: 'task_updated', task_id: 'w1', patch: { status: 'killed' } }),
        JSON.stringify({ type: 'system', subtype: 'background_tasks_changed', tasks: [] }),
      ].join('\n');
      const f = diagnosticarFalla(registro, { problema: 'La revisión que lanzó el Studio terminó sin cerrarse.' });
      expect(f.que).toBe('Claude Code terminó sin cerrar la revisión');
      expect(f.porque).toContain('esperando «Evalúa la idea del titular» en segundo plano');
      expect(f.porque).toContain('lo cortó');
      expect(f).toMatchObject({ gasto: 14.17, usoFlujos: { flujos: 1, ayudantes: 0 }, accion: 'sin_ultracode' });
      expect(f.sugerencia).toContain('sin ultracode');
    });

    it('un error de la API, y un límite de uso de la cuenta', () => {
      const api = diagnosticarFalla([init, dice('Leo el plan.'), resultado({ subtype: 'error_during_execution', is_error: true, result: 'API Error: 500 Internal server error' })].join('\n'));
      expect(api.que).toBe('Se detuvo a mitad de camino');
      expect(api.porque).toContain('«API Error: 500 Internal server error»');
      expect(api.accion).toBe('pedir');
      const limite = diagnosticarFalla([init, dice('Leo el plan.'), JSON.stringify({ type: 'rate_limit_event', rate_limit_info: { status: 'rejected', resetsAt: 1792626600 } }), resultado({ is_error: true, result: 'Claude AI usage limit reached' })].join('\n'));
      expect(limite.porque).toContain('límite de uso');
      expect(limite).toMatchObject({ accion: 'cuenta', renueva: new Date(1792626600_000).toISOString() });
      // sin llegar a trabajar, la sesión de la cuenta
      const sesion = diagnosticarFalla([init, resultado({ is_error: true, result: 'Invalid API key · Please run /login' })].join('\n'));
      expect(sesion).toMatchObject({ que: 'No arrancó', accion: 'cuenta' });
      expect(sesion.sugerencia).toContain('claude auth login');
    });

    it('los permisos negados, con la herramienta y lo que intentó', () => {
      const registro = [
        init,
        usa('t1', 'Bash', { command: 'cd x ; git status', description: 'Ver el estado' }),
        JSON.stringify({ type: 'system', subtype: 'permission_denied', tool_name: 'Bash', tool_use_id: 't1' }),
        resultado({ permission_denials: [{ tool_name: 'Bash', tool_use_id: 't1', tool_input: { command: 'cd x ; git status' } }] }),
      ].join('\n');
      const f = diagnosticarFalla(registro);
      expect(f.negados).toEqual(['Bash: «cd x ; git status»']);
      expect(f.porque).toContain('Se le negó un permiso (Bash: «cd x ; git status»)');
      expect(f.porque).toContain('«Listo por ahora.»');
      expect(f.gasto).toBe(3.5);
    });

    it('un registro vacío: no arrancó, y lo dice', () => {
      expect(diagnosticarFalla('')).toMatchObject({ que: 'No arrancó', duracion: null, gasto: null, ultimos: [], usoFlujos: null, negados: [] });
      expect(diagnosticarFalla(lineaPedido('opus', 'high')).porque).toContain('No escribió nada en su registro');
      expect(diagnosticarFalla('', { problema: 'El Studio no pudo lanzar Claude Code (spawn ENOENT).' }).porque).toMatch(/^El Studio no pudo lanzar Claude Code \(spawn ENOENT\)\./);
      expect(diagnosticarFalla('error: algo se rompió al empezar\n', { codigo: 1 }).porque).toContain('«error: algo se rompió al empezar»');
    });

    it('el proceso que murió sin dar su resultado', () => {
      const f = diagnosticarFalla([init, dice('Leo el plan.')].join('\n'), { muerto: true, fin: inicio + 20 * 60_000, ultimaActividad: inicio + 5 * 60_000 });
      expect(f.que).toBe('Claude Code se detuvo sin terminar');
      expect(f.porque).toContain('ya no existe');
      expect(f.porque).toContain('hace 15 min');
    });

    it('sabe si el director lanzado por otro servidor sigue vivo', () => {
      const dir = mkdtempSync(join(tmpdir(), 'stl-lanzado-'));
      try {
        const turno = join(dir, 'lanzando.json');
        expect(estadoDelLanzado(turno, 'golf').estado).toBe('desconocido');
        writeFileSync(turno, JSON.stringify({ pid: 111, cuando: new Date().toISOString(), hijo: 222, proyecto: 'golf', registro: '.revisiones/golf.log' }));
        expect(estadoDelLanzado(turno, 'golf', (p) => p === 111 || p === 222).estado).toBe('servidor');
        expect(estadoDelLanzado(turno, 'golf', (p) => p === 222)).toEqual({ estado: 'director', hijo: 222 });
        expect(estadoDelLanzado(turno, 'golf', () => false)).toEqual({ estado: 'muerto', hijo: 222 });
        // el turno de otro proyecto, o uno de antes sin el director anotado, no dice nada
        expect(estadoDelLanzado(turno, 'otro', () => false).estado).toBe('desconocido');
        writeFileSync(turno, JSON.stringify({ pid: 111, cuando: new Date().toISOString() }));
        expect(estadoDelLanzado(turno, 'golf', () => false).estado).toBe('desconocido');
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it('lee el último registro del proyecto: su inicio, su última actividad y su ruta', () => {
      const raiz = mkdtempSync(join(tmpdir(), 'stl-falla-'));
      try {
        mkdirSync(join(raiz, '.revisiones'));
        expect(actividadDeProyecto(raiz, 'golf')).toBeNull();
        writeFileSync(join(raiz, '.revisiones', 'golf-2026-10-21T18-00-00-000Z.log'), `${init}\n${dice('Leo el plan.')}\n`);
        // el de «golf-dos» o el de una aclaración no se confunden con el de la revisión
        writeFileSync(join(raiz, '.revisiones', 'golf-aclaracion-2026-10-21T19-00-00-000Z.log'), `${init}\n`);
        expect(inicioDeRegistro('golf-2026-10-21T18-00-00-000Z.log')).toBe(inicio);
        expect(actividadDeProyecto(raiz, 'golf')).toEqual(expect.any(String));
        const f = fallaDeProyecto(raiz, 'golf', { muerto: true });
        expect(f.registro).toBe(join('.revisiones', 'golf-2026-10-21T18-00-00-000Z.log'));
        expect(f.ultimos.map((p) => p.texto)).toEqual(['Empieza la revisión', 'Leo el plan.']);
        expect(f.que).toBe('Claude Code se detuvo sin terminar');
      } finally {
        rmSync(raiz, { recursive: true, force: true });
      }
    });
  });

  it('elige la versión más nueva de Claude Code', () => {
    expect(['2.1.295', '2.1.299', '2.1.30', '10.0.0'].sort(compararVersion)).toEqual(['2.1.30', '2.1.295', '2.1.299', '10.0.0']);
  });
});
