// El chequeo de salud del Studio («Autorreparación», capa uno, parte B: pedido pd_salud_b; decisiones nmw9gqnhetit y
// nmw9h9cbotit, 9 de noviembre de 2026). Sin el modelo: al encender el Studio y cada 5 minutos, el servidor mira que el plan
// se lea y sea válido, que las marcas de los pasos quepan en sus misiones, que ninguna revisión figure «en marcha» sin su
// proceso, que no quede un candado viejo del director, que la rama de la memoria (stl) no tenga conflictos, que Claude Code
// esté instalado y con sesión (sin llamar al modelo ni gastar del plan: `claude auth status`, nmw9p75pftit) y que el disco
// tenga al menos 2 GB libres (nmw9p7kpttit). Lo que puede deshacer sin tocar nada de la persona (una revisión atascada, un
// candado viejo, marcas que ya no valen) lo arregla solo y lo escribe en la bitácora y aquí, en .estudio/salud.json, solo de
// este computador, como el registro de fallas (ultimaCaida.ts). «Salud del Studio», en «Modelo y consumo», muestra una línea
// por arreglo de los últimos 7 días (nmw9p8305tit); lo que no puede arreglar es un aviso fino arriba de cada sección, hasta
// que se resuelva (nmw9of90atit). Este archivo tiene lo puro, la bitácora de arreglos y quien corre los chequeos; las sondas
// de cada chequeo las arma el servidor (api.ts › sondasDeSalud), con lo que ya sabe leer.
import { existsSync, mkdirSync, readFileSync, statfsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { candadoLibre, type Candado } from '../../src/director/candado.ts';
import { huellasDePasos, pasosVigentes, type Mision, type PasosMarcados } from '../../src/director/director.ts';
import { tb, type TextoBitacora } from '../../src/director/textoBitacora.ts';

/** Lo que mira el chequeo, en el orden en que se muestra. */
const CHEQUEOS_SALUD = ['plan', 'marcas', 'revision', 'candado', 'rama', 'claude', 'disco'] as const;
export type ChequeoSalud = (typeof CHEQUEOS_SALUD)[number];
/** Los arreglos seguros: los únicos que hace sin preguntar (nmw9gqnhetit). */
export type TipoArreglo = 'revision' | 'candado' | 'marcas';

export interface ArregloSalud {
  cuando: string;
  tipo: TipoArreglo;
  /** Sobre qué: el proyecto, la misión o la persona. */
  dato?: string;
}

/** Lo que no puede arreglar solo: el aviso de arriba lo muestra hasta que se resuelva. */
export interface ProblemaSalud {
  id: ChequeoSalud;
  /** El detalle tal cual (el primer error del plan, los archivos en conflicto, los GB libres, 'programa' o 'sesion'). */
  dato?: string;
  /** La orden que lo arregla, si la hay (iniciar sesión en Claude Code). */
  orden?: string;
}

export interface EstadoSalud {
  /** Cuándo corrió el último chequeo; null si aún no corrió. */
  cuando: string | null;
  chequeos: { id: ChequeoSalud; estado: 'bien' | 'arreglado' | 'problema' }[];
  problemas: ProblemaSalud[];
  /** Los arreglos de los últimos 7 días, el más nuevo primero. */
  arreglos: ArregloSalud[];
}

/** Cada cuánto corre, con el Studio encendido. */
export const MINUTOS_SALUD = 5;
/** Por debajo de esto libre en el disco, avisa (nmw9p7kpttit). */
export const BYTES_MINIMOS_DISCO = 2 * 1024 ** 3;
/** Cuántos días de arreglos se muestran y se guardan (nmw9p8305tit). */
const DIAS_ARREGLOS = 7;
const MAX_ARREGLOS = 200;
const ARCHIVO_SALUD = 'salud.json';

// ─────────────────────────────────────────── los chequeos, puros

/** El plan: que se lea, que sea JSON y que pase su validación. null si está bien. Pura, salvo `validar`. */
export function chequearPlan(texto: string | null, validar: (plan: unknown) => string[]): ProblemaSalud | null {
  if (texto === null) return { id: 'plan', dato: 'no se puede leer director/plan.json' };
  let plan: unknown;
  try {
    plan = JSON.parse(texto);
  } catch (e) {
    return { id: 'plan', dato: `director/plan.json no es JSON válido: ${(e as Error).message}`.slice(0, 300) };
  }
  const errores = validar(plan);
  return errores.length ? { id: 'plan', dato: errores[0].slice(0, 300) } : null;
}

/**
 * Las marcas de pasos que ya no caben en su misión de hoy (pasosVigentes: un paso que el director reescribió, una misión
 * con menos pasos que los marcados), corregidas: solo las que cambian, con las marcas que sí valen y su huella. Las de una
 * misión que ya no está en el plan no se tocan (salió al archivo y su marca es su historia). null si no hay nada que
 * corregir. Pura.
 */
export function marcasCorregidas(misiones: Pick<Mision, 'id' | 'pasos'>[], pasos: Record<string, PasosMarcados> | undefined): Record<string, PasosMarcados> | null {
  const cambios: Record<string, PasosMarcados> = {};
  for (const m of misiones) {
    const marca = pasos?.[m.id];
    if (!marca?.hechos?.length) continue;
    const vigentes = pasosVigentes(m, marca);
    if (vigentes.length === marca.hechos.length && vigentes.every((i, k) => i === marca.hechos[k])) continue;
    cambios[m.id] = { ...marca, hechos: vigentes, huellas: huellasDePasos(m, vigentes) };
  }
  return Object.keys(cambios).length ? cambios : null;
}

/** Una revisión como la guarda estudio.local.json, lo que hace falta de ella. */
export interface RevisionGuardada {
  proyecto: string;
  lanzada?: string;
  enCurso?: string;
  hecha?: string;
  error?: string;
  limite?: number;
}

/**
 * Si una revisión figura «en marcha» sin su proceso (nmw9gqnhetit). Lanzada por el Studio: el turno dice que ni el servidor
 * que la lanzó ni Claude Code existen (`muerto`), o pasó su límite y cinco minutos. Tomada a mano por la sesión del director
 * (solo `enCurso`): nadie tiene el candado del proyecto y pasó lo que vale el candado de una sesión. Nunca la que vigila este
 * mismo servidor. Pura.
 */
export function revisionAtascada(
  r: RevisionGuardada | null | undefined,
  x: { lanzado: 'servidor' | 'director' | 'muerto' | 'desconocido'; candadoVivo: boolean; esteLaVigila: boolean; ahora: number; maxMin: number; minSesion: number },
): boolean {
  if (!r || r.hecha || r.error || !(r.lanzada || r.enCurso) || x.esteLaVigila) return false;
  if (r.lanzada) return x.lanzado === 'muerto' || x.ahora - Date.parse(r.lanzada) > ((r.limite ?? x.maxMin) + 5) * 60_000;
  return !x.candadoVivo && x.ahora - Date.parse(r.enCurso!) > x.minSesion * 60_000;
}

/** Si un proceso existe (solo lo pregunta, nunca lo detiene). EPERM: existe, pero es de otro usuario. */
export const procesoVive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
};

