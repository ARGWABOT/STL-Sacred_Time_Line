// El Director asistente: la lógica pura del Estudio. El director (una sesión de Claude) diagnostica el repositorio
// de un proyecto, propone objetivos, traza la ruta por fases con sus puertas, dice qué hace cada frente de trabajo en
// cada fase (en foco, de apoyo o en espera) y asigna misiones, una a la vez. El plan lo escribe el director
// (proyectos/<id>/director/plan.json); lo que decide el equipo en el Estudio (criterios, puertas, excepciones,
// validaciones, respuestas a las propuestas, entregas y notas) vive en proyectos/<id>/director/equipo/<persona>.json,
// uno por persona para que los computadores no choquen (se unen con unirEstados). Lo que es del proyecto (el contexto,
// el objetivo firmado y el equipo) está en proyectos/<id>/proyecto.json. Cada proyecto, en su carpeta (proyectos.ts). Aquí no hay nada de disco ni de red: lo usan el
// Estudio, su servidor y tools/director/*.ts.

export const NIVELES = ['foco', 'apoyo', 'espera'] as const;
export type Nivel = (typeof NIVELES)[number];

/** Cómo se comprueba con gente o con pruebas que lo hecho sirve, en cualquier tipo de proyecto. */
export const TIPOS_VALIDACION = ['usuarios', 'cliente', 'experto', 'tecnica', 'piloto'] as const;
export type TipoValidacion = (typeof TIPOS_VALIDACION)[number];

export const RESPUESTAS = ['aceptada', 'en_estudio', 'descartada'] as const;
export type RespuestaPropuesta = (typeof RESPUESTAS)[number];

/** Qué mide un criterio que se cumple solo (con `meta`, en % o en número según el indicador). */
export const INDICADORES = [
  'validaciones_personas', // personas (o casos) en las validaciones de la fase (de `tipos`, si los trae)
  'validaciones_logran', // % de ellas que logró lo que se probaba sin ayuda
  'validaciones_aprueban', // % que lo aprueba o lo volvería a usar
  'diagnostico', // 100 si el director ya hizo el diagnóstico
  'objetivo', // 100 si el titular ya firmó el objetivo
  'misiones', // % de las misiones de la fase (o las `ids`) aprobadas
  'foco', // % del esfuerzo de los últimos 7 días que fue a los frentes en foco de la fase
] as const;
export type IdIndicador = (typeof INDICADORES)[number];
const EN_NUMERO: IdIndicador[] = ['validaciones_personas'];

/** El id de quien dirige el proyecto: tiene la última palabra (firma el objetivo, cruza las puertas, decide). */
export const TITULAR = 'titular';
/** Una persona del equipo, por su id (el titular siempre es «titular»). */
export type Persona = string;

// ───────────────────────────────────────────────────────────── el proyecto (lo escribe el titular en el Estudio)

export interface Integrante {
  id: Persona;
  nombre: string;
  /** Su correo de git: así sabe el Estudio quién decide en cada computador. */
  correo: string;
  /** El cargo corto, para el selector «Ver como» («Director de proyecto»). */
  cargo?: string;
  papel?: string;
}

export interface Firma {
  fecha: string;
  quien: string;
  nota?: string;
}

/** El objetivo claro: qué se logra, cómo se sabe que se logró y, si se quiere, para cuándo (un hito, no un plazo). */
export interface Objetivo {
  texto: string;
  exito: string;
  horizonte?: string;
  /** El candidato del director del que salió, si salió de uno. */
  candidato?: string;
  firmado: Firma;
}

/**
 * Cómo llega el proyecto al director. Uno **existente** ya tiene repositorio e historia: el director lo diagnostica
 * primero, detecta lo que está en curso y las metas de su propia documentación, y propone él los objetivos. Uno
 * **nuevo** aún no existe (o apenas empieza): el director pide la explicación, el objetivo y cuándo se considera
 * completo, y responde con un planteamiento.
 */
export const TIPOS_PROYECTO = ['existente', 'nuevo'] as const;
export type TipoProyecto = (typeof TIPOS_PROYECTO)[number];

export interface Proyecto {
  nombre: string;
  /** Existente (se diagnostica) o nuevo (se plantea). Sin dato, existente. */
  tipo?: TipoProyecto;
  /** Qué es, para quién y en qué punto está, en palabras del titular. */
  contexto: string;
  /** Lo que el titular quiere lograr, antes del diagnóstico y sin pulir. */
  metaInicial: string;
  /** Solo en los nuevos: cuándo se considera completo el proyecto, en palabras del titular. */
  terminado?: string;
  /**
   * Dónde trabajó el titular este proyecto con agentes de IA antes de entregarlo al Studio (lo detecta «Escanear
   * equipo»): el director lee esas conversaciones una vez, en el diagnóstico, para encontrar lo pendiente.
   */
  historialIA?: { agente: string; sesiones?: number; ultima?: string; donde?: string }[];
  repositorio: { url: string; rama: string };
  objetivo: Objetivo | null;
  /** Los objetivos que el titular firmó antes y reabrió, con su razón. */
  objetivosAnteriores?: (Objetivo & { reabierto: Firma })[];
  equipo: Integrante[];
  /** Si el Estudio sube solo a GitHub lo que decide cada persona (para equipos en varios computadores). */
  sincronizar: boolean;
}

export const proyectoVacio = (): Proyecto => ({
  nombre: '',
  tipo: 'existente',
  contexto: '',
  metaInicial: '',
  terminado: '',
  repositorio: { url: '', rama: '' },
  objetivo: null,
  equipo: [],
  sincronizar: false,
});

// ───────────────────────────────────────────────────────────── el plan (lo escribe el director)

export interface Frente {
  id: string;
  nombre: string;
  que: string;
  /** Rutas del repositorio del proyecto (prefijos) que son de este frente: con ellas se reparte el esfuerzo de los commits. */
  rutas: string[];
}

export interface Criterio {
  id: string;
  texto: string;
  /** Cómo se comprueba, o dónde está la evidencia de lo ya hecho. */
  como?: string;
  indicador?: IdIndicador;
  ids?: string[];
  tipos?: TipoValidacion[];
  meta?: number;
}

export interface TrabajoFrente {
  nivel: Nivel;
  que: string;
}

export interface Fase {
  id: string;
  nombre: string;
  /** El nombre de la etapa en la disciplina del proyecto (Descubrimiento, Prototipo, MVP, Piloto, Lanzamiento…). */
  etapa: string;
  meta: string;
  porQue: string;
  /** Hasta cuándo va: un hito con su prueba, nunca una fecha de calendario. */
  duracion: string;
  puerta: { nombre: string; prueba: string };
  /** Lo que hace cada frente en esta fase. Un frente que la fase no nombra está en espera. */
  frentes: Record<string, TrabajoFrente>;
  criterios: Criterio[];
  /** El plan de la fase, en frases cortas (las misiones concretas van en `Plan.misiones`). */
  misiones: string[];
}

export interface DiagnosticoFrente {
  /** De 0 a 5: qué tan listo está el frente para lo que pide el objetivo (no cuánto se trabajó en él). */
  nota: number;
  hecho: string[];
  falta: string[];
  veredicto: string;
}

export interface Diagnostico {
  /** Vacío mientras el director no lo haya hecho. */
  fecha: string;
  resumen: string[];
  frentes: Record<string, DiagnosticoFrente>;
  /** Lo que leyó el director para hacerlo (archivos, carpetas, el historial…). */
  fuentes?: string[];
}

/** Un objetivo que propone el director a partir del diagnóstico; el titular elige, mezcla o escribe el suyo. */
export interface ObjetivoCandidato {
  id: string;
  texto: string;
  exito: string;
  porQue: string;
  riesgo?: string;
  horizonte?: string;
}

export interface Propuesta {
  id: string;
  area: string;
  titulo: string;
  problema: string;
  propuesta: string;
  conecta: string;
  /** La fase en la que hay que decidirla. */
  fase: string;
}

export interface Leccion {
  titulo: string;
  quien: string;
  que: string;
  fuente: string;
  paraElProyecto: string;
}

export interface Adelantado {
  fase: string;
  frente: string;
  texto: string;
}

/** Las pestañas del Director asistente a las que puede llevar un paso. */
export const VISTAS_DIRECTOR = ['misiones', 'buzon', 'documentos', 'ruta', 'propuestas', 'proyectos', 'proyecto', 'diagnostico', 'frentes', 'validaciones', 'esfuerzo', 'metodo', 'bitacora', 'stl', 'preguntas'] as const;
export type VistaDirector = (typeof VISTAS_DIRECTOR)[number];

/**
 * A dónde lleva el botón de un paso: una pestaña del Director (y dentro, el elemento con `data-ancla`), una parte de un
 * documento, una fase de la ruta, el registro de validaciones con su tipo o una página de afuera (`url`, en una
 * pestaña nueva).
 */
export interface Destino {
  vista?: VistaDirector;
  ancla?: string;
  doc?: string;
  seccion?: string;
  fase?: string;
  tipoValidacion?: TipoValidacion;
  url?: string;
  /** El texto del botón. */
  etiqueta: string;
}

/**
 * Lo que prueba, dentro del Studio, que un paso se hizo: con eso el Studio lo marca solo, sin modelo, en cuanto lo ve.
 * `meta_fijada` / `meta_reabierta`: la meta del proyecto (desde `desde`, si se dice). `leido`: el documento `id` leído
 * entero o, con `seccion`, esa parte leída o comentada. `propuesta`: la propuesta `id` respondida. `puerta`: la puerta de
 * la fase `id` cruzada. `nota`: una nota de la persona de la misión en el Buzón (sobre `tipo`, `id` y `seccion`, si se
 * dicen, y desde `desde`). Lo que pasa fuera del Studio (correr un comando) no tiene `hecho`: se marca a mano.
 */
export const HECHOS = ['meta_fijada', 'meta_reabierta', 'leido', 'propuesta', 'puerta', 'nota'] as const;
export type TipoHecho = (typeof HECHOS)[number];
export interface Hecho {
  que: TipoHecho;
  id?: string;
  seccion?: string;
  tipo?: TipoSobre;
  /** ISO: solo cuenta lo hecho desde entonces (la meta, una nota, una propuesta). */
  desde?: string;
}

/**
 * Un paso de una misión: lo que hay que hacer y, si hay que ir a alguna parte, el botón que lleva ahí. `hecho`: lo que
 * prueba que se hizo, para que el Studio lo marque solo. `detalle`: el paso explicado en acciones más pequeñas, en orden
 * (lo agrega el director cuando se le pide «No lo entiendo, explícamelo mejor»; el paso conserva su número).
 * `opciones`: cuando el paso pide responder entre unas pocas opciones (sí o no, una de tres), el Studio las pone como
 * botones en el paso mismo: un clic deja la elección en el Buzón y marca el paso, sin escribir nada.
 * `hazlo`: el paso lo puede hacer el director con la autorización de la persona; dice, en detalle, qué hará. El Studio
 * pone el botón «Hazlo tú», lo explica en un diálogo y, con el segundo clic, deja el encargo en el Buzón y marca el paso:
 * el director lo hace en su revisión siguiente y responde con el resultado. `soloTu`: el paso solo lo puede hacer la
 * persona (y por qué el director no puede hacerlo desde aquí). Lo que se decide, se firma, cuesta o borra nunca es `hazlo`.
 * `terminal`: la orden (una línea de bash) que la persona corre en su terminal. El Studio la muestra con «Copiar» y
 * «Abrir la terminal con esta orden», que abre una ventana nueva y la corre ahí, para no tener que buscar dónde pegarla.
 * `comprobar`: en un paso de terminal, cómo ve el Studio que salió bien (ver `Comprobacion`): al marcarlo, lo comprueba
 * en ese momento, sin modelo, y si no se cumple el paso no se marca.
 */
