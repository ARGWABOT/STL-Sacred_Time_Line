// La foto inicial de la memoria del director (pd_foto_inicial, nota de voz del titular nmvlm61gotit): una sola pasada
// que deja en el plan solo lo que está en firme y lleva al archivo, de una vez, todo lo cerrado (src/director/director.ts
// › fotoInicial). Nada se borra: el plan unido con su archivo es el mismo, y cada cosa se sigue encontrando por su id con
// buscar.ts. Uso: node tools/director/foto.ts [--proyecto <id>] [--prueba] (con --prueba, solo cuenta, sin escribir).
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fotoInicial, juntarArchivos, partirArchivoPorMes, type ArchivoPlan, type Plan } from '../../src/director/director.ts';
import { enDisco, escribirDeUnaVez, rutasDe } from '../../src/director/proyectos.ts';
import { argumentos, leerTodo, proyectoElegido, raiz } from './comun.ts';

const { args, pedido } = argumentos();
const elegido = await proyectoElegido(pedido);
const rutaPlan = enDisco(raiz, rutasDe(elegido).plan);
const rutaPrevio = enDisco(raiz, rutasDe(elegido).archivo);
const carpetaMeses = enDisco(raiz, rutasDe(elegido).archivoMeses);
const leerJson = (ruta: string) => JSON.parse(readFileSync(ruta, 'utf-8'));
const plan: Plan = leerJson(rutaPlan);
const previo: Partial<ArchivoPlan> | null = existsSync(rutaPrevio) ? leerJson(rutaPrevio) : null;
const meses = existsSync(carpetaMeses) ? readdirSync(carpetaMeses).filter((f) => f.endsWith('.json')).sort() : [];
const archivo = juntarArchivos([...(previo ? [previo] : []), ...meses.map((f) => leerJson(join(carpetaMeses, f)))]);
const { estado } = await leerTodo(pedido, false);

const foto = fotoInicial(plan, archivo, estado, new Date().toISOString());
const kb = (p: Plan) => Math.round(Buffer.byteLength(JSON.stringify(p, null, 2)) / 1024);
const enFirme = (p: Plan) => (p.misiones?.length ?? 0) + Object.keys(p.respuestas ?? {}).length + Object.keys(p.revisiones ?? {}).length + (p.propuestas?.length ?? 0) + (p.pedidos?.length ?? 0) + (p.adelantado?.length ?? 0) + (p.fases ?? []).reduce((n, f) => n + (f.misiones?.length ?? 0), 0);
console.log(`La foto inicial de ${elegido}: ${foto.movidas} cosas pasan al archivo y ${enFirme(foto.plan)} quedan en firme en el plan (misiones, respuestas, veredictos, propuestas, pedidos, lo adelantado y las misiones previstas); el plan pasa de ${kb(plan)} KB a ${kb(foto.plan)} KB.`);
if (args.includes('--prueba') || !foto.movidas) process.exit(0);

mkdirSync(carpetaMeses, { recursive: true });
const escritos: string[] = [];
for (const [mes, parte] of Object.entries(partirArchivoPorMes(foto.archivo, previo))) {
  const ruta = join(carpetaMeses, `${mes}.json`);
  const texto = JSON.stringify(parte, null, 2) + '\n';
  if (existsSync(ruta) && readFileSync(ruta, 'utf-8') === texto) continue;
  await escribirDeUnaVez(ruta, texto);
  escritos.push(`director/archivo/${mes}.json`);
}
await escribirDeUnaVez(rutaPlan, JSON.stringify(foto.plan, null, 2) + '\n');
console.log(`Escritos el plan y ${escritos.join(', ') || 'ningún mes nuevo'}: agrégalos al commit de la memoria.`);
