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
const INDICADORES = [
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
const TIPOS_PROYECTO = ['existente', 'nuevo'] as const;
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
  /**
   * La estrategia para este tipo de proyecto: lo que recomiendan quienes saben de él (una app, una tesis, un sitio, un
   * producto), en uno o dos párrafos, con sus fuentes reales. El director la investiga en cada diagnóstico.
   */
  estrategia?: { texto: string; fuentes: string[] };
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
  /** Los pedidos o las propuestas que esta reemplaza (`reemplazos`): salen de lo pendiente y van al archivo. */
  reemplaza?: string[];
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
const VISTAS_DIRECTOR = ['misiones', 'buzon', 'documentos', 'ruta', 'propuestas', 'proyectos', 'proyecto', 'diagnostico', 'frentes', 'validaciones', 'esfuerzo', 'metodo', 'bitacora', 'preguntas', 'modelo'] as const;
export type VistaDirector = (typeof VISTAS_DIRECTOR)[number];

/**
 * Pestañas que ya no existen: «Qué es STL» (`stl`) salió del Studio por decisión del titular (26 de octubre de 2026).
 * Un paso ya cerrado que llevaba a ella no se borra de la historia: el Studio lo lleva a la animación pública
 * (`destinoVigente`) y `validarPlan` no lo marca. Una misión sin aprobar no puede nombrarla.
 */
const VISTAS_RETIRADAS: readonly string[] = ['stl'];
const PAGINA_PUBLICA = 'https://argwabot.github.io/STL-Sacred_Time_Line/';

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
 * El destino que el Studio sigue de verdad: un botón viejo a una pestaña que ya no existe (`VISTAS_RETIRADAS`) lleva a la
 * página pública, en una pestaña nueva, y conserva el texto del botón. Los demás, tal cual. Pura.
 */
export function destinoVigente(dest: Destino): Destino {
  return dest.vista && VISTAS_RETIRADAS.includes(dest.vista) ? { etiqueta: dest.etiqueta, url: PAGINA_PUBLICA } : dest;
}

/**
 * Lo que prueba, dentro del Studio, que un paso se hizo: con eso el Studio lo marca solo, sin modelo, en cuanto lo ve.
 * `meta_fijada` / `meta_reabierta`: la meta del proyecto (desde `desde`, si se dice). `leido`: el documento `id` leído
 * entero o, con `seccion`, esa parte leída o comentada. `propuesta`: la propuesta `id` respondida. `puerta`: la puerta de
 * la fase `id` cruzada. `nota`: una nota de la persona de la misión en el Buzón (sobre `tipo`, `id` y `seccion`, si se
 * dicen, y desde `desde`). Lo que pasa fuera del Studio (correr un comando) no tiene `hecho`: se marca a mano.
 */
const HECHOS = ['meta_fijada', 'meta_reabierta', 'leido', 'propuesta', 'puerta', 'nota'] as const;
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
 * `esperar`: en un paso con opciones, los segundos que hay que esperar antes de responder (lo que tarda en verse un
 * cambio publicado, por ejemplo). El Studio muestra la cuenta regresiva y deja las opciones bloqueadas hasta que pase.
 * `varias`: en un paso con opciones que no se excluyen (qué sumarle a algo, por ejemplo), la persona marca una o varias y
 * las entrega juntas con «Listo», en una sola nota (nota de voz del titular nmvoi1e0etit, 25 de octubre de 2026: «los
 * botones de opciones me hacen escoger solo una a la vez, descartando las otras dos, a pesar de que me gustarían»).
 * `copiar`: el texto que la persona pega en otra parte (un formulario de afuera, un mensaje a alguien): el Studio lo
 * muestra entero en el paso, con «Copiar», y sigue ahí mientras haga falta. Nunca solo en lo que imprime una orden, que
 * se pierde al cerrar su ventana (nota de voz del titular nmvrikd6ptit, 28 de octubre de 2026: «pega el texto en inglés
 * que te dejó la orden al final. No lo leí y no lo tengo ya disponible»).
 */
export type Paso = string | { texto: string; ir?: Destino; hecho?: Hecho; detalle?: string[]; opciones?: string[]; varias?: boolean; hazlo?: string; soloTu?: string; terminal?: string; comprobar?: Comprobacion; esperar?: number; copiar?: string };

/** Lo más que un paso puede pedir esperar antes de responder: una cuenta más larga ya no es esperar, es otra misión. */
export const MAX_ESPERAR = 900;

/** Una opción que pide contar algo más («te cuento con ✉»): al elegirla, el Studio abre el comentario del paso. */
export const opcionConDetalle = (opcion: string) => /✉|te cuento|te copio|te explico/i.test(opcion);

/** La elección de quien ya respondió el paso con su ✉: lo marca sin elegir una de las opciones del director. */
export const YA_LO_DIJE = 'Ya te lo dije en mi comentario';

/**
 * Adónde lleva el botón de un paso. Un paso que se cumple al cruzar una puerta lleva siempre a esa puerta, en su fase de
 * la Ruta, y la resalta: quien aún no conoce la interfaz ve en qué vista está y dónde queda «Cruzar la puerta», abajo de
 * la fase (pedido del titular). Los demás pasos llevan a su `ir` tal cual. Con su misión (`m`), el botón que lleva a esa
 * misma misión no se da: la persona ya está ahí (`llevaAqui`).
 */
export function destinoDelPaso(p: Paso, m?: Pick<Mision, 'id'>): Destino | undefined {
  if (typeof p === 'string') return undefined;
  const dest: Destino | undefined = p.hecho?.que !== 'puerta' || !p.hecho.id ? p.ir
    : { vista: 'ruta', fase: p.hecho.id, ancla: 'puerta', etiqueta: p.ir?.etiqueta ?? 'Ir a la puerta' };
  return dest && m && llevaAqui(dest, lugarDeMision(m)) ? undefined : dest;
}

/** Manda a un lugar: un verbo de ir, abrir, leer o revisar y, en la misma frase, el lugar por su nombre, entre «». */
const MANDA_A_UN_LUGAR = /(?:^|[\s,(])(?:abre|abrir|ve a|ve al|vuelve a|entra a|entra en|lee|leer|mira|revisa|despliega|busca)\s[^.:;?!]*«/i;

/**
 * Los pasos de una misión (por índice) que mandan a ir, abrir, leer o revisar algo con su nombre y no traen botón (nota
 * de voz del titular, 22 de octubre de 2026: un paso decía «abre «Otros documentos, para consultar»» sin un botón que
 * llevara ahí). La bandeja los avisa en cada revisión, para que el director les ponga su `ir`. No cuentan los que ya
 * traen botón (el de su `ir` o el de su puerta), los que hace la persona fuera del Studio (`soloTu`), los de terminal ni
 * los «Hazlo tú». Puede avisar de más (lo que ya está a la vista, como la cabecera, no necesita botón): lo juzga el director.
 */
export function pasosSinBoton(m: Pick<Mision, 'pasos'>): number[] {
  return m.pasos.flatMap((p, i) => {
    if (typeof p !== 'string' && (destinoDelPaso(p) || p.soloTu || p.terminal || p.hazlo)) return [];
    return MANDA_A_UN_LUGAR.test(typeof p === 'string' ? p : p.texto) ? [i] : [];
  });
}

/**
 * Dónde está la persona cuando ve un botón: una vista y, dentro, el elemento con su `ancla` (la tarjeta de una misión,
 * una propuesta, un hilo de preguntas) o la `fase` de la ruta; o un documento (`doc`) y su parte (`seccion`).
 */
export type Lugar = Pick<Destino, 'vista' | 'ancla' | 'doc' | 'seccion' | 'fase'>;

/** Una misión como lugar: su tarjeta, en Hoy, donde están sus pasos. */
export const lugarDeMision = (m: Pick<Mision, 'id'>): Lugar => ({ vista: 'misiones', ancla: `mision-${m.id}` });

/**
 * ¿El botón deja a la persona donde ya está? Eso es una referencia circular: no lleva a ninguna parte y confunde (nota de
 * voz del titular, 22 de octubre: un «Quedó en» que llevaba a la misma parte del documento donde se leía la respuesta).
 * Es aquí el mismo documento en la misma parte (o el documento entero, si el botón no nombra una parte), o la misma vista
 * con la misma fase y la misma ancla (o la vista entera, si el botón no dice dónde dentro de ella). Nunca lo es una página
 * de afuera ni «Escribirle al director» (`buzon` › `escribir`), que no lleva a un lugar: abre el comentario.
 */
export function llevaAqui(dest: Destino, aqui: Lugar): boolean {
  if (dest.url) return false;
  if (dest.doc) return dest.doc === aqui.doc && (!dest.seccion || textoPlano(dest.seccion) === textoPlano(aqui.seccion ?? ''));
  if (dest.vista === 'buzon' && dest.ancla === 'escribir') return false;
  // Sin vista, el Studio lleva a Hoy
  if ((dest.vista ?? 'misiones') !== aqui.vista) return false;
  return (!dest.fase || dest.fase === aqui.fase) && (!dest.ancla || dest.ancla === aqui.ancla);
}

/** Cómo se dice, sin botón, que el lugar de un botón que `llevaAqui` es este mismo: «en esta misma parte»… */
export function aquiMismo(dest: Destino): string {
  if (dest.doc) return dest.seccion ? 'en esta misma parte' : 'en este mismo documento';
  if (dest.ancla?.startsWith('mision-')) return 'en esta misma misión';
  if (dest.ancla?.startsWith('propuesta-')) return 'en esta misma propuesta';
  if (dest.ancla?.startsWith('hilo-')) return 'en esta misma conversación';
  return 'en esta misma sección';
}

/**
 * La comprobación de un paso de terminal: una orden de solo lectura que el Studio corre en la carpeta del proyecto
 * (`git log -1 --format=%ae`, `git status --porcelain`, `existe <ruta>` para ver si un archivo está o `no existe <ruta>`
 * para ver que ya no está) y lo que su
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
export function ordenDeComprobacion(orden: string): { programa: 'git' | 'existe' | 'no existe'; args: string[] } | { error: string } {
  if (/[|&;<>`\r\n]|\$\(/.test(orden)) return { error: 'la orden no puede encadenar ni redirigir (sin |, &, ;, <, >, ` ni $( )' };
  const partes = [...orden.trim().matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map((x) => x[1] ?? x[2] ?? x[3]);
  // «no existe <ruta>»: lo contrario de «existe», para un paso que borra o mueve un archivo
  const niega = partes[0] === 'no' && partes[1] === 'existe';
  const [programa, ...args] = niega ? ['no existe', ...partes.slice(2)] : partes;
  if (programa === 'existe' || programa === 'no existe') {
    if (args.length !== 1) return { error: `«${programa}» lleva una sola ruta` };
    if (/^([a-z]:|[\\/])/i.test(args[0]) || args[0].split(/[\\/]/).includes('..')) return { error: `«${programa}» solo mira dentro del proyecto (una ruta relativa, sin ..)` };
    return { programa, args };
  }
  if (programa !== 'git') return { error: 'solo se comprueba con git, con «existe <ruta>» o con «no existe <ruta>»' };
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

/**
 * Lo más que mide una opción de un paso, y la elección que la guarda en el Buzón: el servidor la guarda entera o la
 * rechaza, nunca la corta. validarPlan no deja escribir una más larga, así que elegirla nunca se rechaza.
 */
export const MAX_ELECCION = 200;

/** Cómo van juntas, en la nota, las opciones que se eligieron en un paso con `varias`. */
const ENTRE_ELECCIONES = ' · ';

/** Lo más que mide la nota de un paso con `varias`, con todas sus opciones elegidas: también cabe siempre entera. */
export const MAX_ELECCIONES = MAX_OPCIONES * (MAX_ELECCION + ENTRE_ELECCIONES.length);

/** Las opciones elegidas de un paso con `varias`, en el orden del paso, como las guarda la nota. */
export const juntarElecciones = (opciones: string[], elegidas: Iterable<number>) => {
  const k = new Set(elegidas);
  return opciones.filter((_, i) => k.has(i)).join(ENTRE_ELECCIONES);
};

/** Una opción que no va con otras («Ninguna por ahora»): en un paso con `varias`, marcarla quita las demás, y al revés. */
export const opcionSola = (opcion: string) => /^\s*(ninguna|ninguno|nada)\b/i.test(opcion);

/** La última opción que eligió la persona en un paso con `opciones` (la nota que la guarda), si ya eligió. */
export const eleccionDe = (notas: Nota[], mision: string, i: number, persona: Persona) =>
  notas.filter((n) => n.de === persona && n.sobre.tipo === 'mision' && n.sobre.id === mision && n.sobre.seccion === seccionPaso(i) && !!n.sobre.eleccion).at(-1);

/** El último comentario a secas de la persona en un paso (su ✉: sin elegir, encargar ni pedir aclarar), si dijo algo. */
export const comentarioDe = (notas: Nota[], mision: string, i: number, persona: Persona) =>
  notas.filter((n) => n.de === persona && n.sobre.tipo === 'mision' && n.sobre.id === mision && n.sobre.seccion === seccionPaso(i)
    && !n.sobre.eleccion && !n.sobre.hazlo && !n.sobre.aclarar && (!!n.texto?.trim() || !!n.audio || !!n.adjuntos?.length)).at(-1);

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
  /**
   * Cuándo comprobó el director (ISO) que nada de lo que pide esta misión ya se hizo o se decidió por otro camino. Si
   * desde la última revisión hubo trabajo (commits, «Hazlo tú», notas sobre ella), la bandeja no cierra sin esta fecha.
   */
  vigente?: string;
  /**
   * Va al cierre de su fase: la prueba final, la subida, lo que mide la puerta entera. Como la que cruza la puerta, espera
   * a que esté hecho todo lo aprobado de la fase (`esperaAlCierre`).
   */
  alCierre?: boolean;
  /**
   * Lo que tiene que estar hecho antes de que la persona la vea: ids de misiones, propuestas o pedidos (nota de voz del
   * titular, 23 de octubre de 2026: «las misiones no pueden lanzarse en un orden aleatorio»; le llegó primero una misión
   * que solo necesitaba el paquete del cierre). El Studio la retiene mientras alguno siga sin hacer (`esperaA`) y aparece
   * sola cuando todo está; `validarPlan` comprueba que cada uno exista y que una misión de la misma persona de la que
   * depende vaya antes en la lista.
   */
  despuesDe?: string[];
  /**
   * De dónde nace: los ids de las notas, las propuestas, los pedidos o las misiones que la piden (propuesta aceptada «Lo
   * ya hecho, a una consulta», punto 1). Así una idea se sigue de punta a punta: la nota, la propuesta, la misión, el
   * commit, lo avanzado. `bandeja.ts --listo` comprueba que cada uno exista (`origenesQueNoExisten`).
   */
  origen?: string[];
  /**
   * El director recomienda pedir la revisión al entregar esta misión, y dice por qué en una frase (nota de voz del
   * titular, 23 de octubre de 2026: «el estudio puede recomendar la revisión cuando sea estratégico, explicando la razón»;
   * por ejemplo, porque de lo que se decide aquí dependen las que siguen). Es solo una recomendación: el Studio la muestra
   * al entregarla, con su botón, y nunca pide la revisión solo; la pide la persona, si quiere.
   */
  recomiendaRevision?: string;
}

const VEREDICTOS = ['aprobada', 'rehacer'] as const;
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
const TRATAMIENTOS = ['integrada', 'rechazada', 'aplazada', 'decision', 'informada'] as const;
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
  /**
   * Las decisiones de los documentos que esta deja sin efecto (los ids de sus notas), cuando responde una decisión que
   * cambia lo decidido en otra parte: salen de lo vigente (`decisionesVigentes`) y se siguen encontrando por su id.
   */
  reemplaza?: string[];
}

/** Los tratamientos que llevan algo al plan, y por eso nombran dónde quedó (`destino`). */
const TRATAMIENTOS_CON_DESTINO: readonly Tratamiento[] = ['integrada', 'aplazada', 'decision'];

/**
 * El doble check del director: las respuestas escritas desde `desde` (la revisión de ahora) que llevan algo al plan pero
 * no dicen dónde quedó. También una decisión respondida en un documento («Para decidir»): salvo que se rechace, tiene su
 * lugar en el plan. Sin esto, una decisión puede quedar solo en una respuesta, y nadie lo nota hasta que la ruta la contradice.
 */
export function respuestasSinDestino(plan: Plan, notas: Nota[], desde: string): string[] {
  const decisiones = new Set(notas.filter(decideDecision).map((n) => n.id));
  // Y una nota que pide una regla (pideUnaRegla): no se recorta en su respuesta, se lleva a donde la vigile el código
  const reglas = new Set(notas.filter((n) => pideUnaRegla(n.texto ?? '')).map((n) => n.id));
  return Object.entries(plan.respuestas ?? {})
    .filter(([id, r]) => r.cuando >= desde && !r.destino
      && (TRATAMIENTOS_CON_DESTINO.includes(r.tratamiento!) || ((decisiones.has(id) || reglas.has(id)) && r.tratamiento !== 'rechazada')))
    .map(([id]) => id);
}

/**
 * Si una nota pide una regla para siempre (propuesta aceptada «El cierre no deja nada sin atender», pr_cierre_vigilado,
 * punto 5): «de ahora en adelante», «que siempre», «que nunca», «es una regla»… Una regla que alguien pide no se recorta
 * en la respuesta: se lleva tal cual a donde la vigile el código (y, si es del Studio, a su inventario,
 * reglasDelTitular.ts) o se plantea como decisión; por eso su respuesta, salvo que se rechace, dice dónde quedó. Pura.
 */
export const pideUnaRegla = (texto: string): boolean =>
  /\b(?:de ahora en adelante|a partir de ahora|desde ahora|que siempre|que nunca|siempre que|nunca m[aá]s|como regla|es una regla|se considera regla|regla (?:dura|inviolable|cr[ií]tica)|para siempre)\b/i.test(texto);

// ───────────────────────────────────────────────────────────── el archivo del plan

/**
 * Lo que sale del plan para que no pese (director/archivo.json, en la memoria del proyecto): las respuestas a notas
 * cerradas, los veredictos de misiones aprobadas y, desde el 26 de octubre de 2026, las misiones aprobadas mismas
 * («El plan liviano», aceptada, punto 1: eran más de la mitad del plan). Nada se pierde: el Studio y las herramientas
 * leen el plan unido con su archivo (`unirArchivo`), así que todo se sigue viendo igual; solo deja de estar en lo que
 * el director lee entero en cada revisión. Si necesita algo de lo dicho antes, lo busca ahí.
 */
export interface ArchivoPlan {
  respuestas: Record<string, Respuesta>;
  revisiones: Record<string, Revision>;
  /** Las misiones aprobadas antes de la revisión anterior (un archivo de antes no las trae). */
  misiones?: Mision[];
  /**
   * Las propuestas cerradas (descartadas, o ejecutadas con su nota en `ejecutadas`) y los pedidos hechos antes de la
   * revisión anterior («El plan liviano», punto 1, lo que seguía: eran casi la mitad de lo que quedaba del plan).
   */
  propuestas?: Propuesta[];
  ejecutadas?: Record<string, { cuando: string; nota: string }>;
  pedidos?: Pedido[];
  /**
   * Lo adelantado de las fases que ya se cerraron («El plan liviano», punto 4): «adelantado» guarda lo hecho de las fases
   * que vienen, y el de una fase cerrada ya no adelanta nada, solo es historia.
   */
  adelantado?: Adelantado[];
}

/** Lo que identifica una entrada de lo adelantado, que no lleva id. */
const claveAdelantado = (a: Adelantado) => `${a.fase}\n${a.frente}\n${a.texto}`;

