// La cuenta de GitHub de cada proyecto (notas de voz del titular nmvztz14gtit y nmvztzur8tit, 2 de noviembre de 2026: «debe
// confirmar por regla de código que sea la cuenta aprobada para ese proyecto, porque el usuario puede estar utilizando
// diferentes cuentas para diferentes proyectos»). Cada proyecto tiene su cuenta aprobada, por computador
// (estudio.local.json › cuentasGit), y la pone su titular en «Proyecto» › Dónde está. Antes de subir, bajar o publicar se
// compara con el login que dice la API de GitHub para esa sesión, nunca con el nombre que gh guardó: gh recuerda el nombre
// con que se entró (una cuenta renombrada sigue con el de antes), y la sesión del navegador es otro almacén, que gh no ve.
// La comparación es pura; lo que corre gh va aparte, con su orden inyectable en las pruebas.
import { execFile, spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { esCuentaGitHub } from './cuentaDetectada.ts';

// Lo puro de la cuenta sugerida vive aparte, sin node, para que lo use la página (pd_diagnostico_llena)
export { cuentaDetectada, duenoDelRemoto, esCuentaGitHub, type CuentaDetectada } from './cuentaDetectada.ts';

export type MotivoCuenta = 'sin_cuenta' | 'sin_sesion' | 'no_coincide' | 'en_duda';

export type ResultadoCuenta =
  | { ok: true; aprobada: string; login: string }
  | { ok: false; motivo: MotivoCuenta; aprobada: string | null; login: string | null };

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
export function respuestaDelGancho(entrada: string, aprobada: string | undefined, leerLogin: () => string | null, turno?: () => 'tomado' | 'ocupado'): string {
  let orden: unknown;
  try {
    orden = JSON.parse(entrada)?.tool_input?.command;
  } catch {
    return '';
  }
  if (!esOrdenDeRedGit(orden)) return '';
  const negar = (porque: string) => JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: porque } });
  // Sin la llave de su cuenta, la revisión va por turnos (pd_semaforo_gh; nmwnofvsztit): si otra tuvo el turno más de cinco
  // minutos, se salta solo este paso de red
  if (turno && aprobada?.trim() && turno() === 'ocupado') return negar(RAZON_TURNO_OCUPADO);
  const r = compararCuenta(aprobada, leerLogin());
  if (r.ok) return '';
  return negar(razonParaElDirector(r));
}

/** Lo que se le dice al director cuando otra revisión tuvo el turno de gh más de cinco minutos (nmwnofvsztit). */
export const RAZON_TURNO_OCUPADO = 'GitHub account turn: another review held the gh turn on this computer for more than five minutes, so this network step is skipped. Skip only this step, do the rest, and say in your answer and message which step was skipped: it stays ready for the next review.';

