import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { conAvance, juntarRegistros, nubladoDeNuevo, puntoDe, registroValido } from './registroLectura';
import { anotarLectura, archivoDeLectura, leerRegistroLectura } from '../../estudio/servidor/lectura';

describe('el registro de lo que recorriste con la niebla (pd_registro_lectura)', () => {
  it('anota hasta dónde se destapó, sin tope: lo de hace días sigue ahí', () => {
    let reg = {};
    // Más bloques que los 400 que recordaba el navegador, y ninguno se olvida
    for (let i = 0; i < 1000; i++) reg = conAvance(reg, `h${i}`, 5, i);
    expect(Object.keys(reg)).toHaveLength(1000);
    expect(puntoDe(reg, 'h0')).toBe(5);
    expect(puntoDe(reg, 'otro')).toBe(-1);
  });

  it('lo que se destapa de una vez al soltar al director se anota aparte, como saltado', () => {
    let reg = conAvance({}, 'h', 3, 1);
    reg = conAvance(reg, 'h', 20, 2, [4, 20]);
    expect(reg.h).toMatchObject({ punto: 20, hasta: 20, saltado: [[4, 20]] });
    // Un salto sobre lo que ya se vio pasar no lo vuelve saltado
    const visto = conAvance(conAvance({}, 'h', 30, 1), 'h', 30, 2, [0, 30]);
    expect(visto.h.saltado).toBeUndefined();
    // Dos saltos que se tocan, uno solo
    expect(conAvance(conAvance(conAvance({}, 'x', 5, 1, [0, 5]), 'x', 4, 2), 'x', 9, 3, [5, 9]).x.saltado).toEqual([[0, 9]]);
  });

  it('«Volver a nublar» nubla de nuevo sin borrar lo que se recorrió ni cuándo', () => {
    const reg = conAvance(conAvance({}, 'a', 12, 100, [0, 12]), 'b', 4, 100);
    const nublado = nubladoDeNuevo(reg, ['a', 'nada'], 200);
    expect(puntoDe(nublado, 'a')).toBe(-1);
    expect(nublado.a).toMatchObject({ hasta: 12, cuando: 100, nublado: 200, saltado: [[0, 12]] });
    expect(nublado.b).toEqual(reg.b);
    expect(nublado.nada).toBeUndefined();
    // Recorrerlo otra vez sube el punto, pero `hasta` no baja
    expect(conAvance(nublado, 'a', 3, 300).a).toMatchObject({ punto: 3, hasta: 12, nublado: 200 });
  });

  it('al juntar, por bloque, gana lo más nuevo (también un «Volver a nublar»); lo mal formado no entra', () => {
    const viejo = conAvance({}, 'a', 9, 100);
    const nuevo = nubladoDeNuevo(viejo, ['a'], 150);
    expect(juntarRegistros(viejo, nuevo).a.punto).toBe(-1);
    expect(juntarRegistros(nuevo, viejo).a.punto).toBe(-1);
    expect(registroValido({ a: { punto: 1, hasta: 1, cuando: 1 }, b: { punto: 'x' }, c: null })).toEqual({ a: { punto: 1, hasta: 1, cuando: 1 } });
    expect(registroValido([1])).toEqual({});
  });

  it('se guarda por persona y por proyecto en este computador, fuera de git (.estudio), y dos escrituras que se cruzan no se pisan', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'estudio-lectura-'));
    expect(archivoDeLectura(raiz, 'stl-studio', 'titular')).toBe(join(raiz, '.estudio', 'lectura', 'stl-studio', 'titular.json'));
    // Un nombre raro no sale de su carpeta
    expect(archivoDeLectura(raiz, '../x', 'a/b')).toBe(join(raiz, '.estudio', 'lectura', '__x', 'a_b.json'));
    await Promise.all([anotarLectura(raiz, 'p', 'titular', conAvance({}, 'a', 3, 1)), anotarLectura(raiz, 'p', 'titular', conAvance({}, 'b', 7, 2))]);
    const reg = await leerRegistroLectura(raiz, 'p', 'titular');
    expect(Object.keys(reg).sort()).toEqual(['a', 'b']);
    expect(await leerRegistroLectura(raiz, 'p', 'ana')).toEqual({});
    expect(JSON.parse(readFileSync(archivoDeLectura(raiz, 'p', 'titular'), 'utf-8')).b.punto).toBe(7);
  });

  it('la niebla lo usa: anota al llegar, carga al encenderse y al cambiar de proyecto, y la franja trae «Volver a nublar»', () => {
    const guia = readFileSync(join(__dirname, '../../estudio/src/guiaLectura.ts'), 'utf-8');
    const director = readFileSync(join(__dirname, '../../estudio/src/app.ts'), 'utf-8');
    const servidor = readFileSync(join(__dirname, '../../estudio/servidor/api.ts'), 'utf-8');
    const guardar = guia.slice(guia.indexOf('function guardar(b: Bloque)'), guia.indexOf('function guardado('));
    expect(guardar).toContain('conAvance(registro, b.huella, b.punto, Date.now(), salto ?? undefined)');
    // Lo del registro manda sobre la copia corta del navegador
    expect(guia).toContain('if (registro[huella]) return puntoRecorrido(registro, huella);');
    // Al soltarlo, el tramo destapado de una vez es un salto
    expect(guia).toMatch(/b\.salto = a > b\.punto \? \[b\.punto \+ 1, [^\n]*\n\s*reubicar\(b, a, false\);/);
    expect(guia).toContain("resaltados.set('niebla-lectura', resaltado);\n  // Lo que ya recorriste, del registro de este computador (pd_registro_lectura)\n  void cargarRegistroLectura();");
    expect(guia).toContain('data-niebla-renublar');
    expect(guia).toContain("closest('[data-niebla-renublar]')) volverANublar();");
    const activar = director.slice(director.indexOf('async function activar('), director.indexOf('await mostrarDondeQuedamos();', director.indexOf('async function activar(')));
    expect(activar.indexOf('mandarRegistro();')).toBeLessThan(activar.indexOf("fetch('/__estudio/director/activo'"));
    expect(activar).toContain('await cargarRegistroLectura();');
    // El servidor lo guarda para quien abre el Studio, en el proyecto activo
    expect(servidor).toMatch(/if \(ruta === '\/lectura'\) \{\n\s*const yo = await leerIdentidad\(raiz, id\);/);
  });
});
