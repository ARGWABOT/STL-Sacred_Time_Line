import { describe, expect, it } from 'vitest';
import { cambiosPorArchivo, candidatosClave, comoDocumento, erroresDeArchivosClave, esArchivoClave, lineasDeArchivosClave, MAX_ARCHIVOS_CLAVE, MAX_CARACTERES_CLAVE } from './archivosClave.ts';

describe('los candidatos a archivo clave', () => {
  const archivos = ['src/app.ts', 'README.md', 'package.json', 'Dockerfile', 'docs/README.md', 'src/util.ts', 'LICENSE', 'tsconfig.json', 'CLAUDE.md'];

  it('van en orden: el README de la raíz, los manifiestos y después lo más cambiado', () => {
    const cambios = new Map([['src/util.ts', 3], ['src/app.ts', 9], ['README.md', 20]]);
    expect(candidatosClave(archivos, cambios)).toEqual(['README.md', 'package.json', 'Dockerfile', 'CLAUDE.md', 'LICENSE', 'src/app.ts', 'src/util.ts']);
  });

  it('los manifiestos salen en su orden de siempre, no en el del repositorio', () => {
    expect(candidatosClave(['go.mod', 'Cargo.toml', 'composer.json', 'AGENTS.md', 'pyproject.toml'], new Map())).toEqual(['composer.json', 'pyproject.toml', 'go.mod', 'Cargo.toml', 'AGENTS.md']);
  });

  it('el README de una subcarpeta no es el de la raíz, y un manifiesto de una subcarpeta tampoco', () => {
    expect(candidatosClave(['docs/README.md', 'web/package.json'], new Map())).toEqual([]);
  });

  it('sin repetir: un archivo que ya es README o manifiesto no vuelve a salir entre los más cambiados', () => {
    const r = candidatosClave(['README.md', 'package.json'], new Map([['README.md', 50], ['package.json', 40]]));
    expect(r).toEqual(['README.md', 'package.json']);
  });

  it('sin node_modules, vendor, dist, build ni .stl, aunque cambien mucho', () => {
    const malos = ['node_modules/x/index.js', 'vendor/a.php', 'dist/app.js', 'build/o.js', '.stl/director/plan.json', 'web/dist/b.js'];
    const r = candidatosClave(['src/a.ts', ...malos], new Map([['src/a.ts', 1], ...malos.map((m): [string, number] => [m, 99])]));
    expect(r).toEqual(['src/a.ts']);
    // el nombre solo, sin ser carpeta, sí vale
    expect(candidatosClave(['src/distancia.ts'], new Map([['src/distancia.ts', 2]]))).toEqual(['src/distancia.ts']);
  });

  it('lo más cambiado: de más a menos, y a igual cuenta por su ruta; sin cambios no entra, ni un archivo que ya no está', () => {
    const cambios = new Map([['b.ts', 2], ['a.ts', 2], ['c.ts', 5], ['quieto.ts', 0], ['borrado.ts', 30]]);
    expect(candidatosClave(['a.ts', 'b.ts', 'c.ts', 'quieto.ts'], cambios)).toEqual(['c.ts', 'a.ts', 'b.ts']);
  });

  it('los archivos de versiones fijas no se proponen por cambiar mucho', () => {
    expect(candidatosClave(['package-lock.json', 'yarn.lock', 'src/a.ts'], new Map([['package-lock.json', 40], ['yarn.lock', 30], ['src/a.ts', 1]]))).toEqual(['src/a.ts']);
  });

  it('a lo más doce, o los que se pidan', () => {
    const muchos = Array.from({ length: 30 }, (_, i) => `src/f${String(i).padStart(2, '0')}.ts`);
    const cambios = new Map(muchos.map((m, i): [string, number] => [m, i + 1]));
    expect(candidatosClave(muchos, cambios)).toHaveLength(12);
    expect(candidatosClave(muchos, cambios, 3)).toEqual(['src/f29.ts', 'src/f28.ts', 'src/f27.ts']);
    expect(candidatosClave(['README.md'], new Map(), 0)).toEqual([]);
  });

  it('el README y la licencia se reconocen con otra extensión o mayúsculas', () => {
    expect(candidatosClave(['readme.rst', 'LICENSE.md', 'license.txt'], new Map())).toEqual(['readme.rst', 'LICENSE.md', 'license.txt']);
  });
});

describe('los cambios por archivo, de git log --name-only', () => {
  it('cuenta cuántos commits tocaron cada archivo', () => {
    const salida = 'src/a.ts\nREADME.md\n\nsrc/a.ts\r\n\nsrc/b.ts\nsrc/a.ts\n';
    expect([...cambiosPorArchivo(salida)]).toEqual([['src/a.ts', 3], ['README.md', 1], ['src/b.ts', 1]]);
    expect(cambiosPorArchivo('').size).toBe(0);
  });
});

