// La grabadora de notas de voz del Director: graba con el micrófono del equipo (MediaRecorder), deja oír lo grabado y
// lo entrega como data URL para subirlo al servidor local (a la memoria del proyecto, director/notas/). Nada sale del
// equipo: la transcripción se hace en local (tools/director/transcribir.py).
//
// Que nunca haya dudas de si está grabando: antes de grabar dice que todavía no graba (y espera el permiso del
// micrófono sin aparentar que ya graba); mientras graba, un punto rojo que late, el tiempo y un medidor que se mueve con
// la voz. Dentro de un diálogo, el diálogo se hace a un lado y queda solo esa pastilla, con «Detener y revisar» y
// «Enviar ya»: la página se puede leer y recorrer mientras se habla, y la pastilla queda siempre encima, también si el
// diálogo se abrió desde otro diálogo o si después se abre otro. Los diálogos que graban ignoran su evento «close» si
// siguen abiertos: es este cambio, no un cierre.
//
// A uno se le olvida decir algo: después de detener, «Añadir otro fragmento» sigue grabando en el mismo audio. Para que
// quede un solo archivo válido, se graba lo que llega a un destino de audio propio (no el micrófono directo): al detener,
// la grabación se pausa y el micrófono se suelta; al añadir, se pide otra vez y se reanuda. Se cierra al enviar.
//
// Nada grabado se pierde en silencio y el micrófono nunca queda encendido: el diálogo que graba no se rehace mientras
// sigue abierto (antesDeOtroSobre) ni se cierra con un clic fuera mientras tenga un audio sin enviar
// (antesDeCerrarConClicFuera), y la grabadora que se deja de usar apaga cada pista del micrófono, también la de un
// permiso que llega tarde.
//
// Y no se pueden grabar silencios (propuesta aceptada pr_grabadora_muda; se perdieron dos notas así; notas de voz del
// titular nmvxzokddtit, nmvxzs8vptit y nmvy4m3xatit, 1 de noviembre de 2026): se mira solo al empezar a grabar, para saber si
// el micrófono entrega algo. Sin sonido en los primeros 8 segundos de la grabación, se detiene sola, lo vacío se descarta, se
// dice que mire su micrófono (en la grabadora y en un aviso) y queda lista para grabar otra vez, tantas veces como haga
// falta. Las pausas no cuentan: la grabación que ya pasó ese momento se conserva entera, se calle lo que se calle. Solo un
// fragmento añadido sin sonido no queda, y lo de antes sigue. Lo decide el código (destinoDelFragmento y lo que sigue), sin
// tocar la transcripción.
import { grabando, sonar } from './sonidos';
import { t } from './textos';

/** El aviso de la página al empezar a grabar (o a seguir grabando): la lectura sola y la voz se detienen. */
export const EMPIEZA_GRABACION = 'estudio:grabando';
/** El aviso de la página cuando la grabadora descarta una grabación muda: lo muestra arriba de todo (app.ts › avisar). */
export const GRABACION_MUDA = 'estudio:grabacion-muda';

const TIPOS = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
const MAX_SEGUNDOS = 10 * 60;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Un cambio de un atributo, como lo anota un MutationObserver (oldValue null: no estaba, se acaba de poner). */
type Cambio = Pick<MutationRecord, 'target' | 'attributeName' | 'oldValue'>;

/**
 * Los diálogos abiertos, en el orden en que se abrieron, al día con lo que cambió: el que se abre (también si se cerró y
 * se volvió a abrir) pasa al final, que es lo de arriba de la capa superior del navegador, y sale el que se cerró o ya
 * no está en la página. Un <details> también tiene open: no cuenta.
 */
export function ordenDeApertura(antes: readonly HTMLDialogElement[], cambios: Iterable<Cambio>): HTMLDialogElement[] {
  const orden = [...antes];
  for (const c of cambios) {
    const d = c.target as HTMLDialogElement;
    if (c.attributeName !== 'open' || c.oldValue !== null || d.nodeName !== 'DIALOG') continue;
    const i = orden.indexOf(d);
    if (i >= 0) orden.splice(i, 1);
    orden.push(d);
  }
  return orden.filter((d) => d.open && d.isConnected);
}

/**
 * El diálogo modal donde tiene que ir la pastilla del que graba a un lado, o null si no hay otro modal abierto. Un
 * diálogo modal tapa todo lo que no está dentro de él y lo deja sin clics, aunque tenga más z-index: la pastilla va
 * dentro del de arriba, que es el último que se abrió y no siempre el último de la página (el ✉ es de los primeros y se
 * abre encima de «¿Dónde quedamos?»). `abiertos`, en el orden en que se abrieron; un modal que no está ahí (se abrió
 * antes de empezar a mirar) cuenta como más viejo, en el orden de la página. Nunca el que graba ni uno que lleve dentro.
 * Sin diálogo que grabe (null), el de arriba de todos: ahí va también el director flotante (encima.ts).
 */
export function modalDeArriba(dlg: HTMLDialogElement | null, dialogos: ArrayLike<HTMLDialogElement>, abiertos: readonly HTMLDialogElement[] = []): HTMLDialogElement | null {
  const modales = Array.from(dialogos).filter((d) => (!dlg || (d !== dlg && !dlg.contains(d))) && d.matches(':modal'));
  return [...modales.filter((d) => !abiertos.includes(d)), ...abiertos.filter((d) => modales.includes(d))].at(-1) ?? null;
}

/** Los diálogos de la página, en el orden en que se abrieron. */
let abiertos: HTMLDialogElement[] = [];
/** Los diálogos que graban a un lado y su lugar, para devolverlos cuando se llevan dentro de otro. */
const apartados = new Map<HTMLDialogElement, { padre: Node; siguiente: Node | null }>();

/** Los clics de la pastilla no le llegan al diálogo que la lleva dentro (podría tomarlos como suyos). */
function aislar(e: Event) {
  if ((e.currentTarget as HTMLElement).parentElement?.closest('dialog')) e.stopPropagation();
}

