// «Browse…» opens the system's own folder dialog (accepted proposal p_explorador_nativo). A web page is never given a
// folder's full path, so the page asks this local server, on the same computer, to open the operating system's dialog
// and bring back the path. The owner's choices: every «Browse…» the same way (nmws7la92tit); it starts in the folder
// written in the field, else beside the last project, else home (nmws7lplntit); on Windows, the modern File Explorer
// window, IFileOpenDialog in folder mode (nmws7lxw3tit); while it is open the form offers the Studio's explorer, which
// cancels the request and ends the process (nmws7m58ntit); and a Linux without zenity or kdialog falls back to the
// Studio's explorer, saying why only the first time on that computer (nmws7mgxstit). Nothing is installed.
import { spawn } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { delimiter, dirname, isAbsolute, join, resolve } from 'node:path';

/** The command that opens the dialog: its program, its arguments, its environment and how its output is read. */
export interface OrdenDialogo { programa: string; args: string[]; env?: Record<string, string>; salida: 'base64' | 'texto'; /** Exit 1 is «Cancel» (zenity, kdialog). */ cancelaCon1?: boolean }

export type ResultadoDialogo =
  | { estado: 'elegida'; ruta: string }
  | { estado: 'cancelada' }
  | { estado: 'sinDialogo'; avisar: boolean }
  | { estado: 'fallo'; error: string };

const esCarpetaReal = (r: string) => {
  try {
    return statSync(r).isDirectory();
  } catch {
    return false;
  }
};

const misma = (a: string, b: string) => resolve(a).replace(/[\\/]+$/, '').toLowerCase() === resolve(b).replace(/[\\/]+$/, '').toLowerCase();

/**
 * Where the dialog starts (nmws7lplntit): the folder written in the field, if it exists; if not, the folder that holds
 * the last project handed over (STL Studio itself, which joins the list on install, does not count); and with none, the
 * home folder.
 */