describe('los archivos clave que escribe el director', () => {
  const ok = (ruta: string) => ({ ruta, para: 'Para qué sirve' });

  it('lo bien escrito pasa, y no tenerlos también', () => {
    expect(erroresDeArchivosClave(undefined)).toEqual([]);
    expect(erroresDeArchivosClave([])).toEqual([]);
    expect(erroresDeArchivosClave([ok('README.md'), ok('src/index.ts')])).toEqual([]);
    expect(erroresDeArchivosClave(Array.from({ length: MAX_ARCHIVOS_CLAVE }, (_, i) => ok(`a${i}.ts`)))).toEqual([]);
  });

  it('más de ocho no pasa', () => {
    const e = erroresDeArchivosClave(Array.from({ length: MAX_ARCHIVOS_CLAVE + 1 }, (_, i) => ok(`a${i}.ts`)));
    expect(e).toHaveLength(1);
    expect(e[0]).toContain('el máximo es 8');
  });

  it('una ruta vacía, repetida, con repo: o con «/» al comienzo no pasa, ni un para vacío', () => {
    expect(erroresDeArchivosClave([ok('  ')])[0]).toContain('no dice su ruta');
    expect(erroresDeArchivosClave([ok('a.ts'), ok('a.ts')])[0]).toContain('repetido');
    expect(erroresDeArchivosClave([ok('repo:README.md')])[0]).toContain('sin «repo:»');
    expect(erroresDeArchivosClave([ok('/etc/hosts')])[0]).toContain('sin «repo:»');
    expect(erroresDeArchivosClave([{ ruta: 'a.ts', para: '  ' }])[0]).toContain('no dice para qué sirve');
    expect(erroresDeArchivosClave([{ ruta: 'a.ts' } as never])[0]).toContain('no dice para qué sirve');
  });
});

describe('lo que imprime la bandeja', () => {
  it('sin archivos clave dice que aún no hay, con los candidatos y que los elige el director, hasta ocho', () => {
    const l = lineasDeArchivosClave(undefined, ['README.md', 'package.json']).join('\n');
    expect(l).toContain('none yet');
    expect(l).toContain('README.md, package.json');
    expect(l).toContain('You choose them, up to 8');
    expect(l).toContain('what it is for');
    expect(l).toContain('you keep them up to date if they change');
    expect(lineasDeArchivosClave([], [])[1]).toContain('none');
  });

  it('con todos en el repositorio, una sola línea: no hay nada que elegir (nmvxwv1zytit)', () => {
    const l = lineasDeArchivosClave([{ ruta: 'README.md', para: 'Qué es' }], ['src/a.ts'], new Set(['README.md']));
    expect(l).toHaveLength(1);
    expect(l[0]).toContain('1 chosen, all still in the repository');
    expect(l[0]).not.toContain('Qué es');
    // Sin saber qué archivos tiene el repositorio, no se puede decir
    expect(lineasDeArchivosClave([{ ruta: 'README.md', para: 'Qué es' }], ['src/a.ts'])[0]).toContain('README.md (Qué es)');
  });

  it('con archivos clave, cada uno con su para, y avisa del que ya no está en el repositorio', () => {
    const l = lineasDeArchivosClave([{ ruta: 'README.md', para: 'Qué es' }, { ruta: 'viejo.ts', para: 'Antes arrancaba' }], ['src/a.ts'], new Set(['README.md']))[0];
    expect(l).toContain('2: README.md (Qué es); viejo.ts (Antes arrancaba; NO LONGER in the repository)');
  });
});

describe('un archivo clave que no es .md, en el lector', () => {
  const cerca = '`'.repeat(3);

  it('solo se sirve el que está entre los archivos clave del plan', () => {
    const claves = [{ ruta: 'package.json', para: 'Dependencias' }];
    expect(esArchivoClave(claves, 'package.json')).toBe(true);
    expect(esArchivoClave(claves, 'src/index.ts')).toBe(false);
    expect(esArchivoClave(claves, '')).toBe(false);
    expect(esArchivoClave(undefined, 'package.json')).toBe(false);
  });

  it('va dentro de un bloque de código, con su nombre como título', () => {
    expect(comoDocumento('package.json', '{\r\n  "a": 1\r\n}\r\n')).toBe(`# package.json\n\n${cerca}\n{\n  "a": 1\n}\n${cerca}\n`);
  });

  it('un archivo con comillas de código usa un bloque más largo, para no cerrarse solo', () => {
    const md = comoDocumento('LICENSE', `antes\n${cerca}\ndentro\n${cerca}\n`);
    expect(md.split('\n')[2]).toBe('`'.repeat(4));
    expect(md.trimEnd().endsWith('`'.repeat(4))).toBe(true);
  });

  it('lo muy largo se corta y lo dice; lo que no es de texto no se muestra', () => {
    const largo = comoDocumento('x.txt', 'a'.repeat(MAX_CARACTERES_CLAVE + 5));
    expect(largo).toContain('Se muestra solo el comienzo');
    expect(largo.length).toBeLessThan(MAX_CARACTERES_CLAVE + 100);
    expect(comoDocumento('logo.png', 'PNG\u0000\u0001')).toContain('no es de texto');
  });
});
