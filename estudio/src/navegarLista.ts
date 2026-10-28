/**
 * Cómo se recorre la lista de un selector propio del Studio (selectorLista.ts; pd_sonidos_flechas): la lógica pura, sin
 * página. Con el teclado, las flechas, Inicio, Fin y las letras mueven la opción activa, y cada paso se oye al pasar; con
 * el ratón, una opción se oye solo si el puntero se detiene en ella (ESPERA_PARADA_MS), para que cruzar la lista no suene
 * como una ráfaga. Elegir (Enter, Espacio o un clic) y cerrar sin cambiar (Esc) las decide selectorLista.ts con estas reglas.
 */

/** Lo que espera el puntero quieto sobre una opción antes de que suene (decisión del titular, 26 de octubre de 2026). */
export const ESPERA_PARADA_MS = 330;
/** Cuánto saltan Re Pág y Av Pág. */
const SALTO_PAGINA = 8;
/** Las letras seguidas dentro de este tiempo forman una sola palabra para buscar. */
const VENTANA_LETRAS_MS = 700;

/**
 * La opción a la que lleva una tecla de movimiento desde la activa, sin dar la vuelta (como una lista nativa); null si la
 * tecla no mueve o no hay opciones. En los extremos devuelve la misma: quien llama no vuelve a oír lo que ya oyó.
 */
export function siguienteIndice(actual: number, total: number, tecla: string): number | null {
  if (total <= 0) return null;
  const ultimo = total - 1;
  const i = Math.min(Math.max(actual, 0), ultimo);
  switch (tecla) {
    case 'ArrowDown': return Math.min(i + 1, ultimo);
    case 'ArrowUp': return Math.max(i - 1, 0);
    case 'PageDown': return Math.min(i + SALTO_PAGINA, ultimo);
    case 'PageUp': return Math.max(i - SALTO_PAGINA, 0);
    case 'Home': return 0;
    case 'End': return ultimo;
    default: return null;
  }
}

export type AccionLista = 'abrir' | 'cerrar' | 'elegir' | 'ir' | 'escribir' | 'soltar';

const ES_LETRA = /^[\p{L}\p{N}-]$/u;

/**
 * Lo que hace una tecla en un selector, según esté su lista abierta o no; null si no hace nada y la tecla sigue su camino.
 * Cerrado: Enter, Espacio y las flechas la abren (en la opción de ahora); Inicio, Fin y las letras la abren y se mueven.
 * Abierto: las flechas, Inicio, Fin y Re Pág/Av Pág se mueven (`ir`), las letras buscan (`escribir`), Enter y Espacio eligen,
 * Esc cierra sin cambiar (solo la lista: el diálogo y el enfoque no se enteran) y Tab la suelta sin cambiar (`soltar`).
 */
export function accionDeTecla(abierta: boolean, tecla: string): AccionLista | null {
  if (tecla === 'Escape') return abierta ? 'cerrar' : null;
  if (tecla === 'Tab') return abierta ? 'soltar' : null;
  if (tecla === 'Enter' || tecla === ' ') return abierta ? 'elegir' : 'abrir';
  if (tecla === 'ArrowDown' || tecla === 'ArrowUp') return abierta ? 'ir' : 'abrir';
  if (['Home', 'End', 'PageDown', 'PageUp'].includes(tecla)) return 'ir';
  return ES_LETRA.test(tecla) ? 'escribir' : null;
}

/** Las letras escritas hace poco y cuándo se escribió la última. */
export interface Letras {
  texto: string;
  cuando: number;
}

/** Suma una letra a lo escrito si sigue dentro de la ventana; si pasó más tiempo, empieza de nuevo. */
export function escribirLetras(previas: Letras | null, letra: string, ahora: number, ventana = VENTANA_LETRAS_MS): Letras {
  return { texto: previas && ahora - previas.cuando <= ventana ? previas.texto + letra : letra, cuando: ahora };
}

/**
 * La opción que sigue a la activa y empieza con lo escrito (sin mirar mayúsculas), dando la vuelta; -1 si ninguna. Una letra
 * sola, o la misma repetida, recorre las que empiezan con ella (una por pulsación); varias distintas buscan esa palabra
 * desde la activa, que cuenta.
 */
export function indicePorLetras(textos: readonly string[], actual: number, escrito: string): number {
  const q = escrito.toLocaleLowerCase('es');
  const n = textos.length;
  if (!q || !n) return -1;
  const repetida = [...q].every((c) => c === q[0]);
  const prefijo = repetida ? q[0] : q;
  const desde = repetida ? actual + 1 : actual;
  for (let k = 0; k < n; k++) {
    const i = (((desde + k) % n) + n) % n;
    if (textos[i].toLocaleLowerCase('es').startsWith(prefijo)) return i;
  }
  return -1;
}

/** El reloj de la espera; en las pruebas, uno falso. */
export interface Reloj {
  programar(hacer: () => void, ms: number): unknown;
  cancelar(id: unknown): void;
}
const RELOJ: Reloj = { programar: (hacer, ms) => setTimeout(hacer, ms), cancelar: (id) => clearTimeout(id as ReturnType<typeof setTimeout>) };

/**
 * La regla del puntero: `mover(i)` dice que el puntero se movió sobre la opción i, y `alParar(i)` se llama solo cuando
 * pasó `ms` sin que se moviera ni cambiara de opción, una sola vez por cada vez que está sobre ella. Cruzar la lista sin
 * detenerse no suena nada, ni una ráfaga. `soltar()` olvida todo: el puntero salió de la lista o tomó el mando el teclado.
 */
export function crearEsperaDeParada(alParar: (indice: number) => void, ms = ESPERA_PARADA_MS, reloj: Reloj = RELOJ) {
  let id: unknown = null;
  let sobre = -1;
  let sonada = -1;
  const cancelar = () => {
    if (id !== null) reloj.cancelar(id);
    id = null;
  };
  return {
    mover(indice: number) {
      cancelar();
      if (indice !== sobre) {
        sobre = indice;
        sonada = -1;
      }
      if (sonada === indice) return;
      id = reloj.programar(() => {
        id = null;
        sonada = indice;
        alParar(indice);
      }, ms);
    },
    soltar() {
      cancelar();
      sobre = -1;
      sonada = -1;
    },
  };
}
