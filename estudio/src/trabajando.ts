/**
 * La señal de que el director está trabajando, que sobrevive a las recargas de la página y a los reinicios del servidor.
 * Mientras revisa, el Studio puede recargarse solo (si el director cambia su código) y quedarse un momento sin datos: sin
 * esta señal, la página se veía en blanco y no se sabía si el director seguía. Se guarda en este navegador al ver la
 * revisión en curso y se quita al verla hecha. Y al terminar, el Studio lo dice con un aviso grande y un sonido corto.
 */

const CLAVE = 'estudio.director.trabajando';

/** La revisión en curso que vio este navegador («<proyecto>:<pedida>»), o null. */
export const trabajandoGuardado = (): string | null => localStorage.getItem(CLAVE);
export function marcarTrabajando(marca: string | null) {
  if (marca) localStorage.setItem(CLAVE, marca);
  else localStorage.removeItem(CLAVE);
}

/** Lo que se ve mientras la página aún no tiene datos y el director sigue trabajando. */
export const pantallaTrabajando = () => `<section class="pantalla-trabajando" role="status" aria-live="polite">
  <div class="pt-orbita" aria-hidden="true"></div>
  <h2>El director está trabajando</h2>
  <p>Mientras revisa, el Studio puede recargarse o reiniciarse solo, por ejemplo cuando cambia su código. No tienes que hacer nada: al terminar se carga completo y te avisa con un sonido.</p>
</section>`;

/** La revisión cerrada cuya recarga espera a que el director salga: cuál era (`pedida`) y desde cuándo se espera. */
export interface EsperaTrasRevision { pedida: string; desde: number }

/** Lo más que se espera al director que termina lo último: el Studio lo detiene a los 3 minutos de su cierre. */
export const TOPE_ESPERA_TRAS_REVISION_MS = 4 * 60_000;

/**
 * Al terminar la revisión, una sola recarga (nota del titular nmvvmc5rxtit, 30 de octubre de 2026). El director cierra la
 * revisión con `--listo` y sigue vivo un momento, haciendo el commit de su memoria; mientras vive, el servidor retiene los
 * cambios del Studio que hizo (recarga.ts) y los suelta al salir: recargar al ver la revisión cerrada, y otra vez al
 * soltarlos, eran dos recargas. Por eso, vista cerrada con el director vivo, la recarga espera (`esperar`) y se hace una
 * vez (`ya`) cuando él sale, cuando empieza otra revisión (las seguidas) o, si no sale, pasado el tope. Sin nada que
 * recargar, null.
 */
export function recargaTrasRevision(x: { termino: boolean; espera: EsperaTrasRevision | null; pedida: string | undefined; vivo: boolean; ahora: number }): 'ya' | 'esperar' | null {
  if (!x.termino && !x.espera) return null;
  if (x.espera && (x.pedida !== x.espera.pedida || x.ahora - x.espera.desde > TOPE_ESPERA_TRAS_REVISION_MS)) return 'ya';
  return x.vivo ? 'esperar' : 'ya';
}

/**
 * Desde que la revisión empieza a cerrarse hasta la recarga, la línea viva de la barra no recibe datos nuevos (nota del
 * titular nmw0ypwnrtit, 3 de noviembre de 2026: «se ha visualizado esto justo antes de terminar la revisión… queda visible
 * incluso por segundos y se ve muy mal»). El plan sigue siendo el de antes mientras la recarga espera, y la revisión ya
 * cerrada movía al director fuera de sus ramas: se veían juntarse en un punto, rotas. Se queda como estaba, viva, hasta que
 * la cubierta de carga la tapa y la recarga trae la nueva. Una vez congelada, no se descongela: la recarga la rehace. Pura.
 */
export const lineaSeCongela = (x: { termino: boolean; tras: 'ya' | 'esperar' | null; espera: EsperaTrasRevision | null; recargando: boolean }): boolean =>
  x.termino || x.tras !== null || !!x.espera || x.recargando;

/**
 * Lo que se abre solo al cargar, en su orden: primero el reporte de las misiones cumplidas (la celebración, si el director
 * aprobó algo tuyo) y, al cerrarlo, «¿Dónde quedamos?», tras una revisión o al volver después de un rato (nota del titular
 * nmvvmc5rxtit). Con ?mirar, nada: el director mira sin pantalla.
 */
export function abrirAlCargar(x: { termino: boolean; tocaResumen: boolean; mirar: boolean }): ('celebracion' | 'dondeQuedamos')[] {
  if (x.mirar) return [];
  return x.termino || x.tocaResumen ? ['celebracion', 'dondeQuedamos'] : ['celebracion'];
}

// El sonido del final ya no se sintetiza aquí: es el «veredicto-listo» de los sonidos del Studio (sonidos.ts › sonar('revision'))

/** Si la pestaña no está a la vista, su título lo dice hasta que vuelvas a ella. */
export function tituloTermino() {
  if (document.visibilityState === 'visible') return;
  const antes = document.title;
  document.title = '✓ El director terminó · ' + antes;
  const volver = () => {
    if (document.visibilityState !== 'visible') return;
    document.title = antes;
    document.removeEventListener('visibilitychange', volver);
  };
  document.addEventListener('visibilitychange', volver);
}
