// La bandeja del Director asistente: todo lo que el equipo dejó para el director en el PROYECTO ACTIVO desde su última
// revisión, y lo que toca en su arranque. Es lo primero que corre la sesión del director cuando el titular dice «revisa
// lo que hay para el director» (o «revisa STL»): transcribe en local los audios nuevos (tools/director/transcribir.py),
// guarda el mapa del proyecto en su memoria (director/mapa.json, tools/director/mapa.ts) y lista lo que cambió desde
// la última revisión, la etapa del arranque, las entregas por revisar, las notas sin respuesta y las decisiones del
// equipo. Solo atiende el proyecto activo (el que está elegido en el Estudio de este computador, o el de --proyecto
// <id>); los demás conservan su buzón y su historial para cuando les toque. El director responde en la memoria del
// proyecto, en su repositorio (<repositorio>/.stl/director/plan.json: revisiones, respuestas, evaluacion, misiones,
// mensaje y boletin), y al terminar corre esto con --listo y hace su commit en esa memoria (rama stl).
// Uso: node tools/director/bandeja.ts                  → transcribe y lista
//      node tools/director/bandeja.ts --sin-transcribir
//      node tools/director/bandeja.ts --listo          → marca la revisión como hecha (plan.revisado = ahora)
//      node tools/director/bandeja.ts --proyecto <id>  → otro proyecto que el activo (combinable con lo anterior)
//      node tools/director/bandeja.ts --pedida         → ¿pidieron una revisión desde el Studio? Imprime el id del
//                                                         proyecto y sale con 0; si no, «nada» y 1. Sin leer nada más:
//                                                         es lo que mira la sesión del director en su ciclo (/vigila).
//      node tools/director/bandeja.ts --aclarar        → el paso que alguien no entendió («No lo entiendo»): solo eso,
//                                                         sin el resto de la revisión; con --listo, la cierra.
//      node tools/director/bandeja.ts --urgente        → las notas urgentes que el Studio lanzó solas, al instante: solo
//                                                         eso; con --listo, la cierra.
// Corrida por el director que lanzó el Studio (con STL_REGISTRO), lo que imprime, menos el cierre, queda también en el
// paquete de esa revisión, junto a su registro (src/director/paquete.ts).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {
  aclaracionesDe,
  EN_VUELTAS,
  archivar,
  juntarArchivos,
  partirArchivoPorMes,
  comentarioDe,
  commitsALaVista,
  misionesDeFuturo,
  misionesQuePidenSeguir,
  comienzoDeLaRevision,
  destinosDeNota,
  decisionesVigentes,
  decideDecision,
  lineasReescritas,
  aceptadasSinEjecutar,
  mensajeRepite,
  mensajeRepiteAnterior,
  misionesPorVigilar,
  negacionesDe,
  unirArchivo,
  type ArchivoPlan,
  type CommitReciente,
  type Plan,
  documentosDeMision,
  documentosEnOrden,
  documentosPorCerrar,
  esPregunta,
  hilosDePreguntas,
  ideasSueltas,
  loQueDejo,
  estadoMision,
  etapaArranque,
  faseActual,
  misionesAbiertas,
  reservaDeMisiones,
  reservaSinRazon,
  MOTIVOS_LOTE_CORTO,
  RAZON_RESERVA_MINIMA,
  colaDelDirector,
  MAX_MIN_REVISION,
  TOPE_MIN_TRAMO,
  tramoPorCerrar,
  colaSinOrden,
  esperaA,
  RESERVA_MINIMA,
  pasosPorComprobar,
  pasosSinMarcar,
  DESPUES,
  pasosSinBoton,
  pedidoFueraDelStudio,
  aplazadasSinPedido,
  adelantadoConPendiente,
  pendientePorComprobar,
  pendientesDelDirector,
  ejecutadasSinCommit,
  enUnaLinea,
  origenesQueNoExisten,
  reemplazos,
  respuestasALaFaseEntera,
  respuestasSinDestino,
  resumenPorCerrar,
  sinAtenderAlCerrar,
  selladosQueCambiaron,
  tratamientosDeNota,
  tratamientosQueNoCaben,
  validarEstado,
  validarPlan,
  validarProyecto,
  YA_LO_DIJE,
} from '../../src/director/director.ts';
import { piezasPendientes, pistasSinAtender, puedeQueYaEsteHecho } from '../../src/director/buscar.ts';
import { fechaDeCambio, igualQueEntonces, leerFresco, leerFrescosTexto } from '../../src/director/fresco.ts';
import { lineasDelMapa, sinCommitDeGit } from '../../src/director/mapa.ts';
import { aplicarParche } from '../../src/director/parche.ts';
import { CARPETA, corteDeRevision, enDisco as enDiscoDe, escribirDeUnaVez, guardarHuella, planCambiadoTrasCierre, leerLocal, leerRutaRepositorio, marcarAclaracion, marcarRevision, marcarUrgencia, marcarVigilia, reintentoDe, rutasDe, seguidasActivas, ubicar, urgenciaActiva } from '../../src/director/proyectos.ts';
import { archivoDelCandado, MIN_CANDADO_SESION, quienLoTiene, renovarCandado, soltarCandado, tomarCandado, type Candado } from '../../src/director/candado.ts';
import { audioBorrable, borrarSiTranscrito, comandoTranscripcion, limpiarTranscrito, quitarSiVacia, txtDeAudio } from '../../src/director/transcripcion.ts';
import { bandejaDelPaquete, copiarSalida, DIAS_FUERA_DEL_STUDIO, idsPorFase, separadorDeBandeja, VARIABLE_REGISTRO } from '../../src/director/paquete.ts';
import { historialDeDecisiones, lineasDelHistorial } from '../../src/director/historial.ts';
import { lineasDeMedicion, type Corrida } from '../../src/director/corrida.ts';
import { PROCEDIMIENTOS, procedimientosDeLaRevision } from '../../src/director/procedimientos.ts';
import { firmaDelProyecto, FORMATO_LOG, sinFirmaPorAtender, type Firma } from '../firma.ts';
import { argumentos, colaDeDiagnosticos, leerTodo, memoria, nombreDe, otrosProyectos, POR_REVISION, proyectoElegido, raiz } from './comun.ts';
import { guardarMapa, mapaDe, rutaDelMapa } from './mapa.ts';

const { args, pedido } = argumentos();
/** Hasta cuánto puede pesar el plan antes de que la bandeja avise. */
const TOPE_PLAN_KB = 256;

type Sello = Parameters<typeof selladosQueCambiaron>;
/**
 * Un documento sellado que se devolvió a como se leyó no cambió, aunque su último commit sea posterior a la entrega: si
 * su texto de hoy es el que tenía al entregarse cada misión que lo selló (igualQueEntonces), sale de `cambiado`. Sin
 * esto, el freno pedía devolverlo como estaba y, devuelto, seguía sin dejar cerrar (revisión del 24 de octubre de 2026).
 * `ubicacion`: la ruta del Estudio de cada documento del plan.
 */
async function sinLosDevueltos(p: Sello[0], e: Sello[1], cambiado: Sello[2], ubicacion: (ruta: string) => string): Promise<void> {
  const entregas = new Map<string, string[]>();
  for (const x of selladosQueCambiaron(p, e, cambiado)) {
    const hecha = e.entregas[x.mision.id]?.cuando ?? p.revisiones?.[x.mision.id]?.cuando;
    if (hecha && !x.ruta.startsWith('repo:')) entregas.set(x.ruta, [...(entregas.get(x.ruta) ?? []), hecha]);
  }
  for (const [ruta, cuando] of entregas) {
    const propio = ubicacion(ruta);
    if (!existsSync(enDiscoDe(raiz, propio))) continue;
    const texto = readFileSync(enDiscoDe(raiz, propio), 'utf8');
    if ((await Promise.all(cuando.map((f) => igualQueEntonces(raiz, propio, f, texto)))).every(Boolean)) delete cambiado[ruta];
  }
}

// El paquete de la revisión (pedido del titular del 23 de octubre de 2026): si la corre el director que lanzó el Studio
// (STL_REGISTRO), lo que imprime queda también junto a su registro, para revisarlo y medirlo. Lo que se imprime no cambia
const copia = bandejaDelPaquete(process.env[VARIABLE_REGISTRO], raiz, args);
if (copia) copiarSalida(copia, separadorDeBandeja(process.argv.slice(2)));

/**
 * Un director a la vez en cada proyecto (pedido pd_un_director; la regla inviolable del titular, 22 de octubre de 2026):
 * la bandeja toma el candado del proyecto al empezar una revisión, una urgencia o una aclaración. El director que lanzó el
 * Studio lo reconoce por su registro (lo tomó el lanzador, que lo suelta cuando él termina, después de su commit); la
 * sesión del director, que corre «revisa estudio» a mano, lo toma a su nombre y lo suelta al cerrar, y así el Studio no
 * lanza otro a su lado. Si lo tiene otro director que sigue trabajando, no empieza: dos a la vez sobre el mismo plan se pisan.
 */
const yo = { estudio: raiz, registro: process.env[VARIABLE_REGISTRO] || null };
async function candadoDe(proyecto: string): Promise<string | null> {
  const repositorio = await leerRutaRepositorio(raiz, proyecto).catch(() => null);
  return repositorio ? archivoDelCandado(repositorio) : null;
}
/** Hasta cuándo vale el candado que toma o renueva esta bandeja: la sesión, lo suyo; el director lanzado, su tope. */
const horaDelCandado = () => new Date(Date.now() + (yo.registro ? TOPE_MIN_TRAMO + 10 : MIN_CANDADO_SESION) * 60_000).toISOString();
function noEmpiezo(de: Candado, que: string): never {
  const hasta = new Date(de.hasta).toLocaleString('es-CO', { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'long' });
  console.error(`${que}: ${quienLoTiene(de, yo)}, y trabaja un director a la vez en cada proyecto (dos sobre el mismo plan se pisan). Espera a que cierre; si ya no trabaja y no cerró, el candado se suelta solo ${de.quien === 'studio' ? 'cuando su proceso ya no existe, o ' : ''}el ${hasta}.`);
  process.exit(1);
}
async function tomarElCandado(proyecto: string, tipo: Candado['tipo']): Promise<void> {
  const r = tomarCandado(await candadoDe(proyecto), { quien: yo.registro ? 'studio' : 'sesion', estudio: raiz, proyecto, tipo, desde: new Date().toISOString(), hasta: horaDelCandado(), ...(yo.registro ? { registro: yo.registro } : {}) });
  if (!r.tomado) noEmpiezo(r.de, 'No empiezo');
}
/** La sesión del director lo suelta al cerrar; el del director lanzado lo suelta el lanzador cuando él termina. */
async function soltarElCandado(proyecto: string): Promise<void> {
  if (!yo.registro) soltarCandado(await candadoDe(proyecto), yo);
}

if (args.includes('--pedida')) {
  // Que el Studio sepa que alguien está mirando (o que nadie mira, si esto deja de correr)
  await marcarVigilia(raiz);
  const r = (await leerLocal(raiz)).revision;
  // La que lanzó el Studio la está haciendo otro director: solo si no terminó (con error), la toma esta sesión
  if (r && !r.hecha && !r.lanzada) {
    console.log(`${r.proyecto}${r.enCurso ? ' (en curso)' : ''} · pedida por ${r.quien} el ${new Date(r.pedida).toLocaleString('es-CO')}`);
    process.exit(0);
  }
  console.log('nada');
  process.exit(1);
}

// El plan, con cambios puntuales (pr_encargo_a_medida, punto 1): el director escribe solo lo que cambia en un parche, en
// su memoria (director/cambios.json, o la ruta que diga), y aquí se junta con el plan (src/director/parche.ts). Se guarda
// solo si no le suma errores; así no hace falta leer el plan entero para cambiarlo
if (args.includes('--aplicar')) {
  const elegido = await proyectoElegido(pedido);
  // Si otro director trabaja en el proyecto, no se escribe a su lado; si el candado es de quien aplica, se renueva
  const renovado = renovarCandado(await candadoDe(elegido), yo, horaDelCandado());
  if (!renovado.tomado) noEmpiezo(renovado.de, 'No se aplicó');
  const dada = args[args.indexOf('--aplicar') + 1];
  const rutaParche = dada && !dada.startsWith('--') ? resolve(dada) : join(memoria(elegido), 'director', 'cambios.json');
  const rutaPlan = enDiscoDe(raiz, rutasDe(elegido).plan);
  let parche: unknown;
  try {
    parche = JSON.parse(readFileSync(rutaParche, 'utf-8'));
  } catch (e) {
    console.error(`No se aplicó: no pude leer el parche ${rutaParche} (${(e as Error).message}).`);
    process.exit(1);
  }
  const plan: Plan = JSON.parse(readFileSync(rutaPlan, 'utf-8'));
  const { proyecto } = await leerTodo(pedido, false);
  const equipo = proyecto.equipo.length ? proyecto.equipo.map((i) => i.id) : undefined;
  const r = aplicarParche(plan, parche);
  const antes = new Set(validarPlan(plan, equipo));
  const nuevos = r.errores.length ? r.errores : validarPlan(r.plan, equipo).filter((e) => !antes.has(e));
  if (nuevos.length) {
    console.error(`No se aplicó: ${r.errores.length ? 'esto del parche no se entiende' : 'el plan quedaría con estos errores'} (el plan sigue como estaba):`);
    for (const e of nuevos) console.error(`- ${e}`);
    process.exit(1);
  }
  await escribirDeUnaVez(rutaPlan, JSON.stringify(r.plan, null, 2) + '\n');
  console.log(`Aplicado a ${rutasDe(elegido).plan}:\n${r.hecho.map((h) => `- ${h}`).join('\n')}\nEl parche (${rutaParche}) no se guarda en la memoria: sobrescríbelo para el siguiente cambio.`);
  process.exit(0);
}

