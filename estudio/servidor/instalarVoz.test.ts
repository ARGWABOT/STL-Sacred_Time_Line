// Nada de esto baja nada: cada guion lo hace un proceso de mentira.
import { describe, expect, it } from 'vitest';
import { InstaladorDeVoz, type ProcesoDeGuion } from './instalarVoz';
import type { QueInstala } from '../../src/director/instalacionVoz';

function falso(instaladas = new Set<QueInstala>()) {
  const guiones: string[] = [];
  let salir: (c: number | null) => void = () => {};
  let escribir: (t: string) => void = () => {};
  const proceso: ProcesoDeGuion = { alSalir: (fn) => (salir = fn), alEscribir: (fn) => (escribir = fn) };
  const i = new InstaladorDeVoz('C:/studio', async (g) => {
    guiones.push(g);
    return proceso;
  }, (que) => instaladas.has(que), 'C:/casa/director/voces', () => 1e12);
  const listo = () => new Promise((ok) => setTimeout(ok, 0));
  return { i, guiones, instaladas, listo, salir: (c: number | null) => salir(c), escribir: (t: string) => escribir(t) };
}

describe('las descargas de la pantalla de la voz, sin bajar nada', () => {
  it('sin nada, dice que falta y dónde quedan las voces', () => {
    const { i } = falso();
    expect(i.estado()).toEqual({ transcripcion: { estado: 'sin_instalar' }, voces: { estado: 'sin_instalar' }, carpetaVoces: 'C:/casa/director/voces' });
  });

  it('corre su guion, dice cuánto va y queda lista cuando el guion terminó y su marca está', async () => {
    const f = falso();
    expect(f.i.instalar('transcripcion')).toBe(true);
    await f.listo();
    expect(f.guiones[0].replace(/\\/g, '/')).toBe('C:/studio/tools/entorno/instalar_transcripcion.sh');
    expect(f.i.estado().transcripcion).toEqual({ estado: 'instalando', pct: 0 });
    f.escribir('== faster-whisper\n');
    f.escribir('== Bajando el modelo\nmodel.bin:  50%|█\r');
    expect(f.i.estado().transcripcion).toEqual({ estado: 'instalando', pct: 75 });
    f.instaladas.add('transcripcion');
    f.salir(0);
    expect(f.i.estado().transcripcion).toEqual({ estado: 'lista' });
  });

  it('una a la vez, y lo que ya está no se vuelve a bajar', async () => {
    const f = falso(new Set(['voces']));
    expect(f.i.instalar('voces')).toBe(false);
    expect(f.i.instalar('transcripcion')).toBe(true);
    expect(f.i.instalar('transcripcion')).toBe(false);
    await f.listo();
    expect(f.guiones).toHaveLength(1);
  });

  it('si falla sin internet, lo dice, y «Reintentar» vuelve a correrlo', async () => {
    const f = falso();
    f.i.instalar('voces');
    await f.listo();
    f.escribir('curl: (6) Could not resolve host: github.com\n');
    f.salir(6);
    expect(f.i.estado().voces).toEqual({ estado: 'fallo', causa: 'internet', detalle: 'curl: (6) Could not resolve host: github.com' });
    expect(f.i.instalar('voces')).toBe(true);
    expect(f.i.estado().voces.estado).toBe('instalando');
  });

  it('si falla sin espacio, también lo dice; y si el guion termina bien sin su marca, no la da por lista', async () => {
    const f = falso();
    f.i.instalar('transcripcion');
    await f.listo();
    f.escribir('OSError: [Errno 28] No space left on device\n');
    f.salir(1);
    expect(f.i.estado().transcripcion).toMatchObject({ estado: 'fallo', causa: 'espacio' });
    f.i.instalar('transcripcion');
    await f.listo();
    f.salir(0);
    expect(f.i.estado().transcripcion.estado).toBe('fallo');
  });

  it('si no se pudo ni lanzar (sin Git Bash), también queda en su estado, sin romper nada', async () => {
    const i = new InstaladorDeVoz('C:/studio', async () => {
      throw new Error('bash');
    }, () => false, 'C:/v', () => null);
    expect(i.instalar('transcripcion')).toBe(true);
    await new Promise((ok) => setTimeout(ok, 0));
    expect(i.estado().transcripcion).toMatchObject({ estado: 'fallo', causa: 'otra' });
  });
});
