// El plan en una sola línea, primera rebanada: la migración, sus puntos en orden, la reserva sobre toda la línea y los
// puntos finales que esperan a todo lo de antes (pedido pd_una_sola_linea; decisiones nmwmyxpxvtit a nmwmz48y0tit)
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import planPlantilla from '../../plantilla/plan.json';
import { conSuMeta, estadoVacio, esperaAlCierre, etapaArranque, FASE_DE_LA_LINEA, faseActual, proyectoVacio, reservaDeMisiones, sinSuMeta, tieneRuta, unirArchivo, validarEstado, validarPlan, type EstadoDirector, type Plan } from './director.ts';
import { debePasarALinea, despuesDeLaMeta, hechosDeLaTanda, lineaDeHoy, lineaSinMeta, metaFueraDeLasFases, planEnLinea, PUNTOS_A_LA_VISTA, puntosDeLaLinea, type PuntoDeLinea } from './linea.ts';
import { aplicarParche } from './parche.ts';

const plantilla = planPlantilla as unknown as Plan;
const CUANDO = '2026-11-19T04:00:00.000Z';

/** Tres fases: el arranque ya cruzado, el MVP en curso y la beta por venir; una misión de cierre y lo de después. */
function planDeFases(): Plan {
  const mision = (id: string, fase: string, extra: Partial<Plan['misiones'][number]> = {}) => ({ id, para: 'titular', fase, frente: 'direccion', xp: 10, titulo: id, porQue: 'Porque', pasos: [{ texto: 'Hazlo.', opciones: ['Sí', 'No'] }], entrega: 'Hecho', ...extra });
  return {
    ...plantilla,
    frentes: [{ id: 'direccion', nombre: 'Dirección', que: 'Ruta', rutas: [] }],
    fases: [
      { ...plantilla.fases[0], criterios: [{ id: 'a_leido', texto: 'Leído' }] },
      { id: 'mvp', nombre: 'El MVP', etapa: 'MVP', meta: 'Que funcione.', porQue: 'Validar.', duracion: 'Hasta validar', puerta: { nombre: 'Primer uso', prueba: 'Cinco personas' }, frentes: { direccion: { nivel: 'foco', que: 'Decidir' } }, criterios: [{ id: 'm_uso', texto: 'Cinco lo usaron' }], misiones: ['Los endpoints'] },
      { id: 'beta', nombre: 'La beta', etapa: 'Beta', meta: 'Abierta.', porQue: 'Crecer.', duracion: 'Hasta 50', puerta: { nombre: 'Lanzamiento', prueba: '50 usuarios' }, frentes: { direccion: { nivel: 'apoyo', que: 'Publicar' } }, criterios: [{ id: 'b_lista', texto: 'Lista' }], misiones: ['La prueba de afuera'] },
    ],
    misiones: [
      mision('t_vieja', 'arranque'),
      mision('t_ahora', 'mvp'),
      mision('t_luego', 'beta', { pasos: [{ texto: 'Mira el panel.', ir: { vista: 'ruta', fase: 'beta', etiqueta: 'Ver la fase' }, opciones: ['Sí', 'No'] }] }),
      mision('t_cierre', 'beta', { alCierre: true }),
    ],
    pedidos: [
      { id: 'pd_ahora', fase: 'mvp', texto: 'Algo de ahora' },
      { id: 'pd_beta', fase: 'beta', texto: 'Algo de la beta' },
      { id: 'pd_despues', fase: 'despues', texto: 'Para después del lanzamiento' },
    ],
    propuestas: [{ id: 'pr_beta', area: 'x', titulo: 'Una idea', problema: 'p', propuesta: 'q', conecta: 'c', fase: 'beta' }],
    colaDirector: ['pd_beta', 'pd_ahora'],
    revisiones: { t_vieja: { cuando: '2026-11-01T00:00:00.000Z', veredicto: 'aprobada', comentario: 'Bien' } },
    evaluacion: { a_leido: { fecha: '2026-11-01', estado: 'cumplido', nota: 'Leído' } },
  };
}

const conArranqueCerrado = (): EstadoDirector => ({ ...estadoVacio(), cierres: { arranque: { fecha: '2026-11-01', quien: 'Laura' } }, marcas: { a_leido: { estado: 'cumplido', fecha: '2026-11-01', quien: 'Laura' } } } as EstadoDirector);

