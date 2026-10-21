/**
 * Los sonidos del Studio («Los sonidos del Studio», decidido por el titular): los MP3 de AdWi en cada momento que es un
 * logro o una acción con peso, y su música de fondo. Nunca están en el repositorio (su licencia no deja publicarlos
 * sueltos): el servidor los sirve desde la carpeta de AdWi de este computador (estudio/servidor/sonidos.ts) y, sin ella,
 * el Studio queda en silencio. Efectos y música van por separado, cada uno con su interruptor y su volumen, guardados en
 * este navegador. Nunca la misma toma dos veces seguidas, con una variación pequeña de tono y volumen para que no canse;
 * cada «Entendido» de una misma parte sube una nota (do, re, mi, sol, la), por avanzar y no por la prisa. Mientras se graba
 * un audio no suena nada, ni la música, para que no quede en la grabación.
 */

/** Los momentos del Studio que suenan, del más suave al más grande. */
export const MOMENTOS = [
  { id: 'entendido', nombre: 'Marcar «Entendido» en una idea', efecto: 'acierto' },
  { id: 'paso', nombre: 'Elegir una opción de un paso o marcarlo hecho', efecto: 'soltar' },
  { id: 'nota', nombre: 'Dejar una nota o una pregunta en el Buzón', efecto: 'turno-enviado' },
  { id: 'grabar-inicio', nombre: 'Empezar a grabar un audio', efecto: 'grabar-inicio' },
  { id: 'grabar-parar', nombre: 'Terminar de grabar un audio', efecto: 'grabar-parar' },
  { id: 'decision', nombre: 'Responder una decisión', efecto: 'firmar' },
  { id: 'parte', nombre: 'Terminar de leer una parte', efecto: 'torre-completa' },
  { id: 'entrega', nombre: 'Entregar una misión', efecto: 'ronda-completa' },
  { id: 'revision', nombre: 'El director termina su revisión', efecto: 'veredicto-listo' },
  { id: 'aprobada', nombre: 'Una misión aprobada', efecto: 'premio-ganado' },
  { id: 'logro', nombre: 'Subir de nivel o cruzar una puerta', efecto: 'victoria' },
] as const;
export type Momento = (typeof MOMENTOS)[number]['id'];

/** do, re, mi, sol, la: cuánto sube cada «Entendido» de una misma parte. */
export const ESCALA = [0, 2, 4, 7, 9].map((s) => 2 ** (s / 12));

export interface Ajustes {
  efectos: boolean;
  /** De 0 a 1. */
  volEfectos: number;
  musica: boolean;
  /** De 0 a 1; a la mitad, la música suena con el volumen que le dio AdWi. */
  volMusica: number;
  /** El id de la pista en efectos.json › musica (solo las de fondo). */
  pista: string;
  /** El efecto elegido para cada momento, si no es el de siempre. */
  elegidos: Partial<Record<Momento, string>>;
}

/** Los efectos vienen encendidos y bajos; la música, apagada hasta que la enciendan. */
export const AJUSTES_POR_DEFECTO: Ajustes = { efectos: true, volEfectos: 0.35, musica: false, volMusica: 0.5, pista: 'menu', elegidos: {} };
export const CLAVE_SONIDOS = 'estudio.sonidos';

const entre01 = (v: unknown, si: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : si);

/** Los ajustes guardados en este navegador, completados con los de siempre (lo que no se entiende, se ignora). */
export function ajustesDe(texto: string | null): Ajustes {
  let x: any = null;
  try {
    x = texto ? JSON.parse(texto) : null;
  } catch {
    x = null;
  }
  if (!x || typeof x !== 'object') return { ...AJUSTES_POR_DEFECTO, elegidos: {} };
  const d = AJUSTES_POR_DEFECTO;
  const elegidos: Ajustes['elegidos'] = {};
  for (const m of MOMENTOS) {
    const e = x.elegidos?.[m.id];
    if (typeof e === 'string' && /^[a-z0-9-]+$/.test(e)) elegidos[m.id] = e;
  }
  return {
    efectos: typeof x.efectos === 'boolean' ? x.efectos : d.efectos,
    volEfectos: entre01(x.volEfectos, d.volEfectos),
    musica: typeof x.musica === 'boolean' ? x.musica : d.musica,
    volMusica: entre01(x.volMusica, d.volMusica),
    pista: typeof x.pista === 'string' && /^[a-z0-9-]+$/.test(x.pista) ? x.pista : d.pista,
    elegidos,
  };
}

