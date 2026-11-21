// La orden de un paso, a escondidas en el servidor (terminalOculta.ts; pedido pd_sin_terminal).
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { bashDelSistema } from './terminal.ts';
import { adjuntoDeSalida, CorridasOcultas, enmascarar, llamadaDeBash, esCritica, LIMITE_MS, marcaEnVentana, MAS_TIEMPO_MS, ordenNunca, permisoDeSiempre, reglaParaSiempre, SILENCIO_MS, tiempoDeCorrida, ultimasLineas, vaEnVentana, yaAutorizada, type Proceso } from './terminalOculta.ts';

/** Un proceso de mentira: se le dicta lo que dice y cuándo termina. */
function falso() {
  const p = new EventEmitter() as EventEmitter & Proceso & { decir(t: string): void; cerrar(c: number): void; parado: boolean };
  const out = new EventEmitter();
  Object.assign(p, { pid: 42, stdout: out, stderr: new EventEmitter(), parado: false });
  p.decir = (t) => out.emit('data', Buffer.from(t));
  p.cerrar = (c) => p.emit('close', c);
  return p;
}

describe('los secretos de la salida, tapados antes de guardarla (nmwpz2uwktit)', () => {
  it('tapa llaves, «Bearer», contraseñas en una dirección y lo que va tras password o token', () => {
    const salida = enmascarar([
      'token ghp_abcdefghijklmnopqrstuvwxyz0123456789',
      'Authorization: Bearer abc.def.ghijklmnopqrst',
      'remote: https://ana:s3cr3t0@github.com/ana/x.git',
      'NPM_TOKEN=npm_abcdefghijklmnopqrstuvwxyz12',
      'DB_PASSWORD="hunter2hunter"',
      'clave sk-ant-api03-abcdefghijklmnopqrstuvwxyz',
    ].join('\n'));
    for (const secreto of ['ghp_abc', 'abc.def', 's3cr3t0', 'npm_abc', 'hunter2', 'sk-ant']) expect(salida).not.toContain(secreto);
    expect(salida).toContain('https://ana:••••@github.com/ana/x.git');
    expect(salida).toContain('DB_PASSWORD="••••"');
  });
  it('lo que no parece un secreto queda igual', () => {
    const normal = 'Everything up-to-date\n12 tests passed\nTo github.com:ana/x.git';
    expect(enmascarar(normal)).toBe(normal);
  });
});

describe('lo que nunca corre, aunque venga de un paso', () => {
  it('subir a la fuerza, reescribir la historia y leer un .env', () => {
    expect(ordenNunca('git push --force origin main')).toBe(true);
    expect(ordenNunca('git push -f')).toBe(true);
    expect(ordenNunca('git push origin +main')).toBe(true);
    expect(ordenNunca('git filter-repo --path x')).toBe(true);
    expect(ordenNunca('cat .env')).toBe(true);
    expect(ordenNunca('git push origin main')).toBe(false);
    expect(ordenNunca('npm run build')).toBe(false);
    expect(ordenNunca('node tools/x.ts --env-file=config')).toBe(false);
  });
});

describe('el límite mixto: a los 10 minutos pide más tiempo, y lo callado se marca (nmwpz4vnbtit)', () => {
  it('antes del límite corre; al llegar, pide tiempo sin terminar; con 10 más, sigue', () => {
    const base = { inicio: 0, extra: 0, ultimaSalida: 0, termino: false };
    expect(tiempoDeCorrida({ ...base, ultimaSalida: LIMITE_MS - 1000, ahora: LIMITE_MS - 1000 })).toEqual({ pideTiempo: false, callada: false, quedanMs: 1000 });
    expect(tiempoDeCorrida({ ...base, ultimaSalida: LIMITE_MS, ahora: LIMITE_MS }).pideTiempo).toBe(true);
    expect(tiempoDeCorrida({ ...base, extra: MAS_TIEMPO_MS, ultimaSalida: LIMITE_MS, ahora: LIMITE_MS }).pideTiempo).toBe(false);
  });
  it('sin decir nada un buen rato, callada; terminada, nada', () => {
    expect(tiempoDeCorrida({ inicio: 0, extra: 0, ultimaSalida: 0, ahora: SILENCIO_MS, termino: false }).callada).toBe(true);
    expect(tiempoDeCorrida({ inicio: 0, extra: 0, ultimaSalida: 0, ahora: LIMITE_MS * 3, termino: true })).toEqual({ pideTiempo: false, callada: false, quedanMs: 0 });
  });
});