/** Lo archivado primero y lo del plan después, sin repetir: lo del plan manda. Sin nada archivado, lo del plan tal cual. */
function conArchivados<T extends { id: string }>(archivados: T[] | undefined, actuales: T[] | undefined): T[] | undefined {
  const en = new Set((actuales ?? []).map((x) => x.id));
  const fuera = (archivados ?? []).filter((x) => !en.has(x.id));
  return fuera.length ? [...fuera, ...(actuales ?? [])] : actuales;
}

export const archivoVacio = (): ArchivoPlan => ({ respuestas: {}, revisiones: {}, misiones: [] });

/** Lo que no tiene fecha (una propuesta descartada, lo adelantado) va en su propio archivo, junto a los meses. */
export const SIN_FECHA = 'sin-fecha';

/** El mes (AAAA-MM) de una fecha ISO, que es el archivo donde se guarda lo cerrado en esa fecha; sin fecha, `SIN_FECHA`. */
export const mesDelArchivo = (fecha?: string) => /^\d{4}-\d{2}/.exec(fecha ?? '')?.[0] ?? SIN_FECHA;

/**
 * Varios archivos en uno, en su orden: lo de uno posterior manda sobre lo de uno anterior (el de una sola pieza, de
 * antes, va primero; después, los meses). Con `unirArchivo` encima, el plan se ve igual que con un solo archivo.
 */
export function juntarArchivos(partes: Partial<ArchivoPlan>[]): ArchivoPlan {
  const junto = archivoVacio();
  const listas = ['misiones', 'propuestas', 'pedidos'] as const;
  for (const p of partes) {
    Object.assign(junto.respuestas, p.respuestas);
    Object.assign(junto.revisiones, p.revisiones);
    if (p.ejecutadas) junto.ejecutadas = { ...junto.ejecutadas, ...p.ejecutadas };
    for (const k of listas) if (p[k]) (junto as any)[k] = conArchivados((junto as any)[k], p[k] as { id: string }[]);
    if (p.adelantado) {
      const ya = new Set(p.adelantado.map(claveAdelantado));
      junto.adelantado = [...(junto.adelantado ?? []).filter((a) => !ya.has(claveAdelantado(a))), ...p.adelantado];
    }
  }
  return junto;
}

/**
 * El archivo partido por mes («El plan liviano», punto 2): cada cosa va al mes en que se cerró (una respuesta y un
 * veredicto, por su fecha; una misión, por la de su veredicto; una propuesta ejecutada, por la de su nota; un pedido,
 * por la de su `hecho`), así que lo de un mes pasado ya no cambia y cada cierre reescribe solo el mes de ahora. Lo que
 * dice igual `previo` (el archivo de una sola pieza, de antes, que se queda como estaba) no se repite en los meses.
 */
export function partirArchivoPorMes(archivo: ArchivoPlan, previo?: Partial<ArchivoPlan> | null): Record<string, ArchivoPlan> {
  const meses: Record<string, ArchivoPlan> = {};
  const de = (mes: string) => (meses[mes] ??= { respuestas: {}, revisiones: {} });
  const igual = (a: unknown, b: unknown) => b !== undefined && JSON.stringify(a) === JSON.stringify(b);
  const enPrevio = <T extends { id: string }>(lista: T[] | undefined, x: T) => igual(x, lista?.find((y) => y.id === x.id));
  for (const [id, r] of Object.entries(archivo.respuestas)) if (!igual(r, previo?.respuestas?.[id])) de(mesDelArchivo(r.cuando)).respuestas[id] = r;
  for (const [id, r] of Object.entries(archivo.revisiones)) if (!igual(r, previo?.revisiones?.[id])) de(mesDelArchivo(r.cuando)).revisiones[id] = r;
  for (const [id, e] of Object.entries(archivo.ejecutadas ?? {})) if (!igual(e, previo?.ejecutadas?.[id])) (de(mesDelArchivo(e.cuando)).ejecutadas ??= {})[id] = e;
  for (const m of archivo.misiones ?? []) if (!enPrevio(previo?.misiones, m)) (de(mesDelArchivo(archivo.revisiones[m.id]?.cuando)).misiones ??= []).push(m);
  for (const p of archivo.propuestas ?? []) if (!enPrevio(previo?.propuestas, p)) (de(mesDelArchivo(archivo.ejecutadas?.[p.id]?.cuando)).propuestas ??= []).push(p);
  for (const p of archivo.pedidos ?? []) if (!enPrevio(previo?.pedidos, p)) (de(mesDelArchivo(p.hecho?.cuando)).pedidos ??= []).push(p);
  const yaAntes = new Set((previo?.adelantado ?? []).map(claveAdelantado));
  for (const a of archivo.adelantado ?? []) if (!yaAntes.has(claveAdelantado(a))) (de(SIN_FECHA).adelantado ??= []).push(a);
  return meses;
}

/**
 * El plan con lo archivado: lo del plan manda (una respuesta, un veredicto o una misión nuevos reemplazan a los
 * archivados). Las misiones archivadas van primero: son las aprobadas antes que todo lo que sigue en el plan, así que lo
 * aprobado queda en el orden en que se aprobó y lo abierto, en el suyo.
 */
export function unirArchivo(plan: Plan, archivo?: Partial<ArchivoPlan> | null): Plan {
  if (!archivo) return plan;
  const enPlan = new Set((plan.misiones ?? []).map((m) => m.id));
  const archivadas = (archivo.misiones ?? []).filter((m) => !enPlan.has(m.id));
  const propuestas = conArchivados(archivo.propuestas, plan.propuestas);
  const pedidos = conArchivados(archivo.pedidos, plan.pedidos);
  const enAdelantado = new Set((plan.adelantado ?? []).map(claveAdelantado));
  const adelantadoArchivado = (archivo.adelantado ?? []).filter((a) => !enAdelantado.has(claveAdelantado(a)));
  return {
    ...plan,
    respuestas: { ...archivo.respuestas, ...plan.respuestas },
    revisiones: { ...archivo.revisiones, ...plan.revisiones },
    ...(archivadas.length ? { misiones: [...archivadas, ...(plan.misiones ?? [])] } : {}),
    ...(adelantadoArchivado.length ? { adelantado: [...adelantadoArchivado, ...(plan.adelantado ?? [])] } : {}),
    ...(propuestas !== plan.propuestas ? { propuestas: propuestas! } : {}),
    ...(pedidos !== plan.pedidos ? { pedidos } : {}),
    ...(archivo.ejecutadas && Object.keys(archivo.ejecutadas).length ? { ejecutadas: { ...archivo.ejecutadas, ...plan.ejecutadas } } : {}),
  };
}

/**
 * Archiva lo cerrado antes de `antes` (la revisión anterior: lo de la revisión de ahora se queda una vuelta más, para
 * que el director lo vea al volver): las respuestas a notas que no son de una misión abierta o entregada, y las
 * misiones aprobadas con su veredicto. `plan` es el de plan.json, sin unir.
 */
export function archivar(plan: Plan, archivo: ArchivoPlan, estado: EstadoDirector, antes: string): { plan: Plan; archivo: ArchivoPlan; movidas: number } {
  const completo = unirArchivo(plan, archivo);
  const misiones = new Map(plan.misiones.map((m) => [m.id, m]));
  const viva = (id?: string) => { const m = id ? misiones.get(id) : undefined; return !!m && [...ABIERTAS, 'entregada'].includes(estadoMision(m, completo, estado)); };
  const notas = new Map(estado.notas.map((n) => [n.id, n]));
  const respuestas = { ...plan.respuestas }, revisiones = { ...plan.revisiones };
  // Lo ya archivado se conserva entero, también lo que esta vez no crece
  const nuevo: ArchivoPlan = {
    respuestas: { ...archivo.respuestas },
    revisiones: { ...archivo.revisiones },
    misiones: [...(archivo.misiones ?? [])],
    ...(archivo.propuestas ? { propuestas: [...archivo.propuestas] } : {}),
    ...(archivo.ejecutadas ? { ejecutadas: { ...archivo.ejecutadas } } : {}),
    ...(archivo.pedidos ? { pedidos: [...archivo.pedidos] } : {}),
    ...(archivo.adelantado ? { adelantado: [...archivo.adelantado] } : {}),
  };
  // Una misión aprobada antes de `antes` sale entera, con su veredicto: ya no cambia, y el Studio la sigue mostrando
  const aprobadaAntes = (m: Mision) => (completo.revisiones?.[m.id]?.cuando ?? '') < antes && estadoMision(m, completo, estado) === 'aprobada';
  const quedan = plan.misiones.filter((m) => !aprobadaAntes(m));
  const salen = plan.misiones.filter(aprobadaAntes);
  nuevo.misiones = [...nuevo.misiones!.filter((m) => !salen.some((s) => s.id === m.id)), ...salen];
  let movidas = salen.length;
  for (const [id, r] of Object.entries(plan.respuestas ?? {})) {
    const n = notas.get(id);
    if (!(r.cuando < antes) || (n?.sobre.tipo === 'mision' && viva(n.sobre.id))) continue;
    nuevo.respuestas[id] = r;
    delete respuestas[id];
    movidas++;
  }
  for (const [id, r] of Object.entries(plan.revisiones ?? {})) {
    const m = misiones.get(id);
    if (!(r.cuando < antes) || r.veredicto !== 'aprobada' || !m || estadoMision(m, completo, estado) !== 'aprobada') continue;
    nuevo.revisiones[id] = r;
    delete revisiones[id];
    movidas++;
  }
  // Una propuesta cerrada antes de `antes` sale con su nota de ejecutada: descartada por el titular, o ya ejecutada. Una
  // aceptada sin ejecutar, o sin responder, se queda: es trabajo por hacer o por decidir. Lo reemplazado (`reemplazos`)
  // sale ya: lo vigente es lo que lo reemplazó, y lo reemplazado se sigue encontrando en el archivo por su id
  const fuera = reemplazos(completo);
  const ejecutadas = { ...plan.ejecutadas };
  const cerrada = (p: Propuesta) => {
    if (fuera.has(p.id)) return true;
    const r = estado.propuestas[p.id];
    if (r?.estado === 'descartada') return r.fecha < antes;
    const e = completo.ejecutadas?.[p.id];
    return !!e && e.cuando < antes;
  };
  const salenPropuestas = (plan.propuestas ?? []).filter(cerrada);
  if (salenPropuestas.length) {
    nuevo.propuestas = [...(nuevo.propuestas ?? []).filter((x) => !salenPropuestas.some((s) => s.id === x.id)), ...salenPropuestas];
    nuevo.ejecutadas = { ...nuevo.ejecutadas };
    for (const p of salenPropuestas) {
      if (ejecutadas[p.id]) nuevo.ejecutadas[p.id] = ejecutadas[p.id];
      delete ejecutadas[p.id];
    }
    movidas += salenPropuestas.length;
  }
  // Un pedido hecho antes de `antes` sale con su `hecho`: el Studio lo sigue mostrando en su fase, con su estado. Uno
  // reemplazado, también
  const salenPedidos = (plan.pedidos ?? []).filter((p) => (!!p.hecho && p.hecho.cuando < antes) || fuera.has(p.id));
  if (salenPedidos.length) {
    nuevo.pedidos = [...(nuevo.pedidos ?? []).filter((x) => !salenPedidos.some((s) => s.id === x.id)), ...salenPedidos];
    movidas += salenPedidos.length;
  }
  // Lo adelantado de una fase que se cerró antes de `antes` sale: ya no adelanta nada (punto 4). El Studio lo sigue
  // mostrando en su fase, desde el archivo
  const cerradaAntes = (fase: string) => { const f = estado.cierres[fase]?.fecha; return !!f && f < antes; };
  const salenAdelantado = (plan.adelantado ?? []).filter((a) => cerradaAntes(a.fase));
  if (salenAdelantado.length) {
    const salen = new Set(salenAdelantado.map(claveAdelantado));
    nuevo.adelantado = [...(nuevo.adelantado ?? []).filter((x) => !salen.has(claveAdelantado(x))), ...salenAdelantado];
    movidas += salenAdelantado.length;
  }
  const sale = <T extends { id: string }>(lista: T[] | undefined, salen: T[]) => (lista ?? []).filter((x) => !salen.some((s) => s.id === x.id));
  return {
    plan: {
      ...plan,
      misiones: quedan,
      respuestas,
      revisiones,
      ...(salenPropuestas.length ? { propuestas: sale(plan.propuestas, salenPropuestas), ejecutadas } : {}),
      ...(salenPedidos.length ? { pedidos: sale(plan.pedidos, salenPedidos) } : {}),
      ...(salenAdelantado.length ? { adelantado: (plan.adelantado ?? []).filter((a) => !cerradaAntes(a.fase)) } : {}),
    },
    archivo: nuevo,
    movidas,
  };
}

/**
 * De qué sale una misión prevista de una fase («El plan liviano», punto 3: su estado se calcula solo, no se lleva a mano):
 * las propuestas, los pedidos y las misiones del plan que nombra su texto por su id (pd_…, pr_…, t_…), y cuáles están
 * hechos: el pedido con su `hecho`, la propuesta ejecutada o descartada, la misión aprobada. Lo que no nombra nada, sin
 * estado. `plan` es el unido con su archivo, para que cuente también lo archivado.
 */
export function origenDePrevista(texto: string, plan: Plan, estado: EstadoDirector): { ids: string[]; hechos: string[] } {
  const pedidos = new Map((plan.pedidos ?? []).map((p) => [p.id, p]));
  const propuestas = new Set((plan.propuestas ?? []).map((p) => p.id));
  const misiones = new Map((plan.misiones ?? []).map((m) => [m.id, m]));
  const ids = [...new Set(texto.match(/\b(?:pd|pr|t|c)_[a-z0-9_]+/g) ?? [])].filter((id) => pedidos.has(id) || propuestas.has(id) || misiones.has(id));
  const fuera = reemplazos(plan);
  const hecho = (id: string, vistos = new Set<string>()): boolean => {
    // Lo reemplazado está hecho cuando lo está lo que lo reemplazó
    const por = fuera.get(id);
    if (por !== undefined && !vistos.has(id)) return hecho(por, vistos.add(id));
    const p = pedidos.get(id);
    if (p) return !!p.hecho;
    if (propuestas.has(id)) return !!plan.ejecutadas?.[id] || estado.propuestas[id]?.estado === 'descartada';
    const m = misiones.get(id);
    return !!m && estadoMision(m, plan, estado) === 'aprobada';
  };
  return { ids, hechos: ids.filter((id) => hecho(id)) };
}

/** Lo que dice que algo sigue por hacer: en lo adelantado, que es solo lo hecho, es un aviso. */
const POR_HACER = /\b(?:falta|faltan|pendiente|pendientes|por hacer|todav[ií]a no)\b/i;

/**
 * Lo adelantado que dice que algo sigue por hacer («El plan liviano», punto 4: «un pendiente ahí es un aviso»): lo
 * adelantado es solo lo hecho, y lo que falta es trabajo, que va como pedido, propuesta o misión, donde tiene su estado.
 * Lo de una fase cerrada no se avisa: ya es historia, y al pasar el tope sale al archivo (archivar). La bandeja lo
 * avisa; nada se borra solo.
 */
export function adelantadoConPendiente(plan: Plan, estado: EstadoDirector): Adelantado[] {
  return (plan.adelantado ?? []).filter((a) => !estado.cierres[a.fase] && POR_HACER.test(a.texto));
}

// ───────────────────────────────────────────────────────────── los controles del cierre

/** Algo que pasó desde la última revisión y que puede dejar hecho lo que pide una misión. */
export interface CommitReciente {
  hash: string;
  cuando: string;
  asunto: string;
}

/**
 * Lo que ya se hizo no se vuelve a pedir: por cada misión abierta, lo que pasó desde `desde` (la última revisión) que
 * puede haberla dejado hecha: los commits del repositorio, los «Hazlo tú» encargados y las notas sobre ella. Si hubo
 * algo y el director no la comprobó en esta revisión (`vigente`), queda en la lista: la revisión no se cierra.
 */
export function misionesPorVigilar(plan: Plan, estado: EstadoDirector, desde: string, commits: CommitReciente[]): { mision: Mision; hubo: string[] }[] {
  const recientes = estado.notas.filter((n) => n.cuando >= desde);
  const encargos = recientes.filter((n) => n.sobre.tipo === 'mision' && n.sobre.hazlo);
  const salida: { mision: Mision; hubo: string[] }[] = [];
  for (const m of plan.misiones) {
    if (!ABIERTAS.includes(estadoMision(m, plan, estado)) || (m.vigente && m.vigente >= desde)) continue;
    const suyas = recientes.filter((n) => n.sobre.tipo === 'mision' && n.sobre.id === m.id && !n.sobre.hazlo);
    const hubo = [
      ...commits.map((c) => `commit ${c.hash}: ${c.asunto}`),
      ...encargos.map((n) => `«Hazlo tú» ${n.id} (${n.sobre.id}${n.sobre.seccion ? ` › ${n.sobre.seccion}` : ''})`),
      ...suyas.map((n) => `nota ${n.id}${n.sobre.seccion ? ` (${n.sobre.seccion})` : ''}`),
    ];
    if (hubo.length) salida.push({ mision: m, hubo });
  }
  return salida;
}

/**
 * El plan que viene no es estático (notas de voz del titular, 22 de octubre de 2026: «que el plan futuro no sea estático
 * y el director no se dé cuenta de que algunas de esas cosas posiblemente ya las hizo»). Si desde `desde` (la última
 * revisión) hubo trabajo (commits del repositorio o «Hazlo tú» encargados), todo lo pendiente del plan se cruza con lo
 * hecho: las propuestas aceptadas sin ejecutar y los pedidos sin hacer, de cualquier fase, y con ellos las misiones
 * previstas de cada fase. Mientras el director no lo deje dicho en esta revisión (`alDia`), queda en la lista y la
 * revisión no se cierra. Antes, la regla existía solo como texto y solo las misiones abiertas se comprobaban.
 */
export function pendientePorComprobar(plan: Plan, estado: EstadoDirector, desde: string, commits: CommitReciente[]): { propuestas: Propuesta[]; pedidos: Pedido[] } {
  const hubo = commits.length > 0 || estado.notas.some((n) => n.cuando >= desde && n.sobre.tipo === 'mision' && n.sobre.hazlo);
  if (!hubo || (plan.alDia?.cuando ?? '') >= desde) return { propuestas: [], pedidos: [] };
  const fuera = reemplazos(plan);
  return { propuestas: aceptadasSinEjecutar(plan, estado).map((x) => x.propuesta), pedidos: (plan.pedidos ?? []).filter((p) => !p.hecho && !fuera.has(p.id)) };
}

/**
 * El «Quedó en» de lo que se integra o se aplaza lleva a su lugar exacto, nunca a la fase entera (la auditoría del 22 de
 * octubre de 2026: unas 14 respuestas llevaban a «la fase en curso», donde la petición no se encontraba, y así se
 * perdieron tres). Las respuestas escritas desde `desde` cuyo botón lleva a «La ruta» sin un ancla: un pedido, una
 * propuesta, una misión pasada, la puerta o el plan de la fase (`r-plan`).
 */
export function respuestasALaFaseEntera(plan: Plan, desde: string): string[] {
  return Object.entries(plan.respuestas ?? {})
    .filter(([, r]) => r.cuando >= desde && (r.tratamiento === 'integrada' || r.tratamiento === 'aplazada') && r.destino?.vista === 'ruta' && !r.destino.ancla)
    .map(([id]) => id);
}

