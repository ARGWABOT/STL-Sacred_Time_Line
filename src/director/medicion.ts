// La medición del núcleo con casos fijos (propuesta aceptada «El núcleo del director, medido con casos fijos»,
// pr_nucleo_medido, punto 2): cada caso fijo (casosFijos.ts) como una situación de prueba, lo que dejó el equipo antes de
// una revisión, y lo que comprueba el código en el plan que deja el director. La corrida lanza al director de verdad sobre
// un Estudio de prueba (tools/director/estudioDePrueba.ts) con cada situación, dos vueltas, y junta lo que dice el código
// con lo que califica otro modelo con la pauta del caso. Cada situación entra con su prueba: un director que lo hace bien
// pasa y uno que repite el error no.
import {
  aprobadoAntesDelCierre,
  colaSinOrden,
  enUnaLinea,
  esDeCierre,
  ideasSueltas,
  misionesAbiertas,
  pasosSinBoton,
  pedidosAntesDelCierre,
  RESERVA_MINIMA,
  reservaSinRazon,
  type EstadoDirector,
  type EstadoPersona,
  type Mision,
  type Nota,
  type Objetivo,
  type Plan,
} from './director.ts';

/**
 * Lo que encuentra el director al empezar la revisión de un caso. Solo los casos que dependen de lo que hace el director
 * tienen situación: los del proceso del Studio (una revisión que se pide sola, dos servidores) los mide su barrera.
 */
export interface Situacion {
  /** Lo que dejó el equipo antes de la revisión. */
  notas: Nota[];
  /** Lo demás que guarda el Studio del titular (las propuestas que respondió…). */
  delTitular?: Partial<EstadoPersona>;
  /** Cómo quedó el plan antes de la revisión. */
  plan?: (p: Plan) => void;
  /** Los commits del repositorio desde la revisión anterior, por su asunto. */
  commits?: string[];
  /** La meta que fijó el titular, si ya la fijó: sin ella, la bandeja pide fijarla, aunque la ruta esté trazada. */
  objetivo?: Objetivo;
  /** Lo que ya trae el repositorio del proyecto (ruta y texto), en su primer commit: sin nada, está vacío. */
  archivos?: Record<string, string>;
}

const ANTES = '2026-10-01T10:00:00.000Z';
const general = (id: string, texto: string): Nota => ({ id, cuando: ANTES, quien: 'titular', sobre: { tipo: 'general' }, texto }) as Nota;

/** La nota que pide trabajo en «Peticiones que no llegaban al plan». */
export const NOTA_QUE_PIDE = 'n_pide_pdf';
/** La propuesta aceptada que un commit ya hizo, en «Pedir lo ya hecho». */
export const PROPUESTA_HECHA = 'pr_pdf';
/** La nota que pide un documento, en «Cortes de lectura sin sentido» y «Un paso que mandaba a un documento sin decir qué mirar». */
export const NOTA_PIDE_DOCUMENTO = 'n_pide_doc';
const PIDE_DOCUMENTO = 'Explícame en un documento corto cómo se arma el informe del mes, para revisarlo antes de cambiarlo.';

// ── Una ruta en marcha: el diagnóstico hecho, la meta fijada, el arranque cruzado, la fase en curso con su prueba con el
// cliente, la que sigue, y una propuesta aceptada sin hacer que cambia el informe. Es donde se ven los casos del orden: la
// reserva, el cierre, la prueba y la cola. Sin el diagnóstico ni la meta, la bandeja diría que el arranque va en el
// diagnóstico y el director, con razón, lo haría y pediría fijar la meta (así salía en las corridas del 27 y el 28 de
// octubre: esa misión, que nombra el Excel, se tomaba por la de probarlo).

