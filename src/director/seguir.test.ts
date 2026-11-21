import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { misionesQuePidenSeguir, type Mision, type Plan } from './director';

// La cola autorizada no se vuelve a preguntar (nota de voz del titular nmvqvu1sctit, 27 de octubre de 2026, después de tres
// misiones seguidas que solo pedían su visto bueno para seguir: «no me detengas cada vez que completas una parte de la
// cola si no es absolutamente necesario que yo intervenga… ya yo lo autoricé en completo»)
const mision = (id: string, pasos: Mision['pasos'], titulo = 'Mira algo', entrega = 'Lo que viste'): Mision =>
  ({ id, para: 'titular', fase: 'f', frente: 'direccion', titulo, porQue: 'p', pasos, entrega, xp: 10 }) as Mision;

const autorizada = { cuando: '2026-10-27T16:10:53.196Z', nota: 'nmvqvu1sctit' };

describe('la cola autorizada no se vuelve a preguntar', () => {
  it('con la cola autorizada, --listo no cierra con una misión nueva que pide permiso para seguir', () => {
    const plan = {
      colaAutorizada: autorizada,
      misiones: [
        mision('tramo', [{ texto: 'Mira mi cola. ¿Sigo con ella así?', opciones: ['Sí, sigue así', 'Antes, otra cosa'] }], 'Lanza el tramo que sigue de mi cola'),
        mision('visto', [{ texto: 'Abre «Lo que sigue».' }], 'Mira mi cola', 'Tu visto bueno para seguir con mi cola'),
        mision('pregunta', [{ texto: 'Mira lo que hice. ¿Sigo con mi cola?' }]),
      ],
    } as unknown as Plan;
    expect(misionesQuePidenSeguir(plan, null).map((f) => f.id)).toEqual(['tramo', 'visto', 'pregunta']);
    const bandeja = readFileSync(join(__dirname, '..', '..', 'tools', 'director', 'bandeja.ts'), 'utf-8');
    expect(bandeja).toContain('misionesQuePidenSeguir(plan, guardado)');
  });

  it('sin la cola autorizada, la primera aprobación sí se pide; y lo que no pide seguir, lo guardado y lo entregado no cuentan', () => {
    const tramo = mision('tramo', [{ texto: '¿Sigo con ella así?', opciones: ['Sí'] }], 'Lanza el tramo que sigue de mi cola');
    expect(misionesQuePidenSeguir({ misiones: [tramo] } as unknown as Plan, null)).toEqual([]);
    const plan = {
      colaAutorizada: autorizada,
      misiones: [
        tramo,
        mision('ver', [{ texto: 'Abre el diálogo con el ✉ de este paso. ¿Se vio así?', opciones: ['Se vio así', 'Se ve distinto'] }], 'Mira el diálogo único'),
        mision('decide', [{ texto: '¿Encadeno mis revisiones mientras quede cola?', opciones: ['Sí', 'No'] }], 'Decide si encadeno mis revisiones'),
        mision('entregada', [{ texto: '¿Sigo con mi cola?', opciones: ['Sí'] }]),
      ],
    } as unknown as Plan;
    expect(misionesQuePidenSeguir(plan, { misiones: [tramo] } as Plan, new Set(['entregada']))).toEqual([]);
  });

  it('--listo no acepta una cola autorizada sin la nota de la persona que la autorizó', () => {
    const bandeja = readFileSync(join(__dirname, '..', '..', 'tools', 'director', 'bandeja.ts'), 'utf-8');
    expect(bandeja).toContain('estado.notas.some((n) => n.id === plan.colaAutorizada!.nota)');
  });
});
