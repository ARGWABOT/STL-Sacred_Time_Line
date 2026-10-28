// La lista de encargos de la revisión en dos tiempos (pd_dos_tiempos): la escribe el primer tiempo, la valida el lanzador
// del Studio y queda junto al registro de la revisión (dosTiempos.ts › archivoDeEncargos). El segundo tiempo marca aquí
// cada encargo apenas lo termina, y la persona lo ve en «Lo que va haciendo el director» (tu elección del 26 de octubre
// de 2026). Sin --hecho, la imprime con lo que va hecho.
//   node tools/director/encargos.ts [--proyecto <id>] [--hecho <id>]
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { archivoDeEncargos, conEncargoHecho, ultimaListaDe, type EncargoDeRevision } from '../../src/director/dosTiempos.ts';
import { VARIABLE_REGISTRO } from '../../src/director/paquete.ts';
import { argumentos, proyectoElegido, raiz } from './comun.ts';

const { args, pedido } = argumentos();
const proyecto = await proyectoElegido(pedido);
// La de esta revisión, si la corre el director que lanzó el Studio; si no, la más nueva del proyecto
const carpeta = join(raiz, '.revisiones');
const delRegistro = process.env[VARIABLE_REGISTRO];
const ultima = existsSync(carpeta) ? ultimaListaDe(readdirSync(carpeta), proyecto) : null;
const archivo = delRegistro && basename(delRegistro).startsWith(`${proyecto}-`) ? archivoDeEncargos(delRegistro) : ultima ? join(carpeta, ultima) : null;
if (!archivo || !existsSync(archivo)) {
  console.log('Esta revisión no tiene lista de encargos: el primer tiempo no corrió (la revisión trae un solo trabajo pequeño, o no se pudo) y se trabaja en un solo tiempo, como antes.');
  process.exit(0);
}
const lista = JSON.parse(readFileSync(archivo, 'utf8')) as EncargoDeRevision[];
const i = args.indexOf('--hecho');
if (i >= 0) {
  const id = args[i + 1] ?? '';
  const nueva = conEncargoHecho(lista, id, new Date().toISOString());
  if (!nueva) {
    console.error(`No hay un encargo «${id}» en el plan de esta revisión. Los que hay: ${lista.map((e) => e.id).join(', ')}.`);
    process.exit(1);
  }
  writeFileSync(archivo, `${JSON.stringify(nueva, null, 2)}\n`, 'utf8');
  const faltan = nueva.filter((e) => !e.hecho);
  console.log(`Hecho: «${id}». ${faltan.length ? `Faltan ${faltan.length}: ${faltan.map((e) => e.id).join(', ')}.` : 'Ya no falta ninguno: sigue con lo que pida la bandeja y el cierre.'}`);
  process.exit(0);
}
for (const e of lista) console.log(`${e.hecho ? '✓' : '·'} «${e.id}»: ${e.que}`);
