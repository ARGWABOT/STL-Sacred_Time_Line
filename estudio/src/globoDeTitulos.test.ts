import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { globoDeTituloHtml, tieneTituloSvg, titleAData } from './globoDeTitulos';

const leer = (...r: string[]) => readFileSync(join(__dirname, ...r), 'utf-8');

/** Un elemento mínimo, con solo los atributos. */
function falso(attrs: Record<string, string>) {
  const a = new Map(Object.entries(attrs));
  return {
    getAttribute: (n: string) => a.get(n) ?? null,
    setAttribute: (n: string, v: string) => void a.set(n, v),
    removeAttribute: (n: string) => void a.delete(n),
    hasAttribute: (n: string) => a.has(n),
  } as unknown as Element;
}

describe('el globo de los títulos (nmw5nr10atit)', () => {
  it('quita el title y guarda su texto en data-titulo', () => {
    const el = falso({ title: 'Pedir revisión' });
    expect(titleAData(el)).toBe('Pedir revisión');
    expect(el.hasAttribute('title')).toBe(false);
    expect(el.getAttribute('data-titulo')).toBe('Pedir revisión');
  });

  it('si el código pone otro title después, gana el nuevo; sin title, usa el guardado', () => {
    const el = falso({ 'data-titulo': 'viejo', title: 'nuevo' });
    expect(titleAData(el)).toBe('nuevo');
    expect(el.getAttribute('data-titulo')).toBe('nuevo');
    expect(titleAData(el)).toBe('nuevo');
    expect(titleAData(falso({ title: '  ' }))).toBeNull();
  });

  it('un <title> de SVG también pasa a data-titulo y se quita, para que el navegador no pinte el suyo (nmw6mj5yvtit)', () => {
    const hijos: { localName: string; textContent: string; remove: () => void }[] = [];
    const el = Object.assign(falso({}), { children: hijos }) as unknown as Element;
    hijos.push({ localName: 'title', textContent: 'La bola de nieve', remove: () => void hijos.splice(0, 1) });
    expect(tieneTituloSvg(el)).toBe(true);
    expect(titleAData(el)).toBe('La bola de nieve');
    expect(el.getAttribute('data-titulo')).toBe('La bola de nieve');
    expect(hijos).toHaveLength(0);
    expect(tieneTituloSvg(el)).toBe(false);
    const f = leer('globoDeTitulos.ts');
    expect(f).toContain(':has(> title)');
  });

  it('la avalancha y los globos de turnos usan data-titulo (el globo propio), no title ni <title> (nmw6mj5yvtit)', () => {
    const pv = leer('progresoVivo.ts');
    expect(pv).toContain('aria-label="${dicho}" data-titulo="${dicho}"');
    expect(pv).not.toMatch(/\stitle="\$\{/);
    expect(pv).not.toContain('<title>');
  });

  it('el globo dice el mismo texto, escapado', () => {
    expect(globoDeTituloHtml('Ver "todo" <b>')).toContain('Ver');
    expect(globoDeTituloHtml('<b>')).not.toContain('<b>');
  });

  it('el lugar viene de lugarDelGlobo y usa el aspecto del globo del modo ayuda', () => {
    const f = leer('globoDeTitulos.ts');
    expect(f).toContain("from './lugarDelGlobo'");
    expect(f).toContain('lugarDelGlobo(');
    expect(f).toContain("'globo-modo'");
    expect(f).toContain("removeAttribute('title')");
  });

  it('se inicia desde ayudaGuiada.ts y no desde app.ts', () => {
    expect(leer('ayudaGuiada.ts')).toContain('instalarGloboDeTitulos()');
    expect(leer('app.ts')).not.toContain('globoDeTitulos');
  });
});
