import { describe, expect, it } from 'vitest';
import planPlantilla from '../../plantilla/plan.json';
import proyectoPlantilla from '../../plantilla/proyecto.json';
import {
  aclaracionesDe,
  cumpleComprobacion,
  ordenDeComprobacion,
  eleccionDe,
  encargoDe,
  pasoHecho,
  pasosPorComprobar,
  pasosVistos,
  seccionPaso,
  type Hecho,
  type Mision,
  type Nota,
  type Paso,
  avanceFase,
  bloqueosPuerta,
  claveEntrega,
  claveIdea,
  claveTrozo,
  decisionesDe,
  documentosEnOrden,
  enLectura,
  esDocumento,
  esPregunta,
  hilosDePreguntas,
  raizDePregunta,
  estadoIdeas,
  estadoMision,
  estadoPersonaVacio,
  type EstadoPersona,
  estadoVacio,
  etapaArranque,
  evaluar,
  excepcionesActivas,
  faseActual,
  frenteDeRuta,
  ideasSueltas,
  marcasAlDia,
  misionesAbiertas,
  partesDeDocumento,
  trozosDeParte,
  pendientesDelDirector,
  proyectoVacio,
  repartirCommit,
  repartoPorNivel,
  respuestasSinDestino,
  decideDecision,
  selladosQueCambiaron,
  situacion,
  sumarDias,
  trabajoDe,
  unirEstados,
  urgenciasDeLaSemana,
  esImagen,
  validarEstado,
  validarPlan,
  validarProyecto,
  xpDe,
  type CommitFrentes,
  type Contexto,
  type EstadoDirector,
  type Plan,
  type Proyecto,
} from './director';

const plantilla = planPlantilla as unknown as Plan;

/** Un proyecto de ejemplo ya en marcha: una API con su panel, tres fases y dos personas. */
function planEjemplo(): Plan {
  return {
    ...plantilla,
    frentes: [
      { id: 'direccion', nombre: 'Dirección', que: 'Ruta y decisiones', rutas: [] },
      { id: 'api', nombre: 'API', que: 'El servidor', rutas: ['server/'] },
      { id: 'datos', nombre: 'Base de datos', que: 'El esquema', rutas: ['server/db/'] },
      { id: 'web', nombre: 'Panel web', que: 'La interfaz', rutas: ['web/'] },
    ],
    fases: [
      plantilla.fases[0],
      {
        id: 'mvp', nombre: 'El MVP', etapa: 'Producto mínimo', meta: 'Que funcione de punta a punta', porQue: 'Para validar', duracion: 'Hasta la primera validación',
        puerta: { nombre: 'El primer usuario', prueba: 'Cinco personas lo usan' },
        frentes: { direccion: { nivel: 'apoyo', que: 'Decidir' }, api: { nivel: 'foco', que: 'Los endpoints' }, web: { nivel: 'espera', que: 'Después' } },
        criterios: [
          { id: 'm_usuarios', texto: 'Cinco personas lo usaron', indicador: 'validaciones_personas', meta: 5 },
          { id: 'm_logran', texto: 'El 80 % lo logra sin ayuda', indicador: 'validaciones_logran', meta: 80, tipos: ['usuarios'] },
          { id: 'm_misiones', texto: 'Las misiones de la fase, aprobadas', indicador: 'misiones' },
        ],
        misiones: ['Los endpoints'],
      },
      {
        id: 'beta', nombre: 'La beta', etapa: 'Beta', meta: 'Abierta a más gente', porQue: 'Para crecer', duracion: 'Hasta 50 usuarios',
        puerta: { nombre: 'Lanzamiento', prueba: '50 usuarios' }, frentes: { web: { nivel: 'foco', que: 'El panel' } }, criterios: [{ id: 'b_lista', texto: 'Lista' }], misiones: [],
      },
    ],
    misiones: [
      ...plantilla.misiones,
      {
        id: 't_diag', para: 'titular', fase: 'arranque', frente: 'direccion', xp: 20, titulo: 'Lee el diagnóstico', porQue: 'Base de todo',
        pasos: [{ texto: 'Lee el diagnóstico.', ir: { doc: 'docs/director/diagnostico.md', etiqueta: 'Leer' } }], entrega: 'Comentarios', documentos: ['docs/director/diagnostico.md'],
      },
      {
        id: 't_alcance', para: 'titular', fase: 'arranque', frente: 'direccion', xp: 20, titulo: 'Lee el alcance', porQue: 'Para decidir',
        pasos: [{ texto: 'Lee el alcance.', ir: { doc: 'docs/director/alcance.md', etiqueta: 'Leer' } }], entrega: 'Comentarios',
      },
      { id: 'c_endpoints', para: 'ana', fase: 'mvp', frente: 'api', xp: 40, titulo: 'Los endpoints', porQue: 'El núcleo', pasos: ['Hazlos'], entrega: 'El PR' },
      { id: 'c_panel', para: 'ana', fase: 'beta', frente: 'web', xp: 30, titulo: 'El panel', porQue: 'Para verlo', pasos: ['Hazlo'], entrega: 'Capturas' },
    ],
    revisiones: {},
    evaluacion: {},
  };
}

const proyecto = (cambios: Partial<Proyecto> = {}): Proyecto => ({
  ...proyectoVacio(),
  nombre: 'API de pedidos',
  equipo: [
    { id: 'titular', nombre: 'Laura', correo: 'laura@ejemplo.co', cargo: 'Directora de proyecto' },
    { id: 'ana', nombre: 'Ana', correo: 'ana@ejemplo.co', cargo: 'Desarrollo' },
  ],
  ...cambios,
});

const firma = { fecha: '2026-10-15', quien: 'Laura' };
const ctx = (plan: Plan, estado: EstadoDirector = estadoVacio(), senales: Contexto['senales'] = {}): Contexto => ({ plan, estado, senales });
const fase = (plan: Plan, id: string) => plan.fases.find((f) => f.id === id)!;

describe('la plantilla de arranque', () => {
  it('es válida, con su proyecto vacío', () => {
    expect(validarPlan(plantilla, ['titular'])).toEqual([]);
    expect(validarProyecto(proyectoPlantilla as unknown as Proyecto)).toEqual([]);
    expect(plantilla.fases.map((f) => f.id)).toEqual(['arranque']);
  });

  it('el ejemplo también es válido', () => {
    expect(validarPlan(planEjemplo(), ['titular', 'ana'])).toEqual([]);
  });
});

