import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { esperarMarca, guionDeTerminal, ordenParaBash, ordenQueAbre } from './terminal';

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

  // La segunda pantalla del asistente: la orden es de PowerShell («& "ruta" auth login») y en bash es un error de sintaxis,
  // así que la ventana se cerraba sola al instante
  it('la orden de PowerShell con «&» y ruta de Windows se escribe para bash', () => {
    const orden = '& "C:\\Users\\Ana Pérez\\AppData\\Roaming\\Claude\\claude-code\\2.1.0\\claude.exe" auth login';
    expect(ordenParaBash(orden)).toBe('"C:/Users/Ana Pérez/AppData/Roaming/Claude/claude-code/2.1.0/claude.exe" auth login');
    const lineas = guionDeTerminal(orden, 'C:\\STL').split('\n');
    expect(lineas.some((l) => l.startsWith('&'))).toBe(false);
    expect(lineas).toContain('"C:/Users/Ana Pérez/AppData/Roaming/Claude/claude-code/2.1.0/claude.exe" auth login');
    expect(ordenParaBash('npm install -g @anthropic-ai/claude-code')).toBe('npm install -g @anthropic-ai/claude-code');
  });

  it('el guion escribe su marca en la primera línea, antes de todo lo demás', () => {
    const g = guionDeTerminal('ls', 'C:\\STL', 'C:\\Temp\\stl-orden-1.abierta').split('\n');
    expect(g[1]).toBe("echo ok > 'C:/Temp/stl-orden-1.abierta' 2>/dev/null");
    expect(g[2]).toContain('cd ');
    expect(guionDeTerminal('ls', 'C:\\STL')).not.toContain('echo ok');
  });

  it('la marca se espera: aparece a tiempo (se abrió) o vence (no se abrió)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'stl-prueba-'));
    try {
      const marca = join(dir, 'a.abierta');
      setTimeout(() => writeFileSync(marca, 'ok'), 60);
      expect(await esperarMarca(marca, 2000, 20)).toBe(true);
      expect(await esperarMarca(join(dir, 'nunca'), 120, 20)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
