// Nadie pide una revisión solo (regla dura del titular, 23 de octubre de 2026: «nunca se disparan revisiones
// automáticamente; solamente el usuario puede dispararlas»). La revisión gasta el modelo, y STL existe para que la persona
// decida cuándo usarlo. Esta prueba lee el código: si alguien agrega otro camino que pida una revisión (al entregar una
// misión o un proyecto, cuando falla una urgencia o una aclaración, en el reloj de 15 segundos…), falla aquí.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { esOrigenRevision, ORIGENES_REVISION } from '../../src/director/proyectos';

const leer = (ruta: string) => readFileSync(join(process.cwd(), ruta), 'utf8');
const veces = (texto: string, patron: RegExp) => (texto.match(patron) ?? []).length;

describe('nadie pide una revisión solo', () => {
  it('el servidor la pide en un solo lugar: la ruta «/revision», con el botón que la nombra', () => {
    const servidor = leer('estudio/servidor/api.ts');
    // pedirRevision, solo dentro de pedirYLanzar; pedirYLanzar, definido una vez y llamado solo en «/revision»
    expect(veces(servidor, /\bpedirRevision\(/g)).toBe(1);
    expect(veces(servidor, /\bpedirYLanzar\(/g)).toBe(1);
    expect(veces(servidor, /\bpedirYLanzar = async/g)).toBe(1);
    const ruta = servidor.slice(servidor.indexOf("ruta === '/revision'"), servidor.indexOf("ruta === '/aclarar'"));
    expect(ruta).toContain('pedirYLanzar(');
    expect(ruta).toContain('esOrigenRevision(cuerpo.origen)');
  });

  it('el lanzador nunca la pide: solo lanza la que una persona pidió', () => {
    const revisor = leer('estudio/servidor/revisor.ts');
    expect(veces(revisor, /\bpedirRevision\(/g)).toBe(0);
    expect(revisor).not.toMatch(/import[^;]*\bpedirRevision\b[^;]*from/);
  });

  it('una revisión a la vez: al cerrar una, nada lanza la siguiente (nota de voz del titular nmwdqtq1ntit)', () => {
    // Las revisiones encadenadas salieron del Studio el 12 de noviembre de 2026: la persona lee lo que dejó el director,
    // comenta y pide la siguiente a mano
    const servidor = leer('estudio/servidor/api.ts');
    const revisor = leer('estudio/servidor/revisor.ts');
    const proyectos = leer('src/director/proyectos.ts');
    for (const codigo of [servidor, revisor, proyectos]) expect(codigo).not.toMatch(/encadenarRevision|seguirLaCadena|empezarSeguidas|pararSeguidas|seguidasActivas/);
    expect(servidor).not.toContain("ruta === '/seguidas'");
    expect(esOrigenRevision('seguidas')).toBe(false);
  });

  it('la página la pide solo desde un botón, y cada uno dice cuál es', () => {
    const pagina = leer('estudio/src/app.ts');
    const llamadas = pagina.match(/pedirLaRevision\(true[^)]*\)/g) ?? [];
    expect(llamadas.length).toBeGreaterThan(0);
    for (const l of llamadas) {
      const origen = l.match(/pedirLaRevision\(true,\s*(?:'([a-z_]+)'|rev\.dataset\.origen)/);
      expect(origen, `«${l}» no dice con qué botón se pide`).not.toBeNull();
      if (origen?.[1]) expect(Object.keys(ORIGENES_REVISION)).toContain(origen[1]);
    }
    // Solo hay una revisión, la completa (nota de voz del titular nmvx3x8bstit): ningún botón pide menos, y el servidor no la acepta
    expect(pagina).not.toContain('solo_dejado');
    expect(esOrigenRevision('solo_dejado')).toBe(false);
    // Entregar una misión no la pide: completarSiToca no llama a pedirLaRevision
    const entrega = pagina.slice(pagina.indexOf('async function completarSiToca'), pagina.indexOf('function recomendacionDeRevision'));
    expect(entrega).not.toContain('pedirLaRevision(');
  });

  it('entregar un proyecto la pide con «Entregar y pedir su diagnóstico», un origen declarado, y es el único botón (pd_entregar_y_diagnosticar, nmwai6p98tit)', () => {
    expect(esOrigenRevision('entrega_diagnostico')).toBe(true);
    expect(ORIGENES_REVISION.entrega_diagnostico).toContain('Entregar y pedir su diagnóstico');
    // El formulario: un solo botón de entregar, el que la pide, que dice que usa el plan; «Solo entregar» ya no existe
    const formulario = leer('estudio/src/nuevo_proyecto.ts');
    expect(formulario).not.toContain('nuevo.soloEntregar');
    expect(leer('estudio/src/textos/en.ts')).not.toMatch(/Only deliver/);
    expect(leer('estudio/src/textos/es.ts')).not.toMatch(/Solo entregar/);
    expect(formulario).toMatch(/data-diagnostico[^>]*title="\$\{esc\(t\('nuevo\.entregarYDiagnosticarTitulo'\)\)\}"/);
    expect(leer('estudio/src/textos/en.ts')).toMatch(/'nuevo\.entregarYDiagnosticarTitulo': '[^']*uses your Claude plan/);
    expect(leer('estudio/src/textos/es.ts')).toMatch(/'nuevo\.entregarYDiagnosticarTitulo': '[^']*usa tu plan de Claude/);
    // La página la pide por «/revision», con ese origen, solo si se entregó con ese botón
    const pagina = leer('estudio/src/app.ts');
    const nuevo = pagina.slice(pagina.indexOf('async function nuevoProyecto'), pagina.indexOf('function pintarBienvenida'));
    expect(nuevo).toMatch(/if \(r\.diagnosticar\) \{\s+const pedida = await pedirLaRevision\(true, 'entrega_diagnostico', true\);/);
    // El servidor, al entregar, no la pide: solo deja el proyecto sin la misión que pedía pedirla
    const servidor = leer('estudio/servidor/api.ts');
    const desde = servidor.indexOf("if (ruta === '/proyecto-nuevo' && req.method === 'POST')");
    expect(desde).toBeGreaterThan(0);
    const entregar = servidor.slice(desde, servidor.indexOf("if (ruta === '/salud'", desde));
    expect(entregar).not.toMatch(/pedirYLanzar|pedirRevision/);
    expect(entregar).toContain('const diagnosticoPedido = cuerpo.diagnosticar === true;');
    // El elegido del escaneo llega por aquí con lo que se encontró de él, saneado
    expect(entregar).toContain('historialDeEscaneo(cuerpo.historialIA');
  });

  it('un proyecto a la vez, por cualquier camino, se entrega pidiendo su diagnóstico con su botón; varios ya no (pd_entrega_al_instante, nmwb73juxtit; pd_entrega_fluida, nmwcw9ayjtit)', () => {
    const formulario = leer('estudio/src/nuevo_proyecto.ts');
    // Cada formulario marca diagnosticar, y su botón dice que lo pide
    const enviar = formulario.slice(formulario.indexOf("dlg.addEventListener('submit'"), formulario.indexOf("dlg.addEventListener('cancel'"));
    expect(enviar).toMatch(/cual === 'rapido'[\s\S]*diagnosticar: true/);
    expect(enviar).toMatch(/cual === 'nuevo'[\s\S]*diagnosticar: true[\s\S]*cual === 'escaneo'/);
    expect(veces(enviar, /entregarYCerrar\(entregaElegida\(/g)).toBe(1);
    expect(enviar).not.toContain("cual === 'existentes'");
    expect(formulario).not.toContain("modo: 'varios'");
    expect(formulario).not.toContain('formularioExistentes');
    expect(formulario).not.toContain('data-tipo="existente"');
    const boton = formulario.slice(formulario.indexOf('export function botonEntregar'), formulario.indexOf('export interface Candidato'));
    expect(boton).toContain("t('nuevo.entregarYDiagnosticar')");
    const nuevo = formulario.slice(formulario.indexOf('export function htmlNuevo'), formulario.indexOf('export function pedirProyectoNuevo'));
    expect(nuevo).toContain('botones(botonEntregar())');
    expect(nuevo).not.toContain("t('nuevo.entregarlo')");
    // La página: el proyecto recién entregado nace sin niebla, queda activo y muestra la espera del diagnóstico
    const pagina = leer('estudio/src/app.ts');
    const entrega = pagina.slice(pagina.indexOf('async function nuevoProyecto'), pagina.indexOf('function pintarBienvenida'));
    expect(entrega).toMatch(/nacerSinNiebla\(j\.id\);\s+if \(!\(await cargarTrasEntregar\(nombres, diagnostico\)\)\) return;/);
    expect(entrega).toContain("mostrarEsperaRevision('diagnostico')");
    expect(entrega).not.toContain("irA('proyectos')");
    // El servidor ya no tiene la ruta de varios a la vez, ni la página la llama
    expect(leer('estudio/servidor/api.ts')).not.toContain('/proyectos-varios');
    expect(pagina).not.toContain('proyectos-varios');
  });
});
