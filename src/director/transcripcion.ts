// Transcribir notas de voz en local, con faster-whisper (tools/director/transcribir.py), con el Python de ~/director/.venv
// (o el de DIRECTOR_PYTHON): en Windows, sin WSL apenas está instalado ahí, y si no, dentro de WSL, el respaldo de antes
// (pythonDelDirector). Cada texto queda junto a su audio, con el mismo nombre y extensión .txt. Nada sale del equipo. Lo
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

/** Una ruta de Windows vista desde WSL (C:\a\b es /mnt/c/a/b). */
const aWsl = (p: string) => `/mnt/${p[0].toLowerCase()}${p.slice(2).replace(/\\/g, '/')}`;

/**
 * La marca que deja tools/entorno/instalar_transcripcion.sh en el venv cuando su prueba transcribió: sin ella, en Windows,
 * la transcripción sigue en WSL aunque el venv exista (a medio instalar, o solo con las voces).
 */
export const MARCA_TRANSCRIPCION = 'transcripcion-lista';
/** Lo que deja instalado tools/entorno/instalar_voces.sh: el archivo de las voces de Kokoro, en ~/director/voces. */
export const ARCHIVO_DE_VOCES = 'voices-v1.0.bin';

/** Para qué se corre el Python del director: cada uno pasa a la forma nueva cuando lo suyo está instalado sin WSL. */
export type UsoDePython = 'transcripcion' | 'voz';

/** Dónde corre el Python del director: sin WSL (`nativo`, con su ruta) o dentro de WSL (con la ruta que ve WSL). */
export interface PythonDelDirector {
  nativo: boolean;
  python: string;
}

/**
 * Dónde corre el Python del director (propuesta aceptada «La voz sin WSL, también en Mac», pr_voz_sin_wsl). En Windows,
 * sin WSL apenas lo de ese uso está instalado en ~/director (lo que dejan, desde Git Bash, los scripts de tools/entorno:
 * el python.exe del venv y la marca de la transcripción, o el archivo de las voces); si no, dentro de WSL, el respaldo de
 * antes (elección del titular del 26 de octubre de 2026: tu voz pasa a la forma nueva apenas esté, con WSL de respaldo
 * hasta que la nueva transcriba bien una semana). En los demás sistemas, siempre directo. DIRECTOR_PYTHON cambia el
 * Python de WSL o, fuera de Windows, el de siempre. Pura, salvo `o.existe`.
 */
export function pythonDelDirector(uso: UsoDePython, o: { plataforma?: string; casa?: string; existe?: (ruta: string) => boolean; env?: NodeJS.ProcessEnv } = {}): PythonDelDirector {
  const { plataforma = process.platform, existe = existsSync, env = process.env } = o;
  if (plataforma !== 'win32') return { nativo: true, python: env.DIRECTOR_PYTHON ?? join(env.HOME ?? '~', 'director', '.venv', 'bin', 'python') };
  const director = join(o.casa ?? homedir(), 'director');
  const python = join(director, '.venv', 'Scripts', 'python.exe');
  const listo = uso === 'transcripcion' ? join(director, '.venv', MARCA_TRANSCRIPCION) : join(director, 'voces', ARCHIVO_DE_VOCES);
  if (existe(python) && existe(listo)) return { nativo: true, python };
  return { nativo: false, python: env.DIRECTOR_PYTHON ?? '$HOME/director/.venv/bin/python' };
}

/**
 * El comando que corre un script de Python del director con su Python (pythonDelDirector): directo o dentro de WSL
 * (DIRECTOR_WSL, por defecto Ubuntu). `script` es su ruta completa en este computador; los `args` van tal cual, y las
 * rutas que lleven, como las ve ese Python (rutaParaPython). Lo comparten la transcripción y las voces de Kokoro
 * (tools/director/voz.py).
 */
