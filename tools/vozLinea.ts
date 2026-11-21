// La voz del narrador de «La línea del proyecto» (docs/difusion/linea-del-proyecto.html), la animación de la estación 1
// del recorrido en 3D y la portada pública: un clip por línea del guion (GUION), que dice exactamente lo que dice la
// línea, con la voz de Google (pr_voz_google): Gemini 3.8 Flash TTS y, en español, la voz de Kai (es-419-commercial-11),
// la que el titular eligió al oír el piloto (nmw2h2x5ftit). La voz manda y la animación la sigue: la herramienta quita
// el silencio de los bordes de cada clip (los silencios los pone la página, siempre iguales), iguala su volumen, mide
// cuánto dura y escribe esa pista de tiempos dentro de la página (PISTA_VOZ), que la usa para darle a cada línea su
// tiempo. Cada clip gasta la API de la clave de Google (el .env de la carpeta del Studio): sin --confirmo solo dice qué
// generaría, sin llamarla. Va por la herramienta de voz de la difusión (.stl/difusion/generar-voz.py). Es aparte de
// tools/vozRecorrido.ts: cada página con su guion y su carpeta.
// Uso: node tools/vozLinea.ts [--confirmo]            (genera los que faltan o cambiaron)
//      node tools/vozLinea.ts --todos [--confirmo]    (los vuelve a generar todos)
//      node tools/vozLinea.ts --solo <clave> --confirmo (vuelve a generar solo esa línea, la que desentona o falló)
//      node tools/vozLinea.ts --pista                 (solo vuelve a medir los clips y a escribir la pista, sin la API)
//      … --en                                         (lo mismo en inglés: GUION_EN y GLOBITOS_EN, con la voz inglesa
//                                                      en-us-commercial-8, en voz/linea-en y en PISTA_VOZ_EN)
// Cada clip se llama <momento>-<n>.mp3 (la línea n del momento, desde 1), como lo busca la página (CLAVES_VOZ), y
// textos.json guarda qué texto dijo cada uno y cuánto dura, para no regenerar lo que no cambió.
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const raiz = join(import.meta.dirname, '..');
/** La voz de Kai, en español, con su modelo y su dirección, la misma del piloto (.stl/difusion/voz-piloto). */
export const VOZ_LINEA = 'es-419-commercial-11';
export const MODELO_VOZ_LINEA = 'gemini-3.8-flash-tts';
export const ESTILO_VOZ_LINEA = 'Un narrador profesional, cálido y pausado, que cuenta el tema con calma.';
/** La voz en inglés, la gemela de Kai (en-us-commercial-8), que se quedó al oír las muestras (nmw2h2x5ftit), con la misma dirección. */
export const VOZ_LINEA_EN = 'en-us-commercial-8';
export const ESTILO_VOZ_LINEA_EN = 'A professional narrator, warm and unhurried, who tells the topic calmly.';
export const CARPETA_VOZ_LINEA = join(raiz, 'docs', 'difusion', 'voz', 'linea');
const PAGINA_LINEA = join(raiz, 'docs', 'difusion', 'linea-del-proyecto.html');
const HERRAMIENTA = join(raiz, '.stl', 'difusion', 'generar-voz.py');

/** Lo que textos.json guarda de cada clip: lo que dice y cuánto dura, en milisegundos. */
/** Lo que dijo un clip de Google y lo que dura; `entonacion`, si se generó con una indicación propia de su tono (vozRecorrido.ts › ENTONACION). */
export type ClipDicho = { texto: string; ms: number; entonacion?: string };

/** Las líneas del narrador, leídas de linea-del-proyecto.html › GUION, con la clave de su clip, en su orden. Una línea
 *  que se repite en otro momento dice lo mismo: queda con la clave de su última aparición, como la busca la página. */
