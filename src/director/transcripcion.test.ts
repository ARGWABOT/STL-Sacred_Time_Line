import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { ARCHIVO_DE_VOCES, audioBorrable, borrarSiTranscrito, comandoTranscripcion, limpiarTranscripcion, limpiarTranscrito, MARCA_TRANSCRIPCION, pythonDelDirector, pythonsDeTranscripcion, quitarSiVacia, transcripcionEnDisco, txtDeAudio } from './transcripcion';

const base = mkdtempSync(join(tmpdir(), 'estudio-transcripcion-'));
afterAll(() => rmSync(base, { recursive: true, force: true }));

describe('la voz sin WSL (pr_voz_sin_wsl): en Windows, la forma nueva apenas está instalada, con WSL de respaldo', () => {
  const casa = 'C:\\Users\\ana';
  const venv = join(casa, 'director', '.venv');
  const python = join(venv, 'Scripts', 'python.exe');
  const con = (...rutas: string[]) => ({ plataforma: 'win32', casa, env: {}, existe: (r: string) => rutas.includes(r) });

  it('en Windows, sin WSL solo con lo suyo instalado así: la marca de la transcripción, o el archivo de las voces', () => {
    const marca = join(venv, MARCA_TRANSCRIPCION);
    const voces = join(casa, 'director', 'voces', ARCHIVO_DE_VOCES);
    expect(pythonDelDirector('transcripcion', con(python, marca))).toEqual({ nativo: true, python });
    expect(pythonDelDirector('voz', con(python, voces))).toEqual({ nativo: true, python });
    // A medio instalar (el venv sin su marca), o solo con lo otro: sigue en WSL, como antes
    expect(pythonDelDirector('transcripcion', con(python))).toEqual({ nativo: false, python: '$HOME/director/.venv/bin/python' });
    expect(pythonDelDirector('transcripcion', con(python, voces)).nativo).toBe(false);
    expect(pythonDelDirector('voz', con(python, marca)).nativo).toBe(false);
    expect(pythonDelDirector('voz', con(marca, voces)).nativo).toBe(false);
    // DIRECTOR_PYTHON sigue cambiando el Python de WSL
    expect(pythonDelDirector('transcripcion', { ...con(), env: { DIRECTOR_PYTHON: '/opt/venv/bin/python' } }).python).toBe('/opt/venv/bin/python');
  });

  it('en los demás sistemas, siempre directo, con el Python de ~/director/.venv o el de DIRECTOR_PYTHON', () => {
    expect(pythonDelDirector('transcripcion', { plataforma: 'darwin', env: { HOME: '/Users/ana' }, existe: () => false })).toEqual({ nativo: true, python: join('/Users/ana', 'director', '.venv', 'bin', 'python') });
    expect(pythonDelDirector('voz', { plataforma: 'linux', env: { DIRECTOR_PYTHON: '/x/python' }, existe: () => false })).toEqual({ nativo: true, python: '/x/python' });
  });

  it('la forma nueva de Windows lleva WSL detrás, de respaldo; sin ella, o en otro sistema, un solo intento', () => {
    expect(pythonsDeTranscripcion(con(python, join(venv, MARCA_TRANSCRIPCION))).map((p) => p.nativo)).toEqual([true, false]);
    expect(pythonsDeTranscripcion(con()).map((p) => p.nativo)).toEqual([false]);
    expect(pythonsDeTranscripcion({ plataforma: 'linux', env: {}, existe: () => false }).map((p) => p.nativo)).toEqual([true]);
  });

  it('los audios van con la ruta que ve su Python: la de este computador sin WSL, la de WSL dentro de él', () => {
    const audio = 'C:\\xampp\\STL\\.stl\\director\\notas\\n1.webm';
    const nativo = comandoTranscripcion('C:\\xampp\\STL', [audio], 'Notas.', { nativo: true, python });
    expect(nativo.cmd).toBe(python);
    expect(nativo.args.slice(1)).toEqual(['--pista', 'Notas.', audio]);
    const wsl = comandoTranscripcion('C:\\xampp\\STL', [audio], 'Notas.', { nativo: false, python: '$HOME/director/.venv/bin/python' });
    expect(wsl.cmd).toBe('wsl');
    expect(wsl.args.slice(3)).toEqual(['$HOME/director/.venv/bin/python', '/mnt/c/xampp/STL/tools/director/transcribir.py', '--pista', 'Notas.', '/mnt/c/xampp/STL/.stl/director/notas/n1.webm']);
  });

  it('el instalador, sin WSL: las librerías de NVIDIA solo con su tarjeta, y la marca solo si su prueba transcribió', () => {
    const sh = readFileSync(join(import.meta.dirname, '..', '..', 'tools', 'entorno', 'instalar_transcripcion.sh'), 'utf8');
    expect(sh).toContain('uv pip install --python "$PY" -r "$AQUI/transcripcion_requisitos.txt"');
    expect(sh).toContain('if command -v nvidia-smi >/dev/null && nvidia-smi >/dev/null 2>&1; then');
    expect(sh).toContain('uv pip install --python "$PY" -r "$AQUI/transcripcion_gpu.txt"');
    // La marca se quita al empezar y vuelve después de la prueba (set -e: si la prueba falla, no se llega a ella)
    expect(sh.indexOf(`rm -f .venv/${MARCA_TRANSCRIPCION}`)).toBeGreaterThan(-1);
    expect(sh.indexOf(`touch .venv/${MARCA_TRANSCRIPCION}`)).toBeGreaterThan(sh.indexOf('transcribir.py" --probar'));
    expect(sh).toContain('set -euo pipefail');
    // En un Mac no hay librerías de NVIDIA: van aparte, y lo de siempre no las nombra
    const base = readFileSync(join(import.meta.dirname, '..', '..', 'tools', 'entorno', 'transcripcion_requisitos.txt'), 'utf8');
    const gpu = readFileSync(join(import.meta.dirname, '..', '..', 'tools', 'entorno', 'transcripcion_gpu.txt'), 'utf8');
    expect(base).toContain('faster-whisper==');
    expect(base).not.toMatch(/^nvidia-/m);
    expect(gpu).toMatch(/^nvidia-cublas-cu12==/m);
    expect(gpu).toMatch(/^nvidia-cudnn-cu12==/m);
    // transcribir.py encuentra las DLL de CUDA en Windows (nvidia/*/bin) y escribe en UTF-8
    const py = readFileSync(join(import.meta.dirname, '..', '..', 'tools', 'director', 'transcribir.py'), 'utf8');
    expect(py).toContain("glob.glob(os.path.join(base, 'nvidia', '*', 'bin'))");
    expect(py).toContain('os.add_dll_directory(c)');
    expect(py).toContain("_flujo.reconfigure(encoding='utf-8')");
  });
});
/** Un audio de mentira y, si se da, su .txt. */
const nota = (nombre: string, texto?: string) => {
  const audio = join(base, `${nombre}.webm`);
  writeFileSync(audio, Buffer.alloc(128, 1));
  if (texto != null) writeFileSync(txtDeAudio(audio), texto);
  return audio;
};

