// La tabla de modelos (pr_modelos_por_tarea, punto 1; opción B del titular, 28 de octubre de 2026): cada modelo con su
// ficha, los alias al más nuevo de su familia, y el aviso cuando un modelo no está o la tabla quedó vieja.
import { describe, expect, it } from 'vitest';
import { avisoDelInventario, DIAS_PARA_AVISO, diasDelInventario, fichaDe, INVENTARIO, INVENTARIO_EN_EL_ENCARGO, modeloDelInventario, ventanaDe } from './modelos';
import { VENTANAS } from './dosTiempos';

const dias = (n: number) => new Date(Date.parse(`${INVENTARIO.fecha}T00:00:00Z`) + n * 86_400_000);

describe('la tabla de modelos', () => {
  it('trae su fecha, su fuente y, de cada modelo, para qué lo recomienda Anthropic, su precio y su contexto', () => {
    expect(INVENTARIO.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(INVENTARIO.fuente).toMatch(/anthropic/i);
    for (const m of INVENTARIO.modelos) {
      expect(m.para.length).toBeGreaterThan(20);
      expect(m.precio.entrada).toBeGreaterThan(0);
      expect(m.precio.salida).toBeGreaterThan(m.precio.entrada);
      expect(m.contexto).toBeGreaterThanOrEqual(200_000);
    }
    expect(new Set(INVENTARIO.modelos.map((m) => m.id)).size).toBe(INVENTARIO.modelos.length);
  });

  it('encuentra un modelo por su id, sin «[1m]» ni fecha, y cada alias apunta al más nuevo de su familia', () => {
    expect(modeloDelInventario('claude-opus-5-5[1m]')?.nombre).toBe('Opus 5.5');
    expect(modeloDelInventario('claude-sonnet-5-5-20261001')?.nombre).toBe('Sonnet 5.5');
    expect(modeloDelInventario('haiku')?.id).toBe('claude-haiku-5-5');
    expect(modeloDelInventario('opus')?.id).toBe('claude-opus-5-5');
    expect(modeloDelInventario('claude-opus-9-9')).toBeNull();
    expect(modeloDelInventario('')).toBeNull();
    expect(modeloDelInventario(null)).toBeNull();
  });

  it('las ventanas de los dos tiempos salen de la tabla, con la que da Claude Code', () => {
    expect(VENTANAS.haiku).toBe(ventanaDe(modeloDelInventario('haiku')!));
    expect(VENTANAS.haiku).toBe(200_000);
    expect(VENTANAS.sonnet).toBe(ventanaDe(modeloDelInventario('sonnet')!));
  });

  it('avisa cuando el modelo elegido no está en la tabla', () => {
    expect(avisoDelInventario('claude-opus-9-9', dias(1))).toContain('«claude-opus-9-9» no está en la tabla');
    expect(avisoDelInventario('claude-opus-5-5[1m]', dias(1))).toBeNull();
    expect(avisoDelInventario('', dias(1))).toBeNull();
    expect(avisoDelInventario(null, dias(1))).toBeNull();
  });

  it(`avisa cuando la tabla pasa de ${DIAS_PARA_AVISO} días, también sin modelo elegido`, () => {
    expect(diasDelInventario(dias(DIAS_PARA_AVISO))).toBe(DIAS_PARA_AVISO);
    expect(avisoDelInventario('opus', dias(DIAS_PARA_AVISO))).toBeNull();
    expect(avisoDelInventario('opus', dias(DIAS_PARA_AVISO + 1))).toContain(`hace ${DIAS_PARA_AVISO + 1} días`);
    expect(avisoDelInventario(null, dias(DIAS_PARA_AVISO + 1))).toContain('La tabla de modelos del Studio es del');
    const los2 = avisoDelInventario('otro', dias(DIAS_PARA_AVISO + 1))!;
    expect(los2).toContain('«otro» no está');
    expect(los2).toContain('días');
  });

  it('la línea del encargo la trae entera, sin la fecha de hoy', () => {
    for (const m of INVENTARIO.modelos) expect(INVENTARIO_EN_EL_ENCARGO).toContain(fichaDe(m));
    expect(INVENTARIO_EN_EL_ENCARGO).toContain(INVENTARIO.fecha);
  });
});
