// La ventana que pide el nombre y el correo de git una vez, al abrir el Studio (ventanaIdentidad.ts; nmwds81gbtit,
// nmwfln1gatit): cuándo se abre, qué dice, y que la página la llama al cargar, antes de la bienvenida.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { faltaIdentidad, htmlVentanaIdentidad } from './ventanaIdentidad';
import { ponerIdioma } from './textos';

describe('la ventana de tu nombre y tu correo', () => {
  afterEach(() => ponerIdioma('es'));

  it('se abre solo si falta el nombre o el correo; con los dos, nunca', () => {
    expect(faltaIdentidad({ nombre: '', correo: '' })).toBe(true);
    expect(faltaIdentidad({ nombre: 'Ana', correo: ' ' })).toBe(true);
    expect(faltaIdentidad({ nombre: '', correo: 'ana@ejemplo.co' })).toBe(true);
    expect(faltaIdentidad({ nombre: 'Ana', correo: 'ana@ejemplo.co' })).toBe(false);
    expect(faltaIdentidad(null)).toBe(false);
  });

  it('pide los dos, dice para qué, y trae «Save» y «Later»; lo que ya había queda escrito', () => {
    ponerIdioma('en');
    const html = htmlVentanaIdentidad({ nombre: 'Ana <b>' });
    for (const x of ['Your name and email', 'signed with your git name and email', 'Your name', 'Your email', '>Save<', '>Later<']) expect(html, x).toContain(x);
    expect(html).toContain('name="nombre"');
    expect(html).toContain('type="email" name="correo"');
    expect(html).toContain('value="Ana &lt;b&gt;"');
    expect(html).not.toMatch(/team|equipo/i);
  });

  it('la página la pide al cargar, antes de pintar la bienvenida, y el servidor la guarda con git config', () => {
    const app = readFileSync(join(__dirname, 'app.ts'), 'utf8');
    const pide = app.indexOf('pedirIdentidadSiFalta(nuevo.identidad, guardarIdentidadEnElServidor');
    expect(pide).toBeGreaterThan(0);
    expect(pide).toBeLessThan(app.indexOf("if ('sinProyectos' in nuevo) return pintarBienvenida(nuevo);"));
    const api = readFileSync(join(__dirname, '..', 'servidor', 'api.ts'), 'utf8');
    const ruta = api.slice(api.indexOf("if (ruta === '/identidad' && req.method === 'POST')"));
    expect(ruta).toContain('identidadValida(cuerpo.nombre, cuerpo.correo)');
    expect(ruta).toContain('guardarIdentidad(raiz, v.nombre, v.correo)');
  });
});