describe('el arranque: del repositorio a la ruta', () => {
  it('pasa por conectar, diagnóstico, objetivo y ruta antes de estar en marcha', () => {
    const p: Plan = { ...plantilla, diagnostico: { fecha: '', resumen: [], frentes: {} } };
    expect(etapaArranque(p, proyecto(), false)).toBe('conectar');
    expect(etapaArranque(p, proyecto(), true)).toBe('diagnostico');
    p.diagnostico.fecha = '2026-10-16';
    // Otro computador ya conectó y diagnosticó: aquí no hace falta conectar para seguir
    expect(etapaArranque(p, proyecto(), false)).toBe('objetivo');
    const conObjetivo = proyecto({ objetivo: { texto: 'Cobrar en línea', exito: '10 pagos reales', firmado: firma } });
    expect(etapaArranque(p, conObjetivo, true)).toBe('ruta');
    expect(etapaArranque({ ...planEjemplo(), diagnostico: p.diagnostico }, conObjetivo, true)).toBe('en_marcha');
  });

  it('un proyecto nuevo no pide repositorio: primero se cuenta, después se plantea', () => {
    const p: Plan = { ...plantilla, diagnostico: { fecha: '', resumen: [], frentes: {} } };
    const nuevo = proyecto({ tipo: 'nuevo', contexto: 'Una app de citas para talleres' });
    expect(etapaArranque(p, nuevo, false)).toBe('contar');
    nuevo.metaInicial = 'Que 20 talleres la paguen';
    expect(etapaArranque(p, nuevo, false)).toBe('contar');
    nuevo.terminado = 'Cuando 20 talleres paguen la suscripción';
    expect(etapaArranque(p, nuevo, false)).toBe('diagnostico');
    p.diagnostico.fecha = '2026-10-16';
    expect(etapaArranque(p, nuevo, false)).toBe('objetivo');
  });

  it('cada respuesta del director lleva un tratamiento conocido', () => {
    const p: Plan = { ...planEjemplo(), respuestas: { n1: { cuando: '2026-10-16T10:00:00.000Z', texto: 'Hecho', tratamiento: 'integrada' } } };
    expect(validarPlan(p)).toEqual([]);
    p.respuestas.n2 = { cuando: '2026-10-16T10:00:00.000Z', texto: 'x', tratamiento: 'quizas' as never };
    expect(validarPlan(p)).toHaveLength(1);
  });

  it('el doble check: lo que se lleva al plan dice dónde quedó, y ese lugar existe', () => {
    const cuando = '2026-10-19T10:00:00.000Z';
    const p: Plan = {
      ...planEjemplo(),
      documentos: [{ ruta: 'docs/director/diagnostico.md', titulo: 'Diagnóstico', porQue: 'Base' }],
      respuestas: {
        n1: { cuando, texto: 'Hecho', tratamiento: 'integrada', destino: { vista: 'misiones', ancla: 'mision-c_endpoints', etiqueta: 'Los endpoints' } },
        n2: { cuando, texto: 'Para la beta', tratamiento: 'aplazada' },
        n3: { cuando, texto: 'Entendido', tratamiento: 'informada' },
        n4: { cuando, texto: 'Elegiste A', tratamiento: 'informada' },
        n5: { cuando: '2026-10-01T10:00:00.000Z', texto: 'De antes', tratamiento: 'integrada' },
      },
    };
    const decision = { id: 'n4', cuando, quien: 'Laura', sobre: { tipo: 'documento' as const, id: 'docs/director/diagnostico.md', decision: 'El alcance' }, texto: 'A' };
    expect(validarPlan(p)).toEqual([]);
    // La aplazada sin destino y la decisión del documento, solo informada: les falta; la de antes de esta revisión, no
    expect(respuestasSinDestino(p, [decision], '2026-10-19T00:00:00.000Z')).toEqual(['n2', 'n4']);
    // Aprobar la recomendación también la decide; comentarla sin decidir, no (la decisión sigue abierta)
    const aprueba = { ...decision, sobre: { ...decision.sobre, postura: 'aprueba' as const } };
    const comenta = { ...decision, sobre: { ...decision.sobre, postura: 'comenta' as const } };
    expect(decideDecision(aprueba) && !decideDecision(comenta)).toBe(true);
    expect(respuestasSinDestino(p, [aprueba], '2026-10-19T00:00:00.000Z')).toEqual(['n2', 'n4']);
    expect(respuestasSinDestino(p, [comenta], '2026-10-19T00:00:00.000Z')).toEqual(['n2']);
    p.respuestas.n4.tratamiento = 'rechazada';
    expect(respuestasSinDestino(p, [decision], '2026-10-19T00:00:00.000Z')).toEqual(['n2']);
    // Un destino que no está: una misión, una fase o un documento fuera de la lista del plan
    p.respuestas.n2.destino = { vista: 'ruta', fase: 'gamma', etiqueta: 'La fase' };
    p.respuestas.n1.destino = { vista: 'misiones', ancla: 'mision-nada', etiqueta: 'X' };
    p.respuestas.n3.destino = { doc: 'docs/director/otro.md', etiqueta: 'Otro' };
    expect(validarPlan(p)).toHaveLength(3);
  });

  it('los criterios del arranque se miden con el diagnóstico y el objetivo', () => {
    const p: Plan = { ...plantilla };
    const f = fase(p, 'arranque');
    const diag = f.criterios.find((c) => c.id === 'a_diagnostico')!;
    const obj = f.criterios.find((c) => c.id === 'a_objetivo')!;
    expect(evaluar(diag, f, ctx(p)).cumplido).toBe(false);
    expect(evaluar(diag, f, ctx({ ...p, diagnostico: { fecha: '2026-10-16', resumen: [], frentes: {} } })).cumplido).toBe(true);
    expect(evaluar(obj, f, ctx(p)).valor).toBeNull();
    expect(evaluar(obj, f, ctx(p, estadoVacio(), { proyecto: { objetivo: false } })).cumplido).toBe(false);
    expect(evaluar(obj, f, ctx(p, estadoVacio(), { proyecto: { objetivo: true } })).por).toBe('indicador');
  });
});

describe('fases y puertas', () => {
  it('la fase en curso es la primera sin puerta cerrada', () => {
    const plan = planEjemplo();
    const e = estadoVacio();
    expect(faseActual(plan, e).id).toBe('arranque');
    e.cierres.arranque = firma;
    expect(faseActual(plan, e).id).toBe('mvp');
    expect(situacion(plan, e, 'arranque')).toBe('superada');
    expect(situacion(plan, e, 'mvp')).toBe('actual');
    expect(situacion(plan, e, 'beta')).toBe('futura');
  });

  it('no deja cerrar una puerta con criterios pendientes ni saltarse una fase', () => {
    const plan = planEjemplo();
    const e = estadoVacio();
    expect(bloqueosPuerta(fase(plan, 'arranque'), ctx(plan, e)).length).toBeGreaterThan(0);
    for (const c of fase(plan, 'arranque').criterios) e.marcas[c.id] = { estado: 'cumplido', ...firma };
    expect(bloqueosPuerta(fase(plan, 'arranque'), ctx(plan, e))).toEqual([]);
    expect(bloqueosPuerta(fase(plan, 'beta'), ctx(plan, e))[0]).toMatch(/Antes hay que cerrar/);
  });

  it('un criterio con indicador se cumple solo al llegar a su meta, contando solo las validaciones de su fase y tipo', () => {
    const plan = planEjemplo();
    const e = estadoVacio();
    const mvp = fase(plan, 'mvp');
    const usuarios = mvp.criterios.find((c) => c.id === 'm_usuarios')!;
    expect(evaluar(usuarios, mvp, ctx(plan, e)).cumplido).toBe(false);
    e.validaciones.push({ id: 'v1', fecha: '2026-10-17', fase: 'mvp', tipo: 'usuarios', personas: 3, lograron: 3, aprueban: 2, quien: 'Ana' });
    expect(evaluar(usuarios, mvp, ctx(plan, e)).avance).toBeCloseTo(0.6);
    e.validaciones.push({ id: 'v2', fecha: '2026-10-18', fase: 'mvp', tipo: 'cliente', personas: 2, lograron: 0, aprueban: 1, quien: 'Ana' });
    expect(evaluar(usuarios, mvp, ctx(plan, e))).toMatchObject({ cumplido: true, por: 'indicador', valor: 5 });
    // m_logran solo cuenta las de usuarios: 3 de 3; las de otra fase no cuentan
    e.validaciones.push({ id: 'v3', fecha: '2026-10-18', fase: 'arranque', tipo: 'usuarios', personas: 5, lograron: 0, aprueban: 0, quien: 'Ana' });
    expect(evaluar(mvp.criterios[1], mvp, ctx(plan, e))).toMatchObject({ cumplido: true, valor: 100 });
  });

  it('el indicador de misiones mide las aprobadas de la fase', () => {
    const plan = planEjemplo();
    const mvp = fase(plan, 'mvp');
    const c = mvp.criterios.find((x) => x.id === 'm_misiones')!;
    const e = estadoVacio();
    e.cierres.arranque = firma;
    expect(evaluar(c, mvp, ctx(plan, e)).valor).toBe(0);
    plan.revisiones = { c_endpoints: { cuando: '2026-10-20T10:00:00.000Z', veredicto: 'aprobada', comentario: 'Bien' } };
    expect(evaluar(c, mvp, ctx(plan, e))).toMatchObject({ cumplido: true, valor: 100 });
  });

  it('el director evalúa un criterio, y la decisión del titular manda', () => {
    const plan: Plan = { ...planEjemplo(), evaluacion: { a_contexto: { fecha: '2026-10-15', estado: 'cumplido', nota: 'Contado en Proyecto' } } };
    const f = fase(plan, 'arranque');
    const c = f.criterios.find((x) => x.id === 'a_contexto')!;
    expect(evaluar(c, f, ctx(plan))).toMatchObject({ cumplido: true, por: 'director' });
    const e = estadoVacio();
    e.marcas.a_contexto = { estado: 'no_aplica', ...firma, nota: 'Ya lo conté por audio' };
    expect(evaluar(c, f, ctx(plan, e)).por).toBe('no_aplica');
    // Sin diagnóstico ni objetivo firmado, solo cuenta el contexto
    expect(avanceFase(f, ctx(plan, e))).toMatchObject({ cumplidos: 1, total: 4 });
  });
});

