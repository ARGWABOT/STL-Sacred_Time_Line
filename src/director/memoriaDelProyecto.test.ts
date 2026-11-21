import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { archivosDeMemoria, NIVELES_MEMORIA, PROPUESTA_VERIFICAR_MEMORIA, carpetaClaudeDe, commitsConArchivos, medirMemoria, nivelDeArchivo, rutasCitadas, scriptsCitados, tipoDeMemoria, type CommitConArchivos, type DatosDeLaMemoria } from './memoriaDelProyecto';

// Nota del titular del 9 de noviembre de 2026: el diagnóstico detecta qué tan atrasada está la memoria del proyecto que
// llega (su CLAUDE.md, su AGENTS.md, su roadmap…) frente al código, para arrancar desde el punto real
describe('qué es memoria del proyecto', () => {
  it('las instrucciones para agentes, en cualquier carpeta, y los documentos de estado de la raíz o de docs/', () => {
    expect(tipoDeMemoria('CLAUDE.md')).toBe('instrucciones');
    expect(tipoDeMemoria('packages/api/CLAUDE.md')).toBe('instrucciones');
    expect(tipoDeMemoria('AGENTS.md')).toBe('instrucciones');
    expect(tipoDeMemoria('.github/copilot-instructions.md')).toBe('instrucciones');
    expect(tipoDeMemoria('.cursor/rules/estilo.mdc')).toBe('instrucciones');
    expect(tipoDeMemoria('memory-bank/activeContext.md')).toBe('instrucciones');
    expect(tipoDeMemoria('README.md')).toBe('estado');
    expect(tipoDeMemoria('ROADMAP.md')).toBe('estado');
    expect(tipoDeMemoria('docs/arquitectura.md')).toBe('estado');
    expect(tipoDeMemoria('docs/plan-2026.md')).toBe('estado');
    // Ni lo de las dependencias, ni la memoria de STL, ni un plan escondido en el código, ni un nombre que solo empieza igual
    expect(tipoDeMemoria('node_modules/x/CLAUDE.md')).toBeNull();
    expect(tipoDeMemoria('.stl/director/plan.json')).toBeNull();
    expect(tipoDeMemoria('src/README.md')).toBeNull();
    expect(tipoDeMemoria('planets.md')).toBeNull();
  });

  it('en orden: las instrucciones primero y lo de la raíz antes', () => {
    expect(archivosDeMemoria(['README.md', 'src/a.ts', 'api/CLAUDE.md', 'CLAUDE.md', 'ROADMAP.md']).map((x) => x.ruta)).toEqual(['CLAUDE.md', 'api/CLAUDE.md', 'README.md', 'ROADMAP.md']);
  });
});

describe('lo que cita la memoria', () => {
  it('las rutas con «/» en código o en enlaces, sin direcciones, marcadores ni números de línea', () => {
    const texto = 'Corre `node tools/director/bandeja.ts --listo`. Ver [la guía](docs/guia.md#uso) y `src/app.ts:42`. No: `https://x.com/a`, `<repo>/.stl/`, `~/.claude/x`, `/etc/hosts`, `*.ts/x`, `proyectos/<id>/plan.json`.';
    expect(rutasCitadas(texto)).toEqual(['tools/director/bandeja.ts', 'src/app.ts', 'docs/guia.md']);
  });

  it('los scripts de npm, pnpm o yarn', () => {
    expect(scriptsCitados('`npm run encender`, `pnpm run build:web` y `npm test`')).toEqual(['encender', 'build:web']);
  });
});

describe('el nivel de cada archivo', () => {
  it('por los commits del código que vinieron después, y lo sube lo que cita y ya no existe', () => {
    expect(nivelDeArchivo(0, 0)).toBe('al_dia');
    expect(nivelDeArchivo(5, 0)).toBe('al_dia');
    expect(nivelDeArchivo(6, 0)).toBe('algo_atrasada');
    expect(nivelDeArchivo(31, 0)).toBe('atrasada');
    expect(nivelDeArchivo(151, 0)).toBe('muy_atrasada');
    expect(nivelDeArchivo(0, 1)).toBe('algo_atrasada');
    expect(nivelDeArchivo(0, 3)).toBe('algo_atrasada');
    expect(nivelDeArchivo(40, 3)).toBe('atrasada');
    expect(nivelDeArchivo(0, 0, true)).toBe('muy_atrasada');
  });
});

