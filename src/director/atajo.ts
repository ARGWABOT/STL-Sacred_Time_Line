/**
 * La puerta local de un proyecto (pedido pd_acceso_directo, nota nmwdxiulatit): un paso de misión abre la aplicación del
 * proyecto, en este computador, ya con la sesión de un usuario del rol que el paso pide y la página a la vista, sin
 * escribir cuentas ni contraseñas (nmwejfjritit). Aquí, lo puro: el campo del paso, sus candados y lo que dice su botón.
 *
 * La puerta de cada proyecto vive en su repositorio y la construye el director con sus reglas (diagnosis.md › «The local
 * door»); el Studio solo habla con ella por un contrato fijo: `<origen>/__stl/puerta?rol=<rol>&ir=<ruta>` crea la sesión
 * de ese rol (y, si en la base local no hay usuario de ese rol, uno de prueba del Studio, solo ahí: nmwi6rbcktit) y lleva a
 * la página; `<origen>/__stl/puerta/salir` la cierra. Los tres candados (nmwejhse4tit): el archivo interruptor fuera de git
 * (`INTERRUPTOR_PUERTA`, en la raíz del repositorio), solo peticiones de esta misma máquina, y el Studio enlazando solo a
 * una dirección local.
 */

/**
 * Los dispositivos de la vista de la pestaña de QA (pd_qa_vista_dispositivo): el escritorio llena la ventana; la tableta y
 * el teléfono, derechos y a su tamaño (nmwppvslltit: 820 × 1180 y 390 × 844; nmwppwj1stit: solo derechos).
 */
export const DISPOSITIVOS_QA = ['escritorio', 'tableta', 'telefono'] as const;
export type DispositivoQa = (typeof DISPOSITIVOS_QA)[number];
export const esDispositivoQa = (x: unknown): x is DispositivoQa => typeof x === 'string' && (DISPOSITIVOS_QA as readonly string[]).includes(x);

/** Dónde lleva el atajo de un paso y como quién (nmwejiwi4tit). */
export interface AtajoDelPaso {
  /** La página de la aplicación del proyecto, en este computador: `http://localhost:<puerto>/<ruta>`. */
  url: string;
  /** El rol de la aplicación, como lo conoce su código (`gerente`). */
  rol: string;
  /** El rol dicho para la persona, en su idioma («the manager»): va en el botón. */
  como: string;
  /** La orden que arranca la aplicación, si no responde («Start <project> first», nmwf5tf1stit). */
  arranque?: string;
  /** La vista en que abre la pestaña de QA: un paso que revisa el diseño de teléfono abre ya en él (nmwppzjq0tit). */
  dispositivo?: DispositivoQa;
}

/** El archivo interruptor de la puerta, en la raíz del repositorio del proyecto y fuera de git: sin él, no responde. */
export const INTERRUPTOR_PUERTA = '.stl-puerta';

/** La ruta de la puerta en la aplicación del proyecto, y la que cierra su sesión. */
const RUTA_PUERTA = '/__stl/puerta';
const RUTA_SALIR = '/__stl/puerta/salir';

/** ¿Es una dirección de este computador (http o https a localhost, 127.0.0.1 o ::1)? El tercer candado. Puro. */
export function esDireccionLocal(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  if (u.username || u.password) return false;
  return ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname.toLowerCase());
}

/** ¿La petición viene de esta misma máquina? El segundo candado: la dirección del otro lado del socket. Puro. */
export function esPeticionLocal(direccion: string | undefined): boolean {
  return !!direccion && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(direccion);
}

/** Lo que le falta a un atajo para valer, o null. Puro: lo usan `validarPlan` y la ruta del servidor. */
export function problemaDelAtajo(a: unknown): string | null {
  if (!a || typeof a !== 'object') return 'no es un objeto { url, rol, como, arranque? }';
  const x = a as Record<string, unknown>;
  if (typeof x.url !== 'string' || !esDireccionLocal(x.url)) return 'su `url` no es una dirección de este computador (http://localhost:<puerto>/…): el Studio solo enlaza a la aplicación local';
  if (typeof x.rol !== 'string' || !/^[\w.-]{1,40}$/.test(x.rol)) return 'su `rol` no es el nombre de un rol de la aplicación (letras, números, punto, guion o guion bajo)';
  if (typeof x.como !== 'string' || !x.como.trim()) return 'le falta `como`: el rol dicho para la persona, que va en el botón';
  if (x.arranque !== undefined && (typeof x.arranque !== 'string' || !x.arranque.trim() || /\n/.test(x.arranque))) return 'su `arranque` no es una orden de una línea';
  if (x.dispositivo !== undefined && !esDispositivoQa(x.dispositivo)) return `su \`dispositivo\` no es uno de ${DISPOSITIVOS_QA.map((d) => `«${d}»`).join(', ')}`;
  return null;
}

/** Por qué la ruta del Studio no enlaza a la puerta: el paso sin atajo, o uno de sus tres candados. */
export type FallaDelCandado = 'sinAtajo' | 'noLocal' | 'deAfuera' | 'sinInterruptor';

/**
 * Los tres candados de la puerta, en la ruta del Studio, antes de enlazar a ella (nmwejhse4tit): el atajo apunta solo a
 * una dirección de este computador, la petición viene de esta misma máquina y el archivo interruptor existe. Para saber
 * si la aplicación responde (`interruptor` sin pedir) bastan los dos primeros: no abre ninguna sesión. Puro.
 */
export function candadosDelAtajo(x: { atajo: unknown; direccion: string | undefined; interruptor?: boolean }): FallaDelCandado | null {
  if (!x.atajo || typeof x.atajo !== 'object') return 'sinAtajo';
  if (problemaDelAtajo(x.atajo)) return esDireccionLocal(String((x.atajo as { url?: unknown }).url ?? '')) ? 'sinAtajo' : 'noLocal';
  if (!esPeticionLocal(x.direccion)) return 'deAfuera';
  if (x.interruptor === false) return 'sinInterruptor';
  return null;
}

/** La dirección de la puerta para un atajo válido: el origen de su página, con el rol y la ruta. Puro. */
export function direccionDeLaPuerta(a: AtajoDelPaso): string {
  const u = new URL(a.url);
  const ir = `${u.pathname}${u.search}${u.hash}`;
  return `${u.origin}${RUTA_PUERTA}?rol=${encodeURIComponent(a.rol)}&ir=${encodeURIComponent(ir)}`;
}

/** La dirección que cierra la sesión de la puerta, al cerrarse su ventana (nmwflqauvtit). Puro. */
export function direccionDeSalida(a: AtajoDelPaso): string {
  return `${new URL(a.url).origin}${RUTA_SALIR}`;
}

/** El nombre de la ventana de los atajos de un proyecto: una pestaña reusada por proyecto (nmwimp4sxtit). Puro. */
export function ventanaDelAtajo(proyecto: string): string {
  return `stl-atajo-${proyecto.replace(/[^\w-]/g, '_')}`;
}

/**
 * El rol que un atajo reemplaza, si en la pestaña del proyecto ya hay abierta la sesión de otro: un rol a la vez, y el
 * botón lo dice antes de oprimirlo (nmwi6s3dbtit). Puro.
 */
export function rolQueReemplaza(a: Pick<AtajoDelPaso, 'rol'>, abierta: { rol: string; como: string } | undefined): string | null {
  return abierta && abierta.rol !== a.rol ? abierta.como : null;
}
