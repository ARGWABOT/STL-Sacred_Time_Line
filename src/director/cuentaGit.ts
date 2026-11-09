// La cuenta de GitHub de cada proyecto (notas de voz del titular nmvztz14gtit y nmvztzur8tit, 2 de noviembre de 2026: «debe
// confirmar por regla de código que sea la cuenta aprobada para ese proyecto, porque el usuario puede estar utilizando
// diferentes cuentas para diferentes proyectos»). Cada proyecto tiene su cuenta aprobada, por computador
// (estudio.local.json › cuentasGit), y la pone su titular en «Proyecto» › Dónde está. Antes de subir, bajar o publicar se
// compara con el login que dice la API de GitHub para esa sesión, nunca con el nombre que gh guardó: gh recuerda el nombre
// con que se entró (una cuenta renombrada sigue con el de antes), y la sesión del navegador es otro almacén, que gh no ve.
// La comparación es pura; lo que corre gh va aparte, con su orden inyectable en las pruebas.
import { execFile, spawn, spawnSync, type ChildProcess } from 'node:child_process';

export type MotivoCuenta = 'sin_cuenta' | 'sin_sesion' | 'no_coincide' | 'en_duda';

export type ResultadoCuenta =
  | { ok: true; aprobada: string; login: string }
  | { ok: false; motivo: MotivoCuenta; aprobada: string | null; login: string | null };

/** Un login de GitHub: letras, números y guiones; las cuentas de empresa llevan además un guion bajo. */
export const esCuentaGitHub = (x: unknown): x is string => typeof x === 'string' && /^[a-z\d](?:[a-z\d_-]{0,38})$/i.test(x);

const igual = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * La comparación. `login`: lo que dice la API de GitHub, null si no se pudo leer. `nombreEnGh`: el nombre que gh guardó para
 * esa sesión; nunca decide que coincida, y solo sirve para ver la duda: si es el aprobado y GitHub dice otro, puede ser la
 * misma cuenta renombrada, y eso lo confirma la persona, cambiándola en «Proyecto». Pura.
 */
export function compararCuenta(aprobada: string | null | undefined, login: string | null | undefined, nombreEnGh?: string | null): ResultadoCuenta {
  const a = aprobada?.trim() || null;
  const l = login?.trim() || null;
  if (!a) return { ok: false, motivo: 'sin_cuenta', aprobada: null, login: l };
  if (!l) return { ok: false, motivo: 'sin_sesion', aprobada: a, login: null };
  if (igual(a, l)) return { ok: true, aprobada: a, login: l };
  return { ok: false, motivo: nombreEnGh && igual(nombreEnGh, a) ? 'en_duda' : 'no_coincide', aprobada: a, login: l };
}

/** Lo que se le dice a la persona cuando una operación se detiene (las herramientas del Studio hablan en español). */
export function mensajeDeCuenta(r: ResultadoCuenta): string {
  if (r.ok) return `La cuenta de GitHub es ${r.login}, la aprobada para este proyecto.`;
  const donde = 'En el Studio, «Proyecto» › «Dónde está»';
  if (r.motivo === 'sin_cuenta') return `Este proyecto no tiene una cuenta de GitHub aprobada en este computador, así que no hice nada. ${donde}, escribe cuál es${r.login ? ` (GitHub dice que la sesión activa es ${r.login})` : ''} y vuelve a correr esto.`;
  if (r.motivo === 'sin_sesion') return `No pude leer de GitHub con qué cuenta está la sesión de gh, así que no hice nada: la cuenta aprobada es ${r.aprobada}. Revisa tu conexión, o entra con gh auth login con esa cuenta, y vuelve a correr esto.`;
  if (r.motivo === 'en_duda') return `gh guarda esta sesión como ${r.aprobada}, la cuenta aprobada, pero GitHub dice que es ${r.login}: puede ser la misma cuenta con otro nombre, y no lo doy por hecho, así que no hice nada. Si es la misma, ${donde}, cámbiala a ${r.login} y vuelve a correr esto.`;
  return `La cuenta aprobada para este proyecto es ${r.aprobada}, y GitHub dice que la sesión es de ${r.login}: no hice nada. Entra con la cuenta aprobada (gh auth login, o gh auth switch si ya está en gh) y vuelve a correr esto.`;
}

