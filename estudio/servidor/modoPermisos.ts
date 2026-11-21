// Cómo pide permisos el director que lanza el Studio. Desde el documento «One permission mode» (decisiones del titular
// nmwp8uot6tit, nmwp8wpaatit, nmwp8y3mrtit y nmwp8ya5stit) hay un solo modo, sin selector: toda revisión, urgencia y
// aclaración corre en el modo que pregunta (`pregunta`). Desde la nota «Algo falla» nmwpcwk2ltit (20 de noviembre de 2026:
// «que el modelo trabaje de la forma más autónoma posible y solamente pregunte cosas realmente críticas»), el director
// trabaja solo: lo permitido (--allowedTools) son tipos de acción enteros, cualquier orden de la terminal (también pedirle
// algo a localhost) y leer y editar sus carpetas de trabajo; lo crítico (PREGUNTA_SIEMPRE: subir o traer, publicar o
// desplegar, deshacer a la fuerza, borrar fuera de git, instalar un paquete con su nombre, escribir en un servidor de
// internet) va en las reglas `ask` de los ajustes, que en Claude Code ganan a las que permiten, y llega al Studio por el
// gancho PermissionRequest (tools/director/ganchoPermiso.ts y permisosEnEspera.ts), que pausa la revisión hasta que la
// persona decide; lo que nunca, negado al instante (--disallowedTools), que gana a las dos. Lo midió
// tools/probarPermisos.ts con la versión instalada (26 de octubre de 2026): el gancho corre en el modo que pregunta y no
// corre ni en dontAsk ni con disableAllHooks, que es el arranque limpio de hoy (ajustesClaude.ts › arranqueLimpio). El modo
// `autorizado` (dontAsk) queda solo para el primer tiempo de la revisión, que solo planea y no tiene nada que preguntar; el
// `automatico` ya no lo usa ningún lanzamiento. Lo que la persona eligió antes en «Modelo y consumo» (estudio.local.json ›
// modoPermisos) ya no cuenta, y lo que ya autorizó sigue autorizado.
// Aquí, lo puro: qué cambia en el lanzamiento de uno a otro. El lanzador (revisor.ts › lanzar) lo usa.
import { resolve } from 'node:path';
import type { ModoPermisos } from '../../src/director/proyectos.ts';
import { t } from '../src/textos.ts';
import { ajustesDelDirector, fuentesDelDirector } from './ajustesClaude.ts';
import { TOPE_GANCHO_MS } from './permisoAlMomento.ts';
import { leerCandado } from './unico.ts';

/** El puerto de última instancia, el de vite.config.ts. */
const PUERTO_POR_DEFECTO = 5180;

/**
 * Cuánto espera Claude Code al gancho, en segundos: el tope técnico de la pregunta (un día; la persona no tiene límite,
 * nmwp6ch5utit) y un margen, para que niegue el Studio (con su porqué) y no el reloj de Claude Code.
 */
export const TOPE_GANCHO_S = TOPE_GANCHO_MS / 1000 + 60;

/** El único modo de los lanzamientos de la revisión, la urgencia y la aclaración (nmwp8uot6tit). */
export const MODO_DEL_DIRECTOR = 'pregunta' as const;

/**
 * Lo crítico, lo único que pausa la revisión y pregunta con el aviso aunque las órdenes de la terminal estén permitidas
 * (nmwpcwk2ltit): reglas `ask` de Claude Code, por tipo de acción. Lo que nunca (revisor.ts › negado) sigue aparte, en
 * --disallowedTools, y gana a estas: `git reset --hard` está aquí y además negado, y sigue negado.
 */
