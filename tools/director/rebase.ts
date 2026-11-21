// El ensayo del rebase de la memoria (pedido pd_rebase_memoria): cuenta cuántas notas cerradas se podrían borrar de la
// memoria del proyecto, sin borrar ninguna (nmwfntv5vtit: nunca sin un «Confirmo» con el conteo a la vista). Quien borra es
// el Studio, el único que escribe director/equipo/, tras el «Confirmo».
// Uso: node tools/director/rebase.ts [--proyecto <id>]
import { conteoDeRebase, notasBorrables } from '../../src/director/rebase.ts';
import { argumentos, leerTodo } from './comun.ts';

const { pedido } = argumentos();
const { id, plan, estado, proyecto } = await leerTodo(pedido, false);
const c = conteoDeRebase(estado.notas, plan);
console.log(`# Rebase dry-run · ${proyecto.nombre || id} (${id})`);
console.log(`Deletable closed notes: ${c.borrables} of ${c.total} (${c.quedan} stay). Nothing is deleted: the Studio deletes them only after the owner's «I confirm», with this count in view, now and at the end of each phase.`);
if (c.borrables) {
  const ids = notasBorrables(estado.notas, plan);
  console.log(`First ids: ${ids.slice(0, 20).join(', ')}${ids.length > 20 ? ', …' : ''}`);
}
