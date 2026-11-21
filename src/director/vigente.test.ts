import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buscar, piezasDelProyecto } from './buscar';
import { historialDeDecisiones } from './historial';
import { indiceDelPlan } from './mapa';
import { vigentesDeHoy } from './paquete';
import { decisionesVigentes, notasReemplazadas, reemplazosRotos, YA_LO_DIJE, type EstadoDirector, type Nota, type Plan } from './director';

// Lo vigente, el primer bloque del paquete de cada revisión (decidido el 23 de octubre de 2026 en «El paquete de cada
// revisión», parte 10; pedido pd_lo_vigente): las decisiones de los documentos que siguen en firme, calculadas por el código
const decide = (id: string, cuando: string, decision: string, postura?: Nota['sobre']['postura'], doc = 'docs/director/a.md', seccion = '2. Algo'): Nota =>
  ({ id, cuando, quien: 'titular', sobre: { tipo: 'documento', id: doc, seccion, decision, postura }, texto: `nota ${id}` }) as Nota;

describe('lo vigente: las decisiones en firme de los documentos', () => {
  it('cada decisión la deja su última nota; un comentario no la decide; lo que no es una decisión no entra', () => {
    const notas = [
      decide('n1', '2026-10-20T10:00:00.000Z', '1. El orden', 'aprueba'),
      decide('n2', '2026-10-21T10:00:00.000Z', '1. El orden', 'decide'),
      decide('n3', '2026-10-22T10:00:00.000Z', '2. La voz', 'comenta'),
      decide('n4', '2026-10-19T10:00:00.000Z', '2. La voz'),
      { id: 'n5', cuando: '2026-10-23T10:00:00.000Z', quien: 'titular', sobre: { tipo: 'mision', id: 't_x', seccion: 'Paso 1' }, texto: 'otra cosa' } as Nota,
    ];
    expect(decisionesVigentes({}, notas).map((n) => n.id)).toEqual(['n4', 'n2']);
  });

  it('la que deja sin efecto una de otra parte lo dice en su respuesta, y la reemplazada sale; la bandeja lo pone al comienzo', () => {
    const notas = [
      decide('vieja', '2026-10-20T10:00:00.000Z', '1. El equipo', 'aprueba', 'docs/director/ruta.md'),
      decide('nueva', '2026-10-24T10:00:00.000Z', '3. El equipo después', 'decide', 'docs/director/otro.md'),
    ];
    const respuestas = { nueva: { cuando: '2026-10-24T12:00:00.000Z', texto: 'El equipo queda para después.', reemplaza: ['vieja'] } };
    expect(decisionesVigentes(respuestas, notas).map((n) => n.id)).toEqual(['nueva']);
    const bandeja = readFileSync(join(__dirname, '..', '..', 'tools', 'director', 'bandeja.ts'), 'utf-8');
    expect(bandeja.indexOf('## What is in force')).toBeGreaterThan(0);
    expect(bandeja.indexOf('## What is in force')).toBeLessThan(bandeja.indexOf('## Start stage'));
    expect(bandeja).toContain('decisionesVigentes(plan.respuestas ?? {}, estado.notas)');
  });
});

// Lo que se eligió en un paso también vale, y también se reemplaza (decisión del titular en t_decide_reemplaza, 3 de
// noviembre de 2026: «La marcas tú al responder»; pedido pd_reemplaza_elecciones)
const elige = (id: string, cuando: string, eleccion: string, mision = 't_linea', seccion = 'Paso 1'): Nota =>
  ({ id, cuando, quien: 'titular', sobre: { tipo: 'mision', id: mision, seccion, eleccion }, texto: '' }) as Nota;

