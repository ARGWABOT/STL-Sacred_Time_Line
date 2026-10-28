import { execFile, spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { atenderVoz, listaDeVoces, motivoDeFalla, partirRespuestas } from './voz';

// Ni Python ni WSL ni Kokoro: el que lista las voces y el proceso de la voz son falsos (los arma «la voz lee las preguntas aparte»)
vi.mock('node:child_process', () => ({ execFile: vi.fn(), spawn: vi.fn() }));

const leer = (ruta: string) => readFileSync(join(process.cwd(), ruta), 'utf8');

describe('las voces de Kokoro en el servidor', () => {
  it('dice por qué falló una voz, sin volcar el rastro de Python', () => {
    expect(motivoDeFalla({ code: 'ENOENT' }, '')).toContain('No encuentro Python ni WSL');
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
    const director = leer('estudio/servidor/director.ts');
    expect(director).toContain("server.middlewares.use('/__estudio/voz', atenderVoz(raiz));");
    const voz = leer('estudio/servidor/voz.ts');
    expect(voz).toContain("ruta === '/lista' && req.method === 'GET'");
    expect(voz).toContain("ruta === '/hablar' && req.method === 'POST'");
    expect(voz).toContain('const MEMORIA_MS = 60_000;');
    // Hablar solo con una voz de la lista, nunca con un id cualquiera
    expect(voz).toContain('revisarPedidoDeVoz(voz, texto, voces)');
    // Lo mismo que la transcripción: el Python del director (en Windows, WSL)
    expect(voz).toContain('comandoVoz(raiz, args)');
  });

  it('habla con un solo proceso que se queda abierto, con el modelo cargado, y no con uno por bloque', () => {
    // Nota de voz del titular nmvot5hg8tit, 26 de octubre de 2026: la pausa de cada bloque era arrancar Python y el modelo
    const voz = leer('estudio/servidor/voz.ts');
    expect(voz).toContain("comandoVoz(raiz, ['--servidor'])");
    expect(voz).toContain('const wav = await hablarConTrabajador(raiz, pedido.voz, fragmento);');
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

describe('la voz lee las preguntas aparte, sube su final y entrega un solo WAV (pedidos pd_voz_preguntas y pd_voz_pregunta_final)', () => {
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

  beforeAll(() => {
    // La lista de voces: solo Santa
    vi.mocked(execFile).mockImplementation(((_orden: string, _args: string[], _opciones: unknown, fin: (e: null, salida: Buffer, errores: Buffer) => void) => {
      queueMicrotask(() => fin(null, Buffer.from(JSON.stringify({ voces: [{ id: 'kokoro:em_santa', nombre: 'Santa (Kokoro)', idioma: 'es' }], avisos: [] })), Buffer.alloc(0)));
      return { stdin: { on: () => {}, end: () => {} } };
    }) as never);
    // El proceso de la voz: por cada línea que recibe, anota el pedido y responde con su WAV, como voz.py --servidor
    vi.mocked(spawn).mockImplementation((() => {
      const stdout = new EventEmitter();
      const stdin = {
        on: () => {},
        end: () => {},
        write: (linea: string) => {
          const pedido = JSON.parse(linea) as { voz: string; texto: string };
          recibidos.push(pedido);
          const wav = audioDe(pedido.texto);
          setImmediate(() => stdout.emit('data', Buffer.concat([Buffer.from(`${JSON.stringify({ ok: true, bytes: wav.length })}\n`), wav])));
        },
      };
      return Object.assign(new EventEmitter(), { stdout, stderr: new EventEmitter(), stdin, kill: () => {} });
    }) as never);
  });

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
    await atenderVoz('C:/studio')(req as never, res as never);
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
      ['Dijo «¿qué hora es?» y se fue.', ['¿qué hora es?»']],
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

describe('voz.py', () => {
  const py = leer('tools/director/voz.py');
  it('lista solo las voces de Kokoro, sin caerse si falta el paquete o el modelo', () => {
    expect(py).toContain('--lista');
    expect(py).toContain('"id": f"kokoro:{vid}"');
    // Cada voz dice su motor en el nombre (26 de octubre de 2026)
    expect(py).toContain('"nombre": f"{legible} (Kokoro)"');
    for (const v of ['ef_dora', 'em_alex', 'em_santa', 'af_heart', 'am_michael']) expect(py).toContain(`"${v}"`);
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
});

describe('instalar_voces.sh', () => {
  const sh = leer('tools/entorno/instalar_voces.sh');
  it('instala con uv pip, porque el venv que crea uv no trae pip, sin mover las versiones de la transcripción', () => {
    // El 26 de octubre de 2026 la orden de la misión corrió `python -m pip` y falló: «No module named pip»
    const ordenes = sh.split('\n').filter((l) => !l.trimStart().startsWith('#')).join('\n');
    expect(ordenes).not.toMatch(/python[^\n]*-m pip\b/);
    expect(sh).toContain('uv pip install --python .venv/bin/python -c "$AQUI/transcripcion_requisitos.txt" kokoro-onnx');
  });

  it('baja solo Kokoro, con su modelo y sus voces: ya no tiene opción para otro motor (nota de voz del titular nmvpdu9zqtit)', () => {
    for (const f of ['kokoro-v1.0.onnx', 'voices-v1.0.bin']) expect(sh).toContain(f);
    expect(sh).not.toMatch(/piper/i);
    expect(sh).not.toContain('--piper');
    expect(sh).toContain('voz.py" --lista --dir .');
  });

  it('el instalador del Studio la ofrece como opcional, con lo que pesa', () => {
    const iniciar = leer('tools/iniciar.ts');
    expect(iniciar).toContain("opcional('Voces de Kokoro para leer en voz alta (unos 350 MB; sin ellas, la niebla no lee en voz alta)', 'wsl -d Ubuntu -- bash tools/entorno/instalar_voces.sh')");
    expect(iniciar).toContain("opcional('Voces de Kokoro para leer en voz alta (unos 350 MB; sin ellas, la niebla no lee en voz alta)', 'bash tools/entorno/instalar_voces.sh')");
    expect(iniciar).not.toMatch(/piper/i);
  });
});
