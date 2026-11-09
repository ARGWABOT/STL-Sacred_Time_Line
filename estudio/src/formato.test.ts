import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { chipNivel, fecha, pct } from './formato';

describe('los formatos de la interfaz, aparte de app.ts (pr_partir_modulos)', () => {
  it('una fecha sin hora es ese día, sin correrse por la zona horaria', () => {
    expect(fecha('2026-10-16')).toBe(new Date(2026, 9, 16).toLocaleDateString('es', { day: 'numeric', month: 'short' }));
  });

  it('el porcentaje se redondea y el chip lleva el nombre de su nivel', () => {
    expect(pct(59.6)).toBe('60 %');
    expect(chipNivel('foco')).toBe('<span class="chip foco">En foco</span>');
  });

  it('app.ts los importa y la vista del esfuerzo vive en su módulo', () => {
    const director = readFileSync(new URL('./app.ts', import.meta.url), 'utf8');
    expect(director).toContain("from './formato';");
    expect(director).not.toMatch(/^const (fecha|pct|chipNivel) = /m);
    expect(director).toContain("import { vistaEsfuerzo } from './vistaEsfuerzo';");
    expect(director).toContain('esfuerzo: () => vistaEsfuerzo(d)');
    expect(director).not.toContain('function vistaEsfuerzo(');
  });
});
