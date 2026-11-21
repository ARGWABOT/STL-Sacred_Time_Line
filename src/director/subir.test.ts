// Dos reglas del titular que vigila el cierre (sus notas del 28 de octubre de 2026): no se le pide subir a GitHub en cada
// revisión (nmvsxjftptit), y las fuentes solo si se piden (nmvsvlnwotit, y nmvsxy6cmtit: que sea regla, no memoria)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { misionesQuePidenSubir, respuestasConFuentes, respuestasIncompletas, type Mision, type Plan } from './director';

const mision = (id: string, x: Partial<Mision> = {}): Mision => ({ id, para: 'titular', fase: 'f', frente: 'publicacion', titulo: 'Algo', porQue: '', pasos: ['Mira algo.'], entrega: '', xp: 10, ...x });
const subir = { texto: 'Abre la terminal con la orden de este paso.', terminal: 'node tools/subir-studio.ts --subir' };
const plan = (misiones: Mision[], respuestas: Plan['respuestas'] = {}) => ({ fases: [], frentes: [], propuestas: [], misiones, respuestas }) as unknown as Plan;

describe('no se pide subir en cada revisión (nota nmvsxjftptit)', () => {
  it('una misión nueva que pide subir no pasa; sí la del cierre o la que nace de una nota que lo pidió', () => {
    const notas = [{ id: 'n_pide', texto: 'Ya estoy listo: súbelo a GitHub.' }, { id: 'n_otra', texto: 'El botón se ve raro.' }];
    const p = plan([
      mision('t_sube', { pasos: [subir] }),
      mision('t_push', { pasos: [{ texto: 'Súbelo.', terminal: 'git push origin main' }] }),
      mision('t_cierre', { pasos: [subir], alCierre: true }),
      mision('t_pedida', { pasos: [subir], origen: ['n_pide'] }),
      mision('t_otra_nota', { pasos: [subir], origen: ['n_otra'] }),
      mision('t_mira', { pasos: [{ texto: 'Mira la página.', ir: { url: 'https://github.com', etiqueta: 'Ver' } }] }),
    ]);
    expect(misionesQuePidenSubir(p, { misiones: [] }, notas)).toEqual(['t_sube', 't_push', 't_otra_nota']);
    // Lo que ya estaba igual en el plan guardado no se vuelve a juzgar, ni lo ya entregado
    expect(misionesQuePidenSubir(p, { misiones: p.misiones }, notas)).toEqual([]);
    expect(misionesQuePidenSubir(p, { misiones: [] }, notas, new Set(['t_sube', 't_push', 't_otra_nota']))).toEqual([]);
  });

  it('el cierre lo exige', () => {
    const bandeja = readFileSync(join(__dirname, '..', '..', 'tools', 'director', 'bandeja.ts'), 'utf-8');
    expect(bandeja).toContain('const pidenSubir = misionesQuePidenSubir(plan, guardado, todoLoDicho);');
  });
});

describe('las fuentes, solo si se piden (notas nmvsvlnwotit y nmvsxy6cmtit)', () => {
  const r = (texto: string, partes?: { texto: string }[]) => ({ cuando: '2026-10-29T03:00:00.000Z', texto, tratamiento: 'informada', ...(partes ? { partes } : {}) });
  const notas = [{ id: 'n1', texto: '¿Cuántos tokens trae Sonnet?' }, { id: 'n2', texto: '¿De dónde salió ese dato? Dame las fuentes.' }, { id: 'n3', texto: 'Algo' }, { id: 'n4', texto: 'Otra' }, { id: 'n5', texto: 'Una más' }];
  it('una respuesta que lista fuentes sin que las pidieran no pasa; si las pidió, sí; una mención suelta, también', () => {
    const p = plan([], {
      n1: r('2 millones de contexto.\n\nFuentes:\n- La tabla de Anthropic'),
      n2: r('2 millones de contexto.\n\n**Fuentes**\n- La tabla de Anthropic, 2026-10-28'),
      n3: r('Lo cambié en el criterio: ya no te cito las fuentes salvo que me las pidas.'),
      n4: r('Hecho.', [{ texto: 'Primero esto.' }, { texto: '## Sources\n- Kelley, 1959' }]),
      n5: r('Viejo.\n\nFuentes: algo'),
    } as unknown as Plan['respuestas']);
    (p.respuestas.n5 as { cuando: string }).cuando = '2026-10-20T00:00:00.000Z';
    expect(respuestasConFuentes(p, notas, '2026-10-29T00:00:00.000Z')).toEqual(['n1', 'n4']);
  });

  it('el cierre lo exige, y el procedimiento lo dice en sus dos idiomas', () => {
    const raiz = join(__dirname, '..', '..');
    expect(readFileSync(join(raiz, 'tools', 'director', 'bandeja.ts'), 'utf-8')).toContain('const conFuentes = respuestasConFuentes(plan, todoLoDicho, desde);');
    expect(readFileSync(join(raiz, 'docs', 'metodo', 'director', 'deciding.md'), 'utf-8')).toContain('(`respuestasConFuentes`)');
    expect(readFileSync(join(raiz, 'docs', 'metodo', 'director', 'deciding.es.md'), 'utf-8')).toContain('(`respuestasConFuentes`)');
  });
});

describe('nunca una línea incompleta (nota de voz del titular nmvt22igctit)', () => {
  it('una respuesta que habla de «ese paso» o «esa misión» sin decir cuál no cierra; con su nombre o su número, sí', () => {
    const r = (texto: string, partes?: { texto: string }[]) => ({ cuando: '2026-10-29T05:00:00.000Z', texto, tratamiento: 'integrada', ...(partes ? { partes } : {}) });
    const p = { respuestas: {
      n1: r('Respondida con tu comentario de ese paso, como pediste: allí está lo que pasó y cómo lo corregí.'),
      n2: r('Respondida con tu comentario del paso 1 de «Mira el tipo «Comentario»»: el botón ya aparece.'),
      n3: r('En esta misión lo corregí.', [{ texto: 'Sobre «Haz una pregunta», esa misma parte ya está.' }]),
      n4: r('Hecho.', [{ texto: 'Lo dejé en esa nota.' }]),
      n5: r('El botón ya aparece siempre.'),
      n6: { ...r('Viejo: en ese paso.'), cuando: '2026-10-20T00:00:00.000Z' },
    } } as unknown as Pick<Plan, 'respuestas'>;
    expect(respuestasIncompletas(p, '2026-10-29T00:00:00.000Z')).toEqual(['n1', 'n4']);
  });

  it('el cierre lo exige', () => {
    const raiz = join(__dirname, '..', '..');
    expect(readFileSync(join(raiz, 'tools', 'director', 'bandeja.ts'), 'utf-8')).toContain('const incompletas = respuestasIncompletas(plan, desde);');
  });
});
