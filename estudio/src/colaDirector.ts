/**
 * La cola del director, a la vista y aparte de las misiones (pedido pd_cola_director_visible; nota de voz del titular, 23
 * de octubre de 2026: «el estudio y el director son un ente diferente al usuario; sus colas se mueven en equipo, pero no
 * son la misma cola»). En «Lo que sigue», debajo de las misiones de la persona, «Lo que hace el director»: lo aprobado y
 * lo pedido sin hacer, en el orden que él escribió (`colaDelDirector`). Las cinco primeras a la vista y el resto con «Ver
 * toda la cola», como eligió el titular el 26 de octubre de 2026. Solo se lee: no es trabajo de la persona ni cuenta en su
 * reserva. Pura.
 */
import type { TareaDelDirector } from '../../src/director/director';
import { esc } from './util';

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

const tarea = (t: TareaDelDirector) =>
  `<li title="${esc(t.titulo)}"><b>${esc(nombreCortoDeTarea(t))}</b><small>${t.tipo === 'propuesta' ? 'Propuesta aceptada' : 'Pedido'}</small></li>`;

/** «Lo que hace el director», para «Lo que sigue»: vacío si su cola está vacía. */
export function colaDelDirectorHtml(cola: readonly TareaDelDirector[]): string {
  if (!cola.length) return '';
  const primeras = cola.slice(0, COLA_DIRECTOR_A_LA_VISTA);
  const resto = cola.slice(COLA_DIRECTOR_A_LA_VISTA);
  return `<div class="cola-director">
    <p class="como"><b>Lo que hace el director</b> · ${cola.length} ${cola.length === 1 ? 'cosa' : 'cosas'}: lo que se aprobó o se pidió y aún no está hecho, en el orden en que lo hará. No es trabajo tuyo ni cuenta en tu reserva.</p>
    <ol class="cola-lista dir">${primeras.map(tarea).join('')}</ol>
    ${resto.length ? `<details class="cola-dir-resto"><summary>Ver toda la cola (${resto.length} más)</summary><ol class="cola-lista dir" start="${COLA_DIRECTOR_A_LA_VISTA + 1}">${resto.map(tarea).join('')}</ol></details>` : ''}
  </div>`;
}
