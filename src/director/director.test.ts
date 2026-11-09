import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { marked } from 'marked';
import { describe, expect, it } from 'vitest';
import planPlantilla from '../../plantilla/plan.json';
import proyectoPlantilla from '../../plantilla/proyecto.json';
import { buscar, piezasDelProyecto } from './buscar.ts';
import {
  autorizoSinPermiso,
  pideUnaRegla,
  juntarArchivos,
  mesDelArchivo,
  partirArchivoPorMes,
  SIN_FECHA,
  type ArchivoPlan,
  type MedicionDelNucleo,
  corriendoSola,
  sinEsperarLoLargo,
  idsYaUsados,
  aceptadasSinEjecutar,
  aprobadasDeFase,
  reemplazos,
  enUnaLinea,
  esDeCierre,
  esperaAlCierre,
  productoPorTerminar,
  sinDecirSiCambiaProducto,
  esperaA,
  misionesEnEsperaDeCierre,
  misionesQueEsperan,
  pedidosAntesDelCierre,
  DESPUES,
  faseDondeSeVe,
  agendaDe,
  aclaracionesDe,
  adelantadoConPendiente,
  origenDePrevista,
  archivar,
  archivoVacio,
  fotoInicial,
  negacionesDe,
  negadosEnVivo,
  usoNegado,
  mensajeRepite,
  mensajeRepiteAnterior,
  avanzamosRepiteRespuestas,
  lineasReescritas,
  colaDeDiagnosticos,
  mdDeBloqueDePuntos,
  POR_REVISION,
  mismaIdea,
  temasDelMensaje,
  coincideBusqueda,
  palabrasDeBusqueda,
  misionesPorVigilar,
  pendientePorComprobar,
  respuestasALaFaseEntera,
  aplazadasSinPedido,
  loQueDejo,
  unirArchivo,
  cumpleComprobacion,
  ordenDeComprobacion,
  eleccionDe,
  comentarioDe,
  YA_LO_DIJE,
  YA_LO_COMENTE,
  remiteALoDicho,
  instruccionesPrevias,
  decisionesVigentes,
  MAX_ELECCION,
  MAX_ELECCIONES,
  MAX_OPCIONES,
  juntarElecciones,
  opcionSola,
  MAX_ESPERAR,
  opcionConDetalle,
  destinoDelPaso,
  destinoVigente,
  llevaAqui,
  lugarDeMision,
  aquiMismo,
  pedidoFueraDelStudio,
  encargoDe,
  pasoHecho,
  parteConDecisionPendiente,
  pasosPorComprobar,
  pideLeerEntero,
  pasosSinMarcar,
  pasosVistos,
  claveDePasoVisto,
  eleccionALaVista,
  salidaDeMision,
  seccionPaso,
  type Hecho,
  type Mision,
  type Nota,
  type Paso,
  type Integrante,
  TITULAR,
  leeEnLaBandeja,
  reglaDeIdiomaEnLaBandeja,
  avanceFase,
  bloqueosPuerta,
  claveEntrega,
  claveIdea,
  claveTrozo,
  decisionesDe,
  documentosEnOrden,
  documentosPorCerrar,
  claveLeido,
  enLectura,
  loPideUnPaso,
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
  reservaDeMisiones,
  reservaSinRazon,
  soloVeUnCambio,
  misionesDeVerSueltas,
  loteSoloDeVer,
  EXCUSA_RESERVA,
  colaDelDirector,
  colaSinOrden,
  RESERVA_MINIMA,
  partesDeDocumento,
  trozosDeParte,
  puntosDelBloque,
  pendientesDelDirector,
  sinAtenderAlCerrar,
  resumenPorCerrar,
  MAX_AVANZAMOS,
  proyectoVacio,
  repartirCommit,
  repartoPorNivel,
  respuestasSinDestino,
  decideDecision,
  selladosQueCambiaron,
  soloQuitaDatos,
  DATO_QUITADO,
  situacion,
  seMideSolo,
  sumarDias,
  trabajoDe,
  unirEstados,
  urgenciasDeLaSemana,
  esImagen,
  validarEstado,
  validarPlan,
  validarProyecto,
  xpDe,
  NOMBRE_TIPO_DE_NOTA,
  type CommitFrentes,
  type Contexto,
  type EstadoDirector,
  type Plan,
  type Proyecto,
  type TipoDeNota,
  type Tratamiento,
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
          { id: 'm_usuarios', texto: 'Cinco personas lo usaron' },
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

describe('lo que se le negó al director (propuesta «Lo que se le negó al director, a la vista»)', () => {
  it('lee las negaciones del resultado de su registro, sin repetir y en orden', () => {
    const resultado = JSON.stringify({
      type: 'result',
      permission_denials: [
        { tool_name: 'Bash', tool_input: { command: 'cd .stl && git status --short', description: 'Ver' } },
        { tool_name: 'Read', tool_input: { file_path: 'C:/Users/ana/.claude/settings.json' } },
        { tool_name: 'Bash', tool_input: { command: 'cd .stl  &&\n git status --short' } },
        { tool_name: 'ScheduleWakeup', tool_input: {} },
      ],
    });
    const registro = ['no es JSON', JSON.stringify({ type: 'assistant', message: { content: 'permission_denials' } }), resultado].join('\n');
    expect(negacionesDe(registro)).toEqual(['Bash: cd .stl && git status --short', 'Read: C:/Users/ana/.claude/settings.json', 'ScheduleWakeup']);
    // un registro sin resultado (el lanzamiento en curso) no tiene negaciones que contar
    expect(negacionesDe(JSON.stringify({ type: 'assistant', permission_denials: [{ tool_name: 'Bash' }] }))).toEqual([]);
    // una orden muy larga se corta
    const larga = JSON.stringify({ type: 'result', permission_denials: [{ tool_name: 'Bash', tool_input: { command: 'x'.repeat(400) } }] });
    expect(negacionesDe(larga)[0].length).toBeLessThan(170);
  });

  it('en vivo, sin esperar al resultado: cada aviso de permiso negado, con lo que intentó, por partes y sin repetir (propuesta «Los permisos, al momento»)', () => {
    const usa = (id: string, name: string, input: Record<string, unknown>) => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input }] } });
    const nego = (id: string, tool_name = 'Bash') => JSON.stringify({ type: 'system', subtype: 'permission_denied', tool_name, tool_use_id: id, message: 'Permission to use Bash has been denied' });
    const usos = new Map<string, string>();
    const negados: string[] = [];
    // La primera parte: un uso permitido y uno negado
    negadosEnVivo([usa('a', 'Bash', { command: 'npm test' }), usa('b', 'Bash', { command: 'git -C .stl  status' }), nego('b')].join('\n'), usos, negados);
    expect(negados).toEqual(['Bash: git -C .stl status']);
    // La parte siguiente: el mismo intento otra vez no se repite; uno sin uso conocido se nombra con su herramienta
    negadosEnVivo([usa('c', 'Bash', { command: 'git -C .stl status' }), nego('c'), nego('zz', 'Read'), 'no es JSON'].join('\n'), usos, negados);
    expect(negados).toEqual(['Bash: git -C .stl status', 'Read']);
    // Se nombran igual que al final, en «Lo que gastó»
    expect(usoNegado('Read', { file_path: 'C:/x/.env' })).toBe(negacionesDe(JSON.stringify({ type: 'result', permission_denials: [{ tool_name: 'Read', tool_input: { file_path: 'C:/x/.env' } }] }))[0]);
    expect(negadosEnVivo('')).toEqual([]);
  });
});

