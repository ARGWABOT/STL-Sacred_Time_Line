// Regla dura del titular (nota nmwcp5wdhtit, 11 de noviembre de 2026): con la interfaz en inglés, ninguna palabra del
// método en español llega a la persona, ni en los pasos ni en las respuestas ni en el mensaje.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PALABRAS_DEL_METODO, pasajesEnOtroIdioma, rotulosEnOtroIdioma } from './rotulosDelIdioma.ts';
import { reglaDeIdiomaEnLaBandeja, textosEnOtroIdioma } from './director.ts';

describe('las palabras del método, en el idioma de la interfaz (nmwcp5wdhtit)', () => {
  it('«Confirmo» y las demás, citadas en inglés, se rechazan con su rótulo en inglés', () => {
    const p = rotulosEnOtroIdioma('Answer with «Confirmo» once you have seen the list.', 'en');
    expect(p).toHaveLength(1);
    expect(p[0]).toContain('«I confirm»');
    for (const [espanol, ingles] of Object.entries(PALABRAS_DEL_METODO)) {
      const r = rotulosEnOtroIdioma(`Press «${espanol}».`, 'en');
      expect(r.length, espanol).toBe(1);
      expect(r[0], espanol).toContain(`«${ingles}»`);
    }
    expect(Object.keys(PALABRAS_DEL_METODO)).toEqual(expect.arrayContaining(['Confirmo', 'Autorizo', 'Entendido', 'Apruebo lo que recomiendas', 'Decido otra cosa', 'Hazlo tú']));
    // En español, nada; y la palabra en inglés pasa
    expect(rotulosEnOtroIdioma('Responde con «Confirmo».', 'es')).toEqual([]);
    expect(rotulosEnOtroIdioma('Answer with «I confirm».', 'en')).toEqual([]);
    // Citar una opción que la misma misión ofrece es citar lo que la persona elige
    expect(rotulosEnOtroIdioma('Only if you answered «Confirmo» in the step before.', 'en', ['Confirmo', 'Not now'])).toEqual([]);
  });

  it('las respuestas de esta revisión (también sus partes) y el mensaje también se miran', () => {
    const desde = '2026-11-12T00:00:00.000Z';
    const plan = {
      respuestas: {
        n1: { cuando: '2026-11-12T01:00:00.000Z', texto: 'Done: it waits for your «Autorizo».', tratamiento: 'integrada' },
        n2: { cuando: '2026-11-12T01:00:00.000Z', texto: 'Done.', tratamiento: 'integrada', partes: [{ tipo: 'idea', texto: 'Mark it with «Entendido».', tratamiento: 'informada' }, { tipo: 'ajuste', texto: 'Fine.', tratamiento: 'informada' }] },
        // Las de antes son historia
        n3: { cuando: '2026-11-11T01:00:00.000Z', texto: 'Use «Hazlo tú».', tratamiento: 'integrada' },
        n4: { cuando: '2026-11-12T01:00:00.000Z', texto: 'Use «Do it for me».', tratamiento: 'integrada' },
      },
      mensaje: '- **On the queue:** I left it ready for your «Decido otra cosa».',
    } as unknown as Parameters<typeof textosEnOtroIdioma>[0];
    const r = textosEnOtroIdioma(plan, desde, 'en');
    expect(r.map((x) => x.donde)).toEqual(['n1', 'n2', 'mensaje']);
    expect(r[0].problema).toContain('«Authorize»');
    // Con la interfaz en español, los rótulos en español pasan; lo que queda es el inglés de esos textos, como pasaje
    expect(textosEnOtroIdioma(plan, desde, 'es').every((x) => x.problema.includes('pasaje en otro idioma'))).toBe(true);
  });

  it('el cierre lo exige, y también --aplicar', () => {
    const bandeja = readFileSync(join(__dirname, '..', '..', 'tools', 'director', 'bandeja.ts'), 'utf-8');
    expect(bandeja).toContain('const otroIdioma = textosEnOtroIdioma(plan, desde, (await leerLocal(raiz)).idioma, lectorDeDocumentos(elegido, repo));');
    expect(bandeja).toContain("const enOtroIdioma = textosEnOtroIdioma(r.plan, r.plan.revisado ?? '', idioma, lectorDeDocumentos(elegido, repo));");
  });
});

