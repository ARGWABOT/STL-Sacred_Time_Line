import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AJUSTES_DEL_DIRECTOR, ajustesDelDirector, archivoAjustesClaude, entradaDelModelo, guardarEsfuerzoClaude, guardarModeloClaude, guardarUltracodeClaude, leerAjustesClaude } from './ajustesClaude';
import { ordenAbrirClaude } from './revisor';

let carpeta: string;
let archivo: string;
beforeEach(async () => {
  carpeta = await mkdtemp(join(tmpdir(), 'stl-ajustes-'));
  archivo = join(carpeta, 'settings.json');
});
afterEach(() => rm(carpeta, { recursive: true, force: true }));

const leer = async () => JSON.parse(await readFile(archivo, 'utf-8'));

describe('la configuración de Claude Code (lo mismo que /model y /effort)', () => {
  it('está en ~/.claude, o en CLAUDE_CONFIG_DIR', () => {
    expect(archivoAjustesClaude({ CLAUDE_CONFIG_DIR: carpeta })).toBe(archivo);
    expect(archivoAjustesClaude({})).toMatch(/\.claude[\\/]settings\.json$/);
  });

  it('sin archivo, o con uno que no es JSON, es el de la cuenta', async () => {
    expect(await leerAjustesClaude(archivo)).toEqual({ modelo: null, esfuerzo: null, ultracode: false });
    await writeFile(archivo, '{ esto no es json');
    expect(await leerAjustesClaude(archivo)).toEqual({ modelo: null, esfuerzo: null, ultracode: false });
  });

  it('lee el modelo y el esfuerzo, y el esfuerzo propio del modelo si Claude Code lo guarda aparte', async () => {
    await writeFile(archivo, JSON.stringify({ model: 'opus', effortLevel: 'xhigh', modelSettings: { 'claude-opus-4-1': { effortLevel: 'low' }, 'claude-opus-5-5': { effortLevel: 'high' } } }));
    expect(await leerAjustesClaude(archivo)).toEqual({ modelo: 'opus', esfuerzo: 'high', ultracode: false });
    await writeFile(archivo, JSON.stringify({ model: 'claude-sonnet-5-5', effortLevel: 'medium', ultracode: true, modelSettings: { 'claude-opus-5-5': { effortLevel: 'high' } } }));
    expect(await leerAjustesClaude(archivo)).toEqual({ modelo: 'claude-sonnet-5-5', esfuerzo: 'medium', ultracode: true });
  });

  it('encuentra la entrada de cada modelo: por su id (también con contexto de 1 M) o, si es un alias, la versión más nueva', () => {
    const ms = { 'claude-opus-4-10': {}, 'claude-opus-5-5': {}, 'claude-sonnet-5-5': {} };
    expect(entradaDelModelo(ms, 'claude-opus-5-5[1m]')).toBe('claude-opus-5-5');
    expect(entradaDelModelo(ms, 'opus')).toBe('claude-opus-5-5');
    expect(entradaDelModelo(ms, 'haiku')).toBeNull();
    expect(entradaDelModelo(ms, null)).toBeNull();
  });

  it('cambia solo el modelo y el esfuerzo, sin tocar nada más', async () => {
    const antes = { env: { DISABLE_TELEMETRY: '1' }, model: 'opus', hooks: { Stop: [{ hooks: [{ type: 'command', command: 'x' }] }] }, effortLevel: 'xhigh', modelSettings: { 'claude-opus-5-5': { effortLevel: 'high' } } };
    await writeFile(archivo, JSON.stringify(antes));
    await guardarModeloClaude('claude-opus-5-5[1m]', archivo);
    await guardarEsfuerzoClaude('max', archivo);
    const despues = await leer();
    expect(despues).toEqual({ ...antes, model: 'claude-opus-5-5[1m]', effortLevel: 'max', modelSettings: { 'claude-opus-5-5': { effortLevel: 'max' } } });
    expect(await leerAjustesClaude(archivo)).toEqual({ modelo: 'claude-opus-5-5[1m]', esfuerzo: 'max', ultracode: false });
    // «El de tu cuenta» quita la clave
    await guardarEsfuerzoClaude(null, archivo);
    await guardarModeloClaude(null, archivo);
    expect(await leer()).toEqual({ env: antes.env, hooks: antes.hooks, modelSettings: { 'claude-opus-5-5': {} } });
  });

  it('enciende ultracode con su clave y, al apagarlo, la quita, sin tocar nada más', async () => {
    await writeFile(archivo, JSON.stringify({ model: 'opus' }));
    await guardarUltracodeClaude(true, archivo);
    expect(await leer()).toEqual({ model: 'opus', ultracode: true });
    expect((await leerAjustesClaude(archivo)).ultracode).toBe(true);
    await guardarUltracodeClaude(false, archivo);
    expect(await leer()).toEqual({ model: 'opus' });
    // el director que lanza el Studio, sin él salvo que el titular le dé el permiso
    expect(AJUSTES_DEL_DIRECTOR).toEqual({ ultracode: false });
  });

  it('el director lanzado sigue a ultracode solo con él encendido y con el permiso del titular', () => {
    expect(ajustesDelDirector(true, true)).toEqual({ ajustes: {}, flujos: true });
    expect(ajustesDelDirector(true, false)).toEqual({ ajustes: { ultracode: false }, flujos: false });
    expect(ajustesDelDirector(false, true)).toEqual({ ajustes: { ultracode: false }, flujos: false });
    expect(ajustesDelDirector(false, false)).toEqual({ ajustes: { ultracode: false }, flujos: false });
  });

  it('crea el archivo si no está, y no toca uno que no es JSON ni acepta lo que Claude Code no aceptaría', async () => {
    await guardarModeloClaude('sonnet', archivo);
    expect(await leer()).toEqual({ model: 'sonnet' });
    await writeFile(archivo, '{ roto');
    await expect(guardarModeloClaude('opus', archivo)).rejects.toThrow(/no es JSON válido/);
    expect(await readFile(archivo, 'utf-8')).toBe('{ roto');
    await expect(guardarModeloClaude('Opus; rm -rf', archivo)).rejects.toThrow();
    await expect(guardarEsfuerzoClaude('altísimo', archivo)).rejects.toThrow();
  });
});

describe('«Abrir Claude Code en una terminal»', () => {
  it('lo abre como lo lanza el Studio, con la carpeta del proyecto a la vista y sin las variables de otra sesión', () => {
    expect(ordenAbrirClaude('C:\\Users\\x\\AppData\\Roaming\\Claude\\claude-code\\2.1\\claude.exe', 'C:\\STL', 'C:\\proyectos\\it\'s')).toBe(
      "env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT 'C:/Users/x/AppData/Roaming/Claude/claude-code/2.1/claude.exe' --add-dir 'C:/proyectos/it'\\''s'",
    );
    // el proyecto que es el mismo Studio no se agrega otra vez; el .cmd de npm va por su nombre
    expect(ordenAbrirClaude('C:\\npm\\claude.cmd', 'C:\\STL', 'C:\\STL')).toBe('env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT claude');
    expect(ordenAbrirClaude('/usr/local/bin/claude', '/stl', null)).toBe("env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT '/usr/local/bin/claude'");
  });
});
