import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CASOS_FIJOS, GRUPOS_DE_CASOS } from './casosFijos';

// Los casos fijos del núcleo (pr_nucleo_medido, punto 2), como los aprobó el titular el 26 de octubre de 2026 en «Los
// errores del director que no deben repetirse»: los 17, y los once que el código ya impide se quedan para medir que esa
// barrera siga en pie
const RAIZ = join(__dirname, '..', '..');

describe('los casos fijos del director', () => {
  it('son los 17 aprobados y los que señaló el titular después, en sus tres grupos, cada uno con su id', () => {
    expect(CASOS_FIJOS).toHaveLength(18);
    expect(new Set(CASOS_FIJOS.map((c) => c.id)).size).toBe(18);
    const enGrupo = (g: keyof typeof GRUPOS_DE_CASOS) => CASOS_FIJOS.filter((c) => c.grupo === g).length;
    expect([enGrupo('orden'), enGrupo('pasos'), enGrupo('proceso')]).toEqual([6, 5, 7]);
    for (const c of CASOS_FIJOS) {
      expect(c.id, c.id).toMatch(/^c_[a-z_]+$/);
      expect(c.titulo.trim() && c.cuando.trim() && c.debe.trim(), c.id).toBeTruthy();
    }
  });

  it('doce ya los impide el código y seis los vigila a medias; lo que no comprueba el código lo califica una pauta', () => {
    expect(CASOS_FIJOS.filter((c) => c.toda)).toHaveLength(12);
    expect(CASOS_FIJOS.filter((c) => !c.toda && c.barreras.length)).toHaveLength(6);
    for (const c of CASOS_FIJOS) {
      if (c.toda) expect(c.barreras.length, c.id).toBeGreaterThan(0);
      else expect(c.pauta?.trim(), `${c.id} necesita su pauta`).toBeTruthy();
    }
  });

  it('cada barrera sigue en pie: su archivo existe y exporta lo que la impide', () => {
    for (const c of CASOS_FIJOS)
      for (const { archivo, nombre } of c.barreras) {
        const ruta = join(RAIZ, archivo);
        expect(existsSync(ruta), `${c.id}: no está ${archivo}`).toBe(true);
        expect(readFileSync(ruta, 'utf-8'), `${c.id}: ${archivo} ya no exporta ${nombre}`).toMatch(new RegExp(`export (?:async )?(?:const|function|interface|type) ${nombre}\\b`));
      }
  });
});
