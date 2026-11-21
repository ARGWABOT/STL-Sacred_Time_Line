import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { anotarFallo, crearResidente, LIBERAR_TRAS_MS, liberaElModelo, MEMORIA_GRANDE_BYTES, detenerTranscripcionResidente, errorDeAudio, iniciarTranscripcionResidente, leerLineaDelResidente, lineaDePeticion, type ProcesoResidente, ARCHIVO_DE_VOCES, audioBorrable, audiosQueNoSeTranscriben, borrarSiTranscrito, ESPERAS_DE_REINTENTO, esperaParaReintentar, tocaIntentar, unoALaVez, comandoTranscripcion, COMO_INSTALAR_TRANSCRIPCION, limpiarTranscripcion, limpiarTranscrito, MARCA_TRANSCRIPCION, pythonDelDirector, quitarSiVacia, transcribirEnLocal, transcripcionEnDisco, txtDeAudio } from './transcripcion';

const base = mkdtempSync(join(tmpdir(), 'estudio-transcripcion-'));
afterAll(() => rmSync(base, { recursive: true, force: true }));

describe('«Transcribiendo» cuenta solo lo que de verdad se transcribe (nota urgente del titular nmw12z6jntit)', () => {
  it('los audios sin texto de lo ya respondido, los que fallaron y los que no están aquí no se cuentan como en curso; lo que está en la cola, sí', () => {
    const audios = ['respondida.webm', 'enCola.webm', 'fallo.webm', 'lejos.webm', 'conTexto.webm', 'sinVoz.webm'];
    const fuera = audiosQueNoSeTranscriben(audios, {
      transcripciones: { 'conTexto.webm': 'Hola', 'sinVoz.webm': '' },
      porOir: new Set(['enCola.webm', 'fallo.webm', 'lejos.webm', 'conTexto.webm', 'sinVoz.webm']),
      transcribiendo: new Set(['enCola.webm']),
      fallidos: new Set(['fallo.webm']),
      existe: (a) => a !== 'lejos.webm',
    });
    expect(fuera).toEqual(['respondida.webm', 'fallo.webm', 'lejos.webm']);
  });
});

