import { describe, expect, it } from 'vitest';
import { guionDeTerminal } from './terminal';

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
});
