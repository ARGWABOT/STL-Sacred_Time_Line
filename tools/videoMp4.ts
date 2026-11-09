// El MP4 del video corto de la difusión (nmw4iqe1ztit, «Ármalo tú»): 1920 × 1080, 30 cuadros por segundo, a 1,25x
// (nmw4ioo37tit), con la voz de Kai y la música mezcladas. Lo arma cuadro por cuadro desde la página del Studio que ya está
// encendida (mundo-3d.html?video&mp4), con un navegador sin pantalla manejado por el protocolo de Chrome (CDP); el audio no
// se graba: se arma aparte, con los clips de voz/es/ puestos en su segundo y la música sintetizada aquí con los mismos
// ACORDES de la página. Al final ffmpeg lo junta todo en H.264/AAC.
// Uso: node tools/videoMp4.ts                  (escribe video/stl-video-corto-es.mp4 en la raíz del repositorio)
//      node tools/videoMp4.ts --presupuesto 500   (para a los 500 s y, al repetirlo, sigue por el cuadro que faltaba)
//      node tools/videoMp4.ts --hasta 12       (solo los primeros 12 segundos, para probar)
//      node tools/videoMp4.ts --url http://localhost:5180/   (otro Studio encendido; nunca arranca uno)
// Necesita el Studio encendido, ffmpeg en el PATH y Chrome o Edge instalados; si falta algo, se detiene y lo dice.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, existsSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { argumentosNavegador, candidatosNavegador } from '../src/director/mirada.ts';

const raiz = join(import.meta.dirname, '..');
const ANCHO = 1920;
const ALTO = 1080;
const CUADROS_POR_SEGUNDO = 30;
const TASA_AUDIO = 44100;
const SALIDA = join(raiz, 'video', 'stl-video-corto-es.mp4');
const PAGINA = 'docs/difusion/mundo-3d.html?video&mp4';

export type Voz = { clave: string; segundoReal: number; recorte: number };
export type OpcionesMusica = { segundos: number; velocidad: number; volumen: number; acordes: number[][]; acordeSeg: number; tasa?: number };

/** Cuántos cuadros lleva un video de esos segundos reales. */
export function cuadrosDe(segundos: number, fps = CUADROS_POR_SEGUNDO): number {
  return Math.ceil(segundos * fps - 1e-9);
}

/**
 * La música de la página (tocarMusica de video-corto.js), sintetizada: cada acorde son ondas seno que entran en 1,6 s y
 * salen a los ACORDE_SEG + 1,2 s, todo dividido entre la velocidad; pasan por un filtro que quita el brillo (un polo, a
 * 900 Hz); y el conjunto sube en 3 s, queda en `volumen` y baja los últimos 4 s. Dura `segundos` reales, justo lo que el video.
 */
export function sintetizarMusica({ segundos, velocidad, volumen, acordes, acordeSeg, tasa = TASA_AUDIO }: OpcionesMusica): Float32Array {
  const k = 1 / velocidad, acorde = acordeSeg * k, n = Math.round(segundos * tasa);
  const salida = new Float32Array(n);
  // Los acordes: el de cada turno empieza cada `acorde` segundos y se apaga 1,2 s (de 1x) después de su turno
  for (let c = 0; c * acorde < segundos; c++) {
    const inicio = c * acorde, fin = inicio + acorde + 1.2 * k, subida = 1.6 * k;
    const desde = Math.floor(inicio * tasa), hasta = Math.min(n, Math.ceil(fin * tasa));
    for (const f of acordes[c % acordes.length]) {
      const paso = (2 * Math.PI * f) / tasa;
      for (let i = desde; i < hasta; i++) {
        const t = i / tasa - inicio;
        const env = t < subida ? t / subida : Math.max(0, 1 - (t - subida) / (fin - inicio - subida));
        salida[i] += 0.22 * env * Math.sin(paso * (i - desde));
      }
    }
  }
  // El filtro y el volumen general
  const a = 1 - Math.exp((-2 * Math.PI * 900) / tasa);
  let y = 0;
  const sube = 3 * k, baja = Math.max(sube, segundos - 4 * k);
  for (let i = 0; i < n; i++) {
    y += a * (salida[i] - y);
    const t = i / tasa;
    const g = t < sube ? t / sube : t < baja ? 1 : Math.max(0, (segundos - t) / (segundos - baja));
    salida[i] = y * g * volumen;
  }
  return salida;
}

