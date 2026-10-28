// La niebla de lectura (notas de voz del titular, 24 de octubre de 2026): una herramienta opcional para leer lo que
// escribe el modelo, que se enciende y se apaga con su atajo junto a la cara del director («Niebla de lectura»).
// Encendida, todo el texto para leer de la ventana de lectura (la del modo enfoque: los párrafos, los puntos de las
// listas, las decisiones, el texto de cada paso; y «¿Dónde quedamos?»: en qué quedamos, lo avanzado y los comentarios
// del director) queda bajo una niebla de nubes, y al principio de cada bloque espera una miniatura del director, que la
// persona arrastra con el ratón o el dedo para ir desvelando lo que falta por leer. No aplica a los títulos ni a la
// interfaz del Studio, ni fuera de esas ventanas.
//
// Con el avance solo (▶), el director no salta ni va de palabra en palabra: camina parejo, cuadro a cuadro, a una
// rapidez constante en píxeles (la misma en una palabra larga que en una corta), a la velocidad elegida (de 1×, 50
// palabras por minuto, a 5×), solo el bloque de ahora: al terminarlo se detiene, y ▶ sigue con el siguiente. Al cambiar
// de renglón va en un solo movimiento suave de un segundo, del final del renglón al principio del siguiente, y apenas
// llega sigue leyendo, sin pausa antes ni espera después (nota de voz del titular nmvmz5okftit). Mientras avanza solo, la
// cámara mantiene su renglón centrado, con un desplazamiento lento y suave, y la rueda del ratón lo adelanta o lo
// regresa; sin el avance solo, la rueda desplaza la ventana como siempre (nota de voz del titular nmvmzgq7ntit).
// Arrastrado, va a donde lo lleve la persona, sin tope de velocidad y sin cámara (ella desplaza la ventana a su gusto
// mientras lo tiene tomado): la niebla espera y, al soltarlo, se destapa o se tapa muy rápido hasta ahí; tomarlo detiene
// el avance solo, y soltarlo no lo vuelve a encender (nota de voz del titular nmvmzeviqtit). El botón central del ratón
// enciende o detiene el avance solo. Lleva una cara mientras camina y otra quieto; al despejar el bloque entero, celebra
// con un destello, estrellas y su sonido («Despejar la niebla de un párrafo», en Sonidos).
//
// La niebla son nubes que se dibujan encima de cada renglón por leer, con su borde de algodón que deriva despacio (las
// nubes del «fog of war» de Civilization V; las capas que se mueven a distinto ritmo, del foro de jMonkeyEngine), y el
// texto debajo se vuelve transparente con un resaltado del navegador (CSS Custom Highlight, `::highlight(niebla-lectura)`;
// el truco del texto borroso de CSS-Tricks), que no toca el texto ni la selección. Cada palabra que se desvela suelta un
// soplo de nube que se deshace (como el humo de «Smoky Text» de CodeFronts). Cada bloque guarda en este navegador
// hasta dónde se leyó, por la huella de su texto: si el director lo reescribe, la huella cambia y vuelve al principio.
import './guiaLectura.css';
import { caraSVG } from './cara';
import { sonar } from './sonidos';
import { icono } from './iconos';
import { altoDeVentana, anchoDeVentana, puntoEnPagina, rectaEnPagina } from './escala';
import { comoInstalarKokoro, errorDeVozNatural, esVozNatural, momentosDePalabras, palabraAlMomento, sinVozPorque, vozNaturalDe, type VozNatural } from '../../src/director/voz';

/** Un bloque con menos palabras es un rótulo, no una idea que leer: no lleva niebla. */
export const MIN_PALABRAS = 3;
/** Un punto de lista con más palabras (unos tres renglones) se lee solo; los más cortos, juntos con los de su lista. */
export const PALABRAS_PUNTO_CORTO = 40;
/** ¿Una lista se lee de una vez, con un solo director? Si tiene más de un punto y todos son cortos. */
export const esListaCorta = (palabrasPorPunto: number[]) => palabrasPorPunto.length > 1 && palabrasPorPunto.every((n) => n <= PALABRAS_PUNTO_CORTO);
/** Cuántos bloques a medio leer recuerda este navegador (se olvidan primero los más viejos). */
const MAX_PUNTOS = 400;
const CLAVE = 'estudio.guiaLectura';
/** Si la niebla de lectura está encendida en este navegador (apagada hasta que la persona la encienda). */
const CLAVE_NIEBLA = 'estudio.nieblaLectura';
/** La velocidad del avance solo, en este navegador. */
const CLAVE_VELOCIDAD = 'estudio.nieblaLectura.velocidad';
/** Las velocidades del director, arrastrado o solo (nota de voz del titular: «1x, 2x, 3x, hasta 5x»). */
export const VELOCIDADES = [1, 2, 3, 4, 5] as const;
/** 1× son 50 palabras por minuto, y cada paso suma otras 50 (nota de voz del titular: «bájalo a 50 palabras por minuto y parte desde ahí»). */
export const PPM_BASE = 50;
export const palabrasPorMinuto = (velocidad: number) => PPM_BASE * Math.max(1, velocidad);

export const nieblaPuesta = () => {
  try {
    return localStorage.getItem(CLAVE_NIEBLA) === '1';
  } catch {
    return false;
  }
};
export function ponerNiebla(si: boolean) {
  try {
    localStorage.setItem(CLAVE_NIEBLA, si ? '1' : '0');
  } catch {
    // Sin almacenamiento, se enciende solo en esta visita
  }
}

export function velocidadAuto(): number {
  try {
    const v = Number(localStorage.getItem(CLAVE_VELOCIDAD));
    return (VELOCIDADES as readonly number[]).includes(v) ? v : 1;
  } catch {
    return 1;
  }
}

