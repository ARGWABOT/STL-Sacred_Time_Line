// La barra fina de las cinco paradas de la entrega (pedido pd_entrega_fluida; decisión nmwdhtp2ntit de «La entrega, paso
// a paso»): Entregado · Diagnóstico · Meta · Ruta · Primera misión, con la de ahora encendida y las hechas con su marca,
// sin tiempos ni porcentajes. En un proyecto que aún no existe, la segunda parada es «Planteamiento» (nmwdxuaavtit). Va
// arriba de las dos ventanas de espera (esperaRevision.ts) y de «Proyecto» › «La meta» (vistaProyecto.ts). Pura.
import { t } from './textos';
import { esc } from './util';

/** Las cinco paradas, en orden. */
export const PARADAS = ['entregado', 'diagnostico', 'meta', 'ruta', 'mision'] as const;
export type Parada = (typeof PARADAS)[number];

/**
 * La parada de ahora en una ventana de espera: el diagnóstico (o el planteamiento) mientras trabaja y, listo, la meta;
 * la ruta mientras se traza y, trazada, la primera misión. Pura.
 */
export function paradaDeEspera(de: 'diagnostico' | 'ruta', lista: boolean): Parada {
  if (de === 'diagnostico') return lista ? 'meta' : 'diagnostico';
  return lista ? 'mision' : 'ruta';
}

/**
 * La parada de ahora en «La meta», solo mientras el proyecto arranca: sin meta fijada, la meta si ya hay diagnóstico y,
 * si no, el diagnóstico. Con la meta fijada, la barra ya no va ahí (null): la ruta tiene su propia espera. Pura.
 */
export function paradaDeLaMeta(conMeta: boolean, conDiagnostico: boolean): Parada | null {
  if (conMeta) return null;
  return conDiagnostico ? 'meta' : 'diagnostico';
}

/** La barra: cada parada con su nombre, las hechas con ✓ y la de ahora encendida (`aria-current="step"`). Pura (salvo los textos). */
export function htmlParadas(actual: Parada, nuevo: boolean): string {
  const i = PARADAS.indexOf(actual);
  const nombre = (p: Parada) => t(p === 'diagnostico' && nuevo ? 'paradas.planteamiento' : (`paradas.${p}` as const));
  return `<ol class="paradas-entrega" aria-label="${esc(t('paradas.etiqueta'))}">${PARADAS.map((p, k) => {
    const estado = k < i ? 'hecha' : k === i ? 'ahora' : 'por-venir';
    return `<li class="parada ${estado}" data-parada="${p}"${k === i ? ' aria-current="step"' : ''}><span class="marca-parada" aria-hidden="true">${k < i ? '✓' : ''}</span>${esc(nombre(p))}</li>`;
  }).join('')}</ol>`;
}
