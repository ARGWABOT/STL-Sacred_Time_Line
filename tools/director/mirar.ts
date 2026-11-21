// El director mira una página en un navegador sin pantalla: el Studio encendido, la portada pública u otra página, en
// tres anchos (teléfono, tableta y escritorio). Guarda cada captura en la memoria del proyecto y dice los errores de la
// consola; el director abre las imágenes (las lee como cualquier imagen) y cuenta en su respuesta qué vio. Usa el Edge o
// el Chrome del computador, así que no hay nada que instalar (STL_NAVEGADOR, si está en otro lugar).
// Uso: node tools/director/mirar.ts                                → el Studio encendido, sin «Dónde quedamos» encima (?mirar)
//      node tools/director/mirar.ts "http://localhost:5180/?mirar&vista=ruta" → otra vista del Studio, sin el resumen encima
//      node tools/director/mirar.ts https://argwabot.github.io/…   → otra página (https, o de este computador)
//      … --anchos telefono,escritorio                              → solo esos anchos (también portatil, 1360, y ancha, 1920)
//      … --alto 2400                                               → una ventana más alta, para ver lo que queda abajo
//                                                                    (llevar a un ancla desplazando la página deja la captura en blanco)
//      … --webgl                                                   → dibuja el 3D con el procesador (sin él, la escena sale en negro)
//      … --espera 12000                                            → más milisegundos para que la página se dibuje
//      … --proyecto <id>                                           → guarda las capturas en la memoria de ese proyecto
//      … --emular                                                  → la pantalla de un teléfono de verdad (390 o 360 de ancho:
//                                                                    la ventana sin pantalla no baja de ~492 y lo corta; con --webgl)
//      … --medir ".selector-idioma,#sincronizacion"                → sin captura: el alto y el ancho de cada caja, medidos
//      … --variante "#sincronizacion|insignia sync choque|Backup failed" → y otra vez con esa clase y ese texto
//      node tools/director/mirar.ts --carga                        → solo la prueba antes de cerrar: ¿carga el Studio?
//      node tools/director/mirar.ts --carga "http://localhost:5180/?mirar&probar-emergencia" → la misma, con una falla de prueba
import { execFile, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ANCHOS, argumentosNavegador, candidatosNavegador, cierreConCarga, erroresDeConsola, guionDeMedida, SIN_GPU, urlPermitida, varianteDeMedida, WEBGL_POR_PROCESADOR, type VarianteDeMedida } from '../../src/director/mirada.ts';
import { ordenesDeEmulacion } from './emulacion.ts';
import { probarCarga } from './pruebaDeCarga.ts';
import { argumentos, memoria, proyectoElegido } from './comun.ts';

const { args, pedido } = argumentos();
// --carga: solo la prueba antes de cerrar (pd_salud_a), la misma que corre bandeja.ts --listo, sin capturas
if (args.includes('--carga')) {
  const otra = args.find((x) => !x.startsWith('--'));
  const u = otra ? urlPermitida(otra) : null;
  if (otra && !u) {
    console.error('Solo miro páginas https o de este computador (http://localhost…).');
    process.exit(1);
  }
  const r = cierreConCarga(await probarCarga(u ? { url: u.href } : {}));
  console.log(r.texto);
  process.exit(r.cierra ? 0 : 1);
}
/** El valor de una opción (`--anchos x`), y los argumentos sin ella. */
const opcion = (xs: string[], nombre: string): [string | null, string[]] => {
  const i = xs.indexOf(nombre);
  return i >= 0 ? [xs[i + 1] ?? '', [...xs.slice(0, i), ...xs.slice(i + 2)]] : [null, xs];
};
const [pedidosTexto, sinAnchos] = opcion(args, '--anchos');
const [altoTexto, sinAlto] = opcion(sinAnchos, '--alto');
const [esperaTexto, conMedir] = opcion(sinAlto, '--espera');
const [, sinMedir] = opcion(conMedir, '--medir');
const conWebgl = sinMedir.filter((x, i, xs) => x !== '--variante' && xs[i - 1] !== '--variante');
const webgl = conWebgl.includes('--webgl');
const resto = conWebgl.filter((x) => x !== '--webgl');
const espera = esperaTexto === null ? 6000 : Number(esperaTexto);
if (!(Number.isInteger(espera) && espera >= 1000 && espera <= 60000)) {
  console.error('La espera va de 1000 a 60000 milisegundos.');
  process.exit(1);
}
const pedidos = pedidosTexto === null ? null : pedidosTexto.split(',');
const alto = altoTexto === null ? null : Number(altoTexto);
if (alto !== null && !(Number.isInteger(alto) && alto >= 400 && alto <= 8000)) {
  console.error('El alto va de 400 a 8000 píxeles.');
  process.exit(1);
}
const url = urlPermitida(resto[0] ?? 'http://localhost:5180/?mirar');
if (!url) {
  console.error('Solo miro páginas https o de este computador (http://localhost…).');
  process.exit(1);
}
const anchos = (pedidos ? ANCHOS.filter((a) => pedidos.includes(a.nombre)) : ANCHOS.filter((a) => !a.aPedido)).map((a) => (alto ? { ...a, alto } : a));
if (!anchos.length) {
  console.error(`Los anchos son: ${ANCHOS.map((a) => a.nombre).join(', ')}.`);
  process.exit(1);
}
const navegador = candidatosNavegador(process.platform, process.env).find((r) => existsSync(r));
if (!navegador) {
  console.error('No encontré Edge ni Chrome en este computador. Si está en otro lugar, dímelo con STL_NAVEGADOR=<ruta del ejecutable>.');
  process.exit(1);
}

