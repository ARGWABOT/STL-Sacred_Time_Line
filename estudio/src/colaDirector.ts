/**
 * La cola del director, a la vista y aparte de las misiones (pedido pd_cola_director_visible; nota de voz del titular, 23
 * de octubre de 2026: «el estudio y el director son un ente diferente al usuario; sus colas se mueven en equipo, pero no
 * son la misma cola»). En «Lo que sigue», debajo de las misiones de la persona, «Lo que hace el director»: lo aprobado y
 * lo pedido sin hacer, en el orden que él escribió (`colaDelDirector`). Las cinco primeras a la vista y el resto con «Ver
 * toda la cola», como eligió el titular el 26 de octubre de 2026. Solo se lee: no es trabajo de la persona ni cuenta en su
 * reserva. Pura.
 */
import type { Mision, ReservaDeMisiones, TareaDelDirector } from '../../src/director/director';
import { t } from './textos';
import { esc } from './util';

/**
 * Las misiones de «Lo que sigue», después de la de ahora: todas las que la persona alcanza sin el director, en el orden en
 * que le aparecen (`reservaDeMisiones` › `enOrden`), también las que esperan otra misión suya con `despuesDe`. Su número
 * es el del título, y con la de ahora da el de la reserva (nota de voz del titular nmvvalvdttit, 30 de octubre de 2026:
 * con diez misiones, nueve encadenadas, el título decía «0 misiones más» porque contaba solo las abiertas).
 */
export function misionesQueSiguen(r: Pick<ReservaDeMisiones, 'enOrden'>, ahora?: string): Mision[] {
  return r.enOrden.filter((m) => m.id !== ahora);
}

/** De las que esperan lo que necesitan, las que esperan al director (una propuesta o un pedido): no están en la cuenta. */
export function esperanAlDirector(r: Pick<ReservaDeMisiones, 'esperan' | 'llegan'>): Mision[] {
  return r.esperan.filter((m) => !r.llegan.includes(m));
}

/** Cuántas se ven sin abrir «Ver toda la cola». */
export const COLA_DIRECTOR_A_LA_VISTA = 5;

/** Hasta dónde se recorta el nombre de una tarea; el texto entero queda al pasar el ratón. */
const LARGO_NOMBRE = 120;

/**
 * El nombre corto de una tarea, para leerla de un vistazo: el título de la propuesta o, de un pedido (que es un párrafo),
 * su primera frase, hasta los dos puntos o el punto, recortada a `n` caracteres.
 */
export function nombreCortoDeTarea(t: TareaDelDirector, n = LARGO_NOMBRE): string {
  const frase = (t.tipo === 'pedido' ? t.titulo.split(/:\s|\.\s/)[0] : t.titulo).trim().replace(/\.$/, '');
  return frase.length > n ? `${frase.slice(0, n - 1).trimEnd()}…` : frase;
}

const tarea = (x: TareaDelDirector) =>
  `<li title="${esc(x.titulo)}"><b>${esc(nombreCortoDeTarea(x))}</b><small>${t(x.tipo === 'propuesta' ? 'cola.propuestaAceptada' : 'cola.pedido')}</small></li>`;

/** «Lo que hace el director», para «Lo que sigue»: vacío si su cola está vacía. */
export function colaDelDirectorHtml(cola: readonly TareaDelDirector[]): string {
  if (!cola.length) return '';
  const primeras = cola.slice(0, COLA_DIRECTOR_A_LA_VISTA);
  const resto = cola.slice(COLA_DIRECTOR_A_LA_VISTA);
  return `<div class="cola-director">
    <p class="como">${t('cola.director', { n: cola.length })}</p>
    <ol class="cola-lista dir">${primeras.map(tarea).join('')}</ol>
    ${resto.length ? `<details class="cola-dir-resto"><summary>${t('cola.verToda', { n: resto.length })}</summary><ol class="cola-lista dir" start="${COLA_DIRECTOR_A_LA_VISTA + 1}">${resto.map(tarea).join('')}</ol></details>` : ''}
  </div>`;
}
