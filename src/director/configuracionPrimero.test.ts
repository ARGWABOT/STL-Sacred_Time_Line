import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { configuracionPorCerrar, configuracionQueFalta, lineasDeConfiguracion, type MisionDeConfiguracion } from './configuracionPrimero.ts';
import { validarPlan, type Plan } from './director.ts';

const LISTO = { remotos: 'origin\thttps://github.com/ana/app.git (fetch)\n', cuentaAprobada: 'ana', nombreGit: 'Ana', correoGit: 'ana@x.co', modoPermisos: 'automatico' as const };

describe('lo que le falta configurar a un proyecto entregado (pd_config_primero)', () => {
  it('a uno con todo, nada', () => {
    expect(configuracionQueFalta(LISTO)).toEqual([]);
  });

  it('en su orden: la cuenta (sugiriendo al dueño del repositorio, nmwjk03b3tit) y la identidad', () => {
    const falta = configuracionQueFalta({ remotos: LISTO.remotos });
    expect(falta).toEqual([{ que: 'cuenta', sugerencia: 'ana' }, { que: 'identidad' }]);
  });

  it('sin repositorio en GitHub, la misión guiada para crearlo y conectarlo (nmwf5valltit); con otro servicio, nada de GitHub', () => {
    expect(configuracionQueFalta({ ...LISTO, cuentaAprobada: null, remotos: '' }).map((f) => f.que)).toEqual(['repositorio']);
    expect(configuracionQueFalta({ ...LISTO, cuentaAprobada: null, remotos: 'origin\tgit@gitlab.com:ana/app.git (push)' })).toEqual([]);
    // Con la cuenta aprobada, aunque no tenga remoto (el Studio mismo sube sin `origin`), está completo
    expect(configuracionQueFalta({ ...LISTO, remotos: '' })).toEqual([]);
  });

  it('la identidad que ya usa la carpeta cuenta, venga de donde venga; solo falta si no hay nombre o correo (nmwimrikjtit)', () => {
    expect(configuracionQueFalta({ ...LISTO, correoGit: '' }).map((f) => f.que)).toEqual(['identidad']);
    expect(configuracionQueFalta({ ...LISTO, nombreGit: null }).map((f) => f.que)).toEqual(['identidad']);
  });

  it('el modo de permisos no se configura: hay uno solo (nmwp8uot6tit), guarde lo que guarde este computador', () => {
    for (const modoPermisos of ['autorizado', 'pregunta', 'automatico', undefined] as const) expect(configuracionQueFalta({ ...LISTO, modoPermisos })).toEqual([]);
  });
});

describe('el cierre no deja un proyecto sin sus misiones de configuración, ni con ellas fuera de su lugar', () => {
  const m = (id: string, x: Partial<MisionDeConfiguracion> = {}): MisionDeConfiguracion => ({ id, para: 'titular', abierta: true, ...x });
  const falta = configuracionQueFalta({ remotos: LISTO.remotos });

  it('lo que falta sin su misión se señala; con una misión de ese `configura`, abierta o ya hecha, no se vuelve a pedir', () => {
    expect(configuracionPorCerrar(falta, [m('t_diag', { leeElDiagnostico: true }), m('t_trabajo')]).sinMision.map((f) => f.que)).toEqual(['cuenta', 'identidad']);
    const con = [m('t_diag', { leeElDiagnostico: true }), m('t_c', { configura: 'cuenta', abierta: false }), m('t_i', { configura: 'identidad' }), m('t_p', { configura: 'permisos' }), m('t_trabajo')];
    expect(configuracionPorCerrar(falta, con)).toEqual({ sinMision: [], fueraDeOrden: [] });
    // La del repositorio cubre a la de la cuenta: es la misma pieza, la cuenta de GitHub
    expect(configuracionPorCerrar([{ que: 'cuenta' }], [m('t_r', { configura: 'repositorio', abierta: false })]).sinMision).toEqual([]);
  });

  it('una de configuración detrás de una de trabajo sin empezar, o en otro orden, está fuera de su lugar', () => {
    const detras = [m('t_diag', { leeElDiagnostico: true }), m('t_trabajo'), m('t_c', { configura: 'cuenta' })];
    expect(configuracionPorCerrar([], detras).fueraDeOrden).toEqual(['t_c']);
    const alReves = [m('t_p', { configura: 'permisos' }), m('t_i', { configura: 'identidad' })];
    expect(configuracionPorCerrar([], alReves).fueraDeOrden).toEqual(['t_i']);
    // Detrás de una que la persona ya empezó, o de la de otra persona, no: se le dan en su próxima revisión (nmwgu4c82tit)
    expect(configuracionPorCerrar([], [m('t_empezada', { empezada: true }), m('t_c', { configura: 'cuenta' })]).fueraDeOrden).toEqual([]);
    expect(configuracionPorCerrar([], [m('t_otra', { para: 'ana' }), m('t_c', { configura: 'cuenta' })]).fueraDeOrden).toEqual([]);
  });

  it('el aviso dice qué escribir, con la cuenta sugerida, en inglés', () => {
    const lineas = lineasDeConfiguracion(configuracionPorCerrar(falta, []));
    expect(lineas).toHaveLength(2);
    expect(lineas[0]).toContain('"configura": "cuenta"');
    expect(lineas[0]).toContain('ana');
  });

  it('validarPlan no deja pasar un `configura` que no es de los que hay', () => {
    const plan = { version: 1, fases: [{ id: 'f', nombre: 'F', meta: '', frentes: {}, criterios: [], misiones: [] }], frentes: [], propuestas: [], misiones: [{ id: 't_x', para: 'titular', fase: 'f', frente: 'x', titulo: 'X', porQue: 'x', pasos: ['x'], entrega: 'x', xp: 10, configura: 'clave' }] } as unknown as Plan;
    expect(validarPlan(plan).join('\n')).toContain('configura «clave»');
  });

  it('la regla está en el procedimiento del arranque, en sus dos versiones, y la comprueba el cierre', () => {
    const raiz = join(__dirname, '..', '..');
    for (const f of ['start.md', 'start.es.md']) expect(readFileSync(join(raiz, 'docs', 'metodo', 'director', f), 'utf8')).toContain('configura');
    const bandeja = readFileSync(join(raiz, 'tools', 'director', 'bandeja.ts'), 'utf8');
    expect(bandeja).toContain('configuracionPorCerrar(');
  });
});
