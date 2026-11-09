// Lo que va haciendo el director, frente al diálogo de comentar (nota de voz del titular nmvy4it8etit, 1 de noviembre de 2026).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LINEA_GRANDE, modalDelProgreso } from './encima';

/** Un diálogo de mentira: lo que miran modalDeArriba y modalDelProgreso (si es modal). */
const dialogo = (modal: boolean) => ({ matches: (s: string) => s === ':modal' && modal, contains: () => false }) as unknown as HTMLDialogElement;
const leer = (archivo: string) => readFileSync(join(__dirname, archivo), 'utf-8');

describe('el diálogo de comentar queda encima de lo que va haciendo el director, sin cerrarlo', () => {
  it('con solo el de comentar abierto, no entra en él: se queda en su lugar, debajo y a la vista', () => {
    const comentario = dialogo(true);
    expect(modalDelProgreso(comentario, [comentario], [comentario])).toBeNull();
  });

  it('comentando desde otro diálogo, va en ese, que queda debajo del de comentar', () => {
    const comentario = dialogo(true);
    const dondeQuedamos = dialogo(true);
    // El ✉ es de los primeros de la página, y se abre después
    expect(modalDelProgreso(comentario, [comentario, dondeQuedamos], [dondeQuedamos, comentario])).toBe(dondeQuedamos);
  });

  it('lo que se abre después de comentar no se lo lleva encima del comentario', () => {
    const comentario = dialogo(true);
    const confirmar = dialogo(true);
    expect(modalDelProgreso(comentario, [comentario, confirmar], [comentario, confirmar])).toBeNull();
  });

  it('sin comentar, o con el comentario a un lado mientras graba, va en el de arriba, como todo lo demás', () => {
    const dondeQuedamos = dialogo(true);
    const cerrado = dialogo(false);
    expect(modalDelProgreso(cerrado, [cerrado, dondeQuedamos], [dondeQuedamos])).toBe(dondeQuedamos);
    expect(modalDelProgreso(null, [dondeQuedamos], [dondeQuedamos])).toBe(dondeQuedamos);
    expect(modalDelProgreso(cerrado, [cerrado], [])).toBeNull();
  });

  it('la línea del proyecto en grande queda encima de lo que va haciendo el director, abierto o plegado: no entra en ella (nmw5dpbbstit)', () => {
    const grande = { ...dialogo(true), matches: (s: string) => s === ':modal', contains: () => false, classList: { contains: (c: string) => c === LINEA_GRANDE } } as unknown as HTMLDialogElement;
    const dondeQuedamos = dialogo(true);
    const confirmar = dialogo(true);
    // Sola, o abierta encima de otro: se queda debajo de ella, en ese otro o en su lugar
    expect(modalDelProgreso(null, [grande], [grande])).toBeNull();
    expect(modalDelProgreso(null, [dondeQuedamos, grande], [dondeQuedamos, grande])).toBe(dondeQuedamos);
    // Lo que se abre después de ella tampoco se lo lleva encima
    expect(modalDelProgreso(null, [grande, confirmar], [grande, confirmar])).toBeNull();
    // Y con ella y el de comentar, debajo de los dos
    const comentario = dialogo(true);
    expect(modalDelProgreso(comentario, [comentario, grande], [grande, comentario])).toBeNull();
    expect(leer('lineaGrande.ts')).toContain(`dlg.className = '${LINEA_GRANDE}';`);
  });

  it('la pastilla de la grabación queda encima de él donde estén los dos, y el velo deja leerlo', () => {
    const pastilla = Number(leer('director.css').match(/dialog\.a-un-lado \{[^}]*z-index: (\d+)/)?.[1]);
    const estilos = leer('estilos.css');
    const progreso = [...estilos.matchAll(/\.progreso-director[^{]*\{[^}]*z-index: (\d+)/g)].map((m) => Number(m[1]));
    expect(progreso.length).toBeGreaterThan(0);
    for (const z of progreso) expect(pastilla).toBeGreaterThan(z);
    expect(estilos).toContain('body:has(#progreso-director:not([hidden])) #dialogo::backdrop');
    // Son hermanos en la página: ningún contexto de apilamiento los separa
    const html = leer('../../index.html');
    expect(html.indexOf('id="progreso-director"')).toBeGreaterThan(html.indexOf('</main>'));
    expect(html).toContain('<dialog id="dialogo"');
  });
});
