// La precarga escondida dentro de la revisión (pedido pd_precarga_oculta; notas del titular nmwdlp85ltit, nmwdpeslgtit,
// nmwgj3ah9tit, nmwi6rgsgtit, nmwimsex5tit, nmwj6hsultit y nmwjk0f8rtit). En un proyecto que no es el Studio, que no se
// recarga al terminar, la revisión se anuncia terminada solo cuando ya está lista la voz del primer párrafo de «¿Dónde
// quedamos?» y la del primer paso de tu primera misión, y preparada la niebla de lectura si la tienes puesta: esa espera es
// parte de la revisión, nunca un cargador después. Nunca más de 90 segundos: lo que falte termina en segundo plano. Con la
// voz apagada no espera la voz; una urgencia no espera nada. Mientras espera, «Lo que va haciendo el director» dice
// «Preparando la voz y la lectura de Dónde quedamos…» (app.ts › terminarEnSuSitio). Puro.

/** Lo más que espera el anuncio (nmwdpeslgtit, nmwgj3ah9tit). */
export const TOPE_PRECARGA_MS = 90_000;

/** Cuántos bloques de la tarjeta de tu primera misión se preparan: su título y su primer paso (nmwjk0f8rtit). */
export const BLOQUES_DE_LA_MISION = 2;

/** Qué espera el anuncio de una revisión que terminó: la voz, la niebla, o nada. */
export function queEspera(o: { esElStudio: boolean; urgencia: boolean; voz: boolean; niebla: boolean }): { voz: boolean; niebla: boolean } {
  // El Studio se recarga al terminar y prepara su voz antes (pd_voz_dq_al_cerrar); una urgencia no espera su voz (nmwj6hsultit)
  if (o.esElStudio || o.urgencia) return { voz: false, niebla: false };
  return { voz: o.voz, niebla: o.niebla };
}

/**
 * Lo que se precarga al terminar una urgencia (nota nmwk9qughtit): lo mismo que tras una revisión, la voz del primer párrafo
 * de «¿Dónde quedamos?» y del primer paso de tu misión, y la niebla si la tienes puesta, porque se retoma desde ahí. Pero en
 * segundo plano: su aviso sale en el acto y no espera nada (nmwj6hsultit). También en el Studio, que tras una urgencia no
 * se recarga. Pura.
 */
export function precargaDeUrgencia(o: { voz: boolean; niebla: boolean }): { voz: boolean; niebla: boolean; esperaElAviso: false } {
  return { voz: o.voz, niebla: o.niebla, esperaElAviso: false };
}

/**
 * Toda revisión o urgencia que cierra deja precargada la voz y la niebla de lo que la persona va a encontrar, en cualquier
 * proyecto (nota nmwkx0ajmtit, 17 de noviembre de 2026: en «app», una revisión cerrada hacía más de veinte minutos la hizo
 * esperar la precarga al abrir «¿Dónde quedamos?»). La página solo la preparaba si la veía terminar en ese mismo proyecto:
 * cerrada mientras estaba en otro, con la pestaña cerrada o recargada, nadie la preparaba. Por eso cada cierre se recuerda
 * por su clave, «<proyecto>:<pedida>», y el que llega sin preparar se prepara apenas se sabe de él, en segundo plano. Pura.
 */
export interface Cierre { pedida?: string; hecha?: string | null }
export const CLAVE_PRECARGADAS = 'estudio.precargadas';
/** Cuántos cierres recuerda la página: los últimos, los de todos los proyectos. */
export const PRECARGADAS_MAX = 60;
export function cierresPorPrecargar(o: { proyecto: string; revision?: Cierre | null; urgencia?: Cierre | null; precargadas: readonly string[] }): string[] {
  return [o.revision, o.urgencia]
    .filter((c): c is Cierre => !!c?.pedida && !!c.hecha)
    .map((c) => `${o.proyecto}:${c.pedida}`)
    .filter((k) => !o.precargadas.includes(k));
}
/** Los cierres ya preparados, con los nuevos al final y sin pasar del tope. Pura. */
export function recordarPrecargadas(antes: readonly string[], nuevas: readonly string[], tope = PRECARGADAS_MAX): string[] {
  return [...antes.filter((k) => !nuevas.includes(k)), ...nuevas].slice(-tope);
}

