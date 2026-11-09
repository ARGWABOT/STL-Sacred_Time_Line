// La pestaña «Permisos» de «Modelo y consumo»: cómo pide permisos el director, lo que se le negó y las skills de tus
// proyectos. Salió de app.ts al partir los módulos grandes (propuesta aceptada pr_partir_modulos), como «Lo que
// gasta» (vistaGasto.ts) y «Tus ajustes» (vistaAjustesPropios.ts): recibe lo que pinta y no guarda nada; pedir al
// servidor lo negado y las skills, lo marcado y los botones siguen en la página.
import { gruposEnElPanel, PAQUETE_DE_PERMISOS } from '../../src/director/asistente';
import type { ModoPermisos } from '../../src/director/proyectos';
import type { PermisoAutorizado, PermisoNegado } from '../servidor/permisosNegados';
import { icono } from './iconos';
import { lenguaje, t, type ClaveDeTexto } from './textos';
import { esc } from './util';

/**
 * Cómo pide permisos el director, con el modo de hoy (propuesta aceptada «Los permisos, al momento», lo primero que no
 * da poderes nuevos): qué puede, qué pasa cuando le falta algo y lo que nunca hace, en ningún modo. Lo que nunca es lo
 * que niega su lanzador, como regla explícita (estudio/servidor/revisor.ts › negado). Con la elección entre los dos modos
 * (pr_permisos_al_momento, pieza 4): solo lo autorizado, o «Me pregunta en el Studio».
 */
export const MODOS_DE_PERMISOS: Record<ModoPermisos, { nombre: string; que: string }> = {
  autorizado: {
    get nombre() { return t('modelo.modoAutorizado'); },
    get que() { return t('modelo.modoAutorizadoQue'); },
  },
  pregunta: {
    get nombre() { return t('modelo.modoPregunta'); },
    get que() { return t('modelo.modoPreguntaQue'); },
  },
  automatico: {
    get nombre() { return t('modelo.modoAutomatico'); },
    get que() { return t('modelo.modoAutomaticoQue'); },
  },
};

/** Lo negado y lo autorizado, como lo trae el servidor (/permisos); null mientras se busca. */
export type PanelPermisos = { pendientes: PermisoNegado[]; autorizados: PermisoAutorizado[]; error?: string } | null;

/** Una skill de un proyecto, como la trae el servidor (/skills: skillsDelProyecto.ts › revisarSkill). */
export interface SkillEnElPanel { proyecto: string; nombre: string; ruta: string; huella: string; estado: 'autorizada' | 'nueva' | 'cambio'; hallazgos: string[]; cuando?: string; quien?: string }
export type PanelSkills = { skills: SkillEnElPanel[]; error?: string } | null;