/** La huella de un texto, sin importar los espacios: si el director lo reescribe, cambia, y la guía vuelve al principio. */
export function huellaDe(texto: string): string {
  const t = texto.replace(/\s+/g, ' ').trim();
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${h.toString(36)}${t.length.toString(36)}`;
}

/** Las palabras de un texto, cada una como [inicio, fin) dentro de él. */
export function palabrasDe(texto: string): [number, number][] {
  return [...texto.matchAll(/\S+/g)].map((m) => [m.index!, m.index! + m[0].length]);
}

/** Hasta qué palabra se leyó cada bloque (por su huella), y cuándo. */
export type Puntos = Record<string, [number, number]>;

export function leerPuntos(guardado: string | null): Puntos {
  try {
    const p: unknown = JSON.parse(guardado ?? '{}');
    return p && typeof p === 'object' && !Array.isArray(p) ? (p as Puntos) : {};
  } catch {
    return {};
  }
}

/** Los puntos con el de un bloque al día: al volver al principio se olvida; pasado el tope, salen los más viejos. */
export function conPunto(puntos: Puntos, huella: string, palabra: number, cuando: number, max = MAX_PUNTOS): Puntos {
  const p = { ...puntos };
  if (palabra < 0) delete p[huella];
  else p[huella] = [palabra, cuando];
  const claves = Object.keys(p);
  if (claves.length > max)
    claves
      .sort((a, b) => p[a][1] - p[b][1])
      .slice(0, claves.length - max)
      .forEach((k) => delete p[k]);
  return p;
}

/**
 * Dónde se sigue leyendo una ventana (nota de voz del titular: «si un párrafo ya tiene un avance en lectura, lo cargamos
 * donde iba el despeje de la nube; si no, desde el principio»): el primer bloque sin terminar y si ya tenía avance. Cada
 * bloque, con hasta qué palabra se leyó (-1, nada) y su última palabra. Null si todo está leído.
 */
export function dondeSeguir(bloques: { punto: number; ultima: number }[]): { indice: number; conAvance: boolean } | null {
  const i = bloques.findIndex((b) => b.punto < b.ultima);
  return i < 0 ? null : { indice: i, conAvance: bloques[i].punto >= 0 };
}

/** La caja de una palabra en la pantalla. */
export interface Caja {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/** El renglón de cada palabra: empieza uno nuevo cuando la palabra baja más de media altura. */
export function renglonesDe(cajas: Caja[]): number[] {
  let r = 0;
  return cajas.map((c, i) => {
    if (i > 0 && c.y > cajas[i - 1].y + cajas[i - 1].alto / 2) r++;
    return r;
  });
}

// La posición del director, `pos`, va de -1 (antes del texto: nada leído) a la última palabra; k es que dejó atrás la
// palabra k, y entre dos enteros va de camino. El tramo de k a k + 1 que cambia de renglón se reparte: de k a k + SALTO,
// el cambio (el arco del final del renglón al principio del siguiente); de ahí a k + 1, caminar sobre la primera palabra
// del renglón nuevo.

/** La parte de un tramo que cambia de renglón que se va en el cambio (el resto, caminar sobre la primera palabra). */
export const SALTO = 0.6;
/**
 * Lo que tarda el cambio de renglón hacia adelante: el movimiento mismo, un arco que arranca y llega despacio, sin pausa
 * al final del renglón ni espera al principio del siguiente (nota de voz del titular nmvmz5okftit: «el delay que busco es
 * en el desplazamiento entre el final de la línea superior y el inicio de la línea siguiente; tan pronto esté
 * posicionado, puede continuar»). De vuelta, más rápido.
 */
export const MS_CAMBIO = 1000;
export const MS_CAMBIO_ATRAS = 300;
/**
 * Al soltar al director donde se arrastró (y con cada muesca de la rueda en el avance solo), la niebla se destapa o se
 * tapa hasta ahí muy rápido, sin el ritmo de lectura ni el segundo del cambio de renglón: en lo que tarde esto como
 * mucho, y nunca más lento que RAPIDEZ_MIN palabras por segundo (nota de voz del titular nmvmzeviqtit).
 */
export const MS_REUBICAR = 450;
export const RAPIDEZ_MIN = 12;
/** Las palabras por segundo de esa reubicación, de `desde` a `hasta`. */
export const rapidezReubicar = (desde: number, hasta: number) => Math.max(RAPIDEZ_MIN, Math.abs(hasta - desde) / (MS_REUBICAR / 1000));
/** Cuánto sube el arco del cambio de renglón. */
const ARCO_PX = 9;
/** De vuelta (volver a cubrir), los píxeles por segundo: no hay nada que leer, pero tampoco salta. */
const PX_ATRAS = 700;
const EPS = 1e-6;
const suave = (u: number) => u * u * (3 - 2 * u);

/** Dónde queda el borde izquierdo del director después de la palabra k (o, con -1, antes del texto) y la mitad de su renglón. */
function punta(cajas: Caja[], k: number, lado: number) {
  const c = cajas[Math.max(0, k)];
  return k < 0 ? { x: c.x - lado - 4, y: c.y + c.alto / 2 } : { x: c.x + c.ancho + 1, y: c.y + c.alto / 2 };
}

/** Dónde empieza a caminar el director sobre la primera palabra de un renglón que no es el primero. */
const llegada = (cajas: Caja[], k: number, lado: number) => cajas[k].x - lado / 2;

/**
 * El tramo donde va `pos` en esa dirección: entre qué palabras (k y k + 1) y si va en el cambio de renglón (con su
 * ritmo de tiempo) o caminando (con su ritmo en píxeles).
 */
function tramoDe(renglones: number[], pos: number, dir: number): { k: number; cambio: boolean } {
  const fin = renglones.length - 1;
  const k = Math.max(-1, Math.min(fin - 1, dir > 0 ? Math.floor(pos + EPS) : Math.ceil(pos - EPS) - 1));
  const t = pos - k;
  const cambia = k >= 0 && renglones[k] !== renglones[k + 1];
  return { k, cambio: cambia && (dir > 0 ? t < SALTO - EPS : t <= SALTO + EPS) };
}

/** Hasta dónde llega un paso del director sin pasar al tramo siguiente (ahí cambia su ritmo). */
export function borde(renglones: number[], pos: number, dir: number): number {
  const { k } = tramoDe(renglones, pos, dir);
  const cambia = k >= 0 && renglones[k] !== renglones[k + 1];
  if (dir > 0) return cambia && pos - k < SALTO - EPS ? k + SALTO : k + 1;
  return cambia && pos - k > SALTO + EPS ? k + SALTO : k;
}

/**
 * Cuánto avanza `pos` por segundo a toda marcha: caminando, los píxeles por segundo de su velocidad, parejos (la misma
 * rapidez en una palabra larga que en una corta); en el cambio de renglón, lo que tarda el cambio, sea largo o corto el
 * renglón.
 */
export function ritmo(cajas: Caja[], renglones: number[], pos: number, dir: number, pxPorSegundo: number, msCambio: number, lado: number): number {
  const { k, cambio } = tramoDe(renglones, pos, dir);
  if (cambio) return (SALTO * 1000) / msCambio;
  const z = punta(cajas, k + 1, lado).x;
  const otroRenglon = k >= 0 && renglones[k] !== renglones[k + 1];
  const a = otroRenglon ? llegada(cajas, k + 1, lado) : punta(cajas, k, lado).x;
  return ((otroRenglon ? 1 - SALTO : 1) * pxPorSegundo) / Math.max(4, Math.abs(z - a));
}

/** Los píxeles que mide, en promedio, una palabra del bloque con su espacio: con ellos, las palabras por minuto se vuelven rapidez. */
export function pxPorPalabra(cajas: Caja[], renglones: number[]): number {
  const lineas = new Map<number, [number, number]>();
  cajas.forEach((c, k) => {
    const l = lineas.get(renglones[k]);
    if (!l) lineas.set(renglones[k], [c.x, c.x + c.ancho]);
    else l[1] = Math.max(l[1], c.x + c.ancho);
  });
  let total = 0;
  for (const [x0, x1] of lineas.values()) total += Math.max(0, x1 - x0);
  return cajas.length && total ? total / cajas.length : 40;
}

/** Los píxeles por segundo del director, hacia adelante, a una velocidad (de 1× a 5×) y con las palabras de un bloque. */
export const pxPorSegundo = (velocidad: number, pxPalabra: number) => (palabrasPorMinuto(velocidad) / 60) * pxPalabra;

/**
 * Hasta dónde lleva el puntero al director, con su borde izquierdo en x y la mitad de su alto en y: el renglón más
 * cercano y, en él, el lugar exacto del camino (no la palabra más cercana). Estar al principio de un renglón es haber
 * bajado a él: el director cambia de renglón, aunque todavía no lea nada del nuevo. Puede estar lejos: el director
 * camina hasta allá a su ritmo, nunca salta.
 */
export function posHacia(cajas: Caja[], renglones: number[], x: number, y: number, lado: number): number {
  if (!cajas.length) return -1;
  let r = 0;
  let menor = Infinity;
  cajas.forEach((c, k) => {
    const d = Math.abs(y - (c.y + c.alto / 2));
    if (d < menor) {
      menor = d;
      r = renglones[k];
    }
  });
  const primera = renglones.indexOf(r);
  const ultima = renglones.lastIndexOf(r);
  const camino: [number, number][] = [primera === 0 ? [-1, punta(cajas, -1, lado).x] : [primera - 1 + SALTO, llegada(cajas, primera, lado)]];
  for (let k = primera; k <= ultima; k++) camino.push([k, punta(cajas, k, lado).x]);
  if (x <= camino[0][1]) return camino[0][0];
  for (let i = 1; i < camino.length; i++) {
    const [p0, x0] = camino[i - 1];
    const [p1, x1] = camino[i];
    if (x <= x1) return p0 + (p1 - p0) * ((x - x0) / Math.max(EPS, x1 - x0));
  }
  return ultima;
}

/** Dónde va el director (su borde izquierdo y la mitad de su alto) en una posición continua, sin saltos. */
export interface Lugar {
  x: number;
  y: number;
  /** Va cambiando de renglón: en el arco hacia el siguiente (o al final del renglón, a punto de bajar). */
  saltando: boolean;
}

/**
 * El lugar del director en `pos`: sobre un renglón avanza parejo; al cambiar de renglón, va en un arco suave (arranca y
 * llega despacio) del final del renglón al principio del siguiente y, apenas llega, camina sobre su primera palabra. Así
 * nunca hay un salto entre dos cuadros, ni un rato quieto.
 */
export function lugarEn(cajas: Caja[], renglones: number[], pos: number, lado: number): Lugar {
  const fin = cajas.length - 1;
  if (pos >= fin) return { ...punta(cajas, fin, lado), saltando: false };
  const k = Math.floor(Math.max(-1, pos));
  const t = Math.max(-1, pos) - k;
  const a = punta(cajas, k, lado);
  const z = punta(cajas, k + 1, lado);
  if (k < 0 || renglones[k] === renglones[k + 1]) return { x: a.x + (z.x - a.x) * t, y: a.y + (z.y - a.y) * t, saltando: false };
  const inicio = llegada(cajas, k + 1, lado);
  if (t >= SALTO) return { x: inicio + (z.x - inicio) * ((t - SALTO) / (1 - SALTO)), y: z.y, saltando: false };
  const e = suave(t / SALTO);
  return { x: a.x + (inicio - a.x) * e, y: a.y + (z.y - a.y) * e - Math.sin(Math.PI * e) * ARCO_PX, saltando: true };
}

/** La nube de cada renglón: desde la primera palabra aún por leer de ese renglón hasta su última. */
export function nubesDe(cajas: Caja[], renglones: number[], punto: number): (Caja & { renglon: number })[] {
  const nubes = new Map<number, Caja & { renglon: number }>();
  for (let k = Math.max(0, punto + 1); k < cajas.length; k++) {
    const c = cajas[k];
    const n = nubes.get(renglones[k]);
    if (!n) nubes.set(renglones[k], { renglon: renglones[k], ...c });
    else {
      const fin = Math.max(n.x + n.ancho, c.x + c.ancho);
      n.y = Math.min(n.y, c.y);
      n.alto = Math.max(n.alto, c.alto);
      n.x = Math.min(n.x, c.x);
      n.ancho = fin - n.x;
    }
  }
  return [...nubes.values()];
}

// Lo que se lee: párrafos, puntos de lista (también las decisiones), celdas, el texto de cada paso de la misión y las
// líneas de «¿Dónde quedamos?» que faltan por leer (las que se tocan, se tachan o ya se leyeron, no). Lo que respondió el
// director a cada nota (nota de voz del titular nmvmytjd0tit, 24 de octubre de 2026) llega con formato, en sus párrafos y
// sus puntos (pedido pd_graficos_svg): se lee con ellos, sin un selector aparte que lo leería dos veces
const SELECTOR = 'p, li, td, dd, ol.pasos > li > span:first-child, .dq-item:not(.leida, .tachando) .dq-texto';
// Lo que no: los títulos, la interfaz del Studio (sus avisos, sus cuentas, sus botones y lo que se escribe) y lo que
// escribió la persona (`.gl-sin`, en cada nota: no hay nada que desvelarle de lo que ella misma dijo). Un mensaje del
// Studio no es del modelo: «Esperando al director…», «Quedó en…», un aviso, una transcripción en curso (nota de voz del
// titular nmvn1rfv4tit, 24 de octubre de 2026: «los mensajes de interfaz no deben tener niebla»)
//
// Cada párrafo con clase que pinta el Studio está en una de las dos listas: aquí, o en DEL_MODELO. La prueba lo exige
// para cada `<p class>` de director.ts (nota de voz del titular nmvoksx45tit, 25 de octubre de 2026: la pista de las
// opciones que se suman nació sin estar aquí y quedó nublada); un `<p>` sin clase es del Markdown del director.
const FUERA = [
  'nav, header, summary, label, select, textarea, [contenteditable], button, .sr-only, p.como, .gl-sin',
  '.ajustes-lector, .marcas-trozo, .cuenta-ideas, .idea-cambiada, .estado-texto, .eleccion-paso, .espera-paso',
  '.aclarando-paso, .pasos-listos, .solo-tu, .sigue-esta, .orden-paso, .dq-al-dia, .dq-leidas',
  '.esperando, .quedo-en, .pide-decision, .transcripcion, .leido-doc, .vacio-m, .todas-hechas, .aviso, .urgente-n',
  '.nota-entrega, .sube-nivel, .logros-nuevos, p.pista-varias, p.intro, p.etiqueta, p.titulo-menu, p.titulo-grupo',
  'p.filtro-equipo, p.bien-repo, p.nota-rol, p.etiqueta-boletin, p.modo-permisos, p.aviso-modelo, p.aviso-ajustes-nuevas, p.cuenta-propuestas',
  'p.leyenda-d, p.error-explorador, p.negados-dq',
  // La línea «Entrega» de una misión es un aviso del sistema, corto, que no hay que destapar para seguir (nota de voz
  // del titular nmvoqthgutit, 25 de octubre de 2026)
  'p.entrega',
  // Lo que corre en vivo no lleva niebla (nota de voz del titular nmvquww8htit, 27 de octubre de 2026: «en un reporte de
  // este tipo no se necesita»): la niebla es para leer con calma lo que se decide o lo que se avanzó (los documentos, los
  // reportes y las misiones). Lo del director flotante (encima.ts › SIEMPRE_ENCIMA: lo que va haciendo, sus atajos, lo que
  // dice) entra en el diálogo de arriba mientras uno está abierto, como «¿Dónde quedamos?», y ahí quedaba nublado; y lo
  // último que hizo una revisión, del registro, tampoco se destapa
  '#segundo-plano, #progreso-director, #atajos-director, #director-flotante, .pasos-progreso',
].join(', ');
/** Los párrafos con clase que traen lo que escribió el director: estos sí llevan niebla. */
export const DEL_MODELO = [
  'dq-quedamos', 'alerta-p', 'aclaracion-paso', 'veredicto', 'porque', 'boletin-p', 'respuesta-d',
  'texto-fase', 'por-que', 'obj-texto', 'texto-d', 'compilado-frentes',
] as const;
// Las líneas de «¿Dónde quedamos?» son botones (se tocan al leerlas): su texto sí se lee
const DENTRO_DE_BOTON = '.dq-texto';
// Dentro de un bloque, lo que no es su texto: la interfaz, y lo que es otro bloque (una lista dentro de un punto)
const APARTE = 'ul, ol, div, table, pre, blockquote';
const SALTAR = `button, select, input, textarea, audio, svg, ${APARTE}, .gl-guia, .gl-nube, .gl-efecto, .gl-globo, .sr-only`;
// Lo que se lee de una vez, con un solo director (nota de voz del titular nmvmzsi0stit, 24 de octubre de 2026: «no se
// trata de ponerlo por cada línea»): una idea de un documento (su trozo, que se marca «Entendido» entera), un paso de la
// misión con su detalle, y fuera de ellos una lista de puntos cortos (esListaCorta). Dentro de un grupo se leen aparte las
// celdas de una tabla y la respuesta del director, que es otra voz.
const GRUPO = '.cuerpo-trozo, ol.pasos > li';
const APARTE_DEL_GRUPO = 'table, .respuesta-dir';
/** Las listas cuyos puntos se tocan uno por uno (cada línea de «¿Dónde quedamos?», cada paso): nunca se juntan. */
const LISTA_SUELTA = '.dq-lista, .pasos';
/** El ancho del director en miniatura (guiaLectura.css › .gl-guia). */
const LADO = 22;

/** Lo que se lee con un solo director: su raíz (la clave del bloque) y los elementos con su texto, en orden. */
interface Unidad {
  el: HTMLElement;
  miembros: HTMLElement[];
}

interface Bloque extends Unidad {
  ancla: HTMLElement;
  /** Donde espera el director, al principio del primer miembro. */
  inicio: HTMLElement;
  guia: HTMLElement;
  huella: string;
  nodos: { nodo: Text; desde: number }[];
  palabras: [number, number][];
  /** Hasta qué palabra se leyó entera: la última que dejó atrás el director. */
  punto: number;
  /** Dónde va el director, de -1 a la última palabra; entre dos enteros, de camino. */
  pos: number;
  /** Hasta dónde va caminando. */
  destino: number;
  /** Su marcha de ahora, de 0 a 1 de su rapidez: arranca y frena de a poco al caminar. */
  marcha: number;
  /** Camina solo (el avance solo). */
  auto: boolean;
  /** Se reubica muy rápido (al soltarlo, o con la rueda en el avance solo): las palabras por segundo; 0, a su ritmo. */
  veloz: number;
  /** Mientras se arrastra y hasta que la niebla llega: dónde está el director, aparte de hasta dónde va la niebla (`pos`). */
  marca: number | null;
  /** Desde qué palabra el texto está transparente bajo la niebla. */
  oculto: number;
  cara: string;
  /** El texto por leer, un tramo por nodo de texto: nunca cubre lo que hay entre dos miembros (un botón, una lista aparte). */
  rangos: Range[];
  nubes: Map<number, HTMLElement>;
  /** Las cajas de sus palabras respecto de su ancla (no cambian al desplazar): se miden de nuevo si cambia de tamaño. */
  cajas: Caja[] | null;
  renglones: number[];
  /** Lo que mide, en promedio, una palabra del bloque (pxPorPalabra), para su rapidez. */
  pxPalabra: number;
}

type Resaltado = { add(r: Range): unknown; delete(r: Range): boolean };
const registro = (globalThis.CSS as unknown as { highlights?: { set(n: string, h: Resaltado): unknown } } | undefined)?.highlights;
const ConResaltado = (globalThis as unknown as { Highlight?: new () => Resaltado }).Highlight;

const bloques = new Map<HTMLElement, Bloque>();
let resaltado: Resaltado | null = null;
const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** La niebla va solo donde hay algo del modelo para leer y con su atajo encendido (director.ts pone la clase). */
const activa = () => document.documentElement.classList.contains('niebla-lectura');
/** La ventana de lectura: «¿Dónde quedamos?» si está abierto (va encima); si no, el documento o la tarjeta de la misión de ahora en el enfoque. */
const ventana = () =>
  document.querySelector<HTMLElement>('dialog.donde-quedamos[open]') ??
  document.querySelector<HTMLElement>('html.enfoque .docs > .lector, html.enfoque-mision .mision-c.sigue.mia');
/** Cualquiera de las ventanas de lectura, para saber dentro de cuál está un bloque. */
const VENTANAS = 'dialog.donde-quedamos[open], html.enfoque .docs > .lector, html.enfoque-mision .mision-c.sigue.mia';

/**
 * La ventana de lectura, si nada se abrió encima de ella (nota de voz del titular nmvol5ahftit, 25 de octubre de 2026:
 * «el orden en el que se va destapando corresponde solamente al modal o a la interfaz que esté abierta en ese momento»).
 * Con otro diálogo abierto encima (el ✉, una confirmación), lo de detrás no avanza ni con ▶, ni con la rueda, ni con el
 * botón central.
 */
const ventanaActiva = () => {
  const caja = ventana();
  return caja && ![...document.querySelectorAll('dialog[open]')].some((d) => !d.contains(caja)) ? caja : null;
};

/** Si un bloque se ve ahora: uno escondido (en algo plegado, con `hidden`) no se lee, aunque se haya medido antes. */
const seMuestra = (el: HTMLElement) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';

function textosDe(el: HTMLElement) {
  const nodos: { nodo: Text; desde: number }[] = [];
  const recorrido = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let desde = 0;
  for (let n = recorrido.nextNode() as Text | null; n; n = recorrido.nextNode() as Text | null) {
    const fuera = n.parentElement?.closest(SALTAR);
    if (fuera && el.contains(fuera) && fuera !== el) continue;
    nodos.push({ nodo: n, desde });
    desde += n.data.length;
  }
  return nodos;
}

/** El texto de los miembros de un bloque, uno tras otro, con un espacio entre dos (para que no se pegue su última palabra con la primera del siguiente). */
function textoDe(miembros: HTMLElement[]) {
  const nodos: { nodo: Text; desde: number }[] = [];
  let texto = '';
  miembros.forEach((m, i) => {
    if (i) texto += ' ';
    for (const { nodo } of textosDe(m)) {
      nodos.push({ nodo, desde: texto.length });
      texto += nodo.data;
    }
  });
  return { nodos, texto };
}

/**
 * Nada dentro de algo plegable lleva niebla (nota de voz del titular nmvosyiartit, 26 de octubre de 2026, «un error
 * grave»: la voz leía un paso que había quedado plegado en «Completado», y no se sabía de dónde venía). Lo que tiene
 * niebla y se narra queda siempre a la vista: lo plegado es lo ya hecho o leído, que no hay que destapar.
 */
export const PLEGABLE = 'details';

/** ¿Este elemento tiene texto para leer? No si es de la interfaz, si está en algo plegable, si lo marcó el Studio (`data-guia="no"`) o si su texto está en otro bloque de adentro. */
const lee = (el: HTMLElement) => el.dataset.guia !== 'no' && !el.closest(PLEGABLE) && (!el.closest(FUERA) || el.matches(DENTRO_DE_BOTON)) && !conBloqueDentro(el);

/** Con qué otros se lee este elemento: la raíz de su grupo (GRUPO, o su lista si es corta), o null si se lee solo. */
function raizDe(el: HTMLElement, caja: HTMLElement): HTMLElement | null {
  const g = el.closest<HTMLElement>(GRUPO);
  const aparte = el.closest(APARTE_DEL_GRUPO);
  if (g && caja.contains(g) && !(aparte && g.contains(aparte))) return g;
  const lista = el.matches('li') ? el.parentElement : null;
  if (!lista?.matches('ul, ol') || lista.matches(LISTA_SUELTA) || !caja.contains(lista)) return null;
  const puntos = [...lista.children].filter((x): x is HTMLElement => x instanceof HTMLElement && x.matches('li'));
  if (!puntos.every(lee)) return null;
  return esListaCorta(puntos.map((p) => palabrasDe(textoDe([p]).texto).length)) ? lista : null;
}

/** Lo que se lee en una ventana, en su orden: cada bloque con su raíz y sus miembros. */
function unidadesDe(caja: HTMLElement): Unidad[] {
  const vistos = new Set<HTMLElement>();
  const unidades: Unidad[] = [];
  for (const el of caja.querySelectorAll<HTMLElement>(SELECTOR)) {
    if (vistos.has(el) || !lee(el)) continue;
    const raiz = raizDe(el, caja);
    const miembros = raiz ? [...raiz.querySelectorAll<HTMLElement>(SELECTOR)].filter((x) => lee(x) && raizDe(x, caja) === raiz) : [el];
    miembros.forEach((x) => vistos.add(x));
    unidades.push({ el: raiz && miembros.length > 1 ? raiz : el, miembros });
  }
  return unidades;
}

/** El nodo de texto y su posición para un lugar del texto del bloque (al final de una palabra, el nodo donde termina). */
function enTexto(nodos: { nodo: Text; desde: number }[], i: number, fin: boolean): [Text, number] {
  for (let k = nodos.length - 1; k >= 0; k--) {
    const n = nodos[k];
    // Si el Studio acortó ese texto en su lugar, nunca más allá de su largo (un rango fuera de él detenía todo el camino)
    if (fin ? n.desde < i : n.desde <= i) return [n.nodo, Math.min(i - n.desde, n.nodo.length)];
  }
  return [nodos[0].nodo, 0];
}

/**
 * La caja de una palabra en la pantalla, en píxeles de la página (escala.ts): con la página escalada, los de pantalla
 * que da el navegador no sirven para dibujar la guía y las nubes, que se ubican con un style.
 */
function cajaDe(nodos: { nodo: Text; desde: number }[], [ini, fin]: [number, number], r = document.createRange()): Caja {
  r.setStart(...enTexto(nodos, ini, false));
  r.setEnd(...enTexto(nodos, fin, true));
  const rs = r.getClientRects();
  const c = rectaEnPagina(rs[rs.length - 1] ?? r.getBoundingClientRect());
  return { x: c.left, y: c.top, ancho: c.width, alto: c.height };
}

/** El origen de lo que se dibuja sobre el bloque (la guía, las nubes y los efectos se ubican respecto de su ancla), en píxeles de la página. */
function base(b: Bloque) {
  const op = b.guia.offsetParent as HTMLElement | null;
  if (!op) return null;
  const r = rectaEnPagina(op.getBoundingClientRect());
  return { x: r.left + op.clientLeft - op.scrollLeft, y: r.top + op.clientTop - op.scrollTop };
}

const visibles = (cajas: Caja[]) => cajas.length > 0 && cajas.some((c) => c.ancho || c.alto);

/** Las cajas de las palabras del bloque respecto de su ancla, medidas una vez (null si no se ve). */
function medir(b: Bloque): Caja[] | null {
  if (b.cajas) return b.cajas;
  const o = base(b);
  const r = document.createRange();
  const cajas = b.palabras.map((p) => cajaDe(b.nodos, p, r));
  if (!o || !visibles(cajas)) return null;
  b.cajas = cajas.map((c) => ({ x: c.x - o.x, y: c.y - o.y, ancho: c.ancho, alto: c.alto }));
  b.renglones = renglonesDe(b.cajas);
  b.pxPalabra = pxPorPalabra(b.cajas, b.renglones);
  return b.cajas;
}

function ponerCara(b: Bloque, cara: Parameters<typeof caraSVG>[0]) {
  if (b.cara === cara) return;
  b.cara = cara;
  b.guia.innerHTML = caraSVG(cara);
}

/** El texto por leer, transparente bajo la niebla: desde la palabra `desde` hasta la última. */
function cubrir(b: Bloque, desde: number) {
  if (b.oculto === desde) return;
  b.oculto = desde;
  b.rangos.forEach((r) => resaltado?.delete(r));
  b.rangos = [];
  const ultima = b.palabras.length - 1;
  if (desde > ultima) return;
  const ini = b.palabras[Math.max(0, desde)][0];
  const fin = b.palabras[ultima][1];
  for (const { nodo, desde: d } of b.nodos) {
    const a = Math.max(ini, d);
    const z = Math.min(fin, d + nodo.data.length);
    if (a >= z) continue;
    const r = document.createRange();
    r.setStart(nodo, a - d);
    r.setEnd(nodo, z - d);
    b.rangos.push(r);
    resaltado?.add(r);
  }
}

/**
 * El director en su lugar de ahora, una nube por renglón por leer y el texto transparente debajo. La nube del renglón
 * por donde camina empieza justo bajo él y se corre con él, pareja: de camino, la palabra que va desvelando ya está ahí,
 * tapada solo por la nube, que la descubre a medida que él avanza.
 */
function fijar(b: Bloque, animar: boolean) {
  const cajas = medir(b);
  if (!cajas) return;
  const antes = b.punto;
  const ultima = b.palabras.length - 1;
  b.punto = Math.max(-1, Math.min(ultima, Math.floor(b.pos + 1e-6)));
  const l = lugarEn(cajas, b.renglones, b.pos, LADO);
  // Arrastrado, y hasta que la niebla llegue a donde se soltó, el director está donde lo dejó la persona
  const f = b.marca === null ? l : lugarEn(cajas, b.renglones, b.marca, LADO);
  b.guia.style.left = `${f.x}px`;
  b.guia.style.top = `${f.y - LADO / 2}px`;
  b.guia.classList.toggle('gl-salta', b.marca === null && !b.veloz && l.saltando);
  const deCamino = !l.saltando && b.pos !== Math.floor(b.pos);
  cubrir(b, b.punto + (deCamino ? 2 : 1));
  const renglon = b.punto < ultima ? b.renglones[b.punto + 1] : -1;
  const vivas = new Set<number>();
  for (const n of nubesDe(cajas, b.renglones, b.punto)) {
    let x = n.x - 3;
    let ancho = n.ancho + 6;
    if (n.renglon === renglon && !l.saltando && l.x + 6 > x) {
      ancho -= l.x + 6 - x;
      x = l.x + 6;
    }
    if (ancho <= 1) continue;
    vivas.add(n.renglon);
    let e = b.nubes.get(n.renglon);
    if (!e) {
      e = document.createElement('span');
      e.className = 'gl-nube';
      e.setAttribute('aria-hidden', 'true');
      // Cada renglón deriva a su ritmo, como capas de nubes
      e.style.setProperty('--gl-desfase', `${(n.renglon * 37) % 100}`);
      b.guia.after(e);
      b.nubes.set(n.renglon, e);
    }
    e.style.left = `${x}px`;
    e.style.top = `${n.y - 1}px`;
    e.style.width = `${ancho}px`;
    e.style.height = `${n.alto + 2}px`;
  }
  // El renglón que se despejó entero se deshace; si el director vuelve atrás, su nube vuelve a nacer
  for (const [r, e] of b.nubes) {
    if (vivas.has(r)) continue;
    b.nubes.delete(r);
    e.classList.add('gl-disipa');
    setTimeout(() => e.remove(), quieto() ? 0 : 450);
  }
  if (b.punto === antes) return;
  b.guia.setAttribute('aria-valuenow', String(b.punto + 1));
  b.guia.classList.toggle('gl-fin', b.punto === ultima);
  if (!animar) {
    if (b.punto === ultima) ponerCara(b, 'tranquilo');
    return;
  }
  if (b.punto > antes && b.punto >= 0) soplar(b, cajas[b.punto]);
  if (b.punto === ultima && antes < ultima) celebrar(b, cajas);
}

/** Un efecto sobre el bloque, en sus coordenadas (las de su ancla). */
function efecto(b: Bloque, clase: string, x: number, y: number, extra = '', texto = '') {
  const e = document.createElement('span');
  e.className = `gl-efecto ${clase}`;
  e.setAttribute('aria-hidden', 'true');
  e.setAttribute('style', `left:${x}px;top:${y}px;${extra}`);
  e.textContent = texto;
  e.addEventListener('animationend', () => e.remove(), { once: true });
  setTimeout(() => e.remove(), 2500);
  b.guia.after(e);
}

/** Cada palabra que se desvela suelta un soplo de nube que se deshace, y de vez en cuando un brillito. */
function soplar(b: Bloque, c: Caja) {
  if (quieto()) return;
  efecto(b, 'gl-soplo', c.x + c.ancho / 2, c.y + c.alto / 2, `--dx:${Math.round(Math.random() * 16 - 8)}px`);
  if (b.punto % 4 === 0) efecto(b, 'gl-chispa', c.x + c.ancho, c.y, '', '✦');
}

/** El bloque despejado entero: el director celebra, un brillo recorre el párrafo, estrellas y corazones, y su sonido. */
function celebrar(b: Bloque, cajas: Caja[]) {
  sonar('niebla');
  ponerCara(b, 'enamorado');
  b.guia.classList.add('gl-celebra');
  setTimeout(() => {
    b.guia.classList.remove('gl-celebra');
    if (b.punto === b.palabras.length - 1 && b.destino === b.pos) ponerCara(b, 'tranquilo');
  }, 1600);
  if (quieto()) return;
  const o = base(b);
  const r = rectaEnPagina(b.el.getBoundingClientRect());
  if (o) efecto(b, 'gl-barrido', r.left - o.x, r.top - o.y, `width:${r.width}px;height:${r.height}px`);
  const c = cajas[b.punto];
  const figuras = ['✦', '♥', '✧', '★', '♥', '✦', '✧', '♥'];
  figuras.forEach((f, i) => {
    const angulo = (i / figuras.length) * 2 * Math.PI;
    efecto(b, `gl-estrella gl-color-${i % 4}`, c.x + c.ancho + 11, c.y + c.alto / 2, `--dx:${Math.round(Math.cos(angulo) * 34)}px;--dy:${Math.round(Math.sin(angulo) * 26)}px`, f);
  });
  efecto(b, 'gl-anillo', c.x + c.ancho + 11, c.y + c.alto / 2);
}

// ───────────────────────────────────────────── el camino, cuadro a cuadro

const moviendo = new Set<Bloque>();
let cuadro = 0;
let anterior = 0;

/** Un cuadro: cada director que camina avanza lo que le toca en el tiempo que pasó. */
function latir(t: number) {
  const dt = anterior ? Math.min(64, t - anterior) : 16;
  anterior = t;
  for (const b of [...moviendo]) {
    // Un bloque que falla sale del camino solo: los demás siguen (antes, el cuadro siguiente nunca se pedía y ningún
    // director volvía a caminar hasta recargar)
    try {
      avanzar(b, dt);
    } catch {
      moviendo.delete(b);
      b.auto = false;
    }
  }
  cuadro = moviendo.size ? requestAnimationFrame(latir) : 0;
  if (!cuadro) anterior = 0;
}

/**
 * Avanza al director hacia su destino, a la velocidad elegida: parejo en píxeles, arrancando y frenando de a poco al
 * caminar; el cambio de renglón lleva su propio segundo. De vuelta (volver a cubrir) va más rápido, porque no hay nada
 * que leer. Al reubicarse (`veloz`), muy rápido y parejo, sin ritmo de lectura.
 */
function avanzar(b: Bloque, dt: number) {
  if (!b.guia.isConnected) return void moviendo.delete(b);
  const cajas = medir(b);
  const dir = Math.sign(b.destino - b.pos);
  if (!cajas || !dir) {
    b.pos = b.destino;
    fijar(b, false);
    moviendo.delete(b);
    return llegar(b);
  }
  if (b.veloz) {
    const paso = (b.veloz * dt) / 1000;
    b.pos = dir > 0 ? Math.min(b.destino, b.pos + paso) : Math.max(b.destino, b.pos - paso);
    fijar(b, true);
    if (b.pos === b.destino) {
      moviendo.delete(b);
      llegar(b);
    }
    return;
  }
  const enR = (k: number) => b.renglones[Math.max(0, Math.min(b.renglones.length - 1, Math.round(k)))];
  const px = dir > 0 ? pxPorSegundo(velocidadAuto(), b.pxPalabra) : PX_ATRAS * (1 + 0.5 * Math.abs(enR(b.destino) - enR(b.pos)));
  const rapidez = ritmo(cajas, b.renglones, b.pos, dir, px, dir > 0 ? MS_CAMBIO : MS_CAMBIO_ATRAS, LADO);
  const { cambio } = tramoDe(b.renglones, b.pos, dir);
  const falta = Math.abs(b.destino - b.pos);
  b.marcha += (Math.min(1, 0.3 + falta / 0.5) - b.marcha) * Math.min(1, dt / 160);
  const paso = (rapidez * (cambio ? 1 : Math.max(0.1, b.marcha)) * dt) / 1000;
  // Un paso no cruza el borde de su tramo, donde cambia el ritmo: el cuadro siguiente sigue con el del otro
  const hasta = dir > 0 ? Math.min(b.destino, borde(b.renglones, b.pos, dir)) : Math.max(b.destino, borde(b.renglones, b.pos, dir));
  b.pos = dir > 0 ? Math.min(hasta, b.pos + paso) : Math.max(hasta, b.pos - paso);
  if (Math.abs(b.destino - b.pos) < EPS) b.pos = b.destino;
  fijar(b, true);
  if (b.pos === b.destino) {
    moviendo.delete(b);
    llegar(b);
  }
}

/**
 * Llegó: se queda quieto y guarda hasta dónde va. Con el avance solo, el bloque terminado detiene el avance (nota de voz
 * del titular: «que no salte automáticamente a reproducir la viñeta siguiente»): para seguir con el siguiente, ▶ otra vez.
 */
function llegar(b: Bloque) {
  b.marcha = 0;
  b.veloz = 0;
  // Mientras la persona lo tiene tomado, sigue donde ella lo lleve
  if (!b.guia.classList.contains('gl-arrastrando')) b.marca = null;
  b.guia.classList.remove('gl-anda', 'gl-salta');
  const fin = b.punto === b.palabras.length - 1;
  if (!fin) ponerCara(b, 'feliz');
  else if (b.cara !== 'enamorado') ponerCara(b, 'tranquilo');
  guardar(b);
  // Mientras la voz lee este bloque, el director espera la palabra siguiente: el bloque termina cuando la voz calla (hablar)
  if (voz?.b === b) return;
  if (!b.auto) return void mostrarActual();
  b.auto = false;
  if (!reproduciendo) return void mostrarActual();
  if (fin) reproducir(false);
  else setTimeout(seguirLeyendo, 0);
}

/** Lo lleva hasta `destino`. La cámara lo sigue, salvo arrastrado y al soltarlo (`conCamara`, falso). */
function irA(b: Bloque, destino: number, conCamara = true) {
  b.destino = Math.max(-1, Math.min(destino, b.palabras.length - 1));
  if (b.destino === b.pos) return void (b.veloz = 0);
  b.guia.classList.add('gl-anda');
  // El que camina es el que se ve
  b.guia.classList.remove('gl-otro');
  if (b.cara !== 'enamorado') ponerCara(b, 'riendo');
  moviendo.add(b);
  if (!cuadro) cuadro = requestAnimationFrame(latir);
  if (conCamara) seguir(b);
}

/** Se reubica muy rápido hasta `destino` (al soltarlo, o con la rueda en el avance solo). */
function reubicar(b: Bloque, destino: number, conCamara: boolean) {
  b.veloz = rapidezReubicar(b.pos, destino);
  irA(b, destino, conCamara);
}

function guardar(b: Bloque) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(conPunto(leerPuntos(localStorage.getItem(CLAVE)), b.huella, b.punto, Date.now())));
  } catch {
    // Sin almacenamiento, la niebla sirve igual; solo no recuerda
  }
}

function guardado(huella: string): number {
  try {
    return leerPuntos(localStorage.getItem(CLAVE))[huella]?.[0] ?? -1;
  } catch {
    return -1;
  }
}

// ───────────────────────────────────────────── el avance solo (nota de voz del titular, 24 de octubre de 2026)

let reproduciendo = false;
/** El último bloque que se leyó (a mano o solo): ▶ sigue desde ahí. */
let ultimo: Bloque | null = null;
/**
 * Su huella: si el Studio vuelve a dibujar la ventana, el bloque nuevo con la misma huella sigue siendo el último. Sin
 * ella, ▶ empezaba por el primer bloque sin terminar de la ventana y la llevaba hasta arriba, estuviera donde estuviera
 * la persona (nota de voz del titular nmvmyusuotit, 24 de octubre de 2026).
 */
let huellaUltima = '';
/** Un bloque que caminaba solo y que el Studio quitó al volver a dibujar: el avance sigue en el bloque nuevo. */
let sinTerminarAlRepintar = false;

function marcarUltimo(b: Bloque) {
  ultimo = b;
  huellaUltima = b.huella;
}

/** El último que se leyó, en esta lista: el mismo bloque o, si el Studio lo volvió a dibujar, el que tiene su huella. */
function ultimoEn(lista: Bloque[]): Bloque | undefined {
  if (ultimo && lista.includes(ultimo)) return ultimo;
  const b = huellaUltima ? lista.find((x) => x.huella === huellaUltima) : undefined;
  if (b) ultimo = b;
  return b;
}

/** ¿Hay un director caminando solo? Si no, ▶ enciende el avance aunque haya quedado marcado como encendido. */
const enMarcha = () => [...bloques.values()].some((b) => b.auto);

/**
 * Por dónde empieza ▶ sin un último bloque leído al que volver: donde está la persona, no al principio de la ventana. El
 * primer bloque sin terminar que se ve; si ninguno se ve, el primero sin terminar que viene después de lo que se ve; si
 * tampoco, el primero sin terminar. Cada bloque, con su borde de arriba y de abajo en la pantalla; la vista, con los
 * suyos. -1 si no queda nada por leer.
 */
export function bloqueParaEmpezar(lista: { arriba: number; abajo: number; sinTerminar: boolean }[], vista: { arriba: number; abajo: number }): number {
  const seVe = lista.findIndex((b) => b.sinTerminar && b.abajo > vista.arriba && b.arriba < vista.abajo);
  if (seVe >= 0) return seVe;
  const despues = lista.findIndex((b) => b.sinTerminar && b.arriba >= vista.abajo);
  return despues >= 0 ? despues : lista.findIndex((b) => b.sinTerminar);
}

/** Lo que se ve de la ventana de lectura en la pantalla: lo que se desplaza con el texto, dentro de la ventana del navegador. */
function vistaDe(lista: Bloque[]) {
  const c = lista.length ? (contenedorDe(lista[0].el) ?? lista[0].el.closest<HTMLElement>(VENTANAS)) : null;
  const r = c?.getBoundingClientRect();
  return { arriba: Math.max(0, r?.top ?? 0), abajo: Math.min(innerHeight, r?.bottom ?? innerHeight) };
}

const PLAY = '<svg class="icono" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>';
const PAUSA = '<svg class="icono" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6.5" y="5.5" width="4" height="13" rx="1"/><rect x="13.5" y="5.5" width="4" height="13" rx="1"/></svg>';
const tituloAuto = () => (reproduciendo ? 'Detener el avance solo (también con el botón central del ratón, o al tomar al director). Mientras avanza, la rueda del ratón lo adelanta o lo regresa' : 'Avance solo: el director recorre este bloque a la velocidad que elijas y se detiene al terminarlo; ▶ otra vez (o el botón central del ratón) sigue con el siguiente. En un documento, cuando ya no queda nada por destapar, el botón central marca «Entendido». Mientras avanza, la rueda del ratón lo adelanta o lo regresa');

/** La nube del atajo de la niebla (la misma de index.html, junto a la cara del director). */
const NUBE = '<svg class="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17.5h10.5a3.5 3.5 0 0 0 .4-7A5 5 0 0 0 8.3 9 4.3 4.3 0 0 0 7 17.5z"/><path d="M4 20.5h9M16 20.5h4"/></svg>';

/**
 * Los controles de la niebla, arriba de la ventana de lectura: la nube que la enciende o la apaga (nota de voz del
 * titular nmvmyoo09tit, 24 de octubre de 2026: el ▶ estaba arriba y la nube solo junto a la cara) y, a su lado, el avance
 * solo: ▶ o ⏸ y la velocidad, que vale también al arrastrar. La nube solo se ve en la ventana de lectura, y el avance
 * solo, con la niebla puesta (guiaLectura.css › .gl-niebla y .gl-auto). director.ts › aplicarEnfoque la pone al día.
 * Todo junto, con el botón de la voz (la persona que habla) al final, en «¿Dónde quedamos?». En la franja del enfoque van
 * en grupos aparte (controlesEnfoque.ts; pd_controles_enfoque): `niebla` es la nube con su ▶ y su velocidad, y `voz`, solo el botón de la voz, que
 * como el avance solo se ve únicamente con la niebla puesta.
 */
export function controlAuto(parte: 'todo' | 'niebla' | 'voz' = 'todo'): string {
  const v = velocidadAuto();
  const puesta = nieblaPuesta();
  const etiqueta = puesta ? 'Quitar la niebla de lectura' : 'Niebla de lectura';
  const nube = `<button type="button" class="boton-suave gl-niebla${puesta ? ' activo' : ''}" data-niebla aria-pressed="${puesta}" aria-label="${etiqueta}" title="Niebla de lectura, para encenderla o apagarla: el texto del director queda bajo niebla y lo vas desvelando con él">${NUBE}</button>`;
  const avance = `<button type="button" class="boton-suave gl-auto-play" data-niebla-auto aria-pressed="${reproduciendo}" title="${tituloAuto()}" aria-label="${reproduciendo ? 'Detener el avance solo' : 'Avance solo'}">${reproduciendo ? PAUSA : PLAY}</button><select data-niebla-vel aria-label="Velocidad del director" title="La velocidad del director, solo o arrastrado: 1× son ${PPM_BASE} palabras por minuto">${VELOCIDADES.map((n) => `<option value="${n}"${n === v ? ' selected' : ''} title="${palabrasPorMinuto(n)} palabras por minuto">${n}×</option>`).join('')}</select>`;
  if (parte === 'voz') return `<span class="gl-control"><span class="gl-auto" role="group" aria-label="Lectura en voz alta de la niebla de lectura">${botonVoz()}</span></span>`;
  return `<span class="gl-control">${nube}<span class="gl-auto" role="group" aria-label="Avance solo de la niebla de lectura">${avance}${parte === 'todo' ? botonVoz() : ''}</span></span>`;
}

function pintarControles() {
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-niebla-auto]')) {
    b.setAttribute('aria-pressed', String(reproduciendo));
    b.setAttribute('aria-label', reproduciendo ? 'Detener el avance solo' : 'Avance solo');
    b.title = tituloAuto();
    b.innerHTML = reproduciendo ? PAUSA : PLAY;
  }
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-niebla-voz]')) b.outerHTML = botonVoz();
}

/** Enciende o detiene el avance solo. Al detenerlo, el director termina la palabra que pisa y se queda ahí, y la voz calla. */
function reproducir(si: boolean): void {
  if (!si) callar();
  reproduciendo = si && activa();
  pintarControles();
  vigilarRaton();
  if (reproduciendo) return seguirLeyendo();
  for (const b of bloques.values()) {
    if (!b.auto) continue;
    b.auto = false;
    irA(b, Math.ceil(b.pos));
  }
  mostrarActual();
}

// ───────────────────────────────────── el ratón, fuera del texto (nota de voz del titular nmvn13enetit, 24 de octubre de 2026)
// Con el avance solo se lee sin tocar el ratón, y el texto pasa por debajo de un puntero quieto: el navegador abría el
// texto de ayuda de lo que quedaba debajo (el de una línea de «¿Dónde quedamos?», el del director mismo) y tapaba el
// renglón que se leía. Así que, con el avance solo encendido, a los dos segundos de quieto el puntero se esconde con sus
// textos de ayuda, en todo el Studio, hasta que el ratón se vuelva a mover (o a oprimir) o el avance se detenga.

/** Cuánto tiene que quedarse quieto el ratón, con el avance solo, para esconderse con sus textos de ayuda. */
export const RATON_QUIETO_MS = 2000;
/** La clase de la página mientras el puntero está escondido (guiaLectura.css). */
const SIN_RATON = 'gl-sin-raton';

/** ¿Se movió de verdad? Cuando el texto se desplaza debajo, el navegador repite el evento en el mismo lugar. */
export const seMovio = (antes: { x: number; y: number } | null, ahora: { x: number; y: number }) =>
  !antes || antes.x !== ahora.x || antes.y !== ahora.y;

let relojRaton = 0;
let ratonEn: { x: number; y: number } | null = null;
let sinRaton = false;
/** Mientras el puntero está escondido, lo que el Studio dibuja (o vuelve a titular) también va sin texto de ayuda. */
let vigiaAyudas: MutationObserver | null = null;

/** Guarda aparte el texto de ayuda (`title`) de `el` y de lo que tiene dentro: así el navegador no lo abre. */
function guardarAyudas(el: Element) {
  for (const x of [el, ...el.querySelectorAll('[title]')]) {
    const t = x.getAttribute('title');
    if (t === null) continue;
    x.setAttribute('data-gl-titulo', t);
    x.removeAttribute('title');
  }
}

function esconderRaton() {
  if (sinRaton || !reproduciendo || !activa()) return;
  sinRaton = true;
  document.body.classList.add(SIN_RATON);
  guardarAyudas(document.body);
  vigiaAyudas ??= new MutationObserver((cambios) => {
    for (const c of cambios) {
      if (c.type === 'attributes' && c.target instanceof Element) guardarAyudas(c.target);
      else c.addedNodes.forEach((n) => n instanceof Element && guardarAyudas(n));
    }
  });
  vigiaAyudas.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['title'] });
}

function mostrarRaton() {
  clearTimeout(relojRaton);
  if (!sinRaton) return;
  sinRaton = false;
  vigiaAyudas?.disconnect();
  document.body.classList.remove(SIN_RATON);
  for (const x of document.querySelectorAll('[data-gl-titulo]')) {
    if (!x.hasAttribute('title')) x.setAttribute('title', x.getAttribute('data-gl-titulo')!);
    x.removeAttribute('data-gl-titulo');
  }
}

/** Con el avance solo, el reloj del ratón quieto vuelve a empezar; sin él, el puntero vuelve con sus textos de ayuda. */
function vigilarRaton() {
  clearTimeout(relojRaton);
  if (!reproduciendo) return mostrarRaton();
  relojRaton = window.setTimeout(esconderRaton, RATON_QUIETO_MS);
}

/** El ratón se movió o se oprimió: el puntero vuelve y, si sigue el avance solo, se esconde otra vez a los dos segundos. */
function conRaton(e: PointerEvent) {
  if (e.pointerType === 'touch') return;
  const ahora = { x: e.clientX, y: e.clientY };
  if (e.type === 'pointermove' && !seMovio(ratonEn, ahora)) return;
  ratonEn = ahora;
  if (!sinRaton && !reproduciendo) return;
  mostrarRaton();
  vigilarRaton();
}

/**
 * Hasta qué palabra se leyó un bloque quieto, según dónde está su director. Si el Studio lo dibujó cuando no se podía
 * medir (oculto, a medio acomodarse), `punto` quedaba en -1 con el director ya al final: ▶ lo tomaba por sin terminar,
 * no tenía a dónde caminar y el avance se quedaba encendido sin moverse hasta arrastrar a un director (notas de voz del
 * titular nmvn1bxiptit y nmvn1cztxtit, 24 de octubre de 2026).
 */
export const puntoDe = (pos: number, ultima: number) => Math.max(-1, Math.min(ultima, Math.floor(pos + EPS)));

/** Los bloques con niebla de una ventana, en su orden, ya medidos y con su punto al día. */
const bloquesDe = (caja: HTMLElement) =>
  [...caja.querySelectorAll<HTMLElement>('.gl-bloque')]
    .map((el) => bloques.get(el))
    .filter((b): b is Bloque => !!b && seMuestra(b.el) && !!medir(b))
    .map((b) => {
      if (!moviendo.has(b) && b.punto !== puntoDe(b.pos, b.palabras.length - 1)) fijar(b, false);
      return b;
    });
const sinTerminar = (b: Bloque) => b.punto < b.palabras.length - 1;

/**
 * El bloque por leer donde está la mirada, en la ventana de lectura (nota de voz del titular nmvn1pcastit: «siempre que
 * se dé play o pause debe ser un escaneo del viewport o del modal o de la ventana que esté activa para determinar cuál es
 * el siguiente párrafo a destapar o que esté parcialmente destapado»). El último que se leyó, si se ve: él mismo si le
 * falta, o el siguiente sin terminar si ya se terminó (la cámara lleva hasta él). Si no se ve, el primero sin terminar que
 * se ve (bloqueParaEmpezar): nunca uno de otra parte de la ventana porque se leyó antes. Y siempre de arriba hacia abajo
 * (nota de voz del titular nmvoj0kmetit, 25 de octubre de 2026: «no es lógico que se destape un renglón o un texto con
 * niebla siempre y cuando antes de este exista otro texto con niebla sin destapar»): un bloque sin terminar que se ve más
 * arriba va antes que el último que se leyó y que el que lo sigue.
 */
export function paraLeer(lista: { arriba: number; abajo: number; sinTerminar: boolean }[], vista: { arriba: number; abajo: number }, ultimo: number): number {
  const seVe = (i: number) => lista[i].abajo > vista.arriba && lista[i].arriba < vista.abajo;
  if (ultimo >= 0 && seVe(ultimo)) {
    const arriba = lista.findIndex((b, i) => b.sinTerminar && seVe(i));
    if (arriba >= 0 && arriba < ultimo) return arriba;
    if (lista[ultimo].sinTerminar) return ultimo;
    const sig = lista.findIndex((b, k) => k > ultimo && b.sinTerminar);
    if (sig >= 0) return sig;
  }
  return bloqueParaEmpezar(lista, vista);
}

/** Cada bloque de la lista, con sus bordes en la pantalla, y lo que se ve de la ventana. */
function medidas(lista: Bloque[]) {
  return {
    cajas: lista.map((x) => {
      const r = x.el.getBoundingClientRect();
      return { arriba: r.top, abajo: r.bottom, sinTerminar: sinTerminar(x) };
    }),
    vista: vistaDe(lista),
  };
}

function bloqueParaLeer(lista: Bloque[]): Bloque | undefined {
  const { cajas, vista } = medidas(lista);
  const u = ultimoEn(lista);
  return lista[paraLeer(cajas, vista, u ? lista.indexOf(u) : -1)];
}

/**
 * Con el avance solo: el bloque por leer donde está la mirada (bloqueParaLeer). La cámara lleva hasta él con su
 * desplazamiento suave (nota de voz del titular nmvmyusuotit).
 */
function seguirLeyendo(): void {
  if (!reproduciendo) return;
  const caja = activa() ? ventanaActiva() : null;
  if (!caja) return reproducir(false);
  const b = bloqueParaLeer(bloquesDe(caja));
  if (!b || !sinTerminar(b)) return reproducir(false);
  marcarUltimo(b);
  b.auto = true;
  // Con la voz, el director camina con cada palabra que se dice (hablar); sin ella, o sin una voz de Kokoro, a su ritmo
  if (!(vozPuesta() && hablar(b))) irA(b, b.palabras.length - 1);
  mostrarActual();
}

// ───────────────────────────────────────────── leer en voz alta (nota de voz del titular nmvoi1e0etit, 25 de octubre de 2026)
// Una opción de la niebla, y nada más (nmvokue4itit): con la niebla puesta y ▶, una voz lee el bloque de ahora mientras el
// director de la niebla camina con cada palabra que se dice. Solo con las voces de Kokoro, locales y sin internet
// (decisión del titular, 26 de octubre de 2026, nota de voz nmvpdu9zqtit: las del navegador, que son las del sistema, y
// las demás se descartaron): nada sale del computador ni se paga. Sin ninguna instalada no lee, y lo dice con cómo
// instalarlas (sinVozPorque): nunca cae a otra voz en silencio. Lee donde lee la niebla: los textos del director, nunca
// los del Studio ni tus notas.

/** Si la voz está encendida en este navegador (apagada hasta que la persona la encienda). */
const CLAVE_VOZ = 'estudio.nieblaLectura.voz';
export const vozPuesta = () => {
  try {
    return localStorage.getItem(CLAVE_VOZ) === '1';
  } catch {
    return false;
  }
};
function ponerVoz(si: boolean) {
  try {
    localStorage.setItem(CLAVE_VOZ, si ? '1' : '0');
  } catch {
    // Sin almacenamiento, vale para esta visita
  }
}

/** La rapidez de la voz para cada velocidad del director (1× es lenta pero natural; 5×, rápida y aún clara). */
export const ritmoDeVoz = (velocidad: number) => [0.8, 1, 1.2, 1.45, 1.7][Math.max(1, Math.min(5, Math.round(velocidad))) - 1];
/** Lo rápido que el director alcanza la palabra que se dice (palabras por segundo): siempre un poco por delante de la voz. */
const ALCANCE_VOZ = 9;

/**
 * La voz de Kokoro que la persona eligió en «Sonidos», en este navegador (pd_voz_alta), una por idioma (nota de voz del
 * titular nmvoqbqs9tit, 25 de octubre de 2026: una de español y una de inglés). Sin elegir: la de por defecto del idioma
 * (vozNaturalDe). La clave de antes (una sola voz para todo) se sigue leyendo como la elección de cada idioma que no tenga
 * la suya; y lo guardado que no es una voz de Kokoro (el id de una voz del navegador, de antes) cuenta como sin elegir.
 */
export const CLAVE_VOZ_ELEGIDA = 'estudio.nieblaLectura.vozElegida';
export const claveVozDe = (idioma: string) => `${CLAVE_VOZ_ELEGIDA}.${idioma}`;
export const vozElegida = (idioma: string = idiomaDeLectura()): string | null => {
  try {
    const propia = localStorage.getItem(claveVozDe(idioma));
    // Vacía = la persona pidió «Automática» para este idioma: la clave de antes ya no cuenta
    const guardada = propia !== null ? propia : localStorage.getItem(CLAVE_VOZ_ELEGIDA);
    return esVozNatural(guardada) ? guardada : null;
  } catch {
    return null;
  }
};
export function elegirVoz(id: string | null, idioma: string = idiomaDeLectura()) {
  try {
    localStorage.setItem(claveVozDe(idioma), id ?? '');
  } catch {
    // Sin almacenamiento, lee la de por defecto
  }
}

/**
 * Que la persona lo vea, no solo al pasar el ratón: lo muestra el Studio (director.ts escucha «estudio:aviso»). Con
 * `accion`, el aviso trae su botón y se queda hasta que la persona lo use o lo cierre.
 */
const avisar = (texto: string, bien = false, accion?: { etiqueta: string; hacer: () => void }) =>
  window.dispatchEvent(new CustomEvent('estudio:aviso', { detail: { texto, bien, accion } }));

const idiomaDeLectura = () => (document.documentElement.lang || 'es').slice(0, 2);

// ───────────────────────────────────────────── las voces de Kokoro (locales; src/director/voz.ts)
// Las instala la persona aparte (tools/entorno/instalar_voces.sh); el servidor del Studio las corre (tools/director/voz.py)
// y devuelve un WAV. Son las únicas: sin ninguna instalada para el idioma, no se lee y se dice cómo instalarlas.

/** Las voces de Kokoro instaladas: undefined mientras no se ha preguntado; [] si no hay o el servidor no las dio. */
let naturales: VozNatural[] | undefined;
/** Por qué no hay ninguna (lo que dijo el servidor, con cómo instalarlas), mientras la lista esté vacía. */
let motivoNaturales: string | undefined;
let preguntando: Promise<VozNatural[]> | null = null;
let preguntadoEn = 0;
/** Pregunta al servidor qué voces de Kokoro hay (cada minuto a lo más; `fresco` vuelve a preguntar). Nunca falla: sin respuesta, no hay, y dice por qué. */
export function vocesNaturales(fresco = false): Promise<VozNatural[]> {
  if (!preguntando || fresco || Date.now() - preguntadoEn > 60_000) {
    preguntadoEn = Date.now();
    preguntando = (typeof fetch === 'function' ? fetch(`/__estudio/voz/lista${fresco ? '?fresco' : ''}`) : Promise.reject(new Error('sin red')))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`el Studio respondió ${r.status}`))))
      .then((d) => {
        motivoNaturales = typeof d?.motivo === 'string' && d.motivo ? d.motivo : undefined;
        // Solo voces de Kokoro: el servidor ya descarta las demás, y aquí tampoco entra otro id
        return (naturales = Array.isArray(d?.voces) ? (d.voces as VozNatural[]).filter((v) => esVozNatural(v?.id)) : []);
      })
      .catch(() => {
        motivoNaturales = 'No pude preguntarle al Studio qué voces de Kokoro hay.';
        return (naturales = []);
      });
  }
  return preguntando;
}
/** La voz de Kokoro que lee ahora (la elegida para este idioma o la de por defecto), o null si no hay ninguna para él. */
function naturalActual(id: string | null = vozElegida()): VozNatural | null {
  return vozNaturalDe(idiomaDeLectura(), id, naturales ?? null);
}
/**
 * Lo que se le dice a la persona cuando no hay voz de Kokoro para este idioma, con cómo instalarla: lo muestran el aviso
 * al encender la voz o al oprimir ▶ y «Sonidos». Sin motivo del servidor, cae a la orden de instalar de siempre.
 */
export const sinVozAhora = (conBoton = false) =>
  sinVozPorque(idiomaDeLectura(), naturales ?? [], motivoNaturales ?? `Las voces de Kokoro no están instaladas en este computador. ${comoInstalarKokoro(/Windows/i.test(navigator.userAgent))}`, conBoton);

/**
 * El audio de este texto con esta voz, pedido al servidor; los últimos se guardan por si se piden de nuevo. Se
 * pide siempre el bloque entero, así que regresar o adelantar dentro de él, o volver a uno ya oído, no lo vuelve a pedir
 * (nota de voz del titular nmvot5hg8tit, 26 de octubre de 2026: «cuando adelanto o retrocedo, se detiene un rato»).
 */
const audios = new Map<string, Promise<Blob>>();
const AUDIOS_GUARDADOS = 12;
const ESPERA_AUDIO_MS = 3 * 60_000;
function audioDe(voz: string, texto: string): Promise<Blob> {
  const clave = `${voz}\n${texto}`;
  const hecho = audios.get(clave);
  if (hecho) return hecho;
  const pedido = (async () => {
    const r = await fetch('/__estudio/voz/hablar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ voz, texto }), signal: AbortSignal.timeout(ESPERA_AUDIO_MS) });
    if (!r.ok) throw new Error(((await r.json().catch(() => null)) as { error?: string } | null)?.error || `el servidor respondió ${r.status}`);
    return r.blob();
  })();
  pedido.catch(() => audios.delete(clave));
  audios.set(clave, pedido);
  while (audios.size > AUDIOS_GUARDADOS) audios.delete(audios.keys().next().value!);
  return pedido;
}

/**
 * Con la voz encendida, su modelo se carga de una vez con un texto corto que no suena, para que el primer ▶
 * tampoco espere (decisión del titular del 26 de octubre de 2026, misión «Decide si la voz se prepara al encenderla»:
 * «Que se prepare al encenderla»). Pasa al encenderla y al abrir el Studio con ella encendida; el proceso de la voz la
 * suelta a los diez minutos sin usarla (estudio/servidor/voz.ts › INACTIVO_MS).
 */
const TEXTO_PREPARAR = 'Listo.';
function prepararVoz(natural: VozNatural) {
  void audioDe(natural.id, TEXTO_PREPARAR).catch(() => {});
}

/**
 * Mientras se oye un bloque, el audio del siguiente por leer de la misma ventana se va pidiendo: al llegar a él ya está
 * y suena sin pausa (nota de voz del titular nmvot5hg8tit, 26 de octubre de 2026: «la pausa entre bloques es molesta»).
 * Solo uno por delante, para no hacer esperar al de ahora si la persona salta a otro lado.
 */
function prepararSiguiente(b: Bloque, natural: VozNatural) {
  const caja = b.el.closest<HTMLElement>(VENTANAS);
  if (!caja) return;
  const lista = bloquesDe(caja);
  const siguiente = lista.slice(lista.indexOf(b) + 1).find(sinTerminar);
  if (siguiente) void audioDe(natural.id, textoDe(siguiente.miembros).texto).catch(() => {});
}

/** El bloque cuyo audio se está preparando (el altavoz late y su director lo dice en su globito), o null. */
let preparandoEn: Bloque | null = null;
function preparando(b: Bloque | null) {
  if (preparandoEn === b) return;
  if (preparandoEn) quitarGlobo(preparandoEn);
  preparandoEn = b;
  if (b) globo(b, 'Preparando la voz…', 0);
  pintarControles();
}

/**
 * Enciende la voz si hay una de Kokoro para leer en el idioma del texto; si no, la deja apagada y lo dice (nota de voz
 * del titular nmvonrzz6tit, 25 de octubre de 2026: guiar a la persona hasta que lo logre, «no solamente advertirle que no
 * se pudo hacer»): que Kokoro no está instalado en este computador, cómo instalarlo y «Comprobar de nuevo», que vuelve
 * a mirar sin recargar (`fresco`: no se fía de lo que se miró hace un momento).
 */
async function comprobarVoz(fresco = false): Promise<void> {
  await vocesNaturales(fresco);
  const natural = naturalActual();
  if (natural) {
    ponerVoz(true);
    prepararVoz(natural);
    pintarControles();
    avisar(`Voz encendida: lee «${natural.nombre}», una voz de Kokoro de este computador. Con ▶, lee el bloque de ahora.`, true);
    return;
  }
  ponerVoz(false);
  pintarControles();
  avisar(sinVozAhora(true), false, { etiqueta: 'Comprobar de nuevo', hacer: () => void comprobarVoz(true) });
}

/** Lo que dice la voz ahora, y de qué bloque: el director espera cada palabra (llegar) hasta que la voz termina. */
let voz: { b: Bloque; audio: HTMLAudioElement; empezo: boolean } | null = null;
/** La muestra de «Sonidos», mientras suena o se pide. */
let muestra: HTMLAudioElement | null = null;

/** La voz calla; el director se queda donde iba (lo que sigue lo decide quien la calló). */
function callar() {
  if (muestra) {
    muestra.pause();
    muestra = null;
  }
  preparando(null);
  if (!voz) return;
  const era = voz;
  voz = null;
  era.audio.pause();
  era.audio.removeAttribute('src');
}

const MUESTRA_VOZ: Record<string, string> = {
  es: 'Así leo los documentos del director y sus respuestas, a la velocidad que elijas.',
  en: "This is how I read the director's documents and replies, at the speed you choose.",
};

/** Las voces de Kokoro instaladas que leen en el idioma del texto, para elegirlas en «Sonidos» (vacía si no hay ninguna). */
export async function vocesNaturalesDeLectura(): Promise<VozNatural[]> {
  return (await vocesNaturales()).filter((v) => v.idioma === idiomaDeLectura());
}

/** «Oír» con una voz de Kokoro: pide la frase al servidor y la reproduce a la velocidad del director; si falla, lo dice. */
async function oirNatural(natural: VozNatural) {
  callar();
  const mia = new Audio();
  muestra = mia;
  try {
    const sonido = await audioDe(natural.id, MUESTRA_VOZ[idiomaDeLectura()] ?? MUESTRA_VOZ.es);
    if (muestra !== mia) return;
    mia.src = URL.createObjectURL(sonido);
    mia.playbackRate = ritmoDeVoz(velocidadAuto());
    mia.onended = () => URL.revokeObjectURL(mia.src);
    await mia.play();
  } catch (e) {
    if (muestra === mia) muestra = null;
    avisar(`No pude oír la voz «${natural.nombre}»: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** «Oír» en «Sonidos»: la voz dice una frase de muestra, a la velocidad del director. Calla lo que se estaba leyendo. */
export function oirVoz(id: string | null) {
  const natural = naturalActual(id);
  if (natural) void oirNatural(natural);
  // Sin voz de Kokoro para este idioma, se dice por qué y cómo instalarla (nunca otra voz, ni silencio)
  else avisar(sinVozAhora());
}

/** La primera palabra del bloque que aún no alcanzó el director: desde ella se lee. */
const palabraPorLeer = (b: Bloque) => Math.max(0, Math.floor(b.pos + EPS) + 1);

/**
 * Lee en voz alta el bloque desde la palabra que sigue a la del director, al ritmo de la velocidad elegida (hablarNatural).
 * Falso si no puede hablar: entonces el director camina sin voz, a su ritmo. Si es porque no hay una voz de Kokoro para el
 * idioma del texto, nunca en silencio: se dice por qué y cómo instalarla, una vez por cada ▶.
 */
function hablar(b: Bloque): boolean {
  const natural = naturalActual();
  if (natural) return hablarNatural(b, natural);
  if (palabraPorLeer(b) <= b.palabras.length - 1) avisar(sinVozAhora(true), false, { etiqueta: 'Comprobar de nuevo', hacer: () => void comprobarVoz(true) });
  return false;
}

/**
 * Lee el bloque con una voz de Kokoro, desde la palabra que sigue a la del director: pide el WAV al servidor, lo
 * reproduce a la velocidad elegida y el director camina con sus palabras repartidas sobre la duración real del audio (la
 * voz no avisa de cada palabra: momentosDePalabras). Callar, ▶ y grabar la detienen (callar). Si el servidor o el audio
 * fallan, se apaga la voz y se dice, nunca en silencio.
 *
 * El audio es siempre el del bloque entero, y empieza en el momento de la palabra que sigue: regresar o adelantar dentro
 * del bloque no lo vuelve a pedir. Mientras llega, el altavoz late y el director dice «Preparando la voz…» en su globito
 * (nota de voz del titular nmvot3vw4tit, 26 de octubre de 2026: «aparece el botón como si ya estuviera reproduciendo,
 * pero no se inicia»); y en cuanto suena, se va pidiendo el del bloque siguiente (prepararSiguiente).
 */
function hablarNatural(b: Bloque, natural: VozNatural): boolean {
  const inicio = palabraPorLeer(b);
  const ultima = b.palabras.length - 1;
  if (inicio > ultima) return false;
  callar();
  const audio = new Audio();
  const actual = { b, audio, empezo: false };
  voz = actual;
  let cuadro = 0;
  // Si ya está (el bloque siguiente, pedido mientras sonaba el anterior), suena sin aviso; si tarda, se dice
  const aviso = setTimeout(() => voz === actual && !actual.empezo && preparando(b), 200);
  const fallar = (texto: string) => {
    if (voz !== actual) return;
    voz = null;
    clearTimeout(aviso);
    preparando(null);
    cancelAnimationFrame(cuadro);
    audio.pause();
    ponerVoz(false);
    pintarControles();
    avisar(texto);
    b.veloz = 0;
    if (b.pos >= ultima - EPS && !moviendo.has(b)) return llegar(b);
    irA(b, ultima);
  };
  const terminar = () => {
    if (voz !== actual) return;
    voz = null;
    cancelAnimationFrame(cuadro);
    b.veloz = ALCANCE_VOZ;
    if (b.pos >= ultima - EPS && !moviendo.has(b)) return llegar(b);
    irA(b, ultima);
  };
  let momentos: number[] = [];
  const seguir = () => {
    if (voz !== actual) return;
    const i = palabraAlMomento(momentos, audio.currentTime);
    if (i >= inicio && i > b.destino) {
      b.veloz = ALCANCE_VOZ;
      irA(b, i);
    }
    cuadro = requestAnimationFrame(seguir);
  };
  audio.onended = terminar;
  audio.onerror = () => fallar(errorDeVozNatural('el navegador no pudo reproducir el audio'));
  audioDe(natural.id, textoDe(b.miembros).texto)
    .then(async (sonido) => {
      if (voz !== actual) return;
      const url = URL.createObjectURL(sonido);
      audio.addEventListener('ended', () => URL.revokeObjectURL(url), { once: true });
      audio.src = url;
      audio.playbackRate = ritmoDeVoz(velocidadAuto());
      if (!Number.isFinite(audio.duration)) await new Promise((ok) => audio.addEventListener('loadedmetadata', ok, { once: true }));
      if (voz !== actual) return;
      momentos = momentosDePalabras(b.palabras, b.palabras[0][0], audio.duration);
      audio.currentTime = momentos[inicio] ?? 0;
      await audio.play();
      if (voz !== actual) return;
      actual.empezo = true;
      clearTimeout(aviso);
      preparando(null);
      seguir();
      prepararSiguiente(b, natural);
    })
    .catch((e) => fallar(errorDeVozNatural(e instanceof Error ? e.message : String(e))));
  return true;
}

/**
 * El ícono de la narración por voz: una persona que habla, no un altavoz (nota de voz del titular nmvpi5ydttit, 26 de
 * octubre de 2026: se confundía con el botón de los sonidos, que sí es un altavoz).
 */
const NARRADOR = icono('narrador');
const tituloVoz = () =>
  vozPuesta() ? 'Apagar la voz: el director vuelve a caminar a su ritmo'
  : naturales && !naturalActual() ? 'Leer en voz alta: las voces de Kokoro no están instaladas en este computador (al oprimir, te digo cómo instalarlas)'
  : 'Leer en voz alta: con ▶, una voz de Kokoro de este computador lee el bloque y el director camina con cada palabra, a la velocidad que elijas';
/** El botón de la voz, entre los controles de la niebla (controlAuto). */
const botonVoz = () => `<button type="button" class="boton-suave gl-auto-play gl-voz${preparandoEn ? ' gl-preparando' : ''}" data-niebla-voz aria-pressed="${vozPuesta()}" aria-label="${preparandoEn ? 'Preparando la voz' : vozPuesta() ? 'Apagar la voz' : 'Leer en voz alta'}" title="${preparandoEn ? 'Preparando la voz: tu computador está generando el audio de este bloque, y empieza a sonar en cuanto esté' : tituloVoz()}">${NARRADOR}</button>`;

/**
 * Un solo director a la vista (nota de voz del titular nmvn1aw18tit, 24 de octubre de 2026: «solamente debe aparecer en
 * un punto de la interfaz a la vez, que es donde el usuario va a tener ubicada su mirada»): el que camina o se arrastra;
 * si ninguno, el del bloque que ▶ tomaría, si se ve; si no, el último que se leyó, si se ve. Los demás esperan sin verse
 * y aparecen cuando les toca.
 */
function mostrarActual() {
  const caja = activa() ? ventana() : null;
  const lista = caja ? bloquesDe(caja) : [];
  let actual = lista.find((b) => b.auto || moviendo.has(b) || b.guia.classList.contains('gl-arrastrando'));
  if (!actual && lista.length) {
    const { cajas, vista } = medidas(lista);
    const seVe = (b: Bloque | undefined) => !!b && cajas[lista.indexOf(b)].abajo > vista.arriba && cajas[lista.indexOf(b)].arriba < vista.abajo;
    const u = ultimoEn(lista);
    const p = lista[paraLeer(cajas, vista, u ? lista.indexOf(u) : -1)];
    actual = seVe(p) ? p : seVe(u) ? u : p;
  }
  for (const b of bloques.values()) b.guia.classList.toggle('gl-otro', b !== actual);
}

let pendienteActual = 0;
/** Al desplazar la ventana, el director a la vista se elige de nuevo, una vez por cuadro. */
const pedirActual = () => {
  if (pendienteActual || !activa()) return;
  pendienteActual = requestAnimationFrame(() => {
    pendienteActual = 0;
    mostrarActual();
  });
};

// ───────────────────────────────────────────── la cámara (nota de voz del titular nmvmy9nhjtit, 24 de octubre de 2026)
// Mientras el director camina (solo, arrastrado, con la rueda o con el teclado), su renglón se mantiene centrado en lo
// que se desplaza, sin un salto: la cámara lo sigue como un resorte amortiguado justo, que arranca y llega despacio y
// nunca se pasa; un cambio de renglón tarda más de un segundo en acomodarse. Solo se mueve en vertical, y solo si hay
// desplazamiento. Sin movimiento (prefers-reduced-motion), va directo.

/** Qué tan rápido sigue la cámara al director (rad/s del resorte): un renglón se acomoda en algo más de un segundo. */
const CAMARA_W = 3.2;
/** La mayor rapidez de la cámara, en píxeles por segundo, aunque el director quede lejos. */
export const CAMARA_MAX = 900;

/** Un cuadro de la cámara: dónde queda el desplazamiento `y`, con su rapidez `v`, tras `dt` ms hacia `objetivo`. */
export function pasoCamara(y: number, v: number, objetivo: number, dt: number): { y: number; v: number } {
  const s = dt / 1000;
  const a = CAMARA_W * CAMARA_W * (objetivo - y) - 2 * CAMARA_W * v;
  const v2 = Math.max(-CAMARA_MAX, Math.min(CAMARA_MAX, v + a * s));
  const y2 = y + v2 * s;
  // Nunca se pasa del renglón: si un cuadro largo lo cruzaría, llega y se queda
  return (objetivo - y) * (objetivo - y2) < 0 ? { y: objetivo, v: 0 } : { y: y2, v: v2 };
}

/**
 * Lo que se desplaza con el texto: la ventana de lectura o algo dentro de ella, nunca lo de detrás. Si la ventana no
 * tiene nada que desplazar (la tarjeta de la misión cabe entera), la cámara se queda quieta: antes caía en la página de
 * detrás del velo, que se desplazaba sola mientras el director leía (nota de voz del titular nmvol5ahftit).
 */
function contenedorDe(el: HTMLElement): HTMLElement | null {
  const tope = el.closest<HTMLElement>(VENTANAS);
  if (!tope) return null;
  for (let p = el.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight) return p;
    if (p === tope) break;
  }
  return null;
}

