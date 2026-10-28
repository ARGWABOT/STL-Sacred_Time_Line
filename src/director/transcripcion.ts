// Transcribir notas de voz en local, con faster-whisper (tools/director/transcribir.py): en Windows, dentro de WSL; en
// los demás sistemas, con el Python de ~/director/.venv (o el de DIRECTOR_PYTHON). Cada texto queda junto a su audio,
// con el mismo nombre y extensión .txt. Nada sale del equipo. Lo usan el Studio (que transcribe cada audio en cuanto
// llega) y la bandeja del director (que transcribe lo que falte).
//
// El audio de una nota de voz nunca entra a git (regla del titular, 22 de octubre de 2026, para todos los proyectos):
// en git va solo su .txt, y el audio se borra del disco apenas su texto queda escrito. Si la transcripción falla o sale
// vacía, el audio se queda en este computador hasta que salga bien.
import { execFile } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
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
 * El comando que corre un script de Python del director con el Python de ~/director/.venv: en Windows, dentro de WSL
 * (DIRECTOR_WSL, por defecto Ubuntu; DIRECTOR_PYTHON cambia el Python); en los demás sistemas, directo. `script` es su
 * ruta completa en este computador (en WSL se traduce sola); los `args` van tal cual, y las rutas que lleven se pasan
 * antes por `rutaParaPython`. Lo comparten la transcripción y las voces de Kokoro (tools/director/voz.py).
 */
export function comandoPython(script: string, args: string[]): { cmd: string; args: string[] } {
  if (process.platform === 'win32') {
    const python = process.env.DIRECTOR_PYTHON ?? '$HOME/director/.venv/bin/python';
    return { cmd: 'wsl', args: ['-d', process.env.DIRECTOR_WSL ?? 'Ubuntu', '--', python, aWsl(script), ...args] };
  }
  const python = process.env.DIRECTOR_PYTHON ?? join(process.env.HOME ?? '~', 'director', '.venv', 'bin', 'python');
  return { cmd: python, args: [script, ...args] };
}

/** Una ruta de este computador, como la ve el Python que la va a leer (en Windows, la de WSL). */
const rutaParaPython = (p: string) => (process.platform === 'win32' ? aWsl(p) : p);

/** El comando que transcribe estos audios (rutas completas en este computador). */
export function comandoTranscripcion(raiz: string, audios: string[], pista: string): { cmd: string; args: string[] } {
  return comandoPython(join(raiz, 'tools', 'director', 'transcribir.py'), ['--pista', pista, ...audios.map(rutaParaPython)]);
}

/** El comando de las voces de Kokoro (tools/director/voz.py): `args` son sus opciones (--lista, --voz <id>). */
export function comandoVoz(raiz: string, args: string[]): { cmd: string; args: string[] } {
  return comandoPython(join(raiz, 'tools', 'director', 'voz.py'), args);
}

/** Transcribe estos audios sin bloquear: termina cuando están sus .txt, ya limpios (o con el error, si no se pudo). */
export function transcribirEnLocal(raiz: string, audios: string[], pista: string): Promise<{ ok: boolean; error?: string }> {
  const { cmd, args } = comandoTranscripcion(raiz, audios, pista);
  return new Promise((ok) => {
    execFile(cmd, args, { timeout: 15 * 60_000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, (e, _salida, errores) => {
      for (const audio of audios) limpiarTranscrito(audio);
      ok(e ? { ok: false, error: (String(errores).trim().split('\n').at(-1) || e.message).slice(0, 300) } : { ok: true });
    });
  });
}
