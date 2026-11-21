// Los valores que citan las reglas y el método, iguales a los del código (propuesta aceptada «El director lee la fuente al
// día», pr_fuentes_al_dia, punto 4): si el código cambia uno, esta prueba falla hasta que CLAUDE.md, AGENTS.md y la
// metodología, en sus dos idiomas, digan el valor nuevo. Así el director nunca lee una regla con un número viejo.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GRACIA_CIERRE_MIN } from '../../estudio/servidor/revisor.ts';
import { MAX_MIN_REVISION, RESERVA_MINIMA, TOPE_MIN_TRAMO } from './director.ts';

const leer = (...ruta: string[]) => readFileSync(join(__dirname, '..', '..', ...ruta), 'utf-8').replace(/\r\n/g, '\n');
const EN = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const ES = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce'];

describe('los valores que citan las reglas y el método, iguales a los del código (pr_fuentes_al_dia, punto 4)', () => {
  it('la reserva de misiones: la de ahora y las que van detrás', () => {
    const detras = RESERVA_MINIMA - 1;
    expect(leer('CLAUDE.md')).toContain(`at least ${EN[detras]} more behind** (${EN[RESERVA_MINIMA]} in total, \`RESERVA_MINIMA\`)`);
    expect(leer('AGENTS.md')).toContain(`at least ${EN[detras]} more behind it (${EN[RESERVA_MINIMA]} in total, \`RESERVA_MINIMA\`)`);
    expect(leer('docs', 'metodo', 'metodologia.md')).toContain(`at least ${EN[detras]} more behind it`);
    expect(leer('docs', 'metodo', 'metodologia.md')).toContain(`with ${EN[RESERVA_MINIMA]} within reach`);
    expect(leer('docs', 'metodo', 'metodologia.es.md')).toContain(`al menos ${ES[detras]} más detrás`);
    expect(leer('docs', 'metodo', 'metodologia.es.md')).toContain(`con ${ES[RESERVA_MINIMA]} a su alcance`);
  });

  it('el límite de cada revisión: el que estima el director y el de siempre', () => {
    const reglas = leer('CLAUDE.md');
    expect(reglas).toContain(`\`tramo.minutos\`, ${MAX_MIN_REVISION} to ${TOPE_MIN_TRAMO}, if what comes next is a long execution; without it, ${MAX_MIN_REVISION}.`);
  });

  it('cuánto espera el Studio a un director que sigue vivo después de su cierre', () => {
    expect(leer('CLAUDE.md')).toContain(`The Studio stops a director still alive ${GRACIA_CIERRE_MIN} minutes after its closing.`);
  });
});
