import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compararVersion, encargo, permitido, progresoDe, progresoDeProyecto } from './revisor';

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

  it('elige la versión más nueva de Claude Code', () => {
    expect(['2.1.295', '2.1.299', '2.1.30', '10.0.0'].sort(compararVersion)).toEqual(['2.1.30', '2.1.295', '2.1.299', '10.0.0']);
  });
});
