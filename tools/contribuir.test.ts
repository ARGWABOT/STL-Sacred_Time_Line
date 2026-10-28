// STL Studio lo cambia solo su autor (pedido pd_sin_contribuciones, nota de voz del titular del 26 de octubre de 2026):
// no acepta cambios de código de otros, pero sí avisos de fallas, con un formulario corto de cuatro preguntas
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const raiz = join(import.meta.dirname, '..');
const leer = (ruta: string) => readFileSync(join(raiz, ruta), 'utf8');

describe('lo que dice el repositorio a quien quiere contribuir', () => {
  it('CONTRIBUTING.md y el README dicen que no acepta cambios de código de otros, pero sí avisos de fallas, en inglés y en español', () => {
    const contribuir = leer('CONTRIBUTING.md');
    expect(contribuir).toContain('does not accept code changes from others (pull requests)');
    expect(contribuir).toContain('no acepta cambios de código de otros (pull requests)');
    expect(contribuir).toContain('**Bug reports are welcome.**');
    expect(contribuir).toContain('**Los avisos de fallas, sí.**');
    // Sin la invitación de antes a mandar pull requests
    expect(contribuir).not.toMatch(/pueden ir directo en un pull request|Abre un issue primero/);
    const readme = leer('README.md');
    expect(readme).toContain('no acepta cambios de código de otros (pull requests). Los avisos de fallas, sí');
  });

  it('cada aviso trae su formulario, con las cuatro preguntas, y sin issues en blanco', () => {
    const forma = leer('.github/ISSUE_TEMPLATE/falla.yml');
    for (const id of ['sistema', 'version', 'que-paso', 'revision']) expect(forma).toContain(`id: ${id}`);
    for (const sistema of ['Windows', 'Mac', 'Linux']) expect(forma).toContain(`- ${sistema}`);
    expect(forma).toContain('«Qué pasó con la revisión»');
    expect(leer('.github/ISSUE_TEMPLATE/config.yml')).toContain('blank_issues_enabled: false');
  });
});
