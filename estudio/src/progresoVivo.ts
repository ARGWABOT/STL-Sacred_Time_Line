/**
 * Lo que va haciendo el director, en vivo (nota de voz del titular, 26 de octubre de 2026): los pasos van con lo más nuevo
 * arriba, y el panel sigue esa punta. Aquí vive lo puro: dónde queda el desplazamiento de la lista de pasos cuando se
 * vuelve a pintar con pasos nuevos arriba. La interfaz (app.ts › pintarProgreso) solo lo aplica.
 */
import { claseDeTurno, ENCARGO_DE_PLANEAR, type Actor, type ClaseDeTurno, type ConversacionDeRevision, type Turno } from '../../src/director/turnos';
import { caraDelModeloSVG, caraSVG } from './cara';
import { hora, miles } from './formato';
import { lenguaje, t, type ClaveDeTexto } from './textos';
import { esc } from './util';

/** Cuánto puede estar la lectura separada de la punta de arriba y aun así seguirla (píxeles). */
const MARGEN_ARRIBA = 40;

/** Cómo estaba la lista antes de pintarla de nuevo: su desplazamiento y lo alta que era por dentro. */
export interface ListaAntes {
  desplazamiento: number;
  alto: number;
}

/**
 * Dónde queda el desplazamiento tras pintar la lista otra vez. En la primera vez, o con la lectura en la punta de arriba,
 * se queda arriba y se ven los pasos nuevos. Si la persona bajó a leer algo más viejo, se queda en lo mismo que leía: los
 * pasos nuevos entran por arriba y empujan el contenido, así que se suma lo que creció.
 *
 * `invertida`: el panel de la revisión (pedido pd_panel_revision, nota de voz del titular nmw12urbdtit) muestra la lista
 * de abajo hacia arriba, con lo nuevo junto a los personajes: ahí la punta es abajo, el desplazamiento es 0 en ella y
 * negativo al subir a leer algo más viejo, y lo que crece entra por abajo, así que se resta.
 */
export function desplazamientoTrasPintar(antes: ListaAntes | null, altoAhora: number, invertida = false): number {
  if (!antes || Math.abs(antes.desplazamiento) < MARGEN_ARRIBA) return 0;
  if (invertida) return Math.min(0, antes.desplazamiento - (altoAhora - antes.alto));
  return Math.max(0, antes.desplazamiento + (altoAhora - antes.alto));
}

/**
 * ¿La lectura sigue en la punta de la conversación? Si no, la persona se fue a leer algo más viejo: la lista la espera ahí,
 * sin moverse, y se ve el botón que la lleva de vuelta (nota de voz del titular nmvziozqbtit, 2 de noviembre de 2026). Pura.
 */
export const sigueLaPunta = (desplazamiento: number): boolean => Math.abs(desplazamiento) < MARGEN_ARRIBA;

/**
 * La línea entre su plan y lo que va haciendo se arrastra con el ratón (pedido pd_division_arrastrable; nota de voz del
 * titular nmvv2e6zytit, 30 de octubre de 2026), y solo con el ratón: en el teléfono queda fija (elección del titular del
 * 30 de octubre, misión t_decide_division_movil). Se guarda en este navegador y se queda donde la dejas.
 */
export const CLAVE_DIVISION = 'estudio.director.division-progreso';
/** Lo menos que le queda al plan, y lo menos que le deja a lo que va haciendo (píxeles). */
export const PLAN_MINIMO = 48;
export const PASOS_MINIMO = 120;
/** La línea, entre el plan abierto y lo que va haciendo: el CSS la oculta con el plan plegado y en el teléfono. */
export const DIVISION_PROGRESO = (): string => `<div class="division-progreso" data-division-progreso role="separator" aria-orientation="horizontal" data-titulo="${esc(t('progreso.division'))}"></div>`;

/** El alto del plan al arrastrar la línea: lo arrastrado, sin que el plan ni lo que va haciendo se queden sin lugar. Pura. */
export function altoDelPlan(alto: number, panel: number): number {
  return Math.round(Math.min(Math.max(PLAN_MINIMO, panel - PASOS_MINIMO), Math.max(PLAN_MINIMO, alto)));
}