const camara = { b: null as Bloque | null, y: 0, v: 0, escrito: NaN, cuadro: 0, antes: 0 };

/** Dónde tendría que estar el desplazamiento para que el renglón del director quede al centro (null si no hay desplazamiento). */
function encuadre(b: Bloque): { el: HTMLElement; y: number } | null {
  const cajas = medir(b);
  const o = base(b);
  if (!cajas || !o) return null;
  const el = contenedorDe(b.el);
  if (!el) return null;
  const max = el.scrollHeight - el.clientHeight;
  if (max <= 0) return null;
  // El renglón de la palabra hacia donde camina: en el cambio de renglón, la cámara ya va hacia el siguiente
  const k = Math.max(0, Math.min(cajas.length - 1, Math.floor(b.pos + EPS) + 1));
  const renglon = o.y + cajas[k].y + cajas[k].alto / 2;
  const r = rectaEnPagina(el.getBoundingClientRect());
  return { el, y: Math.max(0, Math.min(max, el.scrollTop + renglon - (r.top + r.height / 2))) };
}

/** La cámara sigue a este director hasta que él se detenga y su renglón quede al centro. */
function seguir(b: Bloque) {
  if (camara.b !== b) camara.escrito = NaN;
  camara.b = b;
  if (!camara.cuadro) camara.cuadro = requestAnimationFrame(filmar);
}

