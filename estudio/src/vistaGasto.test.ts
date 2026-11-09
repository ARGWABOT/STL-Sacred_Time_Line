// La pestaña «Lo que gasta», en su módulo (propuesta aceptada pr_partir_modulos): recibe lo que pinta y la página le da
// lo que depende de ella, así que se prueba con datos hechos a mano, sin la página.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { seccionGasto, type DatosGasto, type Lanzamiento } from './vistaGasto';

const AHORA = new Date('2026-10-29T19:00:00.000Z');
const lanzamiento = (x: Partial<Lanzamiento> = {}): Lanzamiento => ({
  cuando: '2026-10-29T18:00:00.000Z', proyecto: 'stl-studio', tipo: 'revision', modelo: 'claude-opus-5-5', entrada: 1000, cache: 20_000, salida: 3000,
  limites: { cincoHoras: { uso: 40, renueva: '2026-10-29T22:00:00.000Z' }, semana: { uso: 12, renueva: '2026-10-28T00:00:00.000Z' } },
  ...x,
});
const datos = (x: Partial<DatosGasto> = {}): DatosGasto => ({
  consumo: [], medida: [], ahora: AHORA,
  nombreProyecto: (id) => (id === 'stl-studio' ? 'STL Studio' : id),
  plegable: (clave) => ` data-recuerda="${clave}"`,
  ...x,
});

describe('«Lo que gasta», aparte de app.ts (pr_partir_modulos)', () => {
  it('sin lanzamientos lo dice, con las dos tarjetas y sus anclas', () => {
    const html = seccionGasto(datos());
    expect(html).toContain('data-ancla="m-limites"');
    expect(html).toContain('data-ancla="m-consumo"');
    expect(html).toContain('Todavía no hay lanzamientos del director en este computador.');
    expect(html).toContain('míralos en Claude Code con <code>/usage</code>');
  });

  it('las cifras de hoy y de la semana, con los permisos negados; y los límites, con el que ya se renovó', () => {
    const html = seccionGasto(datos({ consumo: [lanzamiento({ negados: ['Bash: git push'] })] }));
    expect(html).toContain('1 lanzamiento · 24 mil tokens');
    expect(html).toContain('1 permiso negado');
    expect(html).toContain('<b>40 % usado</b>');
    expect(html).toContain('<b>Renovado</b>');
  });

  it('la lista de cada lanzamiento se fue: cada revisión se consulta en la línea en grande (nmvznzcnstit)', () => {
    const html = seccionGasto(datos({ consumo: [lanzamiento()] }));
    expect(html).not.toContain('consumo-lista');
    expect(html).not.toContain('consumo-lanzamientos');
    expect(html).not.toContain('Cada lanzamiento');
    expect(html).toContain('la línea en grande');
    // Y lo que solo le servía a ella
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8');
    const api = readFileSync(new URL('../servidor/api.ts', import.meta.url), 'utf8');
    const revisor = readFileSync(new URL('../servidor/revisor.ts', import.meta.url), 'utf8');
    expect(app).not.toContain('data-ver-conversacion');
    expect(api).not.toContain("ruta === '/paquete'");
    expect(revisor).not.toMatch(/SinTerminar|PaqueteDeConsumo|paqueteDe\(/);
  });

  it('lo gastado va en tokens y en la parte de tu semana, aproximada; sin dinero y sin el selector del plan (nmvxx61ictit)', () => {
    const conSemana = lanzamiento({ semana: { desde: 10, hasta: 12, renueva: 'v1' } });
    const html = seccionGasto(datos({ consumo: [conSemana] }));
    expect(html).toContain('≈ 2 % de tu semana, aproximado');
    expect(html).toContain('24 mil tokens');
    expect(html).not.toMatch(/US\$|d[oó]lar|precio|clave de API/i);
    expect(html).not.toContain('data-plan-claude');
    // Lo guardado y su ruta siguen: los usará el asistente de instalación
    const api = readFileSync(new URL('../servidor/api.ts', import.meta.url), 'utf8');
    expect(api).toContain("ruta === '/plan-de-claude'");
    expect(api).toContain('planDeClaude: (await leerLocal(raiz)).planDeClaude ?? null');
  });

  it('la medida del director va como tabla', () => {
    const html = seccionGasto(datos({
      medida: [{ cuando: '2026-10-29T18:00:00.000Z', cerro: true, tokens: 7, tiempos: { modeloMs: 1_500_000, computadorMs: 300_000, ayudanteMs: 0, pruebas: [{ orden: 'npm test', ms: 50_000, fallo: true }] }, talCual: 3, cambiadas: 1, rehacer: 0, aclaraciones: 0 } as DatosGasto['medida'][number]],
    }));
    // Lo que queda sin límite: cuánto tardó cada uno, y cada corrida de pruebas al pasar el ratón
    expect(html).toContain('title="npm test: 50 s (falló)">25 min / 5 min</td>');
    expect(html).toContain('class="tabla-medida"');
    expect(html).toContain('<td class="hay">1</td>');
  });
});
