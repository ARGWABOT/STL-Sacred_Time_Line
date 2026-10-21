import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(__dirname, 'director.css'), 'utf-8');

describe('los estilos mientras el director revisa', () => {
  it('no apagan lo que se puede hacer en una misión: marcar, elegir, «Hazlo tú» y «Ya lo hice» (nota del titular, 21 de octubre de 2026)', () => {
    const apagados = [...css.matchAll(/body\.director-trabajando\s+([^{]+)\{[^}]*not-allowed/g)].map((m) => m[1].trim());
    for (const libre of ['.listo-paso', '.boton-opcion', '.hazlo-paso', '.boton-ya-hice']) expect(apagados).not.toContain(libre);
    // «No lo entiendo» sí espera a que termine la revisión
    expect(apagados).toContain('.aclarar-paso');
  });
});
