import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { huellaDelPaso, huellasDePasos, pasosVigentes } from './director';

// El 9 de noviembre de 2026 el Studio no cargaba («Cannot read properties of undefined (reading 'texto')»): t_instalar_windows
// tenía marcados 3 pasos de los 5 que tenía el 2 de noviembre, y el 7 el director la reescribió con 2
describe('las marcas de los pasos valen solo para los pasos de hoy', () => {
  const antes = { pasos: ['Baja el paquete', 'Descomprímelo', 'Abre la guía', 'Instala', 'Cuéntame'] };
  const ahora = { pasos: ['Instala en un Windows limpio', { texto: 'Dime hasta dónde llegaste' }] };

  it('una marca de antes de las huellas que cae fuera de la misión dice que se reescribió: ninguna vale', () => {
    expect(pasosVigentes(ahora, { hechos: [0, 1, 2] })).toEqual([]);
    // Todas dentro: valen, como siempre
    expect(pasosVigentes(antes, { hechos: [0, 1, 2] })).toEqual([0, 1, 2]);
    expect(pasosVigentes(ahora, undefined)).toEqual([]);
  });

  it('con su huella, vale solo la marca de un paso cuyo texto sigue igual', () => {
    const marca = { hechos: [0, 1, 2], huellas: huellasDePasos(antes, [0, 1, 2]) };
    expect(pasosVigentes(antes, marca)).toEqual([0, 1, 2]);
    // Reescrita con menos pasos: los de antes no se ven hechos en los nuevos
    expect(pasosVigentes(ahora, marca)).toEqual([]);
    // Reescrita cambiando solo el paso 2 (los espacios de más no cuentan)
    const editada = { pasos: ['Baja  el paquete', 'Descomprímelo', 'Abre la guía de instalación', 'Instala', 'Cuéntame'] };
    expect(pasosVigentes(editada, marca)).toEqual([0, 1]);
    expect(huellaDelPaso({ texto: 'Instala' })).toBe(huellaDelPaso('Instala'));
  });

  it('el servidor guarda la huella al marcar, y la página, la bandeja y el núcleo leen solo las marcas vigentes', () => {
    const leer = (ruta: string) => readFileSync(join(process.cwd(), ruta), 'utf8');
    expect(leer('estudio/servidor/api.ts')).toContain('huellas: huellasDePasos(m, hechos)');
    const app = leer('estudio/src/app.ts');
    expect(app).toContain('return m ? pasosVigentes(m, marca) : marca.hechos;');
    // Una misión que no se puede dibujar no tumba la carga del Studio: lo dice en su tarjeta
    expect(app).toContain("tx('mision.noSePudoDibujar'");
    // Nadie lee las marcas sin pasar por pasosVigentes
    for (const ruta of ['tools/director/bandeja.ts', 'src/director/director.ts', 'estudio/src/app.ts'])
      expect(leer(ruta).match(/estado\.pasos\?\.\[m\.id\]\?\.hechos(?!\.length)/g) ?? []).toEqual([]);
  });
});
