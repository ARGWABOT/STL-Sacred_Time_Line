// La vista «Buzón»: lo que se le ha dicho al director y lo que respondió, con su búsqueda y sus filtros por tipo y por cómo
// quedó. Salió de app.ts al partir los módulos grandes (propuesta aceptada pr_partir_modulos), como «Preguntas»
// (vistaPreguntas.ts): recibe lo que pinta y no guarda nada; la búsqueda y los filtros que quedaron, lo que tiene abierto
// quien mira y todo lo que se pinta igual en el resto del Studio (la tarjeta de cada nota, los plegables que recuerdan si
// se abrieron, el aviso de que se ve solo a una persona) los da la página. Lo suyo, en inglés también (pd_idiomas): los
// nombres de los estados los eligió el titular (nmvxx8kr9tit); lo que dijo cada persona queda como está.
import {
  coincideBusqueda,
  COMO_PENDIENTE,
  comoQuedaronEnBuzon,
  esPregunta,
  notasDeTipo,
  notasQueQuedaron,
  notasReemplazadas,
  palabrasDeBusqueda,
  pendientesEnBuzon,
  tiposEnBuzon,
  type ComoQuedo,
  type Lugar,
  type Nota,
  type Respuesta,
  type TipoEnBuzon,
  YA_LO_COMENTE,
  YA_LO_DIJE,
} from '../../src/director/director';
import { conAyuda } from './palabras';
import { t } from './textos';
import { esc } from './util';

/**
 * El texto de una nota como se ve: la marca guardada de «Ya te lo dije en mi comentario» o «Ya lo comenté antes» (el
 * Studio la guarda en español, igual en todos los idiomas, porque el director la busca así) se pinta en el idioma de la
 * interfaz (nota nmw6r9at1tit: en inglés salía en español). Lo demás que dijo la persona queda como está. Pura.
 */
export function textoDeNotaALaVista(n: Pick<Nota, 'texto' | 'sobre'>): string | undefined {
  const texto = n.texto;
  if (!texto) return texto;
  const eleccion = (n.sobre as { eleccion?: string } | undefined)?.eleccion;
  for (const [marca, clave] of [[YA_LO_DIJE, 'paso.yaLoDije'], [YA_LO_COMENTE, 'paso.yaLoComente']] as const) {
    if (eleccion === marca && texto.startsWith(marca)) return t(clave) + texto.slice(marca.length);
  }
  return texto;
}

/** El nombre de un tipo de nota, en el idioma de ahora. */
export const nombreTipoEnBuzon = (tipo: TipoEnBuzon) => t(`buzon.tipo.${tipo}`);
/** Cómo quedó una nota (esperando, o el tratamiento de su respuesta), en el idioma de ahora. */
export const nombreComoQuedo = (como: ComoQuedo) => t(`buzon.como.${como}`);

/**
 * Las ya respondidas que se pintan de una vez: pintar todas, con cientos de notas, detenía la página (elección del titular
 * t_decide_aligerar_buzon, 2 de noviembre de 2026). Lo que espera se ve siempre entero, y buscar busca en todas.
 */
export const RESPONDIDAS_DE_A = 50;

/** Lo que pinta la vista. La página se lo da con sus datos y con lo que depende de ella, ya pintado. */
export interface DatosBuzon {
  /** Las notas que quien mira ve (con el filtro «Ver como» puesto), de la más vieja a la más nueva, también las preguntas. */
  notas: Nota[];
  /** Lo que respondió el director, por la nota que responde. */
  respuestas: Record<string, Respuesta>;
  /** Lo que se entendió de cada audio, por su ruta. */
  transcripciones: Record<string, string>;
  /** Lo que se escribió en «Buscar en el Buzón». */
  busqueda: string;
  /** El tipo y el modo («Cómo quedó») elegidos en los filtros; vacío: todas. */
  tipo: TipoEnBuzon | '';
  como: ComoQuedo | '';
  /** La página guarda los filtros que quedaron vigentes: uno que ya no tiene ninguna nota vuelve a «Todas». */
  fijarFiltros: (filtros: { tipo: TipoEnBuzon | ''; como: ComoQuedo | '' }) => void;
  /** Si quien mira abrió «Ya respondidas»: un repintado no la cierra. */
  respondidasAbiertas: boolean;
  /** Cuántas de las ya respondidas se pintan, las más nuevas; las demás, con «Ver las anteriores». Sin decirlo, RESPONDIDAS_DE_A. */
  respondidasVistas?: number;
  /** Si lo que dejó una respuesta en su lugar ya se resolvió (la propuesta respondida, el pedido hecho, la misión entregada…). */
  resueltoAqui: (r: Pick<Respuesta, 'tratamiento'> & Partial<Pick<Respuesta, 'destino' | 'cuando'>>) => boolean;
  /** La línea que dice que se ve solo lo de una persona, si hay un filtro puesto. */
  filtroVisible: () => string;
  /** El atributo de un plegable que recuerda si quien mira lo abrió. */
  plegable: (clave: string) => string;
  /** Una nota, pintada por la página como en el resto del Studio (plegada en el Buzón; `enRespuesta`: lo buscado está en la respuesta). */
  tarjetaNota: (n: Nota, conSobre: boolean, plegada: boolean, enRespuesta: boolean, aqui: Lugar) => string;
}