/**
 * Las órdenes que van a GitHub con la sesión de gh: subir, bajar, clonar o preguntarle a un remoto, y las de gh que publican
 * o cambian un repositorio. Da igual lo que vaya antes o entre medio (`cd x && git -c a=b push`); `git commit -m "push"` no
 * es una, porque el verbo es commit. Pura.
 */
export function esOrdenDeRedGit(orden: unknown): boolean {
  if (typeof orden !== 'string') return false;
  return /(?:^|[\s;&|(])git(?:\s+-{1,2}[\w-]+(?:[= ]\S+)?)*\s+(?:push|pull|fetch|clone|ls-remote)\b/.test(orden) || /(?:^|[\s;&|(])gh\s+(?:release|repo|pr)\b/.test(orden);
}

/** Las mismas, como reglas del lanzador: se le niegan al director que se lanza sin la cuenta correcta (`--disallowedTools`). */
export const REGLAS_DE_RED_GIT = ['Bash(git push:*)', 'Bash(git pull:*)', 'Bash(git fetch:*)', 'Bash(git clone:*)', 'Bash(git ls-remote:*)', 'Bash(gh release:*)', 'Bash(gh repo:*)', 'Bash(gh pr:*)'];

/**
 * Si el proyecto no va a GitHub: tiene remotos y ninguno es de GitHub. Sin remotos, sí aplica (el Studio mismo sube a una
 * dirección, sin `origin`). `remotos`: la salida de git remote -v. Pura.
 */
export const noUsaGitHub = (remotos: string): boolean => remotos.trim() !== '' && !/github\.com/i.test(remotos);

/**
 * Lo que imprime el gancho PreToolUse del director lanzado: nada si la orden no va a GitHub o si la cuenta es la aprobada
 * (nunca da un permiso: lo demás lo deciden las reglas de siempre), y negar con su porqué si no. `leerLogin` se llama solo
 * si hace falta. `entrada`: el JSON que le pasa Claude Code. Pura, salvo lo que haga `leerLogin`.
 */
export function respuestaDelGancho(entrada: string, aprobada: string | undefined, leerLogin: () => string | null): string {
  let orden: unknown;
  try {
    orden = JSON.parse(entrada)?.tool_input?.command;
  } catch {
    return '';
  }
  if (!esOrdenDeRedGit(orden)) return '';
  const r = compararCuenta(aprobada, leerLogin());
  if (r.ok) return '';
  return JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: razonParaElDirector(r) } });
}

/** Lo que se le dice al director (en inglés, como todo lo que lee el modelo). */
function razonParaElDirector(r: ResultadoCuenta): string {
  const quien = r.ok ? r.login : (r.login ?? 'unknown');
  const aprobada = r.aprobada ?? 'none';
  return `GitHub account check: the account approved for this project is ${aprobada} and GitHub reports ${quien}, so git network operations are denied. Do not work around it or switch accounts: do the rest, and say in your answer and message what could not be done and that the person has to fix the account (in the Studio, Proyecto › Dónde está, or with gh).`;
}

/** Con qué se corre gh: la orden y su resultado. Las pruebas pasan la suya. */
export type CorrerGh = (args: string[], token?: string) => { status: number | null; stdout: string };

const correrGh: CorrerGh = (args, token) => {
  const r = spawnSync('gh', args, { encoding: 'utf8', timeout: 20_000, env: token ? { ...process.env, GH_TOKEN: token } : process.env });
  return { status: r.status, stdout: r.stdout ?? '' };
};

/** El login de la sesión que usa git aquí: la activa de gh (o la de `token`), según la API de GitHub. Null si no se pudo leer. */
export function loginDeGitHub(token?: string, correr: CorrerGh = correrGh): string | null {
  const r = correr(['api', 'user', '--jq', '.login'], token);
  return r.status === 0 ? r.stdout.trim() || null : null;
}

/** Lo mismo, sin detener el servidor del Studio mientras GitHub responde. */
export function loginDeGitHubSinEsperar(): Promise<string | null> {
  return new Promise((listo) => {
    execFile('gh', ['api', 'user', '--jq', '.login'], { encoding: 'utf8', timeout: 20_000 }, (e, salida) => listo(e ? null : salida.trim() || null));
  });
}