/** Un WAV mono de 16 bits con esas muestras. */
export function escribirWav(muestras: Float32Array, tasa = TASA_AUDIO): Buffer {
  const datos = muestras.length * 2, b = Buffer.alloc(44 + datos);
  b.write('RIFF', 0); b.writeUInt32LE(36 + datos, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(tasa, 24);
  b.writeUInt32LE(tasa * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(datos, 40);
  for (let i = 0; i < muestras.length; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, muestras[i])) * 32767), 44 + i * 2);
  return b;
}

/**
 * El filtro de ffmpeg que arma el audio: la música (entrada 0) y cada voz (entradas 1…), recortada por donde empieza,
 * acelerada con atempo sin cambiar su tono, puesta en su segundo real y mezclada sin bajar el volumen de nadie. `primera`
 * es el lugar de la música entre las entradas de ffmpeg (en el MP4, tras los cuadros).
 */
export function filtroDeAudio(voces: Voz[], velocidad: number, tasa = TASA_AUDIO, primera = 0): string {
  const partes = voces.map((v, i) =>
    `[${primera + i + 1}:a]atrim=start=${v.recorte.toFixed(3)},asetpts=PTS-STARTPTS,atempo=${velocidad},aresample=${tasa},aformat=channel_layouts=mono,adelay=${Math.round(v.segundoReal * 1000)}:all=1[v${i}]`);
  const entradas = [`[${primera}:a]`, ...voces.map((_, i) => `[v${i}]`)].join('');
  return [...partes, `${entradas}amix=inputs=${voces.length + 1}:normalize=0:duration=longest[mezcla]`].join(';');
}

// ── El clip de prueba de «Qué es STL» (pd_clips_redes; nmw8e3brctit, nmw8e3foctit): vertical, de 1080 × 1920 (nmw8crwf0tit),
// grabado de la versión del teléfono de la línea (nmw7x8jdhtit) con su voz y sus rótulos en inglés, los subtítulos en
// español del recorrido debajo del dibujo (nmw7yj0pbtit, nmw866dqttit; en dos renglones solo los largos, nmw8b2k5ttit),
// la entrada con el nombre y lo que es (nmw7x95r0tit), la despedida de 5 segundos con la dirección de GitHub
// (nmw5eyeostit, nmw5eyswotit) y sin música, que espera al modelo de audio local (nmw7510v8tit). Solo las 23 líneas
// elegidas (nmw725iwwtit), por su clave de la pista de voz. Queda en autor/, fuera de git (nmw8crm0atit, nmw8crnaatit).
// Uso: node tools/videoMp4.ts --clip-prueba
export const CLIP_PRUEBA = {
  claves: ['sinIntro-1', 'sinIntro-2', 'sinIntro-3', 'sinRamas-1', 'sinRamas-2', 'sinRamas-5', 'sinRamas-6', 'sinRamas-7', 'sinRamas-10',
    'sinFin-1', 'inicio-1', 'inicio-2', 'inicio-3', 'inicio-4', 'trabajo1-1', 'trabajo1-2', 'trabajo1-3', 'llega1-1', 'llega1-2',
    'entrega-1', 'entrega-2', 'meta-1', 'meta-4'],
  // 360 × 640 de CSS, a 3 por punto: 1080 × 1920
  css: { ancho: 360, alto: 640, escala: 3 },
  velocidad: 1.25,
  entrada: 3,
  despedida: 5,
  nombre: 'STL Studio',
  queEs: 'The interface between you and the model',
  direccion: 'github.com/ARGWABOT/STL-Sacred_Time_Line',
  salida: join(raiz, 'autor', 'clips', 'stl-que-es-clip-prueba.mp4'),
  pagina: 'docs/difusion/linea-del-proyecto.html?lang=en',
};

