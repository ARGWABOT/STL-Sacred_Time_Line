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
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  aclaracionesDe,
  archivar,
  archivoVacio,
  comentarioDe,
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
  RESERVA_MINIMA,
  pasosPorComprobar,
  pedidoFueraDelStudio,
  pendientesDelDirector,
  respuestasSinDestino,
  resumenPorCerrar,
  sinAtenderAlCerrar,
  selladosQueCambiaron,
  validarEstado,
  validarPlan,
  validarProyecto,
  YA_LO_DIJE,
} from '../../src/director/director.ts';
import { fechaDeCambio, leerFresco } from '../../src/director/fresco.ts';
import { lineasDelMapa, sinCommitDeGit } from '../../src/director/mapa.ts';
import { corteDeRevision, enDisco as enDiscoDe, escribirDeUnaVez, leerLocal, marcarAclaracion, marcarRevision, marcarUrgencia, marcarVigilia, rutasDe, ubicar, urgenciaActiva } from '../../src/director/proyectos.ts';
import { comandoTranscripcion } from '../../src/director/transcripcion.ts';
import { argumentos, colaDeDiagnosticos, leerTodo, memoria, nombreDe, otrosProyectos, POR_REVISION, proyectoElegido, raiz } from './comun.ts';
import { guardarMapa, mapaDe, rutaDelMapa } from './mapa.ts';

