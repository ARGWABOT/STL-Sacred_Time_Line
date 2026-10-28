import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const director = readFileSync(join(__dirname, 'director.ts'), 'utf-8');
const tramo = (desde: string, hasta: string) => director.slice(director.indexOf(desde), director.indexOf(hasta, director.indexOf(desde)));

describe('«Pedir revisión» nunca mientras un director vive (nota de voz del titular, 22 de octubre de 2026)', () => {
  it('la cabecera pone, en lugar del botón, qué corre y por qué, sin clic', () => {
    const boton = tramo('function botonRevision', 'async function mostrarFalla');
    const ocupado = boton.indexOf('if (ocupado) return');
    expect(ocupado).toBeGreaterThan(0);
    // El estado va antes del botón, y no lleva nada que pida
    expect(ocupado).toBeLessThan(boton.indexOf('data-revision="pedir" title='));
    expect(boton.slice(ocupado, boton.indexOf('\n', ocupado))).not.toContain('data-revision');
    // «Pedirla de nuevo» de una revisión fallida, tampoco
    expect(boton).toContain("r?.error && !ocupado ? '<button type=\"button\" class=\"enlace\" data-revision=\"pedir\">Pedirla de nuevo");
  });

  it('dice si es el de este proyecto, que termina lo último, o uno de otro proyecto, con su porqué', () => {
    const f = tramo('function directorOcupado', 'function minutosSinActividad');
    expect(f).toContain('El director termina lo último');
    expect(f).toContain('Un director trabaja en otro proyecto');
    expect(f).toContain('a la vez');
  });

  it('ni el diálogo de la entrega, ni el de la revisión fallida, ni ningún otro camino la piden con un director vivo', () => {
    const entrega = tramo('async function completarSiToca', 'async function nuevoProyecto');
    expect(entrega).toMatch(/const enMarcha = revisando\(\) \|\| !!ocupado/);
    const falla = tramo('async function mostrarFalla', 'async function pedirAclaracion');
    expect(falla).toContain("${ocupado ? '' : `<button type=\"button\" data-nota");
    const pedir = tramo('async function pedirLaRevision', 'function pintarNavegacion');
    expect(pedir.indexOf('directorOcupado()')).toBeLessThan(pedir.indexOf('fetch('));
  });
});

describe('Quedarse sin misiones no pide la revisión (nota de voz del titular, 22 de octubre de 2026)', () => {
  it('la entrega de una misión, aunque sea la última, no la pide ni la ofrece: solo dice dónde pedirla, cuando quiera', () => {
    const entrega = tramo('async function completarSiToca', 'async function nuevoProyecto');
    expect(entrega).not.toContain('pedirLaRevision');
    expect(entrega).not.toContain('data-pedir');
    expect(entrega).toContain('Pide la revisión cuando quieras');
    expect(entrega).not.toContain('sin ella, no hay misión nueva');
  });
});

describe('Cuando el director se detiene, el porqué, «¿Dónde quedamos?» y la misión, estés donde estés (pedido pd_parada_visible)', () => {
  it('al recargar porque terminó una revisión, «¿Dónde quedamos?» se abre siempre, no solo tras horas sin verlo', () => {
    const arranque = tramo('cargarAlArrancar()', "const v = pedido.get('vista')");
    expect(arranque).toContain('const termino = !!sessionStorage.getItem(CLAVE_TERMINO)');
    expect(arranque).toMatch(/else if \(termino \|\| \(tocaResumen\(\)/);
    // Y desde ahí, su botón lleva a la tarjeta de la misión de ahora
    const dq = tramo('async function mostrarDondeQuedamos', 'function informeNegadosDq');
    expect(dq).toContain('data-a-mision');
  });

  it('el porqué de la parada va lo primero de «¿Dónde quedamos?», también si llega con el diálogo ya abierto', () => {
    const dq = tramo('async function mostrarDondeQuedamos', 'function informeNegadosDq');
    expect(dq.indexOf('lineaDeParo(paro)')).toBeGreaterThan(dq.indexOf('dq-cabeza'));
    expect(dq.indexOf('lineaDeParo(paro)')).toBeLessThan(dq.indexOf('dq-quedamos'));
    const carga = tramo('async function cargar(', 'const CLAVE_TERMINO');
    expect(carga).toContain("cabeza.insertAdjacentHTML('afterend', lineaDeParo(paroNuevo))");
    // Sin el diálogo abierto, se avisa en ese momento, con el botón a «¿Dónde quedamos?»
    expect(carga).toMatch(/avisar\(`Las revisiones seguidas pararon: \$\{paroNuevo\.porque\}`[^\n]*mostrarDondeQuedamos/);
  });

  it('el aviso de la cabecera es corto, para no tapar «¿Dónde quedamos?», y su «¿Por qué?» lo abre', () => {
    const cadena = tramo('function cadenaDeRevisiones', 'function botonRevision');
    const paro = cadena.slice(cadena.indexOf('if (!paroReciente())'));
    expect(paro).toContain('Las seguidas pararon<button type="button" class="enlace" data-donde-quedamos>¿Por qué?</button>');
    expect(paro).not.toContain('Las seguidas pararon: ${esc(s.paro.porque)}');
  });
});
