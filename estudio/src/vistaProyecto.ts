// La vista «Proyecto»: dónde está, qué es, la meta, el diagnóstico y el equipo. Salió de app.ts al partir los
// módulos grandes (propuesta aceptada pr_partir_modulos), como «Permisos» (vistaPermisos.ts) y la bitácora
// (bitacoraDelComputador.ts): recibe lo que pinta y no guarda nada; leer del servidor, guardar los formularios, el
// borrador de la meta y los clics siguen en la página.
import { TITULAR, type Integrante, type Plan, type Proyecto } from '../../src/director/director';
import { IDIOMAS } from '../../src/director/idioma';
import type { ArchivoClave } from '../../src/director/archivosClave';
import type { EntradaGh, SesionGh } from '../../src/director/cuentaGit';
import type { InfoRepositorio } from '../../src/director/repositorio';
import { fecha } from './formato';
import { lenguaje, t as tx } from './textos';
import { esc } from './util';

/** La meta mientras se escribe, o el candidato elegido con «Usar este»: lo guarda la página. */
export interface BorradorMeta { texto: string; exito: string; horizonte: string; candidato: string }

/** Lo que pinta la vista. La página se lo da con sus datos y con lo que depende de ella. */
export interface DatosProyecto {
  proyecto: Proyecto;
  repositorio: { ruta: string | null; info: InfoRepositorio | null; error: string | null; cuentaGit?: string | null };
  plan: Pick<Plan, 'objetivos' | 'boletin' | 'detectado' | 'diagnostico' | 'archivosClave'>;
  /** Si quien mira es el titular: solo él escribe el proyecto, la meta y el equipo. */
  titular: boolean;
  /** Quién mira (su id en el equipo): marca en su ficha los idiomas que lee. */
  yo?: string;
  /** Proyecto nuevo (se plantea) o existente (se diagnostica). */
  nuevo: boolean;
  borrador: BorradorMeta | null;
  /** El nombre y el correo de git del titular, para cuando el equipo aún no está registrado. */
  nombreTitular: string;
  correo: string;
  /** Lo que dice la sincronización de lo que sube (vacío si no hay nada que decir). */
  subida: string;
  /** La sección del diagnóstico, ya pintada por la página. */
  diagnostico: string;
  /** Si un plegable nace abierto (lo recuerda la página). */
  plegable: (clave: string) => string;
  /** Las sesiones de gh, solo para el titular: null mientras no se pidieron (las trae la página, aparte). */
  sesionesGh?: PanelSesionesGh | null;
}

