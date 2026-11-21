// El rebase de la memoria (rebase.ts; pedido pd_rebase_memoria): elige qué notas cerradas se pueden borrar, y nunca toca una
// pendiente, una en vigor ni una de un hilo vivo. Puro, así que se prueba sin tocar la memoria.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { auditoriaDelMes, auditoriaSinEscribir, inicioDelMes, conLimpiezaTrasLaPuerta, conteoDeRebase, eligeBorrar, limpiezaQueFalta, misionDeLimpieza, notasBorrables, notasConservadas, notasDeLaLimpieza, notasTrasLaPuerta, type PlanParaRebase, type PlanTrasPuerta } from './rebase';
import type { Mision, Nota, Respuesta } from './director';

let reloj = 0;
const nota = (id: string, sobre: Nota['sobre'] = { tipo: 'general' }): Nota => ({ id, cuando: `2026-11-01T00:00:${String(reloj++).padStart(2, '0')}.000Z`, quien: 'leonc', sobre });
const resp = (tratamiento: Respuesta['tratamiento'], extra: Partial<Respuesta> = {}): Respuesta => ({ cuando: '2026-11-02T00:00:00.000Z', texto: 'ok', tratamiento, ...extra });

describe('el rebase elige solo las notas cerradas', () => {
  it('borra una nota respondida y cerrada, y deja la que no tiene respuesta', () => {
    const notas = [nota('n_resuelta'), nota('n_sin_responder')];
    const plan: PlanParaRebase = { respuestas: { n_resuelta: resp('informada') } };
    expect(notasBorrables(notas, plan)).toEqual(['n_resuelta']);
  });

  it('borra una nota reemplazada, aunque no tenga respuesta propia', () => {
    const notas = [nota('n_vieja'), nota('n_nueva')];
    const plan: PlanParaRebase = { respuestas: { n_nueva: resp('integrada', { reemplaza: ['n_vieja'] }) } };
    // La vieja, reemplazada, se puede borrar; la nueva, integrada y cerrada, también
    expect(notasBorrables(notas, plan).sort()).toEqual(['n_nueva', 'n_vieja']);
  });

  it('nunca borra una respuesta aplazada ni una de decisión, ni cuando lo pendiente está en una parte', () => {
    const notas = [nota('n_aplazada'), nota('n_decision'), nota('n_parte')];
    const plan: PlanParaRebase = {
      respuestas: {
        n_aplazada: resp('aplazada'),
        n_decision: resp('decision'),
        n_parte: resp('integrada', { partes: [{ tipo: 'idea', texto: 'x', tratamiento: 'aplazada' }] }),
      },
    };
    expect(notasBorrables(notas, plan)).toEqual([]);
  });

  it('protege una nota mientras su pedido no esté hecho, y la libera cuando lo está', () => {
    const notas = [nota('n_pedida')];
    const sinHacer: PlanParaRebase = { respuestas: { n_pedida: resp('integrada') }, pedidos: [{ id: 'pd_x', notas: ['n_pedida'] }] };
    expect(notasBorrables(notas, sinHacer)).toEqual([]);
    const hecho: PlanParaRebase = { respuestas: { n_pedida: resp('integrada') }, pedidos: [{ id: 'pd_x', notas: ['n_pedida'], hecho: { cuando: 'z', nota: 'done' } }] };
    expect(notasBorrables(notas, hecho)).toEqual(['n_pedida']);
  });

  it('nunca borra una decisión en vigor, ni la opción elegida más reciente de un paso', () => {
    const vigente = nota('n_vigente', { tipo: 'documento', id: 'docs/x.md', seccion: '1. A', decision: '1', postura: 'aprueba' });
    const eleccion = nota('n_eleccion', { tipo: 'mision', id: 't_x', seccion: 'Paso 1', eleccion: 'Como recomiendas' });
    const plan: PlanParaRebase = { respuestas: { n_vigente: resp('integrada'), n_eleccion: resp('integrada') } };
    expect(notasBorrables([vigente, eleccion], plan)).toEqual([]);
  });

  it('nunca borra una nota que es el origen de una misión abierta', () => {
    const notas = [nota('n_origen_mision'), nota('n_suelta')];
    const plan: PlanParaRebase = {
      respuestas: { n_origen_mision: resp('integrada'), n_suelta: resp('integrada') },
      misiones: [{ origen: ['n_origen_mision'] }],
    };
    // La del origen se protege; la suelta, cerrada, se puede borrar
    expect(notasBorrables(notas, plan)).toEqual(['n_suelta']);
  });

  it('tras una puerta, solo lo cerrado antes de cruzarla, con su asunto terminado, y nunca lo que la persona conservó (nmwjl91dftit, nmwl4xwfmtit)', () => {
    const cruce = '2026-11-10T00:00:00.000Z';
    const notas = [nota('n_antes'), nota('n_despues'), nota('n_pedido_abierto'), nota('n_pedido_reemplazado'), nota('n_mision_abierta', { tipo: 'mision', id: 't_abierta', seccion: 'Paso 1' }), nota('n_mision_aprobada', { tipo: 'mision', id: 't_aprobada', seccion: 'Paso 1' }), nota('n_conservada')];
    const plan: PlanTrasPuerta = {
      respuestas: {
        n_antes: resp('informada'),
        n_despues: resp('informada', { cuando: '2026-11-12T00:00:00.000Z' }),
        n_pedido_abierto: resp('integrada'),
        n_pedido_reemplazado: resp('integrada'),
        n_mision_abierta: resp('integrada'),
        n_mision_aprobada: resp('integrada'),
        n_conservada: resp('informada'),
      },
      pedidos: [
        { id: 'pd_viejo', notas: ['n_pedido_reemplazado'] },
        { id: 'pd_nuevo', notas: ['n_pedido_abierto'], hecho: { cuando: 'z', nota: 'done' }, reemplaza: ['pd_viejo'] },
        { id: 'pd_abierto', notas: ['n_pedido_abierto'] },
      ],
      revisiones: { t_aprobada: { veredicto: 'aprobada' } },
    };
    expect(notasTrasLaPuerta(notas, plan, cruce, new Set(['n_conservada']))).toEqual(['n_antes', 'n_pedido_reemplazado', 'n_mision_aprobada']);
    // Sin nada que limpiar, la lista sale vacía y no hay misión (nmwkbll1ytit)
    expect(notasTrasLaPuerta([nota('n_sola')], { respuestas: {} }, cruce)).toEqual([]);
  });

  it('cuenta para el ensayo sin borrar nada', () => {
    const notas = [nota('a'), nota('b'), nota('c')];
    const plan: PlanParaRebase = { respuestas: { a: resp('informada'), b: resp('rechazada') } };
    expect(conteoDeRebase(notas, plan)).toEqual({ borrables: 2, total: 3, quedan: 1 });
  });
});