/** La fase en curso de una ruta en marcha. */
export const FASE_EN_CURSO = 'mvp';
/** La propuesta aceptada y sin hacer de la fase en curso: cambia el informe, y es trabajo del director. */
export const PROPUESTA_PENDIENTE = 'pr_exportar';
/** El criterio de la fase que se mide con el cliente: la prueba con gente. */
export const CRITERIO_CLIENTE = 'm_cliente';
/** La misión que la persona entregó en «Quedarse sin misión»: la última que tenía. */
export const ULTIMA_MISION = 't_ver_informe';
/** Las notas de los casos de una ruta en marcha. */
export const NOTA_CERRAR = 'n_cerrar';
export const NOTA_PROBAR_EXCEL = 'n_probar_excel';
export const NOTA_PROBAR_CLIENTE = 'n_probar_cliente';
const PERSONA = 'titular';
/** La meta de una ruta en marcha, fijada por el titular antes de trazarla. */
export const META_EN_MARCHA: Objetivo = { texto: 'Que el cliente baje su informe del mes sin ayuda.', exito: 'El cliente baja su informe del mes y lo usa un mes entero sin pedir ayuda.', firmado: { fecha: ANTES, quien: PERSONA } };

const enMarcha = (p: Plan, { enCola = true } = {}) => {
  p.diagnostico = { fecha: ANTES, resumen: ['La página del informe del mes funciona, pero el cliente rehace sus cuentas a mano.'], frentes: {} };
  p.revisiones = { ...p.revisiones, t_conectar: { cuando: ANTES, veredicto: 'aprobada', comentario: 'El repositorio quedó conectado.' } };
  const direccion = { direccion: { nivel: 'apoyo' as const, que: 'Las decisiones de la fase.' } };
  p.fases.push(
    { id: FASE_EN_CURSO, nombre: 'El informe que el cliente usa', etapa: 'MVP', meta: 'Que el cliente baje su informe del mes sin ayuda.', porQue: 'Es lo primero que pidió el cliente.', duracion: 'Hasta que el cliente lo use un mes', puerta: { nombre: 'El cliente lo usa', prueba: 'El cliente baja su informe del mes sin ayuda.' }, frentes: direccion, criterios: [{ id: CRITERIO_CLIENTE, texto: 'El cliente baja su informe del mes sin ayuda' }], misiones: ['Exportar el informe a Excel.', 'Probar el informe con el cliente.'] },
    { id: 'piloto', nombre: 'Tres clientes', etapa: 'Piloto', meta: 'Que tres clientes usen el informe.', porQue: 'Después de que uno lo use sin ayuda.', duracion: 'Hasta que tres clientes lo usen', puerta: { nombre: 'Tres clientes', prueba: 'Tres clientes bajan su informe sin ayuda.' }, frentes: direccion, criterios: [{ id: 'p_tres', texto: 'Tres clientes bajan su informe sin ayuda' }], misiones: ['Ofrecerlo a dos clientes más.'] },
  );
  p.propuestas.push({ id: PROPUESTA_PENDIENTE, area: 'Informes', titulo: 'El informe del mes, en Excel', problema: 'El cliente rehace las cuentas del informe a mano.', propuesta: 'Un botón que baja el informe del mes en Excel, con sus columnas.', conecta: 'La página del informe.', fase: FASE_EN_CURSO });
  if (enCola) p.colaDirector = [PROPUESTA_PENDIENTE];
};

/**
 * La reserva de la persona antes de la revisión: diez misiones abiertas de la fase en curso, cada una con su porqué (con
 * el mismo en las diez, quien califica culpaba al director de un porqué que no escribió él).
 */
const conReserva = (p: Plan) => {
  for (let i = 1; i <= RESERVA_MINIMA; i++)
    p.misiones.push({ id: `t_dato_${i}`, para: PERSONA, fase: FASE_EN_CURSO, frente: 'direccion', titulo: `Cuenta qué hace el cliente con la columna ${i} del informe`, porQue: `Va antes de construir la exportación: lo que cuentes dice si la columna ${i} entra en ella y con qué nombre.`, pasos: [{ texto: `Escribe en el Buzón qué hace el cliente con la columna ${i}.`, ir: { vista: 'buzon', ancla: 'escribir', etiqueta: 'Abrir el Buzón' } }], entrega: 'Lo que hace con esa columna.', xp: 10 });
};

/** Lo que guarda el Studio del titular en una ruta en marcha: la puerta del arranque cruzada y la propuesta aceptada. */
const delTitularEnMarcha = (extra: Partial<EstadoPersona> = {}): Partial<EstadoPersona> => ({
  cierres: { arranque: { fecha: ANTES, quien: PERSONA } },
  propuestas: { [PROPUESTA_PENDIENTE]: { fecha: ANTES, quien: PERSONA, estado: 'aceptada' } },
  ...extra,
});

// ── Los pasos: uno que no salió, una orden que se pidió y algo que se crea afuera

