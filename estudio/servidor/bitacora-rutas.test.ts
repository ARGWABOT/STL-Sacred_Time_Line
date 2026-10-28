// Cada acción queda en la bitácora de este computador (nota de voz del titular, 23 de octubre de 2026: «cada acción, cada
// clic, cada solicitud que el usuario haga o que el sistema dispara automáticamente tiene que quedar registrada: qué se
// hace, desde dónde y quién lo ejecuta»). Esta prueba lee el servidor: si alguien agrega una ruta POST que no anota, falla
// aquí. Las GET solo leen y no se anotan.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const leer = (ruta: string) => readFileSync(join(process.cwd(), ruta), 'utf8');

/** Cada ruta del servidor del director con su método y su código, hasta la ruta siguiente. */
function rutas(servidor: string) {
  const inicio = servidor.indexOf("server.middlewares.use('/__estudio/director'");
  const fin = servidor.indexOf("'No existe esa ruta del Director.'", inicio);
  const cuerpo = servidor.slice(inicio, fin);
  const marcas = [...cuerpo.matchAll(/if \(ruta === '([^']+)' && req\.method === '([A-Z]+)'\)/g)];
  return marcas.map((m, i) => ({ ruta: m[1], metodo: m[2], codigo: cuerpo.slice(m.index!, marcas[i + 1]?.index ?? cuerpo.length) }));
}

describe('la bitácora registra cada acción del servidor', () => {
  const servidor = leer('estudio/servidor/director.ts');
  const todas = rutas(servidor);

  it('encuentra las rutas (si cambia su forma, esta prueba debe cambiar con ella)', () => {
    expect(todas.length).toBeGreaterThan(15);
    expect(todas.map((r) => r.ruta)).toEqual(expect.arrayContaining(['/accion', '/revision', '/aclarar', '/modelo', '/ultracode']));
  });

  it('toda ruta POST anota lo que hizo (la revisión, con pedirYLanzar, que anota pedirla y cancelarla)', () => {
    const post = todas.filter((r) => r.metodo === 'POST');
    for (const r of post) expect(/\banotar\(|\bpedirYLanzar\(/.test(r.codigo), `«${r.ruta}» no anota en la bitácora`).toBe(true);
  });

  it('cada acción de la página se anota después de hacerse, con quién, qué y desde dónde', () => {
    const accion = todas.find((r) => r.ruta === '/accion')!.codigo;
    expect(accion.indexOf('anotar(raiz, eventoDeAccion(cuerpo, yo.nombre, que, id))')).toBeGreaterThan(accion.indexOf('decidir('));
    // Anotar nunca detiene la acción: no va en un try que la corte (anotar atrapa sus errores)
    expect(servidor).not.toMatch(/try \{\s*await anotar\(/);
  });
});