/**
 * La comprobación al lanzar al director: null si el proyecto no va a GitHub. Si no pasa, el lanzador le niega las órdenes de
 * red en cualquier modo (`reglasPorCuenta`), con lo que no se tienen que confiar los ganchos, que no corren en todos.
 */
export async function cuentaAlLanzar(aprobada: string | undefined, repositorio: string): Promise<ResultadoCuenta | null> {
  const remotos = await new Promise<string>((listo) => {
    execFile('git', ['remote', '-v'], { cwd: repositorio, encoding: 'utf8', timeout: 20_000 }, (e, salida) => listo(e ? '' : salida));
  });
  return noUsaGitHub(remotos) ? null : compararCuenta(aprobada, await loginDeGitHubSinEsperar());
}

/** Lo que se le niega al director lanzado por su cuenta: todas las órdenes de red, o ninguna. Pura. */
export const reglasPorCuenta = (r: ResultadoCuenta | null): string[] => (r && !r.ok ? REGLAS_DE_RED_GIT : []);

/** Lo que se suma a su encargo si se le negaron: por qué, para que siga con lo demás y lo diga. Pura. */
export const conLaCuentaGit = (r: ResultadoCuenta | null): string => (r && !r.ok ? ` ${razonParaElDirector(r)}` : '');

/** Los nombres con que gh guarda sus sesiones, de la salida de gh auth status (por cuenta: «account NOMBRE»). Pura. */
export const nombresEnGh = (estado: string): string[] => [...new Set([...estado.matchAll(/\baccount\s+(\S+)/g)].map((m) => m[1]))];

export type SesionAprobada = { ok: true; login: string; token: string } | { ok: false; resultado: ResultadoCuenta };

/**
 * La sesión de gh de la cuenta aprobada, activa o no, para las herramientas que suben y publican. Pide el token solo con
 * `--user` de la aprobada y le pregunta a la API de quién es con ese token: nunca mira ni usa la sesión activa ni las de otras
 * cuentas (nota del titular nmw0z29pgtit, 3 de noviembre de 2026: «este proyecto SOLO debe usar» su cuenta aprobada). Si gh
 * no la tiene guardada con ese nombre, o GitHub dice otra, no hay token: el resultado dice qué le falta a la persona.
 */
export function sesionAprobada(aprobada: string | null | undefined, correr: CorrerGh = correrGh): SesionAprobada {
  const cuenta = aprobada?.trim() || null;
  if (!cuenta) return { ok: false, resultado: compararCuenta(null, null) };
  const t = correr(['auth', 'token', '-h', 'github.com', '--user', cuenta]);
  const token = t.status === 0 ? t.stdout.trim() : '';
  const login = token ? loginDeGitHub(token, correr) : null;
  const r = compararCuenta(cuenta, login, cuenta);
  return r.ok ? { ok: true, login: r.login, token } : { ok: false, resultado: r };
}

// ── Las sesiones de gh, desde «Proyecto» › Dónde está (nota del titular nmw0vw3detit, 3 de noviembre de 2026: «poder
// administrar la cuenta de gh desde el panel de proyecto, gráficamente, no sé hacerlo desde terminal»). La sesión del
// navegador y las de gh son almacenes aparte: estar en GitHub con una cuenta en el navegador no le dice nada a gh. El panel
// lista lo que gh guardó, con el login real que dice GitHub de cada una, cambia la activa y entra con otra cuenta. Lo corre el
// servidor del Studio, solo para el titular; los tokens nunca salen de él.

/** Una sesión que gh tiene guardada: el nombre con que la guardó y si es la activa. */
export interface SesionEnGh { nombre: string; activa: boolean }

/** Una sesión, como la ve la persona: además, el login que dice GitHub (null si no se pudo leer) y si es la aprobada. */
export interface SesionGh extends SesionEnGh { login: string | null; aprobada: boolean }

/**
 * Las sesiones de la salida de gh auth status, en su orden: cada «account NOMBRE» (o «as NOMBRE», en los gh de antes de las
 * varias cuentas) y la activa, la que lleva debajo «Active account: true». Con una sola y sin esa línea, es la activa. Pura.
 */
