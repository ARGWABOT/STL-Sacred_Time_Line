// El diálogo único para hablarle al director (pedido pd_dialogo_unico): sus borradores, la tecla N y que todas las
// entradas pasen por el mismo diálogo.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { borradoresDe, claveDeBorrador, guardarBorrador, leerBorrador, lineaDeBorrador, quitarBorrador, type Almacen, type Borrador } from './borradores';

/** Un almacén como localStorage, con un tope para probar lo que no cabe. */
function almacen(tope = Infinity): Almacen & { datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return {
    datos,
    get length() { return datos.size; },
    key: (i) => [...datos.keys()][i] ?? null,
    getItem: (k) => datos.get(k) ?? null,
    setItem: (k, v) => {
      if (v.length > tope) throw new Error('QuotaExceededError');
      datos.set(k, v);
    },
    removeItem: (k) => void datos.delete(k),
  };
}

const base = (x: Partial<Borrador> = {}): Borrador => ({ proyecto: 'golf', sobre: { tipo: 'mision', id: 't_a', seccion: 'Paso 1' }, titulo: 'Comentar el paso 1', texto: 'Algo que no envié', cuando: '2026-10-28T10:00:00.000Z', ...x });

describe('los borradores del diálogo único (pd_dialogo_unico)', () => {
  it('lo cerrado sin enviar vuelve sobre lo mismo, y no sobre otro lugar ni otro proyecto', () => {
    const a = almacen();
    expect(guardarBorrador(a, base({ tipoNota: 'ajuste' }))).toBe('guardado');
    // el mismo lugar, aunque sus campos lleguen en otro orden
    expect(leerBorrador(a, 'golf', { seccion: 'Paso 1', id: 't_a', tipo: 'mision' })).toMatchObject({ texto: 'Algo que no envié', tipoNota: 'ajuste' });
    expect(leerBorrador(a, 'golf', { tipo: 'mision', id: 't_a', seccion: 'Paso 2' })).toBeNull();
    expect(leerBorrador(a, 'otro', { tipo: 'mision', id: 't_a', seccion: 'Paso 1' })).toBeNull();
    expect(claveDeBorrador('golf', { tipo: 'general' })).not.toBe(claveDeBorrador('golf', { tipo: 'general', seccion: 'Dónde quedamos › avanzamos' }));
  });

  it('dura hasta que se envía o se borra; vacío no es un borrador', () => {
    const a = almacen();
    guardarBorrador(a, base());
    expect(guardarBorrador(a, base({ texto: '   ' }))).toBe('vacio');
    expect(leerBorrador(a, 'golf', base().sobre)).toBeNull();
    guardarBorrador(a, base({ texto: '', audio: 'data:audio/webm;base64,AAAA', segundos: 12 }));
    expect(leerBorrador(a, 'golf', base().sobre)).toMatchObject({ audio: 'data:audio/webm;base64,AAAA', segundos: 12 });
    quitarBorrador(a, 'golf', base().sobre);
    expect(leerBorrador(a, 'golf', base().sobre)).toBeNull();
  });

  it('si el audio no cabe en el navegador, queda lo escrito y se dice; sin nada escrito, no se guarda', () => {
    const a = almacen(400);
    const largo = `data:audio/webm;base64,${'A'.repeat(1000)}`;
    expect(guardarBorrador(a, base({ audio: largo }))).toBe('sin_audio');
    expect(leerBorrador(a, 'golf', base().sobre)?.audio).toBeUndefined();
    expect(guardarBorrador(a, base({ texto: '', audio: largo }))).toBe('no');
  });

  it('antes de pedir la revisión, los de este proyecto, del más viejo al más nuevo, cada uno en una línea', () => {
    const a = almacen();
    guardarBorrador(a, base({ cuando: '2026-10-28T12:00:00.000Z' }));
    guardarBorrador(a, base({ sobre: { tipo: 'general' }, titulo: 'Un comentario para el director', texto: '', audio: 'data:audio/webm;base64,AAAA', cuando: '2026-10-28T09:00:00.000Z' }));
    guardarBorrador(a, base({ proyecto: 'otro' }));
    a.setItem('otra-cosa', 'x');
    const lista = borradoresDe(a, 'golf');
    expect(lista.map((b) => b.titulo)).toEqual(['Un comentario para el director', 'Comentar el paso 1']);
    expect(lista.map(lineaDeBorrador)).toEqual(['Un comentario para el director: un audio', 'Comentar el paso 1: «Algo que no envié»']);
  });
});

describe('todas las entradas abren el mismo diálogo (pd_dialogo_unico)', () => {
  const director = readFileSync(join(__dirname, 'director.ts'), 'utf-8').replace(/\r\n/g, '\n');
  const tramo = (desde: string, hasta: string) => director.slice(director.indexOf(desde), director.indexOf(hasta, director.indexOf(desde) + desde.length));

  it('el comentario general y el ✉ de cada lugar pasan por comentar, que guarda su borrador', () => {
    expect(tramo('async function escribirAlDirector(', '\n}\n')).toContain("await comentar({ tipo: 'general' }");
    expect(tramo('async function comentar(', '\n}\n')).toContain('borrador: { proyecto: d.activo, sobre }');
    // pedir lo trae de vuelta, lo dice, y al cerrar sin enviar lo guarda; enviado o borrado, se quita
    const pedir = tramo('function pedir(', '\n}\n');
    expect(pedir).toContain('leerBorrador(localStorage');
    expect(pedir).toContain('Borrador guardado');
    expect(pedir).toContain('guardarAlCerrar(');
    expect(pedir).toMatch(/if \(o\.borrador && \(resultado \|\| borrado\)\) quitarBorrador\(/);
  });

  it('la N lo abre sobre lo que miras, nunca mientras se escribe en un campo o hay otro diálogo abierto', () => {
    const n = tramo("document.addEventListener('keydown', (e) => {\n  if (e.key.toLowerCase() !== 'n'", '\n});\n');
    expect(n).toContain('e.ctrlKey || e.metaKey || e.altKey');
    expect(n).toMatch(/INPUT\|TEXTAREA\|SELECT/);
    expect(n).toContain("document.querySelector('dialog[open]')");
    expect(n).toContain('sobreLoQueMiras()');
    expect(n).toContain('escribirAlDirector()');
  });

  it('pedir la revisión con borradores sin enviar los muestra antes', () => {
    const pedirRevision = tramo('async function pedirLaRevision(', '\n}\n');
    expect(pedirRevision.indexOf('antesDeLosBorradores()')).toBeGreaterThan(0);
    expect(pedirRevision.indexOf('antesDeLosBorradores()')).toBeLessThan(pedirRevision.indexOf("fetch('/__estudio/director/revision'"));
  });
});
