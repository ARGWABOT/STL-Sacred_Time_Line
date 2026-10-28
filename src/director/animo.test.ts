import { describe, expect, it } from 'vitest';
import planPlantilla from '../../plantilla/plan.json';
import { ANIMO, celebracion, destinoDeMision, frasesDelDirector, logrosDe, PARA_QUE_SIRVE, seccionesConAlgo, siguientePendiente } from './animo';
import { estadoVacio, type Integrante, type Mision, type Plan } from './director';

const plan = planPlantilla as unknown as Plan;
const equipo: Integrante[] = [
  { id: 'titular', nombre: 'Laura', correo: 'laura@ejemplo.co' },
  { id: 'ana', nombre: 'Ana', correo: 'ana@ejemplo.co' },
];
const ctx = (p: Plan = plan) => ({ plan: p, estado: estadoVacio(), senales: {} });

describe('el director asistente flotante', () => {
  it('lleva a la primera misión abierta de cada persona', () => {
    expect(siguientePendiente(ctx(), 'titular', 'conectar')).toMatchObject({ tipo: 'mision', mision: { id: 't_conectar' } });
    expect(siguientePendiente(ctx(), 'ana').tipo).toBe('buzon');
  });

  it('sin misiones, en el arranque lleva al titular a conectar el repositorio o a fijar su meta', () => {
    const sin: Plan = { ...plan, misiones: [] };
    expect(siguientePendiente(ctx(sin), 'titular', 'conectar')).toMatchObject({ tipo: 'proyecto', texto: 'conectar el repositorio' });
    expect(siguientePendiente(ctx(sin), 'titular', 'objetivo')).toMatchObject({ tipo: 'proyecto', texto: 'fijar tu meta' });
    expect(siguientePendiente(ctx(sin), 'ana', 'objetivo').tipo).toBe('buzon');
    const conPropuesta: Plan = { ...sin, propuestas: [{ id: 'p1', area: 'Producto', titulo: 'Cobrar', problema: '', propuesta: '', conecta: '', fase: 'arranque' }] };
    expect(siguientePendiente(ctx(conPropuesta), 'titular').tipo).toBe('propuestas');
  });

  it('si lo que sigue en la misión es leer un documento, lleva directo a él; si no, a la tarjeta', () => {
    const m: Mision = {
      id: 't_ruta', para: 'titular', fase: 'arranque', frente: 'direccion', titulo: 'Lee la ruta', porQue: '', entrega: '', xp: 10,
      pasos: [
        'Prueba el doble clic.',
        { texto: 'Lee la ruta.', ir: { doc: 'docs/director/ruta.md', etiqueta: 'Leer la ruta' } },
        { texto: 'Responde las propuestas.', ir: { vista: 'propuestas', etiqueta: 'Ver las propuestas' } },
      ],
    };
    expect(destinoDeMision(m, [])).toMatchObject({ vista: 'misiones', ancla: 'mision-t_ruta' });
    expect(destinoDeMision(m, [0])).toEqual({ doc: 'docs/director/ruta.md', etiqueta: 'Leer la ruta' });
    expect(destinoDeMision(m, [0, 1])).toMatchObject({ vista: 'misiones', ancla: 'mision-t_ruta' });
    expect(destinoDeMision(m, [0, 1, 2])).toMatchObject({ vista: 'misiones' });
  });

  it('un paso que lleva a mirar algo y se responde en la tarjeta, ya abierto, vuelve a la tarjeta (nota de voz del titular nmvofxfv0tit)', () => {
    const m: Mision = {
      id: 't_ver', para: 'titular', fase: 'arranque', frente: 'direccion', titulo: 'Mira la niebla', porQue: '', entrega: '', xp: 10,
      pasos: [
        { texto: 'Abre el documento y mira la niebla. ¿Se ve así?', ir: { doc: 'repo:CLAUDE.md', seccion: 'Un solo canal', etiqueta: 'Abrir CLAUDE.md' }, opciones: ['Sí', 'No'] },
        { texto: 'Lee la ruta.', ir: { doc: 'docs/director/ruta.md', etiqueta: 'Leer la ruta' }, hecho: { que: 'leido', id: 'docs/director/ruta.md' } },
      ],
    };
    // Sin abrir, al documento; ya abierto, a la tarjeta, donde se elige cómo fue
    expect(destinoDeMision(m, [])).toMatchObject({ doc: 'repo:CLAUDE.md' });
    expect(destinoDeMision(m, [], [0])).toMatchObject({ vista: 'misiones', ancla: 'mision-t_ver' });
    // Leer un documento lo marca el Studio solo: aunque ya se abrió, lo que sigue es leerlo
    expect(destinoDeMision(m, [0], [0, 1])).toMatchObject({ doc: 'docs/director/ruta.md' });
  });

  it('celebra una vez lo aprobado: la XP, el nivel que sube y los logros nuevos', () => {
    const misiones: Mision[] = [60, 50].map((xp, i) => ({ id: `m${i}`, para: 'titular', fase: 'arranque', frente: 'direccion', titulo: `Misión ${i}`, porQue: '', pasos: [], entrega: '', xp }));
    const aprobada = { cuando: '2026-10-17T10:00:00Z', veredicto: 'aprobada' as const, comentario: 'Bien.' };
    const p: Plan = { ...plan, misiones, revisiones: { m0: aprobada } };
    expect(logrosDe(ctx(p), 'titular').filter((l) => l.ganado).map((l) => l.id)).toEqual(['primera']);
    const primera = celebracion(ctx(p), 'titular', []);
    expect(primera).toMatchObject({ xp: 60, subeA: null, misiones: [{ id: 'm0' }] });
    expect(primera!.logros.map((l) => l.id)).toEqual(['primera']);
    expect(celebracion(ctx(p), 'titular', ['m0'])).toBeNull();
    const dos: Plan = { ...p, revisiones: { m0: aprobada, m1: aprobada } };
    expect(celebracion(ctx(dos), 'titular', ['m0'])).toMatchObject({ xp: 50, subeA: 2, logros: [] });
    expect(celebracion(ctx(dos), 'ana', [])).toBeNull();
  });

  it('intercala lo que empuja con el ánimo, y con una persona elegida solo habla de ella', () => {
    const laura = frasesDelDirector(ctx(), 'titular', equipo, 'conectar');
    expect(laura[0]).toMatchObject({ empuja: true });
    expect(laura[0].texto).toMatch(/^Laura, conéctame/);
    expect(laura.filter((f) => f.empuja).every((f) => !f.texto.startsWith('Ana'))).toBe(true);
    expect(laura.some((f) => ANIMO.some((a) => a.texto === f.texto))).toBe(true);
    const todos = frasesDelDirector(ctx(), null, equipo, 'en_marcha');
    expect(todos.some((f) => f.texto.startsWith('Laura'))).toBe(true);
    expect(todos.some((f) => f.texto.startsWith('Ana'))).toBe(true);
  });

  it('las secciones aparecen cuando tienen algo: preguntas hechas, la ruta trazada, documentos o propuestas', () => {
    const vacio: Plan = { ...plan, fases: plan.fases.slice(0, 1), documentos: [], propuestas: [] };
    expect(seccionesConAlgo(ctx(vacio))).toEqual([]);
    const lleno: Plan = {
      ...vacio,
      fases: [...vacio.fases, { ...vacio.fases[0], id: 'mvp' }],
      documentos: [{ ruta: 'docs/director/diagnostico.md', titulo: 'Diagnóstico', porQue: '' }],
      propuestas: [{ id: 'p1', area: 'Producto', titulo: 'Cobrar', problema: '', propuesta: '', conecta: '', fase: 'arranque' }],
    };
    const estado = estadoVacio();
    estado.notas.push({ id: 'n1', cuando: '2026-10-21T00:00:00Z', quien: 'Laura', texto: '¿Cuánto falta?', sobre: { tipo: 'pregunta' } } as (typeof estado.notas)[number]);
    expect(seccionesConAlgo({ plan: lleno, estado })).toEqual(['preguntas', 'ruta', 'documentos', 'propuestas']);
    expect(Object.keys(PARA_QUE_SIRVE)).toEqual(['preguntas', 'ruta', 'documentos', 'propuestas']);
  });
});
