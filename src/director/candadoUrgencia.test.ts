import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { avanzaUnaMision, BOTONES_DE_AVANCE, fotoDeMisiones, misionesCambiadas, urgenciaBloquea } from './candadoUrgencia';

const leer = (ruta: string) => readFileSync(new URL(ruta, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

describe('el candado de una urgencia (pd_urgencia_bloquea)', () => {
  it('bloquea mientras lo urgente está pedido o lanzado, y se levanta al terminar o al detenerse (nmwf5tw9utit)', () => {
    expect(urgenciaBloquea({ pedida: '2026-11-16T10:00:00Z' })).toBe(true);
    expect(urgenciaBloquea({ pedida: '2026-11-16T10:00:00Z', lanzada: '2026-11-16T10:00:05Z' })).toBe(true);
    expect(urgenciaBloquea({ pedida: '2026-11-16T10:00:00Z', hecha: '2026-11-16T10:10:00Z' })).toBe(false);
    expect(urgenciaBloquea({ pedida: '2026-11-16T10:00:00Z', error: 'Detenida' })).toBe(false);
    expect(urgenciaBloquea(null)).toBe(false);
  });

  it('detiene solo lo que hace avanzar una misión: el ✉ y las decisiones de los documentos siguen abiertos (nmwflsg3itit, nmwfnxlyztit)', () => {
    for (const tipo of ['paso', 'entregar', 'empezar', 'deshacer_entrega']) expect(avanzaUnaMision({ tipo })).toBe(true);
    expect(avanzaUnaMision({ tipo: 'comentar', sobre: { tipo: 'mision', id: 't_a', seccion: 'Paso 1', eleccion: 'Sí' } })).toBe(true);
    expect(avanzaUnaMision({ tipo: 'comentar', sobre: { tipo: 'mision', id: 't_a', seccion: 'Paso 1', hazlo: true } })).toBe(true);
    expect(avanzaUnaMision({ tipo: 'comentar', sobre: { tipo: 'mision', id: 't_a', seccion: 'Paso 1', aclarar: true } })).toBe(true);
    // El ✉ de un paso, una decisión de un documento, una nota general y leer: abiertos
    expect(avanzaUnaMision({ tipo: 'comentar', sobre: { tipo: 'mision', id: 't_a', seccion: 'Paso 1' } })).toBe(false);
    expect(avanzaUnaMision({ tipo: 'comentar', sobre: { tipo: 'documento', id: 'docs/x.md', seccion: '1', decision: 'A', eleccion: 'Apruebo' } })).toBe(false);
    expect(avanzaUnaMision({ tipo: 'comentar', sobre: { tipo: 'general' } })).toBe(false);
    expect(avanzaUnaMision({ tipo: 'leido', doc: 'docs/x.md' })).toBe(false);
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
    expect(accion.indexOf('if (avanzaUnaMision(cuerpo) && urgenciaBloquea(')).toBeGreaterThan(0);
    expect(accion.indexOf('if (avanzaUnaMision(cuerpo) && urgenciaBloquea(')).toBeLessThan(accion.indexOf('decidir(id, cuerpo'));
    const css = leer('../../estudio/src/director.css');
    const regla = css.match(/^body\.urgencia-bloquea :is\(.*$/m)?.[0] ?? '';
    for (const b of BOTONES_DE_AVANCE) expect(regla).toContain(b);
    // El ✉ de los pasos no se apaga
    expect(regla).not.toContain('comentar');
    const app = leer('../../estudio/src/app.ts');
    expect(app).toContain("if (urgenciaBloquea(d?.urgencia) && avanzaUnaMision(cuerpo)) { avisar(tx('urgencia.espera'), true); return false; }");
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
