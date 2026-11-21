// «Tomar captura» de la pestaña de QA (pd_pestana_qa, tercer tramo; nmwp9izh9tit, nmwpmf0i5tit, nmwplyqprtit): congela la
// vista de la pestaña y la marca en rojo, como el recorte de Windows, con las herramientas en una barra arriba:
// rectángulo, lápiz, línea de dos clics, tres grosores, «Deshacer» y «Borrar los dibujos».
//
// La fotonota (nmwpnvo38tit): la nota y la captura en una sola operación. Al tomarla, la vista se congela, aparecen las
// herramientas y el micrófono ya graba: se dice mientras se raya. Solo voz, sin texto. «Detener y comprobar» guarda una
// foto con las rayas de ese momento; «Añadir otro fragmento» sigue sobre la misma imagen, con sus rayas, y al detener
// otra vez va otra foto: cada audio con su foto. «Borrar los dibujos» limpia las rayas de esta fotonota. «Enviar ya» o
// «Dejarlo en el Buzón» la manda entera: el audio (que se transcribe) y sus fotos. La pestaña se comparte una vez por
// visita (nmwqko02dtit): el flujo queda vivo hasta que la pestaña se cierra. Los controles de la grabación llevan su texto
// y los botones de icono son círculos perfectos con su icono dibujado al centro (nmwqkrhsmtit, nmwqkshv3tit).
import { Grabadora } from './grabadora';
import { t as tx } from './textos';
import { esc } from './util';

export type Herramienta = 'rectangulo' | 'lapiz' | 'linea';
/** Los tres grosores, en píxeles de pantalla. */
export const GROSORES = { fino: 3, medio: 6, grueso: 12 } as const;
export type Grosor = keyof typeof GROSORES;
export const ROJO = '#ff2d2d';

export interface Trazo { herramienta: Herramienta; grosor: number; puntos: { x: number; y: number }[] }

/** Dibuja un trazo en un lienzo, en sus coordenadas. Puro respecto del lienzo que recibe. */
export function dibujarTrazo(c: Pick<CanvasRenderingContext2D, 'beginPath' | 'moveTo' | 'lineTo' | 'stroke' | 'strokeRect'> & { strokeStyle: unknown; lineWidth: number; lineCap: CanvasLineCap; lineJoin: CanvasLineJoin }, t: Trazo) {
  if (t.puntos.length < 2) return;
  c.strokeStyle = ROJO;
  c.lineWidth = t.grosor;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const [a] = t.puntos;
  const b = t.puntos[t.puntos.length - 1];
  if (t.herramienta === 'rectangulo') return c.strokeRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  c.beginPath();
  c.moveTo(a.x, a.y);
  for (const p of t.herramienta === 'linea' ? [b] : t.puntos.slice(1)) c.lineTo(p.x, p.y);
  c.stroke();
}

