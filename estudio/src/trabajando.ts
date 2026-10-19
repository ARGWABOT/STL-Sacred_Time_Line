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

// El navegador no deja sonar nada hasta que la página recibe un clic o una tecla: el sonido se prepara con el primero
let ctx: AudioContext | null = null;
function prepararSonido() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}
for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, prepararSonido, { capture: true, passive: true });

/** Tres notas cortas que suben, hechas en el navegador (sin archivos). Si el navegador no deja sonar, no pasa nada. */
export function sonarTermino(): boolean {
  prepararSonido();
  if (!ctx || ctx.state !== 'running') return false;
  const t = ctx.currentTime;
  [523, 659, 988].forEach((f, i) => {
    const o = ctx!.createOscillator();
    const g = ctx!.createGain();
    const desde = t + i * 0.14;
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, desde);
    g.gain.exponentialRampToValueAtTime(0.16, desde + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, desde + 0.6);
    o.connect(g).connect(ctx!.destination);
    o.start(desde);
    o.stop(desde + 0.65);
  });
  return true;
}

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
