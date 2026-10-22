// El mapa de cada proyecto (propuesta aceptada «El mapa de cada proyecto, al día»): lo puro (las partes de cada
// documento y lo que cambió en ellas, el título de cada archivo, lo que dice git, las fichas y las líneas de la bandeja)
// y lo que lee de git y del disco (tools/director/mapa.ts), con repositorios de git de verdad creados aquí: uno de
// software y uno que no lo es (una tesis), con un commit antes de la última revisión y otro después.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { calcularMapa } from '../../tools/director/mapa.ts';
import { estadoVacio, partesDeDocumento, trozosDeParte, type EstadoDirector, type Mision, type Plan } from './director';
import {
  cambiosDeGit,
  commitsDeGit,
  desescapar,
  fichasDeDocumentos,
  lineasDelMapa,
  mapaComoTexto,
  MAX_CAMBIOS,
  MAX_TITULO,
  NOTA_MAPA,
  partesCambiadas,
  partesConTexto,
  partesDeFicha,
  sinCommitDeGit,
  sinTitulo,
  tituloDeArchivo,
  ultimosCambios,
  type ArchivoMapa,
  type Mapa,
} from './mapa';

const DIAGNOSTICO = [
  '# Diagnóstico de la tienda',
  '',
  '*El director asistente, 1 de octubre.*',
  '',
  '## 1. Lo que entendí',
  '',
  'Quieres vender en línea a tus clientes de siempre, sin intermediarios y con pocos productos al principio.',
  '',
  '## 2. El alcance',
  '',
  '### Lo que entra',
  '',
  'Los pedidos, el catálogo y el pago con tarjeta, en una sola página que se pueda usar desde el teléfono.',
  '',
  '```bash',
  '## esto no es una parte: es un comentario dentro del código',
  'npm test',
  '```',
  '',
  '**Para decidir:**',
  '',
  '1. **Los pagos.** ¿Con tarjeta desde el principio? Recomiendo que sí.',
  '2. **El envío.** ¿Lo hacemos ya? Recomiendo dejarlo para después.',
  '',
].join('\n');

const RUTA = [
  '# La ruta de la tienda',
  '',
  '*El director asistente. Lo nuevo desde el diagnóstico, que queda como estaba.*',
  '',
  '## 1. Lo que entendí',
  '',
  'Quieres vender pronto, y los pagos van antes que los envíos porque sin cobrar no hay tienda.',
  '',
  '## 2. Las fases',
  '',
  '### El MVP',
  '',
  'Los pedidos y los pagos. El detalle de los pagos está en pagos.md, que se lee junto con esta ruta.',
  '',
].join('\n');

const RUTA_DESPUES = RUTA.replace('Los pedidos y los pagos.', 'Los pedidos y los pagos con tarjeta.') + '\n## 3. Lo que no entra\n\nLos envíos, hasta tener los primeros pedidos de verdad y saber a dónde van.\n';

const PAGOS = [
  '# Los pagos',
  '',
  '*El director asistente.*',
  '',
  '## 1. Lo que entendí',
  '',
  'Quieres cobrar con tarjeta desde el primer pedido, sin que el cliente tenga que crear una cuenta.',
  '',
  '## 2. Las tarjetas',
  '',
  'Visa y Mastercard, con una pasarela local que cobre en pesos y deposite cada semana.',
  '',
].join('\n');

const PLANTEAMIENTO = [
  '# El planteamiento de la tesis',
  '',
  '*El director asistente.*',
  '',
  '## 1. Lo que entendí',
  '',
  'Quieres estudiar cómo leen hoy los lectores lentos, con entrevistas y una revisión de lo publicado sobre el tema.',
  '',
  '## 2. El alcance',
  '',
  'Tres capítulos y una conclusión, con entrevistas a diez lectores de la biblioteca de la universidad.',
  '',
  '**Para decidir:**',
  '',
  '1. **El método.** ¿Entrevistas o encuestas? Recomiendo entrevistas: dicen más con menos gente.',
  '',
].join('\n');

const DIAG = 'docs/director/diagnostico.md';
const RUTA_DOC = 'docs/director/ruta.md';
const PAGOS_DOC = 'docs/director/pagos.md';
const PLANT = 'docs/director/planteamiento.md';

/** Un plan válido y vacío, con la fase de arranque, más lo que diga cada prueba. */
const planCon = (cambios: Partial<Plan>): Plan => ({
  actualizado: '',
  nota: '',
  mision: '',
  revisado: '',
  mensaje: { fecha: '', texto: '', personas: {} },
  frentes: [],
  fases: [{ id: 'arranque', nombre: 'Arranque', etapa: 'Descubrimiento', meta: '', porQue: '', duracion: '', puerta: { nombre: 'La meta', prueba: '' }, frentes: {}, criterios: [], misiones: [] }],
  misiones: [],
  revisiones: {},
  respuestas: {},
  evaluacion: {},
  boletin: [],
  documentos: [],
  diagnostico: { fecha: '', resumen: [], frentes: {} },
  objetivos: [],
  propuestas: [],
  ritmo: [],
  lecciones: [],
  adelantado: [],
  ...cambios,
});

/** Una misión del titular que pide leer unos documentos. */
const leer = (id: string, docs: string[]): Mision => ({
  id,
  para: 'titular',
  fase: 'arranque',
  frente: 'direccion',
  titulo: `Lee ${docs.join(' y ')}`,
  porQue: 'Para seguir.',
  pasos: docs.map((d) => ({ texto: `Lee ${d}.`, ir: { doc: d, etiqueta: 'Leer' } })),
  entrega: 'Leído.',
  documentos: docs,
  xp: 10,
});

