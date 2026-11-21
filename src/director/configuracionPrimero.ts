// Lo que le falta configurar a un proyecto entregado, primero (pedido pd_config_primero; notas del titular nmwcqpbs7tit,
// nmwduwd2ytit, nmwf5valltit, nmwgj2ea4tit, nmwgu4c82tit, nmwimrikjtit, nmwj6h0chtit, nmwjjzdwttit y nmwjk03b3tit). En
// cuanto la ruta de un proyecto está escrita, sus primeras misiones, justo después de la lectura corta del diagnóstico y
// antes de cualquier misión de trabajo, completan lo que le falta para seguir desarrollándolo, una misión corta cada una y
// en este orden: la cuenta de GitHub (sugiriendo al dueño del repositorio) o, si no tiene repositorio en GitHub, la misión
// guiada para crearlo y conectarlo; y la identidad de git, solo si la carpeta no tiene ninguna. El modo de permisos ya no
// se configura: hay uno solo, sin selector (nmwp8uot6tit); `permisos` queda solo para leer los planes de antes. Los ya entregados las reciben en su
// próxima revisión, solo si les falta. `bandeja.ts --listo` no cierra sin ellas (docs/metodo/director/start.md). Puro.
import type { ModoPermisos } from './proyectos.ts';
import { duenoDelRemoto } from './cuentaDetectada.ts';

/** Lo que configura una misión de esta clase (`Mision.configura`), en el orden en que van. */
export const CONFIGURACIONES = ['repositorio', 'cuenta', 'identidad', 'permisos'] as const;
export type Configura = (typeof CONFIGURACIONES)[number];
export const esConfigura = (x: unknown): x is Configura => typeof x === 'string' && (CONFIGURACIONES as readonly string[]).includes(x);

/** El lugar de cada una en el orden: el repositorio y la cuenta son la misma (la cuenta de GitHub), primero. */
const PUESTO: Record<Configura, number> = { repositorio: 0, cuenta: 0, identidad: 1, permisos: 2 };

/** Lo que se sabe del proyecto en este computador. */
export interface EstadoDeConfiguracion {
  /** La salida de git remote -v en su carpeta ('' sin remotos). */
  remotos: string;
  /** Su cuenta de GitHub aprobada (estudio.local.json › cuentasGit). */
  cuentaAprobada?: string | null;
  /** El nombre y el correo de git que usa su carpeta, de donde vengan (de la carpeta o del computador). */
  nombreGit?: string | null;
  correoGit?: string | null;
  /** Lo que se guardó antes como modo de permisos (estudio.local.json › modoPermisos): ya no cuenta, hay un solo modo. */
  modoPermisos?: ModoPermisos;
}

export interface Falta { que: Configura; /** La cuenta que se sugiere: el dueño del repositorio (nmwjk03b3tit). */ sugerencia?: string }

/**
 * Lo que le falta, en su orden. La cuenta: con una aprobada, nada; con un remoto de GitHub, la cuenta (sugiriendo a su
 * dueño); sin remotos, el repositorio (crearlo y conectarlo, nmwf5valltit); con remotos que no son de GitHub, nada. La
 * identidad, solo si no hay nombre o correo (nmwimrikjtit). Los permisos, nunca: hay un solo modo (nmwp8uot6tit, que
 * reemplaza a nmwj6h0chtit).
 */
export function configuracionQueFalta(e: EstadoDeConfiguracion): Falta[] {
  const falta: Falta[] = [];
  if (!e.cuentaAprobada?.trim()) {
    const remotos = e.remotos.trim();
    if (!remotos) falta.push({ que: 'repositorio' });
    else if (/github\.com/i.test(remotos)) {
      const dueno = duenoDelRemoto(remotos);
      falta.push(dueno ? { que: 'cuenta', sugerencia: dueno } : { que: 'cuenta' });
    }
  }
  if (!e.nombreGit?.trim() || !e.correoGit?.trim()) falta.push({ que: 'identidad' });
  return falta;
}

/** Lo que `configuracionPorCerrar` mira de una misión. */
export interface MisionDeConfiguracion {
  id: string;
  para: string;
  configura?: Configura;
  /** Si sigue abierta (sin entregar ni aprobar). */
  abierta: boolean;
  /** Si es la lectura corta del diagnóstico, que va antes que todas. */
  leeElDiagnostico?: boolean;
  /** Si la persona ya marcó algún paso: no se le pone otra delante de lo que ya empezó. */
  empezada?: boolean;
}

/**
 * Lo que impide cerrar: lo que falta configurar sin su misión (una del plan o de su archivo con ese `configura` basta,
 * abierta o no: lo ya preguntado no se vuelve a pedir), y cada misión de configuración abierta que va detrás de una de
 * trabajo sin empezar o detrás de otra de configuración que va después en el orden. Las misiones, en el orden del plan.
 */
export function configuracionPorCerrar(falta: readonly Falta[], misiones: readonly MisionDeConfiguracion[]): { sinMision: Falta[]; fueraDeOrden: string[] } {
  const hay = new Set(misiones.map((m) => m.configura).filter(esConfigura));
  // La cuenta y el repositorio son la misma pieza: la que esté cubre a la otra
  const cubierta = (q: Configura) => hay.has(q) || ((q === 'cuenta' || q === 'repositorio') && (hay.has('cuenta') || hay.has('repositorio')));
  const sinMision = falta.filter((f) => !cubierta(f.que));
  const fueraDeOrden: string[] = [];
  for (const persona of new Set(misiones.map((m) => m.para))) {
    const abiertas = misiones.filter((m) => m.abierta && m.para === persona);
    abiertas.forEach((m, i) => {
      if (!m.configura) return;
      const antes = abiertas.slice(0, i);
      const detrasDeTrabajo = antes.some((a) => !a.configura && !a.leeElDiagnostico && !a.empezada);
      const detrasDeOtra = antes.some((a) => a.configura && PUESTO[a.configura] > PUESTO[m.configura!]);
      if (detrasDeTrabajo || detrasDeOtra) fueraDeOrden.push(m.id);
    });
  }
  return { sinMision, fueraDeOrden };
}

/** Lo que se le dice al director, en inglés, si no cierra. Vacío si nada falta. */
export function lineasDeConfiguracion(r: ReturnType<typeof configuracionPorCerrar>): string[] {
  const lineas: string[] = [];
  const COMO: Record<Configura, string> = {
    repositorio: 'the project has no GitHub repository: one guided mission to create a private repository from the person\'s own GitHub account and connect it in «Project» › «Where it is» (`ir`: `{ "vista": "proyecto", "ancla": "p-repositorio" }`), each step with its button; creating it is theirs',
    cuenta: 'the project has no approved GitHub account on this computer: one short mission to save it in «Project» › «Where it is» (`p-repositorio`)',
    identidad: 'the project\'s folder has no git identity (name and email): one short mission to save them only for that folder',
    permisos: 'nothing to configure: there is a single permission mode (only old plans name it)',
  };
  for (const f of r.sinMision) lineas.push(`- \`"configura": "${f.que}"\`: ${COMO[f.que]}${f.sugerencia ? `, suggesting the repository's owner, ${f.sugerencia}` : ''}.`);
  for (const id of r.fueraDeOrden) lineas.push(`- ${id}: a configuration mission goes right after the diagnosis reading and before any work mission not yet started, in the order account (or repository), identity, permissions: move it up with \`orden\`.`);
  return lineas;
}