/** Devuelve a su lugar el diálogo que se llevó dentro de otro (o nada, si no se llevó). */
function devolver(dlg: HTMLDialogElement) {
  const l = apartados.get(dlg);
  if (l && dlg.parentNode !== l.padre) l.padre.insertBefore(dlg, l.siguiente?.parentNode === l.padre ? l.siguiente : null);
}

/** El diálogo deja de estar a un lado; si ya ninguno graba, deja de mirarse lo que entra y sale de la página. */
function dejar(dlg: HTMLDialogElement) {
  apartados.delete(dlg);
  dlg.removeEventListener('click', aislar);
  if (!apartados.size) mirar(false);
}

/**
 * Pone la pastilla de cada diálogo que graba a un lado encima de todo y con sus botones vivos (notas del titular del 21
 * y del 22 de octubre de 2026): dentro del diálogo modal de arriba, si hay uno abierto, o en su lugar. Corre cada vez
 * que un diálogo se abre o se cierra, sin importar cuándo ni desde dónde (también el que se abre después de empezar a
 * grabar, y si ese se cierra, la pastilla pasa al que quede debajo), y cada vez que algo entra o sale de la página
 * mientras se graba: un diálogo que se quita o que se vuelve a pintar entero se llevaría la pastilla consigo.
 */
function ubicar() {
  if (!apartados.size) return;
  const dialogos = document.querySelectorAll('dialog');
  for (const dlg of [...apartados.keys()]) {
    // Lo cerró quien lo abrió, no la grabadora (que lo vuelve a abrir en el acto): ya no está a un lado
    if (!dlg.open) {
      if (dlg.parentNode) devolver(dlg);
      dlg.classList.remove('a-un-lado');
      dejar(dlg);
      continue;
    }
    const arriba = modalDeArriba(dlg, dialogos, abiertos);
    if (!arriba) devolver(dlg);
    else if (!arriba.contains(dlg)) arriba.append(dlg);
  }
}

/**
 * Un solo mecanismo para toda la página, en vez de un parche en cada showModal: mira cuándo se abre o se cierra cada
 * diálogo (su atributo open, para saber cuál quedó arriba) y, mientras alguno graba a un lado, lo que entra o sale de
 * ella. Fuera del navegador (en las pruebas) no hay nada que mirar.
 */
const observador = typeof MutationObserver === 'undefined' ? null : new MutationObserver((cambios) => {
  abiertos = ordenDeApertura(abiertos, cambios);
  ubicar();
});
function mirar(conLoQueEntraYSale: boolean) {
  observador?.observe(document.documentElement, { subtree: true, childList: conLoQueEntraYSale, attributeFilter: ['open'], attributeOldValue: true });
}
mirar(false);

/**
 * Esc cierra el diálogo de arriba aunque lleve la pastilla dentro, y nunca la grabación. Cada vez que el diálogo que
 * graba se abre a un lado o se lleva a otro lugar, el navegador lo anota de nuevo en lo que cierra Esc (sus close
 * watchers) y puede quedar el último: como no es modal, Esc no lo cierra, pero tampoco sigue con el de arriba. Si el
 * navegador no le pidió cerrarse al de arriba (su «cancel»), se le pide como lo haría él, igual que con un clic fuera
 * (modal.ts › cerrarConClicFuera).
 */
if (typeof document !== 'undefined') document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || e.isComposing || !apartados.size) return;
  const [dlg] = apartados.keys();
  const arriba = modalDeArriba(dlg, document.querySelectorAll('dialog'), abiertos);
  if (!arriba) return;
  let pidio = false;
  const vio = () => (pidio = true);
  arriba.addEventListener('cancel', vio, { capture: true, once: true });
  // Después de lo que hace el navegador con la tecla, que va justo tras este evento
  setTimeout(() => {
    arriba.removeEventListener('cancel', vio, { capture: true });
    if (!pidio && !e.defaultPrevented && arriba.open && arriba.dispatchEvent(new Event('cancel', { cancelable: true }))) arriba.close();
  });
}, true);

/**
 * Las grabadoras que no se hacen a un lado: lo que se lee mientras se graba tiene que seguir a la vista (la frase de la prueba
 * del micrófono, en el asistente de instalación).
 */
const enSuLugar = new WeakSet<HTMLElement>();

/**
 * Hace a un lado el diálogo (no modal, solo la pastilla de la grabación) o lo devuelve al frente (modal otra vez, en su
 * lugar). A un lado, su pastilla queda siempre encima de todo y con sus botones vivos: si hay un diálogo modal abierto,
 * debajo o encima, va dentro del de arriba (ubicar).
 */
function aUnLado(caja: HTMLElement, si: boolean) {
  if (enSuLugar.has(caja)) return;
  const dlg = caja.closest('dialog');
  if (!dlg || !dlg.open || dlg.classList.contains('a-un-lado') === si) return;
  dlg.classList.toggle('a-un-lado', si);
  dlg.close();
  if (si) {
    apartados.set(dlg, { padre: dlg.parentNode!, siguiente: dlg.nextSibling });
    dlg.addEventListener('click', aislar);
    mirar(true);
    dlg.show();
    ubicar();
  } else {
    devolver(dlg);
    dejar(dlg);
    dlg.showModal();
  }
  caja.querySelector<HTMLElement>('[data-g]')?.focus();
}

/**
 * Al cerrarse la grabación, si su diálogo vuelve al frente (nota de voz del titular nmvvki7gktit, 30 de octubre de 2026):
 * con «Enviar ya», algo grabado y un formulario que lo envíe, no: se envía a un lado, sin volver a mostrar el diálogo, y
 * vuelve solo si el envío no sigue (alFrente). Con «Detener y revisar», o sin nada que enviar, sí: para revisarlo, añadir
 * algo o adjuntar.
 */
export function vuelveAlFrente(s: { enviarYa: boolean; conAudio: boolean; enFormulario: boolean }): boolean {
  return !(s.enviarYa && s.conAudio && s.enFormulario);
}

/** Lo que tiene la grabadora de un diálogo: nada, una grabación en curso o un audio grabado que todavía no se envía. */
export type EstadoGrabacion = 'sin_audio' | 'grabando' | 'audio_listo';