function filmar(t: number) {
  const dt = camara.antes ? Math.min(64, t - camara.antes) : 16;
  camara.antes = t;
  const b = camara.b;
  const e = b && b.guia.isConnected && activa() ? encuadre(b) : null;
  const anda = !!b && moviendo.has(b);
  let sigue = !!e;
  if (b && e) {
    const ahora = e.el.scrollTop;
    // Si la persona desplazó a mano (la barra, el teclado), la cámara parte de ahí; con el director quieto, la deja
    if (Number.isNaN(camara.escrito) || Math.abs(ahora - camara.escrito) > 2) {
      camara.y = ahora;
      camara.v = 0;
      if (!Number.isNaN(camara.escrito) && !anda) sigue = false;
    }
    if (sigue) {
      const p = quieto() ? { y: e.y, v: 0 } : pasoCamara(camara.y, camara.v, e.y, dt);
      camara.y = p.y;
      camara.v = p.v;
      if (!anda && Math.abs(e.y - camara.y) < 0.5 && Math.abs(camara.v) < 4) {
        camara.y = e.y;
        sigue = false;
      }
      e.el.scrollTop = camara.y;
      camara.escrito = e.el.scrollTop;
    }
  }
  camara.cuadro = sigue ? requestAnimationFrame(filmar) : 0;
  if (!sigue) {
    camara.antes = 0;
    camara.v = 0;
  }
}