describe('un audio que no se transcribe no se borra ni se olvida: queda en cola y se vuelve a intentar (nota de voz del titular nmw159ihdtit)', () => {
  it('la espera crece con cada intento y se queda en una hora: nunca se rinde', () => {
    expect([1, 2, 3, 4, 5, 6, 20].map((i) => esperaParaReintentar(i) / 60_000)).toEqual([1, 5, 15, 30, 60, 60, 60]);
    expect(ESPERAS_DE_REINTENTO.at(-1)).toBe(60);
  });

  it('el que falló espera su turno y después vuelve a la cola; el que nunca falló va ya', () => {
    const ahora = Date.parse('2026-11-03T21:00:00Z');
    const primero = anotarFallo(undefined, 'Python se cerró', ahora);
    expect(primero).toEqual({ error: 'Python se cerró', intentos: 1, siguiente: ahora + 60_000 });
    expect(tocaIntentar(undefined, ahora)).toBe(true);
    expect(tocaIntentar(primero, ahora + 30_000)).toBe(false);
    expect(tocaIntentar(primero, ahora + 60_000)).toBe(true);
    const segundo = anotarFallo(primero, 'otra vez', ahora + 60_000);
    expect(segundo.intentos).toBe(2);
    expect(segundo.siguiente).toBe(ahora + 60_000 + 5 * 60_000);
  });

  it('sin voz (el micrófono silenciado) no se reintenta, pero el audio tampoco se borra', () => {
    const ahora = Date.now();
    const sinVoz = anotarFallo(undefined, 'No se oyó voz', ahora, true);
    expect(tocaIntentar(sinVoz, ahora + 24 * 3600_000)).toBe(false);
    const audio = join(base, 'callado.webm');
    writeFileSync(audio, 'x');
    writeFileSync(txtDeAudio(audio), '\n');
    expect(quitarSiVacia(audio)).toBe(true);
    expect(borrarSiTranscrito(audio)).toBe(false);
    expect(existsSync(audio)).toBe(true);
  });

  it('el Studio lo vuelve a poner en la cola con su espera, lo muestra «en cola» y no borra el audio que falló, tampoco al dictar', () => {
    const api = readFileSync(join(import.meta.dirname, '..', '..', 'estudio', 'servidor', 'api.ts'), 'utf-8');
    expect(api).toContain('const sinTranscribir = new Map<string, Reintento>();');
    expect(api).toContain('!tocaIntentar(sinTranscribir.get(audio), Date.now())');
    expect(api).toContain('reintentarLuego(x.id, x.audio, x.pista, fallo);');
    expect(api).toContain('enCola: Object.fromEntries(');
    const dictar = api.slice(api.indexOf("ruta === '/dictar'"), api.indexOf("ruta === '/comprobar'"));
    expect(dictar).not.toContain('finally');
    expect(dictar.indexOf('await rm(audio')).toBeLessThan(dictar.indexOf('return responder(res, 200, { texto })'));
    const pagina = readFileSync(join(import.meta.dirname, '..', '..', 'estudio', 'src', 'app.ts'), 'utf-8');
    expect(pagina).toContain("tx('buzon.enColaReintento'");
  });

  it('las transcripciones van una a la vez, aunque una falle', async () => {
    const orden: string[] = [];
    const tarea = (n: string, falla = false) => () => new Promise<string>((ok, mal) => setTimeout(() => { orden.push(n); if (falla) mal(new Error(n)); else ok(n); }, n === 'a' ? 30 : 1));
    const a = unoALaVez(tarea('a', true)).catch(() => 'falló');
    const b = unoALaVez(tarea('b'));
    expect(await Promise.all([a, b])).toEqual(['falló', 'b']);
    expect(orden).toEqual(['a', 'b']);
  });

  it('un audio que falla no tumba a los demás del lote, y Python dice cuál y por qué', () => {
    const py = readFileSync(join(import.meta.dirname, '..', '..', 'tools', 'director', 'transcribir.py'), 'utf-8');
    expect(py).toContain('except Exception as e:');
    expect(py).toContain('sys.exit(1)');
  });
});

