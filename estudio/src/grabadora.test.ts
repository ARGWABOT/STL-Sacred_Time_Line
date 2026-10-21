import { describe, expect, it } from 'vitest';
import { modalDebajo } from './grabadora';

/** Un diálogo de mentira: solo lo que mira modalDebajo (si es modal y qué tiene dentro). */
const dialogo = (modal: boolean, dentro: unknown[] = []) =>
  ({ matches: (s: string) => s === ':modal' && modal, contains: (x: unknown) => dentro.includes(x) }) as unknown as HTMLDialogElement;

describe('la pastilla de la grabación, siempre encima (nota del titular, 21 de octubre de 2026)', () => {
  it('se lleva dentro del diálogo modal que queda debajo, el último que se abrió', () => {
    const graba = dialogo(false);
    const dondeQuedamos = dialogo(true);
    const otro = dialogo(true);
    expect(modalDebajo(graba, [dondeQuedamos, graba])).toBe(dondeQuedamos);
    expect(modalDebajo(graba, [otro, dondeQuedamos, graba])).toBe(dondeQuedamos);
  });

  it('se queda donde está si no hay otro diálogo modal abierto', () => {
    const graba = dialogo(false);
    expect(modalDebajo(graba, [graba, dialogo(false)])).toBeNull();
  });

  it('nunca se lleva dentro de sí misma ni de un diálogo que está dentro de ella', () => {
    const interno = dialogo(true);
    const graba = dialogo(true, [interno]);
    expect(modalDebajo(graba, [graba, interno])).toBeNull();
  });
});
