// Las voces de Kokoro, locales y sin internet (tools/director/voz.py): lo puro, que usan el servidor
// (estudio/servidor/voz.ts) y la niebla de lectura (estudio/src/guiaLectura.ts). Nada de aquí toca el disco ni la red.
// Son las únicas voces del Studio (decisión del titular, 26 de octubre de 2026, nota de voz nmvpdu9zqtit: «nos quedamos con
// las voces de Kokoro, que serán las oficiales instalables con este»; las del sistema, que lee el navegador, y las demás
// se descartaron): sin una instalada, la niebla no lee y dice cómo instalarlas, nunca cae a otra voz en silencio.

/** Una voz de Kokoro instalada: `id` es `kokoro:<voz>`; `idioma`, el código corto (es, en). */
export type VozNatural = { id: string; nombre: string; idioma: string };

/**
 * Las voces con que llega el Studio, por idioma, las dos de Kokoro (licencia Apache): Santa, la que eligió el titular al
 * oírlas el 26 de octubre de 2026 (misión t_elegir_voz_es), y Heart, de licencia libre. Quien elige otra en «Sonidos» la
 * conserva.
 */
export const VOZ_NATURAL_POR_DEFECTO: Record<string, string> = {
  es: 'kokoro:em_santa',
  en: 'kokoro:af_heart',
};

/** Lo más largo que se lee de una vez con una voz (un bloque de la niebla cabe de sobra). */
export const MAX_TEXTO_VOZ = 6000;

const ID = /^kokoro:([A-Za-z0-9_.-]{1,80})$/;

/** ¿Este id es de una voz de Kokoro? Una voz del navegador o un id viejo de otro motor ya no lo es. */
export const esVozNatural = (id: string | null | undefined): id is string => !!id && ID.test(id);

/** El idioma de una voz por su id, sin consultar nada: Kokoro nombra `ef_dora` con la primera letra (e es español; a y b, inglés). null si no se reconoce. */
export function idiomaDeIdNatural(id: string | null | undefined): string | null {
  const m = id ? ID.exec(id) : null;
  if (!m) return null;
  return { e: 'es', a: 'en', b: 'en', f: 'fr', i: 'it', p: 'pt', j: 'ja', z: 'zh', h: 'hi' }[m[1][0]] ?? null;
}

/** El JSON que imprime `voz.py --lista`, o null si no lo es (basura delante, como un aviso de Python, no lo rompe). */
function datosDeLista(salida: string): { voces?: unknown; avisos?: unknown } | null {
  try {
    return JSON.parse(salida.slice(salida.indexOf('{')));
  } catch {
    return null;
  }
}

/** La lista que imprime `voz.py --lista`, ya validada: lo que no sea una voz de Kokoro o no tenga su forma se descarta, nunca falla. Pura. */
export function leerListaVoces(salida: string): VozNatural[] {
  const lista = datosDeLista(salida)?.voces;
  if (!Array.isArray(lista)) return [];
  const vistas = new Set<string>();
  const voces: VozNatural[] = [];
  for (const v of lista as Partial<VozNatural>[]) {
    if (!v || typeof v.id !== 'string' || !esVozNatural(v.id) || vistas.has(v.id)) continue;
    const idioma = typeof v.idioma === 'string' && v.idioma ? v.idioma.slice(0, 2).toLowerCase() : idiomaDeIdNatural(v.id);
    if (!idioma) continue;
    vistas.add(v.id);
    voces.push({ id: v.id, nombre: typeof v.nombre === 'string' && v.nombre ? v.nombre : v.id, idioma });
  }
  return voces;
}

/** Los avisos de `voz.py --lista` (por qué no hay voces: falta el paquete o el modelo). Pura. */
export function leerAvisosVoces(salida: string): string[] {
  const avisos = datosDeLista(salida)?.avisos;
  return Array.isArray(avisos) ? avisos.filter((a): a is string => typeof a === 'string' && !!a.trim()).map((a) => a.trim()) : [];
}

/** La orden que instala Kokoro, desde la carpeta del Studio: la misma para cualquiera que lo instale (en Windows, dentro de WSL). Pura. */
export const comoInstalarKokoro = (windows: boolean) =>
  `Se instalan, desde la carpeta del Studio, con: ${windows ? 'wsl -d Ubuntu -- ' : ''}bash tools/entorno/instalar_voces.sh`;

