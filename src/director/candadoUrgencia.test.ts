import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { avanzaAlgo, avanzaUnaMision, BOTONES_DE_AVANCE, etapaDelCandado, fotoDeMisiones, misionesCambiadas, urgenciaBloquea } from './candadoUrgencia';

const leer = (ruta: string) => readFileSync(new URL(ruta, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

describe('el candado del director, etapa por etapa (pd_candado_revision, nmws24jddtit)', () => {
  const pedida = '2026-11-22T17:00:00Z';
  const avanzar = [
    { tipo: 'paso', mision: 't_a', hechos: [0] },
    { tipo: 'entregar', mision: 't_a' },
    { tipo: 'comentar', sobre: { tipo: 'mision', id: 't_a', seccion: 'Paso 1', eleccion: 'Sí' } },
    { tipo: 'responder', propuesta: 'pr_a', estado: 'aceptada' },
    { tipo: 'comentar', sobre: { tipo: 'documento', id: 'docs/x.md', seccion: '1', decision: 'A', postura: 'aprueba' } },
  ];
  /** Lo que el servidor y la página hacen con cada acción: rechazarla si el candado está puesto y la acción avanza. */
  const rechaza = (etapa: ReturnType<typeof etapaDelCandado>, cuerpo: Record<string, unknown>) => !!etapa && avanzaAlgo(cuerpo);
  const casos: [string, Parameters<typeof etapaDelCandado>[0], Parameters<typeof etapaDelCandado>[0], string][] = [
    ['la revisión que planea', { revision: { pedida, lanzada: pedida }, planeando: true }, { revision: { pedida, lanzada: pedida, hecha: pedida } }, 'planeando'],
    ['la revisión que ejecuta', { revision: { pedida, lanzada: pedida, enCurso: pedida } }, { revision: { pedida, lanzada: pedida, enCurso: pedida, hecha: pedida } }, 'ejecutando'],
    ['la urgencia', { urgencia: { pedida, lanzada: pedida } }, { urgencia: { pedida, lanzada: pedida, hecha: pedida } }, 'urgencia'],
    ['la aclaración', { aclaracion: { pedida, lanzada: pedida } }, { aclaracion: { pedida, lanzada: pedida, hecha: pedida } }, 'aclaracion'],
  ];
  for (const [nombre, durante, despues, etapa] of casos) {
    it(`${nombre}: lo que avanza se apaga y se rechaza mientras dura, y vuelve al cerrar`, () => {
      expect(etapaDelCandado(durante)).toBe(etapa);
      for (const c of avanzar) expect(rechaza(etapaDelCandado(durante), c)).toBe(true);
      // El ✉ y leer, nunca
      expect(rechaza(etapaDelCandado(durante), { tipo: 'comentar', sobre: { tipo: 'mision', id: 't_a', seccion: 'Paso 1' } })).toBe(false);
      expect(rechaza(etapaDelCandado(durante), { tipo: 'leido', doc: 'docs/x.md' })).toBe(false);
      expect(etapaDelCandado(despues)).toBeNull();
      for (const c of avanzar) expect(rechaza(etapaDelCandado(despues), c)).toBe(false);
    });
  }

  it('sin candado: nada en marcha, una revisión solo pedida, una que falló, o «Ya lo hice: compruébalo tú»', () => {
    expect(etapaDelCandado({})).toBeNull();
    expect(etapaDelCandado({ revision: { pedida } })).toBeNull();
    expect(etapaDelCandado({ revision: { pedida, lanzada: pedida, error: 'Detenida' } })).toBeNull();
    expect(etapaDelCandado({ aclaracion: { pedida, lanzada: pedida, comprobar: true } })).toBeNull();
    expect(etapaDelCandado({ urgencia: { pedida, error: 'no' } })).toBeNull();
  });
});

describe('el candado de una urgencia (pd_urgencia_bloquea)', () => {
  it('bloquea mientras lo urgente está pedido o lanzado, y se levanta al terminar o al detenerse (nmwf5tw9utit)', () => {
    expect(urgenciaBloquea({ pedida: '2026-11-16T10:00:00Z' })).toBe(true);
    expect(urgenciaBloquea({ pedida: '2026-11-16T10:00:00Z', lanzada: '2026-11-16T10:00:05Z' })).toBe(true);
    expect(urgenciaBloquea({ pedida: '2026-11-16T10:00:00Z', hecha: '2026-11-16T10:10:00Z' })).toBe(false);
    expect(urgenciaBloquea({ pedida: '2026-11-16T10:00:00Z', error: 'Detenida' })).toBe(false);
    expect(urgenciaBloquea(null)).toBe(false);
  });

  it('detiene lo que hace avanzar una misión o una decisión: el ✉, leer y «Agregar a esta decisión» siguen abiertos (nmwflsg3itit; nmws24jddtit reemplaza nmwfnxlyztit)', () => {
    for (const tipo of ['paso', 'entregar', 'empezar', 'deshacer_entrega']) expect(avanzaUnaMision({ tipo })).toBe(true);
    expect(avanzaUnaMision({ tipo: 'comentar', sobre: { tipo: 'mision', id: 't_a', seccion: 'Paso 1', eleccion: 'Sí' } })).toBe(true);
    expect(avanzaUnaMision({ tipo: 'comentar', sobre: { tipo: 'mision', id: 't_a', seccion: 'Paso 1', hazlo: true } })).toBe(true);
    expect(avanzaUnaMision({ tipo: 'comentar', sobre: { tipo: 'mision', id: 't_a', seccion: 'Paso 1', aclarar: true } })).toBe(true);
    // Las decisiones: una propuesta, «Apruebo lo que recomiendas» y «Decido otra cosa»
    expect(avanzaAlgo({ tipo: 'responder', propuesta: 'pr_a', estado: 'aceptada' })).toBe(true);
    expect(avanzaAlgo({ tipo: 'comentar', sobre: { tipo: 'documento', id: 'docs/x.md', seccion: '1', decision: 'A', postura: 'aprueba' } })).toBe(true);
    expect(avanzaAlgo({ tipo: 'comentar', sobre: { tipo: 'documento', id: 'docs/x.md', seccion: '1', decision: 'A', postura: 'decide' } })).toBe(true);
    // El ✉ de un paso, «Agregar a esta decisión», una nota general y leer: abiertos
    expect(avanzaAlgo({ tipo: 'comentar', sobre: { tipo: 'mision', id: 't_a', seccion: 'Paso 1' } })).toBe(false);
    expect(avanzaAlgo({ tipo: 'comentar', sobre: { tipo: 'documento', id: 'docs/x.md', seccion: '1', decision: 'A', postura: 'comenta' } })).toBe(false);
    expect(avanzaAlgo({ tipo: 'comentar', sobre: { tipo: 'documento', id: 'docs/x.md', seccion: '1' } })).toBe(false);
    expect(avanzaAlgo({ tipo: 'comentar', sobre: { tipo: 'general' } })).toBe(false);
    expect(avanzaAlgo({ tipo: 'leido', doc: 'docs/x.md' })).toBe(false);
  });

  it('dice qué misiones de la persona cambió: nuevas, quitadas y con otros pasos (nmwduvygmtit)', () => {
    const antes = fotoDeMisiones([{ id: 'a', titulo: 'A', pasos: ['uno'] }, { id: 'b', titulo: 'B', pasos: ['dos'] }, { id: 'c', titulo: 'C', pasos: [] }]);
    const despues = fotoDeMisiones([{ id: 'a', titulo: 'A', pasos: ['uno'] }, { id: 'b', titulo: 'B', pasos: ['dos, mejor dicho'] }, { id: 'd', titulo: 'D', pasos: [] }]);
    expect(misionesCambiadas(antes, despues)).toEqual([
      { id: 'b', titulo: 'B', que: 'cambiada' },
      { id: 'd', titulo: 'D', que: 'nueva' },
      { id: 'c', titulo: 'C', que: 'quitada' },
    ]);
    expect(misionesCambiadas(antes, antes)).toEqual([]);
  });

  it('el servidor también rechaza esas acciones mientras dura, y la página las apaga con el mismo juego de botones', () => {
    const api = leer('../../estudio/servidor/api.ts');
    const accion = api.slice(api.indexOf("if (ruta === '/accion' && req.method === 'POST')"));
    expect(accion.indexOf('if (avanzaAlgo(cuerpo)) {')).toBeGreaterThan(0);
    expect(accion.indexOf('const etapa = etapaDelCandado({')).toBeLessThan(accion.indexOf('decidir(id, cuerpo'));
    expect(accion).toContain('if (etapa) return responder(res, 409,');
    const css = leer('../../estudio/src/director.css');
    const regla = css.match(/^body\.candado-director :is\(.*$/m)?.[0] ?? '';
    for (const b of BOTONES_DE_AVANCE) expect(regla).toContain(b);
    // El ✉ de los pasos y «Agregar a esta decisión» no se apagan: solo el «Decido otra cosa» de los comentarios
    expect(regla.replace('[data-comentar$="|decide"]', '')).not.toContain('comentar');
    const app = leer('../../estudio/src/app.ts');
    expect(app).toContain('const etapa = avanzaAlgo(cuerpo) ? candadoAhora() : null;');
    expect(app).toContain('if (etapa) { if (hecho) avisar(avisoDelCandado(etapa), true); return false; }');
    // La página pone el candado con cada estado que llega (lo de fondo) y con lo urgente
    expect(app.match(/function pintarSegundoPlano\(\) \{[\s\S]*?\n\}/)?.[0] ?? '').toContain('ponerCandado();');
    expect(app.match(/function seguirUrgencia\(\) \{[\s\S]*?\n\}/)?.[0] ?? '').toContain('ponerCandado();');
    // La regla del 21 de octubre salió: pasos, entregas y propuestas ya no son libres mientras revisa
    const libre = app.match(/function libreMientrasRevisa\([^)]*\): boolean \{[\s\S]*?\n\}/)?.[0] ?? '';
    for (const tipo of ["'paso'", "'entregar'", "'empezar'", "'responder'"]) expect(libre).not.toContain(tipo);
    // Saca del enfoque al empezar y no lo vuelve a poner (nmwgu3kp9tit, nmwi6sgoetit); suena solo si terminó (nmwimq9retit)
    const seguir = app.match(/function seguirUrgencia\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(seguir).toContain('if (enfoqueQuerido || enfoque) quererEnfoque(false);');
    expect(seguir).not.toContain('quererEnfoque(true)');
    expect(seguir).toContain("if (!paro) sonar('revision');");
    // La línea se queda hasta que la abres o entregas una misión (nmwj6e78gtit)
    expect(app).toContain("if (cuerpo.tipo === 'entregar') quitarLineaUrgencia();");
    expect(app).toContain('cuerpo: lineaUrgenciaHtml() + vistaHoy(datosHoy())');
  });

  it('el encargo urgente pide replanear las misiones que toca antes de cerrar, y no esperar la voz (nmwj6hsultit)', () => {
    const revisor = leer('../../estudio/servidor/revisor.ts');
    const encargo = revisor.slice(revisor.indexOf('export const encargoUrgencia'), revisor.indexOf('/** Lo que se lanza aparte'));
    expect(encargo).toContain('REPLANEAR_TRAS_URGENCIA +');
    expect(revisor).toContain('re-plan the missions your answer affects');
    expect(revisor).toContain('Do not wait for any voice or reading to be prepared before closing.');
  });
});
