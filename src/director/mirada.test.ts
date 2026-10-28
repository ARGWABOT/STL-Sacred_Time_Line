// Lo que el director ve en un navegador (src/director/mirada.ts): qué páginas abre, con qué navegador y qué lee de la consola.
import { describe, expect, it } from 'vitest';
import { argumentosNavegador, candidatosNavegador, erroresDeConsola, urlPermitida } from './mirada.ts';

describe('el director mira en un navegador', () => {
  it('abre solo páginas https o de este computador', () => {
    expect(urlPermitida('http://localhost:5180/')?.port).toBe('5180');
    expect(urlPermitida('http://127.0.0.1:5180/#ruta')).not.toBeNull();
    expect(urlPermitida('https://argwabot.github.io/STL-Sacred_Time_Line/')).not.toBeNull();
    expect(urlPermitida('http://ejemplo.com/')).toBeNull();
    expect(urlPermitida('file:///C:/Windows/win.ini')).toBeNull();
    expect(urlPermitida('javascript:alert(1)')).toBeNull();
    expect(urlPermitida('no es una dirección')).toBeNull();
  });

  it('busca primero el navegador pedido y luego Edge y Chrome de cada sistema', () => {
    const win = candidatosNavegador('win32', { STL_NAVEGADOR: 'D:\\x\\chrome.exe', ProgramFiles: 'C:\\Program Files' });
    expect(win[0]).toBe('D:\\x\\chrome.exe');
    expect(win.some((r) => r.endsWith('msedge.exe'))).toBe(true);
    expect(candidatosNavegador('darwin', {}).some((r) => r.includes('Google Chrome.app'))).toBe(true);
    expect(candidatosNavegador('linux', {})).toContain('/usr/bin/chromium');
  });

  it('captura sin pantalla, con un perfil aparte y el ancho pedido', () => {
    const a = argumentosNavegador('http://localhost:5180/', 390, 844, '/tmp/x.png', '/tmp/perfil');
    expect(a).toEqual(expect.arrayContaining(['--headless=new', '--user-data-dir=/tmp/perfil', '--window-size=390,844', '--screenshot=/tmp/x.png']));
    expect(a.at(-1)).toBe('http://localhost:5180/');
  });

  it('de lo que escribe el navegador, cuenta solo la consola de la página y los errores sin atrapar', () => {
    const stderr = [
      '[1020/235959.123:INFO:CONSOLE(42)] "Uncaught TypeError: x is not a function", source: http://localhost:5180/src/main.ts (42)',
      '[1020/235959.124:ERROR:gpu_init.cc(523)] Passthrough is not supported',
      '[1020/235959.125:INFO:CONSOLE(42)] "Uncaught TypeError: x is not a function", source: http://localhost:5180/src/main.ts (42)',
    ].join('\n');
    expect(erroresDeConsola(stderr)).toEqual(['"Uncaught TypeError: x is not a function", source: http://localhost:5180/src/main.ts (42)']);
    expect(erroresDeConsola('')).toEqual([]);
  });
});
