// Lo que va haciendo el director nunca queda encima de un diálogo modal (notas de voz del titular nmvy4it8etit y nmwcxbw8wtit).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SIEMPRE_ENCIMA, dialogoDe } from './encima';

const leer = (archivo: string) => readFileSync(join(__dirname, archivo), 'utf-8');
const modal = {} as HTMLDialogElement;

describe('lo que va haciendo el director queda debajo de cualquier diálogo modal', () => {
  it('no entra en ningún diálogo, sea cual sea el de arriba (si entrara, taparía a «¿Dónde quedamos?»)', () => {
    expect(dialogoDe('progreso-director', modal)).toBeNull();
  });

  it('lo demás del director flotante (cara, atajos, segundo plano) sí va dentro del de arriba', () => {
    for (const id of SIEMPRE_ENCIMA.filter((i) => i !== 'progreso-director')) expect(dialogoDe(id, modal), id).toBe(modal);
  });

  it('su z-index es menor que el de la pastilla de grabación a un lado, y es un hermano de la página, no un diálogo ni un popover', () => {
    const pastilla = Number(leer('director.css').match(/dialog\.a-un-lado \{[^}]*z-index: (\d+)/)?.[1]);
    const estilos = leer('estilos.css');
    const progreso = [...estilos.matchAll(/\.progreso-director[^{]*\{[^}]*z-index: (\d+)/g)].map((m) => Number(m[1]));
    expect(progreso.length).toBeGreaterThan(0);
    for (const z of progreso) expect(pastilla).toBeGreaterThan(z);
    expect(estilos).toContain('body:has(#progreso-director:not([hidden])) #dialogo::backdrop');
    const html = leer('../../index.html');
    expect(html.indexOf('id="progreso-director"')).toBeGreaterThan(html.indexOf('</main>'));
    expect(html).toMatch(/<(section|div|aside)[^>]*id="progreso-director"/);
    expect(html).not.toMatch(/id="progreso-director"[^>]*popover/);
    expect(html).toContain('<dialog id="dialogo"');
  });
});
