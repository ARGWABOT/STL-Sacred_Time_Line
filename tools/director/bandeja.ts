// La bandeja del Director asistente: todo lo que el equipo dejó para el director en el PROYECTO ACTIVO desde su última
// revisión, y lo que toca en su arranque. Es lo primero que corre la sesión del director cuando el titular dice «revisa
// lo que hay para el director» (o «revisa STL»): transcribe en local los audios nuevos (tools/director/transcribir.py) y
// lista la etapa del arranque, las entregas por revisar, las notas sin respuesta y las decisiones del equipo. Solo
// atiende el proyecto activo (el que está elegido en el Estudio de este computador, o el de --proyecto <id>); los demás
// conservan su buzón y su historial para cuando les toque. El director responde en la memoria del proyecto, en su
// repositorio (<repositorio>/.stl/director/plan.json: revisiones, respuestas, evaluacion, misiones, mensaje y boletin),
// y al terminar corre esto con --listo y hace su commit en esa memoria (rama stl).
// Uso: node tools/director/bandeja.ts                  → transcribe y lista
//      node tools/director/bandeja.ts --sin-transcribir
//      node tools/director/bandeja.ts --listo          → marca la revisión como hecha (plan.revisado = ahora)
//      node tools/director/bandeja.ts --proyecto <id>  → otro proyecto que el activo (combinable con lo anterior)
//      node tools/director/bandeja.ts --pedida         → ¿pidieron una revisión desde el Studio? Imprime el id del
//                                                         proyecto y sale con 0; si no, «nada» y 1. Sin leer nada más:
//                                                         es lo que mira la sesión del director en su ciclo (/vigila).
//      node tools/director/bandeja.ts --aclarar        → el paso que alguien no entendió («No lo entiendo»): solo eso,
//                                                         sin el resto de la revisión; con --listo, la cierra.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  aclaracionesDe,
  documentosDeMision,
  documentosEnOrden,
  esPregunta,
  hilosDePreguntas,
  ideasSueltas,
  estadoMision,
  etapaArranque,
  faseActual,
  misionesAbiertas,
  pasosPorComprobar,
  pendientesDelDirector,
  respuestasSinDestino,
  selladosQueCambiaron,
  validarEstado,
  validarPlan,
  validarProyecto,
} from '../../src/director/director.ts';
import { fechaDeCambio, leerFresco } from '../../src/director/fresco.ts';
import { enDisco as enDiscoDe, leerLocal, marcarAclaracion, marcarRevision, marcarVigilia, rutasDe } from '../../src/director/proyectos.ts';
import { comandoTranscripcion } from '../../src/director/transcripcion.ts';
import { argumentos, colaDeDiagnosticos, leerTodo, memoria, nombreDe, otrosProyectos, POR_REVISION, proyectoElegido, raiz } from './comun.ts';

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

