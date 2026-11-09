// «Lo que sigue» en «Hoy»: la cola de la persona, plegada debajo de su misión de ahora, y al final la del director. Salió
// de app.ts al partir los módulos grandes (propuesta aceptada pr_partir_modulos), como la ficha de cada persona
// (personCard.ts): recibe lo que pinta y no guarda nada. Su nombre de archivo va en inglés, como cada archivo que nace al
// partirlos (decisión del titular del 30 de octubre de 2026); lo de adentro pasa al inglés con el resto del código.
import { colaDelDirector, esperaA, nombreDeLoQueEspera, RESERVA_MINIMA, reservaDeMisiones, type EstadoDirector, type Mision, type Persona, type Plan } from '../../src/director/director';
import { colaDelDirectorHtml, esperanAlDirector, misionesQueSiguen } from './colaDirector';
import { t } from './textos';
import { esc } from './util';

/** Lo que pinta «Lo que sigue». La página se lo da con sus datos. */
export interface DatosLoQueSigue {
  plan: Plan;
  estado: EstadoDirector;
  persona: Persona;
  /** La misión de ahora de esa persona, si tiene una: no se cuenta entre las que siguen. */
  ahora?: string;
  /** Si va la cola del director: solo en la columna de quien mira, porque es la misma para todo el equipo. */
  conColaDelDirector: boolean;
  /** Los atributos de un plegable que recuerda si quedó abierto (app.ts › plegable). */
  plegable: (clave: string) => string;
}

/**
 * La cola, plegada debajo de la misión de ahora (nota de voz del titular, 22 de octubre de 2026: «quiero ver la lista de
 * misiones pendientes para confirmar si estás cumpliendo la condición; colapsable, para no quitarle atención»). Cerrada
 * por defecto: cada misión que sigue con su porqué, y aparte las retenidas al cierre y las de la fase siguiente, que no
 * cuentan en la reserva porque no se alcanzan sin el director. Solo se lee: se trabaja en la de ahora. Al final, aparte,
 * la cola del director (colaDirector.ts), solo en la columna de quien mira: es la misma para todo el equipo.
 */
export function colaDe(datos: DatosLoQueSigue) {
  const { plan, estado, persona: p } = datos;
  const r = reservaDeMisiones(plan, estado, p);
  // Todas las que alcanza sin el director, también las encadenadas con `despuesDe`, en el orden en que le aparecen: el
  // título cuenta lo mismo que la reserva (nota nmvvalvdttit: contaba solo las abiertas y decía «0 misiones más»)
  const siguen = misionesQueSiguen(r, datos.ahora);
  const alDirector = esperanAlDirector(r);
  const delDirector = datos.conColaDelDirector ? colaDelDirector(plan, estado) : [];
  // El lote corto, con su razón a la vista (nota del titular nmvq6s7wmtit, 26 de octubre de 2026): donde se ve y se discute
  const corta = plan.reservaCorta?.[p]?.razon?.trim();
  if (!siguen.length && !r.enEspera.length && !r.esperan.length && !r.siguientes.length && !delDirector.length && !corta) return '';
  // Lo que necesita antes, con su nombre: así se ve por qué todavía no aparece
  const necesita = (m: Mision) => esperaA(plan, estado, m).map((id) => `«${esc(nombreDeLoQueEspera(plan, id))}»`).join(', ');
  const cuando = (m: Mision) =>
    r.siguientes.includes(m) ? t('cola.deLaSiguiente') : esperaA(plan, estado, m).length ? t('cola.apareceAlEntregar', { que: necesita(m) }) : '';
  const item = (m: Mision) => `<li><b>${esc(m.titulo)}</b><small>${cuando(m)}${esc(m.porQue)}</small></li>`;
  const soloSuPorQue = (m: Mision) => `<li><b>${esc(m.titulo)}</b><small>${esc(m.porQue)}</small></li>`;
  const queEspera = (m: Mision) => `<li><b>${esc(m.titulo)}</b><small>${t('cola.apareceHecho', { que: necesita(m) })}</small></li>`;
  // La cuenta baja al entregar cada una, hasta la revisión siguiente, que la vuelve a llenar: no es una alarma
  // Sin la cuenta de la reserva a la vista: es cosa del director (decisión del titular nmvya8dlrtit, pd_hoy_en_ruta)
  return `<details class="cola-m panel-d"${datos.plegable(`cola-${p}`)}><summary><h4>${t('cola.titulo', { n: siguen.length })}</h4></summary>
    ${corta ? `<p class="como reserva-corta"><b>${t('cola.porQueLote', { minimo: RESERVA_MINIMA })}</b> ${esc(corta)} ${t('cola.porQueLoteCierre', { minimo: RESERVA_MINIMA })}</p>${sinLaPersonaHtml(plan, p)}` : ''}
    ${siguen.length ? `<ol class="cola-lista">${siguen.map(item).join('')}</ol>` : `<p class="como">${t('cola.noHayMas')}</p>`}
    ${alDirector.length ? `<p class="como">${t('cola.cuandoTermine')}</p><ul class="cola-lista espera">${alDirector.map(queEspera).join('')}</ul>` : ''}
    ${r.enEspera.length ? `<p class="como">${t('cola.alCierre')}</p><ul class="cola-lista espera">${r.enEspera.map(soloSuPorQue).join('')}</ul>` : ''}
    ${r.siguientes.length && r.enEspera.length ? `<p class="como">${t('cola.enLaSiguiente', { que: r.siguientes.map((m) => `«${esc(m.titulo)}»`).join(', ') })}</p>` : ''}
    ${colaDelDirectorHtml(delDirector)}
  </details>`;
}

/**
 * De cada cosa de la cola del director que no te necesita, por qué (`reservaCorta` › `sinLaPersona`, `colaSinCruzar`;
 * pregunta del titular nmvu1zb23tit, 29 de octubre de 2026): así se comprueba el lote corto cosa por cosa, no por una frase.
 */
export function sinLaPersonaHtml(plan: Plan, p: Persona) {
  const razones = Object.entries(plan.reservaCorta?.[p]?.sinLaPersona ?? {});
  if (!razones.length) return '';
  return `<p class="como">${t('cola.sinLaPersona')}</p><ul class="cola-lista sin-la-persona">${razones.map(([id, razon]) => `<li><b>${esc(nombreDeLoQueEspera(plan, id))}</b><small>${esc(razon)}</small></li>`).join('')}</ul>`;
}