describe('esfuerzo en el repositorio del proyecto', () => {
  it('cada ruta va al frente de su prefijo más largo', () => {
    const plan = planEjemplo();
    expect(frenteDeRuta(plan, 'server/routes/pedidos.ts')).toBe('api');
    expect(frenteDeRuta(plan, 'server/db/esquema.sql')).toBe('datos');
    expect(frenteDeRuta(plan, './web/src/App.tsx')).toBe('web');
    expect(frenteDeRuta(plan, 'web\\index.html')).toBe('web');
    expect(frenteDeRuta(plan, 'README.md')).toBe('otros');
  });

  it('reparte un commit entre sus frentes y mide cuánto fue al foco; un frente que la fase no nombra está en espera', () => {
    const plan = planEjemplo();
    expect(repartirCommit(plan, ['server/a.ts', 'web/b.ts'])).toEqual({ api: 0.5, web: 0.5 });
    const commits: CommitFrentes[] = [
      { fecha: '2026-10-14', frentes: { api: 1 } },
      { fecha: '2026-10-14', frentes: { web: 1 } },
      { fecha: '2026-10-14', frentes: { datos: 0.5, api: 0.5 } },
      { fecha: '2026-10-14', frentes: { otros: 1 } },
    ];
    expect(trabajoDe(fase(plan, 'mvp'), 'datos').nivel).toBe('espera');
    expect(repartoPorNivel(fase(plan, 'mvp'), commits)).toEqual({ foco: 37.5, apoyo: 0, espera: 37.5, otros: 25 });
  });
});

describe('excepciones y validaciones', () => {
  it('una excepción vale hasta su fecha y hasta que se cierra', () => {
    const e = estadoVacio();
    e.excepciones.push({ id: 'x1', fecha: '2026-10-14', quien: 'Ana', frente: 'web', fase: 'mvp', motivo: 'Un error que bloquea la validación', hasta: sumarDias('2026-10-14', 7) });
    expect(excepcionesActivas(e, '2026-10-21', 'web')).toHaveLength(1);
    expect(excepcionesActivas(e, '2026-10-22', 'web')).toHaveLength(0);
    e.excepciones[0].cerrada = firma;
    expect(excepcionesActivas(e, '2026-10-16')).toHaveLength(0);
  });

  it('el estado rechaza validaciones imposibles y marcas «no aplica» sin razón', () => {
    const plan = planEjemplo();
    const e = estadoVacio();
    e.validaciones.push({ id: 'v1', fecha: '2026-10-17', fase: 'mvp', tipo: 'usuarios', personas: 3, lograron: 4, aprueban: 1, quien: 'Ana' });
    e.marcas.a_leido = { estado: 'no_aplica', ...firma };
    expect(validarEstado(e, plan)).toHaveLength(2);
  });
});

describe('misiones', () => {
  it('pasan de por hacer a entregada, y el director las aprueba o pide rehacerlas', () => {
    const p = planEjemplo();
    const e = estadoVacio();
    e.cierres.arranque = firma;
    const m = p.misiones.find((x) => x.id === 'c_endpoints')!;
    expect(estadoMision(m, p, e)).toBe('pendiente');
    e.empezadas.c_endpoints = { cuando: '2026-10-15T10:00:00.000Z', quien: 'Ana' };
    expect(estadoMision(m, p, e)).toBe('en_curso');
    e.entregas.c_endpoints = { cuando: '2026-10-15T12:00:00.000Z', quien: 'Ana', nota: 'Listos' };
    expect(estadoMision(m, p, e)).toBe('entregada');
    p.revisiones = { c_endpoints: { cuando: '2026-10-15T13:00:00.000Z', veredicto: 'rehacer', comentario: 'Faltan las pruebas' } };
    expect(estadoMision(m, p, e)).toBe('rehacer');
    expect(xpDe(p, e, 'ana')).toBe(0);
    // Una entrega nueva vuelve a esperar al director, y su aprobación da la experiencia
    e.entregas.c_endpoints = { cuando: '2026-10-15T15:00:00.000Z', quien: 'Ana', nota: 'Con pruebas' };
    expect(estadoMision(m, p, e)).toBe('entregada');
    p.revisiones = { c_endpoints: { cuando: '2026-10-15T16:00:00.000Z', veredicto: 'aprobada', comentario: 'Bien' } };
    expect(estadoMision(m, p, e)).toBe('aprobada');
    expect(xpDe(p, e, 'ana')).toBe(m.xp);
    // Las de una fase futura están bajo niebla
    expect(estadoMision(p.misiones.find((x) => x.id === 'c_panel')!, p, e)).toBe('bloqueada');
  });

  it('lo que hay que rehacer va primero en la cola', () => {
    const p = planEjemplo();
    const e = estadoVacio();
    expect(misionesAbiertas(p, e, 'titular').map((m) => m.id)).toEqual(['t_conectar', 't_diag', 't_alcance']);
    e.entregas.t_alcance = { cuando: '2026-10-15T09:00:00.000Z', quien: 'Laura' };
    p.revisiones = { t_alcance: { cuando: '2026-10-15T10:00:00.000Z', veredicto: 'rehacer', comentario: '' } };
    expect(misionesAbiertas(p, e, 'titular')[0].id).toBe('t_alcance');
  });
});