export const PREGUNTA_SIEMPRE: readonly string[] = [
  // subir o traer
  'Bash(git push:*)', 'Bash(git pull:*)',
  // publicar o desplegar
  'Bash(npm publish:*)', 'Bash(yarn publish:*)', 'Bash(pnpm publish:*)', 'Bash(gh release:*)', 'Bash(gh pr merge:*)',
  'Bash(vercel:*)', 'Bash(npx vercel:*)', 'Bash(netlify deploy:*)', 'Bash(firebase deploy:*)', 'Bash(fly deploy:*)', 'Bash(flyctl deploy:*)',
  'Bash(wrangler deploy:*)', 'Bash(npx wrangler deploy:*)',
  // deshacer cambios a la fuerza
  'Bash(git reset --hard*)', 'Bash(git reset * --hard*)', 'Bash(git clean:*)', 'Bash(git checkout -f*)', 'Bash(git checkout * -f*)',
  // borrar fuera de git (git rm, que borra lo que git guarda, sigue permitido)
  'Bash(rm:*)', 'Bash(rmdir:*)', 'Bash(del:*)', 'Bash(rd:*)', 'Bash(Remove-Item:*)', 'Bash(unlink:*)', 'Bash(shred:*)', 'Bash(find * -delete*)',
  // instalar un paquete con su nombre (npm install a secas, lo que dice package.json, sigue permitido)
  'Bash(npm install *)', 'Bash(npm i *)', 'Bash(npm add:*)', 'Bash(yarn add:*)', 'Bash(pnpm add:*)', 'Bash(pip install:*)', 'Bash(pip3 install:*)',
  'Bash(python -m pip install:*)', 'Bash(composer require:*)', 'Bash(cargo add:*)', 'Bash(cargo install:*)', 'Bash(go install:*)',
  'Bash(gem install:*)', 'Bash(winget install:*)', 'Bash(choco install:*)', 'Bash(scoop install:*)', 'Bash(brew install:*)',
  'Bash(apt install:*)', 'Bash(apt-get install:*)',
  // escribir en un servidor de internet (leer, también de localhost, sigue permitido). Estas reglas solo miran el
  // principio de la orden: la que manda datos solo a este computador la deja pasar el gancho, sin el aviso
  // (permisosEnEspera.ts › soloAEsteComputador, nmwpkiddptit)
  'Bash(curl * -X POST*)', 'Bash(curl * -X PUT*)', 'Bash(curl * -X PATCH*)', 'Bash(curl * -X DELETE*)', 'Bash(curl * --request *)',
  'Bash(curl * -d *)', 'Bash(curl * --data*)', 'Bash(curl * -F *)', 'Bash(curl * --form*)', 'Bash(curl * -T *)', 'Bash(curl * --upload-file*)',
  'Bash(wget * --post-*)', 'Bash(Invoke-RestMethod:*)', 'Bash(Invoke-WebRequest * -Method*)', 'Bash(gh api * -X*)', 'Bash(gh api * --method*)',
  'Bash(gh pr create:*)', 'Bash(gh issue create:*)', 'Bash(gh repo create:*)', 'Bash(gh repo delete:*)',
  'Bash(scp:*)', 'Bash(rsync:*)', 'Bash(ssh:*)', 'Bash(sftp:*)',
];

/** Lo fijo de una regla de órdenes, hasta su primer comodín: «git push» de Bash(git push:*); null si no es de órdenes o no tiene. */
const fijoDeOrden = (regla: string): string | null => {
  const m = /^Bash\(([\s\S]+)\)$/.exec(regla);
  return m ? m[1].replace(/:\*$/, '').split('*')[0].trim() || null : null;
};

/**
 * Lo crítico que se pregunta en una revisión: PREGUNTA_SIEMPRE sin lo que la persona ya dio con «Siempre» para ese
 * proyecto o para todos (`autorizadas`, permisosNegados.ts › autorizadasPara): una regla `ask` gana a la que permite, y
 * sin esto su «Siempre» no valdría nunca. Una regla autorizada cubre las críticas que empiezan con lo fijo de ella
 * (Bash(git push:*) cubre Bash(git push:*); Bash(npm install:*) cubre Bash(npm install *)). La regla suelta «Bash» no
 * cubre nada. Pura.
 */