const { args, pedido } = argumentos();
/** Hasta cuánto puede pesar el plan antes de que la bandeja avise. */
const TOPE_PLAN_KB = 256;

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
    await marcarAclaracion(raiz, a.nota, 'hecha');
    console.log(`Aclaración hecha: ${a.nota}`);
    process.exit(0);
  }
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
    if (sinRespuesta.length || sinDestino.length || errores.length) {
      for (const n of sinRespuesta) console.error(`No se cerró la urgencia: falta la respuesta a la nota ${n}.`);
      for (const n of sinDestino) console.error(`No se cerró la urgencia: la respuesta a ${n} no dice dónde quedó (\`destino\`).`);
      for (const e of errores) console.error(`- ${e}`);
      process.exit(1);
    }
    await marcarUrgencia(raiz, u.pedida, 'hecha');
    console.log(`Urgencia atendida: ${u.notas.join(', ')}`);
    process.exit(0);
  }
  // Un audio recién grabado: el Studio lo está transcribiendo; se espera un rato y, si no llega, se transcribe aquí
  const leido = await leerTodo(pedido, false);
  const urgentes = leido.estado.notas.filter((n) => u.notas.includes(n.id));
  const txt = (audio: string) => enDiscoDe(raiz, audio.replace(/\.[a-z0-9]+$/, '.txt'));
  const faltan = () => urgentes.map((n) => n.audio).filter((a): a is string => !!a && existsSync(enDiscoDe(raiz, a)) && !existsSync(txt(a)));
  for (let i = 0; i < 40 && faltan().length; i++) await new Promise((ok) => setTimeout(ok, 3000));
  if (faltan().length) {
    const { cmd, args: argumentosT } = comandoTranscripcion(raiz, faltan().map((a) => enDiscoDe(raiz, a)), `Notas para el director del proyecto ${leido.proyecto.nombre || elegido}.`);
    try {
      execFileSync(cmd, argumentosT, { stdio: 'inherit', shell: false });
    } catch (e) {
      console.error(`No se pudo transcribir: ${(e as Error).message}`);
    }
  }
  const { plan, proyecto } = leido;
  const l = (s = '') => console.log(s);
  l(`# Urgencia · ${proyecto.nombre} (${elegido})`);
  l(`${u.quien} marcó ${urgentes.length === 1 ? 'esta nota' : 'estas notas'} como urgente${urgentes.length === 1 ? '' : 's'}, y el Studio te lanzó solo para ${urgentes.length === 1 ? 'ella' : 'ellas'}, al instante. Atiende SOLO esto: las demás notas, entregas y documentos esperan la revisión completa; no los respondas ni cambies nada más del plan.`);
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
  const rutaArchivo = enDiscoDe(raiz, rutasDe(elegido).archivo);
  const plan: Plan = JSON.parse(readFileSync(rutaPlan, 'utf-8'));
  const archivo: ArchivoPlan = { ...archivoVacio(), ...(existsSync(rutaArchivo) ? JSON.parse(readFileSync(rutaArchivo, 'utf-8')) : {}) };
  const completo = unirArchivo(plan, archivo);
  // El doble check: lo que esta revisión llevó al plan dice dónde quedó; si no, la revisión no se cierra
  const { estado, proyecto, repo } = await leerTodo(pedido, false);
  const desde = plan.revisado ?? '';
  const sinDestino = respuestasSinDestino(plan, estado.notas, desde);
  if (sinDestino.length) {
    console.error('No se cerró la revisión: estas respuestas llevan algo al plan pero no dicen dónde quedó (`destino`: la misión, la propuesta, la fase o la parte del documento):');
    for (const id of sinDestino) console.error(`- ${id}`);
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
  // Un plan con errores no sale de la revisión: el titular nunca debe verlos en el Studio
  const errores = validarPlan(completo, proyecto.equipo.length ? proyecto.equipo.map((i) => i.id) : undefined);
  if (errores.length) {
    console.error('No se cerró la revisión: el plan tiene errores. Corrígelos y vuelve a cerrar:');
    for (const e of errores) console.error(`- ${e}`);
    process.exit(1);
  }
  // Lo que ya se hizo no se vuelve a pedir: cada misión abierta con trabajo nuevo alrededor se comprobó en esta revisión
  const porVigilar = misionesPorVigilar(completo, estado, desde, commitsDesde(repo?.ruta, desde));
  if (porVigilar.length) {
    console.error('No se cerró la revisión: desde la última hubo trabajo que puede dejar hecho algo de estas misiones abiertas. Por cada una, comprueba que nada de sus pasos ni de sus documentos ya se hizo o se decidió (si sí, sácalo), y ponle `"vigente": "<ISO ahora>"`:');
    for (const { mision, hubo } of porVigilar) console.error(`- ${mision.id} («${mision.titulo}»): ${hubo.length} cosa(s), como ${hubo.slice(0, 3).join('; ')}`);
    process.exit(1);
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
  const deDocumentos = documentosPorCerrar(completo, estado, proyecto.equipo.length ? proyecto.equipo.map((i) => i.id) : ['titular'], desde, cambiado, textos);
  if (deDocumentos.length) {
    console.error('No se cerró la revisión: hay que arreglar estos documentos (CLAUDE.md › «Siempre hacia adelante» y «Ningún corte malo»):');
    for (const m of deDocumentos) console.error(`- ${m}`);
    process.exit(1);
  }
  // La reserva de misiones (regla del titular, 21 de octubre de 2026): nadie se queda sin misión esperando al director
  const sinReserva = (proyecto.equipo.length ? proyecto.equipo.map((i) => i.id) : ['titular'])
    .map((p) => ({ p, ...reservaDeMisiones(completo, estado, p) }))
    .filter((r) => r.faltan && (r.abiertas.length || r.siguientes.length || completo.misiones.some((m) => m.para === r.p)));
  if (sinReserva.length) {
    console.error(`No se cerró la revisión: la reserva de misiones está corta. Cada persona tiene su misión de ahora y por lo menos ${RESERVA_MINIMA - 1} más (${RESERVA_MINIMA} en total), de la fase en curso o de la siguiente (bajo niebla hasta cruzar la puerta), para que nunca se quede sin misión esperando al director:`);
    for (const r of sinReserva) console.error(`- ${nombreDe(proyecto, r.p)}: ${r.abiertas.length} abierta(s) y ${r.siguientes.length} de la fase siguiente; faltan ${r.faltan}`);
    process.exit(1);
  }
  // «Dónde quedamos» es de esta revisión y no pasa de seis líneas (propuesta aceptada «El cierre no deja nada sin atender»)
  const delResumen = resumenPorCerrar(plan.resumen, desde);
  if (delResumen.length) {
    console.error('No se cerró la revisión: el resumen «Dónde quedamos» (`resumen`) no está listo. Reescríbelo al final de cada revisión, como dice CLAUDE.md:');
    for (const m of delResumen) console.error(`- ${m}`);
    process.exit(1);
  }
  // Lo que el titular ya vio: el plan del último commit de la memoria, leído una vez para lo avanzado y para el mensaje
  const guardado = planGuardado(rutasDe(elegido).plan);
  // «Lo que avanzamos» no reescribe una línea guardada (propuesta aceptada «El cierre no deja nada sin atender», punto 3):
  // reescrita o alargada, el Studio se la mostraría al titular otra vez como nueva
  const lineasGuardadas = guardado?.resumen?.avanzamos;
  const reescritas = lineasReescritas(plan.resumen?.avanzamos ?? [], Array.isArray(lineasGuardadas) ? lineasGuardadas.filter((l) => typeof l === 'string') : []);
  if (reescritas.length) {
    console.error('No se cerró la revisión: cada línea de abajo, en «Lo que avanzamos» (`resumen.avanzamos`), vuelve a decir, reescrita o alargada, una que el titular ya vio (la del último commit de la memoria), y el Studio se la mostraría otra vez como nueva. Una línea ya escrita se deja igual o se quita (CLAUDE.md › «Dónde quedamos»): por cada una, vuelve a poner la guardada tal como estaba (va entre comillas, para copiarla igual), quítala, o, si hay un avance nuevo, escríbelo en su línea con solo lo nuevo:');
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
  plan.revisado = new Date().toISOString();
  // El plan no crece sin fin: pasado el tope, lo cerrado antes de esta revisión sale solo al archivo
  let final = plan;
  const pesa = (p: Plan) => Math.round(Buffer.byteLength(JSON.stringify(p, null, 2)) / 1024);
  if (pesa(plan) > TOPE_PLAN_KB) {
    const a = archivar(plan, archivo, estado, desde);
    if (a.movidas) {
      final = a.plan;
      await escribirDeUnaVez(rutaArchivo, JSON.stringify(a.archivo, null, 2) + '\n');
      console.log(`Archivadas ${a.movidas} respuestas y veredictos cerrados en director/archivo.json: el plan pasó de ${pesa(plan)} KB a ${pesa(final)} KB. Agrega director/archivo.json al commit.`);
    }
    if (pesa(final) > TOPE_PLAN_KB) console.log(`⚠ El plan sigue pesando ${pesa(final)} KB (el tope es ${TOPE_PLAN_KB} KB): lo que queda no es respuesta ni veredicto cerrado; mira qué más sobra (misiones viejas, propuestas descartadas).`);
  }
  // De una vez: el Studio lo lee mientras tanto (para saber si cerró) y no debe encontrarlo a medio escribir
  await escribirDeUnaVez(rutaPlan, JSON.stringify(final, null, 2) + '\n');
  await marcarRevision(raiz, elegido, 'hecha');
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

/** Los commits del repositorio del proyecto desde la última revisión: lo hecho que puede dejar atrás una misión. */
function commitsDesde(ruta: string | undefined, desde: string): CommitReciente[] {
  if (!ruta || !desde) return [];
  try {
    return execFileSync('git', ['log', `--since=${desde}`, '--format=%h%x09%cI%x09%s'], { cwd: ruta, encoding: 'utf8' })
      .split('\n').filter(Boolean).map((l) => { const [hash, cuando, ...asunto] = l.split('\t'); return { hash, cuando, asunto: asunto.join('\t').slice(0, 140) }; });
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

// Si la pidieron desde el Studio, allá se ve que el director ya está revisando
await marcarRevision(raiz, await proyectoElegido(pedido), 'en_curso');

const { id, rutas, plan, proyecto, estado, personas, repo, errorRepo } = await leerTodo(pedido);
const enDisco = (ruta: string) => enDiscoDe(raiz, ruta);
const txtDe = (audio: string) => enDisco(audio.replace(/\.[a-z0-9]+$/, '.txt'));
const transcripcion = (audio?: string) => (audio && existsSync(txtDe(audio)) ? readFileSync(txtDe(audio), 'utf-8').trim() : null);
const todosLosAudios = () => [...estado.notas.map((n) => n.audio), ...Object.values(estado.entregas).map((e) => e.audio)].filter((a): a is string => !!a);

// ── Los audios y adjuntos de otras personas que aún no están en esta carpeta se bajan de GitHub ──
for (const a of [...todosLosAudios(), ...estado.notas.flatMap((n) => n.adjuntos ?? []).map((x) => x.ruta)]) {
  if (existsSync(enDisco(a))) continue;
  const datos = await leerFresco(raiz, a);
  if (!datos) continue;
  mkdirSync(dirname(enDisco(a)), { recursive: true });
  writeFileSync(enDisco(a), datos);
}

// ── Transcribir los audios que falten, en local (nada sale del equipo). El Studio ya transcribe cada audio en cuanto
// llega: aquí solo quedan los que no pudo (o los que llegaron de otro computador) ──
const audios = todosLosAudios().filter((a) => existsSync(enDisco(a)) && !existsSync(txtDe(a)));
if (audios.length && !args.includes('--sin-transcribir')) {
  console.error(`Transcribiendo ${audios.length} ${audios.length === 1 ? 'audio' : 'audios'} en local…`);
  const { cmd, args: argumentosT } = comandoTranscripcion(raiz, audios.map(enDisco), `Notas para el director del proyecto ${proyecto.nombre || 'nuevo'}.`);
  try {
    execFileSync(cmd, argumentosT, { stdio: 'inherit', shell: false });
  } catch (e) {
    console.error(`No se pudo transcribir (¿falta tools/entorno/instalar_transcripcion.sh?): ${(e as Error).message}`);
  }
}

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
const reintento = local.revision?.proyecto === id && !local.revision.hecha ? local.revision.reintento : undefined;
if (reintento) {
  const dejo = loQueDejo(plan, reintento.lanzada);
  const commitsDeEntonces = commitsDesde(repo?.ruta, reintento.lanzada);
  linea('\n## La revisión anterior no se cerró: retómala');
  linea(`La que lanzó el Studio el ${new Date(reintento.lanzada).toLocaleString('es-CO')} no se cerró (${reintento.que})${reintento.registro ? `; su registro: ${reintento.registro}` : ''}. Lo que esa revisión ya dejó está hecho y no se rehace: esta revisión solo termina lo que falta y cierra con --listo. Lo que está abajo como pendiente es lo que falta.`);
  const lista = (titulo: string, ids: string[]) => {
    if (ids.length) linea(`- ${titulo} (no las reescribas): ${ids.join(', ')}`);
  };
  lista('Respuestas que ya escribió en el plan', dejo.respuestas);
  lista('Veredictos de misiones que ya dio', dejo.revisiones);
  lista('Misiones que ya comprobó (vigente)', dejo.misiones);
  lista('Propuestas que ya ejecutó', dejo.ejecutadas);
  if (commitsDeEntonces.length) {
    linea(`- Commits del repositorio desde entonces (ese trabajo ya está hecho: compruébalo, no lo repitas):`);
    for (const c of commitsDeEntonces.slice(0, 20)) linea(`  - ${c.hash} ${c.cuando.slice(0, 16)} ${c.asunto}`);
    if (commitsDeEntonces.length > 20) linea(`  - … y ${commitsDeEntonces.length - 20} más (git log --since=${reintento.lanzada})`);
  }
  const aMedias = sinCommit(repo?.ruta);
  if (aMedias.length) {
    linea(`- Cambios del repositorio sin commit (pueden ser trabajo suyo, hecho y sin guardar: compruébalos con sus pruebas y sus tipos y guárdalos en su commit, o di en la respuesta y en el mensaje por qué no; no los rehagas):`);
    for (const c of aMedias.slice(0, 30)) linea(`  - ${c.estado} · ${c.ruta}`);
    if (aMedias.length > 30) linea(`  - … y ${aMedias.length - 30} más (git status)`);
  }
  if (!dejo.respuestas.length && !dejo.revisiones.length && !dejo.misiones.length && !dejo.ejecutadas.length && !commitsDeEntonces.length && !aMedias.length)
    linea('- No alcanzó a dejar nada en el plan ni en el repositorio: haz la revisión completa.');
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
if (repo && comoClave(repo.ruta) === comoClave(raiz)) linea('- ES EL PROPIO STUDIO: sigue «El Studio como proyecto» de CLAUDE.md (lo del director en su carpeta; el trabajo del producto, solo aprobado, en commits «STL: …»; sus frentes nunca incluyen proyectos/).');
linea(`- Tipo: ${proyecto.tipo === 'nuevo' ? 'NUEVO (se plantea a partir de lo que cuenta el titular)' : 'EXISTENTE (se diagnostica a partir del repositorio)'}`);
linea(`- Contexto (del titular): ${proyecto.contexto || '(aún no lo cuenta)'}`);
if (proyecto.tipo === 'nuevo') linea(`- Cuándo se considera completo: ${proyecto.terminado || '(aún no lo dice)'}`);
linea(`- Lo que quiere lograr (antes del diagnóstico): ${proyecto.metaInicial || '(aún no lo dice)'}`);
linea(`- La meta: ${proyecto.objetivo ? `«${proyecto.objetivo.texto}». Éxito: ${proyecto.objetivo.exito}${proyecto.objetivo.horizonte ? `. Horizonte: ${proyecto.objetivo.horizonte}` : ''} (${proyecto.objetivo.firmado.quien}, ${proyecto.objetivo.firmado.fecha})` : 'ninguna todavía'}`);
for (const o of proyecto.objetivosAnteriores ?? []) linea(`- Meta anterior, replanteada el ${o.reabierto.fecha}: «${o.texto}». ${o.reabierto.nota ? `Razón: ${o.reabierto.nota}` : 'Sin razón escrita (si la dijo, está en el Buzón).'}`);
// «Replantear la meta» pide la revisión: el director rehace el análisis hacia la meta nueva y ajusta la ruta
const replanteada = proyecto.objetivo && (proyecto.objetivosAnteriores ?? []).some((o) => o.reabierto.fecha >= proyecto.objetivo!.firmado.fecha.slice(0, 10)) && (!desde || proyecto.objetivo.firmado.fecha >= desde.slice(0, 10));
if (replanteada && plan.fases.length > 1) linea('- LA META SE REPLANTEÓ desde la última revisión: haz un análisis fresco del proyecto hacia la meta nueva (lo que ya sirve, lo que deja de servir, lo que falta) y ajusta la ruta: fases, criterios, misiones y propuestas. Lo que cambió va en un documento nuevo y corto, con su misión de leerlo (la ruta ya leída queda sellada).');
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

linea(`\n## Etapa del arranque: ${etapa.toUpperCase()}`);
if (etapa === 'conectar') {
  linea('El repositorio no está conectado en este computador, así que aún no hay diagnóstico posible. Responde las notas que haya');
  linea('y deja el mensaje recordando la misión de conectar (Estudio › Proyecto). Si el titular te dio la ruta por el chat, que la');
  linea('guarde él en el Estudio: la ruta es de cada computador.');
} else if (etapa === 'contar') {
  linea('PROYECTO NUEVO SIN CONTAR: falta la explicación, el objetivo o cuándo se considera completo (Estudio › Proyecto). Responde');
  linea('las notas que haya (si lo contó por audio en el Buzón, eso cuenta: resúmelo en tu respuesta) y deja el mensaje pidiendo lo que falta.');
} else if (etapa === 'diagnostico' && proyecto.tipo === 'nuevo') {
  linea('PROYECTO NUEVO: TOCA EL PLANTEAMIENTO. Sigue «El planteamiento (proyecto nuevo)» de CLAUDE.md: lo que entendiste, el alcance,');
  linea(`los supuestos, los riesgos y las preguntas abiertas en plan.diagnostico; 2 o 3 objetivos en plan.objetivos a partir de su objetivo y`);
  linea(`de cuándo lo da por completo; ${rutas.docs}/director/planteamiento.md con sus partes y su «Para decidir»; y la misión de leerlo.`);
  if (repo) linea('Hay una carpeta conectada: mírala (diagnosticar.ts) por si ya tiene algo hecho, pero el planteamiento parte de lo que contó.');
} else if (etapa === 'diagnostico') {
  linea('TOCA DIAGNOSTICAR. Corre `node tools/director/diagnosticar.ts`, lee el repositorio a fondo y sigue «El diagnóstico» de');
  linea(`CLAUDE.md: plan.diagnostico, 2 o 3 objetivos candidatos en plan.objetivos, ${rutas.docs}/director/diagnostico.md con sus partes`);
  linea('y su «Para decidir», los frentes con sus rutas, y la misión del titular para leerlo y fijar su meta.');
} else if (etapa === 'objetivo') {
  linea('El diagnóstico está hecho; falta que el titular fije su meta (Estudio › Proyecto › La meta). Responde sus notas');
  linea('sobre el diagnóstico y los candidatos. Si lo que dijo cambia los candidatos, agrégalos o ajústalos en plan.objetivos y');
  linea('escribe lo que cambió en un documento nuevo, corto, como paso siguiente (el diagnóstico revisado queda sellado).');
} else if (etapa === 'ruta') {
  linea('EL OBJETIVO ESTÁ FIRMADO: TOCA TRAZAR LA RUTA. Sigue «La ruta» de CLAUDE.md: las fases que faltan después de');
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
  avisarPorComprobar(m);
}
if (entregadasDespues) linea(`\n(${entregadasDespues === 1 ? 'Una misión se entregó' : `${entregadasDespues} misiones se entregaron`} después de empezar esta revisión: ${entregadasDespues === 1 ? 'espera' : 'esperan'} la siguiente. No ${entregadasDespues === 1 ? 'la' : 'las'} revises ahora.)`);

/** Lo marcado a mano que pasa fuera del Studio: el director no lo da por hecho sin evidencia (CLAUDE.md › El ciclo de revisión, paso 1). */
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

// Las urgentes van primero: el titular pide prioridad, y el director decide (CLAUDE.md › El ciclo de revisión, paso 2)
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
}

// Las preguntas van aparte: el titular las lee en «Preguntas», como un informe (CLAUDE.md › El ciclo de revisión, paso 8)
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
// titular del 22 de octubre de 2026)
const porEjecutar = aceptadasSinEjecutar(plan, estado);
linea(`\n## Propuestas aceptadas sin ejecutar (${porEjecutar.length})`);
if (porEjecutar.length) {
  linea('Lo que el titular ya aprobó y aún no está hecho, de la más vieja a la más nueva. Cuando ejecutes una, va en `ejecutadas` con su nota; si ya se hizo por otro camino, también (con la evidencia), y sale de esta lista.');
  for (const { propuesta: p, aceptada: a } of porEjecutar) linea(`- [${p.id}] «${p.titulo}» · fase ${p.fase} · aceptada el ${a.fecha.slice(0, 10)} (${a.quien})${a.nota ? ` · ${a.nota.replace(/\s+/g, ' ')}` : ''}`);
}

// Lo que el director pidió hacer afuera en los últimos días: lo hicieron porque él lo pidió, y así lo dice cuando hable de ello
const fuera = pedidoFueraDelStudio(plan, estado.notas, new Date(Date.now() - 7 * 864e5).toISOString());
if (fuera.length) {
  linea('\n## Lo que pediste hacer fuera del Studio (misiones aprobadas, últimos 7 días)');
  linea('Lo hicieron porque tú lo pediste: si hablas de ello, dilo como tuyo. Es lo que cambió afuera (ramas, cuentas, configuración, lo subido).');
  for (const x of fuera) linea(`- ${x.aprobada.slice(0, 10)} · ${x.mision.id}, paso ${x.paso + 1}: ${x.texto.replace(/\s+/g, ' ').slice(0, 200)}${x.eleccion === YA_LO_DIJE ? ' → lo respondió con su comentario del paso' : x.eleccion ? ` → eligió «${x.eleccion}»` : ''}`);
}

// El freno del director: lo revisado queda sellado. Si cambió, va un documento nuevo con lo que cambió, como paso siguiente.
const cambiado: Record<string, string> = {};
for (const ruta of new Set(plan.misiones.flatMap(documentosDeMision))) {
  const propio = `${rutas.base}/${ruta}`;
  const f = ruta.startsWith('repo:') ? (repo ? await fechaDeCambio(repo.ruta, ruta.slice(5)) : null)
    : await fechaDeCambio(raiz, existsSync(enDisco(propio)) ? propio : ruta);
  if (f) cambiado[ruta] = f;
}
const sellados = selladosQueCambiaron(plan, estado, cambiado).filter((x) => !x.ruta.startsWith('repo:'));
if (sellados.length) {
  linea('\n## ⚠ Error de dirección: cambiaste documentos ya revisados');
  for (const x of sellados) linea(`- ${x.ruta}: ${nombre(x.persona)} ya lo revisó en «${x.mision.titulo}». Devuélvelo como estaba y escribe lo que cambió en un documento nuevo, como paso siguiente.`);
}

linea('\n## Misiones abiertas (una a la vez: la primera es la que ve completa)');
for (const p of personas) {
  // La reserva (regla del titular, 21 de octubre de 2026): la de ahora y por lo menos cinco más, contando las de la
  // fase siguiente (bajo niebla hasta cruzar la puerta), para que nadie se quede sin misión esperando al director
  const reserva = reservaDeMisiones(plan, estado, p);
  const { abiertas } = reserva;
  const cola = reserva.faltan ? `  ⚠ reserva corta: faltan ${reserva.faltan} para las ${RESERVA_MINIMA} (la de ahora y ${RESERVA_MINIMA - 1} más; pueden ser de la fase siguiente). Sin la reserva, --listo no cierra.` : '';
  linea(`- ${nombre(p)}: ${abiertas.map((m) => `${m.id} (${estadoMision(m, plan, estado)})`).join(', ') || `ninguna: asígnale la siguiente y la reserva (${RESERVA_MINIMA} en total)`}${reserva.siguientes.length ? ` · en la fase siguiente: ${reserva.siguientes.map((m) => m.id).join(', ')}` : ''}${cola}`);
  for (const m of abiertas) {
    const marcados = estado.pasos?.[m.id]?.hechos.filter((i) => i < m.pasos.length) ?? [];
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
  linea(`Después del proyecto activo, diagnostica los primeros ${Math.min(POR_REVISION, cola.length)} (CLAUDE.md › La cola de diagnósticos), cada uno con --proyecto <id>. No cambian el proyecto activo del titular.`);
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
linea('`evaluacion` (criterios cumplidos), `misiones` nuevas, `mensaje`, `boletin` y el resumen «Dónde quedamos» (`resumen`, CLAUDE.md);');
// El plan crece con cada revisión: pasado el tope, --listo archiva solo lo cerrado (director/archivo.json)
const kb = Math.round(statSync(enDisco(rutas.plan)).size / 1024);
const archivado = existsSync(enDisco(rutas.archivo)) || kb > TOPE_PLAN_KB;
// El mapa que esta bandeja acaba de guardar va con lo del director; si no está (no se pudo guardar), no se nombra:
// git add falla entero con una ruta que no existe
const conMapa = existsSync(enDisco(rutaDelMapa(id)));
const suyos = `director/plan.json${archivado ? ' director/archivo.json' : ''}${conMapa ? ' director/mapa.json' : ''} docs director/radiografia.md`;
linea(`luego \`node tools/director/bandeja.ts --listo\` y el commit en la memoria (rama stl), solo con lo del director (lo del equipo lo guarda el Studio): cd "${memoria(id)}", luego git add ${suyos}, luego git commit -m "Director (${id}): …" -- ${suyos} (tres órdenes, cada una por separado: tus permisos no aceptan &&).`);
if (!plan.resumen) linea('⚠ Este proyecto aún no tiene resumen «Dónde quedamos»: escríbelo antes de cerrar.');
if (kb > TOPE_PLAN_KB) linea(`El plan pesa ${kb} KB (el tope es ${TOPE_PLAN_KB} KB): al cerrar, --listo archiva solo las respuestas y los veredictos cerrados antes de esta revisión.`);
// El puntero a lo archivado: no se carga en cada revisión, pero el director puede volver a consultarlo
if (existsSync(enDisco(rutas.archivo))) linea(`Lo dicho antes (respuestas a notas cerradas y veredictos de misiones aprobadas) está en ${enDisco(rutas.archivo)}: no lo leas entero; búscalo ahí (por id de nota o de misión) si necesitas lo que ya respondiste. Las herramientas y el Studio ya lo cuentan.`);
