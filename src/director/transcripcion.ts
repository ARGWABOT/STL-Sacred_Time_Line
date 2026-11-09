// Transcribir notas de voz en local, con faster-whisper (tools/director/transcribir.py), con el Python de ~/director/.venv
// (o el de DIRECTOR_PYTHON), en cualquier sistema y sin WSL (pythonDelDirector). Cada texto queda junto a su audio, con el
// mismo nombre y extensión .txt. Nada sale del equipo. Lo
// usan el Studio (que transcribe cada audio en cuanto llega) y la bandeja del director (que transcribe lo que falte).
//
// El audio de una nota de voz nunca entra a git (regla del titular, 22 de octubre de 2026, para todos los proyectos):
// en git va solo su .txt, y el audio se borra del disco apenas su texto queda escrito. Si la transcripción falla o sale
// vacía, el audio se queda en este computador hasta que salga bien.
import { execFile } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** El .txt de un audio: la misma ruta, con extensión .txt. */
export const txtDeAudio = (audio: string) => audio.replace(/\.[a-z0-9]+$/i, '.txt');

/** ¿Se puede borrar el audio? Solo si su transcripción quedó escrita y con texto: vacía o sin .txt, se queda. */
export function audioBorrable(transcripcion: string | null | undefined): boolean {
  return !!transcripcion?.trim();
}

/** Lo que dice el .txt de este audio (ruta en disco), o null si no está. */
export function transcripcionEnDisco(audio: string): string | null {
  const txt = txtDeAudio(audio);
  return existsSync(txt) ? readFileSync(txt, 'utf-8') : null;
}

/**
 * Borra del disco el audio (ruta en disco) si su texto ya quedó escrito, sin git: el audio nunca entra a git, y si un
 * audio de antes ya estaba en git, su `git rm` va aparte. true si lo borró.
 */
export function borrarSiTranscrito(audio: string): boolean {
  if (!existsSync(audio) || !audioBorrable(transcripcionEnDisco(audio))) return false;
  try {
    unlinkSync(audio);
    return true;
  } catch {
    return false; // abierto por otro programa: se borra la próxima vez
  }
}

/**
 * Una transcripción que salió vacía no es su texto: se quita el .txt vacío (recién escrito, fuera de git) para que se
 * vuelva a intentar, y el audio se queda. true si estaba vacía.
 */
export function quitarSiVacia(audio: string): boolean {
  const t = transcripcionEnDisco(audio);
  if (t == null || audioBorrable(t)) return false;
  try {
    unlinkSync(txtDeAudio(audio));
  } catch {
    // si no se pudo quitar, queda como «sin voz», como antes
  }
  return true;
}

