// «Hoy» y «La ruta», una sola interfaz (pedido pd_hoy_en_ruta; nota de voz del titular del 1 de noviembre de 2026 y sus
// elecciones del 3 de noviembre, nmw0zzda1tit y nmw0zzx7itit), y desde el 19 de noviembre, con el plan en una sola línea
// hacia la meta (pedido pd_una_sola_linea, segunda rebanada, y sus decisiones nmwn1fh8etit, nmwn1gkpytit, nmwn1gup1tit,
// nmwn1h6y1tit y nmwn1hld9tit). Arriba, la línea: desde «Hoy» hasta la bandera de tu meta, cada punto pendiente en el orden
// del director y en su color, sin texto debajo y con su globo al momento (nmwnn7ekqtit), doce a la vista y el resto plegado,
// y la bandera con cuántos quedan; un clic abre su tarjeta debajo de la línea (nmwmz0kd3tit). Debajo, tu misión de ahora y, en la pestaña auxiliar, «Datos del proceso»: la ruta entera a la meta y la
// historia (sus anclas, `pedido-<id>`, `propuesta-<id>`, `r-plan`…, siguen llevando ahí). Pura: recibe lo que pinta.
import { esc } from './util';
import { t } from './textos';

/** Las dos pestañas: tu misión (la vista «misiones», «Hoy») y los datos del proceso (la vista «ruta»). */
export type PestanaHoy = 'mision' | 'proceso';

/** Un punto de la línea, como se pinta: su id, su tipo, su color, su nombre, lo que dice su globo y si es el de ahora. */
export interface PuntoEnHoy {
  id: string;
  tipo: 'mision' | 'pedido' | 'propuesta' | 'diagnostico' | 'meta';
  color: 'persona' | 'director' | 'espera';
  titulo: string;
  /** Lo que el globo dice debajo del nombre, entero (nmwnnb5aitit): el pedido, la propuesta, lo que entrega la misión. */
  detalle?: string;
  final?: boolean;
  actual?: boolean;
  /** Ya entregada en esta tanda, sin revisar: se pinta marcada (nmwnnb5aitit). */
  hecho?: boolean;
}

/** La línea a pintar: sus puntos a la vista, cuántos quedan plegados, cuántos quedan en total y la meta (null: sin fijar). */
export interface LineaEnHoy {
  puntos: readonly PuntoEnHoy[];
  plegados: number;
  quedan: number;
  meta: string | null;
  /** Si se abrió lo plegado («y N más»): entonces se ofrece «Ver menos». */
  abierta?: boolean;
  /** El punto cuya tarjeta está abierta debajo de la línea (`BANDERA` para la de la meta). */
  elegido?: string | null;
}

/** El id con que se elige la bandera, cuya tarjeta lleva la meta y sus dos botones (nmwno7lj1tit). */
export const BANDERA = '__bandera';

/** Qué es cada punto, dicho en la primera línea de su globo. */
function queEs(p: PuntoEnHoy): string {
  if (p.hecho) return t('hoyRuta.tipoHecha');
  if (p.tipo === 'pedido') return t('hoyRuta.tipoPedido');
  if (p.tipo === 'propuesta') return t(p.color === 'espera' ? 'hoyRuta.tipoPropuesta' : 'hoyRuta.tipoAceptada');
  // Una misión, o uno de los pasos de antes de fijar la meta (leer el diagnóstico, fijarla), que también son tuyos
  return t(p.actual ? 'hoyRuta.tipoAhora' : p.final ? 'hoyRuta.tipoFinal' : 'hoyRuta.tipoMision');
}

/**
 * El globo de un punto (nota nmwnn7ekqtit, 19 de noviembre de 2026): aparece al momento, sin la espera de los demás globos,
 * con lo que es y su contenido entero, para revisar la cola de un vistazo sin salir de «Hoy» (nmwnnb5aitit). Los de los
 * bordes se abren hacia dentro, para no salirse de la ventana.
 */
function globo(clase: string, cabeza: string, titulo: string, detalle?: string): string {
  return `<span class="punto-globo${clase}" role="tooltip"><small>${esc(cabeza)}</small><b>${esc(titulo)}</b>${detalle ? `<span>${esc(detalle)}</span>` : ''}</span>`;
}

