// Los diálogos que se abren desde app.ts y los avisos al guardar, en el archivo de cada idioma (pd_idiomas).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { en } from './textos/en';
import { es } from './textos/es';
import { ponerIdioma, t } from './textos';

const leer = (archivo: string) => readFileSync(join(__dirname, archivo), 'utf-8').replace(/\r\n/g, '\n');
const sinComentarios = (x: string) => x.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*\*[\s\S]*?\*\//g, '');

describe('entregar un proyecto, en el archivo de textos', () => {
  it('el código no deja frases escritas a mano: nada con tildes ni el texto de sus diálogos', () => {
    const fuente = sinComentarios(leer('nuevo_proyecto.ts'));
    expect(fuente).not.toMatch(/[áéíóúñ¿«»]/);
    for (const frase of ['Entrégale', 'Proyectos existentes', 'Escanear', 'Cancelar', 'Elige', 'Volver', 'Buscando']) expect(fuente, frase).not.toContain(frase);
    // Lo único que sigue tal cual es la señal que viene del servidor, que no se muestra traducida
    expect(fuente).toContain("const SENAL_DE_ARCHIVOS = 'Archivos de IA';");
  });

  it('en español sigue igual, y en inglés con el nombre que elegiste, «Hand over»', () => {
    expect(t('nuevo.titulo')).toBe('Entrégale un proyecto al director');
    expect(t('nuevo.encontre', { n: 2, omitidas: '' })).toBe('Encontré 2 repositorios. Elige cuáles me entregas y corrige sus nombres si quieres. Los diagnostico en mis próximas revisiones.');
    expect(t('nuevo.elegidos', { n: 1 })).toBe('1 elegido');
    ponerIdioma('en');
    try {
      expect(t('nuevo.titulo')).toBe('Hand a project over to the director');
      expect(t('nuevo.encontre', { n: 1, omitidas: ` ${t('nuevo.omitidas', { n: 2 })}` })).toBe('I found 1 repository (and 2 folders without git or no longer there, which cannot be handed over). Choose which ones to hand over and fix their names if you like. I diagnose them in my next reviews.');
      expect(t('nuevo.quedoUnoNuevo', { nombre: 'X' })).toContain('the approach');
      expect(t('nuevo.quedoUno', { nombre: 'X' })).toContain('the diagnosis');
    } finally {
      ponerIdioma('es');
    }
  });

  it('en inglés, ninguna frase de estos diálogos o avisos queda en español', () => {
    const claves = Object.keys(en).filter((k) => /^(nuevo|permiso|medir|guardado)\./.test(k)) as (keyof typeof en)[];
    expect(claves.length).toBeGreaterThan(100);
    const delatan = /[áéíóúñ¿«»]|\b(el|la|los|las|del|una|que|con|para|tus?|director lo)\b/i;
    for (const k of claves) {
      const texto = en[k];
      for (const frase of typeof texto === 'string' ? [texto] : [texto.uno, texto.otros]) expect(frase, k).not.toMatch(delatan);
      // Las dos lenguas dicen las mismas variables
      const variables = (x: typeof texto) => [...JSON.stringify(x).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
      expect(variables(texto), k).toEqual(variables(es[k as keyof typeof es]));
    }
  });
});

describe('«Medir el núcleo» y los avisos al guardar, en el archivo de textos', () => {
  const app = leer('app.ts');

  it('la medición sigue siendo solo de la copia de desarrollo', () => {
    const api = leer('../servidor/api.ts');
    expect(api).toContain('medicion: (await leerLocal(raiz)).copiaDeDesarrollo ?');
    expect(api).toContain("if (!(await leerLocal(raiz)).copiaDeDesarrollo) return responder(res, 403");
    expect(leer('vistaMedicion.ts')).toContain("if (!m) return '';");
  });

  it('el diálogo se arma con sus textos, en los dos idiomas', () => {
    const parte = app.slice(app.indexOf("const cuanto = (x: { estimado: EstadoMedicion['estimado']"), app.indexOf('} else if (ds.abrirClaude !== undefined)'));
    expect(parte).toContain("titulo: tx('medir.titulo')");
    expect(parte).not.toMatch(/[áéíóúñ¿«»]/);
    expect(t('medir.queFalla', { titulo: 'X', cuanto: ' (unos 5 tokens)' })).toBe('«X», que falla (unos 5 tokens)');
    ponerIdioma('en');
    try {
      expect(t('medir.titulo')).toBe("Measure the director's core");
      expect(t('medir.ayudaElegir', { ninguno: t('medir.ninguno') })).toContain('Right now none is failing. Tokens are approximate');
    } finally {
      ponerIdioma('es');
    }
  });

  it('los avisos al guardar ya no están escritos a mano', () => {
    for (const frase of ['No se pudo guardar', 'Hecho: la skill', 'Hecho: el permiso', 'Hecho: desde su próximo lanzamiento', 'Permiso dado:', 'Permiso quitado:', 'Ultracode encendido', 'Ultracode apagado', 'Claude Code trabaja con', 'Claude Code vuelve', "'Guardado.'", 'Marca al menos', 'Desde ahora, lo que decide cada persona', 'La subida a GitHub'])
      expect(sinComentarios(app), frase).not.toContain(frase);
    expect(t('guardado.ajustesSin', { conserva: t('guardado.ajustesConserva', { n: 2 }) })).toBe('Hecho: desde su próximo lanzamiento, el director arranca sin tus ajustes de Claude Code (ni tus skills ni tus comandos) y conserva las 2 claves que marcaste.');
    expect(t('guardado.ultraApagado', { yDirector: '' })).toBe('Ultracode apagado para tus sesiones nuevas de Claude Code en este computador.');
  });
});