// ───────────────────────────────────────────── el ratón (notas de voz del titular nmvmyb878tit y nmvmzgq7ntit, 24 de octubre de 2026)
// Con la niebla puesta, sobre la ventana de lectura, el botón central enciende o detiene el avance solo y, en un
// documento sin nada más por destapar, marca «Entendido» (nota de voz del titular nmvodewtctit). La rueda solo
// mueve al director mientras avanza solo: hacia abajo lo adelanta y hacia arriba lo regresa, muy rápido, y el avance
// sigue desde ahí (la cámara lo sigue). Sin el avance solo, o si en ese sentido no queda nada en el bloque que avanza, la
// rueda desplaza la ventana como siempre.

/** Una muesca de la rueda, en píxeles, y cuántas palabras camina el director con cada una. */
export const MUESCA = 100;
export const PALABRAS_POR_MUESCA = 3;
/** Lo que movió la rueda, en píxeles, sea cual sea su unidad (píxeles, renglones o páginas). */
export const pxDeRueda = (delta: number, modo: number, alto: number) => delta * (modo === 1 ? 33 : modo === 2 ? alto : 1);
/** Cuántas muescas enteras lleva lo acumulado (hacia abajo, positivas) y lo que queda para la siguiente. */
export function muescas(acumulado: number): { pasos: number; resto: number } {
  const pasos = Math.trunc(acumulado / MUESCA);
  return { pasos, resto: acumulado - pasos * MUESCA };
}

