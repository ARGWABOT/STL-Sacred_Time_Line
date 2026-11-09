import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import planPlantilla from '../../plantilla/plan.json';
import { estadoVacio, TITULAR, type Mision, type Plan } from '../../src/director/director';
import type { PasoSinMision } from '../../src/director/animo';
import { vistaHoy, type DatosHoy } from './todayView';

const mision = (id: string, para = TITULAR): Mision => ({ id, para, fase: 'arranque', frente: 'direccion', titulo: `Misión ${id}`, porQue: 'x', pasos: ['Uno'], entrega: 'y', xp: 10 });
const plan = planPlantilla as unknown as Plan;

/** Los datos de «Hoy», con cada cosa de la página reemplazada por una marca que se reconoce en el HTML. */
function datos(cambios: Partial<DatosHoy> = {}): DatosHoy {
  return {
    plan, estado: estadoVacio(), rol: TITULAR, personas: [TITULAR], arranque: '<arranque/>', filtro: '<filtro/>', etapa: 'en_marcha',
    abiertasDe: () => [], tarjeta: (m, compacta, numero) => `<tarjeta ${m.id} ${numero ?? 0}/>`, cola: (p) => `<cola ${p}/>`, ficha: (p) => `<ficha ${p}/>`,
    pasoSinMision: () => null, seguidas: false, botonIr: (destino) => `<ir ${destino.vista}/>`,
    ...cambios,
  };
}

