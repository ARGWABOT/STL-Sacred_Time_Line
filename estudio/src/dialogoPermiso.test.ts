import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as servidor from '../servidor/permisoAlMomento';
import { es } from './textos/es';
import { ponerIdioma } from './textos';
import { avisosDelSonido, contenido, cuentaAtras, ESPERA_PERMISO_MS, explicaTodo, MAX_AVISOS, porQueNoSiempre, preguntaDePrueba, queIntenta, REPETIR_SONIDO_MS, resultadoDePrueba, soloLoQueFalta } from './dialogoPermiso';

describe('una cadena de órdenes en el diálogo: pregunta solo por lo que falta (decisión del titular del 26 de octubre de 2026)', () => {
  it('lo dice en palabras, y nada si no es una cadena', () => {
    expect(soloLoQueFalta({ faltan: ['curl -s http://y'] })).toBe('Son varias órdenes juntas y ya tiene permitidas las demás: te pregunta solo por esta.');
    expect(soloLoQueFalta({ faltan: ['curl -s http://y', 'wget http://z'] })).toMatch(/solo por estas 2\.$/);
    expect(soloLoQueFalta({})).toBe('');
    expect(soloLoQueFalta({ faltan: [] })).toBe('');
  });
});
import { MOMENTOS } from './sonidos';

