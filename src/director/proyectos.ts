// Los proyectos del Estudio. Un Estudio dirige varios proyectos, y la memoria de cada uno vive en SU repositorio, no en
// el Estudio: en una rama aparte, `stl`, que el Estudio abre en la carpeta `.stl/` del proyecto (un worktree de git,
// excluido solo en ese computador). Así el código del proyecto no se mezcla con la dirección, su integración continua no
// corre por ella, y el Estudio queda limpio: solo su código y lo de este computador.
//
//   <repositorio>/.stl/proyecto.json              el contexto, el objetivo y el equipo (lo escribe el titular)
//   <repositorio>/.stl/director/plan.json         la ruta y lo que dice el director (lo escribe la sesión del director)
//   <repositorio>/.stl/director/archivo/          lo cerrado que salió del plan para que no pese, un AAAA-MM.json por mes
//                                                 (la bandeja, al cerrar); archivo.json, el de antes, de una sola pieza
//   <repositorio>/.stl/director/equipo/<p>.json   lo que hace cada persona: entregas, notas, decisiones (el Estudio)
//   <repositorio>/.stl/director/notas/            los audios y sus transcripciones
//   <repositorio>/.stl/docs/                      los documentos del director para ese proyecto
//
// Dentro del Estudio, todo eso se nombra con rutas virtuales, `proyectos/<id>/…` (así lo guardan las notas y así lo
// piden las páginas): `ubicar` y `enDisco` dicen dónde está de verdad. Lo que es de cada computador no va en git:
// estudio.local.json guarda el proyecto activo y la carpeta del repositorio de cada proyecto, que es también la lista
// de proyectos de este Estudio. Lo usan el servidor del Estudio y tools/director/*.ts (por eso no importa nada relativo
// en tiempo de ejecución: Node lo corre tal cual).
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { appendFile, mkdir, readdir, readFile, rename, rm, stat, unlink, writeFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import type { Integrante, Proyecto, TipoProyecto, Tramo } from './director.ts';
import { estadoAsistenteDe, type EstadoAsistente } from './asistente.ts';
import { avisoNormal, conConsulta, consultarVersion, tocaConsultar, type AvisoGuardado } from './avisoVersion.ts';
import { esPlanDeClaude, type PlanDeClaude } from './consumoDelPlan.ts';
import { mensajeDeCuenta, sesionAprobada, type SesionAprobada } from './cuentaGit.ts';
import { esIdioma, type Idioma } from './idioma.ts';

/** El prefijo de las rutas virtuales de los proyectos dentro del Estudio. */
export const CARPETA = 'proyectos';
/** La carpeta de la memoria dentro del repositorio de cada proyecto, y su rama. */
export const MEMORIA = '.stl';
export const RAMA = 'stl';
export const ARCHIVO_LOCAL = 'estudio.local.json';
const ID_VALIDO = /^[a-z0-9][a-z0-9-]{0,39}$/;

/** Las rutas virtuales (con «/») de lo de un proyecto. */
export function rutasDe(id: string) {
  const base = `${CARPETA}/${id}`;
  return {
    base,
    proyecto: `${base}/proyecto.json`,
    plan: `${base}/director/plan.json`,
    /** Lo que salió del plan para que no pese, de una sola pieza: el de antes de partirlo por mes, que ya no cambia (director › `unirArchivo`). */
    archivo: `${base}/director/archivo.json`,
    /** Lo que sale del plan desde que el archivo se parte por mes: un AAAA-MM.json por mes (director › `partirArchivoPorMes`). */
    archivoMeses: `${base}/director/archivo`,
    equipo: `${base}/director/equipo`,
    persona: (p: string) => `${base}/director/equipo/${p}.json`,
    notas: `${base}/director/notas`,
    docs: `${base}/docs`,
    radiografia: `${base}/director/radiografia.md`,
  };
}

/** Lo que el Estudio sube solo a GitHub, relativo a la memoria: lo de cada persona, sus audios y lo del proyecto. */
export const SUBE_SOLO = /^(director\/equipo\/|director\/notas\/|proyecto\.json$)/;

/** Un id para un proyecto nuevo, a partir de su nombre. */
export function idDeNombre(nombre: string, usados: string[]): string {
  const base = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'proyecto';
  let id = base;
  for (let i = 2; usados.includes(id); i++) id = `${base}-${i}`;
  return id;
}

/**
 * Si dos correos son el mismo para el Estudio, que reconoce a cada persona comparando el correo de git de su carpeta con el
 * de su equipo (estudio/servidor/sincronizar.ts › leerIdentidad): sin distinguir mayúsculas ni espacios de más. Un correo
 * vacío (o que no es texto) no es el de nadie.
 */
export function mismoCorreo(a: unknown, b: unknown): boolean {
  const limpio = (c: unknown) => (typeof c === 'string' ? c.trim().toLowerCase() : '');
  return limpio(a) !== '' && limpio(a) === limpio(b);
}

/** Un correo con la forma algo@algo.algo, sin espacios (ni los signos que romperían una orden copiada a la terminal). */
export function correoValido(texto: string): boolean {
  return typeof texto === 'string' && /^[^@\s<>"`$\\]+@[^@\s<>"`$\\.]+(\.[^@\s<>"`$\\.]+)+$/.test(texto);
}

/**
 * El equipo de un proyecto con el correo de git de una persona cambiado: cada integrante cuyo correo es `viejo` (sin
 * distinguir mayúsculas ni espacios) queda con `nuevo`, y lo demás igual. Devuelve el equipo nuevo y a cuántos cambió, sin
 * tocar el que recibe. Con un `viejo` o un `nuevo` vacíos, o iguales, no cambia a nadie. Lo usa tools/cambiar-correo.ts: el
 * correo tiene que cambiar en el equipo y en git a la vez, o el Estudio deja de reconocer a la persona.
 */
export function cambiarCorreoDelEquipo(equipo: Integrante[], viejo: string, nuevo: string): { equipo: Integrante[]; cambiados: number } {
  const sinCambio = !nuevo.trim() || mismoCorreo(viejo, nuevo);
  let cambiados = 0;
  const cambiado = equipo.map((i) => {
    if (sinCambio || !mismoCorreo(i.correo, viejo)) return i;
    cambiados++;
    return { ...i, correo: nuevo.trim() };
  });
  return { equipo: cambiado, cambiados };
}

// ───────────────────────────────────────────── lo de este computador

/**
 * Cómo pide permisos el director lanzado: solo lo autorizado (el de siempre), preguntándote en el Studio, o «Automático,
 * vigilado», donde Claude Code decide solo lo que le falta y el Studio lo deja a la vista (pedido pd_permiso_automatico).
 */
export type ModoPermisos = 'autorizado' | 'pregunta' | 'automatico';
export const esModoPermisos = (x: unknown): x is ModoPermisos => x === 'autorizado' || x === 'pregunta' || x === 'automatico';

export interface Local {
  /** El proyecto activo en este computador. */
  activo: string | null;
  /** La carpeta del repositorio de cada proyecto en este computador: también, la lista de proyectos. */
  repositorios: Record<string, string>;
  /**
   * La revisión pedida de cada proyecto (botón «Pedir revisión»), por su id: la lanza el Studio o la toma la sesión del
   * director. Una por proyecto, y varias a la vez (pedido pd_revisiones_simultaneas, decisión nmwdo75vytit): cada una con
   * su estado, su candado y su registro. Antes era una sola, `revision`: al leerla se pasa aquí (`normal`).
   */
  revisiones?: Record<string, RevisionPedida>;
  /**
   * Lo que dejó una revisión que no se cerró y alguien canceló: la próxima que se pida de ese proyecto lo retoma igual
   * (pedirRevision; propuesta aceptada pr_retoma_automatica, punto 3). Una revisión que cierra lo borra.
   */
  retoma?: Reintento & { proyecto: string };
  /**
   * La huella del plan de cada proyecto al cerrar su última revisión, urgencia o aclaración (propuesta aceptada
   * pr_cierre_vigilado, punto 4): si el plan cambia después sin un director trabajando, el Studio lo avisa.
   */
  huellas?: Record<string, { sha: string; cuando: string }>;
  /** «No lo entiendo, explícamelo mejor» de un paso: la lanza el Studio aparte, sin el resto de la revisión. */
  aclaracion?: AclaracionPedida;
  /** Una nota urgente: la lanza el Studio sola y al instante, sin el resto de la revisión. */
  urgencia?: UrgenciaPedida;
  /**
   * La última vez que la sesión del director miró si había una revisión pedida (/vigila › bandeja --pedida). Así el
   * Studio sabe si alguien está mirando: un ciclo (/loop) vive solo mientras su sesión está abierta.
   */
  vigilia?: string;
  /**
   * Si el Studio lanza solo al director cuando se pide una revisión (estudio/servidor/revisor.ts). Sin decir nada, lo
   * hace si encuentra Claude Code con su sesión iniciada; `false` lo apaga y las toma la sesión del director (/vigila).
   */
  agente?: false;
  // El modelo y el esfuerzo del director ya no van aquí: son los de Claude Code (estudio/servidor/ajustesClaude.ts),
  // los mismos que cambian /model y /effort
  /**
   * Salvo «Máximo», que Claude Code no guarda en su configuración (lo aplica solo a una sesión): elegido en «Modelo y
   * consumo», el Studio lo recuerda aquí y lo pasa con --effort max al director y a la terminal que abre.
   */
  esfuerzoMaximo?: true;
  /** «Todo con el modelo que elegí»: los ayudantes, con el modelo del director (guardarTodoConElModelo). */
  todoConElModelo?: true;
  /** Las secciones cuya ayuda guiada ya se vio, una vez para todos los proyectos (guardarAyudaVista; pd_ayuda_guiada). */
  ayudasVistas?: string[];
  /** La línea de versión nueva: lo que dijo GitHub, lo que se cerró y si la casilla la apagó (avisoVersion.ts). */
  avisoVersion?: AvisoGuardado;
  /**
   * `false`: el director que lanza el Studio arranca sin tus ajustes de usuario de Claude Code (~/.claude/settings.json) y,
   * con ellos, sin tus skills ni tus comandos; se elige en «Modelo y consumo», viendo los nombres de sus claves (nota de
   * voz del titular nmvojtb7rtit, 25 de octubre de 2026; pd_arranque_limpio). Sin la clave, los carga, como siempre.
   */
  ajustesPropios?: false;
  /**
   * Las claves de tus ajustes que el director conserva aunque no cargue el archivo (con `ajustesPropios` falso): las de
   * primer nivel y, de env y de permissions, cada una suya («env.X», «permissions.deny»). Se eligen una por una, con su
   * explicación, en «Modelo y consumo» (notas de voz del titular nmvolgrmctit y nmvoljwl9tit, 25 de octubre de 2026);
   * el lanzador las suma a los ajustes del Studio (estudio/servidor/ajustesPropios.ts › conservarDe).
   */
  ajustesConservados?: string[];
  /**
   * Todas las claves de tus ajustes que había al guardar esa selección (nota de voz del titular nmvoottaitit, 25 de octubre
   * de 2026: lo que el Studio detecta queda escrito, y si cambia, se vuelve a confirmar). Una clave que aparece después es
   * nueva: el director usa lo recomendado para ella y «Modelo y consumo» te pide confirmarla (ajustesPropios.ts › conNuevas).
   */
  ajustesVistos?: string[];
  /**
   * Cómo pide permisos el director lanzado (propuesta aceptada pr_permisos_al_momento; pedido pd_permiso_espera; se elige en
   * «Modelo y consumo» › «Cómo pide permisos el director»): `autorizado` (sin la clave, como siempre) es solo lo autorizado,
   * y lo que falta se le niega y queda en el panel de permisos; `pregunta` es «Me pregunta en el Studio»: lo que le falta se
   * te pregunta en un diálogo durante la revisión (estudio/servidor/modoPermisos.ts).
   */
  modoPermisos?: ModoPermisos;
  /**
   * Tu plan de Claude en este computador (Pro, Max 5x o Max 20x), para recomendarte el modelo (consumoDelPlan.ts): lo
   * consumido se dice igual con cualquier plan. El Studio corre sobre tu cuenta, con Claude Code, nunca con una clave de API.
   */
  planDeClaude?: PlanDeClaude;
  /** El asistente de instalación: dónde va y lo que ya se eligió, para volver ahí si se cierra a mitad (asistente.ts; pd_valores_instalar). */
  asistente?: EstadoAsistente;
  /** El idioma de la interfaz en este computador, para todos los proyectos (pd_idiomas). Sin él, el del navegador, y se guarda. */
  idioma?: Idioma;
  /**
   * Si este Studio es la copia de quien lo desarrolla (pd_medicion_solo_desarrollo; t_decide_marca_desarrollo): una sola
   * marca, en este computador y fuera de git, que enciende lo que solo vale ahí: la medición del núcleo, la firma de
   * publicación de los commits y subir la página «Qué es STL» (pd_stl_semilla). Sin ella, nada de eso se ve ni se puede
   * pedir; su código y sus pruebas siguen en el repositorio.
   */
  copiaDeDesarrollo?: boolean;
  /**
   * La cuenta de GitHub aprobada para cada proyecto en este computador (por id; cuentaGit.ts): la pone su titular en
   * «Proyecto» › Dónde está. Sin ella, nada sube, baja ni publica en ese proyecto.
   */
  cuentasGit?: Record<string, string>;
  /**
   * La segunda dirección, solo del proyecto STL Studio: el repositorio privado de GitHub donde se respalda su memoria, que
   * nunca va al repositorio del mismo Studio, público (respaldo.ts; decisión nmwfl2c3ltit).
   */
  respaldoDelStudio?: string;
  /** Los proyectos cuya memoria se respalda aunque su repositorio de GitHub sea público: lo enciende su titular (nmwf5lg39tit). */
  respaldoPublico?: string[];
  /** De qué cierre del proyecto STL Studio es la rama de respaldo que ya quedó (semilla.ts › tocaRespaldo). */
  respaldoDe?: string;
  /**
   * Los permisos que el titular le dio al director lanzado, más allá de los de siempre (revisor.ts › permitido). Los pide el
   * Studio cuando hacen falta y el titular los da con «Autorizo»: `ultracode`, que el director siga a ultracode cuando está
   * encendido, con los flujos de varios agentes (Workflow) que eso necesita. `autorizados`: lo que se le negó en una
   * revisión y el titular le dio con una casilla en «Modelo y consumo» › permisos (nota de voz del titular nmvotdn3ftit,
   * 26 de octubre de 2026; estudio/servidor/permisosNegados.ts). `skills`: las skills de cada proyecto que el director
   * carga, cada una con la huella de sus archivos; las demás se apagan al lanzarlo (propuesta aceptada pr_skills_cierre;
   * estudio/servidor/skillsDelProyecto.ts).
   */
  permisos?: { ultracode?: true; autorizados?: PermisoAutorizado[]; skills?: SkillAutorizada[] };
  /**
   * Los tipos de orden que se abren directo en una ventana de terminal, por proyecto (pd_sin_terminal, nmwqkn8m1tit): los
   * marca «Me pide escribir: ábrela en una terminal» cuando una orden callada esperaba una respuesta. Se guarda tal cual.
   */
  enVentana?: { proyecto: string; regla: string; cuando: string }[];
}

