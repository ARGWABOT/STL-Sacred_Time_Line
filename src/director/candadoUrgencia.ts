// El candado de una urgencia (pedido pd_urgencia_bloquea; notas del titular nmwdm146ctit, nmwdpe26ztit, nmwduvygmtit,
// nmwf5tw9utit, nmwflsg3itit, nmwfnxlyztit, nmwgu3kp9tit, nmwi6sgoetit, nmwimq9retit y nmwj6e78gtit). Mientras el
// director atiende una nota urgente, lo que hace avanzar una misión espera: marcar un paso, elegir una opción, «Hazlo
// tú», «Ya lo hice», «No me salió», «No lo entiendo», empezarla y entregarla. Lo demás sigue abierto: el ✉ de cada paso,
// los documentos y los botones de decisión de sus partes, el Buzón y los otros proyectos. Al terminar, el director ya
// replaneó las misiones que tocó, y la línea de arriba de «Hoy» dice cuántas cambiaron. Puro: lo usan la página
// (app.ts) y el servidor (api.ts), que también rechaza esas acciones mientras dura.

/** Lo urgente, como lo guarda estudio.local.json (proyectos.ts › UrgenciaPedida). */
export interface UrgenciaEnVista {
  pedida: string;
  notas?: string[];
  lanzada?: string;
  hecha?: string;
  error?: string;
}

/** ¿El director atiende ahora lo urgente (pedido o lanzado, sin terminar ni fallar)? Entonces las misiones esperan. */
export const urgenciaBloquea = (u: UrgenciaEnVista | null | undefined): boolean => !!u && !u.hecha && !u.error;

/** La revisión de este proyecto, como la guarda estudio.local.json (proyectos.ts › RevisionPedida). */
export interface RevisionEnVista { pedida: string; lanzada?: string; enCurso?: string; hecha?: string; error?: string }
/** La aclaración de un paso (proyectos.ts › AclaracionPedida); `comprobar` es «Ya lo hice: compruébalo tú». */
export interface AclaracionEnVista { pedida: string; lanzada?: string; hecha?: string; error?: string; comprobar?: boolean }

/** En qué trabaja el director mientras el candado está puesto: lo dice el aviso y lo prueba cada etapa. */
export type EtapaDelCandado = 'planeando' | 'ejecutando' | 'urgencia' | 'aclaracion';

/**
 * El candado del director (pedido pd_candado_revision, nota del titular nmws24jddtit; reemplaza la regla del 21 de octubre
 * que dejaba avanzar durante una revisión): mientras una revisión corre, en su primer tiempo (planea) o en el segundo
 * (ejecuta), o mientras atiende una urgencia o aclara un paso, lo que hace avanzar una misión o una decisión espera,
 * porque esa misma revisión puede cambiarlo. Una revisión solo pedida (aún sin lanzar, o sin nadie que la tome) no lo
 * pone; «Ya lo hice: compruébalo tú» tampoco: la persona sigue con su misión siguiente mientras se comprueba. Pura: la
 * usan la página (app.ts) y el servidor (api.ts), con lo de este proyecto.
 */
export function etapaDelCandado(x: {
  revision?: RevisionEnVista | null;
  urgencia?: UrgenciaEnVista | null;
  aclaracion?: AclaracionEnVista | null;
  /** El primer tiempo de la revisión aún planea (revisor.ts › planDeProyecto). */
  planeando?: boolean;
}): EtapaDelCandado | null {
  if (urgenciaBloquea(x.urgencia)) return 'urgencia';
  const a = x.aclaracion;
  if (a && !a.hecha && !a.error && !a.comprobar) return 'aclaracion';
  const r = x.revision;
  if (r && !r.hecha && !r.error && (r.lanzada || r.enCurso)) return x.planeando ? 'planeando' : 'ejecutando';
  return null;
}

/**
 * ¿Esta acción hace avanzar una misión? Esas esperan a que el director termine; un comentario con el ✉ de un paso no
 * (nmwflsg3itit), que espera en el Buzón la revisión siguiente.
 */
