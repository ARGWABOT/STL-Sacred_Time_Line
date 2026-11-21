import { describe, expect, it } from 'vitest';
import { entornoDeLaRevision, proyectoPermitidoEnRevision, VARIABLE_REVISION_COLA, VARIABLE_REVISION_PROYECTO } from './barreraRevision';

describe('la barrera de las herramientas dentro de una revisión', () => {
  const env = entornoDeLaRevision('golf', ['tesis', 'sitio']);

  it('el lanzador pone el proyecto de la revisión y los de su cola', () => {
    expect(env).toEqual({ [VARIABLE_REVISION_PROYECTO]: 'golf', [VARIABLE_REVISION_COLA]: 'tesis,sitio' });
    expect(entornoDeLaRevision('golf', [])[VARIABLE_REVISION_COLA]).toBe('');
  });

  it('permite su proyecto y los de su cola; rechaza cualquier otro con el aviso en inglés', () => {
    expect(proyectoPermitidoEnRevision(env, 'golf')).toEqual({ ok: true });
    expect(proyectoPermitidoEnRevision(env, 'tesis')).toEqual({ ok: true });
    expect(proyectoPermitidoEnRevision(env, 'banco')).toEqual({ ok: false, error: 'This review is for project golf; it cannot work on banco. Load banco in the Studio to work on it.' });
    expect(proyectoPermitidoEnRevision(entornoDeLaRevision('golf', []), 'tesis')).toMatchObject({ ok: false });
  });

  it('fuera de una revisión (sin la variable) nada cambia', () => {
    expect(proyectoPermitidoEnRevision({}, 'cualquiera')).toEqual({ ok: true });
  });
});