/**
 * Una skill de un proyecto que el titular autorizó en este computador (pr_skills_cierre): su nombre, dónde está en el
 * repositorio y la huella de sus archivos al autorizarla. Si cambia un archivo, la huella ya no coincide y se apaga.
 */
export interface SkillAutorizada {
  proyecto: string;
  nombre: string;
  ruta: string;
  huella: string;
  cuando: string;
  quien: string;
}

/**
 * Un permiso que se le negó al director y el titular le dio con su casilla: la regla de Claude Code (la general del tipo
 * de acción negado, permisosNegados.ts › reglaDe) y su alcance, «Solo este proyecto» (`proyecto`) o «Todos los proyectos de este computador».
 */
export interface PermisoAutorizado {
  regla: string;
  alcance: 'proyecto' | 'todos';
  proyecto?: string;
  cuando: string;
  quien: string;
  /**
   * `claude`: no lo marcó nadie con su casilla, lo aprobó solo Claude Code en el modo «Automático, vigilado», y el Studio lo
   * dejó aquí al terminar la revisión, para que se vea y se quite cuando quieras (tu elección del 26 de octubre de 2026).
   */
  origen?: 'claude';
  /** La hora (ISO) de la pregunta de la revisión en la que se dio con «Siempre»; sin ella, se dio fuera de una revisión. */
  revision?: string;
}

/** Un modelo que acepta `claude --model`: un alias (opus, sonnet, haiku) o un id completo. */
export const MODELO_VALIDO = /^[a-z][a-z0-9.\-[\]]{1,59}$/;

/** Los niveles de esfuerzo que acepta `claude --effort`, de menos a más. */
export const ESFUERZOS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
export type Esfuerzo = (typeof ESFUERZOS)[number];
export const esEsfuerzo =(x: unknown): x is Esfuerzo => typeof x === 'string' && (ESFUERZOS as readonly string[]).includes(x);

/**
 * Una revisión pedida desde el Studio. La toma el director lanzado por el Studio (`lanzada`) o, sin él, la sesión del
 * director en su ciclo (/loop con /vigila, que mira `bandeja.ts --pedida`). Al empezar queda `enCurso` y al cerrar,
 * `hecha`. Si la lanzada no terminó, `error` dice por qué, y la puede tomar la sesión del director.
 */
export interface RevisionPedida {
  proyecto: string;
  quien: string;
  pedida: string;
  lanzada?: string;
  enCurso?: string;
  hecha?: string;
  error?: string;
  /** El reporte de por qué no terminó, para el diálogo «Qué pasó con la revisión» (junto a `error`, que lo resume). */
  falla?: FallaRevision;
  /** Cuándo se había lanzado la que no terminó (junto a `error`: `lanzada` sale, para que la tome la sesión del director). */
  fallida?: string;
  /**
   * Pedida de nuevo después de una que no se cerró: lo que esa alcanzó a dejar (desde `lanzada`) está hecho y no se
   * rehace; la bandeja lo lista y esta revisión solo termina lo que falta (nota de voz del titular, 21 de octubre de 2026).
   */
  reintento?: Reintento;
  /** Desde dónde la pidió la persona: el botón que la nombra (`ORIGENES_REVISION`). */
  origen?: OrigenRevision;
  /** Sus minutos, si no son los de siempre: los que estimó el director al cerrar la anterior (`Plan.tramo`, limiteDelTramo). */
  limite?: number;
}

/**
 * Una revisión la pide solo una persona, con un botón que dice que la pide (regla dura del titular, 23 de octubre de
 * 2026: «nunca se disparan revisiones automáticamente; solamente el usuario puede dispararlas»). Estos son esos botones;
 * el servidor no acepta otro origen, y nada del Studio la pide solo: ni entregar una misión o un proyecto, ni una
 * urgencia o una aclaración que no se pudieron lanzar (la prueba «nadie pide una revisión solo» lo vigila en el código).
 */
export const ORIGENES_REVISION = {
  cabecera: '«Pedir revisión», en la cabecera',
  falla: '«Retomarla», en «Qué pasó con la revisión»',
  falla_nota: '«Con una nota al director», en «Qué pasó con la revisión»',
  falla_sin_ultracode: '«Sin ultracode», en «Qué pasó con la revisión»',
  meta: '«Guardar y pedir la revisión», al replantear la meta',
  urgente: '«Sí, dejarlo y pedir la revisión», al marcar una nota urgente',
  recomendada: '«Pedir la revisión», en la recomendación del director',
  // Autoriza lo marcado y pide la revisión con el mismo clic, porque lo dice (decisión del titular del 23 de octubre de
  // 2026; pedido pd_panel_permisos)
  permisos: '«Autorizo y pido la revisión», en el panel de permisos',
  // (Las revisiones encadenadas salieron del Studio el 12 de noviembre de 2026, nota nmwdqtq1ntit: una revisión a la vez,
  // pedida a mano; pedido pd_sin_revisiones_seguidas)
  // Sin misión abierta, «Hoy» dice que el paso siguiente es pedir la revisión, con su botón (nota de voz del titular
  // nmvsrix5ptit, 28 de octubre de 2026): lo ofrece, nunca la pide sola
  hoy: '«Pedir la revisión», en «Hoy», sin misión abierta',
  // «Diagnosticar y reparar» (pd_salud_c; nmw9re982tit): lanza al director solo para reparar el Studio, como una urgencia,
  // con un clic de la persona en la pantalla de emergencia o en «Salud del Studio» (estudio/servidor/reparar.ts)
  reparar: '«Diagnosticar y reparar», en la pantalla de emergencia o en «Salud del Studio»',
  // «Entregar y pedir su diagnóstico», al entregar un proyecto existente (decisión del titular del 10 de noviembre de 2026
  // en primeros-pasos.md, nmwagqqtctit; pedido pd_entregar_y_diagnosticar): el botón dice que pide la revisión, y su
  // título, que usa el plan. Es el único botón de entregar: el diagnóstico es obligatorio (nmwai6p98tit)
  entrega_diagnostico: '«Entregar y pedir su diagnóstico», al entregar un proyecto',
  // «Confirmar la meta y trazar la ruta», en «La meta» (pedido pd_inicio_guiado; el titular eligió el 10 de noviembre de
  // 2026, nmwajgncftit, que confirmar la meta pida la ruta): el botón dice que la pide, y su título, que usa el plan
  confirmar_meta: '«Confirmar la meta y trazar la ruta», en «La meta»',
} as const;

/**
 * La misión de arranque de un proyecto existente que solo pide pedir el diagnóstico (plantilla/plan*.json): no nace si el
 * diagnóstico se pidió al entregarlo (pd_entregar_y_diagnosticar).
 */
export const MISION_PEDIR_DIAGNOSTICO = 't_conectar';
/**
 * La de un proyecto nuevo (plantilla/plan-nuevo*.json): repasar lo contado y pedir la revisión del planteamiento. Lo
 * contado ya está en el formulario y la revisión se pide al entregarlo (pd_entrega_al_instante): tampoco nace entonces.
 */
export const MISION_PEDIR_PLANTEAMIENTO = 't_contar';
export type OrigenRevision = keyof typeof ORIGENES_REVISION;
export const esOrigenRevision = (x: unknown): x is OrigenRevision => typeof x === 'string' && Object.hasOwn(ORIGENES_REVISION, x);

/** La revisión que no se cerró y que esta retoma: desde cuándo trabajó, qué pasó y su registro. */
export interface Reintento {
  lanzada: string;
  que: string;
  registro?: string;
}

/**
 * El reporte de una revisión lanzada que no se cerró (estudio/servidor/revisor.ts › diagnosticarFalla), para el diálogo
 * «Qué pasó con la revisión» (nota de voz del titular, 21 de octubre de 2026: dos revisiones se perdieron sin decir
 * nada; si algo sale mal, se avisa, y con su porqué). Se lee del registro, sin modelo.
 */
export interface FallaRevision {
  /** Qué pasó, en una frase. */
  que: string;
  /** La causa probable, leída del registro. */
  porque: string;
  /** Cuánto duró, en minutos; null si no se sabe. */
  duracion: number | null;
  /** Los tokens que gastó, como los dice Claude Code; null si no alcanzó a decirlo. */
  tokens: number | null;
  /** Lo último que alcanzó a hacer (hasta 5 pasos, con las líneas iguales seguidas en una). */
  ultimos: { tipo: 'dice' | 'hace'; texto: string; veces?: number }[];
  /** Cuántos flujos de varios agentes (Workflow) y cuántos ayudantes (Agent, Task) lanzó; null si ninguno. */
  usoFlujos: { flujos: number; ayudantes: number } | null;
  /** Los permisos que se le negaron (la herramienta y lo que intentó), sin repetir. */
  negados: string[];
  /** Qué conviene hacer, en una frase. */
  sugerencia: string;
  /** Lo que el diálogo ofrece primero: pedirla igual, pedirla sin ultracode, o arreglar antes la cuenta. */
  accion: 'pedir' | 'sin_ultracode' | 'cuenta';
  /** Cuándo se renueva el límite de uso, si fue eso (ISO). */
  renueva?: string;
  /** El registro, desde la carpeta del Studio. */
  registro?: string;
  cuando: string;
}

/**
 * Un paso que alguien no entendió («No lo entiendo, explícamelo mejor»): una ida y vuelta corta. El Studio lanza al
 * director solo para ese paso (`lanzada`), sin esperar ni procesar el resto de lo pendiente; al cerrar con
 * `bandeja.ts --aclarar --listo` queda `hecha`. Si no se pudo, `error` dice por qué y la nota espera la revisión.
 */
export interface AclaracionPedida {
  proyecto: string;
  mision: string;
  /** El número del paso, desde 0. */
  paso: number;
  /** La nota del Buzón que la pide. */
  nota: string;
  quien: string;
  pedida: string;
  lanzada?: string;
  hecha?: string;
  error?: string;
  /** Si no se pudo: el reporte de qué pasó, como el de una revisión (pr_retoma_automatica, punto 5). */
  falla?: FallaRevision;
  /** Pedida otra vez con «Retomarla» después de una que no se cerró: cuándo se lanzó esa y su registro. */
  reintento?: RetomaAparte;
  /**
   * No es para aclararlo sino para comprobarlo (propuesta aceptada pr_verificar_paso): la persona hizo el paso fuera del
   * Studio y oprimió «Ya lo hice: compruébalo tú». Va por el mismo camino, corto y aparte, con su encargo
   * (`bandeja.ts --comprobar`): el director busca la evidencia y responde si se cumplió, qué encontró y qué hacer si no.
   */
  comprobar?: boolean;
}

/** De dónde retoma una aclaración o una urgencia pedida otra vez con «Retomarla» (pr_retoma_automatica, punto 5). */
export interface RetomaAparte {
  lanzada: string;
  registro?: string;
}

/**
 * Una o varias notas urgentes: el Studio lanza al director solo para ellas (`lanzada`), al instante, y lo demás del Buzón
 * espera la revisión completa. Al cerrar con `bandeja.ts --urgente --listo` queda `hecha`; el resultado llega como
 * reporte en «Dónde quedamos». Las urgentes que llegan mientras el director atiende otras esperan en `luego` y se lanzan
 * al terminar. Si no se pudo, `error` dice por qué y las notas esperan la revisión, que se pide.
 */
export interface UrgenciaPedida {
  proyecto: string;
  /** Las notas urgentes del Buzón que se atienden en este lanzamiento. */
  notas: string[];
  /** Las que llegaron mientras tanto: van en el lanzamiento siguiente. */
  luego?: string[];
  quien: string;
  pedida: string;
  lanzada?: string;
  hecha?: string;
  error?: string;
  falla?: FallaRevision;
  reintento?: RetomaAparte;
}

