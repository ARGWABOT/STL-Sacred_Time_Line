import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ventanaDelAtajo } from '../../src/director/atajo';
import { abrirElAtajo, abrirEnLaPestana, PESTANA_DE_AFUERA, vaALaPestana } from './pestanaAfuera';
import { direccionQa } from './qa';

const leer = (f: string) => readFileSync(join(__dirname, f), 'utf8');

describe('la pestaña de afuera, una sola y reusada (nmwmttqt0tit)', () => {
  it('abre todo lo de afuera con el mismo nombre: el segundo enlace se carga en la misma pestaña', () => {
    const pestanas = new Map<string, { url: string; opener: unknown; focus(): void; enfocada: number }>();
    const abrir = (url: string, nombre: string) => {
      const ya = pestanas.get(nombre);
      const p = ya ?? { url, opener: 'estudio', enfocada: 0, focus() { this.enfocada++; } };
      p.url = url;
      pestanas.set(nombre, p);
      return p;
    };
    expect(abrirEnLaPestana('http://localhost:5180/docs/difusion/mundo-3d.html', abrir)).toBe(true);
    expect(abrirEnLaPestana('https://github.com/ARGWABOT', abrir)).toBe(true);
    expect([...pestanas.keys()]).toEqual([PESTANA_DE_AFUERA]);
    const p = pestanas.get(PESTANA_DE_AFUERA)!;
    expect(p.url).toBe('https://github.com/ARGWABOT');
    // El parentesco con el Studio se conserva (soltarlo le borra el nombre, nmwmwm6pstit), y vuelve al frente cada vez
    expect(p.opener).toBe('estudio');
    expect(p.enfocada).toBe(2);
  });

  it('abre siempre con el nombre fijo y sin noopener, también el mismo botón dos veces (nmwmwm6pstit)', () => {
    const llamadas: [string, string, string | undefined][] = [];
    const abrir = (url: string, nombre: string, opciones?: string) => {
      llamadas.push([url, nombre, opciones]);
      return { focus() {} };
    };
    abrirEnLaPestana('http://localhost:5180/docs/difusion/mundo-3d.html', abrir);
    abrirEnLaPestana('http://localhost:5180/docs/difusion/mundo-3d.html', abrir);
    abrirEnLaPestana('https://argwabot.github.io/STL-Sacred_Time_Line/', abrir);
    expect(llamadas.map((l) => l[1])).toEqual([PESTANA_DE_AFUERA, PESTANA_DE_AFUERA, PESTANA_DE_AFUERA]);
    expect(llamadas.every((l) => !l[2])).toBe(true);
    const fuente = leer('pestanaAfuera.ts').replace(/^\s*(\/\/|\*|\/\*\*).*$/gm, '');
    expect(fuente).not.toMatch(/opener\s*=\s*null/);
    expect(fuente).not.toMatch(/noopener/);
    expect(fuente).toContain('window.open(u, n)');
  });

  it('ningún otro código del Studio abre una página de afuera por su cuenta: solo la pestaña reusada o el atajo', () => {
    const archivos = ['app.ts', 'asistente.ts', 'vistasDeApoyo.ts', 'vistaProyecto.ts', 'enlacesArchivos.ts', 'vistaAjustesPropios.ts'];
    for (const f of archivos) {
      const llamadas = leer(f).match(/window\.open\(.*$/gm) ?? [];
      for (const l of llamadas) expect(l, `${f}: ${l}`).toMatch(/ventanaDelAtajo|PESTANA_DE_AFUERA/);
    }
    // Los enlaces con target="_blank" de esos archivos los toma el clic del documento, en captura
    expect(leer('app.ts')).toMatch(/if \(!abrirEnLaPestana\(a\.href\)\) avisar\(tx\('ir\.noSePudo'\)\);\n\}, true\);/);
  });

  it('el atajo de un proyecto con su aplicación en otro puerto reusa su pestaña en cada clic (nmwo5rfhctit)', () => {
    // Un navegador de mentira con la regla real: un `window.open` con nombre encuentra la pestaña si es del mismo origen
    // que el Studio o si el Studio sigue siendo su `opener`; si no, crea otra
    const ESTUDIO = 'http://localhost:5180';
    type Pestana = { nombre: string; url: string; opener: string | null; focus(): void };
    const navegador = () => {
      const pestanas: Pestana[] = [];
      const origen = (u: string) => new URL(u, ESTUDIO).origin;
      const abrir = (url: string, nombre: string) => {
        const ya = pestanas.find((p) => p.nombre === nombre && (origen(p.url) === ESTUDIO || p.opener === 'estudio'));
        const p = ya ?? { nombre, url, opener: 'estudio', focus() {} };
        p.url = url;
        if (!ya) pestanas.push(p);
        return p;
      };
      return { pestanas, abrir };
    };
    // Como abría antes: soltando el `opener`. Con la página del Studio no se nota; con «app» (8090), una pestaña por clic
    const antes = navegador();
    for (let i = 0; i < 3; i++) {
      const v = antes.abrir('http://localhost:8090/stl-puerta?t=x', 'stl-atajo-app');
      v.opener = null;
    }
    expect(antes.pestanas).toHaveLength(3);
    // Como abre ahora: una sola pestaña por proyecto, la misma en cada clic, para «app» y para el Studio
    const ahora = navegador();
    for (let i = 0; i < 3; i++) abrirElAtajo('http://localhost:8090/stl-puerta?t=x', 'app', ahora.abrir);
    for (let i = 0; i < 2; i++) abrirElAtajo('/__estudio/director/atajo?mision=t&paso=1', 'stl-studio', ahora.abrir);
    expect(ahora.pestanas.map((p) => p.nombre)).toEqual([ventanaDelAtajo('app'), ventanaDelAtajo('stl-studio')]);
    expect(ahora.pestanas.every((p) => p.opener === 'estudio')).toBe(true);
  });

  it('la pestaña de QA (pd_pestana_qa): dos atajos del mismo proyecto, con su dirección de QA, cargan la misma pestaña', () => {
    const pestanas: { nombre: string; url: string }[] = [];
    const abrir = (url: string, nombre: string) => {
      const ya = pestanas.find((p) => p.nombre === nombre);
      if (ya) ya.url = url;
      else pestanas.push({ nombre, url });
      return { focus() {} };
    };
    abrirElAtajo(direccionQa('t_ver', 0), 'app', abrir);
    abrirElAtajo(direccionQa('t_otra', 2), 'app', abrir);
    expect(pestanas).toEqual([{ nombre: ventanaDelAtajo('app'), url: '/__estudio/director/qa?mision=t_otra&paso=2' }]);
  });

  it('dice si el navegador no la dejó abrir', () => {
    expect(abrirEnLaPestana('https://example.org', () => null)).toBe(false);
  });

  it('un clic normal en un enlace de pestaña nueva va a ella; con teclas o a otra cosa, el navegador hace lo suyo', () => {
    const base = { boton: 0, teclas: false, target: '_blank', href: 'https://example.org/x' };
    expect(vaALaPestana(base)).toBe(true);
    expect(vaALaPestana({ ...base, teclas: true })).toBe(false);
    expect(vaALaPestana({ ...base, boton: 1 })).toBe(false);
    expect(vaALaPestana({ ...base, target: null })).toBe(false);
    expect(vaALaPestana({ ...base, href: 'mailto:a@b.c' })).toBe(false);
  });

  it('el Studio la usa en los botones de los pasos y en sus enlaces; nunca otra pestaña nueva por botón', () => {
    const app = leer('app.ts');
    expect(app).toContain('if (dest.url) return void (abrirEnLaPestana(dest.url) || avisar(tx(\'ir.noSePudo\')));');
    expect(app).not.toContain("window.open(dest.url, '_blank'");
    expect(app).toContain("document.addEventListener('click', (e) => {");
    expect(app).toContain('if (!abrirEnLaPestana(a.href)) avisar(tx(\'ir.noSePudo\'));');
  });

  it('el botón de un paso a la página pública de STL abre por la pestaña de QA del proyecto, en su estación (nmwpc43ottit)', () => {
    const app = leer('app.ts');
    expect(app).toContain("if (abre && dest?.url && esPaginaDelStudio(destinoVigente(dest, d?.plan).url ?? '')) {");
    expect(app).toContain('if (!abrirElAtajo(direccionQa(abre[0], abre[1]), d.activo)) avisar(tx(\'ir.noSePudo\'));');
    // La pestaña es la misma reusada de los atajos del proyecto, y la dirección del paso (con su ancla) la pone el servidor
    // desde el plan: la que abre el Studio es la de QA, con la misión y el paso
    const abiertas: [string, string][] = [];
    abrirElAtajo(direccionQa('t_ve_recorrido', 0), 'stl-studio', (u, n) => (abiertas.push([u, n]), { focus() {} }));
    expect(abiertas).toEqual([['/__estudio/director/qa?mision=t_ve_recorrido&paso=0', ventanaDelAtajo('stl-studio')]]);
  });
});