/**
 * Si se puede rehacer un diálogo para abrir otro ✉ en él (el que le escribe al director es uno solo y se rehace cada vez
 * que se abre: app.ts › pedir). Cerrado, sí: null. Abierto, nunca: rehacerlo borraba lo que se estaba grabando y
 * dejaba el micrófono encendido (nota de voz del titular del 22 de octubre de 2026). Desde la página solo se llega a
 * otro ✉ mientras graba a un lado (si no, es modal y lo demás no tiene clics). Queda como está, y la frase que devuelve
 * le dice a la persona qué pasó y qué hacer.
 */
export function antesDeOtroSobre(abierto: boolean, estado: EstadoGrabacion): string | null {
  if (!abierto) return null;
  if (estado === 'grabando') return t('grabadora.ocupadaGrabando');
  return t(estado === 'audio_listo' ? 'grabadora.ocupadaAudio' : 'grabadora.ocupadaAbierto');
}

/**
 * Si un clic fuera, en el fondo, puede cerrar el diálogo de una grabadora (modal.ts › cerrarConClicFuera, que solo mira
 * lo escrito): sin audio, sí (null). Con un audio grabado sin enviar, no: se perdería sin aviso, y ese es el clic de quien
 * detuvo la grabación («Detener y revisar») y busca otro ✉ en la página. La frase dice qué pasó y qué hacer.
 */
export function antesDeCerrarConClicFuera(estado: EstadoGrabacion): string | null {
  return estado === 'sin_audio' ? null : t('grabadora.noCerrar');
}

/**
 * Una grabación a la vez (nota del titular, 22 de octubre de 2026: una en «Preguntas» y otra en un ✉ corrían juntas y se
 * encimaban). Si otra grabadora ya graba, o espera el permiso del micrófono, esta no empieza, y la frase dice qué hacer.
 * null: puede grabar.
 */
export function antesDeGrabar(otraGrabando: boolean): string | null {
  return otraGrabando ? t('grabadora.otra') : null;
}

/**
 * Lo que se dijo al corregir una nota, sumado al final de lo que ya decía, en un párrafo aparte (nota de voz del titular
 * nmvonrzz6tit, 25 de octubre de 2026: «que me permitas agregar a la nota, cuando se abre para corregirse, también usando
 * audio»). Sin nada antes, queda solo lo dicho. Pura.
 */
export function sumarDictado(antes: string, dicho: string): string {
  const nuevo = dicho.trim();
  if (!nuevo) return antes;
  return antes.trim() ? `${antes.trimEnd()}\n\n${nuevo}` : nuevo;
}

/** Lo que la persona marcó en un campo del diálogo «Corregir la nota» (su selección), para reemplazarlo con lo dicho. */
export interface Marca { campo: 'texto' | 'dicho' | 'despues'; inicio: number; fin: number }

/**
 * Lo marcado, reemplazado por lo que se dijo (pedido pd_tipo_voz, nota de voz del titular nmvjw1oybtit: «que lo dictado
 * reemplace lo que marques»), con un espacio a cada lado si hace falta para no pegar las palabras. Pura.
 */
export function reemplazarMarcado(antes: string, inicio: number, fin: number, dicho: string): string {
  const nuevo = dicho.trim();
  if (!nuevo) return antes;
  const izq = antes.slice(0, inicio);
  const der = antes.slice(fin);
  const espacioAntes = izq && !/\s$/.test(izq) ? ' ' : '';
  const espacioDespues = der && !/^[\s.,;:!?)»]/.test(der) ? ' ' : '';
  return `${izq}${espacioAntes}${nuevo}${espacioDespues}${der}`;
}

/**
 * La selección que vale de los campos de la nota: la del último que tocaste, si marcaste algo en él; si no, la del otro.
 * Sin nada marcado (solo el cursor), ninguna: lo dicho se suma, como siempre. Pura.
 */
export function marcaDeCampos(campos: { campo: Marca['campo']; inicio: number; fin: number }[], ultimo?: Marca['campo'] | null): Marca | null {
  const marcados = campos.filter((c) => c.fin > c.inicio);
  return marcados.find((c) => c.campo === ultimo) ?? marcados[0] ?? null;
}

/**
 * Dónde queda lo que se dijo al corregir una nota (nota de voz del titular nmvpmv30ytit, 26 de octubre de 2026: borró lo
 * que se entendió de su audio para decir otra cosa hablando, lo dicho se sumó a su nota escrita y el Studio lo rechazó
 * porque la transcripción quedaba vacía). Si vació lo que se entendió de su audio, lo dicho lo reemplaza: borró para
 * decir otra cosa ahí. Si no, se suma al final de su nota escrita o, si solo es de voz, de lo que se entendió de ella.
 * `texto` y `dicho` son los campos del diálogo (undefined: no está). Pura.
 */
export function repartirDictado(campos: { texto?: string; dicho?: string; despues?: string }, sumado: string, marca?: Marca | null): { texto?: string; dicho?: string; despues?: string } {
  const { texto, dicho, despues } = campos;
  // Lo que marcaste en uno de los dos campos, lo reemplaza lo dicho (pedido pd_tipo_voz)
  const antes = marca ? campos[marca.campo] : undefined;
  if (marca && antes !== undefined && marca.fin > marca.inicio && marca.fin <= antes.length && sumado.trim()) return { ...campos, [marca.campo]: reemplazarMarcado(antes, marca.inicio, marca.fin, sumado) };
  if (dicho !== undefined && !dicho.trim()) return { texto, dicho: sumado.trim(), despues };
  // Lo que se le suma a una nota con audio va después de él, aunque su audio aún no se haya transcrito (Nota › despues)
  if (despues !== undefined) return { texto, dicho, despues: sumarDictado(despues, sumado) };
  if (texto !== undefined) return { texto: sumarDictado(texto, sumado), dicho };
  return { texto, dicho: sumarDictado(dicho ?? '', sumado) };
}

/**
 * Desde qué nivel (RMS, de 0 a 1) puede haber sonido: unos -66 dB. Por debajo no hay nada. Se mide en coma flotante: con
 * bytes, todo lo que queda por debajo de 1/128 se lee como cero, y un micrófono bajo parecería mudo.
 */
