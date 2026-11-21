// El selector de idioma, junto a tu nombre al pie de la barra (pedido pd_idiomas; t_decide_selector_cuando): las siglas ES
// y EN, siempre a la vista, con la del idioma de ahora resaltada, que lo cambian de un toque. Lo guarda el servidor en la
// configuración de este computador (app.ts › cambiarIdioma). Puro.
import { IDIOMAS, type Idioma } from '../../src/director/idioma';
import { t } from './textos';
import { esc } from './util';

export function selectorIdioma(ahora: Idioma): string {
  return IDIOMAS.map((i) => `<button type="button" class="sigla-idioma${i === ahora ? ' sel' : ''}" data-idioma="${i}" aria-pressed="${i === ahora}" title="${esc(t(`idioma.${i}`))}">${i.toUpperCase()}</button>`).join('');
}