/** La misión que se entregó con «No me salió», en «Un paso que atrapaba». */
export const MISION_TRABADA = 't_generar_informe';
/** La nota que pide la orden para generar el informe, en «Un paso sin salida clara». */
export const NOTA_PIDE_ORDEN = 'n_pide_orden';
/**
 * Lo que genera el informe del mes en «Un paso sin salida clara»: la orden y el archivo que deja. El repositorio la trae
 * (con el repositorio vacío no había orden que dar, y el director, con razón, no la inventaba).
 */
export const ORDEN_DEL_INFORME = 'npm run informe';
export const ARCHIVO_DEL_INFORME = 'informes/informe-del-mes.csv';
const REPOSITORIO_DEL_INFORME: Record<string, string> = {
  'package.json': JSON.stringify({ name: 'informes', private: true, scripts: { informe: 'node informe.js' } }, null, 2) + '\n',
  'informe.js': `// Genera el informe del mes: las ventas por cliente, con su total\nconst { mkdirSync, writeFileSync } = require('node:fs');\nmkdirSync('informes', { recursive: true });\nwriteFileSync('${ARCHIVO_DEL_INFORME}', 'cliente,total\\nAcme,1200\\nBeta,800\\n');\nconsole.log('Informe listo: ${ARCHIVO_DEL_INFORME}');\n`,
  'README.md': `# Informes\n\nEl informe del mes se genera con \`${ORDEN_DEL_INFORME}\`: queda en \`${ARCHIVO_DEL_INFORME}\`, listo para mandárselo al cliente.\n`,
};
/** La nota que pide un repositorio nuevo en GitHub, en «Crear un repositorio sin explicarlo». */
export const NOTA_PIDE_REPOSITORIO = 'n_pide_repositorio';
/** La nota que avisa una falla con fecha, en «Avisar un problema sin su salida». */
export const NOTA_FALLA = 'n_informe_vacio';
/** La nota sobre un permiso que le faltó al director, en «“Autorizar” que no autorizaba». */
export const NOTA_PERMISO = 'n_permiso';

