// Encender STL Studio aparte, para que no dependa de ninguna terminal ni de ningún agente: si se cierra la sesión que
// lo encendió, el Studio sigue; si su servidor se cae, se vuelve a levantar solo. Es lo que corre el agente al final
// de la inicialización (INSTALAR.md). Si ya está encendido, nunca enciende otro: recarga la página que esté abierta
// (o, si no hay ninguna, la abre). Un segundo servidor tampoco puede arrancar por otra vía (estudio/servidor/unico.ts).
// Si el que está encendido es otra copia del Studio, desde otra carpeta, la apaga y enciende esta, sin preguntar.
// Uso: npm run encender                (o: node tools/encender.ts)  enciende y abre el navegador
//      node tools/encender.ts --sin-abrir
//      node tools/encender.ts --estado    dice si está encendido
//      node tools/encender.ts --apagar    lo apaga (el vigilante y el servidor)
// Por dentro: --vigilar es el vigilante, que corre el servidor (vite) y lo relanza si se cae. Su registro queda en
// .estudio/servidor.log y su número de proceso en .estudio/vigilante.pid (solo de este computador, fuera de git).
import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { alAbrir, carpetaDeComando, comandoDe, duenoDelPuerto, leerCandado, procesoVivo, puertoOcupado } from '../estudio/servidor/unico.ts';

const raiz = join(import.meta.dirname, '..');
const puerto = Number(process.env.PORT) || 5180;
const url = `http://localhost:${puerto}/`;
const carpeta = join(raiz, '.estudio');
const registro = join(carpeta, 'servidor.log');
const pid = join(carpeta, 'vigilante.pid');
const arg = (a: string) => process.argv.includes(a);
const esperar = (ms: number) => new Promise(r => setTimeout(r, ms));

async function encendido(ms = 5000): Promise<boolean> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(ms) });
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * ¿Ya hay un Studio en este computador? Basta cualquiera de cuatro señales: responde, su vigilante vive, su servidor
 * tiene el candado (unico.ts) o algo ocupa su puerto. Antes solo se miraba si respondía en 2 segundos: con el servidor
 * ocupado o reiniciándose, un doble clic encendía un segundo servidor.
 */
async function yaHayStudio(): Promise<string | null> {
  if (await encendido()) return 'responde';
  if (pidVigilante()) return 'su vigilante está vivo';
  const c = leerCandado(raiz);
  if (c && procesoVivo(c.pid)) {
    const cmd = comandoDe(c.pid);
    if (cmd === null || /vite/i.test(cmd)) return `su servidor está vivo (proceso ${c.pid})`;
  }
  if (await puertoOcupado(puerto)) return `algo ocupa el puerto ${puerto}`;
  return null;
}

/** Le dice al Studio encendido que recargue las páginas abiertas; devuelve cuántas hay. */
async function recargarAbiertas(): Promise<number> {
  try {
    const r = await fetch(`${url}__estudio/director/recargar`, { method: 'POST', signal: AbortSignal.timeout(5000) });
    return r.ok ? Number((await r.json()).abiertas) || 0 : 0;
  } catch {
    return 0;
  }
}

function vivo(n: number): boolean {
  try { process.kill(n, 0); return true; } catch { return false; }
}

/**
 * El vigilante que está corriendo, si lo hay. Después de reiniciar el computador, su número de proceso puede ser de otro
 * programa: solo cuenta si su comando es el del vigilante (si no se puede saber, se le cree).
 */
function pidVigilante(): number | null {
  if (!existsSync(pid)) return null;
  const n = Number(readFileSync(pid, 'utf8').trim());
  if (!n || !vivo(n)) return null;
  if (n === process.pid) return n;
  const cmd = comandoDe(n);
  return cmd === null || (/encender/.test(cmd) && /--vigilar/.test(cmd)) ? n : null;
}

