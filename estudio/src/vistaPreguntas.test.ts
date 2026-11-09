// La vista «Preguntas», en su módulo (propuesta aceptada pr_partir_modulos): recibe lo que pinta y la página le da lo que
// depende de ella, así que se prueba con datos hechos a mano, sin la página.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Nota, Respuesta } from '../../src/director/director';
import { momento } from './formato';
import { vistaPreguntas, type DatosPreguntas } from './vistaPreguntas';

const pregunta = (id: string, x: Partial<Nota> = {}) => ({ id, cuando: '2026-10-20T10:00:00Z', quien: 'Ana', de: 'ana', sobre: { tipo: 'pregunta' }, texto: `La ${id}`, ...x }) as Nota;
// Una pregunta que espera (n1) y una conversación: n2 con su respuesta, y n3, que sigue sobre ella y espera la suya
const n1 = pregunta('n1', { texto: '¿Qué <sigue>?' });
const n2 = pregunta('n2', { cuando: '2026-10-18T10:00:00Z', texto: 'Primera pregunta' });
const n3 = pregunta('n3', { cuando: '2026-10-19T10:00:00Z', quien: 'Beto', de: 'beto', sobre: { tipo: 'pregunta', id: 'n2' }, texto: 'Y esto otro' });
const respuestas = {
  n2: { cuando: '2026-10-18T12:00:00Z', texto: 'Así **es**', tratamiento: 'decision', destino: { vista: 'ruta' } },
} as unknown as Record<string, Respuesta>;
const datos = (x: Partial<DatosPreguntas> = {}): DatosPreguntas => ({
  notas: [n1, n2, n3], respuestas, transcripciones: { 'a.webm': 'Lo que dije en el audio' },
  yo: 'ana', esTitular: false, hilosAbiertos: new Set(),
  filtroVisible: () => '<p class="filtro-equipo"></p>',
  audioYTexto: (audio) => (audio ? `<div class="nota-voz" data-audio="${audio}"></div>` : ''),
  adjuntosDeNota: (n) => (n.adjuntos?.length ? '<ul class="lista-adjuntos"></ul>' : ''),
  botonEscribirLoDicho: () => '',
  corregible: (n) => !!n.texto,
  quedoEn: (r, aqui) => (r.destino ? `<p class="quedo-en" data-aqui="${aqui.vista}|${aqui.ancla}"></p>` : ''),
  respuestaHtml: (texto) => `<p>${texto}</p>`,
  ...x,
});

