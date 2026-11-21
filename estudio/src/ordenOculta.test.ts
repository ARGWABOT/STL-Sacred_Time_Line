// La orden de un paso sin ventana, en la interfaz (pd_sin_terminal): el botón, la pregunta de la primera vez, la línea del
// paso con la salida plegada y la línea de arriba con las órdenes de todo el Studio.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { botonCorrer, corridaDelPaso, lineaCritica, lineaDeArriba, lineaDelPaso, preguntaHtml, recienHechas, type CorridaVista } from './ordenOculta';
import { t } from './textos';

const leer = (f: string) => readFileSync(new URL(f, import.meta.url), 'utf8');
const corrida = (x: Partial<CorridaVista>): CorridaVista => ({ id: 'c1', proyecto: 'golf', mision: 't_a', paso: 0, orden: 'npm test', fase: 'corriendo', codigo: null, salida: '', inicio: 'x', fin: null, pideTiempo: false, callada: false, quedanMs: 1000, ...x });

describe('el paso con orden', () => {
  it('«Correr aquí» va antes de «Abrir la terminal con esta orden», y el resultado queda bajo la orden', () => {
    expect(botonCorrer('t_a|0')).toContain('data-correr="t_a|0"');
    expect(botonCorrer('t_a|0')).toContain(`>${t('oculta.correr')}</button>`);
    const app = leer('./app.ts');
    const orden = app.slice(app.indexOf('function ordenPaso('), app.indexOf('function ordenPaso(') + 3000);
    expect(orden.indexOf('${botonCorrer(clave)}')).toBeLessThan(orden.indexOf('data-terminal="${esc(clave)}"'));
    expect(orden).toContain('<div class="corrida-paso" data-corrida-de="${esc(clave)}">${htmlDelPaso(m.id, i)}</div>');
    expect(app).toContain('iniciarOrdenesOcultas({');
  });

  it('la primera vez pregunta «Hazlo ahora», «Hazlo ahora, y siempre en este proyecto» o «No»; sin tipo que recordar, sin «siempre»', () => {
    const c = { orden: 'npm run build', carpeta: 'C:/golf', ya: false, critica: false, seRecuerda: true, enVentana: false };
    const html = preguntaHtml('t_a|0', c, 'Golf');
    for (const que of ['ahora', 'siempre', 'no']) expect(html).toContain(`data-correr-si="t_a|0|${que}"`);
    expect(html).toContain(t('oculta.pregunta', { orden: 'npm run build', carpeta: 'C:/golf' }));
    expect(preguntaHtml('t_a|0', { ...c, seRecuerda: false }, 'Golf')).not.toContain('|siempre"');
  });

  it('la crítica dice antes qué corre, desde dónde y en qué proyecto (nmwpxsauntit)', () => {
    const c = { orden: 'git push origin main', carpeta: 'C:/golf', ya: false, critica: true, seRecuerda: true, enVentana: false };
    expect(preguntaHtml('t_a|0', c, 'Golf')).toContain(t('oculta.critica', { orden: 'git push origin main', carpeta: 'C:/golf', proyecto: 'Golf' }));
    expect(lineaCritica('git push origin main', 'C:/golf', 'Golf')).toContain('class="linea-critica"');
  });

  it('la línea del paso: corriendo, hecha o detenida, con la salida plegada; si falla, intentar de nuevo o la terminal (nmwpxonn0tit)', () => {
    expect(lineaDelPaso(null, 't_a|0')).toBe('');
    expect(lineaDelPaso(corrida({ salida: 'hola' }), 't_a|0')).toContain('<details class="salida-orden"><summary>');
    expect(lineaDelPaso(corrida({ fase: 'hecha', codigo: 0 }), 't_a|0')).toContain(t('oculta.hecha'));
    const fallo = lineaDelPaso(corrida({ fase: 'fallo', codigo: 1, salida: 'Error <x>' }), 't_a|0');
    expect(fallo).toContain('data-correr="t_a|0"');
    expect(fallo).toContain('data-terminal="t_a|0"');
    expect(fallo).toContain('Error &lt;x&gt;');
    // La nota de error ya está en el Buzón: la deja el servidor (nmwpz210xtit)
    expect(fallo).toContain(t('oculta.fallo', { codigo: 1 }));
  });

  it('la última corrida del paso es la de su proyecto, la más reciente primero', () => {
    const lista = [corrida({ id: 'c3', proyecto: 'tenis' }), corrida({ id: 'c2' }), corrida({ id: 'c1', fase: 'hecha' })];
    expect(corridaDelPaso(lista, 'golf', 't_a', 0)?.id).toBe('c2');
    expect(corridaDelPaso(lista, 'golf', 't_a', 1)).toBeNull();
  });

  it('la que terminó bien marca su paso una sola vez', () => {
    const lista = [corrida({ id: 'c1', fase: 'hecha' }), corrida({ id: 'c2', fase: 'hecha', proyecto: 'tenis' }), corrida({ id: 'c3', fase: 'fallo' })];
    expect(recienHechas(lista, 'golf', new Set()).map((c) => c.id)).toEqual(['c1']);
    expect(recienHechas(lista, 'golf', new Set(['c1']))).toEqual([]);
  });
});

describe('la línea de arriba (nmwpxrr3ctit)', () => {
  const nombres = { golf: 'Golf', tenis: 'Tenis' };
  it('vacía si nada corre; con una, la nombra con su proyecto y «Detener»', () => {
    expect(lineaDeArriba({ corridas: [corrida({ fase: 'hecha' })], enMarcha: 0, nombres })).toBe('');
    const una = lineaDeArriba({ corridas: [corrida({})], enMarcha: 1, nombres });
    expect(una).toContain(t('oculta.lineaUna'));
    expect(una).toContain('Golf');
    expect(una).toContain('data-detener-orden="c1"');
    expect(una).not.toContain('data-mas-tiempo');
  });
  it('cuenta las de todos los proyectos, cada una con el suyo (nmwqknqadtit)', () => {
    const varias = lineaDeArriba({ corridas: [corrida({ id: 'a' }), corrida({ id: 'b', proyecto: 'tenis' })], enMarcha: 2, nombres });
    expect(varias).toContain(t('oculta.lineaVarias', { n: 2 }));
    expect(varias).toContain('Tenis');
    const muchas = lineaDeArriba({ corridas: ['a', 'b', 'c', 'd', 'e'].map((id) => corrida({ id })), enMarcha: 5, nombres });
    expect(muchas).toContain(t('oculta.yMas', { n: 2 }));
  });
  it('a los 10 minutos, «Darle 10 minutos más»; callada 3 minutos, el aviso y la terminal (nmwqkmuivtit, nmwqkn8m1tit)', () => {
    const larga = lineaDeArriba({ corridas: [corrida({ pideTiempo: true })], enMarcha: 1, nombres });
    expect(larga).toContain('data-mas-tiempo="c1"');
    expect(larga).toContain(t('oculta.mas'));
    const callada = lineaDeArriba({ corridas: [corrida({ callada: true })], enMarcha: 1, nombres });
    expect(callada).toContain(t('oculta.callada'));
    expect(callada).toContain('data-a-ventana="c1"');
  });
});
