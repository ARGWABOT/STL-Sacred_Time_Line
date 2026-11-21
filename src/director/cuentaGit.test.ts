import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { guardarActivo, guardarCuentaGit, leerLocal } from './proyectos.ts';
import { avisoDeCuentaGh, avisoDelVigiaGh, panelSesionesGh } from '../../estudio/src/vistaProyecto.ts';
import { ponerIdioma } from '../../estudio/src/textos.ts';
import { codigoDeEntrada, compararCuenta, cuentaQueApruebaUsar, entornoConLlave, esCuentaGitHub, esOrdenDeRedGit, llaveAlLanzar, marcarSesiones, mensajeDeCuenta, noUsaGitHub, nombresEnGh, ordenDeCambio, RAZON_TURNO_OCUPADO, REGLAS_DE_RED_GIT, reglasPorCuenta, respuestaDelGancho, seguimientoDeEstado, seguirCuentaAlEntrar, sesionAprobada, sesionDelProyecto, sesionesEnGh, tomarTurnoDeGh, TURNO_GH_MS, URL_DE_DISPOSITIVO, vigiaDeCuentaGh, type CorrerGh, type CorrerGhSinEsperar, type LecturaDeGh } from './cuentaGit.ts';

/** Un gh de mentira: sus sesiones (nombre guardado → token) y de quién es cada token según la API de GitHub. */
function ghDePrueba(sesiones: Record<string, string>, logins: Record<string, string>, activo?: string): CorrerGh {
  return (args, token) => {
    if (args[0] === 'auth' && args[1] === 'status') return { status: 0, stdout: Object.keys(sesiones).map((n) => `  ✓ Logged in to github.com account ${n} (keyring)`).join('\n') };
    if (args[0] === 'auth' && args[1] === 'token') {
      const t = sesiones[args[args.indexOf('--user') + 1]];
      return t ? { status: 0, stdout: `${t}\n` } : { status: 1, stdout: '' };
    }
    if (args[0] === 'api') {
      const login = logins[token ?? activo ?? ''];
      return login ? { status: 0, stdout: `${login}\n` } : { status: 1, stdout: '' };
    }
    return { status: 1, stdout: '' };
  };
}