describe('el mapa: las partes de cada documento', () => {
  it('corta las partes como el Studio: sus títulos son los de partesDeDocumento, y un ## dentro del código no es una parte', () => {
    for (const texto of [DIAGNOSTICO, RUTA, PAGOS, PLANTEAMIENTO]) {
      expect(partesConTexto(texto).filter((p) => p.titulo).map((p) => p.titulo)).toEqual(partesDeDocumento(texto));
    }
    expect(partesConTexto(DIAGNOSTICO).map((p) => p.titulo)).toEqual(['', '1. Lo que entendí', '2. El alcance']);
  });

  it('dice qué cubre cada parte: cuántas ideas se leen en ella (como en el Studio), sus subtítulos y lo que pide decidir', () => {
    const partes = partesDeFicha(DIAGNOSTICO);
    expect(partes.map((p) => p.titulo)).toEqual(['1. Lo que entendí', '2. El alcance']);
    expect(partes[0]).toEqual({ titulo: '1. Lo que entendí', ideas: 1 });
    expect(partes[1].subtitulos).toEqual(['Lo que entra']);
    expect(partes[1].decisiones).toEqual(['1. Los pagos', '2. El envío']);
    const md = partesConTexto(DIAGNOSTICO)[2].md;
    expect(partes[1].ideas).toBe(trozosDeParte('2. El alcance', md).filter((t) => t.tipo !== 'rotulo' && !t.decision).length);
    // Sin ningún ##, el documento entero es una sola parte, su entrada
    expect(partesDeFicha('# Notas\n\nUna nota suelta, sin partes, que se lee entera de una vez.\n').map((p) => p.titulo)).toEqual(['']);
    expect(partesDeFicha('')).toEqual([]);
  });

  it('dice qué partes cambiaron, son nuevas o salieron, sin contar los espacios ni los fines de línea', () => {
    const ahora = `${DIAGNOSTICO.replace('Los pedidos, el catálogo', 'Los pedidos, el inventario')}\n## 3. Lo que no entra\n\nLos envíos.\n`.replace(/\n/g, '\r\n');
    expect(partesCambiadas(DIAGNOSTICO, ahora)).toEqual({ nuevas: ['3. Lo que no entra'], cambiadas: ['2. El alcance'], quitadas: [] });
    expect(partesCambiadas(ahora, DIAGNOSTICO)).toEqual({ nuevas: [], cambiadas: ['2. El alcance'], quitadas: ['3. Lo que no entra'] });
    expect(partesCambiadas(DIAGNOSTICO, DIAGNOSTICO.replace(/\n/g, '\r\n').replace('Quieres vender', 'Quieres   vender'))).toEqual({ nuevas: [], cambiadas: [], quitadas: [] });
    // La entrada también cuenta, como ''
    expect(partesCambiadas(DIAGNOSTICO, DIAGNOSTICO.replace('1 de octubre', '2 de octubre')).cambiadas).toEqual(['']);
    // Un documento nuevo trae todas sus partes como nuevas; uno borrado, todas como quitadas
    expect(partesCambiadas(null, DIAGNOSTICO)).toEqual({ nuevas: ['1. Lo que entendí', '2. El alcance'], cambiadas: [], quitadas: [] });
    expect(partesCambiadas(DIAGNOSTICO, null)).toEqual({ nuevas: [], cambiadas: [], quitadas: ['1. Lo que entendí', '2. El alcance'] });
    expect(partesCambiadas(null, '# Notas\n\nSin partes.\n').nuevas).toEqual(['']);
  });
});

describe('el mapa: el título de cada archivo, sin su contenido', () => {
  it('lee el título de Markdown, HTML, LaTeX y BibTeX, y si no, la primera línea que dice algo', () => {
    expect(tituloDeArchivo('README.md', '# Tienda en línea\n\nPedidos y pagos.\n')).toBe('Tienda en línea');
    expect(tituloDeArchivo('docs/guia.md', '---\ntitle: "La guía"\n---\n# Otro título\n')).toBe('La guía');
    expect(tituloDeArchivo('docs/x.md', '## La **segunda** parte, con [un enlace](http://x.co) ##\n')).toBe('La segunda parte, con un enlace');
    expect(tituloDeArchivo('docs/sin.md', 'Solo texto, sin título.\n')).toBe('Solo texto, sin título.');
    expect(tituloDeArchivo('a.md', `${String.fromCharCode(0xfeff)}# Con BOM\n`)).toBe('Con BOM');
    expect(tituloDeArchivo('index.html', '<!DOCTYPE html>\n<html><head><title>Mi tienda &amp; más</title></head>')).toBe('Mi tienda & más');
    expect(tituloDeArchivo('tesis.tex', '\\documentclass{book}\n\\title{La lectura lenta}\n')).toBe('La lectura lenta');
    expect(tituloDeArchivo('capitulos/2.tex', '% Capítulo 2\n\\chapter[Corto]{Marco teórico}\n')).toBe('Marco teórico');
    expect(tituloDeArchivo('refs.bib', '@comment{x}\n@book{eco1979,\n  title = {Lector in fabula}\n}\n@Article{ong1982,\n}\n')).toBe('2 referencias');
    expect(tituloDeArchivo('src/app.ts', '// La tienda: el servidor de pedidos.\nexport const x = 1;\n')).toBe('La tienda: el servidor de pedidos.');
    expect(tituloDeArchivo('src/pagos.ts', '/**\n * Los pagos con tarjeta.\n */\n')).toBe('Los pagos con tarjeta.');
    expect(tituloDeArchivo('tools/x.py', '#!/usr/bin/env python3\n# -*- coding: utf-8 -*-\n"""Transcribe los audios."""\n')).toBe('Transcribe los audios.');
    expect(tituloDeArchivo('package.json', '{\n  "name": "tienda",\n  "version": "1.0.0"\n}\n')).toBe('"name": "tienda",');
    expect(tituloDeArchivo('vacio.json', '\n{}\n')).toBeUndefined();
    const largo = tituloDeArchivo('largo.txt', 'palabra '.repeat(60))!;
    expect(largo).toHaveLength(MAX_TITULO);
    expect(largo.endsWith('…')).toBe(true);
  });

  it('las imágenes, el sonido, los comprimidos y los binarios no tienen título: van solo con su tamaño', () => {
    for (const r of ['logo.png', 'figuras/esquema.JPG', 'icono.svg', 'tesis.pdf', 'datos.sqlite', 'fuente.woff2', 'paquete.zip']) expect(sinTitulo(r)).toBe(true);
    for (const r of ['src/app.ts', 'bibliografia.bib', 'README.md', 'Makefile', 'datos.csv']) expect(sinTitulo(r)).toBe(false);
  });
});

