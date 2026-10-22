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
import { grabando, sonar } from './sonidos';

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
 */
export function modalDeArriba(dlg: HTMLDialogElement, dialogos: ArrayLike<HTMLDialogElement>, abiertos: readonly HTMLDialogElement[] = []): HTMLDialogElement | null {
  const modales = Array.from(dialogos).filter((d) => d !== dlg && !dlg.contains(d) && d.matches(':modal'));
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
 * Hace a un lado el diálogo (no modal, solo la pastilla de la grabación) o lo devuelve al frente (modal otra vez, en su
 * lugar). A un lado, su pastilla queda siempre encima de todo y con sus botones vivos: si hay un diálogo modal abierto,
 * debajo o encima, va dentro del de arriba (ubicar).
 */
function aUnLado(caja: HTMLElement, si: boolean) {
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

/** Lo que tiene la grabadora de un diálogo: nada, una grabación en curso o un audio grabado que todavía no se envía. */
export type EstadoGrabacion = 'sin_audio' | 'grabando' | 'audio_listo';

/**
 * Si se puede rehacer un diálogo para abrir otro ✉ en él (el que le escribe al director es uno solo y se rehace cada vez
 * que se abre: director.ts › pedir). Cerrado, sí: null. Abierto, nunca: rehacerlo borraba lo que se estaba grabando y
 * dejaba el micrófono encendido (nota de voz del titular del 22 de octubre de 2026). Desde la página solo se llega a
 * otro ✉ mientras graba a un lado (si no, es modal y lo demás no tiene clics). Queda como está, y la frase que devuelve
 * le dice a la persona qué pasó y qué hacer.
 */
export function antesDeOtroSobre(abierto: boolean, estado: EstadoGrabacion): string | null {
  if (!abierto) return null;
  if (estado === 'grabando') return 'Para no perder lo que estás grabando, no se abrió nada más: envía esta nota («Enviar ya») o detenla («Detener y revisar») y vuelve a intentarlo.';
  return `Para no perder ${estado === 'audio_listo' ? 'el audio que grabaste' : 'lo que tienes abierto'}, no se abrió nada más: envía esta nota o cancélala y vuelve a intentarlo.`;
}

/**
 * Si un clic fuera, en el fondo, puede cerrar el diálogo de una grabadora (modal.ts › cerrarConClicFuera, que solo mira
 * lo escrito): sin audio, sí (null). Con un audio grabado sin enviar, no: se perdería sin aviso, y ese es el clic de quien
 * detuvo la grabación («Detener y revisar») y busca otro ✉ en la página. La frase dice qué pasó y qué hacer.
 */
export function antesDeCerrarConClicFuera(estado: EstadoGrabacion): string | null {
  return estado === 'sin_audio' ? null : 'Para no perder el audio que grabaste, esta nota sigue abierta: primero envíala o cancélala.';
}

/** Apaga cada pista del micrófono: el navegador deja de usarlo (y de mostrar que lo usa). */
const apagar = (flujo: MediaStream) => flujo.getTracks().forEach((t) => t.stop());

export class Grabadora {
  private grabador: MediaRecorder | null = null;
  private trozos: Blob[] = [];
  private reloj: ReturnType<typeof setInterval> | null = null;
  private inicio = 0;
  private segundos = 0;
  /** Lo grabado en los fragmentos anteriores. */
  private previos = 0;
  private fragmentos = 0;
  private enviarAlTerminar = false;
  /** Ya no se usa (se cerró o se rehízo su diálogo): un permiso del micrófono que llegue tarde no la pone a grabar. */
  private terminada = false;
  /** El micrófono del fragmento en curso, conectado al destino que se graba (la fuente, desde que se conecta). */
  private mic: { flujo: MediaStream; fuente: MediaStreamAudioSourceNode | null } | null = null;
  private audio: { ctx: AudioContext; destino: MediaStreamAudioDestinationNode; an: AnalyserNode; datos: Uint8Array<ArrayBuffer>; cuadro: number } | null = null;
  blob: Blob | null = null;

  constructor(private readonly caja: HTMLElement) {
    this.pintar();
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
      this.caja.innerHTML = `<span class="punto-grabando" aria-hidden="true"></span>
        <span class="grabando-texto" role="status"><b>Grabando${this.fragmentos > 1 ? ` el fragmento ${this.fragmentos}` : ''}</b> <span data-tiempo>${mmss(this.segundos)}</span> de ${mmss(MAX_SEGUNDOS)}<span class="aviso-tope" data-aviso-tope${MAX_SEGUNDOS - this.segundos > 60 ? ' hidden' : ''}> · queda menos de un minuto: a los ${mmss(MAX_SEGUNDOS)} se detiene, y lo demás va en otra nota</span></span>
        <span class="nivel-voz" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
        <button type="button" class="grabando" data-g="parar">■ ${puedeEnviar ? 'Detener y revisar' : 'Detener'}</button>
        ${puedeEnviar ? '<button type="button" class="primario" data-g="enviar">✓ Enviar ya</button>' : ''}
        ${enDialogo ? '<span class="ayuda-g">Puedes leer y moverte por el Studio mientras hablas.</span>' : ''}`;
    } else if (this.blob) {
      const seguir = this.grabador?.state === 'paused' && this.segundos < MAX_SEGUNDOS;
      this.caja.innerHTML = `<p class="audio-listo">Audio listo (${mmss(this.segundos)}${this.fragmentos > 1 ? `, en ${this.fragmentos} fragmentos` : ''}).${this.segundos >= MAX_SEGUNDOS ? ` Se detuvo en el máximo de ${mmss(MAX_SEGUNDOS)}: lo que dijiste después no quedó grabado, cuéntalo en otra nota.` : ''} Al guardarlo, se transcribe solo, en tu computador.</p>
        <audio controls src="${URL.createObjectURL(this.blob)}"></audio>${seguir ? '<button type="button" class="grabar" data-g="seguir" title="Sigue grabando en el mismo audio, por si se te olvidó algo">＋ Añadir otro fragmento</button>' : ''}<button type="button" data-g="quitar">Quitar el audio</button>`;
    } else {
      this.caja.innerHTML = `<button type="button" class="grabar" data-g="grabar">● Grabar</button><span class="ayuda-g">${texto || 'Todavía no está grabando: oprime «Grabar» y habla.'}</span>`;
    }
    this.caja.querySelectorAll<HTMLElement>('[data-g]').forEach((b) => b.addEventListener('click', () => {
      const accion = b.dataset.g;
      if (accion === 'grabar' || accion === 'seguir') this.grabar().catch((err) => { this.pintar(`No se pudo usar el micrófono: ${(err as Error).message}`); });
      else if (accion === 'parar') this.parar();
      else if (accion === 'enviar') {
        this.enviarAlTerminar = true;
        this.cerrar();
      } else this.descartar();
    }));
  }

  /** Graba: la primera vez arma la grabación; después, añade un fragmento al mismo audio. */
  private async grabar() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('este navegador no deja grabar aquí (abre el Estudio en localhost)');
    const sigue = this.grabador?.state === 'paused';
    // Mientras el navegador pide el permiso, que nadie crea que ya está grabando
    this.caja.innerHTML = '<span class="ayuda-g esperando-mic">Esperando el permiso del micrófono… todavía no graba.</span>';
    // Suena antes de abrir el micrófono; desde ahí, nada suena (ni la música) hasta soltarlo, para que no quede grabado
    sonar('grabar-inicio');
    const flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
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
    this.reloj = setInterval(() => {
      this.segundos = this.previos + (Date.now() - this.inicio) / 1000;
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
    this.audio = { ctx, destino, an, datos: new Uint8Array(an.fftSize), cuadro: 0 };
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
      this.blob = new Blob(this.trozos, { type: this.grabador.mimeType || 'audio/webm' });
      this.pintar();
      aUnLado(this.caja, false);
    };
  }

  /** El medidor que se mueve con la voz: prueba, a la vista, de que el micrófono está oyendo. */
  private medir() {
    const a = this.audio;
    if (!a) return;
    const paso = () => {
      a.an.getByteTimeDomainData(a.datos);
      let suma = 0;
      for (const v of a.datos) suma += ((v - 128) / 128) ** 2;
      const nivel = Math.min(1, Math.sqrt(suma / a.datos.length) * 4);
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
    if (this.grabador?.state !== 'recording') return;
    this.soltarMic();
    this.previos = this.segundos;
    this.grabador.pause();
    this.grabador.requestData();
  }

  /** Cierra la grabación: el audio queda en un solo archivo y, si toca, se envía. */
  private cerrar(): Promise<void> {
    const g = this.grabador;
    if (!g || g.state === 'inactive') return Promise.resolve();
    if (g.state === 'recording') this.previos = this.segundos;
    this.soltarMic();
    return new Promise<void>((ok) => {
      g.onstop = () => {
        this.blob = new Blob(this.trozos, { type: g.mimeType || 'audio/webm' });
        void this.audio?.ctx.close();
        this.audio = null;
        this.grabador = null;
        this.pintar();
        aUnLado(this.caja, false);
        setTimeout(ok, 0);
        if (this.blob.size && this.enviarAlTerminar) this.caja.closest('form')?.requestSubmit();
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
    this.segundos = this.previos = this.fragmentos = 0;
    this.pintar();
  }

  /**
   * Se deja de usar (se cierra o se rehace su diálogo): si sigue grabando, o en pausa entre fragmentos, se cierra y queda
   * el audio; y el micrófono se apaga siempre, también el que llegue después con el permiso.
   */
  async terminar(): Promise<void> {
    this.terminada = true;
    this.soltarMic();
    await this.cerrar();
  }

  /** El audio como data URL (sin el parámetro de códec, que el servidor no necesita), o null si no hay. */
  async datos(): Promise<string | null> {
    // Se cierra la grabación, no la grabadora: si el envío no sigue (falta algo), se puede volver a grabar
    await this.cerrar();
    if (!this.blob?.size) return null;
    const url = await new Promise<string>((ok, mal) => {
      const lector = new FileReader();
      lector.onload = () => ok(String(lector.result));
      lector.onerror = () => mal(lector.error);
      lector.readAsDataURL(this.blob!);
    });
    return url.replace(/^data:(audio\/[\w-]+)[^;,]*(;codecs=[^;,]*)?;base64,/, 'data:$1;base64,');
  }
}
