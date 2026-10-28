// Cómo pide permisos el director que lanza el Studio (propuesta aceptada pr_permisos_al_momento, su pieza 3; pedido
// pd_permiso_espera; pd_permiso_automatico; decisiones del titular del 26 de octubre de 2026). Tres modos, que se eligen en
// «Modelo y consumo» y se guardan en estudio.local.json › modoPermisos (el tercero, `automatico`, abajo, en permisosDelModo):
//  - `autorizado` (sin la clave): el de siempre. Claude Code corre en dontAsk, lo que no está autorizado se le niega sin
//    preguntar y queda en el panel de permisos. Sus argumentos y sus ajustes son los de antes, byte por byte.
//  - `pregunta`, «Me pregunta en el Studio»: Claude Code corre en el modo que pregunta, y lo que le falta lo resuelve el
//    gancho PermissionRequest (tools/director/ganchoPermiso.ts), que le pasa la pregunta al servidor del Studio
//    (permisosEnEspera.ts) y espera a la persona hasta dos minutos. Lo midió tools/probarPermisos.ts con la versión
//    instalada (26 de octubre de 2026): el gancho corre en el modo que pregunta y no corre ni en dontAsk ni con
//    disableAllHooks, que es el arranque limpio de hoy (ajustesClaude.ts › arranqueLimpio).
// Aquí, lo puro: qué cambia en el lanzamiento de uno a otro. El lanzador (revisor.ts › lanzar) lo usa.
import { resolve } from 'node:path';
import type { ModoPermisos } from '../../src/director/proyectos';
import { ajustesDelDirector, fuentesDelDirector } from './ajustesClaude';
import { ESPERA_PERMISO_MS } from './permisoAlMomento';
import { leerCandado } from './unico';

/** El puerto de última instancia, el de vite.config.ts. */
const PUERTO_POR_DEFECTO = 5180;

/**
 * Cuánto espera Claude Code al gancho, en segundos: lo que espera el Studio a la persona (dos minutos) y un margen, para
 * que niegue el Studio (con su porqué) y no el reloj de Claude Code.
 */
export const TOPE_GANCHO_S = ESPERA_PERMISO_MS / 1000 + 30;

/**
 * Lo de tus ajustes que el director que pregunta nunca recibe: tus hooks (con disableAllHooks en falso para que corra el
 * del Studio, los tuyos correrían también, y uno solo basta para torcer una revisión: el de sincronizar las cuentas corría
 * en cada director), el que los apaga, y tu línea de estado, que es otra orden tuya y se apaga con ellos.
 */
export const GANCHOS_PROPIOS = ['hooks', 'disableAllHooks', 'statusLine'] as const;

/** Tus ajustes sin tus hooks. Pura. */
export function sinGanchosPropios(ajustes: Record<string, unknown>): Record<string, unknown> {
  const sin = { ...ajustes };
  for (const k of GANCHOS_PROPIOS) delete sin[k];
  return sin;
}

/** La ruta del gancho en este Studio (tools/director/ganchoPermiso.ts), absoluta. */
export const rutaDelGancho = (raiz: string): string => resolve(raiz, 'tools', 'director', 'ganchoPermiso.ts');

/**
 * El gancho PermissionRequest del Studio, en la forma que midió tools/probarPermisos.ts (ajustes pasados con --settings):
 * una orden de node con la ruta entre comillas y con barras normales (la consola de Windows), con tiempo de sobra para la
 * espera. Sin `matcher` de una herramienta: `*` casa con todas, según la referencia de ganchos de Claude Code (matcher
 * «*», vacío u omitido = todas), porque cualquier herramienta puede pedir un permiso que falte y a todas las pregunta el
 * Studio; lo que nunca se niega al instante, dentro del servidor (permisoAlMomento.ts). Y `disableAllHooks` en falso, que
 * el arranque limpio ponía en verdadero: es lo que deja correr este gancho.
 */