describe('el audio de una nota de voz nunca entra a git: se borra apenas su texto queda escrito', () => {
  it('su .txt: la misma ruta, con extensión .txt', () => {
    expect(txtDeAudio('proyectos/stl/director/notas/n1.webm')).toBe('proyectos/stl/director/notas/n1.txt');
    expect(txtDeAudio('proyectos/stl/director/notas/e_m1_x.M4A')).toBe('proyectos/stl/director/notas/e_m1_x.txt');
  });

  it('solo se puede borrar si su transcripción tiene texto', () => {
    expect(audioBorrable('Lo que dije.\n')).toBe(true);
    expect(audioBorrable('')).toBe(false);
    expect(audioBorrable('  \n')).toBe(false); // salió vacía: se queda hasta que salga bien
    expect(audioBorrable(null)).toBe(false); // sin .txt (falló): se queda
    expect(audioBorrable(undefined)).toBe(false);
  });

  it('con su texto, se borra el audio y queda el .txt', () => {
    const audio = nota('con-texto', 'Quiero que el Studio borre los audios.\n');
    expect(borrarSiTranscrito(audio)).toBe(true);
    expect(existsSync(audio)).toBe(false);
    expect(transcripcionEnDisco(audio)).toBe('Quiero que el Studio borre los audios.\n');
    expect(borrarSiTranscrito(audio)).toBe(false); // ya no está: nada que borrar
  });

  it('si falló (sin .txt), el audio se queda', () => {
    const audio = nota('sin-txt');
    expect(borrarSiTranscrito(audio)).toBe(false);
    expect(quitarSiVacia(audio)).toBe(false);
    expect(existsSync(audio)).toBe(true);
  });

  it('si salió vacía, el audio se queda y el .txt vacío sale, para volver a intentarlo', () => {
    const audio = nota('vacia', '\n');
    expect(borrarSiTranscrito(audio)).toBe(false);
    expect(quitarSiVacia(audio)).toBe(true);
    expect(existsSync(audio)).toBe(true);
    expect(existsSync(txtDeAudio(audio))).toBe(false);
  });

  it('una transcripción con texto no se quita como vacía', () => {
    const audio = nota('buena', 'Algo.\n');
    expect(quitarSiVacia(audio)).toBe(false);
    expect(existsSync(txtDeAudio(audio))).toBe(true);
    expect(existsSync(audio)).toBe(true);
  });
});

