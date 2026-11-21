// Lo que el director escribe a una persona va en el idioma de su interfaz, también los nombres de lo que se ve en
// pantalla (notas del titular nmw6wpwl4tit y nmw6wwsy2tit, 7 de noviembre de 2026: con el Studio en inglés, un paso
// empezaba con «Siguiente paso.», que la tarjeta ya dice como «Next step», y otro mandaba a buscar «Modo enfoque», que en
// inglés se llama «Focus mode»). Los rótulos salen de los diccionarios de la interfaz (estudio/src/textos/es.ts y en.ts),
// así que un rótulo nuevo queda vigilado sin tocar esto. Puro.
import { en } from '../../estudio/src/textos/en.ts';
import { es } from '../../estudio/src/textos/es.ts';
import type { Idioma } from './idioma.ts';
import { PALABRAS_EN, PALABRAS_ES } from './voz.ts';

/** Un rótulo entre «», comparable: sin los símbolos del principio (✉, ←, ▶…), sin los puntos suspensivos ni los dos puntos del final, en minúsculas. */
const normalRotulo = (x: string) =>
  x.normalize('NFC').replace(/^[^\p{L}\p{N}«]+/u, '').replace(/(\s*(…|\.\.\.|:|\.))+$/u, '').replace(/\s+/g, ' ').trim().toLowerCase();

/** Hasta cuánto mide un rótulo: lo más largo es una frase, no un nombre de botón o de sección. */
const MAX_ROTULO = 48;

let cache: { espanol: Map<string, string[]>; ingles: Set<string> } | undefined;

/** Cada rótulo de la interfaz en español que en inglés dice otra cosa, con su versión en inglés. */
function rotulosEspanoles() {
  if (cache) return cache;
  const espanol = new Map<string, string[]>();
  const ingles = new Set<string>();
  for (const [clave, valor] of Object.entries(es)) {
    const otro = (en as Record<string, unknown>)[clave];
    if (typeof otro === 'string') ingles.add(normalRotulo(otro));
    if (typeof valor !== 'string' || typeof otro !== 'string' || /[{}]/.test(valor)) continue;
    const n = normalRotulo(valor);
    if (!n || n.length > MAX_ROTULO || !/\p{L}/u.test(n) || n === normalRotulo(otro)) continue;
    const limpio = otro.replace(/^[^\p{L}\p{N}«]+/u, '').trim();
    const ya = espanol.get(n) ?? [];
    if (!ya.includes(limpio)) espanol.set(n, [...ya, limpio]);
  }
  cache = { espanol, ingles };
  return cache;
}

/**
 * Las palabras del método que la persona dice o pulsa (regla dura del titular nmwcp5wdhtit, 11 de noviembre de 2026:
 * «Confirmo» llegaba con la interfaz en inglés), con su rótulo en inglés, el de la interfaz. Van aparte de los
 * diccionarios porque «Confirmo» no es un botón suelto de la interfaz, y para que ninguna dependa de cómo se escriba allí.
 */
const enIngles = (clave: string) => String((en as Record<string, unknown>)[clave] ?? '').replace(/^[^\p{L}]+/u, '');
export const PALABRAS_DEL_METODO: Record<string, string> = {
  Confirmo: 'I confirm',
  Autorizo: enIngles('comun.autorizo'),
  'No lo autorizo': enIngles('permiso.botonNo'),
  Entendido: enIngles('docs.entendido'),
  'Apruebo lo que recomiendas': enIngles('docs.aprobar'),
  'Decido otra cosa': enIngles('docs.decidirOtra'),
  'Hazlo tú': enIngles('paso.hazlo'),
};
const METODO = new Map(Object.entries(PALABRAS_DEL_METODO).map(([k, v]) => [normalRotulo(k), v]));

