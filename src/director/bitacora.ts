// La bitácora del Studio en este computador (nota de voz del titular, 23 de octubre de 2026: «cada acción, cada clic,
// cada solicitud que el usuario haga o que el sistema dispara tiene que quedar registrada»). Qué se hizo, quién, desde
// dónde y cuándo, para poder auditar lo que pasó; por ejemplo, quién pidió una revisión y con qué botón. Es un archivo de
// líneas JSON, fuera de git y solo de este computador, que solo crece: `.estudio/bitacora.jsonl`. Escribirla nunca
// detiene la acción que registra.
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface EventoBitacora {
  cuando: string;
  /** Quién: el nombre de la persona, o «el Studio» si lo hizo el sistema solo. */
  quien: string;
  /** Qué se hizo, en una frase. */
  que: string;
  /** Desde dónde: el botón o el camino del Studio (por ejemplo, «Pedir revisión», en la cabecera). */
  desde: string;
  proyecto?: string;
}

export const BITACORA = join('.estudio', 'bitacora.jsonl');

/** Los que el sistema hace solo firman así: nunca con el nombre de una persona. */
export const EL_STUDIO = 'el Studio';

/**
 * Lo más largo de una línea: la bitácora dice qué pasó, no guarda el texto entero (una nota, un motivo), que ya vive en
 * la memoria del proyecto, en git.
 */
export const MAX_CAMPO = 500;