describe('«Hoy», en su propio módulo (pr_partir_modulos)', () => {
  it('con una persona: su misión de ahora completa, su cola debajo y, sin la ficha al lado, todo el ancho (nota nmw12urbdtit)', () => {
    const html = vistaHoy(datos({ abiertasDe: () => [mision('t_a'), mision('t_b')] }));
    expect(html).toContain('<arranque/>');
    expect(html).toContain('<filtro/>');
    expect(html).toContain('<div class="hoy-columnas solo"><div class="trabajo"><tarjeta t_a 1/>');
    expect(html).not.toContain('t_b');
    expect(html).toContain('<cola titular/>');
    // Su nivel y su avance se abren desde el icono de información sobre el director
    expect(html).not.toContain('<ficha titular/>');
    const app = readFileSync(join(import.meta.dirname, 'app.ts'), 'utf-8');
    expect(app).toContain('function pintarInfoJugador()');
    expect(app).toContain("globo.innerHTML = fichaPersona(rol);");
  });

  it('el icono de tu nivel va en la cara del director flotante, abajo a la izquierda, también sin revisión (notas nmw16j8a4tit y nmw17uq82tit)', () => {
    const app = readFileSync(join(import.meta.dirname, 'app.ts'), 'utf-8');
    const pinta = app.slice(app.indexOf('function pintarInfoJugador()'), app.indexOf('function abrirInfoJugador('));
    // Lo que lo escondía: se colgaba del director de la línea, que solo existe mientras corre una revisión
    expect(pinta).not.toContain('directorEnLinea()');
    expect(pinta).toContain("const flotante = document.getElementById('director-flotante');");
    expect(pinta).toContain('if (!flotante || !rol) {');
    // Dentro del director flotante (siempre a la vista, y encima de un diálogo con él), no suelto en la página
    expect(pinta).toContain('if (boton.parentElement !== flotante) flotante.append(boton);');
    expect(pinta).toContain('if (globo.parentElement !== flotante) flotante.append(globo);');
    expect(pinta).not.toContain('document.body.append');
    expect(pinta).toContain("flotante.classList.toggle('con-info', infoJugadorAbierta);");
    // El director flotante se monta siempre, haya o no revisión
    const equipo = readFileSync(join(import.meta.dirname, 'equipo.ts'), 'utf-8');
    expect(equipo).toContain("flotante.id = 'director-flotante';");
    // Abajo a la izquierda de la cara (70 px de ancho, a la derecha del todo), y el globo se abre hacia arriba a la izquierda
    const css = readFileSync(join(import.meta.dirname, 'director.css'), 'utf-8');
    expect(css).toMatch(/\.info-jugador \{ position: absolute;[^}]*right: 54px; bottom: -4px;/);
    expect(css).toMatch(/\.globo-jugador \{ position: absolute;[^}]*right: 64px; bottom: 26px;/);
    expect(css).toContain('.director-flotante.con-info .df-globo { display: none; }');
    expect(readFileSync(join(import.meta.dirname, 'equipo.css'), 'utf-8')).toContain('.df-cara { width: 70px;');
    // Se abre y se cierra: su clic, Esc o un clic fuera
    expect(app).toContain("if (t.closest('[data-info-jugador]')) abrirInfoJugador(!infoJugadorAbierta);");
    expect(app).toContain("if (e.key === 'Escape' && infoJugadorAbierta) abrirInfoJugador(false);");
  });

  it('mientras corre una revisión, la cara del director que trabaja abre y cierra el panel, sin barra ni botón en medio (notas nmw16j8a4tit y nmw18d768tit)', () => {
    const app = readFileSync(join(import.meta.dirname, 'app.ts'), 'utf-8');
    expect(app).toContain("if (t.closest('[data-progreso]') && panelDeRevision) return alternarPanel();");
    expect(app).toContain('if (panelDeRevision) alternarPanel();');
    // Cerrado, el panel no se ve: ni la franja plegada ni su botón
    const pintar = app.match(/function pintarProgreso\(trabajando: boolean\) \{[\s\S]*?\n\}\n/)?.[0] ?? '';
    expect(pintar).toContain('caja.hidden = trabajando ? cerrado : !progresoSeMuestra(progresoAbierto, trabajando, revisionEnLinea() !== null);');
    // En el panel de una revisión, sin botón (lo de lo urgente lleva el suyo para plegarlo: progresoVivo.ts › botonDelProgreso)
    expect(pintar).toContain('const boton = botonDelProgreso({ enPanel, urgente });');
    expect(app).not.toContain('data-plegar-panel');
    const css = readFileSync(join(import.meta.dirname, 'estilos.css'), 'utf-8');
    expect(css).not.toContain('panel-plegado');
    expect(css).not.toContain('.plegar-panel');
    expect(css).toContain('.principal, .progreso-director.panel-revision { transition: margin-left 0.35s');
  });

  it('sin misión abierta, el paso siguiente, con «Pedir la revisión» que dice que la pide, y las seguidas solo con la revisión automática', () => {
    const pedir: PasoSinMision = { que: 'pedir', texto: 'Pide la revisión.', seguidas: true };
    const html = vistaHoy(datos({ pasoSinMision: () => pedir }));
    expect(html).toContain('<div class="paso-siguiente vacio-m" id="paso-siguiente" role="status"><p>Pide la revisión.</p>');
    expect(html).toContain('data-revision="pedir" data-origen="hoy"');
    expect(html).not.toContain('data-origen="seguidas"');
    expect(vistaHoy(datos({ pasoSinMision: () => pedir, seguidas: true }))).toContain('data-origen="seguidas"');
    // Lo del arranque lleva a «Proyecto»; las propuestas, a las propuestas; sin paso, nada
    expect(vistaHoy(datos({ pasoSinMision: () => ({ que: 'proyecto', texto: 'x' }) }))).toContain('<ir proyecto/>');
    expect(vistaHoy(datos({ pasoSinMision: () => ({ que: 'propuestas', texto: 'x' }) }))).toContain('<ir propuestas/>');
    expect(vistaHoy(datos())).not.toContain('paso-siguiente');
  });

  it('lo entregado espera al director, plegado; y con el equipo a la vista, una columna por persona', () => {
    const entregada = mision('t_e');
    const estado = { ...estadoVacio(), entregas: { t_e: { quien: 'leonc', cuando: '2026-10-31T04:00:00.000Z' } } };
    const conEntrega = vistaHoy(datos({ plan: { ...plan, misiones: [entregada] }, estado }));
    expect(conEntrega).toContain('<h4>Esperando al director</h4><tarjeta t_e 0/>');
    const equipo = vistaHoy(datos({ personas: [TITULAR, 'ana'] }));
    expect(equipo).toContain('<div class="equipo-misiones"><section class="columna-persona yo"><ficha titular/>');
    expect(equipo).toContain('<section class="columna-persona"><ficha ana/>');
  });

  it('app.ts ya no la pinta: le da sus datos al módulo, con la tarjeta de cada misión', () => {
    const director = readFileSync(join(__dirname, 'app.ts'), 'utf-8');
    expect(director).not.toContain('function tareasDe(');
    expect(director).not.toContain('function pasoSiguienteHtml(');
    expect(director).toContain("import { vistaHoy, type DatosHoy } from './todayView';");
    // Dentro de la vista única de «Hoy» y «La ruta» (hoyEnRuta.ts, pd_hoy_en_ruta)
    expect(director).toContain("cuerpo: vistaHoy(datosHoy()) });");
    expect(director).toContain('abiertasDe, tarjeta: tarjetaMision, cola: colaDe, ficha: fichaPersona,');
  });
});
