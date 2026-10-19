import { describe, expect, it } from 'vitest';
import { paginaSTL } from './stl';

// «Qué es STL» es un recorrido por paradas, con gráficos armados con coordenadas calculadas: una cuenta mal hecha deja
// un NaN o un undefined y el navegador lo dibuja roto sin avisar.
describe('Qué es STL', () => {
  const html = paginaSTL({ conProyectos: false });
  const paradas = [...html.matchAll(/data-parada="([^"]+)"/g)].map((m) => m[1]);

  it('arma los gráficos sin coordenadas rotas', () => {
    expect(html).not.toMatch(/NaN|undefined/);
    expect(html.match(/<svg/g)?.length).toBe(html.match(/<\/svg>/g)?.length);
  });

  it('es un recorrido: cada parada tiene su radio, su lugar en la barra y su regla para verse sola', () => {
    expect(paradas.length).toBeGreaterThanOrEqual(5);
    for (const id of paradas) {
      expect(html).toContain(`id="parada-${id}"`);
      expect(html).toContain(`.paradas-stl label[for="parada-${id}"]`);
      expect(html).toContain(`.parada-stl:not([data-parada="${id}"])`);
    }
    expect(html.match(/class="parada-radio"[^>]* checked/g)?.length).toBe(1);
  });

  it('todos los gráficos son del mismo estilo: sin imágenes aparte ni los gráficos viejos del ciclo y los actores', () => {
    expect(html).not.toMatch(/<img|grafico-ciclo|grafico-actores|\.svg/);
    expect(html).toContain('id="titulo-linea"');
    expect(html).toContain('id="titulo-linea-m"');
  });

  it('dibuja al director como una IA, no como una persona: la única persona del gráfico de la idea eres tú', () => {
    const idea = html.slice(html.indexOf('grafico-linea'), html.indexOf('</figure>', html.indexOf('grafico-linea')));
    expect(idea.match(/class="l-persona"/g)?.length).toBe(2);
    expect(idea).toContain('El director (IA)');
  });

  it('«Cuándo no aplica» trae solo los casos en que no aplica: ni «cuándo usarlo» ni depurar en vivo', () => {
    expect(html).toContain('Cuándo no aplica');
    expect(html).not.toMatch(/Cuándo usarlo|[Dd]epurar en vivo/);
  });

  it('explica STL sin compararlo con otras metodologías, y dice su novedad', () => {
    expect(html).not.toMatch(/Scrum|SDD|Spec Kit|BMad|Copilot|Cursor|Windsurf/);
    expect(paradas).toContain('novedad');
    expect(html).toContain('te quedas solo en el paso que sigue');
  });

  it('no repite ids (las flechas de cada gráfico apuntan a su propio marcador)', () => {
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
