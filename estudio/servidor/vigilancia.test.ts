import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { enProyectosViejos } from './vigilancia';

describe('el vigilante no mira la carpeta vieja proyectos/, y solo esa (nota del titular, 22 de octubre de 2026)', () => {
  // La raíz del Studio, clonada dentro de una carpeta que también se llama «proyectos»: el caso que un patrón suelto rompía
  const raiz = join('/home', 'ana', 'proyectos', 'stl');
  const ignora = enProyectosViejos(raiz);

  it('deja fuera proyectos/ de la raíz y todo lo que tiene dentro', () => {
    expect(ignora(join(raiz, 'proyectos'))).toBe(true);
    expect(ignora(join(raiz, 'proyectos', 'golf', 'director', 'plan.json'))).toBe(true);
  });

  it('sigue vigilando la raíz, el código y lo que solo se llama parecido', () => {
    expect(ignora(raiz)).toBe(false);
    expect(ignora(join(raiz, 'src', 'director', 'proyectos.ts'))).toBe(false);
    expect(ignora(join(raiz, 'estudio', 'proyectos', 'algo.ts'))).toBe(false);
    expect(ignora(join(raiz, 'proyectos-nuevos', 'x.ts'))).toBe(false);
    expect(ignora(join(raiz, '..'))).toBe(false);
  });
});
