// El escaneo técnico de cada revisión (nota nmvx17ixjtit) y lo que dice de la reserva (nota nmvx3tnpjtit).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { escaneoDeLaRevision, lineasDelEscaneo, type DatosDelEscaneo } from './escaneo';
import { esOrigenRevision, ORIGENES_REVISION } from './proyectos';

const quieto: DatosDelEscaneo = { reservas: [{ nombre: 'Ana', alcanza: 12, faltan: 0 }], commits: 0, archivos: 0, documentos: 0, pistas: 0, misionesPorVigilar: 0, documentosPorLeer: 0, base: 'abc123' };
const leer = (ruta: string) => readFileSync(join(import.meta.dirname, '..', '..', ruta), 'utf8');

describe('el escaneo técnico: lo que ya se cumple no se rehace', () => {
  it('con todo cumplido, dice cada cosa que no hay que volver a hacer', () => {
    const { yaEsta, falta } = escaneoDeLaRevision(quieto);
    expect(yaEsta.join(' ')).toContain("Ana's reserve is complete (12 at hand)");
    expect(yaEsta.join(' ')).toContain('did not change since the last review');
    expect(yaEsta.join(' ')).toContain('Nothing pending looks already done');
    expect(yaEsta.join(' ')).toContain('No open mission needs looking at again');
    expect(yaEsta.join(' ')).toContain('Nobody has a document to read');
    // Lo único que queda son las pruebas, y solo si toca código
    expect(falta).toHaveLength(1);
    expect(falta[0]).toContain('only if you touch code');
  });

  it('lo que no se cumple va aparte, con sus cifras, y no se da por hecho', () => {
    const { yaEsta, falta } = escaneoDeLaRevision({ ...quieto, reservas: [{ nombre: 'Ana', alcanza: 4, faltan: 6 }], commits: 2, archivos: 5, documentos: 1, pistas: 3, misionesPorVigilar: 2, documentosPorLeer: 1 });
    expect(yaEsta).toEqual([]);
    const texto = falta.join(' ');
    expect(texto).toContain("Ana's reserve: 4 at hand, 6 missing.");
    expect(texto).toContain('2 commits, 5 changed files and 1 changed documents');
    expect(texto).toContain('3 pending items');
    expect(texto).toContain('2 open missions');
  });

  it('la reserva se cuenta con la regla de los diez, no con otro número: lo que faltan lo dice reservaDeMisiones', () => {
    expect(escaneoDeLaRevision({ ...quieto, reservas: [{ nombre: 'Ana', alcanza: 7, faltan: 3 }] }).falta[0]).toContain('3 missing');
  });

  it('las pruebas: las del cambio mientras trabaja y la suite entera una vez, antes de cerrar', () => {
    const { falta } = escaneoDeLaRevision(quieto);
    expect(falta[0]).toContain('npx vitest run --changed abc123');
    expect(falta[0]).toContain('the whole suite once, before closing');
    expect(escaneoDeLaRevision({ ...quieto, base: null }).falta[0]).not.toContain('--changed');
  });

  it('se imprime en dos partes, y solo las que tienen algo', () => {
    expect(lineasDelEscaneo({ yaEsta: ['a'], falta: [] })).toEqual(['What already holds, and is not redone:', '- a']);
    expect(lineasDelEscaneo({ yaEsta: [], falta: ['b'] })).toEqual(['What does need you:', '- b']);
  });

  it('la bandeja lo corre en cada revisión', () => {
    const bandeja = leer('tools/director/bandeja.ts');
    expect(bandeja).toContain('lineasDelEscaneo(escaneoDeLaRevision({');
    expect(bandeja).toContain('## Technical scan');
  });
});

describe('la reserva: lo que ya está en la cola sigue valiendo (nota de voz del titular nmvx3tnpjtit)', () => {
  it('con misiones en la cola, se comprueba que los cambios no las toquen y se escribe solo lo que falta', () => {
    const { falta } = escaneoDeLaRevision({ ...quieto, reservas: [{ nombre: 'Ana', alcanza: 6, faltan: 4 }] });
    expect(falta[0]).toContain('The 6 already queued stay valid unless this review');
    expect(falta[0]).toContain('write only the 4 missing, never the whole batch again');
  });

  it('sin ninguna en la cola, no habla de las que no hay', () => {
    const { falta } = escaneoDeLaRevision({ ...quieto, reservas: [{ nombre: 'Ana', alcanza: 0, faltan: 10 }] });
    expect(falta[0]).toContain('Nothing is queued: write only the 10 missing');
    expect(falta[0]).not.toContain('stay valid');
  });

  it('la bandeja lo dice junto a la reserva corta, y la regla está en los procedimientos, en los dos idiomas', () => {
    expect(leer('tools/director/bandeja.ts')).toContain('The ones already queued stay valid');
    expect(leer('docs/metodo/director/review-cycle.md')).toContain('**Missions already queued stay valid**');
    expect(leer('docs/metodo/director/review-cycle.es.md')).toContain('**Las misiones que ya están en la cola siguen valiendo**');
  });
});

describe('solo hay una revisión, la completa (nota de voz del titular nmvx3x8bstit)', () => {
  it('ningún origen pide menos, y la bandeja siempre trabaja la cola autorizada', () => {
    expect(esOrigenRevision('solo_dejado')).toBe(false);
    expect(Object.keys(ORIGENES_REVISION)).not.toContain('solo_dejado');
    const bandeja = leer('tools/director/bandeja.ts');
    expect(bandeja).not.toContain('solo_dejado');
    expect(bandeja).toContain('if (tuCola.length && plan.colaAutorizada) linea(');
  });
});