/** Las situaciones de los casos fijos, por el id del caso. Las que faltan se suman con su comprobación y su prueba. */
export const SITUACIONES: Partial<Record<string, Situacion>> = {
  c_paso_atrapa: {
    notas: [],
    plan: (p) => {
      p.misiones.push({ id: MISION_TRABADA, para: PERSONA, fase: 'arranque', frente: 'direccion', titulo: 'Genera el informe del mes', porQue: 'Para ver cómo sale hoy, antes de cambiarlo.', xp: 10, entrega: 'El informe generado.', pasos: [{ texto: 'Abre la terminal con la orden de este paso: genera el informe del mes en la carpeta informes.', terminal: 'npm run informe' }, 'Abre el informe generado y anota lo que no se entiende.'] });
    },
    delTitular: { entregas: { [MISION_TRABADA]: { cuando: ANTES, quien: PERSONA, nota: 'No me salió: la orden dice «Missing script: informe».', sinTerminar: 0 } } },
  },
  c_paso_sin_salida: { notas: [general(NOTA_PIDE_ORDEN, '¿Con qué orden genero el informe del mes? Quiero correrla yo y ver que quedó el archivo.')], archivos: REPOSITORIO_DEL_INFORME },
  c_repositorio_sin_explicar: { notas: [general(NOTA_PIDE_REPOSITORIO, 'Quiero tener el proyecto en GitHub, en un repositorio nuevo, para no perderlo.')] },
  c_aviso_sin_salida: { notas: [general(NOTA_FALLA, 'El informe del mes salió vacío esta mañana, y mañana se lo tengo que mandar al cliente.')] },
  c_autorizar_sin_casilla: { notas: [general(NOTA_PERMISO, 'La revisión de ayer no pudo instalar el navegador para las pruebas: dice que le faltó un permiso. ¿Qué hago para dárselo?')] },
  c_peticion_sin_pedido: { notas: [general(NOTA_QUE_PIDE, 'Quiero que el informe del mes se pueda bajar en PDF, para mandárselo al cliente.')] },
  c_pedir_lo_hecho: {
    notas: [],
    plan: (p) => {
      p.propuestas.push({ id: PROPUESTA_HECHA, area: 'Informes', titulo: 'El informe del mes, en PDF', problema: 'El cliente pide el informe en PDF, y hoy solo se ve en la página.', propuesta: 'Un botón que baja el informe del mes en PDF.', conecta: 'La página del informe.', fase: 'arranque' });
    },
    delTitular: { propuestas: { [PROPUESTA_HECHA]: { fecha: ANTES, quien: 'titular', estado: 'aceptada' } } },
    commits: [`El informe del mes se baja en PDF, con su botón (${PROPUESTA_HECHA})`],
  },
  // Los dos casos de un documento pedido: cómo se escribe (sus cortes) y cómo se pide leerlo (su paso)
  c_cortes_sin_sentido: { notas: [general(NOTA_PIDE_DOCUMENTO, PIDE_DOCUMENTO)] },
  c_paso_sin_que_mirar: { notas: [general(NOTA_PIDE_DOCUMENTO, PIDE_DOCUMENTO)] },
  // Los de una ruta en marcha. La persona entregó la última misión que tenía, y lo que sigue en la cola es del director
  c_sin_mision: {
    notas: [],
    objetivo: META_EN_MARCHA,
    plan: (p) => {
      enMarcha(p);
      p.misiones.push({ id: ULTIMA_MISION, para: PERSONA, fase: FASE_EN_CURSO, frente: 'direccion', titulo: 'Mira el informe del mes como lo ve el cliente', porQue: 'Antes de cambiarlo, conviene saber qué ve él.', pasos: ['Abre el informe del mes y anota lo que no se entiende.'], entrega: 'Lo que no se entiende.', xp: 10 });
    },
    delTitular: delTitularEnMarcha({ entregas: { [ULTIMA_MISION]: { cuando: ANTES, quien: PERSONA, nota: 'Las columnas del final no se entienden.' } } }),
  },
  // Pide cerrar la fase y publicar, con la propuesta aceptada sin hacer
  c_cierre_antes_de_tiempo: {
    notas: [general(NOTA_CERRAR, 'Ya terminé lo mío de esta fase. ¿La cerramos y publicamos la versión para el cliente? Me urge mostrársela.')],
    objetivo: META_EN_MARCHA,
    plan: (p) => { enMarcha(p); conReserva(p); },
    delTitular: delTitularEnMarcha(),
  },
  // Acaba de aceptar la propuesta y quiere probar lo que hará el director, cuando esté
  c_orden_aleatorio: {
    notas: [general(NOTA_PROBAR_EXCEL, 'Acepté lo de exportar el informe a Excel. Cuando esté, quiero probarlo yo antes de mostrárselo al cliente.')],
    objetivo: META_EN_MARCHA,
    plan: (p) => { enMarcha(p, { enCola: false }); conReserva(p); },
    delTitular: delTitularEnMarcha(),
  },
  // Quiere probar con el cliente lo que la propuesta aceptada todavía va a cambiar
  c_prueba_antes_de_tiempo: {
    notas: [general(NOTA_PROBAR_CLIENTE, 'El jueves me reúno con el cliente. ¿Le hacemos ya la prueba del informe?')],
    objetivo: META_EN_MARCHA,
    plan: (p) => { enMarcha(p); conReserva(p); },
    delTitular: delTitularEnMarcha(),
  },
};

const anclaDe = (destino: unknown) => (destino && typeof destino === 'object' && 'ancla' in destino ? String((destino as { ancla?: unknown }).ancla ?? '') : '');

/**
 * Lo que tiene a mano una comprobación, además del plan que dejó el director: el de antes, los archivos de la memoria, lo
 * que guarda el Studio del equipo (las entregas, las puertas, las propuestas respondidas) y cuándo empezó la revisión.
 */
export interface ContextoDeComprobacion {
  /** El plan antes de la revisión. */
  antes: Plan;
  /** Un documento del plan (`docs/…`), como quedó en la memoria; null si no está. */
  leer: (ruta: string) => string | null;
  estado: EstadoDirector;
  desde: string;
}

/** Las misiones que el director escribió en la revisión: las que no estaban antes. */
const nuevas = (plan: Plan, antes: Plan) => plan.misiones.filter((m) => !antes.misiones.some((x) => x.id === m.id));
const textoDelPaso = (p: Mision['pasos'][number]) => (typeof p === 'string' ? p : p.texto);
const textoDeMision = (m: Mision) => [m.titulo, m.porQue, ...m.pasos.map(textoDelPaso)].join('\n');

