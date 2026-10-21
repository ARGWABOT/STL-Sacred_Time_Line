// La firma pública del Studio (tools/firma.ts): qué commits faltan por firmar antes de subir y qué se reescribe.
import { describe, expect, it } from 'vitest';
import { filtroDeFirma, porFirmar, rangoPorSubir } from './firma.ts';

describe('la firma pública del Studio', () => {
  it('pide firmar los commits cuyo autor o confirmador no es ARGWABOT', () => {
    const log = [
      'a1\tARGWABOT\tincocrea@outlook.com\tARGWABOT\tincocrea@outlook.com',
      'b2\tARGWABOT\tincocrea@outlook.com\tleonc\titsupport@idgwindtech.com',
      'c3\tleonc\titsupport@idgwindtech.com\tleonc\titsupport@idgwindtech.com',
      '',
    ].join('\n');
    expect(porFirmar(log).map((c) => c.hash)).toEqual(['b2', 'c3']);
    expect(porFirmar(log)[0].confirmador).toBe('leonc <itsupport@idgwindtech.com>');
    expect(porFirmar('')).toEqual([]);
  });

  it('solo cambia nombres y correos, y solo de lo que aún no se subió', () => {
    const filtro = filtroDeFirma();
    for (const v of ['GIT_AUTHOR_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_COMMITTER_NAME', 'GIT_COMMITTER_EMAIL']) expect(filtro).toContain(v);
    expect(filtro).not.toContain('DATE');
    expect(rangoPorSubir('main', 'abc123')).toBe('abc123..main');
    expect(rangoPorSubir('main', null)).toBe('main');
  });
});
