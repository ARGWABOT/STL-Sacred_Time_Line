import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import planPlantilla from '../../plantilla/plan.json';
import { estadoVacio, reservaDeMisiones, type Mision, type Plan, type TareaDelDirector } from '../../src/director/director';
import { COLA_DIRECTOR_A_LA_VISTA, colaDelDirectorHtml, esperanAlDirector, misionesQueSiguen, nombreCortoDeTarea } from './colaDirector';

const pedido = (id: string, titulo: string): TareaDelDirector => ({ id, tipo: 'pedido', titulo, fase: 'replicable' });
const propuesta = (id: string, titulo: string): TareaDelDirector => ({ id, tipo: 'propuesta', titulo, fase: 'replicable' });

describe('la cola del director en «Lo que sigue»', () => {
  it('de un pedido muestra su primera frase, hasta los dos puntos o el punto', () => {
    expect(nombreCortoDeTarea(pedido('pd_a', 'Preguntas dentro del Buzón: un solo centro de lo que hablas.'))).toBe('Preguntas dentro del Buzón');
    expect(nombreCortoDeTarea(pedido('pd_b', 'El README e INSTALAR.md al día. Y que digan más.'))).toBe('El README e INSTALAR.md al día');
    expect(nombreCortoDeTarea(pedido('pd_c', 'Un pedido de una sola frase.'))).toBe('Un pedido de una sola frase');
  });

  it('de una propuesta, su título tal cual', () => {
    expect(nombreCortoDeTarea(propuesta('pr_a', 'Los permisos, al momento'))).toBe('Los permisos, al momento');
  });

  it('recorta lo largo, y el texto entero queda al pasar el ratón', () => {
    const largo = `${'palabra '.repeat(30)}fin`;
    const corto = nombreCortoDeTarea(pedido('pd_l', largo), 40);
    expect(corto.length).toBe(40);
    expect(corto.endsWith('…')).toBe(true);
    expect(colaDelDirectorHtml([pedido('pd_l', largo)])).toContain(`title="${largo}"`);
  });

  it('las cinco primeras a la vista, en su orden, y el resto con «Ver toda la cola»', () => {
    const cola = Array.from({ length: 7 }, (_, i) => propuesta(`pr_${i}`, `Tarea ${i + 1}`));
    const html = colaDelDirectorHtml(cola);
    const [vista, plegada] = html.split('cola-dir-resto');
    expect(COLA_DIRECTOR_A_LA_VISTA).toBe(5);
    for (let i = 1; i <= 5; i++) expect(vista).toContain(`Tarea ${i}<`);
    expect(vista).not.toContain('Tarea 6<');
    expect(plegada).toContain('Ver toda la cola (2 más)');
    expect(plegada).toContain('start="6"');
    expect(plegada.indexOf('Tarea 6<')).toBeLessThan(plegada.indexOf('Tarea 7<'));
  });

  it('con cinco o menos no hay «Ver toda la cola», y sin cola no se muestra nada', () => {
    expect(colaDelDirectorHtml([propuesta('pr_a', 'Una')])).not.toContain('Ver toda la cola');
    expect(colaDelDirectorHtml([])).toBe('');
  });

  it('escapa lo que viene del plan', () => {
    const html = colaDelDirectorHtml([propuesta('pr_x', '<b>raro</b> & "comillas"')]);
    expect(html).not.toContain('<b>raro</b>');
    expect(html).toContain('&lt;b&gt;raro&lt;/b&gt; &amp; &quot;comillas&quot;');
  });

  it('«Lo que sigue» cuenta y lista las encadenadas con despuesDe, como la reserva (nota nmvvalvdttit)', () => {
    // Como el plan del 30 de octubre de 2026: una abierta y nueve encadenadas, cada una después de la anterior; el título
    // decía «0 misiones más» con «Reserva: 10» al lado, porque contaba solo las abiertas
    const plan = planPlantilla as unknown as Plan;
    const base: Mision = { id: 't_0', para: 'titular', fase: 'arranque', frente: 'direccion', xp: 10, titulo: 'Misión', porQue: 'Por qué', pasos: ['Hazlo'], entrega: 'Hecho' };
    // En el plan, en desorden: el orden en que aparecen lo da la cadena, no el lugar en la lista
    const cadena = Array.from({ length: 10 }, (_, i) => ({ ...base, id: `t_${i}`, titulo: `Misión ${i}`, ...(i ? { despuesDe: [`t_${i - 1}`] } : {}) }));
    const p: Plan = { ...plan, misiones: [cadena[0], ...cadena.slice(1).reverse()] };
    const r = reservaDeMisiones(p, estadoVacio(), 'titular');
    expect(r.abiertas.map((m) => m.id)).toEqual(['t_0']);
    expect(r.alcanza).toBe(10);
    const siguen = misionesQueSiguen(r, 't_0');
    expect(siguen).toHaveLength(9);
    expect(siguen.map((m) => m.id)).toEqual(cadena.slice(1).map((m) => m.id));
    expect(esperanAlDirector(r)).toEqual([]);
  });

});
