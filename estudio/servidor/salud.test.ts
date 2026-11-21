import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { huellasDePasos } from '../../src/director/director';
import type { Candado } from '../../src/director/candado';
import { textoDeBitacora } from '../../src/director/textoBitacora';
import {
  anotarArreglos,
  arregloEnLaBitacora,
  arreglosRecientes,
  BYTES_MINIMOS_DISCO,
  candadoViejo,
  chequearClaude,
  chequearDisco,
  chequearPlan,
  chequearRama,
  chequearSalud,
  leerArreglos,
  marcasCorregidas,
  MINUTOS_SALUD,
  revisionAtascada,
  type Sonda,
} from './salud';

const leer = (r: string) => readFileSync(join(__dirname, r), 'utf8');

describe('el chequeo de salud: cada chequeo (pd_salud_b)', () => {
  it('el plan: que se lea, que sea JSON y que pase su validación', () => {
    expect(chequearPlan(null, () => [])).toMatchObject({ id: 'plan', dato: expect.stringContaining('no se puede leer') });
    expect(chequearPlan('{ roto', () => [])).toMatchObject({ id: 'plan', dato: expect.stringContaining('no es JSON') });
    expect(chequearPlan('{}', () => ['La misión x no existe.', 'otro'])).toEqual({ id: 'plan', dato: 'La misión x no existe.' });
    expect(chequearPlan('{}', () => [])).toBeNull();
  });

  it('las marcas: solo las que ya no caben en su misión, con las que sí valen y su huella', () => {
    const m = { id: 'm1', pasos: ['uno', 'dos'] };
    const reescrita = { id: 'm2', pasos: ['nuevo'] };
    const pasos = {
      m1: { hechos: [0, 1], cuando: 'x', quien: 'a', huellas: huellasDePasos(m, [0, 1]) },
      // marcada con 3 pasos de antes, ya con uno: ninguna vale
      m2: { hechos: [0, 2], cuando: 'x', quien: 'a' },
      // una misión que salió del plan: su marca es su historia y no se toca
      archivada: { hechos: [5], cuando: 'x', quien: 'a' },
    };
    const c = marcasCorregidas([m, reescrita], pasos)!;
    expect(Object.keys(c)).toEqual(['m2']);
    expect(c.m2.hechos).toEqual([]);
    expect(marcasCorregidas([m], pasos)).toBeNull();
    expect(marcasCorregidas([m], undefined)).toBeNull();
    // un paso reescrito pierde su marca; el otro la conserva
    const cambiada = { id: 'm1', pasos: ['uno', 'dos, otra vez'] };
    expect(marcasCorregidas([cambiada], pasos)!.m1.hechos).toEqual([0]);
  });

  it('una revisión «en marcha» sin su proceso', () => {
    const ahora = Date.parse('2026-11-09T20:00:00Z');
    const base = { lanzado: 'desconocido' as const, candadoVivo: false, esteLaVigila: false, ahora, maxMin: 90, minSesion: 120 };
    const hace = (min: number) => new Date(ahora - min * 60_000).toISOString();
    // lanzada por el Studio: muerta, o pasada de su límite
    expect(revisionAtascada({ proyecto: 'p', lanzada: hace(10) }, { ...base, lanzado: 'muerto' })).toBe(true);
    expect(revisionAtascada({ proyecto: 'p', lanzada: hace(10) }, { ...base, lanzado: 'director' })).toBe(false);
    expect(revisionAtascada({ proyecto: 'p', lanzada: hace(100) }, base)).toBe(true);
    expect(revisionAtascada({ proyecto: 'p', lanzada: hace(100), limite: 120 }, base)).toBe(false);
    // la que vigila este mismo servidor, nunca
    expect(revisionAtascada({ proyecto: 'p', lanzada: hace(10) }, { ...base, lanzado: 'muerto', esteLaVigila: true })).toBe(false);
    // tomada a mano por la sesión: sin candado vivo y pasado lo que vale el de una sesión
    expect(revisionAtascada({ proyecto: 'p', enCurso: hace(130) }, base)).toBe(true);
    expect(revisionAtascada({ proyecto: 'p', enCurso: hace(130) }, { ...base, candadoVivo: true })).toBe(false);
    expect(revisionAtascada({ proyecto: 'p', enCurso: hace(30) }, base)).toBe(false);
    // cerrada, fallida o solo pedida: nada que arreglar
    expect(revisionAtascada({ proyecto: 'p', lanzada: hace(10), hecha: hace(1) }, { ...base, lanzado: 'muerto' })).toBe(false);
    expect(revisionAtascada({ proyecto: 'p', lanzada: hace(10), error: 'x' }, { ...base, lanzado: 'muerto' })).toBe(false);
    expect(revisionAtascada({ proyecto: 'p' }, { ...base, lanzado: 'muerto' })).toBe(false);
    expect(revisionAtascada(null, base)).toBe(false);
  });

  it('un candado viejo del director: pasó su hora o ya no existen sus procesos', () => {
    const ahora = Date.parse('2026-11-09T20:00:00Z');
    const c: Candado = { quien: 'studio', estudio: '/e', proyecto: 'p', tipo: 'revision', desde: '2026-11-09T19:00:00Z', hasta: '2026-11-09T21:00:00Z', pid: 11, hijo: 12 };
    expect(candadoViejo(null, ahora, () => true)).toBe(false);
    expect(candadoViejo(c, ahora, () => true)).toBe(false);
    expect(candadoViejo(c, ahora, () => false)).toBe(true);
    expect(candadoViejo({ ...c, hasta: '2026-11-09T19:30:00Z' }, ahora, () => true)).toBe(true);
    // la sesión del director vale por su hora, aunque no anote procesos
    expect(candadoViejo({ ...c, quien: 'sesion', pid: undefined, hijo: undefined }, ahora, () => false)).toBe(false);
  });

  it('la rama stl: los archivos en conflicto, uno por archivo', () => {
    expect(chequearRama('')).toBeNull();
    const u = '100644 aaa 1\tdirector/plan.json\n100644 bbb 2\tdirector/plan.json\n100644 ccc 3\tdirector/plan.json\n100644 ddd 2\tdocs/x.md\n';
    expect(chequearRama(u)).toEqual({ id: 'rama', dato: 'director/plan.json, docs/x.md' });
  });

  it('Claude Code: instalado y con sesión, con la orden que lo arregla', () => {
    expect(chequearClaude({ ok: true })).toBeNull();
    expect(chequearClaude({ ok: false, falta: 'sesion', orden: 'claude auth login' })).toEqual({ id: 'claude', dato: 'sesion', orden: 'claude auth login' });
    expect(chequearClaude({ ok: false, falta: 'programa', orden: 'npm install -g @anthropic-ai/claude-code' })).toMatchObject({ dato: 'programa' });
  });

  it('el disco: avisa por debajo de 2 GB libres (nmw9p7kpttit), y sin saberlo no inventa nada', () => {
    expect(BYTES_MINIMOS_DISCO).toBe(2 * 1024 ** 3);
    expect(chequearDisco(BYTES_MINIMOS_DISCO)).toBeNull();
    expect(chequearDisco(BYTES_MINIMOS_DISCO - 1)).toEqual({ id: 'disco', dato: '1.9' });
    expect(chequearDisco(0.5 * 1024 ** 3)).toEqual({ id: 'disco', dato: '0.5' });
    expect(chequearDisco(null)).toBeNull();
  });

  it('mira Claude Code sin llamar al modelo ni gastar del plan (nmw9p75pftit): solo `claude auth status`', () => {
    const api = leer('api.ts');
    expect(api).toContain('chequearClaude(await sesionDeClaude())');
    expect(leer('revisor.ts')).toMatch(/lanzarClaude\(programa, \['auth', 'status'\]/);
  });

  it('corre al encender y cada 5 minutos, y GET /salud devuelve lo que encontró', () => {
    expect(MINUTOS_SALUD).toBe(5);
    const api = leer('api.ts');
    expect(api).toContain('setTimeout(mirarSalud, 5_000)');
    expect(api).toContain('setInterval(mirarSalud, MINUTOS_SALUD * 60_000)');
    expect(api).toContain("ruta === '/salud' && req.method === 'GET'");
  });
});

describe('el chequeo de salud: los arreglos seguros y su registro', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'stl-salud-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const hecho = (que: string[]) => async () => void que.push('hecho');

  it('hace cada arreglo seguro sin preguntar, lo anota en la bitácora y en .estudio/salud.json', async () => {
    const hechos: string[] = [];
    const bitacora: string[] = [];
    const sondas: Sonda[] = [
      { id: 'plan', mirar: async () => null },
      { id: 'revision', mirar: async () => ({ arreglo: { tipo: 'revision', dato: 'p', hacer: hecho(hechos) } }) },
      { id: 'candado', mirar: async () => ({ arreglo: { tipo: 'candado', dato: 'p', hacer: hecho(hechos) } }) },
      { id: 'marcas', mirar: async () => ({ arreglo: { tipo: 'marcas', dato: 'm1', hacer: hecho(hechos) } }) },
    ];
    const e = await chequearSalud(sondas, dir, async (a) => void bitacora.push(textoDeBitacora(arregloEnLaBitacora(a))), () => '2026-11-09T20:00:00.000Z');
    expect(hechos).toHaveLength(3);
    expect(e.problemas).toEqual([]);
    expect(e.chequeos).toEqual([
      { id: 'plan', estado: 'bien' },
      { id: 'revision', estado: 'arreglado' },
      { id: 'candado', estado: 'arreglado' },
      { id: 'marcas', estado: 'arreglado' },
    ]);
    expect(bitacora).toEqual([
      expect.stringContaining('revisión «en marcha» sin su proceso'),
      expect.stringContaining('candado viejo'),
      expect.stringContaining('marcas de pasos'),
    ]);
    expect(leerArreglos(dir, Date.parse('2026-11-09T21:00:00Z')).map((a) => a.tipo)).toEqual(['revision', 'candado', 'marcas']);
  });

  it('lo que no puede arreglar queda como problema; un arreglo que falla también, con su error', async () => {
    const sondas: Sonda[] = [
      { id: 'disco', mirar: async () => ({ problema: { id: 'disco', dato: '1.2' } }) },
      { id: 'candado', mirar: async () => ({ arreglo: { tipo: 'candado', hacer: async () => { throw new Error('EPERM'); } } }) },
      { id: 'rama', mirar: async () => { throw new Error('git no respondió'); } },
    ];
    const e = await chequearSalud(sondas, dir, async () => undefined);
    expect(e.problemas).toEqual([{ id: 'disco', dato: '1.2' }, { id: 'candado', dato: expect.stringContaining('EPERM') }]);
    // la sonda que no pudo mirar no se muestra: ni un «bien» ni un problema que no se sabe
    expect(e.chequeos.map((c) => c.id)).toEqual(['disco', 'candado']);
    expect(e.arreglos).toEqual([]);
  });

  it('guarda y muestra solo los arreglos de los últimos 7 días, el más nuevo primero (nmw9p8305tit)', () => {
    const ahora = Date.parse('2026-11-09T20:00:00Z');
    anotarArreglos(dir, [{ cuando: '2026-11-01T10:00:00Z', tipo: 'candado' }, { cuando: '2026-11-05T10:00:00Z', tipo: 'revision' }], ahora);
    anotarArreglos(dir, [{ cuando: '2026-11-09T10:00:00Z', tipo: 'marcas', dato: 'm1' }], ahora);
    expect(leerArreglos(dir, ahora)).toEqual([
      { cuando: '2026-11-09T10:00:00Z', tipo: 'marcas', dato: 'm1' },
      { cuando: '2026-11-05T10:00:00Z', tipo: 'revision' },
    ]);
    expect(arreglosRecientes([{ cuando: '2026-11-02T19:59:00Z', tipo: 'candado' }], ahora)).toEqual([]);
  });

  it('un registro dañado no rompe nada', () => {
    writeFileSync(join(dir, 'salud.json'), '{ roto');
    expect(leerArreglos(dir)).toEqual([]);
  });
});