export function preguntasDelDirector(autorizadas: readonly string[]): string[] {
  const dadas = autorizadas.map(fijoDeOrden).filter((f): f is string => f !== null);
  return PREGUNTA_SIEMPRE.filter((p) => {
    const f = fijoDeOrden(p);
    return !f || !dadas.some((d) => f === d || f.startsWith(`${d} `));
  });
}

/** Los ajustes del director con su lista de lo que se pregunta (`permissions.ask`), en vez de la que traían. Pura. */
export function conPreguntas(ajustes: string, preguntar: readonly string[]): string {
  const a = JSON.parse(ajustes) as Record<string, unknown>;
  const antes = a.permissions && typeof a.permissions === 'object' ? (a.permissions as Record<string, unknown>) : {};
  return JSON.stringify({ ...a, permissions: { ...antes, ask: [...preguntar] } });
}

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

/** La ruta del gancho de la cuenta de GitHub en este Studio (tools/director/ganchoCuentaGit.ts), absoluta. */
export const rutaDelGanchoDeCuenta = (raiz: string): string => resolve(raiz, 'tools', 'director', 'ganchoCuentaGit.ts');

/**
 * Suma a los ajustes del director el gancho PreToolUse que niega, en el momento, una orden de red con otra cuenta
 * (src/director/cuentaGit.ts), y deja correr los ganchos. Solo se usa donde tus hooks de usuario no se cargan (`puedeConGancho`):
 * los ganchos de todas las fuentes se suman, y los tuyos correrían junto a este. Pura.
 */
export function conGanchoDeCuenta(ajustes: string, gancho: string): string {
  const a = JSON.parse(ajustes) as Record<string, unknown>;
  const hooks = a.hooks && typeof a.hooks === 'object' ? (a.hooks as Record<string, unknown>) : {};
  return JSON.stringify({ ...a, disableAllHooks: false, hooks: { ...hooks, PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: `node "${gancho.replace(/\\/g, '/')}"`, timeout: TOPE_GANCHO_CUENTA_S }] }] } });
}

/** Cuánto espera Claude Code al gancho de la cuenta: la espera del turno de gh (cinco minutos, nmwnofvsztit) y un margen. */
const TOPE_GANCHO_CUENTA_S = 330;

/** Si el gancho de la cuenta puede correr solo: preguntando en el Studio o sin tus ajustes de usuario, tus hooks no se cargan. */
export const puedeConGancho = (modo: ModoPermisos, propios: boolean): boolean => modo === 'pregunta' || !propios;

/** El puerto en que escucha el servidor del Studio: el que anotó su candado (unico.ts, el de verdad aunque Vite cambie), o el de PORT/5180. */
export function puertoDelStudio(raiz: string, env: NodeJS.ProcessEnv = process.env): number {
  return leerCandado(raiz)?.puerto ?? (Number(env.PORT) || PUERTO_POR_DEFECTO);
}

/** A dónde pregunta el gancho de una revisión: la ruta del servidor del Studio (api.ts) con la clave de esa revisión. */
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
 * le falta (porQueSinAutomatico), y si quedó elegido de antes, el lanzador vuelve a «Solo lo autorizado».
 */
export const admiteAutomatico = (modos: readonly string[]): boolean => modos.includes('auto');

/** Lo que le falta a quien no puede usar el modo automático, en una línea. */
export const porQueSinAutomatico = () => t('servidor.sinAutomatico');

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
      // Lo crítico se pregunta (PREGUNTA_SIEMPRE); el lanzador le quita lo que ya se dio con «Siempre» (conPreguntas)
      ajustes: conPreguntas(JSON.stringify({ ...sinGanchosPropios(e.conservados), ...director.ajustes, ...ajustesDelGancho(e.gancho) }), PREGUNTA_SIEMPRE),
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
