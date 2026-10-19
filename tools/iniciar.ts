// Preparar STL Studio en un computador nuevo: comprueba lo que hace falta, instala las dependencias de npm y dice
// exactamente qué hacer con lo demás. Con --diagnostico solo mira: no instala ni cambia nada (es lo que corre primero
// el agente que inicializa el Studio, según INSTALAR.md). No toca nada fuera de esta carpeta.
// Uso: npm run iniciar                      (o: node tools/iniciar.ts)
//      node tools/iniciar.ts --diagnostico
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { arch, platform } from 'node:os';
import { join } from 'node:path';

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

// Lo opcional
if (correr('claude', ['--version']).ok) ok('Claude Code (la sesión del director)');
else opcional('Claude Code no está en la consola', 'También sirve la app de escritorio. Lo importante es abrirla en esta carpeta: https://claude.com/claude-code');
if (process.platform === 'win32') {
  const wsl = correr('wsl', ['-l', '-q']);
  if (wsl.ok) opcional('Notas de voz con transcripción local', 'wsl -d Ubuntu -- bash tools/entorno/instalar_transcripcion.sh');
  else opcional('Notas de voz con transcripción local', 'Hoy requiere WSL2 con Ubuntu; sin eso, las notas escritas y los audios funcionan igual (sin su texto)');
} else opcional('Notas de voz con transcripción local', 'bash tools/entorno/instalar_transcripcion.sh');

console.log(problemas
  ? `\nFaltan ${problemas === 1 ? '1 cosa' : `${problemas} cosas`}: arréglalas y vuelve a correr ${soloMirar ? 'el diagnóstico' : 'npm run iniciar'}.\n`
  : `\nTodo listo. Ahora:
  1. npm run encender  → enciende STL Studio aparte y lo abre en http://localhost:5180/ (sigue encendido aunque
     cierres esta terminal, y se levanta solo si se cae)
  2. «Entregar proyectos» → elige la carpeta de un proyecto y listo: su memoria queda en su propio repositorio.
  3. Inicia sesión una vez en la CLI de Claude Code (claude auth login): «Pedir revisión» llama al director al
     instante. La sesión del director es Claude Code abierto en esta carpeta; sin la CLI, deja corriendo ahí
     /loop 5m /vigila. Todo lo demás pasa en el Studio.\n`);
process.exit(problemas ? 1 : 0);
