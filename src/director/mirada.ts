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
 * Medir en lugar de adivinar (nota nmwjm1bb0tit: el pie falló tres veces porque se corrigió leyendo el CSS, sin medir):
 * `mirar.ts --medir` abre la página sin pantalla y devuelve la caja de cada selector (su alto, ancho y arriba) y lo que
 * el navegador calculó para su alto. Con variantes, cambia antes la clase y el texto de un elemento (el respaldo «Sin
 * respaldo», «El respaldo falló») y mide otra vez.
 */
export interface VarianteDeMedida { selector: string; clase: string; texto: string }

/** `--variante "<selector>|<clase>|<texto>"`. */
export function varianteDeMedida(texto: string): VarianteDeMedida | null {
  const [selector, clase, ...resto] = texto.split('|');
  if (!selector?.trim() || clase === undefined || !resto.length) return null;
  return { selector: selector.trim(), clase: clase.trim(), texto: resto.join('|') };
}

/** El guion que corre en la página: un JSON con la medida de cada selector, sin variante y con cada una. */
export function guionDeMedida(selectores: string[], variantes: VarianteDeMedida[] = []): string {
  const cuerpo = `
const medir = (s) => [...document.querySelectorAll(s)].map((el) => { const r = el.getBoundingClientRect(); const c = getComputedStyle(el);
  return { selector: s, alto: +r.height.toFixed(2), ancho: +r.width.toFixed(2), arriba: +r.top.toFixed(2), display: c.display, minHeight: c.minHeight, padding: c.padding, lineHeight: c.lineHeight, borde: c.borderTopWidth, alignSelf: c.alignSelf, margen: c.margin, height: c.height, zoom: c.zoom, transicion: c.transition }; });
const todo = (nombre) => ({ variante: nombre, medidas: ${JSON.stringify(selectores)}.flatMap(medir) });
const salida = [todo('tal como está')];
for (const v of ${JSON.stringify(variantes)}) { const el = document.querySelector(v.selector); if (!el) { salida.push({ variante: v.texto, falta: v.selector }); continue; }
  el.hidden = false; el.className = v.clase; el.textContent = v.texto; salida.push(todo(v.texto)); }
return JSON.stringify(salida);`;
  return `(() => {${cuerpo}\n})()`;
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

// La prueba antes de cerrar (pd_salud_a; decisión nmw9gqf1ptit, 9 de noviembre de 2026): antes de que una revisión cierre,
// bandeja.ts --listo abre el Studio sin pantalla, con el plan que deja, y no cierra si la página no carga. La página dice
// si cargó en su etiqueta html: `data-estudio="cargado"` cuando app.ts terminó, `"fallo"` cuando salió la pantalla de
// emergencia (estudio/src/emergencia.ts). En un computador sin Edge ni Chrome, la revisión cierra con un aviso en su
// mensaje (nmw9lrvnrtit); con el servidor del Studio apagado tampoco hay qué probar, y se dice igual.

/** La página que se prueba: el Studio encendido, sin «Dónde quedamos» encima. */
export const URL_PRUEBA_CARGA = 'http://localhost:5180/?mirar';
/** Cuánto tiempo virtual tiene la página para cargar, en milisegundos. */
export const ESPERA_PRUEBA_CARGA = 20000;

/** Solo para los Estudios temporales de las pruebas y de la medición (tools/director/estudioDePrueba.ts): sin la prueba. */
export const SIN_PRUEBA_DE_CARGA = 'STL_SIN_PRUEBA_DE_CARGA';

export type ResultadoCarga =
  | { estado: 'omitida' }
  | { estado: 'cargo' }
  | { estado: 'fallo'; detalle: string }
  | { estado: 'no_termino'; detalle: string }
  | { estado: 'sin_navegador' }
  | { estado: 'sin_servidor' };

/** La orden para la prueba: sin pantalla, con su perfil aparte, y el DOM de la página por la salida. Pura. */
export function argumentosPruebaDeCarga(url: string, perfil: string, esperaMs = ESPERA_PRUEBA_CARGA): string[] {
  return [
    '--headless=new', ...SIN_GPU, '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    `--user-data-dir=${perfil}`, '--window-size=1440,900', `--virtual-time-budget=${esperaMs}`,
    '--enable-logging=stderr', '--v=0', '--dump-dom', url,
  ];
}

/** Lo que dice el DOM que dejó la página (y su consola): si cargó, si salió la pantalla de emergencia o si no terminó. Pura. */
export function veredictoDeCarga(dom: string, stderr = ''): ResultadoCarga {
  const etiqueta = dom.match(/<html\b[^>]*>/i)?.[0] ?? '';
  const marca = etiqueta.match(/\bdata-estudio="([^"]*)"/)?.[1];
  if (marca === 'cargado') return { estado: 'cargo' };
  const consola = erroresDeConsola(stderr);
  if (marca === 'fallo') {
    const fallo = dom.match(/<div class="emergencia-fallo">([\s\S]*?)<\/div>/)?.[1]?.trim();
    return { estado: 'fallo', detalle: fallo || consola[0] || 'la pantalla de emergencia, sin detalle' };
  }
  return { estado: 'no_termino', detalle: consola.slice(0, 3).join(' · ') || (dom.trim() ? 'la página no avisó que terminó de cargar' : 'el navegador no devolvió la página') };
}

/** Si la revisión cierra y lo que se dice: en la consola del director y, si no se pudo probar, en el mensaje. Pura. */
export function cierreConCarga(r: ResultadoCarga, idioma: 'es' | 'en' = 'en'): { cierra: boolean; texto: string; aviso?: string; cargo?: boolean } {
  const en = idioma === 'en';
  switch (r.estado) {
    case 'omitida':
      return { cierra: true, texto: 'Closing test skipped: a temporary Studio of the tests.' };
    case 'cargo':
      return { cierra: true, cargo: true, texto: 'Closing test: the Studio\'s page loads with the plan this review leaves.' };
    case 'fallo':
    case 'no_termino':
      return { cierra: false, texto: `Review not closed: the Studio's page does not load with what this review leaves (${r.estado === 'fallo' ? 'it showed the emergency screen' : 'it did not finish loading'}: ${r.detalle}). Fix it in this same review and close again; to look at it, node tools/director/mirar.ts --carga.` };
    case 'sin_navegador':
      return {
        cierra: true,
        texto: 'Closing test not run: there is no Edge or Chrome on this computer (STL_NAVEGADOR, if it is elsewhere). The review closes with a notice in its message.',
        aviso: en
          ? '- **About the closing test:** it could not run, because this computer has neither Edge nor Chrome; the review closed without checking that the Studio loads. Installing either one (Microsoft Edge or Google Chrome) turns it on in the next review.'
          : '- **Sobre la prueba de cierre:** no pudo correr, porque este computador no tiene Edge ni Chrome; la revisión cerró sin comprobar que el Studio carga. Instalar cualquiera de los dos (Microsoft Edge o Google Chrome) la enciende en la siguiente revisión.',
      };
    case 'sin_servidor':
      return {
        cierra: true,
        texto: 'Closing test not run: the Studio\'s server does not answer at http://localhost:5180. The review closes with a notice in its message.',
        aviso: en
          ? '- **About the closing test:** it could not run, because the Studio was off when the review closed; the review closed without checking that the Studio loads.'
          : '- **Sobre la prueba de cierre:** no pudo correr, porque el Studio estaba apagado cuando la revisión cerró; cerró sin comprobar que el Studio carga.',
      };
  }
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
