// «Salud del Studio»: la sección y el aviso fino de arriba, con datos hechos a mano (nmw9of90atit, nmw9p8305tit).
import { describe, expect, it } from 'vitest';
import { pestanaDeAncla } from './pestanasModelo';
import { ANCLA_SALUD, avisoDeSalud, lineaDeReparacion, pintarFallas, pintarSalud, reparando, type EstadoSalud } from './vistaSalud';

const base = (x: Partial<EstadoSalud> = {}): EstadoSalud => ({
  cuando: '2026-11-09T10:00:00.000Z',
  chequeos: [
    { id: 'plan', estado: 'bien' }, { id: 'marcas', estado: 'arreglado' }, { id: 'revision', estado: 'bien' }, { id: 'candado', estado: 'bien' },
    { id: 'rama', estado: 'bien' }, { id: 'claude', estado: 'bien' }, { id: 'disco', estado: 'bien' },
  ],
  problemas: [],
  arreglos: [],
  ...x,
});

describe('«Diagnosticar y reparar» y las fallas por causa en «Salud del Studio» (pd_salud_c, pd_salud_d)', () => {
  it('el botón está, activo sin reparación en marcha y apagado mientras trabaja, con su línea de lo que hace', () => {
    const libre = pintarSalud(base({ reparacion: { estado: 'ninguna', uso: 40 } }));
    expect(libre).toMatch(/<button type="button" class="boton" data-reparar>/);
    expect(libre).not.toContain('data-reparar-estado');
    expect(libre).not.toContain('data-reparar-limite');
    const trabaja = pintarSalud(base({ reparacion: { estado: 'trabaja', minutos: 3, ultimo: 'Lee <salud.ts>', uso: 92 } }));
    expect(trabaja).toMatch(/data-reparar disabled>/);
    expect(trabaja).toContain('data-reparar-estado');
    expect(trabaja).toContain('Lee &lt;salud.ts&gt;');
    expect(trabaja).toContain('data-reparar-limite');
    expect(reparando({ estado: 'espera' })).toBe(true);
    expect(reparando({ estado: 'guardada' })).toBe(false);
    expect(lineaDeReparacion({ estado: 'ninguna' })).toBe('');
    const hecha = pintarSalud(base({ reparacion: { estado: 'deshecha', informe: 'Caso: x', cuando: '2026-11-09T10:00:00.000Z' } }));
    expect(hecha).toContain('<details>');
    expect(hecha).toContain('Caso: x');
  });

  it('una línea por causa, con su cuenta, y la última se abre con su traza', () => {
    const html = pintarSalud(base({ fallas: [
      { causa: 'codigo', n: 3, ultima: { cuando: '2026-11-08T10:00:00.000Z', mensaje: 'TypeError', traza: 'at <a>', tipo: 'carga' } },
      { causa: 'cuenta', n: 1, ultima: { cuando: '2026-11-01T10:00:00.000Z', mensaje: 'limit', traza: '', tipo: 'revision' } },
    ] }));
    expect(html.match(/data-causa=/g)).toHaveLength(2);
    expect(html).toContain('at &lt;a&gt;');
    expect(pintarFallas([])).toContain('<h4>');
    expect(pintarFallas(undefined)).toBe('');
  });

  it('con dos fallas seguidas de la misma causa, el aviso de arriba ofrece «Diagnosticar y reparar», salvo mientras repara', () => {
    expect(avisoDeSalud(base({ dosSeguidas: 'codigo' }))).toContain('data-dos-fallas');
    expect(avisoDeSalud(base({ dosSeguidas: 'codigo' }))).toContain('data-reparar');
    expect(avisoDeSalud(base({ dosSeguidas: 'codigo', reparacion: { estado: 'trabaja' } }))).toBe('');
    expect(avisoDeSalud(base({ dosSeguidas: null }))).toBe('');
  });
});

describe('la sección «Salud del Studio»', () => {
  it('lleva el ancla m-salud, en la pestaña de lo que gasta, y una línea por chequeo', () => {
    expect(ANCLA_SALUD).toBe('m-salud');
    expect(pestanaDeAncla(ANCLA_SALUD)).toBe('gasto');
    const html = pintarSalud(base());
    expect(html).toContain('data-ancla="m-salud"');
    expect(html.match(/<li class="salud-/g)).toHaveLength(7);
  });

  it('sin respuesta del servidor no pinta nada', () => {
    expect(pintarSalud(null)).toBe('');
  });

  it('una línea por arreglo de los últimos 7 días, con lo que arregló', () => {
    const html = pintarSalud(base({ arreglos: [
      { cuando: '2026-11-08T09:00:00.000Z', tipo: 'candado' },
      { cuando: '2026-11-05T09:00:00.000Z', tipo: 'marcas', dato: 'm_uno' },
      { cuando: '2026-11-04T09:00:00.000Z', tipo: 'revision', dato: 'stl' },
    ] }));
    expect(html.match(/data-arreglo=/g)).toHaveLength(3);
    expect(html).toContain('m_uno');
    expect(html).not.toContain('no hizo falta arreglar nada');
  });

  it('sin arreglos dice que no hizo falta arreglar nada', () => {
    const html = pintarSalud(base());
    expect(html).not.toContain('data-arreglo=');
    expect(html).toContain('no hizo falta arreglar nada');
  });

  it('un problema muestra su detalle, escapado, y la orden de claude en un code', () => {
    const html = pintarSalud(base({ problemas: [
      { id: 'plan', dato: 'línea 3: <mal>' },
      { id: 'claude', dato: 'sesion', orden: 'claude login' },
      { id: 'disco', dato: '1.4' },
    ] }));
    expect(html).toContain('línea 3: &lt;mal&gt;');
    expect(html).toContain('<code>claude login</code>');
    expect(html).toContain('no tiene la sesión iniciada');
    expect(html).toContain('1.4 GB');
  });
});

describe('el aviso de arriba de cada sección', () => {
  it('sin problemas, o sin saber, no hay aviso', () => {
    expect(avisoDeSalud(null)).toBe('');
    expect(avisoDeSalud(base())).toBe('');
  });

  it('lo arreglado no avisa', () => {
    expect(avisoDeSalud(base({ arreglos: [{ cuando: '2026-11-08T09:00:00.000Z', tipo: 'candado' }] }))).toBe('');
  });

  it('con un problema, lo nombra y es un enlace a Salud del Studio', () => {
    const html = avisoDeSalud(base({ problemas: [{ id: 'rama', dato: 'a.md' }, { id: 'disco', dato: '1.4' }] }));
    expect(html).toContain('data-ver-salud');
    expect(html).toContain('conflictos en la rama stl');
    expect(html).toContain('poco espacio en disco');
  });
});