describe('«Siempre», por proyecto y por tipo de acción, en la lista de «Permisos» (nmwpsoraqtit)', () => {
  it('la regla es la del tipo de acción; subir y publicar valen solo en este proyecto', () => {
    expect(reglaParaSiempre('npm run build', '/home/ana')).toEqual({ regla: 'Bash(npm run:*)', soloEsteProyecto: false });
    const subir = reglaParaSiempre('git push origin main', '/home/ana')!;
    expect(subir.soloEsteProyecto).toBe(true);
    expect(permisoDeSiempre(subir, 'todos', 'golf', 'ana', 'x')).toEqual({ regla: subir.regla, alcance: 'proyecto', proyecto: 'golf', cuando: 'x', quien: 'ana' });
    expect(permisoDeSiempre(reglaParaSiempre('npm run build', '/home/ana')!, 'todos', 'golf', 'ana', 'x')).toEqual({ regla: 'Bash(npm run:*)', alcance: 'todos', cuando: 'x', quien: 'ana' });
  });
  it('lo dado en un proyecto no vale en otro; lo dado para todos, sí', () => {
    const lista = [{ regla: 'Bash(git push:*)', alcance: 'proyecto' as const, proyecto: 'golf', cuando: 'x', quien: 'ana' }, { regla: 'Bash(npm run:*)', alcance: 'todos' as const, cuando: 'x', quien: 'ana' }];
    expect(yaAutorizada('git push origin main', lista, 'golf')).toBe(true);
    expect(yaAutorizada('git push origin main', lista, 'tenis')).toBe(false);
    expect(yaAutorizada('npm run build', lista, 'tenis')).toBe(true);
  });
});

describe('la orden que pide escribir, la crítica y la nota de error (pd_sin_terminal)', () => {
  it('«ábrela en una terminal» marca el tipo de orden solo en su proyecto (nmwqkn8m1tit)', () => {
    const marca = marcaEnVentana('npm init', 'golf', '/home/ana', 'x')!;
    expect(marca).toEqual({ proyecto: 'golf', regla: 'Bash(npm init:*)', cuando: 'x' });
    expect(vaEnVentana('npm init -y', [marca], 'golf')).toBe(true);
    expect(vaEnVentana('npm init', [marca], 'tenis')).toBe(false);
    expect(vaEnVentana('npm test', [marca], 'golf')).toBe(false);
    // Varias órdenes juntas no tienen un tipo que marcar
    expect(marcaEnVentana('npm i; npm test', 'golf', '/home/ana', 'x')).toBeNull();
  });
  it('subir, traer, publicar y desplegar son críticas; lo demás, no (nmwpxsauntit)', () => {
    expect(esCritica('git push origin main', '/home/ana')).toBe(true);
    expect(esCritica('npm run build', '/home/ana')).toBe(false);
  });
  it('la nota de error lleva las últimas líneas y la salida entera adjunta (nmwpz12rqtit)', () => {
    const salida = Array.from({ length: 30 }, (_, i) => `línea ${i + 1}`).join('\r\n');
    expect(ultimasLineas(salida).split('\n')).toEqual(Array.from({ length: 12 }, (_, i) => `línea ${i + 19}`));
    const adj = adjuntoDeSalida({ id: 'c1-x', salida });
    expect(adj.nombre).toBe('salida-c1-x.txt');
    expect(Buffer.from(adj.datos.replace('data:text/plain;base64,', ''), 'base64').toString('utf8')).toBe(salida);
  });
  it('la que falla avisa al terminar; la detenida, no', async () => {
    const vistas: string[] = [];
    const p = falso();
    const q = falso();
    const procesos = [p, q];
    let i = 0;
    const corridas = new CorridasOcultas(async () => procesos[i++], () => undefined, () => 5);
    corridas.alTerminar = (c) => vistas.push(`${c.id}:${c.fase}`);
    const a = await corridas.iniciar({ proyecto: 'golf', mision: 't_a', paso: 0, orden: 'npm test', carpeta: '/x' });
    p.cerrar(2);
    const b = await corridas.iniciar({ proyecto: 'golf', mision: 't_a', paso: 1, orden: 'npm init', carpeta: '/x' });
    expect(corridas.aVentana(b.id)?.fase).toBe('detenida');
    q.cerrar(1);
    expect(vistas).toEqual([`${a.id}:fallo`]);
  });
  it('el servidor deja la nota de error en el Buzón y la línea cuenta las de todos los proyectos (nmwqknqadtit)', () => {
    const api = readFileSync(join(__dirname, 'api.ts'), 'utf8');
    expect(api).toContain("if (c.fase === 'fallo') void notaDeErrorDeOrden(c)");
    expect(api).toContain("tipoNota: 'falla',");
    expect(api).toContain('adjuntos: [adjuntoDeSalida(c)],');
    expect(api).toContain('const corridas = corridasOcultas.todas();');
    expect(api).toContain("ruta === '/terminal/a-ventana'");
    expect(api).toContain('if (vaEnVentana(orden, local.enVentana ?? [], id))');
  });
});