// La clave viaja en un atributo del HTML: sin caracteres de control, que el navegador cambia al leerlo (con un \u0000,
// la casilla marcada nunca coincidía y «Autorizo los marcados» no guardaba nada). El id de un proyecto no lleva espacios
export const clavePermiso = (n: { proyecto: string; regla: string | null }) => `${n.proyecto} ${n.regla ?? ''}`;
export const claveSkill = (s: { proyecto: string; ruta: string }) => `${s.proyecto} ${s.ruta}`;
const fechaHora = (iso: string) => new Date(iso).toLocaleString(lenguaje(), { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** Lo que pinta la pestaña: el modo de hoy, si este computador admite el automático, y lo de cada panel. */
export interface DatosPermisos {
  modo: ModoPermisos;
  automatico?: { admite: boolean; porque?: string };
  negados: DatosNegados;
  skills: DatosSkills;
}
/** Lo negado, con lo marcado y el alcance elegido, que la página recuerda entre repintados. */
export interface DatosNegados { panel: PanelPermisos; marcados: ReadonlySet<string>; alcances: ReadonlyMap<string, PermisoAutorizado['alcance']>; activo: string; nombre: (id?: string) => string }
export interface DatosSkills { panel: PanelSkills; marcadas: ReadonlySet<string>; nombre: (id?: string) => string }

export function seccionPermisos({ modo, automatico, negados, skills }: DatosPermisos) {
  // «Automático, vigilado», apagado con lo que le falta si el Claude Code de este computador no lo trae; si ya estaba
  // elegido, el lanzador vuelve a lo autorizado, y aquí se dice
  const sinAutomatico = automatico?.admite === false;
  const porque = esc(automatico?.porque ?? '');
  const eleccion = (Object.keys(MODOS_DE_PERMISOS) as ModoPermisos[]).map((m) => `<button type="button" data-modo-permisos="${m}" aria-pressed="${m === modo}"${m === 'automatico' && sinAutomatico && modo !== 'automatico' ? ` disabled title="${porque}"` : ''}>${esc(MODOS_DE_PERMISOS[m].nombre)}</button>`).join('');
  return `<section class="panel-d" data-ancla="m-permisos">
        <h3>${t('modelo.permisosTitulo')}</h3>
        <div class="filtro-propuestas" role="group" aria-label="${t('modelo.permisosTitulo')}">${eleccion}</div>
        ${!sinAutomatico ? '' : modo === 'automatico' ? `<p class="como">${t('modelo.autoNoDisponible', { porque })}</p>` : `<p class="como">${t('modelo.autoApagado', { porque })}</p>`}
        <p class="modo-permisos">${icono('candado')}<span><b>${esc(MODOS_DE_PERMISOS[modo].nombre)}.</b> ${esc(MODOS_DE_PERMISOS[modo].que)}</span></p>
        <p class="como">${t('modelo.rigeDesde')}</p>
        <p class="como"><button type="button" data-probar-permiso="1">${t('modelo.probarDialogo')}</button> ${t('modelo.probarDialogoExplica')}</p>
        <p class="como">${t('modelo.listaFija')}</p>
        ${seccionGrupos(negados)}
        ${seccionNegados(negados)}
        ${seccionSkills(skills)}
        <p class="como">${t('modelo.nuncaHace')}</p>
      </section>`;
}

/** Dónde recuerda la página el alcance de una casilla sin marcar. */
export const claveGrupo = (id: string) => `grupo ${id}`;

/**
 * Las casillas fijas, listas antes de hacer falta (nota de voz del titular nmvzq8eb4tit, 2 de noviembre de 2026: le dije que
 * diera el permiso de publicar y no había dónde): cada grupo del paquete del asistente, para el proyecto activo, con lo que
 * da, cuándo hace falta y su alcance. Marcarla es la autorización, sin otro botón. Mientras llega lo autorizado, apagadas.
 */
function seccionGrupos({ panel, alcances, activo, nombre }: DatosNegados) {
  const listo = !!panel && !panel.error;
  const grupos = new Map(gruposEnElPanel(panel?.autorizados ?? [], activo).map((g) => [g.id, g]));
  const filas = PAQUETE_DE_PERMISOS.map((g) => {
    const { marcado, alcance } = grupos.get(g.id)!;
    const elegido = marcado ? alcance : alcances.get(claveGrupo(g.id)) ?? 'proyecto';
    const apagado = listo ? '' : ' disabled';
    return `<li class="ajuste-d"><label class="casilla-d"><input type="checkbox" data-permiso-grupo="${g.id}"${marcado ? ' checked' : ''}${apagado}> <span>${t(`asistente.grupo.${g.id}` as ClaveDeTexto)}</span></label>
        <p class="como">${t(`asistente.grupo.${g.id}Que` as ClaveDeTexto)} ${t(`asistente.grupo.${g.id}Cuando` as ClaveDeTexto)}</p>
        <p class="como"><label>${t('modelo.valePara')} <select data-alcance-grupo="${g.id}" aria-label="${t('modelo.paraQueProyectos')}"${apagado}><option value="proyecto"${elegido === 'proyecto' ? ' selected' : ''}>${t('modelo.soloEsteProyecto')}</option><option value="todos"${elegido === 'todos' ? ' selected' : ''}>${t('modelo.todosLosProyectos')}</option></select></label></p>
        <p class="como"><small>${g.reglas.map((r) => `<code>${esc(r)}</code>`).join(' ')}</small></p>
      </li>`;
  }).join('');
  return `<div class="negados-panel"><h4>${t('modelo.gruposTitulo')}</h4>
      <p class="como">${t('modelo.gruposExplica', { proyecto: esc(nombre(activo)) })}</p>
      <ul class="ajustes-d">${filas}</ul></div>`;
}

/**
 * Lo que se le negó al director, para autorizarlo con una casilla (nota de voz del titular nmvotdn3ftit, 26 de octubre de
 * 2026: «No quiero volver a que el director falle por permisos»; pedido pd_panel_permisos). Lo trae el servidor aparte
 * (/permisos: lee los registros de las revisiones, que pesan), y la página lo vuelve a pedir a los 30 segundos.
 */
export function seccionNegados({ panel, marcados, alcances, activo, nombre }: DatosNegados) {
  if (!panel) return `<div class="negados-panel"><h4>${t('modelo.negadosTitulo')}</h4><p class="como">${t('modelo.negadosBuscando')}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></p></div>`;
  if (panel.error) return `<div class="negados-panel"><h4>${t('modelo.negadosTitulo')}</h4><p class="como">${t('modelo.negadosError', { error: esc(panel.error) })}</p></div>`;
  const { pendientes, autorizados } = panel;
  const autorizables = pendientes.filter((n) => n.regla && !n.nunca);
  const item = (n: PermisoNegado) => {
    const clave = clavePermiso(n);
    const alcance = alcances.get(clave) ?? 'proyecto';
    const donde = t('modelo.negadosDonde', { n: n.veces, proyecto: esc(nombre(n.proyecto)), cuando: esc(fechaHora(n.cuando)) });
    const cabeza = n.nunca
      ? `<span class="casilla-d">${icono('candado')} <span>${esc(n.que)}</span> <span class="consejo-ajuste">${t('modelo.consejoNunca')}</span></span>`
      : n.regla
        ? `<label class="casilla-d"><input type="checkbox" data-permiso-negado="${esc(clave)}"${marcados.has(clave) ? ' checked' : ''}> <span>${esc(n.que)}</span></label>`
        : `<span class="casilla-d">${icono('candado')} <span>${esc(n.que)}</span> <span class="consejo-ajuste">${t('modelo.noSeAutoriza')}</span></span>`;
    const detalle = n.nunca
      ? `<p class="como">${t('modelo.porQueNo', { porque: esc(n.nunca.porque), enSuLugar: esc(n.nunca.enSuLugar) })}</p>`
      : n.regla
        ? `<p class="como">${t('modelo.quePuedePasar', { riesgo: esc(n.riesgo) })}</p>
           <p class="como"><label>${t('modelo.valePara')} <select data-alcance-permiso="${esc(clave)}" aria-label="${t('modelo.paraQueProyectos')}"><option value="proyecto"${alcance === 'proyecto' ? ' selected' : ''}>${t('modelo.soloEsteProyecto')}</option><option value="todos"${alcance === 'todos' ? ' selected' : ''}>${t('modelo.todosLosProyectos')}</option></select></label></p>`
        : `<p class="como">${t('modelo.porQueNoSolo', { motivo: esc(n.motivo ?? '') })}</p>`;
    // Las pruebas de un proyecto no se le negaron: el Studio las leyó del proyecto y te las ofrece antes (tu decisión del
    // 26 de octubre de 2026, «Que la lea y me la ofrezca»)
    const paraQue = n.ofrecido === 'pruebas'
      ? t('modelo.paraQuePruebas', { proyecto: esc(nombre(n.proyecto)) })
      : t('modelo.paraQueIntento', { intentos: n.intentos.map((i) => `<code>${esc(i)}</code>`).join(', '), donde });
    return `<li class="ajuste-d negado-d${n.nunca ? ' consejo-nunca' : ''}">${cabeza}
        <p class="como">${paraQue}</p>
        ${detalle}${n.regla && !n.nunca ? `<p class="como"><small>${t('modelo.reglaExacta', { regla: esc(n.regla) })}</small></p>` : ''}
      </li>`;
  };
  const lista = pendientes.length
    ? `<ul class="ajustes-d">${pendientes.map(item).join('')}</ul>
       ${autorizables.length ? `<div class="acciones-p"><button type="button" class="primario" data-autorizar-permisos>${t('modelo.autorizoMarcados')}</button><button type="button" class="boton-suave" data-autorizar-permisos="revision" title="${t('modelo.autorizoYPidoTitulo', { proyecto: esc(nombre(activo)) })}">${t('modelo.autorizoYPido')}</button></div>` : ''}`
    : `<p class="como">${t('modelo.nadaPendiente')}</p>`;
  const ya = autorizados.length
    ? `<h4>${t('modelo.yaAutorizaste')}</h4><ul class="ajustes-d">${autorizados.map((a) => `<li class="ajuste-d"><span class="casilla-d"><code>${esc(a.regla)}</code> <span class="consejo-ajuste">${a.alcance === 'todos' ? t('modelo.todosLosProyectos') : t('modelo.soloProyecto', { proyecto: esc(nombre(a.proyecto)) })}</span></span>
         <p class="como">${a.origen === 'claude' ? t('modelo.loAproboClaude', { cuando: esc(fechaHora(a.cuando)) }) : t('modelo.loAutorizo', { quien: esc(a.quien), cuando: esc(fechaHora(a.cuando)) })} <button type="button" class="enlace" data-quitar-permiso="${esc(JSON.stringify({ regla: a.regla, alcance: a.alcance, proyecto: a.proyecto }))}">${t('modelo.quitar')}</button></p></li>`).join('')}</ul>`
    : '';
  return `<div class="negados-panel"><h4>${t('modelo.negadosTitulo')}</h4>
      <p class="como">${t('modelo.negadosExplica')}</p>
      ${lista}${ya}</div>`;
}

/**
 * Las skills de los proyectos (propuesta aceptada pr_skills_cierre; dónde se autorizan lo elegiste en t_skills_panel: aquí,
 * en «Permisos»): el director no carga ninguna skill ni ningún comando de un proyecto que no autorices con su casilla, y
 * si un archivo suyo cambia, deja de cargarla hasta que la autorices otra vez. Antes de la casilla, lo que el Studio vio
 * en ella (skillsDelProyecto.ts › revisarSkill). Lo trae el servidor aparte (/skills), como lo negado.
 */
export function seccionSkills({ panel, marcadas, nombre }: DatosSkills) {
  const cabeza = `<h4>${t('modelo.skillsTitulo')}</h4>`;
  if (!panel) return `<div class="negados-panel">${cabeza}<p class="como">${t('modelo.skillsBuscando')}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></p></div>`;
  if (panel.error) return `<div class="negados-panel">${cabeza}<p class="como">${t('modelo.skillsError', { error: esc(panel.error) })}</p></div>`;
  const como = `<p class="como">${t('modelo.skillsComo')}</p>`;
  const { skills } = panel;
  if (!skills.length) return `<div class="negados-panel">${cabeza}${como}<p class="como">${t('modelo.skillsNinguna')}</p></div>`;
  const vio = (s: SkillEnElPanel) => (s.hallazgos.length ? `<p class="como">${t('modelo.vio')}</p><ul class="como">${s.hallazgos.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : `<p class="como">${t('modelo.vioNada')}</p>`);
  const pendientes = skills.filter((s) => s.estado !== 'autorizada');
  const ya = skills.filter((s) => s.estado === 'autorizada');
  const item = (s: SkillEnElPanel) => `<li class="ajuste-d negado-d"><label class="casilla-d"><input type="checkbox" data-skill-marca="${esc(claveSkill(s))}"${marcadas.has(claveSkill(s)) ? ' checked' : ''}> <span>${t('modelo.skillDe', { nombre: esc(s.nombre), proyecto: esc(nombre(s.proyecto)) })}</span>${s.estado === 'cambio' ? ` <span class="consejo-ajuste">${t('modelo.cambioSkill')}</span>` : ''}</label>
      <p class="como"><small>${t('modelo.estaEn', { ruta: esc(s.ruta) })}</small></p>${vio(s)}</li>`;
  const lista = pendientes.length
    ? `<ul class="ajustes-d">${pendientes.map(item).join('')}</ul><div class="acciones-p"><button type="button" class="primario" data-autorizar-skills>${t('modelo.autorizoMarcadas')}</button></div>`
    : `<p class="como">${t('modelo.ningunaPorAutorizar')}</p>`;
  const cargadas = ya.length
    ? `<h4>${t('modelo.queYaCarga')}</h4><ul class="ajustes-d">${ya.map((s) => `<li class="ajuste-d"><span class="casilla-d"><b>${esc(s.nombre)}</b> <span class="consejo-ajuste">${t('modelo.proyectoEntreComillas', { proyecto: esc(nombre(s.proyecto)) })}</span></span>
         <p class="como">${t('modelo.laAutorizo', { quien: esc(s.quien ?? t('modelo.alguien')), cuando: s.cuando ? t('modelo.elFecha', { cuando: esc(fechaHora(s.cuando)) }) : '' })} <button type="button" class="enlace" data-quitar-skill="${esc(JSON.stringify({ proyecto: s.proyecto, nombre: s.nombre, ruta: s.ruta }))}">${t('modelo.quitar')}</button></p></li>`).join('')}</ul>`
    : '';
  return `<div class="negados-panel">${cabeza}${como}${lista}${cargadas}</div>`;
}
