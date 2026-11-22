// Las propuestas sin su sección (pd_una_sola_linea, segunda rebanada): cada una es un punto gris de la línea de «Hoy», y su
// tarjeta, debajo de la línea, lleva «Aceptar» y «Descartar» (vistaPropuestas.ts › botonesResponder).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { enfoqueAlPintar, puntoAunAbierto } from './hoyEnRuta';
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
    // tarjeta de la propuesta y el botón parecería no hacer nada
    const enfocada = { aqui: 'mision-t_a', antes: 'mision-t_a', querido: true, alAbrir: true };
    expect(enfoqueAlPintar({ ...enfocada, tarjetaAbierta: true })).toBe('');
    // Al cerrarla, la misión vuelve a enfocarse si la persona lo tenía (y no, si no)
    expect(enfoqueAlPintar({ ...enfocada, antes: '', tarjetaAbierta: false })).toBe('mision-t_a');
    expect(enfoqueAlPintar({ ...enfocada, antes: '', querido: false, tarjetaAbierta: false })).toBe('');
    // La tarjeta abierta no apaga el enfoque de un documento
    expect(enfoqueAlPintar({ ...enfocada, aqui: 'documento', antes: 'documento', tarjetaAbierta: true })).toBe('documento');
    // Y el repintado vuelve a decidir el enfoque, con la tarjeta que de verdad está en «Hoy»
    const pintar = app.slice(app.indexOf('function pintar('));
    expect(pintar.slice(0, pintar.indexOf('\nfunction ', 10))).toContain('aplicarEnfoque();');
    expect(app).toContain("const tarjetaDePuntoAbierta = () => vista === 'misiones' && !!$('vista').querySelector('[data-tarjeta-punto]');");
    expect(app).toContain('enfoque = enfoqueAlPintar({ aqui, antes, querido: enfoqueQuerido, alAbrir: enfoqueAlAbrir, tarjetaAbierta: tapada });');
  });

  it('regresión nmws6y66rtit: el punto elegido no deja el enfoque apagado para siempre', () => {
    // Lo enfocable en «Hoy» ya no depende del punto elegido: con él puesto, el botón del enfoque desaparecía
    const inicio = app.indexOf('const queEnfocar = () =>');
    const queEnfocar = app.slice(inicio, app.indexOf('\n', app.indexOf('\n', inicio) + 1));
    expect(queEnfocar).not.toContain('puntoElegido');
    // Caso 1: el punto sale de la línea (propuesta descartada o ejecutada) y su tarjeta se cierra
    expect(puntoAunAbierto('p1', null, ['p1', 't_a'])).toEqual({ elegido: 'p1', visto: 'p1' });
    expect(puntoAunAbierto('p1', 'p1', ['t_a'])).toEqual({ elegido: null, visto: null });
    // Lo que un paso abrió sin estar en la línea sigue abierto hasta «Volver a mi misión»
    expect(puntoAunAbierto('p_vieja', null, ['t_a'])).toEqual({ elegido: 'p_vieja', visto: null });
    expect(puntoAunAbierto(null, 'p1', ['p1'])).toEqual({ elegido: null, visto: null });
    expect(app).toContain('({ elegido: puntoElegido, visto: puntoVisto } = puntoAunAbierto(puntoElegido, puntoVisto, enLinea));');
    // Caso 2: al salir de «Hoy», la tarjeta se cierra y, de vuelta, la misión se enfoca
    const irA = app.slice(app.indexOf('function irA(nueva: Vista)'), app.indexOf('function irA(nueva: Vista)') + 2400);
    expect(irA).toContain("if (otra && vista === 'misiones') puntoElegido = puntoVisto = null;");
    // Pedir el enfoque con una tarjeta abierta la cierra y enfoca la misión
    const querer = app.slice(app.indexOf('function quererEnfoque('), app.indexOf('function quererEnfoque(') + 500);
    expect(querer).toMatch(/if \(si && tarjetaDePuntoAbierta\(\)\) \{\s*puntoElegido = null;\s*pintar\(\);/);
  });
});
