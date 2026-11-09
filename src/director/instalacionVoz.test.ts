import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { avanceDeInstalacion, causaDeFalla, esResultadoPrueba, respuestasDePrueba, ultimaLineaDe, vozPuedeSeguir, type EstadoVoz } from './instalacionVoz';

const con = (t: EstadoVoz['transcripcion']['estado'], v: EstadoVoz['voces']['estado']): EstadoVoz => ({ transcripcion: { estado: t }, voces: { estado: v }, carpetaVoces: 'C:/d/voces' });

describe('una sola instalación para todos (regla una_instalacion)', () => {
  const entorno = (archivo: string) => readFileSync(join(import.meta.dirname, '..', '..', 'tools', 'entorno', archivo), 'utf8');
  const sinComentarios = (texto: string) => texto.split(/\r?\n/).filter((l) => !l.trim().startsWith('#')).join('\n');
  const transcripcion = entorno('instalar_transcripcion.sh');
  const voces = entorno('instalar_voces.sh');

  it('ningún guion ni requisito baja algo según la tarjeta gráfica', () => {
    for (const texto of [transcripcion, voces, entorno('transcripcion_requisitos.txt')]) {
      expect(sinComentarios(texto)).not.toMatch(/nvidia|cuda|cublas|cudnn|gpu|lspci|onnxruntime-gpu/i);
    }
  });

  it('el sistema solo cambia cómo se llama a uv y a Python, nunca qué se instala', () => {
    for (const texto of [transcripcion, voces]) {
      const instala = sinComentarios(texto).split('\n').filter((l) => l.includes('uv pip install'));
      expect(instala.length).toBe(1);
      expect(instala[0].startsWith('uv pip install')).toBe(true);
    }
  });

  it('la barra de avance cuenta las etapas que el guion anuncia', () => {
    expect(sinComentarios(transcripcion).match(/echo '== /g)).toHaveLength(3); // uv, si falta, y sus dos etapas
    expect(avanceDeInstalacion('== faster-whisper\n== Bajando el modelo\nmodel.bin:  50%', 'transcripcion')).toBe(75);
  });

  it('transcribe siempre en el procesador: ni busca ni nombra las librerías de la tarjeta (nmvzldowltit)', () => {
    const py = readFileSync(join(import.meta.dirname, '..', '..', 'tools', 'director', 'transcribir.py'), 'utf8');
    expect(py).not.toMatch(/nvidia|cuda|cublas|cudnn|gpu|tarjeta/i);
    expect(py).toContain("return WhisperModel('large-v3-turbo', device='cpu', compute_type='int8')");
    expect(existsSync(join(import.meta.dirname, '..', '..', 'tools', 'entorno', 'transcripcion_gpu.txt'))).toBe(false);
    expect(transcripcion).not.toMatch(/nvidia|cuda|tarjeta gr[aá]fica/i);
  });
});

describe('por qué falló una descarga', () => {
  it('dice si fue internet o espacio, por lo que dijo el guion', () => {
    expect(causaDeFalla('curl: (6) Could not resolve host: github.com', 'voces')).toBe('internet');
    expect(causaDeFalla('huggingface_hub.errors.LocalEntryNotFoundError: Cannot find…', 'transcripcion')).toBe('internet');
    expect(causaDeFalla('ConnectionError: HTTPSConnectionPool(host=…)', 'transcripcion')).toBe('internet');
    expect(causaDeFalla('OSError: [Errno 28] No space left on device', 'transcripcion')).toBe('espacio');
    expect(causaDeFalla('There is not enough space on the disk', 'voces')).toBe('espacio');
    // Sin espacio, la descarga también se corta: el disco manda
    expect(causaDeFalla('curl: (23) Failure writing output: No space left on device', 'voces')).toBe('espacio');
  });

  it('si no lo dice, mira el disco; y si tampoco, no inventa', () => {
    expect(causaDeFalla('Traceback: algo raro', 'transcripcion', 1e9)).toBe('espacio');
    expect(causaDeFalla('Traceback: algo raro', 'voces', 1e9)).toBe('otra');
    expect(causaDeFalla('Traceback: algo raro', 'transcripcion', null)).toBe('otra');
    expect(causaDeFalla('', 'transcripcion')).toBe('otra');
  });

  it('lo último que dijo, sin las líneas de su barra de avance', () => {
    expect(ultimaLineaDe('== x\nValueError: malo\n 45.2%\r\n')).toBe('ValueError: malo');
    expect(ultimaLineaDe('')).toBe('');
  });
});

describe('la barra de avance', () => {
  it('avanza por etapas y dentro de cada una con su porcentaje, y no llega al 100 antes de terminar', () => {
    expect(avanceDeInstalacion('', 'voces')).toBe(0);
    expect(avanceDeInstalacion('== Kokoro\n', 'voces')).toBe(0);
    expect(avanceDeInstalacion('== Kokoro\n100%\n== El modelo\n###   50.0%\r', 'voces')).toBe(75);
    expect(avanceDeInstalacion('== A\n== B\n== Bajando el modelo\nmodel.bin:  10%|█ | 1G/2G\rmodel.bin:  30%|█ | 1G/2G\r', 'transcripcion')).toBe(77);
    expect(avanceDeInstalacion('== A\n== B\n100%', 'voces')).toBe(99);
    // Con una etapa más de las previstas (instalar uv), no se pasa
    expect(avanceDeInstalacion('== uv\n== A\n== B\n== C\n', 'transcripcion')).toBe(75);
    // Lo de una etapa anterior no cuenta en la nueva
    expect(avanceDeInstalacion('== A\n90%\n== B\n', 'voces')).toBe(50);
  });
});

describe('cuándo se puede seguir de la pantalla de la voz', () => {
  it('la transcripción es obligatoria: sin instalar o sin probar, no; nada la salta', () => {
    expect(vozPuedeSeguir({ prueba: 'bien' }, null, false)).toBe(false);
    for (const t of ['sin_instalar', 'instalando', 'fallo'] as const) expect(vozPuedeSeguir({ prueba: 'bien' }, con(t, 'lista'), false)).toBe(false);
    expect(vozPuedeSeguir({}, con('lista', 'lista'), false)).toBe(false);
  });

  it('sin micrófono ahora o «la corrijo después» también siguen, con las dos instaladas', () => {
    for (const prueba of ['bien', 'sigo', 'sin_mic'] as const) expect(vozPuedeSeguir({ prueba }, con('lista', 'lista'), false)).toBe(true);
  });

  it('las voces son obligatorias: sin ellas no se sigue, ni con una elección guardada de cuando eran opcionales (nmvzfmvr2tit)', () => {
    for (const t of ['sin_instalar', 'instalando', 'fallo'] as const) {
      expect(vozPuedeSeguir({ prueba: 'bien' }, con('lista', t), false)).toBe(false);
      expect(vozPuedeSeguir({ prueba: 'bien', voces: false, sinVoz: true } as { prueba: 'bien' }, con('lista', t), false)).toBe(false);
    }
    expect(vozPuedeSeguir({ prueba: 'bien' }, con('lista', 'lista'), false)).toBe(true);
  });

  it('al repasar, nada detiene a nadie', () => {
    expect(vozPuedeSeguir({}, null, true)).toBe(true);
    expect(vozPuedeSeguir({}, con('sin_instalar', 'sin_instalar'), true)).toBe(true);
  });
});

describe('lo que entendió la prueba', () => {
  it('«Sí» y «Grabar otra vez»; desde el segundo intento, también «Sigo así»', () => {
    expect(respuestasDePrueba(1)).toEqual(['bien', 'otra']);
    expect(respuestasDePrueba(2)).toEqual(['bien', 'otra', 'sigo']);
    expect(respuestasDePrueba(5)).toEqual(['bien', 'otra', 'sigo']);
  });

  it('lo guardado se revisa', () => {
    for (const x of ['bien', 'sigo', 'sin_mic']) expect(esResultadoPrueba(x)).toBe(true);
    for (const x of ['otra', '', null, undefined]) expect(esResultadoPrueba(x)).toBe(false);
  });
});