/** Lo que se le dice a la persona cuando la lista de voces sale vacía: que Kokoro no está instalado, el detalle que dio Python y cómo instalarlo. Pura. */
export function motivoSinVoces(avisos: readonly string[], comoInstalar: string): string {
  const detalle = (avisos[0] ?? '').replace(/^Kokoro:\s*/i, '').replace(/\.$/, '');
  return `Las voces de Kokoro no están instaladas en este computador${detalle ? ` (${detalle})` : ''}. ${comoInstalar}`;
}

const IDIOMAS: Record<string, string> = { es: 'español', en: 'inglés', pt: 'portugués' };

/**
 * Por qué no hay voz para leer en este idioma, dicho para la persona, y que el director sigue a su ritmo. `instaladas` son
 * todas las voces que hay (de cualquier idioma); `motivo`, lo que dijo el servidor cuando no hay ninguna (ya trae cómo
 * instalarlas); `conBoton`, si el aviso trae «Comprobar de nuevo». Pura.
 */
export function sinVozPorque(idioma: string, instaladas: readonly VozNatural[], motivo: string, conBoton = false): string {
  const nombre = IDIOMAS[idioma] ?? idioma;
  const sigue = 'el director sigue sin voz, a su ritmo';
  if (!instaladas.length) return `${motivo.trim()} Mientras tanto, ${sigue}.${conBoton ? ' Cuando termine de instalarse, oprime «Comprobar de nuevo».' : ''}`;
  if (!VOZ_NATURAL_POR_DEFECTO[idioma]) return `Kokoro todavía no tiene una voz en ${nombre} en el Studio, así que ${sigue}.`;
  return `No encuentro una voz de Kokoro en ${nombre} instalada en este computador, así que ${sigue}.`;
}

/**
 * Qué se pide al servidor para leer: la voz (debe ser de la lista de las instaladas) y el texto (con tope). Devuelve el
 * texto limpio o, si no se puede, el motivo para la persona. Pura.
 */
export function revisarPedidoDeVoz(voz: unknown, texto: unknown, instaladas: readonly VozNatural[]): { ok: true; voz: string; texto: string } | { ok: false; error: string } {
  if (typeof voz !== 'string' || !instaladas.some((v) => v.id === voz)) return { ok: false, error: 'Esa voz de Kokoro no está instalada en este computador.' };
  const limpio = typeof texto === 'string' ? texto.trim() : '';
  if (!limpio) return { ok: false, error: 'No hay texto que leer.' };
  if (limpio.length > MAX_TEXTO_VOZ) return { ok: false, error: `El texto mide ${limpio.length} caracteres y el tope para una voz es ${MAX_TEXTO_VOZ}.` };
  return { ok: true, voz, texto: limpio };
}

/**
 * Dónde termina una pregunta: un «?» (o varios, o «?!») con sus comillas o paréntesis de cierre, antes de un espacio o del
 * final del texto. Un «?» pegado a una letra o a un punto (`a?.b`, `/x?y=1`) no cierra nada.
 */
const FIN_DE_PREGUNTA = /\?[?!]*[)\]}"'”’»]*(?=\s|$)/g;

/**
 * Dónde termina una oración que no es pregunta, para hallar dónde empieza una pregunta que no trae «¿»: un punto, una
 * exclamación o unos puntos suspensivos con su espacio (no el punto de `2.0` ni de `voz.py`), o un salto de línea.
 */
const FIN_DE_ORACION = /[.!…][)\]}"'”’»]*\s+|\n\s*/g;

/** ¿Hay algo que decir en voz alta? Un trozo de pura puntuación o símbolos (un paréntesis, unos puntos suspensivos) no, y a Kokoro no se le pide leerlo solo. */
const SE_DICE = /[\p{L}\p{N}]/u;

/** Dónde empieza la pregunta que cierra el «?» de la posición `fin`: en su «¿» más cercano, si lo tiene desde `desde`; si no (el inglés), donde empieza su oración. */
function inicioDePregunta(texto: string, desde: number, fin: number): number {
  const abre = texto.lastIndexOf('¿', fin);
  if (abre >= desde) return abre;
  let inicio = desde;
  for (const m of texto.slice(desde, fin).matchAll(FIN_DE_ORACION)) inicio = desde + m.index + m[0].length;
  return inicio;
}

