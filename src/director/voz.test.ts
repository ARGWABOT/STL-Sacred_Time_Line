import { describe, expect, it } from 'vitest';
import { comandoVoz } from './transcripcion';
import {
  comoInstalarKokoro,
  errorDeVozNatural,
  esVozNatural,
  idiomaDeIdNatural,
  leerAvisosVoces,
  leerListaVoces,
  MAX_TEXTO_VOZ,
  momentosDePalabras,
  motivoSinVoces,
  palabraAlMomento,
  partirPreguntas,
  revisarPedidoDeVoz,
  sinVozPorque,
  unirWavs,
  VOZ_NATURAL_POR_DEFECTO,
  vozNaturalDe,
  vozPorDefecto,
  type VozNatural,
} from './voz';

const dora: VozNatural = { id: 'kokoro:ef_dora', nombre: 'Dora (Kokoro)', idioma: 'es' };
const santa: VozNatural = { id: 'kokoro:em_santa', nombre: 'Santa (Kokoro)', idioma: 'es' };
const alex: VozNatural = { id: 'kokoro:em_alex', nombre: 'Alex (Kokoro)', idioma: 'es' };
const heart: VozNatural = { id: 'kokoro:af_heart', nombre: 'Heart (Kokoro)', idioma: 'en' };
const george: VozNatural = { id: 'kokoro:bm_george', nombre: 'George (Kokoro)', idioma: 'en' };

