// La línea del último respaldo al pie de la barra (pieRespaldo.ts; pedido pd_sin_modo_equipo): sus tres estados, a dónde
// lleva un clic, y que «quién usa el Studio» y la sincronización ya no están.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { EstadoRespaldo } from '../servidor/respaldo';
import { clicDeRespaldo, haceCuanto, lineaDeRespaldo } from './pieRespaldo';
import { bloqueRespaldo } from './vistaProyecto';
import { ponerIdioma } from './textos';

const AHORA = Date.parse('2026-11-13T16:00:00.000Z');
const r_ = (x: Partial<EstadoRespaldo>): EstadoRespaldo => ({ fase: 'al_dia', rama: 'stl', destino: 'ana/memoria', ...x });
const r = (x: Partial<EstadoRespaldo>): EstadoRespaldo => ({ fase: 'al_dia', rama: 'stl', destino: 'ana/memoria', ...x });

describe('la línea del último respaldo', () => {
  afterEach(() => ponerIdioma('es'));

  it('dice cuándo subió el último, en verde, y un clic abre la ventanita con «Back up now» (nmwdur1ejtit, nmwf5n02utit)', () => {
    ponerIdioma('en');
    const al = r({ cuando: '2026-11-13T15:57:00.000Z' });
    expect(lineaDeRespaldo(al, AHORA)).toMatchObject({ texto: '↑ Last backup · 3 min ago', clase: 'al_dia' });
    const c = clicDeRespaldo(al, AHORA);
    expect(c).toMatchObject({ que: 'ventana', titulo: 'Last backup', respaldar: true });
    expect(c.que === 'ventana' && c.texto).toContain('To ana/memoria, branch «stl».');
    expect(lineaDeRespaldo(r({ fase: 'nunca' }), AHORA)).toMatchObject({ texto: '↑ Not backed up yet', clase: 'al_dia' });
  });

  it('«No backup», en el aviso suave: sin repositorio lleva a «Where it is», sin permiso a «Permissions» (nmwdxv033tit)', () => {
    ponerIdioma('en');
    const sinRepo = r({ fase: 'sin_respaldo', motivo: 'sin_repositorio' });
    expect(lineaDeRespaldo(sinRepo, AHORA)).toMatchObject({ texto: '⚠ No backup', clase: 'atencion' });
    expect(clicDeRespaldo(sinRepo)).toMatchObject({ que: 'ir', destino: { vista: 'proyecto', ancla: 'p-repositorio' } });
    expect(clicDeRespaldo(r({ fase: 'sin_respaldo', motivo: 'sin_permiso' }))).toMatchObject({ que: 'ir', destino: { vista: 'modelo', ancla: 'm-permisos' } });
    // Público: no sube, y la ventanita dice por qué, sin «Back up now» (nmwf5lg39tit)
    const publico = clicDeRespaldo(r({ fase: 'sin_respaldo', motivo: 'publico' }));
    expect(publico).toMatchObject({ que: 'ventana', respaldar: false });
    expect(publico.que === 'ventana' && publico.texto).toContain('is public');
  });

  it('la memoria del Studio sin su dirección privada lo dice con su nombre, y un clic lleva a ponerla (pd_respaldo_direccion)', () => {
    const sinDireccion = r({ fase: 'sin_respaldo', motivo: 'del_studio' });
    expect(lineaDeRespaldo(sinDireccion, AHORA)).toMatchObject({ texto: '⚠ Respaldo sin dirección', clase: 'atencion' });
    expect(clicDeRespaldo(sinDireccion)).toMatchObject({ que: 'ir', destino: { vista: 'proyecto', ancla: 'p-repositorio' } });
    ponerIdioma('en');
    expect(lineaDeRespaldo(sinDireccion, AHORA)?.texto).toBe('⚠ Backup has no address');
  });

  it('«Backup failed», en el mismo color, y un clic dice el motivo y cómo arreglarlo (nmwemu30ktit)', () => {
    ponerIdioma('en');
    const fallo = r({ fase: 'fallo', causa: 'sesion', cuando: '2026-11-12T16:00:00.000Z' });
    expect(lineaDeRespaldo(fallo, AHORA)).toMatchObject({ texto: '⚠ Backup failed', clase: 'atencion' });
    const c = clicDeRespaldo(fallo, AHORA);
    expect(c.que === 'ventana' && c.texto).toContain('gh auth login');
    expect(c.que === 'ventana' && c.texto).toContain('1 days ago');
  });

  it('en español también, y sin proyecto no hay línea', () => {
    expect(lineaDeRespaldo(r({ fase: 'fallo', causa: 'sin_red' }))?.texto).toBe('⚠ El respaldo falló');
    expect(haceCuanto('2026-11-13T13:00:00.000Z', AHORA)).toBe('hace 3 h');
    expect(lineaDeRespaldo(null)).toBeNull();
  });

  it('el pie ya no dice quién usa el Studio ni trae GitHub (nmwds7lxytit, nmwds7825tit)', () => {
    const html = readFileSync(join(__dirname, '..', '..', 'index.html'), 'utf8');
    expect(html).not.toContain('id="quien"');
    const app = readFileSync(join(__dirname, 'app.ts'), 'utf8');
    expect(app).not.toMatch(/function pintarQuien|function pintarSincronizacion|sync\.trayendo/);
    // La ventanita sin nada que respaldar tiene un solo botón, «Close» (no dos iguales)
    expect(app).toContain('soloAviso: !c.respaldar');
    expect(readFileSync(join(__dirname, 'modal.ts'), 'utf8')).toContain("${o.soloAviso ? '' : `<button type=\"button\" data-no>");
    const api = readFileSync(join(__dirname, '..', 'servidor', 'api.ts'), 'utf8');
    expect(api).not.toMatch(/new Traedor|\.traer\(/);
  });

  it('el código del equipo que ya no sirve se fue: sin alta ni baja de integrantes, sin subir cada decisión, sin el selector «Ver como» (pd_sin_modo_equipo)', () => {
    const api = readFileSync(join(__dirname, '..', 'servidor', 'api.ts'), 'utf8');
    expect(api).not.toContain("case 'integrante'");
    expect(api).not.toContain("case 'quitar_integrante'");
    expect(api).not.toContain("case 'sincronizar'");
    // También salió «tus idiomas» (nmwo4ffkwtit): se escribe solo en el idioma elegido en el Studio
    expect(api).not.toContain("case 'idiomas_integrante'");
    expect(readFileSync(join(__dirname, '..', 'servidor', 'sincronizar.ts'), 'utf8')).not.toContain('commitEncima');
    expect(readFileSync(join(__dirname, 'equipo.ts'), 'utf8')).not.toContain('montarSelector');
  });
});

describe('el respaldo en «Proyecto» › «Dónde está»', () => {
  afterEach(() => ponerIdioma('es'));

  it('en STL Studio, la dirección de su repositorio privado; en los demás, el interruptor de público con su aviso (nmwfl2c3ltit, nmwf5lg39tit)', () => {
    ponerIdioma('en');
    const r = { ruta: 'C:/x', info: null, error: null };
    const studio = bloqueRespaldo({ ...r, respaldoDelStudio: 'https://github.com/ana/stl-memoria' }, true);
    expect(studio).toContain('Private repository for this memory');
    expect(studio).toContain('id="form-respaldo-segunda"');
    expect(studio).toContain('value="https://github.com/ana/stl-memoria"');
    expect(studio).not.toContain('data-respaldo-publico');
    const otro = bloqueRespaldo({ ...r, respaldoPublico: true }, false);
    expect(otro).toContain('Back up to a public repository');
    expect(otro).toContain('visible to anyone on the internet');
    expect(otro).toMatch(/data-respaldo-publico checked/);
    expect(bloqueRespaldo(r, false)).not.toContain('checked');
    // «No backup» en el Studio lleva a conectar su repositorio privado
    expect(clicDeRespaldo(r_({ fase: 'sin_respaldo', motivo: 'del_studio' }))).toMatchObject({ que: 'ir', destino: { vista: 'proyecto', ancla: 'p-repositorio' } });
  });
});
