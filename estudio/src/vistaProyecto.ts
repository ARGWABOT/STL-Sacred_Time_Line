// La vista «Proyecto»: dónde está, qué es, la meta y el diagnóstico. Salió de app.ts al partir los
// módulos grandes (propuesta aceptada pr_partir_modulos), como «Permisos» (vistaPermisos.ts) y la bitácora
// (bitacoraDelComputador.ts): recibe lo que pinta y no guarda nada; leer del servidor, guardar los formularios, el
// borrador de la meta y los clics siguen en la página.
import type { Plan, Proyecto } from '../../src/director/director';
import { paraEnIdioma, type ArchivoClave } from '../../src/director/archivosClave';
import type { AvisoDelVigia, EntradaGh, SeguimientoDeCuenta, SesionGh } from '../../src/director/cuentaGit';
import { cuentaDetectada } from '../../src/director/cuentaDetectada';
import type { InfoRepositorio } from '../../src/director/repositorio';
import type { LoQueSeBorra } from '../../src/director/proyectos';
import type { PestanaQa } from '../../src/director/funciones';
import { atributosDelCargador, contenidoDelBoton, lineaDelCargador, type EstadoCargador } from './cargador';
import { fecha } from './formato';
import { htmlParadas, paradaDeLaMeta } from './paradasEntrega';
import { idiomaActual, lenguaje, t as tx } from './textos';
import { esc } from './util';

/** La meta mientras se escribe, o el candidato elegido con «Usar este»: lo guarda la página. */
export interface BorradorMeta { texto: string; exito: string; horizonte: string; candidato: string }

/** Lo que pinta la vista. La página se lo da con sus datos y con lo que depende de ella. */
export interface DatosProyecto {
  proyecto: Proyecto;
  repositorio: { ruta: string | null; info: InfoRepositorio | null; error: string | null; cuentaGit?: string | null; respaldoDelStudio?: string | null; respaldoPublico?: boolean };
  plan: Pick<Plan, 'objetivos' | 'boletin' | 'detectado' | 'diagnostico' | 'archivosClave'> & Partial<Pick<Plan, 'frentes'>>;
  /** Si quien mira es el titular: solo él escribe el proyecto y la meta. */
  titular: boolean;
  /** Quién mira (su id en el equipo). */
  yo?: string;
  /** Proyecto nuevo (se plantea) o existente (se diagnostica). */
  nuevo: boolean;
  borrador: BorradorMeta | null;
  /** La sección del diagnóstico, ya pintada por la página: su título y lo de dentro (va en su pestaña, como las demás). */
  diagnostico: SeccionProyecto;
  /** Si un plegable nace abierto (lo recuerda la página). */
  plegable: (clave: string) => string;
  /** Las sesiones de gh, solo para el titular: null mientras no se pidieron (las trae la página, aparte). */
  sesionesGh?: PanelSesionesGh | null;
  /**
   * Lo que pasó al oprimir «Guardar la cuenta», si lo guardado no es la sesión de gh: la línea queda bajo el campo, con la
   * hora, hasta cambiar de proyecto. Si salió bien, nada más que el cambio (nmwjl7fuktit).
   */
  cuentaGuardada?: ResultadoGuardarCuenta | null;
  /** El cargador de «Guardar la cuenta» (cargador.ts, pd_cargadores): mientras guarda, o lo que falló. */
  cargadorCuenta?: EstadoCargador | null;
  /**
   * Lo escrito en el campo de la cuenta y aún sin guardar (nota nmwajms54tit): un repintado lo deja como estaba, nunca
   * vuelve a la cuenta guardada mientras no se guarde o se cambie de proyecto.
   */
  cuentaEscrita?: string | null;
  /** La pestaña a la vista (notas nmwajot4otit y nmwaw70jjtit). Sin ella, la primera de su orden (pestanasProyecto). */
  pestana?: PestanaProyecto;
  /** Si el proyecto es este mismo Studio: no se puede quitar, y su botón no aparece. */
  esElStudio?: boolean;
  /**
   * Si tiene pestaña de QA (funciones.ts › pestanaQaDelProyecto): sin ella, una sola línea bajo su repositorio dice por
   * qué (nmwpmegh3tit, con sus palabras de nmwpov2zetit), y en ningún otro lugar.
   */
  pestanaQa?: PestanaQa;
  /** «Quitarlo de este Studio»: en qué va (null, sin oprimirlo; lo guarda la página, por proyecto). */
  quitar?: EstadoQuitar | null;
}

/**
 * «Quitarlo de este Studio» (pd_quitar_en_pantalla), en sus dos pasos: el primer clic trae la lista entera de lo que se
 * borra (`lista`), y el segundo, «Confirmo», lo borra (`quitando`); o lo que falló.
 */
export type EstadoQuitar =
  | { estado: 'cargando' }
  | { estado: 'lista'; borra: LoQueSeBorra }
  | { estado: 'quitando'; borra: LoQueSeBorra }
  | { estado: 'error'; error: string };

