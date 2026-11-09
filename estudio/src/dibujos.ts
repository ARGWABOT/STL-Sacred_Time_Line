// Los dibujos del director, en grande (pedido del titular pd_graficos_svg): un clic en un dibujo SVG de un documento lo
// abre encima de todo, al ancho de la pantalla, con lo que dice su aria-label debajo. En una pantalla angosta no se
// achica hasta no leerse: se ve a su tamaño y se recorre de lado. Se cierra con un clic, con «Cerrar» o con Esc, como una
// imagen adjunta (adjuntos.ts › verEnGrande). El dibujo ya llega limpio (limpiar.ts): la copia no trae nada que corra.
import { icono } from './iconos';
import { esc } from './util';

/**
 * Los dibujos que se abren en grande: los que se dibujan como imagen (docs/metodo/dibujos.md), en los documentos y en lo
 * que responde el director, a una nota o a una pregunta.
 */
export const DIBUJO = '.lector svg[role="img"], .respuesta-dir svg[role="img"], .respuesta-qa svg[role="img"]';

/**
 * El dibujo con sus `id` propios, para que la copia en grande no repita los del documento: sus flechas (`url(#…)`) y
 * sus enlaces internos (`href="#…"`) apuntan a los suyos.
 */
export function conIdsPropios(svg: string, sufijo: string): string {
  const ids = new Set([...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  let html = svg;
  for (const id of ids) {
    const e = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html
      .replace(new RegExp(`(\\sid=")${e}"`, 'g'), `$1${id}-${sufijo}"`)
      .replace(new RegExp(`url\\(#${e}\\)`, 'g'), `url(#${id}-${sufijo})`)
      .replace(new RegExp(`(href=")#${e}"`, 'g'), `$1#${id}-${sufijo}"`);
  }
  return html;
}

/** Abre un dibujo en grande, encima de todo. */
function dibujoEnGrande(svg: SVGSVGElement) {
  const nombre = svg.getAttribute('aria-label') ?? '';
  const dlg = document.createElement('dialog');
  dlg.className = 'imagen-grande dibujo-grande';
  dlg.innerHTML = `<figure><div class="lienzo-grande">${conIdsPropios(svg.outerHTML, 'grande')}</div>${nombre ? `<figcaption>${esc(nombre)}</figcaption>` : ''}</figure><button type="button" class="cerrar-grande">${icono('cerrar')} Cerrar</button>`;
  document.body.append(dlg);
  dlg.addEventListener('click', () => dlg.close());
  // Su Esc solo lo cierra a él, no el diálogo de abajo
  dlg.addEventListener('cancel', (e) => {
    e.preventDefault();
    dlg.close();
  });
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
}

/** Un clic en un dibujo de un documento (fuera de un enlace o un botón) lo abre en grande. */
export function activarDibujos() {
  document.addEventListener('click', (e) => {
    const t = e.target as Element;
    const svg = t.closest<SVGSVGElement>(DIBUJO);
    if (!svg || t.closest('a, button') || svg.closest('dialog.dibujo-grande')) return;
    dibujoEnGrande(svg);
  });
}
