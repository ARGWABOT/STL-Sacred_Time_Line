// Los borradores del diálogo para hablarle al director (pedido pd_dialogo_unico; tus elecciones del 26 de octubre de
// 2026): lo que escribiste, elegiste o grabaste y cerraste sin enviar (con Esc, un clic fuera o «Cancelar») queda en este
// navegador, en silencio, hasta que lo envías o lo borras, aunque cierres el navegador. Al volver a abrir el diálogo sobre
// lo mismo, está ahí y dice «Borrador guardado». Nunca va a git, a la nube ni al director: solo lo enviado es una nota.
// Puro, salvo el almacén que se le pasa (localStorage en la página; uno de mentira en las pruebas).

/** Sobre qué es la nota: lo mismo que lleva al Buzón (Nota['sobre']), sin lo que la marca al enviarla. */
export interface SobreBorrador {
  tipo: string;
  id?: string;
  seccion?: string;
  decision?: string;
  fragmento?: string;
  postura?: string;
}

export interface Borrador {
  proyecto: string;
  sobre: SobreBorrador;
  /** El título de su diálogo, para mostrarlo en la lista y volver a abrirlo igual. */
  titulo: string;
  texto: string;
  tipoNota?: string;
  /** El audio grabado, como data URL, si cupo en este navegador. */
  audio?: string;
  /** Cuánto dura el audio, para mostrarlo igual al volver. */
  segundos?: number;
  /** Lo escrito en los demás campos del diálogo, por su nombre (al corregir una nota: lo dicho y lo sumado). */
  campos?: Record<string, string>;
  /** Lo adjunto, como data URL, si cupo en este navegador. */
  adjuntos?: { nombre: string; datos: string }[];
  cuando: string;
}

/**
 * El borrador de «Corregir» una nota (nota de voz del titular nmwdku7f2tit, 12 de noviembre de 2026: la interfaz quedó
 * en «Guardando…» mientras se transcribía lo grabado con la revisión de otro proyecto corriendo, sin salida, y al recargar
 * se perdieron lo grabado y la imagen). Se guarda al empezar a guardar y se reabre desde su nota, con «Corregir»: no va en
 * la lista de borradores de antes de pedir la revisión, que abre el diálogo de comentar.
 */
export const SOBRE_CORREGIR = 'corregir';

/** Lo que se usa del almacén del navegador (localStorage). */
export interface Almacen {
  readonly length: number;
  key(i: number): string | null;
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
  removeItem(clave: string): void;
}

const PREFIJO = 'stl:borrador:';

/** Una clave por proyecto y por lugar: el mismo lugar siempre da la misma, sin importar el orden de sus campos. */
export function claveDeBorrador(proyecto: string, sobre: SobreBorrador): string {
  const partes = [sobre.tipo, sobre.id, sobre.seccion, sobre.decision, sobre.fragmento, sobre.postura].map((x) => x ?? '');
  return `${PREFIJO}${proyecto}:${JSON.stringify(partes)}`;
}

/** Si tiene algo que valga guardar: escrito o grabado (el tipo solo, elegido sin escribir nada, no es un borrador). */
function tieneContenido(b: { texto?: string; audio?: string; adjuntos?: unknown[]; campos?: Record<string, string> }): boolean {
  return !!b.texto?.trim() || !!b.audio || !!b.adjuntos?.length || Object.values(b.campos ?? {}).some((v) => !!v?.trim());
}

/**
 * Lo guarda, o lo quita si quedó vacío. `sin_adjuntos`: lo adjunto no cupo en el navegador y quedó lo demás (se dice);
 * `sin_audio`: tampoco el audio, y quedó solo lo escrito (se dice); `no`: no se pudo guardar nada; `vacio`: no había nada
 * que guardar (y se quitó el de antes, si lo había).
 */
export function guardarBorrador(almacen: Almacen, b: Borrador): 'guardado' | 'sin_adjuntos' | 'sin_audio' | 'no' | 'vacio' {
  const clave = claveDeBorrador(b.proyecto, b.sobre);
  if (!tieneContenido(b)) {
    almacen.removeItem(clave);
    return 'vacio';
  }
  const intentar = (x: Borrador) => {
    if (!tieneContenido(x)) return false;
    try {
      almacen.setItem(clave, JSON.stringify(x));
      return true;
    } catch {
      return false;
    }
  };
  if (intentar(b)) return 'guardado';
  // Lleno (una imagen o un audio largo): primero se suelta lo adjunto, después el audio; lo escrito queda, si hay
  const { adjuntos: _adjuntos, ...sinAdjuntos } = b;
  if (b.adjuntos?.length && intentar(sinAdjuntos)) return 'sin_adjuntos';
  const { audio: _audio, ...sinAudio } = sinAdjuntos;
  if (b.audio && intentar(sinAudio)) return 'sin_audio';
  return 'no';
}

/** Un adjunto guardado como data URL, otra vez como archivo, para volver a ponerlo en el diálogo. null si no se entiende. */
export function archivoDeAdjunto(a: { nombre: string; datos: string }): File | null {
  const m = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(a.datos);
  if (!m) return null;
  try {
    const crudo = m[2] ? atob(m[3]) : decodeURIComponent(m[3]);
    const bytes = Uint8Array.from(crudo, (c) => c.charCodeAt(0));
    return new File([bytes], a.nombre, { type: m[1] || 'application/octet-stream' });
  } catch {
    return null;
  }
}

export function leerBorrador(almacen: Almacen, proyecto: string, sobre: SobreBorrador): Borrador | null {
  return leer(almacen, claveDeBorrador(proyecto, sobre));
}

function leer(almacen: Almacen, clave: string): Borrador | null {
  try {
    const b = JSON.parse(almacen.getItem(clave) ?? 'null') as Borrador | null;
    return b && typeof b.texto === 'string' && b.sobre && typeof b.sobre.tipo === 'string' && tieneContenido(b) ? b : null;
  } catch {
    return null;
  }
}

export function quitarBorrador(almacen: Almacen, proyecto: string, sobre: SobreBorrador): void {
  almacen.removeItem(claveDeBorrador(proyecto, sobre));
}

/** Los borradores de un proyecto, del más viejo al más nuevo. */
export function borradoresDe(almacen: Almacen, proyecto: string): Borrador[] {
  const prefijo = `${PREFIJO}${proyecto}:`;
  const claves: string[] = [];
  for (let i = 0; i < almacen.length; i++) {
    const k = almacen.key(i);
    if (k?.startsWith(prefijo)) claves.push(k);
  }
  // Los de «Corregir» se reabren desde su nota, no desde esta lista (abre el diálogo de comentar)
  return claves.flatMap((k) => leer(almacen, k) ?? []).filter((b) => b.sobre.tipo !== SOBRE_CORREGIR).sort((a, b) => a.cuando.localeCompare(b.cuando));
}

/** Una línea por borrador, para la lista que se muestra antes de pedir la revisión. */
export function lineaDeBorrador(b: Borrador): string {
  const texto = b.texto.trim().replace(/\s+/g, ' ');
  const resumen = texto ? `«${texto.length > 80 ? `${texto.slice(0, 79)}…` : texto}»` : '';
  return `${b.titulo}${resumen ? `: ${resumen}` : ''}${b.audio ? `${resumen ? ', con' : ': un'} audio` : ''}`;
}