describe('la misión de limpieza tras cada puerta: una sola pregunta, sí o no (nmwmgrlwbtit)', () => {
  const cruce = '2026-11-10T00:00:00.000Z';
  const cierres = { propios: { fecha: cruce } };
  const datos = { fase: 'propios', siguiente: 'publico', frente: 'memoria', idioma: 'en' as const };

  it('trae el conteo y dos opciones, sin lista ni elección por nota; sin nada que limpiar, no hay misión', () => {
    const notas = [nota('a'), nota('b'), nota('c')];
    const plan: PlanTrasPuerta = { respuestas: { a: resp('informada'), b: resp('rechazada') } };
    const m = misionDeLimpieza(notas, plan, cierres, datos)!;
    expect(m).toMatchObject({ id: 't_limpieza_propios', para: 'titular', fase: 'publico', origen: ['pd_rebase_memoria'] });
    expect(m.pasos).toHaveLength(1);
    const paso = m.pasos[0] as Exclude<Mision['pasos'][number], string>;
    expect(paso.texto).toMatch(/^2 notes are no longer needed, because they were replaced or already applied\. Delete them\?/);
    expect(paso.opciones).toEqual(['Yes, delete them', 'No, keep them']);
    expect(paso.limpia).toEqual({ fase: 'propios' });
    expect(paso.varias).toBeUndefined();
    // Sin lista: ningún id de nota viaja en la misión
    expect(JSON.stringify(m)).not.toContain('"a"');
    expect(JSON.stringify(m)).not.toContain('"b"');
    expect(misionDeLimpieza(notas, plan, cierres, { ...datos, idioma: 'es' })!.pasos[0]).toMatchObject({ opciones: ['Sí, bórralas', 'No, consérvalas'] });
    expect(misionDeLimpieza([nota('sola')], { respuestas: {} }, cierres, datos)).toBeNull();
    expect(misionDeLimpieza(notas, plan, {}, datos)).toBeNull();
  });

  it('«Sí» borra exactamente las que contó la misión, que son las que notasBorrables da de lo cerrado antes de la puerta', () => {
    const notas = [nota('a'), nota('b'), nota('c'), nota('tarde')];
    const plan: PlanTrasPuerta = { respuestas: { a: resp('informada'), b: resp('rechazada'), tarde: resp('informada', { cuando: '2026-11-12T00:00:00.000Z' }) } };
    const ids = notasDeLaLimpieza(notas, plan, cierres, 'propios');
    expect(ids).toEqual(['a', 'b']);
    expect(ids.every((id) => notasBorrables(notas, plan).includes(id))).toBe(true);
    expect(misionDeLimpieza(notas, plan, cierres, datos)!.pasos[0]).toMatchObject({ texto: expect.stringMatching(/^2 notes/) });
    expect(eligeBorrar('Yes, delete them')).toBe(true);
    expect(eligeBorrar('Sí, bórralas')).toBe(true);
    expect(eligeBorrar('No, keep them')).toBe(false);
    expect(eligeBorrar('No, consérvalas')).toBe(false);
  });

  it('«No» las conserva para siempre: la puerta siguiente cuenta solo lo cerrado después (nmwl4xwfmtit)', () => {
    const notas = [nota('a'), nota('b')];
    const plan: PlanTrasPuerta = { respuestas: { a: resp('informada'), b: resp('informada', { cuando: '2026-11-15T00:00:00.000Z' }) } };
    const dijoNo: Nota = { id: 'n_no', cuando: '2026-11-11T00:00:00.000Z', quien: 'leonc', sobre: { tipo: 'mision', id: 't_limpieza_propios', seccion: 'Paso 1', eleccion: 'No, keep them' } as Nota['sobre'] };
    const todas = [...notas, dijoNo];
    const dos = { ...cierres, publico: { fecha: '2026-11-20T00:00:00.000Z' } };
    expect(notasConservadas(todas, plan, dos)).toEqual(new Set(['a']));
    expect(notasDeLaLimpieza(todas, plan, dos, 'publico')).toEqual(['b']);
    expect(misionDeLimpieza(todas, plan, dos, { ...datos, fase: 'publico', siguiente: 'despues' })!.pasos[0]).toMatchObject({ texto: expect.stringMatching(/^1 note is no longer needed, because it was replaced/) });
  });

  it('el servidor borra al elegir «Sí» en el paso con `limpia`, con las notas de notasDeLaLimpieza', () => {
    const api = readFileSync(new URL('../../estudio/servidor/api.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    expect(api).toContain('if (limpia && eligeBorrar(eleccion)) {');
    expect(api).toContain('const borradas = borrarDeTodos(new Set(notasDeLaLimpieza(estado.notas, plan, estado.cierres, limpia.fase)));');
    // Las de todo el proyecto (nmwmns8xstit): el archivo de cada persona que cambia se escribe, no solo el de quien decide
    expect(api).toContain('for (const [p, e] of Object.entries(leido.porPersona)) {');
    expect(api).toContain('for (const p of otrosLimpios) {');
  });
});

describe('la misión de limpieza, primera, justo tras cruzar la puerta (pd_rebase_memoria, nmwjogp16tit)', () => {
  const tras = '2026-11-19T00:00:00.000Z';
  const fases = [{ id: 'propios' }, { id: 'publico' }, { id: 'despues_x' }];
  const frentes = [{ id: 'memoria' }];
  // De dos personas: la limpieza cuenta las notas de todo el proyecto (nmwmns8xstit)
  const notas = [nota('a'), { ...nota('b'), quien: 'otra' }, nota('c')];
  const respuestas = { a: resp('informada'), b: resp('rechazada') };
  const plan = { fases, frentes, respuestas, misiones: [] as Mision[] };

  it('una puerta cruzada trae la misión primera de la fase que empieza, con todas las notas del proyecto', () => {
    const m = limpiezaQueFalta(notas, plan, { propios: { fecha: tras } }, 'en')!;
    expect(m).toMatchObject({ id: 't_limpieza_propios', fase: 'publico', frente: 'memoria' });
    expect((m.pasos[0] as Exclude<Mision['pasos'][number], string>).texto).toMatch(/^2 notes are no longer needed/);
    const abierta = { id: 't_x', para: 'titular', fase: 'publico', frente: 'memoria', titulo: 'x', porQue: 'x', pasos: ['x'], entrega: 'x', xp: 10 } as Mision;
    const conElla = conLimpiezaTrasLaPuerta({ ...plan, misiones: [abierta] }, m);
    expect(conElla.misiones.map((x) => x.id)).toEqual(['t_limpieza_propios', 't_x']);
    // La de la última puerta cruzada, no la de una anterior
    expect(limpiezaQueFalta(notas, plan, { propios: { fecha: '2026-11-18T23:00:00.000Z' }, publico: { fecha: tras } }, 'en')).toMatchObject({ id: 't_limpieza_publico', fase: 'despues_x' });
  });

  it('nada que limpiar, ya puesta, ya usada o una puerta de antes: ninguna misión', () => {
    expect(limpiezaQueFalta([nota('sola')], { ...plan, respuestas: {} }, { propios: { fecha: tras } }, 'en')).toBeNull();
    expect(limpiezaQueFalta(notas, plan, {}, 'en')).toBeNull();
    const m = limpiezaQueFalta(notas, plan, { propios: { fecha: tras } }, 'en')!;
    expect(limpiezaQueFalta(notas, { ...plan, misiones: [m] }, { propios: { fecha: tras } }, 'en')).toBeNull();
    expect(limpiezaQueFalta(notas, plan, { propios: { fecha: tras } }, 'en', new Set(['t_limpieza_propios']))).toBeNull();
    // Cruzada antes de que existiera: cada proyecto la estrena en su próxima puerta (nmwk5o2rbtit)
    expect(limpiezaQueFalta(notas, plan, { propios: { fecha: '2026-11-01T00:00:00.000Z' } }, 'en')).toBeNull();
    // La última fase: no hay fase que empiece
    expect(limpiezaQueFalta(notas, plan, { despues_x: { fecha: tras } }, 'en')).toBeNull();
    expect(conLimpiezaTrasLaPuerta(plan, null)).toBe(plan);
  });

  it('la bandeja la pone con --aplicar y --listo no cierra sin ella', () => {
    const bandeja = readFileSync(new URL('../../tools/director/bandeja.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    expect(bandeja).toContain('r.plan = conLimpiezaTrasLaPuerta(r.plan, limpiezaDelPlan(r.plan, archivo, estado, idioma));');
    expect(bandeja).toContain('const limpiezaPendiente = limpiezaDelPlan(plan, archivo, estado,');
  });
});

describe('la auditoría y la limpieza de cada mes, una misión, en la primera revisión del mes (nmwo2opc1tit, nmwnz6hg1tit)', () => {
  const frentes = [{ id: 'memoria' }];
  const notas = [nota('a'), nota('b'), nota('c')];
  const respuestas = { a: resp('informada'), b: resp('rechazada') };
  const plan = { linea: { desde: '2026-11-19T00:00:00.000Z' }, fases: [] as { id: string }[], frentes, respuestas, misiones: [] as Mision[] };
  const diciembre = '2026-12-03T15:00:00.000Z';

  it('en un plan en línea, desde diciembre de 2026, trae la auditoría del mes anterior y el sí o no a la limpieza', () => {
    const m = auditoriaDelMes(notas, plan, {}, 'en', diciembre)!;
    expect(m).toMatchObject({ id: 't_limpieza_mes-2026-12', para: 'titular', fase: 'meta', frente: 'memoria', origen: ['pd_una_sola_linea'] });
    expect(m.titulo).toBe("The director's audit of November 2026, and the clean-up");
    expect(m.pasos).toHaveLength(2);
    const [audita, limpia] = m.pasos as Exclude<Mision['pasos'][number], string>[];
    expect(audita.texto).toMatch(/^How the director did in November 2026/);
    expect(audita.ir).toMatchObject({ vista: 'modelo', ancla: 'm-consumo' });
    expect(audita.detalle).toEqual([]);
    expect(limpia.texto).toMatch(/^2 notes are no longer needed/);
    expect(limpia.limpia).toEqual({ fase: 'mes-2026-12' });
    // El servidor borra con lo mismo: el corte es el primer día del mes
    expect(inicioDelMes('mes-2026-12')).toBe('2026-12-01T00:00:00.000Z');
    expect(notasDeLaLimpieza(notas, plan, {}, 'mes-2026-12')).toEqual(['a', 'b']);
    // Enero mira diciembre del año anterior; en español, su nombre
    expect(auditoriaDelMes(notas, plan, {}, 'es', '2027-01-02T00:00:00.000Z')!.titulo).toBe('La auditoría del director de diciembre de 2026, y la limpieza');
  });

  it('sin notas que limpiar, solo la auditoría; nada antes de diciembre, en un plan de fases, ya puesta o ya usada', () => {
    const sola = auditoriaDelMes([nota('z')], { ...plan, respuestas: {} }, {}, 'en', diciembre)!;
    expect(sola.pasos).toHaveLength(1);
    expect(sola.titulo).toBe("The director's audit of November 2026");
    expect(auditoriaDelMes(notas, plan, {}, 'en', '2026-11-30T23:00:00.000Z')).toBeNull();
    expect(auditoriaDelMes(notas, { ...plan, linea: undefined }, {}, 'en', diciembre)).toBeNull();
    const m = auditoriaDelMes(notas, plan, {}, 'en', diciembre)!;
    expect(auditoriaDelMes(notas, { ...plan, misiones: [m] }, {}, 'en', diciembre)).toBeNull();
    expect(auditoriaDelMes(notas, plan, {}, 'en', diciembre, new Set([m.id]))).toBeNull();
  });

  it('«No» conserva para siempre lo que ofreció el mes', () => {
    const dijoNo: Nota = { id: 'n_no', cuando: '2026-12-04T00:00:00.000Z', quien: 'leonc', sobre: { tipo: 'mision', id: 't_limpieza_mes-2026-12', seccion: 'Paso 2', eleccion: 'No, keep them' } as Nota['sobre'] };
    expect(notasConservadas([...notas, dijoNo], plan, {})).toEqual(new Set(['a', 'b']));
  });

  it('el director escribe la auditoría en el detalle de su primer paso; sin ella, --listo no cierra', () => {
    const m = auditoriaDelMes(notas, plan, {}, 'en', diciembre)!;
    expect(auditoriaSinEscribir([m], () => false)).toEqual([m.id]);
    expect(auditoriaSinEscribir([m], () => true)).toEqual([]);
    const escrita = { ...m, pasos: [{ ...(m.pasos[0] as object), detalle: ['Two recommendations changed; I now give the alternative first.'] }, ...m.pasos.slice(1)] } as Mision;
    expect(auditoriaSinEscribir([escrita], () => false)).toEqual([]);
    const bandeja = readFileSync(new URL('../../tools/director/bandeja.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    expect(bandeja).toContain('?? auditoriaDelMes(estado.notas, completo, estado.cierres, lengua, new Date().toISOString(), usados)');
    expect(bandeja).toContain('const auditoriasPorEscribir = auditoriaSinEscribir(');
  });
});
