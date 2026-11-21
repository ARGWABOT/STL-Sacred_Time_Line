// La cuenta de GitHub que se sugiere sin cuenta aprobada (pd_diagnostico_llena, decisión nmwawb3grtit).
import { describe, expect, it } from 'vitest';
import { cuentaDetectada, duenoDelRemoto } from './cuentaDetectada';
import { esCuentaGitHub } from './cuentaGit';

describe('la cuenta detectada (nmwawb3grtit)', () => {
  it('el dueño sale de la dirección del remoto de GitHub, por https o ssh; de otro sitio, ninguno', () => {
    expect(duenoDelRemoto('https://github.com/ARGWABOT/STL.git')).toBe('ARGWABOT');
    expect(duenoDelRemoto('https://github.com/laura-gh/talleres')).toBe('laura-gh');
    expect(duenoDelRemoto('git@github.com:empresa_x/app.git')).toBe('empresa_x');
    expect(duenoDelRemoto('origin\thttps://github.com/a/b (fetch)')).toBe('a');
    expect(duenoDelRemoto('https://gitlab.com/a/b.git')).toBeNull();
    expect(duenoDelRemoto(null)).toBeNull();
  });

  it('sin cuenta aprobada, el dueño del repositorio antes que la sesión activa; si no es de GitHub, la activa; con aprobada, ninguna', () => {
    expect(cuentaDetectada(null, 'https://github.com/duena/repo.git', 'activa')).toEqual({ cuenta: 'duena', de: 'dueno' });
    expect(cuentaDetectada('', null, 'activa')).toEqual({ cuenta: 'activa', de: 'activa' });
    expect(cuentaDetectada(null, 'https://gitlab.com/a/b', null)).toBeNull();
    expect(cuentaDetectada('aprobada', 'https://github.com/duena/repo.git', 'activa')).toBeNull();
    // cuentaGit.ts lo sigue ofreciendo
    expect(esCuentaGitHub('ARGWABOT')).toBe(true);
  });
});