/** Lo que se le dice al director (en inglés, como todo lo que lee el modelo). */
function razonParaElDirector(r: ResultadoCuenta): string {
  const quien = r.ok ? r.login : (r.login ?? 'unknown');
  const aprobada = r.aprobada ?? 'none';
  return `GitHub account check: the account approved for this project is ${aprobada} and GitHub reports ${quien}, so git network operations are denied. The Studio gives each review the key of its project's approved account; this review has none, because gh on this computer has no session of that account saved. Do not work around it: do the rest, and say in your answer and message what could not be done and that the person has to sign in with that account (in the Studio, «Proyecto» › «Dónde está» › «Entrar con otra cuenta»).`;
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
 * Las variables con que una revisión va a GitHub con la llave de su cuenta (pd_semaforo_gh; nmwn130sjtit, nmwo0dx41tit): gh
 * usa GH_TOKEN antes que cualquier sesión guardada, y git, para github.com, pasa a pedirle la credencial a gh (la lista de
 * ayudantes se vacía y queda solo `gh auth git-credential`, como hace gh auth setup-git), con lo que push y pull también van
 * con esa cuenta. Solo para el proceso de esa revisión: la sesión activa de gh del computador no se toca. Pura.
 */
export function entornoConLlave(token: string): Record<string, string> {
  return {
    GH_TOKEN: token,
    GITHUB_TOKEN: token,
    GIT_CONFIG_COUNT: '2',
    GIT_CONFIG_KEY_0: 'credential.https://github.com.helper',
    GIT_CONFIG_VALUE_0: '',
    GIT_CONFIG_KEY_1: 'credential.https://github.com.helper',
    GIT_CONFIG_VALUE_1: '!gh auth git-credential',
  };
}

/** Lo que el lanzador le da a una revisión para ir a GitHub. */
export interface LlaveDeRevision {
  /** La comparación con lo que dice GitHub para esa llave; null si el proyecto no va a GitHub. */
  resultado: ResultadoCuenta | null;
  /** Las variables de la llave (entornoConLlave), o ninguna. */
  entorno: Record<string, string>;
  /** Sin llave, pero gh tiene guardada la cuenta: va por turnos (el gancho, con su espera de cinco minutos). */
  porTurnos: boolean;
}

/** Con qué se corre gh sin detener el servidor. Las pruebas pasan la suya. */
export type CorrerGhSinEsperar = (args: string[], token?: string) => Promise<{ status: number | null; stdout: string }>;

const correrGhSinEsperar: CorrerGhSinEsperar = async (args, token) => {
  const r = await ghSinEsperar(args, token);
  return { status: r.ok ? 0 : 1, stdout: r.ok || args[1] === 'status' ? `${r.stdout}\n${r.stderr}` : r.stdout };
};

/**
 * La llave de cada revisión, al lanzarla (pd_semaforo_gh): el token de la cuenta aprobada del proyecto, pedido con
 * `gh auth token --user` (sesionAprobada, activa o no), con el login que GitHub dice para ese token. Así dos revisiones de
 * proyectos con cuentas distintas corren a la vez, cada una con la suya, sin cambiar la sesión activa de gh. Sin token: si gh
 * no tiene guardada la cuenta, las órdenes de red se niegan con su porqué; si la tiene y el token no salió (un gh viejo, un
 * fallo de gh), va por turnos. `remotos`: la salida de git remote -v del repositorio.
 */
export async function llaveAlLanzar(aprobada: string | undefined, remotos: string, correr: CorrerGhSinEsperar = correrGhSinEsperar): Promise<LlaveDeRevision> {
  if (noUsaGitHub(remotos)) return { resultado: null, entorno: {}, porTurnos: false };
  const cuenta = aprobada?.trim() || null;
  if (!cuenta) return { resultado: compararCuenta(null, null), entorno: {}, porTurnos: false };
  const t = await correr(['auth', 'token', '-h', 'github.com', '--user', cuenta]);
  const token = t.status === 0 ? t.stdout.trim() : '';
  const u = token ? await correr(['api', 'user', '--jq', '.login'], token) : null;
  const resultado = compararCuenta(cuenta, u?.status === 0 ? u.stdout.trim() : null, cuenta);
  if (resultado.ok) return { resultado, entorno: entornoConLlave(token), porTurnos: false };
  // Sin token: ¿la tiene gh guardada? Entonces no es que falte la cuenta, sino la llave
  if (!token) {
    const estado = await correr(['auth', 'status']);
    if (sesionesEnGh(estado.stdout).some((s) => igual(s.nombre, cuenta))) return { resultado: { ok: true, aprobada: cuenta, login: cuenta }, entorno: {}, porTurnos: true };
  }
  return { resultado, entorno: {}, porTurnos: false };
}

/** La salida de git remote -v de un repositorio, sin detener el servidor ('' si falla). */
export function remotosDe(repositorio: string): Promise<string> {
  return new Promise((listo) => execFile('git', ['remote', '-v'], { cwd: repositorio, encoding: 'utf8', timeout: 20_000 }, (e, salida) => listo(e ? '' : salida)));
}

/** El turno de gh de este computador: qué cuenta lo tiene y hasta cuándo (ISO). */
export interface TurnoDeGh { cuenta: string; hasta: string }

/** Cuánto dura un turno tomado: lo que tarda un push o un pull, con margen. Después vence solo. */
export const TURNO_GH_MS = 2 * 60_000;
/** Cuánto espera una revisión su turno antes de saltarse ese paso de red (decisión nmwnofvsztit). */
export const ESPERA_TURNO_GH_MS = 5 * 60_000;

/**
 * Si una revisión toma el turno de gh (el respaldo de pd_semaforo_gh, cuando no tiene llave): libre, vencido o de su misma
 * cuenta, lo toma (o lo alarga) hasta TURNO_GH_MS desde `ahora`; de otra cuenta y vigente, espera. Pura.
 */
export function tomarTurnoDeGh(actual: TurnoDeGh | null, cuenta: string, ahora: number): { toma: true; turno: TurnoDeGh } | { toma: false } {
  if (actual && !igual(actual.cuenta, cuenta) && Date.parse(actual.hasta) > ahora) return { toma: false };
  return { toma: true, turno: { cuenta, hasta: new Date(ahora + TURNO_GH_MS).toISOString() } };
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
    // En Windows, si gh deja vivo algo que tiene su salida abierta, execFile no llama nunca aunque venza su tope: el panel
    // de las sesiones se quedaba en «Preguntándole a GitHub…» (nmwo0dx41tit). Pasado el tope y un margen, se da por fallado
    const tope = setTimeout(() => listo({ ok: false, stdout: '', stderr: '', falta: false }), 25_000);
    execFile('gh', args, { encoding: 'utf8', timeout: 20_000, windowsHide: true, env: token ? { ...process.env, GH_TOKEN: token } : process.env }, (e, stdout, stderr) => {
      clearTimeout(tope);
      listo({ ok: !e, stdout: stdout ?? '', stderr: stderr ?? '', falta: (e as NodeJS.ErrnoException | null)?.code === 'ENOENT' });
    });
  });
}