const UMBRAL_DE_SONIDO = 0.0005;
/**
 * Un ruido parejo no es sonido (nota de voz del titular nmvy2xvyxtit, 1 de noviembre de 2026: con el micrófono silenciado
 * pasaron más de 10 segundos sin aviso; lo probable es que su ruido constante supere el umbral fijo, y sus números reales
 * los deja la bitácora, reportarNiveles). Cuenta lo que sube sobre el piso de lo que llega, al doble (6 dB): la voz, por
 * baja que sea, sube; el piso de un micrófono silenciado, no.
 */
const SUBIDA_SOBRE_EL_PISO = 2;
/** Desde aquí (unos -34 dB) es sonido aunque sea parejo: ningún micrófono silenciado entrega tanto, y una voz sí. */
const NIVEL_QUE_SIEMPRE_SUENA = 0.02;
/** Cuántas muestras hacen falta para saber el piso: unos 2 segundos. Con menos, lo dicho no se arriesga: cuenta el umbral. */
const MUESTRAS_PARA_EL_PISO = 8;
/**
 * Sin sonido en estos primeros segundos de una grabación, se detiene sola y lo vacío se descarta: el titular dijo de 5 a 10
 * (nmvy4m3xatit). En su prueba del 1 de noviembre, con el micrófono silenciado, llegó un solo golpe (pico 0,0035) y nada más;
 * en sus grabaciones con voz, el pico fue de 0,22 a 0,43: los umbrales de abajo los separan de sobra (bitácora de ese día).
 */
const SEGUNDOS_SIN_SONIDO = 8;
/** Las muestras de esos segundos, con una cada 250 ms: desde ahí, lo oído ya no se cuenta de nuevo con otro piso. */
const MUESTRAS_PARA_DECIDIR = SEGUNDOS_SIN_SONIDO * 4;
/**
 * Una muestra suelta con sonido no es sonido: el golpe al apretar un botón o el micrófono al abrirse. Con «ninguna», una
 * sola de esas dejaba pasar toda una grabación muda.
 */
const MUESTRAS_SUELTAS = 1;
/**
 * En una grabación larga, hasta esta parte de las muestras con sonido sigue siendo casi silencio total (unos golpes en la
 * mesa no lo cambian), pero solo si no llegan a un segundo: lo dicho, por corto que sea, nunca se bota.
 */
const PARTE_CASI_SILENCIO = 0.01;
const MUESTRAS_DE_UN_RUIDO = 3;

/**
 * Lo que oyó la grabadora: cuántas muestras tomó, cuántas traían sonido, y el piso y el pico de lo que llegó. Mientras no
 * se ha oído nada firme, guarda los niveles (`niveles`) para contarlos otra vez con el piso que se va sabiendo: lo dicho al
 * principio cuenta aunque el piso se sepa después. Una vez firme (`firme`, ya se oyó sonido en los segundos que deciden), el
 * piso queda fijo: un ruido que empieza después no borra lo dicho.
 */
export interface Oido { muestras: number; conSonido: number; piso: number; pico: number; niveles: readonly number[]; firme: boolean }
export const OIDO_VACIO: Oido = { muestras: 0, conSonido: 0, piso: 0, pico: 0, niveles: [], firme: false };

/** El nivel de una muestra (la raíz de la media de los cuadrados), de 0 a 1. Pura. */
export function nivelDeMuestra(datos: ArrayLike<number>): number {
  if (!datos.length) return 0;
  let suma = 0;
  for (let i = 0; i < datos.length; i++) suma += datos[i] ** 2;
  return Math.sqrt(suma / datos.length);
}

/**
 * El piso de lo que llega: lo más bajo, sin las primeras muestras en cero o casi del micrófono al abrirse (el décimo
 * inferior queda fuera). Sin muestras suficientes, cero. Pura.
 */
export function pisoDeNiveles(niveles: readonly number[]): number {
  if (niveles.length < MUESTRAS_PARA_EL_PISO) return 0;
  return [...niveles].sort((a, b) => a - b)[Math.ceil(niveles.length * 0.1)];
}

/** Desde qué nivel una muestra trae sonido, con ese piso. Pura. */
const umbralSobre = (piso: number) => Math.min(NIVEL_QUE_SIEMPRE_SUENA, Math.max(UMBRAL_DE_SONIDO, piso * SUBIDA_SOBRE_EL_PISO));

/** Lo oído, con una muestra más. Pura. */
export function oirMuestra(o: Oido, nivel: number): Oido {
  const muestras = o.muestras + 1;
  const pico = Math.max(o.pico, nivel);
  if (o.firme) return { ...o, muestras, pico, conSonido: o.conSonido + (nivel >= umbralSobre(o.piso) ? 1 : 0) };
  const niveles = [...o.niveles, nivel];
  const piso = pisoDeNiveles(niveles);
  const umbral = umbralSobre(piso);
  const conSonido = niveles.filter((x) => x >= umbral).length;
  const firme = muestras >= MUESTRAS_PARA_DECIDIR && conSonido > MUESTRAS_SUELTAS;
  return { muestras, conSonido, piso, pico, firme, niveles: firme ? [] : niveles };
}

/** Lo oído en dos partes, junto: cuántas muestras y con cuánto sonido. Pura. */
export const sumarOido = (a: Oido, b: Oido): Oido => ({ ...OIDO_VACIO, muestras: a.muestras + b.muestras, conSonido: a.conSonido + b.conSonido, pico: Math.max(a.pico, b.pico) });

/** Una pista que el navegador dice silenciada no entrega nada, llegue lo que llegue. Pura. */
export const nivelDePista = (nivel: number, silenciada: boolean): number => (silenciada ? 0 : nivel);

/**
 * Mientras graba: es el comienzo de la grabación (nada guardado antes, `antes`), pasaron sus primeros segundos y no ha
 * llegado sonido. Se detiene ahí. Un fragmento añadido nunca se detiene: la persona ya mostró que su micrófono oye. Pura.
 */
