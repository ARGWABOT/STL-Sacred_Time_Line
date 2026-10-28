import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pasosSinBoton, type Mision } from './director';

const mision = (pasos: Mision['pasos']) => ({ pasos });

describe('llevar de la mano: un paso que manda a un lugar trae su botón (nota de voz del titular, 22 de octubre de 2026)', () => {
  it('avisa del paso que manda a abrir algo por su nombre y no trae botón, como el que le tocó al titular', () => {
    const m = mision([
      { texto: 'En la misma columna, abre «Otros documentos, para consultar». ¿Se entiende cada grupo?', opciones: ['Sí', 'No'] },
      'Lee «Contribuir a STL Studio» de principio a fin.',
      { texto: 'Mira la parte 3 de «Cómo funciona hoy».' },
      { texto: 'Ve a «La ruta» y revisa la puerta.' },
    ]);
    expect(pasosSinBoton(m)).toEqual([0, 1, 2, 3]);
  });

  it('no avisa del que trae su botón, del que hace la persona fuera del Studio, de una orden ni de «Hazlo tú»', () => {
    const m = mision([
      { texto: 'Abre «Documentos» con el botón de este paso.', ir: { vista: 'documentos', etiqueta: 'Abrir «Documentos»' } },
      { texto: 'Abre la fase y cruza «Instalación probada».', hecho: { que: 'puerta', id: 'replicable' } },
      { texto: 'Abre tu agente de IA y pídele «inicializa STL Studio».', soloTu: 'Pasa en otro computador.' },
      { texto: 'Abre la terminal con «Abrir la terminal con esta orden».', terminal: 'npm test' },
      { texto: 'Revisa «README.md» y corrígelo.', hazlo: 'Lo corrijo yo.' },
    ]);
    expect(pasosSinBoton(m)).toEqual([]);
  });

  it('no avisa de lo que no manda a un lugar con nombre: elegir, contar o un verbo dentro de otra palabra', () => {
    const m = mision([
      { texto: '¿Cómo fue la lectura? Lo que importa: la cuenta de «Entendido» te pareció justa.', opciones: ['Sí', 'No'] },
      { texto: 'Cuéntame con el ✉ de este paso quién es la segunda persona.' },
      { texto: 'Releer no hace falta: «Entendido» ya quedó marcado.' },
    ]);
    expect(pasosSinBoton(m)).toEqual([]);
  });

  it('la bandeja lo avisa en cada misión abierta, salvo en los pasos ya marcados', () => {
    const bandeja = readFileSync(join(__dirname, '../../tools/director/bandeja.ts'), 'utf-8');
    expect(bandeja).toMatch(/const sinBoton = pasosSinBoton\(m\)\.filter\(\(i\) => !marcados\.includes\(i\)\);/);
    expect(bandeja).toContain('a un lugar sin botón. Ponle su');
  });
});
