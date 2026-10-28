// Lo que se le negó al director, para que el titular lo autorice con una casilla (nota de voz del titular nmvotdn3ftit,
// 26 de octubre de 2026: «No quiero volver a que el director falle por permisos»; pedido pd_panel_permisos y propuesta
// aceptada «Los permisos, al momento»). Puro: sin archivos. De cada registro de revisión sale cada negado con lo que
// intentó; cada uno se vuelve la regla general de ese tipo de acción (todas las órdenes de ese programa, la carpeta que
// quiso leer o escribir), no la línea exacta, para que el titular no tenga que autorizar línea por línea (nota de voz
// nmvovewkqtit, 26 de octubre de 2026), o se dice por qué no se puede. Lo que el Studio le niega siempre (revisor.ts ›
// negado) sale como «nunca», sin casilla, y no se autoriza ni aunque llegue por la API.
import { usoNegado } from '../../src/director/director.ts';
import type { PermisoAutorizado } from '../../src/director/proyectos.ts';

export type { PermisoAutorizado };

/**
 * Una ruta en la forma de las reglas de permisos de Claude Code: «//ruta» es absoluta, y en Windows Claude Code compara
 * las rutas en forma POSIX (C:\repos\x es //c/repos/x).
 */
export const reglaDeRuta = (ruta: string) =>
  '//' + ruta.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, unidad: string) => '/' + unidad.toLowerCase()).replace(/^\/+|\/+$/g, '');

/** Una herramienta que se le negó al director y lo que intentó con ella (su entrada, tal cual la registró Claude Code). */
export interface Negado {
  herramienta: string;
  entrada: Record<string, unknown>;
}

/** Lo que tiene toda línea de un registro que trae un negado: el aviso en vivo (permission_denied) o el resultado (permission_denials). */
export const NEGACION = '"permission_deni';

/**
 * Los negados de un registro de revisión (stream-json), con su entrada: los del resultado final (`permission_denials`) y
 * los que se avisaron en vivo (`permission_denied`, con la entrada de su uso, por el id), sin repetir y en orden.
 */
export function negadosDe(registro: string): Negado[] {
  const usos = new Map<string, Negado>();
  const vistos = new Map<string, Negado>();
  const sumar = (n: Negado) => {
    const clave = `${n.herramienta}\u0000${JSON.stringify(n.entrada)}`;
    if (!vistos.has(clave)) vistos.set(clave, n);
  };
  for (const linea of registro.split('\n')) {
    if (!linea.startsWith('{') || (!linea.includes('"tool_use"') && !linea.includes(NEGACION))) continue;
    let ev: any;
    try {
      ev = JSON.parse(linea);
    } catch {
      continue;
    }
    if (ev?.type === 'assistant' && Array.isArray(ev.message?.content))
      for (const b of ev.message.content)
        if (b?.type === 'tool_use' && b.id) usos.set(String(b.id), { herramienta: String(b.name ?? ''), entrada: b.input && typeof b.input === 'object' ? b.input : {} });
    if (ev?.type === 'system' && ev.subtype === 'permission_denied') {
      const uso = usos.get(String(ev.tool_use_id));
      // La línea que deja el Studio de lo que negó su gancho (permisoAlMomento.ts › lineasDeNegadosSinDecidir) trae la entrada
      sumar(uso ?? { herramienta: String(ev.tool_name ?? ''), entrada: ev.tool_input && typeof ev.tool_input === 'object' ? ev.tool_input : {} });
    }
    if (ev?.type === 'result' && Array.isArray(ev.permission_denials))
      for (const x of ev.permission_denials)
        sumar({ herramienta: String(x?.tool_name ?? ''), entrada: x?.tool_input && typeof x.tool_input === 'object' ? x.tool_input : usos.get(String(x?.tool_use_id))?.entrada ?? {} });
  }
  // Un negado en vivo sin entrada y el mismo del resultado con ella: queda el que la trae
  const todos = [...vistos.values()];
  return todos.filter((n) => Object.keys(n.entrada).length || !todos.some((m) => m !== n && m.herramienta === n.herramienta && Object.keys(m.entrada).length));
}

