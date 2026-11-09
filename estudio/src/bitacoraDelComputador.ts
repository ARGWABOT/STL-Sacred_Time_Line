// La bitácora de este computador, la última pestaña de «Modelo y consumo» (la vista «Bitácora» de vistasDeApoyo.ts es
// otra). Salió de app.ts al partir los módulos grandes (propuesta aceptada pr_partir_modulos), como «Permisos»
// (vistaPermisos.ts): recibe lo que pinta y no guarda nada; traerla del servidor, el filtro que se escribe y si está
// abierta siguen en la página.
import { coincideBusqueda } from '../../src/director/director';
import type { EventoBitacora } from '../../src/director/bitacora';
import { momento } from './formato';
import { lenguaje, t } from './textos';
import { esc } from './util';

/** Lo traído del servidor: las acciones, de la más nueva a la más vieja, y cuántas trae como mucho. */
export type Bitacora = { eventos: EventoBitacora[]; maximo: number; cuando: number } | null;

/** Lo que pintan sus filas: lo traído, el error al traerla, el filtro escrito y el nombre de cada proyecto. */
export interface DatosBitacora { bitacora: Bitacora; error: string; filtro: string; nombre: (id?: string) => string }

/** La sección, con su lista dentro; `plegable` dice si nace abierta (lo recuerda la página). */
export function panelBitacora(datos: DatosBitacora, plegable: string) {
  return `<section class="panel-d" data-ancla="m-bitacora">
      <details class="plegable-d" data-bitacora${plegable}>
        <summary><h3>${t('modelo.bit.titulo')}</h3><small>${t('modelo.bit.subtitulo')}</small></summary>
        <p class="como">${t('modelo.bit.explica')}</p>
        <label class="filtro-bitacora">${t('modelo.bit.filtrar')}<input type="search" data-filtro-bitacora value="${esc(datos.filtro)}" placeholder="${esc(t('modelo.bit.pista'))}" autocomplete="off" spellcheck="false"></label>
        <div id="lista-bitacora">${filasBitacora(datos)}</div>
      </details>
    </section>`;
}

/** Las filas de la bitácora, con el filtro (sin importar tildes ni mayúsculas, como «Buscar en el Buzón»). */
export function filasBitacora({ bitacora, error, filtro, nombre }: DatosBitacora) {
  if (!bitacora) return `<p class="como">${error ? esc(error) : t('modelo.bit.leyendo')}</p>`;
  if (!bitacora.eventos.length) return `<p class="como">${t('modelo.bit.nada')}</p>`;
  const filas = bitacora.eventos.filter((e) => coincideBusqueda([e.quien, e.que, e.desde, e.proyecto, nombre(e.proyecto)], filtro));
  const total = bitacora.eventos.length;
  const cuantas = `${t('modelo.bit.acciones', { n: total, cifra: total.toLocaleString(lenguaje()) })}${bitacora.maximo && total >= bitacora.maximo ? ` ${t('modelo.bit.lasNuevas')}` : ''}`;
  if (!filas.length) return `<p class="como">${t('modelo.bit.ninguna', { cuantas, filtro: esc(filtro.trim()) })}</p>`;
  return `<p class="como">${t('modelo.bit.orden', { cuantas: filas.length === total ? cuantas : t('modelo.bit.deCuantas', { n: filas.length.toLocaleString(lenguaje()), cuantas }) })}</p>
        <ul class="lista-bitacora">${filas.map((e) => `<li><span class="f" title="${esc(new Date(e.cuando).toLocaleString(lenguaje()))}">${esc(momento(e.cuando))}</span><span class="q">${esc(e.quien)}</span><span>${esc(e.que)}<small>${esc(e.desde)}${e.proyecto ? ` · ${esc(nombre(e.proyecto))}` : ''}</small></span></li>`).join('')}</ul>`;
}