/**
 * Lo que se abre solo al entrar en un proyecto (notas del titular nmwn0bbdgtit y nmwn17nrutit, 19 de noviembre de 2026):
 * con su revisión todavía en marcha, nada. Ni «¿Dónde quedamos?» ni la misión en el modo enfoque, que invitaban a resolver
 * misiones que esa misma revisión puede cambiar: el proyecto se abre cerrado, con su revisión en curso a la vista y lo que
 * van hablando el computador y el modelo. Lo de siempre se abre al terminar la revisión (terminarEnSuSitio, la recarga) o
 * al entrar cuando ya terminó. Pura.
 */
export interface RevisionAlEntrar { lanzada?: string; enCurso?: string; hecha?: string | null; error?: string | null }
/** Lo demás que el director puede estar haciendo en el proyecto: una urgencia o una aclaración lanzadas (nmwpyo5wdtit). */
export interface TrabajoAlEntrar { urgencia?: RevisionAlEntrar | null; aclaracion?: RevisionAlEntrar | null }
const revisionEnMarcha = (r?: RevisionAlEntrar | null): boolean => !!r && !r.hecha && !r.error && !!(r.enCurso || r.lanzada);
const lanzadaSinTerminar = (r?: RevisionAlEntrar | null): boolean => !!r && !!r.lanzada && !r.hecha && !r.error;
/** Si el director trabaja ahora en el proyecto: su revisión lanzada o en curso, o una urgencia o aclaración lanzadas. Pura. */
export const directorEnMarcha = (revision?: RevisionAlEntrar | null, otros?: TrabajoAlEntrar | null): boolean =>
  revisionEnMarcha(revision) || lanzadaSinTerminar(otros?.urgencia) || lanzadaSinTerminar(otros?.aclaracion);
export function alEntrarEnProyecto(revision?: RevisionAlEntrar | null, otros?: TrabajoAlEntrar | null): { dondeQuedamos: boolean; enfoque: boolean; verRevision: boolean } {
  const corre = directorEnMarcha(revision, otros);
  return { dondeQuedamos: !corre, enfoque: !corre, verRevision: corre };
}

/**
 * La guardia única de lo que se abre solo (nota nmwpyo5wdtit, 21 de noviembre de 2026: volver a STL Studio con su
 * revisión en marcha abrió una misión en el modo enfoque). El modo enfoque que la persona traía de otro proyecto
 * (`querido`) seguía puesto al entrar: el cambio de proyecto lo apagaba solo al final, después de pintar, y la salida por la
 * recarga retenida o por un destino lo saltaba entero. Ahora se decide al llegar los datos, antes de pintar: si se entra
 * (otro proyecto, o la primera carga tras recargar) y el director trabaja en él, el enfoque no sigue. Pura.
 */
export function enfoqueAlLlegar(o: { querido: boolean; entra: boolean; trabaja: boolean }): boolean {
  return o.querido && !(o.entra && o.trabaja);
}

/**
 * «¿Dónde quedamos?» abierto por el Studio, no por un botón de la persona: con el director trabajando en el proyecto, no se
 * abre (nmwpyo5wdtit). Un botón de la persona («¿Dónde quedamos?», «Ver resultado», el proyecto activo en el selector)
 * siempre lo abre. Pura.
 */
export const dondeQuedamosSeAbre = (o: { porLaPersona: boolean; revision?: RevisionAlEntrar | null; otros?: TrabajoAlEntrar | null }): boolean =>
  o.porLaPersona || alEntrarEnProyecto(o.revision, o.otros).dondeQuedamos;

/**
 * Espera a que todo esté listo o al tope, lo que llegue primero: 'listo' o 'tope'. Lo que no terminó sigue en segundo
 * plano (nada se cancela), y una falla cuenta como terminada: el anuncio nunca se queda esperando una voz que falló.
 */
export function esperarConTope(trabajos: readonly Promise<unknown>[], tope: number = TOPE_PRECARGA_MS, reloj: (ms: number) => Promise<void> = (ms) => new Promise((listo) => setTimeout(listo, ms))): Promise<'listo' | 'tope'> {
  if (!trabajos.length) return Promise.resolve('listo');
  const todos = Promise.all(trabajos.map((t) => t.catch(() => undefined))).then(() => 'listo' as const);
  return Promise.race([todos, reloj(tope).then(() => 'tope' as const)]);
}

