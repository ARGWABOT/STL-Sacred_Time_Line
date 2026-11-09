import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PAQUETE_DE_PERMISOS } from './asistente.ts';
import { codigoDeEntrada, compararCuenta, esCuentaGitHub, esOrdenDeRedGit, marcarSesiones, mensajeDeCuenta, noUsaGitHub, nombresEnGh, ordenDeCambio, REGLAS_DE_RED_GIT, respuestaDelGancho, sesionAprobada, sesionesEnGh, URL_DE_DISPOSITIVO, type CorrerGh } from './cuentaGit.ts';

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

  it('las reglas de red cubren lo que el panel deja subir, traer y publicar en GitHub', () => {
    const delPanel = PAQUETE_DE_PERMISOS.filter((p) => ['subir', 'traer', 'publicar'].includes(p.id)).flatMap((p) => p.reglas).filter((r) => !r.includes('npm publish'));
    expect(delPanel.length).toBeGreaterThan(0);
    for (const r of delPanel) expect(REGLAS_DE_RED_GIT).toContain(r);
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