describe('las voces de Kokoro, las únicas del Studio (nota de voz del titular nmvpdu9zqtit, 26 de octubre de 2026)', () => {
  it('solo una voz de Kokoro es una voz: ni las del navegador ni las de Piper lo son ya', () => {
    expect(esVozNatural('kokoro:ef_dora')).toBe(true);
    expect(esVozNatural('kokoro:af_heart')).toBe(true);
    // Los ids de antes (una voz de Piper o una del navegador) ya no son una voz del Studio
    expect(esVozNatural('piper:es_MX-claude-high')).toBe(false);
    expect(esVozNatural('piper:en_US-hfc_male-medium')).toBe(false);
    expect(esVozNatural('Microsoft Sabina')).toBe(false);
    expect(esVozNatural('urn:moz-tts:sapi:Microsoft Sabina - Spanish (Mexico)?es-MX')).toBe(false);
    // Un id que intenta salirse de la carpeta o un motor desconocido tampoco
    expect(esVozNatural('kokoro:../../etc/passwd')).toBe(false);
    expect(esVozNatural('otro:voz')).toBe(false);
    expect(esVozNatural('kokoro:')).toBe(false);
    expect(esVozNatural(null)).toBe(false);
    expect(esVozNatural('')).toBe(false);
  });

  it('reconoce el idioma de una voz de Kokoro por su id', () => {
    expect(idiomaDeIdNatural('kokoro:ef_dora')).toBe('es');
    expect(idiomaDeIdNatural('kokoro:em_santa')).toBe('es');
    expect(idiomaDeIdNatural('kokoro:af_heart')).toBe('en');
    expect(idiomaDeIdNatural('kokoro:bm_george')).toBe('en');
    // Lo que no es de Kokoro no tiene idioma que reconocer
    expect(idiomaDeIdNatural('piper:es_MX-claude-high')).toBeNull();
    expect(idiomaDeIdNatural('Sabina')).toBeNull();
    expect(idiomaDeIdNatural(null)).toBeNull();
  });

  it('lee lo que imprime voz.py --lista y descarta lo que no sea una voz de Kokoro, sin fallar', () => {
    const salida = JSON.stringify({
      voces: [
        // Una entrada de Piper (de un voz.py de antes, o a mano) se ignora
        { id: 'piper:es_MX-claude-high', nombre: 'Claude (Piper, México, alta)', idioma: 'es', motor: 'piper' },
        { id: 'kokoro:af_heart', nombre: 'Heart (Kokoro)', idioma: 'en' },
        { id: 'kokoro:af_heart', nombre: 'repetida', idioma: 'en' },
        { id: 'piper:es_ES-sharvard-medium' },
        { id: '../mala', nombre: 'mala', idioma: 'es' },
        { nombre: 'sin id' },
        { id: 'kokoro:ef_dora' },
      ],
      avisos: [],
    });
    const voces = leerListaVoces(salida);
    expect(voces.map((v) => v.id)).toEqual(['kokoro:af_heart', 'kokoro:ef_dora']);
    expect(voces.some((v) => v.id.startsWith('piper:'))).toBe(false);
    // Sin nombre ni idioma, salen del id
    expect(voces[1]).toEqual({ id: 'kokoro:ef_dora', nombre: 'kokoro:ef_dora', idioma: 'es' });
    // Basura delante del JSON (un aviso de Python) no lo rompe; lo que no es JSON es una lista vacía
    expect(leerListaVoces(`aviso raro\n${salida}`)).toHaveLength(2);
    expect(leerListaVoces('')).toEqual([]);
    expect(leerListaVoces('Traceback (most recent call last)')).toEqual([]);
    expect(leerListaVoces('{"voces": 3}')).toEqual([]);
    // Una lista que solo trae voces de Piper queda vacía: sin Kokoro, no hay voz
    expect(leerListaVoces(JSON.stringify({ voces: [{ id: 'piper:es_MX-claude-high', nombre: 'Claude', idioma: 'es' }], avisos: [] }))).toEqual([]);
  });

  it('lee los avisos de voz.py --lista, que dicen por qué no hay voces', () => {
    const salida = JSON.stringify({ voces: [], avisos: ['Kokoro: faltan los archivos del modelo en la carpeta de voces.', '  ', 3] });
    expect(leerAvisosVoces(salida)).toEqual(['Kokoro: faltan los archivos del modelo en la carpeta de voces.']);
    expect(leerAvisosVoces(`aviso raro\n${salida}`)).toHaveLength(1);
    expect(leerAvisosVoces('')).toEqual([]);
    expect(leerAvisosVoces('{"voces": []}')).toEqual([]);
  });

  it('el servidor solo lee con una voz de Kokoro instalada, con texto y con tope', () => {
    const instaladas = [santa, dora];
    expect(revisarPedidoDeVoz('kokoro:em_santa', '  Hola  ', instaladas)).toEqual({ ok: true, voz: 'kokoro:em_santa', texto: 'Hola' });
    expect(revisarPedidoDeVoz('kokoro:af_heart', 'Hola', instaladas)).toMatchObject({ ok: false });
    // Un id de Piper o de una voz del navegador nunca está en la lista, así que nunca se lee con él
    expect(revisarPedidoDeVoz('piper:es_MX-claude-high', 'Hola', instaladas)).toMatchObject({ ok: false });
    expect(revisarPedidoDeVoz('Microsoft Sabina', 'Hola', instaladas)).toMatchObject({ ok: false });
    expect(revisarPedidoDeVoz('kokoro:em_santa', '   ', instaladas)).toMatchObject({ ok: false, error: 'No hay texto que leer.' });
    expect(revisarPedidoDeVoz('kokoro:em_santa', 'x'.repeat(MAX_TEXTO_VOZ + 1), instaladas)).toMatchObject({ ok: false });
    expect(revisarPedidoDeVoz(3, 'Hola', instaladas)).toMatchObject({ ok: false });
    expect(revisarPedidoDeVoz('kokoro:em_santa', 'Hola', [])).toMatchObject({ ok: false });
  });

  it('elige la voz por idioma: la guardada, si no la de por defecto, y si no hay ninguna, ninguna (nunca otra voz)', () => {
    const todas = [dora, santa, alex, heart, george];
    // Santa en español (la que eligió el titular) y Heart en inglés, las dos de Kokoro
    expect(VOZ_NATURAL_POR_DEFECTO).toEqual({ es: 'kokoro:em_santa', en: 'kokoro:af_heart' });
    // Sin elegir: la de por defecto de cada idioma
    expect(vozNaturalDe('es', null, todas)).toBe(santa);
    expect(vozNaturalDe('en', null, todas)).toBe(heart);
    // Elegida: esa
    expect(vozNaturalDe('es', 'kokoro:ef_dora', todas)).toBe(dora);
    expect(vozNaturalDe('en', 'kokoro:bm_george', todas)).toBe(george);
    // Una elegida que ya no está instalada, o que es de otro idioma, cae a la de por defecto
    expect(vozNaturalDe('es', 'kokoro:em_alex', [dora, santa])).toBe(santa);
    expect(vozNaturalDe('es', 'kokoro:af_heart', todas)).toBe(santa);
    // Sin la de por defecto, la primera de ese idioma que haya
    expect(vozNaturalDe('es', null, [dora, heart])).toBe(dora);
    // Sin ninguna de ese idioma (o sin ninguna), no hay voz: la niebla lo dice y no lee
    expect(vozNaturalDe('es', null, [])).toBeNull();
    expect(vozNaturalDe('es', null, [heart])).toBeNull();
    expect(vozNaturalDe('pt', null, todas)).toBeNull();
  });

  it('una elección vieja que no es de Kokoro (una voz del navegador o de Piper) cae a la de por defecto del idioma', () => {
    const todas = [dora, santa, heart];
    for (const vieja of ['piper:es_MX-claude-high', 'piper:en_US-hfc_male-medium', 'Microsoft Sabina', 'Paulina', 'urn:moz-tts:sapi:Helena?es-ES', '']) {
      expect(vozNaturalDe('es', vieja, todas)).toBe(santa);
      expect(vozNaturalDe('en', vieja, todas)).toBe(heart);
      // Mientras no se sabe qué hay instalado, también: la de por defecto, nunca la vieja
      expect(vozNaturalDe('es', vieja, null)?.id).toBe('kokoro:em_santa');
      expect(vozNaturalDe('en', vieja, null)?.id).toBe('kokoro:af_heart');
      // Y sin Kokoro instalado, no cae a nada
      expect(vozNaturalDe('es', vieja, [])).toBeNull();
    }
  });

  it('mientras no se sabe qué hay instalado, vale la elegida de ese idioma o la de por defecto; el servidor comprueba al leer', () => {
    expect(vozNaturalDe('es', 'kokoro:ef_dora', null)).toEqual({ id: 'kokoro:ef_dora', nombre: 'ef_dora', idioma: 'es' });
    expect(vozNaturalDe('en', 'kokoro:ef_dora', null)?.id).toBe('kokoro:af_heart');
    expect(vozNaturalDe('es', null, null)?.id).toBe('kokoro:em_santa');
    // Un idioma sin voz de Kokoro en el Studio no tiene voz, sepa o no lo que hay
    expect(vozNaturalDe('pt', null, null)).toBeNull();
  });

  it('la voz por defecto de un idioma es la suya si está instalada y, si no, la primera de ese idioma', () => {
    expect(vozPorDefecto('es', [dora, santa])).toBe(santa);
    expect(vozPorDefecto('es', [dora, alex])).toBe(dora);
    expect(vozPorDefecto('en', [dora, santa])).toBeNull();
    expect(vozPorDefecto('es', [])).toBeNull();
  });

  it('dice cómo instalar Kokoro: sin WSL, la misma orden en todo sistema; en Windows, en Git Bash (pr_voz_sin_wsl)', () => {
    expect(comoInstalarKokoro(true)).toBe('Se instalan, desde la carpeta del Studio, en Git Bash, con: bash tools/entorno/instalar_voces.sh');
    expect(comoInstalarKokoro(false)).toBe('Se instalan, desde la carpeta del Studio, con: bash tools/entorno/instalar_voces.sh');
  });

  it('cuando la lista sale vacía, el motivo dice que Kokoro no está instalado, el detalle de Python y cómo instalarlo', () => {
    const instalar = comoInstalarKokoro(false);
    expect(motivoSinVoces([], instalar)).toBe(`Las voces de Kokoro no están instaladas en este computador. ${instalar}`);
    expect(motivoSinVoces(['Kokoro: el paquete kokoro-onnx no está instalado.'], instalar)).toBe(
      `Las voces de Kokoro no están instaladas en este computador (el paquete kokoro-onnx no está instalado). ${instalar}`,
    );
  });

  it('el aviso de que no hay voz dice qué falta, cómo instalarla y que el director sigue sin voz, a su ritmo', () => {
    const motivo = motivoSinVoces([], comoInstalarKokoro(true));
    // Sin ninguna voz de Kokoro instalada: que no están instaladas y cómo instalarlas, con el mismo comando del servidor
    const sinKokoro = sinVozPorque('es', [], motivo);
    expect(sinKokoro).toContain('Las voces de Kokoro no están instaladas en este computador');
    expect(sinKokoro).toContain('en Git Bash, con: bash tools/entorno/instalar_voces.sh');
    expect(sinKokoro).toContain('el director sigue sin voz, a su ritmo');
    expect(sinKokoro).not.toContain('Comprobar de nuevo');
    // Con su botón, el aviso dice cuándo oprimirlo
    expect(sinVozPorque('es', [], motivo, true)).toContain('oprime «Comprobar de nuevo»');
    // Nunca manda a las voces del sistema ni a las del navegador
    expect(sinKokoro).not.toMatch(/navegador|Windows › |Configuración|Piper/);
    // Con Kokoro instalado pero sin voz para este idioma: lo dice sin pedir instalar lo que ya está
    expect(sinVozPorque('es', [heart], motivo)).toBe('No encuentro una voz de Kokoro en español instalada en este computador, así que el director sigue sin voz, a su ritmo.');
    expect(sinVozPorque('pt', [heart, santa], motivo)).toBe('Kokoro todavía no tiene una voz en portugués en el Studio, así que el director sigue sin voz, a su ritmo.');
  });

  it('reparte las palabras sobre la duración real del audio, en proporción a los caracteres', () => {
    const texto = 'Hola mundo grande';
    const palabras: [number, number][] = [[0, 4], [5, 10], [11, 17]];
    expect(momentosDePalabras(palabras, 0, 17)).toEqual([0, 5, 11]);
    // Leyendo desde la segunda palabra, su tiempo es 0 y la duración es la del resto
    const desde = palabras[1][0];
    const resto = momentosDePalabras(palabras.slice(1), desde, 12);
    expect(resto[0]).toBe(0);
    expect(resto[1]).toBeCloseTo(6, 5);
    expect(texto.slice(desde)).toBe('mundo grande');
    // El doble de duración, el doble de tiempo; sin duración, todas en 0
    expect(momentosDePalabras(palabras, 0, 34)).toEqual([0, 10, 22]);
    expect(momentosDePalabras(palabras, 0, 0)).toEqual([0, 0, 0]);
    expect(momentosDePalabras([], 0, 5)).toEqual([]);
    // La palabra que suena en cada segundo
    const m = momentosDePalabras(palabras, 0, 17);
    expect(palabraAlMomento(m, -1)).toBe(-1);
    expect(palabraAlMomento(m, 0)).toBe(0);
    expect(palabraAlMomento(m, 4.9)).toBe(0);
    expect(palabraAlMomento(m, 5)).toBe(1);
    expect(palabraAlMomento(m, 99)).toBe(2);
    expect(palabraAlMomento([], 3)).toBe(-1);
  });

  it('si falla, lo dice con el motivo y que la voz quedó apagada', () => {
    expect(errorDeVozNatural('Falta el paquete de Kokoro')).toContain('Falta el paquete de Kokoro');
    expect(errorDeVozNatural(undefined)).toContain('el servidor no respondió');
    expect(errorDeVozNatural('x')).toContain('La apagué');
    expect(errorDeVozNatural('x')).toContain('La voz de Kokoro no pudo leer');
  });

  it('corre voz.py con el mismo Python que la transcripción, el del venv, con la ruta de este computador y nunca dentro de WSL (nota de voz del titular nmvs7si3qtit)', () => {
    const raiz = 'C:\\xampp2024\\htdocs\\www\\STL';
    const c = comandoVoz(raiz, ['--voz', 'kokoro:em_santa'], { python: 'C:\\Users\\ana\\director\\.venv\\Scripts\\python.exe', instalado: true });
    expect(c.cmd).toBe('C:\\Users\\ana\\director\\.venv\\Scripts\\python.exe');
    expect(c.args[0]).toMatch(/^C:\\xampp2024\\htdocs\\www\\STL[\\/]tools[\\/]director[\\/]voz\.py$/);
    expect(c.args.slice(-2)).toEqual(['--voz', 'kokoro:em_santa']);
    // Lo que elige hoy este computador: su voz.py, directo
    const hoy = comandoVoz(raiz, ['--lista']);
    expect(hoy.cmd).not.toBe('wsl');
    expect(hoy.args[0]).toMatch(/tools[\\/]director[\\/]voz\.py$/);
    expect(hoy.args.at(-1)).toBe('--lista');
  });
});