describe('el mapa: lo que dice git', () => {
  it('el último cambio de cada archivo, de un solo git log: el más nuevo, aunque git no los dé en orden', () => {
    const salida = ['\x1e2026-10-01T10:00:00Z', '', 'src/app.ts', 'README.md', '', '\x1e2026-10-15T09:00:00-05:00', '', 'src/app.ts', '"docs/caf\\303\\251 \\"bueno\\".md"', ''].join('\n');
    expect(Object.fromEntries(ultimosCambios(salida))).toEqual({
      'src/app.ts': '2026-10-15T14:00:00.000Z',
      'README.md': '2026-10-01T10:00:00.000Z',
      'docs/café "bueno".md': '2026-10-15T14:00:00.000Z',
    });
  });

  it('lo que le pasó a cada archivo (git diff --name-status -z) y los commits', () => {
    expect(cambiosDeGit('M\0src/app.ts\0A\0src/pagos.ts\0D\0src/viejo.ts\0R100\0a.md\0b.md\0T\0enlace\0')).toEqual([
      { ruta: 'src/app.ts', estado: 'cambiado' },
      { ruta: 'src/pagos.ts', estado: 'nuevo' },
      { ruta: 'src/viejo.ts', estado: 'borrado' },
      { ruta: 'a.md', estado: 'borrado' },
      { ruta: 'b.md', estado: 'nuevo' },
      { ruta: 'enlace', estado: 'cambiado' },
    ]);
    expect(cambiosDeGit('')).toEqual([]);
    expect(commitsDeGit('abc1234\t2026-10-15T09:00:00-05:00\tLos pagos\ty algo más\r\n\n')).toEqual([{ hash: 'abc1234', cuando: '2026-10-15T14:00:00.000Z', asunto: 'Los pagos\ty algo más' }]);
    expect(desescapar('sin/comillas.md')).toBe('sin/comillas.md');
    expect(desescapar('"con\\ttab.md"')).toBe('con\ttab.md');
  });

  it('lo que el repositorio tiene sin commit (git status --porcelain -z): cambiado, nuevo o borrado, sin lo ignorado', () => {
    expect(sinCommitDeGit(' M src/app.ts\0M  CLAUDE.md\0A  src/nuevo.ts\0?? estudio/src/listas.ts\0 D viejo.md\0MM docs/con espacios.md\0!! node_modules/x\0')).toEqual([
      { ruta: 'src/app.ts', estado: 'cambiado' },
      { ruta: 'CLAUDE.md', estado: 'cambiado' },
      { ruta: 'src/nuevo.ts', estado: 'nuevo' },
      { ruta: 'estudio/src/listas.ts', estado: 'nuevo' },
      { ruta: 'viejo.md', estado: 'borrado' },
      { ruta: 'docs/con espacios.md', estado: 'cambiado' },
    ]);
    expect(sinCommitDeGit('')).toEqual([]);
  });
});