/** En una ruta en marcha ningún commit hizo la propuesta pendiente: darla por ejecutada es fingirla para seguir. */
const fingida = (plan: Plan) => (plan.ejecutadas?.[PROPUESTA_PENDIENTE] ? ['dio por hecha la propuesta aceptada sin hacerla'] : []);
/** Una misión que, por su título, cierra la fase: cruzar su puerta, cerrarla, publicar o subir la versión. */
const CIERRA_LA_FASE = /^\s*(?:cruza|cierra|publica|sube|lanza)\b[^.]*\b(?:puerta|fase|versi[oó]n|lanzamiento)\b/i;
/** Una prueba con el cliente, por su título. */
const PRUEBA_CON_CLIENTE = /\b(?:prueba|probar|pru[eé]ba\w+)\b.*\bcliente\b|\bcliente\b.*\b(?:prueba|probar)\b/i;
/** Una misión que prueba algo, por su título. */
const PRUEBA = /\b(?:prueba|probar|pru[eé]ba\w+)\b/i;
/** Lo que prueba la de «Misiones en orden aleatorio»: la exportación a Excel. */
const LA_EXPORTACION = /\b(?:excel|exporta\w*)\b/i;
/**
 * La misión de probar la exportación: la que lo dice en su título, o la que nace de la nota que lo pidió y dice que
 * prueba. No cualquiera que nombre el Excel: la que pide contar qué columnas lleva, o fijar la meta, no necesita que ya
 * esté (en la corrida del 28 de octubre, once misiones así se tomaron por la de probarla).
 */
const pruebaLaExportacion = (m: Mision) => PRUEBA.test(m.titulo) && (LA_EXPORTACION.test(m.titulo) || !!m.origen?.includes(NOTA_PROBAR_EXCEL));
/** La excepción de la regla: una versión barata que no se repite, dicha con sus palabras (CLAUDE.md › «La ruta»). */
const VERSION_BARATA = /\bversi[oó]n\s+barata\b|\bno\s+se\s+repite\b/i;

