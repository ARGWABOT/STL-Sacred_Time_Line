// La bitácora del Studio en este computador (nota de voz del titular, 23 de octubre de 2026: «cada acción, cada clic,
// cada solicitud que el usuario haga o que el sistema dispara tiene que quedar registrada»). Qué se hizo, quién, desde
// dónde y cuándo, para poder auditar lo que pasó; por ejemplo, quién pidió una revisión y con qué botón. Es un archivo de
// líneas JSON, fuera de git y solo de este computador, que solo crece: `.estudio/bitacora.jsonl`. Escribirla nunca
// detiene la acción que registra.
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { enIdioma } from '../../estudio/src/textos.ts';
import type { OrigenRevision } from './proyectos.ts';
import { acotar, conFrasesEnSuIdioma, esTextoBitacora, tb, textoDeBitacora, type DatoBitacora, type TextoBitacora } from './textoBitacora.ts';

export { conFrasesEnSuIdioma, esTextoBitacora, tb, textoDeBitacora, type DatoBitacora, type TextoBitacora };

export interface EventoBitacora {
  cuando: string;
  /** Quién: el nombre de la persona, o «el Studio» si lo hizo el sistema solo. */
  quien: string;
  /** Qué se hizo, en una frase. Es el texto en inglés de `clave` (para quien lea el archivo a mano); la bitácora lo dice por su clave al leerla. */
  que: string;
  /** Desde dónde: el botón o el camino del Studio (por ejemplo, «Pedir revisión», en la cabecera). Como `que`, con `desdeClave`. */
  desde: string;
  proyecto?: string;
  /** El tipo fijo de lo que se hizo: la clave de su frase y los datos de sus espacios en blanco. Sin ella, `que` es texto de la historia. */
  clave?: string;
  datos?: Record<string, DatoBitacora>;
  /** Lo mismo para `desde`. */
  desdeClave?: string;
  desdeDatos?: Record<string, DatoBitacora>;
}

/** Lo que se le da a `anotar`: `que` y `desde` son tipos fijos (`tb(…)`); un texto suelto solo queda para la historia y las pruebas. */
export type EventoPorAnotar = Omit<EventoBitacora, 'cuando' | 'que' | 'desde' | 'clave' | 'datos' | 'desdeClave' | 'desdeDatos'> & {
  que: string | TextoBitacora;
  desde: string | TextoBitacora;
};

export const BITACORA = join('.estudio', 'bitacora.jsonl');

// Quién firma: aparte, para que la página lo importe sin los módulos de Node de este archivo
import { EL_STUDIO, quienEnSuIdioma } from './quienDeBitacora.ts';
export { EL_STUDIO, quienEnSuIdioma };

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

/**
 * Lo que guarda una frase: su tipo fijo (clave y datos, para decirla al leerla en el idioma de este computador) y su texto
 * en inglés, de respaldo para quien lea el archivo sin el Studio. Un texto suelto guarda solo el texto.
 */
function guardada(x: string | TextoBitacora, max = MAX_CAMPO): { texto: string; clave?: string; datos?: Record<string, DatoBitacora> } {
  if (!esTextoBitacora(x)) return { texto: enUnaLinea(x, max) };
  const fija = acotar(x, enUnaLinea, max) as TextoBitacora;
  return { texto: enUnaLinea(enIdioma('en', () => textoDeBitacora(fija)), max), clave: fija.clave, ...(fija.datos ? { datos: fija.datos } : {}) };
}