describe('el mapa: la ficha de cada documento', () => {
  // La tienda: el diagnóstico ya se revisó (sellado el 5); la ruta y los pagos se leen ahora, en la misma misión
  const plan = planCon({
    documentos: [
      { ruta: DIAG, titulo: 'Diagnóstico de la tienda', porQue: 'Dónde está la tienda.' },
      { ruta: RUTA_DOC, titulo: 'La ruta de la tienda', porQue: 'Las fases.' },
      { ruta: PAGOS_DOC, titulo: 'Los pagos', porQue: 'Cómo se cobra.' },
      { ruta: 'docs/director/previo.md', titulo: 'Las notas previas', porQue: 'Lo de antes.' },
      { ruta: 'docs/metodo/metodologia.md', titulo: 'El método', porQue: 'El método completo.' },
    ],
    misiones: [leer('t_diag', [DIAG]), leer('t_ruta', [RUTA_DOC, PAGOS_DOC])],
    respuestas: { n1: { cuando: '2026-10-06T10:00:00.000Z', texto: 'Lo llevé a los pagos.', tratamiento: 'integrada', destino: { doc: PAGOS_DOC, seccion: '2. Las tarjetas', etiqueta: 'Ver' } } },
  });
  const estado: EstadoDirector = {
    ...estadoVacio(),
    entregas: { t_diag: { cuando: '2026-10-05T10:00:00.000Z', quien: 'Laura' } },
    notas: [{ id: 'n1', cuando: '2026-10-05T09:00:00.000Z', quien: 'Laura', sobre: { tipo: 'documento', id: DIAG, seccion: '2. El alcance' }, texto: '¿Y las tarjetas de débito?' }],
    leidos: { [`titular:${RUTA_DOC}`]: { partes: ['1. Lo que entendí'], cuando: '2026-10-11T10:00:00.000Z', quien: 'Laura' } },
  };
  const textos = {
    [DIAG]: DIAGNOSTICO,
    [RUTA_DOC]: RUTA,
    [PAGOS_DOC]: PAGOS,
    'docs/director/previo.md': '# Las notas previas\n\n*Antes del diagnóstico.*\n\n## 1. Lo que había\n\nUna lista de ideas sueltas que el titular tenía antes de empezar.\n',
    'docs/metodo/metodologia.md': null,
  };
  const creados = { [DIAG]: '2026-10-01T10:00:00.000Z', [RUTA_DOC]: '2026-10-10T12:00:00.000Z', [PAGOS_DOC]: '2026-10-03T10:00:00.000Z', 'docs/director/previo.md': '2026-10-02T10:00:00.000Z' };
  const fichas = fichasDeDocumentos(plan, estado, ['titular'], textos, creados);
  const ficha = (ruta: string) => fichas.find((f) => f.ruta === ruta)!;

  it('dice sus partes, lo que decide y si está sellado o por leer, de quién y en qué misión', () => {
    expect(fichas.map((f) => f.ruta)).toEqual([DIAG, RUTA_DOC, PAGOS_DOC, 'docs/director/previo.md', 'docs/metodo/metodologia.md']);
    expect(ficha(DIAG)).toMatchObject({ titulo: 'Diagnóstico de la tienda', porQue: 'Dónde está la tienda.', existe: true, decisiones: 2, lectura: 'sellado', sellado: '2026-10-05T10:00:00.000Z', misiones: ['t_diag'] });
    expect(ficha(DIAG).partes.map((p) => p.titulo)).toEqual(['1. Lo que entendí', '2. El alcance']);
    expect(ficha(DIAG).lectores).toEqual([{ persona: 'titular', estado: 'revisado', mision: 't_diag' }]);
    expect(ficha(RUTA_DOC)).toMatchObject({ lectura: 'por leer', lectores: [{ persona: 'titular', estado: 'siguiente', mision: 't_ruta', leidas: 1 }] });
    expect(ficha(PAGOS_DOC).lectores).toEqual([{ persona: 'titular', estado: 'pendiente', mision: 't_ruta' }]);
    expect(ficha('docs/director/previo.md').lectura).toBe('sin misión');
    expect(ficha('docs/metodo/metodologia.md')).toMatchObject({ existe: false, partes: [], lectura: 'sin misión' });
  });

  it('con qué se conecta (la misma misión, lo que nombra) y qué lo reemplazó (lo nombra al empezar o recoge sus notas), solo si se escribió después de sellarlo', () => {
    expect(ficha(RUTA_DOC).conecta).toEqual([{ ruta: PAGOS_DOC, por: 'en la misma misión; este lo nombra' }]);
    expect(ficha(PAGOS_DOC).conecta).toEqual([{ ruta: RUTA_DOC, por: 'en la misma misión; nombra a este' }]);
    // La ruta lo nombra al empezar («Lo nuevo desde el diagnóstico») y se escribió después de sellarlo; los pagos recogen sus notas
    expect(ficha(DIAG).reemplazadoPor).toEqual([
      { ruta: RUTA_DOC, por: 'lo nombra al empezar' },
      { ruta: PAGOS_DOC, por: 'recoge sus notas' },
    ]);
    expect(ficha(RUTA_DOC).reemplaza).toEqual([{ ruta: DIAG, por: 'lo nombra al empezar' }]);
    expect(ficha(PAGOS_DOC).reemplaza).toEqual([{ ruta: DIAG, por: 'recoge sus notas' }]);
    // Las notas previas también lo nombran al empezar, pero son de antes: no lo reemplazan
    expect(ficha('docs/director/previo.md').reemplaza).toEqual([]);
    // Lo que ya dice el reemplazo no se repite entre las conexiones
    expect(ficha(DIAG).conecta).toEqual([]);
  });
});

