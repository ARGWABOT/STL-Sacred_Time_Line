import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { abrirAlCargar, lineaSeCongela, recargaTrasRevision, TOPE_ESPERA_TRAS_REVISION_MS } from './trabajando';
import { es } from './textos/es';

const director = readFileSync(join(__dirname, 'app.ts'), 'utf-8').replace(/\r\n/g, '\n');
const tramo = (desde: string, hasta: string) => director.slice(director.indexOf(desde), director.indexOf(hasta, director.indexOf(desde)));

describe('Al terminar la revisión, una sola recarga (nota del titular nmvvmc5rxtit, 30 de octubre de 2026)', () => {
  const pedida = '2026-10-30T23:00:00.000Z';
  it('cerrada con el director vivo (termina lo último), espera; cuando sale, recarga una vez', () => {
    expect(recargaTrasRevision({ termino: true, espera: null, pedida, vivo: true, ahora: 0 })).toBe('esperar');
    const espera = { pedida, desde: 0 };
    expect(recargaTrasRevision({ termino: false, espera, pedida, vivo: true, ahora: 30_000 })).toBe('esperar');
    expect(recargaTrasRevision({ termino: false, espera, pedida, vivo: false, ahora: 40_000 })).toBe('ya');
  });

  it('cerrada con el director ya fuera, recarga en ese momento, como antes', () => {
    expect(recargaTrasRevision({ termino: true, espera: null, pedida, vivo: false, ahora: 0 })).toBe('ya');
  });

  it('si empieza otra revisión (las seguidas) o pasa el tope, recarga sin esperar más', () => {
    const espera = { pedida, desde: 0 };
    expect(recargaTrasRevision({ termino: false, espera, pedida: '2026-10-30T23:30:00.000Z', vivo: true, ahora: 5_000 })).toBe('ya');
    expect(recargaTrasRevision({ termino: false, espera, pedida, vivo: true, ahora: TOPE_ESPERA_TRAS_REVISION_MS + 1 })).toBe('ya');
  });

  it('sin revisión cerrada ni recarga en espera, nada', () => {
    expect(recargaTrasRevision({ termino: false, espera: null, pedida, vivo: true, ahora: 0 })).toBeNull();
  });

  it('la página espera también lo que el servidor suelta al salir el director: esa es la recarga, y un reinicio se suma a la misma cuenta', () => {
    const aviso = tramo("import.meta.hot?.on('estudio:recargar'", '/** El director terminó:');
    expect(aviso.indexOf('if (esperaTrasRevision && !x?.abrir)')).toBeLessThan(aviso.indexOf('Date.now() - cargadaEn < 10_000'));
    expect(aviso).toContain('if (x?.reinicio) conReinicioDelServidor();');
    const cuenta = tramo('function recargarConCuenta', 'function recargarYa');
    expect(cuenta.indexOf('if (reinicio) conReinicioDelServidor();')).toBeLessThan(cuenta.indexOf('if (esperaRecarga) return;'));
    // Mientras espera, lo que llega del plan no se pinta: entra todo junto con la recarga
    const carga = tramo('async function cargar(', 'const CLAVE_TERMINO');
    expect(carga).toContain("(directorTrabaja(nuevo) || tras === 'esperar')) nuevo.plan = d.plan;");
  });
});

describe('La línea de la barra no se rompe mientras la revisión se cierra (nota del titular nmw0ypwnrtit, 3 de noviembre de 2026)', () => {
  const pedida = '2026-11-03T17:00:00.000Z';
  it('se congela al verla cerrada, mientras la recarga espera o cuenta, y nunca en una revisión en marcha', () => {
    expect(lineaSeCongela({ termino: true, tras: 'esperar', espera: null, recargando: false })).toBe(true);
    expect(lineaSeCongela({ termino: false, tras: null, espera: { pedida, desde: 0 }, recargando: false })).toBe(true);
    expect(lineaSeCongela({ termino: false, tras: null, espera: null, recargando: true })).toBe(true);
    expect(lineaSeCongela({ termino: false, tras: null, espera: null, recargando: false })).toBe(false);
  });

  it('la página la congela antes de pintar lo que llegó, y también al empezar cualquier recarga; congelada, no se repinta con datos nuevos', () => {
    const carga = tramo('async function cargar(', 'const CLAVE_TERMINO');
    const congela = carga.indexOf('lineaSeCongela({ termino, tras, espera: esperaTrasRevision, recargando: contando || !!esperaRecarga })) lineaCongelada = true;');
    expect(congela).toBeGreaterThan(0);
    expect(congela).toBeLessThan(carga.indexOf('d = nuevo;'));
    expect(tramo('function recargarConCuenta', 'function recargarYa')).toContain('lineaCongelada = true;');
    expect(tramo('function pintarNavegacion', 'const lupa')).toContain('if (!lineaCongelada) pintarLineaViva(ramasEnLinea(), document, opcionesDeLinea());');
  });
});

describe('Lo que se abre solo al cargar: primero el reporte de lo cumplido, al cerrarlo «¿Dónde quedamos?» (nmvvmc5rxtit)', () => {
  it('tras una revisión o después de un rato, en ese orden', () => {
    expect(abrirAlCargar({ termino: true, tocaResumen: false, mirar: false })).toEqual(['celebracion', 'dondeQuedamos']);
    expect(abrirAlCargar({ termino: false, tocaResumen: true, mirar: false })).toEqual(['celebracion', 'dondeQuedamos']);
  });

  it('si no toca el resumen, solo el reporte (si hay algo que celebrar); con ?mirar, nada', () => {
    expect(abrirAlCargar({ termino: false, tocaResumen: false, mirar: false })).toEqual(['celebracion']);
    expect(abrirAlCargar({ termino: true, tocaResumen: true, mirar: true })).toEqual([]);
  });

  it('el reporte que precede a «¿Dónde quedamos?» no lleva a la misión por encima de él: su botón lo abre', () => {
    const celebrar = tramo('async function celebrarSiToca', '/** Las misiones que se están entregando solas');
    expect(celebrar).toContain('const sigue = mia && !luegoDq ? tarjetaDe(mia) : null;');
    expect(celebrar).toContain('data-cerrar data-siguiente autofocus');
    expect(celebrar).toContain("${tx('celebracion.verDq')}");
    expect(es['celebracion.verDq']).toBe('Ver dónde quedamos →');
  });
});
