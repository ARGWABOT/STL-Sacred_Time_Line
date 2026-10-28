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
import { execFile, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { comandoVoz } from '../../src/director/transcripcion';
import { comoInstalarKokoro, leerAvisosVoces, leerListaVoces, MAX_TEXTO_VOZ, motivoSinVoces, partirPreguntas, revisarPedidoDeVoz, unirWavs, type VozNatural } from '../../src/director/voz';

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
    if (cabeza && cabeza.ok === false) respuestas.push({ ok: false, error: String(cabeza.error || 'La voz de Kokoro falló.') });
    resto = resto.subarray(fin + 1);
  }
  return { respuestas, resto };
}

/** Diez minutos sin pedidos y el proceso de la voz se cierra, para no tener el modelo en memoria sin usarlo. */
const INACTIVO_MS = 10 * 60_000;
type Espera = { ok: (wav: Buffer) => void; mal: (e: Error) => void };
type Trabajador = { hijo: ChildProcessWithoutNullStreams; esperan: Espera[]; llegado: Buffer; errores: string; reloj?: ReturnType<typeof setTimeout> };
let trabajador: Trabajador | null = null;

function dormir(t: Trabajador) {
  clearTimeout(t.reloj);
  t.reloj = setTimeout(() => (t.esperan.length ? dormir(t) : t.hijo.stdin.end()), INACTIVO_MS);
  t.reloj.unref?.();
}

function abrirTrabajador(raiz: string): Trabajador {
  const { cmd, args } = comandoVoz(raiz, ['--servidor']);
  const hijo = spawn(cmd, args, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  const t: Trabajador = { hijo, esperan: [], llegado: Buffer.alloc(0), errores: '' };
  // Si se cierra (o no arranca), lo que esperaba sabe por qué, y el pedido siguiente abre otro
  const cerrar = (e: { code?: string | number; message?: string }) => {
    if (trabajador === t) trabajador = null;
    clearTimeout(t.reloj);
    const motivo = motivoDeFalla(e, t.errores);
    t.esperan.splice(0).forEach((x) => x.mal(new Error(motivo)));
  };
  hijo.stdout.on('data', (trozo: Buffer) => {
    const { respuestas, resto } = partirRespuestas(Buffer.concat([t.llegado, trozo]));
    t.llegado = resto;
    for (const r of respuestas) {
      const x = t.esperan.shift();
      if (r.ok) x?.ok(r.wav);
      else x?.mal(new Error(motivoDeFalla({ code: 1 }, r.error)));
    }
  });
  hijo.stderr.on('data', (trozo: Buffer) => (t.errores = (t.errores + trozo.toString('utf-8')).slice(-4000)));
  hijo.stdin.on('error', () => {});
  hijo.on('error', (e: NodeJS.ErrnoException) => cerrar(e));
  hijo.on('exit', (codigo) => cerrar({ code: codigo ?? 1, message: 'el proceso de la voz de Kokoro se cerró' }));
  trabajador = t;
  return t;
}

/** El WAV de este texto, pedido al proceso de la voz que se queda abierto (lo abre si no está). */
function hablarConTrabajador(raiz: string, voz: string, texto: string): Promise<Buffer> {
  const t = trabajador ?? abrirTrabajador(raiz);
  dormir(t);
  return new Promise((ok, mal) => {
    // Un bloque que no llega en su plazo cierra el proceso: lo que esperaba falla con su motivo y el siguiente abre otro
    const plazo = setTimeout(() => t.hijo.kill(), ESPERA_VOZ_MS);
    t.esperan.push({
      ok: (wav) => (clearTimeout(plazo), ok(wav)),
      mal: (e) => (clearTimeout(plazo), mal(e)),
    });
    t.hijo.stdin.write(`${JSON.stringify({ voz, texto })}\n`);
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
async function sintetizar(raiz: string, voz: unknown, texto: unknown): Promise<Uint8Array> {
  const { voces, motivo } = await vocesNaturales(raiz);
  const pedido = revisarPedidoDeVoz(voz, texto, voces);
  if (!pedido.ok) throw new Error(voces.length ? pedido.error : motivo || pedido.error);
  const wavs: Uint8Array[] = [];
  for (const fragmento of partirPreguntas(pedido.texto)) {
    const wav = await hablarConTrabajador(raiz, pedido.voz, fragmento);
    if (wav.length < 64) throw new Error('La voz de Kokoro no devolvió audio.');
    wavs.push(wav);
  }
  const unido = unirWavs(wavs);
  if (!unido) throw new Error('La voz de Kokoro devolvió audios que no se pueden unir en uno.');
  return unido;
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
    if (datos.length > MAX_TEXTO_VOZ * 8 + 1024) throw new Error('El texto es demasiado largo para leerlo con una voz de Kokoro.');
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
    if (ruta === '/hablar' && req.method === 'POST') {
      // Solo el Studio la pide: una página de otro sitio no hace trabajar a las voces
      const origen = req.headers.origin;
      const sitio = req.headers['sec-fetch-site'];
      const propio = (o: string) => o === `http://${req.headers.host}` || o === `https://${req.headers.host}`;
      if ((origen && !propio(origen)) || (sitio && sitio !== 'same-origin' && sitio !== 'none')) return responder(res, 403, { error: 'Esa petición no viene del Studio.' });
      const cuerpo = await leerCuerpo(req);
      const wav = await sintetizar(raiz, cuerpo.voz, cuerpo.texto);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.end(wav);
    }
    return responder(res, 404, { error: 'No existe esa ruta de las voces.' });
  } catch (e) {
    return responder(res, 503, { error: e instanceof Error ? e.message : String(e) });
  }
};
