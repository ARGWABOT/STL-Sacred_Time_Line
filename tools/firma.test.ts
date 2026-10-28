// La firma pública del Studio (tools/firma.ts): qué commits faltan por firmar antes de subir y qué se reescribe.
import { describe, expect, it } from 'vitest';
import { argumentosDeFirmar, entornoDeFirma, faltaWorkflow, FIRMA, filtroDeFirma, firmaDelProyecto, mensajeDeHistoriaNueva, porFirmar, rangoPorSubir, RESPALDO_DE_HISTORIA, respaldoDeHistoria, sinFirmaPorAtender, textoParaSoporte } from './firma.ts';

describe('la firma pública del Studio', () => {
  it('pide firmar los commits cuyo autor o confirmador no es ARGWABOT', () => {
    const log = [
      'a1\tARGWABOT\tincocrea@outlook.com\tARGWABOT\tincocrea@outlook.com',
      'b2\tARGWABOT\tincocrea@outlook.com\tlaura\tlaura@ejemplo.org',
      'c3\tlaura\tlaura@ejemplo.org\tlaura\tlaura@ejemplo.org',
      '',
    ].join('\n');
    expect(porFirmar(log).map((c) => c.hash)).toEqual(['b2', 'c3']);
    expect(porFirmar(log)[0].confirmador).toBe('laura <laura@ejemplo.org>');
    expect(porFirmar('')).toEqual([]);
  });

  it('solo cambia nombres y correos, y solo de lo que aún no se subió', () => {
    const filtro = filtroDeFirma();
    for (const v of ['GIT_AUTHOR_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_COMMITTER_NAME', 'GIT_COMMITTER_EMAIL']) expect(filtro).toContain(v);
    expect(filtro).not.toContain('DATE');
    expect(rangoPorSubir('main', 'abc123')).toBe('abc123..main');
    expect(rangoPorSubir('main', null)).toBe('main');
  });

  it('los commits nacen firmados: firmar.ts pone la firma en autor y confirmador sin tocar la identidad de la carpeta (autorizado por el titular el 22 de octubre de 2026)', () => {
    // La del proyecto manda; en el mismo Studio, sin ella, la firma pública; en otro proyecto sin firma, ninguna
    expect(firmaDelProyecto({ nombre: ' Ana Pública ', correo: 'ana@ejemplo.org' }, false)).toEqual({ nombre: 'Ana Pública', correo: 'ana@ejemplo.org' });
    expect(firmaDelProyecto(undefined, true)).toEqual(FIRMA);
    expect(firmaDelProyecto({ nombre: 'Solo nombre' }, false)).toBeNull();
    expect(entornoDeFirma({ nombre: 'Ana', correo: 'ana@ejemplo.org' })).toEqual({ GIT_AUTHOR_NAME: 'Ana', GIT_AUTHOR_EMAIL: 'ana@ejemplo.org', GIT_COMMITTER_NAME: 'Ana', GIT_COMMITTER_EMAIL: 'ana@ejemplo.org' });
    // Como git commit, con su mensaje y siempre con sus rutas; nada que cambie la historia
    expect(argumentosDeFirmar(['-m', 'STL: algo', '-m', 'Co-Authored-By: x', '--', 'a.ts', 'b.ts'])).toEqual({ mensajes: ['STL: algo', 'Co-Authored-By: x'], rutas: ['a.ts', 'b.ts'] });
    expect(argumentosDeFirmar(['-m', 'STL: algo'])).toHaveProperty('error');
    expect(argumentosDeFirmar(['--', 'a.ts'])).toHaveProperty('error');
    expect(argumentosDeFirmar(['--amend', '-m', 'x', '--', 'a.ts'])).toHaveProperty('error');
  });

  it('el cierre ve lo del producto sin la firma de publicación, salvo lo que el director ya nombró en alDia (pr_subida_limpia)', () => {
    const firma = { nombre: 'Ana Pública', correo: 'ana@ejemplo.org' };
    const log = [
      'aaaaaaa111\tAna Pública\tana@ejemplo.org\tAna Pública\tana@ejemplo.org',
      'bbbbbbb222\tAna\tana@trabajo.co\tAna\tana@trabajo.co',
      'ccccccc333\tAna Pública\tana@ejemplo.org\tAna\tana@trabajo.co',
    ].join('\n');
    expect(sinFirmaPorAtender(log, firma, '').map((c) => c.hash)).toEqual(['bbbbbbb222', 'ccccccc333']);
    // Nombrado en alDia por su código de siete letras, ya no detiene el cierre
    expect(sinFirmaPorAtender(log, firma, 'bbbbbbb y ccccccc salieron sin firma: quedan para firmar antes de subir').map((c) => c.hash)).toEqual([]);
    expect(sinFirmaPorAtender('', firma, '')).toEqual([]);
  });

  it('la historia limpia: su rama de respaldo, el mensaje del commit único y lo que se le pide a GitHub Support', () => {
    expect(respaldoDeHistoria(new Date('2026-10-28T02:03:04.567Z'))).toBe('respaldo/historia-20261028-020304');
    expect(respaldoDeHistoria(new Date())).toMatch(new RegExp(`^${RESPALDO_DE_HISTORIA}\\d{8}-\\d{6}$`));
    // La fecha del último commit, en su propia zona horaria: a las 19:50 de Bogotá sigue siendo el 27
    expect(mensajeDeHistoriaNueva('2026-10-27T19:50:48-05:00')).toBe('STL Studio: el Studio del 27 de octubre de 2026, en un solo commit, sin datos de ningún proyecto');
    const t = textoParaSoporte('ARGWABOT/STL-Sacred_Time_Line', { cuantos: 333, primero: 'aaa1', ultimo: 'bbb2' }, '2026-10-28T03:00:00.000Z');
    for (const parte of ['ARGWABOT/STL-Sacred_Time_Line', '2026-10-28', 'no forks', '333 commits', 'aaa1', 'bbb2']) expect(t).toContain(parte);
  });

  it('ve si a la sesión de gh le falta el permiso para subir la integración continua', () => {
    expect(faltaWorkflow('HTTP/2.0 200 OK\nX-Oauth-Scopes: gist, read:org, repo\n\n{}')).toBe(true);
    expect(faltaWorkflow('HTTP/2.0 200 OK\r\nX-Oauth-Scopes: gist, read:org, repo, workflow\r\n\r\n{}')).toBe(false);
    expect(faltaWorkflow('HTTP/2.0 200 OK\n\n{}')).toBe(false);
  });
});
