// La tarjeta de una misión: la de ahora, completa, con sus pasos y sus botones; la entregada, plegada con su resumen; la
// compacta, de una línea. Salió de app.ts al partir los módulos grandes (propuesta aceptada pr_partir_modulos), como
// «Hoy» (todayView.ts): recibe lo que pinta y lo que depende de la página, y no guarda nada. Su nombre de archivo va en
// inglés, como cada archivo que nace al partirlos (decisión del titular del 30 de octubre de 2026).
import { estadoMision, type Destino, type EstadoDirector, type EstadoMision, type Mision, type Persona, type Plan } from '../../src/director/director';
import { momento } from './formato';
import { icono } from './iconos';
import { conAyuda } from './palabras';
import { t } from './textos';
import { esc } from './util';
import { NOMBRE_ESTADO_MISION } from './vistaRuta';

/** Lo que pinta la tarjeta. La página se lo da con sus datos y con lo que depende de ella. */
export interface DatosTarjeta {
  plan: Plan;
  estado: EstadoDirector;
  /** Quién mira: su misión lleva sus botones; y su nombre, para corregir lo que se entendió de su audio. */
  rol: Persona | null | undefined;
  nombre: string;
  transcripciones: Record<string, string>;
  /** Las misiones que se están entregando solas: mientras va, su «Entregar al director» no está. */
  entregandoSola: ReadonlySet<string>;
  /** Los pasos marcados de una misión, y si ya se fue a mirar lo que pide uno. */
  pasosHechos: (id: string) => number[];
  pasoAbierto: (mision: string, i: number) => boolean;
  /** Sus pasos (la de ahora, con el botón central en el paso que sigue) y el resumen de una entregada. */
  listaPasos: (m: Mision, deAhora?: boolean) => string;
  misionPasada: (m: Mision) => string;
  audioYTexto: (audio: string | undefined) => string;
  /** La franja de arriba de tu misión de ahora en su modo enfoque (app.ts › opcionesMision). */
  opcionesMision: () => string;
  botonIr: (destino: Destino) => string;
  tituloDoc: (ruta: string) => string;
  /** Si un plegable se abre: lo que la persona dejó abierto o cerrado a mano. */
  plegable: (clave: string) => string;
}

const ICONO_ESTADO: Record<EstadoMision, string> = { aprobada: '✓', entregada: '⏳', rehacer: '↺', en_curso: '○', pendiente: '○', bloqueada: '☁' };

/**
 * Lo que va arriba de los pasos de una misión. Su porQue ya no se muestra en la tarjeta: era una introducción breve de lo
 * que la misión explica completo en sus pasos, y el titular la quitó por redundante (notas de voz nmw3s0bahtit y
 * nmw3s3ux2tit, 5 de noviembre de 2026; reglasDelTitular.ts › sin_porque_en_tarjeta). Sigue en los datos para el director,
 * la bandeja y «Lo que sigue». Desde el segundo paso dice «Siguiente paso»: se ve, sin niebla y sin voz (guiaLectura.ts ›
 * FUERA; nota nmvzg6xtztit). En el primero, o sin pasos, nada. Pura.
 */
export function enunciadoDeMision(m: Pick<Mision, 'pasos'>, hechos: ReadonlySet<number>): string {
  const sigue = m.pasos.findIndex((_, k) => !hechos.has(k));
  return sigue > 0 ? `<p class="siguiente-paso">${t('mision.siguientePaso')}</p>` : '';
}

