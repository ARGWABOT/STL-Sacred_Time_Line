// La vista «Documentos», en su módulo (propuesta aceptada pr_partir_modulos): recibe lo que pinta y la página le da lo que
// depende de ella (lo que la columna recuerda entre repintados, el cuerpo de cada parte, la tarjeta de cada nota, los ajustes
// del lector), así que se prueba con datos hechos a mano, sin la página.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Mision, Nota } from '../../src/director/director';
import { icono } from './iconos';
import { conAyuda } from './palabras';
import { parteEntera, secciones, vistaDocumentos, type DatosDocumentos } from './vistaDocumentos';

const mision = { titulo: 'Leer la ruta' } as Mision;
// El que sigue (a), el que viene después (b), uno ya leído (c) y uno revisado (d)
const enRuta = [
  { ruta: 'docs/a.md', estado: 'siguiente', mision, lectura: 'siguiente' },
  { ruta: 'docs/b.md', estado: 'pendiente', mision, lectura: 'despues' },
  { ruta: 'docs/c.md', estado: 'pendiente', mision, lectura: 'leido' },
  { ruta: 'docs/d.md', estado: 'revisado', mision, lectura: 'revisado' },
] as DatosDocumentos['enRuta'];
const curados = [
  { ruta: 'docs/a.md', titulo: 'A', porQue: 'Abre la ruta.' },
  { ruta: 'docs/guia.md', titulo: 'La guía', porQue: 'Para consultar el método.' },
  { ruta: 'docs/metodo/metodologia.md', titulo: 'La metodología', porQue: 'Es del Studio.' },
];
const documentos = [
  { ruta: 'docs/notas.md', titulo: 'Notas del proyecto' },
  { ruta: 'repo:README.md', titulo: 'README · README.md' },
  { ruta: 'repo:CLAUDE.md', titulo: 'CLAUDE.md · CLAUDE.md' },
  { ruta: 'docs/director/propio.md', titulo: 'Del Studio', studio: true },
];
const archivosClave = [{ ruta: 'src/a.ts', para: 'Lo principal' }, { ruta: 'src/b/a.ts', para: 'Otro a' }, { ruta: 'src/c.ts', para: 'Lo de c' }];

const texto = '# Ruta del proyecto\n\nEscrita por el director.\n\n## Uno\nPrimera idea.\n\n## Dos\nSegunda idea.\n\n## Tres\nTercera idea.\n';
const nota = (id: string, sobre: Nota['sobre']) => ({ id, cuando: '2026-10-20T10:00:00Z', quien: 'Ana', de: 'ana', sobre, texto: `La ${id}` }) as Nota;
const delDoc = { tipo: 'documento', id: 'docs/a.md' } as const;
const nUno = nota('n1', { ...delDoc, seccion: 'Uno' });
const nDos = nota('n2', { ...delDoc, seccion: 'Dos', fragmento: 'Segunda idea.' });
const nDecision = nota('n3', { ...delDoc, seccion: 'Uno', decision: 'd1' });
const deOtroDoc = nota('n4', { tipo: 'documento', id: 'docs/b.md', seccion: 'Uno' });

