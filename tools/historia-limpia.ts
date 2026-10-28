// Rehace la historia publicada del Studio en un solo commit, con el Studio de hoy: para cuando lo publicado guarda algo que
// no debe estar a la vista de nadie (un correo, un dato de un cliente) y quitarlo de los archivos no basta, porque la
// historia lo conserva (nota de voz del titular del 27 de octubre de 2026, pedido pd_cuenta_ajena). Es lo único del Studio
// que sube a la fuerza, así que la corre solo el titular, en su terminal, y solo con los dos pasos del Studio: lo aprobó y
// respondió «Confirmo», con lo que se pierde a la vista. Antes de cambiar nada guarda la historia de ahora en una rama de
// respaldo, solo en este computador, que la búsqueda del director sigue leyendo. El commit nuevo trae el mismo código, la
// firma pública y la fecha del último commit, así que «lo que cambió desde la última revisión» sigue contando bien. La
// página (gh-pages), las memorias (stl) y la identidad de git de la carpeta no se tocan. Sube con la sesión de ARGWABOT en
// gh, nunca con la activa, como tools/subir-studio.ts, y con --force-with-lease: si GitHub cambió mientras tanto, no sube.
// Uso: node tools/historia-limpia.ts            (dice qué haría y lo que se pierde, sin cambiar nada)
//      node tools/historia-limpia.ts --rehacer  (la rehace y la sube)
import { execFileSync, spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { entornoDeFirma, FIRMA, mensajeDeHistoriaNueva, respaldoDeHistoria, textoParaSoporte } from './firma.ts';

// Solo las pruebas cambian el Studio (STL_RAIZ) y adónde sube (STL_HISTORIA_URL, un repositorio de prueba, sin gh)
const raiz = process.env.STL_RAIZ ? resolve(process.env.STL_RAIZ) : join(import.meta.dirname, '..');
const RAMA = 'main';
const CUENTA = 'ARGWABOT';
const REPOSITORIO = `${CUENTA}/STL-Sacred_Time_Line`;
const EN_GH = [CUENTA, 'incocrea']; // cómo la conoce gh en este computador, como en subir-studio.ts
const deprueba = process.env.STL_HISTORIA_URL;
const URL = deprueba || `https://github.com/${REPOSITORIO}.git`;
const rehacer = process.argv.includes('--rehacer');

/** Algo que se niega antes de cambiar nada. */
class Rechazo extends Error {}

function principal(): number {
  // El token de ARGWABOT, nunca el de la cuenta activa de gh
  let token = '';
  if (!deprueba) {
    const tokenDe = (u: string) => spawnSync('gh', ['auth', 'token', '--user', u], { encoding: 'utf8' });
    const usuario = EN_GH.find((u) => tokenDe(u).status === 0);
    if (!usuario) throw new Rechazo(`gh no tiene la sesión de ${CUENTA}: corre node tools/subir-studio.ts --permiso y vuelve a correr esto.`);
    token = tokenDe(usuario).stdout.trim();
  }
  const conToken = token ? ['-c', 'credential.helper=', '-c', 'credential.helper=!f() { echo username=x-access-token; echo "password=$GH_TOKEN"; }; f'] : [];
  const env = { ...process.env, ...(token ? { GH_TOKEN: token } : {}), GIT_TERMINAL_PROMPT: '0' };
  const git = (...a: string[]) => execFileSync('git', a, { cwd: raiz, env, encoding: 'utf8' }).trim();
  const sale = (...a: string[]) => spawnSync('git', a, { cwd: raiz, env }).status === 0;
  const nube = (...a: string[]) => git(...conToken, ...a);
  const enGitHub = () => nube('ls-remote', '--heads', URL, RAMA).split(/\s+/)[0] || null;

  if (git('branch', '--show-current') !== RAMA) throw new Rechazo(`Para rehacer la historia hay que estar en la rama ${RAMA}.`);
  if (git('status', '--porcelain', '--untracked-files=no')) throw new Rechazo('Hay cambios sin guardar en el Studio: haz su commit (o descártalos) y vuelve a correr esto.');
  const subido = enGitHub();
  if (!subido) throw new Rechazo(`La rama ${RAMA} aún no está en GitHub: no hay historia publicada que rehacer.`);
  if (!sale('cat-file', '-e', `${subido}^{commit}`)) nube('fetch', '-q', URL, RAMA);
  // Lo de GitHub tiene que estar aquí: si no, alguien subió otra cosa, y rehacer encima la borraría
  if (!sale('merge-base', '--is-ancestor', subido, RAMA)) throw new Rechazo(`La rama ${RAMA} de GitHub tiene commits que aquí no están (${subido.slice(0, 7)}): no rehago nada encima. Revisa qué se subió por otro lado.`);
  const local = git('rev-parse', RAMA);
  const cuantos = Number(git('rev-list', '--count', RAMA));
  if (cuantos === 1 && local === subido) {
    console.log(`La historia publicada de ${RAMA} ya es un solo commit: no hay nada que rehacer.`);
    return 0;
  }
  const publicados = Number(git('rev-list', '--count', subido));
  const primero = git('rev-list', '--max-parents=0', subido).split('\n')[0];
  const fecha = git('log', '-1', '--format=%cI', RAMA);
  const mensaje = mensajeDeHistoriaNueva(fecha);
  const respaldo = respaldoDeHistoria(new Date());
  // Lo que sobra de antes (propuesta aceptada pr_subida_limpia, punto 4): las ramas de respaldo de cada subida y de cada
  // firma, y la copia que deja filter-branch. Sale solo lo que no guarda nada propio: cada estado suyo está en la historia
  // de ahora, que queda entera en el respaldo de hoy. Lo demás se queda, y se dice
  const estados = new Set(git('log', '--format=%T', RAMA).split('\n'));
  const viejas = git('for-each-ref', '--format=%(refname)', 'refs/heads/respaldo/antes-de-subir-*', 'refs/heads/respaldo/antes-de-firmar-*', 'refs/heads/respaldo/firma-*', 'refs/original/')
    .split('\n').filter(Boolean);
  const contenida = (ref: string) => git('log', '--format=%T', ref).split('\n').every((t) => estados.has(t));
  const sobran = viejas.filter(contenida);
  const propias = viejas.filter((r) => !sobran.includes(r));
  const corto = (ref: string) => ref.replace(/^refs\/heads\//, '').replace(/^refs\/original\/refs\/heads\//, 'la copia de filter-branch de ');

  console.log(`\nSTL Studio · rehacer la historia publicada (${REPOSITORIO}, rama ${RAMA})\n`);
  console.log(`  Lo que queda: un solo commit con el Studio de hoy, el mismo código, firmado como ${FIRMA.nombre}:`);
  console.log(`    «${mensaje}»`);
  console.log(`  Lo que se pierde en GitHub: los ${publicados} commits publicados de ${RAMA}, con sus mensajes y sus fechas, dejan de verse en su historia${cuantos - publicados === 1 ? ' (el commit de aquí que aún no subía va dentro del commit único)' : cuantos > publicados ? ` (los ${cuantos - publicados} de aquí que aún no subían van dentro del commit único)` : ''}.`);
  console.log(`  Aquí: ${RAMA} empieza en ese commit, y la historia de ahora queda en la rama ${respaldo}, solo en este computador.`);
  if (sobran.length) console.log(`  Se borran, porque todo lo que guardan ya está en esa historia: ${sobran.map(corto).join(', ')}.`);
  if (propias.length) console.log(`  Se quedan, porque guardan algo que no está en ella: ${propias.map(corto).join(', ')}.`);
  console.log('  No se tocan: la página (gh-pages), la memoria de los proyectos (stl) ni tu identidad de git.');
  console.log('  GitHub puede seguir mostrando un commit viejo a quien tenga su dirección exacta, hasta que su soporte lo borre: al terminar te dejo el texto para pedírselo.\n');
  if (!rehacer) {
    console.log('No cambié nada. Con --rehacer, la rehago y la subo.');
    return 0;
  }

  // El respaldo, antes de cambiar nada; después, el commit único con el árbol de hoy, y main apunta a él (el código de
  // la carpeta es el mismo, así que no cambia ningún archivo)
  git('branch', respaldo, RAMA);
  const arbol = git('rev-parse', `${RAMA}^{tree}`);
  const nuevo = execFileSync('git', ['commit-tree', arbol, '-m', mensaje], { cwd: raiz, env: { ...env, ...entornoDeFirma(FIRMA), GIT_AUTHOR_DATE: fecha, GIT_COMMITTER_DATE: fecha }, encoding: 'utf8' }).trim();
  git('update-ref', `refs/heads/${RAMA}`, nuevo, local);
  const empuje = spawnSync('git', [...conToken, 'push', `--force-with-lease=${RAMA}:${subido}`, URL, `${RAMA}:${RAMA}`], { cwd: raiz, env, stdio: 'inherit' });
  if (empuje.status !== 0) {
    git('update-ref', `refs/heads/${RAMA}`, local, nuevo);
    console.error(`\nNO SUBÍ: GitHub rechazó la subida (arriba, el porqué). ${RAMA} quedó como estaba, aquí y en GitHub (la rama ${respaldo} es una copia de lo mismo). Arregla lo que dice y vuelve a correr esto.`);
    return 1;
  }
  // Que de verdad quedó allá
  if (enGitHub() !== nuevo) throw new Error(`Subí, pero la rama ${RAMA} de GitHub no quedó igual a la de aquí: revísala. La historia de antes está en la rama ${respaldo}.`);
  // Ya subida, sale lo que sobra de antes: queda solo el respaldo de hoy
  for (const ref of sobran) git('update-ref', '-d', ref);
  console.log(`\nListo: la rama ${RAMA} de GitHub tiene un solo commit, el Studio de hoy. La historia de antes quedó en la rama ${respaldo}, solo en este computador${sobran.length ? `, y borré ${sobran.length === 1 ? 'el respaldo viejo, que ya estaba en ella' : `los ${sobran.length} respaldos viejos, que ya estaban en ella`}` : ''}.`);
  console.log(`\nPara que GitHub borre también lo que guarda en caché: entra con ${CUENTA} a https://support.github.com/contact, pide quitar datos sensibles (sensitive data removal) y pega este texto:\n`);
  console.log(textoParaSoporte(REPOSITORIO, { cuantos: publicados, primero, ultimo: subido }, new Date().toISOString()));
  return 0;
}

try {
  process.exitCode = principal();
} catch (e) {
  console.error(`\n✗ ${(e as Error).message}${e instanceof Rechazo ? '\n\nNo cambié nada.' : ''}`);
  process.exitCode = 1;
}