export function lineasDelNarrador(html: string, en = false): { clave: string; texto: string }[] {
  const nombre = en ? 'GUION_EN' : 'GUION';
  const literal = html.match(new RegExp(`const ${nombre} = (\\{[\\s\\S]*?\\n {2}\\});`))?.[1];
  if (!literal) throw new Error(`No encontré ${nombre} en linea-del-proyecto.html.`);
  const guion = new Function(`return ${literal};`)() as Record<string, string[]>;
  const porTexto = new Map<string, string>();
  for (const [momento, lineas] of Object.entries(guion)) lineas.forEach((texto, i) => porTexto.set(texto, `${momento}-${i + 1}`));
  return [...porTexto].map(([texto, clave]) => ({ clave, texto }));
}

/** Los quince globitos de después de la meta (linea-del-proyecto.html › GLOBITOS), cada uno con su clip, globito-<n>
 *  desde 1, como lo busca la página (vozDelGlobito; pd_voz_globitos). No van en la pista: no marcan el paso de la escena. */
export function globitosDeLaMeta(html: string, en = false): { clave: string; texto: string }[] {
  const nombre = en ? 'GLOBITOS_EN' : 'GLOBITOS';
  const literal = html.match(new RegExp(`const ${nombre} = (\\[[\\s\\S]*?\\]);`))?.[1];
  if (!literal) throw new Error(`No encontré ${nombre} en linea-del-proyecto.html.`);
  return (new Function(`return ${literal};`)() as string[]).map((texto, i) => ({ clave: `globito-${i + 1}`, texto }));
}

/** La pista de tiempos escrita dentro de la página: una sola línea, clave → milisegundos, en el orden del guion. En
 *  inglés, PISTA_VOZ_EN, con las líneas de GUION_EN (pd_bilingue, nmw724ggptit). */
export function conPista(html: string, dichos: Record<string, ClipDicho>, en = false): string {
  const nombre = en ? 'PISTA_VOZ_EN' : 'PISTA_VOZ';
  const pista = Object.fromEntries(lineasDelNarrador(html, en).filter(({ clave }) => dichos[clave]).map(({ clave }) => [clave, dichos[clave].ms]));
  const linea = `const ${nombre} = ${JSON.stringify(pista)};`;
  const busca = new RegExp(`const ${nombre} = \\{[^\\n]*\\};`);
  if (!busca.test(html)) throw new Error(`No encontré ${nombre} en linea-del-proyecto.html.`);
  return html.replace(busca, () => linea);
}

/** Cada idioma, con su voz, su dirección y su carpeta: el español, Kai; el inglés, su gemela (nmw724ggptit). */
export const CARPETA_VOZ_LINEA_EN = join(raiz, 'docs', 'difusion', 'voz', 'linea-en');
export const vozDelIdioma = (en: boolean) => (en
  ? { voz: VOZ_LINEA_EN, estilo: ESTILO_VOZ_LINEA_EN, carpeta: CARPETA_VOZ_LINEA_EN }
  : { voz: VOZ_LINEA, estilo: ESTILO_VOZ_LINEA, carpeta: CARPETA_VOZ_LINEA });

/** Google deja pedir 10 clips por minuto a este modelo: uno cada 6,5 segundos, y tras un «429» se espera lo que pide. */
export const ENTRE_PEDIDOS_MS = 6500;
export const REINTENTOS = 3;
/** Cuánto pide esperar un «429» de Google («Please retry in 5.28s»), en milisegundos; sin decirlo, un minuto. */
export const esperaPedida = (salida: string) => {
  const s = /retry in ([\d.]+)s/i.exec(salida)?.[1];
  return s ? Math.ceil(Number.parseFloat(s) * 1000) + 500 : 60_000;
};
/** Un «429» por la cuota del día (no la del minuto): no se reintenta, y la herramienta se detiene sin pedir más. */
export const sinCuotaDelDia = (salida: string) => /respondió 429/.test(salida) && /per_?day|PerDay/i.test(salida);
export const SIN_CUOTA = 'Se acabó la cuota del día de Google para este modelo:';
const dormir = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** Cuánto dura un clip, en milisegundos, según ffprobe. */
export function duracion(mp3: string): number {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3], { encoding: 'utf8' });
  const s = Number.parseFloat(r.stdout);
  if (r.status !== 0 || !Number.isFinite(s)) throw new Error(`ffprobe no pudo medir ${mp3}: ${r.stderr}`);
  return Math.round(s * 1000);
}