/** La lista de lo que se borra, una cosa por línea, para verla entera antes de confirmar. Pura. */
export function listaQuitar(b: LoQueSeBorra): { proyecto: string[]; studio: string[] } {
  const proyecto: string[] = [];
  if (b.repo) {
    if (b.memoria) proyecto.push(tx('proyecto.quitarMemoria', { ruta: `<code>${esc(b.repo.replace(/[\\/]+$/, ''))}${b.repo.includes('\\') ? '\\' : '/'}.stl</code>` }));
    if (b.rama) proyecto.push(tx('proyecto.quitarRama'));
    if (b.exclusion) proyecto.push(tx('proyecto.quitarExclusion'));
    for (const x of b.lineas) proyecto.push(`${tx('proyecto.quitarLineas', { archivo: `<code>${esc(x.archivo)}</code>` })}${x.lineas.map((l) => `<br><code>${esc(l)}</code>`).join('')}`);
    if (b.remota) proyecto.push(b.remota.seBorra ? tx('proyecto.quitarRemota', { remoto: esc(b.remota.remoto) }) : tx('proyecto.quitarRemotaQueda', { remoto: esc(b.remota.remoto), orden: `<code>${esc(b.remota.orden)}</code>` }));
  }
  const studio = b.local.map((k) => tx(`proyecto.quitarLocal.${k}` as Parameters<typeof tx>[0]));
  if (b.registros.length) studio.push(tx('proyecto.quitarRegistros', { n: b.registros.length }));
  if (b.lineasDelStudio) studio.push(tx('proyecto.quitarHistoria', { n: b.lineasDelStudio }));
  return { proyecto, studio };
}

/**
 * El final de «Dónde está»: «Quitarlo de este Studio», solo para el titular y nunca en STL Studio mismo (nmwb48vmitit).
 * Con la lista a la vista, el aviso, «Confirmo» y «Cancelar». Pura.
 */
export function bloqueQuitar(q: EstadoQuitar | null | undefined): string {
  const boton = `<button type="button" class="peligro" data-quitar-proyecto>${tx('proyecto.quitarDelStudio')}</button>`;
  const cabeza = `<p class="como"><b>${tx('proyecto.quitarDelStudio')}.</b> ${tx('proyecto.quitarComo')}</p>`;
  if (!q) return `<div class="quitar-proyecto" data-ancla="p-quitar">${cabeza}${boton}</div>`;
  if (q.estado === 'cargando') return `<div class="quitar-proyecto" data-ancla="p-quitar">${cabeza}<p class="como" role="status" aria-busy="true">${tx('proyecto.quitarCargando')}</p></div>`;
  if (q.estado === 'error') return `<div class="quitar-proyecto" data-ancla="p-quitar">${cabeza}<p class="aviso remoto" role="alert">${esc(q.error)}</p>${boton}</div>`;
  const { proyecto, studio } = listaQuitar(q.borra);
  const quitando = q.estado === 'quitando';
  return `<div class="quitar-proyecto confirmar" data-ancla="p-quitar">
          <p class="aviso" role="alert"><b>${tx('proyecto.quitarAviso')}</b></p>
          ${q.borra.repo ? `<p class="como">${tx('proyecto.quitarEnProyecto')}</p><ul class="lista-quitar">${proyecto.map((x) => `<li>${x}</li>`).join('')}</ul>` : `<p class="como">${tx('proyecto.quitarSinCarpeta')}</p>`}
          <p class="como">${tx('proyecto.quitarEnStudio')}</p>
          <ul class="lista-quitar">${studio.map((x) => `<li>${x}</li>`).join('')}</ul>
          <p class="como">${tx('proyecto.quitarNoToca')}</p>
          <div class="botones">
            <button type="button" class="peligro" data-quitar-confirmo${quitando ? ' disabled aria-busy="true"' : ''}>${tx(quitando ? 'proyecto.quitando' : 'proyecto.quitarConfirmo')}</button>
            <button type="button" data-quitar-cancelar${quitando ? ' disabled' : ''}>${tx('proyecto.quitarCancelar')}</button>
          </div>
        </div>`;
}

/** Una sección de la pestaña «Proyecto»: su ancla, su título (HTML), lo que va al lado del título y lo de dentro. */
export interface SeccionProyecto { ancla: string; titulo: string; sub?: string; cuerpo: string; clase?: string }

/** Una sección en su pestaña: su título arriba, a todo lo ancho, y lo de dentro. */
function seccionEnPestana(s: SeccionProyecto): string {
  return `<section class="panel-d seccion-proyecto${s.clase ? ` ${s.clase}` : ''}" data-ancla="${esc(s.ancla)}">
        <div class="cabeza-seccion"><h3>${s.titulo}</h3>${s.sub ? `<small>${s.sub}</small>` : ''}</div>
        <div class="cuerpo-seccion">${s.cuerpo}</div>
      </section>`;
}

/**
 * Las pestañas de Proyecto (nota del titular nmwaw70jjtit, 10 de noviembre de 2026: «las cuatro cards principales … vamos
 * a convertirlas en pestañas independientes … y no dependemos de un acordeón»; reemplaza el acordeón de nmwamtgcxtit): la
 * meta, qué es, el diagnóstico y dónde está, cada una en su pestaña, y «Equipo» (nota nmwajot4otit), al final.
 */
export type PestanaProyecto = 'objetivo' | 'contexto' | 'diagnostico' | 'repositorio';
export const PESTANAS_PROYECTO: PestanaProyecto[] = ['objetivo', 'contexto', 'diagnostico', 'repositorio'];
/**
 * Su orden: con la meta fijada, la meta primero (es contra lo que se mide todo); antes, el del arranque: dónde está, qué es,
 * el diagnóstico y la meta. La primera es la que se ve al llegar. Pura.
 */
