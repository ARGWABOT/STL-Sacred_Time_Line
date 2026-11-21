// El video corto a 1,25x (nmw4ioo37tit) y su MP4 (nmw4iqe1ztit): lo puro de docs/difusion/video-corto.js y de
// tools/videoMp4.ts, sin navegador ni ffmpeg.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CLIP_PRUEBA, cuadrosDe, escribirWav, filtroDeAudio, objetoDeLaPagina, sintetizarMusica, subtitulosEnEspanol, tapaDeEntrada } from './videoMp4.ts';

const raiz = join(import.meta.dirname, '..');
const ruta = join(raiz, 'docs/difusion/video-corto.js');
const cargar = () => import(pathToFileURL(ruta).href);
const dura = (i: number) => [30, 40, 50, 60][i] ?? 20;

describe('el video corto a 1,25x (nmw4ioo37tit)', () => {
  it('va a 1,25x y dura el total del montaje entre la velocidad', async () => {
    const { VIDEO, montaje } = await cargar();
    expect(VIDEO.velocidad).toBe(1.25);
    const m = montaje(dura);
    // El montaje sigue en segundos de clip, a 1x
    expect(m.total).toBeCloseTo(8 + 4 * VIDEO.entre + 30 + 60 + 40 + VIDEO.final);
    expect(m.total / VIDEO.velocidad).toBeCloseTo(m.total * 0.8);
  });

  it('la página acelera el reloj, la voz y la música, y pone la estación 1 en el segundo del video', () => {
    const fuente = readFileSync(ruta, 'utf8');
    expect(fuente).toContain('dt = real * VIDEO.velocidad');
    expect(fuente).toContain('a.playbackRate = VIDEO.velocidad');
    for (const p of ['preservesPitch', 'mozPreservesPitch', 'webkitPreservesPitch']) expect(fuente).toContain(`a.${p} = true`);
    expect(fuente).toContain('gancho.estacion1?.(VIDEO.desdeEstacion1 + t)');
    expect(fuente).toContain('tocarMusica(ac, m.total, VIDEO.volumen, VIDEO.velocidad)');
    expect(fuente).toContain('Math.round(m.total / VIDEO.velocidad)');
  });

  it('la pista de voz pone cada clip en su segundo real, con el recorte en segundos de clip', async () => {
    const { VIDEO, montaje, pistaDeVoz } = await cargar();
    const m = montaje(dura);
    // Un tramo de voz inventado: hasta el segundo 10 del clip, «a»; luego, «b» (que empieza en el 10)
    const tramoDeVoz = (i: number, t: number) => (i === 0 ? (t < 10 ? { clave: 'a', desde: 0, voz: 9 } : { clave: 'b', desde: 10, voz: 5 }) : null);
    const pista = pistaDeVoz(m, tramoDeVoz);
    const clip = m.partes.find((p: { tipo: string }) => p.tipo === 'clip');
    expect(pista.map((p: { clave: string }) => p.clave)).toEqual(['a', 'b']);
    expect(pista[0].segundoReal).toBeCloseTo(clip.desde / VIDEO.velocidad);
    expect(pista[1].segundoReal).toBeCloseTo((clip.desde + 10) / VIDEO.velocidad, 1);
    expect(pista[0].recorte).toBeCloseTo(0);
  });
});