const commit = (n: number, archivos: string[]): CommitConArchivos => ({ sha: `c${n}`, fecha: new Date(Date.UTC(2026, 9, 1 + n)).toISOString(), archivos });
const datos = (commits: CommitConArchivos[], extra: Partial<DatosDeLaMemoria> = {}): DatosDeLaMemoria => {
  const archivos = [...new Set(commits.flatMap((c) => c.archivos))];
  return { commits, historiaCompleta: true, archivos, existe: (r) => archivos.some((a) => a === r || a.startsWith(`${r.replace(/\/$/, '')}/`)), textos: {}, scripts: null, sinCommit: new Set(), ...extra };
};

describe('el atraso de la memoria frente al código', () => {
  // Del más nuevo al más viejo: CLAUDE.md cambió en el commit 1; después, 40 commits de código
  const historia = [...Array.from({ length: 40 }, (_, i) => commit(50 - i, [`src/m${i}.ts`])), commit(1, ['CLAUDE.md', 'src/app.ts'])];

  it('cuenta los commits del código y los archivos que cambiaron después del último cambio de cada archivo', () => {
    const m = medirMemoria(datos(historia));
    expect(m.nivel).toBe('atrasada');
    expect(m.principal).toBe('CLAUDE.md');
    expect(m.archivos[0]).toMatchObject({ ruta: 'CLAUDE.md', commitsDespues: 40, archivosDespues: 40, ultimo: historia.at(-1)!.fecha, dias: 49 });
  });

  it('un cambio sin commit cuenta como al día; uno fuera de la ventana, como más de lo contado', () => {
    expect(medirMemoria(datos(historia, { sinCommit: new Set(['CLAUDE.md']) })).nivel).toBe('al_dia');
    const sinElPrimero = historia.slice(0, -1);
    const m = medirMemoria(datos(sinElPrimero, { archivos: [...sinElPrimero.flatMap((c) => c.archivos), 'CLAUDE.md'], historiaCompleta: false, fechasFuera: { 'CLAUDE.md': '2020-01-01T00:00:00Z' } }));
    expect(m.archivos[0]).toMatchObject({ masDe: true, ultimo: '2020-01-01T00:00:00Z', nivel: 'muy_atrasada' });
  });

  it('un CLAUDE.md de una subcarpeta se compara solo con lo que cambió en ella', () => {
    const m = medirMemoria(datos([commit(9, ['web/a.ts']), commit(8, ['api/b.ts']), commit(2, ['api/CLAUDE.md', 'CLAUDE.md'])]));
    expect(m.archivos.find((x) => x.ruta === 'api/CLAUDE.md')).toMatchObject({ ambito: 'api/', commitsDespues: 1 });
    expect(m.archivos.find((x) => x.ruta === 'CLAUDE.md')).toMatchObject({ ambito: '', commitsDespues: 2 });
  });

  it('los cambios que solo tocan memoria no cuentan como código', () => {
    const m = medirMemoria(datos([commit(5, ['README.md']), commit(4, ['AGENTS.md']), commit(3, ['CLAUDE.md'])]));
    expect(m.archivos.find((x) => x.ruta === 'CLAUDE.md')!.commitsDespues).toBe(0);
  });

  it('lo que cita y ya no existe, desde la raíz o desde su carpeta; lo que no parece del repositorio no cuenta', () => {
    const h = [commit(3, ['src/nuevo.ts', 'api/rutas.ts']), commit(2, ['CLAUDE.md', 'api/CLAUDE.md', 'package.json'])];
    const m = medirMemoria(datos(h, {
      textos: { 'CLAUDE.md': 'Ver `src/nuevo.ts`, `src/viejo.ts`, `application/json` y `npm run viejo`; `npm run dev`.', 'api/CLAUDE.md': 'Las rutas en `api/rutas.ts` y en `rutas.ts`… y `controladores/x.ts`' },
      scripts: ['dev'],
    }));
    expect(m.archivos.find((x) => x.ruta === 'CLAUDE.md')).toMatchObject({ rutasPerdidas: ['src/viejo.ts'], scriptsPerdidos: ['viejo'], nivel: 'algo_atrasada' });
    // «controladores/x.ts» no existe ni su carpeta: no se sabe si es del repositorio, no cuenta
    expect(m.archivos.find((x) => x.ruta === 'api/CLAUDE.md')!.rutasPerdidas).toEqual([]);
  });

  it('las instrucciones repetidas para distintos agentes dicen cuánto se separaron', () => {
    const m = medirMemoria(datos([commit(9, ['CLAUDE.md']), commit(8, ['src/a.ts']), commit(7, ['src/b.ts']), commit(6, ['AGENTS.md'])]));
    expect(m.copias).toEqual({ rutas: ['AGENTS.md', 'CLAUDE.md'], separados: 2, atras: 'AGENTS.md' });
  });

  it('sin instrucciones para agentes, no tiene sistema de memoria, aunque traiga README', () => {
    expect(medirMemoria(datos([commit(2, ['src/a.ts']), commit(1, ['README.md'])])).nivel).toBe('sin_memoria');
  });
});

