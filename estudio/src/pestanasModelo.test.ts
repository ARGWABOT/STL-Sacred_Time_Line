import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PESTANAS_MODELO, PESTANA_MODELO_INICIAL, pestanaConTecla, pestanaDeAncla, pestanaModeloValida } from './pestanasModelo';
import { FRESCOS_PERMISOS_MS, hayQueLeer, seccionPermisosDeLaPagina, vistaModelo, type DatosModelo } from './modelView';

const director = readFileSync(join(__dirname, 'app.ts'), 'utf-8');

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
  // Salió de app.ts a su módulo al partir los módulos grandes (pr_partir_modulos): las pruebas leen modelView.ts
  const modulo = readFileSync(join(__dirname, 'modelView.ts'), 'utf-8');
  const vista = modulo.match(/export function vistaModelo\(datos: DatosModelo\) \{[\s\S]*?\n\}\n/)?.[0] ?? '';
  const datos = director.match(/function datosModelo\(\): DatosModelo \{[\s\S]*?\n\}\n/)?.[0] ?? '';

  it('salió de app.ts entera: la vista, su barra de pestañas, «Permisos» con su carga y la bitácora', () => {
    expect(vista).not.toBe('');
    expect(datos).not.toBe('');
    for (const f of ['function vistaModelo(', 'function seccionPermisosDeLaPagina(', 'function seccionBitacora(']) expect(director).not.toContain(f);
    expect(director).toContain('modelo: () => vistaModelo(datosModelo()),');
    expect(director).not.toContain('role="tablist" aria-label="Modelo y consumo"');
  });

  it('«Permisos» pide al servidor lo que falta o tiene más de 30 segundos, y nunca dos veces a la vez', () => {
    const ahora = 100_000;
    expect(FRESCOS_PERMISOS_MS).toBe(30_000);
    expect(hayQueLeer(false, 0, false, ahora)).toBe(true);
    expect(hayQueLeer(true, ahora - 10_000, false, ahora)).toBe(false);
    expect(hayQueLeer(true, ahora - 31_000, false, ahora)).toBe(true);
    expect(hayQueLeer(false, 0, true, ahora)).toBe(false);
    const panelVacio = { modo: 'autorizado' as const, negados: { panel: { pendientes: [], autorizados: [] }, marcados: new Set<string>(), alcances: new Map(), activo: 'x', nombre: (id?: string) => id ?? '' }, skills: { panel: null, marcadas: new Set<string>(), nombre: (id?: string) => id ?? '' } };
    const pedidos: string[] = [];
    seccionPermisosDeLaPagina({ datos: panelVacio, permisosLeidos: ahora, leyendoPermisos: false, leerPermisos: () => pedidos.push('permisos'), skillsLeidas: 0, leyendoSkills: false, leerSkills: () => pedidos.push('skills'), ahora });
    expect(pedidos).toEqual(['skills']);
  });

  it('cada parte con ancla «m-…» del Studio está en una pestaña, y cada ancla de una pestaña existe', () => {
    // «El director» y «Lo que gasta» viven en sus módulos desde que se partió app.ts (pr_partir_modulos)
    const codigo = [director, modulo, ...['modeloDelDirector.ts', 'vistaGasto.ts', 'vistaMedicion.ts', 'vistaAjustesPropios.ts', 'vistaPermisos.ts', 'bitacoraDelComputador.ts'].map((a) => readFileSync(join(__dirname, a), 'utf-8'))].join('\n');
    const delCodigo = [...codigo.matchAll(/data-ancla="(m-[a-z]+)"/g)].map((m) => m[1]);
    expect(delCodigo.length).toBeGreaterThan(0);
    for (const a of delCodigo) expect(pestanaDeAncla(a), `«${a}» no está en ninguna pestaña`).not.toBeNull();
    for (const a of PESTANAS_MODELO.flatMap((p) => p.anclas)) expect(delCodigo, `«${a}» ya no existe en app.ts ni en sus módulos`).toContain(a);
  });

  it('«El director» y «Lo que gasta» se pintan desde sus módulos, con lo que leen del Studio, y la medición sigue debajo', () => {
    expect(vista).toContain('director: () => seccionDirector(datos.director),');
    expect(vista).toContain('gasto: () => `${seccionGasto(datos.gasto)}');
    expect(vista).toContain('${seccionMedicion(datos.medicion)}`,');
    expect(datos).toContain('medicion: { medicion: d.medicion ?? null, directorPendiente: hayDirectorPendiente(), plegable: (clave) => plegable(clave) },');
    expect(director).not.toContain('const lineaPaquete = ');
    expect(director).not.toContain('function seccionMedicion(');
    expect(director).not.toMatch(/^const (MODELOS|ESFUERZOS)\b/m);
  });

  it('navegar a un ancla elige antes su pestaña, y solo se pinta la elegida', () => {
    const base = { director: {} as DatosModelo['director'], permisos: {} as DatosModelo['permisos'], ajustes: undefined, gasto: {} as DatosModelo['gasto'], medicion: {} as DatosModelo['medicion'] };
    let cargada = 0;
    const bitacora = { abierta: true, cargar: () => cargada++, datos: () => ({ bitacora: null, error: '', filtro: '', nombre: (id?: string) => id ?? '' }), plegable: ' open' };
    const puestas: string[] = [];
    // Con el ancla de la bitácora, su pestaña se elige antes de pintar, y se trae lo nuevo (está abierta)
    const html = vistaModelo({ ...base, pestana: 'director', ponerPestana: (id) => puestas.push(id), ancla: 'm-bitacora', bitacora });
    expect(puestas).toEqual(['bitacora']);
    expect(html).toContain('id="panel-modelo-bitacora"');
    expect(html).toContain('aria-selected="true" aria-controls="panel-modelo-bitacora"');
    expect(cargada).toBe(1);
    // Sin ancla, la elegida; la bitácora no se pide mientras su pestaña no se ve
    const ajustes = vistaModelo({ ...base, pestana: 'ajustes', ponerPestana: (id) => puestas.push(id), ancla: null, bitacora });
    expect(puestas).toEqual(['bitacora']);
    expect(ajustes).toContain('id="panel-modelo-ajustes"');
    expect(cargada).toBe(1);
    expect(vista).toContain('const deAncla = pestanaDeAncla(datos.ancla);');
    expect(vista).toContain('if (deAncla && deAncla !== datos.pestana) datos.ponerPestana(deAncla);');
    expect(vista).toContain('${cuerpos[pestanaModelo]()}');
    expect(vista).toContain('bitacora: () => seccionBitacora(datos.bitacora),');
    expect(vista).not.toMatch(/\$\{seccionBitacora\(/);
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
    expect(vista).toContain('permisos: () => seccionPermisosDeLaPagina(datos.permisos),');
    expect(vista).toContain('ajustes: () => seccionAjustesPropios(datos.ajustes),');
    expect(datos).toContain('ajustes: d.ajustesPropios,');
    // «Autorizo los marcados», con aire sobre la tarjeta de arriba
    expect(css).toMatch(/\.negados-panel \.acciones-p \{[^}]*margin-top: 1\dpx/);
  });

  it('la pestaña elegida sobrevive a los repintados: vive en una variable y en el navegador', () => {
    expect(director).toContain("localStorage.getItem('estudio.modelo.pestana')");
    expect(director).toContain("localStorage.setItem('estudio.modelo.pestana', id);");
    expect(director).toContain('cambiarPestanaModelo(ds.pestanaModelo);');
  });
});
