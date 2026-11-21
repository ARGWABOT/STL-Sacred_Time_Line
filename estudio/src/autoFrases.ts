// Las frases que pone el Studio solo, sin que la persona las escriba: las de los globos de las ramas de la línea
// (src/director/historiaLinea.ts: «Entregaste «…»», «Elegiste: …», «Una nota de voz») y el texto que guarda una nota de
// un clic («Apruebo lo que recomiendas.», «Ya te lo dije en mi comentario», «Hazlo tú: …»). Se guardan en español, porque
// el director y la línea las leen así, y se muestran en el idioma de la interfaz (notas de voz del titular nmw9gugabtit y
// nmw9hcxtotit, 9 de noviembre de 2026: con la interfaz en inglés, el globo decía «Entregaste» y «Apruebo lo que
// recomiendas»). Lo que la persona escribió con sus palabras no se toca: solo una línea que es entera una de estas frases.
import { YA_LO_COMENTE, YA_LO_DIJE } from '../../src/director/director';
import { formasDe, t, type ClaveDeTexto } from './textos';

/** Las frases enteras, en español como se guardan, con la clave de su texto. */
const ENTERAS: [string, ClaveDeTexto][] = [
  ['Entregaste una misión', 'auto.entregasteUna'],
  ['Respondiste una propuesta', 'auto.respondisteUna'],
  ['Una nota de voz', 'auto.notaDeVoz'],
  ['«Hazlo tú»', 'linea.rama.hazlo'],
  ['Apruebo lo que recomiendas.', 'auto.apruebo'],
  ['Ya lo hice: compruébalo tú.', 'auto.yaLoHice'],
  ['Lo dije en audio: está en el Buzón.', 'auto.enAudio'],
  [YA_LO_DIJE, 'paso.yaLoDije'],
  [YA_LO_COMENTE, 'paso.yaLoComente'],
];

/** Una línea en el idioma de la interfaz, si es una frase del Studio; si no, tal como está. */
function linea(l: string): string {
  const entera = ENTERAS.find(([es]) => es === l.trim());
  if (entera) return t(entera[1]);
  // El título puede seguir en la línea de abajo (historiaLinea.ts › dosLineas): se cambia solo lo que va antes de «
  for (const [es, clave] of [['Entregaste «', 'auto.entregaste'], ['Respondiste «', 'auto.respondiste']] as const) {
    if (l.startsWith(es)) return t(clave, { titulo: '\u0000' }).split('\u0000')[0] + l.slice(es.length);
  }
  if (l.startsWith('Elegiste: ')) return `${t('paso.elegiste')} ${linea(l.slice('Elegiste: '.length))}`;
  if (l.startsWith('Hazlo tú: ')) return `${t('auto.hazlo')} ${l.slice('Hazlo tú: '.length)}`;
  return l;
}

/** Un texto del Studio (el globo de una rama, el de una nota de un clic) en el idioma de la interfaz, línea por línea. */
export const autoFrasesEnIdioma = (texto: string): string => texto.split('\n').map(linea).join('\n');

/**
 * Lo que el Studio escribe en una nota por la persona y se guarda como salió (pedido pd_notas_en_idioma; elección del
 * titular nmwao74cctit: todas, también las que ya están en el Buzón): «No lo entiendo, explícamelo mejor.», lo que halló
 * una comprobación que falló, el rótulo de lo dicho en audio al entregar, decidir, cruzar, reabrir, replantear la meta,
 * responder una propuesta o pedir una excepción, y el encabezado «Dónde quedamos ›» o «Paso N» de la parte que comenta.
 * Unas se guardan siempre en español, porque el director las lee así; otras, en el idioma que tenía la interfaz al
 * escribirlas. Se reconocen en cualquiera de los dos y se muestran en el de ahora, sin tocar lo guardado. `de`: lo que va
 * entre llaves y es a su vez un texto del Studio, con las claves que puede ser.
 */
interface Plantilla { clave: ClaveDeTexto; de?: Record<string, ClaveDeTexto[]> }

const PLANTILLAS: Plantilla[] = [
  { clave: 'auto.noLoEntiendo' },
  { clave: 'auto.aunNoLoEntiendo' },
  { clave: 'notaAdjunta.noSalio' },
  { clave: 'auto.alComprobarlo' },
  { clave: 'auto.enAudio' },
  { clave: 'notaAdjunta.entrega' },
  { clave: 'notaAdjunta.decidir' },
  { clave: 'notaAdjunta.cruzar' },
  { clave: 'notaAdjunta.reabrir' },
  { clave: 'auto.alReplantear' },
  { clave: 'auto.sobreExcepcion' },
  { clave: 'auto.propuestaRespondida', de: { estado: ['propuesta.aceptada', 'propuesta.enEstudio', 'propuesta.descartada'] } },
];

const SECCIONES: Plantilla[] = [
  { clave: 'paso.numero' },
  { clave: 'auto.seccionDq', de: { seccion: ['dq.avanzamos', 'dq.comentarios', 'dq.rPregunta', 'dq.rAjuste', 'dq.rFalla', 'dq.rIdea'] } },
];

const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const expresiones = new Map<string, { re: RegExp; nombres: string[] }>();

/** La expresión que reconoce una forma de la plantilla al principio de un texto, con lo que va entre llaves. */
function expresion(forma: string, p: Plantilla) {
  const clave = `${p.clave}\u0000${forma}`;
  let e = expresiones.get(clave);
  if (e) return e;
  const nombres: string[] = [];
  const fuente = forma.split(/(\{\w+\})/).map((x) => {
    const m = /^\{(\w+)\}$/.exec(x);
    if (!m) return escRe(x);
    nombres.push(m[1]);
    const de = p.de?.[m[1]];
    if (de) return `(${de.flatMap(formasDe).sort((a, b) => b.length - a.length).map(escRe).join('|')})`;
    return m[1] === 'n' || m[1] === 'paso' ? '(\\d+)' : '(.+?)';
  }).join('');
  e = { re: new RegExp(`^${fuente}`, 'u'), nombres };
  expresiones.set(clave, e);
  return e;
}

/** Un texto hecho solo de plantillas, una tras otra con un espacio, en el idioma de ahora; si algo no es del Studio, null. */
function enIdioma(texto: string, plantillas: Plantilla[]): string | null {
  if (!texto) return '';
  for (const p of plantillas) {
    for (const forma of formasDe(p.clave)) {
      const { re, nombres } = expresion(forma, p);
      const m = re.exec(texto);
      if (!m) continue;
      const resto = texto.slice(m[0].length);
      const siguiente = resto === '' ? '' : resto.startsWith(' ') ? enIdioma(resto.slice(1), plantillas) : null;
      if (siguiente === null) continue;
      const valores = Object.fromEntries(nombres.map((nombre, i) => {
        const v = m[i + 1];
        const suya = p.de?.[nombre]?.find((c) => formasDe(c).includes(v));
        return [nombre, suya ? t(suya) : v];
      }));
      return t(p.clave, valores) + (resto === '' ? '' : ` ${siguiente}`);
    }
  }
  return null;
}

/** Una nota que escribió el Studio por la persona, en el idioma de la interfaz, línea por línea; lo demás, como está. */
export const notaDelStudioEnIdioma = (texto: string): string => texto.split('\n').map((l) => enIdioma(l, PLANTILLAS) ?? l).join('\n');

/** El encabezado de la parte que comenta una nota («Paso 2», «Dónde quedamos › Lo que avanzamos»), en el idioma de ahora. */
export const seccionEnIdioma = (seccion: string): string => enIdioma(seccion, SECCIONES) ?? seccion;