export function ajustesDelGancho(gancho: string) {
  return {
    disableAllHooks: false,
    hooks: { PermissionRequest: [{ matcher: '*', hooks: [{ type: 'command', command: `node "${gancho.replace(/\\/g, '/')}"`, timeout: TOPE_GANCHO_S }] }] },
  };
}

/** El puerto en que escucha el servidor del Studio: el que anotó su candado (unico.ts, el de verdad aunque Vite cambie), o el de PORT/5180. */
export function puertoDelStudio(raiz: string, env: NodeJS.ProcessEnv = process.env): number {
  return leerCandado(raiz)?.puerto ?? (Number(env.PORT) || PUERTO_POR_DEFECTO);
}

/** A dónde pregunta el gancho de una revisión: la ruta del servidor del Studio (director.ts) con la clave de esa revisión. */
export const urlDelGancho = (puerto: number, clave: string): string => `http://localhost:${puerto}/__estudio/director/permiso-al-momento/pedir?clave=${encodeURIComponent(clave)}`;

/**
 * Los nombres que acepta `--permission-mode` según la ayuda de Claude Code (`claude --help`): «(choices: "acceptEdits",
 * "auto", …)». [] si la ayuda no lo dice.
 */
export function modosDeLaAyuda(ayuda: string): string[] {
  const i = ayuda.indexOf('--permission-mode');
  if (i < 0) return [];
  // Hasta la opción siguiente (sus líneas empiezan con pocos espacios; las que continúan la anterior, con muchos)
  const bloque = ayuda.slice(i).split(/\r?\n {1,6}-/)[0];
  const m = /choices:\s*([^)]*)\)/.exec(bloque);
  return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
}

/**
 * El nombre del modo que pregunta, el que acepta el Claude Code instalado. La prueba real del 26 de octubre de 2026
 * (tools/probarPermisos.ts, versión 2.1.310) lo llamó `default`, el de la documentación; la ayuda del instalado hoy lista
 * `manual` y ya no `default`. Si la ayuda lista `manual`, ese; en cualquier otro caso (una versión más vieja, o una ayuda
 * que no se pudo leer), `default`.
 */
export const nombreDelModoQuePregunta = (modos: readonly string[]): 'manual' | 'default' => (modos.includes('manual') ? 'manual' : 'default');

/**
 * Si el Claude Code instalado trae el modo automático: su ayuda lo lista como `auto` (la prueba real del 26 de octubre de
 * 2026, tools/probarPermisos.ts --auto, lo lanzó con ese nombre). Sin él, «Automático, vigilado» se ve apagado, con lo que
 * le falta (POR_QUE_SIN_AUTOMATICO), y si quedó elegido de antes, el lanzador vuelve a «Solo lo autorizado».
 */
export const admiteAutomatico = (modos: readonly string[]): boolean => modos.includes('auto');

/** Lo que le falta a quien no puede usar el modo automático, en una línea. */
export const POR_QUE_SIN_AUTOMATICO =
  'Tu Claude Code no trae el modo automático (su ayuda no lo lista): actualízalo con «claude update» en una terminal y vuelve a abrir esta pestaña. Si con la versión nueva tampoco aparece, tu cuenta todavía no lo admite.';

/** Lo que el lanzador necesita para armar el lanzamiento según cómo pide permisos el director. */
export interface EntradaDePermisos {
  /** Lo que lee Claude Code de ultracode, y si el titular le dio el permiso de usarlo (ajustesDelDirector). */
  ultracode: boolean;
  permitidoUltracode: boolean;
  /** La carpeta personal (arranqueLimpio). */
  home: string;
  /** Si el director carga tus ajustes de usuario completos (Local › ajustesPropios distinto de falso). */
  propios: boolean;
  /**
   * Lo que el lanzador leyó de tus ajustes para sumarlo a los del Studio. En `autorizado`: {} si cargan completos, y las
   * claves elegidas si no. En `pregunta`: las elegidas, o todo lo conservable si cargaban completos (conservarTodo).
   */
  conservados: Record<string, unknown>;
  /** El archivo de ajustes del director (--settings). */
  archivo: string;
  /** El gancho (rutaDelGancho) y el nombre del modo que pregunta (nombreDelModoQuePregunta): solo en `pregunta`. */
  gancho: string;
  modoQuePregunta: string;
}