/** Cuántas palabras seguidas mira la ventana, y cuántas comunes del otro idioma la delatan (sin ninguna del propio). */
const VENTANA = 6;
const DELATAN = 3;
/** Más palabras de todos los días, solo para delatar un pasaje corto (un título, una opción): ninguna es del otro idioma. */
const MAS_ES = ['qué', 'cómo', 'cuál', 'dónde', 'cuándo', 'sí', 'aquí', 'ahora', 'después', 'antes', 'siempre', 'nunca', 'todo', 'nada', 'algo', 'mismo', 'otra', 'otro', 'pasa', 'hay'];
const MAS_EN = ['what', 'how', 'which', 'who', 'all', 'not', 'there', 'here', 'now', 'after', 'before', 'always', 'never', 'something', 'nothing', 'same', 'other', 'another'];

/**
 * Los pasajes en el otro idioma dentro de un texto para la persona (auditoría del idioma, nota nmwdxm0oztit, 12 de
 * noviembre de 2026: con la interfaz en inglés, un paso mandaba a escribir «Sigue en la fase del equipo», copiado de una
 * respuesta vieja; ningún vigilante lo veía, porque solo miraban los rótulos entre «» y el texto entero, que seguía siendo
 * inglés por mayoría). Un pasaje es una ventana de seis palabras con al menos tres palabras comunes del otro idioma y
 * ninguna del propio, o una frase con «¿» o «¡» con la interfaz en inglés; se devuelve entero, de su primera palabra a la
 * última. El código entre comillas invertidas, las direcciones y las etiquetas no cuentan. Puro.
 */