/**
 * Parte un texto para que cada pregunta se lea aparte (pedido pd_voz_preguntas): Kokoro entona una pregunta cuando es una
 * llamada suya, con su «¿» y su «?», y la pierde en medio de un párrafo. Una pregunta es una oración que termina en «?»,
 * desde su «¿» o, si no lo trae (como en inglés), desde donde empieza la oración. Lo de antes, lo de entre dos preguntas y
 * lo de después son un fragmento cada uno, y juntos de nuevo dan el mismo texto salvo los espacios entre fragmentos. Un
 * texto sin preguntas, o que es una sola, queda entero y tal cual (`[texto]`): se lee como siempre, en una llamada. Lo que no
 * se puede decir solo (un paréntesis suelto, unos puntos suspensivos) se pega al fragmento de al lado. Pura.
 */
export function partirPreguntas(texto: string): string[] {
  const tramos: [number, number][] = [];
  let desde = 0;
  for (const m of texto.matchAll(FIN_DE_PREGUNTA)) {
    const fin = m.index + m[0].length;
    const inicio = inicioDePregunta(texto, desde, m.index);
    tramos.push([desde, inicio], [inicio, fin]);
    desde = fin;
  }
  tramos.push([desde, texto.length]);
  const unidos: [number, number][] = [];
  for (const tramo of tramos) {
    const ultimo = unidos.at(-1);
    if (ultimo && !(SE_DICE.test(texto.slice(...tramo)) && SE_DICE.test(texto.slice(...ultimo)))) ultimo[1] = tramo[1];
    else unidos.push(tramo);
  }
  return unidos.length > 1 ? unidos.map(([a, b]) => texto.slice(a, b).trim()) : [texto];
}

/** Un WAV leído por dentro: su formato (`tipo` 1 es PCM) y sus muestras, sin copiarlas. */
type AudioWav = { tipo: number; canales: number; frecuencia: number; bits: number; muestras: Uint8Array };

/**
 * Lee un WAV por sus bloques (`RIFF`, `fmt ` y `data`; salta los demás, como `LIST`), sin suponer una cabecera de 44 bytes.
 * Si el bloque `data` dice más de lo que hay, toma lo que hay. null si no es un WAV o le falta su formato o sus muestras. Pura.
 */
function leerWav(wav: Uint8Array): AudioWav | null {
  const v = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const marca = (en: number) => String.fromCharCode(...wav.subarray(en, en + 4));
  if (wav.length < 12 || marca(0) !== 'RIFF' || marca(8) !== 'WAVE') return null;
  let formato: Omit<AudioWav, 'muestras'> | null = null;
  for (let en = 12; en + 8 <= wav.length; ) {
    const id = marca(en);
    const largo = v.getUint32(en + 4, true);
    const cuerpo = en + 8;
    if (id === 'fmt ' && largo >= 16 && cuerpo + 16 <= wav.length) {
      formato = { tipo: v.getUint16(cuerpo, true), canales: v.getUint16(cuerpo + 2, true), frecuencia: v.getUint32(cuerpo + 4, true), bits: v.getUint16(cuerpo + 14, true) };
    } else if (id === 'data') {
      return formato && { ...formato, muestras: wav.subarray(cuerpo, Math.min(cuerpo + largo, wav.length)) };
    }
    en = cuerpo + largo + (largo % 2); // los bloques miden un número par de bytes: uno impar trae uno de relleno
  }
  return null;
}

/**
 * Arma un WAV con este formato y estas muestras, una parte tras otra (de muestras enteras, ya alineadas). La cabecera es
 * nueva, de 44 bytes, con los tamaños de `RIFF` y de `data` de lo armado. Pura.
 */
function armarWav({ tipo, canales, frecuencia, bits }: Omit<AudioWav, 'muestras'>, partes: readonly Uint8Array[]): Uint8Array {
  const marco = canales * (bits / 8);
  const total = partes.reduce((suma, p) => suma + p.length, 0);
  const armado = new Uint8Array(44 + total);
  const v = new DataView(armado.buffer);
  const poner = (en: number, marca: string) => [...marca].forEach((c, i) => (armado[en + i] = c.charCodeAt(0)));
  poner(0, 'RIFF');
  v.setUint32(4, 36 + total, true);
  poner(8, 'WAVE');
  poner(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, tipo, true);
  v.setUint16(22, canales, true);
  v.setUint32(24, frecuencia, true);
  v.setUint32(28, frecuencia * marco, true);
  v.setUint16(32, marco, true);
  v.setUint16(34, bits, true);
  poner(36, 'data');
  v.setUint32(40, total, true);
  let en = 44;
  for (const p of partes) {
    armado.set(p, en);
    en += p.length;
  }
  return armado;
}