// «No lo entiendo, explícamelo mejor»: solo ese paso, una ida y vuelta corta, sin el resto de la revisión
if (args.includes('--aclarar')) {
  const elegido = await proyectoElegido(pedido);
  const { plan, estado, proyecto } = await leerTodo(pedido, false);
  const local = await leerLocal(raiz);
  const a = local.aclaracion?.proyecto === elegido ? local.aclaracion : undefined;
  if (!a || a.error) {
    console.error(a?.error ? `Esa aclaración ya no se hace aquí (${a.error}): la nota espera la revisión.` : 'No hay ninguna aclaración pedida para este proyecto.');
    process.exit(1);
  }
  const respuesta = plan.respuestas?.[a.nota];
  if (args.includes('--listo')) {
    const errores = validarPlan(plan, proyecto.equipo.length ? proyecto.equipo.map((i) => i.id) : undefined);
    if (!respuesta || !respuesta.destino || errores.length) {
      if (!respuesta) console.error(`No se cerró la aclaración: falta la respuesta a la nota ${a.nota}.`);
      else if (!respuesta.destino) console.error(`No se cerró la aclaración: la respuesta a ${a.nota} no dice dónde quedó (\`destino\`: el botón a la misión).`);
      for (const e of errores) console.error(`- ${e}`);
      process.exit(1);
    }
    await guardarHuella(raiz, elegido);
    await marcarAclaracion(raiz, a.nota, 'hecha');
    await soltarElCandado(elegido);
    console.log(`Aclaración hecha: ${a.nota}`);
    process.exit(0);
  }
  await tomarElCandado(elegido, 'aclaracion');
  const m = plan.misiones.find((x) => x.id === a.mision);
  const nota = estado.notas.find((n) => n.id === a.nota);
  if (!m || !nota) {
    console.error('La misión o la nota de la aclaración ya no están.');
    process.exit(1);
  }
  const p = m.pasos[a.paso];
  const previas = aclaracionesDe(estado.notas, m.id, a.paso).filter((n) => n.id !== nota.id);
  const marcados = new Set(estado.pasos?.[m.id]?.hechos ?? []);
  const l = (s = '') => console.log(s);
  l(`# Aclaración de un paso · ${proyecto.nombre} (${elegido})`);
  l(`${nota.quien} no entendió este paso y oprimió «${previas.length ? 'Aún no lo entiendo, detállalo más' : 'No lo entiendo, explícamelo mejor'}». Es una ida y vuelta corta: atiende SOLO esto.`);
  l(`Las demás notas, entregas y documentos esperan la revisión siguiente: no las respondas ni cambies nada más del plan.`);
  // «Retomarla» de una aclaración que no se cerró: lo que esa dejó no se rehace (pr_retoma_automatica, punto 5)
  if (a.reintento) {
    l('\n## La aclaración anterior no se cerró: retómala');
    l(`La que lanzó el Studio el ${new Date(a.reintento.lanzada).toLocaleString('es-CO')} no se cerró${a.reintento.registro ? ` (su registro: ${a.reintento.registro})` : ''}. Lo que dejó está hecho: termina solo lo que falta.`);
    for (const x of lineasDeRetoma(elegido, plan, a.reintento.lanzada, (await leerRutaRepositorio(raiz, elegido)) ?? undefined, 'haz la aclaración completa')) l(x);
  }
  l(`\n## La misión «${m.titulo}» (${m.id}), para ${nombreDe(proyecto, m.para)}`);
  l(`- Por qué: ${m.porQue}`);
  l(`- Entrega: ${m.entrega}`);
  m.pasos.forEach((x, i) => l(`- ${i === a.paso ? '→ ' : ''}Paso ${i + 1}${marcados.has(i) ? ' (ya marcado)' : ''}: ${typeof x === 'string' ? x : x.texto}${typeof x !== 'string' && x.ir ? ` [botón: ${JSON.stringify(x.ir)}]` : ''}${typeof x !== 'string' && x.detalle?.length ? `\n    detalle: ${x.detalle.join(' | ')}` : ''}`));
  l(`\n## El paso que no entendió: el ${a.paso + 1}`);
  l(JSON.stringify(p, null, 2));
  if (previas.length) {
    l(`\nYa lo pidió ${previas.length} ${previas.length === 1 ? 'vez' : 'veces'} antes: ve un nivel más a fondo que la última vez. Es una señal de que el paso está mal escrito, no de que se leyó mal.`);
    for (const n of previas) if (plan.respuestas?.[n.id]) l(`- Lo que respondiste (${n.cuando}): ${plan.respuestas[n.id].texto.replace(/\s+/g, ' ')}`);
  }
  l(`\nLos formatos del plan (cómo es un paso: \`texto\`, \`detalle\`, \`ir\`, \`opciones\`…) están en ${PROCEDIMIENTOS.formatos.archivo}, y cómo se escribe un paso claro, en CLAUDE.md › «Llevar de la mano»: léelos antes de escribir.`);
  l(`\n## Qué hacer (en ${enDiscoDe(raiz, rutasDe(elegido).plan)})`);
  l(`1. Reescribe SOLO el paso ${a.paso + 1} de la misión ${m.id}, sin cambiar su número ni los demás pasos (los marcados van por número):`);
  l('   - `texto`: la acción, con el contexto que haga falta para entenderla sola: dónde está cada cosa (por su nombre exacto, entre «»), qué hacer y qué se ve al terminar.');
  l('   - `detalle`: si son varias acciones, la lista de las acciones más pequeñas, en orden, una frase cada una (el Studio las muestra dentro del paso).');
  l('   - Conserva su `ir` (o corrígelo si llevaba a un lugar equivocado) y su `hecho`, si los tiene.');
  l(`2. En \`respuestas\`, la de la nota ${a.nota}: \`{ "cuando": "<ISO ahora>", "tratamiento": "integrada", "texto": "<qué no estaba claro y cómo quedó, en una o dos frases>", "destino": { "vista": "misiones", "ancla": "mision-${m.id}", "etiqueta": "Ver el paso" } }\`. El Studio la muestra debajo del paso.`);
  l('3. No toques el mensaje, el resumen ni nada más: eso es de la revisión.');
  l(`4. Cierra: \`node tools/director/bandeja.ts --proyecto ${elegido} --aclarar --listo\` y el commit en la memoria: cd "${memoria(elegido)}", luego git add director/plan.json, luego git commit -m "Director (${elegido}): aclara el paso ${a.paso + 1} de ${m.id}" -- director/plan.json.`);
  process.exit(0);
}

// Lo urgente: solo esas notas, al instante, sin el resto de la revisión. El resultado vuelve como reporte en «Dónde
// quedamos»; si el titular tiene que comprobarlo, una sola misión: revisar el resultado
if (args.includes('--urgente')) {
  const elegido = await proyectoElegido(pedido);
  const local = await leerLocal(raiz);
  const u = local.urgencia?.proyecto === elegido && urgenciaActiva(local.urgencia) ? local.urgencia : undefined;
  if (!u) {
    console.error(local.urgencia?.error ? `Esa urgencia ya no se hace aquí (${local.urgencia.error}): las notas esperan la revisión.` : 'No hay ninguna urgencia pedida para este proyecto.');
    process.exit(1);
  }
  if (args.includes('--listo')) {
    const { plan, estado, proyecto } = await leerTodo(pedido, false);
    const errores = validarPlan(plan, proyecto.equipo.length ? proyecto.equipo.map((i) => i.id) : undefined);
    const sinRespuesta = u.notas.filter((n) => !plan.respuestas?.[n]);
    const sinDestino = respuestasSinDestino(plan, estado.notas.filter((n) => u.notas.includes(n.id)), u.pedida).filter((n) => u.notas.includes(n));
    const noCaben = tratamientosQueNoCaben(plan, estado.notas.filter((n) => u.notas.includes(n.id)), u.pedida);
    if (sinRespuesta.length || sinDestino.length || noCaben.length || errores.length) {
      for (const n of sinRespuesta) console.error(`No se cerró la urgencia: falta la respuesta a la nota ${n}.`);
      for (const n of sinDestino) console.error(`No se cerró la urgencia: la respuesta a ${n} no dice dónde quedó (\`destino\`).`);
      for (const x of noCaben) console.error(`No se cerró la urgencia: la respuesta a ${x.id} es «${x.tratamiento}», y a esa nota le caben ${x.caben.join(', ')}.`);
      for (const e of errores) console.error(`- ${e}`);
      process.exit(1);
    }
    await guardarHuella(raiz, elegido);
    await marcarUrgencia(raiz, u.pedida, 'hecha');
    await soltarElCandado(elegido);
    console.log(`Urgencia atendida: ${u.notas.join(', ')}`);
    process.exit(0);
  }
  await tomarElCandado(elegido, 'urgencia');
  // Un audio recién grabado: el Studio lo está transcribiendo; se espera un rato y, si no llega, se transcribe aquí
  const leido = await leerTodo(pedido, false);
  const urgentes = leido.estado.notas.filter((n) => u.notas.includes(n.id));
  const txt = (audio: string) => enDiscoDe(raiz, audio.replace(/\.[a-z0-9]+$/, '.txt'));
  const faltan = () => urgentes.map((n) => n.audio).filter((a): a is string => !!a && existsSync(enDiscoDe(raiz, a)) && !existsSync(txt(a)));
  for (let i = 0; i < 40 && faltan().length; i++) await new Promise((ok) => setTimeout(ok, 3000));
  const pendientes = faltan();
  if (pendientes.length) {
    const { cmd, args: argumentosT } = comandoTranscripcion(raiz, pendientes.map((a) => enDiscoDe(raiz, a)), `Notas para el director del proyecto ${leido.proyecto.nombre || elegido}.`);
    try {
      execFileSync(cmd, argumentosT, { stdio: 'inherit', shell: false });
    } catch (e) {
      console.error(`No se pudo transcribir: ${(e as Error).message}`);
    }
    // Lo que la transcripción inventa, fuera; y vacía no es su texto: el audio se queda para volver a intentarlo
    for (const a of pendientes) limpiarTranscrito(enDiscoDe(raiz, a));
    for (const a of pendientes) quitarSiVacia(enDiscoDe(raiz, a));
  }
  // Con su texto escrito, el audio se borra del disco (nunca entra a git)
  for (const n of urgentes) if (n.audio) borrarSiTranscrito(enDiscoDe(raiz, n.audio));
  const { plan, proyecto } = leido;
  const l = (s = '') => console.log(s);
  l(`# Urgencia · ${proyecto.nombre} (${elegido})`);
  l(`${u.quien} marcó ${urgentes.length === 1 ? 'esta nota' : 'estas notas'} como urgente${urgentes.length === 1 ? '' : 's'}, y el Studio te lanzó solo para ${urgentes.length === 1 ? 'ella' : 'ellas'}, al instante. Atiende SOLO esto: las demás notas, entregas y documentos esperan la revisión completa; no los respondas ni cambies nada más del plan.`);
  // «Retomarla» de una urgencia que no se cerró: lo que esa dejó no se rehace (pr_retoma_automatica, punto 5)
  if (u.reintento) {
    l('\n## La urgencia anterior no se cerró: retómala');
    l(`La que lanzó el Studio el ${new Date(u.reintento.lanzada).toLocaleString('es-CO')} no se cerró${u.reintento.registro ? ` (su registro: ${u.reintento.registro})` : ''}. Lo que dejó está hecho: termina solo lo que falta.`);
    for (const x of lineasDeRetoma(elegido, plan, u.reintento.lanzada, leido.repo?.ruta, 'atiende lo urgente completo')) l(x);
  }
  for (const n of urgentes) {
    const s = n.sobre;
    l(`\n## [${n.id}] ${n.quien}, ${n.cuando}, sobre ${s.tipo}${s.id ? ` ${s.id}` : ''}${s.seccion ? ` › ${s.seccion}` : ''}`);
    if (typeof n.urgente === 'string') l(`Por qué no puede esperar: ${n.urgente.replace(/\s+/g, ' ')}`);
    if (n.texto) l(n.texto);
    if (n.audio) l(`Audio (${n.audio}): ${existsSync(txt(n.audio)) ? readFileSync(txt(n.audio), 'utf-8').trim() : '(sin transcribir)'}`);
    for (const a of n.adjuntos ?? []) l(`Adjunto «${a.nombre}»: ${enDiscoDe(raiz, a.ruta)}`);
  }
  l('\n## Las misiones abiertas (la primera de cada uno es la que ve: no la dupliques ni la rompas)');
  for (const p of proyecto.equipo.length ? proyecto.equipo.map((i) => i.id) : ['titular'])
    for (const m of misionesAbiertas(plan, leido.estado, p)) l(`- ${m.id} (${nombreDe(proyecto, m.para)}): «${m.titulo}»`);
  // Lo que una urgencia necesita leer, aparte de CLAUDE.md: los formatos del plan y, si es el mismo Studio, su procedimiento
  const clave = (r: string) => r.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  const suyos = procedimientosDeLaRevision({ encargo: 'urgencia', etapa: '', esElStudio: !!leido.repo && clave(leido.repo.ruta) === clave(raiz) });
  l(`\nAntes de escribir, lee ${suyos.map((x) => `${PROCEDIMIENTOS[x].archivo} (${PROCEDIMIENTOS[x].para})`).join(' y ')}.`);
  l(`\n## Qué hacer (en ${enDiscoDe(raiz, rutasDe(elegido).plan)})`);
  l('1. Decide si de verdad es urgente. Si lo es y es un arreglo que el titular pidió o aprobó en el Studio, hazlo ya, con las normas del proyecto (pruebas en verde y commit local; nunca subas, despliegues ni borres). Si no es urgente, o no está aprobado, no lo hagas: explica en la respuesta qué va antes y por qué (la nota sigue su curso en la revisión siguiente, como cualquier otra).');
  l('2. El resultado es un REPORTE, no trabajo nuevo: agrégalo como primera línea de `resumen.avanzamos` (qué se resolvió y cómo se comprobó), sin tocar las demás líneas, y pon `resumen.fecha` en ahora. El Studio se lo muestra al titular en «¿Dónde quedamos?» como lo nuevo.');
  l('3. Una misión solo si el titular tiene que comprobar el resultado: «Revisa lo urgente», corta (uno o dos pasos, con su botón al lugar exacto y lo que debe ver), y ponla en `misiones` ANTES de su misión de ahora, para que sea la que ve. Nada más: lo que la urgencia revele por hacer va como propuesta o espera la revisión.');
  l(`4. En \`respuestas\`, la de ${urgentes.length === 1 ? 'la nota' : 'cada nota'}: \`{ "cuando": "<ISO ahora>", "tratamiento": "integrada" | "rechazada" | "aplazada", "texto": "<primero si de verdad era urgente; luego lo que hiciste y el resultado, o por qué no>", "destino": <si es integrada o aplazada: la misión «Revisa lo urgente» u otro lugar del plan> }\`.`);
  l('5. No toques el mensaje, las revisiones de misiones, la evaluación ni nada más: eso es de la revisión.');
  l(`6. Cierra: \`node tools/director/bandeja.ts --proyecto ${elegido} --urgente --listo\` y el commit en la memoria: cd "${memoria(elegido)}", luego git add director/plan.json, luego git commit -m "Director (${elegido}): atiende lo urgente" -- director/plan.json.`);
  process.exit(0);
}

