// Las propuestas sin su sección (pd_una_sola_linea, segunda rebanada): cada una es un punto gris de la línea de «Hoy», y su
// tarjeta, debajo de la línea, lleva «Aceptar» y «Descartar» (vistaPropuestas.ts › botonesResponder).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { botonesResponder } from './vistaPropuestas';

const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8');

describe('las propuestas, en la línea de «Hoy»', () => {
  it('«Aceptar» y «Descartar», con lo ya respondido apagado y marcado', () => {
    const html = botonesResponder('p1', undefined);
    expect(html).toContain('data-responder="p1|aceptada"');
    expect(html).toContain('data-responder="p1|descartada"');
    expect(html).not.toContain(' disabled');
    const aceptada = botonesResponder('p1', 'aceptada');
    expect(aceptada).toMatch(/data-responder="p1\|aceptada" class="sel" disabled/);
    expect(aceptada).not.toMatch(/data-responder="p1\|descartada" class="sel"/);
  });

  it('la sección «Propuestas» salió de la barra; un botón viejo a ella abre la tarjeta de la propuesta en «Hoy»', () => {
    const grupos = app.slice(app.indexOf('function gruposNav()'), app.indexOf('function gruposNav()') + 1200);
    expect(grupos).not.toContain("'propuestas'");
    const irA = app.slice(app.indexOf('function irA(nueva: Vista)'), app.indexOf('function irA(nueva: Vista)') + 1600);
    expect(irA).toContain("if (nueva === 'propuestas') {");
    expect(irA).toContain('puntoElegido = id;');
    expect(irA).toContain("nueva = 'misiones';");
    expect(app).not.toContain('function vistaPropuestas()');
  });

  it('regla dura (nmws6n457tit): con la tarjeta de un punto abierta, el modo enfoque no la tapa', () => {
    // El botón «Open the proposal» de un paso no sale de «Hoy»: si la misión siguiera enfocada, el velo cubriría la
    // tarjeta de la propuesta y el botón parecería no hacer nada. Lo enfocable en «Hoy» exige que no haya punto elegido
    const inicio = app.indexOf('const queEnfocar = () =>');
    expect(inicio).toBeGreaterThan(-1);
    const queEnfocar = app.slice(inicio, app.indexOf('\n', app.indexOf('\n', inicio) + 1));
    expect(queEnfocar).toMatch(/vista === 'misiones' && !puntoElegido && /);
    // Y el repintado vuelve a decidir el enfoque: al cerrar la tarjeta, la misión vuelve a enfocarse si la persona lo tenía
    const pintar = app.slice(app.indexOf('function pintar('));
    expect(pintar.slice(0, pintar.indexOf('\nfunction ', 10))).toContain('aplicarEnfoque();');
  });
});