/**
 * La revisión del Studio mismo cerró mientras la persona estaba en otra ventana o pestaña (nota nmwp8jprgtit, regla del
 * titular): al volver, la página se recarga sola, una vez, para que se vean el cierre y sus cambios. La recarga de siempre
 * nace de ver la revisión pasar de abierta a cerrada, y con la pestaña escondida eso no ocurre (los temporizadores se
 * frenan o se congelan, y la cuenta espera a quien no mira); por eso la decisión se toma también al volver, comparando la
 * revisión cerrada de ahora con la última que la página mostró. Pura.
 */
export const CLAVE_CIERRE_VISTO = 'estudio.cierreVisto';
/** La clave de la revisión cerrada del Studio («<pedida>@<hecha>»), o '' si el activo no es el Studio o no hay cierre. */
export function claveDelCierre(o: { esElStudio: boolean; revision?: Cierre | null }): string {
  return o.esElStudio && o.revision?.pedida && o.revision.hecha ? `${o.revision.pedida}@${o.revision.hecha}` : '';
}
/**
 * La marca del último cierre del Studio que la página mostró, con cada llegada de datos (nmwprpbbmtit, que repite
 * nmwp8jprgtit; regla del titular, en código y no en la memoria del modelo). Con los primeros datos y el Studio a la vista,
 * su cierre de ahora (ya se ve). Con otro proyecto a la vista, la marca no cambia; pero si la página aún no sabe nada del
 * Studio (`visto` null) y el Studio tiene una revisión en curso o recién cerrada (`studioReviso`, de `otrasRevisiones`),
 * pasa a «»: su cierre, aunque llegue mientras se trabaja en el otro proyecto, recarga la página una vez al volver al
 * Studio. Con el Studio a la vista después de los primeros datos tampoco cambia: solo se decide al volver
 * (recargaAlVolver). Pura.
 */
export function marcaConDatos(o: { visto: string | null; primera: boolean; esElStudio: boolean; revision?: Cierre | null; studioReviso?: boolean }): string | null {
  if (o.esElStudio) return o.primera ? claveDelCierre(o) : o.visto;
  if (o.visto !== null) return o.visto;
  return o.studioReviso ? '' : null;
}

/**
 * Lo que hace la cuenta de una recarga del Studio cuando le toca empezar (nmwprs1e8tit, nmwprpbbmtit). El servidor solo
 * suelta una recarga o un reinicio retenidos con el Studio activo (recarga.ts), pero al volver con el selector la página
 * tarda unos segundos en traer los datos del Studio: si en ese momento aún dicen otro proyecto, antes la recarga se
 * soltaba en su sitio y se perdía, y el servidor esperaba media hora la señal de la página para reiniciarse (con el código
 * viejo: la pestaña de QA sin los iconos de dispositivo). Ahora, con otro proyecto a la vista, la cuenta espera al Studio;
 * nunca se suelta. Solo la de «abriste el Studio otra vez» (`abrir`) termina en su sitio, como antes. Pura.
 */
export function arranqueDeLaCuenta(o: { esElStudio: boolean; abrir?: boolean; ocupado: boolean }): 'empezar' | 'esperar' | 'en_su_sitio' {
  if (!o.esElStudio) return o.abrir ? 'en_su_sitio' : 'esperar';
  return o.ocupado ? 'esperar' : 'empezar';
}

/** Al volver (pestaña visible o ventana en foco): recarga si hay un cierre del Studio que la página aún no mostró; `visto` pasa a ser el de ahora. */
export function recargaAlVolver(o: { visto: string | null; esElStudio: boolean; revision?: Cierre | null }): { recargar: boolean; visto: string | null } {
  // Con otro proyecto a la vista, la marca no se toca: es la del último cierre del Studio que la página mostró
  // (nmwprpbbmtit: antes pasaba a «» y, al volver, recargaba por un cierre que ya se había visto)
  if (!o.esElStudio) return { recargar: false, visto: o.visto };
  const ahora = claveDelCierre(o);
  // Sin cierre del Studio, o sin saber qué mostró la página aún, no se recarga por una duda
  if (!ahora || o.visto === null) return { recargar: false, visto: o.visto ?? ahora };
  return { recargar: ahora !== o.visto, visto: ahora };
}