/** Lo que la página recuerda de la columna, aquí anotado: cuántas veces empezó y qué partes plegables pidió. */
const pintando = (x: Partial<DatosDocumentos> = {}) => {
  const pedidas: [string, string[], boolean][] = [];
  const empezo = { veces: 0 };
  const d: DatosDocumentos = {
    yo: 'ana', persona: 'ana', nombreDePersona: 'Ana', curados, archivosClave, enRuta, documentos, documentosFuera: 0,
    repositorioConectado: true, doc: null, notas: [nUno, nDos, nDecision, deOtroDoc], listaPlegada: false,
    alEmpezarColumna: () => { empezo.veces++; },
    plegableEnColumna: (clave, rutas, abiertaAlNacer = false) => {
      pedidas.push([clave, rutas, abiertaAlNacer]);
      return ` data-recuerda="${clave}"${abiertaAlNacer ? ' open' : ''}`;
    },
    plegable: (clave) => ` data-recuerda="${clave}"`,
    tituloDoc: (ruta) => `Título de ${ruta}`,
    leidasDe: () => [],
    reabierta: () => false,
    faltaEnParte: () => ({ total: 2, hechas: 1, decisiones: 1 }),
    porTrozos: (s, notas) => `<div data-trozos="${s.titulo}|${notas.map((n) => n.id)}"></div>`,
    conDecisiones: (titulo, _md, notas) => `<div data-decisiones="${titulo}|${notas.map((n) => n.id)}"></div>`,
    enParte: (ruta, seccion) => ({ vista: 'documentos', doc: ruta, seccion }),
    tarjetaNota: (n, conSobre, plegada, enRespuesta, aqui) => `<li data-tarjeta="${n.id}" data-args="${conSobre}|${plegada}|${enRespuesta}|${aqui.vista}|${aqui.seccion}"></li>`,
    volverAMisionDe: (ruta) => `<p data-volver="${ruta}"></p>`,
    ajustesLector: (ruta) => `<div class="ajustes-lector" data-ruta="${ruta}"></div>`,
    claseLector: () => 'letra-media',
    ...x,
  };
  return { d, pedidas, empezo, html: vistaDocumentos(d) };
};
const abierto = { doc: { ruta: 'docs/a.md', texto } };