const vacio = (): Local => ({ activo: null, repositorios: {} });
/** Los permisos tal cual, sin un autorizado mal formado. Sin nada, undefined. */
const permisosNormales = (p: any): Local['permisos'] => {
  const autorizados: PermisoAutorizado[] = (Array.isArray(p?.autorizados) ? p.autorizados : [])
    .filter((a: any) => a && typeof a.regla === 'string' && a.regla && typeof a.cuando === 'string' && typeof a.quien === 'string' && (a.alcance === 'todos' || (a.alcance === 'proyecto' && typeof a.proyecto === 'string')))
    .map((a: any) => ({ regla: a.regla, alcance: a.alcance, ...(a.alcance === 'proyecto' ? { proyecto: a.proyecto } : {}), cuando: a.cuando, quien: a.quien, ...(a.origen === 'claude' ? { origen: 'claude' as const } : {}), ...(typeof a.revision === 'string' && a.revision ? { revision: a.revision } : {}) }));
  // Las skills autorizadas también se leen (nmwmgm8g6tit): sin esto, leerLocal las perdía, el panel decía «Guardado» con la
  // casilla vacía y el director lanzado seguía apagándolas en skillOverrides
  const texto = (v: unknown): v is string => typeof v === 'string' && !!v;
  const skills: SkillAutorizada[] = (Array.isArray(p?.skills) ? p.skills : [])
    .filter((s: any) => s && texto(s.proyecto) && texto(s.nombre) && texto(s.ruta) && texto(s.huella) && texto(s.cuando) && typeof s.quien === 'string')
    .map((s: any) => ({ proyecto: s.proyecto, nombre: s.nombre, ruta: s.ruta, huella: s.huella, cuando: s.cuando, quien: s.quien }));
  const r = { ...(p?.ultracode === true ? { ultracode: true as const } : {}), ...(autorizados.length ? { autorizados } : {}), ...(skills.length ? { skills } : {}) };
  return Object.keys(r).length ? r : undefined;
};
/** La revisión tal cual, salvo un `reintento` mal formado, que sale. */
const revisionNormal = (r: any): RevisionPedida => {
  const { reintento, ...resto } = r;
  const bien = reintento && typeof reintento.lanzada === 'string' && typeof reintento.que === 'string';
  return { ...resto, ...(bien ? { reintento: { lanzada: reintento.lanzada, que: reintento.que, ...(typeof reintento.registro === 'string' ? { registro: reintento.registro } : {}) } } : {}) };
};
const esRevision = (r: any): boolean => !!r && typeof r.proyecto === 'string' && typeof r.pedida === 'string';
/**
 * Las revisiones de cada proyecto, ya normales. La vieja `revision` (una sola para todo el Studio) entra en su proyecto si
 * ese no tiene una propia en `revisiones`: así un estudio.local.json de antes no pierde la que tenía en marcha. Pura.
 */
export function revisionesNormales(x: any): Record<string, RevisionPedida> {
  const r: Record<string, RevisionPedida> = {};
  for (const [id, v] of Object.entries(x?.revisiones && typeof x.revisiones === 'object' ? x.revisiones : {})) if (esRevision(v) && (v as any).proyecto === id) r[id] = revisionNormal(v);
  if (esRevision(x?.revision) && !r[x.revision.proyecto]) r[x.revision.proyecto] = revisionNormal(x.revision);
  return r;
}
/** La revisión pedida de un proyecto, o undefined. Pura. */
export const revisionDe = (l: Pick<Local, 'revisiones'>, proyecto: string | null | undefined): RevisionPedida | undefined => (proyecto ? l.revisiones?.[proyecto] : undefined);
/** Lo de este computador con la revisión de ese proyecto cambiada (undefined: sin revisión). Pura. */
function conRevision(l: Local, proyecto: string, r: RevisionPedida | undefined): Local {
  const { [proyecto]: _fuera, ...otras } = l.revisiones ?? {};
  const revisiones = r ? { ...otras, [proyecto]: r } : otras;
  const { revisiones: _r, ...resto } = l;
  return { ...resto, ...(Object.keys(revisiones).length ? { revisiones } : {}) };
}
/** Una revisión que el director ya tomó o que el Studio lanzó, sin cerrar ni fallar. Pura. */
export const revisionCorriendo = (r: RevisionPedida | undefined): boolean => !!r && !r.hecha && !r.error && !!(r.enCurso || r.lanzada);
/** Una revisión pedida, sin cerrar ni fallar (aún sin lanzar, o ya en marcha). Pura. */
export const revisionAbierta = (r: RevisionPedida | undefined): boolean => !!r && !r.hecha && !r.error;
/** Los proyectos con una revisión en marcha en este computador, en orden de cuando se pidió. Pura. */
export const proyectosRevisando = (l: Pick<Local, 'revisiones'>): string[] =>
  Object.values(l.revisiones ?? {}).filter(revisionCorriendo).sort((a, b) => a.pedida.localeCompare(b.pedida)).map((r) => r.proyecto);

/** La revisión de otro proyecto, vista desde el activo (pd_revisiones_simultaneas): pedida, en marcha o recién cerrada. */
export interface OtraRevision {
  proyecto: string;
  nombre: string;
  estado: 'pedida' | 'en_marcha' | 'hecha';
  /** Desde cuándo: lanzada o empezada si va en marcha; si no, cuando se pidió. */
  desde: string;
  hecha?: string;
}
/** Cuánto se sigue diciendo que la revisión de otro proyecto cerró: lo justo para que la página dé el aviso una vez. */
const OTRA_HECHA_MIN = 30;
/**
 * Las revisiones de los otros proyectos de este computador, para la página del activo: la línea de la cabecera, el punto
 * en la lista de proyectos y el aviso «Ir a <proyecto>» al cerrar (decisiones nmwdqp011tit, nmwdqqao4tit, nmwdqqrlitit).
 * Sin las fallidas (las dice su proyecto), ni las cerradas hace más de OTRA_HECHA_MIN minutos. Pura.
 */
export function revisionesDeOtros(l: Pick<Local, 'revisiones'>, activo: string | null, nombres: Record<string, string>, ahora = Date.now()): OtraRevision[] {
  return Object.values(l.revisiones ?? {})
    .filter((r) => r.proyecto !== activo && !r.error && (!r.hecha || ahora - Date.parse(r.hecha) < OTRA_HECHA_MIN * 60_000))
    .sort((a, b) => a.pedida.localeCompare(b.pedida))
    .map((r) => {
      const estado = r.hecha ? 'hecha' : revisionCorriendo(r) ? 'en_marcha' : 'pedida';
      const desde = estado === 'en_marcha' ? ([r.lanzada, r.enCurso].filter((x): x is string => !!x).sort()[0] ?? r.pedida) : r.pedida;
      return { proyecto: r.proyecto, nombre: nombres[r.proyecto] ?? r.proyecto, estado, desde, ...(r.hecha ? { hecha: r.hecha } : {}) };
    });
}

/**
 * Las claves que normal() entiende y valida: una de estas que no pasa su validación se quita a propósito. Cualquier otra
 * clave del archivo se guarda tal cual (claveDesconocidas): un proceso con una versión del código que todavía no conoce una
 * clave (el servidor encendido desde antes de un cambio, una herramienta vieja) ya no la borra al guardar. Así se perdió el
 * 14 de noviembre la dirección privada del respaldo de la memoria del Studio (pd_respaldo_direccion, nmwpwz8qdtit): ninguna
 * ruta la quitó (la bitácora no lo dice), y cada cambio guardaba solo las claves que conocía quien lo hacía.
 */
const CLAVES_DE_LOCAL = new Set(['activo', 'repositorios', 'revisiones', 'aclaracion', 'urgencia', 'vigilia', 'agente', 'permisos', 'esfuerzoMaximo', 'todoConElModelo', 'ayudasVistas', 'avisoVersion', 'ajustesPropios', 'ajustesConservados', 'ajustesVistos', 'modoPermisos', 'planDeClaude', 'asistente', 'idioma', 'copiaDeDesarrollo', 'cuentasGit', 'respaldoDe', 'respaldoDelStudio', 'respaldoPublico', 'huellas', 'retoma']);
/** Las que ya no se usan y se van al guardar (la nota la pone guardarLocal; `revision`, la de antes de `revisiones`). */
const CLAVES_RETIRADAS = new Set(['nota', 'revision', 'seguidas']);
/** Lo que el archivo trae y este código no conoce: se guarda igual. Pura. */
const claveDesconocidas =(x: any): Record<string, unknown> =>
  x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).filter(([k]) => !CLAVES_DE_LOCAL.has(k) && !CLAVES_RETIRADAS.has(k))) : {};

// Cada clave de Local que no pasa por aquí se valida; las que no conoce, se guardan tal cual (claveDesconocidas)
const normal = (x: any): Local => ({
  ...(claveDesconocidas(x) as Partial<Local>),
  activo: typeof x?.activo === 'string' ? x.activo : null,
  repositorios: x?.repositorios && typeof x.repositorios === 'object' ? x.repositorios : {},
  ...((r) => (Object.keys(r).length ? { revisiones: r } : {}))(revisionesNormales(x)),
  ...(x?.aclaracion && typeof x.aclaracion.proyecto === 'string' && typeof x.aclaracion.nota === 'string' && typeof x.aclaracion.paso === 'number' ? { aclaracion: x.aclaracion as AclaracionPedida } : {}),
  ...(x?.urgencia && typeof x.urgencia.proyecto === 'string' && Array.isArray(x.urgencia.notas) && typeof x.urgencia.pedida === 'string' ? { urgencia: x.urgencia as UrgenciaPedida } : {}),
  ...(typeof x?.vigilia === 'string' ? { vigilia: x.vigilia } : {}),
  ...(x?.agente === false ? { agente: false as const } : {}),
  ...((p) => (p ? { permisos: p } : {}))(permisosNormales(x?.permisos)),
  ...(x?.esfuerzoMaximo === true ? { esfuerzoMaximo: true as const } : {}),
  ...(x?.todoConElModelo === true ? { todoConElModelo: true as const } : {}),
  ...(Array.isArray(x?.ayudasVistas) ? { ayudasVistas: (x.ayudasVistas as unknown[]).filter((s): s is string => typeof s === 'string') } : {}),
  ...((a) => (a ? { avisoVersion: a } : {}))(avisoNormal(x?.avisoVersion)),
  ...(x?.ajustesPropios === false ? { ajustesPropios: false as const } : {}),
  ...(x?.ajustesPropios === false && Array.isArray(x?.ajustesConservados) ? { ajustesConservados: x.ajustesConservados.filter((c: unknown): c is string => typeof c === 'string') } : {}),
  ...(x?.ajustesPropios === false && Array.isArray(x?.ajustesVistos) ? { ajustesVistos: x.ajustesVistos.filter((c: unknown): c is string => typeof c === 'string') } : {}),
  ...(esModoPermisos(x?.modoPermisos) ? { modoPermisos: x.modoPermisos } : {}),
  ...(esPlanDeClaude(x?.planDeClaude) ? { planDeClaude: x.planDeClaude } : {}),
  ...((a) => (a ? { asistente: a } : {}))(estadoAsistenteDe(x?.asistente)),
  ...(esIdioma(x?.idioma) ? { idioma: x.idioma } : {}),
  ...(x?.copiaDeDesarrollo === true ? { copiaDeDesarrollo: true } : {}),
  ...((c) => (Object.keys(c).length ? { cuentasGit: c } : {}))(Object.fromEntries(Object.entries(x?.cuentasGit && typeof x.cuentasGit === 'object' ? x.cuentasGit : {}).filter(([, v]) => typeof v === 'string' && v)) as Record<string, string>),
  ...(typeof x?.respaldoDe === 'string' ? { respaldoDe: x.respaldoDe } : {}),
  ...(typeof x?.respaldoDelStudio === 'string' && x.respaldoDelStudio.trim() ? { respaldoDelStudio: x.respaldoDelStudio.trim() } : {}),
  ...((r) => (r.length ? { respaldoPublico: r } : {}))(Array.isArray(x?.respaldoPublico) ? [...new Set((x.respaldoPublico as unknown[]).filter((s): s is string => typeof s === 'string' && !!s))] : []),
  ...((h) => (Object.keys(h).length ? { huellas: h } : {}))(Object.fromEntries(Object.entries(x?.huellas && typeof x.huellas === 'object' ? x.huellas : {}).filter(([, v]: [string, any]) => typeof v?.sha === 'string' && typeof v?.cuando === 'string').map(([k, v]: [string, any]) => [k, { sha: v.sha, cuando: v.cuando }]))),
  ...(x?.retoma && typeof x.retoma.proyecto === 'string' && typeof x.retoma.lanzada === 'string' && typeof x.retoma.que === 'string'
    ? { retoma: { proyecto: x.retoma.proyecto, lanzada: x.retoma.lanzada, que: x.retoma.que, ...(typeof x.retoma.registro === 'string' ? { registro: x.retoma.registro } : {}) } }
    : {}),
});

/** Cada cuánto mira la sesión del director (/loop 5m /vigila), y desde cuándo se considera que nadie está mirando. */
export const VIGILIA_MIN = 5;
export const vigilando = (vigilia: string | undefined | null, ahora = Date.now()) => !!vigilia && ahora - Date.parse(vigilia) < (VIGILIA_MIN * 2 + 2) * 60_000;

/** La sesión del director acaba de mirar si había una revisión pedida. */
export async function marcarVigilia(raiz: string): Promise<void> {
  await cambiarLocal(raiz, (l) => ({ ...l, vigilia: new Date().toISOString() }));
}

