// Solo pantallas anchas (regla del titular, nota de voz nmvvkgk2qtit, 30 de octubre de 2026; la nota nmw1cmg9btit, del
// 3 de noviembre, bajó el mínimo de 1370 a 1350 para que abra en una pantalla de 1360): de 1350 píxeles en adelante; con
// menos, una cubierta tapa todo y pide una pantalla más ancha. No hay versión para teléfonos ni tabletas.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const leer = (...r: string[]) => readFileSync(join(__dirname, ...r), 'utf-8').replace(/\r\n/g, '\n');
const html = leer('..', '..', 'index.html');

describe('solo pantallas anchas, de 1350 píxeles en adelante', () => {
  it('con menos ancho, la cubierta tapa todo, encima incluso de la de carga, y dice qué hacer', () => {
    const estilo = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
    // Visible justo bajo 1350 píxeles, y no desde ahí: una pantalla de 1360 abre el Studio
    expect(estilo).toContain('@media (max-width: 1349.98px) { .cubierta-ancho { display: grid; } body { overflow: hidden; } }');
    const corte = Number(estilo.match(/@media \(max-width: ([\d.]+)px\) \{ \.cubierta-ancho/)?.[1]);
    expect(corte).toBeLessThan(1350);
    expect(corte).toBeGreaterThan(1349);
    expect(1360).toBeGreaterThan(corte);
    expect(estilo).not.toContain('1369.98px');
    expect(estilo).toMatch(/\.cubierta-ancho \{ position: fixed; inset: 0; z-index: 2147483001; display: none;/);
    // Encima de la cubierta de carga, que es lo más alto del Studio
    const carga = Number(estilo.match(/\.cubierta-carga \{[^}]*z-index: (\d+)/)?.[1]);
    const ancho = Number(estilo.match(/\.cubierta-ancho \{[^}]*z-index: (\d+)/)?.[1]);
    expect(ancho).toBeGreaterThan(carga);
    // En el HTML desde el primer instante, antes de todo lo demás, y con lo que hay que hacer
    expect(html.indexOf('<div class="cubierta-ancho" id="cubierta-ancho" role="alert">')).toBeLessThan(html.indexOf('<div class="cubierta-carga"'));
    // Su texto, de los diccionarios (pd_interfaz_ingles): index.html nombra la clave
    expect(html).toContain('<p data-tx="fijos.anchoTexto"></p>');
    expect(readFileSync(new URL('./textos/es.ts', import.meta.url), 'utf8')).toContain('al menos 1350 píxeles de ancho, o agranda esta ventana. No está hecho para teléfonos ni tabletas.');
  });

  it('la regla está escrita para el director y para quien llega', () => {
    expect(leer('..', '..', 'CLAUDE.md')).toContain('**Wide screens only**: at least 1350 px, no phone or tablet.');
    expect(leer('..', '..', 'README.md')).toContain('a screen at least 1350 pixels wide');
    expect(leer('..', '..', 'README.es.md')).toContain('una pantalla de al menos 1350 píxeles de ancho');
    expect(leer('..', '..', 'docs', 'metodo', 'diseno-studio.md')).toContain('at least 1350 pixels');
  });
});
