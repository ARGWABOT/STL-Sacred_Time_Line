// Preparar STL Studio en un computador nuevo: comprueba lo que hace falta, instala las dependencias de npm y dice
// exactamente qué hacer con lo demás. Con --diagnostico solo mira: no instala ni cambia nada (es lo que corre primero
// el agente que inicializa el Studio, según INSTALL.md). No toca nada fuera de esta carpeta.
// Uso: npm run iniciar                      (o: node tools/iniciar.ts)
//      node tools/iniciar.ts --diagnostico
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { arch, homedir, platform } from 'node:os';
import { join } from 'node:path';
import { instalarSemilla } from '../src/director/semilla.ts';
import { ARCHIVO_DE_VOCES, MARCA_TRANSCRIPCION } from '../src/director/transcripcion.ts';

const raiz = join(import.meta.dirname, '..');
const soloMirar = process.argv.includes('--diagnostico');
const ok = (t: string) => console.log(`  ✓ ${t}`);
const falta = (t: string, arreglo: string) => { console.log(`  ✗ ${t}\n      → ${arreglo}`); problemas++; };
const opcional = (t: string, nota: string) => console.log(`  ○ ${t} (opcional)\n      → ${nota}`);
let problemas = 0;

const correr = (cmd: string, args: string[]) => {
  const r = spawnSync(cmd, args, { cwd: raiz, encoding: 'utf8', shell: process.platform === 'win32', windowsHide: true });
  return { ok: r.status === 0, out: (r.stdout ?? '').trim() };
};

console.log(`\nSTL Studio · ${soloMirar ? 'diagnóstico de este computador (no instala nada)' : 'preparar este computador'}\n`);
ok(`Sistema: ${platform()} ${arch()}`);

// Node
const mayor = Number(process.versions.node.split('.')[0]);
if (mayor >= 24) ok(`Node.js ${process.versions.node}`);
else falta(`Node.js ${process.versions.node}: hace falta la 24 o más nueva`, 'Instala Node.js 24 o más nuevo: https://nodejs.org (ver INSTALAR.md)');

// git y la identidad (la carpeta del Studio no necesita ser un repositorio: la memoria vive en el de cada proyecto)
const git = correr('git', ['--version']);
if (git.ok) {
  ok(git.out);
  const nombre = correr('git', ['config', 'user.name']).out;
  const correo = correr('git', ['config', 'user.email']).out;
  if (nombre && correo) ok(`Tu identidad de git: ${nombre} <${correo}>`);
  else falta('Falta tu identidad de git (el Studio firma cada decisión con ella)', 'git config --global user.name "Tu Nombre"  y  git config --global user.email "tu@correo.com"');
} else falta('git no está instalado (cada decisión es un commit, y la memoria de cada proyecto vive en su repositorio)', 'Instala git: https://git-scm.com (ver INSTALAR.md)');

// Dependencias
if (existsSync(join(raiz, 'node_modules', 'vite'))) ok('Dependencias instaladas');
else if (soloMirar) falta('Faltan las dependencias del Studio', 'npm install, en esta carpeta (unos 80 MB)');
else {
  console.log('  … Instalando las dependencias (npm install)');
  try {
    execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install'], { cwd: raiz, stdio: 'inherit', shell: process.platform === 'win32' });
    ok('Dependencias instaladas');
  } catch {
    falta('No se pudieron instalar las dependencias', 'Corre npm install y revisa el error');
  }
}

// Una instalación sin proyectos ya llega con STL Studio como su propio proyecto (pd_stl_semilla), en cuanto hay lo de arriba
// (git, tu identidad y las dependencias). Solo la instalación: --diagnostico no cambia nada
if (!soloMirar && !problemas) {
  try {
    const semilla = await instalarSemilla(raiz);
    if (semilla === 'instalada') ok('STL Studio, tu Studio, como tu primer proyecto');
    else if (semilla === 'ya_tenia_memoria') ok('STL Studio conectado con su memoria de antes');
  } catch (e) {
    falta(`No se pudo crear el proyecto STL Studio: ${(e as Error).message}`, 'Corrige lo que dice y vuelve a correr npm run iniciar');
  }
}

// El micrófono y la transcripción son parte del método: escribir es solo el respaldo (nota de voz del titular nmvy0cdw1tit,
// 1 de noviembre de 2026). Sin WSL, en cualquier sistema (pr_voz_sin_wsl); en Windows, en Git Bash. Lo que ya está instalado, se dice
// Ya no detiene nada: la pantalla de la voz del asistente la instala, sin camino para saltarla (pd_valores_instalar)
const enGitBash = process.platform === 'win32' ? ' (en Windows, en Git Bash)' : '';
const director = join(homedir(), 'director');
if (existsSync(join(director, '.venv', MARCA_TRANSCRIPCION))) ok('Notas de voz con transcripción local');
else console.log(`  ○ La transcripción local de las notas de voz, que es obligatoria: hablarle al director es parte del método (unos 2 GB con su modelo)\n      → La instala el asistente, en el Studio; si ya usas tu Studio, en «Modelo y consumo» › «Repasar la instalación», o con: bash tools/entorno/instalar_transcripcion.sh${enGitBash}`);
// Las voces, igual: son parte del Studio (notas de voz del titular nmvzfmvr2tit y nmvzfsccjtit, 2 de noviembre de 2026)
if (existsSync(join(director, 'voces', ARCHIVO_DE_VOCES))) ok('Voces de Kokoro para leer en voz alta');
else console.log(`  ○ Las voces que leen en voz alta, que son parte del Studio (unos 350 MB)\n      → Las instala el asistente, en el Studio; si ya usas tu Studio, en «Modelo y consumo» › «Repasar la instalación», o con: bash tools/entorno/instalar_voces.sh${enGitBash}`);

// Lo opcional
if (correr('claude', ['--version']).ok) ok('Claude Code (la sesión del director)');
// Sin la sesión, el Studio abre igual y su asistente la pide en su primera pantalla, con la guía y su orden lista (decisión
// del titular del 31 de octubre de 2026; pd_valores_instalar)
else opcional('Claude Code no está en la consola', 'El Studio abre igual: su asistente te lo pide en su primera pantalla, con la guía paso a paso (https://claude.com/claude-code)');

console.log(problemas
  ? `\nFaltan ${problemas === 1 ? '1 cosa' : `${problemas} cosas`}: arréglalas y vuelve a correr ${soloMirar ? 'el diagnóstico' : 'npm run iniciar'}.\n`
  : soloMirar
    ? '\nTodo listo: con npm run iniciar, el Studio se enciende y se abre.\n'
    : `\nTodo listo. Enciendo STL Studio aparte y lo abro en http://localhost:5180/ (sigue encendido aunque cierres esta
terminal, y se levanta solo si se cae). La primera vez, su asistente te lleva por lo demás, paso a paso.\n`);
// El mismo encendido de siempre: si ya hay uno, no enciende otro (encender.ts)
if (!soloMirar && !problemas) spawnSync(process.execPath, [join(raiz, 'tools', 'encender.ts')], { cwd: raiz, stdio: 'inherit' });
process.exit(problemas ? 1 : 0);