describe('el plan en una sola línea hacia la meta (pd_una_sola_linea)', () => {
  it('la migración junta lo de ahora y lo que falta en la meta, y guarda las fases de antes enteras como historia', () => {
    const estado = conArranqueCerrado();
    const antes = planDeFases();
    const linea = planEnLinea(antes, estado, CUANDO, 'The goal');
    expect(linea.fases.map((f) => f.id)).toEqual([FASE_DE_LA_LINEA]);
    const meta = linea.fases[0];
    expect(meta.nombre).toBe('The goal');
    // La lista de lo que cumple la meta: los criterios de lo que faltaba; la puerta, la de la última fase
    expect(meta.criterios.map((c) => c.id)).toEqual(['m_uso', 'b_lista']);
    expect(meta.puerta.nombre).toBe('Lanzamiento');
    expect(meta.misiones).toEqual(['Los endpoints', 'La prueba de afuera']);
    expect(meta.frentes.direccion).toEqual({ nivel: 'foco', que: 'Decidir Then: Publicar' });
    // La historia: cada fase de antes, entera, fuera de la ruta y en fasesRetiradas
    expect(linea.linea).toMatchObject({ desde: CUANDO });
    expect(linea.linea?.fasesAntes.map((f) => f.id)).toEqual(['arranque', 'mvp', 'beta']);
    expect(linea.fasesRetiradas).toEqual(expect.arrayContaining(['arranque', 'mvp', 'beta']));
    // Cada cosa pasa a la meta con su fase de antes como etiqueta; lo de después queda después
    expect(linea.misiones.map((m) => [m.id, m.fase, m.faseAntes])).toEqual([['t_vieja', 'meta', 'arranque'], ['t_ahora', 'meta', 'mvp'], ['t_luego', 'meta', 'beta'], ['t_cierre', 'meta', 'beta']]);
    expect(linea.pedidos?.map((p) => [p.id, p.fase])).toEqual([['pd_ahora', 'meta'], ['pd_beta', 'meta'], ['pd_despues', 'despues']]);
    expect(linea.propuestas[0]).toMatchObject({ fase: 'meta', faseAntes: 'beta' });
    // Un botón de una misión abierta que llevaba a una fase de antes lleva a la meta
    const paso = linea.misiones.find((m) => m.id === 't_luego')!.pasos[0];
    expect(typeof paso !== 'string' && paso.ir?.fase).toBe('meta');
    // Nada se pierde: el plan de antes sigue igual, y migrar otra vez no cambia nada
    expect(antes.fases).toHaveLength(3);
    expect(planEnLinea(linea, estado, '2027-01-01T00:00:00.000Z')).toBe(linea);
  });

  it('el plan migrado y el estado del equipo siguen válidos: puertas cerradas y marcas de antes son historia', () => {
    const estado = conArranqueCerrado();
    const antes = planDeFases();
    const errores = (p: Plan) => [...validarPlan(p), ...validarEstado(estado, p)];
    const ya = new Set(errores(antes));
    const linea = planEnLinea(antes, estado, CUANDO);
    expect(errores(linea).filter((e) => !ya.has(e))).toEqual([]);
    // La ruta sigue trazada con una sola fase: la línea
    expect(tieneRuta(linea)).toBe(true);
    expect(etapaArranque({ ...linea, diagnostico: { ...linea.diagnostico, fecha: '2026-10-01' } }, { ...proyectoVacio(), objetivo: { ...proyectoVacio().objetivo, firmado: { fecha: '2026-10-02', quien: 'Laura' } } } as never, true)).toBe('en_marcha');
    expect(faseActual(linea, estado).id).toBe('meta');
    // Un plan en línea con dos fases, o con una fase de antes todavía en la ruta, no pasa
    expect(validarPlan({ ...linea, fases: [...linea.fases, antes.fases[2]] }).join(' ')).toContain('a lo sumo una fase');
    expect(validarPlan({ ...linea, fasesRetiradas: [] }).join(' ')).toContain('fasesRetiradas');
    expect(validarPlan({ ...linea, linea: { ...linea.linea!, orden: ['t_ahora', 'no_existe'] } }).join(' ')).toContain('«no_existe»');
  });

  it('los puntos de la línea: en el orden del director, con su color, los finales al final y lo de después fuera', () => {
    const estado = conArranqueCerrado();
    const linea = planEnLinea(planDeFases(), estado, CUANDO);
    const puntos = puntosDeLaLinea(linea, estado);
    expect(puntos.map((p) => [p.id, p.color, p.final])).toEqual([
      ['t_ahora', 'persona', false],
      ['t_luego', 'persona', false],
      ['pd_beta', 'director', false],
      ['pd_ahora', 'director', false],
      ['pr_beta', 'espera', false],
      ['t_cierre', 'persona', true],
    ]);
    // Con su orden, el director lo pone donde quiere; los finales siguen al final
    const ordenada = { ...linea, linea: { ...linea.linea!, orden: ['pd_ahora', 't_cierre', 't_luego'] } };
    expect(puntosDeLaLinea(ordenada, estado).map((p) => p.id)).toEqual(['pd_ahora', 't_luego', 't_ahora', 'pd_beta', 'pr_beta', 't_cierre']);
    expect(despuesDeLaMeta(linea)).toEqual(['pd_despues']);
  });

  it('la reserva se cuenta sobre toda la línea, y los puntos finales esperan a todo lo de antes, también a las misiones', () => {
    const estado = conArranqueCerrado();
    const fases = planDeFases();
    // Con fases, la misión de la beta no se alcanza hasta cruzar la puerta del MVP
    expect(reservaDeMisiones(fases, estado, 'titular').abiertas.map((m) => m.id)).toEqual(['t_ahora']);
    const linea = planEnLinea(fases, estado, CUANDO);
    const r = reservaDeMisiones(linea, estado, 'titular');
    expect(r.abiertas.map((m) => m.id)).toEqual(['t_ahora', 't_luego']);
    expect(r.faltan).toBe(8);
    // El cierre espera los pedidos y las misiones de antes; hecho todo, se abre
    const cierre = linea.misiones.find((m) => m.id === 't_cierre')!;
    expect(esperaAlCierre(linea, estado, cierre)).toBe(true);
    const hecho = { cuando: CUANDO, nota: 'Hecho' };
    const todo: Plan = { ...linea, pedidos: linea.pedidos?.map((p) => ({ ...p, hecho })), revisiones: { ...linea.revisiones, t_ahora: { cuando: CUANDO, veredicto: 'aprobada', comentario: '' }, t_luego: { cuando: CUANDO, veredicto: 'aprobada', comentario: '' } } };
    expect(esperaAlCierre(todo, estado, cierre)).toBe(false);
    // Una propuesta sin responder no lo retiene; aceptada y sin ejecutar, sí
    const aceptada = { ...estado, propuestas: { pr_beta: { estado: 'aceptada', fecha: '2026-11-02', quien: 'Laura' } } } as EstadoDirector;
    expect(esperaAlCierre(todo, aceptada, cierre)).toBe(true);
  });

  it('sin fases ni misión de puerta (tercera rebanada): el plan pasa validarPlan, y la reserva y los puntos finales van sobre la línea', () => {
    const estado = conArranqueCerrado();
    const linea = planEnLinea(planDeFases(), estado, CUANDO);
    const sinFases: Plan = { ...linea, fases: [] };
    // Ningún error nuevo por quitar la fase: la meta es la línea, y lo que nombra «meta» sigue valiendo
    const ya = new Set(validarPlan(linea));
    expect(validarPlan(sinFases).filter((e) => !ya.has(e))).toEqual([]);
    expect(sinFases.misiones.some((m) => m.pasos.some((p) => typeof p !== 'string' && p.hecho?.que === 'puerta'))).toBe(false);
    // Un plan sin fases y sin línea sigue sin pasar
    expect(validarPlan({ ...sinFases, linea: undefined }).join(' ')).toContain('no tiene ninguna fase');
    // Lo que pregunta por la fase en curso recibe la meta, sin puerta que cruzar
    expect(faseActual(sinFases, estado)).toMatchObject({ id: FASE_DE_LA_LINEA, sinCierre: true });
    // La reserva: las abiertas de toda la línea, ninguna «fase siguiente», y el cierre retenido no cuenta
    const r = reservaDeMisiones(sinFases, estado, 'titular');
    expect(r.abiertas.map((m) => m.id)).toEqual(['t_ahora', 't_luego']);
    expect(r.siguientes).toEqual([]);
    expect(r.enEspera.map((m) => m.id)).toEqual(['t_cierre']);
    expect(r.faltan).toBe(8);
    // El punto final espera lo de toda la línea; lo de después de la meta no lo detiene
    const cierre = sinFases.misiones.find((m) => m.id === 't_cierre')!;
    const aprobadas = { ...sinFases.revisiones, t_ahora: { cuando: CUANDO, veredicto: 'aprobada' as const, comentario: '' }, t_luego: { cuando: CUANDO, veredicto: 'aprobada' as const, comentario: '' } };
    const hecho = { cuando: CUANDO, nota: 'Hecho' };
    expect(esperaAlCierre({ ...sinFases, revisiones: aprobadas }, estado, cierre)).toBe(true);
    const todo: Plan = { ...sinFases, revisiones: aprobadas, pedidos: sinFases.pedidos?.map((p) => (p.fase === 'despues' ? p : { ...p, hecho })) };
    expect(esperaAlCierre(todo, estado, cierre)).toBe(false);
    expect(reservaDeMisiones(todo, estado, 'titular').abiertas.map((m) => m.id)).toEqual(['t_cierre']);
    // Una propuesta aceptada sin ejecutar lo retiene, aunque no haya fase que la ordene
    const aceptada = { ...estado, propuestas: { pr_beta: { estado: 'aceptada', fecha: '2026-11-02', quien: 'Laura' } } } as EstadoDirector;
    expect(esperaAlCierre(todo, aceptada, cierre)).toBe(true);
  });

  it('la meta guardada fuera de las fases (linea.meta, t_decide_lista_meta): fases vacía, su lista y lo que mueve se conservan y «Meta cumplida» sigue', () => {
    const estado = conArranqueCerrado();
    const linea = planEnLinea(planDeFases(), estado, CUANDO);
    const fase = linea.fases[0];
    const { id: _id, ...meta } = fase;
    const guardado: Plan = { ...linea, fases: [], linea: { ...linea.linea!, meta } };
    // La migración (bandeja --aplicar --meta-fuera, o al pasar a la línea) deja exactamente eso, y una segunda vez nada
    expect(metaFueraDeLasFases(linea)).toEqual(guardado);
    expect(metaFueraDeLasFases(guardado)).toBe(guardado);
    expect(readFileSync(new URL('../../tools/director/bandeja.ts', import.meta.url), 'utf8')).toContain("args.includes('--meta-fuera')");
    // El director la guarda con un parche por clave, sin reescribir la historia de la línea
    const r = aplicarParche(guardado, { linea: { meta: { ...meta, criterios: meta.criterios.slice(1) } } });
    expect(r.errores).toEqual([]);
    expect(r.plan.linea!.meta!.criterios).toHaveLength(meta.criterios.length - 1);
    expect(r.plan.linea!.fasesAntes).toEqual(guardado.linea!.fasesAntes);
    // Valida igual que con la fase, sin errores nuevos
    const ya = new Set(validarPlan(linea));
    expect(validarPlan(guardado).filter((e) => !ya.has(e))).toEqual([]);
    // En memoria, la meta vuelve a ser la fase en curso: con su lista, lo que mueve y su puerta, que sí se cruza
    const enMemoria = conSuMeta(guardado);
    expect(enMemoria.fases.map((f) => f.id)).toEqual([FASE_DE_LA_LINEA]);
    const actual = faseActual(guardado, estado);
    expect(actual.criterios.map((c) => c.id)).toEqual(fase.criterios.map((c) => c.id));
    expect(actual.frentes).toEqual(fase.frentes);
    expect(actual.puerta).toEqual(fase.puerta);
    expect(actual.sinCierre).toBeUndefined();
    expect(unirArchivo(guardado, null).fases[0].criterios).toHaveLength(fase.criterios.length);
    // Al guardar, la fase sale otra vez, con lo que el director le cambió en memoria
    const cambiada = { ...enMemoria, fases: [{ ...enMemoria.fases[0], criterios: [...enMemoria.fases[0].criterios, { id: 'm_nuevo', texto: 'Nuevo', como: 'Así' }] }] };
    const otraVez = sinSuMeta(cambiada);
    expect(otraVez.fases).toEqual([]);
    expect(otraVez.linea!.meta!.criterios.map((c) => c.id)).toContain('m_nuevo');
    expect(sinSuMeta(linea)).toBe(linea);
    // Las dos a la vez es la forma en memoria: valida igual, y al guardar manda la fase, que vuelve a `linea.meta`
    expect(validarPlan(enMemoria).filter((e) => !ya.has(e))).toEqual([]);
    expect(sinSuMeta(cambiada).linea!.meta!.criterios).toHaveLength(fase.criterios.length + 1);
  });

  it('la bandeja migra con --en-linea, con los mismos controles que un parche', () => {
    const bandeja = readFileSync(new URL('../../tools/director/bandeja.ts', import.meta.url), 'utf8');
    expect(bandeja).toContain("args.includes('--en-linea')");
    expect(bandeja).toContain('r.plan = planEnLinea(r.plan, estado, new Date().toISOString()');
  });

  it('un proyecto nacido de las plantillas va en una sola línea en cuanto fija su meta, sin fases ni puertas que cruzar (nmwsg9dqbtit)', () => {
    for (const base of ['plan', 'plan.en', 'plan-nuevo', 'plan-nuevo.en']) {
      const nacido = JSON.parse(readFileSync(new URL(`../../plantilla/${base}.json`, import.meta.url), 'utf8')) as Plan;
      const estado = estadoVacio();
      // Antes de la meta, el arranque (exento de la reserva); con la meta fijada, o si un parche le trae fases, a la línea
      expect(debePasarALinea(nacido, estado, false), base).toBe(false);
      expect(debePasarALinea(nacido, estado, true), base).toBe(true);
      const conFases = aplicarParche(nacido, { fases: [{ id: 'mvp', nombre: 'MVP', etapa: 'MVP', meta: 'M', porQue: 'P', duracion: 'D', puerta: { nombre: 'Uso', prueba: 'Cinco' }, frentes: {}, criterios: [{ id: 'm_uso', texto: 'Uso' }], misiones: [] }] }).plan;
      expect(debePasarALinea(conFases, estado, false), base).toBe(true);
      // Lo que hace bandeja.ts --aplicar: la línea, con la meta fuera de las fases
      const linea = metaFueraDeLasFases(planEnLinea(nacido, estado, CUANDO, 'The goal'));
      expect(linea.linea?.meta, base).toBeDefined();
      expect(linea.fases, base).toEqual([]);
      expect(linea.misiones.every((m) => m.fase === FASE_DE_LA_LINEA), base).toBe(true);
      expect(linea.misiones.flatMap((m) => m.pasos).some((p) => typeof p !== 'string' && p.hecho?.que === 'puerta'), base).toBe(false);
      expect(validarPlan(linea, ['titular']), base).toEqual([]);
      expect(debePasarALinea(linea, estado, true), base).toBe(false);
    }
    // Todas sus fases cerradas: no hay meta a la que llevarla
    expect(debePasarALinea(planDeFases(), { cierres: { arranque: { quien: 'Laura', fecha: '2026-11-01' }, mvp: { quien: 'Laura', fecha: '2026-11-02' }, beta: { quien: 'Laura', fecha: '2026-11-03' } } } as unknown as EstadoDirector, true)).toBe(false);
    // La bandeja lo hace sola, sin --en-linea, antes del parche
    const bandeja = readFileSync(new URL('../../tools/director/bandeja.ts', import.meta.url), 'utf8');
    expect(bandeja).toContain('debePasarALinea(plan, estado, !!proyecto.objetivo?.firmado)');
  });
});