/** Un mapa armado a mano, para las líneas de la bandeja. */
function mapaDePrueba(cambios: Partial<Mapa['cambios']>, instantanea: ArchivoMapa[] = []): Mapa {
  const plan = planCon({ documentos: [{ ruta: DIAG, titulo: 'Diagnóstico de la tienda', porQue: '' }, { ruta: RUTA_DOC, titulo: 'La ruta de la tienda', porQue: '' }], misiones: [leer('t_diag', [DIAG]), leer('t_ruta', [RUTA_DOC])] });
  const estado: EstadoDirector = { ...estadoVacio(), entregas: { t_diag: { cuando: '2026-10-05T10:00:00.000Z', quien: 'Laura' } } };
  return {
    nota: NOTA_MAPA,
    version: 1,
    generado: '2026-10-22T10:00:00.000Z',
    proyecto: 'tienda',
    repositorio: { rama: 'main', commit: 'abc1234', archivos: instantanea.length, bytes: instantanea.reduce((n, a) => n + a.bytes, 0) },
    avisos: [],
    cambios: { desde: '2026-10-20T05:33:52.750Z', base: 'abc1234', baseMemoria: 'def5678', commits: [], archivos: [], documentos: [], ...cambios },
    documentos: fichasDeDocumentos(plan, estado, ['titular'], { [DIAG]: DIAGNOSTICO, [RUTA_DOC]: RUTA }, { [DIAG]: '2026-10-01T10:00:00.000Z', [RUTA_DOC]: '2026-10-10T10:00:00.000Z' }),
    instantanea,
  };
}

describe('el mapa en la bandeja: una línea por cosa, sin topes silenciosos', () => {
  const muchos = Array.from({ length: MAX_CAMBIOS + 5 }, (_, i) => ({ ruta: `src/modulo-${String(i).padStart(2, '0')}.ts`, estado: 'cambiado' as const, bytes: 2048, titulo: `El módulo ${i}` }));

  it('lo que cambió: las primeras y, si hay más, cuántas y dónde están; los documentos con sus partes', () => {
    const lineas = lineasDelMapa(mapaDePrueba({ commits: [{ hash: 'a1', cuando: '2026-10-21T10:00:00.000Z', asunto: 'Muchos módulos' }], archivos: muchos, documentos: [{ ruta: RUTA_DOC, estado: 'cambiado', nuevas: ['3. Lo que no entra'], cambiadas: ['2. Las fases'], quitadas: [] }] }));
    const texto = lineas.join('\n');
    expect(texto).toContain('Desde la última revisión (2026-10-20 05:33 UTC): 1 commit y 30 archivos cambiados en el repositorio; 1 documento del director cambiado. Vuelve a leer solo eso:');
    expect(lineas.filter((l) => l.includes('src/modulo-'))).toHaveLength(MAX_CAMBIOS);
    expect(texto).toContain('  - cambiado · src/modulo-00.ts · 2 KB · «El módulo 0»');
    expect(texto).toContain('  - … y 5 más, en director/mapa.json (cambios.archivos).');
    expect(texto).toContain('  - documento cambiado · docs/director/ruta.md · nuevas: «3. Lo que no entra» · cambiadas: «2. Las fases»');
    // La ficha de lo que sigue va primero; la sellada, al final
    const fichas = lineas.filter((l) => l.startsWith('  - docs/director/'));
    expect(fichas[0]).toBe('  - docs/director/ruta.md «La ruta de la tienda» · por leer: titular (el que sigue) · 2 partes: «1. Lo que entendí», «2. Las fases» · reemplaza a: diagnostico.md (lo nombra al empezar)');
    expect(fichas[1]).toBe('  - docs/director/diagnostico.md «Diagnóstico de la tienda» · sellado (lo revisó titular el 2026-10-05) · 2 partes: «1. Lo que entendí», «2. El alcance» (2 por decidir) · lo reemplazó: ruta.md (lo nombra al empezar)');
    // Entero (node tools/director/mapa.ts): todo, y la instantánea archivo por archivo
    const entero = lineasDelMapa(mapaDePrueba({ archivos: muchos }, [{ ruta: 'README.md', bytes: 120, cambio: '2026-10-01T10:00:00.000Z', titulo: 'Tienda en línea' }]), { entero: true });
    expect(entero.filter((l) => l.includes('src/modulo-'))).toHaveLength(MAX_CAMBIOS + 5);
    expect(entero.join('\n')).not.toContain('… y');
    expect(entero).toContain('  - README.md · 120 B · 2026-10-01 · «Tienda en línea»');
  });

  it('sin revisión anterior, todo es nuevo y se dice así; sin cambios, también se dice', () => {
    expect(lineasDelMapa(mapaDePrueba({ desde: null })).join('\n')).toContain('No hay revisión anterior: todo es nuevo para el director (0 archivos del repositorio y 2 documentos del plan).');
    expect(lineasDelMapa(mapaDePrueba({})).join('\n')).toContain('0 commits y 0 archivos cambiados en el repositorio; 0 documentos del director cambiados.');
    expect(lineasDelMapa(mapaDePrueba({ repositorioNuevo: true, documentosNuevos: true })).join('\n')).toContain('todo el repositorio es nuevo (0 archivos); todos los documentos del director son nuevos.');
  });

  it('director/mapa.json: JSON válido con una cosa por línea, para buscar con Grep', () => {
    const instantanea: ArchivoMapa[] = [
      { ruta: 'README.md', bytes: 120, cambio: '2026-10-01T10:00:00.000Z', titulo: 'Tienda en línea' },
      { ruta: 'logo.png', bytes: 2048, cambio: '2026-10-01T10:00:00.000Z' },
      { ruta: 'notas.txt', bytes: 20, cambio: '2026-10-21T10:00:00.000Z', sinCommit: true, titulo: 'Pendiente: los envíos.' },
    ];
    const mapa = mapaDePrueba({ archivos: muchos.slice(0, 2) }, instantanea);
    const texto = mapaComoTexto(mapa);
    expect(JSON.parse(texto)).toEqual(mapa);
    const lineas = texto.split('\n');
    for (const a of [...instantanea, ...muchos.slice(0, 2)]) expect(lineas.filter((l) => l.includes(`"ruta":"${a.ruta}"`))).toHaveLength(1);
    expect(lineas.find((l) => l.includes('"ruta":"notas.txt"'))).toContain('"titulo":"Pendiente: los envíos."');
    expect(lineas.filter((l) => l.includes('"ruta":"docs/director/'))).toHaveLength(2);
  });
});