/** Un objeto literal de la página (GUION, GUION_EN), leído de su fuente: solo cadenas, listas y comentarios. */
export function objetoDeLaPagina(html: string, nombre: string): Record<string, string[]> {
  const i = html.indexOf(`const ${nombre} = {`);
  if (i < 0) throw new Error(`No encuentro ${nombre} en la página`);
  const desde = html.indexOf('{', i);
  let hondo = 0;
  for (let k = desde; k < html.length; k++) {
    if (html[k] === '{') hondo++;
    else if (html[k] === '}' && --hondo === 0) return new Function(`return ${html.slice(desde, k + 1)}`)();
  }
  throw new Error(`${nombre} no cierra`);
}

/** El subtítulo en español de cada clave de la voz: la línea del narrador del mismo momento, como está en el recorrido. */
export function subtitulosEnEspanol(html: string): Record<string, string> {
  const guion = objetoDeLaPagina(html, 'GUION');
  return Object.fromEntries(Object.entries(guion).flatMap(([momento, lineas]) => lineas.map((l, i) => [`${momento}-${i + 1}`, l])));
}

/** La opacidad de la tapa de la entrada en el segundo s: sube suave, se queda y baja suave al dibujo. */
export function tapaDeEntrada(s: number, dura = CLIP_PRUEBA.entrada, suave = 0.6): number {
  if (s < suave) return s / suave;
  if (s > dura - suave) return Math.max(0, (dura - s) / suave);
  return 1;
}

// El reloj de la página, de mentira: performance.now, requestAnimationFrame y setTimeout avanzan solo cuando se pide
// (__avanzar), así cada cuadro sale igual por lento que sea el navegador; y la voz no suena: un Audio que solo anota
// cuándo empieza cada clip y desde dónde (__voces), y termina cuando terminaría el de verdad (su pista de tiempos)
const RELOJ_DE_MENTIRA = `(() => {
  let ahora = 0, nRaf = 0, nT = 0;
  const rafs = new Map(), timers = new Map(), D0 = Date.now();
  performance.now = () => ahora;
  Date.now = () => D0 + ahora;
  window.requestAnimationFrame = (f) => { rafs.set(++nRaf, f); return nRaf; };
  window.cancelAnimationFrame = (id) => { rafs.delete(id); };
  window.setTimeout = (f, ms = 0, ...a) => { timers.set(++nT, { f, en: ahora + Math.max(0, Number(ms) || 0), a }); return nT; };
  window.clearTimeout = (id) => { timers.delete(id); };
  window.setInterval = (f, ms = 0, ...a) => { const id = ++nT; const otra = () => { timers.set(id, { f: () => { otra(); f(...a); }, en: ahora + Math.max(1, Number(ms) || 1), a: [] }); }; otra(); return id; };
  window.clearInterval = (id) => { timers.delete(id); };
  window.__avanzar = (ms) => {
    const fin = ahora + ms;
    for (;;) {
      let prox = null;
      for (const [id, t] of timers) if (t.en <= fin && (!prox || t.en < prox[1].en)) prox = [id, t];
      if (!prox) break;
      timers.delete(prox[0]); ahora = prox[1].en;
      try { prox[1].f(...prox[1].a); } catch (e) { console.error(e); }
    }
    ahora = fin;
    const fs = [...rafs.values()]; rafs.clear();
    for (const f of fs) { try { f(ahora); } catch (e) { console.error(e); } }
  };
  window.__voces = [];
  const claveDe = (src) => String(src).split('/').pop().replace(/\\.mp3$/, '');
  const msDe = (k) => { try { return PISTA_DEL_IDIOMA[k]; } catch { return undefined; } };
  class AudioFalso extends EventTarget {
    constructor() { super(); this.readyState = 4; this.paused = true; this.currentTime = 0; this.playbackRate = 1; this.preservesPitch = true; this.preload = 'auto'; this.src = ''; this.onended = null; this.onerror = null; this.fin = 0; }
    get duration() { const ms = msDe(claveDe(this.src)); return ms ? ms / 1000 : NaN; }
    load() {}
    play() {
      const k = claveDe(this.src);
      this.paused = false;
      window.__voces.push({ clave: k, en: ahora, recorte: this.currentTime, ritmo: this.playbackRate });
      const resto = ((this.duration - this.currentTime) / this.playbackRate) * 1000;
      clearTimeout(this.fin);
      if (Number.isFinite(resto)) this.fin = setTimeout(() => { this.paused = true; this.onended?.(); }, Math.max(0, resto));
      return Promise.resolve();
    }
    pause() { this.paused = true; clearTimeout(this.fin); }
  }
  window.Audio = AudioFalso;
})();`;

