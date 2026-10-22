// Transcribir notas de voz en local, con faster-whisper (tools/director/transcribir.py): en Windows, dentro de WSL; en
// los demás sistemas, con el Python de ~/director/.venv (o el de DIRECTOR_PYTHON). Cada texto queda junto a su audio,
// con el mismo nombre y extensión .txt. Nada sale del equipo. Lo usan el Studio (que transcribe cada audio en cuanto
// llega) y la bandeja del director (que transcribe lo que falte).
//
// El audio de una nota de voz nunca entra a git (regla del titular, 22 de octubre de 2026, para todos los proyectos):
// en git va solo su .txt, y el audio se borra del disco apenas su texto queda escrito. Si la transcripción falla o sale
// vacía, el audio se queda en este computador hasta que salga bien.
import { execFile } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
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

/** El comando que transcribe estos audios (rutas completas en este computador). */
export function comandoTranscripcion(raiz: string, audios: string[], pista: string): { cmd: string; args: string[] } {
  const script = join(raiz, 'tools', 'director', 'transcribir.py');
  if (process.platform === 'win32') {
    const aWsl = (p: string) => `/mnt/${p[0].toLowerCase()}${p.slice(2).replace(/\\/g, '/')}`;
    const python = process.env.DIRECTOR_PYTHON ?? '$HOME/director/.venv/bin/python';
    return { cmd: 'wsl', args: ['-d', process.env.DIRECTOR_WSL ?? 'Ubuntu', '--', python, aWsl(script), '--pista', pista, ...audios.map(aWsl)] };
  }
  const python = process.env.DIRECTOR_PYTHON ?? join(process.env.HOME ?? '~', 'director', '.venv', 'bin', 'python');
  return { cmd: python, args: [script, '--pista', pista, ...audios] };
}

/** Transcribe estos audios sin bloquear: termina cuando están sus .txt (o con el error, si no se pudo). */
export function transcribirEnLocal(raiz: string, audios: string[], pista: string): Promise<{ ok: boolean; error?: string }> {
  const { cmd, args } = comandoTranscripcion(raiz, audios, pista);
  return new Promise((ok) => {
    execFile(cmd, args, { timeout: 15 * 60_000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, (e, _salida, errores) => {
      ok(e ? { ok: false, error: (String(errores).trim().split('\n').at(-1) || e.message).slice(0, 300) } : { ok: true });
    });
  });
}