export function avanzaUnaMision(cuerpo: Record<string, unknown>): boolean {
  const tipo = String(cuerpo.tipo ?? '');
  if (['paso', 'entregar', 'empezar', 'deshacer_entrega'].includes(tipo)) return true;
  if (tipo !== 'comentar') return false;
  const sobre = (cuerpo.sobre ?? {}) as { tipo?: string; eleccion?: unknown; hazlo?: unknown; aclarar?: unknown; comprobar?: unknown };
  return sobre.tipo === 'mision' && (!!sobre.eleccion || sobre.hazlo === true || sobre.aclarar === true || sobre.comprobar === true);
}

/**
 * ¿Esta acción toma una decisión? Responder una propuesta, o «Apruebo lo que recomiendas» y «Decido otra cosa» en una
 * parte de un documento (nmws24jddtit, que reemplaza nmwfnxlyztit). «Agregar a esta decisión» (`comenta`) es un
 * comentario y sigue abierto, como el ✉.
 */
function avanzaUnaDecision(cuerpo: Record<string, unknown>): boolean {
  if (cuerpo.tipo === 'responder') return true;
  if (cuerpo.tipo !== 'comentar') return false;
  const sobre = (cuerpo.sobre ?? {}) as { tipo?: string; decision?: unknown; postura?: unknown };
  return sobre.tipo === 'documento' && !!sobre.decision && sobre.postura !== 'comenta';
}

/** Lo que el candado detiene: avanzar una misión o tomar una decisión. */
export const avanzaAlgo = (cuerpo: Record<string, unknown>): boolean => avanzaUnaMision(cuerpo) || avanzaUnaDecision(cuerpo);

/**
 * Lo que la página deshabilita mientras dura (director.css › body.candado-director): los mismos botones que llevan a
 * `avanzaAlgo`. El ✉ (`.comentar-paso`), leer los documentos y «Agregar a esta decisión» no están aquí.
 */
export const BOTONES_DE_AVANCE = [
  '[data-listo-paso]', '[data-elegir]', '[data-elegir-varias]', '[data-marcar-opcion]', '[data-ya-lo-dije]', '[data-ya-lo-comente]',
  '[data-hazlo]', '[data-ya-hice]', '[data-aclarar]', '[data-no-salio]', '[data-entregar]',
  '[data-aprobar]', '[data-comentar$="|decide"]', '[data-responder]',
] as const;

/** Una misión de la persona, como estaba al empezar la urgencia: lo justo para saber si cambió. */
export interface FotoDeMision { id: string; titulo: string; pasos: string }

/** La foto de las misiones abiertas de la persona, para compararla al terminar. */
export const fotoDeMisiones = (misiones: readonly { id: string; titulo: string; pasos: unknown[] }[]): FotoDeMision[] =>
  misiones.map((m) => ({ id: m.id, titulo: m.titulo, pasos: JSON.stringify(m.pasos) }));

/** Una misión que la urgencia cambió: nueva, quitada o con otros pasos o título. */
export interface CambioDeMision { id: string; titulo: string; que: 'nueva' | 'quitada' | 'cambiada' }

/** Qué misiones de la persona cambió la urgencia: lo que dice la línea de «Hoy» y lista «Ver qué cambió». */
export function misionesCambiadas(antes: readonly FotoDeMision[], despues: readonly FotoDeMision[]): CambioDeMision[] {
  const ya = new Map(antes.map((m) => [m.id, m]));
  const ahora = new Set(despues.map((m) => m.id));
  const cambios: CambioDeMision[] = [];
  for (const m of despues) {
    const a = ya.get(m.id);
    if (!a) cambios.push({ id: m.id, titulo: m.titulo, que: 'nueva' });
    else if (a.titulo !== m.titulo || a.pasos !== m.pasos) cambios.push({ id: m.id, titulo: m.titulo, que: 'cambiada' });
  }
  for (const a of antes) if (!ahora.has(a.id)) cambios.push({ id: a.id, titulo: a.titulo, que: 'quitada' });
  return cambios;
}

/**
 * La línea de arriba de «Hoy» después de la urgencia: terminó (con lo que cambió) o se detuvo antes (y las misiones
 * quedaron como estaban). Se queda hasta que la persona la abre o entrega una misión (nmwj6e78gtit).
 */
export interface LineaTrasUrgencia { pedida: string; estado: 'termino' | 'paro'; cambios: CambioDeMision[] }
