// Una línea por cada revisión de este computador (pedido pd_lineas_por_revision): sacada de su registro sin modelo, escrita
// una sola vez cuando su lanzamiento terminó, y que no se borra aunque el registro se pode.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { ARCHIVO_LINEAS, guardarLineasDeRevision, leerLineasDeRevision, lineaDeRegistro } from './lineasDeRevision';

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
  ev({ type: 'result', total_cost_usd: 12.345, duration_ms: 5_400_000, permission_denials: [{ tool_name: 'Bash', tool_input: { command: 'powershell -NoProfile' } }] }),
].join('\n');

describe('una línea por cada revisión', () => {
  it('de su registro: cuándo, de qué tipo, cuánto duró y gastó, si cerró, qué notas respondió, qué archivos cambió, sus commits y lo negado', () => {
    expect(lineaDeRegistro('p-2026-10-28T07-09-20-889Z.log', CERRADA, undefined, RAIZ)).toEqual({
      registro: 'p-2026-10-28T07-09-20-889Z.log',
      proyecto: 'p',
      tipo: 'revision',
      cuando: '2026-10-28T07:09:20.889Z',
      minutos: 90,
      costo: 12.35,
      modelo: 'claude-opus-5-5[1m]',
      cerro: true,
      notas: ['n_uno', 'n_dos'],
      archivos: ['CLAUDE.md', '.stl/director/cambios.json'],
      commits: [{ hash: '3fb3cf0', asunto: 'STL: el candado de cada proyecto' }, { hash: '1a2b3c4', asunto: 'Director (p): revisión del 28 de octubre' }],
      negados: ['Bash: powershell -NoProfile'],
    });
  });

  it('las rutas quedan cortas con una raíz de Windows o de Linux, en cualquiera de los dos (la integración continua corre en Linux)', () => {
    const linux = usar('Edit', { file_path: '/srv/Studio/src/a.ts', old_string: 'a', new_string: 'b' });
    expect(lineaDeRegistro('p-2026-10-28T07-09-20-889Z.log', linux, undefined, '/srv/Studio')?.archivos).toEqual(['src/a.ts']);
    expect(lineaDeRegistro('p-2026-10-28T07-09-20-889Z.log', CERRADA, undefined, 'C:\\Studio\\')?.archivos).toEqual(['CLAUDE.md', '.stl/director/cambios.json']);
  });

  it('una que no terminó con su resultado: sin costo, sin cierre, y dura hasta lo último que escribió', () => {
    const l = lineaDeRegistro('p-urgencia-2026-10-28T07-00-00-000Z.log', ev({ type: 'system', subtype: 'init', model: 'm' }), Date.parse('2026-10-28T07:30:00.000Z'));
    expect(l).toMatchObject({ tipo: 'urgencia', costo: null, cerro: false, minutos: 30, notas: [], archivos: [], commits: [], negados: [] });
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
