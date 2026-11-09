import { execFile, spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { VOCES_DEL_STUDIO } from '../../src/director/voz';
import { archivoDeAudio, ARGS_DEL_TRABAJADOR, atenderVoz, audioGuardado, audiosQueSalen, carpetaDeAudios, lineaDeFallaDeVoz, listaDeVoces, motivoDeFalla, partirRespuestas, ponerPlazoDeVoz, siguienteDeLaFila, TOPE_DE_AUDIOS } from './voz';

// Ni Python ni WSL ni Kokoro: el que lista las voces y el proceso de la voz son falsos (los arma «la voz lee las preguntas aparte»)
vi.mock('node:child_process', () => ({ execFile: vi.fn(), spawn: vi.fn() }));

const leer = (ruta: string) => readFileSync(join(process.cwd(), ruta), 'utf8');

describe('las voces de Kokoro en el servidor', () => {
  it('dice por qué falló una voz, sin volcar el rastro de Python', () => {
    expect(motivoDeFalla({ code: 'ENOENT' }, '')).toContain('No encuentro el Python del director');
    expect(motivoDeFalla({ code: 'ENOENT' }, '')).not.toContain('WSL');
    expect(motivoDeFalla({ code: 1 }, "Traceback...\nModuleNotFoundError: No module named 'kokoro_onnx'")).toContain('Falta el paquete de Kokoro');
    expect(motivoDeFalla({ code: 1 }, 'Kokoro: el paquete kokoro-onnx no está instalado.')).toContain('Falta el paquete');
    // Dice con qué se instalan, para quien sea, no «la orden que te da el director»
    expect(motivoDeFalla({ code: 'ENOENT' }, '')).toContain('bash tools/entorno/instalar_voces.sh');
    expect(motivoDeFalla({ code: 1 }, 'a\nLa voz de Kokoro «x» no es una de las que ofrece el Studio.\n')).toBe('La voz de Kokoro «x» no es una de las que ofrece el Studio.');
    expect(motivoDeFalla({ code: 1, message: 'Command failed' }, '')).toBe('Command failed');
  });

  it('la lista trae solo voces de Kokoro y, vacía, el motivo: que no están instaladas y cómo instalarlas', () => {
    const buena = JSON.stringify({
      voces: [
        { id: 'kokoro:em_santa', nombre: 'Santa (Kokoro)', idioma: 'es' },
        { id: 'piper:es_MX-claude-high', nombre: 'Claude (Piper)', idioma: 'es' },
      ],
      avisos: [],
    });
    expect(listaDeVoces(buena)).toEqual({ voces: [{ id: 'kokoro:em_santa', nombre: 'Santa (Kokoro)', idioma: 'es' }] });
    // Sin voces: el motivo con el detalle de Python y la orden que las instala
    const vacia = listaDeVoces(JSON.stringify({ voces: [], avisos: ['Kokoro: faltan los archivos del modelo en la carpeta de voces.'] }));
    expect(vacia.voces).toEqual([]);
    expect(vacia.motivo).toContain('Las voces de Kokoro no están instaladas en este computador (faltan los archivos del modelo en la carpeta de voces)');
    expect(vacia.motivo).toContain('bash tools/entorno/instalar_voces.sh');
    // Una lista solo de Piper, o una salida que no es JSON, es lo mismo que no tener Kokoro
    expect(listaDeVoces(JSON.stringify({ voces: [{ id: 'piper:es_MX-claude-high', nombre: 'Claude', idioma: 'es' }], avisos: [] })).motivo).toContain('no están instaladas');
    expect(listaDeVoces('Traceback (most recent call last)').motivo).toContain('no están instaladas');
  });

  it('registra las dos rutas en el servidor y la lista pasa por la memoria de 60 segundos', () => {
    const director = leer('estudio/servidor/api.ts');
    expect(director).toContain("server.middlewares.use('/__estudio/voz', atenderVoz(raiz));");
    const voz = leer('estudio/servidor/voz.ts');
    expect(voz).toContain("ruta === '/lista' && req.method === 'GET'");
    expect(voz).toContain("(ruta === '/hablar' || ruta === '/preparar' || ruta === '/falla') && req.method === 'POST'");
    expect(voz).toContain('const MEMORIA_MS = 60_000;');
    // Hablar solo con una voz de la lista, nunca con un id cualquiera
    expect(voz).toContain('revisarPedidoDeVoz(voz, texto, voces)');
    // Lo mismo que la transcripción: el Python del director (en Windows, WSL)
    expect(voz).toContain('comandoVoz(raiz, args)');
  });

  it('habla con un solo proceso que se queda abierto, con el modelo cargado, y no con uno por bloque', () => {
    // Nota de voz del titular nmvot5hg8tit, 26 de octubre de 2026: la pausa de cada bloque era arrancar Python y el modelo
    const voz = leer('estudio/servidor/voz.ts');
    expect(voz).toContain('comandoVoz(raiz, ARGS_DEL_TRABAJADOR)');
    expect(voz).toContain('const wav = await hablarConTrabajador(raiz, pedido.voz, fragmento, prioridad);');
    expect(voz).not.toContain("['--voz', pedido.voz]");
    expect(voz).toContain('const INACTIVO_MS = 10 * 60_000;');
  });

  it('parte lo que llega del proceso en respuestas completas, aunque lleguen a trozos', () => {
    const wav = Buffer.from('RIFF....WAVEdatos');
    const una = Buffer.concat([Buffer.from(`${JSON.stringify({ ok: true, bytes: wav.length })}\n`), wav]);
    const mala = Buffer.from(`${JSON.stringify({ ok: false, error: 'La voz de Kokoro «x» no está.' })}\n`);
    // Todo junto: un WAV, un error y lo que imprimió el motor por su cuenta (se salta)
    const todo = partirRespuestas(Buffer.concat([Buffer.from('aviso de onnx\n'), una, mala]));
    expect(todo.respuestas).toEqual([{ ok: true, wav }, { ok: false, error: 'La voz de Kokoro «x» no está.' }]);
    expect(todo.resto.length).toBe(0);
    // A medias: la cabecera llegó pero el audio no entero, así que espera al trozo siguiente
    const medio = partirRespuestas(una.subarray(0, una.length - 3));
    expect(medio.respuestas).toEqual([]);
    expect(partirRespuestas(Buffer.concat([medio.resto, una.subarray(una.length - 3)])).respuestas).toEqual([{ ok: true, wav }]);
  });
});

describe('cada falla de la voz queda en la bitácora de este computador (nota urgente nmw46uyrytit)', () => {
  it('la línea dice dónde falló, por qué, cuánto esperó, cuánto texto era y cuántos pedidos esperaban, nunca el texto', () => {
    expect(lineaDeFallaDeVoz({ donde: 'al leer el bloque', motivo: 'se acabó el plazo', ms: 180_000, letras: 412 })).toBe('la voz de Kokoro falló (al leer el bloque): se acabó el plazo · tras 180 s · 412 letras');
    expect(lineaDeFallaDeVoz({ donde: 'el proceso de la voz se cerró', motivo: 'x', esperaban: 3 })).toBe('la voz de Kokoro falló (el proceso de la voz se cerró): x · 3 pedidos esperaban');
    expect(lineaDeFallaDeVoz({ donde: 'en la página', motivo: 'y', esperaban: 1 })).toContain('1 pedido esperaba');
  });

  it('lo que falla en la página llega por /falla y se anota; desde otro sitio, no', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'stl-voz-falla-'));
    const pedir = async (headers: Record<string, string>) => {
      const req = Object.assign(Readable.from([JSON.stringify({ motivo: 'NotAllowedError: play() failed', ms: 1200, letras: 80 })]), { url: '/falla', method: 'POST', headers: { host: 'localhost:5180', ...headers } });
      const res = { statusCode: 0, setHeader() {}, end() {} };
      await atenderVoz(raiz)(req as never, res as never);
      return res.statusCode;
    };
    expect(await pedir({ origin: 'http://otro.sitio' })).toBe(403);
    expect(existsSync(join(raiz, '.estudio', 'bitacora.jsonl'))).toBe(false);
    expect(await pedir({ origin: 'http://localhost:5180' })).toBe(200);
    await vi.waitFor(() => expect(existsSync(join(raiz, '.estudio', 'bitacora.jsonl'))).toBe(true));
    const linea = JSON.parse(readFileSync(join(raiz, '.estudio', 'bitacora.jsonl'), 'utf-8').trim()) as { que: string; quien: string };
    expect(linea.quien).toBe('el Studio');
    expect(linea.que).toContain('en la página');
    expect(linea.que).toContain('NotAllowedError');
  });

  it('el servidor anota lo que falla al leer o preparar, y el cierre del proceso con pedidos esperando o por plazo vencido', () => {
    const voz = leer('estudio/servidor/voz.ts');
    expect(voz).toContain("donde: ruta === '/preparar' ? 'al preparar de antemano' : 'al leer el bloque'");
    expect(voz).toContain('if (p || t.vencido) anotarFalla(');
    const pagina = leer('estudio/src/guiaLectura.ts');
    // La página anota solo lo suyo: lo que respondió el servidor con 503 ya está en la bitácora
    expect(pagina).toContain('fallasDelServidor.has(e) ? undefined');
    expect(pagina).toContain("fetch('/__estudio/voz/falla'");
  });
});