describe('llevar de la mano', () => {
  it('todo paso de la plantilla que manda a abrir, leer, mirar, buscar, responder o grabar algo trae su botón', () => {
    const VERBOS = /^(Abre|Lee|Mira|Busca|Baja|Responde|Regístra|Graba|Lo que (no te cuadre|prefieras))/;
    const sinBoton = plantilla.misiones.flatMap((m) =>
      m.pasos.filter((p) => VERBOS.test(typeof p === 'string' ? p : p.texto) && (typeof p === 'string' || !p.ir)).map((p) => `${m.id}: ${typeof p === 'string' ? p : p.texto}`),
    );
    expect(sinBoton).toEqual([]);
  });

  it('un paso que no dice a dónde lleva, o lleva afuera sin https, es un error del plan', () => {
    const p = planEjemplo();
    p.misiones[0] = { ...p.misiones[0], pasos: [{ texto: 'Abre esto', ir: { etiqueta: 'Ir' } }, { texto: 'Mira', ir: { url: 'http://ejemplo.co', etiqueta: 'Ver' } }, { texto: 'Prueba local', ir: { url: 'http://localhost:3000/', etiqueta: 'Abrir' } }] };
    expect(validarPlan(p)).toHaveLength(2);
  });
});

describe('un equipo, un estado', () => {
  it('une lo de cada persona: decisiones solo del titular, listas juntas y lo retirado fuera', () => {
    const t = { ...estadoPersonaVacio(), marcas: { a_leido: { estado: 'cumplido' as const, ...firma } } };
    const a = { ...estadoPersonaVacio(), marcas: { a_contexto: { estado: 'cumplido' as const, fecha: '2026-10-15', quien: 'Ana' } } };
    const b = estadoPersonaVacio();
    a.notas.push({ id: 'n1', cuando: '2026-10-15T10:00:00.000Z', quien: 'Ana', sobre: { tipo: 'general' }, texto: 'Hola' });
    a.notas.push({ id: 'n2', cuando: '2026-10-15T11:00:00.000Z', quien: 'Ana', sobre: { tipo: 'general' }, texto: 'Sobra' });
    t.notas.push({ id: 'n3', cuando: '2026-10-15T10:30:00.000Z', quien: 'Laura', sobre: { tipo: 'general' }, texto: 'Hola, Ana' });
    b.notas.push({ id: 'n4', cuando: '2026-10-15T09:00:00.000Z', quien: 'Beto', sobre: { tipo: 'mision', id: 'c_endpoints', seccion: 'Paso 1' }, texto: 'Duda' });
    a.excepciones.push({ id: 'x1', fecha: '2026-10-15', quien: 'Ana', frente: 'web', fase: 'mvp', motivo: 'Un error', hasta: '2026-10-20' });
    a.entregas.c_endpoints = { cuando: '2026-10-15T12:00:00.000Z', quien: 'Ana' };
    t.retirados = { n2: firma, x1: { fecha: '2026-10-16', quien: 'Laura' } };
    const u = unirEstados({ titular: t, ana: a, beto: b });
    expect(Object.keys(u.marcas)).toEqual(['a_leido']);
    expect(u.notas.map((n) => `${n.id}:${n.de}`)).toEqual(['n4:beto', 'n1:ana', 'n3:titular']);
    expect(u.excepciones[0].cerrada?.quien).toBe('Laura');
    expect(u.entregas.c_endpoints.quien).toBe('Ana');
    // Retirar una entrega no retira la siguiente de la misma misión
    t.retirados[claveEntrega('c_endpoints', '2026-10-15T12:00:00.000Z')] = firma;
    expect(unirEstados({ titular: t, ana: a }).entregas.c_endpoints).toBeUndefined();
    a.entregas.c_endpoints = { cuando: '2026-10-16T09:00:00.000Z', quien: 'Ana' };
    expect(unirEstados({ titular: t, ana: a }).entregas.c_endpoints?.cuando).toBe('2026-10-16T09:00:00.000Z');
  });

  it('los pasos marcados viajan con lo demás: de cada misión vale lo último que se marcó', () => {
    const t = estadoPersonaVacio();
    const a = estadoPersonaVacio();
    a.pasos = { c_endpoints: { hechos: [0], cuando: '2026-10-15T10:00:00.000Z', quien: 'Ana' } };
    t.pasos = { c_endpoints: { hechos: [0, 1], cuando: '2026-10-15T11:00:00.000Z', quien: 'Laura' } };
    expect(unirEstados({ titular: t, ana: a }).pasos?.c_endpoints.hechos).toEqual([0, 1]);
    // Los archivos de antes no traen pasos: se leen igual
    const viejo: Partial<EstadoPersona> = { ...estadoPersonaVacio() };
    delete viejo.pasos;
    expect(unirEstados({ titular: viejo, ana: a }).pasos?.c_endpoints.hechos).toEqual([0]);
  });

  it('el proyecto exige un solo titular y correos únicos', () => {
    expect(validarProyecto(proyecto())).toEqual([]);
    expect(validarProyecto(proyecto({ equipo: [{ id: 'ana', nombre: 'Ana', correo: 'ana@ejemplo.co' }] }))).toEqual(['El equipo no tiene titular.']);
    const repetido = proyecto();
    repetido.equipo[1].correo = 'LAURA@ejemplo.co';
    expect(validarProyecto(repetido)).toHaveLength(1);
  });
});

describe('un solo orden de lectura, siempre hacia adelante', () => {
  it('los documentos van en el orden de las misiones, y lo revisado queda sellado aunque cambie', () => {
    const p = planEjemplo();
    const e = estadoVacio();
    const orden = () => documentosEnOrden(p, e, 'titular').map((d) => `${d.ruta.split('/').pop()}:${d.estado}`);
    expect(orden()).toEqual(['diagnostico.md:siguiente', 'alcance.md:pendiente']);
    e.entregas.t_diag = { cuando: '2026-10-15T10:00:00.000Z', quien: 'Laura' };
    expect(orden()).toEqual(['alcance.md:siguiente', 'diagnostico.md:revisado']);
    // Si el director lo cambia después, no vuelve a la lista: queda sellado, y el freno se lo marca al director
    expect(selladosQueCambiaron(p, e, { 'docs/director/diagnostico.md': '2026-10-15T12:00:00.000Z' }).map((x) => x.ruta)).toEqual(['docs/director/diagnostico.md']);
    expect(selladosQueCambiaron(p, e, { 'docs/director/diagnostico.md': '2026-10-15T09:00:00.000Z' })).toEqual([]);
  });

  it('se leen documentos de este Estudio y del repositorio del proyecto, nunca fuera de ellos', () => {
    expect(esDocumento('docs/director/diagnostico.md')).toBe(true);
    expect(esDocumento('repo:README.md')).toBe(true);
    expect(esDocumento('repo:docs/arquitectura.md')).toBe(true);
    expect(esDocumento('repo:../secreto.md')).toBe(false);
    expect(esDocumento('contenido/proyecto.json')).toBe(false);
  });

  it('solo se abre el documento que sigue: lo de después espera a que termines de leerlo', () => {
    const p = planEjemplo();
    p.misiones[0] = { ...p.misiones[0], documentos: ['docs/director/diagnostico.md', 'docs/director/extra.md', 'docs/director/otro.md'] };
    const filas = documentosEnOrden(p, estadoVacio(), 'titular');
    const lectura = (leidos: string[]) => enLectura(filas, (r) => leidos.includes(r)).map((d) => `${d.ruta.split('/').pop()}:${d.lectura}`);
    expect(lectura([])).toEqual(['diagnostico.md:siguiente', 'extra.md:despues', 'otro.md:despues', 'alcance.md:despues']);
    expect(lectura(['docs/director/diagnostico.md'])).toEqual(['diagnostico.md:leido', 'extra.md:siguiente', 'otro.md:despues', 'alcance.md:despues']);
  });

  it('las partes que se marcan como leídas: cada ## y la entrada si dice algo más que el título', () => {
    expect(partesDeDocumento('# Título\n\n## 1. Lo que entendí\nTexto\n\n## 2. **El alcance**\nMás')).toEqual(['1. Lo que entendí', '2. El alcance']);
    // La entrada no se marca (es el título y quién lo escribió), salvo que el documento no tenga partes
    expect(partesDeDocumento('# Título\n\nUna entrada.\n\n## Uno\nA\n```\n## no es parte\n```')).toEqual(['Uno']);
    expect(partesDeDocumento('# Título\n\nSolo una entrada.')).toEqual(['']);
    expect(partesDeDocumento('# Título')).toEqual([]);
  });

  it('lo leído es de cada quien: no se cuela lo que otro escribió a nombre ajeno', () => {
    const marca = { partes: ['Uno'], cuando: '2026-10-18T10:00:00.000Z', quien: 'Ana' };
    const e = unirEstados({ titular: estadoPersonaVacio(), ana: { ...estadoPersonaVacio(), leidos: { 'ana:docs/x.md': marca, 'titular:docs/x.md': marca } } });
    expect(Object.keys(e.leidos ?? {})).toEqual(['ana:docs/x.md']);
  });
});