/**
 * ¿El repositorio es privado en GitHub, según la sesión aprobada del proyecto? true/false, o null si no se pudo saber (sin
 * cuenta aprobada, sin esa sesión en gh, o GitHub no respondió). Lo usa el respaldo cuando la pregunta sin credenciales no
 * alcanza: a un repositorio privado que la persona entregó, la API anónima responde 404, pero a veces la limita o no hay red,
 * y entonces se confirma con la sesión aprobada, que sí lo ve (nmwfnnjb7tit). Nunca saca ni usa otra sesión que la aprobada.
 */
export async function repoPrivadoConGh(repo: string, aprobada: string | null | undefined): Promise<boolean | null> {
  const cuenta = aprobada?.trim();
  if (!cuenta) return null;
  const t = await ghSinEsperar(['auth', 'token', '-h', 'github.com', '--user', cuenta]);
  const token = t.ok ? t.stdout.trim() : '';
  if (!token) return null;
  const r = await ghSinEsperar(['api', `repos/${repo}`, '--jq', '.private'], token);
  if (!r.ok) return null;
  const s = r.stdout.trim();
  return s === 'true' ? true : s === 'false' ? false : null;
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

/**
 * Qué hacer con la sesión activa de gh al entrar a un proyecto (nota de voz del titular nmw9xvydetit): la cuenta aprobada es
 * de cada proyecto, y la activa de gh la sigue. Sin cuenta aprobada, nada; si gh ya tiene activa la de ese nombre, nada;
 * si la tiene guardada, cambiar a ella; si no la tiene, avisar, sin tocar nada. Se compara por el nombre que guardó gh, que
 * es el usuario de GitHub con que se entró (sin pedirle a GitHub nada ni sacar un token). Pura.
 */
export type SesionDelProyecto =
  | { que: 'sin_cuenta' }
  | { que: 'ya_activa'; nombre: string }
  | { que: 'cambiar'; nombre: string; orden: string[] }
  | { que: 'no_guardada'; aprobada: string };
export function sesionDelProyecto(aprobada: string | null | undefined, sesiones: readonly SesionEnGh[]): SesionDelProyecto {
  const a = aprobada?.trim();
  if (!a || !esCuentaGitHub(a)) return { que: 'sin_cuenta' };
  const suya = sesiones.find((s) => igual(a, s.nombre));
  if (!suya) return { que: 'no_guardada', aprobada: a };
  if (suya.activa) return { que: 'ya_activa', nombre: suya.nombre };
  const orden = ordenDeCambio(suya.nombre, [...sesiones]);
  return orden ? { que: 'cambiar', nombre: suya.nombre, orden } : { que: 'no_guardada', aprobada: a };
}

/**
 * La cuenta que «Usar esta» deja aprobada para el proyecto, o null (nota nmwagmiditit): en IDG el titular oprimió «Usar
 * esta» con su cuenta y nunca «Guardar la cuenta»; sin cuenta aprobada, al volver de otro proyecto la sesión activa era la de
 * ese otro y el campo la mostraba como detectada. Por eso, si el proyecto aún no tiene cuenta aprobada, la sesión que se
 * elige en su panel queda como la suya; si ya tiene una, no se cambia sin «Guardar la cuenta» (es la que guarda lo que sube).
 * El nombre que guardó gh es el usuario de GitHub con que se entró. Pura.
 */
export function cuentaQueApruebaUsar(aprobada: string | null | undefined, nombre: unknown): string | null {
  return !aprobada?.trim() && esCuentaGitHub(nombre) ? nombre : null;
}

/**
 * Lo que pasó al seguir la cuenta del proyecto: lo decidido y, si se cambió, si gh lo hizo. Sin gh, `sin_gh`. Si gh no
 * respondió a tiempo (o no dijo ninguna sesión y terminó mal), `sin_respuesta`: no se sabe, y no se avisa nada.
 */
export type SeguimientoDeCuenta = SesionDelProyecto | { que: 'cambiada'; nombre: string } | { que: 'fallo'; nombre: string; error: string } | { que: 'sin_gh' } | { que: 'sin_respuesta' };

/**
 * Seguir la cuenta del proyecto al entrar a `id`. Las revisiones ya no la necesitan activa: cada una va a GitHub con la llave
 * de su cuenta (llaveAlLanzar; pd_semaforo_gh), así que la sesión activa de gh sigue solo al proyecto abierto en el Studio.
 * `seguir` es seguirCuentaDelProyecto (aparte, para probarlo).
 */
export async function seguirCuentaAlEntrar(id: string, cuentas: Readonly<Record<string, string>> | undefined, seguir: (aprobada: string | undefined) => Promise<SeguimientoDeCuenta> = seguirCuentaDelProyecto): Promise<SeguimientoDeCuenta> {
  return seguir(cuentas?.[id]?.trim());
}

/**
 * Lo que dice gh auth status, leído (nota nmwo0dx41tit, 19 de noviembre de 2026: el aviso de «la cuenta no es la del
 * proyecto» con ARGWABOT guardada y activa). Si gh tardó más que su tope o terminó mal sin nombrar ninguna sesión, su salida
 * viene vacía: eso no es «gh no la tiene guardada», es que no respondió (`sin_respuesta`). Pura.
 */
export function seguimientoDeEstado(aprobada: string | null | undefined, estado: { ok: boolean; stdout: string; stderr: string; falta: boolean }): SesionDelProyecto | { que: 'sin_gh' } | { que: 'sin_respuesta' } {
  if (sesionDelProyecto(aprobada, []).que === 'sin_cuenta') return { que: 'sin_cuenta' };
  if (estado.falta) return { que: 'sin_gh' };
  const sesiones = sesionesEnGh(`${estado.stdout}\n${estado.stderr}`);
  if (!sesiones.length && !estado.ok) return { que: 'sin_respuesta' };
  return sesionDelProyecto(aprobada, sesiones);
}

// ── El vigía de la cuenta de gh (nota nmwo0dx41tit, 19 de noviembre de 2026: «un monitor o un vigilante que le permita
// constantemente saber cuál es la cuenta de GitHub realmente configurada en ese momento y activa en el equipo y que si cambia
// notificarlo automáticamente»). El servidor lee cada minuto la sesión activa de gh y la compara con la lectura anterior.

/** Una lectura del vigía: la sesión activa de gh (null si gh no respondió), y el proyecto activo con su cuenta aprobada. */
export interface LecturaDeGh { activa: string | null; proyecto: string | null; aprobada: string | null }

/** Lo que el vigía le dice a la persona: que la sesión activa cambió, o que no es la del proyecto. */
export type AvisoDelVigia =
  | { que: 'cambio'; antes: string; ahora: string; aprobada: string | null; coincide: boolean }
  | { que: 'distinta'; ahora: string; aprobada: string };

/**
 * El vigía: compara la lectura anterior con la de ahora y da un aviso solo si la sesión activa cambió, o si en la primera
 * lectura de un proyecto no es su cuenta aprobada. Una diferencia que sigue igual no se repite, y si gh no respondió no se
 * dice nada (eso daba el aviso falso). Pura.
 */
export function vigiaDeCuentaGh(antes: LecturaDeGh | null, ahora: LecturaDeGh): AvisoDelVigia | null {
  if (!ahora.activa) return null;
  const coincide = !ahora.aprobada || igual(ahora.aprobada, ahora.activa);
  if (antes?.activa && !igual(antes.activa, ahora.activa)) return { que: 'cambio', antes: antes.activa, ahora: ahora.activa, aprobada: ahora.aprobada, coincide };
  if (coincide || !ahora.aprobada) return null;
  const yaDicha = !!antes?.activa && antes.proyecto === ahora.proyecto && !!antes.aprobada && igual(antes.aprobada, ahora.aprobada);
  return yaDicha ? null : { que: 'distinta', ahora: ahora.activa, aprobada: ahora.aprobada };
}

/** La sesión activa de gh en este computador, por el nombre con que gh la guardó (sin red ni tokens); null si no respondió. */
export async function sesionActivaDeGh(): Promise<string | null> {
  const estado = await ghSinEsperar(['auth', 'status']);
  return sesionesEnGh(`${estado.stdout}\n${estado.stderr}`).find((s) => s.activa)?.nombre ?? null;
}

/**
 * Deja activa en gh la sesión de la cuenta aprobada del proyecto, si gh la tiene guardada (al cambiar de proyecto y al cargar
 * el Studio). Solo corre gh auth status y, si toca, gh auth switch: ningún token sale de aquí.
 */
export async function seguirCuentaDelProyecto(aprobada: string | null | undefined): Promise<SeguimientoDeCuenta> {
  if (sesionDelProyecto(aprobada, []).que === 'sin_cuenta') return { que: 'sin_cuenta' };
  const decision = seguimientoDeEstado(aprobada, await ghSinEsperar(['auth', 'status']));
  if (decision.que !== 'cambiar') return decision;
  const r = await ghSinEsperar(decision.orden);
  return r.ok ? { que: 'cambiada', nombre: decision.nombre } : { que: 'fallo', nombre: decision.nombre, error: (r.stderr || r.stdout).trim().split(/\r?\n/).pop() || 'gh' };
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