export type Paso = string | { texto: string; ir?: Destino; hecho?: Hecho; detalle?: string[]; opciones?: string[]; hazlo?: string; soloTu?: string; terminal?: string; comprobar?: Comprobacion };

/**
 * La comprobación de un paso de terminal: una orden de solo lectura que el Studio corre en la carpeta del proyecto
 * (`git log -1 --format=%ae`, `git status --porcelain`, o `existe <ruta>` para ver si un archivo está) y lo que su
 * salida debe contener (`espera`; sin ella, basta con que la orden termine bien). `vacia`: la salida debe salir vacía
 * (por ejemplo, `git status --porcelain` cuando no debe quedar nada sin guardar).
 */
export interface Comprobacion {
  orden: string;
  espera?: string;
  vacia?: boolean;
}

/** Las órdenes de git que solo leen. `branch` y `config`, solo con la opción que lee (`--show-current`, `--get`). */
const GIT_QUE_LEE = ['log', 'status', 'rev-parse', 'show', 'rev-list', 'ls-files', 'describe', 'diff', 'branch', 'config'];

/**
 * La orden de una comprobación, partida en su programa y sus argumentos (sin shell: no hay tuberías ni variables), o
 * por qué no se acepta. Solo se aceptan órdenes que leen: git con las de `GIT_QUE_LEE` y `existe <ruta>` (dentro del
 * proyecto). Las comillas simples o dobles agrupan un argumento con espacios.
 */
export function ordenDeComprobacion(orden: string): { programa: 'git' | 'existe'; args: string[] } | { error: string } {
  if (/[|&;<>`\r\n]|\$\(/.test(orden)) return { error: 'la orden no puede encadenar ni redirigir (sin |, &, ;, <, >, ` ni $( )' };
  const partes = [...orden.trim().matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map((x) => x[1] ?? x[2] ?? x[3]);
  const [programa, ...args] = partes;
  if (programa === 'existe') {
    if (args.length !== 1) return { error: '«existe» lleva una sola ruta' };
    if (/^([a-z]:|[\\/])/i.test(args[0]) || args[0].split(/[\\/]/).includes('..')) return { error: '«existe» solo mira dentro del proyecto (una ruta relativa, sin ..)' };
    return { programa, args };
  }
  if (programa !== 'git') return { error: 'solo se comprueba con git o con «existe <ruta>»' };
  const [sub, ...resto] = args;
  if (!sub || !GIT_QUE_LEE.includes(sub)) return { error: `solo órdenes de git que leen (${GIT_QUE_LEE.join(', ')})` };
  if (sub === 'branch' && (resto.length !== 1 || resto[0] !== '--show-current')) return { error: '«git branch» solo con --show-current' };
  if (sub === 'config' && resto[0] !== '--get') return { error: '«git config» solo con --get' };
  if (resto.some((a) => /^--(output|ext-diff|textconv|exec)/.test(a))) return { error: 'la orden no puede escribir archivos ni correr programas' };
  return { programa, args };
}

/** ¿Lo que dijo la orden de una comprobación es lo que se esperaba? Sin distinguir mayúsculas ni espacios de los bordes. */
export function cumpleComprobacion(salida: string, c: Comprobacion): boolean {
  const s = salida.trim();
  if (c.vacia) return s === '';
  return !c.espera || s.toLowerCase().includes(c.espera.trim().toLowerCase());
}

export const textoPaso = (p: Paso) => (typeof p === 'string' ? p : p.texto);

/** Cuántas opciones puede tener un paso: pocas, para elegir de un vistazo. */
export const MAX_OPCIONES = 6;

/** La última opción que eligió la persona en un paso con `opciones` (la nota que la guarda), si ya eligió. */
export const eleccionDe = (notas: Nota[], mision: string, i: number, persona: Persona) =>
  notas.filter((n) => n.de === persona && n.sobre.tipo === 'mision' && n.sobre.id === mision && n.sobre.seccion === seccionPaso(i) && !!n.sobre.eleccion).at(-1);

/** El último encargo («Hazlo tú») de la persona en un paso con `hazlo` (la nota que lo guarda), si ya se lo encargó. */
export const encargoDe = (notas: Nota[], mision: string, i: number, persona: Persona) =>
  notas.filter((n) => n.de === persona && n.sobre.tipo === 'mision' && n.sobre.id === mision && n.sobre.seccion === seccionPaso(i) && n.sobre.hazlo).at(-1);

/** El texto sin las marcas de Markdown (así se comparan los títulos de las partes de un documento). */
export const textoPlano = (md: string) => md.replace(/[*_`#>\[\]]/g, '').replace(/\(([^)]*)\)/g, '').trim();

/** ¿Ya se ve en el Studio lo que prueba que el paso se hizo? `persona`: la de la misión. */
export function pasoHecho(h: Hecho, persona: Persona, proyecto: Proyecto, estado: EstadoDirector): boolean {
  const desde = h.desde ?? '';
  const dia = desde.slice(0, 10);
  switch (h.que) {
    case 'meta_fijada':
      return !!proyecto.objetivo && proyecto.objetivo.firmado.fecha >= dia;
    case 'meta_reabierta':
      return (proyecto.objetivosAnteriores ?? []).some((o) => o.reabierto.fecha >= dia);
    case 'leido': {
      if (!h.id) return false;
      const leido = estado.leidos?.[claveLeido(persona, h.id)];
      if (!h.seccion) return !!leido?.completo;
      const parte = textoPlano(h.seccion);
      return !!leido?.partes.includes(parte)
        || estado.notas.some((n) => n.de === persona && n.sobre.tipo === 'documento' && n.sobre.id === h.id && textoPlano(n.sobre.seccion ?? '') === parte && n.sobre.postura !== 'comenta');
    }
    case 'propuesta':
      return !!h.id && !!estado.propuestas[h.id] && estado.propuestas[h.id].fecha >= dia;
    case 'puerta':
      return !!h.id && !!estado.cierres[h.id];
    case 'nota':
      return estado.notas.some((n) => n.de === persona && !n.sobre.aclarar && n.cuando >= desde
        && (!h.tipo || n.sobre.tipo === h.tipo) && (!h.id || n.sobre.id === h.id) && (!h.seccion || n.sobre.seccion === h.seccion));
  }
}

/** Los pasos de una misión que el Studio ya ve hechos (por su `hecho`) y que aún no están marcados. */
export function pasosVistos(m: Mision, proyecto: Proyecto, estado: EstadoDirector): number[] {
  const marcados = new Set(estado.pasos?.[m.id]?.hechos ?? []);
  return m.pasos.flatMap((p, i) => (typeof p === 'string' || marcados.has(i) ? []
    : p.opciones?.length ? (eleccionDe(estado.notas, m.id, i, m.para) ? [i] : [])
    : p.hazlo && encargoDe(estado.notas, m.id, i, m.para) ? [i]
    : p.hecho && pasoHecho(p.hecho, m.para, proyecto, estado) ? [i] : []));
}

/** Cómo se nombra un paso en una nota (`sobre.seccion`): «Paso 3». */
export const seccionPaso = (i: number) => `Paso ${i + 1}`;

/** Las veces que se pidió aclarar un paso («No lo entiendo, explícamelo mejor»), de la más vieja a la más nueva. */
export const aclaracionesDe = (notas: Nota[], mision: string, i: number) =>
  notas.filter((n) => n.sobre.tipo === 'mision' && n.sobre.aclarar && n.sobre.id === mision && n.sobre.seccion === seccionPaso(i));

/** Una misión del director para una persona del equipo: qué hacer, paso a paso, y qué entregar. */
export interface Mision {
  id: string;
  para: Persona;
  fase: string;
  frente: string;
  titulo: string;
  porQue: string;
  pasos: Paso[];
  entrega: string;
  /** Documentos para leer y comentar en el Estudio (docs/… del proyecto en el Estudio o repo:… de su repositorio). */
  documentos?: string[];
  /** Criterios de la fase que esta misión hace avanzar. */
  criterios?: string[];
  xp: number;
}

export const VEREDICTOS = ['aprobada', 'rehacer'] as const;
export type Veredicto = (typeof VEREDICTOS)[number];

/** Lo que dice el director de una entrega. `cuando` es ISO, con la hora. */
export interface Revision {
  cuando: string;
  veredicto: Veredicto;
  comentario: string;
}

/**
 * Qué hizo el director con una observación (Metodología STL, ciclo, paso 7): la integró al proyecto, la rechazó con su
 * razón, la aplazó para una fase posterior, o necesita una decisión humana (hay una ambigüedad o un conflicto que la IA
 * no debe resolver sola). `informada`: la nota solo informaba o preguntaba y basta con responder.
 */
export const TRATAMIENTOS = ['integrada', 'rechazada', 'aplazada', 'decision', 'informada'] as const;
export type Tratamiento = (typeof TRATAMIENTOS)[number];

export interface Respuesta {
  cuando: string;
  texto: string;
  tratamiento?: Tratamiento;
  /**
   * Dónde quedó lo que dice la nota: la misión, la propuesta, la fase, el criterio o la parte del documento que la
   * recoge. El Studio lo muestra como «Quedó en: …», con su botón, para comprobarlo de un vistazo.
   */
  destino?: Destino;
}

/** Los tratamientos que llevan algo al plan, y por eso nombran dónde quedó (`destino`). */
export const TRATAMIENTOS_CON_DESTINO: readonly Tratamiento[] = ['integrada', 'aplazada', 'decision'];

/**
 * El doble check del director: las respuestas escritas desde `desde` (la revisión de ahora) que llevan algo al plan pero
 * no dicen dónde quedó. También una decisión respondida en un documento («Para decidir»): salvo que se rechace, tiene su
 * lugar en el plan. Sin esto, una decisión puede quedar solo en una respuesta, y nadie lo nota hasta que la ruta la contradice.
 */
export function respuestasSinDestino(plan: Plan, notas: Nota[], desde: string): string[] {
  const decisiones = new Set(notas.filter(decideDecision).map((n) => n.id));
  return Object.entries(plan.respuestas ?? {})
    .filter(([id, r]) => r.cuando >= desde && !r.destino
      && (TRATAMIENTOS_CON_DESTINO.includes(r.tratamiento!) || (decisiones.has(id) && r.tratamiento !== 'rechazada')))
    .map(([id]) => id);
}

export interface EvaluacionCriterio {
  fecha: string;
  estado: 'cumplido' | 'no_aplica';
  nota: string;
}

/** Lo que el director le dice al equipo hoy: dónde estamos y qué hace cada uno (por id de persona). */
export interface Mensaje {
  fecha: string;
  texto: string;
  personas: Record<Persona, string>;
}

export const NOTAS_BOLETIN = ['A', 'B', 'C', 'D', 'F'] as const;
export type NotaBoletin = (typeof NOTAS_BOLETIN)[number];

/** La calificación del director en una revisión: notas por materia y su comentario. */
export interface Boletin {
  fecha: string;
  para: Persona | 'equipo';
  notas: Record<string, NotaBoletin>;
  comentario: string;
}

export interface DocumentoRevisar {
  ruta: string;
  titulo: string;
  porQue: string;
}

export interface Plan {
  actualizado: string;
  nota: string;
  /** El lema del proyecto: la regla corta con la que se decide. */
  mision: string;
  /** Cuándo revisó el director por última vez lo que dejó el equipo (ISO). */
  revisado: string;
  mensaje: Mensaje;
  frentes: Frente[];
  fases: Fase[];
  misiones: Mision[];
  /** El veredicto del director sobre la última entrega de cada misión. */
  revisiones: Record<string, Revision>;
  /** La respuesta del director a cada nota del buzón. */
  respuestas: Record<string, Respuesta>;
  /** Los criterios que el director da por cumplidos (o que no aplican). */
  evaluacion: Record<string, EvaluacionCriterio>;
  boletin: Boletin[];
  documentos: DocumentoRevisar[];
  diagnostico: Diagnostico;
  objetivos: ObjetivoCandidato[];
  propuestas: Propuesta[];
  ritmo: string[];
  lecciones: Leccion[];
  adelantado: Adelantado[];
  /** «Dónde quedamos»: el brief para cuando el titular vuelve al proyecto. */
  resumen?: Resumen;
  /**
   * Lo que el director detectó del proyecto al diagnosticarlo: qué es, para quién y en qué punto está, y una meta
   * sugerida. El Studio lo muestra en Proyecto mientras el titular no escriba lo suyo (proyecto.json es del titular).
   */
  detectado?: { contexto?: string; meta?: string };
  /** Las propuestas aceptadas que el director ya ejecutó (trabajo aprobado en el Studio), con lo que hizo. */
  ejecutadas?: Record<string, { cuando: string; nota: string }>;
}

// ───────────────────────────────────────────────────────────── el estado (lo decide el equipo)

export interface Marca extends Firma {
  estado: 'cumplido' | 'no_aplica';
}

export interface Excepcion {
  id: string;
  fecha: string;
  quien: string;
  frente: string;
  fase: string;
  motivo: string;
  /** Hasta qué día vale (AAAA-MM-DD, incluido). */
  hasta: string;
  cerrada?: Firma;
}

export interface Validacion {
  id: string;
  fecha: string;
  fase: string;
  tipo: TipoValidacion;
  /** Cuántas personas (o casos) participaron. */
  personas: number;
  /** Cuántas lograron lo que se probaba sin ayuda. */
  lograron: number;
  /** Cuántas lo aprueban o lo volverían a usar. */
  aprueban: number;
  contexto?: string;
  loMejor?: string;
  hallazgos?: string;
  cambios?: string;
  quien: string;
}

/** Lo que entrega una persona al terminar una misión («Lo hice»). `cuando` es ISO, con la hora. */
export interface Entrega {
  cuando: string;
  quien: string;
  nota?: string;
  audio?: string;
}

export const TIPOS_SOBRE = ['general', 'mision', 'propuesta', 'documento', 'criterio', 'fase', 'diagnostico', 'objetivo', 'pregunta'] as const;
export type TipoSobre = (typeof TIPOS_SOBRE)[number];

/**
 * Las preguntas al director van aparte de los comentarios: el titular las anota cuando se le ocurren, sin cortar su
 * trabajo, y el director las responde todas juntas, como un informe (Studio › Preguntas). Son notas con sobre.tipo «pregunta».
 * Sobre una respuesta se puede seguir preguntando o comentando: esa nota lleva en sobre.id la pregunta que sigue, y todo
 * junto es un hilo.
 */
export const esPregunta = (n: Pick<Nota, 'sobre'>) => n.sobre?.tipo === 'pregunta';

/** La pregunta con la que empezó el hilo de una nota de pregunta (ella misma si no sigue a ninguna). */
export function raizDePregunta(n: Nota, notas: Nota[]): Nota {
  const porId = new Map(notas.map((x) => [x.id, x]));
  let actual = n;
  for (let i = 0; i < 50 && actual.sobre?.id; i++) {
    const padre = porId.get(actual.sobre.id);
    if (!padre || !esPregunta(padre)) break;
    actual = padre;
  }
  return actual;
}

/** Los hilos de preguntas: cada pregunta inicial con lo que siguió sobre ella, en orden; el hilo más reciente primero. */
export function hilosDePreguntas(notas: Nota[]): { raiz: Nota; notas: Nota[]; ultima: string }[] {
  const preguntas = notas.filter(esPregunta);
  const hilos = new Map<string, Nota[]>();
  for (const n of preguntas) {
    const r = raizDePregunta(n, preguntas);
    hilos.set(r.id, [...(hilos.get(r.id) ?? []), n]);
  }
  return [...hilos.entries()]
    .map(([id, ns]) => {
      const orden = ns.sort((a, b) => a.cuando.localeCompare(b.cuando));
      return { raiz: orden.find((x) => x.id === id) ?? orden[0], notas: orden, ultima: orden.at(-1)!.cuando };
    })
    .sort((a, b) => b.ultima.localeCompare(a.ultima));
}

/**
 * Las decisiones que el director pide en una parte de un documento: cada una se responde aparte, con su propio
 * comentario o audio, y aparece una sola vez, al final de la parte que la explica (sin un resumen al final del
 * documento que las repita). Una parte tiene decisiones si dice «Para decidir», si su título habla de decidir o si lleva
 * la marca <!-- decisiones -->; sus decisiones son los puntos de su última lista numerada. Devuelve el nombre de cada
 * una: su número y lo que va en negrilla al empezar (o el comienzo del texto).
 */
export function decisionesDe(titulo: string, md: string): string[] {
  if (!/decid/i.test(titulo) && !/para decidir/i.test(md) && !md.includes('<!-- decisiones -->')) return [];
  // Con «Para decidir», solo cuenta la lista que va después: la de antes es parte de la explicación
  const desde = md.search(/para decidir/i);
  const texto = desde >= 0 && !/decid/i.test(titulo) ? md.slice(desde) : md;
  const listas: string[][] = [];
  let actual: string[] | null = null;
  for (const linea of texto.split(/\r?\n/)) {
    const m = /^(\d+)\.\s+(.*)$/.exec(linea);
    if (m) {
      if (!actual) listas.push((actual = []));
      const negrilla = /^\*\*(.+?)\*\*/.exec(m[2]);
      const nombre = (negrilla ? negrilla[1] : m[2]).replace(/[*_`]/g, '').replace(/[.,:;]\s*$/, '').trim();
      actual.push(`${m[1]}. ${nombre.length > 80 ? `${nombre.slice(0, 77)}…` : nombre}`);
    } else if (actual && linea.trim() && !/^\s/.test(linea)) {
      actual = null; // terminó esa lista numerada
    }
  }
  return listas.at(-1) ?? [];
}