// La octava vez (nota nmwjl67k8tit, 16 de noviembre de 2026): el paso 1 de t_ver_config_primero llevaba a una persona con la
// interfaz en inglés a repo:docs/metodo/director/start.md, el procedimiento del modelo, con «objetivo» y los demás nombres
// del formato de la memoria en «The start stages». El vigilante solo leía los textos del plan, nunca el documento al que
// lleva un paso.
describe('el documento al que lleva un paso, también en el idioma de la interfaz (nmwjl67k8tit)', () => {
  const procedimiento = '# The start of a project\n\n## The start stages\n\n1. **conectar** (existing): no repository is connected. **contar** (new): the explanation, the objective or when it is complete is missing.\n3. **objetivo**: the diagnosis is there; the owner still has to set their goal.';
  const documentoEnEspanol = '# Lo que entendí\n\nEl director lee el repositorio y escribe el diagnóstico con lo que hay, para que la persona lo lea en su idioma y decida qué sigue cuando esté listo.';
  const documentoEnIngles = '# What I understood\n\nThe director reads the repository and writes the diagnosis with what there is, so that the person reads it in their language and decides what comes next when it is ready.';
  const textos: Record<string, string> = {
    'repo:docs/metodo/director/start.md': procedimiento,
    'repo:docs/metodo/director/start.es.md': documentoEnEspanol,
    'docs/director/config.md': documentoEnIngles,
    'docs/director/config-es.md': documentoEnEspanol,
  };
  const leer = (ruta: string) => textos[ruta];
  const conPaso = (doc: string, extra: Record<string, unknown> = {}) => ({
    respuestas: {}, mensaje: '',
    misiones: [{ id: 't_ver_config_primero', para: 'titular', fase: 'f', frente: 'x', titulo: 'Read the new rule', porQue: '', xp: 10, entrega: 'Read it.', pasos: [{ texto: 'Open the new part and read it.', ir: { doc, seccion: 'The start stages', etiqueta: 'Open it' } }] }],
    ...extra,
  }) as unknown as Parameters<typeof textosEnOtroIdioma>[0];

  it('reproduce la captura: un paso a start.md, el procedimiento del modelo, no pasa con la interfaz en inglés', () => {
    const plan = conPaso('repo:docs/metodo/director/start.md');
    // Lo que antes miraba el cierre no lo veía: el texto del paso está en inglés
    expect(textosEnOtroIdioma(plan, '', 'en')).toEqual([]);
    const r = textosEnOtroIdioma(plan, '', 'en', leer);
    expect(r).toHaveLength(1);
    expect(r[0].donde).toBe('misión t_ver_config_primero, paso 1');
    expect(r[0].problema).toContain('procedimiento del modelo');
    // Sin «repo:» también, y en español tampoco: el procedimiento del modelo nunca es para la persona
    expect(textosEnOtroIdioma(conPaso('docs/metodo/director/review-cycle.md'), '', 'en', leer)).toHaveLength(1);
    expect(textosEnOtroIdioma(plan, '', 'es', leer).find((x) => x.donde.includes(', paso'))?.problema).toContain('start.es.md');
  });

  it('un documento en el otro idioma no pasa; uno en el idioma de la interfaz, sí', () => {
    expect(textosEnOtroIdioma(conPaso('repo:docs/metodo/director/start.es.md'), '', 'en', leer)[0].problema).toContain('un documento en español');
    expect(textosEnOtroIdioma(conPaso('docs/director/config-es.md'), '', 'en', leer)).toHaveLength(1);
    expect(textosEnOtroIdioma(conPaso('docs/director/config.md'), '', 'en', leer)).toEqual([]);
    // Con la interfaz en español (el paso del ejemplo está en inglés: aquí solo cuenta lo del documento)
    const delDocumento = (doc: string) => textosEnOtroIdioma(conPaso(doc), '', 'es', leer).filter((x) => x.donde.includes(', paso'));
    expect(delDocumento('repo:docs/metodo/director/start.es.md')).toEqual([]);
    expect(delDocumento('docs/director/config.md')).toHaveLength(1);
    // Uno que no se encuentra, o aprobado (historia), pasa
    expect(textosEnOtroIdioma(conPaso('docs/director/no-existe.md'), '', 'en', leer)).toEqual([]);
    expect(textosEnOtroIdioma(conPaso('repo:docs/metodo/director/start.md', { revisiones: { t_ver_config_primero: { veredicto: 'aprobada' } } }), '', 'en', leer)).toEqual([]);
  });

  it('la lista de documentos de la misión también se mira', () => {
    const plan = conPaso('docs/director/config.md');
    (plan.misiones![0] as { documentos?: string[] }).documentos = ['repo:docs/metodo/director/start.md'];
    expect(textosEnOtroIdioma(plan, '', 'en', leer).map((x) => x.donde)).toEqual(['misión t_ver_config_primero, documentos']);
  });
});

