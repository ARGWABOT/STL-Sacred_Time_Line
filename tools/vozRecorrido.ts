// La voz de las animaciones del recorrido 3D (docs/difusion/mundo-3d.js): un clip por rótulo, que dice exactamente lo que
// el rótulo dice (decisión del titular nmw1ga4dftit). Los problemas que ya pasaron a la voz de Google (pd_voz_video,
// pr_voz_google; el primero con el «Confirmo» nmw2p37bktit) van con Gemini 3.8 Flash TTS y la voz de Kai, la del piloto de
// «La línea del proyecto» (tools/vozLinea.ts › clipDeGoogle): la voz manda y la animación la sigue, con la pista de lo
// que dura cada clip escrita dentro de mundo-3d.js (PISTA_VOZ_ES). Los demás siguen con Kokoro em_santa (nmw1fz6igtit),
// generada en este computador con tools/director/voz.py y comprimida en MP3 con ffmpeg, hasta que les llegue su turno.
// Uso: node tools/vozRecorrido.ts [--confirmo]          (genera los que faltan o cambiaron; los de Google, solo con --confirmo)
//      node tools/vozRecorrido.ts --todos [--confirmo]  (los vuelve a generar todos)
//      node tools/vozRecorrido.ts --rehacer --confirmo  (también los de ESPERAN_CONFIRMO, con su «Confirmo»)
// Cada clip se llama g<problema>-e.mp3 (el enunciado de cada gran problema, el <summary> de mundo-3d.html, con el que
// empieza su animación), s<segmento>-p<paso>.mp3 (cada paso del problema, en rojo) o s<segmento>-<paso>.mp3 (cada paso de la solución), como
// los busca mundo-3d.js (clavesDeClip), y textos.json guarda qué texto dijo cada uno (y, los de Google, cuánto dura), para
// no regenerar lo que no cambió.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pythonDelDirector } from '../src/director/transcripcion.ts';
import { clipDeGoogle, ESTILO_VOZ_LINEA, ESTILO_VOZ_LINEA_EN, SIN_CUOTA, HERRAMIENTA_VOZ, MODELO_VOZ_LINEA, VOZ_LINEA, VOZ_LINEA_EN, type ClipDicho } from './vozLinea.ts';

const raiz = join(import.meta.dirname, '..');
export const VOZ_RECORRIDO = 'kokoro:em_santa';
/** Los grandes problemas (desde 1, en el orden de la estación 2) que hablan con la voz de Google: los seis, con su
 *  «Confirmo» (el primero nmw2p37bktit, el segundo nmw2qmq0ftit, del tercero al quinto nmw2sqq8itit, el sexto nmw2slvaatit
 *  y el séptimo, el del dictado, con su guion confirmado el 6 de noviembre de 2026, nmw4f8wietit).
 *  La cuota del día de la clave (100 pedidos a este modelo) alcanzó, la tarde del 5 de noviembre de 2026, para los 61
 *  clips que faltaban (nmw2xuhhgtit). El inglés espera a que se revise su texto (nmw33ke9ytit). */
export const PROBLEMAS_CON_GOOGLE = [1, 2, 3, 4, 5, 6, 7];
/** Los clips sueltos que hablan con Google aunque su problema todavía no del todo: lo que alcanza la cuota de un día
 *  mientras un problema se pasa a Kai. Hoy, ninguno. */
export const SUELTOS_CON_GOOGLE: string[] = [];
/** Lo que falta para que un problema hable con Kai, con su «Confirmo»: los problemas y las frases nuevas que cambian en
 *  PASOS_SEG junto con su clip, para que el rótulo y la voz digan lo mismo. Hoy, nada: la última, «y este queda en la
 *  ruta donde debe ir» (s3-6, nmw2r873etit), suena con su clip desde el 5 de noviembre de 2026. */
export const CON_GOOGLE_FALTAN: { problemas: number[]; frasesNuevas: Record<string, string> } = { problemas: [], frasesNuevas: {} };
export const ESPERAN_CONFIRMO: string[] = [];
/** Los clips que todavía no se generan (el generador los salta y mundo-3d.js no los pide, SIN_VOZ_TODAVIA), mientras un
 *  problema nuevo espera su voz. Hoy, ninguno: el sexto, «¿Te quedaste sin internet…?», habla entero con Kai desde el 5
 *  de noviembre de 2026. */