describe('el MP4 del video corto (tools/videoMp4.ts)', () => {
  it('la música dura lo que el video real y termina en silencio', async () => {
    const { VIDEO, ACORDES, ACORDE_SEG, montaje } = await cargar();
    const segundos = montaje(dura).total / VIDEO.velocidad;
    const tasa = 8000;
    const m = sintetizarMusica({ segundos, velocidad: VIDEO.velocidad, volumen: VIDEO.volumen, acordes: ACORDES, acordeSeg: ACORDE_SEG, tasa });
    expect(m.length).toBe(Math.round(segundos * tasa));
    expect(Math.abs(m[m.length - 1])).toBeLessThan(1e-4);
    expect(Math.abs(m[0])).toBeLessThan(1e-4);
    // Suena, pero bajo: la voz manda
    const pico = m.reduce((a, x) => Math.max(a, Math.abs(x)), 0);
    expect(pico).toBeGreaterThan(0.005);
    expect(pico).toBeLessThan(VIDEO.volumen * 2);
  });

  it('el WAV lleva su cabecera y sus muestras', () => {
    const w = escribirWav(new Float32Array([0, 0.5, -0.5, 1]), 8000);
    expect(w.length).toBe(44 + 8);
    expect(w.toString('ascii', 0, 4)).toBe('RIFF');
    expect(w.toString('ascii', 8, 12)).toBe('WAVE');
    expect(w.readUInt32LE(24)).toBe(8000);
    expect(w.readInt16LE(46)).toBe(16384);
    expect(w.readInt16LE(50)).toBe(32767);
  });

  it('el filtro de audio acelera cada voz con atempo y la pone en su segundo', () => {
    const f = filtroDeAudio([{ clave: 'a', segundoReal: 1.5, recorte: 0.2 }, { clave: 'b', segundoReal: 4, recorte: 0 }], 1.25, 44100, 1);
    expect(f).toContain('[2:a]atrim=start=0.200,asetpts=PTS-STARTPTS,atempo=1.25');
    expect(f).toContain('adelay=1500:all=1[v0]');
    expect(f).toContain('[3:a]atrim=start=0.000');
    expect(f).toContain('[1:a][v0][v1]amix=inputs=3:normalize=0');
  });

  it('cuenta los cuadros a 30 por segundo', () => {
    expect(cuadrosDe(112.3)).toBe(3369);
    expect(cuadrosDe(2)).toBe(60);
  });

  it('el clip de prueba de «Qué es STL»: 1080 × 1920, las 23 líneas elegidas con su voz inglesa y su subtítulo en español, sin música, y queda en autor/ (pd_clips_redes; nmw8e3brctit, nmw8e3foctit, nmw725iwwtit)', () => {
    const { css, claves, entrada, despedida, salida, velocidad } = CLIP_PRUEBA;
    expect([css.ancho * css.escala, css.alto * css.escala]).toEqual([1080, 1920]);
    expect(claves).toHaveLength(23);
    expect([entrada, despedida, velocidad]).toEqual([3, 5, 1.25]);
    expect(salida.replace(/\\/g, '/')).toMatch(/\/autor\/clips\/[^/]+\.mp4$/);
    expect(readFileSync(join(raiz, '.gitignore'), 'utf8')).toMatch(/^\/?autor\/?$/m);
    const html = readFileSync(join(raiz, 'docs/difusion/linea-del-proyecto.html'), 'utf8');
    const es = subtitulosEnEspanol(html), en = objetoDeLaPagina(html, 'GUION_EN');
    for (const k of claves) {
      expect(es[k], k).toBeTruthy();
      const [momento, i] = [k.replace(/-\d+$/, ''), Number(k.match(/\d+$/)![0]) - 1];
      expect(en[momento]?.[i], k).toBeTruthy();
      expect(existsSync(join(raiz, 'docs/difusion/voz/linea-en', `${k}.mp3`)), k).toBe(true);
    }
    expect(es['sinFin-1']).toBe('¿Qué propone STL?');
    // Sin música: el audio es silencio y las voces
    const fuente = readFileSync(join(raiz, 'tools/videoMp4.ts'), 'utf8');
    const clip = fuente.slice(fuente.indexOf('async function clipPrueba'));
    expect(clip).toContain('anullsrc=');
    expect(clip).not.toContain('sintetizarMusica');
    // La tapa de la entrada sube, se queda y se va suave
    expect(tapaDeEntrada(0)).toBe(0);
    expect(tapaDeEntrada(1.5)).toBe(1);
    expect(tapaDeEntrada(3)).toBe(0);
  });

  it('usa el Studio encendido y no arranca otro, y el MP4 no entra en git', () => {
    const fuente = readFileSync(join(raiz, 'tools/videoMp4.ts'), 'utf8');
    expect(fuente).toContain("'http://localhost:5180/'");
    expect(fuente).toContain("from '../src/director/mirada.ts'");
    expect(readFileSync(join(raiz, '.gitignore'), 'utf8')).toMatch(/^\/video\/$/m);
  });
});