/** El alto guardado, si vale (un número positivo); si no, null: el plan toma su alto de siempre. Pura. */
export function altoGuardado(texto: string | null): number | null {
  const n = Number(texto);
  return texto && Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * La ventana se abre con el clic, no con la consulta siguiente (nota del titular nmvybvq1etit, 1 de noviembre de 2026: al
 * iniciar una revisión no abría, tardó mucho y tuvo que dar varios clics). El director aparece en la línea en cuanto se pide
 * la revisión, pero la ventana solo se mostraba con la revisión ya lanzada, y eso la página lo sabe en su consulta siguiente:
 * hasta 10 segundos después, y más con la pausa de leer los 4,5 MB de cada respuesta (pd_aligerar_consulta). Mientras tanto
 * el clic no mostraba nada y el siguiente la cerraba, así que abría o no según cuántos clics llevara al llegar la respuesta.
 * Ahora se muestra si el director se ve en la línea, y dice en qué va. Pura.
 */
export const progresoSeMuestra = (abierta: boolean, trabajando: boolean, directorEnLaLinea: boolean): boolean => abierta && (trabajando || directorEnLaLinea);

/**
 * Qué dice la ventana de lo que va haciendo, de arriba abajo: la revisión pedida que aún no se lanza («sinEmpezar», con
 * sus puntos); la que el Studio ya lanzó, mientras su conversación no tiene nada (la espera, con sus puntos, y en cuanto
 * llega algo, la conversación); y solo si nadie la lanzó desde el Studio, que el director revisa desde su sesión. Antes
 * una conversación que aún no existe (null, entre el lanzamiento y la primera línea de su registro) se leía como la
 * sesión del director, y la ventana se quedaba en ese texto fijo al empezar la revisión (nota del titular nmw2y41f7tit,
 * 5 de noviembre de 2026). Pura.
 */
export function vistaDelProgreso(o: { sinEmpezar: string | null; lanzadaPorElStudio: boolean; conversacion: { turnos: readonly unknown[]; espera?: unknown } | null | undefined }): 'sinEmpezar' | 'arrancando' | 'desdeSuSesion' | 'chat' {
  if (o.sinEmpezar) return 'sinEmpezar';
  const c = o.conversacion;
  if (c && (c.turnos.length || c.espera)) return 'chat';
  return c || o.lanzadaPorElStudio ? 'arrancando' : 'desdeSuSesion';
}

/**
 * El botón de la cabecera de lo que va haciendo el director: fuera del panel, cerrar la ventana; en el panel de una
 * revisión, ninguno, porque lo abre y lo cierra la cara del director de la línea viva (nmw18d768tit); en el de lo urgente,
 * plegar: ahí no hay línea viva con esa cara, y sin botón no había cómo quitarlo de en medio para leer (nota de voz del
 * titular nmw46zhl5tit, 5 de noviembre de 2026; se vuelve a abrir con el atajo, que late mientras atiende). Pura.
 */
export function botonDelProgreso(o: { enPanel: boolean; urgente: boolean }): 'cerrar' | 'plegar' | null {
  if (!o.enPanel) return 'cerrar';
  return o.urgente ? 'plegar' : null;
}

/** Un clic más, tan pronto después de abrirla, es la insistencia de quien no la vio abrirse, no un clic para cerrarla. */
export const INSISTENCIA_MS = 1500;
/** Cómo queda la ventana con un clic en el director: abre siempre; cierra solo si lleva un momento abierta. Pura. */
export const abiertaTrasClic = (abierta: boolean, abiertaEn: number, ahora: number): boolean => !abierta || ahora - abiertaEn < INSISTENCIA_MS;

/** Dónde cayó un clic en la página, visto desde la ventana de lo que va haciendo el director. */
export interface ClicEnLaPagina {
  /** Dentro de la ventana (#progreso-director). */
  dentro: boolean;
  /** Se apretó dentro de la ventana y se soltó fuera (arrastrar la división, seleccionar texto): no es un clic fuera. */
  empezoDentro: boolean;
  /** En lo que la abre y la cierra: el atajo o el director de la línea viva ([data-progreso]); eso ya decide abiertaTrasClic. */
  enAtajo: boolean;
  /** En un botón de autorizar lo negado ([data-autorizar-vivo]). */
  enAutorizar: boolean;
  /** En un diálogo abierto encima: es otra cosa, y al cerrarlo la ventana sigue ahí. */
  enDialogo: boolean;
  /** Lo que se tocó sigue en la página: si un repintado lo quitó, no se sabe dónde estaba y no se cierra. */
  sigueEnLaPagina: boolean;
}
/**
 * Un clic fuera de la ventana, mientras se ve, la cierra, como cualquier ventana emergente (nota del titular nmw10oqgstit,
 * 3 de noviembre de 2026: «se debe cerrar el pop que muestra el avance del director al dar click fuera de él durante las
 * revisiones»). Dentro de ella, en su atajo, en autorizar o en un diálogo, no. Pura.
 */
export const cierraConClicFuera = (visible: boolean, c: ClicEnLaPagina): boolean =>
  visible && c.sigueEnLaPagina && !c.dentro && !c.empezoDentro && !c.enAtajo && !c.enAutorizar && !c.enDialogo;

// ── La revisión como una conversación en globos (nota de voz del titular nmvxxg5wvtit, 1 de noviembre de 2026; antes,
// nmvx09it7tit y nmvx0q10ctit): la cara del director y la del modelo, cada globo con quién pide qué, si es una solicitud, una
// pregunta o una respuesta, y cuánto tardó; un clic abre solo ese globo. Abajo, la banda con el reloj de cada uno, como en el
// ajedrez: quien tiene el turno corre, y al responder le toca al otro. Lo más nuevo arriba, como siempre en esta ventana. Los
// datos salen del registro (src/director/turnos.ts); los textos, del archivo de textos.

const ICONOS: Record<Actor, () => string> = { computador: () => caraSVG('feliz'), modelo: caraDelModeloSVG, ayudante: caraDelModeloSVG };
const NOMBRES: Record<Actor, ClaveDeTexto> = { computador: 'chat.computador', modelo: 'chat.modelo', ayudante: 'chat.ayudante' };
const ACCIONES: Record<string, ClaveDeTexto> = { Read: 'chat.lee', Edit: 'chat.edita', MultiEdit: 'chat.edita', NotebookEdit: 'chat.edita', Write: 'chat.escribe', Grep: 'chat.busca', Glob: 'chat.busca', Bash: 'chat.corre', Agent: 'chat.pideAyudante', Task: 'chat.pideAyudante', Workflow: 'chat.pideAyudante', WebSearch: 'chat.buscaInternet', WebFetch: 'chat.leePagina' };
const AVISOS: Record<string, ClaveDeTexto> = { detener: 'chat.avisoDetener', limite: 'chat.avisoLimite', prorroga: 'chat.avisoProrroga' };

const CLASES: Record<ClaseDeTurno, ClaveDeTexto> = { solicitud: 'chat.claseSolicitud', pregunta: 'chat.clasePregunta', respuesta: 'chat.claseRespuesta' };

/** El acordeón: los globos del mismo nombre se abren de a uno, y el navegador cierra solo el que estaba abierto. */
const ACORDEON = 'globos-revision';

/** Cuánto tardó algo, en palabras cortas («0,4 s», «12 s», «3 min 20 s»). Pura. */
export function duracion(ms: number): string {
  const s = Math.max(0, ms) / 1000;
  if (s < 10) return t('chat.segundos', { s: (Math.round(s * 10) / 10).toLocaleString(lenguaje()) });
  if (s < 60) return t('chat.segundos', { s: Math.round(s) });
  const total = Math.round(s);
  const m = Math.floor(total / 60);
  return total % 60 ? t('chat.minutosYSegundos', { m, s: total % 60 }) : t('chat.minutos', { m });
}

/** Lo que marca el cronómetro: minutos y segundos (y horas, si llega). Pura. */
export function relojDesde(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const dos = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(s / 3600);
  return h ? `${h}:${dos(Math.floor(s / 60) % 60)}:${dos(s % 60)}` : `${Math.floor(s / 60)}:${dos(s % 60)}`;
}

/** Lo que dice un turno, en una frase, según su tipo. Pura. */
function cabezaDeTurno(x: Turno): string {
  if (x.tipo === 'encargo') return t(x.texto === ENCARGO_DE_PLANEAR ? 'chat.encargoPlanear' : 'chat.encargo');
  if (x.tipo === 'plan') return x.error ? t('chat.planFallo', { porque: x.texto }) : t('chat.plan', { n: Number(x.texto) });
  if (x.tipo === 'aviso') return AVISOS[x.texto] ? t(AVISOS[x.texto]) : '';
  if (x.tipo === 'pide') return ACCIONES[x.herramienta ?? ''] ? t(ACCIONES[x.herramienta!], { detalle: x.detalle ?? '' }) : t('chat.usa', { herramienta: x.herramienta ?? '', detalle: x.detalle ?? '' });
  if (x.tipo === 'responde') return x.error ? t('chat.respondeError', { detalle: x.detalle ?? '' }) : t('chat.responde', { detalle: x.detalle ?? '' });
  return '';
}

/** Lo que se lee al abrir un globo: lo que se dijo entero, si no es lo mismo que ya dice su línea. Pura. */
function cuerpoDeTurno(x: Turno): string {
  const mostrar = x.tipo === 'dice' || x.tipo === 'pide' || x.tipo === 'responde' || (x.tipo === 'aviso' && !AVISOS[x.texto]);
  if (!mostrar || !x.texto.trim()) return '';
  // Lo que ya dice su frase no se repite
  if (x.tipo === 'pide' && x.texto.trim() === (x.detalle ?? '').trim()) return '';
  return `<div class="turno-texto">${esc(`${x.texto}${x.largo ? ` ${t('chat.cortado', { n: x.largo.toLocaleString(lenguaje()) })}` : ''}`)}</div>`;
}

/**
 * Quién se tomó el tiempo de un globo: quien habla en él (nota de voz del titular nmvy3jz2otit). La respuesta a lo que se le
 * pidió a un ayudante lleva el tiempo del ayudante. Pura.
 */
function quienTardo(x: Turno): ClaveDeTexto {
  if (x.de === 'ayudante' || (x.tipo === 'responde' && ACCIONES[x.herramienta ?? ''] === 'chat.pideAyudante')) return 'chat.tardoAyudante';
  return x.de === 'modelo' ? 'chat.tardoModelo' : 'chat.tardoComputador';
}

/**
 * Qué parte de los tokens de un turno vino de la caché, en un entero de 0 a 100 (nota de voz del titular nmw6se5vatit, con
 * el porcentaje que eligió en t_decide_cache_porcentaje): no dice 100 si algo fue nuevo ni 0 si algo vino de la caché.
 * null sin el total de la llamada. Pura.
 */
export function porcentajeDeCache(cache: number, total: number | undefined): number | null {
  if (!(cache > 0) || !total || total < cache) return null;
  const p = Math.round((cache / total) * 100);
  return cache < total ? Math.max(1, Math.min(99, p)) : 100;
}

/** Lo que el modelo leyó de la caché en un turno, chico junto a su tiempo, con su parte del turno; nada si no leyó. Pura. */
function cacheDeTurno(n: number, total?: number): string {
  if (!(n > 0)) return '';
  const p = porcentajeDeCache(n, total);
  const dicho = p === null ? t('chat.enCache', { n: conSeparadores(n) }) : t('chat.enCachePct', { n: conSeparadores(n), p });
  const titulo = p === null ? t('chat.enCacheTitulo', { n: conSeparadores(n) }) : t('chat.enCachePctTitulo', { n: conSeparadores(n), p, total: conSeparadores(total ?? 0) });
  return `<span class="globo-cache" data-titulo="${esc(titulo)}">${esc(dicho)}</span>`;
}

/**
 * Los tokens de la conversación entera, nuevos frente a leídos de la caché, sumando cada llamada al modelo una vez (también
 * las de los ayudantes): lo que se muestra al pie (nota de voz del titular nmw6sdsuftit). Aproximado: es lo que el
 * registro informa de cada llamada mientras corre. null si el registro no trae los tokens de ninguna llamada. Pura.
 *
 * Con los tokens de la revisión (`tokens`, los mismos de la banda), sale de ellos: los globos solo llevaban la caché de las
 * llamadas que tienen globo, y quedaban fuera las de los ayudantes, las que solo razonan y las propias de Claude Code, que
 * la banda sí cuenta (nota nmw77f74atit: 37 millones en la banda frente a 25 al pie). Así nuevos más caché es lo mismo que
 * la banda, entrada más salida.
 */
export function cuentaDeCache(c: Pick<ConversacionDeRevision, 'turnos' | 'ayudantes'> & Partial<Pick<ConversacionDeRevision, 'tokens'>>): { nuevos: number; cache: number } | null {
  if (c.tokens && c.tokens.enviados + c.tokens.recibidos > 0) {
    const cache = c.tokens.cache ?? 0;
    return { nuevos: c.tokens.enviados + c.tokens.recibidos - cache, cache };
  }
  const todos = [...c.turnos, ...Object.values(c.ayudantes ?? {}).flat()];
  let total = 0;
  let cache = 0;
  for (const x of todos) {
    if (x.tokensLlamada) total += x.tokensLlamada;
    if (x.cacheLeidos && x.tokensLlamada) cache += x.cacheLeidos;
  }
  return total > 0 ? { nuevos: total - cache, cache } : null;
}

/** La línea del pie con esos totales, marcada aproximada y sin dinero; nada si no hay de dónde contarlos. Pura. */
function resumenDeCache(c: Pick<ConversacionDeRevision, 'turnos' | 'ayudantes'> & Partial<Pick<ConversacionDeRevision, 'tokens'>>): string {
  const cuenta = cuentaDeCache(c);
  if (!cuenta) return '';
  // Las cifras, en negrita y del color de lo resaltado, para que se vean de un vistazo (nota de voz del titular nmw6uup0atit)
  const cifra = (n: number) => `<b class="cifra-tokens">${esc(conSeparadores(n))}</b>`;
  const frase = esc(t('chat.resumenCache', { nuevos: '', cache: '' })).replace('', cifra(cuenta.nuevos)).replace('', cifra(cuenta.cache));
  return `<p class="resumen-cache como" data-titulo="${esc(t('chat.resumenCacheTitulo'))}">${frase}</p>`;
}

/** Para que un repintado siga la animación de un globo donde iba, en lugar de empezarla otra vez (director.css › .turno.nace). Pura. */
const restoDeLaAnimacion = (lleva: number): string => (lleva > 0 ? ` style="--nace-hace:-${Math.round(lleva)}ms"` : '');

/**
 * Un globo: la cara de quien habla y una línea con quién hace qué, de qué clase es y cuánto tardó. Lo que tiene más que
 * decir se abre con un clic, y solo uno a la vez; lo de un ayudante, adentro, en su propio acordeón. Pura.
 */
function turnoHtml(x: Turno, conversacion: ConversacionDeRevision, abiertos: ReadonlySet<string>, acordeon = ACORDEON, nuevos: ReadonlySet<string> = new Set(), naceHace = 0): string {
  const clase = claseDeTurno(x);
  const cabeza = cabezaDeTurno(x) || x.texto.replace(/\s+/g, ' ').trim();
  const tardo = x.tardoMs === null ? '' : `<span class="globo-tardo" data-titulo="${esc(t(quienTardo(x), { d: duracion(x.tardoMs) }))}">${esc(duracion(x.tardoMs))}</span>`;
  const linea = `<span class="globo-clase">${esc(t(CLASES[clase], { quien: t(NOMBRES[x.de]) }))}</span><span class="globo-frase">${esc(cabeza)}</span>${cacheDeTurno(x.cacheLeidos ?? 0, x.tokensLlamada)}${tardo}`;
  const delAyudante = x.ayudante ? conversacion.ayudantes[x.ayudante] ?? [] : [];
  const clave = `${x.id}-ayudante`;
  const ayudante = delAyudante.length ? `<details class="turno-ayudante" data-turno-abrir="${esc(clave)}"${abiertos.has(clave) ? ' open' : ''}><summary>${t('chat.loDelAyudante', { n: delAyudante.length })}</summary><ol>${delAyudante.map((a) => turnoHtml(a, conversacion, abiertos, `${ACORDEON}-${x.id}`)).join('')}</ol></details>` : '';
  const cuerpo = cuerpoDeTurno(x);
  const detalle = cuerpo || ayudante ? `${cuerpo}${ayudante}${x.cuando ? `<div class="globo-hora como">${esc(hora(x.cuando))}</div>` : ''}` : '';
  const globo = detalle
    ? `<details class="globo" name="${esc(acordeon)}" data-turno-abrir="${esc(x.id)}"${abiertos.has(x.id) ? ' open' : ''}><summary>${linea}</summary><div class="globo-detalle">${detalle}</div></details>`
    : `<div class="globo sin-detalle"><div class="globo-linea">${linea}</div></div>`;
  return `<li class="turno de-${x.de} clase-${clase}${x.error ? ' con-error' : ''}${nuevos.has(x.id) ? ' nace' : ''}"${nuevos.has(x.id) ? restoDeLaAnimacion(naceHace) : ''}><span class="turno-icono cara-chat" data-titulo="${esc(t(NOMBRES[x.de]))}">${ICONOS[x.de]()}</span>${globo}</li>`;
}

/**
 * Los globos de una conversación, en el orden del registro: lo pedido en un mismo mensaje del modelo va en uno, y lo que
 * volvió de eso, en otro, aunque el registro los traiga intercalados (nota de voz del titular nmvzirz2ctit). Cada globo está
 * donde apareció su primer turno, y se llama como él: si llega otro del mismo lote, el globo crece sin nacer otra vez. Pura.
 */
export function globosDeTurnos(turnos: readonly Turno[]): Turno[][] {
  const porLote = new Map<string, Turno[]>();
  const globos: Turno[][] = [];
  for (const x of turnos) {
    const ya = x.lote ? porLote.get(x.lote) : undefined;
    if (ya) {
      ya.push(x);
      continue;
    }
    const nuevo = [x];
    if (x.lote) porLote.set(x.lote, nuevo);
    globos.push(nuevo);
  }
  return globos;
}

/**
 * Un lote en un globo: «El modelo solicita 6 cosas» o «El director responde 6», que se abre con un clic a su lista. Su tiempo
 * es la suma de los suyos, y cada uno sigue con el suyo adentro. Pura.
 */
function loteHtml(lote: Turno[], conversacion: ConversacionDeRevision, abiertos: ReadonlySet<string>, nuevos: ReadonlySet<string>, naceHace: number): string {
  const x = lote[0];
  const tiempos = lote.flatMap((y) => (y.tardoMs === null ? [] : [y.tardoMs]));
  const ms = tiempos.reduce((s, y) => s + y, 0);
  const tardo = tiempos.length ? `<span class="globo-tardo" data-titulo="${esc(t(quienTardo(x), { d: duracion(ms) }))}">${esc(duracion(ms))}</span>` : '';
  const quien = t(NOMBRES[x.de]);
  const titulo = t(x.tipo === 'pide' ? 'chat.loteSolicita' : 'chat.loteResponde', { quien, n: lote.length });
  const sobre = lote.flatMap((y) => (y.detalle ? [y.detalle] : [])).join(' · ');
  const nace = nuevos.has(x.id);
  return `<li class="turno de-${x.de} clase-${claseDeTurno(x)}${lote.some((y) => y.error) ? ' con-error' : ''}${nace ? ' nace' : ''}"${nace ? restoDeLaAnimacion(naceHace) : ''}><span class="turno-icono cara-chat" data-titulo="${esc(quien)}">${ICONOS[x.de]()}</span><details class="globo" name="${ACORDEON}" data-turno-abrir="${esc(x.id)}"${abiertos.has(x.id) ? ' open' : ''}><summary><span class="globo-clase">${esc(titulo)}</span><span class="globo-frase">${esc(sobre)}</span>${cacheDeTurno(lote.reduce((s, y) => s + (y.cacheLeidos ?? 0), 0), lote.reduce((s, y) => s + (y.cacheLeidos ? y.tokensLlamada ?? 0 : 0), 0) || undefined)}${tardo}</summary><div class="globo-detalle"><ol>${lote.map((y) => turnoHtml(y, conversacion, abiertos, `${ACORDEON}-${x.id}`)).join('')}</ol></div></details></li>`;
}

/** La clave del globo de quien tiene el turno, que no es un turno todavía. */
const claveDeEspera = (e: NonNullable<ConversacionDeRevision['espera']>) => `espera:${e.quien}:${e.desde}`;

/** Lo que dura la aparición de cada globo, lo que baja la lista para darle lugar y lo que separa uno del siguiente (director.css › globo-nace, lista-baja). */
export const PASO_GLOBO_MS = 1500;

/** Los globos que ya se mostraron, y el último que apareció y cuándo. */
export interface GlobosALaVista { vistos: Set<string>; ultimo: string | null; desde: number }
export const globosDeInicio = (): GlobosALaVista => ({ vistos: new Set(), ultimo: null, desde: 0 });

/**
 * Los globos salen de a uno, en su orden, aunque hayan llegado varios en el mismo segundo: se lee como una conversación
 * donde uno actúa y luego el otro, y no como una caja que se llena de golpe (nota de voz del titular nmvyr3syltit, 2 de
 * noviembre de 2026; un segundo entre uno y otro, nmvziozqbtit; segundo y medio, nmw5mogqotit). En cada pintada aparece el siguiente, si ya pasó el paso del anterior; lo demás queda oculto
 * hasta su turno (`ocultos`), y `proximoEn` dice cuándo volver a pintar. La primera pintada no espera ni anima nada (lo que
 * ya estaba, ya estaba), ni tampoco `deUnaVez` («menos movimiento», o la pestaña sin mirar). `naceHace`: lo que lleva el
 * globo que nace, para que un repintado en medio siga su animación y no la empiece otra vez. Pura, salvo `e`, que se le da
 * para eso.
 */
export function revelarGlobos(c: ConversacionDeRevision, e: GlobosALaVista, ahora: number, deUnaVez = false): { ocultos: Set<string>; nuevos: Set<string>; naceHace: number; proximoEn: number | null } {
  const orden = [...globosDeTurnos(c.turnos).map((g) => g[0].id), ...(c.espera ? [claveDeEspera(c.espera)] : [])];
  if (!e.vistos.size || deUnaVez) {
    for (const id of orden) e.vistos.add(id);
    e.ultimo = null;
    return { ocultos: new Set(), nuevos: new Set(), naceHace: 0, proximoEn: null };
  }
  const faltan = orden.filter((id) => !e.vistos.has(id));
  if (faltan.length && (!e.ultimo || ahora - e.desde >= PASO_GLOBO_MS)) {
    const id = faltan.shift()!;
    e.vistos.add(id);
    e.ultimo = id;
    e.desde = ahora;
  }
  const lleva = ahora - e.desde;
  const nace = !!e.ultimo && lleva < PASO_GLOBO_MS && orden.includes(e.ultimo);
  return { ocultos: new Set(faltan), nuevos: new Set(nace ? [e.ultimo!] : []), naceHace: nace ? lleva : 0, proximoEn: faltan.length ? Math.max(0, PASO_GLOBO_MS - lleva) : null };
}

/** Lo que lleva cada lado, en segundos y tokens: lo que la banda muestra y desde donde sube la pintada siguiente. */
export interface MarcadorDeBanda {
  director: number;
  modelo: number;
  enviados: number;
  recibidos: number;
}

/** El lado de la banda que tiene el turno: lo que hace un ayudante se le pidió al modelo, y corre en su lado. Pura. */
const ladoDelTurno =(c: Pick<ConversacionDeRevision, 'espera'>): 'computador' | 'modelo' | null => (!c.espera ? null : c.espera.quien === 'computador' ? 'computador' : 'modelo');

/**
 * El lado activo según los globos que ya están a la vista (nota nmw5mogqotit): cambia justo cuando aparece el globo del otro,
 * no cuando pasa de verdad. Con la espera a la vista, es quien espera; si aún no salió, el de quien habló en el último globo
 * visible. Sin espera (nadie corre), ninguno. Pura.
 */
export function ladoDeLosGlobos(c: Pick<ConversacionDeRevision, 'turnos' | 'espera'>, ocultos: ReadonlySet<string> = new Set()): 'computador' | 'modelo' | null {
  if (!c.espera) return null;
  if (!ocultos.has(claveDeEspera(c.espera))) return ladoDelTurno(c);
  const ultimo = globosDeTurnos(c.turnos).filter((g) => !ocultos.has(g[0].id)).at(-1)?.[0];
  return ultimo ? (ultimo.de === 'computador' ? 'computador' : 'modelo') : null;
}

/**
 * El marcador de una conversación: cada lado con lo acumulado y, el que tiene el turno, con lo que lleva corriendo. `activo`:
 * el lado que se ve activo (ladoDeLosGlobos); solo corre su reloj si además es el que tiene el turno de verdad. Pura.
 */
export function marcadorDe(c: ConversacionDeRevision, vivo: boolean, ahora = Date.now(), activo?: 'computador' | 'modelo' | null): MarcadorDeBanda {
  const real = vivo ? ladoDelTurno(c) : null;
  const lado = activo === undefined || activo === real ? real : null;
  const desde = Date.parse(c.ultimo ?? c.espera?.desde ?? '');
  const corrido = lado && Number.isFinite(desde) ? Math.max(0, ahora - desde) : 0;
  const seg = (ms: number) => Math.floor(ms / 1000);
  return {
    director: seg(c.totales.computadorMs + (lado === 'computador' ? corrido : 0)),
    modelo: seg(c.totales.modeloMs + c.totales.ayudanteMs + (lado === 'modelo' ? corrido : 0)),
    enviados: c.tokens?.enviados ?? 0,
    recibidos: c.tokens?.recibidos ?? 0,
  };
}

/** Los tokens, con los separadores de miles del idioma de la interfaz («1.200», «1,200»), aunque sean solo cuatro cifras. Pura. */
export const conSeparadores = (n: number): string => n.toLocaleString(lenguaje(), { useGrouping: 'always' } as unknown as Intl.NumberFormatOptions);

/**
 * Cuando un turno se completa, las cifras suben a la vista, en DURA_CUENTA, segundo a segundo, desde lo que mostraban
 * hasta lo nuevo (nota de voz del titular nmvy08oe4tit). Lo lleva la página (app.ts › pintarProgreso): sin movimiento, nada
 * de esto corre y las cifras quedan en la final.
 */
export const DURA_CUENTA = 3000;

/**
 * Lo único que se anima de los que hablan es la cara de quien tiene el turno (notas de voz del titular nmvy3m9rjtit y
 * nmvy4it8etit): crece, decrece y se mece, en la banda y en la línea de ahora, y pasa al otro cuando cambia el turno. Esto
 * dura una vuelta en director.css › cara-trabaja. La conversación se repinta con cada consulta: la vuelta sale del reloj,
 * para que cada pintada siga donde iba y no vuelva a empezar. Pura.
 */
export const DURA_CARA = 2400;
export const caraQueTrabaja = (ahora: number): string => ` style="animation-delay:-${Math.round(ahora % DURA_CARA)}ms"`;

/** Una subida de las cifras: de dónde sale, a dónde va y cuándo empezó. */
export interface CuentaDeBanda { desde: MarcadorDeBanda; hasta: MarcadorDeBanda; inicio: number }

/** La cifra en un momento de la subida: empieza y termina suave, y nunca se pasa ni baja. Pura. */
export function cifraAl(desde: number, hasta: number, pasado: number): number {
  if (hasta <= desde || pasado >= DURA_CUENTA) return hasta;
  const u = Math.max(0, pasado) / DURA_CUENTA;
  return Math.floor(desde + (hasta - desde) * (u * u * (3 - 2 * u)));
}

const CLAVES_MARCADOR = ['director', 'modelo', 'enviados', 'recibidos'] as const;

/**
 * Los tokens de cada lado solo suben mientras ese lado está activo (nota nmw5mogqotit): el de entrada es del director y el de
 * salida, del modelo. Suben hacia lo real en lo que dura su actividad, y quietos mientras el otro habla, así que nunca parece
 * que crezcan con su actor en gris. `ahora` es cuándo se calcularon. Pura.
 */
export interface TokensDeBanda { enviados: number; recibidos: number; ahora: number }
const TOKENS_DEL_LADO = { computador: 'enviados', modelo: 'recibidos' } as const;
/** En cuánto cierran la mitad de la distancia que les falta (ms de actividad), y lo más que cuenta un salto entre cálculos. */
const TAU_TOKENS = 1000;
const SALTO_MAX_TOKENS = 200;
export function avanzarTokens(antes: TokensDeBanda | null, objetivo: Pick<MarcadorDeBanda, 'enviados' | 'recibidos'>, activo: 'computador' | 'modelo' | null, ahora: number): TokensDeBanda {
  if (!antes) return { enviados: objetivo.enviados, recibidos: objetivo.recibidos, ahora };
  const dt = Math.min(SALTO_MAX_TOKENS, Math.max(0, ahora - antes.ahora));
  const sube = (clave: 'enviados' | 'recibidos'): number => {
    const va = antes[clave], meta = objetivo[clave];
    if (meta <= va) return meta;
    if (!activo || TOKENS_DEL_LADO[activo] !== clave) return va;
    return Math.min(meta, va + Math.ceil((meta - va) * (1 - Math.exp(-dt / TAU_TOKENS))));
  };
  return { enviados: sube('enviados'), recibidos: sube('recibidos'), ahora };
}
/** Si el lado activo ya llegó a lo real (no hay nada que animar). Pura. */
export const tokensAlDia = (t: TokensDeBanda, objetivo: Pick<MarcadorDeBanda, 'enviados' | 'recibidos'>, activo: 'computador' | 'modelo' | null): boolean =>
  !activo || t[TOKENS_DEL_LADO[activo]] >= objetivo[TOKENS_DEL_LADO[activo]];
/** Pone en la banda los tokens de ese momento. */
export function pintarTokens(raiz: ParentNode, t: TokensDeBanda): void {
  for (const clave of ['enviados', 'recibidos'] as const) for (const el of raiz.querySelectorAll<HTMLElement>(`[data-cuenta="${clave}"]`)) el.textContent = conSeparadores(t[clave]);
}

/** Lo que muestra el marcador en un momento: lo de la subida en curso o, sin ella, lo que hay. Pura. */
function marcadorMostrado(cuenta: CuentaDeBanda | null, m: MarcadorDeBanda, ahora: number): MarcadorDeBanda {
  if (!cuenta) return m;
  return Object.fromEntries(CLAVES_MARCADOR.map((k) => [k, cifraAl(cuenta.desde[k], cuenta.hasta[k], ahora - cuenta.inicio)])) as unknown as MarcadorDeBanda;
}

/**
 * La subida que vale después de pintar: con un turno completado desde la pintada anterior, una nueva, desde lo que se
 * mostraba; sin él, sigue la que iba hasta que termine. Repintar en medio no la reinicia. Pura.
 */
export function cuentaTrasPintar(cuenta: CuentaDeBanda | null, antes: MarcadorDeBanda | null, turnoCompleto: boolean, m: MarcadorDeBanda, ahora: number): CuentaDeBanda | null {
  if (turnoCompleto && antes) return { desde: marcadorMostrado(cuenta, antes, ahora), hasta: m, inicio: ahora };
  return cuenta && ahora - cuenta.inicio < DURA_CUENTA ? cuenta : null;
}

/** Pone en la banda las cifras de ese momento (la que corre la lleva su reloj). Devuelve si la subida sigue. */
export function pintarCuenta(raiz: ParentNode, cuenta: CuentaDeBanda, ahora: number, claves: readonly (keyof MarcadorDeBanda)[] = CLAVES_MARCADOR): boolean {
  const m = marcadorMostrado(cuenta, cuenta.hasta, ahora);
  for (const el of raiz.querySelectorAll<HTMLElement>('[data-cuenta]')) {
    if (!claves.includes(el.dataset.cuenta as keyof MarcadorDeBanda)) continue;
    const v = m[el.dataset.cuenta as keyof MarcadorDeBanda];
    el.textContent = el.classList.contains('banda-tiempo') ? relojDesde(v * 1000) : conSeparadores(v);
  }
  return ahora - cuenta.inicio < DURA_CUENTA;
}

/**
 * La banda de abajo, como un reloj de ajedrez (nmvxxg5wvtit): mitad y mitad, con la cara de cada uno, su tiempo y sus tokens.
 * Quien tiene el turno se resalta, su cara se anima (caraQueTrabaja) y su reloj corre (app.ts › pintarCronometros, cada
 * segundo). Lo demás muestra lo que va en la subida (`cuenta`) o, sin ella, la cifra final. Los tokens, como los dice Claude
 * Code, con sus separadores; si no ha dicho ninguno, la banda lo dice. Pura.
 */
function bandaDeRevision(c: ConversacionDeRevision, vivo: boolean, cuenta: CuentaDeBanda | null, ahora: number, ocultos: ReadonlySet<string> = new Set(), tokensAhora: TokensDeBanda | null = null): string {
  // Quién está activo sale de los globos a la vista, no de cuándo pasó de verdad (nmw5mogqotit)
  const corre = vivo ? ladoDeLosGlobos(c, ocultos) : null;
  const m = marcadorDe(c, vivo, ahora, corre);
  const mostrado = { ...marcadorMostrado(cuenta, m, ahora), ...(tokensAhora ? { enviados: tokensAhora.enviados, recibidos: tokensAhora.recibidos } : {}) };
  const tiempo = (lado: 'computador' | 'modelo', clave: 'director' | 'modelo') => {
    const corriendo = corre === lado;
    return `<b class="banda-tiempo cifra-tiempo${corriendo ? ' corre' : ''}"${corriendo ? ` data-reloj-lado="${m[clave]}" data-reloj-desde="${ahora}"` : ` data-cuenta="${clave}"`}>${esc(relojDesde((corriendo ? m[clave] : mostrado[clave]) * 1000))}</b>`;
  };
  const tokens = (clave: 'enviados' | 'recibidos', nombre: ClaveDeTexto) => (c.tokens
    ? `<small class="banda-tokens" data-titulo="${esc(miles(m[clave]))}"><span class="cifra-tokens" data-cuenta="${clave}">${esc(conSeparadores(mostrado[clave]))}</span> ${esc(t(nombre))}</small>`
    : `<small class="banda-tokens sin-tokens">${esc(t('chat.sinTokens'))}</small>`);
  // Mientras uno tiene el turno, el otro queda en gris y algo transparente, para que resalte quién está activo (nota de voz
  // del titular nmw5h6wg0tit)
  const lado = (actor: 'computador' | 'modelo', mitad: string) => `<div class="banda-lado de-${actor}${corre === actor ? ' tiene-turno' : corre ? ' sin-turno' : ''}"><span class="cara-chat" data-titulo="${esc(t(NOMBRES[actor]))}"${corre === actor ? caraQueTrabaja(ahora) : ''}>${ICONOS[actor]()}</span><div class="banda-cifras">${mitad}</div></div>`;
  return `<div class="banda-reloj" role="group" aria-label="${esc(t('chat.bandaTitulo'))}" data-titulo="${esc(t('chat.bandaTitulo'))}">${lado('computador', `${tiempo('computador', 'director')}${tokens('enviados', 'chat.tokensEnviados')}`)}${lado('modelo', `${tiempo('modelo', 'modelo')}${tokens('recibidos', 'chat.tokensRecibidos')}`)}</div>`;
}

/**
 * La avalancha del contexto, con la historia aprobada (animacion-contexto.md › «4. Las tres propuestas», «La avalancha»,
 * nmvzq49rutit; dónde va, nmw2spfhvtit y nmw2spsestit en avalancha-donde.md) y como la pidió el titular en sus notas de
 * voz del 5 de noviembre de 2026 (nmw3sctymtit, nmw3se32utit, nmw3xxk15tit), que son su regla:
 * - van los personajes de verdad, los de la estación 1 del recorrido (docs/difusion/mundo-3d.js): el director, el cubo
 *   blanco con su visor, va metido dentro de la bola de nieve que crece, y el modelo es su cubo gris azulado con su carita;
 * - la escena se repite sin parar mientras la revisión sigue, nunca se queda quieta, y usa todo el ancho: la bola alcanza
 *   al modelo y lo apachurra; el modelo forcejea debajo y, cuando responde, se la quita de encima y la lanza lejos hacia
 *   atrás, como una pelota que rebota, un poquito más grande cada vez; y la bola vuelve a perseguirlo. No sigue cada
 *   intercambio uno a uno: representa el efecto bola de nieve (la bola mide lo que tu computador le mandó al modelo en la
 *   última llamada, toda la conversación otra vez, en escala logarítmica hasta el pino del límite, un millón de tokens);
 * - el recorrido avanza de izquierda a derecha a medida que el director termina los encargos de su plan, del principio al
 *   fin (sin plan, con lo que crece la conversación);
 * - el fondo es una montaña nevada, alegre y kawaii, con nieve que cae, y la ladera baja apenas de izquierda a derecha,
 *   para que se vea que siempre van cuesta abajo;
 * - al acercarse al límite aparece el pino; cuando la conversación se resume, la bola choca con él y se parte;
 * - lo que vino de la caché es nieve apretada, en el centro de la bola, detrás del director.
 * La vigilan sus pruebas (progresoVivo.test.ts › «la avalancha nunca se queda quieta»): el ciclo infinito, sus cuatro
 * momentos, los dos personajes y el fondo. El ciclo va atado a la hora (--fase), así que al repintar sigue donde iba. Con
 * «reducir el movimiento» queda quieta en su cuadro de persecución; terminada la revisión, la nieve sigue cayendo y el
 * modelo respira junto a la bola, con el tamaño al que llegó. Pura.
 */
export const AVALANCHA = { desde: 1e3, hasta: 1e6, radioMin: 11.7, radioMax: 31.2, pinoDesde: 0.8, trozosMs: 8000, cicloMs: 9000, pendiente: 16 };
export function avalanchaDe(contexto: number): { avance: number; radio: number } {
  const { desde, hasta, radioMin, radioMax } = AVALANCHA;
  const avance = contexto > desde ? Math.min(1, Math.log10(contexto / desde) / Math.log10(hasta / desde)) : 0;
  return { avance, radio: radioMin + (radioMax - radioMin) * avance };
}
/** Cuánto va del recorrido: los encargos hechos del plan de la revisión; sin plan, null (va con la conversación). Pura. */
export function avanceDeTareas(tareas: { hechas: number; total: number } | null | undefined): number | null {
  return tareas && tareas.total > 0 ? Math.max(0, Math.min(1, tareas.hechas / tareas.total)) : null;
}
/**
 * Dónde van los actores del recorrido, y que no se pierda al cerrar y volver a abrir el panel (nota de voz del titular,
 * 6 de noviembre de 2026: volvían a la izquierda y el director quedaba fuera de cuadro al ser arrojado). Se recuerda por
 * revisión y solo sube: el panel cerrado no pinta, y al abrirlo con el plan aún sin traer no empieza de cero.
 */
export interface RecuerdoDeAvance { revision: string; avance: number }
/**
 * Lo recordado tras ver este avance de esta revisión: en otra revisión empieza de nuevo; en la misma, nunca retrocede y,
 * con `ahora`, no avanza mientras la bola está encima del modelo (bolaEncima). Pura.
 */
export function recordarAvance(recuerdo: RecuerdoDeAvance | null, revision: string, avance: number, ahora?: number): RecuerdoDeAvance {
  if (recuerdo?.revision !== revision) return { revision, avance };
  return { revision, avance: ahora !== undefined && bolaEncima(ahora) ? recuerdo.avance : Math.max(recuerdo.avance, avance) };
}
/**
 * Mientras la bola está encima del modelo, de que lo alcanza (27 % del ciclo) a que él la arroja hacia atrás (66 %), el
 * modelo se detiene: no avanza por el recorrido, la montaña no se desliza tras él y no trota; vuelve a caminar después de
 * lanzarla (nota de voz del titular nmw5gj40stit, 6 de noviembre de 2026: seguía avanzando aplastado).
 */
export const BAJO_LA_BOLA = { desde: 0.27, hasta: 0.66 };
/** El punto del ciclo de la escena viva en un momento, de 0 a 1: el mismo que dibuja --fase. Pura. */
const puntoDelCiclo = (ahora: number): number => (((ahora % AVALANCHA.cicloMs) + AVALANCHA.cicloMs) % AVALANCHA.cicloMs) / AVALANCHA.cicloMs;
/** Si en ese momento la bola está encima del modelo. Pura. */
export function bolaEncima(ahora: number): boolean {
  const u = puntoDelCiclo(ahora);
  return u >= BAJO_LA_BOLA.desde && u < BAJO_LA_BOLA.hasta;
}
/** La montaña da su vuelta (un tramo) en cuatro ciclos: un cuarto por ciclo, solo mientras el modelo camina. */
export const VUELTAS_FONDO = 4;
/**
 * Lo que el modelo lleva caminado sobre la montaña en un momento, de 0 a 1 de su tramo (la montaña se desliza eso hacia
 * atrás: director.css › av-fondo, que sigue estos mismos puntos): no cambia mientras la bola está encima. Pura.
 */
export function marchaDelModelo(ahora: number): number {
  const vuelta = VUELTAS_FONDO * AVALANCHA.cicloMs;
  const t = ((ahora % vuelta) + vuelta) % vuelta;
  const ciclo = Math.floor(t / AVALANCHA.cicloMs);
  const u = puntoDelCiclo(t);
  const { desde, hasta } = BAJO_LA_BOLA;
  const camina = u < desde ? u : u < hasta ? desde : desde + (u - hasta);
  return (ciclo + camina / (desde + 1 - hasta)) / VUELTAS_FONDO;
}
/** Dónde van los actores sin contar lo recordado: los encargos hechos; sin plan, con lo que crece la conversación (en reposo, al final). Pura. */
export function avanceDeLaEscena(contexto: number, escena: EscenaDeAvalancha, tareas: { hechas: number; total: number } | null | undefined): number {
  return (escena === 'quieta' ? avanceDeTareas(tareas) ?? 1 : avanceDeTareas(tareas)) ?? avalanchaDe(contexto).avance;
}
export type EscenaDeAvalancha = 'viva' | 'quieta';
/** Qué escena va: mientras alguien tiene el turno, la persecución sin fin; sin turno (la revisión cerró), en reposo. Pura. */
export function escenaDeAvalancha(c: Pick<ConversacionDeRevision, 'espera'>, vivo: boolean): EscenaDeAvalancha {
  return vivo && c.espera ? 'viva' : 'quieta';
}
// Los personajes son las mismas caras del chat (nota de voz del titular nmw46zhl5tit, 5 de noviembre de 2026, que reemplaza
// a los cubos de la estación 1): el director, la de la cara del director, dentro de la bola; el modelo, la suya, que al
// quedar apachurrado aprieta los ojos («> <»). Con la clase cara-chat, toman los mismos colores que en el chat
const DIRECTOR_SVG = `<span class="cara-chat">${caraSVG('feliz')}</span>`;
const MODELO_SVG = `<span class="cara-chat">${caraDelModeloSVG(true)}</span>`;
// La montaña del fondo, dos veces seguidas para que se deslice sin corte: cumbres nevadas, una con su carita, y pinos. El
// corte de cada tramo va en el punto bajo entre dos montañas (nota de voz del titular, 6 de noviembre de 2026): empieza y
// termina en el mismo valle, así que nunca se ve una montaña partida por la mitad
export const PUNTOS_MONTANA = '0,80 0,66 55,34 105,64 165,16 235,70 295,36 355,62 400,66 400,80';
const MONTANA = `<polygon points="${PUNTOS_MONTANA}" fill="#bcd0f2"/><polygon points="44,43 55,34 66,43 60,41 55,45 50,41" fill="#fff"/><polygon points="150,28 165,16 180,28 172,26 165,31 158,26" fill="#fff"/><polygon points="283,45 295,36 307,45 301,43 295,47 289,43" fill="#fff"/><circle cx="160" cy="42" r="1.8" fill="#53638f"/><circle cx="170" cy="42" r="1.8" fill="#53638f"/><path d="M162 47q3 3 6 0" fill="none" stroke="#53638f" stroke-width="1.4" stroke-linecap="round"/><circle cx="156" cy="46" r="2" fill="#f7b3c2"/><circle cx="174" cy="46" r="2" fill="#f7b3c2"/><g fill="#6fb38a"><polygon points="88,80 95,62 102,80"/><polygon points="210,80 218,58 226,80"/><polygon points="330,80 336,66 342,80"/></g>`;
const FONDO_SVG = `<svg viewBox="0 0 800 80" preserveAspectRatio="none">${MONTANA}<g transform="translate(400 0)">${MONTANA}</g></svg>`;
/** El dibujo de la avalancha en un momento: su tamaño, su escena, dónde va del recorrido y, si se parte, desde hace cuánto. Pura. */
function dibujoDeAvalancha(o: { contexto: number; cache: number; llamadas: number; escena: EscenaDeAvalancha; avance: number | null; hacePino: number | null; ahora: number }): string {
  const { avance: crece, radio } = avalanchaDe(o.contexto);
  const avance = o.avance ?? crece;
  const r = Math.round(radio * 10) / 10;
  const cache = Math.max(0, Math.min(1, o.cache));
  // Lo lejos que la lanza hacia atrás (una parte del ancho; al principio, hasta salirse por la izquierda y volver
  // rodando) y lo que sube por la ladera al ir hacia atrás
  const atras = Math.max(0.22, Math.min(0.42, avance));
  const sube = Math.round(atras * AVALANCHA.pendiente * 10) / 10;
  const estilo = `--avance:${avance.toFixed(3)};--radio:${r}px;--apretada:${Math.round(Math.sqrt(cache) * 100)}%;--atras:${Math.round(atras * 100)};--sube:-${sube}px;--pendiente:${AVALANCHA.pendiente}px;--ciclo:${AVALANCHA.cicloMs}ms;--fase:-${Math.round(((o.ahora % AVALANCHA.cicloMs) + AVALANCHA.cicloMs) % AVALANCHA.cicloMs)}ms;--fase-fondo:-${Math.round(((o.ahora % (VUELTAS_FONDO * AVALANCHA.cicloMs)) + VUELTAS_FONDO * AVALANCHA.cicloMs) % (VUELTAS_FONDO * AVALANCHA.cicloMs))}ms`;
  const partiendo = o.hacePino !== null;
  const pino = crece >= AVALANCHA.pinoDesde || partiendo
    ? `<span class="avalancha-pino" aria-hidden="true"></span>${partiendo ? `<span class="avalancha-trozos" style="--hace:-${Math.round(o.hacePino!)}ms" aria-hidden="true"><i></i><i></i><i></i></span>` : ''}`
    : '';
  const dicho = esc(t('chat.avalancha', { n: conSeparadores(o.contexto), cache: Math.round(cache * 100), llamadas: o.llamadas }));
  return `<div class="avalancha escena-${o.escena}" role="img" aria-label="${dicho}" data-titulo="${dicho}" style="${estilo}"><span class="avalancha-fondo" aria-hidden="true">${FONDO_SVG}</span><span class="avalancha-copos" aria-hidden="true"></span><span class="avalancha-ladera" aria-hidden="true"></span>${pino}<span class="avalancha-grupo"><span class="avalancha-modelo" aria-hidden="true">${MODELO_SVG}</span><span class="avalancha-esfuerzo" aria-hidden="true"><i></i><i></i></span><span class="avalancha-golpe" aria-hidden="true"></span><span class="avalancha-bola" aria-hidden="true"><i class="avalancha-nieve"></i><i class="avalancha-apretada"></i><span class="avalancha-director">${DIRECTOR_SVG}</span></span></span></div>`;
}

/**
 * La repetición de la avalancha, con la revisión ya cerrada (el titular no la alcanzó a ver mientras trabajaba el director,
 * nmw3r7c5atit; pedido pd_animacion_contexto): la misma escena sin fin de la revisión en vivo (nmw3xxk15tit), mientras el
 * recorrido va del principio al fin y la bola crece de a poco hasta el tamaño al que llegó (el registro guarda solo el de
 * la última llamada: lo de en medio sigue la misma escala logarítmica). Sus cuadros salen de los tiempos guardados de
 * cada turno de la conversación principal (turnos seguidos del mismo lado, juntos), y se parte en el del último resumen.
 * Va más rápida que la revisión: cada cuadro, en proporción a lo que tardó, entre minMs y maxMs, y toda en totalMs como
 * mucho. Pura.
 */
export const REPETICION = { cuadros: 24, minMs: 700, maxMs: 2400, totalMs: 27_000 };
export interface CuadroDeAvalancha { contexto: number; avance: number; ms: number; partiendo: boolean }
export function repeticionDeAvalancha(c: Pick<ConversacionDeRevision, 'turnos' | 'nieve'>): CuadroDeAvalancha[] {
  const nieve = c.nieve;
  if (!nieve) return [];
  // Los tramos: turnos seguidos del mismo lado, juntos, con lo que tardaron y cuándo empezó el primero
  const tramos: { de: 'modelo' | 'computador'; ms: number; cuando: number }[] = [];
  for (const x of c.turnos) {
    if (x.tardoMs === null || (x.de !== 'modelo' && x.de !== 'computador')) continue;
    const ultimo = tramos.at(-1);
    if (ultimo?.de === x.de) ultimo.ms += x.tardoMs;
    else tramos.push({ de: x.de, ms: x.tardoMs, cuando: x.cuando ? Date.parse(x.cuando) : NaN });
  }
  if (tramos.length < 2) return [];
  // Con muchos, uno de cada tantos, parejos y siempre con el último
  const n = Math.min(REPETICION.cuadros, tramos.length);
  const elegidos = Array.from({ length: n }, (_, i) => tramos[Math.round((i * (tramos.length - 1)) / Math.max(1, n - 1))]);
  const suma = elegidos.reduce((s, x) => s + x.ms, 0) || 1;
  const escala = REPETICION.totalMs / suma;
  const resumen = nieve.resumenes > 0 && nieve.ultimoResumen ? Date.parse(nieve.ultimoResumen) : NaN;
  const partido = Number.isFinite(resumen) ? elegidos.findIndex((x) => Number.isFinite(x.cuando) && x.cuando >= resumen) : -1;
  const { desde } = AVALANCHA;
  const final = Math.max(desde, nieve.contexto);
  return elegidos.map((x, i) => ({
    contexto: Math.round(desde * (final / desde) ** ((i + 1) / n)),
    avance: Math.round(((i + 1) / n) * 1000) / 1000,
    ms: Math.round(Math.max(REPETICION.minMs, Math.min(REPETICION.maxMs, x.ms * escala))),
    partiendo: i === partido,
  }));
}

/** El cuadro de la repetición en un momento, desde hace cuánto va y cuánto le queda; null si ya terminó. Pura. */
export function cuadroDeRepeticion(cuadros: readonly CuadroDeAvalancha[], pasado: number): { cuadro: CuadroDeAvalancha; hace: number; queda: number } | null {
  let t0 = 0;
  for (const cuadro of cuadros) {
    if (pasado < t0 + cuadro.ms) return { cuadro, hace: Math.max(0, pasado - t0), queda: t0 + cuadro.ms - pasado };
    t0 += cuadro.ms;
  }
  return null;
}

/** El dibujo de un cuadro de la repetición, con la caché y las llamadas de la revisión: la escena viva. Pura. */
export function cuadroDeAvalanchaHtml(cuadro: CuadroDeAvalancha, nieve: Pick<NonNullable<ConversacionDeRevision['nieve']>, 'cache' | 'llamadas'>, hace: number, ahora = Date.now()): string {
  return dibujoDeAvalancha({ contexto: cuadro.contexto, cache: nieve.cache, llamadas: nieve.llamadas, escena: 'viva', avance: cuadro.avance, hacePino: cuadro.partiendo ? hace : null, ahora });
}

/** Lo que va de una repetición en curso: el cuadro de ahora y desde hace cuánto (app.ts › repeticionAvalancha). */
export type RepeticionEnCurso = { cuadro: CuadroDeAvalancha; hace: number } | null;

/** `tareas`: los encargos hechos del plan de la revisión, que mueven el recorrido (app.ts › planVivo). */
export function avalanchaHtml(c: ConversacionDeRevision, vivo = true, ahora = Date.now(), repeticion: RepeticionEnCurso = null, tareas: { hechas: number; total: number } | null = null, recuerdo: RecuerdoDeAvance | null = null): string {
  const nieve = c.nieve;
  if (!nieve) return '';
  const escena = escenaDeAvalancha(c, vivo);
  const resumen = nieve.ultimoResumen ? Date.parse(nieve.ultimoResumen) : NaN;
  const hacePino = Number.isFinite(resumen) ? ahora - resumen : Infinity;
  const partiendo = vivo && hacePino >= 0 && hacePino < AVALANCHA.trozosMs;
  // Sin nadie con el turno (la revisión cerró, o es una pasada), «↻ Repetir la avalancha» la vuelve a mostrar con sus tiempos
  const cuadros = escena === 'quieta' ? repeticionDeAvalancha(c) : [];
  const repetir = cuadros.length
    ? `<button type="button" class="enlace avalancha-repetir" data-repetir-avalancha="${esc(JSON.stringify({ cuadros, cache: nieve.cache, llamadas: nieve.llamadas }))}"${repeticion ? ' data-repitiendo' : ''} data-titulo="${esc(t('chat.repetirAvalanchaTitulo'))}">${esc(t('chat.repetirAvalancha'))}</button>`
    : '';
  const dibujo = repeticion && cuadros.length
    ? cuadroDeAvalanchaHtml(repeticion.cuadro, nieve, repeticion.hace, ahora)
    : dibujoDeAvalancha({ contexto: nieve.contexto, cache: nieve.cache, llamadas: nieve.llamadas, escena, avance: escena === 'viva' && recuerdo && bolaEncima(ahora) ? recuerdo.avance : Math.max(avanceDeLaEscena(nieve.contexto, escena, tareas), recuerdo?.avance ?? 0), hacePino: partiendo ? hacePino : null, ahora });
  return `${dibujo}${repetir}`;
}

/**
 * La conversación de una revisión: quién tiene el turno, con su cronómetro; los globos, lo más nuevo arriba; y abajo, la
 * banda de los relojes. `abiertos`: lo que la persona abrió, que sigue abierto al repintar. `vivo`: si la revisión sigue (en
 * el historial nadie corre). `cuenta`: la subida de las cifras, si un turno se acaba de completar. `nuevos`, `ocultos` y
 * `naceHace`: el globo que nace ahora y los que esperan su turno (revelarGlobos); la banda sigue al lado del último globo a la vista (ladoDeLosGlobos). El
 * cronómetro lo mueve la página cada segundo (app.ts › pintarCronometros). Pura.
 */
export function chatDeRevision(c: ConversacionDeRevision, abiertos: ReadonlySet<string> = new Set(), { vivo = true, cuenta = null, nuevos = new Set<string>(), ocultos = new Set<string>(), naceHace = 0, ahora = Date.now(), repeticion = null, tareas = null, recuerdo = null, tokens: tokensAhora = null }: { vivo?: boolean; cuenta?: CuentaDeBanda | null; nuevos?: ReadonlySet<string>; ocultos?: ReadonlySet<string>; naceHace?: number; ahora?: number; repeticion?: RepeticionEnCurso; tareas?: { hechas: number; total: number } | null; recuerdo?: RecuerdoDeAvance | null; tokens?: TokensDeBanda | null } = {}): string {
  const e = vivo && c.espera && !ocultos.has(claveDeEspera(c.espera)) ? c.espera : null;
  const espera = e ? `<li class="turno esperando de-${e.quien}${nuevos.has(claveDeEspera(e)) ? ' nace' : ''}"${nuevos.has(claveDeEspera(e)) ? restoDeLaAnimacion(naceHace) : ''}><span class="turno-icono cara-chat"${caraQueTrabaja(ahora)}>${ICONOS[e.quien]()}</span><div class="globo sin-detalle"><div class="globo-linea"><span class="globo-frase">${esc(t(e.quien === 'modelo' ? 'chat.esperaModelo' : e.quien === 'ayudante' ? 'chat.esperaAyudante' : 'chat.esperaComputador', { detalle: e.detalle ?? '' }))} <b class="cronometro" data-crono="${esc(e.desde)}">${esc(relojDesde(Date.now() - Date.parse(e.desde)))}</b></span></div></div></li>` : '';
  const viejos = c.omitidos ? `<li class="como turnos-omitidos">${esc(t('chat.omitidos', { n: c.omitidos }))}</li>` : '';
  const globos = globosDeTurnos(c.turnos).filter((g) => !ocultos.has(g[0].id)).reverse().map((g) => (g.length > 1 ? loteHtml(g, c, abiertos, nuevos, naceHace) : turnoHtml(g[0], c, abiertos, ACORDEON, nuevos, naceHace)));
  // Oculto mientras la lectura siga en la punta (app.ts › marcarPunta); en el historial no hay punta que seguir
  const volver = vivo ? `<li class="punta-chat"><button type="button" class="boton-suave ir-a-la-punta" data-ir-a-la-punta hidden>↑ ${esc(t('chat.irALaPunta'))}</button></li>` : '';
  return `<ol class="pasos-progreso chat-revision">${volver}${espera}${globos.join('')}${viejos}</ol>${avalanchaHtml(c, vivo, ahora, repeticion, tareas, recuerdo)}${bandaDeRevision(c, vivo, cuenta, ahora, ocultos, tokensAhora)}${resumenDeCache(c)}`;
}