export const SIN_VOZ_TODAVIA: string[] = [];
export const VOZ_GOOGLE_RECORRIDO = { modelo: MODELO_VOZ_LINEA, voz: VOZ_LINEA };
/**
 * Los clips de Google que llevan una indicación propia de su tono, además del estilo del narrador: el clip se vuelve a
 * generar (con --confirmo) mientras textos.json no diga que salió con esa indicación. A la voz le llega su frase con punto
 * final, para que cierre afirmando; el rótulo no cambia. «sin explicarle al modelo a qué parte te refieres» (s4-6) subía
 * el tono al final y sonaba a pregunta (nota de voz del titular nmw46qjootit, 5 de noviembre de 2026).
 */
export const ENTONACION: Record<string, string> = {
  's4-6': `${ESTILO_VOZ_LINEA} Esta frase continúa la anterior y la cierra afirmando, con el tono que baja al final: no es una pregunta.`,
};
/** Lo que se le manda a la voz para este rótulo: con su indicación de tono, la frase con su punto final. Pura. */
export function textoParaLaVoz(clave: string, texto: string): string {
  return ENTONACION[clave] && !/[.!?…]$/.test(texto) ? `${texto}.` : texto;
}
const CARPETA_VOZ = join(raiz, 'docs', 'difusion', 'voz', 'es');
const MUNDO = join(raiz, 'docs', 'difusion', 'mundo-3d.js');

// Con los guiones del 4 de noviembre (nmw24lltqtit a nmw27jyxjtit), el problema también va en pasos, frase por frase
type Paso = { problema: [number, string][]; solucion: [number, string][] };

/** El enunciado de cada gran problema, el <summary> de la estación 2 de mundo-3d.html, con la clave de su clip (g<problema>-e,
 *  como lo pide mundo-3d.js › claveEnunciado): cada animación empieza diciéndolo (nota de voz nmw1olvthtit). */
export function enunciadosDelRecorrido(html: string): { clave: string; texto: string }[] {
  return [...html.matchAll(/<details class="problema" data-resuelve="(\d+)"[^>]*><summary>([^<]+)<\/summary>/g)]
    .map((m) => ({ clave: `g${Number(m[1]) + 1}-e`, texto: m[2].trim() }));
}

const pasosDe = (js: string): Paso[] => {
  const literal = js.match(/const PASOS_SEG = (\[[\s\S]*?\n\]);/)?.[1];
  if (!literal) throw new Error('No encontré PASOS_SEG en mundo-3d.js.');
  return new Function(`return ${literal};`)() as Paso[];
};

/** El cierre de cada segmento (mundo-3d.js › CIERRES; nota de voz nmw3ruscptit): [lo resuelto, la frase de su voz]. */
function cierresDe(js: string): [string, string][] {
  const literal = js.match(/const CIERRES = (\[[\s\S]*?\n\]);/)?.[1];
  if (!literal) throw new Error('No encontré CIERRES en mundo-3d.js.');
  return new Function(`return ${literal};`)() as [string, string][];
}

/** «Cómo empezar», la estación 3 (pd_como_empezar; su guion, confirmado el 6 de noviembre de 2026, nmw4f5xg4tit): sus
 *  siete escenas y su cierre, leídos de mundo-3d.js › GUION_COMO, con la clave de su clip (como-1 … como-7 y como-c,
 *  mundo-3d.js › claveDeComo). Todos hablan con Kai, la voz de Google. */
export function guionComoEmpezar(js: string): { clave: string; texto: string }[] {
  const literal = js.match(/const GUION_COMO = (\{[\s\S]*?\n\});/)?.[1];
  if (!literal) return [];
  const guion = new Function(`return ${literal};`)() as { escenas: string[]; cierre: string };
  return [...guion.escenas.map((texto, k) => ({ clave: `como-${k + 1}`, texto })), { clave: 'como-c', texto: guion.cierre }];
}

