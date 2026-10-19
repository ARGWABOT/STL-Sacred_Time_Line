// La grabadora de notas de voz del Director: graba con el micrófono del equipo (MediaRecorder), deja oír lo grabado y
// lo entrega como data URL para subirlo al servidor local (a la memoria del proyecto, director/notas/). Nada sale del
// equipo: la transcripción se hace en local (tools/director/transcribir.py).
//
// Que nunca haya dudas de si está grabando: antes de grabar dice que todavía no graba (y espera el permiso del
// micrófono sin aparentar que ya graba); mientras graba, un punto rojo que late, el tiempo y un medidor que se mueve con
// la voz. Dentro de un diálogo, el diálogo se hace a un lado y queda solo esa pastilla, con «Detener y revisar» y
// «Enviar ya»: la página se puede leer y recorrer mientras se habla. Los diálogos que graban ignoran su evento «close» si
// siguen abiertos: es este cambio, no un cierre.
//
// A uno se le olvida decir algo: después de detener, «Añadir otro fragmento» sigue grabando en el mismo audio. Para que
// quede un solo archivo válido, se graba lo que llega a un destino de audio propio (no el micrófono directo): al detener,
// la grabación se pausa y el micrófono se suelta; al añadir, se pide otra vez y se reanuda. Se cierra al enviar.

const TIPOS = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
const MAX_SEGUNDOS = 10 * 60;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Hace a un lado el diálogo (no modal, solo la pastilla de la grabación) o lo devuelve al frente (modal otra vez). */
function aUnLado(caja: HTMLElement, si: boolean) {
  const dlg = caja.closest('dialog');
  if (!dlg || !dlg.open || dlg.classList.contains('a-un-lado') === si) return;
  dlg.classList.toggle('a-un-lado', si);
  dlg.close();
  if (si) dlg.show();
  else dlg.showModal();
  caja.querySelector<HTMLElement>('[data-g]')?.focus();
}

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
  /** El micrófono del fragmento en curso, conectado al destino que se graba. */
  private mic: { flujo: MediaStream; fuente: MediaStreamAudioSourceNode } | null = null;
  private audio: { ctx: AudioContext; destino: MediaStreamAudioDestinationNode; an: AnalyserNode; datos: Uint8Array<ArrayBuffer>; cuadro: number } | null = null;
  blob: Blob | null = null;

  constructor(private readonly caja: HTMLElement) {
    this.pintar();
  }

  private pintar(texto = '') {
    const grabando = this.grabador?.state === 'recording';
    this.caja.classList.toggle('en-grabacion', grabando);
    if (grabando) {
      const enDialogo = !!this.caja.closest('dialog');
      // En un formulario se elige: revisar antes (y añadir otro fragmento) o enviar de una vez
      const puedeEnviar = enDialogo && !!this.caja.closest('form');
      this.caja.innerHTML = `<span class="punto-grabando" aria-hidden="true"></span>
        <span class="grabando-texto" role="status"><b>Grabando${this.fragmentos > 1 ? ` el fragmento ${this.fragmentos}` : ''}</b> <span data-tiempo>${mmss(this.segundos)}</span></span>
        <span class="nivel-voz" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
        <button type="button" class="grabando" data-g="parar">■ ${puedeEnviar ? 'Detener y revisar' : 'Detener'}</button>
        ${puedeEnviar ? '<button type="button" class="primario" data-g="enviar">✓ Enviar ya</button>' : ''}
        ${enDialogo ? '<span class="ayuda-g">Puedes leer y moverte por el Studio mientras hablas.</span>' : ''}`;
    } else if (this.blob) {
      const seguir = this.grabador?.state === 'paused' && this.segundos < MAX_SEGUNDOS;
      this.caja.innerHTML = `<p class="audio-listo">Audio listo (${mmss(this.segundos)}${this.fragmentos > 1 ? `, en ${this.fragmentos} fragmentos` : ''}). Al guardarlo, se transcribe solo, en tu computador.</p>
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
    const flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (!sigue) this.armar();
    const a = this.audio!;
    const fuente = a.ctx.createMediaStreamSource(flujo);
    fuente.connect(a.destino);
    fuente.connect(a.an);
    this.mic = { flujo, fuente };
    if (a.ctx.state === 'suspended') await a.ctx.resume();
    if (sigue) this.grabador!.resume();
    else this.grabador!.start(1000);
    this.fragmentos++;
    this.inicio = Date.now();
    this.segundos = this.previos;
    this.reloj = setInterval(() => {
      this.segundos = this.previos + (Date.now() - this.inicio) / 1000;
      if (this.segundos >= MAX_SEGUNDOS) this.parar();
      const t = this.caja.querySelector('[data-tiempo]');
      if (t) t.textContent = mmss(this.segundos);
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
    this.mic.fuente.disconnect();
    this.mic.flujo.getTracks().forEach((t) => t.stop());
    this.mic = null;
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

  /** ¿Sigue grabando, o en pausa entre fragmentos? Se cierra (al enviar, o al cerrar el diálogo) y queda el audio. */
  async terminar(): Promise<void> {
    await this.cerrar();
  }

  /** El audio como data URL (sin el parámetro de códec, que el servidor no necesita), o null si no hay. */
  async datos(): Promise<string | null> {
    await this.terminar();
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