export function tarjetaMision(datos: DatosTarjeta, m: Mision, compacta = false, numero = 0) {
  const { entregandoSola, pasosHechos, pasoAbierto, listaPasos, misionPasada, audioYTexto, opcionesMision, botonIr, tituloDoc, plegable } = datos;
  const e = estadoMision(m, datos.plan, datos.estado);
  const mia = datos.rol === m.para;
  const rev = datos.plan.revisiones[m.id];
  const ent = datos.estado.entregas[m.id];
  if (compacta) {
    return `<article class="mision-c compacta ${e}" data-ancla="mision-${esc(m.id)}"><header><span class="icono-m ${e}">${ICONO_ESTADO[e]}</span><b>${esc(m.titulo)}</b><span class="xp">+${m.xp} XP</span></header>
      ${e === 'aprobada' && rev?.comentario ? `<p class="veredicto aprobada"><b>${t('mision.elDirector')}</b> ${esc(rev.comentario)}</p>` : ''}</article>`;
  }
  // Entregada, no se retira ni se comenta: siempre hacia adelante. Un clic despliega su resumen, sacado sin modelo de lo
  // que quedó escrito (sus pasos con lo que elegiste, lo que comentaste con su respuesta y su entrega), como una misión
  // pasada de «La ruta» (pregunta del titular nmvt4w3wgtit, 29 de octubre de 2026)
  if (e === 'entregada') {
    const corregir = ent!.audio && datos.transcripciones[ent!.audio] && ent!.quien === datos.nombre
      ? `<div class="acciones-m"><button type="button" data-corregir-transcripcion="${esc(ent!.audio)}" title="${esc(t('mision.corregirTitulo'))}">${t('mision.corregir')}</button></div>` : '';
    return `<details class="mision-c plegada entregada mision-pasada${mia ? ' mia' : ''}" data-ancla="mision-${esc(m.id)}"${plegable(`entregada|${m.id}`)}>
      <summary><header><span class="icono-m entregada">⏳</span><b>${esc(m.titulo)}</b><span class="xp">+${m.xp} XP</span></header>
      <p class="estado-texto">${t('mision.entregadaResumen', { quien: esc(ent!.quien), cuando: momento(ent!.cuando) })}</p></summary>
      ${misionPasada(m)}${corregir}
    </details>`;
  }
  const hechos = new Set(pasosHechos(m.id));
  const acciones: string[] = [];
  const todos = m.pasos.length > 0 && m.pasos.every((_, k) => hechos.has(k));
  // La misión se entrega sola al marcar su último paso; el botón queda solo si no tiene pasos o si esa entrega no se
  // pudo hacer (sin servidor). Con el director revisando también se entrega: queda para la revisión siguiente
  // En la de ahora, lo resaltado es también lo que hace el botón central del ratón (siguiente.ts)
  const siguiente = numero === 1 && mia ? ' data-siguiente' : '';
  if (['pendiente', 'en_curso', 'rehacer'].includes(e) && (todos || !m.pasos.length) && !entregandoSola.has(m.id)) acciones.push(`<button type="button" class="primario${todos ? ' llamada' : ''}" data-entregar="${esc(m.id)}"${siguiente}>${t('mision.entregar')}</button>`);
  acciones.push(`<button type="button" class="al-director" data-comentar="mision|${esc(m.id)}">${t('mision.comentar')}</button>`);
  // Si lo que sigue es leer o decidir en un documento, se continúa de un clic: directo a lo que toca, o en el modo
  // enfoque. Para cualquier otro paso no aparecen: ese paso trae su propio botón. Tampoco cuando ya se fue a mirar lo
  // que pide un paso que se responde aquí (elegir o marcar): lo que sigue es contar cómo fue, no volver a ir (nota de
  // voz del titular nmvofxfv0tit, 25 de octubre de 2026; animo.ts › destinoDeMision, lo mismo para la cara)
  const sigue = m.pasos.findIndex((_, k) => !hechos.has(k));
  const paso = sigue >= 0 ? m.pasos[sigue] : undefined;
  if (numero === 1 && mia && typeof paso === 'object' && paso.ir?.doc && (paso.hecho || !pasoAbierto(m.id, sigue))) {
    acciones.push(`<span class="continuar-m"><button type="button" data-continuar="${esc(m.id)}|${sigue}|" title="${esc(t('mision.continuarTitulo'))}">${t('mision.continuar')}</button><button type="button" class="primario" data-continuar="${esc(m.id)}|${sigue}|enfoque"${siguiente} title="${esc(t('mision.continuarEnfoqueTitulo'))}">${icono('enfoque')} ${t('mision.continuarEnfoque')}</button></span>`);
  }
  return `<article class="mision-c ${e}${mia ? ' mia' : ''}${numero === 1 ? ' sigue' : ''}" data-ancla="mision-${esc(m.id)}">
    ${numero === 1 ? `<div class="franja-mision"><span class="sigue-esta">${t('mision.ahora')}${conAyuda('mision')}</span>${mia ? opcionesMision() : ''}</div>` : ''}
    <header>${numero > 1 ? `<span class="num-m">${numero}</span>${numero === 2 ? conAyuda('reserva') : ''}` : ''}<b>${esc(m.titulo)}</b><span class="xp">+${m.xp} XP</span>${numero === 1 && e === 'pendiente' ? '' : `<span class="chip estado-m ${e}">${NOMBRE_ESTADO_MISION[e]}</span>`}</header>
    ${enunciadoDeMision(m, hechos)}
    ${listaPasos(m, numero === 1 && mia)}
    <p class="entrega"><b>${t('mision.entrega')}</b> ${esc(m.entrega)}</p>
    ${((sueltos) => (sueltos.length ? `<div class="docs-m">${sueltos.map((r) => botonIr({ doc: r, etiqueta: t('mision.leerComentar', { titulo: tituloDoc(r) }) })).join('')}</div>` : ''))(
      // Solo los documentos que ningún paso lleva a leer: los demás ya tienen su botón en su paso
      (m.documentos ?? []).filter((r) => !m.pasos.some((p) => typeof p !== 'string' && p.ir?.doc === r)))}
    ${rev && (e === 'aprobada' || e === 'rehacer') ? `<div class="veredicto ${rev.veredicto}"><b>${t(rev.veredicto === 'aprobada' ? 'mision.laAprobo' : 'mision.rehacerla')}</b> ${esc(rev.comentario)}</div>` : ''}
    ${ent ? `<div class="entregada-m"><span class="como">${t('mision.entregadaPor', { quien: esc(ent.quien), cuando: momento(ent.cuando) })}</span>${ent.nota ? `<p>${esc(ent.nota)}</p>` : ''}${audioYTexto(ent.audio)}</div>` : ''}
    <div class="acciones-m">${acciones.join('')}</div>
  </article>`;
}
