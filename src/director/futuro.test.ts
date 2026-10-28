import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { misionesDeFuturo, type Mision, type Plan } from './director';

// Nunca se pregunta por lo que aún no pasó (nota de voz del titular nmvptrd58tit, 26 de octubre de 2026: «no puedes
// asignar misiones […] en la cual le preguntes al usuario si ya sucedió dentro de un entorno que él no va a poder
// verificar»)
const mision = (id: string, pasos: Mision['pasos'], titulo = 'Mira algo'): Mision =>
  ({ id, para: 'titular', fase: 'f', frente: 'x', titulo, porQue: 'p', pasos, entrega: 'e', xp: 10 }) as Mision;

describe('las misiones no preguntan por lo que aún no pasó', () => {
  it('--listo no cierra con una pregunta nueva sobre la próxima revisión o la próxima vez', () => {
    const plan = {
      misiones: [
        mision('a', [{ texto: 'En tu próxima revisión, usa «Permitir siempre». ¿Qué pasó?', opciones: ['Lo usé', 'No'] }]),
        mision('b', [{ texto: 'La próxima vez que me dejes una nota de voz larga, mira cómo termina. ¿Cómo terminó?' }]),
        mision('c', [{ texto: 'En la revisión siguiente, el diálogo vuelve.', opciones: ['Fue así'] }]),
        mision('d', [], 'Prueba algo en tu próxima revisión'),
      ],
    } as unknown as Plan;
    expect(misionesDeFuturo(plan, null).map((f) => f.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('lo que se ve ahora, lo que solo informa del futuro sin preguntar, lo ya guardado y lo entregado no cuentan', () => {
    const vieja = mision('v', [{ texto: 'En tu próxima revisión, mira. ¿Qué pasó?', opciones: ['Bien'] }]);
    const plan = {
      misiones: [
        mision('ahora', [{ texto: 'Abre la ventana del modo enfoque y achícala. ¿Se desplaza de lado?', opciones: ['No', 'Sí'] }]),
        mision('informa', [{ texto: 'Con tu «Autorizo», lo hago en la revisión siguiente.' }]),
        vieja,
        mision('entregada', [{ texto: 'La próxima vez, mira. ¿Pasó?', opciones: ['Sí'] }]),
      ],
    } as unknown as Plan;
    expect(misionesDeFuturo(plan, { misiones: [vieja] } as Plan, new Set(['entregada']))).toEqual([]);
    const bandeja = readFileSync(join(__dirname, '..', '..', 'tools', 'director', 'bandeja.ts'), 'utf-8');
    expect(bandeja).toContain('misionesDeFuturo(plan, guardado)');
  });
});