describe('las rutas del servidor', () => {
  const api = readFileSync(join(__dirname, 'api.ts'), 'utf8');
  const correr = api.slice(api.indexOf("ruta === '/terminal/correr'"), api.indexOf("ruta === '/terminal/corridas'"));
  it('la orden sale del plan, nunca de la petición; lo que nunca se niega; «Siempre» va a la lista de «Permisos»', () => {
    expect(correr).toContain("const orden = p && typeof p !== 'string' ? p.terminal : undefined;");
    expect(correr).not.toContain('cuerpo.orden');
    expect(correr).toContain('if (ordenNunca(orden))');
    expect(correr).toContain('await cambiarAutorizados(raiz,');
    expect(correr).toContain('if (m.para !== yo.rol)');
  });
  it('al apagarse el Studio, se detienen todas', () => {
    expect(api).toContain("process.once('exit', () => corridasOcultas.detenerTodas());");
    expect(api).toContain("ruta === '/terminal/mas-tiempo' || ruta === '/terminal/detener'");
  });
});

describe('las corridas: la salida guardada, el tiempo, «Detener» y el apagado del Studio', () => {
  it('guarda la salida tapada y termina hecha o fallida según su código', async () => {
    const p = falso();
    const corridas = new CorridasOcultas(async () => p, () => undefined, () => 1000);
    const c = await corridas.iniciar({ proyecto: 'golf', mision: 't_a', paso: 0, orden: 'npm test', carpeta: '/x' });
    expect(c.fase).toBe('corriendo');
    expect(corridas.enMarcha('golf')).toBe(1);
    p.decir('token=abcdefgh1234\nok\n');
    p.cerrar(0);
    expect(corridas.estado(c.id)).toMatchObject({ fase: 'hecha', codigo: 0, salida: 'token=••••\nok\n' });
    expect(corridas.enMarcha('golf')).toBe(0);
    const q = falso();
    const otra = new CorridasOcultas(async () => q, () => undefined, () => 1000);
    const f = await otra.iniciar({ proyecto: 'golf', mision: 't_a', paso: 0, orden: 'npm test', carpeta: '/x' });
    q.cerrar(1);
    expect(otra.estado(f.id)?.fase).toBe('fallo');
  });

  it('a los 10 minutos no la mata: pide tiempo, y «Darle 10 minutos más» la deja seguir', async () => {
    let ahora = 0;
    const p = falso();
    const corridas = new CorridasOcultas(async () => p, () => undefined, () => ahora);
    const c = await corridas.iniciar({ proyecto: 'golf', mision: 't_a', paso: 0, orden: 'npm run build', carpeta: '/x' });
    ahora = LIMITE_MS;
    p.decir('sigo\n');
    expect(corridas.estado(c.id)).toMatchObject({ fase: 'corriendo', pideTiempo: true, callada: false });
    expect(corridas.masTiempo(c.id)).toBe(true);
    expect(corridas.estado(c.id)?.pideTiempo).toBe(false);
    ahora = LIMITE_MS + SILENCIO_MS;
    expect(corridas.estado(c.id)?.callada).toBe(true);
  });

  it('«Detener» y el apagado del Studio la paran, con lo que lanzó', async () => {
    const parados: Proceso[] = [];
    const procesos = [falso(), falso()];
    let i = 0;
    const corridas = new CorridasOcultas(async () => procesos[i++], (p) => parados.push(p), () => 5);
    const a = await corridas.iniciar({ proyecto: 'golf', mision: 't_a', paso: 0, orden: 'npm run dev', carpeta: '/x' });
    const b = await corridas.iniciar({ proyecto: 'tenis', mision: 't_b', paso: 1, orden: 'npm run dev', carpeta: '/y' });
    expect(corridas.detener(a.id)).toBe(true);
    procesos[0].cerrar(1);
    expect(corridas.estado(a.id)?.fase).toBe('detenida');
    expect(corridas.detenerTodas()).toBe(1);
    expect(parados).toEqual(procesos);
    expect(corridas.detener(b.id)).toBe(true);
    procesos[1].cerrar(1);
    expect(corridas.detener(b.id)).toBe(false);
  });

  it('de verdad, en este computador: la orden corre sin ventana en su carpeta y su salida llega (en Windows, con Git Bash)', async () => {
    if (!(await bashDelSistema())) return;
    const corridas = new CorridasOcultas();
    const c = await corridas.iniciar({ proyecto: 'golf', mision: 't_a', paso: 0, orden: 'echo hola-oculta && pwd', carpeta: process.cwd() });
    for (let i = 0; i < 100 && corridas.estado(c.id)?.fase === 'corriendo'; i++) await new Promise((ok) => setTimeout(ok, 100));
    expect(corridas.estado(c.id)).toMatchObject({ fase: 'hecha', codigo: 0 });
    expect(corridas.estado(c.id)?.salida).toContain('hola-oculta');
  }, 20_000);

  it('on Windows the hidden bash is a login shell in MINGW64 that stays in its folder; elsewhere, as before (nmwqmmidgtit)', () => {
    const w = llamadaDeBash('npm test', 'win32', { PATH: 'C:\\x' });
    expect(w.args).toEqual(['--login', '-c', 'npm test']);
    expect(w.env).toMatchObject({ PATH: 'C:\\x', MSYSTEM: 'MINGW64', CHERE_INVOKING: '1', GIT_TERMINAL_PROMPT: '0' });
    expect(llamadaDeBash('npm test', 'win32', { MSYSTEM: 'UCRT64' }).env.MSYSTEM).toBe('UCRT64');
    for (const p of ['linux', 'darwin'] as const) {
      const o = llamadaDeBash('npm test', p, { PATH: '/usr/bin' });
      expect(o.args).toEqual(['-c', 'npm test']);
      expect(o.env.CHERE_INVOKING).toBeUndefined();
    }
  });

  it('really, on this computer: `npm --version` and `sleep 1` run hidden, as in Git Bash (nmwqmmidgtit, nmwqmrxsgtit)', async () => {
    if (!(await bashDelSistema())) return;
    // As the Studio's server gets it when started from Windows: a PATH without Git Bash's own folders
    const antes = process.env.PATH;
    const sep = process.platform === 'win32' ? ';' : ':';
    if (process.platform === 'win32') process.env.PATH = (antes ?? '').split(sep).filter((d) => !/[\\/]usr[\\/]bin|[\\/]mingw64[\\/]bin|^\/(usr\/)?bin$/i.test(d)).join(sep);
    const corridas = new CorridasOcultas();
    const c = await corridas.iniciar({ proyecto: 'golf', mision: 't_a', paso: 0, orden: 'sleep 1 && npm --version && pwd', carpeta: process.cwd() });
    process.env.PATH = antes;
    for (let i = 0; i < 300 && corridas.estado(c.id)?.fase === 'corriendo'; i++) await new Promise((ok) => setTimeout(ok, 100));
    expect(corridas.estado(c.id)).toMatchObject({ fase: 'hecha', codigo: 0 });
    expect(corridas.estado(c.id)?.salida).toMatch(/\d+\.\d+\.\d+/);
    expect(corridas.estado(c.id)?.salida.replace(/\\/g, '/').toLowerCase()).toContain('stl');
  }, 40_000);

  it('si no se pudo lanzar, queda en «fallo» con el porqué, nunca en silencio', async () => {
    const corridas = new CorridasOcultas(async () => { throw new Error('sin_bash'); }, () => undefined, () => 5);
    const c = await corridas.iniciar({ proyecto: 'golf', mision: 't_a', paso: 0, orden: 'npm test', carpeta: '/x' });
    expect(c).toMatchObject({ fase: 'fallo', salida: 'sin_bash' });
  });
});
