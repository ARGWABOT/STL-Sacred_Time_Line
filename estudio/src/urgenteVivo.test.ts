// Lo urgente, a la vista como una revisión (nota de voz del titular nmvsytu00tit, 28 de octubre de 2026): mientras el
// director atiende una urgencia, la cabecera trae el mismo atajo de «Lo que va haciendo el director», con su historial
// (leído del registro de la urgencia) y un aviso de que atiende una urgencia; y «Detener ahora» se lee sobre el rojo.
// Estas pruebas leen el código y fallan si la urgencia vuelve a quedar solo con su leyenda.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { es } from './textos/es';

const leer = (r: string) => readFileSync(join(__dirname, r), 'utf-8').replace(/\r\n/g, '\n');
const director = leer('app.ts');
const servidor = leer('../servidor/api.ts');
const revisor = leer('../servidor/revisor.ts');
const estilos = leer('estilos.css');

describe('el director atiende lo urgente, con su historial a la vista', () => {
  it('el servidor lee lo que va haciendo en el registro de la urgencia, aparte del de la revisión', () => {
    expect(revisor).toContain("const prefijo = `${proyecto}-${aparte ? `${aparte}-` : ''}`;");
    expect(servidor).toContain("conversacionDeProyecto(raiz, id, 'urgencia')");
    expect(servidor).toContain('conversacionUrgencia: await (async () => {');
  });

  it('la cabecera muestra el atajo y el panel con lo urgente, con su aviso', () => {
    expect(director).toContain("info.hidden = urgente ? false : r.estado !== 'en_curso' || directorEnLinea() !== null;");
    expect(director).toContain("pintarProgreso(r.estado === 'en_curso' || urgente);");
    expect(director).toContain('const conversacion = urgente ? d.conversacionUrgencia : d.conversacion;');
    expect(director).toContain("tx('progreso.urgencia')");
    expect(es['progreso.urgencia']).toContain('Atiende una urgencia: tu nota marcada urgente, aparte de la revisión.');
    expect(director).toContain("atiendeUrgencia() ? tx('segundoPlano.atiendeUrgente')");
    expect(es['segundoPlano.atiendeUrgente']).toBe('El director atiende lo urgente');
  });

  it('«Detener ahora» se lee dentro de la pastilla roja', () => {
    expect(estilos).toMatch(/\.sp-linea \.enlace \{[^}]*color: inherit;[^}]*text-decoration: underline;/);
  });
});