export function pestanasProyecto(conMeta: boolean, eligiendo = false): PestanaProyecto[] {
  if (conMeta) return [...PESTANAS_PROYECTO];
  // El diagnóstico ya ofreció sus metas y falta elegir una: «La meta» va primero, y es la que se ve al llegar, también tras
  // recargar la página (nota nmwbk689ttit: tras la recarga se veía «Dónde está» y no las dos metas)
  return eligiendo ? ['objetivo', 'repositorio', 'contexto', 'diagnostico'] : ['repositorio', 'contexto', 'diagnostico', 'objetivo'];
}
/**
 * Al cargar (o recargar) la página: si lo que toca es elegir la meta, quien la fija va directo a «Proyecto» › «La meta»,
 * con sus dos metas a la vista (nota nmwbk689ttit). No si la dirección pide otra vista, si el director mira sin pantalla,
 * ni si estaba leyendo en «Documentos» (la lectura no se le quita). Pura.
 */
export function abrirLaMetaAlCargar(x: { eligiendo: boolean; titular: boolean; vista: string; pedida: boolean; mirar: boolean }): boolean {
  return x.eligiendo && x.titular && !x.pedida && !x.mirar && x.vista !== 'documentos';
}
/** Si el diagnóstico ya ofreció sus metas y aún no hay una fijada: lo que toca es elegirla. Pura. */
export function eligiendoMeta(proyecto: Pick<Proyecto, 'objetivo'>, plan: Pick<Plan, 'objetivos'>): boolean {
  return !proyecto.objetivo && (plan.objetivos ?? []).length > 0;
}
const ANCLA_DE_PESTANA: Record<PestanaProyecto, string> = { objetivo: 'p-objetivo', contexto: 'p-contexto', diagnostico: 'p-diagnostico', repositorio: 'p-repositorio' };
/**
 * La pestaña donde vive un ancla de Proyecto: un botón a `p-diagnostico` abre «Diagnóstico», uno a un candidato a meta
 * (`objetivo-<id>`), «La meta». `p-equipo` ya no es de Proyecto. Si no es de ninguna, null. Pura.
 */
export function pestanaProyectoDeAncla(ancla: string | null | undefined): PestanaProyecto | null {
  if (!ancla) return null;
  if (ancla === 'p-sincronizar') return 'contexto';
  if (ancla.startsWith('objetivo-')) return 'objetivo';
  return (Object.keys(ANCLA_DE_PESTANA) as (keyof typeof ANCLA_DE_PESTANA)[]).find((p) => ANCLA_DE_PESTANA[p] === ancla) ?? null;
}
/** El nombre de cada pestaña; la del diagnóstico, en un proyecto nuevo, es la del planteamiento. */
const nombrePestana = (p: PestanaProyecto, nuevo: boolean) => tx(({
  objetivo: 'proyecto.pestanaMeta', contexto: 'proyecto.pestanaQueEs', diagnostico: nuevo ? 'proyecto.pestanaPlanteamiento' : 'proyecto.pestanaDiagnostico',
  repositorio: 'proyecto.pestanaDondeEsta',
} as const)[p]);

/**
 * El resultado de «Guardar la cuenta»: mientras responde el servidor; lo guardado, con lo que dijo GitHub (`mensaje`, que
 * empieza con «Guardada: <cuenta>») y si la sesión es esa (`bien`); o el error.
 */
export type ResultadoGuardarCuenta = { estado: 'guardada'; cuando: string; mensaje: string; bien: boolean };

/**
 * La línea bajo el campo de la cuenta, solo si lo guardado no es la sesión de gh (lo que dijo GitHub, con la hora): si
 * salió bien, solo se ve el cambio, la cuenta en el campo (nmwjl7fuktit). Mientras guarda y si falla, lo dice el cargador
 * del botón (cargador.ts). Pura (salvo la hora local).
 */
export function lineaCuentaGuardada(r: ResultadoGuardarCuenta | null | undefined): string {
  if (!r || r.bien) return '';
  const hora = new Date(r.cuando).toLocaleTimeString(lenguaje(), { hour: '2-digit', minute: '2-digit' });
  return `<p class="aviso remoto resultado-cuenta" role="status">${esc(r.mensaje)} <small>(${esc(hora)})</small></p>`;
}

/** Lo que el panel de las sesiones de gh sabe (src/director/cuentaGit.ts › sesionesDeGh, entrarConGh). */
export interface PanelSesionesGh {
  cargando: boolean;
  hayGh: boolean;
  aprobada: string | null;
  sesiones: SesionGh[];
  entrada: EntradaGh | null;
  /** gh o el servidor no respondieron a tiempo: el panel lo dice, con «Actualizar». */
  error?: string;
}

/**
 * El aviso tras seguir la cuenta del proyecto, al cambiar de proyecto o al cargar el Studio (cuentaGit.ts ›
 * seguirCuentaDelProyecto; nota de voz del titular nmw9xvydetit): que gh cambió a ella (bien), que gh no la tiene guardada o
 * que no pudo cambiar, estos dos con su atajo a «Dónde está». Sin cuenta aprobada, ya activa o sin gh, ninguno. Pura.
 */
export function avisoDeCuentaGh(r: SeguimientoDeCuenta | null | undefined): { texto: string; bien: boolean; aDondeEsta: boolean } | null {
  if (r?.que === 'cambiada') return { texto: tx('proyecto.cuentaGitCambiada', { cuenta: r.nombre }), bien: true, aDondeEsta: false };
  if (r?.que === 'no_guardada') return { texto: tx('proyecto.cuentaGitNoGuardada', { cuenta: r.aprobada }), bien: false, aDondeEsta: true };
  // Un fallo sin nombre no es de cambiar a una cuenta: no se dice que no es la del proyecto (nmwo0dx41tit)
  if (r?.que === 'fallo' && r.nombre) return { texto: tx('proyecto.cuentaGitNoCambio', { cuenta: r.nombre, error: r.error }), bien: false, aDondeEsta: true };
  return null;
}

