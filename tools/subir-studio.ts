// Sube el Studio a su repositorio público (ARGWABOT/STL-Sacred_Time_Line, rama main) firmado como ARGWABOT: antes de
// subir, pone la firma pública (autor y confirmador) en los commits que todavía no están en la nube, y guarda antes la
// historia de ahora en una rama de respaldo. Lo ya subido no se toca, y nunca sube a la fuerza. La carpeta sigue con la
// identidad del titular: el Studio lo reconoce por ella. Es la manera de subir el Studio: nunca con un «git push» a mano.
// Uso: node tools/subir-studio.ts            (dice qué haría, sin cambiar nada)
//      node tools/subir-studio.ts --subir    (firma lo que falte y sube)
//      node tools/subir-studio.ts --permiso  (le da a la sesión de ARGWABOT en gh el permiso «workflow»)
import { execFileSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { FIRMA, FORMATO_LOG, faltaWorkflow, filtroDeFirma, porFirmar, rangoPorSubir } from './firma.ts';

const raiz = join(import.meta.dirname, '..');
const RAMA = 'main';
const CUENTA = 'ARGWABOT'; // la cuenta de GitHub con permiso para subir
const EN_GH = [CUENTA, 'incocrea']; // cómo la conoce gh en este computador (incocrea, su nombre anterior)
const URL = `https://github.com/${CUENTA}/STL-Sacred_Time_Line.git`;
const subir = process.argv.includes('--subir');

const tokenDe = (u: string) => spawnSync('gh', ['auth', 'token', '--user', u], { encoding: 'utf8' });
const usuario = EN_GH.find((u) => tokenDe(u).status === 0);
if (!usuario) throw new Error(`gh no tiene la sesión de ${CUENTA}: corre gh auth login con esa cuenta y vuelve a correr esto.`);
const sinWorkflow = (t: string) => {
  const r = spawnSync('gh', ['api', '-i', 'user'], { env: { ...process.env, GH_TOKEN: t }, encoding: 'utf8' });
  return r.status === 0 && faltaWorkflow(r.stdout);
};

// --permiso: gh auth refresh solo renueva la cuenta activa de gh, que puede no ser ARGWABOT. Esto la activa, le pide el
// permiso «workflow» (abre el navegador) y deja activa la que estaba
if (process.argv.includes('--permiso')) {
  const gh = (...a: string[]) => spawnSync('gh', a, { stdio: 'inherit' }).status === 0;
  const { GH_TOKEN: _, ...sinToken } = process.env;
  const activa = spawnSync('gh', ['api', 'user', '--jq', '.login'], { env: sinToken, encoding: 'utf8' }).stdout.trim();
  const cambia = activa.toLowerCase() !== usuario.toLowerCase();
  if (cambia && !gh('auth', 'switch', '-h', 'github.com', '-u', usuario)) throw new Error(`No pude activar la sesión de ${usuario} en gh.`);
  const ok = gh('auth', 'refresh', '-h', 'github.com', '-s', 'workflow');
  if (cambia && activa) gh('auth', 'switch', '-h', 'github.com', '-u', activa);
  if (!ok || sinWorkflow(tokenDe(usuario).stdout.trim())) throw new Error(`La sesión de ${CUENTA} en gh sigue sin el permiso «workflow». Vuelve a correr esto y, en el navegador, acepta con ${CUENTA}.`);
  console.log(`Listo: la sesión de ${CUENTA} en gh ya tiene el permiso «workflow»${cambia && activa ? ` (y ${activa} sigue siendo tu cuenta activa)` : ''}.`);
  process.exit(0);
}

const token = tokenDe(usuario).stdout.trim();
const conToken = ['-c', 'credential.helper=', '-c', 'credential.helper=!f() { echo username=x-access-token; echo "password=$GH_TOKEN"; }; f'];
const env = { ...process.env, GH_TOKEN: token, FILTER_BRANCH_SQUELCH_WARNING: '1' };
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
console.log(faltan.length ? `Por firmar como ${FIRMA.nombre}: ${faltan.length}.` : `Todos ya van firmados como ${FIRMA.nombre}.`);
if (!subir) {
  console.log('No cambié nada. Con --subir, los firmo y los subo.');
  process.exit(0);
}

// Sin el permiso «workflow», GitHub rechaza la subida por .github/workflows/: se dice antes de firmar nada
if (sinWorkflow(token) && git('ls-files', '.github/workflows')) {
  throw new Error(`A la sesión de ${CUENTA} en gh le falta el permiso «workflow», y sin él GitHub no deja subir la integración continua (.github/workflows). Corre node tools/subir-studio.ts --permiso, acepta en el navegador con ${CUENTA}, y vuelve a correr esto.`);
}

if (faltan.length) {
  // El respaldo, antes de cambiar nada: la historia de ahora, con la fecha y la hora en su nombre
  const respaldo = `respaldo/antes-de-subir-${new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-')}`;
  git('branch', respaldo, RAMA);
  // -f: un filter-branch anterior deja su copia en refs/original; el respaldo de esta vez ya es la rama de arriba
  git('filter-branch', '-f', '--env-filter', filtroDeFirma(), rango);
  const quedan = porFirmar(git('log', `--format=${FORMATO_LOG}`, rango));
  if (quedan.length) throw new Error(`Quedaron ${quedan.length} commit(s) sin firmar: no subo. La historia de antes está en ${respaldo}.`);
  console.log(`Firmados como ${FIRMA.nombre} (la historia de antes quedó en la rama ${respaldo}).`);
}
const empuje = spawnSync('git', [...conToken, 'push', URL, `${RAMA}:${RAMA}`], { cwd: raiz, env, stdio: 'inherit' });
if (empuje.status !== 0) {
  console.error(`\nNO SUBÍ: GitHub rechazó la subida (arriba, el porqué). Los commits ya quedaron firmados como ${FIRMA.nombre}: arregla lo que dice y vuelve a correr esto, que solo sube.`);
  process.exit(1);
}
// Que de verdad quedó allá: la rama de GitHub tiene que apuntar a lo de aquí
if (nube('ls-remote', '--heads', URL, RAMA).split(/\s+/)[0] !== git('rev-parse', RAMA)) throw new Error(`Subí, pero la rama ${RAMA} de GitHub no quedó igual a la de aquí: revísala.`);
console.log(`Subido: https://github.com/${CUENTA}/STL-Sacred_Time_Line (rama ${RAMA}).`);
