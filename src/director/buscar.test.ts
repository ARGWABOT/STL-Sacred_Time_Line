import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import planPlantilla from '../../plantilla/plan.json';
import { buscar, piezasDelProyecto, piezasPendientes, pistasSinAtender, puedeQueYaEsteHecho, raices, raizDe } from './buscar';
import { ejecutadasSinCommit, estadoVacio, origenesQueNoExisten, type Plan } from './director';

const plantilla = planPlantilla as unknown as Plan;
const firma = { fecha: '2026-10-20T10:00:00Z', quien: 'titular' };

function planDePrueba(): Plan {
  const base: Plan['misiones'][number] = { id: 't_x', para: 'titular', fase: 'arranque', frente: 'direccion', xp: 10, titulo: 'X', porQue: 'Por qué', pasos: ['Hazlo'], entrega: 'Hecho' };
  return {
    ...plantilla,
    propuestas: [
      { id: 'pr_chat', area: 'web', titulo: 'El chat con el director', problema: 'No hay cómo preguntarle rápido', propuesta: 'Una ventana pequeña para preguntar', conecta: 'El Buzón', fase: 'arranque' },
      { id: 'pr_sonidos', area: 'web', titulo: 'Los sonidos del Studio', problema: 'Todo es mudo', propuesta: 'Un sonido por momento', conecta: 'La interfaz', fase: 'arranque' },
      { id: 'pr_voz', area: 'web', titulo: 'La voz sin WSL', problema: 'La transcripción pide WSL', propuesta: 'Transcribir en Windows y en Mac', conecta: 'transcripcion.ts', fase: 'arranque' },
    ],
    ejecutadas: { pr_sonidos: { cuando: '2026-10-21T10:00:00Z', nota: 'Commit abc1234: los sonidos' } },
    pedidos: [
      { id: 'pd_ejemplo', fase: 'arranque', texto: 'Un proyecto de ejemplo para instalar', notas: ['n1'] },
      { id: 'pd_semilla', fase: 'arranque', texto: 'El Studio llega como su propio proyecto al instalarlo', reemplaza: ['pd_ejemplo'] },
    ],
    misiones: [
      { ...base, id: 't_instalacion', titulo: 'Prueba la instalación en otro computador', porQue: 'Lo que mide la puerta' },
      { ...base, id: 't_leer', titulo: 'Lee el diagnóstico', porQue: 'Base de todo' },
    ],
    revisiones: { t_leer: { cuando: '2026-10-19T10:00:00Z', veredicto: 'aprobada', comentario: 'Bien' } },
    respuestas: { n1: { cuando: '2026-10-22T10:00:00Z', texto: 'Queda el proyecto de ejemplo como pedido.', tratamiento: 'aplazada' } },
  };
}

