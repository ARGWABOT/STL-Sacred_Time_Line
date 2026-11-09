import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// El logo abre el inicio (pedido pd_inicio_logo): la marca de la barra es el botón de «Hoy»
const leer = (...r: string[]) => readFileSync(join(__dirname, ...r), 'utf-8');
const html = leer('..', '..', 'index.html');
const director = leer('app.ts');
const estilos = leer('estilos.css');
const css = leer('director.css');

const marca = html.slice(html.indexOf('<div class="marca">'), html.indexOf('<div class="selector-proyecto"'));

describe('el logo abre el inicio', () => {
  it('la marca es un botón de verdad que abre «Hoy» (la vista «misiones»), con el nombre dentro', () => {
    expect(marca).toMatch(/<button type="button" class="marca-inicio" id="ir-inicio" data-vista="misiones" data-tx-title="nav.irInicio">/);
    const boton = marca.slice(marca.indexOf('<button type="button" class="marca-inicio"'), marca.indexOf('</button>'));
    expect(boton).toContain('class="logo"');
    expect(boton).toContain('<b>STL Studio</b>');
    // Los botones de la barra con data-vista los atiende un solo escuchador, y «misiones» es una vista
    expect(director).toContain("const v = b.dataset.vista as Vista;");
    expect(director).toMatch(/const VISTAS: Vista\[\] = \['misiones'/);
  });

  it('el recuadro lleva una casita con su nombre accesible, y ya no el texto «STL»', () => {
    const logo = marca.slice(marca.indexOf('<span class="logo"'), marca.indexOf('</span>', marca.indexOf('<span class="logo"')));
    expect(logo).toContain('<svg');
    expect(logo).toContain('data-tx-aria="nav.irInicio"');
    expect(logo).not.toMatch(/>\s*STL\s*</);
    // La cubierta de carga conserva el suyo
    expect(html).toContain('<span class="cubierta-logo" aria-hidden="true">STL</span>');
  });

  it('«Hoy» sale de las secciones de la barra, y la marca se marca con aria-current cuando estás ahí', () => {
    const grupos = director.slice(director.indexOf('function gruposNav()'), director.indexOf('La primera vez que aparece una sección'));
    expect(grupos).not.toContain("'misiones'");
    expect(grupos).toContain("(['buzon',");
    const pintar = director.slice(director.indexOf('function pintarNavegacion()'), director.indexOf('El arranque, paso a paso'));
    expect(pintar).toContain("const inicio = $('ir-inicio');");
    // «Datos del proceso» (la vista «ruta») es una pestaña de «Hoy»: también se marca (pd_hoy_en_ruta)
    expect(pintar).toContain("if (vista === 'misiones' || vista === 'ruta') inicio.setAttribute('aria-current', 'page');");
    expect(pintar).toContain("else inicio.removeAttribute('aria-current');");
  });

  it('sin proyectos no hay «Hoy» a donde ir, y se ve dónde está el foco', () => {
    expect(director).toContain("$('ir-inicio').toggleAttribute('disabled', true);");
    expect(css).toContain(".marca-inicio[aria-current='page'] .logo");
    // El foco visible lo da la regla de todo el Studio, y la marca no la anula
    expect(estilos).toContain(':focus-visible { outline: 2px solid var(--acento);');
    expect(css).not.toMatch(/\.marca-inicio[^{]*\{[^}]*outline:\s*(none|0)/);
  });
});