// Lo que se agrega a la página para grabarla: sin los mandos de abajo (su lugar queda, para dos renglones de subtítulo),
// sin cursor, y la tapa de la entrada y la despedida, en el azul oscuro de la página
const ESTILO_CLIP = `
  #mando { visibility: hidden !important; } #invita, #bienvenida { display: none !important; } * { cursor: none !important; }
  #clip-tapa { position: fixed; inset: 0; z-index: 99; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px;
    padding: 0 28px; background: #0a0d18; color: #fff6d8; text-align: center; font-family: system-ui, sans-serif; opacity: 0; pointer-events: none; }
  #clip-tapa b { font-size: 46px; font-weight: 700; color: #f5d27a; letter-spacing: .02em; }
  #clip-tapa span { font-size: 21px; line-height: 1.35; }
  #clip-tapa small { font-size: 12.5px; color: #f5d27a; white-space: nowrap; }`;

// ── Lo que toca el computador
function parar(mensaje: string): never {
  console.error(mensaje);
  process.exit(1);
}

function opcion(nombre: string): string | undefined {
  const i = process.argv.indexOf(nombre);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** Habla con el navegador por el protocolo de Chrome, con el WebSocket y el fetch de Node. */
class Cdp {
  private n = 0;
  private pendientes = new Map<number, { ok: (x: any) => void; mal: (e: Error) => void }>();
  private ws: WebSocket;
  private constructor(ws: WebSocket) {
    this.ws = ws;
    ws.addEventListener('message', (e) => {
      const m = JSON.parse(String(e.data));
      const p = m.id != null ? this.pendientes.get(m.id) : undefined;
      if (!p) return;
      this.pendientes.delete(m.id);
      if (m.error) p.mal(new Error(`${m.error.message}`)); else p.ok(m.result);
    });
  }
  static async conectar(url: string): Promise<Cdp> {
    const ws = new WebSocket(url);
    await new Promise<void>((ok, mal) => { ws.addEventListener('open', () => ok()); ws.addEventListener('error', () => mal(new Error('No se pudo abrir el CDP'))); });
    return new Cdp(ws);
  }
  enviar(metodo: string, params: object = {}): Promise<any> {
    const id = ++this.n;
    return new Promise((ok, mal) => { this.pendientes.set(id, { ok, mal }); this.ws.send(JSON.stringify({ id, method: metodo, params })); });
  }
  async evaluar(expresion: string): Promise<any> {
    const r = await this.enviar('Runtime.evaluate', { expression: expresion, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  }
  cerrar() { try { this.ws.close(); } catch { /* ya cerrado */ } }
}

const dormir = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

async function principal() {
  const base = (opcion('--url') ?? 'http://localhost:5180/').replace(/\/?$/, '/');
  const hasta = opcion('--hasta') ? Number(opcion('--hasta')) : null;
  // Lo que tiene que estar: ffmpeg, el navegador y el Studio ya encendido (nunca se arranca uno)
  if (spawnSync('ffmpeg', ['-version']).error) parar('Falta ffmpeg en el PATH.');
  const navegador = candidatosNavegador(process.platform, process.env).find((r) => existsSync(r));
  if (!navegador) parar('No hay Chrome ni Edge instalado (se busca como en src/director/mirada.ts; STL_NAVEGADOR lo puede señalar).');
  const url = base + PAGINA;
  try { if (!(await fetch(url)).ok) throw new Error('no responde'); } catch { parar(`El Studio no está encendido en ${base}: enciéndelo y vuelve a correr esto (no arranco otro).`); }

  const temporal = mkdtempSync(join(tmpdir(), 'stl-video-'));
  // Los cuadros viven en una carpeta fija del temporal del sistema: si se corta (--presupuesto), la siguiente vuelta sigue
  // donde quedó, saltando los que ya están; al armar el MP4 se borra
  const cuadros = join(tmpdir(), 'stl-video-cuadros');
  mkdirSync(cuadros, { recursive: true });
  let terminado = false;
  const puerto = 9300 + Math.floor(Math.random() * 600);
  // La orden de mirada.ts, sin su captura de una sola foto: aquí se maneja por CDP, con la escena 3D por procesador
  const args = argumentosNavegador('about:blank', ANCHO, ALTO, 'x', join(temporal, 'perfil'), 0, true)
    .filter((a) => !a.startsWith('--screenshot=') && !a.startsWith('--virtual-time-budget') && a !== 'about:blank');
  const proceso = spawn(navegador, [...args, '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', `--remote-debugging-port=${puerto}`, 'about:blank'], { stdio: 'ignore' });
  let cdp: Cdp | null = null;
  try {
    let destino: string | undefined;
    for (let i = 0; i < 60 && !destino; i++) {
      try { destino = ((await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json()) as any[]).find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch { await dormir(500); }
    }
    if (!destino) parar('El navegador no abrió su puerto de control.');
    cdp = await Cdp.conectar(destino);
    await cdp.enviar('Page.enable');
    await cdp.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: 1, mobile: false });
    await cdp.enviar('Page.navigate', { url });
    let listo = false;
    for (let i = 0; i < 120 && !listo; i++) { await dormir(500); listo = await cdp.evaluar(`typeof window.cuadroDelVideo === 'function'`).catch(() => false); }
    if (!listo) parar('La página del video no llegó a ofrecer cuadroDelVideo (¿?video&mp4?).');
    await dormir(3000);   // la escena 3D y sus rótulos terminan de armarse

    const duracion: number = await cdp.evaluar('window.duracionDelVideo()');
    const largo = hasta === null ? duracion : Math.min(duracion, hasta);
    const total = cuadrosDe(largo);
    console.log(`El video dura ${duracion.toFixed(2)} s reales; ${total} cuadros de ${ANCHO} × ${ALTO}…`);
    const inicio = Date.now(), presupuesto = Number(opcion('--presupuesto') ?? Infinity) * 1000;
    for (let k = 0; k < total; k++) {
      const archivo = join(cuadros, `${String(k).padStart(6, '0')}.png`);
      if (existsSync(archivo)) continue;
      if (Date.now() - inicio > presupuesto) { console.log(`Pausa en el cuadro ${k} de ${total}: vuelve a correr lo mismo para seguir.`); return; }
      await cdp.evaluar(`window.cuadroDelVideo(${(k / CUADROS_POR_SEGUNDO).toFixed(6)})`);
      const { data } = await cdp.enviar('Page.captureScreenshot', { format: 'png' });
      writeFileSync(archivo, Buffer.from(data, 'base64'));
      if (k % 100 === 0) console.log(`  cuadro ${k} de ${total} (${Math.round((Date.now() - inicio) / 1000)} s)`);
    }
    const voces: Voz[] = (await cdp.evaluar('window.pistaDelVideo()') as Voz[]).filter((v) => v.segundoReal < largo);

    // El audio: la música sintetizada y cada voz en su segundo
    const { VIDEO, ACORDES, ACORDE_SEG } = await import(pathToFileURL(join(raiz, 'docs', 'difusion', 'video-corto.js')).href);
    const musica = join(temporal, 'musica.wav');
    writeFileSync(musica, escribirWav(sintetizarMusica({ segundos: largo, velocidad: VIDEO.velocidad, volumen: VIDEO.volumen, acordes: ACORDES, acordeSeg: ACORDE_SEG })));
    const entradas = voces.flatMap((v) => ['-i', join(raiz, 'docs', 'difusion', 'voz', 'es', `${v.clave}.mp3`)]);
    mkdirSync(join(raiz, 'video'), { recursive: true });
    const orden = ['-y', '-loglevel', 'error', '-framerate', String(CUADROS_POR_SEGUNDO), '-i', join(cuadros, '%06d.png'), '-i', musica, ...entradas,
      '-filter_complex', filtroDeAudio(voces, VIDEO.velocidad, TASA_AUDIO, 1),
      '-map', '0:v', '-map', '[mezcla]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(CUADROS_POR_SEGUNDO),
      '-c:a', 'aac', '-b:a', '192k', '-ac', '2', '-t', largo.toFixed(3), SALIDA];
    const r = spawnSync('ffmpeg', orden, { stdio: 'inherit' });
    if (r.status !== 0) parar('ffmpeg no pudo armar el MP4.');
    terminado = true;
    console.log(`Listo: ${SALIDA} (${(statSync(SALIDA).size / 1048576).toFixed(1)} MB)`);
  } finally {
    cdp?.cerrar();
    // El navegador lanza sus propios procesos: en Windows se cierra el árbol entero, solo el que lanzamos aquí
    if (process.platform === 'win32' && proceso.pid) spawnSync('taskkill', ['/PID', String(proceso.pid), '/T', '/F'], { stdio: 'ignore' });
    else proceso.kill();
    await dormir(1000);
    if (terminado) rmSync(cuadros, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
    try { rmSync(temporal, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 }); } catch { /* el perfil aún lo tiene el navegador: queda en el temporal del sistema */ }
  }
}

/** Graba el clip de prueba: la línea en inglés, cuadro por cuadro con el reloj de mentira, solo en sus 23 líneas. */
async function clipPrueba() {
  const base = (opcion('--url') ?? 'http://localhost:5180/').replace(/\/?$/, '/');
  if (spawnSync('ffmpeg', ['-version']).error) parar('Falta ffmpeg en el PATH.');
  const navegador = candidatosNavegador(process.platform, process.env).find((r) => existsSync(r));
  if (!navegador) parar('No hay Chrome ni Edge instalado.');
  const url = base + CLIP_PRUEBA.pagina;
  try { if (!(await fetch(url)).ok) throw new Error('no responde'); } catch { parar(`El Studio no está encendido en ${base}: enciéndelo y vuelve a correr esto (no arranco otro).`); }
  const { readFileSync } = await import('node:fs');
  const espanol = subtitulosEnEspanol(readFileSync(join(raiz, 'docs', 'difusion', 'linea-del-proyecto.html'), 'utf8'));
  const faltan = CLIP_PRUEBA.claves.filter((k) => !espanol[k]);
  if (faltan.length) parar(`Sin subtítulo en español: ${faltan.join(', ')}`);
  const { css } = CLIP_PRUEBA, FPS = CUADROS_POR_SEGUNDO, paso = 1000 / FPS;
  const temporal = mkdtempSync(join(tmpdir(), 'stl-clip-'));
  const cuadros = join(temporal, 'cuadros');
  mkdirSync(cuadros, { recursive: true });
  const puerto = 9300 + Math.floor(Math.random() * 600);
  const args = argumentosNavegador('about:blank', css.ancho, css.alto, 'x', join(temporal, 'perfil'), 0, true)
    .filter((a) => !a.startsWith('--screenshot=') && !a.startsWith('--virtual-time-budget') && a !== 'about:blank');
  const proceso = spawn(navegador, [...args, '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', `--remote-debugging-port=${puerto}`, 'about:blank'], { stdio: 'ignore' });
  let cdp: Cdp | null = null;
  try {
    let destino: string | undefined;
    for (let i = 0; i < 60 && !destino; i++) {
      try { destino = ((await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json()) as any[]).find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch { await dormir(500); }
    }
    if (!destino) parar('El navegador no abrió su puerto de control.');
    cdp = await Cdp.conectar(destino);
    await cdp.enviar('Page.enable');
    await cdp.enviar('Emulation.setDeviceMetricsOverride', { width: css.ancho, height: css.alto, deviceScaleFactor: css.escala, mobile: true });
    await cdp.enviar('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.enviar('Page.addScriptToEvaluateOnNewDocument', { source: RELOJ_DE_MENTIRA });
    await cdp.enviar('Page.navigate', { url });
    let listo = false;
    for (let i = 0; i < 60 && !listo; i++) { await dormir(500); listo = await cdp.evaluar(`typeof CLAVES_VOZ !== 'undefined' && typeof cerrarBienvenida === 'function' && !!document.getElementById('estado')`).catch(() => false); }
    if (!listo) parar('La página de la línea no llegó a estar lista.');
    await cdp.evaluar(`(() => {
      const st = document.createElement('style'); st.textContent = ${JSON.stringify(ESTILO_CLIP)}; document.head.append(st);
      const t = document.createElement('div'); t.id = 'clip-tapa'; document.body.append(t);
      window.__ES = ${JSON.stringify(espanol)};
      window.__tapa = (html, o) => { const t = document.getElementById('clip-tapa'); if (html != null && t.dataset.html !== html) { t.innerHTML = html; t.dataset.html = html; } t.style.opacity = String(o); };
      // El subtítulo, en español, con la misma regla de la página: en un renglón si cabe (hasta el 72 % de su letra); si no, en dos
      window.__sub = () => { const k = CLAVES_VOZ.get(actual); const es = k ? window.__ES[k] : ''; const s = document.getElementById('estado'); if (s.dataset.es !== es || s.textContent !== es) { unRenglon(s, es); s.dataset.es = es; } return k ?? ''; };
      dispatchEvent(new Event('resize'));
    })()`);
    await cdp.evaluar('__avanzar(200)');
    const foto = async () => Buffer.from((await cdp!.enviar('Page.captureScreenshot', { format: 'jpeg', quality: 94 })).data, 'base64');
    let n = 0;
    const guardar = (b: Buffer) => writeFileSync(join(cuadros, `${String(n++).padStart(6, '0')}.jpg`), b);
    // La entrada: el nombre y lo que es, sobre el primer cuadro de la línea, que aparece al irse la tapa
    const tapaEntrada = `<b>${CLIP_PRUEBA.nombre}</b><span>${CLIP_PRUEBA.queEs}</span>`;
    await cdp.evaluar('__sub()');
    for (let k = 0; k < CLIP_PRUEBA.entrada * FPS; k++) {
      await cdp.evaluar(`__tapa(${JSON.stringify(tapaEntrada)}, ${tapaDeEntrada(k / FPS).toFixed(3)})`);
      guardar(await foto());
    }
    await cdp.evaluar('__tapa(null, 0); cerrarBienvenida(true); if (!reproduce) iniciar();');
    // La línea: cada paso de 1/30 s; solo se guardan los cuadros de las 23 líneas, y cada voz que empieza en ellos
    const elegidas = new Set(CLIP_PRUEBA.claves), voces: Voz[] = [];
    let vistas = 0, finDeLaUltima = -1, pasos = 0;
    console.log('Grabando las 23 líneas…');
    for (; pasos < 20 * 60 * FPS; pasos++) {
      const r = await cdp.evaluar(`(() => { const v0 = __voces.length; __avanzar(${paso}); const k = __sub(); return { k, nuevas: __voces.slice(v0), hablando: !!(narra.audio && narra.hablando) }; })()`) as { k: string; nuevas: { clave: string; recorte: number }[]; hablando: boolean };
      if (!elegidas.has(r.k)) continue;
      for (const v of r.nuevas) if (elegidas.has(v.clave)) voces.push({ clave: v.clave, segundoReal: n / FPS, recorte: v.recorte });
      guardar(await foto());
      if (++vistas % 150 === 0) console.log(`  ${vistas} cuadros de la línea (${(vistas / FPS).toFixed(1)} s)`);
      // Al final, la última línea, con su voz entera y un segundo y medio de aire
      if (r.k === CLIP_PRUEBA.claves.at(-1) && !r.hablando && voces.some((v) => v.clave === r.k)) {
        if (finDeLaUltima < 0) finDeLaUltima = n;
        else if (n - finDeLaUltima >= 1.5 * FPS) break;
      }
    }
    const dichas = new Set(voces.map((v) => v.clave));
    const sinVoz = CLIP_PRUEBA.claves.filter((k) => !dichas.has(k));
    if (sinVoz.length) console.log(`Ojo: sin su voz en el clip: ${sinVoz.join(', ')}`);
    // La despedida: la dirección de GitHub, 5 segundos, sobre el último cuadro
    const tapaFin = `<b>${CLIP_PRUEBA.nombre}</b><span>${CLIP_PRUEBA.queEs}</span><small>${CLIP_PRUEBA.direccion}</small>`;
    let ultima = Buffer.alloc(0);
    for (let k = 0; k < CLIP_PRUEBA.despedida * FPS; k++) {
      if (k <= 18) { await cdp.evaluar(`__tapa(${JSON.stringify(tapaFin)}, ${Math.min(1, k / 18).toFixed(3)})`); ultima = await foto(); }
      guardar(ultima);
    }
    const largo = n / FPS;
    console.log(`El clip dura ${largo.toFixed(2)} s, ${n} cuadros, ${voces.length} voces.`);
    // El audio: silencio del largo del clip y cada voz en su segundo, a 1,25x sin cambiar su tono (filtroDeAudio)
    const entradas = voces.flatMap((v) => ['-i', join(raiz, 'docs', 'difusion', 'voz', 'linea-en', `${v.clave}.mp3`)]);
    mkdirSync(join(raiz, 'autor', 'clips'), { recursive: true });
    const orden = ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(cuadros, '%06d.jpg'),
      '-f', 'lavfi', '-t', largo.toFixed(3), '-i', `anullsrc=r=${TASA_AUDIO}:cl=mono`, ...entradas,
      '-filter_complex', filtroDeAudio(voces, CLIP_PRUEBA.velocidad, TASA_AUDIO, 1),
      '-map', '0:v', '-map', '[mezcla]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS),
      '-c:a', 'aac', '-b:a', '192k', '-ac', '2', '-t', largo.toFixed(3), '-movflags', '+faststart', CLIP_PRUEBA.salida];
    const r = spawnSync('ffmpeg', orden, { stdio: 'inherit' });
    if (r.status !== 0) parar('ffmpeg no pudo armar el MP4.');
    console.log(`Listo: ${CLIP_PRUEBA.salida} (${(statSync(CLIP_PRUEBA.salida).size / 1048576).toFixed(1)} MB)`);
  } finally {
    cdp?.cerrar();
    if (process.platform === 'win32' && proceso.pid) spawnSync('taskkill', ['/PID', String(proceso.pid), '/T', '/F'], { stdio: 'ignore' });
    else proceso.kill();
    await dormir(1000);
    try { rmSync(temporal, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 }); } catch { /* queda en el temporal del sistema */ }
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await (process.argv.includes('--clip-prueba') ? clipPrueba() : principal());
