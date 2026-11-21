// Nota nmwdx5z4gtit (12 de noviembre de 2026): la revisión de otro proyecto terminó hacía rato, y al cambiar a él la voz de
// «¿Dónde quedamos?» aún se estaba preparando. Toda revisión que cierra, sea o no del activo, prepara su voz al instante.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const app = readFileSync(join(process.cwd(), 'estudio/src/app.ts'), 'utf8');
const api = readFileSync(join(process.cwd(), 'estudio/servidor/api.ts'), 'utf8');
const desde = (texto: string, marca: string, largo = 1500) => texto.slice(texto.indexOf(marca), texto.indexOf(marca) + largo);

describe('la voz de una revisión que cierra en otro proyecto (nmwdx5z4gtit)', () => {
  it('al ver que cerró, la página prepara su «¿Dónde quedamos?» sin esperar a que cambies a ese proyecto', () => {
    expect(desde(app, 'if (otraCerrada) {', 300)).toContain('prepararDondeQuedamosDe(otraCerrada.proyecto)');
  });

  it('pide los datos de ese proyecto aparte, arma su caja como al abrirlo y deja los de la página como estaban', () => {
    const f = desde(app, 'async function prepararDondeQuedamosDe(');
    expect(f).toContain('/__estudio/director?proyecto=${encodeURIComponent(proyecto)}');
    // Con su propia memoria: la de la página no se mezcla con la del otro proyecto
    expect(f).toContain('unirConsulta(await r.json(), new Map())');
    expect(f).toMatch(/const propio = d;[\s\S]*d = otro;\s*caja = cajaDondeQuedamos\(\);[^}]*?(\{[^}]*\})?[^}]*\} finally \{\s*d = propio;/);
    expect(f).toContain('prepararDeAntemano([caja]);');
    // Y cada misión tuya allí, entera, con su idioma: lo que vas a encontrar al llegar (nmwkx0ajmtit, nmwlak8zbtit)
    expect(f).toContain('misiones.push({ cajas: [tarjetaMision(m, false, 1), ...pasosPorVenir(m)], idioma: idiomaDeMision(m) });');
    expect(f).toContain('for (const m of misiones) prepararDeAntemano(m.cajas, false, false, m.idioma);');
  });

  it('el servidor da los datos de un proyecto registrado sin cambiar el activo', () => {
    expect(api).toContain("const otro = url.searchParams.get('proyecto');");
    expect(api).toContain('const id = otro && (await listarIds()).includes(otro) ? otro : await activo();');
  });
});