/** El aviso del vigía de la cuenta de gh (cuentaGit.ts › vigiaDeCuentaGh; nmwo0dx41tit): bien si coincide, con atajo si no. Pura. */
export function avisoDelVigiaGh(a: AvisoDelVigia | null | undefined): { texto: string; bien: boolean; aDondeEsta: boolean } | null {
  if (!a) return null;
  if (a.que === 'distinta') return { texto: tx('proyecto.vigiaDistinta', { ahora: a.ahora, aprobada: a.aprobada }), bien: false, aDondeEsta: true };
  if (!a.aprobada) return { texto: tx('proyecto.vigiaCambioSinCuenta', { antes: a.antes, ahora: a.ahora }), bien: true, aDondeEsta: false };
  return a.coincide
    ? { texto: tx('proyecto.vigiaCambio', { antes: a.antes, ahora: a.ahora }), bien: true, aDondeEsta: false }
    : { texto: tx('proyecto.vigiaCambioOtra', { antes: a.antes, ahora: a.ahora, aprobada: a.aprobada }), bien: false, aDondeEsta: true };
}

/**
 * Las sesiones de gh de este computador (nota del titular nmw0vw3detit: administrar la cuenta de gh desde aquí, sin la
 * terminal): cada una con el login que dice GitHub, el nombre con que gh la guardó, cuál está activa y cuál es la aprobada;
 * «Usar esta» y «Entrar con otra cuenta», con el código de un solo uso a la vista mientras gh espera.
 */
export function panelSesionesGh(p: PanelSesionesGh | null | undefined): string {
  const pie = (ver: boolean) => `<div class="botones-sesiones-gh">
            ${ver ? `<button type="button" data-ver-sesiones-gh>${tx('proyecto.sesionesGhVer')}</button>` : `<button type="button" data-ver-sesiones-gh>${tx('proyecto.sesionesGhActualizar')}</button>`}
            ${p?.hayGh === false ? '' : `<button type="button" data-entrar-gh>${tx('proyecto.sesionGhEntrar')}</button>`}
          </div>`;
  const cabeza = `<p class="como"><b>${tx('proyecto.sesionesGh')}.</b> ${tx('proyecto.sesionesGhComo')}</p>`;
  if (!p) return `<div class="sesiones-gh">${cabeza}${pie(true)}</div>`;
  // Si gh no respondió, se dice, con «Actualizar»: nunca se queda en «Preguntándole…» (nmwo0dx41tit)
  if (p.error) return `<div class="sesiones-gh">${cabeza}<p class="aviso">${tx('proyecto.sesionesGhNoRespondio', { error: esc(p.error) })}</p>${pie(false)}</div>`;
  if (p.cargando && !p.sesiones.length) return `<div class="sesiones-gh">${cabeza}<p class="como">${tx('proyecto.sesionesGhCargando')}</p></div>`;
  if (!p.hayGh) return `<div class="sesiones-gh">${cabeza}<p class="aviso">${tx('proyecto.sesionesGhSinGh')}</p>${pie(false)}</div>`;
  const filas = p.sesiones.map((s) => `<li class="sesion-gh${s.activa ? ' activa' : ''}${s.aprobada ? ' aprobada' : ''}">
              <span class="quien-gh"><b>${esc(s.login ?? s.nombre)}</b>
                <small>${s.login ? tx('proyecto.sesionGhGuardadaComo', { nombre: esc(s.nombre) }) : tx('proyecto.sesionGhSinLogin')}</small></span>
              ${s.activa ? `<span class="marca-gh">${tx('proyecto.sesionGhActiva')}</span>` : ''}
              ${s.aprobada ? `<span class="marca-gh aprobada">✓ ${tx('proyecto.sesionGhAprobada')}</span>` : ''}
              ${s.activa ? '' : `<button type="button" data-usar-sesion-gh="${esc(s.nombre)}" data-login-gh="${esc(s.login ?? s.nombre)}">${tx('proyecto.sesionGhUsar')}</button>`}
            </li>`).join('');
  const sinAprobada = p.aprobada && !p.sesiones.some((s) => s.aprobada) ? `<p class="aviso">${tx('proyecto.sesionesGhSinAprobada', { cuenta: esc(p.aprobada) })}</p>` : '';
  const e = p.entrada;
  const entrada = !e ? ''
    : e.estado === 'esperando' && e.codigo ? `<div class="entrada-gh">
            <p>${tx('proyecto.sesionGhCodigo')} <code class="codigo-gh">${esc(e.codigo)}</code>
              <button type="button" data-copiar-texto="${esc(e.codigo)}">${tx('proyecto.sesionGhCopiar')}</button>
              <a class="boton" href="${esc(e.url)}" target="_blank" rel="noopener">${tx('proyecto.sesionGhAbrir')} ↗</a></p>
            <p class="como">${tx('proyecto.sesionGhEsperando')}</p>
          </div>`
    : e.estado === 'lista' ? `<p class="bien-repo">✓ ${tx('proyecto.sesionGhLista')}</p>`
    : e.estado === 'fallo' ? `<p class="aviso">${tx('proyecto.sesionGhFallo', { error: esc(e.error ?? '') })}</p>` : '';
  return `<div class="sesiones-gh">${cabeza}
          ${p.sesiones.length ? `<ul class="lista-sesiones-gh">${filas}</ul>` : `<p class="como">${tx('proyecto.sesionesGhNinguna')}</p>`}
          ${sinAprobada}${entrada}${pie(false)}
        </div>`;
}

