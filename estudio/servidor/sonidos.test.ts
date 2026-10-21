import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { carpetaSonidos, leerSonido, leerSonidos, listaDe, NOMBRE_SONIDO } from './sonidos';

const temporales: string[] = [];
afterEach(() => {
  for (const t of temporales.splice(0)) rmSync(t, { recursive: true, force: true });
});

/** Un Studio de prueba con la carpeta de AdWi al lado, o sin ella. */
function estudioDePrueba(conAdwi: boolean) {
  const base = mkdtempSync(join(tmpdir(), 'stl-sonidos-'));
  temporales.push(base);
  const raiz = join(base, 'STL');
  mkdirSync(raiz);
  const efectos = join(base, 'atwi', 'site', 'assets', 'audio', 'efectos');
  if (conAdwi) {
    mkdirSync(efectos, { recursive: true });
    writeFileSync(join(efectos, 'efectos.json'), JSON.stringify({
      todas: { acierto: ['acierto-1.mp3', 'acierto-2.mp3', '../fuera.mp3'], 'musica-menu': ['musica-menu-1.mp3'] },
      musica: { menu: { archivo: 'musica-menu-1.mp3', volumen: 0.16, nombre: 'Ukelele y marimba', fondo: true }, juego: { archivo: 'musica-juego-1.mp3', volumen: 0.14, nombre: 'Con ritmo', fondo: false } },
    }));
    writeFileSync(join(efectos, 'acierto-1.mp3'), 'ID3');
  }
  writeFileSync(join(base, 'secreto.mp3'), 'no');
  return { raiz, efectos };
}

describe('Los sonidos del Studio, desde la carpeta de AdWi', () => {
  it('solo acepta nombres de archivo, nunca rutas', () => {
    expect(NOMBRE_SONIDO.test('acierto-1.mp3')).toBe(true);
    for (const malo of ['../secreto.mp3', '..\\secreto.mp3', 'C:/x.mp3', '/etc/x.mp3', 'a/b.mp3', 'Acierto.mp3', 'x.wav', 'x.mp3.exe']) expect(NOMBRE_SONIDO.test(malo)).toBe(false);
  });

  it('busca la carpeta de estudio.local.json y, si no, la de AdWi al lado del Studio', () => {
    const { raiz, efectos } = estudioDePrueba(true);
    expect(carpetaSonidos(raiz, null)).toBe(efectos);
    expect(carpetaSonidos(raiz, { sonidos: { carpeta: join(raiz, 'no-existe') } })).toBe(efectos);
    expect(carpetaSonidos(estudioDePrueba(false).raiz, {})).toBeNull();
  });

  it('la lista trae los efectos válidos y las músicas, sin las tomas de música entre los efectos', () => {
    const l = listaDe({ todas: { acierto: ['acierto-1.mp3', '../x.mp3'], 'musica-menu': ['musica-menu-1.mp3'] }, musica: { menu: { archivo: 'musica-menu-1.mp3', volumen: 0.16, nombre: 'Ukelele y marimba', fondo: true } } });
    expect(l.efectos).toEqual({ acierto: ['acierto-1.mp3'] });
    expect(l.musica.menu).toEqual({ archivo: 'musica-menu-1.mp3', volumen: 0.16, nombre: 'Ukelele y marimba', fondo: true });
  });

  it('sirve un MP3 que está, y nada fuera de la carpeta', async () => {
    const { raiz } = estudioDePrueba(true);
    expect((await leerSonidos(raiz)).hay).toBe(true);
    expect(String(await leerSonido(raiz, 'acierto-1.mp3'))).toBe('ID3');
    expect(await leerSonido(raiz, 'acierto-2.mp3')).toBeNull();
    expect(await leerSonido(raiz, '../../secreto.mp3')).toBeNull();
  });

  it('sin la carpeta, el Studio queda en silencio', async () => {
    const { raiz } = estudioDePrueba(false);
    expect(await leerSonidos(raiz)).toEqual({ hay: false });
    expect(await leerSonido(raiz, 'acierto-1.mp3')).toBeNull();
  });
});
