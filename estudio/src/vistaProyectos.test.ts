// La vista «Todos los proyectos», en su módulo (propuesta aceptada pr_partir_modulos): recibe lo que pinta y la página le
// da lo que depende de ella, así que se prueba con datos hechos a mano, sin la página.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { ResumenProyecto } from '../servidor/api';
import { vistaProyectos } from './vistaProyectos';

const proyecto = (x: Partial<ResumenProyecto>) => ({ id: 'a', nombre: 'Talleres', tipo: 'existente', objetivo: null, etapa: 'en_marcha', fase: 'MVP', porRevisar: 2, misionesAbiertas: 3, revisado: '', alerta: null, ...x }) as ResumenProyecto;

describe('«Todos los proyectos», aparte de app.ts (pr_partir_modulos)', () => {
  it('el activo, con su botón a las misiones; los demás, con «Activar»; y la tarjeta para entregar más', () => {
    const html = vistaProyectos({
      proyectos: [proyecto({ objetivo: '20 <talleres>', alerta: 'Cierra el viernes' }), proyecto({ id: 'b', nombre: 'Tesis', tipo: 'nuevo', etapa: 'objetivo' })],
      activo: 'a',
      nombreEtapa: (e) => (e === 'objetivo' ? 'Fijando la meta' : 'En marcha'),
      irAMisiones: '<button id="ir"></button>',
    });
    expect(html).toContain('<article class="tarjeta-proyecto activo">');
    expect(html).toContain('<span class="chip foco">Activo</span>');
    expect(html).toContain('Existente · En marcha · fase «MVP»');
    expect(html).toContain('<b>Meta:</b> 20 &lt;talleres&gt;');
    expect(html).toContain('⚠ Cierra el viernes');
    expect(html).toContain('<div class="acciones-p"><button id="ir"></button></div>');
    expect(html).toContain('Nuevo · Fijando la meta</p>');
    expect(html).toContain('data-activar="b"');
    expect(html).toContain('Sin revisiones todavía');
    expect(html).toContain('data-nuevo-proyecto');
  });

  it('app.ts la importa y ya no la pinta', () => {
    const director = readFileSync(new URL('./app.ts', import.meta.url), 'utf8');
    expect(director).toContain("import { vistaProyectos as vistaProyectosHtml } from './vistaProyectos';");
    expect(director).not.toContain('class="lista-proyectos"');
  });
});