/** Lo que una revisión que no se cerró alcanzó a dejar en el plan desde `desde` (cuando se lanzó): los ids. */
export interface LoQueDejo {
  respuestas: string[];
  revisiones: string[];
  misiones: string[];
  ejecutadas: string[];
  /** Con el punto de control (el plan del último commit de la memoria), también lo que no tiene fecha: */
  propuestas: string[];
  pedidos: string[];
  /** Los documentos nuevos en el plan, por su ruta. */
  documentos: string[];
  /** Los criterios que evaluó. */
  evaluacion: string[];
  /** Las demás partes del plan que cambió (el resumen, el mensaje, su cola, las fases…), por su nombre. */
  partes: string[];
}

/** Las partes del plan que se cuentan por unidad en LoQueDejo; las demás, por su nombre (`partes`). */
const POR_UNIDAD = new Set(['respuestas', 'revisiones', 'misiones', 'ejecutadas', 'propuestas', 'pedidos', 'documentos', 'evaluacion', 'actualizado', 'revisado']);

/** Los ids de una lista u objeto del plan que son nuevos o cambiaron de `antes` a `ahora`. Pura. */
function cambiados(antes: unknown, ahora: unknown, clave = 'id'): string[] {
  const porId = (x: unknown): Map<string, string> =>
    new Map(Array.isArray(x)
      ? x.filter((e) => e && typeof e === 'object' && typeof e[clave] === 'string').map((e) => [e[clave] as string, JSON.stringify(e)])
      : x && typeof x === 'object' ? Object.entries(x).map(([k, v]) => [k, JSON.stringify(v)]) : []);
  const a = porId(antes);
  return [...porId(ahora)].filter(([id, v]) => a.get(id) !== v).map(([id]) => id);
}

/**
 * Lo que dejó en el plan una revisión que no se cerró, para que la siguiente lo retome sin rehacerlo: las respuestas y
 * los veredictos escritos desde que se lanzó, las misiones que comprobó (`vigente`) y las propuestas que ejecutó. Con
 * `antes`, el punto de control (propuesta aceptada pr_retoma_automatica, punto 1): el plan del último commit de la
 * memoria, que es el del cierre anterior; entonces, unidad por unidad, todo lo que cambió desde él, también lo que no
 * tiene fecha (las misiones nuevas, las propuestas, los pedidos, los documentos, los criterios y las demás partes), que
 * con solo las fechas se volvía a escribir. Pura.
 */
export function loQueDejo(plan: Plan, desde: string, antes?: Partial<Plan> | null): LoQueDejo {
  const desdeAhi = (x: { cuando?: string } | undefined) => !!x?.cuando && x.cuando >= desde;
  const juntos = (a: string[], b: string[]) => [...new Set([...a, ...b])];
  const con = (k: keyof Plan, clave?: string) => (antes ? cambiados(antes[k], plan[k], clave) : []);
  const a = (antes ?? {}) as Record<string, unknown>;
  const p = plan as unknown as Record<string, unknown>;
  return {
    respuestas: juntos(Object.entries(plan.respuestas ?? {}).filter(([, r]) => desdeAhi(r)).map(([id]) => id), con('respuestas')),
    revisiones: juntos(Object.entries(plan.revisiones ?? {}).filter(([, r]) => desdeAhi(r)).map(([id]) => id), con('revisiones')),
    misiones: juntos((plan.misiones ?? []).filter((m) => !!m.vigente && m.vigente >= desde).map((m) => m.id), con('misiones')),
    ejecutadas: juntos(Object.entries(plan.ejecutadas ?? {}).filter(([, e]) => desdeAhi(e)).map(([id]) => id), con('ejecutadas')),
    propuestas: con('propuestas'),
    pedidos: con('pedidos'),
    documentos: con('documentos', 'ruta'),
    evaluacion: con('evaluacion'),
    partes: antes ? [...new Set([...Object.keys(p), ...Object.keys(a)])].filter((k) => !POR_UNIDAD.has(k) && JSON.stringify(p[k]) !== JSON.stringify(a[k])) : [],
  };
}

const PALABRAS_VACIAS = new Set('para como pero porque cuando donde desde hasta sobre entre este esta estos estas tiene tienen hace hacer quedo queda sigue todo toda todos todas cada otra otro otros otras solo tambien ahora antes despues mismo misma sino nada algo ellos ella esto eso aqui alla muy mas menos siempre nunca'.split(' '));
/** Las palabras con peso de una frase, sin tildes y por su raíz corta (así «publicada» y «publicado» son la misma). */
function palabrasDe(texto: string): Set<string> {
  const ws = texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().match(/[a-z0-9]{4,}/g) ?? [];
  return new Set(ws.filter((w) => !PALABRAS_VACIAS.has(w)).map((w) => w.slice(0, 6)));
}

/**
 * «Comentarios del director» no vuelve a contar «Lo que avanzamos» (docs/metodo/director/review-cycle.md › «Dónde quedamos»): las frases del mensaje
 * que dicen casi lo mismo que una línea de lo avanzado (al menos cuatro palabras con peso en común, y la mitad de las suyas).
 */
export function mensajeRepite(mensaje: string, avanzamos: string[]): { frase: string; linea: string }[] {
  const lineas = avanzamos.map((l) => ({ l, p: palabrasDe(l) }));
  const salida: { frase: string; linea: string }[] = [];
  for (const frase of frasesDe(mensaje)) {
    const p = palabrasDe(frase);
    if (p.size < 4) continue;
    const igual = lineas.find((x) => { const comunes = [...p].filter((w) => x.p.has(w)).length; return comunes >= 4 && comunes / p.size >= 0.5; });
    if (igual) salida.push({ frase, linea: igual.l });
  }
  return salida;
}

const frasesDe = (texto: string) => texto.split(/(?<=[.!?:;])\s+/).map((f) => f.trim()).filter(Boolean);

/**
 * El comentario de esta revisión no vuelve a decir lo que ya dijo el anterior: reescrito o alargado, el Studio lo
 * mostraría otra vez como nuevo (nota del titular del 21 de octubre). Igual al anterior no cuenta: no se vuelve a mostrar.
 */
export function mensajeRepiteAnterior(mensaje: string, anterior: string): { frase: string; linea: string }[] {
  if (!anterior.trim() || mensaje.trim() === anterior.trim()) return [];
  return mensajeRepite(mensaje, frasesDe(anterior));
}

/*
 * Los commits son del sistema, no de las personas (nota de voz del titular nmvov99tttit, 26 de octubre de 2026: «mantén
 * la información de los commits como algo interno […], no se lo presentes al usuario en ninguna de las partes del
 * estudio»). Un hash no dice nada a quien lee ni a quien escucha la voz: el Studio los quita de todo lo que muestra del
 * plan (planSinCommits) y --listo no cierra con uno nuevo escrito para las personas (commitsALaVista).
 */
const HASH = String.raw`\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{7,40}\b`;
const HASHES = String.raw`${HASH}(?:(?:,\s*|\s+(?:y|e|and)\s+)${HASH})*`;
const COMMIT = String.raw`commits?(?:\s+locale?s?)?`;
/** Si un texto nombra un commit por su hash. */
export const nombraCommit = (texto: string) => new RegExp(String.raw`\b${COMMIT}\s+${HASH}|\(${HASHES}\)`, 'i').test(texto);

/**
 * Un texto sin los hashes de commit: «(commit local abc1234)» y «(commits locales a, b y c)» se van enteros; en
 * «(commit local abc1234, de «X»)» queda «(de «X»)», y «en el commit abc1234», «en el commit».
 */
export function sinCommits(texto: string): string {
  if (!nombraCommit(texto)) return texto;
  return texto
    .replace(new RegExp(String.raw`\s*\((?:${COMMIT}:?\s+)?${HASHES}\)`, 'gi'), '')
    .replace(new RegExp(String.raw`\((?:${COMMIT}:?\s+)${HASHES}[,;]\s*`, 'gi'), '(')
    .replace(new RegExp(String.raw`\b(${COMMIT})\s+${HASHES}`, 'gi'), '$1');
}

/** El plan como lo ve una persona: cada texto, sin hashes de commit (los ids y las rutas no los traen). */
export function planSinCommits<T>(valor: T): T {
  if (typeof valor === 'string') return sinCommits(valor) as T;
  if (Array.isArray(valor)) return valor.map((v) => planSinCommits(v)) as T;
  if (valor && typeof valor === 'object') return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, planSinCommits(v)])) as T;
  return valor;
}

/**
 * Lo escrito para las personas en esta revisión que nombra un commit por su hash: el mensaje, el resumen, las respuestas
 * desde `desde`, los pedidos y las misiones sin entregar. Lo que ya estaba guardado no cuenta (el Studio ya lo muestra sin
 * el hash), y lo interno sí puede llevarlo: `hecho` de un pedido, `ejecutadas`, `alDia`.
 */
export function commitsALaVista(plan: Plan, guardado: Partial<Plan> | null, desde: string, entregadas: Set<string> = new Set()): string[] {
  const textos = (v: unknown): string[] =>
    typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(textos) : v && typeof v === 'object' ? Object.values(v).flatMap(textos) : [];
  const deLasPersonas = (p: Partial<Plan>, soloDesde: string | null) => [
    ...textos(p.mensaje?.texto),
    ...textos(p.resumen),
    ...Object.values(p.respuestas ?? {}).filter((r) => !soloDesde || (r?.cuando ?? '') >= soloDesde).flatMap((r) => textos(r?.texto)),
    ...(p.pedidos ?? []).flatMap((x) => textos(x.texto)),
    ...(p.misiones ?? []).filter((m) => !entregadas.has(m.id)).flatMap((m) => textos([m.titulo, m.porQue, m.entrega, m.pasos])),
  ];
  const antes = new Set(guardado ? deLasPersonas(guardado, null) : []);
  return [...new Set(deLasPersonas(plan, desde))].filter((t) => nombraCommit(t) && !antes.has(t));
}

/*
 * Nunca se pregunta por lo que aún no pasó (nota de voz del titular nmvptrd58tit, 26 de octubre de 2026, «una falla
 * crítica»): una misión que pide confirmar lo que pasará en la próxima revisión, o la próxima vez que algo ocurra, le
 * pregunta a la persona por algo que no puede ver todavía. Lo que hay que comprobar se provoca ahora (el paso arma el
 * escenario), lo comprueba el director si el registro lo dice, o la misión se escribe en la revisión en que ya pasó.
 */
const FUTURO = /\bpr[oó]xim[ao]s?\s+(?:revisi[oó]n|revisiones|vez|veces|nota|notas|audio|grabaci[oó]n)\b|\bsiguiente\s+revisi[oó]n\b|\brevisi[oó]n\s+siguiente\b|\bcuando\s+te\s+llame\b/i;

/**
 * Las misiones sin entregar escritas o cambiadas en esta revisión (las que no estaban igual en lo guardado) con un paso
 * que pregunta (trae opciones o termina en «?») por lo que aún no pasó, o con eso en su título: su id y la frase.
 */
export function misionesDeFuturo(plan: Plan, guardado: Partial<Plan> | null, entregadas: Set<string> = new Set()): { id: string; frase: string }[] {
  const antes = new Map((guardado?.misiones ?? []).map((m) => [m.id, JSON.stringify(m.pasos) + m.titulo]));
  const fallas: { id: string; frase: string }[] = [];
  for (const m of plan.misiones ?? []) {
    if (entregadas.has(m.id) || antes.get(m.id) === JSON.stringify(m.pasos) + m.titulo) continue;
    const preguntas = (m.pasos ?? []).filter((p) => typeof p !== 'string' && (p.opciones?.length || p.texto.trim().endsWith('?'))).map((p) => (p as { texto: string }).texto);
    for (const t of [m.titulo, ...preguntas]) {
      const f = t.match(FUTURO);
      if (f) fallas.push({ id: m.id, frase: f[0] });
    }
  }
  return fallas;
}

/**
 * Desde cuándo cuenta la revisión que se cierra: la marca de la anterior (`revisado`). Correr --listo otra vez antes del
 * commit, como pide CLAUDE.md, no la mueve: si la marca del plan es más nueva que la del último commit de la memoria, la
 * puso un --listo de esta misma revisión, y lo de esta revisión se sigue comprobando desde la anterior (propuesta aceptada
 * «El cierre no deja nada sin atender»: sin esto, la segunda corrida dejaba sin comprobar lo escrito antes de la primera,
 * y daba por viejo el lote corto de esta revisión).
 */
export const comienzoDeLaRevision = (marca: string | undefined, guardada: string | undefined): string =>
  marca && guardada && marca > guardada ? guardada : (marca ?? '');

/*
 * La cola autorizada no se vuelve a preguntar (nota de voz del titular nmvqvu1sctit, 27 de octubre de 2026, después de
 * tres misiones seguidas que solo pedían su visto bueno para seguir: «no me detengas cada vez que completas una parte de la
 * cola si no es absolutamente necesario que yo intervenga… ya yo lo autoricé en completo»). Lo que pide permiso para
 * seguir: lanzar el tramo que sigue, «¿sigo con ella?», el visto bueno para seguir.
 */
const PEDIR_SEGUIR =/\blanza(?:r)?\s+(?:el|un)\s+(?:siguiente\s+)?tramo\b|\btramo\s+que\s+sigue\b|\bsigo\s+con\s+(?:ella|ellas|mi\s+cola|la\s+cola|el\s+tramo)\b|\bvisto\s+bueno\s+para\s+seguir\b|\b(?:apruebas?|autorizas?)\s+que\s+siga\b/i;

/**
 * Con la cola del director autorizada entera (`colaAutorizada`), las misiones sin entregar escritas o cambiadas en esta
 * revisión que le piden a la persona permiso para seguir con ella, en su título, su entrega o un paso que pregunta: su id
 * y la frase. Sin la cola autorizada, ninguna: la primera aprobación del lanzamiento sí se pide.
 */
export function misionesQuePidenSeguir(plan: Plan, guardado: Partial<Plan> | null, entregadas: Set<string> = new Set()): { id: string; frase: string }[] {
  if (!plan.colaAutorizada) return [];
  const antes = new Map((guardado?.misiones ?? []).map((m) => [m.id, JSON.stringify(m.pasos) + m.titulo + m.entrega]));
  const fallas: { id: string; frase: string }[] = [];
  for (const m of plan.misiones ?? []) {
    if (entregadas.has(m.id) || antes.get(m.id) === JSON.stringify(m.pasos) + m.titulo + m.entrega) continue;
    const preguntas = (m.pasos ?? []).filter((p) => typeof p !== 'string' && (p.opciones?.length || p.texto.trim().endsWith('?'))).map((p) => (p as { texto: string }).texto);
    const f = [m.titulo, m.entrega, ...preguntas].map((t) => t?.match(PEDIR_SEGUIR)).find(Boolean);
    if (f) fallas.push({ id: m.id, frase: f[0] });
  }
  return fallas;
}

/**
 * Los hilos de lo hecho, explícitos (propuesta aceptada «Lo ya hecho, a una consulta», punto 1): el origen de cada misión
 * escrita o cambiada en esta revisión que no existe. Vale una propuesta, un pedido o una misión del plan unido con su
 * archivo, o una nota del equipo. Se comprueba al cerrar, donde están el archivo y las notas, y no en `validarPlan`: el
 * Studio valida el plan en cada consulta, y una nota que se borra no debe volver inválido lo ya guardado.
 */
export function origenesQueNoExisten(plan: Plan, notas: readonly { id: string }[], guardado: Partial<Plan> | null): { id: string; origen: string }[] {
  const antes = new Map((guardado?.misiones ?? []).map((m) => [m.id, JSON.stringify(m.origen ?? [])]));
  const hay = new Set([...(plan.propuestas ?? []), ...(plan.pedidos ?? []), ...(plan.misiones ?? []), ...notas].map((x) => x.id));
  return (plan.misiones ?? [])
    .filter((m) => m.origen?.length && antes.get(m.id) !== JSON.stringify(m.origen))
    .flatMap((m) => m.origen!.filter((o) => o === m.id || !hay.has(o)).map((origen) => ({ id: m.id, origen })));
}

/**
 * …y cada propuesta ejecutada en esta revisión (desde `desde`) dice con qué commit, y ese commit existe (`existe`, que
 * pregunta a git): sin él, lo hecho no se sigue hasta el código. Las ejecutadas antes de esta regla quedan como están.
 */
export function ejecutadasSinCommit(plan: Plan, desde: string, existe: (hash: string) => boolean): string[] {
  return Object.entries(plan.ejecutadas ?? {})
    .filter(([, e]) => e.cuando >= desde)
    .filter(([, e]) => !(e.nota.match(/\b(?=[0-9a-f]*\d)[0-9a-f]{7,40}\b/g) ?? []).some(existe))
    .map(([id]) => id);
}

/**
 * Lo que dice una línea, sin sus referencias: las direcciones, los hashes de commit y la palabra «commit» (con su
 * «local») no son lo avanzado. Así, la misma línea con su commit de más sigue siendo la misma, y dos avances distintos
 * no se parecen solo por nombrar la misma página o por terminar en «(commit local …)».
 */