describe('lo vigente: las opciones elegidas en los pasos, y lo que las reemplaza', () => {
  it('una opción elegida está en firme; otra del mismo paso la deja sola; «Ya te lo dije» no elige nada', () => {
    const notas = [
      elige('e1', '2026-11-01T10:00:00.000Z', 'Funciona bien así'),
      elige('e2', '2026-11-02T10:00:00.000Z', 'Aún salta'),
      elige('e3', '2026-11-02T11:00:00.000Z', YA_LO_DIJE, 't_otra'),
      elige('e4', '2026-11-02T12:00:00.000Z', 'El globo', 't_rama'),
    ];
    expect(decisionesVigentes({}, notas).map((n) => n.id)).toEqual(['e2', 'e4']);
  });

  it('la elección que una respuesta reemplaza sale de lo vigente, y el cierre acepta ese reemplazo', () => {
    const notas = [
      elige('vieja', '2026-11-01T10:00:00.000Z', 'Funciona bien así'),
      { id: 'nueva', cuando: '2026-11-03T10:00:00.000Z', quien: 'titular', sobre: { tipo: 'mision', id: 't_otra', seccion: 'Paso 2' }, texto: 'Ya no: que no salte' } as Nota,
      { id: 'plana', cuando: '2026-10-30T10:00:00.000Z', quien: 'titular', sobre: { tipo: 'general' }, texto: 'Una idea suelta' } as Nota,
      decide('doc', '2026-10-29T10:00:00.000Z', '1. El orden', 'aprueba'),
    ];
    const respuestas = { nueva: { cuando: '2026-11-03T12:00:00.000Z', texto: 'Queda lo nuevo.', reemplaza: ['vieja', 'plana', 'doc'] } };
    expect(decisionesVigentes({}, notas).map((n) => n.id)).toEqual(['doc', 'vieja']);
    expect(decisionesVigentes(respuestas, notas).map((n) => n.id)).toEqual([]);
    expect(notasReemplazadas(respuestas)).toEqual(new Map([['vieja', 'nueva'], ['plana', 'nueva'], ['doc', 'nueva']]));
    // El cierre: una elección, una nota cualquiera y una decisión, anteriores, valen
    expect(reemplazosRotos(respuestas, notas, '2026-11-03T00:00:00.000Z')).toEqual([]);
    // Ella misma, una que no existe o una posterior, no; y lo de antes de esta revisión no se mira
    const rotas = { nueva: { cuando: '2026-11-03T12:00:00.000Z', texto: '…', reemplaza: ['nueva', 'nmno_existe'] }, plana: { cuando: '2026-11-03T12:00:00.000Z', texto: '…', reemplaza: ['nueva'] } };
    expect(reemplazosRotos(rotas, notas, '2026-11-03T00:00:00.000Z')).toEqual(['nueva → nueva', 'nueva → nmno_existe', 'plana → nueva']);
    expect(reemplazosRotos(rotas, notas, '2026-11-04T00:00:00.000Z')).toEqual([]);
    const bandeja = readFileSync(join(__dirname, '..', '..', 'tools', 'director', 'bandeja.ts'), 'utf-8');
    expect(bandeja).toContain('reemplazosRotos(plan.respuestas ?? {}, estado.notas, desde)');
  });

  it('buscar dice que una nota reemplazada ya no manda, y el Buzón la marca «Reemplazado»', () => {
    const plan = { respuestas: { vieja: { cuando: '2026-11-01T12:00:00.000Z', texto: 'Así queda.' }, nueva: { cuando: '2026-11-03T12:00:00.000Z', texto: 'Cambia.', reemplaza: ['vieja'] } } } as unknown as Plan;
    const estado = { notas: [elige('vieja', '2026-11-01T10:00:00.000Z', 'Funciona bien así'), elige('nueva', '2026-11-03T10:00:00.000Z', 'Aún salta', 't_otra')], propuestas: {} } as unknown as EstadoDirector;
    const piezas = piezasDelProyecto(plan, estado);
    expect(piezas.find((p) => p.id === 'vieja')?.estado).toContain('replaced by nueva');
    expect(piezas.find((p) => p.id === 'vieja')?.titulo).toContain('Funciona bien así');
    expect(piezas.find((p) => p.id === 'nueva')?.hilo).toContain('replaces vieja');
    const buzon = readFileSync(join(__dirname, '..', '..', 'estudio', 'src', 'vistaBuzon.ts'), 'utf-8');
    expect(buzon).toContain('export function marcaReemplazada(');
    const app = readFileSync(join(__dirname, '..', '..', 'estudio', 'src', 'app.ts'), 'utf-8');
    expect(app).toContain('marcaReemplazada(n, d.plan.respuestas)');
  });
});