/** Los rótulos de cada segmento, leídos de mundo-3d.js › PASOS_SEG, con la clave de su clip, y su cierre (s<segmento>-c,
 *  mundo-3d.js › claveDeCierre); con la página, también los enunciados de los grandes problemas, primero; y al final, los
 *  de «Cómo empezar». Las frases de «Cómo funciona» salieron con su estación (nmw40cp3jtit, nmw40fizktit). */
export function rotulosDelRecorrido(js: string, html?: string): { clave: string; texto: string }[] {
  const cierres = cierresDe(js);
  return [
    ...(html === undefined ? [] : enunciadosDelRecorrido(html)),
    ...pasosDe(js).flatMap((p, j) => [
      ...p.problema.map(([, texto], m) => ({ clave: `s${j + 1}-p${m + 1}`, texto })),
      ...p.solucion.map(([, texto], m) => ({ clave: `s${j + 1}-${m + 1}`, texto })),
      ...(cierres[j] ? [{ clave: `s${j + 1}-c`, texto: cierres[j][1] }] : []),
    ]),
    ...guionComoEmpezar(js),
  ];
}

/** Las claves de los clips de un gran problema (desde 1): su enunciado y los pasos de sus segmentos (mundo-3d.js › GRANDES). */
export function clavesDelProblema(js: string, problema: number): string[] {
  const grandes = JSON.parse(js.match(/const GRANDES = (\[\[[\d,\] [\]]+\]);/)?.[1] ?? 'null') as number[][] | null;
  if (!grandes?.[problema - 1]) throw new Error(`No encontré el problema ${problema} en GRANDES de mundo-3d.js.`);
  const pasos = pasosDe(js);
  const cierres = cierresDe(js);
  return [`g${problema}-e`, ...grandes[problema - 1].flatMap((j) => [
    ...pasos[j].problema.map((_, m) => `s${j + 1}-p${m + 1}`),
    ...pasos[j].solucion.map((_, m) => `s${j + 1}-${m + 1}`),
    ...(cierres[j] ? [`s${j + 1}-c`] : []),
  ])];
}

/** La pista de tiempos escrita dentro de mundo-3d.js: una sola línea, clave → milisegundos, solo de los clips de Google. */
export function conPistaRecorrido(js: string, pista: Record<string, number>): string {
  const re = /const PISTA_VOZ_ES = \{[^\n]*\};/;
  if (!re.test(js)) throw new Error('No encontré PISTA_VOZ_ES en mundo-3d.js.');
  return js.replace(re, () => `const PISTA_VOZ_ES = ${JSON.stringify(pista)};`);
}

/** «Getting started» en inglés (mundo-3d.js › GUION_COMO_EN), con las mismas claves que en español: su voz va en
 *  docs/difusion/voz/en/ con la gemela de Kai (nmw6xp1d1tit, el «Confirmo» de leonc del 7 de noviembre de 2026). */
export function guionComoEmpezarEn(js: string): { clave: string; texto: string }[] {
  const literal = js.match(/const GUION_COMO_EN = (\{[\s\S]*?\n\});/)?.[1];
  if (!literal) return [];
  const guion = new Function(`return ${literal};`)() as { escenas: string[]; cierre: string };
  return [...guion.escenas.map((texto, k) => ({ clave: `como-${k + 1}`, texto })), { clave: 'como-c', texto: guion.cierre }];
}

/** La estación 2 en inglés (pd_bilingue; su texto, leído y aprobado animación por animación, nmw74ok32tit a nmw74ra3otit;
 *  su voz, con el «Confirmo» nmw74uq8qtit): el enunciado de cada gran problema (mundo-3d.js › PROBLEMAS_EN, en el orden de
 *  la página, g<problema>-e), los pasos de cada segmento (PASOS_SEG_EN) y su cierre (CIERRES_EN), con las mismas claves que
 *  en español; al final, «Getting started». Todo con la gemela de Kai, en docs/difusion/voz/en/. */
