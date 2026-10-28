// Los límites de uso de tu plan antes de lanzar al director (pr_procesos_vista, punto 4): el aviso al pedir la revisión
// cerca del límite de cada cinco horas, y no lanzar a fallar con la ventana agotada.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ventanaAgotadaDe } from '../../estudio/servidor/revisor';
import { MAX_MIN_REVISION } from './director';
import { limiteCasiLleno, tiempoDeRevision, UMBRAL_LIMITE, ventanaAgotada } from './limites';

const AHORA = Date.parse('2026-10-28T08:00:00.000Z');
const en = (min: number) => new Date(AHORA + min * 60_000).toISOString();
const aviso = (status: string, resetsAt?: number) => JSON.stringify({ type: 'rate_limit_event', rate_limit_info: { status, ...(resetsAt ? { resetsAt } : {}) } });

describe('mientras el director trabaja, lo que lleva y lo que le queda de su límite (pr_procesos_vista, punto 3)', () => {
  it('cuenta desde que se lanzó, con el límite que estimó el director o el de siempre, y nunca queda en negativo', () => {
    expect(tiempoDeRevision({ lanzada: en(-25), limite: 180 }, AHORA)).toEqual({ lleva: 25, limite: 180, queda: 155 });
    expect(tiempoDeRevision({ lanzada: en(-25) }, AHORA)).toEqual({ lleva: 25, limite: MAX_MIN_REVISION, queda: MAX_MIN_REVISION - 25 });
    expect(tiempoDeRevision({ lanzada: en(-200), limite: 180 }, AHORA)).toEqual({ lleva: 200, limite: 180, queda: 0 });
    expect(tiempoDeRevision({ lanzada: en(0.5) }, AHORA)?.lleva).toBe(0);
    // Sin lanzar, o sin una fecha que se entienda, nada
    expect(tiempoDeRevision({}, AHORA)).toBeNull();
    expect(tiempoDeRevision(null, AHORA)).toBeNull();
    expect(tiempoDeRevision({ lanzada: 'ayer' }, AHORA)).toBeNull();
  });

  it('la cabecera lo dice mientras el director revisa', () => {
    const vista = readFileSync(join(import.meta.dirname, '..', '..', 'estudio', 'src', 'director.ts'), 'utf8');
    expect(vista).toContain('const tiempo = tiempoDeRevision(r);');
    expect(vista).toContain('lleva ${t.lleva} min de ${t.limite}');
  });
});

describe('los límites de uso de tu plan, antes de lanzar al director', () => {
  it('avisa al pedir la revisión desde el 90 % del límite de cada cinco horas, si aún no se renovó', () => {
    expect(UMBRAL_LIMITE).toBe(90);
    expect(limiteCasiLleno({ uso: 92.5, renueva: en(40) }, AHORA)).toEqual({ uso: 92.5, renueva: en(40) });
    expect(limiteCasiLleno({ uso: 89.9, renueva: en(40) }, AHORA)).toBeNull();
    // Ya se renovó, o no se sabe cuándo: nada que avisar
    expect(limiteCasiLleno({ uso: 99, renueva: en(-1) }, AHORA)).toBeNull();
    expect(limiteCasiLleno({ uso: 99, renueva: null }, AHORA)).toBeNull();
    expect(limiteCasiLleno(null, AHORA)).toBeNull();
  });

  it('la ventana está agotada si el último aviso de límites la rechazó y no se ha renovado; sin su hora, no detiene nada', () => {
    const resets = (AHORA + 30 * 60_000) / 1000;
    expect(ventanaAgotada([aviso('allowed'), aviso('rejected', resets)].join('\n'), AHORA)).toEqual({ renueva: en(30) });
    expect(ventanaAgotada([aviso('rejected', resets), aviso('allowed')].join('\n'), AHORA)).toBeNull();
    expect(ventanaAgotada(aviso('rejected', resets), AHORA + 31 * 60_000)).toBeNull();
    expect(ventanaAgotada(aviso('rejected'), AHORA)).toBeNull();
    expect(ventanaAgotada('no es json\n', AHORA)).toBeNull();
  });

  it('se mira en el último lanzamiento de este computador, de cualquier proyecto, porque el límite es de la cuenta', () => {
    const carpeta = mkdtempSync(join(tmpdir(), 'stl-limites-'));
    try {
      mkdirSync(carpeta, { recursive: true });
      const resets = (AHORA + 30 * 60_000) / 1000;
      writeFileSync(join(carpeta, 'golf-2026-10-28T07-00-00-000Z.log'), aviso('allowed'));
      writeFileSync(join(carpeta, 'otro-urgencia-2026-10-28T07-30-00-000Z.log'), aviso('rejected', resets));
      writeFileSync(join(carpeta, 'lanzando.json'), '{}');
      expect(ventanaAgotadaDe(carpeta, AHORA)).toEqual({ renueva: en(30) });
      writeFileSync(join(carpeta, 'golf-2026-10-28T07-45-00-000Z.log'), aviso('allowed'));
      expect(ventanaAgotadaDe(carpeta, AHORA)).toBeNull();
      expect(ventanaAgotadaDe(join(carpeta, 'no-existe'), AHORA)).toBeNull();
    } finally {
      rmSync(carpeta, { recursive: true, force: true });
    }
  });

  it('el lanzador no lanza a fallar con la ventana agotada, y al pedir la revisión cerca del límite se pregunta antes', () => {
    const raiz = join(import.meta.dirname, '..', '..');
    const revisor = readFileSync(join(raiz, 'estudio/servidor/revisor.ts'), 'utf8');
    const lanzar = revisor.slice(revisor.indexOf('private async lanzar('));
    expect(lanzar.indexOf('ventanaAgotadaDe(carpeta)')).toBeGreaterThan(0);
    expect(lanzar.indexOf('ventanaAgotadaDe(carpeta)')).toBeLessThan(lanzar.indexOf('openSync(archivo'));
    const pagina = readFileSync(join(raiz, 'estudio/src/director.ts'), 'utf8');
    const pedirla = pagina.slice(pagina.indexOf('async function pedirLaRevision('));
    expect(pedirla.slice(0, 1200)).toContain('if (pedir && !(await seguirCercaDelLimite())) return false;');
    expect(pagina).toContain("boton: 'Pedirla de todos modos',\n    cancelar: 'Esperar',");
  });
});
