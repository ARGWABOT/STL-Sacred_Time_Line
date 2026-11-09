// Lo que el director ve en un navegador (propuesta «Que el director vea en un navegador lo que cambia», aceptada el 20
// de octubre de 2026): la lógica pura de tools/director/mirar.ts. Usa el Edge o el Chrome que ya tiene el computador, sin
// pantalla, así que no hay nada que instalar: abre la página en varios anchos, guarda cada captura y junta los errores
// de la consola, para que ningún cambio de la interfaz se cierre sin haberlo visto.
import { join } from 'node:path';

/** Los anchos de siempre: teléfono, tableta y escritorio (el alto, el de una pantalla común de cada uno). Y, solo si se
 *  piden con --anchos (aPedido), los dos bordes de una pantalla ancha: un portátil de 1360 y una de 1920 (nota de voz
 *  nmw40vdvitit: comprobar que nada se pise en las pantallas pequeñas), un portátil de 1536 y una de 2560 (nota de voz
 *  nmw5w9ldotit: probar los textos en varias resoluciones de portátil y de escritorio). */
export const ANCHOS: { nombre: string; ancho: number; alto: number; aPedido?: boolean }[] = [
  { nombre: 'telefono', ancho: 390, alto: 844 },
  // El teléfono más angosto del visor (Android 360), para lo que va de pie en 9:16 (pd_telefono_vertical)
  { nombre: 'telefono360', ancho: 360, alto: 800, aPedido: true },
  { nombre: 'tableta', ancho: 820, alto: 1180 },
  { nombre: 'escritorio', ancho: 1440, alto: 900 },
  { nombre: 'portatil', ancho: 1360, alto: 768, aPedido: true },
  { nombre: 'portatil15', ancho: 1536, alto: 864, aPedido: true },
  { nombre: 'ancha', ancho: 1920, alto: 1080, aPedido: true },
  { nombre: 'grande', ancho: 2560, alto: 1440, aPedido: true },
];

/**
 * Lo que se puede mirar: el Studio u otra página de este computador (http://localhost, 127.0.0.1) o una página pública
 * (https). Nada de archivos, ni de otros esquemas: el director la abre sin que nadie mire.
 */
export function urlPermitida(texto: string): URL | null {
  let u: URL;
  try {
    u = new URL(texto);
  } catch {
    return null;
  }
  if (u.protocol === 'https:') return u;
  if (u.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)) return u;
  return null;
}

/** Dónde buscar el navegador en cada sistema: primero el que se pida en STL_NAVEGADOR, luego Edge y Chrome. */
export function candidatosNavegador(plataforma: NodeJS.Platform, env: Record<string, string | undefined>): string[] {
  const pedido = env.STL_NAVEGADOR ? [env.STL_NAVEGADOR] : [];
  if (plataforma === 'win32') {
    const bases = [env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)', env.ProgramFiles ?? 'C:\\Program Files', env.LOCALAPPDATA].filter((x): x is string => !!x);
    return [...pedido, ...bases.flatMap((b) => [join(b, 'Microsoft', 'Edge', 'Application', 'msedge.exe'), join(b, 'Google', 'Chrome', 'Application', 'chrome.exe')])];
  }
  if (plataforma === 'darwin') {
    return [...pedido, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Chromium.app/Contents/MacOS/Chromium'];
  }
  return [...pedido, ...['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge'].flatMap((n) => ['/usr/bin/', '/usr/local/bin/', '/snap/bin/'].map((d) => d + n))];
}

/**
 * La orden para una captura: sin pantalla, con un perfil aparte (no toca el del usuario ni sus sesiones), el ancho
 * pedido y unos segundos para que la página termine de dibujarse. Los mensajes de la consola salen por stderr. Con
 * `webgl`, la página en 3D se dibuja con el procesador (SwiftShader), sin la tarjeta de video: sin la GPU, el navegador sin
 * pantalla dejaba la escena del recorrido toda en negro (pd_imagen_compartir, 5 de noviembre de 2026).
 */
export const SIN_GPU = ['--disable-gpu'];
export const WEBGL_POR_PROCESADOR = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
export function argumentosNavegador(url: string, ancho: number, alto: number, salida: string, perfil: string, esperaMs = 6000, webgl = false): string[] {
  return [
    '--headless=new', ...(webgl ? WEBGL_POR_PROCESADOR : SIN_GPU), '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    `--user-data-dir=${perfil}`, `--window-size=${ancho},${alto}`, `--virtual-time-budget=${esperaMs}`,
    '--enable-logging=stderr', '--v=0', `--screenshot=${salida}`, url,
  ];
}

/**
 * Lo que dijo la página en la consola, de lo que escribió el navegador: los mensajes de la consola («CONSOLE(…)») y los
 * errores sin atrapar. Lo demás (el ruido del propio navegador) no se cuenta.
 */
export function erroresDeConsola(stderr: string): string[] {
  const vistos = new Set<string>();
  for (const linea of stderr.split(/\r?\n/)) {
    const m = linea.match(/:CONSOLE\(\d+\)\]\s*(.*)$/) ?? linea.match(/(Uncaught .*)$/);
    if (m) vistos.add(m[1].trim());
  }
  return [...vistos];
}