/** Lo que recibió el proceso de la voz (falso), en su orden: un pedido por llamada. */
const recibidos: { voz: string; texto: string }[] = [];

/** Las muestras del audio falso de un texto: 0,2 s de un tono de 200 Hz a 24000 Hz, tan fuerte como largo es el texto (cada fragmento suena distinto), con voz de sobra para que a una pregunta se le pueda subir el final. */
const muestrasDe = (texto: string) => Array.from({ length: 4800 }, (_, i) => Math.round(texto.length * 100 * Math.sin((2 * Math.PI * 200 * i) / 24000)) + 0);

/** El audio que da el proceso falso: un WAV de 16 bits, mono, a 24000 Hz, con las muestras de ese texto (más de los 64 bytes que se piden para dar un audio por bueno). */
const audioDe = (texto: string) => {
  const muestras = muestrasDe(texto);
  const wav = Buffer.alloc(44 + muestras.length * 2);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(24000, 24);
  wav.writeUInt32LE(48000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(muestras.length * 2, 40);
  muestras.forEach((m, i) => wav.writeInt16LE(m, 44 + i * 2));
  return wav;
};

/** Cuántas veces el proceso falso recibió cada texto, y cuántos procesos se abrieron. */
const veces = new Map<string, number>();
const procesos = { abiertos: 0 };

/**
 * El proceso de la voz, falso: por cada línea que recibe, anota el pedido y responde con su WAV, como voz.py --servidor.
 * «Tarda N …» responde a los N ms; «No termina …» no responde nunca (hasta que lo matan); «Se cae una vez …» se cierra la
 * primera vez que lo recibe; «Se cae siempre …», todas. Al matarlo, se cierra.
 */
function procesoFalso() {
  procesos.abiertos++;
  const proceso = new EventEmitter();
  const stdout = new EventEmitter();
  let vivo = true;
  const morir = (codigo: number | null) => {
    if (!vivo) return;
    vivo = false;
    setImmediate(() => proceso.emit('exit', codigo));
  };
  const stdin = {
    on: () => {},
    end: () => {},
    write: (linea: string) => {
      if (!vivo) return;
      const pedido = JSON.parse(linea) as { voz: string; texto: string };
      recibidos.push(pedido);
      const n = (veces.get(pedido.texto) ?? 0) + 1;
      veces.set(pedido.texto, n);
      if (pedido.texto.startsWith('Se cae siempre') || (pedido.texto.startsWith('Se cae una vez') && n === 1)) return morir(1);
      if (pedido.texto.startsWith('No termina')) return;
      const wav = audioDe(pedido.texto);
      const responder = () => vivo && stdout.emit('data', Buffer.concat([Buffer.from(`${JSON.stringify({ ok: true, bytes: wav.length })}\n`), wav]));
      const ms = Number(pedido.texto.match(/^Tarda (\d+)/)?.[1] ?? 0);
      if (ms) setTimeout(responder, ms);
      else setImmediate(responder);
    },
  };
  return Object.assign(proceso, { stdout, stderr: new EventEmitter(), stdin, kill: () => morir(null) });
}

/** La lista de voces, falsa: solo Santa; y el proceso de la voz, el falso. */
function vocesFalsas() {
  vi.mocked(execFile).mockImplementation(((_orden: string, _args: string[], _opciones: unknown, fin: (e: null, salida: Buffer, errores: Buffer) => void) => {
    queueMicrotask(() => fin(null, Buffer.from(JSON.stringify({ voces: [{ id: 'kokoro:em_santa', nombre: 'Santa (Kokoro)', idioma: 'es' }], avisos: [] })), Buffer.alloc(0)));
    return { stdin: { on: () => {}, end: () => {} } };
  }) as never);
  vi.mocked(spawn).mockImplementation(procesoFalso as never);
}

describe('la voz lee las preguntas aparte, sube su final y entrega un solo WAV (pedidos pd_voz_preguntas y pd_voz_pregunta_final)', () => {
  beforeAll(vocesFalsas);

  /** Pide /hablar al atendedor, como la página, y devuelve lo que respondió. */
  async function hablar(texto: string) {
    recibidos.length = 0;
    const req = Object.assign(Readable.from([JSON.stringify({ voz: 'kokoro:em_santa', texto })]), { url: '/hablar', method: 'POST', headers: { host: 'localhost:5180' } });
    const res = {
      statusCode: 0,
      cabeceras: {} as Record<string, string>,
      cuerpo: Buffer.alloc(0),
      setHeader(nombre: string, valor: string) {
        this.cabeceras[nombre] = valor;
      },
      end(cuerpo: Uint8Array) {
        this.cuerpo = Buffer.from(cuerpo);
      },
    };
    // Cada pedido en un Studio vacío: lo que guarda la voz preparada (audioGuardado) no pasa de una prueba a otra
    await atenderVoz(mkdtempSync(join(tmpdir(), 'stl-voz-')))(req as never, res as never);
    return res;
  }

  /** Lo que dice un WAV de 44 bytes de cabecera de sí mismo, y sus muestras. */
  const leerWav = (wav: Buffer) => ({
    tamRiff: wav.readUInt32LE(4),
    canales: wav.readUInt16LE(22),
    frecuencia: wav.readUInt32LE(24),
    bits: wav.readUInt16LE(34),
    tamData: wav.readUInt32LE(40),
    muestras: Array.from({ length: (wav.length - 44) / 2 }, (_, i) => wav.readInt16LE(44 + i * 2)),
  });

  it('una pregunta en medio del texto: una llamada por fragmento, con la misma voz y en su orden, y un solo WAV con los tres audios', async () => {
    const fragmentos = ['Lo hicimos ayer.', '¿Qué te parece?', 'Mañana seguimos.'];
    const res = await hablar(fragmentos.join(' '));
    expect(recibidos).toEqual(fragmentos.map((texto) => ({ voz: 'kokoro:em_santa', texto })));
    expect(res.statusCode).toBe(200);
    expect(res.cabeceras['Content-Type']).toBe('audio/wav');
    // Un solo WAV del mismo formato (16 bits, mono, 24000 Hz), con los tres audios uno tras otro y sus tamaños al día
    const muestras = [...muestrasDe(fragmentos[0]), ...muestrasDe(fragmentos[1]), ...muestrasDe(fragmentos[2])];
    expect(leerWav(res.cuerpo)).toEqual({
      tamRiff: res.cuerpo.length - 8,
      canales: 1,
      frecuencia: 24000,
      bits: 16,
      tamData: muestras.length * 2,
      muestras,
    });
  });

  it('cada pregunta va en su propia llamada, y todos los audios salen tal cual los da Kokoro: a ninguno se le sube el tono al final', async () => {
    // Cada texto con los fragmentos que son pregunta, dichos a mano. Subirles el tono al final (pd_voz_pregunta_final) no
    // se oía como pregunta, así que se quitó (nota de voz del titular nmvrf5547tit, 28 de octubre de 2026)
    const casos: [string, string[]][] = [
      ['Hola a todos. ¿Cómo sonó? Bien, gracias. ¿Y qué más pasó? Listo.', ['¿Cómo sonó?', '¿Y qué más pasó?']],
      ['Did you see it? Yes, I did.', ['Did you see it?']],
      // Las comillas que abren van con su pregunta (nmw4f8wietit)
      ['Dijo «¿qué hora es?» y se fue.', ['«¿qué hora es?»']],
    ];
    for (const [texto, preguntas] of casos) {
      const res = await hablar(texto);
      const fragmentos = recibidos.map((r) => r.texto);
      expect(fragmentos.filter((f) => preguntas.includes(f)), texto).toEqual(preguntas);
      expect(fragmentos.length, texto).toBeGreaterThan(preguntas.length);
      expect(leerWav(res.cuerpo).muestras, texto).toEqual(fragmentos.flatMap(muestrasDe));
    }
  });

  it('un texto sin preguntas va en una sola llamada, y uno que es una sola pregunta también: su audio sale tal cual', async () => {
    const sin = 'Esto no pregunta nada. Solo afirma.';
    const sinPreguntas = await hablar(sin);
    expect(recibidos).toEqual([{ voz: 'kokoro:em_santa', texto: sin }]);
    expect(sinPreguntas.statusCode).toBe(200);
    expect(sinPreguntas.cuerpo.equals(audioDe(sin))).toBe(true);
    const sola = '¿Cómo estás?';
    const unaPregunta = await hablar(sola);
    expect(recibidos).toEqual([{ voz: 'kokoro:em_santa', texto: sola }]);
    expect(unaPregunta.statusCode).toBe(200);
    expect(unaPregunta.cuerpo.equals(audioDe(sola))).toBe(true);
  });
});

describe('la voz no se apaga por un bloque que tarda (propuesta pr_voz_sin_apagones)', () => {
  beforeAll(vocesFalsas);

  /** Pide /hablar o /preparar al atendedor, como la página, y devuelve el código con que respondió. */
  async function pedirVoz(raiz: string, ruta: '/hablar' | '/preparar', texto: string) {
    const req = Object.assign(Readable.from([JSON.stringify({ voz: 'kokoro:em_santa', texto })]), { url: ruta, method: 'POST', headers: { host: 'localhost:5180' } });
    const res = { statusCode: 0, setHeader() {}, end() {} };
    await atenderVoz(raiz)(req as never, res as never);
    return res.statusCode;
  }
  const textos = () => recibidos.map((r) => r.texto);

  it('el que sigue es el primero de lo que se lee y, si no hay, el primero de lo que se prepara', () => {
    const p = (urgente: boolean) => ({ prioridad: { urgente } });
    expect(siguienteDeLaFila([p(false), p(false), p(true), p(true)])).toBe(2);
    expect(siguienteDeLaFila([p(false), p(false)])).toBe(0);
    expect(siguienteDeLaFila([])).toBe(-1);
  });

  it('lo que se lee pasa delante de lo que se prepara, y el plazo de cada audio empieza cuando el proceso lo empieza, no en la fila', async () => {
    const antes = ponerPlazoDeVoz(300);
    try {
      const raiz = mkdtempSync(join(tmpdir(), 'stl-voz-fila-'));
      recibidos.length = 0;
      // Tres de antemano, de 200 ms cada uno: el tercero espera 400 ms en la fila, más que el plazo, y aun así sale
      const deAntemano = ['Tarda 200 uno.', 'Tarda 200 dos.', 'Tarda 200 tres.'].map((t) => pedirVoz(raiz, '/preparar', t));
      await vi.waitFor(() => expect(recibidos.length).toBe(1));
      await new Promise((ok) => setTimeout(ok, 30));
      const loQueLees = pedirVoz(raiz, '/hablar', 'Tarda 200 lo que lees.');
      expect(await Promise.all([...deAntemano, loQueLees])).toEqual([200, 200, 200, 200]);
      // Lo que se lee entró después de los tres, pero fue lo segundo que hizo el proceso
      expect(textos()[1]).toBe('Tarda 200 lo que lees.');
      expect(textos()).toHaveLength(4);
    } finally {
      ponerPlazoDeVoz(antes);
    }
  });

  it('un audio que tarda más que su plazo falla solo él: lo que esperaba sigue, en un proceso nuevo', async () => {
    const antes = ponerPlazoDeVoz(150);
    try {
      const raiz = mkdtempSync(join(tmpdir(), 'stl-voz-lento-'));
      recibidos.length = 0;
      const abiertos = procesos.abiertos;
      const lento = pedirVoz(raiz, '/hablar', 'No termina nunca.');
      await vi.waitFor(() => expect(textos()).toContain('No termina nunca.'));
      const loQueSigue = pedirVoz(raiz, '/preparar', 'Tarda 100 lo que sigue.');
      expect(await lento).toBe(503);
      expect(await loQueSigue).toBe(200);
      // El que pasó su plazo no se vuelve a pedir; el que esperaba se hizo en otro proceso
      expect(textos().filter((t) => t === 'No termina nunca.')).toHaveLength(1);
      expect(procesos.abiertos).toBe(abiertos + 1);
    } finally {
      ponerPlazoDeVoz(antes);
    }
  });

  it('si el proceso se cae, su pedido se vuelve a pedir una vez a un proceso nuevo, y lo que esperaba no falla junto con él', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'stl-voz-cae-'));
    recibidos.length = 0;
    // Se cae una vez: el segundo intento, en otro proceso, sale bien
    expect(await pedirVoz(raiz, '/hablar', 'Se cae una vez y vuelve.')).toBe(200);
    expect(textos()).toEqual(['Se cae una vez y vuelve.', 'Se cae una vez y vuelve.']);
    // Se cae siempre: falla tras un solo reintento, y el que esperaba detrás sale bien
    recibidos.length = 0;
    const siempre = pedirVoz(raiz, '/hablar', 'Se cae siempre, sin remedio.');
    const detras = pedirVoz(raiz, '/preparar', 'Lo que esperaba detrás.');
    expect(await siempre).toBe(503);
    expect(await detras).toBe(200);
    expect(textos().filter((t) => t === 'Se cae siempre, sin remedio.')).toHaveLength(2);
    expect(textos()).toContain('Lo que esperaba detrás.');
  });
});

