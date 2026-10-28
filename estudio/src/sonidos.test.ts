import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AJUSTES_POR_DEFECTO, ajustesDe, efectoDe, efectoDeSiempre, elegirToma, ESCALA, MOMENTOS, siguienteNota } from './sonidos';

describe('Los sonidos del Studio', () => {
  it('nunca suena la misma toma dos veces seguidas', () => {
    const tomas = ['acierto-1.mp3', 'acierto-2.mp3', 'acierto-3.mp3'];
    let antes: string | undefined;
    for (let i = 0; i < 200; i++) {
      const t = elegirToma(tomas, antes)!;
      expect(t).not.toBe(antes);
      antes = t;
    }
    // con una sola toma, esa; sin tomas, nada
    expect(elegirToma(['solo-1.mp3'], 'solo-1.mp3')).toBe('solo-1.mp3');
    expect(elegirToma([], undefined)).toBeNull();
    // el azar en su borde (1) no se sale de la lista
    expect(elegirToma(tomas, 'acierto-3.mp3', () => 0.9999)).toBe('acierto-2.mp3');
  });

  it('cada «Entendido» de una parte sube una nota (do, re, mi, sol, la) y vuelve a empezar en la siguiente', () => {
    expect(ESCALA.map((x) => x.toFixed(4))).toEqual([1, 2 ** (2 / 12), 2 ** (4 / 12), 2 ** (7 / 12), 2 ** (9 / 12)].map((x) => x.toFixed(4)));
    let n = siguienteNota(null, 'doc#1');
    expect(n.tono).toBe(1);
    n = siguienteNota(n, 'doc#1');
    expect(n.tono).toBe(ESCALA[1]);
    n = siguienteNota(n, 'doc#1');
    expect(n.tono).toBe(ESCALA[2]);
    n = siguienteNota(n, 'doc#2');
    expect(n).toMatchObject({ parte: 'doc#2', i: 0, tono: 1 });
  });

  it('los efectos vienen encendidos y bajos; la música, apagada', () => {
    expect(ajustesDe(null)).toEqual(AJUSTES_POR_DEFECTO);
    expect(ajustesDe('no es json')).toEqual(AJUSTES_POR_DEFECTO);
    expect(AJUSTES_POR_DEFECTO.efectos).toBe(true);
    expect(AJUSTES_POR_DEFECTO.volEfectos).toBeLessThanOrEqual(0.5);
    expect(AJUSTES_POR_DEFECTO.musica).toBe(false);
  });

  it('lee lo guardado en el navegador y descarta lo que no se entiende', () => {
    const a = ajustesDe(JSON.stringify({ efectos: false, volEfectos: 3, musica: true, volMusica: -1, pista: 'nubes', elegidos: { entendido: 'soltar', paso: '../x', otro: 'acierto' } }));
    expect(a).toEqual({ efectos: false, volEfectos: 1, musica: true, volMusica: 0, pista: 'nubes', elegidos: { entendido: 'soltar' } });
  });

  it('cada momento tiene su efecto de la lista del Studio, y el elegido manda si está en la lista', () => {
    expect(MOMENTOS.map((m) => m.efecto)).toEqual(['acierto', 'mezclar-juego-duos', 'soltar', 'turno-enviado', 'grabar-inicio', 'grabar-parar', 'firmar', 'liston-palabra', 'torre-completa', 'cuenta-romper', 'victoria', 'veredicto-listo', 'le-toca-otro', 'premio-ganado', 'victoria']);
    const efectos = { acierto: ['acierto-1.mp3'], soltar: ['soltar-1.mp3'] };
    expect(efectoDe('entendido', { ...AJUSTES_POR_DEFECTO, elegidos: { entendido: 'soltar' } }, efectos)).toBe('soltar');
    expect(efectoDe('entendido', { ...AJUSTES_POR_DEFECTO, elegidos: { entendido: 'no-esta' } }, efectos)).toBe('acierto');
  });

  it('marcar leída una línea de «¿Dónde quedamos?» suena, por defecto, con el de mezclar el juego de duos, aunque se llame un poco distinto (nota de voz del titular, 22 de octubre de 2026)', () => {
    expect(MOMENTOS.find((m) => m.id === 'linea')?.nombre).toBe('Marcar leída una línea de «¿Dónde quedamos?»');
    const a = AJUSTES_POR_DEFECTO;
    expect(efectoDe('linea', a, { acierto: ['a.mp3'], 'mezclar-juego-duos': ['m.mp3'] })).toBe('mezclar-juego-duos');
    expect(efectoDe('linea', a, { acierto: ['a.mp3'], 'duos-mezclar': ['m.mp3'] })).toBe('duos-mezclar');
    expect(efectoDeSiempre('linea', { 'mezcla-duos': ['m.mp3'] })).toBe('mezcla-duos');
    // El elegido sigue mandando, y los demás momentos no buscan parecidos
    expect(efectoDe('linea', { ...a, elegidos: { linea: 'acierto' } }, { acierto: ['a.mp3'], 'mezclar-duos': ['m.mp3'] })).toBe('acierto');
    expect(efectoDeSiempre('entendido', { 'acierto-duo-mezcla': ['x.mp3'] })).toBe('acierto');
    // Al marcarla, suena
    const director = readFileSync(join(__dirname, 'director.ts'), 'utf-8');
    expect(director).toMatch(/est\.leidas\+\+;[\s\S]{0,140}sonar\('linea'\);/);
  });

  it('las palabras que se desarman suenan al caer, y entregar una misión suena a victoria, con efectos que viajan con el Studio (pd_sonidos_nuevos)', () => {
    const director = readFileSync(join(__dirname, 'director.ts'), 'utf-8');
    expect(director).toMatch(/classList\.add\('rompiendo'\);\s*sonar\('desarme'\);/);
    expect(director).toMatch(/classList\.add\('rompiendo-parte'\);\s*sonar\('desarme'\);/);
    const { publicados } = JSON.parse(readFileSync(join(__dirname, '..', 'sonidos', 'efectos.json'), 'utf-8')) as { publicados: Record<string, string[]> };
    for (const id of ['desarme', 'entrega'] as const) expect(publicados[MOMENTOS.find((m) => m.id === id)!.efecto]?.length).toBeGreaterThan(0);
  });
});