export function rotulosDelRecorridoEn(js: string): { clave: string; texto: string }[] {
  const leer = <T>(re: RegExp, nombre: string): T => {
    const literal = js.match(re)?.[1];
    if (!literal) throw new Error(`No encontré ${nombre} en mundo-3d.js.`);
    return new Function(`return ${literal};`)() as T;
  };
  const problemas = leer<[string, string][]>(/const PROBLEMAS_EN = (\[[\s\S]*?\n {2}\]);/, 'PROBLEMAS_EN');
  const pasos = leer<Paso[]>(/const PASOS_SEG_EN = (\[[\s\S]*?\n\]);/, 'PASOS_SEG_EN');
  const cierres = leer<([string, string] | null)[]>(/const CIERRES_EN = (\[[\s\S]*?\n\]);/, 'CIERRES_EN');
  return [
    ...problemas.map(([texto], i) => ({ clave: `g${i + 1}-e`, texto })),
    ...pasos.flatMap((p, j) => [
      ...p.problema.map(([, texto], m) => ({ clave: `s${j + 1}-p${m + 1}`, texto })),
      ...p.solucion.map(([, texto], m) => ({ clave: `s${j + 1}-${m + 1}`, texto })),
      ...(cierres[j] ? [{ clave: `s${j + 1}-c`, texto: cierres[j]![1] }] : []),
    ]),
    ...guionComoEmpezarEn(js),
  ];
}

/** Las claves de la estación 2 en el orden de sus siete animaciones (GRANDES; las mismas en los dos idiomas), y después
 *  las de «Getting started». Pura. */
export function ordenDeAnimaciones(js: string): string[] {
  return [...[1, 2, 3, 4, 5, 6, 7].flatMap((p) => clavesDelProblema(js, p)), ...guionComoEmpezarEn(js).map(({ clave }) => clave)];
}

/** La pista en inglés, solo con las animaciones que tienen su voz entera: una a medias, con frases que hablan y otras
 *  calladas, se oiría rota, así que calla entera (mundo-3d.js › sinVozTodavia) hasta que la cuota de Google alcance para
 *  todas sus frases. «Getting started», cada clip que ya dice su texto. Pura. */
export function pistaDeAnimacionesEnteras(js: string, rotulos: { clave: string; texto: string }[], dichos: Record<string, ClipDicho>): Record<string, number> {
  const dice = (clave: string) => { const r = rotulos.find((x) => x.clave === clave); return !!r && dichos[clave]?.texto === r.texto; };
  const enteras = new Set([1, 2, 3, 4, 5, 6, 7].flatMap((p) => { const claves = clavesDelProblema(js, p); return claves.every(dice) ? claves : []; }));
  return Object.fromEntries(rotulos.flatMap(({ clave }) => ((clave.startsWith('como-') ? dice(clave) : enteras.has(clave)) ? [[clave, dichos[clave].ms]] : [])));
}

/** La pista de tiempos de la voz en inglés, dentro de mundo-3d.js: una sola línea, clave → milisegundos. */
export function conPistaRecorridoEn(js: string, pista: Record<string, number>): string {
  const re = /const PISTA_VOZ_EN = \{[^\n]*\};/;
  if (!re.test(js)) throw new Error('No encontré PISTA_VOZ_EN en mundo-3d.js.');
  return js.replace(re, () => `const PISTA_VOZ_EN = ${JSON.stringify(pista)};`);
}