const sinEspacios = (t: string) => t.replace(/\s+/g, '');

describe('la voz entona las preguntas: cada una se lee aparte, con su ¿ y su ? (pedido pd_voz_preguntas)', () => {
  it('una pregunta en medio de un párrafo da tres fragmentos: lo de antes, la pregunta entera y lo de después', () => {
    const texto = 'Lo hicimos ayer y salió bien. ¿Qué te parece el resultado? Mañana seguimos con el resto.';
    const fragmentos = partirPreguntas(texto);
    expect(fragmentos).toEqual(['Lo hicimos ayer y salió bien.', '¿Qué te parece el resultado?', 'Mañana seguimos con el resto.']);
    // Juntos de nuevo dan el mismo texto: solo faltan los espacios entre fragmentos
    expect(fragmentos.join(' ')).toBe(texto);
    expect(sinEspacios(fragmentos.join(''))).toBe(sinEspacios(texto));
    // La pregunta empieza en su ¿, no donde empieza la oración: lo de antes se queda con su coma
    expect(partirPreguntas('Dime una cosa, ¿vienes mañana? Te espero.')).toEqual(['Dime una cosa,', '¿vienes mañana?', 'Te espero.']);
    // Al comienzo o al final del texto son dos fragmentos
    expect(partirPreguntas('¿Lo viste? Estaba claro.')).toEqual(['¿Lo viste?', 'Estaba claro.']);
    expect(partirPreguntas('Estaba claro. ¿Lo viste?')).toEqual(['Estaba claro.', '¿Lo viste?']);
  });

  it('varias preguntas seguidas son un fragmento cada una, y lo que no es pregunta no se parte por oraciones', () => {
    expect(partirPreguntas('¿Cuál es tu nombre? ¿De dónde vienes? ¿Y qué buscas?')).toEqual(['¿Cuál es tu nombre?', '¿De dónde vienes?', '¿Y qué buscas?']);
    expect(partirPreguntas('Una cosa. Otra cosa. ¿Uno? ¿Dos? Luego sigo. Y termino.')).toEqual(['Una cosa. Otra cosa.', '¿Uno?', '¿Dos?', 'Luego sigo. Y termino.']);
    // «?!» y «??» cierran la misma pregunta; una pregunta con comas o con varias partes adentro sigue siendo una
    expect(partirPreguntas('Ojo. ¿Qué pasó?! No sé. ¿Quién, cuándo y dónde?? Ya.')).toEqual(['Ojo.', '¿Qué pasó?!', 'No sé.', '¿Quién, cuándo y dónde??', 'Ya.']);
    // Un salto de línea no la cambia
    expect(partirPreguntas('Primera línea\n¿Segunda? Tercera línea\nCuarta?')).toEqual(['Primera línea', '¿Segunda?', 'Tercera línea', 'Cuarta?']);
  });

  it('en inglés la pregunta no trae ¿: empieza donde empieza su oración', () => {
    const texto = 'I fixed it yesterday. Did you see the result? We continue tomorrow.';
    expect(partirPreguntas(texto)).toEqual(['I fixed it yesterday.', 'Did you see the result?', 'We continue tomorrow.']);
    expect(partirPreguntas(texto).join(' ')).toBe(texto);
    // Sin nada antes, empieza con el texto; el punto de 2.0 o de voz.py no termina una oración
    expect(partirPreguntas('Does version 2.0 of voz.py work? Yes.')).toEqual(['Does version 2.0 of voz.py work?', 'Yes.']);
    expect(partirPreguntas('Hello, did you see it? Yes.')).toEqual(['Hello, did you see it?', 'Yes.']);
    // Una exclamación, los puntos suspensivos y el salto de línea terminan la oración de antes
    expect(partirPreguntas('Wow! Did you see it? Well... maybe? First item\nReady? Go.')).toEqual(['Wow!', 'Did you see it?', 'Well...', 'maybe?', 'First item', 'Ready?', 'Go.']);
    expect(partirPreguntas('Ready? Sure? Go.')).toEqual(['Ready?', 'Sure?', 'Go.']);
  });

  it('un texto sin preguntas, o que es una sola, da un fragmento igual al original: una llamada, como siempre', () => {
    for (const texto of ['Esto no pregunta nada. Solo afirma lo que hay.', 'Hola', '¿Cómo estás?', 'Did you see it?', '¿Qué hora es, y por qué tan tarde?', '¿Dormiste bien?!', '  ¿Con espacios?  ', '']) {
      expect(partirPreguntas(texto), texto).toEqual([texto]);
    }
  });

  it('un «?» que no cierra una pregunta no corta el texto', () => {
    // Pegado a una letra o a un punto (a?.b, /x?y=1), o un ¿ que nunca se cierra
    for (const texto of ['Usa a?.b y la dirección /x?y=1 sin más.', 'Falta cerrar: ¿Qué hora es', 'La opción ?x sirve.']) expect(partirPreguntas(texto), texto).toEqual([texto]);
    // Y no estorba a una pregunta de verdad en el mismo texto
    expect(partirPreguntas('Usa a?.b. ¿Funciona? Sí, con a?.b también.')).toEqual(['Usa a?.b.', '¿Funciona?', 'Sí, con a?.b también.']);
  });

  it('lo que no se puede decir solo (un paréntesis, unos puntos suspensivos, un emoji) se pega al fragmento de al lado', () => {
    expect(partirPreguntas('(¿Verdad?) ¿Seguro?')).toEqual(['(¿Verdad?)', '¿Seguro?']);
    expect(partirPreguntas('Listo. ¿Seguro? ...')).toEqual(['Listo.', '¿Seguro? ...']);
    expect(partirPreguntas('Listo. ¿Seguro? 🙂')).toEqual(['Listo.', '¿Seguro? 🙂']);
    // Las comillas de cierre se quedan con su pregunta
    expect(partirPreguntas('Dijo «¿qué hora es?» y se fue.')).toEqual(['Dijo «', '¿qué hora es?»', 'y se fue.']);
  });

  it('no pierde ni reordena nada, y ningún fragmento queda sin nada que decir', () => {
    const textos = [
      'Hola, ¿cómo estás? Bien. ¿Y tú?',
      'Pregunta: ¿apruebas la recomendación? Si es así, sigo; si no, ¿qué cambio?',
      '(¿Verdad?) ¿Seguro? ...',
      'Primera línea\n¿Segunda? Tercera línea\nCuarta?',
      '¿Quién?? ¡Sí! ¿Cuándo?! Ahora. 🙂',
      'Did you? I did! Really? Yes... maybe? "Okay?" (Sure?) ?',
      '? ¿? ¿ ?',
    ];
    for (const texto of textos) {
      const fragmentos = partirPreguntas(texto);
      expect(sinEspacios(fragmentos.join('')), texto).toBe(sinEspacios(texto));
      if (fragmentos.length > 1) for (const f of fragmentos) expect(f, texto).toMatch(/[\p{L}\p{N}]/u);
    }
  });
});