const sinReferencias = (texto: string) => texto.replace(/https?:\/\/\S+|\bcommits?(?:\s+locale?s?)?\b|\b(?=[0-9a-f]*\d)[0-9a-f]{7,40}\b/gi, ' ');
/** Una línea palabra por palabra, sin sus referencias, tildes, mayúsculas ni puntuación: para ver si trae otra entera. */
const lineaPlana = (texto: string) => ` ${sinReferencias(texto).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
/** Las cifras de una línea, sin las de sus referencias (palabrasDe deja fuera las de menos de cuatro dígitos). */
const cifrasDe = (texto: string) => new Set(sinReferencias(texto).match(/\d+/g) ?? []);

/**
 * «Lo que avanzamos» no reescribe una línea ya guardada (propuesta aceptada «El cierre no deja nada sin atender», punto
 * 3; docs/metodo/director/review-cycle.md › «Dónde quedamos»): el Studio reconoce cada línea por su texto, así que una reescrita o alargada le
 * vuelve a aparecer al titular como nueva. Las líneas nuevas que dicen casi lo mismo que una guardada, por sus palabras
 * con peso y sin las referencias: casi todo lo suyo ya estaba ahí (al menos cuatro en común y tres de cada cuatro de
 * las suyas: la guardada con otras palabras, o con un commit o una cifra de más), o traen la guardada casi entera (al
 * menos seis en común y nueve de cada diez de las de ella: alargada, aunque lo agregado sea largo; si es más corta, la
 * guardada entera, palabra por palabra, dentro de la nueva, desde cuatro palabras con peso; y con menos, la misma con
 * otra puntuación o con su commit de más). Un avance nuevo del mismo tema trae lo suyo y comparte poco
 * más que el tema: no cuenta; tampoco el que cambia una cifra por otra (otro capítulo, otra versión, la fase siguiente,
 * un avance que subió), porque cada una trae una cifra que la otra no. Igual a una guardada (sin contar los espacios de
 * más) nunca cuenta, y sin guardadas (la primera revisión) no hay con qué comparar.
 */
export function lineasReescritas(nuevas: string[], guardadas: string[]): { linea: string; guardada: string }[] {
  const igual = (t: string) => t.replace(/\s+/g, ' ').trim();
  const yaEstan = new Set(guardadas.map(igual));
  const previas = guardadas.map((g) => ({ g, p: palabrasDe(sinReferencias(g)), t: lineaPlana(g), c: cifrasDe(g) }));
  const salida: { linea: string; guardada: string }[] = [];
  for (const linea of nuevas) {
    if (yaEstan.has(igual(linea))) continue;
    const p = palabrasDe(sinReferencias(linea));
    const t = lineaPlana(linea);
    const c = cifrasDe(linea);
    const repite = previas.find((x) => {
      if ([...c].some((n) => !x.c.has(n)) && [...x.c].some((n) => !c.has(n))) return false;
      if (x.p.size && (t === x.t || (x.p.size >= 4 && t.includes(x.t)))) return true;
      const comunes = [...p].filter((w) => x.p.has(w)).length;
      return (comunes >= 4 && comunes / p.size >= 0.75) || (comunes >= 6 && comunes / x.p.size >= 0.9);
    });
    if (repite) salida.push({ linea, guardada: repite.g });
  }
  return salida;
}

/**
 * Los temas de los comentarios del director: una viñeta por tema, que empieza por el tema en negrilla
 * («- **Sobre los sonidos:** …»), como lo aceptó el titular el 21 de octubre de 2026 («Cada nota con su tipo», parte 4).
 * «Dónde quedamos» muestra cada tema como una línea aparte, que se lee y se comenta sola. Una línea que no empieza con
 * viñeta sigue a la anterior; un comentario sin viñetas es un solo tema.
 */
export function temasDelMensaje(texto: string): string[] {
  const temas: string[] = [];
  for (const linea of texto.split(/\r?\n/)) {
    const l = linea.trim();
    if (!l) continue;
    const vineta = /^[-*•]\s+(.+)$/.exec(l);
    if (vineta) temas.push(vineta[1].trim());
    else if (temas.length) temas[temas.length - 1] += ` ${l}`;
    else temas.push(l);
  }
  return temas;
}

/**
 * Dos versiones de lo mismo: una línea reescrita con otras palabras o alargada (al menos cuatro palabras con peso en
 * común, y tres de cada cinco de la más corta). «Dónde quedamos» muestra solo la nueva.
 */
export function mismaIdea(a: string, b: string): boolean {
  const pa = palabrasDe(a);
  const pb = palabrasDe(b);
  const comunes = [...pa].filter((w) => pb.has(w)).length;
  return comunes >= 4 && comunes / Math.min(pa.size, pb.size) >= 0.6;
}

/** Un texto como se compara al buscar: sin tildes, sin mayúsculas y con los espacios seguidos en uno. */
const comoSeBusca = (texto: string) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ');

/**
 * Lo que se busca, en piezas: cada palabra suelta (sin la puntuación que la rodea) y lo que va entre comillas ("…", “…”
 * o «…») como una frase tal cual. Sin tildes ni mayúsculas.
 */
export function palabrasDeBusqueda(busqueda: string): string[] {
  const salida: string[] = [];
  for (const m of comoSeBusca(busqueda).matchAll(/"([^"]+)"|“([^”]+)”|«([^»]+)»|(\S+)/g)) {
    const pieza = m[4] !== undefined ? m[4].replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '') : (m[1] ?? m[2] ?? m[3]).trim();
    if (pieza) salida.push(pieza);
  }
  return salida;
}

/**
 * Si unos textos (lo que dice una nota, lo que se entendió de su audio, lo que respondió el director) traen todas las
 * piezas de una búsqueda, en cualquier orden y sin importar tildes ni mayúsculas: «caritas automaticas» encuentra «¿Las
 * caritas del director son automáticas?». Una pieza vale también como comienzo de palabra («carita» encuentra «caritas»).
 * Sin nada que buscar, todo coincide.
 */
export function coincideBusqueda(textos: (string | null | undefined)[], busqueda: string): boolean {
  const piezas = palabrasDeBusqueda(busqueda);
  if (!piezas.length) return true;
  const todo = comoSeBusca(textos.filter(Boolean).join('\n'));
  return piezas.every((p) => todo.includes(p));
}

export interface EvaluacionCriterio {
  fecha: string;
  estado: 'cumplido' | 'no_aplica';
  nota: string;
}

/**
 * Los comentarios del director sobre su última revisión («Comentarios del director», en «¿Dónde quedamos?»). Lo que
 * hace cada persona ya no va aquí: lo dice su misión, y `personas`, que nadie leía, salió (pr_limpieza, punto 3).
 */
export interface Mensaje {
  fecha: string;
  texto: string;
}

const NOTAS_BOLETIN = ['A', 'B', 'C', 'D', 'F'] as const;
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
  /** Lo que pidió el equipo en sus notas y quedó por hacer, cada pedido con su fase y su estado (ver `Pedido`). */
  pedidos?: Pedido[];
  /**
   * El orden de la cola del director (`colaDelDirector`): los ids de las propuestas aceptadas y de los pedidos, en el
   * orden en que él decide hacerlos. Es su cola, aparte de las misiones de cada persona.
   */
  colaDirector?: string[];
  /**
   * Cuándo cruzó el director todo lo pendiente del plan (lo aceptado sin ejecutar, lo pedido sin hacer y las misiones
   * previstas de cada fase) con lo hecho desde la revisión anterior, y qué encontró (`pendientePorComprobar`).
   */
  alDia?: { cuando: string; nota: string };
  /**
   * El lote corto de cada persona (`reservaSinRazon`): cuándo lo escribió el director, por qué esa persona queda con menos
   * de RESERVA_MINIMA misiones, cuáles son las del lote (`lote`: sus misiones a la mano) y en cuál de los tres casos cae
   * (`motivo`, MOTIVOS_LOTE_CORTO; sin él, `revision`). El Studio lo muestra en «Lo que sigue», debajo de su misión.
   */
  reservaCorta?: Record<Persona, { cuando: string; razon: string; lote?: string[]; motivo?: MotivoLoteCorto }>;
  /**
   * La cola del director, autorizada entera por quien dirige: cuándo y en qué nota (nota de voz del titular nmvqvu1sctit,
   * 27 de octubre de 2026: «tienes autorización para ejecutar todo lo que tengas en cola… no me detengas cada vez que
   * completas una parte de la cola si no es absolutamente necesario»). Con ella, el lote corto de la cola ya no trae una
   * misión de aprobar su lanzamiento, y ninguna misión le pregunta a la persona si el director sigue (`misionesQuePidenSeguir`).
   */
  colaAutorizada?: { cuando: string; nota: string };
  /**
   * El tramo que sigue de la cola del director, como lo estima él al cerrar (pedido pd_revisiones_seguidas: la elección
   * del titular en t_encadenar_revisiones y su nota de voz nmvqwclpitit, 27 de octubre de 2026). `seguir`: si las
   * revisiones seguidas lanzan la siguiente (falso si algo de verdad necesita a la persona antes, o si la cola se acabó),
   * con su `razon`; `minutos`: cuánto estima que dura la siguiente, que el Studio usa como su límite (limiteDelTramo).
   * Vale solo para la revisión que sigue: `bandeja.ts --listo` quita el de una revisión anterior.
   */
  tramo?: Tramo;
}

/** El tramo que sigue de la cola del director (`Plan.tramo`). */
export interface Tramo {
  cuando: string;
  seguir: boolean;
  razon: string;
  minutos?: number;
}

/**
 * Los minutos de una revisión del director: los que estimó el director para el tramo que sigue (`Plan.tramo.minutos`),
 * entre lo de siempre (`base`) y TOPE_MIN_TRAMO, para una ejecución larga (nota de voz del titular nmvqwclpitit: «una
 * especie de pre-evaluación de cuánto puede durar»). Sin estimación, lo de siempre. Pura. El tope bajó de 180 a 90 con
 * la decisión del titular nmvsptkshtit (28 de octubre de 2026, «Revisiones más cortas», parte 5): revisiones más cortas,
 * encadenadas, que releen menos y dejan lo hecho antes.
 */
export const TOPE_MIN_TRAMO = 90;
/** Lo de siempre: los minutos de una revisión lanzada por el Studio sin estimación del director (revisor.ts › MAX_MIN). */
export const MAX_MIN_REVISION = 60;
export function limiteDelTramo(tramo: Tramo | undefined | null, base = MAX_MIN_REVISION): number {
  const m = tramo?.minutos;
  if (typeof m !== 'number' || !Number.isFinite(m)) return base;
  return Math.min(TOPE_MIN_TRAMO, Math.max(base, Math.round(m)));
}

/**
 * Lo que falta del tramo al cerrar (`bandeja.ts --listo`), o vacío: con revisiones seguidas en marcha, el director dice en
 * esta revisión si su cola sigue; y nunca que sigue con su cola vacía. Pura.
 */
export function tramoPorCerrar(tramo: Tramo | undefined, desde: string, enCadena: boolean, cola: number): string {
  const deAhora = !!tramo && Date.parse(tramo.cuando) >= Date.parse(desde);
  if (enCadena && !deAhora) return 'van revisiones seguidas y no dijiste si tu cola sigue. Escribe `"tramo": { "cuando": "<ISO ahora>", "seguir": true | false, "razon": "…", "minutos": <cuánto estimas que dura la siguiente> }`: `seguir` falso si algo de verdad necesita a la persona antes de seguir, o si tu cola se acabó.';
  if (deAhora && tramo!.seguir && !cola) return 'el tramo dice que tu cola sigue (`tramo.seguir`), y tu cola está vacía: ponle `"seguir": false`, con su razón.';
  return '';
}

/**
 * Un pedido: lo que alguien del equipo pidió en una nota (o en la sesión del director) y el director se comprometió a
 * hacer. Antes vivía solo en el texto de su respuesta o en una frase de las misiones previstas de una fase, sin estado, y
 * se perdía de vista (nota de voz del titular, 22 de octubre de 2026: «no las está almacenando»). Aquí queda con su fase
 * hasta que se hace (`hecho`, con cómo: el commit o la misión); el Studio lo muestra en «La ruta» y la misión que cierra
 * la fase lo espera, como a una propuesta aceptada.
 */
export interface Pedido {
  id: string;
  fase: string;
  /** Lo que se pidió, en una frase, en las palabras de quien lo pidió. */
  texto: string;
  /** Las notas donde se pidió (ids del Buzón). */
  notas?: string[];
  /** Cuándo y cómo quedó hecho. */
  hecho?: { cuando: string; nota: string };
  /**
   * Se hace en el cierre de su fase, después de que el titular declara completo el trabajo (el paquete de instalación, lo
   * que hay que sacar antes de armarlo): no retiene las misiones del cierre, que lo traen. Sin esto, el pedido y el cierre
   * se esperarían el uno al otro.
   */
  alCierre?: boolean;
  /** Los pedidos o las propuestas que este reemplaza (`reemplazos`): salen de lo pendiente y van al archivo. */
  reemplaza?: string[];
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
  /**
   * Se entregó sin terminar, con «No me salió»: el número del paso que no salió (desde 0). La marca la pone el Studio al
   * entregar, no se deduce después: si el plan cambia tras la entrega, un paso nuevo sin marcar no es uno que se trabó.
   */
  sinTerminar?: number;
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
 * La marca que presenta las decisiones de una parte: «Para decidir:», con sus dos puntos (también en negrilla), o al
 * empezar un renglón. Nombrada de pasada en una frase («con «Para decidir» si hace falta»), no: así CLAUDE.md volvía
 * decisiones los seis pasos de «Cuando el titular da la meta por lograda», y la tarjeta de antes quedaba cortada en su
 * «Entonces:» (notas de voz del titular nmvn1msq6tit y nmvn1nj16tit, 24 de octubre de 2026).
 */
const MARCA_DECIDIR = /para decidir\s*(\*\*|__)?\s*:|^\s*(\*\*|__)?\s*para decidir\b/im;

/**
 * Las decisiones que el director pide en una parte de un documento: cada una se responde aparte, con su propio
 * comentario o audio, y aparece una sola vez, al final de la parte que la explica (sin un resumen al final del
 * documento que las repita). Una parte tiene decisiones si trae la marca «Para decidir:» (MARCA_DECIDIR), si su título
 * habla de decidir o si lleva la marca <!-- decisiones -->; sus decisiones son los puntos de su última lista numerada.
 * Devuelve el nombre de cada una: su número y lo que va en negrilla al empezar (o el comienzo del texto).
 */
export function decisionesDe(titulo: string, md: string): string[] {
  // Un bloque de código es un ejemplo (el formato de un documento, con su «Para decidir:»): no pide decidir nada
  let enCodigo = false;
  const fuera = md
    .split(/\r?\n/)
    .filter((l) => {
      if (/^ {0,3}(```|~~~)/.test(l)) return void (enCodigo = !enCodigo);
      return !enCodigo;
    })
    .join('\n');
  // Lo nombrado entre comillas tampoco («con sus «Para decidir»»): se busca la marca sin ello, en el mismo lugar
  const desde = fuera.replace(/«[^«»]*»/g, (q) => ' '.repeat(q.length)).search(MARCA_DECIDIR);
  if (!/decid/i.test(titulo) && desde < 0 && !fuera.includes('<!-- decisiones -->')) return [];
  // Con «Para decidir», solo cuenta la lista que va después: la de antes es parte de la explicación
  const texto = desde >= 0 && !/decid/i.test(titulo) ? fuera.slice(desde) : fuera;
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

/**
 * Lo vigente, el primer bloque del paquete de cada revisión (decidido el 23 de octubre de 2026 en «El paquete de cada
 * revisión», parte 10; pedido pd_lo_vigente): las decisiones de los documentos que siguen en firme, una por decisión, de
 * la más vieja a la más nueva. Cada decisión la deja la última nota que la decide (otra posterior sobre la misma decisión
 * la reemplaza sola), y la que deja sin efecto una de otra parte lo dice en su respuesta (`Respuesta.reemplaza`), que la
 * saca de aquí. Lo reemplazado no se borra: se sigue encontrando por su id en el Buzón y en el archivo.
 */
export function decisionesVigentes(respuestas: Record<string, Respuesta>, notas: readonly Nota[]): Nota[] {
  const reemplazadas = new Set(Object.values(respuestas).flatMap((r) => r?.reemplaza ?? []));
  const ultima = new Map<string, Nota>();
  for (const n of notas.filter(decideDecision).sort((a, b) => a.cuando.localeCompare(b.cuando)))
    ultima.set(`${n.sobre.id}\u0000${textoPlano(n.sobre.seccion ?? '')}\u0000${n.sobre.decision}`, n);
  return [...ultima.values()].filter((n) => !reemplazadas.has(n.id));
}

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
   * la opción que eligió con un clic (el paso queda hecho); `YA_LO_DIJE` si lo dio por respondido con su ✉ de ese paso
   * (`comentarioDe`). `hazlo`, en un paso con `hazlo`: le encargó el paso al
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

/**
 * El tope de todo texto libre que se escribe en el Studio (una nota, un comentario, la corrección de una transcripción,
 * la nota de una entrega, un motivo, el contexto, la meta, cuándo está terminado, el papel de alguien): uno solo y
 * generoso, más que un dictado de una hora (de 55.000 a 65.000 caracteres), y que el director lee entero en su revisión.
 * El servidor guarda cada texto entero o lo rechaza, nunca lo corta (estudio/servidor/topes.ts).
 */
export const MAX_TEXTO = 100_000;

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

/**
 * Los pasos que quedaron sin marcar en una misión entregada (nota del titular, 22 de octubre de 2026: una orden falló, su
 * comprobación no dejaba marcar el paso y se quedó sin poder seguir con otras misiones). Un paso de afuera que no sale no
 * atrapa a nadie: la persona entrega la misión tal como está, con lo que pasó, y sigue con la siguiente. El director no la
 * aprueba por lo marcado: hace él lo que falta, si puede, o la devuelve con el paso corregido.
 */
export function pasosSinMarcar(m: { pasos: Paso[] }, hechos: number[]): number[] {
  return m.pasos.map((_, i) => i).filter((i) => !hechos.includes(i));
}

export interface PedidoFuera {
  mision: Mision;
  /** El número del paso, desde 0. */
  paso: number;
  texto: string;
  /** Lo que eligió la persona en ese paso, si tenía opciones. */
  eleccion?: string;
  /** Cuándo se aprobó la misión. */
  aprobada: string;
}

/**
 * Lo que el director pidió hacer fuera del Studio en las misiones aprobadas desde `desde`: los pasos que solo puede
 * hacer la persona (`soloTu`), los de una orden de terminal y los que llevan a una página de afuera, con lo que eligió.
 * El director empieza cada revisión sin memoria y la bandeja solo muestra las misiones abiertas: así sabe qué cambió
 * afuera porque él lo pidió (renombrar una rama, correr una orden) y no lo trata como idea de otro (propuesta aceptada
 * «Que cada revisión empiece sabiendo lo que el director te pidió hacer fuera del Studio», 20 de octubre).
 */
export function pedidoFueraDelStudio(plan: Plan, notas: Nota[], desde: string): PedidoFuera[] {
  const fuera: PedidoFuera[] = [];
  for (const m of plan.misiones) {
    const r = plan.revisiones?.[m.id];
    if (!r || r.veredicto !== 'aprobada' || r.cuando < desde) continue;
    m.pasos.forEach((p, i) => {
      if (typeof p === 'string' || (p.soloTu === undefined && !p.terminal && !p.ir?.url)) return;
      const eleccion = notas.filter((n) => n.sobre.tipo === 'mision' && n.sobre.id === m.id && n.sobre.seccion === `Paso ${i + 1}` && n.sobre.eleccion).at(-1)?.sobre.eleccion;
      fuera.push({ mision: m, paso: i, texto: p.terminal ? `${p.texto} (orden: ${p.terminal})` : p.texto, ...(eleccion ? { eleccion } : {}), aprobada: r.cuando });
    });
  }
  return fuera.sort((a, b) => b.aprobada.localeCompare(a.aprobada) || a.paso - b.paso);
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

/*
 * REGLA CRÍTICA DE LOS CORTES. El titular lee cada documento de a una idea: un corte malo (un título solo, una imagen
 * lejos de su texto, una tabla o un bloque partidos, algo que se pierde) le quita credibilidad a todo el Studio. Por eso:
 * - Nada se pierde ni se reordena: cada renglón con contenido queda en una sola idea, en su orden.
 * - Lo que es un elemento completo no se parte nunca: un bloque de código o de fórmulas, una tabla, una cita, un bloque
 *   HTML (como <details>), un comentario de varias líneas, un punto con lo que lleva adentro.
 * - Lo que no es una idea por sí solo va con lo que le da sentido: un título con lo que presenta (o, si presenta una
 *   decisión, como rótulo), un párrafo que termina en «:» con lo que anuncia, una imagen o un video sin texto con lo
 *   que ilustra, una leyenda con su tabla o su imagen, un renglón corto con su vecino.
 * Todo formato nuevo que se sume al corte llega con su caso en «la auditoría de los cortes» (director.test.ts) y, si se
 * puede escribir mal, con su aviso en `ideasSueltas`, que la bandeja corre sobre cada documento por leer.
 */

/** Hasta cuántos caracteres un párrafo es demasiado corto para ser una idea aparte. */
const CORTO = 140;
/** Hasta cuántos caracteres (un renglón) un párrafo sin párrafos al lado va con su lista, tabla o bloque vecino. */
const SUELTO = 80;
/** Hasta cuántos caracteres (unos 10 renglones) un párrafo que anuncia una lista se lee junto con la lista entera. */
const LARGO = 900;
/** Desde cuántos caracteres (unos 15 renglones) un párrafo o un punto es demasiado largo para leerlo como una idea. */
const EXTENSO = 1400;
/** Hasta cuántos caracteres (unos tres renglones) un punto de lista es corto: los cortos seguidos se leen de una vez. */
const PUNTO_CORTO = 270;
/** Hasta cuántos caracteres (unos 30 renglones) mide un bloque de puntos cortos: una lista más larga va en varios. */
const TOPE_LISTA = 2700;
/** Un punto de lista de primer nivel, como lo reconoce el corte. */
const PUNTO = /^ ?([-*+]|\d+[.)])\s+/;
/**
 * Un punto corto, de uno a tres renglones: poco texto y a lo sumo tres líneas, sin un bloque de código, de fórmulas o
 * una tabla adentro (eso ya no se lee de un vistazo, aunque mida poco).
 */
