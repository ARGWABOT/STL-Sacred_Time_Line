// Los procedimientos del director, aparte de CLAUDE.md (propuesta aceptada pr_reglas_por_encargo): que cada uno exista en
// sus dos versiones y con las mismas partes, que CLAUDE.md los nombre y no pase de su tamaño, que la bandeja y el lanzador
// manden a ellos (no a las partes de CLAUDE.md que salieron) y que cada revisión reciba los que le tocan.
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { enEspanol, partesDe, PROCEDIMIENTOS, procedimientosDeLaRevision } from './procedimientos';

const raiz = join(import.meta.dirname, '..', '..');
const leer = (ruta: string) => readFileSync(join(raiz, ruta), 'utf8');

/**
 * Lo más que puede pesar CLAUDE.md, que se carga entero en cada revisión, cada urgencia y cada aclaración: baja a medida
 * que sus procedimientos salen a su archivo (eran 97 KB antes de la primera pieza, 81 después y 64 después de la segunda;
 * la meta, unas 200 líneas cortas).
 */
const TOPE_CLAUDE_MD_KB = 54;

describe('los procedimientos del director, aparte de CLAUDE.md', () => {
  it('cada uno existe en inglés y en español, con las mismas partes, y cada versión nombra a la otra', () => {
    for (const { archivo } of Object.values(PROCEDIMIENTOS)) {
      expect(existsSync(join(raiz, archivo)), archivo).toBe(true);
      expect(existsSync(join(raiz, enEspanol(archivo))), enEspanol(archivo)).toBe(true);
      const en = leer(archivo);
      const es = leer(enEspanol(archivo));
      expect(partesDe(es), `${enEspanol(archivo)} no tiene las mismas partes que ${archivo}`).toEqual(partesDe(en));
      expect(partesDe(en).titulos).toBeGreaterThan(0);
      expect(en).toContain(basename(enEspanol(archivo)));
      expect(es).toContain(basename(archivo));
    }
  });

  it('CLAUDE.md los nombra en su índice, ya no trae las partes que salieron y no pasa de su tamaño', () => {
    const claude = leer('CLAUDE.md');
    for (const { archivo } of Object.values(PROCEDIMIENTOS)) expect(claude).toContain(`\`${basename(archivo)}\``);
    for (const salio of ['### El diagnóstico', '### El planteamiento', '### La ruta', '### Las etapas del arranque', '### Proyecto existente o nuevo', '### La cola de diagnósticos', '### El Studio como proyecto', '### Cuando el titular da la meta por lograda', '## Los documentos del director', '## Los formatos de `plan.json`', '### El ciclo de revisión', '### «Dónde quedamos»', '### Validar y cerrar'])
      expect(claude).not.toContain(salio);
    expect(Buffer.byteLength(claude) / 1024).toBeLessThanOrEqual(TOPE_CLAUDE_MD_KB);
  });

  it('la bandeja y el lanzador mandan al procedimiento, no a una parte de CLAUDE.md que ya no está', () => {
    for (const fuente of ['tools/director/bandeja.ts', 'estudio/servidor/revisor.ts']) {
      const texto = leer(fuente);
      for (const viejo of ['«El diagnóstico» de', '«La ruta» de CLAUDE', '«El planteamiento (proyecto nuevo)» de', '«El Studio como proyecto» de CLAUDE', 'CLAUDE.md › La cola de diagnósticos', 'AHORA, como dice CLAUDE.md', 'Studio, como dice CLAUDE.md'])
        expect(texto, `${fuente}: ${viejo}`).not.toContain(viejo);
    }
  });

  it('cada revisión recibe los que le tocan: los del arranque en su etapa, el del Studio en el mismo Studio, y siempre los formatos y los documentos', () => {
    const siempre = ['ciclo', 'formatos', 'documentos'];
    expect(procedimientosDeLaRevision({ etapa: 'en_marcha' })).toEqual(siempre);
    expect(procedimientosDeLaRevision({ etapa: 'en_marcha', esElStudio: true })).toEqual(['studio', ...siempre]);
    expect(procedimientosDeLaRevision({ etapa: 'conectar' })).toEqual(['arranque', ...siempre]);
    expect(procedimientosDeLaRevision({ etapa: 'diagnostico', tipo: 'existente' })).toEqual(['arranque', 'diagnostico', ...siempre]);
    expect(procedimientosDeLaRevision({ etapa: 'diagnostico', tipo: 'nuevo' })).toEqual(['arranque', 'planteamiento', ...siempre]);
    expect(procedimientosDeLaRevision({ etapa: 'ruta' })).toEqual(['arranque', 'ruta', ...siempre]);
    expect(procedimientosDeLaRevision({ etapa: 'en_marcha', replanteada: true })).toEqual(['ruta', ...siempre]);
    expect(procedimientosDeLaRevision({ etapa: 'en_marcha', mantenimiento: true })).toEqual(['mantenimiento', ...siempre]);
    // La cola necesita el suyo y el del diagnóstico, una sola vez aunque el activo también esté en el diagnóstico
    expect(procedimientosDeLaRevision({ etapa: 'diagnostico', tipo: 'existente', hayCola: true })).toEqual(['arranque', 'diagnostico', 'cola', ...siempre]);
  });

  it('una urgencia o una aclaración reciben solo los formatos del plan, y el del Studio en el mismo Studio: nada de la etapa ni de la cola', () => {
    expect(procedimientosDeLaRevision({ encargo: 'urgencia', etapa: 'diagnostico', hayCola: true })).toEqual(['formatos']);
    expect(procedimientosDeLaRevision({ encargo: 'aclaracion', etapa: 'en_marcha', esElStudio: true })).toEqual(['studio', 'formatos']);
  });

  it('las partes de un documento: sus títulos y sus puntos de lista, de cualquier nivel', () => {
    expect(partesDe('# T\n\n## Uno\n\n- a\n- b\n   - c\n\n## Dos\n\n1. x\n2. y\n')).toEqual({ titulos: 2, puntos: 5 });
  });
});