/** Los iconos de la barra: SVG en línea que toma el color del botón. */
const svg = (dentro: string, tam = 20) => `<svg viewBox="0 0 24 24" width="${tam}" height="${tam}" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="${tam < 16 ? 3 : 2}" stroke-linecap="round" stroke-linejoin="round">${dentro}</svg>`;
/** La X de cerrar o quitar, dibujada y no escrita: una letra «×» nunca queda centrada en su círculo (nmwqkrhsmtit). */
const ICONO_X =(tam = 20) => svg('<path d="M6 6l12 12M18 6L6 18"/>', tam);
const ICONOS = {
  rectangulo: svg('<rect x="4" y="6" width="16" height="12" rx="1"/>'),
  lapiz: svg('<path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z"/><path d="M14.5 6.5l3 3"/>'),
  linea: svg('<path d="M5 19L19 5"/>'),
  deshacer: svg('<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
  dejar: svg('<path d="M4 13l2-8h12l2 8v6H4z"/><path d="M4 13h5l1 2h4l1-2h5"/>'),
};
/** Un icono de grosor: una raya horizontal del grosor que dibuja. */
const iconoGrosor = (px: number) => `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M3 12h18" fill="none" stroke="currentColor" stroke-width="${px}" stroke-linecap="round"/></svg>`;

/**
 * La única barra de la fotonota, arriba (nmwpwqyi0tit): las herramientas (iconos con su descripción al pasar el cursor),
 * «Borrar los dibujos», la grabación, «Enviar ya» (de la grabadora), las miniaturas de las fotos, «Dejar la nota en el Buzón» y, al extremo
 * derecho y último, «Cancelar». Pura.
 */
export function barraDeCaptura(): string {
  const icono = (atr: string, texto: string, dibujo: string, activo = false) => `<button type="button" class="qa-icono" ${atr} aria-pressed="${activo}" title="${esc(texto)}" aria-label="${esc(texto)}">${dibujo}</button>`;
  const grosor = (g: Grosor, activo = false) => icono(`data-grosor="${g}"`, tx(`qa.${g === 'fino' ? 'fino' : g === 'medio' ? 'medio' : 'grueso'}`), iconoGrosor(GROSORES[g]), activo);
  return `<div class="qa-barra" role="toolbar" aria-label="${esc(tx('qa.herramientas'))}">
${icono('data-herramienta="rectangulo"', tx('qa.rectangulo'), ICONOS.rectangulo, true)}${icono('data-herramienta="lapiz"', tx('qa.lapiz'), ICONOS.lapiz)}${icono('data-herramienta="linea"', tx('qa.linea'), ICONOS.linea)}
<span class="qa-sep" aria-hidden="true"></span>
${grosor('fino')}${grosor('medio', true)}${grosor('grueso')}
<span class="qa-sep" aria-hidden="true"></span>
<button type="button" class="qa-icono" data-deshacer title="${esc(tx('qa.deshacer'))}" aria-label="${esc(tx('qa.deshacer'))}">${ICONOS.deshacer}</button>
<button type="button" data-limpiar>${esc(tx('qa.limpiar'))}</button>
<span class="qa-sep" aria-hidden="true"></span>
<div class="grabadora" data-grabadora></div>
<span class="qa-fotos" data-fotos role="group"></span>
<p class="qa-error" data-error role="alert"></p>
<button type="submit" class="qa-enviar" data-dejar>${ICONOS.dejar}<span>${esc(tx('qa.dejarBuzon'))}</span></button>
<button type="button" class="qa-cancelar" data-descartar>${esc(tx('qa.descartar'))}</button>
</div>`;
}

/**
 * Las fotos de la nota, una miniatura cada una (nmwpy5olptit): la miniatura es un botón que la agranda y, aparte (nunca
 * un botón dentro de otro), una X que la quita. Pura: recibe las direcciones de las imágenes.
 */
export function miniaturasHtml(urls: string[]): string {
  return urls.map((u, i) => `<span class="qa-mini"><button type="button" class="qa-ver" data-ver-foto="${i}" title="${esc(tx('qa.verFoto'))}" aria-label="${esc(tx('qa.verFoto'))}"><img src="${esc(u)}" alt=""></button><button type="button" class="qa-x" data-quitar-foto="${i}" title="${esc(tx('qa.quitarFoto'))}" aria-label="${esc(tx('qa.quitarFoto'))}">${ICONO_X(12)}</button></span>`).join('');
}

/** La foto grande, con su X de cerrar arriba a la derecha, redonda y con la X dibujada al centro (nmwqkshv3tit). Pura. */
export function zoomHtml(url: string): string {
  return `<img src="${esc(url)}" alt=""><button type="button" class="qa-cerrar-zoom" data-cerrar-zoom title="${esc(tx('qa.cerrarFoto'))}" aria-label="${esc(tx('qa.cerrarFoto'))}">${ICONO_X(22)}</button>`;
}

/** Qué hace un clic dentro de las miniaturas: agrandar, quitar esa foto, o nada. Nunca cancela la nota. Pura. */
export function accionDeFotos(boton: { dataset: Record<string, string | undefined> } | null): { tipo: 'ver' | 'quitar' | 'nada'; indice: number } {
  const ver = boton?.dataset.verFoto;
  const quitar = boton?.dataset.quitarFoto;
  if (ver !== undefined) return { tipo: 'ver', indice: Number(ver) };
  if (quitar !== undefined) return { tipo: 'quitar', indice: Number(quitar) };
  return { tipo: 'nada', indice: -1 };
}

/** La lista sin la foto de ese lugar (la original no se toca). Pura. */
export function sinLaFoto<T>(lista: readonly T[], indice: number): T[] {
  return lista.filter((_, i) => i !== indice);
}

/**
 * What sending does with the photos (nmwpnvo38tit: each recorded fragment, one photo; nmwqme8cbtit: sending never adds
 * one of its own). A fragment ended by its pause already left its photo. On sending: a new photo only if the last
 * fragment (still recording) has none yet, or if there is none at all; if the drawings changed after the last photo,
 * that photo is taken again in its place, so the count stays one per fragment. Pura.
 */
export function fotoAlEnviar(o: { fotos: number; fragmentos: number; cambio: boolean }): 'nueva' | 'rehacer' | 'nada' {
  if (o.fotos === 0 || o.fotos < o.fragmentos) return 'nueva';
  return o.cambio ? 'rehacer' : 'nada';
}

/** How many photos a photo note sends after those moments, in that order (each pause or a send while recording ends a fragment). Pura. */
export function fotosAlFinal(momentos: readonly ('empezar' | 'pausar' | 'seguir' | 'rayar' | 'enviar')[]): number {
  let fotos = 0;
  let fragmentos = 0;
  let cambio = false;
  let grabando = false;
  for (const m of momentos) {
    if (m === 'empezar' || m === 'seguir') {
      fragmentos++;
      grabando = true;
    } else if (m === 'rayar') cambio = true;
    else if (m === 'pausar' && grabando) {
      fotos++;
      cambio = false;
      grabando = false;
    } else if (m === 'enviar') {
      const que = fotoAlEnviar({ fotos, fragmentos, cambio });
      if (que === 'nueva') fotos++;
    }
  }
  return fotos;
}

// El alto es el de la ventana que se ve (100dvh: en el móvil, sin la barra del navegador que 100vh se come) y el lienzo ocupa
// todo lo que queda bajo la única barra, sin relleno: nada de la fotonota tapa la imagen.
export const ESTILO = `.qa-captura{position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;max-width:none;max-height:none;margin:0;padding:0;border:0;overflow:hidden;z-index:2147483647;background:#05080f;font:14px system-ui,sans-serif}.qa-captura[open]{display:flex}.qa-captura form{flex:1;display:flex;flex-direction:column;min-height:0;min-width:0}.qa-barra{flex:none;display:flex;flex-wrap:nowrap;align-items:center;gap:6px;height:52px;box-sizing:border-box;padding:0 10px;overflow:hidden;background:#0e1424;border-bottom:1px solid #5ad1b8;color:#e8ecf4}.qa-barra button{cursor:pointer;border-radius:999px;border:1px solid ${ROJO};background:transparent;color:#e8ecf4;box-sizing:border-box;flex:none;display:inline-flex;align-items:center;justify-content:center;line-height:1.2;padding:5px 12px;font:inherit;min-height:0;min-width:0;height:34px;white-space:nowrap}.qa-barra>*{flex:none}.qa-barra .qa-icono{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;padding:0;line-height:0;aspect-ratio:1;border-radius:50%}.qa-barra svg{display:block;flex:none}.qa-barra button[aria-pressed="true"]{background:${ROJO};color:#fff}.qa-barra [data-descartar]{border-color:#3a4560}.qa-barra .qa-enviar{gap:6px;height:34px;border-color:#5ad1b8;background:#0f8f78;color:#fff}.qa-sep{width:1px;height:22px;background:#3a4560;margin:0 4px}.qa-lienzo{flex:1;min-height:0;min-width:0;display:grid;place-items:center;overflow:hidden}.qa-lienzo canvas{max-width:100%;max-height:100%;cursor:crosshair;touch-action:none}.qa-barra .grabadora{min-width:0;display:flex;align-items:center;gap:6px}.qa-barra .grabadora .fila-g{display:flex;align-items:center;gap:6px}.qa-captura .qa-barra .grabadora [data-g]{font-size:14px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;gap:6px;box-sizing:border-box;height:34px;min-height:0;padding:0 12px;line-height:1.2;white-space:nowrap;background:transparent;border-color:${ROJO};color:#e8ecf4}.qa-captura .qa-barra .grabadora [data-g="parar"]{background:${ROJO};color:#fff}.qa-captura .qa-barra .grabadora [data-g="enviar"]{background:#0f8f78;border-color:#5ad1b8;color:#fff}.qa-barra .grabadora{flex-wrap:nowrap;max-height:44px}.qa-captura .qa-barra .grabadora.en-grabacion{padding:0 8px;border:2px solid ${ROJO};border-radius:999px;box-sizing:border-box;height:42px;background:#2a0f14;color:#ffd9d6}.qa-captura .qa-barra .grabadora .grabando-texto{font-size:14px;white-space:nowrap}.qa-captura .qa-barra .grabadora .audio-listo{flex:0 1 auto;flex-basis:auto;margin:0;line-height:34px;max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px;color:#9be7d3}.audio-listo .se-transcribe{display:none}.qa-barra .grabadora .ayuda-g:not(.esperando-mic):not(.aviso-g),.qa-barra .grabadora audio{display:none}.qa-barra .qa-fotos{display:flex;align-items:center;gap:6px}.qa-barra .qa-mini{position:relative;display:inline-flex;align-items:center;width:40px;height:40px;flex:none}.qa-barra .qa-mini .qa-ver{width:40px;height:40px;padding:0;overflow:hidden;border-radius:6px;border-color:#5ad1b8}.qa-barra .qa-mini img{display:block;width:100%;height:100%;object-fit:cover}.qa-barra .qa-mini .qa-x{position:absolute;top:-5px;right:-5px;width:20px;height:20px;min-height:0;min-width:0;aspect-ratio:1;padding:0;display:grid;place-items:center;border-radius:50%;background:#0e1424;border-color:#e8ecf4;line-height:0}.qa-barra .qa-cancelar{margin-left:auto}.qa-zoom{position:fixed;inset:0;z-index:2;display:grid;place-items:center;background:rgba(5,8,15,.92);cursor:zoom-out}.qa-zoom img{max-width:96vw;max-height:96vh;object-fit:contain}.qa-zoom .qa-cerrar-zoom{position:absolute;top:16px;right:16px;box-sizing:border-box;width:44px;height:44px;min-height:0;min-width:0;aspect-ratio:1;padding:0;display:grid;place-items:center;border-radius:50%;border:1px solid #e8ecf4;background:#0e1424;color:#e8ecf4;cursor:pointer;line-height:0}.qa-zoom .qa-cerrar-zoom svg{display:block}.qa-barra .qa-fotos:empty,.qa-barra .qa-error:empty{display:none}.qa-barra .qa-error{color:#ff8a8a;margin:0}`;

/**
 * El flujo de la pestaña compartida: se pide la primera vez que se congela y queda vivo toda la visita, hasta que la
 * pestaña se cierra (nmwqko02dtit, que reemplaza el soltarlo al congelar de nmwpnvo38tit): así se comparte una vez por
 * visita y no en cada fotonota. Si la persona deja de compartir con el aviso del navegador, la siguiente lo pide otra vez.
 */
let flujo: MediaStream | null = null;
let video: HTMLVideoElement | null = null;

/** Suelta el flujo: solo al cerrarse la pestaña (o al dejar de compartir desde el navegador). */
export function soltarFlujo() {
  flujo?.getTracks().forEach((p) => p.stop());
  flujo = null;
  if (video) video.srcObject = null;
  video = null;
}
if (typeof addEventListener === 'function') addEventListener('pagehide', soltarFlujo);

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
const dosCuadros = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

/** La vista de esta pestaña, congelada en un lienzo, sin lo que se esconde (el director flotante). Null si no se compartió. */
export async function congelarVista(esconder: HTMLElement[]): Promise<HTMLCanvasElement | null> {
  try {
    if (!flujo || !flujo.active) {
      flujo = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'browser' }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include' } as DisplayMediaStreamOptions);
      flujo.getVideoTracks()[0]?.addEventListener('ended', soltarFlujo);
      video = Object.assign(document.createElement('video'), { muted: true, playsInline: true });
      video.srcObject = flujo;
      await video.play();
    }
  } catch {
    soltarFlujo();
    return null;
  }
  const antes = esconder.map((e) => e.hidden);
  esconder.forEach((e) => (e.hidden = true));
  try {
    // Lo escondido sale del cuadro antes de congelarlo
    await dosCuadros();
    await esperar(250);
    const v = video!;
    const lienzo = document.createElement('canvas');
    lienzo.width = v.videoWidth || innerWidth;
    lienzo.height = v.videoHeight || innerHeight;
    lienzo.getContext('2d')!.drawImage(v, 0, 0, lienzo.width, lienzo.height);
    return lienzo;
  } finally {
    // El flujo sigue vivo para la siguiente fotonota de esta visita (nmwqko02dtit): se suelta al cerrar la pestaña
    esconder.forEach((e, i) => (e.hidden = antes[i]));
  }
}

