import { describe, expect, it } from 'vitest';
import { CASOS_FIJOS } from './casosFijos.ts';
import { casosMedibles, costoEstimado, discrepancias, encargoDeCalificacion, leerCalificacion, lineasDeMedicion, loQueDejo, notaDeQuienCalifica, pasaLaVuelta, resumenDeCorrida, veredictoDelCaso, vueltasQueFaltan, type Corrida, type Vuelta } from './corrida.ts';
import type { Plan } from './director.ts';
import { SITUACIONES } from './medicion.ts';

const caso = (id: string) => CASOS_FIJOS.find((c) => c.id === id)!;
const SIN_PAUTA = caso('c_peticion_sin_pedido');
const CON_PAUTA = caso('c_orden_aleatorio');
const bien = (id: string, numero: number, extra: Partial<Vuelta> = {}): Vuelta => ({ caso: id, numero, cerro: true, fallas: [], ...extra });
const mal = (id: string, numero: number): Vuelta => ({ caso: id, numero, cerro: true, fallas: ['no dejó su pedido'] });

describe('la corrida de la medición del núcleo', () => {
  it('se miden los casos que tienen su situación, en el orden de la lista', () => {
    const ids = casosMedibles().map((c) => c.id);
    expect(ids).toEqual(CASOS_FIJOS.map((c) => c.id).filter((id) => SITUACIONES[id]));
    expect(ids.length).toBeGreaterThanOrEqual(8);
  });

  it('una vuelta pasa si cerró, sin fallas del código y, con pauta, aprobada por quien califica', () => {
    expect(pasaLaVuelta(bien('x', 1), SIN_PAUTA)).toBe(true);
    expect(pasaLaVuelta(bien('x', 1, { cerro: false }), SIN_PAUTA)).toBe(false);
    expect(pasaLaVuelta(mal('x', 1), SIN_PAUTA)).toBe(false);
    expect(pasaLaVuelta(bien('x', 1), CON_PAUTA)).toBe(false);
    expect(pasaLaVuelta(bien('x', 1, { calificacion: { pasa: true, porque: 'Cada misión va después de lo que necesita.' } }), CON_PAUTA)).toBe(true);
    expect(pasaLaVuelta(bien('x', 1, { calificacion: null }), CON_PAUTA)).toBe(false);
  });

  it('dos vueltas por caso; la tercera solo en el que salió distinto, y el veredicto es el de la mayoría', () => {
    const id = SIN_PAUTA.id;
    expect(vueltasQueFaltan([SIN_PAUTA], [])).toEqual([{ caso: id, numero: 1 }, { caso: id, numero: 2 }]);
    expect(veredictoDelCaso(SIN_PAUTA, [bien(id, 1)])).toBe('pendiente');
    // Iguales: sin tercera
    expect(vueltasQueFaltan([SIN_PAUTA], [bien(id, 1), bien(id, 2)])).toEqual([]);
    expect(veredictoDelCaso(SIN_PAUTA, [bien(id, 1), bien(id, 2)])).toBe('pasa');
    expect(veredictoDelCaso(SIN_PAUTA, [mal(id, 1), mal(id, 2)])).toBe('falla');
    // Distintas: la tercera desempata
    expect(vueltasQueFaltan([SIN_PAUTA], [bien(id, 1), mal(id, 2)])).toEqual([{ caso: id, numero: 3 }]);
    expect(veredictoDelCaso(SIN_PAUTA, [bien(id, 1), mal(id, 2)])).toBe('pendiente');
    expect(veredictoDelCaso(SIN_PAUTA, [bien(id, 1), mal(id, 2), mal(id, 3)])).toBe('falla');
    expect(veredictoDelCaso(SIN_PAUTA, [mal(id, 1), bien(id, 2), bien(id, 3)])).toBe('pasa');
    expect(vueltasQueFaltan([SIN_PAUTA], [bien(id, 1), mal(id, 2), bien(id, 3)])).toEqual([]);
  });

  it('el resumen cuenta los casos, lo gastado y el porqué de lo que falló', () => {
    const c: Corrida = { cuando: '2026-10-27T19:00:00.000Z', modelo: 'opus', esfuerzo: 'high', vueltas: [bien(SIN_PAUTA.id, 1, { costo: 0.5 }), mal(SIN_PAUTA.id, 2), bien(CON_PAUTA.id, 1, { calificacion: { pasa: false, porque: 'La prueba llega antes.' }, costo: 0.25 }), bien(CON_PAUTA.id, 2, { calificacion: { pasa: false, porque: 'La prueba llega antes.' } })] };
    const r = resumenDeCorrida(c, [SIN_PAUTA, CON_PAUTA]);
    expect(r).toMatchObject({ pasan: 0, fallan: 1, pendientes: 1, costo: 0.75 });
    expect(r.porCaso[0]).toMatchObject({ id: SIN_PAUTA.id, veredicto: 'pendiente', vueltas: 2, porque: ['no dejó su pedido'] });
    expect(r.porCaso[1]).toMatchObject({ id: CON_PAUTA.id, veredicto: 'falla', porque: ['La prueba llega antes.'] });
  });

  it('el costo antes de pedirla: por lo que costó cada vuelta de la última o, sin ella, por la mediana de las revisiones', () => {
    const ultima: Corrida = { cuando: '', modelo: null, esfuerzo: null, vueltas: [bien('a', 1, { costo: 0.4 }), bien('a', 2, { costo: 0.6 }), bien('b', 1, { costo: null })] };
    expect(costoEstimado(8, ultima, [3, 9])).toEqual({ total: 8, porVuelta: 0.5, de: 'corrida' });
    expect(costoEstimado(8, null, [9, 1, 3])).toEqual({ total: 48, porVuelta: 3, de: 'revisiones' });
    expect(costoEstimado(8, null, [])).toBeNull();
    // Sin una corrida, con su piso: lo que cuesta un encargo corto del director
    expect(costoEstimado(8, null, [9, 1, 3], [0.5, 0.25])).toEqual({ total: 48, porVuelta: 3, de: 'revisiones', desde: 4 });
    expect(costoEstimado(8, ultima, [3, 9], [0.25])).toEqual({ total: 8, porVuelta: 0.5, de: 'corrida' });
  });

  it('quien califica recibe la pauta, las notas y lo que dejó el director, sin el modelo, y responde una línea de JSON', () => {
    const antes = { fases: [{ id: 'mvp', nombre: 'MVP', puerta: { prueba: 'El cliente lo usa.' }, misiones: ['Probar con el cliente.'] }], propuestas: [{ id: 'pr_x', titulo: 'Excel', fase: 'mvp' }], misiones: [{ id: 't_a', para: 'titular', fase: 'mvp', titulo: 'A', porQue: '', pasos: [] }], respuestas: {}, colaDirector: [] } as unknown as Plan;
    const despues = structuredClone(antes);
    despues.misiones.push({ id: 't_b', para: 'titular', fase: 'mvp', frente: 'direccion', titulo: 'Prueba el Excel', porQue: 'Lo pediste.', pasos: ['Prueba.'], entrega: '', xp: 10, despuesDe: ['pr_x'] });
    despues.respuestas = { n_1: { cuando: '', texto: 'La hago yo.', tratamiento: 'integrada' } };
    const dejo = loQueDejo(despues, antes) as { after: { missions: { id: string; after?: string[] }[]; replies: object; removedMissions: string[] } };
    expect(dejo.after.missions.map((m) => m.id)).toEqual(['t_b']);
    expect(dejo.after.missions[0].after).toEqual(['pr_x']);
    expect(Object.keys(dejo.after.replies)).toEqual(['n_1']);
    expect(dejo.after.removedMissions).toEqual([]);
    const encargo = encargoDeCalificacion(CON_PAUTA, [{ id: 'n_1', texto: 'Quiero probarlo.', sobre: { tipo: 'general' } }], dejo);
    expect(encargo).toContain(CON_PAUTA.pauta!);
    expect(encargo).toContain('Quiero probarlo.');
    expect(encargo).toContain('"t_b"');
    expect(encargo).not.toMatch(/\b(opus|sonnet|haiku|claude-)/i);
  });

  it('la nota de quien califica en un caso es la de la mayoría de sus vueltas, y dos corridas sin acuerdo de la persona dicen que su pauta se revisa', () => {
    const id = CON_PAUTA.id;
    const nota = (pasa: boolean, porque: string) => ({ calificacion: { pasa, porque } });
    const c: Corrida = { cuando: 'a', modelo: null, esfuerzo: null, vueltas: [bien(id, 1, nota(true, 'Espera la exportación.')), bien(id, 2, nota(false, 'Llega antes.')), bien(id, 3, nota(true, 'Espera la exportación.'))] };
    expect(notaDeQuienCalifica(c, id)).toEqual({ pasa: true, porque: ['Espera la exportación.', 'Llega antes.'] });
    expect(notaDeQuienCalifica(c, SIN_PAUTA.id)).toBeNull();
    const sin = (cuando: string, de: boolean): Corrida => ({ ...c, cuando, acuerdos: { [id]: { de, cuando, quien: 'Laura' } } });
    expect(discrepancias([sin('a', false)])).toEqual([]);
    expect(discrepancias([sin('a', false), sin('b', true)])).toEqual([]);
    expect(discrepancias([sin('a', false), sin('b', true), sin('c', false)])).toEqual([id]);
    expect(resumenDeCorrida(sin('a', false), [CON_PAUTA]).porCaso[0]).toMatchObject({ califica: { pasa: true }, acuerdo: false });
  });

  it('la bandeja dice cómo está medido el núcleo: la última corrida, lo que falló y las pautas que no miden lo que mide la persona', () => {
    expect(lineasDeMedicion([])[0]).toMatch(/Todavía no hay ninguna.*«Medir el núcleo»/);
    const id = CON_PAUTA.id;
    const c = (cuando: string, de: boolean): Corrida => ({ cuando, modelo: 'opus', esfuerzo: 'high', terminada: cuando, vueltas: [mal(SIN_PAUTA.id, 1), mal(SIN_PAUTA.id, 2), bien(id, 1, { calificacion: { pasa: true, porque: 'Bien.' } }), bien(id, 2, { calificacion: { pasa: true, porque: 'Bien.' } })], acuerdos: { [id]: { de, cuando, quien: 'Laura' } } });
    const lineas = lineasDeMedicion([c('2026-10-28T10:00:00.000Z', false), c('2026-10-27T10:00:00.000Z', false)], [SIN_PAUTA, CON_PAUTA]);
    expect(lineas[0]).toBe('- La última, 2026-10-28 10:00 UTC, con opus y esfuerzo high: 1 de 2 casos pasan, 1 fallan.');
    expect(lineas[1]).toBe(`  - Falla [${SIN_PAUTA.id}] «${SIN_PAUTA.titulo}»: no dejó su pedido`);
    expect(lineas[2]).toMatch(new RegExp(`no estuvo de acuerdo con quien califica en dos corridas en ${id}`));
  });

  it('la nota de quien califica se lee de su última línea de JSON válida', () => {
    expect(leerCalificacion('Lo revisé.\n{"pass": true, "reason": "La prueba espera la exportación."}')).toEqual({ pasa: true, porque: 'La prueba espera la exportación.' });
    expect(leerCalificacion('{"pass": false, "reason": "Primero"}\n{"pass": true, "reason": "Segundo"}')).toEqual({ pasa: true, porque: 'Segundo' });
    expect(leerCalificacion('{"pass": "sí", "reason": "x"}')).toBeNull();
    expect(leerCalificacion('{"pass": true, "reason": ""}')).toBeNull();
    expect(leerCalificacion('sin nota')).toBeNull();
  });
});