describe('el diálogo que pregunta un permiso en plena revisión (pd_permiso_espera)', () => {
  it('espera, suena y se calla con la misma regla que el servidor', () => {
    expect([ESPERA_PERMISO_MS, REPETIR_SONIDO_MS, MAX_AVISOS]).toEqual([servidor.ESPERA_PERMISO_MS, servidor.REPETIR_SONIDO_MS, servidor.MAX_AVISOS]);
    for (const tocado of [null, 0, 1, 29_999, 30_000, 45_000, 90_001, 200_000]) expect(avisosDelSonido(1000, tocado == null ? null : 1000 + tocado)).toEqual(servidor.avisosDelSonido(1000, tocado == null ? null : 1000 + tocado));
    // Sin tocarlo: al abrirse y a los 30, 60 y 90 segundos
    expect(avisosDelSonido(0)).toEqual([0, 30_000, 60_000, 90_000]);
  });

  it('dice lo que el director quiere hacer en una línea, y cuánto le queda', () => {
    expect(queIntenta({ solicitud: { herramienta: 'Bash', entrada: { command: 'npm run build', description: 'Arma' } } })).toBe('Bash: npm run build');
    expect(queIntenta({ solicitud: { herramienta: 'Read', entrada: { file_path: 'C:/x/y.ts' } } })).toBe('Read: C:/x/y.ts');
    expect(queIntenta({ solicitud: { herramienta: 'WebSearch', entrada: {} } })).toBe('WebSearch');
    expect(queIntenta({ solicitud: { herramienta: 'Bash', entrada: { command: 'x'.repeat(400) } } })).toHaveLength('Bash: '.length + 301);
    expect(cuentaAtras(120_000, 0)).toBe('2:00');
    expect(cuentaAtras(120_000, 61_500)).toBe('0:59');
    expect(cuentaAtras(0, 5_000)).toBe('0:00');
  });

  it('ofrece «Permitir todo en esta revisión» y explica qué deja pasar, hasta cuándo y lo que no', () => {
    const fuente = readFileSync(join(__dirname, 'dialogoPermiso.ts'), 'utf-8');
    expect(contenido(preguntaDePrueba(0), 0)).toContain('<button type="button" data-permiso="todo">Permitir todo en esta revisión</button>');
    // Sus cuatro salidas son las mismas del servidor (permisoAlMomento.ts › Respuesta)
    expect([...new Set([...fuente.matchAll(/data-permiso="(\w+)"/g)].map((m) => m[1]))].sort()).toEqual(['no', 'siempre', 'todo', 'una_vez']);
    expect(fuente).toContain("export type Respuesta = 'una_vez' | 'siempre' | 'todo' | 'no';");
    for (const frase of ['hasta que termine esta revisión', 'No guarda ninguna regla', 'al terminar, se olvida', 'nunca permite']) expect(explicaTodo(), frase).toContain(frase);
    // En lo que lee una persona, sin símbolos de código
    expect(explicaTodo()).not.toMatch(/&&|\|\||`/);
  });

  it('en inglés, con EN, y con la misma forma; con ES, como siempre (pd_idiomas)', () => {
    const quitarMarcas = (x: string) => x.replace(/<[^>]*>/g, ' ');
    const marcas = (x: string) => x.match(/<[^>]*>/g);
    const pintar = () => [contenido(preguntaDePrueba(0), 2), contenido(preguntaDePrueba(0), 0, true), contenido({ ...preguntaDePrueba(0), faltan: ['x'], puedeSiempre: false, porQueNoSiempre: null, propuesta: { regla: null, que: '', riesgo: '' } }, 1)];
    const enEspanol = pintar();
    expect(enEspanol[0]).toContain('Lo necesita para seguir con la revisión de «Prueba del diálogo»');
    expect(enEspanol[0]).toContain('Después de esta, esperan 2 preguntas más.');
    ponerIdioma('en');
    try {
      const enIngles = pintar();
      for (const html of enIngles) expect(quitarMarcas(html)).not.toMatch(/[áéíóúñ¿]|\b(el director|permiso|revisión|esta|proyecto|Con)\b/i);
      expect(quitarMarcas(enIngles[0])).toContain('The director asks you for a permission');
      expect(quitarMarcas(enIngles[0])).toContain('Allow everything in this review');
      expect(quitarMarcas(enIngles[0])).toContain('After this one, 2 more questions are waiting.');
      expect(quitarMarcas(enIngles[2])).toContain('“Always allow” is not offered for this.');
      expect(quitarMarcas(enIngles[2])).toContain('it asks you only about this one.');
      expect(resultadoDePrueba('no')).toBe('With “I do not authorize it”, the director would have gone on without that permission, and it would stay pending here, in “What the director was denied”, to authorize later. It was a test: nothing was saved.');
      expect(enIngles.map(marcas)).toEqual(enEspanol.map(marcas));
    } finally {
      ponerIdioma('es');
    }
  });

  it('«Probar el diálogo»: un permiso de prueba que no va al servidor y dice lo que habría pasado (t_simulacro_permiso)', () => {
    const p = preguntaDePrueba(1000);
    // Trae las cuatro salidas, con «Permitir siempre», y vence a los dos minutos, como una de verdad
    expect(p).toMatchObject({ puedeSiempre: true, pedidoEn: 1000, venceEn: 1000 + ESPERA_PERMISO_MS });
    expect(queIntenta(p)).toBe('Bash: node --version');
    // Cada salida, y el tiempo que se acaba, dicen lo que habría pasado y que no se guardó nada
    const salidas = ['una_vez', 'siempre', 'todo', 'no', 'vence'] as const;
    const textos = salidas.map((r) => resultadoDePrueba(r));
    expect(new Set(textos).size).toBe(salidas.length);
    for (const t of textos) {
      expect(t).toContain('Era una prueba: no se guardó nada.');
      expect(t).not.toMatch(/&&|\|\||`/);
    }
    // El simulacro no llama al servidor, y una pregunta de verdad lo reemplaza, nunca al revés
    const fuente = readFileSync(join(__dirname, 'dialogoPermiso.ts'), 'utf-8');
    const responder = fuente.slice(fuente.indexOf('async function responder'), fuente.indexOf('function cerrar'));
    expect(responder.indexOf('prueba(resultadoDePrueba(respuesta))')).toBeLessThan(responder.indexOf('fetch('));
    expect(fuente).toContain('if (actual && !actual.simulacro) cerrar();');
    expect(fuente).toContain('if (actual && !actual.simulacro) return alResponder(');
    // Y su botón está en «Cómo pide permisos el director»
    const studio = readFileSync(join(__dirname, 'app.ts'), 'utf-8');
    // La pestaña «Permisos» se pinta en su módulo desde que se partió app.ts (pr_partir_modulos)
    // Su texto está en el archivo de textos (pd_idiomas)
    expect(readFileSync(join(__dirname, 'vistaPermisos.ts'), 'utf-8')).toContain("data-probar-permiso=\"1\">${t('modelo.probarDialogo')}</button>");
    expect(es['modelo.probarDialogo']).toBe('Probar el diálogo');
    expect(studio).toContain('probarDialogo((texto) => avisar(texto, true));');
  });

  it('cuando «Permitir siempre» no se ofrece, dice por qué en una línea: la del servidor, o la de la regla del panel', () => {
    const propuesta = { regla: null, que: 'Correr estas órdenes juntas: cd x', riesgo: '', motivo: 'Son varias órdenes encadenadas: cada una se autoriza sola.' };
    expect(porQueNoSiempre({ porQueNoSiempre: 'la orden junta 2 órdenes en una sola, cada una de su propio tipo.', propuesta })).toBe('«Permitir siempre» no se ofrece para esto: la orden junta 2 órdenes en una sola, cada una de su propio tipo.');
    // Un servidor que aún no manda el motivo: el de la regla del panel
    expect(porQueNoSiempre({ propuesta })).toBe('«Permitir siempre» no se ofrece para esto: Son varias órdenes encadenadas: cada una se autoriza sola.');
    // Sin ninguno, no se inventa uno
    expect(porQueNoSiempre({ propuesta: { regla: null, que: 'x', riesgo: '' } })).toBe('«Permitir siempre» no se ofrece para esto.');
  });

  it('tiene su sonido propio, y la página lo vigila desde que carga', () => {
    expect(MOMENTOS.some((m) => m.id === 'permiso')).toBe(true);
    // Su efecto está entre los sonidos que viajan con el Studio (el servidor los lee de «todas»)
    const efectos = JSON.parse(readFileSync(join(__dirname, '..', 'sonidos', 'efectos.json'), 'utf-8')) as { todas: Record<string, string[]> };
    expect(efectos.todas[MOMENTOS.find((m) => m.id === 'permiso')!.efecto]?.length).toBeGreaterThan(0);
    const pagina = readFileSync(join(__dirname, 'app.ts'), 'utf-8');
    expect(pagina).toMatch(/^vigilarPermisos\(\);$/m);
    // Esc no lo cierra: se responde o vence
    const dialogo = readFileSync(join(__dirname, 'dialogoPermiso.ts'), 'utf-8');
    expect(dialogo).toContain("addEventListener('cancel', (e) => e.preventDefault())");
  });
});