export const microfonoSinSonido = (o: Oido, segundos: number, antes: Oido = OIDO_VACIO): boolean => !antes.muestras && segundos >= SEGUNDOS_SIN_SONIDO && o.muestras > 0 && o.conSonido <= MUESTRAS_SUELTAS;

/** Al terminar un fragmento añadido: lo grabado no trae sonido, o quedó casi en silencio total. Pura. */
export const grabacionCallada = (o: Oido): boolean => o.conSonido <= MUESTRAS_SUELTAS || (o.conSonido <= MUESTRAS_DE_UN_RUIDO && o.conSonido / o.muestras <= PARTE_CASI_SILENCIO);

/** Qué se hace con un fragmento al terminar: se guarda, sale solo él, o sale todo porque no había nada antes. */
export type DestinoDelFragmento = 'guardar' | 'quitar_fragmento' | 'descartar_todo';

/**
 * El seguro de no grabar silencios, en un solo lugar. El primer fragmento solo se descarta si nunca llegó sonido: el que oyó
 * algo se conserva entero, por larga que sea la pausa después (nmvy4m3xatit). Un fragmento añadido callado no queda, y lo
 * guardado antes de él (que traía sonido, porque si no habría salido) se conserva. `antes`: lo oído en los fragmentos
 * guardados. Pura.
 */
export function destinoDelFragmento(antes: Oido, fragmento: Oido): DestinoDelFragmento {
  if (!antes.muestras) return fragmento.conSonido <= MUESTRAS_SUELTAS ? 'descartar_todo' : 'guardar';
  return grabacionCallada(fragmento) ? 'quitar_fragmento' : 'guardar';
}

/**
 * Los pedazos del audio que quedan, sin la cola muda (desde `colaMuda`). Solo se corta la cola: cortar en medio dejaría
 * un archivo con los tiempos rotos, y un corte al final es justo el archivo que ya se oía antes de ese fragmento. Pura.
 */
export const trozosConservados = <T>(trozos: readonly T[], colaMuda: number | null): T[] => (colaMuda === null ? [...trozos] : trozos.slice(0, colaMuda));

/**
 * Los niveles de cada fragmento, a la bitácora de este computador: con ellos, la siguiente prueba con el micrófono real da
 * números y no suposiciones. No dice nada del audio ni de lo hablado, y si no se puede guardar, la grabación sigue igual.
 */
function reportarNiveles(o: Oido, segundos: number, destino: DestinoDelFragmento, silenciada: boolean) {
  const cuerpo = JSON.stringify({ piso: o.piso, pico: o.pico, conSonido: o.conSonido, muestras: o.muestras, segundos, destino, silenciada });
  void fetch('/__estudio/director/niveles-grabadora', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: cuerpo }).catch(() => {});
}

/** Apaga cada pista del micrófono: el navegador deja de usarlo (y de mostrar que lo usa). */
const apagar =(flujo: MediaStream) => flujo.getTracks().forEach((t) => t.stop());

/** Las grabadoras en uso en la página (salen al terminar): ninguna empieza mientras otra graba. */
const grabadoras = new Set<Grabadora>();

export class Grabadora {
  /** Esperando el permiso del micrófono: todavía no graba, pero ya cuenta como grabación en curso. */
  private pidiendo = false;
  private grabador: MediaRecorder | null = null;
  private trozos: Blob[] = [];
  private reloj: ReturnType<typeof setInterval> | null = null;
  private inicio = 0;
  private segundos = 0;
  /** Lo grabado en los fragmentos anteriores. */
  private previos = 0;
  private fragmentos = 0;
  private enviarAlTerminar = false;
  /** Se envía a un lado, con «Enviar ya»: su pastilla dice que envía, hasta que se guarda o el envío no sigue. */
  private enviando = false;
  /** Ya no se usa (se cerró o se rehízo su diálogo): un permiso del micrófono que llegue tarde no la pone a grabar. */
  private terminada = false;
  /** El micrófono del fragmento en curso, conectado al destino que se graba (la fuente, desde que se conecta). */
  private mic: { flujo: MediaStream; fuente: MediaStreamAudioSourceNode | null } | null = null;
  private audio: { ctx: AudioContext; destino: MediaStreamAudioDestinationNode; an: AnalyserNode; datos: Float32Array<ArrayBuffer>; cuadro: number } | null = null;
  /** Lo que oyó en los fragmentos guardados y en el fragmento en curso. */
  private oidoAntes: Oido = OIDO_VACIO;
  private oidoFragmento: Oido = OIDO_VACIO;
  /** Si el navegador dijo, en este fragmento, que la pista del micrófono está silenciada (`track.muted`). */
  private pistaSilenciada = false;
  /** El nivel más alto entre una muestra y la siguiente: un sonido corto entre dos vueltas del reloj también cuenta. */
  private pico = 0;
  /** Dónde empieza el fragmento en curso entre los pedazos del audio, y dónde empieza lo mudo del final, si lo hay. */
  private marcaFragmento = 0;
  private colaMuda: number | null = null;
  /** Lo que hay que decir cuando el audio ya esté listo otra vez (salió un fragmento sin sonido). */
  private avisoPendiente: string | null = null;
  blob: Blob | null = null;
  /**
   * Lo que se hace apenas se detiene la grabación, con lo grabado hasta ahí: «Corregir la nota» empieza a transcribirlo en
   * ese momento, con su indicador, sin esperar a «Guardar» (nota del titular nmvsyxjd6tit, 28 de octubre de 2026).
   */
  alDetener?: (blob: Blob) => void;
  /** Lo que se hace si no se pudo grabar: sin micrófono, sin permiso o sin sonido; recibe lo que pasó, dicho para la persona. */
  alFallar?: (motivo: string) => void;

  /** Con `quieta`, el diálogo donde está no se hace a un lado mientras graba. */
  constructor(private readonly caja: HTMLElement, quieta = false) {
    if (quieta) enSuLugar.add(caja);
    grabadoras.add(this);
    this.pintar();
  }

  /** Graba o está por grabar: desde que pide el micrófono hasta que lo suelta. */
  private get ocupada(): boolean {
    return this.pidiendo || !!this.mic;
  }