/** Una toma al azar, nunca la misma que sonó la vez anterior (si hay más de una). */
export function elegirToma(tomas: readonly string[], anterior: string | undefined, azar: () => number = Math.random): string | null {
  if (!tomas.length) return null;
  const otras = tomas.length > 1 ? tomas.filter((t) => t !== anterior) : tomas;
  return otras[Math.min(otras.length - 1, Math.floor(azar() * otras.length))];
}

/** La nota del «Entendido» que sigue: sube dentro de la misma parte y vuelve a empezar en otra. */
export function siguienteNota(previa: { parte: string; i: number } | null, parte: string): { parte: string; i: number; tono: number } {
  const i = previa && previa.parte === parte ? previa.i + 1 : 0;
  return { parte, i, tono: ESCALA[i % ESCALA.length] };
}

/** El efecto de cada momento: el elegido, si está en la lista; si no, el de siempre. */
export function efectoDe(m: Momento, a: Ajustes, efectos: Record<string, string[]>): string {
  const elegido = a.elegidos[m];
  return elegido && efectos[elegido] ? elegido : MOMENTOS.find((x) => x.id === m)!.efecto;
}

// —— Lo que suena (navegador) ——

export interface Musica {
  archivo: string;
  volumen: number;
  nombre: string;
  fondo: boolean;
}
export interface ListaSonidos {
  efectos: Record<string, string[]>;
  musica: Record<string, Musica>;
}

const urlSonido = (archivo: string) => `/__estudio/director/sonido?nombre=${encodeURIComponent(archivo)}`;

let lista: ListaSonidos | null | undefined; // undefined: aún no se sabe; null: no hay sonidos en este computador
let cargando: Promise<ListaSonidos | null> | null = null;
let ctx: AudioContext | null = null;
const buffers = new Map<string, Promise<AudioBuffer | null>>();
const ultima = new Map<string, string>();
let melodia: { parte: string; i: number } | null = null;
let grabandoAhora = false;
let reproductor: HTMLAudioElement | null = null;

export const ajustes = (): Ajustes => ajustesDe(localStorage.getItem(CLAVE_SONIDOS));
export function cambiarAjustes(c: Partial<Ajustes>) {
  localStorage.setItem(CLAVE_SONIDOS, JSON.stringify({ ...ajustes(), ...c }));
  aplicarMusica();
}

/** La lista de sonidos de este computador (una vez): null si no hay. */
export function cargarSonidos(): Promise<ListaSonidos | null> {
  cargando ??= fetch('/__estudio/director/sonidos')
    .then((r) => (r.ok ? r.json() : { hay: false }))
    .then((x) => (lista = x?.hay ? { efectos: x.efectos ?? {}, musica: x.musica ?? {} } : null))
    .catch(() => (lista = null))
    .then((l) => {
      // Las tomas de cada momento, listas de antemano: el de la revisión suena justo antes de recargar la página
      if (l) for (const m of MOMENTOS) for (const t of l.efectos[efectoDe(m.id, ajustes(), l.efectos)] ?? []) void buffer(t);
      return l;
    });
  return cargando;
}
if (typeof window !== 'undefined') void cargarSonidos();
/** Lo que se sabe ya de la lista: undefined si aún no llegó. */
export const sonidosCargados = () => lista;
/** Las pistas que sirven de fondo (nunca la que tiene ritmo). */
export const pistasDeFondo = (l: ListaSonidos) => Object.entries(l.musica).filter(([, m]) => m.fondo);