describe('la voz preparada de antemano, guardada en el computador (pd_voz_precarga)', () => {
  const wav = (texto: string) => new Uint8Array(Buffer.from(`RIFF${texto.padEnd(80, '.')}`));

  it('lo preparado no se vuelve a sintetizar, ni lo que se está preparando se pide dos veces', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'stl-voz-'));
    const hacer = vi.fn(async (_r: string, _v: unknown, t: unknown) => wav(String(t)));
    // Dos a la vez (la cola de antemano y la página): una sola síntesis
    const [a, b] = await Promise.all([audioGuardado(raiz, 'kokoro:em_santa', 'Hola mundo', hacer), audioGuardado(raiz, 'kokoro:em_santa', 'Hola mundo', hacer)]);
    expect(hacer).toHaveBeenCalledTimes(1);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
    expect(existsSync(join(carpetaDeAudios(raiz), archivoDeAudio('kokoro:em_santa', 'Hola mundo')))).toBe(true);
    // Después, del computador: sin sintetizar otra vez; con otra voz u otro texto, sí
    expect(Buffer.from(await audioGuardado(raiz, 'kokoro:em_santa', 'Hola mundo', hacer)).equals(Buffer.from(a))).toBe(true);
    expect(hacer).toHaveBeenCalledTimes(1);
    await audioGuardado(raiz, 'kokoro:em_alex', 'Hola mundo', hacer);
    expect(hacer).toHaveBeenCalledTimes(2);
  });

  it('tiene un tope de 1 GB: al pasarlo salen los más viejos hasta quedar por debajo, nunca el último (nmvzo70a4tit)', () => {
    expect(TOPE_DE_AUDIOS).toBe(1024 ** 3);
    const MB = 1024 ** 2;
    const audio = (nombre: string, cuando: number, mb: number) => ({ nombre, cuando, bytes: mb * MB });
    // 1,5 GB en cuatro audios, en desorden: salen los dos más viejos, y con eso quedan 700 MB
    const salen = audiosQueSalen([audio('c.wav', 3, 300), audio('a.wav', 1, 500), audio('d.wav', 4, 400), audio('b.wav', 2, 336)], TOPE_DE_AUDIOS);
    expect(salen).toEqual(['a.wav', 'b.wav']);
    // Por debajo del tope, ninguno
    expect(audiosQueSalen([audio('a.wav', 1, 500), audio('b.wav', 2, 500)], TOPE_DE_AUDIOS)).toEqual([]);
    // Uno solo que lo pasa se queda: es el que se acaba de preparar
    expect(audiosQueSalen([audio('a.wav', 1, 2000)], TOPE_DE_AUDIOS)).toEqual([]);
  });

  it('al guardar poda solo los audios de su carpeta, y una falla no se guarda', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'stl-voz-'));
    const carpeta = carpetaDeAudios(raiz);
    mkdirSync(carpeta, { recursive: true });
    // Lo que no es de la voz, dentro y al lado de su carpeta, sigue ahí
    writeFileSync(join(carpeta, 'notas.txt'), 'x'.repeat(5000));
    writeFileSync(join(carpeta, '..', 'vecino.wav'), 'x'.repeat(5000));
    const hacer = async (_r: string, _v: unknown, t: unknown) => wav(String(t));
    const un = (await hacer(raiz, '', 'uno')).length;
    for (const t of ['uno', 'dos', 'tre', 'cua']) {
      await audioGuardado(raiz, 'kokoro:em_santa', t, hacer, un * 3 + 1);
      await new Promise((ok) => setTimeout(ok, 15));
    }
    const quedan = readdirSync(carpeta).filter((n) => n.endsWith('.wav'));
    expect(quedan).toHaveLength(3);
    expect(quedan).not.toContain(archivoDeAudio('kokoro:em_santa', 'uno'));
    expect(existsSync(join(carpeta, 'notas.txt'))).toBe(true);
    expect(existsSync(join(carpeta, '..', 'vecino.wav'))).toBe(true);
    const falla = vi.fn(async () => Promise.reject(new Error('sin voz')));
    await expect(audioGuardado(raiz, 'kokoro:em_santa', 'cinco', falla)).rejects.toThrow('sin voz');
    await expect(audioGuardado(raiz, 'kokoro:em_santa', 'cinco', falla)).rejects.toThrow('sin voz');
    expect(falla).toHaveBeenCalledTimes(2);
  });

  it('/preparar y /hablar pasan por lo guardado, y la caché queda fuera de git', () => {
    const codigo = leer('estudio/servidor/voz.ts');
    expect(codigo).toContain("if ((ruta === '/hablar' || ruta === '/preparar' || ruta === '/falla') && req.method === 'POST')");
    expect(codigo).toContain("const wav = await audioGuardado(raiz, cuerpo.voz, cuerpo.texto, sintetizar, TOPE_DE_AUDIOS, { urgente: ruta === '/hablar' }).catch(");
    expect(codigo).toContain("join(raiz, 'node_modules', '.cache', 'stl-voz')");
    expect(leer('.gitignore')).toMatch(/^node_modules\/$/m);
  });
});