  /** Lo que se perdería si se rehiciera su diálogo (antesDeOtroSobre). */
  get estado(): EstadoGrabacion {
    if (this.grabador?.state === 'recording') return 'grabando';
    return this.grabador || this.blob?.size ? 'audio_listo' : 'sin_audio';
  }

  /**
   * Dice algo en la grabación misma, que siempre está a la vista (a un lado, en su pastilla): en el lugar de su ayuda,
   * hasta que cambie lo que muestra, y con el foco en su primer botón (nunca en «Quitar el audio»: un Enter de más lo
   * borraría).
   */
  avisar(texto: string) {
    this.caja.querySelector('.ayuda-g:not(.esperando-mic)')?.remove();
    const aviso = Object.assign(document.createElement('span'), { className: 'ayuda-g aviso-g', textContent: texto });
    aviso.setAttribute('role', 'alert');
    this.caja.append(aviso);
    this.caja.querySelector<HTMLElement>('[data-g]:not([data-g="quitar"])')?.focus();
  }

  private pintar(texto = '') {
    const grabando = this.grabador?.state === 'recording';
    this.caja.classList.toggle('en-grabacion', grabando);
    if (grabando) {
      const enDialogo = !!this.caja.closest('dialog');
      // En un formulario se elige: revisar antes (y añadir otro fragmento) o enviar de una vez
      const puedeEnviar = enDialogo && !!this.caja.closest('form');
      // Los controles van juntos en una sola fila (fila-g): la pastilla toma el ancho de lo que lleva y nunca baja un
      // botón a otro renglón; solo en una pantalla de verdad angosta la fila se parte (nota de voz del 22 de octubre)
      this.caja.innerHTML = `<span class="fila-g"><span class="punto-grabando" aria-hidden="true"></span>
        <span class="grabando-texto" role="status"><b>${this.fragmentos > 1 ? t('grabadora.fragmento', { n: this.fragmentos }) : t('grabadora.grabando')}</b> <span data-tiempo>${mmss(this.segundos)}</span> ${t('grabadora.deMaximo', { max: mmss(MAX_SEGUNDOS) })}<span class="aviso-tope" data-aviso-tope${MAX_SEGUNDOS - this.segundos > 60 ? ' hidden' : ''}> · ${t('grabadora.avisoTope', { max: mmss(MAX_SEGUNDOS) })}</span></span>
        <span class="nivel-voz" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
        <button type="button" class="grabando" data-g="parar">■ ${t(puedeEnviar ? 'grabadora.detenerRevisar' : 'grabadora.detener')}</button>
        ${puedeEnviar ? `<button type="button" class="primario" data-g="enviar">✓ ${t('grabadora.enviarYa')}</button>` : ''}</span>
        ${enDialogo && !enSuLugar.has(this.caja) ? `<span class="ayuda-g">${t('grabadora.puedesLeer')}</span>` : ''}`;
    } else if (this.enviando) {
      this.caja.innerHTML = `<span class="grabando-texto enviando-g" role="status"><b>${t('grabadora.enviando')}</b></span>`;
    } else if (this.blob) {
      const seguir = this.grabador?.state === 'paused' && this.segundos < MAX_SEGUNDOS;
      this.caja.innerHTML = `<p class="audio-listo">${this.fragmentos > 1 ? t('grabadora.listoFragmentos', { tiempo: mmss(this.segundos), n: this.fragmentos }) : t('grabadora.listo', { tiempo: mmss(this.segundos) })}${this.segundos >= MAX_SEGUNDOS ? ` ${t('grabadora.seDetuvo', { max: mmss(MAX_SEGUNDOS) })}` : ''} ${t('grabadora.seTranscribe')}</p>
        <audio controls src="${URL.createObjectURL(this.blob)}"></audio>${seguir ? `<button type="button" class="grabar" data-g="seguir" title="${t('grabadora.anadirTitulo')}">＋ ${t('grabadora.anadir')}</button>` : ''}<button type="button" data-g="quitar">${t('grabadora.quitar')}</button>`;
    } else {
      this.caja.innerHTML = `<button type="button" class="grabar" data-g="grabar">● ${t('grabadora.grabar')}</button><span class="ayuda-g">${texto || t('grabadora.ayuda')}</span>`;
    }
    this.caja.querySelectorAll<HTMLElement>('[data-g]').forEach((b) => b.addEventListener('click', () => {
      const accion = b.dataset.g;
      if (accion === 'grabar' || accion === 'seguir') this.grabar().catch((err) => {
        const motivo = t('grabadora.noMicrofono', { porque: (err as Error).message });
        this.pintar(motivo);
        this.alFallar?.(motivo);
      });
      else if (accion === 'parar') this.parar();
      else if (accion === 'enviar') {
        // Sin sonido, cerrar la descarta: no se envía nada, y dice que mire el micrófono
        this.enviarAlTerminar = true;
        void this.cerrar();
      } else this.descartar();
    }));
  }

  /** Una muestra de lo que llega, con cada vuelta del reloj (también con la pestaña en segundo plano, donde el medidor se detiene). */
  private oir() {
    const a = this.audio;
    if (!a) return;
    a.an.getFloatTimeDomainData(a.datos);
    const silenciada = !!this.mic?.flujo.getAudioTracks().some((x) => x.muted || !x.enabled);
    this.pistaSilenciada ||= silenciada;
    const nivel = nivelDePista(Math.max(nivelDeMuestra(a.datos), this.pico), silenciada);
    this.pico = 0;
    this.oidoFragmento = oirMuestra(this.oidoFragmento, nivel);
  }

