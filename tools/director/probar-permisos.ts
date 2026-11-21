// La prueba real del gancho PermissionRequest con el Claude Code de este computador (pr_permisos_al_momento, pieza 5).
// Lanza tres veces a Claude Code sin pantalla, con Haiku y en una carpeta temporal vacía, pidiéndole una orden que solo
// lee la versión de Node y que no está en su lista; el gancho anota si lo llamaron y da el permiso. No cambia nada del
// Studio ni de tus proyectos: deja el resultado en .estudio/prueba-gancho.json, donde lo lee el director (la primera
// versión lo dejaba en prueba-permisos.json, y su corrida no llegó a lanzar a Claude Code en Windows).
// Gasta un poco de tu plan: tres encargos cortos de Haiku.
// Con --auto, la prueba del modo automático (pd_permiso_automatico): dos encargos cortos de Haiku en ese modo, uno
// con la orden libre y otro con la orden negada por una regla, como lo que el Studio nunca permite; deja el resultado
// en .estudio/prueba-auto.json.
// Uso: node tools/director/probar-permisos.ts [--auto]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { ajustesDelCaso, argumentosDelCaso, CASOS, CASOS_AUTO, informe, informeAuto, motivoDelError, paraConsola, textoDelGancho, veredicto, type Llamada, type Resultado } from '../probarPermisos.ts';
import { raiz } from './comun.ts';

const auto = process.argv.includes('--auto');

function buscarClaude(): string | null {
  const extensiones = process.platform === 'win32' ? ['.exe', '.cmd'] : [''];
  for (const dir of (process.env.PATH ?? '').split(delimiter).filter(Boolean))
    for (const e of extensiones) if (existsSync(join(dir, 'claude' + e))) return join(dir, 'claude' + e);
  return null;
}

const claude = buscarClaude();
if (!claude) {
  console.error('No encuentro Claude Code en el PATH de esta terminal: ábrela donde «claude --version» responde.');
  process.exit(1);
}
// El .cmd de npm solo corre dentro de una consola, que recibe los argumentos sin comillas: van con las suyas
const conShell = /\.cmd$/i.test(claude);
const correr = (args: string[], env: NodeJS.ProcessEnv = process.env, cwd?: string) =>
  conShell
    ? execFileSync(paraConsola(claude), args.map(paraConsola), { encoding: 'utf8', env, cwd, timeout: 180_000, shell: true, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    : execFileSync(claude, args, { encoding: 'utf8', env, cwd, timeout: 180_000, stdio: ['ignore', 'pipe', 'pipe'] });

const version = correr(['--version']).trim();
const carpeta = mkdtempSync(join(tmpdir(), 'stl-permisos-'));
const registro = join(carpeta, 'registro.jsonl');
const gancho = join(carpeta, 'gancho.mjs');
writeFileSync(gancho, textoDelGancho(registro));
writeFileSync(registro, '');

const resultados: Resultado[] = [];
for (const caso of auto ? CASOS_AUTO : CASOS) {
  console.log(`Probando: ${caso.que}…`);
  const ajustes = join(carpeta, `ajustes-${caso.id}.json`);
  writeFileSync(ajustes, JSON.stringify(ajustesDelCaso(gancho, caso.sinGanchos), null, 2));
  let salida = '';
  let error: string | null = null;
  try {
    salida = correr(argumentosDelCaso(caso, ajustes), { ...process.env, STL_CASO: caso.id }, carpeta);
  } catch (e) {
    const x = e as { stdout?: string; stderr?: string; message?: string };
    salida = x.stdout ?? '';
    if (!salida) error = motivoDelError(x);
  }
  const llamadas = readFileSync(registro, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Llamada);
  resultados.push(veredicto(caso, llamadas, salida, error));
}

const lineas = auto ? informeAuto(version, resultados) : informe(version, resultados);
const archivo = auto ? 'prueba-auto.json' : 'prueba-gancho.json';
mkdirSync(join(raiz, '.estudio'), { recursive: true });
writeFileSync(join(raiz, '.estudio', archivo), JSON.stringify({ cuando: new Date().toISOString(), version, resultados, informe: lineas }, null, 2) + '\n');
console.log('');
for (const l of lineas) console.log(l);
console.log('');
console.log(`Listo: el resultado quedó en .estudio/${archivo}, donde lo leo en la próxima revisión.`);