describe('la cuenta de GitHub de cada proyecto', () => {
  it('compara la aprobada con lo que dice GitHub: coincide, no coincide, sin cuenta y sin poder leerla', () => {
    expect(compararCuenta('ARGWABOT', 'argwabot')).toMatchObject({ ok: true, login: 'argwabot' });
    expect(compararCuenta('ARGWABOT', 'empresa_admin')).toMatchObject({ ok: false, motivo: 'no_coincide', login: 'empresa_admin' });
    expect(compararCuenta(null, 'ARGWABOT')).toMatchObject({ ok: false, motivo: 'sin_cuenta' });
    expect(compararCuenta(' ', 'ARGWABOT')).toMatchObject({ ok: false, motivo: 'sin_cuenta' });
    expect(compararCuenta('ARGWABOT', null)).toMatchObject({ ok: false, motivo: 'sin_sesion' });
  });

  it('una cuenta renombrada: decide lo que dice GitHub, nunca el nombre que guardó gh', () => {
    // gh la guarda con su nombre de antes y GitHub dice el de hoy: es la aprobada
    expect(compararCuenta('ARGWABOT', 'ARGWABOT', 'incocrea').ok).toBe(true);
    // gh dice la aprobada y GitHub dice otra: no se da por buena, y queda en duda para la persona
    const duda = compararCuenta('incocrea', 'ARGWABOT', 'incocrea');
    expect(duda).toMatchObject({ ok: false, motivo: 'en_duda', login: 'ARGWABOT' });
    expect(mensajeDeCuenta(duda)).toContain('cámbiala a ARGWABOT');
  });

  it('cada motivo le dice a la persona qué pasó y dónde se arregla', () => {
    expect(mensajeDeCuenta(compararCuenta(null, 'ARGWABOT'))).toContain('«Proyecto»');
    expect(mensajeDeCuenta(compararCuenta('ARGWABOT', 'otra'))).toContain('GitHub dice que la sesión es de otra');
    expect(mensajeDeCuenta(compararCuenta('ARGWABOT', null))).toContain('No pude leer');
  });

  it('solo un login de GitHub vale como cuenta', () => {
    for (const x of ['ARGWABOT', 'empresa_admin', 'ana-1']) expect(esCuentaGitHub(x)).toBe(true);
    for (const x of ['', '-ana', 'ana lopez', 'ana;rm', 'a'.repeat(40), 7]) expect(esCuentaGitHub(x)).toBe(false);
  });

  it('reconoce las órdenes que van a GitHub, también encadenadas, y no las demás', () => {
    for (const o of ['git push', 'git push origin main', 'git pull', 'git fetch -q', 'git ls-remote x', 'git clone x', 'cd C:/x && git push', 'git -c a=b push', 'git --no-pager fetch', 'gh release create v1', 'gh repo edit', 'gh pr create'])
      expect(esOrdenDeRedGit(o), o).toBe(true);
    for (const o of ['git status', 'git log --grep push', 'git commit -m "push"', 'git add push', 'node tools/x.ts', 'gh auth status', 'npm run typecheck', undefined])
      expect(esOrdenDeRedGit(o), String(o)).toBe(false);
  });

  it('el gancho niega la orden de red con otra cuenta o sin cuenta, y nunca da un permiso', () => {
    const orden = (command: string) => JSON.stringify({ tool_name: 'Bash', tool_input: { command } });
    const negada = (s: string) => JSON.parse(s).hookSpecificOutput;
    expect(negada(respuestaDelGancho(orden('git push origin main'), 'ARGWABOT', () => 'empresa_admin'))).toMatchObject({ hookEventName: 'PreToolUse', permissionDecision: 'deny' });
    expect(negada(respuestaDelGancho(orden('git push origin main'), 'ARGWABOT', () => 'empresa_admin')).permissionDecisionReason).toContain('empresa_admin');
    expect(negada(respuestaDelGancho(orden('git fetch'), undefined, () => 'ARGWABOT')).permissionDecision).toBe('deny');
    expect(negada(respuestaDelGancho(orden('gh release create v1'), 'ARGWABOT', () => null)).permissionDecision).toBe('deny');
    // Con la cuenta correcta no dice nada: lo deciden los permisos de siempre
    expect(respuestaDelGancho(orden('git push origin main'), 'ARGWABOT', () => 'argwabot')).toBe('');
    // Lo que no va a GitHub ni le pregunta a GitHub
    expect(respuestaDelGancho(orden('git status'), 'ARGWABOT', () => { throw new Error('no debe leer'); })).toBe('');
    expect(respuestaDelGancho('esto no es JSON', 'ARGWABOT', () => { throw new Error('no debe leer'); })).toBe('');
  });

  it('un proyecto con remotos que no son de GitHub no entra en la regla; sin remotos, sí', () => {
    expect(noUsaGitHub('origin\thttps://gitlab.com/ana/x.git (push)\n')).toBe(true);
    expect(noUsaGitHub('origin\thttps://github.com/ana/x.git (push)\n')).toBe(false);
    expect(noUsaGitHub('')).toBe(false);
  });

  it('las reglas de red cubren lo que el aviso deja subir, traer y publicar en GitHub con «Siempre»', () => {
    for (const r of ['Bash(git push:*)', 'Bash(git pull:*)', 'Bash(git fetch:*)', 'Bash(gh release:*)']) expect(REGLAS_DE_RED_GIT).toContain(r);
  });

  it('lee los nombres de las sesiones de gh', () => {
    expect(nombresEnGh('github.com\n  ✓ Logged in to github.com account empresa_admin (keyring)\n  ✓ Logged in to github.com account ARGWABOT (keyring)\n')).toEqual(['empresa_admin', 'ARGWABOT']);
  });

  it('lee las sesiones de gh con cuál es la activa, también la que no pudo abrir y la de un gh de antes', () => {
    const estado = [
      'github.com',
      '  ✓ Logged in to github.com account empresa_admin (keyring)',
      '  - Active account: true',
      '  - Git operations protocol: https',
      '',
      '  ✓ Logged in to github.com account incocrea (keyring)',
      '  - Active account: false',
      '',
      '  X Failed to log in to github.com account viejo (keyring)',
      '  - Active account: false',
    ].join('\n');
    expect(sesionesEnGh(estado)).toEqual([
      { nombre: 'empresa_admin', activa: true },
      { nombre: 'incocrea', activa: false },
      { nombre: 'viejo', activa: false },
    ]);
    expect(sesionesEnGh('github.com\n  ✓ Logged in to github.com as ana (oauth_token)\n')).toEqual([{ nombre: 'ana', activa: true }]);
    expect(sesionesEnGh('You are not logged into any GitHub hosts.')).toEqual([]);
  });

  it('marca la aprobada por el login que dice GitHub, aunque gh la guarde con otro nombre y no sea la activa', () => {
    const lista = marcarSesiones([
      { nombre: 'empresa_admin', activa: true, login: 'empresa_admin' },
      { nombre: 'incocrea', activa: false, login: 'ARGWABOT' },
      { nombre: 'ARGWABOT', activa: false, login: null },
    ], 'argwabot');
    expect(lista.map((s) => s.aprobada)).toEqual([false, true, false]);
    expect(marcarSesiones([{ nombre: 'a', activa: true, login: 'a' }], null)[0].aprobada).toBe(false);
  });

  it('cambia solo a una sesión que gh tiene guardada, y nunca con otro texto', () => {
    const guardadas = [{ nombre: 'empresa_admin', activa: true }, { nombre: 'incocrea', activa: false }];
    expect(ordenDeCambio('incocrea', guardadas)).toEqual(['auth', 'switch', '-h', 'github.com', '-u', 'incocrea']);
    for (const x of ['ARGWABOT', 'incocrea; rm -rf', '', null, 7]) expect(ordenDeCambio(x, guardadas), String(x)).toBeNull();
  });

  it('lee el código de un solo uso de gh auth login --web, y nada mientras no lo dice', () => {
    expect(codigoDeEntrada('! First copy your one-time code: AB12-CD34\nOpen this URL to continue in your web browser: https://github.com/login/device\n')).toEqual({ codigo: 'AB12-CD34', url: 'https://github.com/login/device' });
    expect(codigoDeEntrada('! First copy your one-time code: ab12-cd34')).toEqual({ codigo: 'AB12-CD34', url: URL_DE_DISPOSITIVO });
    expect(codigoDeEntrada('Press Enter to open github.com in your browser...')).toBeNull();
  });

  it('el panel no le pide el token a gh desde el director: lo corre el servidor, solo para el titular', () => {
    const api = readFileSync(new URL('../../estudio/servidor/api.ts', import.meta.url), 'utf8');
    for (const r of ["'/cuenta-git/sesiones'", "'/cuenta-git/usar'", "'/cuenta-git/entrar'"]) {
      const desde = api.indexOf(r);
      expect(desde, r).toBeGreaterThan(0);
      expect(api.slice(desde, desde + 400), r).toContain("rol !== 'titular'");
    }
  });

  it('encuentra la sesión de la cuenta aprobada aunque no sea la activa', () => {
    const gh = ghDePrueba({ empresa_admin: 't1', ARGWABOT: 't2' }, { t1: 'empresa_admin', t2: 'ARGWABOT' }, 't1');
    expect(sesionAprobada('ARGWABOT', gh)).toEqual({ ok: true, login: 'ARGWABOT', token: 't2' });
  });

  it('pide el token solo con --user de la cuenta aprobada, y nunca usa la sesión activa ni la de otra cuenta', () => {
    const llamadas: { args: string[]; token?: string }[] = [];
    const base = ghDePrueba({ empresa_admin: 't1', ARGWABOT: 't2' }, { t1: 'empresa_admin', t2: 'ARGWABOT' }, 't1');
    const espia: CorrerGh = (args, token) => {
      llamadas.push({ args, token });
      return base(args, token);
    };
    sesionAprobada('ARGWABOT', espia);
    // Sin la aprobada guardada, tampoco se pregunta a la activa
    sesionAprobada('ARGWABOT', (args, token) => {
      llamadas.push({ args, token });
      return ghDePrueba({ empresa_admin: 't1' }, { t1: 'empresa_admin' }, 't1')(args, token);
    });
    sesionAprobada(null, espia);
    for (const l of llamadas) {
      if (l.args[0] === 'auth' && l.args[1] === 'token') expect(l.args).toEqual(['auth', 'token', '-h', 'github.com', '--user', 'ARGWABOT']);
      else if (l.args[0] === 'api') expect(l.token, 'la API se pregunta solo con el token de la aprobada').toBe('t2');
      else throw new Error(`orden inesperada: gh ${l.args.join(' ')}`);
    }
  });

  it('sin la sesión aprobada, sin cuenta o con un nombre que GitHub no confirma, no hay token', () => {
    const otra = ghDePrueba({ empresa_admin: 't1' }, { t1: 'empresa_admin' }, 't1');
    expect(sesionAprobada('ARGWABOT', otra)).toEqual({ ok: false, resultado: { ok: false, motivo: 'sin_sesion', aprobada: 'ARGWABOT', login: null } });
    expect(sesionAprobada(null, otra)).toEqual({ ok: false, resultado: { ok: false, motivo: 'sin_cuenta', aprobada: null, login: null } });
    // gh la guarda con el nombre de la aprobada y GitHub dice otra: en duda (una cuenta renombrada), sin token
    const falsa = ghDePrueba({ incocrea: 't3' }, { t3: 'ARGWABOT' }, 't3');
    expect(sesionAprobada('incocrea', falsa)).toEqual({ ok: false, resultado: { ok: false, motivo: 'en_duda', aprobada: 'incocrea', login: 'ARGWABOT' } });
    // Sin gh o sin red
    const sinNada: CorrerGh = () => ({ status: 1, stdout: '' });
    expect(sesionAprobada('ARGWABOT', sinNada)).toMatchObject({ ok: false, resultado: { motivo: 'sin_sesion' } });
  });
});

