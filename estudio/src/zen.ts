// El velo del modo enfoque: una capa que cubre toda la pantalla, también la cabecera, y desenfoca y tiñe todo lo que
// queda debajo de lo enfocado (la ventana del documento o la de la tarjeta de la misión), con un viñeteado quieto y
// tenue del color del tema. Es solo CSS (director.css › .velo-zen): entra y sale suave, con el desenfoque y el tinte
// creciendo juntos, y después no se mueve ni sigue al puntero. Aquí solo se monta, una vez y desde el principio (así ya
// la primera vez entra suave); lo pone y lo quita app.ts con la clase «enfoque» (un documento) o «enfoque-mision»
// (la misión) del documento. Con él va la salida, que flota encima del velo en el lugar del botón de la cabecera, sin
// franja alrededor: app.ts › aplicarEnfoque la muestra, le pone el texto y ubicarEnfoque la lleva a su lugar. Y la
// línea viva, pegada al pie de lo enfocado (director.css › .franja-linea): lineaViva.ts la pinta en «linea-enfoque», y
// su botón la oculta o la muestra (app.ts › ponerLineaEnfoque), y las dos se centran juntas (app.ts › pegarFranja).
// Sus textos salen de los diccionarios, y app.ts › pintarSelectorIdioma los vuelve a poner al fijar o cambiar el idioma
// (pd_interfaz_ingles: en inglés no queda nada en español).
import { icono } from './iconos';
import { t } from './textos';
import { esc } from './util';

const velo = document.createElement('div');
velo.className = 'velo-zen';
velo.setAttribute('aria-hidden', 'true');

const salida = document.createElement('button');
salida.type = 'button';
salida.className = 'boton-suave boton-enfoque salida-enfoque';
salida.dataset.enfoque = '';
salida.hidden = true;
salida.setAttribute('aria-pressed', 'true');
salida.innerHTML = `${icono('enfoque')}<span>${esc(t('enfoque.salir'))}</span>`;

const franja = document.createElement('div');
franja.className = 'franja-linea';
franja.innerHTML = `<div class="lv-caja" id="linea-enfoque"></div><button type="button" class="franja-linea-boton" data-franja-linea aria-pressed="true">${esc(t('enfoque.ocultarLinea'))}</button>`;

document.body.append(velo, salida, franja);
