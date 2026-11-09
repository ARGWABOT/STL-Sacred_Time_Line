// La medición del núcleo, en su módulo (propuesta aceptada pr_partir_modulos): se prueba con datos hechos a mano.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pestanaDeAncla } from './pestanasModelo';
import { es } from './textos/es';
import { ANCLA_MEDICION, avisoMidiendo, cuantoGasta, seccionMedicion, type EstadoMedicion } from './vistaMedicion';

const base = (x: Partial<EstadoMedicion> = {}): EstadoMedicion => ({ enMarcha: null, ultima: null, casos: 13, estimado: null, ...x });
const ultima = (x: Partial<NonNullable<EstadoMedicion['ultima']>> = {}): NonNullable<EstadoMedicion['ultima']> => ({
  cuando: '2026-10-28T15:01:00.000Z', modelo: 'claude-opus-5-5', esfuerzo: 'max', terminada: null, vueltas: 20, alcance: null, pasan: 8, fallan: 1, pendientes: 4, tokens: 1_234_567,
  porCaso: [{ id: 'c_x', titulo: 'Un caso', veredicto: 'falla', vueltas: 2, porque: ['no comprueba'], califica: null, antes: 'pasa' }],
  ...x,
});
const datos = (medicion: EstadoMedicion | null, directorPendiente = false) => ({ medicion, directorPendiente, plegable: () => '' });

describe('la medición del núcleo, solo en la copia de quien desarrolla el Studio (pd_medicion_solo_desarrollo)', () => {
  const raiz = join(import.meta.dirname, '..', '..');
  const api = readFileSync(join(raiz, 'estudio', 'servidor', 'api.ts'), 'utf8');

  it('sin la marca, la página no recibe nada, la sección no se pinta y la ruta de pedirla responde que no', () => {
    expect(api).toContain('medicion: (await leerLocal(raiz)).copiaDeDesarrollo ? estadoDeMedicion(raiz,');
    expect(seccionMedicion(datos(null))).toBe('');
    const ruta = api.slice(api.indexOf("if (ruta === '/medicion' && req.method === 'POST') {"));
    const primera = ruta.split('\n').slice(1, 3).join('\n');
    expect(primera).toContain("if (!(await leerLocal(raiz)).copiaDeDesarrollo) return responder(res, 403, { error: t('servidor.api.medicionSoloDesarrollo') });");
    expect(es['servidor.api.medicionSoloDesarrollo']).toBe('La medición del núcleo es solo para la copia de quien desarrolla el Studio.');
    // Antes de empezar nada: nada corre sin la marca
    expect(ruta.indexOf('copiaDeDesarrollo')).toBeLessThan(ruta.indexOf('empezarMedicion('));
    // La bandeja, igual: no habla de la medición en la copia de otro
    expect(readFileSync(join(raiz, 'tools', 'director', 'bandeja.ts'), 'utf8')).toContain('comoClave(raiz) && (await leerLocal(raiz)).copiaDeDesarrollo) {');
  });

  it('con la marca, todo sigue como antes', () => {
    expect(seccionMedicion(datos(base()))).toContain('data-medir="pedir"');
  });

  it('la marca es de este computador: se lee de su configuración, fuera de git y del paquete; lo demás no la enciende', () => {
    expect(readFileSync(join(raiz, '.gitignore'), 'utf8')).toMatch(/^estudio\.local\.json$/m);
    const proyectos = readFileSync(join(raiz, 'src', 'director', 'proyectos.ts'), 'utf8');
    expect(proyectos).toContain('...(x?.copiaDeDesarrollo === true ? { copiaDeDesarrollo: true } : {}),');
    expect(proyectos).toContain('export async function marcarCopiaDeDesarrollo(raiz: string, si: boolean)');
    expect(readFileSync(join(raiz, 'tools', 'director', 'marcaDesarrollo.ts'), 'utf8')).toContain('await marcarCopiaDeDesarrollo(raiz, !quitar);');
    // El README no la nombra como algo de quien lo instala
    for (const f of ['README.md', 'README.es.md']) expect(readFileSync(join(raiz, f), 'utf8')).not.toContain('Medir el núcleo');
  });
});

