// Las vistas de apoyo: el método (cómo trabaja el equipo con el director y las lecciones de los mejores), la bitácora (cada
// decisión, firmada) y los frentes (lo que hace cada uno en cada fase, con sus excepciones). Salieron de app.ts al partir los
// módulos grandes (propuesta aceptada pr_partir_modulos), como la vista del esfuerzo: reciben lo que pintan y no guardan nada;
// lo que depende de la página (el botón que lleva al método, la celda elegida) llega hecho.
import { excepcionesActivas, faseActual, SIN_TRABAJO_EN_FASE, trabajoDe, type EstadoDirector, type Fase, type Plan } from '../../src/director/director';
import { chipNivel, fecha, NOMBRE_NIVEL } from './formato';
import { t as tx } from './textos';
import { esc } from './util';

/** Lo que un frente hace en una fase, en el idioma de quien lee: lo que el plan escribió se deja tal cual; lo que dice el Studio, no. */
export const queDelFrente = (que: string) => (que === SIN_TRABAJO_EN_FASE ? tx('frentes.sinNombrar') : que);

/** Lo que la vista del método lee: el plan, el nombre de quien dirige y el botón que lleva al método completo. */
export interface DatosMetodo { plan: Plan; nombreTitular: string; botonMetodo: string }

export function vistaMetodo(d: DatosMetodo) {
  const titular = esc(d.nombreTitular);
  return `<p class="intro">${tx('metodo.intro')}</p>
    <h3>${tx('metodo.comoFunciona')}</h3>
    <ol class="ritmo">
      <li>${tx('metodo.arranque', { titular })}</li>
      <li>${tx('metodo.asigna')}</li>
      <li>${tx('metodo.hacen')}</li>
      <li>${tx('metodo.opinan')}</li>
      <li>${tx('metodo.revisa', { titular })}</li>
      <li>${tx('metodo.decide', { titular })}</li>
    </ol>
    <p>${d.botonMetodo}</p>
    <h3>${tx('metodo.ritmo')}</h3><ol class="ritmo">${d.plan.ritmo.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>
    <h3>${tx('metodo.lecciones')}</h3><div class="lecciones">${d.plan.lecciones
      .map((l) => `<article class="leccion"><b>${esc(l.titulo)}</b><span class="quien">${esc(l.quien)}</span><span>${esc(l.que)}</span><span class="para"><b>${tx('metodo.paraEste')}</b> ${esc(l.paraElProyecto)}</span><a href="${esc(l.fuente)}" target="_blank" rel="noopener noreferrer">${esc(l.fuente)}</a></article>`)
      .join('')}</div>`;
}

/** Lo que la vista de la bitácora lee: lo anotado del proyecto abierto. */
export interface DatosBitacora { estado: EstadoDirector }

export function vistaBitacora(d: DatosBitacora) {
  return `<p class="intro">${tx('bitacora.intro')}</p>
    <form id="form-nota" class="panel-d form-nota">
      <textarea name="texto" rows="2" aria-label="${tx('bitacora.notaAria')}" placeholder="${tx('bitacora.notaPista')}"></textarea>
      <button type="submit">${tx('bitacora.anotar')}</button></form>
    <ul class="bitacora">${[...d.estado.bitacora]
      .reverse()
      .map((b) => `<li><span class="f">${fecha(b.fecha)}</span><span class="q">${esc(b.quien)}</span><span>${esc(b.texto)}</span></li>`)
      .join('')}</ul>`;
}

/** Lo que la vista de los frentes lee: el proyecto abierto, el día de hoy, la celda elegida y lo que dice si hay trabajo. */
export interface DatosFrentes {
  plan: Plan;
  estado: EstadoDirector;
  /** El día de hoy, para saber qué excepciones siguen abiertas. */
  hoy: string;
  /** La celda que se eligió para leerla (frente y fase), o ninguna. */
  celda: { frente: string; fase: string } | null;
  /** Lo que la página pinta al final: si se puede trabajar en un frente (puedoTrabajar). */
  puedoTrabajar: string;
}

export function vistaFrentes(d: DatosFrentes) {
  const actual = faseActual(d.plan, d.estado);
  const celda = d.celda;
  const sel = celda && d.plan.fases.find((f) => f.id === celda.fase);
  const activas = excepcionesActivas(d.estado, d.hoy);
  const recientes = d.estado.excepciones.filter((e) => !activas.includes(e)).slice(-8).reverse();
  const numeroFase = (f: Fase) => d.plan.fases.indexOf(f);
  const nombreFrente = (id: string) => d.plan.frentes.find((f) => f.id === id)?.nombre ?? id;
  return `<p class="intro">${tx('frentes.intro')}</p>
    <div><table class="matriz">
      <thead><tr><th></th>${d.plan.fases.map((f) => `<th class="${f === actual ? 'actual' : ''}">${numeroFase(f)}. ${esc(f.nombre)}</th>`).join('')}</tr></thead>
      <tbody>${d.plan.frentes
        .map((x) => `<tr><th>${esc(x.nombre)}${x.rutas.length ? `<small class="rutas-f">${x.rutas.map(esc).join(', ')}</small>` : ''}</th>${d.plan.fases
          .map((f) => {
            const t = trabajoDe(f, x.id);
            const es = celda?.frente === x.id && celda?.fase === f.id;
            return `<td class="${f === actual ? 'actual' : ''}"><button type="button" class="${t.nivel}${es ? ' sel' : ''}" data-celda="${esc(x.id)}|${esc(f.id)}" title="${esc(queDelFrente(t.que))}">${NOMBRE_NIVEL[t.nivel]}</button></td>`;
          })
          .join('')}</tr>`)
        .join('')}</tbody></table></div>
    ${sel && celda ? `<div class="panel-d detalle-celda">${tx('frentes.enFase', { frente: esc(nombreFrente(celda.frente)), fase: esc(sel.nombre) })} ${chipNivel(trabajoDe(sel, celda.frente).nivel)}<p>${esc(queDelFrente(trabajoDe(sel, celda.frente).que))}</p></div>` : ''}
    <h3>${tx('frentes.abiertas')} <small>${tx('frentes.abiertasNota')}</small></h3>
    ${activas.length ? `<ul class="excepciones">${activas
      .map((e) => `<li><span><b>${esc(nombreFrente(e.frente))}</b>: ${esc(e.motivo)} <small>${tx('frentes.hasta', { quien: esc(e.quien), fecha: fecha(e.hasta) })}</small></span><button type="button" data-cerrar-excepcion="${esc(e.id)}">${tx('frentes.cerrar')}</button></li>`)
      .join('')}</ul>` : `<p class="intro">${tx('frentes.ninguna')}</p>`}
    <p><button type="button" data-nueva-excepcion>${tx('frentes.registrar')}</button></p>
    ${recientes.length ? `<h3>${tx('frentes.anteriores')}</h3><ul class="excepciones">${recientes
      .map((e) => `<li class="cerrada"><span><b>${esc(nombreFrente(e.frente))}</b>: ${esc(e.motivo)} <small>${e.cerrada ? tx('frentes.cerradaPor', { quien: esc(e.quien), fecha: fecha(e.fecha), por: esc(e.cerrada.quien) }) : tx('frentes.vencio', { quien: esc(e.quien), fecha: fecha(e.fecha) })}</small></span></li>`)
      .join('')}</ul>` : ''}
    ${d.puedoTrabajar}`;
}