export function carpetaDeInicio(campo: string, repositorios: Record<string, string>, estudio: string, esCarpeta: (r: string) => boolean = esCarpetaReal, casa: string = homedir()): string {
  const escrita = campo.trim().replace(/^["']|["']$/g, '');
  if (escrita && isAbsolute(escrita) && esCarpeta(escrita)) return resolve(escrita);
  const ultimo = Object.values(repositorios).filter((r) => typeof r === 'string' && r && !misma(r, estudio)).pop();
  if (ultimo && esCarpeta(dirname(resolve(ultimo)))) return dirname(resolve(ultimo));
  return casa;
}

/** Whether a program is on this computer's PATH (zenity, kdialog). */
function enElPath(programa: string, path: string = process.env.PATH ?? ''): boolean {
  return path.split(delimiter).some((d) => d && existsSync(join(d, programa)));
}

// The modern File Explorer window in folder mode (FOS_PICKFOLDERS | FOS_FORCEFILESYSTEM), through COM. C# 5, the one
// Windows PowerShell 5.1 compiles. Show returns a failure HRESULT when the person presses «Cancel».
const CSHARP = `using System;
using System.Runtime.InteropServices;
namespace StlStudio {
  [ComImport, Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  public interface IShellItem {
    void BindToHandler(IntPtr pbc, ref Guid bhid, ref Guid riid, out IntPtr ppv);
    void GetParent(out IShellItem ppsi);
    void GetDisplayName(uint sigdnName, [MarshalAs(UnmanagedType.LPWStr)] out string ppszName);
    void GetAttributes(uint sfgaoMask, out uint psfgaoAttribs);
    void Compare(IShellItem psi, uint hint, out int piOrder);
  }
  [ComImport, Guid("42F85136-DB7E-439C-85F1-E4075D135FC8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  public interface IFileDialog {
    [PreserveSig] int Show(IntPtr parent);
    void SetFileTypes(uint cFileTypes, IntPtr rgFilterSpec);
    void SetFileTypeIndex(uint iFileType);
    void GetFileTypeIndex(out uint piFileType);
    void Advise(IntPtr pfde, out uint pdwCookie);
    void Unadvise(uint dwCookie);
    void SetOptions(uint fos);
    void GetOptions(out uint pfos);
    void SetDefaultFolder(IShellItem psi);
    void SetFolder(IShellItem psi);
    void GetFolder(out IShellItem ppsi);
    void GetCurrentSelection(out IShellItem ppsi);
    void SetFileName([MarshalAs(UnmanagedType.LPWStr)] string pszName);
    void GetFileName([MarshalAs(UnmanagedType.LPWStr)] out string pszName);
    void SetTitle([MarshalAs(UnmanagedType.LPWStr)] string pszTitle);
    void SetOkButtonLabel([MarshalAs(UnmanagedType.LPWStr)] string pszText);
    void SetFileNameLabel([MarshalAs(UnmanagedType.LPWStr)] string pszLabel);
    void GetResult(out IShellItem ppsi);
  }
  [ComImport, Guid("DC1C5A9C-E88A-4DDE-A5A1-60F82A20AEF7")]
  public class FileOpenDialog {}
  public static class Carpeta {
    [DllImport("shell32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
    static extern void SHCreateItemFromParsingName(string pszPath, IntPtr pbc, [MarshalAs(UnmanagedType.LPStruct)] Guid riid, out IShellItem ppv);
    public static string Elegir(string inicio, string titulo, IntPtr dueno) {
      IFileDialog d = (IFileDialog)new FileOpenDialog();
      uint o;
      d.GetOptions(out o);
      d.SetOptions(o | 0x20u | 0x40u);
      if (!String.IsNullOrEmpty(titulo)) d.SetTitle(titulo);
      if (!String.IsNullOrEmpty(inicio)) {
        try { IShellItem s; SHCreateItemFromParsingName(inicio, IntPtr.Zero, typeof(IShellItem).GUID, out s); d.SetFolder(s); } catch { }
      }
      if (d.Show(dueno) != 0) return null;
      IShellItem r;
      d.GetResult(out r);
      string ruta;
      r.GetDisplayName(0x80058000u, out ruta);
      return ruta;
    }
  }
}`;

/** The part that only compiles the dialog's code (its test runs it on Windows). */
export const PS_TIPO = `$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
${CSHARP}
'@`;

// A topmost owner window, invisible, so the dialog opens above the browser; if it cannot be made, the dialog opens
// without an owner. The path goes out in base64 of its UTF-8, so no console code page can garble it.
const PS_DIALOGO = `${PS_TIPO}
$dueno = [IntPtr]::Zero
$f = $null
try {
  Add-Type -AssemblyName System.Windows.Forms
  $f = New-Object System.Windows.Forms.Form
  $f.TopMost = $true; $f.ShowInTaskbar = $false; $f.Opacity = 0; $f.FormBorderStyle = 'None'; $f.Width = 1; $f.Height = 1; $f.StartPosition = 'CenterScreen'
  $f.Show(); $f.Activate(); $dueno = $f.Handle
} catch { $dueno = [IntPtr]::Zero }
$r = [StlStudio.Carpeta]::Elegir($env:STL_INICIO, $env:STL_TITULO, $dueno)
if ($f) { $f.Close() }
if ($r) { [Console]::Out.Write([Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($r))) }`;

/** A PowerShell script as -EncodedCommand takes it: UTF-16LE in base64, so nothing has to be quoted. */
export const codificado = (guion: string) => Buffer.from(guion, 'utf16le').toString('base64');

// macOS: the Finder's «choose folder», in front; «Cancel» (error -128) answers empty
const APPLESCRIPT = [
  'on run argv',
  'set titulo to item 1 of argv',
  'set inicio to item 2 of argv',
  'try',
  'activate',
  'end try',
  'try',
  'if inicio is "" then',
  'set f to choose folder with prompt titulo',
  'else',
  'set f to choose folder with prompt titulo default location (POSIX file inicio)',
  'end if',
  'on error number -128',
  'return ""',
  'end try',
  'return POSIX path of f',
  'end run',
];

/**
 * The command for each system: PowerShell on Windows, osascript on macOS, and zenity or kdialog on Linux (kdialog
 * first on KDE). Null when this computer has no dialog program (a minimal Linux, or another system).
 */
export function ordenDelDialogo(sistema: NodeJS.Platform, inicio: string, titulo: string, hay: (programa: string) => boolean = (p) => enElPath(p), escritorio: string = process.env.XDG_CURRENT_DESKTOP ?? ''): OrdenDialogo | null {
  if (sistema === 'win32')
    return { programa: 'powershell.exe', args: ['-NoProfile', '-NonInteractive', '-STA', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', codificado(PS_DIALOGO)], env: { STL_INICIO: inicio, STL_TITULO: titulo }, salida: 'base64' };
  if (sistema === 'darwin') return { programa: 'osascript', args: [...APPLESCRIPT.flatMap((l) => ['-e', l]), titulo, inicio], salida: 'texto' };
  if (sistema !== 'linux' && sistema !== 'freebsd' && sistema !== 'openbsd') return null;
  const zenity = (): OrdenDialogo => ({ programa: 'zenity', args: ['--file-selection', '--directory', `--title=${titulo}`, `--filename=${inicio.endsWith('/') ? inicio : `${inicio}/`}`], salida: 'texto', cancelaCon1: true });
  const kdialog = (): OrdenDialogo => ({ programa: 'kdialog', args: ['--getexistingdirectory', inicio, '--title', titulo], salida: 'texto', cancelaCon1: true });
  const orden = /kde/i.test(escritorio) ? [['kdialog', kdialog], ['zenity', zenity]] as const : [['zenity', zenity], ['kdialog', kdialog]] as const;
  for (const [programa, armar] of orden) if (hay(programa)) return armar();
  return null;
}

/** The chosen path, from what the program printed; null if it printed nothing (cancelled). */
export function rutaDeLaSalida(salida: string, como: OrdenDialogo['salida']): string | null {
  const limpia = salida.trim();
  if (!limpia) return null;
  const ruta = como === 'base64' ? Buffer.from(limpia, 'base64').toString('utf8').trim() : limpia.replace(/\r?\n$/, '');
  // osascript gives folders with their final slash
  return ruta.length > 1 ? ruta.replace(/[\\/]$/, '') : ruta;
}

type Lanzar = typeof spawn;

/**
 * Opens the dialog and waits for it. Exit 0 with a path: chosen; exit 0 empty, or 1 (zenity and kdialog's «Cancel»):
 * cancelled; anything else, a failure, and the page falls back to the Studio's explorer. When `senal` aborts (the page
 * pressed «Use the Studio's explorer», or it left), the process ends and its window closes.
 */
export function abrirDialogo(orden: OrdenDialogo, senal: AbortSignal, lanzar: Lanzar = spawn): Promise<Exclude<ResultadoDialogo, { estado: 'sinDialogo' }>> {
  return new Promise((ok) => {
    if (senal.aborted) return ok({ estado: 'cancelada' });
    let salida = '';
    let error = '';
    let listo = false;
    const fin = (r: Exclude<ResultadoDialogo, { estado: 'sinDialogo' }>) => {
      if (listo) return;
      listo = true;
      senal.removeEventListener('abort', cortar);
      ok(r);
    };
    let hijo: ReturnType<Lanzar>;
    try {
      hijo = lanzar(orden.programa, orden.args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...(orden.env ?? {}) } });
    } catch (e) {
      return fin({ estado: 'fallo', error: (e as Error).message });
    }
    function cortar() {
      try {
        hijo.kill();
      } catch {
        // already gone
      }
      fin({ estado: 'cancelada' });
    }
    senal.addEventListener('abort', cortar);
    hijo.stdout?.on('data', (d: Buffer) => (salida += d.toString('utf8')));
    hijo.stderr?.on('data', (d: Buffer) => (error += d.toString('utf8')));
    hijo.on('error', (e) => fin({ estado: 'fallo', error: e.message }));
    hijo.on('close', (codigo) => {
      if (codigo === 0) {
        const ruta = rutaDeLaSalida(salida, orden.salida);
        return fin(ruta ? { estado: 'elegida', ruta } : { estado: 'cancelada' });
      }
      if (codigo === 1 && orden.cancelaCon1 && !salida.trim()) return fin({ estado: 'cancelada' });
      fin({ estado: 'fallo', error: error.trim().slice(0, 300) || `exit ${codigo}` });
    });
  });
}

/** The mark that this computer was already told it has no folder window (in .estudio/, outside git). */
export const marcaSinDialogo = (raiz: string) => join(raiz, '.estudio', 'aviso-sin-dialogo');

/** True only the first time on this computer (nmws7mgxstit): it leaves its mark and from then on says false. */
async function avisarSinDialogo(raiz: string): Promise<boolean> {
  const marca = marcaSinDialogo(raiz);
  if (existsSync(marca)) return false;
  try {
    await mkdir(dirname(marca), { recursive: true });
    await writeFile(marca, `${new Date().toISOString()}\n`);
  } catch {
    // If the mark cannot be written, it is said again next time: better than never
  }
  return true;
}

/** The whole request: where it starts, which command, and what came back. */
export async function dialogoDeCarpeta(o: { raiz: string; campo: string; titulo: string; repositorios: Record<string, string>; senal: AbortSignal; sistema?: NodeJS.Platform; hay?: (programa: string) => boolean; lanzar?: Lanzar; casa?: string; esCarpeta?: (r: string) => boolean }): Promise<ResultadoDialogo> {
  const inicio = carpetaDeInicio(o.campo, o.repositorios, o.raiz, o.esCarpeta, o.casa);
  const orden = ordenDelDialogo(o.sistema ?? process.platform, inicio, o.titulo, o.hay);
  if (!orden) return { estado: 'sinDialogo', avisar: await avisarSinDialogo(o.raiz) };
  return abrirDialogo(orden, o.senal, o.lanzar);
}