  /**
   * Las cuentas del fragmento que termina (destinoDelFragmento): si traía sonido, queda; si no, sale solo él o, sin nada
   * antes, todo. Devuelve si queda audio.
   */
  private cerrarFragmento(): boolean {
    const destino = destinoDelFragmento(this.oidoAntes, this.oidoFragmento);
    reportarNiveles(this.oidoFragmento, this.segundos - this.previos, destino, this.pistaSilenciada);
    if (destino === 'descartar_todo') {
      this.descartarMudo();
      return false;
    }
    if (destino === 'quitar_fragmento') {
      this.colaMuda ??= this.marcaFragmento;
      this.segundos = this.previos;
      this.fragmentos--;
      this.avisoPendiente = t('grabadora.fragmentoMudo');
    } else {
      this.colaMuda = null;
      this.oidoAntes = sumarOido(this.oidoAntes, this.oidoFragmento);
      this.previos = this.segundos;
    }
    this.oidoFragmento = OIDO_VACIO;
    return true;
  }

  /**
   * Sin sonido y sin nada antes: lo vacío se descarta, el diálogo vuelve al frente, listo para grabar otra vez, y lo dice en
   * la grabadora y en un aviso arriba de todo (nota de voz del titular nmvy4nxxdtit): por eso, después de volver al frente.
   */
  private descartarMudo() {
    this.descartar();
    aUnLado(this.caja, false);
    const texto = t('grabadora.sinSonido');
    this.avisar(texto);
    window.dispatchEvent(new CustomEvent(GRABACION_MUDA, { detail: texto }));
    this.alFallar?.(texto);
  }