describe('la sesión activa de gh sigue a la cuenta aprobada de cada proyecto (nota de voz del titular nmw9xvydetit)', () => {
  // gh en este computador, con las dos cuentas del titular: activa la del otro proyecto (IDG), como la dejó al pasar por él
  const conLasDos = [{ nombre: 'ARGWABOT', activa: false }, { nombre: 'empresa_admin', activa: true }];

  it('al volver a un proyecto, elige su cuenta aprobada y la deja activa con gh auth switch, solo a una sesión guardada', () => {
    expect(sesionDelProyecto('ARGWABOT', conLasDos)).toEqual({ que: 'cambiar', nombre: 'ARGWABOT', orden: ['auth', 'switch', '-h', 'github.com', '-u', 'ARGWABOT'] });
    // gh la guardó con otra caja de letras: es la misma cuenta, y se cambia al nombre con que gh la tiene
    expect(sesionDelProyecto('argwabot', conLasDos)).toMatchObject({ que: 'cambiar', nombre: 'ARGWABOT' });
    // Y el otro proyecto, la suya
    expect(sesionDelProyecto('empresa_admin', conLasDos)).toEqual({ que: 'ya_activa', nombre: 'empresa_admin' });
  });

  it('si ya está activa, no cambia nada', () => {
    expect(sesionDelProyecto('ARGWABOT', [{ nombre: 'ARGWABOT', activa: true }, { nombre: 'empresa_admin', activa: false }])).toEqual({ que: 'ya_activa', nombre: 'ARGWABOT' });
  });

  it('sin cuenta aprobada en ese proyecto (o con un texto que no es una cuenta), no hace nada', () => {
    expect(sesionDelProyecto(undefined, conLasDos)).toEqual({ que: 'sin_cuenta' });
    expect(sesionDelProyecto('', conLasDos)).toEqual({ que: 'sin_cuenta' });
    expect(sesionDelProyecto('   ', conLasDos)).toEqual({ que: 'sin_cuenta' });
    expect(sesionDelProyecto('x; rm -rf', conLasDos)).toEqual({ que: 'sin_cuenta' });
  });

  it('si gh no tiene guardada la cuenta del proyecto, avisa sin tocar la activa', () => {
    expect(sesionDelProyecto('incocrea', conLasDos)).toEqual({ que: 'no_guardada', aprobada: 'incocrea' });
    expect(sesionDelProyecto('ARGWABOT', [])).toEqual({ que: 'no_guardada', aprobada: 'ARGWABOT' });
  });

  it('el aviso de la página: que cambió; que gh no la tiene, con su atajo a «Dónde está»; nada si no hay nada que decir', () => {
    ponerIdioma('en');
    expect(avisoDeCuentaGh({ que: 'cambiada', nombre: 'ARGWABOT' })).toEqual({ texto: 'The active gh session is now ARGWABOT, the GitHub account approved for this project.', bien: true, aDondeEsta: false });
    const falta = avisoDeCuentaGh({ que: 'no_guardada', aprobada: 'incocrea' });
    expect(falta).toMatchObject({ bien: false, aDondeEsta: true });
    expect(falta?.texto).toContain('incocrea');
    expect(avisoDeCuentaGh({ que: 'fallo', nombre: 'ARGWABOT', error: 'no red' })).toMatchObject({ bien: false, aDondeEsta: true });
    for (const r of [{ que: 'sin_cuenta' }, { que: 'ya_activa', nombre: 'ARGWABOT' }, { que: 'sin_gh' }, null, undefined] as const) expect(avisoDeCuentaGh(r)).toBeNull();
    ponerIdioma('es');
    expect(avisoDeCuentaGh({ que: 'cambiada', nombre: 'ARGWABOT' })?.texto).toBe('La sesión activa de gh es ahora ARGWABOT, la cuenta de GitHub aprobada para este proyecto.');
  });

  it('la cuenta guardada de un proyecto que no es el activo sigue ahí al ir a otro y volver, y gh vuelve a ella (nmwagmiditit)', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'stl-cuenta-'));
    try {
      writeFileSync(join(raiz, 'estudio.local.json'), JSON.stringify({ activo: 'stl-studio', repositorios: { 'stl-studio': 'C:/STL', app: 'C:/idg/app' }, cuentasGit: { 'stl-studio': 'ARGWABOT' } }));
      await guardarCuentaGit(raiz, 'app', 'IDGWIND_admin');
      await guardarActivo(raiz, 'app');
      await guardarActivo(raiz, 'stl-studio');
      await guardarActivo(raiz, 'app');
      const l = await leerLocal(raiz);
      expect(l.cuentasGit).toEqual({ 'stl-studio': 'ARGWABOT', app: 'IDGWIND_admin' });
      // Al volver a IDG con ARGWABOT activa (la dejó STL), gh cambia a la de IDG
      expect(sesionDelProyecto(l.cuentasGit?.app, [{ nombre: 'ARGWABOT', activa: true }, { nombre: 'IDGWIND_admin', activa: false }])).toMatchObject({ que: 'cambiar', nombre: 'IDGWIND_admin' });
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });

  it('«Usar esta» deja aprobada la sesión elegida solo si el proyecto aún no tiene cuenta, y nunca un texto que no es una cuenta', () => {
    expect(cuentaQueApruebaUsar(undefined, 'IDGWIND_admin')).toBe('IDGWIND_admin');
    expect(cuentaQueApruebaUsar('  ', 'IDGWIND_admin')).toBe('IDGWIND_admin');
    expect(cuentaQueApruebaUsar('ARGWABOT', 'IDGWIND_admin')).toBeNull();
    expect(cuentaQueApruebaUsar(undefined, 'x; rm -rf')).toBeNull();
    expect(cuentaQueApruebaUsar(undefined, 42)).toBeNull();
    const api = readFileSync(new URL('../../estudio/servidor/api.ts', import.meta.url), 'utf-8');
    expect(api).toContain('const aprobada = cuentaQueApruebaUsar((await leerLocal(raiz)).cuentasGit?.[id], nombre);');
    expect(api).toContain('await guardarCuentaGit(raiz, id, aprobada);');
  });

  it('el servidor la sigue al cambiar de proyecto y al cargar el Studio, y a la página solo le llega lo que pasó, sin tokens', () => {
    const fuente = readFileSync(new URL('./cuentaGit.ts', import.meta.url), 'utf-8');
    const seguir = fuente.match(/export async function seguirCuentaDelProyecto\([\s\S]*?\n\}\n/)?.[0] ?? '';
    expect(seguir).not.toBe('');
    expect(seguir).toContain("ghSinEsperar(['auth', 'status'])");
    expect(seguir).not.toContain("'token'");
    const api = readFileSync(new URL('../../estudio/servidor/api.ts', import.meta.url), 'utf-8');
    expect(api).toContain('return responder(res, 200, { id, cuentaGh });');
    expect(api).toContain("cambioDeCuenta(cuentaGh, id, tb('bitacora.desde.alCambiarProyecto'))");
    expect(api).toContain("if (ruta === '/cuenta-git/seguir' && req.method === 'POST') {");
    const app = readFileSync(new URL('../../estudio/src/app.ts', import.meta.url), 'utf-8');
    expect(app).toContain('avisarCuentaGh(cuentaGh);');
    expect(app).toContain("fetch('/__estudio/director/cuenta-git/seguir', { method: 'POST' })");
  });
});