describe('«Documentos», aparte de app.ts (pr_partir_modulos)', () => {
  it('mientras hay algo por leer, la columna muestra entero el que sigue y pliega lo de después y lo ya leído', () => {
    const { html, pedidas, empezo } = pintando();
    expect(empezo.veces).toBe(1);
    expect(html).toContain('<aside class="lista-docs" id="lista-docs">');
    expect(html).toContain('<h3>Tu misión actual <small>· Ana</small></h3>');
    expect(html).toContain('<button type="button" class="plegar-lista" data-plegar-lista aria-controls="lista-docs" title="Plegar la columna: el documento a todo el ancho" aria-label="Plegar la columna de los documentos">');
    // El que sigue, con su número, su porqué y la misión que lo pide
    expect(html).toContain('<button type="button" class="doc-l siguiente" data-doc="docs/a.md">');
    expect(html).toContain('<span class="num-doc">1</span><b>Título de docs/a.md</b>');
    expect(html).toContain('<span class="chip estado-doc siguiente">→ Sigue este</span>');
    expect(html).toContain('<small>Abre la ruta. Misión: «Leer la ruta».</small></button>');
    // Lo de después, plegado y sin poder abrirse; lo ya leído (y lo revisado), plegado y abierto a un clic
    expect(html).toContain('<details class="docs-plegados" data-ancla="d-despues" data-recuerda="columna|Después"><summary>Después <span class="cifra">1</span></summary>'
      + '<button type="button" class="doc-l chico despues" data-doc="docs/b.md" disabled aria-disabled="true" title="Se abre cuando termines el que sigue"><b>Título de docs/b.md</b></button></details>');
    expect(html).toContain('<details class="docs-plegados" data-ancla="d-leidos" data-recuerda="columna|Ya leídos"><summary>Ya leídos <span class="cifra">2</span>' + conAyuda('sello') + '</summary>'
      + '<button type="button" class="doc-l chico leido" data-doc="docs/c.md" title="Título de docs/c.md"><b>Título de docs/c.md</b></button>'
      + '<button type="button" class="doc-l chico revisado" data-doc="docs/d.md" title="Título de docs/d.md"><b>Título de docs/d.md</b></button></details>');
    // La página recuerda cada parte plegable: nacen plegadas mientras hay algo por leer
    expect(pedidas.map(([clave, , alNacer]) => [clave, alNacer])).toEqual([['columna|Después', false], ['columna|Ya leídos', false], ['columna|otros', false], ['columna|instrucciones', false]]);
    expect(pedidas[0][1]).toEqual(['docs/b.md']);
    expect(pedidas[1][1]).toEqual(['docs/c.md', 'docs/d.md']);
  });

  it('«Otros documentos»: lo curado, los archivos clave, los del proyecto, los del repositorio y las instrucciones para los agentes; lo del Studio, no', () => {
    const { html, pedidas } = pintando();
    expect(html).toContain('<details class="otros-docs" data-ancla="d-otros" data-recuerda="columna|otros"><summary>Documentación del proyecto</summary>');
    expect(html).toContain('<h3>Para consultar</h3><button type="button" class="doc-l chico" data-doc="docs/guia.md" title="Para consultar el método."><b>La guía</b><small>Para consultar el método.</small></button>');
    expect(html).not.toContain('La metodología');
    expect(html).not.toContain('Del Studio');
    // Los archivos clave, con la ruta entera donde el nombre se repite, y antes de los del repositorio
    expect(html).toContain('<div class="archivos-clave" data-ancla="d-clave"><h3>Archivos clave</h3>'
      + '<button type="button" class="doc-l chico" data-doc="repo:src/a.ts" title="Lo principal"><b>src/a.ts</b></button>'
      + '<button type="button" class="doc-l chico" data-doc="repo:src/b/a.ts" title="Otro a"><b>src/b/a.ts</b></button>'
      + '<button type="button" class="doc-l chico" data-doc="repo:src/c.ts" title="Lo de c"><b>c.ts</b></button></div>');
    expect(html.indexOf('data-ancla="d-clave"')).toBeLessThan(html.indexOf('<h3>Del repositorio del proyecto</h3>'));
    expect(html).toContain('<h3>Del proyecto</h3><button type="button" class="doc-l chico" data-doc="docs/notas.md" title="Notas del proyecto">Notas del proyecto</button>');
    expect(html).toContain('<h3>Del repositorio del proyecto</h3><button type="button" class="doc-l chico" data-doc="repo:README.md" title="Del repositorio del proyecto: README · README.md">README · README.md</button>');
    expect(html).toContain('<details class="instrucciones-agentes" data-ancla="d-agentes" data-recuerda="columna|instrucciones"><summary>Instrucciones para los agentes <span class="cifra">1</span></summary>'
      + '<button type="button" class="doc-l chico" data-doc="repo:CLAUDE.md" title="Del repositorio del proyecto: CLAUDE.md: instrucciones para Claude Code · CLAUDE.md">CLAUDE.md: instrucciones para Claude Code</button></details>');
    // Los documentos que caben en «Otros documentos» (para que la página sepa si lo abierto está ahí) y en las instrucciones
    expect(pedidas.find(([clave]) => clave === 'columna|otros')![1]).toEqual(['docs/guia.md', 'docs/notas.md', 'repo:README.md', 'repo:CLAUDE.md', 'repo:src/a.ts', 'repo:src/b/a.ts', 'repo:src/c.ts']);
    expect(pedidas.find(([clave]) => clave === 'columna|instrucciones')![1]).toEqual(['repo:CLAUDE.md']);
  });

  it('«Otros documentos» dice lo que falta: ver todos, lo que no cabe, el repositorio sin conectar o sin .md', () => {
    // Mientras no se han pedido todos, un botón para pedirlos
    const sinPedir = pintando({ documentos: null }).html;
    expect(sinPedir).toContain('<button type="button" data-cargar-docs>Ver todos</button>');
    expect(sinPedir).not.toContain('Del repositorio del proyecto</h3>');
    // El servidor dejó fuera algunos .md del repositorio: se dice, no se calla
    expect(pintando({ documentosFuera: 1 }).html).toContain('<p class="intro">Hay 1 documento más en el repositorio que no cabe en esta lista.</p>');
    expect(pintando({ documentosFuera: 3 }).html).toContain('<p class="intro">Hay 3 documentos más en el repositorio que no caben en esta lista.</p>');
    // Sin nada del repositorio: según esté conectado, y según haya o no instrucciones para los agentes
    const soloProyecto = [documentos[0]];
    expect(pintando({ documentos: soloProyecto }).html).toContain('<p class="intro">El repositorio no tiene archivos .md.</p>');
    expect(pintando({ documentos: soloProyecto, repositorioConectado: false }).html).toContain('<p class="intro">Conecta el repositorio en Proyecto para leer y comentar sus documentos.</p>');
    expect(pintando({ documentos: [documentos[2]] }).html).toContain('<p class="intro">El repositorio no tiene más documentación en .md.</p>');
    // Sin misiones que pidan documentos, la columna lo dice y «Otros documentos» nace abierta
    const sinRuta = pintando({ enRuta: [] });
    expect(sinRuta.html).toContain('<h3>Tu orden de lectura <small>· Ana</small></h3>');
    expect(sinRuta.html).toContain('<p class="intro">Tus misiones de ahora no piden documentos.</p>');
    expect(sinRuta.html).toContain('<details class="otros-docs" data-ancla="d-otros" data-recuerda="columna|otros" open>');
  });

  it('la lectura de otra persona se ve entera, sin plegables y sin cerrar lo que viene después', () => {
    const { html, pedidas } = pintando({ persona: 'beto', nombreDePersona: 'Beto' });
    expect(html).toContain('<h3>Tu orden de lectura <small>· Beto</small></h3>');
    expect(html).toContain('<button type="button" class="doc-l siguiente" data-doc="docs/a.md">');
    // Lo pendiente que no es el siguiente se ve como «Después», pero a la vista y abierto
    expect(html).toContain('<button type="button" class="doc-l despues" data-doc="docs/b.md">');
    expect(html).toContain('<span class="chip estado-doc despues">Después</span>');
    expect(html).toContain('<span class="chip estado-doc revisado">✓ Revisado: no hay que volver</span>');
    expect(html).not.toContain('disabled');
    expect(html).not.toContain('docs-plegados');
    // El número cuenta solo lo que falta; lo revisado lleva su marca
    expect(html).toContain('<span class="num-doc">1</span><b>Título de docs/a.md</b>');
    expect(html).toContain('<span class="num-doc">2</span><b>Título de docs/b.md</b>');
    expect(html).toContain('<span class="num-doc">✓</span><b>Título de docs/d.md</b>');
    expect(pedidas.map(([clave]) => clave)).toEqual(['columna|otros', 'columna|instrucciones']);
  });

  it('un archivo clave que también es documentación se marca una sola vez: en la copia que recibió el clic (nmw2db9dptit)', () => {
    // La regresión: el README estaba en «Archivos clave» y en «Del repositorio del proyecto», las dos copias salían
    // marcadas y la columna se llevaba a la vista la primera, la de arriba: saltaba
    const conReadme = { archivosClave: [...archivosClave, { ruta: 'README.md', para: 'La puerta del proyecto' }], doc: { ruta: 'repo:README.md', texto: '# README' } };
    const marcadas = (html: string) => html.split(' sel"').length - 1;
    const desdeElRepo = pintando(conReadme).html;
    expect(marcadas(desdeElRepo)).toBe(1);
    expect(desdeElRepo).toContain('<button type="button" class="doc-l chico sel" data-doc="repo:README.md" title="Del repositorio del proyecto: README · README.md">');
    const desdeLaClave = pintando({ ...conReadme, copiaEnClave: true }).html;
    expect(marcadas(desdeLaClave)).toBe(1);
    expect(desdeLaClave).toContain('<button type="button" class="doc-l chico sel" data-doc="repo:README.md" title="La puerta del proyecto">');
    // Un archivo clave que solo está ahí se marca ahí, venga de donde venga
    expect(marcadas(pintando({ doc: { ruta: 'repo:src/c.ts', texto: 'x' } }).html)).toBe(1);
  });

  it('sin documento abierto, invita a elegir uno; con él, marca el que está abierto en la columna', () => {
    const { html } = pintando({ listaPlegada: true });
    expect(html).toContain('<div class="lector"><p class="intro">Elige un documento. Debajo de cada parte está «Comentar esta parte al director»');
    expect(html).toContain('<p data-volver="null"></p></div>');
    expect(html.startsWith('<div class="docs"><aside class="lista-docs" id="lista-docs">')).toBe(true);
    expect(html).toContain(`<button type="button" class="desplegar-lista" data-plegar-lista aria-controls="lista-docs" title="Ver la columna de los documentos" aria-label="Ver la columna de los documentos">${icono('desplegar')}</button>`);
    const leyendo = pintando(abierto).html;
    expect(leyendo).toContain('<button type="button" class="doc-l siguiente sel" data-doc="docs/a.md">');
    expect(pintando({ doc: { ruta: 'repo:src/a.ts', texto: 'x' } }).html).toContain('data-doc="repo:src/a.ts" title="Lo principal"');
    expect(pintando({ doc: { ruta: 'repo:src/a.ts', texto: 'x' } }).html).toContain('class="doc-l chico sel" data-doc="repo:src/a.ts"');
    // La columna plegada es de este navegador: el documento ocupa todo el ancho
    expect(pintando({ ...abierto, listaPlegada: true }).html.startsWith('<div class="docs sin-lista">')).toBe(true);
    expect(leyendo.startsWith('<div class="docs">')).toBe(true);
  });

  it('el documento abierto, parte por parte: la que se lee de a una idea, la que sigue cerrada, y lo ya leído plegado al final', () => {
    const { html } = pintando({ ...abierto, leidasDe: () => ['Uno'] });
    expect(html).toContain('<article class="lector letra-media"><div class="ajustes-lector" data-ruta="docs/a.md"></div>');
    expect(html.endsWith('</article><p data-volver="docs/a.md"></p></div>')).toBe(true);
    // La entrada no se marca ni se comenta; lo comentado de las ideas va dentro de cada idea, no al pie
    expect(html).toContain('<section class="parte-doc entrada-doc" data-parte="">\n      <div data-decisiones="|"></div>\n      \n    </section>');
    expect(html).toContain('<section class="parte-doc por-leer" data-parte="Dos">\n      <div data-trozos="Dos|n1,n2,n3"></div>');
    expect(html).toContain(`<span class="progreso-parte" title="La parte se marca sola al atender cada idea">${icono('estrella')} 1 de 2 · falta una decisión</span>`);
    expect(html).not.toContain('data-comentar="documento|docs/a.md|Dos"');
    expect(html).not.toContain('data-tarjeta="n2"');
    // La que sigue a la de ahora se cierra hasta terminarla
    expect(html).toContain(`<section class="parte-doc cerrada" data-parte="Tres">\n      <h2>Tres</h2>\n      <p class="como">${icono('candado')} Se abre al terminar «Dos».</p>\n    </section>`);
    expect(html.indexOf('data-parte="Dos"')).toBeLessThan(html.indexOf('data-parte="Tres"'));
    // Lo ya leído, plegado al final, con lo comentado al pie de la parte y las decisiones aparte
    expect(html).toContain(`<details class="ya-leido-doc" data-recuerda="leido|docs/a.md|1"><summary>${icono('estrella')} Ya leído <span class="cifra">1</span> <span class="ayuda-leido">la parte que leíste está aquí, plegada. Ábrela para releerla.</span></summary>`);
    expect(html).toContain('<section class="parte-doc leida" data-parte="Uno">\n      <div data-decisiones="Uno|n3"></div>');
    expect(html).toContain('<ul class="notas-lista"><li data-tarjeta="n1" data-args="false|false|false|documentos|Uno"></li></ul>');
    expect(html).toContain('<button type="button" class="al-director" data-comentar="documento|docs/a.md|Uno">✉ Comentar esta parte al director</button>');
    expect(html).toContain(`<button type="button" class="leido-parte hecho" data-leido-parte="Uno" aria-pressed="true" title="Quitar la marca: vuelve a su lugar">${icono('estrella')} Leída</button>`);
    expect(html).not.toContain('data-tarjeta="n3"');
    expect(html).not.toContain('data-tarjeta="n4"');
    expect(html.indexOf('data-parte="Tres"')).toBeLessThan(html.indexOf('class="ya-leido-doc"'));
  });

  it('una parte leída en la que el director reescribió una idea se vuelve a abrir; con todo leído, el rótulo lo dice', () => {
    const reabre = pintando({ ...abierto, leidasDe: () => ['Uno'], reabierta: (_ruta, s) => s.titulo === 'Uno' }).html;
    expect(reabre).toContain('<section class="parte-doc por-leer" data-parte="Uno">');
    expect(reabre).not.toContain('class="ya-leido-doc"');
    // Todo leído: ninguna cerrada, y las tres partes plegadas con su rótulo
    const todo = pintando({ ...abierto, leidasDe: () => ['Uno', 'Dos', 'Tres'] }).html;
    expect(todo).not.toContain('parte-doc cerrada');
    expect(todo).toContain('<span class="cifra">3</span> <span class="ayuda-leido">Ya leíste todo el documento: las 3 partes que leíste están aquí, plegadas. Ábrelas para releerlas.</span>');
  });

  it('un documento sin partes se comenta entero y se marca con su estrella; quien no tiene rol solo comenta', () => {
    const corto = { doc: { ruta: 'docs/a.md', texto: '# Título\n\nSolo la entrada.\n' } };
    const entero = pintando(corto).html;
    expect(entero).toContain('<section class="parte-doc por-leer entrada-doc" data-parte="">');
    // La misma caja con que se prepara su voz antes de abrirlo (app.ts › primeraParteDe; pedido pd_precargar_doc)
    expect(parteEntera('<p>Hola</p>')).toBe('<section class="parte-doc por-leer entrada-doc" data-parte=""><p>Hola</p></section>');
    expect(entero).toContain('<button type="button" class="al-director" data-comentar="documento|docs/a.md|">✉ Comentar el documento al director</button>');
    expect(entero).toContain(`<button type="button" class="leido-parte" data-leido-parte="" aria-pressed="false" title="Márcala al terminar de leerla">${icono('estrella')} Leída: márcala</button>`);
    // Sin rol (todavía nadie): se comenta cada parte, sin marcas de lectura ni partes cerradas
    const sinRol = pintando({ ...abierto, yo: null }).html;
    expect(sinRol).toContain('data-comentar="documento|docs/a.md|Uno">✉ Comentar esta parte al director</button>');
    expect(sinRol).not.toContain('leido-parte');
    expect(sinRol).not.toContain('parte-doc cerrada');
  });

  it('«secciones» parte el documento en su entrada y cada «##», y no se deja engañar por un bloque de código', () => {
    expect(secciones(texto).map((s) => s.titulo)).toEqual(['', 'Uno', 'Dos', 'Tres']);
    expect(secciones(texto)[2]).toEqual({ titulo: 'Dos', md: '## Dos\nSegunda idea.\n\n' });
    const conCodigo = secciones('Entrada\n\n## **Una** `parte`\n```\n## no es parte\n```\n');
    expect(conCodigo.map((s) => s.titulo)).toEqual(['', 'Una parte']);
    expect(conCodigo[1].md).toBe('## **Una** `parte`\n```\n## no es parte\n```\n\n');
    // Sin nada, ninguna parte
    expect(secciones('')).toEqual([]);
  });

  it('app.ts la importa, le da lo que depende de la página y ya no la pinta', () => {
    const director = readFileSync(new URL('./app.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    expect(director).toContain("import { parteEntera, secciones, vistaDocumentos as vistaDocumentosHtml, type Documento } from './vistaDocumentos';");
    expect(director).toContain('return vistaDocumentosHtml({');
    expect(director).toContain('alEmpezarColumna, plegableEnColumna, plegable, tituloDoc, leidasDe, reabierta, faltaEnParte, porTrozos, conDecisiones,');
    // Lo que la columna recuerda entre un repintado y otro sigue siendo de la página
    expect(director).toContain('const docEnPlegable = new Map<');
    expect(director).toContain('const plegableEnColumna = (clave: string, rutas: string[], abiertaAlNacer = false) => {');
    expect(director).not.toContain('class="lista-docs"');
    expect(director).not.toContain('class="parte-doc');
    expect(director).not.toContain('data-ancla="d-otros"');
    expect(director).not.toContain('function secciones(');
  });
});