describe('«Preguntas», aparte de app.ts (pr_partir_modulos)', () => {
  it('una pregunta que espera, arriba y con sus botones; la conversación, plegada, con su respuesta y lo que sigue', () => {
    const html = vistaPreguntas(datos());
    expect(html).toContain('<button type="button" class="primario" data-preguntas>');
    expect(html).toContain('<p class="filtro-equipo"></p><h3>Esperando respuesta <small>· 1</small></h3>');
    expect(html).toContain('<ol class="preguntas-espera"><li><p>¿Qué &lt;sigue&gt;?</p>');
    expect(html).toContain(`<footer><span class="como">${momento(n1.cuando)}</span><button type="button" data-editar-nota="n1">Corregir</button><button type="button" data-borrar-nota="n1">Quitar</button></footer>`);
    // La conversación: abierta por su primera pregunta, no por la que sigue
    expect(html).toContain('<h3>Conversaciones con el director <small>· 1</small></h3>');
    expect(html).toContain('<details class="hilo-preguntas" data-hilo="n2" data-ancla="hilo-n2">');
    expect(html).not.toContain('data-hilo="n3"');
    expect(html).toContain('<span class="titulo-hilo">Primera pregunta</span>');
    expect(html).toContain(`<span class="como">2 preguntas · ${momento(n3.cuando)}</span><span class="chip-espera">una espera respuesta</span>`);
    // La respuesta, el aviso de que pide una decisión y dónde quedó (con el lugar del hilo)
    expect(html).toContain('<div class="respuesta-qa"><p>Así **es**</p><p class="pide-decision">Esta respuesta pide tu decisión: está en el lugar que dice.</p><p class="quedo-en" data-aqui="preguntas|hilo-n2"></p></div>');
    // La que sigue: marcada, de otra persona y esperando, sin «Corregir» ni «Quitar» (no es suya)
    expect(html).toContain('<li class="sigue">');
    expect(html).toContain('<span class="etiqueta-sigue">Seguiste</span><p>Y esto otro</p>');
    expect(html).toContain(`<small class="como">Beto · ${momento(n3.cuando)}</small>`);
    expect(html).toContain('<div class="respuesta-qa esperando"><span class="como">Esperando la respuesta del director, en su próxima revisión.</span></div>');
    expect(html).not.toContain('data-editar-nota="n3"');
    expect(html).not.toContain('data-borrar-nota="n3"');
    expect(html).toContain('<button type="button" data-seguir-hilo="n3">');
    expect(html).toContain('data-copiar-hilo="n2"');
  });

  it('el titular puede quitar la pregunta de cualquiera; los hilos que quien mira abrió siguen abiertos', () => {
    const delTitular = vistaPreguntas(datos({ yo: 'ceci', esTitular: true }));
    expect(delTitular).toContain('data-borrar-nota="n1"');
    expect(delTitular).toContain('data-borrar-nota="n3"');
    expect(delTitular).not.toContain('data-editar-nota');
    expect(delTitular).toContain('<span class="como">Ana · ');
    expect(vistaPreguntas(datos())).not.toContain('data-hilo="n2" data-ancla="hilo-n2" open');
    expect(vistaPreguntas(datos({ hilosAbiertos: new Set(['n2']) }))).toContain('data-hilo="n2" data-ancla="hilo-n2" open>');
  });

  it('un audio sin texto se resume con lo que se entendió, o como «Pregunta grabada»; y se corta lo largo', () => {
    const grabada = (id: string, audio: string, cuando: string) => pregunta(id, { texto: undefined, audio, cuando });
    const largo = pregunta('n5', { texto: 'x'.repeat(200) });
    const conAudio = vistaPreguntas(datos({ notas: [grabada('n4', 'a.webm', '2026-10-17T10:00:00Z'), grabada('n6', 'b.webm', '2026-10-16T10:00:00Z'), largo], respuestas: { n4: respuestas.n2, n5: respuestas.n2, n6: respuestas.n2 } }));
    expect(conAudio).toContain('<span class="titulo-hilo">Lo que dije en el audio</span>');
    expect(conAudio).toContain('<span class="titulo-hilo">Pregunta grabada</span>');
    expect(conAudio).toContain(`<span class="titulo-hilo">${'x'.repeat(147)}…</span>`);
    expect(conAudio).toContain('<div class="nota-voz" data-audio="a.webm"></div>');
  });

  it('sin preguntas, cada parte dice por qué está vacía', () => {
    const vacio = vistaPreguntas(datos({ notas: [] }));
    expect(vacio).toContain('Esperando respuesta <small>· 0</small>');
    expect(vacio).toContain('Ninguna esperando: cuando se te ocurra una duda');
    expect(vacio).toContain('Conversaciones con el director <small>· 0</small>');
    expect(vacio).toContain('Todavía no hay respuestas. Llegan con la próxima revisión del director.');
    expect(vacio).not.toContain('<ol');
    expect(vacio).not.toContain('<details');
  });

  it('app.ts la importa y ya no la pinta', () => {
    const director = readFileSync(new URL('./app.ts', import.meta.url), 'utf8');
    expect(director).toContain("import { vistaPreguntas as vistaPreguntasHtml } from './vistaPreguntas';");
    expect(director).toContain('return vistaPreguntasHtml({');
    expect(director).not.toContain('class="cabeza-preguntas"');
    expect(director).not.toContain('class="hilo-preguntas"');
  });
});
