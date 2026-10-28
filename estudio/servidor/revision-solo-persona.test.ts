// Nadie pide una revisión solo (regla dura del titular, 23 de octubre de 2026: «nunca se disparan revisiones
// automáticamente; solamente el usuario puede dispararlas»). La revisión gasta el modelo, y STL existe para que la persona
// decida cuándo usarlo. Esta prueba lee el código: si alguien agrega otro camino que pida una revisión (al entregar una
// misión o un proyecto, cuando falla una urgencia o una aclaración, en el reloj de 15 segundos…), falla aquí.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ORIGENES_REVISION } from '../../src/director/proyectos';

const leer = (ruta: string) => readFileSync(join(process.cwd(), ruta), 'utf8');
const veces = (texto: string, patron: RegExp) => (texto.match(patron) ?? []).length;

describe('nadie pide una revisión solo', () => {
  it('el servidor la pide en un solo lugar: la ruta «/revision», con el botón que la nombra', () => {
    const servidor = leer('estudio/servidor/director.ts');
    // pedirRevision, solo dentro de pedirYLanzar; pedirYLanzar, definido una vez y llamado solo en «/revision»
    expect(veces(servidor, /\bpedirRevision\(/g)).toBe(1);
    expect(veces(servidor, /\bpedirYLanzar\(/g)).toBe(1);
    expect(veces(servidor, /\bpedirYLanzar = async/g)).toBe(1);
    const ruta = servidor.slice(servidor.indexOf("ruta === '/revision'"), servidor.indexOf("ruta === '/aclarar'"));
    expect(ruta).toContain('pedirYLanzar(');
    expect(ruta).toContain('esOrigenRevision(cuerpo.origen)');
  });

  it('el lanzador nunca la pide: solo lanza la que una persona pidió', () => {
    const revisor = leer('estudio/servidor/revisor.ts');
    expect(veces(revisor, /\bpedirRevision\(/g)).toBe(0);
    expect(revisor).not.toMatch(/import[^;]*\bpedirRevision\b[^;]*from/);
  });

  it('las revisiones seguidas las pide la persona con su botón: el lanzador solo encadena las que ella pidió, en un lugar', () => {
    // «Pedir revisiones seguidas» (pedido pd_revisiones_seguidas, elegido por el titular el 27 de octubre de 2026): la
    // cadena empieza solo en «/revision», con ese botón, y el lanzador pide la siguiente solo en seguirLaCadena
    const servidor = leer('estudio/servidor/director.ts');
    expect(veces(servidor, /\bempezarSeguidas\(/g)).toBe(1);
    expect(servidor).toMatch(/if \(quien && origen === 'seguidas'\) await empezarSeguidas\(/);
    const revisor = leer('estudio/servidor/revisor.ts');
    expect(veces(revisor, /\bencadenarRevision\(/g)).toBe(1);
    const cadena = revisor.slice(revisor.indexOf('private async seguirLaCadena'), revisor.indexOf('private async cerrarSiCerro'));
    expect(cadena).toContain('encadenarRevision(');
    expect(cadena).toContain('siguienteDeLaCadena(');
    // encadenarRevision, solo con la cadena en marcha de ese proyecto y la anterior cerrada
    const proyectos = leer('src/director/proyectos.ts');
    const encadenar = proyectos.slice(proyectos.indexOf('export async function encadenarRevision'), proyectos.indexOf('/**', proyectos.indexOf('export async function encadenarRevision')));
    expect(encadenar).toContain('!seguidasActivas(s, proyecto)');
    expect(encadenar).toContain('!r.hecha');
  });

  it('la página la pide solo desde un botón, y cada uno dice cuál es', () => {
    const pagina = leer('estudio/src/director.ts');
    const llamadas = pagina.match(/pedirLaRevision\(true[^)]*\)/g) ?? [];
    expect(llamadas.length).toBeGreaterThan(0);
    for (const l of llamadas) {
      const origen = l.match(/pedirLaRevision\(true,\s*(?:'([a-z_]+)'|rev\.dataset\.origen)/);
      expect(origen, `«${l}» no dice con qué botón se pide`).not.toBeNull();
      if (origen?.[1]) expect(Object.keys(ORIGENES_REVISION)).toContain(origen[1]);
    }
    // Entregar una misión no la pide: completarSiToca no llama a pedirLaRevision
    const entrega = pagina.slice(pagina.indexOf('async function completarSiToca'), pagina.indexOf('function recomendacionDeRevision'));
    expect(entrega).not.toContain('pedirLaRevision(');
  });
});