/**
 * El Buzón: lo que se le ha dicho al director y lo que respondió, cada nota plegada en una línea. No tiene formulario
 * propio: se le escribe desde el comentario junto a su cara, o con «Comentar al director» en cada cosa.
 */
export function vistaBuzon(datos: DatosBuzon) {
  return `<details class="explica-buzon panel-d"${datos.plegable('explica-buzon')}>
      <summary>${t('buzon.queEs')}${conAyuda('buzon')}</summary>
      <p>${t('buzon.explica1')}</p>
      <p>${t('buzon.explica2')}</p>
      <p>${t('buzon.explica3')}</p>
    </details>
    ${datos.filtroVisible()}<div class="buscar-buzon" role="search">
      <label for="buscar-buzon">${t('buzon.buscar')}</label>
      <input id="buscar-buzon" type="search" data-buscar-buzon value="${esc(datos.busqueda)}" placeholder="${esc(t('buzon.buscarPista'))}" autocomplete="off" spellcheck="false">
      <p class="como">${t('buzon.buscarComo')}</p>
    </div>
    <div id="resultados-buzon">${notasDelBuzon(datos)}</div>`;
}

/** Lo reemplazado, calculado una vez por cada juego de respuestas: la tarjeta de cada nota lo pregunta. */
const reemplazadasPorRespuestas = new WeakMap<object, Map<string, string>>();

/**
 * La marca «Reemplazado» de una nota que otra posterior dejó sin efecto (`Respuesta.reemplaza`: lo marca el director al
 * responder, decisión del titular en t_decide_reemplaza; pedido pd_reemplaza_elecciones): una decisión, una opción elegida
 * en un paso o una nota cualquiera. Vacía si sigue en firme.
 */
export function marcaReemplazada(n: Pick<Nota, 'id'>, respuestas: Record<string, Respuesta>): string {
  let fuera = reemplazadasPorRespuestas.get(respuestas);
  if (!fuera) reemplazadasPorRespuestas.set(respuestas, (fuera = notasReemplazadas(respuestas)));
  return fuera.has(n.id) ? `<span class="tratamiento reemplazada" title="${esc(t('buzon.reemplazadaComo'))}">${t('buzon.reemplazada')}</span>` : '';
}

/** Lo que dice una nota (su texto, lo que se entendió de su audio, lo que eligió) y, con `conRespuesta`, lo que respondió el director. */
function textosDeNota(datos: DatosBuzon, n: Nota, conRespuesta = true) {
  return [n.texto, n.audio && datos.transcripciones[n.audio], n.despues, n.sobre.eleccion, n.sobre.fragmento, conRespuesta ? datos.respuestas[n.id]?.texto : undefined];
}

/**
 * Lo que dijo la persona en una nota, en el orden en que entró: lo escrito al dejarla, su audio con lo que se entendió y lo
 * que le sumó después, sin importar qué se transcribió primero (nota de voz del titular nmvwpl26stit); al final, sus
 * adjuntos. Una nota de antes, sin `despues`, se ve como siempre.
 */
export const dichoDeNota = (n: Nota, audioYTexto: (audio: string | undefined) => string, adjuntos: (n: Nota) => string) =>
  `${n.texto ? `<p>${esc(textoDeNotaALaVista(n) ?? '')}</p>` : ''}${audioYTexto(n.audio)}${n.despues ? `<p>${esc(n.despues)}</p>` : ''}${adjuntos(n)}`;

/**
 * Las notas del Buzón: lo que espera al director y, plegado, lo ya respondido. Con algo en «Buscar en el Buzón», solo
 * las que lo dicen (en la nota o en su respuesta), todas juntas, de la más nueva a la más vieja. La página la repinta sola
 * al escribir, sin tocar el campo de búsqueda.
 */
