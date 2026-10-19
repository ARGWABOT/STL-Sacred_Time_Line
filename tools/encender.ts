// Encender STL Studio aparte, para que no dependa de ninguna terminal ni de ningún agente: si se cierra la sesión que
// lo encendió, el Studio sigue; si su servidor se cae, se vuelve a levantar solo. Es lo que corre el agente al final
// de la inicialización (INSTALAR.md). Si ya está encendido, no hace nada y solo dice la dirección.
// Uso: npm run encender                (o: node tools/encender.ts)  enciende y abre el navegador
//      node tools/encender.ts --sin-abrir
//      node tools/encender.ts --estado    dice si está encendido
//      node tools/encender.ts --apagar    lo apaga (el vigilante y el servidor)
// Por dentro: --vigilar es el vigilante, que corre el servidor (vite) y lo relanza si se cae. Su registro queda en
// .estudio/servidor.log y su número de proceso en .estudio/vigilante.pid (solo de este computador, fuera de git).
import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const raiz = join(import.meta.dirname, '..');
const puerto = Number(process.env.PORT) || 5180;
const url = `http://localhost:${puerto}/`;
const carpeta = join(raiz, '.estudio');
const registro = join(carpeta, 'servidor.log');
const pid = join(carpeta, 'vigilante.pid');
const arg = (a: string) => process.argv.includes(a);
const esperar = (ms: number) => new Promise(r => setTimeout(r, ms));

async function encendido(): Promise<boolean> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch {
    return false;
  }
}

function vivo(n: number): boolean {
  try { process.kill(n, 0); return true; } catch { return false; }
}

function pidVigilante(): number | null {
  if (!existsSync(pid)) return null;
  const n = Number(readFileSync(pid, 'utf8').trim());
  return n && vivo(n) ? n : null;
}

// El vigilante: corre vite y, si se cae, lo relanza. Si se cae más de 5 veces en 2 minutos, se rinde y lo deja dicho
// en el registro (algo está roto y relanzarlo en bucle no lo arregla).
async function vigilar() {
  mkdirSync(carpeta, { recursive: true });
  writeFileSync(pid, String(process.pid));
  const anotar = (t: string) => appendFileSync(registro, `[${new Date().toISOString()}] ${t}\n`);
  const caidas: number[] = [];
  let parar = false;
  let hijo: ReturnType<typeof spawn> | null = null;
  const salir = () => { parar = true; hijo?.kill(); };
  process.on('SIGTERM', salir);
  process.on('SIGINT', salir);
  while (!parar) {
    anotar('Enciendo el servidor del Studio.');
    const fd = openSync(registro, 'a');
    hijo = spawn(process.execPath, [join(raiz, 'node_modules', 'vite', 'bin', 'vite.js')], { cwd: raiz, stdio: ['ignore', fd, fd], windowsHide: true });
    const codigo = await new Promise<number | null>(r => hijo!.on('exit', c => r(c)));
    if (parar) break;
    anotar(`El servidor se cayó (código ${codigo}).`);
    const ahora = Date.now();
    caidas.push(ahora);
    while (caidas.length && ahora - caidas[0] > 120_000) caidas.shift();
    if (caidas.length > 5) {
      anotar('Se cayó más de 5 veces en 2 minutos: no lo relanzo más. Mira los errores de arriba y vuelve a encenderlo con npm run encender.');
      break;
    }
    await esperar(2000);
  }
  rmSync(pid, { force: true });
}

// Lanzar el vigilante desprendido de quien lo llama. En Windows se crea por WMI: así queda fuera del grupo de procesos
// de la terminal o del agente, que al cerrarse se lleva todo lo que lanzó (aunque vaya desprendido).
function lanzarVigilante() {
  mkdirSync(carpeta, { recursive: true });
  const script = join(raiz, 'tools', 'encender.ts');
  if (process.platform === 'win32') {
    const linea = `"${process.execPath}" "${script}" --vigilar`.replace(/'/g, "''");
    // ShowWindow = 0: sin ventana de consola.
    const ps = `$si = New-CimInstance -ClassName Win32_ProcessStartup -Property @{ ShowWindow = [uint16]0 } -ClientOnly; `
      + `$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = '${linea}'; CurrentDirectory = '${raiz.replace(/'/g, "''")}'; ProcessStartupInformation = $si }; exit $r.ReturnValue`;
    const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8', windowsHide: true });
    if (r.status !== 0) throw new Error(`Windows no dejó crear el proceso (${(r.stderr || r.stdout || r.status)?.toString().trim()})`);
  } else {
    const fd = openSync(registro, 'a');
    spawn(process.execPath, [script, '--vigilar'], { cwd: raiz, detached: true, stdio: ['ignore', fd, fd] }).unref();
  }
}

function abrirNavegador() {
  const [cmd, args] = process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  spawn(cmd, args as string[], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
}

async function apagar() {
  const n = pidVigilante();
  if (!n) {
    console.log(await encendido()
      ? `El Studio responde en ${url}, pero no lo encendió npm run encender: apágalo en la terminal donde corre (Ctrl+C).`
      : 'El Studio no está encendido.');
    return;
  }
  // En Windows, matar al vigilante no se lleva al servidor: se cierra todo su árbol.
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(n), '/T', '/F'], { windowsHide: true });
  else process.kill(n, 'SIGTERM');
  rmSync(pid, { force: true });
  console.log('Studio apagado.');
}

async function encender() {
  if (await encendido()) {
    console.log(`STL Studio ya está encendido: ${url}`);
    if (!arg('--sin-abrir')) abrirNavegador();
    return;
  }
  if (!existsSync(join(raiz, 'node_modules', 'vite'))) {
    console.error('Faltan las dependencias del Studio: corre primero npm run iniciar (o pídele a tu agente «inicializa STL Studio»).');
    process.exit(1);
  }
  console.log('Encendiendo STL Studio aparte (sigue encendido aunque cierres esta terminal o el agente)…');
  lanzarVigilante();
  for (let i = 0; i < 60; i++) {
    await esperar(1000);
    if (await encendido()) {
      console.log(`\nSTL Studio está encendido: ${url}\nSi el servidor se cae, se vuelve a levantar solo. Para apagarlo: npm run encender -- --apagar. Registro: .estudio/servidor.log`);
      if (!arg('--sin-abrir')) abrirNavegador();
      return;
    }
  }
  console.error(`El Studio no respondió en 60 segundos. Mira el registro: ${registro}`);
  process.exit(1);
}

if (arg('--vigilar')) await vigilar();
else if (arg('--apagar')) await apagar();
else if (arg('--estado')) {
  const si = await encendido();
  console.log(si ? `Encendido: ${url}${pidVigilante() ? ' (con su vigilante: se relanza solo si se cae)' : ' (sin vigilante: lo encendió una terminal)'}` : 'Apagado.');
  process.exit(si ? 0 : 1);
} else await encender();