function comandoPython(script: string, args: string[], p: PythonDelDirector): { cmd: string; args: string[] } {
  if (p.nativo) return { cmd: p.python, args: [script, ...args] };
  return { cmd: 'wsl', args: ['-d', process.env.DIRECTOR_WSL ?? 'Ubuntu', '--', p.python, aWsl(script), ...args] };
}

/** Una ruta de este computador, como la ve el Python que la va a leer (dentro de WSL, la de WSL). */
const rutaParaPython = (ruta: string, p: PythonDelDirector) => (p.nativo ? ruta : aWsl(ruta));

/** El comando que transcribe estos audios (rutas completas en este computador), con el Python que se le da o el de hoy. */
export function comandoTranscripcion(raiz: string, audios: string[], pista: string, p: PythonDelDirector = pythonDelDirector('transcripcion')): { cmd: string; args: string[] } {
  return comandoPython(join(raiz, 'tools', 'director', 'transcribir.py'), ['--pista', pista, ...audios.map((a) => rutaParaPython(a, p))], p);
}

/** El comando de las voces de Kokoro (tools/director/voz.py): `args` son sus opciones (--lista, --voz <id>). */
export function comandoVoz(raiz: string, args: string[], p: PythonDelDirector = pythonDelDirector('voz')): { cmd: string; args: string[] } {
  return comandoPython(join(raiz, 'tools', 'director', 'voz.py'), args, p);
}

/**
 * Con qué se intenta transcribir, en orden: el Python de hoy y, si es el nuevo de Windows, WSL detrás, de respaldo (si la
 * forma nueva falla, la nota se transcribe igual y lo que falló queda dicho). Pura, como pythonDelDirector.
 */
export function pythonsDeTranscripcion(o: Parameters<typeof pythonDelDirector>[1] = {}): PythonDelDirector[] {
  const p = pythonDelDirector('transcripcion', o);
  const plataforma = o.plataforma ?? process.platform;
  return p.nativo && plataforma === 'win32' ? [p, { nativo: false, python: (o.env ?? process.env).DIRECTOR_PYTHON ?? '$HOME/director/.venv/bin/python' }] : [p];
}

/** Lo que salió de transcribir: si quedó, con qué (sin WSL o con WSL) y, si la forma nueva falló y WSL la cubrió, por qué. */
export interface Transcripcion {
  ok: boolean;
  error?: string;
  nativo?: boolean;
  respaldo?: string;
}

/** La última línea de lo que dijo Python al fallar, o el mensaje del error. */
const ultimaLinea = (e: Error, errores: string) => (String(errores).trim().split('\n').at(-1) || e.message).slice(0, 300);

/**
 * Transcribe estos audios sin bloquear: termina cuando están sus .txt, ya limpios (o con el error, si no se pudo). En
 * Windows, con la forma nueva instalada, si falla lo intenta otra vez dentro de WSL (pythonsDeTranscripcion).
 */
export async function transcribirEnLocal(raiz: string, audios: string[], pista: string): Promise<Transcripcion> {
  let respaldo: string | undefined;
  let r: Transcripcion = { ok: false, error: 'No hay con qué transcribir.' };
  for (const p of pythonsDeTranscripcion()) {
    const { cmd, args } = comandoTranscripcion(raiz, audios, pista, p);
    r = await new Promise<Transcripcion>((listo) => {
      execFile(cmd, args, { timeout: 15 * 60_000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, (e, _salida, errores) => {
        listo(e ? { ok: false, error: ultimaLinea(e, String(errores)), nativo: p.nativo } : { ok: true, nativo: p.nativo });
      });
    });
    if (r.ok) break;
    if (p.nativo) respaldo = r.error;
  }
  for (const audio of audios) limpiarTranscrito(audio);
  // Si también falló WSL, lo que vale decir es por qué falló la forma nueva
  if (!respaldo) return r;
  return r.ok ? { ...r, respaldo } : { ...r, error: respaldo, nativo: true };
}