const esPuntoCorto = (md: string) =>
  visible(md).length <= PUNTO_CORTO && md.split('\n').filter((l) => l.trim()).length <= 3 && !/^\s*(`{3,}|~{3,}|\$\$|\|)/m.test(md);

/**
 * Los puntos de un bloque que se lee de una vez (una lista de puntos cortos), en orden y sin el párrafo que lo anuncia:
 * el Studio le pone a cada uno su ✉, para comentarlo aparte. Una idea que no es un bloque de puntos no trae ninguno.
 */
export function puntosDelBloque(t: Trozo): string[] {
  const puntos = t.tipo === 'punto' && !t.decision && t.piezas ? t.piezas.filter((p) => PUNTO.test(p)) : [];
  return puntos.length > 1 ? puntos : [];
}

/**
 * El Markdown de un bloque de puntos cortos, listo para dibujarlo: sus puntos pegados, uno por renglón. El corte junta
 * el párrafo que anuncia una lista con ella dejando un renglón vacío entre cada punto, y una lista así es «suelta»: se
 * dibuja con un párrafo por punto, con su margen, el ✉ cae en otra fila y los puntos quedan separados (nota de voz del
 * titular, 22 de octubre de 2026: el ✉ en el mismo renglón y sin tanto espacio entre puntos). Solo cambia cómo se
 * dibuja: el texto de la idea (y con él su huella y su «Entendido») queda igual. Lo que va antes del primer punto y
 * después del último no se toca; si los puntos no están en el texto, vuelve el texto tal cual.
 */
export function mdDeBloqueDePuntos(md: string, puntos: string[]): string {
  let desde = 0;
  let salida = '';
  for (let k = 0; k < puntos.length; k++) {
    const i = md.indexOf(puntos[k], desde);
    if (i < 0) return md;
    const entre = md.slice(desde, i);
    salida += k > 0 && !entre.trim() ? '\n' : entre;
    salida += puntos[k];
    desde = i + puntos[k].length;
  }
  return salida + md.slice(desde);
}

/** Lo que se lee de un texto en Markdown, para medirlo: sin marcas ni comentarios, sin imágenes, y los enlaces en su texto. */
const visible = (md: string) =>
  md
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<\/?[a-zA-Z][^>]*>/g, '')
    .replace(/[*_`#>|]/g, '')
    .trim();
/** Una imagen, un video o un marco sin texto alrededor: no es una idea, ilustra la de al lado. */
const conMedio = (md: string) => /!\[[^\]]*\]\([^)]*\)|<(img|video|iframe|picture|audio|svg)\b/i.test(md);
const soloMedio = (md: string) => conMedio(md) && !visible(md);
/** Un renglón que es solo un título: un `###`, o una frase entera en negrilla sin «:» al final. */
const lineaTitulo = (l: string) => /^ {0,3}#{1,6}\s+\S/.test(l) || /^(\*\*|__)[^*_]+(\*\*|__)$/.test(l.trim());
/** Un título suelto (o varios seguidos, «### Costos» y «#### Del modelo»): solo presenta lo que sigue. */
const esTitulo = (md: string) => md.split(/\n+/).every((l) => lineaTitulo(l)) && !/:\s*(\*\*|__)?$/.test(md.trim());
/** Las etiquetas HTML que abren un bloque: se toma entero, hasta la que lo cierra. */
const BLOQUE_HTML = /^ {0,3}<(details|div|figure|table|section|aside|center|picture|video|audio|iframe|svg|dl|ul|ol|pre|p|blockquote)(?=[\s>/])/i;

/**
 * Parte una parte de un documento (sin su título `##`) en ideas, para leerla y asimilarla de a una: cada párrafo, cada
 * punto de una lista de primer nivel (con lo que lleva adentro), y cada tabla, cita o bloque de código. Un párrafo muy
 * corto se junta con su vecino. Los puntos de la lista de decisiones (la última numerada, si la parte pide decidir)
 * llevan su nombre.
 */
