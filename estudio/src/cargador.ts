// Los cargadores (pedido pd_cargadores, nota nmwcqpbs7tit): una sola pieza para toda acción que puede tardar, con lo que
// el titular decidió en cada paso:
// - lo oprimido se apaga en el mismo instante (nmwi6rnf5tit) y el resto de la página sigue usable (nmwduwqi5tit);
// - el círculo que gira aparece solo si la acción sigue a los 500 ms (nmwi6rnf5tit): en un botón con icono, en lugar del
//   icono; en uno solo de palabras, a la izquierda de ellas, que quedan como están (nmwf5w992tit);
// - a los 30 s, una línea al lado: «Esto tarda más de lo normal» con «Dejar de esperar» (nmwf47raotit), que deja oprimirlo
//   otra vez y la acción termina en silencio, solo con lo que cambió (nmwgj3mnptit); en una acción que guarda, «Sigue
//   guardando…» sin «Dejar de esperar», y el botón apagado hasta que termine (nmwj6inkbtit, nmwjl7mz1tit);
// - si sale bien, solo el cambio mismo, sin mensaje (nmwjl7fuktit); si falla, el botón vuelve a la normalidad y una línea
//   roja corta al lado dice qué falló (nmwjk36a8tit).
// Se construye por grupos (nmwimti7dtit); el primero, la cuenta de GitHub del proyecto en «Proyecto» › «Dónde está».
import { t as tx } from './textos';
import { esc } from './util';

/** A partir de cuándo gira el círculo, y cuándo aparece la línea de la espera larga. */
export const RETRASO_DEL_CIRCULO = 500;
export const ESPERA_LARGA = 30_000;

/** En qué va una acción: apagada sin círculo, girando, girando con la línea de la espera larga, o fallida. */
export type FaseDelCargador = 'apagado' | 'girando' | 'largo' | 'error';

export interface EstadoCargador {
  fase: FaseDelCargador;
  /** Si la acción guarda: sin «Dejar de esperar», y el botón apagado hasta que termine. */
  guarda: boolean;
  /** Lo que falló, en la línea roja. */
  error?: string;
}

/** La fase de una acción en curso, por el tiempo que lleva. Pura. */
export function faseEnCurso(lleva: number): Exclude<FaseDelCargador, 'error'> {
  return lleva >= ESPERA_LARGA ? 'largo' : lleva >= RETRASO_DEL_CIRCULO ? 'girando' : 'apagado';
}

/** Los relojes, para probarlo sin esperar. */
export interface Relojes {
  setTimeout: (f: () => void, ms: number) => unknown;
  clearTimeout: (x: unknown) => void;
}

export interface Cargadores {
  /**
   * Corre una acción con su cargador: la clave dice qué botón la lleva. Devuelve lo que devuelve la acción, o undefined si
   * falló (el error queda en su línea roja) o si se dejó de esperar (termina en silencio). Mientras corre, otra con la
   * misma clave no se lanza.
   */
  correr: <T>(clave: string, o: { guarda?: boolean; mensajeDeError?: (e: unknown) => string }, accion: () => Promise<T>) => Promise<T | undefined>;
  estado: (clave: string) => EstadoCargador | null;
  /** «Dejar de esperar»: solo en una acción que no guarda. El botón vuelve a la normalidad y la acción sigue sola. */
  dejarDeEsperar: (clave: string) => void;
  /** Quita la línea roja (al volver a intentarlo, o al cambiar de proyecto). */
  olvidar: (clave: string) => void;
  /**
   * La línea roja de una acción que ya terminó mal y cuyo porqué se supo después (el ✉: el aviso lo deja en el diálogo).
   * No pisa una acción en curso.
   */
  fallo: (clave: string, mensaje: string) => void;
}

/** Los cargadores de la página: `repintar` pinta otra vez lo que muestra su estado. */
export function crearCargadores(repintar: () => void, relojes: Relojes = { setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout: (x) => clearTimeout(x as number) }): Cargadores {
  const estados = new Map<string, EstadoCargador>();
  const vuelta = new Map<string, number>();
  const relojesDe = new Map<string, unknown[]>();
  const parar = (clave: string) => {
    for (const r of relojesDe.get(clave) ?? []) relojes.clearTimeout(r);
    relojesDe.delete(clave);
  };
  const enCurso = (clave: string) => {
    const e = estados.get(clave);
    return !!e && e.fase !== 'error';
  };
  return {
    async correr(clave, o, accion) {
      if (enCurso(clave)) return undefined;
      const guarda = !!o.guarda;
      const mia = (vuelta.get(clave) ?? 0) + 1;
      vuelta.set(clave, mia);
      const sigue = () => vuelta.get(clave) === mia && enCurso(clave);
      estados.set(clave, { fase: 'apagado', guarda });
      repintar();
      relojesDe.set(clave, [
        relojes.setTimeout(() => { if (sigue()) { estados.set(clave, { fase: 'girando', guarda }); repintar(); } }, RETRASO_DEL_CIRCULO),
        relojes.setTimeout(() => { if (sigue()) { estados.set(clave, { fase: 'largo', guarda }); repintar(); } }, ESPERA_LARGA),
      ]);
      try {
        const r = await accion();
        if (sigue()) { parar(clave); estados.delete(clave); repintar(); }
        return r;
      } catch (e) {
        if (!sigue()) return undefined;
        parar(clave);
        estados.set(clave, { fase: 'error', guarda, error: o.mensajeDeError ? o.mensajeDeError(e) : (e as Error)?.message ?? String(e) });
        repintar();
        return undefined;
      }
    },
    estado: (clave) => estados.get(clave) ?? null,
    dejarDeEsperar(clave) {
      const e = estados.get(clave);
      if (!e || e.guarda || e.fase === 'error') return;
      parar(clave);
      estados.delete(clave);
      // La acción sigue sola: cuando termine, no toca este estado (otra vuelta)
      vuelta.set(clave, (vuelta.get(clave) ?? 0) + 1);
      repintar();
    },
    olvidar(clave) {
      if (estados.get(clave)?.fase !== 'error') return;
      estados.delete(clave);
      repintar();
    },
    fallo(clave, mensaje) {
      if (enCurso(clave)) return;
      estados.set(clave, { fase: 'error', guarda: true, error: mensaje });
      repintar();
    },
  };
}

