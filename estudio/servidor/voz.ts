// Las voces de Kokoro del Studio, las únicas, locales y sin internet: corre tools/director/voz.py con el mismo Python
// que la transcripción (el de ~/director/.venv, sin WSL; ver pythonDelDirector). Dos rutas: GET /__estudio/voz/lista (las voces
// instaladas, con 60 s de memoria) y POST /__estudio/voz/hablar {voz, texto} (un WAV). Sin Python o sin el paquete, la
// lista sale vacía, con su motivo (qué falta y cómo instalarlo), y hablar lo repite: nunca se cae el Studio por una voz
// que falta.
//
// Para hablar, el proceso de la voz se queda abierto (voz.py --servidor), con el modelo cargado, y atiende los bloques
// uno tras otro: antes, cada bloque esperaba a que arrancara Python y se cargara el modelo (nota de voz del
// titular nmvot5hg8tit, 26 de octubre de 2026: «no es funcional la voz con delay»). Diez minutos sin pedidos, se cierra.
// Cada pregunta del texto se lee aparte, para que suene como pregunta, con el tono subido al final, y los audios salen unidos
// en un solo WAV (sintetizar).
//
// Lo sintetizado se guarda en el computador (audioGuardado): POST /__estudio/voz/preparar {voz, texto} lo prepara en
// segundo plano sin devolverlo, y cuando la página lo pide con /hablar ya está y sale sin esperar (pedido pd_voz_precarga).
import { execFile, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { t } from '../src/textos.ts';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import { comandoVoz } from '../../src/director/transcripcion.ts';
import { comoInstalarKokoro, leerAvisosVoces, leerListaVoces, MAX_TEXTO_VOZ, motivoSinVoces, partirPreguntas, revisarPedidoDeVoz, unirWavs, type VozNatural } from '../../src/director/voz.ts';
import { anotar, EL_STUDIO } from '../../src/director/bitacora.ts';

/**
 * Cada falla de la voz, a la bitácora de este computador (nota de voz urgente del titular nmw46uyrytit, 5 de noviembre de
 * 2026: «confirma si estamos dejando un log para este tipo de errores de voz»; no lo había, y sin él no se podía saber por
 * qué se apagó). Dice qué falló, por qué, cuánto esperó y cuánto texto era; nunca el texto. Pura.
 */
export function lineaDeFallaDeVoz(o: { donde: string; motivo: string; ms?: number; letras?: number; esperaban?: number }): string {
  const partes = [`la voz de Kokoro falló (${o.donde}): ${o.motivo}`];
  if (o.ms !== undefined) partes.push(`tras ${Math.round(o.ms / 100) / 10} s`);
  if (o.letras !== undefined) partes.push(`${o.letras} letras`);
  if (o.esperaban) partes.push(`${o.esperaban} ${o.esperaban === 1 ? 'pedido esperaba' : 'pedidos esperaban'}`);
  return partes.join(' · ');
}
const anotarFalla = (raiz: string, o: Parameters<typeof lineaDeFallaDeVoz>[0], desde = 'leer en voz alta') =>
  void anotar(raiz, { quien: EL_STUDIO, que: lineaDeFallaDeVoz(o), desde });

const MEMORIA_MS = 60_000;
const ESPERA_LISTA_MS = 90_000;
const ESPERA_VOZ_MS = 3 * 60_000;
const MAX_WAV = 64 * 1024 * 1024;

let memoria: { cuando: number; voces: Promise<{ voces: VozNatural[]; motivo?: string }> } | null = null;

/** La orden que las instala, desde la carpeta del Studio: la misma para cualquiera que lo instale. */
const COMO_INSTALAR = comoInstalarKokoro(process.platform === 'win32');

/** Lo que dice el error de Python, para la persona: sin Python, sin el paquete o lo último que escribió. */
export function motivoDeFalla(e: { code?: string | number; message?: string } | null, errores: string): string {
  const ultima = errores.trim().split('\n').filter(Boolean).at(-1) ?? '';
  if (e?.code === 'ENOENT') return `No encuentro el Python del director para las voces de Kokoro. ${COMO_INSTALAR}`;
  if (/No module named|no está instalado|not installed/i.test(errores)) return `Falta el paquete de Kokoro en el Python del director. ${COMO_INSTALAR}`;
  return (ultima || e?.message || 'la voz de Kokoro falló').slice(0, 300);
}

/** La lista de voces a partir de lo que imprimió `voz.py --lista`: vacía, con el motivo (que Kokoro no está instalado y cómo instalarlo). */
export function listaDeVoces(salida: string): { voces: VozNatural[]; motivo?: string } {
  const voces = leerListaVoces(salida);
  return voces.length ? { voces } : { voces, motivo: motivoSinVoces(leerAvisosVoces(salida), COMO_INSTALAR) };
}

function correr(raiz: string, args: string[], entrada: string | null, espera: number): Promise<{ salida: Buffer; error?: string }> {
  const { cmd, args: argumentos } = comandoVoz(raiz, args);
  return new Promise((ok) => {
    const hijo = execFile(cmd, argumentos, { timeout: espera, windowsHide: true, maxBuffer: MAX_WAV, encoding: 'buffer' }, (e, salida, errores) => {
      ok(e ? { salida: Buffer.alloc(0), error: motivoDeFalla(e, String(errores)) } : { salida: salida as Buffer });
    });
    hijo.stdin?.on('error', () => {});
    hijo.stdin?.end(entrada ?? undefined);
  });
}

/** Las voces de Kokoro instaladas (vacía, con su motivo, si no hay Python, paquete o modelo), recordadas 60 s. `fresco` vuelve a mirar. */
export function vocesNaturales(raiz: string, fresco = false): Promise<{ voces: VozNatural[]; motivo?: string }> {
  if (!fresco && memoria && Date.now() - memoria.cuando < MEMORIA_MS) return memoria.voces;
  const voces = correr(raiz, ['--lista'], null, ESPERA_LISTA_MS).then((r) => (r.error ? { voces: [], motivo: r.error } : listaDeVoces(r.salida.toString('utf-8'))));
  memoria = { cuando: Date.now(), voces };
  return voces;
}

type Respuesta = { ok: true; wav: Buffer } | { ok: false; error: string };

/**
 * Lo que llegó del proceso de la voz, partido en respuestas completas (voz.py › servir: una línea JSON y, si salió, los
 * bytes del WAV) y lo que sobra, que espera al trozo siguiente. Una línea que no es JSON no es una respuesta: se salta. Pura.
 */
export function partirRespuestas(llegado: Buffer): { respuestas: Respuesta[]; resto: Buffer } {
  const respuestas: Respuesta[] = [];
  let resto = llegado;
  for (let fin = resto.indexOf(10); fin >= 0; fin = resto.indexOf(10)) {
    let cabeza: { ok?: unknown; bytes?: unknown; error?: unknown } | null = null;
    try {
      cabeza = JSON.parse(resto.subarray(0, fin).toString('utf-8'));
    } catch {
      // algo que imprimió un motor por su cuenta
    }
    if (cabeza?.ok === true && typeof cabeza.bytes === 'number') {
      if (resto.length < fin + 1 + cabeza.bytes) break;
      respuestas.push({ ok: true, wav: Buffer.from(resto.subarray(fin + 1, fin + 1 + cabeza.bytes)) });
      resto = resto.subarray(fin + 1 + cabeza.bytes);
      continue;
    }
    if (cabeza && cabeza.ok === false) respuestas.push({ ok: false, error: String(cabeza.error || t('servidor.vozFallo')) });
    resto = resto.subarray(fin + 1);
  }
  return { respuestas, resto };
}

/** Diez minutos sin pedidos y el proceso de la voz se cierra, para no tener el modelo en memoria sin usarlo. */
const INACTIVO_MS = 10 * 60_000;

/**
 * La voz no se apaga por un bloque que tarda (propuesta aceptada pr_voz_sin_apagones, 5 de noviembre de 2026). Antes, cada
 * pedido se escribía al proceso en cuanto llegaba y su plazo de 3 minutos contaba desde la fila: si uno tardaba, se cerraba
 * el proceso y todo lo que esperaba fallaba junto, también el bloque que se estaba oyendo. Ahora:
 * 1) la fila es del Studio y el proceso recibe un pedido a la vez, así que el plazo de cada audio empieza cuando el proceso
 *    empieza a hacerlo (atender);
 * 2) lo que se lee (`urgente`) pasa delante de lo que se prepara de antemano (siguienteDeLaFila), y un audio de antemano que
 *    se pide para leer mientras se prepara pasa delante con él (audioGuardado);
 * 3) si el proceso se cae, el pedido que estaba haciendo se vuelve a pedir una vez a un proceso nuevo, y los que esperaban
 *    siguen en la fila: no fallan junto con él. El que pasó su plazo sí falla (es el que tarda), y los demás siguen.
 */
export type Prioridad = { urgente: boolean };
type Pedido = { voz: string; texto: string; prioridad: Prioridad; reintentado: boolean; ok: (wav: Buffer) => void; mal: (e: Error) => void };
type Trabajador = {
  hijo: ChildProcessWithoutNullStreams; llegado: Buffer; errores: string; enCurso: Pedido | null;
  reloj?: ReturnType<typeof setTimeout>; plazo?: ReturnType<typeof setTimeout>; vencido?: boolean; cerrado?: boolean;
};
const fila: Pedido[] = [];
let trabajador: Trabajador | null = null;
let plazoDeVoz = ESPERA_VOZ_MS;
/** Otro plazo por audio (para las pruebas, con un proceso falso que tarda); devuelve el de antes. */
export function ponerPlazoDeVoz(ms: number): number {
  const antes = plazoDeVoz;
  plazoDeVoz = ms;
  return antes;
}

/** El pedido que el proceso hace después: el primero de lo que se lee y, si no hay, el primero de lo que se prepara; -1 sin ninguno. Pura. */
export function siguienteDeLaFila(pedidos: readonly { prioridad: Prioridad }[]): number {
  const urgente = pedidos.findIndex((p) => p.prioridad.urgente);
  return urgente >= 0 ? urgente : pedidos.length ? 0 : -1;
}

function dormir(t: Trabajador) {
  clearTimeout(t.reloj);
  t.reloj = setTimeout(() => (t.enCurso || fila.length ? dormir(t) : t.hijo.stdin.end()), INACTIVO_MS);
  t.reloj.unref?.();
}

/** Si el proceso está libre, le da el pedido que sigue, y su plazo empieza aquí, cuando lo empieza a hacer. */
function atender(t: Trabajador) {
  if (t.enCurso || t.cerrado || trabajador !== t) return;
  const i = siguienteDeLaFila(fila);
  if (i < 0) return;
  const [p] = fila.splice(i, 1);
  t.enCurso = p;
  t.plazo = setTimeout(() => ((t.vencido = true), t.hijo.kill()), plazoDeVoz);
  t.hijo.stdin.write(`${JSON.stringify({ voz: p.voz, texto: p.texto })}\n`);
}

/**
 * El Studio lee en voz alta con las pausas de la puntuación, como el narrador del recorrido: calla un momento en cada
 * coma, punto y signo (voz.py › trozos_con_pausa; lo eligió el titular en t_decide_pausas_studio, nmw2csik4tit).
 */
export const ARGS_DEL_TRABAJADOR = ['--servidor', '--pausas'];

function abrirTrabajador(raiz: string): Trabajador {
  const { cmd, args } = comandoVoz(raiz, ARGS_DEL_TRABAJADOR);
  const hijo = spawn(cmd, args, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  const t: Trabajador = { hijo, llegado: Buffer.alloc(0), errores: '', enCurso: null };
  // Si se cierra (o no arranca): el pedido que hacía se vuelve a pedir una vez a otro proceso (si no fue el que pasó su
  // plazo), lo que esperaba en la fila sigue allí, y si queda algo, se abre otro proceso para hacerlo
  const cerrar = (e: { code?: string | number; message?: string }) => {
    if (t.cerrado) return;
    t.cerrado = true;
    if (trabajador === t) trabajador = null;
    clearTimeout(t.reloj);
    clearTimeout(t.plazo);
    const motivo = motivoDeFalla(e, t.errores);
    const p = t.enCurso;
    t.enCurso = null;
    const reintenta = !!p && !t.vencido && !p.reintentado;
    if (p && reintenta) {
      p.reintentado = true;
      fila.unshift(p);
    }
    // Cerrarse sin nada pendiente (los diez minutos sin uso) no es una falla; con un pedido a medias o por plazo vencido, sí
    if (p || t.vencido) anotarFalla(raiz, { donde: t.vencido ? 'un bloque no llegó en su plazo y se cerró el proceso de la voz' : reintenta ? 'el proceso de la voz se cerró; su pedido se vuelve a pedir una vez' : 'el proceso de la voz se cerró', motivo: `${motivo} (código ${e.code ?? '?'})`, esperaban: fila.length });
    if (p && !reintenta) p.mal(new Error(motivo));
    if (fila.length) atender(abrirTrabajador(raiz));
  };
  hijo.stdout.on('data', (trozo: Buffer) => {
    const { respuestas, resto } = partirRespuestas(Buffer.concat([t.llegado, trozo]));
    t.llegado = resto;
    for (const r of respuestas) {
      const p = t.enCurso;
      clearTimeout(t.plazo);
      t.enCurso = null;
      if (r.ok) p?.ok(r.wav);
      else p?.mal(new Error(motivoDeFalla({ code: 1 }, r.error)));
    }
    // Después de que quien esperaba siga (el fragmento siguiente de lo que se lee entra antes a la fila)
    if (respuestas.length) setImmediate(() => atender(t));
  });
  hijo.stderr.on('data', (trozo: Buffer) => (t.errores = (t.errores + trozo.toString('utf-8')).slice(-4000)));
  hijo.stdin.on('error', () => {});
  hijo.on('error', (e: NodeJS.ErrnoException) => cerrar(e));
  hijo.on('exit', (codigo) => cerrar({ code: codigo ?? 1, message: 'el proceso de la voz de Kokoro se cerró' }));
  trabajador = t;
  return t;
}

/** El WAV de este texto, pedido al proceso de la voz que se queda abierto (lo abre si no está), por la fila del Studio. */
function hablarConTrabajador(raiz: string, voz: string, texto: string, prioridad: Prioridad = { urgente: true }): Promise<Buffer> {
  const t = trabajador ?? abrirTrabajador(raiz);
  dormir(t);
  return new Promise((ok, mal) => {
    fila.push({ voz, texto, prioridad, reintentado: false, ok, mal });
    atender(t);
  });
}

/**
 * El WAV de este texto con esta voz (una de las instaladas); un Error con el motivo si no se pudo. Cada pregunta se
 * sintetiza aparte, con su «¿» y su «?», una tras otra con la misma voz, para que suene como pregunta (pedido
 * pd_voz_preguntas), y los audios se unen en un solo WAV, así que la página sigue recibiendo uno. Un texto sin preguntas va
 * en una llamada, como siempre, y uno que es una sola pregunta también. El audio sale como lo da Kokoro: subirle el tono al
 * final de cada pregunta (pedido pd_voz_pregunta_final) no se oía como pregunta, y subirlo más lo hacía sonar raro; nadie ha
 * resuelto la entonación de pregunta de Kokoro, así que se dejó (nota de voz del titular nmvrf5547tit, 28 de octubre de 2026).
 */
async function sintetizar(raiz: string, voz: unknown, texto: unknown, prioridad: Prioridad = { urgente: true }): Promise<Uint8Array> {
  const { voces, motivo } = await vocesNaturales(raiz);
  const pedido = revisarPedidoDeVoz(voz, texto, voces);
  if (!pedido.ok) throw new Error(voces.length ? pedido.error : motivo || pedido.error);
  const wavs: Uint8Array[] = [];
  for (const fragmento of partirPreguntas(pedido.texto)) {
    const wav = await hablarConTrabajador(raiz, pedido.voz, fragmento, prioridad);
    if (wav.length < 64) throw new Error(t('servidor.vozSinAudio'));
    wavs.push(wav);
  }
  const unido = unirWavs(wavs);
  if (!unido) throw new Error(t('servidor.vozNoSeUne'));
  return unido;
}

/**
 * La voz preparada de antemano, guardada en el computador (pedido pd_voz_precarga; notas de voz del titular nmvv3a0dwtit,
 * nmvv4jgrktit y nmvvad35wtit, 30 de octubre de 2026): cada audio sintetizado queda en un archivo, con el nombre que sale
 * de su voz y su texto, en la caché de node_modules (fuera de git, como la de Vite). Un texto ya preparado no se vuelve a
 * sintetizar, ni al recargar la página, y uno que se está preparando no se pide dos veces: el que llega después espera al
 * mismo. Guarda hasta TOPE_DE_AUDIOS (elección del titular nmvzo70a4tit, 2 de noviembre de 2026); al pasarlo, los más viejos
 * salen, solo de esa carpeta: son lo único que el Studio puede volver a preparar.
 */
export const TOPE_DE_AUDIOS = 1024 ** 3;
export const carpetaDeAudios = (raiz: string) => join(raiz, 'node_modules', '.cache', 'stl-voz');
// Con «pausas» en su nombre: lo guardado antes, leído de corrido, no vuelve a sonar (nmw2csik4tit)
export const archivoDeAudio = (voz: string, texto: string) => `${createHash('sha256').update(`${voz}\n${texto}\npausas`).digest('hex').slice(0, 40)}.wav`;
const preparandose = new Map<string, { pedido: Promise<Uint8Array>; prioridad: Prioridad }>();

/** Los archivos que salen para quedar por debajo del tope: los más viejos primero, y nunca el último que se guardó. Pura. */
export function audiosQueSalen(audios: readonly { nombre: string; cuando: number; bytes: number }[], tope: number): string[] {
  const viejosPrimero = [...audios].sort((a, b) => a.cuando - b.cuando);
  let total = viejosPrimero.reduce((s, a) => s + a.bytes, 0);
  const salen: string[] = [];
  for (const a of viejosPrimero.slice(0, -1)) {
    if (total <= tope) break;
    salen.push(a.nombre);
    total -= a.bytes;
  }
  return salen;
}

async function podar(carpeta: string, tope: number) {
  const nombres = (await readdir(carpeta)).filter((n) => n.endsWith('.wav'));
  const audios = await Promise.all(nombres.map(async (nombre) => {
    const s = await stat(join(carpeta, nombre)).catch(() => null);
    return { nombre, cuando: s?.mtimeMs ?? 0, bytes: s?.size ?? 0 };
  }));
  for (const n of audiosQueSalen(audios, tope)) await unlink(join(carpeta, n)).catch(() => {});
}

export async function audioGuardado(
  raiz: string, voz: unknown, texto: unknown,
  hacer: (raiz: string, voz: unknown, texto: unknown, prioridad: Prioridad) => Promise<Uint8Array> = sintetizar, tope = TOPE_DE_AUDIOS,
  prioridad: Prioridad = { urgente: true },
): Promise<Uint8Array> {
  if (typeof voz !== 'string' || typeof texto !== 'string') return hacer(raiz, voz, texto, prioridad);
  const carpeta = carpetaDeAudios(raiz);
  const archivo = join(carpeta, archivoDeAudio(voz, texto));
  const guardado = await readFile(archivo).catch(() => null);
  if (guardado && guardado.length >= 64) return guardado;
  const ya = preparandose.get(archivo);
  // Lo que se preparaba de antemano y ahora se lee pasa delante en la fila, también sus fragmentos que faltan
  if (ya) {
    if (prioridad.urgente) ya.prioridad.urgente = true;
    return ya.pedido;
  }
  const pedido = hacer(raiz, voz, texto, prioridad)
    .then(async (wav) => {
      // Si no se puede guardar, el audio sale igual: solo se volverá a preparar
      await mkdir(carpeta, { recursive: true }).then(() => writeFile(archivo, wav)).then(() => podar(carpeta, tope)).catch(() => {});
      return wav;
    })
    .finally(() => preparandose.delete(archivo));
  preparandose.set(archivo, { pedido, prioridad });
  return pedido;
}

function responder(res: ServerResponse, codigo: number, cuerpo: unknown) {
  res.statusCode = codigo;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(cuerpo));
}

async function leerCuerpo(req: IncomingMessage): Promise<{ voz?: unknown; texto?: unknown }> {
  let datos = '';
  for await (const trozo of req) {
    datos += trozo;
    if (datos.length > MAX_TEXTO_VOZ * 8 + 1024) throw new Error(t('servidor.vozMuyLargo'));
  }
  return JSON.parse(datos || '{}');
}

/** El atendedor de /__estudio/voz: Vite lo registra con server.middlewares.use('/__estudio/voz', atenderVoz(raiz)). */
export const atenderVoz = (raiz: string) => async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url ?? '/', 'http://x');
  const ruta = url.pathname.replace(/\/+$/, '') || '/';
  try {
    if (ruta === '/lista' && req.method === 'GET') {
      const { voces, motivo } = await vocesNaturales(raiz, url.searchParams.has('fresco'));
      return responder(res, 200, { voces, motivo });
    }
    if ((ruta === '/hablar' || ruta === '/preparar' || ruta === '/falla') && req.method === 'POST') {
      // Solo el Studio la pide: una página de otro sitio no hace trabajar a las voces
      const origen = req.headers.origin;
      const sitio = req.headers['sec-fetch-site'];
      const propio = (o: string) => o === `http://${req.headers.host}` || o === `https://${req.headers.host}`;
      if ((origen && !propio(origen)) || (sitio && sitio !== 'same-origin' && sitio !== 'none')) return responder(res, 403, { error: t('servidor.noVieneDelStudio') });
      // Lo que falló en la página sin pasar por aquí (el navegador no pudo sonar el audio, o se cansó de esperar)
      if (ruta === '/falla') {
        const falla = (await leerCuerpo(req)) as { motivo?: unknown; ms?: unknown; letras?: unknown };
        anotarFalla(raiz, { donde: 'en la página', motivo: String(falla.motivo ?? '').slice(0, 300) || '?', ms: typeof falla.ms === 'number' ? falla.ms : undefined, letras: typeof falla.letras === 'number' ? falla.letras : undefined }, 'leer en voz alta, en la página');
        return responder(res, 200, { anotada: true });
      }
      const cuerpo = await leerCuerpo(req);
      const empezo = Date.now();
      // Lo que se lee va delante de lo que se prepara de antemano
      const wav = await audioGuardado(raiz, cuerpo.voz, cuerpo.texto, sintetizar, TOPE_DE_AUDIOS, { urgente: ruta === '/hablar' }).catch((e: unknown) => {
        anotarFalla(raiz, { donde: ruta === '/preparar' ? 'al preparar de antemano' : 'al leer el bloque', motivo: e instanceof Error ? e.message : String(e), ms: Date.now() - empezo, letras: typeof cuerpo.texto === 'string' ? cuerpo.texto.length : undefined });
        throw e;
      });
      // Preparar no devuelve el audio: queda guardado para cuando se lea
      if (ruta === '/preparar') return responder(res, 200, { listo: true });
      res.statusCode = 200;
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.end(wav);
    }
    return responder(res, 404, { error: t('servidor.vozSinRuta') });
  } catch (e) {
    return responder(res, 503, { error: e instanceof Error ? e.message : String(e) });
  }
};
