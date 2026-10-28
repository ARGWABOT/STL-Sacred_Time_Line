import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { avisoDeEspera, ESPERA_MAX, ESPERA_MIN, resumenComentarios, segundosParaLeer } from './lectura';

const director = readFileSync(join(__dirname, 'director.ts'), 'utf-8');
const palabras = (n: number) => Array.from({ length: n }, (_, i) => `palabra${i}`).join(' ');

describe('el seguro de «Entendido» (nota de voz del titular, 22 de octubre de 2026)', () => {
  it('espera lo que tarda en leerse a 230 palabras por minuto, entre 5 y 15 segundos', () => {
    expect(segundosParaLeer('Una idea corta.')).toBe(ESPERA_MIN);
    expect(segundosParaLeer(palabras(23))).toBe(6);
    expect(segundosParaLeer(palabras(46))).toBe(12);
    expect(segundosParaLeer(palabras(400))).toBe(ESPERA_MAX);
    // Cuenta palabras, no símbolos de Markdown
    expect(segundosParaLeer('## - **·** > | |')).toBe(ESPERA_MIN);
    expect(segundosParaLeer(`- **${palabras(46)}**`)).toBe(12);
  });

  it('si se oprime antes, lo dice con humor y con lo que falta', () => {
    expect(avisoDeEspera(3.2)).toMatch(/^¡Ey, espera! ¿Seguro que ya la leíste\? .*4 segundos más/);
    expect(avisoDeEspera(0.4)).toContain('un segundo más');
  });

  it('solo la primera vez: lo ya marcado, o lo ya leído, va sin espera', () => {
    const espera = director.match(/function esperaDeIdea\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(espera).toContain('yaLeido(');
    expect(espera).toContain('segundosParaLeer(');
    const clic = director.slice(director.indexOf('} else if (ds.entendido !== undefined) {'), director.indexOf('} else if (ds.plegarLista'));
    expect(clic).toContain('avisoDeEspera(');
  });
});

describe('comentar no avanza: solo «Entendido» (nota de voz del titular, 24 de octubre de 2026)', () => {
  it('marcar una idea entendida sale solo de su botón, nunca de comentarla (con texto o con audio)', () => {
    const llamadas = [...director.matchAll(/\bmarcarTrozo\(/g)].map((m) => m.index!);
    const definicion = director.indexOf('async function marcarTrozo(');
    const clic = director.indexOf('} else if (ds.entendido !== undefined) {');
    // La definición y una sola llamada, la del botón «Entendido»
    expect(llamadas).toHaveLength(2);
    expect(llamadas).toContain(definicion + 'async function '.length);
    const otra = llamadas.find((i) => i !== definicion + 'async function '.length)!;
    expect(otra).toBeGreaterThan(clic);
    expect(otra).toBeLessThan(director.indexOf('} else if (ds.plegarLista'));
    // Y al comentar no se marca una parte leída: solo responder una decisión (no comentarla) la deja atendida
    const comentar = director.slice(director.indexOf('} else if (ds.comentar !== undefined) {'), director.indexOf('} else if (ds.aprobar !== undefined) {'));
    expect(comentar).not.toMatch(/marcarTrozo\(|marcarParte\(|parteAtendida\(/);
    expect(comentar).toContain("postura !== 'comenta') await decisionRespondida(");
  });
});

describe('una decisión trae sus dos respuestas desde el principio (nota de voz del titular nmvoko66ttit, 25 de octubre de 2026)', () => {
  it('«Decido otra cosa» va junto a «Apruebo lo que recomiendas» sin tener que comentar antes, y ya no hay «Comentar»', () => {
    const botones = director.match(/function botonesDecision\([\s\S]*?\n\}/)?.[0] ?? '';
    const sinResponder = botones.slice(botones.indexOf(': `<button type="button" class="boton-aprobar"'));
    expect(sinResponder).toContain('data-comentar="${base}|decide"');
    expect(sinResponder).not.toContain('${deEsta.length ? `<button');
    expect(sinResponder).not.toContain('|comenta"');
    expect(sinResponder).not.toContain('✉ Comentar');
    // Respondida, solo se le agrega algo, sin cambiarla
    expect(botones).toContain('data-comentar="${base}|comenta">✉ Agregar a esta decisión</button>');
  });
});

describe('«Entendido» al final, como un «Siguiente», y lo comentado plegado (nota de voz del titular nmvn0vsbmtit, 24 de octubre de 2026)', () => {
  it('el rótulo de lo comentado dice cuántos comentarios hay y si ya tienen respuesta', () => {
    expect(resumenComentarios(1, 0)).toBe('1 comentario sobre esta idea, sin respuesta aún');
    expect(resumenComentarios(1, 1)).toBe('1 comentario sobre esta idea, con su respuesta');
    expect(resumenComentarios(3, 3)).toBe('3 comentarios sobre esta idea, con sus respuestas');
    expect(resumenComentarios(3, 1)).toBe('3 comentarios sobre esta idea, 1 con respuesta');
  });

  it('en cada idea: primero lo comentado, plegado; luego «Comentar esta idea»; y al final «Entendido», a la derecha', () => {
    const trozo = director.slice(director.indexOf('const pintarTrozo = (i: number'), director.indexOf('const visibles = actual === undefined'));
    const normal = trozo.slice(trozo.indexOf('const hecho = entendida[i];'));
    const plegado = normal.indexOf('<details class="notas-idea"');
    const comentar = normal.indexOf('class="al-director comentar-idea"');
    const entendido = normal.indexOf('class="entendido');
    expect(plegado).toBeGreaterThan(0);
    expect(comentar).toBeGreaterThan(plegado);
    expect(entendido).toBeGreaterThan(comentar);
    // Plegado por defecto: el plegable no nace abierto
    expect(normal).toMatch(/<details class="notas-idea"\$\{plegable\(`notas-idea\|[^`]*`\)\}>/);
    // Ya no hay una lista de notas suelta debajo de los botones
    expect(normal.slice(entendido)).not.toContain('notas-lista');
    const css = readFileSync(join(__dirname, 'director.css'), 'utf-8');
    expect(css).toContain('.marcas-trozo > .entendido { margin-left: auto; }');
    expect(css).toMatch(/\.entendido:not\(\.hecho\) \{[^}]*background: var\(--acento\)/);
  });
});

describe('lo comentado sobre una idea de una parte ya leída se ve, con su respuesta (22 de octubre de 2026)', () => {
  it('al pie de la parte leída van también las notas de sus ideas; leyéndola de a una idea, debajo de cada idea', () => {
    const parte = director.slice(director.indexOf('const parte = (s: { titulo: string; md: string }) => {'), director.indexOf('const cuerpo = porIdeas ? porTrozos('));
    expect(parte).toContain('!x.sobre.decision && (!x.sobre.fragmento || !porIdeas)');
    // porIdeas se sabe antes de elegir las notas
    expect(parte.indexOf('const porIdeas =')).toBeLessThan(parte.indexOf('const deEsta ='));
  });
});
