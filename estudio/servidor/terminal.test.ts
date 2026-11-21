import { describe, expect, it } from 'vitest';
import { guionDeTerminal, ordenQueAbre } from './terminal';

describe('La orden de un paso, en una terminal', () => {
  it('entra a la carpeta, muestra la orden, la corre y espera para cerrar', () => {
    const g = guionDeTerminal('bash limpiar.sh', 'C:\\Proyectos\\El de Ana');
    expect(g).toContain("cd 'C:/Proyectos/El de Ana'");
    expect(g).toContain("'STL Studio corre: bash limpiar.sh'");
    expect(g.split('\n')).toContain('bash limpiar.sh');
    expect(g).toMatch(/read -r -p/);
  });

  it('una comilla en la carpeta no rompe el guion', () => {
    expect(guionDeTerminal('ls', "/home/o'neil")).toContain("cd '/home/o'\\''neil'");
  });

  // Notas nmwo2q7w7tit y nmwo2qy59tit: «start docs/difusion/voz/en» decía que Windows no encuentra la carpeta, que sí estaba
  it('«start <carpeta>» con barras normales abre la carpeta con su ruta de Windows, no con cmd', () => {
    const g = guionDeTerminal('start docs/difusion/voz/en', 'C:\\STL');
    expect(g.split('\n')).not.toContain('start docs/difusion/voz/en');
    expect(g).toContain(`explorer "$(cygpath -wa 'docs/difusion/voz/en')"`);
    expect(g).toContain("open 'docs/difusion/voz/en'");
    expect(g).toContain("'STL Studio corre: start docs/difusion/voz/en'");
    expect(ordenQueAbre('start "mis voces/en"')).toContain("cygpath -wa 'mis voces/en'");
  });

  it('lo que no es «start <una carpeta>» pasa igual', () => {
    for (const o of ['start /b algo.exe', 'start docs/a docs/b', 'start x && rm y', 'git status', 'restart docs/x'])
      expect(ordenQueAbre(o)).toBe(o);
  });
});
