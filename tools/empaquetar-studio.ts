// Arma el paquete de instalación del Studio (pedido pd_paquete): un solo zip liviano, para todos los sistemas, sacado del último
// commit, sin node_modules, sin datos ni memoria de ningún proyecto, con la semilla de STL Studio y sus notas cortas. Lo deja en
// .estudio/paquete/, fuera de git, y lo comprueba entero: lista lo que lleva, lo descomprime en memoria y mira su versión. Si
// encuentra algo de lo que nunca va, no deja el zip. No publica nada: eso es de --publicar, que la versión va a la vista de
// todos, marcada «Pre-release», con la sesión de gh de la cuenta aprobada para este proyecto, como tools/subir-studio.ts.
// Uso: node tools/empaquetar-studio.ts             (lo arma y dice las órdenes para publicarlo; no publica)
//      node tools/empaquetar-studio.ts --publicar  (lo arma otra vez y publica esa versión: primero se sube el commit)
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { crc32, inflateRawSync } from 'node:zlib';
import { mensajeDeCuenta, sesionAprobada } from '../src/director/cuentaGit.ts';
import { cuentaGitDeCarpeta, leerLocalYa } from '../src/director/proyectos.ts';
import { FIRMA, FORMATO_LOG, porFirmar } from './firma.ts';

const REPOSITORIO = 'ARGWABOT/STL-Sacred_Time_Line';
const RAMA = 'main';
/** Lo que un zip sin esto no sirve para instalar: entre ello, la semilla de STL Studio en sus dos idiomas. */
export const OBLIGATORIOS = ['package.json', 'package-lock.json', 'README.md', 'README.es.md', 'INSTALL.md', 'INSTALAR.md', 'LICENSE', 'plantilla/semilla/es.json', 'plantilla/semilla/en.json'];

export const nombreDelZip = (version: string) => `stl-studio-${version}.zip`;
export const carpetaDelZip = (version: string) => `stl-studio-${version}`;

/**
 * Por qué una ruta del paquete no puede ir, o null si puede. Nunca: dependencias, datos o memoria de un proyecto, ni lo propio
 * de este computador. La plantilla donde nace cada proyecto (plantilla/plan.json) no es la memoria de nadie. Pura.
 */
export function rutaProhibida(ruta: string): string | null {
  const partes = ruta.replace(/\\/g, '/').split('/').filter(Boolean);
  const nombre = partes.at(-1) ?? '';
  if (partes.includes('node_modules')) return 'las dependencias';
  if (partes.includes('proyectos')) return 'los datos de un proyecto';
  if (partes.includes('.stl')) return 'la memoria de un proyecto';
  if (partes.includes('.estudio') || partes.includes('.revisiones') || partes.includes('publico')) return 'lo propio de este computador';
  // Las reglas de autor y lo personal de quien desarrolla el Studio (ajustesClaude.ts › CARPETA_AUTOR; nmw5gt698tit)
  if (partes[0] === 'autor') return 'las reglas y lo personal del autor';
  if (nombre.startsWith('estudio.local.json')) return 'la configuración de este computador';
  if (nombre === '.env' || nombre.startsWith('.env.')) return 'un archivo de claves';
  const i = partes.indexOf('director');
  if (i >= 0 && ['plan.json', 'mapa.json', 'linea.jsonl', 'cambios.json', 'archivo.json', 'radiografia.md', 'equipo', 'notas', 'archivo'].includes(partes[i + 1] ?? '') && partes[0] !== 'tools') return 'la memoria de un director';
  return null;
}

/** Lo que falla en la lista de un zip: lo que no debe ir, con su motivo, y lo que le falta. Pura. */
export function revisarContenido(rutas: readonly string[], version: string): string[] {
  const prefijo = `${carpetaDelZip(version)}/`;
  const fuera = rutas.filter((r) => !r.startsWith(prefijo)).map((r) => `${r}: va fuera de la carpeta ${prefijo}`);
  const dentro = rutas.filter((r) => r.startsWith(prefijo)).map((r) => r.slice(prefijo.length));
  const prohibidas = dentro.flatMap((r) => {
    const porque = rutaProhibida(r);
    return porque ? [`${r}: ${porque}`] : [];
  });
  const faltan = OBLIGATORIOS.filter((o) => !dentro.includes(o)).map((o) => `falta ${o}`);
  return [...fuera, ...prohibidas, ...faltan];
}

/**
 * Lee un zip, sin nada más que Node: cada archivo, descomprimido y con su suma comprobada, en vez de creerle a su índice.
 * Lanza un error si está dañado. Pura.
 */
