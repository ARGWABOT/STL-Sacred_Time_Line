import { describe, expect, it } from 'vitest';
import type { Plan } from '../../src/director/director';
import { historiaPorMes, nombreDelMes, porMes, resumenCorto, terminados } from './historiaPorMes';
import { ponerIdioma } from './textos';

const plan = {
  linea: { desde: '2026-11-19T00:00:00.000Z', fasesAntes: [] },
  fases: [],
  misiones: [
    { id: 't_vieja', titulo: 'See the old thing', pasos: [] },
    { id: 't_nueva', titulo: 'See the new thing', pasos: [] },
    { id: 't_abierta', titulo: 'Still open', pasos: [] },
  ],
  revisiones: {
    t_vieja: { cuando: '2026-10-30T10:00:00.000Z', veredicto: 'aprobada', comentario: '' },
    t_nueva: { cuando: '2026-11-19T10:00:00.000Z', veredicto: 'aprobada', comentario: '' },
  },
  pedidos: [
    { id: 'pd_hecho', fase: 'meta', texto: 'Each point whole. And a long story after it that is not shown.', hecho: { cuando: '2026-11-18T10:00:00.000Z', nota: 'x' } },
    { id: 'pd_abierto', fase: 'meta', texto: 'Not done' },
  ],
  propuestas: [{ id: 'pr_x', titulo: 'A proposal carried out', fase: 'meta' }],
  ejecutadas: { pr_x: { cuando: '2026-10-02T10:00:00.000Z', nota: 'y' } },
} as unknown as Plan;

describe('«History»: what was finished first, by month, and the roadmap folded below (nmwmyzj4etit)', () => {
  it('lists approved missions, requests done and proposals carried out, the newest first, and nothing open', () => {
    const t = terminados(plan);
    expect(t.map((x) => x.id)).toEqual(['t_nueva', 'pd_hecho', 't_vieja', 'pr_x']);
    expect(t.find((x) => x.id === 'pd_hecho')!.titulo).toBe('Each point whole');
  });

  it('groups them by month, the newest month first', () => {
    expect(porMes(terminados(plan)).map((m) => [m.mes, m.cosas.length])).toEqual([['2026-11', 2], ['2026-10', 2]]);
  });

  it('a long text is cut at its first full stop or at 140 letters', () => {
    expect(resumenCorto('One. Two.')).toBe('One');
    expect(resumenCorto('x'.repeat(200))).toHaveLength(140);
  });

  it('paints the months first, the newest open, and the roadmap folded under them', () => {
    ponerIdioma('en');
    const html = historiaPorMes(plan, '<div data-ancla="r-plan">ROADMAP</div>', () => '');
    expect(html.indexOf('What was finished, by month')).toBeLessThan(html.indexOf('ROADMAP'));
    expect(html).toContain(`<details class="historia-mes" data-mes="2026-11" open>`);
    expect(html).toContain(`<details class="historia-mes" data-mes="2026-10">`);
    expect(html).toMatch(/<details class="hoja-de-ruta" data-ancla="r-hoja"><summary>The roadmap<\/summary><div data-ancla="r-plan">ROADMAP/);
    expect(nombreDelMes('2026-11')).toBe('November 2026');
    expect(html).not.toContain('Still open');
  });

  it('with nothing finished, it says so, and the roadmap is still there', () => {
    ponerIdioma('es');
    const html = historiaPorMes({ ...plan, misiones: [], pedidos: [], propuestas: [] } as Plan, 'HOJA', () => ' open');
    expect(html).toContain('Todavía no hay nada terminado.');
    expect(html).toContain('<summary>La hoja de ruta</summary>HOJA');
  });
});