/** Un candado del director que quedó tomado sin nadie detrás: pasó su hora o ya no existen sus procesos. Pura, salvo `vive`. */
export const candadoViejo = (c: Candado | null, ahora: number, vive: (pid: number) => boolean): boolean => !!c && candadoLibre(c, ahora, vive);

/** Los archivos en conflicto de la rama de la memoria, de `git ls-files -u` (uno por archivo). null si no hay. Pura. */
export function chequearRama(lsFilesU: string): ProblemaSalud | null {
  const archivos = [...new Set(lsFilesU.split(/\r?\n/).map((l) => l.split('\t')[1]?.trim()).filter((x): x is string => !!x))];
  return archivos.length ? { id: 'rama', dato: archivos.slice(0, 5).join(', ') + (archivos.length > 5 ? ` (+${archivos.length - 5})` : '') } : null;
}

/** Claude Code, de lo que dice `claude auth status` (revisor.ts › sesionDeClaude, sin modelo). Pura. */
export function chequearClaude(s: { ok: true } | { ok: false; falta: 'programa' | 'sesion'; orden: string }): ProblemaSalud | null {
  return s.ok ? null : { id: 'claude', dato: s.falta, orden: s.orden };
}

/** El disco: menos de 2 GB libres es un problema, con los GB que quedan (uno decimal). Sin saberlo, nada. Pura. */
export function chequearDisco(libres: number | null): ProblemaSalud | null {
  if (libres === null || libres >= BYTES_MINIMOS_DISCO) return null;
  return { id: 'disco', dato: (Math.floor((libres / 1024 ** 3) * 10) / 10).toFixed(1) };
}