/**
 * El respaldo de la memoria (respaldo.ts): en STL Studio, la dirección de su repositorio privado, porque nunca va al del
 * mismo Studio (nmwfl2c3ltit); en los demás, el interruptor para respaldar aunque el repositorio sea público, con su
 * aviso a la vista (nmwf5lg39tit). Pura.
 */
export function bloqueRespaldo(r: DatosProyecto['repositorio'], esElStudio: boolean): string {
  if (esElStudio) return `<p class="como"><b>${tx('respaldo.segunda')}.</b> ${tx('respaldo.segundaComo')}</p>
          <form id="form-respaldo-segunda" class="fila-form">
            <input type="text" name="url" value="${esc(r.respaldoDelStudio ?? '')}" placeholder="https://github.com/…" aria-label="${esc(tx('respaldo.segunda'))}" />
            <button type="submit" class="primario">${tx('respaldo.segundaGuardar')}</button>
          </form>`;
  return `<label class="interruptor-respaldo"><input type="checkbox" data-respaldo-publico${r.respaldoPublico ? ' checked' : ''} /> ${tx('respaldo.publico')}</label>
          <p class="aviso remoto">⚠ ${tx('respaldo.publicoAviso')}</p>`;
}

/** Dónde está el repositorio: la carpeta y, plegado, lo de git (no hace falta para dirigir). */
function seccionRepositorio({ repositorio: r, plegable, titular: t, sesionesGh, cuentaGuardada, cuentaEscrita, esElStudio, quitar, cargadorCuenta, pestanaQa }: DatosProyecto): SeccionProyecto {
  // Al final, debajo de lo del repositorio (nmwb48vmitit): también sin la carpeta, que limpia lo que quedó en este Studio
  const alFinal = t && !esElStudio ? bloqueQuitar(quitar) : '';
  const info = r.info;
  // La cuenta de GitHub aprobada para este proyecto (src/director/cuentaGit.ts): sin ella, nada sube, baja ni publica
  // La sesión de gh activa (nota nmw9w8e3itit): «Usar la cuenta activa» llena el campo con su usuario y, sin cuenta
  // aprobada, el campo nace con él, marcado como detectado y sin guardar. El campo conserva el foco al repintar
  // (conservarFoco.ts), aunque esté vacío
  // Sin cuenta aprobada, la sugerida es el dueño del repositorio si su remoto es de GitHub y, si no, la sesión activa
  // (decisión nmwawb3grtit; cuentaDetectada.ts)
  const activa = t ? sesionesGh?.sesiones.find((s) => s.activa && s.login)?.login ?? null : null;
  const sugerida = t ? cuentaDetectada(r.cuentaGit, info?.remoto, activa) : null;
  const detectada = sugerida?.cuenta ?? null;
  const formCuenta = `<form id="form-cuenta-git" class="fila-form">
          <input type="text" name="cuenta" data-conserva-foco="cuenta-git" value="${esc((t ? cuentaEscrita : null) ?? r.cuentaGit ?? detectada ?? '')}" placeholder="${esc(tx('proyecto.cuentaGitPista'))}" aria-label="${esc(tx('proyecto.cuentaGit'))}"${detectada ? ' data-detectada' : ''}${t ? '' : ' readonly'} />
          ${t ? `<button type="submit" class="primario" data-cargador="cuenta-git"${atributosDelCargador(cargadorCuenta)}>${contenidoDelBoton(tx('proyecto.cuentaGitGuardar'), cargadorCuenta)}</button>${lineaDelCargador('cuenta-git', cargadorCuenta)}` : ''}
          ${activa && activa !== r.cuentaGit ? `<button type="button" data-usar-cuenta-activa="${esc(activa)}" title="${esc(tx('proyecto.cuentaGitUsarActivaTitulo'))}">${tx('proyecto.cuentaGitUsarActiva', { cuenta: esc(activa) })}</button>` : ''}
        </form>
        ${t ? lineaCuentaGuardada(cuentaGuardada) : ''}
        ${sugerida ? `<p class="como detectado-cuenta">${tx(sugerida.de === 'dueno' ? 'proyecto.cuentaGitDetectadaDueno' : 'proyecto.cuentaGitDetectada', { cuenta: esc(sugerida.cuenta) })}</p>` : ''}`;
  const formRepo = `<form id="form-repositorio" class="fila-form">
          <input type="text" name="ruta" value="${esc(r.ruta ?? '')}" placeholder="C:\\proyectos\\mi-app" aria-label="${esc(tx('proyecto.carpeta'))}" />
          <button type="button" data-explorar-repo>📁 ${tx('proyecto.explorar')}</button>
          <button type="submit" class="primario">${tx(r.ruta ? 'proyecto.usarCarpeta' : 'proyecto.conectar')}</button>
        </form>`;
  return { ancla: 'p-repositorio', titulo: tx('proyecto.dondeEsta'), cuerpo: `
        ${info ? `<p class="bien-repo">✓ ${esc(info.ruta)}</p>
          ${pestanaQa === 'no' ? `<p class="como" data-sin-pestana-qa>${tx('proyecto.sinPestanaQa')}</p>` : ''}
          <p class="como">${tx('proyecto.suMemoria')}</p>
          <p class="como"><b>${tx('proyecto.cuentaGit')}.</b> ${tx('proyecto.cuentaGitComo')}</p>
          ${formCuenta}
          ${t ? bloqueRespaldo(r, !!esElStudio) : ''}
          ${t ? panelSesionesGh(sesionesGh) : ''}
          <details class="detalles-repo"${plegable('detalles-repo')}><summary>${tx('proyecto.detallesRepo')}</summary>
            <dl class="info-repo">
              <dt>${tx('proyecto.rama')}</dt><dd>${esc(info.rama)}</dd>
              <dt>${tx('proyecto.historial')}</dt><dd>${tx('proyecto.commitsArchivos', { commits: info.commits.toLocaleString(lenguaje()), archivos: info.archivos.toLocaleString(lenguaje()) })}${info.sinCommit ? ` · ${tx('proyecto.sinCommit', { n: info.sinCommit })}` : ''}</dd>
              <dt>${tx('proyecto.ultimoCommit')}</dt><dd>${info.ultimo ? `${fecha(info.ultimo.fecha)} · ${esc(info.ultimo.autor)}: «${esc(info.ultimo.asunto)}»` : '—'}</dd>
              <dt>${tx('proyecto.remoto')}</dt><dd>${esc(info.remoto ?? tx('proyecto.sinRemoto'))}</dd>
            </dl>
            <p class="como">${tx('proyecto.moviste')}</p>
            ${formRepo}
          </details>`
        : `<p class="como">${tx('proyecto.laCarpeta')}</p>${formRepo}${r.error ? `<p class="aviso remoto">${esc(r.error)}</p>` : ''}`}
        ${alFinal}` };
}