export function trozosDeParte(titulo: string, md: string): Trozo[] {
  // `pegado`: venía sin renglón vacío antes (una leyenda pegada a su tabla o a su imagen)
  const trozos: (Trozo & { lista?: number; ordenada?: boolean; pegado?: boolean })[] = [];
  const lineas = md.split(/\r?\n/);
  const item = /^ ?([-*+]|\d+[.)])\s+/; // de primer nivel: con más sangría, va dentro del punto anterior
  const titular = /^ {0,3}#{1,6}\s/;
  let i = 0;
  let listas = 0;
  let enLista: number | null = null; // la lista abierta (para saber cuáles puntos van juntos)
  const bloque = (desde: number, hasta: number) => {
    trozos.push({ md: lineas.slice(desde, hasta).join('\n'), tipo: 'bloque', pegado: desde > 0 && !!lineas[desde - 1].trim() });
    enLista = null;
    i = hasta;
  };
  while (i < lineas.length) {
    const l = lineas[i];
    if (!l.trim() || /^##\s/.test(l) || /^\s*<!--.*-->\s*$/.test(l) || /^ {0,3}([-*_])( *\1){2,}\s*$/.test(l)) {
      // Un renglón vacío no cierra la lista: la cierra lo que venga sin sangría y sin ser un punto
      i++;
      continue;
    }
    // Un comentario de varias líneas no se lee: no se muestra
    if (/^\s*<!--/.test(l) && !l.includes('-->')) {
      let j = i + 1;
      while (j < lineas.length && !lineas[j].includes('-->')) j++;
      i = j + 1;
      continue;
    }
    // Un bloque de código (``` o ~~~, cerrado por la misma marca, igual de larga o más) o de fórmulas ($$), entero
    const cerca = /^ {0,3}(`{3,}|~{3,}|\$\$)/.exec(l);
    if (cerca) {
      const marca = cerca[1];
      const cierra = marca === '$$' ? (s: string) => s.trim().endsWith('$$') : (s: string) => new RegExp(`^ {0,3}\\${marca[0]}{${marca.length},}\\s*$`).test(s);
      const enUna = marca === '$$' && l.trim().length > 4 && l.trim().endsWith('$$');
      let j = i + 1;
      if (!enUna) {
        while (j < lineas.length && !cierra(lineas[j])) j++;
        j++;
      }
      bloque(i, Math.min(j, lineas.length));
      continue;
    }
    // Un bloque HTML (<details>, <figure>, <div>…), entero hasta la etiqueta que lo cierra; si no la tiene, hasta el renglón vacío
    const html = BLOQUE_HTML.exec(l);
    if (html) {
      const cierre = new RegExp(`</${html[1]}\\s*>`, 'i');
      let j = i;
      while (j < lineas.length && !cierre.test(lineas[j])) j++;
      if (j < lineas.length) j++;
      else for (j = i + 1; j < lineas.length && lineas[j].trim(); ) j++;
      bloque(i, j);
      continue;
    }
    if (/^\s*\|/.test(l) || /^ {0,3}>/.test(l)) {
      const tabla = /^\s*\|/.test(l);
      let j = i;
      while (j < lineas.length && (tabla ? /^\s*\|/.test(lineas[j]) : lineas[j].trim() && !/^\s*$/.test(lineas[j]))) j++;
      bloque(i, j);
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
        } else if (!/^\s/.test(s) && (!lineas[j - 1].trim() || titular.test(s) || /^(```|~~~|\||>)/.test(s))) break;
        j++;
      }
      trozos.push({ md: lineas.slice(i, j).join('\n').trimEnd(), tipo: 'punto', lista: enLista, ordenada });
      i = j;
      continue;
    }
    // Un párrafo: hasta el renglón vacío o hasta que empiece otra cosa (un punto, un bloque, una tabla, un título)
    let j = i + 1;
    while (j < lineas.length && lineas[j].trim() && !item.test(lineas[j]) && !/^ {0,3}(```|~~~|>|\||\$\$)/.test(lineas[j]) && !titular.test(lineas[j]) && !BLOQUE_HTML.test(lineas[j])) j++;
    const texto = lineas.slice(i, j).join('\n');
    const plano = visible(texto);
    trozos.push({ md: texto, tipo: plano.length <= 60 && /:$/.test(plano) ? 'rotulo' : 'parrafo', pegado: i > 0 && !!lineas[i - 1].trim() });
    enLista = null;
    i = j;
  }
  // Las decisiones: los puntos de la última lista numerada, si la parte pide decidir
  const decisiones = decisionesDe(titulo, md);
  const ultima = decisiones.length ? [...trozos].reverse().find((t) => t.ordenada)?.lista : undefined;
  const plano = visible;
  // Un título suelto («### A favor», «**En contra**», o varios seguidos): solo presenta lo que sigue, no es una idea
  const titulillo = (t: Trozo) => t.tipo === 'parrafo' && esTitulo(t.md);
  // Un párrafo que termina en «:» anuncia lo que sigue: cortado ahí no se entiende. Va con su lista (entera, si es
  // corta; si no, con su primer punto), con su tabla o bloque, o con el párrafo que sigue, aunque juntos sean largos: la
  // tarjeta crece, pero nunca se corta en sus dos puntos (nota de voz del titular nmvn1msq6tit, 24 de octubre de 2026).
  // Un título suelto también, y con lo que siga, sea lo que sea. La lista de decisiones no: la presenta su rótulo.
  for (let k = 0; k < trozos.length - 1; k++) {
    const t = trozos[k];
    const sig = trozos[k + 1];
    if (t.tipo !== 'parrafo' && t.tipo !== 'rotulo') continue;
    const titulo = titulillo(t);
    // Anuncia si su último renglón termina en «:» (no si ya trae lo anunciado, como una imagen)
    if ((!titulo && !/:$/.test(plano(t.md.trim().split('\n').pop()!))) || sig.tipo === 'rotulo') continue;
    if (sig.lista !== undefined && sig.lista === ultima) continue;
    let hasta = k + 1;
    if (sig.lista !== undefined) {
      let fin = k + 1;
      while (trozos[fin + 1]?.lista === sig.lista) fin++;
      const largo = trozos.slice(k, fin + 1).reduce((n, x) => n + plano(x.md).length, 0);
      // Una lista de puntos cortos se lee de una vez, también con lo que la anuncia, hasta el tope de un bloque
      const deCortos = fin > k + 1 && trozos.slice(k + 1, fin + 1).every((x) => !x.piezas && esPuntoCorto(x.md));
      if (largo <= (deCortos ? TOPE_LISTA : LARGO)) hasta = fin;
    }
    const juntos = trozos.slice(k, hasta + 1);
    const piezas = juntos.filter((x) => x.tipo !== 'rotulo').flatMap((x) => x.piezas ?? [x.md]);
    trozos.splice(k, juntos.length, { ...sig, md: juntos.map((x) => x.md).join('\n\n'), piezas, pegado: t.pegado });
    k--; // lo juntado puede anunciar a su vez lo que sigue
  }
  // Un título que presenta un rótulo o una decisión («### Lo que falta» antes de «**Para decidir:**») tampoco es una
  // idea: se muestra como rótulo, junto con lo que presenta. Nunca queda pegado al final de la idea de antes.
  trozos.forEach((t, k) => {
    if (titulillo(t) && k < trozos.length - 1) t.tipo = 'rotulo';
  });
  // Los puntos cortos seguidos de una lista (de hasta unos tres renglones cada uno) se leen de una vez, como un solo
  // bloque con un ✉ en cada punto: veinte clics en «Entendido» por una lista no es leer (nota de voz del titular, 22 de
  // octubre de 2026). Un punto largo se lee solo y corta el tramo; un tramo de más de TOPE_LISTA va en bloques seguidos,
  // ninguno de un solo punto. La lista de decisiones nunca se junta: cada decisión se responde aparte.
  const corto = (x: (typeof trozos)[number]) => !x.piezas && esPuntoCorto(x.md);
  for (let k = 0; k < trozos.length; k++) {
    const l = trozos[k].lista;
    if (l === undefined || l === ultima || !corto(trozos[k])) continue;
    let fin = k;
    while (trozos[fin + 1]?.lista === l && corto(trozos[fin + 1])) fin++;
    const tramo = trozos.slice(k, fin + 1);
    if (tramo.length < 2) continue;
    const bloques: (typeof trozos)[] = [[]];
    let medida = 0;
    for (const x of tramo) {
      const ultimo = bloques[bloques.length - 1];
      if (ultimo.length >= 2 && medida + plano(x.md).length > TOPE_LISTA) {
        bloques.push([x]);
        medida = plano(x.md).length;
      } else {
        ultimo.push(x);
        medida += plano(x.md).length;
      }
    }
    // El último bloque no queda con un solo punto: toma uno del anterior o, si este quedaría solo, se le suma
    const ultimo = bloques[bloques.length - 1];
    const anterior = bloques[bloques.length - 2];
    if (anterior && ultimo.length === 1) {
      if (anterior.length > 2) ultimo.unshift(anterior.pop()!);
      else anterior.push(...bloques.pop()!);
    }
    const juntos = bloques.map((b) => ({ ...b[0], md: b.map((x) => x.md).join('\n'), piezas: b.map((x) => x.md) }));
    trozos.splice(k, tramo.length, ...juntos);
    k += juntos.length - 1;
  }
  // Un párrafo corto que no dice nada por sí solo (una transición, un aviso, un título) no es una idea aparte: va con
  // el párrafo de antes; si no lo hay, con el de después; y si tampoco, con lo que tenga al lado (un punto, una tabla).
  // Detenerse a marcarlo no vale la pena. Lo único con lo que no se junta es una decisión ni un rótulo.
  const juntable = (x: (typeof trozos)[number] | undefined) => !!x && x.tipo !== 'rotulo' && (ultima === undefined || x.lista !== ultima);
  const unir = (destino: (typeof trozos)[number], md: string, antes: boolean) => {
    destino.piezas = [...(destino.piezas ?? [destino.md]), md];
    destino.md = antes ? `${md}\n\n${destino.md}` : `${destino.md}\n\n${md}`;
  };
  // Una imagen o un video sin texto va con lo que ilustra: lo de antes o, si no se puede, lo de después. Una leyenda
  // (pegada a su tabla o imagen, en cursiva, o que empieza «Figura», «Tabla», «Fuente»…) va con lo de antes.
  const leyenda = (t: (typeof trozos)[number], antes: (typeof trozos)[number] | undefined) =>
    !!antes &&
    (antes.tipo === 'bloque' || soloMedio(antes.md) || /!\[[^\]]*\]\([^)]*\)\s*$/.test(antes.md)) &&
    (!!t.pegado || /^(\*[^*].*\*|_[^_].*_)$/s.test(t.md.trim()) || /^(figura|fig\.|tabla|fuente|imagen|captura|gráfico|grafico|foto|video)\b/i.test(plano(t.md)));
  for (let k = 0; k < trozos.length; k++) {
    const t = trozos[k];
    const antes = trozos[k - 1];
    const despues = trozos[k + 1];
    if (t.tipo !== 'rotulo' && !t.decision && soloMedio(t.md)) {
      if (juntable(antes)) unir(antes, t.md, false);
      else if (juntable(despues)) unir(despues, t.md, true);
      else continue;
      trozos.splice(k--, 1);
      continue;
    }
    // Con una imagen adentro ya no es corto: la imagen es su contenido («Así se ve:» y la captura)
    if (t.tipo !== 'parrafo' || plano(t.md).length > CORTO || conMedio(t.md)) continue;
    const suelto = plano(t.md).length <= SUELTO;
    // Lo que empieza con un título nunca va al final de lo de antes ni en medio de lo de después: bajo un título va lo
    // que sigue hasta el título siguiente. Un título con poco texto se lee con lo que sigue bajo él; si no hay, solo.
    const conTitulo = (x: (typeof trozos)[number] | undefined) => !!x && lineaTitulo(x.md.split('\n')[0]);
    const despuesSirve = juntable(despues) && !conTitulo(despues);
    if (conTitulo(t) && !esTitulo(t.md)) {
      if (despuesSirve) unir(despues!, t.md, true);
      else continue;
    } else if (leyenda(t, antes) && juntable(antes)) unir(antes, t.md, false);
    else if (antes?.tipo === 'parrafo') unir(antes, t.md, false);
    else if (despues?.tipo === 'parrafo' && despuesSirve) unir(despues, t.md, true);
    else if (suelto && despuesSirve) unir(despues!, t.md, true);
    else if (suelto && juntable(antes)) unir(antes!, t.md, false);
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
const proyectoContado = (p: Proyecto) => !!(p.contexto?.trim() && p.metaInicial?.trim() && p.terminado?.trim());

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
function valorIndicador(c: Criterio, fase: Fase, ctx: Contexto): number | null {
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

/** ¿Cierra su fase? La que cruza su puerta (un paso que se marca con esa puerta) o la que el director marca `alCierre`. */
export function esDeCierre(m: Mision): boolean {
  return !!m.alCierre || m.pasos.some((p) => typeof p !== 'string' && p.hecho?.que === 'puerta' && p.hecho.id === m.fase);
}

/**
 * Lo aprobado que una misión de cierre espera: las propuestas aceptadas sin ejecutar de su fase o de una anterior (una
 * aceptada en una fase ya cruzada sigue siendo trabajo por hacer, no se pierde).
 */
export function aprobadoAntesDelCierre(plan: Plan, estado: EstadoDirector, faseId: string): Propuesta[] {
  const hasta = plan.fases.findIndex((f) => f.id === faseId);
  return aceptadasSinEjecutar(plan, estado)
    .map((x) => x.propuesta)
    .filter((p) => plan.fases.findIndex((f) => f.id === p.fase) <= hasta);
}

/**
 * Lo que cierra una fase va al final, de verdad (nota de voz del titular, 22 de octubre de 2026: el director le ofreció
 * subir el Studio «terminado» y probar su instalación con 24 propuestas aceptadas sin ejecutar, porque llenó la reserva
 * con las misiones del final). Una misión de cierre espera mientras quede trabajo aprobado de su fase sin hacer: no es
 * abierta, el Studio no la muestra y aparece sola cuando ese trabajo está hecho. No depende de que el director se acuerde.
 */
export function esperaAlCierre(plan: Plan, estado: EstadoDirector, m: Mision): boolean {
  return esDeCierre(m) && (aprobadoAntesDelCierre(plan, estado, m.fase).length > 0 || pedidosAntesDelCierre(plan, m.fase).length > 0);
}

/**
 * Lo que se aprobó para una fase: sus propuestas aceptadas, hechas o no (notas de voz del titular, 22 de octubre de 2026:
 * buscó el chat que aceptó y no lo encontró en ninguna fase, porque las propuestas de una fase futura quedaban bajo
 * niebla). Una aceptada ya está decidida: en una fase futura se ve como lo pedido, programada ahí; las que esperan
 * respuesta siguen bajo niebla hasta que la ruta llegue, para no decidir antes de tiempo.
 */
export function aprobadasDeFase(plan: Plan, estado: EstadoDirector, faseId: string): Propuesta[] {
  return plan.propuestas.filter((p) => p.fase === faseId && estado.propuestas[p.id]?.estado === 'aceptada');
}

/**
 * Lo de después del lanzamiento (decisión del titular, 22 de octubre de 2026, en «Todo lo que pediste, recuperado»): lo
 * pedido que va después de la meta tiene su lugar en «La ruta», a la vista y con su estado, sin detener ninguna puerta. Un
 * pedido con esta fase se ve al final de la última fase de la ruta, en «Después del lanzamiento».
 */
export const DESPUES = 'despues';

/** Dónde se ve un pedido en «La ruta»: en su fase o, si es de después del lanzamiento, en la última. */
export function faseDondeSeVe(plan: Plan, p: Pedido): string | undefined {
  return p.fase === DESPUES ? plan.fases.at(-1)?.id : p.fase;
}

/**
 * Decidir con un formulario (pedido pd_formulario, lo útil de JEPA en «Cómo piensa el director», parte 4): los destinos
 * de una nota ya calculados por el código, para que el director elija el suyo en vez de armarlo. La parte del documento
 * que comenta, su misión o su propuesta, los pedidos que ya la nombran y el plan de la fase en curso; todos existen, así
 * que pasan `validarPlan`. Lo que la nota haga nacer (un pedido o una propuesta nuevos) lleva el suyo, con su id.
 */
export function destinosDeNota(plan: Plan, nota: Nota, faseEnCurso?: string): Destino[] {
  const s = nota.sobre;
  const destinos: Destino[] = [];
  if (s.tipo === 'documento' && s.id && s.seccion) destinos.push({ doc: s.id, seccion: s.seccion, etiqueta: 'Ver la parte' });
  const mision = s.tipo === 'mision' ? plan.misiones.find((m) => m.id === s.id) : undefined;
  if (mision) destinos.push({ vista: 'misiones', ancla: `mision-${mision.id}`, etiqueta: 'Ver la misión' });
  const propuesta = s.tipo === 'propuesta' ? plan.propuestas.find((p) => p.id === s.id) : undefined;
  if (propuesta) destinos.push({ vista: 'ruta', fase: propuesta.fase, ancla: `propuesta-${propuesta.id}`, etiqueta: 'Ver la propuesta' });
  for (const p of plan.pedidos ?? []) {
    const fase = faseDondeSeVe(plan, p);
    if (p.notas?.includes(nota.id) && fase) destinos.push({ vista: 'ruta', fase, ancla: `pedido-${p.id}`, etiqueta: 'Ver lo pedido' });
  }
  if (faseEnCurso) destinos.push({ vista: 'ruta', fase: faseEnCurso, ancla: 'r-plan', etiqueta: 'Ver el plan de la fase' });
  return destinos;
}

/**
 * Decidir con un formulario, su segunda pieza (pedido pd_formulario): los tratamientos que le caben a una nota según lo
 * que es, calculados por el código. Un «Hazlo tú» es un encargo y una decisión de un documento es del titular: se llevan
 * al plan, se aplazan, se plantean como decisión o se devuelven con su porqué, nunca solo `informada`. Lo que la persona
 * eligió en un paso, o una pregunta, no se rechaza (si conviene otra cosa, `decision`). Un «No lo entiendo» se responde
 * con el paso reescrito, o `informada` si su misión ya no está. Lo demás admite los cinco. Pura.
 */
export function tratamientosDeNota(nota: Nota): Tratamiento[] {
  const s = nota.sobre;
  if (s?.tipo === 'mision' && s.aclarar) return ['integrada', 'informada'];
  if ((s?.tipo === 'mision' && s.hazlo) || decideDecision(nota)) return TRATAMIENTOS.filter((t) => t !== 'informada');
  if ((s?.tipo === 'mision' && s.eleccion) || esPregunta(nota)) return TRATAMIENTOS.filter((t) => t !== 'rechazada');
  return [...TRATAMIENTOS];
}

/** Las respuestas escritas desde `desde` cuyo tratamiento no le cabe a su nota (tratamientosDeNota): --listo no cierra. */
export function tratamientosQueNoCaben(plan: Plan, notas: Nota[], desde: string): { id: string; tratamiento: Tratamiento; caben: Tratamiento[] }[] {
  const porId = new Map(notas.map((n) => [n.id, n]));
  return Object.entries(plan.respuestas ?? {}).flatMap(([id, r]) => {
    const n = porId.get(id);
    if (!n || r.cuando < desde || !r.tratamiento) return [];
    const caben = tratamientosDeNota(n);
    return caben.includes(r.tratamiento) ? [] : [{ id, tratamiento: r.tratamiento, caben }];
  });
}

/**
 * Lo vigente, una línea cada uno (pd_lo_vigente): el comienzo de un texto largo, hasta su primera pausa («: » o «. »)
 * si cae entre 30 y `max` caracteres, o cortado en una palabra antes de `max`, con «…». El texto entero sigue en el plan,
 * donde se busca por su id. Pura.
 */
export function enUnaLinea(texto: string, max = 160): string {
  const plano = texto.replace(/\s+/g, ' ').trim();
  if (plano.length <= max) return plano;
  const pausa = plano.slice(0, max).search(/[:.] (?=\S)/);
  if (pausa >= 30) return `${plano.slice(0, pausa)}…`;
  const corte = plano.lastIndexOf(' ', max - 1);
  return `${plano.slice(0, corte > 30 ? corte : max - 1)}…`;
}

/**
 * Lo reemplazado, fuera (decisión del titular del 23 de octubre de 2026, «El paquete de cada revisión», parte 10; pedido
 * pd_lo_vigente): un pedido o una propuesta que dice cuál reemplaza (`reemplaza`) deja al reemplazado cerrado sin hacerse.
 * Sale de lo pendiente (la cola del director, lo que espera el cierre, lo que espera una misión) y, en el cierre, del plan al
 * archivo, donde se sigue encontrando por su id. Lo calcula el código, no la memoria del director. Cada id reemplazado, con
 * el que lo reemplazó (el primero que lo nombra). `plan` puede ser el unido con su archivo: un reemplazo archivado sigue
 * valiendo. Pura.
 */
export function reemplazos(plan: Pick<Plan, 'pedidos' | 'propuestas'>): Map<string, string> {
  const fuera = new Map<string, string>();
  for (const x of [...(plan.pedidos ?? []), ...(plan.propuestas ?? [])]) {
    for (const id of Array.isArray(x.reemplaza) ? x.reemplaza : []) if (id !== x.id && !fuera.has(id)) fuera.set(id, x.id);
  }
  return fuera;
}

/**
 * Los pedidos sin hacer de una fase o de una anterior: lo que la misión que cierra esa fase espera, como lo aprobado. Los
 * que se hacen en el cierre mismo (`alCierre`) no cuentan: los traen esas misiones.
 */
export function pedidosAntesDelCierre(plan: Plan, faseId: string): Pedido[] {
  const hasta = plan.fases.findIndex((f) => f.id === faseId);
  const fuera = reemplazos(plan);
  return (plan.pedidos ?? []).filter((p) => !p.hecho && !fuera.has(p.id) && !p.alCierre && p.fase !== DESPUES && plan.fases.findIndex((f) => f.id === p.fase) <= hasta);
}

/**
 * Lo que una misión espera (`despuesDe`) y aún no está hecho: una misión abierta o bajo niebla, una propuesta sin
 * ejecutar (salvo la descartada, que ya no se hará) o un pedido sin `hecho`. Un id que no existe no retiene nada:
 * `validarPlan` lo señala.
 */
export function esperaA(plan: Plan, estado: EstadoDirector, m: Mision): string[] {
  // Lo reemplazado ya no se hará: lo que se espera es lo que lo reemplazó (`reemplazos`), al final de la cadena
  const fuera = reemplazos(plan);
  const vigente = (id: string) => {
    const vistos = new Set<string>();
    while (fuera.has(id) && !vistos.has(id)) { vistos.add(id); id = fuera.get(id)!; }
    return id;
  };
  return [...new Set((m.despuesDe ?? []).map(vigente))].filter((id) => {
    const mision = plan.misiones.find((x) => x.id === id);
    if (mision) return [...ABIERTAS, 'bloqueada'].includes(estadoMision(mision, plan, estado));
    if (plan.propuestas.some((p) => p.id === id)) return !plan.ejecutadas?.[id] && estado.propuestas[id]?.estado !== 'descartada';
    const pedido = (plan.pedidos ?? []).find((p) => p.id === id);
    return !!pedido && !pedido.hecho;
  });
}

/** El nombre de lo que una misión espera, para decírselo a la persona: el título de la misión o la propuesta, o el pedido. */
export function nombreDeLoQueEspera(plan: Plan, id: string): string {
  return plan.misiones.find((x) => x.id === id)?.titulo ?? plan.propuestas.find((p) => p.id === id)?.titulo ?? (plan.pedidos ?? []).find((p) => p.id === id)?.texto ?? id;
}

/**
 * Lo aplazado para una fase o una anterior que no quedó como pedido ni como propuesta (nota de voz del titular, 22 de
 * octubre de 2026: «que ninguna idea dependa de que el director la busque»). Una respuesta «aplazada» solo vivía en su
 * texto y pasaba al archivo, donde nada la volvía a mostrar. `plan` es el unido con su archivo: la bandeja se las da al
 * director en la fase en curso hasta que cada una tenga su pedido (con la nota en `notas`) o su propuesta.
 */
export function aplazadasSinPedido(plan: Plan, faseId: string): string[] {
  const hasta = plan.fases.findIndex((f) => f.id === faseId);
  const conPedido = new Set((plan.pedidos ?? []).flatMap((p) => p.notas ?? []));
  return Object.entries(plan.respuestas ?? {})
    .filter(([id, r]) => r.tratamiento === 'aplazada' && !conPedido.has(id) && !/^(pedido|propuesta)-/.test(r.destino?.ancla ?? '')
      && !!r.destino?.fase && plan.fases.findIndex((f) => f.id === r.destino!.fase) >= 0 && plan.fases.findIndex((f) => f.id === r.destino!.fase) <= hasta)
    .map(([id]) => id);
}

// Se retiene aunque ya tenga un paso marcado: empezarla antes de tiempo fue justo el error (sus marcas se conservan)
const sinEmpezarDeVerdad = (plan: Plan, estado: EstadoDirector, m: Mision) => ['pendiente', 'en_curso'].includes(estadoMision(m, plan, estado));
const retenida = (plan: Plan, estado: EstadoDirector, m: Mision) => sinEmpezarDeVerdad(plan, estado, m) && esperaAlCierre(plan, estado, m);
const esperaLoQueNecesita = (plan: Plan, estado: EstadoDirector, m: Mision) => sinEmpezarDeVerdad(plan, estado, m) && esperaA(plan, estado, m).length > 0;

/** Las misiones abiertas de una persona, en el orden del director (lo que hay que rehacer va primero). */
export function misionesAbiertas(plan: Plan, estado: EstadoDirector, persona: Persona): Mision[] {
  const abiertas = plan.misiones.filter((m) => m.para === persona && ABIERTAS.includes(estadoMision(m, plan, estado)) && !retenida(plan, estado, m) && !esperaLoQueNecesita(plan, estado, m));
  return [...abiertas.filter((m) => estadoMision(m, plan, estado) === 'rehacer'), ...abiertas.filter((m) => estadoMision(m, plan, estado) !== 'rehacer')];
}

/** Las misiones de cierre de una persona que esperan lo aprobado sin hacer de su fase (`esperaAlCierre`). */
export function misionesEnEsperaDeCierre(plan: Plan, estado: EstadoDirector, persona: Persona): Mision[] {
  return plan.misiones.filter((m) => m.para === persona && retenida(plan, estado, m));
}

/** Las que no son de cierre y esperan lo que necesitan (`despuesDe`): aparecen solas cuando está hecho. */
export function misionesQueEsperan(plan: Plan, estado: EstadoDirector, persona: Persona): Mision[] {
  return plan.misiones.filter((m) => m.para === persona && !retenida(plan, estado, m) && esperaLoQueNecesita(plan, estado, m));
}

/**
 * La reserva de misiones (regla del titular, 21 de octubre de 2026): entre revisión y revisión, cada persona tiene
 * siempre su misión de ahora y por lo menos nueve más detrás (RESERVA_MINIMA en total: diez; eran seis desde la auditoría
 * del 21 de octubre, y el titular la subió a diez en su nota de voz del 26 de octubre de 2026, para trabajar las misiones
 * por lotes y pedir menos revisiones), para que nunca se quede sin misión esperando al director. Cuentan solo las
 * que la persona alcanza sin una revisión de por medio: las abiertas y, si nada de su fase espera al cierre, las de la fase
 * siguiente (bajo niebla hasta cruzar la puerta, aparecen solas al cruzarla). Las de cierre retenidas no cuentan, ni las
 * de la fase siguiente mientras haya una retenida: no aparecen hasta que el director termine lo aprobado (nota de voz del
 * titular, 22 de octubre de 2026: «las últimas dos misiones, tan pronto las completé, me quedé sin misiones»; la reserva
 * contaba seis y él veía una). Vale en toda fase de la ruta, también en la última (nota del titular nmvq6s7wmtit, 26 de
 * octubre de 2026 en la noche: «siempre, sin excepción, el usuario deberá tener mínimo sus diez misiones»), y solo se
 * acepta menos en la fase de mantenimiento (una sola misión ligera, por diseño, porque el titular dio la meta por lograda),
 * en el arranque antes de trazar la ruta (leer el diagnóstico y fijar la meta es el lote) o con un lote corto
 * (`reservaSinRazon`).
 */
export const RESERVA_MINIMA = 10;

export interface ReservaDeMisiones {
  /** Las abiertas de ahora (la primera es la que ve completa). */
  abiertas: Mision[];
  /** Las de la fase siguiente, bajo niebla hasta cruzar la puerta. */
  siguientes: Mision[];
  /** Las de cierre que esperan lo aprobado sin hacer de su fase: aparecen solas a su hora, y no cuentan en la reserva. */
  enEspera: Mision[];
  /**
   * Las que esperan lo que necesitan (`despuesDe`). Cuentan en la reserva solo si lo que esperan son misiones que ya se
   * pueden hacer (llegan sin el director); si esperan una propuesta o un pedido, no.
   */
  esperan: Mision[];
  /** De las que esperan, las que llegan sin el director: solo esperan misiones que ya están a la vista. */
  llegan: Mision[];
  /** Las que la persona alcanza sin una revisión de por medio: las abiertas y, sin retenidas, las de la fase siguiente. */
  alcanza: number;
  /** Cuántas faltan para la reserva mínima (0 si está completa o si la fase no la exige). */
  faltan: number;
}

export function reservaDeMisiones(plan: Plan, estado: EstadoDirector, persona: Persona): ReservaDeMisiones {
  const abiertas = misionesAbiertas(plan, estado, persona);
  const enEspera = misionesEnEsperaDeCierre(plan, estado, persona);
  const esperan = misionesQueEsperan(plan, estado, persona);
  const actual = plan.fases.indexOf(faseActual(plan, estado));
  const siguiente = plan.fases[actual + 1];
  const siguientes = siguiente ? plan.misiones.filter((m) => m.para === persona && m.fase === siguiente.id && estadoMision(m, plan, estado) === 'bloqueada' && !esperaA(plan, estado, m).length) : [];
  const mantenimiento = /mantenimiento/i.test(plan.fases[actual]?.etapa ?? '');
  // Sin ruta trazada (solo la fase 0, antes de fijar la meta) no hay de dónde sacar más: leer el diagnóstico y fijar la
  // meta es el lote, y es lo que necesita la revisión que traza la ruta
  const sinRuta = plan.fases.length <= 1;
  // Llega sin el director la que solo espera misiones que ya están a la vista de alguien (abiertas y no retenidas)
  const aLaVista = new Set(plan.misiones.filter((m) => ABIERTAS.includes(estadoMision(m, plan, estado)) && !retenida(plan, estado, m) && !esperaLoQueNecesita(plan, estado, m)).map((m) => m.id));
  const llegan = esperan.filter((m) => esperaA(plan, estado, m).every((id) => aLaVista.has(id)));
  // Una retenida cierra la fase: mientras espere, la puerta no se cruza y la fase siguiente no llega
  const alcanza = abiertas.length + llegan.length + (enEspera.length ? 0 : siguientes.length);
  const faltan = mantenimiento || sinRuta ? 0 : Math.max(0, RESERVA_MINIMA - alcanza);
  return { abiertas, siguientes, enEspera, esperan, llegan, alcanza, faltan };
}

/**
 * El lote corto, la única excepción a la reserva (nota del titular nmvq6s7wmtit, 26 de octubre de 2026 en la noche,
 * «un error crítico»: la revisión anterior lo dejó sin nada que hacer ni aprobar, con la razón de que lo que seguía era
 * trabajo del director; «mientras el director trabaja, el usuario siempre tiene que tener algo que hacer o revisar»).
 * Reemplaza a la reserva corta del 26 de octubre en la tarde (misión t_reserva_corta), que aceptaba cualquier razón
 * escrita. Una persona puede quedar con menos de RESERVA_MINIMA solo si es estrictamente necesario darle un lote más
 * corto para agilizar la revisión que sigue (lo que esas misiones traen es lo que el director necesita pronto, y más
 * misiones demorarían que la pida), y el director lo escribe en `plan.reservaCorta`, en la misma revisión (`desde`: cuando
 * cerró la anterior), con su razón y su `lote`: las misiones de la persona que forman ese lote, todas a su alcance. Nunca
 * en cero: sin una misión a la mano no hay lote. Y la cola del director nunca es la razón (`EXCUSA_RESERVA`): su trabajo
 * no acorta ni llena la reserva de la persona. Devuelve a quienes tienen la reserva corta sin un lote válido de esta
 * revisión, con el motivo, que `bandeja.ts --listo` no deja pasar.
 *
 * Desde la nota del titular nmvq7f9e3tit (27 de octubre de 2026, a la 1 de la madrugada, en t_casos_errores), el lote
 * corto cae en uno de tres casos (`motivo`), y nunca es relleno (nota nmvq7lk8itit, esa misma noche: «prefiero que salgan
 * menos de 10 a que salgan misiones de relleno», después de que seis de las diez de la revisión anterior lo fueran):
 * - `revision`: la de arriba, el lote que agiliza la revisión que sigue o que debe ir antes de seguir con las demás. Su
 *   razón no puede ser la cola del director.
 * - `cola`: lo que viene es una ejecución larga del director y no hay diez misiones estratégicas de la persona. Como
 *   mínimo, el lote trae la de aprobar el lanzamiento de esa cola: una misión con `recomiendaRevision`, que muestra lo que
 *   hará el director y, al entregarse, ofrece «Pedir la revisión»; las de ver lo que hizo salen a medida que avanza. Vale
 *   solo si la cola del director tiene algo. La aprobación se da una vez: con la cola autorizada entera
 *   (`colaAutorizada`, nota de voz del titular nmvqvu1sctit, 27 de octubre de 2026), el lote ya no la trae, y lleva solo
 *   lo que de verdad necesita a la persona, nunca en cero.
 * - `ruta`: la ruta se considera completada, sin nada aprobado ni pedido por hacer (la cola del director, vacía).
 */
export const RAZON_RESERVA_MINIMA = 40;

/** Los tres casos de un lote corto (nota del titular nmvq7f9e3tit); sin `motivo`, el de la revisión que sigue. */
export const MOTIVOS_LOTE_CORTO = ['revision', 'cola', 'ruta'] as const;
export type MotivoLoteCorto = (typeof MOTIVOS_LOTE_CORTO)[number];

/** La razón que no vale para un lote corto: que lo que sigue es trabajo del director, o que más misiones serían relleno. */
export const EXCUSA_RESERVA = /\b(?:es|son|sigue\s+siendo|siguen\s+siendo|queda|quedan|va\s+a\s+ser)\s+(?:casi\s+)?(?:todo\s+|sobre\s+todo\s+)?(?:trabajo|cosa|tarea)s?\s+(?:m[ií]os?|m[ií]as?|del\s+director|para\s+m[ií])\b|\binventar(?:te|le|les)?\s+(?:m[aá]s\s+)?misiones\b|\bser[ií]a\s+relleno\b/i;

export function reservaSinRazon(plan: Plan, estado: EstadoDirector, personas: Persona[], desde: string): (ReservaDeMisiones & { persona: Persona; motivo: string })[] {
  const desdeMs = Date.parse(desde);
  const cola = colaDelDirector(plan, estado).length;
  const motivo = (r: ReservaDeMisiones, persona: Persona): string => {
    const c = plan.reservaCorta?.[persona];
    if (!c) return 'no hay lote corto escrito';
    const cuando = Date.parse(c.cuando ?? '');
    if (Number.isNaN(cuando) || (!Number.isNaN(desdeMs) && cuando < desdeMs)) return 'el lote corto es de una revisión anterior';
    if ((c.razon?.trim().length ?? 0) < RAZON_RESERVA_MINIMA) return `la razón del lote corto no dice nada (menos de ${RAZON_RESERVA_MINIMA} caracteres)`;
    const caso = c.motivo ?? 'revision';
    if (!MOTIVOS_LOTE_CORTO.includes(caso)) return `el motivo del lote corto («${caso}») no es uno de los tres: ${MOTIVOS_LOTE_CORTO.join(', ')}`;
    // Solo en el de la revisión que sigue la cola del director es una excusa: en los otros dos es justo lo que se dice
    const excusa = caso === 'revision' ? c.razon.match(EXCUSA_RESERVA) : null;
    if (excusa) return `la razón usa tu cola como excusa («${excusa[0]}»): con un lote de la revisión que sigue, tu trabajo nunca acorta la reserva de la persona (si lo que viene es una ejecución larga tuya, es el motivo «cola», con la misión de aprobar su lanzamiento)`;
    if (caso === 'cola' && !cola) return 'el motivo es tu cola, y tu cola está vacía';
    if (caso === 'ruta' && cola) return `el motivo es la ruta completada, y quedan ${cola} cosas aprobadas o pedidas en tu cola`;
    if (!r.alcanza) return 'no tiene ninguna misión a la mano: nunca se queda en cero';
    const aMano = new Set([...r.abiertas, ...r.llegan, ...(r.enEspera.length ? [] : r.siguientes)].map((m) => m.id));
    if (!c.lote?.length) return 'el lote corto no nombra sus misiones (`lote`)';
    const fuera = c.lote.filter((id) => !aMano.has(id));
    if (fuera.length) return `el lote nombra misiones que la persona no tiene a la mano: ${fuera.join(', ')}`;
    if (caso === 'cola' && !plan.colaAutorizada && !plan.misiones.some((m) => c.lote!.includes(m.id) && m.recomiendaRevision?.trim())) return 'el lote de tu cola no trae la misión de aprobar su lanzamiento: una del lote con `recomiendaRevision`, que muestra lo que harás y ofrece «Pedir la revisión» al entregarse';
    return '';
  };
  return personas
    .map((persona) => ({ persona, ...reservaDeMisiones(plan, estado, persona) }))
    .filter((r) => r.faltan && (r.abiertas.length || r.siguientes.length || plan.misiones.some((m) => m.para === r.persona)))
    .map((r) => ({ ...r, motivo: motivo(r, r.persona) }))
    .filter((r) => r.motivo);
}

/**
 * Dos colas, coordinadas pero aparte (nota de voz del titular, 23 de octubre de 2026: «el estudio y el director son un
 * ente diferente al usuario, y sus colas de trabajo se mueven de forma diferente: en equipo y coordinadas, pero no son la
 * misma cola»). La de cada persona son sus misiones, y su reserva (`reservaDeMisiones`) cuenta solo esas. La del director
 * es lo que el equipo aprobó o pidió y aún no está hecho: las propuestas aceptadas sin ejecutar y los pedidos sin `hecho`
 * de la fase en curso o de antes, en el orden que él decide (`plan.colaDirector`; lo que no nombra va al final, en el orden
 * del plan). El director la trabaja en cada revisión, sin esperar a que la persona termine sus misiones; la persona nunca
 * se queda sin misión porque el director tenga trabajo por delante, y ninguna misión de la persona se inventa para llenar
 * la reserva con el trabajo de él. Donde se tocan (ver terminado lo que él hizo), la misión lo dice con `despuesDe`.
 */
export interface TareaDelDirector {
  id: string;
  tipo: 'propuesta' | 'pedido';
  titulo: string;
  fase: string;
}

export function colaDelDirector(plan: Plan, estado: EstadoDirector): TareaDelDirector[] {
  const actual = plan.fases.indexOf(faseActual(plan, estado));
  const hasta = (fase: string) => {
    const i = plan.fases.findIndex((f) => f.id === fase);
    return i >= 0 && i <= actual;
  };
  const fuera = reemplazos(plan);
  const tareas: TareaDelDirector[] = [
    ...plan.propuestas.filter((p) => estado.propuestas[p.id]?.estado === 'aceptada' && !plan.ejecutadas?.[p.id] && !fuera.has(p.id) && hasta(p.fase)).map((p) => ({ id: p.id, tipo: 'propuesta' as const, titulo: p.titulo, fase: p.fase })),
    ...(plan.pedidos ?? []).filter((p) => !p.hecho && !fuera.has(p.id) && p.fase !== DESPUES && hasta(p.fase)).map((p) => ({ id: p.id, tipo: 'pedido' as const, titulo: p.texto, fase: p.fase })),
  ];
  const orden = plan.colaDirector ?? [];
  const lugar = (id: string) => (orden.includes(id) ? orden.indexOf(id) : orden.length + tareas.findIndex((t) => t.id === id));
  return tareas.sort((a, b) => lugar(a.id) - lugar(b.id));
}

/** Lo de la cola del director que su orden todavía no nombra: cada revisión lo pone en su lugar (`bandeja.ts --listo`). */
export function colaSinOrden(plan: Plan, estado: EstadoDirector): TareaDelDirector[] {
  const orden = new Set(plan.colaDirector ?? []);
  return colaDelDirector(plan, estado).filter((t) => !orden.has(t.id));
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

/**
 * ¿Es una ruta de documento que el Estudio deja leer y comentar? (docs/… de aquí, o repo:… del proyecto). Con tildes,
 * eñes y espacios, que traen los proyectos en español (nota de voz del titular, 22 de octubre de 2026); nunca «..» ni
 * una ruta absoluta.
 */
export function esDocumento(ruta: string): boolean {
  return !ruta.includes('..') && /^(docs\/|repo:)(?!\/)[\p{L}\p{N}_ .\/()'&+,-]+\.md$/iu.test(ruta);
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
 * ¿Esta misión, ya cerrada para su persona, cuenta como la revisión de ese documento (y lo sella)? Sí, salvo una entregada
 * sin terminar («No me salió») con el paso que pide leerlo sin marcar: entregarla para seguir con otra no es haberlo leído
 * (dos reglas que se cruzan: el sello por misión entregada y la entrega sin terminar). Si el documento no tiene un paso
 * propio, basta que la entrega no haya dejado pasos sin marcar.
 */
function revisoElDocumento(m: Mision, plan: Plan, estado: EstadoDirector, ruta: string): boolean {
  const e = estadoMision(m, plan, estado);
  if (ABIERTAS.includes(e) || e === 'bloqueada') return false;
  if (e !== 'entregada' || estado.entregas[m.id]?.sinTerminar === undefined) return true;
  const hechos = estado.pasos?.[m.id]?.hechos ?? [];
  const delDoc = m.pasos.flatMap((p, i) => (typeof p !== 'string' && (p.ir?.doc === ruta || (p.hecho?.que === 'leido' && p.hecho.id === ruta)) ? [i] : []));
  return delDoc.length ? delDoc.every((i) => hechos.includes(i)) : !pasosSinMarcar(m, hechos).length;
}

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
    const hechas = delDoc.filter((m) => revisoElDocumento(m, plan, estado, ruta));
    const abierta = delDoc.find((m) => misionAbierta(m, plan, estado));
    const mision = hechas.length ? hechas[hechas.length - 1] : abierta ?? delDoc[delDoc.length - 1];
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
 * El control de los cortes (la auditoría que corre la bandeja sobre cada documento por leer): las ideas que quedarían
 * mal cortadas aunque `trozosDeParte` haga lo suyo, porque el texto mismo está mal escrito para leerse de a una idea.
 * El director las reescribe antes de pedir que se lean. Cada una dice su `motivo`:
 * - un renglón corto, solo (un título sin nada, una línea suelta);
 * - termina en un título (un título sin nada debajo, al final de la parte);
 * - una imagen o un video sin texto que lo acompañe;
 * - demasiado larga para leerla como una idea (más de unos 15 renglones);
 * - un bloque de código o de fórmulas sin cerrar (se tragaría el resto de la parte).
 */
export function ideasSueltas(texto: string): { parte: string; idea: string; motivo: string }[] {
  const partes: { titulo: string; md: string[] }[] = [];
  let enCodigo = false;
  for (const linea of texto.split(/\r?\n/)) {
    if (/^ {0,3}(```|~~~)/.test(linea)) enCodigo = !enCodigo;
    const h2 = !enCodigo && /^##\s+(.+)$/.exec(linea);
    if (h2) partes.push({ titulo: h2[1].replace(/[*_`#>\[\]]/g, '').replace(/\(([^)]*)\)/g, '').trim(), md: [] });
    else partes[partes.length - 1]?.md.push(linea);
  }
  const motivo = (t: Trozo): string | undefined => {
    const lineas = t.md.trim().split('\n');
    if (t.tipo === 'bloque') {
      const marca = /^ {0,3}(`{3,}|~{3,}|\$\$)/.exec(lineas[0])?.[1];
      if (marca && (lineas.length === 1 ? !(marca === '$$' && lineas[0].trim().length > 4 && lineas[0].trim().endsWith('$$')) : !lineas.some((l, k) => k > 0 && (marca === '$$' ? l.trim().endsWith('$$') : new RegExp(`^ {0,3}\\${marca[0]}{${marca.length},}\\s*$`).test(l)))))
        return 'un bloque de código o de fórmulas sin cerrar';
      return soloMedio(t.md) ? 'una imagen o un video sin texto que lo acompañe' : undefined;
    }
    if (t.tipo === 'rotulo' || t.decision) return undefined;
    if (soloMedio(t.md)) return 'una imagen o un video sin texto que lo acompañe';
    if (lineas.length > 1 && lineaTitulo(lineas[lineas.length - 1])) return 'termina en un título sin nada debajo';
    // Lo que anuncia quedó en otra tarjeta (antes de la lista de decisiones, o al final de la parte): la persona se
    // queda esperando el resto (nota de voz del titular nmvn1msq6tit)
    if (/:$/.test(visible(lineas[lineas.length - 1]))) return 'termina en «:» y lo que anuncia queda en otra idea: complétala o junta lo que sigue';
    if (visible(t.md).length <= SUELTO && !conMedio(t.md)) return 'un renglón corto, solo';
    // Un bloque de puntos cortos se lee de una vez hasta su propio tope (más uno, por el párrafo que lo anuncia)
    if (visible(t.md).length > (puntosDelBloque(t).length ? TOPE_LISTA + PUNTO_CORTO : EXTENSO)) return 'demasiado larga para una idea (más de unos 15 renglones): pártela';
    return undefined;
  };
  return partes.flatMap((p) =>
    trozosDeParte(p.titulo, p.md.join('\n')).flatMap((t) => {
      const m = motivo(t);
      return m ? [{ parte: p.titulo, idea: t.md.trim(), motivo: m }] : [];
    }),
  );
}

