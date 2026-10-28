// La corrida de la medición del núcleo con el director de verdad (propuesta aceptada «El núcleo del director, medido con
// casos fijos», pr_nucleo_medido, punto 2). Cada vuelta arma un Estudio de prueba con el código del Studio dentro y la
// situación de su caso (src/director/medicion.ts), lanza al director como en una revisión (el mismo encargo, el modelo y el
// esfuerzo elegidos para él y el arranque limpio) con permisos solo dentro de ese Estudio, y al terminar lee lo que dejó: si
// la revisión cerró, lo que comprueba el código y, si el caso tiene pauta, la nota de quien califica (Sonnet, sin
// herramientas y sin saber qué modelo dirigió; elecciones del titular del 26 de octubre de 2026). Lo que gasta es de verdad:
// la corrida la pide la persona, con su costo a la vista, y nunca junto a una revisión, porque las dos gastan del mismo
// límite de la cuenta.
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { ajustesDelDirector, conNucleoExplicito, fuentesDelDirector, nucleoExplicito, textoDelNucleo } from './ajustesClaude';
import { NUNCA_SIEMPRE } from './permisosNegados';
import { consumoDe, detener, encargo, lanzarClaude, negado, permitido, SIN_ESPERAS } from './revisor';
import { CASOS_FIJOS, type CasoFijo } from '../../src/director/casosFijos';
import { ALCANCES, casosDeCorrida, casosDelAlcance, casosMedibles, costoEstimado, discrepancias, encargoDeCalificacion, leerCalificacion, loQueDejo, minutosEstimados, resumenDeCorrida, vueltasQueFaltan, type Alcance, type Calificacion, type Corrida, type Vuelta } from '../../src/director/corrida';
import { unirEstados } from '../../src/director/director';
import { COMPROBACIONES, SITUACIONES } from '../../src/director/medicion';
import { leerLocal } from '../../src/director/proyectos';
import { armarEstudioDePrueba } from '../../tools/director/estudioDePrueba';

/** Lo más que dura el director en una vuelta: la revisión de un proyecto de prueba, chico. */
const MAX_MIN_VUELTA = 30;
/** Lo más que tarda quien califica: lee y responde una línea. */
const MAX_MIN_CALIFICAR = 5;
/** Quien califica lo que el código no comprueba (elección del titular del 26 de octubre de 2026). */
const MODELO_CALIFICA = 'sonnet';

/** El id del proyecto de prueba de una vuelta: válido como proyecto (ID_VALIDO) y distinto de todo proyecto real. */
export const idDeVuelta = (caso: string, numero: number) => `m-${caso.replace(/^c_/, '').replace(/_/g, '-')}`.slice(0, 36) + `-${numero}`;

/**
 * Los argumentos de Claude Code para el director en una vuelta: los de una revisión, con el modelo y el esfuerzo elegidos
 * para él, el arranque limpio, su núcleo explícito (`nucleo`: el archivo con el texto que pasa el lanzador,
 * textoDelNucleo), y lo permitido y lo negado de un proyecto cuyo Studio es el de prueba: lee y escribe solo ahí. Pura.
 */
export function argumentosDeVuelta(v: { estudio: string; repo: string; ajustes: string; nucleo: string; modelo: string | null; esfuerzo: string | null; casa?: string }): string[] {
  const prohibidas = [...new Set([...SIN_ESPERAS, ...negado(v.repo, v.estudio), ...NUNCA_SIEMPRE])];
  return [
    '-p', '--output-format', 'stream-json', '--verbose',
    ...(v.modelo ? ['--model', v.modelo] : []), ...(v.esfuerzo ? ['--effort', v.esfuerzo] : []),
    '--settings', v.ajustes, ...fuentesDelDirector(false), '--permission-mode', 'dontAsk',
    ...nucleoExplicito(v.estudio, v.nucleo).argumentos,
    '--add-dir', v.repo, '--disallowedTools', ...prohibidas, '--allowedTools', ...permitido(v.repo, false, v.estudio, v.casa ?? homedir()),
  ];
}

