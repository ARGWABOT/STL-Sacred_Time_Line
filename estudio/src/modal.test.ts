// El «Cancelar» por defecto de una confirmación, en el idioma de la interfaz (auditoria-idiomas.md, parte 3; pd_idiomas_resto)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { en } from './textos/en';
import { es } from './textos/es';

describe('el «Cancelar» por defecto de una confirmación', () => {
  it('sale de los archivos de idioma, no escrito en español', () => {
    const modal = readFileSync(join(__dirname, 'modal.ts'), 'utf8');
    expect(modal).toContain("o.cancelar ?? t('modal.cancelar')");
    expect(modal).not.toContain("'Cancelar'");
    expect(es['modal.cancelar']).toBe('Cancelar');
    expect(en['modal.cancelar']).toBe('Cancel');
  });
});