/** Cuántas veces se relee estudio.local.json si no se entiende, y cuánto se espera entre una y otra (ms). */
const RELEER = 3;
const RELEER_MS = 50;
const noEsta = (e: unknown) => (e as NodeJS.ErrnoException)?.code === 'ENOENT';
const esperar = (ms: number) => new Promise((listo) => setTimeout(listo, ms));

/**
 * Lo de este computador. Lo escriben dos procesos (el servidor del Studio y la bandeja): un JSON que no se entiende
 * (con el archivo tomado un instante en Windows, o cambiado a mano) se relee unas veces antes de darlo por vacío. Para
 * mostrar basta; para cambiarlo, cambiarLocal lo lee sin darlo nunca por vacío.
 */
export async function leerLocal(raiz: string): Promise<Local> {
  return (await leerArchivoLocal(raiz)) ?? vacio();
}

/** El archivo leído, vacío si no existe, o null si existe y, releído, sigue sin entenderse. */
async function leerArchivoLocal(raiz: string): Promise<Local | null> {
  for (let intento = 1; ; intento++) {
    try {
      return normal(JSON.parse(await readFile(join(raiz, ARCHIVO_LOCAL), 'utf-8')));
    } catch (e) {
      if (noEsta(e)) return vacio();
      if (intento >= RELEER) return null;
      await esperar(RELEER_MS);
    }
  }
}

// Lo mismo, sin esperar: para resolver rutas en cualquier parte. Se relee solo si el archivo cambió. Si no se entiende,
// se relee al instante y, si sigue sin entenderse, vale lo último que se leyó bien (nunca lo vacío por un instante)
let enMemoria: { raiz: string; cuando: number; local: Local } | null = null;
export function leerLocalYa(raiz: string): Local {
  const archivo = join(raiz, ARCHIVO_LOCAL);
  for (let intento = 1; ; intento++) {
    try {
      const cuando = statSync(archivo).mtimeMs;
      if (enMemoria?.raiz === raiz && enMemoria.cuando === cuando) return enMemoria.local;
      const local = normal(JSON.parse(readFileSync(archivo, 'utf-8')));
      enMemoria = { raiz, cuando, local };
      return local;
    } catch (e) {
      if (noEsta(e)) return vacio();
      if (intento >= RELEER) return enMemoria?.raiz === raiz ? enMemoria.local : vacio();
    }
  }
}

/**
 * ¿El director está trabajando ahora en este computador? Una revisión que ya empezó (o que el Studio lanzó), o una
 * aclaración o una urgencia lanzadas, sin cerrar ni fallar. Mientras tanto, el Studio no se recarga a pedazos.
 */
export function directorTrabajando(l: Local, proyecto?: string): boolean {
  const corriendo = (x: { proyecto: string; lanzada?: string; hecha?: string; error?: string } | undefined) => !!x && (!proyecto || x.proyecto === proyecto) && !!x.lanzada && !x.hecha && !x.error;
  const revisa = proyecto ? revisionCorriendo(revisionDe(l, proyecto)) : proyectosRevisando(l).length > 0;
  return revisa || corriendo(l.aclaracion) || corriendo(l.urgencia);
}

/**
 * Desde cuándo lo que llega ya no entra en la revisión en marcha de este proyecto: cuando el Studio lanzó al director o,
 * sin lanzarlo, cuando la revisión empezó. Lo que se deja después espera la revisión siguiente. Sin revisión en marcha, null.
 */
export function corteDeRevision(l: Local, proyecto: string): string | null {
  const r = revisionDe(l, proyecto);
  if (!r || r.hecha || r.error) return null;
  const marcas = [r.lanzada, r.enCurso].filter((x): x is string => !!x).sort();
  return marcas[0] ?? null;
}

/**
 * Cuándo pidió una persona, con su botón (`origen`), la revisión en marcha de este proyecto; null sin revisión en marcha
 * o si no la pidió una persona. Con eso la bandeja sabe si se pidió antes de entregar las misiones (director.ts ›
 * revisionTemprana; regla dura nmwk2x3kftit).
 */
export function pedidaPorPersona(l: Local, proyecto: string): string | null {
  const r = revisionDe(l, proyecto);
  return r && !r.hecha && !r.error && r.origen ? r.pedida : null;
}

/** El candado de estudio.local.json: un archivo junto a él que solo un proceso a la vez puede crear. */
export const CANDADO_LOCAL = `${ARCHIVO_LOCAL}.candado`;
/**
 * Pasado este tiempo, un candado se da por abandonado (el proceso que lo tenía murió a mitad de un cambio) y se quita.
 * Un cambio dura milisegundos. Si en el doble de este tiempo no se pudo tomar (la carpeta no deja crear archivos), falla.
 */
export const CANDADO_VIEJO_MS = 10_000;
// Dentro de un mismo proceso, los cambios esperan su turno en fila, sin dar vueltas sobre el candado
const filas = new Map<string, Promise<unknown>>();

/**
 * Cambia lo de este computador sin perder lo que escribe otro (nota de voz del titular, 21 de octubre de 2026: que no
 * vuelva a pasar). Lo escriben dos procesos, el servidor del Studio y la bandeja, y cada cambio lee el archivo entero,
 * cambia una parte y lo guarda entero: si dos cambios se cruzaban, el segundo guardaba encima lo que había leído antes del
 * primero y lo borraba (así una revisión cerrada pudo perder su «hecha» y verse fallida). Por eso cada cambio toma el
 * candado, lee lo más nuevo, aplica el cambio, lo guarda y solo entonces lo suelta: de dos que se cruzan, el segundo
 * espera y parte de lo que dejó el primero. Y si el archivo existe pero no se entiende, no se guarda nada encima, porque
 * partir de vacío borraría la lista de proyectos y lo pedido. `cambio` devuelve lo nuevo, o undefined si no hay nada que
 * cambiar. Devuelve cómo quedó.
 */
async function cambiarLocal(raiz: string, cambio: (l: Local) => Local | undefined): Promise<Local> {
  const turno = (filas.get(raiz) ?? Promise.resolve()).catch(() => {}).then(() => conCandado(raiz, async () => {
    const l = await leerArchivoLocal(raiz);
    if (!l) throw new Error(`${ARCHIVO_LOCAL} no se entiende: no se guarda nada encima, para no borrar la lista de proyectos ni lo pedido. Corrige el archivo (es JSON) o bórralo y vuelve a entregar los proyectos.`);
    const nuevo = cambio(l);
    if (nuevo) await guardarLocal(raiz, nuevo);
    return nuevo ?? l;
  }));
  filas.set(raiz, turno);
  try {
    return await turno;
  } finally {
    if (filas.get(raiz) === turno) filas.delete(raiz);
  }
}

/**
 * Hace algo con el candado de estudio.local.json tomado. Se toma creando el archivo solo si no existe (de dos que lo
 * intentan a la vez, solo uno lo crea); si lo tiene otro, se espera. Uno abandonado se quita (CANDADO_VIEJO_MS). Solo lo
 * suelta quien lo tiene: su contenido es una marca de este proceso y de este cambio.
 */
async function conCandado<T>(raiz: string, hacer: () => Promise<T>): Promise<T> {
  const candado = join(raiz, CANDADO_LOCAL);
  const marca = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const limite = Date.now() + 2 * CANDADO_VIEJO_MS;
  for (;;) {
    try {
      await writeFile(candado, marca, { flag: 'wx' });
      break;
    } catch (e) {
      const codigo = String((e as NodeJS.ErrnoException)?.code);
      // En Windows, un candado recién soltado puede seguir «borrándose» un instante (EPERM, EACCES, EBUSY)
      if (!['EEXIST', 'EPERM', 'EACCES', 'EBUSY'].includes(codigo) || Date.now() > limite) throw e;
      if (codigo === 'EEXIST') {
        const otro = await readFile(candado, 'utf-8').catch(() => null);
        const viejo = await stat(candado).then((s) => Date.now() - s.mtimeMs > CANDADO_VIEJO_MS, () => false);
        // Abandonado: se quita, y solo si sigue siendo el mismo (que no sea el de otro que lo acaba de tomar)
        if (viejo && otro !== null && (await readFile(candado, 'utf-8').catch(() => null)) === otro) {
          await unlink(candado).catch(() => {});
          continue;
        }
      }
      await esperar(5 + Math.random() * 15);
    }
  }
  try {
    return await hacer();
  } finally {
    if ((await readFile(candado, 'utf-8').catch(() => null)) === marca) await unlink(candado).catch(() => {});
  }
}

/**
 * Escribe un archivo de una vez: primero a uno aparte en la misma carpeta y luego lo pone en su lugar (rename), así quien
 * lo lee desde otro proceso nunca lo encuentra a medio escribir (escribirlo encima lo vacía primero). En Windows, si el
 * archivo está tomado un instante (EPERM, EBUSY, EACCES: alguien lo está leyendo, o el antivirus), se reintenta, hasta
 * unos dos segundos. Para lo que leen dos procesos: estudio.local.json, el plan y lo de cada persona.
 */
export async function escribirDeUnaVez(archivo: string, texto: string): Promise<void> {
  const temporal = `${archivo}.${process.pid}-${Math.random().toString(36).slice(2, 8)}.tmp`;
  await writeFile(temporal, texto, 'utf-8');
  try {
    for (let intento = 1; ; intento++) {
      try {
        await rename(temporal, archivo);
        break;
      } catch (e) {
        const tomado = ['EPERM', 'EBUSY', 'EACCES'].includes(String((e as NodeJS.ErrnoException)?.code));
        if (!tomado || intento >= 8) throw e;
        await esperar(RELEER_MS * intento);
      }
    }
  } finally {
    await unlink(temporal).catch(() => {}); // ya se movió, o no se pudo: que no quede suelto
  }
}

/** Escribe lo de este computador de una vez. Solo lo llama cambiarLocal, con el candado tomado. */
async function guardarLocal(raiz: string, l: Local): Promise<void> {
  const x = { nota: 'Lo de este computador, fuera de git: el proyecto activo y la carpeta del repositorio de cada proyecto (su memoria está en <repositorio>/.stl, rama stl).', ...l };
  await escribirDeUnaVez(join(raiz, ARCHIVO_LOCAL), JSON.stringify(x, null, 2) + '\n');
  enMemoria = null;
}

/** Anota de qué cierre es la rama de respaldo que acaba de quedar (semilla.ts › tocaRespaldo). */
export async function marcarRespaldo(raiz: string, revisado: string): Promise<void> {
  await cambiarLocal(raiz, (l) => ({ ...l, respaldoDe: revisado }));
}

/** Pone o quita la marca «copia de desarrollo» de este computador (Local › copiaDeDesarrollo). La corre su dueño, a mano. */
export async function marcarCopiaDeDesarrollo(raiz: string, si: boolean): Promise<void> {
  await cambiarLocal(raiz, ({ copiaDeDesarrollo: _antes, ...l }) => (si ? { ...l, copiaDeDesarrollo: true } : l));
}

export async function guardarActivo(raiz: string, id: string): Promise<void> {
  await cambiarLocal(raiz, (l) => ({ ...l, activo: id }));
}

/** Da o quita un permiso del director lanzado (Local › permisos). Sin permisos, la clave sale del archivo. */
export async function guardarPermiso(raiz: string, permiso: 'ultracode', activo: boolean): Promise<void> {
  await cambiarLocal(raiz, ({ permisos, ...l }) => {
    const otros = { ...permisos };
    if (activo) otros[permiso] = true;
    else delete otros[permiso];
    return { ...l, ...(Object.keys(otros).length ? { permisos: otros } : {}) };
  });
}

/**
 * Cambia los permisos que el titular le dio al director desde lo que se le negó (Local › permisos.autorizados), con el
 * candado de estudio.local.json. Sin ninguno, la clave sale.
 */
/** Suma una marca de «ábrela en una terminal» (una sola por proyecto y tipo de orden). */
export async function marcarEnVentana(raiz: string, marca: { proyecto: string; regla: string; cuando: string }): Promise<void> {
  await cambiarLocal(raiz, (l) => {
    const antes = Array.isArray(l.enVentana) ? l.enVentana : [];
    return antes.some((m) => m.proyecto === marca.proyecto && m.regla === marca.regla) ? undefined : { ...l, enVentana: [...antes, marca] };
  });
}

export async function cambiarAutorizados(raiz: string, cambiar: (antes: PermisoAutorizado[]) => PermisoAutorizado[]): Promise<PermisoAutorizado[]> {
  let quedan: PermisoAutorizado[] = [];
  await cambiarLocal(raiz, ({ permisos, ...l }) => {
    const { autorizados, ...otros } = permisos ?? {};
    quedan = cambiar(autorizados ?? []);
    const nuevos = { ...otros, ...(quedan.length ? { autorizados: quedan } : {}) };
    return { ...l, ...(Object.keys(nuevos).length ? { permisos: nuevos } : {}) };
  });
  return quedan;
}

/**
 * Las skills de un proyecto que se autorizaron desde la última revisión y que el mensaje del director aún no nombra
 * (pr_skills_cierre, punto 3): antes de usarla, el director lee cada una entera, en busca de órdenes escondidas, hooks o
 * herramientas de más, y dice en su mensaje qué encontró. `bandeja.ts --listo` no cierra sin eso. Pura.
 */
export function skillsPorLeer(autorizadas: readonly SkillAutorizada[] | undefined, proyecto: string, desde: string, mensaje: string | undefined): SkillAutorizada[] {
  return (autorizadas ?? []).filter((s) => s.proyecto === proyecto && s.cuando >= desde && !(mensaje ?? '').includes(s.nombre));
}

