// El revisor: cuando alguien pide una revisión en el Studio, el Studio mismo lanza al director, sin pantalla y con el
// contexto limpio (Claude Code con `claude -p`), y lo deja trabajar hasta que cierre con --listo. Mirar si hay una
// revisión pedida no usa ningún modelo, solo lee estudio.local.json: mientras no haya nada pedido, no se gasta nada.
//
// Con permisos acotados: el director lanzado así lee, corre las herramientas del director y escribe dentro del
// repositorio del proyecto (su memoria y su código), con pruebas y commits locales. Todo lo demás se le niega sin
// preguntar: no sube, no despliega ni borra nada. Así una urgencia aprobada se arregla al instante.
// Sin Claude Code con su sesión iniciada en este computador, las revisiones pedidas las toma esa sesión con
// /loop 5m /vigila, como antes.
import { spawn } from 'node:child_process';
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, realpathSync, statSync, unlinkSync, writeFileSync, writeSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { delimiter, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { ARCHIVO_AUTOR, archivoAjustesClaude, conMaximo, conNucleoExplicito, conSkillsDelPlan, guardarEsfuerzoClaude, guardarModeloClaude, leerAjustesClaude, nucleoExplicito, skillsDisponibles, textoDelNucleo } from './ajustesClaude.ts';
import { conSkillsApagadas, skillsApagadas } from './skillsDelProyecto.ts';
import { conservadosDeTusAjustes, todosDeTusAjustes } from './ajustesPropios.ts';
import { admiteAutomatico, conGanchoDeCuenta, modosDeLaAyuda, nombreDelModoQuePregunta, permisosDelModo, puedeConGancho, puertoDelStudio, rutaDelGancho, rutaDelGanchoDeCuenta, urlDelGancho } from './modoPermisos.ts';
import { conLaCuentaGit, cuentaAlLanzar, mensajeDeCuenta, reglasPorCuenta } from '../../src/director/cuentaGit.ts';
import { aprobadoEnVivo, aprobadosSolos, conLoAprobado, lineaAutomatico, type EnVivo } from './aprobadosSolos.ts';
import { lineasDeNegadosSinDecidir } from './permisoAlMomento.ts';
import { permisosEnEspera } from './permisosEnEspera.ts';
import { fuentesDeEscaneo } from './escaneo.ts';
import { colaDeDiagnosticos, limiteDelTramo, MAX_MIN_REVISION, negacionesDe, negadosEnVivo, POR_REVISION, type CandidatoDeCola, type PiezaSiguiente, type Tramo } from '../../src/director/director.ts';
import { leerJsonFresco } from '../../src/director/memoria.ts';
import { archivoDeEncargos, ayudantesDelPlan, bandejaParaElEncargo, conElPaqueteListo, conElPlanDeLaRevision, conLosAyudantesDelPlan, conLaBandejaLista, encargoDelPrimerTiempo, ESFUERZO_PRIMER_TIEMPO, INTENTOS_PRIMER_TIEMPO, MAX_MIN_BANDEJA_LISTA, encargosDeLaRespuesta, finDelPrimerTiempo, lecturasDeLaPieza, lineaDelPrimerTiempo, lineaDeReintento, MAX_MIN_PRIMER_TIEMPO, planearConReintento, procedimientosNombrados, registroDelPrimerTiempo, skillsDelPlan, VENTANAS, type EncargoDeRevision, type IntentoDelPrimerTiempo } from '../../src/director/dosTiempos.ts';
import { PROCEDIMIENTOS } from '../../src/director/procedimientos.ts';
import { INVENTARIO_EN_EL_ENCARGO } from '../../src/director/modelos.ts';
import { t } from '../src/textos.ts';
import { cambiarAutorizados, encadenarRevision, enDisco, guardarEsfuerzoMaximo, leerLocal, leerRutaRepositorio, marcarAclaracion, marcarLanzada, marcarRevision, marcarUrgencia, MEMORIA, ORIGENES_REVISION, pararSeguidas, prorrogarRevision, proyectosLocales, rutasDe, seguidasActivas, siguienteDeLaCadena, urgenciaActiva, type AclaracionPedida, type FallaRevision, type UrgenciaPedida } from '../../src/director/proyectos.ts';
import { anotar, EL_STUDIO } from '../../src/director/bitacora.ts';
import { buscarProcesoReal, type Proceso } from './unico.ts';
import { anotarDirector, archivoDelCandado, quienLoTiene, renovarCandado, soltarCandado, tomarCandado, type Candado } from '../../src/director/candado.ts';
import { guardarLineasDeRevision } from '../../src/director/lineasDeRevision.ts';
import { esFinEscrito, type FinEscrito, type QuienTermino } from '../../src/director/finDeLanzamiento.ts';
import { ventanaAgotada } from '../../src/director/limites.ts';
import { tokensDelResultado, type SemanaDelLanzamiento } from '../../src/director/consumoDelPlan.ts';
import { paqueteDeRegistro, REGISTRO, REVISIONES, VARIABLE_REGISTRO } from '../../src/director/paquete.ts';
import { conversacionDe, lecturaNueva, leerRevisionEntera, leerTurnos, type ConversacionDeRevision, type LecturaDeTurnos } from '../../src/director/turnos.ts';
import { avanzaba, avisoDetener, avisoLimite, avisoProrroga, cerrarLaEntrada, DETENER_TRAS_MIN, leerTurno, mensajeDeEntrada, minutosDelAviso, SOBRE_EL_AVISO, type Turno } from './avisoAlDirector.ts';
import { autorizadasPara, NEGACION, NUNCA_SIEMPRE, ordenDePruebas, permisosNegados, pruebasOfrecidas, reglaDeRuta, type PermisoNegado, type RegistroLeido } from './permisosNegados.ts';

export type { FallaRevision };

/** Lo que el Studio muestra del revisor: si revisa solo, o por qué no puede. */
export interface EstadoRevisor {
  agente: string | null;
  problema: string | null;
  revisando: string | null;
  /**
   * Por qué lo pedido espera aunque nadie trabaje desde este Studio: otro director tiene el candado del proyecto (la sesión
   * del director, o uno que lanzó otra copia del Studio), en una frase, con su proyecto (pd_un_director).
   */
  espera?: { proyecto: string; texto: string } | null;
  /**
   * Alguien oprimió «Detener ahora» y el director está cerrando con lo hecho: quién y cuándo, con su proyecto
   * (pr_procesos_vista, punto 3). Si en DETENER_TRAS_MIN minutos no cerró, el Studio lo corta.
   */
  deteniendo?: { proyecto: string; quien: string; cuando: string } | null;
}

/** Una revisión que tarda más que esto se da por perdida: el Studio la detiene y lo dice. */
export const MAX_MIN = MAX_MIN_REVISION;

/**
 * Cuántos días se guardan los registros de las revisiones (punto 6 de la propuesta aceptada «Limpieza antes de publicar»;
 * el titular confirmó la regla con 15 días en su misión del 26 de octubre de 2026: «15 días es suficiente para conservar
 * este historial»). Están fuera de git y crecían sin tope: ese día ya pesaban 1,4 GB.
 */
export const DIAS_REGISTROS = 15;

/**
 * Los archivos de .revisiones que se borran al lanzar al director: cada registro de más de DIAS_REGISTROS días (por la
 * fecha de su nombre), con su paquete (su encargo y su bandeja) y, si tuvo primer tiempo, su registro y su lista de
 * encargos (dosTiempos.ts), salvo el último de cada proyecto y de cada tipo
 * (revisión, aclaración o urgencia), que es el que lee «¿Por qué?» si no cerró. Lo que no se llama como un registro no se
 * toca. Pura: recibe los nombres de la carpeta y devuelve los que salen.
 */
export function registrosParaPodar(nombres: readonly string[], ahora: Date, dias = DIAS_REGISTROS): string[] {
  const limite = ahora.getTime() - dias * 86_400_000;
  const registros = nombres.flatMap((n) => {
    const m = REGISTRO.exec(n);
    return m ? [{ n, grupo: `${m[1]}|${m[2] ?? ''}`, cuando: Date.parse(`${m[3]}T${m[4]}:${m[5]}:${m[6]}.${m[7]}Z`) }] : [];
  });
  const ultimo = new Map<string, number>();
  for (const r of registros) ultimo.set(r.grupo, Math.max(ultimo.get(r.grupo) ?? 0, r.cuando));
  const presentes = new Set(nombres);
  return registros
    .filter((r) => r.cuando < limite && r.cuando < ultimo.get(r.grupo)!)
    .flatMap((r) => [r.n, ...[...Object.values(paqueteDeRegistro(r.n)), archivoDeEncargos(r.n), registroDelPrimerTiempo(r.n)].filter((p) => presentes.has(p))]);
}

/**
 * Si la ventana de uso de la cuenta está agotada, según el último lanzamiento del director en este computador (de
 * cualquier proyecto: el límite es de la cuenta), y cuándo se renueva (limites.ts › ventanaAgotada).
 */
export function ventanaAgotadaDe(carpeta: string, ahora = Date.now()): { renueva: string } | null {
  try {
    const cuando = (n: string) => { const m = REGISTRO.exec(n); return m ? `${m[3]}T${m[4]}${m[5]}${m[6]}${m[7]}` : ''; };
    const ultimo = readdirSync(carpeta).filter((n) => REGISTRO.test(n)).sort((a, b) => cuando(b).localeCompare(cuando(a)))[0];
    return ultimo ? ventanaAgotada(readFileSync(join(carpeta, ultimo), 'utf-8'), ahora) : null;
  } catch {
    return null;
  }
}

/** Borra los registros viejos (registrosParaPodar) y deja en la bitácora cuántos; el que no se pueda borrar, queda para el lanzamiento siguiente. */
async function podarRegistros(raiz: string, carpeta: string, proyecto: string): Promise<void> {
  // Antes de podar, la línea de cada revisión que aún no la tiene (pd_lineas_por_revision): el registro se va, la línea se
  // queda. Nadie trabaja desde este Studio mientras se poda (el turno es de quien va a lanzar), así que todas terminaron
  try {
    guardarLineasDeRevision(raiz, 'todos');
  } catch {
    // sin disco para las líneas, se poda igual: lo de los últimos quince días sigue en sus registros
  }
  let borrados = 0;
  for (const n of registrosParaPodar(readdirSync(carpeta), new Date())) {
    try {
      unlinkSync(join(carpeta, n));
      borrados++;
    } catch {
      // Abierto o ya borrado: lo intenta otra vez el lanzamiento siguiente
    }
  }
  if (borrados) await anotar(raiz, { quien: EL_STUDIO, que: `borró ${borrados} archivos de los registros de revisiones de más de ${DIAS_REGISTROS} días`, desde: 'el lanzador del director', proyecto });
}

/**
 * Lo que el director lanzado por el Studio no tiene: esperas programadas. Sin pantalla, una espera de 20 minutos para
 * «ver si ya terminó» un flujo lo deja parado (el 21 de octubre de 2026, una revisión pasó 25 de sus 40 minutos así); el
 * aviso de que algo en segundo plano terminó ya lo despierta solo.
 */
export const SIN_ESPERAS = ['ScheduleWakeup', 'CronCreate'];

/**
 * Cuánto puede seguir vivo el director después de su cierre (--listo): lo justo para el commit de la memoria. Pasado
 * eso, el Studio lo detiene. El 22 de octubre de 2026 una revisión cerró, siguió 17 minutos esperando a un revisor de
 * código que había lanzado y volvió a escribir el plan; mientras tanto, la revisión que se pidió esperó su turno (nota
 * de voz del titular: que no pueda pasar).
 */
export const GRACIA_CIERRE_MIN = 3;

/**
 * Cómo espera lo que lanza en segundo plano (un flujo, un ayudante): sin esperas programadas, y con su límite. Que el
 * cierre es lo último y que el Studio detiene al que sigue vivo GRACIA_CIERRE_MIN minutos después lo dice CLAUDE.md, que el
 * lanzador pasa entero a cada director (nucleoExplicito): el encargo ya no lo repite.
 */
const esperar = (minutos: number) =>
  ` If you launch a multi-agent workflow or a helper in the background, carry on with the rest and, when nothing else is ` +
  `left, end your turn: its completion notice wakes you (you have no scheduled waits). You have ${minutos} minutes in total.` +
  SOBRE_EL_AVISO;

/**
 * Si toca detener al director porque siguió vivo después de su cierre: `cerroDesde` es cuando el Studio vio el cierre
 * (null si aún no cierra). Pura.
 */
export const detenerTrasCierre = (cerroDesde: number | null, ahora = Date.now(), graciaMin = GRACIA_CIERRE_MIN) =>
  cerroDesde !== null && ahora - cerroDesde >= graciaMin * 60_000;

/**
 * La página pública (su animación, en docs/difusion) la sube el director apenas cambia, sin preguntar:
 * el titular solo la puede revisar en la web (nota de voz del 22 de octubre de 2026, «se considera regla»). Solo cuando
 * el proyecto que revisa es el mismo Studio; nada más del Studio se sube. Lo dice CLAUDE.md (el encargo ya no lo repite);
 * aquí queda la única orden de subida que permitido() le da, y solo en ese caso.
 */
export const SUBIR_PAGINA = 'node tools/publicar-stl.ts --subir';

/**
 * Subir, bajar y publicar son permisos del panel, con su casilla y su alcance (decisión del titular del 26 de octubre de
 * 2026, pd_permisos_panel). CLAUDE.md dice el resto (sin permiso se deja listo y se dice; nunca se fuerza ni se reescribe la
 * historia), y el código lo niega en cualquier modo (revisor.ts › negado). El encargo solo lo recuerda en una cláusula,
 * porque es lo que más cuesta deshacer.
 */
export const SUBIR_CON_PERMISO = 'Push, pull or publish only with the «Permisos» permission, never forced.';

/**
 * Cómo usar los permisos que el titular autorizó el 22 de octubre de 2026, para no perder turnos con lo que se niega:
 * git en otra carpeta con cd (git -C no se puede acotar a lecturas), copiar sin cp, y borrar o instalar solo así. Y las
 * pruebas tal cual, con cada cambio guardado apenas pasan: el 22 de octubre una revisión intentó correrlas con tuberías
 * (se le negaron) y se cortó con seis arreglos hechos y sin commit. Un ayudante no las recibe: por eso se le dice al
 * director que se las dé (ayudante.ts › ORDENES_DEL_AYUDANTE las repite en su encargo). Cómo se arma ese encargo con
 * ayudante.ts y que el director lo verifica lo dice CLAUDE.md, que el lanzador pasa entero.
 */
export const COMO_ORDENES =
  ` Commands: to use git in another folder, cd there first (git -C is not allowed). Copy a text file by reading and ` +
  `writing it. Read only the Studio, the project's repository and your earlier sessions, never a .env file. Move with ` +
  `git mv; create local backup branches (git branch respaldo/…). Delete only files git keeps, with git rm: one that ` +
  `became unused through an approved change, without asking, each deletion in its own commit and told in your answer; ` +
  `any other, only after the owner's two steps in the Studio: the approval and «Confirmo», with the list of what is ` +
  `deleted in view. ` +
  `npm install, without package names, only when an approved change changes package.json. Run tests and types alone and ` +
  `as they are (npm test, npx vitest run <file>, npm run typecheck), one after the other and never at the same time ` +
  `(together they take twice as long): no variables in front, no redirections (2>&1). ` +
  `Commit each code change as soon as its tests and types pass, before starting the next. Read and search with Read, ` +
  `Grep and Glob, not the terminal (cat, sed, grep, head, ls, wc), and never chain commands with ;, && or pipes: with ` +
  `«Me pregunta en el Studio», each command outside your list interrupts the owner with a dialog. Give your helpers ` +
  `these rules in their assignment.`;

/**
 * Escribirle a cada persona como lee (pd_reglas_lectura; el titular eligió «En la ficha de cada persona» en
 * t_decide_idiomas_que_lees): los idiomas que lee cada una van en su ficha del equipo y la bandeja los dice en su línea
 * «Team» (comoLeeElEquipo); el encargo recuerda la regla, que vale para cualquier persona que instale el Studio.
 */
export const COMO_LEE_CADA_UNO =
  ` Write to each person in the language chosen in the interface, whatever language the notes come in: the inbox's ` +
  `«Team» line says it, with the languages each one reads (Proyecto › Equipo). ` +
  `Never translate for them what is already in a language they read (quote it as it is), and put more content in each ` +
  `step of a review mission for them.`;

/**
 * Cada modelo para lo suyo (propuesta aceptada pr_modelos_por_tarea, puntos 2 y 3, con lo que Anthropic publica y mide en
 * code.claude.com/docs/en/costs): el director decide y comprueba, y delega solo donde ahorra de verdad; lo simple, sin
 * ayudantes, y un flujo de varios agentes solo cuando hace falta. El modelo de los ayudantes lo pone el Studio
 * (modeloDeLosAyudantes). Va en cada encargo que ejecuta trabajo (la revisión y la urgencia).
 */
export const POLITICA_DE_MODELOS =
  ` Each model for its job: your own effort first, which usually suffices; delegate to a helper only where it truly saves ` +
  `(a lot of routine, checkable work, or more reading than fits your context), with a bounded assignment, and check ` +
  `what it returns. What is delicate (the Studio's core, permissions, what deletes or costs) you do or verify yourself. ` +
  `A multi-agent workflow only for many independent pieces or something delicate to verify from several angles; simple ` +
  `work, no helpers. Your helpers use the model the Studio sets, lighter on the plan than yours unless the owner chose «Todo con el ` +
  `modelo que elegí».` +
  // Y lo que Anthropic dice de cada modelo, de la tabla del código (pr_modelos_por_tarea, punto 1; opción B)
  INVENTARIO_EN_EL_ENCARGO;

/**
 * Un proyecto de la cola de diagnósticos que una revisión va a atender, con lo que el Studio le abre al director de él
 * (propuesta aceptada «La cola de diagnósticos, con los permisos de hoy»): leer su repositorio, escribir su memoria
 * (.stl) y leer su historial de IA, solo en esa revisión.
 */
export interface ProyectoDeCola {
  id: string;
  /** Su repositorio en este computador. */
  repositorio: string;
  /** Las carpetas de su historial de IA cuyo lugar se sabe (solo se leen). */
  historial: string[];
}

/**
 * Lo que el encargo de la revisión dice de la cola: qué proyectos le abrió el Studio y para qué, con la misma regla que
 * `permitido`. Sin cola, nada: el director sigue sin permiso sobre otros proyectos.
 */
const conLaCola = (cola: ProyectoDeCola[]) =>
  cola.length
    ? ` Diagnosis queue of this review: the Studio opened ${cola.map((c) => `«${c.id}»`).join(', ')} to you, only in this ` +
      `review (read its repository and AI history, write its .stl memory, nothing else). Diagnose those the inbox marks ` +
      `«AHORA», as ${PROCEDIMIENTOS.cola.archivo} and ${PROCEDIMIENTOS.diagnostico.archivo} say, each with --proyecto <id>; ` +
      `one that cannot be done stays in the queue.`
    : '';

/**
 * Lo que varios encargos dicen con las mismas palabras, escrito una sola vez: que cada commit son tres órdenes (los
 * permisos del director no aceptan órdenes encadenadas; propuesta «El cierre no deja nada sin atender»), que solo se
 * escribe lo aprobado, que una aclaración, una comprobación o una urgencia no son la revisión, y el reintento
 * (pr_retoma_automatica, punto 5: lo pide «Retomarla» cuando la anterior no se cerró).
 */
const COMMIT_EN_TRES = ' Commit with three separate commands: cd to the folder, git add, git commit.';
const ESCRIBIR_LO_APROBADO =
  ` Write in the project's repository (its memory and its code) only what the owner approved or asked in the Studio, ` +
  `with that project's rules: tests green, local commits.`;
const NO_ES_LA_REVISION =
  ' Do NOT do the whole review or anything else: the other notes, deliveries and documents wait for the next review.';
const REINTENTO = ' This is a retry: the previous one did not close. Resume what it left, without redoing it (the inbox lists it).';

/**
 * Lo que se le encarga al director: lo mismo que «revisa estudio», de un proyecto, para una sesión sin pantalla. Con
 * `reintento`, la anterior no se cerró: retoma lo que dejó. Con `cola`, además diagnostica esos proyectos; con
 * `historial`, lee el de IA del proyecto. Va en inglés (el núcleo del Studio nace en inglés) y no repite lo que CLAUDE.md ya
 * dice —quién manda, qué pasa sin un permiso, subir, la página pública, el cierre y sus 3 minutos, el ayudante—, porque
 * el lanzador lo pasa entero en cada lanzamiento (nucleoExplicito): cada regla se dice una sola vez, ahí.
 */
export const encargo = (proyecto: string, reintento = false, cola: ProyectoDeCola[] = [], historial: string[] = [], minutos = MAX_MIN) =>
  `Review requested from the Studio for the project «${proyecto}». Do «revisa estudio» for it as CLAUDE.md says ` +
  `("The director's session"), with --proyecto ${proyecto} in every tool.` +
  ESCRIBIR_LO_APROBADO +
  ` ${SUBIR_CON_PERMISO}` +
  COMMIT_EN_TRES +
  ` Close with node tools/director/bandeja.ts --proyecto ${proyecto} --listo and the commit in the project's memory.` +
  (reintento ? REINTENTO : '') +
  COMO_ORDENES +
  COMO_LEE_CADA_UNO +
  POLITICA_DE_MODELOS +
  conLaCola(cola) +
  conElHistorial(historial) +
  esperar(minutos);

/** Una aclaración es una ida y vuelta corta: si tarda más que esto, se detiene y el pedido queda para la revisión. */
export const MAX_MIN_ACLARAR = 15;

/**
 * Lo que se le encarga al director cuando alguien no entendió un paso («No lo entiendo, explícamelo mejor»): solo ese
 * paso, al instante, sin el resto de la revisión (lo demás espera su turno, intacto).
 */
export const encargoAclaracion = (a: AclaracionPedida) =>
  `Clarification requested from the Studio for the project «${a.proyecto}»: ${a.quien} did not understand step ` +
  `${a.paso + 1} of the mission «${a.mision}» and pressed «No lo entiendo, explícamelo mejor». A short round trip.` +
  NO_ES_LA_REVISION +
  ` Run node tools/director/bandeja.ts --proyecto ${a.proyecto} --aclarar and follow it: rewrite only that step in the ` +
  `plan, answer only that note, and close with node tools/director/bandeja.ts --proyecto ${a.proyecto} --aclarar --listo ` +
  `and the commit in the project's memory. Do not touch the code.` +
  COMMIT_EN_TRES +
  (a.reintento ? REINTENTO : '') +
  esperar(MAX_MIN_ACLARAR);

/**
 * Lo que se le encarga al director cuando alguien hizo un paso fuera del Studio y oprimió «Ya lo hice: compruébalo tú»
 * (propuesta aceptada pr_verificar_paso): comprobar solo ese paso, al instante, con la evidencia que pueda leer, y decir
 * si se cumplió, qué encontró y qué hacer si no. Va por el camino de la aclaración, con el mismo límite.
 */
export const encargoComprobacion = (a: AclaracionPedida) =>
  `Check requested from the Studio for the project «${a.proyecto}»: ${a.quien} did step ${a.paso + 1} of the mission ` +
  `«${a.mision}» outside the Studio and pressed «Ya lo hice: compruébalo tú». A short round trip.` +
  NO_ES_LA_REVISION +
  ` Run node tools/director/bandeja.ts --proyecto ${a.proyecto} --comprobar and follow it: look for the evidence of that ` +
  `step (the repository, the tool, the web page), answer only that note with what you found, and close with ` +
  `node tools/director/bandeja.ts --proyecto ${a.proyecto} --comprobar --listo and the commit in the project's memory. ` +
  `Do not touch the code or do for the person what the step asks of them.` +
  COMMIT_EN_TRES +
  (a.reintento ? REINTENTO : '') +
  esperar(MAX_MIN_ACLARAR);

/** Una urgencia puede llevar un arreglo con sus pruebas: tiene más tiempo que una aclaración, menos que una revisión. */
export const MAX_MIN_URGENCIA = 30;

/**
 * Lo que se le encarga al director cuando alguien marcó una nota como urgente: solo esas notas, al instante, sin el
 * resto de la revisión. El resultado vuelve como reporte en «Dónde quedamos», no como trabajo nuevo.
 */
export const encargoUrgencia = (u: UrgenciaPedida) =>
  `Urgency requested from the Studio for the project «${u.proyecto}»: ${u.quien} marked ` +
  `${u.notas.length === 1 ? 'one note' : `${u.notas.length} notes`} in the «Buzón» as urgent. Attend those notes.` +
  NO_ES_LA_REVISION +
  ` Run node tools/director/bandeja.ts --proyecto ${u.proyecto} --urgente and follow it.` +
  ESCRIBIR_LO_APROBADO +
  ` ${SUBIR_CON_PERMISO}` +
  COMMIT_EN_TRES +
  ` Close with node tools/director/bandeja.ts --proyecto ${u.proyecto} --urgente --listo and the commit in the project's memory.` +
  (u.reintento ? REINTENTO : '') +
  COMO_ORDENES +
  POLITICA_DE_MODELOS +
  esperar(MAX_MIN_URGENCIA);

/** Lo que se lanza aparte de la revisión: una aclaración o una urgencia. */
type Aparte = { tipo: 'aclaracion'; a: AclaracionPedida } | { tipo: 'urgencia'; u: UrgenciaPedida };


/**
 * Donde Claude Code guarda las sesiones que se abren en una carpeta: ~/.claude/projects/ y la ruta con un guion en vez
 * de cada signo (C:\xampp\STL es C--xampp-STL). Ahí están las revisiones anteriores del director lanzado desde el Studio.
 */
export const carpetaDeSesiones = (carpeta: string, casa = homedir()) =>
  join(casa, '.claude', 'projects', carpeta.replace(/[\\/]+$/, '').replace(/[^A-Za-z0-9]/g, '-'));

/** Las reglas que niegan una opción de una orden, esté justo después de ella o más adelante («git rm -f x», «git rm x -f»). */
const sinOpcion = (orden: string, opciones: string[]) => opciones.flatMap((o) => [`Bash(${orden} ${o}*)`, `Bash(${orden} * ${o}*)`]);

/**
 * Lo único que puede hacer el director lanzado por el Studio (el titular lo autorizó el 17 de octubre de 2026): leer,
 * las herramientas del director, escribir dentro del repositorio del proyecto (su memoria y su código, para que una
 * urgencia aprobada se arregle al instante), correr sus pruebas y hacer commits locales. Desde el 19 de octubre, también
 * investigar en internet (buscar y leer páginas, propuesta «El director puede buscar en internet») y repartir la
 * lectura entre ayudantes (subagentes), que heredan los mismos límites. Nada que suba ni despliegue: eso queda listo para
 * el titular. Con `flujos` (ultracode encendido y el permiso del titular, del 21 de octubre de 2026), también los flujos
 * de varios agentes (Workflow), cuyos agentes tienen estos mismos límites.
 *
 * Desde el 22 de octubre de 2026, los seis grupos que el titular autorizó en su misión «Autoriza los permisos que le
 * faltaron al director»: (1) las órdenes que solo leen o comprueban; (2) una parte de las pruebas; (3) leer solo donde
 * trabaja: el Studio (`raiz`), el repositorio del proyecto y sus propias sesiones anteriores (`negado` dice lo que nunca);
 * (4) mover dentro del repositorio y crear ramas de respaldo locales; (5) borrar con git rm, que solo borra lo que git
 * guarda (el encargo exige los dos pasos del titular en el Studio); y (6) npm install, sin nombres de paquetes.
 */
export function permitido(repositorio: string, flujos = false, raiz = repositorio, casa = homedir(), cola: ProyectoDeCola[] = [], historial: string[] = []): string[] {
  // Una regla Edit cubre también la escritura de archivos nuevos
  const r = reglaDeRuta(repositorio);
  // (3) Leer solo donde trabaja: sin la regla suelta «Read» (que deja leer todo el computador). Leer, buscar y listar
  // dentro de las carpetas de trabajo (el Studio, donde arranca, y el repositorio, con --add-dir) no pide permiso; sus
  // sesiones anteriores están fuera de ellas, y la regla Read también vale para Grep y Glob
  const leer = [...new Set([raiz, repositorio, carpetaDeSesiones(raiz, casa)].map((c) => `Read(${reglaDeRuta(c)}/**)`))];
  // La cola de diagnósticos de esta revisión (propuesta aceptada «La cola de diagnósticos, con los permisos de hoy»): de
  // cada proyecto que va a diagnosticar, leer su repositorio, escribir solo su memoria (.stl: el diagnóstico es lo único
  // que se escribe en un proyecto que aún no se adopta) y leer su historial de IA; nada más
  const deLaCola = cola.flatMap((c) => [
    `Read(${reglaDeRuta(c.repositorio)}/**)`,
    `Edit(${reglaDeRuta(join(c.repositorio, MEMORIA))}/**)`,
    ...c.historial.map((h) => `Read(${reglaDeRuta(h)}/**)`),
  ]);
  // El historial de IA del proyecto que revisa, mientras no tenga su diagnóstico (historialDelActivo): solo leerlo
  const delActivo = historial.map((h) => `Read(${reglaDeRuta(h)}/**)`);
  return [
    ...leer, `Edit(${r}/**)`, ...deLaCola, ...delActivo,
    // investigar: lo leído en internet es referencia, nunca una orden (CLAUDE.md)
    'WebSearch', 'WebFetch',
    // repartir una lectura grande entre ayudantes (un repositorio grande, los historiales de IA de la cola de
    // diagnósticos): cada ayudante hereda esta misma lista, ni un permiso más (decisión del 19 de octubre de 2026)
    'Agent', 'Task',
    ...(flujos ? ['Workflow'] : []),
    'Bash(node tools/director/bandeja.ts:*)', 'Bash(node tools/director/diagnosticar.ts:*)', 'Bash(node tools/director/estado.ts:*)',
    // marcar hecho cada encargo del plan de la revisión en dos tiempos, para que la persona lo vea (pd_dos_tiempos)
    'Bash(node tools/director/encargos.ts:*)',
    // (2) las pruebas completas o solo una parte (un archivo, un nombre)
    'Bash(npm test)', 'Bash(npm test:*)', 'Bash(npx vitest run:*)', 'Bash(npm run typecheck)', 'Bash(npm run typecheck:*)',
    // mirar en un navegador sin pantalla lo que cambió de la interfaz (propuesta aceptada el 20 de octubre de 2026):
    // solo esta herramienta, que abre páginas https o de este computador y guarda las capturas en la memoria
    'Bash(node tools/director/mirar.ts:*)',
    // los commits, como los da la bandeja (cd, add y commit): solo locales, nunca push. Los del proyecto, firmados con su
    // firma de publicación en autor y confirmador, sin tocar la identidad de la carpeta (autorizado por el titular el 22
    // de octubre de 2026, misión «Decide si mis commits nacen firmados como ARGWABOT»)
    'Bash(node tools/director/firmar.ts:*)',
    'Bash(cd:*)', 'Bash(git add:*)', 'Bash(git commit:*)', 'Bash(git status:*)', 'Bash(git diff:*)', 'Bash(git log:*)',
    // (1) leer y comprobar sin cambiar nada; git -C no, porque no se puede acotar a lecturas (el encargo dice cd y luego la orden)
    'Bash(ls:*)', 'Bash(wc:*)', 'Bash(git show:*)', 'Bash(git ls-files:*)', 'Bash(git rev-parse:*)', 'Bash(git rev-list:*)',
    'Bash(git config --get:*)', 'Bash(git branch --show-current)', 'Bash(git stash list:*)', 'Bash(git remote -v)',
    'Bash(git worktree list:*)', 'Bash(git ls-remote:*)', 'Bash(gh auth status:*)',
    // (4) mover dentro del repositorio (git no deja salir de él) y ramas de respaldo locales, nada más (negado)
    'Bash(git mv:*)', 'Bash(git branch respaldo/:*)',
    // (5) borrar solo lo que git guarda, que queda en la historia y se recupera
    'Bash(git rm:*)',
    // (6) instalar lo que dice package.json, sin nombres de paquetes
    'Bash(npm install)',
    // la página pública, solo cuando el proyecto es el mismo Studio (nota del titular del 22 de octubre de
    // 2026): esta orden exacta, que sube solo la página
    ...(esElStudio(repositorio, raiz) ? [`Bash(${SUBIR_PAGINA})`] : []),
  ];
}

/**
 * Lo permitido de siempre más lo que el titular autorizó con una casilla (permisosNegados.ts › autorizadasPara), sin
 * repetir. Lo que niega `negado` va aparte, en --disallowedTools, y en Claude Code siempre gana.
 */
export const conAutorizadas = (permitidas: string[], autorizadas: string[]) => [...new Set([...permitidas, ...autorizadas])];

/** El nombre de un registro de revisión: <proyecto>-[aclaracion-|urgencia-]<ISO con guiones>.log. */
const NOMBRE_REGISTRO = /^(?:(?:aclaracion|urgencia)-)?(\d{4}-\d\d-\d\d)T(\d\d)-(\d\d)-(\d\d)-(\d{3})Z\.log$/;
/** De cuántos registros de cada proyecto, los más nuevos, sale lo negado que el panel ofrece autorizar. */
const REGISTROS_POR_PROYECTO = 12;
/** Lo ya leído de cada registro (por su tamaño): el panel se abre seguido y los registros pesan. */
const negadosLeidos = new Map<string, { tam: number; texto: string }>();

/**
 * Los registros de revisión de estos proyectos en .revisiones (los REGISTROS_POR_PROYECTO más nuevos de cada uno), con
 * solo las líneas que pueden traer un negado. Un id que es el comienzo de otro (golf y golf-club) se resuelve por el más largo.
 */
export function registrosDeNegados(raiz: string, ids: string[], porProyecto = REGISTROS_POR_PROYECTO): RegistroLeido[] {
  const carpeta = join(raiz, '.revisiones');
  let nombres: string[] = [];
  try {
    nombres = readdirSync(carpeta);
  } catch {
    return [];
  }
  const largos = [...ids].sort((a, b) => b.length - a.length);
  const porId = new Map<string, { registro: string; cuando: string }[]>();
  for (const nombre of nombres) {
    for (const id of largos) {
      if (!nombre.startsWith(`${id}-`)) continue;
      const m = NOMBRE_REGISTRO.exec(nombre.slice(id.length + 1));
      if (m) porId.set(id, [...(porId.get(id) ?? []), { registro: nombre, cuando: `${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z` }]);
      if (m) break;
    }
  }
  const leidos: RegistroLeido[] = [];
  for (const [proyecto, lista] of porId) {
    for (const { registro, cuando } of lista.sort((a, b) => b.cuando.localeCompare(a.cuando)).slice(0, porProyecto)) {
      const archivo = join(carpeta, registro);
      try {
        const tam = statSync(archivo).size;
        let leido = negadosLeidos.get(archivo);
        if (!leido || leido.tam !== tam) {
          const texto = readFileSync(archivo, 'utf-8').split('\n').filter((l) => l.includes('"tool_use"') || l.includes(NEGACION)).join('\n');
          leido = { tam, texto };
          negadosLeidos.set(archivo, leido);
        }
        leidos.push({ proyecto, cuando, registro, texto: leido.texto });
      } catch {
        // un registro que se borró entre listar y leer
      }
    }
  }
  return leidos;
}

/**
 * Lo que se le negó al director en las revisiones de los proyectos de este computador, para el panel de permisos: cada
 * negado con su regla, en palabras, y si es de lo que nunca (lo que niega el lanzador de su proyecto).
 */
export async function negadosDelDirector(raiz: string, casa = homedir()): Promise<PermisoNegado[]> {
  const local = await leerLocal(raiz);
  const ids = await proyectosLocales(raiz);
  const prohibidas = (id: string) => [...SIN_ESPERAS, ...negado(local.repositorios[id]?.trim() || raiz, raiz)];
  // Lo que ya le da siempre no se vuelve a ofrecer: de una cadena, solo el tipo de acción que le faltó
  const permitidas = (id: string) => permitido(local.repositorios[id]?.trim() || raiz, false, raiz, casa);
  const negados = permisosNegados(registrosDeNegados(raiz, ids), prohibidas, casa, permitidas);
  // Las pruebas de cada proyecto, leídas de él y ofrecidas antes de que se le nieguen (decisión del titular del 26 de
  // octubre de 2026: «Que la lea y me la ofrezca»)
  const ofrecidas = ids.flatMap((id) => {
    const repo = local.repositorios[id]?.trim();
    if (!repo || !existsSync(repo)) return [];
    const leer = (nombre: string) => {
      try {
        return readFileSync(join(repo, nombre), 'utf8');
      } catch {
        return undefined;
      }
    };
    const pruebas = ordenDePruebas({ packageJson: leer('package.json'), composerJson: leer('composer.json'), pyproject: leer('pyproject.toml'), makefile: leer('Makefile'), existe: (nombre) => existsSync(join(repo, nombre)) });
    const p = pruebasOfrecidas(id, pruebas, permitidas(id), negados);
    return p ? [p] : [];
  });
  return [...negados, ...ofrecidas];
}

/** Si el repositorio del proyecto es la carpeta del mismo Studio (STL Studio dirigiéndose a sí mismo). */
export const esElStudio = (repositorio: string, raiz: string) =>
  resolve(repositorio).replace(/[\\/]+$/, '').toLowerCase() === resolve(raiz).replace(/[\\/]+$/, '').toLowerCase();

/**
 * Lo que el director lanzado nunca lee ni toca, aunque esté dentro de lo permitido (grupo 3 de los permisos que el
 * titular autorizó el 22 de octubre de 2026): ningún archivo .env, ni los ajustes ni las credenciales de Claude Code; no
 * edita sus propios permisos (.claude/settings*), estudio.local.json, los registros de las revisiones (.revisiones, donde
 * también está su configuración) ni nada de .git. Y de mover, crear ramas y borrar, solo lo que autorizó: sin
 * renombrar ni borrar ramas, sin forzar y sin borrar lo que git no guarda.
 */
export function negado(repositorio: string, raiz = repositorio, cola: ProyectoDeCola[] = []): string[] {
  // Los ajustes de Claude Code de cada proyecto de la cola tampoco se editan (el permiso de su memoria no los alcanza,
  // pero la regla va igual: lo que nunca, nunca)
  const carpetas = [...new Set([raiz, repositorio, ...cola.map((c) => c.repositorio)].map(reglaDeRuta))];
  const s = reglaDeRuta(raiz);
  return [
    'Read(//**/.env)', 'Read(//**/.env.*)',
    'Read(~/.claude/settings.json)', 'Read(~/.claude/settings.local.json)', 'Read(~/.claude/.credentials.json)', 'Read(~/.claude.json)',
    ...carpetas.map((c) => `Edit(${c}/.claude/settings*.json)`),
    `Edit(${s}/estudio.local.json)`, `Edit(${s}/.revisiones/**)`,
    // Lleva los valores de las claves de tus ajustes que elegiste conservar (ajustesPropios.ts): como tu archivo de ajustes
    `Read(${s}/.revisiones/ajustes-del-director.json)`,
    'Edit(//**/.git)', 'Edit(//**/.git/**)',
    ...sinOpcion('git branch', ['-d', '-D', '--delete', '-m', '-M', '--move', '-f', '--force']),
    ...sinOpcion('git mv', ['-f', '--force']),
    ...sinOpcion('git rm', ['-f', '-rf', '-fr', '--force']),
    // Lo que nunca, como regla explícita y no solo porque falta en la lista, para que ningún modo lo pueda aprobar
    // (propuesta aceptada «Los permisos, al momento», su punto 3): reescribir la historia, también la ya subida (forzar
    // una subida o borrar una rama del remoto). Subir, bajar y publicar sin forzar ya no van aquí: son permisos del
    // panel, con su casilla y su alcance (decisión del titular del 26 de octubre de 2026, pd_permisos_panel)
    ...sinOpcion('git push', ['--force', '-f', '--force-with-lease', '--force-if-includes', '--mirror', '--delete', '-d']), 'Bash(git push * +*)',
    'Bash(git rebase:*)', 'Bash(git reset:*)', 'Bash(git filter-branch:*)', 'Bash(git filter-repo:*)',
    ...sinOpcion('git commit', ['--amend']),
  ];
}

const realODeNada = (ruta: string): string | null => {
  try {
    return realpathSync(ruta);
  } catch {
    return null;
  }
};

/**
 * Las carpetas de historial de IA que el director puede leer: solo las que están dentro de donde los agentes guardan sus
 * sesiones (`raices`: ~/.claude/projects, ~/.codex/sessions y el almacén de Cursor). El `donde` de un proyecto lo escribe
 * el escaneo, pero también llega por la memoria que alguien comparta: una ruta ajena (~/.ssh, el home entero, una
 * unidad) no se abre nunca. Se comparan las rutas reales, sin enlaces ni «..»; una carpeta que no existe no cuenta.
 */
export function historialAbrible(donde: string[], raices: string[], real: (ruta: string) => string | null = realODeNada): string[] {
  const norma = (r: string) => {
    const p = r.replace(/\\/g, '/').replace(/\/+$/, '');
    return process.platform === 'linux' ? p : p.toLowerCase();
  };
  const bases = raices.map(real).filter((r): r is string => !!r).map(norma);
  const abribles: string[] = [];
  for (const d of [...new Set(donde)]) {
    if (!isAbsolute(d)) continue;
    const r = real(d);
    if (r && bases.some((b) => norma(r).startsWith(`${b}/`))) abribles.push(r);
  }
  return [...new Set(abribles)];
}

/**
 * Los proyectos de la cola de diagnósticos que esta revisión atiende (los primeros POR_REVISION, con la misma regla y la
 * misma lectura que la bandeja: director.ts › colaDeDiagnosticos y memoria.ts › leerJsonFresco, lo más nuevo entre la carpeta y
 * GitHub), cada uno con su repositorio y las carpetas de su historial de IA que se pueden abrir (historialAbrible). Un
 * proyecto cuyo plan o proyecto.json existe y no se entiende queda fuera: no se abre escritura sobre lo que no se sabe
 * leer. Sin proyectos en cola, vacía. `raices`: dónde guardan sus sesiones los agentes (por defecto, las de este
 * computador).
 */
export async function colaDeLaRevision(raiz: string, activo: string, raices?: string[]): Promise<ProyectoDeCola[]> {
  const local = await leerLocal(raiz);
  const leer = (ruta: string) => leerJsonFresco(raiz, ruta);
  const candidatos: CandidatoDeCola[] = [];
  for (const id of await proyectosLocales(raiz)) {
    if (id === activo) continue;
    const plan = await leer(rutasDe(id).plan);
    if (!plan || plan.diagnostico?.fecha) continue; // sin entender, fuera; ya diagnosticado, no es de la cola
    const proyecto = await leer(rutasDe(id).proyecto);
    if (!proyecto) continue;
    candidatos.push({
      id,
      nombre: typeof proyecto.nombre === 'string' ? proyecto.nombre : id,
      diagnosticado: false,
      tipo: proyecto.tipo === 'nuevo' ? 'nuevo' : 'existente',
      conectado: !!local.repositorios[id],
      historialIA: Array.isArray(proyecto.historialIA) ? proyecto.historialIA : undefined,
    });
  }
  const cola = colaDeDiagnosticos(candidatos, activo).slice(0, POR_REVISION);
  if (!cola.length) return [];
  const lugares = raices ?? (await fuentesDeEscaneo()).agentes.map((a) => a.donde);
  return cola.flatMap((c) => {
    const repositorio = local.repositorios[c.id]?.trim();
    if (!repositorio) return [];
    return [{ id: c.id, repositorio, historial: historialAbrible(c.historialIA.map((h) => (typeof h.donde === 'string' ? h.donde : '')), lugares) }];
  });
}

/**
 * El historial de IA del proyecto que se revisa, recién entregado (pedido del titular pd_historial_activo): mientras no
 * tenga su diagnóstico, su revisión lo lee una vez para convertir lo que quedó a medias en propuestas, misiones o
 * decisiones (CLAUDE.md), como el de un proyecto de la cola y con la misma regla (historialAbrible: solo dentro de donde
 * los agentes guardan sus sesiones; hoy, las de Claude Code). Ya diagnosticado, o con un plan o un proyecto.json que no
 * se entienden, nada. `raices`: dónde guardan sus sesiones los agentes (por defecto, las de este computador).
 */
export async function historialDelActivo(raiz: string, activo: string, raices?: string[]): Promise<string[]> {
  const plan = await leerJsonFresco(raiz, rutasDe(activo).plan);
  if (!plan || plan.diagnostico?.fecha) return [];
  const proyecto = await leerJsonFresco(raiz, rutasDe(activo).proyecto);
  if (!proyecto || !Array.isArray(proyecto.historialIA)) return [];
  const donde = proyecto.historialIA.map((h: { donde?: unknown } | null) => (typeof h?.donde === 'string' ? h.donde : ''));
  if (!donde.some(Boolean)) return [];
  return historialAbrible(donde, raices ?? (await fuentesDeEscaneo()).agentes.map((a) => a.donde));
}

/** Lo que el encargo de la revisión dice del historial del proyecto activo que el Studio le abrió. Sin él, nada. */
export const conElHistorial = (historial: string[]) =>
  historial.length
    ? ` AI history of this project, which has no diagnosis yet: the Studio opened it to you for reading, only in this ` +
      `review (${historial.length === 1 ? 'one folder' : `${historial.length} folders`}: ${historial.join(', ')}). Read it ` +
      `once, in the diagnosis, with a helper, as ${PROCEDIMIENTOS.diagnostico.archivo} says; never answer in those ` +
      `conversations or continue them.`
    : '';

/** Un paso de lo que va haciendo el director: lo que dice o la herramienta que usa. */
export interface PasoRevision {
  tipo: 'dice' | 'hace';
  texto: string;
  /** Cuántas veces seguidas lo hizo, si fue más de una (agruparPasos). */
  veces?: number;
}

/**
 * Las líneas iguales seguidas, en una sola con su cuenta («Edita plan.json» y un 5, en vez de cinco líneas), como lo pidió
 * el titular el 21 de octubre de 2026. El orden se mantiene: al cambiar de cosa, la cuenta vuelve a empezar.
 */
export function agruparPasos(pasos: PasoRevision[]): PasoRevision[] {
  const juntos: PasoRevision[] = [];
  for (const p of pasos) {
    const ultimo = juntos.at(-1);
    if (ultimo && ultimo.tipo === p.tipo && ultimo.texto === p.texto) ultimo.veces = (ultimo.veces ?? 1) + (p.veces ?? 1);
    else juntos.push({ ...p });
  }
  return juntos;
}

const nombreArchivo = (x: unknown) => String(x ?? '').split(/[\\/]/).pop() || 'un archivo';
const corto = (x: unknown, n: number) => {
  const t = String(x ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

/** Una herramienta, dicha en palabras del Studio. */
function queHace(nombre: string, e: Record<string, unknown>): string {
  switch (nombre) {
    case 'Read': return `Lee ${nombreArchivo(e.file_path)}`;
    case 'Edit': case 'MultiEdit': return `Edita ${nombreArchivo(e.file_path)}`;
    case 'Write': return `Escribe ${nombreArchivo(e.file_path)}`;
    case 'NotebookEdit': return `Edita ${nombreArchivo(e.notebook_path)}`;
    case 'Grep': return `Busca «${corto(e.pattern, 60)}»`;
    case 'Glob': return `Busca archivos ${corto(e.pattern, 60)}`;
    case 'Bash': return e.description ? corto(e.description, 120) : `Corre ${corto(e.command, 90)}`;
    case 'Task': case 'Agent': return `Le pide a un ayudante: ${corto(e.description ?? e.prompt, 100)}`;
    case 'TodoWrite': return 'Ordena su lista de tareas';
    case 'WebSearch': return `Busca en internet «${corto(e.query, 80)}»`;
    case 'WebFetch': return `Lee la página ${corto(e.url, 90)}`;
    default: return `Usa ${nombre}`;
  }
}

/**
 * Lo que va haciendo el director, a partir de su registro en stream-json (una línea JSON por evento): lo que dice y
 * cada herramienta que usa, en orden. Las líneas que no son JSON (avisos, un registro viejo en texto) se ignoran. En el
 * modo «Automático, vigilado», con `auto` (lo leído de los pedazos anteriores), también cada cosa que Claude Code aprobó
 * solo, en una línea, en su lugar y sin sonido ni diálogo (tu elección del 26 de octubre de 2026; aprobadoEnVivo).
 */
export function progresoDe(registro: string, max = 40, auto: EnVivo = { usos: new Map() }): PasoRevision[] {
  const pasos: PasoRevision[] = [];
  for (const linea of registro.split('\n')) {
    if (!linea.startsWith('{')) continue;
    let ev: { type?: string; subtype?: string; message?: { content?: unknown } };
    try { ev = JSON.parse(linea); } catch { continue; }
    const aprobo = aprobadoEnVivo(ev, auto);
    if (aprobo) pasos.push({ tipo: 'hace', texto: `Claude Code lo aprobó solo: ${aprobo}` });
    if (ev.type === 'system' && ev.subtype === 'init') pasos.push({ tipo: 'hace', texto: 'Empieza la revisión' });
    if (ev.type !== 'assistant' || !Array.isArray(ev.message?.content)) continue;
    for (const b of ev.message.content as { type?: string; text?: string; name?: string; input?: Record<string, unknown> }[]) {
      if (b.type === 'text' && b.text?.trim()) pasos.push({ tipo: 'dice', texto: corto(b.text, 400) });
      if (b.type === 'tool_use' && b.name) pasos.push({ tipo: 'hace', texto: queHace(b.name, b.input ?? {}) });
    }
  }
  return pasos.slice(-max);
}

/**
 * Lo que el director tiene corriendo ahora, de su registro en stream-json: la última herramienta que pidió sin su
 * resultado todavía (una orden larga, como las pruebas, o un ayudante), o lo que espera en segundo plano (un flujo, un
 * ayudante); null si nada. Mientras corre, su registro no crece, y eso no es estar parado: es avance (propuesta aceptada
 * «Cada proceso, a la vista», pr_procesos_vista, punto 2, «avance real, no solo actividad»). Pura.
 */
export function herramientaEnCurso(registro: string): string | null {
  const pedidas = new Map<string, string>();
  const respondidas = new Set<string>();
  let fondo: string[] = [];
  for (const linea of registro.split('\n')) {
    if (!linea.startsWith('{')) continue;
    let ev: { type?: string; subtype?: string; tasks?: unknown; message?: { content?: unknown } };
    try { ev = JSON.parse(linea); } catch { continue; }
    if (ev.type === 'system' && ev.subtype === 'background_tasks_changed') fondo = Array.isArray(ev.tasks) ? (ev.tasks as { description?: unknown }[]).map((x) => corto(x?.description ?? 'un trabajo en segundo plano', 90)) : [];
    if (ev.type === 'result') pedidas.clear();
    if (!Array.isArray(ev.message?.content)) continue;
    for (const b of ev.message.content as { type?: string; id?: string; tool_use_id?: string; name?: string; input?: Record<string, unknown> }[]) {
      if (ev.type === 'assistant' && b.type === 'tool_use' && b.id && b.name) pedidas.set(b.id, queHace(b.name, b.input ?? {}));
      if (ev.type === 'user' && b.type === 'tool_result' && b.tool_use_id) respondidas.add(b.tool_use_id);
    }
  }
  const sinResultado = [...pedidas].filter(([id]) => !respondidas.has(id)).map(([, que]) => que);
  if (sinResultado.length) return sinResultado.at(-1)!;
  return fondo.length ? `Espera en segundo plano: «${fondo[0]}»${fondo.length > 1 ? ` y ${fondo.length - 1} más` : ''}` : null;
}

/** Lo que tiene corriendo ahora el director de un proyecto (herramientaEnCurso), de su último registro. */
export function enCursoDeProyecto(raiz: string, proyecto: string): string | null {
  const archivo = ultimoRegistro(raiz, proyecto);
  try {
    return archivo ? herramientaEnCurso(readFileSync(archivo, 'utf-8')) : null;
  } catch {
    return null;
  }
}

const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
const sumaUso =(u: Record<string, unknown>) => n(u.input_tokens) + n(u.cache_creation_input_tokens) + n(u.cache_read_input_tokens) + n(u.output_tokens);
/**
 * Los tokens de todos los modelos de la sesión (`modelUsage` del evento `result`, sumado desde que empezó: el director,
 * sus ayudantes, sus flujos y lo de Claude Code por dentro), o null si no los trae. El `usage` del mismo evento es solo lo
 * del director en su último turno: con un flujo o un ayudante en segundo plano, una revisión tiene varios.
 */
const sumaModelos = (m: unknown): number | null => {
  const usos = m && typeof m === 'object' ? Object.values(m as Record<string, Record<string, unknown> | null>).filter((u) => u && typeof u === 'object') : [];
  return usos.length ? usos.reduce((s, u) => s + n(u!.inputTokens) + n(u!.cacheCreationInputTokens) + n(u!.cacheReadInputTokens) + n(u!.outputTokens), 0) : null;
};
/** La clave del total exacto, el del evento `result` (no es el id de ninguna respuesta). */
const RESULTADO = '·resultado';

/**
 * Los tokens que lleva el director, de su registro en stream-json, para verlos subir mientras revisa (propuesta «Los
 * tokens del director, en vivo», aceptada el 21 de octubre de 2026): cada respuesta del modelo trae los suyos (lo que lee,
 * lo que toma de la caché y lo que escribe), repetidos en cada parte de la respuesta y con lo escrito un poco atrasado, así
 * que se cuenta una vez por respuesta, con lo más que haya dicho. Al terminar, el total exacto del evento `result`, el
 * mismo de «Lo que gastó». Se suma a lo ya contado (`porRespuesta`), para leer el registro de a pedazos.
 */
export function usoDe(registro: string, porRespuesta: Map<string, number> = new Map()): Map<string, number> {
  for (const linea of registro.split('\n')) {
    if (!linea.startsWith('{')) continue;
    let ev: { type?: string; usage?: Record<string, unknown>; modelUsage?: unknown; message?: { id?: string; usage?: Record<string, unknown> } };
    try { ev = JSON.parse(linea); } catch { continue; }
    if (ev.type === 'assistant' && ev.message?.id && ev.message.usage) porRespuesta.set(ev.message.id, Math.max(porRespuesta.get(ev.message.id) ?? 0, sumaUso(ev.message.usage)));
    if (ev.type === 'result' && (ev.modelUsage || ev.usage)) porRespuesta.set(RESULTADO, sumaModelos(ev.modelUsage) ?? sumaUso(ev.usage ?? {}));
  }
  return porRespuesta;
}

/** El total de lo contado: el exacto, si ya terminó; si no, la suma de cada respuesta. */
export function tokensDe(porRespuesta: Map<string, number>): number {
  return porRespuesta.get(RESULTADO) ?? [...porRespuesta.values()].reduce((s, x) => s + x, 0);
}

/** Lo que se lleva leído de cada registro: así cada consulta lee solo lo nuevo, y nada del principio se pierde. */
const leidos = new Map<string, { hasta: number; hastaPrimero: number; primeroCerrado: boolean; pasos: PasoRevision[]; uso: Map<string, number>; usos: Map<string, string>; negados: string[]; auto: EnVivo; turnos: LecturaDeTurnos }>();

/** Lo nuevo de un archivo desde `hasta`, solo hasta su última línea completa (la que aún se escribe se lee después), y cuánto avanzó; null si no hay. */
function lineasNuevas(archivo: string, hasta: number): { texto: string; avanza: number } | null {
  let tam: number;
  try {
    tam = statSync(archivo).size;
  } catch {
    return null;
  }
  if (tam <= hasta) return null;
  const fd = openSync(archivo, 'r');
  try {
    const buf = Buffer.alloc(tam - hasta);
    readSync(fd, buf, 0, buf.length, hasta);
    const fin = buf.lastIndexOf(0x0a);
    return fin < 0 ? null : { texto: buf.subarray(0, fin).toString('utf-8'), avanza: fin + 1 };
  } finally {
    closeSync(fd);
  }
}

/** Cuántos pasos se muestran, como mucho: una revisión entera cabe de sobra. */
const MAX_PASOS = 2000;

/**
 * Lo que va haciendo el director en la revisión que lanzó el Studio para un proyecto (su último registro), de principio
 * a fin: recargar la página no lo reinicia, solo una revisión nueva.
 */
export function progresoDeProyecto(raiz: string, proyecto: string, aparte?: Aparte['tipo']): PasoRevision[] {
  const archivo = ultimoRegistro(raiz, proyecto, aparte);
  if (!archivo) return [];
  const carpeta = join(raiz, '.revisiones');
  let leido = leidos.get(archivo);
  if (!leido) {
    // Una revisión nueva de este proyecto (o una urgencia nueva): lo de la anterior del mismo tipo ya no hace falta
    const prefijo = join(carpeta, `${proyecto}-${aparte ? `${aparte}-` : ''}`);
    for (const a of leidos.keys()) if (a.startsWith(prefijo) && /^\d{4}-/.test(a.slice(prefijo.length))) leidos.delete(a);
    leido = { hasta: 0, hastaPrimero: 0, primeroCerrado: !!aparte, pasos: [], uso: new Map(), usos: new Map(), negados: [], auto: { usos: new Map() }, turnos: lecturaNueva() };
    leidos.set(archivo, leido);
  }
  // Solo lo nuevo, y hasta la última línea completa: la que aún se escribe se lee en la consulta siguiente
  const nuevo = lineasNuevas(archivo, leido.hasta);
  // La conversación entera, desde su primera comunicación (nota del titular nmvybx5rctit): su primer tiempo va antes. Se lee
  // después de lo de arriba y se suma antes: si ahí viene la línea de su final, el primer tiempo ya escribió todo
  if (!leido.primeroCerrado) {
    const delPrimero = lineasNuevas(registroDelPrimerTiempo(archivo), leido.hastaPrimero);
    if (delPrimero) {
      leerTurnos(delPrimero.texto, leido.turnos);
      leido.hastaPrimero += delPrimero.avanza;
    }
    if (nuevo?.texto.includes('"primerTiempo"') || nuevo?.texto.includes('"encargo"')) leido.primeroCerrado = true;
  }
  if (!nuevo) return leido.pasos;
  leido.pasos = [...leido.pasos, ...progresoDe(nuevo.texto, Infinity, leido.auto)].slice(-MAX_PASOS);
  usoDe(nuevo.texto, leido.uso);
  negadosEnVivo(nuevo.texto, leido.usos, leido.negados);
  leerTurnos(nuevo.texto, leido.turnos);
  leido.hasta += nuevo.avanza;
  return leido.pasos;
}

/**
 * La conversación de la revisión que lanzó el Studio para un proyecto (o de lo urgente), mientras trabaja: quién le habla a
 * quién, qué le pide y cuánto tardó el otro (notas de voz del titular nmvx09it7tit y nmvx0q10ctit; turnos.ts). null sin registro.
 */
export function conversacionDeProyecto(raiz: string, proyecto: string, aparte?: Aparte['tipo']): ConversacionDeRevision | null {
  progresoDeProyecto(raiz, proyecto, aparte);
  const archivo = ultimoRegistro(raiz, proyecto, aparte);
  const leido = archivo ? leidos.get(archivo) : null;
  return leido ? conversacionDe(leido.turnos) : null;
}

/** Cuántos turnos de un lanzamiento pasado se abren, como mucho: una revisión entera cabe de sobra. */
const TOPE_TURNOS_HISTORIA = 3000;

/**
 * La conversación de un lanzamiento ya terminado, de su registro: el registro es su historia, en este computador, mientras
 * exista. null si el nombre no es el de un registro de .revisiones o ya no está.
 */
export function conversacionDeRegistro(raiz: string, nombre: string | null): ConversacionDeRevision | null {
  if (!nombre || !REGISTRO.test(nombre)) return null;
  try {
    const registro = join(raiz, REVISIONES, nombre);
    const delRegistro = readFileSync(registro, 'utf-8');
    // Con su primer tiempo, si lo tuvo (nmvybx5rctit)
    let delPrimero = '';
    try {
      delPrimero = readFileSync(registroDelPrimerTiempo(registro), 'utf-8');
    } catch {
      // sin primer tiempo, o ya no está: lo demás se ve igual
    }
    const conversacion = conversacionDe(leerRevisionEntera(delPrimero, delRegistro), TOPE_TURNOS_HISTORIA);
    // Ya terminó: nadie espera a nadie
    return { ...conversacion, espera: null };
  } catch {
    return null;
  }
}

/** El plan de la revisión en dos tiempos, como lo ve la persona: si aún planea y, ya validada, su lista de encargos. */
export interface PlanEnVivo {
  planeando: boolean;
  encargos: { id: string; que: string; hecho?: string }[] | null;
}

/**
 * El plan de la revisión que lanzó el Studio para un proyecto (pd_dos_tiempos): mientras su primer tiempo planea (su
 * registro existe y aún no termina) y, cuando lo validó el lanzador, su lista, con lo que el director va marcando hecho.
 * null si esa revisión no tiene primer tiempo. Lee solo el registro del primer tiempo y la lista, que son pequeños.
 */
export function planDeProyecto(raiz: string, proyecto: string): PlanEnVivo | null {
  const archivo = ultimoRegistro(raiz, proyecto);
  if (!archivo) return null;
  try {
    const lista = JSON.parse(readFileSync(archivoDeEncargos(archivo), 'utf-8')) as EncargoDeRevision[];
    return { planeando: false, encargos: lista.map((e) => ({ id: e.id, que: e.que, ...(e.hecho ? { hecho: e.hecho } : {}) })) };
  } catch {
    // sin lista todavía (o no la hubo): ¿planea?
  }
  try {
    // Terminó si respondió (en su reintento, solo cuenta lo de ese intento: finDelPrimerTiempo); si no respondió, pasado el
    // tope de sus intentos ya no planea (lo detuvo el Studio)
    const primero = registroDelPrimerTiempo(archivo);
    const s = statSync(primero);
    const vencido = Date.now() - (s.birthtimeMs || s.ctimeMs) > (MAX_MIN_PRIMER_TIEMPO * INTENTOS_PRIMER_TIEMPO + 1) * 60_000;
    const termino = vencido || finDelPrimerTiempo(readFileSync(primero, 'utf-8')).respuesta !== null;
    return termino ? null : { planeando: true, encargos: null };
  } catch {
    return null;
  }
}

/** Los tokens que lleva la revisión que lanzó el Studio para un proyecto (su último registro); 0 si aún no hay. */
export function tokensDeProyecto(raiz: string, proyecto: string): number {
  progresoDeProyecto(raiz, proyecto);
  const prefijo = join(raiz, '.revisiones', `${proyecto}-`);
  const ultimo = [...leidos.keys()].filter((a) => a.startsWith(prefijo) && /^\d{4}-\d\d-\d\dT[\d-]+Z\.log$/.test(a.slice(prefijo.length))).sort().at(-1);
  return ultimo ? tokensDe(leidos.get(ultimo)!.uso) : 0;
}

/**
 * Lo que se le lleva negado a la revisión que lanzó el Studio para un proyecto (su último registro), mientras trabaja:
 * el Studio lo muestra junto a «El director está revisando» (propuesta aceptada «Los permisos, al momento»).
 */
export function negadosDeProyecto(raiz: string, proyecto: string): string[] {
  progresoDeProyecto(raiz, proyecto);
  const archivo = ultimoRegistro(raiz, proyecto);
  return archivo ? [...(leidos.get(archivo)?.negados ?? [])] : [];
}

/**
 * Lo que gastó un lanzamiento del director, tal como lo devuelve Claude Code al terminar (el evento `result` del
 * stream-json): nada estimado por el Studio. Solo uso: tokens y lo que subieron los límites del plan, nunca dinero.
 */
export interface Consumo {
  cuando: string;
  proyecto: string;
  tipo: 'revision' | 'aclaracion' | 'urgencia';
  /** El modelo con que trabajó de verdad: lo dice Claude Code al empezar (el evento `init`). */
  modelo: string | null;
  /**
   * Lo que el Studio pidió al lanzarlo (`--model` y `--effort`; null: el de la cuenta). undefined en los registros de
   * antes de que el Studio lo anotara.
   */
  pedido?: { modelo: string | null; esfuerzo: string | null; cumplido?: boolean | null };
  /**
   * Tokens de entrada nuevos (con los escritos en la caché), los leídos de la caché y los de salida: de todos los modelos
   * de la sesión, si Claude Code los dice (`modelUsage`); si no, los del director (`usage`).
   */
  entrada: number;
  cache: number;
  salida: number;
  /** Cuánto lleva usado el plan en ese momento, como lo ve /usage: el último `rate_limit_event` del registro. */
  limites: Limites | null;
  /**
   * Lo que se le negó en ese lanzamiento (`permission_denials`), sin repetir: se ve en «Lo que gastó» y la bandeja se lo
   * dice al director siguiente (propuesta aceptada «Lo que se le negó al director, a la vista»). Sin negaciones, no viene.
   */
  negados?: string[];
  /**
   * Tu límite semanal al empezar y al terminar (el primer y el último aviso de límites del registro): lo que subió es la
   * parte de tu semana que gastó (consumoDelPlan.ts). No viene si Claude Code no lo informó.
   */
  semana?: SemanaDelLanzamiento;
}

/**
 * Un modelo con que trabajó un lanzamiento (nota de voz del titular del 22 de octubre de 2026: que se vea qué modelo se
 * usó para cada cosa). Lo suyo viene de `modelUsage`, que el evento `result` trae sumado de toda la sesión: el director,
 * sus ayudantes, los agentes de sus flujos y lo que Claude Code usa por dentro (WebFetch, por ejemplo, resume con un
 * modelo pequeño cada página que lee).
 */
export interface ModeloUsado {
  modelo: string;
  /** Si es el modelo con que trabajó el director (el del evento `init`). */
  principal: boolean;
  /** Tokens de entrada nuevos (con los escritos en la caché), los leídos de la caché y los de salida, como en Consumo. */
  entrada: number;
  cache: number;
  salida: number;
  /**
   * Para qué se usó, si no es el principal: lo que se le pidió a cada ayudante que trabajó con él y la fase de cada agente
   * de un flujo; si no lo usó ninguno, lo usó Claude Code por su cuenta (POR_DENTRO).
   */
  para?: string[];
}

/** Lo que usa Claude Code por su cuenta, sin que lo pida el director ni un ayudante. */
export const POR_DENTRO = 'por dentro de Claude Code';

/**
 * Los modelos con que trabajó un lanzamiento, de su registro en stream-json: el principal primero y los demás del que más
 * gastó al que menos, cada uno con para qué se usó. Vacío si no terminó con su resultado o si Claude Code no dijo los
 * modelos (`modelUsage`). Puro: sin archivos. Solo lee las líneas que pueden decir algo de esto (como negacionesDe).
 */
export function modelosDe(registro: string): ModeloUsado[] {
  let principal: string | null = null;
  let porModelo: Record<string, any> | null = null;
  // Lo que se le pidió a cada ayudante, por el id de su uso de Agent; quién trabajó con qué modelo; y si leyó páginas
  const ayudantes = new Map<string, string>();
  const usos: { modelo: string; para: string }[] = [];
  let paginas = false;
  for (const linea of registro.split('\n')) {
    if (!linea.startsWith('{')) continue;
    if (principal && !linea.includes('"modelUsage"') && !linea.includes('"workflow_progress"') && !linea.includes('"parent_tool_use_id":"') && !/"name":"(Agent|Task|WebFetch)"/.test(linea)) continue;
    let ev: any;
    try { ev = JSON.parse(linea); } catch { continue; }
    if (!principal && ev.type === 'system' && ev.subtype === 'init' && typeof ev.model === 'string') principal = ev.model;
    if (ev.type === 'assistant') {
      const padre = ev.parent_tool_use_id ? String(ev.parent_tool_use_id) : null;
      const modelo = typeof ev.message?.model === 'string' ? ev.message.model : null;
      if (!principal && !padre && modelo) principal = modelo;
      // Una respuesta de un ayudante trae el id del uso de Agent que lo lanzó
      if (padre && modelo && ayudantes.has(padre)) usos.push({ modelo, para: ayudantes.get(padre)! });
      for (const b of Array.isArray(ev.message?.content) ? ev.message.content : []) {
        if (b?.type !== 'tool_use') continue;
        if (b.name === 'WebFetch') paginas = true;
        if ((b.name === 'Agent' || b.name === 'Task') && b.id) {
          const para = corto(b.input?.description || b.input?.prompt || 'un ayudante', 80);
          ayudantes.set(String(b.id), para);
          // El modelo que se le pidió, por si sus respuestas no llegan al registro
          if (typeof b.input?.model === 'string') usos.push({ modelo: b.input.model, para });
        }
      }
    }
    // Los agentes de un flujo no escriben en el registro: el aviso de su progreso dice con qué modelo trabaja cada uno
    if (ev.type === 'system' && Array.isArray(ev.workflow_progress))
      for (const a of ev.workflow_progress)
        if (a?.type === 'workflow_agent' && typeof a.model === 'string') usos.push({ modelo: a.model, para: corto(a.phaseTitle || a.label || 'un agente de un flujo', 80) });
    if (ev.type === 'result' && ev.modelUsage && typeof ev.modelUsage === 'object') porModelo = ev.modelUsage;
  }
  if (!porModelo) return [];
  const lista = Object.entries(porModelo)
    .filter(([, u]) => u && typeof u === 'object')
    .map(([modelo, u]): ModeloUsado => {
      const esPrincipal = !!principal && trabajoConElPedido(principal, modelo);
      const para = [...new Set(usos.filter((x) => trabajoConElPedido(x.modelo, modelo)).map((x) => x.para))];
      // Sin ayudante ni flujo que lo usara, lo usó Claude Code: con páginas leídas, su modelo pequeño las resume
      const porDentro = paginas && /haiku/i.test(modelo) ? `${POR_DENTRO}, al leer páginas web` : POR_DENTRO;
      return {
        modelo,
        principal: esPrincipal,
        entrada: n(u.inputTokens) + n(u.cacheCreationInputTokens),
        cache: n(u.cacheReadInputTokens),
        salida: n(u.outputTokens),
        ...(esPrincipal ? {} : { para: para.length ? para : [porDentro] }),
      };
    });
  const suyos = (m: ModeloUsado) => m.entrada + m.cache + m.salida;
  return lista.sort((a, b) => Number(b.principal) - Number(a.principal) || suyos(b) - suyos(a));
}

/** Una ventana de los límites del plan: el porcentaje usado (0 a 100) y cuándo se renueva (ISO). */
export interface Ventana { uso: number; renueva: string | null }
export interface Limites { cincoHoras: Ventana | null; semana: Ventana | null }

/** La primera línea de cada registro: lo que el Studio pidió al lanzar al director. */
export const lineaPedido = (modelo: string | null, esfuerzo: string | null) => `${JSON.stringify({ type: 'studio', pedido: { modelo, esfuerzo } })}\n`;

/** Una ventana de `unifiedWindows` (utilization de 0 a 1, resetsAt en segundos), o null si no viene. */
function ventanaDe(w: any): Ventana | null {
  if (!w || typeof w.utilization !== 'number' || !Number.isFinite(w.utilization)) return null;
  return { uso: Math.round(w.utilization * 1000) / 10, renueva: typeof w.resetsAt === 'number' ? new Date(w.resetsAt * 1000).toISOString() : null };
}

/** Lo que dice el registro de un lanzamiento terminado, sin lo que dice su nombre. */
type ConsumoLeido = Omit<Consumo, 'cuando' | 'proyecto' | 'tipo'>;

/** El consumo de un registro en stream-json, en una sola pasada, o null si el lanzamiento no terminó con su resultado. */
export function consumoDe(registro: string): ConsumoLeido | null {
  let modelo: string | null = null;
  let pedido: Consumo['pedido'];
  let resultado: any = null;
  let ventanas: any = null;
  // El límite semanal como estaba al empezar: el primer aviso de límites que lo trae
  let primeraSemana: { uso: number; renueva: string | null } | null = null;
  for (const linea of registro.split('\n')) {
    if (!linea.startsWith('{')) continue;
    let ev: any;
    try { ev = JSON.parse(linea); } catch { continue; }
    if (!primeraSemana && ev.type === 'rate_limit_event') primeraSemana = ventanaDe(ev.rate_limit_info?.unifiedWindows?.seven_day);
    if (ev.type === 'studio' && ev.pedido) pedido = { modelo: ev.pedido.modelo ?? null, esfuerzo: ev.pedido.esfuerzo ?? null };
    if (!modelo && ev.type === 'system' && ev.subtype === 'init' && typeof ev.model === 'string') modelo = ev.model;
    if (!modelo && ev.type === 'assistant' && typeof ev.message?.model === 'string') modelo = ev.message.model;
    if (ev.type === 'rate_limit_event' && ev.rate_limit_info?.unifiedWindows) ventanas = ev.rate_limit_info.unifiedWindows;
    if (ev.type === 'result') resultado = ev;
  }
  if (!resultado) return null;
  const u = resultado.usage ?? {};
  const limites = ventanas ? { cincoHoras: ventanaDe(ventanas.five_hour), semana: ventanaDe(ventanas.seven_day) } : null;
  // Lo que subió tu límite semanal dentro del lanzamiento, de la misma ventana (si se renovó en medio, no se sabe)
  const ultimaSemana = limites?.semana ?? null;
  const semana = primeraSemana && ultimaSemana && primeraSemana.renueva === ultimaSemana.renueva ? { desde: primeraSemana.uso, hasta: ultimaSemana.uso, renueva: ultimaSemana.renueva } : null;
  // Si se pidió un modelo, si trabajó con él (null: no se pidió ninguno, o Claude Code no dijo cuál usó)
  if (pedido) pedido.cumplido = pedido.modelo && modelo ? trabajoConElPedido(pedido.modelo, modelo) : null;
  const negados = negacionesDe(registro);
  // Los tokens, de todos los modelos y de toda la sesión; `usage` es solo lo del director en su último turno
  const modelos = modelosDe(registro);
  const suma = (k: 'entrada' | 'cache' | 'salida') => modelos.reduce((s, m) => s + m[k], 0);
  return {
    modelo,
    ...(pedido ? { pedido } : {}),
    ...(negados.length ? { negados } : {}),
    ...(semana ? { semana } : {}),
    entrada: modelos.length ? suma('entrada') : n(u.input_tokens) + n(u.cache_creation_input_tokens),
    cache: modelos.length ? suma('cache') : n(u.cache_read_input_tokens),
    salida: modelos.length ? suma('salida') : n(u.output_tokens),
    limites: limites && (limites.cincoHoras || limites.semana) ? limites : null,
  };
}

/**
 * Si el modelo con que trabajó es el que se pidió. Un alias («opus») vale por cualquier versión de su familia; una
 * versión, solo por ella misma (con o sin el sufijo del contexto, «[1m]», que Claude Code puede no repetir).
 */
export function trabajoConElPedido(pedido: string, real: string): boolean {
  const base = (x: string) => x.toLowerCase().replace(/\[[^\]]*\]$/, '');
  if (!pedido.startsWith('claude-')) return base(real).startsWith(`claude-${base(pedido)}`);
  return base(real) === base(pedido);
}

/** Lo leído de cada registro: un registro terminado no cambia, así que se lee una sola vez. */
const consumos = new Map<string, { tam: number; c: Consumo | null }>();

/**
 * Lo que gastó cada lanzamiento del director en este computador que terminó con su resultado (los últimos `dias`, del más
 * nuevo al más viejo), en una sola pasada por sus registros.
 */
export function consumoDeRevisiones(raiz: string, dias = 35, ahora = Date.now()): Consumo[] {
  const carpeta = join(raiz, REVISIONES);
  if (!existsSync(carpeta)) return [];
  const consumo: Consumo[] = [];
  for (const a of readdirSync(carpeta)) {
    const m = REGISTRO.exec(a);
    if (!m) continue;
    const cuando = `${m[3]}T${m[4]}:${m[5]}:${m[6]}.${m[7]}Z`;
    if (ahora - Date.parse(cuando) > dias * 86_400_000) continue;
    const archivo = join(carpeta, a);
    const tipo = (m[2] as Consumo['tipo']) ?? 'revision';
    const tam = statSync(archivo).size;
    let leido = consumos.get(archivo);
    if (!leido || leido.tam !== tam) {
      const c = consumoDe(readFileSync(archivo, 'utf-8'));
      leido = { tam, c: c ? { cuando, proyecto: m[1], tipo, ...c } : null };
      consumos.set(archivo, leido);
    }
    if (leido.c) consumo.push(leido.c);
  }
  return consumo.sort((x, y) => y.cuando.localeCompare(x.cuando));
}

/** Si el lanzamiento no llegó a trabajar porque la cuenta no acepta el modelo elegido. */
export const fallaDelModelo = (registro: string) =>
  !/"type":"assistant"/.test(registro) &&
  registro.split('\n').some((l) => !/"subtype":"init"/.test(l) && /selected model|invalid model|model[^\n]{0,80}(not (exist|found|available)|no access|access to it)/i.test(l));

/** Si el lanzamiento no llegó a trabajar porque Claude Code no aceptó el esfuerzo elegido (`--effort`). */
export const fallaDelEsfuerzo = (registro: string) =>
  !/"type":"assistant"/.test(registro) &&
  registro.split('\n').some((l) => !/"subtype":"init"/.test(l) && /unknown option '--effort'|effort[^\n]{0,80}(invalid|not (supported|available|allowed))|invalid[^\n]{0,40}effort/i.test(l));

/** Lo que se sabe del final de un lanzamiento, además de su registro. */
export interface FinDeRevision {
  /** Lo que dijo el Studio al terminar (fin()). */
  problema?: string;
  /** Si la cortó el límite de tiempo, y cuál era (minutos, con los de más si se le dieron). */
  limite?: number;
  /** Quién la detuvo con «Detener ahora», si no cerró a tiempo y el Studio la cortó (pr_procesos_vista, punto 3). */
  detenida?: string;
  /** Si el Studio la cortó porque el director dejó de responder, y tras cuántos minutos (sinResponder). */
  sinRespuesta?: number;
  /** El código con que salió Claude Code, si se sabe. */
  codigo?: number | null;
  /** Si el proceso de Claude Code ya no existe y nadie vio cómo terminó (el servidor que lo lanzó ya no estaba). */
  muerto?: boolean;
  /** Cuándo empezó, cuándo terminó y la última vez que su registro creció (ms). */
  inicio?: number;
  fin?: number;
  ultimaActividad?: number;
  registro?: string;
}

/** Cuánto se espera, sin nada nuevo en el registro, para decir que la revisión está parada. */
export const SIN_ACTIVIDAD_MIN = 10;

/**
 * Cuánto se espera, sin nada nuevo en el registro y sin nada corriendo, para cortar al director que dejó de responder
 * (esperaba al modelo, que no contestó). Medido el 6 de noviembre de 2026 en 187 registros: sin nada corriendo, lo más
 * que el registro estuvo sin crecer fue 2,8 minutos (mientras piensa, el director sigue escribiendo su avance); 15 es más
 * de cinco veces eso. Con algo corriendo (una orden larga, un ayudante, trabajo de fondo) no se corta: eso lo cuida el límite.
 */
export const SIN_RESPUESTA_MIN = 15;

/**
 * Si el director dejó de responder: su registro no crece hace `min` minutos y no tiene nada corriendo
 * (herramientaEnCurso). Lee el registro solo si lleva ese rato quieto; sin el registro, no se sabe: false.
 */
export function sinResponder(archivo: string, ahora: number, min = SIN_RESPUESTA_MIN): boolean {
  try {
    if (ahora - statSync(archivo).mtimeMs < min * 60_000) return false;
    return !herramientaEnCurso(readFileSync(archivo, 'utf-8'));
  } catch {
    return false;
  }
}

// Los textos salen del archivo de cada idioma (pd_idiomas), al momento de hacer el reporte: el que ya se guardó queda como está
const sugerenciaPedir = () => t('revisor.sugerenciaPedir');
const sugerenciaSinFlujos = () => t('revisor.sugerenciaSinFlujos');

/**
 * Qué pasó con una revisión que no se cerró, leído de su registro en stream-json y de lo que se sabe del final: no
 * arrancó, la cuenta no aceptó el modelo o el esfuerzo, un error de la API o un límite de uso, el límite de tiempo,
 * el turno terminado esperando un flujo en segundo plano, permisos negados, o el proceso que murió. Puro: sin archivos.
 */
export function diagnosticarFalla(registro: string, f: FinDeRevision = {}): FallaRevision {
  const eventos: any[] = [];
  const textos: string[] = [];
  for (const linea of registro.split('\n')) {
    const t = linea.trim();
    if (!t) continue;
    if (!t.startsWith('{')) { textos.push(t); continue; }
    try { eventos.push(JSON.parse(t)); } catch { /* la línea que aún se escribía */ }
  }
  const arranco = eventos.some((e) => e.type === 'system' && e.subtype === 'init');
  // Un error de la API también llega como respuesta del modelo: esa no cuenta como trabajo
  const trabajo = eventos.some((e) => e.type === 'assistant' && !e.error && !e.message?.isApiErrorMessage);
  const resultados = eventos.filter((e) => e.type === 'result');
  const ultimo = resultados.at(-1);
  // Los flujos y los ayudantes que lanzó, y lo de fondo que seguía (o que Claude Code cortó) al terminar
  const usos = eventos.filter((e) => e.type === 'assistant' && Array.isArray(e.message?.content)).flatMap((e) => e.message.content).filter((b: any) => b?.type === 'tool_use');
  const flujos = usos.filter((b: any) => b.name === 'Workflow').length;
  const ayudantes = usos.filter((b: any) => b.name === 'Agent' || b.name === 'Task').length;
  // Lo de fondo, por su id: su nombre (de cualquier aviso), lo que seguía al final y lo que Claude Code cortó
  const nombres = new Map<string, string>();
  for (const e of eventos)
    if (e.type === 'system' && e.subtype === 'background_tasks_changed' && Array.isArray(e.tasks))
      for (const x of e.tasks) if (x?.task_id) nombres.set(String(x.task_id), corto(x.description ?? 'un trabajo en segundo plano', 90));
  const fondo = eventos.filter((e) => e.type === 'system' && e.subtype === 'background_tasks_changed').at(-1);
  const pendientes: string[] = Array.isArray(fondo?.tasks) ? fondo.tasks.map((x: any) => nombres.get(String(x?.task_id)) ?? 'un trabajo en segundo plano') : [];
  const idsCortados = eventos
    .filter((e) => e.type === 'system' && ((e.subtype === 'task_updated' && e.patch?.status === 'killed') || (e.subtype === 'task_notification' && /stopped|killed/.test(String(e.status)))))
    .map((e) => String(e.task_id));
  const cortados = idsCortados.length > 0 || textos.some((t) => /Background tasks still running/i.test(t));
  const esperas = usos.some((b: any) => b.name === 'ScheduleWakeup' || b.name === 'CronCreate');
  // Los permisos negados, sin repetir: la herramienta y lo que intentó (de su uso, por el id)
  const porId = new Map<string, any>(usos.map((b: any) => [String(b.id), b]));
  const idsNegados = [...new Set([
    ...eventos.filter((e) => e.type === 'system' && e.subtype === 'permission_denied').map((e) => String(e.tool_use_id)),
    ...resultados.flatMap((r) => (Array.isArray(r.permission_denials) ? r.permission_denials : [])).map((x: any) => String(x?.tool_use_id)),
  ])];
  const negados = [...new Set(idsNegados.map((id) => {
    const b = porId.get(id) ?? resultados.flatMap((r) => r.permission_denials ?? []).find((x: any) => String(x?.tool_use_id) === id);
    const nombre = b?.name ?? b?.tool_name ?? 'una herramienta';
    const que = b?.input?.command ?? b?.tool_input?.command ?? b?.input?.file_path ?? b?.tool_input?.file_path;
    return `${nombre}${que ? `: «${corto(que, 70)}»` : ''}`;
  }))].slice(0, 5);
  // Un error de la API, de la sesión o un límite de uso: lo dice el resultado, la respuesta del modelo o un texto de error
  const tipoError = eventos.filter((e) => e.type === 'assistant' && typeof e.error === 'string').map((e) => e.error as string).at(-1);
  const errorDicho = [
    ...textos.filter((t) => /error|limit|login|auth/i.test(t)),
    ...eventos.filter((e) => e.type === 'assistant' && (e.error || e.message?.isApiErrorMessage)).flatMap((e) => (e.message?.content ?? []).map((b: any) => String(b?.text ?? ''))),
    ...resultados.filter((r) => r.is_error || /^error/.test(String(r.subtype))).map((r) => String(r.result ?? r.subtype ?? '')),
  ].map((x) => x.trim()).filter(Boolean).at(-1);
  const rechazo = eventos.filter((e) => e.type === 'rate_limit_event' && e.rate_limit_info?.status === 'rejected').at(-1);
  const limiteDeUso = !!rechazo || tipoError === 'rate_limit' || (!!errorDicho && /usage limit|limit reached|rate.?limit|hit your limit|out of (extra )?usage/i.test(errorDicho));
  const sesion = tipoError === 'authentication_failed' || tipoError === 'billing_error' || (!!errorDicho && /invalid api key|\/login|not logged in|authenticat|oauth|credit balance/i.test(errorDicho));

  const duracion = f.inicio && f.fin && f.fin >= f.inicio ? Math.round((f.fin - f.inicio) / 6000) / 10 : ultimo ? Math.round(n(ultimo.duration_ms) / 6000) / 10 : null;
  const tokens = ultimo ? tokensDelResultado(ultimo) || null : null;
  const ultimos = agruparPasos(progresoDe(registro, Infinity)).slice(-5);
  const sinActividad = f.fin && f.ultimaActividad ? Math.floor((f.fin - f.ultimaActividad) / 60_000) : 0;
  const deFondoLista = pendientes.length ? pendientes : idsCortados.map((id) => nombres.get(id)).filter((x): x is string => !!x);
  const deFondo = deFondoLista.length ? t(deFondoLista.length > 1 ? 'revisor.yMas' : 'revisor.unoDeFondo', { primero: deFondoLista[0], n: deFondoLista.length - 1 }) : t(flujos ? 'revisor.flujoDeAgentes' : 'revisor.ayudante');
  const conFlujos = flujos > 0;
  const base = { duracion, tokens, ultimos, usoFlujos: flujos || ayudantes ? { flujos, ayudantes } : null, negados, cuando: new Date(f.fin ?? Date.now()).toISOString(), ...(f.registro ? { registro: f.registro } : {}) };
  const reporte = (que: string, porque: string, accion: FallaRevision['accion'] = 'pedir', sugerencia = sugerenciaPedir(), extra: Partial<FallaRevision> = {}): FallaRevision =>
    ({ que, porque, sugerencia, accion, ...base, ...extra });
  const salida = f.codigo ? t('revisor.salioConCodigo', { codigo: f.codigo }) : '';
  const loUltimo = (texto: unknown) => (texto ? t('revisor.loUltimoQueDijo', { texto: corto(texto, 160) }) : '');

  // 1. No llegó a trabajar
  if (!trabajo && (fallaDelModelo(registro) || fallaDelEsfuerzo(registro)))
    return reporte(t('revisor.noArranco'), f.problema ?? t('revisor.noAcepto', { que: t(fallaDelModelo(registro) ? 'revisor.elModelo' : 'revisor.elEsfuerzo') }), 'pedir', t('revisor.volvioAlDeTuCuenta'));
  if (!trabajo && sesion)
    return reporte(t('revisor.noArranco'), t('revisor.sinSesion', { dijo: errorDicho ? `: «${corto(errorDicho, 160)}»` : '' }), 'cuenta', t('revisor.sugerenciaLogin'));
  if (!trabajo && limiteDeUso)
    return reporte(t('revisor.noArranco'), t('revisor.limiteAlEmpezar'), 'cuenta', t('revisor.sugerenciaLimiteAlEmpezar'), renovacion(rechazo));
  if (!arranco && !trabajo)
    return reporte(t('revisor.noArranco'), `${f.problema && /no pudo lanzar|could not launch/.test(f.problema) ? f.problema : t('revisor.cerroAntes', { salida })}${textos.length ? t('revisor.loUnicoQueDijo', { texto: corto(textos.at(-1), 160) }) : t('revisor.noEscribio')}`, 'pedir', t('revisor.sugerenciaTerminal'));
  // 2. La cuenta o la API cortaron el trabajo
  if (limiteDeUso)
    return reporte(t('revisor.aMitad'), t('revisor.limiteTrabajando'), 'cuenta', t('revisor.sugerenciaLimiteTrabajando'), renovacion(rechazo));
  if (sesion || (errorDicho && ultimo?.is_error))
    return reporte(t('revisor.aMitad'), errorDicho ? t('revisor.devolvioError', { texto: corto(errorDicho, 200) }) : t('revisor.perdioSesion'), sesion ? 'cuenta' : 'pedir', t(sesion ? 'revisor.sugerenciaLogin' : 'revisor.sugerenciaPasajero'));
  // 3. La detuvo la persona con «Detener ahora» y no cerró a tiempo; la cortó el Studio porque dejó de responder; o el
  // límite de tiempo del Studio
  if (f.sinRespuesta && !f.detenida)
    return reporte(t('revisor.dejoDeResponder'), t('revisor.sinRespuestaPorque', { min: f.sinRespuesta }), 'pedir', t('revisor.sugerenciaRetomar'));
  if (f.detenida)
    return reporte(t('revisor.laDetuviste'), t('revisor.detenidaPorque', { quien: f.detenida, min: DETENER_TRAS_MIN }), 'pedir', t('revisor.sugerenciaRetomar'));
  if (f.limite) {
    // Lo que corría (una orden larga, un ayudante) no es estar parado, aunque su registro no creciera (pr_procesos_vista, punto 2)
    const corria = herramientaEnCurso(registro);
    const porque = pendientes.length
      ? t('revisor.limiteEsperando', { deFondo, min: f.limite })
      : corria && sinActividad >= SIN_ACTIVIDAD_MIN
        ? t('revisor.limiteCorria', { sin: sinActividad, corria: corria.replace(/\.$/, ''), min: f.limite })
        : sinActividad >= SIN_ACTIVIDAD_MIN
        ? t('revisor.limiteParado', { sin: sinActividad })
        : t('revisor.limiteTrabajo', { min: f.limite });
    return reporte(t('revisor.seCorto', { min: f.limite }), porque, conFlujos ? 'sin_ultracode' : 'pedir', conFlujos ? sugerenciaSinFlujos() : sugerenciaPedir());
  }
  // 4. Terminó su turno con trabajo de fondo a medias (o se lo cortaron), sin cerrar
  if (pendientes.length || cortados || (esperas && (flujos || ayudantes)))
    return reporte(t('revisor.sinCerrar'), t('revisor.turnoEsperando', { deFondo, como: t(cortados ? 'revisor.cortoSinDespertar' : 'revisor.noDesperto') }), conFlujos ? 'sin_ultracode' : 'pedir', conFlujos ? sugerenciaSinFlujos() : sugerenciaPedir());
  // 5. El proceso murió sin que nadie viera cómo
  if (f.muerto && !ultimo)
    return reporte(t('revisor.sinTerminar'), t('revisor.procesoMuerto', { hace: sinActividad ? t('revisor.ultimaActividad', { n: sinActividad }) : '' }));
  if (!ultimo)
    return reporte(t('revisor.sinTerminar'), t('revisor.cerroAMitad', { salida, dijo: loUltimo(textos.at(-1)) }));
  // 6. Terminó su turno sin cerrar: con permisos negados, o sin más
  if (idsNegados.length)
    return reporte(t('revisor.sinCerrar'), t('revisor.negados', { n: idsNegados.length, cuales: negados.length ? ` (${negados.slice(0, 2).join('; ')})` : '', dijo: loUltimo(ultimo.result) }));
  return reporte(t('revisor.sinCerrar'), t('revisor.turnoSinCerrar', { dijo: loUltimo(ultimo.result) }));
}

/**
 * El final de un lanzamiento (propuesta aceptada «Cada proceso, a la vista», pr_procesos_vista, punto 1; quién lo terminó,
 * en finDeLanzamiento.ts), de lo que se sabe al terminar (si cerró, si el Studio lo detuvo tras su cierre, si lo cortó
 * su límite, su código) y de su registro. Puro: sin archivos.
 */
export function finEscrito(registro: string, f: FinDeRevision & { cerro: boolean; trasCierre?: boolean; pidioCierre?: string }): FinEscrito {
  const minutos = f.inicio && f.fin && f.fin >= f.inicio ? Math.round((f.fin - f.inicio) / 6000) / 10 : null;
  const codigo = f.codigo ?? null;
  if (f.cerro)
    return f.trasCierre
      ? { quien: 'tras_cierre', causa: `Cerró, pero seguía vivo ${GRACIA_CIERRE_MIN} minutos después de su cierre: el Studio lo detuvo.`, minutos, codigo }
      : { quien: 'cierre', causa: f.pidioCierre ? `Cerró con lo hecho cuando ${f.pidioCierre} se lo pidió con «Detener ahora».` : 'Cerró con su cierre y terminó solo.', minutos, codigo };
  const d = diagnosticarFalla(registro, f);
  const conResultado = registro.split('\n').some((l) => l.startsWith('{') && l.includes('"type":"result"'));
  const quien: QuienTermino = f.detenida ? 'detenida' : f.sinRespuesta ? 'sin_respuesta' : f.limite ? 'limite' : d.accion === 'cuenta' ? 'cuenta' : d.que === t('revisor.noArranco') ? 'no_arranco' : conResultado ? 'claude' : 'afuera';
  return { quien, causa: d.porque, minutos, codigo };
}

/** La línea con que el Studio escribe el final en el registro del lanzamiento. */
export const lineaDeFin = (fin: FinEscrito) => `${JSON.stringify({ type: 'studio', fin })}\n`;

/** El final escrito en un registro, si lo tiene (el último, si por algo hay más de uno). */
export function finDelRegistro(registro: string): FinEscrito | null {
  let fin: FinEscrito | null = null;
  for (const linea of registro.split('\n')) {
    if (!linea.startsWith('{"type":"studio","fin"')) continue;
    try {
      const x = JSON.parse(linea).fin;
      if (esFinEscrito(x)) fin = x;
    } catch { /* una línea a medio escribir */ }
  }
  return fin;
}

/** Cuándo se renueva el límite de uso, del aviso de límites que lo rechazó (resetsAt, en segundos). */
function renovacion(rechazo: any): Partial<FallaRevision> {
  const s = rechazo?.rate_limit_info?.resetsAt;
  return typeof s === 'number' && Number.isFinite(s) ? { renueva: new Date(s * 1000).toISOString() } : {};
}

/**
 * El registro de la última revisión que lanzó el Studio para un proyecto («<proyecto>-<fecha>.log»), o null. Con
 * `aparte`, el de lo que lanza aparte: lo urgente es «<proyecto>-urgencia-<fecha>.log».
 */
function ultimoRegistro(raiz: string, proyecto: string, aparte?: Aparte['tipo']): string | null {
  const carpeta = join(raiz, '.revisiones');
  if (!existsSync(carpeta)) return null;
  // Con la fecha, «stl» no se confunde con «stl-studio»
  const prefijo = `${proyecto}-${aparte ? `${aparte}-` : ''}`;
  const ultimo = readdirSync(carpeta).filter((a) => a.startsWith(prefijo) && /^\d{4}-\d\d-\d\dT[\d-]+Z\.log$/.test(a.slice(prefijo.length))).sort().at(-1);
  return ultimo ? join(carpeta, ultimo) : null;
}

/** Cuándo empezó un registro, de su nombre («…-2026-10-21T18-37-34-899Z.log»), en ms; null si no se lee. */
export function inicioDeRegistro(archivo: string): number | null {
  const m = /(\d{4}-\d\d-\d\d)T(\d\d)-(\d\d)-(\d\d)-(\d{3})Z\.log$/.exec(archivo);
  const t = m ? Date.parse(`${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z`) : NaN;
  return Number.isFinite(t) ? t : null;
}

/** La última vez que creció el registro de la revisión en marcha de un proyecto (ISO), para ver si está parada. */
export function actividadDeProyecto(raiz: string, proyecto: string): string | null {
  const archivo = ultimoRegistro(raiz, proyecto);
  try {
    return archivo ? new Date(statSync(archivo).mtimeMs).toISOString() : null;
  } catch {
    return null;
  }
}

/** El reporte de la falla de la última revisión de un proyecto, leyendo su registro (si lo hay). */
export function fallaDeProyecto(raiz: string, proyecto: string, f: FinDeRevision = {}): FallaRevision {
  const archivo = ultimoRegistro(raiz, proyecto);
  if (!archivo) return diagnosticarFalla('', f);
  let texto = '';
  let mtime: number | undefined;
  try {
    texto = readFileSync(archivo, 'utf-8');
    mtime = statSync(archivo).mtimeMs;
  } catch {
    // se borró mientras tanto: el reporte dice lo que se sabe
  }
  return diagnosticarFalla(texto, { inicio: inicioDeRegistro(archivo) ?? undefined, fin: Date.now(), ultimaActividad: mtime, registro: relative(raiz, archivo), ...f });
}

/**
 * ¿La revisión se cerró, según el plan del proyecto? Lo que manda es `plan.revisado`, que solo escribe
 * `bandeja.ts --listo`: si es igual o posterior a cuando se lanzó (o, sin lanzar, a cuando se pidió), cerró, aunque
 * estudio.local.json no lo diga (el 21 de octubre de 2026 una revisión cerrada se mostró como fallida). Pura.
 */
export function cerroSegunPlan(revisado: string | null | undefined, r: { pedida: string; lanzada?: string }): boolean {
  const cerro = revisado ? Date.parse(revisado) : NaN;
  const desde = Date.parse(r.lanzada ?? r.pedida);
  return Number.isFinite(cerro) && Number.isFinite(desde) && cerro >= desde;
}

/** `plan.revisado` del proyecto, leído de su memoria; null si no se puede leer. */
export function revisadoDelPlan(raiz: string, proyecto: string): string | null {
  try {
    const revisado = JSON.parse(readFileSync(enDisco(raiz, rutasDe(proyecto).plan), 'utf-8'))?.revisado;
    return typeof revisado === 'string' ? revisado : null;
  } catch {
    return null;
  }
}

/** `plan.tramo` del proyecto, leído de su memoria: el tramo que sigue, como lo estimó el director; null si no está. */
function tramoDelPlan(raiz: string, proyecto: string): Tramo | null {
  try {
    const tramo = JSON.parse(readFileSync(enDisco(raiz, rutasDe(proyecto).plan), 'utf-8'))?.tramo;
    return tramo && typeof tramo === 'object' ? (tramo as Tramo) : null;
  } catch {
    return null;
  }
}

/** `plan.piezaSiguiente` del proyecto, leída de su memoria: la pieza que sigue en la cola del director; null si no está. */
function piezaDelPlan(raiz: string, proyecto: string): PiezaSiguiente | null {
  try {
    const pieza = JSON.parse(readFileSync(enDisco(raiz, rutasDe(proyecto).plan), 'utf-8'))?.piezaSiguiente;
    return pieza && typeof pieza === 'object' && Array.isArray(pieza.archivos) ? (pieza as PiezaSiguiente) : null;
  } catch {
    return null;
  }
}

/**
 * El resto del paquete listo (pd_paquete_listo), leído sin modelo: los procedimientos que nombra la bandeja, de la carpeta
 * del Studio, y las partes de los archivos de la pieza siguiente, del repositorio del proyecto. Solo rutas de adentro:
 * nunca un .env ni lo de .git, ni algo fuera de su carpeta. Lo que no se puede leer va sin texto y el director lo lee.
 */
export function paqueteListoDe(raiz: string, repositorio: string, bandeja: string, pieza: PiezaSiguiente | null): string {
  const leerDentro = (carpeta: string, ruta: string): string | null => {
    const archivo = resolve(carpeta, ruta);
    const dentro = relative(carpeta, archivo);
    if (!dentro || dentro.startsWith('..') || isAbsolute(dentro) || /(^|[\\/])\.git([\\/]|$)/.test(dentro) || /(^|[\\/])\.env/.test(dentro)) return null;
    try {
      return readFileSync(archivo, 'utf-8');
    } catch {
      return null;
    }
  };
  const procedimientos = procedimientosNombrados(bandeja).map((ruta) => ({ ruta, texto: leerDentro(raiz, ruta) }));
  return conElPaqueteListo(procedimientos, pieza, pieza ? lecturasDeLaPieza(pieza, (ruta) => leerDentro(repositorio, ruta)) : []);
}

/** Ordena versiones «1.2.10» de menor a mayor. */
export const compararVersion = (a: string, b: string) => {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
};

/** Claude Code en el PATH (el .exe; el .cmd de npm también sirve) o el que trae la app de escritorio de Claude. */
export function buscarClaude(): string | null {
  const extensiones = process.platform === 'win32' ? ['.exe', '.cmd'] : [''];
  for (const dir of (process.env.PATH ?? '').split(delimiter).filter(Boolean))
    for (const e of extensiones) if (existsSync(join(dir, 'claude' + e))) return join(dir, 'claude' + e);
  const base =
    process.platform === 'win32' ? join(process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'), 'Claude', 'claude-code')
    : process.platform === 'darwin' ? join(homedir(), 'Library', 'Application Support', 'Claude', 'claude-code')
    : null;
  if (!base || !existsSync(base)) return null;
  const exe = process.platform === 'win32' ? 'claude.exe' : 'claude';
  try {
    for (const v of readdirSync(base).filter((v) => /^\d+(\.\d+)+$/.test(v)).sort(compararVersion).reverse())
      for (const sub of ['', ...readdirSync(join(base, v))]) {
        const p = join(base, v, sub, exe);
        if (existsSync(p) && statSync(p).isFile()) return p;
      }
  } catch {
    // una carpeta que la app está actualizando: se busca en la próxima vuelta
  }
  return null;
}

const conComillas = (x: string) => (/[\s()*:&|<>^]/.test(x) ? `"${x}"` : x);
/** Un programa para escribirlo en la terminal: en PowerShell (la de Windows), una ruta entre comillas va con «&» delante. */
const comoComando = (programa: string) => {
  const p = conComillas(programa);
  return process.platform === 'win32' && p.startsWith('"') ? `& ${p}` : p;
};

/**
 * La orden que abre Claude Code en una terminal como lo lanza el Studio: en la carpeta del Studio (donde están las reglas
 * del director), con la del proyecto activo a la vista, y con el modelo y el esfuerzo de su configuración, que son los
 * que elige «Modelo y consumo» (y «Máximo», que Claude Code no guarda, con --effort max). Es una sesión de quien la abre:
 * pide permiso para lo que haga. Sin las variables de una sesión de Claude Code desde la que se haya encendido el Studio,
 * que le harían creer que está dentro de ella.
 */
export function ordenAbrirClaude(programa: string, raiz: string, repositorio: string | null, maximo = false): string {
  const q = (s: string) => `'${s.replace(/\\/g, '/').replace(/'/g, `'\\''`)}'`;
  // El .cmd de npm no corre en bash: ahí basta su nombre, porque se encontró en el PATH
  const claude = /\.cmd$/i.test(programa) ? 'claude' : q(programa);
  const otro = repositorio && resolve(repositorio) !== resolve(raiz) ? ` --add-dir ${q(repositorio)}` : '';
  return `env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT ${claude}${otro}${maximo ? ' --effort max' : ''}`;
}

/**
 * El modelo de todos los ayudantes y de los agentes de los flujos del director (decisión del titular del 24 de octubre de
 * 2026, «El paquete de cada revisión», parte 12; pd_topes_ayudantes): uno más barato que el suyo, Sonnet, con la misma
 * ventana de un millón de tokens; si el director ya trabaja con Haiku, Haiku, para que nunca salga más caro. Pura.
 */
export const modeloDeLosAyudantes = (modelo: string | null | undefined, todoConElModelo = false) =>
  // «Todo con el modelo que elegí» (pr_modelos_por_tarea, punto 4): el mismo del director, si se sabe cuál es
  todoConElModelo && modelo ? modelo : /haiku/i.test(modelo ?? '') ? 'haiku' : 'sonnet';

/**
 * Las variables con que corre Claude Code lanzado por el Studio, a partir de las del servidor. Con `registro` (la ruta
 * de su registro, solo al lanzar al director), la bandeja que él corra guarda lo que le imprime junto a ese registro
 * (paquete.ts › bandejaDelPaquete); sin él, nunca va una heredada. `modelo`: el del director, para el de sus ayudantes.
 * Pura.
 */
export function entornoDelDirector(base: NodeJS.ProcessEnv, registro?: string, modelo?: string | null, todoConElModelo = false): NodeJS.ProcessEnv {
  // Lanzado desde otra sesión de Claude Code, heredaría sus variables y creería estar dentro de ella
  const env = { ...base };
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRYPOINT;
  delete env[VARIABLE_REGISTRO];
  // Sin pantalla, Claude Code corta lo que sigue en segundo plano (un flujo de varios agentes) 10 minutos después del
  // último turno, y el director nunca lo sabe: el 21 de octubre de 2026 dos revisiones perdieron así su flujo a medias.
  // Con 0 lo espera, y el aviso de que terminó despierta al director; el límite lo pone el Studio (MAX_MIN)
  env.CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS = '0';
  // Sin los conectores de claude.ai, también por la variable (además de SIN_CONECTORES en --settings)
  env.ENABLE_CLAUDEAI_MCP_SERVERS = 'false';
  // El arranque limpio, también por sus variables (además de arranqueLimpio en --settings): sin la foto de git ni la
  // memoria automática, que cambian de un arranque a otro (pd_arranque_limpio)
  env.CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS = '1';
  env.CLAUDE_CODE_DISABLE_AUTO_MEMORY = '1';
  // Los ayudantes, acotados por el código y no por lo que el modelo decida (pd_topes_ayudantes): todos, también los de
  // los flujos, con un modelo más barato (FORCE: ni el modelo ni la definición del ayudante lo cambian), y ninguno abre
  // otros (profundidad 1). Las variables están en la referencia de Claude Code (desde la 2.1.257); el tope de gasto por
  // revisión, que se elige en «Modelo y consumo», va aparte
  env.CLAUDE_CODE_SUBAGENT_MODEL = modeloDeLosAyudantes(modelo, todoConElModelo);
  env.CLAUDE_CODE_SUBAGENT_MODEL_FORCE = '1';
  env.CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH = '1';
  if (registro) env[VARIABLE_REGISTRO] = resolve(registro);
  return env;
}

/** Si Claude Code corre dentro de una consola: el .cmd de npm, en Windows. */
const envuelto = (programa: string) => process.platform === 'win32' && /\.cmd$/i.test(programa);

/**
 * El Claude Code de verdad detrás del .cmd de npm, que solo lo llama (`"%dp0%\node_modules\@anthropic-ai\claude-code\bin\claude.exe" %*`),
 * para lanzarlo sin la consola de Windows: la consola no acepta órdenes de más de 8191 caracteres, y la del director,
 * con sus reglas de permisos (que crecen en cada revisión con lo que aprueba «Automático, vigilado»), pasó de ahí el 6 de
 * noviembre de 2026: la consola respondió «The command line is too long» y el director nunca arrancó. Lanzado directo, el
 * tope de Windows es 32 767. Un .cmd que no sea ese (otra instalación, o el de antes, que corría cli.js con node): null,
 * y se lanza como siempre, dentro de la consola.
 */
export function ejecutableDelCmd(cmd: string, leer: (archivo: string) => string = (a) => readFileSync(a, 'utf-8'), hay: (archivo: string) => boolean = existsSync): string | null {
  let texto: string;
  try {
    texto = leer(cmd);
  } catch {
    return null;
  }
  const m = texto.match(/"%~?dp0%?\\?([^"%]*claude\.exe)"/i);
  if (!m) return null;
  const exe = join(dirname(cmd), m[1]);
  return hay(exe) ? exe : null;
}

/** Si el lanzamiento pasa por la consola de Windows: el .cmd de npm cuyo Claude Code no se encontró detrás (ejecutableDelCmd). */
const porLaConsola = (programa: string) => envuelto(programa) && !ejecutableDelCmd(programa);

/**
 * Lanza Claude Code. El .cmd de npm, en Windows, solo corre dentro de una consola. `registro` y `modelo`:
 * entornoDelDirector. `extra`: variables que se suman a esas, encima.
 */
export function lanzarClaude(programa: string, args: string[], opciones: Parameters<typeof spawn>[2], registro?: string, modelo?: string | null, extra?: NodeJS.ProcessEnv, todoConElModelo = false) {
  // `extra`: lo que se suma a las variables del director (la dirección a que pregunta el gancho de permisos, si pregunta)
  const env = { ...entornoDelDirector(process.env, registro, modelo, todoConElModelo), ...extra };
  const real = envuelto(programa) ? ejecutableDelCmd(programa) : null;
  if (real) return spawn(real, args, { ...opciones, env, windowsHide: true });
  return envuelto(programa)
    ? spawn(conComillas(programa), args.map(conComillas), { ...opciones, env, shell: true, windowsHide: true })
    : spawn(programa, args, { ...opciones, env, windowsHide: true });
}

/**
 * Detiene al director con todo lo que lanzó. En Windows, matar el proceso deja vivo lo de abajo (el .cmd de npm corre
 * dentro de una consola, y Claude Code, debajo de ella): se cierra el árbol entero.
 */
export function detener(p: ReturnType<typeof spawn>): void {
  if (process.platform === 'win32' && p.pid) spawn('taskkill', ['/pid', String(p.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  else p.kill();
}

/**
 * El paquete listo (pedido pd_paquete_listo; dosTiempos.ts › MAX_MIN_BANDEJA_LISTA): la bandeja de una revisión, corrida
 * por el Studio antes de lanzar al director, sin modelo y con la ruta de su registro (así reconoce el candado que tomó el
 * lanzador y guarda lo que imprime en el paquete de la revisión). Lo que imprimió, o null si falla, sale con un código o
 * pasa de su tope: entonces el director la corre él mismo, como antes.
 */
export function correrLaBandeja(raiz: string, proyecto: string, registro: string, modelo: string | null): Promise<string | null> {
  return new Promise((listo) => {
    let salida = '';
    let fin = false;
    let tope: ReturnType<typeof setTimeout> | null = null;
    const termina = (x: string | null) => {
      if (fin) return;
      fin = true;
      if (tope) clearTimeout(tope);
      listo(x);
    };
    let q: ReturnType<typeof spawn>;
    try {
      q = spawn(process.execPath, ['tools/director/bandeja.ts', '--proyecto', proyecto], { cwd: raiz, env: entornoDelDirector(process.env, registro, modelo), stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true });
    } catch {
      return termina(null);
    }
    tope = setTimeout(() => {
      detener(q);
      termina(null);
    }, MAX_MIN_BANDEJA_LISTA * 60_000);
    q.stdout?.setEncoding('utf8');
    q.stdout?.on('data', (x: string) => (salida += x));
    q.on('error', () => termina(null));
    q.on('exit', (codigo) => termina(codigo === 0 ? salida : null));
  });
}

/** Si Claude Code no tiene sesión en este computador, cómo se inicia (una sola vez, en una terminal). */
function sinSesion(programa: string): Promise<string | null> {
  if (process.env.ANTHROPIC_API_KEY) return Promise.resolve(null);
  return new Promise((listo) => {
    let salida = '';
    const p = lanzarClaude(programa, ['auth', 'status'], { stdio: ['ignore', 'pipe', 'ignore'] });
    const limite = setTimeout(() => p.kill(), 15_000);
    p.stdout?.on('data', (x) => (salida += x));
    p.on('error', () => listo(null));
    p.on('close', () => {
      clearTimeout(limite);
      try {
        listo(JSON.parse(salida).loggedIn === false ? `Claude Code no tiene una sesión iniciada en este computador. Una sola vez, en una terminal: ${comoComando(programa)} auth login` : null);
      } catch {
        listo(null); // una versión que no responde en JSON: se intenta y, si falla, el Studio lo dice
      }
    });
  });
}

/** Lo que el asistente de instalación necesita saber de Claude Code (pd_valores_instalar): si está y si tiene sesión, y con qué orden se arregla. */
export async function sesionDeClaude(): Promise<{ ok: true } | { ok: false; falta: 'programa' | 'sesion'; orden: string }> {
  const programa = buscarClaude();
  if (!programa) return { ok: false, falta: 'programa', orden: 'npm install -g @anthropic-ai/claude-code' };
  return (await sinSesion(programa)) ? { ok: false, falta: 'sesion', orden: `${comoComando(programa)} auth login` } : { ok: true };
}

/** Lo que dice `claude --help`, para saber qué nombres acepta; null si no respondió a tiempo. No usa ningún modelo. */
function ayudaDeClaude(programa: string): Promise<string | null> {
  return new Promise((listo) => {
    let salida = '';
    const p = lanzarClaude(programa, ['--help'], { stdio: ['ignore', 'pipe', 'ignore'] });
    const limite = setTimeout(() => p.kill(), 15_000);
    p.stdout?.on('data', (x) => (salida += x));
    p.on('error', () => listo(null));
    p.on('close', () => {
      clearTimeout(limite);
      listo(salida || null);
    });
  });
}

/**
 * El director a veces se lanza con el modo que pregunta, y ese modo tuvo dos nombres (modoPermisos.ts › nombreDelModoQuePregunta):
 * se lee de la ayuda del Claude Code instalado, una vez por programa mientras el servidor esté encendido.
 */
const modosLeidos = new Map<string, string[]>();
async function modosDeClaude(programa: string): Promise<string[]> {
  const guardado = modosLeidos.get(programa);
  if (guardado) return guardado;
  const ayuda = await ayudaDeClaude(programa);
  const modos = modosDeLaAyuda(ayuda ?? '');
  // Una ayuda que no respondió no se recuerda: la próxima revisión lo vuelve a intentar
  if (ayuda) modosLeidos.set(programa, modos);
  return modos;
}
const nombreDelModoDe = async (programa: string): Promise<string> => nombreDelModoQuePregunta(await modosDeClaude(programa));

/**
 * Si el Claude Code de este computador trae el modo automático (modoPermisos.ts › admiteAutomatico), para «Cómo pide
 * permisos el director»: sin Claude Code, no.
 */
export async function automaticoDisponible(): Promise<boolean> {
  const programa = buscarClaude();
  const si = !!programa && admiteAutomatico(await modosDeClaude(programa));
  automaticoLeido = { si, cuando: Date.now() };
  return si;
}

/** Lo último que se supo del modo automático, y cuándo: la página no espera a la ayuda de Claude Code (hasta 15 segundos). */
let automaticoLeido: { si: boolean; cuando: number } | null = null;
let leyendoAutomatico = false;
/**
 * Lo último que se supo, sin esperar, para los datos de la página: la primera vez (y cada cinco minutos, por si
 * actualizaste Claude Code) lo lee aparte, y mientras tanto, null. Guardar el modo lo comprueba de verdad.
 */
export function automaticoSabido(): boolean | null {
  if ((!automaticoLeido || Date.now() - automaticoLeido.cuando > 5 * 60_000) && !leyendoAutomatico) {
    leyendoAutomatico = true;
    void automaticoDisponible().catch(() => false).finally(() => (leyendoAutomatico = false));
  }
  return automaticoLeido?.si ?? null;
}

/**
 * El turno de lanzar al director, entre todos los servidores del Studio de este computador: un archivo que se crea solo
 * si no existe (atómico), con el proceso que lo tiene. Sin él, dos servidores encendidos a la vez vieron la misma
 * revisión pedida y lanzaron dos directores sobre el mismo plan (21 de octubre de 2026). Si pasó el límite de una
 * revisión, o ya no existen ni su proceso ni el director que lanzó, está abandonado y se toma.
 */
export function tomarTurno(archivo: string, ahora = Date.now(), vive: (pid: number) => boolean = existe): boolean {
  for (let intento = 0; intento < 2; intento++) {
    try {
      writeFileSync(archivo, JSON.stringify({ pid: process.pid, cuando: new Date(ahora).toISOString() }), { flag: 'wx' });
      return true;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') return false;
      if (!turnoAbandonado(archivo, ahora, vive)) return false;
      try { unlinkSync(archivo); } catch { return false; }
    }
  }
  return false;
}

/**
 * Si el servidor que tomó el turno se reinició pero el director que lanzó sigue trabajando, el turno sigue tomado: antes
 * quedaba libre y podía lanzarse otro director a su lado. Nunca dos directores a la vez, tampoco después de un reinicio
 * (regla del titular, 22 de octubre de 2026). Solo pregunta si los procesos existen: nunca los detiene.
 */
function turnoAbandonado(archivo: string, ahora: number, vive: (pid: number) => boolean): boolean {
  try {
    const t = JSON.parse(readFileSync(archivo, 'utf-8'));
    if (!(ahora - Date.parse(t.cuando) < (MAX_MIN + 5) * 60_000)) return true;
    return !((typeof t.pid === 'number' && vive(t.pid)) || (typeof t.hijo === 'number' && vive(t.hijo)));
  } catch {
    return true;
  }
}

/** Suelta el turno, si es de este proceso. */
export function soltarTurno(archivo: string): void {
  try {
    if (JSON.parse(readFileSync(archivo, 'utf-8')).pid === process.pid) unlinkSync(archivo);
  } catch {
    // ya no estaba
  }
}

/** Si lo que se iba a lanzar sigue sin lanzar (otro servidor del Studio pudo tomarlo un instante antes). */
function sigueSinLanzar(l: Awaited<ReturnType<typeof leerLocal>>, proyecto: string, aparte?: Aparte): boolean {
  if (aparte?.tipo === 'aclaracion') return l.aclaracion?.nota === aparte.a.nota && !l.aclaracion.lanzada && !l.aclaracion.hecha;
  if (aparte?.tipo === 'urgencia') return l.urgencia?.pedida === aparte.u.pedida && !l.urgencia.lanzada && !l.urgencia.hecha;
  const r = l.revision;
  return !!r && r.proyecto === proyecto && !r.lanzada && !r.enCurso && !r.hecha && !r.error;
}

export class Revisor {
  private hijo: string | null = null;
  private espera: { proyecto: string; texto: string } | null = null;
  private esperaAnotada: string | null = null;
  private ocupado = false;
  private programa: string | null = null;
  private problema: string | null = null;
  private visto = 0;
  /** El director que corre ahora, para pedirle que cierre con lo hecho («Detener ahora»); null si ninguno. */
  private enMarcha: { proyecto: string; pedirCierre: (quien: string) => void } | null = null;
  private deteniendo: { proyecto: string; quien: string; cuando: string } | null = null;
  /**
   * Mientras dé true, no se lanza ningún director: se está midiendo el núcleo (medidor.ts › midiendo), que gasta del
   * mismo límite de la cuenta. Lo pedido espera, y el reloj de 15 segundos lo lanza cuando termine.
   */
  enPausa: () => boolean = () => false;
  /**
   * Si un reinicio del servidor ya puso otro lanzador en su lugar: este sigue vigilando al director que lanzó, pero no
   * lanza nada más. Lo pedido lo toma el nuevo, con su reloj de 15 segundos, y con el código de hoy: el 28 de octubre de
   * 2026, en una serie de revisiones seguidas, cada una la lanzaba el lanzador que vigiló a la anterior, con el código de
   * antes del reinicio, y el arreglo del número de Claude Code en Windows nunca corría (t_ver_huerfano).
   */
  retirado = false;

  /** `ajustes`: la configuración de Claude Code de donde salen el modelo y el esfuerzo (la de /model y /effort). */
  constructor(private raiz: string, private ajustes = archivoAjustesClaude()) {}

  estado(): EstadoRevisor {
    return { agente: this.programa ? 'Claude Code' : null, problema: this.problema, revisando: this.hijo, espera: this.espera, deteniendo: this.deteniendo };
  }

  /**
   * «Detener ahora» (pr_procesos_vista, punto 3; decisión del titular del 26 de octubre de 2026): le pide al director que
   * corre en ese proyecto cerrar con lo hecho y, si en DETENER_TRAS_MIN minutos no cerró, lo corta. `quien`: quien lo pide
   * (la ruta del servidor lo anota en la bitácora). Sin un director de este Studio en ese proyecto, lo dice y no hace nada;
   * `ya`: alguien lo había pedido antes.
   */
  detenerAhora(proyecto: string, quien: string): { ok: true; ya: boolean } | { ok: false; error: string } {
    const m = this.enMarcha;
    if (!m || m.proyecto !== proyecto) return { ok: false, error: t('revisor.sinDirectorAqui') };
    if (this.deteniendo?.proyecto === proyecto) return { ok: true, ya: true };
    this.deteniendo = { proyecto, quien, cuando: new Date().toISOString() };
    m.pedirCierre(quien);
    return { ok: true, ya: false };
  }

  /**
   * Lo pedido espera, y el Studio dice por qué en la cabecera (`texto`, una frase entera) y, una vez por cada causa
   * (`clave`), en la bitácora (`que`). El reloj de 15 segundos lo vuelve a intentar.
   */
  private async esperar(proyecto: string, texto: string, clave: string, que: string): Promise<void> {
    this.espera = { proyecto, texto };
    if (this.esperaAnotada === clave) return;
    this.esperaAnotada = clave;
    await anotar(this.raiz, { quien: EL_STUDIO, que, desde: 'el lanzador del director', proyecto }).catch(() => undefined);
  }

  /** Otro director tiene el candado del proyecto (pd_un_director): lo pedido espera a que cierre. */
  private esperarCandado(proyecto: string, de: Candado): Promise<void> {
    const quien = quienLoTiene(de, { estudio: this.raiz });
    return this.esperar(proyecto, `${quien}; esta empieza sola en cuanto él cierre, porque trabaja un director a la vez en cada proyecto.`, `candado|${proyecto}|${de.quien}|${de.estudio}|${de.desde}`,
      `no lanza al director: ${quien.charAt(0).toLowerCase()}${quien.slice(1)}, y trabaja un director a la vez en cada proyecto. Lo pedido espera su turno y se lanza solo cuando ese director cierre`);
  }

  /**
   * La ventana de uso de la cuenta está agotada (pr_procesos_vista, punto 4): no se lanza al director a fallar en cuanto
   * empieza; lo pedido espera a que se renueve, y entonces se lanza, porque la persona ya lo pidió.
   */
  private esperarRenovacion(proyecto: string, renueva: string): Promise<void> {
    const cuando = new Date(renueva).toLocaleString('es', { weekday: 'long', hour: 'numeric', minute: '2-digit' });
    return this.esperar(proyecto, `Tu plan de Claude llegó a su límite de uso, que se renueva el ${cuando}: esta se lanza sola entonces, en vez de empezar a fallar.`, `limite|${renueva}`,
      `no lanza al director: tu plan de Claude llegó a su límite de uso, que se renueva el ${cuando}. Lo pedido espera y se lanza cuando se renueve`);
  }

  /** Busca Claude Code y si tiene sesión: cada minuto como mucho. `agente: false` en estudio.local.json lo apaga. */
  async preparar(forzar = false): Promise<void> {
    if (!forzar && Date.now() - this.visto < 60_000) return;
    this.visto = Date.now();
    this.programa = (await leerLocal(this.raiz)).agente === false ? null : buscarClaude();
    this.problema = this.programa ? await sinSesion(this.programa) : null;
  }

  /**
   * Si hay una urgencia, una aclaración o una revisión pedida que nadie tomó, lanza al director. La urgencia va primero
   * (no puede esperar), luego la aclaración (es corta y alguien espera para seguir con su misión). Las dos esperan a una
   * revisión en marcha, que también escribe el plan. Sin modelo: solo lee estudio.local.json.
   */
  async mirar(forzar = false): Promise<void> {
    if (this.retirado || this.hijo || this.ocupado || this.enPausa()) return;
    this.ocupado = true;
    try {
      const local = await leerLocal(this.raiz);
      const r = local.revision;
      const a = local.aclaracion;
      const u = local.urgencia;
      const revisando = !!r && !r.hecha && !!(r.enCurso || r.lanzada);
      // Sin nada pedido, nada espera el candado de nadie
      if (!urgenciaActiva(u) && !(a && !a.hecha && !a.error) && !(r && !r.hecha && !r.error)) this.espera = null;
      if (urgenciaActiva(u)) {
        if (u.lanzada) {
          // Lanzada por un servidor del Studio que ya no está: pasado el límite, queda para la revisión
          // (con los minutos de más que se le dan si avanzaba: avisoAlDirector.ts)
          if (Date.now() - Date.parse(u.lanzada) > (MAX_MIN_URGENCIA + minutosDelAviso(MAX_MIN_URGENCIA) + 5) * 60_000) await this.falloUrgencia(u, `La urgencia no terminó en ${MAX_MIN_URGENCIA} minutos.`);
        } else if (!revisando) {
          await this.preparar(forzar);
          const repositorio = await leerRutaRepositorio(this.raiz, u.proyecto);
          if (!this.programa || this.problema || !repositorio) return void (await this.falloUrgencia(u, t('revisor.noPuedeLlamar')));
          return void (await this.lanzar(u.proyecto, this.programa, repositorio, { tipo: 'urgencia', u }));
        }
      }
      if (a && !a.hecha && !a.error) {
        if (a.lanzada) {
          // Lanzada por un servidor del Studio que ya no está: pasado el límite, queda para la revisión
          if (Date.now() - Date.parse(a.lanzada) > (MAX_MIN_ACLARAR + minutosDelAviso(MAX_MIN_ACLARAR) + 5) * 60_000) await this.fallo(a, `La aclaración no terminó en ${MAX_MIN_ACLARAR} minutos.`);
        } else if (!revisando) {
          // Una revisión en marcha también escribe el plan: la aclaración espera a que termine
          await this.preparar(forzar);
          const repositorio = await leerRutaRepositorio(this.raiz, a.proyecto);
          if (!this.programa || this.problema || !repositorio) return void (await this.fallo(a, t('revisor.noPuedeLlamar')));
          return void (await this.lanzar(a.proyecto, this.programa, repositorio, { tipo: 'aclaracion', a }));
        }
      }
      if (!r || r.hecha || r.error) {
        // Las revisiones seguidas, si quien lanzó la que terminó ya no está para encadenar (el Studio se reinició, por
        // ejemplo porque el director cambió su código): pasada la gracia del cierre, la cadena sigue o para aquí
        const tarde = r?.error || (r?.hecha && Date.now() - Date.parse(r.hecha) > (GRACIA_CIERRE_MIN + 2) * 60_000);
        if (r && tarde && seguidasActivas(local.seguidas, r.proyecto)) await this.seguirLaCadena(r.proyecto, ultimoRegistro(this.raiz, r.proyecto) ?? '');
        return;
      }
      if (r.lanzada) return void (await this.vigilarLanzada(r.proyecto, r.lanzada, r.limite));
      if (r.enCurso) return;
      await this.preparar(forzar);
      const repositorio = await leerRutaRepositorio(this.raiz, r.proyecto);
      if (!this.programa || this.problema || !repositorio) return;
      await this.lanzar(r.proyecto, this.programa, repositorio);
    } finally {
      this.ocupado = false;
    }
  }

  /**
   * Una revisión lanzada que este servidor no está mirando (la lanzó otro, o este antes de reiniciarse). Si Claude Code
   * ya no existe y nadie la cerró, se marca fallida en ese momento, con su reporte, sin esperar el límite; pasado el
   * límite, se da por perdida. Nunca detiene un proceso por su número: después de reiniciar el computador, ese número
   * puede ser ya de otro programa. Sin modelo: solo el turno, el registro y si los procesos existen.
   */
  private async vigilarLanzada(proyecto: string, lanzada: string, limite = MAX_MIN): Promise<void> {
    // Si el plan dice que cerró, cerró: nunca se marca fallida una revisión que corrió --listo
    if (await this.cerrarSiCerro(proyecto, { pedida: lanzada, lanzada })) return;
    const lanzado = estadoDelLanzado(join(this.raiz, '.revisiones', 'lanzando.json'), proyecto);
    if (lanzado.estado === 'muerto') {
      const problema = t('revisor.yaNoCorre');
      const falla = fallaDeProyecto(this.raiz, proyecto, { problema, muerto: true });
      // El final, escrito también aquí: el servidor que lo lanzó ya no estaba para verlo (pr_procesos_vista, punto 1)
      const suyo = ultimoRegistro(this.raiz, proyecto);
      if (suyo)
        try {
          if (!finDelRegistro(readFileSync(suyo, 'utf-8'))) appendFileSync(suyo, lineaDeFin({ quien: 'afuera', causa: falla.porque, minutos: falla.duracion, codigo: null }));
        } catch {
          // sin el registro, el reporte dice lo que se sabe
        }
      return void (await marcarLanzada(this.raiz, proyecto, `${problema}${falla.registro ? ` Lo que alcanzó a hacer quedó en ${falla.registro}.` : ''}`, falla));
    }
    if (!(Date.now() - Date.parse(lanzada) > (limite + 5) * 60_000)) return;
    const problema = t('revisor.noTermino', { min: limite });
    const falla = fallaDeProyecto(this.raiz, proyecto, { problema, limite });
    await marcarLanzada(this.raiz, proyecto, problema, falla);
  }

  /**
   * «Pedir revisiones seguidas» (pedido pd_revisiones_seguidas): al terminar una revisión, si la persona pidió la cadena
   * y sigue en marcha, lanza la siguiente a su nombre (encadenarRevision) o la para y dice por qué (siguienteDeLaCadena):
   * lo que dijo el director al cerrar (`plan.tramo`) y el uso de tu plan que dejó su registro. El único lugar donde el
   * lanzador encadena (la prueba «nadie pide una revisión solo» lo vigila); cada paso, a la bitácora.
   */
  private async seguirLaCadena(proyecto: string, registro: string): Promise<void> {
    const l = await leerLocal(this.raiz);
    let limites: { cincoHoras: number | null; semana: number | null } | null = null;
    try {
      const c = consumoDe(readFileSync(registro, 'utf-8'));
      if (c?.limites) limites = { cincoHoras: c.limites.cincoHoras?.uso ?? null, semana: c.limites.semana?.uso ?? null };
    } catch {
      // sin registro no se sabe el uso: la cadena para
    }
    const tramo = tramoDelPlan(this.raiz, proyecto);
    const paso = siguienteDeLaCadena(l.seguidas, l.revision, tramo, limites);
    if (!paso) return;
    if (!paso.sigue) {
      await pararSeguidas(this.raiz, proyecto, paso.porque);
      return void (await anotar(this.raiz, { quien: EL_STUDIO, que: `para las revisiones seguidas que pidió ${l.seguidas!.quien}: ${paso.porque}`, desde: 'el lanzador del director', proyecto }));
    }
    const minutos = limiteDelTramo(tramo, MAX_MIN);
    if (!(await encadenarRevision(this.raiz, proyecto, minutos))) return;
    await anotar(this.raiz, { quien: EL_STUDIO, que: `pide la siguiente de las revisiones seguidas que pidió ${l.seguidas!.quien} (hasta ${minutos} minutos)`, desde: ORIGENES_REVISION.seguidas, proyecto });
    void this.mirar(true).catch(() => {});
  }

  /**
   * Si el plan del proyecto dice que la revisión cerró (cerroSegunPlan), la deja `hecha` aunque estudio.local.json no
   * lo diga, y responde true: entonces no se marca fallida.
   */
  private async cerrarSiCerro(proyecto: string, r: { pedida: string; lanzada?: string }): Promise<boolean> {
    if (!cerroSegunPlan(revisadoDelPlan(this.raiz, proyecto), r)) return false;
    await marcarRevision(this.raiz, proyecto, 'hecha');
    return true;
  }

  /**
   * La aclaración no se pudo: lo dice, y el pedido (que ya está en el Buzón) espera la revisión que pida la persona. El
   * Studio nunca la pide solo (regla dura del titular, 23 de octubre de 2026).
   */
  private async fallo(a: AclaracionPedida, problema: string, falla?: FallaRevision): Promise<void> {
    await marcarAclaracion(this.raiz, a.nota, { error: problema, ...(falla ? { falla } : {}) });
    await anotar(this.raiz, { quien: EL_STUDIO, que: `no pudo ${a.comprobar ? 'comprobar' : 'aclarar'} el paso ${a.paso + 1} de ${a.mision}: ${problema} La nota espera la revisión.`, desde: 'el lanzador del director', proyecto: a.proyecto });
  }

  /** La urgencia no se pudo: lo dice, y las notas (que ya están en el Buzón) esperan la revisión que pida la persona. */
  private async falloUrgencia(u: UrgenciaPedida, problema: string, falla?: FallaRevision): Promise<void> {
    await marcarUrgencia(this.raiz, u.pedida, { error: problema, ...(falla ? { falla } : {}) });
    await anotar(this.raiz, { quien: EL_STUDIO, que: `no pudo llevar lo urgente al director: ${problema} Las notas esperan la revisión.`, desde: 'el lanzador del director', proyecto: u.proyecto });
  }

  /**
   * El primer tiempo de la revisión (pd_dos_tiempos; decisión del titular del 24 de octubre de 2026, «El paquete de cada
   * revisión», parte 12): antes del director, una sesión corta con su mismo modelo y esfuerzo medio (ESFUERZO_PRIMER_TIEMPO)
   * lee la bandeja y lo que necesite, no ejecuta nada y responde con la lista de encargos, que el código valida. `args` ya
   * trae lo que solo le deja leer. Su registro va aparte (registroDelPrimerTiempo), para que no cuente como otro
   * lanzamiento. Es un intento (planearConReintento hace el reintento): resuelve con la lista, con por qué no la hay (se
   * pasó de MAX_MIN_PRIMER_TIEMPO, no arrancó, terminó con error o no pasó la validación) o, si la persona oprimió «Detener
   * ahora» mientras planeaba, con quién lo detuvo. En el reintento (`previo`, por qué falló el anterior), su registro sigue
   * en el mismo archivo, después de su línea (lineaDeReintento).
   */
  private primerTiempo(programa: string, args: string[], registro: string, proyecto: string, minutos: number, modelo: string | null, todoConElModelo: boolean, bandeja: string | null = null, intento = 1, previo: string | null = null): Promise<IntentoDelPrimerTiempo> {
    const archivo = registroDelPrimerTiempo(registro);
    const inicio = Date.now();
    return new Promise((listo) => {
      const salida = openSync(archivo, 'a');
      if (previo) writeSync(salida, lineaDeReintento(intento, previo));
      // Desde aquí empieza la conversación de la revisión (nota del titular nmvybx5rctit): el Studio le pide planear
      writeSync(salida, `${JSON.stringify({ type: 'studio', encargo: { cuando: new Date().toISOString(), paraPlanear: true } })}\n`);
      let detenidaPor: string | null = null;
      let vencido = false;
      let terminado = false;
      let tope: ReturnType<typeof setTimeout> | null = null;
      const termina = (problema?: string) => {
        if (terminado) return;
        terminado = true;
        if (tope) clearTimeout(tope);
        if (this.enMarcha?.proyecto === proyecto) this.enMarcha = null;
        try {
          closeSync(salida);
        } catch {
          // ya estaba cerrado
        }
        if (detenidaPor) return listo({ detenida: detenidaPor });
        let texto = '';
        try {
          texto = readFileSync(archivo, 'utf-8');
        } catch {
          // sin su registro no hay lista: la revisión sigue en un solo tiempo
        }
        const f = finDelPrimerTiempo(texto);
        const cuenta = { minutos: f.minutos ?? Math.round((Date.now() - inicio) / 6000) / 10, tokens: f.tokens };
        const leida = encargosDeLaRespuesta(f.respuesta, f.ventana ? { ...VENTANAS, director: f.ventana } : VENTANAS);
        // Una lista válida vale aunque Claude Code saliera con un código; pasado su tope, no
        if (vencido || 'errores' in leida) {
          const porque = vencido ? `se pasó de sus ${MAX_MIN_PRIMER_TIEMPO} minutos` : problema ?? (leida as { errores: string[] }).errores.slice(0, 3).join(' ');
          return listo({ porque, escrito: { ok: false, porque, ...cuenta } });
        }
        listo({ encargos: leida.encargos, escrito: { ok: true, encargos: leida.encargos.length, ...cuenta } });
      };
      let q: ReturnType<typeof lanzarClaude>;
      try {
        q = lanzarClaude(programa, args, { cwd: this.raiz, stdio: ['pipe', salida, salida] }, registro, modelo, undefined, todoConElModelo);
      } catch (e) {
        return termina(`no arrancó (${(e as Error).message})`);
      }
      q.stdin?.on('error', () => undefined);
      q.stdin?.end(encargoDelPrimerTiempo(proyecto, minutos, bandeja, previo));
      // «Detener ahora» mientras planea: no hay nada que cerrar, así que se detiene ya y el director no se lanza
      this.enMarcha = { proyecto, pedirCierre: (quien: string) => {
        detenidaPor = quien;
        detener(q);
      } };
      tope = setTimeout(() => {
        vencido = true;
        detener(q);
      }, MAX_MIN_PRIMER_TIEMPO * 60_000);
      q.on('error', (e) => termina(`no arrancó (${e.message})`));
      q.on('exit', (codigo) => termina(codigo ? `terminó con el código ${codigo}` : undefined));
    });
  }

  /**
   * La persona oprimió «Detener ahora» mientras el primer tiempo planeaba: el director no se lanza, y la revisión termina
   * ahí, sin nada hecho, con su final escrito, su reporte y la bitácora, como cualquiera que se detiene (nunca en silencio).
   */
  private async detenidaAlPlanear(proyecto: string, quien: string, l: { archivo: string; registro: number; turno: string; candado: string | null; inicio: number }): Promise<void> {
    const problema = `${quien} oprimió «Detener ahora» mientras el director planeaba la revisión: no se lanzó, y no cambió nada.`;
    let texto = '';
    try {
      texto = readFileSync(l.archivo, 'utf-8');
      writeSync(l.registro, lineaDeFin(finEscrito(texto, { cerro: false, detenida: quien, pidioCierre: quien, codigo: null, problema, inicio: l.inicio, fin: Date.now() })));
    } catch {
      // sin el registro, el reporte dice lo que se sabe
    }
    closeSync(l.registro);
    try {
      guardarLineasDeRevision(this.raiz, [l.archivo]);
    } catch {
      // se escribe en la poda siguiente
    }
    this.hijo = null;
    if (this.deteniendo?.proyecto === proyecto) this.deteniendo = null;
    soltarTurno(l.turno);
    soltarCandado(l.candado, { estudio: this.raiz, registro: l.archivo });
    const falla = diagnosticarFalla(texto, { problema, codigo: null, inicio: l.inicio, fin: Date.now(), registro: relative(this.raiz, l.archivo), detenida: quien });
    await marcarLanzada(this.raiz, proyecto, problema, falla);
    await anotar(this.raiz, { quien: EL_STUDIO, que: `no lanza al director: ${problema}`, desde: `el lanzador del director (registro ${relative(this.raiz, l.archivo)})`, proyecto }).catch(() => undefined);
    await this.seguirLaCadena(proyecto, l.archivo);
  }

  private async lanzar(proyecto: string, programa: string, repositorio: string, aparte?: Aparte): Promise<void> {
    const carpeta = join(this.raiz, '.revisiones');
    mkdirSync(carpeta, { recursive: true });
    // Un director a la vez en este computador, aunque haya dos servidores del Studio encendidos
    const turno = join(carpeta, 'lanzando.json');
    if (!tomarTurno(turno)) return;
    const antes = await leerLocal(this.raiz);
    if (!sigueSinLanzar(antes, proyecto, aparte)) return soltarTurno(turno);
    // Con la ventana de uso de la cuenta agotada, lanzarlo es verlo fallar al empezar: lo pedido espera a que se renueve
    const agotada = ventanaAgotadaDe(carpeta);
    if (agotada) {
      soltarTurno(turno);
      return void (await this.esperarRenovacion(proyecto, agotada.renueva));
    }
    // Los registros de más de quince días salen antes de escribir el nuevo (DIAS_REGISTROS); si falla, se lanza igual
    await podarRegistros(this.raiz, carpeta, proyecto).catch(() => undefined);
    // Pedida de nuevo después de una que no se cerró: retoma lo que esa dejó (la bandeja lo lista)
    const reintento = !aparte && !!antes.revision?.reintento;
    // La de una aclaración o una urgencia lleva su nombre: así no se confunde con el registro de la revisión (progresoDeProyecto)
    const archivo = join(carpeta, `${proyecto}-${aparte ? `${aparte.tipo}-` : ''}${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
    const registro = openSync(archivo, 'a');
    // El modelo y el esfuerzo de Claude Code (los de /model y /effort, que también se eligen en «Modelo y consumo»): se pasan
    // explícitos para que el registro diga qué se pidió
    // («Máximo», que Claude Code no guarda, lo recuerda el Studio: conMaximo)
    const maximo = (await leerLocal(this.raiz)).esfuerzoMaximo === true;
    const { modelo, esfuerzo, ultracode } = conMaximo(await leerAjustesClaude(this.ajustes), maximo);
    // Lo pedido va primero en el registro: así el Studio compara con el modelo con que de verdad trabajó
    writeSync(registro, lineaPedido(modelo, esfuerzo));
    // Sin ultracode aunque tus sesiones lo tengan, salvo que el titular le haya dado ese permiso (ajustesDelDirector): en
    // un archivo y no en el argumento, porque las comillas del JSON no pasan bien por la consola de Windows
    // Con tus ajustes de usuario de Claude Code o sin ellos, como elegiste en «Modelo y consumo» (fuentesDelDirector)
    const elegido = await leerLocal(this.raiz);
    const propios = elegido.ajustesPropios !== false;
    // Cómo pide permisos el director, como elegiste en «Modelo y consumo» (modoPermisos.ts): solo lo autorizado, que es lo de
    // siempre, o «Me pregunta en el Studio»
    // o «Automático, vigilado», que vuelve a lo autorizado si el Claude Code de hoy no lo trae (lo dice la bitácora)
    const modoElegido = elegido.modoPermisos ?? 'autorizado';
    const sinAutomatico = modoElegido === 'automatico' && !admiteAutomatico(await modosDeClaude(programa));
    const modoPermisos = sinAutomatico ? 'autorizado' : modoElegido;
    // Sin tus ajustes, las claves que elegiste conservar, una por una (conservadosDeTusAjustes), y de las que aparecieron
    // después, lo recomendado hasta que confirmes: debajo de las del Studio, que mandan, y nunca las que le darían un permiso.
    // Preguntando en el Studio no se cargan nunca (tus hooks correrían junto al del Studio): si los cargabas completos, se
    // llevan todos (todosDeTusAjustes), sin tus hooks
    const conservados = propios && modoPermisos !== 'pregunta' ? {} : await (propios ? todosDeTusAjustes(this.ajustes) : conservadosDeTusAjustes(elegido.ajustesConservados ?? [], this.ajustes, elegido.ajustesVistos)).catch(() => ({}));
    const ajustes = join(carpeta, 'ajustes-del-director.json');
    const entradaDePermisos = { ultracode, permitidoUltracode: elegido.permisos?.ultracode === true, home: homedir(), propios, conservados, archivo: ajustes, gancho: rutaDelGancho(this.raiz), modoQuePregunta: modoPermisos === 'pregunta' ? await nombreDelModoDe(programa) : 'default' };
    const permisos = permisosDelModo(modoPermisos, entradaDePermisos);
    // La cuenta de GitHub del proyecto (cuentaGit.ts): al lanzarlo se compara con lo que dice GitHub; si no es la aprobada, se
    // le niegan las órdenes de red, en cualquier modo. Donde los ganchos pueden correr solos, también en el momento de cada una
    const cuentaAprobada = elegido.cuentasGit?.[proyecto];
    const cuentaGit = await cuentaAlLanzar(cuentaAprobada, repositorio);
    if (cuentaGit && !cuentaGit.ok) await anotar(this.raiz, { quien: EL_STUDIO, que: `le niega al director subir, bajar y publicar: ${mensajeDeCuenta(cuentaGit)}`, desde: `el lanzador del director (registro ${relative(this.raiz, archivo)})`, proyecto }).catch(() => undefined);
    const conCuenta = (texto: string) => (cuentaGit && puedeConGancho(modoPermisos, propios) ? conGanchoDeCuenta(texto, rutaDelGanchoDeCuenta(this.raiz)) : texto);
    // Las reglas del Studio, explícitas: el lanzador las pasa, en vez de esperar que Claude Code las cargue solo (nucleoExplicito)
    const archivoNucleo = join(carpeta, 'nucleo-del-director.md');
    // Con las reglas de autor, solo en la copia de desarrollo (ajustesClaude.ts › ARCHIVO_AUTOR; nmw5gt698tit)
    const reglasDeAutor = join(this.raiz, ARCHIVO_AUTOR);
    const autor = elegido.copiaDeDesarrollo && existsSync(reglasDeAutor) ? readFileSync(reglasDeAutor, 'utf-8') : null;
    writeFileSync(archivoNucleo, textoDelNucleo(readFileSync(join(this.raiz, 'CLAUDE.md'), 'utf-8'), autor));
    const nucleo = nucleoExplicito(this.raiz, archivoNucleo);
    // Las skills del proyecto que no autorizaste con su huella de hoy, apagadas en todo lo que se lanza (pr_skills_cierre):
    // una skill ajena no le da al director un permiso que no le diste
    const apagadas = skillsApagadas(repositorio, this.raiz, proyecto, elegido.permisos?.skills);
    if (apagadas.length) await anotar(this.raiz, { quien: EL_STUDIO, que: `apaga ${apagadas.length === 1 ? 'una skill' : `${apagadas.length} skills`} del proyecto sin autorizar en este computador: ${apagadas.join(', ')}`, desde: `el lanzador del director (registro ${relative(this.raiz, archivo)})`, proyecto }).catch(() => undefined);
    writeFileSync(ajustes, conCuenta(conSkillsApagadas(conNucleoExplicito(permisos.ajustes, this.raiz), apagadas)));
    // dontAsk: lo que no está en la lista se niega sin preguntar (nadie está mirando para responder); las esperas
    // programadas no piden permiso, así que se quitan aparte (SIN_ESPERAS). Con «Me pregunta en el Studio» corre en el modo
    // que pregunta, y lo que falta lo pregunta el gancho del Studio. En stream-json, el
    // registro tiene cada paso a medida que ocurre: el Studio lo resume en vivo (progresoDe)
    // La cola de diagnósticos solo la atiende la revisión (no una aclaración ni una urgencia): el director recibe, solo en
    // esta revisión, permiso sobre esos proyectos (propuesta aceptada «La cola de diagnósticos, con los permisos de hoy»).
    // Si no se pudo calcular, va sin cola (cerrado): el encargo no la nombra y la bandeja le dice que no tiene permiso.
    // Como carpeta de trabajo, de cada proyecto de la cola solo su memoria (donde hace sus commits): leer su repositorio
    // ya lo da la regla Read, y las órdenes de git (add, commit, mv, rm) no se acotan por carpeta
    const cola = aparte ? [] : await colaDeLaRevision(this.raiz, proyecto).catch(() => [] as ProyectoDeCola[]);
    // Y, si el proyecto que revisa aún no tiene su diagnóstico, leer su historial de IA (pedido pd_historial_activo); si no
    // se pudo calcular, va sin él
    const historial = aparte ? [] : await historialDelActivo(this.raiz, proyecto).catch(() => [] as string[]);
    // Lo que el titular le autorizó con una casilla, de lo que se le negó antes (nota de voz del titular nmvotdn3ftit, 26 de
    // octubre de 2026): lo de este proyecto y lo de todos, en la revisión, la urgencia y la aclaración; nunca lo que niega.
    // Con lo que nunca de cualquier carpeta (tus llaves, lo propio del Studio): una carpeta autorizada no lo abre
    const prohibidas = [...new Set([...SIN_ESPERAS, ...negado(repositorio, this.raiz, cola), ...NUNCA_SIEMPRE, ...reglasPorCuenta(cuentaGit)])];
    const autorizadas = autorizadasPara(elegido.permisos?.autorizados, proyecto, prohibidas, homedir());
    const permitidas = conAutorizadas(permitido(repositorio, permisos.flujos, this.raiz, homedir(), cola, historial), autorizadas);
    // La entrada también en stream-json: el encargo va como el primer mensaje, y la entrada sigue abierta para el aviso del
    // Studio mientras trabaja («Detener ahora» y el de su límite; avisoAlDirector.ts)
    const args = ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose', ...(modelo ? ['--model', modelo] : []), ...(esfuerzo ? ['--effort', esfuerzo] : []), ...permisos.argumentos, ...nucleo.argumentos, '--add-dir', repositorio, ...cola.map((c) => join(c.repositorio, MEMORIA)), '--disallowedTools', ...prohibidas, '--allowedTools', ...permitidas];
    // «Automático, vigilado»: lo que ya tenía, en el registro, para leer lo que Claude Code apruebe solo (aprobadosSolos.ts):
    // sus carpetas de trabajo, donde leer nunca pide permiso, son la del Studio, la del proyecto y las de la cola
    const yaPermitido = permisos.automatico ? { permitidas, carpetas: [this.raiz, repositorio, ...cola.map((c) => join(c.repositorio, MEMORIA))].map((c) => `${reglaDeRuta(c)}/**`), casa: homedir() } : null;
    if (yaPermitido) writeSync(registro, lineaAutomatico(yaPermitido));
    // Los minutos de la revisión: los que estimó el director al cerrar la anterior (plan.tramo), entre lo de siempre y
    // TOPE_MIN_TRAMO, para una ejecución larga (nota de voz del titular nmvqwclpitit, 27 de octubre de 2026)
    const minutos = aparte?.tipo === 'aclaracion' ? MAX_MIN_ACLARAR : aparte?.tipo === 'urgencia' ? MAX_MIN_URGENCIA : limiteDelTramo(tramoDelPlan(this.raiz, proyecto), MAX_MIN);
    // Un director a la vez en cada proyecto, también entre copias del Studio y con la sesión del director que corre
    // «revisa estudio» a mano (pd_un_director): si otro tiene el candado del proyecto, este no se lanza y lo pedido espera
    // su turno. Se toma aquí, justo antes de marcar y lanzar, para no dejarlo tomado si algo de antes falla
    const candado = archivoDelCandado(repositorio);
    const ahoraCandado = Date.now();
    const toma = tomarCandado(candado, { quien: 'studio', estudio: this.raiz, proyecto, tipo: aparte?.tipo ?? 'revision', desde: new Date(ahoraCandado).toISOString(), hasta: new Date(ahoraCandado + (minutos + GRACIA_CIERRE_MIN + 5) * 60_000).toISOString(), pid: process.pid, registro: archivo });
    if (!toma.tomado) {
      closeSync(registro);
      try { unlinkSync(archivo); } catch { /* el registro vacío ya no estaba */ }
      soltarTurno(turno);
      return void (await this.esperarCandado(proyecto, toma.de));
    }
    this.espera = null;
    this.hijo = proyecto;
    if (aparte?.tipo === 'aclaracion') await marcarAclaracion(this.raiz, aparte.a.nota, 'lanzada');
    else if (aparte?.tipo === 'urgencia') await marcarUrgencia(this.raiz, aparte.u.pedida, 'lanzada');
    else await marcarLanzada(this.raiz, proyecto, undefined, undefined, minutos === MAX_MIN ? undefined : minutos);
    const inicio = Date.now();
    // El paquete listo (pd_paquete_listo): en una revisión, el Studio corre la bandeja antes que nada, sin modelo, y lo que
    // imprime va dentro del encargo de los dos tiempos; si no sale bien, el director la corre él mismo, como antes
    const bandejaLista = aparte ? null : bandejaParaElEncargo(await correrLaBandeja(this.raiz, proyecto, archivo, modelo));
    if (!aparte) {
      await anotar(this.raiz, {
        quien: EL_STUDIO,
        que: bandejaLista ? `corre la bandeja antes de lanzar al director, sin modelo (${Math.ceil(bandejaLista.length / 1024)} KB, dentro del encargo)` : 'no pudo correr la bandeja antes de lanzar al director: él la corre, como antes',
        desde: `el lanzador del director (registro ${relative(this.raiz, archivo)})`,
        proyecto,
      }).catch(() => undefined);
    }
    // La revisión en dos tiempos (pd_dos_tiempos): antes del director, su primer tiempo, que solo planea, en toda revisión
    // (decisión del titular nmvxww5detit). Lee donde lee el director y corre la bandeja, nada más,
    // siempre en «Solo lo autorizado» (sin el gancho que pregunta: no hay nada que preguntar). Si no deja una lista válida,
    // se reintenta una vez, con lo que falló (planearConReintento; nota del titular nmvwig61gtit), y solo si tampoco la deja
    // el director trabaja en un solo tiempo, como antes, y la bitácora dice por qué; si la persona oprime «Detener ahora»
    // mientras planea, el director no se lanza
    let planDeLaRevision: EncargoDeRevision[] | null = null;
    if (!aparte) {
      const ajustesPrimero = join(carpeta, 'ajustes-del-primer-tiempo.json');
      const permisosPrimero = permisosDelModo('autorizado', { ...entradaDePermisos, archivo: ajustesPrimero });
      writeFileSync(ajustesPrimero, conSkillsApagadas(conNucleoExplicito(permisosPrimero.ajustes, this.raiz), apagadas));
      const soloLeer = [...permitidas.filter((r) => r.startsWith('Read(')), `Bash(node tools/director/bandeja.ts --proyecto ${proyecto})`];
      const argsPrimero = ['-p', '--output-format', 'stream-json', '--verbose', ...(modelo ? ['--model', modelo] : []), '--effort', ESFUERZO_PRIMER_TIEMPO, ...permisosPrimero.argumentos, ...nucleo.argumentos, '--add-dir', repositorio, '--disallowedTools', ...prohibidas, '--allowedTools', ...soloLeer];
      const primero = await planearConReintento(
        (intento, previo) => this.primerTiempo(programa, argsPrimero, archivo, proyecto, minutos, modelo, elegido.todoConElModelo === true, bandejaLista, intento, previo),
        (porque) => anotar(this.raiz, { quien: EL_STUDIO, que: `no dejó el plan de la revisión en su primer tiempo (${porque}): lo intenta otra vez, una sola`, desde: `el lanzador del director (registro ${relative(this.raiz, archivo)})`, proyecto }).catch(() => undefined),
      );
      if ('detenida' in primero) return void (await this.detenidaAlPlanear(proyecto, primero.detenida, { archivo, registro, turno, candado, inicio }));
      writeSync(registro, lineaDelPrimerTiempo(primero.escrito));
      if ('encargos' in primero) {
        planDeLaRevision = primero.encargos;
        writeFileSync(archivoDeEncargos(archivo), `${JSON.stringify(planDeLaRevision, null, 2)}\n`, 'utf8');
        // El segundo tiempo arranca solo con las skills que nombra su plan (skillsDelSegundoTiempo); sin plan, como hoy
        writeFileSync(ajustes, conCuenta(conSkillsApagadas(conSkillsDelPlan(conNucleoExplicito(permisos.ajustes, this.raiz), skillsDelPlan(planDeLaRevision), skillsDisponibles([this.raiz, repositorio, homedir()])), apagadas)));
      }
      await anotar(this.raiz, {
        quien: EL_STUDIO,
        que: 'encargos' in primero
          ? `planea la revisión en su primer tiempo${primero.escrito.intentos ? ', al reintentarlo' : ''}: ${primero.encargos.length} ${primero.encargos.length === 1 ? 'encargo' : 'encargos'}, en ${primero.escrito.minutos ?? '?'} minutos`
          : `no planea la revisión en su primer tiempo, ni al reintentarlo (${primero.porque}): el director trabaja en un solo tiempo, como antes`,
        desde: `el lanzador del director (registro ${relative(this.raiz, archivo)})`,
        proyecto,
      }).catch(() => undefined);
      // Lo que tomó planear no se le quita al director: su límite empieza cuando él arranca, y el candado y la revisión lo saben
      const planeo = Math.ceil((Date.now() - inicio) / 60_000);
      renovarCandado(candado, { estudio: this.raiz, registro: archivo }, new Date(Date.now() + (minutos + GRACIA_CIERRE_MIN + 5) * 60_000).toISOString());
      await prorrogarRevision(this.raiz, proyecto, minutos + planeo).catch(() => undefined);
    }
    // «Me pregunta en el Studio»: la revisión pregunta desde ahora, con una clave que solo conoce su gancho (por la variable
    // con la dirección del servidor), y deja de preguntar al terminar el director, de la forma que sea (fin)
    const clavePermiso = permisos.pregunta ? randomUUID() : null;
    // Con su plan, el modelo de los ayudantes sale de lo que pide cada encargo (ayudantesDelPlan; pr_modelos_por_tarea),
    // salvo con «Todo con el modelo que elegí», que manda
    const ayudantes = planDeLaRevision && elegido.todoConElModelo !== true ? ayudantesDelPlan(planDeLaRevision, modeloDeLosAyudantes(modelo)) : null;
    const entornoDelPermiso = clavePermiso || ayudantes || cuentaAprobada ? { ...(clavePermiso ? { STL_PERMISO_URL: urlDelGancho(puertoDelStudio(this.raiz), clavePermiso) } : {}), ...(ayudantes ? { CLAUDE_CODE_SUBAGENT_MODEL: ayudantes } : {}), ...(cuentaAprobada ? { STL_CUENTA_GIT: cuentaAprobada } : {}) } : undefined;
    if (clavePermiso) permisosEnEspera.abrir(clavePermiso, proyecto, prohibidas, homedir(), permitidas);
    // Con la ruta de su registro: la bandeja que corra guarda junto a él lo que le imprime (el paquete de la revisión)
    let p: ReturnType<typeof lanzarClaude>;
    try {
      p = lanzarClaude(programa, args, { cwd: this.raiz, stdio: ['pipe', registro, registro] }, archivo, modelo, entornoDelPermiso, elegido.todoConElModelo === true);
    } catch (e) {
      // No arrancó: la revisión no queda «en curso» sin nadie. Se suelta todo y se marca fallida, con su porqué, para
      // retomarla (antes la falla subía sin que nadie la oyera, y el Studio seguía creyendo que el director trabajaba)
      if (clavePermiso) permisosEnEspera.cerrar(clavePermiso);
      soltarCandado(candado, { estudio: this.raiz, registro: archivo });
      const problema = t('revisor.noPudoLanzar', { error: (e as Error).message });
      try {
        writeSync(registro, lineaDeFin({ quien: 'no_arranco', causa: problema, minutos: Math.round((Date.now() - inicio) / 6000) / 10, codigo: null }));
        closeSync(registro);
      } catch {
        // el registro ya se cerró
      }
      this.hijo = null;
      if (this.enMarcha?.proyecto === proyecto) this.enMarcha = null;
      soltarTurno(turno);
      if (aparte?.tipo === 'aclaracion') await this.fallo(aparte.a, problema.replace(t('revisor.laRevision'), t('revisor.laAclaracion')));
      else if (aparte?.tipo === 'urgencia') await this.falloUrgencia(aparte.u, problema.replace(t('revisor.laRevision'), t('revisor.laUrgencia')));
      else await marcarLanzada(this.raiz, proyecto, problema, fallaDeProyecto(this.raiz, proyecto, { problema }));
      return;
    }
    // Cómo termina, oído desde que existe: si muere mientras el Studio anota lo demás (el 6 de noviembre de 2026 la
    // consola rechazó la orden al instante, y su final se perdió porque se escuchaba recién al final de este lanzamiento),
    // queda guardado y se atiende en cuanto se pueda (`alSalir`, abajo). La revisión nunca queda «en curso» sin proceso
    const salida: { valor: { error: Error } | { codigo: number | null } | null } = { valor: null };
    let alSalir: (() => void) | null = null;
    p.on('error', (e) => {
      salida.valor ??= { error: e };
      alSalir?.();
    });
    p.on('exit', (codigo) => {
      salida.valor ??= { codigo };
      alSalir?.();
    });
    /** Si el proceso ya terminó aunque su aviso no haya llegado (lo mira el vigía cada 15 segundos, y «Detener ahora»). */
    const yaTermino = () => {
      if (p.exitCode === null && p.signalCode === null) return false;
      salida.valor ??= { codigo: p.exitCode };
      alSalir?.();
      return true;
    };
    // Quién es el director lanzado: si este servidor se reinicia, el siguiente sabe si sigue vivo (vigilarLanzada), y el
    // candado del proyecto, también para las otras copias del Studio y la sesión del director
    anotarHijo(turno, p.pid, proyecto, relative(this.raiz, archivo));
    anotarDirector(candado, archivo, p.pid);
    // En Windows, con el .cmd de npm, ese número es el de la consola: el de Claude Code, debajo, se anota en cuanto aparece
    if (porLaConsola(programa) && p.pid) void anotarProcesoReal(turno, candado, p.pid, proyecto, relative(this.raiz, archivo), archivo, () => p.exitCode === null);
    // A la bitácora: qué lanzó el Studio y por pedido de quién, con su botón (así se sabe siempre qué disparó una revisión)
    const pidio = antes.revision?.proyecto === proyecto ? antes.revision : null;
    await anotar(this.raiz, {
      quien: EL_STUDIO,
      que: (aparte?.tipo === 'aclaracion' ? `lanza al director para ${aparte.a.comprobar ? 'comprobar' : 'aclarar'} el paso ${aparte.a.paso + 1} de ${aparte.a.mision}, como pidió ${aparte.a.quien}`
        : aparte?.tipo === 'urgencia' ? `lanza al director solo para lo urgente que dejó ${aparte.u.quien}`
        : `lanza al director para la revisión que pidió ${pidio?.quien ?? 'alguien'} a las ${pidio?.pedida ?? '?'}${pidio?.origen ? `, con ${ORIGENES_REVISION[pidio.origen]}` : ''}`) + (permisos.pregunta ? ' (en el modo «Me pregunta en el Studio»: lo que le falte de permisos te lo pregunta)' : '')
        + (permisos.automatico ? ' (en el modo «Automático, vigilado»: lo que le falte lo decide solo Claude Code, y lo que apruebe queda en el panel de «Permisos»)' : '')
        + (sinAutomatico ? ' (con «Solo lo autorizado»: elegiste «Automático, vigilado», pero el Claude Code de este computador no lo trae)' : ''),
      desde: `el lanzador del director (registro ${relative(this.raiz, archivo)})`,
      proyecto,
    }).catch(() => undefined);
    // Con su plan, si el primer tiempo dejó uno válido (pd_dos_tiempos)
    const elEncargo = aparte?.tipo === 'aclaracion' ? (aparte.a.comprobar ? encargoComprobacion(aparte.a) : encargoAclaracion(aparte.a)) : aparte?.tipo === 'urgencia' ? encargoUrgencia(aparte.u) + conLaCuentaGit(cuentaGit)
      : encargo(proyecto, reintento, cola, historial, minutos) + conLaCuentaGit(cuentaGit) + (planDeLaRevision ? conElPlanDeLaRevision(proyecto, planDeLaRevision) + (ayudantes ? conLosAyudantesDelPlan(ayudantes) : '') : '') + (bandejaLista ? conLaBandejaLista(proyecto, bandejaLista) + paqueteListoDe(this.raiz, repositorio, bandejaLista, piezaDelPlan(this.raiz, proyecto)) : '');
    // El paquete de la revisión: el encargo, tal como se envía, junto a su registro
    try {
      writeFileSync(paqueteDeRegistro(archivo).encargo, elEncargo, 'utf8');
    } catch {
      // sin disco no hay paquete, pero el director trabaja igual
    }
    // El encargo, como el primer mensaje; la entrada sigue abierta para el aviso del Studio (avisoAlDirector.ts) y se cierra
    // cuando el director termina su turno sin nada en segundo plano: entonces Claude Code termina, como antes
    let entradaAbierta = true;
    p.stdin?.on('error', () => (entradaAbierta = false));
    // Desde aquí corre el reloj de la conversación: el Studio le da el encargo y espera al modelo (turnos.ts)
    writeSync(registro, `${JSON.stringify({ type: 'studio', encargo: { cuando: new Date().toISOString() } })}\n`);
    p.stdin?.write(mensajeDeEntrada(elEncargo));
    const cerrarEntrada = () => {
      if (!entradaAbierta) return;
      entradaAbierta = false;
      p.stdin?.end();
    };
    /** Le dice algo al director mientras trabaja, y lo deja escrito en su registro; false si ya no lo puede oír. */
    const avisar = (texto: string, que: 'detener' | 'limite' | 'prorroga'): boolean => {
      if (!entradaAbierta || !p.stdin?.writable) return false;
      try {
        p.stdin.write(mensajeDeEntrada(texto));
        writeSync(registro, `${JSON.stringify({ type: 'studio', aviso: que, cuando: new Date().toISOString() })}\n`);
        return true;
      } catch {
        return false;
      }
    };
    // Si terminó su turno sin nada en segundo plano, mirado cada 5 segundos en lo nuevo de su registro (sin leerlo entero)
    let suTurno: Turno = { termino: false, fondo: 0 };
    let leido = 0;
    const vigiaTurno = setInterval(() => {
      if (!entradaAbierta) return void clearInterval(vigiaTurno);
      const nuevo = leerDesde(archivo, leido);
      leido = nuevo.hasta;
      suTurno = leerTurno(nuevo.texto, suTurno);
      if (cerrarLaEntrada(suTurno)) {
        clearInterval(vigiaTurno);
        cerrarEntrada();
      }
    }, 5_000);
    // El límite, sin matar a ciegas (pr_procesos_vista, punto 4; tu decisión del 26 de octubre de 2026): unos minutos
    // antes, el aviso de que cierre con lo hecho; al llegar, si avanzaba, esos mismos minutos de más, una sola vez
    const avisoMin = minutosDelAviso(minutos);
    let limiteMin = minutos;
    let cortada = false;
    let cortadaSinRespuesta = false;
    let prorrogada = false;
    const avisoDelLimite = setTimeout(() => {
      if (avisar(avisoLimite(avisoMin), 'limite'))
        void anotar(this.raiz, { quien: EL_STUDIO, que: `le avisa al director que su límite llega en ${avisoMin} minutos y que cierre con lo hecho`, desde: `el lanzador del director (registro ${relative(this.raiz, archivo)})`, proyecto }).catch(() => undefined);
    }, (minutos - avisoMin) * 60_000);
    const alLimite = () => {
      let ultima: number | null = null;
      let corre: string | null = null;
      try {
        ultima = statSync(archivo).mtimeMs;
        corre = herramientaEnCurso(readFileSync(archivo, 'utf-8'));
      } catch {
        // sin el registro no se sabe si avanzaba: se corta, como siempre
      }
      if (!prorrogada && !detenidaPor && avanzaba(ultima, corre, Date.now(), SIN_ACTIVIDAD_MIN) && avisar(avisoProrroga(avisoMin), 'prorroga')) {
        prorrogada = true;
        limiteMin = minutos + avisoMin;
        limite = setTimeout(alLimite, avisoMin * 60_000);
        // Quien vigila sin haberlo lanzado (otra copia del Studio, este después de reiniciarse) lo sabe por el candado y por la revisión
        renovarCandado(candado, { estudio: this.raiz, registro: archivo }, new Date(inicio + (limiteMin + GRACIA_CIERRE_MIN + 5) * 60_000).toISOString());
        if (!aparte) void prorrogarRevision(this.raiz, proyecto, limiteMin).catch(() => undefined);
        void anotar(this.raiz, { quien: EL_STUDIO, que: `le da al director ${avisoMin} minutos más para cerrar, una sola vez: llegó su límite de ${minutos} minutos y seguía avanzando`, desde: `el lanzador del director (registro ${relative(this.raiz, archivo)})`, proyecto }).catch(() => undefined);
        return;
      }
      cortada = true;
      detener(p);
    };
    let limite = setTimeout(alLimite, minutos * 60_000);
    // El cierre es lo último: si después de cerrar sigue vivo más de la gracia (esperando a un ayudante, escribiendo otra
    // vez el plan), el Studio lo detiene y lo deja escrito en su registro. Mientras viva, no se lanza otro director ni se
    // puede pedir otra revisión
    const pedidaEn = antes.revision?.pedida ?? new Date(inicio).toISOString();
    const cerroYa = async () => {
      const l = await leerLocal(this.raiz);
      if (aparte?.tipo === 'aclaracion') return l.aclaracion?.nota === aparte.a.nota && !!l.aclaracion.hecha;
      if (aparte?.tipo === 'urgencia') return l.urgencia?.pedida === aparte.u.pedida && !!l.urgencia.hecha;
      return cerroSegunPlan(revisadoDelPlan(this.raiz, proyecto), { pedida: pedidaEn, lanzada: new Date(inicio).toISOString() });
    };
    // «Detener ahora» (pr_procesos_vista, punto 3): le pide cerrar con lo hecho y, si en DETENER_TRAS_MIN minutos no cerró, lo corta
    let detenidaPor: string | null = null;
    let cortadaPorPersona = false;
    let alDetener: ReturnType<typeof setTimeout> | null = null;
    this.enMarcha = {
      proyecto,
      pedirCierre: (quien: string) => {
        // Si ya no corre, no hay a quién pedirle que cierre: la revisión termina ya, con su porqué
        if (yaTermino()) return;
        if (detenidaPor) return;
        detenidaPor = quien;
        avisar(avisoDetener(quien), 'detener');
        alDetener = setTimeout(() => void (async () => {
          if (await cerroYa().catch(() => false)) return;
          cortadaPorPersona = true;
          detener(p);
        })(), DETENER_TRAS_MIN * 60_000);
      },
    };
    let cerroDesde: number | null = null;
    let trasCierre = false;
    const tras = setInterval(() => {
      // El vigía: si el proceso ya terminó y su final no llegó, la revisión termina aquí (nunca «en curso» sin nadie)
      if (yaTermino()) return void clearInterval(tras);
      // Y si sigue vivo pero dejó de responder (sinResponder: ni escribe ni tiene nada corriendo), se corta: la revisión
      // no queda esperando hasta su límite a un modelo que no contesta
      if (!cortadaSinRespuesta && !cortada && cerroDesde === null && sinResponder(archivo, Date.now())) {
        cortadaSinRespuesta = true;
        try {
          writeSync(registro, `${JSON.stringify({ type: 'studio', detenido: `llevaba ${SIN_RESPUESTA_MIN} minutos sin escribir nada ni tener nada corriendo` })}\n`);
        } catch {
          // el registro ya se cerró: el proceso también
        }
        void anotar(this.raiz, { quien: EL_STUDIO, que: `corta al director: llevaba ${SIN_RESPUESTA_MIN} minutos sin escribir nada en su registro ni tener nada corriendo (dejó de responder)`, desde: `el lanzador del director (registro ${relative(this.raiz, archivo)})`, proyecto }).catch(() => undefined);
        detener(p);
        return;
      }
      void (async () => {
        if (cerroDesde === null && (await cerroYa().catch(() => false))) cerroDesde = Date.now();
        if (!detenerTrasCierre(cerroDesde)) return;
        clearInterval(tras);
        trasCierre = true;
        try {
          writeSync(registro, `${JSON.stringify({ type: 'studio', detenido: `seguía vivo ${GRACIA_CIERRE_MIN} minutos después de su cierre` })}\n`);
        } catch {
          // el registro ya se cerró: el proceso también
        }
        detener(p);
      })();
    }, 15_000);
    let cerrado = false;
    const fin = async (problema: string, codigo?: number | null) => {
      if (cerrado) return;
      cerrado = true;
      clearTimeout(limite);
      clearTimeout(avisoDelLimite);
      if (alDetener) clearTimeout(alDetener);
      clearInterval(tras);
      clearInterval(vigiaTurno);
      entradaAbierta = false;
      if (this.enMarcha?.proyecto === proyecto) this.enMarcha = null;
      if (this.deteniendo?.proyecto === proyecto) this.deteniendo = null;
      // «Me pregunta en el Studio»: la revisión deja de preguntar, termine como termine. Lo que se negó sin que la persona lo
      // decidiera (no respondió, o no estaba) queda escrito en el registro, para el panel de permisos (permisoAlMomento.ts)
      if (clavePermiso)
        for (const linea of lineasDeNegadosSinDecidir(permisosEnEspera.cerrar(clavePermiso)))
          try {
            writeSync(registro, linea);
          } catch {
            // el registro ya no se puede escribir: el permiso no queda en el panel, pero la revisión cierra igual
          }
      // El final, escrito (pr_procesos_vista, punto 1): quién terminó el lanzamiento, por qué y cuánto duró de verdad, para
      // «Modelo y consumo», «Qué pasó con la revisión» y la línea de cada revisión
      try {
        const cerro = await cerroYa().catch(() => false);
        writeSync(registro, lineaDeFin(finEscrito(readFileSync(archivo, 'utf-8'), { cerro, trasCierre, ...(cortada ? { limite: limiteMin } : {}), ...(cortadaSinRespuesta ? { sinRespuesta: SIN_RESPUESTA_MIN } : {}), ...(cortadaPorPersona && detenidaPor ? { detenida: detenidaPor } : {}), ...(detenidaPor ? { pidioCierre: detenidaPor } : {}), codigo, problema, inicio, fin: Date.now() })));
      } catch {
        // sin el registro, el final no se escribe: «Qué pasó con la revisión» lo deduce como antes
      }
      closeSync(registro);
      // Su línea, para buscarla después aunque el registro se pode (pd_lineas_por_revision)
      try {
        guardarLineasDeRevision(this.raiz, [archivo]);
      } catch {
        // se escribe en la poda siguiente
      }
      // «Automático, vigilado»: lo que Claude Code aprobó solo queda en el panel de «Permisos», marcado «Lo aprobó Claude
      // Code», con el alcance de «Permitir siempre» y su casilla para quitarlo (tu elección del 26 de octubre de 2026). Si
      // no se pudo leer o guardar, la revisión cierra igual y la bitácora lo dice
      if (yaPermitido)
        try {
          const aprobados = aprobadosSolos(readFileSync(archivo, 'utf-8'), yaPermitido.permitidas, yaPermitido.carpetas, yaPermitido.casa);
          let nuevos = 0;
          await cambiarAutorizados(this.raiz, (antes) => {
            const despues = conLoAprobado(antes, aprobados, proyecto, new Date().toISOString());
            nuevos = despues.length - antes.length;
            return despues;
          });
          if (aprobados.length) await anotar(this.raiz, { quien: EL_STUDIO, que: `deja en el panel de «Permisos» lo que Claude Code aprobó solo en esta revisión: ${aprobados.map((a) => a.regla ?? a.intentos[0]).join(', ')}${nuevos ? '' : ' (ya estaba)'}`, desde: `el lanzador del director (registro ${relative(this.raiz, archivo)})`, proyecto });
        } catch (e) {
          await anotar(this.raiz, { quien: EL_STUDIO, que: `no pudo dejar en el panel de «Permisos» lo que Claude Code aprobó solo: ${(e as Error).message}`, desde: 'el lanzador del director', proyecto }).catch(() => undefined);
        }
      this.hijo = null;
      soltarTurno(turno);
      soltarCandado(candado, { estudio: this.raiz, registro: archivo });
      if (cortada) problema = t('revisor.cortadaLimite', { min: limiteMin, prorroga: prorrogada ? t('revisor.conProrroga', { min: avisoMin }) : '' });
      if (cortadaPorPersona) problema = t('revisor.detenidaCorta', { quien: String(detenidaPor), min: DETENER_TRAS_MIN });
      else if (cortadaSinRespuesta) problema = t('revisor.cortadaSinRespuesta', { min: SIN_RESPUESTA_MIN });
      // La cuenta no acepta el modelo elegido: vuelve al de siempre (también en Claude Code, que con él tampoco
      // arrancaría), y el aviso lo dice
      if (modelo && fallaDelModelo(readFileSync(archivo, 'utf-8'))) {
        await guardarModeloClaude(null, this.ajustes).catch(() => {});
        problema = t('revisor.modeloNoAceptado', { modelo: String(modelo) });
      } else if (esfuerzo && fallaDelEsfuerzo(readFileSync(archivo, 'utf-8'))) {
        await (maximo ? guardarEsfuerzoMaximo(this.raiz, false) : guardarEsfuerzoClaude(null, this.ajustes)).catch(() => {});
        problema = t('revisor.esfuerzoNoAceptado', { esfuerzo: String(esfuerzo) });
      }
      // Una aclaración o una urgencia que no se cerró, con el mismo reporte que una revisión, leído de su registro, para
      // «¿Por qué?» y «Retomarla» (pr_retoma_automatica, punto 5)
      const reporteAparte = (): FallaRevision | undefined => {
        try {
          return diagnosticarFalla(readFileSync(archivo, 'utf-8'), { problema, codigo, inicio, fin: Date.now(), ultimaActividad: statSync(archivo).mtimeMs, registro: relative(this.raiz, archivo), ...(cortada ? { limite: limiteMin } : {}), ...(cortadaSinRespuesta ? { sinRespuesta: SIN_RESPUESTA_MIN } : {}), ...(cortadaPorPersona && detenidaPor ? { detenida: detenidaPor } : {}) });
        } catch {
          return undefined;
        }
      };
      if (aparte?.tipo === 'aclaracion') {
        const a = (await leerLocal(this.raiz)).aclaracion;
        if (a?.nota === aparte.a.nota && !a.hecha) await this.fallo(a, problema.replace(t('revisor.laRevision'), t('revisor.laAclaracion')), reporteAparte());
      } else if (aparte?.tipo === 'urgencia') {
        const u = (await leerLocal(this.raiz)).urgencia;
        if (u?.pedida === aparte.u.pedida && !u.hecha) await this.falloUrgencia(u, problema.replace(t('revisor.laRevision'), t('revisor.laUrgencia')), reporteAparte());
      }
      // Lo que esperaba (otra urgencia, una aclaración o una revisión pedida mientras tanto) se lanza ya
      if (aparte) return void this.mirar().catch(() => {});
      const r = (await leerLocal(this.raiz)).revision;
      if (r?.proyecto === proyecto && !r.hecha) {
        // Si corrió --listo (el plan lo dice), cerró: se deja hecha, aunque estudio.local.json lo haya perdido
        if (await this.cerrarSiCerro(proyecto, { pedida: r.pedida, lanzada: r.lanzada ?? new Date(inicio).toISOString() })) return void (await this.seguirLaCadena(proyecto, archivo));
        // El reporte de qué pasó, leído del registro: lo muestra «¿Por qué?» (nunca una falla en silencio)
        let texto = '';
        let ultimaActividad: number | undefined;
        try {
          texto = readFileSync(archivo, 'utf-8');
          ultimaActividad = statSync(archivo).mtimeMs;
        } catch {
          // sin registro, el reporte dice lo que se sabe
        }
        const falla = diagnosticarFalla(texto, { problema, codigo, inicio, fin: Date.now(), ultimaActividad, registro: relative(this.raiz, archivo), ...(cortada ? { limite: limiteMin } : {}), ...(cortadaSinRespuesta ? { sinRespuesta: SIN_RESPUESTA_MIN } : {}), ...(cortadaPorPersona && detenidaPor ? { detenida: detenidaPor } : {}) });
        await marcarLanzada(this.raiz, proyecto, t('revisor.loQueAlcanzo', { problema, registro: relative(this.raiz, archivo) }), falla);
      }
      // Las revisiones seguidas: la siguiente, si la cadena sigue, o para con su porqué (también si esta falló)
      await this.seguirLaCadena(proyecto, archivo);
    };
    alSalir = () => {
      const s = salida.valor;
      if (!s) return;
      if ('error' in s) void fin(t('revisor.noPudoLanzar', { error: s.error.message }));
      else void fin(t('revisor.sinCerrarse', { codigo: s.codigo ? t('revisor.codigoEntre', { codigo: s.codigo }) : '' }), s.codigo);
    };
    // Si terminó mientras se preparaba lo de arriba, se atiende ya
    alSalir();
  }
}

/**
 * Lo nuevo de un registro desde el byte `desde`, hasta su última línea entera (la que aún se escribe queda para la vuelta
 * siguiente), y hasta dónde se leyó. Sin el archivo, nada.
 */
export function leerDesde(archivo: string, desde: number): { texto: string; hasta: number } {
  let fd: number | null = null;
  try {
    fd = openSync(archivo, 'r');
    const tam = statSync(archivo).size;
    if (tam <= desde) return { texto: '', hasta: desde };
    const buf = Buffer.alloc(tam - desde);
    const leidos = readSync(fd, buf, 0, buf.length, desde);
    const fin = buf.lastIndexOf(0x0a, leidos - 1);
    if (fin < 0) return { texto: '', hasta: desde };
    return { texto: buf.subarray(0, fin + 1).toString('utf-8'), hasta: desde + fin + 1 };
  } catch {
    return { texto: '', hasta: desde };
  } finally {
    if (fd !== null) closeSync(fd);
  }
}

/** Anota en el turno el proceso del director lanzado, su proyecto y su registro, si el turno es de este servidor. */
function anotarHijo(turno: string, hijo: number | undefined, proyecto: string, registro: string): void {
  if (!hijo) return;
  try {
    const t = JSON.parse(readFileSync(turno, 'utf-8'));
    if (t.pid === process.pid) writeFileSync(turno, JSON.stringify({ ...t, hijo, proyecto, registro }));
  } catch {
    // sin turno: no hay a quién anotar
  }
}

/**
 * El número real de Claude Code, en el turno y en el candado del proyecto, cuando corre dentro de la consola del .cmd de
 * npm (pedido pd_un_director): así, si este servidor se reinicia, o si alguien cierra la consola, un director que quedó
 * sin quién lo vigile cuenta como vivo y no se lanza otro a su lado. `sigue`: si la envoltura no terminó mientras se
 * buscaba (si terminó, no hay nada que anotar). Devuelve el número anotado, o null.
 */
export async function anotarProcesoReal(turno: string, candado: string | null, envoltura: number, proyecto: string, registroRelativo: string, registro: string, sigue: () => boolean = () => true, leer?: () => Promise<Proceso[] | null>): Promise<number | null> {
  const real = await buscarProcesoReal(envoltura, leer);
  if (!real || !sigue()) return null;
  anotarHijo(turno, real, proyecto, registroRelativo);
  anotarDirector(candado, registro, real);
  return real;
}

/** Si un proceso existe (solo lo pregunta). EPERM: existe, pero es de otro usuario. */
const existe = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
};

/**
 * Cómo está una revisión lanzada por otro servidor del Studio (o por este antes de reiniciarse), según el turno:
 * `servidor` (quien la lanzó sigue encendido y la vigila), `director` (quien la lanzó ya no está, pero Claude Code
 * sigue trabajando), `muerto` (ninguno de los dos existe: nadie la va a cerrar) o `desconocido` (sin datos del turno).
 */
export function estadoDelLanzado(turno: string, proyecto: string, vive: (pid: number) => boolean = existe): { estado: 'servidor' | 'director' | 'muerto' | 'desconocido'; hijo?: number } {
  try {
    const t = JSON.parse(readFileSync(turno, 'utf-8'));
    if (typeof t.hijo !== 'number' || t.proyecto !== proyecto) return { estado: 'desconocido' };
    if (t.pid !== process.pid && typeof t.pid === 'number' && vive(t.pid)) return { estado: 'servidor', hijo: t.hijo };
    return { estado: vive(t.hijo) ? 'director' : 'muerto', hijo: t.hijo };
  } catch {
    return { estado: 'desconocido' };
  }
}
