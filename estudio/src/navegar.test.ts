import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const leer = (ruta: string) => readFileSync(join(__dirname, ruta), 'utf-8');
const director = leer('director.ts');
const css = leer('director.css');

describe('lo que señala un botón se ve, aunque esté plegado (notas de voz del titular, 22 de octubre de 2026)', () => {
  it('resaltar despliega lo señalado y cada plegable que lo contiene, y la columna de los documentos si estaba plegada', () => {
    const resaltar = director.match(/function resaltar\([^)]*\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(resaltar).toContain('abrirPlegados(el);');
    // Antes de llevar la ventana hasta él: si no, se mide escondido
    expect(resaltar.indexOf('abrirPlegados(el)')).toBeLessThan(resaltar.indexOf('mostrarEntero(el)'));
    const abrir = director.match(/function abrirPlegados\([^)]*\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(abrir).toContain("if (el instanceof HTMLDetailsElement) el.open = true;");
    expect(abrir).toMatch(/for \(let p = el\.parentElement\?\.closest\('details'\); p; p = p\.parentElement\?\.closest\('details'\)\) p\.open = true;/);
    expect(abrir).toContain("docs.classList.remove('sin-lista')");
  });

  it('la parte de un documento ya leída, pedida por un paso, se abre: está dentro de «Ya leído», que se despliega', () => {
    // El paso que lleva a una parte la resalta con resaltar, que abre «Ya leído»
    expect(director).toMatch(/if \(irASeccion && parte && !cerrada\) resaltar\(parte\);/);
    expect(director).toContain('<details class="ya-leido-doc"');
  });

  it('las partes de la columna de los documentos tienen su ancla, para que un paso lleve directo a ellas', () => {
    expect(director).toContain('<details class="otros-docs" data-ancla="d-otros"');
    expect(director).toContain('<details class="instrucciones-agentes" data-ancla="d-agentes"');
    expect(director).toContain(`data-ancla="\${titulo === 'Después' ? 'd-despues' : 'd-leidos'}"`);
  });

  it('plegado, «Ya leído» dice que lo leído está ahí y cómo releerlo; abierto, ya no hace falta decirlo', () => {
    expect(director).toContain('las ${nLeidas} partes que leíste están aquí, plegadas. Ábrelas para releerlas');
    expect(director).toContain("'Ya leíste todo el documento: '");
    expect(director).toContain('<span class="ayuda-leido">${ayudaLeido}</span>');
    expect(css).toContain('.ya-leido-doc[open] > summary .ayuda-leido { display: none; }');
  });
});