if (args.includes('--listo')) {
  const elegido = await proyectoElegido(pedido);
  const rutaPlan = enDiscoDe(raiz, rutasDe(elegido).plan);
  const plan = JSON.parse(readFileSync(rutaPlan, 'utf-8'));
  // El doble check: lo que esta revisión llevó al plan dice dónde quedó; si no, la revisión no se cierra
  const { estado, proyecto } = await leerTodo(pedido, false);
  const sinDestino = respuestasSinDestino(plan, estado.notas, plan.revisado ?? '');
  if (sinDestino.length) {
    console.error('No se cerró la revisión: estas respuestas llevan algo al plan pero no dicen dónde quedó (`destino`: la misión, la propuesta, la fase o la parte del documento):');
    for (const id of sinDestino) console.error(`- ${id}`);
    process.exit(1);
  }
  // Un plan con errores no sale de la revisión: el titular nunca debe verlos en el Studio
  const errores = validarPlan(plan, proyecto.equipo.length ? proyecto.equipo.map((i) => i.id) : undefined);
  if (errores.length) {
    console.error('No se cerró la revisión: el plan tiene errores. Corrígelos y vuelve a cerrar:');
    for (const e of errores) console.error(`- ${e}`);
    process.exit(1);
  }
  plan.revisado = new Date().toISOString();
  writeFileSync(rutaPlan, JSON.stringify(plan, null, 2) + '\n', 'utf-8');
  await marcarRevision(raiz, elegido, 'hecha');
  console.log(`Revisión marcada: ${plan.revisado}`);
  process.exit(0);
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
const { entregas, notas } = pendientesDelDirector(plan, estado);

linea(`# Bandeja del director · ${proyecto.nombre || '(proyecto sin nombre)'} (${id}) · ${new Date().toLocaleString('es-CO')}`);
linea(`Solo este proyecto. Su memoria está en su repositorio: ${memoria(id)} (rama stl). Ahí escribes: el plan en director/plan.json y los documentos en docs/ (el plan los nombra docs/…).`);
linea(`Fase en curso: ${plan.fases.indexOf(fase)}. ${fase.nombre}. Última revisión: ${desde || 'nunca'}.`);

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
for (const o of proyecto.objetivosAnteriores ?? []) linea(`- Objetivo reabierto el ${o.reabierto.fecha}: «${o.texto}». Razón: ${o.reabierto.nota ?? ''}`);
for (const h of proyecto.historialIA ?? []) linea(`- Historial de IA: ${h.agente}${h.sesiones ? `, ${h.sesiones} sesiones` : ''}${h.ultima ? `, la última del ${h.ultima.slice(0, 10)}` : ''}${h.donde ? ` (en ${h.donde})` : ''}. Léelo una vez en el diagnóstico para encontrar lo pendiente.`);
linea(`- Equipo: ${proyecto.equipo.map((i) => `${i.nombre} (${i.id}${i.cargo ? `, ${i.cargo}` : ''})`).join('; ') || 'solo el titular, aún sin registrar'}`);

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
    : s.tipo === 'general' ? 'general' : `${s.tipo} ${s.id ?? ''}`;
  linea(`\n- [${n.id}] ${n.urgente ? 'URGENTE · ' : ''}${n.quien}, ${n.cuando}, sobre ${sobre}:`);
  // Las notas viejas traían su razón aparte; las nuevas la dicen en la nota misma: léela para decidir si de verdad urge
  if (typeof n.urgente === 'string') linea(`  Por qué no puede esperar: ${n.urgente.replace(/\s+/g, ' ')}`);
  if (n.texto) linea(`  ${n.texto.replace(/\n/g, '\n  ')}`);
  if (n.audio) linea(`  Audio (${n.audio}): ${transcripcion(n.audio) ?? '(sin transcribir)'}`);
  adjuntosDe(n);
  if (s.tipo === 'mision' && s.aclarar) {
    const veces = aclaracionesDe(estado.notas, s.id ?? '', Number(/\d+/.exec(s.seccion ?? '')?.[0] ?? 1) - 1).length;
    linea(`  «No lo entiendo, explícamelo mejor» (${veces === 1 ? 'la primera vez' : `${veces} veces`}): el Studio no pudo aclararlo al instante. Reescribe ese paso con más contexto (\`texto\` y, si son varias acciones, \`detalle\`), sin cambiar su número, y responde con su \`destino\` en la misión.`);
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
      linea(`  (en la conversación) [${x.id}] ${(x.texto || transcripcion(x.audio) || 'audio').replace(/\s+/g, ' ').slice(0, 220)}`);
      if (plan.respuestas[x.id]) linea(`  (respondiste) ${plan.respuestas[x.id].texto.replace(/\s+/g, ' ').slice(0, 220)}…`);
    }
    linea('  Sigue así:');
  }
  if (n.texto) linea(`  ${n.texto.replace(/\n/g, '\n  ')}`);
  if (n.audio) linea(`  Audio (${n.audio}): ${transcripcion(n.audio) ?? '(sin transcribir)'}`);
  adjuntosDe(n);
}

linea('\n## Decisiones del equipo desde la última revisión');
const nuevas = (f?: string) => !!f && f >= desdeDia;
for (const [id, r] of Object.entries(estado.propuestas)) if (nuevas(r.fecha)) linea(`- Propuesta «${plan.propuestas.find((p) => p.id === id)?.titulo ?? id}»: ${r.estado}${r.nota ? ` · ${r.nota}` : ''} (${r.quien})`);
for (const [id, m] of Object.entries(estado.marcas)) if (nuevas(m.fecha)) linea(`- Decisión del titular sobre «${id}»: ${m.estado}${m.nota ? ` · ${m.nota}` : ''}`);
for (const [id, c] of Object.entries(estado.cierres)) if (nuevas(c.fecha)) linea(`- Puerta cruzada: ${id}${c.nota ? ` · ${c.nota}` : ''} (${c.quien})`);
for (const x of estado.excepciones) if (nuevas(x.fecha)) linea(`- Excepción en ${x.frente} hasta ${x.hasta}: ${x.motivo} (${x.quien})`);
for (const v of estado.validaciones) if (nuevas(v.fecha)) linea(`- Validación ${v.tipo}: ${v.personas} personas, lo lograron ${v.lograron}, lo aprueban ${v.aprueban}${v.hallazgos ? ` · ${v.hallazgos}` : ''} (${v.quien})`);
for (const [id, e] of Object.entries(estado.empezadas)) if (e.cuando >= desde) linea(`- Empezó la misión ${id} (${e.quien})`);
for (const b of estado.bitacora) if (nuevas(b.fecha) && /objetivo|proyecto|equipo/i.test(b.texto)) linea(`- ${b.texto} (${b.quien})`);

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
  const abiertas = misionesAbiertas(plan, estado, p);
  linea(`- ${nombre(p)}: ${abiertas.map((m) => `${m.id} (${estadoMision(m, plan, estado)})`).join(', ') || 'ninguna: asígnale la siguiente'}${abiertas.length > 3 ? '  ⚠ demasiadas en cola: deja una o dos' : ''}`);
  for (const m of abiertas) {
    const marcados = estado.pasos?.[m.id]?.hechos.filter((i) => i < m.pasos.length) ?? [];
    if (!marcados.length) continue;
    const texto = (i: number) => { const x = m.pasos[i]; return (typeof x === 'string' ? x : x.texto).slice(0, 90); };
    linea(`  · ${m.id}: ya marcó ${marcados.length} de ${m.pasos.length} pasos. No los vuelvas a pedir ni los nombres como pendientes: ${marcados.map((i) => `${i + 1}. «${texto(i)}»`).join('; ')}`);
    avisarPorComprobar(m);
  }
}