/** Los de quien califica: Sonnet, sin ninguna herramienta permitida (todo se le niega sin preguntar), y su resultado en JSON. Pura. */
export function argumentosDeCalificacion(ajustes: string): string[] {
  return ['-p', '--output-format', 'json', '--model', MODELO_CALIFICA, '--settings', ajustes, ...fuentesDelDirector(false), '--permission-mode', 'dontAsk'];
}

/**
 * Lanza Claude Code con su encargo y espera a que termine, o lo detiene en su límite. Devuelve si terminó solo. Con
 * STL_RAIZ en el Studio de prueba (`cwd`), aunque quien lo lanza tenga otro: sus herramientas nunca miran otro Studio.
 */
function correr(programa: string, args: string[], cwd: string, entrada: string, salida: string, minutos: number, modelo: string | null): Promise<boolean> {
  return new Promise((listo) => {
    const fd = openSync(salida, 'a');
    let p: ReturnType<typeof lanzarClaude>;
    try {
      p = lanzarClaude(programa, args, { cwd, stdio: ['pipe', fd, fd] }, undefined, modelo, { STL_RAIZ: cwd });
    } catch {
      closeSync(fd);
      return listo(false);
    }
    let cortada = false;
    const limite = setTimeout(() => {
      cortada = true;
      detener(p);
    }, minutos * 60_000);
    const fin = () => {
      clearTimeout(limite);
      try {
        closeSync(fd);
      } catch {
        // ya cerrado
      }
      listo(!cortada);
    };
    p.once('exit', fin);
    p.once('error', fin);
    p.stdin?.end(entrada);
  });
}

/** Quien califica: su nota, leída de su resultado (un JSON con `result` y `total_cost_usd`), y lo que gastó. */
function leerResultadoDeCalificacion(texto: string): { calificacion: Calificacion | null; costo: number | null } {
  try {
    const r = JSON.parse(texto.trim().split(/\r?\n/).filter(Boolean).at(-1) ?? '') as { result?: unknown; total_cost_usd?: unknown };
    return { calificacion: typeof r.result === 'string' ? leerCalificacion(r.result) : null, costo: typeof r.total_cost_usd === 'number' ? r.total_cost_usd : null };
  } catch {
    return { calificacion: null, costo: null };
  }
}

interface OpcionesDeVuelta {
  /** El Studio real: de donde se copia el código al de prueba. Nunca se escribe en él. */
  raiz: string;
  /** Donde se arma el Estudio de prueba (una carpeta temporal); se borra al terminar la vuelta. */
  base: string;
  caso: string;
  numero: number;
  modelo: string | null;
  esfuerzo: string | null;
  /** Claude Code (buscarClaude) y, en las pruebas, lo que va antes de sus argumentos. */
  programa: string;
  previos?: string[];
  casa?: string;
  minutos?: number;
}

/**
 * Una vuelta de un caso, de punta a punta: arma su Estudio de prueba con el código dentro, lanza al director con el encargo
 * de una revisión, comprueba lo que dejó y, si el caso tiene pauta, lo califica otro modelo. El Estudio de prueba se borra
 * al terminar (sus dependencias están enlazadas, no copiadas: borrar el enlace no las toca).
 */
