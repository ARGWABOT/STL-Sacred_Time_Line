// «Browse…» opens the system's own folder dialog (p_explorador_nativo): each system's command, where it starts, the
// fallback without a dialog program and its first-time notice, the cancel that ends the process, and the four
// «Browse…» buttons on the same path.
import { execFile, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { abrirDialogo, carpetaDeInicio, dialogoDeCarpeta, marcaSinDialogo, ordenDelDialogo, PS_TIPO, rutaDeLaSalida, type OrdenDialogo } from './dialogoCarpeta';
import { trasElDialogo } from '../src/explorador';

const decodificar = (b64: string) => Buffer.from(b64, 'base64').toString('utf16le');

describe('the command of each system', () => {
  it('Windows: the modern File Explorer window (IFileOpenDialog in folder mode), through PowerShell, with nothing to quote', () => {
    const o = ordenDelDialogo('win32', 'C:\\Users\\ana\\código', 'Choose the project folder')!;
    expect(o.programa).toBe('powershell.exe');
    expect(o.args).toEqual(expect.arrayContaining(['-NoProfile', '-STA', '-EncodedCommand']));
    const guion = decodificar(o.args[o.args.indexOf('-EncodedCommand') + 1]);
    // The FileOpenDialog class and IFileDialog, not the old FolderBrowserDialog tree
    expect(guion).toContain('DC1C5A9C-E88A-4DDE-A5A1-60F82A20AEF7');
    expect(guion).toContain('42F85136-DB7E-439C-85F1-E4075D135FC8');
    expect(guion).toContain('0x20u | 0x40u');
    expect(guion).not.toContain('FolderBrowserDialog');
    // The folder and the title travel in the environment, never inside the script
    expect(o.env).toEqual({ STL_INICIO: 'C:\\Users\\ana\\código', STL_TITULO: 'Choose the project folder' });
    expect(guion).not.toContain('código');
    expect(o.salida).toBe('base64');
  });

  it('macOS: the Finder\'s «choose folder» through osascript, with the title and the folder as arguments', () => {
    const o = ordenDelDialogo('darwin', '/Users/ana/code', 'Choose')!;
    expect(o.programa).toBe('osascript');
    expect(o.args.filter((a, i) => o.args[i - 1] === '-e').join('\n')).toContain('choose folder with prompt titulo default location (POSIX file inicio)');
    expect(o.args.slice(-2)).toEqual(['Choose', '/Users/ana/code']);
    expect(o.cancelaCon1).toBeUndefined();
  });

  it('Linux: zenity, or kdialog when zenity is missing (kdialog first on KDE); none of them, no command', () => {
    const z = ordenDelDialogo('linux', '/home/ana/code', 'Choose', () => true, 'GNOME')!;
    expect(z).toMatchObject({ programa: 'zenity', args: ['--file-selection', '--directory', '--title=Choose', '--filename=/home/ana/code/'], cancelaCon1: true });
    const k = ordenDelDialogo('linux', '/home/ana/code', 'Choose', (p) => p === 'kdialog', 'GNOME')!;
    expect(k).toMatchObject({ programa: 'kdialog', args: ['--getexistingdirectory', '/home/ana/code', '--title', 'Choose'], cancelaCon1: true });
    expect(ordenDelDialogo('linux', '/home/ana', 'Choose', () => true, 'KDE')!.programa).toBe('kdialog');
    expect(ordenDelDialogo('linux', '/home/ana', 'Choose', () => false)).toBeNull();
  });

  it('reads the chosen path: base64 of UTF-8 on Windows, the line on the others, without the final slash; empty is cancelled', () => {
    expect(rutaDeLaSalida(Buffer.from('C:\\Users\\ana\\Año', 'utf8').toString('base64'), 'base64')).toBe('C:\\Users\\ana\\Año');
    expect(rutaDeLaSalida('/Users/ana/code/\n', 'texto')).toBe('/Users/ana/code');
    expect(rutaDeLaSalida('/\n', 'texto')).toBe('/');
    expect(rutaDeLaSalida('  \n', 'texto')).toBeNull();
  });

  it.runIf(process.platform === 'win32')('on Windows, the dialog\'s code compiles in Windows PowerShell', async () => {
    const guion = `${PS_TIPO}\n[StlStudio.Carpeta].FullName`;
    const salida = await new Promise<string>((ok, mal) =>
      execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-STA', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(guion, 'utf16le').toString('base64')], { windowsHide: true, timeout: 60000 }, (e, out, err) => (e ? mal(new Error(`${e.message}\n${err}`)) : ok(out))),
    );
    expect(salida.trim()).toBe('StlStudio.Carpeta');
  }, 70000);
});

describe('where the dialog starts (nmws7lplntit)', () => {
  const existen = new Set([resolve('/code/a'), resolve('/code'), resolve('/work')]);
  const esCarpeta = (r: string) => existen.has(resolve(r));
  const estudio = resolve('/stl');

  it('the folder written in the field, if it exists', () => {
    expect(carpetaDeInicio(` "${resolve('/code/a')}" `, { x: resolve('/work/x') }, estudio, esCarpeta, '/home/ana')).toBe(resolve('/code/a'));
  });

  it('if not, the folder that holds the last project handed over, not counting STL Studio itself', () => {
    expect(carpetaDeInicio(resolve('/missing'), { a: resolve('/work/x'), b: resolve('/code/a') }, estudio, esCarpeta, '/home/ana')).toBe(resolve('/code'));
    expect(carpetaDeInicio('', { b: resolve('/code/a'), 'stl-studio': estudio }, estudio, esCarpeta, '/home/ana')).toBe(resolve('/code'));
  });

  it('and with no project yet, the home folder', () => {
    expect(carpetaDeInicio('', {}, estudio, esCarpeta, '/home/ana')).toBe('/home/ana');
    expect(carpetaDeInicio('relative/path', { 'stl-studio': estudio }, estudio, esCarpeta, '/home/ana')).toBe('/home/ana');
  });
});

describe('the fallback and its first-time notice (nmws7mgxstit)', () => {
  let raiz: string;
  beforeEach(() => (raiz = mkdtempSync(join(tmpdir(), 'stl-dialogo-'))));
  afterEach(() => rmSync(raiz, { recursive: true, force: true }));

  it('a Linux without zenity or kdialog answers «no dialog»: the notice only the first time on that computer', async () => {
    const pedir = () => dialogoDeCarpeta({ raiz, campo: '', titulo: 'Choose', repositorios: {}, senal: new AbortController().signal, sistema: 'linux', hay: () => false, casa: raiz });
    expect(await pedir()).toEqual({ estado: 'sinDialogo', avisar: true });
    expect(existsSync(marcaSinDialogo(raiz))).toBe(true);
    expect(await pedir()).toEqual({ estado: 'sinDialogo', avisar: false });
  });

  it('the page opens the Studio\'s explorer when there is no dialog, when it failed or when asked; the notice goes only with the first «no dialog»', () => {
    expect(trasElDialogo({ estado: 'elegida', ruta: '/code/a' })).toEqual({ ruta: '/code/a' });
    expect(trasElDialogo({ estado: 'cancelada' })).toBeNull();
    expect(trasElDialogo({ estado: 'sinDialogo', avisar: true })).toEqual({ explorador: true, aviso: true });
    expect(trasElDialogo({ estado: 'sinDialogo', avisar: false })).toEqual({ explorador: true, aviso: false });
    expect(trasElDialogo({ estado: 'fallo', error: 'x' })).toEqual({ explorador: true, aviso: false });
    expect(trasElDialogo({ estado: 'explorador' })).toEqual({ explorador: true, aviso: false });
  });
});

describe('the process of the dialog', () => {
  const nodo = (codigo: string, extra: Partial<OrdenDialogo> = {}): OrdenDialogo => ({ programa: process.execPath, args: ['-e', codigo], salida: 'texto', ...extra });

  it('a path printed with exit 0 is chosen; nothing printed is cancelled; zenity\'s exit 1 is «Cancel»; another exit is a failure', async () => {
    const senal = new AbortController().signal;
    expect(await abrirDialogo(nodo('process.stdout.write("/code/a\\n")'), senal)).toEqual({ estado: 'elegida', ruta: '/code/a' });
    expect(await abrirDialogo(nodo(''), senal)).toEqual({ estado: 'cancelada' });
    expect(await abrirDialogo(nodo('process.exit(1)', { cancelaCon1: true }), senal)).toEqual({ estado: 'cancelada' });
    expect(await abrirDialogo(nodo('process.exit(1)'), senal)).toMatchObject({ estado: 'fallo' });
    expect(await abrirDialogo(nodo('process.stderr.write("no display"); process.exit(2)'), senal)).toEqual({ estado: 'fallo', error: 'no display' });
    expect(await abrirDialogo({ programa: join(tmpdir(), 'no-such-dialog-program'), args: [], salida: 'texto' }, senal)).toMatchObject({ estado: 'fallo' });
  });

  it('«Use the Studio\'s explorer» cancels the request, and the server ends the process and its window', async () => {
    const corte = new AbortController();
    let hijo: ReturnType<typeof spawn> | null = null;
    const lanzar = ((p: string, a: string[], o: object) => (hijo = spawn(p, a, o))) as unknown as typeof spawn;
    const espera = abrirDialogo(nodo('setTimeout(() => {}, 60000)'), corte.signal, lanzar);
    await new Promise((r) => setTimeout(r, 300));
    expect(hijo!.exitCode).toBeNull();
    corte.abort();
    expect(await espera).toEqual({ estado: 'cancelada' });
    await new Promise<void>((r) => (hijo!.exitCode !== null || hijo!.signalCode !== null ? r() : hijo!.once('exit', () => r())));
    expect(hijo!.killed).toBe(true);
  });

  it('the server route ends the dialog when the page cancels or leaves', () => {
    const api = readFileSync(join(__dirname, 'api.ts'), 'utf-8');
    const ruta = api.slice(api.indexOf("ruta === '/dialogo-carpeta'"), api.indexOf("ruta === '/dialogo-carpeta'") + 900);
    expect(ruta).toContain("res.on('close'");
    expect(ruta).toContain('corte.abort()');
    expect(ruta).toContain('senal: corte.signal');
  });
});

describe('every «Browse…» on the same path (nmws7la92tit)', () => {
  const leer = (archivo: string) => readFileSync(join(__dirname, '..', 'src', archivo), 'utf-8');

  it('the hand-over form, the new project\'s folder, the repository in «Project» and the dialogs\' folder fields call elegirCarpeta with their button', () => {
    // nuevo_proyecto.ts serves the hand-over form and «The folder where it will live»
    expect(leer('nuevo_proyecto.ts')).toContain('await elegirCarpeta(campo.value, b)');
    expect(leer('nuevo_proyecto.ts').match(/data-explorar>/g)?.length).toBeGreaterThanOrEqual(3);
    // The repository folder in «Project» (vistaProyecto.ts paints it, app.ts answers it)
    expect(leer('vistaProyecto.ts')).toContain('data-explorar-repo');
    expect(leer('app.ts')).toContain('await elegirCarpeta(campo.value, b)');
    // The folder fields of the dialogs, through the dialog's context, which app.ts fills with the same function
    expect(leer('dialogoNota.ts')).toContain('contexto().elegirCarpeta!(campo.value, b)');
    expect(leer('app.ts')).toMatch(/ponerContextoDelDialogo\(\{[^}]*elegirCarpeta \}\)/);
  });

  it('elegirCarpeta asks for the system\'s dialog first, and only explorador.ts lists folders itself', () => {
    const explorador = leer('explorador.ts');
    const elegir = explorador.slice(explorador.indexOf('export async function elegirCarpeta'));
    expect(elegir.indexOf('delSistema(')).toBeLessThan(elegir.indexOf('explorarEnElStudio('));
    expect(explorador).toContain("'/__estudio/director/dialogo-carpeta'");
    expect(explorador).toContain('signal: corte.signal');
    for (const archivo of ['app.ts', 'nuevo_proyecto.ts', 'dialogoNota.ts', 'vistaProyecto.ts']) expect(leer(archivo)).not.toContain('/__estudio/director/carpetas');
  });

  it('the waiting line and the notice exist in English and Spanish', () => {
    for (const idioma of ['en.ts', 'es.ts']) {
      const textos = leer(join('textos', idioma));
      for (const clave of ['explorador.tituloSistema', 'explorador.ventanaAbierta', 'explorador.usarExplorador', 'explorador.sinDialogo']) expect(textos).toContain(`'${clave}'`);
    }
  });
});
