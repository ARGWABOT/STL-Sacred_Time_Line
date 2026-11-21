// La bitácora de este computador guarda TIPOS FIJOS (la clave de su frase y sus datos), no texto terminado, y los dice al leerlos
// en el idioma de este computador (nota nmwp99p6otit del titular: «define tipos fijos de información de log, con texto ya
// escrito y espacios en blanco para los datos variables, para que siempre salgan en el idioma correcto»).
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { anotar, conFrasesEnSuIdioma, EL_STUDIO, eventoDeAccion, leerBitacora, lineaDeNiveles, tb } from '../../src/director/bitacora.ts';
import { guardarIdioma } from '../../src/director/proyectos.ts';
import { ponerIdioma } from '../src/textos.ts';
import { en } from '../src/textos/en.ts';
import { es } from '../src/textos/es.ts';
import { idiomaDeEsteComputador } from './bitacoraIdioma.ts';

const RAIZ = join(import.meta.dirname, '..', '..');

/** Los .ts de producción (sin pruebas) de las carpetas donde algo escribe en la bitácora. */
function fuentes(): string[] {
  const salida: string[] = [];
  const recorrer = (carpeta: string) => {
    for (const nombre of readdirSync(carpeta)) {
      const ruta = join(carpeta, nombre);
      if (statSync(ruta).isDirectory()) {
        if (nombre !== 'node_modules' && nombre !== 'textos') recorrer(ruta);
      } else if (nombre.endsWith('.ts') && !nombre.endsWith('.test.ts')) salida.push(ruta);
    }
  };
  for (const c of ['estudio/servidor', 'src/director', 'tools']) recorrer(join(RAIZ, c));
  return salida;
}

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

/** Hasta dónde llega lo que abre en `i` (un paréntesis o una llave): su cierre, sin contar textos. */
function cierreDe(codigo: string, i: number): number {
  const abre = codigo[i], cierra = abre === '(' ? ')' : abre === '{' ? '}' : ']';
  let profundo = 1;
  let j = i + 1;
  while (j < codigo.length && profundo > 0) {
    if (`'"\``.includes(codigo[j])) { j = finDeTexto(codigo, j); continue; }
    if (codigo[j] === abre) profundo++;
    else if (codigo[j] === cierra) profundo--;
    j++;
  }
  return j;
}

/** El valor de `que:` o de `desde:` que empieza en `i`: hasta la coma (o el cierre del objeto) de su mismo nivel. */
function valorDesde(codigo: string, i: number): string {
  let j = i;
  while (j < codigo.length) {
    const c = codigo[j];
    if (`'"\``.includes(c)) { j = finDeTexto(codigo, j); continue; }
    if (c === '(' || c === '{' || c === '[') { j = cierreDe(codigo, j); continue; }
    if (c === ',' || c === '}' || c === ')' || c === ']') break;
    j++;
  }
  return codigo.slice(i, j);
}

