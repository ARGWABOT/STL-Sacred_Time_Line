// Lo que comparten las herramientas del director: saber de qué proyecto se trata (el activo de este computador, o el
// que se pida con --proyecto <id>), leer su plan, su proyecto y el estado de su equipo de donde estén más nuevos (su
// memoria, <repositorio>/.stl, o su rama stl en GitHub, sin pull) y saber dónde está su repositorio en este computador.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { estadoMision, etapaArranque, pendientesDelDirector, proyectoVacio, TITULAR, unirEstados, type EstadoDirector, type Persona, type Plan, type Proyecto } from '../../src/director/director.ts';
import { leerFrescoTexto, listarRemoto, Traedor } from '../../src/director/fresco.ts';
import { elegirActivo, enDisco, leerLocal, leerRutaRepositorio, memoriaDe, proyectosLocales, RAMA, rutasDe } from '../../src/director/proyectos.ts';
import { comprobarRepositorio, type InfoRepositorio } from '../../src/director/repositorio.ts';

export const raiz = join(import.meta.dirname, '..', '..');

/** Los argumentos sin `--proyecto <id>` (que se lee aparte). */
export function argumentos(): { args: string[]; pedido: string | null } {
  const a = process.argv.slice(2);
  const i = a.indexOf('--proyecto');
  if (i < 0) return { args: a, pedido: null };
  return { args: [...a.slice(0, i), ...a.slice(i + 2)], pedido: a[i + 1] ?? null };
}

/** Los proyectos de este Estudio: los de estudio.local.json con su memoria en su repositorio. */
export const listarIds = () => proyectosLocales(raiz);

/** La memoria de un proyecto en este computador (<repositorio>/.stl): donde el director escribe y hace sus commits. */
export const memoria = (id: string) => memoriaDe(raiz, id)!;

/** El proyecto del que se trata: el pedido o el activo. Sin proyectos, termina con su explicación. */
export async function proyectoElegido(pedido: string | null): Promise<string> {
  const ids = await listarIds();
  if (!ids.length) {
    console.error('Aún no hay proyectos en el Estudio: el titular entrega el primero en el Estudio (npm run estudio › Entregar proyectos).');
    process.exit(1);
  }
  if (pedido && !ids.includes(pedido)) {
    console.error(`No hay un proyecto «${pedido}». Los que hay: ${ids.join(', ')}.`);
    process.exit(1);
  }
  return pedido ?? elegirActivo(await leerLocal(raiz), ids)!;
}

export interface Todo {
  id: string;
  rutas: ReturnType<typeof rutasDe>;
  plan: Plan;
  proyecto: Proyecto;
  estado: EstadoDirector;
  personas: Persona[];
  repo: InfoRepositorio | null;
  errorRepo: string | null;
}

/** Lee todo lo de un proyecto. */
export async function leerProyecto(id: string): Promise<Todo> {
  const rutas = rutasDe(id);
  const plan: Plan = JSON.parse((await leerFrescoTexto(raiz, rutas.plan)) ?? '{}');
  const proyecto: Proyecto = { ...proyectoVacio(), ...JSON.parse((await leerFrescoTexto(raiz, rutas.proyecto)) ?? '{}') };
  const ids = new Set<Persona>([TITULAR, ...proyecto.equipo.map((i) => i.id)]);
  const dir = enDisco(raiz, rutas.equipo);
  if (existsSync(dir)) for (const f of readdirSync(dir)) if (f.endsWith('.json')) ids.add(f.slice(0, -5));
  for (const r of await listarRemoto(raiz, rutas.equipo)) if (r.endsWith('.json')) ids.add(r.split('/').pop()!.slice(0, -5));
  const porPersona: Record<Persona, object> = {};
  for (const p of ids) porPersona[p] = JSON.parse((await leerFrescoTexto(raiz, rutas.persona(p))) ?? '{}');
  const ruta = await leerRutaRepositorio(raiz, id);
  const c = ruta ? await comprobarRepositorio(ruta) : null;
  return {
    id,
    rutas,
    plan,
    proyecto,
    estado: unirEstados(porPersona),
    personas: proyecto.equipo.length ? proyecto.equipo.map((i) => i.id) : [TITULAR],
    repo: c?.ok ? c.info : null,
    errorRepo: !ruta ? 'Aún no se conecta el repositorio en este computador (Estudio › Proyecto).' : c && !c.ok ? c.error : null,
  };
}

/** Trae la memoria de GitHub (si hay remoto) y lee todo del proyecto pedido o del activo. */
export async function leerTodo(pedido: string | null, traer = true): Promise<Todo> {
  const id = await proyectoElegido(pedido);
  if (traer) await new Traedor(memoria(id), 30_000, RAMA).traer(true);
  return leerProyecto(id);
}

/** Una línea por cada otro proyecto: cómo va y cuánto espera al director (no se atiende en esta revisión). */
export async function otrosProyectos(activo: string): Promise<string[]> {
  const local = await leerLocal(raiz);
  const salida: string[] = [];
  for (const id of await listarIds()) {
    if (id === activo) continue;
    const t = await leerProyecto(id);
    const pend = pendientesDelDirector(t.plan, t.estado);
    const abiertas = t.plan.misiones.filter((m) => ['pendiente', 'en_curso', 'rehacer'].includes(estadoMision(m, t.plan, t.estado))).length;
    salida.push(`${t.proyecto.nombre || id} (${id}): ${etapaArranque(t.plan, t.proyecto, !!local.repositorios[id])}, ${pend.entregas.length + pend.notas.length} por revisar, ${abiertas} misiones abiertas`);
  }
  return salida;
}

/**
 * La cola de diagnósticos: los proyectos existentes recién entregados (sin diagnóstico, con el repositorio conectado en
 * este computador), del trabajo más reciente al más viejo. El director los diagnostica en cada revisión, como máximo
 * POR_REVISION, además del proyecto activo: es trabajo suyo, no del titular, que sigue viendo un proyecto a la vez.
 */
export const POR_REVISION = 3;
export async function colaDeDiagnosticos(activo: string): Promise<{ id: string; nombre: string; historial: string }[]> {
  const local = await leerLocal(raiz);
  const cola: { id: string; nombre: string; historial: string; ultima: string }[] = [];
  for (const id of await listarIds()) {
    if (id === activo) continue;
    const t = await leerProyecto(id);
    if (t.plan.diagnostico?.fecha || t.proyecto.tipo === 'nuevo' || !local.repositorios[id]) continue;
    const h = t.proyecto.historialIA ?? [];
    cola.push({ id, nombre: t.proyecto.nombre || id, historial: h.map((x) => `${x.agente}${x.sesiones ? ` (${x.sesiones})` : ''}`).join(', '), ultima: h.map((x) => x.ultima ?? '').sort().at(-1) ?? '' });
  }
  return cola.sort((a, b) => b.ultima.localeCompare(a.ultima)).map(({ id, nombre, historial }) => ({ id, nombre, historial }));
}

export const nombreDe = (proyecto: Proyecto, p: Persona) => proyecto.equipo.find((i) => i.id === p)?.nombre ?? p;