describe('lo ya hecho, a una consulta (pr_memoria_consultable, punto 2)', () => {
  it('las raíces juntan las formas de una palabra, sin tildes ni palabras vacías', () => {
    expect(['instalación', 'instalar', 'instalado', 'instalaciones', 'instalarlo'].map((p) => raices(p)[0])).toEqual(['instal', 'instal', 'instal', 'instal', 'instal']);
    expect(raizDe('pedirselo')).toBe(raizDe('pedir'));
    expect(raices('Las caritas automáticas')).toEqual(raices('carita automática'));
    expect(raices('de la que el en y')).toEqual([]);
    // Un id es una sola palabra, y una palabra corta no pierde su raíz
    expect(raices('pd_lo_vigente nota tipo')).toEqual(['pd_lo_vigent', 'nota', 'tipo']);
  });

  it('cada hallazgo dice en qué estado está, en su grupo, con su hilo', () => {
    const p = planDePrueba();
    const e = estadoVacio();
    e.propuestas = { pr_chat: { estado: 'aceptada', ...firma }, pr_sonidos: { estado: 'aceptada', ...firma } };
    e.notas = [{ id: 'n1', cuando: '2026-10-22T09:00:00Z', quien: 'titular', sobre: { tipo: 'general' }, texto: 'Quiero un proyecto de ejemplo' }];
    const piezas = piezasDelProyecto(p, e, [{ hash: 'def5678', cuando: '2026-10-23T10:00:00Z', asunto: 'STL: la instalación de las voces' }]);
    const de = (consulta: string) => buscar(piezas, consulta).map((h) => [h.id, h.grupo]);
    // Lo ejecutado está hecho; lo aceptado, previsto; lo de la semilla, previsto, y lo que reemplazó, cerrado
    expect(de('sonidos')).toEqual([['pr_sonidos', 'hecho']]);
    expect(de('chat ventana')).toEqual([['pr_chat', 'previsto']]);
    const ejemplo = buscar(piezas, 'proyecto de ejemplo');
    expect(ejemplo.find((h) => h.id === 'pd_ejemplo')).toMatchObject({ grupo: 'hecho', estado: 'pedido reemplazado por pd_semilla', hilo: ['notas n1'] });
    expect(ejemplo.find((h) => h.id === 'n1')).toMatchObject({ grupo: 'respondido', estado: 'respuesta del 2026-10-22 · aplazada' });
    // La instalación: la misión abierta es de ahora, el commit está hecho y el pedido de la semilla, previsto
    const instalar = buscar(piezas, 'instalar').map((h) => [h.id, h.grupo]);
    expect(instalar).toEqual(expect.arrayContaining([['def5678', 'hecho'], ['t_instalacion', 'ahora'], ['pd_semilla', 'previsto']]));
    expect(instalar.findIndex(([, g]) => g === 'hecho')).toBeLessThan(instalar.findIndex(([, g]) => g === 'ahora'));
    // La misión aprobada está hecha, y lo previsto de la fase (de la plantilla) va aparte; sin palabras, nada; y lo que
    // nada nombra no sale
    const diagnostico = de('diagnóstico');
    expect(diagnostico[0]).toEqual(['t_leer', 'hecho']);
    expect(diagnostico.slice(1).every(([id, g]) => String(id).startsWith('arranque#') && g === 'previsto')).toBe(true);
    expect(buscar(piezas, 'de la')).toEqual([]);
    expect(de('helicóptero')).toEqual([]);
  });

  it('lo más parecido va primero dentro de su grupo, y cada grupo trae a lo sumo los que se piden', () => {
    const p = planDePrueba();
    const e = estadoVacio();
    p.pedidos = Array.from({ length: 12 }, (_, i) => ({ id: `pd_${i}`, fase: 'arranque', texto: i === 7 ? 'La voz, la voz y otra vez la voz' : `Algo de la voz número ${i} con mucho más texto alrededor para alargarlo` }));
    const hallazgos = buscar(piezasDelProyecto(p, e), 'voz', 5);
    const previstos = hallazgos.filter((h) => h.grupo === 'previsto');
    expect(previstos).toHaveLength(5);
    expect(previstos[0].id).toBe('pd_7');
    expect(previstos[0].fragmento).toMatch(/voz/);
  });
});

describe('los hilos de lo hecho, explícitos (pr_memoria_consultable, punto 1)', () => {
  it('el origen de una misión escrita en esta revisión existe: una nota, una propuesta, un pedido o una misión, y no ella misma', () => {
    const p = planDePrueba();
    const notas = [{ id: 'n1' }];
    const con = (origen: string[]) => origenesQueNoExisten({ ...p, misiones: [{ ...p.misiones[0], origen }, p.misiones[1]] }, notas, p);
    expect(con(['n1', 'pr_chat', 'pd_semilla', 't_leer'])).toEqual([]);
    expect(con(['n9', 't_instalacion'])).toEqual([{ id: 't_instalacion', origen: 'n9' }, { id: 't_instalacion', origen: 't_instalacion' }]);
    // Lo ya guardado igual no se vuelve a exigir (una nota de entonces pudo borrarse después)
    const guardado = { ...p, misiones: [{ ...p.misiones[0], origen: ['n9'] }] };
    expect(origenesQueNoExisten({ ...p, misiones: [{ ...p.misiones[0], origen: ['n9'] }] }, notas, guardado)).toEqual([]);
    // Y el buscador lo muestra en su hilo
    const piezas = piezasDelProyecto({ ...p, misiones: [{ ...p.misiones[0], origen: ['n1'] }] }, estadoVacio());
    expect(piezas.find((x) => x.id === 't_instalacion')?.hilo).toEqual(['nace de n1']);
  });

  it('cada propuesta ejecutada en esta revisión nombra un commit que existe; las de antes, no se tocan', () => {
    const p = planDePrueba();
    const existe = (h: string) => h === 'abc1234';
    const con = (nota: string, cuando = '2026-10-27T16:00:00Z') => ejecutadasSinCommit({ ...p, ejecutadas: { pr_chat: { cuando, nota } } }, '2026-10-27T15:00:00Z', existe);
    expect(con('Commit local abc1234: el chat')).toEqual([]);
    expect(con('Hecho en esta revisión, con su prueba')).toEqual(['pr_chat']);
    expect(con('Commit local 9999999: no existe')).toEqual(['pr_chat']);
    expect(con('Sin commit', '2026-10-20T10:00:00Z')).toEqual([]);
    // El cierre lo exige
    const bandeja = readFileSync(join(__dirname, '../../tools/director/bandeja.ts'), 'utf-8');
    expect(bandeja).toContain('origenesQueNoExisten(completo, estado.notas, guardado)');
    expect(bandeja).toContain('ejecutadasSinCommit(plan, desde, existeCommit)');
  });
});