// La voz en inglés: node tools/vozRecorrido.ts --en [--confirmo] (solo lo que falta o cambió; Google, solo con --confirmo):
// la estación 2 y «Getting started»
if (process.argv[1]?.endsWith('vozRecorrido.ts') && process.argv.includes('--en')) {
  const confirmo = process.argv.includes('--confirmo');
  const carpeta = join(raiz, 'docs', 'difusion', 'voz', 'en');
  const js = readFileSync(MUNDO, 'utf8');
  const rotulos = rotulosDelRecorridoEn(js);
  mkdirSync(carpeta, { recursive: true });
  const indice = join(carpeta, 'textos.json');
  const dichos: Record<string, ClipDicho> = existsSync(indice) ? JSON.parse(readFileSync(indice, 'utf8')) : {};
  // Animación por animación, en el orden de la estación 2: si la cuota del día corta, quedan enteras las que alcanzó
  const orden = ordenDeAnimaciones(js);
  const faltan = rotulos.filter(({ clave, texto }) => dichos[clave]?.texto !== texto || !existsSync(join(carpeta, `${clave}.mp3`)))
    .sort((a, b) => orden.indexOf(a.clave) - orden.indexOf(b.clave));
  if (faltan.length && !confirmo) {
    console.log(`Generaría ${faltan.length} clips en inglés con ${MODELO_VOZ_LINEA} y la voz ${VOZ_LINEA_EN}. Cada uno gasta la API: repite la orden con --confirmo.`);
    process.exit(0);
  }
  if (faltan.length && !existsSync(HERRAMIENTA_VOZ)) { console.error(`Falta la herramienta de voz: ${HERRAMIENTA_VOZ}.`); process.exit(1); }
  const temporal = mkdtempSync(join(tmpdir(), 'voz-recorrido-en-'));
  const guardar = () => {
    writeFileSync(indice, `${JSON.stringify(Object.fromEntries(rotulos.flatMap(({ clave }) => (dichos[clave] ? [[clave, dichos[clave]]] : []))), null, 2)}\n`);
    writeFileSync(MUNDO, conPistaRecorridoEn(readFileSync(MUNDO, 'utf8'), pistaDeAnimacionesEnteras(js, rotulos, dichos)));
  };
  const fallaron: string[] = [];
  const paso = { ultimo: 0 };
  try {
    for (const { clave, texto } of faltan) {
      const hecho = clipDeGoogle(`en-${clave}`, texto, join(carpeta, `${clave}.mp3`), temporal, paso, ESTILO_VOZ_LINEA_EN, VOZ_LINEA_EN);
      if ('error' in hecho) {
        console.error(`La voz falló en ${clave} («${texto}»): ${hecho.error}`);
        fallaron.push(clave);
        if (hecho.error.startsWith(SIN_CUOTA)) break;
        continue;
      }
      dichos[clave] = { texto, ms: hecho.ms };
      guardar();
      console.log(`${clave}: ${texto}`);
    }
  } finally {
    rmSync(temporal, { recursive: true, force: true });
  }
  guardar();
  const hechos = rotulos.filter(({ clave, texto }) => dichos[clave]?.texto === texto).length;
  console.log(`Listo: ${hechos} de ${rotulos.length} clips en inglés; faltan ${rotulos.length - hechos}. En la pista, solo las animaciones enteras.`);
  process.exit(fallaron.length ? 1 : 0);
}

