// La corrida de la medición con un Claude Code falso (un programa de node que hace de director y de quien califica): se
// prueba el lanzamiento de punta a punta sin gastar nada
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { argumentosDeCalificacion, argumentosDeVuelta, correrMedicion, correrVuelta, corridasGuardadas, detenerMedicion, empezarMedicion, estadoDeMedicion, guardarAcuerdo, idDeVuelta, midiendo } from './medidor';
import { CASOS_FIJOS } from '../../src/director/casosFijos';
import { resumenDeCorrida, type Corrida } from '../../src/director/corrida';

const RAIZ = resolve(import.meta.dirname, '..', '..');
const base = mkdtempSync(join(tmpdir(), 'estudio-medidor-'));
afterAll(() => rmSync(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));

// El Claude Code falso: su primer argumento es dónde deja constancia de cómo lo lanzaron. Como quien califica (su
// resultado en JSON), responde una nota; como director, en «Peticiones que no llegaban al plan» hace lo correcto si se le
// pide (DIRECTOR_BIEN) y cierra con la bandeja del Studio de prueba, o no hace nada
const FALSO = join(base, 'claude-falso.mjs');
writeFileSync(FALSO, `
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
const [constancia, ...args] = process.argv.slice(2);
const entrada = readFileSync(0, 'utf8');
if (args[args.indexOf('--output-format') + 1] === 'json') {
  writeFileSync(constancia + '.califica', JSON.stringify({ args, entrada }));
  console.log(JSON.stringify({ type: 'result', result: 'Lo revisé.\\n{"pass": true, "reason": "Cada misión espera lo que necesita."}', total_cost_usd: 0.01 }));
  process.exit(0);
}
const id = /proyecto «([^»]+)»/.exec(entrada)[1];
const repo = args[args.indexOf('--add-dir') + 1];
writeFileSync(constancia, JSON.stringify({ args, cwd: process.cwd(), stlRaiz: process.env.STL_RAIZ ?? null, id, entrada }));
if (process.env.DIRECTOR_BIEN) {
  const ruta = join(repo, '.stl', 'director', 'plan.json');
  const p = JSON.parse(readFileSync(ruta, 'utf8'));
  const ahora = new Date().toISOString();
  p.pedidos = [{ id: 'pd_pdf', fase: 'arranque', texto: 'El informe del mes, en PDF.', notas: ['n_pide_pdf'] }];
  p.colaDirector = ['pd_pdf'];
  p.respuestas.n_pide_pdf = { cuando: ahora, texto: 'Queda como pedido.', tratamiento: 'integrada', destino: { vista: 'ruta', fase: 'arranque', ancla: 'pedido-pd_pdf', etiqueta: 'Ver el pedido' } };
  p.resumen = { fecha: ahora, avanzamos: ['Quedó anotado lo que pediste.'], quedamos: 'El proyecto de prueba está en su arranque.' };
  p.mensaje = { fecha: ahora.slice(0, 10), texto: '- **Sobre la prueba:** nada más.' };
  writeFileSync(ruta, JSON.stringify(p, null, 2) + '\\n');
  spawnSync(process.execPath, [join('tools', 'director', 'bandeja.ts'), '--proyecto', id, '--listo'], { cwd: process.cwd(), stdio: 'ignore' });
}
console.log(JSON.stringify({ type: 'result', total_cost_usd: 0.5, duration_ms: 1000, usage: {} }));
`);

const vuelta = (caso: string, constancia: string) =>
  correrVuelta({ raiz: RAIZ, base: join(base, 'vueltas'), caso, numero: 1, modelo: 'opus', esfuerzo: 'high', programa: process.execPath, previos: [FALSO, constancia], casa: join(base, 'casa'), minutos: 2 });