/**
 * Desde dónde cuenta la rueda en el bloque que avanza solo: donde va el director o, si ya se está reubicando por otra
 * muesca, donde va a quedar (así las muescas seguidas se suman). Null si en ese sentido no queda nada en el bloque: la
 * rueda desplaza la ventana.
 */
export function desdeRueda(b: { pos: number; destino: number; veloz: number; ultima: number }, sentido: number): number | null {
  const desde = b.veloz ? b.destino : b.pos;
  if (sentido > 0 ? desde >= b.ultima - EPS : desde <= -1 + EPS) return null;
  return desde;
}

let rueda = 0;

function conRueda(e: WheelEvent) {
  // Sin el avance solo, la rueda es la de siempre: desplaza la ventana (nota de voz del titular nmvmzgq7ntit)
  if (!activa() || !reproduciendo || e.ctrlKey || e.shiftKey || !e.deltaY) return void (rueda = 0);
  // Esté donde esté el ratón, no solo sobre el párrafo (nota de voz del titular nmvofzas1tit, 25 de octubre de 2026),
  // salvo con otra ventana abierta encima de la lectura, que se desplaza como siempre (ventanaActiva)
  const caja = ventanaActiva();
  const t = e.target as HTMLElement;
  if (!caja || t.closest('textarea, select, input, [contenteditable]')) return;
  const sentido = Math.sign(e.deltaY);
  const b = bloquesDe(caja).find((x) => x.auto);
  const desde = b ? desdeRueda({ ...b, ultima: b.palabras.length - 1 }, sentido) : null;
  if (!b || desde === null) return void (rueda = 0);
  e.preventDefault();
  if (Math.sign(rueda) !== sentido) rueda = 0;
  const { pasos, resto } = muescas(rueda + pxDeRueda(e.deltaY, e.deltaMode, innerHeight));
  rueda = resto;
  if (!pasos) return;
  // Sigue caminando solo: al llegar, el avance retoma desde ahí (llegar › seguirLeyendo), y la voz con él
  marcarUltimo(b);
  if (voz?.b === b) callar();
  reubicar(b, (sentido > 0 ? Math.floor(desde + EPS) : Math.ceil(desde - EPS)) + pasos * PALABRAS_POR_MUESCA, true);
}

