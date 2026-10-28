import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { carpetaSonidos, leerSonido, leerSonidos, listaDe, NOMBRE_SONIDO } from './sonidos';

const temporales: string[] = [];
afterEach(() => {
  for (const t of temporales.splice(0)) rmSync(t, { recursive: true, force: true });
});

const LISTA = {
  todas: { acierto: ['acierto-1.mp3', 'acierto-2.mp3', '../fuera.mp3'], 'musica-menu': ['musica-menu-1.mp3'] },
  musica: { menu: { archivo: 'musica-menu-1.mp3', volumen: 0.16, nombre: 'Ukelele y marimba', fondo: true }, juego: { archivo: 'musica-juego-1.mp3', volumen: 0.14, nombre: 'Con ritmo', fondo: false } },
};

/** Un Studio de prueba con sus sonidos en estudio/sonidos, o sin ellos; al lado, siempre, la carpeta de donde salieron. */
function estudioDePrueba(conSonidos: boolean) {
  const base = mkdtempSync(join(tmpdir(), 'stl-sonidos-'));
  temporales.push(base);
  const raiz = join(base, 'STL');
  const propia = join(raiz, 'estudio', 'sonidos');
  mkdirSync(raiz);
  if (conSonidos) {
    mkdirSync(propia, { recursive: true });
    writeFileSync(join(propia, 'efectos.json'), JSON.stringify(LISTA));
    writeFileSync(join(propia, 'acierto-1.mp3'), 'ID3');
  }
  // De donde salieron: el Studio ya no depende de ella, aunque esté al lado
  const origen = join(base, 'atwi', 'site', 'assets', 'audio', 'efectos');
  mkdirSync(origen, { recursive: true });
  writeFileSync(join(origen, 'efectos.json'), JSON.stringify(LISTA));
  writeFileSync(join(origen, 'acierto-1.mp3'), 'ID3');
  writeFileSync(join(base, 'secreto.mp3'), 'no');
  return { raiz, propia };
}

describe('Los sonidos del Studio, desde su propia carpeta', () => {
  it('solo acepta nombres de archivo, nunca rutas', () => {
    expect(NOMBRE_SONIDO.test('acierto-1.mp3')).toBe(true);
    for (const malo of ['../secreto.mp3', '..\\secreto.mp3', 'C:/x.mp3', '/etc/x.mp3', 'a/b.mp3', 'Acierto.mp3', 'x.wav', 'x.mp3.exe']) expect(NOMBRE_SONIDO.test(malo)).toBe(false);
  });

  it('viajan con el Studio, en estudio/sonidos (decisión del titular del 23 de octubre), y lo que diga estudio.local.json manda', () => {
    const { raiz, propia } = estudioDePrueba(true);
    expect(carpetaSonidos(raiz, null)).toBe(propia);
    expect(carpetaSonidos(raiz, { sonidos: { carpeta: join(raiz, 'no-existe') } })).toBe(propia);
    const otra = join(raiz, 'otra');
    mkdirSync(otra);
    writeFileSync(join(otra, 'efectos.json'), '{}');
    expect(carpetaSonidos(raiz, { sonidos: { carpeta: otra } })).toBe(otra);
  });

  it('ya no los busca en la carpeta de donde salieron, aunque esté al lado del Studio', () => {
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
