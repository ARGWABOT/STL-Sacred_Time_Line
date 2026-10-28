import { describe, expect, it } from 'vitest';
import { aprobadoEnVivo, aprobadosSolos, cabia, conLoAprobado, LO_APROBO_CLAUDE, lineaAutomatico } from './aprobadosSolos';
import { progresoDe } from './revisor';

// «Automático, vigilado» (pd_permiso_automatico): lo que Claude Code aprobó solo se lee del registro de la revisión
const CASA = String.raw`C:\Users\ana`;
const permitidas = ['Bash(cd:*)', 'Bash(git log:*)', 'Bash(npm test)', 'Edit(//c/repos/golf/.stl/**)', 'Read(//c/xampp/stl/**)', 'WebSearch'];
const carpetas = ['//c/repos/golf/**'];
const uso = (id: string, name: string, input: Record<string, unknown>) => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input }] } });
const negadoEnVivo = (id: string) => JSON.stringify({ type: 'system', subtype: 'permission_denied', tool_use_id: id });
const resultado = (denegados: { id: string }[]) => JSON.stringify({ type: 'result', permission_denials: denegados.map((d) => ({ tool_use_id: d.id, tool_name: 'Bash', tool_input: {} })) });

describe('lo que Claude Code aprobó solo en el modo automático (pd_permiso_automatico)', () => {
  it('cabe lo que ya tenía: cada orden de una cadena, leer en sus carpetas, escribir donde tiene Edit y las herramientas dadas', () => {
    expect(cabia({ herramienta: 'Bash', entrada: { command: 'cd x && git log -1' } }, permitidas, carpetas, CASA)).toBe(true);
    expect(cabia({ herramienta: 'Bash', entrada: { command: 'cd x && curl -s http://y' } }, permitidas, carpetas, CASA)).toBe(false);
    expect(cabia({ herramienta: 'Read', entrada: { file_path: String.raw`C:\repos\golf\src\a.ts` } }, permitidas, carpetas, CASA)).toBe(true);
    expect(cabia({ herramienta: 'Read', entrada: { file_path: String.raw`D:\otra\b.md` } }, permitidas, carpetas, CASA)).toBe(false);
    expect(cabia({ herramienta: 'Edit', entrada: { file_path: String.raw`C:\repos\golf\.stl\director\plan.json` } }, permitidas, carpetas, CASA)).toBe(true);
    // Leer una carpeta no deja escribir en ella
    expect(cabia({ herramienta: 'Write', entrada: { file_path: String.raw`C:\repos\golf\src\a.ts` } }, permitidas, carpetas, CASA)).toBe(false);
    expect(cabia({ herramienta: 'WebSearch', entrada: { query: 'x' } }, permitidas, carpetas, CASA)).toBe(true);
    expect(cabia({ herramienta: 'WebFetch', entrada: { url: 'https://x' } }, permitidas, carpetas, CASA)).toBe(false);
  });

  it('del registro, solo lo que corrió sin caber en lo permitido, por tipo de acción y sin lo que se negó', () => {
    const registro = [
      uso('t1', 'Bash', { command: 'git log --oneline -5' }),
      uso('t2', 'Bash', { command: 'curl -s http://localhost:5180/a' }),
      uso('t3', 'Bash', { command: 'curl -s http://localhost:5180/b' }),
      uso('t4', 'Bash', { command: 'wget http://z' }),
      negadoEnVivo('t4'),
      uso('t5', 'Write', { file_path: String.raw`C:\repos\golf\src\nuevo.ts` }),
      uso('t6', 'TodoWrite', { todos: [] }),
      uso('t7', 'Bash', { command: 'pip install x' }),
      'no es json',
      resultado([{ id: 't7' }]),
    ].join('\n');
    const a = aprobadosSolos(registro, permitidas, carpetas, CASA);
    expect(a.map((x) => [x.regla, x.intentos])).toEqual([
      ['Bash(curl:*)', ['Bash: curl -s http://localhost:5180/a', 'Bash: curl -s http://localhost:5180/b']],
      ['Edit(//c/repos/golf/src/**)', [String.raw`Write: C:\repos\golf\src\nuevo.ts`]],
    ]);
    // Cada uno, dicho como en el panel de permisos
    expect(a[0].que).toMatch(/curl/);
    expect(aprobadosSolos('', permitidas, carpetas, CASA)).toEqual([]);
  });

  it('al terminar, lo aprobado entra al panel marcado «Lo aprobó Claude Code», solo para el proyecto y sin repetir', () => {
    const aprobados = aprobadosSolos([uso('t1', 'Bash', { command: 'curl -s http://a' }), uso('t2', 'Bash', { command: 'cat x > y' }), uso('t3', 'WebFetch', { url: 'https://z' })].join('\n'), permitidas, carpetas, CASA);
    const web = aprobados.find((a) => a.herramienta === 'WebFetch')?.regla;
    expect(web).toBeTruthy();
    const antes = [{ regla: web!, alcance: 'todos' as const, cuando: 'x', quien: 'ana' }];
    const despues = conLoAprobado(antes, aprobados, 'golf', '2026-10-27T04:00:00.000Z');
    // Lo que ya estaba (leer esa página, para todos) no se repite; lo que no tiene regla (la redirección) no entra
    expect(despues).toEqual([...antes, { regla: 'Bash(curl:*)', alcance: 'proyecto', proyecto: 'golf', cuando: '2026-10-27T04:00:00.000Z', quien: LO_APROBO_CLAUDE, origen: 'claude' }]);
    expect(conLoAprobado(despues, aprobados, 'golf', 'y')).toEqual(despues);
    // En otro proyecto, sí: el alcance es solo el proyecto que se revisaba
    expect(conLoAprobado(despues, aprobados, 'tesis', 'y').filter((a) => a.proyecto === 'tesis').map((a) => a.regla)).toEqual(['Bash(curl:*)']);
  });

  it('en vivo, cada aprobación es una línea de «Lo que va haciendo el director», solo en el modo automático y cuando corrió sin error', () => {
    const ya = { permitidas, carpetas, casa: CASA };
    const res = (id: string, error = false) => JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, is_error: error, content: 'x' }] } });
    const registro = [lineaAutomatico(ya).trim(), uso('t1', 'Bash', { command: 'git log -1' }), res('t1'), uso('t2', 'Bash', { command: 'curl -s http://a' }), uso('t3', 'Bash', { command: 'wget http://b' })].join('\n');
    // Por pedazos, como lo lee el Studio: el resultado llega en el pedazo siguiente
    const auto = { usos: new Map() };
    const primero = progresoDe(registro, Infinity, auto);
    const segundo = progresoDe([res('t2'), res('t3', true)].join('\n'), Infinity, auto);
    expect(primero.filter((p) => p.texto.startsWith('Claude Code lo aprobó solo'))).toEqual([]);
    expect(segundo).toEqual([{ tipo: 'hace', texto: 'Claude Code lo aprobó solo: Bash: curl -s http://a' }]);
    // Sin la línea del lanzador (los otros dos modos), nunca
    expect(progresoDe([uso('t2', 'Bash', { command: 'curl -s http://a' }), res('t2')].join('\n'), Infinity).some((p) => p.texto.startsWith('Claude Code'))).toBe(false);
    expect(aprobadoEnVivo({ type: 'studio', automatico: { permitidas: 'x' } }, { usos: new Map() })).toBeNull();
  });
});