/**
 * Un clip con la voz de Google, por la herramienta de voz de la difusión: lo pide (al paso que deja Google, y tras un
 * «429», esperando lo que pide), le quita el silencio de los bordes, iguala su volumen y lo deja en MP3. Gasta la API:
 * solo se llama con el «Confirmo» del titular. Devuelve lo que dura, en milisegundos, o el error. Lo usan esta
 * herramienta y la del recorrido (tools/vozRecorrido.ts), con la misma voz.
 */
export function clipDeGoogle(clave: string, texto: string, mp3: string, temporal: string, paso: { ultimo: number }, estilo = ESTILO_VOZ_LINEA, voz_ = VOZ_LINEA): { ms: number } | { error: string } {
  const txt = join(temporal, `${clave}.txt`), wav = join(temporal, `${clave}.wav`);
  writeFileSync(txt, texto, 'utf8');
  let voz: SpawnSyncReturns<string> | null = null;
  for (let intento = 0; intento <= REINTENTOS; intento++) {
    const falta = ENTRE_PEDIDOS_MS - (Date.now() - paso.ultimo);
    if (falta > 0) dormir(falta);
    paso.ultimo = Date.now();
    voz = spawnSync('python', [HERRAMIENTA, txt, wav, `--modelo=${MODELO_VOZ_LINEA}`, `--voz=${voz_}`, `--estilo=${estilo}`, '--confirmo'], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
    const dijo = `${voz.stderr}${voz.stdout}`;
    // Sin la cuota del día (100 pedidos a este modelo), esperar un minuto no sirve: se detiene y lo dice
    if (voz.status !== 0 && sinCuotaDelDia(dijo)) return { error: `${SIN_CUOTA} ${dijo.trim()}` };
    if (voz.status === 0 || !/respondió 429/.test(dijo) || intento === REINTENTOS) break;
    console.log(`${clave}: Google pide esperar; reintento en ${Math.round(esperaPedida(dijo) / 1000)} s.`);
    dormir(esperaPedida(dijo));
  }
  if (!voz || voz.status !== 0 || !existsSync(wav)) return { error: (voz?.stderr || voz?.stdout || '').trim() };
  // Sin el silencio de los bordes (las pausas las pone la página), con el volumen igualado entre clips, mono, 24 kHz
  // como sale de Gemini, a 48 kbps: se entiende bien y pesa poco
  const filtro = 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,loudnorm=I=-16:TP=-1.5:LRA=11';
  const comp = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-af', filtro, '-ar', '24000', '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '48k', mp3], { encoding: 'utf8' });
  if (comp.status !== 0) return { error: `ffmpeg: ${comp.stderr}` };
  return { ms: duracion(mp3) };
}
export const HERRAMIENTA_VOZ = HERRAMIENTA;