describe('el mapa de verdad, con git: un repositorio de software y una tesis', () => {
  const base = mkdtempSync(join(tmpdir(), 'estudio-mapa-'));
  afterAll(() => rmSync(base, { recursive: true, force: true }));
  const ENTORNO = { ...process.env, GIT_AUTHOR_NAME: 'P', GIT_AUTHOR_EMAIL: 'p@e.co', GIT_COMMITTER_NAME: 'P', GIT_COMMITTER_EMAIL: 'p@e.co' };
  const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'core.autocrlf=false', ...args], { cwd, encoding: 'utf8', env: ENTORNO }).trim();
  /** Un commit de todo lo que hay en la carpeta, con su fecha (la del autor y la de quien lo confirma). */
  const commit = (cwd: string, cuando: string, mensaje: string) => {
    git(cwd, 'add', '-A');
    const fecha = `${Math.floor(Date.parse(cuando) / 1000)} +0000`;
    execFileSync('git', ['-c', 'core.autocrlf=false', 'commit', '-q', '-m', mensaje], { cwd, env: { ...ENTORNO, GIT_AUTHOR_DATE: fecha, GIT_COMMITTER_DATE: fecha } });
  };
  const escribir = (raiz: string, ruta: string, texto: string | Buffer) => {
    mkdirSync(join(raiz, ...ruta.split('/').slice(0, -1)), { recursive: true });
    writeFileSync(join(raiz, ...ruta.split('/')), texto);
  };
  const repositorio = (nombre: string, rama = 'main') => {
    const r = join(base, nombre);
    mkdirSync(r);
    git(r, 'init', '-q', '-b', rama);
    return r;
  };
  // Las fechas, en segundos (git no guarda más), alrededor de la última revisión: un commit antes y otro después
  const DIA = 86_400_000;
  const hace = (ms: number) => new Date(Math.floor((Date.now() - ms) / 1000) * 1000).toISOString();
  const ANTES = hace(20 * DIA);
  const SELLADO = hace(15 * DIA);
  const REVISADO = new Date(Date.parse(hace(10 * DIA)) + 750).toISOString();
  const CIERRE = new Date(Date.parse(REVISADO) + 20_000 - 750).toISOString();
  const DESPUES = hace(5 * DIA);
  const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);

  it('software: la instantánea, lo que cambió desde la revisión (con lo que no tiene commit) y las partes de los documentos', async () => {
    const repo = repositorio('tienda');
    escribir(repo, 'package.json', '{\n  "name": "tienda",\n  "version": "1.0.0"\n}\n');
    escribir(repo, 'src/app.ts', '// La tienda: el servidor de pedidos.\nexport const pedidos = [];\n');
    escribir(repo, 'src/viejo.ts', 'export const viejo = 1;\n');
    escribir(repo, 'README.md', '# Tienda en línea\n\nPedidos y pagos.\n');
    escribir(repo, 'logo.png', PNG);
    commit(repo, ANTES, 'La tienda');
    escribir(repo, 'src/app.ts', '// La tienda: el servidor de pedidos.\nexport const pedidos = [];\nexport const pagos = [];\n');
    escribir(repo, 'src/pagos.ts', '/**\n * Los pagos con tarjeta.\n */\nexport const pagar = () => true;\n');
    unlinkSync(join(repo, 'src', 'viejo.ts'));
    commit(repo, DESPUES, 'Los pagos');
    // Sin commit: un cambio en el README y una nota nueva
    escribir(repo, 'README.md', '# Tienda en línea\n\nPedidos, pagos y envíos.\n');
    escribir(repo, 'notas.txt', 'Pendiente: los envíos.\n');

    // La memoria: el diagnóstico, de antes; la ruta, escrita en la revisión pasada (su commit de cierre llega después de
    // --listo); un cambio a la ruta después; y un documento nuevo, sin commit
    const memoria = repositorio('tienda-memoria', 'stl');
    escribir(memoria, DIAG, DIAGNOSTICO);
    commit(memoria, ANTES, 'Director (tienda): el diagnóstico');
    escribir(memoria, RUTA_DOC, RUTA);
    commit(memoria, CIERRE, 'Director (tienda): revisión del día: la ruta');
    escribir(memoria, RUTA_DOC, RUTA_DESPUES);
    commit(memoria, DESPUES, 'Director (tienda): atiende lo urgente');
    escribir(memoria, PAGOS_DOC, PAGOS);

    const plan = planCon({
      revisado: REVISADO,
      documentos: [{ ruta: DIAG, titulo: 'Diagnóstico de la tienda', porQue: '' }, { ruta: RUTA_DOC, titulo: 'La ruta de la tienda', porQue: '' }, { ruta: PAGOS_DOC, titulo: 'Los pagos', porQue: '' }],
      misiones: [leer('t_diag', [DIAG]), leer('t_ruta', [RUTA_DOC, PAGOS_DOC])],
    });
    const estado: EstadoDirector = { ...estadoVacio(), entregas: { t_diag: { cuando: SELLADO, quien: 'Laura' } } };
    const mapa = await calcularMapa({ proyecto: 'tienda', repo, memoria, plan, estado, personas: ['titular'] });

    expect(mapa.avisos).toEqual([]);
    // La instantánea: cada archivo con su tamaño, su último cambio y su título; lo binario, solo con su tamaño
    expect(mapa.instantanea.map((a) => a.ruta)).toEqual(['README.md', 'logo.png', 'notas.txt', 'package.json', 'src/app.ts', 'src/pagos.ts']);
    const archivo = (ruta: string) => mapa.instantanea.find((a) => a.ruta === ruta)!;
    expect(archivo('README.md')).toMatchObject({ titulo: 'Tienda en línea', sinCommit: true });
    expect(archivo('logo.png')).toEqual({ ruta: 'logo.png', bytes: PNG.length, cambio: ANTES });
    expect(archivo('package.json')).toMatchObject({ titulo: '"name": "tienda",', cambio: ANTES });
    expect(archivo('src/app.ts')).toMatchObject({ titulo: 'La tienda: el servidor de pedidos.', cambio: DESPUES });
    expect(archivo('src/pagos.ts').titulo).toBe('Los pagos con tarjeta.');
    expect(mapa.repositorio).toMatchObject({ rama: 'main', archivos: 6 });
    // Lo que cambió desde la revisión: lo de los commits nuevos y lo que aún no tiene commit
    expect(mapa.cambios.base).toBe(git(repo, 'rev-parse', 'HEAD~1'));
    expect(mapa.cambios.commits.map((c) => c.asunto)).toEqual(['Los pagos']);
    expect(mapa.cambios.archivos.map((a) => [a.ruta, a.estado, !!a.sinCommit])).toEqual([
      ['README.md', 'cambiado', true],
      ['notas.txt', 'nuevo', true],
      ['src/app.ts', 'cambiado', false],
      ['src/pagos.ts', 'nuevo', false],
      ['src/viejo.ts', 'borrado', false],
    ]);
    // Los documentos: lo que escribió la revisión pasada (hasta su commit de cierre) no vuelve como nuevo
    expect(mapa.cambios.baseMemoria).toBe(git(memoria, 'rev-parse', 'HEAD~1'));
    expect(mapa.cambios.documentos).toEqual([
      { ruta: PAGOS_DOC, estado: 'nuevo', nuevas: ['1. Lo que entendí', '2. Las tarjetas'], cambiadas: [], quitadas: [] },
      { ruta: RUTA_DOC, estado: 'cambiado', nuevas: ['3. Lo que no entra'], cambiadas: ['2. Las fases'], quitadas: [] },
    ]);
    // Las fichas, con lo que dice git de cuándo nació cada documento
    const ficha = (ruta: string) => mapa.documentos.find((f) => f.ruta === ruta)!;
    expect(ficha(DIAG)).toMatchObject({ lectura: 'sellado', sellado: SELLADO, creado: ANTES, decisiones: 2, reemplazadoPor: [{ ruta: RUTA_DOC, por: 'lo nombra al empezar' }] });
    expect(ficha(RUTA_DOC)).toMatchObject({ lectura: 'por leer', creado: CIERRE, conecta: [{ ruta: PAGOS_DOC, por: 'en la misma misión; este lo nombra' }] });
    expect(ficha(RUTA_DOC).partes.map((p) => p.titulo)).toEqual(['1. Lo que entendí', '2. Las fases', '3. Lo que no entra']);
    expect(ficha(PAGOS_DOC).existe).toBe(true);
    // En la bandeja
    const lineas = lineasDelMapa(mapa).join('\n');
    expect(lineas).toContain('1 commit y 5 archivos cambiados en el repositorio; 2 documentos del director cambiados');
    expect(lineas).toContain('  - cambiado, sin commit · README.md');
    expect(lineas).toContain('  - borrado · src/viejo.ts');
    expect(lineas).toContain('  - documento nuevo · docs/director/pagos.md · sus partes: «1. Lo que entendí», «2. Las tarjetas»');
    expect(lineas).toContain('  - documento cambiado · docs/director/ruta.md · nuevas: «3. Lo que no entra» · cambiadas: «2. Las fases»');
    expect(JSON.parse(mapaComoTexto(mapa))).toEqual(mapa);
  }, 60_000);

  it('una tesis (no es software): capítulos, bibliografía e imagen, y su planteamiento por leer', async () => {
    const repo = repositorio('tesis');
    const BIB = '@comment{La bibliografía de la tesis}\n@book{eco1979,\n  title = {Lector in fabula},\n  year = {1979}\n}\n@article{ong1982,\n  title = {Oralidad y escritura},\n  year = {1982}\n}\n';
    escribir(repo, 'capitulos/01-introduccion.md', '# Introducción\n\nEsta tesis estudia la lectura lenta.\n');
    escribir(repo, 'capitulos/02-marco.md', '# Marco teórico\n\nLo que se sabe de la lectura.\n');
    escribir(repo, 'bibliografia.bib', BIB);
    escribir(repo, 'figuras/esquema.png', PNG);
    escribir(repo, 'tesis.tex', '\\documentclass{book}\n\\title{La lectura lenta}\n\\begin{document}\n\\end{document}\n');
    commit(repo, ANTES, 'Los dos primeros capítulos');
    escribir(repo, 'capitulos/02-marco.md', '# Marco teórico\n\nLo que se sabe de la lectura, y lo que falta por saber.\n');
    escribir(repo, 'capitulos/03-metodo.md', '# Metodología\n\nEntrevistas a diez lectores.\n');
    escribir(repo, 'bibliografia.bib', `${BIB}@book{manguel1996,\n  title = {Una historia de la lectura}\n}\n`);
    commit(repo, DESPUES, 'El método y una referencia más');
    // La memoria: el planteamiento, de antes de la revisión, y nada después
    const memoria = repositorio('tesis-memoria', 'stl');
    escribir(memoria, PLANT, PLANTEAMIENTO);
    commit(memoria, ANTES, 'Director (tesis): el planteamiento');

    const plan = planCon({ revisado: REVISADO, documentos: [{ ruta: PLANT, titulo: 'El planteamiento de la tesis', porQue: 'Lo que entendí de la tesis.' }], misiones: [leer('t_plant', [PLANT])] });
    const mapa = await calcularMapa({ proyecto: 'tesis', repo, memoria, plan, estado: estadoVacio(), personas: ['titular'] });

    expect(mapa.avisos).toEqual([]);
    expect(Object.fromEntries(mapa.instantanea.map((a) => [a.ruta, a.titulo ?? null]))).toEqual({
      'bibliografia.bib': '3 referencias',
      'capitulos/01-introduccion.md': 'Introducción',
      'capitulos/02-marco.md': 'Marco teórico',
      'capitulos/03-metodo.md': 'Metodología',
      'figuras/esquema.png': null,
      'tesis.tex': 'La lectura lenta',
    });
    expect(mapa.cambios.archivos.map((a) => [a.ruta, a.estado])).toEqual([
      ['bibliografia.bib', 'cambiado'],
      ['capitulos/02-marco.md', 'cambiado'],
      ['capitulos/03-metodo.md', 'nuevo'],
    ]);
    // Sin commit de cierre después de la revisión, se compara con el último de antes: nada cambió en los documentos
    expect(mapa.cambios.baseMemoria).toBe(git(memoria, 'rev-parse', 'HEAD'));
    expect(mapa.cambios.documentos).toEqual([]);
    expect(mapa.documentos).toHaveLength(1);
    expect(mapa.documentos[0]).toMatchObject({ titulo: 'El planteamiento de la tesis', lectura: 'por leer', decisiones: 1, creado: ANTES });
    expect(mapa.documentos[0].partes.map((p) => [p.titulo, p.decisiones ?? []])).toEqual([['1. Lo que entendí', []], ['2. El alcance', ['1. El método']]]);
    const lineas = lineasDelMapa(mapa).join('\n');
    expect(lineas).toContain('  - nuevo · capitulos/03-metodo.md');
    expect(lineas).toContain('«Metodología»');
    expect(lineas).toContain('  - cambiado · bibliografia.bib');
    expect(lineas).toContain('«3 referencias»');
    expect(lineas).toContain('0 documentos del director cambiados');
    expect(lineas).toContain('docs/director/planteamiento.md «El planteamiento de la tesis» · por leer: titular (el que sigue) · 2 partes: «1. Lo que entendí», «2. El alcance» (1 por decidir)');

    // Sin revisión anterior (un proyecto que empieza): todo es nuevo, y se dice así
    const nuevo = await calcularMapa({ proyecto: 'tesis', repo, memoria, plan: { ...plan, revisado: '' }, estado: estadoVacio(), personas: ['titular'] });
    expect(nuevo.cambios).toMatchObject({ desde: null, base: null, archivos: [], documentos: [] });
    expect(lineasDelMapa(nuevo).join('\n')).toContain('No hay revisión anterior: todo es nuevo para el director (6 archivos del repositorio y 1 documento del plan).');
  }, 60_000);

  it('un repositorio sin commits de antes de la revisión es todo nuevo; sin repositorio ni memoria, el mapa lo dice y sigue', async () => {
    const repo = repositorio('reciente');
    const HTML = '<title>El sitio</title>\n';
    escribir(repo, 'index.html', HTML);
    commit(repo, DESPUES, 'El sitio');
    const plan = planCon({ revisado: REVISADO, documentos: [{ ruta: DIAG, titulo: 'Diagnóstico', porQue: '' }] });
    const reciente = await calcularMapa({ proyecto: 'sitio', repo, memoria: null, plan, estado: estadoVacio(), personas: ['titular'] });
    expect(reciente.cambios).toMatchObject({ repositorioNuevo: true, base: null, archivos: [] });
    expect(reciente.instantanea).toEqual([{ ruta: 'index.html', bytes: HTML.length, cambio: DESPUES, titulo: 'El sitio' }]);
    expect(reciente.avisos).toEqual(['La memoria del proyecto no está en este computador (o no es de git): el mapa va sin lo que cambió en los documentos del director.']);
    expect(lineasDelMapa(reciente).join('\n')).toContain('todo el repositorio es nuevo (1 archivo)');

    const nada = await calcularMapa({ proyecto: 'sitio', repo: null, memoria: null, plan, estado: estadoVacio(), personas: ['titular'] });
    expect(nada.repositorio).toBeNull();
    expect(nada.instantanea).toEqual([]);
    expect(nada.avisos).toHaveLength(2);
    expect(nada.documentos).toMatchObject([{ ruta: DIAG, existe: false, lectura: 'sin misión' }]);
    expect(lineasDelMapa(nada).join('\n')).toContain('- ⚠ El repositorio no está conectado en este computador');
  }, 60_000);
});
