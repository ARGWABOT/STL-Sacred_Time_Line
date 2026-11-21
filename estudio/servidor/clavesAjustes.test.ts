import { describe, expect, it } from 'vitest';
import { clavesDeAjustes } from './clavesAjustes';

describe('las claves de tus ajustes de Claude Code, sin sus valores', () => {
  it('nombra cada clave, y las de dentro de un objeto, sin ningún valor', () => {
    const ajustes = {
      model: 'claude-opus-5-5',
      env: { ANTHROPIC_API_KEY: 'sk-secreta', OTRA: '1' },
      permissions: { allow: ['Bash(ls)', 'Read'], deny: [] },
      enabledPlugins: {},
      cleanupPeriodDays: 30,
    };
    const lineas = clavesDeAjustes(ajustes);
    expect(lineas).toEqual([
      'model',
      'env › ANTHROPIC_API_KEY',
      'env › OTRA',
      'permissions › allow (una lista de 2)',
      'permissions › deny (una lista de 0)',
      'enabledPlugins (vacío)',
      'cleanupPeriodDays',
    ]);
    const todo = lineas.join('\n');
    for (const valor of ['claude-opus-5-5', 'sk-secreta', 'Bash(ls)', '30']) expect(todo).not.toContain(valor);
  });

  it('lo que no es un objeto no tiene claves', () => {
    expect(clavesDeAjustes(null)).toEqual([]);
    expect(clavesDeAjustes([1, 2])).toEqual([]);
    expect(clavesDeAjustes('texto')).toEqual([]);
  });
});