describe('voz.py', () => {
  const py = leer('tools/director/voz.py');
  it('lista solo las voces de Kokoro, sin caerse si falta el paquete o el modelo', () => {
    expect(py).toContain('--lista');
    expect(py).toContain('"id": f"kokoro:{vid}"');
    // Cada voz dice su motor en el nombre (26 de octubre de 2026)
    expect(py).toContain('"nombre": f"{legible} (Kokoro)"');
    // Tres por idioma: las mismas de VOCES_DEL_STUDIO, y ninguna de las que salieron (nmvzfsccjtit)
    const ofrecidas = [...(py.match(/KOKORO_OFRECIDAS = \{[\s\S]*?\n\}/)?.[0] ?? '').matchAll(/"(\w+)": \(/g)].map((m) => `kokoro:${m[1]}`);
    expect(ofrecidas).toEqual([...VOCES_DEL_STUDIO.es, ...VOCES_DEL_STUDIO.en]);
    expect(py).toContain('except Exception');
    // Kokoro es el único motor: ni lo de Piper ni su carpeta de modelos (nota de voz del titular nmvpdu9zqtit, 26 de octubre de 2026)
    expect(py).not.toMatch(/piper/i);
    expect(py).not.toContain('.onnx.json');
    expect(py).toContain('raise SystemExit("Falta --voz kokoro:<voz>.")');
  });

  it('en el modo de servicio carga el modelo una sola vez y no mezcla lo que imprime el motor con el audio', () => {
    expect(py).toContain('p.add_argument("--servidor"');
    expect(py).toContain('modelo = _KOKORO[archivos] = Kokoro(*archivos)');
    expect(py).toContain('os.dup2(2, 1)');
  });

  it('en el modo de servicio, con --pausas, calla en la puntuación como el narrador: así lee el Studio en voz alta (t_decide_pausas_studio, nmw2csik4tit)', () => {
    const servir = py.match(/def servir\(args\):[\s\S]*?\n {4}return 0/)?.[0] ?? '';
    expect(servir).toContain('pausas = bool(pedido.get("pausas", args.pausas))');
    expect(servir).toContain('str(pedido.get("texto") or "").strip(), pausas)');
    // El Studio abre el proceso con las pausas
    expect(ARGS_DEL_TRABAJADOR).toEqual(['--servidor', '--pausas']);
    // Y lo que guardó antes, leído de corrido, no vuelve a sonar: el nombre del archivo cambia
    expect(archivoDeAudio('kokoro:em_santa', 'Hola, mundo.')).toMatch(/^[0-9a-f]{40}\.wav$/);
    expect(leer('estudio/servidor/voz.ts')).toContain('`${voz}\\n${texto}\\npausas`');
  });

  it('un trozo sin letras ni cifras (un «» suelto, comillas, símbolos) no llega a Kokoro, y uno que falla no apaga la voz (nmw4f8wietit)', () => {
    const kokoro = py.match(/def wav_de_kokoro\([\s\S]*?\n {4}return salida\.getvalue\(\)/)?.[0] ?? '';
    // Antes de cada modelo.create va la pregunta de si hay algo que decir
    const llamadas = [...kokoro.matchAll(/modelo\.create\(/g)].length;
    expect(llamadas).toBe(2);
    expect(kokoro).toContain('if se_dice(trozo):');
    expect(kokoro).toContain('elif se_dice(texto):');
    // El trozo que falla se salta y la voz sigue; solo si no salió nada de audio se avisa
    expect(kokoro).toMatch(/except Exception as e:[^\n]*\n\s+fallo = e\n\s+continue/);
    expect(kokoro).toContain('if fallo is not None and not any(p.any() for p in partes):');
    expect(py).toContain('return any(c.isalnum() for c in texto)');
  });
});

describe('instalar_voces.sh', () => {
  const sh = leer('tools/entorno/instalar_voces.sh');
  it('instala con uv pip, porque el venv que crea uv no trae pip, sin mover las versiones de la transcripción', () => {
    // El 26 de octubre de 2026 la orden de la misión corrió `python -m pip` y falló: «No module named pip»
    const ordenes = sh.split('\n').filter((l) => !l.trimStart().startsWith('#')).join('\n');
    expect(ordenes).not.toMatch(/python[^\n]*-m pip\b/);
    expect(sh).toContain('uv pip install --python "$PY" -c "$AQUI/transcripcion_requisitos.txt" kokoro-onnx');
  });

  it('sin WSL, en cualquier sistema: en Windows, en Git Bash, con el python.exe del venv, y uv se instala solo si falta (pr_voz_sin_wsl)', () => {
    for (const script of ['tools/entorno/instalar_voces.sh', 'tools/entorno/instalar_transcripcion.sh']) {
      const s = leer(script);
      expect(s, script).toContain('MINGW* | MSYS* | CYGWIN*) WINDOWS=1 ;;');
      expect(s, script).toContain('if [ -n "$WINDOWS" ]; then PY=.venv/Scripts/python.exe; else PY=.venv/bin/python; fi');
      expect(s, script).toContain('powershell -NoProfile -ExecutionPolicy ByPass -Command "irm https://astral.sh/uv/install.ps1 | iex"');
      expect(s, script).toContain('curl -LsSf https://astral.sh/uv/install.sh | sh');
      // Nada se corre con el Python de Linux a mano: siempre el del venv de este sistema
      expect(s.split('\n').filter((l) => !l.trimStart().startsWith('#')).join('\n'), script).not.toContain('.venv/bin/python "');
    }
  });

  it('baja solo Kokoro, con su modelo y sus voces: ya no tiene opción para otro motor (nota de voz del titular nmvpdu9zqtit)', () => {
    for (const f of ['kokoro-v1.0.onnx', 'voices-v1.0.bin']) expect(sh).toContain(f);
    expect(sh).not.toMatch(/piper/i);
    expect(sh).not.toContain('--piper');
    expect(sh).toContain('voz.py" --lista --dir .');
  });

  it('el instalador del Studio la nombra como parte de él, nunca como opcional, con lo que pesa, sin WSL, y dice si ya está (nmvzfmvr2tit)', () => {
    const iniciar = leer('tools/iniciar.ts');
    expect(iniciar).not.toContain("opcional('Voces de Kokoro");
    expect(iniciar).toContain('Las voces que leen en voz alta, que son parte del Studio (unos 350 MB)');
    expect(iniciar).toContain('bash tools/entorno/instalar_voces.sh${enGitBash}');
    expect(sh).not.toMatch(/Para quitarlas/);
    expect(iniciar).toContain("if (existsSync(join(director, 'voces', ARCHIVO_DE_VOCES))) ok('Voces de Kokoro para leer en voz alta');");
    expect(iniciar).not.toMatch(/piper/i);
    // Ninguna orden pasa por WSL, ni pregunta si está
    expect(iniciar).not.toMatch(/wsl -d|'wsl'/);
  });
});