export function leerZip(zip: Buffer): { ruta: string; datos: Buffer }[] {
  // El final del índice va al final del archivo, con su firma: un comentario lo correría, y buscarlo hacia atrás lo encuentra igual
  let fin = zip.length - 22;
  while (fin >= 0 && zip.readUInt32LE(fin) !== 0x06054b50) fin--;
  if (fin < 0) throw new Error('No es un zip: no tiene su índice.');
  const cuantos = zip.readUInt16LE(fin + 10);
  let p = zip.readUInt32LE(fin + 16);
  const entradas: { ruta: string; datos: Buffer }[] = [];
  for (let n = 0; n < cuantos; n++) {
    if (zip.readUInt32LE(p) !== 0x02014b50) throw new Error('El índice del zip está dañado.');
    const metodo = zip.readUInt16LE(p + 10);
    const suma = zip.readUInt32LE(p + 16);
    const comprimido = zip.readUInt32LE(p + 20);
    const largoNombre = zip.readUInt16LE(p + 28);
    const largoExtra = zip.readUInt16LE(p + 30);
    const largoComentario = zip.readUInt16LE(p + 32);
    const local = zip.readUInt32LE(p + 42);
    const ruta = zip.toString('utf8', p + 46, p + 46 + largoNombre);
    p += 46 + largoNombre + largoExtra + largoComentario;
    if (ruta.endsWith('/')) continue;
    const inicio = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const crudo = zip.subarray(inicio, inicio + comprimido);
    const datos = metodo === 0 ? Buffer.from(crudo) : inflateRawSync(crudo);
    if (crc32(datos) !== suma) throw new Error(`${ruta} está dañado dentro del zip.`);
    entradas.push({ ruta, datos });
  }
  return entradas;
}

/**
 * El zip del commit que se pida. `git archive` solo lleva lo que git guarda, así que lo ignorado no cabe, y sin convertir finales
 * de línea: el mismo paquete sirve en cualquier sistema, y un script con finales de Windows no corre en Linux.
 */
export function armarZip(raiz: string, commit: string, salida: string, version: string): void {
  execFileSync('git', ['-c', 'core.autocrlf=false', '-c', 'core.eol=lf', 'archive', '--format=zip', `--prefix=${carpetaDelZip(version)}/`, '-o', salida, commit], { cwd: raiz });
}

/** Comprueba el zip ya armado: lo que lleva, que se descomprime y su versión. Dice lo que falla; vacío, si está bien. */
export function comprobarZip(zip: Buffer, version: string): string[] {
  const entradas = leerZip(zip);
  const fallas = revisarContenido(entradas.map((e) => e.ruta), version);
  const paquete = entradas.find((e) => e.ruta === `${carpetaDelZip(version)}/package.json`);
  if (paquete && JSON.parse(paquete.datos.toString('utf8')).version !== version) fallas.push(`su package.json no dice la versión ${version}`);
  return fallas;
}

/**
 * Las notas de la versión: cortas, en inglés con su versión en español debajo (t_decide_paquete_notas): qué es, cómo se instala
 * con su enlace al README y lo que aún no se probó, dicho en vez de prometido. Sin un Mac a mano, y con la segunda prueba en una
 * Ubuntu (t_decide_segundo_sistema). Pura.
 */
export function notasDeLaVersion(version: string): string {
  const zip = nombreDelZip(version);
  const repo = `https://github.com/${REPOSITORIO}`;
  return `# STL Studio ${version}

STL Studio is a small local web app that sits between you and an AI model and turns the model into your project's assistant director: everything you tell it goes through one channel, and you get one mission at a time. This is the first usable version, and it can still change.

**Install:** download \`${zip}\`, unzip it, open the folder with Claude Code and ask it to «initialize STL Studio». The steps are in the [README](${repo}#install). The package comes without its dependencies: the agent installs them.

**Not tested yet:** macOS, for lack of a Mac, and Codex and Cursor as the agent. It is used every day on Windows 11 with Claude Code; the clean-computer installations, on Windows and on Ubuntu, are being tested with this very version.

---

STL Studio es una pequeña aplicación web local que se pone entre tú y un modelo de IA y lo vuelve el director asistente de tu proyecto: todo lo que le dices pasa por un solo canal, y recibes una misión a la vez. Es la primera versión que se puede usar, y todavía puede cambiar.

**Instalar:** baja \`${zip}\`, descomprímelo, abre la carpeta con Claude Code y pídele «inicializa STL Studio». Los pasos están en el [README](${repo}/blob/main/README.es.md#instalar). El paquete viene sin sus dependencias: las instala el agente.

**Aún sin probar:** macOS, por no tener un Mac, y Codex y Cursor como agente. Se usa todos los días en Windows 11 con Claude Code; las instalaciones en un computador limpio, en Windows y en Ubuntu, se están probando con esta misma versión.
`;
}