/** El ancho del globo de un punto cuando su contenido cabe sin crecer, y cuánto crece cada vez que no cabe. */
export const GLOBO_ANCHO_BASE = 360;
const GLOBO_PASO = 80;

/** Dónde queda el globo de un punto y su tamaño, en píxeles de la página. `altoMax`: si su contenido es más alto, rueda. */
export interface MedidaDelGlobo {
  left: number;
  top: number;
  ancho: number;
  altoMax: number;
  lado: 'abajo' | 'arriba';
}

/**
 * El globo de un punto con todo su contenido dentro de la ventana (nota nmwnyz4zttit, 19 de noviembre de 2026: «asegúrate
 * siempre que el globo se autoconfigure para mostrar todo su contenido dentro del viewport»). Primero crece a los lados,
 * de 80 en 80 píxeles, hasta que su contenido cabe abajo del punto (luego arriba); si ni con todo el ancho de la ventana
 * cabe, va del lado con más espacio con ese alto como tope, y lo que sobra rueda con la rueda del ratón mientras el
 * puntero siga sobre el punto o el globo. Centrado en su punto y encerrado en la ventana. `medir(tope)`: el ancho y el alto
 * de su contenido con ese ancho como tope (un texto corto queda más angosto). Pura: todo en píxeles de la página.
 */
export function medidaDelGlobo(
  punto: { left: number; right: number; top: number; bottom: number },
  medir: (tope: number) => { ancho: number; alto: number },
  ventana: { ancho: number; alto: number },
  o: { margen?: number; separacion?: number; arriba?: number } = {},
): MedidaDelGlobo {
  const m = o.margen ?? 8, sep = o.separacion ?? 6, techo = Math.max(m, o.arriba ?? m);
  const anchoMax = Math.max(1, ventana.ancho - 2 * m);
  const abajo = Math.max(0, ventana.alto - m - punto.bottom - sep), arriba = Math.max(0, punto.top - sep - techo);
  const anchos: number[] = [];
  for (let a = Math.min(GLOBO_ANCHO_BASE, anchoMax); a < anchoMax; a += GLOBO_PASO) anchos.push(a);
  anchos.push(anchoMax);
  const medidas = new Map<number, { ancho: number; alto: number }>();
  const medida = (a: number) => medidas.get(a) ?? (medidas.set(a, medir(a)), medidas.get(a)!);
  const alto = (a: number) => medida(a).alto;
  // A los lados primero: el ancho más angosto con el que cabe entero abajo; si no, arriba
  let ancho = anchos.find((a) => alto(a) <= abajo);
  let lado: 'abajo' | 'arriba' = 'abajo';
  if (ancho === undefined) {
    ancho = anchos.find((a) => alto(a) <= arriba);
    if (ancho !== undefined) lado = 'arriba';
  }
  // Ni con todo el ancho: del lado con más espacio, y lo que sobra rueda
  if (ancho === undefined) {
    ancho = anchoMax;
    lado = abajo >= arriba ? 'abajo' : 'arriba';
  }
  const altoMax = lado === 'abajo' ? abajo : arriba;
  const real = Math.min(medida(ancho).ancho, ancho);
  const visible = Math.min(alto(ancho), altoMax);
  const centro = (punto.left + punto.right) / 2;
  const left = Math.min(Math.max(centro - real / 2, m), ventana.ancho - m - real);
  const top = lado === 'abajo' ? punto.bottom + sep : punto.top - sep - visible;
  return { left: Math.max(m, left), top, ancho, altoMax, lado };
}

/**
 * La línea hacia la meta: la marca de «Hoy», lo ya entregado de la tanda marcado, los puntos en su orden y color (cada uno
 * un botón, `data-punto`), sin texto debajo (nmwnn7ekqtit): cada uno con su globo al momento; el de ahora, más grande y con
 * un latido suave; lo plegado en «y N más» (nmwn1gkpytit); y la bandera, otro botón, que dice cuántos quedan (nmwn1gup1tit)
 * o, sin meta, queda vacía (nmwn1hld9tit). Con todo hecho, la bandera es el punto de ahora (nmwno7lj1tit).
 */