/** Cambia las skills de los proyectos que el director carga (Local › permisos.skills), con el candado; devuelve cómo quedan. */
export async function cambiarSkillsAutorizadas(raiz: string, cambiar: (antes: SkillAutorizada[]) => SkillAutorizada[]): Promise<SkillAutorizada[]> {
  let quedan: SkillAutorizada[] = [];
  await cambiarLocal(raiz, ({ permisos, ...l }) => {
    const { skills, ...otros } = permisos ?? {};
    quedan = cambiar(skills ?? []);
    const nuevos = { ...otros, ...(quedan.length ? { skills: quedan } : {}) };
    return { ...l, ...(Object.keys(nuevos).length ? { permisos: nuevos } : {}) };
  });
  return quedan;
}

/** «Máximo» para el director y la terminal que abre el Studio (Local › esfuerzoMaximo); sin él, la clave sale del archivo. */
export async function guardarEsfuerzoMaximo(raiz: string, activo: boolean): Promise<void> {
  await cambiarLocal(raiz, ({ esfuerzoMaximo, ...l }) => ({ ...l, ...(activo ? { esfuerzoMaximo: true as const } : {}) }));
}

/**
 * Cómo pide permisos el director lanzado (Local › modoPermisos), desde la próxima vez que se lanza. `autorizado` es el de
 * siempre: sin la clave, el archivo queda como estaba. Con el candado de cambiarLocal, como lo demás de este archivo.
 */
export async function guardarModoPermisos(raiz: string, modo: ModoPermisos): Promise<void> {
  await cambiarLocal(raiz, ({ modoPermisos, ...l }) => ({ ...l, ...(modo !== 'autorizado' ? { modoPermisos: modo } : {}) }));
}

/**
 * «Todo con el modelo que elegí» (propuesta aceptada «Cada modelo para lo suyo», pr_modelos_por_tarea, punto 4; tu
 * elección del 26 de octubre de 2026): los ayudantes y los agentes de los flujos del director trabajan con su mismo modelo,
 * en vez del más barato, para quien prefiera no delegar aunque gaste más. Apagada de entrada; con false, sale.
 */
export async function guardarTodoConElModelo(raiz: string, si: boolean): Promise<void> {
  await cambiarLocal(raiz, ({ todoConElModelo, ...l }) => ({ ...l, ...(si ? { todoConElModelo: true as const } : {}) }));
}

/** Las secciones de la ayuda guiada (ayudaGuiada.ts): «Hoy», el Buzón y los documentos, en el orden elegido (nmw5mk3vdtit). */
export const SECCIONES_DE_AYUDA = ['hoy', 'buzon', 'documentos', 'ruta', 'modelo'] as const;
/**
 * Recuerda que la ayuda guiada de una sección ya se vio (o se saltó): la recuerda el Studio, no el navegador, una vez para
 * todos los proyectos de este computador (nmw2nm62vtit, nmw2p7ouktit). Devuelve las vistas.
 */
export async function guardarAyudaVista(raiz: string, seccion: string): Promise<string[]> {
  if (!(SECCIONES_DE_AYUDA as readonly string[]).includes(seccion)) throw new Error(`No hay ayuda guiada para «${seccion}».`);
  let vistas: string[] = [];
  await cambiarLocal(raiz, (l) => {
    vistas = [...new Set([...(l.ayudasVistas ?? []), seccion])];
    return { ...l, ayudasVistas: vistas };
  });
  return vistas;
}

/** Cambia lo que se recuerda de la línea de versión nueva; lo vacío sale del archivo. */
export async function cambiarAvisoVersion(raiz: string, cambio: (a: AvisoGuardado | undefined) => AvisoGuardado | undefined): Promise<void> {
  await cambiarLocal(raiz, ({ avisoVersion, ...l }) => {
    const a = avisoNormal(cambio(avisoVersion));
    return { ...l, ...(a ? { avisoVersion: a } : {}) };
  });
}