describe('cada revisión con la llave de su cuenta (pd_semaforo_gh; nmwn130sjtit, nmwo0dx41tit)', () => {
  const cuentas = { 'stl-studio': 'ARGWABOT', app: 'IDGWIND_admin' };
  const DE_GITHUB = 'origin\thttps://github.com/x/y.git (fetch)\n';
  /** gh de mentira, sin esperar, que anota todo lo que se le pide (para ver que nunca cambia la sesión activa). */
  function ghSinEsperarDePrueba(sesiones: Record<string, string>, logins: Record<string, string>, ordenes: string[][] = []): CorrerGhSinEsperar {
    const gh = ghDePrueba(sesiones, logins);
    return async (args, token) => (ordenes.push(args), gh(args, token));
  }

  it('dos revisiones lanzadas a la vez con cuentas distintas: cada una lleva su token, sin reglas negadas y sin tocar la sesión activa', async () => {
    const ordenes: string[][] = [];
    const gh = ghSinEsperarDePrueba({ ARGWABOT: 't-arg', IDGWIND_admin: 't-idg' }, { 't-arg': 'ARGWABOT', 't-idg': 'IDGWIND_admin' }, ordenes);
    const [stl, app] = await Promise.all([llaveAlLanzar(cuentas['stl-studio'], DE_GITHUB, gh), llaveAlLanzar(cuentas.app, DE_GITHUB, gh)]);
    expect(stl).toMatchObject({ resultado: { ok: true, login: 'ARGWABOT' }, porTurnos: false });
    expect(app).toMatchObject({ resultado: { ok: true, login: 'IDGWIND_admin' }, porTurnos: false });
    expect(stl.entorno).toEqual(entornoConLlave('t-arg'));
    expect(app.entorno).toMatchObject({ GH_TOKEN: 't-idg', GITHUB_TOKEN: 't-idg' });
    expect(reglasPorCuenta(stl.resultado)).toEqual([]);
    expect(reglasPorCuenta(app.resultado)).toEqual([]);
    // Nunca gh auth switch: la sesión activa del computador queda como estaba
    expect(ordenes.some((o) => o[1] === 'switch')).toBe(false);
  });

  it('git va a github.com con la llave por gh, sin el ayudante de credenciales del computador', () => {
    const e = entornoConLlave('t');
    expect(e).toMatchObject({ GIT_CONFIG_COUNT: '2', GIT_CONFIG_KEY_0: 'credential.https://github.com.helper', GIT_CONFIG_VALUE_0: '', GIT_CONFIG_VALUE_1: '!gh auth git-credential' });
  });

  it('sin la cuenta guardada en gh, se niegan las órdenes de red y se dice por qué', async () => {
    const gh = ghSinEsperarDePrueba({ IDGWIND_admin: 't-idg' }, { 't-idg': 'IDGWIND_admin' });
    const r = await llaveAlLanzar('ARGWABOT', DE_GITHUB, gh);
    expect(r).toMatchObject({ resultado: { ok: false, motivo: 'sin_sesion', aprobada: 'ARGWABOT' }, entorno: {}, porTurnos: false });
    expect(reglasPorCuenta(r.resultado)).toEqual(REGLAS_DE_RED_GIT);
    expect(mensajeDeCuenta(r.resultado!)).toContain('ARGWABOT');
    // Sin cuenta aprobada, también; y un proyecto que no va a GitHub, nada
    expect(reglasPorCuenta((await llaveAlLanzar(undefined, DE_GITHUB, gh)).resultado)).toEqual(REGLAS_DE_RED_GIT);
    expect(await llaveAlLanzar('ARGWABOT', 'origin\thttps://gitlab.com/x/y.git (fetch)\n', gh)).toEqual({ resultado: null, entorno: {}, porTurnos: false });
  });

  it('con la cuenta guardada pero sin token (un gh viejo), va por turnos: no se niega nada', async () => {
    const base = ghDePrueba({ ARGWABOT: 't-arg' }, { 't-arg': 'ARGWABOT' });
    const sinToken: CorrerGhSinEsperar = async (args, token) => (args[1] === 'token' ? { status: 1, stdout: '' } : base(args, token));
    const r = await llaveAlLanzar('ARGWABOT', DE_GITHUB, sinToken);
    expect(r).toMatchObject({ resultado: { ok: true }, entorno: {}, porTurnos: true });
  });

  it('el turno de gh: libre, vencido o de la misma cuenta se toma; de otra y vigente se espera, y el gancho se salta solo ese paso', () => {
    const ahora = Date.parse('2026-11-19T21:00:00.000Z');
    expect(tomarTurnoDeGh(null, 'ARGWABOT', ahora)).toEqual({ toma: true, turno: { cuenta: 'ARGWABOT', hasta: new Date(ahora + TURNO_GH_MS).toISOString() } });
    const deOtra = { cuenta: 'IDGWIND_admin', hasta: new Date(ahora + 1000).toISOString() };
    expect(tomarTurnoDeGh(deOtra, 'ARGWABOT', ahora)).toEqual({ toma: false });
    expect(tomarTurnoDeGh(deOtra, 'idgwind_admin', ahora).toma).toBe(true);
    expect(tomarTurnoDeGh(deOtra, 'ARGWABOT', ahora + 2000).toma).toBe(true);
    const push = JSON.stringify({ tool_input: { command: 'git push origin main' } });
    expect(JSON.parse(respuestaDelGancho(push, 'ARGWABOT', () => 'ARGWABOT', () => 'ocupado')).hookSpecificOutput.permissionDecisionReason).toBe(RAZON_TURNO_OCUPADO);
    expect(respuestaDelGancho(push, 'ARGWABOT', () => 'ARGWABOT', () => 'tomado')).toBe('');
    // Lo que no va a GitHub ni pide turno
    expect(respuestaDelGancho(JSON.stringify({ tool_input: { command: 'git status' } }), 'ARGWABOT', () => null, () => 'ocupado')).toBe('');
  });

  it('el aviso falso de otra cuenta (nmwo0dx41tit): si gh no respondió a tiempo, no es que no tenga la cuenta', () => {
    // gh tardó más de su tope: salida vacía y terminó mal. Antes daba «no_guardada» y la página avisaba con ARGWABOT guardada
    expect(seguimientoDeEstado('ARGWABOT', { ok: false, stdout: '', stderr: '', falta: false })).toEqual({ que: 'sin_respuesta' });
    expect(seguimientoDeEstado('ARGWABOT', { ok: true, stdout: '  ✓ Logged in to github.com account ARGWABOT (keyring)\n  - Active account: true', stderr: '', falta: false })).toEqual({ que: 'ya_activa', nombre: 'ARGWABOT' });
    // Respondió y de verdad no la tiene: ese aviso sí
    expect(seguimientoDeEstado('ARGWABOT', { ok: true, stdout: '  ✓ Logged in to github.com account IDGWIND_admin (keyring)', stderr: '', falta: false })).toEqual({ que: 'no_guardada', aprobada: 'ARGWABOT' });
    for (const r of [{ que: 'sin_respuesta' }, { que: 'fallo', nombre: '', error: 'x' }] as const) expect(avisoDeCuentaGh(r)).toBeNull();
  });

  it('el vigía avisa solo si la sesión activa cambió o no es la del proyecto, y no repite ni habla si gh no respondió', () => {
    const stl = (activa: string | null): LecturaDeGh => ({ activa, proyecto: 'stl-studio', aprobada: 'ARGWABOT' });
    // Igual que antes: nada
    expect(vigiaDeCuentaGh(stl('ARGWABOT'), stl('ARGWABOT'))).toBeNull();
    // gh no respondió: nada (eso era el aviso falso)
    expect(vigiaDeCuentaGh(stl('ARGWABOT'), stl(null))).toBeNull();
    // Cambió a otra que no es la del proyecto, y de vuelta a la suya
    expect(vigiaDeCuentaGh(stl('ARGWABOT'), stl('IDGWIND_admin'))).toEqual({ que: 'cambio', antes: 'ARGWABOT', ahora: 'IDGWIND_admin', aprobada: 'ARGWABOT', coincide: false });
    expect(vigiaDeCuentaGh(stl('IDGWIND_admin'), stl('argwabot'))).toMatchObject({ que: 'cambio', coincide: true });
    // Distinta en la primera lectura, y no se repite mientras siga igual
    expect(vigiaDeCuentaGh(null, stl('IDGWIND_admin'))).toEqual({ que: 'distinta', ahora: 'IDGWIND_admin', aprobada: 'ARGWABOT' });
    expect(vigiaDeCuentaGh(stl('IDGWIND_admin'), stl('IDGWIND_admin'))).toBeNull();
    // Un proyecto sin cuenta aprobada: solo el cambio
    expect(vigiaDeCuentaGh(null, { activa: 'x', proyecto: 'p', aprobada: null })).toBeNull();
    ponerIdioma('en');
    expect(avisoDelVigiaGh({ que: 'cambio', antes: 'ARGWABOT', ahora: 'IDGWIND_admin', aprobada: 'ARGWABOT', coincide: false })).toMatchObject({ bien: false, aDondeEsta: true, texto: expect.stringContaining('«Use this one»') });
    expect(avisoDelVigiaGh({ que: 'cambio', antes: 'IDGWIND_admin', ahora: 'ARGWABOT', aprobada: 'ARGWABOT', coincide: true })).toMatchObject({ bien: true, aDondeEsta: false });
    // El panel nunca se queda en «Preguntándole…»: si gh no respondió, lo dice con «Actualizar»
    const panel = panelSesionesGh({ cargando: false, hayGh: true, aprobada: null, sesiones: [], entrada: null, error: '90 s' });
    expect(panel).toContain('did not answer in time');
    expect(panel).toContain('data-ver-sesiones-gh');
    expect(panel).not.toContain('Asking GitHub');
    ponerIdioma('es');
  });

  it('al entrar a un proyecto, la sesión activa sigue solo a ese proyecto, aunque otra revisión corra', async () => {
    const pedidas: (string | undefined)[] = [];
    const seguir = async (a: string | undefined) => (pedidas.push(a), a ? ({ que: 'ya_activa', nombre: a } as const) : ({ que: 'sin_cuenta' } as const));
    expect(await seguirCuentaAlEntrar('stl-studio', cuentas, seguir)).toEqual({ que: 'ya_activa', nombre: 'ARGWABOT' });
    expect(await seguirCuentaAlEntrar('app', cuentas, seguir)).toEqual({ que: 'ya_activa', nombre: 'IDGWIND_admin' });
    expect(pedidas).toEqual(['ARGWABOT', 'IDGWIND_admin']);
  });

  it('el lanzador da la llave en el entorno de la revisión y ya no cambia la sesión activa al lanzar', () => {
    const revisor = readFileSync(new URL('../../estudio/servidor/revisor.ts', import.meta.url), 'utf-8');
    expect(revisor).toContain('const llave = await llaveAlLanzar(cuentaAprobada, await remotosDe(repositorio));');
    expect(revisor).toContain('...(cuentaGit?.ok ? llave.entorno : {})');
    expect(revisor).not.toContain('seguirCuentaQueManda(`al lanzar');
    expect(revisor).toContain('await this.seguirCuentaQueManda();');
    const gancho = readFileSync(new URL('../../tools/director/ganchoCuentaGit.ts', import.meta.url), 'utf-8');
    expect(gancho).toContain('loginDeGitHub(llave)');
    const api = readFileSync(new URL('../../estudio/servidor/api.ts', import.meta.url), 'utf-8');
    expect(api).toContain('await seguirCuentaAlEntrar(id, cuentas)');
    expect(api).toContain('const aviso = vigiaDeCuentaGh(lecturaGh, ahora);');
    expect(api).toContain("if (ruta === '/cuenta-git/vigia' && req.method === 'GET') {");
  });
});