/** Un WAV como el que escribe Python: cabecera de 44 bytes, PCM de 16 bits, con estas muestras. Se arma aquí, a mano, no con el código que se prueba. */
function wavDe(muestras: number[], frecuencia = 24000, canales = 1): Uint8Array {
  const datos = muestras.length * 2;
  const wav = new Uint8Array(44 + datos);
  const v = new DataView(wav.buffer);
  const poner = (en: number, marca: string) => [...marca].forEach((c, i) => (wav[en + i] = c.charCodeAt(0)));
  poner(0, 'RIFF');
  v.setUint32(4, 36 + datos, true);
  poner(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, canales, true);
  v.setUint32(24, frecuencia, true);
  v.setUint32(28, frecuencia * canales * 2, true);
  v.setUint16(32, canales * 2, true);
  v.setUint16(34, 16, true);
  poner(36, 'data');
  v.setUint32(40, datos, true);
  muestras.forEach((m, i) => v.setInt16(44 + i * 2, m, true));
  return wav;
}

/** Lo que un WAV de 44 bytes de cabecera dice de sí mismo y sus muestras, leído por posición fija: otra lectura que la del código que se prueba. */
function leerWavDe44(wav: Uint8Array) {
  const v = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const marca = (en: number) => String.fromCharCode(...wav.subarray(en, en + 4));
  return {
    riff: marca(0),
    tamRiff: v.getUint32(4, true),
    wave: marca(8),
    fmt: marca(12),
    tamFmt: v.getUint32(16, true),
    tipo: v.getUint16(20, true),
    canales: v.getUint16(22, true),
    frecuencia: v.getUint32(24, true),
    bytesPorSegundo: v.getUint32(28, true),
    alineacion: v.getUint16(32, true),
    bits: v.getUint16(34, true),
    data: marca(36),
    tamData: v.getUint32(40, true),
    muestras: Array.from({ length: (wav.length - 44) / 2 }, (_, i) => v.getInt16(44 + i * 2, true)),
  };
}