// --medir "<selector>,<selector>" [--variante "<selector>|<clase>|<texto>"]…: las cajas, medidas por el navegador, sin
// captura (nota nmwjm1bb0tit). Habla con el navegador por su puerto de depuración, en un perfil aparte que se borra.
const [medirTexto] = opcion(args, '--medir');
if (medirTexto !== null) {
  const variantes: VarianteDeMedida[] = [];
  args.forEach((x, i) => {
    if (x !== '--variante') return;
    const v = varianteDeMedida(args[i + 1] ?? '');
    if (!v) {
      console.error('Cada --variante va así: "<selector>|<clase>|<texto>".');
      process.exit(1);
    }
    variantes.push(v);
  });
  const selectores = medirTexto.split(',').map((s) => s.trim()).filter(Boolean);
  if (!selectores.length) {
    console.error('Dime qué medir: --medir ".clase,#id".');
    process.exit(1);
  }
  const [ancho] = anchos;
  const perfilMedida = await mkdtemp(join(tmpdir(), 'stl-medir-'));
  const hijo = spawn(navegador, ['--headless=new', ...SIN_GPU, '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--disable-extensions', `--user-data-dir=${perfilMedida}`, `--window-size=${ancho.ancho},${ancho.alto}`, '--remote-debugging-port=0', url.href], { stdio: 'ignore', windowsHide: true });
  try {
    const puertoEn = join(perfilMedida, 'DevToolsActivePort');
    for (let i = 0; i < 100 && !existsSync(puertoEn); i++) await new Promise((ok) => setTimeout(ok, 100));
    const puerto = (await readFile(puertoEn, 'utf8')).split('\n')[0].trim();
    await new Promise((ok) => setTimeout(ok, espera));
    const paginas = (await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json()) as { type: string; url: string; webSocketDebuggerUrl: string }[];
    const pagina = paginas.find((p) => p.type === 'page' && p.url.startsWith(url.origin)) ?? paginas.find((p) => p.type === 'page');
    console.log(`Páginas abiertas: ${paginas.map((p) => `${p.type} ${p.url}`).join(' · ')}`);
    if (!pagina) throw new Error('el navegador no abrió la página');
    const ws = new WebSocket(pagina.webSocketDebuggerUrl);
    await new Promise((ok, mal) => { ws.onopen = ok; ws.onerror = mal; });
    const respuesta = await new Promise<string>((ok, mal) => {
      ws.onmessage = (m) => {
        const j = JSON.parse(String(m.data)) as { id?: number; result?: { result?: { value?: string }; exceptionDetails?: { text?: string } } };
        if (j.id !== 1) return;
        if (j.result?.exceptionDetails) mal(new Error(j.result.exceptionDetails.text ?? 'falló el guion'));
        else ok(j.result?.result?.value ?? '[]');
      };
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: guionDeMedida(selectores, variantes), returnByValue: true } }));
    });
    ws.close();
    console.log(`Medidas de ${url.href} a ${ancho.ancho}×${ancho.alto}:`);
    console.log(JSON.stringify(JSON.parse(respuesta), null, 2));
  } finally {
    hijo.kill();
    await new Promise((ok) => setTimeout(ok, 500));
    await rm(perfilMedida, { recursive: true, force: true }).catch(() => {});
  }
  process.exit(0);
}