/** Lo libre en el disco de una carpeta, como lo mide la instalación de la voz (instalarVoz.ts); null si no se sabe. */
export function libreEnDisco(carpeta: string): number | null {
  try {
    const s = statfsSync(carpeta);
    return s.bavail * s.bsize;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────── los arreglos de los últimos 7 días, en .estudio/salud.json

/** Los de los últimos 7 días, el más nuevo primero. Pura. */
export function arreglosRecientes(lista: ArregloSalud[], ahora = Date.now()): ArregloSalud[] {
  const limite = ahora - DIAS_ARREGLOS * 86_400_000;
  return lista
    .filter((a) => a && typeof a.cuando === 'string' && Date.parse(a.cuando) >= limite)
    .sort((a, b) => b.cuando.localeCompare(a.cuando))
    .slice(0, MAX_ARREGLOS);
}

/** Los arreglos guardados en `carpeta` (.estudio/), de los últimos 7 días. */
export function leerArreglos(carpeta: string, ahora = Date.now()): ArregloSalud[] {
  const archivo = join(carpeta, ARCHIVO_SALUD);
  if (!existsSync(archivo)) return [];
  try {
    const x = JSON.parse(readFileSync(archivo, 'utf8')) as { arreglos?: ArregloSalud[] };
    return Array.isArray(x?.arreglos) ? arreglosRecientes(x.arreglos, ahora) : [];
  } catch {
    return [];
  }
}

/** Guarda los arreglos nuevos y, de paso, olvida los de más de 7 días. */
export function anotarArreglos(carpeta: string, nuevos: ArregloSalud[], ahora = Date.now()): ArregloSalud[] {
  const lista = arreglosRecientes([...leerArreglos(carpeta, ahora), ...nuevos], ahora);
  mkdirSync(carpeta, { recursive: true });
  writeFileSync(join(carpeta, ARCHIVO_SALUD), JSON.stringify({ arreglos: lista }, null, 2));
  return lista;
}

// ─────────────────────────────────────────── quien corre los chequeos

/** Lo que encontró una sonda: nada (null), un problema que no arregla, o un arreglo seguro con cómo hacerlo. */
export type Hallazgo = null | { problema: ProblemaSalud } | { arreglo: { tipo: TipoArreglo; dato?: string; hacer: () => Promise<void> } };

export interface Sonda {
  id: ChequeoSalud;
  mirar: () => Promise<Hallazgo>;
}

/**
 * Corre las sondas, una tras otra, y hace los arreglos seguros: cada uno queda en .estudio/salud.json y pasa por `anotar`
 * (la bitácora). Un arreglo que falla queda como problema, con su error. Una sonda que no pudo mirar no se muestra (no
 * se inventa un «bien» ni un problema que no se sabe).
 */
export async function chequearSalud(sondas: Sonda[], carpeta: string, anotar: (a: ArregloSalud) => Promise<void>, ahora = () => new Date().toISOString()): Promise<EstadoSalud> {
  const chequeos: EstadoSalud['chequeos'] = [];
  const problemas: ProblemaSalud[] = [];
  const nuevos: ArregloSalud[] = [];
  for (const s of sondas) {
    let h: Hallazgo;
    try {
      h = await s.mirar();
    } catch {
      continue;
    }
    if (!h) chequeos.push({ id: s.id, estado: 'bien' });
    else if ('problema' in h) {
      chequeos.push({ id: s.id, estado: 'problema' });
      problemas.push(h.problema);
    } else {
      try {
        await h.arreglo.hacer();
        const a: ArregloSalud = { cuando: ahora(), tipo: h.arreglo.tipo, ...(h.arreglo.dato ? { dato: h.arreglo.dato } : {}) };
        nuevos.push(a);
        chequeos.push({ id: s.id, estado: 'arreglado' });
        await anotar(a).catch(() => undefined);
      } catch (e) {
        chequeos.push({ id: s.id, estado: 'problema' });
        problemas.push({ id: s.id, dato: `no se pudo arreglar: ${(e as Error).message}`.slice(0, 300) });
      }
    }
  }
  // Con el mismo reloj con que se anotó cada arreglo: con el de la pared, los de una prueba con fecha fija se olvidaban
  // pasados 7 días
  const cuando = ahora();
  const arreglos = nuevos.length ? anotarArreglos(carpeta, nuevos, Date.parse(cuando)) : leerArreglos(carpeta, Date.parse(cuando));
  return { cuando, chequeos, problemas, arreglos };
}

/** Lo que dice la bitácora de cada arreglo seguro, en una frase. Pura. */
export function arregloEnLaBitacora(a: ArregloSalud): TextoBitacora {
  const de = a.dato ? ` (${a.dato})` : '';
  return tb(a.tipo === 'revision' ? 'bitacora.salud.revision' : a.tipo === 'candado' ? 'bitacora.salud.candado' : 'bitacora.salud.marcas', { de });
}