export async function anotar(raiz: string, e: EventoPorAnotar & { cuando?: string }): Promise<void> {
  try {
    await mkdir(join(raiz, '.estudio'), { recursive: true });
    const que = guardada(e.que), desde = guardada(e.desde);
    const linea: EventoBitacora = {
      cuando: e.cuando ?? new Date().toISOString(), quien: enUnaLinea(e.quien, 120), que: que.texto, desde: desde.texto, ...(e.proyecto ? { proyecto: e.proyecto } : {}),
      ...(que.clave ? { clave: que.clave, ...(que.datos ? { datos: que.datos } : {}) } : {}),
      ...(desde.clave ? { desdeClave: desde.clave, ...(desde.datos ? { desdeDatos: desde.datos } : {}) } : {}),
    };
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

/**
 * La línea de lo que oyó la grabadora en un fragmento, para leer los números reales de una prueba con el micrófono
 * (nota de voz del titular nmvy2xvyxtit, 1 de noviembre de 2026): solo cifras, nada del audio. null si algo no es una cifra.
 */
export function lineaDeNiveles(c: any): TextoBitacora | null {
  const cifras = [c?.piso, c?.pico, c?.conSonido, c?.muestras, c?.segundos];
  if (cifras.some((x) => typeof x !== 'number' || !Number.isFinite(x) || x < 0)) return null;
  // Un tipo fijo, que se dice al leerla en el idioma de este computador (nota nmwp6vl8gtit: esta salía en castellano porque
  // su frase estaba escrita así en el código, no por el idioma en que habla la persona)
  const destino = (['guardar', 'quitar_fragmento', 'descartar_todo'] as const).find((d) => d === c.destino);
  return tb('bitacora.niveles', {
    s: c.segundos.toFixed(1), piso: c.piso.toFixed(5), pico: c.pico.toFixed(5), con: c.conSonido, muestras: c.muestras,
    silenciada: tb(c.silenciada === true ? 'bitacora.si' : 'bitacora.no'),
    destino: destino ? tb(`bitacora.niveles.${destino}`) : tb('bitacora.niveles.sinDestino'),
  });
}

/** Dos frases juntas con un enlace fijo (un espacio, « › », un paréntesis, una coma, « · »): el enlace también es un tipo. */
const junta = (enlace: 'espacio' | 'pegado' | 'flecha' | 'parentesis' | 'coma' | 'punto' | 'y', a: DatoBitacora, b: DatoBitacora): TextoBitacora => tb(`bitacora.junta.${enlace}`, { a, b });
/** Una frase seguida de otra, sin nada entre las dos (la segunda trae su propio espacio o su coma). */
export const pegadas = (a: DatoBitacora, b: DatoBitacora): TextoBitacora => junta('pegado', a, b);
/** El botón desde donde se pidió una revisión (proyectos.ts › ORIGENES_REVISION), como tipo fijo: . */
export const origenDeRevision = (origen: OrigenRevision): TextoBitacora => tb(`bitacora.origen.${origen}`);
/** Muchas frases con el mismo enlace. */
export const juntas = (enlace: Parameters<typeof junta>[0], partes: DatoBitacora[]): DatoBitacora => (partes.length ? partes.reduce((a, b) => junta(enlace, a, b)) : '');

// ───────────────────────────────────────────── las acciones de la página (POST /accion)

/** Aquello sobre lo que es una nota (`sobre.tipo`) que la bitácora sabe nombrar. */
const SOBRE = ['general', 'mision', 'propuesta', 'documento', 'criterio', 'fase', 'diagnostico', 'objetivo', 'pregunta'] as const;

const esSobre = (k: unknown): k is (typeof SOBRE)[number] => typeof k === 'string' && (SOBRE as readonly string[]).includes(k);
const corto = (x: unknown) => enUnaLinea(x, 120);

/**
 * Lo que la página hace sola, sin un clic para eso, en nombre de la persona (la clave `automatico` de la acción): firma el
 * Studio, para que nadie crea que la persona lo pidió (nota de voz del titular, 23 de octubre de 2026: «lo que el sistema
 * dispara automáticamente» también se registra, y quién lo ejecuta). Cada una tiene su frase `bitacora.accion.auto.<clave>`.
 */
export const AUTOMATICOS = ['paso_visto', 'leido_entero', 'ultimo_paso', 'pasos_del_navegador'] as const;

const esAutomatico = (k: unknown): k is (typeof AUTOMATICOS)[number] => typeof k === 'string' && (AUTOMATICOS as readonly string[]).includes(k);

/**
 * De dónde vino una acción de la página, en una frase corta: lo que nombra (la misión, el documento, la propuesta…) y,
 * en una nota, sobre qué es (su tipo, su id y su parte), con lo que la distingue («Hazlo tú», una opción, una decisión).
 * Es un tipo fijo: se dice al leerla, en el idioma de este computador.
 */
export function desdeDeAccion(cuerpo: any): TextoBitacora {
  const tipo = String(cuerpo?.tipo ?? '');
  if (tipo === 'comentar') {
    const s = cuerpo?.sobre && typeof cuerpo.sobre === 'object' ? cuerpo.sobre : { tipo: 'general' };
    const clase: TextoBitacora = s.hazlo === true ? tb('bitacora.accion.desde.hazlo')
      : typeof s.eleccion === 'string' ? tb('bitacora.accion.desde.opcion', { opcion: corto(s.eleccion) })
      : s.aclarar === true ? tb('bitacora.accion.desde.noLoEntiendo')
      : s.comprobar === true ? tb('bitacora.accion.desde.yaLoHice')
      : s.postura === 'aprueba' ? tb('bitacora.accion.desde.apruebo')
      : s.postura === 'decide' ? tb('bitacora.accion.desde.decido')
      : s.postura === 'comenta' ? tb('bitacora.accion.desde.comentarioDecision')
      : s.tipo === 'pregunta' ? (s.id ? tb('bitacora.accion.desde.preguntaSigue') : tb('bitacora.accion.desde.preguntaDirector'))
      : tb('bitacora.accion.desde.nota');
    const nombreDeSobre: DatoBitacora = esSobre(s.tipo) ? tb(`bitacora.accion.sobre.${s.tipo as (typeof SOBRE)[number]}`) : corto(s.tipo);
    const lugar: DatoBitacora = s.id ? junta('espacio', nombreDeSobre, corto(s.id)) : nombreDeSobre;
    const general: TextoBitacora = !s.tipo || s.tipo === 'general' ? (clase.clave === 'bitacora.accion.desde.nota' ? tb('bitacora.accion.desde.notaGeneral') : tb('bitacora.accion.desde.claseGeneral', { clase }))
      : s.tipo === 'pregunta' ? (s.id ? junta('espacio', clase, corto(s.id)) : clase)
      : tb('bitacora.accion.desde.sobre', { clase, lugar });
    const adjuntos = Array.isArray(cuerpo?.adjuntos) ? cuerpo.adjuntos.length : 0;
    const extras: DatoBitacora[] = [
      [true, 'on', '1'].includes(cuerpo?.urgente) && s.tipo !== 'pregunta' ? tb('bitacora.accion.desde.urgente') : null,
      cuerpo?.audio ? tb('bitacora.accion.desde.conAudio') : null,
      adjuntos ? tb('bitacora.accion.desde.adjuntos', { n: adjuntos }) : null,
    ].filter((x): x is TextoBitacora => x !== null);
    // «Paso 2» es como lo guarda el Studio: en inglés se dice «Step 2»
    const parte = (x: unknown): DatoBitacora => { const n = /^Paso (\d+)$/.exec(String(x)); return n ? tb('bitacora.pasoMayus', { n: n[1] }) : corto(x); };
    let dicha = general;
    if (s.seccion) dicha = junta('flecha', dicha, parte(s.seccion));
    if (s.decision) dicha = junta('flecha', dicha, tb('bitacora.accion.desde.decision', { decision: corto(s.decision) }));
    if (extras.length) dicha = junta('parentesis', dicha, juntas('coma', extras));
    return dicha;
  }
  const mision = tb('bitacora.accion.desde.mision', { mision: corto(cuerpo?.mision) });
  switch (tipo) {
    case 'empezar': case 'entregar': case 'deshacer_entrega': return mision;
    case 'paso': return tb('bitacora.accion.desde.susPasos', { mision });
    case 'leido': return tb('bitacora.accion.desde.documento', { doc: corto(cuerpo?.doc) });
    case 'marcar': case 'desmarcar': return tb('bitacora.accion.desde.criterio', { criterio: corto(cuerpo?.criterio) });
    case 'cerrar': case 'reabrir': return tb('bitacora.accion.desde.puertaFase', { fase: corto(cuerpo?.fase) });
    case 'excepcion': return tb('bitacora.accion.desde.frente', { frente: corto(cuerpo?.frente) });
    case 'cerrar_excepcion': return tb('bitacora.accion.desde.excepcion', { id: corto(cuerpo?.id) });
    case 'responder': return tb('bitacora.accion.desde.propuesta', { propuesta: corto(cuerpo?.propuesta) });
    case 'borrar_nota': case 'editar_nota': case 'tipo_nota': return tb('bitacora.accion.desde.notaBuzon', { id: corto(cuerpo?.id) });
    case 'corregir_transcripcion': return tb('bitacora.accion.desde.transcripcion', { audio: corto(cuerpo?.audio) });
    case 'anotar': return tb('bitacora.accion.desde.bitacoraProyecto');
    case 'proyecto': return tb('bitacora.accion.desde.proyecto');
    case 'objetivo': case 'reabrir_objetivo': case 'replantear_objetivo': return tb('bitacora.accion.desde.meta');
    case 'integrante': case 'quitar_integrante': return tb('bitacora.accion.desde.equipo');
    case 'sincronizar': return tb('bitacora.accion.desde.sincronizar');
    default: return tb('bitacora.accion.desde.otra', { tipo: corto(tipo) || tb('bitacora.accion.desde.sinNombre') });
  }
}

/**
 * La línea de la bitácora de una acción de la página, ya hecha: quién, qué y desde dónde, en el idioma de la interfaz de
 * ahora (quien llama pone el idioma antes y arma `que` con `tb('bitacora.accion.…')`). Si la página la hizo sola
 * (`automatico`), firma el Studio, en nombre de la persona, y dice por qué.
 */
export function eventoDeAccion(cuerpo: any, quien: string, que: string | TextoBitacora, proyecto: string): EventoPorAnotar {
  const desde = desdeDeAccion(cuerpo);
  if (!esAutomatico(cuerpo?.automatico)) return { quien, que, desde, proyecto };
  return {
    quien: EL_STUDIO, que: tb('bitacora.accion.enNombreDe', { que, quien }),
    desde: tb('bitacora.accion.desde.conMotivo', { desde, motivo: tb(`bitacora.accion.auto.${cuerpo.automatico as (typeof AUTOMATICOS)[number]}`) }), proyecto,
  };
}