/** Qué es el proyecto y qué busca: lo que el director detectó llena el campo vacío, dicho como suyo. */
function seccionContexto({ proyecto: p, plan, titular: t, nuevo }: DatosProyecto): SeccionProyecto {
  const soloLectura = t ? '' : ' readonly';
  const det = plan.detectado;
  const ctx = p.contexto || det?.contexto || '';
  const meta = p.metaInicial || det?.meta || '';
  // «Detectado» (pd_diagnostico_llena): lo del director llena solo el campo vacío. Si ya hay texto tuyo, se queda y nada
  // ofrece reemplazarlo (nmwpvoj9mtit, que quitó el recuadro «Usar esto» de nmwajf3a8tit)
  const detectado = `<b>✦ ${tx('proyecto.detectado')}</b>`;
  const marca = (usa: boolean, texto: string) => (usa ? `<small class="detectado">${detectado} · ${texto}</small>` : '');
  return { ancla: 'p-contexto', titulo: `${tx('proyecto.queEs')} <span class="chip ${nuevo ? 'apoyo' : 'foco'}">${tx(nuevo ? 'proyecto.nuevo' : 'proyecto.existente')}</span>`, cuerpo: `
        <p class="como">${tx(nuevo ? 'proyecto.queEsNuevo' : 'proyecto.queEsExistente')}${t ? '' : ` ${tx('proyecto.loEscribeTitular')}`}</p>
        <form id="form-proyecto" class="form-proyecto">
          <label>${tx('proyecto.nombre')}<input type="text" name="nombre" value="${esc(p.nombre)}" required${soloLectura} /></label>
          <label class="ancho">${tx('proyecto.contexto')}<textarea name="contexto" rows="5"${soloLectura} placeholder="${esc(tx('proyecto.contextoPista'))}">${esc(ctx)}</textarea>${marca(!p.contexto && !!det?.contexto, tx('proyecto.detectoContexto'))}${p.contextoPorTraducir && p.contexto ? `<small class="pista-campo por-traducir">${tx('proyecto.seTraducira')}</small>` : ''}</label>
          <label class="ancho">${tx(nuevo ? 'proyecto.quieresLograr' : 'proyecto.tuMeta')}<textarea name="metaInicial" rows="3"${soloLectura} placeholder="${esc(tx('proyecto.metaPista'))}">${esc(meta)}</textarea>${marca(!p.metaInicial && !!det?.meta, tx('proyecto.detectoMeta'))}</label>
          ${nuevo ? `<label class="ancho">${tx('proyecto.cuandoCompleto')}<textarea name="terminado" rows="2"${soloLectura} placeholder="${esc(tx('proyecto.completoPista'))}">${esc(p.terminado ?? '')}</textarea></label>` : ''}
          ${t ? `<div class="botones"><button type="submit" class="primario">${tx('proyecto.guardar')}</button></div>` : ''}
        </form>
        ${tablaPartes(plan.frentes, t)}
        ${tablaArchivosClave(plan.archivosClave)}` };
}

/**
 * Las partes del proyecto (sus frentes), en el idioma de la interfaz (pd_nombres_dos_idiomas): su nombre y lo que hace, y
 * para el titular un lápiz que abre los dos campos para corregirlos en su idioma (nmwpmfyv5tit); el director reescribe el
 * otro idioma en la revisión siguiente (nmwpsv4jytit). Llegan ya en su idioma (app.ts › planEnSuIdioma).
 */
