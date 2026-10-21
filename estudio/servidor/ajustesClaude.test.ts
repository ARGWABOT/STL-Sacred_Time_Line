import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AJUSTES_DEL_DIRECTOR, ajustesDelDirector, archivoAjustesClaude, conMaximo, entradaDelModelo, guardarEsfuerzoClaude, guardarModeloClaude, guardarUltracodeClaude, ignoraEsfuerzoGeneral, leerAjustesClaude, nombreCanonico } from './ajustesClaude';
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

  it('lee el modelo y el esfuerzo propio del modelo; la clave general, solo donde Claude Code todavía la usa', async () => {
    await writeFile(archivo, JSON.stringify({ model: 'opus', effortLevel: 'xhigh', modelSettings: { 'claude-opus-4-1': { effortLevel: 'low' }, 'claude-opus-5-5': { effortLevel: 'high' } } }));
    expect(await leerAjustesClaude(archivo)).toEqual({ modelo: 'opus', esfuerzo: 'high', ultracode: false });
    // Sonnet 5.5 sin esfuerzo propio: la clave general ya no cuenta, así que es el que trae el modelo (null)
    await writeFile(archivo, JSON.stringify({ model: 'claude-sonnet-5-5', effortLevel: 'xhigh', ultracode: true, modelSettings: { 'claude-opus-5-5': { effortLevel: 'high' } } }));
    expect(await leerAjustesClaude(archivo)).toEqual({ modelo: 'claude-sonnet-5-5', esfuerzo: null, ultracode: true });
    // En un modelo anterior (o Fable 5.1), la clave general sigue valiendo
    await writeFile(archivo, JSON.stringify({ model: 'claude-opus-5', effortLevel: 'xhigh' }));
    expect((await leerAjustesClaude(archivo)).esfuerzo).toBe('xhigh');
    // «max» no es un esfuerzo guardado (Claude Code no lo acepta en su archivo)
    await writeFile(archivo, JSON.stringify({ model: 'claude-opus-5', effortLevel: 'max' }));
    expect((await leerAjustesClaude(archivo)).esfuerzo).toBeNull();
  });

  it('da el nombre canónico de cada modelo, y sabe cuáles ya no usan la clave general', () => {
    expect(nombreCanonico({}, 'claude-sonnet-5-5[1m]')).toBe('claude-sonnet-5-5');
    expect(nombreCanonico({}, 'claude-opus-5-5-20261001')).toBe('claude-opus-5-5');
    expect(nombreCanonico({}, 'sonnet')).toBe('claude-sonnet-5-5');
    expect(nombreCanonico({ 'claude-sonnet-6-0': {} }, 'sonnet')).toBe('claude-sonnet-6-0');
    expect(nombreCanonico({}, null)).toBeNull();
    expect(ignoraEsfuerzoGeneral('claude-opus-5-5')).toBe(true);
    expect(ignoraEsfuerzoGeneral('claude-haiku-6-0')).toBe(true);
    expect(ignoraEsfuerzoGeneral('claude-opus-5')).toBe(false);
    expect(ignoraEsfuerzoGeneral('claude-fable-5-1')).toBe(false);
  });

  it('guarda el esfuerzo en la entrada del modelo, como /effort, aunque Claude Code todavía no la tenga (el caso de Sonnet)', async () => {
    await writeFile(archivo, JSON.stringify({ model: 'opus', effortLevel: 'high', modelSettings: { 'claude-opus-5-5': { effortLevel: 'high' } } }));
    await guardarModeloClaude('claude-sonnet-5-5', archivo);
    expect((await leerAjustesClaude(archivo)).esfuerzo).toBeNull();
    await guardarEsfuerzoClaude('xhigh', archivo);
    expect(await leer()).toEqual({ model: 'claude-sonnet-5-5', effortLevel: 'high', modelSettings: { 'claude-opus-5-5': { effortLevel: 'high' }, 'claude-sonnet-5-5': { effortLevel: 'xhigh' } } });
    expect((await leerAjustesClaude(archivo)).esfuerzo).toBe('xhigh');
    // Al volver a Opus, se ve el suyo
    await guardarModeloClaude('claude-opus-5-5[1m]', archivo);
    expect((await leerAjustesClaude(archivo)).esfuerzo).toBe('high');
  });

  it('nunca guarda «max», y quita el que haya quedado de antes', async () => {
    await expect(guardarEsfuerzoClaude('max', archivo)).rejects.toThrow(/no guarda/);
    await writeFile(archivo, JSON.stringify({ model: 'sonnet', effortLevel: 'max', modelSettings: { 'claude-opus-5-5': { effortLevel: 'max' } } }));
    await guardarEsfuerzoClaude('high', archivo);
    expect(await leer()).toEqual({ model: 'sonnet', modelSettings: { 'claude-sonnet-5-5': { effortLevel: 'high' } } });
  });

  it('con «Máximo», el Studio lanza con max y recuerda el guardado de tus sesiones', () => {
    const a = { modelo: 'sonnet', esfuerzo: 'high' as const, ultracode: false };
    expect(conMaximo(a, true)).toEqual({ ...a, esfuerzo: 'max', esfuerzoGuardado: 'high' });
    expect(conMaximo(a, false)).toEqual({ ...a, esfuerzoGuardado: 'high' });
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
    await guardarEsfuerzoClaude('low', archivo);
    const despues = await leer();
    expect(despues).toEqual({ ...antes, model: 'claude-opus-5-5[1m]', modelSettings: { 'claude-opus-5-5': { effortLevel: 'low' } } });
    expect(await leerAjustesClaude(archivo)).toEqual({ modelo: 'claude-opus-5-5[1m]', esfuerzo: 'low', ultracode: false });
    // «El de tu cuenta» quita el del modelo (como /effort auto), sin dejar la entrada vacía
    await guardarEsfuerzoClaude(null, archivo);
    await guardarModeloClaude(null, archivo);
    expect(await leer()).toEqual({ env: antes.env, hooks: antes.hooks, effortLevel: 'xhigh' });
    // Sin modelo elegido, la clave general, como antes
    await guardarEsfuerzoClaude(null, archivo);
    expect(await leer()).toEqual({ env: antes.env, hooks: antes.hooks });
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
    // «Máximo», que Claude Code no guarda, va en la orden
    expect(ordenAbrirClaude('/usr/local/bin/claude', '/stl', null, true)).toBe("env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT '/usr/local/bin/claude' --effort max");
  });
});