if (args.includes('--listo')) {
  const elegido = await proyectoElegido(pedido);
  const rutaPlan = enDiscoDe(raiz, rutasDe(elegido).plan);
  const plan: Plan = JSON.parse(readFileSync(rutaPlan, 'utf-8'));
  // Lo archivado: el de una sola pieza, de antes, que ya no cambia, y los meses, que mandan sobre él («El plan liviano»)
  const rutaPrevio = enDiscoDe(raiz, rutasDe(elegido).archivo);
  const carpetaMeses = enDiscoDe(raiz, rutasDe(elegido).archivoMeses);
  const leerJson = (ruta: string) => JSON.parse(readFileSync(ruta, 'utf-8'));
  const previo: Partial<ArchivoPlan> | null = existsSync(rutaPrevio) ? leerJson(rutaPrevio) : null;
  const meses = existsSync(carpetaMeses) ? readdirSync(carpetaMeses).filter((f) => f.endsWith('.json')).sort() : [];
  const archivo: ArchivoPlan = juntarArchivos([...(previo ? [previo] : []), ...meses.map((f) => leerJson(join(carpetaMeses, f)))]);
  const completo = unirArchivo(plan, archivo);
  // El doble check: lo que esta revisión llevó al plan dice dónde quedó; si no, la revisión no se cierra
  const { estado, proyecto, repo } = await leerTodo(pedido, false);
  // Lo que el titular ya vio: el plan del último commit de la memoria, leído una vez para el comienzo de esta revisión
  // (correr --listo otra vez antes del commit no lo mueve), lo avanzado y el mensaje
  const guardado = planGuardado(rutasDe(elegido).plan);
  const desde = comienzoDeLaRevision(plan.revisado, guardado?.revisado);
  const sinDestino = respuestasSinDestino(plan, estado.notas, desde);
  if (sinDestino.length) {
    console.error('No se cerró la revisión: estas respuestas llevan algo al plan pero no dicen dónde quedó (`destino`: la misión, la propuesta, la fase o la parte del documento):');
    for (const id of sinDestino) console.error(`- ${id}`);
    process.exit(1);
  }
  // …con un tratamiento que su nota admite: la bandeja los da con cada una (decidir con un formulario, pd_formulario)
  const noCaben = tratamientosQueNoCaben(plan, estado.notas, desde);
  if (noCaben.length) {
    console.error('No se cerró la revisión: estas respuestas tienen un tratamiento que su nota no admite (un «Hazlo tú» o una decisión de un documento no se dan solo por informados; lo que eligió la persona o una pregunta no se rechazan):');
    for (const x of noCaben) console.error(`- ${x.id}: «${x.tratamiento}»; le caben ${x.caben.join(', ')}`);
    process.exit(1);
  }
  // …y lleva a su lugar exacto: una petición no se encuentra en la fase entera (auditoría del 22 de octubre de 2026)
  const aLaFase = respuestasALaFaseEntera(plan, desde);
  if (aLaFase.length) {
    console.error('No se cerró la revisión: estas respuestas integran o aplazan algo y su «Quedó en» lleva a la fase entera, donde no se encuentra. Llévalo a su lugar exacto: si pide trabajo, a su pedido (`ancla: "pedido-<id>"`); si es una propuesta, a ella (`propuesta-<id>`); si cambió el plan de la fase, a él (`ancla: "r-plan"`):');
    for (const id of aLaFase) console.error(`- ${id}`);
    process.exit(1);
  }
  // Nada sin atender (propuesta aceptada «El cierre no deja nada sin atender»): cada nota y cada entrega que llegó antes
  // de empezar la revisión tiene su respuesta o su veredicto; lo que llegó después espera la siguiente, como en la bandeja
  const corte = corteDeRevision(await leerLocal(raiz), elegido);
  const sinAtender = corte ? sinAtenderAlCerrar(completo, estado, corte) : { notas: [], entregas: [] };
  if (sinAtender.notas.length || sinAtender.entregas.length) {
    console.error('No se cerró la revisión: quedó sin atender algo que llegó antes de empezarla. Cada nota necesita su respuesta (en `respuestas`, con su tratamiento) y cada entrega su veredicto (en `revisiones`):');
    for (const id of sinAtender.notas) console.error(`- la nota ${id}`);
    for (const id of sinAtender.entregas) console.error(`- la entrega de la misión ${id}`);
    process.exit(1);
  }
  // Un plan con errores no sale de la revisión: el titular nunca debe verlos en el Studio. Tampoco uno que deja inválido
  // lo que el equipo ya guardó (una marca, una respuesta a una propuesta, una entrega): el servidor valida cada decisión
  // nueva con todo el estado contra este plan, y la rechazaría aunque la persona trabaje sola (pd_decision_guardada)
  const errores = [...validarPlan(completo, proyecto.equipo.length ? proyecto.equipo.map((i) => i.id) : undefined), ...validarEstado(estado, completo)];
  if (errores.length) {
    console.error('No se cerró la revisión: el plan tiene errores o deja inválido lo que el equipo ya guardó (y el Studio rechazaría sus decisiones siguientes). Corrígelos y vuelve a cerrar:');
    for (const e of errores) console.error(`- ${e}`);
    process.exit(1);
  }
  // Lo que ya se hizo no se vuelve a pedir: cada misión abierta con trabajo nuevo alrededor se comprobó en esta revisión
  const commitsAhora = commitsDesde(repo?.ruta, desde);
  const porVigilar = misionesPorVigilar(completo, estado, desde, commitsAhora);
  if (porVigilar.length) {
    console.error('No se cerró la revisión: desde la última hubo trabajo que puede dejar hecho algo de estas misiones abiertas. Por cada una, comprueba que nada de sus pasos ni de sus documentos ya se hizo o se decidió (si sí, sácalo), y ponle `"vigente": "<ISO ahora>"`:');
    for (const { mision, hubo } of porVigilar) console.error(`- ${mision.id} («${mision.titulo}»): ${hubo.length} cosa(s), como ${hubo.slice(0, 3).join('; ')}`);
    process.exit(1);
  }
  // …y lo mismo con todo lo pendiente del plan, no solo las misiones (notas de voz del titular, 22 de octubre de 2026)
  const porComprobar = pendientePorComprobar(completo, estado, desde, commitsAhora);
  if (porComprobar.propuestas.length || porComprobar.pedidos.length) {
    console.error(`No se cerró la revisión: desde la última hubo trabajo (${commitsAhora.length} commit(s)${commitsAhora.length ? `, como ${commitsAhora.slice(0, 3).map((c) => `${c.hash} ${c.asunto.slice(0, 60)}`).join('; ')}` : ''}) y lo pendiente del plan no se cruzó con él. Por cada propuesta aceptada y cada pedido de abajo, y por cada misión prevista de cada fase (\`fases[].misiones\`): si ya está hecho, va en \`ejecutadas\` o lleva \`hecho\`; si cambió, ponlo al día; si ya no va, sácalo. Después escribe \`"alDia": { "cuando": "<ISO ahora>", "nota": "<lo que comprobaste y lo que cambió>" }\`:`);
    for (const p of porComprobar.propuestas) console.error(`- la propuesta ${p.id} («${p.titulo}»)`);
    for (const p of porComprobar.pedidos) console.error(`- el pedido ${p.id} (${p.texto.slice(0, 80)}…)`);
    process.exit(1);
  }
  // …y lo que puede que ya esté hecho, con su evidencia, no se deja sin mirar (pr_memoria_consultable, punto 3)
  const sinMirar = pistasSinAtender(puedeQueYaEsteHecho(piezasPendientes(completo, estado), commitsDesde(repo?.ruta, desde, 0)), plan.alDia, desde);
  if (sinMirar.length) {
    console.error('No se cerró la revisión: un commit desde la última revisión nombra o se le parece de verdad a algo pendiente, y no lo atendiste. Por cada uno: si ya está hecho, va en `ejecutadas` o lleva `hecho`; si está a medias o no es lo mismo, dilo en `alDia`, nombrando su id:');
    for (const x of sinMirar) console.error(`- ${x.id} («${enUnaLinea(x.titulo, 80)}»): ${x.evidencia.map((e) => `${e.hash} ${e.como}`).join('; ')}`);
    process.exit(1);
  }
  // …y lo del producto de esta revisión, con la firma de publicación del proyecto desde el commit (pr_subida_limpia): uno
  // sin ella no se rehace, pero se nombra en `alDia` y su firma queda en la misión del titular, antes de publicarlo
  const comoClave = (r: string) => r.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  const firma = repo ? firmaDelProyecto((proyecto as { firma?: Partial<Firma> }).firma, comoClave(repo.ruta) === comoClave(raiz)) : null;
  if (firma && repo && desde) {
    let log = '';
    try {
      log = execFileSync('git', ['log', `--since=${desde}`, `--format=${FORMATO_LOG}`], { cwd: repo.ruta, encoding: 'utf8' });
    } catch {
      // sin git o sin historia, no hay commits que mirar
    }
    const sinFirma = sinFirmaPorAtender(log, firma, plan.alDia && plan.alDia.cuando >= desde ? plan.alDia.nota : '');
    if (sinFirma.length) {
      console.error(`No se cerró la revisión: estos commits del producto, de esta revisión, no llevan la firma de publicación del proyecto (${firma.nombre} <${firma.correo}>, autor y confirmador). Se hacen con node tools/director/firmar.ts. Ya hechos, no los rehagas: nómbralos en \`alDia\` (su código de siete letras) y deja en la misión del titular el paso de firmarlos antes de publicarlos (en el mismo Studio, node tools/subir-studio.ts --firmar, que guarda antes un respaldo):`);
      for (const c of sinFirma) console.error(`- ${c.hash.slice(0, 7)}: autor ${c.autor}, confirmador ${c.confirmador}`);
      process.exit(1);
    }
  }
  // Los documentos, bien cortados y sin tocar los ya revisados (propuesta aceptada «El cierre no deja nada sin atender»,
  // parte 2): lo que antes la bandeja solo avisaba, ahora no deja cerrar
  const base = rutasDe(elegido).base;
  const cambiado: Record<string, string> = {};
  const textos: Record<string, string> = {};
  for (const ruta of new Set(completo.misiones.flatMap(documentosDeMision))) {
    if (ruta.startsWith('repo:')) continue;
    const propio = existsSync(enDiscoDe(raiz, `${base}/${ruta}`)) ? `${base}/${ruta}` : ruta;
    const f = await fechaDeCambio(raiz, propio);
    if (f) cambiado[ruta] = f;
    if (existsSync(enDiscoDe(raiz, propio))) textos[ruta] = readFileSync(enDiscoDe(raiz, propio), 'utf8');
  }
  await sinLosDevueltos(completo, estado, cambiado, (ruta) => (existsSync(enDiscoDe(raiz, `${base}/${ruta}`)) ? `${base}/${ruta}` : ruta));
  const deDocumentos = documentosPorCerrar(completo, estado, proyecto.equipo.length ? proyecto.equipo.map((i) => i.id) : ['titular'], desde, cambiado, textos);
  if (deDocumentos.length) {
    console.error(`No se cerró la revisión: hay que arreglar estos documentos (CLAUDE.md › «Siempre hacia adelante», y la regla del corte en ${PROCEDIMIENTOS.documentos.archivo}):`);
    for (const m of deDocumentos) console.error(`- ${m}`);
    process.exit(1);
  }
  // La reserva de misiones (regla del titular, 21 de octubre de 2026): nadie se queda sin misión esperando al director;
  // más corta, solo con un lote corto que agiliza la revisión que sigue, nunca en cero ni por el trabajo del director
  // (nota del titular nmvq6s7wmtit, 26 de octubre de 2026 en la noche)
  const personasDelEquipo = proyecto.equipo.length ? proyecto.equipo.map((i) => i.id) : ['titular'];
  const sinReserva = reservaSinRazon(completo, estado, personasDelEquipo, desde);
  if (sinReserva.length) {
    console.error(`No se cerró la revisión: la reserva de misiones está corta. Cada persona tiene siempre, sin excepción, su misión de ahora y por lo menos ${RESERVA_MINIMA - 1} más (${RESERVA_MINIMA} en total) que alcanza sin una revisión de por medio: las abiertas y, si nada de su fase espera al cierre, las de la siguiente. Las de cierre retenidas no cuentan, ni las de la fase siguiente mientras haya una. Mientras tú trabajas tu cola, la persona siempre tiene algo que hacer o revisar: tu trabajo pendiente nunca es razón para dejarla con menos. Escribe misiones de verdad de la persona, en el orden de la ruta, de donde las saca un director de proyectos: ver o probar lo que ya hiciste; las decisiones que necesita lo que sigue en tu cola, antes de construirlo; contar lo que solo ella sabe y lo que sigue en tu cola necesita (sus criterios, sus ejemplos, sus casos); y preparar lo que la fase pide, cuando le toca (el escenario de una prueba, justo antes de la prueba, no mientras lo que se prueba aún cambia). Pero nunca relleno: una misión que no sirve a la estrategia de esta fase (preparar una prueba antes de que esté lo que se prueba, decidir la difusión antes de que el producto esté listo) no se escribe para llegar a ${RESERVA_MINIMA}; el titular prefiere menos (nota nmvq7lk8itit). Lo único que acepta menos es un lote corto, en uno de tres casos (\`motivo\`): «revision», estrictamente necesario para agilizar la revisión que sigue o que va antes de seguir con lo demás (la razón dice qué necesita pronto esa revisión, y tu cola no es la razón); «cola», lo que viene es una ejecución larga tuya y no hay ${RESERVA_MINIMA} misiones estratégicas de la persona: el lote trae, como mínimo, la de aprobar el lanzamiento de tu cola (una misión con \`recomiendaRevision\`, que le muestra lo que harás, en «Lo que sigue» › «Lo que hace el director», y al entregarse ofrece «Pedir la revisión»), y las de ver lo que hiciste salen a medida que avanzas; si la persona ya autorizó tu cola entera (\`colaAutorizada\`), esa aprobación no se vuelve a pedir y el lote trae solo lo que de verdad la necesita; o «ruta», la ruta está completada y tu cola vacía. Escríbelo en \`reservaCorta\` › <persona> (\`{ "cuando": "<ISO ahora>", "motivo": ${MOTIVOS_LOTE_CORTO.map((m) => `"${m}"`).join(' | ')}, "razon": "…", "lote": ["<ids de sus misiones a la mano>"] }\`, la razón de ${RAZON_RESERVA_MINIMA} caracteres o más), que el Studio le muestra en «Lo que sigue»; vale solo para esta revisión y nunca en cero:`);
    for (const r of sinReserva) console.error(`- ${nombreDe(proyecto, r.persona)}: alcanza ${r.alcanza} (${r.abiertas.length} abierta(s)${r.enEspera.length ? `, ${r.enEspera.length} retenida(s) al cierre que no cuentan` : ''}${r.esperan.length ? `, ${r.esperan.length} que espera(n) lo que necesita(n) antes` : ''}${r.siguientes.length ? `, ${r.siguientes.length} de la fase siguiente${r.enEspera.length ? ' que no cuentan' : ''}` : ''}); faltan ${r.faltan}; ${r.motivo}`);
    process.exit(1);
  }
  // Una razón de la reserva corta vale solo mientras haga falta: con la reserva completa, sale del plan
  for (const p of personasDelEquipo) if (plan.reservaCorta?.[p] && !reservaDeMisiones(completo, estado, p).faltan) delete plan.reservaCorta[p];
  if (plan.reservaCorta && !Object.keys(plan.reservaCorta).length) delete plan.reservaCorta;
  // La cola del director, en su orden (nota de voz del titular, 23 de octubre de 2026): todo lo aprobado y lo pedido de la
  // fase en curso o de antes tiene su lugar en `colaDirector`, aparte de las misiones de cada persona
  const sinOrden = colaSinOrden(completo, estado);
  if (sinOrden.length) {
    console.error('No se cerró la revisión: tu cola (lo aprobado y lo pedido sin hacer de esta fase o de antes) tiene cosas sin lugar en su orden. Ponlas en `colaDirector`, en el punto en que conviene hacerlas (lo que hay que construir primero, antes):');
    for (const t of sinOrden) console.error(`- ${t.tipo} ${t.id} («${t.titulo.slice(0, 80)}»)`);
    process.exit(1);
  }
  // Las revisiones seguidas (pedido pd_revisiones_seguidas): con la cadena en marcha, el director dice al cerrar si su cola
  // sigue y cuánto estima que dura la siguiente (`tramo`); el de una revisión anterior sale: vale solo para la que sigue
  const delTramo = tramoPorCerrar(plan.tramo, desde, seguidasActivas((await leerLocal(raiz)).seguidas, elegido), colaDelDirector(completo, estado).length);
  if (delTramo) {
    console.error(`No se cerró la revisión: ${delTramo}`);
    process.exit(1);
  }
  if (plan.tramo && !(Date.parse(plan.tramo.cuando) >= Date.parse(desde))) delete plan.tramo;
  // «Dónde quedamos» es de esta revisión y no pasa de seis líneas (propuesta aceptada «El cierre no deja nada sin atender»)
  const delResumen = resumenPorCerrar(plan.resumen, desde);
  if (delResumen.length) {
    console.error(`No se cerró la revisión: el resumen «Dónde quedamos» (\`resumen\`) no está listo. Reescríbelo al final de cada revisión, como dice ${PROCEDIMIENTOS.ciclo.archivo}:`);
    for (const m of delResumen) console.error(`- ${m}`);
    process.exit(1);
  }
  // «Lo que avanzamos» no reescribe una línea guardada (propuesta aceptada «El cierre no deja nada sin atender», punto 3):
  // reescrita o alargada, el Studio se la mostraría al titular otra vez como nueva
  const lineasGuardadas = guardado?.resumen?.avanzamos;
  const reescritas = lineasReescritas(plan.resumen?.avanzamos ?? [], Array.isArray(lineasGuardadas) ? lineasGuardadas.filter((l) => typeof l === 'string') : []);
  if (reescritas.length) {
    console.error('No se cerró la revisión: cada línea de abajo, en «Lo que avanzamos» (`resumen.avanzamos`), vuelve a decir, reescrita o alargada, una que el titular ya vio (la del último commit de la memoria), y el Studio se la mostraría otra vez como nueva. Una línea ya escrita se deja igual o se quita (docs/metodo/director/review-cycle.md › «Dónde quedamos»): por cada una, vuelve a poner la guardada tal como estaba (va entre comillas, para copiarla igual), quítala, o, si hay un avance nuevo, escríbelo en su línea con solo lo nuevo:');
    for (const r of reescritas) console.error(`- «${r.linea}» repite ${JSON.stringify(r.guardada)}`);
    process.exit(1);
  }
  // «Comentarios del director» no repite «Lo que avanzamos»
  const repetidas = mensajeRepite(plan.mensaje?.texto ?? '', plan.resumen?.avanzamos ?? []);
  if (repetidas.length) {
    console.error('No se cerró la revisión: el mensaje («Comentarios del director») vuelve a contar lo que ya está en «Lo que avanzamos». Quítalo del mensaje, o di ahí solo lo que no es un avance (por qué, una advertencia, lo que no se pudo):');
    for (const r of repetidas) console.error(`- «${r.frase}» repite «${r.linea.slice(0, 120)}»`);
    process.exit(1);
  }
  // …ni lo que ya dijo el comentario anterior: reescrito o alargado, el titular lo leería dos veces
  const yaDicho = mensajeRepiteAnterior(plan.mensaje?.texto ?? '', guardado?.mensaje?.texto ?? '');
  if (yaDicho.length) {
    console.error('No se cerró la revisión: el mensaje («Comentarios del director») vuelve a decir lo que ya dijo el comentario anterior, y el Studio lo mostraría otra vez como nuevo. Deja en el mensaje solo lo nuevo (si no hay nada nuevo que comentar, una frase basta):');
    for (const r of yaDicho) console.error(`- «${r.frase}» repite «${r.linea.slice(0, 120)}»`);
    process.exit(1);
  }
  // Los commits son del sistema, no de las personas (nota de voz del titular nmvov99tttit, 26 de octubre de 2026)
  const conCommit = commitsALaVista(plan, guardado, desde);
  if (conCommit.length) {
    console.error('No se cerró la revisión: lo de abajo, escrito para las personas en esta revisión, nombra un commit por su hash. Los commits son del sistema: di qué se hizo, sin su hash (el commit puede ir en lo interno: el `hecho` de un pedido, `ejecutadas` o `alDia`):');
    for (const t of conCommit) console.error(`- «${t.slice(0, 160)}»`);
    process.exit(1);
  }
  // Los hilos de lo hecho, explícitos (pr_memoria_consultable, punto 1): el origen de cada misión existe, y cada propuesta
  // ejecutada en esta revisión dice con qué commit, y ese commit existe en el repositorio del proyecto
  const sinOrigen = origenesQueNoExisten(completo, estado.notas, guardado);
  const existeCommit = (hash: string) => { try { execFileSync('git', ['cat-file', '-e', `${hash}^{commit}`], { cwd: repo?.ruta, stdio: 'ignore' }); return true; } catch { return false; } };
  const sinSuCommit = repo?.ruta ? ejecutadasSinCommit(plan, desde, existeCommit) : [];
  if (sinOrigen.length || sinSuCommit.length) {
    console.error('No se cerró la revisión: un hilo de lo hecho no lleva a ninguna parte. El `origen` de una misión nombra notas, propuestas, pedidos o misiones que existen (y no a ella misma), y cada propuesta que ejecutas dice en su nota de `ejecutadas` el commit que la hizo:');
    for (const x of sinOrigen) console.error(`- la misión ${x.id}: su origen «${x.origen}» no existe`);
    for (const id of sinSuCommit) console.error(`- la ejecutada ${id}: su nota no nombra un commit de este repositorio`);
    process.exit(1);
  }
  // Nunca se pregunta por lo que aún no pasó (nota de voz del titular nmvptrd58tit, 26 de octubre de 2026)
  const deFuturo = misionesDeFuturo(plan, guardado);
  if (deFuturo.length) {
    console.error('No se cerró la revisión: estas misiones le preguntan a la persona por algo que aún no pasó, y no lo puede confirmar sin que ocurra. Arma el escenario para que pase ahora (la orden que lo provoca, en `terminal`, o lo que hay que hacer para verlo), compruébalo tú si el registro lo dice, o escribe la misión en la revisión en que ya pasó (CLAUDE.md › «Una misión a la vez»):');
    for (const f of deFuturo) console.error(`- ${f.id}: «${f.frase}»`);
    process.exit(1);
  }
  // La cola autorizada no se vuelve a preguntar (nota de voz del titular nmvqvu1sctit, 27 de octubre de 2026): la
  // autorización la da una nota de la persona, y con ella ninguna misión le pide permiso para seguir
  if (plan.colaAutorizada && !estado.notas.some((n) => n.id === plan.colaAutorizada!.nota)) {
    console.error(`No se cerró la revisión: la cola autorizada (\`colaAutorizada\`) nombra la nota «${plan.colaAutorizada.nota}», que no está en el Buzón. La autoriza la persona, en una nota suya; tú no te la das.`);
    process.exit(1);
  }
  // Lo que reemplaza una decisión (pd_lo_vigente): solo otras decisiones de los documentos, que existen
  const decisiones = new Set(estado.notas.filter(decideDecision).map((n) => n.id));
  const reemplazoRoto = Object.entries(plan.respuestas ?? {}).filter(([, r]) => r.cuando >= desde).flatMap(([nota, r]) => (r.reemplaza ?? []).filter((x) => x === nota || !decisiones.has(x)).map((x) => `${nota} → ${x}`));
  if (reemplazoRoto.length) {
    console.error('No se cerró la revisión: una respuesta dice que reemplaza algo que no es otra decisión de un documento (`reemplaza` nombra las notas que deciden una decisión, y no a ella misma):');
    for (const r of reemplazoRoto) console.error(`- ${r}`);
    process.exit(1);
  }
  const pidenSeguir = misionesQuePidenSeguir(plan, guardado);
  if (pidenSeguir.length) {
    console.error('No se cerró la revisión: estas misiones le piden a la persona permiso para seguir con tu cola, que ya autorizó entera (`colaAutorizada`). Trabájala sin preguntarle si sigues, y deja en su lote solo lo que de verdad la necesita: ver o probar lo que hiciste, una decisión que lo que sigue necesita, lo que solo ella sabe (CLAUDE.md › «Una misión a la vez»):');
    for (const f of pidenSeguir) console.error(`- ${f.id}: «${f.frase}»`);
    process.exit(1);
  }
  plan.revisado = new Date().toISOString();
  // El plan no crece sin fin: pasado el tope, lo cerrado antes de esta revisión sale solo al archivo
  let final = plan;
  const pesa = (p: Plan) => Math.round(Buffer.byteLength(JSON.stringify(p, null, 2)) / 1024);
  if (pesa(plan) > TOPE_PLAN_KB) {
    const a = archivar(plan, archivo, estado, desde);
    if (a.movidas) {
      final = a.plan;
      // Cada cosa a su mes: se reescribe solo el mes que cambió, y el archivo de antes se queda como estaba
      mkdirSync(carpetaMeses, { recursive: true });
      const escritos: string[] = [];
      for (const [mes, parte] of Object.entries(partirArchivoPorMes(a.archivo, previo))) {
        const ruta = join(carpetaMeses, `${mes}.json`);
        const texto = JSON.stringify(parte, null, 2) + '\n';
        if (existsSync(ruta) && readFileSync(ruta, 'utf-8') === texto) continue;
        await escribirDeUnaVez(ruta, texto);
        escritos.push(`director/archivo/${mes}.json`);
      }
      console.log(`Archivadas ${a.movidas} respuestas, veredictos, misiones aprobadas, propuestas cerradas y pedidos hechos, cada uno en el mes en que se cerró: el plan pasó de ${pesa(plan)} KB a ${pesa(final)} KB. Agrega al commit ${escritos.join(', ') || 'director/archivo'}.`);
    }
    if (pesa(final) > TOPE_PLAN_KB) console.log(`⚠ El plan sigue pesando ${pesa(final)} KB (el tope es ${TOPE_PLAN_KB} KB): lo que queda no está cerrado; mira qué más sobra (las misiones previstas de cada fase, lo adelantado de fases cerradas).`);
  }
  // De una vez: el Studio lo lee mientras tanto (para saber si cerró) y no debe encontrarlo a medio escribir
  await escribirDeUnaVez(rutaPlan, JSON.stringify(final, null, 2) + '\n');
  // La huella del plan tal como lo deja el cierre: lo que cambie después, sin un director, el Studio lo avisa (pr_cierre_vigilado, punto 4)
  await guardarHuella(raiz, elegido);
  await marcarRevision(raiz, elegido, 'hecha');
  await soltarElCandado(elegido);
  console.log(`Revisión marcada: ${plan.revisado}`);
  process.exit(0);
}

