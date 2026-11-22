import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { avanceReal, quePedirAlRecargar, type EstadoVoz, type Instalacion } from '../../src/director/instalacionVoz';
import { cuerpoVoz, PRUEBA_NUEVA, zonaPrueba, zonaTranscripcion, zonaVoces } from './asistenteVoz';
import { ponerIdioma } from './textos';

afterEach(() => ponerIdioma('es'));

const sinMarcas = (x: string) => x.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const estado = (transcripcion: Instalacion, voces: Instalacion = { estado: 'sin_instalar' }): EstadoVoz => ({ transcripcion, voces, carpetaVoces: 'C:/casa/director/voces' });
const LISTA: Instalacion = { estado: 'lista' };

describe('la transcripción: obligatoria (nmvy0cdw1tit)', () => {
  it('no trae casilla para desmarcarla: se ve su avance mientras baja', () => {
    const html = zonaTranscripcion(estado({ estado: 'instalando', pct: 40 }), false);
    expect(html).toContain('<progress max="100" value="40">');
    expect(html).toContain('40 %');
    expect(html).not.toContain('checkbox');
  });

  it('si falla, dice si fue internet o espacio, solo ofrece «Reintentar» y nunca seguir sin ella', () => {
    const internet = zonaTranscripcion(estado({ estado: 'fallo', causa: 'internet' }), false);
    expect(sinMarcas(internet)).toContain('internet');
    expect(internet).toContain('data-asistente-instalar="transcripcion"');
    expect(sinMarcas(internet)).toContain('Reintentar');
    expect(internet).not.toContain('data-asistente-sin-voz');
    const espacio = sinMarcas(zonaTranscripcion(estado({ estado: 'fallo', causa: 'espacio' }), false));
    expect(espacio).toContain('espacio');
    expect(espacio).toContain('3 GB');
    // Sin saber por qué, dice lo que salió y cómo correrla a mano
    const otra = sinMarcas(zonaTranscripcion(estado({ estado: 'fallo', causa: 'otra', detalle: 'ValueError <x>' }), false));
    expect(otra).toContain('ValueError');
    expect(otra).toContain('bash tools/entorno/instalar_transcripcion.sh');
  });

  it('al instalar, sin nada, ya está en marcha; al repasar, nada baja hasta que se pide', () => {
    expect(zonaTranscripcion(estado({ estado: 'sin_instalar' }), false)).not.toContain('data-asistente-instalar');
    expect(zonaTranscripcion(estado({ estado: 'sin_instalar' }), true)).toContain('data-asistente-instalar="transcripcion"');
  });
});

describe('la prueba del micrófono', () => {
  const V = estado(LISTA);

  it('espera a la transcripción; después da la frase escrita, con la grabadora y «No tengo micrófono ahora» (t_decide_frase_mic)', () => {
    expect(zonaPrueba({}, PRUEBA_NUEVA, estado({ estado: 'instalando', pct: 1 }))).not.toContain('data-asistente-grabadora');
    const html = zonaPrueba({}, PRUEBA_NUEVA, V);
    expect(html).toContain('data-asistente-frase');
    expect(html).toContain('data-asistente-grabadora');
    expect(html).toContain('data-asistente-prueba="sin_mic"');
    expect(sinMarcas(html)).toContain('No tengo micrófono ahora');
  });

  it('muestra lo que entendió y pregunta «¿Se entendió?», con «Sí» y «Grabar otra vez»; desde el segundo intento, «Sigo así»', () => {
    const una = zonaPrueba({}, { fase: 'entendio', intentos: 1, entendido: 'Hoy le dejo <b>' }, V);
    const texto = sinMarcas(una);
    expect(una).toContain('Hoy le dejo &lt;b&gt;');
    expect(texto).toContain('¿Se entendió?');
    expect(una).toContain('data-asistente-prueba="bien"');
    expect(una).toContain('data-asistente-prueba="otra"');
    expect(una).not.toContain('data-asistente-prueba="sigo"');
    const dos = zonaPrueba({}, { fase: 'entendio', intentos: 2, entendido: 'x' }, V);
    expect(dos).toContain('data-asistente-prueba="sigo"');
    expect(sinMarcas(dos)).toContain('Sigo así: la corrijo después');
  });

  it('sin micrófono o sin permiso, dice qué pasó y ofrece «Reintentar» y «No tengo micrófono ahora» (t_decide_sin_microfono)', () => {
    const html = zonaPrueba({}, { fase: 'fallo', intentos: 0, error: 'El navegador no dio permiso' }, V);
    expect(html).toContain('role="alert"');
    expect(sinMarcas(html)).toContain('El navegador no dio permiso');
    expect(sinMarcas(html)).toContain('Reintentar');
    expect(html).toContain('data-asistente-prueba="sin_mic"');
  });

  it('respondida, no se vuelve a preguntar, y queda a mano', () => {
    for (const prueba of ['bien', 'sigo', 'sin_mic'] as const) {
      const html = zonaPrueba({ prueba }, PRUEBA_NUEVA, V);
      expect(html).not.toContain('data-asistente-grabadora');
      expect(html).toContain('data-asistente-prueba="otra"');
    }
    expect(sinMarcas(zonaPrueba({ prueba: 'sin_mic' }, PRUEBA_NUEVA, V))).toContain('Repasar la instalación');
  });
});

