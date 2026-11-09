import { describe, expect, it } from 'vitest';
import { controlesEnfoque, GRUPOS_ENFOQUE } from './controlesEnfoque';

describe('los controles del modo enfoque, en cuatro grupos (pd_controles_enfoque)', () => {
  it('son cuatro, siempre en este orden: el tema, la niebla de lectura, la narración y el sonido', () => {
    expect(GRUPOS_ENFOQUE.map((g) => g.id)).toEqual(['tema', 'niebla', 'narracion', 'sonido']);
    // Con nombre para el lector de pantalla, en español
    expect(GRUPOS_ENFOQUE.map((g) => g.nombre)).toEqual(['Tema', 'Niebla de lectura', 'Narración en voz alta', 'Sonido']);
  });

  it('arma cada pieza dentro de su grupo, en ese orden, vengan como vengan', () => {
    const html = controlesEnfoque({ sonido: '<i>S</i>', narracion: '<i>N</i>', tema: '<i>T</i>', niebla: '<i>F</i>' });
    const grupos = [...html.matchAll(/<span class="grupo-enfoque grupo-enfoque-(\w+)" role="group" aria-label="([^"]+)"><i>(\w)<\/i><\/span>/g)].map((m) => m.slice(1));
    expect(grupos).toEqual([
      ['tema', 'Tema', 'T'],
      ['niebla', 'Niebla de lectura', 'F'],
      ['narracion', 'Narración en voz alta', 'N'],
      ['sonido', 'Sonido', 'S'],
    ]);
    // Nada más: los cuatro grupos son todo lo que dibuja
    expect(html.replace(/<span class="grupo-enfoque[^>]*><i>\w<\/i><\/span>/g, '')).toBe('');
  });

  it('un grupo sin pieza no se dibuja, y los demás conservan su orden', () => {
    const html = controlesEnfoque({ sonido: 'S', tema: 'T' });
    expect(html.match(/grupo-enfoque-(\w+)"/g)).toEqual(['grupo-enfoque-tema"', 'grupo-enfoque-sonido"']);
    expect(controlesEnfoque({})).toBe('');
  });
});
