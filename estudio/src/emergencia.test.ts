import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ESPERA_MS, fallaDeEvento, htmlDeVuelta, htmlEmergencia, idiomaDeEmergencia, instalarEmergencia, lineaDeLimite, lineaDeReparacion, reparacionSigue, TEXTOS_EMERGENCIA, type FallaDeCarga } from './emergencia.ts';

const falla: FallaDeCarga = { cuando: '2026-11-09T19:00:00.000Z', mensaje: 'TypeError: x is <undefined>', traza: 'at app.ts:10', donde: 'error' };

/** Un documento mínimo: lo que la pantalla toca, sin un navegador. */
function documentoFalso() {
  const html: string[] = [];
  const atributos = new Map<string, Set<string>>();
  const elemento = (id: string) => ({
    setAttribute: (a: string) => { atributos.set(id, (atributos.get(id) ?? new Set()).add(a)); },
    removeAttribute: (a: string) => { atributos.get(id)?.delete(a); },
    hasAttribute: (a: string) => !!atributos.get(id)?.has(a),
    textContent: '',
    onclick: null as null | (() => void),
  });
  const els = new Map<string, ReturnType<typeof elemento>>();
  const get = (id: string) => { if (!els.has(id)) els.set(id, elemento(id)); return els.get(id)!; };
  const doc = {
    documentElement: { dataset: {} as Record<string, string> },
    body: { insertAdjacentHTML: (_: string, h: string) => { html.push(h); get('emergencia-traza').setAttribute('hidden'); } },
    getElementById: (id: string) => (id === 'cubierta-carga' || html.length ? get(id) : null),
    querySelector: (s: string) => (s.includes('registro') && html.length ? get('boton-registro') : null),
  };
  return { doc: doc as unknown as Document, html, get };
}

function montar(idioma: string | null) {
  const oyentes: Record<string, (e: unknown) => void> = {};
  const enviadas: FallaDeCarga[] = [];
  const esperas: { ms: number; fn: () => void }[] = [];
  const { doc, html, get } = documentoFalso();
  const e = instalarEmergencia({
    ventana: { addEventListener: (t, fn) => { oyentes[t] = fn; } },
    documento: doc,
    idiomaGuardado: () => idioma,
    enviar: async (f) => { enviadas.push(f); return true; },
    ahora: () => falla.cuando,
    esperar: (ms, fn) => { esperas.push({ ms, fn }); },
  });
  return { e, oyentes, enviadas, esperas, doc, html, get };
}

