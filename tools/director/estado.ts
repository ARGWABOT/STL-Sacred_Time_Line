// Lo que dice el Director asistente antes de empezar una tarea en el repositorio del proyecto. Cada sesión de Claude
// que trabaje en el proyecto lo corre con el frente o las rutas que va a tocar: si el frente está en espera en la fase
// en curso, lo dice al titular antes de empezar y, si sigue, se registra la excepción con su razón (Estudio ›
// Frentes). Las rutas pueden ser relativas al repositorio o completas.
// Uso: node <Estudio>/tools/director/estado.ts                    → la fase en curso, los frentes y lo que falta para la puerta
//      node <Estudio>/tools/director/estado.ts api src/server/x.ts → qué toca cada frente o cada ruta en esta fase
//      … --proyecto <id>                                        → de otro proyecto que el activo
import { isAbsolute, relative } from 'node:path';
import { avanceFase, estadoMision, etapaArranque, evaluar, excepcionesActivas, faseActual, frenteDeRuta, hoy, NIVELES, trabajoDe } from '../../src/director/director.ts';
import { argumentos, leerTodo, nombreDe } from './comun.ts';

const { args, pedido } = argumentos();
const { plan, proyecto, estado, personas, repo } = await leerTodo(pedido);
const fase = faseActual(plan, estado);
const dia = hoy();
const NOMBRE = { foco: 'EN FOCO', apoyo: 'DE APOYO', espera: 'EN ESPERA' };
const nombreFrente = (id: string) => plan.frentes.find((f) => f.id === id)?.nombre ?? id;
const senales = { proyecto: { objetivo: !!proyecto.objetivo?.firmado } };

console.log(`Director asistente · ${proyecto.nombre || 'proyecto sin nombre'} · fase ${plan.fases.indexOf(fase)} de ${plan.fases.length - 1}: ${fase.nombre} (${fase.etapa})`);
console.log(`Meta: ${fase.meta}`);
if (proyecto.objetivo) console.log(`Objetivo firmado: ${proyecto.objetivo.texto} (éxito: ${proyecto.objetivo.exito})`);
const etapa = etapaArranque(plan, proyecto, !!repo);
if (etapa !== 'en_marcha') console.log(`Arranque: ${etapa}. Hasta tener la ruta trazada, todo frente técnico está en espera.`);

const pedidos = args;
if (!pedidos.length) {
  const av = avanceFase(fase, { plan, estado, senales });
  console.log(`\nPara cruzar «${fase.puerta.nombre}»: ${av.cumplidos} de ${av.total} criterios al 100 %. Pendientes:`);
  for (const c of fase.criterios) if (!evaluar(c, fase, { plan, estado, senales }).cumplido) console.log(`  - ${c.texto}${c.indicador ? ' (se mide solo en el Estudio)' : ''}`);
  for (const n of NIVELES) {
    const frentes = plan.frentes.filter((f) => trabajoDe(fase, f.id).nivel === n);
    if (!frentes.length) continue;
    console.log(`\n${NOMBRE[n]}:`);
    for (const f of frentes) console.log(`  ${f.nombre} (${f.id}): ${trabajoDe(fase, f.id).que}`);
  }
  const excepciones = excepcionesActivas(estado, dia);
  if (excepciones.length) {
    console.log('\nExcepciones abiertas:');
    for (const x of excepciones) console.log(`  ${nombreFrente(x.frente)}, hasta el ${x.hasta} (${x.quien}): ${x.motivo}`);
  }
  console.log('\nLa misión de ahora de cada uno (Estudio › Misiones):');
  for (const p of personas) {
    const abiertas = (plan.misiones ?? []).filter((m) => m.para === p && ['pendiente', 'en_curso', 'rehacer'].includes(estadoMision(m, plan, estado)));
    console.log(`  ${nombreDe(proyecto, p)}: ${abiertas[0] ? `«${abiertas[0].titulo}»${abiertas.length > 1 ? ` (y ${abiertas.length - 1} en cola)` : ''}` : 'ninguna'}`);
  }
  const sinResponder = plan.propuestas.filter((p) => !estado.propuestas[p.id]);
  if (sinResponder.length) console.log(`\nPropuestas del director por decidir: ${sinResponder.map((p) => p.titulo).join('; ')}.`);
} else {
  let enEspera = false;
  for (const pedido of pedidos) {
    let ruta = pedido;
    if (isAbsolute(pedido) && repo) ruta = relative(repo.ruta, pedido).split('\\').join('/');
    const id = plan.frentes.some((f) => f.id === pedido) ? pedido : frenteDeRuta(plan, ruta);
    if (id === 'otros') {
      console.log(`\n${pedido}: no es de ningún frente${etapa !== 'en_marcha' ? ' (la ruta aún no reparte el repositorio en frentes)' : ''}.`);
      if (etapa !== 'en_marcha') enEspera = true;
      continue;
    }
    const t = trabajoDe(fase, id);
    const x = excepcionesActivas(estado, dia, id)[0];
    console.log(`\n${pedido === id ? '' : `${pedido} → `}${nombreFrente(id)}: ${NOMBRE[t.nivel]}. ${t.que}`);
    if (x) console.log(`  Tiene una excepción abierta hasta el ${x.hasta} (${x.quien}): ${x.motivo}`);
    else if (t.nivel === 'espera') enEspera = true;
  }
  if (enEspera) {
    console.log('\nHay trabajo EN ESPERA sin excepción. Antes de empezar, díselo al titular. Si decide seguir, registra la excepción');
    console.log('con su razón en el Estudio (Director asistente › Frentes › Registrar una excepción).');
  }
}
