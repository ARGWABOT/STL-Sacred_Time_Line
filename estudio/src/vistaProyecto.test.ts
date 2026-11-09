// La vista «Proyecto», en su módulo (propuesta aceptada pr_partir_modulos): recibe lo que pinta y la página le da lo que
// depende de ella, así que se prueba con datos hechos a mano, sin la página.
import { describe, expect, it } from 'vitest';
import { proyectoVacio } from '../../src/director/director';
import { panelSesionesGh, vistaProyecto, type DatosProyecto } from './vistaProyecto';

const datos = (x: Partial<DatosProyecto> = {}): DatosProyecto => ({
  proyecto: { ...proyectoVacio(), nombre: 'Talleres' },
  repositorio: { ruta: null, info: null, error: null },
  plan: { objetivos: [], boletin: [], detectado: undefined, diagnostico: { fecha: null } } as unknown as DatosProyecto['plan'],
  titular: true, nuevo: false, borrador: null, nombreTitular: 'Ana', correo: 'ana@ejemplo.com', subida: '',
  diagnostico: '<section data-ancla="p-diagnostico"></section>',
  plegable: (clave) => ` data-recuerda="${clave}"`,
  ...x,
});

describe('«Proyecto», aparte de app.ts (pr_partir_modulos)', () => {
  it('sin meta, el orden del arranque: dónde está, qué es, el diagnóstico y la meta; y las dos secciones de la derecha', () => {
    const html = vistaProyecto(datos());
    const pos = ['p-repositorio', 'p-contexto', 'p-diagnostico', 'p-objetivo', 'p-equipo', 'p-sincronizar'].map((a) => html.indexOf(`data-ancla="${a}"`));
    expect(pos.every((p) => p >= 0)).toBe(true);
    expect(pos).toEqual([...pos].sort((a, b) => a - b));
    expect(html).toContain('id="form-objetivo"');
    expect(html).toContain('>Conectar</button>');
  });

  it('con la meta fijada, va arriba y se puede replantear', () => {
    const objetivo = { texto: '20 talleres pagando', exito: '20 cobros', horizonte: '', firmado: { quien: 'Ana', fecha: '2026-10-20T10:00:00.000Z' } };
    const html = vistaProyecto(datos({ proyecto: { ...proyectoVacio(), nombre: 'Talleres', objetivo } as DatosProyecto['proyecto'] }));
    expect(html.indexOf('data-ancla="p-objetivo"')).toBeLessThan(html.indexOf('data-ancla="p-repositorio"'));
    expect(html).toContain('data-replantear-objetivo');
    expect(html).not.toContain('id="form-objetivo"');
  });

  it('las sesiones de gh (nmw0vw3detit): el login real, el nombre en gh, la activa, la aprobada aunque no lo sea, y el código', () => {
    const html = panelSesionesGh({
      cargando: false, hayGh: true, aprobada: 'ARGWABOT',
      sesiones: [
        { nombre: 'empresa_admin', login: 'empresa_admin', activa: true, aprobada: false },
        { nombre: 'incocrea', login: 'ARGWABOT', activa: false, aprobada: true },
      ],
      entrada: { estado: 'esperando', codigo: 'AB12-CD34', url: 'https://github.com/login/device' },
    });
    expect(html).toContain('<b>ARGWABOT</b>');
    expect(html).toContain('gh la guardó como incocrea');
    expect(html).toContain('La aprobada para este proyecto');
    // «Usar esta» solo en la que no está activa, con su nombre en gh
    expect(html).toContain('data-usar-sesion-gh="incocrea"');
    expect(html).not.toContain('data-usar-sesion-gh="empresa_admin"');
    expect(html).toContain('AB12-CD34');
    expect(html).toContain('href="https://github.com/login/device"');
    expect(html).toContain('data-entrar-gh');
    // Sin la aprobada entre las guardadas, lo dice
    expect(panelSesionesGh({ cargando: false, hayGh: true, aprobada: 'ARGWABOT', sesiones: [{ nombre: 'x', login: 'x', activa: true, aprobada: false }], entrada: null })).toContain('Ninguna sesión guardada es ARGWABOT');
    // Sin gh, ni lista ni entrar; y solo el titular ve el panel
    expect(panelSesionesGh({ cargando: false, hayGh: false, aprobada: null, sesiones: [], entrada: null })).not.toContain('data-entrar-gh');
    expect(vistaProyecto(datos({ titular: false, repositorio: { ruta: 'C:/x', info: { ruta: 'C:/x', rama: 'main', commits: 1, archivos: 1, sinCommit: 0, ultimo: null, remoto: null } as unknown as DatosProyecto['repositorio']['info'], error: null } }))).not.toContain('sesiones-gh');
  });

  it('quien no es titular lo ve sin poder escribirlo, y sin equipo registrado sale el titular', () => {
    const html = vistaProyecto(datos({ titular: false }));
    expect(html).toContain('name="nombre" value="Talleres" required readonly');
    expect(html).toContain('La meta la fija el titular.');
    expect(html).not.toContain('id="form-integrante"');
    expect(html).toContain('<b>Ana</b> <span class="chip foco">Titular</span>');
    expect(html).toContain('ana@ejemplo.com');
    expect(html).toContain('data-sincronizar disabled');
  });

  it('cada ficha del equipo dice los idiomas que lee esa persona: los marca el titular o ella misma, los demás los ven (pd_reglas_lectura)', () => {
    const equipo = [
      { id: 'titular', nombre: 'Ana', correo: 'ana@ejemplo.com', lee: ['es' as const, 'en' as const] },
      { id: 'beto', nombre: 'Beto', correo: 'beto@ejemplo.com' },
    ];
    const proyecto = { ...proyectoVacio(), nombre: 'Talleres', equipo };
    // El titular marca los de todos
    const delTitular = vistaProyecto(datos({ proyecto, yo: 'titular' }));
    expect(delTitular).toContain('<input type="checkbox" data-lee="titular|es" checked /> Español');
    expect(delTitular).toContain('<input type="checkbox" data-lee="titular|en" checked /> Inglés');
    expect(delTitular).toContain('<input type="checkbox" data-lee="beto|es" /> Español');
    // Beto marca solo los suyos, y ve los de Ana
    const deBeto = vistaProyecto(datos({ proyecto, titular: false, yo: 'beto' }));
    expect(deBeto).toContain('data-lee="beto|en"');
    expect(deBeto).not.toContain('data-lee="titular|');
    expect(deBeto).toContain('<small class="lee-idiomas">Lee: Español, Inglés</small>');
    // Sin equipo registrado, nada que marcar
    expect(vistaProyecto(datos())).not.toContain('data-lee=');
  });

  it('los archivos clave también van debajo de «Qué es»: una tabla de nombre y para qué sirve, y un clic abre cada uno (pd_about)', () => {
    const plan = { objetivos: [], boletin: [], detectado: undefined, diagnostico: { fecha: null }, archivosClave: [{ ruta: 'README.md', para: 'La puerta de entrada' }, { ruta: 'src/a.ts', para: 'Lo principal' }] } as unknown as DatosProyecto['plan'];
    const html = vistaProyecto(datos({ plan, titular: false }));
    const contexto = html.slice(html.indexOf('data-ancla="p-contexto"'), html.indexOf('</section>', html.indexOf('data-ancla="p-contexto"')));
    expect(contexto).toContain('<table class="tabla-clave">');
    expect(contexto).toContain('<th>Archivo</th><th>Para qué sirve</th>');
    expect(contexto).toContain('<tr><td><button type="button" class="enlace-clave" data-doc="repo:README.md">README.md</button></td><td>La puerta de entrada</td></tr>');
    expect(contexto.indexOf('</form>')).toBeLessThan(contexto.indexOf('tabla-clave'));
    // Sin archivos clave, nada
    expect(vistaProyecto(datos())).not.toContain('tabla-clave');
  });

  it('lo que detectó el director llena el contexto vacío, dicho como suyo', () => {
    const html = vistaProyecto(datos({ plan: { objetivos: [], boletin: [], detectado: { contexto: 'Una app de citas', meta: 'Veinte talleres' }, diagnostico: { fecha: null } } as unknown as DatosProyecto['plan'] }));
    expect(html).toContain('>Una app de citas</textarea>');
    expect(html).toContain('Lo detectó el director al leer el repositorio');
    expect(html).toContain('Meta sugerida por el director');
  });
});