/** Lo que el panel de las sesiones de gh sabe (src/director/cuentaGit.ts › sesionesDeGh, entrarConGh). */
export interface PanelSesionesGh {
  cargando: boolean;
  hayGh: boolean;
  aprobada: string | null;
  sesiones: SesionGh[];
  entrada: EntradaGh | null;
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

/** Dónde está el repositorio: la carpeta y, plegado, lo de git (no hace falta para dirigir). */
function seccionRepositorio({ repositorio: r, plegable, titular: t, sesionesGh }: DatosProyecto) {
  const info = r.info;
  // La cuenta de GitHub aprobada para este proyecto (src/director/cuentaGit.ts): sin ella, nada sube, baja ni publica
  const formCuenta = `<form id="form-cuenta-git" class="fila-form">
          <input type="text" name="cuenta" value="${esc(r.cuentaGit ?? '')}" placeholder="${esc(tx('proyecto.cuentaGitPista'))}" aria-label="${esc(tx('proyecto.cuentaGit'))}"${t ? '' : ' readonly'} />
          ${t ? `<button type="submit" class="primario">${tx('proyecto.cuentaGitGuardar')}</button>` : ''}
        </form>`;
  const formRepo = `<form id="form-repositorio" class="fila-form">
          <input type="text" name="ruta" value="${esc(r.ruta ?? '')}" placeholder="C:\\proyectos\\mi-app" aria-label="${esc(tx('proyecto.carpeta'))}" />
          <button type="button" data-explorar-repo>📁 ${tx('proyecto.explorar')}</button>
          <button type="submit" class="primario">${tx(r.ruta ? 'proyecto.usarCarpeta' : 'proyecto.conectar')}</button>
        </form>`;
  return `<section class="panel-d" data-ancla="p-repositorio">
        <h3>${tx('proyecto.dondeEsta')}</h3>
        ${info ? `<p class="bien-repo">✓ ${esc(info.ruta)}</p>
          <p class="como">${tx('proyecto.suMemoria')}</p>
          <p class="como"><b>${tx('proyecto.cuentaGit')}.</b> ${tx('proyecto.cuentaGitComo')}</p>
          ${formCuenta}
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
      </section>`;
}

/** Qué es el proyecto y qué busca: lo que el director detectó llena el campo vacío, dicho como suyo. */
function seccionContexto({ proyecto: p, repositorio, plan, titular: t, nuevo, plegable }: DatosProyecto) {
  const soloLectura = t ? '' : ' readonly';
  const info = repositorio.info;
  const det = plan.detectado;
  const ctx = p.contexto || det?.contexto || '';
  const meta = p.metaInicial || det?.meta || '';
  const marca = (usa: boolean, texto: string) => (usa ? `<small class="detectado">✦ ${texto}</small>` : '');
  return `<section class="panel-d" data-ancla="p-contexto">
        <h3>${tx('proyecto.queEs')} <span class="chip ${nuevo ? 'apoyo' : 'foco'}">${tx(nuevo ? 'proyecto.nuevo' : 'proyecto.existente')}</span></h3>
        <p class="como">${tx(nuevo ? 'proyecto.queEsNuevo' : 'proyecto.queEsExistente')}${t ? '' : ` ${tx('proyecto.loEscribeTitular')}`}</p>
        <form id="form-proyecto" class="form-proyecto">
          <label>${tx('proyecto.nombre')}<input type="text" name="nombre" value="${esc(p.nombre)}" required${soloLectura} /></label>
          <label class="ancho">${tx('proyecto.contexto')}<textarea name="contexto" rows="5"${soloLectura} placeholder="${esc(tx('proyecto.contextoPista'))}">${esc(ctx)}</textarea>${marca(!p.contexto && !!det?.contexto, tx('proyecto.detectoContexto'))}</label>
          <label class="ancho">${tx(nuevo ? 'proyecto.quieresLograr' : 'proyecto.tuMeta')}<textarea name="metaInicial" rows="3"${soloLectura} placeholder="${esc(tx('proyecto.metaPista'))}">${esc(meta)}</textarea>${marca(!p.metaInicial && !!det?.meta, tx('proyecto.detectoMeta'))}</label>
          ${nuevo ? `<label class="ancho">${tx('proyecto.cuandoCompleto')}<textarea name="terminado" rows="2"${soloLectura} placeholder="${esc(tx('proyecto.completoPista'))}">${esc(p.terminado ?? '')}</textarea></label>` : ''}
          <details class="ancho mas-datos"${plegable('mas-datos')}><summary>${tx('proyecto.masDatos')}</summary>
            <div class="form-proyecto">
              <label>${tx('proyecto.direccionWeb')}<input type="text" name="url" value="${esc(p.repositorio.url)}"${soloLectura} placeholder="https://github.com/…" /></label>
              <label>${tx('proyecto.ramaPrincipal')}<input type="text" name="rama" value="${esc(p.repositorio.rama || info?.rama || '')}"${soloLectura} placeholder="main" /></label>
            </div>
          </details>
          ${t ? `<div class="botones"><button type="submit" class="primario">${tx('proyecto.guardar')}</button></div>` : ''}
        </form>
        ${tablaArchivosClave(plan.archivosClave)}
      </section>`;
}

/**
 * Los archivos clave del proyecto, también en la sección que lo presenta, debajo de «Qué es» (pd_about; el titular eligió
 * ese lugar en t_decide_about_lugar): una tabla corta de nombre y para qué sirve, y un clic en el nombre lo abre, como en
 * «Documentos».
 */
function tablaArchivosClave(claves: ArchivoClave[] = []) {
  if (!claves.length) return '';
  return `<div class="archivos-clave-proyecto"><h4>${tx('docs.archivosClave')}</h4><table class="tabla-clave"><thead><tr><th>${tx('proyecto.claveArchivo')}</th><th>${tx('proyecto.clavePara')}</th></tr></thead><tbody>${claves.map((c) => `<tr><td><button type="button" class="enlace-clave" data-doc="${esc(`repo:${c.ruta}`)}">${esc(c.ruta)}</button></td><td>${esc(c.para)}</td></tr>`).join('')}</tbody></table></div>`;
}

/** La meta: la fijada, o los candidatos del director y el formulario para fijarla; y las metas anteriores, plegadas. */
function seccionMeta({ proyecto: p, plan, titular: t, borrador, plegable }: DatosProyecto) {
  const o = p.objetivo;
  const b = borrador ?? { texto: '', exito: '', horizonte: '', candidato: '' };
  const candidatos = plan.objetivos ?? [];
  return `<section class="panel-d" data-ancla="p-objetivo">
        <h3>${tx('proyecto.laMeta')}</h3>
        ${o ? `<div class="objetivo-firmado">
            <span class="etiqueta">${tx('proyecto.metaFijada')} · ${fecha(o.firmado.fecha)} · ${esc(o.firmado.quien)}</span>
            <p class="obj-texto">${esc(o.texto)}</p>
            <p><b>${tx('proyecto.comoSabremos')}</b> ${esc(o.exito)}</p>
            ${o.horizonte ? `<p><b>${tx('proyecto.horizonte')}</b> ${esc(o.horizonte)}</p>` : ''}
            <div class="acciones-p">${t ? `<button type="button" data-replantear-objetivo>${tx('proyecto.replantear')}</button>` : ''}<button type="button" class="al-director" data-comentar="objetivo|">✉ ${tx('proyecto.comentarDirector')}</button></div>
          </div>`
        : `<p class="como">${tx('proyecto.metaClara')} ${tx(plan.diagnostico.fecha ? 'proyecto.eligeCandidato' : 'proyecto.despuesDiagnostico')}</p>
          ${candidatos.length ? `<div class="candidatos">${candidatos.map((c) => `<article class="candidato${b.candidato === c.id ? ' sel' : ''}" data-ancla="objetivo-${esc(c.id)}">
              <b>${esc(c.texto)}</b>
              <p><span class="tit">${tx('proyecto.exito')}</span> ${esc(c.exito)}</p>
              <p><span class="tit">${tx('proyecto.porQue')}</span> ${esc(c.porQue)}</p>
              ${c.riesgo ? `<p><span class="tit">${tx('proyecto.riesgo')}</span> ${esc(c.riesgo)}</p>` : ''}
              ${c.horizonte ? `<p><span class="tit">${tx('proyecto.horizonteCorto')}</span> ${esc(c.horizonte)}</p>` : ''}
              <div class="acciones-p">${t ? `<button type="button" data-usar-candidato="${esc(c.id)}">${tx('proyecto.usarEste')}</button>` : ''}<button type="button" class="al-director" data-comentar="objetivo|${esc(c.id)}">✉ ${tx('proyecto.comentar')}</button></div>
            </article>`).join('')}</div>` : ''}
          ${t ? `<form id="form-objetivo" class="form-proyecto">
            <input type="hidden" name="candidato" value="${esc(b.candidato)}" />
            <label class="ancho">${tx('proyecto.aDonde')}<textarea name="texto" rows="2" required placeholder="${esc(tx('proyecto.aDondePista'))}">${esc(b.texto)}</textarea></label>
            <label class="ancho">${tx('proyecto.comoSabremosCampo')}<textarea name="exito" rows="2" required placeholder="${esc(tx('proyecto.exitoPista'))}">${esc(b.exito)}</textarea></label>
            <label>${tx('proyecto.horizonteCampo')}<input type="text" name="horizonte" value="${esc(b.horizonte)}" placeholder="${esc(tx('proyecto.horizontePista'))}" /></label>
            <div class="botones"><button type="submit" class="primario">${tx('proyecto.fijarMeta')}</button></div>
          </form>` : `<p class="nota-rol">${tx('proyecto.laFijaTitular')}</p>`}`}
        ${(p.objetivosAnteriores ?? []).length ? `<details class="detalles-repo metas-anteriores"${plegable('metas-anteriores')}><summary>${tx('proyecto.metasAnteriores')} <span class="cifra">${p.objetivosAnteriores!.length}</span></summary><ul class="adelantado">${p.objetivosAnteriores!.map((x) => `<li>«${esc(x.texto)}» <small>(${tx('proyecto.fijadaReplanteada', { fijada: fecha(x.firmado.fecha), replanteada: fecha(x.reabierto.fecha) })}${x.reabierto.nota ? `: ${esc(x.reabierto.nota)}` : ''})</small></li>`).join('')}</ul></details>` : ''}
      </section>`;
}

/** El equipo, con su boletín si hay, y el formulario para sumar a alguien (solo el titular). */
function seccionEquipo({ proyecto: p, plan, titular: t, nombreTitular, correo, yo }: DatosProyecto) {
  const equipo = [...plan.boletin].reverse().find((x) => x.para === 'equipo');
  // Los idiomas que lee cada persona (pd_reglas_lectura): los marca el titular, o ella misma en su ficha; los demás los ven
  const lee = (i: Integrante) => {
    if (!p.equipo.some((x) => x.id === i.id)) return '';
    const puede = t || yo === i.id;
    if (!puede) return `<small class="lee-idiomas">${tx('proyecto.lee')}: ${i.lee?.length ? IDIOMAS.filter((x) => i.lee!.includes(x)).map((x) => esc(tx(`idioma.${x}`))).join(', ') : tx('proyecto.leeNada')}</small>`;
    return `<span class="lee-idiomas" role="group" aria-label="${esc(tx('proyecto.leeTitulo'))}" title="${esc(tx('proyecto.leeTitulo'))}">${tx('proyecto.lee')}:${IDIOMAS.map((x) => `<label><input type="checkbox" data-lee="${esc(i.id)}|${x}"${i.lee?.includes(x) ? ' checked' : ''} /> ${esc(tx(`idioma.${x}`))}</label>`).join('')}</span>`;
  };
  return `<section class="panel-d" data-ancla="p-equipo">
        <h3>${tx('proyecto.elEquipo')}</h3>
        ${equipo ? `<div class="boletin-equipo"><p class="etiqueta-boletin">${tx('proyecto.boletin')} · ${fecha(equipo.fecha)}</p><div class="notas-boletin">${Object.entries(equipo.notas).map(([k, v]) => `<span><span class="nota-letra ${v}">${v}</span>${esc(k)}</span>`).join('')}</div><p>${esc(equipo.comentario)}</p></div>` : ''}
        <p class="como">${tx('proyecto.equipoExplica')}</p>
        <ul class="lista-equipo">${(p.equipo.length ? p.equipo : [{ id: TITULAR, nombre: nombreTitular, correo, cargo: tx('proyecto.cargoTitular') }])
          .map((i) => `<li><span class="monograma">${esc(i.nombre.charAt(0))}</span><div><b>${esc(i.nombre)}</b>${i.id === TITULAR ? ` <span class="chip foco">${tx('proyecto.titular')}</span>` : ''}<small>${esc(i.cargo ?? '')}${i.cargo ? ' · ' : ''}${esc(i.correo)}</small>${lee(i)}</div>${t && i.id !== TITULAR ? `<button type="button" data-quitar-integrante="${esc(i.id)}">${tx('proyecto.quitar')}</button>` : ''}</li>`)
          .join('')}</ul>
        ${t ? `<form id="form-integrante" class="form-proyecto">
          <label>${tx('proyecto.nombrePersona')}<input type="text" name="nombre" required /></label>
          <label>${tx('proyecto.correoGit')}<input type="text" name="correo" required placeholder="${esc(tx('proyecto.correoPista'))}" /></label>
          <label>${tx('proyecto.cargo')}<input type="text" name="cargo" placeholder="${esc(tx('proyecto.cargoPista'))}" /></label>
          <label>${tx('proyecto.papel')}<input type="text" name="papel" placeholder="${esc(tx('proyecto.papelPista'))}" /></label>
          <div class="botones"><button type="submit">${tx('proyecto.sumar')}</button></div>
        </form>` : ''}
      </section>`;
}

/** Varios computadores: la opción de subir solo lo que decide cada persona. */
function seccionSincronizar({ proyecto: p, titular: t, subida }: DatosProyecto) {
  return `<section class="panel-d" data-ancla="p-sincronizar">
        <h3>${tx('proyecto.variosComputadores')}</h3>
        <p class="como">${tx('proyecto.variosExplica')}</p>
        <label class="interruptor-s"><input type="checkbox" data-sincronizar${p.sincronizar ? ' checked' : ''}${t ? '' : ' disabled'} /> ${tx('proyecto.subirSolo')}</label>
        <p class="como">${esc(subida)}</p>
      </section>`;
}

/** La vista entera, en dos columnas. */
export function vistaProyecto(datos: DatosProyecto) {
  const o = datos.proyecto.objetivo;
  const repo = seccionRepositorio(datos);
  const contexto = seccionContexto(datos);
  const meta = seccionMeta(datos);
  // Con la meta fijada, va arriba: es contra lo que se mide todo. Antes, el orden del arranque: dónde está, qué es, el
  // diagnóstico del director y la meta (decidido en «Un Studio más simple»: el diagnóstico vive en Proyecto, plegado)
  const orden = o ? [meta, contexto, datos.diagnostico, repo] : [repo, contexto, datos.diagnostico, meta];
  return `<p class="intro">${tx(o ? 'proyecto.introConMeta' : 'proyecto.introSinMeta')} ${tx('proyecto.introMemoria')}</p>
  <div class="dos-columnas">
    <div>
      ${orden.join('\n      ')}
    </div>
    <div>
      ${seccionEquipo(datos)}
      ${seccionSincronizar(datos)}
    </div>
  </div>`;
}