describe('la medición del núcleo, aparte de app.ts (pr_partir_modulos)', () => {
  it('sin medición del servidor no pinta nada; sin una anterior, lo dice y estima lo que gastaría', () => {
    expect(seccionMedicion(datos(null))).toBe('');
    const html = seccionMedicion(datos(base({ estimado: { total: 1_400_000, porVuelta: 70_000, de: 'corrida' } })));
    expect(html).toContain('Todavía no se ha medido en este computador.');
    expect(html).toContain('Una corrida mide 13 casos, dos vueltas cada uno: unos <b>1,4 M tokens</b>');
  });

  it('la última, con su modelo y su esfuerzo, lo que se rompió y los tokens que gastó', () => {
    const html = seccionMedicion(datos(base({ ultima: ultima() })));
    expect(html).toContain('La última, detenida antes de terminar');
    expect(html).toContain('con Opus 5.5, esfuerzo máximo');
    expect(html).toContain('Midió 1 de los 13 casos');
    expect(html).toContain(' · <b>se rompió</b>');
    expect(html).toContain(' · 1,2 M tokens');
  });

  it('sin «De acuerdo» ni «No de acuerdo»: la nota de quien califica se lee, y lo que falla llega como misión (pd_medicion_mision)', () => {
    const html = seccionMedicion(datos(base({ ultima: ultima({ porCaso: [{ id: 'c_x', titulo: 'Un caso', veredicto: 'falla', vueltas: 2, porque: ['no comprueba'], califica: { pasa: false, porque: ['Llega antes.'] }, antes: 'pasa' }] }) })));
    expect(html).toContain('Quien califica: falla, porque Llega antes.');
    expect(html).not.toContain('De acuerdo');
    expect(html).not.toContain('data-acuerdo');
    expect(html).toContain('Lo que falle te llega como misión');
    for (const archivo of ['app.ts', '../servidor/api.ts']) expect(readFileSync(join(__dirname, archivo), 'utf-8')).not.toContain('cuerpo.acuerdo');
    expect(readFileSync(join(__dirname, 'app.ts'), 'utf-8')).not.toContain('ds.acuerdo');
  });

  it('con un director trabajando o pedido, «Medir el núcleo» espera; midiendo, se puede detener', () => {
    expect(seccionMedicion(datos(base(), true))).toMatch(/data-medir="pedir" disabled/);
    expect(seccionMedicion(datos(base({ enMarcha: { quien: 'leonc', desde: '2026-10-29T18:00:00.000Z', vueltas: 1 } })))).toContain('data-medir="detener"');
    expect(cuantoGasta({ total: 100_000, porVuelta: 10_000, de: 'revisiones' })).toContain('como mucho');
  });
});

describe('«Se está midiendo el núcleo», un atajo a la medición en curso (nota de voz del titular nmvviiwfqtit)', () => {
  const director = readFileSync(join(__dirname, 'app.ts'), 'utf-8');
  const tramo = (desde: string, hasta: string) => director.slice(director.indexOf(desde), director.indexOf(hasta, director.indexOf(desde)));

  it('el aviso es un botón, que no pide nada, y lleva a la tarjeta de la medición, en «Lo que gasta»', () => {
    const html = avisoMidiendo('La medición está corriendo.');
    expect(html).toMatch(/^<button type="button" class="estado-revision ocupado midiendo" data-ver-medicion /);
    expect(html).toContain('Se está midiendo el núcleo');
    expect(html).toContain('title="La medición está corriendo. Un clic te lleva a la medición en curso."');
    expect(html).not.toContain('data-revision');
    expect(seccionMedicion(datos(base()))).toContain(`data-ancla="${ANCLA_MEDICION}"`);
    expect(pestanaDeAncla(ANCLA_MEDICION)).toBe('gasto');
  });

  it('con la medición en marcha, la cabecera y lo de segundo plano lo usan, y su clic abre «Modelo y consumo» en la medición', () => {
    const boton = tramo('function botonRevision', 'async function mostrarFalla');
    expect(boton).toContain('if (ocupado && d.medicion?.enMarcha) return `${avisoMidiendo(ocupado.porque)}${cadena}`;');
    expect(boton.indexOf('avisoMidiendo(')).toBeLessThan(boton.indexOf('if (ocupado) return'));
    expect(tramo('function pintarSegundoPlano', 'function directorOcupado')).toMatch(/d\.medicion\?\.enMarcha\s*\? `<button type="button" class="sp-linea" data-ver-medicion/);
    const clic = tramo("closest('[data-ver-medicion]')", '});');
    expect(clic).toContain("void ir({ vista: 'modelo', ancla: ANCLA_MEDICION");
  });
});