export function pasajesEnOtroIdioma(texto: string, idioma: Idioma | undefined): string[] {
  if ((idioma !== 'en' && idioma !== 'es') || !texto) return [];
  const limpio = texto
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, (x) => ' '.repeat(x.length))
    .replace(/`[^`\n]*`/g, (x) => ' '.repeat(x.length))
    .replace(/https?:\/\/\S+/g, (x) => ' '.repeat(x.length))
    .replace(/<[^>]+>/g, (x) => ' '.repeat(x.length));
  const es = new Set([...PALABRAS_ES, ...MAS_ES]);
  const en = new Set([...PALABRAS_EN, ...MAS_EN]);
  const otro = idioma === 'en' ? es : en;
  const propio = idioma === 'en' ? en : es;
  const palabras = [...limpio.matchAll(/\p{L}+/gu)].map((m) => ({ p: m[0].toLowerCase(), i: m.index!, f: m.index! + m[0].length }));
  const pasajes: { i: number; f: number }[] = [];
  for (let k = 0; k + DELATAN <= palabras.length; k++) {
    const v = palabras.slice(k, k + VENTANA);
    if (v.some((x) => propio.has(x.p)) || v.filter((x) => otro.has(x.p)).length < DELATAN) continue;
    // Del primer delator al último: el pasaje, sin las palabras neutras de los bordes
    const delatores = v.filter((x) => otro.has(x.p));
    const tramo = { i: delatores[0].i, f: delatores.at(-1)!.f };
    const ultimo = pasajes.at(-1);
    if (ultimo && tramo.i <= ultimo.f + 1) ultimo.f = Math.max(ultimo.f, tramo.f);
    else pasajes.push(tramo);
  }
  const salida = pasajes.map(({ i, f }) => {
    // Hasta el final de la palabra o frase que sigue sin otra palabra del propio idioma: el pasaje, entero para la persona
    const resto = texto.slice(f).match(/^[^.,;:!?»"\n]*/)?.[0] ?? '';
    const corte = [...resto.matchAll(/\p{L}+/gu)].find((m) => propio.has(m[0].toLowerCase()))?.index ?? resto.length;
    // Y hacia atrás, desde el último signo o la última palabra del propio idioma
    const antes = texto.slice(0, i).match(/[^.,;:!?«"\n]*$/)?.[0] ?? '';
    const delPropio = [...antes.matchAll(/\p{L}+/gu)].filter((m) => propio.has(m[0].toLowerCase())).at(-1);
    const inicio = i - antes.length + (delPropio ? delPropio.index! + delPropio[0].length : 0);
    return texto.slice(inicio, f + corte).trim();
  });
  if (idioma === 'en') for (const m of texto.matchAll(/[¿¡][^?!\n]{0,80}[?!]?/g)) if (!salida.some((s) => s.includes(m[0]) || m[0].includes(s))) salida.push(m[0].trim());
  return salida;
}

/**
 * Lo que en un texto para alguien con la interfaz en inglés está en español de la interfaz: que empiece con «Siguiente
 * paso» (la tarjeta ya lo dice, y en su idioma) o que nombre entre «» un rótulo en español que en inglés es otro, o una
 * palabra del método («Confirmo», «Autorizo»…). Cada problema, en una frase que dice qué usar. Con la interfaz en
 * español, nada. Puro.
 */
export function rotulosEnOtroIdioma(texto: string, idioma: Idioma | undefined, opcionesDeLaMision: string[] = []): string[] {
  if (idioma !== 'en' || !texto) return [];
  // Citar una opción que la misma misión ofrece es citar lo que la persona elige, tal cual
  const propias = new Set(opcionesDeLaMision.map(normalRotulo));
  const problemas: string[] = [];
  if (/^\s*siguiente paso\b/i.test(texto)) problemas.push('empieza con «Siguiente paso», que la tarjeta ya muestra en inglés («Next step»): quítalo');
  const { espanol, ingles } = rotulosEspanoles();
  for (const [, citado] of texto.matchAll(/«([^«»]{1,80})»/g)) {
    const n = normalRotulo(citado);
    const delMetodo = METODO.get(n);
    if (delMetodo && !propias.has(n)) {
      problemas.push(`nombra «${citado.trim()}», una palabra del método en español: con la interfaz en inglés es «${delMetodo}»`);
      continue;
    }
    const usar = espanol.get(n);
    if (!usar || ingles.has(n)) continue;
    problemas.push(`nombra «${citado.trim()}», el rótulo en español: con la interfaz en inglés se llama ${usar.map((x) => `«${x}»`).join(' o ')}`);
  }
  return problemas;
}


// ── Los rótulos que existen en la interfaz, y los que solo se ven en un estado (nmwmx31aotit) ─────────────────────────

/** Un rótulo comparable con otro: como normalRotulo, y sin las flechas ni los símbolos del final (↗, →, ↓). */
export const rotuloComparable = (x: string): string => normalRotulo(x.replace(/[\s↗→←↓↑✓✕▶⏸✉★]+$/u, ''));

/** Lo que la interfaz dice en un idioma: sus rótulos, enteros y hasta sus dos puntos o su paréntesis, y los que llevan un dato. */
export interface RotulosDeLaInterfaz {
  conocidos: Set<string>;
  conDato: RegExp[];
  /** Los rótulos que solo se ven en un estado, con lo que el paso debe decir antes de nombrarlos. */
  conEstado: { rotulos: string[]; estado: string; antes: RegExp }[];
  /** Los rótulos que la tarjeta muestra solo en un paso que lleva a un documento (`ir.doc`), con lo que dice de ese estado. */
  soloConDocumento: { rotulos: string[]; estado: string };
}

/**
 * Los botones «Continue mission →» y «Continue in Focus mode» salen en la tarjeta solo cuando el paso de ahora lleva a
 * un documento que leer o decidir (estudio/src/missionCard.ts › continuar-m: `paso.ir?.doc`). Nombrados en un paso sin
 * `ir.doc`, la persona no los ve en ningún estado (nota de voz del titular nmwmzdw08tit, 19 de noviembre de 2026: el paso 4
 * de t_ver_induccion los pedía con el enfoque apagado, y no estaban). Las claves son las de los diccionarios.
 */
const SOLO_CON_DOCUMENTO: { claves: string[]; estado: Record<Idioma, string> } = {
  claves: ['mision.continuar', 'mision.continuarEnfoque'],
  estado: {
    en: 'only on a step that leads to a document to read or decide (with its «ir.doc»); this step has none, so the button never shows',
    es: 'solo en un paso que lleva a un documento que leer o decidir (con su «ir.doc»); este paso no lo tiene, así que el botón nunca sale',
  },
};

/**
 * Los rótulos que solo se ven en un estado de la interfaz (nota de voz del titular nmwmx31aotit, 19 de noviembre de 2026:
 * el paso pedía «Continue in Focus mode» mientras leía en el modo enfoque, donde ese botón no está). Un paso que nombra
 * uno dice antes, en su texto, cómo llegar a ese estado. Las claves son las de los diccionarios de la interfaz.
 */
const CON_ESTADO: { claves: string[]; estado: Record<Idioma, string>; antes: RegExp }[] = [
  {
    claves: ['mision.continuarEnfoque'],
    estado: { en: 'with «Focus mode» off (outside Focus mode)', es: 'con el «Modo enfoque» apagado (fuera del enfoque)' },
    antes: /exit focus|salir del enfoque|(?:outside|out of|leave|leaving|exit|turn off|switch off)\s+(?:«)?focus mode|focus mode(?:»)?\s+(?:is\s+)?off|fuera del (?:«)?modo enfoque|apaga(?:do)? el (?:«)?modo enfoque|sal del (?:«)?modo enfoque/i,
  },
  {
    claves: ['enfoque.salir'],
    estado: { en: 'in «Focus mode»', es: 'en el «Modo enfoque»' },
    antes: /focus mode|modo enfoque/i,
  },
  {
    claves: ['induccion.repetir', 'ayuda.repetir'],
    estado: { en: 'with «Help mode» on', es: 'con el «Modo ayuda» encendido' },
    antes: /(?:turn|switch)\s+(?:on\s+«?help mode|«?help mode»?\s+on)|«?help mode»?\s+(?:is\s+)?on\b|enciende (?:el )?«?modo ayuda|«?modo ayuda»? (?:está )?encendido/i,
  },
  {
    claves: ['induccion.escuchar', 'induccion.saltarTodo'],
    estado: { en: 'only while the three introduction bubbles show, with «Help mode» on', es: 'solo mientras se ven las tres burbujas de la introducción, con el «Modo ayuda» encendido' },
    antes: /help mode|modo ayuda/i,
  },
];

const cacheInterfaz = new Map<string, RotulosDeLaInterfaz>();

/** Los rótulos de la interfaz en ese idioma (por omisión, español), sacados de sus diccionarios. Pura. */
export function rotulosDeLaInterfaz(idioma: Idioma | undefined): RotulosDeLaInterfaz {
  const cual: Idioma = idioma === 'en' ? 'en' : 'es';
  const ya = cacheInterfaz.get(cual);
  if (ya) return ya;
  const dic = (cual === 'en' ? en : es) as Record<string, unknown>;
  const conocidos = new Set<string>();
  const conDato: RegExp[] = [];
  const formas = (v: unknown): string[] => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v as object).filter((x): x is string => typeof x === 'string') : []);
  for (const v of Object.values(dic).flatMap(formas)) {
    for (const parte of [v, v.split(/:\s|\s\(|\s·\s/u)[0]]) {
      if (/[{}]/.test(parte)) {
        const n = rotuloComparable(parte);
        if (n.length <= 80) conDato.push(new RegExp(`^${n.split(/\{[^}]*\}/).map((x) => x.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&')).join('.+')}$`, 'u'));
      } else conocidos.add(rotuloComparable(parte));
    }
  }
  const conEstado = CON_ESTADO.map((c) => ({ rotulos: c.claves.flatMap((k) => formas(dic[k])).map(rotuloComparable), estado: c.estado[cual], antes: c.antes }));
  const soloConDocumento = { rotulos: SOLO_CON_DOCUMENTO.claves.flatMap((k) => formas(dic[k])).map(rotuloComparable), estado: SOLO_CON_DOCUMENTO.estado[cual] };
  const r = { conocidos, conDato, conEstado, soloConDocumento };
  cacheInterfaz.set(cual, r);
  return r;
}