/** La versión de este Studio, la de su package.json; sin él, la más baja: entonces cualquiera es más nueva. */
export function versionInstalada(raiz: string): string {
  try {
    const v = JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8')).version;
    return typeof v === 'string' ? v : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

let sinRedHasta = 0;

/**
 * Le pregunta a GitHub si toca, una vez al día (avisoVersion.ts). Sin respuesta, no se guarda nada y se intenta en una hora, para
 * no preguntar en cada vuelta; sin internet, nadie se entera.
 */
export async function refrescarAvisoVersion(raiz: string, pedir?: typeof fetch): Promise<void> {
  const ahora = Date.now();
  if (ahora < sinRedHasta || !tocaConsultar((await leerLocal(raiz)).avisoVersion, ahora)) return;
  const r = await consultarVersion(pedir);
  if (r === 'sin_red') {
    sinRedHasta = ahora + 3_600_000;
    return;
  }
  await cambiarAvisoVersion(raiz, (a) => conConsulta(a, r, new Date().toISOString()));
}

/** Tu plan de Claude en este computador (Local › planDeClaude); con null, sale. */
export async function guardarPlanDeClaude(raiz: string, plan: PlanDeClaude | null): Promise<void> {
  await cambiarLocal(raiz, ({ planDeClaude, ...l }) => ({ ...l, ...(plan ? { planDeClaude: plan } : {}) }));
}

/** Dónde va el asistente de instalación en este computador y lo que ya se eligió (Local › asistente; asistente.ts). */
export async function guardarAsistente(raiz: string, estado: EstadoAsistente): Promise<void> {
  await cambiarLocal(raiz, (l) => ({ ...l, asistente: estado }));
}

/** El idioma de la interfaz en este computador (Local › idioma). */
export async function guardarIdioma(raiz: string, idioma: Idioma): Promise<void> {
  await cambiarLocal(raiz, (l) => ({ ...l, idioma }));
}

/**
 * Si el director lanzado carga tus ajustes de usuario de Claude Code (Local › ajustesPropios) y, sin ellos, qué claves
 * conserva (Local › ajustesConservados) y cuáles había al elegir (Local › ajustesVistos, si se saben); cargarlos todos
 * quita las tres.
 */
export async function guardarAjustesPropios(raiz: string, cargar: boolean, conservar: readonly string[] = [], vistas?: readonly string[]): Promise<void> {
  const elegidas = [...new Set(conservar.filter((c) => typeof c === 'string' && c))];
  const todas = vistas ? [...new Set(vistas.filter((c) => typeof c === 'string' && c))] : null;
  await cambiarLocal(raiz, ({ ajustesPropios, ajustesConservados, ajustesVistos, ...l }) => ({ ...l, ...(cargar ? {} : { ajustesPropios: false as const, ...(elegidas.length ? { ajustesConservados: elegidas } : {}), ...(todas ? { ajustesVistos: todas } : {}) }) }));
}

/**
 * Anota las claves que hay ahora como ya vistas, sin cambiar la selección: para una guardada antes de que el Studio las
 * anotara (desde ahí, una clave que aparezca es nueva). Solo si el director no carga tus ajustes y aún no hay ninguna.
 */
export async function anotarAjustesVistos(raiz: string, vistas: readonly string[]): Promise<void> {
  await cambiarLocal(raiz, (l) => (l.ajustesPropios === false && !l.ajustesVistos ? { ...l, ajustesVistos: [...new Set(vistas)] } : l));
}

export async function guardarRutaRepositorio(raiz: string, id: string, ruta: string): Promise<void> {
  await cambiarLocal(raiz, (l) => ({ ...l, repositorios: { ...l.repositorios, [id]: ruta } }));
}

/** Pone o, vacía, quita la cuenta de GitHub aprobada de un proyecto en este computador (cuentaGit.ts). */
export async function guardarCuentaGit(raiz: string, id: string, cuenta: string): Promise<void> {
  await cambiarLocal(raiz, ({ cuentasGit, ...l }) => {
    const { [id]: _antes, ...otras } = cuentasGit ?? {};
    const nuevas = cuenta ? { ...otras, [id]: cuenta } : otras;
    return Object.keys(nuevas).length ? { ...l, cuentasGit: nuevas } : l;
  });
}

/** Pone o, vacía, quita la segunda dirección del respaldo de la memoria de STL Studio (respaldo.ts). */
export async function guardarRespaldoDelStudio(raiz: string, url: string): Promise<void> {
  await cambiarLocal(raiz, ({ respaldoDelStudio: _antes, ...l }) => (url.trim() ? { ...l, respaldoDelStudio: url.trim() } : l));
}

/** Enciende o apaga el respaldo de un proyecto en un repositorio público (respaldo.ts; nmwf5lg39tit). */
export async function ponerRespaldoPublico(raiz: string, id: string, si: boolean): Promise<void> {
  await cambiarLocal(raiz, ({ respaldoPublico, ...l }) => {
    const nuevos = [...new Set([...(respaldoPublico ?? []).filter((x) => x !== id), ...(si ? [id] : [])])];
    return nuevos.length ? { ...l, respaldoPublico: nuevos } : l;
  });
}

/** La cuenta aprobada del proyecto cuyo repositorio es esta carpeta: lo que usan las herramientas que suben. Pura. */
export function cuentaGitDeCarpeta(l: Local, carpeta: string): string | null {
  const clave = (r: string) => r.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  const id = Object.entries(l.repositorios).find(([, r]) => clave(r) === clave(carpeta))?.[0];
  return id ? (l.cuentasGit?.[id] ?? null) : null;
}

// ───────────────────────────────────────────── sacar un proyecto de este Studio
// «Quitarlo de este Studio», en pantalla (pedido pd_quitar_en_pantalla; notas del titular nmwb0tjt6tit, nmwb0rklhtit,
// nmwb49akhtit y nmwb49ys0tit, 10 de noviembre de 2026): se borra toda su memoria, sin archivo, como si nunca hubiera
// estado; dentro del proyecto, todo lo de STL (su carpeta .stl, su rama stl, la línea que la excluye de git, las líneas
// de STL en su CLAUDE.md o AGENTS.md, en un commit local, y la copia de su memoria en GitHub, solo con el permiso de
// subir y la cuenta aprobada), y dentro de este Studio, todo lo del proyecto. Lo que se borra lo encuentra el código, sin el
// modelo, y la persona lo ve entero antes de confirmar. STL Studio mismo no sale.

/** Lo que este Studio guarda de un proyecto en estudio.local.json, por su nombre (cada uno, su texto en la pantalla). */
type LoLocalDeUnProyecto = 'repositorio' | 'cuentaGit' | 'huella' | 'revision' | 'retoma' | 'aclaracion' | 'urgencia' | 'permisos' | 'skills';

/** Lo que se borra al sacar un proyecto de este Studio: todo lo encuentra el código, y la persona lo ve antes de confirmar. */
export interface LoQueSeBorra {
  id: string;
  /** La carpeta de su repositorio, si sigue en este computador: sin ella, solo se borra lo de este Studio. */
  repo: string | null;
  /** Dentro del proyecto: la carpeta de la memoria, su rama local y la línea que la excluye de git en este computador. */
  memoria: boolean;
  rama: boolean;
  exclusion: boolean;
  /** Las líneas de STL en los archivos del proyecto (su CLAUDE.md o AGENTS.md), que salen en un commit local. */
  lineas: { archivo: string; lineas: string[] }[];
  /**
   * La copia de la memoria en GitHub (la rama stl de su remoto), si la hay. Se borra solo con el permiso de subir de ese
   * proyecto y si es de GitHub (`seBorra`), y antes de borrarla se comprueba su cuenta aprobada (cuentaGit.ts); si no, queda,
   * y se dice con la orden para quitarla.
   */
  remota: { remoto: string; seBorra: boolean; orden: string } | null;
  /** Dentro de este Studio: lo que cuelga del proyecto en estudio.local.json. */
  local: LoLocalDeUnProyecto[];
  /** Sus registros de revisión, con sus conversaciones (.revisiones), y lo que recorrió con la niebla (.estudio/lectura). */
  registros: string[];
  /** Cuántas líneas suyas hay en la historia de revisiones, sus resúmenes y la bitácora de este computador. */
  lineasDelStudio: number;
}

/** Lo que pasó al sacarlo: lo que no se pudo borrar (con su porqué) y adónde va la pantalla. */
interface ResultadoQuitar {
  borrado: LoQueSeBorra;
  /** Lo que quedó, dicho para la persona: vacío si se borró todo. */
  quedo: string[];
  /** El commit local que quitó las líneas de STL de sus archivos, si hubo. */
  commit: string | null;
  /** Si la copia de GitHub se borró. */
  remotaBorrada: boolean;
  /** Adónde va la pantalla: a la lista de proyectos, para elegir uno, o a STL Studio si no queda otro (nmwb0xsxmtit). */
  despues: 'lista' | 'studio';
}

/**
 * Las líneas de STL en un archivo del proyecto: las que señalan su memoria (`.stl/`) o la herramienta del director
 * (`tools/director/estado.ts`), que es lo que el Studio le agrega cuando el titular lo aprueba. Pura.
 */
export function lineasDeSTL(texto: string): string[] {
  return texto.split(/\r?\n/).filter((l) => /tools\/director\/estado\.ts/.test(l) || /(^|[\s`'"(<[])\.stl\//.test(l));
}

/** El mismo texto sin esas líneas, con sus saltos de línea como estaban. Pura. */
export function sinLineasDeSTL(texto: string): string {
  const fuera = new Set(lineasDeSTL(texto));
  return texto.split(/(?<=\n)/).filter((l) => !fuera.has(l.replace(/\r?\n$/, ''))).join('');
}

/** El archivo de exclusiones de git sin la memoria de STL (su línea y el comentario que la explica). Pura. */
export function sinExclusionDeSTL(texto: string): string {
  return texto.split(/(?<=\n)/).filter((l) => {
    const x = l.trim();
    return x !== `/${MEMORIA}/` && !x.startsWith('# La memoria de STL Studio');
  }).join('');
}

/** Si el proyecto tiene el permiso de subir del director (git push), para él o para todos los de este computador. Pura. */
export const puedeSubir = (l: Local, id: string): boolean =>
  (l.permisos?.autorizados ?? []).some((a) => /^Bash\(git push(:\*)?\)$/.test(a.regla) && (a.alcance === 'todos' || a.proyecto === id));

/** Lo que cuelga de un proyecto en estudio.local.json. Pura. */
function loLocalDe(l: Local, id: string): LoLocalDeUnProyecto[] {
  const hay: [LoLocalDeUnProyecto, boolean][] = [
    ['repositorio', id in l.repositorios],
    ['cuentaGit', !!l.cuentasGit?.[id]],
    ['huella', !!l.huellas?.[id]],
    ['revision', !!revisionDe(l, id)],
    ['retoma', l.retoma?.proyecto === id],
    ['aclaracion', l.aclaracion?.proyecto === id],
    ['urgencia', l.urgencia?.proyecto === id],
    ['permisos', (l.permisos?.autorizados ?? []).some((a) => a.alcance === 'proyecto' && a.proyecto === id)],
    ['skills', (l.permisos?.skills ?? []).some((s) => s.proyecto === id)],
  ];
  return hay.filter(([, si]) => si).map(([k]) => k);
}

/**
 * estudio.local.json sin el proyecto: su carpeta, su cuenta, su huella, lo pedido para él, sus permisos y sus skills. Si
 * era el activo, el siguiente lo elige la lista (null) o, sin otro, es `studio`. Pura.
 */
export function localSinElProyecto(l: Local, id: string, studio: string | null): Local {
  const { [id]: _r, ...repositorios } = l.repositorios;
  const { [id]: _c, ...cuentas } = l.cuentasGit ?? {};
  const { [id]: _h, ...huellas } = l.huellas ?? {};
  const { [id]: _rv, ...revisiones } = l.revisiones ?? {};
  const { cuentasGit: _cs, huellas: _hs, revisiones: _rvs, retoma, aclaracion, urgencia, permisos, respaldoPublico, ...resto } = l;
  const publicos = (respaldoPublico ?? []).filter((x) => x !== id);
  const autorizados = (permisos?.autorizados ?? []).filter((a) => !(a.alcance === 'proyecto' && a.proyecto === id));
  const skills = (permisos?.skills ?? []).filter((s) => s.proyecto !== id);
  const { autorizados: _a, skills: _s, ...otrosPermisos } = permisos ?? {};
  const nuevosPermisos = { ...otrosPermisos, ...(autorizados.length ? { autorizados } : {}), ...(skills.length ? { skills } : {}) };
  const otros = Object.keys(repositorios).filter((x) => x !== studio);
  return {
    ...resto,
    activo: l.activo === id ? (otros.length ? null : studio) : l.activo,
    repositorios,
    ...(Object.keys(cuentas).length ? { cuentasGit: cuentas } : {}),
    ...(Object.keys(huellas).length ? { huellas } : {}),
    ...(Object.keys(revisiones).length ? { revisiones } : {}),
    ...(retoma && retoma.proyecto !== id ? { retoma } : {}),
    ...(aclaracion && aclaracion.proyecto !== id ? { aclaracion } : {}),
    ...(urgencia && urgencia.proyecto !== id ? { urgencia } : {}),
    ...(Object.keys(nuevosPermisos).length ? { permisos: nuevosPermisos } : {}),
    ...(publicos.length ? { respaldoPublico: publicos } : {}),
  };
}

/** Si un archivo de .revisiones es de ese proyecto: «<id>-<fecha>…», «<id>-urgencia-…» o «<id>-aclaracion-…», nunca «<id>-otro-…». Pura. */
export const esRegistroDe = (nombre: string, id: string): boolean =>
  nombre.startsWith(`${id}-`) && /^(?:(?:urgencia|aclaracion)-)?\d{4}-\d{2}-\d{2}T/.test(nombre.slice(id.length + 1));

/** Las líneas de historia de este computador que son de cada proyecto (sus revisiones, sus resúmenes y su bitácora). */
const HISTORIAS = [join('.estudio', 'revisiones.jsonl'), join('.estudio', 'revisiones-resumen.jsonl'), join('.estudio', 'bitacora.jsonl')];
const esLineaDe = (linea: string, id: string) => {
  try {
    return JSON.parse(linea)?.proyecto === id;
  } catch {
    return false;
  }
};

/** El id del proyecto que es este mismo Studio, si está en la lista. */
const idDelStudio = (raiz: string, l: Local) => Object.entries(l.repositorios).find(([, r]) => r && esElStudio(raiz, r))?.[0] ?? null;

/**
 * Todo lo que se borra al sacar un proyecto: lo busca el código, en su repositorio y en este Studio, sin tocar nada. STL
 * Studio mismo no se puede sacar, y un proyecto que no está en este Studio tampoco.
 */
export async function queSeBorra(raiz: string, id: string): Promise<LoQueSeBorra> {
  const l = await leerLocal(raiz);
  const ruta = l.repositorios[id];
  if (ruta && esElStudio(raiz, ruta)) throw new Error('STL Studio es tu Studio: viene fijo en la lista y no se puede quitar.');
  const local = loLocalDe(l, id);
  if (!ruta && !local.length) throw new Error(`El proyecto «${id}» no está en este Studio.`);
  const repo = ruta && existsSync(ruta) ? ruta : null;
  let memoria = false, rama = false, exclusion = false;
  const lineas: LoQueSeBorra['lineas'] = [];
  let remota: LoQueSeBorra['remota'] = null;
  if (repo) {
    const dir = join(repo, MEMORIA);
    memoria = existsSync(join(dir, '.git')) || existsSync(join(dir, 'proyecto.json'));
    rama = (await git(repo, ['rev-parse', '--verify', '--quiet', `refs/heads/${RAMA}`])).ok;
    const comun = (await git(repo, ['rev-parse', '--path-format=absolute', '--git-common-dir'])).out.trim();
    const excluir = comun ? join(comun, 'info', 'exclude') : '';
    exclusion = !!excluir && existsSync(excluir) && (await readFile(excluir, 'utf-8')).split(/\r?\n/).some((x) => x.trim() === `/${MEMORIA}/`);
    // Solo sus archivos de instrucciones guardados en git: los que el Studio le pudo agregar una línea
    for (const archivo of ['CLAUDE.md', 'AGENTS.md']) {
      if (!existsSync(join(repo, archivo)) || !(await git(repo, ['ls-files', '--error-unmatch', '--', archivo])).ok) continue;
      const suyas = lineasDeSTL(await readFile(join(repo, archivo), 'utf-8'));
      if (suyas.length) lineas.push({ archivo, lineas: suyas });
    }
    // La copia en el remoto: la que este repositorio sabe que existe (refs/remotes/origin/stl), sin ir a la red
    if ((await git(repo, ['rev-parse', '--verify', '--quiet', `refs/remotes/origin/${RAMA}`])).ok) {
      const remoto = (await git(repo, ['config', '--get', 'remote.origin.url'])).out.trim();
      remota = { remoto, seBorra: /github\.com/i.test(remoto) && puedeSubir(l, id), orden: `git push origin --delete ${RAMA}` };
    }
  }
  const carpeta = join(raiz, '.revisiones');
  const registros = existsSync(carpeta) ? (await readdir(carpeta)).filter((n) => esRegistroDe(n, id)).map((n) => `.revisiones/${n}`) : [];
  const lectura = join(raiz, '.estudio', 'lectura', id);
  if (existsSync(lectura)) registros.push(`.estudio/lectura/${id}/`);
  let lineasDelStudio = 0;
  for (const h of HISTORIAS) {
    const texto = await readFile(join(raiz, h), 'utf-8').catch(() => '');
    lineasDelStudio += texto.split('\n').filter((x) => x.trim() && esLineaDe(x, id)).length;
  }
  return { id, repo, memoria, rama, exclusion, lineas, remota, local, registros, lineasDelStudio };
}

/** Cómo se comprueba la cuenta aprobada antes de borrar en GitHub (las pruebas pasan la suya). */
type ComprobarCuenta = (aprobada: string | null | undefined) => SesionAprobada;

/**
 * Saca un proyecto de este Studio: borra lo que dice `queSeBorra` (que la persona vio y confirmó), sin archivo. Lo de
 * dentro del proyecto primero y luego lo de este Studio; lo que falla no detiene lo demás, y queda dicho en `quedo`.
 * `idioma`: el del mensaje del commit local que quita las líneas de STL de sus archivos.
 */
export async function quitarProyecto(raiz: string, id: string, opciones: { idioma?: Idioma; comprobarCuenta?: ComprobarCuenta } = {}): Promise<ResultadoQuitar> {
  const borrado = await queSeBorra(raiz, id);
  const l = await leerLocal(raiz);
  const en = opciones.idioma === 'en';
  const quedo: string[] = [];
  const fallo = (r: { err: string }) => r.err.trim().split('\n').pop() || 'git';
  let commit: string | null = null;
  let remotaBorrada = false;
  const repo = borrado.repo;
  if (repo) {
    const dir = join(repo, MEMORIA);
    // La memoria: su carpeta (con lo que tenga sin guardar: se borra entera) y su rama
    if (borrado.memoria) {
      const r = existsSync(join(dir, '.git')) ? await git(repo, ['worktree', 'remove', '--force', '--force', MEMORIA]) : { ok: false, err: '' };
      if (!r.ok) await rm(dir, { recursive: true, force: true }).catch(() => {});
      await git(repo, ['worktree', 'prune']);
      if (existsSync(dir)) quedo.push(en ? `The folder ${dir} could not be deleted.` : `No se pudo borrar la carpeta ${dir}.`);
    }
    if (borrado.rama) {
      const r = await git(repo, ['branch', '-D', RAMA]);
      if (!r.ok) quedo.push(en ? `The ${RAMA} branch stayed (${fallo(r)}).` : `La rama ${RAMA} quedó (${fallo(r)}).`);
    }
    // La copia en GitHub: con su permiso de subir y, antes, la cuenta aprobada (cuentaGit.ts); nunca forzada
    if (borrado.remota) {
      const { orden } = borrado.remota;
      if (!borrado.remota.seBorra) quedo.push(en ? `The copy of its memory on its remote (${borrado.remota.remoto}) stays: this project has no permission to push. To delete it, run in its folder: ${orden}` : `La copia de su memoria en su remoto (${borrado.remota.remoto}) queda: este proyecto no tiene el permiso de subir. Para borrarla, corre en su carpeta: ${orden}`);
      else {
        const sesion = (opciones.comprobarCuenta ?? sesionAprobada)(l.cuentasGit?.[id]);
        if (!sesion.ok) quedo.push(en ? `The copy of its memory on GitHub stays: ${mensajeDeCuenta(sesion.resultado)} To delete it, run in its folder: ${orden}` : `La copia de su memoria en GitHub queda: ${mensajeDeCuenta(sesion.resultado)} Para borrarla, corre en su carpeta: ${orden}`);
        else {
          const conToken = ['-c', 'credential.helper=', '-c', 'credential.helper=!f() { echo username=x-access-token; echo "password=$GH_TOKEN"; }; f'];
          const r = await git(repo, [...conToken, 'push', 'origin', '--delete', RAMA], { GH_TOKEN: sesion.token });
          remotaBorrada = r.ok || /remote ref does not exist/i.test(r.err);
          if (remotaBorrada) await git(repo, ['branch', '-D', '-r', `origin/${RAMA}`]);
          else quedo.push(en ? `The copy of its memory on GitHub could not be deleted (${fallo(r)}). To delete it, run in its folder: ${orden}` : `No se pudo borrar la copia de su memoria en GitHub (${fallo(r)}). Para borrarla, corre en su carpeta: ${orden}`);
        }
      }
    }
    if (borrado.exclusion) {
      const comun = (await git(repo, ['rev-parse', '--path-format=absolute', '--git-common-dir'])).out.trim();
      const excluir = join(comun, 'info', 'exclude');
      await writeFile(excluir, sinExclusionDeSTL(await readFile(excluir, 'utf-8')), 'utf-8');
    }
    // Las líneas de STL en sus archivos: solo esas, y en un commit local de su rama actual, sin subir (nmwb49ys0tit). Un
    // archivo con otros cambios sin guardar no se toca: el commit llevaría lo que no es del Studio
    const limpios: string[] = [];
    for (const { archivo } of borrado.lineas) {
      const sinGuardar = !(await git(repo, ['diff', '--quiet', 'HEAD', '--', archivo])).ok;
      if (sinGuardar) {
        quedo.push(en ? `${archivo} has unsaved changes, so its STL lines stayed: remove them by hand.` : `${archivo} tiene cambios sin guardar, así que sus líneas de STL quedaron: quítalas a mano.`);
        continue;
      }
      await writeFile(join(repo, archivo), sinLineasDeSTL(await readFile(join(repo, archivo), 'utf-8')), 'utf-8');
      limpios.push(archivo);
    }
    if (limpios.length) {
      // Los mensajes de commit, en inglés siempre (nmwp711kitit)
      const mensaje = 'STL Studio: removes its lines, the project left the Studio';
      const r = await git(repo, ['commit', '-q', '-m', mensaje, '--', ...limpios]);
      if (r.ok) commit = (await git(repo, ['rev-parse', '--short=8', 'HEAD'])).out.trim() || null;
      else quedo.push(en ? `The change to ${limpios.join(', ')} is left uncommitted (${fallo(r)}).` : `El cambio de ${limpios.join(', ')} quedó sin commit (${fallo(r)}).`);
    }
  }
  // Dentro de este Studio: su entrada y lo que cuelga de ella, sus registros y sus líneas de historia
  await cambiarLocal(raiz, (x) => localSinElProyecto(x, id, idDelStudio(raiz, x)));
  for (const r of borrado.registros) await rm(join(raiz, ...r.split('/').filter(Boolean)), { recursive: true, force: true }).catch(() => quedo.push(r));
  for (const h of HISTORIAS) {
    const archivo = join(raiz, h);
    const texto = await readFile(archivo, 'utf-8').catch(() => null);
    if (texto === null) continue;
    const lineas = texto.split('\n');
    const quedan = lineas.filter((x) => !(x.trim() && esLineaDe(x, id)));
    if (quedan.length !== lineas.length) await writeFile(archivo, quedan.join('\n'), 'utf-8');
  }
  const tras = await leerLocal(raiz);
  const studio = idDelStudio(raiz, tras);
  const despues = Object.keys(tras.repositorios).some((x) => x !== studio) ? 'lista' : 'studio';
  return { borrado, quedo, commit, remotaBorrada, despues };
}

/**
 * Lo que retoma una revisión pedida de nuevo: si la anterior del mismo proyecto no se cerró (`error`), desde cuándo
 * trabajó esa (o la primera de una seguidilla de fallidas), qué pasó y su registro. Si no, null.
 */
export function reintentoDe(antes: RevisionPedida | undefined, proyecto: string): Reintento | null {
  if (!antes || antes.proyecto !== proyecto || !antes.error || antes.hecha) return null;
  const registro = antes.falla?.registro ?? antes.reintento?.registro;
  return {
    lanzada: antes.reintento?.lanzada ?? antes.fallida ?? antes.pedida,
    que: antes.falla?.que ?? antes.error,
    ...(registro ? { registro } : {}),
  };
}

/**
 * Pide (o cancela, con `quien` null) la revisión del director para un proyecto. Si la anterior no se cerró, la nueva
 * lleva su `reintento`: retoma lo que esa dejó, sin rehacerlo. Y la pista sobrevive a «Cancelar» (propuesta aceptada
 * pr_retoma_automatica, punto 3): cancelar una que no se cerró la guarda aparte (`retoma`), y la próxima que se pida de
 * ese proyecto la lleva igual; una revisión que cierra la borra, porque ya no hay nada que retomar.
 */
export async function pedirRevision(raiz: string, proyecto: string, quien: string | null, origen?: OrigenRevision): Promise<RevisionPedida | null> {
  // Sin el botón que la nombra, no hay revisión: cancelarla (quien null) sí se puede siempre
  if (quien && !esOrigenRevision(origen)) throw new Error('Una revisión la pide solo una persona, con un botón que dice que la pide.');
  const l = await cambiarLocal(raiz, ({ retoma, ...l }) => {
    const guardada = retoma?.proyecto === proyecto && typeof retoma.lanzada === 'string' && typeof retoma.que === 'string' ? { lanzada: retoma.lanzada, que: retoma.que, ...(typeof retoma.registro === 'string' ? { registro: retoma.registro } : {}) } : null;
    // Lo que retoma: la que no se cerró, la que se había pedido para retomarla (y se cancela antes de empezar) o la guardada
    const antes = revisionDe(l, proyecto);
    const deLaPedida = antes && !antes.hecha ? (antes.reintento ?? null) : null;
    const reintento = reintentoDe(antes, proyecto) ?? deLaPedida ?? guardada;
    if (!quien) return { ...conRevision(l, proyecto, undefined), ...(reintento ? { retoma: { proyecto, ...reintento } } : retoma && retoma.proyecto !== proyecto ? { retoma } : {}) };
    const revision: RevisionPedida = { proyecto, quien, pedida: new Date().toISOString(), ...(reintento ? { reintento } : {}), origen };
    return { ...conRevision(l, proyecto, revision), ...(retoma && retoma.proyecto !== proyecto ? { retoma } : {}) };
  });
  return revisionDe(l, proyecto) ?? null;
}

/**
 * El Studio lanzó al director para la revisión pedida, o la lanzada no terminó y `error` dice por qué: entonces vuelve a
 * quedar pedida (sin `enCurso`, para que el Studio no siga esperando), y la puede tomar la sesión del director. Con
 * `falla`, el reporte de qué pasó queda junto al error.
 */
export async function marcarLanzada(raiz: string, proyecto: string, error?: string, falla?: FallaRevision, limite?: number): Promise<void> {
  await cambiarLocal(raiz, (l) => {
    const antes = revisionDe(l, proyecto);
    const r = antes && !antes.hecha ? antes : null;
    if (!r) return undefined;
    // El reintento sigue con ella: si esta también falla, la siguiente retoma desde la primera. Sus minutos, si no son
    // los de siempre (limite), también: así quien la vigila sabe cuándo se pasó
    const minutos = limite ?? r.limite;
    const base = { proyecto: r.proyecto, quien: r.quien, pedida: r.pedida, ...(r.reintento ? { reintento: r.reintento } : {}), ...(r.origen ? { origen: r.origen } : {}), ...(minutos ? { limite: minutos } : {}) };
    const fallida = r.lanzada ?? r.fallida;
    const fallo = { ...base, error: error!, ...(falla ? { falla } : {}), ...(fallida ? { fallida } : {}) };
    return conRevision(l, proyecto, error ? fallo : { ...base, lanzada: new Date().toISOString() });
  });
}

/**
 * La revisión lanzada recibe minutos de más, una sola vez, porque llegó a su límite avanzando (propuesta aceptada «Cada
 * proceso, a la vista», pr_procesos_vista, punto 4): su límite nuevo, para la cabecera («lleva 62 min de 70») y para
 * quien la vigile sin haberla lanzado. Sin una revisión en marcha de ese proyecto, nada.
 */
export async function prorrogarRevision(raiz: string, proyecto: string, limite: number): Promise<void> {
  await cambiarLocal(raiz, (l) => {
    const r = revisionDe(l, proyecto);
    return revisionCorriendo(r) ? conRevision(l, proyecto, { ...r!, limite }) : undefined;
  });
}

/** La huella de un plan: lo primero de su sha256, sin los saltos de línea de Windows (git los puede cambiar). Pura. */
export const huellaDelPlan = (texto: string): string => createHash('sha256').update(texto.replace(/\r\n/g, '\n')).digest('hex').slice(0, 16);

/**
 * El cierre guarda la huella del plan de ese proyecto tal como quedó en el disco (pr_cierre_vigilado, punto 4): lo último
 * que lo toca es el cierre, y lo que cambie después, sin un director trabajando, el Studio lo avisa. Sin plan, nada.
 */
export async function guardarHuella(raiz: string, proyecto: string): Promise<void> {
  let texto: string;
  try {
    texto = await readFile(enDisco(raiz, rutasDe(proyecto).plan), 'utf-8');
  } catch {
    return;
  }
  const sha = huellaDelPlan(texto);
  await cambiarLocal(raiz, (l) => ({ ...l, huellas: { ...(l.huellas ?? {}), [proyecto]: { sha, cuando: new Date().toISOString() } } }));
}

/**
 * Si el plan de un proyecto cambió después de su último cierre: su huella guardada no es la del plan de ahora. `trabaja`:
 * un director trabaja en ese proyecto (entonces es suyo cambiarlo). null si no cambió o no hay huella. Pura.
 */
export function planCambiadoTrasCierre(huella: { sha: string; cuando: string } | undefined, texto: string | null, trabaja: boolean): string | null {
  if (!huella || texto === null || trabaja || huellaDelPlan(texto) === huella.sha) return null;
  const cuando = new Date(huella.cuando).toLocaleString('es', { weekday: 'long', hour: 'numeric', minute: '2-digit' });
  return `El plan cambió después del último cierre del director (el ${cuando}), sin un director trabajando: lo que ves puede no ser lo que él dejó. Si no lo cambió una revisión de otro computador, la revisión siguiente lo comprueba en la memoria y lo dice.`;
}

/** La revisión pedida empieza (`en_curso`) o termina (`hecha`). Sin una pedida, `hecha` igual deja la fecha. */
export async function marcarRevision(raiz: string, proyecto: string, paso: 'en_curso' | 'hecha'): Promise<void> {
  await cambiarLocal(raiz, ({ retoma, ...l }) => {
    const r = revisionDe(l, proyecto) ?? null;
    if (paso === 'en_curso' && (!r || r.hecha || r.enCurso)) return undefined;
    const ahora = new Date().toISOString();
    // Cerrada, no queda nada que retomar de ese proyecto (pedirRevision › retoma)
    const sigue = retoma && !(paso === 'hecha' && retoma.proyecto === proyecto) ? { retoma } : {};
    return { ...conRevision(l, proyecto, paso === 'en_curso' ? { ...r!, enCurso: ahora } : { ...(r ?? { proyecto, quien: '', pedida: ahora }), hecha: ahora }), ...sigue };
  });
}

/** Pide que el director aclare un paso, o lo compruebe, aparte de la revisión (reemplaza una anterior ya cerrada o fallida). */
export async function pedirAclaracion(raiz: string, a: Pick<AclaracionPedida, 'proyecto' | 'mision' | 'paso' | 'nota' | 'quien' | 'comprobar'>): Promise<AclaracionPedida> {
  const aclaracion: AclaracionPedida = { ...a, pedida: new Date().toISOString() };
  await cambiarLocal(raiz, (l) => ({ ...l, aclaracion }));
  return aclaracion;
}

/** La aclaración se lanzó, terminó (`hecha`) o falló (`error`): solo si es la de esa nota. */
export async function marcarAclaracion(raiz: string, nota: string, paso: 'lanzada' | 'hecha' | { error: string; falla?: FallaRevision }): Promise<void> {
  await cambiarLocal(raiz, (l) => {
    const a = l.aclaracion;
    if (!a || a.nota !== nota || a.hecha || a.error) return undefined;
    const ahora = new Date().toISOString();
    return { ...l, aclaracion: paso === 'lanzada' ? { ...a, lanzada: ahora } : paso === 'hecha' ? { ...a, hecha: ahora } : { ...a, error: paso.error, ...(paso.falla ? { falla: paso.falla } : {}) } };
  });
}

/**
 * «Retomarla» de una aclaración o una urgencia que no se cerró (pr_retoma_automatica, punto 5): la misma, pedida otra vez a
 * nombre de quien oprime el botón, con lo que esa dejó (`reintento`) para que la bandeja lo liste y no se rehaga. Una
 * urgencia lleva también las que esperaban en `luego`. Devuelve la pedida, o null si no había una fallida de ese proyecto.
 */
export async function retomarAparte(raiz: string, proyecto: string, tipo: 'aclaracion' | 'urgencia', quien: string): Promise<AclaracionPedida | UrgenciaPedida | null> {
  let nueva: AclaracionPedida | UrgenciaPedida | null = null;
  await cambiarLocal(raiz, (l) => {
    const x = tipo === 'aclaracion' ? l.aclaracion : l.urgencia;
    if (!x || x.proyecto !== proyecto || !x.error || x.hecha) return undefined;
    const reintento: RetomaAparte = x.reintento ?? { lanzada: x.lanzada ?? x.pedida, ...(x.falla?.registro ? { registro: x.falla.registro } : {}) };
    const pedida = new Date().toISOString();
    if (tipo === 'aclaracion') {
      const a = x as AclaracionPedida;
      nueva = { proyecto, mision: a.mision, paso: a.paso, nota: a.nota, quien, pedida, reintento, ...(a.comprobar ? { comprobar: true } : {}) };
      return { ...l, aclaracion: nueva };
    }
    const u = x as UrgenciaPedida;
    nueva = { proyecto, notas: [...new Set([...u.notas, ...(u.luego ?? [])])], quien, pedida, reintento };
    return { ...l, urgencia: nueva };
  });
  return nueva;
}

/** Una urgencia en curso: pedida o lanzada, sin cerrar ni fallar. */
export const urgenciaActiva = (u: UrgenciaPedida | undefined | null): u is UrgenciaPedida => !!u && !u.hecha && !u.error;

/**
 * Pide que el director atienda notas urgentes, aparte de la revisión. Si ya hay una pedida y aún no lanzada del mismo
 * proyecto, se suman a ella; si el director ya está atendiendo una, esperan en `luego` y van en el lanzamiento siguiente.
 */
export async function pedirUrgencia(raiz: string, u: { proyecto: string; notas: string[]; quien: string }): Promise<UrgenciaPedida | null> {
  const l = await cambiarLocal(raiz, (l) => {
    const a = urgenciaActiva(l.urgencia) ? l.urgencia : null;
    if (a && a.proyecto !== u.proyecto) return undefined;
    const ya = new Set([...(a?.notas ?? []), ...(a?.luego ?? [])]);
    const nuevas = u.notas.filter((n) => !ya.has(n));
    if (a && !nuevas.length) return undefined;
    const urgencia: UrgenciaPedida = !a ? { ...u, notas: nuevas, pedida: new Date().toISOString() }
      : a.lanzada ? { ...a, luego: [...(a.luego ?? []), ...nuevas] }
      : { ...a, notas: [...a.notas, ...nuevas] };
    return { ...l, urgencia };
  });
  // Si el director atiende una urgencia de otro proyecto, esta espera la revisión
  return urgenciaActiva(l.urgencia) && l.urgencia.proyecto === u.proyecto ? l.urgencia : null;
}

/**
 * La urgencia se lanzó, terminó (`hecha`) o falló (`error`). Al terminar, las que esperaban en `luego` quedan pedidas
 * para el lanzamiento siguiente.
 */
export async function marcarUrgencia(raiz: string, pedida: string, paso: 'lanzada' | 'hecha' | { error: string; falla?: FallaRevision }): Promise<void> {
  await cambiarLocal(raiz, (l) => {
    const u = l.urgencia;
    if (!u || u.pedida !== pedida || u.hecha || u.error) return undefined;
    const ahora = new Date().toISOString();
    // La siguiente se reconoce por su fecha: nunca la misma que la que termina
    const siguiente = ahora > u.pedida ? ahora : new Date(Date.parse(u.pedida) + 1).toISOString();
    const urgencia: UrgenciaPedida = paso === 'lanzada' ? { ...u, lanzada: ahora }
      : paso === 'hecha' && u.luego?.length ? { proyecto: u.proyecto, notas: u.luego, quien: u.quien, pedida: siguiente }
      : paso === 'hecha' ? { ...u, hecha: ahora }
      : { ...u, error: paso.error, ...(paso.falla ? { falla: paso.falla } : {}) };
    return { ...l, urgencia };
  });
}

export async function leerRutaRepositorio(raiz: string, id: string): Promise<string | null> {
  return (await leerLocal(raiz)).repositorios[id]?.trim() || null;
}

// ───────────────────────────────────────────── dónde está cada cosa

/** La memoria de un proyecto en este computador (<repositorio>/.stl), o null si no está en este Estudio. */
export function memoriaDe(raiz: string, id: string): string | null {
  const repo = leerLocalYa(raiz).repositorios[id]?.trim();
  return repo ? join(repo, MEMORIA) : null;
}

export interface Ubicacion {
  /** La carpeta de trabajo de git donde está: la memoria del proyecto o el Estudio. */
  cwd: string;
  /** La ruta dentro de esa carpeta (con «/»; vacía si es la carpeta misma). */
  ruta: string;
  /** Si es la memoria de un proyecto (rama `stl`) y no el Estudio (rama `main`). */
  memoria: boolean;
}

/** Dónde está de verdad una ruta del Estudio: `proyectos/<id>/…` vive en la memoria del repositorio de ese proyecto. */
export function ubicar(raiz: string, ruta: string): Ubicacion {
  const m = /^proyectos\/([a-z0-9][a-z0-9-]{0,39})(?:\/(.*))?$/.exec(ruta);
  const mem = m ? memoriaDe(raiz, m[1]) : null;
  if (m && mem) return { cwd: mem, ruta: m[2] ?? '', memoria: true };
  return { cwd: raiz, ruta, memoria: false };
}

/** La ruta en disco de una ruta del Estudio. */
export function enDisco(raiz: string, ruta: string): string {
  const u = ubicar(raiz, ruta);
  return u.ruta ? join(u.cwd, ...u.ruta.split('/')) : u.cwd;
}

// ───────────────────────────────────────────── la lista y los proyectos nuevos

/** La misma carpeta, sin importar cómo se escribió (mayúsculas en Windows, barras, una barra al final). Pura. */
const claveDeCarpeta = (ruta: string) => resolve(ruta).replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();

/** Si un repositorio es la carpeta de este mismo Studio: el proyecto STL Studio, de cada copia. Pura. */
export const esElStudio = (raiz: string, repo: string): boolean => claveDeCarpeta(raiz) === claveDeCarpeta(repo);

/**
 * Los proyectos de este Estudio: los de estudio.local.json cuya memoria está en su repositorio, por su id, y al final el
 * que es el mismo Studio (pd_stl_semilla, t_decide_semilla_lugar).
 */
export async function proyectosLocales(raiz: string): Promise<string[]> {
  const l = await leerLocal(raiz);
  const ids = Object.entries(l.repositorios)
    .filter(([id, repo]) => ID_VALIDO.test(id) && repo && existsSync(join(repo, MEMORIA, 'proyecto.json')))
    .map(([id]) => id)
    .sort();
  const delStudio = (id: string) => esElStudio(raiz, l.repositorios[id]);
  return [...ids.filter((id) => !delStudio(id)), ...ids.filter(delStudio)];
}

/** El proyecto activo de este computador: el guardado si existe y, si no, el primero que haya. */
export function elegirActivo(local: Local, ids: string[]): string | null {
  return local.activo && ids.includes(local.activo) ? local.activo : (ids[0] ?? null);
}

function git(cwd: string, args: string[], env: Record<string, string> = {}): Promise<{ ok: boolean; out: string; err: string }> {
  return new Promise((listo) => {
    execFile('git', ['-c', 'core.quotepath=false', ...args], { cwd, encoding: 'utf8', timeout: 60_000, windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never', LANG: 'C', LC_ALL: 'C', ...env } },
      (e, out, err) => listo({ ok: !e, out: String(out ?? ''), err: String(err ?? '') }));
  });
}

/**
 * Abre la memoria de un proyecto en su repositorio: la carpeta `.stl/` con la rama `stl`. Si la rama ya existe (aquí o
 * en GitHub, porque el proyecto ya estuvo en un Estudio), la abre tal cual; si no, la crea vacía, sin historia común con
 * el código. Excluye `.stl/` solo en este computador (.git/info/exclude): no toca el .gitignore del proyecto, ni sus
 * ramas, ni su código. Devuelve si ya tenía memoria (proyecto.json).
 */
export async function abrirMemoria(repo: string): Promise<{ yaTenia: boolean }> {
  if (!isAbsolute(repo)) throw new Error('La carpeta del repositorio debe ser una ruta completa.');
  const dir = join(repo, MEMORIA);
  const yaAbierta = existsSync(join(dir, '.git'));
  if (!yaAbierta) {
    if (existsSync(dir)) throw new Error(`Ese repositorio ya tiene una carpeta ${MEMORIA} que no es la memoria de STL: muévela o cámbiale el nombre.`);
    const hay = async (ref: string) => (await git(repo, ['rev-parse', '--verify', '--quiet', ref])).ok;
    let r;
    if (await hay(`refs/heads/${RAMA}`)) r = await git(repo, ['worktree', 'add', MEMORIA, RAMA]);
    else if (await hay(`refs/remotes/origin/${RAMA}`)) r = await git(repo, ['worktree', 'add', '--track', '-b', RAMA, MEMORIA, `origin/${RAMA}`]);
    else {
      r = await git(repo, ['worktree', 'add', '--orphan', '-b', RAMA, MEMORIA]);
      // git anterior a 2.42: sin --orphan, se abre suelta y se cambia a una rama nueva sin historia
      if (!r.ok) {
        r = await git(repo, ['worktree', 'add', '--detach', MEMORIA]);
        if (r.ok) r = await git(dir, ['switch', '--orphan', RAMA]);
      }
    }
    if (!r.ok) throw new Error(`No se pudo abrir la memoria del proyecto (${r.err.trim().split('\n').pop() || 'git falló'}).`);
  }
  const comun = (await git(repo, ['rev-parse', '--path-format=absolute', '--git-common-dir'])).out.trim();
  if (comun) {
    const excluir = join(comun, 'info', 'exclude');
    const ya = existsSync(excluir) ? await readFile(excluir, 'utf-8') : '';
    if (!ya.split(/\r?\n/).some((l) => l.trim() === `/${MEMORIA}/`)) {
      await mkdir(join(comun, 'info'), { recursive: true });
      await appendFile(excluir, `${ya && !ya.endsWith('\n') ? '\n' : ''}# La memoria de STL Studio (rama ${RAMA}): ver ${MEMORIA}/README.md\n/${MEMORIA}/\n`, 'utf-8');
    }
  }
  return { yaTenia: existsSync(join(dir, 'proyecto.json')) };
}

/** Lo que explica la rama `stl` a quien la encuentre en el repositorio o en GitHub. */
export const LEEME_MEMORIA = `# La memoria de STL Studio

Esta rama (\`${RAMA}\`) guarda la dirección del proyecto con la Metodología STL: su objetivo, su ruta, las misiones, las
notas del equipo y los documentos del director. No tiene código ni historia común con las ramas del proyecto, así que
no se mezcla con ellas ni hace correr su integración continua.

STL Studio la abre en la carpeta \`${MEMORIA}/\` del repositorio. Para retomarla en otro computador, entrega este
repositorio en tu STL Studio: la encuentra y sigue donde quedó.
`;

/** La plantilla del plan de arranque, por tipo e idioma: plan(-nuevo).en.json en inglés si existe; si no, la española. */
function plantillaDelPlan(raiz: string, tipo: TipoProyecto, idioma?: Idioma): string {
  const base = tipo === 'nuevo' ? 'plan-nuevo' : 'plan';
  const traducida = join(raiz, 'plantilla', `${base}.${idioma}.json`);
  return idioma && idioma !== 'es' && existsSync(traducida) ? traducida : join(raiz, 'plantilla', `${base}.json`);
}

/**
 * Crea un proyecto en la memoria de su repositorio, desde su plantilla: su proyecto.json (con lo que contó quien lo
 * crea, que queda como titular) y su plan de arranque. Un proyecto existente nace de plantilla/plan.json (el director lo
 * diagnostica); uno nuevo, de plantilla/plan-nuevo.json (el director lo plantea a partir de lo que se le cuenta). La
 * memoria ya debe estar abierta (abrirMemoria) y el proyecto, en estudio.local.json. Devuelve las rutas virtuales que
 * escribió (para su commit).
 */
export async function crearProyecto(
  raiz: string,
  datos: { id: string; nombre: string; tipo?: TipoProyecto; contexto: string; metaInicial: string; terminado?: string; url: string; titular: { nombre: string; correo: string }; historialIA?: Proyecto['historialIA']; idioma?: Idioma; diagnosticoPedido?: boolean; contextoOriginal?: string; contextoPorTraducir?: boolean },
): Promise<string[]> {
  // El arranque nace en el idioma de la interfaz de quien lo entrega (nota nmw9wgco4tit): su plantilla en inglés lleva
  // «.en» antes de «.json»; en español, o si faltara, la de siempre
  const en = datos.idioma === 'en';
  const r = rutasDe(datos.id);
  if (!memoriaDe(raiz, datos.id)) throw new Error(`El proyecto «${datos.id}» no tiene su repositorio en este Estudio.`);
  if (existsSync(enDisco(raiz, r.proyecto))) throw new Error(`El proyecto «${datos.id}» ya tiene su memoria.`);
  const tipo: TipoProyecto = datos.tipo === 'nuevo' ? 'nuevo' : 'existente';
  const proyecto: Proyecto = {
    ...JSON.parse(await readFile(join(raiz, 'plantilla', 'proyecto.json'), 'utf-8')),
    nombre: datos.nombre,
    tipo,
    contexto: datos.contexto,
    // Contado en otro idioma (pd_campo_libre): las palabras de la persona, junto a su traducción, o la marca de que falta
    ...(datos.contextoOriginal?.trim() ? { contextoOriginal: datos.contextoOriginal } : {}),
    ...(datos.contextoPorTraducir && !datos.contextoOriginal?.trim() && datos.contexto.trim() ? { contextoPorTraducir: true as const } : {}),
    metaInicial: datos.metaInicial,
    terminado: datos.terminado ?? '',
    ...(datos.historialIA?.length ? { historialIA: datos.historialIA } : {}),
    repositorio: { url: datos.url, rama: '' },
    equipo: [en
      ? { id: 'titular', nombre: datos.titular.nombre, correo: datos.titular.correo, cargo: 'Project director', papel: 'Directs the project: sets the goal, answers the proposals and crosses the gates.' }
      : { id: 'titular', nombre: datos.titular.nombre, correo: datos.titular.correo, cargo: 'Director de proyecto', papel: 'Dirige el proyecto: fija la meta, responde las propuestas y cruza las puertas.' }],
  };
  const plan = JSON.parse(await readFile(plantillaDelPlan(raiz, tipo, datos.idioma), 'utf-8'));
  const hoy = new Date().toISOString().slice(0, 10);
  plan.actualizado = hoy;
  plan.mensaje.fecha = hoy;
  // Con el diagnóstico ya pedido al entregarlo, la misión que solo pedía pedirlo sobra (pd_entregar_y_diagnosticar)
  // Uno nuevo, igual: sin la que solo repasaba lo contado y pedía su revisión (pd_entrega_al_instante)
  const sobra = tipo === 'existente' ? MISION_PEDIR_DIAGNOSTICO : MISION_PEDIR_PLANTEAMIENTO;
  if (datos.diagnosticoPedido) plan.misiones = (plan.misiones ?? []).filter((m: { id?: string }) => m.id !== sobra);
  const escribir = async (ruta: string, x: unknown) => {
    const archivo = enDisco(raiz, ruta);
    await mkdir(join(archivo, '..'), { recursive: true });
    await writeFile(archivo, typeof x === 'string' ? x : JSON.stringify(x, null, 2) + '\n', 'utf-8');
  };
  const leeme = `${r.base}/README.md`;
  await escribir(r.proyecto, proyecto);
  await escribir(r.plan, plan);
  if (!existsSync(enDisco(raiz, leeme))) await escribir(leeme, LEEME_MEMORIA);
  return [r.proyecto, r.plan, leeme];
}
