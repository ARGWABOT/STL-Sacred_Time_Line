// Sube el Studio a su repositorio público (ARGWABOT/STL-Sacred_Time_Line, rama main) firmado como ARGWABOT: antes de
// subir, pone la firma pública (autor y confirmador) en los commits que todavía no están en la nube, y guarda antes la
// historia de ahora en una rama de respaldo. Lo ya subido no se toca, y nunca sube a la fuerza. La carpeta sigue con la
// identidad del titular: el Studio lo reconoce por ella. Es la manera de subir el Studio: nunca con un «git push» a mano.
// Uso: node tools/subir-studio.ts            (dice qué haría, sin cambiar nada)
//      node tools/subir-studio.ts --subir    (firma lo que falte y sube)
import { execFileSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { FIRMA, FORMATO_LOG, filtroDeFirma, porFirmar, rangoPorSubir } from './firma.ts';

const raiz = join(import.meta.dirname, '..');
const RAMA = 'main';
const CUENTA = 'ARGWABOT'; // la cuenta de GitHub con permiso para subir
const EN_GH = [CUENTA, 'incocrea']; // cómo la conoce gh en este computador (incocrea, su nombre anterior)
const URL = `https://github.com/${CUENTA}/STL-Sacred_Time_Line.git`;
const subir = process.argv.includes('--subir');

const token = EN_GH.map((u) => spawnSync('gh', ['auth', 'token', '--user', u], { encoding: 'utf8' })).find((r) => r.status === 0)?.stdout.trim();
if (!token) throw new Error(`gh no tiene la sesión de ${CUENTA}: corre gh auth login con esa cuenta y vuelve a correr esto.`);
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
execFileSync('git', [...conToken, 'push', URL, `${RAMA}:${RAMA}`], { cwd: raiz, env, stdio: 'inherit' });
console.log(`Subido: https://github.com/${CUENTA}/STL-Sacred_Time_Line (rama ${RAMA}).`);
