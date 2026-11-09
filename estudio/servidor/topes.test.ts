import { describe, expect, it } from 'vitest';
import { MAX_ADJUNTO, MAX_ADJUNTOS, MAX_TEXTO } from '../../src/director/director';
import { MAX_AUDIO, MAX_CUERPO, Rechazo, textoDe } from './topes';

describe('lo que se escribe en el Studio se guarda entero o se rechaza, nunca se corta (nota del titular, 22 de octubre)', () => {
  it('por debajo del tope, o justo en él, se guarda entero; sin los espacios de los extremos, como antes', () => {
    const largo = 'Una definición larga, dictada en un audio largo. '.repeat(1500).trim();
    expect(largo.length).toBeGreaterThan(6000); // lo que antes se cortaba sin avisar
    expect(textoDe(largo, MAX_TEXTO, 'La nota')).toBe(largo);
    expect(textoDe('x'.repeat(MAX_TEXTO), MAX_TEXTO, 'La nota')).toHaveLength(MAX_TEXTO);
    expect(textoDe('  hola\n', 200, 'La nota')).toBe('hola');
    // Los espacios de los extremos no cuentan para el tope
    expect(textoDe(` ${'a'.repeat(10)} `, 10, 'El nombre')).toBe('a'.repeat(10));
    expect(textoDe(undefined, 10, 'El nombre')).toBe('');
    expect(textoDe(null, 10, 'El nombre')).toBe('');
    expect(textoDe(42, 10, 'El nombre')).toBe('42');
  });

  it('sobre el tope se rechaza con un aviso que dice cuánto mide, cuál es el tope y qué hacer', () => {
    const rechazo = (f: () => unknown) => {
      try {
        f();
      } catch (e) {
        expect(e).toBeInstanceOf(Rechazo);
        return (e as Rechazo).message;
      }
      throw new Error('no se rechazó');
    };
    // Un texto libre: dice que no se guardó nada y cómo dejar lo que sobra
    const nota = rechazo(() => textoDe('x'.repeat(MAX_TEXTO + 1), MAX_TEXTO, 'La nota'));
    expect(nota).toMatch(/^La nota mide 100\.001 caracteres y el tope es 100\.000\./);
    expect(nota).toMatch(/No se guardó nada/);
    expect(nota).toMatch(/otra nota del Buzón, o adjunta el texto como archivo/);
    // Un campo corto: el mismo aviso, con su propio qué hacer
    expect(rechazo(() => textoDe('x'.repeat(121), 120, 'El nombre del proyecto'))).toBe('El nombre del proyecto mide 121 caracteres y el tope es 120. No se guardó nada: el Studio no corta lo que escribes. Acorta el texto y vuelve a intentarlo.');
    expect(rechazo(() => textoDe('x'.repeat(81), 80, 'El cargo', 'Déjalo en pocas palabras.'))).toMatch(/El cargo mide 81 caracteres y el tope es 80\..* Déjalo en pocas palabras\.$/);
  });

  it('el tope de un texto es generoso (más que un dictado de una hora) y cabe holgado en el cuerpo de una petición', () => {
    // Una hora de dictado en español: unas 160 palabras por minuto de unos 6 caracteres con su espacio
    expect(MAX_TEXTO).toBeGreaterThan(60 * 160 * 6);
    // Una nota en su tope, aun con cada letra escapada en JSON (\uXXXX), con su audio y sus adjuntos en base64
    const nota = 6 * MAX_TEXTO + Math.ceil((MAX_AUDIO * 4) / 3) + Math.ceil((MAX_ADJUNTOS * MAX_ADJUNTO * 4) / 3);
    expect(nota).toBeLessThan(MAX_CUERPO);
  });
});