function tablaPartes(frentes: Plan['frentes'] = [], t: boolean) {
  if (!frentes.length) return '';
  const fila = (f: Plan['frentes'][number]) => `<tr data-ancla="parte-${esc(f.id)}"><td>${esc(f.nombre)}</td><td>${esc(f.que)}${t ? `
            <details class="corregir-parte"><summary title="${esc(tx('proyecto.corregirParte'))}" aria-label="${esc(tx('proyecto.corregirParte'))}">✎</summary>
              <form class="form-proyecto" data-parte="${esc(f.id)}">
                <label>${tx('proyecto.parteNombre')}<input type="text" name="nombre" value="${esc(f.nombre)}" required maxlength="120" /></label>
                <label class="ancho">${tx('proyecto.parteQue')}<textarea name="que" rows="2">${esc(f.que)}</textarea></label>
                <div class="botones"><button type="submit" class="primario">${tx('proyecto.guardarParte')}</button></div>
              </form>
            </details>` : ''}</td></tr>`;
  return `<div class="partes-proyecto"><h4>${tx('proyecto.partes')}</h4><table class="tabla-clave"><thead><tr><th>${tx('proyecto.parteNombre')}</th><th>${tx('proyecto.parteQue')}</th></tr></thead><tbody>${frentes.map(fila).join('')}</tbody></table></div>`;
}

/**
 * Los archivos clave del proyecto, también en la sección que lo presenta, debajo de «Qué es» (pd_about; el titular eligió
 * ese lugar en t_decide_about_lugar): una tabla corta de nombre y para qué sirve, y un clic en el nombre lo abre, como en
 * «Documentos».
 */
function tablaArchivosClave(claves: ArchivoClave[] = []) {
  if (!claves.length) return '';
  return `<div class="archivos-clave-proyecto"><h4>${tx('docs.archivosClave')}</h4><table class="tabla-clave"><thead><tr><th>${tx('proyecto.claveArchivo')}</th><th>${tx('proyecto.clavePara')}</th></tr></thead><tbody>${claves.map((c) => `<tr><td><button type="button" class="enlace-clave" data-doc="${esc(`repo:${c.ruta}`)}">${esc(c.ruta)}</button></td><td>${esc(paraEnIdioma(c.para, idiomaActual()))}</td></tr>`).join('')}</tbody></table></div>`;
}

/** Las metas que la pantalla ofrece: dos, como mucho (la más corta que deja algo valioso y la que mejor encaja). */
const MAX_METAS_CANDIDATAS = 2;

/**
 * Un candidato del director, editable (decisiones del titular del 10 de noviembre de 2026: dos metas, nmwajg0sptit; «solo
 * las dos, editables», sin campo para una meta propia, nmwakupiftit): lo que se logra, cómo se sabe y el horizonte, ya
 * escritos y listos para cambiarlos; «Confirmar la meta y trazar la ruta» la fija y pide la revisión que traza la ruta
 * (nmwajgncftit), con su origen propio (proyectos.ts › ORIGENES_REVISION › confirmar_meta).
 */
function candidatoEditable(c: NonNullable<Plan['objetivos']>[number], b: BorradorMeta | null, t: boolean) {
  const v = b?.candidato === c.id ? b : { texto: c.texto, exito: c.exito, horizonte: c.horizonte ?? '', candidato: c.id };
  const motivo = `<p><span class="tit">${tx('proyecto.porQue')}</span> ${esc(c.porQue)}</p>
              ${c.riesgo ? `<p><span class="tit">${tx('proyecto.riesgo')}</span> ${esc(c.riesgo)}</p>` : ''}`;
  if (!t) {
    return `<article class="candidato" data-ancla="objetivo-${esc(c.id)}">
              <b>${esc(c.texto)}</b>
              <p><span class="tit">${tx('proyecto.exito')}</span> ${esc(c.exito)}</p>
              ${motivo}
              ${c.horizonte ? `<p><span class="tit">${tx('proyecto.horizonteCorto')}</span> ${esc(c.horizonte)}</p>` : ''}
              <div class="acciones-p"><button type="button" class="al-director" data-comentar="objetivo|${esc(c.id)}">✉ ${tx('proyecto.comentar')}</button></div>
            </article>`;
  }
  return `<article class="candidato editable" data-ancla="objetivo-${esc(c.id)}">
              <form class="form-proyecto form-meta-candidato" data-meta-candidato="${esc(c.id)}">
                <input type="hidden" name="candidato" value="${esc(c.id)}" />
                <label class="ancho">${tx('proyecto.aDonde')}<textarea name="texto" rows="5" required>${esc(v.texto)}</textarea></label>
                <label class="ancho">${tx('proyecto.comoSabremosCampo')}<textarea name="exito" rows="5" required>${esc(v.exito)}</textarea></label>
                <label class="ancho">${tx('proyecto.horizonteCampo')}<input type="text" name="horizonte" value="${esc(v.horizonte)}" placeholder="${esc(tx('proyecto.horizontePista'))}" /></label>
                <div class="ancho motivo-candidato">${motivo}</div>
                <div class="botones ancho"><button type="button" class="al-director" data-comentar="objetivo|${esc(c.id)}">✉ ${tx('proyecto.comentar')}</button><button type="submit" class="primario" data-origen="confirmar_meta" title="${esc(tx('proyecto.confirmarMetaTitulo'))}">${tx('proyecto.confirmarMeta')}</button></div>
              </form>
            </article>`;
}

/**
 * La meta: la fijada; o, sin ella, las dos metas del director, editables, cada una con «Confirmar la meta y trazar la
 * ruta»; y las metas anteriores, plegadas. Sin candidatos (antes del diagnóstico, o un plan que no los trae), el formulario
 * para escribirla, que confirma igual: es lo único que hay para fijarla.
 */