/** Lo que el código comprueba en el plan que deja el director en cada situación: lo que falló, o nada si pasa. Puras, salvo `leer`. */
export const COMPROBACIONES: Partial<Record<string, (plan: Plan, contexto: ContextoDeComprobacion) => string[]>> = {
  // Lo pedido queda como pedido (o como la propuesta o la misión que lo hace), y su respuesta lleva ahí
  c_peticion_sin_pedido: (plan) => {
    const r = plan.respuestas?.[NOTA_QUE_PIDE];
    if (!r) return ['no respondió la nota que pide trabajo'];
    if (r.tratamiento !== 'integrada' && r.tratamiento !== 'aplazada') return [`la respondió como «${r.tratamiento ?? 'sin tratamiento'}»: lo pedido no quedó en el plan`];
    const lugares = [
      ...(plan.pedidos ?? []).filter((p) => p.notas?.includes(NOTA_QUE_PIDE)).map((p) => `pedido-${p.id}`),
      ...plan.propuestas.map((p) => `propuesta-${p.id}`),
      ...plan.misiones.filter((m) => m.origen?.includes(NOTA_QUE_PIDE)).map((m) => `mision-${m.id}`),
    ];
    if (!lugares.length) return ['no dejó un pedido, una propuesta ni una misión con lo que se pidió'];
    if (!lugares.includes(anclaDe(r.destino))) return [`su «Quedó en» no lleva a lo que dejó (${lugares.join(', ')})`];
    return [];
  },
  // Lo que un commit ya hizo se da por ejecutado, con su evidencia, y no se le vuelve a pedir a nadie
  c_pedir_lo_hecho: (plan) => {
    const fallas: string[] = [];
    if (!plan.ejecutadas?.[PROPUESTA_HECHA]) fallas.push('no la dio por ejecutada, aunque un commit ya la hizo');
    const piden = plan.misiones.filter((m) => m.origen?.includes(PROPUESTA_HECHA)).map((m) => m.id);
    if (piden.length) fallas.push(`pide otra vez lo ya hecho: ${piden.join(', ')}`);
    return fallas;
  },
  // El documento nuevo se lee de a una idea sin cortes sin sentido: lo que la auditoría de los cortes avisa
  c_cortes_sin_sentido: (plan, { antes, leer }) => {
    const docs = plan.documentos.filter((d) => !antes.documentos.some((x) => x.ruta === d.ruta));
    if (!docs.length) return ['no escribió el documento que se pidió'];
    return docs.flatMap((d) => {
      const texto = leer(d.ruta);
      if (texto === null) return [`${d.ruta}: está en el plan, pero no en la memoria`];
      return ideasSueltas(texto).map((x) => `${d.ruta} › ${x.parte}: ${x.motivo}`);
    });
  },
  // Pedir que se lea lleva su botón al documento, y ningún paso nuevo manda a un lugar sin el suyo
  c_paso_sin_que_mirar: (plan, { antes }) => {
    const fallas = nuevas(plan, antes).flatMap((m) => pasosSinBoton(m).map((i) => `«${m.titulo}», paso ${i + 1}: manda a «${enUnaLinea(textoDelPaso(m.pasos[i]), 60)}» sin su botón`));
    const docs = new Set(plan.documentos.filter((d) => !antes.documentos.some((x) => x.ruta === d.ruta)).map((d) => d.ruta));
    const llevan = nuevas(plan, antes).some((m) => m.pasos.some((p) => typeof p !== 'string' && !!p.ir?.doc && docs.has(p.ir.doc)));
    if (!llevan) fallas.push('ninguna misión nueva lleva a leer el documento que se pidió, con su botón');
    return fallas;
  },
  // Lo que no salió no se aprueba como hecho: se devuelve con el paso corregido, o se aprueba con otra misión que lo retoma
  c_paso_atrapa: (plan, { antes }) => {
    const r = plan.revisiones?.[MISION_TRABADA];
    if (!r) return ['no revisó la misión que se entregó sin terminar'];
    const paso = (p: Plan) => JSON.stringify(p.misiones.find((m) => m.id === MISION_TRABADA)?.pasos[0] ?? null);
    if (r.veredicto === 'rehacer') return paso(plan) === paso(antes) ? ['la devolvió con el mismo paso que no salió'] : [];
    return nuevas(plan, antes).some((m) => m.origen?.includes(MISION_TRABADA)) ? [] : ['la aprobó aunque su paso 1 no salió, sin una misión que lo retome'];
  },
  // La orden que se pidió va en su paso, y su resultado, que se puede leer, se comprueba solo
  c_paso_sin_salida: (plan, { antes }) => {
    const conOrden = nuevas(plan, antes).flatMap((m) => m.pasos.map((p, i) => ({ m, p, i }))).filter((x) => typeof x.p !== 'string' && x.p.terminal);
    if (!conOrden.length) return ['no dejó el paso con la orden que pidió la persona'];
    return conOrden.filter((x) => typeof x.p !== 'string' && !x.p.comprobar).map((x) => `«${x.m.titulo}», paso ${x.i + 1}: corre una orden cuyo resultado se puede leer y no lo comprueba`);
  },
  // Lo que se crea afuera se comprueba donde se puede leer: el remoto del repositorio nuevo
  c_repositorio_sin_explicar: (plan, { antes }) => {
    const pasos = nuevas(plan, antes).flatMap((m) => m.pasos).filter((p) => typeof p !== 'string');
    if (!pasos.length) return ['no dejó la misión de crear el repositorio que pidió la persona'];
    return pasos.some((p) => typeof p !== 'string' && /^git config --get remote\./.test(p.comprobar?.orden ?? '')) ? [] : ['nada comprueba el repositorio que se crea afuera (su remoto, con git config --get remote.origin.url)'];
  },
  // Una falla avisada lleva su salida: la respuesta la deja en una misión, un pedido o una propuesta del plan, o la
  // plantea como decisión; no se responde solo con información
  c_aviso_sin_salida: (plan) => {
    const r = plan.respuestas?.[NOTA_FALLA];
    if (!r) return ['no respondió la nota que avisa la falla'];
    const lugares = [...(plan.pedidos ?? []).map((p) => `pedido-${p.id}`), ...plan.propuestas.map((p) => `propuesta-${p.id}`), ...plan.misiones.map((m) => `mision-${m.id}`)];
    const conSalida = ['integrada', 'aplazada', 'decision'].includes(r.tratamiento ?? '') && lugares.includes(anclaDe(r.destino));
    return conSalida ? [] : ['respondió la falla sin su salida: ni la misión, ni el pedido, ni la decisión que la atiende'];
  },
  // Un permiso que da el panel se autoriza ahí, con su casilla: ningún paso pide un «Autorizo» que no lo da, y algo lleva
  // a la persona al panel
  c_autorizar_sin_casilla: (plan, { antes }) => {
    const pasos = nuevas(plan, antes).flatMap((m) => m.pasos.map((p, i) => ({ m, p, i })));
    const fallas = pasos
      .filter((x) => typeof x.p !== 'string' && x.p.opciones?.some((o) => /autorizo/i.test(o)))
      .map((x) => `«${x.m.titulo}», paso ${x.i + 1}: pide un «Autorizo» que no da el permiso; lo da el panel de «Permisos», con su casilla`);
    const alPanel = (d: unknown) => !!d && typeof d === 'object' && (d as { vista?: string }).vista === 'modelo' && anclaDe(d) === 'm-permisos';
    if (!alPanel(plan.respuestas?.[NOTA_PERMISO]?.destino) && !pasos.some((x) => typeof x.p !== 'string' && alPanel(x.p.ir))) fallas.push('no llevó a la persona al panel de «Permisos», donde se autoriza con una casilla');
    return fallas;
  },
  // La persona alcanza su reserva sin una revisión de por medio, o un lote corto válido; la cola del director no es la razón
  c_sin_mision: (plan, { estado, desde }) =>
    reservaSinRazon(plan, estado, [PERSONA], desde).map((r) => `la persona alcanza ${r.alcanza} de ${RESERVA_MINIMA} misiones: ${r.motivo}`),
  // Nada que cierre la fase queda a la mano mientras lo aprobado de ella siga sin hacer
  c_cierre_antes_de_tiempo: (plan, { estado }) => {
    const fallas = fingida(plan);
    const sinHacer = aprobadoAntesDelCierre(plan, estado, FASE_EN_CURSO).length + pedidosAntesDelCierre(plan, FASE_EN_CURSO).length;
    if (sinHacer)
      for (const m of misionesAbiertas(plan, estado, PERSONA))
        if (esDeCierre(m) || CIERRA_LA_FASE.test(m.titulo)) fallas.push(`«${m.titulo}» cierra la fase y queda a la mano con lo aprobado sin hacer`);
    return fallas;
  },
  // Lo aprobado tiene su lugar en la cola del director, y la misión de probarlo llega después de él, con su porqué
  c_orden_aleatorio: (plan, { antes, estado }) => {
    const fallas = [...fingida(plan), ...colaSinOrden(plan, estado).map((t) => `lo aprobado quedó sin su lugar en la cola del director: ${t.id}`)];
    const probar = plan.misiones.filter((m) => m.para === PERSONA && pruebaLaExportacion(m));
    if (!probar.length) fallas.push('no dejó la misión de probar la exportación, que pidió la persona');
    const aMano = new Set(misionesAbiertas(plan, estado, PERSONA).map((m) => m.id));
    if (!plan.ejecutadas?.[PROPUESTA_PENDIENTE])
      for (const m of probar) if (aMano.has(m.id)) fallas.push(`«${m.titulo}» llega antes de lo que necesita: la exportación aún no está`);
    for (const m of nuevas(plan, antes)) if (!m.porQue?.trim()) fallas.push(`«${m.titulo}» no dice por qué va en ese punto`);
    return fallas;
  },
  // La prueba con el cliente no queda a la mano mientras lo aprobado que cambia el informe siga sin hacer, salvo una
  // versión barata que no se repite
  c_prueba_antes_de_tiempo: (plan, { estado }) => {
    const fallas = fingida(plan);
    if (plan.ejecutadas?.[PROPUESTA_PENDIENTE]) return fallas;
    for (const m of misionesAbiertas(plan, estado, PERSONA))
      if ((m.criterios?.includes(CRITERIO_CLIENTE) || PRUEBA_CON_CLIENTE.test(m.titulo)) && !VERSION_BARATA.test(textoDeMision(m)))
        fallas.push(`«${m.titulo}» prueba con el cliente lo que la exportación aprobada todavía va a cambiar`);
    return fallas;
  },
};
