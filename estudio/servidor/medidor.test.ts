// La corrida de la medición con un Claude Code falso (un programa de node que hace de director y de quien califica): se
// prueba el lanzamiento de punta a punta sin gastar nada
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { argumentosDeCalificacion, argumentosDeVuelta, correrMedicion, correrVuelta, corridasGuardadas, detenerMedicion, empezarMedicion, estadoDeMedicion, guardarAcuerdo, idDeVuelta, midiendo } from './medidor';
import { CASOS_FIJOS } from '../../src/director/casosFijos';
import { casosMedibles, resumenDeCorrida, type Corrida, type Vuelta } from '../../src/director/corrida';

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
const conNucleo = args.indexOf('--append-system-prompt-file');
const nucleo = conNucleo < 0 ? null : readFileSync(args[conNucleo + 1], 'utf8');
writeFileSync(constancia, JSON.stringify({ args, cwd: process.cwd(), stlRaiz: process.env.STL_RAIZ ?? null, id, entrada, nucleo }));
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
    const nucleo = join(estudio, '.revisiones', 'nucleo-del-director.md');
    const args = argumentosDeVuelta({ estudio, repo, ajustes: join(estudio, 'a.json'), nucleo, modelo: 'opus', esfuerzo: 'high', casa: join(base, 'casa') });
    expect(args.slice(args.indexOf('--model'), args.indexOf('--model') + 4)).toEqual(['--model', 'opus', '--effort', 'high']);
    expect(args[args.indexOf('--permission-mode') + 1]).toBe('dontAsk');
    // Con su núcleo explícito, como en una revisión (pr_reglas_por_encargo, punto 3)
    expect(args[args.indexOf('--append-system-prompt-file') + 1]).toBe(nucleo);
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
    const lanzado = JSON.parse(readFileSync(constancia, 'utf8')) as { cwd: string; stlRaiz: string; id: string; entrada: string; nucleo: string | null };
    // Con el encargo de una revisión de verdad, en su Estudio de prueba, y sus herramientas mirando solo ese
    expect(lanzado.entrada).toContain(`Haz «revisa estudio» de ese proyecto según CLAUDE.md`);
    // …y su núcleo explícito: el CLAUDE.md del Studio de prueba, entero, con la línea que dice qué es
    expect(lanzado.nucleo?.startsWith('# CLAUDE.md, the rules of STL Studio\n')).toBe(true);
    expect(lanzado.nucleo).toContain(readFileSync(join(RAIZ, 'CLAUDE.md'), 'utf8').split(/\r?\n/)[0]);
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
    // Quien califica, como antes: sin el núcleo del director ni sus ajustes, para que su nota no cambie con el lanzador
    expect(califica.args).not.toContain('--append-system-prompt-file');
    expect(califica.args[califica.args.indexOf('--settings') + 1]).toMatch(/ajustes-de-quien-califica\.json$/);
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

  // Nota de voz del titular nmvrimph5tit: no repetir lo que no cambió
  it('con una medición guardada se elige qué medir (lo que pudo romperse, lo que fallaba o todo), con lo que cuesta y tarda; una parcial se resume con sus casos', () => {
    const otro = join(base, 'alcances');
    const carpeta = join(otro, '.estudio', 'mediciones');
    mkdirSync(carpeta, { recursive: true });
    const todos = casosMedibles();
    const [a, b] = todos;
    const n = todos.length;
    const bien = (caso: string, numero: number): Vuelta => ({ caso, numero, cerro: true, fallas: [], calificacion: { pasa: true, porque: 'Bien.' }, costo: 3, minutos: 10 });
    const mal = (caso: string, numero: number): Vuelta => ({ caso, numero, cerro: true, fallas: ['no'], costo: 3, minutos: 10 });
    const dos = (id: string, falla: boolean) => (falla ? [mal(id, 1), mal(id, 2)] : [bien(id, 1), bien(id, 2)]);
    // La de base: todos pasan menos b
    const deBase: Corrida = { cuando: '2026-10-27T10:00:00.000Z', modelo: null, esfuerzo: null, terminada: 'x', vueltas: todos.flatMap((c) => dos(c.id, c.id === b.id)) };
    writeFileSync(join(carpeta, '2026-10-27T10-00-00-000Z.json'), JSON.stringify(deBase));
    expect(estadoDeMedicion(otro, []).alcances).toEqual([
      { alcance: 'pasaban', casos: n - 1, estimado: { total: 6 * (n - 1), porVuelta: 3, de: 'corrida' }, minutos: 20 * (n - 1) },
      { alcance: 'fallaban', casos: 1, estimado: { total: 6, porVuelta: 3, de: 'corrida' }, minutos: 20 },
      { alcance: 'todos', casos: n, estimado: { total: 6 * n, porVuelta: 3, de: 'corrida' }, minutos: 20 * n },
    ]);
    // Los que fallan, para elegirlos uno por uno, con lo que cuesta y tarda cada uno (nota de voz del titular nmvsgcn7otit)
    expect(estadoDeMedicion(otro, []).fallan).toEqual([{ id: b.id, titulo: b.titulo }]);
    expect(estadoDeMedicion(otro, []).unCaso).toEqual({ estimado: { total: 6, porVuelta: 3, de: 'corrida' }, minutos: 20 });
    // Una parcial de lo que pasaba, con a roto: su resumen cuenta solo sus casos, con cómo estaba cada uno
    const pasaban = todos.filter((c) => c.id !== b.id);
    const parcial: Corrida = { cuando: '2026-10-28T10:00:00.000Z', modelo: null, esfuerzo: null, terminada: 'y', alcance: 'pasaban', casos: pasaban.map((c) => c.id), vueltas: pasaban.flatMap((c) => dos(c.id, c.id === a.id)) };
    writeFileSync(join(carpeta, '2026-10-28T10-00-00-000Z.json'), JSON.stringify(parcial));
    const e = estadoDeMedicion(otro, []);
    expect(e.ultima).toMatchObject({ alcance: 'pasaban', pasan: n - 2, fallan: 1 });
    expect(e.ultima!.porCaso).toHaveLength(n - 1);
    expect(e.ultima!.porCaso.find((c) => c.id === a.id)).toMatchObject({ veredicto: 'falla', antes: 'pasa' });
    // Ahora fallan dos: el roto y el que ya fallaba, que la parcial no midió
    expect(e.alcances.find((x) => x.alcance === 'fallaban')?.casos).toBe(2);
    expect(e.fallan.map((c) => c.id).sort()).toEqual([a.id, b.id].sort());
  });

  it('sin ninguna medición no hay qué elegir; con ella, lo que ya pasa no se vuelve a correr: se eligen uno por uno los que fallan, o todos, y lo que avanza se ve sin salir (notas de voz del titular nmvsgcn7otit y nmvs9on6ktit)', () => {
    expect(estadoDeMedicion(join(base, 'sin-ninguna'), []).fallan).toEqual([]);
    const vista = readFileSync(join(RAIZ, 'estudio', 'src', 'director.ts'), 'utf8');
    // El diálogo: una casilla por cada caso que falla y una para todos, sin «Lo que el último cambio pudo romper»
    expect(vista).toContain("campos: elegir ? [{ id: 'casos', etiqueta: 'Qué casos medir', tipo: 'casillas', opciones, requerido: true }] : []");
    expect(vista).toContain("...(m?.fallan ?? []).map((c): [string, string] => [c.id,");
    expect(vista).not.toContain("NOMBRE = { pasaban: 'Lo que el último cambio pudo romper'");
    // Lo que avanza la medición entra en lo que la sincronización compara: se repinta sin salir de la página
    expect(vista).toMatch(/const huella = \(x: Datos\) => JSON\.stringify\(\[[^\]]*x\.medicion\]\)/);
    // El servidor mide los elegidos, solo si son casos medibles, y ninguno no vale
    const servidor = readFileSync(join(RAIZ, 'estudio', 'servidor', 'director.ts'), 'utf8');
    expect(servidor).toContain('const elegidos = Array.isArray(cuerpo.casos) ? casosMedibles().filter((c) => (cuerpo.casos as unknown[]).includes(c.id)) : null;');
    expect(servidor).toContain("if (elegidos && !elegidos.length) return responder(res, 400, { error: 'Elige al menos un caso que medir.' });");
  });

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