// Lo que viene recoge todo lo dicho: antes de cerrar, cada documento que aún no se revisa debe llevar el feedback de
// esta revisión, y la misión siguiente de cada uno se decide de nuevo con él
linea('\n## Documentos por revisar: ponles todo lo nuevo antes de cerrar');
for (const p of personas) {
  const pendientes = documentosEnOrden(plan, estado, p).filter((d) => d.estado !== 'revisado' && !d.ruta.startsWith('repo:'));
  linea(`- ${nombre(p)}: ${pendientes.map((d) => `${d.ruta} («${d.mision.titulo}»)`).join(', ') || 'ninguno'}`);
}
// El control de los cortes: ninguna idea por leer puede quedar en un renglón suelto (un título solo, una línea corta)
const porLeer = new Set(personas.flatMap((p) => documentosEnOrden(plan, estado, p).filter((d) => d.estado !== 'revisado' && !d.ruta.startsWith('repo:')).map((d) => d.ruta)));
for (const ruta of porLeer) {
  const propio = enDisco(`${rutas.base}/${ruta}`);
  if (!existsSync(propio)) continue;
  const sueltas = ideasSueltas(readFileSync(propio, 'utf8'));
  if (sueltas.length) linea(`⚠ ${ruta}: ${sueltas.length} idea(s) quedan en un renglón suelto; júntalas con lo que presentan o complétalas (si esa parte ya se leyó, déjala y evítalo en lo que escribas): ${sueltas.map((s) => `«${s.parte}» › «${s.idea.replace(/\s+/g, ' ')}»`).join('; ')}`);
}
linea('Cada nota y cada entrega de esta revisión: ¿cambia algo de esos documentos? Si sí, intégralo donde corresponde (no como parte nueva al final).');
linea('Y decide de nuevo la misión siguiente de cada uno con lo aprendido: si lo que viene ya no es lo correcto, cámbialo.');

const cola = await colaDeDiagnosticos(id);
if (cola.length) {
  linea(`
## Cola de diagnósticos (${cola.length}): proyectos recién entregados, sin diagnóstico`);
  linea(`Después del proyecto activo, diagnostica los primeros ${Math.min(POR_REVISION, cola.length)} (CLAUDE.md › La cola de diagnósticos), cada uno con --proyecto <id>. No cambian el proyecto activo del titular.`);
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
linea(`luego \`node tools/director/bandeja.ts --listo\` y el commit en la memoria (rama stl), solo con lo del director (lo del equipo lo guarda el Studio): \`cd "${memoria(id)}" && git add director/plan.json docs director/radiografia.md && git commit -m "Director (${id}): …" -- director/plan.json docs director/radiografia.md\`.`);
if (!plan.resumen) linea('⚠ Este proyecto aún no tiene resumen «Dónde quedamos»: escríbelo antes de cerrar.');
// El plan crece con cada revisión: pasado el tope, que se note (las respuestas viejas pueden salir a un archivo sellado)
const kb = Math.round(statSync(enDisco(rutas.plan)).size / 1024);
if (kb > TOPE_PLAN_KB) linea(`⚠ El plan pesa ${kb} KB (el tope es ${TOPE_PLAN_KB} KB): cada revisión lo lee entero. Conviene archivar lo viejo, sobre todo las respuestas.`);