// Auditoría del idioma (nota nmwdxm0oztit, 12 de noviembre de 2026): la sexta vez que llegaba español a una misión en
// inglés. La captura: el paso 2 de t_ver_fase_retirada mandaba a escribir «Sigue en la fase del equipo», copiado de una
// respuesta vieja. Los vigilantes solo miraban rótulos entre «»; y el encargo decía «nunca traduzcas lo que ya está en un
// idioma que lee (cítalo tal cual)», que para quien lee los dos idiomas pedía citar en español.
describe('ningún pasaje en otro idioma en lo que la persona lee (nmwdxm0oztit)', () => {
  const pasoDeLaCaptura = 'An old link that led to phase 6 now opens «After the launch». To see one, press this step\'s button and, in «Search the Inbox», type: Sigue en la fase del equipo. An answer of mine from 1 November comes up, about the list of documents, skills and agents of each project. Unfold it and press the button of its request: before, it led to phase 6; now it opens that request in «After the launch» of «Someone who does not know it». Which did you see?';

  it('reproduce la captura: el pasaje en español dentro del paso en inglés se encuentra', () => {
    expect(rotulosEnOtroIdioma(pasoDeLaCaptura, 'en')).toEqual([]); // lo que antes miraba el cierre no lo veía
    expect(pasajesEnOtroIdioma(pasoDeLaCaptura, 'en')).toEqual(['Sigue en la fase del equipo']);
  });

  it('una misión abierta con ese paso no pasa; aprobada es historia', () => {
    const mision = { id: 't_x', para: 'titular', fase: 'f', frente: 'x', titulo: 'See it', porQue: '', xp: 10, entrega: 'Done.', pasos: [{ texto: pasoDeLaCaptura, opciones: ['It opened', 'Something else'] }] };
    const plan = { respuestas: {}, mensaje: '', misiones: [mision] } as unknown as Parameters<typeof textosEnOtroIdioma>[0];
    const r = textosEnOtroIdioma(plan, '2026-11-12T00:00:00.000Z', 'en');
    expect(r).toHaveLength(1);
    expect(r[0].donde).toBe('misión t_x');
    expect(r[0].problema).toContain('«Sigue en la fase del equipo»');
    // Un título o una opción en español, también
    const otra = { ...mision, titulo: 'Decide qué pasa con las preguntas', pasos: [{ texto: 'Which do you prefer?', opciones: ['Keep it', 'Lo dejo como está y lo veo después'] }] };
    expect(textosEnOtroIdioma({ ...plan, misiones: [otra] } as typeof plan, '', 'en').map((x) => x.problema).join(' ')).toMatch(/Decide qué pasa con las preguntas[\s\S]*Lo dejo como está/);
    expect(textosEnOtroIdioma({ ...plan, revisiones: { t_x: { veredicto: 'aprobada' } } } as unknown as typeof plan, '', 'en')).toEqual([]);
  });

  it('el inglés de siempre, con rótulos, nombres y código, pasa', () => {
    for (const bien of [
      pasoDeLaCaptura.replace('Sigue en la fase del equipo', 'the team phase'),
      'Press «Deliver and request its diagnosis» in «All projects», then run `git log --oneline` in C:\\xampp2024\\htdocs\\www\\STL.',
      'The scan looks in your user folder and the usual places for code, such as the htdocs folder of XAMPP.',
      'Open docs/director/estudio-estable.md at «5. The question-only chat».',
    ]) expect(pasajesEnOtroIdioma(bien, 'en'), bien).toEqual([]);
    expect(pasajesEnOtroIdioma('¿Lo ves?', 'en')).toEqual(['¿Lo ves?']);
  });

  it('el encargo y la bandeja ya no piden citar en otro idioma', () => {
    expect(reglaDeIdiomaEnLaBandeja('en')).not.toContain('Never translate');
    expect(reglaDeIdiomaEnLaBandeja('en')).toContain('also what you quote from a note, an old answer or a text they must type');
    const revisor = readFileSync(join(__dirname, '..', '..', 'estudio', 'servidor', 'revisor.ts'), 'utf-8');
    expect(revisor).not.toContain('Never translate for them what is already in a language they read');
  });
});