describe('lo que la transcripción inventa al final, fuera (decisión del titular, 26 de octubre de 2026)', () => {
  it('una frase corta repetida más de tres veces seguidas queda una sola vez', () => {
    expect(limpiarTranscripcion(`Quiero que actualice solo. ${'¡Gracias! '.repeat(29)}`)).toBe('Quiero que actualice solo. ¡Gracias!');
    expect(limpiarTranscripcion('Hola. Gracias. gracias. ¡Gracias! Gracias…')).toBe('Hola. Gracias.');
  });

  it('tres veces o menos, o una frase larga, se quedan como están: pueden ser de verdad', () => {
    expect(limpiarTranscripcion('No. No. No. Eso no va.')).toBe('No. No. No. Eso no va.');
    const larga = 'Esta es una frase larga que de verdad dije varias veces para insistir en lo mismo. ';
    expect(limpiarTranscripcion(larga.repeat(4))).toBe(larga.repeat(4).trim());
  });

  it('una despedida de video al final sale, si antes hay algo; sola, se queda (el audio no se borra como transcrito)', () => {
    expect(limpiarTranscripcion('Que la primera misión lo diga claro. Gracias por ver el video.')).toBe('Que la primera misión lo diga claro.');
    expect(limpiarTranscripcion('Gracias por ver el video.')).toBe('Gracias por ver el video.');
    expect(limpiarTranscripcion('Gracias por ver el video. Y otra cosa más.')).toBe('Gracias por ver el video. Y otra cosa más.');
  });

  it('lo demás no cambia, ni sus signos', () => {
    for (const t of ['¿Y si lo probamos?', '...y luego eso', 'Uno, dos y tres', '3.5 por ciento. ¡Listo!']) expect(limpiarTranscripcion(t)).toBe(t);
  });

  it('se limpia en su .txt, y la bandeja y el Studio lo hacen con cada audio que transcriben', () => {
    const audio = nota('bucle', `Esto sí lo dije. ${'Gracias. '.repeat(6)}\n`);
    expect(limpiarTranscrito(audio)).toBe(true);
    expect(transcripcionEnDisco(audio)).toBe('Esto sí lo dije. Gracias.\n');
    expect(limpiarTranscrito(audio)).toBe(false); // ya limpio: no se reescribe
    expect(limpiarTranscrito(nota('sin-txt-2'))).toBe(false);
    const leer = (ruta: string) => readFileSync(join(__dirname, ruta), 'utf-8');
    expect(leer('../../tools/director/bandeja.ts').match(/limpiarTranscrito\(/g)).toHaveLength(2);
    expect(leer('./transcripcion.ts')).toContain('for (const audio of audios) limpiarTranscrito(audio);');
    expect(leer('../../tools/director/transcribir.py')).toContain('condition_on_previous_text=False');
  });
});

describe('un .txt vacío de antes no impide volver a intentarlo (pd_audios_vacios, 25 de octubre de 2026)', () => {
  const leer = (ruta: string) => readFileSync(join(__dirname, ruta), 'utf-8').replace(/\r\n/g, '\n');

  it('la bandeja transcribe de nuevo un audio cuyo .txt está vacío, y no borra ese .txt, que git guarda', () => {
    const bandeja = leer('../../tools/director/bandeja.ts');
    expect(bandeja).toContain('const audios = todosLosAudios().filter((a) => existsSync(enDisco(a)) && !audioBorrable(transcripcion(a)));');
    expect(bandeja).toContain('const vaciosEnGit = new Set(audios.filter((a) => existsSync(txtDe(a))));');
    expect(bandeja).toContain('if (vaciosEnGit.has(a) ? !audioBorrable(transcripcion(a)) : quitarSiVacia(enDisco(a)))');
  });

  it('nunca sin el filtro de voz: en el silencio el modelo inventa, y un texto inventado borraría el audio', () => {
    const script = leer('../../tools/director/transcribir.py');
    expect(script).toContain('vad_filter=True');
    expect(script).not.toContain('vad_filter=False');
    // Lo que inventó en tres audios sin voz, el 25 de octubre de 2026: no se toma por su texto
    expect(script).toContain('en el silencio el modelo inventa');
  });
});