describe('la plantilla de arranque', () => {
  it('es válida, con su proyecto vacío', () => {
    expect(validarPlan(plantilla, ['titular'])).toEqual([]);
    expect(validarProyecto(proyectoPlantilla as unknown as Proyecto)).toEqual([]);
    expect(plantilla.fases.map((f) => f.id)).toEqual(['arranque']);
  });

  it('el ejemplo también es válido', () => {
    expect(validarPlan(planEjemplo(), ['titular', 'ana'])).toEqual([]);
  });

  it('la estrategia del diagnóstico trae su texto y al menos una fuente real', () => {
    const p = planEjemplo();
    const con = (estrategia: { texto: string; fuentes: string[] }) => validarPlan({ ...p, diagnostico: { ...p.diagnostico, estrategia } }, ['titular', 'ana']);
    expect(con({ texto: 'Validar con usuarios antes de escalar.', fuentes: ['https://basecamp.com/shapeup'] })).toEqual([]);
    expect(con({ texto: 'Validar con usuarios antes de escalar.', fuentes: [] })).toHaveLength(1);
    expect(con({ texto: ' ', fuentes: ['Shape Up'] })).toHaveLength(1);
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

  it('los archivos clave del plan: hasta ocho, cada uno con su ruta relativa y su para (pd_archivos_clave)', () => {
    const p: Plan = { ...planEjemplo(), archivosClave: [{ ruta: 'README.md', para: 'Qué es el proyecto' }, { ruta: 'src/index.ts', para: 'Por dónde arranca' }] };
    expect(validarPlan(p)).toEqual([]);
    expect(validarPlan({ ...p, archivosClave: [...p.archivosClave!, { ruta: 'repo:a.ts', para: 'x' }] })).toHaveLength(1);
    expect(validarPlan({ ...p, archivosClave: [...p.archivosClave!, { ruta: 'README.md', para: 'otra vez' }] })).toHaveLength(1);
    expect(validarPlan({ ...p, archivosClave: Array.from({ length: 9 }, (_, i) => ({ ruta: `a${i}.ts`, para: 'x' })) })).toHaveLength(1);
  });

  it('una nota que pide una regla no se recorta: su respuesta, salvo rechazada, dice dónde quedó (pr_cierre_vigilado, punto 5)', () => {
    for (const t of ['De ahora en adelante, cada paso con su botón.', 'Quiero que siempre me digas el costo.', 'Que nunca se pida una revisión sola.', 'Esto es una regla: nada a la web.', 'Se considera regla.', 'Regla dura: un director a la vez.'])
      expect(pideUnaRegla(t), t).toBe(true);
    for (const t of ['Siempre me gustó el amarillo.', 'Se ve así.', 'Nunca lo vi.', 'La regla del Excel está bien.']) expect(pideUnaRegla(t), t).toBe(false);
    const cuando = '2026-10-19T10:00:00.000Z';
    const p: Plan = { ...planEjemplo(), respuestas: { r1: { cuando, texto: 'Entendido', tratamiento: 'informada' }, r2: { cuando, texto: 'No va', tratamiento: 'rechazada' }, r3: { cuando, texto: 'Bien', tratamiento: 'informada' } } };
    const nota = (id: string, texto: string) => ({ id, cuando, quien: 'Laura', sobre: { tipo: 'general' as const }, texto });
    expect(respuestasSinDestino(p, [nota('r1', 'De ahora en adelante, avísame antes.'), nota('r2', 'Que nunca suba nada.'), nota('r3', 'Se ve bien.')], '2026-10-19T00:00:00.000Z')).toEqual(['r1']);
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

  it('una nota con varias cosas se responde por partes, cada una con su tipo, su tratamiento y dónde quedó (pd_partes_separadas)', () => {
    const cuando = '2026-10-19T10:00:00.000Z';
    const desde = '2026-10-19T00:00:00.000Z';
    const mision = { vista: 'misiones' as const, ancla: 'mision-c_endpoints', etiqueta: 'Los endpoints' };
    const p: Plan = {
      ...planEjemplo(),
      respuestas: {
        n1: {
          cuando, texto: 'Traías dos cosas: las separé.', tratamiento: 'integrada', destino: mision,
          partes: [
            { tipo: 'ajuste', texto: 'El botón, más grande: hecho.', tratamiento: 'integrada', destino: mision },
            { tipo: 'idea', texto: 'Lo de los temas, para la beta. La marcaste como ajuste, pero es una idea para después.', tratamiento: 'aplazada', destino: { vista: 'ruta', fase: 'beta', etiqueta: 'La beta' } },
            { tipo: 'pregunta', texto: 'Sí, se puede.', tratamiento: 'informada' },
          ],
        },
      },
    };
    expect(validarPlan(p)).toEqual([]);
    expect(respuestasSinDestino(p, [], desde)).toEqual([]);
    expect(NOMBRE_TIPO_DE_NOTA[p.respuestas.n1.partes![1].tipo]).toBe('Idea para después');
    // Una parte que lleva algo al plan sin decir dónde quedó: lo dice la validación y el doble check del cierre
    const partes = p.respuestas.n1.partes!;
    delete partes[1].destino;
    expect(validarPlan(p)).toEqual(['La parte 2 de la respuesta a la nota «n1» es «aplazada», pero no dice dónde quedó (su destino).']);
    expect(respuestasSinDestino(p, [], desde)).toEqual(['n1']);
    partes[1].destino = { vista: 'ruta', fase: 'beta', etiqueta: 'La beta' };
    // Un tipo o un tratamiento que no existe, una parte vacía y un destino que no está
    const mal = structuredClone(p);
    mal.respuestas.n1.partes = [
      { tipo: 'queja' as TipoDeNota, texto: 'X', tratamiento: 'informada' },
      { tipo: 'falla', texto: ' ', tratamiento: 'resuelta' as Tratamiento },
      { tipo: 'ajuste', texto: 'Y', tratamiento: 'integrada', destino: { vista: 'misiones', ancla: 'mision-nada', etiqueta: 'X' } },
    ];
    const errores = validarPlan(mal);
    expect(errores).toHaveLength(4);
    expect(errores.join('\n')).toContain('La parte 1 de la respuesta a la nota «n1» tiene un tipo desconocido (queja)');
    expect(errores.join('\n')).toContain('La parte 2 de la respuesta a la nota «n1» no dice nada');
    expect(errores.join('\n')).toContain('La parte 2 de la respuesta a la nota «n1» tiene un tratamiento desconocido (resuelta)');
    expect(errores.join('\n')).toContain('La parte 3 de la respuesta a la nota «n1» dice que quedó en una misión que no está («mision-nada»)');
    // Con una sola cosa no hay partes: va en la respuesta entera
    mal.respuestas.n1.partes = [partes[0]];
    expect(validarPlan(mal)).toEqual(['La respuesta a la nota «n1» trae partes, pero menos de dos: con una sola cosa, va en la respuesta entera, sin partes.']);
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

  // El Studio dejó de llevar las validaciones de proyecto (nota de voz del titular nmvy6vawvtit, 1 de noviembre de 2026), y de
  // la memoria de ningún proyecto se borra nada: lo viejo se ignora, sin romper nada
  describe('lo que quedó de las validaciones de proyecto, en una memoria de antes', () => {
    const conViejos = () => {
      const plan = planEjemplo();
      const mvp = fase(plan, 'mvp');
      mvp.criterios.push(
        { id: 'm_viejo', texto: 'Cinco personas lo usaron', indicador: 'validaciones_personas', meta: 5 } as never,
        { id: 'm_viejo2', texto: 'El 80 % lo logra', indicador: 'validaciones_logran', meta: 80, tipos: ['usuarios', 'de-otra-epoca'] } as never,
      );
      return { plan, mvp };
    };
    const viejas = [{ id: 'v1', fecha: '2026-10-17', fase: 'una-que-ya-no-esta', tipo: 'otro', personas: 0, lograron: 9, aprueban: 9, quien: 'Ana' }];

    it('un criterio viejo no da error ni se cumple solo: lo evalúa el director, como cualquier otro', () => {
      const { plan, mvp } = conViejos();
      expect(validarPlan(plan).filter((x) => /m_viejo/.test(x))).toEqual([]);
      const e = estadoVacio();
      const viejo = mvp.criterios.find((c) => c.id === 'm_viejo')!;
      expect(seMideSolo(viejo)).toBe(false);
      expect(evaluar(viejo, mvp, ctx(plan, e))).toMatchObject({ cumplido: false, por: null, valor: null, avance: 0 });
      plan.evaluacion = { m_viejo: { fecha: '2026-11-01', estado: 'cumplido', nota: 'Lo probó el equipo' } };
      expect(evaluar(viejo, mvp, ctx(plan, e))).toMatchObject({ cumplido: true, por: 'director' });
      // Un indicador que nunca existió sigue siendo un error
      mvp.criterios.push({ id: 'm_raro', texto: 'Raro', indicador: 'de_otra_cosa' } as never);
      expect(validarPlan(plan).join('\n')).toContain('El criterio «m_raro» usa un indicador desconocido');
    });

    it('el botón viejo de un paso, abierto o cerrado, no da error y lleva a «Hoy», sin mirar su tipo', () => {
      const plan = planEjemplo();
      const m = plan.misiones.find((x) => x.id === 'c_endpoints')!;
      m.pasos = [{ texto: 'Registra tu validación', ir: { vista: 'validaciones', ancla: 'registrar-validacion', tipoValidacion: 'de-otra-epoca', etiqueta: 'Abrir' } as never }];
      expect(validarPlan(plan).filter((x) => /validaci|pestaña/i.test(x))).toEqual([]);
      expect(destinoVigente({ vista: 'validaciones', ancla: 'registrar-validacion', etiqueta: 'Abrir' } as never)).toEqual({ vista: 'misiones', etiqueta: 'Abrir' });
    });

    it('el archivo de una persona con sus validaciones se lee, se valida y las conserva sin usarlas', () => {
      const plan = planEjemplo();
      const delArchivo = { ...estadoPersonaVacio(), validaciones: viejas } as never;
      const e = unirEstados({ titular: delArchivo });
      expect(validarEstado(e, plan)).toEqual([]);
      expect('validaciones' in e).toBe(false);
      // Lo que se vuelve a guardar sale de su archivo, tal como estaba: no se borra nada
      expect(delArchivo).toHaveProperty('validaciones', viejas);
    });
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

describe('excepciones', () => {
  it('una excepción vale hasta su fecha y hasta que se cierra', () => {
    const e = estadoVacio();
    e.excepciones.push({ id: 'x1', fecha: '2026-10-14', quien: 'Ana', frente: 'web', fase: 'mvp', motivo: 'Un error que bloquea la entrega', hasta: sumarDias('2026-10-14', 7) });
    expect(excepcionesActivas(e, '2026-10-21', 'web')).toHaveLength(1);
    expect(excepcionesActivas(e, '2026-10-22', 'web')).toHaveLength(0);
    e.excepciones[0].cerrada = firma;
    expect(excepcionesActivas(e, '2026-10-16')).toHaveLength(0);
  });

  it('el estado rechaza marcas «no aplica» sin razón', () => {
    const plan = planEjemplo();
    const e = estadoVacio();
    e.marcas.a_leido = { estado: 'no_aplica', ...firma };
    expect(validarEstado(e, plan)).toHaveLength(1);
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

  it('el cierre no deja sin atender una nota ni una entrega de antes del corte; lo de después espera la siguiente', () => {
    const p = planEjemplo();
    const e = estadoVacio();
    const corte = '2026-10-15T12:00:00.000Z';
    e.notas = [
      { id: 'n_antes', cuando: '2026-10-15T11:00:00.000Z', quien: 'Laura', sobre: { tipo: 'general' }, texto: 'Antes del corte' },
      { id: 'n_despues', cuando: '2026-10-15T12:30:00.000Z', quien: 'Laura', sobre: { tipo: 'general' }, texto: 'Después del corte' },
    ];
    e.entregas.t_diag = { cuando: '2026-10-15T10:00:00.000Z', quien: 'Laura' };
    e.entregas.t_alcance = { cuando: '2026-10-15T12:10:00.000Z', quien: 'Laura' };
    expect(sinAtenderAlCerrar(p, e, corte)).toEqual({ notas: ['n_antes'], entregas: ['t_diag'] });
    // Con su respuesta y su veredicto, ya no queda nada de antes del corte
    p.respuestas = { n_antes: { cuando: '2026-10-15T13:00:00.000Z', texto: 'Hecho', tratamiento: 'informada' } };
    p.revisiones = { t_diag: { cuando: '2026-10-15T13:00:00.000Z', veredicto: 'aprobada', comentario: 'Bien' } };
    expect(sinAtenderAlCerrar(p, e, corte)).toEqual({ notas: [], entregas: [] });
  });

  it('el cierre pide «Dónde quedamos» escrito en esta revisión y con seis líneas como máximo', () => {
    const desde = '2026-10-15T12:00:00.000Z';
    const resumen = (fecha: string, lineas: number) => ({ fecha, avanzamos: Array.from({ length: lineas }, (_, i) => `Avance ${i + 1}`), quedamos: 'En la fase 1' });
    expect(MAX_AVANZAMOS).toBe(6);
    expect(resumenPorCerrar(resumen('2026-10-15T13:00:00.000Z', 6), desde)).toEqual([]);
    expect(resumenPorCerrar(resumen('2026-10-15T13:00:00.000Z', 7), desde)).toHaveLength(1);
    expect(resumenPorCerrar(resumen('2026-10-14', 3), desde)[0]).toContain('no se reescribió');
    expect(resumenPorCerrar(undefined, desde)).toHaveLength(1);
    // La primera revisión de un proyecto no tiene una anterior: basta con que el resumen exista
    expect(resumenPorCerrar(resumen('2026-10-15', 2), '')).toEqual([]);
  });

  it('lo que hay que rehacer va primero en la cola', () => {
    const p = planEjemplo();
    const e = estadoVacio();
    expect(misionesAbiertas(p, e, 'titular').map((m) => m.id)).toEqual(['t_conectar', 't_diag', 't_alcance']);
    e.entregas.t_alcance = { cuando: '2026-10-15T09:00:00.000Z', quien: 'Laura' };
    p.revisiones = { t_alcance: { cuando: '2026-10-15T10:00:00.000Z', veredicto: 'rehacer', comentario: '' } };
    expect(misionesAbiertas(p, e, 'titular')[0].id).toBe('t_alcance');
  });

  it('la reserva: cada persona tiene su misión y por lo menos nueve más, contando las de la fase siguiente', () => {
    const p = planEjemplo();
    const e = estadoVacio();
    // Diez en total: eran seis desde la auditoría del 21 de octubre, y el titular la subió a diez en su nota de voz del
    // 26 de octubre de 2026, para trabajar las misiones por lotes
    expect(RESERVA_MINIMA).toBe(10);
    // En el arranque, la titular tiene tres abiertas y ninguna en la fase siguiente: faltan siete
    const titular = reservaDeMisiones(p, e, 'titular');
    expect(titular.abiertas.map((m) => m.id)).toEqual(['t_conectar', 't_diag', 't_alcance']);
    expect(titular.siguientes).toEqual([]);
    expect(titular.faltan).toBe(7);
    // Ana no tiene nada abierto, pero la del MVP (bajo niebla) cuenta como reserva
    const ana = reservaDeMisiones(p, e, 'ana');
    expect(ana.abiertas).toEqual([]);
    expect(ana.siguientes.map((m) => m.id)).toEqual(['c_endpoints']);
    expect(ana.faltan).toBe(9);
    // Cruzada la puerta del arranque: la del MVP está abierta y la de la beta es la siguiente
    e.cierres.arranque = firma;
    expect(reservaDeMisiones(p, e, 'ana')).toMatchObject({ faltan: 8 });
    expect(reservaDeMisiones(p, e, 'ana').siguientes.map((m) => m.id)).toEqual(['c_panel']);
    // La beta es la última fase de la ruta, y también exige la reserva: siempre, sin excepción (nota del titular
    // nmvq6s7wmtit, 26 de octubre de 2026 en la noche); antes no la exigía
    e.cierres.mvp = { fecha: '2026-10-16', quien: 'Laura' };
    expect(reservaDeMisiones(p, e, 'ana')).toMatchObject({ alcanza: 2, faltan: 8 });
    // Y una fase de mantenimiento tampoco: una sola misión ligera, por diseño
    const m = planEjemplo();
    m.fases[1] = { ...m.fases[1], etapa: 'Mantenimiento' };
    const em = estadoVacio();
    em.cierres.arranque = firma;
    expect(reservaDeMisiones(m, em, 'ana').faltan).toBe(0);
    // Ni el arranque antes de trazar la ruta (solo la fase 0): leer el diagnóstico y fijar la meta es el lote
    const sinRuta = planEjemplo();
    sinRuta.fases = sinRuta.fases.slice(0, 1);
    sinRuta.misiones = sinRuta.misiones.filter((x) => x.fase === sinRuta.fases[0].id);
    expect(reservaDeMisiones(sinRuta, estadoVacio(), 'titular').faltan).toBe(0);
  });

  it('el lote corto: solo para agilizar la revisión que sigue, con sus misiones, nunca en cero ni por la cola del director (nota del 26 de octubre en la noche)', () => {
    const p = planEjemplo();
    const e = estadoVacio();
    const desde = '2026-10-26T22:41:00.000Z';
    // La titular alcanza tres de diez y no hay lote: --listo no cierra
    expect(reservaSinRazon(p, e, ['titular'], desde).map((r) => [r.persona, r.faltan, r.motivo])).toEqual([['titular', 7, 'no hay lote corto escrito']]);
    const razon = 'Te dejo solo estas tres: de lo que decidas en ellas depende lo que construyo enseguida, y con más tardarías en pedir la revisión.';
    const lote = ['t_conectar', 't_diag', 't_alcance'];
    // Uno de la revisión anterior no vale: la revisión que sigue vuelve a dejar diez
    p.reservaCorta = { titular: { cuando: '2026-10-26T20:00:00.000Z', razon, lote } };
    expect(reservaSinRazon(p, e, ['titular'], desde)[0].motivo).toBe('el lote corto es de una revisión anterior');
    // Ni una razón de una línea, que no dice nada
    p.reservaCorta = { titular: { cuando: '2026-10-26T23:10:00.000Z', razon: 'Poco trabajo.', lote } };
    expect(reservaSinRazon(p, e, ['titular'], desde)[0].motivo).toContain('no dice nada');
    // Ni la razón de la revisión que dejó al titular sin nada: que lo que sigue es trabajo del director
    const excusa = 'Lo que falta de esta fase sigue siendo trabajo mío, y ninguna decisión tuya lo desbloquea: inventarte misiones sería relleno.';
    p.reservaCorta = { titular: { cuando: '2026-10-26T23:10:00.000Z', razon: excusa, lote, motivo: 'ruta' } };
    expect(reservaSinRazon(p, e, ['titular'], desde)[0].motivo).toContain('sigue siendo trabajo mío');
    expect('Lo que queda es casi todo trabajo del director.').toMatch(EXCUSA_RESERVA);
    expect(razon).not.toMatch(EXCUSA_RESERVA);
    // Sin sus misiones, o con una que no tiene a la mano, tampoco
    p.reservaCorta = { titular: { cuando: '2026-10-26T23:10:00.000Z', razon, motivo: 'ruta' } };
    expect(reservaSinRazon(p, e, ['titular'], desde)[0].motivo).toContain('no nombra sus misiones');
    p.reservaCorta = { titular: { cuando: '2026-10-26T23:10:00.000Z', razon, lote: ['t_conectar', 't_lejana'], motivo: 'ruta' } };
    expect(reservaSinRazon(p, e, ['titular'], desde)[0].motivo).toContain('t_lejana');
    // Escrito en esta revisión, con su porqué y sus misiones a la mano: ya no cierra por la revisión que sigue (nota de voz
    // nmvuha2dutit, 30 de octubre de 2026), solo con la ruta completada y la cola vacía
    p.reservaCorta = { titular: { cuando: '2026-10-26T23:10:00.000Z', razon, lote } };
    expect(reservaSinRazon(p, e, ['titular'], desde)[0].motivo).toContain('ya no vale');
    p.reservaCorta = { titular: { cuando: '2026-10-26T23:10:00.000Z', razon, lote, motivo: 'ruta' } };
    expect(reservaSinRazon(p, e, ['titular'], desde)).toEqual([]);
    // Junto con la regla del cierre y la cola del director: una misión retenida al cierre no cuenta en la reserva, el
    // lote sigue haciendo falta, y la propuesta aceptada sin hacer (la cola del director) no la acorta
    p.misiones.push({ id: 't_cierre', para: 'titular', fase: 'arranque', frente: 'direccion', xp: 10, titulo: 'La prueba final', porQue: 'Mide la puerta', pasos: ['Pruébalo'], entrega: 'La prueba', alCierre: true });
    p.propuestas = [...p.propuestas, { id: 'pr_sin', area: 'x', titulo: 'Sin hacer', problema: '', propuesta: '', conecta: '', fase: 'arranque' }];
    e.propuestas.pr_sin = { estado: 'aceptada', fecha: '2026-10-26', quien: 'Laura' };
    expect(colaDelDirector(p, e).map((c) => c.id)).toContain('pr_sin');
    expect(reservaDeMisiones(p, e, 'titular').enEspera.map((m) => m.id)).toEqual(['t_cierre']);
    // Con algo en la cola ya no hay ruta completada: la persona tiene sus diez (nota nmvuha2dutit)
    expect(reservaSinRazon(p, e, ['titular'], desde)[0].motivo).toContain('quedan 1 cosas');
    p.reservaCorta = { titular: { cuando: '2026-10-26T23:10:00.000Z', razon, lote: ['t_cierre'] } };
    expect(reservaSinRazon(p, e, ['titular'], desde)[0].motivo).toContain('ya no vale');
    delete p.reservaCorta;
    expect(reservaSinRazon(p, e, ['titular'], desde).map((r) => r.faltan)).toEqual([7]);
    // Nunca en cero: con todo entregado y solo la del cierre retenida, ningún lote vale
    const vacio = planEjemplo();
    const ev = estadoVacio();
    vacio.misiones = vacio.misiones.filter((m) => m.para !== 'titular');
    vacio.misiones.push({ id: 't_cierre', para: 'titular', fase: 'arranque', frente: 'direccion', xp: 10, titulo: 'La prueba final', porQue: 'Mide la puerta', pasos: ['Pruébalo'], entrega: 'La prueba', alCierre: true });
    vacio.propuestas = [...vacio.propuestas, { id: 'pr_sin', area: 'x', titulo: 'Sin hacer', problema: '', propuesta: '', conecta: '', fase: 'arranque' }];
    ev.propuestas.pr_sin = { estado: 'aceptada', fecha: '2026-10-26', quien: 'Laura' };
    vacio.reservaCorta = { titular: { cuando: '2026-10-26T23:10:00.000Z', razon, lote: ['t_cierre'], motivo: 'ruta' } };
    ev.propuestas.pr_sin = { estado: 'descartada', fecha: '2026-10-26', quien: 'Laura' };
    vacio.misiones = vacio.misiones.filter((m) => m.para !== 'titular');
    vacio.misiones.push({ id: 't_hecha', para: 'titular', fase: 'arranque', frente: 'direccion', xp: 10, titulo: 'Lo de antes', porQue: 'Ya está', pasos: ['Hecho'], entrega: 'Hecho' });
    vacio.revisiones = { ...vacio.revisiones, t_hecha: { cuando: '2026-10-26T21:00:00.000Z', veredicto: 'aprobada', comentario: 'Bien.' } };
    expect(reservaSinRazon(vacio, ev, ['titular'], desde).map((r) => [r.alcanza, r.motivo])).toEqual([[0, 'no tiene ninguna misión a la mano: nunca se queda en cero']]);
    // Con la reserva completa no hace falta lote; y el lote nombra a alguien del equipo, con su fecha y sus misiones
    expect(reservaSinRazon(p, e, ['ana'], desde).map((r) => r.persona)).toEqual(['ana']);
    p.reservaCorta = { nadie: { cuando: 'ayer', razon: '' }, titular: { cuando: '2026-10-26T23:10:00.000Z', razon, lote: ['c_endpoints'] } };
    const errores = validarPlan(p, ['titular', 'ana']).join(' ');
    expect(errores).toContain('La reserva corta nombra a «nadie»');
    expect(errores).toContain('La reserva corta de «nadie» necesita su fecha y su razón');
    expect(errores).toContain('El lote corto de «titular» nombra «c_endpoints», que no es una misión suya');
  });

  it('el lote corto, solo con la ruta completada: con la cola del director larga y autorizada, la persona tiene sus diez (nota de voz nmvuha2dutit, 30 de octubre)', () => {
    const p = planEjemplo();
    const e = estadoVacio();
    const desde = '2026-10-27T04:41:00.000Z';
    const cuando = '2026-10-27T05:30:00.000Z';
    const lote = ['t_conectar'];
    p.propuestas = [...p.propuestas, { id: 'pr_sin', area: 'x', titulo: 'Sin hacer', problema: '', propuesta: '', conecta: '', fase: 'arranque' }];
    e.propuestas.pr_sin = { estado: 'aceptada', fecha: '2026-10-26', quien: 'Laura' };
    // El lote que cerró casi cada revisión del 29 de octubre: la cola autorizada entera, cada cosa de ella cruzada con la
    // persona y una sola misión. Pasaba todos los controles; ya no cierra
    p.colaAutorizada = { cuando: '2026-10-27T16:10:53.196Z', nota: 'nmvqvu1sctit' };
    const razon = 'Lo que sigue en mi cola es largo y casi todo ya lo decidiste: te dejo leer qué cambió, con la única decisión que necesito.';
    p.reservaCorta = { titular: { cuando, razon, lote, motivo: 'cola', sinLaPersona: { pr_sin: 'Es un cambio interno del código, sin nada que se vea ni se decida.' } } };
    expect(reservaSinRazon(p, e, ['titular'], desde)[0].motivo).toContain('ya no vale');
    // Ni con la misión de aprobar el lanzamiento de la cola, ni por la revisión que sigue
    p.misiones = p.misiones.map((m) => (m.id === 't_conectar' ? { ...m, recomiendaRevision: 'Con tu visto bueno, la revisión trabaja la cola en este orden.' } : m));
    expect(reservaSinRazon(p, e, ['titular'], desde)[0].motivo).toContain('ya no vale');
    p.reservaCorta.titular!.motivo = 'revision';
    expect(reservaSinRazon(p, e, ['titular'], desde)[0].motivo).toContain('ya no vale');
    // Lo que el plan guarda de ese lote se sigue validando, para los planes de antes
    p.reservaCorta.titular!.sinLaPersona = { pr_nada: 'Un id que no está en el plan no se puede dar por cruzado con nadie.' };
    expect(validarPlan(p, ['titular', 'ana']).join(' ')).toContain('«pr_nada» no la necesita, y no es una propuesta ni un pedido');
    p.colaAutorizada = { cuando: 'ayer', nota: ' ' };
    expect(validarPlan(p, ['titular', 'ana']).join(' ')).toContain('La cola autorizada (`colaAutorizada`) necesita su fecha y la nota');
    delete p.colaAutorizada;
    // La ruta completada solo vale con la cola del director vacía
    p.reservaCorta = { titular: { cuando, razon: 'La ruta está completa: solo queda el cierre, que traen estas misiones.', lote, motivo: 'ruta' } };
    expect(reservaSinRazon(p, e, ['titular'], desde)[0].motivo).toContain('quedan 1 cosas');
    e.propuestas.pr_sin = { estado: 'descartada', fecha: '2026-10-27', quien: 'Laura' };
    expect(reservaSinRazon(p, e, ['titular'], desde)).toEqual([]);
    // Y ni con la cola vacía vale la cola ni la revisión que sigue
    p.reservaCorta = { titular: { cuando, razon, lote, motivo: 'cola' } };
    expect(reservaSinRazon(p, e, ['titular'], desde)[0].motivo).toContain('ya no vale');
    // Un motivo que no es de los tres lo dice validarPlan
    p.reservaCorta = { titular: { cuando, razon, lote, motivo: 'otro' as never } };
    expect(validarPlan(p, ['titular', 'ana']).join(' ')).toContain('trae el motivo «otro»');
  });

  it('un lote nunca es solo mirar lo que hiciste, y lo de ver va junto, en una misión (nota de voz nmvu38jg6tit, 29 de octubre)', () => {
    const p = planEjemplo();
    const e = estadoVacio();
    const desde = '2026-10-29T22:05:00.000Z';
    const cuando = '2026-10-29T22:40:00.000Z';
    const ver = (id: string, titulo: string): Mision => ({ id, para: 'titular', fase: 'arranque', frente: 'interfaz', xp: 10, titulo, porQue: 'Es lo que hice en esta revisión.', entrega: 'Si se ve como antes.',
      pasos: [{ texto: 'Abre la vista y mira que todo está donde estaba.', ir: { vista: 'ruta', etiqueta: 'Abrir «La ruta»' }, opciones: ['Se ve como antes', 'Algo cambió o falta (te cuento con ✉)'] }] });
    // Las misiones de ver: por su título o por sus opciones, y nunca la que lee y decide, encarga o elige otra cosa
    expect(soloVeUnCambio(ver('t_a', 'Mira que «La ruta» se ve igual después de partirla'))).toBe(true);
    expect(soloVeUnCambio(ver('t_b', 'Lo partido de hoy'))).toBe(true);
    expect(soloVeUnCambio({ titulo: 'Revisa cómo quedó el README', pasos: [{ texto: 'Léelo y decide al final de cada parte.', ir: { doc: 'repo:README.md', etiqueta: 'Abrir el README' } }] })).toBe(false);
    expect(soloVeUnCambio({ titulo: 'Mira que el atajo funciona', pasos: [{ texto: 'Pruébalo con el teclado.', hazlo: 'Lo pruebo yo en el navegador sin pantalla.' }] })).toBe(false);
    expect(soloVeUnCambio({ titulo: 'Decide si la semilla trae su ruta', pasos: [{ texto: '¿La trae?', opciones: ['Que traiga su ruta corta', 'Que arranque vacía'] }] })).toBe(false);
    // El lote que cerró tres revisiones seguidas: una sola misión, la de mirar una vista partida, con la cola autorizada y
    // cruzada; pasaba todos los controles
    p.misiones = [...p.misiones.filter((m) => m.para !== 'titular'), ver('t_ver', 'Mira que «Propuestas» se ve igual después de partirla')];
    // Desde la nota nmvuha2dutit solo queda el lote de la ruta completada: tampoco ahí es solo mirar
    const razon = 'La ruta está completa y mi cola vacía: lo único que te queda es ver la última vista partida.';
    p.reservaCorta = { titular: { cuando, motivo: 'ruta', razon, lote: ['t_ver'] } };
    expect(reservaSinRazon(p, e, ['titular'], desde)[0].motivo).toContain('solo pide ver un cambio');
    // Con una misión que le da algo que decidir, cierra
    p.misiones.push({ id: 't_decide', para: 'titular', fase: 'arranque', frente: 'direccion', xp: 15, titulo: 'Decide qué va primero en la purga', porQue: 'De esto depende lo que construyo enseguida.', entrega: 'El orden.',
      pasos: [{ texto: '¿Qué va primero?', opciones: ['La purga antes de partir lo que queda', 'Partir lo que queda primero'] }] });
    p.reservaCorta.titular!.lote = ['t_ver', 't_decide'];
    expect(reservaSinRazon(p, e, ['titular'], desde)).toEqual([]);
    // Lo de ver, por tema (decisión del titular nmvv1qb8ktit, 30 de octubre): sin decir su tema (`origen`) no cierran
    p.misiones.push(ver('t_ver2', 'Mira que «Preguntas» se ve igual después de partirla'));
    expect(misionesDeVerSueltas(p, { misiones: [] })).toEqual(['t_ver', 't_ver2']);
    // Dos del mismo tema (partir los módulos) tampoco: van juntas, un paso por vista
    const deTema = (id: string, origen: string[]) => Object.assign(p.misiones.find((m) => m.id === id)!, { origen });
    deTema('t_ver', ['pr_partir_modulos']);
    deTema('t_ver2', ['pr_partir_modulos', 'nmvu38jg6tit']);
    expect(misionesDeVerSueltas(p, { misiones: [] })).toEqual(['t_ver', 't_ver2']);
    // Una por tema, sí: la salida del enfoque es otro tema que la vista partida
    deTema('t_ver2', ['nmvv23qhhtit']);
    expect(misionesDeVerSueltas(p, { misiones: [] })).toEqual([]);
    // Las que ya estaban igual en lo guardado, o ya entregadas, no cuentan
    deTema('t_ver2', []);
    expect(misionesDeVerSueltas(p, { misiones: [p.misiones.find((m) => m.id === 't_ver2')!] })).toEqual([]);
    expect(misionesDeVerSueltas(p, { misiones: [] }, new Set(['t_ver2']))).toEqual([]);
    p.misiones = p.misiones.filter((m) => m.id !== 't_ver2');
    expect(misionesDeVerSueltas(p, { misiones: [] })).toEqual([]);
    // Y nunca un lote que sea solo mirar, también con la reserva entera: con t_decide, cierra; sin ella, no
    expect(loteSoloDeVer(p, e, ['titular'])).toEqual([]);
    p.misiones.push(ver('t_ver3', 'Mira que la salida del enfoque se ve con la página bajada'));
    const sinDecidir = { ...p, misiones: p.misiones.filter((m) => m.id !== 't_decide') };
    expect(loteSoloDeVer(sinDecidir, e, ['titular'])).toEqual([{ persona: 'titular', misiones: ['t_ver', 't_ver3'] }]);
    // Y con el plural: «más misiones serían relleno» es la misma excusa que «sería relleno»
    expect('Más misiones serían relleno.').toMatch(EXCUSA_RESERVA);
  });

  it('dos colas aparte: la del director va en su orden y la reserva de la persona no la cuenta (nota de voz del 23 de octubre)', () => {
    const p = planEjemplo();
    const e = estadoVacio();
    const antes = reservaDeMisiones(p, e, 'titular');
    p.propuestas = [...p.propuestas, { id: 'pr_a', area: 'x', titulo: 'Construir A', problema: '', propuesta: '', conecta: '', fase: 'arranque' }, { id: 'pr_futura', area: 'x', titulo: 'Más adelante', problema: '', propuesta: '', conecta: '', fase: 'beta' }];
    e.propuestas.pr_a = { estado: 'aceptada', fecha: '2026-10-23', quien: 'Laura' };
    e.propuestas.pr_futura = { estado: 'aceptada', fecha: '2026-10-23', quien: 'Laura' };
    p.pedidos = [{ id: 'pd_b', fase: 'arranque', texto: 'Hacer B' }, { id: 'pd_hecho', fase: 'arranque', texto: 'Ya', hecho: { cuando: '2026-10-23', nota: 'abc123' } }];
    // Lo del director de esta fase (no lo hecho ni lo de una fase futura), y sin orden todavía: --listo lo pide
    expect(colaDelDirector(p, e).map((t) => t.id)).toEqual(['pr_a', 'pd_b']);
    expect(colaSinOrden(p, e).map((t) => t.id)).toEqual(['pr_a', 'pd_b']);
    // En el orden que él decide
    p.colaDirector = ['pd_b', 'pr_a'];
    expect(colaDelDirector(p, e).map((t) => t.id)).toEqual(['pd_b', 'pr_a']);
    expect(colaSinOrden(p, e)).toEqual([]);
    // Su cola no acorta ni llena la reserva de la persona
    expect(reservaDeMisiones(p, e, 'titular')).toMatchObject({ alcanza: antes.alcanza, faltan: antes.faltan });
    // Una misión de la persona que espera trabajo del director no cuenta en su reserva, y sale cuando él lo hace
    p.misiones.push({ id: 't_ver_a', para: 'titular', fase: 'arranque', frente: 'direccion', xp: 10, titulo: 'Mira A', porQue: 'Para ver A terminado', pasos: ['Mira A'], entrega: 'Lo que viste', despuesDe: ['pr_a'] });
    expect(reservaDeMisiones(p, e, 'titular').alcanza).toBe(antes.alcanza);
    p.ejecutadas = { pr_a: { cuando: '2026-10-23', nota: 'hecho' } };
    expect(reservaDeMisiones(p, e, 'titular').alcanza).toBe(antes.alcanza + 1);
    expect(colaDelDirector(p, e).map((t) => t.id)).toEqual(['pd_b']);
    // Su orden nombra solo lo suyo, una vez
    p.colaDirector = ['pd_b', 'pd_b', 'nada'];
    const errores = validarPlan(p).join(' ');
    expect(errores).toContain('«pd_b» dos veces');
    expect(errores).toContain('nombra «nada»');
  });

  it('el director recomienda la revisión con su razón, y nunca la pide (regla dura del 23 de octubre)', () => {
    const p = planEjemplo();
    const fin: Plan['misiones'][number] = { id: 't_fin', para: p.misiones[0].para, fase: p.misiones[0].fase, frente: p.misiones[0].frente, xp: 10, titulo: 'Decide', porQue: 'p', pasos: ['Decide'], entrega: 'e', recomiendaRevision: 'De lo que decidas aquí dependen las misiones que siguen.' };
    p.misiones = [...p.misiones, fin];
    expect(validarPlan(p).join(' ')).not.toContain('recomienda');
    fin.recomiendaRevision = '  ';
    expect(validarPlan(p).join(' ')).toContain('recomienda pedir la revisión sin decir por qué');
    // Solo la última abierta de su lote (nota de voz del titular nmvy37ipstit, 1 de noviembre): antes, deja sin hacer lo
    // que la persona aún tiene a mano. Lo aprobado y lo que retiene el cierre no cuentan
    fin.recomiendaRevision = 'De lo que decidas aquí dependen las misiones que siguen.';
    const otra: Plan['misiones'][number] = { ...fin, id: 't_despues', recomiendaRevision: undefined };
    p.misiones = [...p.misiones, otra];
    expect(validarPlan(p).join(' ')).toContain('«t_fin» recomienda pedir la revisión, y después de ella sigue abierta «t_despues»');
    otra.alCierre = true;
    expect(validarPlan(p).join(' ')).not.toContain('recomienda');
    otra.alCierre = undefined;
    p.revisiones = { ...p.revisiones, t_despues: { cuando: '2026-11-01T00:00:00.000Z', veredicto: 'aprobada', comentario: 'Bien.' } };
    expect(validarPlan(p).join(' ')).not.toContain('recomienda');
    delete p.revisiones.t_despues;
    otra.para = 'otra_persona';
    expect(validarPlan(p).join(' ')).not.toContain('recomienda pedir la revisión, y después');
  });

  it('una prueba del producto entero espera lo que lo cambia, de cualquier fase (nota de voz del titular nmvzucvn8tit)', () => {
    const p = planEjemplo();
    const e = estadoVacio();
    e.cierres.arranque = firma;
    const instalar: Plan['misiones'][number] = { id: 't_instalar', para: 'titular', fase: 'mvp', frente: 'direccion', xp: 40, titulo: 'Prueba la instalación', porQue: 'Lo mide la puerta', pasos: [{ texto: 'Instala', soloTu: 'Pasa en otro computador.' }], entrega: 'Lo que pasó', alCierre: true, pruebaDelTodo: true };
    const decidir: Plan['misiones'][number] = { id: 't_decidir', para: 'titular', fase: 'mvp', frente: 'direccion', xp: 10, titulo: 'Decide cuándo instalar', porQue: 'Cambia la ruta', pasos: [{ texto: '¿Cuándo?', opciones: ['Ahora', 'Después'] }], entrega: 'La decisión' };
    const puerta: Plan['misiones'][number] = { id: 't_puerta', para: 'titular', fase: 'mvp', frente: 'direccion', xp: 20, titulo: 'Cruza la puerta', porQue: 'Fin de la fase', pasos: [{ texto: 'Cruza', hecho: { que: 'puerta', id: 'mvp' } }], entrega: 'La puerta', despuesDe: ['t_instalar'] };
    p.misiones.push(decidir, instalar, puerta);
    p.pedidos = [{ id: 'pd_beta', fase: 'beta', texto: 'La ayuda guiada', cambiaProducto: true }];
    const aMano = () => misionesAbiertas(p, e, 'titular').filter((m) => m.fase === 'mvp').map((m) => m.id);
    // Antes solo miraba su fase y las anteriores: el pedido de la fase siguiente se le escapaba
    expect(pedidosAntesDelCierre(p, 'mvp')).toEqual([]);
    expect(esperaAlCierre(p, e, instalar)).toBe(true);
    expect(aMano()).toEqual(['t_decidir']);
    expect(misionesEnEsperaDeCierre(p, e, 'titular').map((m) => m.id)).toEqual(['t_instalar']);
    // Empezarla antes de tiempo y marcar pasos no la abre, y no cuenta en la reserva
    e.empezadas.t_instalar = { cuando: '2026-11-02T22:00:00Z', quien: 'Laura' };
    expect(aMano()).toEqual(['t_decidir']);
    expect(reservaDeMisiones(p, e, 'titular').enOrden.map((m) => m.id)).not.toContain('t_instalar');
    // Lo que no cambia el producto no la retiene, ni lo que se hace en el cierre mismo, ni lo reemplazado
    p.pedidos = [
      { id: 'pd_guion', fase: 'beta', texto: 'El guion del video', cambiaProducto: false },
      { id: 'pd_zip', fase: 'mvp', texto: 'El paquete', cambiaProducto: true, alCierre: true },
    ];
    expect(productoPorTerminar(p, e)).toEqual([]);
    p.pedidos = [{ id: 'pd_beta', fase: 'beta', texto: 'La ayuda guiada', cambiaProducto: true }];
    // Hecho, aparece sola
    p.pedidos[0].hecho = { cuando: '2026-11-03T10:00:00Z', nota: 'Commit abc1234' };
    expect(esperaAlCierre(p, e, instalar)).toBe(false);
    expect(aMano()).toEqual(['t_decidir', 't_instalar']);
    // Una propuesta aceptada también la retiene; sin aceptar, no
    p.propuestas = [{ id: 'pr_beta', area: 'web', titulo: 'El panel', problema: 'x', propuesta: 'y', conecta: 'z', fase: 'equipo', cambiaProducto: true }];
    expect(productoPorTerminar(p, e)).toEqual([]);
    e.propuestas = { pr_beta: { estado: 'aceptada', ...firma } };
    expect(productoPorTerminar(p, e).map((x) => x.id)).toEqual(['pr_beta']);
    expect(aMano()).toEqual(['t_decidir']);
    p.ejecutadas = { pr_beta: { cuando: '2026-11-03T10:00:00Z', nota: 'Hecha, commit abc1234' } };
    expect(aMano()).toEqual(['t_decidir', 't_instalar']);
  });

  it('una prueba del todo no depende de que el director se acuerde: la marca es obligatoria', () => {
    const p = planEjemplo();
    const e = estadoVacio();
    e.cierres.arranque = firma;
    const instalar: Plan['misiones'][number] = { id: 't_instalar', para: 'titular', fase: 'mvp', frente: 'direccion', xp: 40, titulo: 'Prueba la instalación', porQue: 'Lo mide la puerta', pasos: [{ texto: 'Instala', soloTu: 'Pasa en otro computador.' }], entrega: 'Lo que pasó', alCierre: true };
    p.misiones.push(instalar);
    p.pedidos = [{ id: 'pd_sin_marca', fase: 'beta', texto: 'Algo pedido' }, { id: 'pd_con_marca', fase: 'beta', texto: 'Otra cosa', cambiaProducto: false }];
    // Una prueba en otro computador sin la marca no pasa, salvo si ya es historia
    expect(validarPlan(p).join(' ')).toContain('pruebaDelTodo');
    p.revisiones = { t_instalar: { cuando: '2026-11-02T22:00:00Z', veredicto: 'aprobada', comentario: 'Hecha' } };
    expect(validarPlan(p).join(' ')).not.toContain('pruebaDelTodo');
    delete p.revisiones.t_instalar;
    // Sin una prueba abierta, nada obliga a decir si cambia el producto
    expect(sinDecirSiCambiaProducto(p, e)).toEqual([]);
    instalar.pruebaDelTodo = true;
    expect(validarPlan(p).join(' ')).not.toContain('pruebaDelTodo');
    // Con ella, un pedido sin decirlo no se escapa; dicho o hecho, ya no falta
    expect(sinDecirSiCambiaProducto(p, e)).toEqual(['pd_sin_marca']);
    p.pedidos[0].cambiaProducto = false;
    expect(sinDecirSiCambiaProducto(p, e)).toEqual([]);
  });

  it('lo que cierra la fase espera a que esté hecho todo lo aprobado (nota de voz del titular, 22 de octubre de 2026)', () => {
    const p = planEjemplo();
    const e = estadoVacio();
    e.cierres.arranque = firma;
    const prueba: Plan['misiones'][number] = { id: 't_prueba', para: 'titular', fase: 'mvp', frente: 'direccion', xp: 30, titulo: 'Prueba la instalación', porQue: 'Lo mide la puerta', pasos: ['Instala'], entrega: 'Lo que pasó', alCierre: true };
    const puerta: Plan['misiones'][number] = { id: 't_puerta', para: 'titular', fase: 'mvp', frente: 'direccion', xp: 20, titulo: 'Cruza la puerta', porQue: 'Fin de la fase', pasos: [{ texto: 'Cruza la puerta', hecho: { que: 'puerta', id: 'mvp' } }], entrega: 'La puerta cruzada' };
    const ver: Plan['misiones'][number] = { id: 't_ver', para: 'titular', fase: 'mvp', frente: 'direccion', xp: 10, titulo: 'Mira lo hecho', porQue: 'Se ve en pantalla', pasos: ['Míralo'], entrega: 'Visto' };
    p.misiones.push(ver, prueba, puerta);
    expect([prueba, puerta, ver].map(esDeCierre)).toEqual([true, true, false]);
    // Una propuesta aceptada sin ejecutar de la fase, y otra de una fase ya cruzada: las dos se esperan
    p.propuestas = [
      { id: 'pr_mvp', area: 'api', titulo: 'Los reintentos', problema: 'x', propuesta: 'y', conecta: 'z', fase: 'mvp' },
      { id: 'pr_vieja', area: 'web', titulo: 'El tablero', problema: 'x', propuesta: 'y', conecta: 'z', fase: 'arranque' },
      { id: 'pr_beta', area: 'web', titulo: 'El panel', problema: 'x', propuesta: 'y', conecta: 'z', fase: 'beta' },
    ];
    e.propuestas = { pr_mvp: { estado: 'aceptada', ...firma }, pr_vieja: { estado: 'aceptada', ...firma }, pr_beta: { estado: 'aceptada', ...firma } };
    const delMvp = () => misionesAbiertas(p, e, 'titular').filter((m) => m.fase === 'mvp').map((m) => m.id);
    expect(delMvp()).toEqual(['t_ver']);
    expect(misionesEnEsperaDeCierre(p, e, 'titular').map((m) => m.id)).toEqual(['t_prueba', 't_puerta']);
    // Las que esperan no cuentan en la reserva, ni las de la fase siguiente mientras esperen (nota de voz del titular,
    // 22 de octubre de 2026: la reserva contaba seis y él veía una): con cuatro abiertas, faltan seis para las diez
    expect(reservaDeMisiones(p, e, 'titular')).toMatchObject({ alcanza: 4, faltan: 6 });
    expect(reservaDeMisiones(p, e, 'titular').enEspera).toHaveLength(2);
    // Lo que el titular vivió: una abierta, cuatro retenidas y dos de la fase siguiente cuentan una, y faltan nueve
    const vivido = planEjemplo();
    const ev = estadoVacio();
    ev.cierres.arranque = firma;
    vivido.misiones = [
      { ...ver, id: 't_ahora' },
      ...['t_c1', 't_c2', 't_c3', 't_c4'].map((id) => ({ ...prueba, id })),
      ...['t_b1', 't_b2'].map((id) => ({ ...ver, id, fase: 'beta' })),
    ];
    vivido.propuestas = [{ id: 'pr_mvp', area: 'api', titulo: 'Los reintentos', problema: 'x', propuesta: 'y', conecta: 'z', fase: 'mvp' }];
    ev.propuestas = { pr_mvp: { estado: 'aceptada', ...firma } };
    expect(reservaDeMisiones(vivido, ev, 'titular')).toMatchObject({ alcanza: 1, faltan: 9 });
    // Sin nada retenido, las de la fase siguiente sí se alcanzan (al cruzar la puerta, que es una abierta)
    vivido.ejecutadas = { pr_mvp: { cuando: '2026-10-16T10:00:00Z', nota: 'Hecha' } };
    expect(reservaDeMisiones(vivido, ev, 'titular')).toMatchObject({ alcanza: 7, faltan: 3 });
    // Empezada antes de tiempo, también espera: sus marcas se conservan
    e.empezadas.t_prueba = { cuando: '2026-10-16T09:00:00Z', quien: 'Laura' };
    expect(misionesEnEsperaDeCierre(p, e, 'titular').map((m) => m.id)).toEqual(['t_prueba', 't_puerta']);
    p.ejecutadas = { pr_mvp: { cuando: '2026-10-16T10:00:00Z', nota: 'Hecha' } };
    expect(esperaAlCierre(p, e, prueba)).toBe(true);
    // Hecho lo aprobado de la fase y de las anteriores, se abren; lo de una fase posterior no las detiene
    p.ejecutadas.pr_vieja = { cuando: '2026-10-16T10:00:00Z', nota: 'Hecha' };
    expect(delMvp()).toEqual(['t_ver', 't_prueba', 't_puerta']);
    expect(misionesEnEsperaDeCierre(p, e, 'titular')).toEqual([]);
    // Lo pedido en una nota y sin hacer también se espera; lo de una fase posterior, no
    p.pedidos = [
      { id: 'pd_tipo', fase: 'mvp', texto: 'Cada nota con su tipo', notas: ['n1'] },
      { id: 'pd_beta', fase: 'beta', texto: 'El panel en inglés' },
    ];
    expect(pedidosAntesDelCierre(p, 'mvp').map((x) => x.id)).toEqual(['pd_tipo']);
    expect(delMvp()).toEqual(['t_ver']);
    p.pedidos[0].hecho = { cuando: '2026-10-17T10:00:00Z', nota: 'Commit abc1234' };
    expect(delMvp()).toEqual(['t_ver', 't_prueba', 't_puerta']);
    // validarPlan: un pedido nombra una fase que existe, no se repite y dice qué se pidió
    expect(validarPlan(p).filter((x) => x.includes('pedido'))).toEqual([]);
    // La respuesta a la nota que lo pidió lleva a él, en «La ruta» de su fase
    p.respuestas = {
      n1: { cuando: '2026-10-16T10:00:00Z', texto: 'Queda como pedido', tratamiento: 'aplazada', destino: { vista: 'ruta', fase: 'beta', ancla: 'pedido-pd_beta', etiqueta: 'Ver el pedido' } },
      n2: { cuando: '2026-10-16T10:00:00Z', texto: 'Queda como pedido', tratamiento: 'aplazada', destino: { vista: 'ruta', fase: 'mvp', ancla: 'pedido-pd_beta', etiqueta: 'Ver el pedido' } },
      n3: { cuando: '2026-10-16T10:00:00Z', texto: 'Queda como pedido', tratamiento: 'aplazada', destino: { vista: 'ruta', fase: 'mvp', ancla: 'pedido-pd_otro', etiqueta: 'Ver el pedido' } },
    };
    expect(validarPlan(p).filter((x) => x.includes('pedido'))).toHaveLength(2);
    p.respuestas = {};
    p.pedidos.push({ id: 'pd_tipo', fase: 'otra', texto: ' ' });
    expect(validarPlan(p).filter((x) => x.includes('pedido'))).toHaveLength(3);
  });

  it('una propuesta aceptada que se hace en el cierre no lo retiene ni entra en la cola (nota del titular nmw8kbw5dtit)', () => {
    const p = planEjemplo();
    const e = estadoVacio();
    e.cierres.arranque = firma;
    const base: Plan['misiones'][number] = { id: 't_x', para: 'titular', fase: 'mvp', frente: 'direccion', xp: 10, titulo: 'X', porQue: 'Por qué ahora', pasos: ['Hazlo'], entrega: 'Hecho' };
    // Rehacer la historia justo antes de subir: solo se puede hacer dentro de la misión de la subida
    p.propuestas = [{ id: 'pr_historia', area: 'publicacion', titulo: 'La historia limpia antes de subir', problema: 'x', propuesta: 'y', conecta: 'z', fase: 'mvp', cambiaProducto: true }];
    e.propuestas = { pr_historia: { estado: 'aceptada', ...firma } };
    const subir: Plan['misiones'][number] = { ...base, id: 't_subir', titulo: 'Sube el Studio', alCierre: true, pruebaDelTodo: true };
    p.misiones = [{ ...base, id: 't_declarar', titulo: 'Declara la fase completa', alCierre: true }, subir];
    // Sin la marca, la propuesta retiene el cierre y espera en la cola del director: se esperarían el uno al otro
    expect(esperaAlCierre(p, e, p.misiones[0])).toBe(true);
    expect(productoPorTerminar(p, e).map((x) => x.id)).toEqual(['pr_historia']);
    expect(colaDelDirector(p, e).map((t) => t.id)).toEqual(['pr_historia']);
    // Con `alCierre`, el cierre se abre, la prueba del todo no la espera y sale de la cola; sigue aceptada sin ejecutar
    p.propuestas[0].alCierre = true;
    expect(esperaAlCierre(p, e, p.misiones[0])).toBe(false);
    expect(esperaAlCierre(p, e, subir)).toBe(false);
    expect(productoPorTerminar(p, e)).toEqual([]);
    expect(colaDelDirector(p, e)).toEqual([]);
    expect(aceptadasSinEjecutar(p, e).map((x) => x.propuesta.id)).toEqual(['pr_historia']);
    // Y no pide decir si cambia el producto mientras la prueba del todo sigue abierta
    delete p.propuestas[0].cambiaProducto;
    expect(sinDecirSiCambiaProducto(p, e)).toEqual([]);
  });

  it('cada misión aparece cuando está hecho lo que necesita (nota de voz del titular, 23 de octubre de 2026)', () => {
    const p = planEjemplo();
    const e = estadoVacio();
    e.cierres.arranque = firma;
    const base: Plan['misiones'][number] = { id: 't_x', para: 'titular', fase: 'mvp', frente: 'direccion', xp: 10, titulo: 'X', porQue: 'Por qué ahora', pasos: ['Hazlo'], entrega: 'Hecho' };
    p.propuestas = [{ id: 'pr_tipo', area: 'web', titulo: 'Cada nota con su tipo', problema: 'x', propuesta: 'y', conecta: 'z', fase: 'mvp' }];
    e.propuestas = { pr_tipo: { estado: 'aceptada', ...firma } };
    p.pedidos = [{ id: 'pd_paquete', fase: 'mvp', texto: 'El paquete de instalación', alCierre: true }];
    p.misiones = [
      { ...base, id: 't_decidir', titulo: 'Decide el alcance' },
      { ...base, id: 't_ver_tipo', titulo: 'Mira el tipo de cada nota', despuesDe: ['pr_tipo'] },
      { ...base, id: 't_despues', titulo: 'Lo que sigue a la decisión', despuesDe: ['t_decidir'] },
      // El cierre: declarar la fase, y la instalación, que necesita el paquete que el director arma después
      { ...base, id: 't_declarar', titulo: 'Declara la fase completa', alCierre: true },
      { ...base, id: 't_instalar', titulo: 'Prueba la instalación', alCierre: true, despuesDe: ['pd_paquete'] },
    ];
    const abiertas = () => misionesAbiertas(p, e, 'titular').map((m) => m.id);
    // La que espera una propuesta sin ejecutar no aparece; la que espera otra misión tampoco, pero llega sin el director
    expect(abiertas()).toEqual(['t_decidir']);
    expect(esperaA(p, e, p.misiones[1])).toEqual(['pr_tipo']);
    const r = reservaDeMisiones(p, e, 'titular');
    expect(r.esperan.map((m) => m.id)).toEqual(['t_ver_tipo', 't_despues']);
    expect(r.alcanza).toBe(2);
    // Una cadena de misiones suyas, una después de otra, se alcanza entera sin revisión (la revisión del 30 de octubre:
    // con diez misiones encadenadas, la reserva contaba dos); la que espera la propuesta, en cualquier eslabón, no
    p.misiones.push({ ...base, id: 't_luego', titulo: 'Lo que sigue a lo que sigue', despuesDe: ['t_despues'] }, { ...base, id: 't_al_final', titulo: 'Al final', despuesDe: ['t_luego'] }, { ...base, id: 't_tras_ver', titulo: 'Después de ver el tipo', despuesDe: ['t_ver_tipo'] });
    expect(reservaDeMisiones(p, e, 'titular')).toMatchObject({ alcanza: 4 });
    expect(reservaDeMisiones(p, e, 'titular').llegan.map((m) => m.id)).toEqual(['t_despues', 't_luego', 't_al_final']);
    // Y en el orden en que aparecen, con el mismo número que la reserva: es lo que lista «Lo que sigue» (nota nmvvalvdttit,
    // que veía «0 misiones más» con la reserva en diez)
    expect(reservaDeMisiones(p, e, 'titular').enOrden.map((m) => m.id)).toEqual(['t_decidir', 't_despues', 't_luego', 't_al_final']);
    p.misiones = p.misiones.filter((m) => !['t_luego', 't_al_final', 't_tras_ver'].includes(m.id));
    // Entregada la decisión, aparece la que la seguía
    e.entregas.t_decidir = { cuando: '2026-10-23T10:00:00Z', quien: 'Laura' };
    expect(abiertas()).toEqual(['t_despues']);
    // Ejecutada la propuesta, aparece la de verla; y sin nada aprobado ni pedido antes del cierre, el cierre se abre,
    // aunque el paquete siga sin hacer: es del cierre (`alCierre`), y la instalación lo espera a él, no al revés
    p.ejecutadas = { pr_tipo: { cuando: '2026-10-23T11:00:00Z', nota: 'Hecha' } };
    expect(pedidosAntesDelCierre(p, 'mvp')).toEqual([]);
    expect(abiertas()).toEqual(['t_ver_tipo', 't_despues', 't_declarar']);
    expect(misionesEnEsperaDeCierre(p, e, 'titular')).toEqual([]);
    expect(misionesQueEsperan(p, e, 'titular').map((m) => m.id)).toEqual(['t_instalar']);
    p.pedidos[0].hecho = { cuando: '2026-10-23T12:00:00Z', nota: 'Commit abc1234' };
    expect(abiertas()).toEqual(['t_ver_tipo', 't_despues', 't_declarar', 't_instalar']);
    // Un pedido común sí retiene el cierre, como siempre
    p.pedidos.push({ id: 'pd_tipo', fase: 'mvp', texto: 'El tipo obligatorio' });
    expect(abiertas()).toEqual(['t_ver_tipo', 't_despues']);
    // Una propuesta descartada ya no se hará: no retiene a nadie
    p.misiones[1].despuesDe = ['pr_tipo'];
    delete p.ejecutadas.pr_tipo;
    e.propuestas.pr_tipo = { estado: 'descartada', ...firma };
    expect(esperaA(p, e, p.misiones[1])).toEqual([]);
    // validarPlan: lo que necesita existe, no es ella misma, y una misión de la misma persona va antes en la lista
    expect(validarPlan(p).filter((x) => x.includes('va después'))).toEqual([]);
    p.misiones[0].despuesDe = ['t_despues'];
    p.misiones[2].despuesDe = ['pr_inventada', 't_despues'];
    const errores = validarPlan(p).filter((x) => x.includes('va después') || x.includes('sí misma'));
    expect(errores).toHaveLength(3);
    expect(errores.join(' ')).toMatch(/pon primero lo que se necesita primero/);
  });

  it('lo reemplazado, fuera: sale de lo pendiente y va al archivo, y lo vigente es lo que lo reemplazó (pd_lo_vigente)', () => {
    const p = planEjemplo();
    const e = estadoVacio();
    e.cierres.arranque = firma;
    const base: Plan['misiones'][number] = { id: 't_x', para: 'titular', fase: 'mvp', frente: 'direccion', xp: 10, titulo: 'X', porQue: 'Por qué ahora', pasos: ['Hazlo'], entrega: 'Hecho' };
    p.propuestas = [
      { id: 'pr_vieja', area: 'web', titulo: 'El chat, como pantalla', problema: 'x', propuesta: 'y', conecta: 'z', fase: 'mvp' },
      { id: 'pr_nueva', area: 'web', titulo: 'El chat, como ventana pequeña', problema: 'x', propuesta: 'y', conecta: 'z', fase: 'mvp', reemplaza: ['pr_vieja'] },
    ];
    e.propuestas = { pr_vieja: { estado: 'aceptada', ...firma }, pr_nueva: { estado: 'aceptada', ...firma } };
    p.pedidos = [
      { id: 'pd_ejemplo', fase: 'mvp', texto: 'Un proyecto de ejemplo' },
      { id: 'pd_semilla', fase: 'mvp', texto: 'El Studio llega como su propio proyecto', reemplaza: ['pd_ejemplo'] },
    ];
    p.colaDirector = ['pd_ejemplo', 'pr_vieja', 'pd_semilla', 'pr_nueva'];
    p.misiones = [{ ...base, id: 't_ver_ejemplo', titulo: 'Mira el proyecto de ejemplo', despuesDe: ['pd_ejemplo'] }];
    p.fases[1].misiones = ['El proyecto de ejemplo (pd_ejemplo)'];
    expect([...reemplazos(p)]).toEqual([['pd_ejemplo', 'pd_semilla'], ['pr_vieja', 'pr_nueva']]);
    // Fuera de la cola del director, de lo aprobado sin ejecutar, de lo que espera el cierre y de lo que hay que cruzar
    expect(colaDelDirector(p, e).map((t) => t.id)).toEqual(['pd_semilla', 'pr_nueva']);
    expect(aceptadasSinEjecutar(p, e).map((x) => x.propuesta.id)).toEqual(['pr_nueva']);
    expect(pedidosAntesDelCierre(p, 'mvp').map((x) => x.id)).toEqual(['pd_semilla']);
    const hubo = [{ hash: 'abc1234', cuando: '2026-10-23T10:00:00Z', asunto: 'STL: algo' }];
    const pendiente = pendientePorComprobar(p, e, '2026-10-23T00:00:00Z', hubo);
    expect([...pendiente.propuestas.map((x) => x.id), ...pendiente.pedidos.map((x) => x.id)]).toEqual(['pr_nueva', 'pd_semilla']);
    // La misión que esperaba lo reemplazado espera lo que lo reemplazó, y aparece cuando eso está hecho
    expect(esperaA(p, e, p.misiones[0])).toEqual(['pd_semilla']);
    expect(origenDePrevista(p.fases[1].misiones[0], p, e)).toEqual({ ids: ['pd_ejemplo'], hechos: [] });
    p.pedidos[1].hecho = { cuando: '2026-10-23T12:00:00Z', nota: 'Commit abc1234' };
    expect(esperaA(p, e, p.misiones[0])).toEqual([]);
    expect(origenDePrevista(p.fases[1].misiones[0], p, e).hechos).toEqual(['pd_ejemplo']);
    // En el cierre, lo reemplazado va al archivo aunque sea de esta revisión; lo vigente se queda hasta su turno
    delete p.pedidos[1].hecho;
    const a = archivar(p, archivoVacio(), e, '2026-10-12T00:00:00Z');
    expect(a.plan.pedidos!.map((x) => x.id)).toEqual(['pd_semilla']);
    expect(a.plan.propuestas.map((x) => x.id)).toEqual(['pr_nueva']);
    expect(a.archivo.pedidos!.map((x) => x.id)).toEqual(['pd_ejemplo']);
    expect(a.archivo.propuestas!.map((x) => x.id)).toEqual(['pr_vieja']);
    // Unido con su archivo, el reemplazo sigue valiendo, y la cola, el plan y su validación lo ven igual
    const unido = unirArchivo(a.plan, a.archivo);
    expect(reemplazos(unido).get('pd_ejemplo')).toBe('pd_semilla');
    expect(colaDelDirector(unido, e).map((t) => t.id)).toEqual(['pd_semilla', 'pr_nueva']);
    expect(validarPlan(unido).filter((x) => /reemplaz|cola del director/i.test(x))).toEqual([]);
    // validarPlan: lo reemplazado existe, no es él mismo, no lo reemplazan dos y no se reemplazan el uno al otro
    p.pedidos.push({ id: 'pd_otro', fase: 'mvp', texto: 'Otro', reemplaza: ['pd_ejemplo', 'pd_otro', 'pd_inventado'] });
    p.propuestas[0].reemplaza = ['pr_nueva'];
    const errores = validarPlan(p).filter((x) => /reemplaz/.test(x));
    expect(errores).toHaveLength(4);
    expect(errores.join(' ')).toMatch(/lo reemplazan dos/);
    expect(errores.join(' ')).toMatch(/a sí mismo/);
    expect(errores.join(' ')).toMatch(/pd_inventado/);
    expect(errores.join(' ')).toMatch(/el uno al otro/);
  });

  it('lo vigente va en una línea cada uno: hasta su primera pausa, o cortado en una palabra (pd_lo_vigente)', () => {
    const largo = `Un asistente de instalación dentro del Studio, como pediste en tu nota de voz del 26 de octubre: ${'npm run iniciar deja listo lo que no pregunta. '.repeat(8)}`;
    expect(enUnaLinea(largo)).toBe('Un asistente de instalación dentro del Studio, como pediste en tu nota de voz del 26 de octubre…');
    expect(enUnaLinea('Corto:  y   con espacios')).toBe('Corto: y con espacios');
    // Sin una pausa a tiempo, se corta en la última palabra que cabe, y nunca pasa del tope
    const sinPausa = `El paquete ${'de instalación sin datos '.repeat(12)}`;
    const linea = enUnaLinea(sinPausa, 80);
    expect(linea.length).toBeLessThanOrEqual(80);
    expect(linea).toMatch(/^El paquete de instalación sin datos .*[a-z]…$/);
  });

  it('lo de después del lanzamiento se ve en la última fase y no detiene ninguna puerta (decisión del titular, 22 de octubre de 2026)', () => {
    const p = planEjemplo();
    const ultima = p.fases.at(-1)!.id;
    p.pedidos = [
      { id: 'pd_mensajes', fase: DESPUES, texto: 'Los mensajes entre el equipo', notas: ['n1'] },
      { id: 'pd_tipo', fase: ultima, texto: 'Cada nota con su tipo' },
    ];
    // Ni la puerta de la última fase la espera: solo lo de su fase
    expect(pedidosAntesDelCierre(p, ultima).map((x) => x.id)).toEqual(['pd_tipo']);
    expect(faseDondeSeVe(p, p.pedidos[0])).toBe(ultima);
    expect(validarPlan(p).filter((x) => x.includes('pedido'))).toEqual([]);
    // El «Quedó en» lleva a la última fase, donde se ve; a otra fase, no
    p.respuestas = { n1: { cuando: '2026-10-16T10:00:00Z', texto: 'Queda para después', tratamiento: 'aplazada', destino: { vista: 'ruta', fase: ultima, ancla: 'pedido-pd_mensajes', etiqueta: 'Ver el pedido' } } };
    expect(validarPlan(p).filter((x) => x.includes('pedido'))).toEqual([]);
    p.respuestas.n1.destino = { vista: 'ruta', fase: p.fases[0].id, ancla: 'pedido-pd_mensajes', etiqueta: 'Ver el pedido' };
    expect(validarPlan(p).filter((x) => x.includes('pedido'))).toHaveLength(1);
    // Una fase inventada sigue sin valer
    p.respuestas = {};
    p.pedidos.push({ id: 'pd_x', fase: 'luego', texto: 'Algo' });
    expect(validarPlan(p).filter((x) => x.includes('pedido'))).toHaveLength(1);
  });

  it('lo aprobado para una fase futura se ve en ella; lo que espera respuesta sigue bajo niebla (notas de voz del titular, 22 de octubre de 2026)', () => {
    const p = planEjemplo();
    const e = estadoVacio();
    p.propuestas = [
      { id: 'pr_chat', area: 'web', titulo: 'El chat', problema: 'x', propuesta: 'y', conecta: 'z', fase: 'beta' },
      { id: 'pr_hecha', area: 'web', titulo: 'El panel', problema: 'x', propuesta: 'y', conecta: 'z', fase: 'beta' },
      { id: 'pr_abierta', area: 'web', titulo: 'Los sonidos', problema: 'x', propuesta: 'y', conecta: 'z', fase: 'beta' },
      { id: 'pr_no', area: 'web', titulo: 'El tablero', problema: 'x', propuesta: 'y', conecta: 'z', fase: 'beta' },
      { id: 'pr_mvp', area: 'api', titulo: 'Los reintentos', problema: 'x', propuesta: 'y', conecta: 'z', fase: 'mvp' },
    ];
    e.propuestas = { pr_chat: { estado: 'aceptada', ...firma }, pr_hecha: { estado: 'aceptada', ...firma }, pr_no: { estado: 'descartada', ...firma }, pr_mvp: { estado: 'aceptada', ...firma } };
    p.ejecutadas = { pr_hecha: { cuando: '2026-10-16T10:00:00Z', nota: 'Hecha' } };
    // Las aceptadas de esa fase, hechas o no; ni la que espera respuesta, ni la descartada, ni las de otra fase
    expect(aprobadasDeFase(p, e, 'beta').map((x) => x.id)).toEqual(['pr_chat', 'pr_hecha']);
    // El botón que lleva a una propuesta en «La ruta» lleva a su fase
    p.respuestas = {
      n1: { cuando: '2026-10-16T10:00:00Z', texto: 'Quedó en su fase', tratamiento: 'informada', destino: { vista: 'ruta', fase: 'beta', ancla: 'propuesta-pr_chat', etiqueta: 'Ver el chat' } },
      n2: { cuando: '2026-10-16T10:00:00Z', texto: 'Quedó en su fase', tratamiento: 'informada', destino: { vista: 'ruta', fase: 'mvp', ancla: 'propuesta-pr_chat', etiqueta: 'Ver el chat' } },
      n3: { cuando: '2026-10-16T10:00:00Z', texto: 'Quedó en Propuestas', tratamiento: 'informada', destino: { vista: 'propuestas', ancla: 'propuesta-pr_chat', etiqueta: 'Ver el chat' } },
    };
    expect(validarPlan(p).filter((x) => x.includes('propuesta «pr_chat»'))).toEqual([expect.stringContaining('n2')]);
  });
});

describe('el plan no pesa: lo cerrado sale a su archivo', () => {
  const nota = (id: string, cuando: string, sobre: Nota['sobre'] = { tipo: 'general' }): Nota => ({ id, cuando, quien: 'Laura', sobre, texto: 'x' });
  const resp = (cuando: string) => ({ cuando, texto: 'Hecho', tratamiento: 'informada' as const });

  it('archiva las respuestas cerradas y los veredictos aprobados de antes de esta revisión, y unido se ve igual', () => {
    const p = planEjemplo();
    const e = estadoVacio();
    e.notas = [nota('vieja', '2026-10-10T10:00:00Z'), nota('de_abierta', '2026-10-10T11:00:00Z', { tipo: 'mision', id: 't_alcance' }), nota('nueva', '2026-10-15T10:00:00Z')];
    e.entregas.t_diag = { cuando: '2026-10-11T09:00:00.000Z', quien: 'Laura' };
    p.respuestas = { vieja: resp('2026-10-11T10:00:00Z'), de_abierta: resp('2026-10-11T10:00:00Z'), nueva: resp('2026-10-15T11:00:00Z') };
    p.revisiones = { t_diag: { cuando: '2026-10-11T10:00:00Z', veredicto: 'aprobada', comentario: 'Bien' } };
    const a = archivar(p, archivoVacio(), e, '2026-10-12T00:00:00Z');
    expect(Object.keys(a.plan.respuestas).sort()).toEqual(['de_abierta', 'nueva']);
    expect(Object.keys(a.archivo.respuestas)).toEqual(['vieja']);
    expect(Object.keys(a.archivo.revisiones)).toEqual(['t_diag']);
    // La misión aprobada sale entera, con su veredicto («El plan liviano», punto 1)
    expect(a.archivo.misiones!.map((m) => m.id)).toEqual(['t_diag']);
    expect(a.plan.misiones.some((m) => m.id === 't_diag')).toBe(false);
    expect(a.movidas).toBe(3);
    // Unido con su archivo, el plan es el mismo: nada se pierde, y lo del plan manda
    const unido = unirArchivo(a.plan, a.archivo);
    expect(unido.respuestas).toEqual(p.respuestas);
    // Las mismas misiones, cada una igual, y las que siguen en el plan en su orden
    expect([...unido.misiones].sort((x, y) => x.id.localeCompare(y.id))).toEqual([...p.misiones].sort((x, y) => x.id.localeCompare(y.id)));
    expect(unido.misiones.filter((m) => m.id !== 't_diag').map((m) => m.id)).toEqual(p.misiones.filter((m) => m.id !== 't_diag').map((m) => m.id));
    // Archivar otra vez no la duplica, y una misión del plan con el mismo id manda sobre la archivada
    const otra = archivar(a.plan, a.archivo, e, '2026-10-12T00:00:00Z');
    expect(otra.archivo.misiones!.map((m) => m.id)).toEqual(['t_diag']);
    const cambiada = { ...p.misiones.find((m) => m.id === 't_diag')!, titulo: 'Otra' };
    expect(unirArchivo({ ...a.plan, misiones: [...a.plan.misiones, cambiada] }, a.archivo).misiones.filter((m) => m.id === 't_diag')).toEqual([cambiada]);
    expect(estadoMision(p.misiones.find((m) => m.id === 't_diag')!, unido, e)).toBe('aprobada');
    expect(validarPlan(unido, ['titular', 'ana'])).toEqual([]);
    expect(unirArchivo(p, { respuestas: { vieja: resp('2026-10-01T00:00:00Z') } }).respuestas.vieja).toEqual(p.respuestas.vieja);
    expect(unirArchivo(p, null)).toBe(p);
  });

  it('archiva las propuestas cerradas y los pedidos hechos antes de esta revisión; lo abierto se queda, y unido se ve igual («El plan liviano»)', () => {
    const p = planEjemplo();
    const fase = p.fases[0].id;
    const prop = (id: string) => ({ id, area: 'x', titulo: id, problema: 'x', propuesta: 'x', conecta: 'x', fase });
    p.propuestas = [prop('pr_desc'), prop('pr_ejec'), prop('pr_ejec_nueva'), prop('pr_acept'), prop('pr_sin')];
    p.ejecutadas = { pr_ejec: { cuando: '2026-10-11T10:00:00Z', nota: 'hecha' }, pr_ejec_nueva: { cuando: '2026-10-13T10:00:00Z', nota: 'hecha hoy' } };
    p.pedidos = [
      { id: 'pd_hecho', fase, texto: 'x', hecho: { cuando: '2026-10-11T10:00:00Z', nota: 'hecho' } },
      { id: 'pd_hoy', fase, texto: 'x', hecho: { cuando: '2026-10-13T10:00:00Z', nota: 'hecho hoy' } },
      { id: 'pd_sin', fase, texto: 'x' },
    ];
    const e = estadoVacio();
    const firma = (estado: 'aceptada' | 'descartada') => ({ fecha: '2026-10-10T10:00:00Z', quien: 'titular', estado });
    e.propuestas = { pr_desc: firma('descartada'), pr_ejec: firma('aceptada'), pr_ejec_nueva: firma('aceptada'), pr_acept: firma('aceptada') };
    const a = archivar(p, archivoVacio(), e, '2026-10-12T00:00:00Z');
    expect(a.plan.propuestas.map((x) => x.id)).toEqual(['pr_ejec_nueva', 'pr_acept', 'pr_sin']);
    expect(a.archivo.propuestas!.map((x) => x.id)).toEqual(['pr_desc', 'pr_ejec']);
    expect(a.plan.ejecutadas).toEqual({ pr_ejec_nueva: p.ejecutadas.pr_ejec_nueva });
    expect(a.archivo.ejecutadas).toEqual({ pr_ejec: p.ejecutadas.pr_ejec });
    expect(a.plan.pedidos!.map((x) => x.id)).toEqual(['pd_hoy', 'pd_sin']);
    expect(a.archivo.pedidos!.map((x) => x.id)).toEqual(['pd_hecho']);
    // Unido con su archivo, el plan es el mismo: nada se pierde
    const unido = unirArchivo(a.plan, a.archivo);
    const porId = <T extends { id: string }>(xs: T[]) => [...xs].sort((x, y) => x.id.localeCompare(y.id));
    expect(porId(unido.propuestas)).toEqual(porId(p.propuestas));
    expect(unido.ejecutadas).toEqual(p.ejecutadas);
    expect(porId(unido.pedidos!)).toEqual(porId(p.pedidos));
    expect(aceptadasSinEjecutar(unido, e).map((x) => x.propuesta.id)).toEqual(aceptadasSinEjecutar(p, e).map((x) => x.propuesta.id));
    expect(validarPlan(unido, ['titular', 'ana'])).toEqual(validarPlan(p, ['titular', 'ana']));
    // Archivar otra vez no duplica nada ni pierde lo ya archivado, aunque esta vez no salga nada nuevo
    const otra = archivar(a.plan, a.archivo, e, '2026-10-12T00:00:00Z');
    expect(otra.archivo.propuestas!.map((x) => x.id)).toEqual(['pr_desc', 'pr_ejec']);
    expect(otra.archivo.pedidos!.map((x) => x.id)).toEqual(['pd_hecho']);
    expect(otra.archivo.ejecutadas).toEqual({ pr_ejec: p.ejecutadas.pr_ejec });
    // Lo del plan manda sobre lo archivado con el mismo id
    const cambiado = { ...p.pedidos[0], texto: 'otro' };
    expect(unirArchivo({ ...a.plan, pedidos: [...a.plan.pedidos!, cambiado] }, a.archivo).pedidos!.filter((x) => x.id === 'pd_hecho')).toEqual([cambiado]);
  });

  it('lo adelantado de una fase cerrada antes de esta revisión sale al archivo, unido se ve igual, y lo que dice que algo falta se avisa («El plan liviano», punto 4)', () => {
    const p = planEjemplo();
    p.adelantado = [
      { fase: 'arranque', frente: 'api', texto: 'Hecho en el arranque' },
      { fase: 'mvp', frente: 'api', texto: 'Los endpoints de lectura' },
      { fase: 'beta', frente: 'web', texto: 'El panel ya lista; falta el filtro' },
    ];
    const e = estadoVacio();
    e.cierres = { arranque: { fecha: '2026-10-10T10:00:00Z', quien: 'titular' } };
    const a = archivar(p, archivoVacio(), e, '2026-10-12T00:00:00Z');
    expect(a.plan.adelantado.map((x) => x.fase)).toEqual(['mvp', 'beta']);
    expect(a.archivo.adelantado).toEqual([p.adelantado[0]]);
    expect(a.movidas).toBeGreaterThanOrEqual(1);
    // Unido, igual que antes; archivar otra vez no lo duplica
    expect(unirArchivo(a.plan, a.archivo).adelantado).toEqual(p.adelantado);
    expect(archivar(a.plan, a.archivo, e, '2026-10-12T00:00:00Z').archivo.adelantado).toEqual([p.adelantado[0]]);
    // Una fase cerrada en esta misma revisión espera una vuelta más
    const hoy = estadoVacio();
    hoy.cierres = { arranque: { fecha: '2026-10-13T10:00:00Z', quien: 'titular' } };
    expect(archivar(p, archivoVacio(), hoy, '2026-10-12T00:00:00Z').plan.adelantado).toEqual(p.adelantado);
    // Lo que dice que algo falta, en una fase que no se cerró, se avisa; lo de la cerrada, no
    expect(adelantadoConPendiente({ ...p, adelantado: [...p.adelantado, { fase: 'arranque', frente: 'api', texto: 'Falta algo' }] }, e)).toEqual([p.adelantado[2]]);
  });

  it('el archivo, partido por mes: cada cosa va al mes en que se cerró, lo de antes no se repite, y junto se ve igual («El plan liviano», punto 2)', () => {
    const p = planEjemplo();
    const fase = p.fases[0].id;
    const prop = (id: string) => ({ id, area: 'x', titulo: id, problema: 'x', propuesta: 'x', conecta: 'x', fase });
    const mision = (id: string) => ({ ...p.misiones[0], id });
    const archivo: ArchivoPlan = {
      respuestas: { r_sep: { cuando: '2026-09-30T23:00:00Z', texto: 'septiembre' }, r_oct: { cuando: '2026-10-02T10:00:00Z', texto: 'octubre' } },
      revisiones: { m_sep: { cuando: '2026-09-20T10:00:00Z', veredicto: 'aprobada', comentario: 'bien' }, m_oct: { cuando: '2026-10-05T10:00:00Z', veredicto: 'aprobada', comentario: 'bien' } },
      misiones: [mision('m_sep'), mision('m_oct')],
      propuestas: [prop('pr_ejec'), prop('pr_desc')],
      ejecutadas: { pr_ejec: { cuando: '2026-10-03T10:00:00Z', nota: 'hecha' } },
      pedidos: [{ id: 'pd_hecho', fase, texto: 'x', hecho: { cuando: '2026-09-10T10:00:00Z', nota: 'hecho' } }],
      adelantado: [{ fase: 'arranque', frente: 'api', texto: 'Hecho en el arranque' }],
    };
    const meses = partirArchivoPorMes(archivo);
    expect(Object.keys(meses).sort()).toEqual(['2026-09', '2026-10', SIN_FECHA]);
    expect(Object.keys(meses['2026-09'].respuestas)).toEqual(['r_sep']);
    expect(meses['2026-09'].misiones!.map((m) => m.id)).toEqual(['m_sep']);
    expect(meses['2026-09'].pedidos!.map((x) => x.id)).toEqual(['pd_hecho']);
    expect(meses['2026-10'].misiones!.map((m) => m.id)).toEqual(['m_oct']);
    expect(meses['2026-10'].propuestas!.map((x) => x.id)).toEqual(['pr_ejec']);
    expect(meses['2026-10'].ejecutadas).toEqual(archivo.ejecutadas);
    // Lo que no tiene fecha (una propuesta descartada, lo adelantado) va aparte, y no se pierde
    expect(meses[SIN_FECHA].propuestas!.map((x) => x.id)).toEqual(['pr_desc']);
    expect(meses[SIN_FECHA].adelantado).toEqual(archivo.adelantado);
    expect(mesDelArchivo(undefined)).toBe(SIN_FECHA);
    // Junto, en orden de mes, el Studio ve lo mismo que con el archivo de una sola pieza
    const porId = <T extends { id: string }>(xs: T[] = []) => [...xs].sort((x, y) => x.id.localeCompare(y.id));
    const junto = juntarArchivos(Object.keys(meses).sort().map((m) => meses[m]));
    const plan = { ...p, misiones: [], propuestas: [], pedidos: [], adelantado: [], respuestas: {}, revisiones: {}, ejecutadas: {} };
    const conUno = unirArchivo(plan, archivo), conMeses = unirArchivo(plan, junto);
    expect(conMeses.respuestas).toEqual(conUno.respuestas);
    expect(conMeses.revisiones).toEqual(conUno.revisiones);
    expect(conMeses.ejecutadas).toEqual(conUno.ejecutadas);
    expect(porId(conMeses.misiones)).toEqual(porId(conUno.misiones));
    expect(porId(conMeses.propuestas)).toEqual(porId(conUno.propuestas));
    expect(porId(conMeses.pedidos)).toEqual(porId(conUno.pedidos));
    expect(conMeses.adelantado).toEqual(conUno.adelantado);
    // Con el archivo de antes, de una sola pieza: lo que dice igual no se repite en los meses; lo que cambió, sí, y manda
    const previo: ArchivoPlan = { ...archivo, respuestas: { ...archivo.respuestas, r_oct: { cuando: '2026-10-02T10:00:00Z', texto: 'la de antes' } } };
    const nuevos = partirArchivoPorMes(archivo, previo);
    expect(Object.keys(nuevos)).toEqual(['2026-10']);
    expect(nuevos['2026-10']).toEqual({ respuestas: { r_oct: archivo.respuestas.r_oct }, revisiones: {} });
    expect(juntarArchivos([previo, nuevos['2026-10']]).respuestas.r_oct.texto).toBe('octubre');
    expect(partirArchivoPorMes(archivo, archivo)).toEqual({});
  });

  it('el estado de cada misión prevista de una fase se calcula de lo que nombra, también lo archivado («El plan liviano», punto 3)', () => {
    const p = planEjemplo();
    const fase = 'mvp';
    p.pedidos = [{ id: 'pd_hecho', fase, texto: 'x', hecho: { cuando: '2026-10-11T10:00:00Z', nota: 'hecho' } }, { id: 'pd_falta', fase, texto: 'x' }];
    p.propuestas = [{ id: 'pr_ejec', area: 'x', titulo: 'x', problema: 'x', propuesta: 'x', conecta: 'x', fase }];
    p.ejecutadas = { pr_ejec: { cuando: '2026-10-11T10:00:00Z', nota: 'hecha' } };
    const e = estadoVacio();
    expect(origenDePrevista('El tramo de los permisos (pd_hecho y pr_ejec)', p, e)).toEqual({ ids: ['pd_hecho', 'pr_ejec'], hechos: ['pd_hecho', 'pr_ejec'] });
    expect(origenDePrevista('Lo que falta (pd_falta), con pd_hecho', p, e)).toEqual({ ids: ['pd_falta', 'pd_hecho'], hechos: ['pd_hecho'] });
    // Un id que no está en el plan no cuenta, y una misión abierta no está hecha
    expect(origenDePrevista('Sin origen (pd_no_existe)', p, e)).toEqual({ ids: [], hechos: [] });
    expect(origenDePrevista('Los endpoints (c_endpoints)', p, e)).toEqual({ ids: ['c_endpoints'], hechos: [] });
    // Lo archivado cuenta igual, una vez unido
    const a = archivar(p, archivoVacio(), e, '2026-10-12T00:00:00Z');
    expect(origenDePrevista('(pd_hecho y pr_ejec)', unirArchivo(a.plan, a.archivo), e).hechos).toEqual(['pd_hecho', 'pr_ejec']);
  });

  it('una misión abierta con trabajo nuevo alrededor se comprueba antes de cerrar la revisión', () => {
    const p = planEjemplo();
    const e = estadoVacio();
    const desde = '2026-10-12T00:00:00Z';
    expect(misionesPorVigilar(p, e, desde, [])).toEqual([]);
    const commits = [{ hash: 'abc123', cuando: '2026-10-12T10:00:00Z', asunto: 'STL: el alcance ya hecho' }];
    expect(misionesPorVigilar(p, e, desde, commits).map((x) => x.mision.id)).toEqual(['t_conectar', 't_diag', 't_alcance']);
    // Una nota sobre una misión cuenta solo para ella; las de antes de la revisión, no
    e.notas = [nota('n1', '2026-10-12T09:00:00Z', { tipo: 'mision', id: 't_diag' }), nota('n0', '2026-10-01T09:00:00Z', { tipo: 'mision', id: 't_alcance' })];
    expect(misionesPorVigilar(p, e, desde, []).map((x) => x.mision.id)).toEqual(['t_diag']);
    // Un «Hazlo tú» puede dejar hecha cualquier otra
    e.notas.push(nota('h1', '2026-10-12T09:30:00Z', { tipo: 'mision', id: 't_conectar', seccion: 'Paso 1', hazlo: true }));
    expect(misionesPorVigilar(p, e, desde, []).map((x) => x.mision.id)).toEqual(['t_conectar', 't_diag', 't_alcance']);
    // Comprobada en esta revisión (`vigente`), sale de la lista; una fecha que no se entiende es un error del plan
    p.misiones = p.misiones.map((m) => ({ ...m, vigente: '2026-10-12T11:00:00Z' }));
    expect(misionesPorVigilar(p, e, desde, commits)).toEqual([]);
    expect(validarPlan({ ...p, misiones: [{ ...p.misiones[0], vigente: 'ayer' }, ...p.misiones.slice(1)] }, ['titular', 'ana'])).toHaveLength(1);
  });

  it('con trabajo nuevo, todo lo pendiente del plan se cruza con lo hecho antes de cerrar la revisión', () => {
    const p = planEjemplo();
    const e = estadoVacio();
    const desde = '2026-10-12T00:00:00Z';
    p.propuestas = [{ id: 'pr_tipo', area: 'web', titulo: 'El tipo de cada nota', problema: 'x', propuesta: 'y', conecta: 'z', fase: p.fases[0].id }];
    e.propuestas = { pr_tipo: { estado: 'aceptada', fecha: '2026-10-10T10:00:00Z', quien: 'Laura' } };
    p.pedidos = [{ id: 'pd_linea', fase: p.fases[0].id, texto: 'La línea en la barra' }, { id: 'pd_hecho', fase: p.fases[0].id, texto: 'Ya hecho', hecho: { cuando: '2026-10-11T10:00:00Z', nota: 'abc' } }];
    const commits = [{ hash: 'abc123', cuando: '2026-10-12T10:00:00Z', asunto: 'STL: la línea en la barra' }];
    // Sin trabajo desde la última revisión, nada que cruzar
    expect(pendientePorComprobar(p, e, desde, [])).toEqual({ propuestas: [], pedidos: [] });
    // Con un commit (o un «Hazlo tú»), lo aceptado sin ejecutar y lo pedido sin hacer esperan su comprobación
    const lista = (x: ReturnType<typeof pendientePorComprobar>) => [...x.propuestas, ...x.pedidos].map((y) => y.id);
    expect(lista(pendientePorComprobar(p, e, desde, commits))).toEqual(['pr_tipo', 'pd_linea']);
    e.notas = [{ id: 'h1', cuando: '2026-10-12T09:00:00Z', quien: 'Laura', sobre: { tipo: 'mision', id: 't_diag', seccion: 'Paso 1', hazlo: true }, texto: 'x' }];
    expect(lista(pendientePorComprobar(p, e, desde, []))).toEqual(['pr_tipo', 'pd_linea']);
    // Dicho en esta revisión (`alDia`), sale; uno de la revisión anterior no vale
    p.alDia = { cuando: '2026-10-11T23:00:00Z', nota: 'De antes' };
    expect(lista(pendientePorComprobar(p, e, desde, commits))).toEqual(['pr_tipo', 'pd_linea']);
    p.alDia = { cuando: '2026-10-12T11:00:00Z', nota: 'pd_linea hecho en abc123; lo demás sigue igual' };
    expect(pendientePorComprobar(p, e, desde, commits)).toEqual({ propuestas: [], pedidos: [] });
    expect(validarPlan(p).filter((x) => x.includes('alDia'))).toEqual([]);
    expect(validarPlan({ ...p, alDia: { cuando: 'hoy', nota: ' ' } }).filter((x) => x.includes('alDia'))).toHaveLength(1);
  });

  it('lo que se integra o se aplaza dice dónde quedó con precisión, no la fase entera', () => {
    const p = planEjemplo();
    const desde = '2026-10-12T00:00:00Z';
    const r = (tratamiento: 'integrada' | 'aplazada' | 'informada', destino: Plan['respuestas'][string]['destino'], cuando = '2026-10-12T10:00:00Z') => ({ cuando, texto: 'x', tratamiento, destino });
    const fase = p.fases[0].id;
    p.respuestas = {
      entera: r('integrada', { vista: 'ruta', fase, etiqueta: 'La fase' }),
      aplazada: r('aplazada', { vista: 'ruta', fase, etiqueta: 'La fase' }),
      al_plan: r('integrada', { vista: 'ruta', fase, ancla: 'r-plan', etiqueta: 'El plan de la fase' }),
      informada: r('informada', { vista: 'ruta', fase, etiqueta: 'La fase' }),
      vieja: r('integrada', { vista: 'ruta', fase, etiqueta: 'La fase' }, '2026-10-01T10:00:00Z'),
    };
    expect(respuestasALaFaseEntera(p, desde)).toEqual(['entera', 'aplazada']);
  });

  it('lo aplazado para la fase en curso que solo vive en una respuesta se le da al director hasta que tenga su pedido', () => {
    const p = planEjemplo();
    const [primera, segunda] = p.fases.map((f) => f.id);
    const r = (fase: string, ancla?: string) => ({ cuando: '2026-10-10T10:00:00Z', texto: 'Para después', tratamiento: 'aplazada' as const, destino: { vista: 'ruta' as const, fase, ancla, etiqueta: 'La fase' } });
    p.respuestas = { a: r(primera), b: r(segunda), c: r(primera, 'pedido-pd_x'), d: { ...r(primera), tratamiento: 'integrada' as const }, e: r(primera) };
    expect(aplazadasSinPedido(p, primera)).toEqual(['a', 'e']);
    // Lo de una fase posterior aparece al llegar a ella; con su pedido, sale
    expect(aplazadasSinPedido(p, segunda)).toEqual(['a', 'b', 'e']);
    p.pedidos = [{ id: 'pd_a', fase: segunda, texto: 'Lo de a', notas: ['a'] }];
    expect(aplazadasSinPedido(p, segunda)).toEqual(['b', 'e']);
  });

  it('lo que dejó una revisión que no se cerró: la siguiente lo retoma sin rehacerlo', () => {
    const p = planEjemplo();
    const desde = '2026-10-21T21:11:53.437Z';
    const nada = { propuestas: [], pedidos: [], documentos: [], evaluacion: [], partes: [] };
    expect(loQueDejo(p, desde)).toEqual({ respuestas: [], revisiones: [], misiones: [], ejecutadas: [], ...nada });
    p.respuestas = { ...p.respuestas, n_antes: { cuando: '2026-10-21T20:00:00Z', texto: 'De antes.' }, n_nueva: { cuando: '2026-10-21T21:15:00Z', texto: 'Ya respondida.' } };
    p.revisiones = { ...p.revisiones, t_diag: { cuando: '2026-10-21T21:16:00Z', veredicto: 'aprobada', comentario: 'Bien.' } };
    p.misiones = p.misiones.map((m, i) => (i === 0 ? { ...m, vigente: '2026-10-21T21:17:00Z' } : m));
    p.ejecutadas = { pr_x: { cuando: '2026-10-21T21:18:00Z', nota: 'Hecha.' } };
    expect(loQueDejo(p, desde)).toEqual({ respuestas: ['n_nueva'], revisiones: ['t_diag'], misiones: [p.misiones[0].id], ejecutadas: ['pr_x'], ...nada });
  });

  it('con el punto de control (el plan del último commit de la memoria), también lo que no tiene fecha (pr_retoma_automatica, punto 1)', () => {
    const antes = planEjemplo();
    const desde = '2026-10-21T21:11:53.437Z';
    const p = structuredClone(antes);
    // Igual que el del último commit: nada
    expect(loQueDejo(p, desde, antes)).toMatchObject({ misiones: [], propuestas: [], pedidos: [], documentos: [], evaluacion: [], partes: [] });
    // Una misión nueva sin `vigente`, una cambiada, una propuesta y un pedido nuevos, un documento, un criterio y el resumen
    const nueva = { ...p.misiones[0], id: 't_nueva', vigente: undefined };
    p.misiones = [{ ...p.misiones[0], titulo: 'Otro título' }, ...p.misiones.slice(1), nueva];
    p.propuestas = [...(p.propuestas ?? []), { id: 'pr_n', area: 'Núcleo', titulo: 'N', problema: 'p', propuesta: 'q', conecta: 'r', fase: p.fases[0].id }];
    p.pedidos = [...(p.pedidos ?? []), { id: 'pd_n', fase: p.fases[0].id, texto: 'Lo pedido' }];
    p.documentos = [...(p.documentos ?? []), { ruta: 'docs/director/nuevo.md', titulo: 'Nuevo', porQue: 'Porque sí' }];
    p.evaluacion = { ...p.evaluacion, c_nuevo: { fecha: '2026-10-21', estado: 'cumplido', nota: 'Visto.' } };
    p.resumen = { fecha: '2026-10-21T21:20:00Z', avanzamos: ['Algo'], quedamos: 'Aquí.' };
    p.revisado = '2026-10-21T21:30:00Z';
    const d = loQueDejo(p, desde, antes);
    expect(d.misiones).toEqual([p.misiones[0].id, 't_nueva']);
    expect(d).toMatchObject({ propuestas: ['pr_n'], pedidos: ['pd_n'], documentos: ['docs/director/nuevo.md'], evaluacion: ['c_nuevo'], partes: ['resumen'] });
    // Sin punto de control (una memoria sin commits), solo lo que tiene fecha, como antes
    expect(loQueDejo(p, desde, null)).toMatchObject({ misiones: [], propuestas: [], partes: [] });
  });

  it('lo aceptado y sin ejecutar se le da al director, de cualquier día', () => {
    const p = planEjemplo();
    const propuesta = (id: string) => ({ id, area: 'Núcleo', titulo: `La ${id}`, problema: 'p', propuesta: 'q', conecta: 'r', fase: p.fases[0].id });
    p.propuestas = ['pr_vieja', 'pr_nueva', 'pr_hecha', 'pr_descartada', 'pr_sin_responder'].map(propuesta);
    p.ejecutadas = { pr_hecha: { cuando: '2026-10-20T10:00:00Z', nota: 'Hecha.' } };
    const e = estadoVacio();
    e.propuestas = {
      pr_nueva: { fecha: '2026-10-22T09:00:00Z', quien: 'titular', estado: 'aceptada' },
      pr_vieja: { fecha: '2026-10-15T09:00:00Z', quien: 'titular', estado: 'aceptada', nota: 'Con su matiz' },
      pr_hecha: { fecha: '2026-10-18T09:00:00Z', quien: 'titular', estado: 'aceptada' },
      pr_descartada: { fecha: '2026-10-19T09:00:00Z', quien: 'titular', estado: 'descartada' },
    };
    // La aceptada hace una semana sigue ahí aunque la bandeja solo cuente las decisiones desde el día de la revisión
    expect(aceptadasSinEjecutar(p, e).map((x) => [x.propuesta.id, x.aceptada.nota])).toEqual([['pr_vieja', 'Con su matiz'], ['pr_nueva', undefined]]);
    expect(agendaDe(p, e, 'titular').porEjecutar).toBe(2);
  });

  it('el mensaje no vuelve a contar lo avanzado', () => {
    const avanzamos = ['La portada pública ya no arranca sola: da la bienvenida, la rueda la adelanta y el clic central la pausa.'];
    expect(mensajeRepite('Publiqué la portada: ya no arranca sola, da la bienvenida y la rueda la adelanta.', avanzamos)).toHaveLength(1);
    expect(mensajeRepite('No pude abrir el navegador en esta revisión; los anchos móviles quedan por mirar.', avanzamos)).toEqual([]);
    expect(mensajeRepite('Bien.', avanzamos)).toEqual([]);
  });

  // Nota del titular del 21 de octubre: «Comentarios del director» mostraba el mismo comentario dos veces
  const antes = 'Esta fue la primera revisión con los arreglos de hoy, y la hice sin flujos de varios agentes: tres ayudantes construyeron en paralelo lo que pediste para el código. Los sonidos de otro juego solo pueden sonar en este computador por su licencia, así que el Studio publicado necesitará unos propios.';
  const alargado = `${antes} Nada de lo de hoy está subido: son commits locales, porque lanzado así no puedo subir.`;

  it('el comentario del director no vuelve a decir lo que dijo el anterior', () => {
    expect(mensajeRepiteAnterior(alargado, antes).map((r) => r.frase)).toEqual([
      'Esta fue la primera revisión con los arreglos de hoy, y la hice sin flujos de varios agentes:',
      'tres ayudantes construyeron en paralelo lo que pediste para el código.',
      'Los sonidos de otro juego solo pueden sonar en este computador por su licencia, así que el Studio publicado necesitará unos propios.',
    ]);
    expect(mensajeRepiteAnterior('Hice la revisión sin ayudantes; las notas eran pocas y cortas.', antes)).toEqual([]);
    // Igual al anterior no se vuelve a mostrar, y sin anterior no hay con qué comparar
    expect(mensajeRepiteAnterior(antes, antes)).toEqual([]);
    expect(mensajeRepiteAnterior(antes, '')).toEqual([]);
  });

  it('«Lo que avanzamos» no vuelve a contar lo que ya se respondió en una nota (nmvt0v22xtit, nmvt0vrj7tit)', () => {
    // El caso del titular: la línea de la voz en las notas contaba otra vez la respuesta a su falla
    const respuesta = 'Lo arreglé: «Corregir» trae su «Grabar» en toda nota tuya, lo que grabas empieza a transcribirse apenas lo detienes, con su indicador, y «Añadir otro fragmento» ya no se pierde.';
    const repetida = 'La voz en las notas: «Corregir», con su «Grabar», en toda nota tuya; lo que grabas empieza a transcribirse apenas lo detienes, con su indicador.';
    const nueva = 'La niebla recuerda lo que recorriste con el director, por persona y en este computador, también días después.';
    expect(avanzamosRepiteRespuestas([repetida, nueva], [respuesta]).map((r) => r.linea)).toEqual([repetida]);
    // Sin respuestas de esta revisión, nada que comparar; una línea muy corta no cuenta
    expect(avanzamosRepiteRespuestas([repetida], [])).toEqual([]);
    expect(avanzamosRepiteRespuestas(['Grabar en toda nota.'], [respuesta])).toEqual([]);
  });

  // Propuesta aceptada «El cierre no deja nada sin atender», punto 3: una línea ya escrita se deja igual o se quita
  it('«Lo que avanzamos» no reescribe una línea guardada: alargada o con otras palabras cuenta; igual o un avance nuevo, no', () => {
    const mapa = 'El mapa de cada proyecto: en cada revisión, la bandeja me dice qué archivos y qué partes de mis documentos cambiaron desde la anterior';
    const servidor = 'Un solo servidor del Studio, siempre: ninguno arranca si ya hay otro, y el doble clic recarga la página abierta.';
    const guardadas = [mapa, servidor];
    const reescritas = (nuevas: string[]) => lineasReescritas(nuevas, guardadas).map((r) => r.guardada);
    // Alargada con su commit o con una cifra: la misma línea, que el Studio volvería a mostrar como nueva
    expect(reescritas([`${mapa} (commit local d8c7e3f)`])).toEqual([mapa]);
    expect(reescritas([`${mapa}, probado con 112 archivos y 14 fichas`])).toEqual([mapa]);
    // Con algo nuevo pegado a la guardada entera también; dicho en su propia línea, solo lo nuevo, pasa
    expect(reescritas([`${mapa}, y ahora también las imágenes y los PDF del repositorio, con su tamaño y su fecha`])).toEqual([mapa]);
    expect(reescritas(['El mapa de cada proyecto ya cuenta también las imágenes y los PDF del repositorio, con su tamaño y su fecha'])).toEqual([]);
    // Con otras palabras, y con su commit: el commit no es lo avanzado, no cuenta como algo nuevo
    const otraVez = 'Ya no se enciende un segundo servidor del Studio: si hay otro, ninguno arranca y el doble clic solo recarga la página (commit local 9ed9e10).';
    expect(lineasReescritas([otraVez], guardadas)).toEqual([{ linea: otraVez, guardada: servidor }]);
    // Una dirección es una referencia, como un commit: dos páginas distintas del mismo sitio no se parecen por su URL
    expect(lineasReescritas(
      ['La página de la metodología ya está en internet (https://argwabot.github.io/STL-Sacred_Time_Line/metodologia.html)'],
      ['La página pública ya está en internet (https://argwabot.github.io/STL-Sacred_Time_Line/)'],
    )).toEqual([]);
    // Igual salvo los espacios, no cuenta (el Studio compara el texto exacto y sí la mostraría otra vez: raro, se acepta)
    expect(reescritas([mapa, ` ${servidor.replace(' ', '  ')} `])).toEqual([]);
    // Lo urgente suma su línea arriba sin tocar las demás
    expect(reescritas(['Lo urgente, resuelto: el Studio vuelve a cargar al instante; tardaba 21 s porque leía una por una las 377 transcripciones (commit 1284d64)', ...guardadas])).toEqual([]);
    // Sin guardadas (la primera revisión), nada
    expect(lineasReescritas([mapa], [])).toEqual([]);
  });

  it('el umbral, con líneas de la historia de STL Studio: atrapa la reescrita y deja pasar el avance nuevo del mismo tema', () => {
    // Reescrita (0864a48): la guardada entera con una cláusula en medio; 17 de las 22 palabras de la nueva ya estaban
    const orden = 'La orden de subir ya no falla en silencio: avisa antes si a tu sesión de gh le falta el permiso «workflow», dice «NO SUBÍ» con el porqué si GitHub rechaza la subida y comprueba al final que main quedó allá (commit b8f724c)';
    expect(lineasReescritas(['La orden de subir ya no falla en silencio y da el permiso a la cuenta correcta: avisa antes si a la sesión de ARGWABOT en gh le falta el permiso «workflow», `--permiso` se lo da aunque tu cuenta activa de gh sea otra, dice «NO SUBÍ» con el porqué si GitHub rechaza la subida y comprueba al final que main quedó allá (commits b8f724c y c06dbd5)'], [orden])).toHaveLength(1);
    // Avance nuevo del mismo tema (ae77ae4): la portada ya subida y vista; 8 de sus 12 palabras ya estaban, el caso más cercano
    const portada = 'La portada pública vuelve a arrancar: los dos ajustes que subiste a las 9:34 p. m. traían un error mío (una función con el mismo nombre que la que inicia cada escena la dejaba sin dibujar); el arreglo, con el título grande y centrado como portada hasta iniciarla, está listo para subir';
    expect(lineasReescritas(['La portada pública vuelve a arrancar, con el título grande y centrado como portada hasta iniciarla: subida a las 10:10 p. m. y vista por ti en una ventana privada'], [portada])).toEqual([]);
    // …y el modo enfoque de después (5d7b61d), que solo comparte el tema
    const enfoque = 'El modo enfoque llegó a la misión: «Enfocarme en la misión», en la tarjeta de ahora, difumina todo lo de alrededor con el mismo velo de los documentos y deja la tarjeta nítida, donde está (commit d52fc26)';
    expect(lineasReescritas(['El modo enfoque como lo pediste: un solo botón arriba a la derecha para el documento y la misión, el atajo del director flotante que lo pone y lo quita en vez de «Pedir revisión», y solo el desenfoque, sin la luz que seguía al puntero (commit local 2a9e2e4)'], [enfoque])).toEqual([]);
  });

  it('en cualquier proyecto: otra cifra es otro avance, y la guardada corta, entera dentro de la nueva, es la misma alargada', () => {
    // Otro capítulo de una tesis, otra versión de una app: solo cambia la cifra (sin ella, las palabras serían las mismas)
    expect(lineasReescritas(['Capítulo 3 escrito y revisado con su bibliografía'], ['Capítulo 2 escrito y revisado con su bibliografía'])).toEqual([]);
    expect(lineasReescritas(
      ['La versión 1.4 de la app quedó publicada en la tienda de Google y en la de Apple'],
      ['La versión 1.3 de la app quedó publicada en la tienda de Google y en la de Apple'],
    )).toEqual([]);
    // Con la misma cifra, o con una de más, sigue siendo la misma línea reescrita
    const tope = 'La grabadora avisa su tope de 10 minutos y dice por qué se detuvo';
    expect(lineasReescritas(['La grabadora dice por qué se detuvo y avisa su tope de 10 minutos (commit local 72c8e17)'], [tope])).toHaveLength(1);
    expect(lineasReescritas([`${tope}, probado con 45 notas`], [tope])).toHaveLength(1);
    // Una guardada corta, entera dentro de la nueva: alargada aunque tenga menos de seis palabras, o con solo su commit
    const portada = 'Portada aprobada y publicada en GitHub Pages';
    expect(lineasReescritas([`${portada}, vista por ti en una ventana privada`], [portada])).toHaveLength(1);
    expect(lineasReescritas(['Portada aprobada (commit local 4b061b0)'], ['Portada aprobada'])).toHaveLength(1);
    // …y lo nuevo, dicho en su línea, pasa
    expect(lineasReescritas(['La viste en una ventana privada y se ve bien en el teléfono'], [portada])).toEqual([]);
  });

  it('«Dónde quedamos» reconoce otra versión de la misma línea: alargada o con otras palabras, no lo distinto', () => {
    expect(mismaIdea(antes, alargado)).toBe(true);
    expect(mismaIdea(
      'Un solo servidor del Studio, siempre: ninguno arranca si ya hay otro, y el doble clic recarga la página abierta.',
      'Ya no se enciende un segundo servidor del Studio: si hay otro, ninguno arranca y el doble clic solo recarga la página.',
    )).toBe(true);
    expect(mismaIdea(
      'El Studio suena: los efectos de otro juego en los diez momentos que decidiste, con la música de fondo en la cabecera.',
      'El tema oscuro, legible en todas partes: el resalte de una zona ya no tapa el texto.',
    )).toBe(false);
    expect(mismaIdea('Bien.', 'Bien.')).toBe(false);
  });

  it('los comentarios del director, un tema por viñeta (cada uno, una línea de «Dónde quedamos»)', () => {
    expect(temasDelMensaje('- **Sobre el candado:** ya no se pierde nada.\n- **Sobre la cola:** es corta a propósito,\n  porque lo que sigue depende de esto.')).toEqual([
      '**Sobre el candado:** ya no se pierde nada.',
      '**Sobre la cola:** es corta a propósito, porque lo que sigue depende de esto.',
    ]);
    // sin viñetas, un solo tema, como antes (su línea no vuelve a aparecer como nueva)
    expect(temasDelMensaje('  Una frase basta.  ')).toEqual(['Una frase basta.']);
    // lo de antes de la primera viñeta es su propio tema; la negrilla del comienzo no es una viñeta
    expect(temasDelMensaje('Para empezar.\n\n* Uno.\n**Sobre dos:** dos.')).toEqual(['Para empezar.', 'Uno. **Sobre dos:** dos.']);
    expect(temasDelMensaje('')).toEqual([]);
  });

  it('la búsqueda del Buzón: todas las palabras, sin tildes ni mayúsculas, en lo dicho o en la respuesta', () => {
    const nota = 'Sobre las caritas del director, ¿son aleatorias?';
    const respuesta = 'No son al azar: cada carita sale del ánimo del momento, y son automáticas.';
    expect(coincideBusqueda([nota, respuesta], 'caritas AUTOMATICAS')).toBe(true);
    expect(coincideBusqueda([nota, undefined, respuesta], 'carita animo')).toBe(true);
    expect(coincideBusqueda([nota], 'caritas automáticas')).toBe(false);
    // Entre comillas, la frase tal cual; la puntuación que rodea una palabra no cuenta
    expect(coincideBusqueda([nota], '"las caritas"')).toBe(true);
    expect(coincideBusqueda([nota], '«caritas las»')).toBe(false);
    expect(coincideBusqueda([nota], '¿aleatorias?')).toBe(true);
    expect(palabrasDeBusqueda('  «Del  Director»  ¿caritas? ')).toEqual(['del director', 'caritas']);
    // Sin nada que buscar, todo coincide
    expect(coincideBusqueda([nota], '  ')).toBe(true);
    expect(coincideBusqueda([], '¿?')).toBe(true);
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

  it('un paso que se cumple al cruzar una puerta lleva a esa puerta, en su fase de la Ruta, aunque su botón no lo diga', () => {
    expect(destinoDelPaso({ texto: 'Cruza la puerta', ir: { vista: 'ruta', fase: 'limpio', etiqueta: 'Ir a la puerta' }, hecho: { que: 'puerta', id: 'limpio' } }))
      .toEqual({ vista: 'ruta', fase: 'limpio', ancla: 'puerta', etiqueta: 'Ir a la puerta' });
    expect(destinoDelPaso({ texto: 'Cruza la puerta', hecho: { que: 'puerta', id: 'mvp' } })).toEqual({ vista: 'ruta', fase: 'mvp', ancla: 'puerta', etiqueta: 'Ir a la puerta' });
    const otro = { vista: 'proyecto' as const, ancla: 'p-objetivo', etiqueta: 'Ir' };
    expect(destinoDelPaso({ texto: 'Fija la meta', ir: otro })).toBe(otro);
    expect(destinoDelPaso('Un paso sin botón')).toBeUndefined();
  });

  it('un botón que deja a la persona donde ya está es una referencia circular: se dice en texto (nota de voz del titular, 22 de octubre)', () => {
    // La captura del titular: la respuesta se lee en la misma parte a la que lleva su «Quedó en»
    const parte = { vista: 'documentos' as const, doc: 'docs/director/informe.md', seccion: '3. Lo que escribes y dónde se guarda' };
    const misma = { doc: 'docs/director/informe.md', seccion: '3. Lo que escribes y dónde se guarda', etiqueta: 'Ver la parte 3 del informe, corregida' };
    expect(llevaAqui(misma, parte)).toBe(true);
    expect(aquiMismo(misma)).toBe('parte');
    // Las marcas de Markdown no cuentan, como al comparar los títulos de las partes
    expect(llevaAqui({ ...misma, seccion: '3. Lo que **escribes** y dónde se guarda' }, parte)).toBe(true);
    // El documento entero, desde una de sus partes, también es aquí; otra parte u otro documento, no
    expect(llevaAqui({ doc: parte.doc, etiqueta: 'El informe' }, parte)).toBe(true);
    expect(aquiMismo({ doc: parte.doc, etiqueta: 'El informe' })).toBe('documento');
    expect(llevaAqui({ ...misma, seccion: '4. Lo que sigue' }, parte)).toBe(false);
    expect(llevaAqui({ ...misma, doc: 'docs/director/ruta.md' }, parte)).toBe(false);
    // Desde el Buzón, el mismo botón sí lleva a otra parte
    expect(llevaAqui(misma, { vista: 'buzon' })).toBe(false);
    // La misma vista con la misma ancla, o la vista entera, es aquí; nunca una página de afuera ni «Escribirle al director»
    const tarjeta = lugarDeMision({ id: 't_meta' });
    expect(llevaAqui({ vista: 'misiones', ancla: 'mision-t_meta', etiqueta: 'Abrir' }, tarjeta)).toBe(true);
    expect(llevaAqui({ vista: 'misiones', etiqueta: 'Ir a Hoy' }, tarjeta)).toBe(true);
    expect(aquiMismo({ vista: 'misiones', ancla: 'mision-t_meta', etiqueta: 'Abrir' })).toBe('mision');
    expect(llevaAqui({ vista: 'misiones', ancla: 'mision-otra', etiqueta: 'Otra' }, tarjeta)).toBe(false);
    expect(llevaAqui({ vista: 'proyecto', ancla: 'p-objetivo', etiqueta: 'La meta' }, tarjeta)).toBe(false);
    expect(llevaAqui({ url: 'https://ejemplo.co', etiqueta: 'Ver' }, tarjeta)).toBe(false);
    expect(llevaAqui({ vista: 'buzon', ancla: 'escribir', etiqueta: 'Escribirle' }, { vista: 'buzon' })).toBe(false);
    expect(llevaAqui({ vista: 'ruta', fase: 'mvp', ancla: 'puerta', etiqueta: 'La puerta' }, { vista: 'ruta', fase: 'beta' })).toBe(false);
    expect(llevaAqui({ vista: 'propuestas', ancla: 'propuesta-pr_a', etiqueta: 'Ver' }, { vista: 'propuestas', ancla: 'propuesta-pr_a' })).toBe(true);
    expect(aquiMismo({ vista: 'propuestas', ancla: 'propuesta-pr_a', etiqueta: 'Ver' })).toBe('propuesta');
    expect(aquiMismo({ vista: 'preguntas', etiqueta: 'Tus preguntas' })).toBe('seccion');
  });

  it('el botón de un paso que lleva a su propia misión no se da, y validarPlan lo avisa para que el director lo corrija', () => {
    const propio = { texto: 'Abre esta misión con el botón de este paso', ir: { vista: 'misiones' as const, ancla: 'mision-t_meta', etiqueta: 'Abrir la misión' } };
    expect(destinoDelPaso(propio)).toBe(propio.ir);
    expect(destinoDelPaso(propio, { id: 't_meta' })).toBeUndefined();
    // A otro lugar, sigue igual; y uno que se cumple al cruzar una puerta lleva a la puerta, no a su misión
    const otro = { texto: 'Fija la meta', ir: { vista: 'proyecto' as const, ancla: 'p-objetivo', etiqueta: 'Ir' } };
    expect(destinoDelPaso(otro, { id: 't_meta' })).toBe(otro.ir);
    expect(destinoDelPaso({ ...propio, hecho: { que: 'puerta', id: 'mvp' } }, { id: 't_meta' })).toMatchObject({ vista: 'ruta', fase: 'mvp' });
    const p = planEjemplo();
    const mision = (paso: Paso): Mision => ({ id: 't_meta', para: 'titular', fase: 'arranque', frente: 'direccion', xp: 20, titulo: 'La meta', porQue: 'Para la ruta', pasos: [paso], entrega: 'La meta' });
    const con = (paso: Paso) => validarPlan({ ...p, misiones: [...p.misiones, mision(paso)] }, ['titular', 'ana']);
    const errores = con(propio);
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/lleva a su propia misión/);
    expect(con({ ...propio, ir: { vista: 'misiones', etiqueta: 'Ir a Hoy' } })).toHaveLength(1);
    expect(con(otro)).toEqual([]);
    expect(con({ ...propio, ir: { vista: 'misiones', ancla: 'mision-t_diag', etiqueta: 'La otra' } })).toEqual([]);
  });

  it('«Qué es STL» salió del Studio: un botón viejo a ella no rompe una misión aprobada y lleva a la página pública; en una sin aprobar, sí es un error', () => {
    const vieja = { texto: 'Abre «Qué es STL»', ir: { vista: 'stl', etiqueta: 'Abrir «Qué es STL»' } } as unknown as Paso;
    const p = planEjemplo();
    const mision = (paso: Paso): Mision => ({ id: 't_vieja', para: 'titular', fase: 'arranque', frente: 'direccion', xp: 20, titulo: 'La vieja', porQue: 'Historia', pasos: [paso], entrega: 'Nada' });
    const con = (aprobada: boolean) => validarPlan({ ...p, misiones: [...p.misiones, mision(vieja)], revisiones: { ...p.revisiones, ...(aprobada ? { t_vieja: { cuando: '2026-10-26T10:00:00Z', veredicto: 'aprobada' as const, comentario: '' } } : {}) } }, ['titular', 'ana']);
    expect(con(true)).toEqual([]);
    expect(con(false).join(' ')).toContain('ya no está en el Studio');
    // Una pestaña que nunca existió sigue siendo un error, aprobada o no
    const otra = { texto: 'Abre otra', ir: { vista: 'nada', etiqueta: 'Abrir' } } as unknown as Paso;
    expect(validarPlan({ ...p, misiones: [...p.misiones, mision(otra)], revisiones: { ...p.revisiones, t_vieja: { cuando: '2026-10-26T10:00:00Z', veredicto: 'aprobada' as const, comentario: '' } } }, ['titular', 'ana']).join(' ')).toContain('no existe');
    // El Studio lleva ese botón viejo a la animación pública, en una pestaña nueva; los demás destinos quedan como están
    expect(destinoVigente({ vista: 'stl', etiqueta: 'Abrir «Qué es STL»' } as never)).toEqual({ etiqueta: 'Abrir «Qué es STL»', url: 'https://argwabot.github.io/STL-Sacred_Time_Line/' });
    const actual = { vista: 'ruta' as const, fase: 'mvp', etiqueta: 'La ruta' };
    expect(destinoVigente(actual)).toBe(actual);
  });

  it('la bandeja recuerda lo que el director pidió hacer fuera del Studio en las misiones aprobadas recientes, con lo elegido', () => {
    const p = planEjemplo();
    const m = { ...p.misiones[0], pasos: ['Lee esto', { texto: 'Renombra la rama', soloTu: 'Es tu cuenta', opciones: ['Hecho', 'No pude'] }, { texto: 'Sube', terminal: 'node subir.ts' }, { texto: 'Mira la página', ir: { url: 'https://ejemplo.co', etiqueta: 'Ver' } }] };
    p.misiones = [m, { ...m, id: 'vieja' }, { ...m, id: 'abierta' }];
    p.revisiones = { [m.id]: { cuando: '2026-10-20T10:00:00Z', veredicto: 'aprobada', comentario: '' }, vieja: { cuando: '2026-10-01T10:00:00Z', veredicto: 'aprobada', comentario: '' } };
    const notas = [{ id: 'n1', cuando: '2026-10-20T09:00:00Z', quien: 'x', sobre: { tipo: 'mision' as const, id: m.id, seccion: 'Paso 2', eleccion: 'Hecho' } }];
    const fuera = pedidoFueraDelStudio(p, notas, '2026-10-13T00:00:00Z');
    expect(fuera.map((x) => [x.mision.id, x.paso, x.eleccion])).toEqual([[m.id, 1, 'Hecho'], [m.id, 2, undefined], [m.id, 3, undefined]]);
    expect(fuera[1].texto).toContain('node subir.ts');
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

  it('solo se sellan los documentos del director: los del producto cambian con el trabajo aprobado (nmw7t4u4atit)', () => {
    const p = planEjemplo();
    p.misiones = p.misiones.map((m) => (m.id === 't_diag' ? { ...m, documentos: ['docs/director/diagnostico.md', 'repo:README.md', 'docs/metodo/metodologia.md'] } : m));
    const e = estadoVacio();
    e.entregas.t_diag = { cuando: '2026-10-15T10:00:00.000Z', quien: 'Laura' };
    const despues = '2026-10-15T12:00:00.000Z';
    const sellados = selladosQueCambiaron(p, e, { 'docs/director/diagnostico.md': despues, 'repo:README.md': despues, 'docs/metodo/metodologia.md': despues });
    expect(sellados.map((x) => x.ruta)).toEqual(['docs/director/diagnostico.md']);
  });

  it('a un documento sellado solo se le puede quitar un dato (una palabra, como «[dato quitado]»), nada más (pedido pd_cuenta_ajena)', () => {
    const leido = '# Diagnóstico\r\n\r\n## 4. Golf y Acme\r\n\r\n¿En qué cuenta va (ana o acme_admin)? Firmado con `ana@acme.co`.\r\n';
    expect(soloQuitaDatos(leido, `# Diagnóstico\n\n## 4. Golf y ${DATO_QUITADO}\n\n¿En qué cuenta va (ana o ${DATO_QUITADO})? Firmado con \`${DATO_QUITADO}\`.\n`)).toBe(true);
    // Sin ningún dato quitado no es esto (un documento igual lo ve igualQueEntonces); ni con algo más cambiado
    expect(soloQuitaDatos(leido, leido)).toBe(false);
    expect(soloQuitaDatos(leido, `# Diagnóstico\n\n## 4. Golf y ${DATO_QUITADO}\n\n¿En qué cuenta va (ana)? Firmado con \`${DATO_QUITADO}\`.\n`)).toBe(false);
    // Una frase o una línea no se quitan así: solo una palabra (sin espacios ni saltos)
    expect(soloQuitaDatos(leido, `# Diagnóstico\n\n## 4. Golf y Acme\n\n${DATO_QUITADO} Firmado con \`ana@acme.co\`.\n`)).toBe(false);
    expect(soloQuitaDatos('Uno.\nDos.\n', `${DATO_QUITADO}\n`)).toBe(false);
    // Lo que el documento traía con símbolos de expresiones regulares se compara tal cual
    expect(soloQuitaDatos('Costo (kg): $5.00 [aprox.] para x*y', `Costo (kg): $5.00 [aprox.] para ${DATO_QUITADO}`)).toBe(true);
  });

  it('una entrega sin terminar («No me salió») no sella lo que no se leyó; con sus pasos marcados, sí (dos reglas que se cruzan)', () => {
    const p = planEjemplo();
    const e = estadoVacio();
    const orden = () => documentosEnOrden(p, e, 'titular').map((d) => `${d.ruta.split('/').pop()}:${d.estado}`);
    e.entregas.t_diag = { cuando: '2026-10-15T10:00:00.000Z', quien: 'Laura', sinTerminar: 0 };
    expect(orden()).toEqual(['diagnostico.md:siguiente', 'alcance.md:pendiente']);
    // Corregirlo no es cambiar un sellado: nadie lo leyó todavía
    expect(selladosQueCambiaron(p, e, { 'docs/director/diagnostico.md': '2026-10-15T12:00:00.000Z' })).toEqual([]);
    // La misma entrega, con todos sus pasos marcados, sí lo sella
    e.pasos = { t_diag: { hechos: p.misiones.find((m) => m.id === 't_diag')!.pasos.map((_, i) => i), cuando: '2026-10-15T10:00:00.000Z', quien: 'Laura' } };
    expect(orden()).toEqual(['alcance.md:siguiente', 'diagnostico.md:revisado']);
    expect(selladosQueCambiaron(p, e, { 'docs/director/diagnostico.md': '2026-10-15T12:00:00.000Z' }).map((x) => x.ruta)).toEqual(['docs/director/diagnostico.md']);
  });

  it('el cierre no deja un sellado cambiado ni un corte malo en lo escrito en la revisión (propuesta «El cierre no deja nada sin atender», parte 2)', () => {
    const p = planEjemplo();
    const e = estadoVacio();
    const malo = '# Alcance\n\n## 1. Lo que entendí\n\nUna idea completa, con lo que hace falta para entenderla sola y sin depender de nada más alrededor.\n\n- Corto.\n\nOtra idea completa, también con su contexto y lo que la sostiene, para que se lea de corrido.\n';
    const textos = { 'docs/director/alcance.md': malo };
    const desde = '2026-10-15T00:00:00.000Z';
    // escrito en esta revisión y sin empezar a leer: el corte malo no deja cerrar
    const motivos = documentosPorCerrar(p, e, ['titular'], desde, { 'docs/director/alcance.md': '2026-10-15T10:00:00.000Z' }, textos);
    expect(motivos).toHaveLength(1);
    expect(motivos[0]).toContain('docs/director/alcance.md');
    // escrito antes de esta revisión, o ya empezado a leer: no obliga a tocarlo
    expect(documentosPorCerrar(p, e, ['titular'], desde, { 'docs/director/alcance.md': '2026-10-14T10:00:00.000Z' }, textos)).toEqual([]);
    e.leidos = { [claveLeido('titular', 'docs/director/alcance.md')]: { partes: ['1. Lo que entendí'], cuando: desde, quien: 'Laura' } };
    expect(documentosPorCerrar(p, e, ['titular'], desde, { 'docs/director/alcance.md': '2026-10-15T10:00:00.000Z' }, textos)).toEqual([]);
    // un documento ya revisado que cambió después: tampoco
    e.entregas.t_diag = { cuando: '2026-10-15T10:00:00.000Z', quien: 'Laura' };
    expect(documentosPorCerrar(p, e, ['titular'], desde, { 'docs/director/diagnostico.md': '2026-10-15T12:00:00.000Z' }, {})).toEqual([expect.stringContaining('docs/director/diagnostico.md ya lo revisó titular')]);
  });

  it('se leen documentos de este Estudio y del repositorio del proyecto, nunca fuera de ellos', () => {
    expect(esDocumento('docs/director/diagnostico.md')).toBe(true);
    expect(esDocumento('repo:README.md')).toBe(true);
    expect(esDocumento('repo:docs/arquitectura.md')).toBe(true);
    expect(esDocumento('repo:../secreto.md')).toBe(false);
    expect(esDocumento('contenido/proyecto.json')).toBe(false);
    // con tildes, eñes y espacios (nota de voz del titular, 22 de octubre de 2026), pero nunca absoluta
    expect(esDocumento('repo:docs/Diseño del módulo/guía rápida.md')).toBe(true);
    expect(esDocumento('docs/director/año-uno.md')).toBe(true);
    expect(esDocumento('repo:/etc/secreto.md')).toBe(false);
    expect(esDocumento('repo:docs/a\\..\\b.md')).toBe(false);
  });

  it('solo se abre el documento que sigue: lo de después espera a que termines de leerlo', () => {
    const p = planEjemplo();
    p.misiones[0] = { ...p.misiones[0], documentos: ['docs/director/diagnostico.md', 'docs/director/extra.md', 'docs/director/otro.md'] };
    const filas = documentosEnOrden(p, estadoVacio(), 'titular');
    const lectura = (leidos: string[]) => enLectura(filas, (r) => leidos.includes(r)).map((d) => `${d.ruta.split('/').pop()}:${d.lectura}`);
    expect(lectura([])).toEqual(['diagnostico.md:siguiente', 'extra.md:despues', 'otro.md:despues', 'alcance.md:despues']);
    expect(lectura(['docs/director/diagnostico.md'])).toEqual(['diagnostico.md:leido', 'extra.md:siguiente', 'otro.md:despues', 'alcance.md:despues']);
  });

  it('un documento de una misión retenida para el cierre no es el siguiente ni bloquea el que pide un paso (nota nmw7tbm5ttit)', () => {
    const p = planEjemplo();
    // t_diag cierra su fase y queda retenida mientras un pedido de su fase siga sin hacer
    p.misiones = p.misiones.map((m) => (m.id === 't_diag' ? { ...m, alCierre: true } : m));
    p.pedidos = [{ id: 'pd_x', fase: 'arranque', texto: 'Algo pedido' }];
    const e = estadoVacio();
    const filas = documentosEnOrden(p, e, 'titular');
    expect(filas.map((d) => `${d.ruta.split('/').pop()}:${d.estado}`)).toEqual(['diagnostico.md:pendiente', 'alcance.md:siguiente']);
    // Antes: diagnostico.md quedaba «siguiente» y alcance.md, que pide el paso de la misión de ahora, «despues»: no se abría
    const lectura = enLectura(filas, () => false).map((d) => `${d.ruta.split('/').pop()}:${d.lectura}`);
    expect(lectura).toEqual(['diagnostico.md:despues', 'alcance.md:siguiente']);
    expect(loPideUnPaso(p, e, 'titular', 'docs/director/alcance.md')).toBe(true);
    // El de la misión retenida no lo pide ningún paso al alcance
    expect(loPideUnPaso(p, e, 'titular', 'docs/director/diagnostico.md')).toBe(false);
    // Hecho el pedido, la misión se suelta y su documento vuelve a ser el siguiente
    p.pedidos = [{ id: 'pd_x', fase: 'arranque', texto: 'Algo pedido', hecho: { cuando: '2026-10-15T10:00:00.000Z', nota: 'hecho' } }];
    expect(documentosEnOrden(p, e, 'titular').map((d) => `${d.ruta.split('/').pop()}:${d.estado}`)).toEqual(['diagnostico.md:siguiente', 'alcance.md:pendiente']);
  });

  it('el documento que pide un paso de tu misión se abre aunque otro esté antes en el orden de lectura', () => {
    const p = planEjemplo();
    p.misiones[0] = { ...p.misiones[0], documentos: ['docs/director/diagnostico.md', 'docs/director/extra.md'] };
    const e = estadoVacio();
    const lectura = enLectura(documentosEnOrden(p, e, 'titular'), () => false);
    expect(lectura.find((d) => d.ruta === 'docs/director/alcance.md')?.lectura).toBe('despues');
    // Pero t_alcance lo pide en su paso y está al alcance: el Studio lo abre
    expect(loPideUnPaso(p, e, 'titular', 'docs/director/alcance.md')).toBe(true);
    // extra.md solo lo nombra la misión en su lista, ningún paso: sigue esperando su turno
    expect(loPideUnPaso(p, e, 'titular', 'docs/director/extra.md')).toBe(false);
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
    // Un documento en inglés, en el idioma de la interfaz, con su «To decide:» (nmw6p6l8qtit)
    expect(decisionesDe('3. The order of the days', 'Before.\n\n1. **Not this.** list\n\n**To decide:**\n\n1. **The day of the week.** I recommend a Tuesday.')).toEqual(['1. The day of the week']);
    expect(decisionesDe('3. El mapa', '1. Todo empieza cerca.\n2. Los lugares ancla.\n\n**Para decidir:** ¿estás de acuerdo?')).toEqual([]);
  });

  it('«Para decidir» nombrado de pasada o en un ejemplo de código no vuelve decisiones una lista (el caso de CLAUDE.md)', () => {
    // Notas de voz del titular nmvn1msq6tit y nmvn1nj16tit: los seis pasos del mantenimiento salían como decisiones
    const md = '- Un documento corto (con «Para decidir» si hace falta).\n\nEl director lo respeta. Entonces:\n1. **Lo registra**: responde la nota.\n2. **Evalúa con evidencia** lo que ya se cumplió.';
    expect(decisionesDe('La sesión del director', md)).toEqual([]);
    const formato = '```\n# <Título>\n\n**Para decidir:**\n\n1. **<Nombre corto>.** La pregunta.\n```\n\n- **Las decisiones son obligatorias**: cada punto de «Para decidir» se responde.';
    expect(decisionesDe('Los documentos del director', formato)).toEqual([]);
    const t = trozosDeParte('La sesión del director', md);
    expect(t.some((x) => x.decision)).toBe(false);
    // Y la tarjeta no termina en sus dos puntos: va con lo que anuncia
    expect(t.every((x) => !/:$/.test(x.md.trim()))).toBe(true);
    // La marca de verdad sigue valiendo, en negrilla o no, al empezar el renglón o con sus dos puntos
    expect(decisionesDe('3. El mapa', 'Texto.\n\nPara decidir:\n\n1. **Uno.** A.')).toEqual(['1. Uno']);
    expect(decisionesDe('3. El mapa', 'Recomiendo esto. Para decidir:\n\n1. **Uno.** A.')).toEqual(['1. Uno']);
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
    // Con un párrafo, aunque juntos sean largos: la tarjeta crece, nunca se corta en sus dos puntos (nota nmvn1msq6tit)
    const sigue = `Lo que sigue explica el resto, ${'con sus datos y su razón, sin relleno. '.repeat(20).trimEnd()}`;
    expect(trozosDeParte(P, `${intro}\n\n${sigue}`).map((x) => x.md)).toEqual([`${intro}\n\n${sigue}`]);
    // Si aun así queda una tarjeta en sus dos puntos (antes de la lista de decisiones), la auditoría lo dice
    expect(ideasSueltas(`## ${P}\n\n${intro}\n\n${sigue}`)).toEqual([]);
    expect(ideasSueltas(`## 3. El alcance que decides\n\n${intro}\n\n1. **Uno.** Recomiendo A.`).map((x) => x.motivo)).toEqual([expect.stringContaining('termina en «:»')]);
    // La lista de decisiones no se junta con lo de antes
    const dec = trozosDeParte(P, `${intro}\n\n1. **Uno.** Recomiendo A.`.replace('Recomiendo:', 'Para decidir:'));
    expect(dec.map((x) => x.decision ?? '')).toEqual(['', '1. Uno']);
    // Lo que ya se había entendido por separado sigue entendido al juntarse
    const marcas = [claveIdea(P, intro), claveIdea(P, `- ${largo}`)];
    expect(estadoIdeas(P, `${intro}\n\n- ${largo}\n- ${largo}`, marcas).entendida).toEqual([true, true]);
  });

  it('sin «Para decidir», ningún punto es una decisión; el código no se parte', () => {
    const t = trozosDeParte('2. Los pilares', `${punto('Uno')}\n${punto('Dos')}\n\n\`\`\`\nuno\n\ndos\n\`\`\`\n\nFin.`);
    // Los dos puntos cortos se leen de una vez; el código va entero, con lo que lo cierra
    expect(t.map((x) => x.tipo)).toEqual(['punto', 'bloque']);
    expect(t[0].piezas).toEqual([punto('Uno'), punto('Dos')]);
    expect(t[1].md).toBe('```\nuno\n\ndos\n```\n\nFin.');
    expect(t.some((x) => x.decision)).toBe(false);
  });

  // Un punto de más de tres renglones: se lee solo, como su propia idea
  const puntoLargo = (s: string) => `- ${s}, ${'con una explicación que la vuelve una idea completa, con sus datos y su razón. '.repeat(4).trimEnd()}`;

  it('una idea entendida se reconoce por lo que dice: si el director la reescribe, vuelve a quedar por leer', () => {
    const P = '2. El alcance';
    const [uno, dos, tres, cero, cuatro] = ['Uno', 'Dos', 'Tres', 'Cero', 'Cuatro'].map(puntoLargo);
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

  it('los puntos de hasta unos tres renglones seguidos se leen como un solo bloque, con cada punto a mano para su ✉', () => {
    const P = '5. Lo que prepara la bandeja';
    // Doce puntos de uno a tres renglones (de 100 a 250 caracteres): un bloque, sus doce piezas en orden
    const doce = Array.from({ length: 12 }, (_, k) => `${k + 1}. El punto ${k + 1}: ${'algo que se dice en pocas palabras, '.repeat(2 + (k % 5))}y su razón.`);
    const t = trozosDeParte(P, doce.join('\n'));
    expect(t).toHaveLength(1);
    expect(t[0].piezas).toEqual(doce);
    expect(puntosDelBloque(t[0])).toEqual(doce);
    // Lo ya entendido punto por punto sigue entendido en el bloque
    expect(estadoIdeas(P, doce.join('\n'), doce.map((x) => claveIdea(P, x))).entendida).toEqual([true]);
    // Un punto largo se lee solo y corta el tramo; los cortos de cada lado van juntos
    const largo = `- Un punto largo: ${'con su explicación entera y sus datos, que no cabe en tres renglones. '.repeat(5).trimEnd()}`;
    const mezcla = trozosDeParte(P, ['- Uno corto.', '- Dos corto.', largo, '- Tres corto.', '- Cuatro corto.'].join('\n'));
    expect(mezcla.map((x) => x.md)).toEqual(['- Uno corto.\n- Dos corto.', largo, '- Tres corto.\n- Cuatro corto.']);
    // Una lista muy larga va en varios bloques, ninguno de un solo punto, sin perder ni reordenar nada
    const muchos = Array.from({ length: 40 }, (_, k) => `- El punto ${k + 1}, ${'con algo de texto que lo explica, '.repeat(4)}y su fin.`);
    const partida = trozosDeParte(P, muchos.join('\n'));
    expect(partida.length).toBeGreaterThan(1);
    expect(partida.every((x) => (x.piezas?.length ?? 0) >= 2)).toBe(true);
    expect(partida.flatMap((x) => x.piezas)).toEqual(muchos);
    expect(ideasSueltas(`# Doc\n\n## ${P}\n\n${muchos.join('\n')}`)).toEqual([]);
    // El párrafo que anuncia una lista de puntos cortos va con ella, y no es un punto con ✉
    const anuncia = 'La bandeja hace esto, en este orden:';
    const conAnuncio = trozosDeParte(P, `${anuncia}\n\n${doce.join('\n')}`);
    expect(conAnuncio).toHaveLength(1);
    expect(puntosDelBloque(conAnuncio[0])).toEqual(doce);
    // La lista de decisiones nunca se junta: cada decisión se responde aparte
    const dec = trozosDeParte(P, `${'Un párrafo que explica lo que hay que decidir, con sus razones y sus datos. '.repeat(2)}\n\n**Para decidir:**\n\n1. **Uno.** Recomiendo A.\n2. **Dos.** Recomiendo B.`);
    expect(dec.filter((x) => x.decision)).toHaveLength(2);
    expect(dec.every((x) => !puntosDelBloque(x).length)).toBe(true);
  });

  it('un bloque de puntos cortos se dibuja con sus puntos pegados: el ✉ en el mismo renglón y sin espacio de más (nota de voz del titular, 22 de octubre de 2026)', () => {
    const P = '5. Lo que prepara la bandeja';
    const doce = Array.from({ length: 12 }, (_, k) => `${k + 1}. El punto ${k + 1}: ${'algo que se dice en pocas palabras, '.repeat(2 + (k % 5))}y su razón.`);
    const anuncia = 'La bandeja hace esto, en este orden:';
    const [bloque] = trozosDeParte(P, `${anuncia}\n\n${doce.join('\n')}`);
    // El corte junta el párrafo con la lista dejando un renglón vacío entre cada punto: dibujada así, es una lista suelta
    expect(marked.parse(bloque.md, { async: false })).toContain('<li><p>');
    const pegado = mdDeBloqueDePuntos(bloque.md, puntosDelBloque(bloque));
    expect(pegado).toBe(`${anuncia}\n\n${doce.join('\n')}`);
    const dibujo = marked.parse(pegado, { async: false }) as string;
    expect(dibujo).not.toContain('<li><p>');
    expect(dibujo.match(/<li>/g)).toHaveLength(12);
    // Solo cambia cómo se dibuja: el texto de la idea, y con él su huella, no se toca
    expect(bloque.md).toContain(`${doce[0]}\n\n${doce[1]}`);
    // Un bloque sin párrafo delante ya viene pegado; con un párrafo suelto detrás, el de detrás se conserva; sin los puntos, vuelve igual
    expect(mdDeBloqueDePuntos(doce.join('\n'), doce)).toBe(doce.join('\n'));
    expect(mdDeBloqueDePuntos(`${doce.join('\n\n')}\n\nY una nota al final.`, doce)).toBe(`${doce.join('\n')}\n\nY una nota al final.`);
    expect(mdDeBloqueDePuntos('Un texto cualquiera', doce)).toBe('Un texto cualquiera');
    // Un punto repetido se busca en orden, sin confundirlo con el anterior
    expect(mdDeBloqueDePuntos('- igual\n\n- igual\n\n- otro', ['- igual', '- igual', '- otro'])).toBe('- igual\n- igual\n- otro');
  });

  it('el control de los cortes encuentra las ideas que quedarían en un renglón suelto', () => {
    const largo = 'Un párrafo largo que explica algo con suficiente detalle para ser una idea completa, con sus datos y su razón.';
    expect(ideasSueltas(`# Doc\n\n## 1. Bien\n\n**A favor**\n\n${punto('Uno')}\n\n### El costo\n\n${largo}`)).toEqual([]);
    expect(ideasSueltas(`# Doc\n\n## 2. Mal\n\n- Solo esto\n\n| a |\n|---|\n\n${largo}`)).toEqual([{ parte: '2. Mal', idea: '- Solo esto', motivo: 'un renglón corto, solo' }]);
    // Un bloque sin cerrar, un título sin nada debajo, una idea demasiado larga
    expect(ideasSueltas(`# Doc\n\n## 3. Mal\n\n${largo}\n\n\`\`\`\ncódigo sin cerrar`).map((x) => x.motivo)).toEqual(['un bloque de código o de fórmulas sin cerrar']);
    expect(ideasSueltas(`# Doc\n\n## 4. Mal\n\n${largo}\n\n### Sin nada`).map((x) => x.motivo)).toEqual(['termina en un título sin nada debajo']);
    expect(ideasSueltas(`# Doc\n\n## 5. Mal\n\n${'Una frase larga con su explicación. '.repeat(50)}`).map((x) => x.motivo)).toEqual([expect.stringContaining('demasiado larga')]);
  });

  describe('la auditoría de los cortes: cada formato, completo y con lo que le da sentido', () => {
    const P = '3. Una parte';
    const largo = 'Un párrafo largo que explica algo con suficiente detalle para ser una idea completa, con sus datos y su razón, sin relleno ni repeticiones, y que se entiende solo.';
    const otro = 'Otro párrafo distinto, también con suficiente detalle para ser una idea por sí solo, que habla de otra cosa del proyecto y la explica con sus datos clave.';
    // Lo que tiene contenido, renglón por renglón (los títulos ##, los separadores y los comentarios no se leen)
    const contenido = (md: string) =>
      md
        .replace(/<!--[\s\S]*?-->/g, '')
        .split('\n')
        .filter((l) => l.trim() && !/^##\s/.test(l) && !/^ {0,3}([-*_])( *\1){2,}\s*$/.test(l))
        .map((l) => l.trimEnd());
    const casos: [string, string, (t: ReturnType<typeof trozosDeParte>) => void][] = [
      ['un bloque de código con renglones vacíos y «#» adentro', `${largo}\n\n\`\`\`ts\n# no es un título\n\n- ni un punto\n\`\`\`\n\n${otro}`, (t) => expect(t.map((x) => x.tipo)).toEqual(['parrafo', 'bloque', 'parrafo'])],
      ['un bloque ~~~~ con ``` adentro', `${largo}\n\n~~~~\n\`\`\`\nadentro\n\`\`\`\n~~~~\n\n${otro}`, (t) => expect(t[1].md).toBe('~~~~\n```\nadentro\n```\n~~~~')],
      ['un bloque de fórmulas', `${largo}\n\n$$\na = b\n\nc = d\n$$\n\n${otro}`, (t) => expect(t[1]).toMatchObject({ tipo: 'bloque', md: '$$\na = b\n\nc = d\n$$' })],
      ['una tabla con su leyenda pegada', `${largo}\n\n| a | b |\n|---|---|\n| 1 | 2 |\n*Tabla 1: lo medido.*\n\n${otro}`, (t) => expect(t[1].md).toBe('| a | b |\n|---|---|\n| 1 | 2 |\n\n*Tabla 1: lo medido.*')],
      ['una tabla y su fuente, aparte', `| a | b |\n|---|---|\n\nFuente: la radiografía.\n\n${otro}`, (t) => expect(t[0].md).toContain('Fuente: la radiografía.')],
      ['una imagen sola después de su párrafo', `${largo}\n\n![El boceto](docs/director/boceto.png)\n\n${otro}`, (t) => expect(t.map((x) => x.md)).toEqual([`${largo}\n\n![El boceto](docs/director/boceto.png)`, otro])],
      ['una imagen sola al comienzo, con una dirección larga', `![La línea](https://ejemplo.com/${'x'.repeat(200)}.gif)\n\n${largo}`, (t) => expect(t).toHaveLength(1)],
      ['una imagen después de una tabla', `| a |\n|---|\n\n![Captura](c.png)\n\n${largo}`, (t) => expect(t[0].md).toBe('| a |\n|---|\n\n![Captura](c.png)')],
      ['«Así se ve:» con su imagen', `Así se ve:\n\n![Captura](c.png)\n\n${largo}`, (t) => expect(t[0].md).toBe('Así se ve:\n\n![Captura](c.png)')],
      ['una imagen HTML y un video', `${largo}\n\n<img src="a.png" alt="a">\n\n${otro}\n\n<video src="v.mp4" controls></video>`, (t) => expect(t.map((x) => x.md)).toEqual([`${largo}\n\n<img src="a.png" alt="a">`, `${otro}\n\n<video src="v.mp4" controls></video>`])],
      ['un dibujo SVG con sus rótulos, anunciado por su párrafo', `${largo} Así se ve:\n\n<svg viewBox="0 0 100 40" width="100%" role="img" aria-label="Un dibujo">\n<rect x="2" y="2" width="40" height="20" style="fill:var(--panel)"/>\n<text x="8" y="16">Tú</text>\n</svg>\n\n${otro}`, (t) => expect(t.map((x) => x.md)).toEqual([`${largo} Así se ve:\n\n<svg viewBox="0 0 100 40" width="100%" role="img" aria-label="Un dibujo">\n<rect x="2" y="2" width="40" height="20" style="fill:var(--panel)"/>\n<text x="8" y="16">Tú</text>\n</svg>`, otro])],
      ['un dibujo SVG sin texto, después de su párrafo', `${largo}\n\n<svg viewBox="0 0 10 10">\n<circle cx="5" cy="5" r="4"/>\n</svg>\n\n${otro}`, (t) => expect(t.map((x) => x.md)).toEqual([`${largo}\n\n<svg viewBox="0 0 10 10">\n<circle cx="5" cy="5" r="4"/>\n</svg>`, otro])],
      ['un <details> con renglones vacíos adentro', `${largo}\n\n<details>\n<summary>Ver más</summary>\n\nEl detalle.\n\nY más detalle.\n</details>\n\n${otro}`, (t) => expect(t[1]).toMatchObject({ tipo: 'bloque', md: '<details>\n<summary>Ver más</summary>\n\nEl detalle.\n\nY más detalle.\n</details>' })],
      ['un comentario de varias líneas', `${largo}\n\n<!--\nnota interna\n-->\n\n${otro}`, (t) => expect(t.map((x) => x.md)).toEqual([largo, otro])],
      ['un título antes de las decisiones', `${largo}\n\n### Lo que falta\n\n**Para decidir:**\n\n1. **Uno.** Recomiendo A.`, (t) => {
        expect(t.map((x) => x.tipo)).toEqual(['parrafo', 'rotulo', 'rotulo', 'punto']);
        expect(t[0].md).toBe(largo);
        expect(t[3].decision).toBe('1. Uno');
      }],
      ['dos títulos seguidos', `${largo}\n\n### Los costos\n\n#### Del modelo\n\n${otro}`, (t) => expect(t.map((x) => x.md)).toEqual([largo, `### Los costos\n\n#### Del modelo\n\n${otro}`])],
      ['un título con poco texto, y lo que sigue bajo él', `${largo}\n\n### El costo\n\nEs bajo.\n\n${otro}`, (t) => expect(t.map((x) => x.md)).toEqual([largo, `### El costo\n\nEs bajo.\n\n${otro}`])],
      ['un título pegado al párrafo de antes', `${largo}\n### El costo\n${otro}`, (t) => expect(t.map((x) => x.md)).toEqual([largo, `### El costo\n${otro}`])],
      ['un título pegado a un punto', `- ${largo}\n### El costo\n\n${otro}`, (t) => expect(t.map((x) => x.md)).toEqual([`- ${largo}`, `### El costo\n\n${otro}`])],
      ['un punto con su sublista y su código', `- ${largo}\n  - un detalle\n\n  \`\`\`\n  código\n\n  más\n  \`\`\`\n- ${otro}`, (t) => expect(t.map((x) => x.md)).toEqual([`- ${largo}\n  - un detalle\n\n  \`\`\`\n  código\n\n  más\n  \`\`\``, `- ${otro}`])],
      ['una cita de varios párrafos', `${largo}\n\n> Primero.\n>\n> Después.\n\n${otro}`, (t) => expect(t[1].md).toBe('> Primero.\n>\n> Después.')],
      ['un enlace largo no hace largo un renglón corto', `${largo}\n\nLo vi [aquí](https://ejemplo.com/${'x'.repeat(200)}).`, (t) => expect(t).toHaveLength(1)],
    ];
    for (const [nombre, md, espera] of casos) {
      it(nombre, () => {
        const t = trozosDeParte(P, md);
        espera(t);
        // Nada se pierde ni se reordena
        expect(t.flatMap((x) => contenido(x.md))).toEqual(contenido(md));
        for (const x of t) {
          const lineas = x.md.trim().split('\n');
          // Ningún bloque partido: las marcas de código y las etiquetas HTML abren y cierran en la misma idea
          expect(lineas.filter((l) => /^\s*```/.test(l)).length % 2).toBe(0);
          expect((x.md.match(/<details/g) ?? []).length).toBe((x.md.match(/<\/details>/g) ?? []).length);
          expect((x.md.match(/<svg/g) ?? []).length).toBe((x.md.match(/<\/svg>/g) ?? []).length);
          if (x.tipo === 'rotulo' || t.length === 1) continue;
          // Ninguna idea termina en un título, ni es solo una imagen
          expect(lineas.length > 1 && /^ {0,3}#{1,6}\s/.test(lineas[lineas.length - 1])).toBe(false);
          expect(/^!\[[^\]]*\]\([^)]*\)$/.test(x.md.trim())).toBe(false);
        }
      });
    }

    it('los documentos de verdad se cortan sin perder nada y sin partir un bloque', () => {
      // Y, en este computador, los del director del propio Studio (su memoria, si está abierta en .stl/)
      const carpetas = ['../../docs/metodo/', '../../.stl/docs/director/'].map((c) => new URL(c, import.meta.url)).filter((c) => existsSync(c));
      for (const [carpeta, f] of carpetas.flatMap((c) => readdirSync(c).filter((x) => x.endsWith('.md')).map((f) => [c, f] as const))) {
        const texto = readFileSync(new URL(f, carpeta), 'utf8').replace(/\r\n/g, '\n');
        for (const parte of texto.split(/^(?=## )/m).slice(1)) {
          if ((parte.match(/^```/gm) ?? []).length % 2) continue; // una parte con un bloque que la cruza no se lee así
          const t = trozosDeParte(parte.split('\n')[0], parte);
          expect(t.flatMap((x) => contenido(x.md)), `${f} › ${parte.split('\n')[0]}`).toEqual(contenido(parte));
          for (const x of t) expect(x.md.trim().split('\n').filter((l) => /^\s*```/.test(l)).length % 2, `${f}: un bloque partido`).toBe(0);
          // Un dibujo SVG, entero en su idea y sin renglones vacíos adentro: marked cierra el bloque HTML en el primero y
          // lo que sigue se vería como código
          for (const x of t) expect((x.md.match(/<svg/g) ?? []).length, `${f}: un dibujo partido`).toBe((x.md.match(/<\/svg>/g) ?? []).length);
          for (const svg of parte.match(/<svg[\s\S]*?<\/svg>/g) ?? []) expect(/\n\s*\n/.test(svg), `${f}: un renglón vacío dentro de un dibujo`).toBe(false);
        }
      }
    });

    it('los dibujos del director tienen su regla y su guía de estilo, y la muestra la cumple (pedido del titular pd_graficos_svg)', () => {
      const guia = readFileSync(new URL('../../docs/metodo/dibujos.md', import.meta.url), 'utf8');
      // La regla, en el procedimiento de los documentos (en sus dos versiones), apunta a la guía
      const reglas = readFileSync(new URL('../../docs/metodo/director/documents.es.md', import.meta.url), 'utf8');
      const rules = readFileSync(new URL('../../docs/metodo/director/documents.md', import.meta.url), 'utf8');
      expect(reglas).toContain('**Un dibujo, solo cuando ayuda a entender**');
      expect(rules).toContain('**A drawing, only when it helps to understand**');
      for (const r of [reglas, rules]) expect(r).toContain('`docs/metodo/dibujos.md`');
      // Los tres papeles, con las variables del Studio: la persona, el código del Studio y el modelo
      for (const color of ['var(--sobre,#fffdf5)', 'var(--panel-suave,#fbfaf7)', 'var(--acento-fondo,#eaf1fb)']) expect(guia).toContain(color);
      // La muestra: accesible, sin colores sueltos (rompen el tema oscuro) y sin nada que corra
      const muestra = guia.match(/<svg[\s\S]*?<\/svg>/)?.[0] ?? '';
      expect(muestra).toMatch(/role="img" aria-label="[^"]+"/);
      expect(muestra).not.toMatch(/\s(fill|stroke)="#/);
      expect(muestra).not.toMatch(/<script|foreignObject|\son\w+=|href=/);
    });
  });

  it('las marcas de antes, por número, se respetan y pasan a la huella de lo que dicen hoy', () => {
    const P = '2. El alcance';
    const [uno, dos, tres] = ['Uno', 'Dos', 'Tres'].map(puntoLargo);
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
    // La medición del núcleo, solo con su fecha: una de antes del cambio no vale (pr_medicion_sola)
    expect(con({ texto: 'Mide', hecho: { que: 'medicion', desde: '2026-10-30T15:00:00Z' } })).toEqual([]);
    expect(con({ texto: 'Mide', hecho: { que: 'medicion' } })).toHaveLength(1);
  });

  it('una propuesta se lee y se decide en «Propuestas»: un paso que lleva a ella por «La ruta», o que pide responderla sin llevar ahí, no pasa (nmvv433cxtit)', () => {
    const p = { ...planEjemplo(), propuestas: [{ id: 'pr_ids', area: 'Núcleo', titulo: 'Ids únicos', problema: 'x', propuesta: 'y', conecta: 'z', fase: 'mvp' }] };
    const con = (paso: Paso, aprobada = false) => validarPlan({ ...p, misiones: [...p.misiones, mision([paso])], revisiones: aprobada ? { t_meta: { cuando: '2026-10-30T15:00:00Z', veredicto: 'aprobada', comentario: 'Bien.' } } : {} }, ['titular', 'ana']);
    const enRuta = { vista: 'ruta' as const, fase: 'mvp', ancla: 'propuesta-pr_ids', etiqueta: 'Ver la propuesta' };
    const enPropuestas = { vista: 'propuestas' as const, ancla: 'propuesta-pr_ids', etiqueta: 'Ver la propuesta' };
    // El caso del 30 de octubre: «Ver la propuesta» llevaba a «La ruta», donde no se decide
    expect(con({ texto: 'Respóndela', ir: enRuta, hecho: { que: 'propuesta', id: 'pr_ids' } }).join(' ')).toContain('se lee y se decide en «Propuestas»');
    expect(con({ texto: 'Lee el punto 3 y elige', ir: enRuta, opciones: ['Sí', 'No'] })).toHaveLength(1);
    // Pedir responderla sin botón, o con uno a otra parte, tampoco
    expect(con({ texto: 'Respóndela', hecho: { que: 'propuesta', id: 'pr_ids' } }).join(' ')).toContain('no lleva a ella en «Propuestas»');
    expect(con({ texto: 'Respóndela', ir: { vista: 'propuestas', etiqueta: 'Ir' }, hecho: { que: 'propuesta', id: 'pr_ids' } })).toHaveLength(1);
    // Llevada a ella en «Propuestas», pasa; una misión ya aprobada es historia
    expect(con({ texto: 'Respóndela', ir: enPropuestas, hecho: { que: 'propuesta', id: 'pr_ids' } })).toEqual([]);
    expect(con({ texto: 'Respóndela', ir: enRuta, hecho: { que: 'propuesta', id: 'pr_ids' } }, true)).toEqual([]);
  });

  it('«Autorizo» solo donde el clic da el permiso: un paso que lo ofrece para lo que da el panel de «Permisos» no pasa (pr_autorizo_panel, c_autorizar_sin_casilla)', () => {
    const p = planEjemplo();
    const con = (paso: Paso, aprobada = false) => validarPlan({ ...p, misiones: [...p.misiones, mision([paso])], revisiones: aprobada ? { t_meta: { cuando: '2026-10-30T15:00:00Z', veredicto: 'aprobada', comentario: 'Bien.' } } : {} }, ['titular', 'ana']);
    const alPanel = { vista: 'modelo' as const, ancla: 'm-permisos', etiqueta: 'Abrir los permisos' };
    const autorizo = ['Autorizo', 'No lo autorizo'];
    // El caso de la medición del 30 de octubre: «Autorizo» con el botón al panel, o con los botones del panel como opciones
    expect(con({ texto: 'Decide si autorizas que instale el navegador de pruebas', ir: alPanel, opciones: autorizo }).join(' ')).toContain('ofrece «Autorizo» para un permiso que da el panel');
    expect(con({ texto: 'Decide el permiso', opciones: ['Autorizo los marcados', 'Autorizo y pido la revisión'] })).toHaveLength(1);
    expect(con({ texto: 'Ese permiso está en «Permisos»: elige', opciones: autorizo })).toHaveLength(1);
    expect(con({ texto: 'Decide', opciones: ['Sí', 'No'], detalle: ['Márcalo en «Modelo y consumo» › «Permisos»'] })).toEqual([]);
    // Al panel, sin «Autorizo»: la casilla da el permiso
    expect(con({ texto: 'Marca la casilla «git en la memoria» y oprime «Autorizo los marcados»', ir: alPanel })).toEqual([]);
    // Lo que el panel no ofrece (instalar algo, varias órdenes juntas) sí se autoriza en el paso, con lo que cambia y cuesta
    expect(con({ texto: 'Instalo el navegador de pruebas (unos 150 MB): ¿lo autorizas?', opciones: autorizo })).toEqual([]);
    // Una misión ya aprobada es historia
    expect(con({ texto: 'Decide', ir: alPanel, opciones: autorizo }, true)).toEqual([]);
    expect(autorizoSinPermiso('Autorizo')).toBe(false);
  });

  it('el paso de medir el núcleo se marca solo al terminar una medición que empezó desde su fecha, y mientras corre no detiene a la persona (pr_medicion_sola, nmvv3fgp3tit)', () => {
    const desde = '2026-10-30T14:45:00Z';
    const m = mision([{ texto: 'Pide la medición', ir: { vista: 'modelo', ancla: 'm-medicion', etiqueta: 'Ir' }, hecho: { que: 'medicion', desde } }]);
    const otra = { ...mision(['Mira algo']), id: 't_otra' };
    const ve = (medicion: MedicionDelNucleo | null) => pasosVistos(m, proyecto(), estadoVacio(), '', medicion);
    // La de antes de la fecha (la del 29 de octubre) no la marca, ni una que corre; la que empezó después y terminó, sí
    expect(ve({ ultima: { cuando: '2026-10-29T22:30:50Z', terminada: '2026-10-30T00:56:03Z' } })).toEqual([]);
    expect(ve({ ultima: { cuando: '2026-10-30T14:52:51Z', terminada: null }, enMarcha: { desde: '2026-10-30T14:52:51Z' } })).toEqual([]);
    expect(ve({ ultima: { cuando: '2026-10-30T14:52:51Z', terminada: '2026-10-30T17:33:54Z' } })).toEqual([0]);
    expect(ve(null)).toEqual([]);
    // Mientras corre, la misión va detrás de las demás: la de ahora es la otra
    const corre = { ultima: { cuando: '2026-10-30T14:52:51Z', terminada: null }, enMarcha: { desde: '2026-10-30T14:52:51Z' } };
    expect(corriendoSola(m, [], corre)).toBe(true);
    expect(sinEsperarLoLargo([m, otra], () => [], corre).map((x) => x.id)).toEqual(['t_otra', m.id]);
    // Sin medición en marcha, o con una de antes de su fecha, o con otro paso por hacer, sigue donde estaba
    expect(sinEsperarLoLargo([m, otra], () => [], null).map((x) => x.id)).toEqual([m.id, 't_otra']);
    expect(corriendoSola(m, [], { enMarcha: { desde: '2026-10-30T10:00:00Z' } })).toBe(false);
    const conOtroPaso = mision(['Elige los casos', { texto: 'Pide la medición', hecho: { que: 'medicion', desde } }]);
    expect(corriendoSola(conOtroPaso, [], corre)).toBe(false);
    expect(corriendoSola(conOtroPaso, [0], corre)).toBe(true);
  });

  it('un id que ya se usó en el archivo, o que el equipo ya usó, no vuelve (pr_ids_unicos)', () => {
    const p = planEjemplo();
    const vieja = { ...p.misiones.find((x) => x.id === 't_diag')!, titulo: 'La de octubre' };
    const archivo: Partial<ArchivoPlan> = { misiones: [vieja], propuestas: [], pedidos: [{ id: 'pd_viejo', fase: 'mvp', texto: 'x', hecho: { cuando: '2026-10-01T00:00:00Z', nota: 'hecho' } }] };
    // El caso del 30 de octubre: una misión nueva con el id de una archivada
    const sinVieja = { ...p, misiones: p.misiones.filter((x) => x.id !== 't_diag') };
    expect(idsYaUsados(sinVieja, archivo)).toEqual([]);
    expect(idsYaUsados(p, archivo)).toEqual(['La misión «t_diag» usa un id que ya se usó en el archivo («La de octubre»): ponle otro.']);
    expect(idsYaUsados({ ...sinVieja, pedidos: [{ id: 'pd_viejo', fase: 'mvp', texto: 'otro' }] }, archivo)).toHaveLength(1);
    // Validar el plan unido con su archivo no lo ve, porque lo del plan manda: por eso va aparte
    expect(validarPlan(unirArchivo(p, archivo), ['titular', 'ana']).filter((e) => e.includes('t_diag'))).toEqual([]);
    // Una misión nueva cuyo id ya tiene una entrega guardada por el equipo, tampoco
    const estado: EstadoDirector = { ...estadoVacio(), entregas: { t_vieja: { cuando: '2026-10-01T00:00:00Z', quien: 'Laura' } as EstadoDirector['entregas'][string] } };
    const nueva = { ...sinVieja, misiones: [...sinVieja.misiones, { ...vieja, id: 't_vieja' }] };
    expect(idsYaUsados(nueva, {}, estado, sinVieja).join(' ')).toContain('La misión nueva «t_vieja» usa un id que el equipo ya usó (tiene su entrega de antes)');
    // La que ya estaba en el plan sigue con su entrega
    expect(idsYaUsados(nueva, {}, estado, nueva)).toEqual([]);
  });

  it('ninguna misión queda sin salida: un paso sin marcar siempre trae cómo marcarlo, y todos marcados se entrega (t_rehacer_voz)', () => {
    // El caso que atrapó al titular: para rehacer, desmarcó y rehízo el paso 1; el 2 guardaba su elección de antes y
    // mostraba «Elegiste» sin sus opciones, sin «Listo» y sin «Entregar»
    const m = mision([
      { texto: 'Deja una nota de prueba', ir: { vista: 'buzon', etiqueta: 'Ir al Buzón' } },
      { texto: 'Corrígela con la voz. ¿Salió así?', ir: { vista: 'buzon', etiqueta: 'Ir al Buzón' }, opciones: ['Salió así', 'Salió otra cosa (te cuento con ✉)'] },
    ]);
    const vieja: Nota = { id: 'n-vieja', cuando: '2026-10-29T02:42:42Z', quien: 'leonc', de: 'titular', sobre: { tipo: 'mision', id: 't_meta', seccion: 'Paso 2', eleccion: 'Salió así' }, texto: 'Salió así' };
    expect(salidaDeMision(m, [0])).toEqual({ paso: 1, con: 'opciones' });
    // Sin marcar, el paso muestra sus opciones otra vez, no «Elegiste»
    expect(eleccionALaVista([vieja], 't_meta', 1, 'titular', false)).toBeUndefined();
    expect(eleccionALaVista([vieja], 't_meta', 1, 'titular', true)?.sobre.eleccion).toBe('Salió así');
    // Lo elegido antes del veredicto no la marca otra vez sola; lo elegido después, sí
    const desde = '2026-10-29T03:02:00Z';
    expect(pasosVistos(m, proyecto(), { ...estadoVacio(), notas: [vieja], pasos: { t_meta: { hechos: [0], cuando: 'x', quien: 'leonc' } } }, desde)).toEqual([]);
    expect(pasosVistos(m, proyecto(), { ...estadoVacio(), notas: [{ ...vieja, cuando: '2026-10-29T03:30:00Z' }], pasos: { t_meta: { hechos: [0], cuando: 'x', quien: 'leonc' } } }, desde)).toEqual([1]);
    // Cada forma de paso tiene su manera de marcarse, y con todos marcados queda «Entregar al director»
    expect(salidaDeMision(mision(['Haz esto']), [])).toEqual({ paso: 0, con: 'listo' });
    expect(salidaDeMision(mision([{ texto: 'Corre la orden', terminal: 'git status' }]), [])).toEqual({ paso: 0, con: 'orden' });
    expect(salidaDeMision(m, [0, 1])).toEqual({ entregar: true });
  });

  it('un paso con opciones que se desmarca se marca otra vez al elegir de nuevo (nmvt173zltit)', () => {
    // El caso del titular: desmarcó el paso 1, eligió otra vez y ninguna opción lo marcaba, porque el navegador recordaba
    // ese paso como ya marcado solo. La clave lleva la nota que lo prueba: una elección nueva es otra prueba
    const m = mision([{ texto: 'Elige una', opciones: ['Elijo esta', 'O esta otra'] }, { texto: 'Encárgalo', hazlo: 'Lo hago yo' }]);
    const nota = (id: string, seccion: string, extra: Partial<Nota['sobre']>): Nota => ({ id, cuando: '2026-10-29T04:13:00Z', quien: 'leonc', de: 'titular', sobre: { tipo: 'mision', id: 't_meta', seccion, ...extra } as Nota['sobre'], texto: '' });
    const primera = nota('n-1', 'Paso 1', { eleccion: 'Elijo esta' });
    const otraVez = nota('n-2', 'Paso 1', { eleccion: 'O esta otra' });
    const vistos = new Set([claveDePasoVisto('p', m, 0, [primera])]);
    // Desmarcado, la elección de antes no lo vuelve a marcar…
    expect(vistos.has(claveDePasoVisto('p', m, 0, [primera]))).toBe(true);
    expect(pasosVistos(m, proyecto(), { ...estadoVacio(), notas: [primera] })).toEqual([0]);
    // …y la nueva sí: su clave es otra
    expect(vistos.has(claveDePasoVisto('p', m, 0, [primera, otraVez]))).toBe(false);
    expect(pasosVistos(m, proyecto(), { ...estadoVacio(), notas: [primera, otraVez] })).toEqual([0]);
    // Lo mismo con un encargo nuevo; un paso sin prueba guarda la clave de siempre
    expect(claveDePasoVisto('p', m, 1, [nota('n-3', 'Paso 2', { hazlo: true })])).toBe('p|t_meta|1|n-3');
    expect(claveDePasoVisto('p', mision(['Haz esto']), 0, [primera])).toBe('p|t_meta|0');
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

  it('un paso que pide elegir no se marca al terminar de leer, y el plan no lo deja llevar a un documento entero (pr_paso_que_elige)', () => {
    const doc = 'repo:docs/metodo/metodologia.md';
    const leer: Paso = { texto: 'Lee la metodología', ir: { doc, etiqueta: 'Leerla' } };
    const elegir: Paso = { texto: 'Elige sus partes', ir: { doc, etiqueta: 'Verla' }, opciones: ['Seis', 'Ocho'] };
    // Terminar de leer marca solo el paso que pide leerlo: el de elegir espera la elección
    expect(pideLeerEntero(leer, doc)).toBe(true);
    expect(pideLeerEntero(elegir, doc)).toBe(false);
    expect(pideLeerEntero(leer, 'repo:README.md')).toBe(false);
    expect(pideLeerEntero({ texto: 'Lee la parte', ir: { doc, seccion: '2. El problema', etiqueta: 'Leerla' } })).toBe(false);
    expect(pideLeerEntero('Lee la metodología')).toBe(false);
    // validarPlan: lo que se lee va en un paso y lo que se elige, en el siguiente
    const p = planEjemplo();
    const con = (pasos: Paso[], aprobada = false) => {
      const m = mision(pasos);
      return validarPlan({ ...p, misiones: [...p.misiones, m], revisiones: aprobada ? { ...p.revisiones, [m.id]: { cuando: '2026-10-31T08:00:00Z', veredicto: 'aprobada', comentario: 'Aprobada.' } } : p.revisiones }, ['titular', 'ana']);
    };
    expect(con([leer, { texto: 'Elige sus partes', opciones: ['Seis', 'Ocho'] }])).toEqual([]);
    const errores = con([elegir]);
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/tiene opciones y lleva a leer un documento entero/);
    // Una parte del documento sí: ahí se lee y se decide lo de esa parte
    expect(con([{ ...elegir, ir: { doc, seccion: '2. El problema', etiqueta: 'Verla' } }])).toEqual([]);
    // Una misión ya aprobada es historia: no se reescribe
    expect(con([elegir], true)).toEqual([]);
  });

  it('una opción cabe entera en la elección que guarda el servidor: validarPlan no deja escribir una más larga que MAX_ELECCION', () => {
    const p = planEjemplo();
    const con = (paso: Paso) => validarPlan({ ...p, misiones: [...p.misiones, mision([paso])] }, ['titular', 'ana']);
    expect(con({ texto: 'Elige', opciones: ['Sí', 'x'.repeat(MAX_ELECCION)] })).toEqual([]);
    // Los espacios de los extremos no cuentan, como al guardarla
    expect(con({ texto: 'Elige', opciones: ['Sí', ` ${'x'.repeat(MAX_ELECCION)} `] })).toEqual([]);
    const errores = con({ texto: 'Elige', opciones: ['Sí', 'x'.repeat(MAX_ELECCION + 1)] });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(new RegExp(`opción de ${MAX_ELECCION + 1} caracteres .*el tope es ${MAX_ELECCION}`));
    // La que pone el Studio con un clic («Ya te lo dije en mi comentario») también cabe
    expect(YA_LO_DIJE.length).toBeLessThanOrEqual(MAX_ELECCION);
  });

  it('un paso con `varias` se responde con una o varias opciones, juntas en una sola nota (nota de voz del titular nmvoi1e0etit)', () => {
    const p = planEjemplo();
    const con = (paso: Paso) => validarPlan({ ...p, misiones: [...p.misiones, mision([paso])] }, ['titular', 'ana']);
    const opciones = ['Lo importante primero', 'Una pregunta al cerrar un bloque', 'Leerlo en voz alta', 'Ninguna por ahora'];
    expect(con({ texto: 'Elige qué sumarle', opciones, varias: true })).toEqual([]);
    // Solo con opciones, y solo `true`
    expect(con({ texto: 'Elige qué sumarle', varias: true })).toHaveLength(1);
    expect(con({ texto: 'Elige qué sumarle', opciones, varias: false } as Paso)).toHaveLength(1);
    // El separador de la nota no va dentro de una opción
    expect(con({ texto: 'Elige', opciones: ['A · B', 'C'], varias: true })).toHaveLength(1);
    // En la nota van en el orden del paso, sin importar en qué orden se marcaron; caben siempre enteras
    expect(juntarElecciones(opciones, [2, 0])).toBe('Lo importante primero · Leerlo en voz alta');
    expect(juntarElecciones(Array.from({ length: MAX_OPCIONES }, (_, i) => `${i}`.padEnd(MAX_ELECCION, 'x')), [0, 1, 2, 3, 4, 5]).length).toBeLessThanOrEqual(MAX_ELECCIONES);
    // «Ninguna por ahora» no va con las demás
    expect(opciones.map(opcionSola)).toEqual([false, false, false, true]);
    // El paso queda respondido con la nota de lo elegido, como con una sola opción
    const m = mision([{ texto: 'Elige qué sumarle', opciones, varias: true }]);
    const nota: Nota = { id: 'e1', cuando: '2026-10-26T00:09:00Z', quien: 'titular', de: 'titular', sobre: { tipo: 'mision', id: 't_meta', seccion: 'Paso 1', eleccion: juntarElecciones(opciones, [0, 2]) } };
    expect(pasosVistos(m, proyecto(), { ...estadoVacio(), notas: [nota] })).toEqual([0]);
  });

  it('«Ya te lo dije en mi comentario»: el último ✉ a secas del paso lo responde, y el paso se marca (pedido del titular)', () => {
    const m = mision(['Lee', { texto: '¿Funciona?', opciones: ['Sí', 'No'] }]);
    const nota = (id: string, cuando: string, de: string, sobre: Partial<Nota['sobre']>, resto: Partial<Nota> = { texto: 'Todo funciona' }): Nota =>
      ({ id, cuando, quien: de, de, sobre: { tipo: 'mision', id: 't_meta', seccion: 'Paso 2', ...sobre }, ...resto });
    const notas = [
      nota('c1', '2026-10-21T09:00:00Z', 'titular', {}),
      nota('c2', '2026-10-21T10:00:00Z', 'titular', {}, { audio: 'notas/a.webm' }),
      nota('e', '2026-10-21T11:00:00Z', 'titular', { eleccion: 'Sí' }),
      nota('h', '2026-10-21T11:01:00Z', 'titular', { hazlo: true }),
      nota('a', '2026-10-21T11:02:00Z', 'titular', { aclarar: true }),
      nota('ana', '2026-10-21T11:03:00Z', 'ana', {}),
      nota('p1', '2026-10-21T11:04:00Z', 'titular', { seccion: 'Paso 1' }),
      nota('vacia', '2026-10-21T11:05:00Z', 'titular', {}, { texto: '  ' }),
    ];
    expect(comentarioDe(notas, 't_meta', 1, 'titular')?.id).toBe('c2');
    expect(comentarioDe(notas, 't_meta', 0, 'titular')?.id).toBe('p1');
    expect(comentarioDe(notas, 't_meta', 1, 'ana')?.id).toBe('ana');
    expect(comentarioDe(notas, 'otra', 1, 'titular')).toBeUndefined();
    expect(comentarioDe([nota('vacia', '2026-10-21T11:05:00Z', 'titular', {}, { texto: '' })], 't_meta', 1, 'titular')).toBeUndefined();
    // Con adjuntos y sin texto también es algo dicho
    expect(comentarioDe([nota('img', '2026-10-21T11:06:00Z', 'titular', {}, { adjuntos: [{ ruta: 'notas/x.png', nombre: 'x.png', bytes: 10 }] })], 't_meta', 1, 'titular')?.id).toBe('img');
    // La elección YA_LO_DIJE marca el paso, como cualquier opción
    expect(pasosVistos(m, proyecto(), { ...estadoVacio(), notas: [notas[0], nota('y', '2026-10-21T12:00:00Z', 'titular', { eleccion: YA_LO_DIJE })] })).toEqual([1]);
    expect(pasosVistos(m, proyecto(), { ...estadoVacio(), notas: [notas[0]] })).toEqual([]);
  });

  it('los idiomas que lee cada persona van en su ficha del equipo: validarProyecto los revisa y la bandeja los dice (pd_reglas_lectura)', () => {
    const base = { ...proyectoVacio(), equipo: [{ id: TITULAR, nombre: 'Ana', correo: 'ana@ejemplo.com' }] };
    const con = (lee: unknown) => validarProyecto({ ...base, equipo: [{ ...base.equipo[0], lee } as Integrante] });
    expect(con(undefined)).toEqual([]);
    expect(con(['es', 'en'])).toEqual([]);
    expect(con([])).toEqual([]);
    expect(con(['fr'])).toHaveLength(1);
    expect(con(['es', 'es'])).toHaveLength(1);
    expect(con('es')).toHaveLength(1);
    expect(leeEnLaBandeja({ lee: ['en', 'es'] })).toBe('reads Spanish and English');
    expect(leeEnLaBandeja({ lee: ['en'] })).toBe('reads English');
    expect(leeEnLaBandeja({})).toBe('');
    // El idioma de salida es el de la interfaz, sea cual sea el de las notas (nmw6p6l8qtit)
    expect(leeEnLaBandeja({ lee: ['es', 'en'] }, 'en')).toBe("reads Spanish and English; write to them in English, the interface's language");
    expect(leeEnLaBandeja({ lee: ['es', 'en'] }, 'es')).toBe("reads Spanish and English; write to them in Spanish, the interface's language");
    expect(leeEnLaBandeja({}, 'en')).toBe("write to them in English, the interface's language");
    expect(reglaDeIdiomaEnLaBandeja('en')).toMatch(/^Write every answer, mission, document and message in English, the language chosen in the Studio's interface/);
    expect(reglaDeIdiomaEnLaBandeja('es')).toContain('in Spanish, the language chosen');
    expect(reglaDeIdiomaEnLaBandeja('en')).toContain('whatever language the notes are written or dictated in');
    expect(reglaDeIdiomaEnLaBandeja()).toMatch(/^Write to each one as they read\./);
    // La bandeja y el encargo del director lo dicen, con la regla
    const bandeja = readFileSync(new URL('../../tools/director/bandeja.ts', import.meta.url), 'utf8');
    expect(bandeja).toContain('leeEnLaBandeja(i, local.idioma)');
    expect(bandeja).toContain('reglaDeIdiomaEnLaBandeja(local.idioma)');
    expect(reglaDeIdiomaEnLaBandeja('en')).toContain('Never translate for them what is already in a language they read');
    const revisor = readFileSync(new URL('../../estudio/servidor/revisor.ts', import.meta.url), 'utf8');
    expect(revisor).toMatch(/COMO_LEE_CADA_UNO \+\n {2}POLITICA_DE_MODELOS/);
    // El servidor guarda solo idiomas que conoce, los cambia el titular o la persona misma
    const api = readFileSync(new URL('../../estudio/servidor/api.ts', import.meta.url), 'utf8');
    const caso = api.slice(api.indexOf("case 'idiomas_integrante': {"), api.indexOf("case 'quitar_integrante': {"));
    expect(caso).toContain('if (!titular && yo.rol !== i.id)');
    expect(caso).toContain('cuerpo.lee.every(esIdioma)');
  });

  it('«Ya lo comenté antes»: marca el paso sin elegir una opción ni comentarlo, remite a una instrucción anterior y no entra en lo vigente (nota de voz nmw1l6eo6tit)', () => {
    expect(YA_LO_COMENTE).toBe('Ya lo comenté antes');
    expect(YA_LO_COMENTE.length).toBeLessThanOrEqual(MAX_ELECCION);
    expect(YA_LO_COMENTE).not.toBe(YA_LO_DIJE);
    expect([YA_LO_DIJE, YA_LO_COMENTE, 'Sí', undefined].map(remiteALoDicho)).toEqual([true, true, false, false]);
    const m = mision(['Lee', { texto: '¿Funciona?', opciones: ['Sí', 'No'] }]);
    // Sin ningún comentario en ese paso: la nota trae solo la elección, sin texto, y el paso queda hecho
    const salto: Nota = { id: 's', cuando: '2026-11-04T12:00:00Z', quien: 'titular', de: 'titular', sobre: { tipo: 'mision', id: 't_meta', seccion: 'Paso 2', eleccion: YA_LO_COMENTE } };
    expect(pasosVistos(m, proyecto(), { ...estadoVacio(), notas: [salto] })).toEqual([1]);
    // No es una opción elegida: no queda «en vigor», y una opción anterior del mismo paso sigue siendo la vigente
    const antes: Nota = { ...salto, id: 'e', cuando: '2026-11-04T11:00:00Z', sobre: { ...salto.sobre, eleccion: 'Sí' } };
    expect(decisionesVigentes({}, [salto]).map((n) => n.id)).toEqual([]);
    expect(decisionesVigentes({}, [antes, salto]).map((n) => n.id)).toEqual(['e']);
    // Dónde buscar la instrucción: sus comentarios anteriores, el más nuevo primero, sin clics ni notas de otros ni posteriores
    const c = (id: string, cuando: string, resto: Partial<Nota> = {}): Nota => ({ id, cuando, quien: 'titular', de: 'titular', sobre: { tipo: 'mision', id: 't_otra', seccion: 'Paso 1' }, texto: 'Hazlo así', ...resto });
    const notas = [
      c('viejo', '2026-11-04T08:00:00Z'),
      c('audio', '2026-11-04T09:00:00Z', { texto: undefined, audio: 'notas/a.webm' }),
      c('clic', '2026-11-04T10:00:00Z', { sobre: { tipo: 'mision', id: 't_otra', seccion: 'Paso 2', eleccion: 'Sí' } }),
      c('deAna', '2026-11-04T10:30:00Z', { quien: 'ana', de: 'ana' }),
      c('nuevo', '2026-11-04T11:30:00Z'),
      c('despues', '2026-11-04T13:00:00Z'),
      salto,
    ];
    expect(instruccionesPrevias(notas, salto).map((n) => n.id)).toEqual(['nuevo', 'audio', 'viejo']);
    expect(instruccionesPrevias(notas, salto, 1).map((n) => n.id)).toEqual(['nuevo']);
  });

  it('un paso puede pedir esperar antes de responder (la cuenta regresiva), y una opción «te cuento» abre el comentario', () => {
    const p = planEjemplo();
    const con = (paso: Paso) => validarPlan({ ...p, misiones: [...p.misiones, mision([paso])] }, ['titular', 'ana']);
    expect(con({ texto: 'Espera y mira', opciones: ['Se ve', 'No se ve'], esperar: 120 })).toEqual([]);
    expect(con({ texto: 'Espera y mira', esperar: 120 })).toHaveLength(1);
    // Sin opciones, la espera retiene el botón que lleva a verlo
    expect(con({ texto: 'Espera y ábrelo', ir: { url: 'https://example.com', etiqueta: 'Abrir' }, esperar: 30 })).toEqual([]);
    expect(con({ texto: 'Espera y mira', opciones: ['Se ve', 'No se ve'], esperar: 2 })).toHaveLength(1);
    expect(con({ texto: 'Espera y mira', opciones: ['Se ve', 'No se ve'], esperar: MAX_ESPERAR + 1 })).toHaveLength(1);
    expect(opcionConDetalle('Se ve, pero algo falla (te cuento con ✉)')).toBe(true);
    expect(opcionConDetalle('Falló (te copio el error con ✉)')).toBe(true);
    expect(opcionConDetalle('Se ve la animación')).toBe(false);
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

  // Nota de voz del titular nmvrikd6ptit: el texto que se pega afuera va en el paso, no solo en lo que imprimió una orden
  it('Un paso con el texto que la persona pega en otra parte: el texto, entero y no vacío', () => {
    const p = planEjemplo();
    const con = (paso: Paso) => validarPlan({ ...p, misiones: [...p.misiones, mision([paso])] }, ['titular', 'ana']);
    expect(con({ texto: 'Pégalo en el formulario de soporte', copiar: 'Hello.\nPlease remove the cached views.', ir: { url: 'https://support.github.com', etiqueta: 'Abrir el soporte' }, soloTu: 'Es tu cuenta.' })).toEqual([]);
    expect(con({ texto: 'Pégalo', copiar: '  ' })).toHaveLength(1);
  });

  it('«No lo entiendo»: las veces que se pidió aclarar cada paso', () => {
    const nota = (id: string, seccion: string, aclarar = true): Nota => ({ id, cuando: '2026-10-19T10:00:00Z', quien: 'Laura', sobre: { tipo: 'mision', id: 't_meta', seccion, ...(aclarar ? { aclarar } : {}) }, texto: 'No lo entiendo' });
    const notas = [nota('a', seccionPaso(1)), nota('b', 'Paso 2'), nota('c', 'Paso 2', false), nota('d', 'Paso 1')];
    expect(aclaracionesDe(notas, 't_meta', 1).map((n) => n.id)).toEqual(['a', 'b']);
    expect(aclaracionesDe(notas, 't_meta', 0).map((n) => n.id)).toEqual(['d']);
    // Pedir una aclaración no cuenta como la nota que pide un paso
    expect(pasoHecho({ que: 'nota', tipo: 'mision' }, 'titular', proyecto(), { ...estadoVacio(), notas: [{ ...nota('a', 'Paso 1'), de: 'titular' }] })).toBe(false);
  });

  it('«Listo, ya lo hice» cuenta como leído salvo que quede una decisión por responder (t_decide_listo_lectura)', () => {
    const partes = [
      { titulo: '1. Lo que entendí', md: 'Sin nada que decidir.' },
      { titulo: '2. El alcance', md: 'Explica.\n\n**Para decidir:**\n\n1. **Dónde va.** ¿Aquí? Recomiendo que sí.\n2. **Cuándo.** ¿Ya? Recomiendo que sí.' },
      { titulo: '3. El cierre', md: 'Sin decisiones tampoco.' },
    ];
    const nada = () => false;
    const todas = () => true;
    // Sin decisiones en el documento, se da por leído
    expect(parteConDecisionPendiente([partes[0], partes[2]], nada)).toBeNull();
    // Con una por responder, lleva a su parte; respondidas todas, ya no detiene
    expect(parteConDecisionPendiente(partes, nada)).toBe('2. El alcance');
    expect(parteConDecisionPendiente(partes, (_, x) => x.startsWith('Dónde'))).toBe('2. El alcance');
    expect(parteConDecisionPendiente(partes, todas)).toBeNull();
    // Un paso que nombra una parte solo mira esa parte
    expect(parteConDecisionPendiente(partes, nada, '1. Lo que entendí')).toBeNull();
    expect(parteConDecisionPendiente(partes, nada, '2. El alcance')).toBe('2. El alcance');
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

  it('un paso que no sale no atrapa: la misión entregada sin terminar dice qué pasos faltan', () => {
    const pasos: Paso[] = [
      { texto: 'Lee', hecho: { que: 'leido', id: 'docs/x.md' } },
      { texto: 'Mueve la carpeta', terminal: 'mv a b', comprobar: { orden: 'no existe a' } },
      { texto: 'Elige', opciones: ['Sí', 'No'] },
    ];
    // La comprobación falló y la persona siguió con otra: el paso de la orden y el siguiente quedan sin marcar
    expect(pasosSinMarcar({ pasos }, [0])).toEqual([1, 2]);
    // Una entrega completa no tiene nada que señalar, aunque traiga marcas de pasos que ya no existen
    expect(pasosSinMarcar({ pasos }, [0, 1, 2, 7])).toEqual([]);
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
    expect(corre({ orden: 'no existe docs/.env' })).toEqual([]);
    expect(corre({ orden: 'no existe ../afuera' })).toHaveLength(1);
    expect(ordenDeComprobacion('no existe "docs/a b.txt"')).toEqual({ programa: 'no existe', args: ['docs/a b.txt'] });
    expect(corre({ orden: 'git status --porcelain', vacia: true, espera: 'x' })).toHaveLength(1);
    expect(con({ texto: 'Sin orden', comprobar: { orden: 'git status' } })).toHaveLength(1);
    expect(ordenDeComprobacion('git log -1 "--format=%an %ae"')).toEqual({ programa: 'git', args: ['log', '-1', '--format=%an %ae'] });
    expect(cumpleComprobacion(' Leonc@x.com\n', { orden: 'git log', espera: 'leonc' })).toBe(true);
    expect(cumpleComprobacion('M a.ts', { orden: 'git status --porcelain', vacia: true })).toBe(false);
    expect(cumpleComprobacion('', { orden: 'git status --porcelain', vacia: true })).toBe(true);
  });

  it('con la interfaz en inglés, un paso abierto no le habla con los rótulos en español (nmw6wpwl4tit, nmw6wwsy2tit)', () => {
    const p = planEjemplo();
    const con = (paso: Paso, idioma?: 'es' | 'en', aprobada = false) => validarPlan({ ...p, misiones: [...p.misiones, mision([paso])], revisiones: aprobada ? { ...p.revisiones, t_meta: { cuando: '2026-11-07T10:00:00Z', veredicto: 'aprobada', comentario: 'Bien.' } } : p.revisiones }, ['titular', 'ana'], idioma).filter((e) => e.includes('«t_meta»'));
    // «Siguiente paso.» al principio: la tarjeta ya lo dice, en su idioma
    expect(con('Siguiente paso. Press F5 to reload the Studio.', 'en').filter((e) => e.includes('Siguiente paso»'))).toHaveLength(1);
    const siguiente = con({ texto: 'Siguiente paso. Press F5 to reload the Studio.' }, 'en');
    expect(siguiente).toHaveLength(1);
    expect(siguiente[0]).toContain('«Next step»');
    // Un rótulo de la interfaz en español, entre «»: el error dice cuál usar
    const enfoque = con({ texto: 'Turn on «Modo enfoque» and then look at the fog.' }, 'en');
    expect(enfoque).toHaveLength(1);
    expect(enfoque[0]).toContain('«Focus mode»');
    expect(con({ texto: 'Turn on «Focus mode» and then look at the fog.' }, 'en')).toEqual([]);
    // También en su detalle y en sus opciones, y en un paso escrito como texto solo
    expect(con({ texto: 'Look at it.', detalle: ['Open «Modo enfoque».'] }, 'en')).toHaveLength(1);
    expect(con({ texto: 'Which one?', opciones: ['«Modo enfoque»', 'Other'] }, 'en')).toHaveLength(1);
    // Lo que no es un rótulo de la interfaz se cita tal cual (lo que la persona dijo, en su idioma)
    expect(con({ texto: 'You said «No estoy de acuerdo con el reinicio».' }, 'en')).toEqual([]);
    // Con la interfaz en español, o sin decir cuál, nada cambia; y una misión aprobada es historia
    expect(con({ texto: 'Siguiente paso. Prende el «Modo enfoque».' }, 'es')).toEqual([]);
    expect(con({ texto: 'Siguiente paso. Prende el «Modo enfoque».' })).toEqual([]);
    expect(con({ texto: 'Siguiente paso. Turn on «Modo enfoque».' }, 'en', true)).toEqual([]);
  });
});

describe('la cola de diagnósticos', () => {
  const c = (id: string, extra: Partial<Parameters<typeof colaDeDiagnosticos>[0][number]> = {}) => ({ id, nombre: id.toUpperCase(), diagnosticado: false, conectado: true, ...extra });

  it('son los proyectos existentes sin diagnóstico y conectados, menos el activo, del trabajo más reciente al más viejo', () => {
    const cola = colaDeDiagnosticos(
      [
        c('activo'),
        c('viejo', { historialIA: [{ agente: 'Claude Code', ultima: '2026-01-01T00:00:00Z' }] }),
        c('reciente', { historialIA: [{ agente: 'Claude Code', sesiones: 3, ultima: '2026-10-01T00:00:00Z', donde: '/h/uno' }, { agente: 'Codex', ultima: '2026-02-01T00:00:00Z' }] }),
        c('diagnosticado', { diagnosticado: true }),
        c('nuevo', { tipo: 'nuevo' }),
        c('sin-repo', { conectado: false }),
        c('sin-historial'),
      ],
      'activo',
    );
    expect(cola.map((x) => x.id)).toEqual(['reciente', 'viejo', 'sin-historial']);
    expect(cola[0]).toEqual({ id: 'reciente', nombre: 'RECIENTE', historial: 'Claude Code (3), Codex', historialIA: [{ agente: 'Claude Code', sesiones: 3, ultima: '2026-10-01T00:00:00Z', donde: '/h/uno' }, { agente: 'Codex', ultima: '2026-02-01T00:00:00Z' }] });
    // Lo único que saca a un proyecto de la cola es su diagnóstico: uno que no se pudo diagnosticar sigue ahí
    expect(colaDeDiagnosticos([c('x')], 'otro').map((y) => y.id)).toEqual(['x']);
    expect(colaDeDiagnosticos([c('x', { diagnosticado: true })], 'otro')).toEqual([]);
    // Sin nombre, el id
    expect(colaDeDiagnosticos([c('x', { nombre: '' })], 'otro')[0].nombre).toBe('x');
    expect(POR_REVISION).toBe(3);
  });
});

describe('la foto inicial: lo cerrado sale al archivo de una vez, y nada se pierde (pd_foto_inicial)', () => {
  it('deja en el plan solo lo que está en firme, y unido con su archivo, leído por meses, el plan es el mismo y cada id se encuentra', () => {
    const p = planEjemplo();
    const fase = 'mvp';
    const prop = (id: string) => ({ id, area: 'x', titulo: `La propuesta ${id}`, problema: 'x', propuesta: 'x', conecta: 'x', fase });
    p.propuestas = [prop('pr_ejec'), prop('pr_acept'), prop('pr_sin')];
    p.ejecutadas = { pr_ejec: { cuando: '2026-10-13T10:00:00Z', nota: 'hecha hoy' } };
    p.pedidos = [{ id: 'pd_hecho', fase, texto: 'Un pedido hecho hoy', hecho: { cuando: '2026-10-13T10:00:00Z', nota: 'hecho' } }, { id: 'pd_sin', fase, texto: 'Un pedido por hacer' }];
    p.fases = p.fases.map((f) => f.id === 'arranque' ? { ...f, misiones: ['Lo del arranque', 'Otra del arranque'] } : f.id === fase ? { ...f, misiones: ['Primero pd_hecho', 'Los endpoints', 'Después pd_sin'] } : f);
    p.adelantado = [{ fase: 'arranque', frente: 'api', texto: 'Hecho en el arranque' }, { fase: 'beta', frente: 'web', texto: 'El panel' }];
    const e = estadoVacio();
    e.notas = [{ id: 'nota_hoy', cuando: '2026-10-13T09:00:00Z', quien: 'Laura', sobre: { tipo: 'general' }, texto: 'Una nota de hoy' }, { id: 'nota_abierta', cuando: '2026-10-13T09:00:00Z', quien: 'Laura', sobre: { tipo: 'mision', id: 't_alcance' }, texto: 'x' }];
    e.entregas.t_diag = { cuando: '2026-10-13T08:00:00.000Z', quien: 'Laura' };
    e.cierres = { arranque: { fecha: '2026-10-13T09:00:00Z', quien: 'titular' } };
    const firma = { fecha: '2026-10-10T10:00:00Z', quien: 'titular', estado: 'aceptada' as const };
    e.propuestas = { pr_ejec: firma, pr_acept: firma };
    const hoy = '2026-10-13T11:00:00Z';
    p.respuestas = { nota_hoy: { cuando: '2026-10-13T10:00:00Z', texto: 'Hecho', tratamiento: 'informada' }, nota_abierta: { cuando: '2026-10-13T10:00:00Z', texto: 'Visto', tratamiento: 'informada' } };
    p.revisiones = { t_diag: { cuando: '2026-10-13T10:00:00Z', veredicto: 'aprobada', comentario: 'Bien' } };
    // Lo de la última revisión también sale: archivar esperaría una vuelta más, la foto no
    expect(archivar(p, archivoVacio(), e, '2026-10-12T00:00:00Z').movidas).toBe(0);
    const foto = fotoInicial(p, archivoVacio(), e, hoy);
    // En firme: lo abierto, lo aceptado sin ejecutar, lo pedido sin hacer, lo que adelanta y las previstas sin hacer
    expect(foto.plan.misiones.some((m) => m.id === 't_diag')).toBe(false);
    expect(Object.keys(foto.plan.respuestas)).toEqual(['nota_abierta']);
    expect(foto.plan.propuestas.map((x) => x.id)).toEqual(['pr_acept', 'pr_sin']);
    expect(foto.plan.pedidos!.map((x) => x.id)).toEqual(['pd_sin']);
    expect(foto.plan.adelantado.map((x) => x.fase)).toEqual(['beta']);
    expect(foto.plan.fases.find((f) => f.id === 'arranque')!.misiones).toEqual([]);
    expect(foto.plan.fases.find((f) => f.id === fase)!.misiones).toEqual(['Los endpoints', 'Después pd_sin']);
    // t_diag y su veredicto, nota_hoy, pr_ejec, pd_hecho, lo adelantado del arranque y tres previstas
    expect(foto.movidas).toBe(9);
    // Nada se pierde: el archivo partido por mes y leído de nuevo, unido con el plan, da el plan de antes
    const meses = partirArchivoPorMes(foto.archivo);
    const leido = juntarArchivos(Object.keys(meses).sort().map((m) => JSON.parse(JSON.stringify(meses[m]))));
    const unido = unirArchivo(foto.plan, leido);
    const porId = <T extends { id: string }>(xs: T[]) => [...xs].sort((x, y) => x.id.localeCompare(y.id));
    expect(porId(unido.misiones)).toEqual(porId(p.misiones));
    expect(unido.respuestas).toEqual(p.respuestas);
    expect(unido.revisiones).toEqual(p.revisiones);
    expect(porId(unido.propuestas)).toEqual(porId(p.propuestas));
    expect(unido.ejecutadas).toEqual(p.ejecutadas);
    expect(porId(unido.pedidos!)).toEqual(porId(p.pedidos));
    expect(unido.adelantado).toEqual(p.adelantado);
    expect(unido.fases).toEqual(p.fases);
    // Y buscar.ts encuentra cada cosa por su id, igual que antes, con su estado
    const antes = piezasDelProyecto(unirArchivo(p, null), e);
    const despues = piezasDelProyecto(unido, e);
    expect(despues.map((x) => `${x.id} ${x.estado}`).sort()).toEqual(antes.map((x) => `${x.id} ${x.estado}`).sort());
    for (const id of ['t_diag', 'nota_hoy', 'pr_ejec', 'pd_hecho']) expect(buscar(despues, id).some((h) => h.id === id)).toBe(true);
    // Otra foto no mueve nada más ni duplica lo ya archivado
    const otra = fotoInicial(foto.plan, leido, e, hoy);
    expect(otra.movidas).toBe(0);
    expect(otra.archivo.previstas).toEqual(leido.previstas);
    expect(unirArchivo(otra.plan, otra.archivo).fases).toEqual(p.fases);
  });
});

// Decisión del titular, 9 de noviembre de 2026: las revisiones del 8 y del 9 no podían cerrar. Lo único de la cola del
// director esperaba que el titular viera dos arreglos, lo del cierre seguía retenido por esa cola, y ni el lote corto ni
// inventar misiones valían
describe('el lote corto por espera: todo lo de la cola del director espera misiones abiertas de las personas', () => {
  it('vale si cada cosa de la cola tiene una misión abierta que la nombra en su origen, y el lote las trae', () => {
    const p = planEjemplo();
    const e = estadoVacio();
    const desde = '2026-10-26T22:41:00.000Z';
    p.propuestas = [...p.propuestas, { id: 'pr_sin', area: 'x', titulo: 'Sin hacer', problema: '', propuesta: '', conecta: '', fase: 'arranque' }];
    e.propuestas.pr_sin = { estado: 'aceptada', fecha: '2026-10-26', quien: 'Laura' };
    const razon = 'Lo único que queda en mi cola espera que veas los dos arreglos: hasta que los entregues no tengo nada más que construir.';
    const lote = ['t_conectar', 't_diag', 't_alcance'];
    p.reservaCorta = { titular: { cuando: '2026-10-26T23:10:00.000Z', razon, lote, motivo: 'espera' } };
    // Sin una misión abierta que la nombre en su origen, la propuesta sigue siendo trabajo del director
    expect(reservaSinRazon(p, e, ['titular'], desde)[0].motivo).toContain('no espera ninguna misión abierta');
    p.misiones.find((m) => m.id === 't_diag')!.origen = ['pr_sin'];
    expect(reservaSinRazon(p, e, ['titular'], desde)).toEqual([]);
    // El lote trae todas las misiones de la persona que la cola espera
    p.reservaCorta.titular.lote = ['t_conectar'];
    expect(reservaSinRazon(p, e, ['titular'], desde)[0].motivo).toContain('t_diag');
    // Con «ruta», en cambio, la cola tiene algo: no vale, y el aviso dice que el motivo es «espera»
    p.reservaCorta.titular = { cuando: '2026-10-26T23:10:00.000Z', razon, lote, motivo: 'ruta' };
    expect(reservaSinRazon(p, e, ['titular'], desde)[0].motivo).toContain('el motivo es «espera»');
    // Con la cola vacía, «espera» no es el motivo: es la ruta completada
    e.propuestas.pr_sin = { estado: 'descartada', fecha: '2026-10-26', quien: 'Laura' };
    p.reservaCorta.titular = { cuando: '2026-10-26T23:10:00.000Z', razon, lote, motivo: 'espera' };
    expect(reservaSinRazon(p, e, ['titular'], desde)[0].motivo).toContain('«ruta»');
  });
});