if (process.argv[1]?.endsWith('vozRecorrido.ts')) {
  const todos = process.argv.includes('--todos'), confirmo = process.argv.includes('--confirmo');
  const js = readFileSync(MUNDO, 'utf8');
  const html = readFileSync(join(raiz, 'docs', 'difusion', 'mundo-3d.html'), 'utf8');
  const rotulos = rotulosDelRecorrido(js, html).filter(({ clave }) => !SIN_VOZ_TODAVIA.includes(clave));
  const deGoogle = new Set([...PROBLEMAS_CON_GOOGLE.flatMap((p) => clavesDelProblema(js, p)), ...SUELTOS_CON_GOOGLE, ...guionComoEmpezar(js).map(({ clave }) => clave)]);
  mkdirSync(CARPETA_VOZ, { recursive: true });
  const indice = join(CARPETA_VOZ, 'textos.json');
  const antes: Record<string, string | ClipDicho> = existsSync(indice) ? JSON.parse(readFileSync(indice, 'utf8')) : {};
  const textoDe = (d: string | ClipDicho | undefined) => (typeof d === 'object' ? d.texto : d);
  const rehacer = process.argv.includes('--rehacer');
  const faltan = rotulos.filter(({ clave, texto }) => (rehacer || !ESPERAN_CONFIRMO.includes(clave) || !existsSync(join(CARPETA_VOZ, `${clave}.mp3`)))
    && (todos || textoDe(antes[clave]) !== texto || !existsSync(join(CARPETA_VOZ, `${clave}.mp3`)) || (deGoogle.has(clave) && typeof antes[clave] !== 'object')
      || (deGoogle.has(clave) && !!ENTONACION[clave] && (antes[clave] as ClipDicho | undefined)?.entonacion !== ENTONACION[clave])));
  const deGoogleFaltan = faltan.filter(({ clave }) => deGoogle.has(clave));
  if (deGoogleFaltan.length && !confirmo) {
    console.log(`Generaría ${deGoogleFaltan.length} clips con ${MODELO_VOZ_LINEA} y la voz ${VOZ_LINEA} (${deGoogleFaltan.reduce((s, l) => s + l.texto.length, 0)} caracteres). Cada uno gasta la API: repite la orden con --confirmo.`);
    process.exit(0);
  }
  if (deGoogleFaltan.length && !existsSync(HERRAMIENTA_VOZ)) { console.error(`Falta la herramienta de voz: ${HERRAMIENTA_VOZ}.`); process.exit(1); }
  const kokoro = faltan.some(({ clave }) => !deGoogle.has(clave)) ? pythonDelDirector('voz') : null;
  if (kokoro && !kokoro.instalado) { console.error('Falta la voz de Kokoro en este computador (tools/entorno/instalar_voces.sh).'); process.exit(1); }
  const temporal = mkdtempSync(join(tmpdir(), 'voz-recorrido-'));
  // Lo de antes queda hasta que su clip nuevo esté hecho, y cada clip de Google se guarda en cuanto sale (textos.json y
  // la pista): si Google pide esperar mucho o la orden se corta, lo hecho no se pierde y la próxima sigue desde ahí
  const despues: Record<string, string | ClipDicho> = Object.fromEntries(rotulos.flatMap(({ clave }) => (antes[clave] === undefined ? [] : [[clave, antes[clave]]])));
  const pistaDe = () => Object.fromEntries(rotulos.flatMap(({ clave }) => { const d = despues[clave]; return deGoogle.has(clave) && typeof d === 'object' ? [[clave, d.ms]] : []; }));
  const guardar = () => {
    writeFileSync(indice, `${JSON.stringify(Object.fromEntries(rotulos.flatMap(({ clave }) => (despues[clave] === undefined ? [] : [[clave, despues[clave]]]))), null, 2)}\n`);
    writeFileSync(MUNDO, conPistaRecorrido(js, pistaDe()));
  };
  const fallaron: string[] = [];
  const paso = { ultimo: 0 };
  let hechos = 0;
  try {
    for (const { clave, texto } of rotulos) {
      const mp3 = join(CARPETA_VOZ, `${clave}.mp3`);
      if (!faltan.some((l) => l.clave === clave)) continue;
      if (deGoogle.has(clave)) {
        const hecho = clipDeGoogle(clave, textoParaLaVoz(clave, texto), mp3, temporal, paso, ENTONACION[clave] ?? ESTILO_VOZ_LINEA);
        if ('error' in hecho) {
          console.error(`La voz falló en ${clave} («${texto}»): ${hecho.error}`);
          fallaron.push(clave);
          if (hecho.error.startsWith(SIN_CUOTA)) break;
          continue;
        }
        despues[clave] = ENTONACION[clave] ? { texto, ms: hecho.ms, entonacion: ENTONACION[clave] } : { texto, ms: hecho.ms };
        guardar();
      } else {
        const wav = spawnSync(kokoro!.python, [join(raiz, 'tools', 'director', 'voz.py'), '--voz', VOZ_RECORRIDO, '--pausas'], { input: Buffer.from(texto, 'utf8'), maxBuffer: 64 * 1024 * 1024 });
        if (wav.status !== 0 || !wav.stdout?.length) { console.error(`La voz falló en «${texto}»: ${wav.stderr?.toString()}`); process.exit(1); }
        // Mono, 24 kHz como sale de Kokoro, a 40 kbps: se entiende bien y pesa poco
        const comp = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', 'pipe:0', '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '40k', mp3], { input: wav.stdout });
        if (comp.status !== 0) { console.error(`ffmpeg falló en «${clave}»: ${comp.stderr?.toString()}`); process.exit(1); }
        despues[clave] = texto;
      }
      hechos++;
      console.log(`${clave}: ${texto}`);
    }
  } finally {
    rmSync(temporal, { recursive: true, force: true });
  }
  guardar();
  const pista = pistaDe();
  console.log(`Listo: ${hechos} clips nuevos, ${rotulos.length} en total; ${Object.keys(pista).length} con la voz de Google y su tiempo en la pista.`);
  if (fallaron.length) { console.error(`Fallaron ${fallaron.length}: ${fallaron.join(', ')}.`); process.exit(1); }
}
