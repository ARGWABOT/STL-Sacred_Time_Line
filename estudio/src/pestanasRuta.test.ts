import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PESTANA_RUTA_INICIAL, pestanaDeAnclaRuta, pestanaRutaConTecla, pestanaRutaElegida, pestanaRutaValida, pestanasRutaVisibles, tituloPestanaRuta } from './pestanasRuta';

const director = readFileSync(join(__dirname, 'director.ts'), 'utf-8');
const css = readFileSync(join(__dirname, 'director.css'), 'utf-8');

describe('«La ruta», en pestañas de ancho completo por fase (pd_ruta_pestanas, 26 de octubre de 2026)', () => {
  it('las pestañas son La fase, Misiones, Lo pedido y Propuestas, y cada fase abre en «La fase»', () => {
    expect((['fase', 'misiones', 'pedidos', 'propuestas'] as const).map(tituloPestanaRuta)).toEqual(['La fase', 'Misiones', 'Lo pedido', 'Propuestas']);
    expect(PESTANA_RUTA_INICIAL).toBe('fase');
  });

  it('«La fase» siempre está; las demás aparecen solo si la fase trae algo para ellas, en su orden', () => {
    expect(pestanasRutaVisibles({ misiones: 0, pedidos: 0, propuestas: 0 })).toEqual(['fase']);
    expect(pestanasRutaVisibles({ misiones: 12, pedidos: 0, propuestas: 0 })).toEqual(['fase', 'misiones']);
    expect(pestanasRutaVisibles({ misiones: 0, pedidos: 3, propuestas: 2 })).toEqual(['fase', 'pedidos', 'propuestas']);
    expect(pestanasRutaVisibles({ misiones: 1, pedidos: 1, propuestas: 1 })).toEqual(['fase', 'misiones', 'pedidos', 'propuestas']);
  });

  it('cada ancla de la ruta lleva a la pestaña que tiene su parte: el pedido, la propuesta, la misión pasada, el plan y la puerta', () => {
    expect(pestanaDeAnclaRuta('pedido-pd_ruta_pestanas')).toBe('pedidos');
    expect(pestanaDeAnclaRuta('r-pedidos')).toBe('pedidos');
    expect(pestanaDeAnclaRuta('r-despues')).toBe('pedidos');
    expect(pestanaDeAnclaRuta('propuesta-p_algo')).toBe('propuestas');
    expect(pestanaDeAnclaRuta('r-aprobadas')).toBe('propuestas');
    expect(pestanaDeAnclaRuta('pasada-m_una')).toBe('misiones');
    expect(pestanaDeAnclaRuta('mision-m_una')).toBe('misiones');
    expect(pestanaDeAnclaRuta('r-misiones')).toBe('misiones');
    expect(pestanaDeAnclaRuta('r-plan')).toBe('fase');
    expect(pestanaDeAnclaRuta('puerta')).toBe('fase');
  });

  it('un ancla de otra vista, vacía o desconocida no cambia de pestaña', () => {
    for (const a of ['p-objetivo', 'm-permisos', 'escribir', 'r-otra', '', null, undefined]) expect(pestanaDeAnclaRuta(a), String(a)).toBeNull();
  });

  it('la pestaña que se ve: la de lo que un botón señala (si la fase la tiene), si no la elegida de esa fase, y si no «La fase»', () => {
    const todas = pestanasRutaVisibles({ misiones: 4, pedidos: 2, propuestas: 1 });
    expect(pestanaRutaElegida(undefined, null, todas)).toBe('fase');
    expect(pestanaRutaElegida('misiones', null, todas)).toBe('misiones');
    // Un botón a un pedido abre «Lo pedido», aunque se estuviera en otra
    expect(pestanaRutaElegida('misiones', 'pedido-pd_x', todas)).toBe('pedidos');
    expect(pestanaRutaElegida('pedidos', 'pasada-m_x', todas)).toBe('misiones');
    expect(pestanaRutaElegida('propuestas', 'puerta', todas)).toBe('fase');
    // La que se había elegido y ya no está (la fase se quedó sin pedidos), o un ancla que la fase no tiene: «La fase»
    const pocas = pestanasRutaVisibles({ misiones: 4, pedidos: 0, propuestas: 0 });
    expect(pestanaRutaElegida('pedidos', null, pocas)).toBe('fase');
    expect(pestanaRutaElegida('misiones', 'propuesta-p_x', pocas)).toBe('misiones');
    expect(pestanaRutaElegida(undefined, 'propuesta-p_x', pocas)).toBe('fase');
  });

  it('con el teclado: flechas a los lados entre las pestañas que se ven (dando la vuelta), Inicio y Fin; otra tecla no mueve nada', () => {
    const v = pestanasRutaVisibles({ misiones: 4, pedidos: 0, propuestas: 2 });
    expect(v).toEqual(['fase', 'misiones', 'propuestas']);
    expect(pestanaRutaConTecla('fase', 'ArrowRight', v)).toBe('misiones');
    expect(pestanaRutaConTecla('misiones', 'ArrowRight', v)).toBe('propuestas');
    expect(pestanaRutaConTecla('propuestas', 'ArrowRight', v)).toBe('fase');
    expect(pestanaRutaConTecla('fase', 'ArrowLeft', v)).toBe('propuestas');
    expect(pestanaRutaConTecla('propuestas', 'ArrowLeft', v)).toBe('misiones');
    expect(pestanaRutaConTecla('misiones', 'Home', v)).toBe('fase');
    expect(pestanaRutaConTecla('fase', 'End', v)).toBe('propuestas');
    expect(pestanaRutaConTecla('misiones', 'Enter', v)).toBeNull();
    expect(pestanaRutaConTecla('misiones', 'ArrowDown', v)).toBeNull();
    // Solo «La fase»: la flecha da la vuelta a sí misma
    expect(pestanaRutaConTecla('fase', 'ArrowRight', ['fase'])).toBe('fase');
  });

  it('solo vale una pestaña que existe', () => {
    expect(pestanaRutaValida('pedidos')).toBe(true);
    expect(pestanaRutaValida('gasto')).toBe(false);
    expect(pestanaRutaValida(undefined)).toBe(false);
  });
});