// Lo reemplazado no viaja al modelo (nota del titular nmw0z4jgdtit, 3 de noviembre de 2026: «no hacemos nada si solamente
// la marcamos como reemplazado, pero igual la enviamos como contexto»): cada camino por donde le llega contexto al director,
// uno por uno. Solo se encuentra buscándola por su id.
describe('lo reemplazado no llega a ningún contexto del director', () => {
  const leer = (...ruta: string[]) => readFileSync(join(__dirname, '..', '..', ...ruta), 'utf-8');
  const notas = [
    decide('vieja', '2026-10-20T10:00:00.000Z', '1. El orden del globo', 'decide'),
    decide('nueva', '2026-11-03T10:00:00.000Z', '2. Otra forma del globo', 'decide', 'docs/director/b.md'),
  ];
  notas[0].texto = 'Quiero el globo morado';
  notas[1].texto = 'Mejor el globo verde';
  const respuestas = { vieja: { cuando: '2026-10-21T10:00:00.000Z', texto: 'El globo queda morado.' }, nueva: { cuando: '2026-11-03T12:00:00.000Z', texto: 'El globo queda verde.', reemplaza: ['vieja'] } };
  const plan = { respuestas, propuestas: [], pedidos: [], misiones: [], fases: [], revisiones: {} } as unknown as Plan;
  const estado = { notas, propuestas: {}, entregas: {} } as unknown as EstadoDirector;

  it('«What is in force» y el paquete de la revisión (vigentesDeHoy) solo reciben lo vigente', () => {
    const vigentes = decisionesVigentes(respuestas, notas);
    expect(vigentes.map((n) => n.id)).toEqual(['nueva']);
    // Aunque lo de hoy nombre la reemplazada, el paquete parte de lo vigente
    const { enteras, otras } = vigentesDeHoy(vigentes, new Set(['vieja', 'docs/director/a.md']), '2026-10-01T00:00:00.000Z');
    expect([...enteras.map((n) => n.id), ...otras.flatMap((o) => o.ids)]).not.toContain('vieja');
    const bandeja = leer('tools', 'director', 'bandeja.ts');
    expect(bandeja).toContain('const vigentes = decisionesVigentes(plan.respuestas ?? {}, estado.notas)');
    expect(bandeja).toContain('vigentesDeHoy(vigentes, hoy');
  });

  it('buscar.ts no la trae por palabras; por su id, sí, con quién la reemplazó', () => {
    const piezas = piezasDelProyecto(plan, estado);
    expect(buscar(piezas, 'globo morado').map((h) => h.id)).not.toContain('vieja');
    expect(buscar(piezas, 'globo').map((h) => h.id)).toEqual(['nueva']);
    const porId = buscar(piezas, 'vieja');
    expect(porId.map((h) => h.id)).toEqual(['vieja']);
    expect(porId[0].estado).toContain('replaced by nueva');
  });

  it('el historial de la bandeja cuenta la decisión reemplazada, pero no muestra lo que dijo', () => {
    const h = historialDeDecisiones(plan, estado);
    expect(h.decisiones.conSusPalabras).toBe(2);
    expect(h.distinto.map((x) => x.dijo)).toEqual(['Mejor el globo verde']);
  });

  it('el mapa, la cola de la bandeja, la corrida, el ayudante y los procedimientos no la nombran', () => {
    // El mapa: sus notas no unen documentos; su índice del plan no lleva el texto de ninguna nota
    expect(leer('src', 'director', 'mapa.ts')).toContain('(estado.notas ?? []).filter((x) => !reemplazadas.has(x.id))');
    const indice = indiceDelPlan({ ...plan, pedidos: [{ id: 'pd_x', fase: 'f', texto: 'El globo', notas: ['vieja', 'nueva'] }] } as unknown as Plan, estado).join('\n');
    expect(indice).not.toContain('morado');
    // La cola de la bandeja nombra las notas de cada pedido sin las reemplazadas
    expect(leer('tools', 'director', 'bandeja.ts')).toContain('.filter((id) => !notasFuera.has(id))');
    // La corrida solo le da a quien califica lo que cambió en la revisión; el ayudante y los procedimientos no leen notas
    expect(leer('src', 'director', 'corrida.ts')).not.toMatch(/estado\.notas|decisionesVigentes/);
    expect(leer('src', 'director', 'ayudante.ts')).not.toMatch(/notas|respuestas/);
    expect(leer('src', 'director', 'procedimientos.ts')).not.toMatch(/estado\.notas|respuestas/);
  });
});
