// Lo que consume una revisión de tu plan: solo uso, nunca dinero (regla del titular, nota nmvx46phftit).
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { consumoDeRevisiones } from '../../estudio/servidor/revisor';
import { enTuPlan, esPlanDeClaude, PLANES_DE_CLAUDE, semanaDeCadaUno, tokensDelResultado } from './consumoDelPlan';

const RAIZ = join(import.meta.dirname, '..', '..');

describe('lo que consume una revisión de tu plan', () => {
  it('los planes son los de una cuenta: sin precio y sin clave de API', () => {
    expect(Object.keys(PLANES_DE_CLAUDE)).toEqual(['pro', 'max5', 'max20']);
    expect(esPlanDeClaude('max5')).toBe(true);
    expect(esPlanDeClaude('api')).toBe(false);
    expect(esPlanDeClaude('gratis')).toBe(false);
    for (const p of Object.values(PLANES_DE_CLAUDE)) expect(Object.keys(p)).toEqual(['nombre']);
  });

  it('los tokens de un resultado: los de todos los modelos o, sin ellos, los del director', () => {
    expect(tokensDelResultado({ modelUsage: { a: { inputTokens: 1, cacheCreationInputTokens: 2, cacheReadInputTokens: 3, outputTokens: 4 }, b: { outputTokens: 10 } }, usage: { input_tokens: 999 } })).toBe(20);
    expect(tokensDelResultado({ usage: { input_tokens: 1, cache_creation_input_tokens: 2, cache_read_input_tokens: 3, output_tokens: 4 } })).toBe(10);
    expect(tokensDelResultado(null)).toBe(0);
  });

  it('lo que subió el límite semanal en una ventana se reparte entre sus lanzamientos en proporción a sus tokens', () => {
    const r = semanaDeCadaUno([
      // Misma ventana: subió 1 + 2 = 3 puntos en total, y el primero gastó la mitad de tokens que el segundo
      { id: 'a', tokens: 10, semana: { desde: 40, hasta: 41, renueva: 'v1' } },
      { id: 'b', tokens: 20, semana: { desde: 41, hasta: 43, renueva: 'v1' } },
      // Otra ventana, sola
      { id: 'c', tokens: 5, semana: { desde: 2, hasta: 3, renueva: 'v2' } },
      // Sin lo que dijo el límite: no viene
      { id: 'd', tokens: 7 },
    ]);
    expect(r.get('a')).toBeCloseTo(1);
    expect(r.get('b')).toBeCloseTo(2);
    expect(r.get('c')).toBeCloseTo(1);
    expect(r.has('d')).toBe(false);
  });

  it('se dice como parte de tu semana, aproximado, sin dinero; sin datos, nada', () => {
    expect(enTuPlan(2)).toBe('≈ 2 % de tu semana, aproximado');
    expect(enTuPlan(0.04)).toBe('≈ menos del 0,1 % de tu semana, aproximado');
    expect(enTuPlan(undefined)).toBeNull();
  });

  it('el registro de cada lanzamiento dice su límite semanal al empezar y al terminar, de la misma ventana', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'stl-plan-'));
    try {
      const carpeta = join(raiz, '.revisiones');
      mkdirSync(carpeta);
      const aviso = (uso: number, resetsAt = 1_761_900_000) => JSON.stringify({ type: 'rate_limit_event', rate_limit_info: { status: 'allowed', unifiedWindows: { seven_day: { utilization: uso, resetsAt }, five_hour: { utilization: 0.1, resetsAt: 1_761_700_000 } } } });
      const resultado = JSON.stringify({ type: 'result', duration_ms: 60_000, usage: {} });
      writeFileSync(join(carpeta, 'golf-2026-10-28T07-00-00-000Z.log'), [aviso(0.4), aviso(0.41), aviso(0.43), resultado].join('\n'));
      // Si la ventana se renovó en medio, no se sabe cuánto subió
      writeFileSync(join(carpeta, 'golf-2026-10-28T06-00-00-000Z.log'), [aviso(0.9, 1_761_000_000), aviso(0.01), resultado].join('\n'));
      const consumo = consumoDeRevisiones(raiz, 35, Date.parse('2026-10-28T08:00:00Z'));
      expect(consumo[0].semana).toEqual({ desde: 40, hasta: 43, renueva: new Date(1_761_900_000_000).toISOString() });
      expect(consumo[1]).not.toHaveProperty('semana');
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });
});

describe('sin dinero: la guardia de la regla del titular (nota nmvx46phftit)', () => {
  // El Studio y sus proyectos corren sobre la cuenta de la persona, con Claude Code, nunca con una clave de API: ninguna
  // cifra de dinero ni comparación con precios de API, ni para la persona ni en lo que lee el modelo. Fuera quedan solo
  // docs/difusion (lo que se investigó de otros productos) y los documentos del director, que están en la memoria
  const CARPETAS = ['src', 'estudio', 'tools', 'plantilla', 'docs/metodo'];
  const RAICES = ['README.md', 'README.es.md', 'INSTALL.md', 'INSTALAR.md', 'CLAUDE.md', 'AGENTS.md', 'CONTRIBUTING.md', 'CONTRIBUTING.es.md', 'index.html'];
  const DINERO = /US\$|\bUSD\b|costUSD|total_cost_usd|d[oó]lar(es)?\b|\bdollars?\b|\beuros?\b|precios? de (la )?API|\bAPI prices?\b|precio de lista|\bo una clave de API\b|paga por uso/i;
  const ESTA_GUARDIA = /director[\\/]consumoDelPlan\.test\.ts$/;
  const archivos = (carpeta: string): string[] => readdirSync(carpeta).flatMap((n) => {
    const ruta = join(carpeta, n);
    if (n === 'node_modules') return [];
    return statSync(ruta).isDirectory() ? archivos(ruta) : /\.(ts|md|html|json|py|sh|css|mjs)$/.test(n) ? [ruta] : [];
  });

  it('nada del producto muestra dinero ni lo lee de Claude Code', () => {
    const hallados: string[] = [];
    for (const ruta of [...CARPETAS.flatMap((c) => archivos(join(RAIZ, c))), ...RAICES.map((r) => join(RAIZ, r))]) {
      if (ESTA_GUARDIA.test(ruta)) continue;
      readFileSync(ruta, 'utf8').split('\n').forEach((linea, i) => {
        if (DINERO.test(linea)) hallados.push(`${relative(RAIZ, ruta)}:${i + 1}: ${linea.trim().slice(0, 120)}`);
      });
    }
    expect(hallados).toEqual([]);
  });

  it('la guardia detecta lo que debe', () => {
    for (const x of ['US$ 11', '134.52 USD at API price', 'a precio de API', 'r.total_cost_usd', 'costUSD', 'unos 5 dólares', 'una clave de API, que paga por uso']) expect(x, x).toMatch(DINERO);
    for (const x of ['An action that costs money', 'lo que cuesta dinero o borra datos', 'tokens estimados', 'invalid api key', 'nunca con una clave de API']) expect(x, x).not.toMatch(DINERO);
    expect('Pro, Max 5x, Max 20x o una clave de API').toMatch(DINERO);
  });
});
