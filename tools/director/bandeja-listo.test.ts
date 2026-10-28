// El cierre de la revisión, de punta a punta (pieza 1 de la propuesta aceptada «Pruebas donde fallaron los procesos que
// escriben», pr_pruebas_procesos): `node tools/director/bandeja.ts --listo` corrido de verdad, como proceso aparte (el
// mismo que corre el director), sobre un Estudio y un proyecto temporales. Lo que se comprueba es lo que ve quien depende
// de él: que un plan incompleto NO se cierra (sale con error y dice por qué, sin tocar el plan ni marcar la revisión) y
// que, corregido, SÍ se cierra (sale con 0, deja `plan.revisado` y marca `revision.hecha` en estudio.local.json, que es lo
// que el Studio lee como «revisión hecha»). Las pruebas de director.ts miran cada regla suelta; esta mira que la
// herramienta que las junta y escribe el plan siga cerrando y siga frenando.
//
// El Estudio temporal: la plantilla, un repositorio con su memoria (.stl, rama stl) abierta y el proyecto creado como lo
// crea el Studio, una nota del equipo sin responder y una revisión en curso (lo que deja la bandeja al empezar). La
// herramienta busca su Estudio con STL_RAIZ (tools/director/comun.ts): aquí apunta a la carpeta temporal, nunca al real.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { Nota, Plan, Respuesta } from '../../src/director/director.ts';
import { armarEstudioDePrueba } from './estudioDePrueba.ts';

/** Un id que no existe en ningún Estudio real: si la herramienta no usara el Estudio temporal, se negaría («No hay un proyecto»). */
const ID = 'prueba-cierre';
const NOTA = 'n_cierre_1';

const base = mkdtempSync(join(tmpdir(), 'estudio-listo-'));
afterAll(() => rmSync(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));

/**
 * Un Estudio temporal con un proyecto recién entregado y una revisión en curso, con una nota del titular sin responder
 * (escrita antes de que empezara la revisión, así que la revisión no puede cerrar sin atenderla).
 */
async function armar() {
  const nota = { id: NOTA, cuando: '2026-10-01T10:00:00.000Z', quien: 'titular', sobre: { tipo: 'general' }, texto: 'Deja anotado que el piloto es con diez clientes.' } as Nota;
  const e = await armarEstudioDePrueba(base, { id: ID, notas: [nota] });
  return {
    ...e,
    /** Corre la herramienta de verdad, como proceso aparte, contra este Estudio temporal. */
    cerrar() {
      const r = e.bandeja('--listo');
      expect(r.error, 'la herramienta no pudo correr').toBeUndefined();
      expect(r.errores, 'la herramienta no usó el Estudio temporal').not.toContain('No hay un proyecto');
      return { codigo: r.codigo, salida: r.salida, errores: r.errores };
    },
  };
}
type Estudio = Awaited<ReturnType<typeof armar>>;

const ahora = () => new Date().toISOString();
/** Lo que escribe el director al final de la revisión: «Dónde quedamos» y su comentario. */
const resumenYMensaje = (p: Plan) => {
  p.resumen = { fecha: ahora(), avanzamos: ['Se probó el cierre de la revisión de punta a punta, sobre un proyecto temporal.'], quedamos: 'El proyecto de prueba está en su arranque.' };
  p.mensaje = { fecha: ahora().slice(0, 10), texto: '- **Sobre la prueba:** el cierre se comprobó sin tocar el Estudio real.' };
};
const responder = (p: Plan, r: Omit<Respuesta, 'cuando'>) => { p.respuestas[NOTA] = { cuando: ahora(), ...r }; };

/** No cerró: error, con el porqué, y ni el plan ni la revisión cambiaron. */
async function noCierra(e: Estudio, motivos: (string | RegExp)[]) {
  const antes = e.textoDelPlan();
  const r = e.cerrar();
  expect(r.codigo, `debía negarse a cerrar; imprimió: ${r.salida}`).toBe(1);
  expect(r.errores).toContain('No se cerró la revisión');
  for (const m of motivos) expect(r.errores).toMatch(m instanceof RegExp ? m : new RegExp(m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  expect(r.salida).not.toContain('Revisión marcada');
  expect(e.textoDelPlan(), 'un cierre que no cierra no toca el plan').toBe(antes);
  expect(e.plan().revisado).toBe('');
  const rev = await e.revision();
  expect(rev?.enCurso).toBeTruthy();
  expect(rev?.hecha, 'el Studio no debe ver la revisión como hecha').toBeUndefined();
}

/** Cerró: sale con 0, deja `revisado` en el plan y marca la revisión hecha, que es lo que lee el Studio. */
async function cierra(e: Estudio) {
  const desde = Date.now() - 2000;
  const r = e.cerrar();
  expect(r.codigo, `debía cerrar; dijo: ${r.errores}`).toBe(0);
  const revisado = e.plan().revisado;
  expect(Date.parse(revisado)).toBeGreaterThan(desde);
  expect(Date.parse(revisado)).toBeLessThanOrEqual(Date.now());
  expect(r.salida).toContain(`Revisión marcada: ${revisado}`);
  const rev = await e.revision();
  expect(rev).toMatchObject({ proyecto: ID, quien: 'titular', origen: 'cabecera' });
  expect(Date.parse(rev!.hecha!)).toBeGreaterThan(desde);
  // Lo escrito por el director sigue ahí: cerrar solo marca la revisión
  expect(e.plan().resumen?.avanzamos).toHaveLength(1);
}

describe('bandeja.ts --listo, de punta a punta sobre un Estudio temporal', () => {
  it('con una nota sin respuesta no cierra y dice cuál; respondida, cierra y marca la revisión hecha', async () => {
    const e = await armar();
    e.cambiarPlan(resumenYMensaje);
    await noCierra(e, ['quedó sin atender algo que llegó antes de empezarla', `- la nota ${NOTA}`]);
    e.cambiarPlan((p) => responder(p, { texto: 'Anotado: el piloto es con diez clientes.', tratamiento: 'informada' }));
    await cierra(e);
  }, 60_000);

  it('una respuesta que integra algo al plan sin decir dónde quedó no cierra; con su «Quedó en», cierra', async () => {
    const e = await armar();
    e.cambiarPlan((p) => { resumenYMensaje(p); responder(p, { texto: 'Lo integré al contexto del proyecto.', tratamiento: 'integrada' }); });
    await noCierra(e, ['no dicen dónde quedó', `- ${NOTA}`]);
    e.cambiarPlan((p) => { p.respuestas[NOTA].destino = { vista: 'proyecto', ancla: 'p-contexto', etiqueta: 'Ver el contexto' }; });
    await cierra(e);
  }, 60_000);

  it('un plan con errores no cierra y los lista; corregido, cierra', async () => {
    const e = await armar();
    e.cambiarPlan((p) => { resumenYMensaje(p); responder(p, { texto: 'Anotado.', tratamiento: 'informada' }); p.misiones[0].frente = 'no-existe'; });
    await noCierra(e, ['el plan tiene errores', 'nombra el frente «no-existe», que no está']);
    e.cambiarPlan((p) => { p.misiones[0].frente = 'direccion'; });
    await cierra(e);
  }, 60_000);

  it('sin reescribir «Dónde quedamos» no cierra; con el resumen de esta revisión, cierra', async () => {
    const e = await armar();
    e.cambiarPlan((p) => responder(p, { texto: 'Anotado.', tratamiento: 'informada' }));
    await noCierra(e, ['el resumen «Dónde quedamos»', 'no se reescribió en esta revisión']);
    e.cambiarPlan(resumenYMensaje);
    await cierra(e);
  }, 60_000);
});
