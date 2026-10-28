import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { anotar, BITACORA, desdeDeAccion, EL_STUDIO, eventoDeAccion, leerBitacora, MAX_CAMPO } from './bitacora';

const base = mkdtempSync(join(tmpdir(), 'estudio-bitacora-'));
afterAll(() => rmSync(base, { recursive: true, force: true }));
let n = 0;
/** Una carpeta del Studio de mentira, vacía. */
const studio = () => mkdtempSync(join(base, `s${++n}-`));
const evento = (i: number) => ({ quien: 'Ana', que: `hace la cosa ${i}`, desde: 'un botón', proyecto: 'stl', cuando: `2026-10-23T10:00:0${i}.000Z` });

describe('la bitácora de este computador (nota de voz del titular, 23 de octubre de 2026)', () => {
  it('anotar escribe una línea JSON por acción en .estudio/bitacora.jsonl, y leerla da la más nueva primero', async () => {
    const raiz = studio();
    for (const i of [1, 2, 3]) await anotar(raiz, evento(i));
    const lineas = readFileSync(join(raiz, BITACORA), 'utf8').trim().split('\n');
    expect(lineas).toHaveLength(3);
    expect(JSON.parse(lineas[0])).toEqual({ cuando: '2026-10-23T10:00:01.000Z', quien: 'Ana', que: 'hace la cosa 1', desde: 'un botón', proyecto: 'stl' });
    expect((await leerBitacora(raiz)).map((e) => e.que)).toEqual(['hace la cosa 3', 'hace la cosa 2', 'hace la cosa 1']);
  });

  it('sin la hora, pone la de ahora; sin proyecto, no escribe la clave', async () => {
    const raiz = studio();
    const antes = Date.now();
    await anotar(raiz, { quien: EL_STUDIO, que: 'lanza al director', desde: 'el lanzador del director' });
    const [e] = await leerBitacora(raiz);
    expect(Date.parse(e.cuando)).toBeGreaterThanOrEqual(antes - 1000);
    expect('proyecto' in e).toBe(false);
  });

  it('una línea dañada (a medio escribir, o sin qué ni cuándo) se salta y no tumba la lista', async () => {
    const raiz = studio();
    await anotar(raiz, evento(1));
    appendFileSync(join(raiz, BITACORA), '{"cuando":"2026-10-23T10:00:02.000Z","quien":"An\n');
    appendFileSync(join(raiz, BITACORA), '{"quien":"Ana","desde":"x"}\n');
    appendFileSync(join(raiz, BITACORA), 'null\n');
    await anotar(raiz, evento(3));
    expect((await leerBitacora(raiz)).map((e) => e.que)).toEqual(['hace la cosa 3', 'hace la cosa 1']);
  });

  it('respeta el máximo: solo las más nuevas', async () => {
    const raiz = studio();
    for (const i of [1, 2, 3, 4, 5]) await anotar(raiz, evento(i));
    expect((await leerBitacora(raiz, 2)).map((e) => e.que)).toEqual(['hace la cosa 5', 'hace la cosa 4']);
    expect(await leerBitacora(raiz, 50)).toHaveLength(5);
  });

  it('sin archivo, la lista está vacía', async () => {
    expect(await leerBitacora(studio())).toEqual([]);
  });

  it('anotar nunca detiene la acción: sin dónde escribir, sigue sin error', async () => {
    const raiz = studio();
    // .estudio es un archivo: no se puede crear la carpeta ni escribir dentro
    writeFileSync(join(raiz, '.estudio'), 'no soy una carpeta');
    await expect(anotar(raiz, evento(1))).resolves.toBeUndefined();
    expect(await leerBitacora(raiz)).toEqual([]);
  });

  it('cada campo queda en una línea y acotado: el texto entero vive en la memoria del proyecto', async () => {
    const raiz = studio();
    await anotar(raiz, { quien: 'Ana', que: `firma el objetivo: ${'a'.repeat(MAX_CAMPO * 2)}`, desde: 'la meta\nen dos líneas', proyecto: 'stl' });
    const [e] = await leerBitacora(raiz);
    expect(e.que).toHaveLength(MAX_CAMPO);
    expect(e.que.endsWith('…')).toBe(true);
    expect(e.desde).toBe('la meta en dos líneas');
    expect(readFileSync(join(raiz, BITACORA), 'utf8').trim().split('\n')).toHaveLength(1);
  });
});

