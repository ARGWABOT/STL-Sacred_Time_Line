import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { t } from './textos';

const leer = (ruta: string) => readFileSync(join(__dirname, ruta), 'utf-8');
const director = leer('app.ts');
// La vista «Documentos» se pinta en su módulo (pr_partir_modulos)
const documentos = leer('vistaDocumentos.ts');
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
    expect(documentos).toContain('<details class="ya-leido-doc"');
  });

  it('las partes de la columna de los documentos tienen su ancla, para que un paso lleve directo a ellas', () => {
    expect(documentos).toContain('<details class="otros-docs" data-ancla="d-otros"');
    expect(documentos).toContain('<details class="instrucciones-agentes" data-ancla="d-agentes"');
    // Los archivos clave del proyecto, dentro de «Documentación del proyecto» y antes de «Del repositorio del proyecto»
    expect(documentos).toContain('<div class="archivos-clave" data-ancla="d-clave">');
    const columna = documentos.slice(documentos.indexOf('export function vistaDocumentos'), documentos.indexOf('if (!doc) return `<div class="docs">'));
    expect(columna.indexOf('${archivosClave}')).toBeGreaterThan(columna.indexOf('data-ancla="d-otros"'));
    expect(columna.indexOf('${archivosClave}')).toBeLessThan(columna.indexOf("<h3>${t('docs.delRepo')}</h3>"));
    expect(documentos).toContain('data-doc="${esc(`repo:${c.ruta}`)}" title="${esc(c.para)}"');
    expect(documentos).toContain(`data-ancla="\${cual === 'despues' ? 'd-despues' : 'd-leidos'}"`);
  });

  it('una misión aprobada se abre en «La ruta» para releerla: sus pasos, lo comentado con su respuesta y el veredicto', () => {
    const ruta = leer('vistaRuta.ts');
    expect(ruta).toContain(`<details class="mision-pasada" data-ancla="pasada-\${esc(m.id)}"\${plegable(\`pasada|\${m.id}\`)}>`);
    expect(ruta).toMatch(/e === 'aprobada'\s*\? `<li><details class="mision-pasada"/);
    const pasada = director.match(/function misionPasada\([^)]*\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    // Los pasos sin casillas (solo se leen), con lo que eligió; las notas con algo dicho, con su respuesta; el veredicto
    expect(pasada).toContain('listaDePasos(m, false, m.pasos.map((_, i) => i))');
    expect(pasada).toContain("n.sobre.tipo === 'mision' && n.sobre.id === m.id");
    expect(pasada).toContain('tarjetaNota(n)');
    expect(pasada).toContain('d.plan.revisiones[m.id]');
    expect(css).toContain('.mision-pasada > summary { cursor: pointer; }');
  });

  it('una misión entregada no se retira ni se comenta: un clic despliega su resumen, sin modelo (nmvt4w3wgtit)', () => {
    // La tarjeta de la misión, en su módulo (pr_partir_modulos)
    const tarjeta = leer('missionCard.ts').match(/function tarjetaMision\([^)]*\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    const entregada = tarjeta.slice(tarjeta.indexOf("if (e === 'entregada')"), tarjeta.indexOf('const hechos'));
    expect(entregada).toContain('<details class="mision-c plegada entregada mision-pasada');
    expect(entregada).toContain('${misionPasada(m)}');
    expect(entregada).not.toContain('data-deshacer-entrega');
    expect(entregada).not.toContain('data-comentar');
    const pasada = director.match(/function misionPasada\([^)]*\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(pasada).not.toContain('data-comentar');
    expect(director).not.toContain('«Comentar al director» en la misión');
  });

  it('una propuesta de «La ruta» es solo su resumen, con el botón a «Propuestas», donde se lee y se decide (nmvv433cxtit); lo aprobado de una fase futura se ve en ella', () => {
    const fila = director.match(/function filaPropuesta\([^)]*\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(fila).toContain('<li class="propuesta-resumen" data-ancla="propuesta-${esc(p.id)}">');
    expect(fila).toContain("botonIr({ vista: 'propuestas', ancla: `propuesta-${p.id}`, etiqueta: tx('ruta.verEnPropuestas') }, 'enlace')");
    expect(fila).toContain('faseAbierta(p.fase)');
    // El texto entero de la propuesta, nunca: ese está en «Propuestas»
    expect(fila).not.toContain('${esc(p.propuesta)}');
    expect(fila).toContain('${esc(hecha.nota)}');
    const ruta = leer('vistaRuta.ts');
    expect(ruta).toContain('const aprobadas = abierta ? [] : aprobadasDeFase(plan, estado, f.id);');
    expect(ruta).toContain('data-ancla="r-aprobadas"');
    expect(ruta).toContain('- aprobadas.length');
  });

  it('plegado, «Ya leído» dice que lo leído está ahí y cómo releerlo; abierto, ya no hace falta decirlo', () => {
    expect(documentos).toContain("t('docs.ayudaLeido', { n: nLeidas })");
    expect(documentos).toContain("t('docs.leisteTodo', { resto: ayudaDeLeidas })");
    expect(t('docs.ayudaLeido', { n: 3 })).toBe('las 3 partes que leíste están aquí, plegadas. Ábrelas para releerlas.');
    expect(t('docs.leisteTodo', { resto: 'x' })).toBe('Ya leíste todo el documento: x');
    expect(documentos).toContain('<span class="ayuda-leido">${ayudaLeido}</span>');
    expect(css).toContain('.ya-leido-doc[open] > summary .ayuda-leido { display: none; }');
  });
});