/** Cómo responde una nota a una decisión de un documento (`Nota › sobre › postura`). */
export const POSTURAS = ['aprueba', 'decide', 'comenta'] as const;
export type Postura = (typeof POSTURAS)[number];

/** ¿Esta nota responde una decisión de un documento? Un comentario sobre ella (`comenta`) la deja abierta. */
export const decideDecision = (n: Nota) => n.sobre?.tipo === 'documento' && !!n.sobre.decision && n.sobre.postura !== 'comenta';

/** Una nota para el director (escrita o grabada): sobre una misión, un paso, una propuesta, una parte de un documento… */
export interface Nota {
  id: string;
  cuando: string;
  quien: string;
  /**
   * `seccion`: la parte (de un documento, un paso de una misión, un frente del diagnóstico). `decision`: a cuál de las
   * decisiones de esa parte responde. `fragmento`: el comienzo de la idea de esa parte (un párrafo, un punto) que comenta.
   * `postura`, en una decisión: `aprueba` (de acuerdo con lo que recomienda el director, con un clic), `decide` (otra
   * cosa, la que dice la nota) o `comenta` (una duda o un comentario que no la decide). Sin postura, la nota la responde.
   * `aclarar`, en un paso de una misión: «No lo entiendo, explícamelo mejor» (un clic); el director lo atiende al
   * instante, sin el resto de la revisión, y reescribe ese paso con más detalle. `eleccion`, en un paso con `opciones`:
   * la opción que eligió con un clic (el paso queda hecho). `hazlo`, en un paso con `hazlo`: le encargó el paso al
   * director («Hazlo tú», confirmado); el paso queda hecho y el director lo hace en su revisión siguiente.
   */
  sobre: { tipo: TipoSobre; id?: string; seccion?: string; decision?: string; fragmento?: string; postura?: Postura; aclarar?: boolean; eleccion?: string; hazlo?: boolean };
  texto?: string;
  /** Ruta del audio en este repositorio (proyectos/<id>/director/notas/…). */
  audio?: string;
  /** De quién es (lo pone unirEstados según el archivo de donde viene): filtra el Estudio por persona. */
  de?: Persona;
  /**
   * Si quien la deja pide prioridad (una casilla: el porqué ya va en la nota). Pide la revisión al instante; el director
   * decide si lo es. Las notas viejas guardaban aquí, como texto, por qué no podía esperar.
   */
  urgente?: boolean | string;
  /** Imágenes y archivos que acompañan la nota (pegados, arrastrados o adjuntados), junto a los audios. */
  adjuntos?: Adjunto[];
}

/** Un archivo adjunto a una nota: dónde quedó en la memoria del proyecto y cómo se llamaba. */
export interface Adjunto {
  /** Ruta en este repositorio (proyectos/<id>/director/notas/…). */
  ruta: string;
  nombre: string;
  bytes: number;
}

/** Lo que pesa como máximo cada adjunto: lo que entra a la historia de git se queda. */
export const MAX_ADJUNTO = 10 * 1024 * 1024;
/** Cuántos adjuntos puede llevar una nota. */
export const MAX_ADJUNTOS = 8;
/** Dónde quedan los adjuntos: en la carpeta de notas del proyecto, con su id y una extensión simple. */
export const RUTA_ADJUNTO = /^proyectos\/[a-z0-9-]+\/director\/notas\/adjuntos\/[\w-]+\.[a-z0-9]{1,8}$/;
/** Las imágenes que el Studio muestra en miniatura (y sirve tal cual); el resto se descarga. */
export const esImagen = (ruta: string) => /\.(png|jpe?g|gif|webp)$/i.test(ruta);

/** Las notas urgentes de los últimos 7 días: el Studio las cuenta para que no se vuelvan costumbre. */
export function urgenciasDeLaSemana(notas: Nota[], ahora = Date.now()): Nota[] {
  return notas.filter((n) => n.urgente && ahora - Date.parse(n.cuando) < 7 * 86_400_000);
}

export interface EstadoDirector {
  actualizado: string;
  /** Las decisiones finales del titular sobre los criterios (mandan sobre la evaluación del director). */
  marcas: Record<string, Marca>;
  cierres: Record<string, Firma>;
  excepciones: Excepcion[];
  validaciones: Validacion[];
  propuestas: Record<string, Firma & { estado: RespuestaPropuesta }>;
  empezadas: Record<string, { cuando: string; quien: string }>;
  entregas: Record<string, Entrega>;
  notas: Nota[];
  bitacora: { fecha: string; quien: string; texto: string }[];
  /**
   * Los pasos de cada misión que su persona ya marcó como hechos (por su número, desde 0). Viajan con lo demás, así el
   * director los ve y nunca vuelve a pedir ni a nombrar como pendiente algo que ya se marcó.
   */
  pasos?: Record<string, PasosMarcados>;
  /**
   * Las partes de cada documento que su lector ya marcó como leídas, por `claveLeido(persona, ruta)`. Es solo una
   * bandera: no impide comentar ni mueve nada. Con todas marcadas (`completo`), el paso de la misión que pedía leerlo
   * queda hecho y se abre el documento siguiente.
   */
  leidos?: Record<string, PartesLeidas>;
}

