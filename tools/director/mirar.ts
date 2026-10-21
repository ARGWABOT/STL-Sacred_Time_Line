// El director mira una página en un navegador sin pantalla: el Studio encendido, la portada pública u otra página, en
// tres anchos (teléfono, tableta y escritorio). Guarda cada captura en la memoria del proyecto y dice los errores de la
// consola; el director abre las imágenes (las lee como cualquier imagen) y cuenta en su respuesta qué vio. Usa el Edge o
// el Chrome del computador, así que no hay nada que instalar (STL_NAVEGADOR, si está en otro lugar).
// Uso: node tools/director/mirar.ts                                → el Studio encendido, sin «Dónde quedamos» encima (?mirar)
//      node tools/director/mirar.ts "http://localhost:5180/?mirar&vista=ruta" → otra vista del Studio, sin el resumen encima
//      node tools/director/mirar.ts https://argwabot.github.io/…   → otra página (https, o de este computador)
//      … --anchos telefono,escritorio                              → solo esos anchos
//      … --alto 2400                                               → una ventana más alta, para ver lo que queda abajo
//                                                                    (llevar a un ancla desplazando la página deja la captura en blanco)
//      … --proyecto <id>                                           → guarda las capturas en la memoria de ese proyecto
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ANCHOS, argumentosNavegador, candidatosNavegador, erroresDeConsola, urlPermitida } from '../../src/director/mirada.ts';
import { argumentos, memoria, proyectoElegido } from './comun.ts';

const { args, pedido } = argumentos();
/** El valor de una opción (`--anchos x`), y los argumentos sin ella. */
const opcion = (xs: string[], nombre: string): [string | null, string[]] => {
  const i = xs.indexOf(nombre);
  return i >= 0 ? [xs[i + 1] ?? '', [...xs.slice(0, i), ...xs.slice(i + 2)]] : [null, xs];
};
const [pedidosTexto, sinAnchos] = opcion(args, '--anchos');
const [altoTexto, resto] = opcion(sinAnchos, '--alto');
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
const anchos = (pedidos ? ANCHOS.filter((a) => pedidos.includes(a.nombre)) : ANCHOS).map((a) => (alto ? { ...a, alto } : a));
if (!anchos.length) {
  console.error(`Los anchos son: ${ANCHOS.map((a) => a.nombre).join(', ')}.`);
  process.exit(1);
}
const navegador = candidatosNavegador(process.platform, process.env).find((r) => existsSync(r));
if (!navegador) {
  console.error('No encontré Edge ni Chrome en este computador. Si está en otro lugar, dímelo con STL_NAVEGADOR=<ruta del ejecutable>.');
  process.exit(1);
}

const id = await proyectoElegido(pedido);
const sello = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
const carpeta = join(memoria(id), 'director', 'capturas', sello);
await mkdir(carpeta, { recursive: true });
const perfil = await mkdtemp(join(tmpdir(), 'stl-mirar-'));
const informe: string[] = [`Mirada de ${url.href} · ${new Date().toISOString()} · ${navegador}`];

try {
  for (const a of anchos) {
    const salida = join(carpeta, `${a.nombre}-${a.ancho}.png`);
    const { error, stderr } = await new Promise<{ error: Error | null; stderr: string }>((ok) =>
      execFile(navegador, argumentosNavegador(url.href, a.ancho, a.alto, salida, perfil), { timeout: 60_000, maxBuffer: 16 * 1024 * 1024, windowsHide: true }, (e, _out, err) => ok({ error: e, stderr: String(err ?? '') })),
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