/**
 * Lo único que puede cambiar en un documento ya revisado (nota de voz del titular del 27 de octubre de 2026, pedido
 * pd_cuenta_ajena): quitar un dato que no debe estar a la vista (un correo, una cuenta, el nombre de un cliente), con el
 * permiso del titular. Cada dato quitado queda como DATO_QUITADO, y lo demás, igual: no hay que volver a leerlo.
 */
export const DATO_QUITADO = '[dato quitado]';

/**
 * Si `ahora` es `antes` con uno o más datos quitados y nada más: cada DATO_QUITADO reemplaza una sola palabra de `antes`
 * (sin espacios y de hasta 80 caracteres: un correo, una cuenta, un nombre), y todo lo demás es idéntico, sin contar los
 * finales de línea. Así, quitar un dato no rompe el sello del documento, y por ahí no se cuela ni una frase ni una línea.
 */
export function soloQuitaDatos(antes: string, ahora: string): boolean {
  const llano = (s: string) => s.replace(/\r\n/g, '\n');
  const trozos = llano(ahora).split(DATO_QUITADO);
  if (trozos.length < 2) return false;
  const literal = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${trozos.map(literal).join('\\S{1,80}')}$`).test(llano(antes));
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
    for (const ruta of documentosDeMision(m)) if (hecha && cambiado[ruta] && cambiado[ruta] > hecha && revisoElDocumento(m, plan, estado, ruta)) salida.push({ ruta, persona: m.para, mision: m });
  }
  return salida;
}

/**
 * Lo que la revisión no puede dejar en los documentos al cerrar (propuesta aceptada «El cierre no deja nada sin
 * atender», parte 2), que antes la bandeja solo avisaba: un documento ya revisado que cambió después (sellado), y una
 * idea mal cortada en un documento por leer que se escribió o cambió en esta revisión (`cambiado` posterior a `desde`)
 * y que su lector todavía no empezó: si ya leyó alguna parte, corregirla se la volvería a mostrar como cambiada.
 * `cambiado`: la fecha del último cambio de cada documento; `textos`: lo que dice cada uno.
 */
export function documentosPorCerrar(plan: Plan, estado: EstadoDirector, personas: Persona[], desde: string, cambiado: Record<string, string>, textos: Record<string, string>): string[] {
  const motivos = selladosQueCambiaron(plan, estado, cambiado)
    .filter((x) => !x.ruta.startsWith('repo:'))
    .map((x) => `${x.ruta} ya lo revisó ${x.persona} en «${x.mision.titulo}» y cambió después: devuélvelo como estaba (git show HEAD:<ruta> te da lo guardado) y escribe lo que cambió en un documento nuevo, como paso siguiente.`);
  const vistos = new Set<string>();
  for (const p of personas)
    for (const d of documentosEnOrden(plan, estado, p)) {
      if (d.estado === 'revisado' || d.ruta.startsWith('repo:') || vistos.has(d.ruta)) continue;
      vistos.add(d.ruta);
      if (desde && !((cambiado[d.ruta] ?? '') > desde)) continue;
      const leido = estado.leidos?.[claveLeido(p, d.ruta)];
      if (leido && (leido.partes.length || leido.trozos?.length)) continue;
      const sueltas = textos[d.ruta] === undefined ? [] : ideasSueltas(textos[d.ruta]);
      if (sueltas.length) motivos.push(`${d.ruta}: ${sueltas.length} idea(s) quedarían mal cortadas; reescríbelas para que cada una se entienda sola y completa: ${sueltas.map((s) => `«${s.parte}» › «${s.idea.replace(/\s+/g, ' ').slice(0, 100)}» (${s.motivo})`).join('; ')}`);
    }
  return motivos;
}

/** Lo que espera al director: entregas sin veredicto y notas sin respuesta. */
export function pendientesDelDirector(plan: Plan, estado: EstadoDirector): { entregas: Mision[]; notas: Nota[] } {
  return {
    entregas: plan.misiones.filter((m) => estadoMision(m, plan, estado) === 'entregada'),
    notas: estado.notas.filter((n) => !plan.respuestas?.[n.id]),
  };
}

/**
 * Lo que una revisión no puede dejar sin atender al cerrar (propuesta aceptada «El cierre no deja nada sin atender»,
 * 21 de octubre de 2026): cada nota y cada entrega que llegó antes del corte tiene su respuesta o su veredicto. Lo que
 * llegó después del corte espera la revisión siguiente, como en la bandeja. `bandeja.ts --listo` no cierra mientras quede algo.
 */
export function sinAtenderAlCerrar(plan: Plan, estado: EstadoDirector, corte: string): { notas: string[]; entregas: string[] } {
  const p = pendientesDelDirector(plan, estado);
  return {
    notas: p.notas.filter((n) => n.cuando <= corte).map((n) => n.id),
    entregas: p.entregas.filter((m) => (estado.entregas[m.id]?.cuando ?? '') <= corte).map((m) => m.id),
  };
}

/** Lo más que cabe en «Lo que avanzamos» (docs/metodo/director/review-cycle.md › «Dónde quedamos»). */
export const MAX_AVANZAMOS = 6;

/**
 * Lo que impide cerrar por el resumen «Dónde quedamos» (la misma propuesta aceptada): cada revisión lo reescribe, así
 * que su fecha es de después de la revisión anterior (`desde`), y «Lo que avanzamos» no pasa de seis líneas. Vacío si está bien.
 */
export function resumenPorCerrar(resumen: Resumen | undefined, desde: string): string[] {
  const motivos: string[] = [];
  if (!resumen?.fecha || (desde && resumen.fecha < desde)) motivos.push('no se reescribió en esta revisión: su fecha es de antes de empezarla');
  const lineas = resumen?.avanzamos?.length ?? 0;
  if (lineas > MAX_AVANZAMOS) motivos.push(`«Lo que avanzamos» trae ${lineas} líneas y el máximo es ${MAX_AVANZAMOS}: deja las más nuevas y quita las demás, sin reescribirlas`);
  return motivos;
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

/**
 * Las propuestas aceptadas que el director aún no ejecuta (no están en `ejecutadas`), con quién y cuándo las aceptó, de
 * la más vieja a la más nueva. La bandeja se las da en cada revisión, sin importar el día en que se aceptaron: lo aprobado
 * no depende de que el director lo busque (nota de voz del titular del 22 de octubre de 2026).
 */
export function aceptadasSinEjecutar(plan: Plan, estado: EstadoDirector): { propuesta: Propuesta; aceptada: Firma }[] {
  const fuera = reemplazos(plan);
  return plan.propuestas
    .filter((p) => estado.propuestas[p.id]?.estado === 'aceptada' && !plan.ejecutadas?.[p.id] && !fuera.has(p.id))
    .map((p) => ({ propuesta: p, aceptada: estado.propuestas[p.id] }))
    .sort((a, b) => a.aceptada.fecha.localeCompare(b.aceptada.fecha));
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
    porEjecutar: aceptadasSinEjecutar(plan, estado).length,
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
  const pedidos = new Set<string>();
  for (const p of plan.pedidos ?? []) {
    if (pedidos.has(p.id)) errores.push(`El pedido «${p.id}» está repetido.`);
    pedidos.add(p.id);
    if (!fases.has(p.fase) && p.fase !== DESPUES) errores.push(`El pedido «${p.id}» nombra la fase «${p.fase}», que no está (lo de después del lanzamiento va con la fase «${DESPUES}»).`);
    if (!p.texto?.trim()) errores.push(`El pedido «${p.id}» no dice qué se pidió.`);
  }
  // Lo reemplazado, fuera: cada reemplazo nombra un pedido o una propuesta que existe, otro, y no lo reemplazan dos
  const propuestasIds = new Set(plan.propuestas.map((p) => p.id));
  const reemplazadoPor = new Map<string, string>();
  for (const x of [...(plan.pedidos ?? []), ...plan.propuestas]) {
    if (x.reemplaza === undefined) continue;
    if (!Array.isArray(x.reemplaza)) { errores.push(`«${x.id}» dice qué reemplaza sin una lista de ids (\`reemplaza\`).`); continue; }
    for (const id of x.reemplaza) {
      if (id === x.id) errores.push(`«${x.id}» dice que se reemplaza a sí mismo.`);
      else if (!pedidos.has(id) && !propuestasIds.has(id)) errores.push(`«${x.id}» reemplaza a «${id}», que no es un pedido ni una propuesta del plan.`);
      else if (reemplazadoPor.has(id) && reemplazadoPor.get(id) !== x.id) errores.push(`«${id}» lo reemplazan dos: «${reemplazadoPor.get(id)}» y «${x.id}»; deja uno.`);
      else reemplazadoPor.set(id, x.id);
    }
  }
  for (const [id, por] of reemplazadoPor) if (reemplazadoPor.get(por) === id && id < por) errores.push(`«${id}» y «${por}» se reemplazan el uno al otro; deja uno vigente.`);
  if (plan.alDia &&(Number.isNaN(Date.parse(plan.alDia.cuando)) || !plan.alDia.nota?.trim())) errores.push('Lo pendiente al día (`alDia`) necesita su fecha y lo que comprobaste.');
  if (plan.colaAutorizada && (Number.isNaN(Date.parse(plan.colaAutorizada.cuando ?? '')) || !plan.colaAutorizada.nota?.trim())) errores.push('La cola autorizada (`colaAutorizada`) necesita su fecha y la nota en que la persona la autorizó.');
  if (plan.tramo) {
    const t = plan.tramo;
    if (Number.isNaN(Date.parse(t.cuando ?? '')) || typeof t.seguir !== 'boolean' || !t.razon?.trim()) errores.push('El tramo que sigue (`tramo`) necesita su fecha, si las revisiones seguidas siguen (`seguir`, sí o no) y su razón.');
    if (t.minutos !== undefined && (typeof t.minutos !== 'number' || !Number.isFinite(t.minutos) || t.minutos <= 0)) errores.push('Los minutos del tramo que sigue (`tramo.minutos`) son un número mayor que cero.');
  }
  for (const [p, c] of Object.entries(plan.reservaCorta ?? {})) {
    if (personas && !personas.includes(p)) errores.push(`La reserva corta nombra a «${p}», que no está en el equipo.`);
    if (Number.isNaN(Date.parse(c?.cuando ?? '')) || !c?.razon?.trim()) errores.push(`La reserva corta de «${p}» necesita su fecha y su razón.`);
    if (c?.motivo !== undefined && !MOTIVOS_LOTE_CORTO.includes(c.motivo)) errores.push(`La reserva corta de «${p}» trae el motivo «${c.motivo}»: es uno de ${MOTIVOS_LOTE_CORTO.join(', ')}.`);
    for (const id of c?.lote ?? []) if (!plan.misiones.some((m) => m.id === id && m.para === p)) errores.push(`El lote corto de «${p}» nombra «${id}», que no es una misión suya.`);
  }
  for (const a of plan.adelantado ?? []) {
    if (!fases.has(a.fase)) errores.push(`Lo adelantado «${a.texto}» nombra la fase «${a.fase}», que no está.`);
    if (!frentes.has(a.frente)) errores.push(`Lo adelantado «${a.texto}» nombra el frente «${a.frente}», que no está.`);
  }
  for (const [id, g] of Object.entries(plan.diagnostico?.frentes ?? {})) {
    if (!frentes.has(id)) errores.push(`El diagnóstico nombra el frente «${id}», que no está.`);
    if (!(g.nota >= 0 && g.nota <= 5)) errores.push(`El diagnóstico de «${id}» tiene una nota fuera de 0 a 5.`);
  }
  const estrategia = plan.diagnostico?.estrategia;
  if (estrategia && (!estrategia.texto?.trim() || !estrategia.fuentes?.some((f) => f?.trim()))) errores.push('La estrategia del diagnóstico necesita su texto y al menos una fuente real.');
  // Las misiones y lo que dice el director
  unicos('Misiones', (plan.misiones ?? []).map((m) => m.id));
  const criterios = new Set(plan.fases.flatMap((f) => f.criterios.map((c) => c.id)));
  const misiones = new Set((plan.misiones ?? []).map((m) => m.id));
  // La cola del director nombra solo lo suyo (propuestas y pedidos), una vez cada uno
  if (plan.colaDirector !== undefined) {
    if (!Array.isArray(plan.colaDirector)) errores.push('La cola del director («colaDirector») no es una lista de ids.');
    else {
      const vistos = new Set<string>();
      for (const id of plan.colaDirector) {
        if (typeof id !== 'string' || (!plan.propuestas.some((p) => p.id === id) && !(plan.pedidos ?? []).some((p) => p.id === id))) errores.push(`La cola del director nombra «${String(id)}», que no es una propuesta ni un pedido del plan.`);
        else if (vistos.has(id)) errores.push(`La cola del director nombra «${id}» dos veces.`);
        vistos.add(String(id));
      }
    }
  }
  for (const m of plan.misiones ?? []) {
    if (personas && !personas.includes(m.para)) errores.push(`La misión «${m.id}» es para alguien que no está en el equipo («${m.para}»).`);
    if (!fases.has(m.fase)) errores.push(`La misión «${m.id}» nombra la fase «${m.fase}», que no está.`);
    if (!frentes.has(m.frente)) errores.push(`La misión «${m.id}» nombra el frente «${m.frente}», que no está.`);
    if (!m.pasos?.length) errores.push(`La misión «${m.id}» no dice sus pasos.`);
    if (!(m.xp > 0)) errores.push(`La misión «${m.id}» no da experiencia.`);
    if (m.vigente !== undefined && Number.isNaN(Date.parse(m.vigente))) errores.push(`La misión «${m.id}» dice que se comprobó vigente en una fecha que no se entiende («${m.vigente}»).`);
    for (const c of m.criterios ?? []) if (!criterios.has(c)) errores.push(`La misión «${m.id}» nombra el criterio «${c}», que no está.`);
    // El orden, comprobado: lo que una misión necesita existe y, si es una misión de la misma persona, va antes
    const posicion = plan.misiones.indexOf(m);
    for (const id of m.despuesDe ?? []) {
      const previa = plan.misiones.findIndex((x) => x.id === id);
      if (id === m.id) errores.push(`La misión «${m.id}» dice que va después de sí misma.`);
      else if (previa < 0 && !plan.propuestas.some((p) => p.id === id) && !pedidos.has(id)) errores.push(`La misión «${m.id}» va después de «${id}», que no es una misión, una propuesta ni un pedido del plan.`);
      else if (previa > posicion && plan.misiones[previa].para === m.para) errores.push(`La misión «${m.id}» va después de «${id}», pero está antes en la lista: pon primero lo que se necesita primero.`);
    }
    for (const d of m.documentos ?? []) if (!esDocumento(d)) errores.push(`La misión «${m.id}» nombra un documento que no es de docs/ ni repo: («${d}»).`);
    if (m.recomiendaRevision !== undefined && (typeof m.recomiendaRevision !== 'string' || !m.recomiendaRevision.trim() || m.recomiendaRevision.length > 300))
      errores.push(`La misión «${m.id}» recomienda pedir la revisión sin decir por qué en una frase (de 1 a 300 caracteres).`);
    // Un botón viejo a una pestaña que ya no existe se tolera en una misión ya aprobada (es historia); en las demás, no
    const aprobada = plan.revisiones?.[m.id]?.veredicto === 'aprobada';
    for (const p of m.pasos ?? []) if (typeof p !== 'string' && p.ir) destinoValido(p.ir, `Un paso de la misión «${m.id}»`, aprobada);
    for (const p of m.pasos ?? []) {
      if (typeof p === 'string') continue;
      if (p.detalle && (!Array.isArray(p.detalle) || p.detalle.some((x) => typeof x !== 'string' || !x.trim()))) errores.push(`Un paso de la misión «${m.id}» tiene un detalle que no es una lista de frases.`);
      const donde = `Un paso de la misión «${m.id}» («${p.texto.slice(0, 40)}…»)`;
      if (p.opciones !== undefined) {
        const o = p.opciones;
        // Medida sin los espacios de los extremos, como la guarda el servidor al elegirla
        const larga = Array.isArray(o) ? o.find((x) => typeof x === 'string' && x.trim().length > MAX_ELECCION)?.trim() : undefined;
        if (!Array.isArray(o) || o.some((x) => typeof x !== 'string' || !x.trim())) errores.push(`${donde} tiene opciones que no son una lista de frases.`);
        else if (o.length < 2 || o.length > MAX_OPCIONES) errores.push(`${donde} da ${o.length} opciones: deben ser de 2 a ${MAX_OPCIONES}.`);
        else if (new Set(o.map((x) => x.trim().toLowerCase())).size !== o.length) errores.push(`${donde} repite una opción.`);
        else if (larga) errores.push(`${donde} tiene una opción de ${larga.length} caracteres («${larga.slice(0, 40)}…»): el tope es ${MAX_ELECCION}, porque el Studio guarda la elección entera o no la guarda. Acórtala y lleva lo demás al texto del paso.`);
        if (p.hecho) errores.push(`${donde} tiene opciones y \`hecho\`: con opciones se marca solo al elegir; quita el \`hecho\`.`);
        if (Array.isArray(o) && p.varias === true && o.some((x) => typeof x === 'string' && x.includes(ENTRE_ELECCIONES.trim()))) errores.push(`${donde} elige varias y una opción lleva «${ENTRE_ELECCIONES.trim()}», con que la nota las separa: quítalo.`);
      }
      if (p.varias !== undefined && (p.varias !== true || p.opciones === undefined)) errores.push(`${donde} tiene \`varias\` ${p.varias !== true ? 'que no es true' : 'sin opciones'}: \`varias: true\` va solo en un paso con opciones, para elegir una o varias.`);
      if (p.esperar !== undefined) {
        if (typeof p.esperar !== 'number' || !Number.isInteger(p.esperar) || p.esperar < 5 || p.esperar > MAX_ESPERAR) errores.push(`${donde} pide esperar ${p.esperar} segundos: debe ser un entero de 5 a ${MAX_ESPERAR}.`);
        // La cuenta retiene lo que el paso pide hacer: sus opciones o el botón que lleva a verlo
        if (p.opciones === undefined && p.ir === undefined) errores.push(`${donde} pide esperar sin opciones ni botón: la cuenta regresiva retiene uno de los dos.`);
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
      if (p.copiar !== undefined && (typeof p.copiar !== 'string' || !p.copiar.trim())) errores.push(`${donde} tiene \`copiar\` vacío: pon el texto que la persona pega, o quítalo.`);
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
      // Un botón a su propia misión deja a la persona donde ya está, y el Studio no lo muestra (sin vista, ya se avisó
      // arriba que no dice a dónde lleva)
      const ir = destinoDelPaso(p);
      if (ir?.vista && llevaAqui(ir, lugarDeMision(m))) errores.push(`${donde} tiene un botón que lleva a su propia misión (en Hoy), donde la persona ya está: el Studio no lo muestra. Llévalo al lugar donde se hace el paso, o quítale el \`ir\`.`);
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
  function destinoValido(ir: Destino, donde: string, historia = false) {
    if (!ir.etiqueta?.trim()) errores.push(`${donde} lleva a alguna parte pero su botón no tiene texto.`);
    if (!ir.vista && !ir.doc && !ir.url) errores.push(`${donde} tiene botón pero no dice a dónde lleva.`);
    if (ir.vista && !VISTAS_DIRECTOR.includes(ir.vista) && !(historia && VISTAS_RETIRADAS.includes(ir.vista))) {
      errores.push(VISTAS_RETIRADAS.includes(ir.vista)
        ? `${donde} lleva a una pestaña que ya no está en el Studio («${ir.vista}»): si es para la animación pública, usa \`url\`.`
        : `${donde} lleva a una pestaña que no existe («${ir.vista}»).`);
    }
    if (ir.doc && !esDocumento(ir.doc)) errores.push(`${donde} lleva a un documento que no es de docs/ ni repo:.`);
    if (ir.fase && !fases.has(ir.fase)) errores.push(`${donde} lleva a una fase que no está («${ir.fase}»).`);
    if (ir.tipoValidacion && !TIPOS_VALIDACION.includes(ir.tipoValidacion)) errores.push(`${donde} pide un tipo de validación desconocido.`);
    if (ir.url && !URL_VALIDA.test(ir.url)) errores.push(`${donde} lleva a una página que no es https (ni de este computador).`);
    const propuesta = ir.ancla?.startsWith('propuesta-') ? plan.propuestas.find((x) => `propuesta-${x.id}` === ir.ancla) : undefined;
    if (ir.ancla?.startsWith('propuesta-') && !propuesta) errores.push(`${donde} lleva a una propuesta que no está («${ir.ancla}»).`);
    // En «La ruta», una propuesta se ve en su fase
    if (propuesta && ir.vista === 'ruta' && ir.fase !== propuesta.fase) errores.push(`${donde} lleva a la propuesta «${propuesta.id}», que en «La ruta» se ve en su fase («${propuesta.fase}»).`);
    // Un pedido se ve en «La ruta» de su fase (el de después del lanzamiento, en la última): el botón lleva ahí, y el
    // pedido existe
    const pedido = ir.ancla?.startsWith('pedido-') ? (plan.pedidos ?? []).find((x) => `pedido-${x.id}` === ir.ancla) : undefined;
    if (ir.ancla?.startsWith('pedido-') && !pedido) errores.push(`${donde} lleva a un pedido que no está («${ir.ancla}»).`);
    if (pedido && (ir.vista !== 'ruta' || ir.fase !== faseDondeSeVe(plan, pedido))) errores.push(`${donde} lleva al pedido «${pedido.id}», que se ve en «La ruta», en su fase («${faseDondeSeVe(plan, pedido)}»).`);
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
  if (p.objetivo && (!p.objetivo.texto?.trim() || !p.objetivo.exito?.trim())) errores.push('La meta fijada debe decir qué se logra y cómo se sabe que se logró.');
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

/**
 * Lo que se le negó al director en un lanzamiento (propuesta aceptada «Lo que se le negó al director, a la vista»): cada
 * herramienta u orden que el agente le negó, leída del resultado de su registro en stream-json (`permission_denials`),
 * sin repetir y en el orden en que pasó. Así la revisión siguiente empieza sabiéndolo, en vez de volver a intentarlo.
 */
export function negacionesDe(registro: string): string[] {
  const vistas = new Set<string>();
  for (const linea of registro.split('\n')) {
    if (!linea.includes('"permission_denials"')) continue;
    let j: { type?: string; permission_denials?: { tool_name?: string; tool_input?: Record<string, unknown> }[] };
    try {
      j = JSON.parse(linea);
    } catch {
      continue;
    }
    if (j.type !== 'result') continue;
    for (const d of j.permission_denials ?? []) vistas.add(usoNegado(d.tool_name, d.tool_input));
  }
  return [...vistas];
}

/** Una herramienta y lo que intentó con ella, en una línea corta: así se nombra cada permiso negado. */
export function usoNegado(herramienta: string | undefined, entrada: Record<string, unknown> = {}): string {
  const que = String(entrada.command ?? entrada.file_path ?? entrada.path ?? entrada.url ?? entrada.query ?? '').replace(/\s+/g, ' ').trim();
  return `${herramienta || 'Una herramienta'}${que ? `: ${que.length > 160 ? `${que.slice(0, 159)}…` : que}` : ''}`;
}

/**
 * Lo que se le va negando al director mientras revisa, sin esperar a su resultado final (propuesta aceptada «Los
 * permisos, al momento»: lo negado a la vista en vivo): cada aviso `permission_denied` de su registro, nombrado con la
 * herramienta y lo que intentó (de su uso, por el id), sin repetir y en el orden en que pasó. Se lee por partes: `usos`
 * y `negados` siguen de una parte a la siguiente.
 */
export function negadosEnVivo(registro: string, usos = new Map<string, string>(), negados: string[] = []): string[] {
  for (const linea of registro.split('\n')) {
    if (!linea.startsWith('{') || (!linea.includes('"tool_use"') && !linea.includes('"permission_denied"'))) continue;
    let ev: { type?: string; subtype?: string; tool_name?: string; tool_input?: Record<string, unknown>; tool_use_id?: string; message?: { content?: unknown } };
    try {
      ev = JSON.parse(linea);
    } catch {
      continue;
    }
    if (ev.type === 'assistant' && Array.isArray(ev.message?.content))
      for (const b of ev.message.content as { type?: string; id?: string; name?: string; input?: Record<string, unknown> }[])
        if (b?.type === 'tool_use' && b.id) usos.set(String(b.id), usoNegado(b.name, b.input));
    if (ev.type === 'system' && ev.subtype === 'permission_denied') {
      // Sin su uso, la entrada que traiga el aviso: la línea del Studio por lo que negó su gancho la trae
      const que = usos.get(String(ev.tool_use_id)) ?? usoNegado(ev.tool_name, ev.tool_input && typeof ev.tool_input === 'object' ? ev.tool_input : {});
      if (!negados.includes(que)) negados.push(que);
    }
  }
  return negados;
}

/**
 * Cuántos proyectos de la cola de diagnósticos atiende el director en cada revisión, además del activo: es trabajo
 * suyo, no del titular, que sigue viendo un proyecto a la vez.
 */
export const POR_REVISION = 3;

/**
 * La cola de diagnósticos es un encargo grande: se hace en vueltas, un proyecto a la vez, cada uno con su commit en su
 * memoria antes del siguiente, para que un corte se lleve una vuelta y no todo (propuesta aceptada pr_retoma_automatica,
 * punto 6; docs/metodo/director/diagnosis-queue.md › «In rounds»). La bandeja lo dice cuando la cola trae más de uno.
 */
export const EN_VUELTAS =
  'Es un encargo grande: hazlo en vueltas, un proyecto a la vez. Diagnostica uno entero (si necesita varios lectores a la vez, espéralos a todos antes de escribir) y, apenas su diagnóstico esté en su memoria, haz su commit ahí («Director (<id>): diagnóstico») antes de empezar el siguiente: si la revisión se corta, se pierde solo el que estaba en curso, y la siguiente sigue con los demás.';

/** Lo que hace falta saber de un proyecto del Studio para decidir si está en la cola de diagnósticos. */
export interface CandidatoDeCola {
  id: string;
  nombre: string;
  /** Si ya tiene diagnóstico (en uno nuevo, su planteamiento). */
  diagnosticado: boolean;
  tipo?: TipoProyecto;
  /** Si su repositorio está conectado en este computador. */
  conectado: boolean;
  historialIA?: NonNullable<Proyecto['historialIA']>;
}

/**
 * La cola de diagnósticos: los proyectos existentes recién entregados (sin diagnóstico y con el repositorio conectado en
 * este computador), menos el activo, del trabajo más reciente al más viejo. Un proyecto que no se pudo diagnosticar
 * sigue aquí en la revisión siguiente, porque lo único que lo saca es su diagnóstico: nunca se da por hecho. La
 * bandeja la lista y el Studio, al lanzar la revisión, le abre al director los primeros POR_REVISION (propuesta aceptada
 * «La cola de diagnósticos, con los permisos de hoy»).
 */
export function colaDeDiagnosticos(candidatos: CandidatoDeCola[], activo: string): { id: string; nombre: string; historial: string; historialIA: NonNullable<Proyecto['historialIA']> }[] {
  return candidatos
    .filter((c) => c.id !== activo && !c.diagnosticado && c.tipo !== 'nuevo' && c.conectado)
    .map((c) => {
      const h = c.historialIA ?? [];
      return { id: c.id, nombre: c.nombre || c.id, historial: h.map((x) => `${x.agente}${x.sesiones ? ` (${x.sesiones})` : ''}`).join(', '), historialIA: h, ultima: h.map((x) => x.ultima ?? '').sort().at(-1) ?? '' };
    })
    .sort((a, b) => b.ultima.localeCompare(a.ultima))
    .map(({ ultima: _ultima, ...resto }) => resto);
}
