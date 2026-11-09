import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { barraRutaDelgada, pestanasHoy, vistaHoyEnRuta, type FaseEnBarra } from './hoyEnRuta';

const leer = (ruta: string) => readFileSync(join(__dirname, ruta), 'utf-8').replace(/\r\n/g, '\n');
const fases: FaseEnBarra[] = [
  { id: 'base', nombre: 'La base', situacion: 'superada', avance: 1, vista: false },
  { id: 'claro', nombre: 'Se entiende de un vistazo', situacion: 'actual', avance: 0.4, vista: true },
  { id: 'publico', nombre: 'Público', situacion: 'futura', avance: 0, vista: false },
];

// «Hoy» y «La ruta», una sola interfaz (pedido pd_hoy_en_ruta, decisiones del titular nmw0zzda1tit y nmw0zzx7itit)
describe('«Hoy» y «La ruta», una sola vista', () => {
  it('la barra delgada dice siempre en qué fase vas y cuánto lleva, y cada fase es un botón a su pestaña auxiliar', () => {
    const html = barraRutaDelgada(fases);
    expect(html).toContain('Fase 1 · Se entiende de un vistazo');
    expect(html).toContain('lleva 40 %');
    for (const f of fases) expect(html).toContain(`data-fase="${f.id}"`);
    expect(html).toContain('aria-current="true"');
    expect(barraRutaDelgada([])).toBe('');
  });

  it('dos pestañas: «Tu misión» (la vista de Hoy) y «Datos del proceso» (la de la ruta)', () => {
    const html = pestanasHoy('proceso');
    expect(html).toContain('data-ir="misiones"');
    expect(html).toContain('data-ir="ruta"');
    expect(html).toMatch(/class="pestana-stl sel" data-ir="ruta" aria-selected="true"/);
    const vista = vistaHoyEnRuta({ fases, pestana: 'mision', cuerpo: '<p>la misión</p>' });
    expect(vista.indexOf('ruta-delgada')).toBeLessThan(vista.indexOf('<p>la misión</p>'));
  });

  it('la página: «Hoy» y la ruta usan la misma vista; un clic en una fase abre «Datos del proceso»; sin la ruta en la barra lateral', () => {
    const app = leer('app.ts');
    expect(app).toContain("return vistaHoyEnRuta({ fases: fasesEnBarra(), pestana: 'mision', cuerpo: vistaHoy(datosHoy()) });");
    expect(app).toContain("return vistaHoyEnRuta({ fases: fasesEnBarra(), pestana: 'proceso', cuerpo: vistaRutaHtml({");
    expect(app).toContain("if (vista !== 'ruta') irA('ruta');");
    const grupos = app.slice(app.indexOf('function gruposNav()'), app.indexOf('function gruposNav()') + 900);
    expect(grupos).not.toContain("(['ruta',");
  });

  it('sin la cuenta de la reserva ni los frentes a la vista', () => {
    expect(leer('queuePanel.ts')).not.toContain('reserva-m');
    expect(leer('vistaRuta.ts')).not.toContain("t('ruta.frentes')");
  });
});