function seccionMeta({ proyecto: p, plan, titular: t, borrador, plegable, nuevo }: DatosProyecto): SeccionProyecto {
  const o = p.objetivo;
  const b = borrador ?? { texto: '', exito: '', horizonte: '', candidato: '' };
  const candidatos = (plan.objetivos ?? []).slice(0, MAX_METAS_CANDIDATAS);
  // Mientras el proyecto arranca (sin meta fijada), arriba, la barra de las cinco paradas (pd_entrega_fluida, nmwdhtp2ntit)
  const parada = paradaDeLaMeta(!!o, !!plan.diagnostico.fecha);
  return { ancla: 'p-objetivo', titulo: tx('proyecto.laMeta'), cuerpo: `
        ${parada ? htmlParadas(parada, nuevo) : ''}
        ${o ? `<div class="objetivo-firmado">
            <span class="etiqueta">${tx('proyecto.metaFijada')} · ${fecha(o.firmado.fecha)} · ${esc(o.firmado.quien)}</span>
            <p class="obj-texto">${esc(o.texto)}</p>
            <p><b>${tx('proyecto.comoSabremos')}</b> ${esc(o.exito)}</p>
            ${o.horizonte ? `<p><b>${tx('proyecto.horizonte')}</b> ${esc(o.horizonte)}</p>` : ''}
            <div class="acciones-p">${t ? `<button type="button" data-replantear-objetivo>${tx('proyecto.replantear')}</button>` : ''}<button type="button" class="al-director" data-comentar="objetivo|">✉ ${tx('proyecto.comentarDirector')}</button></div>
          </div>`
        : candidatos.length ? `<p class="como">${tx('proyecto.metaClara')} ${tx('proyecto.eligeUnaDeDos')}</p>
          <div class="candidatos${candidatos.length === 2 ? ' dos' : ''}">${candidatos.map((c) => candidatoEditable(c, borrador, t)).join('')}</div>
          ${t ? '' : `<p class="nota-rol">${tx('proyecto.laFijaTitular')}</p>`}`
        : `<p class="como">${tx('proyecto.metaClara')} ${tx(plan.diagnostico.fecha ? 'proyecto.escribela' : 'proyecto.despuesDiagnostico')}</p>
          ${t ? `<form id="form-objetivo" class="form-proyecto">
            <input type="hidden" name="candidato" value="${esc(b.candidato)}" />
            <label class="ancho">${tx('proyecto.aDonde')}<textarea name="texto" rows="2" required placeholder="${esc(tx('proyecto.aDondePista'))}">${esc(b.texto)}</textarea></label>
            <label class="ancho">${tx('proyecto.comoSabremosCampo')}<textarea name="exito" rows="2" required placeholder="${esc(tx('proyecto.exitoPista'))}">${esc(b.exito)}</textarea></label>
            <label>${tx('proyecto.horizonteCampo')}<input type="text" name="horizonte" value="${esc(b.horizonte)}" placeholder="${esc(tx('proyecto.horizontePista'))}" /></label>
            <div class="botones"><button type="submit" class="primario" data-origen="confirmar_meta" title="${esc(tx('proyecto.confirmarMetaTitulo'))}">${tx('proyecto.confirmarMeta')}</button></div>
          </form>` : `<p class="nota-rol">${tx('proyecto.laFijaTitular')}</p>`}`}
        ${(p.objetivosAnteriores ?? []).length ? `<details class="detalles-repo metas-anteriores"${plegable('metas-anteriores')}><summary>${tx('proyecto.metasAnteriores')} <span class="cifra">${p.objetivosAnteriores!.length}</span></summary><ul class="adelantado">${p.objetivosAnteriores!.map((x) => `<li>«${esc(x.texto)}» <small>(${tx('proyecto.fijadaReplanteada', { fijada: fecha(x.firmado.fecha), replanteada: fecha(x.reabierto.fecha) })}${x.reabierto.nota ? `: ${esc(x.reabierto.nota)}` : ''})</small></li>`).join('')}</ul></details>` : ''}` };
}

/** La vista entera: sus pestañas y, a todo lo ancho, la que está a la vista (sin ella, la primera de su orden). */
export function vistaProyecto(datos: DatosProyecto) {
  const o = datos.proyecto.objetivo;
  const orden = pestanasProyecto(!!o, eligiendoMeta(datos.proyecto, datos.plan));
  const pestana = datos.pestana && orden.includes(datos.pestana) ? datos.pestana : orden[0];
  const barra = `<div class="pestanas-stl pestanas-proyecto" role="tablist" aria-label="${esc(tx('nav.proyecto'))}">${orden.map((p) => {
    const sel = p === pestana;
    return `<button type="button" role="tab" id="pestana-proyecto-${p}" class="pestana-stl${sel ? ' sel' : ''}" data-pestana-proyecto="${p}" aria-selected="${sel}"${sel ? ` aria-controls="panel-proyecto-${p}"` : ''} tabindex="${sel ? 0 : -1}">${nombrePestana(p, datos.nuevo)}</button>`;
  }).join('')}</div>`;
  const seccion = { objetivo: seccionMeta, contexto: seccionContexto, diagnostico: (x: DatosProyecto) => x.diagnostico, repositorio: seccionRepositorio };
  const cuerpo = [seccionEnPestana(seccion[pestana](datos))];
  return `<p class="intro">${tx(o ? 'proyecto.introConMeta' : 'proyecto.introSinMeta')} ${tx('proyecto.introMemoria')}</p>
  ${barra}
  <div role="tabpanel" id="panel-proyecto-${pestana}" aria-labelledby="pestana-proyecto-${pestana}" class="panel-pestana-proyecto p-${pestana}">
      ${cuerpo.join('\n      ')}
  </div>`;
}
