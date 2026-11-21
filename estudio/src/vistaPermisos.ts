// La pestaña «Permisos» de «Modelo y consumo»: cómo pide permisos el director, el registro de lo que autorizaste y las skills
// de tus proyectos. Salió de app.ts al partir los módulos grandes (propuesta aceptada pr_partir_modulos), como «Lo que
// gasta» (vistaGasto.ts) y «Tus ajustes» (vistaAjustesPropios.ts): recibe lo que pinta y no guarda nada; pedir al
// servidor lo autorizado y las skills, y los botones, siguen en la página. Nada se marca por adelantado (nmwp8xchutit):
// cuando el director necesita algo crítico, pregunta con el aviso, y «Siempre» queda anotado aquí.
import type { PermisoAutorizado } from '../servidor/permisosNegados';
import { icono } from './iconos';
import { lenguaje, t } from './textos';
import { esc } from './util';

/** Lo autorizado, como lo trae el servidor (/permisos); null mientras se busca. */
export type PanelPermisos = { autorizados: PermisoAutorizado[]; error?: string } | null;

// ── «Filtrar» se queda donde la persona lo dejó en pantalla (nota del titular nmwmehf6ntit, pd_filtro_fijo): al repintar,
// lo que suben o bajan las secciones de arriba se compensa con el scroll, y el panel no se encoge mientras se filtra (si
// se encogiera, el navegador recortaría el scroll y el campo saltaría). Moverse por los resultados lo decide la persona.

/** Corre el scroll lo que se movió el campo: `antes` y `despues`, su borde de arriba en la pantalla. Pura sobre `scroller`. */
export function mantenerEnSuSitio(antes: number | null, despues: number | null, scroller: { scrollTop: number } | null): void {
  if (antes === null || despues === null || !scroller || despues === antes) return;
  scroller.scrollTop += despues - antes;
}

/** El alto mínimo del panel tras repintarlo: mientras se filtra, nunca menos que el que tenía; sin filtro, libre. Pura. */
export function altoMinimoDelPanel(filtro: string, alto: number, minimoAnterior = ''): string {
  if (!filtro.trim()) return '';
  return `${Math.ceil(Math.max(alto, parseFloat(minimoAnterior) || 0))}px`;
}

/** Lo que tiene el scroll del campo: su antecesor más cercano que se desplaza, o la página. */
export function contenedorConScroll(el: Element): { scrollTop: number } | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) return p;
  }
  return document.scrollingElement;
}

/** Una skill de un proyecto, como la trae el servidor (/skills: skillsDelProyecto.ts › revisarSkill). */
export interface SkillEnElPanel { proyecto: string; nombre: string; ruta: string; huella: string; estado: 'autorizada' | 'nueva' | 'cambio'; hallazgos: string[]; cuando?: string; quien?: string }
export type PanelSkills = { skills: SkillEnElPanel[]; error?: string } | null;

// La clave viaja en un atributo del HTML: sin caracteres de control, que el navegador cambia al leerlo. El id de un proyecto no lleva espacios
export const claveSkill = (s: { proyecto: string; ruta: string }) => `${s.proyecto} ${s.ruta}`;

/**
 * Lo que la respuesta del servidor no trae como se pidió (nmwmniitjtit): una skill autorizada que no vuelve «autorizada»
 * o una quitada que sigue. La página dice «Guardado» solo sin nada aquí, aunque el servidor responda bien (uno con el
 * código de antes respondía 200 con la casilla vacía). Pura.
 */
