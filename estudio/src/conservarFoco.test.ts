// El campo en que escribes conserva el foco al repintar (nota nmw9w8e3itit): aunque esté vacío.
import { describe, expect, it } from 'vitest';
import { devolverFoco, guardarFoco, type CampoConFoco } from './conservarFoco';
import { vistaProyecto, type DatosProyecto } from './vistaProyecto';
import { proyectoVacio } from '../../src/director/director';

const campo = (x: Partial<CampoConFoco> = {}) => {
  const c = {
    value: '', selectionStart: 0, selectionEnd: 0, dataset: { conservaFoco: 'cuenta-git' } as Record<string, string | undefined>,
    enfocado: false, rango: null as [number, number] | null,
    focus() { c.enfocado = true; },
    setSelectionRange(a: number, b: number) { c.rango = [a, b]; },
    ...x,
  };
  return c;
};

describe('conservar el foco al repintar (nmw9w8e3itit)', () => {
  it('un campo vacío y enfocado vuelve a tener el foco tras el repintado', () => {
    const g = guardarFoco(campo());
    expect(g).toEqual({ clave: 'cuenta-git', valor: '', inicio: 0, fin: 0 });
    const nuevo = campo({ value: 'de-la-pagina' });
    expect(devolverFoco({ querySelector: (s: string) => (s === '[data-conserva-foco="cuenta-git"]' ? nuevo : null) }, g)).toBe(true);
    expect(nuevo.enfocado).toBe(true);
    expect(nuevo.value).toBe('');
  });

  it('lo escrito y el cursor se conservan', () => {
    const g = guardarFoco(campo({ value: 'ARGW', selectionStart: 4, selectionEnd: 4 }));
    const nuevo = campo();
    devolverFoco({ querySelector: () => nuevo }, g);
    expect(nuevo.value).toBe('ARGW');
    expect(nuevo.rango).toEqual([4, 4]);
  });

  it('un campo sin la marca, o nada enfocado, no cambia nada', () => {
    expect(guardarFoco(campo({ dataset: {} }))).toBeNull();
    expect(guardarFoco(null)).toBeNull();
    expect(devolverFoco({ querySelector: () => null }, { clave: 'x', valor: '', inicio: null, fin: null })).toBe(false);
  });

  it('el campo de la cuenta de GitHub lleva la marca, y la cuenta activa se ofrece y se detecta sin guardar', () => {
    const info = { ruta: 'C:/p', rama: 'main', commits: 1, archivos: 1, sinCommit: 0, ultimo: null, remoto: null };
    const datos = (cuentaGit: string | null): DatosProyecto => ({
      proyecto: { ...proyectoVacio(), nombre: 'P' },
      repositorio: { ruta: 'C:/p', info: info as never, error: null, cuentaGit },
      plan: { objetivos: [], boletin: [], detectado: undefined, diagnostico: { fecha: null } } as unknown as DatosProyecto['plan'],
      titular: true, nuevo: false, borrador: null,
      diagnostico: { ancla: 'p-diagnostico', titulo: '', cuerpo: '' }, plegable: () => '',
      sesionesGh: { cargando: false, hayGh: true, aprobada: cuentaGit, entrada: null, sesiones: [{ nombre: 'gh1', login: 'activa-login', activa: true, aprobada: false }] },
    });
    const sin = vistaProyecto(datos(null));
    expect(sin).toContain('data-conserva-foco="cuenta-git"');
    expect(sin).toMatch(/name="cuenta"[^>]*value="activa-login"[^>]*data-detectada/);
    expect(sin).toContain('data-usar-cuenta-activa="activa-login"');
    const con = vistaProyecto(datos('otra'));
    expect(con).toMatch(/name="cuenta"[^>]*value="otra"/);
    expect(con).not.toContain('data-detectada');
    expect(con).toContain('data-usar-cuenta-activa="activa-login"');
    expect(vistaProyecto(datos('activa-login'))).not.toContain('data-usar-cuenta-activa');
  });
});