describe('unirWavs: los audios de cada fragmento salen como un solo WAV (pedido pd_voz_preguntas)', () => {
  it('une dos WAV en uno válido: sus datos suman los de los dos y los tamaños de RIFF y de data están bien puestos', () => {
    const a = wavDe([1, -2, 300]);
    const b = wavDe([-32768, 32767]);
    const unido = unirWavs([a, b])!;
    expect(unido.length).toBe(44 + 10);
    expect(leerWavDe44(unido)).toEqual({
      riff: 'RIFF',
      tamRiff: unido.length - 8,
      wave: 'WAVE',
      fmt: 'fmt ',
      tamFmt: 16,
      tipo: 1,
      canales: 1,
      frecuencia: 24000,
      bytesPorSegundo: 48000,
      alineacion: 2,
      bits: 16,
      data: 'data',
      tamData: 10,
      muestras: [1, -2, 300, -32768, 32767],
    });
    // Los datos son los del primero y luego los del segundo, byte por byte
    expect([...unido.subarray(44)]).toEqual([...a.subarray(44), ...b.subarray(44)]);
    // Con otra frecuencia (la que traigan) la conserva, y también sus tamaños
    const lento = leerWavDe44(unirWavs([wavDe([1], 16000), wavDe([2, 3], 16000)])!);
    expect([lento.frecuencia, lento.bytesPorSegundo, lento.tamData, lento.tamRiff]).toEqual([16000, 32000, 6, 42]);
  });

  it('une tres o más en su orden, y con uno lo devuelve tal cual: lo que no tiene preguntas no se toca', () => {
    const [a, b, c] = [wavDe([1]), wavDe([2, 3]), wavDe([4, 5, 6])];
    expect(leerWavDe44(unirWavs([a, b, c])!).muestras).toEqual([1, 2, 3, 4, 5, 6]);
    expect(unirWavs([a])).toBe(a);
  });

  it('lee el WAV por sus bloques: salta los que no son suyos y respeta el relleno de los impares', () => {
    // Un bloque LIST de 3 bytes (más uno de relleno) entre el formato y las muestras: las muestras no empiezan en el byte 44
    const base = wavDe([7, 8]);
    const lista = [...'LIST'].map((c) => c.charCodeAt(0)).concat([3, 0, 0, 0, 9, 9, 9, 0]);
    const conLista = Uint8Array.from([...base.subarray(0, 36), ...lista, ...base.subarray(36)]);
    expect(leerWavDe44(unirWavs([conLista, wavDe([9])])!).muestras).toEqual([7, 8, 9]);
  });

  it('un audio cortado a media muestra no desalinea el que le sigue', () => {
    const cortado = wavDe([1, 2, 3]).subarray(0, 44 + 5); // dice 6 bytes de muestras y trae 5
    expect(leerWavDe44(unirWavs([cortado, wavDe([9])])!).muestras).toEqual([1, 2, 9]);
  });

  it('no une lo que no se puede unir: formatos distintos, algo que no es un WAV, o nada', () => {
    expect(unirWavs([wavDe([1]), wavDe([2], 16000)])).toBeNull();
    expect(unirWavs([wavDe([1]), wavDe([2, 3], 24000, 2)])).toBeNull();
    expect(unirWavs([wavDe([1]), Uint8Array.from([1, 2, 3])])).toBeNull();
    expect(unirWavs([wavDe([1]), new TextEncoder().encode('RIFF....WAVEdatos')])).toBeNull();
    expect(unirWavs([])).toBeNull();
  });
});
