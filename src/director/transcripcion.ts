// Transcribir notas de voz en local, con faster-whisper (tools/director/transcribir.py): en Windows, dentro de WSL; en
// los demás sistemas, con el Python de ~/director/.venv (o el de DIRECTOR_PYTHON). Cada texto queda junto a su audio,
// con el mismo nombre y extensión .txt. Nada sale del equipo. Lo usan el Studio (que transcribe cada audio en cuanto
// llega) y la bandeja del director (que transcribe lo que falte).
import { execFile } from 'node:child_process';
import { join } from 'node:path';

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
