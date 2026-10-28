import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import planPlantilla from '../../plantilla/plan.json';
import { estadoVacio, validarEstado, type Plan } from './director';

const plantilla = planPlantilla as unknown as Plan;
const firma = { quien: 'Ana', fecha: '2026-10-24T00:00:00.000Z' };

describe('el cierre no deja pasar un plan que invalida lo que el equipo ya guardó (pd_decision_guardada, 24 de octubre de 2026)', () => {
  it('un plan que quita lo que el equipo ya marcó, respondió o entregó deja inválido su estado', () => {
    const criterio = plantilla.fases[0].criterios[0].id;
    const mision = plantilla.misiones[0].id;
    const e = estadoVacio();
    e.marcas[criterio] = { estado: 'cumplido', ...firma };
    e.entregas = { [mision]: { cuando: firma.fecha, quien: firma.quien } };
    expect(validarEstado(e, plantilla)).toEqual([]);
    // El director quitó el criterio y la misión: cada decisión siguiente del equipo se rechazaría
    const sinEllos: Plan = {
      ...plantilla,
      fases: plantilla.fases.map((f) => ({ ...f, criterios: f.criterios.filter((c) => c.id !== criterio) })),
      misiones: plantilla.misiones.filter((m) => m.id !== mision),
    };
    expect(validarEstado(e, sinEllos)).toHaveLength(2);
  });

  it('--listo valida el estado del equipo contra el plan nuevo, unido con el archivo, como el servidor al guardar cada decisión', () => {
    const bandeja = readFileSync(join(__dirname, '../../tools/director/bandeja.ts'), 'utf-8');
    const listo = bandeja.slice(bandeja.indexOf("if (args.includes('--listo')) {\n  const elegido"), bandeja.indexOf('// ── El arranque: del repositorio a la ruta ──'));
    expect(listo).toContain('const completo = unirArchivo(plan, archivo);');
    expect(listo).toMatch(/const errores = \[\.\.\.validarPlan\(completo, [^\n]*\), \.\.\.validarEstado\(estado, completo\)\];\n  if \(errores\.length\) \{/);
    const servidor = readFileSync(join(__dirname, '../../estudio/servidor/director.ts'), 'utf-8');
    expect(servidor).toContain('const errores = [...validarEstado(unido, plan)');
  });
});
