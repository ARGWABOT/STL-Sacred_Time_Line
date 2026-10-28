import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { commitsALaVista, nombraCommit, planSinCommits, sinCommits, type Plan } from './director';

// Los commits son del sistema, no de las personas (nota de voz del titular nmvov99tttit, 26 de octubre de 2026: «no se lo
// presentes al usuario en ninguna de las partes del estudio»)
describe('los commits, fuera de lo que leen las personas', () => {
  it('quita los hashes de commit y deja la frase en pie', () => {
    expect(sinCommits('Lo de sumar ya está (commit local c2572ad): «Corregir» trae «Grabar».')).toBe('Lo de sumar ya está: «Corregir» trae «Grabar».');
    expect(sinCommits('Lo primero ya está, como prioridad (commits locales 0f57d91, 99c68e8 y 8e6346f): el panel.')).toBe('Lo primero ya está, como prioridad: el panel.');
    expect(sinCommits('Las pruebas nuevas (commit local 64d8bcf, de «Pruebas donde fallaron») lo encontraron.')).toBe('Las pruebas nuevas (de «Pruebas donde fallaron») lo encontraron.');
    expect(sinCommits('Quedó en el commit 780e754.')).toBe('Quedó en el commit.');
    expect(sinCommits('Hecho (07462f4).')).toBe('Hecho.');
  });

  it('no toca lo que no es un commit: fechas, colores, cifras, ids ni palabras', () => {
    for (const t of ['El 2026-10-26 a las 06:15', 'el color #2b2826', 'pesa 1234567 bytes', 'pd_corregir_adjuntos', 'decade', 'un commit local, sin hash']) {
      expect(nombraCommit(t)).toBe(false);
      expect(sinCommits(t)).toBe(t);
    }
  });

  it('el Studio recibe el plan sin hashes, en cada texto y sin tocar ids ni estructura', () => {
    const plan = { mensaje: { texto: 'Listo (commit local c2572ad).' }, pedidos: [{ id: 'pd_x', fase: 'f', texto: 'Ya está (commits locales 0f57d91 y 99c68e8).' }], n: 3 };
    expect(planSinCommits(plan)).toEqual({ mensaje: { texto: 'Listo.' }, pedidos: [{ id: 'pd_x', fase: 'f', texto: 'Ya está.' }], n: 3 });
    const servidor = readFileSync(join(__dirname, '..', '..', 'estudio', 'servidor', 'director.ts'), 'utf-8');
    expect(servidor).toContain('plan: planSinCommits(plan),');
  });

  it('--listo no cierra con un hash nuevo escrito para las personas; lo guardado y lo interno no cuentan', () => {
    const guardado = { mensaje: { texto: 'Antes (commit local c2572ad).' }, resumen: { fecha: 'x', avanzamos: ['Vieja (commit local c2572ad)'], quedamos: 'q' } } as unknown as Plan;
    const plan = {
      mensaje: { texto: 'Antes (commit local c2572ad).' },
      resumen: { fecha: 'x', avanzamos: ['Nueva (commit local 780e754)', 'Vieja (commit local c2572ad)'], quedamos: 'q' },
      respuestas: { n1: { cuando: '2026-10-26T07:00:00.000Z', texto: 'Hecho en 07462f4 (commit 07462f4).' }, n0: { cuando: '2026-10-25T07:00:00.000Z', texto: 'Vieja (commit local abc1234).' } },
      pedidos: [{ id: 'pd_x', fase: 'f', texto: 'Sin hash', hecho: { cuando: 'x', nota: 'commit local 07462f4' } }],
      misiones: [],
    } as unknown as Plan;
    expect(commitsALaVista(plan, guardado, '2026-10-26T06:00:00.000Z')).toEqual(['Nueva (commit local 780e754)', 'Hecho en 07462f4 (commit 07462f4).']);
    const bandeja = readFileSync(join(__dirname, '..', '..', 'tools', 'director', 'bandeja.ts'), 'utf-8');
    expect(bandeja).toContain('commitsALaVista(plan, guardado, desde)');
  });
});
