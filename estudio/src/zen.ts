// El fondo zen del modo enfoque: detrás de la ventana del documento, en vez de solo el velo difuminado, una niebla de
// luces muy tenues que se desplaza despacio (CSS, en director.css › .velo-zen) y una luz suave que sigue al puntero con
// retraso cuando pasa por fuera de la ventana. Liviano: sin canvas; la luz se mueve con requestAnimationFrame solo
// mientras le falta llegar, solo con el enfoque puesto y con la pestaña a la vista. Con «menos movimiento» en el
// sistema, la niebla queda quieta y la luz no sigue al puntero.

const quieto = matchMedia('(prefers-reduced-motion: reduce)');
const html = document.documentElement;

let velo: HTMLDivElement | null = null;
let luz: HTMLDivElement | null = null;
let activo = false;
let cuadro = 0;
// Dónde está la luz y hacia dónde va (en píxeles de la ventana), y qué tan encendida está (0 a 1)
let x = innerWidth / 2;
let y = innerHeight / 2;
let ax = x;
let ay = y;
let brillo = 0;
let brilloMeta = 0;

function montar() {
  if (velo) return;
  velo = document.createElement('div');
  velo.className = 'velo-zen';
  velo.setAttribute('aria-hidden', 'true');
  velo.innerHTML = '<div class="zen-niebla"></div><div class="zen-niebla dos"></div><div class="zen-luz"></div>';
  luz = velo.querySelector('.zen-luz');
  document.body.append(velo);
}

function pintarLuz() {
  if (!luz) return;
  luz.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
  luz.style.opacity = brillo.toFixed(3);
}

function paso() {
  cuadro = 0;
  if (!activo || document.hidden) return;
  // Se acerca de a poco a donde va: el retraso es lo que la hace tranquila
  x += (ax - x) * 0.045;
  y += (ay - y) * 0.045;
  brillo += (brilloMeta - brillo) * 0.04;
  pintarLuz();
  const falta = Math.abs(ax - x) + Math.abs(ay - y) > 0.5 || Math.abs(brilloMeta - brillo) > 0.005;
  if (falta) cuadro = requestAnimationFrame(paso);
}
const mover = () => {
  if (!cuadro && activo && !document.hidden) cuadro = requestAnimationFrame(paso);
};

/** Fuera de la ventana del documento, la luz va hacia el puntero; dentro, se apaga despacio para no distraer la lectura. */
function alMover(e: PointerEvent) {
  if (!activo || quieto.matches || e.pointerType === 'touch') return;
  const dentro = !!(e.target as HTMLElement | null)?.closest?.('.lector, .director-flotante, .atajos-director, dialog');
  ax = e.clientX;
  ay = e.clientY;
  brilloMeta = dentro ? 0 : 1;
  mover();
}
const alSalir = () => {
  brilloMeta = 0;
  mover();
};

function encender(si: boolean) {
  if (si === activo) return;
  activo = si;
  if (si) {
    montar();
    document.addEventListener('pointermove', alMover, { passive: true });
    html.addEventListener('pointerleave', alSalir);
  } else {
    document.removeEventListener('pointermove', alMover);
    html.removeEventListener('pointerleave', alSalir);
    if (cuadro) cancelAnimationFrame(cuadro);
    cuadro = 0;
    brillo = brilloMeta = 0;
    pintarLuz();
  }
}

// El enfoque lo pone y lo quita director.ts con la clase «enfoque» del documento: aquí solo se escucha
new MutationObserver(() => encender(html.classList.contains('enfoque'))).observe(html, { attributes: true, attributeFilter: ['class'] });
encender(html.classList.contains('enfoque'));
// Con la pestaña oculta no se anima nada; al volver, la luz sigue donde iba
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) mover();
});