describe('la vista de «La ruta» usa las pestañas', () => {
  const vista = director.match(/function vistaRuta\(\) \{[\s\S]*?\n\}\n/)?.[0] ?? '';
  const cuerpos = vista.slice(vista.indexOf('const cuerpos'));
  const tab = (desde: string, hasta?: string) => cuerpos.slice(cuerpos.indexOf(desde), hasta ? cuerpos.indexOf(hasta) : undefined);

  it('ya no son tarjetas una al lado de otra: cada fase es una barra de pestañas y la pestaña elegida', () => {
    expect(vista).not.toContain('dos-columnas');
    expect(vista).toContain('const visibles = pestanasRutaVisibles(cuentas);');
    expect(vista).toContain('${cuerpos[elegida]()}');
  });

  it('cada pestaña muestra cuántas cosas trae, y las demás no aparecen si no traen nada', () => {
    expect(vista).toContain('const cuentas = { misiones: misiones.length, pedidos: pedidos.length + despues.length, propuestas: propuestas.length + aprobadas.length + heredadas.length };');
    expect(vista).toContain('${n === null ? \'\' : ` (${n})`}');
  });

  it('cada parte está en la pestaña a la que su ancla lleva', () => {
    const fase = tab('fase: () =>', 'misiones: () =>');
    for (const x of ['data-ancla="r-plan"', '${pintarPuerta(f)}', '${f.criterios.map((c) => filaCriterio(c, f)).join(\'\')}']) expect(fase, x).toContain(x);
    const misiones = tab('misiones: () =>', 'pedidos: () =>');
    for (const x of ['data-ancla="r-misiones"', 'data-ancla="pasada-${esc(m.id)}"']) expect(misiones, x).toContain(x);
    const pedidos = tab('pedidos: () =>', 'propuestas: () =>');
    for (const x of ['data-ancla="r-pedidos"', 'data-ancla="r-despues"', 'listaDePedidos(pedidos)', 'listaDePedidos(despues)']) expect(pedidos, x).toContain(x);
    const propuestas = tab('propuestas: () =>');
    for (const x of ['data-ancla="r-aprobadas"', 'listaDePropuestas(aprobadas)', 'listaDePropuestas(propuestas)', 'listaDePropuestas(heredadas)']) expect(propuestas, x).toContain(x);
    expect(vista).toContain('const filaPedido = (p: Pedido) => `<li data-ancla="pedido-${esc(p.id)}">');
  });

  it('toda ancla que pinta la ruta tiene su pestaña (y ninguna está en dos)', () => {
    const fuentes = [vista, director.match(/function pintarPuerta\([^)]*\) \{[\s\S]*?\n\}\n/)?.[0] ?? '', director.match(/function filaPropuesta\([^)]*\) \{[\s\S]*?\n\}\n/)?.[0] ?? ''];
    const anclas = fuentes.flatMap((t) => [...t.matchAll(/data-ancla="([a-z-]+)/g)].map((m) => m[1]));
    expect(anclas).toEqual(expect.arrayContaining(['r-plan', 'puerta', 'r-misiones', 'pasada-', 'r-pedidos', 'r-despues', 'pedido-', 'r-aprobadas', 'propuesta-']));
    for (const a of anclas) expect(pestanaDeAnclaRuta(a.endsWith('-') ? `${a}x` : a), `«${a}» no está en ninguna pestaña`).not.toBeNull();
  });

  it('navegar a un ancla elige antes su pestaña (y la fase la recuerda mientras viva la página, sin guardar nada)', () => {
    expect(vista).toContain('const elegida = pestanaRutaElegida(pestanaDeFase.get(f.id), anclaPendiente, visibles);');
    expect(vista).toContain('pestanaDeFase.set(f.id, elegida);');
    // pintar() arma la vista (con su pestaña abierta) antes de buscar el ancla para resaltarla
    const pintar = director.match(/function pintar\(\) \{[\s\S]*?\n\}\n/)?.[0] ?? '';
    expect(pintar).toContain('}[vista]();');
    expect(pintar.indexOf('}[vista]();')).toBeLessThan(pintar.indexOf('const el = v.querySelector<HTMLElement>(`[data-ancla="${CSS.escape(anclaPendiente)}"]`);'));
    expect(pintar).toContain('resaltar(el);');
    const cambiar = director.match(/function cambiarPestanaRuta\([^)]*\) \{[\s\S]*?\n\}\n/)?.[0] ?? '';
    expect(cambiar).toContain('pestanaDeFase.set(fase, id);');
    expect(cambiar).not.toContain('localStorage');
    expect(director).toContain('pestanaDeFase.clear();'); // otro proyecto: lo elegido del anterior no sirve
  });

  it('es una lista de pestañas accesible: roles, aria-selected, aria-controls y una sola en el orden del teclado', () => {
    expect(vista).toContain('role="tablist"');
    expect(vista).toContain('role="tab"');
    expect(vista).toContain('aria-selected="${sel}"');
    expect(vista).toContain('aria-controls="panel-ruta-${id}"');
    expect(vista).toContain('tabindex="${sel ? 0 : -1}"');
    expect(vista).toContain('role="tabpanel" id="panel-ruta-${elegida}" aria-labelledby="pestana-ruta-${elegida}"');
    expect(director).toContain('const otra = pestanaRutaConTecla(pestana.dataset.pestanaRuta as PestanaRuta, e.key, visibles);');
    expect(director).toContain('cambiarPestanaRuta(ds.faseDePestana, ds.pestanaRuta);');
  });

  it('usa las pastillas del Studio, de ancho completo y con sus colores, sin un color propio', () => {
    expect(vista).toContain('class="pestanas-stl pestanas-ruta"');
    expect(vista).toContain('class="pestana-stl${sel ? \' sel\' : \'\'}"');
    expect(css).toContain('.pestanas-stl { display: flex; flex-wrap: wrap;');
    expect(css).not.toMatch(/\.panel-pestana-ruta[^{]*\{[^}]*max-width: \d/);
  });
});