/** Lo que cambia en el lanzamiento: el texto del archivo de ajustes, los argumentos de Claude Code que dependen del modo, y los flujos. */
export interface PermisosDelLanzamiento {
  /** El texto del archivo de ajustes del director (JSON, en una línea). */
  ajustes: string;
  /** Desde `--settings` hasta `--permission-mode` y su valor. */
  argumentos: string[];
  /** Si el director puede correr flujos de varios agentes (ajustesDelDirector). */
  flujos: boolean;
  /** Si lo que le falte lo pregunta el Studio: el lanzador abre entonces la revisión en permisosEnEspera y le pasa la dirección al gancho. */
  pregunta: boolean;
  /**
   * «Automático, vigilado»: lo que le falte lo decide solo Claude Code, y el Studio lee del registro lo que aprobó
   * (aprobadosSolos.ts): en vivo, en «Lo que va haciendo el director», y al terminar, en el panel de «Permisos».
   */
  automatico: boolean;
}

/**
 * Lo que cambia según cómo pide permisos el director. En `autorizado` es exactamente lo de antes: los ajustes del Studio
 * sobre lo conservado de los tuyos, tus ajustes cargados o no según `propios`, y dontAsk. En `pregunta`:
 *  - el modo que pregunta, en vez de dontAsk;
 *  - el gancho del Studio con `disableAllHooks` en falso (ajustesDelGancho), encima de todo lo demás;
 *  - tus ajustes de usuario nunca se cargan (--setting-sources project,local, siempre), porque los ganchos de todas las
 *    fuentes se suman y los tuyos correrían junto al del Studio; se llevan por --settings en su lugar, sin tus hooks ni tu
 *    línea de estado (sinGanchosPropios) y sin lo que le daría un permiso (conservarDe). Con ellos se van, como cuando
 *    eliges no cargarlos, tus skills y tus comandos de ~/.claude;
 *  - ultracode, explícito, porque ya no llega de tus ajustes (ajustesDelDirector con propios en falso);
 *  - el resto del arranque limpio sigue igual: sin tu CLAUDE.md global, sin memoria automática, sin la foto de git y sin
 *    los conectores de claude.ai.
 * Lo que el lanzador le niega siempre (--disallowedTools) no cambia: las reglas que niegan ganan antes de cualquier pregunta.
 * En `automatico`, todo es como en `autorizado` salvo el modo, `auto`: el modo automático no llama al gancho (lo midió
 * tools/probarPermisos.ts --auto el 26 de octubre de 2026) y la orden negada por una regla se negó, así que la guardia de
 * lo que nunca se permite sigue siendo --disallowedTools, igual que en los otros dos.
 */
export function permisosDelModo(modo: ModoPermisos, e: EntradaDePermisos): PermisosDelLanzamiento {
  if (modo === 'pregunta') {
    const director = ajustesDelDirector(e.ultracode, e.permitidoUltracode, e.home, false);
    return {
      ajustes: JSON.stringify({ ...sinGanchosPropios(e.conservados), ...director.ajustes, ...ajustesDelGancho(e.gancho) }),
      argumentos: ['--settings', e.archivo, ...fuentesDelDirector(false), '--permission-mode', e.modoQuePregunta],
      flujos: director.flujos,
      pregunta: true,
      automatico: false,
    };
  }
  const director = ajustesDelDirector(e.ultracode, e.permitidoUltracode, e.home, e.propios);
  return {
    ajustes: JSON.stringify({ ...e.conservados, ...director.ajustes }),
    argumentos: ['--settings', e.archivo, ...fuentesDelDirector(e.propios), '--permission-mode', modo === 'automatico' ? 'auto' : 'dontAsk'],
    flujos: director.flujos,
    pregunta: false,
    automatico: modo === 'automatico',
  };
}
