import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { completasSinEntregar } from '../../estudio/src/avisoMision';
import { huellaDelPaso, huellasDePasos, marcasDesde, pasosMarcadosHoy, pasosVigentes } from './director';

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
    expect(app).toContain("return m ? pasosVigentes(m, marca, d && 'estado' in d ? marcasDesde(d.plan, d.estado, id) : undefined) : marca.hechos;");
    // Una misión que no se puede dibujar no tumba la carga del Studio: lo dice en su tarjeta
    expect(app).toContain("tx('mision.noSePudoDibujar'");
    // Nadie lee las marcas sin pasar por pasosVigentes
    for (const ruta of ['tools/director/bandeja.ts', 'src/director/director.ts', 'estudio/src/app.ts'])
      expect(leer(ruta).match(/estado\.pasos\?\.\[m\.id\]\?\.hechos(?!\.length)/g) ?? []).toEqual([]);
  });
});

// Nota nmwhd8ddytit (15 de noviembre de 2026): tres misiones volvieron para rehacer con el mismo texto en su paso, ahora
// con opciones; su marca de antes seguía valiendo, la tarjeta pedía «Entregar» otra vez y la entrega se fue sin la opción
describe('una misión que vuelve para rehacer no conserva lo marcado antes del veredicto', () => {
  const m = { id: 't_x', pasos: [{ texto: 'Elige', opciones: ['A', 'B'] }] };
  const veredicto = '2026-11-14T20:20:00.000Z';
  const plan = { revisiones: { t_x: { cuando: veredicto, veredicto: 'rehacer' as const, comentario: 'Vuelve' } } };
  const marca = (cuando: string) => ({ t_x: { hechos: [0], cuando, quien: 'leonc', huellas: huellasDePasos(m, [0]) } });

  it('lo marcado antes del veredicto no vale: la misión vuelve con su paso abierto y no se entrega sola', () => {
    const estado = { entregas: { t_x: { cuando: '2026-11-14T20:05:00.000Z', quien: 'leonc' } }, pasos: marca('2026-11-14T20:05:00.000Z') };
    expect(marcasDesde(plan, estado, 't_x')).toBe(veredicto);
    expect(pasosMarcadosHoy(m, plan, estado)).toEqual([]);
    // Lo que entrega sola la página (avisoMision.ts › completasSinEntregar) no la ve completa
    expect(completasSinEntregar([m], (id) => pasosMarcadosHoy({ ...m, id }, plan, estado))).toEqual([]);
  });

  it('lo marcado después vale, y al marcar el último paso se entrega sola, sin ventana', () => {
    const estado = { entregas: { t_x: { cuando: '2026-11-14T20:05:00.000Z', quien: 'leonc' } }, pasos: marca('2026-11-15T04:58:00.000Z') };
    expect(pasosMarcadosHoy(m, plan, estado)).toEqual([0]);
    expect(completasSinEntregar([m], (id) => pasosMarcadosHoy({ ...m, id }, plan, estado))).toEqual(['t_x']);
    const app = readFileSync(join(process.cwd(), 'estudio/src/app.ts'), 'utf8');
    expect(app).toContain("['pendiente', 'en_curso', 'rehacer'].includes(estadoMision(m, d.plan, d.estado)));\n  const sueltas = completasSinEntregar");
  });

  it('entregada otra vez después del veredicto, o aprobada, sus marcas valen como siempre', () => {
    const despues = { entregas: { t_x: { cuando: '2026-11-15T05:00:00.000Z', quien: 'leonc' } }, pasos: marca('2026-11-14T20:05:00.000Z') };
    expect(marcasDesde(plan, despues, 't_x')).toBeUndefined();
    expect(pasosMarcadosHoy(m, plan, despues)).toEqual([0]);
    const aprobada = { revisiones: { t_x: { ...plan.revisiones.t_x, veredicto: 'aprobada' as const } } };
    expect(pasosMarcadosHoy(m, aprobada, { entregas: {}, pasos: marca('2026-11-14T20:05:00.000Z') })).toEqual([0]);
  });
});