describe('la línea como se pinta en «Hoy» (pd_una_sola_linea, segunda rebanada)', () => {
  const p = (id: string, color: PuntoDeLinea['color'], extra: Partial<PuntoDeLinea> = {}): PuntoDeLinea => ({ id, tipo: color === 'persona' ? 'mision' : color === 'director' ? 'pedido' : 'propuesta', color, final: false, ...extra });
  const muchos = [p('pd_0', 'director'), ...Array.from({ length: 20 }, (_, i) => p('t_' + i, 'persona', { para: i % 2 ? 'ana' : 'titular' })), p('t_fin', 'persona', { final: true, para: 'titular' })];

  it('doce a la vista y el resto plegado; abierta, todos (nmwn1gkpytit)', () => {
    expect(PUNTOS_A_LA_VISTA).toBe(12);
    const l = lineaDeHoy(muchos);
    expect(l.visibles).toHaveLength(12);
    expect(l.plegados).toBe(muchos.length - 12);
    const abierta = lineaDeHoy(muchos, { abierta: true });
    expect(abierta.visibles).toHaveLength(muchos.length);
    expect(abierta.plegados).toBe(0);
  });

  it('la bandera cuenta todos los que quedan, también los plegados (nmwn1gup1tit)', () => {
    expect(lineaDeHoy(muchos).quedan).toBe(22);
    expect(lineaDeHoy([]).quedan).toBe(0);
  });

  it('el punto de ahora es tu primera misión, nunca la de otra persona, ni lo del director, ni un final (nmwn1fh8etit)', () => {
    expect(lineaDeHoy(muchos, { persona: 'titular' }).actual).toBe('t_0');
    expect(lineaDeHoy(muchos, { persona: 'ana' }).actual).toBe('t_1');
    expect(lineaDeHoy([p('pd_0', 'director'), p('t_fin', 'persona', { final: true, para: 'titular' })], { persona: 'titular' }).actual).toBeNull();
  });

  it('el Studio es para una persona: en su línea no están las misiones de otra (nmwno0btttit)', () => {
    const l = lineaDeHoy(muchos, { persona: 'titular' });
    expect(l.visibles.some((x) => x.para === 'ana')).toBe(false);
    expect(l.quedan).toBe(12); // pd_0, sus diez misiones y la final
    expect(l.visibles[0].id).toBe('pd_0');
  });

  it('lo entregado de la tanda queda marcado delante, sin contar en lo que queda (nmwnnb5aitit)', () => {
    const estado = conArranqueCerrado();
    const linea = planEnLinea(planDeFases(), estado, CUANDO);
    const entregado = { ...estado, entregas: { ...estado.entregas, t_luego: { cuando: '2026-11-19T10:00:00Z', quien: 'titular' }, t_ahora: { cuando: '2026-11-19T11:00:00Z', quien: 'titular' } } } as EstadoDirector;
    const hechos = hechosDeLaTanda(linea, entregado, 'titular');
    expect(hechos.map((h) => [h.id, h.hecho])).toEqual([['t_luego', true], ['t_ahora', true]]);
    const l = lineaDeHoy(puntosDeLaLinea(linea, entregado), { persona: 'titular', hechos });
    expect(l.hechos.map((h) => h.id)).toEqual(['t_luego', 't_ahora']);
    expect(l.visibles.some((v) => v.id === 't_ahora')).toBe(false);
    expect(l.quedan).toBe(l.visibles.length + l.plegados);
    // Los marcados cuentan entre los doce a la vista: la línea nunca se alarga (nmwnz2wrvtit)
    const tres = [0, 1, 2].map((i) => p(`t_h${i}`, 'persona', { hecho: true }));
    const conTres = lineaDeHoy(muchos, { hechos: tres });
    expect(conTres.hechos.length + conTres.visibles.length).toBe(PUNTOS_A_LA_VISTA);
    expect(conTres.plegados).toBe(muchos.length - 9);
    expect(conTres.quedan).toBe(muchos.length);
    // Aprobadas en la revisión, salen de la línea
    const revisado: Plan = { ...linea, revisiones: { ...linea.revisiones, t_ahora: { cuando: '2026-11-19T12:00:00Z', veredicto: 'aprobada', comentario: '' } } };
    expect(hechosDeLaTanda(revisado, entregado, 'titular').map((h) => h.id)).toEqual(['t_luego']);
  });

  it('sin meta, la línea corta lleva solo los pasos que faltan para fijarla (nmwn1hld9tit)', () => {
    expect(lineaSinMeta({ diagnosticoLeido: false })).toEqual(['diagnostico', 'meta']);
    expect(lineaSinMeta({ diagnosticoLeido: true })).toEqual(['meta']);
  });
});