describe('lo ve el titular y lo usa el director', () => {
  const leer = (ruta: string) => readFileSync(join(process.cwd(), ruta), 'utf8');
  it('«El diagnóstico del director» muestra el nivel con su texto y, mientras no se responde, el botón a la propuesta', () => {
    const app = leer('estudio/src/app.ts');
    expect(app).toContain("tx(`diagnostico.memoria.${mem.nivel}`)");
    expect(app).toContain("ancla: `propuesta-${verificar.id}`");
    for (const nivel of NIVELES_MEMORIA) for (const idioma of ['es', 'en']) expect(leer(`estudio/src/textos/${idioma}.ts`), `${idioma}: ${nivel}`).toContain(`'diagnostico.memoria.${nivel}'`);
  });

  it('la radiografía lo mide y el procedimiento del diagnóstico lo pide, en sus dos versiones', () => {
    expect(leer('tools/director/diagnosticar.ts')).toContain('## La memoria del proyecto: ¿al día con el código?');
    expect(leer('docs/metodo/director/diagnosis.md')).toContain(`## The project's memory`);
    expect(leer('docs/metodo/director/diagnosis.es.md')).toContain('## La memoria del proyecto');
    for (const ruta of ['docs/metodo/director/diagnosis.md', 'docs/metodo/director/diagnosis.es.md', 'docs/metodo/director/memory-check.md']) expect(leer(ruta), ruta).toContain(PROPUESTA_VERIFICAR_MEMORIA);
  });

  it('la bandeja lo pide al diagnosticar, nombra la verificación mientras está en la cola, y --listo no cierra un diagnóstico nuevo sin ella', () => {
    const bandeja = leer('tools/director/bandeja.ts');
    expect(bandeja).toContain("With the X-ray's «La memoria del proyecto»: plan.diagnostico.memoria");
    expect(bandeja).toContain('verificarMemoria: colaDelDirector(plan, estado).some((t) => t.id === PROPUESTA_VERIFICAR_MEMORIA)');
    // Solo el diagnóstico escrito en esta revisión: los de antes no la traen y no se piden de nuevo
    expect(bandeja).toContain("completo.diagnostico?.fecha && !guardado?.diagnostico?.fecha && !completo.diagnostico.memoria");
  });
});

describe('lo que lee de git y del disco', () => {
  it('parte la salida de git log en commits con sus archivos', () => {
    expect(commitsConArchivos('\x1eabc\x1f2026-11-09T10:00:00-05:00\n\nsrc/a.ts\r\nCLAUDE.md\n\x1edef\x1f2026-11-08T10:00:00-05:00\n\n')).toEqual([
      { sha: 'abc', fecha: '2026-11-09T10:00:00-05:00', archivos: ['src/a.ts', 'CLAUDE.md'] },
      { sha: 'def', fecha: '2026-11-08T10:00:00-05:00', archivos: [] },
    ]);
  });

  it('la carpeta de la memoria de Claude Code, como la nombra Claude Code', () => {
    expect(carpetaClaudeDe('C:\\xampp2024\\htdocs\\www\\STL')).toBe('C--xampp2024-htdocs-www-STL');
    expect(carpetaClaudeDe('C:/xampp2024/htdocs/www/STL')).toBe('C--xampp2024-htdocs-www-STL');
  });
});