describe('las voces: obligatorias (nmvzfmvr2tit, nmvzfsccjtit)', () => {
  it('sin casilla en ningún estado, y dice que quitarlas es desinstalar el Studio', () => {
    for (const voces of [LISTA, { estado: 'sin_instalar' }, { estado: 'instalando', pct: 10 }, { estado: 'fallo', causa: 'internet' }] as Instalacion[]) {
      for (const repaso of [false, true]) {
        const html = zonaVoces(estado(LISTA, voces), repaso);
        expect(html).not.toContain('checkbox');
        expect(html).not.toContain('data-asistente-sin-voz');
        expect(sinMarcas(html)).toContain('desinstalarlo');
      }
    }
    expect(sinMarcas(zonaVoces(null, false))).toContain('desinstalarlo');
  });

  it('si su descarga falla, dice qué pasó y ofrece solo «Reintentar»', () => {
    const falla = zonaVoces(estado(LISTA, { estado: 'fallo', causa: 'internet' }), false);
    expect(sinMarcas(falla)).toContain('internet');
    expect(falla).toContain('data-asistente-instalar="voces"');
    expect(falla.match(/<button/g)).toHaveLength(1);
    expect(sinMarcas(falla)).toContain('Reintentar');
    expect(sinMarcas(falla)).not.toContain('Seguir sin voz');
  });

  it('se bajan sin preguntar: al instalar no hay botón, y el asistente las lanza al terminar la transcripción', () => {
    expect(zonaVoces(estado(LISTA), false)).not.toContain('<button');
    expect(zonaVoces(estado(LISTA, { estado: 'instalando', pct: 10 }), false)).toContain('<progress max="100" value="10">');
    // Al repasar, nada baja hasta que se pide
    expect(zonaVoces(estado(LISTA), true)).toContain('data-asistente-instalar="voces"');
    const asistente = readFileSync(join(__dirname, 'asistente.ts'), 'utf-8').replace(/\r\n/g, '\n');
    expect(asistente).toContain('const falta = quePedirAlRecargar(voz, repaso);');
    expect(asistente).toContain('if (falta) await pedirInstalar(falta);');
    expect(asistente).not.toMatch(/data-asistente-voces|data-asistente-sin-voz|sinVoz/);
  });
});

describe('el avance de una descarga: real y siempre con señal de vida', () => {
  it('avanza en pasos pequeños por los bytes reales, sin bajar, y sin llegar a 100 antes de terminar', () => {
    let antes = 0;
    const vistos: number[] = [];
    for (const b of [19e6, 38e6, 57e6, 76e6, 60e6, 1.9e9, 9e9]) {
      antes = avanceReal(b, 1.9e9, 50, antes);
      vistos.push(antes);
    }
    expect(vistos).toEqual([1, 2, 3, 4, 4, 99, 99]);
    // Sin bytes medidos, vale lo que dijo el guion
    expect(avanceReal(null, 1.9e9, 50)).toBe(50);
  });

  it('la barra dice los MB bajados y que sigue trabajando, con su punto que late', () => {
    const html = zonaTranscripcion(estado({ estado: 'instalando', pct: 10, bytes: 190e6, esperados: 1.9e9, quietoSeg: 0 }), false);
    expect(html).toContain('asistente-latido');
    expect(sinMarcas(html)).toContain('Bajado: 190 MB de unos 1900 MB');
    expect(sinMarcas(html)).toContain('Sigue trabajando');
  });

  it('con el tiempo sin señal lo dice en segundos y en minutos, y nunca queda sin decir nada', () => {
    expect(sinMarcas(zonaVoces(estado(LISTA, { estado: 'instalando', pct: 5, quietoSeg: 42 }), false))).toContain('última señal hace 42 s');
    expect(sinMarcas(zonaVoces(estado(LISTA, { estado: 'instalando', pct: 5, quietoSeg: 600 }), false))).toContain('lleva 10 min sin señal nueva');
    ponerIdioma('en');
    expect(sinMarcas(zonaVoces(estado(LISTA, { estado: 'instalando', pct: 5, quietoSeg: 42 }), false))).toContain('last activity 42 s ago');
  });

  it('al recargar: si corre se reengancha sin pedir nada; si no corre y falta, se pide la que toca; al repasar, nada solo', () => {
    const sin: Instalacion = { estado: 'sin_instalar' };
    expect(quePedirAlRecargar(estado({ estado: 'instalando', pct: 30 }), false)).toBeNull();
    expect(quePedirAlRecargar(estado(LISTA, { estado: 'instalando', pct: 30 }), false)).toBeNull();
    expect(quePedirAlRecargar(estado(sin), false)).toBe('transcripcion');
    expect(quePedirAlRecargar(estado(LISTA, sin), false)).toBe('voces');
    expect(quePedirAlRecargar(estado(LISTA, LISTA), false)).toBeNull();
    expect(quePedirAlRecargar(estado(sin), true)).toBeNull();
    expect(quePedirAlRecargar(null, false)).toBeNull();
  });
});

describe('la pantalla entera', () => {
  it('cada zona, aparte, para pintarlas sin tocar la grabación', () => {
    const html = cuerpoVoz({}, null, PRUEBA_NUEVA, false);
    for (const z of ['data-voz-transcripcion', 'data-voz-prueba', 'data-voz-voces']) expect(html).toContain(z);
  });

  it('en inglés', () => {
    ponerIdioma('en');
    const pantallas = [
      cuerpoVoz({}, estado({ estado: 'fallo', causa: 'internet' }, { estado: 'fallo', causa: 'espacio' }), PRUEBA_NUEVA, false),
      cuerpoVoz({}, estado(LISTA, LISTA), { fase: 'entendio', intentos: 2, entendido: 'x' }, true),
      cuerpoVoz({ prueba: 'sin_mic' }, estado(LISTA, { estado: 'instalando', pct: 3 }), PRUEBA_NUEVA, false),
    ].map(sinMarcas).join(' ');
    expect(pantallas).toContain('Did it get it right?');
    expect(pantallas).not.toMatch(/\b(el|la|los|las|tu|para|con|Reintentar|Sí|Seguir)\b/);
  });
});
