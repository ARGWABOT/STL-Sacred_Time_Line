// El respaldo de la memoria en GitHub (respaldo.ts; pedido pd_sin_modo_equipo): solo sube, nunca trae ni fuerza; solo a un
// repositorio privado, con el permiso de subir, y nunca la memoria del mismo Studio. Probado con repositorios de verdad:
// el «GitHub» de cada prueba es un repositorio desnudo, al que la dirección de GitHub de `origin` sube por pushInsteadOf.
import { execFile, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, describe, expect, it } from 'vitest';
import { causaDeFallo, comprobarPrivado, esPrivadoEnGithub, repoDeGithub, Respaldo } from './respaldo';

const base = mkdtempSync(join(tmpdir(), 'estudio-respaldo-'));
const configVacia = join(base, 'gitconfig-vacia');
writeFileSync(configVacia, '');
const AISLAR: Record<string, string> = { GIT_CONFIG_GLOBAL: configVacia, GIT_CONFIG_NOSYSTEM: '1', GIT_CEILING_DIRECTORIES: base };
const QUITAR = ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_CONFIG_PARAMETERS', 'GIT_CONFIG_COUNT'];
const antes = Object.fromEntries([...Object.keys(AISLAR), ...QUITAR].map((k) => [k, process.env[k]]));
Object.assign(process.env, AISLAR);
for (const k of QUITAR) delete process.env[k];
afterAll(() => {
  for (const [k, v] of Object.entries(antes)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  rmSync(base, { recursive: true, force: true, maxRetries: 3 });
});

const hayGit = spawnSync('git', ['--version']).status === 0;
const juntas = hayGit ? describe.concurrent : describe.skip;
const ejecutar = promisify(execFile);
const git = async (cwd: string, ...args: string[]) => (await ejecutar('git', args, { cwd, encoding: 'utf8', windowsHide: true })).stdout.trim();

let n = 0;
/** Una memoria (rama stl) con un commit y, si se pide, su «GitHub» desnudo detrás de una dirección de GitHub. */
async function memoria(conOrigen = true) {
  const dir = join(base, `caso-${++n}`);
  const memoria = join(dir, 'memoria');
  const desnudo = join(dir, 'github.git');
  await ejecutar('git', ['init', '-q', '-b', 'stl', memoria]);
  await git(memoria, 'config', 'user.name', 'Ana');
  await git(memoria, 'config', 'user.email', 'ana@x.com');
  writeFileSync(join(memoria, 'plan.json'), '{}\n');
  await git(memoria, 'add', 'plan.json');
  await git(memoria, 'commit', '-q', '-m', 'uno');
  if (conOrigen) {
    await ejecutar('git', ['init', '-q', '--bare', desnudo]);
    await git(memoria, 'remote', 'add', 'origin', 'https://github.com/ana/memoria.git');
    await git(memoria, 'config', `url.${desnudo}.pushInsteadOf`, 'https://github.com/ana/memoria.git');
  }
  return { memoria, desnudo };
}
const conTodo = async () => ({ puedeSubir: true, delStudio: false });

describe('las piezas puras del respaldo', () => {
  it('lee el repositorio de GitHub de su dirección, https o ssh', () => {
    expect(repoDeGithub('https://github.com/ana/memoria.git')).toBe('ana/memoria');
    expect(repoDeGithub('git@github.com:ana/memoria.git\n')).toBe('ana/memoria');
    expect(repoDeGithub('https://gitlab.com/ana/memoria.git')).toBeNull();
  });

  it('dice por qué falló una subida', () => {
    expect(causaDeFallo(' ! [rejected] stl -> stl (fetch first)')).toBe('rechazado');
    expect(causaDeFallo('fatal: could not read Username for https://github.com: terminal prompts disabled')).toBe('sesion');
    expect(causaDeFallo('fatal: unable to access: Could not resolve host: github.com')).toBe('sin_red');
  });

  it('sabe si es privado sin credenciales: 404 es privado, private:false es público, lo demás no se sabe', async () => {
    const con = (status: number, cuerpo: unknown = {}) => (async () => new Response(JSON.stringify(cuerpo), { status })) as unknown as typeof fetch;
    expect(await esPrivadoEnGithub('ana/m', con(404))).toBe(true);
    expect(await esPrivadoEnGithub('ana/m', con(200, { private: false }))).toBe(false);
    expect(await esPrivadoEnGithub('ana/m', con(403))).toBeNull();
    expect(await esPrivadoEnGithub('ana/m', (async () => { throw new Error('sin red'); }) as unknown as typeof fetch)).toBeNull();
  });

  it('comprueba la privacidad del respaldo: sin credenciales primero, y con la sesión aprobada si así no se supo (nmwfnnjb7tit)', async () => {
    const cuenta = async () => 'ana';
    let gh = 0;
    const conGh = async () => (gh++, true as boolean | null);
    // Si sin credenciales se supo, ni le pregunta a gh
    expect(await comprobarPrivado(cuenta, async () => true, conGh)('ana/m')).toBe(true);
    expect(await comprobarPrivado(cuenta, async () => false, conGh)('ana/m')).toBe(false);
    expect(gh).toBe(0);
    // Si así no se supo, lo confirma la sesión aprobada
    expect(await comprobarPrivado(cuenta, async () => null, conGh)('ana/m')).toBe(true);
    expect(gh).toBe(1);
    // Y si ni así, sigue sin saberse
    expect(await comprobarPrivado(cuenta, async () => null, async () => null)('ana/m')).toBeNull();
  });
});

juntas('el respaldo de la memoria en GitHub', () => {
  it('sube la rama de la memoria a un repositorio privado y dice cuándo', async () => {
    const { memoria, desnudo } = await memoria_();
    const r = new Respaldo(memoria, conTodo, async () => true);
    expect((await r.estado()).fase).toBe('nunca');
    const hecho = await r.respaldar();
    expect(hecho).toMatchObject({ fase: 'al_dia', destino: 'ana/memoria', rama: 'stl' });
    expect(await git(desnudo, 'rev-parse', 'stl')).toBe(await git(memoria, 'rev-parse', 'stl'));
    // Y lo recuerda al volver a mirar, también con un Respaldo nuevo (un reinicio del servidor)
    expect(await new Respaldo(memoria, conTodo, async () => true).estado()).toMatchObject({ fase: 'al_dia', cuando: hecho.cuando });
  });

  it('a un repositorio público no sube nada: «Sin respaldo», porque es público', async () => {
    const { memoria, desnudo } = await memoria_();
    const r = new Respaldo(memoria, conTodo, async () => false);
    expect(await r.respaldar()).toMatchObject({ fase: 'sin_respaldo', motivo: 'publico' });
    expect(await git(desnudo, 'branch', '--list')).toBe('');
    expect((await r.estado()).motivo).toBe('publico');
  });

  it('sin repositorio, sin el permiso de subir o en la memoria del mismo Studio, «Sin respaldo» y no pregunta a GitHub', async () => {
    let preguntas = 0;
    const privado = async () => (preguntas++, true);
    const sinOrigen = (await memoria_(false)).memoria;
    expect(await new Respaldo(sinOrigen, conTodo, privado).respaldar()).toMatchObject({ fase: 'sin_respaldo', motivo: 'sin_repositorio' });
    const { memoria, desnudo } = await memoria_();
    expect(await new Respaldo(memoria, async () => ({ puedeSubir: false, delStudio: false }), privado).respaldar()).toMatchObject({ fase: 'sin_respaldo', motivo: 'sin_permiso' });
    expect(await new Respaldo(memoria, async () => ({ puedeSubir: true, delStudio: true }), privado).respaldar()).toMatchObject({ fase: 'sin_respaldo', motivo: 'del_studio' });
    expect(preguntas).toBe(0);
    expect(await git(desnudo, 'branch', '--list')).toBe('');
  });

  it('la memoria del Studio va solo a su segunda dirección privada, de la cuenta aprobada, y nunca a su propio repositorio (nmwfl2c3ltit)', async () => {
    // La memoria del Studio vive en su repositorio (origin, que será público); su segunda dirección es otro repositorio
    const { memoria, desnudo } = await memoria_();
    const segundo = join(base, `segunda-${++n}.git`);
    await ejecutar('git', ['init', '-q', '--bare', segundo]);
    await git(memoria, 'config', `url.${segundo}.pushInsteadOf`, 'https://github.com/ana/stl-memoria.git');
    const delStudio = (x: object = {}) => async () => ({ puedeSubir: true, delStudio: true, segunda: 'https://github.com/ana/stl-memoria.git', cuenta: 'ana', ...x });
    const hecho = await new Respaldo(memoria, delStudio(), async () => true).respaldar();
    expect(hecho).toMatchObject({ fase: 'al_dia', destino: 'ana/stl-memoria' });
    expect(await git(segundo, 'rev-parse', 'stl')).toBe(await git(memoria, 'rev-parse', 'stl'));
    // Nada fue al repositorio del Studio
    expect(await git(desnudo, 'branch', '--list')).toBe('');
    // Con la segunda dirección igual a la suya, de otra cuenta, sin cuenta aprobada o pública: no sube
    expect(await new Respaldo(memoria, delStudio({ segunda: 'git@github.com:Ana/Memoria.git' }), async () => true).respaldar()).toMatchObject({ fase: 'sin_respaldo', motivo: 'del_studio' });
    expect(await new Respaldo(memoria, delStudio({ cuenta: 'beto' }), async () => true).respaldar()).toMatchObject({ fase: 'sin_respaldo', motivo: 'otra_cuenta' });
    expect(await new Respaldo(memoria, delStudio({ cuenta: null }), async () => true).respaldar()).toMatchObject({ fase: 'sin_respaldo', motivo: 'otra_cuenta' });
    expect(await new Respaldo(memoria, delStudio({ publicoPermitido: true }), async () => false).respaldar()).toMatchObject({ fase: 'sin_respaldo', motivo: 'publico' });
    expect(await git(desnudo, 'branch', '--list')).toBe('');
  });

  it('un repositorio público recibe el respaldo solo con el interruptor encendido (nmwf5lg39tit)', async () => {
    const { memoria, desnudo } = await memoria_();
    expect(await new Respaldo(memoria, async () => ({ puedeSubir: true, delStudio: false, publicoPermitido: false }), async () => false).respaldar()).toMatchObject({ fase: 'sin_respaldo', motivo: 'publico' });
    expect(await git(desnudo, 'branch', '--list')).toBe('');
    const r = new Respaldo(memoria, async () => ({ puedeSubir: true, delStudio: false, publicoPermitido: true }), async () => false);
    // Lo que quedó guardado como «público» no se muestra con el interruptor encendido
    expect((await r.estado()).fase).not.toBe('sin_respaldo');
    expect(await r.respaldar()).toMatchObject({ fase: 'al_dia', destino: 'ana/memoria' });
    expect(await git(desnudo, 'rev-parse', 'stl')).toBe(await git(memoria, 'rev-parse', 'stl'));
  });

  it('si GitHub tiene algo que aquí no, no lo pisa ni lo trae: «El respaldo falló», rechazado', async () => {
    const { memoria, desnudo } = await memoria_();
    const r = new Respaldo(memoria, conTodo, async () => true);
    await r.respaldar();
    // Otro commit llega a GitHub por otro lado, y aquí otro distinto
    const otro = join(base, `otro-${n}`);
    await ejecutar('git', ['clone', '-q', '-b', 'stl', desnudo, otro]);
    await git(otro, 'config', 'user.name', 'Ana');
    await git(otro, 'config', 'user.email', 'ana@x.com');
    writeFileSync(join(otro, 'otro.txt'), 'x\n');
    await git(otro, 'add', 'otro.txt');
    await git(otro, 'commit', '-q', '-m', 'de otro lado');
    await git(otro, 'push', '-q', 'origin', 'stl');
    const arriba = await git(desnudo, 'rev-parse', 'stl');
    writeFileSync(join(memoria, 'plan.json'), '{"a":1}\n');
    await git(memoria, 'commit', '-q', '-am', 'dos');
    const fallo = await r.respaldar();
    expect(fallo).toMatchObject({ fase: 'fallo', causa: 'rechazado' });
    expect(await git(desnudo, 'rev-parse', 'stl')).toBe(arriba);
    // Nada se trajo: la carpeta sigue como estaba
    expect(readFileSync(join(memoria, 'plan.json'), 'utf8')).toBe('{"a":1}\n');
    expect(await git(memoria, 'log', '--format=%s', '-1')).toBe('dos');
    expect((await r.estado()).fase).toBe('fallo');
  });

  it('si no se puede saber si es privado, no sube y lo dice', async () => {
    const { memoria, desnudo } = await memoria_();
    expect(await new Respaldo(memoria, conTodo, async () => null).respaldar()).toMatchObject({ fase: 'fallo', causa: 'no_verifica' });
    expect(await git(desnudo, 'branch', '--list')).toBe('');
  });

  it('nunca fuerza, nunca trae: el código no tiene fetch, pull ni --force', () => {
    const codigo = readFileSync(join(__dirname, 'respaldo.ts'), 'utf8').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(codigo).not.toMatch(/'(fetch|pull|merge|rebase)'|--force|'-f'/);
  });
});

const memoria_ = memoria;
