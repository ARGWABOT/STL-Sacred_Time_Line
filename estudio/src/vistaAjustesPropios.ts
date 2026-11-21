// Tus ajustes de Claude Code en el director, la pestaña «Tus ajustes» de «Modelo y consumo». Salió de app.ts al
// partir los módulos grandes (propuesta aceptada pr_partir_modulos), como «Lo que gasta» (vistaGasto.ts): recibe lo que
// pinta y no guarda nada; guardar la selección sigue en la página, con su botón.
import type { OpcionAjuste } from '../servidor/ajustesPropios';
import { icono } from './iconos';
import { t } from './textos';
import { esc } from './util';

/**
 * Lo que da el servidor de tus ajustes: si el director lanzado los carga todos, los nombres de sus claves (null: no es
 * JSON válido) y cada clave con su explicación y su consejo (estudio/servidor/ajustesPropios.ts), las que conserva sin
 * ellos y las que aparecieron después de guardar tu selección.
 */
export interface AjustesPropios { cargar: boolean; claves: string[] | null; opciones?: OpcionAjuste[] | null; conservados?: string[]; nuevas?: string[] }

const CONSEJO_AJUSTE: Record<OpcionAjuste['consejo'], string> = {
  get si() { return t('modelo.consejoSi'); },
  get no() { return t('modelo.consejoNo'); },
  get igual() { return t('modelo.consejoIgual'); },
  get nunca() { return t('modelo.consejoNunca'); },
};

/**
 * Tus ajustes de Claude Code en el director (nota de voz del titular nmvojtb7rtit, 25 de octubre de 2026: una opción en
 * «Modelo y consumo», no una orden en la terminal; pd_arranque_limpio): los nombres de las claves de tu archivo de
 * ajustes, sin sus valores, y una casilla para que el director que lanza el Studio los cargue o arranque sin ellos, y
 * con ellos sin tus skills ni tus comandos. El modelo y el esfuerzo se le siguen pasando aparte. Clave por clave (notas
 * de voz del titular nmvolgrmctit y nmvoljwl9tit, 25 de octubre de 2026): cada una dice qué es, qué cambia en el
 * director y qué recomienda el Studio, con su casilla, y la selección se guarda; lo que le daría un permiso no se elige.
 */
export function seccionAjustesPropios(a: AjustesPropios | undefined) {
  if (!a) return '';
  const elegidas = new Set(a.conservados ?? []);
  // Las que aparecieron en tu archivo después de guardar tu selección: el director usa lo recomendado hasta que confirmes
  // (nota de voz del titular nmvoottaitit, 25 de octubre de 2026; ajustesPropios.ts › conNuevas)
  const nuevas = new Set(a.cargar ? [] : (a.nuevas ?? []));
  const opciones = a.opciones ?? (a.claves ?? []).map((c): OpcionAjuste => ({ id: c, nombre: c, que: '', enElDirector: '', consejo: 'igual' }));
  const lista = a.claves === null
    ? `<p class="como">${t('modelo.ajustesNoJson')}</p>`
    : opciones.length
      ? `<ul class="ajustes-d">${opciones.map((o) => `<li class="ajuste-d consejo-${o.consejo}${nuevas.has(o.id) ? ' nueva' : ''}">
            <label class="casilla-d">${o.consejo === 'nunca' ? icono('candado') : `<input type="checkbox" data-ajuste="${esc(o.id)}"${elegidas.has(o.id) ? ' checked' : ''}>`} <code>${esc(o.nombre)}</code>${o.dentro ? ` <small class="como">(${esc(o.dentro)})</small>` : ''} <span class="consejo-ajuste">${esc(CONSEJO_AJUSTE[o.consejo])}</span>${nuevas.has(o.id) ? ` <span class="ajuste-nueva">${t('modelo.ajustesNueva')}</span>` : ''}</label>
            ${o.que ? `<p class="como">${t('modelo.queEs', { que: esc(o.que) })}</p><p class="como">${t('modelo.enElDirector', { que: esc(o.enElDirector) })}${o.sinElla ? ` ${t('modelo.sinElla', { que: esc(o.sinElla) })}` : ''}${o.fuente ? ` <a href="${esc(o.fuente)}" target="_blank" rel="noopener noreferrer">${t('modelo.deDondeLoSe')}</a>` : ''}</p>` : ''}
          </li>`).join('')}</ul>`
      : `<p class="como">${t('modelo.ajustesNinguno')}</p>`;
  const hoy = a.cargar
    ? t('modelo.hoyCarga')
    : t('modelo.hoySin', { que: elegidas.size ? t('modelo.claveMarcada', { n: elegidas.size }) : t('modelo.ningunaClave') });
  const avisoNuevas = nuevas.size
    ? `<p class="aviso-ajustes-nuevas">${t('modelo.avisoNuevas', { n: nuevas.size })}</p>`
    : '';
  return `<section class="panel-d" data-ancla="m-ajustes">
        <h3>${t('modelo.ajustesTitulo')}</h3>
        <p class="como">${t('modelo.ajustesIntro1')}</p>
        <p class="como">${t('modelo.ajustesIntro2')}</p>
        <p class="como">${hoy}</p>
        ${avisoNuevas}
        ${lista}
        <div class="acciones-p">${opciones.length ? `<button type="button" class="primario" data-guardar-ajustes>${t('modelo.guardarSeleccion')}</button>` : ''}${a.cargar ? '' : `<button type="button" class="boton-suave" data-cargar-ajustes>${t('modelo.volverACargar')}</button>`}</div>
      </section>`;
}