describe('la pantalla de emergencia (pd_salud_a)', () => {
  it('«Diagnosticar y reparar»: la línea de lo que hace y la del límite de cinco horas (nmw9rdaystit, nmw9p8ihbtit)', () => {
    expect(lineaDeReparacion('en', { estado: 'trabaja', minutos: 4, ultimo: 'Runs the tests' })).toBe('Repairing for 4 min · last: Runs the tests.');
    expect(lineaDeReparacion('es', { estado: 'espera' })).toBe(TEXTOS_EMERGENCIA.es.repararEspera);
    expect(lineaDeReparacion('en', { estado: 'deshecha' })).toBe(TEXTOS_EMERGENCIA.en.repararDeshecha);
    expect(lineaDeReparacion('en', null)).toBe(TEXTOS_EMERGENCIA.en.repararSinServidor);
    expect(lineaDeReparacion('en', { estado: 'ninguna' })).toBe('');
    expect(lineaDeLimite('en', { estado: 'ninguna', uso: 91 })).toContain('91 %');
    expect(lineaDeLimite('en', { estado: 'ninguna', uso: 50 })).toBe('');
    expect(reparacionSigue({ estado: 'comprueba' })).toBe(true);
    expect(reparacionSigue({ estado: 'guardada' })).toBe(false);
  });

  it('un clic pide la reparación con la falla que se ve, y mientras sigue la vuelve a mirar cada 5 segundos', async () => {
    const oyentes: Record<string, (e: unknown) => void> = {};
    const esperas: { ms: number; fn: () => void }[] = [];
    const pedidas: FallaDeCarga[] = [];
    const { doc, get } = documentoFalso();
    const e = instalarEmergencia({
      ventana: { addEventListener: (t, fn) => { oyentes[t] = fn; } },
      documento: doc,
      idiomaGuardado: () => 'en',
      enviar: async () => true,
      consultarReparacion: async () => ({ estado: 'ninguna', uso: 95 }),
      pedirReparacion: async (f) => { pedidas.push(f); return { estado: 'trabaja', minutos: 0 }; },
      esperar: (ms, fn) => { esperas.push({ ms, fn }); },
    });
    e.mostrar(falla);
    await new Promise((r) => setTimeout(r, 0));
    expect(get('emergencia-limite').textContent).toContain('95 %');
    get('emergencia-boton-reparar').onclick?.();
    await new Promise((r) => setTimeout(r, 0));
    expect(pedidas).toEqual([falla]);
    expect(get('emergencia-reparar').textContent).toBe('Repairing for 0 min.');
    expect(esperas.some((x) => x.ms === 5000)).toBe(true);
  });

  it('sale en el último idioma usado y, sin ninguno, en inglés (nmw9lr17utit)', () => {
    expect(idiomaDeEmergencia('es')).toBe('es');
    expect(idiomaDeEmergencia('en')).toBe('en');
    expect(idiomaDeEmergencia(null)).toBe('en');
    expect(idiomaDeEmergencia('fr')).toBe('en');
  });

  it('trae sus tres botones, los tres activos: «Diagnosticar y reparar» ya no dice que viene después (pd_salud_c)', () => {
    for (const idioma of ['es', 'en'] as const) {
      const t = TEXTOS_EMERGENCIA[idioma];
      const h = htmlEmergencia(idioma, falla);
      expect(h).toContain(t.diagnosticar);
      expect(h).toContain(t.volver);
      expect(h).toContain(t.registro);
      expect(h).not.toMatch(/<button[^>]*disabled/);
      expect(h).not.toMatch(/Coming later|Llega más adelante/);
      expect(h).toMatch(/id="emergencia-boton-reparar"[^>]*>/);
      expect(h).toMatch(/id="emergencia-boton-volver"[^>]*>/);
      expect(h).not.toMatch(/data-emergencia="volver" disabled/);
      expect(h).toContain(`lang="${idioma}"`);
      // El mensaje se escapa: un error no puede meter HTML
      expect(h).toContain('x is &lt;undefined&gt;');
    }
    expect(TEXTOS_EMERGENCIA.en.diagnosticar).toBe('Diagnose and repair');
    expect(TEXTOS_EMERGENCIA.en.volver).toBe('Go back to the version that worked');
    expect(TEXTOS_EMERGENCIA.en.registro).toBe('See the record');
  });

  it('los dos idiomas tienen las mismas frases', () => {
    expect(Object.keys(TEXTOS_EMERGENCIA.es).sort()).toEqual(Object.keys(TEXTOS_EMERGENCIA.en).sort());
  });

  it('con un error forzado en la carga, sale en el idioma guardado y la falla va al registro', async () => {
    const m = montar('es');
    m.oyentes.error({ type: 'error', error: { message: 'Error forzado', stack: 'at app.ts:1' } });
    // Un error espera a ver si la carga lo tolera
    expect(m.html).toHaveLength(0);
    expect(m.esperas[0].ms).toBe(ESPERA_MS.error);
    m.esperas[0].fn();
    expect(m.html).toHaveLength(1);
    expect(m.html[0]).toContain(TEXTOS_EMERGENCIA.es.titulo);
    expect(m.html[0]).toContain('Error forzado');
    expect(m.doc.documentElement.dataset.estudio).toBe('fallo');
    expect(m.get('cubierta-carga').hasAttribute('hidden')).toBe(true);
    expect(m.enviadas).toEqual([{ cuando: falla.cuando, mensaje: 'Error forzado', traza: 'at app.ts:1', donde: 'error' }]);
    await Promise.resolve();
    await Promise.resolve();
    expect(m.get('emergencia-nota').textContent).toBe(TEXTOS_EMERGENCIA.es.guardado);
    // «Ver el registro» abre y cierra la traza
    const boton = m.get('boton-registro');
    boton.onclick?.();
    expect(m.get('emergencia-traza').hasAttribute('hidden')).toBe(false);
    expect(boton.textContent).toBe(TEXTOS_EMERGENCIA.es.ocultar);
    boton.onclick?.();
    expect(m.get('emergencia-traza').hasAttribute('hidden')).toBe(true);
  });

  it('un archivo del Studio que no carga la muestra ya, en inglés si no hay idioma guardado', () => {
    const m = montar(null);
    m.oyentes.error({ type: 'error', target: { tagName: 'SCRIPT', src: 'http://localhost:5180/estudio/src/app.ts' } });
    expect(m.html[0]).toContain(TEXTOS_EMERGENCIA.en.titulo);
    expect(m.enviadas[0].donde).toBe('archivo');
  });

  it('si el Studio termina de cargar, una falla tolerada no lo tapa, ni después', () => {
    const m = montar('en');
    m.oyentes.unhandledrejection({ type: 'unhandledrejection', reason: new Error('una voz que no cargó') });
    expect(m.esperas[0].ms).toBe(ESPERA_MS.promesa);
    m.e.listo();
    m.esperas[0].fn();
    m.oyentes.error({ type: 'error', target: { tagName: 'SCRIPT', src: 'x.js' } });
    expect(m.html).toHaveLength(0);
    expect(m.enviadas).toHaveLength(0);
    expect(m.doc.documentElement.dataset.estudio).toBe('cargado');
  });

  it('«Volver» muestra primero la versión (nmw9oexiptit) y, con «Volver», vuelve con el commit que se vio', async () => {
    const pedidos: string[] = [];
    let recargada = false;
    const { doc, get } = documentoFalso();
    const e = instalarEmergencia({
      ventana: { addEventListener: () => {} },
      documento: doc,
      idiomaGuardado: () => 'en',
      enviar: async () => true,
      consultarVuelta: async () => ({ estado: 'lista', commit: 'a'.repeat(40), fecha: '2026-11-09T19:00:00Z', despues: 2, sinGuardar: 3 }),
      pedirVuelta: async (commit) => { pedidos.push(commit); return { estado: 'hecha', commit: 'b'.repeat(40), fecha: '2026-11-09T19:00:00Z', respaldo: 'respaldo/antes-de-volver-20261109-200000' }; },
      recargar: () => { recargada = true; },
    });
    e.mostrar(falla);
    const caja = get('emergencia-volver') as unknown as { innerHTML: string; hasAttribute: (a: string) => boolean };
    get('emergencia-boton-volver').onclick?.();
    await new Promise((r) => setTimeout(r, 0));
    expect(caja.innerHTML).toContain('Changes that came after it and are undone: <b>2</b>');
    expect(caja.innerHTML).toContain('The <b>3</b> files not yet in a commit are first saved in a backup branch');
    expect(pedidos).toEqual([]);
    get('emergencia-volver-si').onclick?.();
    await new Promise((r) => setTimeout(r, 0));
    expect(pedidos).toEqual(['a'.repeat(40)]);
    expect(caja.innerHTML).toContain('Done: the Studio’s code is back');
    expect(caja.innerHTML).toContain('<code>respaldo/antes-de-volver-20261109-200000</code>');
    get('emergencia-recargar').onclick?.();
    expect(recargada).toBe(true);
  });

  it('lo que el servidor no puede hacer sale en tu idioma, con su mensaje tal cual (nmw9ogeditit)', () => {
    expect(htmlDeVuelta('es', null)).toContain(TEXTOS_EMERGENCIA.es.volverSinServidor);
    expect(htmlDeVuelta('en', { estado: 'sin_version' })).toContain(TEXTOS_EMERGENCIA.en.volverSinVersion);
    expect(htmlDeVuelta('en', { estado: 'ya_esta' })).toContain(TEXTOS_EMERGENCIA.en.volverYaEsta);
    expect(htmlDeVuelta('en', { estado: 'fallo', detalle: 'fatal: <x>' })).toBe('<p>It could not go back: <code>fatal: &lt;x&gt;</code></p>');
    // Sin cambios sin commit, no se habla del respaldo
    expect(htmlDeVuelta('en', { estado: 'lista', commit: 'a', fecha: '2026-11-09T19:00:00Z', despues: 1, sinGuardar: 0 })).not.toContain('backup');
  });

  it('un evento sin mensaje no es una falla', () => {
    expect(fallaDeEvento({ type: 'error' }, falla.cuando)).toBeNull();
    expect(fallaDeEvento({ type: 'error', target: { tagName: 'IMG' } }, falla.cuando)).toBeNull();
  });

  it('se carga antes que app.ts, y app.ts avisa cuando ya cargó', () => {
    const index = readFileSync('index.html', 'utf8');
    expect(index.indexOf('src="./estudio/src/emergencia.ts"')).toBeGreaterThan(0);
    expect(index.indexOf('src="./estudio/src/emergencia.ts"')).toBeLessThan(index.indexOf('src="./estudio/src/app.ts"'));
    expect(readFileSync('estudio/src/app.ts', 'utf8')).toContain('__stlListo?.()');
    // Sin importar nada: no depende del resto de la interfaz
    expect(readFileSync('estudio/src/emergencia.ts', 'utf8')).not.toMatch(/^import /m);
  });
});