/**
 * Qué hace el botón central en la ventana de lectura: detiene el avance solo si alguien camina; si no, lo enciende
 * mientras quede algo por destapar; y si ya no queda nada y es un documento, hace de «Entendido» de la idea de ahora,
 * para pasar a la siguiente (nota de voz del titular nmvodewtctit, 25 de octubre de 2026).
 */
export function queHaceCentral(s: { avanza: boolean; porDestapar: boolean; entendido: boolean }): 'detener' | 'avanzar' | 'entendido' | 'nada' {
  if (s.avanza) return 'detener';
  if (s.porDestapar) return 'avanzar';
  return s.entendido ? 'entendido' : 'nada';
}

/** El «Entendido» de la idea de ahora, si la ventana de lectura es un documento y la idea aún no se marcó. */
const entendidoDe = (caja: HTMLElement) => (caja.matches('.lector') ? caja.querySelector<HTMLButtonElement>('.trozo.actual .entendido:not(.hecho)') : null);

/**
 * El botón central, sobre lo que se lee (no en un enlace ni donde se escribe): queHaceCentral. Si en la lectura no hay
 * nada que hacer, no lo toma: queda para el botón de lo que sigue de esa ventana (siguiente.ts, que mira después).
 */
function conBotonCentral(e: MouseEvent) {
  const caja = e.button === 1 && activa() ? ventanaActiva() : null;
  if (!caja) return;
  if ((e.target as HTMLElement).closest('a[href], textarea, select, input, [contenteditable]')) return;
  if (e.type !== 'mousedown') return;
  const b = bloqueParaLeer(bloquesDe(caja));
  const boton = entendidoDe(caja);
  const hace = queHaceCentral({ avanza: reproduciendo && enMarcha(), porDestapar: !!b && sinTerminar(b), entendido: !!boton });
  if (hace === 'nada') return;
  // Sin el desplazamiento automático del navegador, que se abre con ese botón
  e.preventDefault();
  // «Entendido» con su seguro: si se oprime antes de tiempo, el Studio lo dice, como con el clic
  if (hace === 'entendido') boton!.click();
  else reproducir(hace === 'avanzar');
}

/**
 * Para cargar una ventana donde se va leyendo (director.ts › centrarIdea): la caja, en la pantalla, de la última
 * palabra leída del primer bloque sin terminar dentro de `caja`, o null si ese bloque está sin empezar (se carga desde
 * el principio) o la niebla no está puesta. No necesita que la niebla ya esté dibujada: lee lo que guardó este navegador.
 */
export function dondeVa(caja: HTMLElement): Caja | null {
  if (!nieblaPuesta()) return null;
  const leidos = unidadesDe(caja)
    .filter((u) => u.el.dataset.guia !== 'no')
    .map(({ miembros }) => {
      const { nodos, texto } = textoDe(miembros);
      const palabras = palabrasDe(texto);
      return { nodos, palabras, punto: palabras.length < MIN_PALABRAS ? palabras.length - 1 : guardado(huellaDe(texto)), ultima: palabras.length - 1 };
    });
  const s = dondeSeguir(leidos);
  if (!s?.conAvance) return null;
  const l = leidos[s.indice];
  return cajaDe(l.nodos, l.palabras[l.punto]);
}

/**
 * Si el texto se acomoda de otra forma (la ventana cambió de ancho porque se fue su barra de desplazamiento, se cerró una
 * línea de arriba, cargó la letra), sus palabras se miden de nuevo. Se vigila el ancla, que es un bloque: el navegador
 * nunca avisa del tamaño de un texto en línea (una línea de «¿Dónde quedamos?», el texto de un paso), y el director se
 * quedaba donde estaba la palabra antes, a un renglón de su niebla (notas de voz del titular nmvmzmwj9tit y nmvn0e14xtit).
 */
const tamanos = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver((cambios) => {
  const cambiados = new Set(cambios.map((c) => c.target));
  for (const b of bloques.values()) {
    if (!cambiados.has(b.el) && !cambiados.has(b.ancla)) continue;
    b.cajas = null;
    fijar(b, false);
  }
});

/** ¿Hay otro bloque para leer dentro de este (un punto con párrafos, el renglón de un paso)? Entonces la niebla va en ese. */
function conBloqueDentro(el: HTMLElement) {
  return [...el.querySelectorAll(SELECTOR)].some((x) => {
    const aparte = x.parentElement?.closest(APARTE);
    return !aparte || aparte === el || !el.contains(aparte);
  });
}

function adjuntar({ el, miembros }: Unidad) {
  const { nodos, texto } = textoDe(miembros);
  const palabras = palabrasDe(texto);
  if (palabras.length < MIN_PALABRAS) {
    el.dataset.guia = 'no';
    return;
  }
  const huella = huellaDe(texto);
  el.dataset.guia = huella;
  el.classList.add('gl-bloque');
  // El director espera al principio del primer miembro
  const inicio = miembros[0];
  inicio.classList.add('gl-inicio');
  // Lo que se dibuja se ubica respecto del bloque que lo contiene (el texto de un paso es un trozo de su renglón)
  let ancla: HTMLElement = el;
  while (getComputedStyle(ancla).display === 'inline' && ancla.parentElement) ancla = ancla.parentElement;
  if (getComputedStyle(ancla).position === 'static') ancla.classList.add('gl-ancla');
  const guia = document.createElement('span');
  guia.className = 'gl-guia';
  guia.tabIndex = 0;
  guia.setAttribute('role', 'slider');
  guia.setAttribute('aria-label', 'Niebla de lectura: arrastra al director por el texto para desvelar lo que falta por leer');
  guia.setAttribute('aria-valuemin', '0');
  guia.setAttribute('aria-valuemax', String(palabras.length));
  guia.setAttribute('aria-valuenow', '0');
  guia.title = 'Arrástrame a donde quieras leer: al soltarme, la niebla se destapa (o se tapa) rápido hasta ahí. Con ▶ o el botón central del ratón avanzo solo, a la velocidad que elijas, y mientras avanzo la rueda me adelanta o me regresa. Con doble clic vuelvo al principio.';
  inicio.prepend(guia);
  const antes = Math.min(guardado(huella), palabras.length - 1);
  const b: Bloque = { el, miembros, ancla, inicio, guia, huella, nodos, palabras, punto: -1, pos: antes, destino: antes, marcha: 0, auto: false, veloz: 0, marca: null, oculto: -2, cara: '', rangos: [], nubes: new Map(), cajas: null, renglones: [], pxPalabra: 40 };
  ponerCara(b, 'feliz');
  bloques.set(el, b);
  tamanos?.observe(el);
  if (ancla !== el) tamanos?.observe(ancla);
  // Tapado desde ya (antes de dibujar las nubes, nada se alcanza a leer)
  cubrir(b, antes + 1);
  requestAnimationFrame(() => fijar(b, false));

  // Tomarlo detiene el avance solo: desde ahí lo lleva la persona, y ▶ sigue desde donde lo deje
  const tomar = () => {
    if (reproduciendo) reproducir(false);
    marcarUltimo(b);
  };
  // Arrastrar (nota de voz del titular nmvmzeviqtit): el director va con el puntero, sin tope de velocidad, y la niebla
  // espera; al soltarlo, se destapa o se tapa muy rápido hasta donde quedó. Sin cámara: mientras lo tiene tomado, la
  // persona desplaza la ventana a su gusto, y el puntero marca el texto como está ahora. El lugar es donde quedaría el
  // director con el puntero en el mismo punto de él donde se tomó (si se tomó por abajo, no baja de renglón antes de tiempo)
  guia.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    tomar();
    // Tomarlo mientras camina lo detiene donde va, y la cámara lo suelta; si la niebla iba hacia donde se soltó, llega
    // de una vez (la persona lo toma donde lo ve)
    if (camara.b === b) camara.b = null;
    if (b.marca !== null) b.pos = b.marca;
    irA(b, b.pos, false);
    b.marca = b.pos;
    fijar(b, false);
    guia.setPointerCapture(e.pointerId);
    guia.classList.add('gl-arrastrando');
    // El puntero y el director, en píxeles de la página (escala.ts), como las cajas de las palabras
    const g = rectaEnPagina(guia.getBoundingClientRect());
    const dedo = puntoEnPagina(e);
    const dx = dedo.x - g.left;
    const dy = dedo.y - (g.top + LADO / 2);
    let px = dedo.x;
    let py = dedo.y;
    const marcar = () => {
      const o = base(b);
      const cajas = medir(b);
      if (!o || !cajas) return;
      b.marca = posHacia(cajas, b.renglones, px - o.x - dx, py - o.y - dy, LADO);
      fijar(b, false);
    };
    const mover = (ev: PointerEvent) => {
      ({ x: px, y: py } = puntoEnPagina(ev));
      marcar();
    };
    const soltar = () => {
      guia.removeEventListener('pointermove', mover);
      guia.removeEventListener('pointerup', soltar);
      guia.removeEventListener('pointercancel', soltar);
      document.removeEventListener('scroll', marcar, true);
      guia.classList.remove('gl-arrastrando');
      const a = b.marca ?? b.pos;
      if (Math.abs(a - b.pos) < EPS) {
        b.marca = null;
        return fijar(b, false);
      }
      reubicar(b, a, false);
    };
    guia.addEventListener('pointermove', mover);
    guia.addEventListener('pointerup', soltar);
    guia.addEventListener('pointercancel', soltar);
    // Si desplaza la ventana con el director tomado, el puntero queda sobre otro lugar del texto
    document.addEventListener('scroll', marcar, true);
  });
  // Tocar al director no hace lo que haría tocar su renglón (en «¿Dónde quedamos?», marcar la línea leída)
  guia.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  // Con doble clic vuelve al principio, caminando: la niebla vuelve a cubrir lo leído
  guia.addEventListener('dblclick', (e) => {
    e.preventDefault();
    e.stopPropagation();
    tomar();
    irA(b, -1);
  });
  guia.addEventListener('keydown', (e) => {
    const teclas: Record<string, number | undefined> = { ArrowRight: Math.floor(b.destino + EPS) + 1, ArrowLeft: Math.ceil(b.destino - EPS) - 1, Home: -1, End: b.palabras.length - 1 };
    const a = teclas[e.key];
    if (a === undefined) return;
    e.preventDefault();
    e.stopPropagation();
    tomar();
    irA(b, a);
  });
}