export function skillsQueNoQuedaron(pedido: { autorizar?: { proyecto: string; ruta: string }[]; quitar?: { proyecto: string; ruta: string }[] }, skills: readonly Pick<SkillEnElPanel, 'proyecto' | 'ruta' | 'estado'>[]): string[] {
  const estado = (p: { proyecto: string; ruta: string }) => skills.find((s) => claveSkill(s) === claveSkill(p))?.estado;
  return [...(pedido.autorizar ?? []).filter((p) => estado(p) !== 'autorizada'), ...(pedido.quitar ?? []).filter((q) => estado(q) === 'autorizada')].map(claveSkill);
}
const fechaHora = (iso: string) => new Date(iso).toLocaleString(lenguaje(), { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/**
 * Cómo quedó una casilla al guardarse sola (pd_permisos_compacto; nmwdib735tit, nmwimuc47tit, nmwjog1k5tit): «Guardado»
 * dos segundos y se desvanece, o vuelve a como estaba con «No se guardó: inténtalo de nuevo» en rojo. La página lo
 * recuerda por la clave de la casilla y lo borra a los dos segundos.
 */
export type EstadoCasilla = 'guardado' | 'fallo';
export type EstadosCasillas = ReadonlyMap<string, EstadoCasilla>;
const marcaDeGuardado =(estados: EstadosCasillas | undefined, clave: string) => {
  const e = estados?.get(clave);
  if (e === 'guardado') return ` <span class="guardado-casilla" role="status">${t('modelo.guardado')}</span>`;
  if (e === 'fallo') return ` <span class="guardado-casilla fallo" role="alert">${t('modelo.noGuardado')}</span>`;
  return '';
};

/** El filtro, sin mayúsculas, tildes ni marcas de HTML: «publicar» encuentra «Publicar» (nmwjk3ttwtit: nombre y descripción). */
const normalizarFiltro = (s: string) => s.replace(/<[^>]*>/g, ' ').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
export const coincideFiltro = (filtro: string, ...textos: (string | undefined | null)[]) => {
  const q = normalizarFiltro(filtro);
  return !q || textos.some((x) => normalizarFiltro(String(x ?? '')).includes(q));
};
const oculto = (si: boolean) => (si ? ' hidden' : '');

/** Lo que pinta la pestaña: lo de cada panel. Ya no hay modo que elegir (nmwp8uot6tit): un solo modo de permisos. */
export interface DatosPermisos {
  autorizados: DatosAutorizados;
  skills: DatosSkills;
}
/** Lo autorizado, con el filtro y cómo quedó cada línea; `nombre` da el nombre de un proyecto por su id. */
export interface DatosAutorizados { panel: PanelPermisos; nombre: (id?: string) => string; estados?: EstadosCasillas; filtro?: string }
/** `activo`: el proyecto activo, el único cuyas skills se listan (pd_skills_por_proyecto); sin él, las de todos. */
export interface DatosSkills { panel: PanelSkills; marcadas: ReadonlySet<string>; nombre: (id?: string) => string; estados?: EstadosCasillas; filtro?: string; activo?: string }

/**
 * El panel (pd_permisos_compacto, nota nmwcu33dctit): un solo modo de permisos, sin selector (documento «One permission
 * mode», nmwp8uot6tit), dicho en una o dos líneas llanas (nmwpmdt2ztit: qué se ve aquí y qué pausa una revisión, sin
 * hablar de modos de antes) con «Probar el diálogo»; debajo, el registro de lo que autorizaste (nmwp8xchutit:
 * nada se marca por adelantado) y las skills.
 */
export function seccionPermisos({ autorizados, skills }: DatosPermisos) {
  return `<section class="panel-d" data-ancla="m-permisos">
        <h3>${t('modelo.permisosTitulo')}</h3>
        <p class="modo-permisos">${icono('candado')}<span>${t('modelo.unModo')}</span></p>
        <p class="como"><button type="button" data-probar-permiso="1">${t('modelo.probarDialogo')}</button> ${t('modelo.probarDialogoExplica')}</p>
        ${seccionAutorizados(autorizados)}
        ${seccionSkills(skills)}
        <p class="como">${t('modelo.nuncaHace')}</p>
      </section>`;
}

const partirRegla = (regla: string) => {
  const m = /^([A-Za-z_][\w-]*)(?:\(([\s\S]*)\))?$/.exec(regla);
  return m ? { herramienta: m[1], contenido: m[2] as string | undefined } : null;
};

/**
 * Lo que da un permiso, en palabras, sin HTML ni escapar (la regla de Claude Code es para el lanzador, no para quien lee):
 * `Bash(git push:*)` es ejecutar órdenes «git push»; `Read(//c/x/**)`, leer la carpeta «//c/x»; `Edit(...)`, editar en esa
 * carpeta; una herramienta sola (`WebFetch`), la herramienta entera. Lo que no se entiende, la regla tal cual. Pura.
 */
export function queDa(regla: string): string {
  const x = partirRegla(regla);
  if (!x) return t('modelo.daOtra', { regla });
  if (x.contenido === undefined) return t('modelo.daHerramienta', { herramienta: x.herramienta });
  const carpeta = /^(.*?)\/?\*\*$/.exec(x.contenido);
  if (x.herramienta === 'Bash') return t('modelo.daOrden', { orden: x.contenido.replace(/:\*$/, '') });
  if (x.herramienta === 'Read') return carpeta ? t('modelo.daLeerCarpeta', { ruta: carpeta[1] }) : t('modelo.daLeerArchivo', { ruta: x.contenido });
  if (x.herramienta === 'Edit') return carpeta ? t('modelo.daEditarCarpeta', { ruta: carpeta[1] }) : t('modelo.daEditarArchivo', { ruta: x.contenido });
  return t('modelo.daHerramientaCon', { herramienta: x.herramienta, contenido: x.contenido });
}

/** The filter a button brings when it leads to «Permisos» (`filtro`), or null if it brings none. Pura. */
export function filtroAlIr(dest: { vista?: string; ancla?: string; filtro?: string }): string | null {
  return dest.vista === 'modelo' && dest.ancla === 'm-permisos' && dest.filtro?.trim() ? dest.filtro.trim() : null;
}

/**
 * If a permission is general (nmwqmpnfctit): a whole tool, or a kind of command (`Bash(git push:*)`, a few words without a
 * path). Specific: a single path, file or folder (`Read`, `Edit`, `Write` with a path), or a one-off command (without
 * `:*`, with a path, or long). The general ones are in view on top; the specific ones, folded below. Pura.
 */
export function esGeneral(regla: string): boolean {
  const x = partirRegla(regla);
  if (!x) return false;
  if (x.contenido === undefined || x.contenido === '' || x.contenido === '*') return true;
  if (x.herramienta === 'Bash') {
    const tipo = /^(.*?):\*$/.exec(x.contenido)?.[1];
    if (tipo === undefined) return false;
    return !/[\\/]|\.\w{1,5}\b|["'|;&<>]/.test(tipo) && tipo.trim().split(/\s+/).length <= 3;
  }
  if (['Read', 'Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(x.herramienta)) return false;
  // Another tool with something inside (a site for WebFetch, a server's tool): general unless it names a path
  return !/[\\/]/.test(x.contenido.replace(/^domain:/, ''));
}

/**
 * Lo que autorizaste, el registro (nmwp8xchutit): una línea por permiso, lo más nuevo primero, que dice en palabras lo que
 * permite, si es para este proyecto o para todos, cuándo y de qué revisión salió (la hora de la pregunta del aviso, si se
 * dio con «Siempre» durante una revisión; si no, quién lo autorizó), con «Revocar». Con «Filtrar» encima, que busca en la
 * regla y en la descripción (nmwgj3x9mtit, nmwjk3ttwtit) y, si nada coincide, lo dice con «Limpiar» (nmwjl7xnrtit). El campo se
 * vacía al salir de «Modelo y consumo» (nmwk5n39ntit). Siempre se ve el encabezado y por qué no hay nada que marcar.
 */
export function seccionAutorizados({ panel, estados, filtro = '', nombre }: DatosAutorizados) {
  const cabeza = `<h4>${t('modelo.registroTitulo')}</h4><p class="como">${t('modelo.registroExplica')}</p>`;
  if (!panel) return `<div class="negados-panel">${cabeza}<p class="como">${t('modelo.registroBuscando')}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></p></div>`;
  if (panel.error) return `<div class="negados-panel">${cabeza}<p class="como">${t('modelo.registroError', { error: esc(panel.error) })}</p></div>`;
  if (!panel.autorizados.length) return `<div class="negados-panel">${cabeza}<p class="como">${t('modelo.registroVacio')}</p></div>`;
  const lista = [...panel.autorizados].sort((a, b) => b.cuando.localeCompare(a.cuando));
  const donde = (a: PermisoAutorizado) => (a.alcance === 'todos' ? t('modelo.todosLosProyectos') : t('modelo.soloProyecto', { proyecto: esc(nombre(a.proyecto)) }));
  const cuando = (a: PermisoAutorizado) => {
    const c = esc(fechaHora(a.cuando));
    if (a.revision) return t('modelo.enRevision', { cuando: c, revision: esc(fechaHora(a.revision)) });
    return a.origen === 'claude' ? t('modelo.loAproboClaude', { cuando: c }) : t('modelo.loAutorizo', { quien: esc(a.quien), cuando: c });
  };
  const quitar = (a: PermisoAutorizado) => `<button type="button" class="enlace" data-quitar-permiso="${esc(JSON.stringify({ regla: a.regla, alcance: a.alcance, proyecto: a.proyecto }))}">${t('modelo.revocar')}</button>`;
  const lineas = lista.map((a) => {
    const que = queDa(a.regla);
    const ve = coincideFiltro(filtro, a.regla, que, donde(a), cuando(a));
    return { ve, general: esGeneral(a.regla), html: `<li class="ajuste-d" data-filtrable${oculto(!ve)}><span class="casilla-d"><span class="permiso-d">${esc(que)}</span> <span class="consejo-ajuste">${donde(a)}</span>${marcaDeGuardado(estados, a.regla)}</span>
         <p class="como">${cuando(a)} <small><code>${esc(a.regla)}</code></small> ${quitar(a)}</p></li>` };
  });
  const vistos = lineas.filter((i) => i.ve).length;
  const campo = `<p class="filtro-permisos"><label>${t('modelo.filtrar')} <input type="search" data-filtro-permisos value="${esc(filtro)}" placeholder="git push" aria-label="${t('modelo.filtrarAyuda')}"></label></p>`;
  const nada = filtro.trim() && !vistos ? `<p class="como nada-coincide">${t('modelo.nadaCoincide', { filtro: esc(filtro.trim()) })} <button type="button" class="enlace" data-limpiar-filtro-permisos>${t('modelo.limpiar')}</button></p>` : '';
  // The general ones on top, in view; the specific ones (a path, a one-off command), folded below, and open when the
  // filter finds one of them (nmwqmpnfctit)
  const generales = lineas.filter((i) => i.general);
  const especificas = lineas.filter((i) => !i.general);
  const vistasEspecificas = especificas.filter((i) => i.ve).length;
  const plegado = especificas.length
    ? `<details class="permisos-especificos"${filtro.trim() && vistasEspecificas ? ' open' : ''}${oculto(!vistasEspecificas)}><summary>${t('modelo.especificos', { n: filtro.trim() ? vistasEspecificas : especificas.length })}</summary><p class="como">${t('modelo.especificosExplica')}</p><ul class="ajustes-d registro-d">${especificas.map((i) => i.html).join('')}</ul></details>`
    : '';
  return `<div class="negados-panel">${cabeza}
      ${campo}${nada}<ul class="ajustes-d registro-d"${oculto(!generales.some((i) => i.ve))}>${generales.map((i) => i.html).join('')}</ul>${plegado}</div>`;
}

/**
 * Las skills de los proyectos (propuesta aceptada pr_skills_cierre; dónde se autorizan lo elegiste en t_skills_panel: aquí,
 * en «Permisos»): el director no carga ninguna skill ni ningún comando de un proyecto que no autorices con su casilla, y
 * si un archivo suyo cambia, deja de cargarla hasta que la autorices otra vez. Antes de la casilla, lo que el Studio vio
 * en ella (skillsDelProyecto.ts › revisarSkill). Lo trae el servidor aparte (/skills). Marcar la casilla
 * la autoriza al momento, como las demás del panel (nmwdib735tit).
 */
export function seccionSkills({ panel, marcadas, nombre, estados, filtro = '', activo }: DatosSkills) {
  const cabeza = `<h4>${t('modelo.skillsTitulo')}</h4>`;
  if (!panel) return `<div class="negados-panel">${cabeza}<p class="como">${t('modelo.skillsBuscando')}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></p></div>`;
  if (panel.error) return `<div class="negados-panel">${cabeza}<p class="como">${t('modelo.skillsError', { error: esc(panel.error) })}</p></div>`;
  const como = `<p class="como">${t('modelo.skillsComo')}</p>`;
  // Las skills de cada proyecto, solo en ese proyecto: el activo (nota del titular nmwmeetn2tit, pd_skills_por_proyecto)
  const skills = activo === undefined ? panel.skills : panel.skills.filter((s) => s.proyecto === activo);
  if (!skills.length) return `<div class="negados-panel">${cabeza}${como}<p class="como">${t(activo === undefined ? 'modelo.skillsNinguna' : 'modelo.skillsNingunaEnEste')}</p></div>`;
  const vio = (s: SkillEnElPanel) => (s.hallazgos.length ? `<p class="como">${t('modelo.vio')}</p><ul class="como">${s.hallazgos.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : `<p class="como">${t('modelo.vioNada')}</p>`);
  const ve = (s: SkillEnElPanel) => coincideFiltro(filtro, s.nombre, s.ruta, nombre(s.proyecto), ...s.hallazgos);
  // Una sola lista, en el orden de siempre: la que se autoriza no se va a otra parte, se queda donde estaba con su casilla
  // marcada, y debajo quién la autorizó y «Quitar» (nmwmeetn2tit: «Guardado» con la casilla vacía confundía)
  const item = (s: SkillEnElPanel) => {
    const ya = s.estado === 'autorizada';
    const marcada = ya || marcadas.has(claveSkill(s));
    const quien = ya
      ? `<p class="como">${t('modelo.laAutorizo', { quien: esc(s.quien ?? t('modelo.alguien')), cuando: s.cuando ? t('modelo.elFecha', { cuando: esc(fechaHora(s.cuando)) }) : '' })} <button type="button" class="enlace" data-quitar-skill="${esc(JSON.stringify({ proyecto: s.proyecto, nombre: s.nombre, ruta: s.ruta }))}">${t('modelo.quitar')}</button></p>`
      : '';
    return `<li class="ajuste-d${ya ? '' : ' negado-d'}" data-filtrable${oculto(!ve(s))}><label class="casilla-d"><input type="checkbox" data-skill-marca="${esc(claveSkill(s))}"${marcada ? ' checked disabled' : ''}> <span>${t('modelo.skillDe', { nombre: esc(s.nombre), proyecto: esc(nombre(s.proyecto)) })}</span>${s.estado === 'cambio' ? ` <span class="consejo-ajuste">${t('modelo.cambioSkill')}</span>` : ''}</label>${marcaDeGuardado(estados, claveSkill(s))}
      ${quien}<p class="como"><small>${t('modelo.estaEn', { ruta: esc(s.ruta) })}</small></p>${ya ? '' : vio(s)}</li>`;
  };
  return `<div class="negados-panel">${cabeza}${como}<ul class="ajustes-d">${skills.map(item).join('')}</ul></div>`;
}