/**
 * El plan que ya quedó guardado (el del último commit de la memoria): lo que el titular ya vio, su comentario y sus
 * líneas de lo avanzado. Sin commit, sin ese archivo en él o ilegible, null: no hay con qué comparar.
 */
function planGuardado(rutaPlan: string): Plan | null {
  const u = ubicar(raiz, rutaPlan);
  try {
    const guardado = execFileSync('git', ['show', `HEAD:${u.ruta}`], { cwd: u.cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
    return JSON.parse(guardado) as Plan;
  } catch {
    return null;
  }
}

/**
 * Lo que se le negó al director en el último lanzamiento terminado de este proyecto (revisión, urgencia o aclaración),
 * leído de su registro en .revisiones: así no vuelve a intentarlo igual (propuesta «Lo que se le negó al director, a la
 * vista»). El registro del lanzamiento en curso todavía no tiene su resultado, así que no cuenta.
 */
function negadoAntes(proyecto: string): { archivo: string; negaciones: string[] } | null {
  const carpeta = join(raiz, '.revisiones');
  if (!existsSync(carpeta)) return null;
  const suyo = new RegExp(`^${proyecto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(aclaracion-|urgencia-)?\\d{4}-.*\\.log$`);
  const cuando = (f: string) => /(\d{4}-\d{2}-\d{2}T[\d-]+Z)\.log$/.exec(f)?.[1] ?? '';
  for (const archivo of readdirSync(carpeta).filter((f) => suyo.test(f)).sort((a, b) => cuando(b).localeCompare(cuando(a)))) {
    const texto = readFileSync(join(carpeta, archivo), 'utf-8');
    if (/"type":"result"/.test(texto)) return { archivo, negaciones: negacionesDe(texto) };
  }
  return null;
}

/**
 * Los commits del repositorio del proyecto desde la última revisión: lo hecho que puede dejar atrás una misión. Su asunto,
 * cortado en `largo` para mostrarlo; entero (`largo` 0) para cruzarlo con lo pendiente, que suele nombrarlo al final.
 */
function commitsDesde(ruta: string | undefined, desde: string, largo = 140): CommitReciente[] {
  if (!ruta || !desde) return [];
  try {
    return execFileSync('git', ['log', `--since=${desde}`, '--format=%h%x09%cI%x09%s'], { cwd: ruta, encoding: 'utf8' })
      .split('\n').filter(Boolean).map((l) => { const [hash, cuando, ...asunto] = l.split('\t'); return { hash, cuando, asunto: largo ? asunto.join('\t').slice(0, largo) : asunto.join('\t') }; });
  } catch {
    return [];
  }
}

/**
 * Lo que el repositorio tiene sin commit, sin lo que git ignora (la memoria `.stl/` está excluida). Tras una revisión que
 * no se cerró, puede ser trabajo suyo hecho y sin guardar: el 22 de octubre una dejó así seis arreglos, y la retoma solo
 * los encontró porque miró git status por su cuenta.
 */
function sinCommit(ruta: string | undefined) {
  if (!ruta) return [];
  try {
    return sinCommitDeGit(execFileSync('git', ['status', '--porcelain=v1', '-z', '--no-renames', '--untracked-files=all'], { cwd: ruta, encoding: 'utf8' }));
  } catch {
    return [];
  }
}

/**
 * El plan del último commit de la memoria de un proyecto, solo su plan.json (sin lo archivado): el punto de control de la
 * retoma (pr_retoma_automatica, punto 1). El plan lo escribe solo el director, así que es el de su último cierre. null si
 * no se puede leer (una memoria sin commits, o sin git).
 */
function planDelUltimoCommit(proyecto: string): Partial<Plan> | null {
  try {
    return JSON.parse(execFileSync('git', ['show', 'HEAD:director/plan.json'], { cwd: memoria(proyecto), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }));
  } catch {
    return null;
  }
}

/**
 * Lo que dejó un lanzamiento que no se cerró (una revisión, una aclaración o una urgencia), lanzado en `desde`, para que
 * el que lo retoma no lo rehaga: unidad por unidad contra el punto de control (pr_retoma_automatica, puntos 1 y 5), los
 * commits del repositorio desde entonces y lo que quedó sin commit. `sinNada`: qué hacer si no dejó nada.
 */
function lineasDeRetoma(proyecto: string, plan: Plan, desde: string, repositorio: string | undefined, sinNada: string): string[] {
  const l: string[] = [];
  const dejo = loQueDejo(planEnDisco(proyecto) ?? plan, desde, planDelUltimoCommit(proyecto));
  const lista = (titulo: string, ids: string[]) => {
    if (ids.length) l.push(`- ${titulo} (no las reescribas): ${ids.join(', ')}`);
  };
  lista('Respuestas que ya escribió en el plan', dejo.respuestas);
  lista('Veredictos de misiones que ya dio', dejo.revisiones);
  lista('Misiones que ya escribió, cambió o comprobó', dejo.misiones);
  lista('Propuestas que ya ejecutó', dejo.ejecutadas);
  lista('Propuestas que ya escribió o cambió', dejo.propuestas);
  lista('Pedidos que ya escribió o cambió', dejo.pedidos);
  lista('Documentos que ya sumó al plan', dejo.documentos);
  lista('Criterios que ya evaluó', dejo.evaluacion);
  lista('Otras partes del plan que ya cambió (revísalas antes de reescribirlas)', dejo.partes);
  const commits = commitsDesde(repositorio, desde);
  if (commits.length) {
    l.push(`- Commits del repositorio desde entonces (ese trabajo ya está hecho: compruébalo, no lo repitas):`);
    for (const c of commits.slice(0, 20)) l.push(`  - ${c.hash} ${c.cuando.slice(0, 16)} ${c.asunto}`);
    if (commits.length > 20) l.push(`  - … y ${commits.length - 20} más (git log --since=${desde})`);
  }
  const aMedias = sinCommit(repositorio);
  if (aMedias.length) {
    l.push(`- Cambios del repositorio sin commit (pueden ser trabajo suyo, hecho y sin guardar: compruébalos con sus pruebas y sus tipos y guárdalos en su commit, o di en la respuesta y en el mensaje por qué no; no los rehagas):`);
    for (const c of aMedias.slice(0, 30)) l.push(`  - ${c.estado} · ${c.ruta}`);
    if (aMedias.length > 30) l.push(`  - … y ${aMedias.length - 30} más (git status)`);
  }
  const enElPlan = [dejo.respuestas, dejo.revisiones, dejo.misiones, dejo.ejecutadas, dejo.propuestas, dejo.pedidos, dejo.documentos, dejo.evaluacion, dejo.partes].some((x) => x.length);
  if (!enElPlan && !commits.length && !aMedias.length) l.push(`- No alcanzó a dejar nada en el plan ni en el repositorio: ${sinNada}.`);
  return l;
}

/** El plan.json del disco, tal cual (sin lo archivado), para compararlo con el del último commit; null si no se lee. */
function planEnDisco(proyecto: string): Plan | null {
  try {
    return JSON.parse(readFileSync(join(memoria(proyecto), 'director', 'plan.json'), 'utf-8'));
  } catch {
    return null;
  }
}

// Un director a la vez en cada proyecto: si otro trabaja en él, esta revisión no empieza. Y si la pidieron desde el
// Studio, allá se ve que el director ya está revisando
const alEmpezar = await proyectoElegido(pedido);
await tomarElCandado(alEmpezar, 'revision');
await marcarRevision(raiz, alEmpezar, 'en_curso');

const { id, rutas, plan, proyecto, estado, personas, repo, errorRepo } = await leerTodo(pedido);
const enDisco = (ruta: string) => enDiscoDe(raiz, ruta);
const txtDe = (audio: string) => enDisco(txtDeAudio(audio));
// Lo transcrito en otro computador: su .txt está en GitHub y aún no en esta carpeta (el audio no viaja: nunca entra a git)
const deFuera = new Map<string, string>();
const transcripcion = (audio?: string) => (!audio ? null : existsSync(txtDe(audio)) ? readFileSync(txtDe(audio), 'utf-8').trim() : (deFuera.get(audio) ?? null));
const todosLosAudios = () => [...estado.notas.map((n) => n.audio), ...Object.values(estado.entregas).map((e) => e.audio)].filter((a): a is string => !!a);

// ── Lo de otras personas que aún no está en esta carpeta se lee de GitHub: la transcripción de cada audio y los
// adjuntos. Un audio solo se baja si no tiene texto (uno de antes, que aún está en git): sirve solo para transcribirlo ──
const sinTexto = todosLosAudios().filter((a) => !existsSync(txtDe(a)));
const textosFuera = sinTexto.length ? await leerFrescosTexto(raiz, sinTexto.map(txtDeAudio)) : new Map<string, string | null>();
for (const a of sinTexto) {
  const t = textosFuera.get(txtDeAudio(a))?.trim();
  if (t) deFuera.set(a, t);
}
for (const a of [...todosLosAudios().filter((x) => !audioBorrable(transcripcion(x))), ...estado.notas.flatMap((n) => n.adjuntos ?? []).map((x) => x.ruta)]) {
  if (existsSync(enDisco(a))) continue;
  const datos = await leerFresco(raiz, a);
  if (!datos) continue;
  mkdirSync(dirname(enDisco(a)), { recursive: true });
  writeFileSync(enDisco(a), datos);
}

// ── Transcribir los audios que falten, en local (nada sale del equipo). El Studio ya transcribe cada audio en cuanto
// llega: aquí solo quedan los que no pudo (sin el entorno, o que salieron vacíos) ──
// Un .txt vacío tampoco es su texto: uno de antes de la regla del 22 de octubre, que quedó en git, no impide volver a
// intentarlo (pd_audios_vacios, 25 de octubre de 2026)
const audios = todosLosAudios().filter((a) => existsSync(enDisco(a)) && !audioBorrable(transcripcion(a)));
// Esos .txt vacíos están en git: si vuelve a salir vacía, se quedan como están (quitarlos sería borrar algo que git guarda)
const vaciosEnGit = new Set(audios.filter((a) => existsSync(txtDe(a))));
// Los .txt que deja esta bandeja: van en el commit del director (el audio no: nunca entra a git)
const transcritosAqui: string[] = [];
if (audios.length && !args.includes('--sin-transcribir')) {
  console.error(`Transcribiendo ${audios.length} ${audios.length === 1 ? 'audio' : 'audios'} en local…`);
  const { cmd, args: argumentosT } = comandoTranscripcion(raiz, audios.map(enDisco), `Notas para el director del proyecto ${proyecto.nombre || 'nuevo'}.`);
  try {
    execFileSync(cmd, argumentosT, { stdio: 'inherit', shell: false });
  } catch (e) {
    console.error(`No se pudo transcribir (¿falta tools/entorno/instalar_transcripcion.sh?): ${(e as Error).message}`);
  }
  for (const a of audios) {
    // Lo que la transcripción inventa, fuera; y vacía no es su texto: el audio se queda para volver a intentarlo
    limpiarTranscrito(enDisco(a));
    if (vaciosEnGit.has(a) ? !audioBorrable(transcripcion(a)) : quitarSiVacia(enDisco(a))) console.error(`La transcripción de ${a} salió vacía: el audio se queda para volver a intentarlo.`);
    else if (existsSync(txtDe(a))) transcritosAqui.push(txtDeAudio(a).slice(`${CARPETA}/${id}/`.length));
  }
}
// ── Con su texto escrito, el audio se borra del disco (nunca entra a git). Uno de antes que ya estaba en git queda como
// borrado en la memoria: su git rm va aparte ──
const audiosBorrados = todosLosAudios().filter((a) => borrarSiTranscrito(enDisco(a)));
if (audiosBorrados.length) console.error(`Borré ${audiosBorrados.length} ${audiosBorrados.length === 1 ? 'audio ya transcrito' : 'audios ya transcritos'}: queda su texto.`);

// ── Lo que hay para el director ──
const linea = (s = '') => console.log(s);
const nombre = (p: string) => nombreDe(proyecto, p);
const etapa = etapaArranque(plan, proyecto, !!repo);
const fase = faseActual(plan, estado);
const desde = plan.revisado ?? '';
const desdeDia = desde.slice(0, 10);
const pendientes = pendientesDelDirector(plan, estado);
// Lo que llega después de empezar la revisión (mientras el director trabaja se puede comentar, grabar, preguntar y avanzar
// en las misiones: elegir, encargar, entregar) no entra en ella: espera la siguiente
const local = await leerLocal(raiz);
const corte = corteDeRevision(local, id) ?? new Date().toISOString();
const notas = pendientes.notas.filter((n) => n.cuando <= corte);
const despues = pendientes.notas.length - notas.length;
const entregas = pendientes.entregas.filter((m) => estado.entregas[m.id].cuando <= corte);
const entregadasDespues = pendientes.entregas.length - entregas.length;

linea(`# Bandeja del director · ${proyecto.nombre || '(proyecto sin nombre)'} (${id}) · ${new Date().toLocaleString('es-CO')}`);
linea(`Solo este proyecto. Su memoria está en su repositorio: ${memoria(id)} (rama stl). Ahí escribes: el plan en director/plan.json y los documentos en docs/ (el plan los nombra docs/…).`);
linea(`Fase en curso: ${plan.fases.indexOf(fase)}. ${fase.nombre}. Última revisión: ${desde || 'nunca'}.`);

// ── Pedida de nuevo después de una que no se cerró: lo que esa dejó está hecho; esta solo termina lo que falta ──
// También si la toma la sesión del director tal como quedó, sin pedirla de nuevo (/vigila): entonces se retoma a sí misma
// (pr_retoma_automatica, punto 3)
const reintento = local.revision?.proyecto === id && !local.revision.hecha ? (local.revision.reintento ?? reintentoDe(local.revision, id) ?? undefined) : undefined;
if (reintento) {
  linea('\n## La revisión anterior no se cerró: retómala');
  linea(`La que lanzó el Studio el ${new Date(reintento.lanzada).toLocaleString('es-CO')} no se cerró (${reintento.que})${reintento.registro ? `; su registro: ${reintento.registro}` : ''}. Lo que esa revisión ya dejó está hecho y no se rehace: esta revisión solo termina lo que falta y cierra con --listo. Lo que está abajo como pendiente es lo que falta.`);
  for (const l of lineasDeRetoma(id, plan, reintento.lanzada, repo?.ruta, 'haz la revisión completa')) linea(l);
}

// ── El plan cambió después del cierre anterior, antes de que empezara esta revisión (pr_cierre_vigilado, punto 4) ──
const huellaAnterior = local.huellas?.[id];
if (huellaAnterior)
  try {
    const rutaDelPlan = enDisco(rutasDe(id).plan);
    const antesDeEmpezar = statSync(rutaDelPlan).mtimeMs < Date.parse(corte);
    if (antesDeEmpezar && planCambiadoTrasCierre(huellaAnterior, readFileSync(rutaDelPlan, 'utf-8'), false)) {
      linea('\n## ⚠ El plan cambió después del cierre anterior');
      linea(`Su huella no es la que dejó el cierre del ${new Date(huellaAnterior.cuando).toLocaleString('es-CO')}: algo lo cambió sin un director trabajando. Antes de escribir encima, mira qué cambió en la memoria (cd a ella y luego git diff director/plan.json, o git log), y dilo en el mensaje: el titular lo ve como un aviso en el Studio hasta que cierres.`);
    }
  } catch {
    // sin el plan en el disco no hay nada que comparar
  }

const errores = [...validarPlan(plan, personas), ...validarEstado(estado, plan), ...validarProyecto(proyecto)];
if (errores.length) {
  linea('\n## ⚠ La ruta o el estado tienen errores: corrígelos antes de seguir');
  for (const e of errores) linea(`- ${e}`);
}

// ── El arranque: del repositorio a la ruta ──
linea('\n## El proyecto');
linea(`- Repositorio: ${repo ? `${repo.ruta} (rama ${repo.rama}, ${repo.commits} commits, ${repo.archivos} archivos${repo.remoto ? `, ${repo.remoto}` : ''})` : errorRepo}`);
const comoClave = (r: string) => r.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
if (repo && comoClave(repo.ruta) === comoClave(raiz)) linea(`- ES EL PROPIO STUDIO: lee ${PROCEDIMIENTOS.studio.archivo} (lo del director en su carpeta; el trabajo del producto, solo aprobado, en commits «STL: …»; sus frentes nunca incluyen proyectos/).`);
linea(`- Tipo: ${proyecto.tipo === 'nuevo' ? 'NUEVO (se plantea a partir de lo que cuenta el titular)' : 'EXISTENTE (se diagnostica a partir del repositorio)'}`);
linea(`- Contexto (del titular): ${proyecto.contexto || '(aún no lo cuenta)'}`);
if (proyecto.tipo === 'nuevo') linea(`- Cuándo se considera completo: ${proyecto.terminado || '(aún no lo dice)'}`);
linea(`- Lo que quiere lograr (antes del diagnóstico): ${proyecto.metaInicial || '(aún no lo dice)'}`);
linea(`- La meta: ${proyecto.objetivo ? `«${proyecto.objetivo.texto}». Éxito: ${proyecto.objetivo.exito}${proyecto.objetivo.horizonte ? `. Horizonte: ${proyecto.objetivo.horizonte}` : ''} (${proyecto.objetivo.firmado.quien}, ${proyecto.objetivo.firmado.fecha})` : 'ninguna todavía'}`);
for (const o of proyecto.objetivosAnteriores ?? []) linea(`- Meta anterior, replanteada el ${o.reabierto.fecha}: «${o.texto}». ${o.reabierto.nota ? `Razón: ${o.reabierto.nota}` : 'Sin razón escrita (si la dijo, está en el Buzón).'}`);
// «Replantear la meta» pide la revisión: el director rehace el análisis hacia la meta nueva y ajusta la ruta
const replanteada = proyecto.objetivo && (proyecto.objetivosAnteriores ?? []).some((o) => o.reabierto.fecha >= proyecto.objetivo!.firmado.fecha.slice(0, 10)) && (!desde || proyecto.objetivo.firmado.fecha >= desde.slice(0, 10));
if (replanteada && plan.fases.length > 1) linea(`- LA META SE REPLANTEÓ desde la última revisión: haz un análisis fresco del proyecto hacia la meta nueva (lo que ya sirve, lo que deja de servir, lo que falta) y ajusta la ruta (${PROCEDIMIENTOS.ruta.archivo}): fases, criterios, misiones y propuestas. Lo que cambió va en un documento nuevo y corto, con su misión de leerlo (la ruta ya leída queda sellada).`);
for (const h of proyecto.historialIA ?? []) linea(`- Historial de IA: ${h.agente}${h.sesiones ? `, ${h.sesiones} sesiones` : ''}${h.ultima ? `, la última del ${h.ultima.slice(0, 10)}` : ''}${h.donde ? ` (en ${h.donde})` : ''}. Léelo una vez en el diagnóstico para encontrar lo pendiente.`);
linea(`- Equipo: ${proyecto.equipo.map((i) => `${i.nombre} (${i.id}${i.cargo ? `, ${i.cargo}` : ''})`).join('; ') || 'solo el titular, aún sin registrar'}`);

// ── Lo que se le negó la vez anterior: para no reintentarlo igual ──
const negado = negadoAntes(id);
if (negado?.negaciones.length) {
  linea(`\n## Lo que se te negó en el lanzamiento anterior (${negado.negaciones.length}, en .revisiones/${negado.archivo})`);
  for (const n of negado.negaciones.slice(0, 12)) linea(`- ${n}`);
  if (negado.negaciones.length > 12) linea(`- … y ${negado.negaciones.length - 12} más.`);
  linea('No lo vuelvas a intentar de la misma forma: usa lo que tus permisos sí aceptan (una orden por vez, cd y luego la orden, Read y Grep para leer). Si lo necesitas para lo aprobado y no tienes otra forma, pídelo en la misión del titular con «Autorizo», como dice tu encargo.');
}

// ── El mapa del proyecto (propuesta aceptada «El mapa de cada proyecto, al día»): lo que cambió desde la última revisión y
// la ficha de cada documento, para elegir qué leer sin explorar. Entero queda en la memoria (director/mapa.json), que va
// en el commit de cierre. Si no se puede armar, lo dice en una línea y la revisión sigue sin él ──
linea('\n## El mapa del proyecto');
const porque = (e: unknown) => String((e as Error)?.message ?? e).split('\n')[0];
try {
  const mapa = await mapaDe({ id, plan, estado, personas, repo });
  let sinGuardar = '';
  try {
    await guardarMapa(id, mapa);
  } catch (e) {
    sinGuardar = porque(e);
  }
  for (const l of lineasDelMapa(mapa, { archivo: enDisco(rutaDelMapa(id)) })) linea(l);
  if (sinGuardar) linea(`- ⚠ El mapa no se guardó (${sinGuardar}): en esta revisión solo está lo de arriba.`);
} catch (e) {
  linea(`- No se pudo armar el mapa (${porque(e)}): esta revisión sigue sin él.`);
}

// ── Lo vigente, el primer bloque del paquete (pd_lo_vigente; «El paquete de cada revisión», parte 10): las decisiones de
// los documentos que siguen en firme, calculadas por el código. Lo reemplazado no entra: se busca por su id ──
const vigentes = decisionesVigentes(plan.respuestas ?? {}, estado.notas);
if (vigentes.length) {
  linea(`\n## Lo vigente: las decisiones en firme de los documentos (${vigentes.length})`);
  linea('Lo decidido que rige hoy, una línea por decisión, de la más vieja a la más nueva: el documento, su parte, la decisión y cómo se decidió. Antes de proponer, pedir o construir algo, cruza con esto. Si una decisión nueva deja sin efecto una de aquí, dilo en su respuesta (`reemplaza`: los ids de las notas que reemplaza) y sale de esta lista; una nota nueva sobre la misma decisión la reemplaza sola. El texto entero está en su documento y en su nota.');
  for (const n of vigentes) {
    const como = n.sobre.postura === 'aprueba' ? 'aprobó la recomendación' : `decidió: «${enUnaLinea(n.texto ?? transcripcion(n.audio) ?? '(sin transcribir)', 160)}»`;
    linea(`- [${n.id}] ${n.cuando.slice(0, 10)} · ${n.sobre.id} › ${n.sobre.seccion ?? ''} › ${n.sobre.decision} · ${como}`);
  }
}

// El historial de decisiones de este proyecto (pr_nucleo_medido, punto 1): lo que recomendaste y cómo salió, sacado sin
// modelo de su memoria; solo el de este proyecto, para ver tus fallas y no repetirlas
const historial = lineasDelHistorial(historialDeDecisiones(plan, estado, (n) => [n.texto?.trim(), n.audio ? transcripcion(n.audio) : ''].filter(Boolean).join(' · ')));
if (historial.length) {
  linea('\n## Tu historial en este proyecto: lo que recomendaste y cómo salió');
  for (const l of historial) linea(l);
}

// La medición del núcleo con casos fijos (pr_nucleo_medido), cuando revisas el mismo Studio: cómo está medido el núcleo
// antes de cambiarlo (sus reglas, el encargo o la bandeja), y lo que falló
if (repo && comoClave(repo.ruta) === comoClave(raiz)) {
  const carpeta = join(raiz, '.estudio', 'mediciones');
  const corridas = (existsSync(carpeta) ? readdirSync(carpeta) : [])
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => { try { return [JSON.parse(readFileSync(join(carpeta, f), 'utf8')) as Corrida]; } catch { return []; } })
    .filter((c) => typeof c.cuando === 'string' && Array.isArray(c.vueltas))
    .sort((a, b) => b.cuando.localeCompare(a.cuando));
  // Lo que ya pasa no se vuelve a correr, y la medición no detiene la cola (nota de voz del titular nmvsgcn7otit)
  linea('\n## La medición del núcleo: cómo está medido; lo que ya pasa no se vuelve a correr y la medición no detiene tu cola (la pide la persona, eligiendo cuáles de los que fallan)');
  for (const l of lineasDeMedicion(corridas)) linea(l);
}

linea(`\n## Etapa del arranque: ${etapa.toUpperCase()}`);
// Los procedimientos que tocan, aparte de CLAUDE.md (pr_reglas_por_encargo): los elige el código, no el modelo. La cola de
// diagnósticos nombra los suyos donde se lista, al final
const procedimientos = procedimientosDeLaRevision({ etapa, tipo: proyecto.tipo, replanteada: !!replanteada && plan.fases.length > 1, mantenimiento: /mantenimiento/i.test(fase.etapa ?? ''), esElStudio: !!repo && comoClave(repo.ruta) === comoClave(raiz) });
if (procedimientos.length) linea(`Los procedimientos de esta revisión, aparte de CLAUDE.md: léelos enteros antes de hacer lo que piden. ${procedimientos.map((p) => `${PROCEDIMIENTOS[p].archivo} (${PROCEDIMIENTOS[p].para})`).join('; ')}.`);
if (etapa === 'conectar') {
  linea('El repositorio no está conectado en este computador, así que aún no hay diagnóstico posible. Responde las notas que haya');
  linea('y deja el mensaje recordando la misión de conectar (Estudio › Proyecto). Si el titular te dio la ruta por el chat, que la');
  linea('guarde él en el Estudio: la ruta es de cada computador.');
} else if (etapa === 'contar') {
  linea('PROYECTO NUEVO SIN CONTAR: falta la explicación, el objetivo o cuándo se considera completo (Estudio › Proyecto). Responde');
  linea('las notas que haya (si lo contó por audio en el Buzón, eso cuenta: resúmelo en tu respuesta) y deja el mensaje pidiendo lo que falta.');
} else if (etapa === 'diagnostico' && proyecto.tipo === 'nuevo') {
  linea(`PROYECTO NUEVO: TOCA EL PLANTEAMIENTO. Sigue ${PROCEDIMIENTOS.planteamiento.archivo}: lo que entendiste, el alcance,`);
  linea(`los supuestos, los riesgos y las preguntas abiertas en plan.diagnostico; 2 o 3 objetivos en plan.objetivos a partir de su objetivo y`);
  linea(`de cuándo lo da por completo; ${rutas.docs}/director/planteamiento.md con sus partes y su «Para decidir»; y la misión de leerlo.`);
  if (repo) linea('Hay una carpeta conectada: mírala (diagnosticar.ts) por si ya tiene algo hecho, pero el planteamiento parte de lo que contó.');
} else if (etapa === 'diagnostico') {
  linea(`TOCA DIAGNOSTICAR. Corre \`node tools/director/diagnosticar.ts\`, lee el repositorio a fondo y sigue ${PROCEDIMIENTOS.diagnostico.archivo}:`);
  linea(`plan.diagnostico, 2 o 3 objetivos candidatos en plan.objetivos, ${rutas.docs}/director/diagnostico.md con sus partes`);
  linea('y su «Para decidir», los frentes con sus rutas, y la misión del titular para leerlo y fijar su meta.');
} else if (etapa === 'objetivo') {
  linea('El diagnóstico está hecho; falta que el titular fije su meta (Estudio › Proyecto › La meta). Responde sus notas');
  linea('sobre el diagnóstico y los candidatos. Si lo que dijo cambia los candidatos, agrégalos o ajústalos en plan.objetivos y');
  linea('escribe lo que cambió en un documento nuevo, corto, como paso siguiente (el diagnóstico revisado queda sellado).');
} else if (etapa === 'ruta') {
  linea(`EL OBJETIVO ESTÁ FIRMADO: TOCA TRAZAR LA RUTA. Sigue ${PROCEDIMIENTOS.ruta.archivo}: las fases que faltan después de`);
  linea('«arranque», con su puerta y sus criterios; lo que hace cada frente en cada una; la primera misión de cada persona (una a');
  linea('la vez); el mensaje; y un documento corto con la ruta para que el titular la comente. La puerta del arranque la cruza él.');
}

linea(`\n## Entregas por revisar (${entregas.length})`);
for (const m of entregas) {
  const e = estado.entregas[m.id];
  linea(`\n### «${m.titulo}» (${nombre(m.para)}) · misión ${m.id}`);
  linea(`- Entregada por ${e.quien}, ${e.cuando}. Lo pedido: ${m.entrega}`);
  if (m.criterios?.length) linea(`- Criterios que adelanta: ${m.criterios.join(', ')}`);
  const docs = documentosDeMision(m);
  if (docs.length) linea(`- Documentos: ${docs.join(', ')} (ver sus notas abajo)`);
  if (e.nota) linea(`- Nota: ${e.nota}`);
  if (e.audio) linea(`- Audio (${e.audio}): ${transcripcion(e.audio) ?? '(sin transcribir)'}`);
  const sinMarcar = pasosSinMarcar(m, estado.pasos?.[m.id]?.hechos ?? []);
  const pasos = (l: number[]) => (l.length === 1 ? `el paso ${l[0] + 1}` : `los pasos ${l.map((i) => i + 1).join(', ')}`);
  if (e.sinTerminar !== undefined) linea(`- ENTREGADA SIN TERMINAR: no le salió el paso ${e.sinTerminar + 1} y siguió con otra misión con «No me salió» (la nota dice qué pasó)${sinMarcar.length ? `; sin marcar, ${pasos(sinMarcar)}` : ''}. No la apruebes por lo marcado: haz tú lo que falte, si puedes y está aprobado, o devuélvela («rehacer») con el paso corregido para que salga a la primera.`);
  else if (sinMarcar.length) linea(`- Sin marcar: ${pasos(sinMarcar)}. No usó «No me salió»: la misión pudo cambiar después de entregarla, o una marca no se guardó. Compruébalo antes de aprobar.`);
  avisarPorComprobar(m);
}
if (entregadasDespues) linea(`\n(${entregadasDespues === 1 ? 'Una misión se entregó' : `${entregadasDespues} misiones se entregaron`} después de empezar esta revisión: ${entregadasDespues === 1 ? 'espera' : 'esperan'} la siguiente. No ${entregadasDespues === 1 ? 'la' : 'las'} revises ahora.)`);

/** Lo marcado a mano que pasa fuera del Studio: el director no lo da por hecho sin evidencia (docs/metodo/director/review-cycle.md › los pasos, paso 1). */
function avisarPorComprobar(m: (typeof plan.misiones)[number]) {
  const porComprobar = pasosPorComprobar(m, estado.pasos?.[m.id]?.hechos ?? []);
  if (!porComprobar.length) return;
  const texto = (i: number) => { const x = m.pasos[i]; return (typeof x === 'string' ? x : x.texto).slice(0, 90); };
  linea(`  ⚠ Compruébalo antes de darlo por hecho (marcado a mano, pasa fuera del Studio): ${porComprobar.map((i) => `${i + 1}. «${texto(i)}»`).join('; ')}. Busca la evidencia (el repositorio, la herramienta, lo que haya dejado); si no la hay, no lo apruebes: devuélvele el paso y dile qué no encontraste.`);
}

/** Los adjuntos de una nota, con su ruta en disco: el director los abre (lee imágenes y PDF directamente). */
function adjuntosDe(n: (typeof notas)[number]) {
  for (const a of n.adjuntos ?? []) linea(`  Adjunto «${a.nombre}» (${Math.max(1, Math.round(a.bytes / 1024))} KB): ${existsSync(enDisco(a.ruta)) ? enDisco(a.ruta) : `${a.ruta} (aún no está en este computador)`}`);
}

// Las urgentes van primero: el titular pide prioridad, y el director decide (docs/metodo/director/review-cycle.md › los pasos, paso 2)
const comentarios = notas.filter((n) => !esPregunta(n)).sort((a, b) => Number(!!b.urgente) - Number(!!a.urgente));
const preguntas = notas.filter(esPregunta);
const urgentes = comentarios.filter((n) => n.urgente).length;
linea(`\n## Notas sin respuesta (${comentarios.length}${urgentes ? `, ${urgentes} ${urgentes === 1 ? 'urgente' : 'urgentes'}` : ''})`);
if (urgentes) linea('Las urgentes, primero. Decide tú si lo son: hazla ya, vuélvela la misión siguiente o explica qué debe ir antes; y di si de verdad era urgente.');
for (const n of comentarios) {
  const s = n.sobre;
  const sobre =
    s.tipo === 'documento' ? `documento ${s.id}${s.seccion ? ` › «${s.seccion}»` : ''}${s.decision ? ` › decisión «${s.decision}»` : ''}${s.fragmento ? ` › la idea que empieza «${s.fragmento}»` : ''}`
    : s.tipo === 'mision' ? `misión «${plan.misiones.find((m) => m.id === s.id)?.titulo ?? s.id}»${s.seccion ? ` › ${s.seccion}` : ''}`
    : s.tipo === 'propuesta' ? `propuesta «${plan.propuestas.find((p) => p.id === s.id)?.titulo ?? s.id}»`
    : s.tipo === 'diagnostico' ? `el diagnóstico${s.seccion ? ` › frente «${s.seccion}»` : ''}`
    : s.tipo === 'objetivo' ? `el objetivo${s.id ? ` (candidato ${s.id})` : ''}`
    : s.tipo === 'general' ? `general${s.seccion ? ` › ${s.seccion}` : ''}${s.fragmento ? ` › la línea que empieza «${s.fragmento}»` : ''}` : `${s.tipo} ${s.id ?? ''}`;
  linea(`\n- [${n.id}] ${n.urgente ? 'URGENTE · ' : ''}${n.quien}, ${n.cuando}, sobre ${sobre}:`);
  // Las notas viejas traían su razón aparte; las nuevas la dicen en la nota misma: léela para decidir si de verdad urge
  if (typeof n.urgente === 'string') linea(`  Por qué no puede esperar: ${n.urgente.replace(/\s+/g, ' ')}`);
  if (n.texto) linea(`  ${n.texto.replace(/\n/g, '\n  ')}`);
  if (n.audio) linea(`  Audio (${n.audio}): ${transcripcion(n.audio) ?? '(sin transcribir)'}`);
  adjuntosDe(n);
  if (s.tipo === 'mision' && s.aclarar) {
    const veces = aclaracionesDe(estado.notas, s.id ?? '', Number(/\d+/.exec(s.seccion ?? '')?.[0] ?? 1) - 1).length;
    linea(`  «No lo entiendo, explícamelo mejor» (${veces === 1 ? 'la primera vez' : `${veces} veces`}): el Studio no pudo aclararlo al instante. Reescribe ese paso con más contexto (\`texto\` y, si son varias acciones, \`detalle\`), sin cambiar su número, y responde con su \`destino\` en la misión.`);
  } else if (s.tipo === 'mision' && s.eleccion === YA_LO_DIJE) {
    // Ninguna opción le calzaba: el paso lo responde lo que ya dijo con su ✉ de ese paso (el último antes de este clic)
    const c = n.de ? comentarioDe(estado.notas.filter((x) => x.cuando <= n.cuando), s.id ?? '', Number(/\d+/.exec(s.seccion ?? '')?.[0] ?? 1) - 1, n.de) : undefined;
    // Un audio sin voz deja su .txt vacío: no es «solo adjuntos»
    const oido = c?.audio ? (transcripcion(c.audio) ?? '(audio sin transcribir)') || '(audio sin voz)' : '';
    const dicho = c ? [c.texto?.trim(), oido].filter(Boolean).join(' · ').replace(/\s+/g, ' ') || '(solo adjuntos)' : '';
    linea(`  Dio el paso por respondido con su comentario de ese paso («${YA_LO_DIJE}», con un clic; el paso quedó hecho)${c ? `: [${c.id}] «${dicho}»` : ', pero no encontré ese comentario: búscalo en el Buzón'}. Llévalo al plan como cualquier respuesta.`);
  } else if (s.tipo === 'mision' && s.eleccion) {
    linea(`  Eligió «${s.eleccion}» entre las opciones del paso, con un clic (el paso quedó hecho): llévalo al plan como cualquier respuesta.`);
  } else if (s.tipo === 'mision' && s.hazlo) {
    linea('  «Hazlo tú»: te encargó este paso, confirmado en el Studio (el paso quedó marcado). Hazlo en esta revisión, con las normas del proyecto, y responde con el resultado y su `destino`. Si al final no se puede, dilo y devuélvele el paso en su misión.');
  } else if (s.tipo === 'documento' && s.decision && s.postura === 'comenta') linea('  Comenta la decisión sin decidirla: respóndelo; la decisión sigue abierta en el documento.');
  else if (s.tipo === 'documento' && s.decision) linea(`  ${s.postura === 'aprueba' ? 'Aprobó la recomendación (de acuerdo con lo que recomiendas)' : 'Es una decisión'}: llévala al plan y di en su respuesta dónde quedó (\`destino\`).`);
  // Decidir con un formulario (pd_formulario): los destinos que ya existen, calculados, para elegir y no armar
  const aMano = destinosDeNota(plan, n, fase?.id);
  if (aMano.length) linea(`  Destinos a mano (existen; si nace un pedido o una propuesta, el suyo): ${aMano.map((d) => `\`${JSON.stringify(d)}\``).join(' · ')}`);
  linea(`  Tratamientos que le caben: ${tratamientosDeNota(n).join(' · ')}`);
}

// Las preguntas van aparte: el titular las lee en «Preguntas», como un informe (docs/metodo/director/review-cycle.md › los pasos, paso 8)
linea(`\n## Preguntas sin respuesta (${preguntas.length})`);
if (preguntas.length) linea('Respóndelas como un informe: primero la respuesta directa, después el porqué; completas, y en Markdown si ayuda.');
for (const n of preguntas) {
  linea(`\n- [${n.id}] ${n.quien}, ${n.cuando}:`);
  // Si sigue una conversación, lo que ya se dijo en ella: la respuesta va en ese contexto
  if (n.sobre?.id) {
    const hilo = hilosDePreguntas(estado.notas).find((h) => h.notas.some((x) => x.id === n.id));
    for (const x of hilo?.notas.filter((y) => y.cuando < n.cuando) ?? []) {
      // Entero, también el audio junto al texto: lo que se dijo en la conversación no se corta (nada se corta en silencio)
      linea(`  (en la conversación) [${x.id}] ${[x.texto?.trim(), transcripcion(x.audio)].filter(Boolean).join(' · ').replace(/\s+/g, ' ') || 'audio'}`);
      if (plan.respuestas[x.id]) linea(`  (respondiste) ${plan.respuestas[x.id].texto.replace(/\s+/g, ' ')}`);
    }
    linea('  Sigue así:');
  }
  if (n.texto) linea(`  ${n.texto.replace(/\n/g, '\n  ')}`);
  if (n.audio) linea(`  Audio (${n.audio}): ${transcripcion(n.audio) ?? '(sin transcribir)'}`);
  adjuntosDe(n);
  linea(`  Tratamientos que le caben: ${tratamientosDeNota(n).join(' · ')}`);
}
if (despues) linea(`\n(${despues} ${despues === 1 ? 'nota llegó' : 'notas llegaron'} después de empezar esta revisión: ${despues === 1 ? 'espera' : 'esperan'} la siguiente. No ${despues === 1 ? 'la' : 'las'} respondas ahora.)`);

linea('\n## Decisiones del equipo desde la última revisión');
const nuevas = (f?: string) => !!f && f >= desdeDia;
for (const [id, r] of Object.entries(estado.propuestas)) if (nuevas(r.fecha)) linea(`- Propuesta «${plan.propuestas.find((p) => p.id === id)?.titulo ?? id}»: ${r.estado}${r.nota ? ` · ${r.nota}` : ''} (${r.quien})`);
for (const [id, m] of Object.entries(estado.marcas)) if (nuevas(m.fecha)) linea(`- Decisión del titular sobre «${id}»: ${m.estado}${m.nota ? ` · ${m.nota}` : ''}`);
for (const [id, c] of Object.entries(estado.cierres)) if (nuevas(c.fecha)) linea(`- Puerta cruzada: ${id}${c.nota ? ` · ${c.nota}` : ''} (${c.quien})`);
for (const x of estado.excepciones) if (nuevas(x.fecha)) linea(`- Excepción en ${x.frente} hasta ${x.hasta}: ${x.motivo} (${x.quien})`);
for (const v of estado.validaciones) if (nuevas(v.fecha)) linea(`- Validación ${v.tipo}: ${v.personas} personas, lo lograron ${v.lograron}, lo aprueban ${v.aprueban}${v.hallazgos ? ` · ${v.hallazgos}` : ''} (${v.quien})`);
for (const [id, e] of Object.entries(estado.empezadas)) if (e.cuando >= desde) linea(`- Empezó la misión ${id} (${e.quien})`);
for (const b of estado.bitacora) if (nuevas(b.fecha) && /objetivo|proyecto|equipo/i.test(b.texto)) linea(`- ${b.texto} (${b.quien})`);

// Lo aprobado y sin hacer, siempre a la vista, de cualquier día: no depende de que el director lo busque (nota de voz del
// titular del 22 de octubre de 2026). Lo de esta fase o de antes va una sola vez, en «Tu cola», con su fecha o sus notas;
// aquí, lo de las fases que vienen (el paquete de cada revisión, solo con lo que le sirve: pr_encargo_a_medida)
const porEjecutar = aceptadasSinEjecutar(plan, estado);
const tuCola = colaDelDirector(plan, estado);
const enTuCola = new Set(tuCola.map((t) => t.id));
const queVienen = porEjecutar.filter((x) => !enTuCola.has(x.propuesta.id));
const enCola = (n: number, que: string) => (n ? `${n === 1 ? `La de esta fase o de antes está` : `Las ${n} de esta fase o de antes están`} en «Tu cola», abajo, en tu orden, con ${que}. ` : '');
linea(`\n## Propuestas aceptadas sin ejecutar (${porEjecutar.length})`);
if (porEjecutar.length) {
  linea(`Lo que el titular ya aprobó y aún no está hecho. ${enCola(porEjecutar.length - queVienen.length, 'la fecha en que se aceptó')}Cuando ejecutes una, va en \`ejecutadas\` con su nota; si ya se hizo por otro camino, también (con la evidencia), y sale de esta lista.${queVienen.length ? ' De las fases que vienen, de la más vieja a la más nueva:' : ''}`);
  for (const { propuesta: p, aceptada: a } of queVienen) linea(`- [${p.id}] «${p.titulo}» · fase ${p.fase} · aceptada el ${a.fecha.slice(0, 10)} (${a.quien})${a.nota ? ` · ${a.nota.replace(/\s+/g, ' ')}` : ''}`);
}
// Lo pedido en las notas, con su estado (nota de voz del titular, 22 de octubre de 2026: «no las está almacenando»)
const reemplazados = reemplazos(plan);
const pedidos = (plan.pedidos ?? []).filter((p) => !p.hecho && !reemplazados.has(p.id));
const pedidosQueVienen = pedidos.filter((p) => !enTuCola.has(p.id));
linea(`\n## Pedidos sin hacer (${pedidos.length})`);
linea(`Lo que el equipo pidió en sus notas y te comprometiste a hacer (\`pedidos\`). Cada nota que pide trabajo deja aquí su pedido, con su fase, en la misma revisión en que la respondes; al hacerlo, ponle \`hecho\` (cuándo y cómo: el commit). La misión que cierra una fase espera a que no quede ninguno de esa fase ni de antes. ${enCola(pedidos.length - pedidosQueVienen.length, 'sus notas')}${pedidosQueVienen.length ? 'Los de las fases que vienen no se trabajan ahora: van solo por su id. ' : ''}El texto entero de cada pedido está en el plan: léelo por su id (Grep) antes de trabajarlo, de responder una nota sobre lo mismo o de cambiarlo.`);
for (const g of idsPorFase(pedidosQueVienen, plan.fases.map((f) => f.id))) linea(`- ${g.fase === DESPUES ? 'después del lanzamiento (no detiene ninguna puerta)' : `fase ${g.fase}`} (${g.ids.length}): ${g.ids.join(', ')}`);
// Lo reemplazado, fuera (pd_lo_vigente): lo que un pedido o una propuesta reemplaza ya no es trabajo, y en el cierre va al
// archivo; mientras lo que lo reemplazó siga pendiente, aquí solo se nombra, para buscarlo por su id si hace falta
const pendientesIds = new Set([...pedidos.map((p) => p.id), ...porEjecutar.map((x) => x.propuesta.id)]);
const reemplazadosVivos = [...reemplazados].filter(([, por]) => pendientesIds.has(por));
if (reemplazadosVivos.length) linea(`Fuera de lo pendiente, porque otro lo reemplazó (\`reemplaza\`; en el cierre van al archivo): ${reemplazadosVivos.map(([id, por]) => `${id} por ${por}`).join(', ')}.`);
// Lo pendiente, cruzado solo con lo hecho desde la última revisión (pr_memoria_consultable, punto 3)
const pistas = puedeQueYaEsteHecho(piezasPendientes(plan, estado), commitsDesde(repo?.ruta, desde, 0));
if (pistas.length) {
  linea(`\n## Puede que ya esté hecho (${pistas.length})`);
  linea('Lo pendiente de arriba que un commit desde la última revisión nombra por su id o se le parece de verdad, con esa evidencia. Por cada uno: si ya está hecho, va en `ejecutadas` o lleva `hecho`; si está a medias o no es lo mismo, dilo en `alDia`, nombrando su id. Sin eso, --listo no cierra.');
  for (const x of pistas) linea(`- [${x.id}] ${enUnaLinea(x.titulo)}: ${x.evidencia.map((e) => `${e.hash} ${e.como} («${enUnaLinea(e.asunto, 120)}»)`).join('; ')}`);
}
// Tu cola, aparte de la de cada persona (nota de voz del titular, 23 de octubre de 2026): en el orden que decides. Cada
// cosa una sola vez, aquí: con la fecha en que se aceptó la propuesta o las notas del pedido
const sinLugar = new Set(colaSinOrden(plan, estado).map((t) => t.id));
const deDonde = (t: (typeof tuCola)[number]) => {
  if (t.tipo === 'propuesta') { const a = estado.propuestas[t.id]; return a ? ` · aceptada el ${a.fecha.slice(0, 10)}` : ''; }
  const notas = plan.pedidos?.find((p) => p.id === t.id)?.notas ?? [];
  return notas.length ? ` · notas ${notas.join(', ')}` : '';
};
linea(`\n## Tu cola, en tu orden (${tuCola.length}; aparte de las misiones de cada persona)`);
linea('Lo aprobado y lo pedido sin hacer de esta fase o de antes, en el orden de `colaDirector`. La trabajas en cada revisión, de arriba hacia abajo, sin esperar a que la persona termine sus misiones; su reserva no la cuenta ni la llena. Revisa el orden en cada revisión (lo que hay que construir primero, antes) y pon en su lugar lo que no lo tiene: sin eso, --listo no cierra.');
for (const [i, t] of tuCola.entries()) linea(`${i + 1}. [${t.id}] ${t.tipo} · fase ${t.fase} · ${enUnaLinea(t.titulo, 140)}${deDonde(t)}${sinLugar.has(t.id) ? ' · ⚠ sin lugar en tu orden' : ''}`);
// La cola autorizada entera (nota de voz del titular nmvqvu1sctit, 27 de octubre de 2026): no se pregunta si sigue
if (tuCola.length && plan.colaAutorizada) linea(`La persona autorizó tu cola entera (nota ${plan.colaAutorizada.nota}): trabájala en esta revisión tan lejos como alcances, sin detenerte a preguntarle si sigues ni dejarle una misión de lanzar el tramo que sigue; pídele solo lo que de verdad la necesita.`);
// Las revisiones seguidas y el límite de cada una (pedido pd_revisiones_seguidas; nota de voz del titular nmvqwclpitit)
if (seguidasActivas(local.seguidas, id)) linea(`Van revisiones seguidas (las pidió ${local.seguidas.quien}): al cerrar, el Studio lanza la siguiente solo si dices que tu cola sigue. Antes de --listo escribe \`"tramo": { "cuando": "<ISO ahora>", "seguir": true | false, "razon": "…", "minutos": <cuánto estimas que dura la siguiente> }\`: \`seguir\` falso si algo de verdad necesita a la persona antes de seguir, o si tu cola se acabó. Sin eso, --listo no cierra.`);
if (tuCola.length) linea(`El límite de la revisión que sigue lo estimas tú: \`tramo.minutos\` (de ${MAX_MIN_REVISION} a ${TOPE_MIN_TRAMO}), si lo que sigue en tu cola es una ejecución larga. Sin él, ${MAX_MIN_REVISION} minutos.`);
// El plan que viene no es estático (notas de voz del titular, 22 de octubre de 2026): lo hecho se cruza con lo pendiente
if (tuCola.length) linea(`Antes de ejecutar algo de tu cola o de pedirle algo a una persona, búscalo: node tools/director/buscar.ts "<palabras>" --proyecto ${id} dice si ya está hecho, de ahora, previsto o respondido, con su hilo (pr_memoria_consultable).`);
if (porEjecutar.length || pedidos.length) linea('Lo hecho, contra lo pendiente: si desde la última revisión hubo trabajo (commits del repositorio, también los que hagas en esta, o «Hazlo tú»), cruza con él cada propuesta y cada pedido de estas dos listas y las misiones previstas de cada fase (`fases[].misiones`): lo hecho va en `ejecutadas` o lleva `hecho`, lo que cambió se pone al día y lo que ya no va sale. Después deja dicho qué comprobaste en `alDia` (`{ "cuando": "<ISO ahora>", "nota": "…" }`). Sin eso, --listo no cierra.');
// Lo aplazado para esta fase que solo vive en una respuesta: ninguna idea depende de que el director la busque (nota de
// voz del titular, 22 de octubre de 2026)
const aplazadas = aplazadasSinPedido(plan, faseActual(plan, estado).id);
if (aplazadas.length) {
  linea(`\n## Lo aplazado para esta fase, sin su pedido (${aplazadas.length})`);
  linea('Respuestas «aplazada» que llevan a esta fase o a una anterior y solo viven en su texto. Por cada una: si lo que pedía sigue por hacer, déjalo como pedido (`pedidos`, con la nota en `notas`) en la fase donde va; si ya se hizo, también, con su `hecho`; si es una propuesta, nómbrala en ella. Así sale de esta lista.');
  for (const id of aplazadas) { const r = plan.respuestas[id]; linea(`- [${id}] ${r.cuando.slice(0, 10)} · ${r.texto.replace(/\s+/g, ' ').slice(0, 220)}`); }
}

// Lo adelantado es solo lo hecho de las fases que vienen: si dice que algo falta, ese algo no tiene estado («El plan
// liviano», punto 4)
const adelantadoPendiente = adelantadoConPendiente(plan, estado);
if (adelantadoPendiente.length) {
  linea(`\n## Lo adelantado que dice que algo falta (${adelantadoPendiente.length})`);
  linea('`adelantado` guarda solo lo ya hecho que cuenta para una fase que viene. Por cada una: deja en ella solo lo hecho, y lo que falta, como pedido (`pedidos`) o en una propuesta de su fase, donde tiene su estado. Así sale de esta lista.');
  for (const a of adelantadoPendiente) linea(`- ${a.fase} · ${a.frente} · ${a.texto.replace(/\s+/g, ' ').slice(0, 220)}`);
}

// Lo que el director pidió hacer afuera en los últimos días: lo hicieron porque él lo pidió, y así lo dice cuando hable de
// ello. Solo lo reciente: lo de antes ya es historia, y buscar.ts lo encuentra (pr_encargo_a_medida)
const fuera = pedidoFueraDelStudio(plan, estado.notas, new Date(Date.now() - DIAS_FUERA_DEL_STUDIO * 864e5).toISOString());
if (fuera.length) {
  linea(`\n## Lo que pediste hacer fuera del Studio (misiones aprobadas, últimos ${DIAS_FUERA_DEL_STUDIO} días)`);
  linea('Lo hicieron porque tú lo pediste: si hablas de ello, dilo como tuyo. Es lo que cambió afuera (ramas, cuentas, configuración, lo subido); lo de antes, con buscar.ts.');
  for (const x of fuera) linea(`- ${x.aprobada.slice(0, 10)} · ${x.mision.id}, paso ${x.paso + 1}: ${x.texto.replace(/\s+/g, ' ').slice(0, 160)}${x.eleccion === YA_LO_DIJE ? ' → lo respondió con su comentario del paso' : x.eleccion ? ` → eligió «${x.eleccion}»` : ''}`);
}

// El freno del director: lo revisado queda sellado. Si cambió, va un documento nuevo con lo que cambió, como paso siguiente.
const cambiado: Record<string, string> = {};
for (const ruta of new Set(plan.misiones.flatMap(documentosDeMision))) {
  const propio = `${rutas.base}/${ruta}`;
  const f = ruta.startsWith('repo:') ? (repo ? await fechaDeCambio(repo.ruta, ruta.slice(5)) : null)
    : await fechaDeCambio(raiz, existsSync(enDisco(propio)) ? propio : ruta);
  if (f) cambiado[ruta] = f;
}
await sinLosDevueltos(plan, estado, cambiado, (ruta) => (existsSync(enDisco(`${rutas.base}/${ruta}`)) ? `${rutas.base}/${ruta}` : ruta));
const sellados = selladosQueCambiaron(plan, estado, cambiado).filter((x) => !x.ruta.startsWith('repo:'));
if (sellados.length) {
  linea('\n## ⚠ Error de dirección: cambiaste documentos ya revisados');
  for (const x of sellados) linea(`- ${x.ruta}: ${nombre(x.persona)} ya lo revisó en «${x.mision.titulo}». Devuélvelo como estaba y escribe lo que cambió en un documento nuevo, como paso siguiente.`);
}

linea('\n## Misiones abiertas (una a la vez: la primera es la que ve completa)');
// El orden es lo que dirige (nota de voz del titular, 23 de octubre de 2026: «las misiones no pueden lanzarse en un orden
// aleatorio»): se le recuerda al director en cada revisión, con lo que el código ya retiene por él
linea('El orden lo pones tú, en cada revisión y para toda la cola: cada misión va donde se necesita, después de lo que necesita (`despuesDe`, que el Studio respeta solo) y no antes de tiempo. Lo que solo sirve al cierre va al cierre (`alCierre`); una decisión que puede cambiar la ruta o el alcance, lo antes posible; la que desbloquea tu trabajo, justo antes de él; ver lo que acabas de hacer, justo después; y lo de una fase futura no se pide ahora, salvo que algo de esta fase dependa de ello. Cada `porQue` dice por qué va en ese punto.');
for (const p of personas) {
  // La reserva (regla del titular, 21 de octubre de 2026; diez desde el 26): la de ahora y por lo menos nueve más que alcanza sin una
  // revisión de por medio (las retenidas al cierre no cuentan), para que nadie se quede sin misión esperando al director
  const reserva = reservaDeMisiones(plan, estado, p);
  const { abiertas } = reserva;
  const cola = reserva.faltan ? `  ⚠ reserva corta: alcanza ${reserva.alcanza} y faltan ${reserva.faltan} para las ${RESERVA_MINIMA} (la de ahora y ${RESERVA_MINIMA - 1} más; las retenidas al cierre no cuentan, ni las de la fase siguiente mientras haya una). Sin la reserva, --listo no cierra: mientras trabajas tu cola, la persona siempre tiene algo que hacer o revisar (ver o probar lo que hiciste, las decisiones que necesita lo que sigue en tu cola, lo que solo ella sabe, preparar lo que la fase pide con tiempo, lo suyo de las fases siguientes que no va a cambiar). Tu cola nunca es la razón para darle menos; solo un lote corto que agiliza la revisión que sigue, en \`reservaCorta\` con su \`lote\`, y nunca en cero.` : '';
  // Lo que cierra la fase espera a que esté hecho todo lo aprobado (nota de voz del titular, 22 de octubre de 2026)
  const espera = reserva.enEspera.length ? ` · en espera del cierre (aparecen cuando no quede ninguna propuesta aceptada ni ningún pedido sin hacer de su fase o de antes): ${reserva.enEspera.map((m) => m.id).join(', ')}` : '';
  const necesitan = reserva.esperan.length ? ` · esperan lo que necesitan antes: ${reserva.esperan.map((m) => `${m.id} (${esperaA(plan, estado, m).join(', ')})`).join(', ')}` : '';
  linea(`- ${nombre(p)}: ${abiertas.map((m) => `${m.id} (${estadoMision(m, plan, estado)})`).join(', ') || `ninguna: asígnale la siguiente y la reserva (${RESERVA_MINIMA} en total)`}${necesitan}${espera}${reserva.siguientes.length ? ` · en la fase siguiente: ${reserva.siguientes.map((m) => m.id).join(', ')}` : ''}${cola}`);
  for (const m of abiertas) {
    const marcados = estado.pasos?.[m.id]?.hechos.filter((i) => i < m.pasos.length) ?? [];
    // Llevar de la mano: un paso que manda a un lugar trae su botón (nota de voz del titular, 22 de octubre de 2026)
    const sinBoton = pasosSinBoton(m).filter((i) => !marcados.includes(i));
    if (sinBoton.length) linea(`  ⚠ ${m.id}: ${sinBoton.map((i) => `el paso ${i + 1}`).join(', ')} manda${sinBoton.length === 1 ? '' : 'n'} a un lugar sin botón. Ponle su \`ir\` (anclas en CLAUDE.md, «Llevar de la mano»); si lo nombrado ya está a la vista donde se lee el paso, déjalo así.`);
    if (!marcados.length) continue;
    const texto = (i: number) => { const x = m.pasos[i]; return (typeof x === 'string' ? x : x.texto).slice(0, 90); };
    linea(`  · ${m.id}: ya marcó ${marcados.length} de ${m.pasos.length} pasos. No los vuelvas a pedir ni los nombres como pendientes: ${marcados.map((i) => `${i + 1}. «${texto(i)}»`).join('; ')}`);
    avisarPorComprobar(m);
  }
}
// Lo que ya se hizo no se vuelve a pedir: lo que pasó desde la última revisión alrededor de cada misión abierta
const commits = commitsDesde(repo?.ruta, desde);
const porVigilar = misionesPorVigilar(plan, estado, desde, commits);
if (porVigilar.length) {
  linea('\n## Lo hecho desde la última revisión: ¿deja atrás algo de las misiones abiertas?');
  if (commits.length) linea(`Commits del repositorio: ${commits.map((c) => `${c.hash} ${c.asunto}`).join(' | ')}`);
  for (const { mision, hubo } of porVigilar) {
    const propio = hubo.filter((h) => !h.startsWith('commit '));
    linea(`- ${mision.id} («${mision.titulo}»)${propio.length ? `: ${propio.join('; ')}` : ''}`);
  }
  linea('Por cada una: si un paso o un documento suyo ya se hizo o se decidió por otro camino, sácalo (y dilo en la respuesta); después ponle `"vigente": "<ISO ahora>"`. Sin eso, --listo no cierra. Esto vale también para las misiones que escribas en esta revisión.');
}

// Lo que viene recoge todo lo dicho: antes de cerrar, cada documento que aún no se revisa debe llevar el feedback de
// esta revisión, y la misión siguiente de cada uno se decide de nuevo con él
linea('\n## Documentos por revisar: ponles todo lo nuevo antes de cerrar');
for (const p of personas) {
  const pendientes = documentosEnOrden(plan, estado, p).filter((d) => d.estado !== 'revisado' && !d.ruta.startsWith('repo:'));
  linea(`- ${nombre(p)}: ${pendientes.map((d) => `${d.ruta} («${d.mision.titulo}»)`).join(', ') || 'ninguno'}`);
  // Solo el documento que sigue: tenerlos escritos por adelantado es leer después lo que ya cambió o ya se hizo
  if (pendientes.length > 1) linea(`  ⚠ ${pendientes.length} documentos por leer: deja solo el que sigue. Los demás se escriben cuando les toque, con lo que haya pasado para entonces.`);
}
linea('Lo que ya se hizo no se vuelve a leer: por cada documento por leer, ¿lo que explica, propone o pide decidir ya se hizo, se decidió o se aprobó por otro camino (una nota, un «Hazlo tú», una iteración en el chat, lo avanzado)? Entonces sácalo de la misión (quita su paso y su entrada en `documentos` de la misión) y dilo en la respuesta: no se pide confirmar lo que ya está hecho.');
// El control de los cortes (regla crítica): ninguna idea por leer puede quedar mal cortada (un título solo, una línea
// corta, una imagen sin su texto, un bloque sin cerrar, una idea demasiado larga)
const porLeer = new Set(personas.flatMap((p) => documentosEnOrden(plan, estado, p).filter((d) => d.estado !== 'revisado' && !d.ruta.startsWith('repo:')).map((d) => d.ruta)));
for (const ruta of porLeer) {
  const propio = enDisco(`${rutas.base}/${ruta}`);
  if (!existsSync(propio)) continue;
  const sueltas = ideasSueltas(readFileSync(propio, 'utf8'));
  if (sueltas.length) linea(`⚠ ${ruta}: ${sueltas.length} idea(s) quedarían mal cortadas; reescríbelas para que cada una se entienda sola y completa (si esa parte ya se leyó, déjala y evítalo en lo que escribas): ${sueltas.map((s) => `«${s.parte}» › «${s.idea.replace(/\s+/g, ' ').slice(0, 120)}» (${s.motivo})`).join('; ')}`);
}
linea('Cada nota y cada entrega de esta revisión: ¿cambia algo de esos documentos? Si sí, intégralo donde corresponde (no como parte nueva al final).');
linea('Y decide de nuevo la misión siguiente de cada uno con lo aprendido: si lo que viene ya no es lo correcto, cámbialo.');

const cola = await colaDeDiagnosticos(id);
if (cola.length) {
  linea(`
## Cola de diagnósticos (${cola.length}): proyectos recién entregados, sin diagnóstico`);
  linea(`Después del proyecto activo, diagnostica los primeros ${Math.min(POR_REVISION, cola.length)} (lee ${PROCEDIMIENTOS.cola.archivo} y, para cada uno, ${PROCEDIMIENTOS.diagnostico.archivo}), cada uno con --proyecto <id>. No cambian el proyecto activo del titular.`);
  // Un encargo grande, en vueltas (pr_retoma_automatica, punto 6): un corte se lleva una vuelta, no todo
  if (cola.length > 1) linea(EN_VUELTAS);
  linea('Si el Studio te lanzó, solo tienes permiso sobre estos proyectos si tu encargo los nombra («La cola de diagnósticos de esta revisión»): entonces puedes leer su repositorio y su historial de IA donde se sabe dónde está, y escribir su memoria .stl. Si no los nombra, o algo se te niega, dilo. Un proyecto que no puedas diagnosticar sigue en la cola: dilo en la respuesta y en el mensaje, no lo des por hecho.');
  cola.forEach((c, i) => linea(`- ${i < POR_REVISION ? 'AHORA' : 'después'}: ${c.nombre} (${c.id})${c.historial ? ` · historial de IA: ${c.historial}` : ''}`));
}

const otros = (await otrosProyectos(id)).filter((o) => !cola.some((c) => o.includes(`(${c.id})`)));
if (otros.length) {
  linea('\n## Los otros proyectos (no se atienden en esta revisión: conservan su buzón y su historial)');
  for (const o of otros) linea(`- ${o}`);
  linea('Para atender otro, el titular lo elige en el Estudio (o se corre esta bandeja con --proyecto <id>).');
}

linea(`\nPara responder: en ${enDisco(rutas.plan)}, \`revisiones\` (aprobada o rehacer, con comentario), \`respuestas\` (a cada nota, con su \`tratamiento\`:`);
linea('integrada, rechazada, aplazada, decision o informada; si es integrada, aplazada o decision, o responde una decisión de un documento,');
linea('con su `destino`: el lugar donde quedó, como el botón de un paso; sin él, --listo no cierra la revisión),');
linea(`\`evaluacion\` (criterios cumplidos), \`misiones\` nuevas, \`mensaje\`, \`boletin\` y el resumen «Dónde quedamos» (\`resumen\`, ${PROCEDIMIENTOS.ciclo.archivo});`);
linea(`sin leer el plan entero: escribe solo lo que cambia en ${join(memoria(id), 'director', 'cambios.json')} y corre node tools/director/bandeja.ts --proyecto ${id} --aplicar (lo junta y lo guarda si no le suma errores: src/director/parche.ts dice cómo);`);
// El plan crece con cada revisión: pasado el tope, --listo archiva solo lo cerrado, cada cosa en su mes
// (director/archivo/AAAA-MM.json); el archivo de una sola pieza, de antes, ya no cambia
const kb = Math.round(statSync(enDisco(rutas.plan)).size / 1024);
const conMeses = existsSync(enDisco(rutas.archivoMeses)) || kb > TOPE_PLAN_KB;
// El mapa que esta bandeja acaba de guardar va con lo del director; si no está (no se pudo guardar), no se nombra:
// git add falla entero con una ruta que no existe
const conMapa = existsSync(enDisco(rutaDelMapa(id)));
// Las transcripciones que hizo esta bandeja también (el audio no: nunca entra a git), si siguen ahí
const transcritos = transcritosAqui.filter((t) => existsSync(enDisco(`${CARPETA}/${id}/${t}`)));
const suyos = `director/plan.json${conMeses ? ' director/archivo' : ''}${conMapa ? ' director/mapa.json' : ''} docs director/radiografia.md${transcritos.map((t) => ` ${t}`).join('')}`;
linea(`luego \`node tools/director/bandeja.ts --listo\` y el commit en la memoria (rama stl), solo con lo del director (lo del equipo lo guarda el Studio): cd "${memoria(id)}", luego git add ${suyos}, luego git commit -m "Director (${id}): …" -- ${suyos} (tres órdenes, cada una por separado: tus permisos no aceptan &&).`);
if (!plan.resumen) linea('⚠ Este proyecto aún no tiene resumen «Dónde quedamos»: escríbelo antes de cerrar.');
if (kb > TOPE_PLAN_KB) linea(`El plan pesa ${kb} KB (el tope es ${TOPE_PLAN_KB} KB): al cerrar, --listo archiva solo las respuestas cerradas y las misiones aprobadas, con su veredicto, antes de esta revisión.`);
// El puntero a lo archivado: no se carga en cada revisión, pero el director puede volver a consultarlo
const dondeArchivo = [rutas.archivo, rutas.archivoMeses].filter((r) => existsSync(enDisco(r))).map((r) => enDisco(r));
if (dondeArchivo.length) linea(`Lo dicho antes (respuestas a notas cerradas, misiones aprobadas con su veredicto, propuestas cerradas y pedidos hechos) está en ${dondeArchivo.join(' y ')}${existsSync(enDisco(rutas.archivoMeses)) ? ' (un archivo por mes, el mes en que se cerró)' : ''}: no lo leas entero; búscalo ahí con Grep (por id de nota, de misión, de propuesta o de pedido; el índice del plan, en el mapa, ya dice su estado) si necesitas lo que ya respondiste. Las herramientas y el Studio ya lo cuentan.`);