export function lineaHoyHtml(l: LineaEnHoy): string {
  const n = l.puntos.length;
  const borde = (i: number) => (i < 2 ? ' izq' : i >= n - 2 ? ' der' : '');
  const puntos = l.puntos.map((p, i) => {
    const clases = ['punto', `c-${p.color}`, ...(p.actual ? ['actual'] : []), ...(p.final ? ['final'] : []), ...(p.hecho ? ['hecho'] : []), ...(l.elegido === p.id ? ['elegido'] : [])].join(' ');
    const marca = p.hecho ? '<span class="bolita" aria-hidden="true">✓</span>' : '<span class="bolita" aria-hidden="true"></span>';
    return `<li class="${clases}"><button type="button" data-punto="${esc(p.id)}" data-punto-tipo="${p.tipo}" aria-label="${esc(`${queEs(p)}: ${p.titulo}`)}" aria-expanded="${l.elegido === p.id}"${p.actual ? ' aria-current="step"' : ''}>${marca}</button>${globo(borde(i), queEs(p), p.titulo, p.detalle)}</li>`;
  }).join('');
  const mas = l.plegados > 0
    ? `<li class="punto-mas"><button type="button" class="enlace" data-linea-mas>${esc(t('hoyRuta.mas', { n: l.plegados }))}</button></li>`
    : l.abierta ? `<li class="punto-mas"><button type="button" class="enlace" data-linea-menos>${esc(t('hoyRuta.menos'))}</button></li>` : '';
  const todoHecho = !!l.meta && l.quedan === 0;
  const bandera = l.meta
    ? `<li class="bandera${todoHecho ? ' actual' : ''}${l.elegido === BANDERA ? ' elegido' : ''}"><button type="button" data-punto="${BANDERA}" data-punto-tipo="meta" aria-label="${esc(`${t('hoyRuta.tipoMeta')}: ${l.meta}`)}" aria-expanded="${l.elegido === BANDERA}"${todoHecho ? ' aria-current="step"' : ''}><span class="bandera-icono" aria-hidden="true">⚑</span></button><span class="bandera-dice">${esc(todoHecho ? t('hoyRuta.todoHecho') : t('hoyRuta.quedan', { n: l.quedan }))}</span>${globo(' der', t('hoyRuta.tipoMeta'), l.meta)}</li>`
    : `<li class="bandera vacia"><span class="bandera-icono" aria-hidden="true">⚐</span><span class="bandera-dice">${esc(t('hoyRuta.metaPorFijar'))}</span></li>`;
  return `<nav class="linea-meta" aria-label="${esc(t('hoyRuta.linea'))}"><ol><li class="marca-hoy"><span>${esc(t('hoyRuta.hoy'))}</span></li>${puntos}${mas}${bandera}</ol></nav>`;
}

/** Lo que lleva la tarjeta de un punto: qué es, su nombre, sus partes (cada una con su rótulo) y sus botones, ya pintados. */
export interface TarjetaDePunto {
  id: string;
  que: string;
  titulo: string;
  partes: readonly { rotulo: string; html: string }[];
  botones?: string;
}

/**
 * La tarjeta de un punto, debajo de la línea, dentro de «Hoy» (pd_una_sola_linea, segunda rebanada; decisión nmwmz0kd3tit):
 * lo que es, entero, con sus botones, y «Volver a mi misión», que la cierra. No lleva a otra sección: todo se ve aquí.
 */
export function tarjetaPuntoHtml(x: TarjetaDePunto): string {
  const partes = x.partes.map((p) => `<dt>${esc(p.rotulo)}</dt><dd>${p.html}</dd>`).join('');
  return `<section class="tarjeta-punto panel-d" data-tarjeta-punto="${esc(x.id)}" aria-label="${esc(x.titulo)}"><p class="que">${esc(x.que)}</p><h3>${esc(x.titulo)}</h3>${partes ? `<dl>${partes}</dl>` : ''}<div class="botones">${x.botones ?? ''}<button type="button" class="boton-suave" data-punto-cerrar>${esc(t('hoyRuta.volver'))}</button></div></section>`;
}

/**
 * El punto cuya tarjeta sigue abierta debajo de la línea (nota nmws6y66rtit): el elegido queda mientras siga en la línea;
 * si estuvo en ella (`visto`) y ya salió (una propuesta descartada o ejecutada, una misión revisada), su tarjeta se cierra.
 * Lo que un paso abrió sin estar en la línea sigue abierto hasta «Volver a mi misión». Pura.
 */
