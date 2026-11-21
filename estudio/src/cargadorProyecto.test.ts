// Al cambiar de proyecto, una capa con su nombre mientras llegan sus datos (nota nmw9wgco4tit).
import { describe, expect, it } from 'vitest';
import { cargadorProyecto } from './cargadorProyecto';

describe('el cargador al cambiar de proyecto (nmw9wgco4tit)', () => {
  it('dice qué proyecto abre, escapado, y se puede quitar por su marca', () => {
    const html = cargadorProyecto('App <IDG>');
    expect(html).toContain('data-cambiando-proyecto');
    expect(html).toContain('role="status"');
    expect(html).toContain('pt-orbita');
    expect(html).toContain('App &lt;IDG&gt;');
    expect(html).not.toContain('<IDG>');
  });

  it('con una nota de voz transcribiéndose, dice que el cambio la espera (nmwdwg5yvtit)', () => {
    expect(cargadorProyecto('STL', true)).toContain('data-espera-nota');
    expect(cargadorProyecto('STL')).not.toContain('data-espera-nota');
  });

  it('sin nombre, el texto general', () => {
    expect(cargadorProyecto(null)).toMatch(/<p>[^<{]+<\/p>/);
  });
});