describe('la voz sin WSL (pr_voz_sin_wsl): el Python de ~/director/.venv en cualquier sistema, y nunca dentro de WSL (nota de voz del titular nmvs7si3qtit)', () => {
  const casa = 'C:\\Users\\ana';
  const venv = join(casa, 'director', '.venv');
  const python = join(venv, 'Scripts', 'python.exe');
  const con = (...rutas: string[]) => ({ plataforma: 'win32', casa, env: {}, existe: (r: string) => rutas.includes(r) });

  it('en Windows, el python.exe del venv; instalado solo con lo suyo: la marca de la transcripción, o el archivo de las voces', () => {
    const marca = join(venv, MARCA_TRANSCRIPCION);
    const voces = join(casa, 'director', 'voces', ARCHIVO_DE_VOCES);
    expect(pythonDelDirector('transcripcion', con(python, marca))).toEqual({ python, instalado: true });
    expect(pythonDelDirector('voz', con(python, voces))).toEqual({ python, instalado: true });
    // A medio instalar (el venv sin su marca), o solo con lo otro: el mismo Python, sin instalar; nunca WSL
    expect(pythonDelDirector('transcripcion', con(python))).toEqual({ python, instalado: false });
    expect(pythonDelDirector('transcripcion', con(python, voces)).instalado).toBe(false);
    expect(pythonDelDirector('voz', con(python, marca)).instalado).toBe(false);
    expect(pythonDelDirector('voz', con(marca, voces))).toEqual({ python, instalado: false });
    // DIRECTOR_PYTHON lo cambia, y se da por instalado
    expect(pythonDelDirector('transcripcion', { ...con(), env: { DIRECTOR_PYTHON: 'C:\\py\\python.exe' } })).toEqual({ python: 'C:\\py\\python.exe', instalado: true });
  });

  it('en los demás sistemas, el Python de ~/director/.venv o el de DIRECTOR_PYTHON, con la misma marca', () => {
    const casaMac = join('/Users/ana', 'director');
    expect(pythonDelDirector('transcripcion', { plataforma: 'darwin', env: { HOME: '/Users/ana' }, existe: () => false })).toEqual({ python: join(casaMac, '.venv', 'bin', 'python'), instalado: false });
    expect(pythonDelDirector('transcripcion', { plataforma: 'darwin', env: { HOME: '/Users/ana' }, existe: () => true }).instalado).toBe(true);
    expect(pythonDelDirector('voz', { plataforma: 'linux', env: { DIRECTOR_PYTHON: '/x/python' }, existe: () => false })).toEqual({ python: '/x/python', instalado: true });
  });

  it('los audios van con la ruta de este computador, al python del venv; sin la transcripción instalada no se intenta: dice cómo instalarla', async () => {
    const audio = 'C:\\xampp\\STL\\.stl\\director\\notas\\n1.webm';
    const c = comandoTranscripcion('C:\\xampp\\STL', [audio], 'Notas.', { python, instalado: true });
    expect(c.cmd).toBe(python);
    expect(c.args.slice(1)).toEqual(['--pista', 'Notas.', audio]);
    const r = await transcribirEnLocal('C:\\xampp\\STL', [join(base, 'no-esta.webm')], 'Notas.', { python, instalado: false });
    expect(r).toEqual({ ok: false, error: COMO_INSTALAR_TRANSCRIPCION });
    expect(COMO_INSTALAR_TRANSCRIPCION).toContain('bash tools/entorno/instalar_transcripcion.sh');
    // Nada del Studio corre dentro de WSL
    const codigo = readFileSync(join(import.meta.dirname, 'transcripcion.ts'), 'utf8');
    expect(codigo).not.toMatch(/['"]wsl['"]|\/mnt\//);
  });

  it('el instalador, sin WSL: la marca solo si su prueba transcribió', () => {
    const sh = readFileSync(join(import.meta.dirname, '..', '..', 'tools', 'entorno', 'instalar_transcripcion.sh'), 'utf8');
    expect(sh).toContain('uv pip install --python "$PY" -r "$AQUI/transcripcion_requisitos.txt"');
    // La marca se quita al empezar y vuelve después de la prueba (set -e: si la prueba falla, no se llega a ella)
    expect(sh.indexOf(`rm -f .venv/${MARCA_TRANSCRIPCION}`)).toBeGreaterThan(-1);
    expect(sh.indexOf(`touch .venv/${MARCA_TRANSCRIPCION}`)).toBeGreaterThan(sh.indexOf('transcribir.py" --probar'));
    expect(sh).toContain('set -euo pipefail');
    const base = readFileSync(join(import.meta.dirname, '..', '..', 'tools', 'entorno', 'transcripcion_requisitos.txt'), 'utf8');
    expect(base).toContain('faster-whisper==');
    // transcribir.py escribe en UTF-8
    const py = readFileSync(join(import.meta.dirname, '..', '..', 'tools', 'director', 'transcribir.py'), 'utf8');
    expect(py).toContain("_flujo.reconfigure(encoding='utf-8')");
  });

  it('si un audio no se pudo transcribir, quien lo grabó lo escribe, y al guardarlo el audio se borra como si se hubiera transcrito', () => {
    const vista = readFileSync(join(import.meta.dirname, '..', '..', 'estudio', 'src', 'app.ts'), 'utf8').replace(/\r\n/g, '\n');
    expect(vista).toContain("n.audio && !n.texto && d.transcripciones[n.audio] === undefined && d.sinTranscribir?.includes(n.audio)");
    expect(vista).toContain(">${tx('buzon.escribir')}</button>");
    // En el Buzón, solo en las notas propias que el director aún no respondió
    expect(vista).toContain("${!r && mia ? botonEscribirLoDicho(n) : ''}");
    expect(vista).toContain("titulo: tx(sinTexto ? 'buzon.escribir' : 'nota.corregirEntendido'),");
    // El servidor escribe su .txt y borra el audio que seguía aquí
    const servidor = readFileSync(join(import.meta.dirname, '..', '..', 'estudio', 'servidor', 'api.ts'), 'utf8').replace(/\r\n/g, '\n');
    const corregir = servidor.slice(servidor.indexOf("case 'corregir_transcripcion': {"), servidor.indexOf("case 'marcar': {"));
    expect(corregir).toContain("await writeFile(enDisco(raiz, txt), texto + '\\n', 'utf-8');");
    expect(corregir).toContain('borrarSiTranscrito(enDisco(raiz, audio));');
  });
});
/** Un audio de mentira y, si se da, su .txt. */
const nota = (nombre: string, texto?: string) => {
  const audio = join(base, `${nombre}.webm`);
  writeFileSync(audio, Buffer.alloc(128, 1));
  if (texto != null) writeFileSync(txtDeAudio(audio), texto);
  return audio;
};

describe('el audio de una nota de voz nunca entra a git: se borra apenas su texto queda escrito', () => {
  it('su .txt: la misma ruta, con extensión .txt', () => {
    expect(txtDeAudio('proyectos/stl/director/notas/n1.webm')).toBe('proyectos/stl/director/notas/n1.txt');
    expect(txtDeAudio('proyectos/stl/director/notas/e_m1_x.M4A')).toBe('proyectos/stl/director/notas/e_m1_x.txt');
  });

  it('solo se puede borrar si su transcripción tiene texto', () => {
    expect(audioBorrable('Lo que dije.\n')).toBe(true);
    expect(audioBorrable('')).toBe(false);
    expect(audioBorrable('  \n')).toBe(false); // salió vacía: se queda hasta que salga bien
    expect(audioBorrable(null)).toBe(false); // sin .txt (falló): se queda
    expect(audioBorrable(undefined)).toBe(false);
  });

  it('con su texto, se borra el audio y queda el .txt', () => {
    const audio = nota('con-texto', 'Quiero que el Studio borre los audios.\n');
    expect(borrarSiTranscrito(audio)).toBe(true);
    expect(existsSync(audio)).toBe(false);
    expect(transcripcionEnDisco(audio)).toBe('Quiero que el Studio borre los audios.\n');
    expect(borrarSiTranscrito(audio)).toBe(false); // ya no está: nada que borrar
  });

  it('si falló (sin .txt), el audio se queda', () => {
    const audio = nota('sin-txt');
    expect(borrarSiTranscrito(audio)).toBe(false);
    expect(quitarSiVacia(audio)).toBe(false);
    expect(existsSync(audio)).toBe(true);
  });

  it('si salió vacía, el audio se queda y el .txt vacío sale, para volver a intentarlo', () => {
    const audio = nota('vacia', '\n');
    expect(borrarSiTranscrito(audio)).toBe(false);
    expect(quitarSiVacia(audio)).toBe(true);
    expect(existsSync(audio)).toBe(true);
    expect(existsSync(txtDeAudio(audio))).toBe(false);
  });

  it('una transcripción con texto no se quita como vacía', () => {
    const audio = nota('buena', 'Algo.\n');
    expect(quitarSiVacia(audio)).toBe(false);
    expect(existsSync(txtDeAudio(audio))).toBe(true);
    expect(existsSync(audio)).toBe(true);
  });
});

describe('lo que la transcripción inventa al final, fuera (decisión del titular, 26 de octubre de 2026)', () => {
  it('una frase corta repetida más de tres veces seguidas queda una sola vez', () => {
    expect(limpiarTranscripcion(`Quiero que actualice solo. ${'¡Gracias! '.repeat(29)}`)).toBe('Quiero que actualice solo. ¡Gracias!');
    expect(limpiarTranscripcion('Hola. Gracias. gracias. ¡Gracias! Gracias…')).toBe('Hola. Gracias.');
  });

  it('tres veces o menos, o una frase larga, se quedan como están: pueden ser de verdad', () => {
    expect(limpiarTranscripcion('No. No. No. Eso no va.')).toBe('No. No. No. Eso no va.');
    const larga = 'Esta es una frase larga que de verdad dije varias veces para insistir en lo mismo. ';
    expect(limpiarTranscripcion(larga.repeat(4))).toBe(larga.repeat(4).trim());
  });

  it('una despedida de video al final sale, si antes hay algo; sola, se queda (el audio no se borra como transcrito)', () => {
    expect(limpiarTranscripcion('Que la primera misión lo diga claro. Gracias por ver el video.')).toBe('Que la primera misión lo diga claro.');
    expect(limpiarTranscripcion('Gracias por ver el video.')).toBe('Gracias por ver el video.');
    expect(limpiarTranscripcion('Gracias por ver el video. Y otra cosa más.')).toBe('Gracias por ver el video. Y otra cosa más.');
  });

  it('lo demás no cambia, ni sus signos', () => {
    for (const t of ['¿Y si lo probamos?', '...y luego eso', 'Uno, dos y tres', '3.5 por ciento. ¡Listo!']) expect(limpiarTranscripcion(t)).toBe(t);
  });

  it('se limpia en su .txt, y la bandeja y el Studio lo hacen con cada audio que transcriben', () => {
    const audio = nota('bucle', `Esto sí lo dije. ${'Gracias. '.repeat(6)}\n`);
    expect(limpiarTranscrito(audio)).toBe(true);
    expect(transcripcionEnDisco(audio)).toBe('Esto sí lo dije. Gracias.\n');
    expect(limpiarTranscrito(audio)).toBe(false); // ya limpio: no se reescribe
    expect(limpiarTranscrito(nota('sin-txt-2'))).toBe(false);
    const leer = (ruta: string) => readFileSync(join(__dirname, ruta), 'utf-8');
    expect(leer('../../tools/director/bandeja.ts').match(/limpiarTranscrito\(/g)).toHaveLength(2);
    expect(leer('./transcripcion.ts')).toContain('for (const audio of audios) limpiarTranscrito(audio);');
    expect(leer('../../tools/director/transcribir.py')).toContain('condition_on_previous_text=False');
  });
});

describe('un .txt vacío de antes no impide volver a intentarlo (pd_audios_vacios, 25 de octubre de 2026)', () => {
  const leer = (ruta: string) => readFileSync(join(__dirname, ruta), 'utf-8').replace(/\r\n/g, '\n');

  it('la bandeja transcribe de nuevo un audio cuyo .txt está vacío, y no borra ese .txt, que git guarda', () => {
    const bandeja = leer('../../tools/director/bandeja.ts');
    // Mientras el director no la haya respondido: una ya respondida no se vuelve a intentar (audiosPorTranscribir)
    expect(bandeja).toContain('const audios = todosLosAudios().filter((a) => porOir.has(a) && existsSync(enDisco(a)) && !audioBorrable(transcripcion(a)));');
    expect(bandeja).toContain('const vaciosEnGit = new Set(audios.filter((a) => existsSync(txtDe(a))));');
    expect(bandeja).toContain('if (vaciosEnGit.has(a) ? !audioBorrable(transcripcion(a)) : quitarSiVacia(enDisco(a)))');
  });

  it('nunca sin el filtro de voz: en el silencio el modelo inventa, y un texto inventado borraría el audio', () => {
    const script = leer('../../tools/director/transcribir.py');
    expect(script).toContain('vad_filter=True');
    expect(script).not.toContain('vad_filter=False');
    // Lo que inventó en tres audios sin voz, el 25 de octubre de 2026: no se toma por su texto
    expect(script).toContain('en el silencio el modelo inventa');
  });

  it('el idioma lo detecta el modelo, sin forzar el español, y la pista en español va solo con un audio en español (nmw6p6l8qtit)', () => {
    const script = leer('../../tools/director/transcribir.py');
    expect(script).not.toContain("language='es'");
    expect(script).toContain('m.detect_language(sonido)');
    expect(script).toContain("initial_prompt=pista if idioma == IDIOMA_DE_LA_PISTA else None");
    expect(script).toContain("IDIOMA_DE_LA_PISTA = 'es'");
  });
});

describe('el modelo de voz queda cargado mientras el Studio está encendido: proceso residente', () => {
  const python = { python: 'py', instalado: true };
  const sinEsperas = { p: python, esperasDeReinicioMs: [] as number[] };

  type Falso = EventEmitter & ProcesoResidente & { escritas: string[]; decir(t: string): void };
  /** Un proceso de mentira: guarda lo que se le escribe y deja decir lo que Python diría; `responde` contesta cada petición. */
  const falso = (responde?: (linea: string, p: Falso) => void) => {
    const p = new EventEmitter() as Falso;
    const salida = new EventEmitter();
    p.stdout = salida as unknown as ProcesoResidente['stdout'];
    p.stderr = new EventEmitter() as unknown as ProcesoResidente['stderr'];
    p.escritas = [];
    p.stdin = { write: (l: string) => { p.escritas.push(l); responde?.(l, p); return true; } };
    p.kill = () => { p.emit('exit', null); };
    p.decir = (t: string) => { salida.emit('data', t); };
    return p;
  };
  const sinEjecutar = () => { throw new Error('no debía llamarse a execFile'); };
  afterEach(() => detenerTranscripcionResidente());

  it('la petición es una línea de JSON (sin saltos ni caracteres sueltos) y la respuesta se entiende', () => {
    const linea = lineaDePeticion(['C:\\a\\n1.webm', 'C:\\ñ\\é.webm'], 'Notas.\nOtra');
    expect(linea.endsWith('\n')).toBe(true);
    expect(linea.slice(0, -1)).not.toContain('\n');
    expect(linea).toMatch(/^[\x20-\x7e]+\n$/);
    expect(JSON.parse(linea)).toEqual({ audios: ['C:\\a\\n1.webm', 'C:\\ñ\\é.webm'], pista: 'Notas.\nOtra' });
    expect(leerLineaDelResidente('LISTO\r\n')).toEqual({ tipo: 'listo' });
    expect(leerLineaDelResidente('{"ok": true}')).toEqual({ tipo: 'respuesta', ok: true });
    expect(leerLineaDelResidente('{"ok": false, "error": "x: no se pudo transcribir (E: y)"}')).toEqual({ tipo: 'respuesta', ok: false, error: 'x: no se pudo transcribir (E: y)' });
    expect(leerLineaDelResidente('basura')).toBeNull();
    expect(leerLineaDelResidente('{"otra": 1}')).toBeNull();
    expect(errorDeAudio('a.webm: no se pudo transcribir (RuntimeError: x)')).toBe(true);
    expect(errorDeAudio("KeyError: 'audios'")).toBe(false);
    expect(errorDeAudio(undefined)).toBe(false);
  });

  it('con el servidor listo, transcribe con él y no lanza ningún proceso de una vez', async () => {
    const p = falso((l, yo) => { expect(JSON.parse(l).pista).toBe('Pista.'); yo.decir('{"ok": true}\n'); });
    const lanzados: string[][] = [];
    expect(iniciarTranscripcionResidente('C:\\STL', { ...sinEsperas, lanzar: (_c, a) => { lanzados.push(a); return p; } })).toBe(true);
    expect(iniciarTranscripcionResidente('C:\\STL', { ...sinEsperas, lanzar: () => { throw new Error('otro'); } })).toBe(true); // idempotente
    expect(lanzados).toHaveLength(1);
    expect(lanzados[0].slice(1)).toEqual(['--servidor']);
    p.decir('LISTO\n');
    const audio = nota('residente', 'Hola.\n');
    const r = await transcribirEnLocal('C:\\STL', [audio], 'Pista.', python, sinEjecutar);
    expect(r).toEqual({ ok: true });
    expect(p.escritas).toHaveLength(1);
    expect(JSON.parse(p.escritas[0]).audios).toEqual([audio]);
  });

  it('un error del audio se devuelve como siempre, sin volver a intentarlo de una vez', async () => {
    const error = 'a.webm: no se pudo transcribir (RuntimeError: dañado)';
    const p = falso((_l, yo) => yo.decir(JSON.stringify({ ok: false, error }) + '\n'));
    iniciarTranscripcionResidente('C:\\STL', { ...sinEsperas, lanzar: () => p });
    p.decir('LISTO\n');
    expect(await transcribirEnLocal('C:\\STL', [nota('malo')], 'P.', python, sinEjecutar)).toEqual({ ok: false, error });
  });

  it('con poca memoria total (menos de 15 GB) se libera tras 10 minutos sin usarlo; con más, queda cargado (pd_voz_memoria, nmwjm3wo1tit)', async () => {
    const GB = 1024 ** 3;
    expect(MEMORIA_GRANDE_BYTES).toBe(15 * GB);
    expect(LIBERAR_TRAS_MS).toBe(10 * 60_000);
    // La memoria total del equipo, no la libre: 8 GB lo libera; 16 GB (reporta unos 15,8) lo conserva
    expect(liberaElModelo(8 * GB)).toBe(true);
    expect(liberaElModelo(15 * GB - 1)).toBe(true);
    expect(liberaElModelo(15 * GB)).toBe(false);
    expect(liberaElModelo(15.8 * GB)).toBe(false);
    expect(liberaElModelo(32 * GB)).toBe(false);
    // La regla lee os.totalmem(), nunca os.freemem()
    const fuente = readFileSync(join(__dirname, 'transcripcion.ts'), 'utf8');
    expect(fuente).toContain('memoriaTotal: number = totalmem()');
    expect(fuente).not.toContain('freemem');
    // Un computador chico: tras la espera sin peticiones, el proceso se cierra; la próxima lo vuelve a cargar y esa se
    // hace de una vez
    const procesos: ReturnType<typeof falso>[] = [];
    const r = crearResidente('C:\\STL', { ...sinEsperas, liberarTrasMs: 20, lanzar: () => { const p = falso(); procesos.push(p); return p; } });
    procesos[0].decir('LISTO\n');
    expect(r.listo()).toBe(true);
    await new Promise((ok) => setTimeout(ok, 40));
    expect(r.listo()).toBe(false);
    expect(procesos).toHaveLength(1); // no se levanta solo
    expect(await r.pedir(['a.webm'], 'P.')).toBeNull();
    expect(procesos).toHaveLength(2); // la petición lo vuelve a cargar
    r.detener();
    // Sin liberarTrasMs (un computador grande), no se cierra por esperar
    const grande: ReturnType<typeof falso>[] = [];
    const g = crearResidente('C:\\STL', { ...sinEsperas, lanzar: () => { const p = falso(); grande.push(p); return p; } });
    grande[0].decir('LISTO\n');
    await new Promise((ok) => setTimeout(ok, 40));
    expect(g.listo()).toBe(true);
    g.detener();
    // Y el Studio lo arranca con la regla: la memoria total decide si lleva el reloj de 10 minutos
    expect(fuente).toContain('liberaElModelo(o.memoriaTotal ?? totalmem()) ? LIBERAR_TRAS_MS : undefined');
  });

  it('dice si el modelo se está preparando: al arrancar y al volver de liberarse, no cuando está cargado (nmwj6jszhtit, nmwjoff8qtit)', async () => {
    const { modeloDeVozDe } = await import('./transcripcion');
    const procesos: ReturnType<typeof falso>[] = [];
    const r = crearResidente('C:\\STL', { ...sinEsperas, liberarTrasMs: 20, lanzar: () => { const p = falso(); procesos.push(p); return p; } });
    expect(r.estado()).toBe('cargando');
    expect(modeloDeVozDe(r, true)).toEqual({ libera: true, preparando: true });
    procesos[0].decir('LISTO\n');
    expect(r.estado()).toBe('listo');
    expect(modeloDeVozDe(r, true)).toEqual({ libera: true, preparando: false });
    // Liberado por no usarlo: la línea de la grabación diría que se prepara
    await new Promise((ok) => setTimeout(ok, 40));
    expect(r.estado()).toBe('dormido');
    expect(modeloDeVozDe(r, true)?.preparando).toBe(true);
    // La grabación siguiente lo vuelve a cargar: se prepara hasta su LISTO, y solo entonces deja de decirlo
    await r.pedir(['a.webm'], 'P.');
    expect(r.estado()).toBe('cargando');
    procesos[1].decir('LISTO\n');
    expect(r.estado()).toBe('listo');
    r.detener();
    // Sin la transcripción instalada (sin residente), la página no dice nada del modelo
    expect(modeloDeVozDe(null, false)).toBeNull();
  });

  it('sin estar listo todavía (el modelo carga), lo hace de una vez', async () => {
    const p = falso();
    iniciarTranscripcionResidente('C:\\STL', { ...sinEsperas, lanzar: () => p });
    const llamadas: string[][] = [];
    const r = await transcribirEnLocal('C:\\STL', [nota('sin-listo')], 'P.', python, (_c, a, _o, cb) => { llamadas.push(a); cb(null, '', ''); });
    expect(r).toEqual({ ok: true });
    expect(llamadas).toHaveLength(1);
    expect(p.escritas).toEqual([]);
  });

  it('si el servidor muere a mitad de la petición, lo hace de una vez', async () => {
    const p = falso((_l, yo) => yo.emit('exit', 1));
    iniciarTranscripcionResidente('C:\\STL', { ...sinEsperas, lanzar: () => p });
    p.decir('LISTO\n');
    let llamadas = 0;
    const r = await transcribirEnLocal('C:\\STL', [nota('muere')], 'P.', python, (_c, _a, _o, cb) => { llamadas++; cb(new Error('x'), '', 'una\notra línea'); });
    expect(llamadas).toBe(1);
    expect(r).toEqual({ ok: false, error: 'otra línea' });
  });

  it('un error que no es del audio también se prueba de una vez', async () => {
    const p = falso((_l, yo) => yo.decir('{"ok": false, "error": "KeyError: audios"}\n'));
    iniciarTranscripcionResidente('C:\\STL', { ...sinEsperas, lanzar: () => p });
    p.decir('LISTO\n');
    let llamadas = 0;
    expect(await transcribirEnLocal('C:\\STL', [nota('raro')], 'P.', python, (_c, _a, _o, cb) => { llamadas++; cb(null, '', ''); })).toEqual({ ok: true });
    expect(llamadas).toBe(1);
  });

  it('pasado el plazo mata al servidor y no responde (quien llama lo hace de una vez)', async () => {
    const p = falso();
    const r = crearResidente('C:\\STL', { ...sinEsperas, plazoMs: 20, lanzar: () => p });
    p.decir('LISTO\n');
    expect(r.listo()).toBe(true);
    expect(await r.pedir(['a.webm'], 'P.')).toBeNull();
    expect(r.listo()).toBe(false);
    r.detener();
  });

  it('si muere, se levanta solo con espera y con tope de reinicios', async () => {
    const procesos: Falso[] = [];
    const r = crearResidente('C:\\STL', { p: python, esperasDeReinicioMs: [5, 5], lanzar: () => { const p = falso(); procesos.push(p); return p; } });
    expect(procesos).toHaveLength(1);
    for (const esperado of [2, 3, 3]) {
      procesos.at(-1)!.emit('exit', 1);
      await new Promise((ok) => setTimeout(ok, 40));
      expect(procesos).toHaveLength(esperado); // al tercer reinicio se rinde: lo de una vez sigue sirviendo
    }
    expect(r.listo()).toBe(false);
    r.detener();
  });

  it('sin la transcripción instalada no se inicia, y el Studio lo enciende y lo apaga con el servidor', () => {
    expect(iniciarTranscripcionResidente('C:\\STL', { p: { python: 'py', instalado: false }, lanzar: () => { throw new Error('no'); } })).toBe(false);
    const api = readFileSync(join(import.meta.dirname, '..', '..', 'estudio', 'servidor', 'api.ts'), 'utf-8');
    expect(api).toContain('iniciarTranscripcionResidente(raiz);');
    expect(api).toContain('detenerTranscripcionResidente();');
    expect(api).toContain("ruta === '/dictar'");
    // El chat salió del Studio (nmwiklx70tit): el modelo de voz sigue listo solo para las notas
    expect(api).not.toContain('/chat/dictar');
    const py = readFileSync(join(import.meta.dirname, '..', '..', 'tools', 'director', 'transcribir.py'), 'utf-8');
    expect(py).toContain("print('LISTO', flush=True)");
    expect(py).toContain('def transcribir_audio(');
  });
});
