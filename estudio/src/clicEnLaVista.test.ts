import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { proyectoVacio } from '../../src/director/director';
import { vistaProyecto, type DatosProyecto } from './vistaProyecto';

// Un clic dentro de la vista no la repinta (notas del titular nmwajrn2dtit, nmwajt03atit y nmwajms54tit, 10 de noviembre
// de 2026): desde el 9 de noviembre el contenedor de la vista llevaba `data-vista` con su sección, el mismo atributo de los
// botones que llevan a una sección; el escuchador de esos botones, en todo el documento, tomaba cualquier clic dentro de
// la vista como «ir a esta sección» y la repintaba a mitad del clic. Los plegables («Más datos del repositorio», las metas
// anteriores, las notas del Buzón) se abrían en una copia ya quitada de la página, «Guardar la cuenta» no enviaba su
// formulario y lo escrito en el campo volvía a la cuenta guardada.
const leer = (...r: string[]) => readFileSync(join(__dirname, ...r), 'utf-8');
const app = leer('app.ts');
const siguiente = leer('siguiente.ts');
const html = leer('..', '..', 'index.html');

describe('un clic dentro de la vista no la repinta', () => {
  it('el contenedor de la vista dice su sección con otro atributo, nunca data-vista', () => {
    expect(app).toContain('v.dataset.seccionActual = vista;');
    expect(app).not.toMatch(/\bv\.dataset\.vista\s*=/);
    expect(app).not.toMatch(/\$\('vista'\)\.dataset\.vista\s*=/);
    expect(siguiente).toContain("document.getElementById('vista')?.dataset.seccionActual");
    expect(siguiente).not.toContain("getElementById('vista')?.dataset.vista");
    const contenedor = html.match(/<main[^>]*id="vista"[^>]*>/)?.[0] ?? '';
    expect(contenedor).not.toContain('data-vista');
  });

  it('el escuchador de los botones de sección no toma el contenedor de la vista', () => {
    const escuchador = app.slice(app.indexOf("// Cualquier botón que lleve a una sección"), app.indexOf('if (d) abrirSeccion(v);'));
    expect(escuchador).toContain("closest<HTMLElement>('[data-vista]:not(#vista)')");
  });

  it('lo abierto sigue abierto al repintar: los plegables recuerdan su estado y las notas del Buzón también', () => {
    expect(app).toContain("if (det instanceof HTMLDetailsElement && det.dataset.recuerda) plegadosAMano.set(det.dataset.recuerda, det.open);");
    expect(app).toContain("notasAbiertas.has(n.id) ? ' open' : ''");
    const info = { ruta: 'C:/x', rama: 'main', commits: 1, archivos: 1, sinCommit: 0, ultimo: null, remoto: null } as unknown as DatosProyecto['repositorio']['info'];
    const abiertos = new Set(['detalles-repo']);
    const vista = vistaProyecto({
      proyecto: { ...proyectoVacio(), nombre: 'Talleres' },
      repositorio: { ruta: 'C:/x', info, error: null, cuentaGit: 'laura-gh' },
      plan: { objetivos: [], boletin: [], detectado: undefined, diagnostico: { fecha: null } } as unknown as DatosProyecto['plan'],
      titular: true, nuevo: false, borrador: null,
      diagnostico: { ancla: 'p-diagnostico', titulo: '', cuerpo: '' }, plegable: (clave) => ` data-recuerda="${clave}"${abiertos.has(clave) ? ' open' : ''}`,
    });
    expect(vista).toContain('<details class="detalles-repo" data-recuerda="detalles-repo" open>');
  });
});

describe('lo escrito en el campo de la cuenta sobrevive a un repintado (nota nmwajms54tit)', () => {
  const info = { ruta: 'C:/x', rama: 'main', commits: 1, archivos: 1, sinCommit: 0, ultimo: null, remoto: null } as unknown as DatosProyecto['repositorio']['info'];
  const pintar = (x: Partial<DatosProyecto>) => vistaProyecto({
    proyecto: { ...proyectoVacio(), nombre: 'Talleres' },
    repositorio: { ruta: 'C:/x', info, error: null, cuentaGit: 'laura-gh' },
    plan: { objetivos: [], boletin: [], detectado: undefined, diagnostico: { fecha: null } } as unknown as DatosProyecto['plan'],
    titular: true, nuevo: false, borrador: null,
    diagnostico: { ancla: 'p-diagnostico', titulo: '', cuerpo: '' }, plegable: (clave) => ` data-recuerda="${clave}"`, ...x,
  });
  const valor = (h: string) => h.match(/<input type="text" name="cuenta"[^>]*value="([^"]*)"/)?.[1];

  it('lo escrito sin guardar gana sobre la cuenta guardada; sin nada escrito, la guardada', () => {
    expect(valor(pintar({ cuentaEscrita: 'laura-nueva' }))).toBe('laura-nueva');
    expect(valor(pintar({ cuentaEscrita: '' }))).toBe('');
    expect(valor(pintar({}))).toBe('laura-gh');
    // Quien no es el titular ve la guardada, de solo lectura
    expect(valor(pintar({ titular: false, cuentaEscrita: 'otra' }))).toBe('laura-gh');
  });

  it('la página guarda lo escrito al escribirlo y con «Usar la cuenta activa», y lo suelta al guardar', () => {
    expect(app).toContain("if (campo?.dataset?.conservaFoco === 'cuenta-git' && d) cuentaEscrita = { de: d.activo, valor: campo.value };");
    expect(app).toContain('cuentaEscrita = { de: d.activo, valor: ds.usarCuentaActiva };');
    expect(app).toContain('cuentaEscrita: cuentaEscrita?.de === d.activo ? cuentaEscrita.valor : null,');
    const guardar = app.slice(app.indexOf("if (form.id === 'form-cuenta-git')"), app.indexOf("if (form.id === 'form-proyecto')"));
    expect(guardar.indexOf('cuentaEscrita = null;')).toBeGreaterThan(guardar.indexOf("estado: 'guardada'"));
  });
});
