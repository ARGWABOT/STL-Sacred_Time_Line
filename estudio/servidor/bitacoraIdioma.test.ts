// La bitácora de este computador sale en el idioma de la interfaz (pedido pd_bitacora_idioma): ninguna llamada a `anotar`
// de api.ts, revisor.ts y voz.ts lleva ya su texto en castellano, y las frases nuevas (`bitacora.*`) salen en los dos idiomas.
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { desdeDeAccion, EL_STUDIO, eventoDeAccion, leerBitacora, lineaDeNiveles, quienEnSuIdioma, textoDeBitacora, type TextoBitacora } from '../../src/director/bitacora.ts';
import { queAnotarDeLaLlamada, queAnotarDeLaRespuesta } from './permisoAlMomento.ts';
import { arregloEnLaBitacora } from './salud.ts';
import { lineaDeFallaDeVoz } from './voz.ts';
import { guardarIdioma } from '../../src/director/proyectos.ts';
import { idiomaActual, ponerIdioma, t } from '../src/textos.ts';
import { anotarEnSuIdioma, idiomaDeEsteComputador } from './bitacoraIdioma.ts';

const leer = (archivo: string) => readFileSync(new URL(`./${archivo}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

/** Dónde acaba el texto (comillas o plantilla, con sus `${…}`) que empieza en `i`. */
function finDeTexto(codigo: string, i: number): number {
  const comilla = codigo[i];
  let j = i + 1;
  while (j < codigo.length && codigo[j] !== comilla) {
    if (codigo[j] === '\\') { j += 2; continue; }
    if (comilla === '`' && codigo[j] === '$' && codigo[j + 1] === '{') {
      let profundo = 1;
      j += 2;
      while (j < codigo.length && profundo > 0) {
        if (`'"\``.includes(codigo[j])) { j = finDeTexto(codigo, j); continue; }
        if (codigo[j] === '{') profundo++;
        else if (codigo[j] === '}') profundo--;
        j++;
      }
      continue;
    }
    j++;
  }
  return j + 1;
}

/** Los textos literales de un trozo de código, también los de dentro de `${…}`. */
function literales(codigo: string): string[] {
  const salida: string[] = [];
  let i = 0;
  while (i < codigo.length) {
    const c = codigo[i];
    if (c !== "'" && c !== '"' && c !== '`') { i++; continue; }
    const fin = finDeTexto(codigo, i);
    const cuerpo = codigo.slice(i + 1, fin - 1);
    if (c !== '`') { salida.push(cuerpo); i = fin; continue; }
    let texto = '';
    let j = 0;
    while (j < cuerpo.length) {
      if (cuerpo[j] === '$' && cuerpo[j + 1] === '{') {
        let profundo = 1;
        let k = j + 2;
        while (k < cuerpo.length && profundo > 0) {
          if (`'"\``.includes(cuerpo[k])) { k = finDeTexto(cuerpo, k); continue; }
          if (cuerpo[k] === '{') profundo++;
          else if (cuerpo[k] === '}') profundo--;
          k++;
        }
        salida.push(...literales(cuerpo.slice(j + 2, k - 1)));
        j = k;
      } else texto += cuerpo[j++];
    }
    salida.push(texto);
    i = fin;
  }
  return salida;
}