describe('desde dónde vino cada acción de la página', () => {
  it('una nota dice sobre qué es: su tipo, su id y su parte', () => {
    expect(desdeDeAccion({ tipo: 'comentar', sobre: { tipo: 'mision', id: 't_x', seccion: 'Paso 2' } })).toBe('nota sobre misión t_x › Paso 2');
    expect(desdeDeAccion({ tipo: 'comentar', sobre: { tipo: 'general' } })).toBe('nota general');
    expect(desdeDeAccion({ tipo: 'comentar' })).toBe('nota general');
    expect(desdeDeAccion({ tipo: 'comentar', sobre: { tipo: 'general' }, urgente: true, audio: 'data:audio/webm;base64,AAAA', adjuntos: [{}, {}] })).toBe('nota general (urgente, con audio, con 2 adjuntos)');
  });

  it('y lo que la distingue: «Hazlo tú», una opción, «No lo entiendo», una decisión, una pregunta', () => {
    expect(desdeDeAccion({ tipo: 'comentar', sobre: { tipo: 'mision', id: 't_x', seccion: 'Paso 3', hazlo: true } })).toBe('«Hazlo tú» sobre misión t_x › Paso 3');
    expect(desdeDeAccion({ tipo: 'comentar', sobre: { tipo: 'mision', id: 't_x', seccion: 'Paso 1', eleccion: 'Sí' } })).toBe('opción «Sí» sobre misión t_x › Paso 1');
    expect(desdeDeAccion({ tipo: 'comentar', sobre: { tipo: 'mision', id: 't_x', seccion: 'Paso 1', aclarar: true } })).toBe('«No lo entiendo» sobre misión t_x › Paso 1');
    expect(desdeDeAccion({ tipo: 'comentar', sobre: { tipo: 'documento', id: 'docs/director/ruta.md', seccion: '2. El alcance', decision: 'Las fases', postura: 'aprueba' } }))
      .toBe('«Apruebo lo que recomiendas» sobre documento docs/director/ruta.md › 2. El alcance › decisión «Las fases»');
    expect(desdeDeAccion({ tipo: 'comentar', sobre: { tipo: 'pregunta' }, urgente: true })).toBe('pregunta al director');
    expect(desdeDeAccion({ tipo: 'comentar', sobre: { tipo: 'pregunta', id: 'n1' } })).toBe('pregunta que sigue una conversación n1');
  });

  it('las demás acciones nombran lo que tocan', () => {
    expect(desdeDeAccion({ tipo: 'entregar', mision: 't_x' })).toBe('misión t_x');
    expect(desdeDeAccion({ tipo: 'paso', mision: 't_x', hechos: [0] })).toBe('misión t_x › sus pasos');
    expect(desdeDeAccion({ tipo: 'leido', doc: 'docs/director/ruta.md' })).toBe('documento docs/director/ruta.md');
    expect(desdeDeAccion({ tipo: 'responder', propuesta: 'p_1', estado: 'aceptada' })).toBe('propuesta p_1');
    expect(desdeDeAccion({ tipo: 'cerrar', fase: 'mvp' })).toBe('la puerta de la fase mvp');
    expect(desdeDeAccion({ tipo: 'objetivo' })).toBe('«Proyecto» › La meta');
    expect(desdeDeAccion({ tipo: 'algo_nuevo' })).toBe('la acción algo_nuevo');
  });

  it('lo que la página hace sola firma el Studio, en nombre de la persona y con su porqué', () => {
    expect(eventoDeAccion({ tipo: 'paso', mision: 't_x' }, 'Ana', 'marca 2 de 3 pasos de «X»', 'stl'))
      .toEqual({ quien: 'Ana', que: 'marca 2 de 3 pasos de «X»', desde: 'misión t_x › sus pasos', proyecto: 'stl' });
    const solo = eventoDeAccion({ tipo: 'entregar', mision: 't_x', automatico: 'ultimo_paso' }, 'Ana', 'entrega la misión «X»', 'stl');
    expect(solo.quien).toBe(EL_STUDIO);
    expect(solo.que).toBe('entrega la misión «X», en nombre de Ana');
    expect(solo.desde).toBe('misión t_x (al marcarse el último paso, la misión se entregó sola)');
    // Una clave que no es de la lista (ni una del prototipo) no la vuelve automática
    for (const automatico of ['constructor', 'toString', 'inventada', 3])
      expect(eventoDeAccion({ tipo: 'paso', mision: 't_x', automatico }, 'Ana', 'marca', 'stl').quien).toBe('Ana');
  });
});