const id = await proyectoElegido(pedido);
// --emular: cada captura con la pantalla de teléfono puesta por el protocolo de depuración (emulacion.ts), cargando la página
// ya con ella; la captura la saca el mismo navegador (Page.captureScreenshot) tras la espera
if (args.includes('--emular')) {
  const selloE = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const carpetaE = join(memoria(id), 'director', 'capturas', selloE);
  await mkdir(carpetaE, { recursive: true });
  const informeE: string[] = [`Mirada emulada de ${url.href} · ${new Date().toISOString()} · ${navegador}`];
  for (const a of anchos) {
    const perfilE = await mkdtemp(join(tmpdir(), 'stl-emular-'));
    const hijo = spawn(navegador, ['--headless=new', ...(webgl ? WEBGL_POR_PROCESADOR : SIN_GPU), '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--disable-extensions', `--user-data-dir=${perfilE}`, '--window-size=1440,900', '--remote-debugging-port=0', 'about:blank'], { stdio: 'ignore', windowsHide: true });
    try {
      const puertoEn = join(perfilE, 'DevToolsActivePort');
      for (let i = 0; i < 100 && !existsSync(puertoEn); i++) await new Promise((ok) => setTimeout(ok, 100));
      const puerto = (await readFile(puertoEn, 'utf8')).split('\n')[0].trim();
      const paginas = (await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json()) as { type: string; webSocketDebuggerUrl: string }[];
      const pagina = paginas.find((p) => p.type === 'page');
      if (!pagina) throw new Error('el navegador no abrió la página');
      const ws = new WebSocket(pagina.webSocketDebuggerUrl);
      await new Promise((ok, mal) => { ws.onopen = ok; ws.onerror = mal; });
      let n = 0;
      const pendientes = new Map<number, (r: { data?: string }) => void>();
      ws.onmessage = (m) => { const j = JSON.parse(String(m.data)) as { id?: number; result?: { data?: string } }; if (j.id !== undefined) pendientes.get(j.id)?.(j.result ?? {}); };
      const cdp = (metodo: string, params: Record<string, unknown> = {}) => new Promise<{ data?: string }>((ok) => { const i = ++n; pendientes.set(i, ok); ws.send(JSON.stringify({ id: i, method: metodo, params })); });
      for (const o of ordenesDeEmulacion(a.ancho, a.alto)) await cdp(o.metodo, o.params);
      await cdp('Page.navigate', { url: url.href });
      await new Promise((ok) => setTimeout(ok, espera));
      const foto = await cdp('Page.captureScreenshot', { format: 'png' });
      ws.close();
      const salida = join(carpetaE, `${a.nombre}-${a.ancho}x${a.alto}.png`);
      await writeFile(salida, Buffer.from(foto.data ?? '', 'base64'));
      informeE.push(`\n${a.nombre} (${a.ancho}×${a.alto}, emulado): ${salida}`);
    } finally {
      hijo.kill();
      await new Promise((ok) => setTimeout(ok, 500));
      await rm(perfilE, { recursive: true, force: true }).catch(() => {});
    }
  }
  await writeFile(join(carpetaE, 'informe.txt'), informeE.join('\n') + '\n');
  console.log(informeE.join('\n'));
  process.exit(0);
}
const sello = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
const carpeta = join(memoria(id), 'director', 'capturas', sello);
await mkdir(carpeta, { recursive: true });
const perfil = await mkdtemp(join(tmpdir(), 'stl-mirar-'));
const informe: string[] = [`Mirada de ${url.href} · ${new Date().toISOString()} · ${navegador}`];

try {
  for (const a of anchos) {
    const salida = join(carpeta, `${a.nombre}-${a.ancho}.png`);
    const { error, stderr } = await new Promise<{ error: Error | null; stderr: string }>((ok) =>
      execFile(navegador, argumentosNavegador(url.href, a.ancho, a.alto, salida, perfil, espera, webgl), { timeout: espera + 60_000, maxBuffer: 16 * 1024 * 1024, windowsHide: true }, (e, _out, err) => ok({ error: e, stderr: String(err ?? '') })),
    );
    const consola = erroresDeConsola(stderr);
    const hecha = existsSync(salida);
    informe.push(`\n${a.nombre} (${a.ancho}×${a.alto}): ${hecha ? salida : `sin captura${error ? ` (${error.message.split('\n')[0]})` : ''}`}`);
    informe.push(consola.length ? consola.map((c) => `  consola: ${c}`).join('\n') : '  consola: sin mensajes');
  }
} finally {
  await rm(perfil, { recursive: true, force: true }).catch(() => {});
}

await writeFile(join(carpeta, 'informe.txt'), informe.join('\n') + '\n');
console.log(informe.join('\n'));
console.log(`\nAbre cada captura (Read) y di en tu respuesta qué viste. Las capturas no van en el commit del director: quedan en ${carpeta}.`);