export interface PasosMarcados {
  hechos: number[];
  cuando: string;
  quien: string;
}

/**
 * Los pasos marcados a mano de algo que pasa fuera del Studio (correr un comando, probar algo): el Studio no ve que se
 * hicieron, así que el director los comprueba con evidencia en su revisión antes de darlos por hechos. Los que el
 * Studio marca solo (`hecho`), una elección (`opciones`), un encargo al director (`hazlo`) o una orden que el Studio
 * comprobó al marcarla (`comprobar`) ya traen su prueba.
 */
export function pasosPorComprobar(m: { pasos: Paso[] }, hechos: number[]): number[] {
  return hechos.filter((i) => {
    const p = m.pasos[i];
    return p !== undefined && (typeof p === 'string' || (!p.hecho && !p.opciones?.length && p.hazlo === undefined && !p.comprobar));
  });
}

export interface PartesLeidas {
  /** Los títulos de las partes (`##`) marcadas; la entrada del documento es ''. */
  partes: string[];
  /** Las ideas de cada parte que ya marcó como entendidas: `claveIdea(parte, texto)` (antes, `claveTrozo(parte, número)`). */
  trozos?: string[];
  completo?: boolean;
  cuando: string;
  quien: string;
}

/** La clave de lo leído: cada persona marca lo suyo. */
export const claveLeido = (persona: Persona, ruta: string) => `${persona}:${ruta}`;
/** La clave vieja de una idea de una parte: el título de la parte y su número (desde 0). Se respeta al leer. */
export const claveTrozo = (parte: string, i: number) => `${parte}§${i}`;

/** Una huella corta de un texto (sin contar los espacios): si el texto cambia, cambia. */
const huellaTexto = (texto: string) => {
  let h = 5381;
  for (const c of texto.replace(/\s+/g, ' ').trim()) h = ((h << 5) + h + c.codePointAt(0)!) | 0;
  return (h >>> 0).toString(36);
};

/**
 * La clave de una idea entendida: el título de su parte y la huella de lo que dice. Si el director la reescribe, la
 * marca ya no le sirve y vuelve a quedar por leer; si cambia el orden, las demás conservan la suya.
 */
export const claveIdea = (parte: string, md: string) => `${parte}§h:${huellaTexto(md)}`;

/**
 * Cómo está cada idea de una parte para quien la lee: `entendida` (por la huella de su texto o, si es una marca de
 * antes, por su número) y `cambio`: no está entendida, pero ya se había leído más allá (otra idea posterior entendida)
 * o la parte entera se dio por leída idea por idea. Es una idea que el director reescribió o agregó después de esa
 * lectura. Las decisiones y los rótulos no se marcan aquí (una decisión se atiende respondiéndola).
 */
export function estadoIdeas(parte: string, md: string, marcas: Iterable<string>, leida = false): { entendida: boolean[]; cambio: boolean[] } {
  const hay = new Set(marcas);
  const lista = trozosDeParte(parte, md);
  const idea = (t: Trozo) => t.tipo !== 'rotulo' && !t.decision;
  // Una idea que antes eran varias (se juntaron) queda entendida si todas sus piezas ya lo estaban
  const marcada = (t: Trozo, i: number) =>
    hay.has(claveIdea(parte, t.md)) || hay.has(claveTrozo(parte, i)) || (!!t.piezas && t.piezas.every((p) => hay.has(claveIdea(parte, p))));
  const entendida = lista.map((t, i) => idea(t) && marcada(t, i));
  // Una parte leída de a una idea deja huellas; leída entera con su estrella (o con marcas de antes), no se reabre
  const conHuellas = [...hay].some((x) => x.startsWith(`${parte}§h:`));
  const cambio = lista.map((t, i) => idea(t) && !entendida[i] && ((leida && conHuellas) || entendida.some((e, j) => e && j > i)));
  return { entendida, cambio };
}

/**
 * Pasa las marcas de antes (por número) a la huella de lo que dicen hoy las ideas de esas partes, y deja todo lo
 * demás igual. Así una marca vieja ya no se corre si después se agrega o se quita una idea.
 */
export function marcasAlDia(partes: { titulo: string; md: string }[], marcas: Iterable<string>): string[] {
  const hay = new Set(marcas);
  for (const s of partes) {
    trozosDeParte(s.titulo, s.md).forEach((t, i) => {
      if (!hay.has(claveTrozo(s.titulo, i))) return;
      hay.delete(claveTrozo(s.titulo, i));
      if (t.tipo !== 'rotulo' && !t.decision) hay.add(claveIdea(s.titulo, t.md));
    });
  }
  return [...hay];
}

/**
 * Una idea de una parte de un documento: lo que se lee, se marca como entendido o se responde de a una. `rotulo`: una
 * línea corta que solo presenta lo que sigue («**Para decidir:**»), que no se marca. `decision`: el nombre de la decisión
 * (como en `decisionesDe`) si es un punto de la lista que se decide; se atiende respondiéndola.
 */
export interface Trozo {
  md: string;
  tipo: 'parrafo' | 'punto' | 'bloque' | 'rotulo';
  decision?: string;
  /** Si se juntó (un párrafo que anuncia una lista o un bloque), lo que eran sus ideas antes: sus marcas se respetan. */
  piezas?: string[];
}

/** Hasta cuántos caracteres un párrafo es demasiado corto para ser una idea aparte. */
const CORTO = 140;
/** Hasta cuántos caracteres (unos 10 renglones) un párrafo que anuncia una lista se lee junto con la lista entera. */
const LARGO = 900;

/**
 * Parte una parte de un documento (sin su título `##`) en ideas, para leerla y asimilarla de a una: cada párrafo, cada
 * punto de una lista de primer nivel (con lo que lleva adentro), y cada tabla, cita o bloque de código. Un párrafo muy
 * corto se junta con su vecino. Los puntos de la lista de decisiones (la última numerada, si la parte pide decidir)
 * llevan su nombre.
 */