  /** Graba: la primera vez arma la grabación; después, añade un fragmento al mismo audio. */
  private async grabar() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error(t('grabadora.noNavegador'));
    // Una que quedó fuera de la página no cuenta: no deja a nadie sin grabar para siempre
    const otra = antesDeGrabar([...grabadoras].some((g) => g !== this && g.ocupada && g.caja.isConnected));
    if (otra) return this.avisar(otra);
    // Lo que se lee solo y en voz alta se detiene al grabar, para darle paso a quien habla, y sigue cuando la persona
    // oprima ▶ (nota de voz del titular nmvoooca4tit, 25 de octubre de 2026; guiaLectura.ts › iniciarGuiaLectura)
    window.dispatchEvent(new Event(EMPIEZA_GRABACION));
    const sigue = this.grabador?.state === 'paused';
    // Mientras el navegador pide el permiso, que nadie crea que ya está grabando
    this.caja.innerHTML = `<span class="ayuda-g esperando-mic">${t('grabadora.permiso')}</span>`;
    // Suena antes de abrir el micrófono; desde ahí, nada suena (ni la música) hasta soltarlo, para que no quede grabado
    sonar('grabar-inicio');
    this.pidiendo = true;
    const flujo = await navigator.mediaDevices.getUserMedia({ audio: true }).finally(() => (this.pidiendo = false));
    // Se dejó de usar mientras el navegador pedía el permiso (se cerró su diálogo): no graba, y el micrófono se apaga ya
    if (this.terminada) return apagar(flujo);
    const mic: { flujo: MediaStream; fuente: MediaStreamAudioSourceNode | null } = { flujo, fuente: null };
    this.mic = mic;
    grabando(true);
    try {
      if (!sigue) this.armar();
      const a = this.audio!;
      mic.fuente = a.ctx.createMediaStreamSource(flujo);
      mic.fuente.connect(a.destino);
      mic.fuente.connect(a.an);
      if (a.ctx.state === 'suspended') await a.ctx.resume();
      // Lo mismo si se dejó de usar mientras despertaba el audio: no empieza, y lo armado se deshace
      if (this.terminada) return this.descartar();
      if (sigue) this.grabador!.resume();
      else this.grabador!.start(1000);
    } catch (err) {
      // Lo que falle con el micrófono ya abierto no lo deja encendido
      this.soltarMic();
      throw err;
    }
    this.fragmentos++;
    this.inicio = Date.now();
    this.segundos = this.previos;
    this.oidoFragmento = OIDO_VACIO;
    this.pistaSilenciada = false;
    this.pico = 0;
    this.marcaFragmento = this.trozos.length;
    this.reloj = setInterval(() => {
      this.segundos = this.previos + (Date.now() - this.inicio) / 1000;
      this.oir();
      // Sin sonido en los primeros segundos de la grabación: se detiene sola, y lo vacío no queda (cerrarFragmento)
      if (microfonoSinSonido(this.oidoFragmento, this.segundos - this.previos, this.oidoAntes)) return this.parar();
      if (this.segundos >= MAX_SEGUNDOS) this.parar();
      const t = this.caja.querySelector('[data-tiempo]');
      if (t) t.textContent = mmss(this.segundos);
      // En el último minuto avisa que llega el tope: nada se corta sin que lo sepas
      const aviso = this.caja.querySelector<HTMLElement>('[data-aviso-tope]');
      if (aviso) aviso.hidden = MAX_SEGUNDOS - this.segundos > 60;
    }, 250);
    this.pintar();
    this.medir();
    aUnLado(this.caja, true);
  }

  /** La grabación de todo el audio: graba un destino propio, al que se conecta el micrófono de cada fragmento. */
  private armar() {
    const ctx = new AudioContext();
    const destino = ctx.createMediaStreamDestination();
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    this.audio = { ctx, destino, an, datos: new Float32Array(an.fftSize), cuadro: 0 };
    this.oidoAntes = this.oidoFragmento = OIDO_VACIO;
    this.colaMuda = null;
    this.avisoPendiente = null;
    const tipo = TIPOS.find((t) => MediaRecorder.isTypeSupported(t));
    this.grabador = new MediaRecorder(destino.stream, tipo ? { mimeType: tipo, audioBitsPerSecond: 48_000 } : undefined);
    this.trozos = [];
    this.fragmentos = 0;
    this.previos = 0;
    this.enviarAlTerminar = false;
    this.grabador.ondataavailable = (e) => {
      if (e.data.size) this.trozos.push(e.data);
      // En pausa entre fragmentos: lo grabado hasta aquí, listo para oír
      if (this.grabador?.state !== 'paused') return;
      this.blob = new Blob(trozosConservados(this.trozos, this.colaMuda), { type: this.grabador.mimeType || 'audio/webm' });
      const aviso = this.avisoPendiente;
      this.avisoPendiente = null;
      this.pintar();
      aUnLado(this.caja, false);
      // Salió un fragmento sin sonido: el audio es el de antes, ya transcrito, y solo se dice qué pasó
      if (aviso) return this.avisar(aviso);
      this.alDetener?.(this.blob);
    };
  }

  /** El medidor que se mueve con la voz: prueba, a la vista, de que el micrófono está oyendo. */
  private medir() {
    const a = this.audio;
    if (!a) return;
    const paso = () => {
      a.an.getFloatTimeDomainData(a.datos);
      const oido = nivelDeMuestra(a.datos);
      this.pico = Math.max(this.pico, oido);
      const nivel = Math.min(1, oido * 4);
      this.caja.style.setProperty('--nivel', nivel.toFixed(2));
      if (this.mic) a.cuadro = requestAnimationFrame(paso);
    };
    a.cuadro = requestAnimationFrame(paso);
  }

  /** Suelta el micrófono del fragmento (el navegador deja de mostrar que lo usa). */
  private soltarMic() {
    if (this.reloj) clearInterval(this.reloj);
    this.reloj = null;
    if (this.audio) cancelAnimationFrame(this.audio.cuadro);
    this.caja.style.removeProperty('--nivel');
    if (!this.mic) return;
    this.mic.fuente?.disconnect();
    apagar(this.mic.flujo);
    this.mic = null;
    grabando(false);
    sonar('grabar-parar');
  }

  /** Detiene el fragmento: la grabación queda en pausa, con lo grabado listo para oír, por si se añade otro. */
  private parar() {
    const g = this.grabador;
    if (g?.state !== 'recording' || !this.cerrarFragmento()) return;
    this.soltarMic();
    g.pause();
    g.requestData();
  }

  /** Cierra la grabación: el audio queda en un solo archivo y, si toca, se envía. */
  private cerrar(): Promise<void> {
    const g = this.grabador;
    if (!g || g.state === 'inactive') return Promise.resolve();
    // Sin sonido no queda nada que cerrar ni enviar: ya se descartó, y la grabadora dice que mire su micrófono
    if (g.state === 'recording' && !this.cerrarFragmento()) return Promise.resolve();
    this.soltarMic();
    return new Promise<void>((ok) => {
      g.onstop = () => {
        this.blob = new Blob(trozosConservados(this.trozos, this.colaMuda), { type: g.mimeType || 'audio/webm' });
        void this.audio?.ctx.close();
        this.audio = null;
        this.grabador = null;
        const form = this.caja.closest('form');
        const alFrente = vuelveAlFrente({ enviarYa: this.enviarAlTerminar, conAudio: !!this.blob.size, enFormulario: !!form });
        this.enviando = !alFrente;
        const aviso = this.avisoPendiente;
        this.avisoPendiente = null;
        this.pintar();
        if (alFrente) aUnLado(this.caja, false);
        if (alFrente && aviso) this.avisar(aviso);
        setTimeout(ok, 0);
        if (!alFrente) form?.requestSubmit();
      };
      g.stop();
    });
  }

  private descartar() {
    const g = this.grabador;
    this.soltarMic();
    if (g && g.state !== 'inactive') {
      g.onstop = null;
      g.stop();
    }
    void this.audio?.ctx.close();
    this.audio = null;
    this.grabador = null;
    this.blob = null;
    this.segundos = this.previos = this.fragmentos = this.pico = 0;
    this.oidoAntes = this.oidoFragmento = OIDO_VACIO;
    this.colaMuda = this.avisoPendiente = null;
    this.enviarAlTerminar = false;
    this.pintar();
  }

  /**
   * Se deja de usar (se cierra o se rehace su diálogo): si sigue grabando, o en pausa entre fragmentos, se cierra y queda
   * el audio; y el micrófono se apaga siempre, también el que llegue después con el permiso.
   */
  async terminar(): Promise<void> {
    this.terminada = true;
    grabadoras.delete(this);
    this.soltarMic();
    await this.cerrar();
  }

  /**
   * Trae el audio de un borrador (borradores.ts): queda listo para oírlo, enviarlo o quitarlo, como recién grabado. Si ya
   * hay algo grabado o grabando, no lo toca.
   */
  async cargar(audio: string, segundos = 0): Promise<void> {
    if (this.grabador || this.blob || this.terminada) return;
    const blob = await fetch(audio).then((r) => r.blob()).catch(() => null);
    if (!blob?.size || this.grabador || this.blob || this.terminada) return;
    this.blob = blob;
    this.fragmentos = 1;
    this.segundos = this.previos = segundos;
    this.pintar();
  }

  /**
   * El envío de «Enviar ya» no siguió (falta algo, no se guardó, se dijo que no): el diálogo vuelve al frente, con su aviso
   * a la vista y el audio listo para revisarlo. Si no se enviaba a un lado, nada cambia.
   */
  alFrente() {
    if (!this.enviando) return;
    this.enviando = false;
    this.pintar();
    aUnLado(this.caja, false);
  }

  /** Cuántos fragmentos lleva: lo transcrito al detener uno vale mientras no empiece otro. */
  get cuantosFragmentos(): number {
    return this.fragmentos;
  }

  /** Cuánto dura lo grabado, en segundos (para guardarlo con su borrador). */
  get duracion(): number {
    return this.segundos;
  }

  /** El audio como data URL (sin el parámetro de códec, que el servidor no necesita), o null si no hay. */
  async datos(): Promise<string | null> {
    // Se cierra la grabación, no la grabadora: si el envío no sigue (falta algo), se puede volver a grabar
    await this.cerrar();
    if (!this.blob?.size) return null;
    return enDatos(this.blob);
  }
}

/** Un audio como data URL, sin el parámetro de códec (el servidor no lo necesita): así viaja al guardar o al dictar. */
export async function enDatos(blob: Blob): Promise<string> {
  const url = await new Promise<string>((ok, mal) => {
    const lector = new FileReader();
    lector.onload = () => ok(String(lector.result));
    lector.onerror = () => mal(lector.error);
    lector.readAsDataURL(blob);
  });
  return url.replace(/^data:(audio\/[\w-]+)[^;,]*(;codecs=[^;,]*)?;base64,/, 'data:$1;base64,');
}
