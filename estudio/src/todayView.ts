// «Hoy»: lo que ve cada persona al abrir el Studio (su misión de ahora o, sin una, el paso siguiente; lo que espera al
// director ya no se lista aquí: es un punto marcado de la línea, con su tarjeta, nota nmwnz3zvotit). Salió de app.ts al partir los módulos
// grandes (propuesta aceptada pr_partir_modulos), como lo hizo «Lo que sigue», que salió con la línea (pd_una_sola_linea): recibe lo que pinta y no guarda
// nada. La tarjeta de cada misión es la de missionCard.ts, que app.ts le pasa con sus datos. Su nombre de archivo va en
// inglés, como cada archivo que nace al partirlos (decisión del titular del 30 de octubre de 2026).
import { estadoMision, type Destino, type EstadoDirector, type EtapaArranque, type Mision, type Persona, type Plan } from '../../src/director/director';
import type { PasoSinMision } from '../../src/director/animo';
import { atributosDelCargador, CLAVE_PEDIR_REVISION, contenidoDelBoton, lineaDelCargador, type EstadoCargador } from './cargador';
import { icono } from './iconos';
import { t } from './textos';
import { esc } from './util';

/** Lo que pinta «Hoy». La página se lo da con sus datos y con lo que depende de ella. */
export interface DatosHoy {
  plan: Plan;
  estado: EstadoDirector;
  /** Quién mira. */
  rol: Persona | null | undefined;
  /** La persona que se ve (el Studio es de una sola: la primera). */
  personas: Persona[];
  /** Lo de arriba: el arranque, mientras el proyecto arranca. */
  arranque: string;
  etapa: EtapaArranque;
  /** Las misiones abiertas de una persona, en su orden: la primera es la de ahora. */
  abiertasDe: (p: Persona) => Mision[];
  /** La tarjeta de una misión (missionCard.ts): la de ahora, completa (número 1); las que esperan, plegadas. */
  tarjeta: (m: Mision, compacta?: boolean, numero?: number) => string;
  /** Sin misión abierta, el paso siguiente de una persona (animo.ts › pasoSinMision), sabiendo cuántas entregó. */
  pasoSinMision: (p: Persona, entregadas: number) => PasoSinMision | null;
  botonIr: (destino: Destino) => string;
  /** El cargador de «Pedir la revisión» (cargador.ts, nmwk5mrf4tit): el mismo que el de la cabecera. */
  cargadorPedir?: EstadoCargador | null;
}

/** Lo que una persona tiene que hacer: su misión de ahora completa. Lo que entregó y espera al director es un punto marcado de la línea (nmwnz3zvotit). */
function tareasDe(datos: DatosHoy, p: Persona) {
  const mis = datos.plan.misiones.filter((m) => m.para === p);
  const esperando = mis.filter((m) => estadoMision(m, datos.plan, datos.estado) === 'entregada');
  const ahora = datos.abiertasDe(p);
  return ahora.length ? datos.tarjeta(ahora[0], false, 1) : pasoSiguienteHtml(datos, p, esperando.length);
}

/**
 * Sin misión abierta, «Hoy» dice el paso siguiente, nunca solo que no hay nada (nota de voz del titular nmvsrix5ptit, 28
 * de octubre de 2026; animo.ts › pasoSinMision): esperar la revisión que corre o está pedida, lo del arranque, las
 * propuestas o pedir la revisión, con su botón, que dice que la pide (origen «hoy»): solo se ofrece, nunca se pide sola.
 */
function pasoSiguienteHtml(datos: DatosHoy, p: Persona, entregadas: number): string {
  const paso = datos.pasoSinMision(p, entregadas);
  if (!paso) return '';
  const botones =
    paso.que === 'pedir'
      ? `<button type="button" class="primario" data-revision="pedir" data-origen="hoy" title="${esc(t('hoy.pedirTitulo'))}"${atributosDelCargador(datos.cargadorPedir)}>${contenidoDelBoton(t('hoy.pedirLaRevision'), datos.cargadorPedir, icono('revisar'))}</button>${lineaDelCargador(CLAVE_PEDIR_REVISION, datos.cargadorPedir)}`
      : paso.que === 'proyecto' ? datos.botonIr({ vista: 'proyecto', ancla: datos.etapa === 'objetivo' ? 'p-objetivo' : datos.etapa === 'contar' ? 'p-contexto' : 'p-repositorio', etiqueta: t('hoy.irProyecto') })
      // La primera propuesta que espera, con su tarjeta debajo de la línea (app.ts › irA)
      : paso.que === 'propuestas' ? datos.botonIr({ vista: 'propuestas', etiqueta: t('hoy.irPropuestas') })
      : '';
  return `<div class="paso-siguiente vacio-m" id="paso-siguiente" role="status"><p>${esc(paso.texto)}</p>${botones ? `<div class="botones">${botones}</div>` : ''}</div>`;
}

/**
 * «Hoy»: lo primero que se ve, y una sola línea: tu misión de ahora, completa (y, mientras el proyecto arranca, el
 * arranque). Lo que dijo el director y lo último que pasó no se repiten aquí: se leen en «¿Dónde quedamos?», cuyo botón
 * avisa cuando hay algo nuevo. Lo que espera de ti es tu misión.
 */
export function vistaHoy(datos: DatosHoy) {
  // Sin la ficha al lado: tu nivel y tu avance se abren desde el icono de información sobre el director (pedido
  // pd_panel_revision, nota de voz del titular nmw12urbdtit), y la misión toma todo el ancho
  return `${datos.arranque}
    <div class="hoy-columnas solo"><div class="trabajo">${tareasDe(datos, datos.personas[0])}</div></div>`;
}
