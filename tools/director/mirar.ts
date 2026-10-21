// El director mira una página en un navegador sin pantalla: el Studio encendido, la portada pública u otra página, en
// tres anchos (teléfono, tableta y escritorio). Guarda cada captura en la memoria del proyecto y dice los errores de la
// consola; el director abre las imágenes (las lee como cualquier imagen) y cuenta en su respuesta qué vio. Usa el Edge o
// el Chrome del computador, así que no hay nada que instalar (STL_NAVEGADOR, si está en otro lugar).
// Uso: node tools/director/mirar.ts                                → el Studio encendido (http://localhost:5180/)
//      node tools/director/mirar.ts https://argwabot.github.io/…   → otra página (https, o de este computador)
//      … --anchos telefono,escritorio                              → solo esos anchos
//      … --proyecto <id>                                           → guarda las capturas en la memoria de ese proyecto
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ANCHOS, argumentosNavegador, candidatosNavegador, erroresDeConsola, urlPermitida } from '../../src/director/mirada.ts';
import { argumentos, memoria, proyectoElegido } from './comun.ts';

const { args, pedido } = argumentos();
const iAnchos = args.indexOf('--anchos');
const pedidos = iAnchos >= 0 ? (args[iAnchos + 1] ?? '').split(',') : null;
const resto = iAnchos >= 0 ? [...args.slice(0, iAnchos), ...args.slice(iAnchos + 2)] : args;
const url = urlPermitida(resto[0] ?? 'http://localhost:5180/');
if (!url) {
  console.error('Solo miro páginas https o de este computador (http://localhost…).');
  process.exit(1);
}
const anchos = pedidos ? ANCHOS.filter((a) => pedidos.includes(a.nombre)) : ANCHOS;
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
