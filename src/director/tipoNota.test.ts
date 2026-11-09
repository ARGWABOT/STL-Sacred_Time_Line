import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMO_PENDIENTE, comoQuedaronEnBuzon, comoQuedoNota, destinoResuelto, estadoVacio, notasDeTipo, notasQueQuedaron, OPCIONES_TIPO_DE_NOTA, pendientesEnBuzon, pideTipo, respuestasSinTipo, TIPO_ELIGE, tipoDeNota, tiposEnBuzon, validarEstado, type Nota, type Plan } from './director';

// El tipo de cada nota, obligatorio y de un toque (pedido pd_tipo_obligatorio, parte 1 de la propuesta aceptada
// pr_tipo_nota), y las notas de antes como «Sin tipo», con su filtro en el Buzón (tu decisión nmvsv9nuytit, en
// t_decidir_notas_viejas)
const nota = (id: string, sobre: Nota['sobre'], tipo?: Nota['tipo']): Nota => ({ id, cuando: '2026-10-29T02:00:00.000Z', quien: 'leonc', sobre, texto: 'Algo.', ...(tipo ? { tipo } : {}) });

describe('cada nota con su tipo', () => {
  it('se elige de un toque entre cinco tipos y «Auto (el modelo decide)», de lo más usado a lo menos, salvo donde el lugar ya lo dice', () => {
    // Comentario y Auto, sus nombres de la nota nmvsxdgvdtit; el id de Comentario sigue siendo «respuesta»
    expect(OPCIONES_TIPO_DE_NOTA).toEqual([[TIPO_ELIGE, 'Auto (el modelo decide)'], ['ajuste', 'Ajuste'], ['respuesta', 'Comentario'], ['idea', 'Idea para después'], ['falla', 'Algo falla'], ['pregunta', 'Pregunta']]);
    expect(pideTipo({ tipo: 'general' })).toBe(true);
    expect(pideTipo({ tipo: 'mision', id: 't_a', seccion: 'Paso 1' })).toBe(true);
    expect(pideTipo({ tipo: 'documento', id: 'docs/a.md', seccion: '1. Algo' })).toBe(true);
    // Una pregunta, una decisión, una opción elegida, un «Hazlo tú», «No lo entiendo» o «Ya lo hice: compruébalo tú»
    expect(pideTipo({ tipo: 'pregunta' })).toBe(false);
    expect(pideTipo({ tipo: 'documento', id: 'docs/a.md', seccion: '1. Algo', decision: 'X', postura: 'decide' })).toBe(false);
    expect(pideTipo({ tipo: 'mision', id: 't_a', seccion: 'Paso 1', eleccion: 'Sí' })).toBe(false);
    expect(pideTipo({ tipo: 'mision', id: 't_a', seccion: 'Paso 1', hazlo: true })).toBe(false);
    expect(pideTipo({ tipo: 'mision', id: 't_a', seccion: 'Paso 1', aclarar: true })).toBe(false);
    expect(pideTipo({ tipo: 'mision', id: 't_a', seccion: 'Paso 1', comprobar: true })).toBe(false);
  });

  it('las notas de antes quedan «Sin tipo»; la que dudó toma el que le pone el director; el lugar dice el suyo', () => {
    expect(tipoDeNota(nota('n1', { tipo: 'general' }))).toBe('sin');
    expect(tipoDeNota(nota('n2', { tipo: 'general' }, 'falla'))).toBe('falla');
    expect(tipoDeNota(nota('n3', { tipo: 'general' }, TIPO_ELIGE))).toBe(TIPO_ELIGE);
    expect(tipoDeNota(nota('n3', { tipo: 'general' }, TIPO_ELIGE), { tipo: 'idea' })).toBe('idea');
    // Una nota de antes que el director lee hoy: lleva el tipo que le puso al responderla
    expect(tipoDeNota(nota('n1', { tipo: 'general' }), { tipo: 'ajuste' })).toBe('ajuste');
    // Lo que eligió la persona manda sobre lo que dijo el director (si no calzaba, lo corrige en sus partes)
    expect(tipoDeNota(nota('n2', { tipo: 'general' }, 'falla'), { tipo: 'idea' })).toBe('falla');
    expect(tipoDeNota(nota('n4', { tipo: 'pregunta' }))).toBe('pregunta');
    expect(tipoDeNota(nota('n5', { tipo: 'mision', id: 't_a', eleccion: 'Sí' }))).toBe('respuesta');
  });

  it('el filtro del Buzón: cuántas de cada tipo, en el orden de los botones, y solo las de ese tipo', () => {
    const notas = [nota('n1', { tipo: 'general' }), nota('n2', { tipo: 'general' }, 'falla'), nota('n3', { tipo: 'general' }), nota('n4', { tipo: 'general' }, 'idea')];
    expect(tiposEnBuzon(notas, {})).toEqual([['idea', 1], ['falla', 1], ['sin', 2]]);
    expect(tiposEnBuzon([nota('n5', { tipo: 'general' }, 'pregunta'), nota('n6', { tipo: 'general' }, 'ajuste'), nota('n7', { tipo: 'general' }, 'respuesta')], {}).map(([t]) => t)).toEqual(['ajuste', 'respuesta', 'pregunta']);
    expect(notasDeTipo(notas, {}, 'sin').map((n) => n.id)).toEqual(['n1', 'n3']);
    expect(notasDeTipo(notas, {}, '').map((n) => n.id)).toEqual(['n1', 'n2', 'n3', 'n4']);
  });

  it('el filtro «Cómo quedó» del Buzón: esperando o el tratamiento de su respuesta, sobre las del tipo elegido', () => {
    const notas = [nota('n1', { tipo: 'general' }, 'idea'), nota('n2', { tipo: 'general' }, 'falla'), nota('n3', { tipo: 'general' }, 'idea'), nota('n4', { tipo: 'general' })];
    const respuestas = { n1: { tratamiento: 'aplazada' as const }, n2: { tratamiento: 'integrada' as const }, n4: {} };
    expect(comoQuedoNota(notas[2], respuestas)).toBe('esperando');
    // Una respuesta de antes sin tratamiento cuenta como respondida
    expect(comoQuedoNota(notas[3], respuestas)).toBe('informada');
    expect(comoQuedaronEnBuzon(notas, respuestas)).toEqual([['esperando', 1], ['integrada', 1], ['aplazada', 1], ['informada', 1]]);
    const ideas = notasDeTipo(notas, {}, 'idea');
    expect(notasQueQuedaron(ideas, respuestas, 'aplazada').map((n) => n.id)).toEqual(['n1']);
    expect(notasQueQuedaron(ideas, respuestas, '').map((n) => n.id)).toEqual(['n1', 'n3']);
    // La vista del Buzón vive en su módulo (vistaBuzon.ts)
    const buzon = readFileSync(join(__dirname, '..', '..', 'estudio', 'src', 'vistaBuzon.ts'), 'utf-8');
    expect(buzon).toContain('const notas = notasQueQuedaron(deTipo, respuestas, comoBuzon, resueltoAqui);');
  });

  it('las preguntas están en el Buzón, con su filtro, y su sección sale de la barra (pedido pd_preguntas_buzon)', () => {
    const pagina = readFileSync(join(__dirname, '..', '..', 'estudio', 'src', 'app.ts'), 'utf-8');
    const buzon = readFileSync(join(__dirname, '..', '..', 'estudio', 'src', 'vistaBuzon.ts'), 'utf-8');
    // El Buzón recibe las notas que quien mira ve, con las preguntas, y las pinta de la más nueva a la más vieja
    const datosBuzon = pagina.slice(pagina.indexOf('const datosBuzon = '), pagina.indexOf('function vistaBuzon()'));
    expect(datosBuzon).toContain('notas: d.estado.notas.filter((n) => seVe(n.de))');
    expect(buzon).toContain('const todas = [...datos.notas].reverse();');
    expect(pagina).toContain("vistas: (['buzon', ...(vista === 'preguntas' ? ['preguntas'] : [])] as Vista[])");
    // Con el filtro «Pregunta», el informe de sus respuestas a un clic
    expect(buzon).toContain("if (tipoBuzon === 'pregunta' && todas.some(esPregunta))");
    expect(tipoDeNota(nota('n1', { tipo: 'pregunta' }))).toBe('pregunta');
  });

  it('el cierre exige el tipo en la respuesta a una nota que dejó «Auto (el modelo decide)»; a una de antes, sin tipo, no', () => {
    const desde = '2026-10-29T01:00:00.000Z';
    const notas = [nota('n_duda', { tipo: 'general' }, TIPO_ELIGE), nota('n_vieja', { tipo: 'general' }), nota('n_con', { tipo: 'general' }, 'ajuste'), nota('n_eligio', { tipo: 'mision', id: 't_a', eleccion: 'Sí' })];
    const r = (tipo?: string) => ({ cuando: '2026-10-29T02:10:00.000Z', texto: 'Hecho.', tratamiento: 'informada', ...(tipo ? { tipo } : {}) });
    const plan = { respuestas: { n_duda: r(), n_vieja: r(), n_con: r(), n_eligio: r() } } as unknown as Plan;
    expect(respuestasSinTipo(plan, notas, desde)).toEqual(['n_duda']);
    const conTipo = { respuestas: { ...plan.respuestas, n_duda: r('idea') } } as unknown as Plan;
    expect(respuestasSinTipo(conTipo, notas, desde)).toEqual([]);
    // Lo respondido en revisiones de antes no se toca: queda «Sin tipo»
    expect(respuestasSinTipo(plan, notas, '2026-10-30T00:00:00.000Z')).toEqual([]);
  });

  it('un tipo desconocido en una nota guardada es un error', () => {
    const plan = { fases: [], frentes: [], propuestas: [], misiones: [] } as unknown as Plan;
    const e = estadoVacio();
    e.notas = [nota('n1', { tipo: 'general' }, 'idea'), { ...nota('n2', { tipo: 'general' }), tipo: 'otra' as never }];
    expect(validarEstado(e, plan)).toEqual(['La nota n2 tiene un tipo desconocido.']);
  });

  it('el servidor no guarda una nota sin su tipo donde hay que elegirlo, y el Studio lo pide en el comentario y en el Buzón', () => {
    const servidor = readFileSync(join(__dirname, '..', '..', 'estudio', 'servidor', 'api.ts'), 'utf-8');
    const comentar = servidor.slice(servidor.indexOf("case 'comentar': {"), servidor.indexOf("case 'borrar_nota': {"));
    expect(comentar).toContain('if (!tipo && pideTipo(donde)) throw new Rechazo(');
    expect(comentar.indexOf('pideTipo(donde)')).toBeLessThan(comentar.indexOf('guardarAudio('));
    const pagina = readFileSync(join(__dirname, '..', '..', 'estudio', 'src', 'app.ts'), 'utf-8');
    expect(pagina).toContain("campos: [...(pideTipo(sobre as Nota['sobre']) ? [campoTipo(tipoInicial ?? (general ? undefined : 'respuesta'))] : []),");
    // El comentario general es el mismo diálogo único (pd_dialogo_unico): sobre «general», pideTipo lo pide
    expect(pagina).toContain("await comentar({ tipo: 'general' }");
    expect(pideTipo({ tipo: 'general' })).toBe(true);
    const bandeja = readFileSync(join(__dirname, '..', '..', 'tools', 'director', 'bandeja.ts'), 'utf-8');
    expect(bandeja).toContain('const sinTipo = respuestasSinTipo(plan, estado.notas, desde);');
  });

  it('lo que «Requiere tu decisión» o quedó «Aplazada» y ya se resolvió en su lugar cuenta como integrada, sin modelo (nota nmvt1uaxhtit)', () => {
    const e = estadoVacio();
    const plan = { pedidos: [{ id: 'pd_a', hecho: { cuando: 'x', nota: 'y' } }, { id: 'pd_b' }], revisiones: { t_b: { veredicto: 'aprobada' } } };
    const cuando = '2026-10-29T01:00:00.000Z';
    e.propuestas = { pr_a: { cuando, quien: 'leonc', estado: 'aceptada' } } as never;
    e.entregas = { t_a: { cuando, quien: 'leonc' } } as never;
    e.notas = [{ ...nota('n_dec', { tipo: 'documento', id: 'docs/director/x.md', seccion: '2. Algo', decision: '1. Algo' }), cuando: '2026-10-29T03:00:00.000Z' }];
    const r = (ancla?: string, extra = {}) => ({ tratamiento: 'decision' as const, cuando, ...(ancla ? { destino: { vista: 'ruta' as const, ancla, etiqueta: '' } } : {}), ...extra });
    const resuelto = (x: Parameters<typeof destinoResuelto>[0]) => destinoResuelto(x, plan, e);
    expect(resuelto(r('propuesta-pr_a'))).toBe(true);
    expect(resuelto(r('propuesta-pr_b'))).toBe(false);
    expect(resuelto(r('pedido-pd_a'))).toBe(true);
    expect(resuelto(r('pedido-pd_b'))).toBe(false);
    expect(resuelto(r('mision-t_a'))).toBe(true);
    expect(resuelto(r('mision-t_b'))).toBe(true);
    expect(resuelto(r('mision-t_c'))).toBe(false);
    expect(resuelto(r(undefined, { destino: { doc: 'docs/director/x.md', seccion: '2. Algo', etiqueta: '' } }))).toBe(true);
    // Una decisión respondida antes de la respuesta no la resuelve
    expect(resuelto(r(undefined, { cuando: '2026-10-29T04:00:00.000Z', destino: { doc: 'docs/director/x.md', seccion: '2. Algo', etiqueta: '' } }))).toBe(false);
    expect(resuelto(r())).toBe(false);
    const respuestas = { n1: r('propuesta-pr_a'), n2: { ...r('pedido-pd_a'), tratamiento: 'aplazada' as const }, n3: r('propuesta-pr_b'), n4: { ...r('propuesta-pr_a'), tratamiento: 'informada' as const } };
    const notas = ['n1', 'n2', 'n3', 'n4'].map((id) => nota(id, { tipo: 'general' }));
    expect(notas.map((n) => comoQuedoNota(n, respuestas, resuelto))).toEqual(['integrada', 'integrada', 'decision', 'informada']);
    expect(comoQuedaronEnBuzon(notas, respuestas, resuelto)).toEqual([['integrada', 2], ['decision', 1], ['informada', 1]]);
    // Sin saber cómo se resolvió, como antes: su tratamiento
    expect(comoQuedoNota(notas[0], respuestas)).toBe('decision');
  });

  it('las pestañas y los filtros cuentan solo lo que pide atención; el total, solo en «Ya respondidas» (nota nmvt49i09tit)', () => {
    const notas = ['n1', 'n2', 'n3', 'n4'].map((id) => nota(id, { tipo: 'general' }));
    const respuestas = { n2: { tratamiento: 'integrada' as const }, n3: { tratamiento: 'decision' as const }, n4: { tratamiento: 'informada' as const } };
    // n1 espera al director y n3 requiere tu decisión: 2 de 4
    expect(pendientesEnBuzon(notas, respuestas)).toBe(2);
    expect(pendientesEnBuzon(notas, respuestas, () => true)).toBe(1);
    expect(COMO_PENDIENTE).toEqual(['esperando', 'decision']);
    const buzon = readFileSync(join(__dirname, '..', '..', 'estudio', 'src', 'vistaBuzon.ts'), 'utf-8');
    expect(buzon).toContain("['', `${t('buzon.todas')}${pendientes(todas)}`]");
    expect(buzon).not.toContain('`Todas · ${todas.length}`');
    expect(buzon).not.toContain('`Todas · ${deTipo.length}`');
    expect(buzon).toContain('<h3>${t(\'buzon.respondidas\')} <small>· ${respondidas.length}</small></h3>');
  });

  it('el tipo de una nota propia se cambia con su mismo botón del Buzón, hasta que el director la responda (nota nmvt1vaaltit)', () => {
    const servidor = readFileSync(join(__dirname, '..', '..', 'estudio', 'servidor', 'api.ts'), 'utf-8');
    const caso = servidor.slice(servidor.indexOf("case 'tipo_nota': {"), servidor.indexOf("case 'corregir_transcripcion': {"));
    expect(caso).toContain('propio.notas.find((x) => x.id === cuerpo.id)');
    expect(caso).toContain('if (plan.respuestas?.[n.id]) throw new Rechazo(');
    expect(caso).toContain('n.tipo = tipo;');
    const pagina = readFileSync(join(__dirname, '..', '..', 'estudio', 'src', 'app.ts'), 'utf-8');
    expect(pagina).toContain('const chipTipo = !r && mia && pideTipo(n.sobre)');
    expect(pagina).toContain("await accion({ tipo: 'tipo_nota', id: n.id, tipoNota: r.tipoNota }");
    const buzon = readFileSync(join(__dirname, '..', '..', 'estudio', 'src', 'vistaBuzon.ts'), 'utf-8');
    expect(buzon).toContain('comoQuedaronEnBuzon(deTipo, respuestas, resueltoAqui)');
  });
});
