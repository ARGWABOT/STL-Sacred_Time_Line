import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import planPlantilla from '../../plantilla/plan.json';
import { estadoVacio, TITULAR, type Plan } from '../../src/director/director';
import { fichaPersona } from './personCard';

const plan = planPlantilla as unknown as Plan;
const ctx = { plan, estado: estadoVacio(), senales: {} };

describe('la ficha de una persona, en su propio módulo (pr_partir_modulos)', () => {
  it('pinta quién es, su nivel y sus logros, y «Tú» solo para quien mira', () => {
    const html = fichaPersona({ persona: TITULAR, nombre: 'leonc', esYo: true, ctx, equipo: [], arranque: 'en_marcha' });
    expect(html).toContain('<div class="monograma">l</div>');
    expect(html).toContain('<b>leonc <span class="chip foco">Tú</span></b><span>Dirige el proyecto: tiene la última palabra.</span>');
    expect(html).toContain('<b>Nivel ');
    expect(html).toContain('class="logros-p"');
    // En marcha, el foco de la semana; sin commits propios, lo dice
    expect(html).toContain('Foco de la semana: sin commits propios en 7 días');
    const otra = fichaPersona({ persona: TITULAR, nombre: 'leonc', esYo: false, ctx, equipo: [], arranque: 'diagnostico' });
    expect(otra).not.toContain('chip foco');
    // En el arranque todos los frentes esperan: sin foco
    expect(otra).not.toContain('Foco de la semana');
  });

  it('app.ts ya no la pinta: le da sus datos al módulo', () => {
    const director = readFileSync(join(__dirname, 'app.ts'), 'utf-8');
    expect(director).not.toContain('function insignias(');
    expect(director).toContain("import { fichaPersona as fichaDePersona } from './personCard';");
    expect(director).toContain('return fichaDePersona({ persona: p, nombre: nombrePersona(p), esYo: d.identidad.rol === p, ctx: ctx(), equipo: d.proyecto.equipo, arranque: d.arranque });');
  });
});