export function notasDelBuzon(datos: DatosBuzon) {
  const { respuestas, busqueda, resueltoAqui, tarjetaNota } = datos;
  let { tipo: tipoBuzon, como: comoBuzon } = datos;
  // Las preguntas también (pedido pd_preguntas_buzon): un solo centro de lo que hablas con el director, con su filtro
  const todas = [...datos.notas].reverse();
  // El filtro por tipo: uno por tipo que tenga notas, con su cuenta; las de antes, en «Sin tipo» (tu decisión nmvsv9nuytit).
  // Arriba, como pestañas; «Cómo quedó», debajo, en píldoras; cada uno en una sola línea (nota nmvsxdgvdtit)
  const tipos = tiposEnBuzon(todas, respuestas);
  if (tipoBuzon && !tipos.some(([x]) => x === tipoBuzon)) tipoBuzon = '';
  // Cada número cuenta solo lo que pide atención (pendientesEnBuzon; nota nmvt49i09tit): sin nada pendiente, sin número
  const cifra = (k: number) => (k ? ` · ${k}` : '');
  const pendientes = (ns: Nota[]) => cifra(pendientesEnBuzon(ns, respuestas, resueltoAqui));
  let filtro = tipos.length > 1
    ? `<div class="filtro-tipo filtro-pestanas" role="group" aria-label="${esc(t('buzon.filtroTipo'))}">${[['', `${t('buzon.todas')}${pendientes(todas)}`] as [string, string], ...tipos.map(([x]) => [x, `${nombreTipoEnBuzon(x)}${pendientes(notasDeTipo(todas, respuestas, x))}`] as [string, string])]
      .map(([x, n]) => `<button type="button" class="chip-tipo${x === tipoBuzon ? ' activo' : ''}" data-tipo-buzon="${x}" aria-pressed="${x === tipoBuzon}">${esc(n)}</button>`).join('')}</div>`
    : '';
  // Y cómo quedó cada una (la parte «Seguimiento» de pr_tipo_nota): esperando o el tratamiento de su respuesta, sobre las de ese tipo
  const deTipo = notasDeTipo(todas, respuestas, tipoBuzon);
  const comos = comoQuedaronEnBuzon(deTipo, respuestas, resueltoAqui);
  if (comoBuzon && !comos.some(([c]) => c === comoBuzon)) comoBuzon = '';
  datos.fijarFiltros({ tipo: tipoBuzon, como: comoBuzon });
  const filtroComo = comos.length > 1
    ? `<div class="filtro-tipo filtro-como" role="group" aria-label="${esc(t('buzon.filtroComo'))}"><span class="como">${t('buzon.comoQuedo')}</span>${[['', `${t('buzon.todas')}${pendientes(deTipo)}`] as [string, string], ...comos.map(([c, k]) => [c, `${nombreComoQuedo(c)}${COMO_PENDIENTE.includes(c) ? cifra(k) : ''}`] as [string, string])]
      .map(([c, n]) => `<button type="button" class="chip-tipo${c === comoBuzon ? ' activo' : ''}" data-como-buzon="${c}" aria-pressed="${c === comoBuzon}">${esc(n)}</button>`).join('')}</div>`
    : '';
  const notas = notasQueQuedaron(deTipo, respuestas, comoBuzon, resueltoAqui);
  filtro += filtroComo;
  // Con las preguntas a la vista, las respuestas se siguen leyendo juntas, como un informe (su sección ya no va en la barra)
  if (tipoBuzon === 'pregunta' && todas.some(esPregunta)) filtro += `<p class="como informe-preguntas">${t('buzon.informe')}</p>`;
  const aqui: Lugar = { vista: 'buzon' };
  if (palabrasDeBusqueda(busqueda).length) {
    const halladas = notas.filter((n) => coincideBusqueda(textosDeNota(datos, n), busqueda));
    return `${filtro}<h3>${t('buzon.encontre')} <small>· ${halladas.length}</small></h3>
      ${halladas.length
        ? `<ul class="notas-lista">${halladas.map((n) => tarjetaNota(n, true, true, !coincideBusqueda(textosDeNota(datos, n, false), busqueda), aqui)).join('')}</ul>`
        : `<p class="intro">${t('buzon.sinHallar', { busqueda: esc(busqueda.trim()) })}</p>`}`;
  }
  const esperando = notas.filter((n) => !respuestas[n.id]);
  const respondidas = notas.filter((n) => respuestas[n.id]);
  const vistas = respondidas.slice(0, datos.respondidasVistas ?? RESPONDIDAS_DE_A);
  const faltan = respondidas.length - vistas.length;
  return `${filtro}<h3>${t('buzon.esperando')} <small>· ${esperando.length}</small></h3>
    ${esperando.length ? `<ul class="notas-lista">${esperando.map((n) => tarjetaNota(n, true, true, false, aqui)).join('')}</ul>` : `<p class="intro">${t('buzon.nadaEsperando')}</p>`}
    ${respondidas.length
      // Lo ya respondido va plegado: al entrar, la atención queda en lo que espera
      ? `<details class="ya-respondidas" data-ya-respondidas${datos.respondidasAbiertas ? ' open' : ''}><summary><h3>${t('buzon.respondidas')} <small>· ${respondidas.length}</small></h3></summary>
        <ul class="notas-lista">${vistas.map((n) => tarjetaNota(n, true, true, false, aqui)).join('')}</ul>${faltan ? `<button type="button" class="boton-suave ver-anteriores" data-ver-anteriores>${t('buzon.verAnteriores', { n: faltan })}</button>` : ''}</details>`
      : `<h3>${t('buzon.respondidas')} <small>· 0</small></h3><p class="intro">${t('buzon.todaviaNinguna')}</p>`}`;
}
