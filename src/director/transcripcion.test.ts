import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { audioBorrable, borrarSiTranscrito, quitarSiVacia, transcripcionEnDisco, txtDeAudio } from './transcripcion';

const base = mkdtempSync(join(tmpdir(), 'estudio-transcripcion-'));
afterAll(() => rmSync(base, { recursive: true, force: true }));
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
