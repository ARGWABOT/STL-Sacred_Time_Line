import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { avisoDeLimite, comprobarReparacion, encargoReparacion, estadoDeReparacion, informeDeRegistro, leerReparacion, MAX_MIN_REPARAR, pedirReparacion, reparacionActiva, USO_AVISO_REPARAR } from './reparar';
import type { Git } from './volver';
import { ORIGENES_REVISION } from '../../src/director/proyectos';

const carpetas: string[] = [];
const carpeta = () => {
  const c = mkdtempSync(join(tmpdir(), 'reparar-'));
  carpetas.push(c);
  return c;
};
afterEach(() => { for (const c of carpetas.splice(0)) rmSync(c, { recursive: true, force: true }); });

describe('«Diagnosticar y reparar» (pd_salud_c)', () => {
  it('tiene su botón entre los orígenes que lanzan al director, y 30 minutos', () => {
    expect(ORIGENES_REVISION.reparar).toContain('Diagnosticar y reparar');
    expect(MAX_MIN_REPARAR).toBe(30);
  });

  it('un clic, un intento: mientras una sigue sin terminar, no se pide otra', () => {
    const c = carpeta();
    const a = pedirReparacion(c, 'leonc', { mensaje: 'TypeError: x is not a function', traza: 'at app.ts:1' }, '2026-11-09T10:00:00.000Z');
    expect(a.ya).toBe(false);
    expect(a.r.falla).toEqual({ mensaje: 'TypeError: x is not a function', traza: 'at app.ts:1' });
    const b = pedirReparacion(c, 'leonc', null, '2026-11-09T10:01:00.000Z');
    expect(b.ya).toBe(true);
    expect(leerReparacion(c)?.pedida).toBe('2026-11-09T10:00:00.000Z');
    expect(reparacionActiva(leerReparacion(c))).toBe(true);
  });

  it('la línea de lo que hace: espera la revisión en marcha, trabaja con lo último, y su resultado', () => {
    const ahora = Date.parse('2026-11-09T10:12:00.000Z');
    expect(estadoDeReparacion(null, { revisando: false }).estado).toBe('ninguna');
    expect(estadoDeReparacion({ quien: 'x', pedida: '2026-11-09T10:00:00.000Z' }, { revisando: true, ahora }).estado).toBe('espera');
    const t = estadoDeReparacion({ quien: 'x', pedida: '2026-11-09T10:00:00.000Z', lanzada: '2026-11-09T10:02:00.000Z' }, { revisando: false, ultimo: 'Corre las pruebas', ahora, uso: 93 });
    expect(t).toMatchObject({ estado: 'trabaja', minutos: 10, ultimo: 'Corre las pruebas', uso: 93 });
    expect(estadoDeReparacion({ quien: 'x', pedida: 'a', lanzada: 'b', comprobando: 'c' }, { revisando: false }).estado).toBe('comprueba');
    expect(estadoDeReparacion({ quien: 'x', pedida: 'a', hecha: '2026-11-09T10:20:00.000Z', resultado: 'deshecha', informe: 'no pasó' }, { revisando: false })).toMatchObject({ estado: 'deshecha', informe: 'no pasó' });
  });

  it('la línea de aviso va desde el 90 % del límite de cinco horas', () => {
    expect(USO_AVISO_REPARAR).toBe(90);
    expect(avisoDeLimite(90)).toBe(true);
    expect(avisoDeLimite(89.9)).toBe(false);
    expect(avisoDeLimite(null)).toBe(false);
  });

  it('el encargo: solo el código del Studio, su propio commit, sin subir, y su caso para la medición como una línea', () => {
    const e = encargoReparacion({ quien: 'leonc', pedida: 'a', falla: { mensaje: 'boom' } });
    expect(e).toContain('«boom»');
    expect(e).toContain('its own local commit');
    expect(e).toContain('Never push');
    expect(e).toContain('«Caso:»');
    expect(e).toContain('do not write it in the code');
    expect(e).toContain('30 minutes');
  });

  it('el informe es lo que dijo el director al terminar', () => {
    const reg = ['{"type":"system"}', '{"type":"result","result":"Arreglé el import."}', 'basura'].join('\n');
    expect(informeDeRegistro(reg)).toBe('Arreglé el import.');
    expect(informeDeRegistro('nada')).toBeNull();
  });

  const gitFalso = (head: string, revertOk = true) => {
    const llamadas: string[][] = [];
    const git: Git = async (args) => {
      llamadas.push(args);
      if (args[0] === 'rev-parse') return { ok: true, out: `${head}\n`, err: '' };
      return { ok: revertOk, out: '', err: revertOk ? '' : 'conflicto' };
    };
    return { git, llamadas };
  };

  it('sin commits nuevos, nada que comprobar', async () => {
    const { git, llamadas } = gitFalso('aaa');
    expect(await comprobarReparacion('aaa', git, async () => true)).toEqual({ resultado: 'sin_cambios' });
    expect(llamadas.some((a) => a[0] === 'revert')).toBe(false);
  });

  it('con commits que pasan los tipos y las pruebas, queda guardada', async () => {
    const { git } = gitFalso('bbb');
    const corridas: string[] = [];
    const r = await comprobarReparacion('aaa', git, async (o, a) => { corridas.push(`${o} ${a.join(' ')}`); return true; });
    expect(r.resultado).toBe('guardada');
    expect(corridas).toEqual(['npm run typecheck', 'npx vitest run --changed aaa']);
  });

  it('si fallan, deshace sus commits con commits nuevos (nunca reescribe la historia)', async () => {
    const { git, llamadas } = gitFalso('bbb');
    const r = await comprobarReparacion('aaa', git, async (_o, a) => a[0] !== 'vitest');
    expect(r.resultado).toBe('deshecha');
    expect(llamadas).toContainEqual(['revert', '--no-edit', 'aaa..HEAD']);
    expect(llamadas.some((a) => a.includes('reset'))).toBe(false);
  });
});
