import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { abrirAlCargar, comoTerminaLaRevision, esElStudioActivo, lineaSeCongela, pantallaTrabajando, recargaTrasRevision, tituloTermino, TOPE_ESPERA_TRAS_REVISION_MS } from './trabajando';
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

  it('si empieza otra revisión o pasa el tope, recarga sin esperar más', () => {
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

describe('Solo el Studio se recarga tras el trabajo del director; otro proyecto termina en su sitio (nota nmwc99ql2tit)', () => {
  const proyectos = [{ id: 'stl-studio', esElStudio: true }, { id: 'idg', esElStudio: false }];
  it('con otro proyecto activo, el fin de una revisión o un diagnóstico es en su sitio, aunque el servidor haya retenido algo', () => {
    expect(comoTerminaLaRevision({ recargaRetenida: true, activo: 'idg', proyectos })).toBe('en_su_sitio');
    expect(comoTerminaLaRevision({ recargaRetenida: false, activo: 'idg', proyectos })).toBe('en_su_sitio');
    // Sin saber cuál es el activo, nada se recarga por una duda
    expect(comoTerminaLaRevision({ recargaRetenida: true })).toBe('en_su_sitio');
    expect(esElStudioActivo(null)).toBe(false);
  });

  it('con el Studio activo, se recarga como antes si el director cambió su código, y si no, en su sitio', () => {
    expect(comoTerminaLaRevision({ recargaRetenida: true, activo: 'stl-studio', proyectos })).toBe('recargar');
    expect(comoTerminaLaRevision({ recargaRetenida: false, activo: 'stl-studio', proyectos })).toBe('en_su_sitio');
  });

  it('cada camino que recarga pregunta antes si el activo es el Studio: la recarga de la revisión, el aviso del servidor y el asistente', () => {
    const recargar = tramo('function recargarLaRevision', 'function conReinicioDelServidor');
    expect(recargar.indexOf('if (!esElStudioActivo(d))')).toBeLessThan(recargar.indexOf('recargarConCuenta('));
    expect(recargar).toContain('cargar(true).then(terminarEnSuSitio, terminarEnSuSitio)');
    const aviso = tramo("import.meta.hot?.on('estudio:recargar'", '/** El director terminó:');
    // El aviso del servidor ya no se suelta con otro proyecto a la vista: trae los datos y la cuenta espera al Studio
    // (nmwprs1e8tit, nmwprpbbmtit; precargaCierre.ts › arranqueDeLaCuenta)
    expect(aviso).toContain('if (!x?.abrir && !esElStudioActivo(d)) void cargar(true);');
    expect(aviso).not.toContain('return void cargar(true);');
    expect(aviso.indexOf('!esElStudioActivo(d)')).toBeLessThan(aviso.indexOf('recargarConCuenta('));
    const cuenta = tramo('function recargarConCuenta', 'function recargarYa');
    expect(cuenta).toContain('arranqueDeLaCuenta({ esElStudio: esElStudioActivo(d), abrir, ocupado: ocupado() || narrando() })');
    const asistente = tramo('void iniciarAsistente(', 'sessionStorage.getItem(CLAVE_ENTREGAR_AL_CARGAR)');
    expect(asistente.indexOf('if (!esElStudioActivo(d))')).toBeLessThan(asistente.indexOf('location.reload()'));
  });
});

describe('La pantalla de espera y el título de la pestaña van en el último idioma que vio este navegador (nota nmw9p9ib3tit; pd_idiomas_resto)', () => {
  afterEach(() => vi.unstubAllGlobals());
  const conIdioma = (guardado: string | null) => vi.stubGlobal('localStorage', { getItem: (k: string) => (k === 'estudio.idioma' ? guardado : null) });

  it('en español si fue el último, en inglés si fue el inglés o si no hay ninguno', () => {
    conIdioma('es');
    expect(pantallaTrabajando()).toContain('<h2>El director está trabajando</h2>');
    conIdioma('en');
    expect(pantallaTrabajando()).toContain('<h2>The director is working</h2>');
    conIdioma(null);
    expect(pantallaTrabajando()).toContain('<h2>The director is working</h2>');
  });

  it('el título de la pestaña oculta dice que el director terminó, en ese idioma', () => {
    const doc = { visibilityState: 'hidden', title: 'Studio', addEventListener: () => undefined, removeEventListener: () => undefined };
    vi.stubGlobal('document', doc);
    conIdioma('es');
    tituloTermino();
    expect(doc.title).toBe('✓ El director terminó · Studio');
    doc.title = 'Studio';
    conIdioma('en');
    tituloTermino();
    expect(doc.title).toBe('✓ The director finished · Studio');
  });
});