/** La clave del cargador de «Entregar al director» de una misión, y la de «Listo» de uno de sus pasos. */
export const claveEntregar = (mision: string): string => `entregar:${mision}`;
export const clavePaso = (mision: string, paso: number): string => `paso:${mision}:${paso}`;

// El tercer grupo (nmwjofnwgtit) y «Pedir revisión» (nmwk5mrf4tit): enviar desde la ventana del comentario, responder una
// propuesta, los dos botones de una decisión de un documento y pedir la revisión.
/** Enviar la nota desde la ventana del comentario (✉): un diálogo a la vez, una clave. */
export const CLAVE_ENVIAR_NOTA = 'enviar-nota';
/** «Pedir revisión»: la cabecera, «Hoy» y la recomendación al entregar comparten la clave (una revisión a la vez). */
export const CLAVE_PEDIR_REVISION = 'pedir-revision';
/** «Aceptar» o «Descartar» una propuesta. */
export const claveResponder = (propuesta: string, estado: string): string => `responder:${propuesta}:${estado}`;
/** «Apruebo lo que recomiendas» de una decisión de un documento («Decido otra cosa» envía desde la ventana del comentario). */
export const claveAprobar = (ruta: string, parte: string, decision: string): string => `aprobar:${ruta}|${parte}|${decision}`;
/** ¿Corre la acción (sin contar la que falló)? Para apagar también sus vecinas mientras guarda. */
export const corre = (e: EstadoCargador | null | undefined): boolean => !!e && e.fase !== 'error';

/**
 * Corre con su cargador una acción que guarda y devuelve false al fallar (como `accion` de la página, que ya avisa en la
 * esquina): si devuelve false se lanza `mensaje`, y esa es la línea roja al lado del botón. Devuelve true solo si salió bien.
 */
export async function correrGuardando(c: Cargadores, clave: string, mensaje: string, accion: () => Promise<boolean>): Promise<boolean> {
  const r = await c.correr(clave, { guarda: true, mensajeDeError: (e) => (e as Error)?.message || mensaje }, async () => {
    if (!(await accion())) throw new Error(mensaje);
    return true;
  });
  return r === true;
}

// El último grupo (pd_cargadores): el modelo y el esfuerzo del director (nmwkbkofitit), «Medir el núcleo» (nmwl4wnrptit: el
// cargador cubre solo desde que se oprime hasta que aparece la línea de progreso de la medición, que lo reemplaza) y la
// línea del respaldo al pie de la barra (nmwl4wakktit: el círculo a la izquierda y las palabras, con la hora vieja, hasta
// que termina).
/** El selector del modelo del director. */
export const CLAVE_MODELO = 'modelo-director';
/** El selector del esfuerzo del director. */
export const CLAVE_ESFUERZO = 'esfuerzo-director';
/** «Medir el núcleo»: solo hasta que el servidor dice que la medición corre. */
export const CLAVE_MEDIR = 'medir-nucleo';
/** La línea del respaldo, al pie de la barra, mientras corre el que ella lanzó. */
export const CLAVE_RESPALDO = 'respaldo';

/** Lo que va en la etiqueta del botón: `disabled` y `aria-busy` mientras corre. */
export const atributosDelCargador = (e: EstadoCargador | null | undefined): string =>
  e && e.fase !== 'error' ? ` disabled aria-busy="true" data-cargando="${e.fase}"` : '';

/** El círculo que gira. */
const CIRCULO = '<span class="circulo-carga" aria-hidden="true"></span>';

/**
 * El círculo al lado de un control que no lleva palabras dentro (un selector): solo gira a partir de los 500 ms, y el
 * control queda del mismo tamaño porque el círculo va fuera de él.
 */
export const circuloAlLado = (e: EstadoCargador | null | undefined): string => (e?.fase === 'girando' || e?.fase === 'largo' ? CIRCULO : '');

/**
 * Lo de dentro del botón: con `icono`, el círculo va en su lugar; sin él, a la izquierda de las palabras, que quedan como
 * están. `texto` ya va escapado.
 */
export function contenidoDelBoton(texto: string, e: EstadoCargador | null | undefined, icono = ''): string {
  const gira = e?.fase === 'girando' || e?.fase === 'largo';
  if (!gira) return `${icono ? `${icono} ` : ''}${texto}`;
  return `${CIRCULO}${texto}`;
}

/**
 * La línea al lado del botón: a los 30 s, la espera larga (con «Dejar de esperar» si no guarda); si falló, la línea roja
 * con lo que falló. Nada en los demás casos: si salió bien, solo se ve el cambio.
 */
export function lineaDelCargador(clave: string, e: EstadoCargador | null | undefined): string {
  if (!e) return '';
  if (e.fase === 'error') return `<span class="linea-cargador falla" role="alert">${esc(e.error ?? '')}</span>`;
  if (e.fase !== 'largo') return '';
  if (e.guarda) return `<span class="linea-cargador" role="status">${tx('cargador.sigueGuardando')}</span>`;
  return `<span class="linea-cargador" role="status">${tx('cargador.tardaMas')} <button type="button" class="enlace" data-dejar-de-esperar="${esc(clave)}">${tx('cargador.dejarDeEsperar')}</button></span>`;
}
