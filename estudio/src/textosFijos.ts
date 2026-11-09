import { t, type ClaveDeTexto } from './textos';
import { laCarpetaDelStudio } from './carpetaDelStudio';

/**
 * Lo fijo de index.html, en el idioma de la interfaz (pd_interfaz_ingles, nmw6u7ylttit, nmw6ucev4tit). index.html no
 * trae ninguna frase: cada elemento nombra su clave de los diccionarios (textos/es.ts y textos/en.ts) y esto la pone, al
 * cargar y cada vez que cambia el idioma.
 * - `data-tx`: su texto.
 * - `data-tx-title`: lo que dice al pasar el ratón.
 * - `data-tx-aria`: su nombre para el lector de pantalla.
 * - `data-tx-etiqueta`: el nombre que muestra el círculo del director al pasar el ratón.
 * Y en la cabecera (#mando), `data-aviso-sin-servidor` y `data-aviso-reinicio`: los avisos que los estilos muestran con
 * `attr()` cuando el servidor no responde (estilos.css › body.sin-servidor).
 */
export function aplicarTextosFijos(raiz: Document = document): void {
  raiz.title = t('fijos.tituloPagina');
  const clave = (el: Element, atributo: string) => el.getAttribute(atributo) as ClaveDeTexto;
  for (const el of raiz.querySelectorAll<HTMLElement>('[data-tx]')) el.textContent = t(clave(el, 'data-tx'));
  for (const el of raiz.querySelectorAll<HTMLElement>('[data-tx-title]')) el.title = t(clave(el, 'data-tx-title'));
  for (const el of raiz.querySelectorAll<HTMLElement>('[data-tx-aria]')) el.setAttribute('aria-label', t(clave(el, 'data-tx-aria')));
  for (const el of raiz.querySelectorAll<HTMLElement>('[data-tx-etiqueta]')) el.dataset.etiqueta = t(clave(el, 'data-tx-etiqueta'));
  // Los avisos que pintan los estilos (::before con attr()): los estilos no traen frases
  const cabeza = raiz.getElementById('mando');
  cabeza?.setAttribute('data-aviso-sin-servidor', t('fijos.servidorNoResponde', { carpeta: laCarpetaDelStudio() }));
  cabeza?.setAttribute('data-aviso-reinicio', t('fijos.servidorReinicia'));
}
