import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pasosQuePrometenBoton, pasosSinBoton, type Mision } from './director';

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

  it('regla dura: un paso que promete un botón trae el suyo, con cualquier redacción (nmw5gp40otit)', () => {
    // El paso que falló, palabra por palabra: contaba con el botón del paso 2, que no se ve mientras se lee el 1
    const fallo = 'Esta tarjeta tiene niebla, y el paso de abajo lleva un botón que abre otra parte del Studio. Pon el ratón sobre el lugar donde está ese botón, todavía tapado, y oprime el botón central del ratón: debe empezar a destapar y a narrar, sin llevarte a ningún lado. Cuando ya no quede niebla, el botón central sí lleva a donde pide el paso. ¿Pasa así?';
    expect(pasosQuePrometenBoton(mision([{ texto: fallo, opciones: ['Pasa así', 'Todavía me lleva antes (te cuento con ✉)'] }]))).toEqual([0]);
    // Otras redacciones de la misma promesa, en español y en inglés
    const prometen = [
      'El botón de este paso abre el recorrido en la estación 2.',
      'Ábrelo con el botón y mira la línea.',
      'Oprime el botón de abajo y espera.',
      'Su botón te lleva a «La ruta».',
      'El botón «Abrir el recorrido» de este paso abre una pestaña nueva.',
      "This step's button opens the tour.",
      'Press the button below and wait.',
    ];
    expect(pasosQuePrometenBoton(mision(prometen.map((texto) => ({ texto, opciones: ['Sí', 'No'] }))))).toEqual(prometen.map((_, i) => i));
    // Con su `ir`, cumple; y en el detalle también cuenta
    expect(pasosQuePrometenBoton(mision([{ texto: fallo, ir: { vista: 'buzon', etiqueta: 'Ir al Buzón' }, opciones: ['Sí', 'No'] }]))).toEqual([]);
    expect(pasosQuePrometenBoton(mision([{ texto: 'Mira la tarjeta.', detalle: ['Oprime el botón de este paso.'] }]))).toEqual([0]);
  });

  it('no confunde con una promesa los botones del ratón, los del Studio por su nombre, las opciones ni los pasos que ya traen el suyo', () => {
    const m = mision([
      { texto: 'Oprime el botón central del ratón sobre la tarjeta: la narración sigue.', opciones: ['Sigue', 'Se detiene'] },
      { texto: 'Arriba, oprime el botón «Pedir revisión» cuando quieras.' },
      { texto: 'Elige con uno de los botones de las opciones.', opciones: ['A', 'B'] },
      { texto: 'Press the middle mouse button over the card.', opciones: ['Yes', 'No'] },
      { texto: 'Con «Hazlo tú», el botón de este paso, lo hago yo.', hazlo: 'Lo hago yo.' },
      { texto: 'Pega el texto con el botón «Copiar el texto».', copiar: 'Hola' },
      { texto: 'Abre la terminal con el botón de este paso.', terminal: 'npm test' },
      { texto: 'En GitHub, oprime el botón verde.', soloTu: 'Pasa en tu cuenta.' },
    ]);
    expect(pasosQuePrometenBoton(m)).toEqual([]);
  });

  it('--listo no cierra con un paso abierto que promete un botón sin traerlo, y la bandeja lo avisa', () => {
    const bandeja = readFileSync(join(__dirname, '../../tools/director/bandeja.ts'), 'utf-8');
    expect(bandeja).toContain('return pasosQuePrometenBoton(m).filter((i) => !marcados.includes(i)).map((i) => `${m.id}, step ${i + 1}`);');
    expect(bandeja).toContain("Review not closed: these steps talk about a button and bring none.");
    expect(bandeja).toContain('const prometeBoton = pasosQuePrometenBoton(m).filter((i) => !marcados.includes(i));');
    // Y la regla está escrita en las dos versiones del formato del plan
    for (const f of ['plan-formats.md', 'plan-formats.es.md']) expect(readFileSync(join(__dirname, '../../docs/metodo/director', f), 'utf-8'), f).toContain('(`pasosQuePrometenBoton`)');
  });

  it('la bandeja lo avisa en cada misión abierta, salvo en los pasos ya marcados', () => {
    const bandeja = readFileSync(join(__dirname, '../../tools/director/bandeja.ts'), 'utf-8');
    expect(bandeja).toMatch(/const sinBoton = pasosSinBoton\(m\)\.filter\(\(i\) => !marcados\.includes\(i\)\);/);
    expect(bandeja).toContain('to a place without a button. Give ');
  });
});