/** Lo que queda de un valor sin sus `tb(…)`, `lineaDeNiveles(…)` y demás tipos fijos: ahí no puede haber texto ni `t(…)`. */
function sinTiposFijos(valor: string): string {
  let salida = '';
  let i = 0;
  const inicio = /\b(?:tb|pegadas|juntas|origenDeRevision|lineaDeNiveles|lineaDeFallaDeVoz|arregloEnLaBitacora|desdeDeAccion|pasoEnLinea)\(/g;
  while (i < valor.length) {
    inicio.lastIndex = i;
    const m = inicio.exec(valor);
    if (!m) { salida += valor.slice(i); break; }
    salida += valor.slice(i, m.index);
    i = cierreDe(valor, m.index + m[0].length - 1);
  }
  return salida;
}

/** Cada `que:` y cada `desde:` de un objeto de línea de bitácora ({ quien, que, desde }) de un archivo, con su valor. */
function camposDeLinea(fuente: string): { campo: string; valor: string }[] {
  const salida: { campo: string; valor: string }[] = [];
  const inicio = /\{\s*(?:quien\b|que:)/g;
  let m: RegExpExecArray | null;
  while ((m = inicio.exec(fuente))) {
    const objeto = fuente.slice(m.index, cierreDe(fuente, m.index));
    const propio: { campo: string; valor: string }[] = [];
    const campos = /(?:^|[\s,{])(que|desde):\s*/g;
    let c: RegExpExecArray | null;
    while ((c = campos.exec(objeto))) {
      // solo los del primer nivel del objeto: lo de dentro de un tb(…) o de otro objeto es dato
      const antes = objeto.slice(0, c.index + 1);
      let profundo = 0;
      for (let k = 0; k < antes.length; k++) {
        if (`'"\``.includes(antes[k])) { k = finDeTexto(antes, k) - 1; continue; }
        if ('({['.includes(antes[k])) profundo++;
        else if (')}]'.includes(antes[k])) profundo--;
      }
      if (profundo === 1) propio.push({ campo: c[1], valor: valorDesde(objeto, c.index + c[0].length).trim() });
    }
    // Un objeto que empieza con `que:` es de bitácora solo si también dice su `desde:`
    if (/^\{\s*quien\b/.test(objeto) || propio.some((p) => p.campo === 'desde')) salida.push(...propio);
  }
  return salida;
}

/** Cada llamada a `anotar(` o a `anotarEnSuIdioma(` de un archivo, con sus paréntesis (menos la definición). */
function llamadas(fuente: string): string[] {
  const salida: string[] = [];
  const inicio = /(?<![.\w])anotar(?:EnSuIdioma)?\(/g;
  let m: RegExpExecArray | null;
  while ((m = inicio.exec(fuente))) {
    if (/function\s+$/.test(fuente.slice(Math.max(0, m.index - 12), m.index))) continue;
    salida.push(fuente.slice(m.index, cierreDe(fuente, m.index + m[0].length - 1)));
  }
  return salida;
}

/** Los problemas de una fuente: un `que:`/`desde:` que no es un tipo fijo. */
function problemasDe(fuente: string): string[] {
  const problemas: string[] = [];
  for (const { campo, valor } of camposDeLinea(fuente)) {
    // Lo que se compara en una condición (`r.fase === 'al_dia' ? tb(…) : …`, `'encargos' in x`) no es texto de la línea
    const resto = sinTiposFijos(valor).replace(/(?:===|!==|==|!=)\s*(['"`])[^'"`]*\1/g, '').replace(/(['"`])[^'"`]*\1\s*(?:===|!==|==|!=|in\b)/g, '');
    if (/['"`]/.test(resto)) problemas.push(`${campo}: ${valor.slice(0, 100)}  (texto suelto: debe ser tb('clave', { datos }))`);
    else if (/(?<![.\w])t\(/.test(resto)) problemas.push(`${campo}: ${valor.slice(0, 100)}  (t(…) directo: debe ser tb('clave', { datos }))`);
  }
  return problemas;
}

describe('la bitácora guarda tipos fijos, nunca texto suelto', () => {
  const todas = fuentes().map((ruta) => ({ ruta: relative(RAIZ, ruta).replace(/\\/g, '/'), fuente: readFileSync(ruta, 'utf8').replace(/\r\n/g, '\n') }));
  const queEscriben = todas.filter((f) => /(?<![.\w])anotar(?:EnSuIdioma)?\(\s*(?:raiz|this\.raiz)\b/.test(f.fuente) || /\{\s*(?:quien\b[^}]*)?\bque:/.test(f.fuente));

  it('los archivos que escriben en la bitácora se encuentran (api, revisor, voz y los que arman líneas)', () => {
    const nombres = queEscriben.map((f) => f.ruta);
    for (const f of ['estudio/servidor/api.ts', 'estudio/servidor/revisor.ts', 'estudio/servidor/voz.ts', 'estudio/servidor/permisoAlMomento.ts']) expect(nombres).toContain(f);
  });

  it('ninguna llamada a anotar o anotarEnSuIdioma pasa `que:` ni `desde:` como texto, plantilla o t(…) directo', () => {
    const llamadasTotales = queEscriben.flatMap((f) => llamadas(f.fuente));
    expect(llamadasTotales.length).toBeGreaterThan(80);
    expect(queEscriben.flatMap((f) => problemasDe(f.fuente).map((p) => `${f.ruta}: ${p}`))).toEqual([]);
  });

  it('en esos archivos no queda un t(\'bitacora.…\') suelto: la línea se arma con tb(…)', () => {
    const sueltos = queEscriben.flatMap((f) => [...f.fuente.matchAll(/(?<![.\w])t\(\s*[`'"](?:reparar\.)?bitacora\./g)].map((m) => `${f.ruta}: ${f.fuente.slice(m.index, m.index + 60)}`));
    expect(sueltos).toEqual([]);
  });

  it('el detector ve un texto suelto, una plantilla y un t(…) directo, y deja pasar los tipos fijos', () => {
    expect(problemasDe("await anotar(raiz, { quien: EL_STUDIO, que: 'lanza al director', desde: tb('bitacora.desde.lanzador') });")).toHaveLength(1);
    expect(problemasDe('await anotar(raiz, { quien: EL_STUDIO, que: `no pudo ${x}`, desde: tb(\'bitacora.desde.lanzador\') });')).toHaveLength(1);
    expect(problemasDe("await anotar(raiz, { quien: EL_STUDIO, que: tb('bitacora.noLanza', { problema: `${y}` }), desde: t('bitacora.desde.lanzador') });")).toHaveLength(1);
    expect(problemasDe("await anotar(raiz, { quien: 'el director', que: ok ? tb('bitacora.a') : tb('bitacora.b', { x: 'dato' }), desde: tb('bitacora.desde.lanzador'), proyecto: id });")).toEqual([]);
    expect(problemasDe("anotar(raiz, { quien, que: ok ? 'a' : tb('bitacora.b'), desde })")).toHaveLength(1);
  });

  it('cada clave que se usa con tb(…) existe en inglés y en castellano', () => {
    const usadas = new Set<string>();
    const dinamicas = new Set<string>();
    for (const f of [...queEscriben, ...todas.filter((x) => x.ruta === 'src/director/bitacora.ts')]) {
      for (const m of f.fuente.matchAll(/(?<![.\w])tb\(\s*(['`])([^'`]+)\1/g)) { if (m[2].includes('${')) dinamicas.add(m[2]); else if (/^[\w.]+$/.test(m[2])) usadas.add(m[2]); }
      for (const m of f.fuente.matchAll(/(?<![.\w])tb\(\s*[^'`\s)][^,)]*\?\s*(['`])([^'`]+)\1\s*:\s*(['`])([^'`]+)\3/g)) { usadas.add(m[2]); usadas.add(m[4]); }
    }
    expect(usadas.size).toBeGreaterThan(100);
    const sinEn = [...usadas].filter((k) => !Object.hasOwn(en, k));
    const sinEs = [...usadas].filter((k) => !Object.hasOwn(es, k));
    expect(sinEn, 'faltan en en.ts').toEqual([]);
    expect(sinEs, 'faltan en es.ts').toEqual([]);
    // Las claves que se arman con `${…}` (bitacora.niveles.<destino>…): su prefijo tiene que tener frases en los dos idiomas
    for (const d of dinamicas) {
      const prefijo = d.slice(0, d.indexOf('${'));
      expect(Object.keys(en).some((k) => k.startsWith(prefijo)), `en.ts: ${d}`).toBe(true);
      expect(Object.keys(es).some((k) => k.startsWith(prefijo)), `es.ts: ${d}`).toBe(true);
    }
  });
});

describe('la frase se dice al leerla, en el idioma de este computador', () => {
  afterEach(() => ponerIdioma('es'));
  const crear = () => mkdtempSync(join(tmpdir(), 'estudio-bitacora-fija-'));

  it('una línea escrita con el servidor en castellano sale en inglés si este computador está en inglés, y en castellano si está en castellano', async () => {
    const raiz = crear();
    try {
      ponerIdioma('es');
      await anotar(raiz, { quien: EL_STUDIO, que: tb('bitacora.noLanza', { problema: 'x' }), desde: tb('bitacora.desde.lanzadorRegistro', { registro: 'r.log' }), proyecto: 'stl' });
      const [guardada] = await leerBitacora(raiz);
      // Lo que quedó en el archivo: la clave y los datos, y el inglés de respaldo
      expect(guardada).toMatchObject({ clave: 'bitacora.noLanza', datos: { problema: 'x' }, desdeClave: 'bitacora.desde.lanzadorRegistro', desdeDatos: { registro: 'r.log' } });
      expect(guardada.que).toBe('does not launch the director: x');

      await guardarIdioma(raiz, 'en');
      ponerIdioma('es');
      await idiomaDeEsteComputador(raiz);
      expect(conFrasesEnSuIdioma(guardada)).toMatchObject({ que: 'does not launch the director: x', desde: 'the director launcher (log r.log)' });

      await guardarIdioma(raiz, 'es');
      ponerIdioma('en');
      await idiomaDeEsteComputador(raiz);
      expect(conFrasesEnSuIdioma(guardada)).toMatchObject({ que: 'no lanza al director: x', desde: 'el lanzador del director (registro r.log)' });
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });

  it('lo anidado (un resultado, un destino, un número que cuenta) también se dice al leer, y las líneas de texto suelto de la historia quedan como están', async () => {
    const raiz = crear();
    try {
      await anotar(raiz, { quien: 'Ana', que: 'una línea de la historia', desde: 'un botón de antes' });
      await anotar(raiz, { quien: 'el director', ...{ que: tb('bitacora.permiso.llamada', { herramienta: 'Bash', resultado: tb('bitacora.permiso.seLeDa'), porque: '' }), desde: tb('bitacora.desde.gancho') } });
      await anotar(raiz, { quien: 'Ana', que: tb('bitacora.accion.marcaPasos', { hechos: 1, n: 1, titulo: 'X' }), desde: tb('bitacora.accion.desde.nota') });
      const [marca, permiso, historia] = await leerBitacora(raiz);
      ponerIdioma('en');
      expect(conFrasesEnSuIdioma(marca).que).toBe('marks 1 of 1 step of «X»');
      expect(conFrasesEnSuIdioma(permiso).que).toContain('Bash');
      expect(conFrasesEnSuIdioma(permiso).que).not.toMatch(/[áéíóúñ]/);
      expect(conFrasesEnSuIdioma(historia)).toMatchObject({ que: 'una línea de la historia', desde: 'un botón de antes' });
      ponerIdioma('es');
      expect(conFrasesEnSuIdioma(marca).que).toBe('marca 1 de 1 paso de «X»');
      expect(conFrasesEnSuIdioma(permiso).que).toContain('se le da');
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });

  it('una clave que ya no existe deja el texto de respaldo, sin tumbar la lectura', () => {
    const e = { cuando: 'x', quien: 'Ana', que: 'texto de respaldo', desde: 'otro', clave: 'bitacora.ya.no.existe' };
    expect(conFrasesEnSuIdioma(e).que).toBe('texto de respaldo');
  });

  it('las dos líneas de la captura salen en inglés con la interfaz en inglés: la de la grabadora y la de la sesión de gh', async () => {
    const raiz = crear();
    try {
      // El servidor, en castellano al escribirlas (como estaba cuando salieron mal)
      ponerIdioma('es');
      await anotar(raiz, { quien: EL_STUDIO, que: lineaDeNiveles({ piso: 0.0009, pico: 0.3, conSonido: 120, muestras: 180, segundos: 16, destino: 'guardar', silenciada: false })!, desde: tb('bitacora.desde.grabadora') });
      await anotar(raiz, { quien: EL_STUDIO, que: tb('bitacora.dejaActivaGh', { nombre: 'ARGWABOT' }), desde: tb('bitacora.desde.alCambiarProyecto'), proyecto: 'stl' });
      await guardarIdioma(raiz, 'en');
      await idiomaDeEsteComputador(raiz);
      const [gh, grabadora] = (await leerBitacora(raiz)).map(conFrasesEnSuIdioma);
      expect(grabadora.que).toMatch(/^the recorder heard a 16\.0 s segment: floor 0\.00090, peak 0\.30000, 120 of 180 samples with sound, track muted: no, and it ends as: /);
      expect(grabadora.desde).toBe('the recorder, when a segment ends');
      expect(gh.que).toBe('makes the gh session ARGWABOT, the approved account of this project, the active one for this whole computer');
      expect(gh.desde).toBe('when switching to this project');
      for (const x of [grabadora.que, grabadora.desde, gh.que, gh.desde]) expect(x).not.toMatch(/[áéíóúñ]|\b(la|el|de|sesión|cuenta)\b/);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });

  it('eventoDeAccion también guarda tipos fijos: su «desde» y lo que hace la página sola salen en el idioma de la lectura', async () => {
    const raiz = crear();
    try {
      ponerIdioma('es');
      await anotar(raiz, eventoDeAccion({ tipo: 'entregar', mision: 't_x', automatico: 'ultimo_paso' }, 'Ana', tb('bitacora.accion.entrega', { titulo: 'X' }), 'stl'));
      const [e] = await leerBitacora(raiz);
      ponerIdioma('en');
      expect(conFrasesEnSuIdioma(e)).toMatchObject({
        quien: EL_STUDIO, que: 'delivers the mission «X», on behalf of Ana', desde: 'mission t_x (when the last step was marked, the mission was delivered on its own)',
      });
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });

  it('la ruta GET /bitacora dice cada línea desde su clave, en el idioma de este computador, y deja el del servidor como estaba', () => {
    const api = readFileSync(join(RAIZ, 'estudio/servidor/api.ts'), 'utf8').replace(/\r\n/g, '\n');
    const ruta = api.slice(api.indexOf("ruta === '/bitacora' && req.method === 'GET'"));
    const cuerpo = ruta.slice(0, ruta.indexOf("ruta === '/niveles-grabadora'"));
    expect(cuerpo).toContain('await idiomaDeEsteComputador(raiz)');
    expect(cuerpo).toContain('eventos.map(conFrasesEnSuIdioma)');
    expect(cuerpo).toContain('ponerIdioma(antes)');
  });
});