export function puntoAunAbierto(elegido: string | null, visto: string | null, enLinea: readonly string[]): { elegido: string | null; visto: string | null } {
  if (!elegido) return { elegido: null, visto: null };
  if (enLinea.includes(elegido)) return { elegido, visto: elegido };
  return visto === elegido ? { elegido: null, visto: null } : { elegido, visto };
}

/**
 * Lo que queda enfocado al pintar (nota nmws6y66rtit, con la regla dura nmws6n457tit): si lo enfocable cambió, el enfoque
 * sigue ahí solo si la persona lo quiere; y con la tarjeta de un punto abierta en «Hoy», la misión no se enfoca (el velo la
 * taparía), pero sigue siendo lo enfocable: al cerrarse la tarjeta, el enfoque vuelve si la persona lo tenía. Pura.
 */
export function enfoqueAlPintar(o: { aqui: string; antes: string; querido: boolean; alAbrir: boolean; tarjetaAbierta: boolean }): string {
  const tapada = o.tarjetaAbierta && o.aqui.startsWith('mision-');
  if (o.antes === o.aqui && !tapada) return o.antes;
  return o.querido && !tapada && (o.aqui !== 'documento' || o.alAbrir) ? o.aqui : '';
}

/** Los pasos de la línea corta, antes de fijar la meta (linea.ts › lineaSinMeta), como puntos tuyos: el primero es el de ahora. */
export function puntosSinMeta(pasos: readonly ('diagnostico' | 'meta')[]): PuntoEnHoy[] {
  return pasos.map((p, i) => ({ id: `sin-meta-${p}`, tipo: p, color: 'persona', titulo: t(p === 'diagnostico' ? 'hoyRuta.leerDiagnostico' : 'hoyRuta.fijarMeta'), actual: i === 0 }));
}

/**
 * Lo de arriba de la cabecera con el plan en una línea (decisión nmwn1h6y1tit): el proyecto y la sección, sin «Fase N de
 * M», y debajo tu meta en letra pequeña, para que se lea entera hasta donde quepa, y entera en su globo al momento (nota
 * nmwnnc4k5tit); sin meta, que falta fijarla. Con `editar`, a su lado el atajo «Editar la meta» (nota nmwnz2wrvtit): se cambia
 * cuando se quiera, sin protocolo.
 */
export function dondeEnLinea(x: { proyecto: string; seccion: string; meta: string | null; editar?: boolean }): string {
  const meta = x.meta
    ? `<h1 class="meta-cabeza" tabindex="0"><span class="titulo-fase">${esc(x.meta)}</span>${globo('', t('hoyRuta.tipoMeta'), x.meta)}</h1>`
    : `<h1 class="meta-cabeza sin"><span class="titulo-fase">${esc(t('hoyRuta.metaPorFijar'))}</span></h1>`;
  const editar = x.meta && x.editar ? `<button type="button" class="enlace meta-editar" data-replantear-objetivo>${esc(t('proyecto.replantear'))}</button>` : '';
  return `<div class="donde"><span class="sobretitulo">${esc(x.proyecto)} <span class="aqui">› ${esc(x.seccion)}</span></span>${editar ? `<div class="meta-fila">${meta}${editar}</div>` : meta}</div>`;
}

/** Las dos pestañas: «Tu misión» y «Datos del proceso». Cada una lleva a su vista (`data-ir`). */
export function pestanasHoy(elegida: PestanaHoy): string {
  const boton = (id: PestanaHoy, vista: string, titulo: string) => {
    const sel = id === elegida;
    return `<button type="button" role="tab" class="pestana-stl${sel ? ' sel' : ''}" data-ir="${vista}" aria-selected="${sel}" tabindex="${sel ? 0 : -1}">${esc(titulo)}</button>`;
  };
  return `<div class="pestanas-stl pestanas-hoy" role="tablist" aria-label="${esc(t('hoyRuta.pestanas'))}">${boton('mision', 'misiones', t('hoyRuta.tuMision'))}${boton('proceso', 'ruta', t('hoyRuta.proceso'))}</div>`;
}

/** La vista entera: la línea arriba, las dos pestañas y lo de la elegida. */
export function vistaHoyEnRuta(x: { linea: string; pestana: PestanaHoy; cuerpo: string }): string {
  return `<div class="hoy-en-ruta">${x.linea}${pestanasHoy(x.pestana)}<div class="hoy-cuerpo p-${x.pestana}">${x.cuerpo}</div></div>`;
}
