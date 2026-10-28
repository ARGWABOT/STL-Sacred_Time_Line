// Lo que se muestra de un Markdown (los documentos del director, los archivos del repositorio de un proyecto, la
// documentación del Studio y las respuestas) pasa por aquí antes de entrar a la página. Marked deja pasar el HTML tal
// cual, y un archivo de un repositorio entregado puede traer cualquier cosa: una imagen con `onerror`, un enlace
// `javascript:` o un dibujo SVG con un script correría dentro del Studio, con su servidor local a la mano (decidir, pedir
// una revisión, encargar un «Hazlo tú»). Se quita lo que ejecuta algo o se sale del documento; el texto, las tablas, las
// imágenes y los dibujos quedan iguales (pedido del titular pd_graficos_svg: «que el Studio quite del dibujo lo que no
// sea dibujo: scripts, enlaces, atributos que ejecutan algo»).

import { enlazarArchivos } from './enlacesArchivos';

/** Lo que no es contenido de un documento: ejecuta, carga otra página, envía o restila todo el Studio. */
const ELEMENTOS = new Set([
  'script', 'noscript', 'template', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'portal', 'base', 'meta', 'link', 'style', 'form',
  // De un SVG: lo que mete HTML adentro o cambia un atributo después (un `href` que se vuelve `javascript:`)
  'foreignobject', 'animate', 'animatemotion', 'animatetransform', 'set', 'handler', 'listener',
]);

/** Los atributos que llevan una dirección: ahí no entra `javascript:`, `vbscript:` ni `data:` (salvo una imagen). */
const DIRECCIONES = new Set(['href', 'xlink:href', 'src', 'action', 'formaction', 'poster', 'background', 'data', 'codebase', 'cite', 'srcset']);

export const elementoPeligroso = (nombre: string) => ELEMENTOS.has(nombre.toLowerCase());

/**
 * Si un atributo se quita: los manejadores (`on…`), `srcdoc` y `ping`; una dirección que ejecuta o trae una página
 * entera; y, dentro de un dibujo, sus enlaces (un dibujo se mira, no lleva a otra parte).
 */
export function atributoPeligroso(elemento: string, nombre: string, valor: string, enDibujo = false): boolean {
  const n = nombre.toLowerCase();
  if (n.startsWith('on') || n === 'srcdoc' || n === 'ping') return true;
  if (!DIRECCIONES.has(n)) return false;
  if (enDibujo && elemento.toLowerCase() === 'a') return true;
  // Sin espacios ni caracteres de control, que el navegador ignora al leer el esquema (« java\nscript:»)
  const v = valor.replace(/[\s\u0000-\u001f]+/g, '').toLowerCase();
  if (v.startsWith('javascript:') || v.startsWith('vbscript:')) return true;
  return v.startsWith('data:') && !(n === 'src' && elemento.toLowerCase() === 'img' && v.startsWith('data:image/'));
}

/**
 * El HTML de un Markdown, sin lo que ejecuta algo. Se lee en una plantilla, que no carga imágenes ni corre nada.
 * `enlaces`: si los archivos que nombra se vuelven enlaces; no, cuando va dentro de un botón.
 */
export function limpio(html: string, enlaces = true): string {
  const t = document.createElement('template');
  t.innerHTML = html;
  for (const el of [...t.content.querySelectorAll('*')]) {
    if (elementoPeligroso(el.localName)) {
      el.remove();
      continue;
    }
    const enDibujo = !!el.closest('svg');
    for (const a of [...el.attributes]) if (atributoPeligroso(el.localName, a.name, a.value, enDibujo)) el.removeAttribute(a.name);
  }
  // Ya limpio, cada archivo que nombra se vuelve un enlace que lo abre (pd_enlaces_archivos)
  if (enlaces) enlazarArchivos(t.content);
  return t.innerHTML;
}