// El navegador no deja sonar nada hasta que la página recibe un clic o una tecla: el sonido se prepara con el primero
function prepararSonido() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
  aplicarMusica();
}
if (typeof window !== 'undefined') for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, prepararSonido, { capture: true, passive: true });

function buffer(archivo: string): Promise<AudioBuffer | null> {
  let b = buffers.get(archivo);
  if (!b) {
    b = fetch(urlSonido(archivo))
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('sin sonido'))))
      // Un solo contexto, también para decodificar (se crea suspendido; suena después del primer clic)
      .then((datos) => (ctx ??= new AudioContext()).decodeAudioData(datos))
      .catch(() => null);
    buffers.set(archivo, b);
  }
  return b;
}

/** Suena una toma de un efecto, con su variación; si no está lista, suena en cuanto llegue (si es pronto). */
function tocar(efecto: string, tono = 1, vol = ajustes().volEfectos): boolean {
  const tomas = lista?.efectos[efecto];
  const toma = tomas && elegirToma(tomas, ultima.get(efecto));
  if (!toma) return false;
  ultima.set(efecto, toma);
  const pedido = Date.now();
  const reproducir = (b: AudioBuffer | null) => {
    if (!b || !ctx || ctx.state !== 'running' || grabandoAhora || Date.now() - pedido > 3000) return;
    const fuente = ctx.createBufferSource();
    const g = ctx.createGain();
    fuente.buffer = b;
    fuente.playbackRate.value = tono * (0.985 + Math.random() * 0.03);
    g.gain.value = vol * (0.9 + Math.random() * 0.2);
    fuente.connect(g).connect(ctx.destination);
    fuente.start();
  };
  prepararSonido();
  void buffer(toma).then(reproducir);
  // Suena en cuanto la toma esté lista (al instante si ya se oyó antes): basta con que el navegador deje sonar
  return !!ctx && ctx.state === 'running';
}

/**
 * El sonido de un momento del Studio. `parte` (el documento y su parte) hace subir la melodía de «Entendido». Devuelve si
 * pudo sonar (el navegador lo deja y hay sonidos).
 */
export function sonar(m: Momento, parte?: string): boolean {
  const a = ajustes();
  if (!a.efectos || grabandoAhora) return false;
  if (lista === undefined) {
    void cargarSonidos().then(() => { if (lista) sonar(m, parte); });
    return false;
  }
  if (!lista) return false;
  let tono = 1;
  if (m === 'entendido') {
    const n = siguienteNota(melodia, parte ?? '');
    melodia = { parte: n.parte, i: n.i };
    tono = n.tono;
  }
  return tocar(efectoDe(m, a, lista.efectos), tono, a.volEfectos);
}

/** Oír un efecto en el diálogo de los sonidos, aunque los efectos estén apagados. */
export function probar(efecto: string) {
  if (grabandoAhora) return;
  tocar(efecto, 1, Math.max(0.2, ajustes().volEfectos));
}

/** Mientras se graba un audio, nada suena: ni los efectos ni la música. */
export function grabando(si: boolean) {
  grabandoAhora = si;
  aplicarMusica();
}

/** La música de fondo, en bucle, si está encendida, hay pista de fondo y no se está grabando. */
export function aplicarMusica() {
  const a = ajustes();
  const pista = lista ? (lista.musica[a.pista]?.fondo ? lista.musica[a.pista] : pistasDeFondo(lista)[0]?.[1]) : null;
  if (!a.musica || grabandoAhora || !pista) {
    reproductor?.pause();
    if (a.musica && lista === undefined) void cargarSonidos().then(() => lista && aplicarMusica());
    return;
  }
  reproductor ??= Object.assign(new Audio(), { loop: true, preload: 'auto' });
  const url = urlSonido(pista.archivo);
  if (!reproductor.src.endsWith(url)) reproductor.src = url;
  reproductor.volume = Math.min(1, pista.volumen * a.volMusica * 2);
  if (reproductor.paused) void reproductor.play().catch(() => { /* sin un clic aún: suena con el primero */ });
}
