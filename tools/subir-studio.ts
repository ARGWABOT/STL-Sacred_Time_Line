// Sube el Studio a su repositorio público (ARGWABOT/STL-Sacred_Time_Line, rama main), con la sesión de ARGWABOT en gh,
// nunca con la cuenta activa. Solo comprueba y sube (propuesta aceptada «Lo que se sube, limpio y firmado desde el commit»,
// punto 1): cada commit del Studio nace firmado como ARGWABOT, autor y confirmador (tools/director/firmar.ts), así que
// subir no reescribe nada y los códigos que cita el plan siguen siendo los de main. Si algo por subir no va firmado, lo
// dice y no sube; firmarlo es un paso aparte, explícito (--firmar), solo de lo que aún no está en la nube y con su rama de
// respaldo, porque cambia los códigos de esos commits. Lo ya subido no se toca, y nunca sube a la fuerza (para rehacer
// lo publicado está tools/historia-limpia.ts, con el «Confirmo» del titular). La carpeta sigue con la identidad del
// titular: el Studio lo reconoce por ella. Es la manera de subir el Studio: nunca con un «git push» a mano.
// Uso: node tools/subir-studio.ts            (dice qué haría, sin cambiar nada)
//      node tools/subir-studio.ts --subir    (comprueba que todo vaya firmado y sube)
//      node tools/subir-studio.ts --firmar   (firma lo que aún no subió y no va firmado, con su respaldo; no sube)
//      node tools/subir-studio.ts --permiso  (le da a la sesión de ARGWABOT en gh el permiso «workflow»)
import { execFileSync, spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { FIRMA, FORMATO_LOG, faltaWorkflow, filtroDeFirma, porFirmar, rangoPorSubir } from './firma.ts';

// Solo las pruebas cambian el Studio (STL_RAIZ) y adónde sube (STL_SUBIR_URL, un repositorio de prueba, sin gh)
const raiz = process.env.STL_RAIZ ? resolve(process.env.STL_RAIZ) : join(import.meta.dirname, '..');
const RAMA = 'main';
const CUENTA = 'ARGWABOT'; // la cuenta de GitHub con permiso para subir
const EN_GH = [CUENTA, 'incocrea']; // cómo la conoce gh en este computador (incocrea, su nombre anterior)
const deprueba = process.env.STL_SUBIR_URL;
const URL = deprueba || `https://github.com/${CUENTA}/STL-Sacred_Time_Line.git`;
const subir = process.argv.includes('--subir');
const firmar = process.argv.includes('--firmar');

const tokenDe = (u: string) => spawnSync('gh', ['auth', 'token', '--user', u], { encoding: 'utf8' });
const sinWorkflow = (t: string) => {
  const r = spawnSync('gh', ['api', '-i', 'user'], { env: { ...process.env, GH_TOKEN: t }, encoding: 'utf8' });
  return r.status === 0 && faltaWorkflow(r.stdout);
};

// --permiso: entra a gh con ARGWABOT y el permiso «workflow» (abre el navegador), y deja activa la cuenta que estaba.
// No usa gh auth switch ni refresh: gh puede guardar el token de una cuenta (incocrea) sin tenerla en su lista, y
// entonces ninguno de los dos la encuentra; gh auth login la agrega a la lista, o la renueva si ya estaba
if (process.argv.includes('--permiso')) {
  const { GH_TOKEN: _, ...sinToken } = process.env;
  const gh = (...a: string[]) => spawnSync('gh', a, { env: sinToken, stdio: 'inherit' }).status === 0;
  const login = () => spawnSync('gh', ['api', 'user', '--jq', '.login'], { env: sinToken, encoding: 'utf8' }).stdout.trim();
  const activa = login();
  console.log(`En el navegador, entra a GitHub con la cuenta ${CUENTA} (si ves otra, cierra su sesión primero) y acepta.`);
  const ok = gh('auth', 'login', '-h', 'github.com', '-p', 'https', '-s', 'workflow', '-w');
  const entro = login();
  if (activa && entro.toLowerCase() !== activa.toLowerCase()) gh('auth', 'switch', '-h', 'github.com', '-u', activa);
  if (!ok) throw new Error('gh no terminó de entrar: vuelve a correr esto.');
  if (entro.toLowerCase() !== CUENTA.toLowerCase()) throw new Error(`Entraste con ${entro || 'otra cuenta'}, no con ${CUENTA}: en el navegador, cierra esa sesión de GitHub, entra con ${CUENTA} y vuelve a correr esto.`);
  if (sinWorkflow(tokenDe(CUENTA).stdout.trim())) throw new Error(`La sesión de ${CUENTA} en gh sigue sin el permiso «workflow»: vuelve a correr esto.`);
  console.log(`Listo: la sesión de ${CUENTA} en gh ya tiene el permiso «workflow»${activa && activa.toLowerCase() !== CUENTA.toLowerCase() ? ` (y ${activa} sigue siendo tu cuenta activa)` : ''}. Ahora: node tools/subir-studio.ts --subir`);
  process.exit(0);
}

// El token de ARGWABOT, nunca el de la cuenta activa (en las pruebas, ninguno: suben a un repositorio local)
let token = '';
if (!deprueba) {
  const usuario = EN_GH.find((u) => tokenDe(u).status === 0);
  if (!usuario) throw new Error(`gh no tiene la sesión de ${CUENTA}: corre node tools/subir-studio.ts --permiso y vuelve a correr esto.`);
  token = tokenDe(usuario).stdout.trim();
}
const conToken = token ? ['-c', 'credential.helper=', '-c', 'credential.helper=!f() { echo username=x-access-token; echo "password=$GH_TOKEN"; }; f'] : [];
const env = { ...process.env, ...(token ? { GH_TOKEN: token } : {}), FILTER_BRANCH_SQUELCH_WARNING: '1', GIT_TERMINAL_PROMPT: '0' };
const git = (...a: string[]) => execFileSync('git', a, { cwd: raiz, env, encoding: 'utf8' }).trim();
const nube = (...a: string[]) => git(...conToken, ...a);

if (git('branch', '--show-current') !== RAMA) throw new Error(`Para subir el Studio hay que estar en la rama ${RAMA}.`);
if (git('status', '--porcelain', '--untracked-files=no')) throw new Error('Hay cambios sin guardar en el Studio: haz su commit (o descártalos) y vuelve a correr esto.');

// Lo último subido: la rama main de la nube, si ya existe. Tiene que estar en la historia de aquí (si no, alguien subió
// otra cosa, y subir encima la borraría: eso no se hace)
const subido = nube('ls-remote', '--heads', URL, RAMA).split(/\s+/)[0] || null;
if (subido) {
  if (spawnSync('git', ['cat-file', '-e', `${subido}^{commit}`], { cwd: raiz }).status !== 0) nube('fetch', '-q', URL, RAMA);
  if (spawnSync('git', ['merge-base', '--is-ancestor', subido, RAMA], { cwd: raiz }).status !== 0) {
    throw new Error(`La rama ${RAMA} de GitHub tiene commits que aquí no están (${subido.slice(0, 7)}): no subo encima. Revisa qué se subió por otro lado.`);
  }
}
const rango = rangoPorSubir(RAMA, subido);
const nuevos = git('rev-list', '--count', rango);
if (nuevos === '0') {
  console.log(`El Studio ya está al día en GitHub (${URL}): no hay nada que subir.`);
  process.exit(0);
}
const faltan = porFirmar(git('log', `--format=${FORMATO_LOG}`, rango));
console.log(`Por subir: ${nuevos} commit(s) de ${RAMA}${subido ? ` (desde ${subido.slice(0, 7)})` : ' (la rama aún no existe en GitHub)'}.`);
console.log(faltan.length ? `Sin la firma pública (${FIRMA.nombre}, autor y confirmador): ${faltan.length}.` : `Todos van firmados como ${FIRMA.nombre}.`);

// --firmar: lo que aún no subió y no va firmado, firmado como ARGWABOT, con la historia de antes en una rama de respaldo.
// Cambia los códigos de esos commits (y los de los que les siguen): las citas del plan a ellos quedan en el respaldo
if (firmar) {
  if (!faltan.length) {
    console.log('No hay nada que firmar.');
    process.exit(0);
  }
  const respaldo = `respaldo/antes-de-firmar-${new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-')}`;
  git('branch', respaldo, RAMA);
  // -f: un filter-branch anterior deja su copia en refs/original; el respaldo de esta vez ya es la rama de arriba
  git('filter-branch', '-f', '--env-filter', filtroDeFirma(), rango);
  const quedan = porFirmar(git('log', `--format=${FORMATO_LOG}`, rango));
  if (quedan.length) throw new Error(`Quedaron ${quedan.length} commit(s) sin firmar. La historia de antes está en ${respaldo}.`);
  console.log(`Firmados como ${FIRMA.nombre}: ${faltan.length} (la historia de antes quedó en la rama ${respaldo}). Ahora: node tools/subir-studio.ts --subir`);
  process.exit(0);
}

if (faltan.length) {
  const cuales = faltan.slice(0, 5).map((c) => `${c.hash.slice(0, 7)} (${c.autor})`).join(', ');
  const mensaje = `${faltan.length} commit(s) por subir no llevan la firma pública: ${cuales}${faltan.length > 5 ? ', …' : ''}. Los commits del Studio nacen firmados con node tools/director/firmar.ts; para firmar estos, que aún no están en GitHub, corre node tools/subir-studio.ts --firmar (cambia sus códigos y guarda antes la historia en una rama de respaldo) y vuelve a correr esto.`;
  if (!subir) {
    console.log(`${mensaje}\nNo cambié nada.`);
    process.exit(0);
  }
  console.error(`\nNO SUBÍ: ${mensaje}`);
  process.exit(1);
}
if (!subir) {
  console.log('No cambié nada. Con --subir, los subo.');
  process.exit(0);
}

// Sin el permiso «workflow», GitHub rechaza la subida por .github/workflows/: se dice antes de intentarla
if (token && sinWorkflow(token) && git('ls-files', '.github/workflows')) {
  throw new Error(`A la sesión de ${CUENTA} en gh le falta el permiso «workflow», y sin él GitHub no deja subir la integración continua (.github/workflows). Corre node tools/subir-studio.ts --permiso, acepta en el navegador con ${CUENTA}, y vuelve a correr esto.`);
}
const empuje = spawnSync('git', [...conToken, 'push', URL, `${RAMA}:${RAMA}`], { cwd: raiz, env, stdio: 'inherit' });
if (empuje.status !== 0) {
  console.error('\nNO SUBÍ: GitHub rechazó la subida (arriba, el porqué). Arregla lo que dice y vuelve a correr esto.');
  process.exit(1);
}
// Que de verdad quedó allá: la rama de GitHub tiene que apuntar a lo de aquí
if (nube('ls-remote', '--heads', URL, RAMA).split(/\s+/)[0] !== git('rev-parse', RAMA)) throw new Error(`Subí, pero la rama ${RAMA} de GitHub no quedó igual a la de aquí: revísala.`);
console.log(`Subido: https://github.com/${CUENTA}/STL-Sacred_Time_Line (rama ${RAMA}).`);
