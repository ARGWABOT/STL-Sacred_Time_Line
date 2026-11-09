// Aligerar cada consulta (pd_aligerar_consulta): solo viaja lo que cambió, y la página arma lo mismo que antes.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { escribirTengo, leerTengo, mismoPorEncima, partirConsulta, unirConsulta, type MemoriaDePartes } from './partesDeConsulta';

const huella = (t: string) => createHash('sha1').update(t).digest('hex').slice(0, 12);
const cuerpo = () => ({
  activo: 'x',
  revision: { pedida: 'a' },
  plan: { respuestas: { n1: { texto: 'r' } }, misiones: [{ id: 'm1' }], fases: [{ id: 'f' }], resumen: { quedamos: 'q' } },
  estado: { notas: [{ id: 'n1' }], bitacora: [{ que: 'b' }], pasos: { m1: { hechos: [0] } } },
  transcripciones: { 'a.webm': 'hola' },
  consumo: [{ tokens: 5 }],
  conversacion: null,
});
const tengoDe = (m: MemoriaDePartes) => leerTengo(escribirTengo([...m].map(([p, v]) => [p, v.huella] as const)));
const ida = (c: ReturnType<typeof cuerpo>, m: MemoriaDePartes) => unirConsulta(JSON.parse(JSON.stringify(partirConsulta(c, tengoDe(m), huella))), m);

describe('lo que se ahorra cada consulta', () => {
  it('la primera vez viene todo, y la página arma lo mismo', () => {
    const m: MemoriaDePartes = new Map();
    expect(ida(cuerpo(), m)).toEqual(cuerpo());
    expect(m.size).toBeGreaterThan(5);
  });

  it('sin cambios, no viaja ninguna parte, y la página sigue teniendo todo', () => {
    const m: MemoriaDePartes = new Map();
    ida(cuerpo(), m);
    const respuesta = partirConsulta(cuerpo(), tengoDe(m), huella);
    expect(respuesta.partes.iguales).toContain('plan.respuestas');
    expect(respuesta.plan).toEqual({});
    expect(respuesta.estado).toEqual({});
    expect('transcripciones' in respuesta).toBe(false);
    expect('consumo' in respuesta).toBe(false);
    // Lo que no se ahorra sigue viniendo
    expect(respuesta.revision).toEqual({ pedida: 'a' });
    expect(unirConsulta(JSON.parse(JSON.stringify(respuesta)), m)).toEqual(cuerpo());
  });

  it('con un cambio, viaja solo esa parte, y lo demás es el mismo objeto de antes', () => {
    const m: MemoriaDePartes = new Map();
    const antes = ida(cuerpo(), m);
    const otro = cuerpo();
    otro.estado.notas.push({ id: 'n2' });
    const respuesta = partirConsulta(otro, tengoDe(m), huella);
    expect(respuesta.estado).toEqual({ notas: otro.estado.notas });
    expect(respuesta.plan).toEqual({});
    const despues = unirConsulta(JSON.parse(JSON.stringify(respuesta)), m);
    expect(despues).toEqual(otro);
    expect(despues.plan.respuestas).toBe(antes.plan.respuestas);
    expect(despues.transcripciones).toBe(antes.transcripciones);
    expect(despues.estado.notas).not.toBe(antes.estado.notas);
    expect(mismoPorEncima(despues.plan, antes.plan)).toBe(true);
    expect(mismoPorEncima(despues.estado, antes.estado)).toBe(false);
  });

  it('lo que cambia lo de primer nivel del plan o del estado también viaja, y no se pierde nada', () => {
    const m: MemoriaDePartes = new Map();
    ida(cuerpo(), m);
    const otro = cuerpo();
    otro.plan.resumen.quedamos = 'otra cosa';
    otro.estado.pasos.m1.hechos = [0, 1];
    const respuesta = partirConsulta(otro, tengoDe(m), huella);
    expect(respuesta.plan).toEqual({ fases: otro.plan.fases, resumen: otro.plan.resumen });
    expect(unirConsulta(JSON.parse(JSON.stringify(respuesta)), m)).toEqual(otro);
  });

  it('lo que se escribe encima de lo armado no queda en la memoria: la consulta siguiente vuelve a lo del servidor', () => {
    const m: MemoriaDePartes = new Map();
    const antes = ida(cuerpo(), m);
    antes.estado.pasos = { m1: { hechos: [0, 1, 2] } };
    expect(ida(cuerpo(), m).estado.pasos).toEqual({ m1: { hechos: [0] } });
  });

  it('una parte que deja de venir se olvida, y una huella que no calza trae la parte', () => {
    const m: MemoriaDePartes = new Map();
    ida(cuerpo(), m);
    const { consumo: _, ...sinConsumo } = cuerpo();
    unirConsulta(partirConsulta(sinConsumo, tengoDe(m), huella), m);
    expect(m.has('consumo')).toBe(false);
    const mala = partirConsulta(cuerpo(), new Map([['plan.misiones', 'vieja']]), huella);
    expect(mala.plan.misiones).toEqual(cuerpo().plan.misiones);
    expect(mala.partes.iguales).toEqual([]);
  });

  it('una respuesta sin partes queda como vino', () => {
    const sin = { sinProyectos: true };
    expect(unirConsulta(sin, new Map())).toBe(sin);
  });

  it('lo que la página manda se lee igual, también si viene vacío', () => {
    expect([...leerTengo('a~1,b.c~2')]).toEqual([['a', '1'], ['b.c', '2']]);
    expect(leerTengo(null).size).toBe(0);
    expect(leerTengo('malo').size).toBe(0);
    expect(escribirTengo([['a', '1']])).toBe('a~1');
  });

  it('el servidor las parte y la página las une en cada consulta', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const api = readFileSync(join(import.meta.dirname, '..', '..', 'estudio', 'servidor', 'api.ts'), 'utf8').replace(/\r\n/g, '\n');
    expect(api).toContain("return responder(res, 200, partirConsulta({\n              activo: id,");
    expect(api).toContain("leerTengo(url.searchParams.get('tengo'))");
    const app = readFileSync(join(import.meta.dirname, '..', '..', 'estudio', 'src', 'app.ts'), 'utf8').replace(/\r\n/g, '\n');
    expect(app).toContain("const tengo = escribirTengo([...memoriaDePartes].map(([p, v]) => [p, v.huella] as const));");
    expect(app).toContain('const nuevo: Datos | SinProyectos = unirConsulta(await r.json(), memoriaDePartes);');
  });
});