export function trozosDeParte(titulo: string, md: string): Trozo[] {
  const trozos: (Trozo & { lista?: number; ordenada?: boolean })[] = [];
  const lineas = md.split(/\r?\n/);
  const item = /^ ?([-*+]|\d+[.)])\s+/; // de primer nivel: con más sangría, va dentro del punto anterior
  let i = 0;
  let listas = 0;
  let enLista: number | null = null; // la lista abierta (para saber cuáles puntos van juntos)
  while (i < lineas.length) {
    const l = lineas[i];
    if (!l.trim() || /^##\s/.test(l) || /^\s*<!--.*-->\s*$/.test(l) || /^ {0,3}([-*_])( *\1){2,}\s*$/.test(l)) {
      // Un renglón vacío no cierra la lista: la cierra lo que venga sin sangría y sin ser un punto
      i++;
      continue;
    }
    if (/^ {0,3}(```|~~~)/.test(l)) {
      const cierre = l.trim().slice(0, 3);
      let j = i + 1;
      while (j < lineas.length && !lineas[j].trim().startsWith(cierre)) j++;
      trozos.push({ md: lineas.slice(i, j + 1).join('\n'), tipo: 'bloque' });
      enLista = null;
      i = j + 1;
      continue;
    }
    if (/^\s*\|/.test(l) || /^ {0,3}>/.test(l)) {
      const tabla = /^\s*\|/.test(l);
      let j = i;
      while (j < lineas.length && (tabla ? /^\s*\|/.test(lineas[j]) : lineas[j].trim() && !/^\s*$/.test(lineas[j]))) j++;
      trozos.push({ md: lineas.slice(i, j).join('\n'), tipo: 'bloque' });
      enLista = null;
      i = j;
      continue;
    }
    const m = item.exec(l);
    if (m) {
      const ordenada = /\d/.test(m[1]);
      const anterior = enLista !== null ? [...trozos].reverse().find((t) => t.lista === enLista) : undefined;
      if (enLista === null || anterior?.ordenada !== ordenada) enLista = ++listas;
      // El punto sigue en las líneas con sangría (o pegadas a él) hasta el siguiente punto o lo que venga sin sangría
      let j = i + 1;
      while (j < lineas.length) {
        const s = lineas[j];
        if (item.test(s)) break;
        if (!s.trim()) {
          const prox = lineas.slice(j + 1).find((x) => x.trim());
          if (!prox || !/^\s{2,}/.test(prox)) break;
        } else if (!/^\s/.test(s) && !lineas[j - 1].trim()) break;
        j++;
      }
      trozos.push({ md: lineas.slice(i, j).join('\n').trimEnd(), tipo: 'punto', lista: enLista, ordenada });
      i = j;
      continue;
    }
    // Un párrafo: hasta el renglón vacío o hasta que empiece otra cosa
    let j = i + 1;
    while (j < lineas.length && lineas[j].trim() && !item.test(lineas[j]) && !/^ {0,3}(```|~~~|>|\|)/.test(lineas[j]) && !/^##\s/.test(lineas[j])) j++;
    const texto = lineas.slice(i, j).join('\n');
    const plano = texto.replace(/[*_`]/g, '').trim();
    trozos.push({ md: texto, tipo: plano.length <= 60 && /:$/.test(plano) ? 'rotulo' : 'parrafo' });
    enLista = null;
    i = j;
  }
  // Las decisiones: los puntos de la última lista numerada, si la parte pide decidir
  const decisiones = decisionesDe(titulo, md);
  const ultima = decisiones.length ? [...trozos].reverse().find((t) => t.ordenada)?.lista : undefined;
  // Un párrafo que termina en «:» anuncia lo que sigue: cortado ahí no se entiende. Va con su lista (entera, si es
  // corta; si no, con su primer punto) o con su tabla o bloque. La lista de decisiones no: la presenta su rótulo.
  // Un rótulo («Un boceto:») también: así una lista corta se lee de una vez.
  for (let k = 0; k < trozos.length - 1; k++) {
    const t = trozos[k];
    const sig = trozos[k + 1];
    if ((t.tipo !== 'parrafo' && t.tipo !== 'rotulo') || !/:$/.test(t.md.replace(/[*_`]/g, '').trim()) || sig.tipo === 'rotulo' || sig.tipo === 'parrafo') continue;
    if (sig.lista !== undefined && sig.lista === ultima) continue;
    let hasta = k + 1;
    if (sig.lista !== undefined) {
      let fin = k + 1;
      while (trozos[fin + 1]?.lista === sig.lista) fin++;
      const largo = trozos.slice(k, fin + 1).reduce((n, x) => n + x.md.length, 0);
      if (largo <= LARGO) hasta = fin;
    }
    const juntos = trozos.slice(k, hasta + 1);
    trozos.splice(k, juntos.length, { ...sig, md: juntos.map((x) => x.md).join('\n\n'), piezas: juntos.filter((x) => x.tipo !== 'rotulo').map((x) => x.md) });
  }
  // Un párrafo de una línea que no dice nada por sí solo (una transición, un aviso) no es una idea aparte: va con el
  // párrafo de antes o, si no lo hay, con el de después. Detenerse a marcarlo no vale la pena.
  for (let k = 0; k < trozos.length; k++) {
    const t = trozos[k];
    if (t.tipo !== 'parrafo' || t.md.replace(/[*_`]/g, '').trim().length > CORTO) continue;
    const antes = trozos[k - 1];
    const despues = trozos[k + 1];
    if (antes?.tipo === 'parrafo') antes.md = `${antes.md}\n\n${t.md}`;
    else if (despues?.tipo === 'parrafo') despues.md = `${t.md}\n\n${despues.md}`;
    else continue;
    trozos.splice(k--, 1);
  }
  if (ultima) {
    trozos.filter((t) => t.lista === ultima).forEach((t, k) => {
      if (decisiones[k]) t.decision = decisiones[k];
    });
  }
  return trozos.map(({ md, tipo, decision, piezas }) => ({ md, tipo, ...(decision ? { decision } : {}), ...(piezas ? { piezas } : {}) }));
}

/**
 * Lo que escribe una persona del equipo (proyectos/<id>/director/equipo/<persona>.json): cada Estudio escribe solo el suyo,
 * así los computadores guardan sus cambios sin chocar nunca. Lo de otra persona que el titular retira (cerrar una
 * excepción, borrar una nota o una validación, retirar una entrega) va en sus `retirados`, por id.
 */
export interface EstadoPersona extends EstadoDirector {
  retirados: Record<string, Firma>;
}

export const estadoVacio = (): EstadoDirector => ({
  actualizado: '',
  marcas: {},
  cierres: {},
  excepciones: [],
  validaciones: [],
  propuestas: {},
  empezadas: {},
  entregas: {},
  notas: [],
  bitacora: [],
  pasos: {},
  leidos: {},
});

export const estadoPersonaVacio = (): EstadoPersona => ({ ...estadoVacio(), retirados: {} });

/** La clave con la que se retira una entrega de otra persona (una entrega nueva de la misma misión no queda retirada). */
export const claveEntrega = (mision: string, cuando: string) => `entrega:${mision}:${cuando}`;

/**
 * El estado del equipo: une lo de cada persona. Las decisiones del titular (criterios, puertas, propuestas) solo valen
 * de su archivo; las listas se juntan por fecha; de una misión entregada por dos personas vale la entrega más reciente;
 * y lo que se retiró no se muestra (o, si es una excepción, queda cerrada).
 */
export function unirEstados(porPersona: Record<Persona, Partial<EstadoPersona> | undefined>): EstadoDirector {
  const todos = Object.entries(porPersona).map(([id, e]) => [id, { ...estadoPersonaVacio(), ...(e ?? {}) }] as const);
  const t = todos.find(([id]) => id === TITULAR)?.[1] ?? estadoPersonaVacio();
  const retirados: Record<string, Firma> = {};
  for (const [id, e] of todos) if (id !== TITULAR) Object.assign(retirados, e.retirados);
  Object.assign(retirados, t.retirados);
  const vigente = (id: string) => !retirados[id];
  const porCuando = <T extends { cuando: string }>(a: T, b: T) => a.cuando.localeCompare(b.cuando);
  const porFecha = <T extends { fecha: string }>(a: T, b: T) => a.fecha.localeCompare(b.fecha);
  const entregas: Record<string, Entrega> = {};
  const empezadas: EstadoDirector['empezadas'] = {};
  const pasos: Record<string, PasosMarcados> = {};
  const leidos: Record<string, PartesLeidas> = {};
  for (const [quien, e] of todos) {
    // De los pasos de una misión vale lo último que se marcó
    for (const [id, x] of Object.entries(e.pasos ?? {})) if (!pasos[id] || pasos[id].cuando < x.cuando) pasos[id] = x;
    // Lo leído, solo de cada quien en su archivo
    for (const [clave, x] of Object.entries(e.leidos ?? {})) if (clave.startsWith(`${quien}:`)) leidos[clave] = x;
    for (const [id, x] of Object.entries(e.entregas)) {
      if (!vigente(claveEntrega(id, x.cuando))) continue;
      if (!entregas[id] || entregas[id].cuando < x.cuando) entregas[id] = x;
    }
    for (const [id, x] of Object.entries(e.empezadas)) if (!empezadas[id] || empezadas[id].cuando < x.cuando) empezadas[id] = x;
  }
  return {
    actualizado: todos.map(([, e]) => e.actualizado).sort().at(-1) ?? '',
    marcas: t.marcas,
    cierres: t.cierres,
    propuestas: t.propuestas,
    excepciones: todos
      .flatMap(([, e]) => e.excepciones)
      .map((x) => (retirados[x.id] && !x.cerrada ? { ...x, cerrada: retirados[x.id] } : x))
      .sort(porFecha),
    validaciones: todos.flatMap(([, e]) => e.validaciones).filter((v) => vigente(v.id)).sort(porFecha),
    empezadas,
    entregas,
    notas: todos
      .flatMap(([id, e]) => e.notas.map((n) => ({ ...n, de: id })))
      .filter((n) => vigente(n.id))
      .sort(porCuando),
    bitacora: todos.flatMap(([, e]) => e.bitacora).sort(porFecha),
    pasos,
    leidos,
  };
}

// ───────────────────────────────────────────────────────────── señales

/** Un commit repartido entre frentes (los pesos suman 1), con quién lo hizo si es del equipo. */
export interface CommitFrentes {
  fecha: string;
  frentes: Record<string, number>;
  autor?: Persona;
}

export interface Senales {
  /** Del proyecto: si ya hay un objetivo firmado. */
  proyecto?: { objetivo: boolean };
  /** Del repositorio del proyecto: los commits de los últimos días; y de este Estudio, cuántas decisiones hubo. */
  esfuerzo?: { desde: string; hasta: string; commits: CommitFrentes[]; decisiones: number };
}

// ───────────────────────────────────────────────────────────── el arranque: del repositorio a la ruta

export type EtapaArranque = 'conectar' | 'contar' | 'diagnostico' | 'objetivo' | 'ruta' | 'en_marcha';

/** ¿Ya contó el titular lo que necesita el director para plantear un proyecto nuevo? */
export const proyectoContado = (p: Proyecto) => !!(p.contexto?.trim() && p.metaInicial?.trim() && p.terminado?.trim());

/**
 * En qué va el arranque del proyecto. Existente: conectar el repositorio, esperar el diagnóstico del director, firmar el
 * objetivo y esperar la ruta. Nuevo: contar el proyecto (explicación, objetivo y cuándo está completo), esperar el
 * planteamiento del director (que se guarda como su diagnóstico), firmar el objetivo y esperar la ruta. Con la ruta
 * trazada (más de una fase), el proyecto está en marcha. `conectado` es si este computador ya sabe dónde está el
 * repositorio (otro computador del equipo pudo haberlo conectado antes).
 */
export function etapaArranque(plan: Plan, proyecto: Proyecto, conectado: boolean): EtapaArranque {
  if (!plan.diagnostico?.fecha) {
    if (proyecto.tipo === 'nuevo') return proyectoContado(proyecto) ? 'diagnostico' : 'contar';
    return conectado ? 'diagnostico' : 'conectar';
  }
  if (!proyecto.objetivo?.firmado) return 'objetivo';
  if (plan.fases.length <= 1) return 'ruta';
  return 'en_marcha';
}

// ───────────────────────────────────────────────────────────── fases

/** La fase en curso: la primera cuya puerta no se ha cerrado (si todas, la última). */
export function faseActual(plan: Plan, estado: EstadoDirector): Fase {
  return plan.fases.find((f) => !estado.cierres[f.id]) ?? plan.fases[plan.fases.length - 1];
}

export type Situacion = 'superada' | 'actual' | 'futura';

export function situacion(plan: Plan, estado: EstadoDirector, faseId: string): Situacion {
  const actual = plan.fases.indexOf(faseActual(plan, estado));
  const i = plan.fases.findIndex((f) => f.id === faseId);
  if (estado.cierres[faseId] && i !== actual) return 'superada';
  return i === actual ? 'actual' : i < actual ? 'superada' : 'futura';
}

/** Lo que un frente hace en una fase (en espera si el plan no lo nombra). */
export function trabajoDe(fase: Fase, frente: string): TrabajoFrente {
  return fase.frentes[frente] ?? { nivel: 'espera', que: 'Esta fase no lo nombra: espera.' };
}

// ───────────────────────────────────────────────────────────── criterios e indicadores

export interface Contexto {
  plan: Plan;
  estado: EstadoDirector;
  senales: Senales;
}

const pct = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 1000) / 10 : 0);

/** El valor de un indicador para un criterio de una fase (null si no hay datos con qué medirlo). */
export function valorIndicador(c: Criterio, fase: Fase, ctx: Contexto): number | null {
  const { plan, estado, senales } = ctx;
  switch (c.indicador) {
    case 'validaciones_personas':
    case 'validaciones_logran':
    case 'validaciones_aprueban': {
      const vs = estado.validaciones.filter((v) => v.fase === fase.id && (!c.tipos?.length || c.tipos.includes(v.tipo)));
      const personas = vs.reduce((s, v) => s + v.personas, 0);
      if (c.indicador === 'validaciones_personas') return personas;
      if (!personas) return 0;
      return pct(vs.reduce((s, v) => s + (c.indicador === 'validaciones_logran' ? v.lograron : v.aprueban), 0), personas);
    }
    case 'diagnostico':
      return plan.diagnostico?.fecha ? 100 : 0;
    case 'objetivo':
      return senales.proyecto ? (senales.proyecto.objetivo ? 100 : 0) : null;
    case 'misiones': {
      const ms = plan.misiones.filter((m) => (c.ids?.length ? c.ids.includes(m.id) : m.fase === fase.id));
      if (!ms.length) return null;
      return pct(ms.filter((m) => estadoMision(m, plan, estado) === 'aprobada').length, ms.length);
    }
    case 'foco': {
      if (!senales.esfuerzo) return null;
      return repartoPorNivel(fase, senales.esfuerzo.commits).foco;
    }
    default:
      return null;
  }
}

export const enNumero = (c: Criterio) => !!c.indicador && EN_NUMERO.includes(c.indicador);

export interface Evaluacion {
  cumplido: boolean;
  /**
   * Por qué: la decisión final del titular, la evaluación del director, el indicador que llegó a su meta, o nada aún.
   * `no_aplica` vale para los dos.
   */
  por: 'titular' | 'director' | 'no_aplica' | 'indicador' | null;
  valor: number | null;
  /** De 0 a 1, para la barra. */
  avance: number;
  marca?: Marca;
  evaluacion?: EvaluacionCriterio;
}

export function evaluar(c: Criterio, fase: Fase, ctx: Contexto): Evaluacion {
  const marca = ctx.estado.marcas[c.id];
  const evaluacion = ctx.plan.evaluacion?.[c.id];
  const valor = c.indicador ? valorIndicador(c, fase, ctx) : null;
  const meta = c.meta ?? (enNumero(c) ? 1 : 100);
  const llega = valor !== null && valor >= meta;
  if (marca) return { cumplido: true, por: marca.estado === 'no_aplica' ? 'no_aplica' : 'titular', valor, avance: 1, marca };
  if (llega) return { cumplido: true, por: 'indicador', valor, avance: 1 };
  if (evaluacion) return { cumplido: true, por: evaluacion.estado === 'no_aplica' ? 'no_aplica' : 'director', valor, avance: 1, evaluacion };
  return { cumplido: false, por: null, valor, avance: valor === null ? 0 : Math.max(0, Math.min(1, valor / meta)) };
}

// ───────────────────────────────────────────────────────────── misiones

/**
 * Dónde va una misión: `bloqueada` si es de una fase futura; `pendiente` o `en_curso`; `entregada` mientras espera al
 * director; `aprobada` o `rehacer` según su veredicto sobre la última entrega (una entrega nueva vuelve a esperarlo).
 */
export type EstadoMision = 'bloqueada' | 'pendiente' | 'en_curso' | 'entregada' | 'aprobada' | 'rehacer';

export function estadoMision(m: Mision, plan: Plan, estado: EstadoDirector): EstadoMision {
  const revision = plan.revisiones?.[m.id];
  const entrega = estado.entregas[m.id];
  if (revision && (!entrega || entrega.cuando <= revision.cuando)) return revision.veredicto;
  if (entrega) return 'entregada';
  if (situacion(plan, estado, m.fase) === 'futura') return 'bloqueada';
  return estado.empezadas[m.id] ? 'en_curso' : 'pendiente';
}

export const ABIERTAS: EstadoMision[] = ['rehacer', 'en_curso', 'pendiente'];

/** Las misiones abiertas de una persona, en el orden del director (lo que hay que rehacer va primero). */
export function misionesAbiertas(plan: Plan, estado: EstadoDirector, persona: Persona): Mision[] {
  const abiertas = plan.misiones.filter((m) => m.para === persona && ABIERTAS.includes(estadoMision(m, plan, estado)));
  return [...abiertas.filter((m) => estadoMision(m, plan, estado) === 'rehacer'), ...abiertas.filter((m) => estadoMision(m, plan, estado) !== 'rehacer')];
}

/** La experiencia de una persona: la de sus misiones aprobadas. */
export function xpDe(plan: Plan, estado: EstadoDirector, persona: Persona): number {
  return plan.misiones.filter((m) => m.para === persona && estadoMision(m, plan, estado) === 'aprobada').reduce((s, m) => s + m.xp, 0);
}

const XP_POR_NIVEL = 100;
export function nivelDe(xp: number): { nivel: number; enNivel: number; paraSubir: number } {
  return { nivel: Math.floor(xp / XP_POR_NIVEL) + 1, enNivel: xp % XP_POR_NIVEL, paraSubir: XP_POR_NIVEL };
}

/** La nota de foco de la semana: cuánto del esfuerzo fue a los frentes en foco de la fase. */
export function notaFoco(focoPct: number): NotaBoletin {
  return focoPct >= 70 ? 'A' : focoPct >= 55 ? 'B' : focoPct >= 40 ? 'C' : focoPct >= 25 ? 'D' : 'F';
}

/** ¿Es una ruta de documento que el Estudio deja leer y comentar? (docs/… de aquí, o repo:… del proyecto). */
export function esDocumento(ruta: string): boolean {
  return !ruta.includes('..') && (/^docs\/[\w./-]+\.md$/i.test(ruta) || /^repo:[\w./-]+\.md$/i.test(ruta));
}

/** Los documentos que pide una misión: los de sus pasos (en orden) y los de su lista. */
export function documentosDeMision(m: Mision): string[] {
  const docs = [...m.pasos.flatMap((p) => (typeof p !== 'string' && p.ir?.doc ? [p.ir.doc] : [])), ...(m.documentos ?? [])];
  return [...new Set(docs)];
}

export type EstadoDocumento = 'siguiente' | 'pendiente' | 'revisado';

export interface DocumentoEnRuta {
  ruta: string;
  estado: EstadoDocumento;
  /** La misión que lo pide ahora (o la última que lo pidió, si ya se revisó). */
  mision: Mision;
}

const misionAbierta = (m: Mision, plan: Plan, estado: EstadoDirector) => ABIERTAS.includes(estadoMision(m, plan, estado));

/**
 * Los documentos de una persona en el orden en que el director quiere que los lea, que es el de sus misiones: el
 * siguiente primero, los pendientes en orden y al final los ya revisados. Siempre hacia adelante: un documento
 * revisado queda sellado y nunca vuelve a la lista; si algo cambia, el director escribe un documento nuevo con lo que
 * cambió y lo pone como el paso siguiente.
 */
export function documentosEnOrden(plan: Plan, estado: EstadoDirector, persona: Persona): DocumentoEnRuta[] {
  const misiones = plan.misiones.filter((m) => m.para === persona && estadoMision(m, plan, estado) !== 'bloqueada');
  const rutas = [...new Set(misiones.flatMap(documentosDeMision))];
  const filas = rutas.map((ruta) => {
    const delDoc = misiones.filter((m) => documentosDeMision(m).includes(ruta));
    // Si ya lo revisó en una misión hecha, queda sellado aunque otra misión posterior lo nombre
    const hechas = delDoc.filter((m) => !misionAbierta(m, plan, estado));
    const abierta = delDoc.find((m) => misionAbierta(m, plan, estado));
    const mision = hechas.length ? hechas[hechas.length - 1] : abierta!;
    const estadoDoc: EstadoDocumento = hechas.length ? 'revisado' : 'pendiente';
    return { ruta, estado: estadoDoc as EstadoDocumento, mision, orden: misiones.indexOf(mision) };
  });
  filas.sort((a, b) => Number(a.estado === 'revisado') - Number(b.estado === 'revisado') || a.orden - b.orden);
  const primera = filas.find((f) => f.estado === 'pendiente');
  if (primera) primera.estado = 'siguiente';
  return filas.map(({ ruta, estado: e, mision }) => ({ ruta, estado: e, mision }));
}

/** Dónde va la lectura: lo leído, el que se lee ahora, los que se abren después y los ya revisados (sellados). */
export type EstadoLectura = 'leido' | 'siguiente' | 'despues' | 'revisado';

/**
 * Una cosa a la vez también al leer: de los documentos en orden, solo se abre el primero que falta leer; los que vienen
 * después se ven, pero no se abren hasta terminarlo (así no se empieza a leer lo de más adelante). Los ya leídos y los
 * revisados siguen abiertos para consultarlos.
 */
export function enLectura(filas: DocumentoEnRuta[], leido: (ruta: string) => boolean): (DocumentoEnRuta & { lectura: EstadoLectura })[] {
  let hayActivo = false;
  return filas.map((f) => {
    if (f.estado === 'revisado') return { ...f, lectura: 'revisado' as const };
    if (leido(f.ruta)) return { ...f, lectura: 'leido' as const };
    const lectura: EstadoLectura = hayActivo ? 'despues' : 'siguiente';
    hayActivo = true;
    return { ...f, lectura };
  });
}

/**
 * Las partes de un documento que se marcan como leídas: cada `##` (por su título, sin formato). La entrada (el título y
 * la línea de quién y cuándo) no se marca ni se comenta: no hay nada que leer ahí. Solo si el documento no tiene ningún
 * `##`, la entrada es la única parte, para que se pueda terminar de leer.
 */
export function partesDeDocumento(texto: string): string[] {
  const partes: { titulo: string; cuerpo: string }[] = [{ titulo: '', cuerpo: '' }];
  let enCodigo = false;
  for (const linea of texto.split(/\r?\n/)) {
    if (/^```/.test(linea)) enCodigo = !enCodigo;
    const h2 = !enCodigo && /^##\s+(.+)$/.exec(linea);
    if (h2) partes.push({ titulo: h2[1].replace(/[*_`#>\[\]]/g, '').replace(/\(([^)]*)\)/g, '').trim(), cuerpo: '' });
    else if (enCodigo || !/^#\s/.test(linea)) partes[partes.length - 1].cuerpo += linea.trim();
  }
  if (partes.length === 1) return partes[0].cuerpo ? [''] : [];
  return partes.slice(1).filter((p) => p.titulo).map((p) => p.titulo);
}

/**
 * El freno del director: los documentos que alguien ya revisó (su misión está entregada o aprobada) y que cambiaron
 * después. No deberían cambiar: lo que cambie va en un documento nuevo. `cambiado` es la fecha (ISO) del último cambio.
 */
export function selladosQueCambiaron(plan: Plan, estado: EstadoDirector, cambiado: Record<string, string>): { ruta: string; persona: Persona; mision: Mision }[] {
  const salida: { ruta: string; persona: Persona; mision: Mision }[] = [];
  for (const m of plan.misiones) {
    if (misionAbierta(m, plan, estado) || estadoMision(m, plan, estado) === 'bloqueada') continue;
    const hecha = estado.entregas[m.id]?.cuando ?? plan.revisiones?.[m.id]?.cuando ?? '';
    for (const ruta of documentosDeMision(m)) if (hecha && cambiado[ruta] && cambiado[ruta] > hecha) salida.push({ ruta, persona: m.para, mision: m });
  }
  return salida;
}

/** Lo que espera al director: entregas sin veredicto y notas sin respuesta. */
export function pendientesDelDirector(plan: Plan, estado: EstadoDirector): { entregas: Mision[]; notas: Nota[] } {
  return {
    entregas: plan.misiones.filter((m) => estadoMision(m, plan, estado) === 'entregada'),
    notas: estado.notas.filter((n) => !plan.respuestas?.[n.id]),
  };
}

/** Lo de un proyecto para «Tu agenda»: qué espera de una persona y qué espera al director. */
export interface Agenda {
  /** La misión de ahora de esa persona (la primera abierta), si la hay. */
  mision: { id: string; titulo: string; rehacer: boolean } | null;
  /** Cuántas misiones más tiene en cola. */
  enCola: number;
  /** Propuestas de la fase en curso (o anteriores) sin responder: solo las decide el titular. */
  porDecidir: number;
  /** Propuestas aceptadas que el director aún no ejecuta. */
  porEjecutar: number;
  /** Entregas y notas que esperan al director. */
  alDirector: number;
}

export function agendaDe(plan: Plan, estado: EstadoDirector, persona: Persona): Agenda {
  const abiertas = misionesAbiertas(plan, estado, persona);
  const actual = plan.fases.indexOf(faseActual(plan, estado));
  const abiertasFase = plan.propuestas.filter((p) => plan.fases.findIndex((f) => f.id === p.fase) <= actual);
  const pend = pendientesDelDirector(plan, estado);
  const m = abiertas[0];
  return {
    mision: m ? { id: m.id, titulo: m.titulo, rehacer: estadoMision(m, plan, estado) === 'rehacer' } : null,
    enCola: Math.max(0, abiertas.length - 1),
    porDecidir: persona === TITULAR ? abiertasFase.filter((p) => !estado.propuestas[p.id]).length : 0,
    porEjecutar: plan.propuestas.filter((p) => estado.propuestas[p.id]?.estado === 'aceptada' && !plan.ejecutadas?.[p.id]).length,
    alDirector: pend.entregas.length + pend.notas.length,
  };
}

/**
 * «Dónde quedamos»: el brief que el director le da al titular cuando vuelve a un proyecto (lo primero que uno pregunta
 * después de un tiempo: cómo vamos, qué estábamos haciendo). Lo reescribe el director en cada revisión; el Studio le
 * suma lo nuevo desde la última visita y lleva a la misión de ahora.
 */
export interface Resumen {
  /** Cuándo lo escribió el director (ISO). */
  fecha: string;
  /** Lo que se avanzó en las últimas revisiones, en frases cortas. */
  avanzamos: string[];
  /** En qué quedamos, en una o dos frases. */
  quedamos: string;
  /**
   * Ya no se escribe ni se muestra: repetía lo avanzado. El resultado concreto (lo que se midió, se probó o se entregó)
   * va dentro de su línea de `avanzamos`. Queda opcional para leer los resúmenes viejos.
   */
  resultados?: string[];
  /**
   * Ya no se escribe ni se muestra: lo que espera del titular es su misión, y «Dónde quedamos» lo invita a ella en vez de
   * repetirlo. Queda opcional para leer los resúmenes viejos.
   */
  pendienteDeTi?: string[];
  /** Una sola línea, solo si hay una fecha límite o un riesgo activo: se ve también en la lista de proyectos. */
  alerta?: string;
}

export interface AvanceFase {
  cumplidos: number;
  total: number;
  /** De 0 a 1, con el avance parcial de los indicadores. */
  avance: number;
  pendientes: Criterio[];
}

export function avanceFase(fase: Fase, ctx: Contexto): AvanceFase {
  const ev = fase.criterios.map((c) => ({ c, e: evaluar(c, fase, ctx) }));
  const cumplidos = ev.filter((x) => x.e.cumplido).length;
  return {
    cumplidos,
    total: fase.criterios.length,
    avance: fase.criterios.length ? ev.reduce((s, x) => s + x.e.avance, 0) / fase.criterios.length : 1,
    pendientes: ev.filter((x) => !x.e.cumplido).map((x) => x.c),
  };
}

/** Por qué no se puede cerrar la puerta de una fase (vacío: se puede). */
export function bloqueosPuerta(fase: Fase, ctx: Contexto): string[] {
  const motivos: string[] = [];
  const i = ctx.plan.fases.indexOf(fase);
  const antes = ctx.plan.fases.slice(0, i).find((f) => !ctx.estado.cierres[f.id]);
  if (antes) motivos.push(`Antes hay que cerrar la puerta de «${antes.nombre}».`);
  if (ctx.estado.cierres[fase.id]) motivos.push('Esta puerta ya está cerrada.');
  const pend = avanceFase(fase, ctx).pendientes;
  if (pend.length) motivos.push(`Faltan ${pend.length === 1 ? 'un criterio' : `${pend.length} criterios`} al 100 %: ${pend.map((c) => `«${c.texto}»`).join(', ')}.`);
  return motivos;
}

// ───────────────────────────────────────────────────────────── esfuerzo

/** El frente de una ruta del repositorio del proyecto: el del prefijo más largo que la contiene ('otros' si ninguno). */
export function frenteDeRuta(plan: Plan, ruta: string): string {
  const r = ruta.replace(/\\/g, '/').replace(/^\.\//, '');
  let mejor = 'otros', largo = -1;
  for (const f of plan.frentes) {
    for (const p of f.rutas) if (r.startsWith(p) && p.length > largo) { mejor = f.id; largo = p.length; }
  }
  return mejor;
}

/** Reparte un commit entre frentes según cuántos de sus archivos son de cada uno. */
export function repartirCommit(plan: Plan, archivos: string[]): Record<string, number> {
  const pesos: Record<string, number> = {};
  for (const a of archivos) {
    const f = frenteDeRuta(plan, a);
    pesos[f] = (pesos[f] ?? 0) + 1 / archivos.length;
  }
  return pesos;
}

/** El esfuerzo de cada frente, en % de los commits. */
export function repartoPorFrente(commits: CommitFrentes[]): Record<string, number> {
  const suma: Record<string, number> = {};
  for (const c of commits) for (const [f, p] of Object.entries(c.frentes)) suma[f] = (suma[f] ?? 0) + p;
  return Object.fromEntries(Object.entries(suma).map(([f, s]) => [f, pct(s, commits.length)]));
}

/** El esfuerzo según lo que cada frente hace en la fase: cuánto fue al foco, al apoyo y a lo que está en espera. */
export function repartoPorNivel(fase: Fase, commits: CommitFrentes[]): Record<Nivel | 'otros', number> {
  const suma = { foco: 0, apoyo: 0, espera: 0, otros: 0 };
  for (const c of commits) {
    for (const [f, p] of Object.entries(c.frentes)) {
      if (f === 'otros') suma.otros += p;
      else suma[trabajoDe(fase, f).nivel] += p;
    }
  }
  const n = commits.length;
  return { foco: pct(suma.foco, n), apoyo: pct(suma.apoyo, n), espera: pct(suma.espera, n), otros: pct(suma.otros, n) };
}

// ───────────────────────────────────────────────────────────── excepciones

export function excepcionesActivas(estado: EstadoDirector, hoy: string, frente?: string): Excepcion[] {
  return estado.excepciones.filter((e) => !e.cerrada && e.hasta >= hoy && (!frente || e.frente === frente));
}

// ───────────────────────────────────────────────────────────── validación

const URL_VALIDA = /^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$))/;

/** Los errores del plan. Con `personas` (los ids del equipo), también revisa para quién es cada misión. */
export function validarPlan(plan: Plan, personas?: Persona[]): string[] {
  const errores: string[] = [];
  const unicos = (nombre: string, ids: string[]) => {
    const vistos = new Set<string>();
    for (const id of ids) {
      if (!id) errores.push(`${nombre}: hay uno sin id.`);
      else if (vistos.has(id)) errores.push(`${nombre}: el id «${id}» está repetido.`);
      vistos.add(id);
    }
  };
  if (!plan.fases?.length) errores.push('La ruta no tiene ninguna fase.');
  unicos('Frentes', plan.frentes.map((f) => f.id));
  unicos('Fases', plan.fases.map((f) => f.id));
  unicos('Criterios', plan.fases.flatMap((f) => f.criterios.map((c) => c.id)));
  unicos('Propuestas', plan.propuestas.map((p) => p.id));
  unicos('Objetivos candidatos', (plan.objetivos ?? []).map((o) => o.id));
  const frentes = new Set(plan.frentes.map((f) => f.id));
  const fases = new Set(plan.fases.map((f) => f.id));
  for (const fase of plan.fases) {
    for (const [id, t] of Object.entries(fase.frentes)) {
      if (!frentes.has(id)) errores.push(`La fase «${fase.id}» nombra el frente «${id}», que no está.`);
      else if (!NIVELES.includes(t.nivel)) errores.push(`La fase «${fase.id}»: el frente «${id}» tiene un nivel desconocido (${t.nivel}).`);
    }
    for (const c of fase.criterios) {
      if (c.indicador && !INDICADORES.includes(c.indicador)) errores.push(`El criterio «${c.id}» usa un indicador desconocido (${c.indicador}).`);
      if (c.tipos?.some((t) => !TIPOS_VALIDACION.includes(t))) errores.push(`El criterio «${c.id}» nombra un tipo de validación desconocido.`);
    }
  }
  for (const p of plan.propuestas) if (!fases.has(p.fase)) errores.push(`La propuesta «${p.id}» nombra la fase «${p.fase}», que no está.`);
  for (const a of plan.adelantado ?? []) {
    if (!fases.has(a.fase)) errores.push(`Lo adelantado «${a.texto}» nombra la fase «${a.fase}», que no está.`);
    if (!frentes.has(a.frente)) errores.push(`Lo adelantado «${a.texto}» nombra el frente «${a.frente}», que no está.`);
  }
  for (const [id, g] of Object.entries(plan.diagnostico?.frentes ?? {})) {
    if (!frentes.has(id)) errores.push(`El diagnóstico nombra el frente «${id}», que no está.`);
    if (!(g.nota >= 0 && g.nota <= 5)) errores.push(`El diagnóstico de «${id}» tiene una nota fuera de 0 a 5.`);
  }
  // Las misiones y lo que dice el director
  unicos('Misiones', (plan.misiones ?? []).map((m) => m.id));
  const criterios = new Set(plan.fases.flatMap((f) => f.criterios.map((c) => c.id)));
  const misiones = new Set((plan.misiones ?? []).map((m) => m.id));
  for (const m of plan.misiones ?? []) {
    if (personas && !personas.includes(m.para)) errores.push(`La misión «${m.id}» es para alguien que no está en el equipo («${m.para}»).`);
    if (!fases.has(m.fase)) errores.push(`La misión «${m.id}» nombra la fase «${m.fase}», que no está.`);
    if (!frentes.has(m.frente)) errores.push(`La misión «${m.id}» nombra el frente «${m.frente}», que no está.`);
    if (!m.pasos?.length) errores.push(`La misión «${m.id}» no dice sus pasos.`);
    if (!(m.xp > 0)) errores.push(`La misión «${m.id}» no da experiencia.`);
    for (const c of m.criterios ?? []) if (!criterios.has(c)) errores.push(`La misión «${m.id}» nombra el criterio «${c}», que no está.`);
    for (const d of m.documentos ?? []) if (!esDocumento(d)) errores.push(`La misión «${m.id}» nombra un documento que no es de docs/ ni repo: («${d}»).`);
    for (const p of m.pasos ?? []) if (typeof p !== 'string' && p.ir) destinoValido(p.ir, `Un paso de la misión «${m.id}»`);
    for (const p of m.pasos ?? []) {
      if (typeof p === 'string') continue;
      if (p.detalle && (!Array.isArray(p.detalle) || p.detalle.some((x) => typeof x !== 'string' || !x.trim()))) errores.push(`Un paso de la misión «${m.id}» tiene un detalle que no es una lista de frases.`);
      const donde = `Un paso de la misión «${m.id}» («${p.texto.slice(0, 40)}…»)`;
      if (p.opciones !== undefined) {
        const o = p.opciones;
        if (!Array.isArray(o) || o.some((x) => typeof x !== 'string' || !x.trim())) errores.push(`${donde} tiene opciones que no son una lista de frases.`);
        else if (o.length < 2 || o.length > MAX_OPCIONES) errores.push(`${donde} da ${o.length} opciones: deben ser de 2 a ${MAX_OPCIONES}.`);
        else if (new Set(o.map((x) => x.trim().toLowerCase())).size !== o.length) errores.push(`${donde} repite una opción.`);
        if (p.hecho) errores.push(`${donde} tiene opciones y \`hecho\`: con opciones se marca solo al elegir; quita el \`hecho\`.`);
      }
      for (const k of ['hazlo', 'soloTu'] as const) {
        const v: unknown = p[k];
        if (v !== undefined && (typeof v !== 'string' || !v.trim())) errores.push(`${donde} tiene \`${k}\` sin decir qué (debe ser una frase).`);
      }
      if (p.hazlo !== undefined) {
        if (p.soloTu !== undefined) errores.push(`${donde} tiene \`hazlo\` y \`soloTu\`: o lo puede hacer el director, o solo la persona.`);
        if (p.opciones !== undefined) errores.push(`${donde} tiene \`hazlo\` y opciones: elegir es de la persona; quita el \`hazlo\`.`);
        if (p.hecho) errores.push(`${donde} tiene \`hazlo\` y \`hecho\`: con «Hazlo tú» se marca solo al encargarlo; quita el \`hecho\`.`);
      }
      if (p.terminal !== undefined) {
        if (typeof p.terminal !== 'string' || !p.terminal.trim() || /[\r\n]/.test(p.terminal)) errores.push(`${donde} tiene \`terminal\` sin una orden de una sola línea.`);
        if (p.hazlo !== undefined) errores.push(`${donde} tiene \`hazlo\` y \`terminal\`: si la orden la corre la persona, no es «Hazlo tú».`);
      }
      if (p.comprobar !== undefined) {
        const c = p.comprobar;
        if (!c || typeof c !== 'object' || typeof c.orden !== 'string') errores.push(`${donde} tiene \`comprobar\` sin su orden.`);
        else {
          const o = ordenDeComprobacion(c.orden);
          if ('error' in o) errores.push(`${donde} se comprueba con una orden que no se acepta («${c.orden}»): ${o.error}.`);
          if (c.espera !== undefined && (typeof c.espera !== 'string' || !c.espera.trim())) errores.push(`${donde} tiene \`comprobar.espera\` vacía: di lo que debe salir, o quítala.`);
          if (c.vacia && c.espera !== undefined) errores.push(`${donde} pide una salida vacía y a la vez que diga algo: deja \`vacia\` o \`espera\`.`);
        }
        if (p.terminal === undefined) errores.push(`${donde} tiene \`comprobar\` sin \`terminal\`: solo se comprueba un paso que corre una orden.`);
        if (p.hecho || p.opciones !== undefined || p.hazlo !== undefined) errores.push(`${donde} tiene \`comprobar\` junto con \`hecho\`, opciones o \`hazlo\`: ya trae otra prueba; deja una.`);
      }
      const h = p.hecho;
      if (!h) continue;
      if (!HECHOS.includes(h.que)) errores.push(`${donde} se marca solo con algo desconocido («${h.que}»).`);
      if (['leido', 'propuesta', 'puerta'].includes(h.que) && !h.id) errores.push(`${donde} se marca solo con «${h.que}», pero no dice cuál (\`id\`).`);
      if (h.que === 'leido' && h.id && !esDocumento(h.id)) errores.push(`${donde} se marca solo al leer algo que no es de docs/ ni repo:.`);
      if (h.que === 'propuesta' && h.id && !plan.propuestas.some((x) => x.id === h.id)) errores.push(`${donde} se marca solo con una propuesta que no está («${h.id}»).`);
      if (h.que === 'puerta' && h.id && !fases.has(h.id)) errores.push(`${donde} se marca solo con la puerta de una fase que no está («${h.id}»).`);
      if (h.tipo && !TIPOS_SOBRE.includes(h.tipo)) errores.push(`${donde} se marca solo con una nota sobre algo desconocido («${h.tipo}»).`);
      if (h.desde && Number.isNaN(Date.parse(h.desde))) errores.push(`${donde} se marca solo desde una fecha que no se entiende («${h.desde}»).`);
    }
  }
  /** Un botón que lleva a un lugar del Studio (el de un paso, o el «Quedó en» de una respuesta): que ese lugar exista. */
  function destinoValido(ir: Destino, donde: string) {
    if (!ir.etiqueta?.trim()) errores.push(`${donde} lleva a alguna parte pero su botón no tiene texto.`);
    if (!ir.vista && !ir.doc && !ir.url) errores.push(`${donde} tiene botón pero no dice a dónde lleva.`);
    if (ir.vista && !VISTAS_DIRECTOR.includes(ir.vista)) errores.push(`${donde} lleva a una pestaña que no existe («${ir.vista}»).`);
    if (ir.doc && !esDocumento(ir.doc)) errores.push(`${donde} lleva a un documento que no es de docs/ ni repo:.`);
    if (ir.fase && !fases.has(ir.fase)) errores.push(`${donde} lleva a una fase que no está («${ir.fase}»).`);
    if (ir.tipoValidacion && !TIPOS_VALIDACION.includes(ir.tipoValidacion)) errores.push(`${donde} pide un tipo de validación desconocido.`);
    if (ir.url && !URL_VALIDA.test(ir.url)) errores.push(`${donde} lleva a una página que no es https (ni de este computador).`);
    if (ir.ancla?.startsWith('propuesta-') && !plan.propuestas.some((x) => `propuesta-${x.id}` === ir.ancla)) errores.push(`${donde} lleva a una propuesta que no está («${ir.ancla}»).`);
  }
  for (const [id, r] of Object.entries(plan.revisiones ?? {})) {
    if (!misiones.has(id)) errores.push(`Hay un veredicto de una misión que no está («${id}»).`);
    if (!VEREDICTOS.includes(r.veredicto)) errores.push(`El veredicto de «${id}» es desconocido.`);
  }
  if (plan.resumen && (!plan.resumen.quedamos?.trim() || !plan.resumen.fecha)) errores.push('El resumen «Dónde quedamos» necesita su fecha y en qué quedamos.');
  for (const id of Object.keys(plan.ejecutadas ?? {})) if (!plan.propuestas.some((p) => p.id === id)) errores.push(`Se marcó como ejecutada una propuesta que no está («${id}»).`);
  for (const [id, r] of Object.entries(plan.respuestas ?? {})) {
    if (r.tratamiento && !TRATAMIENTOS.includes(r.tratamiento)) errores.push(`La respuesta a la nota «${id}» tiene un tratamiento desconocido (${r.tratamiento}).`);
    if (!r.destino) continue;
    const donde = `La respuesta a la nota «${id}»`;
    destinoValido(r.destino, donde);
    const ancla = r.destino.ancla;
    if (ancla?.startsWith('mision-') && !misiones.has(ancla.slice(7))) errores.push(`${donde} dice que quedó en una misión que no está («${ancla}»).`);
    if (r.destino.doc && !r.destino.doc.startsWith('repo:') && !(plan.documentos ?? []).some((x) => x.ruta === r.destino!.doc)) errores.push(`${donde} dice que quedó en un documento que no está en la lista del plan («${r.destino.doc}»).`);
  }
  for (const id of Object.keys(plan.evaluacion ?? {})) if (!criterios.has(id)) errores.push(`El director evaluó un criterio que no está («${id}»).`);
  for (const b of plan.boletin ?? []) {
    for (const [materia, n] of Object.entries(b.notas)) if (!NOTAS_BOLETIN.includes(n)) errores.push(`El boletín del ${b.fecha} tiene una nota desconocida en «${materia}».`);
  }
  for (const d of plan.documentos ?? []) if (!esDocumento(d.ruta)) errores.push(`El documento «${d.titulo}» no es de docs/ ni repo:.`);
  return errores;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function validarEstado(estado: EstadoDirector, plan: Plan): string[] {
  const errores: string[] = [];
  const criterios = new Set(plan.fases.flatMap((f) => f.criterios.map((c) => c.id)));
  const fases = new Set(plan.fases.map((f) => f.id));
  const frentes = new Set(plan.frentes.map((f) => f.id));
  for (const [id, m] of Object.entries(estado.marcas)) {
    if (!criterios.has(id)) errores.push(`Hay una marca de un criterio que no está en el plan («${id}»).`);
    if (m.estado !== 'cumplido' && m.estado !== 'no_aplica') errores.push(`La marca de «${id}» tiene un estado desconocido.`);
    if (m.estado === 'no_aplica' && !m.nota?.trim()) errores.push(`«${id}» no aplica: falta decir por qué.`);
  }
  for (const id of Object.keys(estado.cierres)) if (!fases.has(id)) errores.push(`Hay una puerta cerrada de una fase que no está («${id}»).`);
  for (const e of estado.excepciones) {
    if (!frentes.has(e.frente)) errores.push(`La excepción ${e.id} es de un frente que no está («${e.frente}»).`);
    if (!e.motivo?.trim()) errores.push(`La excepción ${e.id} no dice por qué.`);
    if (!FECHA.test(e.hasta)) errores.push(`La excepción ${e.id} no tiene hasta cuándo vale.`);
  }
  for (const v of estado.validaciones) {
    if (!fases.has(v.fase)) errores.push(`La validación ${v.id} es de una fase que no está («${v.fase}»).`);
    if (!TIPOS_VALIDACION.includes(v.tipo)) errores.push(`La validación ${v.id} tiene un tipo desconocido.`);
    if (!(v.personas >= 1)) errores.push(`La validación ${v.id} no dice cuántas personas participaron.`);
    if (v.lograron < 0 || v.lograron > v.personas || v.aprueban < 0 || v.aprueban > v.personas)
      errores.push(`La validación ${v.id}: las que lo lograron y las que lo aprueban no pueden pasar de las que participaron.`);
  }
  for (const [id, r] of Object.entries(estado.propuestas)) {
    if (!plan.propuestas.some((p) => p.id === id)) errores.push(`Hay una respuesta a una propuesta que no está («${id}»).`);
    if (!RESPUESTAS.includes(r.estado)) errores.push(`La respuesta a «${id}» tiene un estado desconocido.`);
  }
  const misiones = new Set((plan.misiones ?? []).map((m) => m.id));
  for (const id of [...Object.keys(estado.entregas ?? {}), ...Object.keys(estado.empezadas ?? {})])
    if (!misiones.has(id)) errores.push(`Hay una entrega de una misión que no está («${id}»).`);
  const ids = new Set<string>();
  for (const n of estado.notas ?? []) {
    if (ids.has(n.id)) errores.push(`La nota ${n.id} está repetida.`);
    ids.add(n.id);
    if (!TIPOS_SOBRE.includes(n.sobre?.tipo)) errores.push(`La nota ${n.id} no dice sobre qué es.`);
    if (!n.texto?.trim() && !n.audio && !n.adjuntos?.length) errores.push(`La nota ${n.id} está vacía.`);
    if (n.audio && !/^proyectos\/[a-z0-9-]+\/director\/notas\/[\w.-]+\.(webm|ogg|m4a|mp3|wav)$/.test(n.audio)) errores.push(`El audio de la nota ${n.id} no está donde debe.`);
    for (const a of n.adjuntos ?? []) if (!RUTA_ADJUNTO.test(a.ruta ?? '')) errores.push(`Un adjunto de la nota ${n.id} no está donde debe.`);
  }
  return errores;
}

/** Los errores de lo que es del proyecto: el equipo (un solo titular, ids y correos únicos) y el objetivo. */
export function validarProyecto(p: Proyecto): string[] {
  const errores: string[] = [];
  const ids = new Set<string>();
  const correos = new Set<string>();
  for (const i of p.equipo ?? []) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(i.id)) errores.push(`El integrante «${i.nombre}» tiene un id inválido («${i.id}»).`);
    if (ids.has(i.id)) errores.push(`El id «${i.id}» está repetido en el equipo.`);
    ids.add(i.id);
    const c = i.correo.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+$/.test(c)) errores.push(`El correo de «${i.nombre}» no es válido.`);
    if (correos.has(c)) errores.push(`El correo «${c}» está repetido en el equipo.`);
    correos.add(c);
  }
  if (p.equipo?.length && !ids.has(TITULAR)) errores.push('El equipo no tiene titular.');
  if (p.objetivo && (!p.objetivo.texto?.trim() || !p.objetivo.exito?.trim())) errores.push('El objetivo firmado debe decir qué se logra y cómo se sabe que se logró.');
  if (p.tipo && !TIPOS_PROYECTO.includes(p.tipo)) errores.push(`El tipo de proyecto «${p.tipo}» es desconocido.`);
  return errores;
}

/** Fecha local AAAA-MM-DD. */
export const hoy = (f = new Date()) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;

/** Suma días a una fecha AAAA-MM-DD. */
export function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split('-').map(Number);
  return hoy(new Date(a, m - 1, d + dias));
}