describe('puede que ya esté hecho (pr_memoria_consultable, punto 3)', () => {
  const commit = (hash: string, asunto: string) => ({ hash, cuando: '2026-10-27T15:00:00Z', asunto });

  it('lo pendiente es lo aceptado sin ejecutar y lo pedido sin hacer, sin lo reemplazado', () => {
    const p = planDePrueba();
    const e = estadoVacio();
    e.propuestas = { pr_chat: { estado: 'aceptada', ...firma }, pr_sonidos: { estado: 'aceptada', ...firma }, pr_voz: { estado: 'descartada', ...firma } };
    expect(piezasPendientes(p, e).map((x) => x.id).sort()).toEqual(['pd_semilla', 'pr_chat']);
  });

  it('un commit que nombra un pendiente por su id es su evidencia; uno que se le parece de verdad, también; uno de otra cosa, no', () => {
    const p = planDePrueba();
    const e = estadoVacio();
    e.propuestas = { pr_chat: { estado: 'aceptada', ...firma }, pr_voz: { estado: 'aceptada', ...firma } };
    p.pedidos!.push({ id: 'pd_lineas', fase: 'arranque', texto: 'Una línea por cada revisión de este computador, sacada de su registro sin modelo: cuándo, cuánto duró y gastó, si cerró' });
    const pendientes = piezasPendientes(p, e);
    const pistas = puedeQueYaEsteHecho(pendientes, [
      // Lo nombra al final de un asunto largo, como los commits del producto
      commit('a1', `STL: ${'una explicación larga de lo hecho, '.repeat(6)}primera pieza de pd_semilla, con su prueba`),
      // No nombra nada, pero dice lo mismo que el pedido de las líneas
      commit('b2', 'STL: cada revisión de este computador en una línea, sacada de su registro sin modelo, con cuánto duró y gastó'),
      // De otra cosa: no se le pega a nada aunque comparta alguna palabra
      commit('c3', 'STL: el dibujo de la portada con sus colores nuevos, más claro en el teléfono'),
    ]);
    expect(pistas).toEqual([
      { id: 'pd_semilla', titulo: expect.any(String), evidencia: [{ hash: 'a1', asunto: expect.stringContaining('pd_semilla'), como: 'lo nombra' }] },
      { id: 'pd_lineas', titulo: expect.any(String), evidencia: [{ hash: 'b2', asunto: expect.any(String), como: 'se le parece' }] },
    ]);
    // Un id que contiene a otro no cuenta como nombrarlo, y sin commits no hay pistas
    expect(puedeQueYaEsteHecho(pendientes, [commit('d4', 'STL: pr_chat_nuevo, otra cosa')])).toEqual([]);
    expect(puedeQueYaEsteHecho(pendientes, [])).toEqual([]);
  });

  it('una pista se atiende nombrando su id en lo que el director dejó dicho en alDia en esta revisión; si no, --listo no cierra', () => {
    const pistas = [{ id: 'pd_semilla', titulo: 'La semilla', evidencia: [] }, { id: 'pr_chat', titulo: 'El chat', evidencia: [] }];
    expect(pistasSinAtender(pistas, { cuando: '2026-10-27T16:00:00Z', nota: 'pd_semilla queda a medias: falta su prueba.' }, '2026-10-27T15:00:00Z').map((x) => x.id)).toEqual(['pr_chat']);
    // Lo dicho en una revisión anterior no vale para esta
    expect(pistasSinAtender(pistas, { cuando: '2026-10-26T16:00:00Z', nota: 'pd_semilla y pr_chat' }, '2026-10-27T15:00:00Z')).toHaveLength(2);
    expect(pistasSinAtender(pistas, undefined, '2026-10-27T15:00:00Z')).toHaveLength(2);
    // La bandeja las lista y --listo las exige, con el asunto entero de cada commit (lo pendiente se nombra al final)
    const bandeja = readFileSync(join(__dirname, '../../tools/director/bandeja.ts'), 'utf-8');
    expect(bandeja.match(/puedeQueYaEsteHecho\(piezasPendientes\((plan|completo), estado\), commitsDesde\(repo\?\.ruta, desde, 0\)\)/g)).toHaveLength(2);
    expect(bandeja).toContain('pistasSinAtender(puedeQueYaEsteHecho(');
  });
});
