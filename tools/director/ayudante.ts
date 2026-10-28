// El encargo de un ayudante (propuesta aceptada «El director arma el contexto de cada encargo», pr_encargo_a_medida, punto
// 2): lo imprime entero, para dárselo tal cual a un ayudante (la herramienta Agent), con lo que escribe el director (de
// dónde nace, qué hacer, qué leer y cómo se comprueba) y las reglas que el ayudante no recibe, que pone el código
// (src/director/ayudante.ts). Al terminar, el director verifica el resultado contra este encargo antes de darlo por hecho.
// Uso: node tools/director/ayudante.ts [--proyecto <id>] --origen <id> --que "<qué>" --leer "<ruta>,<ruta>" --comprobar "<cómo>"
import { resolve } from 'node:path';
import { encargoDeAyudante, faltaEnElEncargo, type EncargoDeAyudante } from '../../src/director/ayudante.ts';
import { leerRutaRepositorio } from '../../src/director/proyectos.ts';
import { firmaDelProyecto, type Firma } from '../firma.ts';
import { argumentos, leerTodo, raiz } from './comun.ts';

const { args, pedido } = argumentos();
const valor = (opcion: string) => {
  const i = args.indexOf(opcion);
  return i >= 0 ? args[i + 1] : undefined;
};
const encargo: Partial<EncargoDeAyudante> = {
  origen: valor('--origen'),
  que: valor('--que'),
  leer: valor('--leer')?.split(',').map((r) => r.trim()).filter(Boolean),
  comprobar: valor('--comprobar'),
};
const falta = faltaEnElEncargo(encargo);
if (falta.length) {
  console.error(`Al encargo le falta:\n${falta.map((f) => `- ${f}`).join('\n')}`);
  process.exit(1);
}
const { id, proyecto } = await leerTodo(pedido, false);
const carpeta = await leerRutaRepositorio(raiz, id);
if (!carpeta) {
  console.error(`El proyecto «${id}» no tiene su repositorio conectado en este computador (Estudio › Proyecto).`);
  process.exit(1);
}
const mismo = resolve(carpeta).replace(/[\\/]+$/, '').toLowerCase() === resolve(raiz).replace(/[\\/]+$/, '').toLowerCase();
// Como firmar.ts: la firma de publicación sale del proyecto.json (`firma`) o, en el mismo Studio, de tools/firma.ts
const firma = !!firmaDelProyecto((proyecto as { firma?: Partial<Firma> }).firma, mismo);
console.log(encargoDeAyudante(encargo as EncargoDeAyudante, { proyecto: id, carpeta, firma }));
