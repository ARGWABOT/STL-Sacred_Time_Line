import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Destino } from '../../src/director/director';
import { arranqueHTML, type DatosArranque } from './startSteps';

const boton = (dest: Destino) => `<button data-ir="${dest.ancla ?? ''}">${dest.etiqueta}</button>`;
const datos = (x: Partial<DatosArranque>): DatosArranque => ({ arranque: 'conectar', nuevo: false, conectado: false, diagnosticado: false, conMeta: false, conRuta: false, botonIr: boton, ...x });

describe('el arranque en «Hoy», en su propio módulo (pr_partir_modulos)', () => {
  it('en marcha no pinta nada', () => {
    expect(arranqueHTML(datos({ arranque: 'en_marcha' }))).toBe('');
  });

  it('un proyecto existente empieza por entregar el repositorio, con su botón solo en el paso de ahora', () => {
    const html = arranqueHTML(datos({}));
    expect(html).toContain('El arranque · del repositorio a la ruta');
    expect(html).toContain('<li class="actual" aria-current="step"><span class="num-a">1</span><div><b>Entrega el repositorio</b>');
    expect(html).toContain('<button data-ir="p-repositorio">Ir a Proyecto</button>');
    expect(html.match(/<button/g)).toHaveLength(1);
  });

  it('uno nuevo se cuenta y se plantea; lo hecho lleva su ✓ y el botón va al paso de ahora', () => {
    const html = arranqueHTML(datos({ nuevo: true, arranque: 'objetivo', diagnosticado: true }));
    expect(html).toContain('El arranque · de la idea a la ruta');
    expect(html).toContain('<li class="hecho"><span class="num-a">✓</span><div><b>Cuenta el proyecto</b>');
    expect(html).toContain('<li class="hecho"><span class="num-a">✓</span><div><b>El planteamiento</b>');
    expect(html).toContain('<li class="actual" aria-current="step"><span class="num-a">3</span><div><b>Fija tu meta</b>');
    expect(html).toContain('<button data-ir="p-objetivo">Ir a la meta</button>');
  });

  it('app.ts ya no lo pinta: le da sus datos al módulo', () => {
    const director = readFileSync(join(__dirname, 'app.ts'), 'utf-8');
    expect(director).not.toContain("const orden: EtapaArranque[] = [nuevo ? 'contar' : 'conectar', 'diagnostico', 'objetivo', 'ruta'];");
    expect(director).toContain("import { arranqueHTML as arranqueDe } from './startSteps';");
    expect(director).toContain('return arranqueDe({');
  });
});
