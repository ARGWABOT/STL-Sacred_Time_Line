// La vista «Todos los proyectos»: una tarjeta por proyecto de este Studio, con su etapa, su meta y lo que espera, y la de
// entregar proyectos nuevos. Salió de app.ts al partir los módulos grandes (propuesta aceptada pr_partir_modulos),
// como «Proyecto» (vistaProyecto.ts): recibe lo que pinta y no guarda nada; el nombre de cada etapa y el botón que lleva a
// las misiones del activo los da la página.
import type { ResumenProyecto } from '../servidor/api';
import { momento } from './formato';
import { t } from './textos';
import { esc } from './util';

/** Lo que pinta la vista. La página se lo da con sus datos y con lo que depende de ella. */
export interface DatosProyectos {
  proyectos: ResumenProyecto[];
  /** El id del proyecto activo: el que se ve y el único que dirige el director. */
  activo: string;
  /** El nombre de cada etapa del arranque, como lo dice el resto del Studio. */
  nombreEtapa: (etapa: string) => string;
  /** El botón que lleva a las misiones del proyecto activo, ya pintado por la página. */
  irAMisiones: string;
}

export function vistaProyectos(d: DatosProyectos) {
  return `<p class="intro">${t('proyectos.intro')}</p>
    <div class="lista-proyectos">${d.proyectos
      .map((p) => `<article class="tarjeta-proyecto${p.id === d.activo ? ' activo' : ''}">
        <header><b>${esc(p.nombre)}</b>${p.esElStudio ? `<span class="chip">${esc(t('proyectos.tuStudio'))}</span>` : ''}${p.id === d.activo ? `<span class="chip foco">${t('proyectos.activo')}</span>` : ''}</header>
        <p class="como">${t(p.tipo === 'nuevo' ? 'proyectos.nuevo' : 'proyectos.existente')} · ${esc(d.nombreEtapa(p.etapa))}${p.etapa === 'en_marcha' && p.fase ? ` · ${t('proyectos.fase', { fase: esc(p.fase) })}` : ''}</p>
        ${p.alerta ? `<p class="alerta-p">⚠ ${esc(p.alerta)}</p>` : ''}
        <p>${p.objetivo ? `<b>${t('proyectos.meta')}</b> ${esc(p.objetivo)}` : `<span class="como">${t('proyectos.sinMeta')}</span>`}</p>
        <ul class="cifras-p">
          <li><b>${p.porRevisar}</b> ${t('proyectos.esperando')}</li>
          <li><b>${p.misionesAbiertas}</b> ${t('proyectos.misionesAbiertas')}</li>
          <li>${p.revisado ? t('proyectos.ultimaRevision', { cuando: momento(p.revisado) }) : t('proyectos.sinRevisiones')}</li>
        </ul>
        <div class="acciones-p">${p.id === d.activo ? d.irAMisiones : `<button type="button" class="primario" data-activar="${esc(p.id)}">${t('proyectos.activar')}</button>`}</div>
      </article>`)
      .join('')}
      <article class="tarjeta-proyecto nueva"><button type="button" data-nuevo-proyecto>＋ ${t('proyectos.entregar')}</button><p class="como">${t('proyectos.entregarExplica')}</p></article>
    </div>`;
}