/** Lo que manda la fotonota: su audio y sus fotos. `enviar` devuelve true si quedó guardada (si no, sigue abierta). */
export interface Fotonota { audio: string; fotos: File[] }

/**
 * La fotonota (nmwpnvo38tit), a pantalla completa: una sola barra arriba (herramientas, «Cancelar» y la grabación, que
 * empieza sola) y, debajo, la vista congelada entera, sin nada encima. Cada vez que se detiene, una foto con las rayas de ese momento; al seguir, la misma imagen y sus rayas.
 * Se manda con «Enviar ya» (de la grabación) o «Dejarlo en el Buzón»; «Cancelar» la descarta. Esc no la cierra: lo
 * grabado no se pierde por una tecla. Resuelve true si se mandó.
 */
export function fotonota(base: HTMLCanvasElement, enviar: (n: Fotonota) => Promise<boolean>): Promise<boolean> {
  const capa = document.createElement('dialog');
  capa.className = 'qa-captura';
  capa.setAttribute('aria-label', tx('qa.herramientas'));
  capa.innerHTML = `<style>${ESTILO}</style><form method="dialog">${barraDeCaptura()}<div class="qa-lienzo"></div></form>`;
  const lienzo = document.createElement('canvas');
  lienzo.width = base.width;
  lienzo.height = base.height;
  capa.querySelector('.qa-lienzo')!.append(lienzo);
  document.body.append(capa);
  const form = capa.querySelector('form')!;
  const cuenta = capa.querySelector<HTMLElement>('[data-fotos]')!;
  const error = capa.querySelector<HTMLElement>('[data-error]')!;
  const c = lienzo.getContext('2d')!;
  const trazos: Trazo[] = [];
  const fotos: File[] = [];
  // Si las rayas cambiaron desde la última foto
  let cambio = false;
  let herramienta: Herramienta = 'rectangulo';
  let grosor: Grosor = 'medio';
  let actual: Trazo | null = null;
  const repintar = () => {
    c.drawImage(base, 0, 0);
    for (const t of [...trazos, ...(actual ? [actual] : [])]) dibujarTrazo(c, t);
  };
  repintar();
  // Las fotos de la nota, una miniatura cada una; las direcciones se sueltan al repintar y al cerrar
  let urls: string[] = [];
  // Las que se quitaron a propósito: no cuentan como un fragmento sin su foto
  let quitadas = 0;
  const contar = () => {
    urls.forEach((u) => URL.revokeObjectURL(u));
    urls = fotos.map((f) => URL.createObjectURL(f));
    cuenta.innerHTML = miniaturasHtml(urls);
    if (fotos.length) cuenta.setAttribute('aria-label', tx('qa.fotos', { n: fotos.length }));
    else cuenta.removeAttribute('aria-label');
  };
  // La foto grande, para comprobar cómo salió: un clic en ella o Esc la cierra (y solo a ella, no a la nota)
  let zoom: HTMLElement | null = null;
  const cerrarZoom = () => {
    zoom?.remove();
    zoom = null;
  };
  const verGrande = (i: number) => {
    if (!urls[i]) return;
    cerrarZoom();
    zoom = document.createElement('div');
    zoom.className = 'qa-zoom';
    zoom.title = tx('qa.cerrarFoto');
    // Una X a la vista, arriba a la derecha, para quien no sabe que un clic en cualquier lado también la cierra (nmwqkshv3tit)
    zoom.innerHTML = zoomHtml(urls[i]);
    zoom.addEventListener('click', (e) => {
      e.stopPropagation();
      cerrarZoom();
    });
    capa.append(zoom);
  };
  // La foto de este momento: la imagen congelada con las rayas que lleva
  // `enSuLugar`: the last photo is taken again (its drawings changed), instead of adding another
  const foto = (enSuLugar = false) =>
    new Promise<void>((ok) => {
      actual = null;
      repintar();
      lienzo.toBlob((blob) => {
        if (blob && enSuLugar && fotos.length) fotos[fotos.length - 1] = new File([blob], `fotonota-${Date.now()}-${fotos.length}.png`, { type: 'image/png' });
        else if (blob) fotos.push(new File([blob], `fotonota-${Date.now()}-${fotos.length + 1}.png`, { type: 'image/png' }));
        cambio = false;
        contar();
        ok();
      }, 'image/png');
    });
  // De la pantalla al lienzo: la imagen se muestra más chica que su tamaño real
  const escala = () => lienzo.width / (lienzo.getBoundingClientRect().width || lienzo.width);
  const punto = (e: PointerEvent) => {
    const r = lienzo.getBoundingClientRect();
    const k = escala();
    return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
  };
  const nuevo = (e: PointerEvent): Trazo => ({ herramienta, grosor: GROSORES[grosor] * escala(), puntos: [punto(e), punto(e)] });
  const guardarTrazo = (t: Trazo) => {
    trazos.push(t);
    cambio = true;
  };
  lienzo.addEventListener('pointerdown', (e) => {
    // La línea va en dos clics: el primero la empieza, el segundo la termina
    if (herramienta === 'linea') {
      if (actual) {
        actual.puntos[1] = punto(e);
        guardarTrazo(actual);
        actual = null;
      } else actual = nuevo(e);
      return repintar();
    }
    lienzo.setPointerCapture(e.pointerId);
    actual = nuevo(e);
  });
  lienzo.addEventListener('pointermove', (e) => {
    if (!actual) return;
    if (actual.herramienta === 'lapiz') actual.puntos.push(punto(e));
    else actual.puntos[actual.puntos.length - 1] = punto(e);
    repintar();
  });
  lienzo.addEventListener('pointerup', () => {
    if (!actual || actual.herramienta === 'linea') return;
    guardarTrazo(actual);
    actual = null;
    repintar();
  });
  // La grabación, quieta en la barra de arriba (no se hace a un lado): cada fragmento detenido deja su foto
  const grabadora = new Grabadora(capa.querySelector('[data-grabadora]') as HTMLElement, true);
  // The photo a pause is still taking: sending waits for it, and never counts it as missing
  let tomando: Promise<void> = Promise.resolve();
  grabadora.alDetener = () => {
    tomando = foto();
  };
  return new Promise((ok) => {
    let listo = false;
    let enviando = false;
    const cerrar = (mandada: boolean) => {
      if (listo) return;
      listo = true;
      removeEventListener('keydown', tecla, true);
      cerrarZoom();
      urls.forEach((u) => URL.revokeObjectURL(u));
      void grabadora.terminar();
      if (capa.open) capa.close();
      capa.remove();
      ok(mandada);
    };
    const deshacer = () => {
      if (actual) actual = null;
      else if (trazos.pop()) cambio = true;
      repintar();
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && zoom) {
        e.preventDefault();
        e.stopPropagation();
        return cerrarZoom();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') deshacer();
    };
    addEventListener('keydown', tecla, true);
    capa.addEventListener('cancel', (e) => e.preventDefault());
    capa.querySelector('.qa-barra')!.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!b) return;
      // Las miniaturas: agrandar o quitar esa foto. Un clic aquí nunca llega a «Cancelar»
      if (b.closest('[data-fotos]')) {
        e.stopPropagation();
        const a = accionDeFotos(b);
        if (a.tipo === 'ver') verGrande(a.indice);
        else if (a.tipo === 'quitar') {
          cerrarZoom();
          const quedan = sinLaFoto(fotos, a.indice);
          fotos.length = 0;
          fotos.push(...quedan);
          quitadas++;
          contar();
        }
        return;
      }
      if (b.dataset.herramienta) {
        herramienta = b.dataset.herramienta as Herramienta;
        actual = null;
        capa.querySelectorAll<HTMLButtonElement>('[data-herramienta]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        return repintar();
      }
      if (b.dataset.grosor) {
        grosor = b.dataset.grosor as Grosor;
        capa.querySelectorAll<HTMLButtonElement>('[data-grosor]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        return;
      }
      if (b.hasAttribute('data-deshacer')) return deshacer();
      if (b.hasAttribute('data-limpiar')) {
        // Solo las rayas de esta fotonota: la imagen congelada se queda
        actual = null;
        if (trazos.length) cambio = true;
        trazos.length = 0;
        return repintar();
      }
      if (b.hasAttribute('data-descartar')) return cerrar(false);
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (enviando || listo) return;
      enviando = true;
      error.textContent = '';
      try {
        // Cierra la grabación (el último fragmento) y, si le falta, la última foto
        const audio = await grabadora.datos();
        if (!audio) return void (error.textContent = tx('qa.fotonotaSinAudio'));
        await tomando;
        const que = fotos.length ? fotoAlEnviar({ fotos: fotos.length + quitadas, fragmentos: grabadora.cuantosFragmentos, cambio }) : 'nueva';
        if (que !== 'nada') await foto(que === 'rehacer');
        if (await enviar({ audio, fotos: [...fotos] })) cerrar(true);
        else error.textContent = tx('qa.fotonotaNoSalio');
      } finally {
        enviando = false;
        grabadora.alFrente();
      }
    });
    capa.showModal();
    // Abre grabando: lo que se raya se dice en voz
    capa.querySelector<HTMLButtonElement>('[data-g="grabar"]')?.click();
  });
}
