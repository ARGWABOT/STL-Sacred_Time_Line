import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const diagnosticar = readFileSync(join(__dirname, 'diagnosticar.ts'), 'utf-8');

describe('La radiografía nombra a los autores sin su correo (pedido pd_cuenta_ajena)', () => {
  it('cuenta los commits de cada autor por su nombre: el shortlog, sin la opción que agrega el correo', () => {
    expect(diagnosticar).toContain("g('shortlog', '-sn', 'HEAD')");
    expect(diagnosticar).not.toMatch(/'shortlog',\s*'-s?n?e/);
    // Ninguna otra lectura de la historia saca el correo de un autor (%ae) o de quien confirma (%ce)
    expect(diagnosticar).not.toMatch(/%a[eE]|%c[eE]/);
  });
});
