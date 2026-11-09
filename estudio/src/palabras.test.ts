// Las palabras de STL (pr_palabras): cada una con su sola frase, la misma que aprobó el titular en sus documentos sellados,
// en español y en inglés.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { esc } from './util';
import { ayudaDePalabra, conAyuda, CON_AYUDA, GLOSARIO, lineaDePalabra, SOLO_AYUDA } from './palabras';
import { en } from './textos/en';
import { es } from './textos/es';
import { ponerIdioma } from './textos';

afterEach(() => ponerIdioma('es'));

const raiz = join(import.meta.dirname, '..', '..');
// Los documentos donde el titular las aprobó, en la memoria del proyecto (si está en este computador)
const documento = (nombre: string) => join(raiz, '.stl', 'docs', 'director', nombre);
/** Las frases de un documento: cada punto «- **Nombre:** frase». */
const frasesDe = (texto: string) => new Map([...texto.matchAll(/^- \*\*([^*]+):\*\* (.+)$/gm)].map((m) => [m[1], m[2].trim()]));

describe('las palabras de STL, con su frase (pr_palabras)', () => {
  it('son dieciséis: las doce del glosario y las cuatro que solo lleva el «?», sin repetirse', () => {
    expect(GLOSARIO).toHaveLength(12);
    expect(SOLO_AYUDA).toEqual(['frente', 'reserva', 'criterio', 'sello']);
    expect(new Set([...GLOSARIO, ...SOLO_AYUDA]).size).toBe(16);
    // Las del «?» en el Studio son de esas dieciséis
    for (const id of CON_AYUDA) expect([...GLOSARIO, ...SOLO_AYUDA]).toContain(id);
  });

  it('cada una tiene su nombre y su frase en español y en inglés', () => {
    for (const id of [...GLOSARIO, ...SOLO_AYUDA]) {
      for (const tabla of [es, en] as Record<string, unknown>[]) {
        expect(tabla[`palabra.${id}.nombre`], id).toBeTruthy();
        expect(String(tabla[`palabra.${id}.frase`]), id).toMatch(/\.$/);
      }
    }
  });

  it('dicen la frase que aprobó el titular, tal como está en sus documentos', () => {
    const doce = documento('palabras-stl.md'), cuatro = documento('palabras-en-una-frase.md');
    if (!existsSync(doce) || !existsSync(cuatro)) return;   // sin la memoria del proyecto en este computador, no hay con qué comparar
    const aprobadas = new Map([...frasesDe(readFileSync(doce, 'utf8')), ...frasesDe(readFileSync(cuatro, 'utf8'))]);
    expect(aprobadas.size).toBe(16);
    for (const id of [...GLOSARIO, ...SOLO_AYUDA]) {
      const { nombre, frase } = ayudaDePalabra(id);
      expect(aprobadas.get(nombre), nombre).toBe(frase);
    }
  });

  it('la línea del «?» y del glosario es «Nombre: frase», en el idioma de la interfaz', () => {
    expect(lineaDePalabra('sello')).toBe('Sello: la marca de un documento que ya revisaste: no vuelve a cambiar, y lo nuevo te llega aparte, en un documento corto.');
    ponerIdioma('en');
    expect(lineaDePalabra('frente')).toMatch(/^Front: a part of the project/);
  });
});

describe('el «?» de cada palabra, siempre puesto (pr_palabras, nmw5f1q72tit)', () => {
  it('conAyuda da el botón de cada palabra con su línea, en el globo y en el aria-label', () => {
    for (const id of CON_AYUDA) {
      const html = conAyuda(id);
      expect(html).toContain(`data-palabra="${id}"`);
      expect(html).toContain('class="ayuda-palabra"');
      expect(html).toContain('role="tooltip"');
      expect(html).toContain('aria-expanded="false"');
      expect(html).toContain(esc(lineaDePalabra(id)));
    }
  });

  it('no tiene condición de primera vez: dos llamadas dan lo mismo', () => {
    expect(conAyuda('fase')).toBe(conAyuda('fase'));
  });

  it('en inglés dice la línea en inglés', () => {
    ponerIdioma('en');
    expect(conAyuda('director' as never)).toBe('');   // fuera de CON_AYUDA no hay «?»
    expect(conAyuda('sello')).toContain('Seal: ');
  });

  it('las vistas lo ponen en sus rótulos', () => {
    const fuente = (f: string) => readFileSync(join(import.meta.dirname, f), 'utf8');
    const tarjeta = fuente('missionCard.ts'), ruta = fuente('vistaRuta.ts'), propuestas = fuente('vistaPropuestas.ts'), app = fuente('app.ts');
    for (const p of ['mision', 'reserva']) expect(tarjeta).toContain(`conAyuda('${p}')`);
    for (const p of ['fase', 'criterio', 'pedido', 'propuesta', 'frente']) expect(ruta).toContain(`conAyuda('${p}')`);
    expect(propuestas).toContain("conAyuda('propuesta')");
    expect(app).toContain("conAyuda('puerta')");
    expect(app).toContain("from './palabras'");
    // Las cuatro que faltaban, cada una en un rótulo propio del Studio: «Pedir revisión», el Buzón, lo ya leído (sellado) y el frente
    expect(app).toContain("</button>${conAyuda('revision')}${seguidas}");
    expect(fuente('vistaBuzon.ts')).toContain("<summary>${t('buzon.queEs')}${conAyuda('buzon')}</summary>");
    expect(fuente('vistaDocumentos.ts')).toContain("${cual === 'leidos' ? conAyuda('sello') : ''}</summary>");
    expect(ruta).toContain("<h3>${t('ruta.adelantado')}${conAyuda('frente')}</h3>");
  });

  it('las once palabras de CON_AYUDA llevan su «?» en algún rótulo del Studio', () => {
    const fuentes = ['missionCard.ts', 'vistaRuta.ts', 'vistaPropuestas.ts', 'app.ts', 'vistaBuzon.ts', 'vistaDocumentos.ts'].map((f) => readFileSync(join(import.meta.dirname, f), 'utf8')).join('\n');
    for (const id of CON_AYUDA) expect(fuentes, id).toContain(`conAyuda('${id}')`);
    expect(CON_AYUDA).toHaveLength(11);
  });

  it('con un clic se fija y se suelta; Esc y un clic fuera lo cierran', () => {
    const fuente = readFileSync(join(import.meta.dirname, 'palabras.ts'), 'utf8');
    expect(fuente).toContain("classList.toggle('fija')");
    expect(fuente).toContain("e.key === 'Escape'");
  });
});