/** Quita la niebla de un bloque: el director, sus nubes, sus efectos y el resaltado. */
function soltarBloque(b: Bloque) {
  // Lo que caminó desde la última vez que llegó no se pierde, y si caminaba solo, el avance sigue en el bloque que lo
  // reemplace (sin esto, ▶ quedaba encendido sin nadie caminando, y el clic siguiente lo apagaba: «le doy play y no
  // inicia», nota de voz del titular nmvmyusuotit)
  if (moviendo.has(b) || b.auto) guardar(b);
  if (b.auto) sinTerminarAlRepintar = true;
  b.auto = false;
  moviendo.delete(b);
  if (ultimo === b) ultimo = null;
  bloques.delete(b.el);
  b.rangos.forEach((r) => resaltado?.delete(r));
  tamanos?.unobserve(b.el);
  if (b.ancla !== b.el && ![...bloques.values()].some((x) => x.ancla === b.ancla || x.el === b.ancla)) tamanos?.unobserve(b.ancla);
  b.guia.remove();
  b.nubes.forEach((e) => e.remove());
  b.inicio.querySelectorAll(':scope > .gl-efecto').forEach((e) => e.remove());
  quitarGlobo(b);
  if (preparandoEn === b) preparandoEn = null;
  b.el.classList.remove('gl-bloque');
  b.inicio.classList.remove('gl-inicio');
  b.ancla.classList.remove('gl-ancla');
  if (b.el.isConnected) delete b.el.dataset.guia;
}

/** ¿Sigue en pie el bloque? Su raíz y cada miembro, en la ventana y con su texto para leer (una línea que se toca deja de serlo). */
const enPie = (el: HTMLElement, b: Bloque, caja: HTMLElement) =>
  el.isConnected && b.guia.isConnected && caja.contains(el) && b.miembros.every((m) => (m === el || el.contains(m)) && m.matches(SELECTOR));

const mismosMiembros = (a: HTMLElement[], b: HTMLElement[]) => a.length === b.length && a.every((m, i) => m === b[i]);

function escanear() {
  const caja = activa() ? ventana() : null;
  for (const [el, b] of bloques) if (!caja || !enPie(el, b, caja)) soltarBloque(b);
  // Lo que se lee dejó de verse (se plegó) o ya no está: la voz calla y el avance se detiene; nunca sigue sonando donde
  // nadie lo ve. Si el Studio solo lo volvió a dibujar, el avance sigue en el bloque nuevo (sinTerminarAlRepintar)
  if (voz && (!bloques.has(voz.b.el) || !seMuestra(voz.b.el))) callar();
  if ([...bloques.values()].some((b) => b.auto && !seMuestra(b.el))) reproducir(false);
  if (!caja) {
    sinTerminarAlRepintar = false;
    if (reproduciendo) reproducir(false);
    return;
  }
  for (const u of unidadesDe(caja)) {
    const b = bloques.get(u.el);
    if (b && mismosMiembros(b.miembros, u.miembros)) continue;
    // Lo que se lee junto cambió (un punto más en una lista corta, un detalle en el paso): un solo director para lo nuevo
    for (const x of [...bloques.values()]) if (x === b || u.miembros.includes(x.el) || x.miembros.some((m) => u.miembros.includes(m))) soltarBloque(x);
    if (u.el.dataset.guia) continue;
    adjuntar(u);
  }
  mostrarActual();
  if (!sinTerminarAlRepintar) return;
  sinTerminarAlRepintar = false;
  // Cuando ya se midió lo nuevo (adjuntar fija cada bloque en el cuadro siguiente)
  if (reproduciendo) requestAnimationFrame(() => requestAnimationFrame(() => !enMarcha() && seguirLeyendo()));
}

/**
 * ¿Este texto sigue bajo la niebla, sin destapar del todo? Con la niebla puesta, una línea de «¿Dónde quedamos?» que se
 * toca así no se da por leída (nota de voz del titular nmvn0h59stit, 24 de octubre de 2026: se tocaba una línea aún
 * nublada y se ocultaba sin haberla leído). Sin niebla, o en un texto sin ella, falso: lo de siempre.
 */
export function sinDestapar(el: Element | null): boolean {
  if (!el || !activa()) return false;
  const b = [...bloques.values()].find((x) => x.el === el || x.miembros.includes(el as HTMLElement));
  return !!b && b.punto < b.palabras.length - 1;
}

/**
 * El primer texto de esa caja (la tarjeta de una misión, una idea de un documento) que sigue bajo la niebla y se ve, en
 * el orden de la página; null si no queda ninguno o si la niebla no está puesta. Con él, lo que hace avanzar espera a
 * que se lea todo lo de su caja (nota de voz del titular nmvojwvsmtit, 25 de octubre de 2026).
 */
export function nubladoEn(caja: Element): HTMLElement | null {
  if (!activa() || !(caja instanceof HTMLElement)) return null;
  return bloquesDe(caja).find((b) => sinTerminar(b) && b.el.getClientRects().length > 0)?.el ?? null;
}

/**
 * Un globito junto al director de ese bloque, para decir algo donde está la mirada; con `ms` en 0, se queda hasta que se
 * quite (quitarGlobo). Lo dibuja la niebla misma (DIBUJO): no se lee ni hace volver a mirar.
 */
function globo(b: Bloque, texto: string, ms: number) {
  quitarGlobo(b);
  const g = document.createElement('span');
  g.className = 'gl-globo';
  g.setAttribute('role', 'status');
  g.textContent = texto;
  // En la capa de arriba (popover), encima de todo y fuera de cualquier contenedor que lo corte: cerca del borde, el
  // contenedor con overflow lo cortaba (nota de voz del titular nmvovbwxctit, 26 de octubre de 2026)
  if (typeof g.showPopover === 'function') g.popover = 'manual';
  document.body.append(g);
  g.showPopover?.();
  globos.set(b, g);
  ubicarGlobo(b, g);
  if (!vigilandoGlobos) {
    vigilandoGlobos = true;
    addEventListener('scroll', reubicarGlobos, { capture: true, passive: true });
    addEventListener('resize', reubicarGlobos, { passive: true });
  }
  if (ms) setTimeout(() => globos.get(b) === g && quitarGlobo(b), ms);
}
const globos = new Map<Bloque, HTMLElement>();
let vigilandoGlobos = false;
function quitarGlobo(b: Bloque) {
  globos.get(b)?.remove();
  globos.delete(b);
}
const reubicarGlobos = () => globos.forEach((g, b) => ubicarGlobo(b, g));

/**
 * El globito, centrado encima de su director y dentro de la ventana: si no cabe arriba, va debajo, y la flecha sigue
 * apuntando al director. Si el director salió de la vista (su contenedor lo desplazó), se esconde con él.
 */
function ubicarGlobo(b: Bloque, g: HTMLElement) {
  if (!b.guia.isConnected) return quitarGlobo(b);
  // Todo en píxeles de la página (escala.ts): lo que se escribe en el style del globito, y su ancho y su alto, lo son
  const r = rectaEnPagina(b.guia.getBoundingClientRect());
  let aLaVista = r.bottom > 0 && r.top < altoDeVentana();
  for (let p = b.guia.parentElement; p && aLaVista; p = p.parentElement) {
    if (!/auto|scroll|hidden|clip/.test(getComputedStyle(p).overflowY)) continue;
    const c = rectaEnPagina(p.getBoundingClientRect());
    aLaVista = r.bottom > c.top && r.top < c.bottom;
  }
  g.hidden = !aLaVista;
  if (!aLaVista) return;
  const margen = 8;
  const x = r.left + r.width / 2;
  const izq = Math.max(margen, Math.min(x - g.offsetWidth / 2, anchoDeVentana() - g.offsetWidth - margen));
  const abajo = r.top - g.offsetHeight - margen < margen;
  g.classList.toggle('gl-globo-abajo', abajo);
  g.style.left = `${izq}px`;
  g.style.top = `${abajo ? r.bottom + margen : r.top - g.offsetHeight - margen}px`;
  g.style.setProperty('--flecha', `${x - izq}px`);
}

/**
 * Lo que dice el globito cada vez que se intenta avanzar con texto aún nublado, en las palabras del titular (nota de voz
 * nmvouevcdtit, 26 de octubre de 2026: en todo lugar donde no se deja avanzar, el director se detiene, saca el globito y
 * lo dice así). Se queda el tiempo de leerlo.
 */
export const NO_AVANZA = 'Mientras tengas el modo niebla activado, no puedes avanzar hasta que termines de descubrir todo el texto.';
const GLOBO_MS = 8000;

/**
 * El director de ese texto da un brinco para decir dónde se empieza a destapar. Con `dice`, lo dice también en un
 * globito, y la vista lo trae si estaba fuera (nota de voz del titular nmvot7ynytit, 26 de octubre de 2026: el brinco solo
 * no decía por qué no lo dejaba avanzar).
 */
export function llamarNiebla(el: Element | null, dice?: string) {
  const b = [...bloques.values()].find((x) => x.el === el || x.miembros.includes(el as HTMLElement));
  if (!b) return;
  // Avanzar antes de tiempo detiene ▶ y la voz, para leer el globito sin que nada siga corriendo: se sigue oprimiendo ▶
  // otra vez (nota de voz del titular nmvovmscdtit, 26 de octubre de 2026: «aprende que cada vez que interrumpe, va a
  // tener que dar play nuevamente»)
  if (dice && (reproduciendo || voz)) reproducir(false);
  // Ese es ahora el director a la vista: ahí se empieza a destapar, a mano o con ▶
  marcarUltimo(b);
  mostrarActual();
  if (dice) {
    globo(b, dice, GLOBO_MS);
    b.guia.scrollIntoView({ block: 'nearest', behavior: quieto() ? 'auto' : 'smooth' });
  }
  if (quieto()) return;
  b.guia.classList.remove('gl-llama');
  void b.guia.offsetWidth;
  b.guia.classList.add('gl-llama');
  setTimeout(() => b.guia.classList.remove('gl-llama'), 900);
}

/** Lo que dibuja la niebla misma (el director, su cara, sus nubes y sus efectos) no hace volver a mirar: solo lo que cambia el Studio. */
const DIBUJO = '.gl-guia, .gl-nube, .gl-efecto, .gl-globo, .gl-control';
const propio = (n: Node) => n instanceof Element && !!n.closest(DIBUJO);
const delDibujo = (c: MutationRecord) => (c.target instanceof Element && !!c.target.closest(DIBUJO)) || [...c.addedNodes, ...c.removedNodes].every(propio);

/** Pone la niebla donde aplica, ahora y en lo que el Studio dibuje después. Sin resaltados en el navegador, nada. */
export function iniciarGuiaLectura() {
  if (resaltado || !registro || !ConResaltado) return;
  resaltado = new ConResaltado();
  registro.set('niebla-lectura', resaltado);
  let pendiente = 0;
  const pedir = () => {
    cancelAnimationFrame(pendiente);
    pendiente = requestAnimationFrame(escanear);
  };
  new MutationObserver((cambios) => {
    if (cambios.every(delDibujo)) return;
    pedir();
  }).observe(document.body, { childList: true, subtree: true });
  // Encender o apagar la niebla, entrar y salir del enfoque o abrir «¿Dónde quedamos?» cambia las clases de la página
  new MutationObserver(pedir).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  // Al grabar, lo que se lee solo y la voz se detienen, para darle paso a quien habla: sigue cuando la persona oprima ▶
  // (nota de voz del titular nmvoooca4tit, 25 de octubre de 2026; grabadora.ts › EMPIEZA_GRABACION)
  addEventListener('estudio:grabando', () => {
    if (reproduciendo || voz) reproducir(false);
  });
  // Otro ancho de ventana mueve las palabras: se miden de nuevo
  addEventListener('resize', () => bloques.forEach((b) => {
    b.cajas = null;
    fijar(b, false);
  }));
  document.addEventListener('click', (e) => {
    // Encendido sin nadie caminando (un bloque que se quitó a medio camino) se lee como detenido: el clic lo enciende
    if ((e.target as HTMLElement).closest('[data-niebla-auto]')) reproducir(!(reproduciendo && enMarcha()));
    // La voz se enciende o se apaga; si el avance va en marcha, sigue desde donde va, con la voz o sin ella
    if ((e.target as HTMLElement).closest('[data-niebla-voz]')) {
      // Al encenderla, se dice con qué voz lee o, si no hay ninguna, por qué y cómo lograrlo, con «Comprobar de nuevo»
      // (comprobarVoz): nunca en silencio, y sin voz queda apagada
      void (async () => {
        if (vozPuesta()) {
          ponerVoz(false);
          pintarControles();
        } else await comprobarVoz();
        if (reproduciendo) {
          reproducir(false);
          reproducir(true);
        }
      })();
    }
  });
  // Las voces de Kokoro se piden al servidor solo si la voz ya está encendida: sin ella, el Studio no las busca hasta que
  // se abre «Sonidos» o se enciende
  if (vozPuesta()) void vocesNaturales().then(() => {
    const natural = naturalActual();
    if (natural && vozPuesta()) prepararVoz(natural);
  });
  document.addEventListener('wheel', conRueda, { passive: false });
  document.addEventListener('scroll', pedirActual, { capture: true, passive: true });
  document.addEventListener('pointermove', conRaton, { capture: true, passive: true });
  document.addEventListener('pointerdown', conRaton, { capture: true, passive: true });
  document.addEventListener('mousedown', conBotonCentral);
  document.addEventListener('auxclick', conBotonCentral);
  document.addEventListener('change', (e) => {
    const s = (e.target as HTMLElement).closest<HTMLSelectElement>('select[data-niebla-vel]');
    if (!s) return;
    try {
      localStorage.setItem(CLAVE_VELOCIDAD, s.value);
    } catch {
      // Sin almacenamiento, vale para esta visita
    }
    document.querySelectorAll<HTMLSelectElement>('select[data-niebla-vel]').forEach((x) => (x.value = s.value));
  });
  pedir();
}

if (typeof document !== 'undefined') iniciarGuiaLectura();
