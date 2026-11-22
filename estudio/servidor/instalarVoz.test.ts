// Nada de esto baja nada: cada guion lo hace un proceso de mentira.
import { describe, expect, it } from 'vitest';
import { InstaladorDeVoz, type ProcesoDeGuion } from './instalarVoz';
import { quePedirAlRecargar, type QueInstala } from '../../src/director/instalacionVoz';

function falso(instaladas = new Set<QueInstala>()) {
  const guiones: string[] = [];
  let salir: (c: number | null) => void = () => {};
  let escribir: (t: string) => void = () => {};
  const proceso: ProcesoDeGuion = { alSalir: (fn) => (salir = fn), alEscribir: (fn) => (escribir = fn) };
  const disco = { bytes: 0, ahora: 1_000_000 };
  const i = new InstaladorDeVoz('C:/studio', async (g) => {
    guiones.push(g);
    return proceso;
  }, (que) => instaladas.has(que), 'C:/casa/director/voces', () => 1e12, async () => disco.bytes, () => disco.ahora);
  const listo = () => new Promise((ok) => setTimeout(ok, 0));
  return { i, guiones, instaladas, listo, disco, salir: (c: number | null) => salir(c), escribir: (t: string) => escribir(t) };
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
    expect(f.i.estado().transcripcion).toMatchObject({ estado: 'instalando', pct: 0 });
    f.escribir('== faster-whisper\n');
    f.escribir('== Bajando el modelo\nmodel.bin:  50%|█\r');
    expect(f.i.estado().transcripcion).toMatchObject({ estado: 'instalando', pct: 75 });
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

  it('el avance sigue los bytes reales en pasos pequeños, sin saltos de etapa ni bajar nunca', async () => {
    const f = falso();
    f.i.instalar('transcripcion');
    await f.listo();
    // Los saltos de antes (50 %, 67 %) venían de las etapas del guion: ya no mandan si se miden bytes
    f.escribir('== Instalando uv\n== faster-whisper\n== Bajando el modelo\n');
    const pasos: number[] = [];
    for (const b of [19e6, 38e6, 57e6, 190e6, 380e6, 190e6]) {
      f.disco.bytes = b;
      await f.i.sondear();
      pasos.push(f.i.estado().transcripcion.pct ?? -1);
    }
    expect(pasos).toEqual([1, 2, 3, 10, 20, 20]);
    expect(f.i.estado().transcripcion).toMatchObject({ bytes: 190e6, esperados: 1.9e9 });
    // Nunca llega a 100 antes de que el guion termine y su marca esté
    f.disco.bytes = 5e9;
    await f.i.sondear();
    expect(f.i.estado().transcripcion.pct).toBe(99);
  });

  it('nunca se ve quieta: dice hace cuántos segundos se movió algo, y bajar bytes o escribir lo vuelve a cero', async () => {
    const f = falso();
    f.i.instalar('transcripcion');
    await f.listo();
    f.disco.bytes = 100e6;
    await f.i.sondear();
    expect(f.i.estado().transcripcion.quietoSeg).toBe(0);
    // Diez minutos sin que nada se mueva: el estado lo dice, para mostrarlo en pantalla
    f.disco.ahora += 600_000;
    await f.i.sondear();
    expect(f.i.estado().transcripcion.quietoSeg).toBe(600);
    // Crecen los bytes: señal de vida
    f.disco.bytes = 101e6;
    await f.i.sondear();
    expect(f.i.estado().transcripcion.quietoSeg).toBe(0);
    f.disco.ahora += 30_000;
    expect(f.i.estado().transcripcion.quietoSeg).toBe(30);
    f.escribir('algo\n');
    expect(f.i.estado().transcripcion.quietoSeg).toBe(0);
  });

  it('tras recargar, si la descarga corre se reengancha (el estado dice instalando) y si no corre y falta se pide de nuevo', async () => {
    const f = falso();
    f.i.instalar('transcripcion');
    await f.listo();
    const corriendo = f.i.estado();
    expect(corriendo.transcripcion.estado).toBe('instalando');
    expect(quePedirAlRecargar(corriendo, false)).toBeNull();
    // El servidor se reinició: ya no corre y la marca no está
    const otro = falso();
    expect(quePedirAlRecargar(otro.i.estado(), false)).toBe('transcripcion');
    expect(otro.i.instalar('transcripcion')).toBe(true);
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
