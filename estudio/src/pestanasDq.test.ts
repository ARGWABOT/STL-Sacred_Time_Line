import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Nota, Respuesta } from '../../src/director/director';
import { barraDePestanasVisible, lineaCompleta, lineaDeRespuesta, lineasDeRespuestas, ORDEN_PESTANAS_DQ, pestanaActiva, pestanaDeSeccion, pestanasConAlgo } from './pestanasDq';

// «¿Dónde quedamos?» por pestañas, según el tipo de lo que se respondió (pedido pd_pestanas_donde_quedamos, parte 3 de
// la propuesta aceptada pr_tipo_nota; nota de voz del titular nmvkb2pnetit)
const nota = (id: string, tipo?: Nota['tipo'], sobre: Nota['sobre'] = { tipo: 'general' }): Nota => ({ id, cuando: '2026-10-28T10:00:00.000Z', quien: 'leonc', sobre, texto: 'Algo.', ...(tipo ? { tipo } : {}) });
const resp = (cuando: string, texto: string, extra: Partial<Respuesta> = {}): Respuesta => ({ cuando, texto, tratamiento: 'integrada', ...extra });

describe('«¿Dónde quedamos?» por pestañas', () => {
  it('cada respuesta desde tu última visita va en la pestaña de su tipo, la más nueva primero; lo de antes no', () => {
    const notas = [nota('n1', 'ajuste'), nota('n2', 'falla'), nota('n3'), nota('n4', 'idea'), nota('n5', undefined, { tipo: 'pregunta' })];
    const respuestas = {
      n1: resp('2026-10-29T02:00:00.000Z', 'Hecho: el botón ya es verde.'),
      n2: resp('2026-10-29T02:05:00.000Z', 'Arreglado.'),
      n3: resp('2026-10-29T02:01:00.000Z', 'Anotado.'),
      n4: resp('2026-10-27T00:00:00.000Z', 'Para después.'),
      n5: resp('2026-10-29T02:02:00.000Z', '**Sí.** Así funciona.'),
    };
    expect(lineasDeRespuestas(notas, respuestas, '2026-10-28T12:00:00.000Z')).toEqual([
      { seccion: 'r-falla', texto: 'Arreglado.' },
      { seccion: 'r-pregunta', texto: '**Sí.** Así funciona.' },
      { seccion: 'r-ajuste', texto: 'Hecho: el botón ya es verde.' },
    ]);
  });

  it('sin la pestaña «Otras notas»: una nota de antes sin tipo no deja línea (nmwf559rgtit)', () => {
    expect(ORDEN_PESTANAS_DQ).toEqual(['pregunta', 'ajuste', 'falla', 'idea', 'ruta']);
    expect(lineasDeRespuestas([nota('n3')], { n3: resp('2026-10-29T02:01:00.000Z', 'Anotado.') }, '')).toEqual([]);
    expect(pestanaDeSeccion('r-otras')).toBe('ruta');
  });

  it('una nota respondida por partes deja una línea por parte, en la pestaña de cada una', () => {
    const r = resp('2026-10-29T02:00:00.000Z', 'Las dos cosas.', { partes: [{ tipo: 'ajuste', texto: 'Cambiado.', tratamiento: 'integrada' }, { tipo: 'idea', texto: 'Guardada.', tratamiento: 'aplazada' }] });
    expect(lineasDeRespuestas([nota('n1', 'ajuste')], { n1: r }, '')).toEqual([{ seccion: 'r-ajuste', texto: 'Cambiado.' }, { seccion: 'r-idea', texto: 'Guardada.' }]);
  });

  it('sin «Lo que me respondiste»: lo respondido a un comentario o a una opción elegida no vuelve a contarte lo que dijiste (nmvt43dvatit, nmvt4jxwjtit)', () => {
    const notas = [nota('n1', 'respuesta'), nota('n2', undefined, { tipo: 'mision', id: 't_x', seccion: 'Paso 1', eleccion: 'Sí' }), nota('n3', 'falla')];
    const respuestas = {
      n1: resp('2026-10-29T02:00:00.000Z', 'Bien, lo confirmas.'),
      n2: resp('2026-10-29T02:01:00.000Z', 'Elegiste «Sí».'),
      n3: resp('2026-10-29T02:02:00.000Z', 'Arreglado.', { partes: [{ tipo: 'falla', texto: 'Arreglado.', tratamiento: 'integrada' }, { tipo: 'respuesta', texto: 'Lo que dijiste.', tratamiento: 'informada' }] }),
    };
    expect(lineasDeRespuestas(notas, respuestas, '')).toEqual([{ seccion: 'r-falla', texto: 'Arreglado.' }]);
    expect(ORDEN_PESTANAS_DQ).not.toContain('respuesta');
    expect(readFileSync(join(__dirname, 'app.ts'), 'utf-8')).not.toContain('Lo que me respondiste');
  });

  it('cada respuesta, entera: sin enlaces, con sus párrafos y nunca cortada a mitad (nota de voz nmvsyrkn4tit)', () => {
    expect(lineaDeRespuesta('**Hecho.** Ver [el commit](https://x).\n\n  Otro   párrafo.\n\n\n')).toBe('**Hecho.** Ver el commit.\n\nOtro párrafo.');
    const larga = `Entendido, ${'y una explicación larga '.repeat(40)}hasta su final.`;
    expect(lineaDeRespuesta(larga)).toBe(larga);
    expect(lineaDeRespuesta(larga)).not.toContain('…');
    expect(lineaDeRespuesta('Lo hice así:\n- uno\n- dos')).toBe('Lo hice así:\n- uno\n- dos');
  });

  it('la línea muestra sus párrafos y sus renglones, y no los recorta el CSS', () => {
    const css = readFileSync(join(__dirname, 'director.css'), 'utf-8');
    expect(css).toMatch(/\.dq-texto \{[^}]*white-space: pre-line/);
    expect(css).not.toMatch(/\.dq-[a-z-]+ \{[^}]*(line-clamp|text-overflow: ellipsis)/);
  });

  it('solo se ven las pestañas que traen algo, en tu orden, y se abre primero la que trae algo nuevo', () => {
    expect(pestanaDeSeccion('r-falla')).toBe('falla');
    expect(pestanaDeSeccion('avanzamos')).toBe('ruta');
    expect(pestanaDeSeccion('director')).toBe('ruta');
    expect(pestanasConAlgo(['ruta', 'idea', 'pregunta'])).toEqual(['pregunta', 'idea', 'ruta']);
    expect(pestanaActiva(['ruta', 'falla'])).toBe('falla');
    // La que abriste se queda mientras traiga algo; si se vació, la siguiente
    expect(pestanaActiva(['ruta', 'falla'], 'ruta')).toBe('ruta');
    expect(pestanaActiva(['ruta'], 'falla')).toBe('ruta');
    expect(pestanaActiva([])).toBeNull();
  });

  it('la barra se ve aunque haya una sola pestaña (nmwgjyp4atit)', () => {
    // Con lo avanzado y una respuesta, las dos; con una sola, la barra igual
    expect(pestanasConAlgo(['ruta', 'pregunta'])).toEqual(['pregunta', 'ruta']);
    expect(barraDePestanasVisible(['ruta', 'pregunta'])).toBe(true);
    expect(barraDePestanasVisible(['pregunta'])).toBe(true);
    expect(barraDePestanasVisible(['ruta'])).toBe(true);
    expect(barraDePestanasVisible([])).toBe(false);
    // Con nada por leer, se abre la que estaba abierta si se sigue viendo, o la primera que se ve
    expect(pestanaActiva([], 'ruta', ['ruta'])).toBe('ruta');
    expect(pestanaActiva([], 'falla', ['ruta'])).toBe('ruta');
    expect(pestanaActiva(['pregunta'], 'ruta', ['pregunta', 'ruta'])).toBe('pregunta');
  });

  it('el diálogo las pinta: una pestaña por tipo y «La ruta», con su barra siempre; lo leído sale de su pestaña y va solo a «Ya leído» (nmwo5m8zxtit)', () => {
    const pagina = readFileSync(join(__dirname, 'app.ts'), 'utf-8');
    expect(pagina).toContain('const respondidas = lineasDeRespuestas(');
    expect(pagina).toContain('data-dq-pestana="${p}"');
    expect(pagina).toContain('if (b.dataset.dqPestana) return mostrarPestanaDq(dlg, b.dataset.dqPestana as PestanaDq);');
    expect(pagina).toContain('mostrarPestanaDq(dlg, pestanaActiva(conAlgo, abierta, conLineas) ?? abierta ?? null);');
    expect(pagina).toContain('if (barra) barra.hidden = !barraDePestanasVisible(conLineas);');
    expect(pagina).not.toContain('conAlgo.length < 2');
    // Ninguna línea leída se queda en su pestaña (ni lo de «La ruta» del resumen de ahora, como pedía nmwgjyp4atit, que
    // nmwo5m8zxtit reemplazó): la lista de cada pestaña es solo lo que falta, y lo leído vive solo en «Ya leído», plegado
    expect(pagina).toContain('est.archivo.filter((l) => l.s === seccion && !l.leida)');
    expect(pagina).toContain('est.archivo.filter((l) => l.leida).sort(');
    expect(pagina).not.toContain('enSuPestanaDq');
    expect(pagina).toContain(".dq-leidas .dq-lista')!.prepend(li)");
  });

  it('una línea que el archivo de este navegador guardó cortada vuelve entera, aunque la respuesta sea de antes de tu última visita (nmvsyn0r4tit)', () => {
    const entera = 'Cómo se encadenan: las pides tú.\n\nNo fijo cuántas de antemano: lo decido al cerrar cada una, y paran cuando algo de verdad te necesita (lo digo, con su razón).';
    // La cortada juntaba los párrafos y terminaba en «…»
    expect(lineaCompleta('Cómo se encadenan: las pides tú. No fijo cuántas de antemano: lo decido al cerrar cada una, y paran cuando algo de verdad te necesita (lo digo, con s…', ['Otra cosa.', entera])).toBe(entera);
    expect(lineaCompleta('Una línea entera, sin cortar.', [entera])).toBeNull();
    expect(lineaCompleta('Nada que ver con ninguna…', [entera])).toBeNull();
    // Y el archivo la cambia al leerse, sin esperar a que la respuesta sea nueva
    const pagina = readFileSync(join(__dirname, 'app.ts'), 'utf-8');
    expect(pagina).toContain("const entera = lineaCompleta(l.t, completas.filter((c) => c.seccion === l.s).map((c) => c.texto));");
    expect(pagina).toContain("completas ??= lineasDeRespuestas(d.estado.notas, d.plan.respuestas, '');");
  });
});