const absoluta = (r: string) => /^[A-Za-z]:[\\/]/.test(r) || /^[\\/]/.test(r);
const carpetaDe = (r: string) => r.replace(/[\\/]+$/, '').replace(/[\\/][^\\/]*$/, '') || r;
/** Lo fijo de un patrón de búsqueda (hasta el primer comodín), como carpeta: C:\x\**\*.ts es C:\x. */
const fijoDe = (patron: string) => {
  const i = patron.search(/[*?[{]/);
  return i < 0 ? patron : carpetaDe(patron.slice(0, i) + 'x');
};
const corto = (t: string, n = 160) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

/**
 * Las órdenes de una cadena, cada una sola: «cd x && wc -l y» son «cd x» y «wc -l y» (lo que va entre comillas no
 * corta). Con redirecciones o sustituciones, null: no se separan sin cambiar lo que hacen.
 */
export function ordenesDe(orden: string): string[] | null {
  const plano = orden.replace(/"[^"]*"|'[^']*'/g, (m) => '\u0000'.repeat(m.length));
  if (/[<>`]|\$\(/.test(plano)) return null;
  const partes: string[] = [];
  let desde = 0;
  for (const m of plano.matchAll(/&&|\|\||[;|&\n]/g)) {
    partes.push(orden.slice(desde, m.index));
    desde = m.index + m[0].length;
  }
  partes.push(orden.slice(desde));
  return partes.map((s) => s.trim()).filter(Boolean);
}

/** Las palabras de una orden, con sus comillas: «node "C:\a b\x.ts" --y» son node, "C:\a b\x.ts" y --y. */
const palabras = (orden: string) => orden.match(/(?:"[^"]*"|'[^']*'|[^\s"']+)+/g) ?? [];
/** Los programas cuyo tipo de acción es su suborden: git log, npm run, gh pr. */
const CON_SUBORDEN = new Set(['git', 'npm', 'pnpm', 'yarn', 'bun', 'cargo', 'docker', 'pip', 'pip3', 'gh', 'winget', 'dotnet', 'go', 'composer']);
/** Los que corren otro programa: su tipo de acción es ese programa (node tools/x.ts, npx vitest, python -m). */
const INTERPRETES = new Set(['node', 'python', 'python3', 'py', 'deno', 'tsx', 'npx', 'bash', 'sh', 'pwsh', 'powershell']);
const BORRA = new Set(['rm', 'rmdir', 'del', 'mv', 'remove-item', 'move-item']);
const RED = new Set(['curl', 'wget', 'invoke-webrequest', 'invoke-restmethod', 'ssh', 'scp']);
// Subir y publicar: permisos del panel como cualquiera, con su riesgo dicho (decisión del titular del 26 de octubre de 2026)
const SUBE = /^(git push|npm publish|gh release)$/i;

/**
 * El tipo de acción de una orden sola, que es lo que se autoriza: el programa (curl), con su suborden (git log) o con el
 * programa que corre (node tools/x.ts). Sin tipo, por qué: git con una opción antes de la orden (git -C) no se acota.
 */
function tipoDeOrden(orden: string): { prefijo: string; programa: string } | { motivo: string } {
  const [primera, siguiente] = palabras(orden.trim());
  if (!primera) return { motivo: 'No se sabe qué orden intentó.' };
  const programa = primera.replace(/^.*[\\/]/, '').replace(/\.(exe|cmd|bat)$/i, '').toLowerCase();
  if (!siguiente || (!CON_SUBORDEN.has(programa) && !INTERPRETES.has(programa))) return { prefijo: primera, programa };
  if (CON_SUBORDEN.has(programa) && siguiente.startsWith('-'))
    return { motivo: `«${primera}» con una opción antes de la orden (como git -C) no se puede acotar a un tipo de acción: dejaría pasar también subir o reescribir la historia. El director da cd a la carpeta y luego la orden.` };
  return { prefijo: `${primera} ${siguiente}`, programa };
}

/** Lo que se dice de un negado cuya regla general ya tiene: se le negó por otra cosa de esa orden. */
const YA_PERMITIDA = 'Ya tiene permitido ese tipo de acción: se le negó por algo de esa orden en particular (un comodín, unas comillas o una carpeta fuera de las suyas). El director la escribe de otra forma.';

/** La regla que dejaría hacer lo negado, dicha en palabras, con lo que puede pasar al darla; o por qué no hay regla. */
export interface ReglaPropuesta {
  regla: string | null;
  que: string;
  riesgo: string;
  /** Por qué no se puede autorizar tal cual, si no hay regla. */
  motivo?: string;
}

/** Si la carpeta es toda una unidad, la raíz o tu carpeta personal: se dice antes de darla. */
function amplia(regla: string, casa: string) {
  const partes = regla.slice(2).split('/').filter(Boolean);
  return partes.length <= 1 || regla.toLowerCase() === reglaDeRuta(casa).toLowerCase() || (partes.length <= 2 && /^(users|home)$/i.test(partes.at(-2) ?? partes[0]));
}

/**
 * La regla general del tipo de acción que se le negó (nota de voz del titular nmvovewkqtit): toda orden de ese programa
 * (Bash(curl:*), Bash(git log:*), Bash(node tools/x.ts:*)), la carpeta que leyó o buscó, la carpeta donde quiso escribir,
 * o la herramienta. Sin regla: varias órdenes juntas (permisosNegados las separa), una redirección o una ruta que no se sabe.
 */
export function reglaDe(n: Negado, casa: string): ReglaPropuesta {
  const h = n.herramienta;
  const e = n.entrada;
  if (h === 'Bash') {
    const orden = String(e.command ?? '').trim();
    if (!orden) return { regla: null, que: 'Correr una orden que no quedó en el registro', riesgo: '', motivo: 'No se sabe qué orden intentó.' };
    const partes = ordenesDe(orden);
    if (!partes) return { regla: null, que: `Correr esta orden con una redirección o una sustitución: ${corto(orden)}`, riesgo: '', motivo: 'Lleva una redirección (>, <) o una sustitución ($( ) o comillas invertidas): eso no se autoriza; el director corre la orden sola.' };
    if (partes.length > 1) return { regla: null, que: `Correr estas órdenes juntas: ${corto(orden)}`, riesgo: '', motivo: 'Son varias órdenes encadenadas: cada una se autoriza sola, por su tipo, y el director las corre una por una.' };
    const tipo = tipoDeOrden(orden);
    if ('motivo' in tipo) return { regla: null, que: `Correr esta orden: ${corto(orden)}`, riesgo: '', motivo: tipo.motivo };
    const peligro = SUBE.test(tipo.prefijo)
      ? ' Es subir o publicar: lo que suba quedará a la vista en el remoto del proyecto, y con este permiso subir es algo que pediste. Lo hará solo si las normas del proyecto lo dejan.'
      : BORRA.has(tipo.programa)
      ? ' Esa orden mueve o borra archivos: lo podrá hacer donde sus permisos lo dejen escribir.'
      : RED.has(tipo.programa)
        ? ' Esa orden se conecta a otros equipos, también al Studio de tu computador: podrá bajar o enviar datos, y pedirle al Studio lo que sus botones hacen.'
        : INTERPRETES.has(tipo.programa)
          ? ' Es correr ese programa con lo que le pase: podrá hacer lo que ese programa haga.'
          : '';
    return {
      regla: `Bash(${tipo.prefijo}:*)`,
      que: `Correr las órdenes «${corto(tipo.prefijo, 120)} …», con las opciones y los archivos que necesite`,
      riesgo: `Toda orden que empiece así, en cada revisión, sin pedirte línea por línea.${peligro} Lo que nunca hace (reescribir la historia, también la ya subida, o borrar sin tus dos pasos) se le sigue negando.`,
    };
  }
  if (h === 'Read' || h === 'Glob' || h === 'Grep' || h === 'LS') {
    const donde = h === 'Read' ? (typeof e.file_path === 'string' ? carpetaDe(e.file_path) : '') : typeof e.path === 'string' ? e.path : h === 'Glob' && typeof e.pattern === 'string' ? fijoDe(e.pattern) : '';
    if (!donde || !absoluta(donde)) return { regla: null, que: `${h === 'Read' ? 'Leer' : 'Buscar'} sin decir en qué carpeta`, riesgo: '', motivo: 'No dijo en qué carpeta (o usó una ruta relativa): lo que está en sus carpetas de trabajo ya lo puede leer.' };
    const regla = reglaDeRuta(donde);
    return {
      regla: `Read(${regla}/**)`,
      que: `Leer y buscar en la carpeta ${donde} y en todo lo que tiene dentro, sin cambiar nada`,
      riesgo: amplia(regla, casa)
        ? 'Es toda una unidad o tu carpeta personal: podrá leer casi todo lo tuyo en cada revisión (nunca un .env ni tus ajustes de Claude Code).'
        : 'Podrá leer todo lo de esa carpeta en cada revisión, sin cambiar nada (nunca un .env ni tus ajustes de Claude Code).',
    };
  }
  if (h === 'Edit' || h === 'Write' || h === 'MultiEdit' || h === 'NotebookEdit') {
    const archivo = String(e.file_path ?? e.notebook_path ?? '');
    if (!absoluta(archivo)) return { regla: null, que: 'Escribir un archivo sin ruta completa', riesgo: '', motivo: 'No se sabe qué archivo quería escribir.' };
    const carpeta = carpetaDe(archivo);
    const regla = reglaDeRuta(carpeta);
    return {
      regla: `Edit(${regla}/**)`,
      que: `Escribir en la carpeta ${carpeta} y en todo lo que tiene dentro`,
      riesgo: `${amplia(regla, casa) ? 'Es toda una unidad o tu carpeta personal: podrá crear o cambiar casi cualquier archivo tuyo en cada revisión.' : 'Podrá crear o cambiar los archivos de esa carpeta en cada revisión.'} Si está en un repositorio, git guarda lo de antes; un .env, sus permisos y tu configuración del Studio se le siguen negando.`,
    };
  }
  if (/^[A-Za-z][\w-]*$/.test(h)) return { regla: h, que: `Usar la herramienta ${h} de Claude Code`, riesgo: 'Podrá usarla en cada revisión, para todo lo que esa herramienta hace.' };
  return { regla: null, que: 'Usar una herramienta sin nombre', riesgo: '', motivo: 'El registro no dice qué herramienta era.' };
}

/** Lo que el Studio le niega siempre al director: por qué, y lo que harías tú en su lugar. */
export interface Nunca {
  porque: string;
  enSuLugar: string;
}

/** Lo que nunca, además de lo que niega el lanzador de cada proyecto: tus llaves y, en cualquier carpeta, lo propio del Studio. */
export const NUNCA_SIEMPRE = [
  'Read(~/.ssh/**)', 'Read(~/.aws/**)', 'Read(~/.gnupg/**)', 'Read(//**/.claude/.credentials.json)',
  'Edit(//**/.claude/settings*.json)', 'Edit(//**/estudio.local.json)', 'Edit(//**/.revisiones/**)', 'Edit(//**/.env)', 'Edit(//**/.env.*)',
];

const escapar = (t: string) => t.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
const patronDeRuta = (glob: string, casa: string) => {
  const g = glob.startsWith('~/') ? reglaDeRuta(casa) + glob.slice(1) : glob;
  return new RegExp(`^${g.split(/(\*\*|\*)/).map((p) => (p === '**' ? '.*' : p === '*' ? '[^/]*' : escapar(p))).join('')}$`, 'i');
};
const patronDeOrden = (p: string) => new RegExp(`^${p.endsWith(':*') ? `${escapar(p.slice(0, -2))}.*` : p.split('*').map(escapar).join('.*')}$`, 's');
const partir = (regla: string) => {
  const m = /^([A-Za-z_][\w-]*)(?:\(([\s\S]*)\))?$/.exec(regla);
  return m ? { herramienta: m[1], contenido: m[2] } : null;
};

/** Si una orden sola cae en alguna de las reglas de órdenes que el director ya tiene (`permitidas`: Bash(git log:*), Bash(npm test)…). */
export function ordenPermitida(orden: string, permitidas: readonly string[]): boolean {
  return permitidas.some((r) => {
    const x = partir(r);
    return x?.herramienta === 'Bash' && x.contenido !== undefined && patronDeOrden(x.contenido).test(orden.trim());
  });
}

/**
 * Si una ruta cae en alguna de las reglas de carpetas que el director ya tiene: para leer o buscar, una regla Read o Edit
 * (escribir en una carpeta deja leerla); para escribir, una Edit. La ruta misma o lo de dentro, como en lo que nunca.
 */
export function rutaPermitida(escribe: boolean, ruta: string, permitidas: readonly string[], casa: string): boolean {
  if (!absoluta(ruta)) return false;
  const objetivo = reglaDeRuta(ruta);
  return permitidas.some((r) => {
    const x = partir(r);
    if (!x || x.contenido === undefined || !(x.herramienta === 'Edit' || (!escribe && x.herramienta === 'Read'))) return false;
    const patron = patronDeRuta(x.contenido, casa);
    return patron.test(objetivo) || patron.test(`${objetivo}/`);
  });
}

function porQueNunca(regla: string): Nunca {
  if (/git push/.test(regla))
    return { porque: 'Forzar una subida o borrar una rama del remoto reescribe la historia ya subida y puede perder trabajo: el director nunca lo hace (subir sin forzar sí es un permiso del panel, con su casilla).', enSuLugar: 'Si de verdad hace falta, hazlo tú en tu terminal, con una rama de respaldo antes.' };
  if (/rebase|reset|filter|amend/.test(regla))
    return { porque: 'Reescribir la historia de git puede perder trabajo: el director nunca lo hace.', enSuLugar: 'Si de verdad hace falta, hazlo tú en tu terminal, con una rama de respaldo antes.' };
  if (/^Bash\(git (branch|mv|rm)/.test(regla))
    return { porque: 'Renombrar o borrar ramas, o forzar un movimiento o un borrado, puede perder trabajo: el director nunca lo hace.', enSuLugar: 'Hazlo tú en tu terminal si hace falta; el director crea ramas de respaldo y borra solo con tus dos pasos.' };
  if (regla.startsWith('Read('))
    return { porque: 'Ahí van tus claves, tus llaves o tus ajustes de Claude Code: el director nunca los lee.', enSuLugar: 'Si necesita un dato de ahí, escríbeselo tú en una nota, sin las claves.' };
  if (regla.startsWith('Edit('))
    return { porque: 'Son sus propios permisos, tu configuración del Studio, sus registros, la carpeta .git o un .env: el director nunca los cambia.', enSuLugar: 'Eso se cambia desde los botones del Studio, o lo cambias tú.' };
  if (!regla.includes('('))
    return { porque: 'El director no programa esperas: el Studio lo despierta solo cuando termina lo que lanzó.', enSuLugar: 'Nada: no le hace falta.' };
  return { porque: 'Es de lo que el Studio le niega siempre al director.', enSuLugar: 'Si lo necesitas, hazlo tú.' };
}

/** La regla de lo que nunca que le cierra el paso a eso, o null. Mira lo que intentó de verdad, no la regla que se propone. */
function prohibidaPor(herramienta: string, objetivo: string, prohibidas: string[], casa: string): string | null {
  for (const p of [...prohibidas, ...NUNCA_SIEMPRE]) {
    const x = partir(p);
    if (!x) continue;
    if (x.contenido === undefined) {
      if (x.herramienta === herramienta) return p;
      continue;
    }
    if (herramienta === 'Bash' && x.herramienta === 'Bash') {
      // Cada orden de una cadena cuenta: «cd x && git push --force» también es forzar la subida
      const partes = objetivo.split(/&&|\|\||[;|\n]/).map((s) => s.trim()).filter(Boolean);
      if (partes.some((s) => patronDeOrden(x.contenido!).test(s))) return p;
    }
    const lee = herramienta === 'Read' || herramienta === 'Glob' || herramienta === 'Grep' || herramienta === 'LS';
    const escribe = herramienta === 'Edit' || herramienta === 'Write' || herramienta === 'MultiEdit' || herramienta === 'NotebookEdit';
    // La ruta misma o, si es una carpeta, lo de dentro (~/.ssh es tan prohibida como ~/.ssh/**)
    const patron = patronDeRuta(x.contenido, casa);
    if (((lee && x.herramienta === 'Read') || (escribe && x.herramienta === 'Edit')) && objetivo && (patron.test(reglaDeRuta(objetivo)) || patron.test(`${reglaDeRuta(objetivo)}/`))) return p;
  }
  return null;
}

/** Si lo negado es de lo que nunca (`prohibidas`: lo que niega el lanzador de su proyecto, revisor.ts › negado y SIN_ESPERAS). */
export function nuncaDe(n: Negado, prohibidas: string[], casa: string): Nunca | null {
  const e = n.entrada;
  const objetivo = n.herramienta === 'Bash' ? String(e.command ?? '') : String(e.file_path ?? e.notebook_path ?? e.path ?? (typeof e.pattern === 'string' ? fijoDe(e.pattern) : ''));
  const p = prohibidaPor(n.herramienta, objetivo, prohibidas, casa);
  return p ? porQueNunca(p) : null;
}

/** Si una regla autorizada choca con lo que nunca (por si alguien cambió estudio.local.json a mano): no se le pasa al director. */
export function reglaProhibida(regla: string, prohibidas: string[], casa: string): boolean {
  const x = partir(regla);
  if (!x) return true;
  if (x.contenido === undefined) return !!prohibidaPor(x.herramienta, '', prohibidas, casa);
  const objetivo = x.herramienta === 'Read' ? x.contenido.replace(/\/\*\*$/, '') : x.contenido;
  return !!prohibidaPor(x.herramienta, objetivo, prohibidas, casa);
}

/** Un registro de revisión ya leído: de qué proyecto, cuándo empezó y su nombre en .revisiones. */
export interface RegistroLeido {
  proyecto: string;
  cuando: string;
  registro: string;
  texto: string;
}

/** Un permiso que se le negó al director, listo para el panel: la regla, en palabras, y dónde se le negó por última vez. */
export interface PermisoNegado extends ReglaPropuesta {
  proyecto: string;
  herramienta: string;
  /** Lo que intentó con ese tipo de acción, en líneas cortas: lo más nuevo primero, hasta INTENTOS. */
  intentos: string[];
  nunca?: Nunca;
  /** La última revisión en que se le negó: cuándo empezó y su registro. */
  cuando: string;
  registro: string;
  /** En cuántas revisiones se le negó. */
  veces: number;
  /** Si no se le negó: el Studio lo ofrece porque lo leyó del proyecto (sus pruebas, `pruebasOfrecidas`). */
  ofrecido?: 'pruebas';
}

/** Lo que el Studio lee de la raíz de un proyecto para saber cómo se corren sus pruebas. */
export interface ArchivosDePruebas {
  packageJson?: string;
  composerJson?: string;
  pyproject?: string;
  makefile?: string;
  existe: (nombre: string) => boolean;
}

/**
 * Cómo se corren las pruebas de un proyecto, leído del proyecto mismo (decisión del titular del 26 de octubre de 2026,
 * misión «Decide cómo se aprueban las pruebas de cada proyecto»: «Que la lea y me la ofrezca»): la orden y el tipo de
 * acción que se autoriza. Sin pruebas que se reconozcan, null: el panel no ofrece nada.
 */
export function ordenDePruebas(a: ArchivosDePruebas): { orden: string; prefijo: string } | null {
  const json = (t?: string) => {
    try {
      return t ? JSON.parse(t) : null;
    } catch {
      return null;
    }
  };
  const npm = json(a.packageJson)?.scripts?.test;
  // El que trae npm init de partida no prueba nada: «echo "Error: no test specified" && exit 1»
  if (typeof npm === 'string' && npm.trim() && !/no test specified/i.test(npm)) return { orden: 'npm test', prefijo: 'npm test' };
  if (json(a.composerJson)?.scripts?.test) return { orden: 'composer test', prefijo: 'composer test' };
  if (a.existe('phpunit.xml') || a.existe('phpunit.xml.dist')) return { orden: 'vendor/bin/phpunit', prefijo: 'vendor/bin/phpunit' };
  if (a.existe('pytest.ini') || a.existe('conftest.py') || /\[tool\.pytest/.test(a.pyproject ?? '')) return { orden: 'pytest', prefijo: 'pytest' };
  if (a.existe('Cargo.toml')) return { orden: 'cargo test', prefijo: 'cargo test' };
  if (a.existe('go.mod')) return { orden: 'go test ./...', prefijo: 'go test' };
  if (/^test\s*:/m.test(a.makefile ?? '')) return { orden: 'make test', prefijo: 'make test' };
  return null;
}

/**
 * Las pruebas de un proyecto, ofrecidas en el panel con su casilla antes de que se le nieguen al director: nada corre
 * hasta que el titular las autoriza. No se ofrecen si ya las tiene (`permitidas`) o si ya están entre lo negado.
 */
export function pruebasOfrecidas(proyecto: string, pruebas: { orden: string; prefijo: string } | null, permitidas: string[], negados: PermisoNegado[]): PermisoNegado | null {
  if (!pruebas) return null;
  const regla = `Bash(${pruebas.prefijo}:*)`;
  if (permitidas.includes(regla) || negados.some((n) => n.regla === regla && n.proyecto === proyecto)) return null;
  return {
    regla,
    que: `Correr las pruebas de este proyecto: «${pruebas.orden}», con las opciones y los archivos que necesite`,
    riesgo: 'Podrá correr las pruebas del proyecto en cada revisión, para comprobar lo que cambia en su código. Las pruebas corren el código del proyecto en tu computador, como cuando las corres tú.',
    proyecto,
    herramienta: 'Bash',
    intentos: [],
    cuando: '',
    registro: '',
    veces: 0,
    ofrecido: 'pruebas',
  };
}

/** Cuántos de los intentos de un mismo permiso se muestran. */
const INTENTOS = 3;

/**
 * Lo que se propone autorizar de un negado, con lo negado que lo motiva: una cadena de órdenes se separa, y cada orden
 * pide su tipo de acción, salvo las que ya tiene permitidas (`permitidas`: lo que el lanzador le da siempre). Si ya
 * tiene todo, se dice por qué se le negó.
 */
function propuestasDe(n: Negado, casa: string, permitidas: Set<string>): { n: Negado; p: ReglaPropuesta }[] {
  const orden = n.herramienta === 'Bash' ? String(n.entrada.command ?? '').trim() : '';
  const partes = orden ? ordenesDe(orden) : null;
  if (!partes || partes.length < 2) {
    const p = reglaDe(n, casa);
    return [{ n, p: p.regla && permitidas.has(p.regla) ? { regla: null, que: p.que, riesgo: '', motivo: YA_PERMITIDA } : p }];
  }
  const vistas = new Set<string>();
  const nuevas = partes
    .map((command) => ({ n: { herramienta: 'Bash', entrada: { command } }, p: reglaDe({ herramienta: 'Bash', entrada: { command } }, casa) }))
    .filter(({ p }) => !(p.regla && permitidas.has(p.regla)) && !vistas.has(p.regla ?? p.que) && !!vistas.add(p.regla ?? p.que));
  return nuevas.length
    ? nuevas
    : [{ n, p: { regla: null, que: `Correr estas órdenes juntas: ${corto(orden)}`, riesgo: '', motivo: 'Ya tiene permitida cada una: se le negó por ir encadenadas. El director las corre una por una.' } }];
}

/**
 * Lo negado en esos registros, un permiso por tipo de acción y proyecto (o por intento, si no hay regla), lo más nuevo
 * primero, con lo que intentó con él. `prohibidas` da lo que niega el lanzador de cada proyecto, y `permitidas`, lo que
 * le da siempre (lo que ya tiene no se vuelve a ofrecer).
 */
export function permisosNegados(registros: RegistroLeido[], prohibidas: (proyecto: string) => string[], casa: string, permitidas: (proyecto: string) => string[] = () => []): PermisoNegado[] {
  const porClave = new Map<string, PermisoNegado>();
  const yaTiene = new Map<string, Set<string>>();
  for (const r of [...registros].sort((a, b) => a.cuando.localeCompare(b.cuando))) {
    if (!yaTiene.has(r.proyecto)) yaTiene.set(r.proyecto, new Set(permitidas(r.proyecto)));
    const enEste = new Set<string>();
    for (const negado of negadosDe(r.texto)) {
      const intento = usoNegado(negado.herramienta, negado.entrada);
      for (const { n, p: propuesta } of propuestasDe(negado, casa, yaTiene.get(r.proyecto)!)) {
        const nunca = nuncaDe(n, prohibidas(r.proyecto), casa);
        // Lo que nunca va aparte de lo autorizable del mismo tipo (un «git push --force» no se junta con un «git push»)
        const clave = `${r.proyecto}\u0000${nunca ? 'nunca\u0000' : ''}${propuesta.regla ?? intento}`;
        const antes = porClave.get(clave);
        const intentos = [intento, ...(antes?.intentos ?? []).filter((x) => x !== intento)].slice(0, INTENTOS);
        const veces = (antes?.veces ?? 0) + (enEste.has(clave) ? 0 : 1);
        enEste.add(clave);
        porClave.set(clave, { ...propuesta, proyecto: r.proyecto, herramienta: n.herramienta, intentos, ...(nunca ? { nunca } : {}), cuando: r.cuando, registro: r.registro, veces });
      }
    }
  }
  return [...porClave.values()].sort((a, b) => b.cuando.localeCompare(a.cuando));
}

/**
 * Lo negado en vivo, con lo que el panel ofrece para cada intento (nota de voz del titular nmvowqdnztit, 26 de octubre de
 * 2026: «Autorizar con una casilla» lo llevaba a un panel sin esa casilla, y luego había que marcarla y guardar): los
 * permisos pendientes de su proyecto que salieron de ese intento (una cadena da uno por orden que le faltó). Sin ninguno,
 * ya está autorizado, si el panel se leyó después de que se le negó.
 */
export function ofrecidoEnVivo(vivos: string[], pendientes: PermisoNegado[], proyecto: string): { intento: string; permisos: PermisoNegado[] }[] {
  return vivos.map((intento) => ({ intento, permisos: pendientes.filter((n) => n.proyecto === proyecto && n.intentos.includes(intento)) }));
}

/**
 * De lo negado en vivo, solo lo que todavía se puede autorizar (nota de voz del titular, 26 de octubre de 2026: el área de
 * permisos «es para avisarme lo que no se autorizó y ofrecerme autorizarlo; una vez autorizado no veo el punto de
 * mantenerla llena: debe aparecer solo lo que está pendiente»): cada intento con sus permisos que traen regla y no son de
 * «nunca». Lo ya autorizado, las cadenas con todo permitido y lo que nunca hace salen; un intento sin nada por autorizar
 * sale entero. Mientras el panel no se haya leído (`leido` falso) todo queda, porque aún se está buscando qué le faltó.
 */
export function pendientesEnVivo(ofrecidos: { intento: string; permisos: PermisoNegado[] }[], leido: boolean): { intento: string; permisos: PermisoNegado[] }[] {
  if (!leido) return ofrecidos;
  return ofrecidos
    .map(({ intento, permisos }) => ({ intento, permisos: permisos.filter((n) => n.regla && !n.nunca) }))
    .filter(({ permisos }) => permisos.length > 0);
}

/** Si un permiso autorizado vale para ese proyecto: el suyo, o el de todos los proyectos de este computador. */
export const valePara = (a: PermisoAutorizado, proyecto: string) => a.alcance === 'todos' || a.proyecto === proyecto;

/** Lo que falta autorizar: lo negado que no está autorizado para su proyecto. */
export const sinAutorizar = (negados: PermisoNegado[], autorizados: PermisoAutorizado[] = []) =>
  negados.filter((n) => !n.regla || !autorizados.some((a) => a.regla === n.regla && valePara(a, n.proyecto)));

/**
 * Las reglas autorizadas que el lanzador le suma al director de ese proyecto, sin repetir y sin ninguna que choque con
 * lo que nunca: las reglas que niegan siguen ganando en Claude Code, pero tampoco se le pasan.
 */
export function autorizadasPara(autorizados: PermisoAutorizado[] = [], proyecto: string, prohibidas: string[], casa: string): string[] {
  return [...new Set(autorizados.filter((a) => valePara(a, proyecto)).map((a) => a.regla))].filter((r) => !reglaProhibida(r, prohibidas, casa));
}

/** Lo que pide autorizar el panel: una regla de lo negado, de un proyecto, con su alcance. */
export interface PedidoDePermiso {
  regla: unknown;
  proyecto: unknown;
  alcance: unknown;
}

/**
 * Si se puede autorizar: solo una regla que salió de lo negado en ese proyecto (nunca una escrita a mano), que no sea de
 * lo que nunca y con un alcance válido.
 */
export function revisarPedido(p: PedidoDePermiso, negados: PermisoNegado[]): { ok: true; regla: string; proyecto: string; alcance: PermisoAutorizado['alcance'] } | { ok: false; error: string } {
  if (typeof p.regla !== 'string' || typeof p.proyecto !== 'string') return { ok: false, error: 'Falta la regla o el proyecto.' };
  if (p.alcance !== 'proyecto' && p.alcance !== 'todos') return { ok: false, error: 'El alcance es «Solo este proyecto» o «Todos los proyectos de este computador».' };
  // Lo autorizable gana: «git push» se da aunque al lado haya un «git push --force», que es de lo que nunca
  const deEse = negados.filter((x) => x.regla === p.regla && x.proyecto === p.proyecto);
  const n = deEse.find((x) => !x.nunca) ?? deEse[0];
  if (!n) return { ok: false, error: `«${corto(p.regla, 80)}» no es de lo que se le negó al director en ese proyecto.` };
  if (n.nunca) return { ok: false, error: `«${corto(p.regla, 80)}» no se autoriza: ${n.nunca.porque}` };
  return { ok: true, regla: p.regla, proyecto: p.proyecto, alcance: p.alcance };
}
