import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { destinosDeNota, tratamientosDeNota, tratamientosQueNoCaben, type Nota, type Plan } from './director';

// Decidir con un formulario (pedido pd_formulario, lo útil de JEPA en «Cómo piensa el director», parte 4): los destinos
// de cada nota, ya calculados por el código, para que el director elija el suyo en vez de armarlo
const plan = {
  fases: [{ id: 'replicable' }, { id: 'publico' }],
  misiones: [{ id: 't_ver', para: 'titular', fase: 'replicable' }],
  propuestas: [{ id: 'pr_algo', fase: 'replicable' }],
  pedidos: [
    { id: 'pd_uno', fase: 'replicable', texto: 'Algo pedido', notas: ['n_mision'] },
    { id: 'pd_luego', fase: 'despues', texto: 'Para después', notas: ['n_mision'] },
  ],
} as unknown as Plan;
const nota = (id: string, sobre: Nota['sobre']): Nota => ({ id, cuando: '2026-10-27T16:00:00.000Z', quien: 'titular', sobre }) as Nota;

describe('decidir con un formulario: los destinos de cada nota, calculados', () => {
  it('la parte del documento, la misión o la propuesta que comenta, los pedidos que la nombran y el plan de la fase', () => {
    expect(destinosDeNota(plan, nota('n_doc', { tipo: 'documento', id: 'docs/director/a.md', seccion: '2. Algo' }), 'replicable')).toEqual([
      { doc: 'docs/director/a.md', seccion: '2. Algo', etiqueta: 'Ver la parte' },
      { vista: 'ruta', fase: 'replicable', ancla: 'r-plan', etiqueta: 'Ver el plan de la fase' },
    ]);
    expect(destinosDeNota(plan, nota('n_mision', { tipo: 'mision', id: 't_ver', seccion: 'Paso 1' }))).toEqual([
      { vista: 'misiones', ancla: 'mision-t_ver', etiqueta: 'Ver la misión' },
      { vista: 'ruta', fase: 'replicable', ancla: 'pedido-pd_uno', etiqueta: 'Ver lo pedido' },
      // Lo de después del lanzamiento se ve al final de la última fase
      { vista: 'ruta', fase: 'publico', ancla: 'pedido-pd_luego', etiqueta: 'Ver lo pedido' },
    ]);
    expect(destinosDeNota(plan, nota('n_prop', { tipo: 'propuesta', id: 'pr_algo' }))).toEqual([
      { vista: 'ruta', fase: 'replicable', ancla: 'propuesta-pr_algo', etiqueta: 'Ver la propuesta' },
    ]);
  });

  it('lo que no existe no se ofrece, y la bandeja los da con cada nota', () => {
    expect(destinosDeNota(plan, nota('n_x', { tipo: 'mision', id: 't_borrada' }))).toEqual([]);
    expect(destinosDeNota(plan, nota('n_y', { tipo: 'propuesta', id: 'pr_borrada' }))).toEqual([]);
    const bandeja = readFileSync(join(__dirname, '..', '..', 'tools', 'director', 'bandeja.ts'), 'utf-8');
    expect(bandeja).toContain('destinosDeNota(plan, n, fase?.id)');
  });
});

describe('decidir con un formulario: los tratamientos que le caben a cada nota', () => {
  const hazlo = nota('n_hazlo', { tipo: 'mision', id: 't_ver', seccion: 'Paso 1', hazlo: true });
  const decide = nota('n_decide', { tipo: 'documento', id: 'docs/director/a.md', seccion: '2. Algo', decision: '1. Algo', postura: 'aprueba' });
  const comenta = nota('n_comenta', { tipo: 'documento', id: 'docs/director/a.md', seccion: '2. Algo', decision: '1. Algo', postura: 'comenta' });
  const eligio = nota('n_eligio', { tipo: 'mision', id: 't_ver', seccion: 'Paso 2', eleccion: 'Déjala así' });
  const pregunta = nota('n_pregunta', { tipo: 'pregunta' });
  const aclarar = nota('n_aclarar', { tipo: 'mision', id: 't_ver', seccion: 'Paso 1', aclarar: true });
  const general = nota('n_general', { tipo: 'general' });

  it('un encargo o una decisión del titular no se dan solo por informados; lo que eligió la persona o una pregunta no se rechazan', () => {
    expect(tratamientosDeNota(hazlo)).toEqual(['integrada', 'rechazada', 'aplazada', 'decision']);
    expect(tratamientosDeNota(decide)).toEqual(['integrada', 'rechazada', 'aplazada', 'decision']);
    expect(tratamientosDeNota(eligio)).toEqual(['integrada', 'aplazada', 'decision', 'informada']);
    expect(tratamientosDeNota(pregunta)).toEqual(['integrada', 'aplazada', 'decision', 'informada']);
    expect(tratamientosDeNota(aclarar)).toEqual(['integrada', 'informada']);
    // comentar una decisión sin decidirla, o una nota cualquiera: los cinco
    expect(tratamientosDeNota(comenta)).toHaveLength(5);
    expect(tratamientosDeNota(general)).toHaveLength(5);
  });

  it('al cerrar, solo cuentan las respuestas de esta revisión, y la bandeja los da con cada nota', () => {
    const desde = '2026-10-27T17:00:00.000Z';
    const respuestas = {
      n_hazlo: { cuando: '2026-10-27T17:10:00.000Z', texto: 'Lo vi.', tratamiento: 'informada' },
      n_eligio: { cuando: '2026-10-27T17:10:00.000Z', texto: 'No.', tratamiento: 'rechazada' },
      n_pregunta: { cuando: '2026-10-27T17:10:00.000Z', texto: 'Sí.', tratamiento: 'informada' },
      // de una revisión anterior: ya no se juzga
      n_decide: { cuando: '2026-10-26T10:00:00.000Z', texto: 'Ok.', tratamiento: 'informada' },
    };
    const conRespuestas = { ...plan, respuestas } as unknown as Plan;
    expect(tratamientosQueNoCaben(conRespuestas, [hazlo, eligio, pregunta, decide], desde)).toEqual([
      { id: 'n_hazlo', tratamiento: 'informada', caben: ['integrada', 'rechazada', 'aplazada', 'decision'] },
      { id: 'n_eligio', tratamiento: 'rechazada', caben: ['integrada', 'aplazada', 'decision', 'informada'] },
    ]);
    const bandeja = readFileSync(join(__dirname, '..', '..', 'tools', 'director', 'bandeja.ts'), 'utf-8');
    expect(bandeja.match(/Tratamientos que le caben: \$\{tratamientosDeNota\(n\)/g)).toHaveLength(2);
    expect(bandeja).toContain('tratamientosQueNoCaben(plan, estado.notas, desde)');
  });
});
