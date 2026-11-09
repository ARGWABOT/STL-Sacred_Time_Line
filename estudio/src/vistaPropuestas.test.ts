// La vista «Propuestas», en su módulo (propuesta aceptada pr_partir_modulos): recibe lo que pinta y la página le da lo que
// depende de ella, así que se prueba con datos hechos a mano, sin la página.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { EstadoDirector, Plan } from '../../src/director/director';
import { vistaPropuestas, type DatosPropuestas } from './vistaPropuestas';

const propuesta = (id: string, fase: string) => ({ id, fase, area: 'Interfaz', titulo: `La ${id}`, problema: 'Un <problema>', propuesta: 'Lo que se hace', conecta: 'Con todo' });
const plan = {
  fases: [{ id: 'a', nombre: 'Fase A' }, { id: 'b', nombre: 'Fase B' }],
  propuestas: [propuesta('p1', 'a'), propuesta('p2', 'a'), propuesta('p3', 'b')],
} as unknown as Plan;
const estado = {
  propuestas: { p2: { estado: 'aceptada', quien: 'ana', fecha: '2026-10-20' } },
  notas: [{ id: 'n1', sobre: { tipo: 'propuesta', id: 'p1' } }],
} as unknown as EstadoDirector;
const datos = (x: Partial<DatosPropuestas> = {}): DatosPropuestas => ({
  plan, estado,
  faseAbierta: (id) => id === 'a',
  propuestaPasada: (id) => id === 'p2',
  verPasadas: false, nombreTitular: 'Ana', esTitular: true,
  tarjetaNota: (n, id) => `<li data-nota="${n.id}" data-sobre="${id}"></li>`,
  ...x,
});

describe('«Propuestas», aparte de app.ts (pr_partir_modulos)', () => {
  it('lo que espera respuesta, con sus botones y sus notas; lo decidido, fuera hasta pedir «Todas»; lo futuro, contado', () => {
    const html = vistaPropuestas(datos());
    expect(html).toContain('<b>1</b> espera respuesta · 1 ya decidida');
    expect(html).toContain('data-ancla="propuesta-p1"');
    expect(html).not.toContain('data-ancla="propuesta-p2"');
    expect(html).not.toContain('data-ancla="propuesta-p3"');
    expect(html).toContain('<dd>Un &lt;problema&gt;</dd>');
    expect(html).toContain('<li data-nota="n1" data-sobre="p1"></li>');
    expect(html).toContain('data-responder="p1|aceptada"');
    expect(html).toContain('1 propuestas más esperan su fase.');
    const todas = vistaPropuestas(datos({ verPasadas: true }));
    expect(todas).toContain('<span class="chip foco">Aceptada</span>');
    expect(todas).toContain('Aceptada por ana el');
    expect(todas.indexOf('propuesta-p1')).toBeLessThan(todas.indexOf('propuesta-p2'));
  });

  it('solo el titular acepta o descarta; sin nada por decidir, el estado vacío', () => {
    expect(vistaPropuestas(datos({ esTitular: false }))).not.toContain('data-responder');
    expect(vistaPropuestas(datos({ propuestaPasada: () => true }))).toContain('Estás al día: ninguna espera respuesta');
    expect(vistaPropuestas(datos({ faseAbierta: () => false }))).toContain('Todavía no hay propuestas en la fase en curso');
  });

  // Una lista a todo el ancho: cada propuesta es una línea que se despliega, y solo una abierta a la vez (nota de voz nmvvb1vpttit)
  it('cada propuesta es un «details» con el mismo «name» (una abierta a la vez), con su título en el resumen y su ancla', () => {
    const html = vistaPropuestas(datos({ propuestaPasada: () => false }));
    const lineas = html.match(/<details class="propuesta[^>]*>/g) ?? [];
    expect(lineas).toHaveLength(2);
    for (const id of ['p1', 'p2']) {
      expect(lineas.some((l) => l.includes('name="propuestas"') && l.includes(`data-ancla="propuesta-${id}"`))).toBe(true);
      expect(html).toMatch(new RegExp(`<summary><b>La ${id}</b><span class="chip">Interfaz</span>`));
    }
    // Ya no son tarjetas en una rejilla: sin «article», y lo de dentro (problema, firma, botones) queda tras el resumen
    expect(html).not.toContain('<article class="propuesta');
    expect(html.indexOf('</summary>')).toBeLessThan(html.indexOf('<dl>'));
    expect(html.indexOf('<summary>')).toBeLessThan(html.indexOf('data-responder="p1|aceptada"'));
    // Ninguna nace abierta: se abre la que se toca, o la que lleva el ancla
    expect(lineas.some((l) => /\bopen\b/.test(l))).toBe(false);
    // La que tienes abierta sigue abierta al repintar (al aceptarla o comentarla), y solo ella
    const repintada = (vistaPropuestas(datos({ propuestaPasada: () => false, abierta: 'p2' })).match(/<details class="propuesta[^>]*>/g) ?? []).filter((l) => /\bopen\b/.test(l));
    expect(repintada).toEqual([expect.stringContaining('data-ancla="propuesta-p2"')]);
    const director = readFileSync(new URL('./app.ts', import.meta.url), 'utf8');
    expect(director).toContain('abierta: propuestaAbierta,');
    expect(director).toContain(`det.matches('details.propuesta[name="propuestas"]')`);
  });

  // Un paso que lleva a `propuesta-<id>` baja a esa propuesta y la despliega dentro de la lista, sin otra vista aparte
  // (nmw7xzehktit: se revirtió el modo enfoque de las propuestas y queda el acordeón)
  it('el ancla `propuesta-<id>` es el propio «details»: al llegar con un botón, se despliega en el acordeón', () => {
    const html = vistaPropuestas(datos({ propuestaPasada: () => false }));
    expect(html).toMatch(/<details class="propuesta[^"]*" name="propuestas" data-ancla="propuesta-p2"/);
    const director = readFileSync(new URL('./app.ts', import.meta.url), 'utf8');
    // El ancla pendiente se busca por `data-ancla`, se resalta, y lo resaltado que es un plegable se abre
    expect(director).toContain('v.querySelector<HTMLElement>(`[data-ancla="${CSS.escape(anclaPendiente)}"]`)');
    expect(director).toContain('if (el instanceof HTMLDetailsElement) el.open = true;');
    // Al abrirse, queda como la abierta: un repintado no la pliega
    expect(director).toContain('if (det.open) propuestaAbierta = id;');
    // Ni modo aparte ni «‹ Anterior» / «Siguiente ›»
    expect(html).not.toContain('data-enfocar-propuesta');
    expect(html).not.toContain('data-pasar-propuesta');
    expect(director).not.toContain('propuestaEnfocada');
  });

  it('app.ts la importa y ya no la pinta', () => {
    const director = readFileSync(new URL('./app.ts', import.meta.url), 'utf8');
    expect(director).toContain("from './vistaPropuestas';");
    expect(director).toContain('return vistaPropuestasHtml({');
    expect(director).not.toContain('const NOMBRE_RESPUESTA:');
    expect(director).not.toContain('Para decidir en «');
  });
});
