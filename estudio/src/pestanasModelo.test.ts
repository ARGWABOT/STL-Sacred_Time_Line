import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PESTANAS_MODELO, PESTANA_MODELO_INICIAL, pestanaConTecla, pestanaDeAncla, pestanaModeloValida } from './pestanasModelo';

const director = readFileSync(join(__dirname, 'director.ts'), 'utf-8');

describe('«Modelo y consumo», en pestañas (nota de voz del titular nmvoqwicctit, 25 de octubre de 2026)', () => {
  it('cada ancla de la vista lleva a la pestaña que tiene su parte', () => {
    expect(pestanaDeAncla('m-director')).toBe('director');
    expect(pestanaDeAncla('m-permisos')).toBe('permisos');
    expect(pestanaDeAncla('m-ajustes')).toBe('ajustes');
    expect(pestanaDeAncla('m-limites')).toBe('gasto');
    expect(pestanaDeAncla('m-consumo')).toBe('gasto');
    expect(pestanaDeAncla('m-medicion')).toBe('gasto');
    expect(pestanaDeAncla('m-bitacora')).toBe('bitacora');
  });

  it('un ancla de otra vista, vacía o desconocida no cambia de pestaña', () => {
    expect(pestanaDeAncla('p-objetivo')).toBeNull();
    expect(pestanaDeAncla('mision-x')).toBeNull();
    expect(pestanaDeAncla('m-no-existe')).toBeNull();
    expect(pestanaDeAncla('')).toBeNull();
    expect(pestanaDeAncla(null)).toBeNull();
    expect(pestanaDeAncla(undefined)).toBeNull();
  });

  it('ninguna parte está en dos pestañas, y cada pestaña tiene al menos una', () => {
    const anclas = PESTANAS_MODELO.flatMap((p) => p.anclas);
    expect(new Set(anclas).size).toBe(anclas.length);
    for (const p of PESTANAS_MODELO) expect(p.anclas.length).toBeGreaterThan(0);
    expect(new Set(PESTANAS_MODELO.map((p) => p.id)).size).toBe(PESTANAS_MODELO.length);
  });

  it('las pestañas son las del contenido: el director, los permisos, los ajustes de Claude Code, lo que gasta y la bitácora', () => {
    // Permisos y ajustes, cada uno en su pestaña (nota de voz del titular nmvow70jqtit, 26 de octubre de 2026)
    expect(PESTANAS_MODELO.map((p) => p.titulo)).toEqual(['El director', 'Permisos', 'Ajustes de Claude Code', 'Lo que gasta', 'Bitácora']);
    expect(PESTANA_MODELO_INICIAL).toBe('director');
  });

  it('solo vale una pestaña que existe (lo guardado en el navegador puede venir de otra versión)', () => {
    expect(pestanaModeloValida('gasto')).toBe(true);
    expect(pestanaModeloValida('bitacora')).toBe(true);
    expect(pestanaModeloValida('otra')).toBe(false);
    expect(pestanaModeloValida(null)).toBe(false);
    expect(pestanaModeloValida(undefined)).toBe(false);
  });

  it('con el teclado: flechas a los lados (dando la vuelta), Inicio y Fin; otra tecla no mueve nada', () => {
    expect(pestanaConTecla('director', 'ArrowRight')).toBe('permisos');
    expect(pestanaConTecla('bitacora', 'ArrowRight')).toBe('director');
    expect(pestanaConTecla('director', 'ArrowLeft')).toBe('bitacora');
    expect(pestanaConTecla('gasto', 'ArrowLeft')).toBe('ajustes');
    expect(pestanaConTecla('permisos', 'ArrowRight')).toBe('ajustes');
    expect(pestanaConTecla('gasto', 'Home')).toBe('director');
    expect(pestanaConTecla('director', 'End')).toBe('bitacora');
    expect(pestanaConTecla('gasto', 'Enter')).toBeNull();
    expect(pestanaConTecla('gasto', 'ArrowDown')).toBeNull();
  });
});

describe('la vista de «Modelo y consumo» usa las pestañas', () => {
  const vista = director.match(/function vistaModelo\(\) \{[\s\S]*?\n\}\n/)?.[0] ?? '';

  it('cada parte con ancla «m-…» del Studio está en una pestaña, y cada ancla de una pestaña existe', () => {
    const delCodigo = [...director.matchAll(/data-ancla="(m-[a-z]+)"/g)].map((m) => m[1]);
    expect(delCodigo.length).toBeGreaterThan(0);
    for (const a of delCodigo) expect(pestanaDeAncla(a), `«${a}» no está en ninguna pestaña`).not.toBeNull();
    for (const a of PESTANAS_MODELO.flatMap((p) => p.anclas)) expect(delCodigo, `«${a}» ya no existe en director.ts`).toContain(a);
  });

  it('navegar a un ancla elige antes su pestaña, y solo se pinta la elegida', () => {
    expect(vista).toContain('const deAncla = pestanaDeAncla(anclaPendiente);');
    expect(vista).toContain('if (deAncla && deAncla !== pestanaModelo) ponerPestanaModelo(deAncla);');
    expect(vista).toContain('${cuerpos[pestanaModelo]()}');
    // La bitácora no se pide mientras su pestaña no se ve
    expect(vista).toContain('bitacora: seccionBitacora,');
    expect(vista).not.toMatch(/\$\{seccionBitacora\(\)\}/);
  });

  it('es una lista de pestañas accesible: roles, aria-selected, aria-controls y una sola en el orden del teclado', () => {
    expect(vista).toContain('role="tablist"');
    expect(vista).toContain('role="tab"');
    expect(vista).toContain('aria-selected="${sel}"');
    expect(vista).toContain('aria-controls="panel-modelo-${p.id}"');
    expect(vista).toContain('tabindex="${sel ? 0 : -1}"');
    expect(vista).toContain('role="tabpanel" id="panel-modelo-${pestanaModelo}" aria-labelledby="pestana-modelo-${pestanaModelo}"');
    expect(director).toContain('const otra = pestanaConTecla(pestana.dataset.pestanaModelo as PestanaModelo, e.key);');
  });

  it('cada tarjeta usa todo el ancho, y las de lo que gasta van una encima de la otra (nota de voz nmvow70jqtit)', () => {
    const css = readFileSync(join(__dirname, 'director.css'), 'utf-8');
    expect(css).not.toMatch(/\.panel-pestana-modelo[^{]*\{[^}]*max-width/);
    expect(vista).not.toContain('limites-primero');
    expect(vista).toContain('permisos: seccionPermisos,');
    expect(vista).toContain('ajustes: seccionAjustesPropios,');
    // «Autorizo los marcados», con aire sobre la tarjeta de arriba
    expect(css).toMatch(/\.negados-panel \.acciones-p \{[^}]*margin-top: 1\dpx/);
  });

  it('la pestaña elegida sobrevive a los repintados: vive en una variable y en el navegador', () => {
    expect(director).toContain("localStorage.getItem('estudio.modelo.pestana')");
    expect(director).toContain("localStorage.setItem('estudio.modelo.pestana', id);");
    expect(director).toContain('cambiarPestanaModelo(ds.pestanaModelo);');
  });
});