// El vigilante: corre vite y, si se cae, lo relanza. Si se cae más de 5 veces en 2 minutos, se rinde y lo deja dicho
// en el registro (algo está roto y relanzarlo en bucle no lo arregla).
async function vigilar() {
  mkdirSync(carpeta, { recursive: true });
  // Un solo vigilante: si ya hay otro vivo, este no hace nada
  const otro = pidVigilante();
  if (otro && otro !== process.pid) return;
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
    // Si el Studio responde, lo sirve otro (este servidor no arrancó porque ya había uno): este vigilante se retira
    if (await encendido()) {
      anotar('Ya hay otro servidor del Studio encendido: este vigilante se retira (nunca dos).');
      break;
    }
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
  // Solo borra su número si es el suyo (el de otro vigilante, se deja)
  if (existsSync(pid) && readFileSync(pid, 'utf8').trim() === String(process.pid)) rmSync(pid, { force: true });
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

/**
 * Otra copia del Studio, en otra carpeta, ocupa el puerto (una descargada aparte, otra versión): se apaga, sin preguntar,
 * para que esta se encienda en su lugar (pedido pd_un_director, tu decisión nmvsv6pqutit). Primero con su propio
 * --apagar (su vigilante y su servidor); si sigue ahí (la encendió una terminal), se cierra el proceso que escucha, con
 * todo lo que lanzó: también su director, si revisaba, porque dos directores a la vez no van; esa revisión se retoma al
 * pedirla de nuevo. Devuelve si el puerto quedó libre.
 */
async function apagarOtraCopia(carpeta: string, servidor: number): Promise<boolean> {
  console.log(`Hay otra copia del Studio encendida, desde ${carpeta}: la apago y enciendo esta.`);
  const suyo = join(carpeta, 'tools', 'encender.ts');
  if (existsSync(suyo)) spawnSync(process.execPath, [suyo, '--apagar'], { cwd: carpeta, stdio: 'ignore', windowsHide: true, timeout: 60_000 });
  const libre = async () => {
    for (let i = 0; i < 15; i++) {
      if (!(await puertoOcupado(puerto))) return true;
      await esperar(1000);
    }
    return false;
  };
  if (await libre()) return true;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(servidor), '/T', '/F'], { windowsHide: true });
  else try { process.kill(servidor, 'SIGTERM'); } catch { /* ya no estaba */ }
  return libre();
}

async function encender() {
  const ya = await yaHayStudio();
  // Si quien ocupa el puerto es otra copia del Studio, se reemplaza por esta; si es esta misma, se usa la que hay
  const dueno = ya ? duenoDelPuerto(puerto) : null;
  const cmd = dueno ? comandoDe(dueno) : null;
  const carpeta = cmd ? carpetaDeComando(cmd) : null;
  const queHacer = alAbrir(raiz, carpeta, !!carpeta && existsSync(join(carpeta, 'tools', 'encender.ts')));
  if (queHacer === 'reemplazar' && !(await apagarOtraCopia(carpeta!, dueno!))) {
    console.error(`No pude apagar la otra copia del Studio (desde ${carpeta}): apágala con node tools/encender.ts --apagar en su carpeta, o cierra su terminal, y vuelve a abrir esta.`);
    process.exit(1);
  }
  if (ya && queHacer === 'no tocar') {
    console.error(`Otro programa ocupa el puerto ${puerto} (${cmd}): no lo toco. Ciérralo, o enciende el Studio en otro puerto (PORT=5181 npm run encender).`);
    process.exit(1);
  }
  if (ya && queHacer === 'recargar') {
    // Nunca un segundo servidor: se usa el que hay. Si todavía arranca o se está reiniciando, se espera a que responda
    for (let i = 0; i < 60 && !(await encendido()); i++) await esperar(1000);
    if (!(await encendido())) {
      console.error(`STL Studio ya está encendido (${ya}), pero no responde. No enciendo otro: mira el registro (${registro}) o apágalo con npm run encender -- --apagar y vuelve a abrirlo.`);
      process.exit(1);
    }
    const abiertas = await recargarAbiertas();
    console.log(`STL Studio ya estaba encendido: ${url}${abiertas ? ` (recargué ${abiertas === 1 ? 'la página abierta' : `las ${abiertas} páginas abiertas`})` : ''}`);
    if (!arg('--sin-abrir') && !abiertas) abrirNavegador();
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
