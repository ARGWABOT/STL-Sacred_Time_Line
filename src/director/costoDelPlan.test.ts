// Lo que gasta una revisión, dicho en lo que cuesta de tu plan y no a precio de API (pedido pd_costo_plan).
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lanzamientosDelDirector } from '../../estudio/servidor/revisor';
import { enTuPlan, esPlanDeClaude, PLANES_DE_CLAUDE, precioSemanal, semanaDeCadaUno } from './costoDelPlan';

describe('lo que gasta una revisión, en lo que cuesta de tu plan', () => {
  it('el precio de una semana es el del mes por 12 y entre 52: unos 46 USD en Max 20x', () => {
    expect(precioSemanal(PLANES_DE_CLAUDE.max20.mes)).toBeCloseTo(46.15, 2);
    expect(precioSemanal(PLANES_DE_CLAUDE.pro.mes)).toBeCloseTo(4.62, 2);
    expect(esPlanDeClaude('max5')).toBe(true);
    expect(esPlanDeClaude('gratis')).toBe(false);
  });

  it('lo que subió el límite semanal en una ventana se reparte entre sus lanzamientos en proporción a su gasto', () => {
    const r = semanaDeCadaUno([
      // Misma ventana: subió 1 + 2 = 3 puntos en total, y el primero gastó la mitad que el segundo
      { id: 'a', costo: 10, semana: { desde: 40, hasta: 41, renueva: 'v1' } },
      { id: 'b', costo: 20, semana: { desde: 41, hasta: 43, renueva: 'v1' } },
      // Otra ventana, sola
      { id: 'c', costo: 5, semana: { desde: 2, hasta: 3, renueva: 'v2' } },
      // Sin lo que dijo el límite: no viene
      { id: 'd', costo: 7 },
    ]);
    expect(r.get('a')).toBeCloseTo(1);
    expect(r.get('b')).toBeCloseTo(2);
    expect(r.get('c')).toBeCloseTo(1);
    expect(r.has('d')).toBe(false);
  });

  it('se dice como parte de tu semana y su equivalente, aproximado; con una clave de API, o sin datos, nada', () => {
    expect(enTuPlan(2, 'max20')).toBe('≈ 2 % de tu semana, ≈ US$ 0,92 de tu plan, aproximado');
    expect(enTuPlan(0.04, 'pro')).toBe('≈ menos del 0,1 % de tu semana, ≈ US$ 0,00 de tu plan, aproximado');
    expect(enTuPlan(2, 'api')).toBeNull();
    expect(enTuPlan(undefined, 'max20')).toBeNull();
    expect(enTuPlan(2, null)).toBeNull();
  });

  it('el registro de cada lanzamiento dice su límite semanal al empezar y al terminar, de la misma ventana', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'stl-plan-'));
    try {
      const carpeta = join(raiz, '.revisiones');
      mkdirSync(carpeta);
      const aviso = (uso: number, resetsAt = 1_761_900_000) => JSON.stringify({ type: 'rate_limit_event', rate_limit_info: { status: 'allowed', unifiedWindows: { seven_day: { utilization: uso, resetsAt }, five_hour: { utilization: 0.1, resetsAt: 1_761_700_000 } } } });
      const resultado = JSON.stringify({ type: 'result', total_cost_usd: 3, duration_ms: 60_000, usage: {} });
      writeFileSync(join(carpeta, 'golf-2026-10-28T07-00-00-000Z.log'), [aviso(0.4), aviso(0.41), aviso(0.43), resultado].join('\n'));
      // Si la ventana se renovó en medio, no se sabe cuánto subió
      writeFileSync(join(carpeta, 'golf-2026-10-28T06-00-00-000Z.log'), [aviso(0.9, 1_761_000_000), aviso(0.01), resultado].join('\n'));
      const { consumo } = lanzamientosDelDirector(raiz, 35, Date.parse('2026-10-28T08:00:00Z'), () => false);
      expect(consumo[0].semana).toEqual({ desde: 40, hasta: 43, renueva: new Date(1_761_900_000_000).toISOString() });
      expect(consumo[1]).not.toHaveProperty('semana');
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });

  it('«Modelo y consumo» pregunta tu plan y, con él, lo gastado va en lo que cuesta de tu plan, con el precio de API al pasar el ratón', () => {
    const pagina = readFileSync(join(import.meta.dirname, '..', '..', 'estudio', 'src', 'director.ts'), 'utf8');
    expect(pagina).toContain('<select data-plan-claude>');
    expect(pagina).toContain('gastado(x.costo, deTuSemana.get(idDe(x)))');
    expect(pagina).toContain('A precio de API serían');
  });
});