/**
 * Une varios WAV en uno solo, sus muestras una tras otra, con el formato que comparten (PCM, y los mismos canales,
 * frecuencia y bits en todos: la voz de Kokoro de un mismo pedido). Con uno, lo devuelve tal cual. La cabecera es nueva, de
 * 44 bytes, con los tamaños de `RIFF` y de `data` de lo unido. null si no hay ninguno, si uno no es un WAV o si sus formatos
 * no coinciden, porque unirlos sería ruido. Pura.
 */
export function unirWavs(wavs: readonly Uint8Array[]): Uint8Array | null {
  if (wavs.length <= 1) return wavs[0] ?? null;
  const audios: AudioWav[] = [];
  for (const wav of wavs) {
    const audio = leerWav(wav);
    if (!audio) return null;
    audios.push(audio);
  }
  const { tipo, canales, frecuencia, bits } = audios[0];
  if (tipo !== 1 || !canales || !bits || bits % 8 || audios.some((a) => a.tipo !== tipo || a.canales !== canales || a.frecuencia !== frecuencia || a.bits !== bits)) return null;
  // Cada audio en muestras enteras: uno cortado a media muestra desalinearía los que le siguen
  const marco = canales * (bits / 8);
  return armarWav(audios[0], audios.map((a) => a.muestras.subarray(0, a.muestras.length - (a.muestras.length % marco))));
}

/** La voz de Kokoro que lee sin que la persona elija: la de por defecto del idioma si está instalada y, si no, la primera de ese idioma. null si no hay. Pura. */
export function vozPorDefecto(idioma: string, instaladas: readonly VozNatural[]): VozNatural | null {
  const del = instaladas.filter((v) => v.idioma === idioma);
  return del.find((v) => v.id === VOZ_NATURAL_POR_DEFECTO[idioma]) ?? del[0] ?? null;
}

/**
 * La voz de Kokoro que lee en este idioma, o null si no hay ninguna (entonces no se lee y se dice por qué: nunca otra voz).
 * `guardada` es lo que la persona eligió para el idioma (null si nada); `instaladas`, las que hay (null si aún no se sabe).
 * Una elegida que no es de Kokoro (el id de una voz del navegador o de otro motor, de antes) o que ya no está instalada
 * cae a la de por defecto del idioma. Mientras no se sabe qué hay instalado, vale la elegida de este idioma o, sin
 * elección, la de por defecto: el servidor comprueba al leer y dice si falta. Pura.
 */
export function vozNaturalDe(idioma: string, guardada: string | null, instaladas: readonly VozNatural[] | null): VozNatural | null {
  const provisional = (id: string): VozNatural => ({ id, nombre: id.replace(/^kokoro:/, ''), idioma });
  if (instaladas === null) {
    if (esVozNatural(guardada) && idiomaDeIdNatural(guardada) === idioma) return provisional(guardada);
    const defecto = VOZ_NATURAL_POR_DEFECTO[idioma];
    return defecto ? provisional(defecto) : null;
  }
  const ella = esVozNatural(guardada) ? instaladas.find((v) => v.id === guardada && v.idioma === idioma) : undefined;
  return ella ?? vozPorDefecto(idioma, instaladas);
}

/**
 * Cuándo empieza a decirse cada palabra de un texto leído en `duracion` segundos, repartido en proporción a los
 * caracteres que lleva delante (una voz no avisa de cada palabra). `palabras` son los [inicio, fin) de cada una
 * en el texto completo; `desde` es el primer carácter que se lee (el inicio de la primera palabra que se dice).
 * Devuelve un tiempo por palabra, empezando por 0. Pura.
 */
export function momentosDePalabras(palabras: readonly [number, number][], desde: number, duracion: number): number[] {
  if (!palabras.length || !(duracion > 0)) return palabras.map(() => 0);
  const fin = Math.max(palabras[palabras.length - 1][1] - desde, 1);
  return palabras.map(([inicio]) => (Math.max(0, inicio - desde) / fin) * duracion);
}

/** La palabra que se está diciendo en el segundo `t`: la última cuyo momento ya llegó (-1 si ninguna). Pura. */
export function palabraAlMomento(momentos: readonly number[], t: number): number {
  let i = -1;
  for (let k = 0; k < momentos.length && momentos[k] <= t; k++) i = k;
  return i;
}

/** Por qué no se pudo leer con la voz, dicho para la persona, a partir de lo que respondió el servidor. */
export const errorDeVozNatural = (motivo: string | undefined) =>
  `La voz de Kokoro no pudo leer: ${motivo?.trim() || 'el servidor no respondió'}. La apagué y el director sigue a su ritmo; vuelve a encenderla con el altavoz para probar otra vez.`;
