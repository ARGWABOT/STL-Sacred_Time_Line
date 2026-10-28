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
  const r = await new Promise<Transcripcion>((listo) => {
    execFile(cmd, args, { timeout: 15 * 60_000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, (e, _salida, errores) => {
      listo(e ? { ok: false, error: ultimaLinea(e, String(errores)) } : { ok: true });
    });
  });
  for (const audio of audios) limpiarTranscrito(audio);
  return r;
}