/** Las despedidas que el modelo inventa al final de un audio (las aprendió de los subtítulos de videos). */
const DESPEDIDAS_INVENTADAS = ['gracias por ver el video', 'gracias por ver el vídeo', 'gracias por ver', 'suscríbete', 'suscríbete al canal', 'subtítulos realizados por la comunidad de amara.org', 'subtítulos por la comunidad de amara.org'];
/** Una frase, sin mayúsculas, signos ni espacios de más: para comparar dos frases. */
const comparable = (f: string) => f.toLowerCase().replace(/[¡!¿?.,;:…"«»()\s]+/g, ' ').trim();

/**
 * Lo que la transcripción inventa, fuera (decisión del titular, 26 de octubre de 2026): una misma frase corta repetida
 * más de tres veces seguidas queda una sola vez («¡Gracias!» 29 veces al final de una nota), y una despedida de video
 * («Gracias por ver el video») al final, si antes hay algo más. Lo demás no cambia: lo mal entendido se corrige sobre
 * el texto.
 */
export function limpiarTranscripcion(texto: string): string {
  const frases = texto.trim().match(/[^.!?…]+[.!?…]*\s*|[.!?…]+\s*/g) ?? [];
  const salen: string[] = [];
  for (let i = 0; i < frases.length; ) {
    let j = i + 1;
    while (j < frases.length && comparable(frases[j]) === comparable(frases[i])) j++;
    const corta = comparable(frases[i]).length <= 60;
    salen.push(...frases.slice(i, j - i > 3 && corta ? i + 1 : j));
    i = j;
  }
  while (salen.length > 1 && DESPEDIDAS_INVENTADAS.includes(comparable(salen[salen.length - 1]))) salen.pop();
  return salen.join('').trim();
}

/** Limpia en su .txt lo que la transcripción de este audio inventó (`limpiarTranscripcion`). true si cambió algo. */
export function limpiarTranscrito(audio: string): boolean {
  const t = transcripcionEnDisco(audio);
  if (t == null) return false;
  const limpio = limpiarTranscripcion(t);
  if (limpio === t.trim()) return false;
  writeFileSync(txtDeAudio(audio), limpio + '\n');
  return true;
}

/**
 * La marca que deja tools/entorno/instalar_transcripcion.sh en el venv cuando su prueba transcribió: sin ella, la
 * transcripción no está instalada aunque el venv exista (a medio instalar, o solo con las voces).
 */
export const MARCA_TRANSCRIPCION = 'transcripcion-lista';
/** Lo que deja instalado tools/entorno/instalar_voces.sh: el archivo de las voces de Kokoro, en ~/director/voces. */
export const ARCHIVO_DE_VOCES = 'voices-v1.0.bin';

/** Para qué se corre el Python del director: cada uso está instalado cuando lo suyo lo está. */
export type UsoDePython = 'transcripcion' | 'voz';

/** El Python del director (su ruta) y si lo de ese uso está instalado en este computador. */
export interface PythonDelDirector {
  python: string;
  instalado: boolean;
}

/** Cómo se instala la transcripción, desde la carpeta del Studio: la misma orden en cualquier sistema. */
export const COMO_INSTALAR_TRANSCRIPCION = 'La transcripción no está instalada en este computador. Se instala, desde la carpeta del Studio (en Windows, en Git Bash), con: bash tools/entorno/instalar_transcripcion.sh';

/**
 * El Python del director (propuesta aceptada «La voz sin WSL, también en Mac», pr_voz_sin_wsl): el de ~/director/.venv,
 * en cualquier sistema (en Windows, su python.exe, lo que deja desde Git Bash el script de tools/entorno), o el de
 * DIRECTOR_PYTHON. Nunca dentro de WSL: este Studio es el mismo que recibe quien lo instala (nota de voz del titular
 * nmvs7si3qtit, 28 de octubre de 2026, que deja sin efecto el respaldo de WSL de su elección del 26 de octubre). Está
 * instalado si están el Python y lo de ese uso: la marca de la transcripción, o el archivo de las voces. Pura, salvo
 * `o.existe`.
 */
export function pythonDelDirector(uso: UsoDePython, o: { plataforma?: string; casa?: string; existe?: (ruta: string) => boolean; env?: NodeJS.ProcessEnv } = {}): PythonDelDirector {
  const { plataforma = process.platform, existe = existsSync, env = process.env } = o;
  if (env.DIRECTOR_PYTHON) return { python: env.DIRECTOR_PYTHON, instalado: true };
  const director = join(o.casa ?? (plataforma === 'win32' ? homedir() : env.HOME ?? homedir()), 'director');
  const python = plataforma === 'win32' ? join(director, '.venv', 'Scripts', 'python.exe') : join(director, '.venv', 'bin', 'python');
  const listo = uso === 'transcripcion' ? join(director, '.venv', MARCA_TRANSCRIPCION) : join(director, 'voces', ARCHIVO_DE_VOCES);
  return { python, instalado: existe(python) && existe(listo) };
}

/**
 * El comando que corre un script de Python del director con su Python (pythonDelDirector). `script` es su ruta completa
 * en este computador, y los `args` van tal cual. Lo comparten la transcripción y las voces de Kokoro (tools/director/voz.py).
 */
function comandoPython(script: string, args: string[], p: PythonDelDirector): { cmd: string; args: string[] } {
  return { cmd: p.python, args: [script, ...args] };
}

/** El comando que transcribe estos audios (rutas completas en este computador), con el Python que se le da o el de hoy. */
export function comandoTranscripcion(raiz: string, audios: string[], pista: string, p: PythonDelDirector = pythonDelDirector('transcripcion')): { cmd: string; args: string[] } {
  return comandoPython(join(raiz, 'tools', 'director', 'transcribir.py'), ['--pista', pista, ...audios], p);
}

/** El comando de las voces de Kokoro (tools/director/voz.py): `args` son sus opciones (--lista, --voz <id>). */
export function comandoVoz(raiz: string, args: string[], p: PythonDelDirector = pythonDelDirector('voz')): { cmd: string; args: string[] } {
  return comandoPython(join(raiz, 'tools', 'director', 'voz.py'), args, p);
}

/**
 * Los audios sin texto que nadie está transcribiendo ni va a transcribir en este computador: los que fallaron aquí
 * (`fallidos`), los de lo ya respondido (audiosPorTranscribir no los vuelve a intentar) y los que no están en el disco.
 * La página no los cuenta como «Transcribiendo»: contaba para siempre los de notas ya respondidas, y cada audio nuevo se
 * sumaba a esa cuenta, como si se acumularan (nota urgente del titular nmw12z6jntit, 3 de noviembre de 2026). Pura.
 */
export function audiosQueNoSeTranscriben(audios: string[], o: { transcripciones: Record<string, string>; porOir: Set<string>; transcribiendo: Set<string>; fallidos: { has(a: string): boolean }; existe: (audio: string) => boolean }): string[] {
  return audios.filter((a) => o.fallidos.has(a) || (o.transcripciones[a] === undefined && !o.transcribiendo.has(a) && (!o.porOir.has(a) || !o.existe(a))));
}

/** Las esperas antes de volver a intentar un audio que falló, en minutos: crecen y se quedan en una hora. */
export const ESPERAS_DE_REINTENTO = [1, 5, 15, 30, 60];

/**
 * Cuánto esperar (ms) antes de volver a intentar un audio que ya falló `intentos` veces (nota de voz del titular
 * nmw159ihdtit, 3 de noviembre de 2026: un audio que no se transcribe no se borra ni se olvida, queda en cola). La espera
 * crece y se queda en una hora: nunca se rinde, pero tampoco ocupa el procesador sin parar. Pura.
 */
export function esperaParaReintentar(intentos: number): number {
  const i = Math.max(0, Math.min(Math.floor(intentos) - 1, ESPERAS_DE_REINTENTO.length - 1));
  return ESPERAS_DE_REINTENTO[i] * 60_000;
}

/** Un audio que falló: por qué, cuántas veces y cuándo se vuelve a intentar (ms). */
export interface Reintento {
  error: string;
  intentos: number;
  siguiente: number;
}

/**
 * El audio vuelve a la cola cuando falló (`ok: false`): con su espera, que crece con cada intento. Si salió vacía (el
 * audio no tenía voz: el micrófono silenciado), no se reintenta: lo mismo daría vacío, y el audio se queda igual. Pura.
 */
export function anotarFallo(previo: Reintento | undefined, error: string, ahora: number, vacia = false): Reintento {
  const intentos = (previo?.intentos ?? 0) + 1;
  return { error, intentos, siguiente: vacia ? Number.POSITIVE_INFINITY : ahora + esperaParaReintentar(intentos) };
}

/** ¿Se puede intentar ya este audio? Sí, si nunca falló o si ya pasó su espera. Pura. */
export const tocaIntentar = (r: Reintento | undefined, ahora: number) => !r || ahora >= r.siguiente;

/** Lo que salió de transcribir: si quedó y, si no, por qué. */
export interface Transcripcion {
  ok: boolean;
  error?: string;
}

/** La última línea de lo que dijo Python al fallar, o el mensaje del error. */
const ultimaLinea = (e: Error, errores: string) => (String(errores).trim().split('\n').at(-1) || e.message).slice(0, 300);

/**
 * Transcribe estos audios sin bloquear: termina cuando están sus .txt, ya limpios (o con el error, si no se pudo). Sin la
 * transcripción instalada no lo intenta: dice cómo instalarla, y el audio se queda hasta que salga bien.
 */
export async function transcribirEnLocal(raiz: string, audios: string[], pista: string, p: PythonDelDirector = pythonDelDirector('transcripcion')): Promise<Transcripcion> {
  if (!p.instalado) return { ok: false, error: COMO_INSTALAR_TRANSCRIPCION };
  const { cmd, args } = comandoTranscripcion(raiz, audios, pista, p);
  // Uno a la vez en este computador: dos modelos en el procesador a la vez (la cola y «Corregir › Grabar») se estorban,
  // tardan el doble y la página se cansa de esperar (nota de voz del titular nmw159ihdtit)
  const r = await unoALaVez(() => new Promise<Transcripcion>((listo) => {
    execFile(cmd, args, { timeout: 15 * 60_000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, (e, _salida, errores) => {
      listo(e ? { ok: false, error: ultimaLinea(e, String(errores)) } : { ok: true });
    });
  }));
  for (const audio of audios) limpiarTranscrito(audio);
  return r;
}

/** La fila de las transcripciones de este proceso: cada una empieza cuando termina la anterior. */
let fila: Promise<unknown> = Promise.resolve();
/** Corre `f` cuando termine lo que ya está en la fila, aunque lo anterior haya fallado. */
export function unoALaVez<T>(f: () => Promise<T>): Promise<T> {
  const r = fila.then(f, f);
  fila = r.catch(() => undefined);
  return r;
}