export function sesionesEnGh(estado: string): SesionEnGh[] {
  const sesiones: SesionEnGh[] = [];
  let conMarca = false;
  for (const linea of estado.split(/\r?\n/)) {
    // También la que gh no pudo abrir («Failed to log in to github.com account X»): sigue guardada, y se ve sin login
    const cuenta = /log(?:ged)? in to \S+ (?:account|as)\s+([^\s(]+)/i.exec(linea);
    if (cuenta) {
      if (!sesiones.some((s) => s.nombre === cuenta[1])) sesiones.push({ nombre: cuenta[1], activa: false });
      continue;
    }
    const marca = /Active account:\s*(true|false)/i.exec(linea);
    if (marca && sesiones.length) {
      conMarca = true;
      sesiones[sesiones.length - 1].activa = marca[1].toLowerCase() === 'true';
    }
  }
  if (!conMarca && sesiones.length === 1) sesiones[0].activa = true;
  return sesiones;
}

/** La lista que ve la persona: la aprobada es la que GitHub dice que es, se llame como se llame en gh; sin login, ninguna. Pura. */
export function marcarSesiones(sesiones: (SesionEnGh & { login: string | null })[], aprobada: string | null | undefined): SesionGh[] {
  const a = aprobada?.trim() || null;
  return sesiones.map((s) => ({ ...s, aprobada: !!(a && s.login && igual(a, s.login)) }));
}

/** La orden que deja activa una sesión: solo a un nombre que gh ya tiene guardado, y nunca a otro texto. Pura. */
export function ordenDeCambio(nombre: unknown, sesiones: SesionEnGh[]): string[] | null {
  return esCuentaGitHub(nombre) && sesiones.some((s) => s.nombre === nombre) ? ['auth', 'switch', '-h', 'github.com', '-u', nombre] : null;
}

/** La dirección donde se escribe el código de un solo uso. */
export const URL_DE_DISPOSITIVO = 'https://github.com/login/device';

/** El código de un solo uso de gh auth login --web y su dirección, de lo que va imprimiendo; null mientras no lo dice. Pura. */
export function codigoDeEntrada(salida: string): { codigo: string; url: string } | null {
  const codigo = /one-time code:\s*([A-Z0-9]{4}-[A-Z0-9]{4})/i.exec(salida)?.[1];
  if (!codigo) return null;
  return { codigo: codigo.toUpperCase(), url: /https:\/\/github\.com\/login\/device\b/.exec(salida)?.[0] ?? URL_DE_DISPOSITIVO };
}

/** Correr gh sin detener el servidor: su salida y si terminó bien; `falta`, si gh no está instalado. */
function ghSinEsperar(args: string[], token?: string): Promise<{ ok: boolean; stdout: string; stderr: string; falta: boolean }> {
  return new Promise((listo) => {
    execFile('gh', args, { encoding: 'utf8', timeout: 20_000, windowsHide: true, env: token ? { ...process.env, GH_TOKEN: token } : process.env }, (e, stdout, stderr) =>
      listo({ ok: !e, stdout: stdout ?? '', stderr: stderr ?? '', falta: (e as NodeJS.ErrnoException | null)?.code === 'ENOENT' }));
  });
}

/** Las sesiones guardadas en gh, cada una con su login según GitHub y marcada si es la aprobada. `hayGh`: si gh está. */
export async function sesionesDeGh(aprobada: string | null | undefined): Promise<{ hayGh: boolean; sesiones: SesionGh[] }> {
  const estado = await ghSinEsperar(['auth', 'status']);
  if (estado.falta) return { hayGh: false, sesiones: [] };
  // gh auth status escribe en una salida u otra según su versión, y termina mal si alguna sesión tiene un problema
  const guardadas = sesionesEnGh(`${estado.stdout}\n${estado.stderr}`);
  const conLogin = await Promise.all(guardadas.map(async (s) => {
    const t = await ghSinEsperar(['auth', 'token', '-h', 'github.com', '--user', s.nombre]);
    const token = t.ok ? t.stdout.trim() : '';
    const u = token ? await ghSinEsperar(['api', 'user', '--jq', '.login'], token) : null;
    return { ...s, login: u?.ok ? u.stdout.trim() || null : null };
  }));
  return { hayGh: true, sesiones: marcarSesiones(conLogin, aprobada) };
}

/** Deja activa en gh la sesión guardada con ese nombre. Vale para todo lo que use gh en este computador, no solo este proyecto. */
export async function usarSesionDeGh(nombre: unknown): Promise<{ ok: boolean; error?: string }> {
  const estado = await ghSinEsperar(['auth', 'status']);
  if (estado.falta) return { ok: false, error: 'sin_gh' };
  const orden = ordenDeCambio(nombre, sesionesEnGh(`${estado.stdout}\n${estado.stderr}`));
  if (!orden) return { ok: false, error: 'sin_sesion' };
  const r = await ghSinEsperar(orden);
  return r.ok ? { ok: true } : { ok: false, error: (r.stderr || r.stdout).trim().split(/\r?\n/).pop() || 'gh' };
}

/** Cómo va la entrada con otra cuenta: esperando que la persona escriba el código, lista o fallida. */
export interface EntradaGh { estado: 'esperando' | 'lista' | 'fallo'; codigo: string | null; url: string; error?: string }

let entrada: { info: EntradaGh; proceso: ChildProcess } | null = null;

/** La entrada en curso o la última, para que el panel la siga. */
export const entradaDeGh = (): EntradaGh | null => (entrada ? { ...entrada.info } : null);

/** Cuánto espera gh a que la persona autorice en el navegador, antes de rendirse. */
const TOPE_DE_ENTRADA_MS = 15 * 60_000;

/**
 * gh auth login --web, sin terminal: devuelve el código de un solo uso y su dirección en cuanto gh los dice, y gh se queda
 * esperando a que la persona lo escriba en el navegador y autorice; al terminar, la sesión nueva queda guardada y activa.
 * Una a la vez: si ya hay una esperando, devuelve esa.
 */
export function entrarConGh(): Promise<EntradaGh> {
  if (entrada?.info.estado === 'esperando' && entrada.info.codigo) return Promise.resolve({ ...entrada.info });
  return new Promise((listo) => {
    const info: EntradaGh = { estado: 'esperando', codigo: null, url: URL_DE_DISPOSITIVO };
    let dicho = false;
    const decir = () => {
      if (!dicho) {
        dicho = true;
        listo({ ...info });
      }
    };
    let salida = '';
    let proceso: ChildProcess;
    try {
      proceso = spawn('gh', ['auth', 'login', '--web', '-h', 'github.com', '-p', 'https'], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (e) {
      info.estado = 'fallo';
      info.error = (e as Error).message;
      return decir();
    }
    entrada = { info, proceso };
    proceso.stdin?.end();
    const leer = (b: Buffer) => {
      salida += b.toString();
      const c = codigoDeEntrada(salida);
      if (c && !info.codigo) {
        info.codigo = c.codigo;
        info.url = c.url;
        decir();
      }
    };
    proceso.stdout?.on('data', leer);
    proceso.stderr?.on('data', leer);
    const tope = setTimeout(() => proceso.kill(), TOPE_DE_ENTRADA_MS);
    // Si en 30 segundos gh no dio el código, algo lo detuvo: se corta y se dice
    const sinCodigo = setTimeout(() => {
      if (!info.codigo) {
        info.estado = 'fallo';
        info.error = salida.trim().split(/\r?\n/).pop() || 'gh';
        proceso.kill();
        decir();
      }
    }, 30_000);
    proceso.on('error', (e: NodeJS.ErrnoException) => {
      info.estado = 'fallo';
      info.error = e.code === 'ENOENT' ? 'sin_gh' : e.message;
      decir();
    });
    proceso.on('close', (codigo) => {
      clearTimeout(tope);
      clearTimeout(sinCodigo);
      if (info.estado === 'esperando') info.estado = codigo === 0 ? 'lista' : 'fallo';
      if (info.estado === 'fallo' && !info.error) info.error = salida.trim().split(/\r?\n/).pop() || 'gh';
      decir();
    });
  });
}