if (process.argv[1]?.endsWith('vozLinea.ts')) {
  const args = process.argv.slice(2);
  const todos = args.includes('--todos'), confirmo = args.includes('--confirmo'), soloPista = args.includes('--pista');
  const solo = args.includes('--solo') ? args[args.indexOf('--solo') + 1] : null;
  // --en: el guion en inglés (GUION_EN y GLOBITOS_EN), con la voz inglesa, en voz/linea-en y en PISTA_VOZ_EN (nmw724ggptit)
  const en = args.includes('--en');
  const { voz: VOZ, estilo: ESTILO, carpeta: CARPETA } = vozDelIdioma(en);
  const html = readFileSync(PAGINA_LINEA, 'utf8');
  // Las líneas del narrador y, después, los globitos de después de la meta (pd_voz_globitos)
  const lineas = [...lineasDelNarrador(html, en), ...globitosDeLaMeta(html, en)];
  if (solo && !lineas.some((l) => l.clave === solo)) { console.error(`No hay una línea «${solo}» en el guion.`); process.exit(1); }
  mkdirSync(CARPETA, { recursive: true });
  const indice = join(CARPETA, 'textos.json');
  const antes: Record<string, ClipDicho | string> = existsSync(indice) ? JSON.parse(readFileSync(indice, 'utf8')) : {};
  // Las de antes guardaban solo el texto (las de Kokoro): esas se vuelven a generar con la voz de Google
  const dichoAntes = (clave: string) => { const d = antes[clave]; return typeof d === 'object' ? d : null; };
  const faltan = lineas.filter(({ clave, texto }) => !soloPista && (solo ? clave === solo
    : todos || dichoAntes(clave)?.texto !== texto || !existsSync(join(CARPETA, `${clave}.mp3`))));
  if (faltan.length && !confirmo) {
    console.log(`Generaría ${faltan.length} clips con ${MODELO_VOZ_LINEA} y la voz ${VOZ} (${faltan.reduce((s, l) => s + l.texto.length, 0)} caracteres). Cada uno gasta la API: repite la orden con --confirmo.`);
    process.exit(0);
  }
  if (faltan.length && !existsSync(HERRAMIENTA)) { console.error(`Falta la herramienta de voz: ${HERRAMIENTA}.`); process.exit(1); }
  const temporal = mkdtempSync(join(tmpdir(), 'voz-linea-'));
  const despues: Record<string, ClipDicho> = {}, viejos: Record<string, string> = {};
  const fallaron: string[] = [];
  let hechos = 0;
  const paso = { ultimo: 0 };
  try {
    for (const { clave, texto } of lineas) {
      const mp3 = join(CARPETA, `${clave}.mp3`);
      if (!faltan.some((l) => l.clave === clave)) {
        // Lo que ya era de Google queda con su tiempo; lo de antes (solo su texto) queda como estaba, para la próxima vez
        const previo = dichoAntes(clave);
        if (previo && existsSync(mp3)) despues[clave] = soloPista ? { texto: previo.texto, ms: duracion(mp3) } : previo;
        else if (typeof antes[clave] === 'string') viejos[clave] = antes[clave] as string;
        continue;
      }
      const hecho = clipDeGoogle(clave, texto, mp3, temporal, paso, ESTILO, VOZ);
      if ('error' in hecho) {
        console.error(`La voz falló en ${clave} («${texto}»): ${hecho.error}`);
        fallaron.push(clave);
        if (hecho.error.startsWith(SIN_CUOTA)) break;
        const previo = dichoAntes(clave);
        if (previo && existsSync(mp3)) despues[clave] = previo;
        else if (typeof antes[clave] === 'string') viejos[clave] = antes[clave] as string;
        continue;
      }
      despues[clave] = { texto, ms: hecho.ms };
      hechos++;
      console.log(`${clave} (${despues[clave].ms} ms): ${texto}`);
    }
  } finally {
    rmSync(temporal, { recursive: true, force: true });
  }
  // En el orden del guion
  const todosLosDichos = Object.fromEntries(lineas.flatMap(({ clave }) => (despues[clave] ? [[clave, despues[clave]]] : viejos[clave] ? [[clave, viejos[clave]]] : [])));
  writeFileSync(indice, `${JSON.stringify(todosLosDichos, null, 2)}\n`);
  writeFileSync(PAGINA_LINEA, conPista(html, despues, en));
  console.log(`Listo: ${hechos} clips nuevos, ${Object.keys(despues).length} de ${lineas.length} con su clip (los del guion, con su tiempo en la pista).`);
  if (fallaron.length) { console.error(`Fallaron ${fallaron.length}: ${fallaron.join(', ')}. Se vuelve a generar solo esa con --solo <clave> --confirmo.`); process.exit(1); }
}