/** Un texto en una línea, acotado a `max` con «…» si se pasa. */
const enUnaLinea = (x: unknown, max = MAX_CAMPO) => {
  const t = String(x ?? '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

export async function anotar(raiz: string, e: Omit<EventoBitacora, 'cuando'> & { cuando?: string }): Promise<void> {
  try {
    await mkdir(join(raiz, '.estudio'), { recursive: true });
    const linea: EventoBitacora = { cuando: e.cuando ?? new Date().toISOString(), quien: enUnaLinea(e.quien, 120), que: enUnaLinea(e.que), desde: enUnaLinea(e.desde), ...(e.proyecto ? { proyecto: e.proyecto } : {}) };
    await appendFile(join(raiz, BITACORA), `${JSON.stringify(linea)}\n`, 'utf8');
  } catch {
    // Sin disco no hay bitácora, pero la acción sigue
  }
}

/** Las últimas `max` líneas, la más nueva primero. Una línea dañada se salta. */
export async function leerBitacora(raiz: string, max = 500): Promise<EventoBitacora[]> {
  const texto = await readFile(join(raiz, BITACORA), 'utf8').catch(() => '');
  const lineas = texto.split('\n').filter((l) => l.trim());
  const eventos: EventoBitacora[] = [];
  for (const l of lineas.slice(-max).reverse()) {
    try {
      const e = JSON.parse(l);
      if (e && typeof e.cuando === 'string' && typeof e.que === 'string') eventos.push(e);
    } catch {
      // una línea a medio escribir no tumba la lista
    }
  }
  return eventos;
}

// ───────────────────────────────────────────── las acciones de la página (POST /accion)

/** Cómo se nombra, en la bitácora, aquello sobre lo que es una nota (`sobre.tipo`). */
const SOBRE: Record<string, string> = {
  general: 'nota general', mision: 'misión', propuesta: 'propuesta', documento: 'documento', criterio: 'criterio',
  fase: 'fase', diagnostico: 'el diagnóstico', objetivo: 'la meta', pregunta: 'pregunta',
};

const tiene = (o: Record<string, string>, k: unknown): k is string => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
const corto = (x: unknown) => enUnaLinea(x, 120);

/**
 * Lo que la página hace sola, sin un clic para eso, en nombre de la persona (la clave `automatico` de la acción): firma el
 * Studio, para que nadie crea que la persona lo pidió (nota de voz del titular, 23 de octubre de 2026: «lo que el sistema
 * dispara automáticamente» también se registra, y quién lo ejecuta).
 */
export const AUTOMATICOS: Record<string, string> = {
  paso_visto: 'el Studio vio hecho lo que pedía el paso y lo marcó solo',
  leido_entero: 'al terminar de leer el documento, el paso de leerlo se marcó solo',
  ultimo_paso: 'al marcarse el último paso, la misión se entregó sola',
  pasos_del_navegador: 'al cargar, los pasos marcados solo en este navegador se guardaron en la memoria',
};

/**
 * De dónde vino una acción de la página, en una frase corta: lo que nombra (la misión, el documento, la propuesta…) y,
 * en una nota, sobre qué es (su tipo, su id y su parte), con lo que la distingue («Hazlo tú», una opción, una decisión).
 */
export function desdeDeAccion(cuerpo: any): string {
  const tipo = String(cuerpo?.tipo ?? '');
  if (tipo === 'comentar') {
    const s = cuerpo?.sobre && typeof cuerpo.sobre === 'object' ? cuerpo.sobre : { tipo: 'general' };
    const clase = s.hazlo === true ? '«Hazlo tú»'
      : typeof s.eleccion === 'string' ? `opción «${corto(s.eleccion)}»`
      : s.aclarar === true ? '«No lo entiendo»'
      : s.postura === 'aprueba' ? '«Apruebo lo que recomiendas»'
      : s.postura === 'decide' ? '«Decido otra cosa»'
      : s.postura === 'comenta' ? 'comentario de una decisión'
      : s.tipo === 'pregunta' ? (s.id ? 'pregunta que sigue una conversación' : 'pregunta al director')
      : 'nota';
    const objeto = !s.tipo || s.tipo === 'general' ? '' : s.tipo === 'pregunta' ? (s.id ? ` ${corto(s.id)}` : '')
      : ` sobre ${tiene(SOBRE, s.tipo) ? SOBRE[s.tipo] : corto(s.tipo)}${s.id ? ` ${corto(s.id)}` : ''}`;
    const general = !s.tipo || s.tipo === 'general' ? (clase === 'nota' ? 'nota general' : `${clase}, general`) : `${clase}${objeto}`;
    const adjuntos = Array.isArray(cuerpo?.adjuntos) ? cuerpo.adjuntos.length : 0;
    const extras = [
      [true, 'on', '1'].includes(cuerpo?.urgente) && s.tipo !== 'pregunta' ? 'urgente' : '',
      cuerpo?.audio ? 'con audio' : '',
      adjuntos ? `con ${adjuntos} ${adjuntos === 1 ? 'adjunto' : 'adjuntos'}` : '',
    ].filter(Boolean);
    return `${general}${s.seccion ? ` › ${corto(s.seccion)}` : ''}${s.decision ? ` › decisión «${corto(s.decision)}»` : ''}${extras.length ? ` (${extras.join(', ')})` : ''}`;
  }
  const mision = `misión ${corto(cuerpo?.mision)}`;
  switch (tipo) {
    case 'empezar': case 'entregar': case 'deshacer_entrega': return mision;
    case 'paso': return `${mision} › sus pasos`;
    case 'leido': return `documento ${corto(cuerpo?.doc)}`;
    case 'marcar': case 'desmarcar': return `criterio ${corto(cuerpo?.criterio)}`;
    case 'cerrar': case 'reabrir': return `la puerta de la fase ${corto(cuerpo?.fase)}`;
    case 'excepcion': return `frente ${corto(cuerpo?.frente)}`;
    case 'cerrar_excepcion': return `excepción ${corto(cuerpo?.id)}`;
    case 'validacion': case 'borrar_validacion': return '«Validaciones»';
    case 'responder': return `propuesta ${corto(cuerpo?.propuesta)}`;
    case 'borrar_nota': case 'editar_nota': return `el Buzón › nota ${corto(cuerpo?.id)}`;
    case 'corregir_transcripcion': return `lo que se entendió de ${corto(cuerpo?.audio)}`;
    case 'anotar': return 'la bitácora del proyecto';
    case 'proyecto': return '«Proyecto» › Qué es el proyecto';
    case 'objetivo': case 'reabrir_objetivo': case 'replantear_objetivo': return '«Proyecto» › La meta';
    case 'integrante': case 'quitar_integrante': return '«Proyecto» › El equipo';
    case 'sincronizar': return '«Proyecto» › Varios computadores';
    default: return `la acción ${corto(tipo) || 'sin nombre'}`;
  }
}

/**
 * La línea de la bitácora de una acción de la página, ya hecha: quién, qué y desde dónde. Si la página la hizo sola
 * (`automatico`), firma el Studio, en nombre de la persona, y dice por qué.
 */
export function eventoDeAccion(cuerpo: any, quien: string, que: string, proyecto: string): Omit<EventoBitacora, 'cuando'> {
  const desde = desdeDeAccion(cuerpo);
  const solo = tiene(AUTOMATICOS, cuerpo?.automatico) ? AUTOMATICOS[cuerpo.automatico] : null;
  return solo ? { quien: EL_STUDIO, que: `${que}, en nombre de ${quien}`, desde: `${desde} (${solo})`, proyecto } : { quien, que, desde, proyecto };
}
