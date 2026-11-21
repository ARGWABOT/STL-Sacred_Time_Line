import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BANDERA, dondeEnLinea, GLOBO_ANCHO_BASE, lineaHoyHtml, medidaDelGlobo, pestanasHoy, puntosSinMeta, tarjetaPuntoHtml, vistaHoyEnRuta, type PuntoEnHoy } from './hoyEnRuta';
import { ponerIdioma } from './textos';
import { en } from './textos/en';
import { es } from './textos/es';

const leer = (ruta: string) => readFileSync(join(__dirname, ruta), 'utf-8').replace(/\r\n/g, '\n');
const punto = (id: string, color: PuntoEnHoy['color'], extra: Partial<PuntoEnHoy> = {}): PuntoEnHoy => ({ id, tipo: color === 'persona' ? 'mision' : color === 'director' ? 'pedido' : 'propuesta', color, titulo: `Título de ${id}`, ...extra });

beforeAll(() => ponerIdioma('en'));
afterAll(() => ponerIdioma('es'));

// «Hoy» con la línea a la meta (pedido pd_una_sola_linea, segunda rebanada; decisiones del 19 de noviembre de 2026)
describe('la línea a la meta en «Hoy»', () => {
  const puntos = [punto('t_a', 'persona', { actual: true }), punto('pd_b', 'director'), punto('pr_c', 'espera'), punto('t_fin', 'persona', { final: true })];

  it('sin texto debajo de los puntos: cada uno con su globo al momento y su contenido entero (nmwnn7ekqtit, nmwnnb5aitit)', () => {
    const conDetalle = puntos.map((p, i) => (i === 1 ? { ...p, detalle: 'Lo que se pidió, entero' } : p));
    const html = lineaHoyHtml({ puntos: conDetalle, plegados: 0, quedan: 4, meta: 'Published on GitHub' });
    expect(html).not.toContain('punto-nombre');
    // Sin el globo nativo del navegador, que tarda: el de la plataforma, uno por punto y la bandera
    expect(html).not.toMatch(/<button[^>]*title=/);
    expect(html.match(/class="punto-globo/g)).toHaveLength(puntos.length + 1);
    expect(html).toContain('<small>Your mission now</small><b>Título de t_a</b>');
    expect(html).toContain('<small>The director builds it</small><b>Título de pd_b</b><span>Lo que se pidió, entero</span>');
    expect(html).toContain('<small>A proposal waiting for your answer</small>');
    for (const p of puntos) expect(html).toContain(`data-punto="${p.id}"`);
    expect(html).toContain('aria-current="step"');
    // Los de los bordes abren su globo hacia dentro
    expect(html).toContain('class="punto-globo izq"');
    expect(html).toContain('class="punto-globo der"');
    // Cada clase en su color, y el final, distinto
    expect(html).toContain('class="punto c-persona actual"');
    expect(html).toContain('class="punto c-director"');
    expect(html).toContain('class="punto c-espera"');
    expect(html).toContain('class="punto c-persona final"');
  });

  it('lo entregado de la tanda va marcado, y el punto elegido abre su tarjeta (nmwnnb5aitit, nmwmz0kd3tit)', () => {
    const html = lineaHoyHtml({ puntos: [punto('t_0', 'persona', { hecho: true }), ...puntos], plegados: 0, quedan: 4, meta: 'x', elegido: 'pd_b' });
    expect(html).toContain('class="punto c-persona hecho"');
    expect(html).toContain('<span class="bolita" aria-hidden="true">✓</span>');
    expect(html).toContain('<small>Delivered: the director reviews it in the next review</small>');
    expect(html).toContain('class="punto c-director elegido"');
    expect(html).toMatch(/data-punto="pd_b"[^>]*aria-expanded="true"/);
    const tarjeta = tarjetaPuntoHtml({ id: 'pd_b', que: 'The director builds it', titulo: 'Un pedido', partes: [{ rotulo: 'What was asked', html: '<p>Todo</p>' }], botones: '<button>X</button>' });
    expect(tarjeta).toContain('data-tarjeta-punto="pd_b"');
    expect(tarjeta).toContain('<dt>What was asked</dt><dd><p>Todo</p></dd>');
    expect(tarjeta).toContain('<button>X</button><button type="button" class="boton-suave" data-punto-cerrar>Back to my mission</button>');
  });

  it('con todo hecho, la bandera es el punto de ahora, y su tarjeta lleva sus dos botones (nmwno7lj1tit)', () => {
    const html = lineaHoyHtml({ puntos: [], plegados: 0, quedan: 0, meta: 'Published', elegido: BANDERA });
    expect(html).toContain('class="bandera actual elegido"');
    expect(html).toContain(`data-punto="${BANDERA}"`);
    expect(html).toContain('>all done<');
    const app = leer('app.ts');
    const tarjeta = app.slice(app.indexOf('function tarjetaDelPunto('), app.indexOf('function tarjetaDelPunto(') + 3000);
    // «Meta cumplida» se confirma con lo sin marcar a la vista (nmwnz4vqytit); después, «Edit the goal», y editada con nada
    // pendiente, «Request the review» (nmwnz65v5tit)
    expect(tarjeta).toContain("data-cruzar=\"${esc(fase.id)}\">${esc(tx('hoyRuta.cumplida'))}");
    expect(tarjeta).toContain("data-replantear-objetivo>${esc(tx('proyecto.replantear'))}");
    expect(tarjeta).toContain('data-revision="pedir" data-origen="meta"');
    expect(tarjeta).toContain("metaCambiada(d.proyecto, d.plan.revisado)");
    expect(en['hoyRuta.metaQueda']).not.toMatch(/Set the next goal/);
    expect(app).toContain('...(sinMarcar.length ? { conPendientes: true } : {})');
    expect(app).toContain('const elegido = puntoElegido ?? (l.quedan === 0 && !banderaCerrada ? BANDERA : null);');
  });

  it('el globo de un punto muestra todo su contenido dentro de la ventana: primero a lo ancho, luego rueda (nmwnyz4zttit)', () => {
    const ventana = { ancho: 1600, alto: 900 };
    const punto = { left: 790, right: 820, top: 100, bottom: 130 };
    // Un texto que, a 360 de ancho, mide 1400 de alto: se ensancha hasta caber abajo, sin rodar
    const texto = (alto360: number) => (tope: number) => ({ ancho: tope, alto: Math.ceil((alto360 * 360) / tope) });
    const ancho = medidaDelGlobo(punto, texto(1400), ventana);
    expect(ancho.ancho).toBeGreaterThan(GLOBO_ANCHO_BASE);
    expect(ancho.lado).toBe('abajo');
    expect(texto(1400)(ancho.ancho).alto).toBeLessThanOrEqual(ancho.altoMax);
    expect(ancho.left).toBeGreaterThanOrEqual(8);
    expect(ancho.left + ancho.ancho).toBeLessThanOrEqual(ventana.ancho - 8);
    // Uno corto no crece
    expect(medidaDelGlobo(punto, () => ({ ancho: 200, alto: 60 }), ventana)).toMatchObject({ ancho: GLOBO_ANCHO_BASE, lado: 'abajo' });
    // Ni con todo el ancho cabe: toma el alto que queda en la ventana y rueda
    const enorme = medidaDelGlobo(punto, texto(40000), ventana);
    expect(enorme.ancho).toBe(ventana.ancho - 16);
    expect(enorme.top + enorme.altoMax).toBeLessThanOrEqual(ventana.alto - 8);
    // Un punto pegado al borde de abajo abre su globo hacia arriba, dentro de la ventana
    const abajo = medidaDelGlobo({ left: 10, right: 40, top: 860, bottom: 890 }, () => ({ ancho: 300, alto: 200 }), ventana);
    expect(abajo.lado).toBe('arriba');
    expect(abajo.top).toBeGreaterThanOrEqual(8);
    expect(abajo.left).toBeGreaterThanOrEqual(8);
    // Recibe el puntero (sigue abierto mientras se lee), rueda lo que sobra y la rueda sobre su punto lo mueve
    const css = leer('director.css');
    const regla = css.slice(css.indexOf('.punto-globo {'), css.indexOf('}', css.indexOf('.punto-globo {')));
    expect(regla).not.toContain('pointer-events: none');
    expect(regla).toContain('overflow-y: auto');
    expect(css).toContain('.linea-meta li:hover::after, .meta-cabeza:hover::after { top: 100%; }');
    const app = leer('app.ts');
    expect(app).toContain('const m = medidaDelGlobo(ancla, medir, { ancho: anchoDeVentana(), alto: altoDeVentana() });');
    expect(app).toContain('g.scrollTop += e.deltaY;');
  });

  it('lo que no cabe se pliega en «and N more», y abierto ofrece «Show fewer» (nmwn1gkpytit)', () => {
    expect(lineaHoyHtml({ puntos, plegados: 24, quedan: 28, meta: 'x' })).toContain('data-linea-mas>and 24 more<');
    expect(lineaHoyHtml({ puntos, plegados: 0, quedan: 4, meta: 'x' })).not.toContain('data-linea-mas');
    expect(lineaHoyHtml({ puntos, plegados: 0, quedan: 4, meta: 'x', abierta: true })).toContain('data-linea-menos>Show fewer<');
  });

  it('la bandera dice cuántos quedan, nunca un porcentaje, con la meta en su globo (nmwn1gup1tit)', () => {
    const html = lineaHoyHtml({ puntos, plegados: 10, quedan: 14, meta: 'Published on GitHub' });
    expect(html).toContain('<span class="bandera-dice">14 to go</span><span class="punto-globo der" role="tooltip"><small>Your goal</small><b>Published on GitHub</b>');
    expect(html).not.toMatch(/%/);
    expect(html.indexOf('marca-hoy')).toBeLessThan(html.indexOf('data-punto="t_a"'));
    expect(html.indexOf('data-punto="t_fin"')).toBeLessThan(html.indexOf('class="bandera"'));
  });

  it('sin meta, una línea corta a ella, con la bandera vacía (nmwn1hld9tit)', () => {
    const html = lineaHoyHtml({ puntos: puntosSinMeta(['diagnostico', 'meta']), plegados: 0, quedan: 0, meta: null });
    expect(html).toContain('<small>Your mission now</small><b>Read the diagnosis</b>');
    expect(html).toContain('<b>Set your goal</b>');
    expect(html).toContain('class="bandera vacia"');
    expect(html).toContain('Your goal, still to set');
    expect(lineaHoyHtml({ puntos: puntosSinMeta(['meta']), plegados: 0, quedan: 0, meta: null })).toContain('<small>Your mission now</small><b>Set your goal</b>');
  });

  it('la cabecera: el proyecto y la sección, sin «Phase», y debajo la meta, pequeña y entera en su globo (nmwn1h6y1tit, nmwnnc4k5tit)', () => {
    const html = dondeEnLinea({ proyecto: 'STL Studio', seccion: 'Today', meta: 'STL Studio published on GitHub' });
    expect(html).toContain('STL Studio <span class="aqui">› Today</span>');
    expect(html).toContain('<h1 class="meta-cabeza" tabindex="0"><span class="titulo-fase">STL Studio published on GitHub</span><span class="punto-globo" role="tooltip"><small>Your goal</small><b>STL Studio published on GitHub</b>');
    expect(html).not.toContain('title=');
    expect(html).not.toMatch(/Phase/);
    expect(dondeEnLinea({ proyecto: 'p', seccion: 'Today', meta: null })).toContain('Your goal, still to set');
    const app = leer('app.ts');
    expect(app).toContain('${enLinea ? dondeEnLinea({ proyecto: d.proyecto.nombre || d.activo, seccion, meta: objetivo?.texto?.trim() || null, editar: titular() }) :');
    // El atajo «Edit the goal», junto a la meta (nmwnz2wrvtit); nada dice ya «Reset the goal»
    expect(dondeEnLinea({ proyecto: 'p', seccion: 'Today', meta: 'M', editar: true })).toContain('<button type="button" class="enlace meta-editar" data-replantear-objetivo>Edit the goal</button>');
    expect(dondeEnLinea({ proyecto: 'p', seccion: 'Today', meta: 'M' })).not.toContain('data-replantear-objetivo');
    expect(JSON.stringify(en)).not.toContain('Reset the goal');
    expect(en['replantear.boton']).toBe('Save the goal');
    expect(app).toContain("if (editar) return void clicEnVista(editar);");
  });

  it('«Process data» ya no dice «Phase»: su pestaña es la ruta entera a la meta (nmwn15tdrtit, nmwn16ecstit)', () => {
    expect(en['ruta.pestanaFase']).toBe('Roadmap');
    expect(es['ruta.pestanaFase']).toBe('La ruta');
    for (const k of ['ruta.pestanaFase', 'ruta.fase', 'ruta.planFase'] as const) {
      expect(en[k]).not.toMatch(/phase/i);
      expect(es[k]).not.toMatch(/fase/i);
    }
  });
});

describe('«Hoy» y «Datos del proceso», una sola vista', () => {
  it('dos pestañas: «Your mission» (la vista de Hoy) y «History» (la de la ruta, nmwnz4curtit), con la línea arriba', () => {
    const html = pestanasHoy('proceso');
    expect(html).toContain('>History</button>');
    expect(es['hoyRuta.proceso']).toBe('Historia');
    expect(html).toContain('data-ir="misiones"');
    expect(html).toContain('data-ir="ruta"');
    expect(html).toMatch(/class="pestana-stl sel" data-ir="ruta" aria-selected="true"/);
    const vista = vistaHoyEnRuta({ linea: '<nav class="linea-meta"></nav>', pestana: 'mision', cuerpo: '<p>la misión</p>' });
    expect(vista.indexOf('linea-meta')).toBeLessThan(vista.indexOf('<p>la misión</p>'));
  });

  it('la página: «Hoy» y la ruta pintan la misma línea; un punto abre su tarjeta; sin la ruta, «Propuestas» ni «Up next»', () => {
    const app = leer('app.ts');
    // (con la línea de la urgencia encima de tu misión, si la hay: pd_urgencia_bloquea)
    expect(app).toContain("return vistaHoyEnRuta({ linea: lineaEnHoy(), pestana: 'mision', cuerpo: lineaUrgenciaHtml() + vistaHoy(datosHoy()) });");
    expect(app).toContain("return vistaHoyEnRuta({ linea: lineaEnHoy(), pestana: 'proceso', cuerpo: vistaRutaHtml({");
    expect(app).toContain('lineaDeHoy(puntosDeLaLinea(d.plan, d.estado), { persona, abierta: lineaAbierta, hechos: hechosDeLaTanda(d.plan, d.estado, persona) })');
    // Un clic abre la tarjeta debajo de la línea, sin ir a otra sección
    expect(app).not.toContain('function destinoDelPunto(');
    expect(app).toContain('puntoElegido = cerrar ? null : id;');
    expect(leer('todayView.ts')).not.toContain('datos.cola(');
    const grupos = app.slice(app.indexOf('function gruposNav()'), app.indexOf('function gruposNav()') + 1200);
    expect(grupos).not.toContain("'propuestas'");
    expect(grupos).not.toContain("(['ruta',");
  });

  it('sin la cuenta de la reserva ni los frentes a la vista', () => {
    expect(leer('vistaRuta.ts')).not.toContain("t('ruta.frentes')");
  });
});