/** Cada llamada a `anotar(` o a `anotarEnSuIdioma(` de un archivo, con sus paréntesis. */
function llamadas(fuente: string): string[] {
  const salida: string[] = [];
  const inicio = /\banotar(?:EnSuIdioma)?\(/g;
  let m: RegExpExecArray | null;
  while ((m = inicio.exec(fuente))) {
    let i = m.index + m[0].length;
    let profundo = 1;
    while (i < fuente.length && profundo > 0) {
      if (`'"\``.includes(fuente[i])) { i = finDeTexto(fuente, i); continue; }
      if (fuente[i] === '(') profundo++;
      else if (fuente[i] === ')') profundo--;
      i++;
    }
    salida.push(fuente.slice(m.index, i));
  }
  return salida;
}

const CON_TILDE = /[áéíóúñ¿¡]/i;
const PALABRAS = /\b(el|la|los|las|de|del|en|que|no|le|su|sus|un|una|y|con|por|para|al|se|lo|nota|director)\b/gi;
/** Lo que no es texto para la persona: marcas internas, como `quien: 'el director'`. */
const PERMITIDOS = new Set(['el director', 'alguien']);
/** En castellano: con tilde, o con dos palabras de las de siempre («la pantalla de emergencia»); una sola es una marca como 'que' o 'en'. */
const enCastellano = (texto: string) => !PERMITIDOS.has(texto) && (CON_TILDE.test(texto) || (texto.match(PALABRAS)?.length ?? 0) >= 2);

describe('la bitácora, en el idioma de la interfaz (pd_bitacora_idioma)', () => {
  afterEach(() => ponerIdioma('es'));

  for (const archivo of ['api.ts', 'revisor.ts', 'voz.ts']) {
    it(`ninguna llamada a anotar de ${archivo} lleva un texto en castellano`, () => {
      const todas = llamadas(leer(archivo));
      expect(todas.length).toBeGreaterThan(0);
      const sueltas = todas.flatMap((llamada) => literales(llamada).filter(enCastellano).map((x) => `${x}  ←  ${llamada.slice(0, 90)}`));
      expect(sueltas).toEqual([]);
    });
  }

  it('ningún objeto de línea de api.ts ({ quien, que, desde }) lleva un texto en castellano, aunque no esté dentro de anotar', () => {
    // cambioDeCuenta armaba su línea fuera de la llamada y se escapaba del barrido de arriba (nota nmwp6vl8gtit)
    const fuente = leer('api.ts');
    const objetos: string[] = [];
    const inicio = /\{ quien: /g;
    let m: RegExpExecArray | null;
    while ((m = inicio.exec(fuente))) {
      let i = m.index + 1;
      let profundo = 1;
      while (i < fuente.length && profundo > 0) {
        if (`'"\``.includes(fuente[i])) { i = finDeTexto(fuente, i); continue; }
        if (fuente[i] === '{') profundo++;
        else if (fuente[i] === '}') profundo--;
        i++;
      }
      objetos.push(fuente.slice(m.index, i));
    }
    expect(objetos.length).toBeGreaterThan(10);
    expect(objetos.flatMap((o) => literales(o).filter(enCastellano).map((x) => `${x}  ←  ${o.slice(0, 90)}`))).toEqual([]);
  });

  it('el detector ve un texto en castellano en una llamada', () => {
    const mala = "await anotar(raiz, { quien: EL_STUDIO, que: `no pudo abrir la terminal ${x}`, desde: 'la pantalla de emergencia' });";
    expect(llamadas(mala).flatMap((l) => literales(l).filter(enCastellano))).toHaveLength(2);
    const buena = "await anotar(raiz, { quien: EL_STUDIO, que: t('bitacora.noLanza', { problema: `${y}` }), desde: t('bitacora.desde.lanzador') });";
    expect(llamadas(buena).flatMap((l) => literales(l).filter(enCastellano))).toEqual([]);
  });

  it('una frase de la bitácora sale en inglés con ponerIdioma("en") y en castellano con ponerIdioma("es")', () => {
    ponerIdioma('en');
    expect(t('bitacora.noLanza', { problema: 'x' })).toBe('does not launch the director: x');
    expect(t('bitacora.desde.lanzador')).toBe('the director launcher');
    ponerIdioma('es');
    expect(t('bitacora.noLanza', { problema: 'x' })).toBe('no lanza al director: x');
    expect(t('bitacora.desde.lanzador')).toBe('el lanzador del director');
  });

  it('sin idioma elegido nunca, el de la bitácora es el inglés; con uno elegido, ese', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'estudio-bitacora-idioma-'));
    try {
      ponerIdioma('es');
      await idiomaDeEsteComputador(raiz);
      expect(idiomaActual()).toBe('en');
      await guardarIdioma(raiz, 'es');
      ponerIdioma('en');
      await idiomaDeEsteComputador(raiz);
      expect(idiomaActual()).toBe('es');
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });

  it('anotarEnSuIdioma arma la línea después de poner el idioma guardado', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'estudio-bitacora-idioma-'));
    try {
      await guardarIdioma(raiz, 'en');
      ponerIdioma('es');
      await anotarEnSuIdioma(raiz, () => eventoDeAccion({ tipo: 'paso', mision: 't_x' }, 'Ana', t('bitacora.accion.marcaPasos', { hechos: 1, n: 1, titulo: 'X' }), 'stl'));
      const [e] = await leerBitacora(raiz);
      expect(e.que).toBe('marks 1 of 1 step of «X»');
      expect(e.desde).toBe('mission t_x › its steps');
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });

  it('un paso marcado y una misión entregada, en los dos idiomas, con el singular y el plural bien', () => {
    ponerIdioma('en');
    expect(t('bitacora.accion.marcaPasos', { hechos: 1, n: 1, titulo: 'X' })).toBe('marks 1 of 1 step of «X»');
    expect(t('bitacora.accion.marcaPasos', { hechos: 2, n: 3, titulo: 'X' })).toBe('marks 2 of 3 steps of «X»');
    expect(t('bitacora.accion.entrega', { titulo: 'X' })).toBe('delivers the mission «X»');
    ponerIdioma('es');
    expect(t('bitacora.accion.marcaPasos', { hechos: 1, n: 1, titulo: 'X' })).toBe('marca 1 de 1 paso de «X»');
    expect(t('bitacora.accion.marcaPasos', { hechos: 2, n: 3, titulo: 'X' })).toBe('marca 2 de 3 pasos de «X»');
    expect(t('bitacora.accion.entrega', { titulo: 'X' })).toBe('entrega la misión «X»');
  });

  it('cada función que arma una línea de la bitácora, corrida en inglés, no deja nada en castellano (nmwp6vl8gtit)', () => {
    // Si una frase vuelve a escribirse en castellano en el código, sale aquí: el barrido corre cada armador en los dos
    // idiomas, y en castellano el mismo detector sí las ve (así se sabe que en inglés no mira de más)
    const dicha = (x: string | TextoBitacora) => (typeof x === 'string' ? x : textoDeBitacora(x));
    const lineas = () => [
      lineaDeNiveles({ piso: 0.009, pico: 0.35, conSonido: 122, muestras: 182, segundos: 60, destino: 'guardar', silenciada: false }) ?? '',
      lineaDeNiveles({ piso: 0, pico: 0, conSonido: 0, muestras: 1, segundos: 1, destino: 'descartar_todo', silenciada: true }) ?? '',
      ...(['revision', 'candado', 'pasos'] as const).map((tipo) => arregloEnLaBitacora({ cuando: '2026-11-20T00:00:00Z', tipo: tipo as never, dato: 'x' })),
      queAnotarDeLaRespuesta({ permitir: false, motivo: 'no_autorizado' } as never, 'x'),
      queAnotarDeLaRespuesta({ permitir: true, guardar: null, todo: 'elegido' } as never, 'x'),
      queAnotarDeLaRespuesta({ permitir: true, guardar: { regla: 'Bash(curl:*)', proyecto: 'p', alcance: 'proyecto' } } as never, 'x'),
      queAnotarDeLaRespuesta({ permitir: true, guardar: null } as never, 'x'),
      ...Object.values(queAnotarDeLaLlamada('Bash', true, { permitir: true, guardar: null, todo: 'automatico' } as never)),
      ...Object.values(queAnotarDeLaLlamada('Bash', true, { permitir: true, guardar: null, cadena: true } as never)),
      ...Object.values(queAnotarDeLaLlamada('Bash', false, null)),
      lineaDeFallaDeVoz({ donde: t('bitacora.desde.leerEnVozAlta'), motivo: 'x', ms: 1200, letras: 30, esperaban: 2 }),
      desdeDeAccion({ tipo: 'comentar', sobre: { tipo: 'mision', id: 't_x', seccion: 'Paso 2', eleccion: 'A' }, audio: 'a.webm', adjuntos: [1] }),
      desdeDeAccion({ tipo: 'comentar', sobre: { tipo: 'documento', id: 'docs/x.md', seccion: 'S', decision: 'D', postura: 'aprueba' } }),
      desdeDeAccion({ tipo: 'comentar', sobre: { tipo: 'general' }, urgente: true }),
      ...['empezar', 'paso', 'leido', 'marcar', 'cerrar', 'excepcion', 'responder', 'borrar_nota', 'corregir_transcripcion', 'anotar', 'proyecto', 'objetivo', 'integrante', 'sincronizar', 'otra'].map((tipo) => desdeDeAccion({ tipo, mision: 't_x', doc: 'd', criterio: 'c', fase: 'f', frente: 'fr', propuesta: 'p', id: 'n', audio: 'a' })),
      ...Object.values(eventoDeAccion({ tipo: 'paso', mision: 't_x', automatico: 'ultimo_paso' }, 'Ana', 'x', 'stl')),
      ...[EL_STUDIO, 'el director', 'alguien', 'alguien en este computador'].map(quienEnSuIdioma),
    ].map(dicha);
    // Más estricto que el de arriba: en inglés, una sola tilde o dos palabras de las de siempre ya son castellano
    const castellano = (x: string) => CON_TILDE.test(x) || (x.match(/\b(el|la|los|las|de|del|que|le|su|sus|un|una|y|con|por|para|al|se|lo|en)\b/gi)?.length ?? 0) >= 2;
    ponerIdioma('en');
    expect(lineas().filter(castellano)).toEqual([]);
    ponerIdioma('es');
    const enEs = lineas();
    expect(enEs.filter(castellano).length).toBeGreaterThan(enEs.length / 2);
  });

  it('la página traduce quién firma sin importar el módulo de la bitácora, que usa el disco (rompía la carga de la página)', () => {
    const pagina = readFileSync(new URL('../src/bitacoraDelComputador.ts', import.meta.url), 'utf8');
    expect(pagina).not.toMatch(/^import \{[^}]*\} from '..\/..\/src\/director\/bitacora';/m);
    expect(readFileSync(new URL('../../src/director/quienDeBitacora.ts', import.meta.url), 'utf8')).not.toMatch(/from 'node:/);
  });

  it('las que cuentan usan sus dos formas', () => {
    ponerIdioma('en');
    expect(t('bitacora.notasDeVoz', { n: 1 })).toBe('a voice note');
    expect(t('bitacora.notasDeVoz', { n: 3 })).toBe('3 voice notes');
    ponerIdioma('es');
    expect(t('bitacora.notasDeVoz', { n: 1 })).toBe('una nota de voz');
    expect(t('bitacora.notasDeVoz', { n: 3 })).toBe('3 notas de voz');
  });
});
