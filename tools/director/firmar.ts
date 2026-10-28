// Un commit local con la firma de publicación del proyecto en autor y confirmador, sin tocar la identidad de git de la
// carpeta, que es la del titular (con ella el Studio firma sus decisiones). Permiso que el titular autorizó el 22 de
// octubre de 2026 (misión «Decide si mis commits nacen firmados como ARGWABOT»): los commits nacen firmados y subir ya no
// los reescribe, así que sus códigos no cambian y las citas del plan no quedan huérfanas. Solo hace el commit local:
// nunca sube. La firma sale del proyecto.json del proyecto (`firma`) o, en el mismo Studio, de tools/firma.ts.
// Uso: node tools/director/firmar.ts [--proyecto <id>] -m "<mensaje>" [-m "<más>"] -- <rutas…>
//      (las rutas, relativas al repositorio del proyecto; un archivo nuevo, con git add antes)
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { leerRutaRepositorio } from '../../src/director/proyectos.ts';
import { argumentosDeFirmar, entornoDeFirma, firmaDelProyecto, type Firma } from '../firma.ts';
import { argumentos, leerTodo, raiz } from './comun.ts';

const { args, pedido } = argumentos();
const a = argumentosDeFirmar(args);
if ('error' in a) {
  console.error(a.error);
  process.exit(1);
}
const { id, proyecto } = await leerTodo(pedido, false);
const repo = await leerRutaRepositorio(raiz, id);
if (!repo) {
  console.error(`El proyecto «${id}» no tiene su repositorio conectado en este computador (Estudio › Proyecto).`);
  process.exit(1);
}
const mismo = resolve(repo).replace(/[\\/]+$/, '').toLowerCase() === resolve(raiz).replace(/[\\/]+$/, '').toLowerCase();
// `firma` es opcional en proyecto.json: la escribe el titular cuando su proyecto publica con otra identidad
const firma = firmaDelProyecto((proyecto as { firma?: Partial<Firma> }).firma, mismo);
if (!firma) {
  console.error(`El proyecto «${id}» no tiene firma de publicación (proyecto.json › firma): haz el commit con git commit, con la identidad de la carpeta.`);
  process.exit(1);
}
execFileSync('git', ['commit', ...a.mensajes.flatMap((m) => ['-m', m]), '--', ...a.rutas], {
  cwd: repo,
  stdio: 'inherit',
  env: { ...process.env, ...entornoDeFirma(firma) },
});
console.log(`Commit firmado como ${firma.nombre} <${firma.correo}>, autor y confirmador.`);