export async function correrVuelta(o: OpcionesDeVuelta): Promise<Vuelta> {
  const caso = CASOS_FIJOS.find((c) => c.id === o.caso);
  const situacion = SITUACIONES[o.caso];
  const comprobar = COMPROBACIONES[o.caso];
  if (!caso || !situacion || !comprobar) throw new Error(`El caso «${o.caso}» no tiene situación para medirlo.`);
  const id = idDeVuelta(o.caso, o.numero);
  mkdirSync(o.base, { recursive: true });
  const e = await armarEstudioDePrueba(o.base, { id, ...situacion, conCodigo: true, raiz: o.raiz });
  try {
    const antes = e.plan();
    const estado = unirEstados({ titular: JSON.parse(readFileSync(join(e.memoria, 'director', 'equipo', 'titular.json'), 'utf8')) });
    const carpeta = join(e.estudio, '.revisiones');
    mkdirSync(carpeta, { recursive: true });
    // El director, con su núcleo explícito como en una revisión; quien califica, con los ajustes de antes, para que su
    // nota no cambie con lo que cambia el lanzador del director
    const deCalificacion = JSON.stringify(ajustesDelDirector(false, false, o.casa ?? homedir(), false).ajustes);
    const ajustesCalifica = join(carpeta, 'ajustes-de-quien-califica.json');
    writeFileSync(ajustesCalifica, deCalificacion);
    const ajustes = join(carpeta, 'ajustes-de-la-medicion.json');
    writeFileSync(ajustes, conNucleoExplicito(deCalificacion, e.estudio));
    const nucleo = join(carpeta, 'nucleo-del-director.md');
    writeFileSync(nucleo, textoDelNucleo(readFileSync(join(e.estudio, 'CLAUDE.md'), 'utf8')));
    const registro = join(carpeta, `${id}.log`);
    const minutos = o.minutos ?? MAX_MIN_VUELTA;
    const inicio = Date.now();
    const args = argumentosDeVuelta({ estudio: e.estudio, repo: e.repo, ajustes, nucleo, modelo: o.modelo, esfuerzo: o.esfuerzo, casa: o.casa });
    await correr(o.programa, [...(o.previos ?? []), ...args], e.estudio, encargo(id, false, [], false, [], minutos), registro, minutos, o.modelo);
    const plan = e.plan();
    const cerro = !!(await leerLocal(e.estudio)).revision?.hecha;
    const leer = (ruta: string) => (existsSync(join(e.memoria, ruta)) ? readFileSync(join(e.memoria, ruta), 'utf8') : null);
    const fallas = comprobar(plan, { antes, leer, estado, desde: antes.revisado ?? '' });
    let costo = existsSync(registro) ? consumoDe(readFileSync(registro, 'utf8'))?.costo ?? null : null;
    let calificacion: Calificacion | null | undefined;
    if (caso.pauta) {
      const salida = join(carpeta, `${id}-calificacion.json`);
      await correr(o.programa, [...(o.previos ?? []), ...argumentosDeCalificacion(ajustesCalifica)], e.estudio, encargoDeCalificacion(caso, situacion.notas, loQueDejo(plan, antes)), salida, MAX_MIN_CALIFICAR, MODELO_CALIFICA);
      const r = leerResultadoDeCalificacion(existsSync(salida) ? readFileSync(salida, 'utf8') : '');
      calificacion = r.calificacion;
      if (r.costo !== null) costo = (costo ?? 0) + r.costo;
    }
    return { caso: o.caso, numero: o.numero, cerro, fallas, ...(caso.pauta ? { calificacion } : {}), costo, minutos: Math.round((Date.now() - inicio) / 6000) / 10 };
  } finally {
    rmSync(join(e.estudio, '..'), { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

/** Donde quedan las corridas de este computador: fuera de git (.estudio), una por archivo, con su fecha en el nombre. */
const carpetaDeMediciones = (raiz: string) => join(raiz, '.estudio', 'mediciones');

/** Las corridas guardadas en este computador, de la más nueva a la más vieja; lo que no se puede leer no cuenta. */
export function corridasGuardadas(raiz: string, carpeta = carpetaDeMediciones(raiz)): Corrida[] {
  if (!existsSync(carpeta)) return [];
  return readdirSync(carpeta)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => {
      try {
        const c = JSON.parse(readFileSync(join(carpeta, f), 'utf8')) as Corrida;
        return typeof c.cuando === 'string' && Array.isArray(c.vueltas) ? [c] : [];
      } catch {
        return [];
      }
    })
    .sort((a, b) => b.cuando.localeCompare(a.cuando));
}

/**
 * Una corrida entera: las vueltas que faltan, una tras otra y nunca dos a la vez (gastan del mismo límite de la cuenta),
 * guardando lo que sale de cada una apenas termina, para que nada se pierda si se corta. Se detiene solo entre una vuelta
 * y otra (`senal`). Una vuelta que no se pudo correr cuenta como fallida, con su porqué, y la corrida sigue.
 */
export async function correrMedicion(o: Omit<OpcionesDeVuelta, 'base' | 'caso' | 'numero'> & { casos?: CasoFijo[]; alcance?: Alcance; senal?: AbortSignal; alAvanzar?: (c: Corrida) => void; carpeta?: string }): Promise<Corrida> {
  const casos = o.casos ?? casosMedibles();
  // Los casos que mide quedan con ella: su resumen y la bandeja cuentan solo esos, y lo demás sigue como quedó antes
  const corrida: Corrida = { cuando: new Date().toISOString(), modelo: o.modelo, esfuerzo: o.esfuerzo, casos: casos.map((c) => c.id), ...(o.alcance ? { alcance: o.alcance } : {}), vueltas: [] };
  const carpeta = o.carpeta ?? carpetaDeMediciones(o.raiz);
  const archivo = join(carpeta, `${corrida.cuando.replace(/[:.]/g, '-')}.json`);
  const guardar = () => {
    mkdirSync(carpeta, { recursive: true });
    writeFileSync(archivo, JSON.stringify(corrida, null, 2) + '\n');
  };
  guardar();
  const base = mkdtempSync(join(tmpdir(), 'stl-medicion-'));
  try {
    for (let faltan = vueltasQueFaltan(casos, corrida.vueltas); faltan.length && !o.senal?.aborted; faltan = vueltasQueFaltan(casos, corrida.vueltas)) {
      const { caso, numero } = faltan[0];
      let v: Vuelta;
      try {
        v = await correrVuelta({ ...o, base, caso, numero });
      } catch (e) {
        v = { caso, numero, cerro: false, fallas: [`la vuelta no se pudo correr: ${e instanceof Error ? e.message : String(e)}`], costo: null };
      }
      corrida.vueltas.push(v);
      guardar();
      o.alAvanzar?.(corrida);
    }
    if (!o.senal?.aborted) corrida.terminada = new Date().toISOString();
    guardar();
    return corrida;
  } finally {
    rmSync(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

// ── La corrida en marcha. Hay un solo servidor del Studio (unico.ts): basta con recordarla aquí

let enMarcha: { quien: string; desde: string; vueltas: number; control: AbortController } | null = null;

/** Si se está midiendo: mientras tanto el Studio no lanza al director (Revisor › enPausa) ni deja pedir la revisión. */
export const midiendo = () => enMarcha !== null;

/**
 * Lo que muestra «Modelo y consumo» › «Lo que gasta»: la corrida en marcha, la última guardada con su resumen (la de
 * ahora, si se está midiendo; solo sus casos, con cómo estaba cada uno antes) y lo que costaría y tardaría otra, por la
 * última que terminó o por lo que costaron las revisiones, con cada alcance: lo que pudo romperse, lo que fallaba o todo;
 * y los casos que fallan, para elegirlos uno por uno, con lo que cuesta y tarda cada caso.
 */
export function estadoDeMedicion(raiz: string, revisiones: number[], cortos: number[] = []) {
  const casos = casosMedibles();
  const guardadas = corridasGuardadas(raiz);
  const [ultima, ...anteriores] = guardadas;
  const terminada = guardadas.find((c) => c.terminada) ?? null;
  // Los alcances, por el último resultado de cada caso: sin la corrida en marcha, que todavía no lo tiene
  const medidas = enMarcha ? anteriores : guardadas;
  return {
    enMarcha: enMarcha ? { quien: enMarcha.quien, desde: enMarcha.desde, vueltas: enMarcha.vueltas } : null,
    ultima: ultima ? { cuando: ultima.cuando, modelo: ultima.modelo, esfuerzo: ultima.esfuerzo, terminada: ultima.terminada ?? null, vueltas: ultima.vueltas.length, alcance: ultima.alcance ?? null, ...resumenDeCorrida(ultima, casosDeCorrida(ultima, casos), anteriores) } : null,
    casos: casos.length,
    estimado: costoEstimado(casos.length, terminada, revisiones, cortos),
    alcances: ALCANCES.map((alcance) => {
      const n = casosDelAlcance(alcance, medidas, casos).length;
      return { alcance, casos: n, estimado: n ? costoEstimado(n, terminada, revisiones, cortos) : null, minutos: n ? minutosEstimados(n, terminada) : null };
    }),
    // Los que fallan, para elegir uno por uno cuáles medir, y lo que cuesta y tarda cada uno (nota de voz del titular
    // nmvsgcn7otit, 28 de octubre de 2026: lo que ya pasa no se vuelve a correr)
    fallan: medidas.length ? casosDelAlcance('fallaban', medidas, casos).map((c) => ({ id: c.id, titulo: c.titulo })) : [],
    unCaso: { estimado: costoEstimado(1, terminada, revisiones, cortos), minutos: minutosEstimados(1, terminada) },
    // Donde la persona no estuvo de acuerdo con quien califica en dos corridas: su pauta no mide lo que ella mide
    discrepan: discrepancias(guardadas).map((id) => ({ id, titulo: CASOS_FIJOS.find((c) => c.id === id)?.titulo ?? id })),
  };
}

/**
 * Guarda si la persona está de acuerdo con la nota de quien califica en un caso de una corrida guardada; false si la
 * corrida o la nota no están, o si se está midiendo (la corrida en marcha se reescribe con cada vuelta).
 */
export function guardarAcuerdo(raiz: string, a: { corrida: string; caso: string; de: boolean; quien: string }, carpeta = carpetaDeMediciones(raiz)): boolean {
  if (midiendo()) return false;
  const archivo = join(carpeta, `${a.corrida.replace(/[:.]/g, '-')}.json`);
  if (!existsSync(archivo)) return false;
  const c = JSON.parse(readFileSync(archivo, 'utf8')) as Corrida;
  if (c.cuando !== a.corrida || !c.vueltas.some((v) => v.caso === a.caso && v.calificacion)) return false;
  c.acuerdos = { ...(c.acuerdos ?? {}), [a.caso]: { de: a.de, cuando: new Date().toISOString(), quien: a.quien } };
  writeFileSync(archivo, JSON.stringify(c, null, 2) + '\n');
  return true;
}

/**
 * Empieza una corrida en segundo plano, a nombre de quien la pidió; false si ya hay una. Al terminar o al detenerla,
 * `alTerminar`, con lo que salió (o el problema, si se cayó).
 */
export function empezarMedicion(o: Omit<Parameters<typeof correrMedicion>[0], 'senal' | 'alAvanzar'> & { quien: string; alTerminar?: (c: Corrida | null, problema?: string) => void }): boolean {
  if (enMarcha) return false;
  const esta = { quien: o.quien, desde: new Date().toISOString(), vueltas: 0, control: new AbortController() };
  enMarcha = esta;
  void correrMedicion({ ...o, senal: esta.control.signal, alAvanzar: (c) => void (esta.vueltas = c.vueltas.length) })
    .then(
      (c) => o.alTerminar?.(c),
      (e) => o.alTerminar?.(null, e instanceof Error ? e.message : String(e)),
    )
    .finally(() => {
      if (enMarcha === esta) enMarcha = null;
    });
  return true;
}

/** Detiene la corrida en marcha al terminar la vuelta que corre (nunca a la mitad); false si no hay ninguna. */
export function detenerMedicion(): boolean {
  if (!enMarcha) return false;
  enMarcha.control.abort();
  return true;
}
