import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMO_ORDENES } from '../../estudio/servidor/revisor';
import { encargoDeAyudante, faltaEnElEncargo, NUNCA_EL_AYUDANTE, ORDENES_DEL_AYUDANTE, type EncargoDeAyudante } from './ayudante';

const ENCARGO: EncargoDeAyudante = {
  origen: 'pd_voz_preguntas',
  que: 'Each question is read as its own fragment, with both of its signs.',
  leer: ['src/director/voz.ts', ' estudio/servidor/voz.ts '],
  comprobar: 'npx vitest run src/director/voz.test.ts: a question in the middle of a paragraph comes out as its own fragment.',
};
const STUDIO = { proyecto: 'stl-studio', carpeta: 'C:/xampp/STL', firma: true };

describe('el encargo de un ayudante (pr_encargo_a_medida, punto 2)', () => {
  it('trae lo que escribió el director: de dónde nace, qué hacer, qué leer y cómo se comprueba', () => {
    const texto = encargoDeAyudante(ENCARGO, STUDIO);
    expect(texto).toContain('Task (from pd_voz_preguntas, already approved by the project owner): Each question is read as its own fragment');
    expect(texto).toContain('Read first: src/director/voz.ts, estudio/servidor/voz.ts. Start there');
    expect(texto).toContain('How it is checked: npx vitest run src/director/voz.test.ts');
    expect(texto).toContain('«stl-studio» (C:/xampp/STL)');
  });

  it('y las reglas que el ayudante no recibe: las normas del proyecto, las órdenes, el commit, lo que nunca hace y cómo responde', () => {
    const texto = encargoDeAyudante(ENCARGO, STUDIO);
    expect(texto).toContain('its CLAUDE.md or AGENTS.md');
    expect(texto).toContain(ORDENES_DEL_AYUDANTE);
    expect(texto).toContain(NUNCA_EL_AYUDANTE);
    expect(texto).toContain('Co-Authored-By: Claude <noreply@anthropic.com>');
    expect(texto).toContain("If a permission is denied, don't work around it");
    expect(texto).toContain('reply in a few lines');
    expect(texto).toContain('The director checks your work against this brief');
  });

  it('el commit, con la firma de publicación del proyecto si la tiene; si no, con git en su carpeta, una orden a la vez', () => {
    expect(encargoDeAyudante(ENCARGO, STUDIO)).toContain('node tools/director/firmar.ts --proyecto stl-studio -m "<message>" -- <paths>');
    const otro = encargoDeAyudante(ENCARGO, { proyecto: 'tienda', carpeta: 'D:/tienda', firma: false });
    expect(otro).toContain('cd D:/tienda, then git add <paths>, then git commit -m "<message>" -- <paths>, each one separately');
    expect(otro).not.toContain('firmar.ts');
  });

  it('las órdenes del ayudante son las del director: lo que se niega es lo mismo', () => {
    // El ayudante hereda los permisos del director: lo que su encargo dice de las órdenes no puede quedarse atrás
    for (const [delDirector, delAyudante] of [['git -C', 'git -C'], ['npx vitest run <archivo>', 'npx vitest run <file>'], ['2>&1', '2>&1'], ['Read, Grep y Glob', 'Read, Grep and Glob'], ['.env', '.env']]) {
      expect(COMO_ORDENES).toContain(delDirector);
      expect(ORDENES_DEL_AYUDANTE).toContain(delAyudante);
    }
    // Y el director sabe que su ayudante no las recibe, y con qué se las da
    expect(COMO_ORDENES).toContain('node tools/director/ayudante.ts');
  });

  it('no se da un encargo a medias: dice lo que le falta', () => {
    expect(faltaEnElEncargo(ENCARGO)).toEqual([]);
    expect(faltaEnElEncargo({})).toHaveLength(4);
    expect(faltaEnElEncargo({ ...ENCARGO, leer: [' ', ''] })).toEqual(['--leer: los archivos que lee primero, separados por comas']);
    expect(faltaEnElEncargo({ ...ENCARGO, origen: '  ' })[0]).toMatch(/^--origen/);
  });

  it('la herramienta lo imprime con el mismo código, y CLAUDE.md la nombra', () => {
    const herramienta = readFileSync(join(__dirname, '../../tools/director/ayudante.ts'), 'utf-8');
    expect(herramienta).toContain('encargoDeAyudante(');
    expect(herramienta).toContain('faltaEnElEncargo(');
    expect(readFileSync(join(__dirname, '../../CLAUDE.md'), 'utf-8')).toContain('tools/director/ayudante.ts');
  });
});
