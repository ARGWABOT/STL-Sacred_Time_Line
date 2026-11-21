// Los plegables recuerdan si los abriste, también cuando cambia su cuenta o la página se repinta (auditoría de la entrega,
// punto 6, nota nmwcebe0otit): una clave que llevaba la cuenta (los pasos hechos, los comentarios de una idea, las ideas
// entendidas, las partes leídas) nacía otra al marcar uno más, y el plegable se cerraba solo; el aviso de errores del plan
// y los <details> de «Salud del Studio» no recordaban nada y se cerraban en cada repintado.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pintarFallas } from './vistaSalud';

const leer = (archivo: string) => readFileSync(join(__dirname, archivo), 'utf-8').replace(/\r\n/g, '\n');

describe('los plegables no se cierran solos (auditoría de la entrega, punto 6)', () => {
  it('ninguna clave de un plegable lleva una cuenta', () => {
    for (const archivo of ['app.ts', 'vistaDocumentos.ts']) {
      const claves = [...leer(archivo).matchAll(/plegable\(`([^`]*)`/g)].map((m) => m[1]);
      expect(claves.length, archivo).toBeGreaterThan(0);
      const conCuenta = claves.filter((c) => /\$\{[^}]*(\.size|\.length|nLeidas|\bn\b)[^}]*\}/.test(c));
      expect(conCuenta, `${archivo}: una clave con su cuenta nace otra al cambiar la cuenta`).toEqual([]);
    }
  });

  it('las claves de los pasos completados, los comentarios de una idea, las ideas entendidas y lo ya leído son fijas', () => {
    const app = leer('app.ts');
    expect(app).toContain('plegable(`pasos|${m.id}`)');
    expect(app).toContain('plegable(`notas-idea|${ruta}|${claveIdea(s.titulo, t.md)}`)');
    expect(app).toContain('plegable(`ideas|${ruta}|${s.titulo}`, actual === undefined)');
    expect(leer('vistaDocumentos.ts')).toContain('plegable(`leido|${ruta}`)');
  });

  it('el aviso de errores del plan recuerda si lo abriste', () => {
    expect(leer('app.ts')).toContain(`<details class="aviso remoto"\${plegable('errores-plan')}>`);
  });

  it('las trazas de «Salud del Studio» y su informe recuerdan si los abriste, y la página les pasa su plegable', () => {
    const abierto = (clave: string) => ` data-recuerda="${clave}" open`;
    const html = pintarFallas([{ causa: 'codigo', n: 2, ultima: { cuando: '2026-11-08T10:00:00.000Z', mensaje: 'TypeError', traza: 'at <a>', tipo: 'carga' } }], abierto);
    expect(html).toContain('<details data-recuerda="salud|traza|codigo" open>');
    // Sin página, como antes: sin recordar nada
    expect(pintarFallas([{ causa: 'codigo', n: 2, ultima: { cuando: '2026-11-08T10:00:00.000Z', mensaje: 'TypeError', traza: '', tipo: 'carga' } }])).toContain('<details><summary>');
    expect(leer('vistaSalud.ts')).toContain("plegable('salud|informe')");
    expect(leer('modelView.ts')).toContain('pintarSalud(datos.salud ?? null, datos.plegable)');
    expect(leer('app.ts')).toContain('plegable: (clave) => plegable(clave),');
  });
});