/** La orden que publica la versión, de ese commit y marcada «Pre-release». Pura. */
export function ordenDePublicar(version: string, commit: string, zip: string, notas: string): string[] {
  return ['release', 'create', `v${version}`, zip, '--repo', REPOSITORIO, '--target', commit, '--prerelease', '--title', `STL Studio ${version}`, '--notes-file', notas];
}

function principal(): number {
  const raiz = join(import.meta.dirname, '..');
  const git = (...a: string[]) => execFileSync('git', a, { cwd: raiz, encoding: 'utf8' }).trim();
  const publicar = process.argv.includes('--publicar');
  const version = String(JSON.parse(git('show', 'HEAD:package.json')).version);
  if (git('branch', '--show-current') !== RAMA) return rechazo(`El paquete sale de la rama ${RAMA}.`);
  if (git('status', '--porcelain', '--untracked-files=no')) return rechazo('Hay cambios sin guardar en el Studio: el paquete sale del último commit. Haz su commit y vuelve a correr esto.');
  const commit = git('rev-parse', 'HEAD');
  const sinFirma = porFirmar(git('log', '-1', `--format=${FORMATO_LOG}`, commit));
  if (sinFirma.length) return rechazo(`El último commit no lleva la firma pública (${FIRMA.nombre}): no lo empaqueto.`);

  const carpeta = join(raiz, '.estudio', 'paquete');
  mkdirSync(carpeta, { recursive: true });
  const zip = join(carpeta, nombreDelZip(version));
  const notas = join(carpeta, `notas-${version}.md`);
  armarZip(raiz, commit, zip, version);
  const contenido = readFileSync(zip);
  const fallas = comprobarZip(contenido, version);
  if (fallas.length) {
    rmSync(zip, { force: true });
    return rechazo(`No dejo el zip: ${fallas.join('; ')}.`);
  }
  writeFileSync(notas, notasDeLaVersion(version));
  const rel = (r: string) => r.slice(raiz.length + 1).replace(/\\/g, '/');
  console.log(`Listo: ${rel(zip)}, ${(contenido.length / 1024 / 1024).toFixed(1)} MB, ${leerZip(contenido).length} archivos, versión ${version}, del commit ${commit.slice(0, 8)}. Sin node_modules ni datos de ningún proyecto; se descomprime entero.`);
  console.log(`Sus notas: ${rel(notas)}.`);
  const orden = ordenDePublicar(version, commit, rel(zip), rel(notas));
  if (!publicar) {
    console.log(`No publiqué nada. Para publicarlo, primero se sube ese commit (node tools/subir-studio.ts --subir), y luego: node tools/empaquetar-studio.ts --publicar`);
    console.log(`La misma orden, con la sesión que esté activa en gh: gh ${orden.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ')}`);
    return 0;
  }

  // Con la sesión de la cuenta aprobada para este proyecto, según GitHub (cuentaGit.ts): sin ella, no se publica
  const sesion = sesionAprobada(cuentaGitDeCarpeta(leerLocalYa(raiz), raiz));
  if (!sesion.ok) return rechazo(`No publiqué nada. ${mensajeDeCuenta(sesion.resultado)}`);
  const env = { ...process.env, GH_TOKEN: sesion.token };
  // Una versión de un commit que GitHub no tiene saldría de otro lado
  const remoto = execFileSync('git', ['-c', 'credential.helper=', '-c', 'credential.helper=!f() { echo username=x-access-token; echo "password=$GH_TOKEN"; }; f', 'ls-remote', '--heads', `https://github.com/${REPOSITORIO}.git`, RAMA], { cwd: raiz, env, encoding: 'utf8' }).split(/\s+/)[0];
  if (remoto !== commit) return rechazo(`GitHub aún no tiene este commit (${commit.slice(0, 8)}): primero node tools/subir-studio.ts --subir, y vuelve a correr esto. No publiqué nada.`);
  const r = spawnSync('gh', orden, { cwd: raiz, env, stdio: 'inherit' });
  if (r.status !== 0) return rechazo('GitHub no aceptó la versión (arriba, el porqué). No se publicó nada nuevo.');
  console.log(`Publicada: https://github.com/${REPOSITORIO}/releases/tag/v${version}, marcada «Pre-release».`);
  return 0;
}

function rechazo(porque: string): number {
  console.error(porque);
  return 1;
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) process.exit(principal());
