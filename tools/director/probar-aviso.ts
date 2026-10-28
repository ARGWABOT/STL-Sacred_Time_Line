// La prueba real del aviso al director que corre (pr_procesos_vista, puntos 3 y 4): ¿qué camino le dice algo al director
// mientras trabaja sin pantalla, a tiempo? Lanza cuatro veces a Claude Code, con Haiku y en una carpeta temporal vacía,
// como lanza el Studio al director (dontAsk, sin tus ajustes de usuario), con un encargo de tres órdenes que solo imprimen
// un número: una sin aviso, para saber que corren, y tres con el aviso de detenerse después de la primera, por un gancho
// PostToolUse (de dos formas) o por la entrada en stream-json. No cambia nada del Studio ni de tus proyectos: deja el
// resultado en .estudio/prueba-aviso.json, donde lo lee el director. Gasta un poco de tu plan: cuatro encargos cortos de
// Haiku. Uso: node tools/director/probar-aviso.ts
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { paraConsola, motivoDelError } from '../probarPermisos.ts';
import { ajustesDelGancho, argumentosDelCaso, AVISO, CASOS, eventos, informe, mensajeDeEntrada, PEDIDO, textoDelGancho, traeResultado, veredicto, type Caso, type Resultado } from '../probarAviso.ts';
import { raiz } from './comun.ts';

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
const ESPERA_MS = 180_000;

const version = execFileSync(conShell ? paraConsola(claude) : claude, ['--version'], { encoding: 'utf8', shell: conShell, windowsHide: true }).trim();
const carpeta = mkdtempSync(join(tmpdir(), 'stl-aviso-'));
const registro = join(carpeta, 'registro.jsonl');
const gancho = join(carpeta, 'gancho.mjs');
writeFileSync(gancho, textoDelGancho(registro));
writeFileSync(registro, '');
const conGancho = join(carpeta, 'ajustes-gancho.json');
writeFileSync(conGancho, JSON.stringify(ajustesDelGancho(gancho), null, 2));
// Por la entrada no hace falta el gancho: el arranque limpio de hoy, con los ganchos apagados
const sinGancho = join(carpeta, 'ajustes-limpio.json');
writeFileSync(sinGancho, JSON.stringify({ disableAllHooks: true }, null, 2));

/** Un caso con gancho: el encargo como argumento, y su salida en stream-json. */
function conElGancho(caso: Caso): { salida: string; error: string | null } {
  const args = argumentosDelCaso(caso, conGancho);
  const opciones = { encoding: 'utf8' as const, env: { ...process.env, STL_CASO: caso.id }, cwd: carpeta, timeout: ESPERA_MS, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] as ['ignore', 'pipe', 'pipe'] };
  try {
    return { salida: conShell ? execFileSync(paraConsola(claude!), args.map(paraConsola), { ...opciones, shell: true }) : execFileSync(claude!, args, opciones), error: null };
  } catch (e) {
    const x = e as { stdout?: string; stderr?: string; message?: string };
    return { salida: x.stdout ?? '', error: motivoDelError(x) };
  }
}

/**
 * Por la entrada en stream-json: el encargo como primer mensaje y, apenas corre la primera orden, el aviso como otro
 * mensaje. Al llegar su primer resultado se cierra la entrada: si el aviso llegó a tiempo, ese resultado ya dice que se
 * detuvo; si quedó en cola, el primero trae los tres números.
 */
function porLaEntrada(caso: Caso): Promise<{ salida: string; error: string | null }> {
  return new Promise((listo) => {
    const args = argumentosDelCaso(caso, sinGancho);
    const p = conShell
      ? spawn(paraConsola(claude!), args.map(paraConsola), { cwd: carpeta, shell: true, windowsHide: true, env: { ...process.env, STL_CASO: caso.id } })
      : spawn(claude!, args, { cwd: carpeta, windowsHide: true, env: { ...process.env, STL_CASO: caso.id } });
    let salida = '';
    let errores = '';
    let avisado = false;
    let cerrada = false;
    const limite = setTimeout(() => p.kill(), ESPERA_MS);
    p.stdout.on('data', (d) => {
      salida += d;
      const todos = eventos(salida);
      if (!avisado && todos.some(traeResultado)) {
        avisado = true;
        p.stdin.write(mensajeDeEntrada(AVISO));
      }
      if (!cerrada && todos.some((e) => e.type === 'result')) {
        cerrada = true;
        p.stdin.end();
      }
    });
    p.stderr.on('data', (d) => (errores += d));
    p.on('error', (e) => {
      clearTimeout(limite);
      listo({ salida, error: e.message });
    });
    p.on('exit', () => {
      clearTimeout(limite);
      listo({ salida, error: errores.trim().split('\n')[0] || null });
    });
    p.stdin.write(mensajeDeEntrada(PEDIDO));
  });
}

const resultados: Resultado[] = [];
for (const caso of CASOS) {
  console.log(`Probando: ${caso.que}…`);
  const { salida, error } = caso.id === 'entrada' ? await porLaEntrada(caso) : conElGancho(caso);
  const llamadas = readFileSync(registro, 'utf8').split('\n').filter(Boolean).filter((l) => {
    try {
      return JSON.parse(l).caso === caso.id;
    } catch {
      return false;
    }
  }).length;
  resultados.push(veredicto(caso, salida, llamadas, error));
}

const lineas = informe(version, resultados);
mkdirSync(join(raiz, '.estudio'), { recursive: true });
writeFileSync(join(raiz, '.estudio', 'prueba-aviso.json'), JSON.stringify({ cuando: new Date().toISOString(), version, resultados, informe: lineas }, null, 2) + '\n');
console.log('');
for (const l of lineas) console.log(l);
console.log('');
console.log('Listo: el resultado quedó en .estudio/prueba-aviso.json, donde lo leo al revisar.');