describe('cada decisión, con su propio comentario', () => {
  it('toma la última lista numerada de una parte que pide decidir, con el nombre en negrilla', () => {
    const md = 'Texto.\n\n1. Un paso\n2. Otro paso\n\n**Para decidir:**\n\n1. **El alcance del MVP.** A, B o C.\n   - detalle\n2. **El primer cliente:** ¿quién?\n3. Algo sin negrilla que es largo';
    expect(decisionesDe('3. El alcance', md)).toEqual(['1. El alcance del MVP', '2. El primer cliente', '3. Algo sin negrilla que es largo']);
    expect(decisionesDe('5. Lo que falta que decidas', '1. **Uno.**\n2. **Dos**')).toEqual(['1. Uno', '2. Dos']);
    expect(decisionesDe('2. Los pilares', '1. Uno\n2. Dos')).toEqual([]);
    expect(decisionesDe('3. El mapa', '1. Todo empieza cerca.\n2. Los lugares ancla.\n\n**Para decidir:** ¿estás de acuerdo?')).toEqual([]);
  });
});

describe('cada parte, en ideas que se leen de a una', () => {
  /** Un punto que es una idea completa, no un renglón suelto. */
  const punto = (s: string) => `- ${s}, con una explicación que la vuelve una idea completa y no un renglón suelto.`;
  it('parte en párrafos, puntos de primer nivel y bloques; los puntos de la lista de decisiones llevan su nombre', () => {
    const md = '## 3. El alcance\n\nUn párrafo\nque sigue.\n\n1. Un paso\n   - con detalle\n2. Otro paso\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n**Para decidir:**\n\n1. **El alcance del MVP.** A, B o C.\n\n   Con un segundo párrafo.\n2. **El primer cliente:** ¿quién?\n';
    const t = trozosDeParte('3. El alcance', md);
    // La lista de pasos cortos se lee de una vez, y el párrafo de una línea va con ella
    expect(t.map((x) => x.tipo)).toEqual(['punto', 'bloque', 'rotulo', 'punto', 'punto']);
    expect(t[0].md).toBe('Un párrafo\nque sigue.\n\n1. Un paso\n   - con detalle\n2. Otro paso');
    expect(t[3].md).toContain('Con un segundo párrafo.');
    expect(t.map((x) => x.decision ?? '')).toEqual(['', '', '', '1. El alcance del MVP', '2. El primer cliente']);
  });

  it('un párrafo de una línea no es una idea aparte: va con el párrafo de antes, o con el de después', () => {
    const largo = 'Si decides que el equipo entra, agrego una fase entre la 3 y la 4, con los pasos 1 y 2 de esa planeación, y la prueba de afuera se hace con dos personas.';
    const corto = 'Esa decisión ya tiene su lugar: respóndela allí.';
    expect(trozosDeParte('4. El equipo', `${largo}\n\n${corto}`).map((x) => x.md)).toEqual([`${largo}\n\n${corto}`]);
    expect(trozosDeParte('4. El equipo', `${corto}\n\n${largo}`).map((x) => x.md)).toEqual([`${corto}\n\n${largo}`]);
    // Entre una lista y una tabla, sin párrafos al lado, va con lo que sigue: nunca queda sola
    expect(trozosDeParte('4. El equipo', `- Uno\n\n${corto}\n\n| a |\n|---|`).map((x) => x.md)).toEqual(['- Uno', `${corto}\n\n| a |\n|---|`]);
    // Al final, después de un bloque, va con lo de antes
    expect(trozosDeParte('4. El equipo', `- Uno\n\n${corto}`).map((x) => x.md)).toEqual([`- Uno\n\n${corto}`]);
  });

  it('un título suelto (en negrilla, sin «:», o con ###) nunca es una idea sola: va con lo que presenta', () => {
    const P = '4. Pros y contras';
    const punto = (n: number) => `- ${'Una razón con su explicación completa. '.repeat(n).trimEnd()}`;
    // Su lista corta, entera; de una larga, el primer punto
    const md = `**A favor**\n\n${punto(2)}\n${punto(2)}\n\n**En contra**\n\n${punto(8)}\n${punto(8)}\n${punto(8)}`;
    const t = trozosDeParte(P, md);
    expect(t.map((x) => x.md)).toEqual([`**A favor**\n\n${punto(2)}\n\n${punto(2)}`, `**En contra**\n\n${punto(8)}`, punto(8), punto(8)]);
    // Un ### con su párrafo
    const largo = 'Un párrafo largo que explica algo con suficiente detalle para ser una idea completa, con sus datos y su razón, sin relleno ni repeticiones.';
    expect(trozosDeParte(P, `### El costo\n\n${largo}`).map((x) => x.md)).toEqual([`### El costo\n\n${largo}`]);
    // Ninguna idea queda en una línea corta, ni en el caso de la captura
    for (const x of t) expect(x.md.replace(/[*_`#]/g, '').trim().length).toBeGreaterThan(40);
    // Lo ya entendido por separado sigue entendido al juntarse
    const marcas = [claveIdea(P, '**A favor**'), claveIdea(P, punto(2))];
    expect(estadoIdeas(P, md, marcas).entendida[0]).toBe(true);
    // La lista de decisiones sigue con su rótulo aparte
    const dec = trozosDeParte(P, `**Para decidir:**\n\n1. **Uno.** Recomiendo A.`);
    expect(dec.map((x) => x.tipo)).toEqual(['rotulo', 'punto']);
    expect(dec[1].decision).toBe('1. Uno');
  });

  it('un párrafo que termina en «:» va con lo que anuncia: su lista corta entera, el primer punto de una larga, o su bloque', () => {
    const P = '3. El diagnóstico';
    const intro = 'Hoy Proyecto, Diagnóstico y la meta son tres lugares, y la meta muestra sus candidatas aunque ya hayas elegido. Recomiendo:';
    const corta = trozosDeParte(P, `${intro}\n\n- Uno.\n- Dos.\n\nOtro párrafo que sigue y dice algo distinto, con suficiente largo para ser una idea por sí solo, sin juntarse con nadie.`);
    expect(corta.map((x) => x.md)).toEqual([`${intro}\n\n- Uno.\n\n- Dos.`, expect.stringContaining('Otro párrafo')]);
    const largo = 'x'.repeat(500);
    const larga = trozosDeParte(P, `${intro}\n\n- ${largo}\n- ${largo}`);
    expect(larga.map((x) => x.md)).toEqual([`${intro}\n\n- ${largo}`, `- ${largo}`]);
    expect(trozosDeParte(P, `Un boceto:\n\n\`\`\`\nuno\n\`\`\``).map((x) => x.tipo)).toEqual(['bloque']);
    // La lista de decisiones no se junta con lo de antes
    const dec = trozosDeParte(P, `${intro}\n\n1. **Uno.** Recomiendo A.`.replace('Recomiendo:', 'Para decidir:'));
    expect(dec.map((x) => x.decision ?? '')).toEqual(['', '1. Uno']);
    // Lo que ya se había entendido por separado sigue entendido al juntarse
    const marcas = [claveIdea(P, intro), claveIdea(P, `- ${largo}`)];
    expect(estadoIdeas(P, `${intro}\n\n- ${largo}\n- ${largo}`, marcas).entendida).toEqual([true, true]);
  });

  it('sin «Para decidir», ningún punto es una decisión; el código no se parte', () => {
    const t = trozosDeParte('2. Los pilares', `${punto('Uno')}\n${punto('Dos')}\n\n\`\`\`\nuno\n\ndos\n\`\`\`\n\nFin.`);
    expect(t.map((x) => x.tipo)).toEqual(['punto', 'punto', 'bloque']);
    expect(t[2].md).toBe('```\nuno\n\ndos\n```\n\nFin.');
    expect(t.some((x) => x.decision)).toBe(false);
  });

  it('una idea entendida se reconoce por lo que dice: si el director la reescribe, vuelve a quedar por leer', () => {
    const P = '2. El alcance';
    const [uno, dos, tres, cero, cuatro] = ['Uno', 'Dos', 'Tres', 'Cero', 'Cuatro'].map(punto);
    const antes = `${uno}\n${dos}\n${tres}`;
    const marcas = trozosDeParte(P, antes).map((t) => claveIdea(P, t.md));
    // Se reescribe la segunda: las otras conservan su marca; la segunda está por leer y dice que cambió
    const despues = estadoIdeas(P, `${uno}\n${dos}, ahora distinta\n${tres}`, marcas);
    expect(despues.entendida).toEqual([true, false, true]);
    expect(despues.cambio).toEqual([false, true, false]);
    // Una idea nueva al comienzo no corre las marcas de las demás
    expect(estadoIdeas(P, `${cero}\n${antes}`, marcas).entendida).toEqual([false, true, true, true]);
    // Al final de una parte ya leída idea por idea, una nueva también reabre la parte
    expect(estadoIdeas(P, `${antes}\n${cuatro}`, marcas, true).cambio).toEqual([false, false, false, true]);
    // Leída entera con su estrella (sin marcas de ideas), no se reabre
    expect(estadoIdeas(P, `${antes}\n${cuatro}`, [], true).cambio.some(Boolean)).toBe(false);
    // Lo que aún no se lee no se marca como cambiado
    expect(estadoIdeas(P, antes, [claveIdea(P, uno)]).cambio).toEqual([false, false, false]);
  });

  it('una lista de puntos de un renglón se lee de una vez', () => {
    const P = '2. El alcance';
    const t = trozosDeParte(P, '- Uno\n- Dos\n- Tres');
    expect(t.map((x) => x.md)).toEqual(['- Uno\n- Dos\n- Tres']);
    // Lo ya entendido punto por punto sigue entendido
    expect(estadoIdeas(P, '- Uno\n- Dos\n- Tres', ['- Uno', '- Dos', '- Tres'].map((x) => claveIdea(P, x))).entendida).toEqual([true]);
  });

  it('el control de los cortes encuentra las ideas que quedarían en un renglón suelto', () => {
    const largo = 'Un párrafo largo que explica algo con suficiente detalle para ser una idea completa, con sus datos y su razón.';
    expect(ideasSueltas(`# Doc\n\n## 1. Bien\n\n**A favor**\n\n${punto('Uno')}\n\n### El costo\n\n${largo}`)).toEqual([]);
    expect(ideasSueltas(`# Doc\n\n## 2. Mal\n\n- Solo esto\n\n| a |\n|---|\n\n${largo}`)).toEqual([{ parte: '2. Mal', idea: '- Solo esto' }]);
  });

  it('las marcas de antes, por número, se respetan y pasan a la huella de lo que dicen hoy', () => {
    const P = '2. El alcance';
    const [uno, dos, tres] = ['Uno', 'Dos', 'Tres'].map(punto);
    const md = `${uno}\n${dos}\n${tres}`;
    const viejas = [claveTrozo(P, 0), claveTrozo(P, 2), 'Otra parte§1'];
    expect(estadoIdeas(P, md, viejas).entendida).toEqual([true, false, true]);
    const al = marcasAlDia([{ titulo: P, md }], viejas);
    expect(al.sort()).toEqual([claveIdea(P, uno), claveIdea(P, tres), 'Otra parte§1'].sort());
    expect(estadoIdeas(P, md, al).entendida).toEqual([true, false, true]);
  });
});

describe('las preguntas al director, aparte de los comentarios', () => {
  it('una pregunta es una nota válida, se reconoce y le llega al director como cualquier nota', () => {
    const pregunta = { id: 'n1', cuando: '2026-10-16T10:00:00.000Z', quien: 'Laura', sobre: { tipo: 'pregunta' as const }, texto: '¿Por qué la seguridad va antes que los pagos?' };
    const comentario = { id: 'n2', cuando: '2026-10-16T10:05:00.000Z', quien: 'Laura', sobre: { tipo: 'general' as const }, texto: 'Me gusta la ruta' };
    const e = { ...estadoVacio(), notas: [pregunta, comentario] };
    const plan = planPlantilla as unknown as Plan;
    expect(validarEstado(e, plan)).toEqual([]);
    expect(e.notas.filter(esPregunta).map((n) => n.id)).toEqual(['n1']);
    expect(pendientesDelDirector(plan, e).notas.map((n) => n.id)).toEqual(['n1', 'n2']);
  });

  it('lo que se sigue preguntando sobre una respuesta va en el hilo de su pregunta', () => {
    const q = (id: string, cuando: string, sigue?: string) => ({ id, cuando, quien: 'Laura', sobre: { tipo: 'pregunta' as const, ...(sigue ? { id: sigue } : {}) }, texto: id });
    const notas = [q('a', '2026-10-16T10:00:00Z'), q('b', '2026-10-16T11:00:00Z'), q('a2', '2026-10-17T09:00:00Z', 'a'), q('a3', '2026-10-17T10:00:00Z', 'a2'), { id: 'c', cuando: '2026-10-17T11:00:00Z', quien: 'Laura', sobre: { tipo: 'general' as const }, texto: 'un comentario' }];
    expect(raizDePregunta(notas[3], notas).id).toBe('a');
    const hilos = hilosDePreguntas(notas);
    expect(hilos.map((h) => [h.raiz.id, h.notas.map((n) => n.id)])).toEqual([['a', ['a', 'a2', 'a3']], ['b', ['b']]]);
  });

  it('cuenta las urgencias de los últimos 7 días, para que sigan siendo raras', () => {
    const nota = (id: string, cuando: string, urgente?: string) => ({ id, cuando, quien: 'Laura', sobre: { tipo: 'general' as const }, texto: 'x', ...(urgente ? { urgente } : {}) });
    const ahora = Date.parse('2026-10-18T12:00:00Z');
    const notas = [nota('a', '2026-10-17T10:00:00Z', 'Se cae en producción'), nota('b', '2026-10-17T11:00:00Z'), nota('c', '2026-10-05T10:00:00Z', 'Vieja')];
    expect(urgenciasDeLaSemana(notas, ahora).map((n) => n.id)).toEqual(['a']);
    // la casilla nueva (sin razón aparte) también cuenta
    expect(urgenciasDeLaSemana([{ ...nota('d', '2026-10-18T10:00:00Z'), urgente: true }], ahora)).toHaveLength(1);
  });

  it('una nota puede llevar solo adjuntos, y cada adjunto vive en la carpeta de notas del proyecto', () => {
    const plan = planPlantilla as unknown as Plan;
    const nota = (ruta: string) => ({ id: 'n1', cuando: '2026-10-18T10:00:00Z', quien: 'Laura', sobre: { tipo: 'general' as const }, adjuntos: [{ ruta, nombre: 'captura.png', bytes: 2048 }] });
    expect(validarEstado({ ...estadoVacio(), notas: [nota('proyectos/golf/director/notas/adjuntos/n1-1.png')] }, plan)).toEqual([]);
    expect(validarEstado({ ...estadoVacio(), notas: [nota('proyectos/golf/director/notas/../../plan.json')] }, plan)).toHaveLength(1);
    expect(validarEstado({ ...estadoVacio(), notas: [{ ...nota('x'), adjuntos: [] }] }, plan)).toEqual(['La nota n1 está vacía.']);
    expect(esImagen('a/b.PNG') && esImagen('x.webp') && !esImagen('x.svg') && !esImagen('x.pdf')).toBe(true);
  });
});

describe('los pasos que se hacen en el Studio se marcan solos', () => {
  const mision = (pasos: Paso[]): Mision => ({ id: 't_meta', para: 'titular', fase: 'arranque', frente: 'direccion', xp: 20, titulo: 'La meta', porQue: 'Para la ruta', pasos, entrega: 'La meta' });
  const objetivo = { texto: 'Publicarlo', exito: 'Alguien lo instala', firmado: { fecha: '2026-10-19', quien: 'Laura' } };

  it('la meta fijada o reabierta, desde una fecha', () => {
    const m = mision([{ texto: 'Fija la meta', hecho: { que: 'meta_fijada', desde: '2026-10-19T08:00:00Z' } }, { texto: 'Reábrela', hecho: { que: 'meta_reabierta' } }]);
    expect(pasosVistos(m, proyecto(), estadoVacio())).toEqual([]);
    expect(pasosVistos(m, proyecto({ objetivo: { ...objetivo, firmado: { ...objetivo.firmado, fecha: '2026-10-17' } } }), estadoVacio())).toEqual([]);
    expect(pasosVistos(m, proyecto({ objetivo, objetivosAnteriores: [{ ...objetivo, reabierto: firma }] }), estadoVacio())).toEqual([0, 1]);
    // Lo ya marcado no se vuelve a marcar
    expect(pasosVistos(m, proyecto({ objetivo }), { ...estadoVacio(), pasos: { t_meta: { hechos: [0], cuando: 'x', quien: 'Laura' } } })).toEqual([]);
  });

  it('un documento o una parte leídos, una propuesta respondida, una puerta cruzada y una nota', () => {
    const hecho = (h: Hecho) => pasoHecho(h, 'titular', proyecto(), estado);
    const estado: EstadoDirector = {
      ...estadoVacio(),
      leidos: { 'titular:docs/director/ruta.md': { partes: ['2. El orden'], completo: false, cuando: 'x', quien: 'Laura' } },
      propuestas: { pr_a: { ...firma, estado: 'aceptada' } },
      cierres: { arranque: firma },
      notas: [
        { id: 'n1', cuando: '2026-10-19T10:00:00Z', quien: 'Laura', de: 'titular', sobre: { tipo: 'documento', id: 'docs/director/alcance.md', seccion: '**1. Lo que entendí**' }, texto: 'Ok' },
        { id: 'n2', cuando: '2026-10-19T11:00:00Z', quien: 'Ana', de: 'ana', sobre: { tipo: 'general' }, texto: 'Hola' },
      ],
    };
    expect(hecho({ que: 'leido', id: 'docs/director/ruta.md' })).toBe(false);
    expect(hecho({ que: 'leido', id: 'docs/director/ruta.md', seccion: '2. El orden' })).toBe(true);
    expect(hecho({ que: 'leido', id: 'docs/director/alcance.md', seccion: '1. Lo que entendí' })).toBe(true);
    expect(hecho({ que: 'propuesta', id: 'pr_a' }) && !hecho({ que: 'propuesta', id: 'pr_b' })).toBe(true);
    expect(hecho({ que: 'propuesta', id: 'pr_a', desde: '2026-10-16T00:00:00Z' })).toBe(false);
    expect(hecho({ que: 'puerta', id: 'arranque' }) && !hecho({ que: 'puerta', id: 'mvp' })).toBe(true);
    // Solo las notas de la persona de la misión, y desde cuando se dice
    expect(hecho({ que: 'nota', tipo: 'general' })).toBe(false);
    expect(hecho({ que: 'nota', tipo: 'documento', desde: '2026-10-19T09:00:00Z' })).toBe(true);
    expect(hecho({ que: 'nota', desde: '2026-10-19T10:30:00Z' })).toBe(false);
  });

  it('validarPlan revisa lo que marca cada paso y su detalle', () => {
    const p = planEjemplo();
    const con = (paso: Paso) => validarPlan({ ...p, misiones: [...p.misiones, mision([paso])] }, ['titular', 'ana']);
    expect(con({ texto: 'Fija la meta', hecho: { que: 'meta_fijada' }, detalle: ['Abre Proyecto', 'Oprime «Fijar esta meta»'] })).toEqual([]);
    expect(con({ texto: 'Cruza', hecho: { que: 'puerta', id: 'arranque' } })).toEqual([]);
    expect(con({ texto: 'Cruza', hecho: { que: 'puerta', id: 'nada' } })).toHaveLength(1);
    expect(con({ texto: 'Lee', hecho: { que: 'leido' } })).toHaveLength(1);
    expect(con({ texto: 'Responde', hecho: { que: 'propuesta', id: 'pr_x' } })).toHaveLength(1);
    expect(con({ texto: 'Algo', hecho: { que: 'otra' as Hecho['que'] } })).toHaveLength(1);
    expect(con({ texto: 'Algo', detalle: ['Bien', ''] })).toHaveLength(1);
  });

  it('un paso con opciones se marca solo al elegir una, y validarPlan las revisa', () => {
    const m = mision(['Lee', { texto: '¿LICENSE dice ARGWABOT?', opciones: ['Sí', 'No'] }]);
    const eleccion = (de: string, seccion: string): Nota => ({ id: `n-${de}`, cuando: '2026-10-19T10:00:00Z', quien: de, de, sobre: { tipo: 'mision', id: 't_meta', seccion, eleccion: 'Sí' }, texto: 'Sí' });
    expect(pasosVistos(m, proyecto(), estadoVacio())).toEqual([]);
    // Solo la elección de la persona de la misión, en ese paso
    expect(pasosVistos(m, proyecto(), { ...estadoVacio(), notas: [eleccion('ana', 'Paso 2'), eleccion('titular', 'Paso 1')] })).toEqual([]);
    expect(pasosVistos(m, proyecto(), { ...estadoVacio(), notas: [eleccion('titular', 'Paso 2')] })).toEqual([1]);
    expect(eleccionDe([eleccion('titular', 'Paso 2')], 't_meta', 1, 'titular')?.sobre.eleccion).toBe('Sí');
    const p = planEjemplo();
    const con = (paso: Paso) => validarPlan({ ...p, misiones: [...p.misiones, mision([paso])] }, ['titular', 'ana']);
    expect(con({ texto: 'Elige', opciones: ['Sí', 'No'] })).toEqual([]);
    expect(con({ texto: 'Elige', opciones: ['Sí'] })).toHaveLength(1);
    expect(con({ texto: 'Elige', opciones: ['Sí', 'sí'] })).toHaveLength(1);
    expect(con({ texto: 'Elige', opciones: ['Sí', ''] })).toHaveLength(1);
    expect(con({ texto: 'Elige', opciones: ['Sí', 'No'], hecho: { que: 'nota' } })).toHaveLength(1);
  });

  it('«Hazlo tú»: un paso encargado al director se marca solo, y validarPlan lo revisa', () => {
    const m = mision(['Lee', { texto: 'Vuelve a firmar el commit con tu identidad', hazlo: 'Configuro git en el Studio y reescribo el último commit.' }]);
    const encargo = (de: string, seccion: string): Nota => ({ id: `n-${de}`, cuando: '2026-10-19T10:00:00Z', quien: de, de, sobre: { tipo: 'mision', id: 't_meta', seccion, hazlo: true }, texto: 'Hazlo tú' });
    expect(pasosVistos(m, proyecto(), estadoVacio())).toEqual([]);
    expect(pasosVistos(m, proyecto(), { ...estadoVacio(), notas: [encargo('ana', 'Paso 2'), encargo('titular', 'Paso 1')] })).toEqual([]);
    expect(pasosVistos(m, proyecto(), { ...estadoVacio(), notas: [encargo('titular', 'Paso 2')] })).toEqual([1]);
    expect(encargoDe([encargo('titular', 'Paso 2')], 't_meta', 1, 'titular')?.id).toBe('n-titular');
    const p = planEjemplo();
    const con = (paso: Paso) => validarPlan({ ...p, misiones: [...p.misiones, mision([paso])] }, ['titular', 'ana']);
    expect(con({ texto: 'Firma', hazlo: 'Lo firmo yo.' })).toEqual([]);
    expect(con({ texto: 'Corre esto', soloTu: 'Claude Code no deja reescribir la historia en automático.' })).toEqual([]);
    expect(con({ texto: 'Firma', hazlo: ' ' })).toHaveLength(1);
    expect(con({ texto: 'Firma', hazlo: 'Lo firmo yo.', soloTu: 'No puedo.' })).toHaveLength(1);
    expect(con({ texto: 'Elige', hazlo: 'Elijo yo.', opciones: ['Sí', 'No'] })).toHaveLength(1);
    expect(con({ texto: 'Firma', hazlo: 'Lo firmo yo.', hecho: { que: 'nota' } })).toHaveLength(1);
  });

  it('Un paso con su orden de terminal: una sola línea, y nunca «Hazlo tú»', () => {
    const p = planEjemplo();
    const con = (paso: Paso) => validarPlan({ ...p, misiones: [...p.misiones, mision([paso])] }, ['titular', 'ana']);
    expect(con({ texto: 'Corre la limpieza', terminal: 'bash limpiar.sh', soloTu: 'Es tu terminal.' })).toEqual([]);
    expect(con({ texto: 'Corre', terminal: ' ' })).toHaveLength(1);
    expect(con({ texto: 'Corre', terminal: 'cd x\nrm y' })).toHaveLength(1);
    expect(con({ texto: 'Corre', terminal: 'bash x.sh', hazlo: 'Lo corro yo.' })).toHaveLength(1);
  });

  it('«No lo entiendo»: las veces que se pidió aclarar cada paso', () => {
    const nota = (id: string, seccion: string, aclarar = true): Nota => ({ id, cuando: '2026-10-19T10:00:00Z', quien: 'Laura', sobre: { tipo: 'mision', id: 't_meta', seccion, ...(aclarar ? { aclarar } : {}) }, texto: 'No lo entiendo' });
    const notas = [nota('a', seccionPaso(1)), nota('b', 'Paso 2'), nota('c', 'Paso 2', false), nota('d', 'Paso 1')];
    expect(aclaracionesDe(notas, 't_meta', 1).map((n) => n.id)).toEqual(['a', 'b']);
    expect(aclaracionesDe(notas, 't_meta', 0).map((n) => n.id)).toEqual(['d']);
    // Pedir una aclaración no cuenta como la nota que pide un paso
    expect(pasoHecho({ que: 'nota', tipo: 'mision' }, 'titular', proyecto(), { ...estadoVacio(), notas: [{ ...nota('a', 'Paso 1'), de: 'titular' }] })).toBe(false);
  });

  it('lo marcado a mano fuera del Studio se comprueba: lo que trae su prueba, no', () => {
    const pasos: Paso[] = [
      'Corre la limpieza',
      { texto: 'Prueba el encendido', soloTu: 'Es tu terminal.' },
      { texto: 'Lee', hecho: { que: 'leido', id: 'docs/x.md' } },
      { texto: 'Elige', opciones: ['Sí', 'No'] },
      { texto: 'Firma', hazlo: 'Lo firmo yo.' },
      { texto: 'Firma el commit', terminal: 'bash firmar.sh', comprobar: { orden: 'git log -1 --format=%ae', espera: 'leonc' } },
    ];
    expect(pasosPorComprobar({ pasos }, [0, 1, 2, 3, 4, 5, 9])).toEqual([0, 1]);
    expect(pasosPorComprobar({ pasos }, [])).toEqual([]);
  });

  it('Un paso de terminal se comprueba con una orden que solo lee', () => {
    const p = planEjemplo();
    const con = (paso: Paso) => validarPlan({ ...p, misiones: [...p.misiones, mision([paso])] }, ['titular', 'ana']);
    const corre = (comprobar: { orden: string; espera?: string; vacia?: boolean }) => con({ texto: 'Corre', terminal: 'bash x.sh', comprobar });
    expect(corre({ orden: 'git log -1 --format=%ae', espera: 'leonc' })).toEqual([]);
    expect(corre({ orden: 'git status --porcelain', vacia: true })).toEqual([]);
    expect(corre({ orden: 'existe LICENSE' })).toEqual([]);
    expect(corre({ orden: 'git push' })).toHaveLength(1);
    expect(corre({ orden: 'git log | head' })).toHaveLength(1);
    expect(corre({ orden: 'rm -rf x' })).toHaveLength(1);
    expect(corre({ orden: 'git branch nueva' })).toHaveLength(1);
    expect(corre({ orden: 'git config user.name x' })).toHaveLength(1);
    expect(corre({ orden: 'git diff --output=x' })).toHaveLength(1);
    expect(corre({ orden: 'existe ../afuera' })).toHaveLength(1);
    expect(corre({ orden: 'git status --porcelain', vacia: true, espera: 'x' })).toHaveLength(1);
    expect(con({ texto: 'Sin orden', comprobar: { orden: 'git status' } })).toHaveLength(1);
    expect(ordenDeComprobacion('git log -1 "--format=%an %ae"')).toEqual({ programa: 'git', args: ['log', '-1', '--format=%an %ae'] });
    expect(cumpleComprobacion(' Leonc@x.com\n', { orden: 'git log', espera: 'leonc' })).toBe(true);
    expect(cumpleComprobacion('M a.ts', { orden: 'git status --porcelain', vacia: true })).toBe(false);
    expect(cumpleComprobacion('', { orden: 'git status --porcelain', vacia: true })).toBe(true);
  });
});