describe('la corrida de la medición, con el director de verdad', () => {
  it('cada vuelta tiene un id de proyecto válido y distinto por caso y por vuelta', () => {
    const ids = CASOS_FIJOS.flatMap((c) => [1, 2, 3].map((n) => idDeVuelta(c.id, n)));
    for (const id of ids) expect(id).toMatch(/^[a-z0-9][a-z0-9-]{0,39}$/);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('el director lee y escribe solo en el Estudio de prueba, con el modelo y el esfuerzo elegidos; quien califica, sin herramientas', () => {
    const estudio = join(base, 'x', 'estudio');
    const repo = join(base, 'x', 'repo');
    const args = argumentosDeVuelta({ estudio, repo, ajustes: join(estudio, 'a.json'), modelo: 'opus', esfuerzo: 'high', casa: join(base, 'casa') });
    expect(args.slice(args.indexOf('--model'), args.indexOf('--model') + 4)).toEqual(['--model', 'opus', '--effort', 'high']);
    expect(args[args.indexOf('--permission-mode') + 1]).toBe('dontAsk');
    const permitidas = args.slice(args.indexOf('--allowedTools') + 1);
    const real = RAIZ.replace(/\\/g, '/').toLowerCase();
    // Ninguna regla nombra el Studio real, y lo que escribe es solo el repositorio de prueba
    expect(args.some((a) => a.replace(/\\/g, '/').toLowerCase().includes(real))).toBe(false);
    const escribe = permitidas.filter((r) => r.startsWith('Edit(') || r.startsWith('Write('));
    expect(escribe).toHaveLength(1);
    expect(escribe[0].replace(/\\/g, '/').toLowerCase()).toContain(repo.replace(/\\/g, '/').toLowerCase().replace(/^[a-z]:/, ''));
    const califica = argumentosDeCalificacion('a.json');
    expect(califica).not.toContain('--allowedTools');
    expect(califica.slice(califica.indexOf('--model'), califica.indexOf('--model') + 2)).toEqual(['--model', 'sonnet']);
  });

  it('una vuelta de punta a punta: el director trabaja en su Estudio de prueba, cierra, y se mide lo que dejó; el Estudio de prueba se borra', async () => {
    const constancia = join(base, 'bien.json');
    process.env.DIRECTOR_BIEN = '1';
    try {
      const v = await vuelta('c_peticion_sin_pedido', constancia);
      expect(v).toMatchObject({ caso: 'c_peticion_sin_pedido', numero: 1, cerro: true, fallas: [], costo: 0.5 });
      expect(v).not.toHaveProperty('calificacion');
    } finally {
      delete process.env.DIRECTOR_BIEN;
    }
    const lanzado = JSON.parse(readFileSync(constancia, 'utf8')) as { cwd: string; stlRaiz: string; id: string; entrada: string };
    // Con el encargo de una revisión de verdad, en su Estudio de prueba, y sus herramientas mirando solo ese
    expect(lanzado.entrada).toContain(`Haz «revisa estudio» de ese proyecto según CLAUDE.md`);
    expect(lanzado.id).toBe(idDeVuelta('c_peticion_sin_pedido', 1));
    expect(resolve(lanzado.stlRaiz)).toBe(resolve(lanzado.cwd));
    expect(resolve(lanzado.cwd).startsWith(resolve(base))).toBe(true);
    expect(existsSync(lanzado.cwd)).toBe(false);
    expect(existsSync(join(RAIZ, 'node_modules', 'vitest', 'package.json'))).toBe(true);
  }, 120_000);

  it('un director que no hace nada no cierra ni pasa, y un caso con pauta lo califica otro modelo con lo que dejó', async () => {
    const constancia = join(base, 'nada.json');
    const v = await vuelta('c_orden_aleatorio', constancia);
    expect(v.cerro).toBe(false);
    expect(v.fallas.length).toBeGreaterThan(0);
    expect(v.calificacion).toEqual({ pasa: true, porque: 'Cada misión espera lo que necesita.' });
    expect(v.costo).toBeCloseTo(0.51);
    const califica = JSON.parse(readFileSync(`${constancia}.califica`, 'utf8')) as { args: string[]; entrada: string };
    expect(califica.args).toContain('sonnet');
    expect(califica.entrada).toContain(CASOS_FIJOS.find((c) => c.id === 'c_orden_aleatorio')!.pauta!);
    expect(califica.entrada).not.toMatch(/\bopus\b/i);
  }, 120_000);

  it('una corrida entera: dos vueltas por caso, una tras otra, guardada vuelta a vuelta y terminada; se detiene entre una y otra', async () => {
    const casos = CASOS_FIJOS.filter((c) => ['c_peticion_sin_pedido', 'c_cortes_sin_sentido'].includes(c.id));
    const carpeta = join(base, 'mediciones');
    const avances: number[] = [];
    process.env.DIRECTOR_BIEN = '1';
    let c;
    try {
      c = await correrMedicion({ raiz: RAIZ, carpeta, casos, modelo: 'opus', esfuerzo: 'high', programa: process.execPath, previos: [FALSO, join(base, 'corrida.json')], casa: join(base, 'casa'), minutos: 2, alAvanzar: (x) => avances.push(x.vueltas.length) });
    } finally {
      delete process.env.DIRECTOR_BIEN;
    }
    expect(avances).toEqual([1, 2, 3, 4]);
    expect(c.vueltas.map((v) => `${v.caso} ${v.numero}`)).toEqual(['c_peticion_sin_pedido 1', 'c_peticion_sin_pedido 2', 'c_cortes_sin_sentido 1', 'c_cortes_sin_sentido 2']);
    expect(c.terminada).toBeTruthy();
    // El director falso hace lo correcto en las peticiones, y en los cortes no escribe el documento: uno pasa y el otro no
    expect(resumenDeCorrida(c, casos)).toMatchObject({ pasan: 1, fallan: 1, pendientes: 0, costo: 2 });
    expect(corridasGuardadas(RAIZ, carpeta)).toEqual([c]);
    // Detenida antes de empezar: no corre ninguna vuelta y no se da por terminada
    const parar = new AbortController();
    parar.abort();
    const detenida = await correrMedicion({ raiz: RAIZ, carpeta, casos, modelo: null, esfuerzo: null, programa: process.execPath, previos: [FALSO, join(base, 'parada.json')], minutos: 2, senal: parar.signal });
    expect(detenida.vueltas).toEqual([]);
    expect(detenida.terminada).toBeUndefined();
    expect(corridasGuardadas(RAIZ, carpeta)).toHaveLength(2);
  }, 240_000);

  it('una sola medición a la vez, a la vista mientras corre; «Detener» la deja terminar la vuelta que corre, y lo hecho queda guardado', async () => {
    const otro = join(base, 'otro-studio');
    const carpeta = join(otro, '.estudio', 'mediciones');
    const casos = CASOS_FIJOS.filter((c) => c.id === 'c_peticion_sin_pedido');
    let fin: (c: Corrida | null) => void = () => {};
    const termino = new Promise<Corrida | null>((ok) => (fin = ok));
    const opciones = { raiz: RAIZ, carpeta, casos, modelo: null, esfuerzo: null, programa: process.execPath, previos: [FALSO, join(base, 'una.json')], minutos: 2, quien: 'Laura', alTerminar: (c: Corrida | null) => fin(c) };
    expect(empezarMedicion(opciones)).toBe(true);
    expect(midiendo()).toBe(true);
    expect(empezarMedicion(opciones)).toBe(false);
    expect(estadoDeMedicion(otro, []).enMarcha).toMatchObject({ quien: 'Laura', vueltas: 0 });
    expect(detenerMedicion()).toBe(true);
    const c = await termino;
    await new Promise((ok) => setTimeout(ok, 20));
    expect(c?.vueltas).toHaveLength(1);
    expect(c?.terminada).toBeUndefined();
    expect(midiendo()).toBe(false);
    expect(detenerMedicion()).toBe(false);
    const estado = estadoDeMedicion(otro, [2, 4]);
    expect(estado).toMatchObject({ enMarcha: null, ultima: { vueltas: 1, terminada: null } });
    // Sin una corrida terminada, lo que costaría otra sale de las revisiones
    expect(estado.estimado).toMatchObject({ porVuelta: 2, de: 'revisiones' });
  }, 120_000);

  it('el acuerdo de la persona con quien califica se guarda en su corrida, solo en un caso calificado; en dos corridas sin acuerdo, se dice', () => {
    const otro = join(base, 'acuerdos');
    const carpeta = join(otro, '.estudio', 'mediciones');
    mkdirSync(carpeta, { recursive: true });
    const caso = 'c_orden_aleatorio';
    const corrida = (cuando: string): Corrida => ({ cuando, modelo: null, esfuerzo: null, terminada: cuando, vueltas: [{ caso, numero: 1, cerro: true, fallas: [], calificacion: { pasa: true, porque: 'Espera lo que necesita.' } }] });
    for (const cuando of ['2026-10-27T10:00:00.000Z', '2026-10-28T10:00:00.000Z']) writeFileSync(join(carpeta, `${cuando.replace(/[:.]/g, '-')}.json`), JSON.stringify(corrida(cuando)));
    expect(guardarAcuerdo(otro, { corrida: '2026-10-27T10:00:00.000Z', caso: 'c_peticion_sin_pedido', de: false, quien: 'Laura' })).toBe(false);
    expect(guardarAcuerdo(otro, { corrida: '2026-10-29T10:00:00.000Z', caso, de: false, quien: 'Laura' })).toBe(false);
    expect(guardarAcuerdo(otro, { corrida: '2026-10-27T10:00:00.000Z', caso, de: false, quien: 'Laura' })).toBe(true);
    expect(estadoDeMedicion(otro, []).discrepan).toEqual([]);
    expect(guardarAcuerdo(otro, { corrida: '2026-10-28T10:00:00.000Z', caso, de: false, quien: 'Laura' })).toBe(true);
    expect(estadoDeMedicion(otro, []).discrepan).toEqual([{ id: caso, titulo: CASOS_FIJOS.find((c) => c.id === caso)!.titulo }]);
    expect(estadoDeMedicion(otro, []).ultima?.porCaso.find((c) => c.id === caso)).toMatchObject({ acuerdo: false, califica: { pasa: true } });
  });
});
